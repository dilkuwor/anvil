"""Check a ``database/seeds/recommended_*`` module before it is ever seeded.

    cd backend
    .venv/bin/python scripts/check_recommended.py recommended_01

Runs, with the local javac/java judge and the spec's OWN test cases (no database needed):
- every problem's reference_solution, which must pass every test;
- every approach in ``database/seeds/solutions/<same name>.py`` for those slugs: the optimal one
  must pass every test, the others may only be too slow, never wrong.
Exit code 1 if anything fails.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path
from types import SimpleNamespace

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
for entry in (str(BACKEND), str(ROOT)):
    if entry not in sys.path:
        sys.path.insert(0, entry)

from scripts.check_solutions import run_approach  # noqa: E402


def _problem(spec: dict) -> SimpleNamespace:
    tests = [
        SimpleNamespace(
            id=f"t{index}",
            execution_order=case.get("order", index),
            input=case["input"],
            expected_output=case["expected"],
            is_hidden=bool(case.get("hidden")),
        )
        for index, case in enumerate(spec["tests"], start=1)
    ]
    return SimpleNamespace(function_signature=spec["function_signature"], test_cases=tests, time_limit_ms=4000, slug=spec["slug"])


def _report(label: str, result: dict, *, optimal: bool) -> bool:
    statuses = [item.get("status") for item in result.get("test_results", [])]
    wrong = [s for s in statuses if s not in ("PASSED", "TIME_LIMIT_EXCEEDED")]
    slow = statuses.count("TIME_LIMIT_EXCEEDED")
    if result.get("status") == "COMPILATION_ERROR":
        print(f"FAIL {label}: does not compile\n{(result.get('compile_output') or '')[:800]}")
        return False
    if not statuses or wrong:
        print(f"FAIL {label}: {result.get('status')} ({result.get('passed')}/{result.get('total')}) {sorted(set(wrong))}")
        for item in result.get("test_results", []):
            if item.get("status") not in ("PASSED", "TIME_LIMIT_EXCEEDED"):
                print(f"     input={item.get('input')!r} expected={item.get('expected_output')!r} got={item.get('actual_output')!r} {item.get('error_message') or ''}"[:400])
        return False
    if slow and optimal:
        print(f"FAIL {label}: the best solution timed out on {slow} test(s)")
        return False
    print(f"ok   {label}: {result.get('passed')}/{result.get('total')}" + (f", too slow on {slow} (allowed)" if slow else ""))
    return True


def main() -> int:
    name = sys.argv[1] if len(sys.argv) > 1 else "recommended_01"
    specs = importlib.import_module(f"database.seeds.{name}").PROBLEMS
    try:
        solutions = importlib.import_module(f"database.seeds.solutions.{name}").SOLUTIONS
    except ModuleNotFoundError:
        solutions = []
        print(f"note: no database/seeds/solutions/{name}.py yet")
    by_slug = {spec["slug"]: spec for spec in specs}
    ok = True
    for spec in specs:
        if not spec.get("reference_solution", "").strip():
            print(f"FAIL {spec['slug']}: no reference_solution")
            ok = False
            continue
        ok &= _report(f"{spec['slug']} · reference", run_approach(_problem(spec), spec["reference_solution"]), optimal=True)
    for entry in solutions:
        spec = next((by_slug[s] for s in entry["slugs"] if s in by_slug), None)
        if spec is None:
            print(f"FAIL {entry['slugs']}: not in {name}")
            ok = False
            continue
        for approach in entry["approaches"]:
            ok &= _report(f"{spec['slug']} · {approach['name']}", run_approach(_problem(spec), approach["code"]), optimal=bool(approach.get("is_optimal")))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
