"""Original InterviewAnvil catalog. Statements are written for this platform."""

from __future__ import annotations

TAGS = [
    ("Array", "array"),
    ("String", "string"),
    ("HashMap", "hashmap"),
    ("Two Pointers", "two-pointers"),
    ("Sliding Window", "sliding-window"),
    ("Binary Search", "binary-search"),
    ("Stack", "stack"),
    ("Queue", "queue"),
    ("Linked List", "linked-list"),
    ("Tree", "tree"),
    ("Dynamic Programming", "dynamic-programming"),
    ("Math", "math"),
]


def sig(method: str, params: list[tuple[str, str]], return_type: str, compare: str = "exact") -> dict:
    return {
        "class_name": "Solution",
        "method_name": method,
        "params": [{"name": name, "type": typ} for name, typ in params],
        "return_type": return_type,
        "compare": compare,
    }


PROBLEMS: list[dict] = [
    {
        "title": "Pair Target",
        "slug": "pair-target",
        "difficulty": "EASY",
        "tags": ["array", "hashmap"],
        "description": (
            "You are given an array of integers `nums` and an integer `target`.\n\n"
            "Return the indices of the two distinct elements that add up to `target`.\n\n"
            "You may assume exactly one valid pair exists. Return the indices in any order."
        ),
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i], target <= 10^9\nExactly one solution exists.",
        "input_format": "Line 1: integer array nums, for example [2,7,11,15]\nLine 2: integer target",
        "output_format": "An integer array of two indices, for example [0,1]",
        "explanation": "A hash map of previously seen values finds the complement in linear time.",
        "hints": [
            "For each value x, you need target - x somewhere else in the array.",
            "Store values you have already scanned so you do not need a nested loop.",
        ],
        "examples": [
            {
                "input": "nums = [2,7,11,15], target = 9",
                "output": "[0,1]",
                "explanation": "nums[0] + nums[1] = 2 + 7 = 9.",
            },
            {
                "input": "nums = [3,2,4], target = 6",
                "output": "[1,2]",
                "explanation": "nums[1] + nums[2] = 2 + 4 = 6.",
            },
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(n)",
        "starter_code": (
            "class Solution {\n"
            "    public int[] twoSum(int[] nums, int target) {\n"
            "        \n"
            "    }\n"
            "}\n"
        ),
        "function_signature": sig("twoSum", [("nums", "int[]"), ("target", "int")], "int[]", "any_order"),
        "reference_solution": """
import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) {
                return new int[] { seen.get(need), i };
            }
            seen.put(nums[i], i);
        }
        return new int[] {};
    }
}
""".strip(),
        "tests": [
            {"input": "[2,7,11,15]\n9", "expected": "[0,1]", "hidden": False, "order": 1},
            {"input": "[3,2,4]\n6", "expected": "[1,2]", "hidden": False, "order": 2},
            {"input": "[3,3]\n6", "expected": "[0,1]", "hidden": False, "order": 3},
            {"input": "[1,5,8,10]\n18", "expected": "[2,3]", "hidden": True, "order": 4},
            {"input": "[0,4,3,0]\n0", "expected": "[0,3]", "hidden": True, "order": 5},
            {"input": "[-1,-2,-3,-4,-5]\n-8", "expected": "[2,4]", "hidden": True, "order": 6},
        ],
    },
    {
        "title": "Mirror Number",
        "slug": "mirror-number",
        "difficulty": "EASY",
        "tags": ["math"],
        "description": (
            "Determine whether an integer is a mirror number: it reads the same forwards and backwards.\n\n"
            "Negative numbers are not mirror numbers. Do not convert the entire number to a string if you can avoid it."
        ),
        "constraints": "-2^31 <= x <= 2^31 - 1",
        "input_format": "A single integer x",
        "output_format": "true or false",
        "explanation": "Reverse the second half of the digits and compare it to the first half.",
        "hints": [
            "A trailing zero can only work if the number itself is zero.",
            "You can reverse digits mathematically with modulo 10.",
        ],
        "examples": [
            {"input": "x = 121", "output": "true", "explanation": "121 reversed is 121."},
            {"input": "x = -121", "output": "false", "explanation": "The leading minus sign breaks the mirror."},
            {"input": "x = 10", "output": "false", "explanation": "01 is not 10."},
        ],
        "time_complexity": "O(log10 n)",
        "space_complexity": "O(1)",
        "starter_code": "class Solution {\n    public boolean isPalindrome(int x) {\n        \n    }\n}\n",
        "function_signature": sig("isPalindrome", [("x", "int")], "boolean"),
        "reference_solution": """
class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;
        int rev = 0;
        while (x > rev) {
            rev = rev * 10 + x % 10;
            x /= 10;
        }
        return x == rev || x == rev / 10;
    }
}
""".strip(),
        "tests": [
            {"input": "121", "expected": "true", "hidden": False, "order": 1},
            {"input": "-121", "expected": "false", "hidden": False, "order": 2},
            {"input": "10", "expected": "false", "hidden": False, "order": 3},
            {"input": "0", "expected": "true", "hidden": True, "order": 4},
            {"input": "1221", "expected": "true", "hidden": True, "order": 5},
            {"input": "1001", "expected": "true", "hidden": True, "order": 6},
            {"input": "12321", "expected": "true", "hidden": True, "order": 7},
        ],
    },
    {
        "title": "Balanced Brackets",
        "slug": "balanced-brackets",
        "difficulty": "EASY",
        "tags": ["stack", "string"],
        "description": (
            "A string contains only the characters `(`, `)`, `{`, `}`, `[`, and `]`.\n\n"
            "It is balanced when every opening bracket is closed by the same type of bracket, "
            "in the correct order, and every closer has a matching opener."
        ),
        "constraints": "1 <= s.length <= 10^4\ns consists of ()[]{} only.",
        "input_format": "A quoted string, for example \"()[]{}\"",
        "output_format": "true or false",
        "explanation": "Push openers onto a stack and pop when a matching closer arrives.",
        "hints": [
            "The last unmatched opener must match the next closer.",
            "If the stack is not empty at the end, the string is unbalanced.",
        ],
        "examples": [
            {"input": 's = "()"', "output": "true", "explanation": "A single matched pair."},
            {"input": 's = "()[]{}"', "output": "true", "explanation": "Three independent pairs."},
            {"input": 's = "(]"', "output": "false", "explanation": "Different types."},
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(n)",
        "starter_code": "class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}\n",
        "function_signature": sig("isValid", [("s", "String")], "boolean"),
        "reference_solution": """
import java.util.*;
class Solution {
    public boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') st.push(c);
            else {
                if (st.isEmpty()) return false;
                char o = st.pop();
                if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;
            }
        }
        return st.isEmpty();
    }
}
""".strip(),
        "tests": [
            {"input": '"()"', "expected": "true", "hidden": False, "order": 1},
            {"input": '"()[]{}"', "expected": "true", "hidden": False, "order": 2},
            {"input": '"(]"', "expected": "false", "hidden": False, "order": 3},
            {"input": '"([)]"', "expected": "false", "hidden": True, "order": 4},
            {"input": '"{[]}"', "expected": "true", "hidden": True, "order": 5},
            {"input": '"]"', "expected": "false", "hidden": True, "order": 6},
        ],
    },
    {
        "title": "Single Pass Profit",
        "slug": "single-pass-profit",
        "difficulty": "EASY",
        "tags": ["array"],
        "description": (
            "You are given daily prices of one stock. You may complete at most one buy and one later sell.\n\n"
            "Return the maximum profit you can earn. If no profitable trade exists, return 0."
        ),
        "constraints": "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
        "input_format": "An integer array of prices",
        "output_format": "A single integer profit",
        "explanation": "Track the lowest price so far and the best difference against later prices.",
        "hints": [
            "You must buy before you sell.",
            "Keep a running minimum as you scan left to right.",
        ],
        "examples": [
            {"input": "prices = [7,1,5,3,6,4]", "output": "5", "explanation": "Buy at 1, sell at 6."},
            {"input": "prices = [7,6,4,3,1]", "output": "0", "explanation": "Prices only fall."},
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(1)",
        "starter_code": "class Solution {\n    public int maxProfit(int[] prices) {\n        \n    }\n}\n",
        "function_signature": sig("maxProfit", [("prices", "int[]")], "int"),
        "reference_solution": """
class Solution {
    public int maxProfit(int[] prices) {
        int min = Integer.MAX_VALUE, best = 0;
        for (int p : prices) {
            if (p < min) min = p;
            else best = Math.max(best, p - min);
        }
        return best;
    }
}
""".strip(),
        "tests": [
            {"input": "[7,1,5,3,6,4]", "expected": "5", "hidden": False, "order": 1},
            {"input": "[7,6,4,3,1]", "expected": "0", "hidden": False, "order": 2},
            {"input": "[2,4,1]", "expected": "2", "hidden": False, "order": 3},
            {"input": "[1]", "expected": "0", "hidden": True, "order": 4},
            {"input": "[1,2]", "expected": "1", "hidden": True, "order": 5},
            {"input": "[3,3,3]", "expected": "0", "hidden": True, "order": 6},
        ],
    },
    {
        "title": "Missing Range Value",
        "slug": "missing-range-value",
        "difficulty": "EASY",
        "tags": ["array", "math"],
        "description": (
            "You are given an array `nums` containing `n` distinct numbers drawn from the range `[0, n]`.\n\n"
            "Return the single missing number."
        ),
        "constraints": "n == nums.length\n1 <= n <= 10^4\n0 <= nums[i] <= n\nAll values are unique.",
        "input_format": "An integer array nums",
        "output_format": "The missing integer",
        "explanation": "The expected sum of 0..n minus the actual sum is the missing value.",
        "hints": [
            "XOR of all indices and values also isolates the missing number.",
            "Watch for overflow if you sum with 32-bit integers on larger n.",
        ],
        "examples": [
            {"input": "nums = [3,0,1]", "output": "2", "explanation": "2 is missing from 0..3."},
            {"input": "nums = [0,1]", "output": "2", "explanation": "Range is 0..2."},
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(1)",
        "starter_code": "class Solution {\n    public int missingNumber(int[] nums) {\n        \n    }\n}\n",
        "function_signature": sig("missingNumber", [("nums", "int[]")], "int"),
        "reference_solution": """
class Solution {
    public int missingNumber(int[] nums) {
        int n = nums.length, xor = n;
        for (int i = 0; i < n; i++) xor ^= i ^ nums[i];
        return xor;
    }
}
""".strip(),
        "tests": [
            {"input": "[3,0,1]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[0,1]", "expected": "2", "hidden": False, "order": 2},
            {"input": "[9,6,4,2,3,5,7,0,1]", "expected": "8", "hidden": False, "order": 3},
            {"input": "[0]", "expected": "1", "hidden": True, "order": 4},
            {"input": "[1]", "expected": "0", "hidden": True, "order": 5},
            {"input": "[1,2,3]", "expected": "0", "hidden": True, "order": 6},
        ],
    },
    {
        "title": "Longest Unique Window",
        "slug": "longest-unique-window",
        "difficulty": "MEDIUM",
        "tags": ["string", "sliding-window", "hashmap"],
        "description": (
            "Given a string `s`, return the length of the longest substring that contains no repeated characters."
        ),
        "constraints": "0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols, and spaces.",
        "input_format": "A quoted string",
        "output_format": "An integer length",
        "explanation": "Grow a window while characters are unique; shrink from the left when a duplicate appears.",
        "hints": [
            "Record the last index of each character.",
            "When a duplicate is inside the window, jump the left pointer past it.",
        ],
        "examples": [
            {"input": 's = "abcabcbb"', "output": "3", "explanation": '"abc" is the longest unique window.'},
            {"input": 's = "bbbbb"', "output": "1", "explanation": "Every character is the same."},
            {"input": 's = "pwwkew"', "output": "3", "explanation": '"wke" is one valid answer.'},
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(min(n, alphabet))",
        "starter_code": "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        \n    }\n}\n",
        "function_signature": sig("lengthOfLongestSubstring", [("s", "String")], "int"),
        "reference_solution": """
import java.util.*;
class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> last = new HashMap<>();
        int left = 0, best = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (last.containsKey(c) && last.get(c) >= left) left = last.get(c) + 1;
            last.put(c, i);
            best = Math.max(best, i - left + 1);
        }
        return best;
    }
}
""".strip(),
        "tests": [
            {"input": '"abcabcbb"', "expected": "3", "hidden": False, "order": 1},
            {"input": '"bbbbb"', "expected": "1", "hidden": False, "order": 2},
            {"input": '"pwwkew"', "expected": "3", "hidden": False, "order": 3},
            {"input": '""', "expected": "0", "hidden": True, "order": 4},
            {"input": '" "', "expected": "1", "hidden": True, "order": 5},
            {"input": '"dvdf"', "expected": "3", "hidden": True, "order": 6},
            {"input": '"abba"', "expected": "2", "hidden": True, "order": 7},
        ],
    },
    {
        "title": "Anagram Bundles",
        "slug": "anagram-bundles",
        "difficulty": "MEDIUM",
        "tags": ["string", "hashmap"],
        "description": (
            "Group the strings that are anagrams of one another.\n\n"
            "Two strings are anagrams when they contain the same characters with the same frequencies, "
            "in any order. Return the groups in any order; the strings inside a group may also be in any order."
        ),
        "constraints": "1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.",
        "input_format": "A JSON array of strings",
        "output_format": "A JSON array of groups of strings",
        "explanation": "A sorted character signature is a stable key for each anagram family.",
        "hints": [
            "Counting letters into a 26-slot key also works and avoids sorting each word.",
            "Use a map from signature to list.",
        ],
        "examples": [
            {
                "input": 'strs = ["eat","tea","tan","ate","nat","bat"]',
                "output": '[["eat","tea","ate"],["tan","nat"],["bat"]]',
                "explanation": "Three anagram families.",
            }
        ],
        "time_complexity": "O(n * k log k)",
        "space_complexity": "O(n * k)",
        "starter_code": (
            "import java.util.*;\n"
            "class Solution {\n"
            "    public List<List<String>> groupAnagrams(String[] strs) {\n"
            "        \n"
            "    }\n"
            "}\n"
        ),
        "function_signature": sig("groupAnagrams", [("strs", "String[]")], "List<List<String>>", "any_order"),
        "reference_solution": """
import java.util.*;
class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        for (String s : strs) {
            char[] chars = s.toCharArray();
            Arrays.sort(chars);
            String key = new String(chars);
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        return new ArrayList<>(map.values());
    }
}
""".strip(),
        "tests": [
            {
                "input": '["eat","tea","tan","ate","nat","bat"]',
                "expected": '[["eat","tea","ate"],["tan","nat"],["bat"]]',
                "hidden": False,
                "order": 1,
            },
            {"input": '[""]', "expected": '[[""]]', "hidden": False, "order": 2},
            {"input": '["a"]', "expected": '[["a"]]', "hidden": False, "order": 3},
            {"input": '["abc","bca","cab","xyz"]', "expected": '[["abc","bca","cab"],["xyz"]]', "hidden": True, "order": 4},
            {"input": '["ddddddddddg","dgggggggggg"]', "expected": '[["ddddddddddg"],["dgggggggggg"]]', "hidden": True, "order": 5},
        ],
    },
    {
        "title": "First and Last Position",
        "slug": "first-and-last-position",
        "difficulty": "MEDIUM",
        "tags": ["array", "binary-search"],
        "description": (
            "`nums` is a non-decreasing array of integers. Find the starting and ending indices of `target`.\n\n"
            "If `target` is missing, return `[-1, -1]`. Your solution should run in logarithmic time."
        ),
        "constraints": "0 <= nums.length <= 10^5\n-10^9 <= nums[i], target <= 10^9\nnums is sorted non-decreasing.",
        "input_format": "Line 1: nums\nLine 2: target",
        "output_format": "[left, right] inclusive indices, or [-1,-1]",
        "explanation": "Two binary searches: one for the first >= target, one for the first > target.",
        "hints": [
            "Lower bound and upper bound are enough.",
            "Be careful when the array is empty.",
        ],
        "examples": [
            {"input": "nums = [5,7,7,8,8,10], target = 8", "output": "[3,4]", "explanation": "8 occupies indices 3 and 4."},
            {"input": "nums = [5,7,7,8,8,10], target = 6", "output": "[-1,-1]", "explanation": "6 is absent."},
        ],
        "time_complexity": "O(log n)",
        "space_complexity": "O(1)",
        "starter_code": "class Solution {\n    public int[] searchRange(int[] nums, int target) {\n        \n    }\n}\n",
        "function_signature": sig("searchRange", [("nums", "int[]"), ("target", "int")], "int[]"),
        "reference_solution": """
class Solution {
    public int[] searchRange(int[] nums, int target) {
        int left = bound(nums, target, true);
        if (left == nums.length || nums[left] != target) return new int[] {-1, -1};
        int right = bound(nums, target + 1, true) - 1;
        return new int[] {left, right};
    }
    private int bound(int[] nums, int target, boolean lower) {
        int lo = 0, hi = nums.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < target || (!lower && nums[mid] == target)) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
""".strip(),
        "tests": [
            {"input": "[5,7,7,8,8,10]\n8", "expected": "[3,4]", "hidden": False, "order": 1},
            {"input": "[5,7,7,8,8,10]\n6", "expected": "[-1,-1]", "hidden": False, "order": 2},
            {"input": "[]\n0", "expected": "[-1,-1]", "hidden": False, "order": 3},
            {"input": "[1]\n1", "expected": "[0,0]", "hidden": True, "order": 4},
            {"input": "[2,2,2,2]\n2", "expected": "[0,3]", "hidden": True, "order": 5},
            {"input": "[1,2,3]\n3", "expected": "[2,2]", "hidden": True, "order": 6},
        ],
    },
    {
        "title": "Minimum Tracker Stack",
        "slug": "minimum-tracker-stack",
        "difficulty": "MEDIUM",
        "tags": ["stack"],
        "description": (
            "Design a stack that supports push, pop, top, and retrieving the current minimum in constant time.\n\n"
            "Implement `MinStack` methods through a `Solution` wrapper that processes a sequence of operations.\n\n"
            "`MinStack(operations, values)` receives parallel arrays:\n"
            "- operations[i] is one of `MinStack`, `push`, `pop`, `top`, `getMin`\n"
            "- values[i] is the argument for `push`, or 0 otherwise\n\n"
            "Return an array of results for `top` and `getMin`. Other operations contribute nothing."
        ),
        "constraints": "1 <= operations.length <= 3 * 10^4\n-2^31 <= push values <= 2^31 - 1\nMethods are called on a non-empty stack.",
        "input_format": "Line 1: string array of operations\nLine 2: integer array of values",
        "output_format": "Integer array of recorded results",
        "explanation": "Store each value together with the minimum seen at the time it was pushed.",
        "hints": [
            "An auxiliary stack of minima keeps getMin O(1).",
            "Duplicate the current min when you push a larger value.",
        ],
        "examples": [
            {
                "input": 'operations = ["MinStack","push","push","push","getMin","pop","top","getMin"], values = [0,-2,0,-3,0,0,0,0]',
                "output": "[-3,-2]",
                "explanation": "After pushing -2, 0, -3 the min is -3; after pop the top is 0 and min is -2.",
            }
        ],
        "time_complexity": "O(1) per operation",
        "space_complexity": "O(n)",
        "starter_code": """
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> stack.pop();
                case "top" -> out.add(stack.top());
                case "getMin" -> out.add(stack.getMin());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}

class MinStack {
    public MinStack() {}
    public void push(int val) {}
    public void pop() {}
    public int top() { return 0; }
    public int getMin() { return 0; }
}
""".strip()
        + "\n",
        "function_signature": sig("process", [("operations", "String[]"), ("values", "int[]")], "int[]"),
        "reference_solution": """
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> stack.pop();
                case "top" -> out.add(stack.top());
                case "getMin" -> out.add(stack.getMin());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class MinStack {
    private final Deque<int[]> st = new ArrayDeque<>();
    public void push(int val) {
        int min = st.isEmpty() ? val : Math.min(val, st.peek()[1]);
        st.push(new int[] {val, min});
    }
    public void pop() { st.pop(); }
    public int top() { return st.peek()[0]; }
    public int getMin() { return st.peek()[1]; }
}
""".strip(),
        "tests": [
            {
                "input": '["MinStack","push","push","push","getMin","pop","top","getMin"]\n[0,-2,0,-3,0,0,0,0]',
                "expected": "[-3,0,-2]",
                "hidden": False,
                "order": 1,
            },
            {
                "input": '["MinStack","push","push","getMin","top"]\n[0,1,2,0,0]',
                "expected": "[1,2]",
                "hidden": False,
                "order": 2,
            },
            {
                "input": '["MinStack","push","push","push","getMin","pop","getMin","pop","getMin"]\n[0,0,1,-1,0,0,0,0,0]',
                "expected": "[-1,0,0]",
                "hidden": True,
                "order": 3,
            },
        ],
    },
    {
        "title": "Level Walk",
        "slug": "level-walk",
        "difficulty": "MEDIUM",
        "tags": ["tree", "queue"],
        "description": (
            "Given the root of a binary tree, return the values of its nodes grouped by depth, from left to right.\n\n"
            "The tree is provided in level-order form, using `null` for missing children."
        ),
        "constraints": "The number of nodes is in [0, 2000]\n-1000 <= node.val <= 1000",
        "input_format": "A level-order array such as [3,9,20,null,null,15,7]",
        "output_format": "A list of levels, each a list of integers",
        "explanation": "A queue processes one depth at a time.",
        "hints": [
            "Record the queue size at the start of each level.",
            "An empty tree should return an empty list.",
        ],
        "examples": [
            {
                "input": "root = [3,9,20,null,null,15,7]",
                "output": "[[3],[9,20],[15,7]]",
                "explanation": "Three depths.",
            }
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(n)",
        "starter_code": (
            "import java.util.*;\n"
            "class Solution {\n"
            "    public List<List<Integer>> levelOrder(TreeNode root) {\n"
            "        \n"
            "    }\n"
            "}\n"
        ),
        "function_signature": sig("levelOrder", [("root", "TreeNode")], "List<List<Integer>>"),
        "reference_solution": """
import java.util.*;
class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> out = new ArrayList<>();
        if (root == null) return out;
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            int size = q.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode n = q.poll();
                level.add(n.val);
                if (n.left != null) q.add(n.left);
                if (n.right != null) q.add(n.right);
            }
            out.add(level);
        }
        return out;
    }
}
""".strip(),
        "tests": [
            {"input": "[3,9,20,null,null,15,7]", "expected": "[[3],[9,20],[15,7]]", "hidden": False, "order": 1},
            {"input": "[1]", "expected": "[[1]]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
            {"input": "[1,2,3,4,5]", "expected": "[[1],[2,3],[4,5]]", "hidden": True, "order": 4},
            {"input": "[1,null,2,null,3]", "expected": "[[1],[2],[3]]", "hidden": True, "order": 5},
        ],
    },
    {
        "title": "Cycle in a Chain",
        "slug": "cycle-in-a-chain",
        "difficulty": "MEDIUM",
        "tags": ["linked-list", "two-pointers"],
        "description": (
            "A singly linked list may contain a cycle. Return `true` if some node can be reached again "
            "by following `next` pointers, otherwise `false`.\n\n"
            "Because the judge cannot express a cycle as a simple array, the method receives the list "
            "values and `pos`, the index where the tail connects (`-1` if there is no cycle). "
            "Build the list, wire the cycle if needed, then detect it."
        ),
        "constraints": "0 <= list length <= 10^4\n-10^5 <= node.val <= 10^5\npos is -1 or a valid index.",
        "input_format": "Line 1: integer array of node values\nLine 2: integer pos",
        "output_format": "true or false",
        "explanation": "Floyd's tortoise and hare pointers meet if and only if a cycle exists.",
        "hints": [
            "Two pointers moving at different speeds are enough. Do not use extra memory if you can avoid it.",
            "If the fast pointer hits null, there is no cycle.",
        ],
        "examples": [
            {"input": "head = [3,2,0,-4], pos = 1", "output": "true", "explanation": "Tail connects to index 1."},
            {"input": "head = [1,2], pos = 0", "output": "true", "explanation": "Two-node cycle."},
            {"input": "head = [1], pos = -1", "output": "false", "explanation": "Single node, no link back."},
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(1)",
        "starter_code": """
class Solution {
    public boolean hasCycle(int[] values, int pos) {
        ListNode head = build(values, pos);
        return detect(head);
    }

    public boolean detect(ListNode head) {
        return false;
    }

    private ListNode build(int[] values, int pos) {
        if (values.length == 0) return null;
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        ListNode cycle = null;
        for (int i = 0; i < values.length; i++) {
            cur.next = new ListNode(values[i]);
            cur = cur.next;
            if (i == pos) cycle = cur;
        }
        cur.next = cycle;
        return dummy.next;
    }
}
""".strip()
        + "\n",
        "function_signature": sig("hasCycle", [("values", "int[]"), ("pos", "int")], "boolean"),
        "reference_solution": """
class Solution {
    public boolean hasCycle(int[] values, int pos) {
        return detect(build(values, pos));
    }
    public boolean detect(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
    private ListNode build(int[] values, int pos) {
        if (values.length == 0) return null;
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy, cycle = null;
        for (int i = 0; i < values.length; i++) {
            cur.next = new ListNode(values[i]);
            cur = cur.next;
            if (i == pos) cycle = cur;
        }
        cur.next = cycle;
        return dummy.next;
    }
}
""".strip(),
        "tests": [
            {"input": "[3,2,0,-4]\n1", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2]\n0", "expected": "true", "hidden": False, "order": 2},
            {"input": "[1]\n-1", "expected": "false", "hidden": False, "order": 3},
            {"input": "[]\n-1", "expected": "false", "hidden": True, "order": 4},
            {"input": "[1,2,3,4,5]\n4", "expected": "true", "hidden": True, "order": 5},
            {"input": "[1,2,3]\n-1", "expected": "false", "hidden": True, "order": 6},
        ],
    },
    {
        "title": "Widest Water Basin",
        "slug": "widest-water-basin",
        "difficulty": "MEDIUM",
        "tags": ["array", "two-pointers"],
        "description": (
            "You are given `height[i]`, the elevation of a vertical line at x = i.\n\n"
            "Choose two lines that, together with the x-axis, form a basin. "
            "Return the maximum water the basin can hold. Water cannot slant."
        ),
        "constraints": "2 <= height.length <= 10^5\n0 <= height[i] <= 10^4",
        "input_format": "An integer array height",
        "output_format": "The maximum area as an integer",
        "explanation": "Start at both ends and move the shorter pointer inward.",
        "hints": [
            "The area is limited by the shorter line.",
            "Moving the taller pointer cannot increase width-limited area.",
        ],
        "examples": [
            {"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49", "explanation": "Lines at index 1 and 8."},
            {"input": "height = [1,1]", "output": "1", "explanation": "Only one pair."},
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(1)",
        "starter_code": "class Solution {\n    public int maxArea(int[] height) {\n        \n    }\n}\n",
        "function_signature": sig("maxArea", [("height", "int[]")], "int"),
        "reference_solution": """
class Solution {
    public int maxArea(int[] height) {
        int lo = 0, hi = height.length - 1, best = 0;
        while (lo < hi) {
            int h = Math.min(height[lo], height[hi]);
            best = Math.max(best, h * (hi - lo));
            if (height[lo] < height[hi]) lo++;
            else hi--;
        }
        return best;
    }
}
""".strip(),
        "tests": [
            {"input": "[1,8,6,2,5,4,8,3,7]", "expected": "49", "hidden": False, "order": 1},
            {"input": "[1,1]", "expected": "1", "hidden": False, "order": 2},
            {"input": "[4,3,2,1,4]", "expected": "16", "hidden": False, "order": 3},
            {"input": "[1,2,1]", "expected": "2", "hidden": True, "order": 4},
            {"input": "[2,3,4,5,18,17,6]", "expected": "17", "hidden": True, "order": 5},
        ],
    },
    {
        "title": "Valley Rain",
        "slug": "valley-rain",
        "difficulty": "HARD",
        "tags": ["array", "stack", "two-pointers"],
        "description": (
            "An elevation map is given as non-negative integers, where `height[i]` is a bar of width 1.\n\n"
            "Compute how many units of rainwater can be trapped between the bars after a storm."
        ),
        "constraints": "n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5",
        "input_format": "An integer array height",
        "output_format": "Total trapped units as an integer",
        "explanation": "Water above index i is min(leftMax, rightMax) - height[i] when that value is positive.",
        "hints": [
            "Two pointers can track left and right maxima in one pass.",
            "A monotonic stack of indices also works.",
        ],
        "examples": [
            {"input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6", "explanation": "Six units collect in the valleys."},
            {"input": "height = [4,2,0,3,2,5]", "output": "9", "explanation": "Nine units collect."},
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(1)",
        "starter_code": "class Solution {\n    public int trap(int[] height) {\n        \n    }\n}\n",
        "function_signature": sig("trap", [("height", "int[]")], "int"),
        "reference_solution": """
class Solution {
    public int trap(int[] height) {
        int lo = 0, hi = height.length - 1, leftMax = 0, rightMax = 0, water = 0;
        while (lo < hi) {
            if (height[lo] < height[hi]) {
                if (height[lo] >= leftMax) leftMax = height[lo];
                else water += leftMax - height[lo];
                lo++;
            } else {
                if (height[hi] >= rightMax) rightMax = height[hi];
                else water += rightMax - height[hi];
                hi--;
            }
        }
        return water;
    }
}
""".strip(),
        "tests": [
            {"input": "[0,1,0,2,1,0,1,3,2,1,2,1]", "expected": "6", "hidden": False, "order": 1},
            {"input": "[4,2,0,3,2,5]", "expected": "9", "hidden": False, "order": 2},
            {"input": "[0]", "expected": "0", "hidden": False, "order": 3},
            {"input": "[5,4,1,2]", "expected": "1", "hidden": True, "order": 4},
            {"input": "[5,2,1,2,1,5]", "expected": "14", "hidden": True, "order": 5},
            {"input": "[2,0,2]", "expected": "2", "hidden": True, "order": 6},
        ],
    },
    {
        "title": "Shared Ancestor",
        "slug": "shared-ancestor",
        "difficulty": "HARD",
        "tags": ["tree"],
        "description": (
            "Given a binary tree and two distinct node values `p` and `q` that both exist in the tree, "
            "return the value of their lowest common ancestor.\n\n"
            "The lowest common ancestor is the deepest node that has both `p` and `q` as descendants "
            "(a node may be a descendant of itself)."
        ),
        "constraints": "2 <= number of nodes <= 10^5\nAll node values are unique.\np != q and both exist in the tree.",
        "input_format": "Line 1: level-order tree\nLine 2: p\nLine 3: q",
        "output_format": "The ancestor value as an integer",
        "explanation": "A recursive search returns a node if the current subtree contains p, q, or both.",
        "hints": [
            "If the left subtree contains one target and the right contains the other, the current node is the answer.",
            "If both targets sit in one child, recurse into that child.",
        ],
        "examples": [
            {
                "input": "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1",
                "output": "3",
                "explanation": "3 is the first node covering both 5 and 1.",
            },
            {
                "input": "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4",
                "output": "5",
                "explanation": "5 is an ancestor of 4 and of itself.",
            },
        ],
        "time_complexity": "O(n)",
        "space_complexity": "O(h)",
        "starter_code": (
            "class Solution {\n"
            "    public int lowestCommonAncestor(TreeNode root, int p, int q) {\n"
            "        \n"
            "    }\n"
            "}\n"
        ),
        "function_signature": sig(
            "lowestCommonAncestor",
            [("root", "TreeNode"), ("p", "int"), ("q", "int")],
            "int",
        ),
        "reference_solution": """
class Solution {
    public int lowestCommonAncestor(TreeNode root, int p, int q) {
        TreeNode ans = walk(root, p, q);
        return ans == null ? -1 : ans.val;
    }
    private TreeNode walk(TreeNode node, int p, int q) {
        if (node == null || node.val == p || node.val == q) return node;
        TreeNode left = walk(node.left, p, q);
        TreeNode right = walk(node.right, p, q);
        if (left != null && right != null) return node;
        return left != null ? left : right;
    }
}
""".strip(),
        "tests": [
            {"input": "[3,5,1,6,2,0,8,null,null,7,4]\n5\n1", "expected": "3", "hidden": False, "order": 1},
            {"input": "[3,5,1,6,2,0,8,null,null,7,4]\n5\n4", "expected": "5", "hidden": False, "order": 2},
            {"input": "[1,2]\n1\n2", "expected": "1", "hidden": False, "order": 3},
            {"input": "[1,2,3,4]\n4\n3", "expected": "1", "hidden": True, "order": 4},
            {"input": "[6,2,8,0,4,7,9,null,null,3,5]\n2\n8", "expected": "6", "hidden": True, "order": 5},
            {"input": "[6,2,8,0,4,7,9,null,null,3,5]\n2\n4", "expected": "2", "hidden": True, "order": 6},
        ],
    },
    {
        "title": "Merged Median",
        "slug": "merged-median",
        "difficulty": "HARD",
        "tags": ["array", "binary-search"],
        "description": (
            "You are given two sorted arrays `nums1` and `nums2` of sizes m and n.\n\n"
            "Return the median of the combined sequence. The combined length is at least one. "
            "Your algorithm should run in O(log(m + n)) time."
        ),
        "constraints": "0 <= m, n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6",
        "input_format": "Line 1: nums1\nLine 2: nums2",
        "output_format": "A number. If the combined length is even, return the average of the two middle values.",
        "explanation": "Binary search the partition of the shorter array so the left half is complete.",
        "hints": [
            "Always binary search on the shorter array.",
            "A valid partition has every left value <= every right value.",
        ],
        "examples": [
            {"input": "nums1 = [1,3], nums2 = [2]", "output": "2", "explanation": "Merged sequence is [1,2,3]."},
            {"input": "nums1 = [1,2], nums2 = [3,4]", "output": "2.5", "explanation": "Median of [1,2,3,4] is 2.5."},
        ],
        "time_complexity": "O(log(min(m, n)))",
        "space_complexity": "O(1)",
        "starter_code": "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        \n    }\n}\n",
        "function_signature": sig(
            "findMedianSortedArrays",
            [("nums1", "int[]"), ("nums2", "int[]")],
            "double",
        ),
        "reference_solution": """
class Solution {
    public double findMedianSortedArrays(int[] a, int[] b) {
        if (a.length > b.length) return findMedianSortedArrays(b, a);
        int m = a.length, n = b.length, lo = 0, hi = m;
        int half = (m + n + 1) / 2;
        while (lo <= hi) {
            int i = (lo + hi) / 2;
            int j = half - i;
            int aLeft = i == 0 ? Integer.MIN_VALUE : a[i - 1];
            int aRight = i == m ? Integer.MAX_VALUE : a[i];
            int bLeft = j == 0 ? Integer.MIN_VALUE : b[j - 1];
            int bRight = j == n ? Integer.MAX_VALUE : b[j];
            if (aLeft <= bRight && bLeft <= aRight) {
                if (((m + n) & 1) == 1) return Math.max(aLeft, bLeft);
                return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2.0;
            } else if (aLeft > bRight) hi = i - 1;
            else lo = i + 1;
        }
        return 0;
    }
}
""".strip(),
        "tests": [
            {"input": "[1,3]\n[2]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[1,2]\n[3,4]", "expected": "2.5", "hidden": False, "order": 2},
            {"input": "[0,0]\n[0,0]", "expected": "0", "hidden": False, "order": 3},
            {"input": "[]\n[1]", "expected": "1", "hidden": True, "order": 4},
            {"input": "[2]\n[]", "expected": "2", "hidden": True, "order": 5},
            {"input": "[1,2,3,4,5]\n[6,7,8,9,10]", "expected": "5.5", "hidden": True, "order": 6},
            {"input": "[1,3,8,9,15]\n[7,11,18,19,21,25]", "expected": "11", "hidden": True, "order": 7},
        ],
    },
]
