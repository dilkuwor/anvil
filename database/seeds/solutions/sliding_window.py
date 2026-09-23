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
    {
        "slugs": ["lc-76"],
        "pattern": "Sliding window with need counts",
        "trigger": "Shortest substring that contains all the letters of another string.",
        "summary": (
            "Grow the right edge until every needed letter is ticked, then shrink the left edge "
            "while the list stays complete. A spare copy of a needed letter is not a miss."
        ),
        "approaches": [
            {
                "name": "Try every substring",
                "idea": "For each start, grow the end until t is covered, and keep the shortest cover.",
                "steps": [
                    "Count the letters in t.",
                    "For each start, walk right adding letters into a window count.",
                    "When the window covers t, record the length if it is the shortest so far.",
                    "If no window covers t, return empty.",
                ],
                "code": """import java.util.*;

class Solution {
    public String minWindow(String s, String t) {
        if (t.isEmpty() || s.length() < t.length()) return "";
        int[] need = new int[128];
        int kinds = 0;
        for (char c : t.toCharArray()) if (need[c]++ == 0) kinds++;
        String best = "";
        for (int start = 0; start < s.length(); start++) {
            int[] have = new int[128];
            int got = 0;
            for (int end = start; end < s.length(); end++) {
                char c = s.charAt(end);
                if (need[c] > 0 && ++have[c] == need[c]) got++;
                if (got == kinds) {
                    String cur = s.substring(start, end + 1);
                    if (best.isEmpty() || cur.length() < best.length()) best = cur;
                    break;
                }
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-reads letters to its right.",
                "space_complexity": "O(k)",
                "space_why": "The count arrays hold the alphabet (k different letters).",
                "when_to_use": "Say it. Do not code it.",
                "is_optimal": False,
            },
            {
                "name": "Grow until covered, then shrink",
                "idea": "One window. Right fills the basket. Left drops while every needed letter is still ticked.",
                "steps": [
                    "Count letters in t. missing starts at t.length().",
                    "Move right. When you take a still-needed copy, missing--.",
                    "While missing is 0, record the window if it is the shortest, then drop the left letter.",
                    "Dropping a needed letter only unticks it when that letter's count falls below the need.",
                ],
                "code": """class Solution {
    public String minWindow(String s, String t) {
        if (s.length() < t.length() || t.isEmpty()) return "";
        int[] need = new int[128];
        for (char c : t.toCharArray()) need[c]++;
        int missing = t.length();
        int bestStart = 0, bestLen = Integer.MAX_VALUE, left = 0;
        for (int right = 0; right < s.length(); right++) {
            if (need[s.charAt(right)]-- > 0) missing--;
            while (missing == 0) {
                if (right - left + 1 < bestLen) {
                    bestLen = right - left + 1;
                    bestStart = left;
                }
                if (need[s.charAt(left)]++ == 0) missing++;
                left++;
            }
        }
        return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
    }
}
""",
                "time_complexity": "O(n + m)",
                "time_why": "Each letter of s enters and leaves the window at most once. t is counted once.",
                "space_complexity": "O(k)",
                "space_why": "The need array holds one slot per character that appears.",
                "when_to_use": "The version to write. One pass.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "ADOBECODEBANC", t = "ABC"',
            "columns": ["right", "letter", "covered?", "left shrink", "window"],
            "rows": [
                ["0-4", "A..E", "no, still missing C", "-", "ADOBE"],
                ["5", "C", "yes, missing=0", "drop A? no, A is needed", "ADOBEC"],
                ["5", "C", "still covered after drop D,O,B,E", "left at A", "ADOBEC then shrink to C"],
                ["10", "B", "covered again", "BANC", "BANC"],
                ["12", "C", "covered", "BANC is shortest", "BANC"],
            ],
            "result": "The shortest cover is BANC.",
        },
        "mistakes": [
            {
                "name": "The Spare Copy Trap",
                "wrong": "Unticking a needed letter as soon as you drop any copy of it.",
                "right": "Dropping a needed letter only unticks it when the basket falls below the need. A spare copy keeps the list complete: check `basket.get(d) < need.get(d)`.",
            },
            {
                "name": "Requiring extra letters",
                "wrong": "Waiting until the window equals t as a permutation, not a cover.",
                "right": "t may have duplicates. Cover means at least those counts, not an exact permutation.",
            },
            {
                "name": "Returning any cover",
                "wrong": "Stopping at the first cover without shrinking.",
                "right": "Shrink while still covered, and keep the shortest seen.",
            },
        ],
        "edge_cases": [
            {"input": '"ADOBECODEBANC"\n"ABC"', "expected": '"BANC"', "why": "The usual shortest cover."},
            {"input": '"a"\n"a"', "expected": '"a"', "why": "s is t."},
            {"input": '"a"\n"aa"', "expected": '""', "why": "Not enough copies of a."},
            {"input": '"ab"\n"b"', "expected": '"b"', "why": "t is a single letter already in s."},
        ],
        "interview_script": [
            "I need the shortest substring of s that covers every letter of t.",
            "I could try every start and grow until t is covered. That is O(n²).",
            "I grow right until the need list is ticked, then shrink left while it stays ticked.",
            "I only untick a letter when dropping it would go below the need. A spare copy is fine.",
            "That is O(n+m) time. I will test t longer than s, exact match, and extra copies.",
        ],
        "follow_ups": [
            {
                "question": "Return every shortest window.",
                "answer": "Keep a list of starts when the length equals the best, after a full pass to know the best.",
            },
            {
                "question": "Characters are Unicode.",
                "answer": "Use a HashMap instead of int[128]. Same missing-count logic.",
            },
            {
                "question": "t has no duplicates, find the shortest cover of a set.",
                "answer": "Same window; need counts are all 1.",
            },
        ],
        "related_slugs": ["lc-3", "lc-438", "lc-567"],
    },
    {
        "slugs": ["lc-209"],
        "pattern": "Sliding window, positives",
        "trigger": "Shortest contiguous run whose sum is at least a target, values are positive.",
        "summary": (
            "Grow the right end, adding. While the sum is at least the target, record the length "
            "and drop the left end. Positives make shrinking safe."
        ),
        "approaches": [
            {
                "name": "Every subarray sum",
                "idea": "For each start, add going right until the sum hits the target.",
                "steps": [
                    "For each start, set the running sum to 0.",
                    "Add each nums[end] going right.",
                    "When the sum is at least the target, record the length and break that start.",
                    "If no start hits the target, return 0.",
                ],
                "code": """class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int best = Integer.MAX_VALUE;
        for (int start = 0; start < nums.length; start++) {
            int sum = 0;
            for (int end = start; end < nums.length; end++) {
                sum += nums[end];
                if (sum >= target) {
                    best = Math.min(best, end - start + 1);
                    break;
                }
            }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-adds the values to its right.",
                "space_complexity": "O(1)",
                "space_why": "Only sum and best.",
                "when_to_use": "Say it. Values are positive, so a window is better.",
                "is_optimal": False,
            },
            {
                "name": "Grow, then shrink",
                "idea": "Because values are positive, dropping the left end only lowers the sum.",
                "steps": [
                    "Add the next nums[right] into the running sum.",
                    "While the sum is at least the target, record the length and subtract nums[left], then left++.",
                    "If the best length never moved, return 0.",
                ],
                "code": """class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int best = Integer.MAX_VALUE, sum = 0, left = 0;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum >= target) {
                best = Math.min(best, right - left + 1);
                sum -= nums[left++];
            }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is added once and subtracted at most once.",
                "space_complexity": "O(1)",
                "space_why": "Only sum, left, and best.",
                "when_to_use": "The version to write when all values are positive.",
                "is_optimal": True,
            },
            {
                "name": "Running totals with a binary search for each end",
                "idea": "Because the values are positive, the running totals only ever rise, so for each end you can binary search the furthest start that still leaves enough sum.",
                "steps": [
                    "Build the running totals first: total[i] is the sum of the first i values.",
                    "Positive values make that row of totals rise, which is what a binary search needs.",
                    "For each end, you want the last start whose total is at most total[end] minus the target.",
                    "Binary search the totals for that start. The window length is end minus it.",
                    "Keep the shortest length seen, and return 0 if no end ever found a start.",
                ],
                "code": """class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int n = nums.length;
        long[] total = new long[n + 1];
        for (int i = 0; i < n; i++) total[i + 1] = total[i] + nums[i];
        int best = Integer.MAX_VALUE;
        for (int end = 1; end <= n; end++) {
            long room = total[end] - target;
            if (room < 0) continue;
            int lo = 0, hi = end, start = 0;
            while (lo <= hi) {
                int mid = lo + (hi - lo) / 2;
                if (total[mid] <= room) {
                    start = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            best = Math.min(best, end - start);
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "One binary search over the n + 1 totals for each of the n ends.",
                "space_complexity": "O(n)",
                "space_why": "The row of running totals holds one entry per value, plus the leading zero.",
                "when_to_use": "The problem itself asks for this slower one as a second answer, so have it ready. It is also the shape that survives many targets on the same row: build the totals once, then every target is a set of searches.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "target = 7, nums = [2,3,1,2,4,3]",
            "columns": ["right", "sum", "shrink?", "best"],
            "rows": [
                ["0..3", "2+3+1+2=8", "yes, length 4, drop 2, sum=6", "4"],
                ["4", "6+4=10", "drop 3 then 1, length 2 ([4,3] later)", "2"],
                ["5", "4+3=7 after shrinks", "length 2: [4,3]", "2"],
            ],
            "result": "The answer is 2, from [4,3].",
        },
        "mistakes": [
            {
                "name": "The Negative Trap",
                "wrong": "Shrinking because the sum is large, while a negative later would make a shorter prefix wrong.",
                "right": "Negatives break the shrink. Then prefix sums plus a map (Subarray Sum Equals K).",
            },
            {
                "name": "Returning MAX_VALUE",
                "wrong": "If nothing hits, returning Integer.MAX_VALUE.",
                "right": "Return 0 when no window works.",
            },
            {
                "name": "Off-by-one length",
                "wrong": "Using right - left.",
                "right": "Length is right - left + 1.",
            },
        ],
        "edge_cases": [
            {"input": "7\n[2,3,1,2,4,3]", "expected": "2", "why": "[4,3] is the shortest."},
            {"input": "4\n[1,4,4]", "expected": "1", "why": "A single 4."},
            {"input": "11\n[1,1,1,1,1,1,1,1]", "expected": "0", "why": "The whole array is 8, below 11."},
            {"input": "15\n[1,2,3,4,5]", "expected": "5", "why": "The whole array is needed to reach 15."},
        ],
        "interview_script": [
            "I need the shortest run whose sum is at least target. Values are positive.",
            "I could try every start in O(n²).",
            "I grow the right end and shrink the left while the sum stays large enough.",
            "I record the shortest length. If none, I return 0.",
            "That is O(n) time. I will test no such run, a single hit, and [2,3,1,2,4,3].",
        ],
        "follow_ups": [
            {
                "question": "Values may be negative.",
                "answer": "This window is wrong. Use prefix sums and a tree/map of earlier prefixes.",
            },
            {
                "question": "Return the subarray, not the length.",
                "answer": "When best improves, store left and right.",
            },
            {
                "question": "Sum exactly target.",
                "answer": "Same shrink, but only record when sum == target, not >=.",
            },
        ],
        "related_slugs": ["lc-560", "lc-76", "lc-3"],
    },
    {
        "slugs": ["lc-340"],
        "pattern": "Window, at most k distinct",
        "trigger": "Longest substring with at most k different characters.",
        "summary": (
            "Grow right, counting letters. While the window has more than k different letters, "
            "drop from the left. The answer is the widest the window ever gets."
        ),
        "approaches": [
            {
                "name": "Every substring",
                "idea": "From each start, grow until a (k+1)th letter appears.",
                "steps": [
                    "If k is 0, return the empty length 0.",
                    "From each start, add letters to a set.",
                    "Stop when the set size exceeds k. Record the length just before that.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lengthOfLongestSubstringKDistinct(String s, int k) {
        if (k == 0) return 0;
        int best = 0;
        for (int start = 0; start < s.length(); start++) {
            Set<Character> seen = new HashSet<>();
            int end = start;
            while (end < s.length() && (seen.size() < k || seen.contains(s.charAt(end)))) {
                seen.add(s.charAt(end++));
            }
            best = Math.max(best, end - start);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-reads letters.",
                "space_complexity": "O(k)",
                "space_why": "The set holds at most k letters.",
                "when_to_use": "Say it. Then one window.",
                "is_optimal": False,
            },
            {
                "name": "One window, shrink when too many kinds",
                "idea": "A count map. When it has more than k keys, drop the left letter.",
                "steps": [
                    "If k is 0, return the empty length 0.",
                    "Add the letter at s[right] to the counts.",
                    "While the map has more than k keys, decrement the left letter and remove it at 0.",
                    "Record the window length.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lengthOfLongestSubstringKDistinct(String s, int k) {
        if (k == 0) return 0;
        Map<Character, Integer> counts = new HashMap<>();
        int best = 0, left = 0;
        for (int right = 0; right < s.length(); right++) {
            counts.merge(s.charAt(right), 1, Integer::sum);
            while (counts.size() > k) {
                char out = s.charAt(left++);
                if (counts.merge(out, -1, Integer::sum) == 0) counts.remove(out);
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each letter enters and leaves the window at most once.",
                "space_complexity": "O(k)",
                "space_why": "The map holds at most k letters.",
                "when_to_use": "The version to write. Same skeleton as fruit into baskets, with k instead of 2.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "eceba", k = 2',
            "columns": ["right", "letter", "map", "left", "best"],
            "rows": [
                ["0", "e", "{e:1}", "0", "1"],
                ["1", "c", "{e:1,c:1}", "0", "2"],
                ["2", "e", "{e:2,c:1}", "0", "3"],
                ["3", "b", "{e:2,c:1,b:1} then drop e,c", "3", "3"],
                ["4", "a", "drop until 2 kinds: ba", "3", "3"],
            ],
            "result": "The answer is 3, from ece.",
        },
        "mistakes": [
            {
                "name": "The Zero-Kind Trap",
                "wrong": "Running the loop and returning 1.",
                "right": "At most 0 kinds means the empty window. Return 0.",
            },
            {
                "name": "Leaving a zero count in the map",
                "wrong": "Decrementing to 0 but not removing the key, so size stays too big.",
                "right": "Remove the key when the count hits 0.",
            },
            {
                "name": "At most k repeats, not k kinds",
                "wrong": "Shrinking when any letter's count exceeds k.",
                "right": "k is the number of different letters, not copies of one letter.",
            },
        ],
        "edge_cases": [
            {"input": '"eceba"\n2', "expected": "3", "why": "ece has 2 kinds."},
            {"input": '"aa"\n1', "expected": "2", "why": "One kind, whole string."},
            {"input": '"a"\n0', "expected": "0", "why": "k = 0."},
            {"input": '"abcadcacacaca"\n3', "expected": "11", "why": "A long run with three kinds."},
        ],
        "interview_script": [
            "I need the longest substring with at most k different letters.",
            "I could try every start in O(n²).",
            "I keep a window and a count map. When the map has more than k keys, I drop from the left.",
            "I remove a key when its count hits 0.",
            "That is O(n) time and O(k) space. I will test k = 0 and all-same letters.",
        ],
        "follow_ups": [
            {
                "question": "Exactly k distinct.",
                "answer": "Longest with at most k, minus longest with at most k-1. Or shrink while size is k after a grow.",
            },
            {
                "question": "At most 2 distinct.",
                "answer": "Fruit Into Baskets. Same code with k = 2.",
            },
            {
                "question": "Return the substring.",
                "answer": "When best improves, store left.",
            },
        ],
        "related_slugs": ["lc-3", "lc-904", "lc-424"],
    },
    {
        "slugs": ["lc-904"],
        "pattern": "Window, at most 2 distinct",
        "trigger": "Longest run using at most two kinds (two baskets of fruit).",
        "summary": (
            "This is at most 2 distinct in a row. Grow right. While the window holds a third kind, "
            "drop from the left."
        ),
        "approaches": [
            {
                "name": "Every start",
                "idea": "From each tree, walk right until a third kind appears.",
                "steps": [
                    "From each start, keep a set of kinds.",
                    "Walk right while the set has at most 2 kinds.",
                    "Record the length.",
                ],
                "code": """import java.util.*;

class Solution {
    public int totalFruit(int[] fruits) {
        int best = 0;
        for (int start = 0; start < fruits.length; start++) {
            Set<Integer> kinds = new HashSet<>();
            int end = start;
            while (end < fruits.length && (kinds.size() < 2 || kinds.contains(fruits[end]))) {
                kinds.add(fruits[end++]);
            }
            best = Math.max(best, end - start);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-reads trees to its right.",
                "space_complexity": "O(1)",
                "space_why": "The set holds at most 2 kinds.",
                "when_to_use": "Say it. Then one window.",
                "is_optimal": False,
            },
            {
                "name": "One window, two kinds",
                "idea": "A count map of size at most 2. A third kind forces the left edge forward.",
                "steps": [
                    "Add fruits[right] to the map.",
                    "While the map has more than 2 keys, drop fruits[left] and left++.",
                    "Remove a key when its count hits 0.",
                    "Record the window length.",
                ],
                "code": """import java.util.*;

class Solution {
    public int totalFruit(int[] fruits) {
        Map<Integer, Integer> basket = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < fruits.length; right++) {
            basket.merge(fruits[right], 1, Integer::sum);
            while (basket.size() > 2) {
                int out = fruits[left++];
                if (basket.merge(out, -1, Integer::sum) == 0) basket.remove(out);
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each tree is added and removed at most once.",
                "space_complexity": "O(1)",
                "space_why": "The map holds at most 2 kinds.",
                "when_to_use": "The version to write. Same as at most k distinct with k = 2.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "fruits = [1,2,3,2,2]",
            "columns": ["right", "fruit", "map", "left", "best"],
            "rows": [
                ["0", "1", "{1:1}", "0", "1"],
                ["1", "2", "{1:1,2:1}", "0", "2"],
                ["2", "3", "third kind, drop 1", "1", "2"],
                ["3", "2", "{2:2,3:1}", "1", "3"],
                ["4", "2", "{2:3,3:1}", "1", "4"],
            ],
            "result": "The answer is 4, from [2,3,2,2].",
        },
        "mistakes": [
            {
                "name": "The Restart Trap",
                "wrong": "Setting left = right when a third kind appears, throwing away the previous kind that can stay.",
                "right": "Only drop from the left until one kind is gone. The other kind stays.",
            },
            {
                "name": "Leaving a zero in the map",
                "wrong": "Decrementing to 0 but not removing, so size stays 3.",
                "right": "Remove the key at count 0.",
            },
            {
                "name": "Baskets as two variables without a drop rule",
                "wrong": "Storing last two kinds and getting lost when the older one should leave.",
                "right": "A count map plus a left pointer is the drop rule.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,1]", "expected": "3", "why": "Two kinds, whole row."},
            {"input": "[0,1,2,2]", "expected": "3", "why": "[1,2,2]."},
            {"input": "[1,2,3,2,2]", "expected": "4", "why": "[2,3,2,2]."},
            {"input": "[3,3,3,1,2,1,1,2,3,3,4]", "expected": "5", "why": "The longest two-kind run is [1,2,1,1,2]."},
        ],
        "interview_script": [
            "I can pick at most two kinds in a contiguous walk.",
            "I could try every start in O(n²).",
            "I keep a window and a map of at most two kinds.",
            "I drop from the left when a third kind appears, until one kind is gone.",
            "That is O(n) time. I will test one kind and a third kind in the middle.",
        ],
        "follow_ups": [
            {
                "question": "k baskets.",
                "answer": "Same window with k instead of 2. That is at most k distinct.",
            },
            {
                "question": "You may skip trees.",
                "answer": "Then it is not a window. Pick the two most frequent kinds overall.",
            },
            {
                "question": "Return the start index.",
                "answer": "When best improves, store left.",
            },
        ],
        "related_slugs": ["lc-340", "lc-3", "lc-424"],
    },
    {
        "slugs": ["lc-1004"],
        "pattern": "Sliding window, at most k zeros",
        "trigger": "Longest run of ones after flipping at most k zeros.",
        "summary": (
            "A window may hold at most k zeros. Grow right; while zeros exceed k, drop from the left. "
            "The window length is the run of ones you can make."
        ),
        "approaches": [
            {
                "name": "Every start",
                "idea": "From each start, count zeros as you grow, stop past k flips.",
                "steps": [
                    "From each start, walk right counting zeros.",
                    "Stop when the zero count exceeds k.",
                    "Record the length just before that.",
                ],
                "code": """class Solution {
    public int longestOnes(int[] nums, int k) {
        int best = 0;
        for (int start = 0; start < nums.length; start++) {
            int zeros = 0, end = start;
            while (end < nums.length && (nums[end] == 1 || zeros < k)) {
                if (nums[end] == 0) zeros++;
                end++;
            }
            best = Math.max(best, end - start);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-reads to its right.",
                "space_complexity": "O(1)",
                "space_why": "Only the zero count.",
                "when_to_use": "Say it. Then one window.",
                "is_optimal": False,
            },
            {
                "name": "One window of at most k zeros",
                "idea": "Count zeros in the window. Too many: drop from the left until a zero leaves.",
                "steps": [
                    "If the value at nums[right] is 0, add one to the zero count.",
                    "While the zero count is above k, drop the left value and step left forward.",
                    "Record the window length right - left + 1.",
                ],
                "code": """class Solution {
    public int longestOnes(int[] nums, int k) {
        int left = 0, zeros = 0, best = 0;
        for (int right = 0; right < nums.length; right++) {
            if (nums[right] == 0) zeros++;
            while (zeros > k) {
                if (nums[left] == 0) zeros--;
                left++;
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each index enters and leaves at most once.",
                "space_complexity": "O(1)",
                "space_why": "Only left, zeros, and best.",
                "when_to_use": "The version to write.",
                "is_optimal": True,
            },
            {
                "name": "Index the zeros, then measure across k of them",
                "idea": "Write down where the zeros are. The run you can make is then the stretch from one zero to the zero that sits k + 1 places later in that list.",
                "steps": [
                    "Walk once and record the index of every zero, with an imagined zero just before the row and another just after it.",
                    "If the row holds k zeros or fewer, every zero can be flipped, so the answer is the whole length.",
                    "Otherwise take each recorded zero in turn and look at the one k + 1 places further on in the list.",
                    "Everything strictly between those two is ones plus exactly k zeros, so its length is a candidate.",
                    "The answer is the largest of those lengths.",
                ],
                "code": """class Solution {
    public int longestOnes(int[] nums, int k) {
        int n = nums.length;
        int[] spots = new int[n + 2];
        int count = 0;
        spots[count++] = -1;
        for (int i = 0; i < n; i++) {
            if (nums[i] == 0) spots[count++] = i;
        }
        spots[count++] = n;
        if (count - 2 <= k) return n;
        int best = 0;
        for (int i = 0; i + k + 1 < count; i++) {
            best = Math.max(best, spots[i + k + 1] - spots[i] - 1);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One pass records the zeros, then one pass over that shorter list reads a fixed distance ahead.",
                "space_complexity": "O(z)",
                "space_why": "The list holds one index per zero (z of them), plus the two imagined ends.",
                "when_to_use": "When k changes but the row does not: the list of zero positions is built once, and each new budget is answered by reading a different distance ahead. It also hands you which zeros to flip, not only the length.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2",
            "columns": ["right", "zeros", "left", "best"],
            "rows": [
                ["0..3", "1", "0", "4"],
                ["4", "2", "0", "5"],
                ["5", "3 > 2, drop until one zero leaves", "2", "5"],
                ["9", "2", "5", "6"],
            ],
            "result": "The answer is 6.",
        },
        "mistakes": [
            {
                "name": "The Zero-Budget Trap",
                "wrong": "Never shrinking, so a zero stays in the window.",
                "right": "When k is 0, zeros > 0 forces left to pass every zero.",
            },
            {
                "name": "Counting ones instead of zeros",
                "wrong": "Shrinking when ones > k.",
                "right": "k is the flip budget for zeros.",
            },
            {
                "name": "Restarting after k zeros",
                "wrong": "Setting left = right, throwing away the ones you already hold.",
                "right": "Only drop until zeros is back to k.",
            },
        ],
        "edge_cases": [
            {"input": "[1,1,1,0,0,0,1,1,1,1,0]\n2", "expected": "6", "why": "Flip two zeros in the second run."},
            {"input": "[0,0,0]\n0", "expected": "0", "why": "No flips, no ones."},
            {"input": "[0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1]\n3", "expected": "10", "why": "A longer mix."},
            {"input": "[1,1,1]\n0", "expected": "3", "why": "No flips needed: the row is already ones."},
        ],
        "interview_script": [
            "I may flip at most k zeros. I want the longest run of ones.",
            "I could try every start in O(n²).",
            "I keep a window with at most k zeros.",
            "When a (k+1)th zero enters, I drop from the left until a zero leaves.",
            "That is O(n) time. I will test k = 0 and all zeros.",
        ],
        "follow_ups": [
            {
                "question": "Return the start of that run.",
                "answer": "When best improves, store left.",
            },
            {
                "question": "Flip at most k ones to zeros, longest zeros.",
                "answer": "Same window, count ones instead of zeros.",
            },
            {
                "question": "You must flip exactly k.",
                "answer": "The window must contain exactly k zeros at the end. Shrink while zeros > k, only record when zeros == k.",
            },
        ],
        "related_slugs": ["lc-424", "lc-209", "lc-340"],
    },
    {
        "slugs": ["lc-424"],
        "pattern": "Sliding window, replacements",
        "trigger": "Longest same-letter run after at most k replacements.",
        "summary": (
            "A window is valid if length minus the count of its most common letter is at most k. "
            "Those are the letters you would flip."
        ),
        "approaches": [
            {
                "name": "Every start, count letters",
                "idea": "From each start, grow and track the most common letter in that slice.",
                "steps": [
                    "From each start, keep a count of A..Z and the max count.",
                    "Grow right. The window is invalid when its length minus the top count is above k.",
                    "Record the last valid length.",
                ],
                "code": """class Solution {
    public int characterReplacement(String s, int k) {
        int best = 0;
        for (int start = 0; start < s.length(); start++) {
            int[] counts = new int[26];
            int maxCount = 0;
            for (int end = start; end < s.length(); end++) {
                maxCount = Math.max(maxCount, ++counts[s.charAt(end) - 'A']);
                if (end - start + 1 - maxCount > k) break;
                best = Math.max(best, end - start + 1);
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-counts letters to its right.",
                "space_complexity": "O(1)",
                "space_why": "The count array is 26.",
                "when_to_use": "Say it. Then one window.",
                "is_optimal": False,
            },
            {
                "name": "One window",
                "idea": "Grow right. If you would need more than k flips, step left.",
                "steps": [
                    "Add the letter at s[right] to the counts and update the top count.",
                    "While the length minus the top count is above k, drop s[left] and left++.",
                    "You do not need to recompute maxCount on the drop: it can only stay or fall, and a stale max only shrinks extra.",
                    "Record the length.",
                ],
                "code": """class Solution {
    public int characterReplacement(String s, int k) {
        int[] counts = new int[26];
        int left = 0, maxCount = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            maxCount = Math.max(maxCount, ++counts[s.charAt(right) - 'A']);
            while (right - left + 1 - maxCount > k) {
                counts[s.charAt(left) - 'A']--;
                left++;
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each letter enters and leaves at most once.",
                "space_complexity": "O(1)",
                "space_why": "26 counters.",
                "when_to_use": "The version to write.",
                "is_optimal": True,
            },
            {
                "name": "One window per letter, at most k others",
                "idea": "Fix the letter the run should be made of, and the question becomes the longest stretch holding at most k characters that are not it.",
                "steps": [
                    "Pick a letter from A to Z and pretend it is the only one that counts.",
                    "Slide a window over the string, adding one to a counter for each character that is not that letter.",
                    "While that counter is above k, drop characters from the left until it is back inside the budget.",
                    "Record the widest window for this letter, then start again with the next letter.",
                    "The answer is the widest window found over all 26 letters.",
                ],
                "code": """class Solution {
    public int characterReplacement(String s, int k) {
        int best = 0;
        for (char letter = 'A'; letter <= 'Z'; letter++) {
            int left = 0, others = 0;
            for (int right = 0; right < s.length(); right++) {
                if (s.charAt(right) != letter) others++;
                while (others > k) {
                    if (s.charAt(left) != letter) others--;
                    left++;
                }
                best = Math.max(best, right - left + 1);
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(26 n)",
                "time_why": "Each of the 26 letters gets its own pass, and in each pass every character enters and leaves the window once.",
                "space_complexity": "O(1)",
                "space_why": "One counter and one left edge per pass, with no count array at all.",
                "when_to_use": "When you cannot convince yourself on the spot that a stale top count is safe. Here each pass tracks one number against one budget, which is the same window as Max Consecutive Ones III run once per letter.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": 's = "AABABBA", k = 1',
            "columns": ["right", "letter", "maxCount", "need flips", "best"],
            "rows": [
                ["0", "A", "1", "0", "1"],
                ["3", "B", "2", "2 > 1, shrink", "4 from AABA"],
                ["4", "B", "2", "window ABAB? shrink to BABB no, AABABB then shrink", "4"],
                ["5", "B", "3", "1 flip in BBABB? actual best 4", "4"],
            ],
            "result": "The answer is 4.",
        },
        "mistakes": [
            {
                "name": "The Recount Trap",
                "wrong": "Scanning 26 letters on every left++. Still O(n), but easy to get wrong.",
                "right": "A stale maxCount is safe: it never underestimates the flips you need by too little to break the answer.",
            },
            {
                "name": "k replacements of different letters mixed up",
                "wrong": "Thinking you can keep two majority letters.",
                "right": "One window, one majority. Everything else is a flip.",
            },
            {
                "name": "Lowercase",
                "wrong": "Indexing with 'a' on an uppercase string.",
                "right": "This problem is uppercase A-Z. Use `'A'`.",
            },
        ],
        "edge_cases": [
            {"input": '"ABAB"\n2', "expected": "4", "why": "Flip both B or both A."},
            {"input": '"AABABBA"\n1', "expected": "4", "why": "The usual case."},
            {"input": '"AAAA"\n2', "expected": "4", "why": "Already one letter."},
            {"input": '"ABCDE"\n1', "expected": "2", "why": "One flip can join two neighbouring letters."},
        ],
        "interview_script": [
            "I may replace at most k letters. I want the longest run of one letter.",
            "I could try every start in O(n²).",
            "I treat a window as valid if its length minus the top letter's count is at most k.",
            "I grow right and shrink left when I would need more than k flips.",
            "That is O(n) time. I will test k covering the whole string and k = 1.",
        ],
        "follow_ups": [
            {
                "question": "Lowercase and uppercase mixed.",
                "answer": "Use a map, or 52 slots. Same length-minus-maxCount rule.",
            },
            {
                "question": "Must use exactly k replacements.",
                "answer": "Only record when length - maxCount == k, after shrinking while it is above k.",
            },
            {
                "question": "Return the substring.",
                "answer": "When best improves, store left.",
            },
        ],
        "related_slugs": ["lc-1004", "lc-3", "lc-340"],
    },
    {
        "slugs": ["lc-239"],
        "pattern": "Monotonic deque, sliding window",
        "trigger": "The maximum of every window of size k as it slides.",
        "summary": (
            "Keep indices in a deque, front to back decreasing in value. "
            "The front is the max. Drop indices that left the window, and drop smaller values from the back."
        ),
        "approaches": [
            {
                "name": "Scan each window",
                "idea": "For each start, walk k values and take the max.",
                "steps": [
                    "For each start i, scan the k values from i to i+k-1.",
                    "Take the max of those k values.",
                    "Store that max in the answer at i.",
                ],
                "code": """class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        if (nums.length == 0 || k == 0) return new int[0];
        int[] out = new int[nums.length - k + 1];
        for (int i = 0; i < out.length; i++) {
            int max = nums[i];
            for (int j = i + 1; j < i + k; j++) max = Math.max(max, nums[j]);
            out[i] = max;
        }
        return out;
    }
}
""",
                "time_complexity": "O(n k)",
                "time_why": "Each of n-k+1 windows re-reads k values.",
                "space_complexity": "O(1)",
                "space_why": "Besides the output, only the running max.",
                "when_to_use": "Say it. Then a deque.",
                "is_optimal": False,
            },
            {
                "name": "Decreasing deque of indices",
                "idea": "A smaller value under a larger newer one can never be a later max.",
                "steps": [
                    "Deque holds indices, values decreasing from front to back.",
                    "Pop the front if it is outside the window (index <= i-k).",
                    "Pop the back while nums[back] <= nums[i], then push i.",
                    "Once i >= k-1, the front is the window max.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        if (nums.length == 0 || k == 0) return new int[0];
        int[] out = new int[nums.length - k + 1];
        Deque<Integer> window = new ArrayDeque<>();
        for (int i = 0; i < nums.length; i++) {
            while (!window.isEmpty() && window.peekFirst() <= i - k) window.pollFirst();
            while (!window.isEmpty() && nums[window.peekLast()] <= nums[i]) window.pollLast();
            window.addLast(i);
            if (i >= k - 1) out[i - k + 1] = nums[window.peekFirst()];
        }
        return out;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each index is pushed and popped at most once.",
                "space_complexity": "O(k)",
                "space_why": "The deque holds at most k indices.",
                "when_to_use": "The version to write.",
                "is_optimal": True,
            },
            {
                "name": "Block maxima, forwards and backwards",
                "idea": "Cut the row into fixed blocks of k. Any window of k values then covers the end of one block and the start of the next, so two precomputed maxima answer it.",
                "steps": [
                    "Split the row into blocks of k values, the first starting at index 0.",
                    "Going left to right, record for each position the largest value from the start of its block up to that position.",
                    "Going right to left, record for each position the largest value from that position to the end of its block.",
                    "The window that starts at i ends at i + k - 1, and those two positions are either in the same block or in neighbouring ones.",
                    "So the window's max is the larger of the right-to-left value at i and the left-to-right value at i + k - 1.",
                ],
                "code": """class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        if (n == 0 || k == 0) return new int[0];
        int[] fromBlockStart = new int[n];
        int[] toBlockEnd = new int[n];
        for (int i = 0; i < n; i++) {
            fromBlockStart[i] = i % k == 0 ? nums[i] : Math.max(fromBlockStart[i - 1], nums[i]);
        }
        for (int i = n - 1; i >= 0; i--) {
            boolean lastOfBlock = i == n - 1 || i % k == k - 1;
            toBlockEnd[i] = lastOfBlock ? nums[i] : Math.max(toBlockEnd[i + 1], nums[i]);
        }
        int[] out = new int[n - k + 1];
        for (int i = 0; i + k <= n; i++) {
            out[i] = Math.max(toBlockEnd[i], fromBlockStart[i + k - 1]);
        }
        return out;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Three passes over the row, each doing one comparison per value.",
                "space_complexity": "O(n)",
                "space_why": "Two arrays of n values, one for each direction.",
                "when_to_use": "When the windows are wanted out of order, or only a few of them: the two arrays are built once and any window is then a single comparison. It is the prefix-sum trick with max in place of add.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,3,-1,-3,5,3,6,7], k = 3",
            "columns": ["i", "value", "deque values", "window max"],
            "rows": [
                ["0", "1", "[1]", "-"],
                ["1", "3", "[3]", "-"],
                ["2", "-1", "[3,-1]", "3"],
                ["3", "-3", "[3,-1,-3]", "3"],
                ["4", "5", "[5]", "5"],
                ["5", "3", "[5,3]", "5"],
                ["6", "6", "[6]", "6"],
            ],
            "result": "The answer is [3,3,5,5,6,7].",
        },
        "mistakes": [
            {
                "name": "The Value Trap",
                "wrong": "A deque of values, so you cannot tell when the max has slid out.",
                "right": "Store indices. Drop the front when index <= i-k.",
            },
            {
                "name": "Using a max-heap only",
                "wrong": "A heap of k values without lazy-delete, so expired maxes stay.",
                "right": "Store indices in a deque. Drop the front when it has left the window.",
            },
            {
                "name": "Strict vs equal",
                "wrong": "Keeping equal values behind a new equal, which wastes deque slots.",
                "right": "Pop while `nums[back] <= nums[i]`. The newer equal is a better max (lasts longer).",
            },
        ],
        "edge_cases": [
            {"input": "[1,3,-1,-3,5,3,6,7]\n3", "expected": "[3,3,5,5,6,7]", "why": "The usual case."},
            {"input": "[1]\n1", "expected": "[1]", "why": "k = 1."},
            {"input": "[9,11]\n2", "expected": "[11]", "why": "One window."},
            {"input": "[1,-1]\n1", "expected": "[1,-1]", "why": "k = 1, so each window is a single value."},
        ],
        "interview_script": [
            "I need the max of every window of size k.",
            "I could scan each window in O(n k).",
            "I keep indices in a deque, front to back decreasing.",
            "I drop the front if it left the window, and drop smaller backs before I push i.",
            "That is O(n) time and O(k) space. I will test k = 1 and k = n.",
        ],
        "follow_ups": [
            {
                "question": "Window minimum.",
                "answer": "Same deque, increasing instead of decreasing.",
            },
            {
                "question": "k changes, or queries of many windows.",
                "answer": "Sparse tables or a segment tree if k varies. For one k, the deque is enough.",
            },
            {
                "question": "Return the min and the max of each window.",
                "answer": "Two deques, or one deque of max and one of min.",
            },
        ],
        "related_slugs": ["lc-739", "lc-84", "lc-209"],
    },
    {
        "slugs": ["lc-438"],
        "pattern": "Fixed window, anagrams",
        "trigger": "Start indices of every anagram of p inside s.",
        "summary": (
            "A window the length of p: count letters, and when the counts match p, record the start. "
            "Slide by adding one letter and dropping the one that left."
        ),
        "approaches": [
            {
                "name": "Sort every slice",
                "idea": "For each start, sort s[start..start+|p|) and compare to sorted p.",
                "steps": [
                    "Sort the letters of p into a key.",
                    "For each start that fits, copy that slice, sort, and compare.",
                    "On a match, add the start index.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> findAnagrams(String s, String p) {
        List<Integer> out = new ArrayList<>();
        if (s.length() < p.length()) return out;
        char[] need = p.toCharArray();
        Arrays.sort(need);
        String key = new String(need);
        int m = p.length();
        for (int i = 0; i + m <= s.length(); i++) {
            char[] slice = s.substring(i, i + m).toCharArray();
            Arrays.sort(slice);
            if (key.equals(new String(slice))) out.add(i);
        }
        return out;
    }
}
""",
                "time_complexity": "O(n m log m)",
                "time_why": "Each of n starts sorts a slice of length m.",
                "space_complexity": "O(m)",
                "space_why": "The slice copy.",
                "when_to_use": "Say it. Then count arrays.",
                "is_optimal": False,
            },
            {
                "name": "Count window of length |p|",
                "idea": "26 counters for p and for the window. Slide, then compare the two arrays.",
                "steps": [
                    "Count the letters of p into a need array of 26.",
                    "Walk s. Add s[i]. If i is at least |p|, drop the letter that left the window.",
                    "When the window is full, if the two count arrays match, add the start i-|p|+1.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> findAnagrams(String s, String p) {
        List<Integer> out = new ArrayList<>();
        if (s.length() < p.length()) return out;
        int[] need = new int[26];
        int[] window = new int[26];
        for (char c : p.toCharArray()) need[c - 'a']++;
        for (int i = 0; i < s.length(); i++) {
            window[s.charAt(i) - 'a']++;
            if (i >= p.length()) window[s.charAt(i - p.length()) - 'a']--;
            if (i >= p.length() - 1 && Arrays.equals(need, window)) out.add(i - p.length() + 1);
        }
        return out;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each letter of s is added once and dropped once. Comparing 26 counters is constant.",
                "space_complexity": "O(1)",
                "space_why": "Two arrays of 26.",
                "when_to_use": "The version to write.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "cbaebabacd", p = "abc"',
            "columns": ["i", "add", "drop", "match?", "starts"],
            "rows": [
                ["2", "c,b,a", "-", "yes abc", "[0]"],
                ["3", "e", "c", "no", "[0]"],
                ["6", "b,a,b,a wait at 6: bac", "window bac", "yes", "[0,6]"],
            ],
            "result": "The starts are 0 and 6.",
        },
        "mistakes": [
            {
                "name": "The Off-By-One Trap",
                "wrong": "Comparing before the window has length |p|.",
                "right": "Only compare when i >= |p| - 1.",
            },
            {
                "name": "A HashSet of letters",
                "wrong": "Checking the same letters, ignoring counts, so ab and aab look the same.",
                "right": "Counts must match, including duplicates.",
            },
            {
                "name": "Order of the answer",
                "wrong": "Worrying about sort order. The tests accept any order of starts.",
                "right": "Left-to-right starts are the natural order.",
            },
        ],
        "edge_cases": [
            {"input": '"cbaebabacd"\n"abc"', "expected": "[0,6]", "why": "Two anagrams."},
            {"input": '"abab"\n"ab"', "expected": "[0,1,2]", "why": "Overlapping."},
            {"input": '"aa"\n"bb"', "expected": "[]", "why": "No match."},
            {"input": '"baa"\n"aa"', "expected": "[1]", "why": "The only anagram starts at index 1."},
        ],
        "interview_script": [
            "I need every start index of an anagram of p inside s.",
            "I could sort each slice of length |p|. That is O(n m log m).",
            "I keep a window of length |p| and 26 counters.",
            "I add one letter, drop one letter, and compare the counts.",
            "That is O(n) time. I will test overlapping hits and no hit.",
        ],
        "follow_ups": [
            {
                "question": "Return true if any anagram exists.",
                "answer": "Permutation in String. Return at the first match.",
            },
            {
                "question": "Unicode.",
                "answer": "Two HashMaps, or a match-count of kinds instead of Arrays.equals.",
            },
            {
                "question": "p is much longer than s.",
                "answer": "Return an empty list at once.",
            },
        ],
        "related_slugs": ["lc-567", "lc-49", "lc-76"],
    },
    {
        "slugs": ["lc-567"],
        "pattern": "Fixed window, anagrams",
        "trigger": "Does s2 contain a permutation of s1 as a substring.",
        "summary": (
            "A window the length of s1 sliding on s2. If the letter counts ever match, return true."
        ),
        "approaches": [
            {
                "name": "Sort every slice",
                "idea": "Sort s1, then sort each slice of s2 of that length.",
                "steps": [
                    "If s1 is longer than s2, return false.",
                    "Sort the letters of s1 into a key.",
                    "For each start, sort that slice of s2 and compare.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean checkInclusion(String s1, String s2) {
        if (s1.length() > s2.length()) return false;
        char[] need = s1.toCharArray();
        Arrays.sort(need);
        String key = new String(need);
        int m = s1.length();
        for (int i = 0; i + m <= s2.length(); i++) {
            char[] slice = s2.substring(i, i + m).toCharArray();
            Arrays.sort(slice);
            if (key.equals(new String(slice))) return true;
        }
        return false;
    }
}
""",
                "time_complexity": "O(n m log m)",
                "time_why": "Each start sorts a slice of length m.",
                "space_complexity": "O(m)",
                "space_why": "The slice copy.",
                "when_to_use": "Say it. Then counts.",
                "is_optimal": False,
            },
            {
                "name": "Count window",
                "idea": "Same as find-all-anagrams, but return true at the first match.",
                "steps": [
                    "Count the letters of s1 into a need array of 26.",
                    "Slide a window of that length on s2.",
                    "If the counts match, return true.",
                    "If the walk ends, return false.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean checkInclusion(String s1, String s2) {
        if (s1.length() > s2.length()) return false;
        int[] need = new int[26];
        int[] window = new int[26];
        for (char c : s1.toCharArray()) need[c - 'a']++;
        for (int i = 0; i < s2.length(); i++) {
            window[s2.charAt(i) - 'a']++;
            if (i >= s1.length()) window[s2.charAt(i - s1.length()) - 'a']--;
            if (Arrays.equals(need, window)) return true;
        }
        return false;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each letter of s2 is added and dropped once.",
                "space_complexity": "O(1)",
                "space_why": "Two arrays of 26.",
                "when_to_use": "The version to write.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's1 = "ab", s2 = "eidbaooo"',
            "columns": ["i", "window", "counts match?"],
            "rows": [
                ["1", "ei", "no"],
                ["2", "id", "no"],
                ["3", "db", "no"],
                ["4", "ba", "yes"],
            ],
            "result": "The answer is true.",
        },
        "mistakes": [
            {
                "name": "The Gap Trap",
                "wrong": "A two-pointer on s2 that skips letters.",
                "right": "The letters must be neighbours. The window length is |s1|.",
            },
            {
                "name": "A set instead of counts",
                "wrong": "ab and aab look equal in a set.",
                "right": "Counts must match.",
            },
            {
                "name": "s1 longer than s2",
                "wrong": "Walking and crashing, or returning true.",
                "right": "Return false at once.",
            },
        ],
        "edge_cases": [
            {"input": '"ab"\n"eidbaooo"', "expected": "true", "why": "ba is a permutation of ab."},
            {"input": '"ab"\n"eidboaoo"', "expected": "false", "why": "a and b never sit together."},
            {"input": '"adc"\n"dcda"', "expected": "true", "why": "cda / dcd / cda — dcda has cda."},
            {"input": '"ab"\n"a"', "expected": "false", "why": "s1 is longer than s2, so no window fits."},
        ],
        "interview_script": [
            "I need to know if s2 contains a permutation of s1 as a substring.",
            "I could sort every slice. That is O(n m log m).",
            "I slide a window of length |s1| and compare 26 counters.",
            "On the first match I return true.",
            "That is O(n) time. I will test s1 longer than s2 and a near-miss.",
        ],
        "follow_ups": [
            {
                "question": "Return the start index.",
                "answer": "Return i - s1.length() + 1 on the first match, or -1.",
            },
            {
                "question": "Return every start.",
                "answer": "Find All Anagrams. Same loop, collect indices.",
            },
            {
                "question": "s1 and s2 are huge binary strings.",
                "answer": "Two counters still work. Or rolling hashes with care for collisions.",
            },
        ],
        "related_slugs": ["lc-438", "lc-76", "lc-49"],
    },
]




