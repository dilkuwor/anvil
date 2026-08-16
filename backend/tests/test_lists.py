from uuid import UUID, uuid4

from app.problems.models import Problem, Tag
from app.progress.models import UserProblemProgress


def _seed_problem(db, *, title="Pair Target", slug="pair-target") -> Problem:
    problem = Problem(
        id=uuid4(),
        title=title,
        slug=slug,
        description="Find two numbers that add to target.",
        difficulty="EASY",
        constraints="",
        starter_code="class Solution {}",
        is_active=True,
    )
    problem.tags.append(Tag(id=uuid4(), name=f"Hash Map {slug}", slug=f"hash-map-{slug}"))
    db.add(problem)
    db.commit()
    return problem


def test_lists_require_auth(client):
    assert client.get("/api/v1/problem-lists").status_code == 401
    assert client.post("/api/v1/problem-lists", json={"name": "Prep"}).status_code == 401


def test_create_list_and_add_remove_problems(auth_client, db):
    first = _seed_problem(db)
    second = _seed_problem(db, title="Anagram Bundles", slug="anagram-bundles")

    created = auth_client.post(
        "/api/v1/problem-lists",
        json={"name": "  Microsoft Interview Prep  ", "description": "Focus set."},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Microsoft Interview Prep"
    assert body["problem_count"] == 0
    list_id = body["id"]

    duplicate = auth_client.post("/api/v1/problem-lists", json={"name": "microsoft interview prep"})
    assert duplicate.status_code == 409

    added = auth_client.post(
        f"/api/v1/problem-lists/{list_id}/problems",
        json={"problem_ids": [str(first.id), str(second.id), str(first.id)]},
    )
    assert added.status_code == 200
    assert added.json()["problem_count"] == 2
    assert {item["slug"] for item in added.json()["items"]} == {"pair-target", "anagram-bundles"}

    detail = auth_client.get(f"/api/v1/problem-lists/{list_id}")
    assert detail.status_code == 200
    assert detail.json()["remaining_count"] == 2

    removed = auth_client.delete(f"/api/v1/problem-lists/{list_id}/problems/{first.id}")
    assert removed.status_code == 200
    assert removed.json()["problem_count"] == 1
    assert db.get(Problem, first.id) is not None

    deleted = auth_client.delete(f"/api/v1/problem-lists/{list_id}")
    assert deleted.status_code == 204
    assert auth_client.get(f"/api/v1/problem-lists/{list_id}").status_code == 404


def test_list_progress_uses_global_solved_status(auth_client, db):
    problem = _seed_problem(db)
    created = auth_client.post("/api/v1/problem-lists", json={"name": "Sliding Window"}).json()
    auth_client.post(f"/api/v1/problem-lists/{created['id']}/problems", json={"problem_ids": [str(problem.id)]})
    me = auth_client.get("/api/v1/auth/me").json()
    db.add(
        UserProblemProgress(
            user_id=UUID(me["id"]),
            problem_id=problem.id,
            status="SOLVED",
        )
    )
    db.commit()

    detail = auth_client.get(f"/api/v1/problem-lists/{created['id']}").json()
    assert detail["solved_count"] == 1
    assert detail["remaining_count"] == 0
    assert detail["percent"] == 100
    assert detail["items"][0]["status"] == "SOLVED"


def test_user_cannot_access_another_users_list(auth_client, client, db):
    created = auth_client.post("/api/v1/problem-lists", json={"name": "Private"}).json()
    auth_client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "username": "otheruser", "password": "anvilpass"},
    )
    denied = client.get(f"/api/v1/problem-lists/{created['id']}")
    assert denied.status_code == 403
