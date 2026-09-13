"""Structural guarantees for the whole problem catalog.

The expensive check - compiling every reference solution and running it against its own
test cases - lives in ``test_reference_solutions_compile_and_pass`` and is opt-in, because
it needs a JDK and takes a few minutes. Run it with::

    ANVIL_RUN_JAVA_CATALOG=1 python -m pytest tests/test_problem_catalog.py -k java

Everything else here runs on every commit and is cheap.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest
from sqlalchemy import func, select

from app.execution.harness import (
    JAVA_HELPERS,
    LIST_NODE_JAVA,
    TREE_NODE_JAVA,
    generate_main,
)
from app.problems.models import Problem, TestCase
from app.problems.seed_catalog import seed_problem_catalog
from database.seeds.catalog import PROBLEMS as CATALOG_PROBLEMS
from database.seeds.catalog import TAGS as CATALOG_TAGS
from database.seeds.catalog import validate_catalog
from database.seeds.problems import PROBLEMS as ORIGINAL_PROBLEMS

ALL_SPECS = [*ORIGINAL_PROBLEMS, *CATALOG_PROBLEMS]


def test_catalog_is_internally_consistent():
    validate_catalog()
    assert len(CATALOG_PROBLEMS) == 163
    assert len(ALL_SPECS) == 178
    slugs = [spec["slug"] for spec in ALL_SPECS]
    assert len(slugs) == len(set(slugs))


def test_catalog_covers_every_interview_category():
    """A FANG-ready catalog cannot be silently missing a whole topic."""
    tags = {spec["tag"] for spec in CATALOG_PROBLEMS}
    required = {
        "array", "string", "matrix", "two-pointers", "sliding-window", "binary-search",
        "stack", "heap", "linked-list", "tree", "trees-bst", "trie", "graph",
        "graphs-bfs-dfs", "union-find", "dynamic-programming", "backtracking", "greedy",
        "intervals", "bit-manipulation", "math", "design", "hashmap-frequency",
    }
    assert required <= tags, f"missing categories: {sorted(required - tags)}"
    counts: dict[str, int] = {}
    for spec in CATALOG_PROBLEMS:
        counts[spec["tag"]] = counts.get(spec["tag"], 0) + 1
    thin = {tag: count for tag, count in counts.items() if count < 2}
    assert not thin, f"categories with only one problem: {thin}"


def test_every_problem_is_study_ready():
    for spec in ALL_SPECS:
        where = spec["slug"]
        assert spec["description"].strip(), f"{where}: no description"
        assert spec["difficulty"] in {"EASY", "MEDIUM", "HARD"}, where
        assert spec["constraints"].strip(), f"{where}: no constraints"
        assert spec["input_format"].strip(), f"{where}: no input format"
        assert spec["output_format"].strip(), f"{where}: no output format"
        assert spec["examples"], f"{where}: no examples"
        assert len(spec["hints"]) >= 2, f"{where}: needs progressive hints"
        assert spec["time_complexity"].strip(), f"{where}: no time complexity"
        assert spec["space_complexity"].strip(), f"{where}: no space complexity"
        assert spec["starter_code"].strip(), f"{where}: no starter code"
        assert spec["reference_solution"].strip(), f"{where}: no reference solution"
        assert len(spec["tests"]) >= 2, f"{where}: needs more than one test case"
        assert len(spec["time_complexity"]) <= 100, f"{where}: time complexity too long"
        assert len(spec["space_complexity"]) <= 100, f"{where}: space complexity too long"


def test_every_signature_is_renderable_and_matched_by_its_solution():
    for spec in ALL_SPECS:
        signature = spec["function_signature"]
        main = generate_main(signature)
        assert f"sol.{signature['method_name']}(" in main, spec["slug"]
        solution = spec["reference_solution"]
        assert "class Solution" in solution, f"{spec['slug']}: solution has no Solution class"
        assert re.search(
            rf"\b{re.escape(signature['method_name'])}\s*\(", solution
        ), f"{spec['slug']}: solution does not declare {signature['method_name']}"
        assert "package " not in solution, f"{spec['slug']}: solution declares a package"


def test_test_cases_are_well_formed():
    for spec in ALL_SPECS:
        orders = [case["order"] for case in spec["tests"]]
        assert len(orders) == len(set(orders)), f"{spec['slug']}: duplicate test order"
        assert any(not case["hidden"] for case in spec["tests"]), (
            f"{spec['slug']}: every test is hidden, so the workspace shows none"
        )
        param_count = len(spec["function_signature"]["params"])
        for case in spec["tests"]:
            assert case["expected"].strip() != "" or case["expected"] == "", spec["slug"]
            lines = [line for line in case["input"].split("\n") if line.strip()]
            assert len(lines) <= param_count, (
                f"{spec['slug']}: test input has {len(lines)} lines for {param_count} params"
            )


def test_seeder_creates_the_catalog_and_is_idempotent(db):
    report = seed_problem_catalog(db)
    db.commit()
    assert report.created == len(CATALOG_PROBLEMS)
    assert report.updated == 0
    assert db.scalar(select(func.count()).select_from(Problem)) == len(CATALOG_PROBLEMS)
    assert db.scalar(
        select(func.count()).select_from(TestCase)
    ) == sum(len(spec["tests"]) for spec in CATALOG_PROBLEMS)

    again = seed_problem_catalog(db)
    db.commit()
    assert again.created == 0
    assert again.updated == 0
    assert again.tests_rewritten == 0
    assert again.unchanged == len(CATALOG_PROBLEMS)


def test_seeder_refreshes_stale_content_without_replacing_the_row(db):
    seed_problem_catalog(db)
    db.commit()
    problem = db.scalar(select(Problem).where(Problem.slug == "lc-1"))
    original_id = problem.id
    problem.reference_solution = ""
    problem.hints = []
    problem.time_complexity = ""
    db.commit()

    report = seed_problem_catalog(db)
    db.commit()
    assert report.updated == 1
    refreshed = db.scalar(select(Problem).where(Problem.slug == "lc-1"))
    assert refreshed.id == original_id
    assert refreshed.reference_solution.strip()
    assert len(refreshed.hints) >= 2
    assert refreshed.time_complexity


def test_every_tag_in_the_catalog_is_declared(db):
    declared = {slug for _, slug in CATALOG_TAGS}
    used = {spec["tag"] for spec in CATALOG_PROBLEMS}
    assert used <= declared


@pytest.mark.skipif(
    os.environ.get("ANVIL_RUN_JAVA_CATALOG") != "1" or shutil.which("javac") is None,
    reason="set ANVIL_RUN_JAVA_CATALOG=1 with a JDK on PATH to compile and run the catalog",
)
def test_reference_solutions_compile_and_pass_their_own_tests():
    failures: list[str] = []
    for spec in ALL_SPECS:
        with tempfile.TemporaryDirectory() as raw:
            work = Path(raw)
            (work / "Helpers.java").write_text(JAVA_HELPERS)
            (work / "ListNode.java").write_text(LIST_NODE_JAVA)
            (work / "TreeNode.java").write_text(TREE_NODE_JAVA)
            (work / "Main.java").write_text(generate_main(spec["function_signature"]))
            (work / "Solution.java").write_text(spec["reference_solution"])
            compiled = subprocess.run(
                ["javac", "-nowarn", "-d", ".", "Helpers.java", "ListNode.java",
                 "TreeNode.java", "Solution.java", "Main.java"],
                cwd=work, capture_output=True, text=True, timeout=180,
            )
            if compiled.returncode != 0:
                failures.append(f"{spec['slug']}: compile error {compiled.stderr[:200]}")
                continue
            compare = spec["function_signature"].get("compare", "exact")
            for index, case in enumerate(spec["tests"]):
                run = subprocess.run(
                    ["java", "-cp", ".", "Main"], cwd=work, input=case["input"],
                    capture_output=True, text=True, timeout=30,
                )
                if run.returncode != 0:
                    failures.append(f"{spec['slug']} test {index}: {run.stderr[:200]}")
                elif not _outputs_match(run.stdout, case["expected"], compare):
                    failures.append(
                        f"{spec['slug']} test {index}: expected {case['expected'][:60]!r}, "
                        f"got {run.stdout.strip()[:60]!r}"
                    )
    assert not failures, "\n".join(failures[:20])


def _outputs_match(actual: str, expected: str, compare: str) -> bool:
    left = actual.replace("\r", "").strip().replace(" ", "")
    right = expected.replace("\r", "").strip().replace(" ", "")
    if left == right:
        return True
    if compare != "any_order":
        return False
    return _top_level_tokens(left) == _top_level_tokens(right)


def _top_level_tokens(raw: str) -> list[str]:
    text = raw.strip()
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1]
    items: list[str] = []
    depth = 0
    quoted = False
    current: list[str] = []
    for index, char in enumerate(text):
        if char == '"' and (index == 0 or text[index - 1] != "\\"):
            quoted = not quoted
        if not quoted:
            if char in "[{":
                depth += 1
            elif char in "]}":
                depth -= 1
            elif char == "," and depth == 0:
                items.append("".join(current))
                current = []
                continue
        current.append(char)
    if current:
        items.append("".join(current))
    return sorted(items)


def test_every_seeder_writes_the_full_content_set(db):
    """Three code paths create Problem rows; all of them must write the study material.

    Two of them silently dropped reference_solution and the complexity targets, so problems
    created through the LoopTracker or Microsoft CLI showed an empty complexity line and had
    no solution to reveal.
    """
    from app.lists.seed_microsoft import _create_problem as create_microsoft
    from app.problems.seed_looptracker import _create_problem as create_looptracker
    from database.seeds.looptracker import PROBLEMS as LOOPTRACKER_SPECS
    from database.seeds.microsoft_interview import PROBLEMS as MICROSOFT_SPECS

    for create, specs, label in (
        (create_looptracker, LOOPTRACKER_SPECS, "looptracker"),
        (create_microsoft, MICROSOFT_SPECS, "microsoft"),
    ):
        spec = specs[0]
        db.query(Problem).filter(Problem.slug == spec["slug"]).delete()
        db.flush()
        problem = create(db, spec)
        db.flush()
        assert problem.reference_solution.strip(), f"{label} seeder dropped reference_solution"
        assert problem.time_complexity, f"{label} seeder dropped time_complexity"
        assert problem.space_complexity, f"{label} seeder dropped space_complexity"
        assert problem.hints, f"{label} seeder dropped hints"
        db.rollback()
