"""The study path: ten units that pair a coding section with system design content.

Each unit lists 5–8 core coding problems (the rest of the section stays available as extra
practice), one to three Learn lessons, one design question with two steps (write the outline,
then a mock interview), and an optional coding mock as the unit's "boss". A ``why`` line names
the real link between the coding topic and the design question; it is left out where the
pairing is only by order.

Nothing here locks anything: every unit can be opened at any time. The order only decides
what the Today page suggests next.
"""

from __future__ import annotations

UNITS: list[dict] = [
    {
        "number": 1,
        "id": "arrays-hashing",
        "why": "Hashing gives each long URL a short unique key; the same idea as a hash map.",
        "title": "Arrays & Hashing",
        "tags": ["array", "hashmap-frequency"],
        "problems": ["lc-1", "lc-217", "lc-242", "lc-49", "lc-347", "lc-238", "lc-128", "lc-560"],
        "lessons": ["system-design-template", "requirements-gathering", "sd-url-shortener"],
        "design": "url-shortener",
    },
    {
        "number": 2,
        "id": "two-pointers-sliding-window",
        "why": "A sliding-window counter is one of the main rate-limiting algorithms.",
        "title": "Two Pointers & Sliding Window",
        "tags": ["two-pointers", "sliding-window"],
        "problems": ["lc-125", "lc-167", "lc-15", "lc-11", "lc-42", "lc-3", "lc-424", "lc-76"],
        "lessons": ["rate-limiting", "caching", "sd-rate-limiter-design"],
        "design": "rate-limiter",
    },
    {
        "number": 3,
        "id": "stack-binary-search",
        "why": "A key-value store finds a key by binary search over sorted files on disk.",
        "title": "Stack & Binary Search",
        "tags": ["stack", "binary-search"],
        "problems": ["lc-20", "lc-155", "lc-739", "lc-84", "lc-704", "lc-33", "lc-153", "lc-875"],
        "lessons": ["databases", "sd-indexes", "sd-consistent-hashing", "sd-key-value-store"],
        "design": "key-value-store",
    },
    {
        "number": 4,
        "id": "heap-intervals",
        "why": "A feed merges many sorted streams and keeps the top K, which is heap work.",
        "title": "Heap & Intervals",
        "tags": ["heap", "intervals"],
        "problems": ["lc-1046", "lc-215", "lc-973", "lc-23", "lc-295", "lc-56", "lc-57", "lc-253"],
        "lessons": ["message-queues", "event-driven-architecture", "sd-news-feed"],
        "design": "news-feed",
    },
    {
        "number": 5,
        "id": "linked-list",
        "title": "Linked Lists",
        "tags": ["linked-list"],
        "problems": ["lc-206", "lc-141", "lc-21", "lc-19", "lc-138", "lc-61", "lc-430"],
        "lessons": ["sd-realtime-protocols", "replication", "sd-chat-system"],
        "design": "chat-system",
    },
    {
        "number": 6,
        "id": "trees-trie",
        "why": "Autocomplete is a trie: walk the prefix, then list the completions below it.",
        "title": "Trees & Trie",
        "tags": ["tree", "trees-bst", "trie"],
        "problems": ["lc-226", "lc-104", "lc-102", "lc-98", "lc-235", "lc-105", "lc-124", "lc-208"],
        "lessons": ["sharding", "sql-vs-nosql", "sd-autocomplete"],
        "design": "autocomplete",
    },
    {
        "number": 7,
        "id": "graphs",
        "why": "A crawler is breadth-first search over the web graph, with a visited set.",
        "title": "Graphs",
        "tags": ["graph", "graphs-bfs-dfs", "union-find"],
        "problems": ["lc-200", "lc-133", "lc-207", "lc-210", "lc-994", "lc-417", "lc-127", "lc-721"],
        "lessons": ["distributed-systems", "sd-idempotency", "sd-web-crawler"],
        "design": "web-crawler",
    },
    {
        "number": 8,
        "id": "backtracking-dp",
        "title": "Backtracking & Dynamic Programming",
        "tags": ["backtracking", "dynamic-programming"],
        "problems": ["lc-78", "lc-39", "lc-79", "lc-70", "lc-198", "lc-322", "lc-300", "lc-139"],
        "lessons": ["sd-object-storage", "sd-cdn", "sd-video-streaming"],
        "design": "video-streaming",
    },
    {
        "number": 9,
        "id": "greedy-matrix-math",
        "title": "Greedy, Matrix, Math & Bits",
        "tags": ["greedy", "matrix", "math", "bit-manipulation"],
        "problems": ["lc-55", "lc-134", "lc-621", "lc-48", "lc-54", "lc-73", "lc-191", "lc-338"],
        "lessons": ["consistency", "cap-theorem", "sd-resilience-patterns", "sd-ride-sharing"],
        "design": "ride-sharing",
    },
    {
        "number": 10,
        "id": "design-and-loop",
        "title": "Design Problems & the Full Loop",
        "tags": ["design"],
        "problems": ["lc-146", "lc-380", "lc-355", "lc-348", "lc-173", "lc-706"],
        "lessons": ["sd-interview-scoring", "observability", "sd-multi-region"],
        "design": "url-shortener",
    },
]

# Leitner boxes: how many days a card waits after a successful recall at each box.
BOX_DAYS = {1: 1, 2: 3, 3: 7, 4: 21, 5: 60}

# The most reviews Today ever shows. Anything else waits for the next days.
DAILY_REVIEW_CAP = 5


def unit_for_problem(slug: str) -> dict | None:
    for unit in UNITS:
        if slug in unit["problems"]:
            return unit
    return None


def validate_path(problem_slugs: set[str], lesson_slugs: set[str], design_slugs: set[str]) -> None:
    seen: set[str] = set()
    for unit in UNITS:
        where = f"unit {unit['number']} ({unit['title']})"
        if not 5 <= len(unit["problems"]) <= 8:
            raise RuntimeError(f"{where} must have 5 to 8 core problems")
        for slug in unit["problems"]:
            if slug not in problem_slugs:
                raise RuntimeError(f"{where} lists unknown problem {slug!r}")
            if slug in seen:
                raise RuntimeError(f"{where} repeats problem {slug!r}")
            seen.add(slug)
        for slug in unit["lessons"]:
            if slug not in lesson_slugs:
                raise RuntimeError(f"{where} lists unknown lesson {slug!r}")
        if unit["design"] not in design_slugs:
            raise RuntimeError(f"{where} lists unknown design question {unit['design']!r}")
