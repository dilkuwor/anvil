"""FSRS scheduling for review cards.

The learner still sees three buttons and a "level"; this module turns a rating into the
next due date using a fitted memory model instead of fixed Leitner intervals. Boxes stay
as a derived label so the rest of the app (unit levels, box counts) keeps working.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from fsrs import Card, Rating, Scheduler, State

from app.study.models import ReviewCard
from app.study.path import BOX_DAYS

# No same-day learning steps: this app reviews once a day, so every step is at least a day.
SCHEDULER = Scheduler(desired_retention=0.9, learning_steps=(), relearning_steps=(), enable_fuzzing=False)

RATING_BY_NAME: dict[str, Rating] = {"forgot": Rating.Again, "shaky": Rating.Hard, "good": Rating.Good}
NAME_BY_RATING: dict[Rating, str] = {value: key for key, value in RATING_BY_NAME.items()}


def rating_for_answer(correct: bool, confidence: str) -> Rating:
    """A graded answer plus the learner's confidence decides the rating; nobody self-rates."""
    if not correct:
        return Rating.Again
    return Rating.Good if confidence == "sure" else Rating.Hard


def box_for_stability(stability: float | None) -> int:
    """Derived level: the highest Leitner box whose interval the memory estimate has reached."""
    if stability is None:
        return 1
    box = 1
    for number, days in sorted(BOX_DAYS.items()):
        if stability >= days:
            box = number
    return box


def _noon(day: date) -> datetime:
    return datetime.combine(day, time(12), tzinfo=timezone.utc)


def to_fsrs_card(card: ReviewCard) -> Card:
    if card.stability is None:
        return Card(state=State.Learning, step=0, due=_noon(card.due_on))
    last = card.last_review
    if last is not None and last.tzinfo is None:  # SQLite hands back naive datetimes
        last = last.replace(tzinfo=timezone.utc)
    return Card(
        state=State(card.state or State.Review.value),
        step=card.step or 0,
        stability=card.stability,
        difficulty=card.difficulty,
        due=_noon(card.due_on),
        last_review=last,
    )


def schedule(card: ReviewCard, rating: Rating, *, today: date, now: datetime | None = None) -> None:
    """Apply one rating to a card in place: memory state, derived box and the next due day."""
    when = now or _noon(today)
    scheduled, _log = SCHEDULER.review_card(to_fsrs_card(card), rating, review_datetime=when)
    card.stability = scheduled.stability
    card.difficulty = scheduled.difficulty
    card.state = int(scheduled.state)
    card.step = scheduled.step or 0
    card.last_review = when
    if rating == Rating.Again:
        card.lapses = (card.lapses or 0) + 1
    due_day = scheduled.due.astimezone(timezone.utc).date()
    card.due_on = max(due_day, today + timedelta(days=1))
    card.box = box_for_stability(card.stability)


def retrievability(card: ReviewCard, today: date) -> float:
    """Probability of recall today from the card's memory estimate (or its box before FSRS)."""
    stability = card.stability or float(BOX_DAYS.get(card.box, BOX_DAYS[1]))
    last = card.last_reviewed_on or (card.due_on - timedelta(days=BOX_DAYS[1]))
    elapsed = max((today - last).days, 0)
    return 1.0 / (1.0 + elapsed / (9.0 * stability))
