"""Study path, review queue, Today plan and reminders."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.common.enums import LearningProgressStatus, ProgressStatus
from app.learn.models import LearningCategory, LearningLesson, LearningTopic, UserLearningProgress
from app.problems.models import Problem
from app.problems.seed_catalog import seed_problem_catalog
from app.progress.models import UserProblemProgress
from app.study import reminders, service
from app.study.models import ReviewCard, StudySettings
from app.study.schemas import DesignOutlineIn, StudySettingsUpdate
from app.users.models import User
from database.seeds.catalog import PROBLEMS as CATALOG
from database.seeds.study_path import BOX_DAYS, UNITS, validate_path

TODAY = date(2026, 10, 1)


def _user(db, client) -> User:
    return db.scalar(select(User).where(User.email == "forge@example.com"))


def _seed_lessons(db) -> None:
    category = LearningCategory(id=uuid.uuid4(), slug="system-design", title="System Design")
    topic = LearningTopic(id=uuid.uuid4(), category_id=category.id, slug="system-design-template", title="Playbook")
    db.add_all([category, topic])
    db.flush()
    for order, slug in enumerate(UNITS[0]["lessons"]):
        db.add(
            LearningLesson(
                id=uuid.uuid4(),
                topic_id=topic.id,
                slug=slug,
                title=slug.replace("-", " ").title(),
                short_description="short",
                takeaways=["Point one.", "Point two."],
                display_order=order,
                estimated_minutes=9,
            )
        )
    db.commit()


def _solve(db, user_id, slug: str, when: datetime) -> None:
    problem = db.scalar(select(Problem).where(Problem.slug == slug))
    db.add(
        UserProblemProgress(
            user_id=user_id,
            problem_id=problem.id,
            status=ProgressStatus.SOLVED.value,
            attempts=1,
            accepted_attempts=1,
            first_solved_at=when,
            last_attempted_at=when,
        )
    )
    db.commit()


def _finish_lesson(db, user_id, slug: str, when: datetime) -> None:
    lesson = db.scalar(select(LearningLesson).where(LearningLesson.slug == slug))
    db.add(
        UserLearningProgress(
            user_id=user_id,
            lesson_id=lesson.id,
            status=LearningProgressStatus.COMPLETED.value,
            progress_percent=100,
            completed_at=when,
        )
    )
    db.commit()


def test_path_definition_is_consistent():
    validate_path(
        {spec["slug"] for spec in CATALOG},
        {slug for unit in UNITS for slug in unit["lessons"]},
        {unit["design"] for unit in UNITS},
    )
    numbers = [unit["number"] for unit in UNITS]
    assert numbers == list(range(1, len(UNITS) + 1))


def test_study_requires_auth(client):
    assert client.get("/api/v1/study/today").status_code == 401
    assert client.get("/api/v1/study/path").status_code == 401


def test_today_plans_first_problem_and_lesson(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    db.commit()

    body = auth_client.get("/api/v1/study/today?tz=Europe/Berlin").json()
    assert body["unit_number"] == 1
    ids = [task["id"] for task in body["tasks"]]
    assert ids[0] == f"problem:{UNITS[0]['problems'][0]}"
    assert ids[1] == f"lesson:{UNITS[0]['lessons'][0]}"
    assert "review" not in ids
    assert body["done_count"] == 0 and body["total"] == 2
    assert body["all_done"] is False

    settings = db.get(StudySettings, _user(db, auth_client).id)
    assert settings.timezone == "Europe/Berlin"

    again = auth_client.get("/api/v1/study/today").json()
    assert [task["id"] for task in again["tasks"]] == ids


def test_solving_creates_a_card_due_tomorrow_and_moves_the_plan(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    first, second = UNITS[0]["problems"][:2]

    plan = service.get_today(db, user.id, TODAY)
    assert plan.tasks[0].id == f"problem:{first}"

    _solve(db, user.id, first, datetime(2026, 10, 1, 9, tzinfo=timezone.utc))
    plan = service.get_today(db, user.id, TODAY)
    assert plan.tasks[0].id == f"problem:{first}"  # the day's plan does not shift
    assert plan.tasks[0].done is True

    card = db.scalar(select(ReviewCard).where(ReviewCard.user_id == user.id, ReviewCard.ref == first))
    assert card.box == 1 and card.due_on == TODAY + timedelta(days=1)

    tomorrow = TODAY + timedelta(days=1)
    plan = service.get_today(db, user.id, tomorrow)
    ids = [task.id for task in plan.tasks]
    assert ids[0] == "review"
    assert ids[1] == f"problem:{second}"
    assert ids[-1] == f"story:{first}" and plan.tasks[-1].optional
    assert plan.due_reviews == 1


def test_rating_moves_cards_between_boxes(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    slug = UNITS[0]["problems"][0]
    _solve(db, user.id, slug, datetime(2026, 9, 20, tzinfo=timezone.utc))

    queue = service.review_queue(db, user.id, TODAY)
    assert queue.due_total == 1
    card = queue.cards[0]
    assert card.kind == "PROBLEM" and card.href == f"/problems/{slug}"
    assert card.answer

    good = service.rate_card(db, user.id, card.id, "good", TODAY)
    assert good.card.box == 2 and good.next_due_on == TODAY + timedelta(days=BOX_DAYS[2])
    assert good.remaining == 0

    later = good.next_due_on
    shaky = service.rate_card(db, user.id, card.id, "shaky", later)
    assert shaky.card.box == 2 and shaky.next_due_on == later + timedelta(days=BOX_DAYS[2])

    forgot = service.rate_card(db, user.id, card.id, "forgot", later)
    assert forgot.card.box == 1 and forgot.next_due_on == later + timedelta(days=1)

    response = auth_client.post(f"/api/v1/study/reviews/{card.id}/rate", json={"rating": "good"})
    assert response.status_code == 200
    assert auth_client.post(f"/api/v1/study/reviews/{uuid.uuid4()}/rate", json={"rating": "good"}).status_code == 404


def test_review_queue_is_capped_and_oldest_first(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    slugs = UNITS[0]["problems"][:7]
    for offset, slug in enumerate(slugs):
        _solve(db, user.id, slug, datetime(2026, 9, 1 + offset, tzinfo=timezone.utc))

    queue = service.review_queue(db, user.id, TODAY)
    assert queue.due_total == 7
    assert len(queue.cards) == 5
    assert [card.ref for card in queue.cards] == slugs[:5]


def test_lessons_and_outlines_become_cards_and_path_tracks_them(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    unit = UNITS[0]

    _finish_lesson(db, user.id, unit["lessons"][0], datetime(2026, 9, 29, tzinfo=timezone.utc))
    path = service.get_path(db, user.id, TODAY)
    assert path.current_unit == 1
    first = path.units[0]
    assert first.status == "current" and first.level == "Not started"
    assert first.lessons[0].done is True and first.lessons[1].done is False
    assert first.lessons[0].href == f"/learn/system-design/system-design-template/{unit['lessons'][0]}"
    assert path.units[1].status == "ahead"

    outline = service.save_outline(
        db, user.id, unit["design"], DesignOutlineIn(outline="1. Short links\n2. Redirect fast", done=True), TODAY
    )
    assert outline.done is True and outline.note_id is not None

    cards = {(card.kind, card.ref) for card in db.scalars(select(ReviewCard).where(ReviewCard.user_id == user.id))}
    assert ("LESSON", unit["lessons"][0]) in cards
    assert ("DESIGN", unit["design"]) in cards

    queue = service.review_queue(db, user.id, TODAY + timedelta(days=2))
    design_card = next(card for card in queue.cards if card.kind == "DESIGN")
    assert design_card.answer_label == "Your saved outline"
    assert "Redirect fast" in design_card.answer
    assert design_card.wants_text is True

    toggled = auth_client.post(f"/api/v1/study/path/items/mock:{unit['design']}/toggle").json()
    assert toggled == {"item_key": f"mock:{unit['design']}", "done": True}
    path = service.get_path(db, user.id, TODAY)
    assert path.units[0].design.mock_done is True
    assert auth_client.post("/api/v1/study/path/items/problem:lc-1/toggle").status_code == 404


def test_unit_levels_follow_boxes(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    unit = UNITS[0]
    for slug in unit["problems"]:
        _solve(db, user.id, slug, datetime(2026, 9, 1, tzinfo=timezone.utc))
    facts = service.Facts(db, user.id, TODAY)
    service.sync_cards(db, facts)
    assert facts.unit_level(unit) == "Familiar"
    for card in facts.cards.values():
        card.box = 3
    db.commit()
    assert service.Facts(db, user.id, TODAY).unit_level(unit) == "Proficient"
    for card in facts.cards.values():
        card.box = 4
    db.commit()
    assert service.Facts(db, user.id, TODAY).unit_level(unit) == "Mastered"


def test_toggle_task_and_finish_line(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    plan = service.get_today(db, user.id, TODAY)
    required = [task.id for task in plan.tasks if not task.optional]
    for task_id in required:
        plan = service.toggle_task(db, user.id, TODAY, task_id)
    assert plan.all_done is True
    assert plan.finish_line.startswith(UNITS[0]["title"])
    plan = service.toggle_task(db, user.id, TODAY, required[0])
    assert plan.all_done is False and plan.tasks[0].manual is False


def test_settings_roundtrip(auth_client):
    body = auth_client.get("/api/v1/study/settings").json()
    assert body["reminder_time"] == "08:30" and body["reminder_days"] == [0, 1, 2, 3, 4]
    updated = auth_client.put(
        "/api/v1/study/settings",
        json={"interview_date": "2026-11-30", "reminder_time": "07:15", "reminder_days": [6, 0, 0, 9], "reminder_email": False},
    ).json()
    assert updated["interview_date"] == "2026-11-30"
    assert updated["reminder_time"] == "07:15"
    assert updated["reminder_days"] == [0, 6]
    assert updated["reminder_email"] is False
    cleared = auth_client.put("/api/v1/study/settings", json={"clear_interview_date": True}).json()
    assert cleared["interview_date"] is None


def test_pacing_text(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    service.update_settings(db, user.id, StudySettingsUpdate(interview_date=TODAY + timedelta(weeks=20)))
    assert "On track" in service.get_path(db, user.id, TODAY).pacing
    service.update_settings(db, user.id, StudySettingsUpdate(interview_date=TODAY + timedelta(weeks=2)))
    assert "A bit behind" in service.get_path(db, user.id, TODAY).pacing


def test_reminders_send_once_per_day_only_when_due(auth_client, db, monkeypatch):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    service.update_settings(
        db, user.id, StudySettingsUpdate(timezone="Europe/Berlin", reminder_time="08:30", reminder_days=[0, 1, 2, 3, 4])
    )
    sent: list[dict] = []
    monkeypatch.setattr(reminders, "send_email", lambda **kw: sent.append(kw))

    # Thursday 2026-10-01 08:00 Berlin = 06:00 UTC: too early.
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 6, 0, tzinfo=timezone.utc)) == 0
    # 08:45 Berlin: due.
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 6, 45, tzinfo=timezone.utc)) == 1
    assert sent[0]["to"] == user.email and "Today" in sent[0]["subject"]
    assert "/today" in sent[0]["text"]
    # Same day again: nothing.
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc)) == 0
    # Friday 9 PM Berlin: the window has long passed, so no late-night "morning" email.
    assert reminders.send_due_reminders(db, datetime(2026, 10, 2, 19, 0, tzinfo=timezone.utc)) == 0
    # Saturday: not a chosen day.
    assert reminders.send_due_reminders(db, datetime(2026, 10, 3, 9, 0, tzinfo=timezone.utc)) == 0
    # Paused: nothing.
    service.update_settings(db, user.id, StudySettingsUpdate(reminders_enabled=False))
    assert reminders.send_due_reminders(db, datetime(2026, 10, 2, 9, 0, tzinfo=timezone.utc)) == 0


def test_test_email_needs_configuration(auth_client):
    assert auth_client.post("/api/v1/study/settings/test-email").status_code == 503


def test_failed_send_is_retried_next_run(auth_client, db, monkeypatch):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    service.update_settings(db, user.id, StudySettingsUpdate(timezone="UTC", reminder_time="08:30", reminder_days=[3]))
    attempts: list[int] = []

    def flaky(**kw):
        attempts.append(1)
        if len(attempts) == 1:
            raise reminders.EmailSendError("provider hiccup")

    monkeypatch.setattr(reminders, "send_email", flaky)
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 8, 45, tzinfo=timezone.utc)) == 0
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc)) == 1
    assert reminders.send_due_reminders(db, datetime(2026, 10, 1, 9, 15, tzinfo=timezone.utc)) == 0
    assert len(attempts) == 2


def test_concurrent_day_creation_reuses_the_first_row(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    facts = service.Facts(db, user.id, TODAY)
    first = service._get_or_plan_day(db, facts)

    # A second request that never saw the row inserts the same day: the unique constraint
    # rejects it, and the code falls back to the row that won.
    from app.study.models import StudyDay

    db.add(StudyDay(user_id=user.id, day=TODAY, plan=["problem:lc-1"], done=[]))
    assert service._commit_or_lose_race(db) is False
    again = service._get_or_plan_day(db, service.Facts(db, user.id, TODAY))
    assert again.id == first.id
    assert again.plan == first.plan


def test_retrievability_follows_the_forgetting_curve():
    from app.study.models import ReviewCard

    fresh = ReviewCard(box=3, due_on=TODAY + timedelta(days=7), last_reviewed_on=TODAY)
    assert service.retrievability(fresh, TODAY) == 1.0
    week_old_box1 = ReviewCard(box=1, due_on=TODAY - timedelta(days=6), last_reviewed_on=TODAY - timedelta(days=7))
    assert 0.5 < service.retrievability(week_old_box1, TODAY) < 0.6
    week_old_box4 = ReviewCard(box=4, due_on=TODAY + timedelta(days=14), last_reviewed_on=TODAY - timedelta(days=7))
    assert service.retrievability(week_old_box4, TODAY) > 0.95
    never_reviewed = ReviewCard(box=1, due_on=TODAY + timedelta(days=1), last_reviewed_on=None)
    assert service.retrievability(never_reviewed, TODAY) == 1.0


def test_readiness_combines_coverage_and_retention(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)

    empty = service.get_readiness(db, user.id, TODAY)
    assert empty.readiness == 0 and empty.retention is None and empty.recall_rate is None
    assert "Nothing measured yet" in empty.summary

    for slug in UNITS[0]["problems"][:4]:
        _solve(db, user.id, slug, datetime(2026, 9, 20, tzinfo=timezone.utc))
    out = service.get_readiness(db, user.id, TODAY)
    total_items = sum(len(u["problems"]) + len(u["lessons"]) + 2 for u in UNITS)
    assert abs(out.coverage - 4 / total_items) < 1e-9
    assert out.retention is not None and 0.4 < out.retention < 0.6  # box 1, 11 days old
    assert abs(out.readiness - out.coverage * out.retention) < 1e-9
    assert out.cards == 4
    assert out.history[-1].day == TODAY and abs(out.history[-1].readiness - out.readiness) < 1e-9

    body = auth_client.get("/api/v1/study/readiness").json()
    assert set(body) >= {"readiness", "coverage", "retention", "recall_rate", "pace", "history", "summary"}


def test_recall_rate_counts_ratings_over_a_fortnight(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    for slug in UNITS[0]["problems"][:6]:
        _solve(db, user.id, slug, datetime(2026, 9, 1, tzinfo=timezone.utc))
    queue = service.review_queue(db, user.id, TODAY)
    ratings = ["good", "good", "good", "forgot", "shaky"]
    last = None
    for card, rating in zip(queue.cards, ratings):
        last = service.rate_card(db, user.id, card.id, rating, TODAY)
    assert last is not None and last.recall_reviews == 5
    assert abs(last.recall_rate - 0.6) < 1e-9
    later = service.observed_recall(db, user.id, TODAY + timedelta(days=20))
    assert later == (None, 0)
    plan = service.get_today(db, user.id, TODAY)
    assert plan.recall_rate is not None and plan.readiness is not None


def test_pace_against_the_interview_line(auth_client, db):
    seed_problem_catalog(db)
    _seed_lessons(db)
    user = _user(db, auth_client)
    settings = service.get_or_create_settings(db, user.id)
    settings.created_at = datetime(2026, 9, 1, tzinfo=timezone.utc)
    settings.interview_date = date(2026, 12, 1)
    db.commit()
    facts = service.Facts(db, user.id, date(2026, 10, 16))  # halfway: 5 units expected
    assert service.pace_fraction(facts, settings) == 0.0
    for slug in UNITS[0]["problems"]:
        _solve(db, user.id, slug, datetime(2026, 9, 5, tzinfo=timezone.utc))
    facts = service.Facts(db, user.id, date(2026, 10, 16))
    pace = service.pace_fraction(facts, settings)
    assert pace is not None and 0.1 < pace < 0.2
