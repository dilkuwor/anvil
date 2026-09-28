"""Recommended problems, batch 5: four tree problems the catalog was missing.

* 144 Preorder walk, the order lc-105 builds a tree from.
* 701 Insert into a search tree, the easy change before lc-450's delete.
* 337 House Robber on a tree: each node hands up two numbers.
* 437 Path Sum III: lc-560's running totals, asked on a tree.

Every problem carries its reference solution, hints and costs inline, and passes its own tests
(``backend/scripts/check_recommended.py recommended_05``).
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

TREE = "tree"
BST = "trees-bst"
DP = "dynamic-programming"


PROBLEMS: list[dict] = [
    _p(
        144, "Binary Tree Preorder Traversal", "EASY", TREE,
        "preorderTraversal", [("root", "TreeNode")], "List<Integer>",
        "Write down every value in a binary tree in one fixed order: first the node itself, then "
        "everything on its left side, then everything on its right side. The same rule holds inside "
        "each side. A binary tree is a set of nodes where each node has at most two children, a left "
        "one and a right one.\n\n"
        "The tree is given by its top node `root`, which may be empty. Return the list of values in "
        "this order (called preorder).",
        [
            {"input": "[1,null,2,3]", "expected": "[1,2,3]", "hidden": False, "order": 1},
            {"input": "[1,2,3,4,5,null,8,null,null,6,7,9]", "expected": "[1,2,4,5,6,7,3,8,9]",
             "hidden": False, "order": 2},
            {"input": "[]", "expected": "[]", "hidden": True, "order": 3},
            {"input": "[1]", "expected": "[1]", "hidden": True, "order": 4},
            {"input": "[3,2,null,1]", "expected": "[3,2,1]", "hidden": True, "order": 5},
            {"input": "[5,3,8,1,4,7,9,0,2]", "expected": "[5,3,1,0,2,4,8,7,9]", "hidden": True, "order": 6},
        ],
        constraints="0 <= number of nodes <= 100\n-100 <= Node.val <= 100",
        input_format="The tree in level order, with null for a missing child",
        output_format="The values in preorder",
        time="O(n)", space="O(h)",
        hints=[
            "Write the node first, then deal with its left side, then its right side. A function "
            "that calls itself on each child does exactly that.",
            "To do it without the function calling itself, keep your own stack of nodes that still "
            "need a visit. Take the top, write it, and put its children on the stack.",
            "A stack gives back the last thing put on it. So put the right child on first and the "
            "left child second: the left side then comes off the stack first.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public List<Integer> preorderTraversal(TreeNode root) {
        List<Integer> list = new ArrayList<>();
        if (root == null) return list;
        Deque<TreeNode> pile = new ArrayDeque<>();
        pile.push(root);
        while (!pile.isEmpty()) {
            TreeNode node = pile.pop();
            list.add(node.val);
            if (node.right != null) pile.push(node.right);
            if (node.left != null) pile.push(node.left);
        }
        return list;
    }
}
""",
    ),
    _p(
        701, "Insert into a Binary Search Tree", "MEDIUM", BST,
        "insertIntoBST", [("root", "TreeNode"), ("val", "int")], "TreeNode",
        "You have a binary search tree: at every node, all smaller values sit on its left side and all "
        "bigger values sit on its right side. Add one new value `val` to the tree so that this rule "
        "still holds everywhere, and return the top of the tree.\n\n"
        "`val` is not already in the tree. Several trees can be correct, so the judge expects the "
        "usual one: keep every existing node where it is and hang the new value as a new leaf, found "
        "by going left when `val` is smaller and right when it is bigger until the spot is empty. If "
        "the tree is empty, the new node is the whole tree.\n\n"
        "The returned tree is printed in level order, with `null` for a missing child.",
        [
            {"input": "[4,2,7,1,3]\n5", "expected": "[4,2,7,1,3,5]", "hidden": False, "order": 1},
            {"input": "[40,20,60,10,30,50,70]\n25", "expected": "[40,20,60,10,30,50,70,null,null,25]",
             "hidden": False, "order": 2},
            {"input": "[]\n5", "expected": "[5]", "hidden": True, "order": 3},
            {"input": "[8]\n3", "expected": "[8,3]", "hidden": True, "order": 4},
            {"input": "[5,null,8]\n9", "expected": "[5,null,8,null,9]", "hidden": True, "order": 5},
            {"input": "[4,2,7,1,3]\n0", "expected": "[4,2,7,1,3,null,null,0]", "hidden": True, "order": 6},
        ],
        constraints="0 <= number of nodes <= 10^4\n-10^8 <= Node.val, val <= 10^8\nAll values are unique\nval is not in the tree",
        input_format="Line 1: the tree in level order\nLine 2: integer val",
        output_format="The tree after the insert, in level order",
        time="O(h)", space="O(1)",
        hints=[
            "You never need to move an existing node. There is always an empty spot at the bottom "
            "where the new value fits.",
            "Search for `val` as if it were in the tree: go left when it is smaller than the node, "
            "right when it is bigger. The search ends at an empty child spot.",
            "Walk down with a pointer and stop at the node whose next child is missing. Hang a new "
            "node there, on the left or right, and return the original root.",
        ],
        solution=r"""
class Solution {
    public TreeNode insertIntoBST(TreeNode root, int val) {
        TreeNode fresh = new TreeNode(val);
        if (root == null) return fresh;
        TreeNode node = root;
        while (true) {
            if (val < node.val) {
                if (node.left == null) {
                    node.left = fresh;
                    return root;
                }
                node = node.left;
            } else {
                if (node.right == null) {
                    node.right = fresh;
                    return root;
                }
                node = node.right;
            }
        }
    }
}
""",
    ),
    _p(
        337, "House Robber III", "MEDIUM", DP,
        "rob", [("root", "TreeNode")], "int",
        "The houses in a town are joined like a family tree: each house has at most one parent house "
        "above it and at most two child houses below it. Each house holds some money. A thief may "
        "never rob two houses that are directly joined, a parent and its child. Return the largest "
        "total the thief can take.\n\n"
        "The tree is given by its top house `root`. Houses that are not directly joined, such as a "
        "grandparent and a grandchild, or two brothers, may both be robbed.",
        [
            {"input": "[3,2,3,null,3,null,1]", "expected": "7", "hidden": False, "order": 1},
            {"input": "[3,4,5,1,3,null,1]", "expected": "9", "hidden": False, "order": 2},
            {"input": "[5]", "expected": "5", "hidden": True, "order": 3},
            {"input": "[2,1,3,null,4]", "expected": "7", "hidden": True, "order": 4},
            {"input": "[4,1,null,2,null,3]", "expected": "7", "hidden": True, "order": 5},
            {"input": "[0,0,0]", "expected": "0", "hidden": True, "order": 6},
        ],
        constraints="1 <= number of nodes <= 10^4\n0 <= Node.val <= 10^4",
        input_format="The tree in level order, with null for a missing child",
        output_format="An integer",
        time="O(n)", space="O(h)",
        hints=[
            "Robbing every other level does not always win. Each house must decide for itself.",
            "For one house, two totals matter: the best for its part of the tree if it is robbed, "
            "and the best if it is not robbed.",
            "Let each call return both numbers for its house. Robbed = its money plus both "
            "children's not-robbed totals. Not robbed = for each child, the larger of its two totals, "
            "added up.",
        ],
        solution=r"""
class Solution {
    public int rob(TreeNode root) {
        int[] best = visit(root);
        return Math.max(best[0], best[1]);
    }

    // [0] = best total below and including this house if it is robbed, [1] = if it is not.
    private int[] visit(TreeNode house) {
        if (house == null) return new int[] {0, 0};
        int[] left = visit(house.left);
        int[] right = visit(house.right);
        int robbed = house.val + left[1] + right[1];
        int skipped = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);
        return new int[] {robbed, skipped};
    }
}
""",
    ),
    _p(
        437, "Path Sum III", "MEDIUM", TREE,
        "pathSum", [("root", "TreeNode"), ("targetSum", "int")], "int",
        "In a binary tree of numbers, count the paths whose values add up to `targetSum`. A path is a "
        "chain of nodes that only goes downward, from a parent to one of its children, again and "
        "again. It may start at any node and end at any node below it, not only at the top or at "
        "a leaf (a node with no children).\n\n"
        "The tree is given by its top node `root`, which may be empty. Values can be negative. "
        "A single node is a path too. Return how many paths there are.",
        [
            {"input": "[10,5,-3,3,2,null,11,3,-2,null,1]\n8", "expected": "3", "hidden": False, "order": 1},
            {"input": "[5,4,8,11,null,13,4,7,2,null,null,5,1]\n22", "expected": "3", "hidden": False, "order": 2},
            {"input": "[]\n0", "expected": "0", "hidden": True, "order": 3},
            {"input": "[1]\n1", "expected": "1", "hidden": True, "order": 4},
            {"input": "[1,-2,-3,1,3,-2,null,-1]\n-1", "expected": "4", "hidden": True, "order": 5},
            {"input": "[1000000000,1000000000,null,294967296,null,1000000000,null,1000000000,null,1000000000]\n0",
             "expected": "0", "hidden": True, "order": 6},
        ],
        constraints="0 <= number of nodes <= 1000\n-10^9 <= Node.val <= 10^9\n-1000 <= targetSum <= 1000",
        input_format="Line 1: the tree in level order\nLine 2: integer targetSum",
        output_format="An integer",
        time="O(n)", space="O(h)",
        hints=[
            "Starting a fresh sum at every node and walking down from it works, but re-adds the same "
            "values many times.",
            "Carry one running total from the top down to the node you stand on. The sum of a path "
            "that ends here is this total minus the running total just above where the path starts.",
            "Keep a map from running total to how many nodes above you have it, starting with 0 once. "
            "At each node add `map[running - targetSum]` to the count, record `running`, visit the "
            "children, then remove `running` again on the way back up. Use `long` sums.",
        ],
        solution=r"""
import java.util.*;

class Solution {
    public int pathSum(TreeNode root, int targetSum) {
        Map<Long, Integer> notebook = new HashMap<>();
        notebook.put(0L, 1);
        return visit(root, 0L, targetSum, notebook);
    }

    private int visit(TreeNode node, long running, int target, Map<Long, Integer> notebook) {
        if (node == null) return 0;
        running += node.val;
        int found = notebook.getOrDefault(running - target, 0);
        notebook.merge(running, 1, Integer::sum);
        found += visit(node.left, running, target, notebook);
        found += visit(node.right, running, target, notebook);
        notebook.merge(running, -1, Integer::sum);
        return found;
    }
}
""",
    ),
]
