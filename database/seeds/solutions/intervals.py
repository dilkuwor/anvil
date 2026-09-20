"""Interval problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-435"],
        "pattern": "Greedy: earliest end",
        "trigger": "A list of intervals, and you must remove as few as you can so the rest do not overlap.",
        "summary": (
            "Sort by end time. Keep an interval when it starts at or after the last one you kept. "
            "Each keep leaves the most room for later intervals, so the number removed is n minus kept."
        ),
        "approaches": [
            {
                "name": "Keep a table after sorting",
                "idea": "After sorting by start, dp[i] is the most intervals you can keep among the first i + 1, ending at i.",
                "steps": [
                    "Sort the intervals by start.",
                    "Set every dp[i] to 1 (the interval on its own).",
                    "For each i, look at every earlier j that ends at or before i starts, and set dp[i] to max(dp[i], dp[j] + 1).",
                    "The most you can keep is the max of dp. Return n minus that.",
                ],
                "code": """import java.util.*;

class Solution {
    public int eraseOverlapIntervals(int[][] intervals) {
        int n = intervals.length;
        if (n == 0) return 0;
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        int[] dp = new int[n];
        int best = 1;
        for (int i = 0; i < n; i++) {
            dp[i] = 1;
            for (int j = 0; j < i; j++) {
                if (intervals[j][1] <= intervals[i][0]) {
                    dp[i] = Math.max(dp[i], dp[j] + 1);
                }
            }
            best = Math.max(best, dp[i]);
        }
        return n - best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "After the sort, each interval is compared with every earlier one.",
                "space_complexity": "O(n)",
                "space_why": "The dp table holds one value per interval.",
                "when_to_use": "Say it. Then drop the table and keep only the earliest end.",
                "is_optimal": False,
            },
            {
                "name": "Keep the interval that ends first",
                "idea": "The interval that ends soonest leaves the most free time for whatever comes next.",
                "steps": [
                    "Sort the intervals by end time.",
                    "Start kept at 0 and lastEnd at a very small number.",
                    "If this interval starts at or after lastEnd, keep it and set lastEnd to its end.",
                    "Otherwise skip it. Return n minus kept.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(n log n)",
                "time_why": "Sorting by end dominates. The scan is one pass.",
                "space_complexity": "O(1)",
                "space_why": "Sorting is in place. Only kept and lastEnd are stored.",
                "when_to_use": "The version to write. Count what you keep, then subtract from n.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "intervals = [[1,2],[2,3],[3,4],[1,3]]",
            "columns": ["interval", "lastEnd", "starts at or after lastEnd", "kept"],
            "rows": [
                ["[1,2]", "none", "yes, keep", "1"],
                ["[1,3]", "2", "no, 1 < 2, skip", "1"],
                ["[2,3]", "2", "yes, 2 >= 2, keep", "2"],
                ["[3,4]", "3", "yes, keep", "3"],
            ],
            "result": "Three intervals are kept, so 1 is removed.",
        },
        "mistakes": [
            {
                "name": "Sorting by start, then keeping the first",
                "wrong": "Sorting by start and always keeping the next interval that does not overlap the last keep.",
                "right": "A long early interval can block two short ones. Sort by end so you keep the one that frees the line first.",
            },
            {
                "name": "Counting a touch as overlap",
                "wrong": "Skipping when `interval[0] == lastEnd`.",
                "right": "Touching at an endpoint is allowed. Keep when `interval[0] >= lastEnd`.",
            },
            {
                "name": "Returning the keep count",
                "wrong": "Returning `kept` instead of `n - kept`.",
                "right": "The question asks how many to remove, not how many to keep.",
            },
        ],
        "edge_cases": [
            {"input": "[[1,2],[2,3]]", "expected": "0", "why": "They touch at 2, so nothing to remove."},
            {"input": "[[1,2],[1,2],[1,2]]", "expected": "2", "why": "Three copies: keep one, remove two."},
            {"input": "[[1,2],[2,3],[3,4],[1,3]]", "expected": "1", "why": "The usual case: drop [1,3]."},
            {"input": "[[1,100],[1,2],[2,3]]", "expected": "1", "why": "The long interval must go, not the two short ones."},
        ],
        "interview_script": [
            "I must remove as few intervals as I can so the rest do not overlap. Touching at an end is fine.",
            "I could sort and fill a keep-table in O(n²). That works, but it is slow.",
            "The key point: the interval that ends first leaves the most room, so I sort by end and keep greedily.",
            "I skip anything that starts before lastEnd, and I return n minus how many I kept.",
            "That is O(n log n) time. I will test a touch, three copies, and a long interval that blocks two short ones.",
        ],
        "follow_ups": [
            {
                "question": "Return the intervals you keep, not the number removed.",
                "answer": "When you keep one, also append it to a list. Same scan.",
            },
            {
                "question": "Each interval has a value, and you want the maximum total value.",
                "answer": "The earliest-end greedy can fail. Sort by end and binary-search the last keep that fits, then take a dp table.",
            },
            {
                "question": "Points, not intervals: cover them with fewest ranges of length k.",
                "answer": "Sort the points. Place a range that ends as late as it can, then jump to the first point it misses.",
            },
        ],
        "related_slugs": ["lc-56", "lc-57", "lc-253"],
    },
    {
        "slugs": ["lc-56"],
        "pattern": "Sort by start, then sweep",
        "trigger": "A list of ranges (meetings, bookings) in any order, where the overlapping ones must be joined.",
        "summary": (
            "Sort the meetings by start. Then each one can only overlap the latest busy block: "
            "if it starts before that block ends, the block takes the later of the two ends. If not, a new block opens."
        ),
        "approaches": [
            {
                "name": "Merge any overlapping pair",
                "idea": "While two ranges overlap or touch, replace them with one covering range, then sort the result.",
                "steps": [
                    "Copy every interval into a list.",
                    "Scan pairs. If two overlap or touch, write the covering range over the first and drop the second.",
                    "Repeat the scan until a full pass merges nothing.",
                    "Sort the survivors by start and copy them into the answer.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        List<int[]> list = new ArrayList<>();
        for (int[] iv : intervals) {
            list.add(new int[] { iv[0], iv[1] });
        }
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int i = 0; i < list.size() && !changed; i++) {
                for (int j = i + 1; j < list.size(); j++) {
                    int[] a = list.get(i);
                    int[] b = list.get(j);
                    if (a[0] <= b[1] && b[0] <= a[1]) {
                        a[0] = Math.min(a[0], b[0]);
                        a[1] = Math.max(a[1], b[1]);
                        list.remove(j);
                        changed = true;
                        break;
                    }
                }
            }
        }
        list.sort(Comparator.comparingInt(a -> a[0]));
        return list.toArray(new int[0][]);
    }
}
""",
                "time_complexity": "O(n³)",
                "time_why": "Each merge drops one interval, and each attempt may scan every remaining pair.",
                "space_complexity": "O(n)",
                "space_why": "The working list holds one range per remaining block.",
                "when_to_use": "Say it. Do not code it. Sorting first turns this into one pass.",
                "is_optimal": False,
            },
            {
                "name": "The calendar",
                "idea": "After sorting by start, a meeting can only collide with the latest busy block already on the calendar.",
                "steps": [
                    "If the list is empty, return an empty array.",
                    "Sort the meetings by start.",
                    "Let last be a copy of the first meeting.",
                    "For each later meeting cur: if cur starts at or before last ends, set last[1] to max of the two ends.",
                    "If cur starts after last ends, push last onto the answer and open a new block from cur.",
                    "Push the final last onto the answer.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        if (intervals.length == 0) return new int[0][];
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        List<int[]> out = new ArrayList<>();
        int[] last = new int[] { intervals[0][0], intervals[0][1] };
        for (int i = 1; i < intervals.length; i++) {
            int[] cur = intervals[i];
            if (cur[0] <= last[1]) {
                last[1] = Math.max(last[1], cur[1]);
            } else {
                out.add(last);
                last = new int[] { cur[0], cur[1] };
            }
        }
        out.add(last);
        return out.toArray(new int[0][]);
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting by start dominates. Each meeting is then compared with one block.",
                "space_complexity": "O(n)",
                "space_why": "The answer list holds one range per merged block.",
                "when_to_use": "The version to write. Sort, then sweep once.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "intervals = [[1,6],[2,4],[8,10]]",
            "columns": ["cur", "last", "cur starts at or before last ends", "last becomes"],
            "rows": [
                ["[1,6]", "(none)", "open the first block", "[1,6]"],
                ["[2,4]", "[1,6]", "yes, 2 <= 6", "[1,6] (max of 6 and 4)"],
                ["[8,10]", "[1,6]", "no, 8 > 6", "push [1,6], last = [8,10]"],
            ],
            "result": "The covering set is [[1,6],[8,10]].",
        },
        "mistakes": [
            {
                "name": "The Enclosed Interval Trap",
                "wrong": "On overlap, copying `cur[1]` onto `last[1]`, which shortens the block when cur sits inside it.",
                "right": "A meeting can sit inside the block, like [2,4] inside [1,6]. Never copy its end: `last[1] = Math.max(last[1], cur[1])`.",
            },
            {
                "name": "Skipping the sort",
                "wrong": "Sweeping in the given order, so a late-listed early meeting never meets the block it belongs to.",
                "right": "Sort by start first. Then each meeting can only overlap the latest busy block.",
            },
            {
                "name": "Leaving a touch unmerged",
                "wrong": "Merging only when `cur[0] < last[1]`, so [1,4] and [4,5] stay apart.",
                "right": "Touching counts as overlap. Merge when `cur[0] <= last[1]`.",
            },
        ],
        "edge_cases": [
            {"input": "[[1,4],[4,5]]", "expected": "[[1,5]]", "why": "They touch at 4, so they merge."},
            {"input": "[[1,4],[0,4]]", "expected": "[[0,4]]", "why": "Unsorted input: [0,4] must be considered first after the sort."},
            {"input": "[[1,6],[2,4],[8,10]]", "expected": "[[1,6],[8,10]]", "why": "[2,4] sits inside [1,6] (the Enclosed Interval Trap)."},
            {"input": "[[1,3],[2,6],[8,10],[15,18]]", "expected": "[[1,6],[8,10],[15,18]]", "why": "The usual three-block case."},
        ],
        "interview_script": [
            "I am given meetings in any order, and I must join the ones that overlap or touch.",
            "I could keep merging any overlapping pair until none remain. That is O(n²).",
            "The key point: after I sort by start, each meeting can only overlap the latest busy block.",
            "If it starts before that block ends, I stretch the end with max. If not, I open a new block.",
            "That is O(n log n) time and O(n) space. I will test a touch, an unsorted pair, and a meeting inside a block.",
        ],
        "follow_ups": [
            {
                "question": "Also return how many original meetings sit inside each block.",
                "answer": "Keep a count on last. Increment on a merge, push the count when a new block opens.",
            },
            {
                "question": "Meetings arrive one by one in mixed order.",
                "answer": "A sorted list plus binary search still works, or a tree of blocks keyed by start.",
            },
            {
                "question": "Insert one new meeting into an already merged list.",
                "answer": "That is Insert Interval: copy the ones before, merge the overlap, copy the rest.",
            },
        ],
        "related_slugs": ["lc-57", "lc-435", "lc-253"],
    },
    {
        "slugs": ["lc-57"],
        "pattern": "Sweep a sorted interval list",
        "trigger": "A sorted, non-overlapping list of ranges, and you must insert one more range, merging if it overlaps.",
        "summary": (
            "The list is already sorted. Copy every range that ends before the new one starts, "
            "merge every range that overlaps it, then copy the rest."
        ),
        "approaches": [
            {
                "name": "Append, then merge",
                "idea": "Add the new range to the list and run the usual merge-intervals sweep.",
                "steps": [
                    "Copy every old interval into a list and append newInterval.",
                    "Sort the list by start.",
                    "Sweep once: stretch the current end on overlap, or push and open a new block.",
                    "Return the merged list.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        List<int[]> list = new ArrayList<>();
        for (int[] iv : intervals) {
            list.add(new int[] { iv[0], iv[1] });
        }
        list.add(new int[] { newInterval[0], newInterval[1] });
        list.sort(Comparator.comparingInt(a -> a[0]));
        List<int[]> out = new ArrayList<>();
        int[] cur = list.get(0);
        for (int i = 1; i < list.size(); i++) {
            int[] nxt = list.get(i);
            if (nxt[0] <= cur[1]) {
                cur[1] = Math.max(cur[1], nxt[1]);
            } else {
                out.add(cur);
                cur = nxt;
            }
        }
        out.add(cur);
        return out.toArray(new int[0][]);
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "You sort n + 1 ranges even though the original list was already sorted.",
                "space_complexity": "O(n)",
                "space_why": "The working list and the answer both hold the ranges.",
                "when_to_use": "Fine if you already have merge-intervals written. Mention that the extra sort is wasted.",
                "is_optimal": False,
            },
            {
                "name": "Copy, merge, copy",
                "idea": "Walk the sorted list once: the new range eats a consecutive run of overlaps, and nothing else moves.",
                "steps": [
                    "Copy every interval that ends strictly before the new start.",
                    "While the next interval starts at or before the new end, stretch start down and end up.",
                    "Push the merged new range.",
                    "Copy every interval that is still left.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        List<int[]> out = new ArrayList<>();
        int i = 0;
        int n = intervals.length;
        int start = newInterval[0];
        int end = newInterval[1];
        while (i < n && intervals[i][1] < start) {
            out.add(intervals[i++]);
        }
        while (i < n && intervals[i][0] <= end) {
            start = Math.min(start, intervals[i][0]);
            end = Math.max(end, intervals[i][1]);
            i++;
        }
        out.add(new int[] { start, end });
        while (i < n) {
            out.add(intervals[i++]);
        }
        return out.toArray(new int[0][]);
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each old interval is looked at once. No sort.",
                "space_complexity": "O(n)",
                "space_why": "The answer list holds the old ranges plus the merged one.",
                "when_to_use": "The version to write. The input is already sorted and non-overlapping.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "intervals = [[1,3],[6,9]], newInterval = [2,5]",
            "columns": ["interval", "test", "action", "out"],
            "rows": [
                ["[1,3]", "end 3 is not < 2", "overlaps: start=1, end=5", "[]"],
                ["[6,9]", "start 6 is after end 5", "stop merging", "[[1,5]]"],
                ["[6,9]", "still left", "copy", "[[1,5],[6,9]]"],
            ],
            "result": "The result is [[1,5],[6,9]].",
        },
        "mistakes": [
            {
                "name": "Stopping the merge too early",
                "wrong": "Merging only the first overlap, then copying the rest even when they still overlap the new end.",
                "right": "Keep stretching while `intervals[i][0] <= end`. One new range can swallow several old ones.",
            },
            {
                "name": "Using the wrong comparison on the left",
                "wrong": "Copying while `intervals[i][1] <= start`, which eats a range that only touches the new start.",
                "right": "Copy while the old range ends strictly before the new start: `intervals[i][1] < start`.",
            },
            {
                "name": "Forgetting the empty list",
                "wrong": "Reading `intervals[0]` without checking length.",
                "right": "On an empty list the first two loops do nothing, then you push newInterval on its own.",
            },
        ],
        "edge_cases": [
            {"input": "intervals = [], newInterval = [5,7]", "expected": "[[5,7]]", "why": "Insert into an empty list."},
            {"input": "intervals = [[1,3],[6,9]], newInterval = [2,5]", "expected": "[[1,5],[6,9]]", "why": "The new range overlaps the first block."},
            {"input": "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]", "expected": "[[1,2],[3,10],[12,16]]", "why": "One insert swallows three old ranges."},
            {"input": "intervals = [[1,5]], newInterval = [6,8]", "expected": "[[1,5],[6,8]]", "why": "The new range sits after everything."},
        ],
        "interview_script": [
            "I have a sorted, non-overlapping list, and I must insert one more range, merging if it overlaps.",
            "I could append it and run merge-intervals, but I would sort a list that is already sorted. That is O(n log n).",
            "The key point: the new range overlaps a consecutive run. I copy the left, merge the run, copy the right.",
            "I stretch start and end with min and max while the next interval still overlaps.",
            "That is O(n) time. I will test an empty list, an insert that swallows several ranges, and an insert at the end.",
        ],
        "follow_ups": [
            {
                "question": "The original list is not sorted.",
                "answer": "Sort it first, or fall back to merge-intervals after appending. Cost becomes O(n log n).",
            },
            {
                "question": "Delete a range instead of inserting one.",
                "answer": "Copy intervals that sit wholly left or wholly right of the delete range, and clip any partial overlap.",
            },
            {
                "question": "Insert k new ranges, not one.",
                "answer": "If k is small, insert them one by one. If k is large, concat and merge-intervals once.",
            },
        ],
        "related_slugs": ["lc-56", "lc-435", "lc-253"],
    },
]
