"""Solutions for recommended batch 4: middle of a list, reverse one span, where a cycle starts, happy number."""

from __future__ import annotations

from database.seeds.recommended_04 import CYCLE_DRIVER

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-876"],
        "pattern": "Fast and slow pointers",
        "trigger": "Return the middle node of a linked list, when you are not told its length.",
        "summary": (
            "Start a slow pointer and a fast pointer at the head. Fast moves two nodes for every one "
            "that slow moves, so when fast runs out of list, slow is in the middle."
        ),
        "approaches": [
            {
                "name": "Copy the nodes into an array",
                "idea": "Put every node in an array list, then return the one at index size / 2.",
                "steps": [
                    "Walk the list from the head and add each node to an array list.",
                    "The middle is at index `size / 2`, which is the second middle when the size is even.",
                    "Return the node stored at that index.",
                ],
                "code": """import java.util.*;

class Solution {
    public ListNode middleNode(ListNode head) {
        List<ListNode> nodes = new ArrayList<>();
        for (ListNode node = head; node != null; node = node.next) {
            nodes.add(node);
        }
        return nodes.get(nodes.size() / 2);
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One walk over the list to copy the nodes.",
                "space_complexity": "O(n)",
                "space_why": "The array list holds every node.",
                "when_to_use": "Say it first to show the goal. Then offer to drop the extra memory.",
                "is_optimal": False,
            },
            {
                "name": "Count, then walk half way",
                "idea": "Walk once to count the nodes, then walk again for count / 2 steps.",
                "steps": [
                    "Walk the whole list once and count the nodes.",
                    "Go back to the head.",
                    "Step forward `count / 2` times. The node you stand on is the middle.",
                ],
                "code": """class Solution {
    public ListNode middleNode(ListNode head) {
        int count = 0;
        for (ListNode node = head; node != null; node = node.next) {
            count++;
        }
        ListNode middle = head;
        for (int i = 0; i < count / 2; i++) {
            middle = middle.next;
        }
        return middle;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One full walk to count, then half a walk to reach the middle.",
                "space_complexity": "O(1)",
                "space_why": "Only a counter and one pointer.",
                "when_to_use": "A correct answer with no extra memory. The interviewer may still ask for one walk.",
                "is_optimal": False,
            },
            {
                "name": "Slow and fast pointers",
                "idea": "Slow moves one node, fast moves two. When fast runs out of list, slow is the middle.",
                "steps": [
                    "Put `slow` and `fast` on the head.",
                    "While `fast` and `fast.next` are both not null, move slow one node and fast two nodes.",
                    "When the loop stops, return `slow`.",
                    "On an even list this lands on the second middle, which is the one asked for.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Fast crosses the list once, two nodes at a time, so about n / 2 loop rounds.",
                "space_complexity": "O(1)",
                "space_why": "Only the two pointers.",
                "when_to_use": "The version to write. One walk and no extra memory.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "head = [1,2,3,4,5,6]",
            "columns": ["round", "slow", "fast", "after fast", "what happens"],
            "rows": [
                ["start", "1", "1", "2", "both on the head"],
                ["1", "2", "3", "4", "slow moves one node, fast moves two"],
                ["2", "3", "5", "6", "slow is on the first middle, but fast still has a node after it"],
                ["3", "4", "null", "-", "fast ran off the end, so the loop stops"],
            ],
            "result": "Slow is on the node 4, so the answer is [4,5,6].",
        },
        "mistakes": [
            {
                "name": "The First Middle Trap",
                "wrong": "Looping while `fast.next != null && fast.next.next != null`, which stops one round early.",
                "right": "Loop while `fast != null && fast.next != null`. Stopping early leaves slow on the first of two middles.",
            },
            {
                "name": "Moving fast without checking",
                "wrong": "Doing `fast.next.next` when `fast.next` is null.",
                "right": "Check both `fast` and `fast.next` before the jump, or the program crashes.",
            },
            {
                "name": "Returning a value",
                "wrong": "Returning `slow.val` or building a new list.",
                "right": "Return the node `slow` itself. The rest of the list hangs off it already.",
            },
        ],
        "edge_cases": [
            {"input": "[1]", "expected": "[1]", "why": "One node: the loop never runs and the head is the middle."},
            {"input": "[1,2]", "expected": "[2]", "why": "Two middles: the second one is the answer."},
            {"input": "[1,2,3,4,5]", "expected": "[3,4,5]", "why": "Odd length: exactly one middle."},
            {"input": "[1,2,3,4,5,6]", "expected": "[4,5,6]", "why": "Even length: shows the First Middle Trap."},
        ],
        "interview_script": [
            "So I need the middle node of the list, and the second middle when the length is even.",
            "The obvious way is to copy the nodes into an array and pick index n / 2. That is O(n) time and O(n) space.",
            "I could count first and walk again, but I can do it in one walk.",
            "I move a slow pointer one node and a fast pointer two nodes. When fast runs out, slow is the middle: O(n) time, O(1) space.",
            "I would test one node, two nodes, and an odd and an even length.",
        ],
        "follow_ups": [
            {
                "question": "Return the first middle instead of the second.",
                "answer": "Loop while `fast.next != null && fast.next.next != null`. Slow then stops one node earlier on even lists.",
            },
            {
                "question": "Where is this used?",
                "answer": "Palindrome list and reorder list both split the list at the middle first, then turn the second half round.",
            },
            {
                "question": "Find the node one third of the way along.",
                "answer": "Let fast move three nodes for every one that slow moves, checking each of the three steps for null.",
            },
        ],
        "related_slugs": ["lc-234", "lc-143", "lc-141"],
    },
    {
        "slugs": ["lc-92"],
        "pattern": "Linked list: turn one span round",
        "trigger": "Reverse the nodes from position left to position right, and leave the rest of the list alone.",
        "summary": (
            "Put a dummy node before the head. Stand on the node before the span, turn the span's "
            "arrows round one by one, then hook that node onto the span's new first node."
        ),
        "approaches": [
            {
                "name": "Copy the values, reverse, write back",
                "idea": "Read all values into an array, reverse the part from left to right, and write the values back into the nodes.",
                "steps": [
                    "Walk the list and copy each value into an array list.",
                    "Swap values from both ends of the part from `left - 1` to `right - 1`, moving inwards.",
                    "Walk the list again and write the array's values back into the nodes, in order.",
                ],
                "code": """import java.util.*;

class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        List<Integer> values = new ArrayList<>();
        for (ListNode node = head; node != null; node = node.next) {
            values.add(node.val);
        }
        for (int i = left - 1, j = right - 1; i < j; i++, j--) {
            Collections.swap(values, i, j);
        }
        int index = 0;
        for (ListNode node = head; node != null; node = node.next) {
            node.val = values.get(index++);
        }
        return head;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Two walks over the list and one pass over part of the array.",
                "space_complexity": "O(n)",
                "space_why": "The array holds every value.",
                "when_to_use": "Mention it, but most interviewers want the links turned, not the values moved.",
                "is_optimal": False,
            },
            {
                "name": "Spare dummy node, turn the span round",
                "idea": "From the node before the span, reverse exactly right - left + 1 links, then reconnect both ends.",
                "steps": [
                    "Put a dummy node in front of the head, so there is always a node before the span.",
                    "Walk `anchor` from the dummy `left - 1` times. It now stands just before the span.",
                    "Find `after`, the node just past the span. Start `prev` there, so the span's old first node will point at it.",
                    "For each node in the span: save its next, point it at `prev`, then move `prev` and `curr` one node on.",
                    "Hook `anchor.next` onto `prev`, the span's new first node, and return `dummy.next`.",
                ],
                "code": """class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        ListNode dummy = new ListNode(0, head);
        ListNode anchor = dummy;
        for (int i = 1; i < left; i++) {
            anchor = anchor.next;
        }
        ListNode after = anchor.next;
        for (int i = left; i <= right; i++) {
            after = after.next;
        }
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
                "time_complexity": "O(n)",
                "time_why": "Each node up to `right` is visited a fixed number of times.",
                "space_complexity": "O(1)",
                "space_why": "Only a few pointers and the one dummy node.",
                "when_to_use": "The version to write. It reuses the plain list reversal loop you already know.",
                "is_optimal": True,
            },
            {
                "name": "Front insertion inside the span",
                "idea": "Keep the span's first node still, and move the node after it to the front of the span, right - left times.",
                "steps": [
                    "Put a dummy node before the head and walk `anchor` to the node before the span.",
                    "Let `first` be the span's first node. It will end up last in the span.",
                    "Repeat `right - left` times: unhook the node after `first` and insert it just after `anchor`.",
                    "Return `dummy.next`.",
                ],
                "code": """class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        ListNode dummy = new ListNode(0, head);
        ListNode anchor = dummy;
        for (int i = 1; i < left; i++) {
            anchor = anchor.next;
        }
        ListNode first = anchor.next;
        for (int i = 0; i < right - left; i++) {
            ListNode moving = first.next;
            first.next = moving.next;
            moving.next = anchor.next;
            anchor.next = moving;
        }
        return dummy.next;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One walk to the span, then one move per node inside it.",
                "space_complexity": "O(1)",
                "space_why": "Only a few pointers and the dummy node.",
                "when_to_use": "A neat one-pass form with no separate reconnect step. Harder to get right on a whiteboard.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "head = [1,2,3], left = 1, right = 2",
            "columns": ["step", "anchor", "prev", "curr", "arrow changed", "list from dummy"],
            "rows": [
                ["start", "dummy", "3 (after)", "1", "none", "dummy → 1 → 2 → 3"],
                ["turn 1", "dummy", "1", "2", "1 → 3", "dummy → 1 → 3, and 2 → 3 waits"],
                ["turn 2", "dummy", "2", "3", "2 → 1", "2 → 1 → 3"],
                ["hook", "dummy", "2", "3", "dummy → 2", "dummy → 2 → 1 → 3"],
                ["return", "-", "-", "-", "-", "dummy.next is 2. The old head 1 would give only [1,3]"],
            ],
            "result": "Returning the dummy's next node gives [2,1,3].",
        },
        "mistakes": [
            {
                "name": "The Missing Engine Trap",
                "wrong": "Skipping the dummy node and returning the old `head`, even when `left` is 1.",
                "right": "Always put a dummy before the head and return `dummy.next`. When left is 1 the front node changes, and the old head loses the new front nodes.",
            },
            {
                "name": "Loose end after the span",
                "wrong": "Starting `prev` at null, so the span's old first node points at nothing.",
                "right": "Start `prev` at the node after the span, or reconnect it after the loop.",
            },
            {
                "name": "Off by one on positions",
                "wrong": "Walking `left` steps to the anchor instead of `left - 1`.",
                "right": "Positions count from 1. The anchor is `left - 1` steps from the dummy.",
            },
        ],
        "edge_cases": [
            {"input": "[5]\n1\n1", "expected": "[5]", "why": "One node and a span of one: nothing changes."},
            {"input": "[3,5]\n1\n2", "expected": "[5,3]", "why": "The span starts at the head, so the head changes."},
            {"input": "[1,2,3,4,5]\n1\n5", "expected": "[5,4,3,2,1]", "why": "The span is the whole list."},
            {"input": "[1,2,3]\n3\n3", "expected": "[1,2,3]", "why": "A span of one at the end."},
            {"input": "[1,2,3,4,5]\n2\n4", "expected": "[1,4,3,2,5]", "why": "Nodes on both sides of the span must stay linked."},
        ],
        "interview_script": [
            "So I turn round only the nodes from position left to right, and keep the rest in place.",
            "The obvious way: I copy the values to an array, reverse that part, and write them back. That is O(n) time and O(n) space.",
            "The key point for me is the two ends: the node before the span and the node after it.",
            "I put a dummy before the head, walk to the node before the span, and reverse the span with prev starting at the node after it. Then I hook the two together. That is O(n) time and O(1) space.",
            "I would test left equal to 1, left equal to right, and the whole list.",
        ],
        "follow_ups": [
            {
                "question": "Can you do it in one pass?",
                "answer": "Yes. Walk to the anchor, then move each next node to the front of the span, `right - left` times.",
            },
            {
                "question": "Reverse every group of k nodes instead.",
                "answer": "Repeat the same span reversal group by group, and leave a last group shorter than k as it is.",
            },
            {
                "question": "Why use a dummy node at all?",
                "answer": "It gives the span a node before it even when `left` is 1, so one piece of code covers every case.",
            },
        ],
        "related_slugs": ["lc-206", "lc-25", "lc-61"],
    },
    {
        "slugs": ["lc-142"],
        "pattern": "Fast and slow pointers",
        "trigger": "Return the node where a linked list's loop begins, using no extra memory.",
        "summary": (
            "A slow and a fast pointer meet somewhere on the loop. Then a second pointer starts at the "
            "head. Moving one node each, it meets the slow pointer exactly at the loop's first node."
        ),
        "approaches": [
            {
                "name": "Remember every node in a set",
                "idea": "Walk from the head and store each node. The first node already stored is where the loop begins.",
                "steps": [
                    "Keep a set of nodes you have visited.",
                    "Walk from the head. If the node is already in the set, return it: the loop starts there.",
                    "Otherwise add it and move to the next node.",
                    "If you reach null, the list ends and there is no loop.",
                ],
                "code": "import java.util.*;\n\n" + CYCLE_DRIVER + """
    public ListNode findCycleStart(ListNode head) {
        Set<ListNode> seen = new HashSet<>();
        for (ListNode node = head; node != null; node = node.next) {
            if (!seen.add(node)) return node;
        }
        return null;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each node goes into the set once, and the walk stops at the first repeat.",
                "space_complexity": "O(n)",
                "space_why": "The set can hold every node.",
                "when_to_use": "Say it first. The follow-up is always to use no extra memory.",
                "is_optimal": False,
            },
            {
                "name": "Slow and fast pointers, then a friend from the head",
                "idea": "Find where slow and fast meet on the loop, then walk a new pointer from the head together with slow.",
                "steps": [
                    "Move `slow` one node and `fast` two nodes while `fast` and `fast.next` are not null.",
                    "If fast runs out, there is no loop: return null.",
                    "When slow and fast land on the same node, start `friend` at the head.",
                    "Move `friend` and `slow` one node at a time until they are on the same node.",
                    "That node is where the loop begins. Return it.",
                ],
                "code": CYCLE_DRIVER + """
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
""",
                "time_complexity": "O(n)",
                "time_why": "Fast meets slow within about two laps, and the friend walks at most the list's length.",
                "space_complexity": "O(1)",
                "space_why": "Only three pointers.",
                "when_to_use": "The version to write. Be ready to explain why the friend meets slow at the entrance.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "values = [3,2,0,-4], pos = 1 (the node -4 points back to the node 2)",
            "columns": ["round", "slow", "fast", "friend", "what happens"],
            "rows": [
                ["start", "3", "3", "-", "both on the head"],
                ["1", "2", "0", "-", "slow moves one node, fast two"],
                ["2", "0", "2", "-", "fast went round the loop"],
                ["3", "-4", "-4", "-", "they meet on -4, which is inside the loop but not its start"],
                ["friend 1", "2", "-", "2", "friend starts at 3; one step each and they meet on 2"],
            ],
            "result": "The loop starts at the node 2, index 1, so the answer is 1.",
        },
        "mistakes": [
            {
                "name": "The Meeting Point Trap",
                "wrong": "Returning the node where slow and fast meet.",
                "right": "Where they meet is inside the loop, not its start. Send a friend from the head and walk both one node at a time until they meet.",
            },
            {
                "name": "Jumping without checking",
                "wrong": "Doing `fast.next.next` before checking `fast.next`.",
                "right": "Check `fast != null && fast.next != null` before every jump.",
            },
            {
                "name": "Friend moving two nodes",
                "wrong": "Keeping fast's speed in the second phase.",
                "right": "In the second phase both pointers move one node at a time.",
            },
        ],
        "edge_cases": [
            {"input": "[]\n-1", "expected": "-1", "why": "An empty list has no loop."},
            {"input": "[1]\n-1", "expected": "-1", "why": "One node that ends at null."},
            {"input": "[7]\n0", "expected": "0", "why": "One node that points to itself."},
            {"input": "[1,2]\n0", "expected": "0", "why": "The loop starts at the head, so the friend and slow meet at once."},
            {"input": "[3,2,0,-4]\n1", "expected": "1", "why": "The meeting point is not the start (the Meeting Point Trap)."},
        ],
        "interview_script": [
            "So I need the first node of the loop, or null if the list ends.",
            "The obvious way: I store every node in a set and return the first repeat. That is O(n) time and O(n) space.",
            "With no memory, I first find a meeting point with a slow and a fast pointer. That point is on the loop but usually not its start.",
            "The distance from the head to the start equals the distance from the meeting point on to the start. So I walk a friend from the head with slow, and they meet at the start: O(n) time, O(1) space.",
            "I would test no loop, a loop at the head, a node pointing to itself, and a long stem before the loop.",
        ],
        "follow_ups": [
            {
                "question": "Why does the friend meet slow exactly at the start?",
                "answer": "Fast walked twice as far as slow, so the extra distance is whole laps. That makes head-to-start equal to meeting-point-to-start, going round.",
            },
            {
                "question": "How long is the loop?",
                "answer": "From the meeting point, keep one pointer still and walk the other until it comes back, counting the steps.",
            },
            {
                "question": "Where else does this appear?",
                "answer": "Find the Duplicate Number treats each value as an arrow to an index, and the repeated value is where the loop starts.",
            },
        ],
        "related_slugs": ["lc-141", "lc-202", "lc-876"],
    },
    {
        "slugs": ["lc-202"],
        "pattern": "Fast and slow pointers",
        "trigger": "Repeat a step on a number until it reaches 1, or it goes round the same numbers forever.",
        "summary": (
            "Each number leads to exactly one next number, like a linked list. Run a slow and a fast "
            "number along it: either fast reaches 1, or it goes round a loop and lands on slow."
        ),
        "approaches": [
            {
                "name": "Remember every number in a set",
                "idea": "Keep stepping and store each number. Stop at 1, or at the first number already stored.",
                "steps": [
                    "Keep a set of numbers you have seen.",
                    "While the number is not 1 and not already in the set, add it and replace it with its digit-square sum.",
                    "Return whether the number you stopped on is 1.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean isHappy(int n) {
        Set<Integer> seen = new HashSet<>();
        while (n != 1 && seen.add(n)) {
            n = next(n);
        }
        return n == 1;
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
                "time_complexity": "O(log n)",
                "time_why": "Each step costs one unit per digit, and after the first step every number stays below 243, so the chain is short.",
                "space_complexity": "O(log n)",
                "space_why": "The set holds each number on the chain before the repeat.",
                "when_to_use": "Clear and correct. Offer it first, then remove the set.",
                "is_optimal": False,
            },
            {
                "name": "Slow and fast numbers",
                "idea": "Slow takes one step, fast takes two. Stop when fast reaches 1 or lands on slow.",
                "steps": [
                    "Write a helper `next` that adds up the squares of the digits.",
                    "Set `slow` to n and `fast` to the next number after n.",
                    "While fast is not 1 and slow is not equal to fast, move slow one step and fast two steps.",
                    "Return whether fast is 1.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(log n)",
                "time_why": "The first step reads the digits of n. After that the numbers stay small, so the chase is short.",
                "space_complexity": "O(1)",
                "space_why": "Only two numbers are kept.",
                "when_to_use": "The version to write when asked for no extra memory.",
                "is_optimal": True,
            },
            {
                "name": "Known loop: stop at 4",
                "idea": "Every number that is not happy falls into the same loop, which contains 4, so stop at 1 or 4.",
                "steps": [
                    "While the number is not 1 and not 4, replace it with its digit-square sum.",
                    "Return whether it stopped on 1.",
                    "This works because of a known fact: the only loop is 4, 16, 37, 58, 89, 145, 42, 20.",
                ],
                "code": """class Solution {
    public boolean isHappy(int n) {
        while (n != 1 && n != 4) {
            int sum = 0;
            while (n > 0) {
                int digit = n % 10;
                sum += digit * digit;
                n /= 10;
            }
            n = sum;
        }
        return n == 1;
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "The same short chain as before, with no chase.",
                "space_complexity": "O(1)",
                "space_why": "Only the current number.",
                "when_to_use": "Shows you know the math fact. Name it as a shortcut, since it does not teach the general loop check.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "n = 2 (chain 2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4)",
            "columns": ["round", "slow", "fast", "what happens"],
            "rows": [
                ["start", "2", "4", "fast starts one step ahead"],
                ["1", "4", "37", "slow moves one number, fast two"],
                ["2", "16", "89", "fast is on the loop and never meets 1"],
                ["3", "37", "42", "still no 1"],
                ["4", "58", "4", "fast came round the loop"],
                ["5", "89", "37", "fast is closing in on slow"],
                ["6", "145", "89", "one number behind"],
                ["7", "42", "42", "fast lands on slow, and fast is not 1"],
            ],
            "result": "They met on 42, not on 1, so the answer is false.",
        },
        "mistakes": [
            {
                "name": "The Endless Loop Trap",
                "wrong": "Writing `while (n != 1) n = next(n);` with no other way out.",
                "right": "A number that is not happy never reaches 1. Stop when fast reaches 1 or lands on slow, never on 1 alone.",
            },
            {
                "name": "Starting both on n",
                "wrong": "Setting `slow = n` and `fast = n`, then testing `slow != fast` before the first move.",
                "right": "Start fast one step ahead, or move both before the first check.",
            },
            {
                "name": "Digits in the wrong order of work",
                "wrong": "Squaring the whole number, or adding the digits before squaring them.",
                "right": "Take each digit with `% 10`, square it, add it, then drop it with `/ 10`.",
            },
        ],
        "edge_cases": [
            {"input": "1", "expected": "true", "why": "Already 1: happy with no steps."},
            {"input": "7", "expected": "true", "why": "A one-digit number other than 1 that is happy."},
            {"input": "2", "expected": "false", "why": "Falls into the loop and never reaches 1."},
            {"input": "4", "expected": "false", "why": "Starts on the loop itself."},
            {"input": "2147483647", "expected": "false", "why": "The largest input. The first step shrinks it at once."},
        ],
        "interview_script": [
            "So I keep replacing n with the sum of its digits squared, and check whether I reach 1.",
            "If n is not happy, the numbers repeat forever, so my plain loop until 1 would never stop.",
            "The obvious fix: I keep a set of seen numbers and stop on a repeat. That is O(log n) time and O(log n) space.",
            "Each number has one next number, so I treat it as a linked list. A slow and a fast pointer find the loop with O(log n) time and O(1) space.",
            "I would test 1, 7, 2, and the largest int.",
        ],
        "follow_ups": [
            {
                "question": "Why can the chain not grow forever?",
                "answer": "A number with d digits leads to at most 81 × d, which is smaller once d is 4 or more. So the numbers soon stay below 243 and must repeat.",
            },
            {
                "question": "Can you avoid the set without the chase?",
                "answer": "Yes, with the known fact that every unhappy number reaches 4. Stop at 1 or 4.",
            },
            {
                "question": "Where else does this chase work?",
                "answer": "Anywhere each value has exactly one next value: a linked list loop, or Find the Duplicate Number.",
            },
        ],
        "related_slugs": ["lc-141", "lc-142", "lc-876"],
    },
]
