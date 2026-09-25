"""The Microsoft Interview list: the whole problem catalog, grouped by section.

Sections run in study order, from the basics to design. Inside a section, problems go from
Easy to Hard, keeping catalog order for ties. Every catalog tag must belong to a section, so a
problem added under a new tag cannot silently fall out of the list.
"""

from __future__ import annotations

from database.seeds.catalog import PROBLEMS as CATALOG_PROBLEMS
from database.seeds.catalog import TAGS as CATALOG_TAGS

LIST_NAME = "Microsoft Interview"
LIST_DESCRIPTION = (
    "Every coding problem in Anvil, grouped by section in study order: "
    "arrays and strings first, design last. Easy to Hard inside each section."
)

SECTIONS: list[tuple[str, list[str]]] = [
    ("Arrays & Hashing", ["array", "hashmap-frequency"]),
    ("Strings", ["string"]),
    ("Two Pointers", ["two-pointers"]),
    ("Sliding Window", ["sliding-window"]),
    ("Stack", ["stack"]),
    ("Binary Search", ["binary-search"]),
    ("Linked List", ["linked-list"]),
    ("Trees", ["tree", "trees-bst"]),
    ("Heap", ["heap"]),
    ("Intervals", ["intervals"]),
    ("Graphs", ["graph", "graphs-bfs-dfs"]),
    ("Backtracking", ["backtracking"]),
    ("Dynamic Programming", ["dynamic-programming"]),
    ("Greedy", ["greedy"]),
    ("Trie & Union-Find", ["trie", "union-find"]),
    ("Matrix", ["matrix"]),
    ("Math & Bits", ["math", "bit-manipulation"]),
    ("Design", ["design"]),
]

TAGS = CATALOG_TAGS

_DIFFICULTY_ORDER = {"EASY": 0, "MEDIUM": 1, "HARD": 2}
_SECTION_OF_TAG = {tag: index for index, (_, tags) in enumerate(SECTIONS) for tag in tags}


def section_of(spec: dict) -> str:
    return SECTIONS[_SECTION_OF_TAG[spec["tag"]]][0]


def _build() -> list[dict]:
    missing = sorted({spec["tag"] for spec in CATALOG_PROBLEMS} - set(_SECTION_OF_TAG))
    if missing:
        raise RuntimeError(f"Microsoft list has no section for tags: {missing}")
    positioned = list(enumerate(CATALOG_PROBLEMS))
    positioned.sort(
        key=lambda item: (
            _SECTION_OF_TAG[item[1]["tag"]],
            _DIFFICULTY_ORDER[item[1]["difficulty"]],
            item[0],
        )
    )
    return [spec for _, spec in positioned]


PROBLEMS: list[dict] = _build()
EXPECTED_LEETCODE_IDS: list[int] = [spec["leetcode_id"] for spec in PROBLEMS]
