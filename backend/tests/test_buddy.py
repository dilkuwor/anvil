import json
from uuid import uuid4

import pytest

from app.buddy import service
from app.learn.seed import seed_learning
from app.problems.models import Problem


def _seed_catalog(db) -> None:
    db.add(
        Problem(
            id=uuid4(),
            title="Pair Target",
            slug="pair-target",
            description="Find two indices that add up to the target.",
            difficulty="EASY",
            starter_code="class Solution {}",
            hints=["use a map"],
            examples=[{"input": "[2,7] 9", "output": "[0,1]", "explanation": "2 + 7"}],
            reference_solution="return new int[]{0, 1};",
            is_active=True,
        )
    )
    db.flush()
    seed_learning(db)
    db.commit()


class FakeProvider:
    name = "fake"

    def __init__(self, pieces=("Hello ", "there."), fail=False):
        self.pieces = pieces
        self.fail = fail
        self.calls: list[dict] = []

    def stream(self, system, transcript, user_turn, *, max_tokens=900):
        self.calls.append({"system": system, "transcript": transcript, "user_turn": user_turn})
        if self.fail:
            raise RuntimeError("An OpenAI API key is required. Add one in Settings.")
        yield from self.pieces


@pytest.fixture
def provider(monkeypatch):
    fake = FakeProvider()
    monkeypatch.setattr(service, "get_llm_provider_for_user", lambda user: fake)
    return fake


def events(response) -> list[dict]:
    return [json.loads(line[5:]) for line in response.text.splitlines() if line.startswith("data:")]


def test_buddy_requires_sign_in(client):
    assert client.get("/api/v1/buddy/threads").status_code == 401
    assert client.post("/api/v1/buddy/messages", json={"content": "hi"}).status_code == 401
    assert client.post("/api/v1/stt/transcribe", files={"file": ("a.webm", b"xx", "audio/webm")}).status_code == 401


def test_send_creates_thread_streams_and_saves(auth_client, provider):
    response = auth_client.post("/api/v1/buddy/messages", json={"content": "What is a quorum?"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    got = events(response)
    thread_id = got[0]["thread_id"]
    assert [item["delta"] for item in got if "delta" in item] == ["Hello ", "there."]
    assert got[-1]["done"] is True and got[-1]["thread_id"] == thread_id and got[-1]["partial"] is False

    threads = auth_client.get("/api/v1/buddy/threads").json()
    assert len(threads) == 1
    assert threads[0]["id"] == thread_id
    assert threads[0]["title"] == "What is a quorum?"
    assert threads[0]["context_kind"] == "general"
    assert threads[0]["message_count"] == 2
    assert threads[0]["preview"] == "Hello there."

    detail = auth_client.get(f"/api/v1/buddy/threads/{thread_id}").json()
    assert [(m["role"], m["content"]) for m in detail["messages"]] == [
        ("user", "What is a quorum?"),
        ("assistant", "Hello there."),
    ]
    assert got[-1]["message_id"] == detail["messages"][1]["id"]

    # A follow-up on the same thread carries the earlier turns as history.
    follow = auth_client.post("/api/v1/buddy/messages", json={"thread_id": thread_id, "content": "And a majority?"})
    assert events(follow)[0]["thread_id"] == thread_id
    assert provider.calls[1]["transcript"] == [
        {"role": "user", "content": "What is a quorum?"},
        {"role": "assistant", "content": "Hello there."},
    ]
    assert provider.calls[1]["user_turn"] == "And a majority?"
    assert auth_client.get("/api/v1/buddy/threads").json()[0]["message_count"] == 4


def test_lesson_context_goes_into_the_system_prompt(auth_client, provider, db):
    _seed_catalog(db)
    payload = {
        "content": "Why estimate first?",
        "context": {"kind": "lesson", "id": "capacity-estimation", "title": "Capacity Estimation"},
    }
    assert auth_client.post("/api/v1/buddy/messages", json=payload).status_code == 200
    system = provider.calls[0]["system"]
    assert "Lesson context:" in system
    assert "Capacity Estimation" in system
    assert "reading this lesson" in system

    threads = auth_client.get("/api/v1/buddy/threads", params={"context_kind": "lesson", "context_id": "capacity-estimation"}).json()
    assert len(threads) == 1 and threads[0]["context_title"] == "Capacity Estimation"
    assert auth_client.get("/api/v1/buddy/threads", params={"context_kind": "problem"}).json() == []


def test_problem_context_includes_statement_and_live_code(auth_client, provider, db):
    _seed_catalog(db)
    payload = {
        "content": "Is my loop right?",
        "context": {"kind": "problem", "id": "pair-target", "title": "Pair Target", "code": "int left = 0;"},
    }
    assert auth_client.post("/api/v1/buddy/messages", json=payload).status_code == 200
    system = provider.calls[0]["system"]
    assert "Problem context:" in system
    assert "Find two indices that add up to the target." in system
    assert "- use a map" in system
    assert "return new int[]{0, 1};" in system
    assert "int left = 0;" in system


def test_design_context_uses_the_scenario(auth_client, provider):
    payload = {"content": "Where do I start?", "context": {"kind": "design", "id": "url-shortener"}}
    assert auth_client.post("/api/v1/buddy/messages", json=payload).status_code == 200
    system = provider.calls[0]["system"]
    assert "Scenario context:" in system
    assert "Functional requirements" in system


def test_unknown_context_still_answers(auth_client, provider):
    payload = {"content": "hello", "context": {"kind": "lesson", "id": "no-such-lesson"}}
    response = auth_client.post("/api/v1/buddy/messages", json=payload)
    assert response.status_code == 200
    assert events(response)[-1]["done"] is True
    assert "Lesson context:" not in provider.calls[0]["system"]


def test_teach_mode_changes_the_instructions(auth_client, provider):
    payload = {"content": "A quorum is more than half the replicas.", "mode": "teach"}
    assert auth_client.post("/api/v1/buddy/messages", json=payload).status_code == 200
    call = provider.calls[0]
    assert "explain it back" in call["system"]
    assert call["user_turn"].startswith("The learner explains it back")


def test_provider_failure_reports_an_error_and_saves_nothing(auth_client, monkeypatch):
    fake = FakeProvider(fail=True)
    monkeypatch.setattr(service, "get_llm_provider_for_user", lambda user: fake)
    response = auth_client.post("/api/v1/buddy/messages", json={"content": "hi"})
    got = events(response)
    assert got[-1]["error"] == "An OpenAI API key is required. Add one in Settings."
    thread = auth_client.get("/api/v1/buddy/threads").json()[0]
    assert thread["message_count"] == 1


def test_delete_thread(auth_client, provider):
    response = auth_client.post("/api/v1/buddy/messages", json={"content": "hi"})
    thread_id = events(response)[0]["thread_id"]
    assert auth_client.delete(f"/api/v1/buddy/threads/{thread_id}").status_code == 204
    assert auth_client.get(f"/api/v1/buddy/threads/{thread_id}").status_code == 404
    assert auth_client.post("/api/v1/buddy/messages", json={"thread_id": thread_id, "content": "x"}).status_code == 404


def test_voice_turn_streams_without_saving(auth_client, provider, db):
    _seed_catalog(db)
    payload = {
        "content": "What is a quorum?",
        "history": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "Hello."}],
        "context": {"kind": "lesson", "id": "capacity-estimation", "title": "Capacity Estimation"},
    }
    response = auth_client.post("/api/v1/buddy/voice", json=payload)
    assert response.status_code == 200
    got = events(response)
    assert [item["delta"] for item in got if "delta" in item] == ["Hello ", "there."]
    assert got[-1] == {"done": True}
    call = provider.calls[0]
    assert "read aloud" in call["system"]
    assert "Lesson context:" in call["system"]
    assert call["user_turn"].startswith("What is a quorum?") and "under 120 words" in call["user_turn"]
    assert call["transcript"] == [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "Hello."}]
    assert auth_client.get("/api/v1/buddy/threads").json() == []


def test_voice_turn_reports_provider_failure(auth_client, monkeypatch):
    fake = FakeProvider(fail=True)
    monkeypatch.setattr(service, "get_llm_provider_for_user", lambda user: fake)
    response = auth_client.post("/api/v1/buddy/voice", json={"content": "hi"})
    assert events(response)[-1]["error"] == "An OpenAI API key is required. Add one in Settings."
