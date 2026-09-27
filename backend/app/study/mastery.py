"""The mastery policy: when a checked lesson counts as mastered, and when it needs a refresh.

Kept apart from the scheduler on purpose. FSRS says when to review; this decides what the
review history means for the lesson's status. Change the rule here, nowhere else.
"""

from __future__ import annotations

from app.study.models import ReviewCard

MIN_STABILITY_DAYS = 21.0
MIN_REVIEWS = 2


def is_mastered(cards: list[ReviewCard]) -> bool:
    """Every question of the lesson recalled at least twice, with a memory estimate of three weeks or more."""
    if not cards:
        return False
    return all((card.reviews or 0) >= MIN_REVIEWS and (card.stability or 0.0) >= MIN_STABILITY_DAYS for card in cards)
