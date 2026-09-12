"""Seed and refresh the full LeetCode-keyed problem catalog.

``seed_looptracker_problems`` only ever inserts: it leaves existing rows completely alone.
That was the right call while the catalogs were being merged, but it also means authored
content can never be corrected once a row exists, and it covered only the 65 LoopTracker
problems, leaving the Microsoft-only ones to a separate per-user CLI.

This seeder covers the whole catalog and refreshes authored fields in place. It is content
only: problem ids, slugs, submissions and progress are never touched, and test cases are
rewritten only when they actually differ, so submission history survives a no-op run.
"""

from __future__ import annotations

import sys
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from database.seeds.catalog import PROBLEMS, TAGS, validate_catalog  # noqa: E402

from app.common import models as _models  # noqa: E402, F401
from app.problems.models import Problem, ProblemTag, Tag, TestCase  # noqa: E402

# Authored fields. Everything else on Problem is either identity or user-facing state.
_CONTENT_FIELDS = (
    "title",
    "description",
    "difficulty",
    "constraints",
    "input_format",
    "output_format",
    "explanation",
    "hints",
    "examples",
    "time_complexity",
    "space_complexity",
    "starter_code",
    "function_signature",
    "reference_solution",
)


@dataclass(frozen=True)
class CatalogSeedReport:
    total: int
    created: int
    updated: int
    unchanged: int
    tests_rewritten: int

    def format(self) -> str:
        return (
            f"Problem catalog: {self.total} problems "
            f"({self.created} created, {self.updated} content-updated, {self.unchanged} unchanged; "
            f"{self.tests_rewritten} test suites rewritten)."
        )


def seed_problem_catalog(db: Session) -> CatalogSeedReport:
    validate_catalog()
    tag_ids = _ensure_tags(db)
    existing = {
        problem.slug: problem
        for problem in db.scalars(
            select(Problem).options(selectinload(Problem.test_cases))
        ).all()
    }

    created = 0
    updated = 0
    tests_rewritten = 0

    for spec in PROBLEMS:
        problem = existing.get(spec["slug"])
        if problem is None:
            problem = Problem(id=uuid.uuid4(), slug=spec["slug"], is_active=True)
            db.add(problem)
            created += 1
            changed = True
        else:
            changed = False

        for field in _CONTENT_FIELDS:
            if getattr(problem, field, None) != spec[field]:
                setattr(problem, field, spec[field])
                changed = True
        if not problem.is_active:
            problem.is_active = True
            changed = True
        db.flush()

        if _rewrite_tests_if_changed(db, problem, spec["tests"]):
            tests_rewritten += 1
            changed = True

        _ensure_tag(db, problem.id, tag_ids[spec["tag"]])
        if changed and problem.slug in existing:
            updated += 1

    return CatalogSeedReport(
        total=len(PROBLEMS),
        created=created,
        updated=updated,
        unchanged=len(PROBLEMS) - created - updated,
        tests_rewritten=tests_rewritten,
    )


def _rewrite_tests_if_changed(db: Session, problem: Problem, tests: list[dict]) -> bool:
    current = sorted(
        (
            (case.execution_order, case.input, case.expected_output, case.is_hidden)
            for case in problem.test_cases
        )
    )
    wanted = sorted(
        (case["order"], case["input"], case["expected"], case["hidden"]) for case in tests
    )
    if current == wanted:
        return False

    db.execute(delete(TestCase).where(TestCase.problem_id == problem.id))
    for case in tests:
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
    db.flush()
    return True


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


def main() -> int:
    from app.common.database import SessionLocal

    db = SessionLocal()
    try:
        report = seed_problem_catalog(db)
        db.commit()
        print(report.format())
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
