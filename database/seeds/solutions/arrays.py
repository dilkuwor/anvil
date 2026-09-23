"""Array problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["first-and-last-position"],
        "pattern": "Binary search",
        "trigger": "A sorted array, and you need the first and last index of a value, in log time.",
        "summary": (
            "Search twice on the sorted row. One search finds the leftmost target. "
            "The other finds the leftmost value bigger than target, then step one left."
        ),
        "approaches": [
            {
                "name": "Walk the row once",
                "idea": "Read left to right. Remember the first hit and keep updating the last hit.",
                "steps": [
                    "Start with both answers at -1.",
                    "Read each index. On the first equal value, store it as the left end.",
                    "On every equal value, store it as the right end.",
                    "If the value never appears, both ends stay -1.",
                ],
                "code": """class Solution {
    public int[] searchRange(int[] nums, int target) {
        int left = -1, right = -1;
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] == target) {
                if (left == -1) left = i;
                right = i;
            }
        }
        return new int[] {left, right};
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Every index is read once, even after the run of targets has ended.",
                "space_complexity": "O(1)",
                "space_why": "Only the two answer indices are stored.",
                "when_to_use": "Fine to mention. Do not code it: the problem asks for log time.",
                "is_optimal": False,
            },
            {
                "name": "Two bound searches",
                "idea": "A lower-bound search finds the first index that is not smaller than a value.",
                "steps": [
                    "Lower-bound search for target: the first index that is >= target.",
                    "If that index is off the end, or the value there is not target, return [-1, -1].",
                    "Lower-bound search for target + 1: the first index that is >= target + 1.",
                    "The last target is one step left of that index.",
                ],
                "code": """class Solution {
    public int[] searchRange(int[] nums, int target) {
        int left = bound(nums, target);
        if (left == nums.length || nums[left] != target) return new int[] {-1, -1};
        int right = bound(nums, target + 1) - 1;
        return new int[] {left, right};
    }

    private int bound(int[] nums, int value) {
        int lo = 0, hi = nums.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < value) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "Each bound search halves the remaining range, twice.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search pointers are stored.",
                "when_to_use": "The version to write. Two log searches, no extra memory.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [5,7,7,8,8,10], target = 8",
            "columns": ["search", "lo", "hi", "mid", "nums[mid]", "move"],
            "rows": [
                ["left 8", "0", "6", "3", "8", "8 is not < 8, so hi = 3"],
                ["left 8", "0", "3", "1", "7", "7 < 8, so lo = 2"],
                ["left 8", "2", "3", "2", "7", "7 < 8, so lo = 3"],
                ["left 8", "3", "3", "-", "-", "lo == hi: first 8 is at 3"],
                ["left 9", "0", "6", "3", "8", "8 < 9, so lo = 4"],
                ["left 9", "4", "6", "5", "10", "10 is not < 9, so hi = 5"],
                ["left 9", "4", "5", "4", "8", "8 < 9, so lo = 5"],
            ],
            "result": "First 8 is at 3. First value >= 9 is at 5, so last 8 is at 4. The answer is [3, 4].",
        },
        "mistakes": [
            {
                "name": "The Linear-Walk Trap",
                "wrong": "Binary search to any 8, then walk left and right to the ends of the run.",
                "right": "A long run of the target makes that walk O(n). Use a second bound search.",
            },
            {
                "name": "Off-by-one on the right end",
                "wrong": "Returning the lower bound of target + 1 as the last index.",
                "right": "That bound is the first value after the run. Subtract one.",
            },
            {
                "name": "Empty array",
                "wrong": "Reading nums[0] before checking length.",
                "right": "The lower bound of an empty array is 0, which equals length, so return [-1, -1].",
            },
        ],
        "edge_cases": [
            {"input": "[]\n0", "expected": "[-1,-1]", "why": "Empty array."},
            {"input": "[1]\n1", "expected": "[0,0]", "why": "A single hit is both ends."},
            {"input": "[2,2,2,2]\n2", "expected": "[0,3]", "why": "The whole array is the target."},
            {"input": "[5,7,7,8,8,10]\n6", "expected": "[-1,-1]", "why": "The value is missing."},
        ],
        "interview_script": [
            "I need the first and last index of target in a sorted array, in log time.",
            "I could walk the row once, but that is O(n) and misses the time bound.",
            "I use a lower-bound search: the first index that is not smaller than a value.",
            "I run it for target, then for target + 1, and step one left for the last index.",
            "That is O(log n) time and O(1) space. I will test empty, missing, one hit, and an array of all targets.",
        ],
        "follow_ups": [
            {
                "question": "The array is not sorted.",
                "answer": "Log time is gone. One pass that stores the first and last hit is the right answer.",
            },
            {
                "question": "Return how many times target appears.",
                "answer": "If the range is [L, R], the count is R - L + 1, or 0 when L is -1.",
            },
            {
                "question": "Can you do it with one binary search?",
                "answer": "You can find any hit, then bound-search only the left half and the right half. Same cost class.",
            },
        ],
        "related_slugs": ["lc-34", "lc-704", "lc-278"],
    },
    {
        "slugs": ["lc-121"],
        "pattern": "One pass, running minimum",
        "trigger": "Buy once, sell later, and you want the biggest profit from a list of daily prices.",
        "summary": (
            "Walk the days left to right. Remember the cheapest price so far. "
            "Each day, selling at today's price against that cheapest buy is a candidate for the best profit."
        ),
        "approaches": [
            {
                "name": "Try every pair of days",
                "idea": "For each buy day, try every later sell day and keep the biggest difference.",
                "steps": [
                    "Pick a buy index i.",
                    "For every j > i, compute prices[j] - prices[i].",
                    "Keep the largest difference that is still positive.",
                    "If every difference is negative, return 0.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        int best = 0;
        for (int i = 0; i < prices.length; i++) {
            for (int j = i + 1; j < prices.length; j++) {
                best = Math.max(best, prices[j] - prices[i]);
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every buy day re-reads every later sell day.",
                "space_complexity": "O(1)",
                "space_why": "Only the best profit is stored.",
                "when_to_use": "Say it to show you understand buy-before-sell. Do not code it when n can be 10^5.",
                "is_optimal": False,
            },
            {
                "name": "Cheapest so far",
                "idea": "The best sale on day i uses the lowest price seen on a day before i.",
                "steps": [
                    "Track the cheapest price seen so far, starting at a huge number.",
                    "Track the best profit, starting at 0.",
                    "On each day, try selling today against the cheapest so far, then update the cheapest.",
                    "Return the best profit. If prices only fall, it stays 0.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Each day is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only cheapest and best are stored.",
                "when_to_use": "The version to write. One pass, no extra array.",
                "is_optimal": True,
            },
            {
                "name": "Kadane on the day-to-day changes",
                "idea": "Read the prices as the change from one day to the next: any trade earns the sum of the changes in between, so the best trade is the best run of changes.",
                "steps": [
                    "Look at each day as its change from the day before: `prices[i] - prices[i-1]`.",
                    "Buying on day i and selling on day j earns the sum of the changes between them.",
                    "Walk the changes with a running sum, and drop that sum back to 0 whenever it goes below 0.",
                    "Keep the largest running sum seen. It stays 0 when every change is a fall.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        int best = 0;
        int run = 0;
        for (int i = 1; i < prices.length; i++) {
            int change = prices[i] - prices[i - 1];
            run = Math.max(0, run + change);
            best = Math.max(best, run);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One pass over the days, working out each change as you go.",
                "space_complexity": "O(1)",
                "space_why": "Only the running sum and the best are stored. The changes are never written down.",
                "when_to_use": "When you want one idea to cover two problems: seen as changes, this is Maximum Subarray. It is also the reading to reach for when the question hands you the daily moves rather than the prices.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "prices = [7,1,5,3,6,4]",
            "columns": ["day", "price", "cheapest so far", "profit if sell today", "best"],
            "rows": [
                ["0", "7", "7", "0", "0"],
                ["1", "1", "1", "0", "0"],
                ["2", "5", "1", "4", "4"],
                ["3", "3", "1", "2", "4"],
                ["4", "6", "1", "5", "5"],
                ["5", "4", "1", "3", "5"],
            ],
            "result": "The answer is 5, from buying at 1 and selling at 6.",
        },
        "mistakes": [
            {
                "name": "The Same-Day Trap",
                "wrong": "Updating cheapest before computing today's profit, so a day sells against itself.",
                "right": "Compute profit first, then lower cheapest. A day cannot be both buy and sell.",
            },
            {
                "name": "Requiring a profit",
                "wrong": "Returning a negative number when prices only fall.",
                "right": "Start best at 0. Doing nothing is allowed.",
            },
            {
                "name": "Two passes with extra arrays",
                "wrong": "Building a suffix-max array of later prices, then a second pass.",
                "right": "The running minimum already holds everything you need from the past.",
            },
        ],
        "edge_cases": [
            {"input": "[7,6,4,3,1]", "expected": "0", "why": "Prices only fall: no trade."},
            {"input": "[1]", "expected": "0", "why": "One day: you cannot sell later."},
            {"input": "[2,4,1]", "expected": "2", "why": "The cheapest day is last; the best trade is earlier."},
            {"input": "[7,1,5,3,6,4]", "expected": "5", "why": "The usual buy-low-sell-high case."},
        ],
        "interview_script": [
            "I may buy on one day and sell on a later day. I want the biggest profit, or 0.",
            "I could try every pair of days, but that is O(n²) and will not pass at 10^5 days.",
            "The key point: the best sale today uses the cheapest price I have already seen.",
            "I walk once, tracking the running minimum and the best profit.",
            "That is O(n) time and O(1) space. I will test a falling list, a single day, and a cheapest-at-the-end case.",
        ],
        "follow_ups": [
            {
                "question": "You may complete as many trades as you like.",
                "answer": "Add every up-move: sum of prices[i] - prices[i-1] when that is positive. That is Best Time II.",
            },
            {
                "question": "You may complete at most two trades.",
                "answer": "Keep four numbers: first buy, first sell, second buy, second sell, updated left to right.",
            },
            {
                "question": "Return the two days, not the profit.",
                "answer": "When best improves, also store the current day and the day of the current cheapest.",
            },
        ],
        "related_slugs": ["single-pass-profit", "lc-122", "lc-53"],
    },
    {
        "slugs": ["lc-169"],
        "pattern": "Boyer-Moore voting",
        "trigger": "An element that appears more than half the time, and you may assume it exists.",
        "summary": (
            "A majority outnumbers everything else put together. "
            "Keep one candidate and a count: matches add one, others subtract one, and a zero count picks a new candidate."
        ),
        "approaches": [
            {
                "name": "Count every value",
                "idea": "Store how many times each number appears, then return the one above n / 2.",
                "steps": [
                    "Walk the array and add one to a map count for each value.",
                    "Walk the map.",
                    "Return the key whose count is greater than n / 2.",
                ],
                "code": """import java.util.*;

class Solution {
    public int majorityElement(int[] nums) {
        Map<Integer, Integer> counts = new HashMap<>();
        for (int value : nums) counts.merge(value, 1, Integer::sum);
        int need = nums.length / 2;
        for (var entry : counts.entrySet()) {
            if (entry.getValue() > need) return entry.getKey();
        }
        return nums[0];
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is counted once, then the map is read once.",
                "space_complexity": "O(n)",
                "space_why": "In the worst case every value is different until the end, so the map can hold n keys.",
                "when_to_use": "Correct and easy. Mention it, then offer the constant-space follow-up.",
                "is_optimal": False,
            },
            {
                "name": "One candidate, one count",
                "idea": "Pair each non-candidate with a candidate. The majority is the one left over.",
                "steps": [
                    "Start with count 0 and no candidate.",
                    "If count is 0, adopt the current value as the candidate.",
                    "If the value equals the candidate, add one to count. If not, subtract one.",
                    "At the end the candidate is the majority. The problem promises it exists.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Each value is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only the candidate and the count are stored.",
                "when_to_use": "The version they want if they ask for constant space. Write this.",
                "is_optimal": True,
            },
            {
                "name": "Count the ones in each bit",
                "idea": "Build the answer one bit at a time: a value that fills more than half the row has each of its bits set in more than half the values.",
                "steps": [
                    "Take the bit positions one at a time, 32 in all.",
                    "For one position, count how many values have a 1 there.",
                    "If that count is more than half the length, the majority has a 1 there, so set that bit in the answer.",
                    "After all 32 positions the answer is built. Negative values need no special care: the sign bit is position 31 like any other.",
                ],
                "code": """class Solution {
    public int majorityElement(int[] nums) {
        int answer = 0;
        int half = nums.length / 2;
        for (int bit = 0; bit < 32; bit++) {
            int ones = 0;
            for (int value : nums) {
                if (((value >> bit) & 1) == 1) ones++;
            }
            if (ones > half) answer |= 1 << bit;
        }
        return answer;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Thirty-two passes over the row, one per bit position, so the work is 32n.",
                "space_complexity": "O(1)",
                "space_why": "One counter and the answer being built up.",
                "when_to_use": "When the counting rule changes. If every value appears three times except one, the candidate-and-count trick breaks, but counting the ones in each bit position and taking each count modulo 3 still spells out the odd value.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [2,2,1,1,1,2,2]",
            "columns": ["value", "count before", "action", "candidate", "count after"],
            "rows": [
                ["2", "0", "count is 0, adopt 2", "2", "1"],
                ["2", "1", "match, add one", "2", "2"],
                ["1", "2", "other, subtract one", "2", "1"],
                ["1", "1", "other, subtract one", "2", "0"],
                ["1", "0", "count is 0, adopt 1", "1", "1"],
                ["2", "1", "other, subtract one", "1", "0"],
                ["2", "0", "count is 0, adopt 2", "2", "1"],
            ],
            "result": "The answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Middle-Sort Trap",
                "wrong": "Sorting, then returning nums[n/2].",
                "right": "That is correct, but O(n log n). Voting is linear and uses no extra array.",
            },
            {
                "name": "Skipping the count-is-zero step",
                "wrong": "Only changing the candidate when it first appears.",
                "right": "Whenever count hits 0, the next value becomes the candidate. That is the whole method.",
            },
            {
                "name": "Verifying when you must not",
                "wrong": "A second pass to count the candidate, then panicking if it is not a majority.",
                "right": "This problem promises a majority. A second pass is only needed if that promise is dropped.",
            },
        ],
        "edge_cases": [
            {"input": "[1]", "expected": "1", "why": "One element is a majority of 1."},
            {"input": "[3,2,3]", "expected": "3", "why": "The majority is not the first value."},
            {"input": "[2,2,1,1,1,2,2]", "expected": "2", "why": "The candidate changes once, then comes back."},
            {"input": "[1,1,1,2,2]", "expected": "1", "why": "The majority sits at the front and never loses the count."},
        ],
        "interview_script": [
            "I need the value that appears more than n/2 times. It is promised to exist.",
            "I could count with a hash map in O(n) time and O(n) space. That works.",
            "I use the fact that a majority outnumbers the rest, so pairing others against it leaves it standing.",
            "I keep one candidate and a count that goes up on a match and down otherwise. A zero count picks a new candidate.",
            "That is O(n) time and O(1) space. I will test a single element and a case where the candidate changes.",
        ],
        "follow_ups": [
            {
                "question": "The majority is not promised.",
                "answer": "After the pass, count the candidate in a second walk. If it is not above n/2, there is no majority.",
            },
            {
                "question": "Find every value that appears more than n/3 times.",
                "answer": "Keep two candidates and two counts. At most two values can beat n/3. Verify both at the end.",
            },
            {
                "question": "The array is sorted.",
                "answer": "The majority must cover the middle index. Return nums[n/2].",
            },
        ],
        "related_slugs": ["lc-217", "lc-347", "lc-136"],
    },
    {
        "slugs": ["lc-189"],
        "pattern": "In-place reverse",
        "trigger": "Rotate an array right by k steps, in place, with no extra array.",
        "summary": (
            "Rotating right by k is the same as reversing the whole row, then reversing the first k items, "
            "then reversing the rest. Reduce k modulo n first."
        ),
        "approaches": [
            {
                "name": "Copy into a new row",
                "idea": "Each value moves k steps right, wrapping around, into a new array, then copy back.",
                "steps": [
                    "Set k to k modulo the length. Rotating by n is no change.",
                    "Make a new array of length n.",
                    "Put each nums[i] into the slot (i + k) modulo n.",
                    "Copy the new array back onto nums and return nums.",
                ],
                "code": """class Solution {
    public int[] rotate(int[] nums, int k) {
        int n = nums.length;
        k %= n;
        int[] rotated = new int[n];
        for (int i = 0; i < n; i++) rotated[(i + k) % n] = nums[i];
        System.arraycopy(rotated, 0, nums, 0, n);
        return nums;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is written once into the copy, then copied back.",
                "space_complexity": "O(n)",
                "space_why": "The extra array holds n values.",
                "when_to_use": "Correct and easy. If they ask for O(1) extra space, do the three reverses instead.",
                "is_optimal": False,
            },
            {
                "name": "Three reverses",
                "idea": "Reverse all, reverse the new front block of k, reverse the rest.",
                "steps": [
                    "Set k to k modulo the length.",
                    "Reverse the whole array.",
                    "Reverse the first k values. They are the ones that wrapped in.",
                    "Reverse from index k to the end.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Each value is swapped a constant number of times across the three reverses.",
                "space_complexity": "O(1)",
                "space_why": "Only a temp for swapping.",
                "when_to_use": "The version to write when they want in-place.",
                "is_optimal": True,
            },
            {
                "name": "Cyclic replacements",
                "idea": "Send each value straight to its final slot, catching whatever was there, and go round in a ring until you are back where the ring started.",
                "steps": [
                    "Set k to k modulo the length.",
                    "Start at index 0 and pick up its value. Put it down at slot `(0 + k) % n`, picking up whatever was parked there.",
                    "Carry on from that slot the same way, until you come back to the slot you started from.",
                    "Count how many values you have placed. While that is under n, start a fresh ring at the next index and repeat.",
                ],
                "code": """class Solution {
    public int[] rotate(int[] nums, int k) {
        int n = nums.length;
        k %= n;
        int placed = 0;
        for (int start = 0; placed < n; start++) {
            int at = start;
            int carry = nums[start];
            do {
                int next = (at + k) % n;
                int displaced = nums[next];
                nums[next] = carry;
                carry = displaced;
                at = next;
                placed++;
            } while (at != start);
        }
        return nums;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Every value is picked up once and put down once, however many rings there are.",
                "space_complexity": "O(1)",
                "space_why": "Only the carried value and the count of placed values are extra.",
                "when_to_use": "When writing a value is the expensive part, such as rows in a file or records on disk. This writes each value exactly once, while the three reverses write most of them twice.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,2,3,4,5,6,7], k = 3",
            "columns": ["step", "what", "array"],
            "rows": [
                ["0", "start", "1 2 3 4 5 6 7"],
                ["1", "reverse all", "7 6 5 4 3 2 1"],
                ["2", "reverse first 3", "5 6 7 4 3 2 1"],
                ["3", "reverse the rest", "5 6 7 1 2 3 4"],
            ],
            "result": "The answer is [5,6,7,1,2,3,4].",
        },
        "mistakes": [
            {
                "name": "The Modulo Trap",
                "wrong": "Reversing the first k items when k is bigger than n.",
                "right": "Set `k %= n` first. Rotating n steps is the identity. Also k = 0 after that.",
            },
            {
                "name": "Rotating one step, k times",
                "wrong": "Shifting the whole array by 1, repeated k times.",
                "right": "That is O(n k) and times out. Three reverses are O(n).",
            },
            {
                "name": "Reversing the wrong block",
                "wrong": "Reversing the last k items first.",
                "right": "After reversing all, the wrapped-in values sit at the front. Reverse that front block of k.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2]\n3", "expected": "[2,1]", "why": "k is bigger than n: 3 % 2 = 1."},
            {"input": "[1]\n0", "expected": "[1]", "why": "One element, k = 0."},
            {"input": "[1,2,3,4,5,6,7]\n3", "expected": "[5,6,7,1,2,3,4]", "why": "The usual rotate-right case."},
            {"input": "[-1,-100,3,99]\n2", "expected": "[3,99,-1,-100]", "why": "Negatives, k = 2."},
        ],
        "interview_script": [
            "I need to rotate the array right by k, in place.",
            "I could copy into a new row in O(n) time, but that uses O(n) extra space.",
            "I reduce k modulo n first, because a full turn changes nothing.",
            "I reverse the whole row, then the first k, then the rest. That is three linear reverses.",
            "That is O(n) time and O(1) space. I will test k bigger than n, k = 0, and n = 1.",
        ],
        "follow_ups": [
            {
                "question": "Rotate left instead of right.",
                "answer": "Right by k is left by n - k. Or reverse the last k first after reversing all.",
            },
            {
                "question": "The array is a linked list.",
                "answer": "Find the (n-k)th node, cut, and attach the tail in front. Still O(n), O(1) extra.",
            },
            {
                "question": "Can you cycle the values with a handful of writes?",
                "answer": "Yes: jump i -> (i+k)%n, replacing as you go, for each cycle. Same cost, harder to write cleanly.",
            },
        ],
        "related_slugs": ["lc-31", "lc-48", "lc-151"],
    },
    {
        "slugs": ["lc-238"],
        "pattern": "Prefix and suffix products",
        "trigger": "Each index wants the product of every other value, with no division, in linear time.",
        "summary": (
            "answer[i] is (product of everything left of i) times (product of everything right of i). "
            "Write left products into the output going forward, then multiply right products going back."
        ),
        "approaches": [
            {
                "name": "Multiply everyone else",
                "idea": "For each index, loop the rest of the array and multiply.",
                "steps": [
                    "Make an answer array of the same length.",
                    "For each index i, set a running product to 1.",
                    "Multiply every nums[j] with j not equal to i into that product.",
                    "Store it at answer[i].",
                ],
                "code": """class Solution {
    public int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        for (int i = 0; i < n; i++) {
            int product = 1;
            for (int j = 0; j < n; j++) {
                if (j != i) product *= nums[j];
            }
            answer[i] = product;
        }
        return answer;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each of n indices re-multiplies the other n - 1 values.",
                "space_complexity": "O(1)",
                "space_why": "Beyond the output array, only the running product is stored.",
                "when_to_use": "Say it. Do not code it: n is 10^5, and division is banned as a shortcut.",
                "is_optimal": False,
            },
            {
                "name": "Left pass, then right pass",
                "idea": "Fill the output with products to the left, then multiply products to the right on the way back.",
                "steps": [
                    "Set answer[0] = 1. For each later index, answer[i] is answer[i-1] * nums[i-1].",
                    "Start a suffix product at 1 on the right end.",
                    "Walk left. Multiply answer[i] by the suffix, then multiply the suffix by nums[i].",
                    "Zeros work: a single zero makes every other slot 0, and the zero's slot holds the rest.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Two walks of n indices.",
                "space_complexity": "O(1)",
                "space_why": "The output does not count. Only the suffix product is extra.",
                "when_to_use": "The version to write. No division, linear time, no extra array.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,2,3,4]",
            "columns": ["i", "left product so far", "answer after left pass", "suffix", "answer after right"],
            "rows": [
                ["0", "1", "1", "24", "24"],
                ["1", "1", "1", "12", "12"],
                ["2", "2", "2", "4", "8"],
                ["3", "6", "6", "1", "6"],
            ],
            "result": "The answer is [24,12,8,6].",
        },
        "mistakes": [
            {
                "name": "The Division Trap",
                "wrong": "Product of the whole array, then divide by nums[i].",
                "right": "A zero makes the total 0 and division crash. Two zeros make every slot 0. Do not divide.",
            },
            {
                "name": "Counting the output as extra space",
                "wrong": "Building two extra prefix and suffix arrays and calling that O(1).",
                "right": "The follow-up wants O(1) besides the output. Write prefixes into the output, suffixes into one variable.",
            },
            {
                "name": "Multiplying nums[i] into the left product",
                "wrong": "answer[i] = answer[i-1] * nums[i], which includes itself.",
                "right": "Left product at i uses nums[i-1], never nums[i].",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3,4]", "expected": "[24,12,8,6]", "why": "No zeros."},
            {"input": "[-1,1,0,-3,3]", "expected": "[0,0,9,0,0]", "why": "One zero: only that slot is non-zero."},
            {"input": "[0,0]", "expected": "[0,0]", "why": "Two zeros: every slot is 0."},
            {"input": "[2,3]", "expected": "[3,2]", "why": "The smallest length, 2.",},
        ],
        "interview_script": [
            "I need each index to hold the product of every other value, with no division.",
            "I could multiply the rest for each index in O(n²). That will not pass.",
            "I split the product into everything on the left and everything on the right.",
            "I write left products into the output going forward, then multiply right products going back.",
            "That is O(n) time and O(1) extra space. I will test no zeros, one zero, and two zeros.",
        ],
        "follow_ups": [
            {
                "question": "Division is allowed.",
                "answer": "Still be careful with zeros. Count zeros: none, divide total; one, only that slot is the rest; two or more, all zeros.",
            },
            {
                "question": "Values can overflow 32-bit ints.",
                "answer": "Use long in the running products, or the problem's bounds (here ±30, n ≤ 10^5) to argue it fits.",
            },
            {
                "question": "Can you do it in one pass?",
                "answer": "You can fill left products in one pass and right products from a second array in the same loop from both ends. Same cost.",
            },
        ],
        "related_slugs": ["lc-53", "lc-152", "lc-42"],
    },
    {
        "slugs": ["lc-31"],
        "pattern": "Next permutation in place",
        "trigger": "Rearrange into the next larger permutation, or the smallest if you are already at the last.",
        "summary": (
            "From the right, find the first rise (a value smaller than its neighbour). "
            "Swap it with the smallest value to its right that is still bigger, then reverse the tail."
        ),
        "approaches": [
            {
                "name": "Build every permutation",
                "idea": "Make every unique permutation, sort them, and take the one after the current row.",
                "steps": [
                    "Copy nums into a list of values.",
                    "Generate every permutation, drop duplicates, and sort them.",
                    "Find the current row in that list.",
                    "Return the next one, or the first if this row is last.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] nextPermutation(int[] nums) {
        List<int[]> perms = new ArrayList<>();
        permute(nums, 0, perms);
        perms.sort((a, b) -> {
            for (int i = 0; i < a.length; i++) if (a[i] != b[i]) return a[i] - b[i];
            return 0;
        });
        int pos = 0;
        for (int i = 0; i < perms.size(); i++) if (Arrays.equals(perms.get(i), nums)) pos = i;
        int[] next = perms.get((pos + 1) % perms.size());
        System.arraycopy(next, 0, nums, 0, nums.length);
        return nums;
    }

    private void permute(int[] nums, int start, List<int[]> out) {
        if (start == nums.length) {
            out.add(Arrays.copyOf(nums, nums.length));
            return;
        }
        Set<Integer> used = new HashSet<>();
        for (int i = start; i < nums.length; i++) {
            if (!used.add(nums[i])) continue;
            swap(nums, start, i);
            permute(nums, start + 1, out);
            swap(nums, start, i);
        }
    }

    private void swap(int[] nums, int i, int j) {
        int t = nums[i];
        nums[i] = nums[j];
        nums[j] = t;
    }
}
""",
                "time_complexity": "O(n · n!)",
                "time_why": "There are n factorial permutations, and each is copied and later compared.",
                "space_complexity": "O(n · n!)",
                "space_why": "Every permutation is stored.",
                "when_to_use": "Say it to show you know what “next” means. Do not code it.",
                "is_optimal": False,
            },
            {
                "name": "Pivot, swap, reverse tail",
                "idea": "The tail is decreasing, so it is already the last permutation of those values. Raise the pivot, then sort the tail by reversing it.",
                "steps": [
                    "Walk from the right. Find the first index i where nums[i] < nums[i+1]. That is the pivot.",
                    "If there is no such i, the row is strictly decreasing: reverse it all and return.",
                    "From the right, find the smallest value still bigger than nums[i], and swap with the pivot.",
                    "Reverse the tail after i so it is increasing: the smallest follow-on.",
                ],
                "code": """class Solution {
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

    private void swap(int[] nums, int i, int j) {
        int t = nums[i];
        nums[i] = nums[j];
        nums[j] = t;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One walk to the pivot, one walk to the swap, one reverse of the tail.",
                "space_complexity": "O(1)",
                "space_why": "Only a few indices and a temp for swapping.",
                "when_to_use": "The version to write. In-place, linear, no extra list.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,3,2]",
            "columns": ["step", "i", "j", "array"],
            "rows": [
                ["find pivot: 1 < 3, stop", "0", "-", "1 3 2"],
                ["from the right, 2 is the next bigger than 1", "0", "2", "1 3 2"],
                ["swap pivot with 2", "0", "2", "2 3 1"],
                ["reverse the tail after i", "0", "-", "2 1 3"],
            ],
            "result": "The answer is [2,1,3].",
        },
        "mistakes": [
            {
                "name": "The Strict-Rise Trap",
                "wrong": "Stopping only when nums[i] > nums[i+1], so equal neighbours look like a rise.",
                "right": "Walk while `nums[i] >= nums[i+1]`. A plateau is still a decreasing tail.",
            },
            {
                "name": "Sorting the tail instead of reversing",
                "wrong": "Calling sort on the suffix.",
                "right": "The tail is decreasing, so reverse is enough and is O(n).",
            },
            {
                "name": "Picking any bigger value to swap",
                "wrong": "Swapping the pivot with the rightmost value, even if a smaller upgrade exists.",
                "right": "From the right, take the first value that is still bigger than the pivot. That is the smallest upgrade.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3]", "expected": "[1,3,2]", "why": "The first permutation."},
            {"input": "[3,2,1]", "expected": "[1,2,3]", "why": "Already the last: wrap to the first."},
            {"input": "[1,1,5]", "expected": "[1,5,1]", "why": "Duplicates in the tail."},
            {"input": "[1,3,2]", "expected": "[2,1,3]", "why": "The pivot is not next to the end."},
        ],
        "interview_script": [
            "I need the next larger permutation, or the smallest if this is already the last.",
            "I could generate every permutation and pick the next, but that is O(n · n factorial) and will not pass.",
            "I walk from the right to find the first rise. That index is the pivot I can still increase.",
            "I swap it with the smallest bigger value on its right, then reverse the tail so it is increasing.",
            "That is O(n) time and O(1) space. I will test a last permutation, duplicates, and [1,3,2].",
        ],
        "follow_ups": [
            {
                "question": "Previous permutation instead of next.",
                "answer": "Mirror it: walk for the first fall from the right, swap with the next smaller, reverse the tail.",
            },
            {
                "question": "Return the k-th permutation of 1..n.",
                "answer": "Use factorials to pick the digit at each place. That is O(n²) with a list of unused digits.",
            },
            {
                "question": "The values are not unique.",
                "answer": "The same walks work if you use >= and <=, so equal values are treated as a non-rise.",
            },
        ],
        "related_slugs": ["lc-189", "lc-46", "lc-78"],
    },
    {
        "slugs": ["lc-41"],
        "pattern": "Index as a hash table",
        "trigger": "The smallest missing positive integer, in linear time and constant extra space.",
        "summary": (
            "The answer is between 1 and n+1. Put each value v in 1..n into slot v-1 by swapping. "
            "Then the first slot whose value is not i+1 is the missing one."
        ),
        "approaches": [
            {
                "name": "Sort, then scan",
                "idea": "Sort, skip non-positives, then walk until the next expected positive is missing.",
                "steps": [
                    "Sort the array.",
                    "Start expecting 1.",
                    "Skip values that are not positive, and skip duplicates of the expected value.",
                    "On a gap, return the expected value. If none, return n+1 after the last positive.",
                ],
                "code": """import java.util.*;

class Solution {
    public int firstMissingPositive(int[] nums) {
        Arrays.sort(nums);
        int expect = 1;
        for (int value : nums) {
            if (value <= 0 || value < expect) continue;
            if (value != expect) return expect;
            expect++;
        }
        return expect;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting dominates.",
                "space_complexity": "O(1)",
                "space_why": "The sort is in place. Only the expected value is extra.",
                "when_to_use": "Correct. They will ask for linear time and O(1) extra space next.",
                "is_optimal": False,
            },
            {
                "name": "Swap each value into its slot",
                "idea": "Treat the array as a map from index i to value i+1. Swap until each in-range value sits home.",
                "steps": [
                    "For each index i, while nums[i] is in 1..n and is not already at slot nums[i]-1, swap it there.",
                    "Use a while, not an if: after a swap, the new value at i may also need to go home.",
                    "Then scan: the first i with `nums[i] != i+1` is missing i+1.",
                    "If every slot matches, the missing value is n+1.",
                ],
                "code": """class Solution {
    public int firstMissingPositive(int[] nums) {
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
                int slot = nums[i] - 1;
                int temp = nums[slot];
                nums[slot] = nums[i];
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
                "time_complexity": "O(n)",
                "time_why": "Each value is swapped into its slot at most once, then the array is scanned once.",
                "space_complexity": "O(1)",
                "space_why": "Swaps happen in the input. Only a temp is extra.",
                "when_to_use": "The version they want. Linear time, no extra set.",
                "is_optimal": True,
            },
            {
                "name": "Mark by sign",
                "idea": "Leave every value where it is and use the sign of slot v-1 as a tick meaning the number v was seen.",
                "steps": [
                    "First pass: replace every value that is not in 1..n with n+1, so nothing out of range can be mistaken for a tick.",
                    "Second pass: read each slot's size without its sign, and if that size v is in 1..n, make the value in slot v-1 negative.",
                    "A negative value in a slot is the tick for that slot's number, whatever value happens to be parked there.",
                    "Third pass: the first slot still holding a positive value is the missing number. If none is positive, the answer is n+1.",
                ],
                "code": """class Solution {
    public int firstMissingPositive(int[] nums) {
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            if (nums[i] <= 0 || nums[i] > n) nums[i] = n + 1;
        }
        for (int i = 0; i < n; i++) {
            int seen = Math.abs(nums[i]);
            if (seen <= n && nums[seen - 1] > 0) nums[seen - 1] = -nums[seen - 1];
        }
        for (int i = 0; i < n; i++) {
            if (nums[i] > 0) return i + 1;
        }
        return n + 1;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Three passes straight through the row, with no swapping and no repeated visits.",
                "space_complexity": "O(1)",
                "space_why": "The ticks live in the sign bits of the input. Nothing else is stored.",
                "when_to_use": "When the values must stay in the order they came in, since swapping rearranges the input. The same sign trick is what solves 'find all numbers missing from 1..n' and 'find all duplicates' on one array.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [3,4,-1,1]",
            "columns": ["i", "nums[i]", "action", "array"],
            "rows": [
                ["0", "3", "swap 3 into slot 2", "-1, 4, 3, 1"],
                ["0", "-1", "not in 1..n, stop", "-1, 4, 3, 1"],
                ["1", "4", "swap 4 into slot 3", "-1, 1, 3, 4"],
                ["1", "1", "swap 1 into slot 0", "1, -1, 3, 4"],
                ["1", "-1", "not in 1..n, stop", "1, -1, 3, 4"],
                ["scan", "-1 at i=1", "slot 1 should hold 2", "1, -1, 3, 4"],
            ],
            "result": "The first mismatch is index 1, so the answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Once-Swap Trap",
                "wrong": "One swap per index, then moving on, leaving the new value at i unplaced.",
                "right": "Keep swapping at i until the value there belongs or is out of range.",
            },
            {
                "name": "Infinite swap on duplicates",
                "wrong": "Swapping whenever nums[i] is in range, even if the target slot already holds the same value.",
                "right": "Stop when `nums[nums[i] - 1] == nums[i]`. That is a duplicate already home.",
            },
            {
                "name": "A set of seen positives",
                "wrong": "Putting every positive in a HashSet, then probing 1, 2, 3, …",
                "right": "That is O(n) extra space. The array itself is the set.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,0]", "expected": "3", "why": "1 and 2 are present, so 3."},
            {"input": "[3,4,-1,1]", "expected": "2", "why": "Negatives and a gap at 2."},
            {"input": "[7,8,9,11,12]", "expected": "1", "why": "Nothing in 1..n, so 1."},
            {"input": "[1]", "expected": "2", "why": "A lone 1 means 2 is missing."},
            {"input": "[1,1]", "expected": "2", "why": "Duplicate 1. The while must not loop for ever.",},
        ],
        "interview_script": [
            "I need the smallest missing positive, in linear time and constant extra space.",
            "I could sort and scan in O(n log n). That misses the time bound.",
            "I notice the answer is at most n+1, so I can use the n slots as a map for 1..n.",
            "I swap each in-range value into slot v-1, then scan for the first slot that is not i+1.",
            "That is O(n) time and O(1) space. I will test all-outside-range, duplicates, and [3,4,-1,1].",
        ],
        "follow_ups": [
            {
                "question": "O(n) extra space is allowed.",
                "answer": "A boolean array of size n+1, mark each in-range value, then scan. Easier to write.",
            },
            {
                "question": "You may not mutate the input.",
                "answer": "Then you need extra memory, or a set. The O(1) space version has to write into nums.",
            },
            {
                "question": "Find the smallest missing non-negative, including 0.",
                "answer": "Shift the slots: value v in 0..n-1 goes to index v. Same walk.",
            },
        ],
        "related_slugs": ["lc-268", "missing-range-value", "lc-136"],
    },
    {
        "slugs": ["lc-53"],
        "pattern": "Kadane, best run ending here",
        "trigger": "The largest sum of any contiguous run in an array that may hold negatives.",
        "summary": (
            "At each index, either extend the run that ends just before it, or start a new run here. "
            "Start a new run when the running sum has gone below the current value."
        ),
        "approaches": [
            {
                "name": "Every subarray sum",
                "idea": "For each start, add values going right and keep the best sum seen.",
                "steps": [
                    "Pick a start index.",
                    "Walk right, adding into a running sum.",
                    "After each add, compare with the best.",
                    "Repeat for every start.",
                ],
                "code": """class Solution {
    public int maxSubArray(int[] nums) {
        int best = nums[0];
        for (int start = 0; start < nums.length; start++) {
            int sum = 0;
            for (int end = start; end < nums.length; end++) {
                sum += nums[end];
                best = Math.max(best, sum);
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-adds every later end.",
                "space_complexity": "O(1)",
                "space_why": "Only the running sum and the best are stored.",
                "when_to_use": "Say it. Do not code it when n is 10^5.",
                "is_optimal": False,
            },
            {
                "name": "Best run ending at i",
                "idea": "A negative prefix can only hurt what follows, so drop it and start at i.",
                "steps": [
                    "Set best and running to nums[0], so an all-negative array still works.",
                    "For each later value, set running to max(value, running + value).",
                    "Then set the best to max(best, running).",
                    "Return the best sum.",
                ],
                "code": """class Solution {
    public int maxSubArray(int[] nums) {
        int best = nums[0];
        int running = nums[0];
        for (int i = 1; i < nums.length; i++) {
            running = Math.max(nums[i], running + nums[i]);
            best = Math.max(best, running);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only best and running are stored.",
                "when_to_use": "The version to write. One pass.",
                "is_optimal": True,
            },
            {
                "name": "Divide and conquer on the middle",
                "idea": "Cut the row in half. The best run lies wholly in the left half, wholly in the right half, or across the middle, and the crossing one is easy to measure.",
                "steps": [
                    "A range of one value answers itself: that value.",
                    "Otherwise cut the range at the middle and solve the left half and the right half the same way.",
                    "For the crossing run, walk left from the middle adding values and keep the largest total reached.",
                    "Do the same walking right from just past the middle, then add the two totals together.",
                    "The answer for the range is the largest of those three numbers.",
                ],
                "code": """class Solution {
    public int maxSubArray(int[] nums) {
        return best(nums, 0, nums.length - 1);
    }

    private int best(int[] nums, int lo, int hi) {
        if (lo == hi) return nums[lo];
        int mid = lo + (hi - lo) / 2;
        int left = best(nums, lo, mid);
        int right = best(nums, mid + 1, hi);
        int leftReach = Integer.MIN_VALUE;
        int sum = 0;
        for (int i = mid; i >= lo; i--) {
            sum += nums[i];
            leftReach = Math.max(leftReach, sum);
        }
        int rightReach = Integer.MIN_VALUE;
        sum = 0;
        for (int i = mid + 1; i <= hi; i++) {
            sum += nums[i];
            rightReach = Math.max(rightReach, sum);
        }
        return Math.max(Math.max(left, right), leftReach + rightReach);
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "The row is cut in half about log n times, and every level walks all n values for its crossing runs.",
                "space_complexity": "O(log n)",
                "space_why": "The calls stack about log n deep, each holding a few sums.",
                "when_to_use": "The classic follow-up when the one-pass version is banned. It is also the way to answer 'best run inside any range you ask for': keep these three sums plus the total in each node of a segment tree and a query costs O(log n).",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
            "columns": ["i", "value", "running", "best"],
            "rows": [
                ["0", "-2", "-2", "-2"],
                ["1", "1", "1", "1"],
                ["2", "-3", "-2", "1"],
                ["3", "4", "4", "4"],
                ["4", "-1", "3", "4"],
                ["5", "2", "5", "5"],
                ["6", "1", "6", "6"],
                ["7", "-5", "1", "6"],
                ["8", "4", "5", "6"],
            ],
            "result": "The answer is 6, from the run [4,-1,2,1].",
        },
        "mistakes": [
            {
                "name": "The Zero-Start Trap",
                "wrong": "Initialising best to 0, so an array of all negatives returns 0.",
                "right": "The empty subarray is not allowed. Seed best with nums[0].",
            },
            {
                "name": "Resetting to 0 instead of to nums[i]",
                "wrong": "If running + nums[i] is worse, set running to 0.",
                "right": "Set running to nums[i]. A lone negative can still be the answer.",
            },
            {
                "name": "Forgetting to update best after extending",
                "wrong": "Only comparing when you start a new run.",
                "right": "Compare after every index. The best may be in the middle of a growing run.",
            },
        ],
        "edge_cases": [
            {"input": "[1]", "expected": "1", "why": "One element."},
            {"input": "[-1]", "expected": "-1", "why": "A single negative: empty is not allowed."},
            {"input": "[-2,1,-3,4,-1,2,1,-5,4]", "expected": "6", "why": "The usual mixed-sign case."},
            {"input": "[5,4,-1,7,8]", "expected": "23", "why": "The whole array is best."},
        ],
        "interview_script": [
            "I need the largest sum of any contiguous run. The array is never empty.",
            "I could add every subarray in O(n²). That will not pass at 10^5.",
            "I keep the best sum that ends at the current index: extend, or start here if the prefix has gone bad.",
            "I also keep the global best. I seed both with nums[0] so all-negative inputs work.",
            "That is O(n) time and O(1) space. I will test a single negative, the whole array, and the mixed example.",
        ],
        "follow_ups": [
            {
                "question": "Return the subarray itself, not the sum.",
                "answer": "When running resets to nums[i], store i as the start. When best improves, store start and i.",
            },
            {
                "question": "The array is circular.",
                "answer": "The answer is max(Kadane, total - min-subarray), unless the min-subarray is the whole array.",
            },
            {
                "question": "At most k extra negatives may be dropped.",
                "answer": "That becomes a different window problem. Kadane alone is not enough.",
            },
        ],
        "related_slugs": ["lc-152", "lc-121", "lc-560"],
    },
    {
        "slugs": ["merged-median"],
        "pattern": "Binary search on a partition",
        "trigger": "The median of two already-sorted arrays, in log time, without merging them.",
        "summary": (
            "Cut both arrays so the left half has the right count. "
            "A cut is valid when every left value is <= every right value. Then the median sits on the cut."
        ),
        "approaches": [
            {
                "name": "Merge, then pick the middle",
                "idea": "Merge the two sorted rows into one, then read the middle value or the average of two middles.",
                "steps": [
                    "Merge with two pointers into a new array of length m+n.",
                    "If the length is odd, return the middle value.",
                    "If even, return the average of the two middle values.",
                ],
                "code": """class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        int m = nums1.length, n = nums2.length;
        int[] merged = new int[m + n];
        int i = 0, j = 0, k = 0;
        while (i < m && j < n) merged[k++] = nums1[i] < nums2[j] ? nums1[i++] : nums2[j++];
        while (i < m) merged[k++] = nums1[i++];
        while (j < n) merged[k++] = nums2[j++];
        int mid = (m + n) / 2;
        if (((m + n) & 1) == 1) return merged[mid];
        return (merged[mid - 1] + merged[mid]) / 2.0;
    }
}
""",
                "time_complexity": "O(m + n)",
                "time_why": "Every value is copied once.",
                "space_complexity": "O(m + n)",
                "space_why": "The merged array holds every value.",
                "when_to_use": "Correct and easy. They asked for log time, so keep going.",
                "is_optimal": False,
            },
            {
                "name": "Binary search the shorter cut",
                "idea": "Search how many items the shorter array contributes to the left half.",
                "steps": [
                    "Always search on the shorter array. Let i be how many it gives to the left.",
                    "The other array then gives half - i to the left.",
                    "If aLeft > bRight, i is too big: cut left. If bLeft > aRight, i is too small: cut right.",
                    "When both sides agree, the median is the max of the two lefts, or the average with the min of the two rights.",
                ],
                "code": """class Solution {
    public double findMedianSortedArrays(int[] a, int[] b) {
        if (a.length > b.length) return findMedianSortedArrays(b, a);
        int m = a.length, n = b.length;
        int lo = 0, hi = m;
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
""",
                "time_complexity": "O(log(min(m, n)))",
                "time_why": "The search range is the shorter array, halved each step.",
                "space_complexity": "O(1)",
                "space_why": "Only the cut indices and four edge values are stored.",
                "when_to_use": "The version to write. Search on the shorter array so the range is small.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums1 = [1,2], nums2 = [3,4]",
            "columns": ["i", "j", "aLeft", "aRight", "bLeft", "bRight", "ok?"],
            "rows": [
                ["1", "1", "1", "2", "3", "4", "1<=4 and 3<=2? no, bLeft > aRight"],
                ["i too small", "lo=2", "-", "-", "-", "-", "lo = i+1 = 2"],
                ["2", "0", "2", "+inf", "-inf", "3", "2<=3 and -inf<=+inf, yes"],
                ["even", "-", "max(2,-inf)=2", "min(+inf,3)=3", "-", "-", "average 2.5"],
            ],
            "result": "The answer is 2.5.",
        },
        "mistakes": [
            {
                "name": "The Long-Cut Trap",
                "wrong": "Binary searching the longer row, so j = half - i can go negative.",
                "right": "Always search on the shorter array. Then j stays inside the longer one.",
            },
            {
                "name": "Integer division of the two middles",
                "wrong": "Returning (left + right) / 2, which truncates 5/2 to 2.",
                "right": "Use `/ 2.0` so the even case can be 2.5.",
            },
            {
                "name": "Forgetting empty-side sentinels",
                "wrong": "Reading a[i-1] when i is 0.",
                "right": "Treat an empty left as -infinity and an empty right as +infinity.",
            },
        ],
        "edge_cases": [
            {"input": "[1,3]\n[2]", "expected": "2", "why": "Odd combined length."},
            {"input": "[1,2]\n[3,4]", "expected": "2.5", "why": "Even combined length: average of 2 and 3."},
            {"input": "[]\n[1]", "expected": "1", "why": "One array is empty."},
            {"input": "[2]\n[]", "expected": "2", "why": "The other array is empty."},
            {"input": "[0,0]\n[0,0]", "expected": "0", "why": "All zeros."},
        ],
        "interview_script": [
            "I need the median of two sorted arrays in log time.",
            "I could merge them in O(m+n), but that misses the time bound.",
            "I binary search how many items the shorter array puts on the left of the cut.",
            "A cut is good when the left edges are both <= the right edges. Then I read the median off the cut.",
            "That is O(log(min(m,n))) time and O(1) space. I will test one empty array and an even length.",
        ],
        "follow_ups": [
            {
                "question": "Return the k-th smallest of the two arrays.",
                "answer": "The same cut idea: throw away k/2 values from one side each step.",
            },
            {
                "question": "The arrays are not sorted.",
                "answer": "Log time is gone. Concatenate, sort, pick the middle: O((m+n) log(m+n)).",
            },
            {
                "question": "There are k sorted arrays.",
                "answer": "A min-heap of k heads merges them, or binary search the value. Not this two-array cut.",
            },
        ],
        "related_slugs": ["lc-4", "lc-33", "lc-23"],
    },
    {
        "slugs": ["missing-range-value"],
        "pattern": "XOR or sum of 0..n",
        "trigger": "n distinct numbers from 0..n, and exactly one value in that range is missing.",
        "summary": (
            "XOR every index with every value, and also XOR n. "
            "Pairs cancel. The missing number is left."
        ),
        "approaches": [
            {
                "name": "Sort, then look for a hole",
                "idea": "After sorting, the missing value is the first index i where nums[i] is not i, or n if the row is 0..n-1.",
                "steps": [
                    "Sort the array so the values sit in order.",
                    "Walk each index i. If nums[i] is not i, that index is the missing value.",
                    "If every index matches, the missing value is n.",
                ],
                "code": """import java.util.Arrays;

class Solution {
    public int missingNumber(int[] nums) {
        Arrays.sort(nums);
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] != i) return i;
        }
        return nums.length;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting dominates. The later walk is linear.",
                "space_complexity": "O(1)",
                "space_why": "The sort is in place aside from a few indices.",
                "when_to_use": "Fine to mention. XOR is linear and does not need a sorted copy.",
                "is_optimal": False,
            },
            {
                "name": "XOR indices and values",
                "idea": "x XOR x is 0, so every present number cancels its index, and n is left with the missing one.",
                "steps": [
                    "Start xor at n.",
                    "For each i, xor in both i and nums[i].",
                    "Return the xor.",
                ],
                "code": """class Solution {
    public int missingNumber(int[] nums) {
        int n = nums.length, xor = n;
        for (int i = 0; i < n; i++) xor ^= i ^ nums[i];
        return xor;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each index and each value is mixed in once.",
                "space_complexity": "O(1)",
                "space_why": "Only the running xor is stored.",
                "when_to_use": "The version to write. No overflow, no extra set.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [3,0,1]",
            "columns": ["i", "nums[i]", "xor after i ^ nums[i]"],
            "rows": [
                ["start", "-", "3 (n)"],
                ["0", "3", "3 ^ 0 ^ 3 = 0"],
                ["1", "0", "0 ^ 1 ^ 0 = 1"],
                ["2", "1", "1 ^ 2 ^ 1 = 2"],
            ],
            "result": "The answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Forgotten-N Trap",
                "wrong": "Only xoring indices 0..n-1 with the values, so n itself can never appear.",
                "right": "Start at n, or xor n at the end. The range is 0..n, one past the last index.",
            },
            {
                "name": "Integer overflow on the sum",
                "wrong": "Using int for n*(n+1)/2 when n is large.",
                "right": "Use long, or skip the sum and XOR.",
            },
            {
                "name": "A set of seen values",
                "wrong": "Putting every value in a HashSet, then probing 0..n.",
                "right": "That is extra O(n) space. XOR uses none.",
            },
        ],
        "edge_cases": [
            {"input": "[3,0,1]", "expected": "2", "why": "A hole in the middle."},
            {"input": "[0,1]", "expected": "2", "why": "n is missing."},
            {"input": "[1]", "expected": "0", "why": "0 is missing."},
            {"input": "[0]", "expected": "1", "why": "n is missing, n = 1."},
            {"input": "[1,2,3]", "expected": "0", "why": "0 is missing from 1,2,3."},
        ],
        "interview_script": [
            "I have n distinct numbers from 0..n and I need the missing one.",
            "I could sort and look for the first hole, but that is O(n log n).",
            "I XOR every index with every value, and also XOR n.",
            "I know pairs cancel, so the missing number is left.",
            "That is O(n) time and O(1) space. I will test missing 0, missing n, and a hole in the middle.",
        ],
        "follow_ups": [
            {
                "question": "Two numbers are missing.",
                "answer": "XOR still finds the xor of the two missing values. Then split on a set bit, or use sum and sum-of-squares.",
            },
            {
                "question": "The range is 1..n with one missing.",
                "answer": "Same idea: xor 1..n with the values. Do not xor 0.",
            },
            {
                "question": "Values may repeat.",
                "answer": "This method needs distinct values. Use a set or the index-swap method from First Missing Positive.",
            },
        ],
        "related_slugs": ["lc-268", "lc-41", "lc-136"],
    },
    {
        "slugs": ["pair-target"],
        "pattern": "Hash map of seen values",
        "trigger": "Two indices whose values add to a target, and exactly one pair exists.",
        "summary": (
            "Walk once. For each value, look up target minus that value in a map of earlier indices. "
            "On a hit, return those two indices; otherwise store this value and keep going."
        ),
        "approaches": [
            {
                "name": "Try every pair",
                "idea": "Check every pair of distinct indices.",
                "steps": [
                    "Pick each index i as the first of a pair.",
                    "Pick each later index j after i.",
                    "If the two values add to the target, return [i, j].",
                ],
                "code": """class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) return new int[] {i, j};
            }
        }
        return new int[] {};
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every pair of indices is added once.",
                "space_complexity": "O(1)",
                "space_why": "No extra structure.",
                "when_to_use": "Say it. Do not code it when n is 10^4.",
                "is_optimal": False,
            },
            {
                "name": "Map of value to index",
                "idea": "The partner of nums[i] is target - nums[i], and it must have been seen already or will be.",
                "steps": [
                    "Keep a map: value -> the index where it was seen.",
                    "For each i, let need = target - nums[i].",
                    "If need is in the map, return that index and i.",
                    "Otherwise store the current value at its index and continue.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) return new int[] {seen.get(need), i};
            seen.put(nums[i], i);
        }
        return new int[] {};
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is stored and looked up once.",
                "space_complexity": "O(n)",
                "space_why": "The map holds earlier values.",
                "when_to_use": "The version to write. One pass.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [3,2,4], target = 6",
            "columns": ["i", "value", "need", "seen", "hit?"],
            "rows": [
                ["0", "3", "3", "{}", "no, store 3->0"],
                ["1", "2", "4", "{3:0}", "no, store 2->1"],
                ["2", "4", "2", "{3:0, 2:1}", "yes, index 1"],
            ],
            "result": "The answer is [1, 2].",
        },
        "mistakes": [
            {
                "name": "The Same-Index Trap",
                "wrong": "Storing the value before looking up, so 3+3 uses index 0 twice when target is 6.",
                "right": "Look up first, then store. The partner must be a different earlier index.",
            },
            {
                "name": "Returning the values",
                "wrong": "Returning [nums[i], nums[j]].",
                "right": "Return the indices.",
            },
            {
                "name": "Two passes, two maps",
                "wrong": "Filling the whole map first, then looking up, so a value pairs with itself.",
                "right": "One pass: look up, then insert. That also handles two equal values at two indices.",
            },
        ],
        "edge_cases": [
            {"input": "[2,7,11,15]\n9", "expected": "[0,1]", "why": "The first two add to 9."},
            {"input": "[3,2,4]\n6", "expected": "[1,2]", "why": "Must not pair 3 with itself."},
            {"input": "[3,3]\n6", "expected": "[0,1]", "why": "Two equal values at two indices."},
            {"input": "[0,4,3,0]\n0", "expected": "[0,3]", "why": "Zeros.",},
        ],
        "interview_script": [
            "I need two different indices whose values add to target. Exactly one pair exists.",
            "I could try every pair in O(n²). That is slow.",
            "I walk once with a map of value to index.",
            "For each value I look up target minus that value. If it is there, I return those indices.",
            "That is O(n) time and O(n) space. I will test two equal values and a case that must not reuse one index.",
        ],
        "follow_ups": [
            {
                "question": "The array is sorted.",
                "answer": "Two pointers from the ends. O(n) time and O(1) extra space. That is Two Sum II.",
            },
            {
                "question": "Return every pair, and values may repeat.",
                "answer": "That is a different problem (3Sum's inner loop). Sort, then squeeze, and skip duplicates.",
            },
            {
                "question": "Three values that add to target.",
                "answer": "Sort, peg one index, two-pointer the rest. O(n²). That is 3Sum.",
            },
        ],
        "related_slugs": ["lc-1", "lc-167", "lc-15"],
    },
    {
        "slugs": ["single-pass-profit"],
        "pattern": "One pass, running minimum",
        "trigger": "At most one buy and one later sell, on a list of daily prices.",
        "summary": (
            "Walk left to right. Remember the lowest price so far. "
            "Each day, selling today against that lowest buy is a candidate for the best profit."
        ),
        "approaches": [
            {
                "name": "Try every buy and sell day",
                "idea": "For each buy day, try every later sell day.",
                "steps": [
                    "Pick a buy index i.",
                    "For every later j, compute prices[j] - prices[i].",
                    "Keep the largest non-negative difference.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        int best = 0;
        for (int i = 0; i < prices.length; i++) {
            for (int j = i + 1; j < prices.length; j++) {
                best = Math.max(best, prices[j] - prices[i]);
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every buy day re-reads every later sell day.",
                "space_complexity": "O(1)",
                "space_why": "Only the best profit is stored.",
                "when_to_use": "Say it. Do not code it at 10^5 days.",
                "is_optimal": False,
            },
            {
                "name": "Lowest so far",
                "idea": "The best sale today uses the lowest price already seen.",
                "steps": [
                    "Track the lowest price and the best profit.",
                    "On each day, if this price is lower, it becomes the new lowest.",
                    "Otherwise try selling today against that lowest.",
                    "Return the best profit, which stays 0 if prices only fall.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        int min = Integer.MAX_VALUE, best = 0;
        for (int price : prices) {
            if (price < min) min = price;
            else best = Math.max(best, price - min);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each day is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only min and best are stored.",
                "when_to_use": "The version to write. One pass.",
                "is_optimal": True,
            },
            {
                "name": "Kadane on the day-to-day changes",
                "idea": "Read the prices as the change from one day to the next: any trade earns the sum of the changes in between, so the best trade is the best run of changes.",
                "steps": [
                    "Look at each day as its change from the day before: `prices[i] - prices[i-1]`.",
                    "Buying on day i and selling on day j earns the sum of the changes between them.",
                    "Walk the changes with a running sum, and drop that sum back to 0 whenever it goes below 0.",
                    "Keep the largest running sum seen. It stays 0 when every change is a fall.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        int best = 0;
        int run = 0;
        for (int i = 1; i < prices.length; i++) {
            int change = prices[i] - prices[i - 1];
            run = Math.max(0, run + change);
            best = Math.max(best, run);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One pass over the days, working out each change as you go.",
                "space_complexity": "O(1)",
                "space_why": "Only the running sum and the best are stored. The changes are never written down.",
                "when_to_use": "When you want one idea to cover two problems: seen as changes, this is Maximum Subarray. It is also the reading to reach for when the question hands you the daily moves rather than the prices.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "prices = [7,1,5,3,6,4]",
            "columns": ["price", "min", "profit today", "best"],
            "rows": [
                ["7", "7", "0", "0"],
                ["1", "1", "0", "0"],
                ["5", "1", "4", "4"],
                ["3", "1", "2", "4"],
                ["6", "1", "5", "5"],
                ["4", "1", "3", "5"],
            ],
            "result": "The answer is 5.",
        },
        "mistakes": [
            {
                "name": "The After-Sale Trap",
                "wrong": "This version uses if/else, so a new low is not also a sell. Mixing the two updates can sell on the buy day.",
                "right": "Either compute profit first then min, or use if/else so a new low is not a sell.",
            },
            {
                "name": "Returning a negative profit",
                "wrong": "Starting best at a huge negative, so a falling list returns a loss.",
                "right": "Start best at 0. Doing nothing is allowed.",
            },
            {
                "name": "Requiring two different days in the index math",
                "wrong": "Skipping the next day with i+2, missing a one-day hold.",
                "right": "A buy on day i and sell on i+1 is allowed.",
            },
        ],
        "edge_cases": [
            {"input": "[7,6,4,3,1]", "expected": "0", "why": "Prices only fall."},
            {"input": "[1]", "expected": "0", "why": "One day."},
            {"input": "[1,2]", "expected": "1", "why": "A one-day hold."},
            {"input": "[3,3,3]", "expected": "0", "why": "No up-move."},
        ],
        "interview_script": [
            "I may buy once and sell later. I want the biggest profit, or 0.",
            "I could try every pair in O(n²). That will not pass.",
            "I walk once, keeping the lowest price so far.",
            "Each day I try selling against that lowest, unless today is a new low.",
            "That is O(n) time and O(1) space. I will test a falling list and a one-day hold.",
        ],
        "follow_ups": [
            {
                "question": "As many trades as you like.",
                "answer": "Add every positive day-to-day rise. That is Best Time II.",
            },
            {
                "question": "A fee on each sale.",
                "answer": "Keep two states: holding or not, and subtract the fee when you sell.",
            },
            {
                "question": "Return the buy and sell days.",
                "answer": "When best improves, store today and the day of the current min.",
            },
        ],
        "related_slugs": ["lc-121", "lc-122", "lc-53"],
    },
]


