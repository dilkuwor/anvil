"""Recommended problems, batch 02 (35, 540, 946, 735). See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-35"],
        "pattern": "Binary search",
        "trigger": "A sorted list with no repeats, and the question “where would this value go?”",
        "summary": (
            "Run an ordinary binary search. If the value is found, return its position. If the two "
            "ends cross without a match, the left end already stands where the value belongs, so return it."
        ),
        "approaches": [
            {
                "name": "Read from the left",
                "idea": "Walk the list from the start and stop at the first value that is not smaller than the target.",
                "steps": [
                    "Start at position 0.",
                    "If the value there is equal to or bigger than the target, that position is the answer.",
                    "Otherwise move one step to the right and look again.",
                    "If you pass the end, the target is bigger than everything, so return the length of the list.",
                ],
                "code": """class Solution {
    public int searchInsert(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] >= target) return i;
        }
        return nums.length;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "A target bigger than every value makes the loop read the whole list.",
                "space_complexity": "O(1)",
                "space_why": "Only the position counter is stored.",
                "when_to_use": "Say it in one sentence to show you understand the question, then move to the halving search.",
                "is_optimal": False,
            },
            {
                "name": "Binary search, return left",
                "idea": "Halve the list each step; when the ends cross, `left` is the insert position.",
                "steps": [
                    "Set `left` to the first position and `right` to the last position.",
                    "While `left` is not past `right`, look at the middle value.",
                    "If the middle value equals the target, return the middle position.",
                    "If the middle value is smaller, move `left` to one past the middle. Otherwise move `right` to one before it.",
                    "When the loop ends, return `left`: it is the first position with a bigger value, or the end of the list.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(log n)",
                "time_why": "Each look throws away half of the positions that are still possible.",
                "space_complexity": "O(1)",
                "space_why": "Only `left`, `right` and `mid` are stored.",
                "when_to_use": "The answer to give. It is the binary search you already know with one changed line at the end.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,3,5,6], target = 2",
            "columns": ["left", "right", "mid", "nums[mid]", "what happens"],
            "rows": [
                ["0", "3", "1", "3", "3 is bigger than 2, so right moves to 0"],
                ["0", "0", "0", "1", "1 is smaller than 2, so left moves to 1"],
                ["1", "0", "-", "-", "left is past right: 2 is not in the list"],
                ["1", "0", "-", "-", "Return left, not -1: position 1 is the gap between 1 and 3"],
            ],
            "result": "2 would go between 1 and 3. The answer is 1.",
        },
        "mistakes": [
            {
                "name": "The Minus-One Trap",
                "wrong": "Copying plain binary search and returning -1 when the target is not found.",
                "right": "A missing value is not a failure here. Return `left`, never -1.",
            },
            {
                "name": "Forgetting the end of the list",
                "wrong": "Using `right = nums.length - 1` with a loop that stops at `left < right`, so position `nums.length` can never be returned.",
                "right": "Use `while (left <= right)` and return `left`. It reaches `nums.length` when the target is bigger than everything.",
            },
            {
                "name": "Middle that overflows",
                "wrong": "Writing `(left + right) / 2`, which can overflow for huge lists.",
                "right": "Write `left + (right - left) / 2`.",
            },
        ],
        "edge_cases": [
            {"input": "[1,3,5,6], 7", "expected": "4", "why": "Bigger than every value: the answer is the length of the list."},
            {"input": "[1,3,5,6], 0", "expected": "0", "why": "Smaller than every value: it goes in front."},
            {"input": "[1], 0", "expected": "0", "why": "The smallest list, with the target missing."},
            {"input": "[1,3,5,6], 5", "expected": "2", "why": "The target is present, so its own position is returned."},
            {"input": "[-5,-2,0,4,9,12], 10", "expected": "5", "why": "Negative values, and a gap near the end."},
        ],
        "interview_script": [
            "So I return the target's position, or where it would go to keep the list sorted.",
            "My first idea is to read from the left until a value is not smaller. That is O(n).",
            "The key point for me is that plain binary search already knows the gap when it fails.",
            "When `left` passes `right`, `left` is the first bigger value, so I return it instead of -1. That is O(log n) time and O(1) space.",
            "I would test a target bigger than all values, smaller than all, a single element, and one that is present.",
        ],
        "follow_ups": [
            {
                "question": "What if the list can hold repeats and you want the first position of the target?",
                "answer": "Use the lower-bound search: `right = nums.length`, loop while `left < right`, and move `right = mid` when the middle is not smaller.",
            },
            {
                "question": "How would you find the position after the last copy of the target?",
                "answer": "Search for the first value bigger than the target. That is the same search with `<=` in the comparison.",
            },
            {
                "question": "What if the list is too big to hold in memory?",
                "answer": "Binary search only needs random reads, so it works on a sorted file by reading one record per step.",
            },
        ],
        "related_slugs": ["lc-704", "lc-34", "lc-278"],
    },
    {
        "slugs": ["lc-540"],
        "pattern": "Binary search on pairs",
        "trigger": "A sorted list where every value appears twice, side by side, except one.",
        "summary": (
            "Before the single value, every pair starts at an even position. After it, pairs start at odd "
            "positions. Check the pair at an even middle: if it matches, the single value is to the right."
        ),
        "approaches": [
            {
                "name": "Walk two at a time",
                "idea": "Check the pairs from the left until one does not match.",
                "steps": [
                    "Start at position 0.",
                    "Compare the value with the one after it.",
                    "If they differ, the first of them is the single value.",
                    "If they match, jump two places and check the next pair. If you reach the last position, that value is the answer.",
                ],
                "code": """class Solution {
    public int singleNonDuplicate(int[] nums) {
        for (int i = 0; i + 1 < nums.length; i += 2) {
            if (nums[i] != nums[i + 1]) return nums[i];
        }
        return nums[nums.length - 1];
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "When the single value is at the end, every pair is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only the position counter is stored.",
                "when_to_use": "Say it first. It shows the key fact that pairs start at even positions, which the fast way uses.",
                "is_optimal": False,
            },
            {
                "name": "Binary search on even positions",
                "idea": "Look only at pairs that start at an even position, and keep the half where the pairing breaks.",
                "steps": [
                    "Set `left` to 0 and `right` to the last position.",
                    "While `left` is before `right`, take the middle position. If it is odd, step it back one so it is even.",
                    "If the middle value equals the value after it, the pairing is still whole here: move `left` two past the middle.",
                    "Otherwise the break is at the middle or before it: move `right` to the middle.",
                    "When `left` meets `right`, the value there is the single one.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(log n)",
                "time_why": "Each check throws away about half of the pairs that are left.",
                "space_complexity": "O(1)",
                "space_why": "Only `left`, `right` and `mid` are stored.",
                "when_to_use": "The answer to give when the question asks for log time, which it usually does.",
                "is_optimal": True,
            },
            {
                "name": "XOR of every value",
                "idea": "A value XOR itself is 0, so XOR of the whole list leaves only the single value.",
                "steps": [
                    "Start a running result at 0.",
                    "XOR every value in the list into the result.",
                    "Each pair cancels itself out, so the result is the single value.",
                ],
                "code": """class Solution {
    public int singleNonDuplicate(int[] nums) {
        int result = 0;
        for (int value : nums) result ^= value;
        return result;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Every value is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only the running result is stored.",
                "when_to_use": "Works even when the list is not sorted, as in Single Number. It ignores the sorted order, so it cannot reach log time.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,1,2,3,3,4,4,8,8]",
            "columns": ["left", "right", "mid", "pair checked", "what happens"],
            "rows": [
                ["0", "8", "4", "3 and 4", "They differ, so the break is at 4 or before: right = 4"],
                ["0", "4", "2", "2 and 3", "They differ: right = 2"],
                ["0", "2", "1, stepped back to 0", "1 and 1", "The middle was odd, so step back one. They match: left = 2"],
                ["2", "2", "-", "-", "left meets right at position 2"],
            ],
            "result": "The value at position 2 is the single one. The answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Odd Middle Trap",
                "wrong": "Comparing `nums[mid]` with `nums[mid + 1]` when `mid` is odd, which checks the second dancer of one pair and the first of the next.",
                "right": "If the middle lands on an odd position, step it back one. Then you always check a pair from its first value.",
            },
            {
                "name": "Moving right past the answer",
                "wrong": "Setting `right = mid - 1` when the pair does not match.",
                "right": "The middle itself may be the single value, so set `right = mid`.",
            },
            {
                "name": "Moving left by one",
                "wrong": "Setting `left = mid + 1` after a matching pair, which lands on the second value of that pair.",
                "right": "Skip the whole pair: `left = mid + 2`, so `left` stays on an even position.",
            },
        ],
        "edge_cases": [
            {"input": "[1]", "expected": "1", "why": "One value: the loop never runs."},
            {"input": "[0,1,1]", "expected": "0", "why": "The single value is first."},
            {"input": "[1,1,2]", "expected": "2", "why": "The single value is last, and the first middle is odd."},
            {"input": "[3,3,7,7,10,11,11]", "expected": "10", "why": "The single value is to the right of the first middle."},
            {"input": "[1,1,2,2,3,3,4,5,5]", "expected": "4", "why": "Two moves to the right before the break is found."},
        ],
        "interview_script": [
            "So every value appears twice side by side, except one, and I return that one.",
            "My first idea is to check pairs from the left, two at a time. That is O(n).",
            "What I notice: before the single value, pairs start at even positions, and after it they start at odd positions.",
            "So I binary search on even positions: if the pair at the middle matches, the break is to the right. That is O(log n) time and O(1) space.",
            "I would test a single value first, last, in the middle, and a list of length one.",
        ],
        "follow_ups": [
            {
                "question": "What if the list is not sorted?",
                "answer": "The halving rule breaks. XOR every value instead, in O(n) time and O(1) space.",
            },
            {
                "question": "Why must the length be odd?",
                "answer": "Pairs give an even count, and one single value adds one. If the length were even, the input would be broken.",
            },
            {
                "question": "Can you avoid the odd step-back?",
                "answer": "Yes: compare `nums[mid]` with `nums[mid ^ 1]`. For an even middle that is the next value, for an odd one the previous value.",
            },
        ],
        "related_slugs": ["lc-33", "lc-153", "lc-136"],
    },
    {
        "slugs": ["lc-946"],
        "pattern": "Stack simulation",
        "trigger": "A push order and a pop order, and the question “could this really happen?”",
        "summary": (
            "Act it out with a real stack. Push the values in order, and after every push, keep popping "
            "while the top is the value the pop order wants next. The order was possible only if the stack ends empty."
        ),
        "approaches": [
            {
                "name": "Search the stack for each wanted value",
                "idea": "For each value in the pop order, check the top, then check whether it is buried, then push until it appears.",
                "steps": [
                    "Go through the pop order one value at a time.",
                    "If the value is on top of the stack, pop it and go on.",
                    "If the value is somewhere lower in the stack, it is buried, so return false.",
                    "Otherwise push values from the push order until you push the wanted one, which leaves at once. If you run out, return false.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean validateStackSequences(int[] pushed, int[] popped) {
        Deque<Integer> stack = new ArrayDeque<>();
        int next = 0;
        for (int value : popped) {
            if (!stack.isEmpty() && stack.peek() == value) {
                stack.pop();
                continue;
            }
            if (stack.contains(value)) return false;
            while (next < pushed.length && pushed[next] != value) {
                stack.push(pushed[next]);
                next++;
            }
            if (next == pushed.length) return false;
            next++;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Checking whether a value is buried reads the whole stack, and that can happen for every value.",
                "space_complexity": "O(n)",
                "space_why": "The stack can hold every value.",
                "when_to_use": "It is how many people first reason about it. Mention it, then notice the search is never needed.",
                "is_optimal": False,
            },
            {
                "name": "Push, then pop while the top matches",
                "idea": "Push each value, then pop as long as the top equals the next wanted value.",
                "steps": [
                    "Keep an empty stack and a pointer `want` at the start of the pop order.",
                    "Push the next value from the push order.",
                    "While the stack is not empty and its top equals the wanted value, pop it and move `want` forward.",
                    "After the last push, return true if the stack is empty, and false if values are still stuck in it.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(n)",
                "time_why": "Each value is pushed once and popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack can hold every value when the pop order is the reverse.",
                "when_to_use": "The answer to give. Popping as soon as the top matches is always safe, because the values are all different.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "pushed = [1,2,3,4,5], popped = [4,5,3,2,1]",
            "columns": ["move", "stack (bottom to top)", "wanted next", "what happens"],
            "rows": [
                ["push 1, 2, 3", "1 2 3", "4", "The top is 3, not 4, so keep pushing"],
                ["push 4", "1 2 3 4", "4", "The top matches"],
                ["pop 4", "1 2 3", "5", "The top is 3, not 5, so stop popping"],
                ["push 5", "1 2 3 5", "5", "The top matches"],
                ["pop 5", "1 2 3", "3", "The top is 3 and 3 is wanted: do not stop after one pop"],
                ["pop 3, 2, 1", "empty", "done", "Each new top is the next wanted value"],
            ],
            "result": "The stack is empty, so the order was possible. The answer is true.",
        },
        "mistakes": [
            {
                "name": "The One-Pop Trap",
                "wrong": "Popping at most once after each push, then pushing again.",
                "right": "Keep popping in a `while` loop as long as the top matches. One push can free a whole chain of wanted values.",
            },
            {
                "name": "Popping from an empty stack",
                "wrong": "Checking `stack.peek() == popped[want]` without first checking the stack is not empty.",
                "right": "Test `!stack.isEmpty()` first in the loop condition.",
            },
            {
                "name": "Comparing boxed values",
                "wrong": "Comparing two `Integer` objects with `==`, which fails for values above 127.",
                "right": "Compare the top with the plain `int` in `popped`, or use `.equals`.",
            },
        ],
        "edge_cases": [
            {"input": "[1], [1]", "expected": "true", "why": "One value, pushed and popped."},
            {"input": "[1,2,3,4], [1,2,3,4]", "expected": "true", "why": "Every value leaves at once, so the stack never grows."},
            {"input": "[2,1,0], [1,2,0]", "expected": "true", "why": "One push frees two pops in a row."},
            {"input": "[1,2,3], [3,1,2]", "expected": "false", "why": "1 is buried under 2 when it is wanted."},
            {"input": "[1,2,3,4,5], [4,3,5,1,2]", "expected": "false", "why": "The stack ends with values stuck in the wrong order."},
        ],
        "interview_script": [
            "So I push values in a fixed order and must decide whether pops can come out in the given order.",
            "My first idea is to search the stack each time a value is wanted, to see if it is buried. That is O(n²).",
            "What I notice: if the top is the wanted value, popping it now is always right, because every value is different.",
            "So I push each value and then pop while the top matches. Each value moves in and out once: O(n) time and O(n) space.",
            "I would test a chain of pops after one push, a buried value, and a single value.",
        ],
        "follow_ups": [
            {
                "question": "Can you do it with O(1) extra space?",
                "answer": "Use the front of `pushed` itself as the stack, with an index as its top. The logic is the same.",
            },
            {
                "question": "What if values can repeat?",
                "answer": "Popping at once is no longer always safe, because two equal values could be told apart. You would need to try both choices.",
            },
            {
                "question": "How would you return the actual list of moves?",
                "answer": "Record \"push x\" and \"pop\" as you go. If the stack ends empty, that list is a valid plan.",
            },
        ],
        "related_slugs": ["lc-155", "lc-20", "lc-84"],
    },
    {
        "slugs": ["lc-735"],
        "pattern": "Stack",
        "trigger": "Things moving in a row that meet and destroy each other.",
        "summary": (
            "Keep the survivors in a stack. A crash happens only when the new asteroid moves left and the top "
            "moves right. The new one keeps crashing into each new top until it explodes or nothing can hit it."
        ),
        "approaches": [
            {
                "name": "Resolve one crash per pass",
                "idea": "Scan the row for a right-mover followed by a left-mover, resolve that crash, and scan again.",
                "steps": [
                    "Copy the asteroids into a list.",
                    "Scan the list for a positive value followed at once by a negative value.",
                    "Remove the smaller one, or both when they are the same size.",
                    "Start the scan again, and stop when a full scan finds no crash.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] asteroidCollision(int[] asteroids) {
        List<Integer> rocks = new ArrayList<>();
        for (int rock : asteroids) rocks.add(rock);
        boolean crashed = true;
        while (crashed) {
            crashed = false;
            for (int i = 0; i + 1 < rocks.size(); i++) {
                int a = rocks.get(i);
                int b = rocks.get(i + 1);
                if (a > 0 && b < 0) {
                    if (a > -b) rocks.remove(i + 1);
                    else if (a < -b) rocks.remove(i);
                    else {
                        rocks.remove(i + 1);
                        rocks.remove(i);
                    }
                    crashed = true;
                    break;
                }
            }
        }
        int[] result = new int[rocks.size()];
        for (int i = 0; i < result.length; i++) result[i] = rocks.get(i);
        return result;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "There can be up to n crashes, and each one starts a new scan of the row.",
                "space_complexity": "O(n)",
                "space_why": "The list holds a copy of the asteroids.",
                "when_to_use": "A good way to check your understanding of the rules. Mention it, then say the scans repeat work.",
                "is_optimal": False,
            },
            {
                "name": "Stack of survivors",
                "idea": "Push survivors; a new left-mover fights the right-movers on top until one side is gone.",
                "steps": [
                    "Keep a stack of the asteroids that have survived so far.",
                    "For each new asteroid, check whether it moves left and the top of the stack moves right. Only then can they crash.",
                    "If the top is smaller, pop it and check the new top. If they are the same size, pop the top and the new one explodes too.",
                    "If the top is bigger, the new asteroid explodes. If the new one is still alive, push it.",
                    "At the end, read the stack from bottom to top.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(n)",
                "time_why": "Each asteroid is pushed once and popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack can hold every asteroid when none of them crash.",
                "when_to_use": "The answer to give. Say out loud which pair can crash before you write the loop.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "asteroids = [-2,-1,1,-2]",
            "columns": ["asteroid", "top of stack", "can they crash?", "stack after"],
            "rows": [
                ["-2", "none", "No, the stack is empty", "-2"],
                ["-1", "-2", "No, both move left", "-2 -1"],
                ["1", "-1", "No: the top moves left and the new one moves right, so they fly apart", "-2 -1 1"],
                ["-2", "1", "Yes: 1 moves right and -2 moves left. 1 is smaller, so it explodes", "-2 -1"],
                ["-2", "-1", "No, both move left, so -2 is pushed", "-2 -1 -2"],
            ],
            "result": "The survivors are -2, -1 and -2. The answer is [-2,-1,-2].",
        },
        "mistakes": [
            {
                "name": "The Passing Ships Trap",
                "wrong": "Treating any two asteroids with opposite signs as a crash, including a left-mover on top and a right-mover arriving.",
                "right": "A crash needs the top to move right and the new one to move left. Check `rock < 0 && stack.peek() > 0`.",
            },
            {
                "name": "Stopping after one crash",
                "wrong": "Letting the new asteroid crash only with the top, then pushing it.",
                "right": "Use a `while` loop: a big left-mover can destroy several right-movers in a row.",
            },
            {
                "name": "Forgetting the tie",
                "wrong": "On equal sizes, popping the top but still pushing the new asteroid.",
                "right": "On a tie both explode: pop the top and mark the new one as gone.",
            },
            {
                "name": "Reading the stack backwards",
                "wrong": "Popping the stack into the answer from the front, which reverses the order.",
                "right": "Fill the answer from the last position down to the first.",
            },
        ],
        "edge_cases": [
            {"input": "[8,-8]", "expected": "[]", "why": "A tie: both explode and nothing is left."},
            {"input": "[10,2,-5]", "expected": "[10]", "why": "The left-mover destroys 2, then hits 10 and explodes."},
            {"input": "[-2,-1,1,-2]", "expected": "[-2,-1,-2]", "why": "Left-movers in front of right-movers never meet."},
            {"input": "[1]", "expected": "[1]", "why": "One asteroid, nothing to crash with."},
            {"input": "[5,10,-5]", "expected": "[5,10]", "why": "The new asteroid is the one that explodes."},
        ],
        "interview_script": [
            "So asteroids fly left or right, the smaller one explodes when two meet, and I return the survivors.",
            "My first idea is to scan for a crash, resolve it, and scan again. That is O(n²).",
            "What I notice: only a left-mover arriving after a right-mover can crash, and it only meets the nearest survivor.",
            "So I keep survivors in a stack and let each new left-mover fight the top until one side is gone. That is O(n) time and O(n) space.",
            "I would test a tie, left-movers already in front, and one asteroid that destroys several.",
        ],
        "follow_ups": [
            {
                "question": "What if asteroids of equal size both survive instead?",
                "answer": "Change the tie branch: stop the loop without popping, and push the new one too.",
            },
            {
                "question": "Can you do it without an extra stack?",
                "answer": "Yes: use the input array itself as the stack, with an index for its top. Space drops to O(1) extra.",
            },
            {
                "question": "What if asteroids move at different speeds?",
                "answer": "Then order of crashes depends on time, so you would compute meeting times and handle them in time order with a heap.",
            },
        ],
        "related_slugs": ["lc-739", "lc-20", "lc-150"],
    },
]
