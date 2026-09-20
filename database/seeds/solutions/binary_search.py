"""Binary search problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-1011"],
        "pattern": "Binary search on the answer",
        "trigger": "The smallest ship capacity that still finishes in D days, packages in a fixed order.",
        "summary": (
            "Capacities sit on a dial from the heaviest package to the total weight. "
            "Too small stays too small below. Try the middle, count the days it needs, and throw half the dial away."
        ),
        "approaches": [
            {
                "name": "Try every capacity",
                "idea": "The answer is at least the heaviest package and at most the total weight. Test each value in between.",
                "steps": [
                    "Set low to the heaviest package and high to the sum of all weights.",
                    "For each capacity from low to high, walk the packages in order and count how many days that capacity needs.",
                    "A package that would overflow the day's load starts the next day.",
                    "Return the first capacity whose day count is at most D.",
                ],
                "code": """class Solution {
    public int shipWithinDays(int[] weights, int days) {
        int low = 0, high = 0;
        for (int w : weights) {
            low = Math.max(low, w);
            high += w;
        }
        for (int cap = low; cap <= high; cap++) {
            if (daysNeeded(weights, cap) <= days) return cap;
        }
        return high;
    }

    private int daysNeeded(int[] weights, int cap) {
        int days = 1, load = 0;
        for (int w : weights) {
            if (load + w > cap) {
                days++;
                load = 0;
            }
            load += w;
        }
        return days;
    }
}
""",
                "time_complexity": "O(n · S)",
                "time_why": "S is the gap from the heaviest package to the total weight. Each guess walks all n packages.",
                "space_complexity": "O(1)",
                "space_why": "Only the running load and the day count.",
                "when_to_use": "Say it. The range of capacities is large, so do not code this loop.",
                "is_optimal": False,
            },
            {
                "name": "Binary search the capacity",
                "idea": "If a capacity finishes in time, every bigger one does too. Search for the first that works.",
                "steps": [
                    "Low is the heaviest package. High is the sum.",
                    "Try the middle capacity: mid = low + (high - low) / 2.",
                    "Walk the packages and count days at that capacity. A package that would overflow starts a new day.",
                    "If the day count is at most D, mid might still be smaller: set high = mid. If not, set low = mid + 1.",
                    "When low meets high, that is the smallest capacity.",
                ],
                "code": """class Solution {
    public int shipWithinDays(int[] weights, int days) {
        int low = 0, high = 0;
        for (int w : weights) {
            low = Math.max(low, w);
            high += w;
        }
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (daysNeeded(weights, mid) <= days) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    private int daysNeeded(int[] weights, int cap) {
        int days = 1, load = 0;
        for (int w : weights) {
            if (load + w > cap) {
                days++;
                load = 0;
            }
            load += w;
        }
        return days;
    }
}
""",
                "time_complexity": "O(n log S)",
                "time_why": "Each guess walks n packages. The capacity range S is halved each time.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search ends and the day counter.",
                "when_to_use": "The version to write. Same check as the slow loop, on a dial instead of every value.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "weights = [1,2,3,4,5,6,7,8,9,10], days = 5",
            "columns": ["low", "high", "cap", "days used", "fit?"],
            "rows": [
                ["10", "55", "32", "1+2+.. then 3 days", "yes, high=32"],
                ["10", "32", "21", "4 days", "yes, high=21"],
                ["10", "21", "15", "15;13;8;9;10 = 5", "yes, high=15"],
                ["10", "15", "12", "6 days", "no, low=13"],
                ["13", "15", "14", "6 days", "no, low=15"],
                ["15", "15", "-", "-", "smallest capacity is 15"],
            ],
            "result": "The smallest capacity that still uses 5 days is 15.",
        },
        "mistakes": [
            {
                "name": "Capacity below the heaviest package",
                "wrong": "Starting the search at 1, or at the average weight.",
                "right": "One package cannot be split. Low must be the heaviest package, or a day can never hold it.",
            },
            {
                "name": "Reordering the packages",
                "wrong": "Sorting so small packages fill the leftover space.",
                "right": "The belt order is fixed. A package that does not fit today waits until tomorrow, in place.",
            },
            {
                "name": "Counting a split day as one",
                "wrong": "Adding every weight and dividing by capacity, as if a leftover load could finish on the next package's day.",
                "right": "Walk in order. When load + next > cap, start a new day with that next package.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3,4,5,6,7,8,9,10]\n5", "expected": "15", "why": "The usual five-day split."},
            {"input": "[3,2,2,4,1,4]\n3", "expected": "6", "why": "Capacity 6 fills exactly on each of the three days."},
            {"input": "[1,2,3,1,1]\n4", "expected": "3", "why": "Four days, so the heaviest package 3 is the answer."},
            {"input": "[1,2,3,4,5]\n1", "expected": "15", "why": "One day means the ship must hold the total weight."},
        ],
        "interview_script": [
            "I need the smallest capacity that ships every package in order within D days.",
            "I could try every capacity from the heaviest package to the total weight. That is O(n S) guesses.",
            "If a capacity finishes in time, every bigger one does too, so I binary search the first that works.",
            "For a guess I walk in order and start a new day when the next package would overflow.",
            "That is O(n log S) time. I will test D = 1, D equal to the number of packages, and a capacity equal to the heaviest one.",
        ],
        "follow_ups": [
            {
                "question": "You may reorder the packages.",
                "answer": "Then it is bin packing, which is a different problem. The belt order is what makes the day-count walk work.",
            },
            {
                "question": "D is at least the number of packages.",
                "answer": "Each package can take its own day, so the answer is the heaviest package.",
            },
            {
                "question": "Return the day-by-day loads for that capacity.",
                "answer": "After you know the capacity, walk once more and record each day's load.",
            },
        ],
        "related_slugs": ["lc-875", "lc-278", "lc-704"],
    },
    {
        "slugs": ["lc-153"],
        "pattern": "Binary search on a rotated row",
        "trigger": "A sorted array was rotated, and you must find the smallest value in log time.",
        "summary": (
            "The smallest value sits just after the cliff. "
            "If the middle is bigger than the right end, the cliff is to the right of mid. If not, the minimum is at mid or left."
        ),
        "approaches": [
            {
                "name": "Scan for the minimum",
                "idea": "Read every value and keep the smallest.",
                "steps": [
                    "Set best to the first value.",
                    "Read each later value and replace best when a smaller one appears.",
                    "Return the smallest value found.",
                ],
                "code": """class Solution {
    public int findMin(int[] nums) {
        int best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            if (nums[i] < best) best = nums[i];
        }
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Every index is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only the running minimum.",
                "when_to_use": "Say it. They asked for log time, so keep going.",
                "is_optimal": False,
            },
            {
                "name": "Drop the sorted side that cannot hold the min",
                "idea": "Compare the middle with the right end. That tells you which side still contains the cliff.",
                "steps": [
                    "While the range still has more than one index, look at the middle.",
                    "If nums[mid] > nums[high], the rotation cliff is to the right of mid: set low = mid + 1.",
                    "Otherwise the middle sits on the lower ramp, so the min is at mid or left: set high = mid.",
                    "When low meets high, that index holds the minimum.",
                ],
                "code": """class Solution {
    public int findMin(int[] nums) {
        int low = 0, high = nums.length - 1;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] > nums[high]) low = mid + 1;
            else high = mid;
        }
        return nums[low];
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "Each step throws away half the remaining indices.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search ends.",
                "when_to_use": "The version to write. One comparison with the right end.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [4,5,6,7,0,1,2]",
            "columns": ["low", "high", "mid", "nums[mid]", "vs right", "move"],
            "rows": [
                ["0", "6", "3", "7", "7 > 2", "cliff is right, low=4"],
                ["4", "6", "5", "1", "1 <= 2", "min at mid or left, high=5"],
                ["4", "5", "4", "0", "0 <= 1", "high=4"],
                ["4", "4", "-", "-", "-", "nums[4] is 0"],
            ],
            "result": "The minimum is 0.",
        },
        "mistakes": [
            {
                "name": "Comparing mid with the left end",
                "wrong": "Using nums[mid] > nums[low] to decide, which is true on a row that was never rotated.",
                "right": "Compare with the right end. If mid is bigger than high, the min is strictly right of mid.",
            },
            {
                "name": "Returning mid when the row is not rotated",
                "wrong": "Assuming a cliff always exists and skipping the case where nums[0] is already the min.",
                "right": "If nums[mid] <= nums[high] all the way, high slides to 0 and you return nums[0].",
            },
            {
                "name": "Using low <= high and dropping mid",
                "wrong": "Setting high = mid - 1 when nums[mid] could itself be the minimum.",
                "right": "When mid might be the answer, set high = mid, and stop when low == high.",
            },
        ],
        "edge_cases": [
            {"input": "[3,4,5,1,2]", "expected": "1", "why": "The cliff is in the middle."},
            {"input": "[4,5,6,7,0,1,2]", "expected": "0", "why": "The minimum sits after the high ramp."},
            {"input": "[11,13,15,17]", "expected": "11", "why": "No rotation: the first value is the min."},
            {"input": "[2,1]", "expected": "1", "why": "Two values, rotated once."},
            {"input": "[1]", "expected": "1", "why": "A single value."},
        ],
        "interview_script": [
            "I need the smallest value in a sorted array that was rotated, in log time.",
            "I could scan in O(n). That finds the min, but misses the time bound.",
            "I compare the middle with the right end. If mid is bigger, the cliff is to the right of mid.",
            "If not, the minimum is at mid or to its left, so I keep mid in the range.",
            "That is O(log n) time. I will test no rotation, a single value, and [4,5,6,7,0,1,2].",
        ],
        "follow_ups": [
            {
                "question": "The array may contain duplicates.",
                "answer": "When nums[mid] == nums[high], you cannot tell which side holds the cliff. Shrink high by one and keep going, which can become O(n).",
            },
            {
                "question": "Return the index of the minimum, not the value.",
                "answer": "The same loop. Return low instead of nums[low].",
            },
            {
                "question": "Now find a target in this rotated array.",
                "answer": "That is Search in Rotated Sorted Array. Find the sorted half of mid, then keep the half that can hold the target.",
            },
        ],
        "related_slugs": ["lc-33", "lc-162", "lc-704"],
    },
    {
        "slugs": ["lc-162"],
        "pattern": "Binary search on a peak",
        "trigger": "Find an index bigger than both neighbours. Ends of the array count as bigger than the missing side.",
        "summary": (
            "From the middle, walk uphill. If the right neighbour is bigger, a peak sits to the right. "
            "If not, a peak sits at mid or to the left."
        ),
        "approaches": [
            {
                "name": "Check every index",
                "idea": "An index is a peak when it is bigger than the neighbour that exists on each side.",
                "steps": [
                    "For each index i, compare with i-1 when i > 0, and with i+1 when i is not the last.",
                    "A missing neighbour counts as smaller, so the ends can be peaks.",
                    "Return the first index that is a peak. One is guaranteed.",
                ],
                "code": """class Solution {
    public int findPeakElement(int[] nums) {
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            boolean leftOk = i == 0 || nums[i] > nums[i - 1];
            boolean rightOk = i == n - 1 || nums[i] > nums[i + 1];
            if (leftOk && rightOk) return i;
        }
        return 0;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each index is checked once.",
                "space_complexity": "O(1)",
                "space_why": "Only the loop index.",
                "when_to_use": "Fine to mention. They asked for log time, so keep going.",
                "is_optimal": False,
            },
            {
                "name": "Walk uphill in halves",
                "idea": "A peak is guaranteed. If the slope at mid rises to the right, a peak lives on that uphill side.",
                "steps": [
                    "While the range still has more than one index, look at the middle.",
                    "If nums[mid] < nums[mid + 1], the slope rises: set low = mid + 1.",
                    "Otherwise the middle is already downhill or a flat top: set high = mid.",
                    "When low meets high, that index is a peak.",
                ],
                "code": """class Solution {
    public int findPeakElement(int[] nums) {
        int low = 0, high = nums.length - 1;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] < nums[mid + 1]) low = mid + 1;
            else high = mid;
        }
        return low;
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "Each step throws away half the remaining indices. mid is always less than high, so mid+1 is in range.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search ends.",
                "when_to_use": "The version to write. Any peak is accepted, so following the slope is enough.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,2,3,1]",
            "columns": ["low", "high", "mid", "nums[mid]", "right neighbour", "move"],
            "rows": [
                ["0", "3", "1", "2", "3, slope rises", "low=2"],
                ["2", "3", "2", "3", "1, slope falls", "high=2"],
                ["2", "2", "-", "-", "-", "index 2 is a peak"],
            ],
            "result": "The answer is 2, the index of 3.",
        },
        "mistakes": [
            {
                "name": "Reading nums[mid + 1] when mid is the last index",
                "wrong": "Using while (low <= high), so mid can equal high and mid+1 falls off the array.",
                "right": "Use while (low < high). Then mid is always strictly left of high, so mid+1 exists.",
            },
            {
                "name": "Requiring the global maximum",
                "wrong": "Scanning for the largest value, which is O(n).",
                "right": "Any peak is accepted. A local uphill walk in log time is enough.",
            },
            {
                "name": "Treating equals as a peak",
                "wrong": "Stopping when nums[mid] >= nums[mid + 1] on an input that can have equal neighbours.",
                "right": "This problem's neighbours are never equal. Still write a strict < to follow the rising slope.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3,1]", "expected": "2", "why": "The peak sits just before the drop."},
            {"input": "[1]", "expected": "0", "why": "A single value is a peak."},
            {"input": "[1,2]", "expected": "1", "why": "The slope rises to the last index."},
            {"input": "[2,1]", "expected": "0", "why": "The first index is already a peak."},
        ],
        "interview_script": [
            "I need any index that is bigger than both neighbours. The ends count against a missing neighbour.",
            "I could check every index in O(n).",
            "I walk uphill in halves: if the right neighbour is bigger, a peak sits to the right of mid.",
            "If not, a peak sits at mid or to the left, so I keep mid.",
            "That is O(log n) time. I will test one element, a rising pair, and [1,2,3,1].",
        ],
        "follow_ups": [
            {
                "question": "Return the global maximum, not any peak.",
                "answer": "Then you cannot skip a half. Scan once, or the array needs extra structure.",
            },
            {
                "question": "The array is a mountain: it rises, then falls, and you want the top.",
                "answer": "The same uphill walk. There is only one peak, so the answer is unique.",
            },
            {
                "question": "Return every peak index.",
                "answer": "Log time cannot list them all in the worst case. Scan once.",
            },
        ],
        "related_slugs": ["lc-153", "lc-33", "lc-704"],
    },
    {
        "slugs": ["lc-278"],
        "pattern": "Binary search on a yes/no prefix",
        "trigger": "Versions go from good to bad and stay bad. Find the first bad one with as few checks as possible.",
        "summary": (
            "The versions are a row of no, then yes. "
            "If mid is bad, the first bad is at mid or left. If mid is good, the first bad is strictly right of mid."
        ),
        "approaches": [
            {
                "name": "Check from version 1",
                "idea": "Call isBadVersion on 1, then 2, then 3, until the first yes.",
                "steps": [
                    "Store the given bad version so isBadVersion can answer.",
                    "Walk each version i from 1 to n.",
                    "Return the first i for which isBadVersion(i) is true.",
                ],
                "code": """class Solution {
    private int badVersion;

    public int firstBadVersion(int n, int bad) {
        badVersion = bad;
        for (int i = 1; i <= n; i++) {
            if (isBadVersion(i)) return i;
        }
        return n;
    }

    private boolean isBadVersion(int version) {
        return version >= badVersion;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each version is checked until the first bad one, which can be n itself.",
                "space_complexity": "O(1)",
                "space_why": "Only the loop index and the stored bad version.",
                "when_to_use": "Say it. n can be two billion, so do not walk from 1.",
                "is_optimal": False,
            },
            {
                "name": "Binary search the first yes",
                "idea": "All bad versions sit in one suffix. Search for the left edge of that suffix.",
                "steps": [
                    "Store the given bad version so isBadVersion can answer. Set low = 1, high = n.",
                    "While the range still has more than one version, mid = low + (high - low) / 2. Do not add low + high.",
                    "If isBadVersion(mid), the first bad is at mid or left: high = mid.",
                    "If mid is good, the first bad is to the right: low = mid + 1.",
                    "When low meets high, that version is the first bad.",
                ],
                "code": """class Solution {
    private int badVersion;

    public int firstBadVersion(int n, int bad) {
        badVersion = bad;
        int low = 1, high = n;
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
                "time_complexity": "O(log n)",
                "time_why": "Each check throws away half of the remaining versions.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search ends and the stored bad version.",
                "when_to_use": "The version to write. Copy the isBadVersion helper the starter needs.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "n = 5, bad = 4",
            "columns": ["low", "high", "mid", "isBad(mid)", "move"],
            "rows": [
                ["1", "5", "3", "false", "3 is good, low=4"],
                ["4", "5", "4", "true", "first bad at 4 or left, high=4"],
                ["4", "4", "-", "-", "first bad is 4"],
            ],
            "result": "The first bad version is 4.",
        },
        "mistakes": [
            {
                "name": "Overflow in the middle index",
                "wrong": "Using (low + high) / 2 when n is near two billion, so low + high wraps to a negative index.",
                "right": "Use mid = low + (high - low) / 2. The large test n = 2126753390 needs this.",
            },
            {
                "name": "Dropping mid when it might be the first bad",
                "wrong": "Setting high = mid - 1 after isBadVersion(mid) is true.",
                "right": "Mid can be the first bad. Set high = mid, and stop when low == high.",
            },
            {
                "name": "Calling the API on every version after a hit",
                "wrong": "Binary searching to a bad version, then walking left one by one.",
                "right": "Keep shrinking with high = mid. The left edge of the yes-suffix is the answer.",
            },
        ],
        "edge_cases": [
            {"input": "5\n4", "expected": "4", "why": "The first bad sits near the end."},
            {"input": "1\n1", "expected": "1", "why": "The only version is bad."},
            {"input": "2126753390\n1702766719", "expected": "1702766719", "why": "n is huge: overflow and a linear scan both fail."},
            {"input": "3\n1", "expected": "1", "why": "Version 1 is already bad."},
        ],
        "interview_script": [
            "I need the first bad version. Every version after it is bad too, and I should call isBadVersion as little as I can.",
            "I could walk from 1 in O(n) checks, but n can be two billion.",
            "If mid is bad I keep it, because it might be the first. If mid is good I move to mid + 1.",
            "I compute mid as low + (high - low) / 2 so the index cannot overflow.",
            "That is O(log n) calls. I will test n = 1 and a case where the first version is already bad.",
        ],
        "follow_ups": [
            {
                "question": "What if a good version can appear after a bad one?",
                "answer": "The yes-suffix is gone. Binary search cannot find a first bad. You would have to scan.",
            },
            {
                "question": "Minimize the number of API calls.",
                "answer": "That is already this search: one call per halved range, about log2(n) calls.",
            },
            {
                "question": "The API is expensive and you may cache.",
                "answer": "Each mid is new, so a cache does not help this loop. The log bound is the saving.",
            },
        ],
        "related_slugs": ["lc-704", "lc-34", "lc-875"],
    },
    {
        "slugs": ["lc-33"],
        "pattern": "Binary search on a rotated row",
        "trigger": "A sorted row that was rotated, and you must find a value in it fast.",
        "summary": (
            "Cut at the middle: one side is always a sorted ramp. "
            "If the target sits between that ramp's two ends, keep the ramp. If not, keep the other side."
        ),
        "approaches": [
            {
                "name": "Scan every index",
                "idea": "Read left to right until the target appears.",
                "steps": [
                    "Walk each index.",
                    "If the value equals target, return that index.",
                    "If the walk ends, return -1.",
                ],
                "code": """class Solution {
    public int search(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] == target) return i;
        }
        return -1;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Every index may be read.",
                "space_complexity": "O(1)",
                "space_why": "Only the loop index.",
                "when_to_use": "Say it. They asked for log time.",
                "is_optimal": False,
            },
            {
                "name": "Find the cliff, then search one half",
                "idea": "First find the index of the minimum, then binary search the half that can hold the target.",
                "steps": [
                    "Find the rotation index: while low < high, if nums[mid] > nums[high] move low to mid + 1, else high = mid.",
                    "If target sits between nums[pivot] and the last value, search that right piece.",
                    "Otherwise search the left piece [0, pivot).",
                    "A normal binary search on that sorted piece returns the index or -1.",
                ],
                "code": """class Solution {
    public int search(int[] nums, int target) {
        int n = nums.length;
        int low = 0, high = n - 1;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] > nums[high]) low = mid + 1;
            else high = mid;
        }
        int pivot = low;
        if (target >= nums[pivot] && target <= nums[n - 1]) {
            low = pivot;
            high = n - 1;
        } else {
            low = 0;
            high = pivot - 1;
        }
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "Finding the cliff halves the row, then one more search halves a sorted piece.",
                "space_complexity": "O(1)",
                "space_why": "Only the search ends and the pivot index.",
                "when_to_use": "A clear two-phase version. Fine if the one-pass ramp check feels shaky.",
                "is_optimal": False,
            },
            {
                "name": "Keep the sorted ramp that holds the target",
                "idea": "At every mid, one side is a sorted ramp. Keep that ramp only when the target sits on it.",
                "steps": [
                    "While low <= high, look at mid. If it equals target, return mid.",
                    "If nums[low] <= nums[mid], the left side is the sorted ramp.",
                    "If target sits in [nums[low], nums[mid]), keep the left. If not, keep the right.",
                    "If the left is not sorted, the right is the ramp: keep it only when target sits in (nums[mid], nums[high]].",
                    "If the walk ends, return -1.",
                ],
                "code": """class Solution {
    public int search(int[] nums, int target) {
        int low = 0, high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[low] <= nums[mid]) {
                if (target >= nums[low] && target < nums[mid]) high = mid - 1;
                else low = mid + 1;
            } else {
                if (target > nums[mid] && target <= nums[high]) low = mid + 1;
                else high = mid - 1;
            }
        }
        return -1;
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "Each step throws away half the remaining indices.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search ends.",
                "when_to_use": "The version to aim for. One pass, no separate pivot search.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [4,5,6,7,0,1,2], target = 0",
            "columns": ["low", "high", "mid", "ramp", "target on it?", "move"],
            "rows": [
                ["0", "6", "3", "left [4..7]", "0 is not in 4..7", "low=4"],
                ["4", "6", "5", "left [0..1]", "0 is in 0..1", "high=4"],
                ["4", "4", "4", "nums[4]=0", "hit", "return 4"],
            ],
            "result": "The answer is 4. Going left from 7 because 0 < 7 would have been the cliff.",
        },
        "mistakes": [
            {
                "name": "The Cliff Trap",
                "wrong": "Picking a side just because the target is smaller or bigger than nums[mid].",
                "right": "Never pick a side just because the target is smaller or bigger than nums[mid]. First find the sorted half (nums[low] <= nums[mid]?), then check if the target is inside it.",
            },
            {
                "name": "Treating equals on the left as unsorted",
                "wrong": "Using nums[low] < nums[mid], so a two-element row like [3,1] looks unsorted on both sides.",
                "right": "Use nums[low] <= nums[mid]. A single-element left is a sorted ramp.",
            },
            {
                "name": "Including mid in the ramp range twice",
                "wrong": "Keeping left when target <= nums[mid] after you already returned on an equal mid.",
                "right": "After the equal check, the left range is target >= nums[low] && target < nums[mid].",
            },
        ],
        "edge_cases": [
            {"input": "[4,5,6,7,0,1,2]\n0", "expected": "4", "why": "Target sits on the low cliff, not on the high ramp."},
            {"input": "[4,5,6,7,0,1,2]\n3", "expected": "-1", "why": "The value is missing."},
            {"input": "[1]\n0", "expected": "-1", "why": "A single miss."},
            {"input": "[3,1]\n1", "expected": "1", "why": "Two elements: the left ramp is one cell."},
            {"input": "[1]\n1", "expected": "0", "why": "A single hit."},
        ],
        "interview_script": [
            "I need to find target in a sorted array that was rotated, in log time.",
            "I could scan in O(n). That is correct, but too slow.",
            "I never pick a side just because target is smaller or bigger than the middle. One side of mid is always a sorted ramp.",
            "If target sits on that ramp I keep it. If not, I keep the other side.",
            "That is O(log n) time and O(1) space. I will test a missing value, a single element, and a target on the low cliff.",
        ],
        "follow_ups": [
            {
                "question": "The array may contain duplicates.",
                "answer": "When nums[low] == nums[mid] == nums[high], you cannot tell which half is sorted. Step low up or high down by one, which can become O(n).",
            },
            {
                "question": "Return the minimum, not a target.",
                "answer": "Find Minimum in Rotated Sorted Array. Compare mid with the right end and drop the half that cannot hold the cliff.",
            },
            {
                "question": "Find the rotation count.",
                "answer": "The index of the minimum is how many times the row was rotated.",
            },
        ],
        "related_slugs": ["lc-153", "lc-704", "lc-74"],
    },
    {
        "slugs": ["lc-34"],
        "pattern": "Binary search for a range",
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
                "space_why": "Only the two answer indices.",
                "when_to_use": "Fine to mention. Do not code it: the problem asks for log time.",
                "is_optimal": False,
            },
            {
                "name": "Find any hit, then walk out",
                "idea": "Binary search to one copy of target, then step left and right to the ends of the run.",
                "steps": [
                    "Binary search until nums[mid] equals target, or the range is empty.",
                    "If there is no hit, return [-1, -1].",
                    "Walk left while the previous value is still target.",
                    "Walk right while the next value is still target.",
                ],
                "code": """class Solution {
    public int[] searchRange(int[] nums, int target) {
        int low = 0, high = nums.length - 1, hit = -1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) {
                hit = mid;
                break;
            }
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        if (hit < 0) return new int[] {-1, -1};
        int left = hit, right = hit;
        while (left > 0 && nums[left - 1] == target) left--;
        while (right + 1 < nums.length && nums[right + 1] == target) right++;
        return new int[] {left, right};
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "A run of the target as long as the whole array makes the two walks read every index.",
                "space_complexity": "O(1)",
                "space_why": "Only the hit and the two ends.",
                "when_to_use": "A common slip. Mention why it is still linear, then do two bound searches.",
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
                "space_why": "Only the two search pointers.",
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
                "name": "One search, then a linear walk",
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
            {"input": "[5,7,7,8,8,10]\n8", "expected": "[3,4]", "why": "A run of two 8s."},
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
        "related_slugs": ["lc-704", "lc-278", "first-and-last-position"],
    },
    {
        "slugs": ["lc-4"],
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
                "name": "Walk to the middle without storing the merge",
                "idea": "Advance two pointers until you have passed (m+n)/2 values. Remember the last two.",
                "steps": [
                    "i and j start at 0. Repeat until you have taken (m+n)/2 + 1 values.",
                    "Take the smaller of the two heads, or the one that still has values.",
                    "Keep the previous take and the current take.",
                    "Odd length: return the current. Even: average previous and current, using / 2.0.",
                ],
                "code": """class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        int m = nums1.length, n = nums2.length;
        int total = m + n;
        int i = 0, j = 0, prev = 0, cur = 0;
        for (int k = 0; k <= total / 2; k++) {
            prev = cur;
            if (i < m && (j >= n || nums1[i] <= nums2[j])) cur = nums1[i++];
            else cur = nums2[j++];
        }
        if ((total & 1) == 1) return cur;
        return (prev + cur) / 2.0;
    }
}
""",
                "time_complexity": "O(m + n)",
                "time_why": "You still walk to the middle of the combined length.",
                "space_complexity": "O(1)",
                "space_why": "Only the two pointers and the last two values.",
                "when_to_use": "Better space than a full merge. Still linear, so not the log answer.",
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
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
        int m = nums1.length, n = nums2.length;
        int half = (m + n + 1) / 2;
        int low = 0, high = m;
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
                "time_complexity": "O(log(min(m, n)))",
                "time_why": "The search range is the shorter array, halved each step.",
                "space_complexity": "O(1)",
                "space_why": "Only the cut indices and four edge values.",
                "when_to_use": "The version to write. Search on the shorter array so the range is small.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums1 = [1,2], nums2 = [3,4]",
            "columns": ["i", "j", "aLeft", "aRight", "bLeft", "bRight", "ok?"],
            "rows": [
                ["1", "1", "1", "2", "3", "4", "1<=4, 3<=2? no"],
                ["i too small", "lo=2", "-", "-", "-", "-", "lo = i+1 = 2"],
                ["2", "0", "2", "+inf", "-inf", "3", "2<=3 and -inf<=+inf"],
                ["even", "-", "max left=2", "min right=3", "-", "-", "average 2.5"],
            ],
            "result": "The answer is 2.5.",
        },
        "mistakes": [
            {
                "name": "Searching the longer array",
                "wrong": "Binary searching the longer row, so j = half - i can go negative.",
                "right": "Always search on the shorter array. Then j stays inside the longer one.",
            },
            {
                "name": "Integer division of the two middles",
                "wrong": "Returning (left + right) / 2, which truncates 5/2 to 2.",
                "right": "Use `/ 2.0` so the even case can be 2.5.",
            },
            {
                "name": "Reading off the end of a cut",
                "wrong": "Reading a[i-1] when i is 0, or a[i] when i equals the length.",
                "right": "Treat an empty left as Integer.MIN_VALUE and an empty right as Integer.MAX_VALUE.",
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
        "related_slugs": ["merged-median", "lc-23", "lc-295"],
    },
    {
        "slugs": ["lc-704"],
        "pattern": "Binary search",
        "trigger": "A sorted array of distinct values, and you must return the index of a target or -1.",
        "summary": (
            "Look at the middle of the remaining slice: if it is the target, stop. "
            "If the target is smaller, drop the right half. If larger, drop the left half."
        ),
        "approaches": [
            {
                "name": "Scan left to right",
                "idea": "Read each value until the target appears.",
                "steps": [
                    "Walk each index.",
                    "If the value equals target, return that index.",
                    "If the walk ends, return -1.",
                ],
                "code": """class Solution {
    public int search(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] == target) return i;
        }
        return -1;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Every index may be read.",
                "space_complexity": "O(1)",
                "space_why": "Only the loop index.",
                "when_to_use": "Say it. The array is sorted, so a scan wastes that fact.",
                "is_optimal": False,
            },
            {
                "name": "Halve the remaining slice",
                "idea": "The middle tells you which half cannot hold the target.",
                "steps": [
                    "Set the low index to 0 and the high index to n - 1.",
                    "While the range is not empty, mid = low + (high - low) / 2.",
                    "If the middle value equals the target, return that index.",
                    "If nums[mid] is smaller, the target is right: low = mid + 1. If larger, high = mid - 1.",
                    "If the range empties, return -1.",
                ],
                "code": """class Solution {
    public int search(int[] nums, int target) {
        int low = 0, high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "Each step throws away half the remaining indices.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search ends.",
                "when_to_use": "The version to write. This is the template the other problems in this topic build on.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [-1,0,3,5,9,12], target = 9",
            "columns": ["low", "high", "mid", "nums[mid]", "move"],
            "rows": [
                ["0", "5", "2", "3", "3 < 9, so low = 3"],
                ["3", "5", "4", "9", "9 equals target"],
                ["-", "-", "4", "9", "return 4"],
            ],
            "result": "The answer is 4.",
        },
        "mistakes": [
            {
                "name": "Overflow in the middle index",
                "wrong": "Using (low + high) / 2 on huge indices, so the sum wraps negative.",
                "right": "Use low + (high - low) / 2.",
            },
            {
                "name": "while (low < high) and never testing the last cell",
                "wrong": "Stopping when low == high without reading nums[low].",
                "right": "Use while (low <= high) when you return mid on an equal, so the last cell is tested.",
            },
            {
                "name": "Assuming the target is present",
                "wrong": "Returning low at the end even when nums[low] is not the target.",
                "right": "If the loop ends, the value is missing. Return -1.",
            },
        ],
        "edge_cases": [
            {"input": "[-1,0,3,5,9,12]\n9", "expected": "4", "why": "A hit in the right half."},
            {"input": "[-1,0,3,5,9,12]\n2", "expected": "-1", "why": "The value is missing."},
            {"input": "[5]\n5", "expected": "0", "why": "A single hit."},
            {"input": "[5]\n-5", "expected": "-1", "why": "A single miss."},
        ],
        "interview_script": [
            "I need the index of target in a sorted array, or -1 if it is missing.",
            "I could scan left to right in O(n), but they asked for log time.",
            "I look at the middle. If it is smaller than target I drop the left half. If it is larger I drop the right half.",
            "I use low + (high - low) / 2 so the middle index cannot overflow.",
            "That is O(log n) time and O(1) space. I will test missing, a single hit, and the first and last index.",
        ],
        "follow_ups": [
            {
                "question": "Return the insertion index if the target is missing.",
                "answer": "When the loop ends, low is the first index greater than target. That is the insert point.",
            },
            {
                "question": "The array has duplicates, return any hit.",
                "answer": "This loop still works. If you need the first hit, use a lower-bound search instead.",
            },
            {
                "question": "Write it with recursion.",
                "answer": "Same mid check, recurse on one half. Stack depth is O(log n), so the loop is cleaner.",
            },
        ],
        "related_slugs": ["lc-34", "lc-278", "lc-74"],
    },
    {
        "slugs": ["lc-74"],
        "pattern": "Binary search on a flat matrix",
        "trigger": "A matrix where each row is sorted and the first of the next row is bigger than the last of this row.",
        "summary": (
            "The matrix is one sorted row written in wrapping lines. "
            "Treat index i as cell (i / cols, i % cols) and binary search that flat range."
        ),
        "approaches": [
            {
                "name": "Scan every cell",
                "idea": "Read each value until the target appears.",
                "steps": [
                    "Walk each row, then each cell.",
                    "If a cell equals target, return true.",
                    "If the walk ends, return false.",
                ],
                "code": """class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        for (int[] row : matrix) {
            for (int v : row) {
                if (v == target) return true;
            }
        }
        return false;
    }
}
""",
                "time_complexity": "O(m · n)",
                "time_why": "Every cell may be read.",
                "space_complexity": "O(1)",
                "space_why": "Only the loop indices.",
                "when_to_use": "Say it. The matrix is sorted as one list, so a scan wastes that fact.",
                "is_optimal": False,
            },
            {
                "name": "Binary search each row",
                "idea": "Each row is sorted, so run a normal binary search on every row.",
                "steps": [
                    "For each row, set low and high to that row's ends.",
                    "Halve until the target is found or the row is empty.",
                    "Skip a row whose first cell is already bigger than target, or whose last cell is smaller.",
                    "If no row hits, return false.",
                ],
                "code": """class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        for (int[] row : matrix) {
            if (row.length == 0 || target < row[0] || target > row[row.length - 1]) continue;
            int low = 0, high = row.length - 1;
            while (low <= high) {
                int mid = low + (high - low) / 2;
                if (row[mid] == target) return true;
                if (row[mid] < target) low = mid + 1;
                else high = mid - 1;
            }
        }
        return false;
    }
}
""",
                "time_complexity": "O(m log n)",
                "time_why": "Up to m rows, each halved in n columns.",
                "space_complexity": "O(1)",
                "space_why": "Only the search ends for the current row.",
                "when_to_use": "Correct, and useful if only the rows were sorted. Here the next row starts after this one, so you can do better.",
                "is_optimal": False,
            },
            {
                "name": "Treat the matrix as one sorted row",
                "idea": "Index k maps to matrix[k / cols][k % cols]. Binary search k from 0 to m*n - 1.",
                "steps": [
                    "If there are no rows or no columns, return false.",
                    "Set the low index to 0 and the high index to rows * cols - 1.",
                    "The middle index maps to value = matrix[mid / cols][mid % cols].",
                    "If the cell equals the target, return true. If it is smaller, raise low. If larger, lower high.",
                    "If the range empties, return false.",
                ],
                "code": """class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        if (matrix.length == 0 || matrix[0].length == 0) return false;
        int rows = matrix.length, cols = matrix[0].length;
        int low = 0, high = rows * cols - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            int value = matrix[mid / cols][mid % cols];
            if (value == target) return true;
            if (value < target) low = mid + 1;
            else high = mid - 1;
        }
        return false;
    }
}
""",
                "time_complexity": "O(log(m · n))",
                "time_why": "The flat length is m*n, halved each step.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search ends.",
                "when_to_use": "The version to write. One search, because the rows chain into one sorted list.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3",
            "columns": ["low", "high", "mid", "cell", "value", "move"],
            "rows": [
                ["0", "11", "5", "(1,1)", "11", "11 > 3, high=4"],
                ["0", "4", "2", "(0,2)", "5", "5 > 3, high=1"],
                ["0", "1", "0", "(0,0)", "1", "1 < 3, low=1"],
                ["1", "1", "1", "(0,1)", "3", "hit"],
            ],
            "result": "The answer is true.",
        },
        "mistakes": [
            {
                "name": "Using the wrong column count in the map",
                "wrong": "Writing matrix[mid / rows][mid % rows], which picks the wrong cell.",
                "right": "A flat index k is row k / cols and column k % cols.",
            },
            {
                "name": "Binary searching columns of a matrix that only has sorted rows",
                "wrong": "Treating a column as sorted when only this problem's wrap-around rule makes the whole grid one list.",
                "right": "If the next row does not start after this row, flatten is wrong. Then search from the corners instead.",
            },
            {
                "name": "Empty matrix",
                "wrong": "Reading matrix[0].length when there are no rows.",
                "right": "Return false when there are no rows or no columns.",
            },
        ],
        "edge_cases": [
            {"input": "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n3", "expected": "true", "why": "A hit in the first row."},
            {"input": "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n13", "expected": "false", "why": "A miss between 11 and 16."},
            {"input": "[[1]]\n1", "expected": "true", "why": "A single cell hit."},
            {"input": "[[1]]\n0", "expected": "false", "why": "A single cell miss."},
        ],
        "interview_script": [
            "I need to find target in a matrix whose rows are sorted and whose next row starts after the last of this row.",
            "I could scan every cell in O(m n), or binary search each row in O(m log n).",
            "Because the rows chain into one sorted list, I treat index k as cell (k / cols, k % cols).",
            "I binary search k from 0 to m*n - 1, the same as a sorted array.",
            "That is O(log(m n)) time. I will test a miss between two rows, a single cell, and the first and last values.",
        ],
        "follow_ups": [
            {
                "question": "Rows are sorted, but the next row can start smaller.",
                "answer": "Flatten is wrong. Start at the top-right and move left or down, which is O(m + n).",
            },
            {
                "question": "Return the row and column, not a boolean.",
                "answer": "When value equals target, return [mid / cols, mid % cols].",
            },
            {
                "question": "The matrix is empty.",
                "answer": "Check rows == 0 or cols == 0 and return false before reading matrix[0].",
            },
        ],
        "related_slugs": ["lc-704", "lc-34", "lc-33"],
    },
    {
        "slugs": ["lc-875"],
        "pattern": "Binary search on the answer",
        "trigger": "The smallest speed that still finishes in time, where checking one candidate is easy.",
        "summary": (
            "Lay speeds on a dial. Too slow stays too slow below, works stays works above. "
            "Try the middle, throw half the dial away, and close in on the first speed that finishes in h hours."
        ),
        "approaches": [
            {
                "name": "Try every speed",
                "idea": "The answer is between 1 and the biggest pile. Test each speed in order.",
                "steps": [
                    "Find m, the biggest pile. That speed always finishes, one pile per hour at worst.",
                    "For each speed k from 1 to m, add how many hours each pile needs.",
                    "A pile of p bananas at speed k needs (p + k - 1) / k hours, rounded up on its own.",
                    "Return the first k whose total hours is at most h.",
                ],
                "code": """class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int max = 0;
        for (int p : piles) max = Math.max(max, p);
        for (int k = 1; k <= max; k++) {
            if (canFinish(piles, k, h)) return k;
        }
        return max;
    }

    private boolean canFinish(int[] piles, int k, int h) {
        long hours = 0;
        for (int p : piles) {
            hours += (p + (long) k - 1) / k;
            if (hours > h) return false;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n · m)",
                "time_why": "m is the biggest pile. Each guess walks all n piles.",
                "space_complexity": "O(1)",
                "space_why": "Only the hour total.",
                "when_to_use": "Say it. m can be a billion, so do not try every speed.",
                "is_optimal": False,
            },
            {
                "name": "Binary search the speed",
                "idea": "If speed k finishes in time, every faster speed does too. Search for the first that works.",
                "steps": [
                    "Low is 1. High is the biggest pile.",
                    "Try mid = low + (high - low) / 2.",
                    "For each pile p, add (p + mid - 1) / mid hours. Never share an hour across two piles.",
                    "If the total is <= h, mid might still be smaller: high = mid. If not, low = mid + 1.",
                    "When low meets high, that is the smallest speed.",
                ],
                "code": """class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int low = 1, high = 0;
        for (int p : piles) high = Math.max(high, p);
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (canFinish(piles, mid, h)) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    private boolean canFinish(int[] piles, int k, int h) {
        long hours = 0;
        for (int p : piles) {
            hours += (p + (long) k - 1) / k;
            if (hours > h) return false;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n log m)",
                "time_why": "Each guess scans all n piles, and the speed range (1 to m, the biggest pile) is halved each time.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search ends and the hour total.",
                "when_to_use": "The version to write. Same hour check as the slow loop, on a dial instead of every speed.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "piles = [3,6,7,11], h = 8",
            "columns": ["low", "high", "k", "hours", "fit?"],
            "rows": [
                ["1", "11", "6", "1+1+2+2=6", "yes, high=6"],
                ["1", "6", "3", "1+2+3+4=10", "no, low=4"],
                ["4", "6", "5", "1+2+2+3=8", "yes, high=5"],
                ["4", "5", "4", "1+2+2+3=8", "yes, high=4"],
                ["4", "4", "-", "-", "first speed that works is 4"],
            ],
            "result": "The smallest speed is 4.",
        },
        "mistakes": [
            {
                "name": "The Fractional Speed Trap",
                "wrong": "Dividing the sum of all piles by k, as if leftover time on one pile could start the next pile.",
                "right": "Koko never shares an hour between two piles. Round each pile up on its own: (p + k - 1) / k. Never divide the sum of all piles by k.",
            },
            {
                "name": "Using Math.ceil with doubles",
                "wrong": "Writing Math.ceil((double) p / k), which can round the wrong way on huge piles.",
                "right": "Stay in integers: (p + k - 1) / k, and add into a long so the hour total cannot overflow.",
            },
            {
                "name": "Starting low at 0",
                "wrong": "Allowing speed 0, then dividing by k.",
                "right": "Speed is at least 1. Low starts at 1.",
            },
        ],
        "edge_cases": [
            {"input": "[3,6,7,11]\n8", "expected": "4", "why": "The usual case: rounding per pile is what makes 4 work and 3 fail."},
            {"input": "[30,11,23,4,20]\n5", "expected": "30", "why": "h equals the number of piles, so the answer is the biggest pile."},
            {"input": "[30,11,23,4,20]\n6", "expected": "23", "why": "One extra hour lets the 30-pile split, so the answer drops."},
            {"input": "[1]\n1", "expected": "1", "why": "One pile, one hour."},
        ],
        "interview_script": [
            "I need the smallest eating speed that finishes all piles in h hours.",
            "I could try every speed from 1 to the biggest pile. That is O(n m).",
            "I binary search the speed. For a guess I add how many hours each pile needs, rounding up on its own.",
            "I never share an hour across two piles, and I never divide the total bananas by the speed.",
            "That is O(n log m) time. I will test h equal to the number of piles, and a case where rounding changes the answer.",
        ],
        "follow_ups": [
            {
                "question": "h equals the number of piles.",
                "answer": "She has exactly one hour per pile, so the answer is the biggest pile.",
            },
            {
                "question": "She may split an hour across two piles.",
                "answer": "Then hours would be the total bananas divided by k, rounded up once. That is a different problem.",
            },
            {
                "question": "Return the hours used at that speed, not the speed.",
                "answer": "After you know k, run the same per-pile round-up and return the sum.",
            },
        ],
        "related_slugs": ["lc-1011", "lc-278", "lc-704"],
    },
]
