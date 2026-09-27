"""Reminder delivery log, next-reminder time, and the status endpoint behind the settings page."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.problems.seed_catalog import seed_problem_catalog
from app.study import reminders, service
from app.study.models import ReminderDelivery, StudySettings
from app.study.schemas import StudySettingsUpdate
from app.users.models import User
from tests.test_study import _seed_lessons


def _user(db, client) -> User:
    return db.scalar(select(User).where(User.email == "forge@example.com"))


def _log(db, user_id):
    return db.scalars(
        select(ReminderDelivery).where(ReminderDelivery.user_id == user_id).order_by(ReminderDelivery.created_at)
    ).all()


def test_every_outcome_is_logged(auth_client, db, monkeypatch):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    service.update_settings(db, user.id, StudySettingsUpdate(timezone="UTC", reminder_time="08:30", reminder_days=[3]))
    sent: list[dict] = []
    monkeypatch.setattr(reminders, "send_email", lambda **kw: sent.append(kw))

    # Thursday 2026-10-01 08:45 UTC: due, tasks open, provider fine.
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 8, 45, tzinfo=timezone.utc)) == 1
    rows = _log(db, user.id)
    assert [(r.kind, r.status, r.reason) for r in rows] == [("daily", "sent", None)]
    assert rows[0].day == date(2026, 10, 1) and rows[0].task_count >= 1 and rows[0].task_titles

    # Provider fails: logged as failed and the day is given back for a retry.
    def boom(**kw):
        raise reminders.EmailSendError("provider down")

    monkeypatch.setattr(reminders, "send_email", boom)
    settings = db.get(StudySettings, user.id)
    settings.last_reminder_on = None
    db.commit()
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc)) == 0
    rows = _log(db, user.id)
    assert (rows[-1].status, rows[-1].reason) == ("failed", "provider_error") and "provider down" in rows[-1].error
    assert db.get(StudySettings, user.id).last_reminder_on is None

    # A test email is logged as kind "test" and never claims the day.
    monkeypatch.setattr(reminders, "send_email", lambda **kw: sent.append(kw))
    assert reminders.send_reminder(db, user, now=datetime(2026, 10, 1, 9, 5, tzinfo=timezone.utc), force=True)
    assert (_log(db, user.id)[-1].kind, _log(db, user.id)[-1].status) == ("test", "sent")
    assert db.get(StudySettings, user.id).last_reminder_on is None


def test_nothing_due_is_logged_as_skipped(auth_client, db, monkeypatch):
    user = _user(db, auth_client)  # no catalog seeded: the plan has no open tasks
    service.update_settings(db, user.id, StudySettingsUpdate(timezone="UTC", reminder_time="08:30", reminder_days=[3]))
    monkeypatch.setattr(reminders, "send_email", lambda **kw: (_ for _ in ()).throw(AssertionError("must not send")))
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 8, 45, tzinfo=timezone.utc)) == 0
    rows = _log(db, user.id)
    assert [(r.status, r.reason) for r in rows] == [("skipped", "nothing_due")]


def test_next_reminder_time():
    settings = StudySettings(
        timezone="Europe/Berlin", reminder_time="21:06", reminder_days=[0, 1, 2, 3, 4, 5, 6],
        reminders_enabled=True, reminder_email=True, last_reminder_on=None,
    )
    berlin = reminders.ZoneInfo("Europe/Berlin")
    # Before today's time: today at 21:06.
    now = datetime(2026, 9, 27, 10, 0, tzinfo=berlin)
    assert reminders.next_reminder_at(settings, now) == datetime(2026, 9, 27, 21, 6, tzinfo=berlin)
    # Inside the send window: "now", meaning the next tick.
    now = datetime(2026, 9, 27, 21, 30, tzinfo=berlin)
    assert reminders.next_reminder_at(settings, now) == now
    # After the window: tomorrow.
    now = datetime(2026, 9, 28, 0, 30, tzinfo=berlin)
    assert reminders.next_reminder_at(settings, now) == datetime(2026, 9, 28, 21, 6, tzinfo=berlin)
    # Already sent today: tomorrow.
    settings.last_reminder_on = date(2026, 9, 27)
    now = datetime(2026, 9, 27, 10, 0, tzinfo=berlin)
    assert reminders.next_reminder_at(settings, now) == datetime(2026, 9, 28, 21, 6, tzinfo=berlin)
    # Weekdays only: Saturday rolls to Monday.
    settings.last_reminder_on = None
    settings.reminder_days = [0, 1, 2, 3, 4]
    now = datetime(2026, 10, 3, 10, 0, tzinfo=berlin)  # Saturday
    assert reminders.next_reminder_at(settings, now) == datetime(2026, 10, 5, 21, 6, tzinfo=berlin)
    settings.reminders_enabled = False
    assert reminders.next_reminder_at(settings, now) is None


def test_reminder_status_endpoint(auth_client, db, monkeypatch, email_enabled):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    service.update_settings(db, user.id, StudySettingsUpdate(timezone="UTC", reminder_time="08:30", reminder_days=[0, 1, 2, 3, 4, 5, 6]))
    monkeypatch.setattr(reminders, "send_email", lambda **kw: None)
    for day in range(1, 8):  # seven days of history; the page shows five
        settings = db.get(StudySettings, user.id)
        settings.last_reminder_on = None
        db.commit()
        reminders.send_due_reminders(db, datetime(2026, 10, day, 8, 45, tzinfo=timezone.utc))

    res = auth_client.get("/api/v1/study/settings/reminders")
    assert res.status_code == 200
    body = res.json()
    assert body["enabled"] is True and body["email_configured"] is True and body["timezone"] == "UTC"
    assert body["next_at"] is not None
    assert body["service"]["healthy"] is False  # the scheduler has never ticked in this test
    assert len(body["history"]) == 5
    assert body["history"][0]["day"] == "2026-10-07" and body["history"][0]["status"] == "sent"
    assert body["history"][0]["task_count"] >= 1 and body["history"][0]["task_titles"]

    # A scheduler tick within three intervals makes the service healthy.
    from app.common.cron import acquire_job_lease, finalize_job_run

    now = datetime.now(timezone.utc) - timedelta(minutes=5)
    _, run = acquire_job_lease(db, reminders.JOB_NAME, now=now)
    finalize_job_run(db, run, status="SUCCESS", now=now + timedelta(seconds=2))
    assert auth_client.get("/api/v1/study/settings/reminders").json()["service"]["healthy"] is True
