"""Recommended problems, batch 01: the warm-ups that sit just before catalog problems.

See ``recommended.md`` for why each one was picked. Every problem carries its reference
solution, complexity target and progressive hints inline, like ``microsoft_extra``.

* 643 is the fixed-size window before lc-3 and lc-209.
* 977 is two pointers walking inward, before lc-167 and lc-15.
* 75 is three regions in one pass, after lc-283. The judge compares the returned array, so the
  learner sorts ``nums`` in place and returns it.
* 303 is a design problem. A ``process`` method replays the operations, like lc-348.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

SLIDING = "sliding-window"
TWO = "two-pointers"
DESIGN = "design"


def _with_starter(spec: dict, starter: str) -> dict:
    out = dict(spec)
    out["starter_code"] = starter.strip() + "\n"
    return out


_NUM_ARRAY_DRIVER = """
import java.util.*;

class Solution {
    // The judge calls this. It replays the operations on your NumArray and collects every
    // sumRange answer. You do not need to change it.
    public int[] process(String[] operations, int[][] args) {
        NumArray numArray = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "NumArray" -> numArray = new NumArray(args[i]);
                case "sumRange" -> out.add(numArray.sumRange(args[i][0], args[i][1]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
"""


PROBLEMS: list[dict] = [
    _p(
        643, "Maximum Average Subarray I", "EASY", SLIDING,
        "findMaxAverage", [("nums", "int[]"), ("k", "int")], "double",
        "Look at every block of exactly `k` numbers that sit next to each other in `nums`. "
        "Each block has an average: its sum divided by `k`. Return the largest average of any block.\n\n"
        "A block must be exactly `k` numbers long, with no gaps. The numbers may be negative. "
        "Return the average as a decimal number.",
        [
            {"input": "[1,12,-5,-6,50,3]\n4", "expected": "12.75", "hidden": False, "order": 1},
            {"input": "[5]\n1", "expected": "5", "hidden": False, "order": 2},
            {"input": "[0,4,0,3,2]\n1", "expected": "4", "hidden": True, "order": 3},
            {"input": "[-1,-2,-3]\n3", "expected": "-2", "hidden": True, "order": 4},
            {"input": "[4,2,1,3,3]\n2", "expected": "3", "hidden": True, "order": 5},
            {"input": "[-6,-2,-8,-4]\n2", "expected": "-4", "hidden": True, "order": 6},
        ],
        constraints="1 <= k <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        input_format="Line 1: nums\nLine 2: k",
        output_format="A decimal number (the largest average)",
        time="O(n)", space="O(1)",
        hints=[
            "Adding up every block from scratch reads the same numbers again and again. "
            "Look at what changes when a block moves one step right.",
            "When the block moves one step, exactly one number joins on the right and exactly "
            "one number leaves on the left. Everything else stays.",
            "Keep a running sum of a window of size `k`: add `nums[i]`, subtract `nums[i - k]`. "
            "Track the largest sum, then divide by `k` once at the end, as a `double`.",
        ],
        solution=r"""
class Solution {
    public double findMaxAverage(int[] nums, int k) {
        int sum = 0;
        for (int i = 0; i < k; i++) sum += nums[i];
        int best = sum;
        for (int i = k; i < nums.length; i++) {
            sum += nums[i] - nums[i - k];
            best = Math.max(best, sum);
        }
        return (double) best / k;
    }
}
""",
    ),
    _p(
        977, "Squares of a Sorted Array", "EASY", TWO,
        "sortedSquares", [("nums", "int[]")], "int[]",
        "`nums` is sorted from small to large, and it may hold negative numbers. Square every "
        "number (multiply it by itself) and return the squares, also sorted from small to large.\n\n"
        "A negative number can have a big square: `-4` squared is `16`. Return a new array of the "
        "same length.",
        [
            {"input": "[-4,-1,0,3,10]", "expected": "[0,1,9,16,100]", "hidden": False, "order": 1},
            {"input": "[-7,-3,2,3,11]", "expected": "[4,9,9,49,121]", "hidden": False, "order": 2},
            {"input": "[5]", "expected": "[25]", "hidden": True, "order": 3},
            {"input": "[-5,-3,-2,-1]", "expected": "[1,4,9,25]", "hidden": True, "order": 4},
            {"input": "[1,2,3]", "expected": "[1,4,9]", "hidden": True, "order": 5},
        ],
        constraints="1 <= nums.length <= 10^4\n-10^4 <= nums[i] <= 10^4\nnums is sorted in non-decreasing order",
        input_format="The sorted array nums",
        output_format="The sorted squares",
        time="O(n)", space="O(n)",
        hints=[
            "Squaring and then sorting works, but costs O(n log n). The input is already sorted: "
            "use that.",
            "Where in the array is the biggest square? It must be at one of the two ends: the "
            "most negative number or the most positive one.",
            "Put one pointer at each end. Compare the two squares, write the bigger one into the "
            "last empty slot of the answer, and move that pointer inward. Fill from the back.",
        ],
        solution=r"""
class Solution {
    public int[] sortedSquares(int[] nums) {
        int n = nums.length;
        int[] result = new int[n];
        int left = 0, right = n - 1;
        for (int slot = n - 1; slot >= 0; slot--) {
            int leftSquare = nums[left] * nums[left];
            int rightSquare = nums[right] * nums[right];
            if (leftSquare > rightSquare) {
                result[slot] = leftSquare;
                left++;
            } else {
                result[slot] = rightSquare;
                right--;
            }
        }
        return result;
    }
}
""",
    ),
    _with_starter(
        _p(
            75, "Sort Colors", "MEDIUM", TWO,
            "sortColors", [("nums", "int[]")], "int[]",
            "Each number in `nums` is a colour: `0` is red, `1` is white and `2` is blue. Rearrange "
            "the numbers so all the reds come first, then all the whites, then all the blues.\n\n"
            "Do it in place, inside `nums`, without the library sort. On this platform, change "
            "`nums` and return it. Try to do it in one pass over the array.",
            [
                {"input": "[2,0,2,1,1,0]", "expected": "[0,0,1,1,2,2]", "hidden": False, "order": 1},
                {"input": "[2,0,1]", "expected": "[0,1,2]", "hidden": False, "order": 2},
                {"input": "[0]", "expected": "[0]", "hidden": True, "order": 3},
                {"input": "[1,1,1]", "expected": "[1,1,1]", "hidden": True, "order": 4},
                {"input": "[2,2,0,1,0,2,1]", "expected": "[0,0,1,1,2,2,2]", "hidden": True, "order": 5},
            ],
            constraints="1 <= nums.length <= 300\nnums[i] is 0, 1 or 2",
            input_format="The array nums",
            output_format="nums after sorting",
            time="O(n)", space="O(1)",
            hints=[
                "There are only three values. Counting the 0s, 1s and 2s and writing them back "
                "works in two passes. Can you do it in one?",
                "Keep three zones: 0s at the front, 2s at the back, and an unknown middle. Look at "
                "the first unknown number and send it to the right zone.",
                "Use `low`, `mid` and `high`. A 0 swaps with `low` (both move on), a 1 just moves "
                "`mid`, a 2 swaps with `high` and only `high` moves: the number that came back is "
                "still unknown.",
            ],
            solution=r"""
class Solution {
    public int[] sortColors(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1;
        while (mid <= high) {
            if (nums[mid] == 0) {
                swap(nums, low, mid);
                low++;
                mid++;
            } else if (nums[mid] == 1) {
                mid++;
            } else {
                swap(nums, mid, high);
                high--;
            }
        }
        return nums;
    }

    private void swap(int[] nums, int i, int j) {
        int temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;
    }
}
""",
        ),
        """
class Solution {
    public int[] sortColors(int[] nums) {
        
        return nums;
    }
}
""",
    ),
    _with_starter(
        _p(
            303, "Range Sum Query - Immutable", "EASY", DESIGN,
            "process", [("operations", "String[]"), ("args", "int[][]")], "int[]",
            "You get a list of numbers once, and then many questions about it. Each question gives "
            "two positions, `left` and `right`, and asks for the sum of the numbers from `left` to "
            "`right`, both included. The list never changes, so do the slow work once and answer "
            "every question fast.\n\n"
            "- `NumArray(nums)` stores the list.\n"
            "- `sumRange(left, right)` returns `nums[left] + nums[left + 1] + ... + nums[right]`.\n\n"
            "Operations arrive as a list, with each call's arguments in `args`. Return the results "
            "of the `sumRange` calls.",
            [
                {"input": '["NumArray","sumRange","sumRange","sumRange"]\n'
                          "[[-2,0,3,-5,2,-1],[0,2],[2,5],[0,5]]",
                 "expected": "[1,-1,-3]", "hidden": False, "order": 1},
                {"input": '["NumArray","sumRange"]\n[[5],[0,0]]', "expected": "[5]", "hidden": False, "order": 2},
                {"input": '["NumArray","sumRange","sumRange","sumRange"]\n[[1,2,3,4],[1,1],[0,3],[1,2]]',
                 "expected": "[2,10,5]", "hidden": True, "order": 3},
                {"input": '["NumArray","sumRange","sumRange"]\n[[3,-3,3,-3],[0,1],[1,3]]',
                 "expected": "[0,-3]", "hidden": True, "order": 4},
            ],
            constraints="1 <= nums.length <= 10^4\n-10^5 <= nums[i] <= 10^5\n0 <= left <= right < nums.length\nAt most 10^4 calls to sumRange",
            input_format="Line 1: operations\nLine 2: arguments per operation",
            output_format="Array of sumRange results",
            time="O(n) to build, O(1) per query", space="O(n)",
            hints=[
                "Adding up the range for every question costs O(n) each time. The list never "
                "changes, so some work can be done once, up front.",
                "If you knew the total of everything before `left` and the total of everything up "
                "to `right`, how would you get the range from those two numbers?",
                "Build `prefix` with `prefix[0] = 0` and `prefix[i + 1] = prefix[i] + nums[i]`. "
                "Then `sumRange(left, right)` is `prefix[right + 1] - prefix[left]`.",
            ],
            solution=_NUM_ARRAY_DRIVER + r"""
class NumArray {
    private final int[] prefix;

    public NumArray(int[] nums) {
        prefix = new int[nums.length + 1];
        for (int i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
    }

    public int sumRange(int left, int right) {
        return prefix[right + 1] - prefix[left];
    }
}
""",
        ),
        _NUM_ARRAY_DRIVER + """
class NumArray {
    public NumArray(int[] nums) {

    }

    public int sumRange(int left, int right) {
        return 0;
    }
}
""",
    ),
]
