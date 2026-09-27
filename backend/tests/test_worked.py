import uuid

from app.problems import worked
from app.problems.models import Problem, ProblemSolution, ProblemSolutionApproach
from app.submissions.schemas import ExecutionResult

CODE = """class Solution {
    public int[] searchRange(int[] nums, int target) {
        int left = bound(nums, target);
        if (left == nums.length || nums[left] != target) return new int[] {-1, -1};
        int right = bound(nums, target + 1) - 1;
        return new int[] {left, right};
    }

    private int bound(int[] nums, int value) {
        int lo = 0, hi = nums.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < value) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}"""


def _seed(db) -> Problem:
    problem = Problem(
        id=uuid.uuid4(),
        title="Search Range",
        slug="search-range",
        description="Find the first and last position.",
        difficulty="MEDIUM",
        starter_code="class Solution {}",
        is_active=True,
    )
    db.add(problem)
    db.flush()
    solution = ProblemSolution(problem_id=problem.id, summary="Two lower bounds.", pattern="Binary search", trigger="Sorted.")
    db.add(solution)
    db.flush()
    db.add(
        ProblemSolutionApproach(
            solution_id=solution.id,
            position=0,
            name="Two bound searches",
            idea="Lower bound twice.",
            steps=["Lower-bound for target.", "Check it.", "Lower-bound for target + 1."],
            code=CODE,
            is_optimal=True,
        )
    )
    db.commit()
    return problem


def test_split_and_assemble_round_trip():
    split = worked.split_blocks(CODE)
    assert split.header == ["class Solution {"] and split.footer == ["}"]
    with_imports = worked.split_blocks("import java.util.*;\n\n" + CODE)
    assert with_imports.header == ["import java.util.*;", "", "class Solution {"]
    assert len(with_imports.blocks) == 2
    assert len(split.blocks) == 2
    assert split.blocks[1][0].strip().startswith("private int bound")
    assert worked.assemble(split, {}).strip() == CODE
    replaced = worked.assemble(split, {1: "    private int bound(int[] a, int v) { return 0; }"})
    assert "return 0;" in replaced and "searchRange" in replaced


def test_long_blocks_are_subdivided_at_shallow_lines():
    body = "\n".join(f"        int a{i} = {i};" for i in range(4))
    nested = "        for (int i = 0; i < 3; i++) {\n            a0 += i;\n        }"
    tail = "\n".join(f"        int b{i} = {i};" for i in range(6))
    code = f"class S {{\n    void f() {{\n{body}\n{nested}\n{tail}\n    }}\n}}"
    split = worked.split_blocks(code)
    assert len(split.blocks) >= 2
    assert sum(len(block) for block in split.blocks) == len(code.splitlines()) - 2


def test_worked_example_requires_auth(client):
    assert client.get("/api/v1/problems/search-range/worked-example").status_code == 401


def test_levels_unlock_when_the_sample_tests_pass(auth_client, db, monkeypatch):
    _seed(db)
    shown = auth_client.get("/api/v1/problems/search-range/worked-example").json()
    assert shown["approach"] == "Two bound searches"
    assert shown["total_levels"] == 2 and shown["levels_done"] == 0
    assert shown["header"] == "class Solution {" and len(shown["blocks"]) == 2
    assert shown["steps"][0] == "Lower-bound for target."

    captured: dict = {}

    def fake_run(db_, user, problem_id, source):
        captured["source"] = source
        return ExecutionResult(status=captured.get("status", "ACCEPTED"), passed=2, total=2)

    monkeypatch.setattr(worked, "run_code", fake_run)
    helper = "    private int bound(int[] nums, int value) { return 0; }"
    passed = auth_client.post(
        "/api/v1/problems/search-range/worked-example/check", json={"level": 1, "filled": [helper]}
    ).json()
    assert passed["passed"] is True and passed["levels_done"] == 1
    assert "return 0;" in captured["source"] and "searchRange" in captured["source"]

    captured["status"] = "WRONG_ANSWER"

    def failing_run(db_, user, problem_id, source):
        return ExecutionResult(status="WRONG_ANSWER", passed=1, total=2)

    monkeypatch.setattr(worked, "run_code", failing_run)
    failed = auth_client.post(
        "/api/v1/problems/search-range/worked-example/check",
        json={"level": 2, "filled": ["    public int[] searchRange(int[] n, int t) { return null; }", helper]},
    ).json()
    assert failed["passed"] is False and failed["levels_done"] == 1
    assert auth_client.get("/api/v1/problems/search-range/worked-example").json()["levels_done"] == 1

    bad = auth_client.post("/api/v1/problems/search-range/worked-example/check", json={"level": 3, "filled": ["a", "b", "c"]})
    assert bad.status_code == 400
    empty = auth_client.post("/api/v1/problems/search-range/worked-example/check", json={"level": 1, "filled": ["   "]})
    assert empty.status_code == 400
