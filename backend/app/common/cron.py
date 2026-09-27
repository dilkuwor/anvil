"""Database-driven cron job runner with distributed locking and execution history."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import delete, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.cron_models import CronJob, CronJobRun

log = logging.getLogger(__name__)


def get_or_create_cron_job(db: Session, job_name: str, *, default_interval_minutes: int = 10) -> CronJob:
    """Get or lazily register a cron job in the database."""
    job = db.get(CronJob, job_name)
    if job is not None:
        return job

    job = CronJob(name=job_name, interval_minutes=default_interval_minutes, is_enabled=True)
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        job = db.get(CronJob, job_name)
    if job is not None:
        db.refresh(job)
        return job
    raise RuntimeError(f"Unable to get or create cron job '{job_name}'")


def acquire_job_lease(
    db: Session,
    job_name: str,
    *,
    default_interval_minutes: int = 10,
    lease_seconds: int = 300,
    now: datetime | None = None,
) -> tuple[CronJob, CronJobRun] | None:
    """Atomically acquire an execution lease for a cron job.

    Returns ``(job, run)`` if the lease was granted, or ``None`` if the job
    is currently disabled or already leased by another active worker.
    """
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    job = get_or_create_cron_job(db, job_name, default_interval_minutes=default_interval_minutes)
    if not job.is_enabled:
        return None

    locked_until = now + timedelta(seconds=lease_seconds)
    stmt = (
        update(CronJob)
        .where(
            CronJob.name == job_name,
            CronJob.is_enabled.is_(True),
            or_(CronJob.locked_until.is_(None), CronJob.locked_until <= now),
        )
        .values(locked_until=locked_until, last_status="RUNNING")
        .execution_options(synchronize_session=False)
    )
    result = db.execute(stmt)
    db.commit()
    if result.rowcount == 0:
        return None

    run = CronJobRun(
        job_name=job_name,
        started_at=now,
        status="RUNNING",
    )
    db.add(run)
    db.commit()
    db.refresh(job)
    db.refresh(run)
    return job, run


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def finalize_job_run(
    db: Session,
    run: CronJobRun,
    *,
    status: str,
    items_processed: int = 0,
    items_sent: int = 0,
    error_message: str | None = None,
    details: dict | list | None = None,
    now: datetime | None = None,
    prune_days: int = 30,
) -> None:
    """Finalize a job run, record duration/stats, release the lock, and prune old history."""
    now = _as_utc(now or datetime.now(timezone.utc))
    started = _as_utc(run.started_at) or now
    duration_ms = max(0, int((now - started).total_seconds() * 1000))

    run.status = status
    run.finished_at = now
    run.duration_ms = duration_ms
    run.items_processed = items_processed
    run.items_sent = items_sent
    run.error_message = error_message
    run.details = details
    db.add(run)

    job = db.get(CronJob, run.job_name)
    if job is not None:
        job.locked_until = None
        job.last_run_at = run.started_at
        job.last_status = status
        job.last_duration_ms = duration_ms
        job.last_error = error_message
        db.add(job)

    db.commit()

    if prune_days > 0:
        try:
            cutoff = now - timedelta(days=prune_days)
            db.execute(
                delete(CronJobRun)
                .where(CronJobRun.job_name == run.job_name, CronJobRun.started_at < cutoff)
                .execution_options(synchronize_session=False)
            )
            db.commit()
        except Exception as exc:  # noqa: BLE001
            log.warning("failed to prune old cron history: %s", exc)


def get_job_status(db: Session, job_name: str, *, history_limit: int = 10) -> dict:
    """Return status and recent execution history for a scheduled job."""
    job = db.get(CronJob, job_name)
    if job is None:
        return {"configured": False, "name": job_name}

    runs = db.scalars(
        select(CronJobRun)
        .where(CronJobRun.job_name == job_name)
        .order_by(CronJobRun.started_at.desc())
        .limit(history_limit)
    ).all()

    return {
        "configured": True,
        "name": job.name,
        "is_enabled": job.is_enabled,
        "interval_minutes": job.interval_minutes,
        "locked_until": job.locked_until.isoformat() if job.locked_until else None,
        "last_run_at": job.last_run_at.isoformat() if job.last_run_at else None,
        "last_status": job.last_status,
        "last_duration_ms": job.last_duration_ms,
        "last_error": job.last_error,
        "recent_runs": [
            {
                "id": str(r.id),
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "finished_at": r.finished_at.isoformat() if r.finished_at else None,
                "status": r.status,
                "items_processed": r.items_processed,
                "items_sent": r.items_sent,
                "duration_ms": r.duration_ms,
                "error_message": r.error_message,
                "details": r.details,
            }
            for r in runs
        ],
    }
