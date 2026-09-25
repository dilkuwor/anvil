"""Frequently asked Microsoft problems that no other catalog module covers.

Same shape as ``fang_extra``: every problem carries its reference solution, complexity target
and progressive hints inline, and every one compiles and passes its own tests (see
``backend/tests/test_problem_catalog.py``).

Three problems do not fit the judge's built-in types, so they are adapted the same way as the
existing design problems:

* 348 and 173 are design problems driven by a ``process`` method that replays the operations.
* 116 and 430 need their own ``Node`` class. The starter code converts the judge's input into
  that class, calls the method the learner writes, and reads the answer back out.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

MATH = "math"
MATRIX = "matrix"
LINKED = "linked-list"
TREE = "tree"
BST = "trees-bst"
BIN = "binary-search"
DESIGN = "design"


def _with_starter(spec: dict, starter: str) -> dict:
    out = dict(spec)
    out["starter_code"] = starter.strip() + "\n"
    return out


def _board(rows: list[str]) -> str:
    """Render a 9x9 Sudoku board written as nine 9-character strings."""
    return "[" + ",".join("[" + ",".join(f'"{cell}"' for cell in row) + "]" for row in rows) + "]"


_SUDOKU_VALID = [
    "53..7....",
    "6..195...",
    ".98....6.",
    "8...6...3",
    "4..8.3..1",
    "7...2...6",
    ".6....28.",
    "...419..5",
    "....8..79",
]
_SUDOKU_COLUMN_CLASH = ["8" + _SUDOKU_VALID[0][1:], *_SUDOKU_VALID[1:]]
_SUDOKU_ROW_CLASH = ["11.......", *["........."] * 8]
_SUDOKU_BOX_CLASH = ["1........", ".1.......", *["........."] * 7]
_SUDOKU_EMPTY = ["........."] * 9


_TIC_TAC_TOE_DRIVER = """
import java.util.*;

class Solution {
    public int[] process(String[] operations, int[][] args) {
        TicTacToe game = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "TicTacToe" -> game = new TicTacToe(args[i][0]);
                case "move" -> out.add(game.move(args[i][0], args[i][1], args[i][2]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
"""

_BST_ITERATOR_DRIVER = """
import java.util.*;

class Solution {
    public List<Object> process(TreeNode root, String[] operations) {
        BSTIterator iterator = new BSTIterator(root);
        List<Object> out = new ArrayList<>();
        for (String operation : operations) {
            if (operation.equals("next")) out.add(iterator.next());
            else if (operation.equals("hasNext")) out.add(iterator.hasNext());
        }
        return out;
    }
}
"""

_NEXT_POINTER_DRIVER = """
import java.util.*;

class Node {
    public int val;
    public Node left;
    public Node right;
    public Node next;
    public Node(int val) { this.val = val; }
}

class Solution {
    // The judge calls this. It copies the tree into Node objects, calls your connect(),
    // then reads every level by following the next pointers. You do not need to change it.
    public List<List<Integer>> connectAndRead(TreeNode root) {
        Node connected = connect(copy(root));
        List<List<Integer>> levels = new ArrayList<>();
        for (Node start = connected; start != null; start = start.left) {
            List<Integer> level = new ArrayList<>();
            for (Node node = start; node != null; node = node.next) level.add(node.val);
            levels.add(level);
        }
        return levels;
    }

    private Node copy(TreeNode tree) {
        if (tree == null) return null;
        Node node = new Node(tree.val);
        node.left = copy(tree.left);
        node.right = copy(tree.right);
        return node;
    }
"""

_MULTILEVEL_DRIVER = """
import java.util.*;

class Node {
    public int val;
    public Node prev;
    public Node next;
    public Node child;
    public Node(int val) { this.val = val; }
}

class Solution {
    // The judge calls this. It builds the multilevel list from LeetCode's format, calls your
    // flatten(), checks every prev and child pointer, and returns the values in order.
    // You do not need to change it.
    public List<Integer> flattenAndRead(String serialized) {
        Node head = flatten(build(serialized));
        List<Integer> values = new ArrayList<>();
        Node before = null;
        for (Node node = head; node != null; node = node.next) {
            if (node.prev != before) throw new IllegalStateException("wrong prev pointer at " + node.val);
            if (node.child != null) throw new IllegalStateException("child pointer left set at " + node.val);
            values.add(node.val);
            before = node;
        }
        return values;
    }

    private Node build(String serialized) {
        String body = serialized.trim().replaceAll("^\\\\[|\\\\]$", "").trim();
        if (body.isEmpty()) return null;
        String[] tokens = body.split("\\\\s*,\\\\s*");
        Node head = null;
        List<Node> previousLevel = null;
        int i = 0;
        while (i < tokens.length) {
            int skip = 0;
            if (previousLevel != null) {
                while (i < tokens.length && tokens[i].equals("null")) {
                    skip++;
                    i++;
                }
            }
            List<Node> level = new ArrayList<>();
            while (i < tokens.length && !tokens[i].equals("null")) {
                Node node = new Node(Integer.parseInt(tokens[i]));
                if (!level.isEmpty()) {
                    Node last = level.get(level.size() - 1);
                    last.next = node;
                    node.prev = last;
                }
                level.add(node);
                i++;
            }
            if (level.isEmpty()) break;
            if (previousLevel == null) head = level.get(0);
            else previousLevel.get(skip).child = level.get(0);
            previousLevel = level;
            i++;
        }
        return head;
    }
"""


PROBLEMS: list[dict] = [
    _with_starter(
        _p(
            348, "Design Tic-Tac-Toe", "MEDIUM", DESIGN,
            "process", [("operations", "String[]"), ("args", "int[][]")], "int[]",
            "Design a Tic-Tac-Toe game played on an `n x n` board between two players.\n\n"
            "- `TicTacToe(n)` starts an empty board of size `n`.\n"
            "- `move(row, col, player)` places `player`'s mark (1 or 2) on an empty cell. It returns "
            "`0` if nobody has won yet, or the player number if this move completes a full row, "
            "column or diagonal.\n\n"
            "Every move is valid, and no moves happen after someone wins. Operations arrive as a "
            "list, with each call's arguments in `args`. Return the results of the `move` calls.",
            [
                {"input": '["TicTacToe","move","move","move","move","move","move","move"]\n'
                          "[[3],[0,0,1],[0,2,2],[2,2,1],[1,1,2],[2,0,1],[1,0,2],[2,1,1]]",
                 "expected": "[0,0,0,0,0,0,1]", "hidden": False, "order": 1},
                {"input": '["TicTacToe","move","move","move"]\n[[2],[0,0,1],[1,1,2],[0,1,1]]',
                 "expected": "[0,0,1]", "hidden": False, "order": 2},
                {"input": '["TicTacToe","move","move","move","move","move"]\n'
                          "[[3],[0,2,2],[0,0,1],[1,1,2],[0,1,1],[2,0,2]]",
                 "expected": "[0,0,0,0,2]", "hidden": True, "order": 3},
                {"input": '["TicTacToe","move","move","move","move","move"]\n'
                          "[[3],[0,0,1],[0,1,2],[1,0,1],[1,1,2],[2,0,1]]",
                 "expected": "[0,0,0,0,1]", "hidden": True, "order": 4},
            ],
            constraints="2 <= n <= 100\nplayer is 1 or 2\nAt most n^2 calls to move",
            input_format="Line 1: operations\nLine 2: arguments per operation",
            output_format="Array of move results",
            time="O(1) per move", space="O(n)",
            hints=[
                "Checking the whole row, column and both diagonals after every move costs O(n). "
                "You can do better by remembering counts.",
                "A player wins a row when all n cells in it are theirs. Keep one counter per row, "
                "one per column, and one for each diagonal.",
                "Add +1 for player 1 and -1 for player 2. A counter that reaches n or -n means "
                "that line is full of one player's marks.",
            ],
            solution=_TIC_TAC_TOE_DRIVER + r"""
class TicTacToe {
    private final int n;
    private final int[] rows;
    private final int[] cols;
    private int diagonal;
    private int antiDiagonal;

    public TicTacToe(int n) {
        this.n = n;
        this.rows = new int[n];
        this.cols = new int[n];
    }

    public int move(int row, int col, int player) {
        int add = player == 1 ? 1 : -1;
        rows[row] += add;
        cols[col] += add;
        if (row == col) diagonal += add;
        if (row + col == n - 1) antiDiagonal += add;
        if (Math.abs(rows[row]) == n || Math.abs(cols[col]) == n
                || Math.abs(diagonal) == n || Math.abs(antiDiagonal) == n) {
            return player;
        }
        return 0;
    }
}
""",
        ),
        _TIC_TAC_TOE_DRIVER + """
class TicTacToe {
    public TicTacToe(int n) {

    }

    public int move(int row, int col, int player) {
        return 0;
    }
}
""",
    ),
    _p(
        289, "Game of Life", "MEDIUM", MATRIX,
        "gameOfLife", [("board", "int[][]")], "int[][]",
        "The board is an `m x n` grid of cells. Each cell is live (`1`) or dead (`0`). Each cell "
        "looks at its eight neighbours (across, up, down and diagonal):\n\n"
        "1. A live cell with fewer than two live neighbours dies.\n"
        "2. A live cell with two or three live neighbours lives on.\n"
        "3. A live cell with more than three live neighbours dies.\n"
        "4. A dead cell with exactly three live neighbours becomes live.\n\n"
        "All cells change at the same moment. Update the board in place to its next state and "
        "return it.",
        [
            {"input": "[[0,1,0],[0,0,1],[1,1,1],[0,0,0]]", "expected": "[[0,0,0],[1,0,1],[0,1,1],[0,1,0]]",
             "hidden": False, "order": 1},
            {"input": "[[1,1],[1,0]]", "expected": "[[1,1],[1,1]]", "hidden": False, "order": 2},
            {"input": "[[1]]", "expected": "[[0]]", "hidden": True, "order": 3},
            {"input": "[[0,0,0],[1,1,1],[0,0,0]]", "expected": "[[0,1,0],[0,1,0],[0,1,0]]",
             "hidden": True, "order": 4},
        ],
        constraints="1 <= m, n <= 25\nboard[i][j] is 0 or 1",
        input_format="The board as a matrix",
        output_format="The board after one step",
        time="O(m * n)", space="O(1)",
        hints=[
            "If you write a new value straight into the board, the neighbours you check later "
            "see the new value instead of the old one.",
            "A copy of the board fixes that in O(m * n) extra space. To stay in place, each cell "
            "must hold its old state and its new state at the same time.",
            "Keep the old state in bit 0 and store the new state in bit 1. Count neighbours with "
            "`cell & 1`, then shift every cell right by one at the end.",
        ],
        solution=r"""
class Solution {
    public int[][] gameOfLife(int[][] board) {
        int rows = board.length;
        int cols = board[0].length;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                int live = 0;
                for (int dr = -1; dr <= 1; dr++) {
                    for (int dc = -1; dc <= 1; dc++) {
                        if (dr == 0 && dc == 0) continue;
                        int nr = r + dr;
                        int nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) live += board[nr][nc] & 1;
                    }
                }
                boolean alive = (board[r][c] & 1) == 1;
                if ((alive && (live == 2 || live == 3)) || (!alive && live == 3)) board[r][c] |= 2;
            }
        }
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) board[r][c] >>= 1;
        }
        return board;
    }
}
""",
    ),
    _p(
        36, "Valid Sudoku", "MEDIUM", MATRIX,
        "isValidSudoku", [("board", "String[][]")], "boolean",
        "Decide whether a partly filled `9 x 9` Sudoku board is valid. Only the filled cells need "
        "to follow the rules:\n\n"
        "1. Each row contains the digits 1-9 at most once.\n"
        "2. Each column contains the digits 1-9 at most once.\n"
        "3. Each of the nine `3 x 3` boxes contains the digits 1-9 at most once.\n\n"
        "Empty cells are `\".\"`. The board does not need to be solvable.\n\n"
        "(LeetCode passes a `char[][]`; here each cell is a one-character `String`.)",
        [
            {"input": _board(_SUDOKU_VALID), "expected": "true", "hidden": False, "order": 1},
            {"input": _board(_SUDOKU_COLUMN_CLASH), "expected": "false", "hidden": False, "order": 2},
            {"input": _board(_SUDOKU_ROW_CLASH), "expected": "false", "hidden": True, "order": 3},
            {"input": _board(_SUDOKU_BOX_CLASH), "expected": "false", "hidden": True, "order": 4},
            {"input": _board(_SUDOKU_EMPTY), "expected": "true", "hidden": True, "order": 5},
        ],
        constraints="board is 9 x 9\nEach cell is a digit 1-9 or \".\"",
        input_format="The board as a matrix of one-character strings",
        output_format="true or false",
        time="O(1), the board is always 81 cells", space="O(1)",
        hints=[
            "Check each filled cell against three things: its row, its column and its box.",
            "Keep a record of the digits already seen in every row, every column and every box. "
            "A digit seen twice in any of them makes the board invalid.",
            "The box number for cell (r, c) is `(r / 3) * 3 + c / 3`. Three 9 x 9 boolean tables "
            "are enough for one pass over the board.",
        ],
        solution=r"""
class Solution {
    public boolean isValidSudoku(String[][] board) {
        boolean[][] rows = new boolean[9][9];
        boolean[][] cols = new boolean[9][9];
        boolean[][] boxes = new boolean[9][9];
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                String cell = board[r][c];
                if (cell.equals(".")) continue;
                int digit = cell.charAt(0) - '1';
                int box = (r / 3) * 3 + c / 3;
                if (rows[r][digit] || cols[c][digit] || boxes[box][digit]) return false;
                rows[r][digit] = true;
                cols[c][digit] = true;
                boxes[box][digit] = true;
            }
        }
        return true;
    }
}
""",
    ),
    _p(
        61, "Rotate List", "MEDIUM", LINKED,
        "rotateRight", [("head", "ListNode"), ("k", "int")], "ListNode",
        "Given the `head` of a linked list, rotate the list to the right by `k` places. Each "
        "rotation moves the last node to the front.",
        [
            {"input": "[1,2,3,4,5]\n2", "expected": "[4,5,1,2,3]", "hidden": False, "order": 1},
            {"input": "[0,1,2]\n4", "expected": "[2,0,1]", "hidden": False, "order": 2},
            {"input": "[]\n0", "expected": "[]", "hidden": True, "order": 3},
            {"input": "[1,2]\n2", "expected": "[1,2]", "hidden": True, "order": 4},
            {"input": "[1]\n99", "expected": "[1]", "hidden": True, "order": 5},
        ],
        constraints="0 <= number of nodes <= 500\n-100 <= Node.val <= 100\n0 <= k <= 2 * 10^9",
        input_format="Line 1: the list\nLine 2: integer k",
        output_format="The rotated list",
        time="O(n)", space="O(1)",
        hints=[
            "Rotating a list of length n by n puts it back where it started, so only `k % n` "
            "rotations matter. k can be far larger than n.",
            "Rotating by k means the last k nodes move to the front. The new tail is the node "
            "at position n - k.",
            "Find the length and the old tail in one pass. Link the old tail to the head to make "
            "a ring, walk to the new tail, and cut the ring after it.",
        ],
        solution=r"""
class Solution {
    public ListNode rotateRight(ListNode head, int k) {
        if (head == null || head.next == null) return head;
        int length = 1;
        ListNode tail = head;
        while (tail.next != null) {
            tail = tail.next;
            length++;
        }
        k %= length;
        if (k == 0) return head;
        ListNode newTail = head;
        for (int i = 1; i < length - k; i++) newTail = newTail.next;
        ListNode newHead = newTail.next;
        newTail.next = null;
        tail.next = head;
        return newHead;
    }
}
""",
    ),
    _p(
        168, "Excel Sheet Column Title", "EASY", MATH,
        "convertToTitle", [("columnNumber", "int")], "String",
        "Given a column number, return its title as it appears in Excel: 1 is `A`, 26 is `Z`, "
        "27 is `AA`, 28 is `AB`, and so on.",
        [
            {"input": "1", "expected": '"A"', "hidden": False, "order": 1},
            {"input": "28", "expected": '"AB"', "hidden": False, "order": 2},
            {"input": "701", "expected": '"ZY"', "hidden": False, "order": 3},
            {"input": "26", "expected": '"Z"', "hidden": True, "order": 4},
            {"input": "52", "expected": '"AZ"', "hidden": True, "order": 5},
            {"input": "2147483647", "expected": '"FXSHRXW"', "hidden": True, "order": 6},
        ],
        constraints="1 <= columnNumber <= 2^31 - 1",
        input_format="Integer columnNumber",
        output_format="A quoted string",
        time="O(log n)", space="O(log n) for the output",
        hints=[
            "This looks like base 26, but there is no zero digit: the letters run from 1 (A) to "
            "26 (Z).",
            "Plain `n % 26` gives 0 for Z and breaks. Subtract 1 first, so A to Z become 0 to 25.",
            "Repeat: subtract 1, take `n % 26` as the last letter, divide by 26. The letters come "
            "out right to left, so reverse them at the end.",
        ],
        solution=r"""
class Solution {
    public String convertToTitle(int columnNumber) {
        StringBuilder title = new StringBuilder();
        int n = columnNumber;
        while (n > 0) {
            n--;
            title.append((char) ('A' + n % 26));
            n /= 26;
        }
        return title.reverse().toString();
    }
}
""",
    ),
    _with_starter(
        _p(
            173, "Binary Search Tree Iterator", "MEDIUM", DESIGN,
            "process", [("root", "TreeNode"), ("operations", "String[]")], "List<Object>",
            "Design an iterator that walks a binary search tree in order (smallest value first).\n\n"
            "- `BSTIterator(root)` starts before the smallest value.\n"
            "- `next()` moves to the next value and returns it.\n"
            "- `hasNext()` returns whether there is a next value.\n\n"
            "`next()` is only called when a next value exists. The iterator is built from `root`, "
            "then the operations run in order. Return the results of every call.\n\n"
            "Aim for `next()` and `hasNext()` in O(1) average time and O(h) memory, where h is the "
            "tree height.",
            [
                {"input": "[7,3,15,null,null,9,20]\n"
                          '["next","next","hasNext","next","hasNext","next","hasNext","next","hasNext"]',
                 "expected": "[3,7,true,9,true,15,true,20,false]", "hidden": False, "order": 1},
                {"input": '[1]\n["hasNext","next","hasNext"]', "expected": "[true,1,false]",
                 "hidden": False, "order": 2},
                {"input": '[2,1,3]\n["next","next","next","hasNext"]', "expected": "[1,2,3,false]",
                 "hidden": True, "order": 3},
                {"input": '[5,3,null,2,null,1]\n["next","next","next","next","hasNext"]',
                 "expected": "[1,2,3,5,false]", "hidden": True, "order": 4},
            ],
            constraints="1 <= number of nodes <= 10^5\n0 <= Node.val <= 10^6\nAt most 10^5 calls",
            input_format="Line 1: the tree in level order\nLine 2: operations",
            output_format="Array of call results",
            time="O(1) average per call", space="O(h)",
            hints=[
                "Copying the whole in-order traversal into a list works, but uses O(n) memory. "
                "The goal is O(h).",
                "An in-order walk with a stack does the same work in small pieces. The top of the "
                "stack is always the next smallest value.",
                "Push the root and all its left children. On `next()`, pop a node, then push its "
                "right child and all of that child's left children.",
            ],
            solution=_BST_ITERATOR_DRIVER + r"""
class BSTIterator {
    private final Deque<TreeNode> stack = new ArrayDeque<>();

    public BSTIterator(TreeNode root) {
        pushLeft(root);
    }

    public int next() {
        TreeNode node = stack.pop();
        pushLeft(node.right);
        return node.val;
    }

    public boolean hasNext() {
        return !stack.isEmpty();
    }

    private void pushLeft(TreeNode node) {
        while (node != null) {
            stack.push(node);
            node = node.left;
        }
    }
}
""",
        ),
        _BST_ITERATOR_DRIVER + """
class BSTIterator {
    public BSTIterator(TreeNode root) {

    }

    public int next() {
        return 0;
    }

    public boolean hasNext() {
        return false;
    }
}
""",
    ),
    _p(
        450, "Delete Node in a BST", "MEDIUM", BST,
        "deleteNode", [("root", "TreeNode"), ("key", "int")], "TreeNode",
        "Given the `root` of a binary search tree and a `key`, delete the node with that value "
        "and return the root of the tree. If the key is not in the tree, return it unchanged.\n\n"
        "Several trees can be correct, so the judge expects this rule: if the node has two "
        "children, replace its value with its in-order successor (the smallest value in its right "
        "subtree), then delete that successor from the right subtree. A node with one child is "
        "replaced by that child.",
        [
            {"input": "[5,3,6,2,4,null,7]\n3", "expected": "[5,4,6,2,null,null,7]", "hidden": False, "order": 1},
            {"input": "[5,3,6,2,4,null,7]\n0", "expected": "[5,3,6,2,4,null,7]", "hidden": False, "order": 2},
            {"input": "[]\n0", "expected": "[]", "hidden": False, "order": 3},
            {"input": "[5,3,6,2,4,null,7]\n5", "expected": "[6,3,7,2,4]", "hidden": True, "order": 4},
            {"input": "[5,3,6,2,4,null,7]\n7", "expected": "[5,3,6,2,4]", "hidden": True, "order": 5},
            {"input": "[1]\n1", "expected": "[]", "hidden": True, "order": 6},
        ],
        constraints="0 <= number of nodes <= 10^4\nAll values are unique\n-10^5 <= key <= 10^5",
        input_format="Line 1: the tree in level order\nLine 2: integer key",
        output_format="The tree in level order",
        time="O(h)", space="O(h) for the recursion",
        hints=[
            "Use the BST order to find the node: go left when the key is smaller, right when it "
            "is larger.",
            "A leaf is simply removed. A node with one child is replaced by that child.",
            "A node with two children takes the value of the smallest node in its right subtree. "
            "Then delete that value from the right subtree; it has at most one child.",
        ],
        solution=r"""
class Solution {
    public TreeNode deleteNode(TreeNode root, int key) {
        if (root == null) return null;
        if (key < root.val) {
            root.left = deleteNode(root.left, key);
        } else if (key > root.val) {
            root.right = deleteNode(root.right, key);
        } else {
            if (root.left == null) return root.right;
            if (root.right == null) return root.left;
            TreeNode successor = root.right;
            while (successor.left != null) successor = successor.left;
            root.val = successor.val;
            root.right = deleteNode(root.right, successor.val);
        }
        return root;
    }
}
""",
    ),
    _p(
        314, "Binary Tree Vertical Order Traversal", "MEDIUM", TREE,
        "verticalOrder", [("root", "TreeNode")], "List<List<Integer>>",
        "Return the values of a binary tree column by column, from the leftmost column to the "
        "rightmost. The root is column 0, a left child is one column left of its parent, and a "
        "right child is one column right.\n\n"
        "Inside a column, list values from top to bottom. Two nodes in the same row and column "
        "are listed left to right.",
        [
            {"input": "[3,9,20,null,null,15,7]", "expected": "[[9],[3,15],[20],[7]]", "hidden": False, "order": 1},
            {"input": "[3,9,8,4,0,1,7]", "expected": "[[4],[9],[3,0,1],[8],[7]]", "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": True, "order": 3},
            {"input": "[3,9,8,4,0,1,7,null,null,null,2,5]", "expected": "[[4],[9,5],[3,0,1],[8,2],[7]]",
             "hidden": True, "order": 4},
        ],
        constraints="0 <= number of nodes <= 100\n-100 <= Node.val <= 100",
        input_format="The tree in level order",
        output_format="List of columns, left to right",
        time="O(n)", space="O(n)",
        hints=[
            "Give each node a column number: the root is 0, go left subtract 1, go right add 1.",
            "Depth-first search gets the columns right but can mix up the top-to-bottom order. "
            "Breadth-first search visits nodes row by row, which is exactly the order needed.",
            "Run BFS with (node, column) pairs, add each value to its column's list, and track "
            "the smallest and largest column so you can output them without sorting.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public List<List<Integer>> verticalOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Map<Integer, List<Integer>> columns = new HashMap<>();
        Deque<TreeNode> nodes = new ArrayDeque<>();
        Deque<Integer> cols = new ArrayDeque<>();
        nodes.add(root);
        cols.add(0);
        int minCol = 0;
        int maxCol = 0;
        while (!nodes.isEmpty()) {
            TreeNode node = nodes.poll();
            int col = cols.poll();
            columns.computeIfAbsent(col, key -> new ArrayList<>()).add(node.val);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
            if (node.left != null) {
                nodes.add(node.left);
                cols.add(col - 1);
            }
            if (node.right != null) {
                nodes.add(node.right);
                cols.add(col + 1);
            }
        }
        for (int col = minCol; col <= maxCol; col++) result.add(columns.get(col));
        return result;
    }
}
""",
    ),
    _p(
        545, "Boundary of Binary Tree", "MEDIUM", TREE,
        "boundaryOfBinaryTree", [("root", "TreeNode")], "List<Integer>",
        "Return the boundary of a binary tree, going anti-clockwise from the root. The boundary is:\n\n"
        "1. The root.\n"
        "2. The left boundary: the path from the root's left child going left when possible, "
        "otherwise right, not including leaves.\n"
        "3. All leaves, from left to right.\n"
        "4. The right boundary in reverse: the path from the root's right child going right when "
        "possible, otherwise left, not including leaves.\n\n"
        "If the root has no left child, the left boundary is empty; the same holds on the right. "
        "A root with no children is only listed once.",
        [
            {"input": "[1,null,2,3,4]", "expected": "[1,3,4,2]", "hidden": False, "order": 1},
            {"input": "[1,2,3,4,5,6,null,null,null,7,8,9,10]", "expected": "[1,2,4,7,8,9,10,6,3]",
             "hidden": False, "order": 2},
            {"input": "[1]", "expected": "[1]", "hidden": True, "order": 3},
            {"input": "[1,2]", "expected": "[1,2]", "hidden": True, "order": 4},
            {"input": "[]", "expected": "[]", "hidden": True, "order": 5},
        ],
        constraints="0 <= number of nodes <= 10^4\n-1000 <= Node.val <= 1000",
        input_format="The tree in level order",
        output_format="List of boundary values",
        time="O(n)", space="O(n)",
        hints=[
            "Split the job into three separate walks: left edge, leaves, right edge. Then join "
            "them.",
            "Leave leaves out of both edge walks. Otherwise the first and last leaf are listed "
            "twice.",
            "The right edge is collected top to bottom but must be output bottom to top, so push "
            "it onto a stack or reverse it before adding it.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public List<Integer> boundaryOfBinaryTree(TreeNode root) {
        List<Integer> boundary = new ArrayList<>();
        if (root == null) return boundary;
        if (!isLeaf(root)) boundary.add(root.val);

        TreeNode node = root.left;
        while (node != null) {
            if (!isLeaf(node)) boundary.add(node.val);
            node = node.left != null ? node.left : node.right;
        }

        addLeaves(root, boundary);

        Deque<Integer> rightEdge = new ArrayDeque<>();
        node = root.right;
        while (node != null) {
            if (!isLeaf(node)) rightEdge.push(node.val);
            node = node.right != null ? node.right : node.left;
        }
        boundary.addAll(rightEdge);
        return boundary;
    }

    private boolean isLeaf(TreeNode node) {
        return node.left == null && node.right == null;
    }

    private void addLeaves(TreeNode node, List<Integer> boundary) {
        if (node == null) return;
        if (isLeaf(node)) {
            boundary.add(node.val);
            return;
        }
        addLeaves(node.left, boundary);
        addLeaves(node.right, boundary);
    }
}
""",
    ),
    _with_starter(
        _p(
            116, "Populating Next Right Pointers in Each Node", "MEDIUM", TREE,
            "connectAndRead", [("root", "TreeNode")], "List<List<Integer>>",
            "You are given a perfect binary tree: every parent has two children and all leaves are "
            "on the same level. Each `Node` has a `next` pointer, which starts as `null`.\n\n"
            "Write `connect(root)` so that every node's `next` points to the node on its right in "
            "the same level, or stays `null` for the last node of a level. Return the root.\n\n"
            "The starter code calls your `connect` and reads each level by following the `next` "
            "pointers, so the answer is the list of levels. Try to use O(1) extra memory.",
            [
                {"input": "[1,2,3,4,5,6,7]", "expected": "[[1],[2,3],[4,5,6,7]]", "hidden": False, "order": 1},
                {"input": "[]", "expected": "[]", "hidden": False, "order": 2},
                {"input": "[1]", "expected": "[[1]]", "hidden": True, "order": 3},
                {"input": "[1,2,3]", "expected": "[[1],[2,3]]", "hidden": True, "order": 4},
                {"input": "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]",
                 "expected": "[[1],[2,3],[4,5,6,7],[8,9,10,11,12,13,14,15]]", "hidden": True, "order": 5},
            ],
            constraints="0 <= number of nodes <= 2^12 - 1\nThe tree is perfect\n-1000 <= Node.val <= 1000",
            input_format="The tree in level order",
            output_format="Each level, read by following next pointers",
            time="O(n)", space="O(1)",
            hints=[
                "A level-order BFS with a queue links each node to the one after it. That works "
                "but uses O(n) memory.",
                "Once a level is linked, you can walk it like a linked list using `next`. Use that "
                "walk to link the level below.",
                "For each node on the current level: `node.left.next = node.right`, and if "
                "`node.next` exists, `node.right.next = node.next.left`. Then move down to the "
                "leftmost node of the next level.",
            ],
            solution=_NEXT_POINTER_DRIVER + r"""
    public Node connect(Node root) {
        Node leftmost = root;
        while (leftmost != null && leftmost.left != null) {
            for (Node node = leftmost; node != null; node = node.next) {
                node.left.next = node.right;
                if (node.next != null) node.right.next = node.next.left;
            }
            leftmost = leftmost.left;
        }
        return root;
    }
}
""",
        ),
        _NEXT_POINTER_DRIVER + """
    public Node connect(Node root) {
        return root;
    }
}
""",
    ),
    _with_starter(
        _p(
            430, "Flatten a Multilevel Doubly Linked List", "MEDIUM", LINKED,
            "flattenAndRead", [("serialized", "String")], "List<Integer>",
            "You are given a doubly linked list. Besides `prev` and `next`, each `Node` may have a "
            "`child` pointer to another doubly linked list, which may have children of its own.\n\n"
            "Write `flatten(head)` so all nodes form one single-level doubly linked list. A node's "
            "child list goes right after that node and before the node's old `next`. Set every "
            "`child` to `null`, keep every `prev` correct, and return the head.\n\n"
            "The input uses LeetCode's format: each level is listed, followed by `null`, and the "
            "extra `null`s before a level say which node of the level above it hangs from. The "
            "starter code builds the list, calls your `flatten`, checks the pointers and returns "
            "the values in order.",
            [
                {"input": "[1,2,3,4,5,6,null,null,null,7,8,9,10,null,null,11,12]",
                 "expected": "[1,2,3,7,8,11,12,9,10,4,5,6]", "hidden": False, "order": 1},
                {"input": "[1,2,null,3]", "expected": "[1,3,2]", "hidden": False, "order": 2},
                {"input": "[]", "expected": "[]", "hidden": True, "order": 3},
                {"input": "[1,null,2,null,3]", "expected": "[1,2,3]", "hidden": True, "order": 4},
                {"input": "[1,2,3]", "expected": "[1,2,3]", "hidden": True, "order": 5},
            ],
            constraints="0 <= number of nodes <= 1000\n1 <= Node.val <= 10^5",
            input_format="The multilevel list in LeetCode's format",
            output_format="Values of the flattened list, in order",
            time="O(n)", space="O(1)",
            hints=[
                "When you meet a node with a child, the whole child list must be spliced in "
                "between that node and its old next.",
                "To splice, you need the child list's tail. Walk from the child to its last node, "
                "then connect: node -> child ... tail -> old next.",
                "Keep walking forward from the same node after splicing. Any deeper children are "
                "now on the main list and get handled when you reach them. Fix every `prev` and "
                "clear every `child` as you go.",
            ],
            solution=_MULTILEVEL_DRIVER + r"""
    public Node flatten(Node head) {
        for (Node node = head; node != null; node = node.next) {
            if (node.child == null) continue;
            Node child = node.child;
            Node tail = child;
            while (tail.next != null) tail = tail.next;
            tail.next = node.next;
            if (node.next != null) node.next.prev = tail;
            node.next = child;
            child.prev = node;
            node.child = null;
        }
        return head;
    }
}
""",
        ),
        _MULTILEVEL_DRIVER + """
    public Node flatten(Node head) {
        return head;
    }
}
""",
    ),
    _p(
        69, "Sqrt(x)", "EASY", BIN,
        "mySqrt", [("x", "int")], "int",
        "Given a non-negative integer `x`, return the square root of `x` rounded down to the "
        "nearest integer.\n\nDo not use a built-in power or square root function.",
        [
            {"input": "4", "expected": "2", "hidden": False, "order": 1},
            {"input": "8", "expected": "2", "hidden": False, "order": 2},
            {"input": "0", "expected": "0", "hidden": True, "order": 3},
            {"input": "1", "expected": "1", "hidden": True, "order": 4},
            {"input": "2147395599", "expected": "46339", "hidden": True, "order": 5},
            {"input": "2147483647", "expected": "46340", "hidden": True, "order": 6},
        ],
        constraints="0 <= x <= 2^31 - 1",
        input_format="Integer x",
        output_format="An integer",
        time="O(log x)", space="O(1)",
        hints=[
            "The answer is the largest number m with m * m <= x. Trying every m from 1 upward "
            "takes O(sqrt x) steps.",
            "As m grows, m * m only grows, so you can binary search for m between 0 and x.",
            "Compute m * m as a `long`. For large x an `int` overflows and gives a wrong "
            "comparison.",
        ],
        solution=r"""
class Solution {
    public int mySqrt(int x) {
        long low = 0;
        long high = x;
        while (low < high) {
            long mid = (low + high + 1) / 2;
            if (mid * mid <= x) low = mid;
            else high = mid - 1;
        }
        return (int) low;
    }
}
""",
    ),
    _p(
        7, "Reverse Integer", "MEDIUM", MATH,
        "reverse", [("x", "int")], "int",
        "Given a signed 32-bit integer `x`, return `x` with its digits reversed. If the reversed "
        "value does not fit in a signed 32-bit integer, return `0`.\n\n"
        "Assume you cannot store 64-bit integers, so do not use `long`.",
        [
            {"input": "123", "expected": "321", "hidden": False, "order": 1},
            {"input": "-123", "expected": "-321", "hidden": False, "order": 2},
            {"input": "120", "expected": "21", "hidden": False, "order": 3},
            {"input": "0", "expected": "0", "hidden": True, "order": 4},
            {"input": "1534236469", "expected": "0", "hidden": True, "order": 5},
            {"input": "-2147483648", "expected": "0", "hidden": True, "order": 6},
            {"input": "1463847412", "expected": "2147483641", "hidden": True, "order": 7},
        ],
        constraints="-2^31 <= x <= 2^31 - 1",
        input_format="Integer x",
        output_format="An integer",
        time="O(log x)", space="O(1)",
        hints=[
            "Pop the last digit with `x % 10` and push it onto the result with "
            "`result * 10 + digit`.",
            "In Java, `%` keeps the sign, so negative numbers work with the same loop.",
            "Check for overflow before you multiply: if `result` is already past "
            "`Integer.MAX_VALUE / 10` (or below `Integer.MIN_VALUE / 10`), the next step "
            "overflows, so return 0.",
        ],
        solution=r"""
class Solution {
    public int reverse(int x) {
        int result = 0;
        while (x != 0) {
            int digit = x % 10;
            x /= 10;
            if (result > Integer.MAX_VALUE / 10 || (result == Integer.MAX_VALUE / 10 && digit > 7)) return 0;
            if (result < Integer.MIN_VALUE / 10 || (result == Integer.MIN_VALUE / 10 && digit < -8)) return 0;
            result = result * 10 + digit;
        }
        return result;
    }
}
""",
    ),
]
