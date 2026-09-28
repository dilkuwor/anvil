"""Solutions for the recommended problems, batch 5 (tree problems). See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-144"],
        "pattern": "Tree DFS",
        "trigger": "A tree whose nodes must be listed “the node first, then its left side, then its right side”.",
        "summary": (
            "Keep a pile of nodes still to write. Take the top, write it at once, then put its right child "
            "on the pile before its left child. The left child then comes off first."
        ),
        "approaches": [
            {
                "name": "Recursion that joins new lists",
                "idea": "Build the list for a node as its value, then the whole left list, then the whole right list.",
                "steps": [
                    "If the node is empty, return an empty list.",
                    "Make a new list that holds only the node's value.",
                    "Ask the left child for its own list and copy all of it onto the end.",
                    "Do the same with the right child's list, then return the joined list.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> preorderTraversal(TreeNode root) {
        List<Integer> list = new ArrayList<>();
        if (root == null) return list;
        list.add(root.val);
        list.addAll(preorderTraversal(root.left));
        list.addAll(preorderTraversal(root.right));
        return list;
    }
}
""",
                "time_complexity": "O(n·h)",
                "time_why": "A value is copied once into every list above it, so a node deep down is copied once per level. On a tall thin tree that is O(n²).",
                "space_complexity": "O(n)",
                "space_why": "The half-built lists of all the waiting calls together hold up to n values.",
                "when_to_use": "The first thing many people write. Mention it, then say the copying is wasted and pass one list down instead.",
                "is_optimal": False,
            },
            {
                "name": "Recursion with one shared list",
                "idea": "Pass one list down and add each value to it the moment the node is reached.",
                "steps": [
                    "Make one empty list and hand it to a helper along with the root.",
                    "In the helper, stop if the node is empty.",
                    "Add the node's value to the list first.",
                    "Call the helper on the left child, then on the right child.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> preorderTraversal(TreeNode root) {
        List<Integer> list = new ArrayList<>();
        visit(root, list);
        return list;
    }

    private void visit(TreeNode node, List<Integer> list) {
        if (node == null) return;
        list.add(node.val);
        visit(node.left, list);
        visit(node.right, list);
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each node is visited once and its value is written once.",
                "space_complexity": "O(h)",
                "space_why": "The waiting calls form one chain from the top to the current node, at most h of them.",
                "when_to_use": "A fine answer. Interviewers often follow up with “now do it without recursion”, which is the next version.",
                "is_optimal": False,
            },
            {
                "name": "Iterative, with a stack",
                "idea": "Keep your own pile of nodes still to write, and push the right child before the left.",
                "steps": [
                    "If the tree is empty, return an empty list. Otherwise put the root on the pile.",
                    "While the pile is not empty, take the top node off and write its value.",
                    "Put its right child on the pile, if it has one.",
                    "Then put its left child on the pile, so the left child is the next one taken off.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(n)",
                "time_why": "Every node goes on the pile once and comes off once.",
                "space_complexity": "O(h)",
                "space_why": "The pile holds the path's waiting right children, at most about one per level.",
                "when_to_use": "The version to aim for when asked to avoid recursion. It cannot run out of call depth on a tall tree.",
                "is_optimal": True,
            },
            {
                "name": "Morris walk with temporary threads",
                "idea": "Borrow the empty right pointer of each left side's last node as a way back up, so no pile is needed.",
                "steps": [
                    "If the node has no left child, write it and step right.",
                    "Otherwise find the rightmost node of its left side.",
                    "If that node's right pointer is empty, write the current node, point that right pointer back to it, and step left.",
                    "If the pointer already leads back, you are returning: clear it and step right.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> preorderTraversal(TreeNode root) {
        List<Integer> list = new ArrayList<>();
        TreeNode node = root;
        while (node != null) {
            if (node.left == null) {
                list.add(node.val);
                node = node.right;
                continue;
            }
            TreeNode last = node.left;
            while (last.right != null && last.right != node) last = last.right;
            if (last.right == null) {
                list.add(node.val);
                last.right = node;
                node = node.left;
            } else {
                last.right = null;
                node = node.right;
            }
        }
        return list;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each edge is walked a small fixed number of times while finding and clearing the threads.",
                "space_complexity": "O(1)",
                "space_why": "Only a few pointers. The way back up is stored inside the tree for a moment.",
                "when_to_use": "When asked for O(1) extra space. It changes the tree while it runs, so say that it puts every pointer back.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "root = [1,2,3,4,5]",
            "columns": ["take off", "write", "push right", "push left", "pile (top last)", "list"],
            "rows": [
                ["start", "-", "-", "-", "1", "[]"],
                ["1", "1", "3", "2", "3, 2", "[1]"],
                ["2", "2", "5", "4", "3, 5, 4", "[1,2]"],
                ["4", "4", "-", "-", "3, 5", "[1,2,4]"],
                ["5", "5", "-", "-", "3", "[1,2,4,5]"],
                ["3", "3", "-", "-", "empty", "[1,2,4,5,3]"],
            ],
            "result": "Right went on before left every time, so 2 came off before 3. The answer is [1,2,4,5,3].",
        },
        "mistakes": [
            {
                "name": "The Right-First Trap",
                "wrong": "Pushing the left child first and the right child second.",
                "right": "A pile gives back the last thing put on it. Push right first, then left, so the left side is written first.",
            },
            {
                "name": "Writing the node too late",
                "wrong": "Adding the value after the left side, which gives the in-order list instead.",
                "right": "Preorder writes the node the moment it is taken off the pile, before either child.",
            },
            {
                "name": "Pushing empty children",
                "wrong": "Putting `null` on an `ArrayDeque`, which throws an error.",
                "right": "Check that a child exists before pushing it.",
            },
        ],
        "edge_cases": [
            {"input": "[]", "expected": "[]", "why": "An empty tree: return an empty list, and push nothing."},
            {"input": "[1]", "expected": "[1]", "why": "One node, no children."},
            {"input": "[3,2,null,1]", "expected": "[3,2,1]", "why": "Only left children: the pile never holds more than one node."},
            {"input": "[1,null,2,3]", "expected": "[1,2,3]", "why": "A node with only a right child."},
            {"input": "[1,2,3,4,5]", "expected": "[1,2,4,5,3]", "why": "Two children at the top: pushing in the wrong order would give 3 before 2."},
        ],
        "interview_script": [
            "I need the values in the order: node, then its left side, then its right side.",
            "My first idea would join a new list per node and copy each child list in. That is O(n·h), because deep values are copied again at every level.",
            "If I pass one list down instead, the copying is gone: O(n) time and O(h) for the calls.",
            "Without recursion I keep a stack. I pop a node, write it, and push right before left so left comes out first. Still O(n) time and O(h) space.",
            "I would test an empty tree, a single node, a left-only chain, and a node with two children to catch the push order.",
        ],
        "follow_ups": [
            {
                "question": "Can you do it with O(1) extra space?",
                "answer": "Yes, with a Morris walk: borrow empty right pointers as temporary ways back up, and clear them on the second visit.",
            },
            {
                "question": "How would you get postorder from this?",
                "answer": "Write node, right, left with the same stack (push left before right), then reverse the list. That gives left, right, node.",
            },
            {
                "question": "Why does preorder matter for building a tree?",
                "answer": "The first value of a preorder list is always the root. Construct Binary Tree from Preorder and Inorder uses exactly that.",
            },
        ],
        "related_slugs": ["lc-94", "lc-105", "lc-104"],
    },
    {
        "slugs": ["lc-701"],
        "pattern": "Binary search tree walk",
        "trigger": "Add one value to a binary search tree and return the top of the tree.",
        "summary": (
            "Search for the new value as if it were already there: smaller goes left, bigger goes right. "
            "The search ends at an empty spot. Hang the new node there, and nothing else moves."
        ),
        "approaches": [
            {
                "name": "Recursive insert",
                "idea": "Ask the correct child to insert the value, and store whatever it hands back as that child.",
                "steps": [
                    "If the node is empty, make a new node with the value and return it.",
                    "If the value is smaller than the node, insert into the left child and store the result as the new left child.",
                    "Otherwise insert into the right child and store the result as the new right child.",
                    "Return the node itself, so the parent keeps the same child.",
                ],
                "code": """class Solution {
    public TreeNode insertIntoBST(TreeNode root, int val) {
        if (root == null) return new TreeNode(val);
        if (val < root.val) {
            root.left = insertIntoBST(root.left, val);
        } else {
            root.right = insertIntoBST(root.right, val);
        }
        return root;
    }
}
""",
                "time_complexity": "O(h)",
                "time_why": "One node per level is checked on the way down, where h is the height of the tree.",
                "space_complexity": "O(h)",
                "space_why": "Each level adds one waiting call.",
                "when_to_use": "Short and clear. Good to write first, then offer the loop if they ask about space.",
                "is_optimal": False,
            },
            {
                "name": "Walk down with a loop",
                "idea": "Walk down with one pointer and hook the new node onto the last node you reach.",
                "steps": [
                    "Make the new node. If the tree is empty, return it: it is the whole tree.",
                    "Start at the root. If the value is smaller, look at the left child, otherwise the right child.",
                    "If that child is missing, set it to the new node and return the root.",
                    "If it exists, step down to it and repeat.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(h)",
                "time_why": "The pointer moves down one level per step and stops at the empty spot.",
                "space_complexity": "O(1)",
                "space_why": "Only the pointer and the new node, however tall the tree is.",
                "when_to_use": "The version to aim for. Same speed, no call stack, and the hook-up line is easy to see.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "root = [4,2,7,1,3], val = 5",
            "columns": ["at node", "compare", "go", "child there?", "what happens"],
            "rows": [
                ["4", "5 > 4", "right", "yes, 7", "step down to 7"],
                ["7", "5 < 7", "left", "no, empty", "this is the spot"],
                ["7", "-", "-", "-", "set 7's left child to the new node 5"],
                ["-", "-", "-", "-", "return the old top 4, not the new node"],
            ],
            "result": "The new node hangs under 7 and the top is still 4. The answer is [4,2,7,1,3,5].",
        },
        "mistakes": [
            {
                "name": "The Lost Link Trap",
                "wrong": "Making the new node when the spot is empty, but never setting the parent's left or right child to it.",
                "right": "Hook it to its parent: in the loop set `node.left` or `node.right`, in recursion store the returned child. Then return the old top.",
            },
            {
                "name": "Returning the new node",
                "wrong": "Returning the new node instead of the root after hooking it on.",
                "right": "The caller wants the top of the whole tree. Return the new node only when the tree was empty.",
            },
            {
                "name": "Rebuilding or moving nodes",
                "wrong": "Trying to squeeze the value in between a parent and a child, or rebalancing the tree.",
                "right": "There is always an empty spot at the bottom where the value fits. Existing nodes never move.",
            },
        ],
        "edge_cases": [
            {"input": "[]\n5", "expected": "[5]", "why": "An empty tree: the new node is the whole tree."},
            {"input": "[8]\n3", "expected": "[8,3]", "why": "One node: the value goes straight to a child spot."},
            {"input": "[4,2,7,1,3]\n0", "expected": "[4,2,7,1,3,null,null,0]", "why": "Smaller than everything: it goes all the way left."},
            {"input": "[5,null,8]\n9", "expected": "[5,null,8,null,9]", "why": "Bigger than everything: it goes all the way right."},
        ],
        "interview_script": [
            "I need to add one value to a search tree so the smaller-left, bigger-right rule still holds, and return the top.",
            "I could list every value, add the new one and build a fresh tree, but that is O(n) time and space and moves nodes.",
            "The key point: searching for the value ends at an empty spot, and the new node fits exactly there.",
            "So I walk down with a pointer and hook the node onto the parent. That is O(h) time and O(1) space.",
            "I would test an empty tree, a value smaller than all, and a value bigger than all.",
        ],
        "follow_ups": [
            {
                "question": "What is h in the worst case?",
                "answer": "If values arrive already sorted the tree becomes one long chain, so h can be n. Self-balancing trees keep h near log n.",
            },
            {
                "question": "What if the value might already be in the tree?",
                "answer": "Stop when `node.val == val` and return the root unchanged, or keep a count in the node if duplicates matter.",
            },
            {
                "question": "How is delete different?",
                "answer": "Delete can hit a node with two children, which needs a stand-in value from its right side. Insert only ever fills an empty spot.",
            },
        ],
        "related_slugs": ["lc-450", "lc-98", "lc-235"],
    },
    {
        "slugs": ["lc-337"],
        "pattern": "Tree DP",
        "trigger": "The largest total from houses joined like a tree, where a parent and its child may never both be robbed.",
        "summary": (
            "Every house hands its parent two totals: the best for its part of the tree if it is robbed, and if it "
            "is walked past. Robbed adds the children's walked-past totals. Walked past takes the larger total of each child."
        ),
        "approaches": [
            {
                "name": "Plain recursion over choices",
                "idea": "For each house, compare robbing it plus the best of its grandchildren with the best of its two children.",
                "steps": [
                    "If the house is empty, the best is 0.",
                    "Option one: rob it, add its money, and add the best from each of its grandchildren.",
                    "Option two: walk past it and add the best from its two children.",
                    "Return the larger option. Nothing is remembered between calls.",
                ],
                "code": """class Solution {
    public int rob(TreeNode root) {
        if (root == null) return 0;
        int robbed = root.val;
        if (root.left != null) robbed += rob(root.left.left) + rob(root.left.right);
        if (root.right != null) robbed += rob(root.right.left) + rob(root.right.right);
        int skipped = rob(root.left) + rob(root.right);
        return Math.max(robbed, skipped);
    }
}
""",
                "time_complexity": "O(2ⁿ)",
                "time_why": "A house is worked out again by its parent and by its grandparent, and that repeats on every level below, so the calls pile up fast.",
                "space_complexity": "O(h)",
                "space_why": "Only one chain of waiting calls from the top down.",
                "when_to_use": "Say it to show the choice at each house, then point out the repeated work.",
                "is_optimal": False,
            },
            {
                "name": "Recursion with a saved-answers map",
                "idea": "Same choice, but keep each house's best in a map so it is worked out only once.",
                "steps": [
                    "Keep a map from house to its best total.",
                    "Before working out a house, look it up in the map and return the saved value if present.",
                    "Otherwise compare the two options as before.",
                    "Save the answer in the map before returning it.",
                ],
                "code": """import java.util.*;

class Solution {
    private final Map<TreeNode, Integer> saved = new HashMap<>();

    public int rob(TreeNode root) {
        if (root == null) return 0;
        Integer known = saved.get(root);
        if (known != null) return known;
        int robbed = root.val;
        if (root.left != null) robbed += rob(root.left.left) + rob(root.left.right);
        if (root.right != null) robbed += rob(root.right.left) + rob(root.right.right);
        int skipped = rob(root.left) + rob(root.right);
        int best = Math.max(robbed, skipped);
        saved.put(root, best);
        return best;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each house is worked out once, and every later look-up is quick.",
                "space_complexity": "O(n)",
                "space_why": "The map keeps one entry for every house.",
                "when_to_use": "A correct fix. Mention that the map can be dropped if each call returns two numbers.",
                "is_optimal": False,
            },
            {
                "name": "Two numbers per house",
                "idea": "Each call returns two totals for its house, robbed and walked past, so the parent never asks twice.",
                "steps": [
                    "An empty spot returns the pair 0 and 0.",
                    "Get the pair from the left child and from the right child.",
                    "Robbed is the house's money plus both children's walked-past totals.",
                    "Walked past is the larger of the left pair plus the larger of the right pair.",
                    "At the top, return the larger of the two totals.",
                ],
                "code": """class Solution {
    public int rob(TreeNode root) {
        int[] top = visit(root);
        return Math.max(top[0], top[1]);
    }

    // [0] = robbed, [1] = walked past.
    private int[] visit(TreeNode house) {
        if (house == null) return new int[] {0, 0};
        int[] left = visit(house.left);
        int[] right = visit(house.right);
        int robbed = house.val + left[1] + right[1];
        int walkedPast = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);
        return new int[] {robbed, walkedPast};
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each house is visited once and does a fixed amount of work with its children's pairs.",
                "space_complexity": "O(h)",
                "space_why": "No map, only one chain of waiting calls as tall as the tree.",
                "when_to_use": "The version to aim for. It is the tree form of House Robber: two numbers instead of two stones.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "root = [2,1,3,null,4]",
            "columns": ["house", "left pair", "right pair", "robbed", "walked past"],
            "rows": [
                ["4 (leaf)", "0, 0", "0, 0", "4", "0"],
                ["1", "4, 0", "0, 0", "1 + 0 = 1", "4"],
                ["3 (leaf)", "0, 0", "0, 0", "3", "0"],
                ["2 (top)", "1, 4", "3, 0", "2 + 4 + 0 = 6", "4 + 3 = 7"],
            ],
            "result": "Robbing every other level gives only 6 (2 + 4). Rob 4 and 3 instead. The answer is 7.",
        },
        "mistakes": [
            {
                "name": "The Every-Other-Level Trap",
                "wrong": "Adding up the even levels and the odd levels and returning the larger sum.",
                "right": "Each house decides for itself. Compare both totals of every child instead of robbing whole levels.",
            },
            {
                "name": "Walked past means children are robbed",
                "wrong": "Setting walked past to the sum of the children's robbed totals.",
                "right": "Walking past a house frees its children, but does not force them. Take the larger of each child's two totals.",
            },
            {
                "name": "Recomputing grandchildren",
                "wrong": "Calling the function on grandchildren and on children with nothing saved.",
                "right": "Return two numbers per house, so every house is worked out once.",
            },
        ],
        "edge_cases": [
            {"input": "[5]", "expected": "5", "why": "One house: rob it."},
            {"input": "[2,1,3,null,4]", "expected": "7", "why": "Robbing every other level gives only 6."},
            {"input": "[4,1,null,2,null,3]", "expected": "7", "why": "A chain where the best plan walks past two houses in a row."},
            {"input": "[3,4,5,1,3,null,1]", "expected": "9", "why": "The two children beat the top house with its grandchildren."},
            {"input": "[0,0,0]", "expected": "0", "why": "Houses with no money: the answer is 0, not an error."},
        ],
        "interview_script": [
            "Houses form a tree, and I cannot rob a parent and its child together. I want the largest total.",
            "My first idea compares robbing a house plus its grandchildren with its children. It repeats work, so it grows like O(2ⁿ).",
            "The key point I use: a parent only needs two facts from each child, its best if robbed and if walked past.",
            "So I make each call return that pair. One visit per house gives O(n) time and O(h) space for the calls.",
            "I would test one house, a chain, and a case like 2, 1, 3, 4 where robbing alternate levels fails.",
        ],
        "follow_ups": [
            {
                "question": "How would you return which houses to rob?",
                "answer": "Keep the pairs, then walk down from the top: if robbed wins, take the house and skip its children; otherwise let each child choose again.",
            },
            {
                "question": "The tree is very tall. What breaks?",
                "answer": "Deep recursion can overflow the call stack. Visit the houses bottom up with an explicit stack and store the pairs in a map.",
            },
            {
                "question": "How does this relate to House Robber on a row?",
                "answer": "A row is a tree where each house has one child. The same two numbers per house give the stepping-stones answer.",
            },
        ],
        "related_slugs": ["lc-198", "lc-213", "lc-124"],
    },
    {
        "slugs": ["lc-437"],
        "pattern": "Prefix sum on a tree",
        "trigger": "Count downward paths in a tree that add up to a target, where a path may start and end at any node.",
        "summary": (
            "Carry a running total down from the top. A path ending here hits the target when running minus target was "
            "a running total above you, so keep those in a map. Erase your entry on the way back up."
        ),
        "approaches": [
            {
                "name": "Start a path at every node",
                "idea": "From each node, walk down every branch adding values, and count each time the sum equals the target.",
                "steps": [
                    "Visit every node of the tree as a possible start.",
                    "From that start, walk down all its branches with a sum that begins at 0.",
                    "Add each node's value to the sum and count one path whenever the sum equals the target.",
                    "Add up the counts from all the starts. Use `long` sums, since values can be large.",
                ],
                "code": """class Solution {
    public int pathSum(TreeNode root, int targetSum) {
        if (root == null) return 0;
        return countFrom(root, 0L, targetSum)
                + pathSum(root.left, targetSum)
                + pathSum(root.right, targetSum);
    }

    private int countFrom(TreeNode node, long sum, int target) {
        if (node == null) return 0;
        sum += node.val;
        int found = sum == target ? 1 : 0;
        return found + countFrom(node.left, sum, target) + countFrom(node.right, sum, target);
    }
}
""",
                "time_complexity": "O(n·h)",
                "time_why": "Every node is added again once for each node above it that starts a walk. On a tall thin tree that is O(n²).",
                "space_complexity": "O(h)",
                "space_why": "Two chains of waiting calls, each at most as tall as the tree.",
                "when_to_use": "Say it first to show what a path is. Then say that the same sums are added again and again.",
                "is_optimal": False,
            },
            {
                "name": "Running totals in a map",
                "idea": "Keep counts of the running totals on the way from the top, and look up running minus target at each node.",
                "steps": [
                    "Keep a map from running total to how many nodes above have it. Put 0 in once, for a path that starts at the top.",
                    "At a node, add its value to the running total.",
                    "Add the map's count for running minus target to the answer.",
                    "Add the running total to the map, then visit the left and right children.",
                    "On the way back up, take the running total out of the map again.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(n)",
                "time_why": "Each node does one addition, one look-up and two map updates.",
                "space_complexity": "O(h)",
                "space_why": "The map only holds the running totals on the way from the top to this node, plus the waiting calls.",
                "when_to_use": "The version to aim for. It is Subarray Sum Equals K with the row bent into a tree.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "root = [1,-1,-1], targetSum = 0",
            "columns": ["node", "running", "look up", "found", "notebook after"],
            "rows": [
                ["start", "0", "-", "0", "{0:1}"],
                ["1 (top)", "1", "1 - 0 = 1: none", "0", "{0:1, 1:1}"],
                ["-1 (left)", "0", "0 - 0 = 0: once", "1", "{0:2, 1:1}"],
                ["leave left", "-", "-", "1", "erase 0: {0:1, 1:1}"],
                ["-1 (right)", "0", "0 - 0 = 0: once", "2", "{0:2, 1:1}"],
            ],
            "result": "Without the erase, the right node would also match the left node's 0 and count 3. The answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Leftover Note Trap",
                "wrong": "Adding each running total to the map but never taking it out when leaving the node.",
                "right": "Erase a node's entry on the way back up. An entry from another branch is not above you, so matching it counts a path that does not exist.",
            },
            {
                "name": "Forgetting the starting 0",
                "wrong": "Starting with an empty map, so paths that begin at the top are never counted.",
                "right": "Put 0 in the map once before the walk. It stands for the empty start above the top.",
            },
            {
                "name": "Int overflow",
                "wrong": "Keeping the running total in an `int` when values reach a billion.",
                "right": "Use a `long` running total and `Map<Long, Integer>`.",
            },
            {
                "name": "Checking only at leaves",
                "wrong": "Carrying the Path Sum habit over and only counting when a leaf is reached.",
                "right": "A path may end at any node, so look up the map at every node.",
            },
        ],
        "edge_cases": [
            {"input": "[]\n0", "expected": "0", "why": "An empty tree has no paths, even when the target is 0."},
            {"input": "[1]\n1", "expected": "1", "why": "A single node is a path."},
            {"input": "[1,-1,-1]\n0", "expected": "2", "why": "Two branches share a running total. Without the erase the count is 3."},
            {"input": "[1,-2,-3,1,3,-2,null,-1]\n-1", "expected": "4", "why": "Negative values and paths that start in the middle."},
            {"input": "[1000000000,1000000000,null,294967296,null,1000000000,null,1000000000,null,1000000000]\n0", "expected": "0", "why": "Sums pass the int limit, so `long` is needed."},
        ],
        "interview_script": [
            "I need to count downward paths with a given sum, and a path can start and end at any node.",
            "The obvious way starts a walk from every node and adds downward. That is O(n·h), which is O(n²) for a tall tree.",
            "The key point: a path's sum is my running total minus a running total above me, like Subarray Sum Equals K.",
            "So I keep a map of running totals from the top, look up running minus target, and erase on the way back. That is O(n) time and O(h) space.",
            "I would test an empty tree, a single node, two branches with the same total, and very large values.",
        ],
        "follow_ups": [
            {
                "question": "Return the paths, not only how many.",
                "answer": "Keep the list of nodes on the way down. For each match, the path is the part of that list after the matching entry.",
            },
            {
                "question": "Why must the entry be erased?",
                "answer": "The map must describe only the nodes above you. After you leave a node, its branch is finished and no longer above anyone.",
            },
            {
                "question": "What if paths must start at the top and end at a leaf?",
                "answer": "Then no map is needed: carry what is still needed down and check it only at a leaf, as in Path Sum.",
            },
        ],
        "related_slugs": ["lc-560", "lc-112", "lc-124"],
    },
]
