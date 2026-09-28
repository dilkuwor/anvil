"""Recommended problems, batch 08: a queue built from stacks, the LFU cache, Candy, and adding
without plus. See ``recommended.md`` for why each one was picked.

The two design problems use the same ``process(operations, args)`` driver as the LRU cache: the
starter holds the driver and an empty class to fill in. ``empty()`` is recorded as 1 or 0, and
void operations record nothing.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

DESIGN = "design"
GREEDY = "greedy"
BITS = "bit-manipulation"


def _with_starter(spec: dict, starter: str) -> dict:
    out = dict(spec)
    out["starter_code"] = starter.strip() + "\n"
    return out


_QUEUE_DRIVER = """
import java.util.*;

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
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
"""

_LFU_DRIVER = """
import java.util.*;

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
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
"""


PROBLEMS: list[dict] = [
    _with_starter(
        _p(
            232, "Implement Queue using Stacks", "EASY", DESIGN,
            "process", [("operations", "String[]"), ("args", "int[][]")], "int[]",
            "A queue is a waiting line: the first item that goes in is the first item that comes "
            "out. A stack is a pile of plates: you can only add to the top or take from the top, so "
            "the last item in comes out first. Build a queue using only two stacks.\n\n"
            "- `push(x)` adds `x` to the back of the queue.\n"
            "- `pop()` removes the item at the front of the queue and returns it.\n"
            "- `peek()` returns the item at the front without removing it.\n"
            "- `empty()` returns true if the queue holds nothing.\n\n"
            "Inside `MyQueue` you may only use normal stack moves: push to the top, look at or "
            "take the top, check the size, and check if it is empty. `pop` and `peek` are only "
            "called when the queue is not empty.\n\n"
            "The judge calls `process(operations, args)`. `operations[i]` is the method to call and "
            "`args[i]` holds its arguments (an empty list when there are none). Return the results "
            "of `pop`, `peek` and `empty` in order, with `empty` written as 1 for true and 0 for "
            "false. `push` records nothing.",
            [
                {"input": '["MyQueue","push","push","peek","pop","empty"]\n[[],[1],[2],[],[],[]]',
                 "expected": "[1,1,0]", "hidden": False, "order": 1},
                {"input": '["MyQueue","push","pop","empty"]\n[[],[5],[],[]]',
                 "expected": "[5,1]", "hidden": False, "order": 2},
                {"input": '["MyQueue","empty"]\n[[]]',
                 "expected": "[1]", "hidden": True, "order": 3},
                {"input": '["MyQueue","push","push","pop","push","peek","pop","pop","empty"]\n'
                          "[[],[1],[2],[],[3],[],[],[],[]]",
                 "expected": "[1,2,2,3,1]", "hidden": True, "order": 4},
                {"input": '["MyQueue","push","push","push","push","pop","push","pop","pop","pop","peek","pop","empty"]\n'
                          "[[],[1],[2],[3],[4],[],[5],[],[],[],[],[],[]]",
                 "expected": "[1,2,3,4,5,5,1]", "hidden": True, "order": 5},
            ],
            constraints="1 <= x <= 9\nAt most 100 calls to push, pop, peek and empty\n"
                        "pop and peek are only called on a queue that is not empty",
            input_format="Line 1: operations\nLine 2: arguments per operation",
            output_format="Array of pop, peek and empty results (empty as 1 or 0)",
            time="O(1) average per operation", space="O(n)",
            hints=[
                "Pouring a pile of plates onto a second pile turns the order upside down. The "
                "bottom plate ends up on top.",
                "Keep one pile for new items and one pile for items ready to leave. The top of the "
                "ready pile is always the front of the queue.",
                "Only pour the new pile into the ready pile when the ready pile is empty. Each item "
                "is then poured at most once, so every operation costs O(1) on average.",
            ],
            solution=_QUEUE_DRIVER + r"""
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
            while (!in.isEmpty()) out.push(in.pop());
        }
        return out.peek();
    }

    public boolean empty() {
        return in.isEmpty() && out.isEmpty();
    }
}
""",
        ),
        _QUEUE_DRIVER + """
class MyQueue {
    public MyQueue() {}
    public void push(int x) {}
    public int pop() { return 0; }
    public int peek() { return 0; }
    public boolean empty() { return true; }
}
""",
    ),
    _with_starter(
        _p(
            460, "LFU Cache", "HARD", DESIGN,
            "process", [("operations", "String[]"), ("args", "int[][]")], "int[]",
            "Build a cache that stores at most `capacity` keys. Each key keeps a use count: how "
            "many times it was read with `get` or written with `put`. When the cache is full and a "
            "new key arrives, drop the key with the smallest use count. If several keys share that "
            "smallest count, drop the one that was used longest ago.\n\n"
            "- `LFUCache(capacity)` starts an empty cache.\n"
            "- `get(key)` returns the key's value, or -1 if the key is not stored. A found key "
            "counts as used.\n"
            "- `put(key, value)` stores the value. If the key is already stored, its value is "
            "replaced and it counts as used. A new key starts with a use count of 1, after the "
            "drop if one was needed.\n\n"
            "Both `get` and `put` should take O(1) time on average.\n\n"
            "The judge calls `process(operations, args)`. `operations[i]` is the method to call "
            "and `args[i]` holds its arguments. Return only the results of the `get` calls, in "
            "order.",
            [
                {"input": '["LFUCache","put","put","get","put","get","get","put","get","get","get"]\n'
                          "[[2],[1,1],[2,2],[1],[3,3],[2],[3],[4,4],[1],[3],[4]]",
                 "expected": "[1,-1,3,-1,3,4]", "hidden": False, "order": 1},
                {"input": '["LFUCache","put","get","put","get","get"]\n[[1],[2,1],[2],[3,2],[2],[3]]',
                 "expected": "[1,-1,2]", "hidden": False, "order": 2},
                {"input": '["LFUCache","put","put","get","get","put","get","get","get"]\n'
                          "[[2],[1,1],[2,2],[1],[2],[3,3],[1],[2],[3]]",
                 "expected": "[1,2,-1,2,3]", "hidden": True, "order": 3},
                {"input": '["LFUCache","put","put","put","put","get","get","get"]\n'
                          "[[2],[1,1],[2,2],[1,10],[3,3],[1],[2],[3]]",
                 "expected": "[10,-1,3]", "hidden": True, "order": 4},
                {"input": '["LFUCache","put","put","put","get","get","put","get","get","get","get"]\n'
                          "[[3],[1,1],[2,2],[3,3],[1],[2],[4,4],[3],[4],[1],[2]]",
                 "expected": "[1,2,-1,4,1,2]", "hidden": True, "order": 5},
            ],
            constraints="1 <= capacity <= 10^4\n0 <= key <= 10^5\n0 <= value <= 10^9\n"
                        "At most 2 * 10^5 calls to get and put",
            input_format="Line 1: operations\nLine 2: arguments per operation",
            output_format="Array of get results",
            time="O(1) per get and put", space="O(capacity)",
            hints=[
                "Scanning every key for the smallest use count on each drop is O(capacity). Try to "
                "keep the keys already grouped by their count.",
                "Keep one list of keys for each use count, oldest first. Remember the smallest "
                "count that still has keys.",
                "Use three maps: key to value, key to count, and count to a `LinkedHashSet` of keys. "
                "A use moves the key from set c to set c + 1. A new key resets the smallest count "
                "to 1; the drop takes the first key of the smallest set.",
            ],
            solution=_LFU_DRIVER + r"""
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
        if (!values.containsKey(key)) return -1;
        use(key);
        return values.get(key);
    }

    public void put(int key, int value) {
        if (capacity <= 0) return;
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
        if (count == lowest && shelves.get(count).isEmpty()) lowest++;
        counts.put(key, count + 1);
        shelves.computeIfAbsent(count + 1, c -> new LinkedHashSet<>()).add(key);
    }
}
""",
        ),
        _LFU_DRIVER + """
class LFUCache {
    public LFUCache(int capacity) {}
    public int get(int key) { return -1; }
    public void put(int key, int value) {}
}
""",
    ),
    _p(
        135, "Candy", "HARD", GREEDY,
        "candy", [("ratings", "int[]")], "int",
        "Children stand in a row, and each one has a rating. Give out candy so that every child "
        "gets at least one, and a child with a higher rating than a neighbour standing next to "
        "them gets more candy than that neighbour. Return the smallest total number of candies "
        "that follows both rules.\n\n"
        "Only neighbours are compared. Two neighbours with equal ratings may get any amounts. "
        "`ratings` holds the rating of each child from left to right.",
        [
            {"input": "[1,0,2]", "expected": "5", "hidden": False, "order": 1},
            {"input": "[1,2,2]", "expected": "4", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "1", "hidden": True, "order": 3},
            {"input": "[1,3,4,5,2]", "expected": "11", "hidden": True, "order": 4},
            {"input": "[5,4,3,2,1]", "expected": "15", "hidden": True, "order": 5},
            {"input": "[1,2,87,87,87,2,1]", "expected": "13", "hidden": True, "order": 6},
        ],
        constraints="1 <= ratings.length <= 2 * 10^4\n0 <= ratings[i] <= 2 * 10^4",
        input_format="Line 1: ratings",
        output_format="The smallest total number of candies",
        time="O(n)", space="O(n)",
        examples=[
            {"input": "[1,0,2]", "output": "5",
             "explanation": "Give 2, 1, 2. The middle child has the lowest rating, so it gets the least."},
            {"input": "[1,2,2]", "output": "4",
             "explanation": "Give 1, 2, 1. The last two have equal ratings, so the last child may get just 1."},
        ],
        hints=[
            "Each child has two neighbours to satisfy: the one on the left and the one on the "
            "right. Try handling one side at a time.",
            "Walk left to right and give each child one more than the left neighbour when its "
            "rating is higher. That settles every left-hand rule.",
            "Then walk right to left. When a child beats its right neighbour, it needs at least "
            "the right neighbour's candy plus one: take the larger of that and what it already has.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public int candy(int[] ratings) {
        int n = ratings.length;
        int[] candies = new int[n];
        Arrays.fill(candies, 1);
        for (int i = 1; i < n; i++) {
            if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
        }
        for (int i = n - 2; i >= 0; i--) {
            if (ratings[i] > ratings[i + 1]) candies[i] = Math.max(candies[i], candies[i + 1] + 1);
        }
        int total = 0;
        for (int c : candies) total += c;
        return total;
    }
}
""",
    ),
    _p(
        371, "Sum of Two Integers", "MEDIUM", BITS,
        "getSum", [("a", "int"), ("b", "int")], "int",
        "Add the two whole numbers `a` and `b` and return the sum, but without using the `+` or "
        "`-` operators. You may use bit operators, which work on the 0s and 1s that make up a "
        "number in binary: `&` (AND), `|` (OR), `^` (XOR) and the shifts `<<` and `>>`.\n\n"
        "Negative numbers are stored the usual Java way (two's complement), so the same bit "
        "trick works for them too.",
        [
            {"input": "1\n2", "expected": "3", "hidden": False, "order": 1},
            {"input": "2\n3", "expected": "5", "hidden": False, "order": 2},
            {"input": "0\n0", "expected": "0", "hidden": True, "order": 3},
            {"input": "-1\n1", "expected": "0", "hidden": True, "order": 4},
            {"input": "-12\n-8", "expected": "-20", "hidden": True, "order": 5},
            {"input": "-1000\n999", "expected": "-1", "hidden": True, "order": 6},
        ],
        constraints="-1000 <= a, b <= 1000",
        input_format="Line 1: a\nLine 2: b",
        output_format="The sum a + b",
        time="O(w), w = 32 bits", space="O(1)",
        hints=[
            "Think of adding in binary column by column, the way you add on paper. Two 1s in a "
            "column give 0 and carry 1 into the next column.",
            "XOR adds every column at once but forgets the carries. AND shows the columns where "
            "both numbers have a 1, which are exactly the columns that carry.",
            "Loop: `carry = (a & b) << 1`, then `a = a ^ b`, then `b = carry`. Stop when the "
            "carry is 0; `a` is the sum.",
        ],
        solution=r"""
class Solution {
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
    ),
]
