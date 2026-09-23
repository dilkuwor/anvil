"""Compare every "another way" approach with the recommended one on many inputs.

    cd backend
    .venv/bin/python scripts/fuzz_alternatives.py            # every problem that has an alternative
    .venv/bin/python scripts/fuzz_alternatives.py --slug lc-215 --cases 400

The judge only stores a handful of cases per problem, so an alternative can pass it and still be
wrong. This builds fresh inputs by MUTATING the problem's own test inputs — same shape, same rough
ranges, and any sortedness kept — then runs the best approach to get the expected answers and
replays them against each alternative. A disagreement is reported with the input that caused it.

Inputs are reshaped, not invented, so they stay inside the problem's constraints far more often than
random data would. A mismatch still has to be read by a human: it may be a real bug, or an input the
problem would never allow.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
for entry in (str(BACKEND), str(ROOT)):
    if entry not in sys.path:
        sys.path.insert(0, entry)

RUNNER = ROOT / "code-runner" / "java" / "runner" / "run.py"


def mutate(value: str, rng: random.Random) -> str:
    """Reshape one input value, keeping its type, size and ordering."""
    text = value.strip()
    if text.startswith('"') and text.endswith('"'):
        letters = sorted({ch for ch in text[1:-1]}) or ["a", "b"]
        return '"' + "".join(rng.choice(letters) for _ in text[1:-1]) + '"'
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return text
    if isinstance(data, bool) or data is None:
        return text
    if isinstance(data, int):
        return text  # k, target, capacity: changing these usually breaks a constraint
    if isinstance(data, list) and data and all(isinstance(x, int) for x in data):
        low, high = min(data), max(data)
        fresh = [rng.randint(low, high) for _ in data]
        if data == sorted(data):
            fresh.sort()
        return json.dumps(fresh, separators=(",", ""))
    if isinstance(data, list) and data and all(isinstance(x, list) for x in data):
        flat = [v for row in data for v in row if isinstance(v, int)]
        if not flat:
            return text
        low, high = min(flat), max(flat)
        rows = []
        for row in data:
            if len(row) == 2 and all(isinstance(v, int) for v in row) and row[0] <= row[1]:
                # Keep the pair's own shape: a strict start < end stays strict, so a problem that
                # forbids zero-length intervals never sees one.
                strict = row[0] < row[1]
                a = rng.randint(low, high - 1 if strict and high > low else high)
                rows.append([a, rng.randint(a + 1, high) if strict and a < high else a])
            else:
                rows.append([rng.randint(low, high) if isinstance(v, int) else v for v in row])
        return json.dumps(rows, separators=(",", ""))
    return text


def run(problem, source: str, tests: list[dict]) -> dict:
    from app.execution.harness import JAVA_HELPERS, LIST_NODE_JAVA, TREE_NODE_JAVA, generate_main
    from app.execution.imports import prepare_source

    signature = problem.function_signature or {}
    with tempfile.TemporaryDirectory(prefix="fuzz-") as raw:
        work = Path(raw)
        (work / "Solution.java").write_text(prepare_source(source), encoding="utf-8")
        (work / "Main.java").write_text(generate_main(signature), encoding="utf-8")
        (work / "Helpers.java").write_text(JAVA_HELPERS, encoding="utf-8")
        (work / "ListNode.java").write_text(LIST_NODE_JAVA, encoding="utf-8")
        (work / "TreeNode.java").write_text(TREE_NODE_JAVA, encoding="utf-8")
        (work / "job.json").write_text(
            json.dumps(
                {
                    "timeout_ms": max(problem.time_limit_ms, 4000),
                    "memory_mb": 256,
                    "compare": signature.get("compare", "exact"),
                    "tests": tests,
                }
            ),
            encoding="utf-8",
        )
        subprocess.run(
            [sys.executable, str(RUNNER)],
            cwd=work,
            env={**os.environ, "RUNNER_WORKSPACE": str(work)},
            check=False,
            timeout=900,
            capture_output=True,
        )
        path = work / "result.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"test_results": []}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--slug", action="append")
    parser.add_argument("--cases", type=int, default=150)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.common import models as _models  # noqa: F401
    from app.common.database import SessionLocal
    from app.problems.models import Problem

    from database.seeds.solutions import SOLUTIONS

    rng = random.Random(args.seed)
    db = SessionLocal()
    disagreements = 0
    checked = 0
    try:
        for spec in SOLUTIONS:
            alternatives = [a for a in spec["approaches"] if a.get("is_alternative")]
            if not alternatives:
                continue
            if args.slug and not set(args.slug) & set(spec["slugs"]):
                continue
            problem = None
            for slug in spec["slugs"]:
                problem = db.scalar(
                    select(Problem).options(selectinload(Problem.test_cases)).where(Problem.slug == slug)
                )
                if problem is not None:
                    break
            if problem is None or not problem.test_cases:
                continue
            seeds = [c.input for c in sorted(problem.test_cases, key=lambda c: c.execution_order)]
            inputs: list[str] = []
            while len(inputs) < args.cases:
                base = seeds[len(inputs) % len(seeds)]
                inputs.append("\n".join(mutate(line, rng) for line in base.split("\n")))

            best = [a for a in spec["approaches"] if a["is_optimal"]][0]
            probe = [{"id": str(uuid.uuid4()), "input": text, "expected": "?", "hidden": False} for text in inputs]
            expected = run(problem, best["code"], probe)
            rows = expected.get("test_results", [])
            usable = [
                {"id": r.get("id"), "input": t["input"], "expected": str(r.get("actual_output", "")), "hidden": False}
                for t, r in zip(probe, rows)
                if r.get("actual_output") not in (None, "")
            ]
            if not usable:
                print(f"skip {problem.slug}: the best approach produced no output to compare against")
                continue
            for alt in alternatives:
                checked += 1
                result = run(problem, alt["code"], usable)
                bad = [
                    (t, r)
                    for t, r in zip(usable, result.get("test_results", []))
                    if r.get("status") != "PASSED"
                ]
                label = f"{problem.slug} · {alt['name']}"
                if bad:
                    disagreements += 1
                    print(f"DIFFERS {label}: {len(bad)}/{len(usable)} inputs")
                    for t, r in bad[:3]:
                        print(f"    input {t['input']!r} -> best {t['expected']!r}, this {str(r.get('actual'))[:60]!r} [{r.get('status')}]")
                else:
                    print(f"agrees  {label}: {len(usable)} inputs")
    finally:
        db.close()
    print(f"\n{checked} alternative(s) fuzzed, {disagreements} disagreeing.")
    return 1 if disagreements else 0


if __name__ == "__main__":
    raise SystemExit(main())
