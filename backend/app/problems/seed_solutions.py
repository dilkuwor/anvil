"""Load the written solutions from ``database/seeds/solutions.py``. Safe to run again: it replaces per problem."""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from database.seeds.solutions import SOLUTIONS  # noqa: E402

from app.problems.models import Problem, ProblemSolution, ProblemSolutionApproach  # noqa: E402


def seed_solutions(db: Session, specs: list[dict] | None = None) -> int:
    count = 0
    for spec in specs if specs is not None else SOLUTIONS:
        for slug in spec["slugs"]:
            problem = db.scalar(select(Problem).where(Problem.slug == slug))
            if problem is None:
                continue
            solution = db.scalar(select(ProblemSolution).where(ProblemSolution.problem_id == problem.id))
            if solution is None:
                solution = ProblemSolution(id=uuid.uuid4(), problem_id=problem.id)
                db.add(solution)
            solution.summary = spec["summary"]
            solution.pattern = spec["pattern"]
            solution.trigger = spec["trigger"]
            solution.walkthrough = spec["walkthrough"]
            solution.mistakes = spec["mistakes"]
            solution.edge_cases = spec["edge_cases"]
            solution.interview_script = spec["interview_script"]
            solution.follow_ups = spec["follow_ups"]
            solution.related_slugs = spec["related_slugs"]
            solution.approaches.clear()
            db.flush()
            for position, approach in enumerate(spec["approaches"]):
                solution.approaches.append(
                    ProblemSolutionApproach(id=uuid.uuid4(), position=position, language="JAVA", **approach)
                )
            count += 1
    db.flush()
    return count


if __name__ == "__main__":
    from app.common import models as _models  # noqa: F401
    from app.common.database import SessionLocal

    session = SessionLocal()
    try:
        print(f"Seeded {seed_solutions(session)} problem solution(s).")
        session.commit()
    finally:
        session.close()
