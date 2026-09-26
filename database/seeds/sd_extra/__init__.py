"""Extra System Design concept lessons, one module per lesson.

Each module exports ``LESSON`` (built with ``SD`` from ``learn_system_design``) and ``TOPIC``,
the slug of the topic it belongs to. Modules are picked up automatically; nothing else has
to change to add one. The topics themselves are defined in ``EXTRA_TOPICS`` below.
"""

from __future__ import annotations

import importlib
import pkgutil

# slug, title, description, difficulty, display order. Case studies come after these (27).
EXTRA_TOPICS: list[tuple[str, str, str, str, int]] = [
    (
        "search-systems",
        "Search and Indexing",
        "How full-text search works: tokens, inverted indexes, ranking and how a search index is sharded.",
        "MEDIUM",
        24,
    ),
    (
        "data-processing",
        "Batch and Stream Processing",
        "Moving from MapReduce to streaming: pipelines, windows, watermarks and exactly-once results.",
        "HARD",
        25,
    ),
    (
        "sd-building-blocks",
        "Building Blocks",
        "Small components that appear in many designs: unique ids, probabilistic structures and geospatial indexes.",
        "MEDIUM",
        26,
    ),
]


def _modules() -> list:
    found = []
    for module in sorted(pkgutil.iter_modules(__path__), key=lambda item: item.name):
        if module.name.startswith("_"):
            continue
        found.append(importlib.import_module(f"{__name__}.{module.name}"))
    return found


def extra_topics() -> list[dict]:
    from database.seeds.learn_system_design import _sd_topic

    lessons_by_topic: dict[str, list[dict]] = {}
    for module in _modules():
        lessons_by_topic.setdefault(module.TOPIC, []).append(module.LESSON)
    topics = []
    for slug, title, description, difficulty, order in EXTRA_TOPICS:
        lessons = lessons_by_topic.get(slug, [])
        if not lessons:
            continue
        lessons.sort(key=lambda lesson: getattr_order(lesson))
        topics.append(_sd_topic(slug, title, description, difficulty, order, lessons))
    return topics


def getattr_order(lesson: dict) -> int:
    return int(lesson.get("display_order", 0))
