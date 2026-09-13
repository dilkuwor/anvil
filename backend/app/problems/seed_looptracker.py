"""Idempotent LoopTracker problem seeder.

Inserts any of the 65 catalog problems whose ``lc-{id}`` slug is missing.
Existing rows (including Microsoft Interview copies) are left unchanged.

This is the standalone CLI for the LoopTracker subset only. ``python -m app.seed`` uses
``app.problems.seed_catalog`` instead, which covers the whole catalog and also refreshes
authored content on rows that already exist.
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from database.seeds.looptracker import LOOPTRACKER_IDS, PROBLEMS, TAGS  # noqa: E402
from app.common import models as _models  # noqa: E402, F401
from app.problems.models import Problem, ProblemTag, Tag, TestCase


def seed_looptracker_problems(db: Session) -> tuple[int, int]:
    """Return (created, already_existed)."""
    tag_ids = _ensure_tags(db)
    existing = {problem.slug: problem for problem in db.scalars(select(Problem)).all()}
    created = 0
    existed = 0

    for spec in PROBLEMS:
        slug = spec["slug"]
        problem = existing.get(slug)
        if problem is None:
            problem = _create_problem(db, spec)
            existing[slug] = problem
            created += 1
        else:
            existed += 1
        _ensure_tag(db, problem.id, tag_ids[spec["tag"]])

    return created, existed


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
        time_complexity=spec["time_complexity"],
        space_complexity=spec["space_complexity"],
        starter_code=spec["starter_code"],
        function_signature=spec["function_signature"],
        reference_solution=spec["reference_solution"],
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


def validate_catalog() -> None:
    if len(LOOPTRACKER_IDS) != 65:
        raise RuntimeError(f"LoopTracker catalog must have 65 problems, found {len(LOOPTRACKER_IDS)}")
    if len(set(LOOPTRACKER_IDS)) != 65:
        raise RuntimeError("LoopTracker catalog has duplicate LeetCode IDs")
    ids = [spec["leetcode_id"] for spec in PROBLEMS]
    if ids != LOOPTRACKER_IDS:
        raise RuntimeError("LoopTracker catalog order does not match problems.md")


validate_catalog()


def main() -> int:
    from app.common.database import SessionLocal

    db = SessionLocal()
    try:
        created, existed = seed_looptracker_problems(db)
        db.commit()
        print(f"LoopTracker problems: {created} created, {existed} already present, {created + existed} total.")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
