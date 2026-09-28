"""Recommended problems, batch 08: queue from stacks, LFU cache, Candy, sum without plus. See SOLUTION_GUIDE.md."""

from __future__ import annotations

_QUEUE_DRIVER = """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[][] args) {
        MyQueue queue = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "MyQueue" -> queue = new MyQueue();
                case "push" -> queue.push(args[i][0]);
                case "pop" -> out.add(queue.pop());
                case "peek" -> out.add(queue.peek());
                case "empty" -> out.add(queue.empty() ? 1 : 0);
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}
"""

_LFU_DRIVER = """import java.util.*;

class Solution {
    public int[] process(String[] operations, int[][] args) {
        LFUCache cache = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "LFUCache" -> cache = new LFUCache(args[i][0]);
                case "put" -> cache.put(args[i][0], args[i][1]);
                case "get" -> out.add(cache.get(args[i][0]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) {
            arr[i] = out.get(i);
        }
        return arr;
    }
}
"""

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-232"],
        "pattern": "Design: two stacks",
        "trigger": "A first-in, first-out line, but the only tool you may use is a pile where the last item in comes out first.",
        "summary": (
            "Keep an in pile for new items and an out pile for items ready to leave. Pouring one pile onto the other "
            "turns it upside down, so the oldest item lands on top. Pour only when the out pile is empty."
        ),
        "approaches": [
            {
                "name": "Pour over and back on every pop",
                "idea": "Keep every item in one pile. To reach the bottom item, pour the whole pile onto a helper pile and back again.",
                "steps": [
                    "Push each new item onto the main pile.",
                    "For pop or peek, pour every item from the main pile onto the helper pile.",
                    "The top of the helper pile is now the oldest item. Read it, and remove it for pop.",
                    "Pour everything back onto the main pile so the next push lands in the right place.",
                ],
                "code": _QUEUE_DRIVER + """
class MyQueue {
    private final Deque<Integer> main = new ArrayDeque<>();
    private final Deque<Integer> helper = new ArrayDeque<>();

    public void push(int x) {
        main.push(x);
    }

    public int pop() {
        while (!main.isEmpty()) {
            helper.push(main.pop());
        }
        int front = helper.pop();
        while (!helper.isEmpty()) {
            main.push(helper.pop());
        }
        return front;
    }

    public int peek() {
        while (!main.isEmpty()) {
            helper.push(main.pop());
        }
        int front = helper.peek();
        while (!helper.isEmpty()) {
            main.push(helper.pop());
        }
        return front;
    }

    public boolean empty() {
        return main.isEmpty();
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Every pop and peek moves all n items over and then all of them back.",
                "space_complexity": "O(n)",
                "space_why": "The two piles hold the n items between them.",
                "when_to_use": "Say it first to show why two piles help. Then point out that the pour back is wasted work.",
                "is_optimal": False,
            },
            {
                "name": "In pile and out pile, pour only when out is empty",
                "idea": "Leave poured items in the out pile. They are already in queue order, so the pour back is never needed.",
                "steps": [
                    "Push each new item onto the in pile.",
                    "For pop or peek, look at the out pile first.",
                    "If the out pile is empty, pour the whole in pile onto it. The oldest item is now on top.",
                    "If the out pile still has items, do not pour. Its top is already the front of the line.",
                    "The queue is empty only when both piles are empty.",
                ],
                "code": _QUEUE_DRIVER + """
class MyQueue {
    private final Deque<Integer> in = new ArrayDeque<>();
    private final Deque<Integer> out = new ArrayDeque<>();

    public void push(int x) {
        in.push(x);
    }

    public int pop() {
        peek();
        return out.pop();
    }

    public int peek() {
        if (out.isEmpty()) {
            while (!in.isEmpty()) {
                out.push(in.pop());
            }
        }
        return out.peek();
    }

    public boolean empty() {
        return in.isEmpty() && out.isEmpty();
    }
}
""",
                "time_complexity": "O(1) average",
                "time_why": "Each item is pushed once, poured once and popped once. A single pour can be long, but spread over all calls it is O(1) each.",
                "space_complexity": "O(n)",
                "space_why": "The two piles hold the n items between them.",
                "when_to_use": "The answer to give. Explain why the cost is O(1) on average: every item is poured at most once.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "push 1, push 2, pop, push 3, pop, pop",
            "columns": ["call", "in pile (top last)", "out pile (top last)", "what happens", "returns"],
            "rows": [
                ["push 1", "1", "empty", "1 goes on the in pile", "-"],
                ["push 2", "1 2", "empty", "2 goes on the in pile", "-"],
                ["pop", "empty", "2 1", "out is empty, so pour: 1 lands on top", "1"],
                ["push 3", "3", "2", "3 goes on the in pile; out keeps 2", "-"],
                ["pop", "3", "empty", "out still has 2, so do not pour", "2"],
                ["pop", "empty", "3", "out is empty now, so pour 3 over", "3"],
            ],
            "result": "The items leave as 1, 2, 3, the order they arrived.",
        },
        "mistakes": [
            {
                "name": "The Early Pour Trap",
                "wrong": "Pouring the in pile onto the out pile on every pop, even when the out pile still holds items.",
                "right": "Pour only when the out pile is empty. Pouring onto plates that are still waiting buries the front of the line under newer plates.",
            },
            {
                "name": "Checking only one pile for empty",
                "wrong": "Returning `in.isEmpty()` from `empty()`.",
                "right": "Items can sit in either pile. The queue is empty only when both piles are empty.",
            },
            {
                "name": "Forgetting to pour before peek",
                "wrong": "Pouring in `pop` but reading `out.peek()` straight away in `peek`.",
                "right": "Both calls need the same check. Let `pop` call `peek` first so the pour lives in one place.",
            },
        ],
        "edge_cases": [
            {"input": '["MyQueue","empty"]  [[],[]]', "expected": "[1]", "why": "A new queue is empty."},
            {"input": '["MyQueue","push","pop","empty"]  [[],[5],[],[]]', "expected": "[5,1]", "why": "One item in and out leaves both piles empty."},
            {"input": "push 1, push 2, pop, push 3, peek", "expected": "[1,2]", "why": "Out still holds 2 when 3 arrives. Pouring now would be the Early Pour Trap."},
            {"input": "push 1, push 2, peek, peek, pop", "expected": "[1,1,1]", "why": "Peek must not remove anything, however often it is called."},
        ],
        "interview_script": [
            "I need a first-in, first-out queue built only from two stacks.",
            "The obvious way: I keep everything in one stack and pour it over and back on each pop, which is O(n) per pop.",
            "The key point for me: pouring a stack onto another reverses it, so the oldest item ends on top and can stay there.",
            "So I keep an in stack and an out stack, and pour only when out is empty. Each item moves once, so it is O(1) on average and O(n) space.",
            "I would test an empty queue, a push between two pops, and several peeks in a row.",
        ],
        "follow_ups": [
            {
                "question": "Is every single pop O(1)?",
                "answer": "No. The pop that finds out empty pours all waiting items, which is O(n). Across many calls each item is poured once, so the average is O(1).",
            },
            {
                "question": "Can you build a stack from queues instead?",
                "answer": "Yes. After each push, move every older item from the front of the queue to the back, so the newest item sits at the front.",
            },
            {
                "question": "Why use `ArrayDeque` and not `Stack` in Java?",
                "answer": "`Stack` is an old class with a lock on every call. `ArrayDeque` with push and pop is the usual faster choice.",
            },
        ],
        "related_slugs": ["lc-155", "lc-146", "lc-20"],
    },
    {
        "slugs": ["lc-460"],
        "pattern": "Design: count buckets",
        "trigger": "A store of limited size that throws out the key used the fewest times, with ties going to the key used longest ago.",
        "summary": (
            "Put each key on the shelf for its use count, oldest use at the front. A use moves the key up one shelf. "
            "To make room, drop the front key of the lowest shelf that has keys."
        ),
        "approaches": [
            {
                "name": "Scan every key to find the one to drop",
                "idea": "Store each key's value, use count and time of last use. When the cache is full, look at every key to find the one to drop.",
                "steps": [
                    "Keep a map from each key to its value, its use count and the time it was last used.",
                    "On a get or an update, add one to the count and write down the current time.",
                    "When a new key arrives and the cache is full, look at every key.",
                    "Drop the key with the smallest count. If counts tie, drop the one with the oldest time.",
                ],
                "code": _LFU_DRIVER + """
class LFUCache {
    private final int capacity;
    private final Map<Integer, int[]> entries = new HashMap<>();
    private int clock = 0;

    public LFUCache(int capacity) {
        this.capacity = capacity;
    }

    public int get(int key) {
        int[] entry = entries.get(key);
        if (entry == null) {
            return -1;
        }
        entry[1]++;
        entry[2] = clock++;
        return entry[0];
    }

    public void put(int key, int value) {
        int[] entry = entries.get(key);
        if (entry != null) {
            entry[0] = value;
            entry[1]++;
            entry[2] = clock++;
            return;
        }
        if (entries.size() == capacity) {
            int drop = -1;
            int[] worst = null;
            for (Map.Entry<Integer, int[]> item : entries.entrySet()) {
                int[] e = item.getValue();
                if (worst == null || e[1] < worst[1] || (e[1] == worst[1] && e[2] < worst[2])) {
                    worst = e;
                    drop = item.getKey();
                }
            }
            entries.remove(drop);
        }
        entries.put(key, new int[] {value, 1, clock++});
    }
}
""",
                "time_complexity": "O(capacity)",
                "time_why": "Every drop looks at all the keys in the cache.",
                "space_complexity": "O(capacity)",
                "space_why": "One entry per stored key.",
                "when_to_use": "Say it first to show you understand the rule and its tie-break. Then say the scan is what must go.",
                "is_optimal": False,
            },
            {
                "name": "Count shelves with a lowest-shelf marker",
                "idea": "Group keys by use count in ordered sets, and remember the lowest count that has keys, so the key to drop is always at one known spot.",
                "steps": [
                    "Keep three maps: key to value, key to use count, and use count to a `LinkedHashSet` of keys in order of use.",
                    "To use a key, move it from the set for count c to the end of the set for count c + 1.",
                    "If the key left the lowest shelf and that shelf is now empty, the lowest count goes up by one.",
                    "When the cache is full and a new key arrives, drop the first key in the lowest shelf's set.",
                    "Add the new key to shelf 1 and set the lowest count back to 1.",
                ],
                "code": _LFU_DRIVER + """
class LFUCache {
    private final int capacity;
    private final Map<Integer, Integer> values = new HashMap<>();
    private final Map<Integer, Integer> counts = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> shelves = new HashMap<>();
    private int lowest = 0;

    public LFUCache(int capacity) {
        this.capacity = capacity;
    }

    public int get(int key) {
        if (!values.containsKey(key)) {
            return -1;
        }
        use(key);
        return values.get(key);
    }

    public void put(int key, int value) {
        if (values.containsKey(key)) {
            values.put(key, value);
            use(key);
            return;
        }
        if (values.size() == capacity) {
            int oldest = shelves.get(lowest).iterator().next();
            shelves.get(lowest).remove(oldest);
            values.remove(oldest);
            counts.remove(oldest);
        }
        values.put(key, value);
        counts.put(key, 1);
        shelves.computeIfAbsent(1, c -> new LinkedHashSet<>()).add(key);
        lowest = 1;
    }

    private void use(int key) {
        int count = counts.get(key);
        shelves.get(count).remove(key);
        if (count == lowest && shelves.get(count).isEmpty()) {
            lowest++;
        }
        counts.put(key, count + 1);
        shelves.computeIfAbsent(count + 1, c -> new LinkedHashSet<>()).add(key);
    }
}
""",
                "time_complexity": "O(1)",
                "time_why": "Each call does a fixed number of map and set steps. The key to drop is the first key of one known set.",
                "space_complexity": "O(capacity)",
                "space_why": "Each stored key appears once in each map and in exactly one set.",
                "when_to_use": "The answer to give. Build on the LRU idea: one ordered line per use count instead of one line in total.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "capacity = 2: put(1,1), put(2,2), get(1), put(3,3), get(3), put(4,4)",
            "columns": ["call", "shelf 1 (oldest first)", "shelf 2 (oldest first)", "lowest", "what happens"],
            "rows": [
                ["put(1,1)", "1", "-", "1", "new key on shelf 1"],
                ["put(2,2)", "1 2", "-", "1", "new key on shelf 1"],
                ["get(1)", "2", "1", "1", "1 moves up; returns 1"],
                ["put(3,3)", "3", "1", "1", "full: shelf 1 holds only 2, so 2 leaves"],
                ["get(3)", "-", "1 3", "2", "3 moves up; shelf 1 is empty, lowest becomes 2"],
                ["put(4,4)", "4", "3", "1", "full: 1 and 3 tie on shelf 2; 1 is older, so 1 leaves"],
            ],
            "result": "Key 1 leaves because it tied with key 3 and was used longer ago.",
        },
        "mistakes": [
            {
                "name": "The Tie Trap",
                "wrong": "Dropping any key with the smallest count, for example from a plain `HashSet` with no order.",
                "right": "Two keys with the same smallest count: the one used longest ago leaves. Keep each shelf in order of use, so the oldest sits at the front.",
            },
            {
                "name": "A stale lowest count",
                "wrong": "Never moving `lowest` up when its shelf empties, or not setting it back to 1 for a new key.",
                "right": "Move it up by one when a use empties the lowest shelf. Set it to 1 whenever a new key is added.",
            },
            {
                "name": "Update that does not count as a use",
                "wrong": "Changing the value on a `put` of an existing key without moving the key up a shelf.",
                "right": "A `put` of a stored key is a use, the same as a `get`. Call the same `use` step.",
            },
            {
                "name": "Dropping before checking the key exists",
                "wrong": "Dropping a key when the cache is full, even though the incoming key is already stored.",
                "right": "Handle an existing key first. Only a brand new key needs room.",
            },
        ],
        "edge_cases": [
            {"input": "capacity = 1: put(2,1), get(2), put(3,2), get(2), get(3)", "expected": "[1,-1,2]", "why": "With room for one, each new key pushes the old one out, whatever its count."},
            {"input": "capacity = 2: put(1,1), put(2,2), get(1), get(2), put(3,3), get(1)", "expected": "[1,2,-1]", "why": "Both keys have count 2. Key 1 was used longer ago, so it leaves: the Tie Trap."},
            {"input": "capacity = 2: put(1,1), put(2,2), put(1,10), put(3,3), get(1), get(2)", "expected": "[10,-1]", "why": "Updating key 1 raises its count, so key 2 is the one to drop."},
            {"input": "capacity = 2: put(1,1), get(1), get(1), put(2,2), put(3,3), get(1)", "expected": "[1,1,1]", "why": "The new key 2 leaves, not the old but busy key 1. A new key always starts at count 1."},
        ],
        "interview_script": [
            "I need a cache that drops the least used key, and among ties the one used longest ago.",
            "The obvious way stores a count and a last-used time per key and scans all keys on every drop. That is O(capacity) per put.",
            "The key point: keys only ever move up by one count, so I can keep them grouped by count, each group in order of use.",
            "So I keep a map from count to a `LinkedHashSet` and track the lowest count. Every get and put is O(1) time, O(capacity) space.",
            "I would test capacity one, a tie on the lowest count, and a put that updates a stored key.",
        ],
        "follow_ups": [
            {
                "question": "How is this different from an LRU cache?",
                "answer": "LRU keeps one line ordered by last use. LFU keeps one such line per use count and drops from the lowest count first.",
            },
            {
                "question": "Can you do it without `LinkedHashSet`?",
                "answer": "Yes. Give each count its own two-way linked list with guard nodes, and keep a map from key to its node, as in the LRU cache.",
            },
            {
                "question": "Counts grow forever. What if old heavy use should fade?",
                "answer": "Halve every count now and then, or count only uses inside a recent time window. Real caches do something like this.",
            },
        ],
        "related_slugs": ["lc-146", "lc-895", "lc-380"],
    },
    {
        "slugs": ["lc-135"],
        "pattern": "Greedy: two passes",
        "trigger": "Each item must beat its neighbours on both sides by some rule, and you want the smallest total.",
        "summary": (
            "Walk left to right, giving each child one more than the left neighbour when it is rated higher. "
            "Walk back right to left and do the same for the right neighbour, keeping the larger amount."
        ),
        "approaches": [
            {
                "name": "Sweep and fix until nothing changes",
                "idea": "Start everyone at one candy, then keep sweeping the row and fixing any child who breaks a rule, until a sweep changes nothing.",
                "steps": [
                    "Give every child one candy.",
                    "Go along the row. If a child is rated higher than a neighbour but does not have more candy, give it one more than that neighbour.",
                    "Repeat the whole sweep while the last sweep changed anything.",
                    "Add up the candies.",
                ],
                "code": """import java.util.*;

class Solution {
    public int candy(int[] ratings) {
        int n = ratings.length;
        int[] candies = new int[n];
        Arrays.fill(candies, 1);
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int i = 0; i < n; i++) {
                if (i > 0 && ratings[i] > ratings[i - 1] && candies[i] <= candies[i - 1]) {
                    candies[i] = candies[i - 1] + 1;
                    changed = true;
                }
                if (i < n - 1 && ratings[i] > ratings[i + 1] && candies[i] <= candies[i + 1]) {
                    candies[i] = candies[i + 1] + 1;
                    changed = true;
                }
            }
        }
        int total = 0;
        for (int c : candies) {
            total += c;
        }
        return total;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "A falling row like 5 4 3 2 1 fixes one more child per sweep, so it needs about n sweeps of n children.",
                "space_complexity": "O(n)",
                "space_why": "One candy count per child.",
                "when_to_use": "Say it first to show the two rules. Point out that a long falling slope takes one sweep per child.",
                "is_optimal": False,
            },
            {
                "name": "One walk each way",
                "idea": "Handle the left-neighbour rule in one walk to the right, then the right-neighbour rule in one walk back, keeping the larger amount.",
                "steps": [
                    "Give every child one candy.",
                    "Walk left to right. When a child is rated higher than its left neighbour, give it the neighbour's candy plus one.",
                    "Walk right to left. When a child is rated higher than its right neighbour, it needs the neighbour's candy plus one.",
                    "On that walk back, keep the larger of that amount and what the child already has.",
                    "Add up the candies.",
                ],
                "code": """import java.util.*;

class Solution {
    public int candy(int[] ratings) {
        int n = ratings.length;
        int[] candies = new int[n];
        Arrays.fill(candies, 1);
        for (int i = 1; i < n; i++) {
            if (ratings[i] > ratings[i - 1]) {
                candies[i] = candies[i - 1] + 1;
            }
        }
        for (int i = n - 2; i >= 0; i--) {
            if (ratings[i] > ratings[i + 1]) {
                candies[i] = Math.max(candies[i], candies[i + 1] + 1);
            }
        }
        int total = 0;
        for (int c : candies) {
            total += c;
        }
        return total;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Two walks over the row, one in each direction, plus one walk to add up.",
                "space_complexity": "O(n)",
                "space_why": "One candy count per child.",
                "when_to_use": "The answer to give. Explain that each walk settles one of the two neighbour rules.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "ratings = [1,3,4,5,2]",
            "columns": ["step", "child (rating)", "compare with", "candies", "what happens"],
            "rows": [
                ["start", "-", "-", "1 1 1 1 1", "everyone gets one"],
                ["walk right", "3, 4, 5", "left neighbour", "1 2 3 4 1", "each beats the left, so one more than it"],
                ["walk left", "5", "right neighbour 2", "1 2 3 4 1", "needs 2; it has 4, keep the larger 4"],
                ["walk left", "4, 3, 1", "right neighbour", "1 2 3 4 1", "none beats its right neighbour"],
                ["total", "-", "-", "1+2+3+4+1", "11"],
            ],
            "result": "The answer is 11.",
        },
        "mistakes": [
            {
                "name": "The Overwrite Trap",
                "wrong": "On the walk back, setting the candy to the right neighbour's plus one without comparing.",
                "right": "On the walk back, keep the larger of the two amounts. Overwriting throws away what the first walk earned.",
            },
            {
                "name": "Rewarding equal ratings",
                "wrong": "Giving more candy when a neighbour has the same rating.",
                "right": "Only a strictly higher rating needs more. Equal neighbours may get any amounts, so start them from 1.",
            },
            {
                "name": "Doing both sides in one walk",
                "wrong": "Checking the right neighbour during the left-to-right walk.",
                "right": "The right neighbour's final amount is not known yet on the way right. Settle it on a separate walk back.",
            },
        ],
        "edge_cases": [
            {"input": "[1]", "expected": "1", "why": "One child still gets one candy."},
            {"input": "[1,2,2]", "expected": "4", "why": "Equal neighbours: the last child needs only one."},
            {"input": "[5,4,3,2,1]", "expected": "15", "why": "A falling row: only the walk back finds these."},
            {"input": "[1,3,4,5,2]", "expected": "11", "why": "The peak already has 4. Overwriting it with 2 is the Overwrite Trap."},
            {"input": "[1,2,87,87,87,2,1]", "expected": "13", "why": "A flat top in the middle splits the row into a rise and a fall."},
        ],
        "interview_script": [
            "Every child gets at least one candy, and a child rated higher than a neighbour gets more than that neighbour. I want the smallest total.",
            "The obvious way is to sweep and fix until nothing changes, which is O(n²) on a long falling row.",
            "The key point: each child has a left rule and a right rule, and I can settle them one direction at a time.",
            "So I walk right for the left rule, then walk back for the right rule, keeping the larger amount. That is O(n) time and O(n) space.",
            "I would test one child, equal neighbours, a falling row, and a peak that must keep its larger count.",
        ],
        "follow_ups": [
            {
                "question": "Can you do it with O(1) extra space?",
                "answer": "Yes. Count the lengths of rising and falling slopes as you go and add the candy for each slope with a sum formula, giving the peak the longer side.",
            },
            {
                "question": "What if the children stand in a circle?",
                "answer": "Start the walks at a child with the lowest rating, which can safely hold one candy, and wrap around from there.",
            },
            {
                "question": "Why is this greedy choice safe?",
                "answer": "Each walk gives the least amount its rule allows. Taking the larger of the two least amounts meets both rules and no child can get fewer.",
            },
        ],
        "related_slugs": ["lc-238", "lc-42", "lc-134"],
    },
    {
        "slugs": ["lc-371"],
        "pattern": "Bits: XOR plus carry",
        "trigger": "Add or combine two numbers when plus and minus are not allowed.",
        "summary": (
            "XOR writes every column's digit at once but forgets the carries. AND, moved one step left, is the carry row. "
            "Add the carry the same way until it is empty."
        ),
        "approaches": [
            {
                "name": "Column by column, like on paper",
                "idea": "Write both numbers out as lists of 32 bits and add one column at a time with a carry, the way you add on paper.",
                "steps": [
                    "Write the 32 bits of each number into two arrays, lowest bit first.",
                    "Go through the columns from lowest to highest, keeping a carry bit.",
                    "The sum bit is the XOR of the two bits and the carry.",
                    "The new carry is 1 when at least two of the three bits are 1.",
                    "Put the sum bits back together into a number.",
                ],
                "code": """class Solution {
    public int getSum(int a, int b) {
        int[] x = new int[32];
        int[] y = new int[32];
        for (int i = 0; i < 32; i++) {
            x[i] = (a >>> i) & 1;
            y[i] = (b >>> i) & 1;
        }
        int carry = 0;
        int result = 0;
        for (int i = 0; i < 32; i++) {
            int bit = x[i] ^ y[i] ^ carry;
            carry = (x[i] & y[i]) | (carry & (x[i] ^ y[i]));
            result |= bit << i;
        }
        return result;
    }
}
""",
                "time_complexity": "O(w)",
                "time_why": "It visits all w = 32 columns, every time, even for 1 + 2.",
                "space_complexity": "O(w)",
                "space_why": "Two arrays of w = 32 bits.",
                "when_to_use": "Say it first: it shows that addition is XOR plus a carry. Then do every column at once.",
                "is_optimal": False,
            },
            {
                "name": "XOR for the digits, AND for the carries",
                "idea": "Handle all columns in one go: XOR gives the digits without carries, and AND moved one step left gives the carries to add next.",
                "steps": [
                    "While b is not zero, repeat the next three steps.",
                    "Work out the carry first: the columns where both have a 1, moved one step to the left.",
                    "Set a to a XOR b: the sum of every column with the carries left out.",
                    "Set b to the carry. When no carry is left, a holds the sum.",
                ],
                "code": """class Solution {
    public int getSum(int a, int b) {
        while (b != 0) {
            int carry = (a & b) << 1;
            a = a ^ b;
            b = carry;
        }
        return a;
    }
}
""",
                "time_complexity": "O(w)",
                "time_why": "Each round pushes the carry at least one column left, so there are at most w = 32 rounds, and often only one or two.",
                "space_complexity": "O(1)",
                "space_why": "Only a, b and the carry.",
                "when_to_use": "The answer to give. Say why it stops: the carry moves left every round and falls off after 32 columns.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "a = 9 (1001), b = 11 (1011)",
            "columns": ["round", "a", "b", "carry = (a & b) << 1", "a ^ b"],
            "rows": [
                ["1", "01001", "01011", "10010", "00010"],
                ["2", "00010", "10010", "00100", "10000"],
                ["3", "10000", "00100", "00000", "10100"],
                ["done", "10100", "00000", "-", "-"],
            ],
            "result": "b is zero, so a = 10100 in binary, which is 20. The answer is 20.",
        },
        "mistakes": [
            {
                "name": "The Order Trap",
                "wrong": "Writing `a = a ^ b` first and then `carry = (a & b) << 1` with the new `a`.",
                "right": "Work out the carry from the old a before a changes. Compute (a & b) << 1 first, then a = a ^ b.",
            },
            {
                "name": "Stopping after one round",
                "wrong": "Returning `a ^ b` straight away.",
                "right": "XOR forgets the carries. Keep adding the carry until it is zero.",
            },
            {
                "name": "Worrying that negatives loop forever",
                "wrong": "Adding special code for negative numbers.",
                "right": "Java ints wrap at 32 bits. The carry moves left each round and falls off the top, so the loop always stops.",
            },
        ],
        "edge_cases": [
            {"input": "a = 0, b = 0", "expected": "0", "why": "The loop does not run."},
            {"input": "a = 1, b = 2", "expected": "3", "why": "No shared 1s, so no carry: one round."},
            {"input": "a = -1, b = 1", "expected": "0", "why": "The carry walks all the way up and falls off the top bit."},
            {"input": "a = -12, b = -8", "expected": "-20", "why": "Two negatives still add correctly in two's complement."},
            {"input": "a = 9, b = 11", "expected": "20", "why": "Shared 1s create a carry, so the order of the two lines matters here."},
        ],
        "interview_script": [
            "I need a + b without using plus or minus, so I will work on the bits.",
            "The obvious way adds column by column with a carry, like on paper. That is O(w) time with w = 32, and O(w) space if I write the bits out.",
            "The key point: XOR is addition without carries, and AND shifted left by one is exactly the carries.",
            "So I loop: carry from the old a and b, then a becomes a XOR b, then b becomes the carry. That is O(w) rounds at most and O(1) space.",
            "I would test zero, a pair with no carry, minus one plus one, and two negatives.",
        ],
        "follow_ups": [
            {
                "question": "How would you subtract without minus?",
                "answer": "Add the negative: `-b` is `~b` plus one, and that plus one is itself done with the same loop.",
            },
            {
                "question": "Would this loop stop in Python?",
                "answer": "Not on its own, because Python numbers do not wrap. You mask with `0xFFFFFFFF` each round and fix the sign at the end.",
            },
            {
                "question": "What is the most rounds it can take?",
                "answer": "32 for Java ints, as in -1 + 1, where the carry walks up every column before falling off.",
            },
        ],
        "related_slugs": ["lc-136", "lc-338", "lc-191"],
    },
]
