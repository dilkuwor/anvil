"""Written solutions for recommended batch 3: lc-252, lc-986, lc-853, lc-703."""

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-252"],
        "pattern": "Sort by start, then sweep",
        "trigger": "Meetings with start and end times, and the question “can one person attend them all?”",
        "summary": (
            "Sort the meetings by start time. Then a meeting can only clash with the one just before it, "
            "so check whether it starts before that one ends. Ending at 5 and starting at 5 is fine."
        ),
        "approaches": [
            {
                "name": "Compare every pair",
                "idea": "Check each meeting against every other meeting for an overlap.",
                "steps": [
                    "Take the first meeting and compare it with each meeting after it.",
                    "Two meetings overlap when each one starts before the other one ends.",
                    "If any pair overlaps, return false.",
                    "If no pair overlaps after all the checks, return true.",
                ],
                "code": """class Solution {
    public boolean canAttendMeetings(int[][] intervals) {
        for (int a = 0; a < intervals.length; a++) {
            for (int b = a + 1; b < intervals.length; b++) {
                boolean overlap = intervals[a][0] < intervals[b][1] && intervals[b][0] < intervals[a][1];
                if (overlap) return false;
            }
        }
        return true;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each of the n meetings is compared with every meeting after it: about n²/2 checks.",
                "space_complexity": "O(1)",
                "space_why": "Only two loop counters, whatever the size of the list.",
                "when_to_use": "Say it first to show you know what an overlap is. Then say why sorting removes most of the checks.",
                "is_optimal": False,
            },
            {
                "name": "Sort by start, check each neighbour",
                "idea": "Once the meetings are in start order, a meeting can only clash with the one just before it.",
                "steps": [
                    "Sort the meetings by their start time.",
                    "Go through the sorted list from the second meeting on.",
                    "If this meeting starts before the previous meeting ends, they clash: return false.",
                    "A start equal to the previous end is back to back, which is allowed.",
                    "If the loop finishes with no clash, return true.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean canAttendMeetings(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        for (int i = 1; i < intervals.length; i++) {
            int start = intervals[i][0];
            int previousEnd = intervals[i - 1][1];
            if (start < previousEnd) return false;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "The sort costs O(n log n). The check after it looks at each meeting once.",
                "space_complexity": "O(n)",
                "space_why": "Java's sort for an array of arrays may borrow extra room for up to half the meetings.",
                "when_to_use": "The answer to give. It is short, and it is the first step of Meeting Rooms II.",
                "is_optimal": True,
            },
            {
                "name": "Line sweep over start and end events",
                "idea": "Turn each meeting into a start event and an end event, and count how many meetings are running.",
                "steps": [
                    "Write down every start as +1 and every end as -1, with its time.",
                    "Sort the events by time. At the same time, put ends before starts.",
                    "Go through the events and keep a running count of meetings in progress.",
                    "If the count ever reaches 2, two meetings overlap: return false.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean canAttendMeetings(int[][] intervals) {
        int[][] events = new int[intervals.length * 2][];
        int e = 0;
        for (int[] meeting : intervals) {
            events[e++] = new int[] {meeting[0], 1};
            events[e++] = new int[] {meeting[1], -1};
        }
        Arrays.sort(events, (a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
        int running = 0;
        for (int[] event : events) {
            running += event[1];
            if (running > 1) return false;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting the 2n events costs O(n log n).",
                "space_complexity": "O(n)",
                "space_why": "The event list holds two entries per meeting.",
                "when_to_use": "The same sweep answers “how many rooms?” in Meeting Rooms II: return the highest count instead.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "intervals = [[5,8],[1,3],[3,5],[8,9],[6,7]]",
            "columns": ["step", "meeting", "previous end", "what happens"],
            "rows": [
                ["sort", "-", "-", "order by start: [1,3] [3,5] [5,8] [6,7] [8,9]"],
                ["1", "[3,5]", "3", "starts at 3, the previous ends at 3: back to back, fine"],
                ["2", "[5,8]", "5", "starts at 5, the previous ends at 5: back to back, fine"],
                ["3", "[6,7]", "8", "starts at 6, before 8: clash"],
            ],
            "result": "[6,7] starts while [5,8] is still running, so the answer is false.",
        },
        "mistakes": [
            {
                "name": "The Back-to-Back Trap",
                "wrong": "Using `start <= previousEnd` as the clash test, so [1,3] and [3,5] count as a clash.",
                "right": "A meeting that ends at 3 has left the room at 3. Clash only when `start < previousEnd`.",
            },
            {
                "name": "Checking without sorting",
                "wrong": "Comparing each meeting with its neighbour in the order they were given.",
                "right": "The input is in any order. Sort by start first, or neighbours in the list are not neighbours in time.",
            },
            {
                "name": "Sorting by end and comparing starts",
                "wrong": "Mixing up which number to sort by and which to compare.",
                "right": "Sort by start, then compare this start with the previous end.",
            },
        ],
        "edge_cases": [
            {"input": "[]", "expected": "true", "why": "No meetings, so nothing can clash."},
            {"input": "[[4,9]]", "expected": "true", "why": "One meeting has no neighbour."},
            {"input": "[[1,5],[5,8]]", "expected": "true", "why": "Back to back is allowed (the Back-to-Back Trap)."},
            {"input": "[[7,10],[2,4]]", "expected": "true", "why": "The input is out of order; only sorting shows they are apart."},
            {"input": "[[0,30],[5,10],[15,20]]", "expected": "false", "why": "One long meeting covers two short ones."},
        ],
        "interview_script": [
            "So I need to say whether one person can attend every meeting, meaning no two overlap.",
            "The obvious way compares every pair of meetings. That is O(n²) time.",
            "The key point: once I sort by start, a meeting can only clash with the one right before it.",
            "So I sort, then check each start against the previous end. That is O(n log n) for the sort.",
            "Ending at 5 and starting at 5 is fine, so I use a strict less-than. I will test an empty list, one meeting, and back-to-back meetings.",
        ],
        "follow_ups": [
            {
                "question": "What is the fewest number of rooms needed so every meeting can happen?",
                "answer": "That is Meeting Rooms II. Sort by start and keep the end times of busy rooms in a min-heap, or count with a line sweep.",
            },
            {
                "question": "Return the first pair of meetings that clash.",
                "answer": "Same loop. When the check fails, return the previous meeting and this one.",
            },
            {
                "question": "What if end times include the last minute, so [1,3] and [3,5] do clash?",
                "answer": "Change the test to `start <= previousEnd`. That one character is the whole difference.",
            },
        ],
        "related_slugs": ["lc-253", "lc-56", "lc-435"],
    },
    {
        "slugs": ["lc-986"],
        "pattern": "Two pointers",
        "trigger": "Two lists of time ranges, each already sorted, and the question “when are both busy?”",
        "summary": (
            "Put one finger on each list. The two ranges share the stretch from the later start to the "
            "earlier end, if that stretch is not empty. Then move the finger whose range ends first."
        ),
        "approaches": [
            {
                "name": "Compare every pair",
                "idea": "Check each range in the first list against each range in the second list.",
                "steps": [
                    "Take a range from the first list and compare it with every range in the second list.",
                    "Two ranges share the stretch from the later start to the earlier end.",
                    "If that start is not after that end, add the stretch to the answer.",
                    "Do the same for every range in the first list.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] intervalIntersection(int[][] firstList, int[][] secondList) {
        List<int[]> shared = new ArrayList<>();
        for (int[] a : firstList) {
            for (int[] b : secondList) {
                int start = Math.max(a[0], b[0]);
                int end = Math.min(a[1], b[1]);
                if (start <= end) shared.add(new int[] {start, end});
            }
        }
        return shared.toArray(new int[0][]);
    }
}
""",
                "time_complexity": "O(m × n)",
                "time_why": "Every one of the m ranges is compared with every one of the n ranges.",
                "space_complexity": "O(m + n)",
                "space_why": "The answer holds at most m + n shared stretches.",
                "when_to_use": "Say it first. Then point out that both lists are sorted, which the pair check ignores.",
                "is_optimal": False,
            },
            {
                "name": "Two pointers, move the one that ends first",
                "idea": "Walk both sorted lists together, the way you merge two sorted lists.",
                "steps": [
                    "Put pointer i on the first list and pointer j on the second list.",
                    "The shared stretch starts at the later of the two starts and ends at the earlier of the two ends.",
                    "If that start is not after that end, add the stretch to the answer.",
                    "Move the pointer whose range ends first. That range cannot meet anything further on.",
                    "Stop when either pointer runs off the end of its list.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(m + n)",
                "time_why": "Every step moves one pointer forward, and each pointer only moves through its own list once.",
                "space_complexity": "O(m + n)",
                "space_why": "Only for the answer. Apart from it, two pointers and two numbers.",
                "when_to_use": "The answer to give. Explain why the range that ends first is the one that can leave.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "firstList = [[3,5],[9,20]], secondList = [[4,5],[7,10],[11,12]]",
            "columns": ["i", "j", "ranges", "shared", "who moves"],
            "rows": [
                ["0", "0", "[3,5] and [4,5]", "[4,5]", "same end: j moves"],
                ["0", "1", "[3,5] and [7,10]", "none (7 > 5)", "[3,5] ends first: i moves"],
                ["1", "1", "[9,20] and [7,10]", "[9,10]", "[7,10] ends first: j moves, [9,20] stays"],
                ["1", "2", "[9,20] and [11,12]", "[11,12]", "[11,12] ends first: j moves, list done"],
            ],
            "result": "[9,20] had to stay put while j moved on twice, and the answer is [[4,5],[9,10],[11,12]].",
        },
        "mistakes": [
            {
                "name": "The Wrong Finger Trap",
                "wrong": "Moving the pointer whose range starts first, or moving both pointers after a match.",
                "right": "Move the one whose range ends first. The other range may still reach into the next one, like [9,20] reaching [11,12].",
            },
            {
                "name": "Dropping single moments",
                "wrong": "Testing `start < end`, so a shared moment like [5,5] is lost.",
                "right": "Both ends are included, so keep the stretch when `start <= end`.",
            },
            {
                "name": "Swapping max and min",
                "wrong": "Taking the earlier start and the later end, which gives the joined range, not the shared one.",
                "right": "Shared means inside both: the later start and the earlier end.",
            },
        ],
        "edge_cases": [
            {"input": "[]\n[]", "expected": "[]", "why": "Both lists empty: the loop never runs."},
            {"input": "[[1,3],[5,9]]\n[]", "expected": "[]", "why": "One list empty means nobody is busy together."},
            {"input": "[[1,2]]\n[[2,3]]", "expected": "[[2,2]]", "why": "Touching ranges share one moment."},
            {"input": "[[1,7]]\n[[3,10]]", "expected": "[[3,7]]", "why": "A plain overlap: later start, earlier end."},
            {"input": "[[3,5],[9,20]]\n[[4,5],[7,10],[11,12],[14,15],[16,20]]", "expected": "[[4,5],[9,10],[11,12],[14,15],[16,20]]", "why": "One long range meets many short ones (the Wrong Finger Trap)."},
        ],
        "interview_script": [
            "So I need every stretch of time that is inside a range from both lists.",
            "The obvious way checks every pair of ranges. That is O(m × n) time.",
            "The key point: both lists are sorted, so I can walk them together with one pointer each.",
            "Two ranges share the later start to the earlier end. Then I move the pointer whose range ends first. That is O(m + n) time.",
            "I will test empty lists, ranges that only touch, and one long range against several short ones.",
        ],
        "follow_ups": [
            {
                "question": "What if the lists were not sorted?",
                "answer": "Sort each one by start first. That adds O(m log m + n log n), and the walk stays the same.",
            },
            {
                "question": "What if there are k people instead of two?",
                "answer": "Find the shared stretches of the first two, then use that result against the third list, and so on.",
            },
            {
                "question": "Return the times when at least one person is busy.",
                "answer": "That is the joined range: put both lists together and merge overlapping ranges, as in Merge Intervals.",
            },
        ],
        "related_slugs": ["lc-56", "lc-57", "lc-88"],
    },
    {
        "slugs": ["lc-853"],
        "pattern": "Monotonic stack",
        "trigger": "Cars on one road that cannot pass each other, and the question “how many groups reach the end?”",
        "summary": (
            "Look at the cars from the finish backwards and work out when each would arrive. A car that would "
            "arrive no later than the fleet in front joins it. Only a later arrival starts a new fleet."
        ),
        "approaches": [
            {
                "name": "Check every car ahead",
                "idea": "A car leads its own fleet only if it would arrive later than every car in front of it.",
                "steps": [
                    "Work out each car's arrival time on an empty road: distance left divided by speed.",
                    "For each car, look at every car in front of it and find the latest arrival time among them.",
                    "If this car would arrive later than all of them, it can never catch up: it starts a new fleet.",
                    "Otherwise it catches someone and joins that fleet. Count the cars that start a fleet.",
                ],
                "code": """class Solution {
    public int carFleet(int target, int[] position, int[] speed) {
        int n = position.length;
        double[] arrival = new double[n];
        for (int i = 0; i < n; i++) arrival[i] = (double) (target - position[i]) / speed[i];
        int fleets = 0;
        for (int i = 0; i < n; i++) {
            double latestAhead = 0;
            for (int j = 0; j < n; j++) {
                if (position[j] > position[i]) latestAhead = Math.max(latestAhead, arrival[j]);
            }
            if (arrival[i] > latestAhead) fleets++;
        }
        return fleets;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "For each of the n cars, the inner loop looks at all n cars again.",
                "space_complexity": "O(n)",
                "space_why": "One arrival time per car.",
                "when_to_use": "Say it to explain the rule: a car joins a fleet when something ahead of it is slower to arrive.",
                "is_optimal": False,
            },
            {
                "name": "Sort by position, stack of arrival times",
                "idea": "Go from the car nearest the finish backwards, keeping the arrival time of each fleet on a stack.",
                "steps": [
                    "Sort the cars by position, the one nearest the finish first.",
                    "Work out each car's arrival time: distance left divided by speed.",
                    "If the stack is empty, or this time is later than the time on top, push it: a new fleet starts.",
                    "Otherwise this car catches the fleet in front and joins it. Push nothing.",
                    "The answer is the number of times left on the stack.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(n log n)",
                "time_why": "Sorting the cars costs O(n log n). After that each car is looked at once.",
                "space_complexity": "O(n)",
                "space_why": "The sorted order and the stack each hold at most n entries.",
                "when_to_use": "The answer to give. Only the top of the stack is ever read, so a single number would also do.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "target = 10, position = [8,6,2], speed = [1,4,5]",
            "columns": ["car at", "arrival", "fleet time on top", "what happens", "stack"],
            "rows": [
                ["8", "2", "none", "first car: a new fleet", "[2]"],
                ["6", "1", "2", "1 is not later than 2: it catches up and joins", "[2]"],
                ["2", "1.6", "2", "1.6 is not later than 2: it joins too", "[2]"],
            ],
            "result": "The car at 2 is compared with 2, not with the car at 6 and its own time 1, so the answer is 1.",
        },
        "mistakes": [
            {
                "name": "The Stuck Car Trap",
                "wrong": "Comparing a car with the car just ahead and its own arrival time.",
                "right": "A car that joined a fleet arrives when the fleet does. Compare with the fleet's time on top of the stack.",
            },
            {
                "name": "Going from the back of the road",
                "wrong": "Sorting by position from smallest to largest and walking forward.",
                "right": "Start with the car nearest the finish. Whether a car is blocked depends only on the cars in front of it.",
            },
            {
                "name": "Whole-number division",
                "wrong": "Computing `(target - position) / speed` with ints, so 1.6 becomes 1.",
                "right": "Cast to double first, or compare the fractions by cross-multiplying.",
            },
            {
                "name": "Counting a tie as two fleets",
                "wrong": "Pushing a new fleet when the arrival time equals the top.",
                "right": "Catching up exactly at the finish still joins the fleet. Push only when the time is strictly later.",
            },
        ],
        "edge_cases": [
            {"input": "10\n[3]\n[3]", "expected": "1", "why": "One car is one fleet."},
            {"input": "10\n[0,5]\n[2,1]", "expected": "1", "why": "Both arrive at time 5: catching up at the line joins the fleet."},
            {"input": "10\n[6,8]\n[3,2]", "expected": "2", "why": "The car behind is never fast enough to catch up."},
            {"input": "10\n[8,6,2]\n[1,4,5]", "expected": "1", "why": "The car at 2 must be compared with the fleet, not the car at 6 (the Stuck Car Trap)."},
            {"input": "12\n[10,8,0,5,3]\n[2,4,1,1,3]", "expected": "3", "why": "The cars are listed out of order, so sorting matters."},
        ],
        "interview_script": [
            "So cars cannot pass, and I need how many groups reach the finish.",
            "The obvious way checks, for every car, all the cars in front of it. That is O(n²) time.",
            "The key point: if I go from the finish backwards, a car only needs the arrival time of the fleet just in front.",
            "So I sort by position, then keep a stack of fleet arrival times and push only a later time. That is O(n log n) for the sort.",
            "I will test one car, two cars that meet exactly at the finish, and a slow car ahead of a fast one.",
        ],
        "follow_ups": [
            {
                "question": "Can you do it without the stack?",
                "answer": "Yes. Keep only the latest fleet time in a variable and count each time it grows. Space for the sort remains.",
            },
            {
                "question": "Can you avoid the sort?",
                "answer": "If `target` is small, put each car's time into an array indexed by position, then read it from the finish backwards: O(target + n).",
            },
            {
                "question": "Return when each fleet arrives.",
                "answer": "Those are exactly the times left on the stack, from bottom to top.",
            },
        ],
        "related_slugs": ["lc-739", "lc-84", "lc-56"],
    },
    {
        "slugs": ["lc-703"],
        "pattern": "Heap / top K",
        "trigger": "Numbers keep arriving, and after each one you must report “the kth largest so far”.",
        "summary": (
            "Keep a min-heap with only k seats. Each new number goes in, and when there is one too many, the "
            "smallest leaves. The top is always the kth largest so far."
        ),
        "approaches": [
            {
                "name": "Keep every number, sort after each add",
                "idea": "Store all the numbers, sort them after every add, and count k from the large end.",
                "steps": [
                    "Keep every number seen so far in a list.",
                    "When a number is added, put it in the list and sort the whole list.",
                    "Count k places from the large end and return that number.",
                ],
                "code": """import java.util.*;

class Solution {
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

class KthLargest {
    private final int k;
    private final List<Integer> all = new ArrayList<>();

    public KthLargest(int k, int[] nums) {
        this.k = k;
        for (int value : nums) all.add(value);
    }

    public int add(int val) {
        all.add(val);
        Collections.sort(all);
        return all.get(all.size() - k);
    }
}
""",
                "time_complexity": "O(n log n) per add",
                "time_why": "Every add sorts all n numbers seen so far, even though only one of them is needed.",
                "space_complexity": "O(n)",
                "space_why": "Every number ever seen stays in the list.",
                "when_to_use": "Say it first. Then point out that numbers below the k largest can never be the answer again.",
                "is_optimal": False,
            },
            {
                "name": "Min-heap with k seats",
                "idea": "Keep only the k largest numbers, with the smallest of them on top.",
                "steps": [
                    "Make a min-heap: a `PriorityQueue` that keeps its smallest number on top.",
                    "In the constructor, add each starting number the same way `add` does, so the heap is trimmed to k.",
                    "On each add, put the number in the heap.",
                    "If the heap now holds more than k numbers, remove the top, which is the smallest.",
                    "Return the top. It is the smallest of the k largest, so it is the kth largest.",
                ],
                "code": """import java.util.*;

class Solution {
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
                "time_complexity": "O(log k) per add",
                "time_why": "The heap never holds more than k + 1 numbers, so adding or removing one takes about log k steps.",
                "space_complexity": "O(k)",
                "space_why": "The heap keeps only k numbers, however many have arrived.",
                "when_to_use": "The answer to give. Say why the top must be the smallest kept number.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "k = 3, nums = [4,5,8,2], then add 3, 5, 10",
            "columns": ["step", "heap after adding", "too many?", "heap after trimming", "returned"],
            "rows": [
                ["start", "2 4 5 8", "yes, 4 > 3", "4 5 8", "-"],
                ["add 3", "3 4 5 8", "yes", "4 5 8", "4"],
                ["add 5", "4 5 5 8", "yes", "5 5 8", "5"],
                ["add 10", "5 5 8 10", "yes", "5 8 10", "5"],
            ],
            "result": "Without the trim at the start the top would be 2, not 4; with it the answers are 4, 5 and 5.",
        },
        "mistakes": [
            {
                "name": "The Overfull Start Trap",
                "wrong": "Putting all starting numbers in the heap without trimming, so the top is the smallest of them.",
                "right": "Trim to k when the heap is built: add the starting numbers through the same add-then-trim step.",
            },
            {
                "name": "A max-heap of everything",
                "wrong": "Keeping every number in a max-heap and removing k - 1 of them to read the answer.",
                "right": "That costs O(k log n) per call and O(n) memory. A min-heap with k seats answers with one look at the top.",
            },
            {
                "name": "Trimming before adding",
                "wrong": "Removing the top when the heap is full, and then adding the new number.",
                "right": "Add first, then trim. A new number smaller than the top must be the one that leaves.",
            },
        ],
        "edge_cases": [
            {"input": "[\"KthLargest\",\"add\"]\n[[1],[5]]", "expected": "[5]", "why": "k is 1 and there are no starting numbers."},
            {"input": "[\"KthLargest\",\"add\",\"add\",\"add\",\"add\",\"add\"]\n[[3,4,5,8,2],[3],[5],[10],[9],[4]]", "expected": "[4,5,5,8,8]", "why": "More starting numbers than k (the Overfull Start Trap)."},
            {"input": "[\"KthLargest\",\"add\",\"add\",\"add\",\"add\"]\n[[4,7,7,7,7,8,3],[2],[10],[9],[9]]", "expected": "[7,7,7,8]", "why": "Equal numbers each take their own seat."},
            {"input": "[\"KthLargest\",\"add\",\"add\",\"add\",\"add\",\"add\"]\n[[2,0],[-1],[1],[-2],[-4],[3]]", "expected": "[-1,0,0,0,1]", "why": "Fewer starting numbers than k, and negative numbers."},
        ],
        "interview_script": [
            "So after each new number I need the kth largest of everything seen so far.",
            "The obvious way keeps every number and sorts after each add. That is O(n log n) per add.",
            "The key point: a number below the k largest can never be the answer again, so I can throw it away.",
            "So I keep a min-heap with at most k numbers. Each add is O(log k), and the top is the answer.",
            "I will test k equal to 1, more starting numbers than k, fewer than k, and repeated numbers.",
        ],
        "follow_ups": [
            {
                "question": "What if numbers can also be removed?",
                "answer": "A heap cannot remove from the middle cheaply. Use a sorted structure such as a `TreeMap` of counts instead.",
            },
            {
                "question": "What if you need the median instead of the kth largest?",
                "answer": "Use two heaps, a max-heap for the lower half and a min-heap for the upper half, as in Find Median from Data Stream.",
            },
            {
                "question": "What if k can change between calls?",
                "answer": "Then the thrown-away numbers may be needed again. Keep everything in a sorted structure, or rebuild the heap when k grows.",
            },
        ],
        "related_slugs": ["lc-215", "lc-295", "lc-1046"],
    },
]
