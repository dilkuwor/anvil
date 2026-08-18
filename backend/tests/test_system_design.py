from app.interviews import service
from app.interviews.architecture import architecture_quality, normalize_architecture, summarize_architecture
from app.interviews.scenarios import get_scenario, list_scenarios


def test_scenarios_are_public(client):
    response = client.get("/api/v1/interviews/scenarios")
    assert response.status_code == 200
    items = response.json()
    slugs = [item["slug"] for item in items]
    assert len(slugs) == len(set(slugs))
    assert "url-shortener" in slugs
    assert "twitter-feed" in slugs
    assert "autocomplete" in slugs
    url = next(item for item in items if item["slug"] == "url-shortener")
    assert url["learn_slug"] == "sd-url-shortener"
    assert url["sample_slug"] == "url-shortener"
    assert url["workload"]["dau"] == 20_000_000
    assert url["sample"]["slug"] == "url-shortener"
    assert [node["type"] for node in url["sample"]["nodes"]] == [
        "client",
        "dns",
        "rate_limiter",
        "load_balancer",
        "api_server",
        "redis",
        "postgresql",
        "kafka",
    ]
    assert len(url["sample"]["edges"]) == 7
    assert "interviewer_notes" not in url
    missing = [item["slug"] for item in items if not item.get("sample")]
    assert missing == []
    for item in items:
        sample = item["sample"]
        assert sample["slug"] == item["slug"]
        assert any(node["type"] == "client" for node in sample["nodes"])
        assert sample["edges"]


def test_unknown_scenario_is_404(client):
    response = client.get("/api/v1/interviews/scenarios/not-a-real-design")
    assert response.status_code == 404


def test_system_design_requires_auth(client):
    response = client.post("/api/v1/interviews/system-design", json={"scenario_slug": "url-shortener"})
    assert response.status_code == 401


def test_system_design_start_message_architecture_end(auth_client, monkeypatch):
    monkeypatch.setattr(
        service.ollama,
        "interviewer_reply",
        lambda *args, **kwargs: "Let's keep going. What would you do next?",
    )
    monkeypatch.setattr(
        "app.interviews.agent.MockInterviewAgent.respond",
        lambda self, context, tools=None: _fake_turn(context),
    )
    monkeypatch.setattr(
        "app.interviews.agent.MockInterviewAgent.evaluate",
        lambda *args, **kwargs: {
            "understanding": 8,
            "approach": 8,
            "coding": 7,
            "communication": 8,
            "reasoning": 7,
            "complexity": 7,
            "follow_up": 7,
            "strengths": ["Clarified the write path."],
            "improvements": ["Add a cache on reads."],
            "summary": "Clear high-level design with room to scale reads.",
        },
    )

    started = auth_client.post("/api/v1/interviews/system-design", json={"scenario_slug": "url-shortener"})
    assert started.status_code == 200
    body = started.json()
    assert body["kind"] == "SYSTEM_DESIGN"
    assert body["phase"] == "REQUIREMENTS"
    assert body["phase_label"] == "Requirements"
    assert body["problem_id"] is None
    assert body["scenario"]["slug"] == "url-shortener"
    assert "system design problem" in body["messages"][0]["content"]
    assert "bit.ly" not in body["messages"][0]["content"]
    session_id = body["id"]

    again = auth_client.post("/api/v1/interviews/system-design", json={"scenario_slug": "url-shortener"})
    assert again.json()["id"] == session_id

    ready = auth_client.post(f"/api/v1/interviews/{session_id}/messages", json={"content": "I'm ready."})
    assert ready.status_code == 200
    assert ready.json()["phase"] == "REQUIREMENTS"
    assert "requirements" in ready.json()["messages"][-1]["content"].lower()

    clarifying = auth_client.post(
        f"/api/v1/interviews/{session_id}/messages",
        json={"content": "Users create short links and we redirect reads. Analytics can lag."},
    )
    assert clarifying.status_code == 200
    assert clarifying.json()["phase"] == "CAPACITY"

    capacity = auth_client.post(
        f"/api/v1/interviews/{session_id}/messages",
        json={"content": "About 40 writes per second and 400 reads per second, 5 years of storage."},
    )
    assert capacity.json()["phase"] == "HIGH_LEVEL"

    saved = auth_client.put(
        f"/api/v1/interviews/{session_id}/architecture",
        json={
            "architecture": {
                "nodes": [
                    {"id": "c1", "type": "client", "label": "Browser", "x": 20, "y": 40},
                    {"id": "a1", "type": "api", "label": "API", "x": 180, "y": 40},
                    {"id": "s1", "type": "service", "label": "Redirect", "x": 340, "y": 40},
                    {"id": "d1", "type": "database", "label": "Links", "x": 500, "y": 40},
                    {"id": "k1", "type": "cache", "label": "Redis", "x": 340, "y": 180},
                ],
                "edges": [
                    {"id": "e1", "from": "c1", "to": "a1"},
                    {"id": "e2", "from": "a1", "to": "s1"},
                    {"id": "e3", "from": "s1", "to": "d1"},
                    {"id": "e4", "from": "s1", "to": "k1"},
                ],
            }
        },
    )
    assert saved.status_code == 200
    assert len(saved.json()["architecture"]["nodes"]) == 5

    high_level = auth_client.post(
        f"/api/v1/interviews/{session_id}/messages",
        json={"content": "Client hits the API, then a redirect service, Postgres, and Redis for hot codes."},
    )
    assert high_level.json()["phase"] == "HIGH_LEVEL"

    high_level_2 = auth_client.post(
        f"/api/v1/interviews/{session_id}/messages",
        json={"content": "Writes go to the database first, then we populate the cache."},
    )
    assert high_level_2.json()["phase"] == "DEEP_DIVE"

    ended = auth_client.post(f"/api/v1/interviews/{session_id}/end")
    assert ended.status_code == 200
    payload = ended.json()
    assert payload["completed"] is True
    assert payload["phase"] == "FEEDBACK"
    assert payload["feedback"]["overall"] > 0
    assert payload["feedback"]["scores"]["correctness"] >= 6


def test_architecture_normalization_and_summary():
    graph = normalize_architecture(
        {
            "nodes": [
                {"id": "a", "type": "api", "label": "Gateway", "x": 10, "y": 10},
                {"id": "b", "type": "database", "label": "DB", "x": 80, "y": 10},
                {"id": "bad", "type": "spaceship", "label": "Nope", "x": 0, "y": 0},
            ],
            "edges": [{"id": "e1", "from": "a", "to": "b"}, {"id": "e2", "from": "a", "to": "missing"}],
        }
    )
    assert [node["type"] for node in graph["nodes"]] == ["api", "database"]
    assert graph["edges"] == [{"id": "e1", "from": "a", "to": "b"}]
    summary = summarize_architecture(graph)
    assert "Gateway" in summary
    assert "cache" in summary
    assert architecture_quality(graph) >= 4


def test_catalog_has_interviewer_notes_only_internally():
    scenario = get_scenario("url-shortener")
    assert scenario["interviewer_notes"]
    assert all("interviewer_notes" not in item for item in list_scenarios())


class _Turn:
    def __init__(self, context):
        self.reply = context.fallback
        self.signal_updates = {}
        self.signals = context.signals
        self.focus = None
        self.used_fallback = True
        self.service_will_advance = False


def _fake_turn(context):
    return _Turn(context)
