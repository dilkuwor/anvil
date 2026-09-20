"""Linked list problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-138"],
        "pattern": "Hash map of original to copy",
        "trigger": "Deep-copy a list whose nodes also have a random pointer to any node, or to nothing.",
        "summary": (
            "Make a copy of every node first. Then wire each copy's next and random from a map "
            "of original to copy. Random can point ahead, so the copies must all exist before those links are set."
        ),
        "approaches": [
            {
                "name": "Walk to find each random target",
                "idea": "Copy the chain in order, then for each random pointer walk from the head until the target, in lockstep on the copy.",
                "steps": [
                    "Build the original list from the `[value, randomIndex]` rows.",
                    "Walk it once, making a parallel copy whose next links are already set.",
                    "For each original, if random is set, walk from both heads until that original, and point the copy there.",
                    "Encode the copy back to `[value, randomIndex]` rows.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] copyRandomList(int[][] nodes) {
        int n = nodes.length;
        if (n == 0) return new int[0][];
        Node head = decode(nodes);
        Node copyHead = new Node(head.val);
        Node oc = head.next, cc = copyHead;
        while (oc != null) {
            cc.next = new Node(oc.val);
            oc = oc.next;
            cc = cc.next;
        }
        oc = head;
        cc = copyHead;
        while (oc != null) {
            if (oc.random != null) {
                Node t = head, ct = copyHead;
                while (t != oc.random) {
                    t = t.next;
                    ct = ct.next;
                }
                cc.random = ct;
            }
            oc = oc.next;
            cc = cc.next;
        }
        return encode(copyHead);
    }

    private Node decode(int[][] nodes) {
        int n = nodes.length;
        Node[] originals = new Node[n];
        for (int i = 0; i < n; i++) originals[i] = new Node(nodes[i][0]);
        for (int i = 0; i < n; i++) {
            originals[i].next = i + 1 < n ? originals[i + 1] : null;
            originals[i].random = nodes[i][1] >= 0 ? originals[nodes[i][1]] : null;
        }
        return originals[0];
    }

    private int[][] encode(Node head) {
        List<Node> order = new ArrayList<>();
        Map<Node, Integer> indexOf = new HashMap<>();
        for (Node cur = head; cur != null; cur = cur.next) {
            indexOf.put(cur, order.size());
            order.add(cur);
        }
        int[][] out = new int[order.size()][2];
        for (int i = 0; i < order.size(); i++) {
            Node node = order.get(i);
            out[i][0] = node.val;
            out[i][1] = node.random == null ? -1 : indexOf.get(node.random);
        }
        return out;
    }
}

class Node {
    int val;
    Node next;
    Node random;
    Node(int val) { this.val = val; }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each of the n random pointers may walk up to n nodes from the head.",
                "space_complexity": "O(n)",
                "space_why": "The copy is n new nodes, plus the encode index map.",
                "when_to_use": "Say it. The walk to find random is the cost they want you to cut.",
                "is_optimal": False,
            },
            {
                "name": "Map original node to its copy",
                "idea": "One pass creates every copy. A second pass sets next and random through the map, in O(1) per link.",
                "steps": [
                    "Build the original list from the rows.",
                    "Walk it, putting each original in a map to a new node with the same value.",
                    "Walk again: copy.next is the map entry for original.next, and the same for random.",
                    "`map.get(null)` is null, so a missing next or random stays null.",
                    "Encode the copy head.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[][] copyRandomList(int[][] nodes) {
        int n = nodes.length;
        if (n == 0) return new int[0][];
        Node[] originals = new Node[n];
        for (int i = 0; i < n; i++) originals[i] = new Node(nodes[i][0]);
        for (int i = 0; i < n; i++) {
            originals[i].next = i + 1 < n ? originals[i + 1] : null;
            originals[i].random = nodes[i][1] >= 0 ? originals[nodes[i][1]] : null;
        }
        Map<Node, Node> copies = new HashMap<>();
        for (Node cur = originals[0]; cur != null; cur = cur.next) {
            copies.put(cur, new Node(cur.val));
        }
        for (Node cur = originals[0]; cur != null; cur = cur.next) {
            copies.get(cur).next = copies.get(cur.next);
            copies.get(cur).random = copies.get(cur.random);
        }
        List<Node> order = new ArrayList<>();
        Map<Node, Integer> indexOf = new HashMap<>();
        for (Node cur = copies.get(originals[0]); cur != null; cur = cur.next) {
            indexOf.put(cur, order.size());
            order.add(cur);
        }
        int[][] out = new int[order.size()][2];
        for (int i = 0; i < order.size(); i++) {
            Node node = order.get(i);
            out[i][0] = node.val;
            out[i][1] = node.random == null ? -1 : indexOf.get(node.random);
        }
        return out;
    }
}

class Node {
    int val;
    Node next;
    Node random;
    Node(int val) { this.val = val; }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Two walks of n nodes, and each map lookup is one step.",
                "space_complexity": "O(n)",
                "space_why": "The map holds one entry per original node.",
                "when_to_use": "The version to write. Mention weaving copies in as a follow-up for O(1) extra space.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nodes = [[1,1],[2,1]]",
            "columns": ["pass", "node", "map", "next", "random"],
            "rows": [
                ["create", "1", "1 -> 1'", "-", "-"],
                ["create", "2", "1 -> 1', 2 -> 2'", "-", "-"],
                ["wire", "1", "same", "1'.next = 2'", "1'.random = 2'"],
                ["wire", "2", "same", "2'.next = null", "2'.random = 2'"],
            ],
            "result": "The copy encodes as [[1,1],[2,1]].",
        },
        "mistakes": [
            {
                "name": "Wiring random on the first pass",
                "wrong": "Setting `copy.random` while creating copies, when the target copy may not exist yet.",
                "right": "Create every copy first. Wire next and random on a second pass through the map.",
            },
            {
                "name": "Copying by value, not by node",
                "wrong": "Matching random by equal `val`, so two nodes with value 3 share the wrong target.",
                "right": "The map key is the original node object, not its value.",
            },
            {
                "name": "Returning the original",
                "wrong": "Wiring the copy's pointers back to original nodes.",
                "right": "Every `next` and `random` on a copy must be a copy, or null.",
            },
        ],
        "edge_cases": [
            {"input": "[[7,-1],[13,0],[11,4],[10,2],[1,0]]", "expected": "[[7,-1],[13,0],[11,4],[10,2],[1,0]]", "why": "Random points forward, backward, and to null."},
            {"input": "[[1,1],[2,1]]", "expected": "[[1,1],[2,1]]", "why": "A node can point random at itself."},
            {"input": "[]", "expected": "[]", "why": "Empty list."},
            {"input": "[[3,-1],[3,0],[3,-1]]", "expected": "[[3,-1],[3,0],[3,-1]]", "why": "Equal values: the map must key on the node, not the value.",},
        ],
        "interview_script": [
            "I need a deep copy of a list where each node also has a random pointer.",
            "I could copy next first, then walk from the head to find each random target. That is O(n²).",
            "The key point is that random may point at a node I have not copied yet, so I must make every copy before I wire those links.",
            "I keep a map from original node to copy. Pass one creates the copies. Pass two sets next and random through the map.",
            "That is O(n) time and O(n) space. I will test empty, random at self, and two nodes with the same value.",
        ],
        "follow_ups": [
            {
                "question": "O(1) extra space, besides the copy itself.",
                "answer": "Weave each copy after its original, set `copy.random = original.random.next`, then unweave the two lists.",
            },
            {
                "question": "The graph version, neighbours instead of next and random.",
                "answer": "Clone Graph. Same map of original to copy, then walk neighbours.",
            },
            {
                "question": "Random can form a cycle. Does the map still work?",
                "answer": "Yes. The map is keyed on identity, so a cycle is just a pointer to a node already copied.",
            },
        ],
        "related_slugs": ["lc-133", "lc-141", "lc-206"],
    },
    {
        "slugs": ["lc-141", "cycle-in-a-chain"],
        "pattern": "Fast and slow pointers",
        "trigger": "Does this linked list loop back on itself, and you may not use extra memory.",
        "summary": (
            "A slow walker and a fast walker share the track. If the track ends, the fast walker "
            "finds null first. If it loops, the fast walker comes round and lands on the slow one."
        ),
        "approaches": [
            {
                "name": "Remember every node I have seen",
                "idea": "Put each node in a set. A node already in the set means the list has looped.",
                "steps": [
                    "Build the list from `values` and `pos` (the helper in the starter).",
                    "Walk from the head. If the node is already in the set, return true.",
                    "Otherwise add the node and step to next.",
                    "If you hit null, the track ended: return false.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean hasCycle(int[] values, int pos) {
        return detect(build(values, pos));
    }

    public boolean detect(ListNode head) {
        Set<ListNode> seen = new HashSet<>();
        while (head != null) {
            if (!seen.add(head)) return true;
            head = head.next;
        }
        return false;
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
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each node is added to the set once, then the walk stops.",
                "space_complexity": "O(n)",
                "space_why": "The set holds every node on the chain, or every node in the loop plus the stem.",
                "when_to_use": "Say it. They will ask for constant extra space next.",
                "is_optimal": False,
            },
            {
                "name": "Slow walker and fast walker",
                "idea": "Slow steps one node, fast steps two. They only meet again if the track loops.",
                "steps": [
                    "Set `slow` and `fast` to the head.",
                    "Before every jump, check `fast != null` and `fast.next != null`.",
                    "Then move the slow pointer one step and the fast pointer two.",
                    "If they land on the same node, there is a loop.",
                    "If fast runs out, the track ended: return false.",
                ],
                "code": """class Solution {
    public boolean hasCycle(int[] values, int pos) {
        return detect(build(values, pos));
    }

    public boolean detect(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
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
}
""",
                "time_complexity": "O(n)",
                "time_why": "Fast walks at most a constant times the length before it meets slow or hits null.",
                "space_complexity": "O(1)",
                "space_why": "Only the two pointers.",
                "when_to_use": "The version to write. Constant extra space.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "values = [3,2,0,-4], pos = 1",
            "columns": ["step", "slow", "fast", "check", "meet?"],
            "rows": [
                ["start", "3", "3", "fast and fast.next exist", "no"],
                ["1", "2", "0", "both can jump", "no"],
                ["2", "0", "2", "both can jump", "no"],
                ["3", "-4", "-4", "same node", "yes"],
            ],
            "result": "They meet, so the answer is true.",
        },
        "mistakes": [
            {
                "name": "The Null Pointer Void",
                "wrong": "Writing `fast = fast.next.next` without checking that fast itself is still on the track.",
                "right": "Before every jump check both `fast != null` and `fast.next != null`. On a track that ends, a hare that jumps from null crashes the program.",
            },
            {
                "name": "Comparing values",
                "wrong": "Treating equal `val` as a meeting.",
                "right": "Meet means the same node object: `slow == fast`.",
            },
            {
                "name": "Moving fast one step",
                "wrong": "Both pointers stepping once, so they never lap.",
                "right": "Fast must jump two nodes. That is what closes the gap inside a loop.",
            },
        ],
        "edge_cases": [
            {"input": "[3,2,0,-4]\n1", "expected": "true", "why": "Tail links to index 1."},
            {"input": "[1,2]\n0", "expected": "true", "why": "Two-node loop."},
            {"input": "[1]\n-1", "expected": "false", "why": "One node, no link back. Fast.next is null on the first check."},
            {"input": "[]\n-1", "expected": "false", "why": "Empty list. Head is null."},
        ],
        "interview_script": [
            "I need to know whether this list loops back on itself, with no extra memory if I can help it.",
            "I could put every node in a set. That is O(n) time and O(n) space.",
            "The key point I use is two walkers: slow steps one, fast steps two. They meet only if the track loops.",
            "I check `fast != null` and `fast.next != null` before every jump, or fast falls off the end of a list that does not loop.",
            "That is O(n) time and O(1) space. I will test empty, one node, a loop, and a list that ends.",
        ],
        "follow_ups": [
            {
                "question": "Return the node where the cycle begins.",
                "answer": "When they meet, put one pointer back at the head. Step both one at a time. The next meeting is the start of the loop.",
            },
            {
                "question": "The list is allowed extra memory.",
                "answer": "The set of seen nodes is then fine, and easier to write.",
            },
            {
                "question": "Count the length of the cycle.",
                "answer": "From the meeting, freeze slow and walk fast once around until they meet again, counting steps.",
            },
        ],
        "related_slugs": ["lc-160", "lc-143", "lc-234"],
    },
    {
        "slugs": ["lc-143"],
        "pattern": "Find middle, reverse, weave",
        "trigger": "Reorder a list to first, last, second, second-last, and so on, by changing links only.",
        "summary": (
            "Find the middle, cut the list there, reverse the second half, then weave the two halves: "
            "first of left, first of reversed right, and so on."
        ),
        "approaches": [
            {
                "name": "Store every node, then rebuild",
                "idea": "Put the nodes in a list, then pick from the front and the back in turn.",
                "steps": [
                    "Walk the list, storing each node in an array list.",
                    "Set two indices at the ends.",
                    "Link front, then back, then the next front, and so on.",
                    "Set the last node's next to null, or an old link can form a cycle.",
                ],
                "code": """import java.util.*;

class Solution {
    public ListNode reorderList(ListNode head) {
        if (head == null) return head;
        List<ListNode> nodes = new ArrayList<>();
        for (ListNode p = head; p != null; p = p.next) nodes.add(p);
        int i = 0, j = nodes.size() - 1;
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (i <= j) {
            tail.next = nodes.get(i++);
            tail = tail.next;
            if (i > j) break;
            tail.next = nodes.get(j--);
            tail = tail.next;
        }
        tail.next = null;
        return dummy.next;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One walk to store the nodes, one walk to relink them.",
                "space_complexity": "O(n)",
                "space_why": "The array list holds every node.",
                "when_to_use": "Fine if extra memory is allowed. They usually want O(1) space.",
                "is_optimal": False,
            },
            {
                "name": "Cut at the middle, reverse, weave",
                "idea": "The second half must be walked backwards, so reverse it, then merge the two halves by taking one node from each.",
                "steps": [
                    "Slow steps one, fast steps two, until fast cannot jump two. Slow is the end of the first half.",
                    "Cut: `slow.next = null`. Keep the second half.",
                    "Reverse the second half in place.",
                    "Weave: first.next = reversed, reversed.next = old first.next, and step both.",
                ],
                "code": """class Solution {
    public ListNode reorderList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode second = slow.next;
        slow.next = null;
        ListNode prev = null;
        while (second != null) {
            ListNode next = second.next;
            second.next = prev;
            prev = second;
            second = next;
        }
        ListNode first = head;
        while (prev != null) {
            ListNode firstNext = first.next;
            ListNode prevNext = prev.next;
            first.next = prev;
            prev.next = firstNext;
            first = firstNext;
            prev = prevNext;
        }
        return head;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Find the middle, reverse, and weave: each is one walk of n nodes.",
                "space_complexity": "O(1)",
                "space_why": "Only a handful of pointers. The nodes themselves are reused.",
                "when_to_use": "The version to write. Three known pieces glued together.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "head = [1,2,3,4]",
            "columns": ["piece", "after", "first half", "second half"],
            "rows": [
                ["find middle", "slow at 2", "1,2", "3,4"],
                ["cut", "2.next = null", "1 -> 2", "3 -> 4"],
                ["reverse second", "4 -> 3", "1 -> 2", "4 -> 3"],
                ["weave", "1 -> 4 -> 2 -> 3", "spent", "spent"],
            ],
            "result": "The answer is [1,4,2,3].",
        },
        "mistakes": [
            {
                "name": "Not cutting before the reverse",
                "wrong": "Reversing the second half while it is still linked to the first, so the weave walks into a cycle.",
                "right": "Set `slow.next = null` before reversing. The two halves must be separate chains.",
            },
            {
                "name": "Leaving the last next dirty",
                "wrong": "In the array-list rebuild, not setting the last node's next to null.",
                "right": "The last node still points at its old neighbour. Clear it.",
            },
            {
                "name": "Odd length middle",
                "wrong": "Splitting so the second half is longer, then weaving past the end of the first half.",
                "right": "Stop fast when it cannot jump two. First half is the longer one on odd length, and the weave loop is driven by the reversed half.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3,4]", "expected": "[1,4,2,3]", "why": "Even length."},
            {"input": "[1,2,3,4,5]", "expected": "[1,5,2,4,3]", "why": "Odd length. The middle stays in the first half."},
            {"input": "[1]", "expected": "[1]", "why": "One node."},
            {"input": "[1,2]", "expected": "[1,2]", "why": "Already in the reordered shape.",},
        ],
        "interview_script": [
            "I must reorder the list to first, last, second, second-last, by changing links only.",
            "I could store every node and pick from both ends. That is O(n) extra space.",
            "I find the middle, cut, reverse the second half, then weave the two halves together.",
            "I cut before I reverse, or the weave walks into a cycle.",
            "That is O(n) time and O(1) space. I will test one node, even length, and odd length.",
        ],
        "follow_ups": [
            {
                "question": "Do not mutate the list. Return a new one.",
                "answer": "Then the array-list rebuild is the clean answer, linking new nodes.",
            },
            {
                "question": "The reorder is L0, L2, L4, ..., L5, L3, L1.",
                "answer": "Same split. Do not reverse the second half. Append it as-is after the even prefix, after reversing it still if the odds must run backwards.",
            },
            {
                "question": "Restore the original order afterwards.",
                "answer": "The same three pieces in reverse: split the weave, reverse the second half back, then join.",
            },
        ],
        "related_slugs": ["lc-206", "lc-234", "lc-148"],
    },
    {
        "slugs": ["lc-148"],
        "pattern": "Merge sort on a linked list",
        "trigger": "Sort a linked list in O(n log n) time, with little extra memory.",
        "summary": (
            "Split the list at the middle, sort each half, then merge the two sorted chains. "
            "A linked list only walks forward, so merge sort fits it."
        ),
        "approaches": [
            {
                "name": "Copy the values, sort, write them back",
                "idea": "Pull every value into an array, sort the array, then walk the list and overwrite each node.",
                "steps": [
                    "Walk the list, storing each value.",
                    "Sort the array.",
                    "Walk the list again, writing the sorted values back.",
                    "Empty list: return null.",
                ],
                "code": """import java.util.*;

class Solution {
    public ListNode sortList(ListNode head) {
        if (head == null) return null;
        List<Integer> vals = new ArrayList<>();
        for (ListNode p = head; p != null; p = p.next) vals.add(p.val);
        Collections.sort(vals);
        ListNode p = head;
        for (int v : vals) {
            p.val = v;
            p = p.next;
        }
        return head;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting n values dominates. The two walks are linear.",
                "space_complexity": "O(n)",
                "space_why": "The array holds every value.",
                "when_to_use": "Say it. They asked to rearrange links, and they asked for little extra space.",
                "is_optimal": False,
            },
            {
                "name": "Split, sort each half, merge",
                "idea": "Find the middle, cut, sort both halves, then merge like Merge Two Sorted Lists.",
                "steps": [
                    "If the list has zero or one node, it is already sorted.",
                    "Slow starts at head, fast at head.next. Walk until fast cannot jump two. Cut after slow.",
                    "Sort the left half and the right half the same way.",
                    "Merge the two sorted halves by always taking the smaller head.",
                ],
                "code": """class Solution {
    public ListNode sortList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode slow = head;
        ListNode fast = head.next;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode second = slow.next;
        slow.next = null;
        return merge(sortList(head), sortList(second));
    }

    private ListNode merge(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) {
                tail.next = a;
                a = a.next;
            } else {
                tail.next = b;
                b = b.next;
            }
            tail = tail.next;
        }
        tail.next = a != null ? a : b;
        return dummy.next;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "log n splits, and each level walks all n nodes to merge.",
                "space_complexity": "O(log n)",
                "space_why": "The call stack is the split depth, log n for a balanced split.",
                "when_to_use": "The version to write. Mention a bottom-up merge if they insist on O(1) extra space.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "head = [4,2,1,3]",
            "columns": ["call", "split", "left", "right", "merged"],
            "rows": [
                ["[4,2,1,3]", "after 2", "[4,2]", "[1,3]", "-"],
                ["[4,2]", "after 4", "[4]", "[2]", "[2,4]"],
                ["[1,3]", "after 1", "[1]", "[3]", "[1,3]"],
                ["merge top", "-", "[2,4]", "[1,3]", "[1,2,3,4]"],
            ],
            "result": "The answer is [1,2,3,4].",
        },
        "mistakes": [
            {
                "name": "Not cutting at the middle",
                "wrong": "Recursing on the whole list because `slow.next` is still linked.",
                "right": "Set `slow.next = null` after taking `second`. A two-node list never shrinks if you skip the cut.",
            },
            {
                "name": "Fast starting at head",
                "wrong": "Both pointers at head on a two-node list, so slow ends on the last node and the right half is empty.",
                "right": "Start fast at `head.next` so the split is even.",
            },
            {
                "name": "Quicksort with random access",
                "wrong": "Picking a pivot by index, which a singly linked list cannot do in O(1).",
                "right": "Merge sort only walks forward. That matches the structure.",
            },
        ],
        "edge_cases": [
            {"input": "[4,2,1,3]", "expected": "[1,2,3,4]", "why": "The usual split and merge."},
            {"input": "[-1,5,3,4,0]", "expected": "[-1,0,3,4,5]", "why": "Negatives."},
            {"input": "[]", "expected": "[]", "why": "Empty list."},
            {"input": "[1,1,1]", "expected": "[1,1,1]", "why": "All equal. Merge must take `<=` so equals stay stable.",},
        ],
        "interview_script": [
            "I need to sort a linked list in O(n log n) with little extra space.",
            "I could copy the values, sort the array, and write them back. That uses O(n) extra memory.",
            "I split at the middle, sort each half, and merge. A linked list only walks forward, so merge sort fits.",
            "I cut after the middle, or a two-node list never shrinks and the recursion never ends.",
            "That is O(n log n) time and O(log n) stack. I will test empty, two nodes, and all-equal values.",
        ],
        "follow_ups": [
            {
                "question": "Constant extra space, not O(log n) stack.",
                "answer": "Bottom-up merge sort: merge runs of size 1, 2, 4, ... in a loop, with a dummy head each round.",
            },
            {
                "question": "k sorted lists, not one unsorted list.",
                "answer": "That is Merge k Sorted Lists. A min-heap of k heads, or pairwise merge.",
            },
            {
                "question": "Sort by a field other than val.",
                "answer": "Same split and merge. Only the compare in merge changes.",
            },
        ],
        "related_slugs": ["lc-21", "lc-23", "lc-88"],
    },
    {
        "slugs": ["lc-160"],
        "pattern": "Two pointers on two lists",
        "trigger": "Find the first shared node of two singly linked lists, or report that they do not meet.",
        "summary": (
            "Walk both lists. When a pointer hits the end, start it at the other head. "
            "They travel the same total length and meet at the shared node, or both hit null."
        ),
        "approaches": [
            {
                "name": "Remember every node of A",
                "idea": "Put A's nodes in a set, then walk B. The first node already in the set is the join.",
                "steps": [
                    "Build the two lists with the shared suffix (the helper in the starter).",
                    "Walk A, adding each node to a set.",
                    "Walk B. Return the first node that is already in the set.",
                    "If B ends with no hit, they do not meet.",
                ],
                "code": """import java.util.*;

class Solution {
    public int getIntersectionNode(int[] a, int[] b, int skipA, int skipB) {
        ListNode[] heads = build(a, b, skipA, skipB);
        ListNode node = getIntersection(heads[0], heads[1]);
        return node == null ? 0 : node.val;
    }

    public ListNode getIntersection(ListNode headA, ListNode headB) {
        Set<ListNode> seen = new HashSet<>();
        for (ListNode p = headA; p != null; p = p.next) seen.add(p);
        for (ListNode q = headB; q != null; q = q.next) {
            if (seen.contains(q)) return q;
        }
        return null;
    }

    private ListNode[] build(int[] a, int[] b, int skipA, int skipB) {
        ListNode[] nodesA = new ListNode[a.length];
        for (int i = 0; i < a.length; i++) nodesA[i] = new ListNode(a[i]);
        for (int i = 0; i + 1 < a.length; i++) nodesA[i].next = nodesA[i + 1];
        ListNode[] nodesB = new ListNode[Math.max(skipB, 0)];
        for (int i = 0; i < skipB; i++) nodesB[i] = new ListNode(b[i]);
        for (int i = 0; i + 1 < skipB; i++) nodesB[i].next = nodesB[i + 1];
        ListNode shared = skipA >= 0 && skipA < a.length ? nodesA[skipA] : null;
        if (skipB > 0) nodesB[skipB - 1].next = shared;
        ListNode headB = skipB > 0 ? nodesB[0] : shared;
        ListNode headA = a.length == 0 ? null : nodesA[0];
        return new ListNode[] { headA, headB };
    }
}
""",
                "time_complexity": "O(m + n)",
                "time_why": "One walk of A to fill the set, one walk of B to query it.",
                "space_complexity": "O(m)",
                "space_why": "The set holds every node of A.",
                "when_to_use": "Say it. They will ask for constant extra space.",
                "is_optimal": False,
            },
            {
                "name": "Switch heads when a pointer runs out",
                "idea": "The unique prefixes have different lengths. Switching heads makes both pointers walk m + n steps and arrive at the join together.",
                "steps": [
                    "Set p at the head of A and q at the head of B.",
                    "While they are not the same node, step each one.",
                    "When p hits null, set p to the head of B. When q hits null, set q to the head of A.",
                    "If they never joined, both become null on the same step, and that is the answer.",
                ],
                "code": """class Solution {
    public int getIntersectionNode(int[] a, int[] b, int skipA, int skipB) {
        ListNode[] heads = build(a, b, skipA, skipB);
        ListNode node = getIntersection(heads[0], heads[1]);
        return node == null ? 0 : node.val;
    }

    public ListNode getIntersection(ListNode headA, ListNode headB) {
        if (headA == null || headB == null) return null;
        ListNode p = headA;
        ListNode q = headB;
        while (p != q) {
            p = p == null ? headB : p.next;
            q = q == null ? headA : q.next;
        }
        return p;
    }

    private ListNode[] build(int[] a, int[] b, int skipA, int skipB) {
        ListNode[] nodesA = new ListNode[a.length];
        for (int i = 0; i < a.length; i++) nodesA[i] = new ListNode(a[i]);
        for (int i = 0; i + 1 < a.length; i++) nodesA[i].next = nodesA[i + 1];
        ListNode[] nodesB = new ListNode[Math.max(skipB, 0)];
        for (int i = 0; i < skipB; i++) nodesB[i] = new ListNode(b[i]);
        for (int i = 0; i + 1 < skipB; i++) nodesB[i].next = nodesB[i + 1];
        ListNode shared = skipA >= 0 && skipA < a.length ? nodesA[skipA] : null;
        if (skipB > 0) nodesB[skipB - 1].next = shared;
        ListNode headB = skipB > 0 ? nodesB[0] : shared;
        ListNode headA = a.length == 0 ? null : nodesA[0];
        return new ListNode[] { headA, headB };
    }
}
""",
                "time_complexity": "O(m + n)",
                "time_why": "Each pointer walks at most the two lists once.",
                "space_complexity": "O(1)",
                "space_why": "Only the two pointers.",
                "when_to_use": "The version to write. Same cost class as measuring lengths and skipping the difference.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "a = [4,1,8,4,5], b = [5,6,1,8,4,5], skipA = 2, skipB = 3",
            "columns": ["p", "q", "p next", "q next"],
            "rows": [
                ["4", "5", "1", "6"],
                ["8", "1", "4", "8"],
                ["5 (end of A)", "4", "jump to B's 5", "5"],
                ["6", "8 (A)", "1", "4"],
                ["8", "8", "meet", "meet"],
            ],
            "result": "They meet at 8, so the answer is 8.",
        },
        "mistakes": [
            {
                "name": "Matching on value",
                "wrong": "Returning the first node of B whose `val` appears in A.",
                "right": "The join is the same node object. Values may repeat before the join.",
            },
            {
                "name": "Restarting at the same head",
                "wrong": "When p hits null, setting p back to headA, so the length gap never closes.",
                "right": "Switch: p goes to headB, q goes to headA.",
            },
            {
                "name": "Stopping at the first null",
                "wrong": "Returning null as soon as one list ends, while the other still has prefix nodes.",
                "right": "A null means 'now walk the other list', not 'no join'.",
            },
        ],
        "edge_cases": [
            {"input": "[4,1,8,4,5]\n[5,6,1,8,4,5]\n2\n3", "expected": "8", "why": "The usual join."},
            {"input": "[1,9,1,2,4]\n[3,2,4]\n3\n1", "expected": "2", "why": "Shorter unique prefix on B."},
            {"input": "[2,6,4]\n[1,5]\n-1\n2", "expected": "0", "why": "No join. Both pointers hit null together."},
            {"input": "[1,2,3]\n[1,2,3]\n0\n0", "expected": "1", "why": "B is only the shared suffix, starting at A's head."},
        ],
        "interview_script": [
            "I need the first shared node of two lists, or 0 if they never meet.",
            "I could store A's nodes in a set and walk B. That is O(m) extra space.",
            "I cannot walk in lockstep from both heads: the lists may have different prefix lengths, so that misses the join.",
            "I switch a pointer to the other head when it hits null. Both then walk m + n steps and meet at the join, or both hit null.",
            "That is O(m+n) time and O(1) space. I will test no join, and a join after prefixes of different lengths.",
        ],
        "follow_ups": [
            {
                "question": "Measure the lengths instead of switching.",
                "answer": "Walk both to count, skip the extra prefix on the longer list, then walk together. Same cost.",
            },
            {
                "question": "The lists may have a cycle.",
                "answer": "First find whether each has a cycle. If both cycles start at the same node, that is the join. If not, they do not meet.",
            },
            {
                "question": "Return the length of the shared suffix.",
                "answer": "From the join, walk to null and count.",
            },
        ],
        "related_slugs": ["lc-141", "lc-19", "lc-21"],
    },
    {
        "slugs": ["lc-19"],
        "pattern": "Two pointers, n steps apart",
        "trigger": "Remove the n-th node from the end of a linked list, in one pass if you can.",
        "summary": (
            "Send a lead pointer n steps ahead of a trail. Then walk both. "
            "When the lead is on the last node, the trail sits just before the node to drop."
        ),
        "approaches": [
            {
                "name": "Store every node, then drop by index",
                "idea": "Put the nodes in an array. The node to drop is at index length − n, so relink the one before it.",
                "steps": [
                    "Walk the list, storing each node in an array list.",
                    "The target index is the length minus n.",
                    "If that index is 0, the head is the one to drop: return head.next.",
                    "Otherwise point the previous node's next past the target.",
                ],
                "code": """import java.util.*;

class Solution {
    public ListNode removeNthFromEnd(ListNode head, int n) {
        List<ListNode> nodes = new ArrayList<>();
        for (ListNode p = head; p != null; p = p.next) nodes.add(p);
        int idx = nodes.size() - n;
        if (idx == 0) return head.next;
        nodes.get(idx - 1).next = nodes.get(idx).next;
        return head;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One walk to store the nodes, then a constant-time relink.",
                "space_complexity": "O(n)",
                "space_why": "The array list holds every node.",
                "when_to_use": "Correct. They will ask for one pass and no extra array.",
                "is_optimal": False,
            },
            {
                "name": "Lead n steps, then walk together",
                "idea": "A dummy node in front of the head lets the trail sit before the target even when the target is the head.",
                "steps": [
                    "Put a dummy node in front of the head. Lead and trail start there.",
                    "Advance lead n steps, so it sits on the n-th node.",
                    "Walk both until `lead.next` is null. Trail is then just before the target.",
                    "Skip: `trail.next = trail.next.next`. Return `dummy.next`.",
                ],
                "code": """class Solution {
    public ListNode removeNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0, head);
        ListNode lead = dummy;
        ListNode trail = dummy;
        for (int i = 0; i < n; i++) lead = lead.next;
        while (lead.next != null) {
            lead = lead.next;
            trail = trail.next;
        }
        trail.next = trail.next.next;
        return dummy.next;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Lead walks the list once. Trail follows a gap of n.",
                "space_complexity": "O(1)",
                "space_why": "Dummy, lead, and trail.",
                "when_to_use": "The version to write. One pass, and dropping the head needs no extra branch.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "head = [1,2,3,4,5], n = 2",
            "columns": ["lead", "trail", "gap", "action"],
            "rows": [
                ["dummy", "dummy", "0", "start"],
                ["2", "dummy", "2", "lead has taken n steps"],
                ["5", "3", "2", "lead.next is null, stop"],
                ["5", "3", "2", "3.next skips 4, becomes 5"],
            ],
            "result": "The answer is [1,2,3,5].",
        },
        "mistakes": [
            {
                "name": "No dummy when dropping the head",
                "wrong": "Starting trail at the head, so there is no node before the head when n equals the length.",
                "right": "Start both at a dummy in front of the head. Then `dummy.next` is the new head.",
            },
            {
                "name": "Advancing lead n+1, or n-1",
                "wrong": "Leaving trail one node too far forward or back.",
                "right": "From the dummy, lead takes exactly n steps. Then both walk until lead is last.",
            },
            {
                "name": "Off-by-one on the two-pass index",
                "wrong": "Walking `len - n` steps and landing on the target, then having no predecessor.",
                "right": "Walk `len - n - 1` from the head, to the node before the target.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3,4,5]\n2", "expected": "[1,2,3,5]", "why": "Drop a middle node."},
            {"input": "[1]\n1", "expected": "[]", "why": "Drop the only node. Dummy makes this the same code."},
            {"input": "[1,2]\n1", "expected": "[1]", "why": "Drop the last node."},
            {"input": "[1,2]\n2", "expected": "[2]", "why": "Drop the head.",},
        ],
        "interview_script": [
            "I must remove the n-th node from the end, in one pass if I can.",
            "I could store every node and drop by index. That is O(n) extra space.",
            "I put a dummy in front of the head, send a lead n steps, then walk lead and trail together.",
            "When my lead is on the last node, the trail is just before the node to drop, including when that node is the head.",
            "That is O(n) time and O(1) space. I will test dropping the head, the last node, and the only node.",
        ],
        "follow_ups": [
            {
                "question": "Remove the n-th from the front.",
                "answer": "Same dummy. Walk n-1 steps from dummy and skip. No second pointer.",
            },
            {
                "question": "n may be larger than the length.",
                "answer": "If lead hits null while taking the n steps, there is no such node. Return the list unchanged.",
            },
            {
                "question": "Return the removed node.",
                "answer": "After trail is in place, save `trail.next`, then skip it, then return the saved node.",
            },
        ],
        "related_slugs": ["lc-206", "lc-21", "lc-160"],
    },
    {
        "slugs": ["lc-2"],
        "pattern": "Digit-by-digit add with carry",
        "trigger": "Two numbers stored as linked lists, digits reversed, one digit per node. Return the sum the same way.",
        "summary": (
            "The heads are the ones digits. Add digit by digit with a carry. "
            "Keep going while either list still has a digit, or the carry is still 1."
        ),
        "approaches": [
            {
                "name": "Copy both into arrays, then add",
                "idea": "Dump each list into an array of digits, then add with a carry into a new list.",
                "steps": [
                    "Walk each list into an array list of digits.",
                    "At index i, add the two digits (0 if that list is short) plus carry.",
                    "Write sum % 10 as a new node, and keep sum / 10 as carry.",
                    "If a carry remains after the last digit, write one more node.",
                ],
                "code": """import java.util.*;

class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        List<Integer> a = digits(l1);
        List<Integer> b = digits(l2);
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        int carry = 0, i = 0;
        while (i < a.size() || i < b.size() || carry != 0) {
            int sum = carry;
            if (i < a.size()) sum += a.get(i);
            if (i < b.size()) sum += b.get(i);
            carry = sum / 10;
            tail.next = new ListNode(sum % 10);
            tail = tail.next;
            i++;
        }
        return dummy.next;
    }

    private List<Integer> digits(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode p = head; p != null; p = p.next) out.add(p.val);
        return out;
    }
}
""",
                "time_complexity": "O(max(m, n))",
                "time_why": "Each list is copied once, then one pass writes the sum.",
                "space_complexity": "O(m + n)",
                "space_why": "Two extra arrays, one per input list, besides the result.",
                "when_to_use": "Works, but the extra arrays are not needed. Add while walking the lists.",
                "is_optimal": False,
            },
            {
                "name": "One pass on the two lists",
                "idea": "Walk both lists together. A dummy holds the start of the result. The loop condition covers a leftover carry.",
                "steps": [
                    "A dummy node holds the start. The tail begins there, and the carry starts at 0.",
                    "While l1, l2, or carry is still live: add carry plus each present digit.",
                    "Write the digit `sum % 10`, set the carry to `sum / 10`, and advance each list you read.",
                    "Return the node after the dummy.",
                ],
                "code": """class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int sum = carry;
            if (l1 != null) {
                sum += l1.val;
                l1 = l1.next;
            }
            if (l2 != null) {
                sum += l2.val;
                l2 = l2.next;
            }
            carry = sum / 10;
            tail.next = new ListNode(sum % 10);
            tail = tail.next;
        }
        return dummy.next;
    }
}
""",
                "time_complexity": "O(max(m, n))",
                "time_why": "One step per digit of the longer number, plus a last step if carry remains.",
                "space_complexity": "O(1)",
                "space_why": "Only dummy, tail, and carry besides the result list.",
                "when_to_use": "The version to write. Do not convert to integers: 100 digits will not fit.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "l1 = [2,4,3], l2 = [5,6,4]",
            "columns": ["l1", "l2", "carry in", "sum", "write", "carry out"],
            "rows": [
                ["2", "5", "0", "7", "7", "0"],
                ["4", "6", "0", "10", "0", "1"],
                ["3", "4", "1", "8", "8", "0"],
            ],
            "result": "The answer is [7,0,8].",
        },
        "mistakes": [
            {
                "name": "Dropping the last carry",
                "wrong": "Stopping when both lists end, even if carry is 1.",
                "right": "The loop is `l1 != null || l2 != null || carry != 0`. [5] + [5] is [0,1].",
            },
            {
                "name": "Converting to int or long",
                "wrong": "Building 342 + 465 as integers. A 100-digit input overflows.",
                "right": "Add digit by digit. The reversed order is the ones place at the head.",
            },
            {
                "name": "Forgetting the shorter list",
                "wrong": "A loop that requires both nodes, then dropping the rest of the longer list.",
                "right": "Treat a missing node as digit 0, and keep going.",
            },
        ],
        "edge_cases": [
            {"input": "[2,4,3]\n[5,6,4]", "expected": "[7,0,8]", "why": "342 + 465 = 807."},
            {"input": "[0]\n[0]", "expected": "[0]", "why": "Zero plus zero."},
            {"input": "[9,9,9,9,9,9,9]\n[9,9,9,9]", "expected": "[8,9,9,9,0,0,0,1]", "why": "Different lengths and a leftover carry."},
            {"input": "[5]\n[5]", "expected": "[0,1]", "why": "Carry becomes a new node.",},
        ],
        "interview_script": [
            "I add two numbers stored reversed, one digit per node.",
            "I will not convert them to integers. A long input would overflow.",
            "I could copy both lists into arrays first, but that is O(m + n) extra space.",
            "I add digit by digit with a carry, writing a new node for sum modulo 10.",
            "I keep going while either list has a digit or the carry is still 1, so [5] + [5] becomes [0,1].",
            "That is O(max(m, n)) time and O(1) extra space. I will test zeros, different lengths, and a leftover carry.",
        ],
        "follow_ups": [
            {
                "question": "The digits are stored in forward order, most significant first.",
                "answer": "Reverse both, add, reverse the result. Or recurse to the tails and add on the way back, then handle a leftover carry at the head.",
            },
            {
                "question": "Do not allocate new nodes. Reuse l1.",
                "answer": "Write the digits into l1 as you go. If l2 is longer, attach the rest of l2 and keep carrying along it.",
            },
            {
                "question": "Multiply the two numbers.",
                "answer": "That is Multiply Strings, on arrays of digits. A nested add of shifted products.",
            },
        ],
        "related_slugs": ["lc-21", "lc-43", "lc-8"],
    },
    {
        "slugs": ["lc-206"],
        "pattern": "Turn the links round",
        "trigger": "Reverse a singly linked list, or any task that must turn one-way links round without a second list.",
        "summary": (
            "Hold one node: plant a flag on the node ahead, swing this node's next to the node behind, "
            "then step to the flag. Repeat until the chain is turned round."
        ),
        "approaches": [
            {
                "name": "Reverse from the tail, recursively",
                "idea": "Reverse the rest first. Then the old next node points back at me, and I point at null.",
                "steps": [
                    "If the list is empty or a single node, it is already reversed.",
                    "Ask the rest of the list to reverse. That call returns the new head.",
                    "Set `head.next.next = head`, so the old neighbour now points back.",
                    "Set `head.next = null`, so the old head becomes the tail.",
                ],
                "code": """class Solution {
    public ListNode reverseList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode rest = reverseList(head.next);
        head.next.next = head;
        head.next = null;
        return rest;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each node is visited once on the way down and once on the way back.",
                "space_complexity": "O(n)",
                "space_why": "The call stack is one frame per node.",
                "when_to_use": "Short to write. Mention the stack. They often want the loop.",
                "is_optimal": False,
            },
            {
                "name": "Three pointers in a loop",
                "idea": "prev starts null. At each node, save the node ahead, swing next to prev, then step forward.",
                "steps": [
                    "Set `prev` to null and `curr` to the head.",
                    "While curr is not null, save the node ahead as `next = curr.next`.",
                    "Then `curr.next = prev`. That swings the coupling.",
                    "Step forward: `prev` becomes curr, and curr becomes the saved next.",
                    "When curr is null, prev is the new head.",
                ],
                "code": """class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each node is visited once.",
                "space_complexity": "O(1)",
                "space_why": "Only prev, curr, and next.",
                "when_to_use": "The version to write. Constant extra space.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "head = [1,2,3]",
            "columns": ["curr", "saved next", "after swing", "prev", "new curr"],
            "rows": [
                ["1", "2", "1 -> null", "1", "2"],
                ["2", "3", "2 -> 1", "2", "3"],
                ["3", "null", "3 -> 2", "3", "null"],
            ],
            "result": "prev is 3, so the answer is [3,2,1].",
        },
        "mistakes": [
            {
                "name": "The Orphan Train Trap",
                "wrong": "Setting `curr.next = prev` before remembering the rest of the list.",
                "right": "Save `next = curr.next` before `curr.next = prev`. Swing the coupling first and nothing holds the rest of the train.",
            },
            {
                "name": "Returning curr",
                "wrong": "The loop ends with curr at null.",
                "right": "Return prev. That is the last node you swung, the new head.",
            },
            {
                "name": "Forgetting to clear the old head's next, in the recursive version",
                "wrong": "Leaving `head.next` pointing at the old neighbour, which now also points back: a two-node cycle.",
                "right": "After `head.next.next = head`, set `head.next = null`.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3,4,5]", "expected": "[5,4,3,2,1]", "why": "The usual reverse."},
            {"input": "[1,2]", "expected": "[2,1]", "why": "Two nodes. Easy to drop the save of next."},
            {"input": "[]", "expected": "[]", "why": "Empty. The loop never runs, prev stays null."},
            {"input": "[1]", "expected": "[1]", "why": "One node. The loop runs once and prev becomes that node."},
        ],
        "interview_script": [
            "I reverse a singly linked list and return the new head.",
            "I could reverse from the tail with recursion. That is O(n) stack.",
            "The key point is to save the node ahead before I swing this node's next to the node behind.",
            "I keep prev, curr, and next. After the loop, prev is the new head.",
            "That is O(n) time and O(1) space. I will test empty, one node, and two nodes.",
        ],
        "follow_ups": [
            {
                "question": "Reverse only from position left to right.",
                "answer": "Walk to left, reverse that slice with the same three pointers, then join the node before left to the new head of the slice.",
            },
            {
                "question": "Reverse every k nodes.",
                "answer": "That is Reverse Nodes in k-Group. Scout k nodes, then reverse that slice.",
            },
            {
                "question": "Do it with a stack.",
                "answer": "Push every node, then pop and relink. O(n) space, same idea as the recursion.",
            },
        ],
        "related_slugs": ["lc-25", "lc-143", "lc-19"],
    },
    {
        "slugs": ["lc-21"],
        "pattern": "Merge two sorted lists",
        "trigger": "Splice two sorted linked lists into one sorted list, reusing the existing nodes.",
        "summary": (
            "Always take the smaller of the two current heads. A dummy node holds the start so the first "
            "pick needs no special case. When one list ends, attach the rest of the other."
        ),
        "approaches": [
            {
                "name": "Pick with recursion",
                "idea": "The merged head is the smaller of the two heads, and its next is the merge of whatever remains.",
                "steps": [
                    "If the first list is null, return the second. If the second is null, return the first.",
                    "If list1.val is smaller or equal, list1.next is the merge of list1.next with list2, and return list1.",
                    "Otherwise do the same on the second list.",
                ],
                "code": """class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        if (list1 == null) return list2;
        if (list2 == null) return list1;
        if (list1.val <= list2.val) {
            list1.next = mergeTwoLists(list1.next, list2);
            return list1;
        }
        list2.next = mergeTwoLists(list1, list2.next);
        return list2;
    }
}
""",
                "time_complexity": "O(m + n)",
                "time_why": "Each node is chosen once.",
                "space_complexity": "O(m + n)",
                "space_why": "The call stack is one frame per chosen node.",
                "when_to_use": "Short. The stack is as long as the lists, so prefer the loop.",
                "is_optimal": False,
            },
            {
                "name": "Dummy node and a tail",
                "idea": "Tail always points at the last node of the result. Attach the smaller head, then advance that list and tail.",
                "steps": [
                    "A dummy node holds the start, and the tail begins there.",
                    "While both lists still have a node, attach the smaller head to tail and advance that list.",
                    "Advance the tail to the node just attached.",
                    "When one list runs out, attach the rest of the other in one assignment.",
                    "Return the node after the dummy.",
                ],
                "code": """class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                tail.next = list1;
                list1 = list1.next;
            } else {
                tail.next = list2;
                list2 = list2.next;
            }
            tail = tail.next;
        }
        tail.next = list1 != null ? list1 : list2;
        return dummy.next;
    }
}
""",
                "time_complexity": "O(m + n)",
                "time_why": "Each node is attached once.",
                "space_complexity": "O(1)",
                "space_why": "Dummy and tail. The nodes themselves are reused.",
                "when_to_use": "The version to write. Same merge is reused in Sort List and Merge k Sorted Lists.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "list1 = [1,2,4], list2 = [1,3,4]",
            "columns": ["list1", "list2", "pick", "result so far"],
            "rows": [
                ["1,2,4", "1,3,4", "1 from list1", "1"],
                ["2,4", "1,3,4", "1 from list2", "1,1"],
                ["2,4", "3,4", "2", "1,1,2"],
                ["4", "3,4", "3", "1,1,2,3"],
                ["4", "4", "4, then attach leftover 4", "1,1,2,3,4,4"],
            ],
            "result": "The answer is [1,1,2,3,4,4].",
        },
        "mistakes": [
            {
                "name": "Losing the first node",
                "wrong": "Choosing the first head with a special case, and forgetting to keep a pointer to it.",
                "right": "A dummy node holds the start. Return `dummy.next`.",
            },
            {
                "name": "Looping the leftover",
                "wrong": "Walking the rest of the longer list node by node after the other is spent.",
                "right": "One assignment: `tail.next = list1 != null ? list1 : list2`.",
            },
            {
                "name": "Using `<` and dropping equals",
                "wrong": "When values are equal, neither branch attaches, and the loop never ends.",
                "right": "Use `<=` so equals from list1 (or list2) always move.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,4]\n[1,3,4]", "expected": "[1,1,2,3,4,4]", "why": "The usual merge, including equals."},
            {"input": "[]\n[]", "expected": "[]", "why": "Both empty. Dummy.next is null."},
            {"input": "[]\n[0]", "expected": "[0]", "why": "One list empty: attach the other."},
            {"input": "[5]\n[1,2,4]", "expected": "[1,2,4,5]", "why": "All of list2 goes first.",},
        ],
        "interview_script": [
            "I splice two sorted lists into one sorted list, reusing the nodes.",
            "I could pick with recursion. That is O(m+n) stack.",
            "I use a dummy node and a tail. I always attach the smaller of the two current heads.",
            "When one list runs out, I attach the rest of the other in one assignment.",
            "That is O(m+n) time and O(1) extra space. I will test both empty, one empty, and equal values.",
        ],
        "follow_ups": [
            {
                "question": "k sorted lists.",
                "answer": "Merge k Sorted Lists. Heap of k heads, or merge them pairwise.",
            },
            {
                "question": "Merge into the first list's spare slots, arrays not lists.",
                "answer": "Merge Sorted Array. Fill from the back so you do not overwrite a value you still need.",
            },
            {
                "question": "The lists are sorted descending.",
                "answer": "Take the larger head each time, or reverse both, merge, reverse the result.",
            },
        ],
        "related_slugs": ["lc-23", "lc-88", "lc-148"],
    },
    {
        "slugs": ["lc-234"],
        "pattern": "Reverse the second half",
        "trigger": "Is a singly linked list a palindrome, in O(n) time and O(1) extra space if you can.",
        "summary": (
            "Find the middle, reverse the second half in place, then compare the two halves node by node. "
            "An odd-length list leaves a middle node on the reversed half, and that extra compare is fine."
        ),
        "approaches": [
            {
                "name": "Copy values into an array",
                "idea": "A list of the values, then two indices walking inward, same as a palindrome on an array.",
                "steps": [
                    "Walk the list, storing each value.",
                    "Set i at 0 and j at the last index.",
                    "While i < j, if the values differ return false, else step inward.",
                    "If they all match, return true.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean isPalindrome(ListNode head) {
        List<Integer> vals = new ArrayList<>();
        for (ListNode p = head; p != null; p = p.next) vals.add(p.val);
        int i = 0, j = vals.size() - 1;
        while (i < j) {
            if (!vals.get(i).equals(vals.get(j))) return false;
            i++;
            j--;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One walk to copy, one walk inward.",
                "space_complexity": "O(n)",
                "space_why": "The array holds every value.",
                "when_to_use": "Say it. The follow-up wants O(1) extra space.",
                "is_optimal": False,
            },
            {
                "name": "Reverse the second half, then compare",
                "idea": "Slow and fast find the start of the second half. Reverse that half, then walk both halves together.",
                "steps": [
                    "Slow and fast start at the head. While fast can jump two, slow steps one.",
                    "Reverse from slow to the end. prev is the head of the reversed half.",
                    "Walk front from the original head and back from prev, comparing values.",
                    "Stop when back is null. On odd length the middle is on the reversed half and compares once, which is fine.",
                ],
                "code": """class Solution {
    public boolean isPalindrome(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode prev = null;
        while (slow != null) {
            ListNode next = slow.next;
            slow.next = prev;
            prev = slow;
            slow = next;
        }
        ListNode front = head;
        ListNode back = prev;
        while (back != null) {
            if (front.val != back.val) return false;
            front = front.next;
            back = back.next;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Find middle, reverse, and compare: each is one walk.",
                "space_complexity": "O(1)",
                "space_why": "Only the pointers. The reverse is in place.",
                "when_to_use": "The version to write. Mention that it mutates the list, and offer to reverse the half back.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "head = [1,2,2,1]",
            "columns": ["piece", "slow / fast", "second half", "compare"],
            "rows": [
                ["find middle", "slow at second 2, fast off the end", "2,1", "-"],
                ["reverse", "-", "1 -> 2", "-"],
                ["compare", "front 1 vs back 1", "match", "step"],
                ["compare", "front 2 vs back 2", "match, back is null", "true"],
            ],
            "result": "The answer is true.",
        },
        "mistakes": [
            {
                "name": "Comparing into the reversed half too far",
                "wrong": "Looping while front is not null, so after the first half you compare nodes against themselves in a mess of reversed links.",
                "right": "Loop while `back != null`. The reversed half is the shorter or equal one.",
            },
            {
                "name": "Finding the wrong middle",
                "wrong": "Stopping slow on the last node of the first half for even length, then reversing a half that still includes a first-half node.",
                "right": "The usual `while (fast != null && fast.next != null)` leaves slow at the start of the second half.",
            },
            {
                "name": "Not reversing, walking backwards",
                "wrong": "Trying to step prev from the end of a singly linked list.",
                "right": "You cannot walk backwards. Reverse the second half, or copy the values.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,2,1]", "expected": "true", "why": "Even palindrome."},
            {"input": "[1,2]", "expected": "false", "why": "Two different values."},
            {"input": "[1]", "expected": "true", "why": "One node."},
            {"input": "[1,2,3,2,1]", "expected": "true", "why": "Odd length. The middle sits on the reversed half.",},
        ],
        "interview_script": [
            "I need to know whether this list reads the same forwards and backwards.",
            "I could copy the values into an array and walk inward. That is O(n) extra space.",
            "I find the middle, reverse the second half in place, then compare the two halves.",
            "I stop when the reversed half runs out. On odd length the middle compares once, which is fine.",
            "That is O(n) time and O(1) space. I will test one node, even palindrome, odd palindrome, and a miss.",
        ],
        "follow_ups": [
            {
                "question": "Restore the list before returning.",
                "answer": "After the compare, reverse the second half again and join it back to the first half's tail.",
            },
            {
                "question": "The list may have a cycle.",
                "answer": "A palindrome check on a cycle does not end. Detect a cycle first and reject, or cut it.",
            },
            {
                "question": "Same question on a string.",
                "answer": "Valid Palindrome: two indices, skip junk, compare inward.",
            },
        ],
        "related_slugs": ["lc-125", "lc-206", "lc-143"],
    },
    {
        "slugs": ["lc-25"],
        "pattern": "Reverse k-groups",
        "trigger": "Reverse the nodes of a linked list k at a time, and leave a short last group as it is.",
        "summary": (
            "A scout checks that k nodes are still ahead. Then that group is reversed in place, and the "
            "previous tail hooks onto the group's new head. A short last group is left as it is."
        ),
        "approaches": [
            {
                "name": "Reverse a group, recurse on the rest",
                "idea": "If fewer than k nodes remain, return the head unchanged. Otherwise reverse this group onto the already-reversed rest.",
                "steps": [
                    "Scout k nodes ahead. If the scout hits null, return head: this leftover stays.",
                    "Recurse on the node after this group. That returns the new head of the rest.",
                    "Reverse this group's k nodes, the same three-pointer swing, with prev starting at that rest head.",
                    "The last node you swing is the new head of this group. Return it.",
                ],
                "code": """class Solution {
    public ListNode reverseKGroup(ListNode head, int k) {
        ListNode scout = head;
        for (int i = 0; i < k; i++) {
            if (scout == null) return head;
            scout = scout.next;
        }
        ListNode prev = reverseKGroup(scout, k);
        ListNode curr = head;
        for (int i = 0; i < k; i++) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each node is scouted once and swung once.",
                "space_complexity": "O(n / k)",
                "space_why": "One recursive call per group, so n/k frames.",
                "when_to_use": "Clean. They may want a loop and O(1) extra space.",
                "is_optimal": False,
            },
            {
                "name": "Scout, reverse, hook, in a loop",
                "idea": "A dummy sits in front of the list. For each group, scout k nodes from the previous tail, reverse that slice, then move the tail to the group's new end.",
                "steps": [
                    "Dummy in front of the head. groupPrev starts there.",
                    "From groupPrev, walk k steps to kth. If you hit null, stop: leftover stays.",
                    "Reverse the slice (groupPrev.next .. kth), with prev starting at kth.next.",
                    "Hook: the old first node of the group is the new tail. groupPrev.next becomes kth.",
                    "Move groupPrev to that new tail and repeat.",
                ],
                "code": """class Solution {
    public ListNode reverseKGroup(ListNode head, int k) {
        ListNode dummy = new ListNode(0, head);
        ListNode groupPrev = dummy;
        while (true) {
            ListNode kth = groupPrev;
            for (int i = 0; i < k && kth != null; i++) kth = kth.next;
            if (kth == null) break;
            ListNode groupNext = kth.next;
            ListNode prev = groupNext;
            ListNode curr = groupPrev.next;
            while (curr != groupNext) {
                ListNode next = curr.next;
                curr.next = prev;
                prev = curr;
                curr = next;
            }
            ListNode newTail = groupPrev.next;
            groupPrev.next = kth;
            groupPrev = newTail;
        }
        return dummy.next;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each node is visited a constant number of times: scout, then swing.",
                "space_complexity": "O(1)",
                "space_why": "Dummy and a few pointers. No stack of groups.",
                "when_to_use": "The version to write. Count k before touching a group.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "head = [1,2,3,4,5], k = 2",
            "columns": ["group", "scout", "after reverse", "leftover"],
            "rows": [
                ["1,2", "2 exists", "2 -> 1 -> 3,4,5", "-"],
                ["3,4", "4 exists", "2 -> 1 -> 4 -> 3 -> 5", "-"],
                ["5", "scout hits null", "do not touch", "5 stays"],
            ],
            "result": "The answer is [2,1,4,3,5].",
        },
        "mistakes": [
            {
                "name": "The Leftover Reversal Trap",
                "wrong": "Reversing the last group even when it has fewer than k nodes.",
                "right": "Count k cars ahead before touching a group. If the scout reaches null first, the last cars stay exactly as they are.",
            },
            {
                "name": "Losing the rest of the list",
                "wrong": "Reversing a group so its new tail points at null, dropping everything after it.",
                "right": "Start prev at the node after the group (`kth.next`). The reverse then hangs the rest on the new tail.",
            },
            {
                "name": "Not moving the group anchor",
                "wrong": "Leaving groupPrev on the dummy, so the next reverse starts from the head again.",
                "right": "After a reverse, the old first node of the group is the new tail. That is the next groupPrev.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3,4,5]\n2", "expected": "[2,1,4,3,5]", "why": "Leftover one node stays."},
            {"input": "[1,2,3,4,5]\n3", "expected": "[3,2,1,4,5]", "why": "Leftover two nodes stay."},
            {"input": "[1,2,3,4,5]\n1", "expected": "[1,2,3,4,5]", "why": "k = 1 is a no-op."},
            {"input": "[1]\n1", "expected": "[1]", "why": "One node.",},
        ],
        "interview_script": [
            "I reverse the list k nodes at a time, and a short last group stays as it is.",
            "I could reverse a group and recurse on the rest. That is O(n/k) stack.",
            "The key point is to count k nodes ahead before I touch a group. If the scout hits null, I leave those nodes.",
            "I reverse the group in place, hook the previous tail onto the new head, and move the tail to the old first node.",
            "That is O(n) time and O(1) space. I will test k = 1, a leftover group, and a list whose length is a multiple of k.",
        ],
        "follow_ups": [
            {
                "question": "Also reverse the leftover group.",
                "answer": "Drop the scout-null stop, or reverse the tail with the same three pointers when the scout fails.",
            },
            {
                "question": "Reverse every other group.",
                "answer": "After reversing a group, skip the next k nodes with the scout and do not reverse them.",
            },
            {
                "question": "k = 1 or k = n.",
                "answer": "k = 1 leaves the list. k = n is Reverse Linked List on the whole chain.",
            },
        ],
        "related_slugs": ["lc-206", "lc-19", "lc-143"],
    },
]
