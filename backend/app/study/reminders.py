"""Daily reminder emails: one per day, only when something is due, never a "you missed".

The API runs :func:`run_scheduler` in the background every REMINDER_INTERVAL_MINUTES
(default 10). Set it to 0 to disable that and run the sender from cron instead:

    python -m app.study.reminders

Each run sends to every user whose local time has passed their reminder time today, on a
day they chose, who has not been sent one today yet.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
import html
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.verification import frontend_base_url
from app.common.cron import acquire_job_lease, finalize_job_run, get_job_status
from app.email.resend import EmailSendError, is_configured, send_email
from app.study import service
from app.study.models import ReminderDelivery, StudySettings
from app.study.schemas import TodayOut
from app.users.models import User

log = logging.getLogger(__name__)

JOB_NAME = "study_reminders"
SUBJECT = "Today on Anvil"

# A reminder is sent only inside this window after the chosen time. Outside it (say the user
# turned reminders on at 9 PM with an 8:30 AM time) the day is skipped rather than sent late.
SEND_WINDOW = timedelta(hours=3)


@dataclass
class ReminderRunStats:
    processed: int = 0
    sent: int = 0
    failed: int = 0
    details: list[dict] = field(default_factory=list)


def email_ready() -> bool:
    return is_configured()


def send_due_reminders_with_stats(db: Session, now: datetime | None = None) -> ReminderRunStats:
    """Send every reminder that is due right now. Returns detailed execution statistics."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    stats = ReminderRunStats()
    rows = db.execute(
        select(StudySettings, User)
        .join(User, User.id == StudySettings.user_id)
        .where(
            StudySettings.reminders_enabled.is_(True),
            StudySettings.reminder_email.is_(True),
            User.is_active.is_(True),
        )
    ).all()
    stats.processed = len(rows)

    for settings, user in rows:
        if not _is_due(settings, now):
            continue
        try:
            if send_reminder(db, user, now=now):
                stats.sent += 1
                stats.details.append({"user_id": str(user.id), "status": "sent"})
            else:
                stats.details.append({"user_id": str(user.id), "status": "skipped"})
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            stats.failed += 1
            stats.details.append({"user_id": str(user.id), "status": "failed", "error": str(exc)})
            log.warning("failed to send reminder for %s: %s", user.id, exc)
            _record(db, user.id, service.local_today(settings, now), "daily", "failed", reason="error", error=str(exc)[:2000])

    return stats


def send_due_reminders(db: Session, now: datetime | None = None) -> int:
    """Send every reminder that is due right now. Returns how many were sent."""
    return send_due_reminders_with_stats(db, now).sent


def _is_due(settings: StudySettings, now: datetime) -> bool:
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    try:
        local = now.astimezone(ZoneInfo(settings.timezone))
    except (ZoneInfoNotFoundError, ValueError):
        local = now.astimezone(timezone.utc)
    if local.weekday() not in set(settings.reminder_days or []):
        return False
    if settings.last_reminder_on == local.date():
        return False
    try:
        hours, minutes = (int(part) for part in settings.reminder_time.split(":"))
        start = local.replace(hour=hours, minute=minutes, second=0, microsecond=0)
    except (ValueError, TypeError, OverflowError):
        start = local.replace(hour=8, minute=30, second=0, microsecond=0)
    return start <= local < start + SEND_WINDOW


def send_reminder(db: Session, user: User, *, now: datetime | None = None, force: bool = False) -> bool:
    """Send one user's reminder for today and log the outcome. Skips quietly when there is nothing to do."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    settings = service.get_or_create_settings(db, user.id)
    today = service.local_today(settings, now)
    plan = service.get_today(db, user.id, today)
    open_tasks = [task for task in plan.tasks if not task.done and not task.optional]
    kind = "test" if force else "daily"
    titles = [task.title for task in open_tasks]

    # Claim the day first so a slow or failing send never doubles up. A forced send
    # (the "send test email" button) must not use up the day's real reminder.
    if not force:
        settings.last_reminder_on = today
        db.add(settings)
        db.commit()

    if not open_tasks and not force:
        _record(db, user.id, today, kind, "skipped", reason="nothing_due")
        return False
    if not user.email:
        _record(db, user.id, today, kind, "skipped", reason="no_email")
        return False
    content = reminder_email(plan, frontend_base_url())
    try:
        send_email(to=user.email, subject=content["subject"], html=content["html"], text=content["text"])
    except EmailSendError as exc:
        log.warning("reminder email failed for %s: %s", user.id, exc)
        if not force:
            # Give the day back so the next run tries again.
            settings.last_reminder_on = None
            db.add(settings)
            db.commit()
        _record(db, user.id, today, kind, "failed", reason="provider_error", error=str(exc)[:2000], subject=content["subject"], titles=titles)
        return False
    _record(db, user.id, today, kind, "sent", subject=content["subject"], titles=titles)
    return True


def _record(
    db: Session,
    user_id,
    day,
    kind: str,
    status: str,
    *,
    reason: str | None = None,
    error: str | None = None,
    subject: str = "",
    titles: list[str] | None = None,
) -> None:
    """Append one row to the delivery log. Never lets a logging problem break a send."""
    try:
        db.add(
            ReminderDelivery(
                user_id=user_id,
                day=day,
                kind=kind,
                status=status,
                reason=reason,
                subject=subject,
                task_count=len(titles or []),
                task_titles=list(titles or []),
                error=error,
            )
        )
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()
        log.exception("could not record reminder delivery for %s", user_id)


def next_reminder_at(settings: StudySettings, now: datetime | None = None) -> datetime | None:
    """When the next reminder can go out, in the learner's time zone. None when reminders are off."""
    if not (settings.reminders_enabled and settings.reminder_email and settings.reminder_days):
        return None
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    try:
        zone = ZoneInfo(settings.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        zone = timezone.utc
    local = now.astimezone(zone)
    try:
        hours, minutes = (int(part) for part in settings.reminder_time.split(":"))
    except (ValueError, TypeError):
        hours, minutes = 8, 30
    days = set(settings.reminder_days)
    for offset in range(8):
        day = (local + timedelta(days=offset)).date()
        if day.weekday() not in days:
            continue
        candidate = datetime.combine(day, datetime.min.time(), tzinfo=zone).replace(hour=hours, minute=minutes)
        if offset == 0:
            if settings.last_reminder_on == day:
                continue
            if local >= candidate + SEND_WINDOW:
                continue
            if local >= candidate:
                return local  # inside the window: the next tick sends it
        return candidate
    return None


def _zoned(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def reminder_status(db: Session, user: User, *, now: datetime | None = None, history_limit: int = 5) -> dict:
    """Everything the settings page shows: next reminder, whether the service is alive, recent deliveries."""
    now = now or datetime.now(timezone.utc)
    settings = service.get_or_create_settings(db, user.id)
    job = get_job_status(db, JOB_NAME, history_limit=1)
    last_run = job.get("last_run_at")
    interval = job.get("interval_minutes") or 10
    healthy = False
    if last_run:
        # SQLite hands back naive timestamps; treat them as UTC and always send a zoned ISO string.
        last_dt = datetime.fromisoformat(last_run)
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        last_run = last_dt.astimezone(timezone.utc).isoformat()
        healthy = now - last_dt <= timedelta(minutes=interval * 3)
    rows = db.scalars(
        select(ReminderDelivery)
        .where(ReminderDelivery.user_id == user.id)
        .order_by(ReminderDelivery.created_at.desc())
        .limit(history_limit)
    ).all()
    nxt = next_reminder_at(settings, now)
    return {
        "enabled": bool(settings.reminders_enabled and settings.reminder_email),
        "email_configured": is_configured(),
        "timezone": settings.timezone,
        "reminder_time": settings.reminder_time,
        "next_at": nxt.isoformat() if nxt else None,
        "service": {
            "last_run_at": last_run,
            "last_status": job.get("last_status"),
            "interval_minutes": interval,
            "healthy": healthy,
        },
        "history": [
            {
                "id": str(row.id),
                "day": row.day.isoformat(),
                "kind": row.kind,
                "status": row.status,
                "reason": row.reason,
                "subject": row.subject,
                "task_count": row.task_count,
                "task_titles": list(row.task_titles or []),
                "error": row.error,
                "created_at": _zoned(row.created_at),
            }
            for row in rows
        ],
    }


def reminder_email(plan: TodayOut, app_url: str) -> dict[str, str]:
    tasks = [task for task in plan.tasks if not task.optional]
    open_tasks = [task for task in tasks if not task.done]
    minutes = sum(task.minutes for task in open_tasks)
    count = len(open_tasks)
    if count == 0:
        headline = "Nothing due today. Enjoy the rest."
    else:
        headline = f"Today: {count} thing{'s' if count != 1 else ''}, about {minutes} minutes"

    rows_html = "".join(
        f'<tr><td style="padding:6px 0;font-size:15px;line-height:22px;color:#111827;">'
        f'<strong style="color:#c2410c;">{index}</strong>&nbsp;&nbsp;'
        f'<a href="{app_url}{html.escape(task.href)}" style="color:#111827;text-decoration:underline;">{html.escape(task.title)}</a>'
        f'<span style="color:#64748b;"> · {task.minutes} min</span></td></tr>'
        for index, task in enumerate(open_tasks, start=1)
    )
    body_html = (
        f'<p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#64748b;">'
        f"Unit {plan.unit_number}: {html.escape(plan.unit_title)}. {html.escape(plan.pacing)}</p>"
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">{rows_html}</table>'
        f'<p style="margin:0;"><a href="{app_url}/today" style="display:inline-block;padding:10px 16px;'
        f'background:#c2410c;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open Today</a></p>'
    )
    html_doc = f"""\
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f4f5f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
          <tr><td style="padding:28px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;">Anvil</p>
            <h1 style="margin:0 0 14px 0;font-size:20px;line-height:28px;color:#111827;">{html.escape(headline)}</h1>
            {body_html}
            <p style="margin:24px 0 0 0;font-size:12px;line-height:18px;color:#94a3b8;">One reminder a day, only when something is due. Change or pause it at {app_url}/today/settings</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
"""
    text_lines = [headline, f"Unit {plan.unit_number}: {plan.unit_title}. {plan.pacing}", ""]
    text_lines += [f"{index}. {task.title} · {task.minutes} min · {app_url}{task.href}" for index, task in enumerate(open_tasks, start=1)]
    text_lines += ["", f"Open Today: {app_url}/today", "", f"Change or pause reminders: {app_url}/today/settings"]
    return {"subject": SUBJECT, "html": html_doc, "text": "\n".join(text_lines)}


def run_once(*, now: datetime | None = None) -> int:
    """One scheduler tick: acquires DB lease, sends due reminders, records history."""
    from app.common import models as _models  # noqa: F401
    from app.common.database import SessionLocal

    if not is_configured():
        return 0

    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    db = SessionLocal()
    lease = None
    try:
        if hasattr(db, "get") and hasattr(db, "execute"):
            lease = acquire_job_lease(db, JOB_NAME, default_interval_minutes=10, now=now)
            if lease is None:
                # Job is disabled in DB or actively running on another worker
                return 0
        sent = send_due_reminders(db, now=now)
        if lease is not None:
            _, run = lease
            finalize_job_run(
                db,
                run,
                status="SUCCESS",
                items_sent=sent,
                now=now,
            )
        if sent:
            log.info("sent %d reminder(s)", sent)
        return sent
    except Exception as exc:  # noqa: BLE001 - the loop must survive a bad tick
        log.exception("reminder run failed")
        if lease is not None:
            _, run = lease
            try:
                finalize_job_run(db, run, status="FAILED", error_message=str(exc), now=now)
            except Exception:
                log.exception("failed to record failure in cron history")
        return 0
    finally:
        db.close()


async def run_scheduler(interval_minutes: int, *, first_delay_seconds: float = 30) -> None:
    """Background task for the API: check for due reminders every ``interval_minutes``.

    The first check happens shortly after startup so a restart inside a user's send
    window does not push their reminder back by a full interval.
    """
    if interval_minutes <= 0:
        return
    await asyncio.sleep(first_delay_seconds)
    while True:
        try:
            await asyncio.to_thread(run_once)
        except Exception:  # noqa: BLE001
            log.exception("Unexpected error in reminder scheduler tick")
        await asyncio.sleep(interval_minutes * 60)


def get_status(db: Session, *, history_limit: int = 10) -> dict:
    """Get status and history for the study reminders cron job."""

    return get_job_status(db, JOB_NAME, history_limit=history_limit)


def main() -> int:
    if not is_configured():
        print("Email is not configured (RESEND_API_KEY / EMAIL_FROM). Nothing sent.")
        return 0
    print(f"Sent {run_once()} reminder(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
