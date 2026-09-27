from uuid import uuid4

from sqlalchemy import select

import app.interviews.providers as providers
from app.learn.models import LearningLesson
from app.learn.seed import seed_learning
from app.problems.models import Problem


class FakeProvider:
    name = "fake"

    def __init__(self, payload=None, fail=False):
        self.payload = payload
        self.fail = fail
        self.calls: list[tuple[str, str]] = []

    def complete_json(self, system, user_turn):
        self.calls.append((system, user_turn))
        if self.fail:
            raise RuntimeError("down")
        return self.payload


def _lesson(db) -> LearningLesson:
    db.add(Problem(id=uuid4(), title="Pair Target", slug="pair-target", description="x", difficulty="EASY", starter_code="c", is_active=True))
    db.flush()
    seed_learning(db)
    db.commit()
    lesson = db.scalar(select(LearningLesson).where(LearningLesson.slug == "capacity-estimation"))
    assert lesson is not None and lesson.takeaways
    return lesson


def test_recall_requires_auth(client):
    assert client.post(f"/api/v1/learn/lessons/{uuid4()}/recall", json={"text": "x"}).status_code == 401


def test_recall_ticks_covered_takeaways(auth_client, db, monkeypatch):
    lesson = _lesson(db)
    total = len(lesson.takeaways)
    fake = FakeProvider({"covered": [0], "missed": [1, 2, 3], "notes": {"0": "Got it."}, "feedback": "Strong start. Review the rest."})
    monkeypatch.setattr(providers, "get_llm_provider_for_user", lambda user: fake)
    response = auth_client.post(f"/api/v1/learn/lessons/{lesson.id}/recall", json={"text": "Estimate before you design."})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == total and body["covered"] == 1
    assert body["items"][0] == {"takeaway": lesson.takeaways[0], "covered": True, "note": "Got it."}
    assert all(item["covered"] is False for item in body["items"][1:])
    assert body["feedback"] == "Strong start. Review the rest."
    system, user_turn = fake.calls[0]
    assert "JSON" in system and lesson.title in user_turn and "Estimate before you design." in user_turn


def test_recall_reports_provider_failure(auth_client, db, monkeypatch):
    lesson = _lesson(db)
    monkeypatch.setattr(providers, "get_llm_provider_for_user", lambda user: FakeProvider(fail=True))
    response = auth_client.post(f"/api/v1/learn/lessons/{lesson.id}/recall", json={"text": "anything"})
    assert response.status_code == 503


def test_recall_accepts_the_object_list_shape(auth_client, db, monkeypatch):
    lesson = _lesson(db)
    fake = FakeProvider({"items": [{"index": "1", "covered": "true", "note": "Yes"}, 0], "feedback": "Fine."})
    monkeypatch.setattr(providers, "get_llm_provider_for_user", lambda user: fake)
    body = auth_client.post(f"/api/v1/learn/lessons/{lesson.id}/recall", json={"text": "x"}).json()
    assert body["covered"] == 2
    assert body["items"][0]["covered"] is True and body["items"][1]["covered"] is True
    assert body["items"][1]["note"] == "Yes"
