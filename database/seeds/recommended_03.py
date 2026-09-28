"""Recommended problems, batch 3: two interval problems, a stack problem and a heap design problem.

Each one sits beside a catalog problem it prepares for (see ``recommended.md``):

* 252 Meeting Rooms comes before 253 Meeting Rooms II.
* 986 Interval List Intersections sits beside 56 Merge Intervals.
* 853 Car Fleet sits beside 739 Daily Temperatures.
* 703 Kth Largest Element in a Stream comes before 295 Find Median from Data Stream.

703 is a design problem. Like 348 and 146, it is driven by a ``process`` method that replays the
operations. The first row of ``args`` is ``k`` followed by the starting numbers.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

INTERVALS = "intervals"
STACK = "stack"
HEAP = "heap"


def _with_starter(spec: dict, starter: str) -> dict:
    out = dict(spec)
    out["starter_code"] = starter.strip() + "\n"
    return out


_KTH_LARGEST_DRIVER = """
import java.util.*;

class Solution {
    // The judge calls this. It replays the operations and collects what each add returns.
    // The first row of args is k, then the starting numbers. You do not need to change it.
    public int[] process(String[] operations, int[][] args) {
        KthLargest tracker = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "KthLargest" -> tracker = new KthLargest(args[i][0], Arrays.copyOfRange(args[i], 1, args[i].length));
                case "add" -> out.add(tracker.add(args[i][0]));
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
        252, "Meeting Rooms", "EASY", INTERVALS,
        "canAttendMeetings", [("intervals", "int[][]")], "boolean",
        "You have a list of meetings. Each one is a pair `[start, end]`. One person wants to go "
        "to all of them. Two meetings overlap when one starts before the other has ended. Return "
        "`true` if no two meetings overlap, so the person can attend every one.\n\n"
        "A meeting uses the time from `start` up to, but not including, `end`. So a meeting that "
        "ends at 5 and one that starts at 5 do not overlap.\n\n"
        "The meetings arrive in any order. The list may be empty.",
        [
            {"input": "[[0,30],[5,10],[15,20]]", "expected": "false", "hidden": False, "order": 1},
            {"input": "[[7,10],[2,4]]", "expected": "true", "hidden": False, "order": 2},
            {"input": "[]", "expected": "true", "hidden": True, "order": 3},
            {"input": "[[1,5],[5,8]]", "expected": "true", "hidden": True, "order": 4},
            {"input": "[[5,8],[1,3],[3,5],[8,9],[6,7]]", "expected": "false", "hidden": True, "order": 5},
            {"input": "[[4,9]]", "expected": "true", "hidden": True, "order": 6},
        ],
        constraints="0 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= start < end <= 10^6",
        input_format="A JSON array of [start, end] pairs",
        output_format="true or false",
        time="O(n log n)", space="O(n)",
        hints=[
            "Comparing every meeting with every other meeting works, but it costs O(n²). "
            "Is there an order in which only neighbours can clash?",
            "Put the meetings in order of their start time. Then a meeting can only clash with "
            "the meeting just before it.",
            "Sort by start. For each meeting after the first, if its start is smaller than the "
            "previous meeting's end, return false. Equal is fine: back to back is allowed.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public boolean canAttendMeetings(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] < intervals[i - 1][1]) return false;
        }
        return true;
    }
}
""",
    ),
    _p(
        986, "Interval List Intersections", "MEDIUM", INTERVALS,
        "intervalIntersection", [("firstList", "int[][]"), ("secondList", "int[][]")], "int[][]",
        "Two people each have a list of busy times. Each busy time is a pair `[start, end]`, "
        "and it includes both ends. Return every stretch of time when both people are busy at "
        "once. A stretch can be a single moment, like `[5,5]`.\n\n"
        "Each list is already sorted by time, and the pairs inside one list never overlap each "
        "other.\n\n"
        "Return the shared stretches in order of time. Either list may be empty; then the answer "
        "is empty.",
        [
            {"input": "[[0,2],[5,10],[13,23],[24,25]]\n[[1,5],[8,12],[15,24],[25,26]]",
             "expected": "[[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]]", "hidden": False, "order": 1},
            {"input": "[[1,3],[5,9]]\n[]", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[]\n[]", "expected": "[]", "hidden": True, "order": 3},
            {"input": "[[1,7]]\n[[3,10]]", "expected": "[[3,7]]", "hidden": True, "order": 4},
            {"input": "[[3,5],[9,20]]\n[[4,5],[7,10],[11,12],[14,15],[16,20]]",
             "expected": "[[4,5],[9,10],[11,12],[14,15],[16,20]]", "hidden": True, "order": 5},
            {"input": "[[1,2]]\n[[2,3]]", "expected": "[[2,2]]", "hidden": True, "order": 6},
        ],
        constraints=(
            "0 <= firstList.length, secondList.length <= 1000\n"
            "0 <= start <= end <= 10^9\n"
            "Each list is sorted and its pairs do not overlap"
        ),
        input_format="Line 1: firstList\nLine 2: secondList",
        output_format="A JSON array of [start, end] pairs",
        time="O(m + n)", space="O(m + n)",
        hints=[
            "Comparing every pair from the two lists works, but both lists are already sorted. "
            "Can you walk through them together, the way you merge two sorted lists?",
            "Two pairs share the stretch from the later start to the earlier end. If that start "
            "is after that end, they share nothing.",
            "Keep one pointer in each list. Record the shared stretch if there is one, then move "
            "the pointer whose pair ends first: that pair cannot meet anything further on.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public int[][] intervalIntersection(int[][] firstList, int[][] secondList) {
        List<int[]> shared = new ArrayList<>();
        int i = 0, j = 0;
        while (i < firstList.length && j < secondList.length) {
            int start = Math.max(firstList[i][0], secondList[j][0]);
            int end = Math.min(firstList[i][1], secondList[j][1]);
            if (start <= end) shared.add(new int[] {start, end});
            if (firstList[i][1] < secondList[j][1]) i++;
            else j++;
        }
        return shared.toArray(new int[0][]);
    }
}
""",
    ),
    _p(
        853, "Car Fleet", "MEDIUM", STACK,
        "carFleet", [("target", "int"), ("position", "int[]"), ("speed", "int[]")], "int",
        "Cars drive along a one-lane road towards the finish at mile `target`. Car `i` starts at "
        "mile `position[i]` and drives at `speed[i]` miles per hour. A car can never pass the car "
        "in front. When it catches up, it slows down and they drive on together. A group that "
        "drives together is called a fleet. Return how many fleets reach the finish.\n\n"
        "A single car on its own is a fleet too. A car that catches up exactly at the finish "
        "line joins that fleet.\n\n"
        "All starting positions are different and are before the finish. The cars are listed "
        "in any order.",
        [
            {"input": "12\n[10,8,0,5,3]\n[2,4,1,1,3]", "expected": "3", "hidden": False, "order": 1},
            {"input": "10\n[3]\n[3]", "expected": "1", "hidden": False, "order": 2},
            {"input": "100\n[0,2,4]\n[4,2,1]", "expected": "1", "hidden": True, "order": 3},
            {"input": "10\n[6,8]\n[3,2]", "expected": "2", "hidden": True, "order": 4},
            {"input": "10\n[0,5]\n[2,1]", "expected": "1", "hidden": True, "order": 5},
            {"input": "10\n[8,6,2]\n[1,4,5]", "expected": "1", "hidden": True, "order": 6},
        ],
        constraints=(
            "1 <= position.length == speed.length <= 10^5\n"
            "0 <= position[i] < target <= 10^6\n"
            "0 < speed[i] <= 10^6\n"
            "All positions are different"
        ),
        input_format="Line 1: target\nLine 2: position\nLine 3: speed",
        output_format="An integer fleet count",
        time="O(n log n)", space="O(n)",
        hints=[
            "Work out when each car would reach the finish if the road were empty: "
            "`(target - position) / speed`.",
            "Look at the cars from the one nearest the finish backwards. A car behind that would "
            "arrive no later than the fleet in front catches it, and joins it.",
            "Sort by position, nearest the finish first. Keep a stack of fleet arrival times. "
            "Push a car's time only when it is later than the time on top; the answer is the "
            "stack's size.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public int carFleet(int target, int[] position, int[] speed) {
        int n = position.length;
        Integer[] order = new Integer[n];
        for (int i = 0; i < n; i++) order[i] = i;
        Arrays.sort(order, (a, b) -> Integer.compare(position[b], position[a]));
        Deque<Double> fleets = new ArrayDeque<>();
        for (int car : order) {
            double arrival = (double) (target - position[car]) / speed[car];
            if (fleets.isEmpty() || arrival > fleets.peek()) fleets.push(arrival);
        }
        return fleets.size();
    }
}
""",
    ),
    _with_starter(
        _p(
            703, "Kth Largest Element in a Stream", "EASY", HEAP,
            "process", [("operations", "String[]"), ("args", "int[][]")], "int[]",
            "Numbers arrive one at a time. After each new number, report the `k`th largest number "
            "seen so far. The largest is the 1st largest, the next one down is the 2nd, and so on. "
            "Equal numbers each count as their own place.\n\n"
            "Write the class `KthLargest`:\n\n"
            "- `KthLargest(k, nums)` starts with `k` and a list of starting numbers `nums`.\n"
            "- `add(val)` takes one new number and returns the `k`th largest number so far.\n\n"
            "There are always at least `k` numbers when `add` returns. Operations arrive as a "
            "list. The first row of `args` is `k` followed by the starting numbers; each later row "
            "is the number for that `add`. Return the results of the `add` calls.",
            [
                {"input": '["KthLargest","add","add","add","add","add"]\n[[3,4,5,8,2],[3],[5],[10],[9],[4]]',
                 "expected": "[4,5,5,8,8]", "hidden": False, "order": 1},
                {"input": '["KthLargest","add","add","add","add"]\n[[4,7,7,7,7,8,3],[2],[10],[9],[9]]',
                 "expected": "[7,7,7,8]", "hidden": False, "order": 2},
                {"input": '["KthLargest","add"]\n[[1],[5]]', "expected": "[5]", "hidden": True, "order": 3},
                {"input": '["KthLargest","add","add","add","add","add"]\n[[1],[-3],[-2],[-4],[0],[4]]',
                 "expected": "[-3,-2,-2,0,4]", "hidden": True, "order": 4},
                {"input": '["KthLargest","add","add","add","add","add"]\n[[2,0],[-1],[1],[-2],[-4],[3]]',
                 "expected": "[-1,0,0,0,1]", "hidden": True, "order": 5},
            ],
            constraints=(
                "1 <= k <= 10^4\n0 <= nums.length <= 10^4\n-10^4 <= nums[i], val <= 10^4\n"
                "At most 10^4 calls to add\nThere are at least k numbers when add returns"
            ),
            input_format="Line 1: operations\nLine 2: arguments per operation (the first row is k, then nums)",
            output_format="Array of add results",
            time="O(log k) per add", space="O(k)",
            hints=[
                "Sorting every number again after each add costs O(n log n) per call. Numbers that "
                "are not among the k largest can never become the answer again.",
                "Keep only the k largest numbers seen so far. The answer is the smallest of those k.",
                "Use a min-heap (`PriorityQueue`) with at most k numbers. On add, push the number; "
                "if the heap holds more than k, remove the top. Trim the starting numbers the same "
                "way. The top is the answer.",
            ],
            solution=_KTH_LARGEST_DRIVER + r"""
class KthLargest {
    private final int k;
    private final PriorityQueue<Integer> pile = new PriorityQueue<>();

    public KthLargest(int k, int[] nums) {
        this.k = k;
        for (int value : nums) add(value);
    }

    public int add(int val) {
        pile.add(val);
        if (pile.size() > k) pile.poll();
        return pile.peek();
    }
}
""",
        ),
        _KTH_LARGEST_DRIVER + """
class KthLargest {
    public KthLargest(int k, int[] nums) {

    }

    public int add(int val) {
        return 0;
    }
}
""",
    ),
]
