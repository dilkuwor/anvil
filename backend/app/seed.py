from __future__ import annotations

import sys
import uuid
from pathlib import Path

from sqlalchemy import delete, select

# Allow `python -m app.seed` from backend/ and importing database/seeds.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from database.seeds.problems import PROBLEMS, TAGS  # noqa: E402

from app.common.database import SessionLocal  # noqa: E402
from app.common.models import Problem, ProblemTag, Tag, TestCase  # noqa: E402
from app.learn.seed import seed_learning  # noqa: E402


def seed() -> None:
    db = SessionLocal()
    try:
        tag_ids: dict[str, uuid.UUID] = {}
        for name, slug in TAGS:
            tag = db.scalar(select(Tag).where(Tag.slug == slug))
            if tag is None:
                tag = Tag(id=uuid.uuid4(), name=name, slug=slug)
                db.add(tag)
                db.flush()
            tag_ids[slug] = tag.id

        for spec in PROBLEMS:
            problem = db.scalar(select(Problem).where(Problem.slug == spec["slug"]))
            if problem is None:
                problem = Problem(id=uuid.uuid4(), slug=spec["slug"])
                db.add(problem)
            problem.title = spec["title"]
            problem.description = spec["description"]
            problem.difficulty = spec["difficulty"]
            problem.constraints = spec["constraints"]
            problem.input_format = spec["input_format"]
            problem.output_format = spec["output_format"]
            problem.explanation = spec["explanation"]
            problem.hints = spec["hints"]
            problem.examples = spec["examples"]
            problem.time_complexity = spec["time_complexity"]
            problem.space_complexity = spec["space_complexity"]
            problem.starter_code = spec["starter_code"]
            problem.function_signature = spec["function_signature"]
            problem.reference_solution = spec["reference_solution"]
            problem.is_active = True
            db.flush()

            db.execute(delete(ProblemTag).where(ProblemTag.problem_id == problem.id))
            for tag_slug in spec["tags"]:
                db.add(ProblemTag(problem_id=problem.id, tag_id=tag_ids[tag_slug]))

            db.execute(delete(TestCase).where(TestCase.problem_id == problem.id))
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

        categories, topics, lessons = seed_learning(db)
        db.commit()
        print(f"Seeded {len(PROBLEMS)} problems and {len(TAGS)} tags.")
        print(f"Seeded {categories} learning categories, {topics} topics, {lessons} lessons.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
