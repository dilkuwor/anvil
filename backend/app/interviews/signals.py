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

SD_SIGNAL_KEYS = (
    "requirements",
    "capacity",
    "high_level",
    "deep_dive",
    "scalability",
    "reliability",
    "tradeoffs",
    "communication",
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

SD_FOCUS_BY_PHASE: dict[str, tuple[str, ...]] = {
    "REQUIREMENTS": ("requirements", "communication"),
    "CAPACITY": ("capacity", "requirements"),
    "HIGH_LEVEL": ("high_level", "communication"),
    "DEEP_DIVE": ("deep_dive", "tradeoffs"),
    "SCALABILITY": ("scalability", "capacity"),
    "RELIABILITY": ("reliability", "tradeoffs"),
    "TRADEOFFS": ("tradeoffs", "scalability", "reliability"),
    "FEEDBACK": (),
}

_SD_PATTERNS: dict[str, tuple[re.Pattern[str], ...]] = {
    "requirements": (
        re.compile(
            r"\b(user|must|need to|functional|read path|write path|feature|requirement|constraint)\b",
            re.I,
        ),
    ),
    "capacity": (
        re.compile(r"\b(qps|rps|dau|storage|tb|gb|bandwidth|estimate|million|capacity|throughput)\b", re.I),
    ),
    "high_level": (
        re.compile(
            r"\b(load balancer|api gateway|microservice|cdn|cache|queue|database|service|client)\b",
            re.I,
        ),
    ),
    "deep_dive": (
        re.compile(r"\b(schema|partition|shard|index|consistency|invalidat|hash|replication|protocol)\b", re.I),
    ),
    "scalability": (
        re.compile(r"\b(scale|shard|replica|horizontal|hot key|bottleneck|partition|fan-?out)\b", re.I),
    ),
    "reliability": (
        re.compile(r"\b(failover|replica|backup|retry|timeout|circuit|availability|redundan)\b", re.I),
    ),
    "tradeoffs": (
        re.compile(
            r"\b(tradeoff|consistency|availability|eventual|cap theorem|versus|rather than|instead of)\b",
            re.I,
        ),
    ),
}


def _keys_for(kind: str) -> tuple[str, ...]:
    return SD_SIGNAL_KEYS if kind == "SYSTEM_DESIGN" else SIGNAL_KEYS


def empty_signals(kind: str = "CODING") -> dict[str, str]:
    return {key: MISSING for key in _keys_for(kind)}


def normalize_signals(raw: dict | None, kind: str = "CODING") -> dict[str, str]:
    keys = _keys_for(kind)
    base = {key: MISSING for key in keys}
    if not raw:
        return base
    for key in keys:
        value = str(raw.get(key) or MISSING).lower()
        base[key] = value if value in STATUSES else MISSING
    return base


def merge_signals(current: dict[str, str], updates: dict[str, str], kind: str = "CODING") -> dict[str, str]:
    merged = normalize_signals(current, kind)
    for key, value in updates.items():
        if key not in merged or value not in STATUSES:
            continue
        if _RANK[value] > _RANK[merged[key]]:
            merged[key] = value
    return merged


def missing_signals(signals: dict[str, str], keys: Iterable[str] | None = None, kind: str = "CODING") -> list[str]:
    watch = tuple(keys) if keys is not None else _keys_for(kind)
    normalized = normalize_signals(signals, kind)
    return [key for key in watch if normalized.get(key) != DEMONSTRATED]


def infer_signals(text: str, current: dict[str, str] | None = None, kind: str = "CODING") -> dict[str, str]:
    """Raise signal status from the candidate's latest utterance. Never lowers a status."""
    del current
    blob = (text or "").strip()
    updates: dict[str, str] = {}
    if not blob:
        return updates
    patterns = _SD_PATTERNS if kind == "SYSTEM_DESIGN" else _PATTERNS
    for key, group in patterns.items():
        if any(pattern.search(blob) for pattern in group):
            updates[key] = DEMONSTRATED if len(blob) >= 80 else PARTIAL
    if len(blob) >= 50:
        updates["communication"] = DEMONSTRATED if len(blob) >= 120 else PARTIAL
    return updates


def infer_from_architecture(architecture: dict | None) -> dict[str, str]:
    from app.interviews.architecture import has_core_shape, node_types, normalize_architecture

    graph = normalize_architecture(architecture)
    types = node_types(graph)
    updates: dict[str, str] = {}
    if len(graph["nodes"]) >= 2:
        updates["high_level"] = PARTIAL
    if has_core_shape(graph) and graph["edges"]:
        updates["high_level"] = DEMONSTRATED
    if "cache" in types or "cdn" in types:
        updates["scalability"] = PARTIAL
    if {"cache", "load_balancer"} & types and ({"queue", "worker"} & types):
        updates["scalability"] = DEMONSTRATED
    if {"queue", "worker", "database"} & types:
        updates["reliability"] = PARTIAL
    if len(types) >= 6 and graph["edges"]:
        updates["deep_dive"] = PARTIAL
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


def choose_focus(phase: str, signals: dict[str, str], kind: str = "CODING") -> str | None:
    table = SD_FOCUS_BY_PHASE if kind == "SYSTEM_DESIGN" else CODING_FOCUS_BY_PHASE
    normalized = normalize_signals(signals, kind)
    for key in table.get(phase, ()):
        if normalized.get(key) != DEMONSTRATED:
            return key
    return None


def coverage_score(signals: dict[str, str], kind: str = "CODING") -> float:
    keys = _keys_for(kind)
    normalized = normalize_signals(signals, kind)
    points = sum(_RANK[normalized[key]] for key in keys)
    return round(10 * points / (_RANK[DEMONSTRATED] * len(keys)), 1)
