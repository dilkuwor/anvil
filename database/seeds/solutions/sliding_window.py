"""Sliding window problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-3", "longest-unique-window"],
        "pattern": "Sliding window",
        "trigger": "“Longest substring” (or subarray) with a rule about what it may contain.",
        "summary": (
            "Keep one window that only moves forward. When the new letter is already inside the window, "
            "move the left edge just past the old copy. The answer is the widest the window ever gets."
        ),
        "approaches": [
            {
                "name": "Try every starting point",
                "idea": "From each position, read forward until a letter repeats. Remember the longest run.",
                "steps": [
                    "Pick a start position.",
                    "Read letters forward, putting each one in a set.",
                    "Stop at the first letter that is already in the set.",
                    "The run length is a candidate for the best. Move the start one step and do it all again.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        int best = 0;
        for (int start = 0; start < s.length(); start++) {
            Set<Character> seen = new HashSet<>();
            int end = start;
            while (end < s.length() && seen.add(s.charAt(end))) {
                end++;
            }
            best = Math.max(best, end - start);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-reads letters that an earlier start already read.",
                "space_complexity": "O(k)",
                "space_why": "The set holds at most k different letters (k = alphabet size).",
                "when_to_use": "Say it first, in one sentence, to show you understand the problem. Do not code it.",
                "is_optimal": False,
            },
            {
                "name": "One window, shrink one letter at a time",
                "idea": "Grow the window to the right. While the new letter is a repeat, drop letters from the left.",
                "steps": [
                    "Keep a set of the letters inside the window.",
                    "Move right one letter at a time.",
                    "While that letter is already in the set, remove the leftmost letter and move left forward.",
                    "Add the new letter. The window is clean: compare its length with the best.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Set<Character> window = new HashSet<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            while (window.contains(c)) {
                window.remove(s.charAt(left));
                left++;
            }
            window.add(c);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each letter enters the window once and leaves at most once: 2n steps at most.",
                "space_complexity": "O(k)",
                "space_why": "The set holds only the letters inside the window.",
                "when_to_use": "The easiest correct version to write under pressure. A fine answer on its own.",
                "is_optimal": False,
            },
            {
                "name": "One window, jump past the old copy",
                "idea": "Remember where each letter was last seen, so the left edge can jump instead of walking.",
                "steps": [
                    "Keep a map: letter → the last index where it was seen.",
                    "Move right one letter at a time.",
                    "If that letter was seen at or after left, it is inside the window: set left to one past that index.",
                    "If it was seen before left, ignore it. It is outside the window.",
                    "Record the letter's new index, then compare the window length with the best.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> last = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (last.containsKey(c) && last.get(c) >= left) {
                left = last.get(c) + 1;
            }
            last.put(c, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Right visits each letter once, and left only ever jumps forward.",
                "space_complexity": "O(k)",
                "space_why": "The map holds one entry per different letter.",
                "when_to_use": "The version to aim for. Same cost class as the set version, but one pass with no inner loop.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "abba"',
            "columns": ["right", "letter", "last seen", "what happens", "left", "window", "best"],
            "rows": [
                ["0", "a", "never", "new letter", "0", "a", "1"],
                ["1", "b", "never", "new letter", "0", "ab", "2"],
                ["2", "b", "index 1", "1 is inside the window, so left jumps to 2", "2", "b", "2"],
                ["3", "a", "index 0", "0 is left of the window, so it does not count", "2", "ba", "2"],
            ],
            "result": "The answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Ghost Trap",
                "wrong": "Always doing `left = last.get(c) + 1` when the letter was seen before.",
                "right": "Only when `last.get(c) >= left`. An old copy behind the window is a ghost. Left never moves backwards.",
            },
            {
                "name": "Length off by one",
                "wrong": "Using `right - left` as the window length.",
                "right": "Both ends are inside the window, so the length is `right - left + 1`.",
            },
            {
                "name": "Measuring too early",
                "wrong": "Updating best before moving left, while the window still holds a repeat.",
                "right": "Fix the window first, then measure it.",
            },
        ],
        "edge_cases": [
            {"input": '""', "expected": "0", "why": "Empty string: the loop never runs."},
            {"input": '"a"', "expected": "1", "why": "A single letter."},
            {"input": '"bbbbb"', "expected": "1", "why": "Every letter is a repeat, so left follows right."},
            {"input": '"abba"', "expected": "2", "why": "The old copy is behind the window (the Ghost Trap)."},
            {"input": '"a b"', "expected": "3", "why": "A space is a character too."},
        ],
        "interview_script": [
            "So I need the length of the longest run of neighbouring characters with no repeats.",
            "The obvious way is to try every start and read until a repeat. That is O(n²), because I re-read the same letters.",
            "The key point: when I hit a repeat, only the old copy is a problem. Everything after it is still fine.",
            "So I keep one window and a map of last-seen positions. On a repeat inside the window, left jumps past the old copy.",
            "That is one pass: O(n) time, and O(k) space for the map. I will test empty, all-same, and a case like abba.",
        ],
        "follow_ups": [
            {
                "question": "The input is only ASCII. Can you use less overhead?",
                "answer": "Replace the map with `int[128]` filled with -1. Same logic, no hashing.",
            },
            {
                "question": "Return the substring itself, not its length.",
                "answer": "When best improves, also remember `left`. At the end return `s.substring(bestLeft, bestLeft + best)`.",
            },
            {
                "question": "What if at most k repeats of a letter are allowed?",
                "answer": "Keep counts instead of positions and shrink from the left while any count is above k.",
            },
            {
                "question": "What if the text arrives as a stream?",
                "answer": "The same loop works as letters arrive. Memory stays bounded by the alphabet, not the stream length.",
            },
        ],
        "related_slugs": ["lc-340", "lc-424", "lc-76"],
    },
]
