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


def test_learn_catalog_is_public(client, db):
    _seed_catalog(db)
    categories = client.get("/api/v1/learn/categories")
    assert categories.status_code == 200
    assert {item["slug"] for item in categories.json()} >= {"dsa", "system-design"}
    lesson = client.get("/api/v1/learn/lessons/hashmap-internals")
    assert lesson.status_code == 200
    assert lesson.json()["status"] == "NOT_STARTED"

    tree = client.get("/api/v1/learn/catalog")
    assert tree.status_code == 200
    slugs = {item["slug"] for item in tree.json()}
    assert "dsa" in slugs
    dsa = next(item for item in tree.json() if item["slug"] == "dsa")
    assert dsa["topics"]
    arrays = next(topic for topic in dsa["topics"] if topic["slug"] == "arrays-hashing")
    assert arrays["lessons"]


def test_learn_progress_requires_auth(client):
    assert client.get("/api/v1/learn/progress").status_code == 401
    assert client.post("/api/v1/learn/lessons/00000000-0000-0000-0000-000000000001/complete").status_code == 401
    assert client.post("/api/v1/learn/lessons/00000000-0000-0000-0000-000000000001/ask-ai", json={"question": "Explain this"}).status_code == 401


def test_learn_catalog_progress_and_search(auth_client, db):
    _seed_catalog(db)

    categories = auth_client.get("/api/v1/learn/categories")
    assert categories.status_code == 200
    body = categories.json()
    slugs = {item["slug"] for item in body}
    assert slugs == {"dsa", "system-design", "java", "cs-fundamentals", "ood", "behavioral", "ai-ml"}
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


def test_ai_category_is_additive(auth_client, db):
    _seed_catalog(db)
    ai = auth_client.get("/api/v1/learn/categories/ai-ml")
    assert ai.status_code == 200
    body = ai.json()
    assert body["title"] == "AI & Machine Learning"
    assert body["lesson_count"] >= 60
    assert body["lesson_count"] <= 80
    slugs = {topic["slug"] for topic in body["topics"]}
    assert "ai-rag" in slugs
    assert "ai-agents" in slugs
    assert "ai-context-tokens" in slugs
    assert "arrays-hashing" not in slugs

    dsa = auth_client.get("/api/v1/learn/categories/dsa").json()
    assert dsa["lesson_count"] == 81

    tokens = auth_client.get("/api/v1/learn/lessons/ai-token-counting-cost")
    assert tokens.status_code == 200
    lesson = tokens.json()
    assert lesson["status"] == "IN_PROGRESS"
    assert lesson["next"] is not None
    assert "20k" in lesson["content"].lower() or "20K" in lesson["content"]
    assert lesson["takeaways"]
    assert lesson["interview_questions"]

    search = auth_client.get("/api/v1/learn/search", params={"q": "KV cache"})
    titles = {item["title"] for item in search.json()["items"]}
    assert any("KV" in title or "Cache" in title for title in titles)

    agents = auth_client.get("/api/v1/learn/roadmap/ai-agents").json()
    assert agents["topic"]["slug"] == "ai-agents"


def test_learn_seed_is_idempotent(db):
    _seed_catalog(db)
    from app.learn.seed import seed_learning
    from app.learn.models import LearningCategory, LearningLesson, LearningTopic
    from sqlalchemy import func, select

    first = (
        db.scalar(select(func.count()).select_from(LearningCategory)),
        db.scalar(select(func.count()).select_from(LearningTopic)),
        db.scalar(select(func.count()).select_from(LearningLesson)),
    )
    seed_learning(db)
    db.commit()
    second = (
        db.scalar(select(func.count()).select_from(LearningCategory)),
        db.scalar(select(func.count()).select_from(LearningTopic)),
        db.scalar(select(func.count()).select_from(LearningLesson)),
    )
    assert first == second
    assert first[0] == 7
    assert first[2] == 314


def test_system_design_problems_topic(auth_client, db):
    _seed_catalog(db)
    category = auth_client.get("/api/v1/learn/categories/system-design").json()
    slugs = {topic["slug"] for topic in category["topics"]}
    assert "sd-design-problems" in slugs
    assert "capacity-estimation" in slugs
    assert "system-design-template" in slugs
    assert category["topics"][0]["slug"] == "system-design-template"

    template = auth_client.get("/api/v1/learn/lessons/system-design-template").json()
    assert template["title"] == "System Design Template"
    assert "ASK → SIZE → SHAPE → STRESS → SELL" in template["content"]
    assert template["takeaways"]
    assert template["interview_questions"]

    capacity = auth_client.get("/api/v1/learn/topics/capacity-estimation").json()
    assert capacity["lesson_count"] == 2
    capacity_titles = {lesson["title"] for lesson in capacity["lessons"]}
    assert "Capacity Estimation" in capacity_titles
    assert "Back-of-the-Envelope Estimation" in capacity_titles
    envelope = auth_client.get("/api/v1/learn/lessons/back-of-the-envelope-estimation").json()
    assert envelope["topic_slug"] == "capacity-estimation"
    assert "USS-B" in envelope["content"]
    assert "100M req/day ≈ 1K QPS" in envelope["content"]

    topic = auth_client.get("/api/v1/learn/topics/sd-design-problems").json()
    assert topic["category_slug"] == "system-design"
    assert topic["lesson_count"] == 17
    titles = {lesson["title"] for lesson in topic["lessons"]}
    assert "Design a URL Shortener" in titles
    assert "Design a News Feed (Twitter / X)" in titles
    assert "Design WhatsApp (Chat System)" in titles
    assert "Design a Payment System" in titles
    assert "Design a Ticket Booking System" in titles

    lesson = auth_client.get("/api/v1/learn/lessons/sd-url-shortener").json()
    assert lesson["status"] == "IN_PROGRESS"
    assert lesson["topic_slug"] == "sd-design-problems"
    assert "302" in lesson["content"] or "base62" in lesson["content"]
    # Case studies walk the full interview arc, not just an architecture sketch.
    for heading in ("## Step 1: Clarify the Requirements", "## Evolution Under Pressure", "## Interviewer Follow-ups"):
        assert heading in lesson["content"]
    assert lesson["takeaways"]
    assert lesson["interview_questions"]
    assert lesson["next"] is not None

    search = auth_client.get("/api/v1/learn/search", params={"q": "URL shortener"})
    found = {item["title"] for item in search.json()["items"]}
    assert "Design a URL Shortener" in found


def test_ask_ai_uses_topic_context(auth_client, db, monkeypatch):
    _seed_catalog(db)
    from app.learn import service

    monkeypatch.setattr(
        service.ollama,
        "tutor_reply",
        lambda system, user_turn: "Hash maps give expected O(1) lookup. Use them for complements and grouping.",
    )
    asked = auth_client.post("/api/v1/learn/topics/arrays-hashing/ask", json={})
    assert asked.status_code == 200
    assert "Hash maps" in asked.json()["answer"]

    follow = auth_client.post(
        "/api/v1/learn/topics/arrays-hashing/ask",
        json={"question": "When would I avoid a hash map?"},
    )
    assert follow.status_code == 200
    assert follow.json()["topic_slug"] == "arrays-hashing"

    missing = auth_client.post("/api/v1/learn/topics/does-not-exist/ask", json={})
    assert missing.status_code == 404


def test_ask_ai_on_lesson(auth_client, db, monkeypatch):
    _seed_catalog(db)
    from app.learn import service

    monkeypatch.setattr(
        service.ollama,
        "tutor_reply",
        lambda system, user_turn, conversation=None: "QPS is requests per second.",
    )
    asked = auth_client.post("/api/v1/learn/lessons/capacity-estimation/ask", json={})
    assert asked.status_code == 200
    assert "QPS" in asked.json()["answer"]
    assert asked.json()["lesson_slug"] == "capacity-estimation"


def test_lesson_ask_ai_uses_context_and_conversation(auth_client, db, monkeypatch):
    _seed_catalog(db)
    from app.learn import service

    captured: dict = {}

    def fake_tutor(system, user_turn, conversation=None):
        captured["system"] = system
        captured["user_turn"] = user_turn
        captured["conversation"] = conversation or []
        return "Peak is usually 2–3× average QPS."

    monkeypatch.setattr(service.ollama, "tutor_reply", fake_tutor)
    lesson = auth_client.get("/api/v1/learn/lessons/capacity-estimation").json()
    asked = auth_client.post(
        f"/api/v1/learn/lessons/{lesson['id']}/ask-ai",
        json={
            "question": "What are the tradeoffs?",
            "conversation": [
                {"role": "user", "content": "Explain this"},
                {"role": "assistant", "content": "Capacity estimation is back-of-the-envelope math."},
            ],
        },
    )
    assert asked.status_code == 200
    assert asked.json()["lesson_slug"] == "capacity-estimation"
    assert "Peak is usually" in asked.json()["answer"]
    assert "Capacity Estimation" in captured["system"]
    assert "System Design" in captured["system"]
    assert "Why it matters" in captured["system"]
    assert "InterviewAnvil AI interview tutor" in captured["system"]
    assert captured["conversation"][0]["content"] == "Explain this"
    assert "tradeoff" in captured["user_turn"].lower()


def test_lesson_ask_ai_quiz_intent_and_stream(auth_client, db, monkeypatch):
    _seed_catalog(db)
    from app.learn import service

    captured: dict = {}

    def fake_tutor(system, user_turn, conversation=None):
        captured["user_turn"] = user_turn
        return "Why do we estimate capacity before choosing the architecture?"

    def fake_stream(system, user_turn, conversation=None):
        captured["stream_turn"] = user_turn
        yield "Why do we "
        yield "perform capacity estimation?"

    monkeypatch.setattr(service.ollama, "tutor_reply", fake_tutor)
    monkeypatch.setattr(service.ollama, "tutor_reply_stream", fake_stream)

    lesson = auth_client.get("/api/v1/learn/lessons/capacity-estimation").json()
    quiz = auth_client.post(
        f"/api/v1/learn/lessons/{lesson['id']}/ask-ai",
        json={"question": "Quiz me on this topic."},
    )
    assert quiz.status_code == 200
    assert "quiz" in captured["user_turn"].lower()

    follow = auth_client.post(
        f"/api/v1/learn/lessons/{lesson['id']}/ask-ai",
        json={
            "question": "Because numbers justify whether one box is enough.",
            "conversation": [
                {"role": "user", "content": "Quiz me on Capacity Estimation."},
                {"role": "assistant", "content": "Why do we estimate capacity before choosing the architecture?"},
            ],
        },
    )
    assert follow.status_code == 200
    assert "evaluate" in captured["user_turn"].lower()

    streamed = auth_client.post(
        f"/api/v1/learn/lessons/{lesson['id']}/ask-ai?stream=true",
        json={"question": "Interview me"},
    )
    assert streamed.status_code == 200
    assert "text/event-stream" in streamed.headers["content-type"]
    assert "capacity estimation" in streamed.text.lower()
    assert "interview" in captured["stream_turn"].lower()


def test_lesson_ask_ai_errors(auth_client, db, monkeypatch):
    _seed_catalog(db)
    from app.learn import service
    from uuid import uuid4

    def boom(system, user_turn, conversation=None):
        raise RuntimeError("ollama down")

    monkeypatch.setattr(service.ollama, "tutor_reply", boom)
    lesson = auth_client.get("/api/v1/learn/lessons/capacity-estimation").json()
    failed = auth_client.post(
        f"/api/v1/learn/lessons/{lesson['id']}/ask-ai",
        json={"question": "Explain this"},
    )
    assert failed.status_code == 503
    assert "temporarily unavailable" in failed.json()["error"]["message"]

    missing = auth_client.post(
        f"/api/v1/learn/lessons/{uuid4()}/ask-ai",
        json={"question": "Explain this"},
    )
    assert missing.status_code == 404

    empty = auth_client.post(
        f"/api/v1/learn/lessons/{lesson['id']}/ask-ai",
        json={"question": ""},
    )
    assert empty.status_code == 422


def test_system_design_curriculum_depth(auth_client, db):
    """The System Design track is a structured course, not a glossary."""
    _seed_catalog(db)

    category = auth_client.get("/api/v1/learn/categories/system-design").json()
    assert category["lesson_count"] == 60
    slugs = [topic["slug"] for topic in category["topics"]]

    # Progression: method, foundations, building blocks, distributed systems,
    # production architecture, then case studies last.
    assert slugs[0] == "system-design-template"
    assert slugs[-1] == "sd-design-problems"
    for expected in (
        "networking-foundations",
        "microservices",
        "resilience-operations",
    ):
        assert expected in slugs, expected
    assert slugs.index("system-design-fundamentals") < slugs.index("caching")
    assert slugs.index("caching") < slugs.index("cap-theorem")
    assert slugs.index("cap-theorem") < slugs.index("sd-design-problems")

    # Concept lessons teach reasoning: trade-offs, failures, and follow-ups.
    caching = auth_client.get("/api/v1/learn/lessons/caching").json()
    for heading in (
        "## Why It Matters",
        "## How It Works",
        "## Trade-offs",
        "## Interviewer Follow-ups",
        "## Mini Design Exercise",
        "## Common Mistakes",
    ):
        assert heading in caching["content"], heading
    assert "cache-aside" in caching["content"].lower()
    assert "write-through" in caching["content"].lower()
    assert len(caching["content"]) > 6000

    # New building-block lessons exist and are attached to the right topics.
    stampede = auth_client.get("/api/v1/learn/lessons/sd-cache-invalidation").json()
    assert stampede["topic_slug"] == "caching"
    assert "stampede" in stampede["content"].lower()

    idempotency = auth_client.get("/api/v1/learn/lessons/sd-idempotency").json()
    assert idempotency["topic_slug"] == "distributed-systems"
    assert "idempotency" in idempotency["content"].lower()

    # Every published System Design lesson carries takeaways and questions.
    catalog = auth_client.get("/api/v1/learn/catalog").json()
    system_design = next(item for item in catalog if item["slug"] == "system-design")
    lesson_slugs = [lesson["slug"] for topic in system_design["topics"] for lesson in topic["lessons"]]
    assert len(lesson_slugs) == len(set(lesson_slugs))
    for slug in lesson_slugs:
        detail = auth_client.get(f"/api/v1/learn/lessons/{slug}").json()
        assert detail["takeaways"], slug
        assert detail["interview_questions"], slug
        assert "```" not in detail["content"], slug


def test_ood_curriculum_depth(auth_client, db):
    """The Object-Oriented Design track is an LLD course, not a pattern glossary."""
    _seed_catalog(db)

    category = auth_client.get("/api/v1/learn/categories/ood").json()
    assert category["lesson_count"] == 55
    slugs = [topic["slug"] for topic in category["topics"]]
    assert len(slugs) == 36

    # Progression: foundations, seams, patterns, architecture, method, then case studies.
    assert slugs[0] == "oop-fundamentals"
    assert slugs[-1] == "deck-of-cards"
    assert slugs.index("solid-principles") < slugs.index("factory-pattern")
    assert slugs.index("factory-pattern") < slugs.index("low-level-design")
    assert slugs.index("low-level-design") < slugs.index("parking-lot")

    # Gaps the original catalog never covered.
    for expected in (
        "class-relationships",
        "object-contracts",
        "adapter-facade-proxy",
        "state-pattern",
        "command-and-chain",
        "layering-and-repository",
        "concurrency-in-lld",
    ):
        assert expected in slugs, expected

    # Every original slug must survive: progress and deep links match on slug.
    for original in (
        "oop-fundamentals", "solid-principles", "composition-vs-inheritance", "interfaces",
        "dependency-injection", "factory-pattern", "strategy-pattern", "observer-pattern",
        "builder-pattern", "decorator-pattern", "low-level-design", "parking-lot",
        "vending-machine", "elevator", "library", "chess", "ood-rate-limiter",
    ):
        assert original in slugs, original
        lesson = auth_client.get(f"/api/v1/learn/lessons/{original}")
        assert lesson.status_code == 200, original

    # Concept lessons teach reasoning, with Java and interview follow-ups.
    solid = auth_client.get("/api/v1/learn/lessons/solid-principles").json()
    for heading in (
        "## Why It Matters",
        "## Mental Model",
        "## How It Works",
        "## Trade-offs",
        "## Interviewer Follow-up Questions",
        "## Common Mistakes",
        "## Mini Design Exercise",
    ):
        assert heading in solid["content"], heading
    assert "```java" in solid["content"]
    assert len(solid["content"]) > 5000

    # The concurrency follow-up every LLD interview reaches is covered.
    concurrency = auth_client.get("/api/v1/learn/lessons/concurrency-in-lld").json()
    assert concurrency["topic_slug"] == "concurrency-in-lld"
    assert "check-then-act" in concurrency["content"].lower()
    assert "deadlock" in concurrency["content"].lower()

    # Case studies show the design evolving under interviewer pressure.
    parking = auth_client.get("/api/v1/learn/lessons/parking-lot").json()
    assert "## Evolution Under Pressure" in parking["content"]
    assert "## Requirements & Scope" in parking["content"]
    assert len(parking["content"]) > 5000


def test_ood_lessons_render_cleanly():
    """Guard the renderer constraints the custom markdown component imposes."""
    from database.seeds.learn_ood import ood_topics

    for topic in ood_topics():
        for lesson in topic["lessons"]:
            content = lesson["content"]
            slug = lesson["slug"]
            assert content.count("```") % 2 == 0, f"{slug}: unbalanced code fence"
            for line in content.split("\n"):
                assert not line.startswith("  - "), f"{slug}: nested list item"
                assert not line.startswith("    - "), f"{slug}: nested list item"
            headings = [
                line[3:].strip().lower()
                for line in content.split("\n")
                if line.startswith("## ")
            ]
            assert len(headings) == len(set(headings)), f"{slug}: duplicate heading"
            for required in ("why it matters", "how it works", "trade-offs", "interview tip"):
                assert required in headings, f"{slug}: missing {required}"
            assert lesson["takeaways"], slug
            assert lesson["questions"], slug


def test_dsa_curriculum_depth(auth_client, db):
    """The DSA track is a structured FANG-interview course, not a glossary."""
    _seed_catalog(db)

    category = auth_client.get("/api/v1/learn/categories/dsa").json()
    assert category["lesson_count"] == 81
    slugs = [topic["slug"] for topic in category["topics"]]

    # Progression: method, complexity, data structures, techniques, then worked problems.
    assert slugs[0] == "coding-interview-method"
    assert slugs[1] == "big-o-complexity"
    assert slugs[-1] == "dsa-worked-problems"
    for expected in ("sorting", "advanced-graphs", "math-geometry", "data-structure-design", "coding-execution"):
        assert expected in slugs, expected
    assert slugs.index("arrays-hashing") < slugs.index("binary-search")
    assert slugs.index("binary-search") < slugs.index("dp-1d")
    assert slugs.index("dp-1d") < slugs.index("dsa-worked-problems")

    # Concept lessons teach reasoning, with runnable Java and interview follow-ups.
    window = auth_client.get("/api/v1/learn/lessons/fixed-and-variable-windows").json()
    for heading in (
        "## Why It Matters",
        "## Mental Model",
        "## How It Works",
        "## Trade-offs",
        "## Interviewer Follow-ups",
        "## Common Mistakes",
    ):
        assert heading in window["content"], heading
    assert "```java" in window["content"]
    assert len(window["content"]) > 5000

    # New topics exist and are attached to the right modules.
    on_answer = auth_client.get("/api/v1/learn/lessons/binary-search-on-answer").json()
    assert on_answer["topic_slug"] == "binary-search"
    assert "feasible" in on_answer["content"].lower()

    union_find = auth_client.get("/api/v1/learn/lessons/union-find").json()
    assert union_find["topic_slug"] == "advanced-graphs"

    # Worked problems follow the interview arc and link to practice problems.
    problems = auth_client.get("/api/v1/learn/topics/dsa-worked-problems").json()
    assert problems["lesson_count"] == 13
    two_sum = auth_client.get("/api/v1/learn/lessons/wp-two-sum").json()
    for heading in ("## Step 1: Clarify", "## Step 2: Brute Force", "## Interviewer Follow-ups"):
        assert heading in two_sum["content"], heading
    assert any(p["slug"] == "pair-target" for p in two_sum["related_problems"])

    # The roadmap nodes that previously had no lesson now resolve.
    for key in ("advanced-graphs", "math-geometry"):
        link = auth_client.get(f"/api/v1/learn/roadmap/{key}").json()
        assert link["topic"] is not None, key
        assert link["topic"]["slug"] == key

    # Every published DSA lesson carries takeaways, questions, and balanced code fences.
    catalog = auth_client.get("/api/v1/learn/catalog").json()
    dsa = next(item for item in catalog if item["slug"] == "dsa")
    lesson_slugs = [lesson["slug"] for topic in dsa["topics"] for lesson in topic["lessons"]]
    assert len(lesson_slugs) == len(set(lesson_slugs))
    for slug in lesson_slugs:
        detail = auth_client.get(f"/api/v1/learn/lessons/{slug}").json()
        assert detail["takeaways"], slug
        assert detail["interview_questions"], slug
        assert detail["content"].count("```") % 2 == 0, slug
