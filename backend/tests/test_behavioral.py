from app.interviews import behavioral
from app.interviews.signals import infer_signals


def _fake_turn(context):
    from app.interviews.agent import AgentTurn
    from app.interviews.signals import merge_signals, infer_signals as infer

    lifts = infer(context.last_candidate_text, kind="BEHAVIORAL")
    return AgentTurn(
        reply="What was your specific part in that?",
        signal_updates=lifts,
        signals=merge_signals(context.signals, lifts, "BEHAVIORAL"),
        focus=None,
        used_fallback=False,
        service_will_advance=False,
    )


def test_question_bank_and_tracks_are_public(client):
    questions = client.get("/api/v1/interviews/behavioral/questions")
    assert questions.status_code == 200
    body = questions.json()
    assert {item["competency"] for item in body} >= {"leadership", "conflict", "failure", "production-incident"}
    assert all(item["probes"] and item["looking_for"] and item["learn_slug"] for item in body)
    tracks = client.get("/api/v1/interviews/behavioral/tracks")
    assert tracks.status_code == 200
    slugs = {item["slug"] for item in tracks.json()}
    assert slugs == {"general", "leadership", "ownership"}
    for track in tracks.json():
        assert track["questions"][0] == "opener"
        assert len(track["questions"]) == 4


def test_behavioral_requires_auth(client):
    assert client.post("/api/v1/interviews/behavioral", json={"track": "general"}).status_code == 401


def test_unknown_track_is_404(auth_client):
    assert auth_client.post("/api/v1/interviews/behavioral", json={"track": "nope"}).status_code == 404


def test_behavioral_story_probe_next_closing_feedback(auth_client, monkeypatch):
    monkeypatch.setattr("app.interviews.agent.MockInterviewAgent.respond", lambda self, context, tools=None: _fake_turn(context))
    monkeypatch.setattr(
        "app.interviews.agent.MockInterviewAgent.evaluate",
        lambda *args, **kwargs: {
            "understanding": 8,
            "approach": 7,
            "coding": 8,
            "communication": 8,
            "reasoning": 6,
            "complexity": 7,
            "follow_up": 7,
            "strengths": ["Concrete numbers in the incident story."],
            "improvements": ["Add a lesson at the end of each story."],
            "summary": "Clear, owned stories with measurable results.",
        },
    )

    started = auth_client.post("/api/v1/interviews/behavioral", json={"track": "ownership"})
    assert started.status_code == 200
    body = started.json()
    assert body["kind"] == "BEHAVIORAL"
    assert body["phase"] == "QUESTION"
    assert body["phase_label"] == "Your Story"
    assert body["problem_title"] == "Ownership & Operations"
    assert body["scenario"]["track"] == "ownership"
    assert body["scenario"]["current"] == 0
    assert "tell me about yourself" in body["messages"][0]["content"].lower()
    session_id = body["id"]

    again = auth_client.post("/api/v1/interviews/behavioral", json={"track": "ownership"})
    assert again.json()["id"] == session_id
    active = auth_client.get("/api/v1/interviews/behavioral/active?track=ownership")
    assert active.json()["session"]["id"] == session_id

    story = (
        "Last year on my team we had checkout p99 double during a sale. I owned the incident: I flipped the flag, "
        "I traced it to a lock, and I shipped the fix. p99 went from 900ms to 300ms. Since then I added a gauge."
    )
    told = auth_client.post(f"/api/v1/interviews/{session_id}/messages", json={"content": story})
    assert told.status_code == 200
    assert told.json()["phase"] == "PROBE"
    assert told.json()["messages"][-1]["content"].endswith("?")

    probed = auth_client.post(f"/api/v1/interviews/{session_id}/messages", json={"content": "I owned the postmortem and the follow-up item."})
    assert probed.json()["phase"] == "QUESTION"
    assert probed.json()["scenario"]["current"] == 1
    assert "Next one." in probed.json()["messages"][-1]["content"]

    for _ in range(3):
        auth_client.post(f"/api/v1/interviews/{session_id}/messages", json={"content": story})
        moved = auth_client.post(f"/api/v1/interviews/{session_id}/messages", json={"content": "I did the rollout myself, 3 regions in 2 days."})
    assert moved.json()["phase"] == "CLOSING"
    assert "questions do you have" in moved.json()["messages"][-1]["content"].lower()

    hint = auth_client.post(f"/api/v1/interviews/{session_id}/hint")
    assert hint.status_code == 200
    assert "STAR" in hint.json()["messages"][-1]["content"]

    done = auth_client.post(f"/api/v1/interviews/{session_id}/messages", json={"content": "How does the team decide what to build next?"})
    assert done.status_code == 200
    final = done.json()
    assert final["completed"] is True
    assert final["phase"] == "FEEDBACK"
    feedback = final["feedback"]
    assert 1 <= feedback["overall"] <= 10
    assert feedback["objective"]["tests_total"] == 0
    assert feedback["summary"] == "Clear, owned stories with measurable results."
    assert feedback["strengths"][0] == "Concrete numbers in the incident story."

    closed = auth_client.post(f"/api/v1/interviews/{session_id}/messages", json={"content": "one more"})
    assert closed.status_code == 409


def test_behavioral_rejects_execution_events(auth_client, monkeypatch):
    monkeypatch.setattr("app.interviews.agent.MockInterviewAgent.respond", lambda self, context, tools=None: _fake_turn(context))
    started = auth_client.post("/api/v1/interviews/behavioral", json={"track": "general"}).json()
    response = auth_client.post(
        f"/api/v1/interviews/{started['id']}/events",
        json={"type": "RUN", "status": "ACCEPTED", "passed": 1, "total": 1, "runtime_ms": 1, "memory_kb": 1},
    )
    assert response.status_code == 400


def test_story_signals_reward_star_and_ownership():
    lifts = infer_signals(
        "Last year on my team the deploy failed. I rolled it back and I wrote the check. Latency went from 2s down to 200ms. Since then I review migrations first.",
        kind="BEHAVIORAL",
    )
    assert lifts["situation"] == "demonstrated"
    assert lifts["action"] == "demonstrated"
    assert lifts["result"] == "demonstrated"
    assert lifts["reflection"] == "demonstrated"
    merged = behavioral._merge_story_signals({}, "I led it, I measured it, I shipped it: 40% faster in 3 weeks.")
    assert merged["ownership"] == "demonstrated"
    assert merged["specificity"] == "demonstrated"
    team_only = behavioral._merge_story_signals({}, "We all worked on it and the team shipped it.")
    assert team_only["ownership"] == "missing"


def test_behavioral_notes_resolve_to_a_competency(auth_client):
    created = auth_client.post(
        "/api/v1/notes",
        json={"source_type": "BEHAVIORAL", "source_id": "production-incident", "body": "S: Sale day outage. T: On-call. A: Flag flip. R: p99 restored."},
    )
    assert created.status_code in (200, 201), created.text
    note = created.json()
    assert note["source_type"] == "BEHAVIORAL"
    assert note["source_title"].startswith("STAR story")
    assert note["source_href"].startswith("/behavioral")
