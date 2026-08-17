"""Structured interview signals. The LLM does not own these values."""

from __future__ import annotations

import re
from typing import Iterable

SIGNAL_KEYS = (
    "requirements",
    "approach",
    "complexity",
    "edge_cases",
    "communication",
    "testing",
    "reasoning",
)

MISSING = "missing"
PARTIAL = "partial"
DEMONSTRATED = "demonstrated"
STATUSES = (MISSING, PARTIAL, DEMONSTRATED)

_RANK = {MISSING: 0, PARTIAL: 1, DEMONSTRATED: 2}

_PATTERNS: dict[str, tuple[re.Pattern[str], ...]] = {
    "requirements": (
        re.compile(r"\b(return|input|output|need to|problem (is|asks)|given|we (are|need)|must)\b", re.I),
    ),
    "approach": (
        re.compile(
            r"\b(hash\s*map|hashmap|sort|two pointers?|sliding window|dynamic programming|bfs|dfs|"
            r"stack|queue|heap|binary search|greedy|recursion|iterate)\b",
            re.I,
        ),
    ),
    "complexity": (
        re.compile(r"\bO\s*\(|time complexity|space complexity|linear time|constant space|log n\b", re.I),
    ),
    "edge_cases": (
        re.compile(r"\b(empty|null|duplicate|overflow|negative|single element|edge case|zero length)\b", re.I),
    ),
    "testing": (
        re.compile(r"\b(test|example|walk through|dry[- ]run|sample)\b", re.I),
    ),
    "reasoning": (
        re.compile(r"\b(because|so that|tradeoff|rather than|in order to|that way)\b", re.I),
    ),
}

CODING_FOCUS_BY_PHASE: dict[str, tuple[str, ...]] = {
    "INTRO": ("requirements",),
    "UNDERSTANDING": ("requirements", "edge_cases", "communication"),
    "APPROACH": ("approach", "complexity", "edge_cases", "reasoning"),
    "CODING": ("reasoning", "testing", "edge_cases"),
    "TESTING": ("testing", "complexity", "reasoning"),
    "FOLLOW_UP": ("complexity", "approach", "reasoning"),
    "FEEDBACK": (),
}


def empty_signals() -> dict[str, str]:
    return {key: MISSING for key in SIGNAL_KEYS}


def normalize_signals(raw: dict | None) -> dict[str, str]:
    base = empty_signals()
    if not raw:
        return base
    for key in SIGNAL_KEYS:
        value = str(raw.get(key) or MISSING).lower()
        base[key] = value if value in STATUSES else MISSING
    return base


def merge_signals(current: dict[str, str], updates: dict[str, str]) -> dict[str, str]:
    merged = normalize_signals(current)
    for key, value in updates.items():
        if key not in merged or value not in STATUSES:
            continue
        if _RANK[value] > _RANK[merged[key]]:
            merged[key] = value
    return merged


def missing_signals(signals: dict[str, str], keys: Iterable[str] | None = None) -> list[str]:
    watch = tuple(keys) if keys is not None else SIGNAL_KEYS
    return [key for key in watch if normalize_signals(signals).get(key) != DEMONSTRATED]


def infer_signals(text: str, current: dict[str, str] | None = None) -> dict[str, str]:
    """Raise signal status from the candidate's latest utterance. Never lowers a status."""
    blob = (text or "").strip()
    updates: dict[str, str] = {}
    if not blob:
        return updates
    for key, patterns in _PATTERNS.items():
        if any(pattern.search(blob) for pattern in patterns):
            updates[key] = DEMONSTRATED if len(blob) >= 80 else PARTIAL
    if len(blob) >= 50:
        updates["communication"] = DEMONSTRATED if len(blob) >= 120 else PARTIAL
    return updates


def infer_from_sandbox(
    *,
    status: str | None,
    passed: int,
    total: int,
    accepted: bool,
    run_count: int,
) -> dict[str, str]:
    updates: dict[str, str] = {}
    if run_count or total:
        updates["testing"] = PARTIAL
    if accepted or (total and passed == total and status not in {None, "WRONG_ANSWER", "COMPILATION_ERROR"}):
        updates["testing"] = DEMONSTRATED
    if accepted:
        updates["approach"] = PARTIAL
    return updates


def choose_focus(phase: str, signals: dict[str, str]) -> str | None:
    for key in CODING_FOCUS_BY_PHASE.get(phase, ()):
        if normalize_signals(signals).get(key) != DEMONSTRATED:
            return key
    return None


def coverage_score(signals: dict[str, str]) -> float:
    normalized = normalize_signals(signals)
    points = sum(_RANK[normalized[key]] for key in SIGNAL_KEYS)
    return round(10 * points / (_RANK[DEMONSTRATED] * len(SIGNAL_KEYS)), 1)
