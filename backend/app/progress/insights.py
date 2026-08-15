"""Deterministic dashboard insights. Swap recommend_problems later for a model."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.common.enums import Difficulty, ProgressStatus
from app.problems.models import Problem

TOPIC_GROUPS: list[tuple[str, str, list[str]]] = [
    ("Arrays & Strings", "arrays-strings", ["array", "string"]),
    ("HashMap", "hashmap", ["hashmap"]),
    ("Two Pointers", "two-pointers", ["two-pointers"]),
    ("Sliding Window", "sliding-window", ["sliding-window"]),
    ("Binary Search", "binary-search", ["binary-search"]),
    ("Linked List", "linked-list", ["linked-list"]),
    ("Stack / Queue", "stack-queue", ["stack", "queue"]),
    ("Trees", "trees", ["tree"]),
    ("Graphs", "graphs", ["graph"]),
    ("Dynamic Programming", "dynamic-programming", ["dynamic-programming"]),
    ("Heap", "heap", ["heap"]),
    ("Backtracking", "backtracking", ["backtracking"]),
]


def topic_progress(problems: list[Problem], solved_ids: set[UUID]) -> list[dict]:
    used_slugs: set[str] = set()
    rows: list[dict] = []
    for name, slug, members in TOPIC_GROUPS:
        members_set = set(members)
        matching = [problem for problem in problems if any(tag.slug in members_set for tag in problem.tags)]
        if not matching:
            continue
        used_slugs.update(tag.slug for problem in matching for tag in problem.tags if tag.slug in members_set)
        solved = sum(1 for problem in matching if problem.id in solved_ids)
        rows.append(
            {
                "name": name,
                "slug": slug,
                "solved": solved,
                "total": len(matching),
                "percent": _percent(solved, len(matching)),
            }
        )

    leftovers: dict[str, list[Problem]] = {}
    for problem in problems:
        for tag in problem.tags:
            if tag.slug in used_slugs:
                continue
            leftovers.setdefault(tag.slug, [])
            if problem not in leftovers[tag.slug]:
                leftovers[tag.slug].append(problem)
    for slug, matching in sorted(leftovers.items()):
        tag_name = next((tag.name for problem in matching for tag in problem.tags if tag.slug == slug), slug)
        solved = sum(1 for problem in matching if problem.id in solved_ids)
        rows.append(
            {
                "name": tag_name,
                "slug": slug,
                "solved": solved,
                "total": len(matching),
                "percent": _percent(solved, len(matching)),
            }
        )
    return rows


def recommend_problems(
    problems: list[Problem],
    *,
    status_by_id: dict[UUID, str],
    last_attempted: dict[UUID, datetime | None],
    solved_ids: set[UUID],
    topics: list[dict],
    limit: int = 3,
) -> list[Problem]:
    now = datetime.now(UTC)
    topic_gap = {row["slug"]: 1 - (row["solved"] / row["total"] if row["total"] else 0) for row in topics}
    solved_count = len(solved_ids)

    scored: list[tuple[float, str, Problem]] = []
    for problem in problems:
        if problem.id in solved_ids:
            continue
        status = status_by_id.get(problem.id, ProgressStatus.NOT_STARTED.value)
        score = 0.0
        if solved_count == 0:
            score += 40 if problem.difficulty == Difficulty.EASY.value else 10
        elif solved_count < 5:
            score += {"EASY": 20, "MEDIUM": 35, "HARD": 8}.get(problem.difficulty, 10)
        else:
            score += {"EASY": 12, "MEDIUM": 36, "HARD": 22}.get(problem.difficulty, 10)

        if status == ProgressStatus.ATTEMPTED.value:
            score -= 12
        gaps = [topic_gap.get(tag.slug, 0.5) for tag in problem.tags]
        score += 18 * (sum(gaps) / len(gaps) if gaps else 0.4)

        attempted_at = last_attempted.get(problem.id)
        if attempted_at is not None:
            age = now - (attempted_at if attempted_at.tzinfo else attempted_at.replace(tzinfo=UTC))
            if age < timedelta(days=2):
                score -= 20

        scored.append((score, problem.title, problem))

    scored.sort(key=lambda item: (-item[0], item[1]))
    return [item[2] for item in scored[:limit]]


def interview_readiness(
    *,
    total_solved: int,
    total_problems: int,
    easy_solved: int,
    easy_total: int,
    medium_solved: int,
    medium_total: int,
    hard_solved: int,
    hard_total: int,
    current_streak: int,
    accepted_submissions: int,
    total_submissions: int,
    topics: list[dict],
) -> dict | None:
    if total_problems == 0 or (total_solved == 0 and total_submissions == 0):
        return None

    coverage = total_solved / total_problems
    difficulty = (
        0.4 * _ratio(easy_solved, easy_total)
        + 0.4 * _ratio(medium_solved, medium_total)
        + 0.2 * _ratio(hard_solved, hard_total)
    )
    started = sum(1 for row in topics if row["solved"] > 0)
    topic_score = started / len(topics) if topics else 0
    consistency = min(current_streak, 14) / 14
    accuracy = accepted_submissions / total_submissions if total_submissions else 0

    overall = 100 * (
        0.35 * coverage + 0.25 * difficulty + 0.20 * topic_score + 0.10 * consistency + 0.10 * accuracy
    )
    return {
        "overall": round(overall),
        "blurb": "Estimated from coverage, difficulty mix, topic spread, streak, and accept rate — not an interview score.",
        "factors": [
            {"key": "coverage", "label": "Problem coverage", "percent": _percent(total_solved, total_problems)},
            {"key": "difficulty", "label": "Difficulty mix", "percent": round(difficulty * 100)},
            {"key": "topics", "label": "Topic spread", "percent": _percent(started, len(topics) or 1)},
            {"key": "consistency", "label": "Consistency", "percent": round(consistency * 100)},
            {"key": "accuracy", "label": "Accept rate", "percent": _percent(accepted_submissions, total_submissions or 1)},
        ],
        "topics": [
            {"name": row["name"], "slug": row["slug"], "percent": row["percent"]}
            for row in topics
            if row["total"] > 0
        ],
    }


def serialize_recommendation(problem: Problem, status: str) -> dict:
    return {
        "id": problem.id,
        "title": problem.title,
        "slug": problem.slug,
        "difficulty": problem.difficulty,
        "status": status,
        "tags": [{"id": tag.id, "name": tag.name, "slug": tag.slug} for tag in problem.tags],
    }


def _ratio(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return part / whole


def _percent(part: int, whole: int) -> int:
    if whole <= 0:
        return 0
    return round(100 * part / whole)
