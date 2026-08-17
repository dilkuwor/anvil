from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from app.interviews import service
from app.interviews.service import build_opening_messages
from app.interviews.models import InterviewMessage, InterviewSession
from app.problems.models import Problem, Tag


def _seed_problem(db) -> Problem:
    problem = Problem(
        id=uuid4(),
        title="Anagram Bundles",
        slug="anagram-bundles",
        description="Group strings that are anagrams of each other.",
        difficulty="MEDIUM",
        constraints="1 <= strs.length <= 10^4",
        input_format="List of strings",
        output_format="Grouped lists",
        starter_code="class Solution {}",
        function_signature={"method_name": "groupAnagrams"},
        hints=["Think about how you could represent each group.", "What property do anagrams share?"],
        examples=[{"input": '["eat","tea"]', "output": '[["eat","tea"]]', "explanation": "same letters"}],
        reference_solution="SECRET_SOLUTION",
        is_active=True,
    )
    problem.tags.append(Tag(id=uuid4(), name="Hash Map", slug="hash-map"))
    db.add(problem)
    db.commit()
    return problem


def test_interview_requires_auth(client, db):
    problem = _seed_problem(db)
    response = client.post("/api/v1/interviews", json={"problem_id": str(problem.id)})
    assert response.status_code == 401


def test_start_message_run_submit_end_flow(auth_client, db, monkeypatch):
    problem = _seed_problem(db)
    monkeypatch.setattr(
        service.ollama,
        "interviewer_reply",
        lambda *args, **kwargs: "Let's keep going. What would you do next?",
    )
    monkeypatch.setattr(
        service.ollama,
        "evaluate_interview",
        lambda *args, **kwargs: {
            "understanding": 8,
            "approach": 9,
            "coding": 9,
            "communication": 8,
            "reasoning": 8,
            "complexity": 7,
            "follow_up": 8,
            "strengths": ["Explained the grouping key clearly."],
            "improvements": ["State complexity earlier."],
            "summary": "Clear reasoning and a correct solution.",
        },
    )

    started = auth_client.post("/api/v1/interviews", json={"problem_id": str(problem.id)})
    assert started.status_code == 200
    body = started.json()
    assert body["phase_label"] == "Understanding"
    assert body["remaining_seconds"] > 2600
    assert body["messages"][0]["role"] == "INTERVIEWER"
    assert "coding problem" in body["messages"][0]["content"]
    assert "let me know when you're ready" in body["messages"][0]["content"]
    assert len(body["messages"]) == 1
    assert "Group strings" not in body["messages"][0]["content"]
    session_id = body["id"]

    again = auth_client.post("/api/v1/interviews", json={"problem_id": str(problem.id)})
    assert again.json()["id"] == session_id

    ready = auth_client.post(
        f"/api/v1/interviews/{session_id}/messages",
        json={"content": "I'm ready."},
    )
    assert ready.status_code == 200
    assert ready.json()["phase"] == "UNDERSTANDING"
    assert ready.json()["messages"][-1]["content"] == (
        "Great. What questions do you have about the requirements or constraints?"
    )

    understanding = auth_client.post(
        f"/api/v1/interviews/{session_id}/messages",
        json={"content": "The input is a list of strings and we return the groups."},
    )
    assert understanding.status_code == 200
    assert understanding.json()["phase"] == "APPROACH"

    approach = auth_client.post(
        f"/api/v1/interviews/{session_id}/messages",
        json={"content": "I would sort each string and use that as a hash map key."},
    )
    assert approach.json()["phase"] == "CODING"

    run = auth_client.post(
        f"/api/v1/interviews/{session_id}/events",
        json={"type": "RUN", "status": "PASSED", "passed": 4, "total": 4, "runtime_ms": 12, "memory_kb": 1024},
    )
    assert run.json()["phase"] == "TESTING"
    assert run.json()["run_count"] == 1
    assert run.json()["last_run_passed"] == 4

    rejected = auth_client.post(
        f"/api/v1/interviews/{session_id}/events",
        json={"type": "SUBMIT", "status": "WRONG_ANSWER", "passed": 3, "total": 5, "runtime_ms": 15},
    )
    assert rejected.json()["phase"] == "CODING"
    assert rejected.json()["wrong_attempts"] == 1
    assert rejected.json()["accepted"] is False

    accepted = auth_client.post(
        f"/api/v1/interviews/{session_id}/events",
        json={"type": "SUBMIT", "status": "ACCEPTED", "passed": 5, "total": 5, "runtime_ms": 12, "memory_kb": 1024},
    )
    assert accepted.json()["phase"] == "FOLLOW_UP"
    assert accepted.json()["accepted"] is True

    follow = auth_client.post(
        f"/api/v1/interviews/{session_id}/messages",
        json={"content": "O(n k log k) time because I sort each string."},
    )
    assert follow.json()["phase"] == "FOLLOW_UP"

    ended = auth_client.post(f"/api/v1/interviews/{session_id}/end")
    assert ended.status_code == 200
    payload = ended.json()
    assert payload["completed"] is True
    assert payload["phase"] == "FEEDBACK"
    assert payload["feedback"]["scores"]["correctness"] == 10
    assert payload["feedback"]["objective"]["submission_accepted"] is True
    assert payload["feedback"]["overall"] > 7
    assert "correctness" in payload["feedback"]["scores"]


def test_hint_uses_problem_hints_and_tracks_count(auth_client, db, monkeypatch):
    problem = _seed_problem(db)
    monkeypatch.setattr(service.ollama, "interviewer_reply", lambda *args, **kwargs: "Explain the problem to me.")
    started = auth_client.post("/api/v1/interviews", json={"problem_id": str(problem.id)}).json()
    first = auth_client.post(f"/api/v1/interviews/{started['id']}/hint")
    assert first.status_code == 200
    assert first.json()["hints_used"] == 1
    assert "represent each group" in first.json()["messages"][-1]["content"]
    second = auth_client.post(f"/api/v1/interviews/{started['id']}/hint")
    assert "anagrams share" in second.json()["messages"][-1]["content"]
    assert second.json()["hints_used"] == 2


def test_problem_context_omits_secret_solution():
    problem = Problem(
        title="Secret",
        slug="secret",
        description="Public statement",
        difficulty="EASY",
        constraints="n <= 10",
        examples=[{"input": "1", "output": "1", "explanation": "ok"}],
        reference_solution="DO_NOT_LEAK",
    )
    context = service.build_problem_context(problem)
    assert "Public statement" in context
    assert "DO_NOT_LEAK" not in context
    assert "hidden" not in context.lower()
    opening = build_opening_messages(problem)
    assert len(opening) == 1
    assert "let me know when you're ready" in opening[0]
    assert "Public statement" not in opening[0]
    assert "DO_NOT_LEAK" not in opening[0]


def _seed_pair_target(db) -> Problem:
    problem = Problem(
        title="Pair Target",
        slug="pair-target",
        description="Find two numbers that add to target.",
        difficulty="EASY",
        constraints="2 <= nums.length <= 10^4",
        input_format="nums and target",
        output_format="two indices",
        starter_code="class Solution {}",
        function_signature={"method_name": "twoSum"},
        hints=["Use a HashMap."],
        examples=[{"input": "[2,7,11,15], 9", "output": "[0,1]", "explanation": "2+7"}],
        reference_solution="SECRET",
        is_active=True,
    )
    db.add(problem)
    db.commit()
    return problem


def test_problem_statement_is_not_returned_in_chat(auth_client, db, monkeypatch):
    problem = _seed_problem(db)
    monkeypatch.setattr(service.ollama, "interviewer_reply", lambda *args, **kwargs: "What would you try first?")
    started = auth_client.post("/api/v1/interviews", json={"problem_id": str(problem.id)}).json()
    session = db.get(InterviewSession, UUID(started["id"]))
    assert session is not None
    session.messages.append(
        InterviewMessage(
            session_id=session.id,
            role="INTERVIEWER",
            content=f"{problem.title}\n{problem.description}\n\nConstraints:\n{problem.constraints}",
        )
    )
    db.commit()
    detail = auth_client.get(f"/api/v1/interviews/{started['id']}").json()
    assert all("Constraints:" not in item["content"] or item["content"].split("\n", 1)[0] != problem.title for item in detail["messages"])
    assert all(not item["content"].startswith(problem.title + "\n") for item in detail["messages"])


def test_preview_interview_is_public_and_limited(client, db, monkeypatch):
    _seed_pair_target(db)
    monkeypatch.setattr(service.ollama, "interviewer_reply", lambda *args, **kwargs: "What would you try first?")

    started = client.post("/api/v1/interviews/preview")
    assert started.status_code == 200
    body = started.json()
    assert body["problem_slug"] == "pair-target"
    assert body["messages"][0]["role"] == "INTERVIEWER"
    session_id = body["id"]

    fetched = client.get(f"/api/v1/interviews/preview/{session_id}")
    assert fetched.status_code == 200

    for index in range(4):
        reply = client.post(
            f"/api/v1/interviews/preview/{session_id}/messages",
            json={"content": f"I would use a hash map on turn {index}."},
        )
        assert reply.status_code == 200

    blocked = client.post(
        f"/api/v1/interviews/preview/{session_id}/messages",
        json={"content": "One more thought."},
    )
    assert blocked.status_code == 401
    assert blocked.json()["error"]["code"] == "login_required"


def test_preview_interview_cannot_use_authed_routes(client, db, monkeypatch):
    _seed_pair_target(db)
    monkeypatch.setattr(service.ollama, "interviewer_reply", lambda *args, **kwargs: "Explain the problem.")
    session_id = client.post("/api/v1/interviews/preview").json()["id"]
    denied = client.get(f"/api/v1/interviews/{session_id}")
    assert denied.status_code == 401


def test_timer_uses_backend_start_time(auth_client, db, monkeypatch):
    problem = _seed_problem(db)
    monkeypatch.setattr(service.ollama, "interviewer_reply", lambda *args, **kwargs: "Let's begin.")
    monkeypatch.setattr(
        service.ollama,
        "evaluate_interview",
        lambda *args, **kwargs: {
            "understanding": 6,
            "approach": 6,
            "coding": 5,
            "communication": 6,
            "reasoning": 6,
            "complexity": 5,
            "follow_up": 5,
            "strengths": ["Showed up and engaged."],
            "improvements": ["Explain complexity."],
            "summary": "Time expired before a full solution.",
        },
    )
    body = auth_client.post("/api/v1/interviews", json={"problem_id": str(problem.id)}).json()
    session = db.get(InterviewSession, UUID(body["id"]))
    assert session is not None
    session.started_at = datetime.now(timezone.utc) - timedelta(seconds=session.duration_seconds + 5)
    db.commit()

    expired = auth_client.get(f"/api/v1/interviews/{body['id']}")
    assert expired.status_code == 200
    assert expired.json()["phase"] == "FEEDBACK"
    assert expired.json()["remaining_seconds"] == 0
    assert expired.json()["messages"][-1]["content"] == "Interview time has ended."
    assert expired.json()["feedback"] is not None


def test_cannot_read_another_users_interview(auth_client, client, db, monkeypatch):
    problem = _seed_problem(db)
    monkeypatch.setattr(service.ollama, "interviewer_reply", lambda *args, **kwargs: "Let's begin.")
    session_id = auth_client.post("/api/v1/interviews", json={"problem_id": str(problem.id)}).json()["id"]
    auth_client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "username": "otheruser", "password": "anvilpass"},
    )
    response = client.get(f"/api/v1/interviews/{session_id}")
    assert response.status_code == 403
