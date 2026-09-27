"""Pattern families for the recognition drill.

Every solution names a precise pattern ("Sliding window, at most k zeros"). The drill asks for the
family it belongs to, which is what an interviewer wants to hear first.
"""

from __future__ import annotations

import random

# (family, how to recognise it) in the order the rules below fall back through.
FAMILIES: list[tuple[str, str]] = [
    ("Sliding window", "A contiguous run with a rule about what it may contain; grow the right end, shrink the left."),
    ("Two pointers", "Two indexes walking a sorted or in-place array toward each other or in step."),
    ("Fast and slow pointers", "Two walkers at different speeds to find a middle or a cycle."),
    ("Binary search", "A sorted or monotonic space where each guess halves what is left."),
    ("Hash map / set", "Remember what you have seen so a lookup costs O(1) instead of a scan."),
    ("Prefix sum", "Range totals answered from running sums computed once."),
    ("Stack", "Nested or most-recent-first structure: brackets, next greater element, undo."),
    ("Heap", "Repeatedly need the smallest or largest of a changing set, or the top k."),
    ("Linked list", "Rewire nodes in place: reverse, merge, splice, find the middle."),
    ("Tree DFS", "Recurse down a tree, combining answers from the children."),
    ("Graph traversal (BFS / DFS)", "Explore neighbours level by level or depth first over a grid or graph."),
    ("Topological sort", "Ordering tasks with dependencies; detect cycles in a directed graph."),
    ("Union find", "Merge groups and ask whether two items are connected."),
    ("Trie", "Prefix lookups over many words."),
    ("Dynamic programming", "Overlapping subproblems: best answer for a prefix, a range, or a capacity."),
    ("Backtracking", "Build a candidate step by step and undo when a rule breaks."),
    ("Greedy", "A local best choice at each step that provably stays best."),
    ("Intervals", "Sort by start or end, then sweep once to merge or count overlaps."),
    ("Matrix", "Walk a grid in a set order or mark state in place."),
    ("Divide and conquer", "Split, solve halves, combine."),
    ("Bit manipulation", "XOR, counting bits, or packing state into bits."),
    ("Math / digits", "Arithmetic on digits, bases, or number theory."),
    ("Design", "Compose known structures into a class with the required operations."),
]

FAMILY_NAMES = [name for name, _ in FAMILIES]
DESCRIPTIONS = dict(FAMILIES)

# Substring rules on the lower-cased pattern name; the first match wins.
_RULES: list[tuple[tuple[str, ...], str]] = [
    (("topological",), "Topological sort"),
    (("union find",), "Union find"),
    (("trie",), "Trie"),
    (("design:", "frequency stack", "separate chaining", "circular bucket"), "Design"),
    (("fast and slow", "ring and cut"), "Fast and slow pointers"),
    (("binary search tree", "tree dfs", "tree edges", "tree serialization", "in-order walk"), "Tree DFS"),
    (("binary search", "patience"), "Binary search"),
    (("window", "monotonic deque"), "Sliding window"),
    (("linked list", "merge two sorted", "reverse k-groups", "second half", "middle, reverse", "turn the links"), "Linked list"),
    (("bfs", "breadth-first", "flood fill", "grid search", "shortest path", "graph search"), "Graph traversal (BFS / DFS)"),
    (("interval", "sort by start", "earliest end"), "Intervals"),
    (("dp", "dynamic programming", "knapsack", "kadane"), "Dynamic programming"),
    (("backtracking", "n-queens", "permutations", "subsets"), "Backtracking"),
    (("greedy", "boyer-moore", "running minimum"), "Greedy"),
    (("prefix",), "Prefix sum"),
    (("heap",), "Heap"),
    (("stack",), "Stack"),
    (("matrix",), "Matrix"),
    (("divide and conquer",), "Divide and conquer"),
    (("bit", "xor"), "Bit manipulation"),
    (("digit", "base", "exponentiation", "next permutation"), "Math / digits"),
    (("hash", "frequency", "seen", "map index", "counter"), "Hash map / set"),
    (("two pointers", "pointers", "reverse in place", "in-place reverse", "expand around", "center expansion", "string parsing"), "Two pointers"),
]


def family_for(pattern: str) -> str:
    """The family a solution's pattern belongs to; unknown names fall back to their own text."""
    text = (pattern or "").strip().lower()
    for needles, family in _RULES:
        if any(needle in text for needle in needles):
            return family
    return pattern.strip() or "Unknown"


def options_for(slug: str, family: str, count: int = 4) -> list[str]:
    """The right family plus distractors, in a fixed order per problem so grading can recompute it."""
    rng = random.Random(f"pattern-drill:{slug}")
    others = [name for name in FAMILY_NAMES if name != family]
    picks = rng.sample(others, min(count - 1, len(others)))
    options = [family, *picks]
    rng.shuffle(options)
    return options
