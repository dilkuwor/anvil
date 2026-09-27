import uuid
from datetime import date

from sqlalchemy import select

from app.problems.models import Problem, ProblemSolution
from app.study import patterns
from app.study.models import ReviewCard

PATTERNS = [
    "Sliding window, at most k zeros",
    "Two pointers on a sorted row",
    "Binary search on the answer",
    "Hash map of seen values",
    "Monotonic stack",
    "Heap / top K",
    "Tree DFS",
    "Multi-source BFS",
    "1-D DP",
    "Backtracking",
    "Union find",
    "Greedy: earliest end",
]


def _seed_problems(db) -> list[Problem]:
    rows = []
    for index, pattern in enumerate(PATTERNS):
        problem = Problem(
            id=uuid.uuid4(),
            title=f"Problem {index}",
            slug=f"drill-{index}",
            description=f"Statement number {index} with enough words to make a sentence.",
            difficulty="EASY",
            starter_code="class Solution {}",
            examples=[{"input": "[1,2]", "output": "3"}],
            is_active=True,
        )
        db.add(problem)
        db.flush()
        db.add(
            ProblemSolution(
                problem_id=problem.id,
                summary=f"Key idea {index}.",
                pattern=pattern,
                trigger=f"When you see {index}.",
            )
        )
        rows.append(problem)
    db.commit()
    return rows


def test_every_seeded_pattern_maps_to_a_family():
    for pattern in PATTERNS:
        assert patterns.family_for(pattern) in patterns.FAMILY_NAMES, pattern
    assert patterns.family_for("Sliding window, at most k zeros") == "Sliding window"
    assert patterns.family_for("Binary search tree") == "Tree DFS"
    assert patterns.family_for("Design: LRU cache") == "Design"
    assert patterns.family_for("Fast and slow pointers") == "Fast and slow pointers"


def test_options_are_stable_and_include_the_answer():
    first = patterns.options_for("two-sum", "Hash map / set")
    assert first == patterns.options_for("two-sum", "Hash map / set")
    assert len(first) == 4 and len(set(first)) == 4
    assert "Hash map / set" in first


def test_drill_requires_auth(client):
    assert client.get("/api/v1/study/drill/patterns").status_code == 401


def test_drill_serves_ten_then_schedules_cards(auth_client, db):
    _seed_problems(db)
    drill = auth_client.get("/api/v1/study/drill/patterns").json()
    assert len(drill["items"]) == 10
    assert drill["drilled_today"] == 0
    item = drill["items"][0]
    assert len(item["options"]) == 4 and "title" not in item
    assert item["example_input"] == "[1,2]"

    problem = db.scalar(select(Problem).where(Problem.id == uuid.UUID(item["problem_id"])))
    solution = db.scalar(select(ProblemSolution).where(ProblemSolution.problem_id == problem.id))
    family = patterns.family_for(solution.pattern)
    right = item["options"].index(family)
    wrong = (right + 1) % 4

    answer = auth_client.post(
        f"/api/v1/study/drill/patterns/{item['problem_id']}/answer", json={"choice": right, "confidence": "sure"}
    ).json()
    assert answer["correct"] is True and answer["correct_index"] == right
    assert answer["family"] == family and answer["title"] == problem.title
    assert answer["trigger"].startswith("When you see")
    card = db.scalar(select(ReviewCard).where(ReviewCard.kind == "PATTERN", ReviewCard.ref == problem.slug))
    assert card is not None and card.reviews == 1
    assert date.fromisoformat(answer["next_due_on"]) > date.today()

    second = drill["items"][1]
    miss = auth_client.post(
        f"/api/v1/study/drill/patterns/{second['problem_id']}/answer", json={"choice": wrong, "confidence": "sure"}
    ).json()
    if miss["correct"]:
        miss = auth_client.post(
            f"/api/v1/study/drill/patterns/{second['problem_id']}/answer",
            json={"choice": (wrong + 1) % 4, "confidence": "sure"},
        ).json()
    assert miss["correct"] is False
    assert auth_client.get("/api/v1/study/drill/patterns").json()["drilled_today"] == 2

    bad = auth_client.post(f"/api/v1/study/drill/patterns/{item['problem_id']}/answer", json={"choice": 9})
    assert bad.status_code == 404


def test_pattern_cards_come_back_in_review_and_today(auth_client, db):
    _seed_problems(db)
    drill = auth_client.get("/api/v1/study/drill/patterns").json()
    item = drill["items"][0]
    target = db.scalar(select(Problem).where(Problem.slug == item["slug"]))
    solution = db.scalar(select(ProblemSolution).where(ProblemSolution.problem_id == target.id))
    family = patterns.family_for(solution.pattern)
    auth_client.post(f"/api/v1/study/drill/patterns/{item['problem_id']}/answer", json={"choice": 0, "confidence": "unsure"})
    card = db.scalar(select(ReviewCard).where(ReviewCard.kind == "PATTERN", ReviewCard.ref == target.slug))
    card.due_on = date.today()
    db.commit()

    queue = auth_client.get("/api/v1/study/reviews").json()
    pattern_cards = [c for c in queue["cards"] if c["kind"] == "PATTERN"]
    assert len(pattern_cards) == 1
    shown = pattern_cards[0]
    assert shown["check_kind"] == "choice" and len(shown["options"]) == 4
    assert "Statement number" in shown["prompt"] and "[1,2]" in shown["prompt"]
    assert shown["href"] == f"/problems/{target.slug}"

    right = shown["options"].index(family)
    answered = auth_client.post(f"/api/v1/study/reviews/{shown['id']}/answer", json={"choice": right, "confidence": "sure"})
    assert answered.status_code == 200
    body = answered.json()
    assert body["correct"] is True and body["correct_index"] == right
    assert body["explanation"].startswith(f"{family}:")

    today = auth_client.get("/api/v1/study/today").json()
    drill_task = next(task for task in today["tasks"] if task["kind"] == "drill")
    assert drill_task["href"] == "/today/drill" and drill_task["done"] is False
