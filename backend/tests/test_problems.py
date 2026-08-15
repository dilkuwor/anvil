import uuid

from app.common.enums import Difficulty
from app.problems.models import Problem, Tag, TestCase


def _seed_problem(db, *, hidden: bool = True) -> Problem:
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
            "compare": "any_order",
        },
        hints=["use a map"],
        examples=[{"input": "x", "output": "y", "explanation": "z"}],
        is_active=True,
    )
    tag = Tag(id=uuid.uuid4(), name="Array", slug="array")
    problem.tags.append(tag)
    db.add(problem)
    db.add(
        TestCase(
            id=uuid.uuid4(),
            problem_id=problem.id,
            input="[2,7,11,15]\n9",
            expected_output="[0,1]",
            is_hidden=False,
            execution_order=1,
        )
    )
    db.add(
        TestCase(
            id=uuid.uuid4(),
            problem_id=problem.id,
            input="[1,2]\n3",
            expected_output="[0,1]",
            is_hidden=hidden,
            execution_order=2,
        )
    )
    db.commit()
    return problem


def test_problem_list_and_detail_hide_hidden_tests(auth_client, db):
    _seed_problem(db)
    listing = auth_client.get("/api/v1/problems")
    assert listing.status_code == 200
    payload = listing.json()
    assert payload["total"] == 1
    assert payload["items"][0]["title"] == "Pair Target"
    assert payload["items"][0]["status"] == "NOT_STARTED"

    detail = auth_client.get("/api/v1/problems/pair-target")
    assert detail.status_code == 200
    body = detail.json()
    assert body["slug"] == "pair-target"
    assert "reference_solution" not in body
    assert len(body["visible_tests"]) == 1
    assert body["visible_tests"][0]["input"] == "[2,7,11,15]\n9"


def test_problem_search_and_filter(auth_client, db):
    _seed_problem(db)
    found = auth_client.get("/api/v1/problems", params={"q": "pair"})
    assert found.json()["total"] == 1
    missing = auth_client.get("/api/v1/problems", params={"q": "zzz"})
    assert missing.json()["total"] == 0
    hard = auth_client.get("/api/v1/problems", params={"difficulty": "HARD"})
    assert hard.json()["total"] == 0
    tagged = auth_client.get("/api/v1/problems", params={"tag": "array"})
    assert tagged.json()["total"] == 1
