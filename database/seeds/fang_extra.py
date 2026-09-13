"""FANG and Microsoft interview coverage beyond the original tracker catalogs.

The Microsoft Interview and LoopTracker catalogs are strong on sliding window, two
pointers, trees and graphs, but they leave whole interview categories uncovered: bit
manipulation, matrix manipulation, math and string parsing, greedy, and large parts of
dynamic programming, backtracking, heaps and linked lists.

This module fills those gaps. Every problem here carries its own reference solution,
complexity target and progressive hints inline, and every one of them compiles and passes
its own test cases (see ``backend/tests/test_problem_catalog.py``).

Slugs stay in the ``lc-{id}`` namespace so the whole catalog shares one match key.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

ARRAY = "array"
STRING = "string"
MATRIX = "matrix"
STACK = "stack"
HEAP = "heap"
LINKED = "linked-list"
TREE = "tree"
DP = "dynamic-programming"
GRAPH = "graph"
BACKTRACK = "backtracking"
DESIGN = "design"
TRIE = "trie"
GREEDY = "greedy"
UNION = "union-find"
BIT = "bit-manipulation"
MATH = "math"
INTERVALS = "intervals"
TWO = "two-pointers"
BIN = "binary-search"

EXTRA_TAGS = [
    ("Matrix", MATRIX),
    ("Bit Manipulation", BIT),
    ("Math", MATH),
]


PROBLEMS: list[dict] = [
    _p(
        238, "Product of Array Except Self", "MEDIUM", ARRAY,
        "productExceptSelf", [("nums", "int[]")], "int[]",
        "Given an integer array `nums`, return an array `answer` where `answer[i]` is the product of "
        "every element of `nums` except `nums[i]`.\n\n"
        "You must write an algorithm that runs in O(n) time and without using the division operator.",
        [
            {"input": "[1,2,3,4]", "expected": "[24,12,8,6]", "hidden": False, "order": 1},
            {"input": "[-1,1,0,-3,3]", "expected": "[0,0,9,0,0]", "hidden": False, "order": 2},
            {"input": "[2,3]", "expected": "[3,2]", "hidden": False, "order": 3},
            {"input": "[0,0]", "expected": "[0,0]", "hidden": True, "order": 4},
        ],
        constraints="2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30",
        input_format="Integer array nums",
        output_format="Integer array of products",
        time="O(n)", space="O(1) beyond the output",
        hints=[
            "Division is banned, and for a good reason: a single zero in the array breaks it and "
            "two zeros break it differently.",
            "The answer at index i is the product of everything to its left times the product of "
            "everything to its right.",
            "Build the prefix products into the output array in one forward pass, then multiply in "
            "the suffix products with a single running variable on the way back.",
        ],
        solution=r"""
class Solution {
    public int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        answer[0] = 1;
        for (int i = 1; i < n; i++) answer[i] = answer[i - 1] * nums[i - 1];
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) {
            answer[i] *= suffix;
            suffix *= nums[i];
        }
        return answer;
    }
}
""",
    ),
    _p(
        41, "First Missing Positive", "HARD", ARRAY,
        "firstMissingPositive", [("nums", "int[]")], "int",
        "Given an unsorted integer array `nums`, return the smallest positive integer that is not "
        "present.\n\nYou must implement an algorithm that runs in O(n) time and uses O(1) auxiliary space.",
        [
            {"input": "[1,2,0]", "expected": "3", "hidden": False, "order": 1},
            {"input": "[3,4,-1,1]", "expected": "2", "hidden": False, "order": 2},
            {"input": "[7,8,9,11,12]", "expected": "1", "hidden": False, "order": 3},
            {"input": "[1]", "expected": "2", "hidden": True, "order": 4},
            {"input": "[1,1]", "expected": "2", "hidden": True, "order": 5},
        ],
        constraints="1 <= nums.length <= 10^5\n-2^31 <= nums[i] <= 2^31 - 1",
        input_format="Integer array nums",
        output_format="An integer",
        time="O(n)", space="O(1)",
        hints=[
            "With n slots, the answer is always somewhere in 1..n+1. Anything outside that range "
            "is noise you can ignore.",
            "The O(1) space constraint means the array itself has to become the hash table.",
            "Place every value v in 1..n at index v-1 by swapping, then scan for the first index "
            "whose value does not match. Swap in a while loop, not an if.",
        ],
        solution=r"""
class Solution {
    public int firstMissingPositive(int[] nums) {
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
                int target = nums[i] - 1;
                int temp = nums[target];
                nums[target] = nums[i];
                nums[i] = temp;
            }
        }
        for (int i = 0; i < n; i++) {
            if (nums[i] != i + 1) return i + 1;
        }
        return n + 1;
    }
}
""",
    ),
    _p(
        169, "Majority Element", "EASY", ARRAY,
        "majorityElement", [("nums", "int[]")], "int",
        "Given an array `nums` of size `n`, return the majority element: the element that appears "
        "more than `n / 2` times. You may assume it always exists.",
        [
            {"input": "[3,2,3]", "expected": "3", "hidden": False, "order": 1},
            {"input": "[2,2,1,1,1,2,2]", "expected": "2", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "1", "hidden": False, "order": 3},
        ],
        constraints="1 <= nums.length <= 5 * 10^4\nThe majority element always exists",
        input_format="Integer array nums",
        output_format="An integer",
        time="O(n)", space="O(1)",
        hints=[
            "A HashMap of counts solves it in O(n) time and O(n) space. The follow-up asks for "
            "constant space.",
            "Boyer-Moore voting: keep a candidate and a counter. A matching element increments the "
            "counter, any other element decrements it.",
            "When the counter hits zero, adopt the current element as the new candidate. The true "
            "majority survives because it outnumbers everything else combined.",
        ],
        solution=r"""
class Solution {
    public int majorityElement(int[] nums) {
        int candidate = nums[0];
        int count = 0;
        for (int value : nums) {
            if (count == 0) candidate = value;
            count += value == candidate ? 1 : -1;
        }
        return candidate;
    }
}
""",
    ),
    _p(
        31, "Next Permutation", "MEDIUM", ARRAY,
        "nextPermutation", [("nums", "int[]")], "int[]",
        "Rearrange `nums` into the lexicographically next greater permutation. If no greater "
        "permutation exists, rearrange it into the lowest possible order (sorted ascending).\n\n"
        "The replacement must be done in place with only constant extra memory.",
        [
            {"input": "[1,2,3]", "expected": "[1,3,2]", "hidden": False, "order": 1},
            {"input": "[3,2,1]", "expected": "[1,2,3]", "hidden": False, "order": 2},
            {"input": "[1,1,5]", "expected": "[1,5,1]", "hidden": False, "order": 3},
            {"input": "[1,3,2]", "expected": "[2,1,3]", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 100\n0 <= nums[i] <= 100",
        input_format="Integer array nums",
        output_format="The rearranged array",
        time="O(n)", space="O(1)",
        hints=[
            "A suffix that is already descending is the largest arrangement of those elements, so "
            "nothing inside it can grow. Find where that suffix starts.",
            "Scan from the right for the first index i with `nums[i] < nums[i+1]`. That is the only "
            "position that can be increased.",
            "Swap nums[i] with the rightmost element greater than it, then reverse the suffix to "
            "make it the smallest arrangement rather than the largest.",
        ],
        solution=r"""
class Solution {
    public int[] nextPermutation(int[] nums) {
        int i = nums.length - 2;
        while (i >= 0 && nums[i] >= nums[i + 1]) i--;
        if (i >= 0) {
            int j = nums.length - 1;
            while (nums[j] <= nums[i]) j--;
            swap(nums, i, j);
        }
        reverse(nums, i + 1, nums.length - 1);
        return nums;
    }

    private void reverse(int[] nums, int from, int to) {
        while (from < to) swap(nums, from++, to--);
    }

    private void swap(int[] nums, int a, int b) {
        int temp = nums[a];
        nums[a] = nums[b];
        nums[b] = temp;
    }
}
""",
    ),
    _p(
        48, "Rotate Image", "MEDIUM", MATRIX,
        "rotate", [("matrix", "int[][]")], "int[][]",
        "You are given an `n x n` matrix representing an image. Rotate the image 90 degrees "
        "clockwise, in place.",
        [
            {"input": "[[1,2,3],[4,5,6],[7,8,9]]", "expected": "[[7,4,1],[8,5,2],[9,6,3]]",
             "hidden": False, "order": 1},
            {"input": "[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
             "expected": "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]", "hidden": False, "order": 2},
            {"input": "[[1]]", "expected": "[[1]]", "hidden": False, "order": 3},
        ],
        constraints="n == matrix.length == matrix[i].length\n1 <= n <= 20",
        input_format="Square integer matrix",
        output_format="The rotated matrix",
        time="O(n^2)", space="O(1)",
        hints=[
            "Allocating a second matrix is the easy answer. The interview asks for in place, which "
            "rules it out.",
            "A clockwise rotation is a transpose followed by a reversal of each row. Verify that on "
            "a 3x3 by hand before writing code.",
            "Transpose by swapping only the cells above the diagonal, otherwise you swap every pair "
            "twice and end up where you started.",
        ],
        solution=r"""
class Solution {
    public int[][] rotate(int[][] matrix) {
        int n = matrix.length;
        for (int r = 0; r < n; r++) {
            for (int c = r + 1; c < n; c++) {
                int temp = matrix[r][c];
                matrix[r][c] = matrix[c][r];
                matrix[c][r] = temp;
            }
        }
        for (int[] row : matrix) {
            for (int left = 0, right = n - 1; left < right; left++, right--) {
                int temp = row[left];
                row[left] = row[right];
                row[right] = temp;
            }
        }
        return matrix;
    }
}
""",
    ),
    _p(
        54, "Spiral Matrix", "MEDIUM", MATRIX,
        "spiralOrder", [("matrix", "int[][]")], "List<Integer>",
        "Given an `m x n` matrix, return all of its elements in spiral order: left to right across "
        "the top row, down the right column, right to left across the bottom row, up the left "
        "column, and inward.",
        [
            {"input": "[[1,2,3],[4,5,6],[7,8,9]]", "expected": "[1,2,3,6,9,8,7,4,5]",
             "hidden": False, "order": 1},
            {"input": "[[1,2,3,4],[5,6,7,8],[9,10,11,12]]", "expected": "[1,2,3,4,8,12,11,10,9,5,6,7]",
             "hidden": False, "order": 2},
            {"input": "[[7],[9],[6]]", "expected": "[7,9,6]", "hidden": False, "order": 3},
            {"input": "[[1,2,3]]", "expected": "[1,2,3]", "hidden": True, "order": 4},
        ],
        constraints="1 <= m, n <= 10\n-100 <= matrix[i][j] <= 100",
        input_format="Integer matrix",
        output_format="List of integers in spiral order",
        time="O(m * n)", space="O(1) beyond the output",
        hints=[
            "Track four boundaries (top, bottom, left, right) and shrink one after each pass.",
            "The bug everyone hits is a single leftover row or column: after walking right and "
            "down, the bottom row and left column may no longer exist.",
            "Guard the two reverse passes with `if (top <= bottom)` and `if (left <= right)` before "
            "walking them.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>();
        if (matrix.length == 0) return out;
        int top = 0;
        int bottom = matrix.length - 1;
        int left = 0;
        int right = matrix[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(matrix[top][c]);
            top++;
            for (int r = top; r <= bottom; r++) out.add(matrix[r][right]);
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) out.add(matrix[bottom][c]);
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) out.add(matrix[r][left]);
                left++;
            }
        }
        return out;
    }
}
""",
    ),
    _p(
        73, "Set Matrix Zeroes", "MEDIUM", MATRIX,
        "setZeroes", [("matrix", "int[][]")], "int[][]",
        "Given an `m x n` matrix, if an element is 0 set its entire row and column to 0. Do it in "
        "place.",
        [
            {"input": "[[1,1,1],[1,0,1],[1,1,1]]", "expected": "[[1,0,1],[0,0,0],[1,0,1]]",
             "hidden": False, "order": 1},
            {"input": "[[0,1,2,0],[3,4,5,2],[1,3,1,5]]", "expected": "[[0,0,0,0],[0,4,5,0],[0,3,1,0]]",
             "hidden": False, "order": 2},
            {"input": "[[1,0]]", "expected": "[[0,0]]", "hidden": False, "order": 3},
            {"input": "[[1,2],[3,4]]", "expected": "[[1,2],[3,4]]", "hidden": True, "order": 4},
        ],
        constraints="1 <= m, n <= 200\n-2^31 <= matrix[i][j] <= 2^31 - 1",
        input_format="Integer matrix",
        output_format="The modified matrix",
        time="O(m * n)", space="O(1)",
        hints=[
            "Zeroing as you scan is wrong: the zeros you write are indistinguishable from the ones "
            "that were already there.",
            "Two marker arrays of size m and n fix that with O(m + n) space. The follow-up asks for "
            "O(1).",
            "Use the first row and first column as those markers, but record separately whether "
            "they themselves originally contained a zero, and apply that last.",
        ],
        solution=r"""
class Solution {
    public int[][] setZeroes(int[][] matrix) {
        int rows = matrix.length;
        int cols = matrix[0].length;
        boolean firstRowZero = false;
        boolean firstColZero = false;
        for (int c = 0; c < cols; c++) {
            if (matrix[0][c] == 0) firstRowZero = true;
        }
        for (int r = 0; r < rows; r++) {
            if (matrix[r][0] == 0) firstColZero = true;
        }
        for (int r = 1; r < rows; r++) {
            for (int c = 1; c < cols; c++) {
                if (matrix[r][c] == 0) {
                    matrix[r][0] = 0;
                    matrix[0][c] = 0;
                }
            }
        }
        for (int r = 1; r < rows; r++) {
            for (int c = 1; c < cols; c++) {
                if (matrix[r][0] == 0 || matrix[0][c] == 0) matrix[r][c] = 0;
            }
        }
        if (firstRowZero) {
            for (int c = 0; c < cols; c++) matrix[0][c] = 0;
        }
        if (firstColZero) {
            for (int r = 0; r < rows; r++) matrix[r][0] = 0;
        }
        return matrix;
    }
}
""",
    ),
    _p(
        189, "Rotate Array", "MEDIUM", ARRAY,
        "rotate", [("nums", "int[]"), ("k", "int")], "int[]",
        "Given an integer array `nums`, rotate it to the right by `k` steps, where `k` is "
        "non-negative. Do it in place with O(1) extra space.",
        [
            {"input": "[1,2,3,4,5,6,7]\n3", "expected": "[5,6,7,1,2,3,4]", "hidden": False, "order": 1},
            {"input": "[-1,-100,3,99]\n2", "expected": "[3,99,-1,-100]", "hidden": False, "order": 2},
            {"input": "[1,2]\n3", "expected": "[2,1]", "hidden": False, "order": 3},
            {"input": "[1]\n0", "expected": "[1]", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 10^5\n0 <= k <= 10^5",
        input_format="Line 1: nums\nLine 2: k",
        output_format="The rotated array",
        time="O(n)", space="O(1)",
        hints=[
            "Rotating one step at a time k times is O(n * k), which times out when k is large.",
            "Reduce k modulo n first: rotating by n is the identity.",
            "Reverse the whole array, then reverse the first k elements and the remaining n-k "
            "separately. Three linear reversals, no extra space.",
        ],
        solution=r"""
class Solution {
    public int[] rotate(int[] nums, int k) {
        int n = nums.length;
        k %= n;
        reverse(nums, 0, n - 1);
        reverse(nums, 0, k - 1);
        reverse(nums, k, n - 1);
        return nums;
    }

    private void reverse(int[] nums, int from, int to) {
        while (from < to) {
            int temp = nums[from];
            nums[from++] = nums[to];
            nums[to--] = temp;
        }
    }
}
""",
    ),
    _p(
        121, "Best Time to Buy and Sell Stock", "EASY", ARRAY,
        "maxProfit", [("prices", "int[]")], "int",
        "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`.\n\n"
        "Choose a single day to buy and a later day to sell. Return the maximum profit, or 0 if no "
        "profitable trade exists.",
        [
            {"input": "[7,1,5,3,6,4]", "expected": "5", "hidden": False, "order": 1},
            {"input": "[7,6,4,3,1]", "expected": "0", "hidden": False, "order": 2},
            {"input": "[2,4,1]", "expected": "2", "hidden": False, "order": 3},
            {"input": "[1]", "expected": "0", "hidden": True, "order": 4},
        ],
        constraints="1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
        input_format="Integer array prices",
        output_format="An integer profit",
        time="O(n)", space="O(1)",
        hints=[
            "Every pair is O(n^2). The fix is to notice you only need one number from the past.",
            "Walking left to right, the best sale on day i uses the cheapest price seen before i.",
            "Track the running minimum and the running best profit in the same pass; update the "
            "profit before the minimum so you never buy and sell on the same day.",
        ],
        solution=r"""
class Solution {
    public int maxProfit(int[] prices) {
        int cheapest = Integer.MAX_VALUE;
        int best = 0;
        for (int price : prices) {
            best = Math.max(best, price - cheapest);
            cheapest = Math.min(cheapest, price);
        }
        return best;
    }
}
""",
    ),
    _p(
        122, "Best Time to Buy and Sell Stock II", "MEDIUM", GREEDY,
        "maxProfit", [("prices", "int[]")], "int",
        "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`. You "
        "may buy and sell as many times as you like, but you may hold at most one share at a time.\n\n"
        "Return the maximum profit you can achieve.",
        [
            {"input": "[7,1,5,3,6,4]", "expected": "7", "hidden": False, "order": 1},
            {"input": "[1,2,3,4,5]", "expected": "4", "hidden": False, "order": 2},
            {"input": "[7,6,4,3,1]", "expected": "0", "hidden": False, "order": 3},
        ],
        constraints="1 <= prices.length <= 3 * 10^4\n0 <= prices[i] <= 10^4",
        input_format="Integer array prices",
        output_format="An integer profit",
        time="O(n)", space="O(1)",
        hints=[
            "Unlimited transactions means you never have to decide between two peaks: you can take "
            "both.",
            "Any profitable multi-day climb decomposes into the sum of its consecutive daily rises, "
            "and the sum is the same.",
            "So just add up every positive difference between adjacent days. Be ready to justify "
            "why the greedy choice is optimal.",
        ],
        solution=r"""
class Solution {
    public int maxProfit(int[] prices) {
        int total = 0;
        for (int i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) total += prices[i] - prices[i - 1];
        }
        return total;
    }
}
""",
    ),
    _p(
        680, "Valid Palindrome II", "EASY", TWO,
        "validPalindrome", [("s", "String")], "boolean",
        "Given a string `s`, return `true` if it can become a palindrome after deleting at most one "
        "character.",
        [
            {"input": '"aba"', "expected": "true", "hidden": False, "order": 1},
            {"input": '"abca"', "expected": "true", "hidden": False, "order": 2},
            {"input": '"abc"', "expected": "false", "hidden": False, "order": 3},
            {"input": '"deeee"', "expected": "true", "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 10^5\ns consists of lowercase English letters",
        input_format="A quoted string",
        output_format="true or false",
        time="O(n)", space="O(1)",
        hints=[
            "Walk two pointers inward. While the characters match there is no decision to make.",
            "At the first mismatch you have exactly two candidate repairs: drop the left character "
            "or drop the right one.",
            "Check whether either remaining substring is a plain palindrome. That is one extra "
            "linear scan, so the whole thing stays O(n).",
        ],
        solution=r"""
class Solution {
    public boolean validPalindrome(String s) {
        int left = 0;
        int right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) {
                return isPalindrome(s, left + 1, right) || isPalindrome(s, left, right - 1);
            }
            left++;
            right--;
        }
        return true;
    }

    private boolean isPalindrome(String s, int left, int right) {
        while (left < right) {
            if (s.charAt(left++) != s.charAt(right--)) return false;
        }
        return true;
    }
}
""",
    ),
    _p(
        16, "3Sum Closest", "MEDIUM", TWO,
        "threeSumClosest", [("nums", "int[]"), ("target", "int")], "int",
        "Given an integer array `nums` of length `n` and an integer `target`, return the sum of the "
        "three integers whose sum is closest to `target`. Exactly one such sum exists.",
        [
            {"input": "[-1,2,1,-4]\n1", "expected": "2", "hidden": False, "order": 1},
            {"input": "[0,0,0]\n1", "expected": "0", "hidden": False, "order": 2},
            {"input": "[1,1,1,0]\n-100", "expected": "2", "hidden": False, "order": 3},
        ],
        constraints="3 <= nums.length <= 500\n-1000 <= nums[i] <= 1000",
        input_format="Line 1: nums\nLine 2: target",
        output_format="An integer sum",
        time="O(n^2)", space="O(1)",
        hints=[
            "Same shape as 3Sum: sort, fix one index, then sweep two pointers over the rest.",
            "You no longer stop at an exact match, so instead of collecting hits you keep the sum "
            "with the smallest absolute distance to the target.",
            "Move the pointer in the direction that reduces the gap, and return early on an exact "
            "match since nothing can beat a distance of zero.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int threeSumClosest(int[] nums, int target) {
        Arrays.sort(nums);
        int best = nums[0] + nums[1] + nums[2];
        for (int i = 0; i + 2 < nums.length; i++) {
            int left = i + 1;
            int right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (Math.abs(sum - target) < Math.abs(best - target)) best = sum;
                if (sum == target) return sum;
                if (sum < target) left++;
                else right--;
            }
        }
        return best;
    }
}
""",
    ),
    _p(
        22, "Generate Parentheses", "MEDIUM", BACKTRACK,
        "generateParenthesis", [("n", "int")], "List<String>",
        "Given `n` pairs of parentheses, generate all combinations of well-formed parentheses.",
        [
            {"input": "3", "expected": '["((()))","(()())","(())()","()(())","()()()"]',
             "hidden": False, "order": 1},
            {"input": "1", "expected": '["()"]', "hidden": False, "order": 2},
            {"input": "2", "expected": '["(())","()()"]', "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= n <= 8",
        input_format="An integer n",
        output_format="List of balanced strings",
        time="O(4^n / sqrt(n))", space="O(n) recursion depth",
        hints=[
            "Generating all 2^(2n) strings and filtering is correct but wasteful. Prune while you "
            "build instead.",
            "Track how many opening and closing brackets you have placed. You may open while "
            "`open < n`, and close only while `close < open`.",
            "That second rule is the whole problem: it makes every string you reach valid, so no "
            "validation pass is needed.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> out = new ArrayList<>();
        build(new StringBuilder(), 0, 0, n, out);
        return out;
    }

    private void build(StringBuilder path, int open, int close, int n, List<String> out) {
        if (path.length() == 2 * n) {
            out.add(path.toString());
            return;
        }
        if (open < n) {
            path.append('(');
            build(path, open + 1, close, n, out);
            path.deleteCharAt(path.length() - 1);
        }
        if (close < open) {
            path.append(')');
            build(path, open, close + 1, n, out);
            path.deleteCharAt(path.length() - 1);
        }
    }
}
""",
    ),
    _p(
        150, "Evaluate Reverse Polish Notation", "MEDIUM", STACK,
        "evalRPN", [("tokens", "String[]")], "int",
        "You are given an array of strings `tokens` representing an arithmetic expression in "
        "Reverse Polish Notation. Evaluate it and return the result.\n\n"
        "Valid operators are `+`, `-`, `*` and `/`. Division truncates toward zero.",
        [
            {"input": '["2","1","+","3","*"]', "expected": "9", "hidden": False, "order": 1},
            {"input": '["4","13","5","/","+"]', "expected": "6", "hidden": False, "order": 2},
            {"input": '["10","6","9","3","+","-11","*","/","*","17","+","5","+"]',
             "expected": "22", "hidden": False, "order": 3},
            {"input": '["-7","2","/"]', "expected": "-3", "hidden": True, "order": 4},
        ],
        constraints="1 <= tokens.length <= 10^4\nThe expression is always valid",
        input_format="String array of tokens",
        output_format="An integer result",
        time="O(n)", space="O(n)",
        hints=[
            "Postfix notation means an operator always applies to the two most recently produced "
            "values. That is a stack.",
            "Push numbers; on an operator pop twice, apply, and push the result back.",
            "Order matters for `-` and `/`: the first value popped is the right operand. Java "
            "integer division already truncates toward zero.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int evalRPN(String[] tokens) {
        Deque<Integer> stack = new ArrayDeque<>();
        for (String token : tokens) {
            switch (token) {
                case "+", "-", "*", "/" -> {
                    int right = stack.pop();
                    int left = stack.pop();
                    stack.push(switch (token) {
                        case "+" -> left + right;
                        case "-" -> left - right;
                        case "*" -> left * right;
                        default -> left / right;
                    });
                }
                default -> stack.push(Integer.parseInt(token));
            }
        }
        return stack.pop();
    }
}
""",
    ),
    _p(
        394, "Decode String", "MEDIUM", STACK,
        "decodeString", [("s", "String")], "String",
        "Given an encoded string, return its decoded form. The encoding rule is `k[encoded_string]`, "
        "meaning the bracketed string repeats exactly `k` times. Encodings may be nested.",
        [
            {"input": '"3[a]2[bc]"', "expected": '"aaabcbc"', "hidden": False, "order": 1},
            {"input": '"3[a2[c]]"', "expected": '"accaccacc"', "hidden": False, "order": 2},
            {"input": '"2[abc]3[cd]ef"', "expected": '"abcabccdcdcdef"', "hidden": False, "order": 3},
            {"input": '"100[leetcode]"', "expected": '"' + "leetcode" * 100 + '"',
             "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 30\nThe input is always a valid encoding",
        input_format="A quoted encoded string",
        output_format="The decoded string, quoted",
        time="O(output length)", space="O(nesting depth)",
        hints=[
            "Nesting means an inner group must finish before the group containing it, which is the "
            "signature of a stack.",
            "Keep two stacks, or one stack of pairs: the repeat count and the text built so far "
            "before the bracket opened.",
            "On `[` push the current state and reset; on `]` pop and append the current text "
            "repeated k times to the restored text. Digits may be multi-character.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public String decodeString(String s) {
        Deque<Integer> counts = new ArrayDeque<>();
        Deque<StringBuilder> texts = new ArrayDeque<>();
        StringBuilder current = new StringBuilder();
        int count = 0;
        for (char c : s.toCharArray()) {
            if (Character.isDigit(c)) {
                count = count * 10 + (c - '0');
            } else if (c == '[') {
                counts.push(count);
                texts.push(current);
                count = 0;
                current = new StringBuilder();
            } else if (c == ']') {
                StringBuilder outer = texts.pop();
                int repeat = counts.pop();
                for (int i = 0; i < repeat; i++) outer.append(current);
                current = outer;
            } else {
                current.append(c);
            }
        }
        return current.toString();
    }
}
""",
    ),
    _p(
        71, "Simplify Path", "MEDIUM", STACK,
        "simplifyPath", [("path", "String")], "String",
        "Given an absolute Unix-style path, return its simplified canonical form.\n\n"
        "A period refers to the current directory, two periods refer to the parent directory, and "
        "multiple consecutive slashes are treated as one. The canonical path starts with a single "
        "slash and has no trailing slash unless it is the root.",
        [
            {"input": '"/home/"', "expected": '"/home"', "hidden": False, "order": 1},
            {"input": '"/../"', "expected": '"/"', "hidden": False, "order": 2},
            {"input": '"/home//foo/"', "expected": '"/home/foo"', "hidden": False, "order": 3},
            {"input": '"/a/./b/../../c/"', "expected": '"/c"', "hidden": True, "order": 4},
            {"input": '"/a/../../b/../c//.//"', "expected": '"/c"', "hidden": True, "order": 5},
        ],
        constraints="1 <= path.length <= 3000\npath always begins with a single slash",
        input_format="A quoted absolute path",
        output_format="The canonical path, quoted",
        time="O(n)", space="O(n)",
        hints=[
            "Split on the separator and process the segments. Empty segments and single periods are "
            "simply skipped.",
            "Two periods pop the most recent directory, which is exactly a stack operation. Popping "
            "an empty stack at the root must be a no-op, not an error.",
            "Rebuild by joining the stack with separators; an empty stack renders as the root "
            "itself.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public String simplifyPath(String path) {
        Deque<String> stack = new ArrayDeque<>();
        for (String part : path.split("/")) {
            if (part.isEmpty() || part.equals(".")) continue;
            if (part.equals("..")) {
                if (!stack.isEmpty()) stack.pop();
            } else {
                stack.push(part);
            }
        }
        StringBuilder out = new StringBuilder();
        Iterator<String> it = stack.descendingIterator();
        while (it.hasNext()) out.append('/').append(it.next());
        return out.length() == 0 ? "/" : out.toString();
    }
}
""",
    ),
    _p(
        227, "Basic Calculator II", "MEDIUM", STACK,
        "calculate", [("s", "String")], "int",
        "Given a string `s` representing an expression, evaluate it and return the result.\n\n"
        "The expression contains non-negative integers and the operators `+`, `-`, `*` and `/`, "
        "separated by optional spaces. Integer division truncates toward zero.",
        [
            {"input": '"3+2*2"', "expected": "7", "hidden": False, "order": 1},
            {"input": '" 3/2 "', "expected": "1", "hidden": False, "order": 2},
            {"input": '" 3+5 / 2 "', "expected": "5", "hidden": False, "order": 3},
            {"input": '"14-3/2"', "expected": "13", "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 3 * 10^5\nThe expression is always valid",
        input_format="A quoted expression",
        output_format="An integer result",
        time="O(n)", space="O(n)",
        hints=[
            "Precedence is the whole difficulty: multiplication and division bind tighter than "
            "addition and subtraction.",
            "Remember the operator that preceded the number you just parsed. Push plus and minus "
            "results onto a stack as signed values.",
            "For multiplication and division, pop the top of the stack, combine it with the new "
            "number, and push the result back. The answer is the sum of the stack.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int calculate(String s) {
        Deque<Integer> stack = new ArrayDeque<>();
        int number = 0;
        char operator = '+';
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isDigit(c)) number = number * 10 + (c - '0');
            if ((!Character.isDigit(c) && c != ' ') || i == s.length() - 1) {
                switch (operator) {
                    case '+' -> stack.push(number);
                    case '-' -> stack.push(-number);
                    case '*' -> stack.push(stack.pop() * number);
                    default -> stack.push(stack.pop() / number);
                }
                operator = c;
                number = 0;
            }
        }
        int total = 0;
        while (!stack.isEmpty()) total += stack.pop();
        return total;
    }
}
""",
    ),
    _p(
        4, "Median of Two Sorted Arrays", "HARD", BIN,
        "findMedianSortedArrays", [("nums1", "int[]"), ("nums2", "int[]")], "double",
        "Given two sorted arrays `nums1` and `nums2` of sizes `m` and `n`, return the median of the "
        "combined sorted array.\n\nThe overall run time complexity should be O(log(m + n)).",
        [
            {"input": "[1,3]\n[2]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[1,2]\n[3,4]", "expected": "2.5", "hidden": False, "order": 2},
            {"input": "[]\n[1]", "expected": "1", "hidden": False, "order": 3},
            {"input": "[0,0]\n[0,0]", "expected": "0", "hidden": True, "order": 4},
            {"input": "[1,2,3,4,5]\n[6,7,8]", "expected": "4.5", "hidden": True, "order": 5},
        ],
        constraints="0 <= m, n <= 1000\n1 <= m + n <= 2000",
        input_format="Line 1: nums1\nLine 2: nums2",
        output_format="A number (the median)",
        time="O(log(min(m, n)))", space="O(1)",
        hints=[
            "Merging is O(m + n) and will be rejected. The logarithmic bound means you binary "
            "search for something.",
            "You are searching for a partition: cut both arrays so the left halves together hold "
            "exactly half the elements.",
            "A cut is correct when `maxLeft1 <= minRight2` and `maxLeft2 <= minRight1`. Binary "
            "search the cut on the shorter array and use infinities for the out-of-range edges.",
        ],
        solution=r"""
class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
        int m = nums1.length;
        int n = nums2.length;
        int half = (m + n + 1) / 2;
        int low = 0;
        int high = m;
        while (low <= high) {
            int cut1 = low + (high - low) / 2;
            int cut2 = half - cut1;
            int left1 = cut1 == 0 ? Integer.MIN_VALUE : nums1[cut1 - 1];
            int right1 = cut1 == m ? Integer.MAX_VALUE : nums1[cut1];
            int left2 = cut2 == 0 ? Integer.MIN_VALUE : nums2[cut2 - 1];
            int right2 = cut2 == n ? Integer.MAX_VALUE : nums2[cut2];
            if (left1 <= right2 && left2 <= right1) {
                if ((m + n) % 2 == 1) return Math.max(left1, left2);
                return (Math.max(left1, left2) + Math.min(right1, right2)) / 2.0;
            }
            if (left1 > right2) high = cut1 - 1;
            else low = cut1 + 1;
        }
        return 0.0;
    }
}
""",
    ),
    _p(
        278, "First Bad Version", "EASY", BIN,
        "firstBadVersion", [("n", "int"), ("bad", "int")], "int",
        "You are shipping versions `1..n` and one bad commit makes every later version bad too. "
        "Find the first bad version while calling the checker API as few times as possible.\n\n"
        "In this harness the checker is simulated: `bad` is the first bad version, and "
        "`isBadVersion(v)` is true exactly when `v >= bad`. Solve it as if `bad` were hidden from you.",
        [
            {"input": "5\n4", "expected": "4", "hidden": False, "order": 1},
            {"input": "1\n1", "expected": "1", "hidden": False, "order": 2},
            {"input": "2126753390\n1702766719", "expected": "1702766719", "hidden": False, "order": 3},
        ],
        constraints="1 <= bad <= n <= 2^31 - 1",
        input_format="Line 1: n\nLine 2: the first bad version",
        output_format="An integer version number",
        time="O(log n)", space="O(1)",
        hints=[
            "The predicate is monotone: once a version is bad, every later one is bad. That is the "
            "precondition for binary search on the answer.",
            "You want the boundary, not a match, so never return from inside the loop. Narrow until "
            "`low == high`.",
            "With n near 2^31 the midpoint `(low + high) / 2` overflows. Use `low + (high - low) / 2`.",
        ],
        solution=r"""
class Solution {
    private int badVersion;

    public int firstBadVersion(int n, int bad) {
        badVersion = bad;
        int low = 1;
        int high = n;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (isBadVersion(mid)) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    private boolean isBadVersion(int version) {
        return version >= badVersion;
    }
}
""",
    ),
    _p(
        1011, "Capacity To Ship Packages Within D Days", "MEDIUM", BIN,
        "shipWithinDays", [("weights", "int[]"), ("days", "int")], "int",
        "A conveyor belt has packages that must ship within `days` days. Packages are loaded onto "
        "the ship in the given order, and each day you load as much as the ship's capacity allows.\n\n"
        "Return the least ship capacity that gets every package shipped within `days` days.",
        [
            {"input": "[1,2,3,4,5,6,7,8,9,10]\n5", "expected": "15", "hidden": False, "order": 1},
            {"input": "[3,2,2,4,1,4]\n3", "expected": "6", "hidden": False, "order": 2},
            {"input": "[1,2,3,1,1]\n4", "expected": "3", "hidden": False, "order": 3},
        ],
        constraints="1 <= days <= weights.length <= 5 * 10^4\n1 <= weights[i] <= 500",
        input_format="Line 1: weights\nLine 2: days",
        output_format="An integer capacity",
        time="O(n log(sum of weights))", space="O(1)",
        hints=[
            "You are binary searching the answer, not the array. Every capacity between the "
            "heaviest package and the total weight is a candidate.",
            "Feasibility is monotone: if a ship of size c finishes in time, so does every larger "
            "ship.",
            "The feasibility check is a greedy single pass that counts how many days the given "
            "capacity needs. Same template as Koko Eating Bananas.",
        ],
        solution=r"""
class Solution {
    public int shipWithinDays(int[] weights, int days) {
        int low = 0;
        int high = 0;
        for (int weight : weights) {
            low = Math.max(low, weight);
            high += weight;
        }
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (daysNeeded(weights, mid) <= days) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    private int daysNeeded(int[] weights, int capacity) {
        int days = 1;
        int load = 0;
        for (int weight : weights) {
            if (load + weight > capacity) {
                days++;
                load = 0;
            }
            load += weight;
        }
        return days;
    }
}
""",
    ),
    _p(
        2, "Add Two Numbers", "MEDIUM", LINKED,
        "addTwoNumbers", [("l1", "ListNode"), ("l2", "ListNode")], "ListNode",
        "You are given two non-empty linked lists representing two non-negative integers. The digits "
        "are stored in reverse order, one digit per node.\n\n"
        "Add the two numbers and return the sum as a linked list in the same reversed format.",
        [
            {"input": "[2,4,3]\n[5,6,4]", "expected": "[7,0,8]", "hidden": False, "order": 1},
            {"input": "[0]\n[0]", "expected": "[0]", "hidden": False, "order": 2},
            {"input": "[9,9,9,9,9,9,9]\n[9,9,9,9]", "expected": "[8,9,9,9,0,0,0,1]",
             "hidden": False, "order": 3},
            {"input": "[5]\n[5]", "expected": "[0,1]", "hidden": True, "order": 4},
        ],
        constraints="1 <= list length <= 100\n0 <= Node.val <= 9",
        input_format="Line 1: digits of l1\nLine 2: digits of l2",
        output_format="Digits of the sum",
        time="O(max(m, n))", space="O(max(m, n))",
        hints=[
            "Reverse order is a gift: the heads are the least significant digits, so you add "
            "left to right exactly as you would on paper.",
            "Converting to integers overflows for 100-digit inputs. Add digit by digit with a "
            "carry.",
            "Write one loop with the condition `l1 != null || l2 != null || carry != 0` so the "
            "final carry and the length difference are both handled without special cases.",
        ],
        solution=r"""
class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int sum = carry;
            if (l1 != null) {
                sum += l1.val;
                l1 = l1.next;
            }
            if (l2 != null) {
                sum += l2.val;
                l2 = l2.next;
            }
            carry = sum / 10;
            tail.next = new ListNode(sum % 10);
            tail = tail.next;
        }
        return dummy.next;
    }
}
""",
    ),
    _p(
        19, "Remove Nth Node From End of List", "MEDIUM", LINKED,
        "removeNthFromEnd", [("head", "ListNode"), ("n", "int")], "ListNode",
        "Given the head of a linked list, remove the `n`-th node from the end and return the head.\n\n"
        "Follow-up: do it in one pass.",
        [
            {"input": "[1,2,3,4,5]\n2", "expected": "[1,2,3,5]", "hidden": False, "order": 1},
            {"input": "[1]\n1", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[1,2]\n1", "expected": "[1]", "hidden": False, "order": 3},
            {"input": "[1,2]\n2", "expected": "[2]", "hidden": True, "order": 4},
        ],
        constraints="1 <= list length <= 30\n1 <= n <= list length",
        input_format="Line 1: list values\nLine 2: n",
        output_format="The resulting list",
        time="O(n)", space="O(1)",
        hints=[
            "Counting the length first and walking again is two passes. The follow-up wants one.",
            "Advance a lead pointer n steps, then move both pointers together. When the lead hits "
            "the end, the trailing pointer is n from the end.",
            "Start the trailing pointer at a dummy node in front of the head so that removing the "
            "first node needs no special case.",
        ],
        solution=r"""
class Solution {
    public ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0, head);
        ListNode lead = dummy;
        ListNode trail = dummy;
        for (int i = 0; i < n; i++) lead = lead.next;
        while (lead.next != null) {
            lead = lead.next;
            trail = trail.next;
        }
        trail.next = trail.next.next;
        return dummy.next;
    }
}
""",
    ),
    _p(
        21, "Merge Two Sorted Lists", "EASY", LINKED,
        "mergeTwoLists", [("list1", "ListNode"), ("list2", "ListNode")], "ListNode",
        "You are given the heads of two sorted linked lists. Splice them together into one sorted "
        "list and return its head. The result should be made by reusing the existing nodes.",
        [
            {"input": "[1,2,4]\n[1,3,4]", "expected": "[1,1,2,3,4,4]", "hidden": False, "order": 1},
            {"input": "[]\n[]", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[]\n[0]", "expected": "[0]", "hidden": False, "order": 3},
            {"input": "[5]\n[1,2,4]", "expected": "[1,2,4,5]", "hidden": True, "order": 4},
        ],
        constraints="0 <= list length <= 50\n-100 <= Node.val <= 100",
        input_format="Line 1: list1 values\nLine 2: list2 values",
        output_format="The merged list",
        time="O(m + n)", space="O(1)",
        hints=[
            "Always take the smaller of the two current heads and advance that list.",
            "A dummy head removes the special case of choosing the first node, which is where most "
            "of the bugs live.",
            "When one list runs out, attach the remainder of the other in a single assignment "
            "instead of looping.",
        ],
        solution=r"""
class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                tail.next = list1;
                list1 = list1.next;
            } else {
                tail.next = list2;
                list2 = list2.next;
            }
            tail = tail.next;
        }
        tail.next = list1 != null ? list1 : list2;
        return dummy.next;
    }
}
""",
    ),
    _p(
        138, "Copy List with Random Pointer", "MEDIUM", LINKED,
        "copyRandomList", [("nodes", "int[][]")], "int[][]",
        "A linked list has a `next` pointer and an extra `random` pointer that may point at any node "
        "or at nothing. Build a deep copy: every node is new, and the copy's pointers mirror the "
        "original's structure without ever referencing an original node.\n\n"
        "Here the list is encoded as an array of `[value, randomIndex]` pairs, where `randomIndex` "
        "is `-1` when the random pointer is null. Return the copy in the same encoding.",
        [
            {"input": "[[7,-1],[13,0],[11,4],[10,2],[1,0]]",
             "expected": "[[7,-1],[13,0],[11,4],[10,2],[1,0]]", "hidden": False, "order": 1},
            {"input": "[[1,1],[2,1]]", "expected": "[[1,1],[2,1]]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
            {"input": "[[3,-1],[3,0],[3,-1]]", "expected": "[[3,-1],[3,0],[3,-1]]",
             "hidden": True, "order": 4},
        ],
        constraints="0 <= list length <= 1000\nrandomIndex is -1 or a valid index",
        input_format="Array of [value, randomIndex] pairs",
        output_format="The copied list in the same encoding",
        time="O(n)", space="O(n) with a map, O(1) with interleaving",
        hints=[
            "The random pointer may point forward, so you cannot wire it on the first pass: the "
            "target may not exist yet.",
            "Two passes with a HashMap from original node to copy solves it: pass one creates all "
            "the copies, pass two wires next and random.",
            "The O(1) space trick is to interleave each copy directly after its original, set "
            "`copy.random = original.random.next`, then unweave the two lists.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int[][] copyRandomList(int[][] nodes) {
        int n = nodes.length;
        if (n == 0) return new int[0][];
        Node[] originals = new Node[n];
        for (int i = 0; i < n; i++) originals[i] = new Node(nodes[i][0]);
        for (int i = 0; i < n; i++) {
            originals[i].next = i + 1 < n ? originals[i + 1] : null;
            originals[i].random = nodes[i][1] >= 0 ? originals[nodes[i][1]] : null;
        }
        Map<Node, Node> copies = new HashMap<>();
        for (Node cur = originals[0]; cur != null; cur = cur.next) copies.put(cur, new Node(cur.val));
        for (Node cur = originals[0]; cur != null; cur = cur.next) {
            copies.get(cur).next = copies.get(cur.next);
            copies.get(cur).random = copies.get(cur.random);
        }
        List<Node> order = new ArrayList<>();
        Map<Node, Integer> indexOf = new HashMap<>();
        for (Node cur = copies.get(originals[0]); cur != null; cur = cur.next) {
            indexOf.put(cur, order.size());
            order.add(cur);
        }
        int[][] out = new int[order.size()][2];
        for (int i = 0; i < order.size(); i++) {
            Node node = order.get(i);
            out[i][0] = node.val;
            out[i][1] = node.random == null ? -1 : indexOf.get(node.random);
        }
        return out;
    }
}
class Node {
    int val;
    Node next;
    Node random;
    Node(int val) { this.val = val; }
}
""",
    ),
    _p(
        143, "Reorder List", "MEDIUM", LINKED,
        "reorderList", [("head", "ListNode")], "ListNode",
        "Given the head of a singly linked list `L0 -> L1 -> ... -> Ln-1 -> Ln`, reorder it to "
        "`L0 -> Ln -> L1 -> Ln-1 -> L2 -> ...`.\n\n"
        "You may not modify the node values, only the links between nodes.",
        [
            {"input": "[1,2,3,4]", "expected": "[1,4,2,3]", "hidden": False, "order": 1},
            {"input": "[1,2,3,4,5]", "expected": "[1,5,2,4,3]", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "[1]", "hidden": False, "order": 3},
            {"input": "[1,2]", "expected": "[1,2]", "hidden": True, "order": 4},
        ],
        constraints="1 <= list length <= 5 * 10^4\n1 <= Node.val <= 1000",
        input_format="List values",
        output_format="The reordered list",
        time="O(n)", space="O(1)",
        hints=[
            "A singly linked list cannot be walked backwards, which is what the interleaving seems "
            "to need.",
            "Three known sub-problems in sequence: find the middle with slow and fast pointers, "
            "reverse the second half, then merge the two halves alternately.",
            "Cut the list at the middle before reversing, or the merge walks into a cycle.",
        ],
        solution=r"""
class Solution {
    public ListNode reorderList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode slow = head;
        ListNode fast = head;
        while (fast.next != null && fast.next.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode second = slow.next;
        slow.next = null;
        ListNode prev = null;
        while (second != null) {
            ListNode next = second.next;
            second.next = prev;
            prev = second;
            second = next;
        }
        ListNode first = head;
        while (prev != null) {
            ListNode firstNext = first.next;
            ListNode prevNext = prev.next;
            first.next = prev;
            prev.next = firstNext;
            first = firstNext;
            prev = prevNext;
        }
        return head;
    }
}
""",
    ),
    _p(
        234, "Palindrome Linked List", "EASY", LINKED,
        "isPalindrome", [("head", "ListNode")], "boolean",
        "Given the head of a singly linked list, return `true` if it reads the same forwards and "
        "backwards.\n\nFollow-up: solve it in O(n) time and O(1) space.",
        [
            {"input": "[1,2,2,1]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "true", "hidden": False, "order": 3},
            {"input": "[1,2,3,2,1]", "expected": "true", "hidden": True, "order": 4},
        ],
        constraints="1 <= list length <= 10^5\n0 <= Node.val <= 9",
        input_format="List values",
        output_format="true or false",
        time="O(n)", space="O(1)",
        hints=[
            "Copying the values into an ArrayList and using two pointers is O(n) space, which the "
            "follow-up rules out.",
            "Find the middle with slow and fast pointers, reverse the second half in place, then "
            "compare the two halves.",
            "Mention that this mutates the input, and offer to restore the list afterwards. "
            "Interviewers notice.",
        ],
        solution=r"""
class Solution {
    public boolean isPalindrome(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode prev = null;
        while (slow != null) {
            ListNode next = slow.next;
            slow.next = prev;
            prev = slow;
            slow = next;
        }
        ListNode front = head;
        ListNode back = prev;
        while (back != null) {
            if (front.val != back.val) return false;
            front = front.next;
            back = back.next;
        }
        return true;
    }
}
""",
    ),
    _p(
        148, "Sort List", "MEDIUM", LINKED,
        "sortList", [("head", "ListNode")], "ListNode",
        "Given the head of a linked list, return the list sorted in ascending order.\n\n"
        "Follow-up: sort it in O(n log n) time using constant extra space.",
        [
            {"input": "[4,2,1,3]", "expected": "[1,2,3,4]", "hidden": False, "order": 1},
            {"input": "[-1,5,3,4,0]", "expected": "[-1,0,3,4,5]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
            {"input": "[1,1,1]", "expected": "[1,1,1]", "hidden": True, "order": 4},
        ],
        constraints="0 <= list length <= 5 * 10^4\n-10^5 <= Node.val <= 10^5",
        input_format="List values",
        output_format="The sorted list",
        time="O(n log n)", space="O(log n) recursion depth",
        hints=[
            "Quicksort needs random access to pick pivots well; merge sort only ever walks "
            "forwards, which is exactly what a linked list supports.",
            "Split at the middle using slow and fast pointers, sort both halves recursively, then "
            "merge them with the Merge Two Sorted Lists routine.",
            "Sever the link before the second half, otherwise the recursion never shrinks and you "
            "get infinite recursion on a two-node list.",
        ],
        solution=r"""
class Solution {
    public ListNode sortList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode slow = head;
        ListNode fast = head.next;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode second = slow.next;
        slow.next = null;
        return merge(sortList(head), sortList(second));
    }

    private ListNode merge(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) {
                tail.next = a;
                a = a.next;
            } else {
                tail.next = b;
                b = b.next;
            }
            tail = tail.next;
        }
        tail.next = a != null ? a : b;
        return dummy.next;
    }
}
""",
    ),
    _p(
        100, "Same Tree", "EASY", TREE,
        "isSameTree", [("p", "TreeNode"), ("q", "TreeNode")], "boolean",
        "Given the roots of two binary trees, return `true` if they are structurally identical and "
        "every corresponding pair of nodes holds the same value.",
        [
            {"input": "[1,2,3]\n[1,2,3]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2]\n[1,null,2]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[1,2,1]\n[1,1,2]", "expected": "false", "hidden": False, "order": 3},
            {"input": "[]\n[]", "expected": "true", "hidden": True, "order": 4},
        ],
        constraints="0 <= node count <= 100\n-10^4 <= Node.val <= 10^4",
        input_format="Line 1: tree p\nLine 2: tree q",
        output_format="true or false",
        time="O(n)", space="O(h)",
        hints=[
            "Two trees are identical when their roots match and both pairs of subtrees are "
            "identical. Write that sentence as the recursion.",
            "There are three base cases, not one: both null is true, exactly one null is false, "
            "and different values is false.",
            "Comparing serialized strings also works but costs O(n) extra space and hides the "
            "structural reasoning the interviewer wants to see.",
        ],
        solution=r"""
class Solution {
    public boolean isSameTree(TreeNode p, TreeNode q) {
        if (p == null && q == null) return true;
        if (p == null || q == null) return false;
        if (p.val != q.val) return false;
        return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
    }
}
""",
    ),
    _p(
        101, "Symmetric Tree", "EASY", TREE,
        "isSymmetric", [("root", "TreeNode")], "boolean",
        "Given the root of a binary tree, return `true` if it is a mirror image of itself around its "
        "centre.",
        [
            {"input": "[1,2,2,3,4,4,3]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2,2,null,3,null,3]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "true", "hidden": False, "order": 3},
            {"input": "[]", "expected": "true", "hidden": True, "order": 4},
        ],
        constraints="0 <= node count <= 1000\n-100 <= Node.val <= 100",
        input_format="Tree in level order",
        output_format="true or false",
        time="O(n)", space="O(h)",
        hints=[
            "Symmetry is a property of a pair of subtrees, not of a single node, so recurse on two "
            "arguments rather than one.",
            "The left subtree must mirror the right subtree: compare left.left with right.right and "
            "left.right with right.left.",
            "Getting that cross-pairing backwards is the classic bug, and it still passes on a tree "
            "whose values are all equal.",
        ],
        solution=r"""
class Solution {
    public boolean isSymmetric(TreeNode root) {
        return root == null || mirrors(root.left, root.right);
    }

    private boolean mirrors(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        if (a.val != b.val) return false;
        return mirrors(a.left, b.right) && mirrors(a.right, b.left);
    }
}
""",
    ),
    _p(
        110, "Balanced Binary Tree", "EASY", TREE,
        "isBalanced", [("root", "TreeNode")], "boolean",
        "Given a binary tree, return `true` if it is height-balanced: for every node, the depths of "
        "its two subtrees differ by at most one.",
        [
            {"input": "[3,9,20,null,null,15,7]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2,2,3,3,null,null,4,4]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[]", "expected": "true", "hidden": False, "order": 3},
            {"input": "[1,null,2,null,3]", "expected": "false", "hidden": True, "order": 4},
        ],
        constraints="0 <= node count <= 5000\n-10^4 <= Node.val <= 10^4",
        input_format="Tree in level order",
        output_format="true or false",
        time="O(n)", space="O(h)",
        hints=[
            "Calling a separate height function at every node recomputes the same subtrees over and "
            "over and costs O(n^2) on a skewed tree.",
            "Compute the height and the balance verdict in the same recursion.",
            "Return a sentinel such as -1 to mean 'already unbalanced', and propagate it upward "
            "without doing any more work.",
        ],
        solution=r"""
class Solution {
    public boolean isBalanced(TreeNode root) {
        return height(root) >= 0;
    }

    private int height(TreeNode node) {
        if (node == null) return 0;
        int left = height(node.left);
        if (left < 0) return -1;
        int right = height(node.right);
        if (right < 0) return -1;
        if (Math.abs(left - right) > 1) return -1;
        return 1 + Math.max(left, right);
    }
}
""",
    ),
    _p(
        199, "Binary Tree Right Side View", "MEDIUM", TREE,
        "rightSideView", [("root", "TreeNode")], "List<Integer>",
        "Given the root of a binary tree, imagine standing on its right side. Return the values of "
        "the nodes you can see, ordered from top to bottom.",
        [
            {"input": "[1,2,3,null,5,null,4]", "expected": "[1,3,4]", "hidden": False, "order": 1},
            {"input": "[1,null,3]", "expected": "[1,3]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
            {"input": "[1,2,3,4]", "expected": "[1,3,4]", "hidden": True, "order": 4},
        ],
        constraints="0 <= node count <= 100\n-100 <= Node.val <= 100",
        input_format="Tree in level order",
        output_format="List of visible values",
        time="O(n)", space="O(w)",
        hints=[
            "You see exactly one node per level: the rightmost one. So this is level order with a "
            "filter.",
            "Snapshot the queue size per level and keep only the last value dequeued in that level.",
            "The last test case is the trap: the rightmost visible node is not always a right "
            "child, so walking only right pointers is wrong.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<Integer> rightSideView(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        if (root == null) return out;
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                if (i == size - 1) out.add(node.val);
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
        }
        return out;
    }
}
""",
    ),
    _p(
        543, "Diameter of Binary Tree", "EASY", TREE,
        "diameterOfBinaryTree", [("root", "TreeNode")], "int",
        "Given the root of a binary tree, return the length of its diameter: the number of edges on "
        "the longest path between any two nodes. The path does not have to pass through the root.",
        [
            {"input": "[1,2,3,4,5]", "expected": "3", "hidden": False, "order": 1},
            {"input": "[1,2]", "expected": "1", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "0", "hidden": False, "order": 3},
            {"input": "[1,2,3,4,5,null,null,6,null,null,7]", "expected": "4", "hidden": True, "order": 4},
        ],
        constraints="1 <= node count <= 10^4\n-100 <= Node.val <= 100",
        input_format="Tree in level order",
        output_format="An integer edge count",
        time="O(n)", space="O(h)",
        hints=[
            "Every path has a highest node. At that node the path is leftDepth + rightDepth edges "
            "long.",
            "So run a depth computation and, at each node, update a running maximum with the sum of "
            "the two child depths.",
            "The function returns depth while the answer accumulates in a field. Same two-quantity "
            "pattern as Binary Tree Maximum Path Sum.",
        ],
        solution=r"""
class Solution {
    private int best = 0;

    public int diameterOfBinaryTree(TreeNode root) {
        depth(root);
        return best;
    }

    private int depth(TreeNode node) {
        if (node == null) return 0;
        int left = depth(node.left);
        int right = depth(node.right);
        best = Math.max(best, left + right);
        return 1 + Math.max(left, right);
    }
}
""",
    ),
    _p(
        572, "Subtree of Another Tree", "EASY", TREE,
        "isSubtree", [("root", "TreeNode"), ("subRoot", "TreeNode")], "boolean",
        "Given the roots of two binary trees, return `true` if `subRoot` appears in `root` as a "
        "subtree: some node of `root` together with all of its descendants is identical to `subRoot`.",
        [
            {"input": "[3,4,5,1,2]\n[4,1,2]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[3,4,5,1,2,null,null,null,null,0]\n[4,1,2]", "expected": "false",
             "hidden": False, "order": 2},
            {"input": "[1,1]\n[1]", "expected": "true", "hidden": False, "order": 3},
        ],
        constraints="1 <= root node count <= 2000\n1 <= subRoot node count <= 1000",
        input_format="Line 1: root\nLine 2: subRoot",
        output_format="true or false",
        time="O(m * n)", space="O(h)",
        hints=[
            "Reuse Same Tree: at every node of root, ask whether the tree rooted there is identical "
            "to subRoot.",
            "A partial match is not enough. The subtree must include every descendant, which is why "
            "the second test case is false.",
            "For the O(m + n) follow-up, serialize both trees with null markers and run a substring "
            "search. Delimit values so 12 never matches inside 123.",
        ],
        solution=r"""
class Solution {
    public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        if (root == null) return subRoot == null;
        if (same(root, subRoot)) return true;
        return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
    }

    private boolean same(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.val == b.val && same(a.left, b.left) && same(a.right, b.right);
    }
}
""",
    ),
    _p(
        108, "Convert Sorted Array to Binary Search Tree", "EASY", TREE,
        "sortedArrayToBST", [("nums", "int[]")], "TreeNode",
        "Given an integer array `nums` sorted in ascending order, build a height-balanced binary "
        "search tree from it.\n\n"
        "Several trees are valid; this harness expects the one produced by always taking the "
        "lower middle element of a range as its root.",
        [
            {"input": "[-10,-3,0,5,9]", "expected": "[0,-10,5,null,-3,null,9]",
             "hidden": False, "order": 1},
            {"input": "[1,3]", "expected": "[1,null,3]", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "[1]", "hidden": False, "order": 3},
            {"input": "[]", "expected": "[]", "hidden": True, "order": 4},
        ],
        constraints="0 <= nums.length <= 10^4\nnums is sorted in strictly increasing order",
        input_format="Sorted integer array",
        output_format="The tree in level order",
        time="O(n)", space="O(log n) recursion depth",
        hints=[
            "Inserting the values one at a time into a plain BST gives a straight line, not a "
            "balanced tree.",
            "The middle element splits the array into two halves of nearly equal size, so making it "
            "the root keeps the tree balanced by construction.",
            "Recurse on index ranges rather than copying subarrays, or you turn an O(n) algorithm "
            "into O(n log n).",
        ],
        solution=r"""
class Solution {
    public TreeNode sortedArrayToBST(int[] nums) {
        return build(nums, 0, nums.length - 1);
    }

    private TreeNode build(int[] nums, int low, int high) {
        if (low > high) return null;
        int mid = low + (high - low) / 2;
        TreeNode node = new TreeNode(nums[mid]);
        node.left = build(nums, low, mid - 1);
        node.right = build(nums, mid + 1, high);
        return node;
    }
}
""",
    ),
    _p(
        112, "Path Sum", "EASY", TREE,
        "hasPathSum", [("root", "TreeNode"), ("targetSum", "int")], "boolean",
        "Given the root of a binary tree and an integer `targetSum`, return `true` if the tree has a "
        "root-to-leaf path whose values add up to `targetSum`.\n\n"
        "A leaf is a node with no children.",
        [
            {"input": "[5,4,8,11,null,13,4,7,2,null,null,null,1]\n22", "expected": "true",
             "hidden": False, "order": 1},
            {"input": "[1,2,3]\n5", "expected": "false", "hidden": False, "order": 2},
            {"input": "[]\n0", "expected": "false", "hidden": False, "order": 3},
            {"input": "[1,2]\n1", "expected": "false", "hidden": True, "order": 4},
        ],
        constraints="0 <= node count <= 5000\n-1000 <= Node.val <= 1000",
        input_format="Line 1: tree\nLine 2: targetSum",
        output_format="true or false",
        time="O(n)", space="O(h)",
        hints=[
            "Subtract the node's value as you descend, so the question at each node is always the "
            "same shape.",
            "The base case is a leaf, not null. Stopping at null makes a one-child node look like a "
            "valid endpoint, which is what the last test catches.",
            "Negative values mean you cannot prune when the remaining sum goes negative.",
        ],
        solution=r"""
class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
        if (root == null) return false;
        if (root.left == null && root.right == null) return targetSum == root.val;
        int remaining = targetSum - root.val;
        return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
    }
}
""",
    ),
    _p(
        863, "All Nodes Distance K in Binary Tree", "MEDIUM", TREE,
        "distanceK", [("root", "TreeNode"), ("target", "int"), ("k", "int")], "List<Integer>",
        "Given the root of a binary tree, the value of a target node, and an integer `k`, return the "
        "values of all nodes that are exactly `k` edges away from the target node.",
        [
            {"input": "[3,5,1,6,2,0,8,null,null,7,4]\n5\n2", "expected": "[7,4,1]",
             "hidden": False, "order": 1},
            {"input": "[1]\n1\n3", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[0,1,null,3,2]\n2\n1", "expected": "[1]", "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= node count <= 500\n0 <= Node.val <= 500\nAll values are unique",
        input_format="Line 1: tree\nLine 2: target value\nLine 3: k",
        output_format="List of node values",
        time="O(n)", space="O(n)",
        hints=[
            "Distance in a tree runs in both directions, but tree nodes only point downward. That "
            "asymmetry is the whole problem.",
            "Walk the tree once to record every node's parent, which turns it into an undirected "
            "graph.",
            "Then run a breadth-first search from the target over left, right and parent, stopping "
            "after k levels. A visited set keeps you from walking back where you came from.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<Integer> distanceK(TreeNode root, int target, int k) {
        Map<TreeNode, TreeNode> parents = new HashMap<>();
        TreeNode start = link(root, null, target, parents);
        List<Integer> out = new ArrayList<>();
        if (start == null) return out;
        Set<TreeNode> seen = new HashSet<>();
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.add(start);
        seen.add(start);
        int distance = 0;
        while (!queue.isEmpty()) {
            int size = queue.size();
            if (distance == k) {
                for (TreeNode node : queue) out.add(node.val);
                return out;
            }
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                for (TreeNode next : new TreeNode[] { node.left, node.right, parents.get(node) }) {
                    if (next != null && seen.add(next)) queue.add(next);
                }
            }
            distance++;
        }
        return out;
    }

    private TreeNode link(TreeNode node, TreeNode parent, int target,
                          Map<TreeNode, TreeNode> parents) {
        if (node == null) return null;
        parents.put(node, parent);
        if (node.val == target) return node;
        TreeNode left = link(node.left, node, target, parents);
        TreeNode right = link(node.right, node, target, parents);
        return left != null ? left : right;
    }
}
""",
    ),
    _p(
        211, "Design Add and Search Words Data Structure", "MEDIUM", TRIE,
        "process", [("operations", "String[]"), ("args", "String[][]")], "String[]",
        "Design a data structure that supports adding words and searching for them, where a search "
        "pattern may contain the wildcard `.` that matches any single letter.\n\n"
        "Implement `addWord(word)` and `search(word)`. Operations arrive as a list; each entry in "
        "`args` holds the argument for that operation.",
        [
            {"input": '["WordDictionary","addWord","addWord","addWord","search","search","search","search"]\n'
                      '[[],["bad"],["dad"],["mad"],["pad"],["bad"],[".ad"],["b.."]]',
             "expected": '["false","true","true","true"]', "hidden": False, "order": 1},
            {"input": '["WordDictionary","addWord","search","search"]\n[[],["a"],["."],["aa"]]',
             "expected": '["true","false"]', "hidden": False, "order": 2},
        ],
        constraints="1 <= word.length <= 25\nAt most 10^4 calls",
        input_format="Line 1: operations\nLine 2: arguments per operation",
        output_format="String array of search results",
        time="O(L) to add, O(26^dots * L) to search", space="O(total characters)",
        hints=[
            "Without wildcards this is a plain trie. The wildcard is what forces a change of "
            "strategy.",
            "A `.` means the walk can no longer be a single path: you must try every existing child "
            "at that position.",
            "So search becomes a depth-first search over the trie. A concrete letter follows one "
            "child; a dot branches into all of them.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public String[] process(String[] operations, String[][] args) {
        WordDictionary dictionary = new WordDictionary();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "addWord" -> dictionary.addWord(args[i][0]);
                case "search" -> out.add(String.valueOf(dictionary.search(args[i][0])));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class WordDictionary {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean terminal;
    }

    private final TrieNode root = new TrieNode();

    public WordDictionary() {}

    public void addWord(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int index = c - 'a';
            if (node.children[index] == null) node.children[index] = new TrieNode();
            node = node.children[index];
        }
        node.terminal = true;
    }

    public boolean search(String word) {
        return match(word, 0, root);
    }

    private boolean match(String word, int index, TrieNode node) {
        if (node == null) return false;
        if (index == word.length()) return node.terminal;
        char c = word.charAt(index);
        if (c != '.') return match(word, index + 1, node.children[c - 'a']);
        for (TrieNode child : node.children) {
            if (match(word, index + 1, child)) return true;
        }
        return false;
    }
}
""",
    ),
    _p(
        212, "Word Search II", "HARD", TRIE,
        "findWords", [("board", "String[]"), ("words", "String[]")], "List<String>",
        "Given an `m x n` board of characters and a list of words, return every word from the list "
        "that can be formed by walking through adjacent cells. A cell may not be reused within a "
        "single word.",
        [
            {"input": '["oaan","etae","ihkr","iflv"]\n["oath","pea","eat","rain"]',
             "expected": '["oath","eat"]', "hidden": False, "order": 1},
            {"input": '["ab","cd"]\n["abcb"]', "expected": "[]", "hidden": False, "order": 2},
            {"input": '["a"]\n["a"]', "expected": '["a"]', "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= m, n <= 12\n1 <= words.length <= 3 * 10^4",
        input_format="Line 1: board rows\nLine 2: words to find",
        output_format="List of found words",
        time="O(m * n * 4^L)", space="O(total characters in words)",
        hints=[
            "Running Word Search once per word rescans the whole board thousands of times. The fix "
            "is to search for all words at once.",
            "Build a trie of the words, then depth-first search the board while walking the trie in "
            "step. A cell that matches no trie child prunes the entire branch immediately.",
            "Record a word when you reach a terminal node, and clear the flag so duplicates are not "
            "reported twice. Pruning dead trie leaves keeps later searches fast.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        String word;
    }

    public List<String> findWords(String[] board, String[] words) {
        TrieNode root = new TrieNode();
        for (String word : words) {
            TrieNode node = root;
            for (char c : word.toCharArray()) {
                int index = c - 'a';
                if (node.children[index] == null) node.children[index] = new TrieNode();
                node = node.children[index];
            }
            node.word = word;
        }
        char[][] grid = new char[board.length][];
        for (int r = 0; r < board.length; r++) grid[r] = board[r].toCharArray();
        List<String> out = new ArrayList<>();
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) walk(grid, r, c, root, out);
        }
        return out;
    }

    private void walk(char[][] grid, int r, int c, TrieNode node, List<String> out) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) return;
        char letter = grid[r][c];
        if (letter == '#') return;
        TrieNode next = node.children[letter - 'a'];
        if (next == null) return;
        if (next.word != null) {
            out.add(next.word);
            next.word = null;
        }
        grid[r][c] = '#';
        walk(grid, r + 1, c, next, out);
        walk(grid, r - 1, c, next, out);
        walk(grid, r, c + 1, next, out);
        walk(grid, r, c - 1, next, out);
        grid[r][c] = letter;
    }
}
""",
    ),
    _p(
        295, "Find Median from Data Stream", "HARD", HEAP,
        "process", [("operations", "String[]"), ("values", "int[]")], "double[]",
        "Design a structure that accepts a stream of integers and can report the median of every "
        "value seen so far.\n\n"
        "Implement `addNum(num)` and `findMedian()`. Operations arrive as a list, with the argument "
        "for each in `values`.",
        [
            {"input": '["MedianFinder","addNum","addNum","findMedian","addNum","findMedian"]\n[0,1,2,0,3,0]',
             "expected": "[1.5,2]", "hidden": False, "order": 1},
            {"input": '["MedianFinder","addNum","findMedian"]\n[0,5,0]', "expected": "[5]",
             "hidden": False, "order": 2},
        ],
        constraints="-10^5 <= num <= 10^5\nAt most 5 * 10^4 calls",
        input_format="Line 1: operations\nLine 2: argument per operation",
        output_format="Array of medians",
        time="O(log n) to add, O(1) to read", space="O(n)",
        hints=[
            "Keeping the stream sorted costs O(n) per insert. You never need the full order, only "
            "the middle.",
            "Split the values into a max-heap of the smaller half and a min-heap of the larger "
            "half. The median is at one or both of the two roots.",
            "After every insert, rebalance so the sizes differ by at most one. Always pushing "
            "through one heap and popping into the other keeps the halves correct.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public double[] process(String[] operations, int[] values) {
        MedianFinder finder = new MedianFinder();
        List<Double> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "addNum" -> finder.addNum(values[i]);
                case "findMedian" -> out.add(finder.findMedian());
                default -> {}
            }
        }
        double[] arr = new double[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class MedianFinder {
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Comparator.reverseOrder());
    private final PriorityQueue<Integer> high = new PriorityQueue<>();

    public MedianFinder() {}

    public void addNum(int num) {
        low.add(num);
        high.add(low.poll());
        if (high.size() > low.size()) low.add(high.poll());
    }

    public double findMedian() {
        if (low.size() > high.size()) return low.peek();
        return (low.peek() + high.peek()) / 2.0;
    }
}
""",
    ),
    _p(
        973, "K Closest Points to Origin", "MEDIUM", HEAP,
        "kClosest", [("points", "int[][]"), ("k", "int")], "int[][]",
        "Given an array of points on the plane and an integer `k`, return the `k` points closest to "
        "the origin. The answer may be returned in any order.",
        [
            {"input": "[[1,3],[-2,2]]\n1", "expected": "[[-2,2]]", "hidden": False, "order": 1},
            {"input": "[[3,3],[5,-1],[-2,4]]\n2", "expected": "[[3,3],[-2,4]]", "hidden": False, "order": 2},
            {"input": "[[0,1],[1,0]]\n2", "expected": "[[0,1],[1,0]]", "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= k <= points.length <= 10^4\n-10^4 <= xi, yi <= 10^4",
        input_format="Line 1: points\nLine 2: k",
        output_format="The k closest points, any order",
        time="O(n log k)", space="O(k)",
        hints=[
            "Never take the square root. Comparing `x*x + y*y` gives the same ordering and stays in "
            "integer arithmetic.",
            "Sorting everything is O(n log n) and answers more than was asked. A max-heap capped at "
            "k gives O(n log k).",
            "Quickselect gives O(n) on average, which is the answer the interviewer is usually "
            "waiting for.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int[][] kClosest(int[][] points, int k) {
        PriorityQueue<int[]> heap = new PriorityQueue<>(
                (a, b) -> distance(b) - distance(a));
        for (int[] point : points) {
            heap.add(point);
            if (heap.size() > k) heap.poll();
        }
        int[][] out = new int[k][];
        for (int i = 0; i < k; i++) out[i] = heap.poll();
        return out;
    }

    private int distance(int[] point) {
        return point[0] * point[0] + point[1] * point[1];
    }
}
""",
    ),
    _p(
        1046, "Last Stone Weight", "EASY", HEAP,
        "lastStoneWeight", [("stones", "int[]")], "int",
        "You are given an array of stone weights. On each turn, smash the two heaviest stones "
        "together: if they weigh the same both are destroyed, otherwise the heavier one is replaced "
        "by the difference.\n\nReturn the weight of the last remaining stone, or 0 if none remain.",
        [
            {"input": "[2,7,4,1,8,1]", "expected": "1", "hidden": False, "order": 1},
            {"input": "[1]", "expected": "1", "hidden": False, "order": 2},
            {"input": "[2,2]", "expected": "0", "hidden": False, "order": 3},
            {"input": "[3,7,2]", "expected": "2", "hidden": True, "order": 4},
        ],
        constraints="1 <= stones.length <= 30\n1 <= stones[i] <= 1000",
        input_format="Integer array of stone weights",
        output_format="An integer weight",
        time="O(n log n)", space="O(n)",
        hints=[
            "You always need the two largest values, and the smash puts a new value back into the "
            "pool. Re-sorting each round is O(n^2 log n).",
            "A max-heap gives both extractions and the reinsertion in logarithmic time.",
            "Java's PriorityQueue is a min-heap; pass `Comparator.reverseOrder()` rather than "
            "negating the values.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int lastStoneWeight(int[] stones) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(Comparator.reverseOrder());
        for (int stone : stones) heap.add(stone);
        while (heap.size() > 1) {
            int first = heap.poll();
            int second = heap.poll();
            if (first != second) heap.add(first - second);
        }
        return heap.isEmpty() ? 0 : heap.peek();
    }
}
""",
    ),
    _p(
        46, "Permutations", "MEDIUM", BACKTRACK,
        "permute", [("nums", "int[]")], "List<List<Integer>>",
        "Given an array `nums` of distinct integers, return all possible permutations. The answer "
        "may be returned in any order.",
        [
            {"input": "[1,2,3]", "expected": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
             "hidden": False, "order": 1},
            {"input": "[0,1]", "expected": "[[0,1],[1,0]]", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "[[1]]", "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= nums.length <= 6\nAll integers are distinct",
        input_format="Integer array nums",
        output_format="List of permutations",
        time="O(n * n!)", space="O(n) recursion depth",
        hints=[
            "Unlike combinations, order matters here, so there is no start index: every unused "
            "element is a candidate at every depth.",
            "Track which elements are already in the current path with a boolean array, or swap "
            "elements into place in the array itself.",
            "Copy the path when you record it. Adding the live list means every result ends up "
            "pointing at the same, eventually empty, list.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        build(nums, new boolean[nums.length], new ArrayList<>(), out);
        return out;
    }

    private void build(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> out) {
        if (path.size() == nums.length) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            path.add(nums[i]);
            build(nums, used, path, out);
            path.remove(path.size() - 1);
            used[i] = false;
        }
    }
}
""",
    ),
    _p(
        78, "Subsets", "MEDIUM", BACKTRACK,
        "subsets", [("nums", "int[]")], "List<List<Integer>>",
        "Given an array `nums` of unique integers, return all possible subsets (the power set). The "
        "solution set must not contain duplicate subsets.",
        [
            {"input": "[1,2,3]", "expected": "[[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]",
             "hidden": False, "order": 1},
            {"input": "[0]", "expected": "[[],[0]]", "hidden": False, "order": 2},
            {"input": "[1,2]", "expected": "[[],[1],[1,2],[2]]", "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= nums.length <= 10\nAll integers are unique",
        input_format="Integer array nums",
        output_format="List of subsets",
        time="O(n * 2^n)", space="O(n) recursion depth",
        hints=[
            "Every element is either in a subset or out of it, so there are exactly 2^n answers and "
            "no way to beat that bound.",
            "Record the current path at every node of the recursion, not only at the leaves: every "
            "prefix is itself a valid subset.",
            "The iterative version is worth knowing too: start with the empty set and, for each new "
            "element, append it to a copy of every set built so far.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        build(nums, 0, new ArrayList<>(), out);
        return out;
    }

    private void build(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
        out.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);
            build(nums, i + 1, path, out);
            path.remove(path.size() - 1);
        }
    }
}
""",
    ),
    _p(
        90, "Subsets II", "MEDIUM", BACKTRACK,
        "subsetsWithDup", [("nums", "int[]")], "List<List<Integer>>",
        "Given an integer array `nums` that may contain duplicates, return all possible subsets. The "
        "solution set must not contain duplicate subsets.",
        [
            {"input": "[1,2,2]", "expected": "[[],[1],[1,2],[1,2,2],[2],[2,2]]",
             "hidden": False, "order": 1},
            {"input": "[0]", "expected": "[[],[0]]", "hidden": False, "order": 2},
            {"input": "[4,4,4,1,4]", "expected": "[[],[1],[1,4],[1,4,4],[1,4,4,4],[1,4,4,4,4],"
                                                  "[4],[4,4],[4,4,4],[4,4,4,4]]",
             "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= nums.length <= 10\n-10 <= nums[i] <= 10",
        input_format="Integer array nums",
        output_format="List of distinct subsets",
        time="O(n * 2^n)", space="O(n) recursion depth",
        hints=[
            "Deduplicating the results with a HashSet works but is a workaround. The interviewer "
            "wants duplicates never generated.",
            "Sort first so equal values are adjacent, which is what makes a local skip rule "
            "possible.",
            "Inside the loop, skip `nums[i]` when `i > start && nums[i] == nums[i-1]`. The `i > "
            "start` part is essential: it allows the duplicate one level deeper, only not as a "
            "sibling.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<List<Integer>> subsetsWithDup(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        build(nums, 0, new ArrayList<>(), out);
        return out;
    }

    private void build(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
        out.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            if (i > start && nums[i] == nums[i - 1]) continue;
            path.add(nums[i]);
            build(nums, i + 1, path, out);
            path.remove(path.size() - 1);
        }
    }
}
""",
    ),
    _p(
        17, "Letter Combinations of a Phone Number", "MEDIUM", BACKTRACK,
        "letterCombinations", [("digits", "String")], "List<String>",
        "Given a string of digits from 2 to 9, return every letter combination the number could "
        "spell on a classic phone keypad.",
        [
            {"input": '"23"', "expected": '["ad","ae","af","bd","be","bf","cd","ce","cf"]',
             "hidden": False, "order": 1},
            {"input": '""', "expected": "[]", "hidden": False, "order": 2},
            {"input": '"2"', "expected": '["a","b","c"]', "hidden": False, "order": 3},
            {"input": '"79"', "expected": '["pw","px","py","pz","qw","qx","qy","qz","rw","rx","ry","rz",'
                                          '"sw","sx","sy","sz"]',
             "hidden": True, "order": 4},
        ],
        compare="any_order",
        constraints="0 <= digits.length <= 4\ndigits[i] is in the range 2 to 9",
        input_format="A quoted digit string",
        output_format="List of letter combinations",
        time="O(4^n * n)", space="O(n) recursion depth",
        hints=[
            "This is a cartesian product: one choice per digit, taken from that digit's letters.",
            "Recurse on the digit index; at depth i, loop over the letters mapped to digits[i].",
            "The empty input must return an empty list, not a list containing the empty string. "
            "Check it before you start.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    private static final String[] KEYS = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };

    public List<String> letterCombinations(String digits) {
        List<String> out = new ArrayList<>();
        if (digits.isEmpty()) return out;
        build(digits, 0, new StringBuilder(), out);
        return out;
    }

    private void build(String digits, int index, StringBuilder path, List<String> out) {
        if (index == digits.length()) {
            out.add(path.toString());
            return;
        }
        for (char letter : KEYS[digits.charAt(index) - '0'].toCharArray()) {
            path.append(letter);
            build(digits, index + 1, path, out);
            path.deleteCharAt(path.length() - 1);
        }
    }
}
""",
    ),
    _p(
        131, "Palindrome Partitioning", "MEDIUM", BACKTRACK,
        "partition", [("s", "String")], "List<List<String>>",
        "Given a string `s`, partition it so that every substring in the partition is a palindrome. "
        "Return all possible partitions.",
        [
            {"input": '"aab"', "expected": '[["a","a","b"],["aa","b"]]', "hidden": False, "order": 1},
            {"input": '"a"', "expected": '[["a"]]', "hidden": False, "order": 2},
            {"input": '"aba"', "expected": '[["a","b","a"],["aba"]]', "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= s.length <= 16\ns contains lowercase English letters only",
        input_format="A quoted string",
        output_format="List of palindrome partitions",
        time="O(n * 2^n)", space="O(n) recursion depth",
        hints=[
            "At each position you choose where the next cut goes. Only cuts that produce a "
            "palindrome are worth exploring.",
            "Recurse on the start index: for every end from start onward, if the slice is a "
            "palindrome, take it and recurse from end + 1.",
            "Checking each candidate in O(n) is fine for n up to 16. For larger inputs, precompute "
            "an `isPalindrome[i][j]` table in O(n^2) first.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<List<String>> partition(String s) {
        List<List<String>> out = new ArrayList<>();
        build(s, 0, new ArrayList<>(), out);
        return out;
    }

    private void build(String s, int start, List<String> path, List<List<String>> out) {
        if (start == s.length()) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int end = start; end < s.length(); end++) {
            if (!isPalindrome(s, start, end)) continue;
            path.add(s.substring(start, end + 1));
            build(s, end + 1, path, out);
            path.remove(path.size() - 1);
        }
    }

    private boolean isPalindrome(String s, int left, int right) {
        while (left < right) {
            if (s.charAt(left++) != s.charAt(right--)) return false;
        }
        return true;
    }
}
""",
    ),
    _p(
        130, "Surrounded Regions", "MEDIUM", GRAPH,
        "solve", [("board", "String[]")], "String[]",
        "Given an `m x n` board of `X` and `O` characters, capture every region of `O` cells that is "
        "completely surrounded by `X`. A region is captured by flipping all of its `O` cells to `X`.\n\n"
        "Cells connected to the border are never captured.",
        [
            {"input": '["XXXX","XOOX","XXOX","XOXX"]', "expected": '["XXXX","XXXX","XXXX","XOXX"]',
             "hidden": False, "order": 1},
            {"input": '["X"]', "expected": '["X"]', "hidden": False, "order": 2},
            {"input": '["OOO","OOO","OOO"]', "expected": '["OOO","OOO","OOO"]',
             "hidden": False, "order": 3},
        ],
        constraints="1 <= m, n <= 200\nboard[i][j] is either X or O",
        input_format="Board rows as strings",
        output_format="The board after capture",
        time="O(m * n)", space="O(m * n)",
        hints=[
            "Searching each region and then asking whether it touched the border means tracking the "
            "whole region as you go.",
            "Invert the problem: the only regions that survive are those reachable from the border, "
            "so flood from the border instead.",
            "Mark border-connected cells with a temporary character, then in one final pass turn "
            "every remaining O into X and every marker back into O.",
        ],
        solution=r"""
class Solution {
    public String[] solve(String[] board) {
        int rows = board.length;
        int cols = board[0].length();
        char[][] grid = new char[rows][];
        for (int r = 0; r < rows; r++) grid[r] = board[r].toCharArray();
        for (int r = 0; r < rows; r++) {
            keep(grid, r, 0);
            keep(grid, r, cols - 1);
        }
        for (int c = 0; c < cols; c++) {
            keep(grid, 0, c);
            keep(grid, rows - 1, c);
        }
        String[] out = new String[rows];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == 'O') grid[r][c] = 'X';
                else if (grid[r][c] == '#') grid[r][c] = 'O';
            }
            out[r] = new String(grid[r]);
        }
        return out;
    }

    private void keep(char[][] grid, int r, int c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) return;
        if (grid[r][c] != 'O') return;
        grid[r][c] = '#';
        keep(grid, r + 1, c);
        keep(grid, r - 1, c);
        keep(grid, r, c + 1);
        keep(grid, r, c - 1);
    }
}
""",
    ),
    _p(
        286, "Walls and Gates", "MEDIUM", GRAPH,
        "wallsAndGates", [("rooms", "int[][]")], "int[][]",
        "You are given an `m x n` grid where `-1` is a wall, `0` is a gate, and `2147483647` is an "
        "empty room.\n\nFill each empty room with the distance to its nearest gate. If a room cannot "
        "reach any gate, leave the value as it is.",
        [
            {"input": "[[2147483647,-1,0,2147483647],[2147483647,2147483647,2147483647,-1],"
                      "[2147483647,-1,2147483647,-1],[0,-1,2147483647,2147483647]]",
             "expected": "[[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]", "hidden": False, "order": 1},
            {"input": "[[-1]]", "expected": "[[-1]]", "hidden": False, "order": 2},
            {"input": "[[2147483647]]", "expected": "[[2147483647]]", "hidden": False, "order": 3},
        ],
        constraints="1 <= m, n <= 250\nValues are -1, 0, or 2147483647",
        input_format="Integer matrix of rooms",
        output_format="The filled matrix",
        time="O(m * n)", space="O(m * n)",
        hints=[
            "Running a search from every room is O((m*n)^2). Run it from the gates instead, all at "
            "once.",
            "Seed a queue with every gate before the first round. Multi-source breadth-first search "
            "then reaches each room by its shortest route automatically.",
            "Write the distance the moment you enqueue a cell; that also serves as the visited "
            "marker and prevents a room being queued twice.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int[][] wallsAndGates(int[][] rooms) {
        Queue<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rooms.length; r++) {
            for (int c = 0; c < rooms[r].length; c++) {
                if (rooms[r][c] == 0) queue.add(new int[] { r, c });
            }
        }
        int[][] steps = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            for (int[] step : steps) {
                int r = cell[0] + step[0];
                int c = cell[1] + step[1];
                if (r < 0 || r >= rooms.length || c < 0 || c >= rooms[r].length) continue;
                if (rooms[r][c] != Integer.MAX_VALUE) continue;
                rooms[r][c] = rooms[cell[0]][cell[1]] + 1;
                queue.add(new int[] { r, c });
            }
        }
        return rooms;
    }
}
""",
    ),
    _p(
        684, "Redundant Connection", "MEDIUM", UNION,
        "findRedundantConnection", [("edges", "int[][]")], "int[]",
        "A tree on `n` nodes has had one extra edge added, producing exactly one cycle. Given the "
        "edge list, return the edge that can be removed so the graph is a tree again.\n\n"
        "If several answers exist, return the one that appears last in the input.",
        [
            {"input": "[[1,2],[1,3],[2,3]]", "expected": "[2,3]", "hidden": False, "order": 1},
            {"input": "[[1,2],[2,3],[3,4],[1,4],[1,5]]", "expected": "[1,4]", "hidden": False, "order": 2},
            {"input": "[[1,2],[1,3],[3,1]]", "expected": "[3,1]", "hidden": True, "order": 3},
        ],
        constraints="3 <= n <= 1000\nThe graph is connected and has exactly one cycle",
        input_format="Array of edges",
        output_format="The redundant edge",
        time="O(n * alpha(n))", space="O(n)",
        hints=[
            "Process the edges in order and ask, for each one, whether its two endpoints are already "
            "connected.",
            "Union-Find answers that in near constant time. The first edge whose endpoints already "
            "share a root is the one that closes the cycle.",
            "Because you scan left to right, that edge is automatically the last one that could be "
            "removed, which is exactly what the problem asks for.",
        ],
        solution=r"""
class Solution {
    public int[] findRedundantConnection(int[][] edges) {
        int[] parent = new int[edges.length + 1];
        for (int i = 0; i < parent.length; i++) parent[i] = i;
        for (int[] edge : edges) {
            int a = find(parent, edge[0]);
            int b = find(parent, edge[1]);
            if (a == b) return edge;
            parent[a] = b;
        }
        return new int[0];
    }

    private int find(int[] parent, int node) {
        while (parent[node] != node) {
            parent[node] = parent[parent[node]];
            node = parent[node];
        }
        return node;
    }
}
""",
    ),
    _p(
        547, "Number of Provinces", "MEDIUM", GRAPH,
        "findCircleNum", [("isConnected", "int[][]")], "int",
        "You are given an `n x n` adjacency matrix where `isConnected[i][j] == 1` means city `i` and "
        "city `j` are directly connected.\n\n"
        "A province is a group of cities that are directly or indirectly connected. Return the "
        "number of provinces.",
        [
            {"input": "[[1,1,0],[1,1,0],[0,0,1]]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[[1,0,0],[0,1,0],[0,0,1]]", "expected": "3", "hidden": False, "order": 2},
            {"input": "[[1,1,1],[1,1,1],[1,1,1]]", "expected": "1", "hidden": False, "order": 3},
        ],
        constraints="1 <= n <= 200\nisConnected[i][i] == 1 and the matrix is symmetric",
        input_format="Adjacency matrix",
        output_format="An integer count",
        time="O(n^2)", space="O(n)",
        hints=[
            "Provinces are connected components, and the input is an adjacency matrix rather than an "
            "edge list.",
            "Count how many times you have to start a fresh traversal from an unvisited city.",
            "Union-Find is the other natural answer: start with n components and decrement once per "
            "edge that joins two different roots.",
        ],
        solution=r"""
class Solution {
    public int findCircleNum(int[][] isConnected) {
        int n = isConnected.length;
        boolean[] seen = new boolean[n];
        int provinces = 0;
        for (int city = 0; city < n; city++) {
            if (seen[city]) continue;
            provinces++;
            visit(isConnected, seen, city);
        }
        return provinces;
    }

    private void visit(int[][] isConnected, boolean[] seen, int city) {
        seen[city] = true;
        for (int next = 0; next < isConnected.length; next++) {
            if (isConnected[city][next] == 1 && !seen[next]) visit(isConnected, seen, next);
        }
    }
}
""",
    ),
    _p(
        542, "01 Matrix", "MEDIUM", GRAPH,
        "updateMatrix", [("mat", "int[][]")], "int[][]",
        "Given an `m x n` binary matrix, return a matrix of the same shape where each cell holds the "
        "distance to the nearest zero. Distance is measured in single horizontal or vertical steps.",
        [
            {"input": "[[0,0,0],[0,1,0],[0,0,0]]", "expected": "[[0,0,0],[0,1,0],[0,0,0]]",
             "hidden": False, "order": 1},
            {"input": "[[0,0,0],[0,1,0],[1,1,1]]", "expected": "[[0,0,0],[0,1,0],[1,2,1]]",
             "hidden": False, "order": 2},
            {"input": "[[0,1,1,1]]", "expected": "[[0,1,2,3]]", "hidden": False, "order": 3},
        ],
        constraints="1 <= m, n <= 10^4\nThere is at least one zero in the matrix",
        input_format="Binary matrix",
        output_format="Matrix of distances",
        time="O(m * n)", space="O(m * n)",
        hints=[
            "Searching outward from each 1 independently repeats enormous amounts of work.",
            "Seed a queue with every zero cell at distance 0 and expand outward once, which is the "
            "same multi-source pattern as Rotting Oranges and Walls and Gates.",
            "Mark unvisited ones with a sentinel first so the search knows which cells still need a "
            "value. The two-pass dynamic programming solution is the O(1) extra space alternative.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int[][] updateMatrix(int[][] mat) {
        int rows = mat.length;
        int cols = mat[0].length;
        Queue<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (mat[r][c] == 0) queue.add(new int[] { r, c });
                else mat[r][c] = -1;
            }
        }
        int[][] steps = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            for (int[] step : steps) {
                int r = cell[0] + step[0];
                int c = cell[1] + step[1];
                if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
                if (mat[r][c] != -1) continue;
                mat[r][c] = mat[cell[0]][cell[1]] + 1;
                queue.add(new int[] { r, c });
            }
        }
        return mat;
    }
}
""",
    ),
    _p(
        70, "Climbing Stairs", "EASY", DP,
        "climbStairs", [("n", "int")], "int",
        "You are climbing a staircase with `n` steps. Each time you may climb either 1 or 2 steps. "
        "In how many distinct ways can you reach the top?",
        [
            {"input": "2", "expected": "2", "hidden": False, "order": 1},
            {"input": "3", "expected": "3", "hidden": False, "order": 2},
            {"input": "45", "expected": "1836311903", "hidden": False, "order": 3},
            {"input": "1", "expected": "1", "hidden": True, "order": 4},
        ],
        constraints="1 <= n <= 45",
        input_format="An integer n",
        output_format="An integer count",
        time="O(n)", space="O(1)",
        hints=[
            "The last move was either a single step or a double step, so ways(n) = ways(n-1) + "
            "ways(n-2).",
            "That is the Fibonacci sequence. Plain recursion recomputes the same values "
            "exponentially many times.",
            "Iterate upward with two rolling variables. This is usually the first dynamic "
            "programming problem an interviewer reaches for, so be able to derive it out loud.",
        ],
        solution=r"""
class Solution {
    public int climbStairs(int n) {
        int prev = 1;
        int cur = 1;
        for (int i = 2; i <= n; i++) {
            int next = prev + cur;
            prev = cur;
            cur = next;
        }
        return cur;
    }
}
""",
    ),
    _p(
        91, "Decode Ways", "MEDIUM", DP,
        "numDecodings", [("s", "String")], "int",
        "A message of letters is encoded to digits with `A` as 1 through `Z` as 26. Given a string "
        "of digits, return the number of ways to decode it.\n\n"
        "Leading zeros are not valid, so `06` cannot be decoded as `F`.",
        [
            {"input": '"12"', "expected": "2", "hidden": False, "order": 1},
            {"input": '"226"', "expected": "3", "hidden": False, "order": 2},
            {"input": '"06"', "expected": "0", "hidden": False, "order": 3},
            {"input": '"2101"', "expected": "1", "hidden": True, "order": 4},
            {"input": '"10"', "expected": "1", "hidden": True, "order": 5},
        ],
        constraints="1 <= s.length <= 100\ns contains only digits",
        input_format="A quoted digit string",
        output_format="An integer count",
        time="O(n)", space="O(1)",
        hints=[
            "At each position you either decode one digit or two, so this has the same recurrence "
            "shape as Climbing Stairs plus validity rules.",
            "A single digit is valid unless it is 0. A pair is valid only when it is between 10 and "
            "26 inclusive.",
            "The zeros are where every wrong answer comes from. Test `06`, `10`, `100` and `2101` "
            "before you claim it works.",
        ],
        solution=r"""
class Solution {
    public int numDecodings(String s) {
        if (s.isEmpty() || s.charAt(0) == '0') return 0;
        int twoBack = 1;
        int oneBack = 1;
        for (int i = 1; i < s.length(); i++) {
            int current = 0;
            if (s.charAt(i) != '0') current += oneBack;
            int pair = (s.charAt(i - 1) - '0') * 10 + (s.charAt(i) - '0');
            if (pair >= 10 && pair <= 26) current += twoBack;
            twoBack = oneBack;
            oneBack = current;
        }
        return oneBack;
    }
}
""",
    ),
    _p(
        139, "Word Break", "MEDIUM", DP,
        "wordBreak", [("s", "String"), ("wordDict", "List<String>")], "boolean",
        "Given a string `s` and a dictionary of words, return `true` if `s` can be segmented into a "
        "sequence of one or more dictionary words. A word may be reused any number of times.",
        [
            {"input": '"leetcode"\n["leet","code"]', "expected": "true", "hidden": False, "order": 1},
            {"input": '"applepenapple"\n["apple","pen"]', "expected": "true", "hidden": False, "order": 2},
            {"input": '"catsandog"\n["cats","dog","sand","and","cat"]', "expected": "false",
             "hidden": False, "order": 3},
            {"input": '"aaaaaaa"\n["aaaa","aaa"]', "expected": "true", "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 300\n1 <= wordDict.length <= 1000",
        input_format="Line 1: the string\nLine 2: dictionary words",
        output_format="true or false",
        time="O(n^2 * L)", space="O(n)",
        hints=[
            "Greedily taking the longest matching prefix fails, which the third test case "
            "demonstrates.",
            "Let dp[i] mean 'the first i characters can be segmented'. dp[0] is true by definition.",
            "dp[i] is true when some j < i has dp[j] true and the slice from j to i is in the "
            "dictionary. Put the dictionary in a HashSet so that lookup is O(1).",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        Set<String> words = new HashSet<>(wordDict);
        boolean[] dp = new boolean[s.length() + 1];
        dp[0] = true;
        for (int end = 1; end <= s.length(); end++) {
            for (int start = 0; start < end; start++) {
                if (dp[start] && words.contains(s.substring(start, end))) {
                    dp[end] = true;
                    break;
                }
            }
        }
        return dp[s.length()];
    }
}
""",
    ),
    _p(
        152, "Maximum Product Subarray", "MEDIUM", DP,
        "maxProduct", [("nums", "int[]")], "int",
        "Given an integer array `nums`, find a contiguous subarray with the largest product and "
        "return that product.",
        [
            {"input": "[2,3,-2,4]", "expected": "6", "hidden": False, "order": 1},
            {"input": "[-2,0,-1]", "expected": "0", "hidden": False, "order": 2},
            {"input": "[-2,3,-4]", "expected": "24", "hidden": False, "order": 3},
            {"input": "[-2]", "expected": "-2", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 2 * 10^4\n-10 <= nums[i] <= 10",
        input_format="Integer array nums",
        output_format="An integer product",
        time="O(n)", space="O(1)",
        hints=[
            "Kadane's algorithm does not transfer directly: a very negative running product becomes "
            "the maximum as soon as another negative arrives.",
            "Track both the maximum and the minimum product ending at the current index.",
            "A negative element swaps their roles, so compute both new values from the old pair "
            "before overwriting either one. A zero resets both.",
        ],
        solution=r"""
class Solution {
    public int maxProduct(int[] nums) {
        int best = nums[0];
        int high = nums[0];
        int low = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int value = nums[i];
            int candidateHigh = Math.max(value, Math.max(high * value, low * value));
            int candidateLow = Math.min(value, Math.min(high * value, low * value));
            high = candidateHigh;
            low = candidateLow;
            best = Math.max(best, high);
        }
        return best;
    }
}
""",
    ),
    _p(
        55, "Jump Game", "MEDIUM", GREEDY,
        "canJump", [("nums", "int[]")], "boolean",
        "You are given an integer array `nums`. You start at the first index and `nums[i]` is the "
        "maximum jump length from position `i`.\n\nReturn `true` if you can reach the last index.",
        [
            {"input": "[2,3,1,1,4]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[3,2,1,0,4]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[0]", "expected": "true", "hidden": False, "order": 3},
            {"input": "[2,0,0]", "expected": "true", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 10^4\n0 <= nums[i] <= 10^5",
        input_format="Integer array nums",
        output_format="true or false",
        time="O(n)", space="O(1)",
        hints=[
            "The dynamic programming answer is O(n^2). Greedy gets it to O(n), and the interviewer "
            "will push for that.",
            "Sweep left to right tracking the furthest index reachable so far.",
            "If the current index ever exceeds that reach, you are stuck and can stop. Otherwise "
            "you reach the end.",
        ],
        solution=r"""
class Solution {
    public boolean canJump(int[] nums) {
        int reach = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > reach) return false;
            reach = Math.max(reach, i + nums[i]);
        }
        return true;
    }
}
""",
    ),
    _p(
        45, "Jump Game II", "MEDIUM", GREEDY,
        "jump", [("nums", "int[]")], "int",
        "You are given an array `nums` where `nums[i]` is the maximum jump length from index `i`. "
        "The last index is always reachable.\n\nReturn the minimum number of jumps to reach it.",
        [
            {"input": "[2,3,1,1,4]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[2,3,0,1,4]", "expected": "2", "hidden": False, "order": 2},
            {"input": "[0]", "expected": "0", "hidden": False, "order": 3},
            {"input": "[1,2,3]", "expected": "2", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 10^4\n0 <= nums[i] <= 1000",
        input_format="Integer array nums",
        output_format="An integer jump count",
        time="O(n)", space="O(1)",
        hints=[
            "Think of it as breadth-first search on a line: every jump count defines a contiguous "
            "band of reachable indices.",
            "Track the end of the current band and the furthest index any position inside it can "
            "reach.",
            "When you walk past the end of the band, take a jump and set the new band end to the "
            "furthest reach. Never loop past the last index or you count one jump too many.",
        ],
        solution=r"""
class Solution {
    public int jump(int[] nums) {
        int jumps = 0;
        int currentEnd = 0;
        int farthest = 0;
        for (int i = 0; i < nums.length - 1; i++) {
            farthest = Math.max(farthest, i + nums[i]);
            if (i == currentEnd) {
                jumps++;
                currentEnd = farthest;
            }
        }
        return jumps;
    }
}
""",
    ),
    _p(
        221, "Maximal Square", "MEDIUM", DP,
        "maximalSquare", [("matrix", "String[]")], "int",
        "Given an `m x n` binary matrix given as rows of `0` and `1` characters, find the largest "
        "square containing only ones and return its area.",
        [
            {"input": '["10100","10111","11111","10010"]', "expected": "4", "hidden": False, "order": 1},
            {"input": '["01","10"]', "expected": "1", "hidden": False, "order": 2},
            {"input": '["0"]', "expected": "0", "hidden": False, "order": 3},
            {"input": '["111","111","111"]', "expected": "9", "hidden": True, "order": 4},
        ],
        constraints="1 <= m, n <= 300\nmatrix[i][j] is 0 or 1",
        input_format="Matrix rows as strings",
        output_format="An integer area",
        time="O(m * n)", space="O(n)",
        hints=[
            "Let dp[r][c] be the side length of the largest all-ones square whose bottom-right "
            "corner is at (r, c).",
            "A square of side k at (r, c) requires squares of side k-1 above, to the left, and "
            "diagonally up-left, so dp[r][c] = 1 + min of those three.",
            "Track the largest side you ever see and square it at the end. Only the previous row is "
            "needed, so the space can drop to O(n).",
        ],
        solution=r"""
class Solution {
    public int maximalSquare(String[] matrix) {
        int rows = matrix.length;
        int cols = matrix[0].length();
        int[] prev = new int[cols + 1];
        int[] cur = new int[cols + 1];
        int best = 0;
        for (int r = 1; r <= rows; r++) {
            for (int c = 1; c <= cols; c++) {
                if (matrix[r - 1].charAt(c - 1) == '1') {
                    cur[c] = 1 + Math.min(prev[c - 1], Math.min(prev[c], cur[c - 1]));
                    best = Math.max(best, cur[c]);
                } else {
                    cur[c] = 0;
                }
            }
            int[] swap = prev;
            prev = cur;
            cur = swap;
        }
        return best * best;
    }
}
""",
    ),
    _p(
        416, "Partition Equal Subset Sum", "MEDIUM", DP,
        "canPartition", [("nums", "int[]")], "boolean",
        "Given an integer array `nums`, return `true` if it can be split into two subsets whose sums "
        "are equal.",
        [
            {"input": "[1,5,11,5]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2,3,5]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[2,2,3,5]", "expected": "false", "hidden": False, "order": 3},
            {"input": "[1,1]", "expected": "true", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 200\n1 <= nums[i] <= 100",
        input_format="Integer array nums",
        output_format="true or false",
        time="O(n * sum)", space="O(sum)",
        hints=[
            "Both subsets must sum to half the total, so an odd total is an instant false.",
            "That reduces the problem to the 0/1 knapsack question: can any subset reach exactly "
            "sum/2?",
            "Use a boolean array over achievable sums, and iterate the inner loop downward so each "
            "number is used at most once.",
        ],
        solution=r"""
class Solution {
    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int value : nums) total += value;
        if (total % 2 != 0) return false;
        int target = total / 2;
        boolean[] reachable = new boolean[target + 1];
        reachable[0] = true;
        for (int value : nums) {
            for (int sum = target; sum >= value; sum--) {
                if (reachable[sum - value]) reachable[sum] = true;
            }
        }
        return reachable[target];
    }
}
""",
    ),
    _p(
        647, "Palindromic Substrings", "MEDIUM", DP,
        "countSubstrings", [("s", "String")], "int",
        "Given a string `s`, return the number of palindromic substrings it contains. Substrings at "
        "different positions count separately even when their text is identical.",
        [
            {"input": '"abc"', "expected": "3", "hidden": False, "order": 1},
            {"input": '"aaa"', "expected": "6", "hidden": False, "order": 2},
            {"input": '"aba"', "expected": "4", "hidden": False, "order": 3},
            {"input": '"a"', "expected": "1", "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 1000\ns consists of lowercase English letters",
        input_format="A quoted string",
        output_format="An integer count",
        time="O(n^2)", space="O(1)",
        hints=[
            "Checking every substring for palindromicity is O(n^3). Expanding from centers removes "
            "a whole factor of n.",
            "There are 2n-1 centers: n characters and n-1 gaps. Count one palindrome for every "
            "successful expansion step.",
            "Manacher's algorithm gets it to O(n), but expand-around-center is what interviewers "
            "expect unless they ask for linear explicitly.",
        ],
        solution=r"""
class Solution {
    public int countSubstrings(String s) {
        int total = 0;
        for (int center = 0; center < s.length(); center++) {
            total += count(s, center, center) + count(s, center, center + 1);
        }
        return total;
    }

    private int count(String s, int left, int right) {
        int found = 0;
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            found++;
            left--;
            right++;
        }
        return found;
    }
}
""",
    ),
    _p(
        134, "Gas Station", "MEDIUM", GREEDY,
        "canCompleteCircuit", [("gas", "int[]"), ("cost", "int[]")], "int",
        "There are `n` gas stations in a circle. Station `i` has `gas[i]` fuel and travelling from "
        "station `i` to the next costs `cost[i]` fuel.\n\n"
        "Starting with an empty tank, return the index of the station you should start from to "
        "complete the circuit once, or -1 if it is impossible. The answer is unique when it exists.",
        [
            {"input": "[1,2,3,4,5]\n[3,4,5,1,2]", "expected": "3", "hidden": False, "order": 1},
            {"input": "[2,3,4]\n[3,4,3]", "expected": "-1", "hidden": False, "order": 2},
            {"input": "[5,1,2,3,4]\n[4,4,1,5,1]", "expected": "4", "hidden": False, "order": 3},
        ],
        constraints="1 <= n <= 10^5\n0 <= gas[i], cost[i] <= 10^4",
        input_format="Line 1: gas\nLine 2: cost",
        output_format="An integer index or -1",
        time="O(n)", space="O(1)",
        hints=[
            "Trying every start is O(n^2). Two observations collapse it to one pass.",
            "If the total gas is less than the total cost, no start works at all. Check that "
            "separately.",
            "If the tank goes negative somewhere between i and j, then no station in that range can "
            "be the answer, so restart the candidate at j+1 rather than at i+1.",
        ],
        solution=r"""
class Solution {
    public int canCompleteCircuit(int[] gas, int[] cost) {
        int total = 0;
        int tank = 0;
        int start = 0;
        for (int i = 0; i < gas.length; i++) {
            int gain = gas[i] - cost[i];
            total += gain;
            tank += gain;
            if (tank < 0) {
                start = i + 1;
                tank = 0;
            }
        }
        return total < 0 ? -1 : start;
    }
}
""",
    ),
    _p(
        435, "Non-overlapping Intervals", "MEDIUM", INTERVALS,
        "eraseOverlapIntervals", [("intervals", "int[][]")], "int",
        "Given an array of intervals, return the minimum number you must remove so that the rest do "
        "not overlap. Intervals that touch only at an endpoint do not overlap.",
        [
            {"input": "[[1,2],[2,3],[3,4],[1,3]]", "expected": "1", "hidden": False, "order": 1},
            {"input": "[[1,2],[1,2],[1,2]]", "expected": "2", "hidden": False, "order": 2},
            {"input": "[[1,2],[2,3]]", "expected": "0", "hidden": False, "order": 3},
        ],
        constraints="1 <= intervals.length <= 10^5\n-5 * 10^4 <= start < end <= 5 * 10^4",
        input_format="Array of intervals",
        output_format="An integer count of removals",
        time="O(n log n)", space="O(1)",
        hints=[
            "Removing the fewest intervals is the same as keeping the most, which is the classic "
            "activity selection problem.",
            "Sort by end time, not by start: finishing early leaves the most room for whatever "
            "comes next.",
            "Greedily keep an interval whenever its start is at or after the last kept end, and "
            "count everything else as removed.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int eraseOverlapIntervals(int[][] intervals) {
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[1]));
        int kept = 0;
        int lastEnd = Integer.MIN_VALUE;
        for (int[] interval : intervals) {
            if (interval[0] >= lastEnd) {
                kept++;
                lastEnd = interval[1];
            }
        }
        return intervals.length - kept;
    }
}
""",
    ),
    _p(
        763, "Partition Labels", "MEDIUM", GREEDY,
        "partitionLabels", [("s", "String")], "List<Integer>",
        "Given a string `s`, partition it into as many parts as possible so that each letter appears "
        "in at most one part. Return the sizes of those parts in order.",
        [
            {"input": '"ababcbacadefegdehijhklij"', "expected": "[9,7,8]", "hidden": False, "order": 1},
            {"input": '"eccbbbbdec"', "expected": "[10]", "hidden": False, "order": 2},
            {"input": '"abc"', "expected": "[1,1,1]", "hidden": False, "order": 3},
        ],
        constraints="1 <= s.length <= 500\ns consists of lowercase English letters",
        input_format="A quoted string",
        output_format="List of part sizes",
        time="O(n)", space="O(1)",
        hints=[
            "A part cannot end before the last occurrence of any letter it contains.",
            "Precompute the last index of every letter in one pass, which is at most 26 entries.",
            "Sweep once, extending the current part's end to the furthest last-index seen. When the "
            "cursor reaches that end, cut.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public List<Integer> partitionLabels(String s) {
        int[] lastIndex = new int[26];
        for (int i = 0; i < s.length(); i++) lastIndex[s.charAt(i) - 'a'] = i;
        List<Integer> out = new ArrayList<>();
        int start = 0;
        int end = 0;
        for (int i = 0; i < s.length(); i++) {
            end = Math.max(end, lastIndex[s.charAt(i) - 'a']);
            if (i == end) {
                out.add(end - start + 1);
                start = i + 1;
            }
        }
        return out;
    }
}
""",
    ),
    _p(
        136, "Single Number", "EASY", BIT,
        "singleNumber", [("nums", "int[]")], "int",
        "Given a non-empty array where every element appears twice except for one, find that single "
        "element.\n\nYour solution must run in linear time and use only constant extra space.",
        [
            {"input": "[2,2,1]", "expected": "1", "hidden": False, "order": 1},
            {"input": "[4,1,2,1,2]", "expected": "4", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "1", "hidden": False, "order": 3},
            {"input": "[-3,5,5]", "expected": "-3", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 3 * 10^4\nEvery element but one appears exactly twice",
        input_format="Integer array nums",
        output_format="An integer",
        time="O(n)", space="O(1)",
        hints=[
            "A HashSet or a frequency map solves it in linear time but O(n) space, which the "
            "constraint forbids.",
            "XOR has two properties that matter: a value XOR itself is zero, and the operation is "
            "commutative and associative.",
            "So folding XOR across the whole array cancels every pair and leaves the unique value, "
            "regardless of the order they appear in.",
        ],
        solution=r"""
class Solution {
    public int singleNumber(int[] nums) {
        int result = 0;
        for (int value : nums) result ^= value;
        return result;
    }
}
""",
    ),
    _p(
        191, "Number of 1 Bits", "EASY", BIT,
        "hammingWeight", [("n", "int")], "int",
        "Write a function that takes an integer and returns the number of bits set to 1 in its "
        "binary representation, also known as the Hamming weight.",
        [
            {"input": "11", "expected": "3", "hidden": False, "order": 1},
            {"input": "128", "expected": "1", "hidden": False, "order": 2},
            {"input": "2147483645", "expected": "30", "hidden": False, "order": 3},
            {"input": "0", "expected": "0", "hidden": True, "order": 4},
        ],
        constraints="0 <= n <= 2^31 - 1",
        input_format="An integer n",
        output_format="An integer bit count",
        time="O(set bits)", space="O(1)",
        hints=[
            "Shifting right 32 times and testing the low bit always works and is O(32).",
            "Use the unsigned shift operator in Java. The signed shift keeps the sign bit and loops "
            "forever on negative inputs.",
            "Brian Kernighan's trick is the answer interviewers like: `n & (n - 1)` clears the "
            "lowest set bit, so the loop runs once per set bit instead of once per bit.",
        ],
        solution=r"""
class Solution {
    public int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;
            count++;
        }
        return count;
    }
}
""",
    ),
    _p(
        338, "Counting Bits", "EASY", BIT,
        "countBits", [("n", "int")], "int[]",
        "Given an integer `n`, return an array `ans` of length `n + 1` where `ans[i]` is the number "
        "of ones in the binary representation of `i`.\n\n"
        "Follow-up: do it in a single pass with O(n) total work.",
        [
            {"input": "2", "expected": "[0,1,1]", "hidden": False, "order": 1},
            {"input": "5", "expected": "[0,1,1,2,1,2]", "hidden": False, "order": 2},
            {"input": "0", "expected": "[0]", "hidden": False, "order": 3},
        ],
        constraints="0 <= n <= 10^5",
        input_format="An integer n",
        output_format="Array of bit counts",
        time="O(n)", space="O(1) beyond the output",
        hints=[
            "Counting each number independently is O(n log n). The follow-up wants each answer "
            "derived from an earlier one.",
            "Dropping the lowest bit of i gives `i & (i - 1)`, a strictly smaller number whose "
            "answer you already have.",
            "So ans[i] = ans[i & (i - 1)] + 1. The shift-based variant, ans[i] = ans[i >> 1] + (i & "
            "1), is equally valid.",
        ],
        solution=r"""
class Solution {
    public int[] countBits(int n) {
        int[] ans = new int[n + 1];
        for (int i = 1; i <= n; i++) ans[i] = ans[i & (i - 1)] + 1;
        return ans;
    }
}
""",
    ),
    _p(
        268, "Missing Number", "EASY", BIT,
        "missingNumber", [("nums", "int[]")], "int",
        "Given an array `nums` containing `n` distinct numbers taken from the range `0..n`, return "
        "the one number that is missing.",
        [
            {"input": "[3,0,1]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[0,1]", "expected": "2", "hidden": False, "order": 2},
            {"input": "[9,6,4,2,3,5,7,0,1]", "expected": "8", "hidden": False, "order": 3},
            {"input": "[0]", "expected": "1", "hidden": True, "order": 4},
        ],
        constraints="n == nums.length\n1 <= n <= 10^4\nAll numbers are distinct",
        input_format="Integer array nums",
        output_format="An integer",
        time="O(n)", space="O(1)",
        hints=[
            "Sorting is O(n log n) and a HashSet is O(n) space. Both are beaten here.",
            "The sum of 0 through n is `n * (n + 1) / 2`; subtract the actual sum to get the missing "
            "value.",
            "XOR gives the same answer without any overflow risk: fold every index and every value "
            "together and the pairs cancel.",
        ],
        solution=r"""
class Solution {
    public int missingNumber(int[] nums) {
        int result = nums.length;
        for (int i = 0; i < nums.length; i++) result ^= i ^ nums[i];
        return result;
    }
}
""",
    ),
    _p(
        8, "String to Integer (atoi)", "MEDIUM", STRING,
        "myAtoi", [("s", "String")], "int",
        "Implement `myAtoi(s)`, which converts a string to a 32-bit signed integer.\n\n"
        "Skip leading whitespace, then read an optional sign, then read digits until a "
        "non-digit or the end of the string. Ignore everything after that. If no digits are read, "
        "return 0. Clamp the result to the 32-bit signed range.",
        [
            {"input": '"42"', "expected": "42", "hidden": False, "order": 1},
            {"input": '"   -42"', "expected": "-42", "hidden": False, "order": 2},
            {"input": '"4193 with words"', "expected": "4193", "hidden": False, "order": 3},
            {"input": '"words and 987"', "expected": "0", "hidden": True, "order": 4},
            {"input": '"-91283472332"', "expected": "-2147483648", "hidden": True, "order": 5},
            {"input": '"+1"', "expected": "1", "hidden": True, "order": 6},
        ],
        constraints="0 <= s.length <= 200\ns may contain letters, digits, spaces and sign characters",
        input_format="A quoted string",
        output_format="An integer",
        time="O(n)", space="O(1)",
        hints=[
            "This question is entirely about specification discipline. Write the four phases down "
            "before coding: whitespace, sign, digits, stop.",
            "Overflow is the real test. Detect it before it happens by comparing the accumulator "
            "against `Integer.MAX_VALUE / 10` rather than after multiplying.",
            "Ask the interviewer what counts as whitespace and whether a lone sign is valid; the "
            "clarifying questions are part of what is being graded.",
        ],
        solution=r"""
class Solution {
    public int myAtoi(String s) {
        int index = 0;
        int n = s.length();
        while (index < n && s.charAt(index) == ' ') index++;
        if (index == n) return 0;
        int sign = 1;
        char first = s.charAt(index);
        if (first == '+' || first == '-') {
            sign = first == '-' ? -1 : 1;
            index++;
        }
        int result = 0;
        while (index < n && Character.isDigit(s.charAt(index))) {
            int digit = s.charAt(index) - '0';
            if (result > Integer.MAX_VALUE / 10
                    || (result == Integer.MAX_VALUE / 10 && digit > 7)) {
                return sign == 1 ? Integer.MAX_VALUE : Integer.MIN_VALUE;
            }
            result = result * 10 + digit;
            index++;
        }
        return result * sign;
    }
}
""",
    ),
    _p(
        50, "Pow(x, n)", "MEDIUM", MATH,
        "myPow", [("x", "double"), ("n", "int")], "double",
        "Implement `myPow(x, n)`, which raises `x` to the integer power `n`.",
        [
            {"input": "2.00000\n10", "expected": "1024", "hidden": False, "order": 1},
            {"input": "2.10000\n3", "expected": "9.261", "hidden": False, "order": 2},
            {"input": "2.00000\n-2", "expected": "0.25", "hidden": False, "order": 3},
            {"input": "1.00000\n-2147483648", "expected": "1", "hidden": True, "order": 4},
        ],
        constraints="-100.0 < x < 100.0\n-2^31 <= n <= 2^31 - 1",
        input_format="Line 1: x\nLine 2: n",
        output_format="A number",
        time="O(log n)", space="O(1)",
        hints=[
            "Multiplying n times is O(n) and times out for n near 2^31.",
            "Fast exponentiation halves the exponent each round: x^n is `(x^(n/2))^2`, times one "
            "extra x when n is odd.",
            "Negating n overflows for `Integer.MIN_VALUE`. Widen to a long before flipping the "
            "sign.",
        ],
        solution=r"""
class Solution {
    public double myPow(double x, int n) {
        long exponent = n;
        if (exponent < 0) {
            x = 1 / x;
            exponent = -exponent;
        }
        double result = 1;
        while (exponent > 0) {
            if ((exponent & 1) == 1) result *= x;
            x *= x;
            exponent >>= 1;
        }
        return result;
    }
}
""",
    ),
    _p(
        43, "Multiply Strings", "MEDIUM", MATH,
        "multiply", [("num1", "String"), ("num2", "String")], "String",
        "Given two non-negative integers represented as strings, return their product as a string.\n\n"
        "You must not convert the inputs to a built-in big-integer type or use one directly.",
        [
            {"input": '"2"\n"3"', "expected": '"6"', "hidden": False, "order": 1},
            {"input": '"123"\n"456"', "expected": '"56088"', "hidden": False, "order": 2},
            {"input": '"0"\n"52"', "expected": '"0"', "hidden": False, "order": 3},
            {"input": '"999"\n"999"', "expected": '"998001"', "hidden": True, "order": 4},
        ],
        constraints="1 <= num1.length, num2.length <= 200\nNeither input has leading zeros unless it is 0",
        input_format="Line 1: num1\nLine 2: num2",
        output_format="The product as a quoted string",
        time="O(m * n)", space="O(m + n)",
        hints=[
            "Long multiplication on paper is the algorithm. The trick is knowing where each partial "
            "product lands.",
            "Digit i of num1 times digit j of num2 contributes to positions i+j and i+j+1 of the "
            "result, counting from the left.",
            "Accumulate everything into an int array first and normalise the carries in one final "
            "pass. Strip leading zeros, but never strip a lone zero down to nothing.",
        ],
        solution=r"""
class Solution {
    public String multiply(String num1, String num2) {
        int m = num1.length();
        int n = num2.length();
        int[] digits = new int[m + n];
        for (int i = m - 1; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                int product = (num1.charAt(i) - '0') * (num2.charAt(j) - '0');
                int low = i + j + 1;
                int total = product + digits[low];
                digits[low] = total % 10;
                digits[i + j] += total / 10;
            }
        }
        StringBuilder sb = new StringBuilder();
        for (int digit : digits) {
            if (sb.length() > 0 || digit != 0) sb.append(digit);
        }
        return sb.length() == 0 ? "0" : sb.toString();
    }
}
""",
    ),
    _p(
        273, "Integer to English Words", "HARD", STRING,
        "numberToWords", [("num", "int")], "String",
        "Convert a non-negative integer into its English words representation.",
        [
            {"input": "123", "expected": '"One Hundred Twenty Three"', "hidden": False, "order": 1},
            {"input": "12345", "expected": '"Twelve Thousand Three Hundred Forty Five"',
             "hidden": False, "order": 2},
            {"input": "1234567", "expected": '"One Million Two Hundred Thirty Four Thousand '
                                             'Five Hundred Sixty Seven"',
             "hidden": False, "order": 3},
            {"input": "0", "expected": '"Zero"', "hidden": True, "order": 4},
            {"input": "1000010", "expected": '"One Million Ten"', "hidden": True, "order": 5},
        ],
        constraints="0 <= num <= 2^31 - 1",
        input_format="An integer",
        output_format="The English words, quoted",
        time="O(1)", space="O(1)",
        hints=[
            "Split the number into groups of three digits and name each group: billion, million, "
            "thousand, and the remainder.",
            "Write one helper that spells a number below 1000, and reuse it for every group. "
            "Anything below twenty is a lookup, not a rule.",
            "Whitespace is where this problem is failed: zero groups must contribute nothing at "
            "all, and the final string must have no leading or trailing spaces.",
        ],
        solution=r"""
class Solution {
    private static final String[] BELOW_TWENTY = {
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
        "Eighteen", "Nineteen"
    };
    private static final String[] TENS = {
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    };
    private static final String[] SCALES = { "", "Thousand", "Million", "Billion" };

    public String numberToWords(int num) {
        if (num == 0) return "Zero";
        StringBuilder sb = new StringBuilder();
        int scale = 0;
        while (num > 0) {
            int group = num % 1000;
            if (group != 0) {
                StringBuilder part = new StringBuilder(spell(group));
                if (!SCALES[scale].isEmpty()) part.append(' ').append(SCALES[scale]);
                if (sb.length() > 0) part.append(' ').append(sb);
                sb = part;
            }
            num /= 1000;
            scale++;
        }
        return sb.toString();
    }

    private String spell(int value) {
        if (value == 0) return "";
        if (value < 20) return BELOW_TWENTY[value];
        if (value < 100) {
            String rest = spell(value % 10);
            return TENS[value / 10] + (rest.isEmpty() ? "" : " " + rest);
        }
        String rest = spell(value % 100);
        return BELOW_TWENTY[value / 100] + " Hundred" + (rest.isEmpty() ? "" : " " + rest);
    }
}
""",
    ),
    _p(
        151, "Reverse Words in a String", "MEDIUM", STRING,
        "reverseWords", [("s", "String")], "String",
        "Given an input string `s`, reverse the order of the words.\n\n"
        "Words are separated by one or more spaces. The returned string should have words in "
        "reverse order joined by a single space, with no leading or trailing spaces.",
        [
            {"input": '"the sky is blue"', "expected": '"blue is sky the"', "hidden": False, "order": 1},
            {"input": '"  hello world  "', "expected": '"world hello"', "hidden": False, "order": 2},
            {"input": '"a good   example"', "expected": '"example good a"', "hidden": False, "order": 3},
            {"input": '"single"', "expected": '"single"', "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 10^4\ns contains letters, digits and spaces",
        input_format="A quoted string",
        output_format="The reversed sentence, quoted",
        time="O(n)", space="O(n)",
        hints=[
            "Splitting on one or more spaces and joining the pieces in reverse is a two-line "
            "answer. Have it ready, then expect a follow-up.",
            "The follow-up is in-place with O(1) extra space, which only works on a mutable "
            "character array.",
            "That version is three steps: reverse the whole array, reverse each word, then compact "
            "the runs of spaces down to one.",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public String reverseWords(String s) {
        String[] words = s.trim().split("\\s+");
        Collections.reverse(Arrays.asList(words));
        return String.join(" ", words);
    }
}
""",
    ),
    _p(
        706, "Design HashMap", "EASY", DESIGN,
        "process", [("operations", "String[]"), ("args", "int[][]")], "int[]",
        "Design a HashMap without using any built-in hash table library.\n\n"
        "Implement `put(key, value)`, `get(key)` returning -1 when the key is absent, and "
        "`remove(key)`. Operations arrive as a list, with each call's arguments in `args`.",
        [
            {"input": '["MyHashMap","put","put","get","get","put","get","remove","get"]\n'
                      "[[],[1,1],[2,2],[1],[3],[2,1],[2],[2],[2]]",
             "expected": "[1,-1,1,-1]", "hidden": False, "order": 1},
            {"input": '["MyHashMap","get"]\n[[],[7]]', "expected": "[-1]", "hidden": False, "order": 2},
        ],
        constraints="0 <= key, value <= 10^6\nAt most 10^4 calls",
        input_format="Line 1: operations\nLine 2: arguments per operation",
        output_format="Array of get results",
        time="O(1) average per operation", space="O(n)",
        hints=[
            "A bucket array plus a collision strategy is the whole design. Pick a bucket count that "
            "is prime to spread keys evenly.",
            "Separate chaining stores a linked list per bucket and is the easiest to reason about; "
            "open addressing avoids the pointers but complicates removal.",
            "Be ready for the follow-ups: what is the load factor, when do you resize, and what "
            "does a resize cost amortised?",
        ],
        solution=r"""
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[][] args) {
        MyHashMap map = new MyHashMap();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "put" -> map.put(args[i][0], args[i][1]);
                case "get" -> out.add(map.get(args[i][0]));
                case "remove" -> map.remove(args[i][0]);
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class MyHashMap {
    private static class Entry {
        int key;
        int value;
        Entry next;
        Entry(int key, int value, Entry next) {
            this.key = key;
            this.value = value;
            this.next = next;
        }
    }

    private static final int BUCKETS = 7919;
    private final Entry[] table = new Entry[BUCKETS];

    public MyHashMap() {}

    public void put(int key, int value) {
        int index = key % BUCKETS;
        for (Entry entry = table[index]; entry != null; entry = entry.next) {
            if (entry.key == key) {
                entry.value = value;
                return;
            }
        }
        table[index] = new Entry(key, value, table[index]);
    }

    public int get(int key) {
        for (Entry entry = table[key % BUCKETS]; entry != null; entry = entry.next) {
            if (entry.key == key) return entry.value;
        }
        return -1;
    }

    public void remove(int key) {
        int index = key % BUCKETS;
        Entry prev = null;
        for (Entry entry = table[index]; entry != null; entry = entry.next) {
            if (entry.key == key) {
                if (prev == null) table[index] = entry.next;
                else prev.next = entry.next;
                return;
            }
            prev = entry;
        }
    }
}
""",
    ),
]
