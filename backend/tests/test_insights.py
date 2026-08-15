from types import SimpleNamespace
from uuid import uuid4

from app.common.enums import Difficulty
from app.progress.insights import interview_readiness, recommend_problems, topic_progress


def _problem(title: str, difficulty: str, slugs: list[str]):
    tags = [SimpleNamespace(slug=slug, name=slug.title(), id=uuid4()) for slug in slugs]
    return SimpleNamespace(id=uuid4(), title=title, slug=title.lower(), difficulty=difficulty, tags=tags)


def test_topic_progress_groups_and_skips_empty_catalog_groups():
    easy = _problem("Pair", Difficulty.EASY.value, ["array", "hashmap"])
    rows = topic_progress([easy], {easy.id})
    names = {row["name"] for row in rows}
    assert "Arrays & Strings" in names
    assert "HashMap" in names
    assert "Graphs" not in names
    arrays = next(row for row in rows if row["name"] == "Arrays & Strings")
    assert arrays["solved"] == 1
    assert arrays["total"] == 1
    assert arrays["percent"] == 100


def test_recommend_prefers_easy_when_nothing_solved():
    easy = _problem("Easy One", Difficulty.EASY.value, ["array"])
    hard = _problem("Hard One", Difficulty.HARD.value, ["tree"])
    recs = recommend_problems(
        [hard, easy],
        status_by_id={},
        last_attempted={},
        solved_ids=set(),
        topics=topic_progress([hard, easy], set()),
        limit=2,
    )
    assert recs[0].title == "Easy One"


def test_readiness_none_when_no_work():
    assert (
        interview_readiness(
            total_solved=0,
            total_problems=15,
            easy_solved=0,
            easy_total=5,
            medium_solved=0,
            medium_total=7,
            hard_solved=0,
            hard_total=3,
            current_streak=0,
            accepted_submissions=0,
            total_submissions=0,
            topics=[],
        )
        is None
    )


def test_readiness_uses_available_signals():
    result = interview_readiness(
        total_solved=1,
        total_problems=15,
        easy_solved=1,
        easy_total=5,
        medium_solved=0,
        medium_total=7,
        hard_solved=0,
        hard_total=3,
        current_streak=1,
        accepted_submissions=1,
        total_submissions=1,
        topics=[{"name": "HashMap", "slug": "hashmap", "solved": 1, "total": 2, "percent": 50}],
    )
    assert result is not None
    assert 0 < result["overall"] < 100
    assert result["factors"]
    assert "not an interview score" in result["blurb"]
