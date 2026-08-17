"""Idempotent Microsoft Interview list seeder."""

from __future__ import annotations

import re
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from database.seeds.microsoft_interview import (  # noqa: E402
    EXPECTED_LEETCODE_IDS,
    LIST_DESCRIPTION,
    LIST_NAME,
    PROBLEMS,
    TAGS,
    leetcode_slug,
    validate_catalog,
)
from app.lists.models import ProblemList, ProblemListItem
from app.problems.models import Problem, ProblemTag, Tag, TestCase

_LC_TITLE = re.compile(r"(?i)leetcode\s*#\s*(\d+)\b")
_ORDER_EPOCH = datetime(2020, 1, 1, tzinfo=timezone.utc)


@dataclass(frozen=True)
class MicrosoftInterviewSeedReport:
    list_name: str
    expected: int
    found: int
    created_problems: int
    existing_problems: int
    added_memberships: int
    existing_memberships: int
    duplicates_created: int
    order_verified: bool
    extra_list_items: int
    leetcode_ids: list[int]

    def format(self) -> str:
        return (
            "Microsoft Interview List\n"
            "------------------------\n"
            f"List: {self.list_name}\n"
            "Problems:\n"
            f"{self.expected} expected\n"
            f"{self.found} found\n"
            "Created:\n"
            f"{self.created_problems} new problems\n"
            "Already existed:\n"
            f"{self.existing_problems} problems\n"
            "Added to list:\n"
            f"{self.added_memberships} new memberships\n"
            "Already in list:\n"
            f"{self.existing_memberships} memberships\n"
            "Duplicates created:\n"
            f"{self.duplicates_created}\n"
            "Final order:\n"
            f"{'Verified' if self.order_verified else 'FAILED'}"
        )


def seed_microsoft_interview_problems(db: Session, user_id: UUID) -> MicrosoftInterviewSeedReport:
    validate_catalog()
    tag_ids = _ensure_tags(db)
    existing_by_id = _index_existing_problems(db)

    created_problems = 0
    existing_problems = 0
    ordered: list[Problem] = []

    for spec in PROBLEMS:
        problem = existing_by_id.get(spec["leetcode_id"])
        if problem is None:
            problem = _create_problem(db, spec)
            existing_by_id[spec["leetcode_id"]] = problem
            created_problems += 1
        else:
            existing_problems += 1
        _ensure_tag(db, problem.id, tag_ids[spec["tag"]])
        ordered.append(problem)

    problem_list = _find_or_create_list(db, user_id)
    memberships = {item.problem_id: item for item in problem_list.items}
    added_memberships = 0
    existing_memberships = 0

    for position, problem in enumerate(ordered, start=1):
        item = memberships.get(problem.id)
        stamp = _order_stamp(position)
        if item is None:
            item = ProblemListItem(list_id=problem_list.id, problem_id=problem.id, created_at=stamp)
            db.add(item)
            memberships[problem.id] = item
            added_memberships += 1
        else:
            item.created_at = stamp
            existing_memberships += 1

    db.flush()
    items = db.scalars(
        select(ProblemListItem)
        .options(selectinload(ProblemListItem.problem))
        .where(ProblemListItem.list_id == problem_list.id)
    ).all()

    spec_ids = {problem.id for problem in ordered}
    extra_list_items = sum(1 for item in items if item.problem_id not in spec_ids)
    ordered_ids = [
        _problem_leetcode_id(item.problem)
        for item in sorted(items, key=lambda row: _aware(row.created_at))
        if item.problem_id in spec_ids
    ]
    order_verified = ordered_ids == EXPECTED_LEETCODE_IDS
    found = len({problem.id for problem in ordered})

    return MicrosoftInterviewSeedReport(
        list_name=problem_list.name,
        expected=47,
        found=found,
        created_problems=created_problems,
        existing_problems=existing_problems,
        added_memberships=added_memberships,
        existing_memberships=existing_memberships,
        duplicates_created=0,
        order_verified=order_verified,
        extra_list_items=extra_list_items,
        leetcode_ids=list(EXPECTED_LEETCODE_IDS),
    )


def _ensure_tags(db: Session) -> dict[str, uuid.UUID]:
    ids: dict[str, uuid.UUID] = {}
    for name, slug in TAGS:
        tag = db.scalar(select(Tag).where(Tag.slug == slug))
        if tag is None:
            tag = db.scalar(select(Tag).where(func.lower(Tag.name) == name.lower()))
        if tag is None:
            tag = Tag(id=uuid.uuid4(), name=name, slug=slug)
            db.add(tag)
            db.flush()
        ids[slug] = tag.id
    return ids


def _ensure_tag(db: Session, problem_id: uuid.UUID, tag_id: uuid.UUID) -> None:
    existing = db.scalar(
        select(ProblemTag).where(ProblemTag.problem_id == problem_id, ProblemTag.tag_id == tag_id)
    )
    if existing is None:
        db.add(ProblemTag(problem_id=problem_id, tag_id=tag_id))


def _index_existing_problems(db: Session) -> dict[int, Problem]:
    found: dict[int, Problem] = {}
    problems = db.scalars(select(Problem)).all()
    by_norm_title = {_normalize(problem.title): problem for problem in problems}

    for spec in PROBLEMS:
        leetcode_id = spec["leetcode_id"]
        match = _match_problem(problems, spec)
        if match is None:
            match = by_norm_title.get(_normalize(spec["title"]))
        if match is not None:
            found[leetcode_id] = match
    return found


def _match_problem(problems: list[Problem], spec: dict) -> Problem | None:
    leetcode_id = spec["leetcode_id"]
    exact_slug = leetcode_slug(leetcode_id)
    prefix = f"{exact_slug}-"
    for problem in problems:
        if problem.slug == exact_slug or problem.slug.startswith(prefix):
            return problem
        parsed = _title_leetcode_id(problem.title)
        if parsed == leetcode_id:
            return problem
    return None


def _create_problem(db: Session, spec: dict) -> Problem:
    problem = Problem(
        id=uuid.uuid4(),
        title=spec["title"],
        slug=spec["slug"],
        description=spec["description"],
        difficulty=spec["difficulty"],
        constraints=spec["constraints"],
        input_format=spec["input_format"],
        output_format=spec["output_format"],
        explanation=spec["explanation"],
        hints=spec["hints"],
        examples=spec["examples"],
        starter_code=spec["starter_code"],
        function_signature=spec["function_signature"],
        is_active=True,
    )
    db.add(problem)
    db.flush()
    for case in spec["tests"]:
        db.add(
            TestCase(
                id=uuid.uuid4(),
                problem_id=problem.id,
                input=case["input"],
                expected_output=case["expected"],
                is_hidden=case["hidden"],
                execution_order=case["order"],
            )
        )
    return problem


def _find_or_create_list(db: Session, user_id: UUID) -> ProblemList:
    row = db.scalar(
        select(ProblemList)
        .options(selectinload(ProblemList.items).selectinload(ProblemListItem.problem))
        .where(ProblemList.user_id == user_id, func.lower(ProblemList.name) == LIST_NAME.lower())
    )
    if row is None:
        row = ProblemList(user_id=user_id, name=LIST_NAME, description=LIST_DESCRIPTION)
        db.add(row)
        db.flush()
        db.refresh(row)
    return row


def _order_stamp(position: int) -> datetime:
    return _ORDER_EPOCH + timedelta(seconds=position)


def _aware(value: datetime | None) -> datetime:
    if value is None:
        return _ORDER_EPOCH
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _title_leetcode_id(title: str) -> int | None:
    match = _LC_TITLE.search(title)
    if match is None:
        return None
    return int(match.group(1))


def _problem_leetcode_id(problem: Problem) -> int | None:
    from_slug = _slug_leetcode_id(problem.slug)
    if from_slug is not None:
        return from_slug
    return _title_leetcode_id(problem.title) or next(
        (spec["leetcode_id"] for spec in PROBLEMS if _normalize(spec["title"]) == _normalize(problem.title)),
        None,
    )


def _slug_leetcode_id(slug: str) -> int | None:
    match = re.fullmatch(r"lc-(\d+)(?:-.*)?", slug)
    if match is None:
        return None
    return int(match.group(1))


def _normalize(value: str) -> str:
    return "".join(char.lower() for char in value if char.isalnum())
