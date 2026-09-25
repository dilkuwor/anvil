"""Daily reminder emails: one per day, only when something is due, never a "you missed".

Run from a cron job every 10–15 minutes (from backend/):

    python -m app.study.reminders

Each run sends to every user whose local time has passed their reminder time today, on a
day they chose, who has not been sent one today yet.
"""

from __future__ import annotations

import html
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.verification import frontend_base_url
from app.email.resend import EmailSendError, is_configured, send_email
from app.study import service
from app.study.models import StudySettings
from app.study.schemas import TodayOut
from app.users.models import User

log = logging.getLogger(__name__)

SUBJECT = "Today on Anvil"

# A reminder is sent only inside this window after the chosen time. Outside it (say the user
# turned reminders on at 9 PM with an 8:30 AM time) the day is skipped rather than sent late.
SEND_WINDOW = timedelta(hours=3)


def email_ready() -> bool:
    return is_configured()


def send_due_reminders(db: Session, now: datetime | None = None) -> int:
    """Send every reminder that is due right now. Returns how many were sent."""
    now = now or datetime.now(timezone.utc)
    sent = 0
    rows = db.execute(
        select(StudySettings, User)
        .join(User, User.id == StudySettings.user_id)
        .where(StudySettings.reminders_enabled.is_(True), StudySettings.reminder_email.is_(True))
    ).all()
    for settings, user in rows:
        if not _is_due(settings, now):
            continue
        if send_reminder(db, user, now=now):
            sent += 1
    return sent


def _is_due(settings: StudySettings, now: datetime) -> bool:
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
    except ValueError:
        hours, minutes = 8, 30
    start = local.replace(hour=hours, minute=minutes, second=0, microsecond=0)
    return start <= local < start + SEND_WINDOW


def send_reminder(db: Session, user: User, *, now: datetime | None = None, force: bool = False) -> bool:
    """Send one user's reminder for today. Skips quietly when there is nothing to do."""
    now = now or datetime.now(timezone.utc)
    settings = service.get_or_create_settings(db, user.id)
    today = service.local_today(settings, now)
    plan = service.get_today(db, user.id, today)
    open_tasks = [task for task in plan.tasks if not task.done and not task.optional]

    # Claim the day first so a slow or failing send never doubles up.
    settings.last_reminder_on = today
    db.add(settings)
    db.commit()

    if not open_tasks and not force:
        return False
    if not user.email:
        return False
    content = reminder_email(plan, frontend_base_url())
    try:
        send_email(to=user.email, subject=content["subject"], html=content["html"], text=content["text"])
    except EmailSendError as exc:
        # Give the day back so the next cron run tries again.
        log.warning("reminder email failed for %s: %s", user.id, exc)
        settings.last_reminder_on = None
        db.add(settings)
        db.commit()
        return False
    return True


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


def main() -> int:
    from app.common import models as _models  # noqa: F401
    from app.common.database import SessionLocal

    if not is_configured():
        print("Email is not configured (RESEND_API_KEY / EMAIL_FROM). Nothing sent.")
        return 0
    db = SessionLocal()
    try:
        sent = send_due_reminders(db)
        print(f"Sent {sent} reminder(s).")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
