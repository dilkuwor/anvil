"""Recommended problems, batch 01 (lc-643, lc-977, lc-75, lc-303). See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

_NUM_ARRAY_DRIVER = """import java.util.*;

class Solution {
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

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-643"],
        "pattern": "Fixed-size sliding window",
        "trigger": "“Every block of exactly k numbers in a row”, and the best sum or average of such a block.",
        "summary": (
            "Keep the sum of one window of k numbers. When the window slides one step, one number enters "
            "on the right and one leaves on the left, so change the sum by just those two."
        ),
        "approaches": [
            {
                "name": "Add up every block from scratch",
                "idea": "For each start position, add the next k numbers and keep the biggest sum.",
                "steps": [
                    "Pick a start position, from 0 up to n - k.",
                    "Add the k numbers from that start into a fresh sum.",
                    "If this sum is bigger than the best so far, keep it as the best.",
                    "At the end, divide the best sum by k and return it as a decimal.",
                ],
                "code": """class Solution {
    public double findMaxAverage(int[] nums, int k) {
        int best = Integer.MIN_VALUE;
        for (int start = 0; start + k <= nums.length; start++) {
            int sum = 0;
            for (int i = start; i < start + k; i++) {
                sum += nums[i];
            }
            best = Math.max(best, sum);
        }
        return (double) best / k;
    }
}
""",
                "time_complexity": "O(n × k)",
                "time_why": "There are about n blocks, and each one adds k numbers again, even the ones the last block already added.",
                "space_complexity": "O(1)",
                "space_why": "Only a sum and a best value are kept.",
                "when_to_use": "Say it in one sentence to show you understand the question, then move on.",
                "is_optimal": False,
            },
            {
                "name": "Slide one window, add one and drop one",
                "idea": "Sum the first k numbers once, then slide: add the number that enters and subtract the one that leaves.",
                "steps": [
                    "Add the first k numbers. That is the first window's sum, and also the best so far.",
                    "Move the right edge to index i, for each i from k to the end.",
                    "The number at i enters, and the number at i - k leaves. Add one and subtract the other.",
                    "Compare the new sum with the best and keep the bigger one.",
                    "Divide the best sum by k at the end, as a `double`.",
                ],
                "code": """class Solution {
    public double findMaxAverage(int[] nums, int k) {
        int sum = 0;
        for (int i = 0; i < k; i++) {
            sum += nums[i];
        }
        int best = sum;
        for (int i = k; i < nums.length; i++) {
            sum += nums[i] - nums[i - k];
            best = Math.max(best, sum);
        }
        return (double) best / k;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each number enters the window once and leaves once.",
                "space_complexity": "O(1)",
                "space_why": "One running sum and one best value, whatever the size of the input.",
                "when_to_use": "The answer to give. Mention that the best sum is compared, and the division happens once at the end.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,12,-5,-6,50,3], k = 4",
            "columns": ["i", "enters", "leaves", "sum", "best"],
            "rows": [
                ["0 to 3", "1, 12, -5, -6", "none", "2", "2"],
                ["4", "50", "1 (index 0 = 4 - 4)", "51", "51"],
                ["5", "3", "12 (index 1 = 5 - 4)", "42", "51"],
            ],
            "result": "The best sum is 51, and 51 / 4 gives the answer 12.75.",
        },
        "mistakes": [
            {
                "name": "The Wrong Leaver Trap",
                "wrong": "Subtracting `nums[i - k + 1]` when `nums[i]` enters.",
                "right": "When box `i` enters, box `i - k` leaves. Box `i - k + 1` is still inside the window.",
            },
            {
                "name": "Whole-number division",
                "wrong": "Returning `best / k` with two `int` values, which cuts off the decimals.",
                "right": "Turn one side into a decimal first: `(double) best / k`.",
            },
            {
                "name": "Starting the best at zero",
                "wrong": "Setting `best = 0` before looking at any window.",
                "right": "If every number is negative, no window reaches 0. Start `best` at the first window's sum.",
            },
        ],
        "edge_cases": [
            {"input": "[5], k = 1", "expected": "5", "why": "One number and a window of one: no sliding at all."},
            {"input": "[-1,-2,-3], k = 3", "expected": "-2", "why": "The window is the whole array, and the answer is negative."},
            {"input": "[-6,-2,-8,-4], k = 2", "expected": "-4", "why": "Every sum is negative, so a best that starts at 0 would be wrong."},
            {"input": "[4,2,1,3,3], k = 2", "expected": "3", "why": "Two windows tie for the best sum. Either one gives the same average."},
            {"input": "[1,12,-5,-6,50,3], k = 4", "expected": "12.75", "why": "The answer has decimals, which whole-number division would lose."},
        ],
        "interview_script": [
            "So I need the largest average over every block of exactly k numbers in a row.",
            "My first idea adds up every block from scratch. That is O(n × k), because neighbouring blocks share most numbers.",
            "The key point for me: when the window moves one step, only one number enters and one number leaves.",
            "So I keep a running sum, add the new number and subtract the one k places back. That is O(n) time and O(1) space.",
            "I compare sums and divide by k once at the end, as a double. I would test k equal to the length, all negatives, and a decimal answer.",
        ],
        "follow_ups": [
            {
                "question": "What if the block can be any length of at least k?",
                "answer": "That is Maximum Average Subarray II. Binary search the average and check each guess with prefix sums.",
            },
            {
                "question": "Return where the best block starts, not its average.",
                "answer": "When the sum beats the best, also remember `i - k + 1` as the start.",
            },
            {
                "question": "Could the sum overflow an `int`?",
                "answer": "Here k times 10^4 is at most 10^9, which fits. For bigger values use a `long` sum.",
            },
        ],
        "related_slugs": ["lc-3", "lc-209", "lc-438"],
    },
    {
        "slugs": ["lc-977"],
        "pattern": "Two pointers",
        "trigger": "A sorted array with negative numbers, and the squares must come out sorted too.",
        "summary": (
            "The biggest square is always at one of the two ends of the sorted array. Compare the two "
            "ends, write the bigger square into the answer from the back, and move that end inward."
        ),
        "approaches": [
            {
                "name": "Square everything, then sort",
                "idea": "Square each number into a new array, then sort that array.",
                "steps": [
                    "Make a new array of the same length.",
                    "Write the square of each number into it.",
                    "Sort the new array with the library sort and return it.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] sortedSquares(int[] nums) {
        int[] result = new int[nums.length];
        for (int i = 0; i < nums.length; i++) {
            result[i] = nums[i] * nums[i];
        }
        Arrays.sort(result);
        return result;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "The sort costs n log n. It ignores that the input was already sorted.",
                "space_complexity": "O(n)",
                "space_why": "The answer array holds n squares.",
                "when_to_use": "A correct first answer. Say it, then point out that it throws away the sorted order.",
                "is_optimal": False,
            },
            {
                "name": "Two pointers from both ends, fill from the back",
                "idea": "The two ends hold the two biggest squares, so the bigger of them goes into the last empty slot.",
                "steps": [
                    "Put `left` at the first index and `right` at the last index.",
                    "Start with the slot at the back of the answer array.",
                    "Compare the square at `left` with the square at `right`.",
                    "Write the bigger one into the slot, and move that pointer one step inward.",
                    "Move the slot one step toward the front, and repeat until every slot is filled.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Every slot is filled once, and each fill moves one pointer one step.",
                "space_complexity": "O(n)",
                "space_why": "The answer array holds n squares. Apart from it, only two pointers and a slot.",
                "when_to_use": "The answer to give. Say out loud why the biggest square must sit at an end.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [-4,-1,0,3,10]",
            "columns": ["slot", "left square", "right square", "bigger", "result"],
            "rows": [
                ["4", "16", "100", "right", "[_,_,_,_,100]"],
                ["3", "16", "9", "left", "[_,_,_,16,100]"],
                ["2", "1", "9", "right", "[_,_,9,16,100]"],
                ["1", "1", "0", "left", "[_,1,9,16,100]"],
                ["0", "0", "0", "same box", "[0,1,9,16,100]"],
            ],
            "result": "The smallest square, 0, came from the middle and was placed last. The answer is [0,1,9,16,100].",
        },
        "mistakes": [
            {
                "name": "The Front Fill Trap",
                "wrong": "Comparing the two ends and writing the smaller square into slot 0 first.",
                "right": "The ends hold the biggest squares, never the smallest. The smallest may be in the middle, so fill from the back slot forward.",
            },
            {
                "name": "Comparing the numbers, not the squares",
                "wrong": "Checking `nums[left] > nums[right]`, so -4 looks smaller than 3.",
                "right": "Compare the squares (or the absolute values). -4 squared is 16, which beats 9.",
            },
            {
                "name": "Stopping one slot early",
                "wrong": "Looping while `left < right`, so the last number is never written.",
                "right": "Loop over every slot, or use `left <= right`. When both point at the same box, it still needs a slot.",
            },
        ],
        "edge_cases": [
            {"input": "[5]", "expected": "[25]", "why": "One number: left and right start on the same box."},
            {"input": "[-5,-3,-2,-1]", "expected": "[1,4,9,25]", "why": "All negative: the left end always wins."},
            {"input": "[1,2,3]", "expected": "[1,4,9]", "why": "All positive: the right end always wins."},
            {"input": "[-7,-3,2,3,11]", "expected": "[4,9,9,49,121]", "why": "-3 and 3 have the same square. Either end may go first."},
            {"input": "[-4,-1,0,3,10]", "expected": "[0,1,9,16,100]", "why": "The smallest square is in the middle, which the Front Fill Trap gets wrong."},
        ],
        "interview_script": [
            "So I square every number and return the squares sorted.",
            "My first idea is to square them all and sort. That is O(n log n) because of the sort.",
            "What I notice: the input is sorted, so the biggest square is at one of the two ends. The smallest could be anywhere.",
            "So I keep a pointer at each end and fill the answer from the back with the bigger square. That is O(n) time and O(n) for the output.",
            "I would test one number, all negatives, all positives, and a pair like -3 and 3.",
        ],
        "follow_ups": [
            {
                "question": "Can you fill from the front instead?",
                "answer": "Only if you first find where the negatives end, then merge outward from there. Filling from the back avoids that search.",
            },
            {
                "question": "What if the numbers were cubed instead of squared?",
                "answer": "Cubing keeps the order, since negatives stay negative. The cubes are already sorted, so one pass is enough.",
            },
            {
                "question": "How much extra memory does it use?",
                "answer": "Only two pointers and a slot. The answer array is the output, which the problem asks for.",
            },
        ],
        "related_slugs": ["lc-167", "lc-15", "lc-88"],
    },
    {
        "slugs": ["lc-75"],
        "pattern": "Three pointers (Dutch flag)",
        "trigger": "Only three different values, to be grouped or sorted in place, in one pass.",
        "summary": (
            "Keep three zones: 0s at the front, 2s at the back, and the unknown in the middle. Look at the "
            "first unknown number and send it to its zone. After a swap with the back, look again."
        ),
        "approaches": [
            {
                "name": "Sort with the library",
                "idea": "Call the library sort on the array.",
                "steps": [
                    "Call `Arrays.sort(nums)`.",
                    "Return the array.",
                    "Mention that the problem asks you not to do this, and why it costs more.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] sortColors(int[] nums) {
        Arrays.sort(nums);
        return nums;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "A general sort compares pairs. It does not know there are only three values.",
                "space_complexity": "O(log n)",
                "space_why": "The library sort for numbers uses a call stack that grows with log n.",
                "when_to_use": "Say it to show you know it works, then explain why only three values allow something faster.",
                "is_optimal": False,
            },
            {
                "name": "Count the colours, then write them back",
                "idea": "Count how many 0s, 1s and 2s there are, then overwrite the array in order.",
                "steps": [
                    "Go through the array once and count each colour in an array of three counters.",
                    "Write that many 0s from the front.",
                    "Then write the 1s, then the 2s, and return the array.",
                ],
                "code": """class Solution {
    public int[] sortColors(int[] nums) {
        int[] count = new int[3];
        for (int value : nums) {
            count[value]++;
        }
        int slot = 0;
        for (int color = 0; color < 3; color++) {
            for (int i = 0; i < count[color]; i++) {
                nums[slot++] = color;
            }
        }
        return nums;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Two passes over the array: one to count, one to write.",
                "space_complexity": "O(1)",
                "space_why": "Three counters, whatever the length.",
                "when_to_use": "A good answer in its own right. The follow-up is usually to do it in one pass.",
                "is_optimal": False,
            },
            {
                "name": "One pass with three pointers (Dutch flag)",
                "idea": "Grow a zone of 0s from the front and a zone of 2s from the back, sending each unknown number to its zone.",
                "steps": [
                    "Everything before `low` is 0, everything after `high` is 2, and `mid` is the first unknown number.",
                    "If the number at `mid` is 0, swap it with `low`. Move both `low` and `mid` forward.",
                    "If it is 1, it is already in the right zone. Move `mid` forward.",
                    "If it is 2, swap it with `high` and move `high` back. Leave `mid` where it is: the number that came back is unknown.",
                    "Stop when `mid` passes `high`. Nothing unknown is left.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Each step either moves `mid` forward or moves `high` back, so the unknown zone shrinks by one every time.",
                "space_complexity": "O(1)",
                "space_why": "Three pointers and one temporary value for the swap.",
                "when_to_use": "The answer to give when asked for one pass. Explain why `mid` stays after a swap with `high`.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [2,0,1]",
            "columns": ["low", "mid", "high", "number at mid", "what happens", "nums"],
            "rows": [
                ["0", "0", "2", "2", "swap with high, high moves back, mid stays", "[1,0,2]"],
                ["0", "0", "1", "1", "already in the middle zone, mid moves on", "[1,0,2]"],
                ["0", "1", "1", "0", "swap with low, low and mid move on", "[0,1,2]"],
                ["1", "2", "1", "none", "mid passed high, stop", "[0,1,2]"],
            ],
            "result": "The 1 that came back from the swap in row 1 was checked before moving on. The answer is [0,1,2].",
        },
        "mistakes": [
            {
                "name": "The Unseen Swap Trap",
                "wrong": "Moving `mid` forward after swapping a 2 with `high`.",
                "right": "The scanner stays after a swap with `high`: the number that came back has not been looked at yet.",
            },
            {
                "name": "Stopping too early",
                "wrong": "Looping while `mid < high`, so the number at `high` is never checked.",
                "right": "Loop while `mid <= high`. The box at `high` is still unknown.",
            },
            {
                "name": "Worrying after a swap with low",
                "wrong": "Checking the number again after swapping a 0 with `low`.",
                "right": "The number that comes from `low` was already seen by `mid`, so it is a 1 (or the same box). Both pointers can move on.",
            },
        ],
        "edge_cases": [
            {"input": "[0]", "expected": "[0]", "why": "One number: one step and done."},
            {"input": "[1,1,1]", "expected": "[1,1,1]", "why": "No swaps at all: mid walks to the end."},
            {"input": "[2,0,1]", "expected": "[0,1,2]", "why": "The first swap with high brings back a number that still needs checking."},
            {"input": "[2,2,0,1,0,2,1]", "expected": "[0,0,1,1,2,2,2]", "why": "A 2 swaps with another 2, so mid must look at the same box again."},
            {"input": "[2,1,0]", "expected": "[0,1,2]", "why": "Reversed order: every zone has to move."},
        ],
        "interview_script": [
            "So I have only 0s, 1s and 2s, and I need them grouped in that order, in place.",
            "My first idea is the library sort. That is O(n log n), and counting colours gets it to O(n) with two passes.",
            "The key point: I can keep 0s growing from the front and 2s growing from the back, with the unknown numbers in between.",
            "So I use low, mid and high, and send each number to its zone. That is one pass, O(n) time and O(1) space.",
            "After a swap with high I do not move mid, since that number is new. I would test one number, all ones, and [2,0,1].",
        ],
        "follow_ups": [
            {
                "question": "What if there were k colours instead of three?",
                "answer": "Counting still works in O(n + k). The three-zone trick does not grow well past three.",
            },
            {
                "question": "Is this sort stable?",
                "answer": "No. Swaps can reorder equal numbers. For plain numbers that does not matter.",
            },
            {
                "question": "How does this relate to quicksort?",
                "answer": "It is a three-way partition around the pivot 1. Quicksort uses it to handle many equal values well.",
            },
        ],
        "related_slugs": ["lc-283", "lc-26", "lc-15"],
    },
    {
        "slugs": ["lc-303"],
        "pattern": "Prefix sums",
        "trigger": "Many “sum from left to right” questions on a list that never changes.",
        "summary": (
            "Build a prefix array once, where each entry is the total of everything before that index. "
            "Any range sum is then one entry minus another: `prefix[right + 1] - prefix[left]`."
        ),
        "approaches": [
            {
                "name": "Add up the range for every question",
                "idea": "Keep the list as it is, and loop from left to right each time a question comes.",
                "steps": [
                    "Store the list when the object is built.",
                    "For each question, start a sum at 0.",
                    "Add every number from `left` to `right`, and return the sum.",
                ],
                "code": _NUM_ARRAY_DRIVER + """
class NumArray {
    private final int[] nums;

    public NumArray(int[] nums) {
        this.nums = nums;
    }

    public int sumRange(int left, int right) {
        int sum = 0;
        for (int i = left; i <= right; i++) {
            sum += nums[i];
        }
        return sum;
    }
}
""",
                "time_complexity": "O(n) per query",
                "time_why": "A question over the whole list reads all n numbers, and the same numbers are read again for the next question.",
                "space_complexity": "O(1)",
                "space_why": "Nothing is stored beyond the list itself.",
                "when_to_use": "Fine for a few questions. Say it, then point out that the list never changes, so work can be saved.",
                "is_optimal": False,
            },
            {
                "name": "Prefix sums built once",
                "idea": "Store the running total before every index, so each question is one subtraction.",
                "steps": [
                    "Make an array `prefix` one longer than the list, with `prefix[0] = 0`.",
                    "For each index i, set `prefix[i + 1]` to `prefix[i]` plus the number at i.",
                    "For a question, `prefix[right + 1]` is the total up to and including right.",
                    "Subtract `prefix[left]`, the total before left. What remains is the range.",
                ],
                "code": _NUM_ARRAY_DRIVER + """
class NumArray {
    private final int[] prefix;

    public NumArray(int[] nums) {
        prefix = new int[nums.length + 1];
        for (int i = 0; i < nums.length; i++) {
            prefix[i + 1] = prefix[i] + nums[i];
        }
    }

    public int sumRange(int left, int right) {
        return prefix[right + 1] - prefix[left];
    }
}
""",
                "time_complexity": "O(1) per query",
                "time_why": "Each question reads two entries and subtracts. Building the array costs O(n) once.",
                "space_complexity": "O(n)",
                "space_why": "The prefix array has one more entry than the list.",
                "when_to_use": "The answer to give. Mention the extra zero at the front: it removes a special case for `left = 0`.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [-2,0,3,-5,2,-1], questions (0,2) and (2,5)",
            "columns": ["i", "nums[i]", "prefix[i + 1]", "question", "answer"],
            "rows": [
                ["start", "none", "prefix[0] = 0", "", ""],
                ["0", "-2", "-2", "", ""],
                ["1", "0", "-2", "", ""],
                ["2", "3", "1", "", ""],
                ["3", "-5", "-4", "", ""],
                ["4", "2", "-2", "", ""],
                ["5", "-1", "-3", "", ""],
                ["", "", "", "(0,2): prefix[3] - prefix[0]", "1 - 0 = 1"],
                ["", "", "", "(2,5): prefix[6] - prefix[2], not prefix[5]", "-3 - (-2) = -1"],
            ],
            "result": "Using prefix[5] would leave out the last number. The answers are 1 and -1.",
        },
        "mistakes": [
            {
                "name": "The Off-by-One Marker Trap",
                "wrong": "Returning `prefix[right] - prefix[left]`, which leaves out the number at `right`.",
                "right": "Entry i is the total before index i. The range from left to right is `prefix[right + 1] - prefix[left]`.",
            },
            {
                "name": "No zero at the front",
                "wrong": "Making `prefix` the same length as the list, then needing a special case when `left` is 0.",
                "right": "Make it one longer, with `prefix[0] = 0`. Then one formula covers every question.",
            },
            {
                "name": "Rebuilding for every question",
                "wrong": "Building the prefix array inside `sumRange`.",
                "right": "Build it once in the constructor. The list never changes, so the totals never change.",
            },
        ],
        "edge_cases": [
            {"input": "[5], question (0,0)", "expected": "5", "why": "One number, and a range of one."},
            {"input": "[1,2,3,4], question (1,1)", "expected": "2", "why": "A range of one number in the middle."},
            {"input": "[1,2,3,4], question (0,3)", "expected": "10", "why": "The whole list, which uses the zero at the front."},
            {"input": "[3,-3,3,-3], question (0,1)", "expected": "0", "why": "Negative numbers cancel out to zero."},
            {"input": "[-2,0,3,-5,2,-1], question (2,5)", "expected": "-1", "why": "A range that ends on the last number, where the off-by-one shows."},
        ],
        "interview_script": [
            "So the list is fixed, and I will get many questions asking for the sum between two positions.",
            "My first idea loops over the range each time. That is O(n) per query, and the same numbers get added again and again.",
            "What I notice: the sum from left to right is the total up to right minus the total before left.",
            "So I build a prefix array once, in O(n), with a zero at the front. Then each question is O(1) per query.",
            "I would test a range of one, the whole list, and a range that ends on the last number.",
        ],
        "follow_ups": [
            {
                "question": "What if the numbers can change between questions?",
                "answer": "A prefix array would need O(n) work per change. Use a Fenwick tree or a segment tree for O(log n) updates and questions.",
            },
            {
                "question": "What about sums over a rectangle in a grid?",
                "answer": "Build a 2D prefix array. A rectangle is four entries added and subtracted.",
            },
            {
                "question": "How does this help with counting subarrays that sum to k?",
                "answer": "A subarray sums to k when two prefix totals differ by k. Keep the totals seen so far in a hash map as you go.",
            },
        ],
        "related_slugs": ["lc-560", "lc-238", "lc-643"],
    },
]
