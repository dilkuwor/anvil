from uuid import UUID, uuid4

from app.interviews.models import InterviewSession
from app.problems.models import Problem
from app.problems.seed_solutions import seed_solutions
from database.seeds.solutions import SOLUTIONS


def _problem(db, slug: str = "lc-3", title: str = "Longest Substring") -> Problem:
    problem = Problem(
        id=uuid4(),
        title=title,
        slug=slug,
        description="d",
        difficulty="MEDIUM",
        starter_code="class Solution {}",
        function_signature={"method_name": "lengthOfLongestSubstring"},
        reference_solution="SECRET_REFERENCE",
        is_active=True,
    )
    db.add(problem)
    db.commit()
    return problem


def test_solution_is_separate_from_the_problem_payload(client, db):
    _problem(db)
    _problem(db, slug="lc-340", title="At Most K Distinct")
    assert client.get("/api/v1/problems/lc-3").json()["has_solution"] is False
    assert client.get("/api/v1/problems/lc-3/solution").status_code == 404

    assert seed_solutions(db) == 1
    db.commit()
    assert seed_solutions(db) == 1  # safe to run again
    db.commit()

    detail = client.get("/api/v1/problems/lc-3").json()
    assert detail["has_solution"] is True
    assert "approaches" not in detail and "SECRET_REFERENCE" not in str(detail)

    body = client.get("/api/v1/problems/lc-3/solution").json()
    assert [item["position"] for item in body["approaches"]] == [0, 1, 2]
    assert [item["is_optimal"] for item in body["approaches"]] == [False, False, True]
    assert body["mistakes"][0]["name"] == "The Ghost Trap"
    assert body["walkthrough"]["columns"] and body["walkthrough"]["rows"]
    # Only related problems that exist are linked.
    assert [item["slug"] for item in body["related"]] == ["lc-340"]
    assert "SECRET_REFERENCE" not in str(body)


def test_solution_is_locked_during_a_mock_interview(auth_client, db):
    problem = _problem(db)
    seed_solutions(db)
    db.commit()
    assert auth_client.get("/api/v1/problems/lc-3/solution").status_code == 200

    user_id = UUID(auth_client.get("/api/v1/auth/me").json()["id"])
    session = InterviewSession(user_id=user_id, problem_id=problem.id, kind="CODING", phase="CODING", signals={})
    db.add(session)
    db.commit()
    locked = auth_client.get("/api/v1/problems/lc-3/solution")
    assert locked.status_code == 403
    assert "mock interview" in locked.json()["error"]["message"]


def test_every_seeded_solution_is_well_formed():
    for spec in SOLUTIONS:
        assert spec["slugs"] and spec["summary"] and spec["pattern"] and spec["trigger"]
        assert sum(1 for item in spec["approaches"] if item["is_optimal"]) == 1
        assert spec["approaches"][-1]["is_optimal"], "order approaches from the obvious way to the best one"
        for approach in spec["approaches"]:
            assert "class Solution" in approach["code"]
            assert approach["steps"] and approach["time_why"] and approach["space_why"]
        width = len(spec["walkthrough"]["columns"])
        assert all(len(row) == width for row in spec["walkthrough"]["rows"])
        assert 3 <= len(spec["interview_script"]) <= 6
