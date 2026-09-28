"""Recommended problems, batch 02: two binary-search gaps and two stack pictures.

35 sits between lc-704 and lc-34, 540 beside lc-33, 946 before lc-155 and lc-84, and 735 beside
lc-739. See ``recommended.md`` for why each one was picked. Every problem carries its reference
solution, hints and costs inline, and every one passes its own tests.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

PROBLEMS: list[dict] = [
    _p(
        35, "Search Insert Position", "EASY", "binary-search",
        "searchInsert", [("nums", "int[]"), ("target", "int")], "int",
        "`nums` is sorted from small to large and has no repeated values. If `target` is in the "
        "list, return its position. If it is not, return the position where it would go so the "
        "list stays sorted.\n\n"
        "Positions start at 0. A value bigger than every number goes at the end, at position "
        "`nums.length`. Aim for O(log n) time.",
        [
            {"input": "[1,3,5,6]\n5", "expected": "2", "hidden": False, "order": 1},
            {"input": "[1,3,5,6]\n2", "expected": "1", "hidden": False, "order": 2},
            {"input": "[1,3,5,6]\n7", "expected": "4", "hidden": False, "order": 3},
            {"input": "[1]\n0", "expected": "0", "hidden": True, "order": 4},
            {"input": "[1,3,5,6]\n0", "expected": "0", "hidden": True, "order": 5},
            {"input": "[-5,-2,0,4,9,12]\n10", "expected": "5", "hidden": True, "order": 6},
        ],
        constraints="1 <= nums.length <= 10^4\n-10^4 <= nums[i], target <= 10^4\nnums is sorted and has no repeats",
        input_format="Line 1: the sorted array nums\nLine 2: integer target",
        output_format="An integer position",
        time="O(log n)", space="O(1)",
        hints=[
            "Reading from the left until you meet a value that is not smaller than `target` works, "
            "but it is O(n). The list is sorted, so you can halve it instead.",
            "Run an ordinary binary search. The only new question is what to return when the "
            "target is missing.",
            "When the loop `while (left <= right)` ends without a match, `left` is the first "
            "position whose value is bigger than `target`. Return `left`, not -1.",
        ],
        solution=r"""
class Solution {
    public int searchInsert(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return left;
    }
}
""",
    ),
    _p(
        540, "Single Element in a Sorted Array", "MEDIUM", "binary-search",
        "singleNonDuplicate", [("nums", "int[]")], "int",
        "`nums` is sorted. Every value appears exactly twice, side by side, except one value "
        "that appears only once. Return that single value.\n\n"
        "Aim for O(log n) time and O(1) extra space. The length of `nums` is always odd.",
        [
            {"input": "[1,1,2,3,3,4,4,8,8]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[3,3,7,7,10,11,11]", "expected": "10", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "1", "hidden": True, "order": 3},
            {"input": "[1,1,2]", "expected": "2", "hidden": True, "order": 4},
            {"input": "[0,1,1]", "expected": "0", "hidden": True, "order": 5},
            {"input": "[1,1,2,2,3,3,4,5,5]", "expected": "4", "hidden": True, "order": 6},
        ],
        constraints="1 <= nums.length <= 10^5\n0 <= nums[i] <= 10^5\nnums is sorted",
        input_format="The sorted array nums",
        output_format="The value that appears once",
        time="O(log n)", space="O(1)",
        hints=[
            "Walking two at a time until a pair does not match works, but it is O(n). Look for a "
            "rule that tells you which half holds the single value.",
            "Before the single value, every pair starts at an even position (0, 2, 4...). After "
            "it, every pair starts at an odd position.",
            "Binary search on even positions. Make `mid` even (step back one if it is odd). If "
            "`nums[mid] == nums[mid + 1]`, the single value is to the right: `left = mid + 2`. "
            "Otherwise `right = mid`.",
        ],
        solution=r"""
class Solution {
    public int singleNonDuplicate(int[] nums) {
        int left = 0;
        int right = nums.length - 1;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (mid % 2 == 1) mid--;
            if (nums[mid] == nums[mid + 1]) left = mid + 2;
            else right = mid;
        }
        return nums[left];
    }
}
""",
    ),
    _p(
        946, "Validate Stack Sequences", "MEDIUM", "stack",
        "validateStackSequences", [("pushed", "int[]"), ("popped", "int[]")], "boolean",
        "A stack is a pile: you can only add to the top, and only take from the top. You must "
        "add the numbers of `pushed` in that order. Between adds, you may take numbers off the "
        "top. Return true if the numbers can come off in exactly the order of `popped`.\n\n"
        "Both arrays hold the same distinct values. Adding is called a push, and taking the top "
        "off is called a pop.",
        [
            {"input": "[1,2,3,4,5]\n[4,5,3,2,1]", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2,3,4,5]\n[4,3,5,1,2]", "expected": "false", "hidden": False, "order": 2},
            {"input": "[1]\n[1]", "expected": "true", "hidden": True, "order": 3},
            {"input": "[2,1,0]\n[1,2,0]", "expected": "true", "hidden": True, "order": 4},
            {"input": "[1,2,3]\n[3,1,2]", "expected": "false", "hidden": True, "order": 5},
            {"input": "[1,2,3,4]\n[1,2,3,4]", "expected": "true", "hidden": True, "order": 6},
        ],
        constraints="1 <= pushed.length <= 1000\npopped.length == pushed.length\n"
                    "0 <= pushed[i] <= 1000\nAll values in pushed are distinct\npopped is a reordering of pushed",
        input_format="Line 1: the array pushed\nLine 2: the array popped",
        output_format="true or false",
        time="O(n)", space="O(n)",
        hints=[
            "Do not try to reason about the order in your head. Act it out with a real stack.",
            "Push the numbers of `pushed` one by one. Keep a pointer to the next number `popped` "
            "wants.",
            "After every push, pop while the top equals the wanted number, and move the pointer "
            "each time. At the end, the order worked only if the stack is empty.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public boolean validateStackSequences(int[] pushed, int[] popped) {
        Deque<Integer> stack = new ArrayDeque<>();
        int want = 0;
        for (int value : pushed) {
            stack.push(value);
            while (!stack.isEmpty() && stack.peek() == popped[want]) {
                stack.pop();
                want++;
            }
        }
        return stack.isEmpty();
    }
}
""",
    ),
    _p(
        735, "Asteroid Collision", "MEDIUM", "stack",
        "asteroidCollision", [("asteroids", "int[]")], "int[]",
        "Asteroids fly in a row. The size of each one is its absolute value. A positive number "
        "moves right and a negative number moves left, all at the same speed. When two meet, the "
        "smaller one explodes. If they are the same size, both explode. Return the asteroids "
        "that are left, in their order.\n\n"
        "Two asteroids moving the same way never meet. A left-moving asteroid that is already to "
        "the left of a right-moving one never meets it either.",
        [
            {"input": "[5,10,-5]", "expected": "[5,10]", "hidden": False, "order": 1},
            {"input": "[8,-8]", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[10,2,-5]", "expected": "[10]", "hidden": False, "order": 3},
            {"input": "[1]", "expected": "[1]", "hidden": True, "order": 4},
            {"input": "[-2,-1,1,-2]", "expected": "[-2,-1,-2]", "hidden": True, "order": 5},
            {"input": "[-3,4,-4,2,-1]", "expected": "[-3,2]", "hidden": True, "order": 6},
        ],
        constraints="1 <= asteroids.length <= 10^4\n"
                    "-1000 <= asteroids[i] <= 1000\nasteroids[i] != 0",
        input_format="The array asteroids",
        output_format="The surviving asteroids as an array",
        time="O(n)", space="O(n)",
        hints=[
            "A crash only happens between a right-moving asteroid and a left-moving one that "
            "comes after it.",
            "Keep the survivors so far in a stack. A new left-moving asteroid can only hit the "
            "survivors at the top, one at a time.",
            "For each asteroid: while it moves left and the top moves right, compare sizes and "
            "pop the loser (both on a tie). If the new one survives, push it. Read the stack "
            "from bottom to top at the end.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public int[] asteroidCollision(int[] asteroids) {
        Deque<Integer> stack = new ArrayDeque<>();
        for (int rock : asteroids) {
            boolean alive = true;
            while (alive && rock < 0 && !stack.isEmpty() && stack.peek() > 0) {
                int top = stack.peek();
                if (top < -rock) {
                    stack.pop();
                } else {
                    if (top == -rock) stack.pop();
                    alive = false;
                }
            }
            if (alive) stack.push(rock);
        }
        int[] result = new int[stack.size()];
        for (int i = result.length - 1; i >= 0; i--) result[i] = stack.pop();
        return result;
    }
}
""",
    ),
]
