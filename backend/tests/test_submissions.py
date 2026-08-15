import uuid
from unittest.mock import patch

from app.common.enums import Difficulty
from app.execution.sandbox import SandboxResult
from app.problems.models import Problem, TestCase


def _seed(db) -> Problem:
    problem = Problem(
        id=uuid.uuid4(),
        title="Pair Target",
        slug="pair-target",
        description="Find two indices.",
        difficulty=Difficulty.EASY.value,
        starter_code="class Solution {}",
        function_signature={
            "method_name": "twoSum",
            "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}],
            "return_type": "int[]",
        },
        is_active=True,
    )
    db.add(problem)
    visible = TestCase(
        id=uuid.uuid4(),
        problem_id=problem.id,
        input="[1,2]\n3",
        expected_output="[0,1]",
        is_hidden=False,
        execution_order=1,
    )
    hidden = TestCase(
        id=uuid.uuid4(),
        problem_id=problem.id,
        input="[9,9]\n18",
        expected_output="[0,1]",
        is_hidden=True,
        execution_order=2,
    )
    db.add_all([visible, hidden])
    db.commit()
    return problem


def test_submit_records_history_and_progress(auth_client, db):
    problem = _seed(db)
    fake = SandboxResult(
        status="ACCEPTED",
        runtime_ms=12,
        memory_kb=1024,
        passed=2,
        total=2,
        compile_output=None,
        test_results=[
            {
                "id": str(problem.test_cases[0].id) if False else None,
            }
        ],
    )
    # Rebuild results with actual IDs after refresh
    db.refresh(problem)
    cases = sorted(problem.test_cases, key=lambda c: c.execution_order)
    fake.test_results = [
        {
            "id": str(cases[0].id),
            "status": "PASSED",
            "hidden": False,
            "input": cases[0].input,
            "expected_output": cases[0].expected_output,
            "actual_output": cases[0].expected_output,
            "runtime_ms": 5,
        },
        {
            "id": str(cases[1].id),
            "status": "PASSED",
            "hidden": True,
            "input": cases[1].input,
            "expected_output": cases[1].expected_output,
            "actual_output": cases[1].expected_output,
            "runtime_ms": 6,
        },
    ]

    with patch("app.execution.service.execute_java", return_value=fake):
        response = auth_client.post(
            f"/api/v1/problems/{problem.id}/submit",
            json={"source_code": "class Solution { public int[] twoSum(int[] n, int t){return new int[]{0,1};}}"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ACCEPTED"
    assert body["submission_id"]
    hidden = [item for item in body["test_results"] if item["hidden"]]
    assert hidden
    assert hidden[0]["input"] is None
    assert hidden[0]["expected_output"] is None

    history = auth_client.get("/api/v1/submissions", params={"problem_id": str(problem.id)})
    assert history.status_code == 200
    assert history.json()["total"] == 1

    progress = auth_client.get("/api/v1/progress")
    summary = progress.json()
    assert summary["total_solved"] == 1
    assert summary["easy_solved"] == 1
    assert summary["current_streak"] >= 1
    assert summary["total_problems"] == 1
    assert summary["easy_total"] == 1
    assert summary["problems_attempting"] == 0
    assert summary["today_solved"] == 1
    assert summary["recent_events"][0]["problem_title"] == "Pair Target"
    assert summary["recent_events"][0]["status"] == "SOLVED"

    detail = auth_client.get("/api/v1/problems/pair-target")
    assert detail.json()["status"] == "SOLVED"
