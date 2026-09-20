"""Shape and plain-language rules for the written solutions in database/seeds/solutions/.

These need no database. Java correctness is checked separately by scripts/check_solutions.py.
Fix the content, never the rule. See database/seeds/solutions/SOLUTION_GUIDE.md.
"""

import json
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from database.seeds.solutions import SOLUTIONS  # noqa: E402

STORIES = json.loads((ROOT / "database/seeds/solutions/_stories.json").read_text())
STORY_BY_SLUG = {slug: story for story in STORIES for slug in story["slugs"]}

# Words that talk over the reader's head. Text inside `backticks` is exempt.
JARGON = re.compile(r"\b(invariant|amorti[sz]ed|sentinel|trivial\w*|simply|naive|straightforward|w\.?l\.?o\.?g)\b", re.I)


def prose(text: str) -> str:
    return re.sub(r"`[^`]*`", "", text)


def sentences(text: str) -> int:
    return len(re.findall(r"[.!?](\s|$)", prose(text)))


def every_text(spec: dict):
    yield "summary", spec["summary"]
    yield "trigger", spec["trigger"]
    for approach in spec["approaches"]:
        for key in ("name", "idea", "time_why", "space_why", "when_to_use"):
            yield f"approach.{key}", approach[key]
        for step in approach["steps"]:
            yield "approach.step", step
    for item in spec["mistakes"]:
        yield "mistake.wrong", item["wrong"]
        yield "mistake.right", item["right"]
    for item in spec["edge_cases"]:
        yield "edge_case.why", item["why"]
    for line in spec["interview_script"]:
        yield "interview_script", line
    for item in spec["follow_ups"]:
        yield "follow_up.question", item["question"]
        yield "follow_up.answer", item["answer"]


def test_each_problem_is_written_once():
    slugs = [slug for spec in SOLUTIONS for slug in spec["slugs"]]
    repeated = sorted({slug for slug in slugs if slugs.count(slug) > 1})
    assert not repeated, f"written in more than one place: {repeated}"


@pytest.mark.parametrize("spec", SOLUTIONS, ids=lambda spec: spec["slugs"][0])
def test_solution_shape(spec):
    assert spec["slugs"] and spec["pattern"] and spec["trigger"]
    assert 40 <= len(spec["summary"]) <= 280 and sentences(spec["summary"]) <= 3

    approaches = spec["approaches"]
    assert 2 <= len(approaches) <= 3, "the slow way, the best way, and at most one real alternative"
    assert [item["is_optimal"] for item in approaches].count(True) == 1
    assert approaches[-1]["is_optimal"], "order approaches from the obvious way to the best one"
    assert len({item["name"] for item in approaches}) == len(approaches)
    for approach in approaches:
        assert "class Solution" in approach["code"], "a complete Java file, as the judge expects"
        assert 3 <= len(approach["steps"]) <= 6
        assert all(len(step) <= 170 for step in approach["steps"])
        assert re.match(r"^O\(.+\)", approach["time_complexity"]) and re.match(r"^O\(.+\)", approach["space_complexity"])
        assert approach["idea"] and approach["time_why"] and approach["space_why"] and approach["when_to_use"]

    walk = spec["walkthrough"]
    assert walk["input"] and walk["result"]
    assert 3 <= len(walk["columns"]) <= 7
    assert 3 <= len(walk["rows"]) <= 9, "pick a small example"
    assert all(len(row) == len(walk["columns"]) for row in walk["rows"])
    assert all(isinstance(cell, str) for row in walk["rows"] for cell in row)

    assert 2 <= len(spec["mistakes"]) <= 4
    assert all(item["name"] and item["wrong"] and item["right"] for item in spec["mistakes"])
    assert 3 <= len(spec["edge_cases"]) <= 6
    assert all(item["input"] and item["expected"] != "" and item["why"] for item in spec["edge_cases"])
    assert 4 <= len(spec["interview_script"]) <= 6
    assert 2 <= len(spec["follow_ups"]) <= 4
    assert 2 <= len(spec["related_slugs"]) <= 4
    assert not set(spec["related_slugs"]) & set(spec["slugs"])


@pytest.mark.parametrize("spec", SOLUTIONS, ids=lambda spec: spec["slugs"][0])
def test_solution_speaks_plainly(spec):
    for where, text in every_text(spec):
        assert len(text) <= 260, f"{where} is too long: {text}"
        assert sentences(text) <= 3, f"{where} has too many sentences: {text}"
        found = JARGON.search(prose(text))
        assert not found, f"{where} uses '{found.group(0)}': {text}"
        assert "!" not in prose(text), f"{where}: no exclamation marks: {text}"
    for line in spec["interview_script"]:
        assert re.search(r"\b(I|my|we)\b", line), f"the script is spoken in the first person: {line}"


@pytest.mark.parametrize("spec", SOLUTIONS, ids=lambda spec: spec["slugs"][0])
def test_solution_agrees_with_its_visual_story(spec):
    story = next((STORY_BY_SLUG[slug] for slug in spec["slugs"] if slug in STORY_BY_SLUG), None)
    if story is None:
        pytest.skip("no Visual Story for this problem")
    assert set(story["slugs"]) <= set(spec["slugs"]), f"also serve the story's other slugs: {story['slugs']}"
    assert spec["mistakes"][0]["name"] == story["trap"], "lead with the trap the story teaches, by the same name"
    best = spec["approaches"][-1]
    assert best["time_complexity"] == story["time"], f"story says {story['time']}"
