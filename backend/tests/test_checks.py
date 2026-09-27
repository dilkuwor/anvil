"""Knowledge checks: answering in the lesson, earning Checked, review cards, mastery, memory."""

from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.learn.models import CheckAttempt, LessonCheck, UserLearningProgress
from app.learn.seed import seed_checks
from app.study import service
from app.study.models import ReviewCard
from app.study.path import UNITS
from app.users.models import User
from tests.test_study import _seed_lessons

TODAY = date(2026, 10, 1)
SLUG = UNITS[0]["lessons"][0]

QUESTIONS = {
    SLUG: [
        {
            "key": "q-choice",
            "kind": "choice",
            "prompt": "Which comes first?",
            "options": ["Requirements", "Redis", "Kubernetes"],
            "answer": 0,
            "explanation": "Requirements decide everything after them.",
            "section": "mental-model",
            "concept": "template.requirements-first",
            "mistake": "template.tech-before-requirements",
        },
        {
            "key": "q-mistake",
            "kind": "spot_mistake",
            "prompt": "A candidate opens with 'I'd use Kafka.' What is wrong?",
            "options": ["Nothing", "Technology chosen before requirements", "Kafka is too slow"],
            "answer": 1,
            "explanation": "Name the requirement the tool serves first.",
            "section": "common-mistakes",
            "concept": "template.requirements-first",
            "mistake": "template.tech-before-requirements",
        },
        {
            "key": "q-short",
            "kind": "short_answer",
            "prompt": "Name the four steps of the template.",
            "options": [],
            "answer": None,
            "model_answer": "Clarify, estimate, design, deep dive.",
            "explanation": "Four steps, always in that order.",
            "section": "how-it-works",
            "concept": "template.steps",
        },
    ]
}


def _user(db, client) -> User:
    return db.scalar(select(User).where(User.email == "forge@example.com"))


@pytest.fixture
def lesson(db, auth_client):
    _seed_lessons(db)
    seed_checks(db, QUESTIONS)
    db.commit()
    body = auth_client.get(f"/api/v1/learn/lessons/{SLUG}").json()
    return body


def _answer(client, lesson, check, **payload):
    response = client.post(f"/api/v1/learn/lessons/{lesson['id']}/checks/{check['id']}/answer", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def test_questions_are_served_without_answers(lesson):
    assert lesson["learn_state"] == "learning"
    assert [check["kind"] for check in lesson["checks"]] == ["choice", "spot_mistake", "short_answer"]
    for check in lesson["checks"]:
        assert "answer" not in check and "explanation" not in check and "answer_index" not in check
    assert lesson["checks"][0]["model_answer"] is None
    assert lesson["checks"][2]["model_answer"] == "Clarify, estimate, design, deep dive."
    assert lesson["check_state"] == {"total": 3, "checked": 0, "correct_ids": [], "attempted_ids": []}
    assert lesson["review"] is None


def test_answering_every_question_once_earns_checked_and_cards(auth_client, db, lesson):
    user = _user(db, auth_client)
    choice, mistake, short = lesson["checks"]

    wrong = _answer(auth_client, lesson, choice, choice=1, confidence="sure")
    assert wrong["correct"] is False and wrong["correct_index"] == 0
    assert wrong["explanation"] == "Requirements decide everything after them." and wrong["section"] == "mental-model"
    assert wrong["checked"] == 0 and wrong["just_checked"] is False

    right = _answer(auth_client, lesson, choice, choice=0, confidence="unsure")
    assert right["correct"] is True and right["checked"] == 1

    _answer(auth_client, lesson, mistake, choice=1, confidence="sure")
    done = _answer(auth_client, lesson, short, text="clarify estimate design deep dive", correct=True, confidence="sure")
    assert done["checked"] == 3 and done["just_checked"] is True and done["learn_state"] == "checked"

    row = db.scalar(select(UserLearningProgress).where(UserLearningProgress.user_id == user.id))
    assert row.status == "COMPLETED" and row.checked_at is not None and row.mastered_at is None

    cards = db.scalars(select(ReviewCard).where(ReviewCard.user_id == user.id, ReviewCard.kind == "CHECK")).all()
    assert len(cards) == 3
    by_ref = {card.ref: card for card in cards}
    assert all(card.stability is not None and card.reviews == 0 for card in cards)
    # First try wrong comes back sooner than first try right-and-sure.
    assert by_ref[choice["id"]].due_on <= by_ref[mistake["id"]].due_on
    assert by_ref[choice["id"]].lapses == 1

    attempts = db.scalars(select(CheckAttempt).where(CheckAttempt.user_id == user.id)).all()
    assert [(a.attempt_number, a.correct, a.confidence, a.rating) for a in attempts if a.check_id == uuid.UUID(choice["id"])] == [
        (1, False, "sure", "forgot"),
        (2, True, "unsure", "shaky"),
    ]

    again = auth_client.get(f"/api/v1/learn/lessons/{SLUG}").json()
    assert again["learn_state"] == "checked" and again["check_state"]["checked"] == 3
    assert again["review"]["cards"] == 3 and again["review"]["next_due_on"]

    # Answering again after Checked records attempts but never doubles the cards.
    _answer(auth_client, lesson, choice, choice=0, confidence="sure")
    assert db.scalar(select(ReviewCard).where(ReviewCard.user_id == user.id, ReviewCard.kind == "CHECK").with_only_columns(ReviewCard.id).limit(10)) is not None
    assert len(db.scalars(select(ReviewCard).where(ReviewCard.user_id == user.id, ReviewCard.kind == "CHECK")).all()) == 3


def test_bad_answers_are_rejected(auth_client, lesson):
    choice, _mistake, short = lesson["checks"]
    assert auth_client.post(f"/api/v1/learn/lessons/{lesson['id']}/checks/{choice['id']}/answer", json={"choice": 9}).status_code == 422
    assert auth_client.post(f"/api/v1/learn/lessons/{lesson['id']}/checks/{short['id']}/answer", json={"text": "x"}).status_code == 422
    assert auth_client.post(f"/api/v1/learn/lessons/{lesson['id']}/checks/{uuid.uuid4()}/answer", json={"choice": 0}).status_code == 404


def _earn_checked(auth_client, db, lesson):
    choice, mistake, short = lesson["checks"]
    _answer(auth_client, lesson, choice, choice=0, confidence="sure")
    _answer(auth_client, lesson, mistake, choice=1, confidence="sure")
    _answer(auth_client, lesson, short, correct=True, confidence="sure")
    user = _user(db, auth_client)
    cards = db.scalars(select(ReviewCard).where(ReviewCard.user_id == user.id, ReviewCard.kind == "CHECK")).all()
    for card in cards:
        card.due_on = TODAY
    db.commit()
    return user, {card.ref: card for card in cards}


def test_question_cards_are_answered_in_review(auth_client, db, lesson):
    user, cards = _earn_checked(auth_client, db, lesson)
    choice, _mistake, short = lesson["checks"]

    queue = service.review_queue(db, user.id, TODAY)
    assert queue.due_total == 3
    card = next(item for item in queue.cards if item.ref == choice["id"])
    assert card.kind == "CHECK" and card.options == ["Requirements", "Redis", "Kubernetes"]
    assert card.answer == "" and card.check_kind == "choice" and card.href.endswith("#mental-model")
    short_card = next(item for item in queue.cards if item.ref == short["id"])
    assert short_card.wants_text and short_card.answer == "Clarify, estimate, design, deep dive."

    out = service.answer_check_card(db, user.id, card.id, 0, "sure", TODAY)
    assert out.correct is True and out.correct_index == 0 and out.explanation
    assert out.next_due_on > TODAY and out.remaining == 2
    row = db.get(ReviewCard, card.id)
    assert row.reviews == 1 and row.last_rating == "good" and row.last_reviewed_on == TODAY

    later = out.next_due_on
    missed = service.answer_check_card(db, user.id, card.id, 2, "sure", later)
    assert missed.correct is False and db.get(ReviewCard, card.id).lapses == 1
    assert (missed.next_due_on - later).days <= 3

    attempts = db.scalars(select(CheckAttempt).where(CheckAttempt.check_id == uuid.UUID(choice["id"]), CheckAttempt.source == "review")).all()
    assert [(a.correct, a.rating, a.attempt_number) for a in attempts] == [(True, "good", 1), (False, "forgot", 2)]

    # Short-answer cards keep the self-rating path and still record an attempt.
    rated = service.rate_card(db, user.id, short_card.id, "good", TODAY)
    assert rated.card.kind == "CHECK"
    assert db.scalar(select(CheckAttempt).where(CheckAttempt.check_id == uuid.UUID(short["id"]), CheckAttempt.source == "review")).correct is True

    response = auth_client.post(f"/api/v1/study/reviews/{card.id}/answer", json={"choice": 0, "confidence": "unsure"})
    assert response.status_code == 200 and response.json()["correct"] is True
    assert auth_client.post(f"/api/v1/study/reviews/{short_card.id}/answer", json={"choice": 0}).status_code == 404


def test_mastery_policy_and_refresh(auth_client, db, lesson):
    user, cards = _earn_checked(auth_client, db, lesson)
    choice = lesson["checks"][0]
    for card in cards.values():
        card.stability = 30.0
        card.reviews = 2
    db.commit()

    out = service.answer_check_card(db, user.id, cards[choice["id"]].id, 0, "sure", TODAY)
    assert out.learn_state == "mastered" and out.needs_refresh is False
    row = db.scalar(select(UserLearningProgress).where(UserLearningProgress.user_id == user.id))
    assert row.mastered_at is not None
    assert auth_client.get(f"/api/v1/learn/lessons/{SLUG}").json()["learn_state"] == "mastered"

    lapse = service.answer_check_card(db, user.id, cards[choice["id"]].id, 1, "sure", out.next_due_on)
    assert lapse.learn_state == "mastered" and lapse.needs_refresh is True
    db.refresh(row)
    assert row.needs_refresh is True and row.mastered_at is not None


def test_memory_endpoint(auth_client, db, lesson):
    user, cards = _earn_checked(auth_client, db, lesson)
    choice = lesson["checks"][0]
    for _ in range(2):
        service.answer_check_card(db, user.id, cards[choice["id"]].id, 2, "sure", TODAY)

    out = service.get_memory(db, user.id, TODAY)
    assert len(out.week) == 7 and out.week[0].day == TODAY
    assert out.due_today == 2  # the two untouched cards are still due today
    assert [item.slug for item in out.lessons] == [SLUG]
    memory_lesson = out.lessons[0]
    assert memory_lesson.learn_state == "checked" and memory_lesson.cards == 3 and memory_lesson.reviews == 2
    assert memory_lesson.next_due_on == TODAY
    assert out.weak and out.weak[0].concept == "template.requirements-first" and out.weak[0].misses == 2

    body = auth_client.get("/api/v1/study/memory").json()
    assert set(body) == {"week", "lessons", "weak", "due_today"}


def test_seed_checks_keeps_ids_and_drops_removed_questions(db):
    _seed_lessons(db)
    seed_checks(db, QUESTIONS)
    db.commit()
    before = {row.key: row.id for row in db.scalars(select(LessonCheck)).all()}
    assert set(before) == {"q-choice", "q-mistake", "q-short"}

    trimmed = {SLUG: QUESTIONS[SLUG][:2] + [dict(QUESTIONS[SLUG][2], key="q-new")]}
    seed_checks(db, trimmed)
    db.commit()
    after = {row.key: row.id for row in db.scalars(select(LessonCheck)).all()}
    assert after["q-choice"] == before["q-choice"] and after["q-mistake"] == before["q-mistake"]
    assert "q-short" not in after and "q-new" in after


def _heading_slug(title: str) -> str:
    import re

    text = re.sub(r"^\d+\.\s*", "", title.lower())
    text = re.sub(r"[^\w\s-]", "", text).strip()
    return re.sub(r"\s+", "-", text)


def test_seeded_checks_validate_and_point_at_real_sections():
    from database.seeds.learn import TOPICS
    from database.seeds.learn_checks import CHECKS, validate_checks

    validate_checks(CHECKS)
    lessons = {lesson["slug"]: lesson for topic in TOPICS for lesson in topic["lessons"]}
    import re

    for slug, items in CHECKS.items():
        assert slug in lessons, f"checks for unknown lesson {slug!r}"
        sections = {_heading_slug(m.group(1)) for m in re.finditer(r"^## (.+)$", lessons[slug]["content"], re.M)}
        for item in items:
            assert item["section"] in sections, f"{slug} [{item['key']}]: section {item['section']!r} is not a heading"
        keys = [item["key"] for item in items]
        assert len(keys) == len(set(keys))
    for slug in ("caching", "rate-limiting", "sd-consistent-hashing", "replication"):
        assert len(CHECKS[slug]) >= 5

    bad = {"x": [dict(QUESTIONS[SLUG][0], answer=7)] * 3}
    with pytest.raises(RuntimeError):
        validate_checks(bad)


def test_quiz_scope_returns_every_question_card_regardless_of_due_date(auth_client, db, lesson):
    user, cards = _earn_checked(auth_client, db, lesson)
    for card in cards.values():
        card.due_on = TODAY + timedelta(days=30)
    db.commit()

    assert service.review_queue(db, user.id, TODAY).due_total == 0
    quiz = service.review_queue(db, user.id, TODAY, scope=f"lesson:{SLUG}")
    assert quiz.practice is True and quiz.due_total == 3 and len(quiz.cards) == 3
    assert quiz.scope_title == lesson["title"]
    assert {card.kind for card in quiz.cards} == {"CHECK"}

    by_topic = service.review_queue(db, user.id, TODAY, scope="topic:system-design-template")
    assert len(by_topic.cards) == 3
    by_category = auth_client.get("/api/v1/study/reviews?scope=category:system-design").json()
    assert by_category["practice"] is True and len(by_category["cards"]) == 3
    assert auth_client.get("/api/v1/study/reviews?scope=lesson:nope").json()["cards"] == []


def test_progress_lists_every_lesson_with_first_try_and_sure_but_wrong(auth_client, db, lesson):
    user = _user(db, auth_client)
    choice, mistake, short = lesson["checks"]
    _answer(auth_client, lesson, choice, choice=1, confidence="sure")  # sure and wrong
    _answer(auth_client, lesson, choice, choice=0, confidence="sure")
    _answer(auth_client, lesson, mistake, choice=1, confidence="unsure")
    _answer(auth_client, lesson, short, correct=True, confidence="sure")

    out = service.get_progress(db, user.id, TODAY)
    assert [group.slug for group in out.groups] == ["system-design"]
    group = out.groups[0]
    assert group.total == len(UNITS[0]["lessons"]) and group.checked == 1
    assert group.quiz_scope == "category:system-design"
    item = next(i for i in group.items if i.slug == SLUG)
    assert item.kind == "lesson" and item.learn_state == "checked"
    assert (item.first_try_correct, item.first_try_total) == (2, 3)
    assert item.cards == 3 and item.quiz_scope == f"lesson:{SLUG}"
    other = next(i for i in group.items if i.slug != SLUG)
    assert other.learn_state == "not_started" and other.cards == 0 and other.quiz_scope is None

    # The choice question was answered sure-and-wrong, then corrected, so it is no longer listed.
    assert out.sure_but_wrong == []
    _answer(auth_client, lesson, choice, choice=2, confidence="sure")
    out = service.get_progress(db, user.id, TODAY)
    assert len(out.sure_but_wrong) == 1
    assert out.sure_but_wrong[0].prompt == "Which comes first?" and out.sure_but_wrong[0].times == 2
    assert out.sure_but_wrong[0].href.endswith("#mental-model")

    body = auth_client.get("/api/v1/study/progress").json()
    assert set(body) == {"groups", "sure_but_wrong"}


def test_questions_added_later_join_review_for_checked_lessons(auth_client, db, lesson):
    user, cards = _earn_checked(auth_client, db, lesson)
    assert len(cards) == 3
    extra = {SLUG: QUESTIONS[SLUG] + [dict(QUESTIONS[SLUG][0], key="q-later", prompt="A later question?")]}
    seed_checks(db, extra)
    db.commit()

    quiz = service.review_queue(db, user.id, TODAY, scope=f"lesson:{SLUG}")
    assert len(quiz.cards) == 4
    new_card = next(card for card in quiz.cards if card.prompt == "A later question?")
    assert new_card.box == 1 and new_card.due_on is not None  # fresh card, never rated
    assert len(db.scalars(select(ReviewCard).where(ReviewCard.user_id == user.id, ReviewCard.kind == "CHECK")).all()) == 4
