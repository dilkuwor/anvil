"""Run every Java approach of the written solutions against the problem's own test cases.

    cd backend
    .venv/bin/python scripts/check_solutions.py                 # everything
    .venv/bin/python scripts/check_solutions.py --slug lc-3     # one problem
    .venv/bin/python scripts/check_solutions.py --file two_pointers

Uses the real judge harness (the same Main.java and runner the app uses), run locally with
javac/java — no Docker needed. Reads test cases from the database configured in backend/.env.

Rules:
- The approach marked ``is_optimal`` must pass EVERY test.
- Other approaches must never give a wrong answer. They may run out of time on the big
  tests (that is why they are the slow way), and that is reported but allowed.
Exit code 1 if anything fails.
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
for entry in (str(BACKEND), str(ROOT)):
    if entry not in sys.path:
        sys.path.insert(0, entry)

RUNNER = ROOT / "code-runner" / "java" / "runner" / "run.py"


def run_approach(problem, source: str) -> dict:
    from app.execution.harness import JAVA_HELPERS, LIST_NODE_JAVA, TREE_NODE_JAVA, generate_main
    from app.execution.imports import prepare_source

    signature = problem.function_signature or {}
    tests = sorted(problem.test_cases, key=lambda case: (case.execution_order, str(case.id)))
    with tempfile.TemporaryDirectory(prefix="solcheck-") as raw:
        work = Path(raw)
        (work / "Solution.java").write_text(prepare_source(source), encoding="utf-8")
        (work / "Main.java").write_text(generate_main(signature), encoding="utf-8")
        (work / "Helpers.java").write_text(JAVA_HELPERS, encoding="utf-8")
        (work / "ListNode.java").write_text(LIST_NODE_JAVA, encoding="utf-8")
        (work / "TreeNode.java").write_text(TREE_NODE_JAVA, encoding="utf-8")
        (work / "job.json").write_text(
            json.dumps(
                {
                    "timeout_ms": problem.time_limit_ms,
                    "memory_mb": 256,
                    "compare": signature.get("compare", "exact"),
                    "tests": [
                        {"id": str(case.id), "input": case.input, "expected": case.expected_output, "hidden": case.is_hidden}
                        for case in tests
                    ],
                }
            ),
            encoding="utf-8",
        )
        subprocess.run(
            [sys.executable, str(RUNNER)],
            cwd=work,
            env={**os.environ, "RUNNER_WORKSPACE": str(work)},
            check=False,
            timeout=300,
            capture_output=True,
        )
        result_path = work / "result.json"
        if not result_path.exists():
            return {"status": "INTERNAL_ERROR", "passed": 0, "total": len(tests), "test_results": []}
        return json.loads(result_path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--slug", action="append", help="only this problem slug (repeatable)")
    parser.add_argument("--file", help="only this topic file, e.g. two_pointers")
    args = parser.parse_args()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.common import models as _models  # noqa: F401
    from app.common.database import SessionLocal
    from app.problems.models import Problem

    if args.file:
        specs = importlib.import_module(f"database.seeds.solutions.{args.file}").SOLUTIONS
    else:
        from database.seeds.solutions import SOLUTIONS as specs

    db = SessionLocal()
    failures = 0
    checked = 0
    try:
        for spec in specs:
            if args.slug and not set(args.slug) & set(spec["slugs"]):
                continue
            problem = None
            for slug in spec["slugs"]:
                problem = db.scalar(
                    select(Problem).options(selectinload(Problem.test_cases)).where(Problem.slug == slug)
                )
                if problem is not None:
                    break
            if problem is None:
                print(f"FAIL {spec['slugs']}: no such problem in the database")
                failures += 1
                continue
            known = set(db.scalars(select(Problem.slug).where(Problem.slug.in_(spec["related_slugs"]))).all())
            for missing in [slug for slug in spec["related_slugs"] if slug not in known]:
                print(f"FAIL {problem.slug}: related problem '{missing}' does not exist")
                failures += 1
            for approach in spec["approaches"]:
                checked += 1
                result = run_approach(problem, approach["code"])
                statuses = [item.get("status") for item in result.get("test_results", [])]
                wrong = [s for s in statuses if s not in ("PASSED", "TIME_LIMIT_EXCEEDED")]
                slow = statuses.count("TIME_LIMIT_EXCEEDED")
                label = f"{problem.slug} · {approach['name']}"
                if result.get("status") == "COMPILATION_ERROR":
                    print(f"FAIL {label}: does not compile\n{(result.get('compile_output') or '')[:600]}")
                    failures += 1
                elif not statuses or wrong:
                    print(f"FAIL {label}: {result.get('status')} ({result.get('passed')}/{result.get('total')}) {sorted(set(wrong))}")
                    failures += 1
                elif slow and approach.get("is_optimal"):
                    print(f"FAIL {label}: the best approach timed out on {slow} test(s)")
                    failures += 1
                elif slow:
                    print(f"ok   {label}: correct, too slow on {slow} big test(s) (allowed for a slow way)")
                else:
                    print(f"ok   {label}: {result.get('passed')}/{result.get('total')}")
    finally:
        db.close()
    print(f"\n{checked} approach(es) checked, {failures} failure(s).")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
