from uuid import uuid4

from sqlalchemy import select

from app.learn.models import LearningLesson
from app.learn.seed import seed_learning
from app.problems.models import Problem


def _seed_catalog(db) -> tuple[Problem, LearningLesson]:
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
    db.flush()
    seed_learning(db)
    db.commit()
    lesson = db.scalar(select(LearningLesson).where(LearningLesson.slug == "hashmap-internals"))
    assert lesson is not None
    return problem, lesson


def test_learn_requires_auth(client):
    assert client.get("/api/v1/learn/categories").status_code == 401


def test_learn_catalog_progress_and_search(auth_client, db):
    _seed_catalog(db)

    categories = auth_client.get("/api/v1/learn/categories")
    assert categories.status_code == 200
    body = categories.json()
    slugs = {item["slug"] for item in body}
    assert slugs == {"dsa", "system-design", "java", "cs-fundamentals", "ood", "behavioral"}
    dsa = next(item for item in body if item["slug"] == "dsa")
    assert dsa["topic_count"] > 0
    assert dsa["lesson_count"] > 0
    assert dsa["completed_lessons"] == 0

    category = auth_client.get("/api/v1/learn/categories/dsa").json()
    assert category["title"] == "Data Structures & Algorithms"
    arrays = next(item for item in category["topics"] if item["slug"] == "arrays-hashing")
    assert arrays["lesson_count"] == 3
    assert arrays["status"] == "NOT_STARTED"

    topic = auth_client.get("/api/v1/learn/topics/arrays-hashing").json()
    assert topic["category_slug"] == "dsa"
    assert any(problem["slug"] == "pair-target" for problem in topic["related_problems"])

    lesson = auth_client.get("/api/v1/learn/lessons/hashmap-internals").json()
    assert lesson["status"] == "IN_PROGRESS"
    assert "HashMap" in lesson["content"]
    assert lesson["takeaways"]
    assert lesson["related_problems"][0]["slug"] == "pair-target"

    topic_after = auth_client.get("/api/v1/learn/topics/arrays-hashing").json()
    assert topic_after["status"] == "IN_PROGRESS"

    completed = auth_client.post(f"/api/v1/learn/lessons/{lesson['id']}/complete")
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"

    progress = auth_client.get("/api/v1/learn/progress").json()
    assert progress["completed_lessons"] == 1
    assert progress["percent"] > 0

    search = auth_client.get("/api/v1/learn/search", params={"q": "HashMap"})
    titles = {item["title"] for item in search.json()["items"]}
    assert "HashMap Internals" in titles
    assert "Pair Target" in titles

    roadmap = auth_client.get("/api/v1/learn/roadmap/arrays-hashing").json()
    assert roadmap["topic"]["slug"] == "arrays-hashing"
    assert roadmap["mock_problem_slug"] == "pair-target"
