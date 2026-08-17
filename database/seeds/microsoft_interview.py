"""Microsoft Interview tracker problems.

Canonical match key is LeetCode ID, stored as slug ``lc-{id}``.
Existing catalog titles (Pair Target, …) are original problems and are not aliases.
"""

from __future__ import annotations

LIST_NAME = "Microsoft Interview"
LIST_DESCRIPTION = "Coding problems from the Microsoft Interview practice tracker."

# Source of truth: tracker order (47 problems). The prompt's ID dump omitted 124 and 207.
EXPECTED_LEETCODE_IDS = [
    3, 904, 340, 424, 76, 438, 567, 209, 1004,
    11, 15, 42, 167, 283, 26, 125, 88,
    1, 49, 347, 560, 128, 242, 217,
    704, 33, 34, 153, 162, 74, 875,
    94, 102, 104, 226, 235, 98, 230, 105, 124,
    200, 133, 207, 210, 994, 417, 127,
]


def sig(method: str, params: list[tuple[str, str]], return_type: str, compare: str = "exact") -> dict:
    return {
        "class_name": "Solution",
        "method_name": method,
        "params": [{"name": name, "type": typ} for name, typ in params],
        "return_type": return_type,
        "compare": compare,
    }


def leetcode_slug(leetcode_id: int) -> str:
    return f"lc-{leetcode_id}"


def _starter(method: str, params: list[tuple[str, str]], return_type: str) -> str:
    needs_util = "List" in return_type or any("List" in typ for _, typ in params)
    args = ", ".join(f"{typ} {name}" for name, typ in params)
    header = "import java.util.*;\n" if needs_util else ""
    body = "        return nums;\n" if return_type != "void" and method in {"moveZeroes", "merge"} else "        \n"
    return f"{header}class Solution {{\n    public {return_type} {method}({args}) {{\n{body}    }}\n}}\n"


def _p(
    leetcode_id: int,
    title: str,
    difficulty: str,
    tag: str,
    method: str,
    params: list[tuple[str, str]],
    return_type: str,
    description: str,
    tests: list[dict],
    *,
    compare: str = "exact",
    constraints: str = "",
    input_format: str = "",
    output_format: str = "",
    hints: list[str] | None = None,
    examples: list[dict] | None = None,
    explanation: str = "",
) -> dict:
    visible = [case for case in tests if not case.get("hidden")]
    return {
        "leetcode_id": leetcode_id,
        "title": title,
        "slug": leetcode_slug(leetcode_id),
        "difficulty": difficulty,
        "tag": tag,
        "description": description,
        "constraints": constraints,
        "input_format": input_format,
        "output_format": output_format,
        "explanation": explanation,
        "hints": hints or [],
        "examples": examples
        or [
            {"input": case["input"].replace("\n", "  "), "output": case["expected"], "explanation": ""}
            for case in visible[:2]
        ],
        "starter_code": _starter(method, params, return_type),
        "function_signature": sig(method, params, return_type, compare),
        "tests": tests,
    }


SLIDING = "sliding-window"
TWO = "two-pointers"
HASH = "hashmap-frequency"
BIN = "binary-search"
TREE = "trees-bst"
GRAPH = "graphs-bfs-dfs"

TAGS = [
    ("Sliding Window", SLIDING),
    ("Two Pointers", TWO),
    ("HashMap / Frequency Counting", HASH),
    ("Binary Search", BIN),
    ("Trees & BST", TREE),
    ("Graphs / BFS / DFS", GRAPH),
]


PROBLEMS: list[dict] = [
    _p(
        3, "Longest Substring Without Repeating Characters", "MEDIUM", SLIDING,
        "lengthOfLongestSubstring", [("s", "String")], "int",
        "Given a string `s`, return the length of the longest substring that contains no repeated characters.",
        [
            {"input": '"abcabcbb"', "expected": "3", "hidden": False, "order": 1},
            {"input": '"bbbbb"', "expected": "1", "hidden": False, "order": 2},
            {"input": '"pwwkew"', "expected": "3", "hidden": False, "order": 3},
            {"input": '""', "expected": "0", "hidden": True, "order": 4},
            {"input": '"dvdf"', "expected": "3", "hidden": True, "order": 5},
        ],
        constraints="0 <= s.length <= 5 * 10^4",
        input_format="A quoted string",
        output_format="An integer length",
    ),
    _p(
        904, "Fruit Into Baskets", "MEDIUM", SLIDING,
        "totalFruit", [("fruits", "int[]")], "int",
        "You are picking fruit from trees in a row. `fruits[i]` is the type of fruit on tree `i`.\n\n"
        "You have two baskets, each holding only one type. Starting at any tree, walk right and pick "
        "exactly one fruit from every tree until you cannot. Return the maximum number of fruits you can collect.",
        [
            {"input": "[1,2,1]", "expected": "3", "hidden": False, "order": 1},
            {"input": "[0,1,2,2]", "expected": "3", "hidden": False, "order": 2},
            {"input": "[1,2,3,2,2]", "expected": "4", "hidden": False, "order": 3},
            {"input": "[3,3,3,1,2,1,1,2,3,3,4]", "expected": "5", "hidden": True, "order": 4},
        ],
        constraints="1 <= fruits.length <= 10^5\n0 <= fruits[i] < fruits.length",
        input_format="Integer array fruits",
        output_format="An integer",
    ),
    _p(
        340, "Longest Substring with At Most K Distinct Characters", "MEDIUM", SLIDING,
        "lengthOfLongestSubstringKDistinct", [("s", "String"), ("k", "int")], "int",
        "Given a string `s` and an integer `k`, return the length of the longest substring that contains "
        "at most `k` distinct characters.",
        [
            {"input": '"eceba"\n2', "expected": "3", "hidden": False, "order": 1},
            {"input": '"aa"\n1', "expected": "2", "hidden": False, "order": 2},
            {"input": '"a"\n0', "expected": "0", "hidden": True, "order": 3},
            {"input": '"abcadcacacaca"\n3', "expected": "11", "hidden": True, "order": 4},
        ],
        constraints="0 <= s.length <= 5 * 10^4\n0 <= k <= 50",
        input_format="Line 1: quoted string\nLine 2: integer k",
        output_format="An integer length",
    ),
    _p(
        424, "Longest Repeating Character Replacement", "MEDIUM", SLIDING,
        "characterReplacement", [("s", "String"), ("k", "int")], "int",
        "You may replace at most `k` characters in `s`. Return the length of the longest substring "
        "containing the same letter after those replacements.",
        [
            {"input": '"ABAB"\n2', "expected": "4", "hidden": False, "order": 1},
            {"input": '"AABABBA"\n1', "expected": "4", "hidden": False, "order": 2},
            {"input": '"AAAA"\n2', "expected": "4", "hidden": True, "order": 3},
            {"input": '"ABCDE"\n1', "expected": "2", "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 10^5\ns consists of uppercase English letters\n0 <= k <= s.length",
        input_format="Line 1: quoted string\nLine 2: integer k",
        output_format="An integer length",
    ),
    _p(
        76, "Minimum Window Substring", "HARD", SLIDING,
        "minWindow", [("s", "String"), ("t", "String")], "String",
        "Return the shortest substring of `s` that covers every character in `t` (including duplicates). "
        "If no such window exists, return the empty string. If there are several answers, return any one of them.",
        [
            {"input": '"ADOBECODEBANC"\n"ABC"', "expected": '"BANC"', "hidden": False, "order": 1},
            {"input": '"a"\n"a"', "expected": '"a"', "hidden": False, "order": 2},
            {"input": '"a"\n"aa"', "expected": '""', "hidden": False, "order": 3},
            {"input": '"ab"\n"b"', "expected": '"b"', "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length, t.length <= 10^5",
        input_format="Line 1: s\nLine 2: t",
        output_format="A quoted string",
    ),
    _p(
        438, "Find All Anagrams in a String", "MEDIUM", SLIDING,
        "findAnagrams", [("s", "String"), ("p", "String")], "List<Integer>",
        "Return the start indices of every anagram of `p` inside `s`. The order of indices does not matter.",
        [
            {"input": '"cbaebabacd"\n"abc"', "expected": "[0,6]", "hidden": False, "order": 1},
            {"input": '"abab"\n"ab"', "expected": "[0,1,2]", "hidden": False, "order": 2},
            {"input": '"aa"\n"bb"', "expected": "[]", "hidden": True, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= s.length, p.length <= 3 * 10^4",
        input_format="Line 1: s\nLine 2: p",
        output_format="An integer array of start indices",
    ),
    _p(
        567, "Permutation in String", "MEDIUM", SLIDING,
        "checkInclusion", [("s1", "String"), ("s2", "String")], "boolean",
        "Return true if `s2` contains a permutation of `s1` as a substring.",
        [
            {"input": '"ab"\n"eidbaooo"', "expected": "true", "hidden": False, "order": 1},
            {"input": '"ab"\n"eidboaoo"', "expected": "false", "hidden": False, "order": 2},
            {"input": '"adc"\n"dcda"', "expected": "true", "hidden": True, "order": 3},
        ],
        constraints="1 <= s1.length, s2.length <= 10^4",
        input_format="Line 1: s1\nLine 2: s2",
        output_format="true or false",
    ),
    _p(
        209, "Minimum Size Subarray Sum", "MEDIUM", SLIDING,
        "minSubArrayLen", [("target", "int"), ("nums", "int[]")], "int",
        "Return the minimal length of a contiguous subarray whose sum is at least `target`. "
        "If no such subarray exists, return 0.",
        [
            {"input": "7\n[2,3,1,2,4,3]", "expected": "2", "hidden": False, "order": 1},
            {"input": "4\n[1,4,4]", "expected": "1", "hidden": False, "order": 2},
            {"input": "11\n[1,1,1,1,1,1,1,1]", "expected": "0", "hidden": False, "order": 3},
            {"input": "15\n[1,2,3,4,5]", "expected": "5", "hidden": True, "order": 4},
        ],
        constraints="1 <= target <= 10^9\n1 <= nums.length <= 10^5\n1 <= nums[i] <= 10^4",
        input_format="Line 1: target\nLine 2: nums",
        output_format="An integer",
    ),
    _p(
        1004, "Max Consecutive Ones III", "MEDIUM", SLIDING,
        "longestOnes", [("nums", "int[]"), ("k", "int")], "int",
        "`nums` is a binary array. You may flip at most `k` zeros to ones. "
        "Return the longest run of ones you can obtain.",
        [
            {"input": "[1,1,1,0,0,0,1,1,1,1,0]\n2", "expected": "6", "hidden": False, "order": 1},
            {"input": "[0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1]\n3", "expected": "10", "hidden": False, "order": 2},
            {"input": "[0,0,0]\n0", "expected": "0", "hidden": True, "order": 3},
        ],
        constraints="1 <= nums.length <= 10^5\nnums[i] is 0 or 1\n0 <= k <= nums.length",
        input_format="Line 1: nums\nLine 2: k",
        output_format="An integer",
    ),
    _p(
        11, "Container With Most Water", "MEDIUM", TWO,
        "maxArea", [("height", "int[]")], "int",
        "Vertical lines are drawn at x = i with height `height[i]`. Choose two lines so the "
        "axis-aligned container they form holds the most water. Return that area.",
        [
            {"input": "[1,8,6,2,5,4,8,3,7]", "expected": "49", "hidden": False, "order": 1},
            {"input": "[1,1]", "expected": "1", "hidden": False, "order": 2},
            {"input": "[4,3,2,1,4]", "expected": "16", "hidden": True, "order": 3},
        ],
        constraints="2 <= height.length <= 10^5\n0 <= height[i] <= 10^4",
        input_format="Integer array height",
        output_format="An integer area",
    ),
    _p(
        15, "3Sum", "MEDIUM", TWO,
        "threeSum", [("nums", "int[]")], "List<List<Integer>>",
        "Return all unique triplets `nums[i], nums[j], nums[k]` such that i, j, k are distinct "
        "and the three values sum to zero. Triplets may be returned in any order.",
        [
            {"input": "[-1,0,1,2,-1,-4]", "expected": "[[-1,-1,2],[-1,0,1]]", "hidden": False, "order": 1},
            {"input": "[0,1,1]", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[0,0,0]", "expected": "[[0,0,0]]", "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5",
        input_format="Integer array nums",
        output_format="A list of triplets",
    ),
    _p(
        42, "Trapping Rain Water", "HARD", TWO,
        "trap", [("height", "int[]")], "int",
        "Given an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
        [
            {"input": "[0,1,0,2,1,0,1,3,2,1,2,1]", "expected": "6", "hidden": False, "order": 1},
            {"input": "[4,2,0,3,2,5]", "expected": "9", "hidden": False, "order": 2},
            {"input": "[4,2,3]", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= height.length <= 2 * 10^4\n0 <= height[i] <= 10^5",
        input_format="Integer array height",
        output_format="An integer",
    ),
    _p(
        167, "Two Sum II - Input Array Is Sorted", "MEDIUM", TWO,
        "twoSum", [("numbers", "int[]"), ("target", "int")], "int[]",
        "`numbers` is sorted in non-decreasing order. Return 1-based indices of the two numbers that add to `target`. "
        "Exactly one solution exists. You may not use the same element twice.",
        [
            {"input": "[2,7,11,15]\n9", "expected": "[1,2]", "hidden": False, "order": 1},
            {"input": "[2,3,4]\n6", "expected": "[1,3]", "hidden": False, "order": 2},
            {"input": "[-1,0]\n-1", "expected": "[1,2]", "hidden": False, "order": 3},
        ],
        constraints="2 <= numbers.length <= 3 * 10^4\nnumbers is sorted\nExactly one solution exists.",
        input_format="Line 1: numbers\nLine 2: target",
        output_format="A 1-based index pair",
    ),
    _p(
        283, "Move Zeroes", "EASY", TWO,
        "moveZeroes", [("nums", "int[]")], "int[]",
        "Move every zero in `nums` to the end while keeping the relative order of the non-zero values. "
        "Do this in-place. On this platform, mutate `nums` and return it.",
        [
            {"input": "[0,1,0,3,12]", "expected": "[1,3,12,0,0]", "hidden": False, "order": 1},
            {"input": "[0]", "expected": "[0]", "hidden": False, "order": 2},
            {"input": "[1,0]", "expected": "[1,0]", "hidden": True, "order": 3},
        ],
        constraints="1 <= nums.length <= 10^4\n-2^31 <= nums[i] <= 2^31 - 1",
        input_format="Integer array nums",
        output_format="The array after moving zeroes",
    ),
    _p(
        26, "Remove Duplicates from Sorted Array", "EASY", TWO,
        "removeDuplicates", [("nums", "int[]")], "int",
        "`nums` is sorted in non-decreasing order. Remove duplicates in-place so each unique value appears once "
        "at the front, in the same order. Return the count of unique values `k`. The first `k` slots of `nums` "
        "must hold the unique values.",
        [
            {"input": "[1,1,2]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[0,0,1,1,1,2,2,3,3,4]", "expected": "5", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= nums.length <= 3 * 10^4\nnums is sorted",
        input_format="Integer array nums",
        output_format="The unique count k",
    ),
    _p(
        125, "Valid Palindrome", "EASY", TWO,
        "isPalindrome", [("s", "String")], "boolean",
        "Return true if `s` is a palindrome after converting letters to lowercase and removing every "
        "non-alphanumeric character.",
        [
            {"input": '"A man, a plan, a canal: Panama"', "expected": "true", "hidden": False, "order": 1},
            {"input": '"race a car"', "expected": "false", "hidden": False, "order": 2},
            {"input": '" "', "expected": "true", "hidden": False, "order": 3},
            {"input": '"0P"', "expected": "false", "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 2 * 10^5",
        input_format="A quoted string",
        output_format="true or false",
    ),
    _p(
        88, "Merge Sorted Array", "EASY", TWO,
        "merge", [("nums1", "int[]"), ("m", "int"), ("nums2", "int[]"), ("n", "int")], "int[]",
        "`nums1` has length m + n: the first m slots are a sorted array and the rest are unused. "
        "`nums2` holds n sorted values. Merge `nums2` into `nums1` in sorted order. "
        "On this platform, mutate `nums1` and return it.",
        [
            {"input": "[1,2,3,0,0,0]\n3\n[2,5,6]\n3", "expected": "[1,2,2,3,5,6]", "hidden": False, "order": 1},
            {"input": "[1]\n1\n[]\n0", "expected": "[1]", "hidden": False, "order": 2},
            {"input": "[0]\n0\n[1]\n1", "expected": "[1]", "hidden": False, "order": 3},
        ],
        constraints="0 <= m, n <= 200\nnums1.length == m + n\nnums2.length == n",
        input_format="Line 1: nums1\nLine 2: m\nLine 3: nums2\nLine 4: n",
        output_format="The merged nums1 array",
    ),
    _p(
        1, "Two Sum", "EASY", HASH,
        "twoSum", [("nums", "int[]"), ("target", "int")], "int[]",
        "Return the indices of the two distinct elements that add up to `target`. Exactly one solution exists. "
        "Return the indices in any order.",
        [
            {"input": "[2,7,11,15]\n9", "expected": "[0,1]", "hidden": False, "order": 1},
            {"input": "[3,2,4]\n6", "expected": "[1,2]", "hidden": False, "order": 2},
            {"input": "[3,3]\n6", "expected": "[0,1]", "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="2 <= nums.length <= 10^4\nExactly one solution exists.",
        input_format="Line 1: nums\nLine 2: target",
        output_format="An index pair",
    ),
    _p(
        49, "Group Anagrams", "MEDIUM", HASH,
        "groupAnagrams", [("strs", "String[]")], "List<List<String>>",
        "Group the strings that are anagrams of one another. Return the groups in any order; "
        "order inside a group does not matter.",
        [
            {"input": '["eat","tea","tan","ate","nat","bat"]', "expected": '[["bat"],["nat","tan"],["ate","eat","tea"]]', "hidden": False, "order": 1},
            {"input": '[""]', "expected": '[[""]]', "hidden": False, "order": 2},
            {"input": '["a"]', "expected": '[["a"]]', "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= strs.length <= 10^4\nstrs[i] consists of lowercase English letters",
        input_format="A JSON array of strings",
        output_format="A list of groups",
    ),
    _p(
        347, "Top K Frequent Elements", "MEDIUM", HASH,
        "topKFrequent", [("nums", "int[]"), ("k", "int")], "int[]",
        "Return the `k` most frequent values in `nums`. The answer may be returned in any order. "
        "It is guaranteed to be unique.",
        [
            {"input": "[1,1,1,2,2,3]\n2", "expected": "[1,2]", "hidden": False, "order": 1},
            {"input": "[1]\n1", "expected": "[1]", "hidden": False, "order": 2},
            {"input": "[4,1,-1,2,-1,2,3]\n2", "expected": "[-1,2]", "hidden": True, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= nums.length <= 10^5\n1 <= k <= number of distinct values",
        input_format="Line 1: nums\nLine 2: k",
        output_format="An integer array of size k",
    ),
    _p(
        560, "Subarray Sum Equals K", "MEDIUM", HASH,
        "subarraySum", [("nums", "int[]"), ("k", "int")], "int",
        "Return the number of contiguous subarrays whose sum equals `k`.",
        [
            {"input": "[1,1,1]\n2", "expected": "2", "hidden": False, "order": 1},
            {"input": "[1,2,3]\n3", "expected": "2", "hidden": False, "order": 2},
            {"input": "[1,-1,0]\n0", "expected": "3", "hidden": True, "order": 3},
        ],
        constraints="1 <= nums.length <= 2 * 10^4\n-1000 <= nums[i] <= 1000",
        input_format="Line 1: nums\nLine 2: k",
        output_format="An integer count",
    ),
    _p(
        128, "Longest Consecutive Sequence", "MEDIUM", HASH,
        "longestConsecutive", [("nums", "int[]")], "int",
        "Return the length of the longest sequence of consecutive integers in `nums`. "
        "The values need not be adjacent in the array. Aim for O(n) time.",
        [
            {"input": "[100,4,200,1,3,2]", "expected": "4", "hidden": False, "order": 1},
            {"input": "[0,3,7,2,5,8,4,6,0,1]", "expected": "9", "hidden": False, "order": 2},
            {"input": "[]", "expected": "0", "hidden": True, "order": 3},
        ],
        constraints="0 <= nums.length <= 10^5",
        input_format="Integer array nums",
        output_format="An integer length",
    ),
    _p(
        242, "Valid Anagram", "EASY", HASH,
        "isAnagram", [("s", "String"), ("t", "String")], "boolean",
        "Return true if `t` is an anagram of `s`.",
        [
            {"input": '"anagram"\n"nagaram"', "expected": "true", "hidden": False, "order": 1},
            {"input": '"rat"\n"car"', "expected": "false", "hidden": False, "order": 2},
            {"input": '"a"\n"ab"', "expected": "false", "hidden": True, "order": 3},
        ],
        constraints="1 <= s.length, t.length <= 5 * 10^4",
        input_format="Line 1: s\nLine 2: t",
        output_format="true or false",
    ),
    _p(
        217, "Contains Duplicate", "EASY", HASH,
        "containsDuplicate", [("nums", "int[]")], "boolean",
        "Return true if any value appears at least twice in `nums`.",
        [
            {"input": "[1,2,3,1]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2,3,4]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[1,1,1,3,3,4,3,2,4,2]", "expected": "true", "hidden": False, "order": 3},
        ],
        constraints="1 <= nums.length <= 10^5",
        input_format="Integer array nums",
        output_format="true or false",
    ),
    _p(
        704, "Binary Search", "EASY", BIN,
        "search", [("nums", "int[]"), ("target", "int")], "int",
        "`nums` is a sorted array of distinct integers. Return the index of `target`, or -1 if it is missing.",
        [
            {"input": "[-1,0,3,5,9,12]\n9", "expected": "4", "hidden": False, "order": 1},
            {"input": "[-1,0,3,5,9,12]\n2", "expected": "-1", "hidden": False, "order": 2},
            {"input": "[5]\n5", "expected": "0", "hidden": True, "order": 3},
        ],
        constraints="1 <= nums.length <= 10^4\nnums is sorted ascending with distinct values",
        input_format="Line 1: nums\nLine 2: target",
        output_format="An index or -1",
    ),
    _p(
        33, "Search in Rotated Sorted Array", "MEDIUM", BIN,
        "search", [("nums", "int[]"), ("target", "int")], "int",
        "`nums` was a distinct sorted array that has been rotated at an unknown pivot. "
        "Return the index of `target`, or -1 if it is missing. Aim for O(log n).",
        [
            {"input": "[4,5,6,7,0,1,2]\n0", "expected": "4", "hidden": False, "order": 1},
            {"input": "[4,5,6,7,0,1,2]\n3", "expected": "-1", "hidden": False, "order": 2},
            {"input": "[1]\n0", "expected": "-1", "hidden": False, "order": 3},
            {"input": "[3,1]\n1", "expected": "1", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 5000\nAll values are distinct",
        input_format="Line 1: nums\nLine 2: target",
        output_format="An index or -1",
    ),
    _p(
        34, "Find First and Last Position of Element in Sorted Array", "MEDIUM", BIN,
        "searchRange", [("nums", "int[]"), ("target", "int")], "int[]",
        "`nums` is a non-decreasing array. Return the first and last indices of `target`, or [-1,-1] if it is missing. "
        "Aim for O(log n).",
        [
            {"input": "[5,7,7,8,8,10]\n8", "expected": "[3,4]", "hidden": False, "order": 1},
            {"input": "[5,7,7,8,8,10]\n6", "expected": "[-1,-1]", "hidden": False, "order": 2},
            {"input": "[]\n0", "expected": "[-1,-1]", "hidden": False, "order": 3},
        ],
        constraints="0 <= nums.length <= 10^5\nnums is sorted non-decreasing",
        input_format="Line 1: nums\nLine 2: target",
        output_format="A pair of indices",
    ),
    _p(
        153, "Find Minimum in Rotated Sorted Array", "MEDIUM", BIN,
        "findMin", [("nums", "int[]")], "int",
        "`nums` was a distinct sorted array that has been rotated. Return the minimum value in O(log n) time.",
        [
            {"input": "[3,4,5,1,2]", "expected": "1", "hidden": False, "order": 1},
            {"input": "[4,5,6,7,0,1,2]", "expected": "0", "hidden": False, "order": 2},
            {"input": "[11,13,15,17]", "expected": "11", "hidden": False, "order": 3},
        ],
        constraints="1 <= nums.length <= 5000\nAll values are distinct",
        input_format="Integer array nums",
        output_format="The minimum value",
    ),
    _p(
        162, "Find Peak Element", "MEDIUM", BIN,
        "findPeakElement", [("nums", "int[]")], "int",
        "A peak is an element strictly greater than its neighbors. `nums[-1]` and `nums[n]` are treated as -∞. "
        "Return the index of any peak. Aim for O(log n). Tests here use arrays with a single peak.",
        [
            {"input": "[1,2,3,1]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[1]", "expected": "0", "hidden": False, "order": 2},
            {"input": "[1,2]", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= nums.length <= 1000\nnums[i] != nums[i + 1]",
        input_format="Integer array nums",
        output_format="A peak index",
    ),
    _p(
        74, "Search a 2D Matrix", "MEDIUM", BIN,
        "searchMatrix", [("matrix", "int[][]"), ("target", "int")], "boolean",
        "Each row is sorted left to right, and the first value of each row is greater than the last value of "
        "the previous row. Return true if `target` is in the matrix.",
        [
            {"input": "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n3", "expected": "true", "hidden": False, "order": 1},
            {"input": "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n13", "expected": "false", "hidden": False, "order": 2},
            {"input": "[[1]]\n1", "expected": "true", "hidden": True, "order": 3},
        ],
        constraints="1 <= m, n <= 100",
        input_format="Line 1: matrix\nLine 2: target",
        output_format="true or false",
    ),
    _p(
        875, "Koko Eating Bananas", "MEDIUM", BIN,
        "minEatingSpeed", [("piles", "int[]"), ("h", "int")], "int",
        "Koko eats all bananas in `h` hours. Each hour she chooses one pile and eats `k` bananas from it "
        "(or the whole pile if it is smaller). Return the minimum integer `k` that lets her finish on time.",
        [
            {"input": "[3,6,7,11]\n8", "expected": "4", "hidden": False, "order": 1},
            {"input": "[30,11,23,4,20]\n5", "expected": "30", "hidden": False, "order": 2},
            {"input": "[30,11,23,4,20]\n6", "expected": "23", "hidden": False, "order": 3},
        ],
        constraints="1 <= piles.length <= 10^4\npiles.length <= h <= 10^9",
        input_format="Line 1: piles\nLine 2: h",
        output_format="The minimum speed k",
    ),
    _p(
        94, "Binary Tree Inorder Traversal", "EASY", TREE,
        "inorderTraversal", [("root", "TreeNode")], "List<Integer>",
        "Return the inorder traversal of a binary tree (left, node, right).",
        [
            {"input": "[1,null,2,3]", "expected": "[1,3,2]", "hidden": False, "order": 1},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "[1]", "hidden": False, "order": 3},
        ],
        constraints="0 <= number of nodes <= 100",
        input_format="Level-order tree array",
        output_format="A list of values",
    ),
    _p(
        102, "Binary Tree Level Order Traversal", "MEDIUM", TREE,
        "levelOrder", [("root", "TreeNode")], "List<List<Integer>>",
        "Return the values of a binary tree grouped by depth, left to right.",
        [
            {"input": "[3,9,20,null,null,15,7]", "expected": "[[3],[9,20],[15,7]]", "hidden": False, "order": 1},
            {"input": "[1]", "expected": "[[1]]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
        ],
        constraints="0 <= number of nodes <= 2000",
        input_format="Level-order tree array",
        output_format="A list of levels",
    ),
    _p(
        104, "Maximum Depth of Binary Tree", "EASY", TREE,
        "maxDepth", [("root", "TreeNode")], "int",
        "Return the maximum depth of a binary tree. An empty tree has depth 0.",
        [
            {"input": "[3,9,20,null,null,15,7]", "expected": "3", "hidden": False, "order": 1},
            {"input": "[1,null,2]", "expected": "2", "hidden": False, "order": 2},
            {"input": "[]", "expected": "0", "hidden": True, "order": 3},
        ],
        constraints="0 <= number of nodes <= 10^4",
        input_format="Level-order tree array",
        output_format="An integer depth",
    ),
    _p(
        226, "Invert Binary Tree", "EASY", TREE,
        "invertTree", [("root", "TreeNode")], "TreeNode",
        "Invert a binary tree by swapping every left and right child, and return the root.",
        [
            {"input": "[4,2,7,1,3,6,9]", "expected": "[4,7,2,9,6,3,1]", "hidden": False, "order": 1},
            {"input": "[2,1,3]", "expected": "[2,3,1]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
        ],
        constraints="0 <= number of nodes <= 100",
        input_format="Level-order tree array",
        output_format="The inverted tree in level order",
    ),
    _p(
        235, "Lowest Common Ancestor of a Binary Search Tree", "MEDIUM", TREE,
        "lowestCommonAncestor", [("root", "TreeNode"), ("p", "int"), ("q", "int")], "int",
        "Given a BST and two node values `p` and `q` that exist in the tree, return the value of their "
        "lowest common ancestor. A node may be an ancestor of itself.\n\n"
        "On this platform `p` and `q` are values, not node references.",
        [
            {"input": "[6,2,8,0,4,7,9,null,null,3,5]\n2\n8", "expected": "6", "hidden": False, "order": 1},
            {"input": "[6,2,8,0,4,7,9,null,null,3,5]\n2\n4", "expected": "2", "hidden": False, "order": 2},
            {"input": "[2,1]\n2\n1", "expected": "2", "hidden": False, "order": 3},
        ],
        constraints="2 <= number of nodes <= 10^5\nAll values are unique\np != q and both exist",
        input_format="Line 1: tree\nLine 2: p\nLine 3: q",
        output_format="The ancestor value",
    ),
    _p(
        98, "Validate Binary Search Tree", "MEDIUM", TREE,
        "isValidBST", [("root", "TreeNode")], "boolean",
        "Return true if the tree is a valid BST: every node is strictly greater than the entire left subtree "
        "and strictly less than the entire right subtree.",
        [
            {"input": "[2,1,3]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[5,1,4,null,null,3,6]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[5,4,6,null,null,3,7]", "expected": "false", "hidden": True, "order": 3},
        ],
        constraints="1 <= number of nodes <= 10^4",
        input_format="Level-order tree array",
        output_format="true or false",
    ),
    _p(
        230, "Kth Smallest Element in a BST", "MEDIUM", TREE,
        "kthSmallest", [("root", "TreeNode"), ("k", "int")], "int",
        "Return the k-th smallest value (1-indexed) in a binary search tree.",
        [
            {"input": "[3,1,4,null,2]\n1", "expected": "1", "hidden": False, "order": 1},
            {"input": "[5,3,6,2,4,null,null,1]\n3", "expected": "3", "hidden": False, "order": 2},
            {"input": "[1]\n1", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= k <= number of nodes <= 10^4",
        input_format="Line 1: tree\nLine 2: k",
        output_format="An integer",
    ),
    _p(
        105, "Construct Binary Tree from Preorder and Inorder Traversal", "MEDIUM", TREE,
        "buildTree", [("preorder", "int[]"), ("inorder", "int[]")], "TreeNode",
        "Build a binary tree from its preorder and inorder traversals. All values are unique.",
        [
            {"input": "[3,9,20,15,7]\n[9,3,15,20,7]", "expected": "[3,9,20,null,null,15,7]", "hidden": False, "order": 1},
            {"input": "[-1]\n[-1]", "expected": "[-1]", "hidden": False, "order": 2},
        ],
        constraints="1 <= number of nodes <= 3000\nAll values are unique",
        input_format="Line 1: preorder\nLine 2: inorder",
        output_format="The tree in level order",
    ),
    _p(
        124, "Binary Tree Maximum Path Sum", "HARD", TREE,
        "maxPathSum", [("root", "TreeNode")], "int",
        "A path is any non-empty sequence of connected nodes. Return the maximum sum of node values along any path. "
        "The path does not need to pass through the root.",
        [
            {"input": "[1,2,3]", "expected": "6", "hidden": False, "order": 1},
            {"input": "[-10,9,20,null,null,15,7]", "expected": "42", "hidden": False, "order": 2},
            {"input": "[-3]", "expected": "-3", "hidden": True, "order": 3},
        ],
        constraints="1 <= number of nodes <= 3 * 10^4\n-1000 <= node.val <= 1000",
        input_format="Level-order tree array",
        output_format="An integer sum",
    ),
    _p(
        200, "Number of Islands", "MEDIUM", GRAPH,
        "numIslands", [("grid", "String[]")], "int",
        "A grid of `'1'` (land) and `'0'` (water) is given as an array of equal-length strings. "
        "An island is a group of `'1'`s connected 4-directionally. Return the number of islands.",
        [
            {"input": '["11110","11010","11000","00000"]', "expected": "1", "hidden": False, "order": 1},
            {"input": '["11000","11000","00100","00011"]', "expected": "3", "hidden": False, "order": 2},
            {"input": '["0"]', "expected": "0", "hidden": True, "order": 3},
        ],
        constraints="1 <= m, n <= 300",
        input_format="A JSON array of equal-length strings of 0/1",
        output_format="An integer count",
    ),
    _p(
        133, "Clone Graph", "MEDIUM", GRAPH,
        "cloneGraph", [("adj", "int[][]")], "int[][]",
        "You are given an undirected connected graph as an adjacency list: `adj[i]` is the 1-based neighbor "
        "list of node `i + 1`. Return a deep copy as an adjacency list in the same form.\n\n"
        "This platform uses adjacency lists instead of `Node` references.",
        [
            {"input": "[[2,4],[1,3],[2,4],[1,3]]", "expected": "[[2,4],[1,3],[2,4],[1,3]]", "hidden": False, "order": 1},
            {"input": "[[]]", "expected": "[[]]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
        ],
        constraints="0 <= number of nodes <= 100",
        input_format="Adjacency list, 1-based neighbors",
        output_format="The cloned adjacency list",
    ),
    _p(
        207, "Course Schedule", "MEDIUM", GRAPH,
        "canFinish", [("numCourses", "int"), ("prerequisites", "int[][]")], "boolean",
        "There are `numCourses` courses labeled 0 to numCourses - 1. `prerequisites[i] = [a, b]` means "
        "you must take `b` before `a`. Return true if you can finish every course (the graph has no cycle).",
        [
            {"input": "2\n[[1,0]]", "expected": "true", "hidden": False, "order": 1},
            {"input": "2\n[[1,0],[0,1]]", "expected": "false", "hidden": False, "order": 2},
            {"input": "1\n[]", "expected": "true", "hidden": True, "order": 3},
        ],
        constraints="1 <= numCourses <= 2000\n0 <= prerequisites.length <= 5000",
        input_format="Line 1: numCourses\nLine 2: prerequisites",
        output_format="true or false",
    ),
    _p(
        210, "Course Schedule II", "MEDIUM", GRAPH,
        "findOrder", [("numCourses", "int"), ("prerequisites", "int[][]")], "int[]",
        "Return a valid order to take all courses given the same prerequisite rules as Course Schedule. "
        "If it is impossible, return an empty array. Tests here have a unique valid order.",
        [
            {"input": "2\n[[1,0]]", "expected": "[0,1]", "hidden": False, "order": 1},
            {"input": "1\n[]", "expected": "[0]", "hidden": False, "order": 2},
            {"input": "2\n[[1,0],[0,1]]", "expected": "[]", "hidden": True, "order": 3},
        ],
        constraints="1 <= numCourses <= 2000",
        input_format="Line 1: numCourses\nLine 2: prerequisites",
        output_format="A course order, or []",
    ),
    _p(
        994, "Rotting Oranges", "MEDIUM", GRAPH,
        "orangesRotting", [("grid", "int[][]")], "int",
        "In a grid, 0 is empty, 1 is a fresh orange, and 2 is a rotten orange. Each minute, every rotten orange "
        "rots its 4-direction neighbors. Return the minutes until every orange is rotten, or -1 if that is impossible.",
        [
            {"input": "[[2,1,1],[1,1,0],[0,1,1]]", "expected": "4", "hidden": False, "order": 1},
            {"input": "[[2,1,1],[0,1,1],[1,0,1]]", "expected": "-1", "hidden": False, "order": 2},
            {"input": "[[0,2]]", "expected": "0", "hidden": False, "order": 3},
        ],
        constraints="1 <= m, n <= 10\ngrid[i][j] is 0, 1, or 2",
        input_format="An integer matrix",
        output_format="Minutes, or -1",
    ),
    _p(
        417, "Pacific Atlantic Water Flow", "MEDIUM", GRAPH,
        "pacificAtlantic", [("heights", "int[][]")], "List<List<Integer>>",
        "The Pacific touches the top and left edges; the Atlantic touches the bottom and right. "
        "Water can flow to a neighbor of lesser or equal height. Return every cell from which water can "
        "reach both oceans. Order does not matter.",
        [
            {
                "input": "[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
                "expected": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
                "hidden": False,
                "order": 1,
            },
            {"input": "[[1]]", "expected": "[[0,0]]", "hidden": False, "order": 2},
        ],
        compare="any_order",
        constraints="1 <= m, n <= 200",
        input_format="An integer matrix of heights",
        output_format="A list of [row, col] cells",
    ),
    _p(
        127, "Word Ladder", "HARD", GRAPH,
        "ladderLength", [("beginWord", "String"), ("endWord", "String"), ("wordList", "List<String>")], "int",
        "A word ladder transforms `beginWord` into `endWord` by changing one letter at a time. "
        "Every intermediate word must be in `wordList`. Return the number of words in the shortest ladder, "
        "or 0 if none exists. `beginWord` counts as the first word.",
        [
            {"input": '"hit"\n"cog"\n["hot","dot","dog","lot","log","cog"]', "expected": "5", "hidden": False, "order": 1},
            {"input": '"hit"\n"cog"\n["hot","dot","dog","lot","log"]', "expected": "0", "hidden": False, "order": 2},
            {"input": '"a"\n"c"\n["a","b","c"]', "expected": "2", "hidden": True, "order": 3},
        ],
        constraints="1 <= beginWord.length <= 10\nAll words have the same length and are lowercase",
        input_format="Line 1: beginWord\nLine 2: endWord\nLine 3: wordList",
        output_format="The ladder length, or 0",
    ),
]


def validate_catalog() -> None:
    ids = [spec["leetcode_id"] for spec in PROBLEMS]
    if len(ids) != 47:
        raise RuntimeError(f"Microsoft Interview catalog must have 47 problems, found {len(ids)}")
    if len(set(ids)) != 47:
        raise RuntimeError("Microsoft Interview catalog has duplicate LeetCode IDs")
    if ids != EXPECTED_LEETCODE_IDS:
        raise RuntimeError("Microsoft Interview catalog order does not match the tracker")
    if set(ids) != set(EXPECTED_LEETCODE_IDS):
        raise RuntimeError("Microsoft Interview catalog IDs do not match the tracker")


validate_catalog()
