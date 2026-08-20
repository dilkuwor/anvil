from uuid import UUID, uuid4

from sqlalchemy import select

from app.learn.models import LearningCategory, LearningLesson, LearningTopic
from app.notes.models import Note
from app.problems.models import Problem


def _seed_lesson(db) -> LearningLesson:
    category = LearningCategory(id=uuid4(), slug="dsa", title="DSA", description="", icon="binary")
    topic = LearningTopic(id=uuid4(), category=category, slug="arrays", title="Arrays", description="")
    lesson = LearningLesson(
        id=uuid4(),
        topic=topic,
        slug="arrays-in-interviews",
        title="Arrays in Interviews",
        short_description="Index math.",
        content="Body",
        is_published=True,
    )
    db.add_all([category, topic, lesson])
    db.commit()
    return lesson


def _seed_problem(db) -> Problem:
    problem = Problem(
        id=uuid4(),
        title="Pair Target",
        slug="pair-target",
        description="Find two indices.",
        difficulty="EASY",
        starter_code="class Solution {}",
        is_active=True,
    )
    db.add(problem)
    db.commit()
    return problem


def test_notes_require_auth(client):
    assert client.get("/api/v1/notes").status_code == 401
    assert client.post("/api/v1/notes", json={"source_type": "LESSON", "source_id": "x", "body": "hi"}).status_code == 401


def test_create_list_update_delete_lesson_note(auth_client, db):
    lesson = _seed_lesson(db)
    created = auth_client.post(
        "/api/v1/notes",
        json={"source_type": "LESSON", "source_id": str(lesson.id), "body": "Hash maps beat nested loops."},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["source_type"] == "LESSON"
    assert body["kind"] == "MANUAL"
    assert body["source_title"] == "Arrays in Interviews"
    assert "/learn/dsa/arrays/arrays-in-interviews" in body["source_href"]
    note_id = body["id"]

    listed = auth_client.get("/api/v1/notes", params={"source_type": "LESSON", "source_id": str(lesson.id)})
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    updated = auth_client.patch(f"/api/v1/notes/{note_id}", json={"title": "Hashing", "body": "Updated body."})
    assert updated.status_code == 200
    assert updated.json()["title"] == "Hashing"
    assert updated.json()["body"] == "Updated body."

    deleted = auth_client.delete(f"/api/v1/notes/{note_id}")
    assert deleted.status_code == 204
    assert auth_client.get("/api/v1/notes").json() == []


def test_problem_and_system_design_and_ai_note(auth_client, db):
    problem = _seed_problem(db)
    problem_note = auth_client.post(
        "/api/v1/notes",
        json={"source_type": "PROBLEM", "source_id": problem.slug, "body": "Two pointers from the ends."},
    )
    assert problem_note.status_code == 201
    assert problem_note.json()["source_href"] == "/problems/pair-target"

    design = auth_client.post(
        "/api/v1/notes",
        json={
            "source_type": "SYSTEM_DESIGN",
            "source_id": "url-shortener",
            "kind": "AI_RESPONSE",
            "body": "Cache the redirect path.",
        },
    )
    assert design.status_code == 201
    assert design.json()["kind"] == "AI_RESPONSE"
    assert "url-shortener" in design.json()["source_href"]

    all_notes = auth_client.get("/api/v1/notes").json()
    assert len(all_notes) == 2

    missing = auth_client.post(
        "/api/v1/notes",
        json={"source_type": "LESSON", "source_id": str(uuid4()), "body": "gone"},
    )
    assert missing.status_code == 404


def test_notes_are_user_scoped(auth_client, client, db):
    lesson = _seed_lesson(db)
    created = auth_client.post(
        "/api/v1/notes",
        json={"source_type": "LESSON", "source_id": str(lesson.id), "body": "Mine."},
    )
    note_id = created.json()["id"]
    other = client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "username": "other", "password": "anvilpass"},
    )
    assert other.status_code == 201
    listed = client.get("/api/v1/notes")
    assert listed.status_code == 200
    assert listed.json() == []
    assert client.delete(f"/api/v1/notes/{note_id}").status_code == 403
    assert db.scalar(select(Note).where(Note.id == UUID(note_id))) is not None
