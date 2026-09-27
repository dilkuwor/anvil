"""Tests for database-driven cron jobs, distributed lease locking, and execution history."""

from datetime import datetime, timedelta, timezone
import uuid

import pytest
from sqlalchemy import select

from app.common.cron import acquire_job_lease, finalize_job_run, get_job_status, get_or_create_cron_job
from app.common.cron_models import CronJob, CronJobRun
from app.study import reminders, service
from app.study.schemas import StudySettingsUpdate
from app.users.models import User
from app.problems.seed_catalog import seed_problem_catalog


def _user(db, auth_client) -> User:
    return db.scalar(select(User).where(User.email == "forge@example.com"))


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def test_cron_job_registration(db):
    job = get_or_create_cron_job(db, "test_job", default_interval_minutes=15)
    assert job.name == "test_job"
    assert job.interval_minutes == 15
    assert job.is_enabled is True
    assert job.locked_until is None


def test_cron_job_lease_distributed_locking(db):
    now = datetime(2026, 9, 27, 10, 0, tzinfo=timezone.utc)
    lease1 = acquire_job_lease(db, "test_job", lease_seconds=300, now=now)
    assert lease1 is not None
    job, run = lease1
    assert run.status == "RUNNING"
    assert _as_utc(job.locked_until) == now + timedelta(seconds=300)

    # Second worker tries to acquire lease while lock is active -> denied
    lease2 = acquire_job_lease(db, "test_job", lease_seconds=300, now=now + timedelta(seconds=60))
    assert lease2 is None

    # After lease expires (300 seconds), a new lease can be granted
    lease3 = acquire_job_lease(db, "test_job", lease_seconds=300, now=now + timedelta(seconds=301))
    assert lease3 is not None


def test_cron_job_disabled_skips_lease(db):
    job = get_or_create_cron_job(db, "disabled_job")
    job.is_enabled = False
    db.add(job)
    db.commit()

    lease = acquire_job_lease(db, "disabled_job")
    assert lease is None


def test_cron_job_run_success_lifecycle(db):
    now = datetime(2026, 9, 27, 10, 0, tzinfo=timezone.utc)
    lease = acquire_job_lease(db, "metrics_job", now=now)
    assert lease is not None
    _, run = lease

    finish_time = now + timedelta(seconds=2)
    finalize_job_run(
        db,
        run,
        status="SUCCESS",
        items_processed=10,
        items_sent=3,
        details={"info": "all good"},
        now=finish_time,
    )

    db_run = db.get(CronJobRun, run.id)
    assert db_run.status == "SUCCESS"
    assert db_run.items_processed == 10
    assert db_run.items_sent == 3
    assert db_run.duration_ms == 2000
    assert _as_utc(db_run.finished_at) == finish_time

    job = db.get(CronJob, "metrics_job")
    assert job.locked_until is None
    assert job.last_status == "SUCCESS"
    assert _as_utc(job.last_run_at) == now
    assert job.last_duration_ms == 2000


def test_cron_job_run_failure_lifecycle(db):
    now = datetime(2026, 9, 27, 10, 0, tzinfo=timezone.utc)
    lease = acquire_job_lease(db, "flaky_job", now=now)
    assert lease is not None
    _, run = lease

    finalize_job_run(
        db,
        run,
        status="FAILED",
        error_message="Network timeout to provider",
        now=now + timedelta(seconds=1),
    )

    db_run = db.get(CronJobRun, run.id)
    assert db_run.status == "FAILED"
    assert db_run.error_message == "Network timeout to provider"

    job = db.get(CronJob, "flaky_job")
    assert job.locked_until is None
    assert job.last_status == "FAILED"
    assert job.last_error == "Network timeout to provider"


def test_cron_job_prunes_old_history(db):
    now = datetime(2026, 9, 27, 10, 0, tzinfo=timezone.utc)
    old_time = now - timedelta(days=35)

    job = get_or_create_cron_job(db, "prune_job")
    old_run = CronJobRun(id=uuid.uuid4(), job_name=job.name, started_at=old_time, status="SUCCESS")
    db.add(old_run)
    db.commit()

    old_run_id = old_run.id
    lease = acquire_job_lease(db, "prune_job", now=now)
    assert lease is not None
    _, recent_run = lease

    finalize_job_run(db, recent_run, status="SUCCESS", now=now, prune_days=30)

    # Old run > 30 days was deleted, recent run remains
    assert db.get(CronJobRun, old_run_id) is None
    assert db.get(CronJobRun, recent_run.id) is not None


def test_cron_status_endpoint(auth_client, db):
    now = datetime(2026, 9, 27, 10, 0, tzinfo=timezone.utc)
    lease = acquire_job_lease(db, reminders.JOB_NAME, now=now)
    assert lease is not None
    _, run = lease
    finalize_job_run(db, run, status="SUCCESS", items_sent=5, now=now + timedelta(seconds=1))

    res = auth_client.get("/api/v1/study/settings/cron-status")
    assert res.status_code == 200
    body = res.json()
    assert body["configured"] is True
    assert body["name"] == reminders.JOB_NAME
    assert body["last_status"] == "SUCCESS"
    assert len(body["recent_runs"]) >= 1
    assert body["recent_runs"][0]["items_sent"] == 5


def test_test_email_returns_error_when_send_fails(auth_client, db, monkeypatch, email_enabled):
    user = _user(db, auth_client)
    service.update_settings(db, user.id, StudySettingsUpdate(timezone="UTC"))

    def boom(**kw):
        raise reminders.EmailSendError("provider down")

    monkeypatch.setattr(reminders, "send_email", boom)
    res = auth_client.post("/api/v1/study/settings/test-email")
    assert res.status_code == 503
    assert "Failed to send test email" in res.json()["error"]["message"]


def test_reminders_skip_inactive_users(auth_client, db, monkeypatch):
    seed_problem_catalog(db)
    user = _user(db, auth_client)
    user.is_active = False
    db.add(user)
    db.commit()

    service.update_settings(
        db, user.id, StudySettingsUpdate(timezone="Europe/Berlin", reminder_time="08:30", reminder_days=[3])
    )
    sent: list[dict] = []
    monkeypatch.setattr(reminders, "send_email", lambda **kw: sent.append(kw))

    # Thursday 08:45 Berlin
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 6, 45, tzinfo=timezone.utc)) == 0
    assert len(sent) == 0


def test_reminders_per_user_isolation_on_error(db, monkeypatch):
    # Two users due
    u1 = User(id=uuid.uuid4(), username="u1", email="u1@example.com", is_active=True)
    u2 = User(id=uuid.uuid4(), username="u2", email="u2@example.com", is_active=True)
    db.add(u1)
    db.add(u2)
    db.commit()

    s1 = service.get_or_create_settings(db, u1.id)
    s1.reminder_time = "08:30"
    s1.reminder_days = [3]
    s1.timezone = "UTC"

    s2 = service.get_or_create_settings(db, u2.id)
    s2.reminder_time = "08:30"
    s2.reminder_days = [3]
    s2.timezone = "UTC"
    db.add(s1)
    db.add(s2)
    db.commit()

    # User 1 raises an unexpected exception in send_reminder; User 2 succeeds
    original_send = reminders.send_reminder

    def fake_send(db, user, now=None, force=False):
        if user.id == u1.id:
            raise RuntimeError("corrupted user state")
        return True

    monkeypatch.setattr(reminders, "send_reminder", fake_send)

    stats = reminders.send_due_reminders_with_stats(db, datetime(2026, 10, 1, 8, 45, tzinfo=timezone.utc))
    assert stats.sent == 1
    assert stats.failed == 1
    assert any(d["status"] == "failed" and d["user_id"] == str(u1.id) for d in stats.details)
    assert any(d["status"] == "sent" and d["user_id"] == str(u2.id) for d in stats.details)
