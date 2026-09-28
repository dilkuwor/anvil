"""Recommended problems, batch 4: the missing steps in the linked-list ladder, plus one cycle on a number.

* 876 finds the middle with a slow and a fast pointer (palindrome list and reorder list assume it).
* 92 turns round one span of a list, the step before k-group reversal.
* 142 returns where a cycle starts. A cycle cannot be written as a plain array, so it is adapted the
  same way as lc-141: the judge passes the values and ``pos``, a helper builds the list, and the
  learner's ``findCycleStart`` returns a node, which the helper turns back into its index.
* 202 uses the same cycle idea on a number instead of a list.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

LINKED = "linked-list"
MATH = "math"


def _with_starter(spec: dict, starter: str) -> dict:
    out = dict(spec)
    out["starter_code"] = starter.strip() + "\n"
    return out


# The judge-facing part of lc-142. The learner fills in `findCycleStart`.
CYCLE_DRIVER = """class Solution {
    // The judge calls this. It builds the list (the last node links back to index pos,
    // or to nothing when pos is -1), calls your findCycleStart(), and turns the node you
    // return into its index. You do not need to change it.
    public int detectCycle(int[] values, int pos) {
        ListNode head = build(values, pos);
        ListNode start = findCycleStart(head);
        int index = 0;
        for (ListNode node = head; node != null && index < values.length; node = node.next, index++) {
            if (node == start) return index;
        }
        return -1;
    }

    private ListNode build(int[] values, int pos) {
        if (values.length == 0) return null;
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        ListNode cycle = null;
        for (int i = 0; i < values.length; i++) {
            cur.next = new ListNode(values[i]);
            cur = cur.next;
            if (i == pos) cycle = cur;
        }
        cur.next = cycle;
        return dummy.next;
    }
"""

CYCLE_STARTER = CYCLE_DRIVER + """
    public ListNode findCycleStart(ListNode head) {
        return null;
    }
}
"""

CYCLE_SOLUTION = CYCLE_DRIVER + """
    public ListNode findCycleStart(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                ListNode friend = head;
                while (friend != slow) {
                    friend = friend.next;
                    slow = slow.next;
                }
                return friend;
            }
        }
        return null;
    }
}
"""


PROBLEMS: list[dict] = [
    _p(
        876, "Middle of the Linked List", "EASY", LINKED,
        "middleNode", [("head", "ListNode")], "ListNode",
        "A linked list is a chain of nodes, where each node holds a value and an arrow to the next "
        "node. You only get the first node. Find the node in the middle of the chain. When the "
        "chain has an even number of nodes there are two middle nodes: return the second one.\n\n"
        "Return the middle node itself. The judge prints the list that starts at that node, so for "
        "`[1,2,3,4,5]` the answer shows as `[3,4,5]`.",
        [
            {"input": "[1,2,3,4,5]", "expected": "[3,4,5]", "hidden": False, "order": 1},
            {"input": "[1,2,3,4,5,6]", "expected": "[4,5,6]", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "[1]", "hidden": False, "order": 3},
            {"input": "[1,2]", "expected": "[2]", "hidden": True, "order": 4},
            {"input": "[5,4,3,2,1,0,9]", "expected": "[2,1,0,9]", "hidden": True, "order": 5},
        ],
        constraints="1 <= number of nodes <= 100\n1 <= Node.val <= 100",
        input_format="The list as an array of node values",
        output_format="The list that starts at the middle node",
        hints=[
            "You could count the nodes first and then walk again. Can you find the middle in a single walk?",
            "Send two pointers from the head at different speeds. When the faster one reaches the end, where is the slower one?",
            "Move `slow` one node and `fast` two nodes while `fast != null && fast.next != null`. When the loop stops, `slow` is the middle, and the second middle on an even list.",
        ],
        solution="""
class Solution {
    public ListNode middleNode(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }
}
""",
        time="O(n)", space="O(1)",
    ),
    _p(
        92, "Reverse Linked List II", "MEDIUM", LINKED,
        "reverseBetween", [("head", "ListNode"), ("left", "int"), ("right", "int")], "ListNode",
        "A linked list is a chain of nodes, each with an arrow to the next one. Turn round only one "
        "part of the chain: the nodes from position `left` to position `right`, counting the first "
        "node as position 1. Everything before and after that part stays where it is.\n\n"
        "`1 <= left <= right <= n`, where `n` is the number of nodes. Return the head of the changed "
        "list. The head can change when `left` is 1.",
        [
            {"input": "[1,2,3,4,5]\n2\n4", "expected": "[1,4,3,2,5]", "hidden": False, "order": 1},
            {"input": "[5]\n1\n1", "expected": "[5]", "hidden": False, "order": 2},
            {"input": "[3,5]\n1\n2", "expected": "[5,3]", "hidden": True, "order": 3},
            {"input": "[1,2,3,4,5]\n1\n5", "expected": "[5,4,3,2,1]", "hidden": True, "order": 4},
            {"input": "[1,2,3]\n3\n3", "expected": "[1,2,3]", "hidden": True, "order": 5},
        ],
        constraints="1 <= n <= 500\n-500 <= Node.val <= 500\n1 <= left <= right <= n",
        input_format="Line 1: the list as an array\nLine 2: left\nLine 3: right",
        output_format="The changed list",
        hints=[
            "Only the part from `left` to `right` changes. Find the node just before that part first.",
            "When `left` is 1 there is no node before the part. A spare dummy node in front of the head gives you one every time.",
            "Stand on the node before the part. Turn the part round link by link, starting with the node after the part as the new tail's target, then hook the node before the part onto the new first node. Return `dummy.next`.",
        ],
        solution="""
class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        ListNode dummy = new ListNode(0, head);
        ListNode anchor = dummy;
        for (int i = 1; i < left; i++) anchor = anchor.next;
        ListNode after = anchor.next;
        for (int i = left; i <= right; i++) after = after.next;
        ListNode prev = after;
        ListNode curr = anchor.next;
        for (int i = left; i <= right; i++) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        anchor.next = prev;
        return dummy.next;
    }
}
""",
        time="O(n)", space="O(1)",
    ),
    _with_starter(
        _p(
            142, "Linked List Cycle II", "MEDIUM", LINKED,
            "detectCycle", [("values", "int[]"), ("pos", "int")], "int",
            "A linked list is a chain of nodes, each with an arrow to the next one. In some lists the "
            "last arrow points back to an earlier node, so walking the chain goes round a loop "
            "forever. Find the node where that loop begins: the first node you visit twice. If the "
            "chain ends instead, there is no loop.\n\n"
            "The judge cannot write a loop as a plain array, so it passes the node values and `pos`, "
            "the index the last node points back to (`-1` for no loop). A helper builds the list. "
            "Write `findCycleStart(head)`: return the node where the loop begins, or `null`. The "
            "helper turns that node into its 0-based index, so the output is that index, or `-1`. "
            "Do not change the list.",
            [
                {"input": "[3,2,0,-4]\n1", "expected": "1", "hidden": False, "order": 1},
                {"input": "[1,2]\n0", "expected": "0", "hidden": False, "order": 2},
                {"input": "[1]\n-1", "expected": "-1", "hidden": False, "order": 3},
                {"input": "[]\n-1", "expected": "-1", "hidden": True, "order": 4},
                {"input": "[1,2,3,4,5,6]\n2", "expected": "2", "hidden": True, "order": 5},
                {"input": "[7]\n0", "expected": "0", "hidden": True, "order": 6},
            ],
            constraints="0 <= number of nodes <= 10^4\n-10^5 <= Node.val <= 10^5\npos is -1 or a valid index",
            input_format="Line 1: node values\nLine 2: pos, the index the last node points back to, or -1",
            output_format="The index where the loop begins, or -1",
            hints=[
                "A set of visited nodes finds the start: it is the first node you meet a second time. Can you do it with no extra memory?",
                "First find out whether there is a loop with a slow pointer (one step) and a fast pointer (two steps). Where they meet is inside the loop, but it is usually not the start.",
                "After they meet, put a second pointer on the head. Move it and the slow pointer one step at a time. The node where they meet is the start of the loop.",
            ],
            solution=CYCLE_SOLUTION,
            time="O(n)", space="O(1)",
        ),
        CYCLE_STARTER,
    ),
    _p(
        202, "Happy Number", "EASY", MATH,
        "isHappy", [("n", "int")], "boolean",
        "Take a positive whole number. Replace it with the sum of the squares of its digits: 19 "
        "becomes 1² + 9² = 82. Keep doing that. If you reach 1, the number is happy. Some numbers "
        "never reach 1 and go round the same numbers forever; those are not happy.\n\n"
        "Return `true` if `n` is happy, and `false` if it is not.",
        [
            {"input": "19", "expected": "true", "hidden": False, "order": 1},
            {"input": "2", "expected": "false", "hidden": False, "order": 2},
            {"input": "1", "expected": "true", "hidden": False, "order": 3},
            {"input": "7", "expected": "true", "hidden": True, "order": 4},
            {"input": "4", "expected": "false", "hidden": True, "order": 5},
            {"input": "2147483647", "expected": "false", "hidden": True, "order": 6},
        ],
        constraints="1 <= n <= 2^31 - 1",
        input_format="A positive integer n",
        output_format="true or false",
        hints=[
            "Write out the numbers for 2. Do they ever reach 1, or do they start to repeat?",
            "Each number points to exactly one next number, like a linked list. A number that is not happy runs into a loop.",
            "Keep a set of numbers already seen and stop on a repeat, or use a slow and a fast pointer: slow takes one step, fast takes two, and you stop when fast reaches 1 or lands on slow.",
        ],
        solution="""
class Solution {
    public boolean isHappy(int n) {
        int slow = n;
        int fast = next(n);
        while (fast != 1 && slow != fast) {
            slow = next(slow);
            fast = next(next(fast));
        }
        return fast == 1;
    }

    private int next(int number) {
        int sum = 0;
        while (number > 0) {
            int digit = number % 10;
            sum += digit * digit;
            number /= 10;
        }
        return sum;
    }
}
""",
        time="O(log n)", space="O(1)",
    ),
]
