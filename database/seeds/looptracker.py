"""LoopTracker 56-day coding catalog.

Canonical match key is LeetCode ID, stored as slug ``lc-{id}``.
Overlapping Microsoft Interview specs are reused; existing DB rows are never overwritten.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import PROBLEMS as MS_PROBLEMS
from database.seeds.microsoft_interview import TAGS as MS_TAGS
from database.seeds.microsoft_interview import _p
from database.seeds.microsoft_interview import leetcode_slug  # noqa: F401

# problems.md index order
LOOPTRACKER_IDS = [
    1, 3, 5, 11, 15, 20, 23, 25, 33, 39, 42, 49, 51, 53, 56, 57, 62, 72, 76, 79,
    84, 98, 102, 103, 124, 125, 127, 128, 133, 141, 146, 155, 160, 162, 198, 200,
    206, 207, 208, 210, 213, 215, 230, 236, 239, 253, 269, 297, 300, 322, 323,
    347, 355, 362, 380, 535, 560, 621, 721, 739, 743, 787, 895, 981, 1143,
]

ARRAY = "array"
STRING = "string"
STACK = "stack"
HEAP = "heap"
LINKED = "linked-list"
TREE = "tree"
DP = "dynamic-programming"
GRAPH = "graph"
INTERVALS = "intervals"
BACKTRACK = "backtracking"
DESIGN = "design"
TRIE = "trie"
GREEDY = "greedy"
UNION = "union-find"
SLIDING = "sliding-window"

EXTRA_TAGS = [
    ("Array", ARRAY),
    ("String", STRING),
    ("Stack", STACK),
    ("Heap", HEAP),
    ("Linked List", LINKED),
    ("Tree", TREE),
    ("Dynamic Programming", DP),
    ("Graph", GRAPH),
    ("Intervals", INTERVALS),
    ("Backtracking", BACKTRACK),
    ("Design", DESIGN),
    ("Trie", TRIE),
    ("Greedy", GREEDY),
    ("Union Find", UNION),
]

TAGS = list(dict.fromkeys([*MS_TAGS, *EXTRA_TAGS]))


def _with_starter(spec: dict, starter: str) -> dict:
    out = dict(spec)
    out["starter_code"] = starter if starter.endswith("\n") else starter + "\n"
    return out


_DESIGN_STARTERS = {
    146: """
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[][] args) {
        LRUCache cache = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "LRUCache" -> cache = new LRUCache(args[i][0]);
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
class LRUCache {
    public LRUCache(int capacity) {}
    public int get(int key) { return -1; }
    public void put(int key, int value) {}
}
""".strip(),
    155: """
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> stack.pop();
                case "top" -> out.add(stack.top());
                case "getMin" -> out.add(stack.getMin());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class MinStack {
    public MinStack() {}
    public void push(int val) {}
    public void pop() {}
    public int top() { return 0; }
    public int getMin() { return 0; }
}
""".strip(),
    208: """
import java.util.*;
class Solution {
    public String[] process(String[] operations, String[][] args) {
        Trie trie = new Trie();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert" -> trie.insert(args[i][0]);
                case "search" -> out.add(String.valueOf(trie.search(args[i][0])));
                case "startsWith" -> out.add(String.valueOf(trie.startsWith(args[i][0])));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class Trie {
    public Trie() {}
    public void insert(String word) {}
    public boolean search(String word) { return false; }
    public boolean startsWith(String prefix) { return false; }
}
""".strip(),
    297: """
class Solution {
    public TreeNode roundtrip(TreeNode root) {
        Codec codec = new Codec();
        return codec.deserialize(codec.serialize(root));
    }
}
class Codec {
    public String serialize(TreeNode root) { return ""; }
    public TreeNode deserialize(String data) { return null; }
}
""".strip(),
    355: """
import java.util.*;
class Solution {
    public String[] process(String[] operations, int[][] args) {
        Twitter twitter = new Twitter();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "postTweet" -> twitter.postTweet(args[i][0], args[i][1]);
                case "getNewsFeed" -> out.add(Helpers.format(twitter.getNewsFeed(args[i][0])));
                case "follow" -> twitter.follow(args[i][0], args[i][1]);
                case "unfollow" -> twitter.unfollow(args[i][0], args[i][1]);
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class Twitter {
    public Twitter() {}
    public void postTweet(int userId, int tweetId) {}
    public List<Integer> getNewsFeed(int userId) { return List.of(); }
    public void follow(int followerId, int followeeId) {}
    public void unfollow(int followerId, int followeeId) {}
}
""".strip(),
    362: """
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[] values) {
        HitCounter counter = new HitCounter();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "hit" -> counter.hit(values[i]);
                case "getHits" -> out.add(counter.getHits(values[i]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class HitCounter {
    public HitCounter() {}
    public void hit(int timestamp) {}
    public int getHits(int timestamp) { return 0; }
}
""".strip(),
    380: """
import java.util.*;
class Solution {
    public String[] process(String[] operations, int[] values) {
        RandomizedSet set = new RandomizedSet();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert" -> out.add(String.valueOf(set.insert(values[i])));
                case "remove" -> out.add(String.valueOf(set.remove(values[i])));
                case "getRandom" -> out.add(String.valueOf(set.getRandom()));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class RandomizedSet {
    public RandomizedSet() {}
    public boolean insert(int val) { return false; }
    public boolean remove(int val) { return false; }
    public int getRandom() { return 0; }
}
""".strip(),
    535: """
class Solution {
    public String roundtrip(String url) {
        Codec codec = new Codec();
        return codec.decode(codec.encode(url));
    }
}
class Codec {
    public String encode(String longUrl) { return longUrl; }
    public String decode(String shortUrl) { return shortUrl; }
}
""".strip(),
    895: """
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[] values) {
        FreqStack stack = new FreqStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> out.add(stack.pop());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class FreqStack {
    public FreqStack() {}
    public void push(int val) {}
    public int pop() { return 0; }
}
""".strip(),
    981: """
import java.util.*;
class Solution {
    public String[] process(String[] operations, String[] keys, String[] values, int[] timestamps) {
        TimeMap store = new TimeMap();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "set" -> store.set(keys[i], values[i], timestamps[i]);
                case "get" -> out.add(store.get(keys[i], timestamps[i]));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class TimeMap {
    public TimeMap() {}
    public void set(String key, String value, int timestamp) {}
    public String get(String key, int timestamp) { return ""; }
}
""".strip(),
    141: """
class Solution {
    public boolean hasCycle(int[] values, int pos) {
        return detect(build(values, pos));
    }
    public boolean detect(ListNode head) {
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
""".strip(),
    160: """
class Solution {
    public int getIntersectionNode(int[] a, int[] b, int skipA, int skipB) {
        ListNode[] heads = build(a, b, skipA, skipB);
        ListNode node = getIntersection(heads[0], heads[1]);
        return node == null ? 0 : node.val;
    }
    public ListNode getIntersection(ListNode headA, ListNode headB) {
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
""".strip(),
}


EXTRA_PROBLEMS: list[dict] = [
    _p(
        5, "Longest Palindromic Substring", "MEDIUM", STRING,
        "longestPalindrome", [("s", "String")], "String",
        "Return the longest palindromic substring of `s`. If there are several answers of the same length, "
        "return the leftmost one.",
        [
            {"input": '"cbbd"', "expected": '"bb"', "hidden": False, "order": 1},
            {"input": '"a"', "expected": '"a"', "hidden": False, "order": 2},
            {"input": '"ac"', "expected": '"a"', "hidden": False, "order": 3},
            {"input": '"aaaa"', "expected": '"aaaa"', "hidden": True, "order": 4},
        ],
        constraints="1 <= s.length <= 1000\ns consists of digits and English letters",
        input_format="A quoted string",
        output_format="A quoted substring",
    ),
    _p(
        20, "Valid Parentheses", "EASY", STACK,
        "isValid", [("s", "String")], "boolean",
        "Return true if `s` is a valid parentheses string. Brackets must close in the correct order: "
        "`()`, `{}`, and `[]`.",
        [
            {"input": '"()"', "expected": "true", "hidden": False, "order": 1},
            {"input": '"()[]{}"', "expected": "true", "hidden": False, "order": 2},
            {"input": '"(]"', "expected": "false", "hidden": False, "order": 3},
            {"input": '"([)]"', "expected": "false", "hidden": True, "order": 4},
            {"input": '"{[]}"', "expected": "true", "hidden": True, "order": 5},
        ],
        constraints="1 <= s.length <= 10^4",
        input_format="A quoted string of brackets",
        output_format="true or false",
    ),
    _p(
        23, "Merge k Sorted Lists", "HARD", HEAP,
        "mergeKLists", [("lists", "ListNode[]")], "ListNode",
        "You are given an array of `k` sorted linked lists. Merge them into one sorted list and return its head.",
        [
            {"input": "[[1,4,5],[1,3,4],[2,6]]", "expected": "[1,1,2,3,4,4,5,6]", "hidden": False, "order": 1},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[[]]", "expected": "[]", "hidden": False, "order": 3},
            {"input": "[[],[1]]", "expected": "[1]", "hidden": True, "order": 4},
        ],
        constraints="k == lists.length\n0 <= k <= 10^4",
        input_format="An array of sorted lists, each a JSON array of integers",
        output_format="The merged list as a JSON array",
    ),
    _p(
        25, "Reverse Nodes in k-Group", "HARD", LINKED,
        "reverseKGroup", [("head", "ListNode"), ("k", "int")], "ListNode",
        "Reverse the nodes of a linked list `k` at a time and return the modified list. "
        "If the number of nodes is not a multiple of `k`, the remainder stays in the original order. "
        "You may not change node values, only the links.",
        [
            {"input": "[1,2,3,4,5]\n2", "expected": "[2,1,4,3,5]", "hidden": False, "order": 1},
            {"input": "[1,2,3,4,5]\n3", "expected": "[3,2,1,4,5]", "hidden": False, "order": 2},
            {"input": "[1,2,3,4,5]\n1", "expected": "[1,2,3,4,5]", "hidden": True, "order": 3},
            {"input": "[1]\n1", "expected": "[1]", "hidden": True, "order": 4},
        ],
        constraints="The number of nodes is in [1, 5000]\n1 <= k <= number of nodes",
        input_format="Line 1: list values\nLine 2: k",
        output_format="The reversed list as a JSON array",
    ),
    _p(
        39, "Combination Sum", "MEDIUM", BACKTRACK,
        "combinationSum", [("candidates", "int[]"), ("target", "int")], "List<List<Integer>>",
        "Return every unique combination of `candidates` that sums to `target`. A number may be chosen "
        "unlimited times. Combinations may be returned in any order.",
        [
            {"input": "[2,3,6,7]\n7", "expected": "[[2,2,3],[7]]", "hidden": False, "order": 1},
            {"input": "[2,3,5]\n8", "expected": "[[2,2,2,2],[2,3,3],[3,5]]", "hidden": False, "order": 2},
            {"input": "[2]\n1", "expected": "[]", "hidden": False, "order": 3},
        ],
        compare="any_order",
        constraints="1 <= candidates.length <= 30\nAll candidates are unique",
        input_format="Line 1: candidates\nLine 2: target",
        output_format="A list of combinations",
    ),
    _p(
        51, "N-Queens", "HARD", BACKTRACK,
        "solveNQueens", [("n", "int")], "List<List<String>>",
        "Place `n` queens on an n x n board so that no two queens attack each other. "
        "Return every distinct board. Each board is n strings of length n using `'Q'` and `'.'`. "
        "Order of boards does not matter.",
        [
            {
                "input": "4",
                "expected": '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]',
                "hidden": False,
                "order": 1,
            },
            {"input": "1", "expected": '[["Q"]]', "hidden": False, "order": 2},
        ],
        compare="any_order",
        constraints="1 <= n <= 9",
        input_format="An integer n",
        output_format="A list of boards",
    ),
    _p(
        53, "Maximum Subarray", "MEDIUM", ARRAY,
        "maxSubArray", [("nums", "int[]")], "int",
        "Return the largest sum of any contiguous subarray of `nums`. The array is never empty.",
        [
            {"input": "[-2,1,-3,4,-1,2,1,-5,4]", "expected": "6", "hidden": False, "order": 1},
            {"input": "[1]", "expected": "1", "hidden": False, "order": 2},
            {"input": "[5,4,-1,7,8]", "expected": "23", "hidden": False, "order": 3},
            {"input": "[-1]", "expected": "-1", "hidden": True, "order": 4},
        ],
        constraints="1 <= nums.length <= 10^5",
        input_format="Integer array nums",
        output_format="The maximum sum",
    ),
    _p(
        56, "Merge Intervals", "MEDIUM", INTERVALS,
        "merge", [("intervals", "int[][]")], "int[][]",
        "Given an array of `intervals` where `intervals[i] = [start, end]`, merge all overlapping intervals "
        "and return the non-overlapping covering set, sorted by start.",
        [
            {"input": "[[1,3],[2,6],[8,10],[15,18]]", "expected": "[[1,6],[8,10],[15,18]]", "hidden": False, "order": 1},
            {"input": "[[1,4],[4,5]]", "expected": "[[1,5]]", "hidden": False, "order": 2},
            {"input": "[[1,4],[0,4]]", "expected": "[[0,4]]", "hidden": True, "order": 3},
        ],
        constraints="1 <= intervals.length <= 10^4",
        input_format="A JSON array of [start, end] pairs",
        output_format="Merged intervals",
    ),
    _p(
        57, "Insert Interval", "MEDIUM", INTERVALS,
        "insert", [("intervals", "int[][]"), ("newInterval", "int[]")], "int[][]",
        "`intervals` is a sorted, non-overlapping list of `[start, end]`. Insert `newInterval` and merge "
        "if needed. Return the resulting list still sorted by start.",
        [
            {"input": "[[1,3],[6,9]]\n[2,5]", "expected": "[[1,5],[6,9]]", "hidden": False, "order": 1},
            {"input": "[[1,2],[3,5],[6,7],[8,10],[12,16]]\n[4,8]", "expected": "[[1,2],[3,10],[12,16]]", "hidden": False, "order": 2},
            {"input": "[]\n[5,7]", "expected": "[[5,7]]", "hidden": True, "order": 3},
        ],
        constraints="0 <= intervals.length <= 10^4",
        input_format="Line 1: intervals\nLine 2: newInterval",
        output_format="The updated interval list",
    ),
    _p(
        62, "Unique Paths", "MEDIUM", DP,
        "uniquePaths", [("m", "int"), ("n", "int")], "int",
        "A robot starts at the top-left of an `m x n` grid and may only move right or down. "
        "Return the number of unique paths to the bottom-right cell.",
        [
            {"input": "3\n7", "expected": "28", "hidden": False, "order": 1},
            {"input": "3\n2", "expected": "3", "hidden": False, "order": 2},
            {"input": "1\n1", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= m, n <= 100",
        input_format="Line 1: m\nLine 2: n",
        output_format="An integer count",
    ),
    _p(
        72, "Edit Distance", "MEDIUM", DP,
        "minDistance", [("word1", "String"), ("word2", "String")], "int",
        "Return the minimum number of insertions, deletions, or substitutions needed to turn `word1` into `word2`.",
        [
            {"input": '"horse"\n"ros"', "expected": "3", "hidden": False, "order": 1},
            {"input": '"intention"\n"execution"', "expected": "5", "hidden": False, "order": 2},
            {"input": '""\n"a"', "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="0 <= word1.length, word2.length <= 500",
        input_format="Line 1: word1\nLine 2: word2",
        output_format="An integer distance",
    ),
    _p(
        79, "Word Search", "MEDIUM", BACKTRACK,
        "exist", [("board", "String[]"), ("word", "String")], "boolean",
        "Given a 2D board of characters (each row is a string of equal length) and a `word`, return true "
        "if `word` exists in the grid. You may move 4-directionally and may not reuse a cell in the same path.",
        [
            {"input": '["ABCE","SFCS","ADEE"]\n"ABCCED"', "expected": "true", "hidden": False, "order": 1},
            {"input": '["ABCE","SFCS","ADEE"]\n"SEE"', "expected": "true", "hidden": False, "order": 2},
            {"input": '["ABCE","SFCS","ADEE"]\n"ABCB"', "expected": "false", "hidden": False, "order": 3},
        ],
        constraints="1 <= board.length, board[i].length <= 6",
        input_format="Line 1: board rows\nLine 2: word",
        output_format="true or false",
    ),
    _p(
        84, "Largest Rectangle in Histogram", "HARD", STACK,
        "largestRectangleArea", [("heights", "int[]")], "int",
        "Each bar in the histogram has width 1 and height `heights[i]`. Return the area of the largest rectangle.",
        [
            {"input": "[2,1,5,6,2,3]", "expected": "10", "hidden": False, "order": 1},
            {"input": "[2,4]", "expected": "4", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= heights.length <= 10^5",
        input_format="Integer array heights",
        output_format="An integer area",
    ),
    _p(
        103, "Binary Tree Zigzag Level Order Traversal", "MEDIUM", TREE,
        "zigzagLevelOrder", [("root", "TreeNode")], "List<List<Integer>>",
        "Return the zigzag level order of a binary tree: left-to-right on even depths, right-to-left on odd depths "
        "(root depth is 0).",
        [
            {"input": "[3,9,20,null,null,15,7]", "expected": "[[3],[20,9],[15,7]]", "hidden": False, "order": 1},
            {"input": "[1]", "expected": "[[1]]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
        ],
        constraints="0 <= number of nodes <= 2000",
        input_format="Level-order tree array",
        output_format="A list of levels",
    ),
    _p(
        141, "Linked List Cycle", "EASY", LINKED,
        "hasCycle", [("values", "int[]"), ("pos", "int")], "boolean",
        "Return true if the singly linked list contains a cycle.\n\n"
        "The judge cannot express a cycle as a plain array, so you receive the node values and `pos`, "
        "the index where the tail connects (`-1` if none). A helper builds the list; implement `detect`.",
        [
            {"input": "[3,2,0,-4]\n1", "expected": "true", "hidden": False, "order": 1},
            {"input": "[1,2]\n0", "expected": "true", "hidden": False, "order": 2},
            {"input": "[1]\n-1", "expected": "false", "hidden": False, "order": 3},
            {"input": "[]\n-1", "expected": "false", "hidden": True, "order": 4},
        ],
        constraints="0 <= list length <= 10^4\npos is -1 or a valid index",
        input_format="Line 1: node values\nLine 2: pos",
        output_format="true or false",
    ),
    _p(
        146, "LRU Cache", "MEDIUM", DESIGN,
        "process", [("operations", "String[]"), ("args", "int[][]")], "int[]",
        "Design a cache with capacity `capacity` that supports `get(key)` and `put(key, value)` in O(1) "
        "average time. When the cache is full, `put` evicts the least recently used key. `get` returns -1 "
        "on a miss.\n\n"
        "`process(operations, args)` runs a sequence of constructor / put / get calls. Return only the `get` results.",
        [
            {
                "input": '["LRUCache","put","put","get","put","get","put","get","get","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]',
                "expected": "[1,-1,-1,3,4]",
                "hidden": False,
                "order": 1,
            },
            {
                "input": '["LRUCache","put","get"]\n[[1],[2,1],[2]]',
                "expected": "[1]",
                "hidden": False,
                "order": 2,
            },
        ],
        constraints="1 <= capacity <= 3000\nAt most 2 * 10^4 calls",
        input_format="Line 1: operations\nLine 2: integer argument rows",
        output_format="Integer array of get results",
    ),
    _p(
        155, "Min Stack", "MEDIUM", STACK,
        "process", [("operations", "String[]"), ("values", "int[]")], "int[]",
        "Design a stack that supports push, pop, top, and retrieving the current minimum in constant time.\n\n"
        "`process(operations, values)` runs those methods. Return the results of `top` and `getMin` only. "
        "`values[i]` is the argument for `push`, or 0 otherwise.",
        [
            {
                "input": '["MinStack","push","push","push","getMin","pop","top","getMin"]\n[0,-2,0,-3,0,0,0,0]',
                "expected": "[-3,0,-2]",
                "hidden": False,
                "order": 1,
            },
            {
                "input": '["MinStack","push","push","getMin","top"]\n[0,1,2,0,0]',
                "expected": "[1,2]",
                "hidden": False,
                "order": 2,
            },
        ],
        constraints="1 <= operations.length <= 3 * 10^4",
        input_format="Line 1: operations\nLine 2: values",
        output_format="Integer array of recorded results",
    ),
    _p(
        160, "Intersection of Two Linked Lists", "EASY", LINKED,
        "getIntersectionNode", [("a", "int[]"), ("b", "int[]"), ("skipA", "int"), ("skipB", "int")], "int",
        "Return the value of the first shared node of two singly linked lists, or `0` if they do not intersect.\n\n"
        "`a` is list A. `skipA` is the index in A where the shared suffix starts (`-1` if none). "
        "`skipB` is the length of B's unique prefix. A helper builds the lists with shared node objects.",
        [
            {"input": "[4,1,8,4,5]\n[5,6,1,8,4,5]\n2\n3", "expected": "8", "hidden": False, "order": 1},
            {"input": "[1,9,1,2,4]\n[3,2,4]\n3\n1", "expected": "2", "hidden": False, "order": 2},
            {"input": "[2,6,4]\n[1,5]\n-1\n2", "expected": "0", "hidden": False, "order": 3},
        ],
        constraints="1 <= list lengths <= 3 * 10^4",
        input_format="Line 1: list A\nLine 2: list B values (prefix + suffix)\nLine 3: skipA\nLine 4: skipB",
        output_format="The intersecting node value, or 0",
    ),
    _p(
        198, "House Robber", "MEDIUM", DP,
        "rob", [("nums", "int[]")], "int",
        "Houses stand in a line. `nums[i]` is the money in house `i`. Adjacent houses cannot both be robbed. "
        "Return the maximum amount you can rob.",
        [
            {"input": "[1,2,3,1]", "expected": "4", "hidden": False, "order": 1},
            {"input": "[2,7,9,3,1]", "expected": "12", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= nums.length <= 100",
        input_format="Integer array nums",
        output_format="The maximum amount",
    ),
    _p(
        206, "Reverse Linked List", "EASY", LINKED,
        "reverseList", [("head", "ListNode")], "ListNode",
        "Reverse a singly linked list and return the new head.",
        [
            {"input": "[1,2,3,4,5]", "expected": "[5,4,3,2,1]", "hidden": False, "order": 1},
            {"input": "[1,2]", "expected": "[2,1]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 3},
        ],
        constraints="0 <= number of nodes <= 5000",
        input_format="A JSON array of node values",
        output_format="The reversed list",
    ),
    _p(
        208, "Implement Trie (Prefix Tree)", "MEDIUM", TRIE,
        "process", [("operations", "String[]"), ("args", "String[][]")], "String[]",
        "Implement a trie with `insert`, `search`, and `startsWith`.\n\n"
        "`process` runs a sequence of those methods (plus the constructor). Return the boolean results "
        "of `search` and `startsWith` as the strings `true` or `false`.",
        [
            {
                "input": '["Trie","insert","search","search","startsWith","insert","search"]\n[[],["apple"],["apple"],["app"],["app"],["app"],["app"]]',
                "expected": '["true","false","true","true"]',
                "hidden": False,
                "order": 1,
            },
            {
                "input": '["Trie","startsWith"]\n[[],["a"]]',
                "expected": '["false"]',
                "hidden": True,
                "order": 2,
            },
        ],
        constraints="1 <= word.length <= 2000\nAt most 3 * 10^4 calls",
        input_format="Line 1: operations\nLine 2: string argument rows",
        output_format="String array of boolean results",
    ),
    _p(
        213, "House Robber II", "MEDIUM", DP,
        "rob", [("nums", "int[]")], "int",
        "Houses stand in a circle: the first and last houses are adjacent. Adjacent houses cannot both be robbed. "
        "Return the maximum amount you can rob.",
        [
            {"input": "[2,3,2]", "expected": "3", "hidden": False, "order": 1},
            {"input": "[1,2,3,1]", "expected": "4", "hidden": False, "order": 2},
            {"input": "[1,2,3]", "expected": "3", "hidden": False, "order": 3},
        ],
        constraints="1 <= nums.length <= 100",
        input_format="Integer array nums",
        output_format="The maximum amount",
    ),
    _p(
        215, "Kth Largest Element in an Array", "MEDIUM", HEAP,
        "findKthLargest", [("nums", "int[]"), ("k", "int")], "int",
        "Return the `k`-th largest element in `nums` (1-indexed). It is the k-th element in sorted descending order, "
        "not a distinct-count.",
        [
            {"input": "[3,2,1,5,6,4]\n2", "expected": "5", "hidden": False, "order": 1},
            {"input": "[3,2,3,1,2,4,5,5,6]\n4", "expected": "4", "hidden": False, "order": 2},
            {"input": "[1]\n1", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= k <= nums.length <= 10^5",
        input_format="Line 1: nums\nLine 2: k",
        output_format="An integer",
    ),
    _p(
        236, "Lowest Common Ancestor of a Binary Tree", "MEDIUM", TREE,
        "lowestCommonAncestor", [("root", "TreeNode"), ("p", "int"), ("q", "int")], "int",
        "Return the value of the lowest common ancestor of nodes `p` and `q` in a binary tree. "
        "A node may be an ancestor of itself. `p` and `q` are values that exist in the tree (not node references).",
        [
            {"input": "[3,5,1,6,2,0,8,null,null,7,4]\n5\n1", "expected": "3", "hidden": False, "order": 1},
            {"input": "[3,5,1,6,2,0,8,null,null,7,4]\n5\n4", "expected": "5", "hidden": False, "order": 2},
            {"input": "[1,2]\n1\n2", "expected": "1", "hidden": False, "order": 3},
        ],
        constraints="2 <= number of nodes <= 10^5\nAll values are unique\np != q",
        input_format="Line 1: tree\nLine 2: p\nLine 3: q",
        output_format="The ancestor value",
    ),
    _p(
        239, "Sliding Window Maximum", "HARD", SLIDING,
        "maxSlidingWindow", [("nums", "int[]"), ("k", "int")], "int[]",
        "Return an array of the maximum value in every contiguous window of size `k` as the window slides "
        "from left to right.",
        [
            {"input": "[1,3,-1,-3,5,3,6,7]\n3", "expected": "[3,3,5,5,6,7]", "hidden": False, "order": 1},
            {"input": "[1]\n1", "expected": "[1]", "hidden": False, "order": 2},
            {"input": "[9,11]\n2", "expected": "[11]", "hidden": True, "order": 3},
        ],
        constraints="1 <= nums.length <= 10^5\n1 <= k <= nums.length",
        input_format="Line 1: nums\nLine 2: k",
        output_format="An integer array of window maxima",
    ),
    _p(
        253, "Meeting Rooms II", "MEDIUM", HEAP,
        "minMeetingRooms", [("intervals", "int[][]")], "int",
        "Given meeting time intervals `[start, end]`, return the minimum number of conference rooms required.",
        [
            {"input": "[[0,30],[5,10],[15,20]]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[[7,10],[2,4]]", "expected": "1", "hidden": False, "order": 2},
            {"input": "[[1,5],[8,9],[8,9]]", "expected": "2", "hidden": True, "order": 3},
        ],
        constraints="1 <= intervals.length <= 10^4",
        input_format="A JSON array of [start, end] pairs",
        output_format="An integer room count",
    ),
    _p(
        269, "Alien Dictionary", "HARD", GRAPH,
        "alienOrder", [("words", "String[]")], "String",
        "A sorted dictionary of an alien language is given as `words`. Derive the order of the unique letters. "
        "Return any valid order as a string, or `\"\"` if the input is invalid. Tests here have a unique order.",
        [
            {"input": '["wrt","wrf","er","ett","rftt"]', "expected": '"wertf"', "hidden": False, "order": 1},
            {"input": '["z","x"]', "expected": '"zx"', "hidden": False, "order": 2},
            {"input": '["z","x","z"]', "expected": '""', "hidden": False, "order": 3},
        ],
        constraints="1 <= words.length <= 100\nwords[i] consists of lowercase English letters",
        input_format="A JSON array of words",
        output_format="A quoted letter-order string, or empty",
    ),
    _p(
        297, "Serialize and Deserialize Binary Tree", "HARD", TREE,
        "roundtrip", [("root", "TreeNode")], "TreeNode",
        "Design an algorithm to serialize and deserialize a binary tree. "
        "`roundtrip` must return a tree identical to the input after `serialize` then `deserialize`.",
        [
            {"input": "[1,2,3,null,null,4,5]", "expected": "[1,2,3,null,null,4,5]", "hidden": False, "order": 1},
            {"input": "[]", "expected": "[]", "hidden": False, "order": 2},
            {"input": "[1]", "expected": "[1]", "hidden": True, "order": 3},
        ],
        constraints="The number of nodes is in [0, 10^4]",
        input_format="Level-order tree array",
        output_format="The same tree in level order",
    ),
    _p(
        300, "Longest Increasing Subsequence", "MEDIUM", DP,
        "lengthOfLIS", [("nums", "int[]")], "int",
        "Return the length of the longest strictly increasing subsequence of `nums`.",
        [
            {"input": "[10,9,2,5,3,7,101,18]", "expected": "4", "hidden": False, "order": 1},
            {"input": "[0,1,0,3,2,3]", "expected": "4", "hidden": False, "order": 2},
            {"input": "[7,7,7,7,7,7,7]", "expected": "1", "hidden": False, "order": 3},
        ],
        constraints="1 <= nums.length <= 2500",
        input_format="Integer array nums",
        output_format="An integer length",
    ),
    _p(
        322, "Coin Change", "MEDIUM", DP,
        "coinChange", [("coins", "int[]"), ("amount", "int")], "int",
        "Return the fewest coins needed to make `amount`. You may use each coin denomination unlimited times. "
        "Return -1 if it is impossible.",
        [
            {"input": "[1,2,5]\n11", "expected": "3", "hidden": False, "order": 1},
            {"input": "[2]\n3", "expected": "-1", "hidden": False, "order": 2},
            {"input": "[1]\n0", "expected": "0", "hidden": False, "order": 3},
        ],
        constraints="1 <= coins.length <= 12\n0 <= amount <= 10^4",
        input_format="Line 1: coins\nLine 2: amount",
        output_format="The fewest coins, or -1",
    ),
    _p(
        323, "Number of Connected Components in an Undirected Graph", "MEDIUM", UNION,
        "countComponents", [("n", "int"), ("edges", "int[][]")], "int",
        "There are `n` nodes labeled 0 to n - 1 and an undirected edge list. Return the number of connected components.",
        [
            {"input": "5\n[[0,1],[1,2],[3,4]]", "expected": "2", "hidden": False, "order": 1},
            {"input": "5\n[[0,1],[1,2],[2,3],[3,4]]", "expected": "1", "hidden": False, "order": 2},
            {"input": "1\n[]", "expected": "1", "hidden": True, "order": 3},
        ],
        constraints="1 <= n <= 2000",
        input_format="Line 1: n\nLine 2: edges",
        output_format="An integer count",
    ),
    _p(
        355, "Design Twitter", "MEDIUM", DESIGN,
        "process", [("operations", "String[]"), ("args", "int[][]")], "String[]",
        "Design a simplified Twitter: post a tweet, retrieve a user's 10 most recent tweets in their news feed "
        "(their tweets plus people they follow, newest first), follow, and unfollow.\n\n"
        "`process` runs those methods. Return only the news feeds, each formatted as a JSON integer array.",
        [
            {
                "input": '["Twitter","postTweet","getNewsFeed","follow","postTweet","getNewsFeed","unfollow","getNewsFeed"]\n[[],[1,5],[1],[1,2],[2,6],[1],[1,2],[1]]',
                "expected": '["[5]","[6,5]","[5]"]',
                "hidden": False,
                "order": 1,
            },
        ],
        constraints="1 <= userId, tweetId <= 500\nAt most 10^4 calls",
        input_format="Line 1: operations\nLine 2: integer argument rows",
        output_format="String array of news feeds",
    ),
    _p(
        362, "Design Hit Counter", "MEDIUM", DESIGN,
        "process", [("operations", "String[]"), ("values", "int[]")], "int[]",
        "Count hits in a sliding 300-second window. `hit(timestamp)` records a hit; "
        "`getHits(timestamp)` returns how many hits occurred in the past 300 seconds (inclusive). "
        "Timestamps are strictly increasing.\n\n"
        "Return only the `getHits` results.",
        [
            {
                "input": '["HitCounter","hit","hit","hit","getHits","hit","getHits","getHits"]\n[0,1,2,3,4,300,300,301]',
                "expected": "[3,4,3]",
                "hidden": False,
                "order": 1,
            },
        ],
        constraints="1 <= timestamp <= 2 * 10^9",
        input_format="Line 1: operations\nLine 2: timestamps (0 for the constructor)",
        output_format="Integer array of getHits results",
    ),
    _p(
        380, "Insert Delete GetRandom O(1)", "MEDIUM", DESIGN,
        "process", [("operations", "String[]"), ("values", "int[]")], "String[]",
        "Implement a set with `insert`, `remove`, and `getRandom` in average O(1) time. "
        "`getRandom` returns each stored value with equal probability.\n\n"
        "Return the boolean results of insert/remove as `true`/`false` and the integer from `getRandom` as a string. "
        "Tests only call `getRandom` when the set has one element.",
        [
            {
                "input": '["RandomizedSet","insert","getRandom","insert","remove","getRandom"]\n[0,1,0,2,1,0]',
                "expected": '["true","1","true","true","2"]',
                "hidden": False,
                "order": 1,
            },
        ],
        constraints="At most 2 * 10^5 calls\n-2^31 <= val <= 2^31 - 1",
        input_format="Line 1: operations\nLine 2: values (0 when unused)",
        output_format="String array of results",
    ),
    _p(
        535, "Encode and Decode TinyURL", "MEDIUM", DESIGN,
        "roundtrip", [("url", "String")], "String",
        "Design encode/decode for TinyURL. `roundtrip` must return the original URL after encode then decode.",
        [
            {"input": '"https://leetcode.com/problems/design-tinyurl"', "expected": '"https://leetcode.com/problems/design-tinyurl"', "hidden": False, "order": 1},
            {"input": '"https://example.com/a/b"', "expected": '"https://example.com/a/b"', "hidden": True, "order": 2},
        ],
        constraints="1 <= url.length <= 10^4",
        input_format="A quoted URL",
        output_format="The same quoted URL",
    ),
    _p(
        621, "Task Scheduler", "MEDIUM", GREEDY,
        "leastInterval", [("tasks", "char[]"), ("n", "int")], "int",
        "CPU tasks are labeled A–Z. There must be at least `n` intervals between two tasks with the same label. "
        "Idle slots are allowed. Return the least intervals needed to finish every task.",
        [
            {"input": '["A","A","A","B","B","B"]\n2', "expected": "8", "hidden": False, "order": 1},
            {"input": '["A","C","A","B","D","B"]\n1', "expected": "6", "hidden": False, "order": 2},
            {"input": '["A","A","A","B","B","B"]\n3', "expected": "10", "hidden": False, "order": 3},
        ],
        constraints="1 <= tasks.length <= 10^4\n0 <= n <= 100",
        input_format="Line 1: tasks\nLine 2: n",
        output_format="An integer interval count",
    ),
    _p(
        721, "Accounts Merge", "MEDIUM", UNION,
        "accountsMerge", [("accounts", "List<List<String>>")], "List<List<String>>",
        "Each account is `[name, email1, email2, ...]`. Merge accounts that share an email. "
        "Return one row per merged person: the name followed by emails in sorted order. "
        "Groups may be returned in any order.",
        [
            {
                "input": '[["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]',
                "expected": '[["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]',
                "hidden": False,
                "order": 1,
            },
        ],
        compare="any_order",
        constraints="1 <= accounts.length <= 1000",
        input_format="A JSON array of accounts",
        output_format="Merged accounts, emails sorted within each row",
    ),
    _p(
        739, "Daily Temperatures", "MEDIUM", STACK,
        "dailyTemperatures", [("temperatures", "int[]")], "int[]",
        "For each day, return how many days you must wait until a warmer temperature. Use 0 if there is none.",
        [
            {"input": "[73,74,75,71,69,72,76,73]", "expected": "[1,1,4,2,1,1,0,0]", "hidden": False, "order": 1},
            {"input": "[30,40,50,60]", "expected": "[1,1,1,0]", "hidden": False, "order": 2},
            {"input": "[30,60,90]", "expected": "[1,1,0]", "hidden": False, "order": 3},
        ],
        constraints="1 <= temperatures.length <= 10^5",
        input_format="Integer array temperatures",
        output_format="An integer array of waits",
    ),
    _p(
        743, "Network Delay Time", "MEDIUM", GRAPH,
        "networkDelayTime", [("times", "int[][]"), ("n", "int"), ("k", "int")], "int",
        "`times[i] = [u, v, w]` is a directed edge from `u` to `v` with weight `w`. "
        "Send a signal from node `k`. Return how long it takes for every node to receive it, or -1 if impossible. "
        "Nodes are labeled 1 to n.",
        [
            {"input": "[[2,1,1],[2,3,1],[3,4,1]]\n4\n2", "expected": "2", "hidden": False, "order": 1},
            {"input": "[[1,2,1]]\n2\n1", "expected": "1", "hidden": False, "order": 2},
            {"input": "[[1,2,1]]\n2\n2", "expected": "-1", "hidden": False, "order": 3},
        ],
        constraints="1 <= n <= 100",
        input_format="Line 1: times\nLine 2: n\nLine 3: k",
        output_format="The delay, or -1",
    ),
    _p(
        787, "Cheapest Flights Within K Stops", "MEDIUM", GRAPH,
        "findCheapestPrice", [("n", "int"), ("flights", "int[][]"), ("src", "int"), ("dst", "int"), ("k", "int")], "int",
        "`flights[i] = [from, to, price]`. Return the cheapest price from `src` to `dst` with at most `k` stops, "
        "or -1 if no such route exists. Cities are labeled 0 to n - 1.",
        [
            {"input": "4\n[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]]\n0\n3\n1", "expected": "700", "hidden": False, "order": 1},
            {"input": "3\n[[0,1,100],[1,2,100],[0,2,500]]\n0\n2\n1", "expected": "200", "hidden": False, "order": 2},
            {"input": "3\n[[0,1,100],[1,2,100],[0,2,500]]\n0\n2\n0", "expected": "500", "hidden": False, "order": 3},
        ],
        constraints="1 <= n <= 100\n0 <= k < n",
        input_format="Line 1: n\nLine 2: flights\nLine 3: src\nLine 4: dst\nLine 5: k",
        output_format="The cheapest price, or -1",
    ),
    _p(
        895, "Maximum Frequency Stack", "HARD", DESIGN,
        "process", [("operations", "String[]"), ("values", "int[]")], "int[]",
        "Design a frequency stack: `push` adds a value; `pop` removes the most frequent value, breaking ties "
        "by the most recently pushed of those values.\n\n"
        "Return only the `pop` results. `values[i]` is the push argument, or 0 for pop/constructor.",
        [
            {
                "input": '["FreqStack","push","push","push","push","push","push","pop","pop","pop","pop"]\n[0,5,7,5,7,4,5,0,0,0,0]',
                "expected": "[5,7,5,4]",
                "hidden": False,
                "order": 1,
            },
        ],
        constraints="0 <= val <= 10^9\nAt most 2 * 10^4 calls",
        input_format="Line 1: operations\nLine 2: values",
        output_format="Integer array of pop results",
    ),
    _p(
        981, "Time Based Key-Value Store", "MEDIUM", DESIGN,
        "process", [("operations", "String[]"), ("keys", "String[]"), ("values", "String[]"), ("timestamps", "int[]")], "String[]",
        "Store timestamped string values. `set(key, value, timestamp)` writes a value. "
        "`get(key, timestamp)` returns the value with the largest timestamp <= the query, or `\"\"` if none. "
        "Sets for a key arrive in strictly increasing timestamps.\n\n"
        "Return only the `get` results. Unused slots may be empty strings / 0.",
        [
            {
                "input": '["TimeMap","set","get","get","set","get","get"]\n["","foo","foo","foo","foo","foo","foo"]\n["","bar","","","bar2","",""]\n[0,1,1,3,4,4,5]',
                "expected": '["bar","bar","bar2","bar2"]',
                "hidden": False,
                "order": 1,
            },
        ],
        constraints="1 <= key.length, value.length <= 100\n1 <= timestamp <= 10^7",
        input_format="Line 1: operations\nLine 2: keys\nLine 3: values\nLine 4: timestamps",
        output_format="String array of get results",
    ),
    _p(
        1143, "Longest Common Subsequence", "MEDIUM", DP,
        "longestCommonSubsequence", [("text1", "String"), ("text2", "String")], "int",
        "Return the length of the longest common subsequence of `text1` and `text2`.",
        [
            {"input": '"abcde"\n"ace"', "expected": "3", "hidden": False, "order": 1},
            {"input": '"abc"\n"abc"', "expected": "3", "hidden": False, "order": 2},
            {"input": '"abc"\n"def"', "expected": "0", "hidden": False, "order": 3},
        ],
        constraints="1 <= text1.length, text2.length <= 1000",
        input_format="Line 1: text1\nLine 2: text2",
        output_format="An integer length",
    ),
]


def catalog() -> list[dict]:
    by_id = {spec["leetcode_id"]: spec for spec in MS_PROBLEMS}
    for spec in EXTRA_PROBLEMS:
        starter = _DESIGN_STARTERS.get(spec["leetcode_id"])
        by_id[spec["leetcode_id"]] = _with_starter(spec, starter) if starter else spec
    missing = [leetcode_id for leetcode_id in LOOPTRACKER_IDS if leetcode_id not in by_id]
    if missing:
        raise RuntimeError(f"LoopTracker catalog is missing specs for {missing}")
    duplicates = [spec["leetcode_id"] for spec in EXTRA_PROBLEMS]
    if len(duplicates) != len(set(duplicates)):
        raise RuntimeError("LoopTracker extra catalog has duplicate LeetCode IDs")
    return [by_id[leetcode_id] for leetcode_id in LOOPTRACKER_IDS]


PROBLEMS = catalog()
