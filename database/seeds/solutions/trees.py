"""Tree problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS = [   {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public boolean isSameTree(TreeNode p, TreeNode q) {\n'
                                      '        Queue<TreeNode> queue = new LinkedList<>();\n'
                                      '        queue.add(p);\n'
                                      '        queue.add(q);\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            TreeNode n1 = queue.poll();\n'
                                      '            TreeNode n2 = queue.poll();\n'
                                      '\n'
                                      '            if (n1 == null && n2 == null) continue;\n'
                                      '            if (n1 == null || n2 == null) return false;\n'
                                      '            if (n1.val != n2.val) return false;\n'
                                      '\n'
                                      '            queue.add(n1.left);\n'
                                      '            queue.add(n2.left);\n'
                                      '            queue.add(n1.right);\n'
                                      '            queue.add(n2.right);\n'
                                      '        }\n'
                                      '\n'
                                      '        return true;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Push paired nodes from both trees into a queue and verify matching '
                                      'values level by level.',
                              'is_optimal': False,
                              'name': 'Check nodes with a queue',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queue holds up to `n` nodes across the widest level of the '
                                           'trees.',
                              'steps': [   'Put the roots of both trees into a queue as a starting pair.',
                                           'While the queue is not empty, pull out a pair of nodes.',
                                           'If both nodes are null, continue to the next pair.',
                                           'If only one node is null or values differ, return false '
                                           'immediately.',
                                           'Add both left children to the queue, then add both right '
                                           'children.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'We visit every node across both trees at most once.',
                              'when_to_use': 'Helpful when you want to avoid deep recursion call stack '
                                             'limits.'},
                          {   'code': 'class Solution {\n'
                                      '    public boolean isSameTree(TreeNode p, TreeNode q) {\n'
                                      '        if (p == null && q == null) return true;\n'
                                      '        if (p == null || q == null) return false;\n'
                                      '        if (p.val != q.val) return false;\n'
                                      '        return isSameTree(p.left, q.left) && isSameTree(p.right, '
                                      'q.right);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Compare root values directly, then recursively check left subtrees '
                                      'and right subtrees.',
                              'is_optimal': True,
                              'name': 'Compare roots and recurse on children',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to the tree height `h`.',
                              'steps': [   'If both current nodes are null, return true because empty trees '
                                           'match.',
                                           'If exactly one node is null, return false because the shapes '
                                           'differ.',
                                           'If the node values differ, return false immediately.',
                                           'Return true only if both left subtrees match and both right '
                                           'subtrees match.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node in the smaller tree is checked at most once.',
                              'when_to_use': 'Best standard way to compare two trees cleanly with minimal '
                                             'code.'}],
        'edge_cases': [   {   'expected': 'true',
                              'input': 'p = null, q = null',
                              'why': 'Two empty trees are identical.'},
                          {   'expected': 'false',
                              'input': 'p = [1], q = null',
                              'why': 'One tree is empty while the other has a root node.'},
                          {   'expected': 'false',
                              'input': 'p = [1,2], q = [1,null,2]',
                              'why': 'Same values but opposite child positions.'},
                          {   'expected': 'false',
                              'input': 'p = [1,2,1], q = [1,1,2]',
                              'why': 'Same node values arranged in different child positions.'}],
        'follow_ups': [   {   'answer': 'Use this helper to check for tree equality at each node of the '
                                        'larger tree.',
                              'question': 'What if one tree is a subtree of the other?'},
                          {   'answer': 'Compute Merkle tree hash values bottom-up and compare root hash '
                                        'values directly.',
                              'question': 'How would you compare trees with millions of nodes stored on '
                                          'disk?'},
                          {   'answer': 'Yes, use two explicit stacks or a single queue holding paired node '
                                        'references.',
                              'question': 'Can we check tree identity without recursion?'}],
        'interview_script': [   'I need to check if two binary trees are identical in both structure and '
                                'values.',
                                'My obvious first idea is level-by-level queue comparison, which takes O(n) '
                                'time and O(n) space.',
                                'A key point is that two trees match if their roots match and both left and '
                                'right subtrees match.',
                                'I would use recursion to compare pairs of nodes, taking O(n) time and O(h) '
                                'recursion stack space.',
                                'I would test this on empty trees, mirrored trees, and trees with identical '
                                'values in different positions.'],
        'mistakes': [   {   'name': 'The Empty Spot Trap',
                            'right': 'Always check whether either node is null before accessing `val`.',
                            'wrong': 'Reading `node.val` before verifying that the node reference is '
                                     'non-null causes null pointer crashes.'},
                        {   'name': 'Checking values but ignoring structure',
                            'right': 'Check that left child pairs match and right child pairs match '
                                     'independently.',
                            'wrong': 'Assuming trees match just because their inorder values match misses '
                                     'structural differences.'},
                        {   'name': 'Returning early on left match',
                            'right': 'Use boolean AND so both left and right subtree comparisons must pass.',
                            'wrong': 'Returning true after left children match without checking right '
                                     'children misses mismatches on the right.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-101', 'lc-572'],
        'slugs': ['lc-100', 'same-tree'],
        'summary': 'Check if both roots are null or share the same value. Then check that left children '
                   'match and right children match.',
        'trigger': 'Given the roots of two binary trees, write a function to check if they are the same.',
        'walkthrough': {   'columns': ['Call', 'p Node', 'q Node', 'Result'],
                           'input': 'p = [1, 2], q = [1, null, 2]',
                           'result': 'Trees have different shapes, returning false.',
                           'rows': [   [   'Root check',
                                           'val = 1',
                                           'val = 1',
                                           'Values match, check left subtrees'],
                                       [   'Left check',
                                           'val = 2',
                                           'null',
                                           'One null and one non-null; return false'],
                                       [   'Final return',
                                           '-',
                                           '-',
                                           'Trees differ in structure; return false']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public boolean isSymmetric(TreeNode root) {\n'
                                      '        if (root == null) return true;\n'
                                      '        Queue<TreeNode> queue = new LinkedList<>();\n'
                                      '        queue.add(root.left);\n'
                                      '        queue.add(root.right);\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            TreeNode t1 = queue.poll();\n'
                                      '            TreeNode t2 = queue.poll();\n'
                                      '\n'
                                      '            if (t1 == null && t2 == null) continue;\n'
                                      '            if (t1 == null || t2 == null) return false;\n'
                                      '            if (t1.val != t2.val) return false;\n'
                                      '\n'
                                      '            queue.add(t1.left);\n'
                                      '            queue.add(t2.right);\n'
                                      '            queue.add(t1.right);\n'
                                      '            queue.add(t2.left);\n'
                                      '        }\n'
                                      '\n'
                                      '        return true;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Enqueue left and right children in mirrored pairs, checking that '
                                      'values match at each step.',
                              'is_optimal': False,
                              'name': 'Compare opposite nodes with a queue',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queue holds up to `n` nodes across the widest tree level.',
                              'steps': [   'Return true if the root is null.',
                                           "Add the root's left and right children to a queue.",
                                           'Dequeue two nodes at a time and compare their null state and '
                                           'values.',
                                           'Add the outer children pair to the queue, then add the inner '
                                           'children pair.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node enters the queue once and is compared with its mirror '
                                          'partner.',
                              'when_to_use': 'Good when tree height is large and call stack depth is '
                                             'restricted.'},
                          {   'code': 'class Solution {\n'
                                      '    public boolean isSymmetric(TreeNode root) {\n'
                                      '        if (root == null) return true;\n'
                                      '        return isMirror(root.left, root.right);\n'
                                      '    }\n'
                                      '\n'
                                      '    private boolean isMirror(TreeNode t1, TreeNode t2) {\n'
                                      '        if (t1 == null && t2 == null) return true;\n'
                                      '        if (t1 == null || t2 == null) return false;\n'
                                      '        if (t1.val != t2.val) return false;\n'
                                      '        return isMirror(t1.left, t2.right) && isMirror(t1.right, '
                                      't2.left);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Use a helper function that checks if two trees are mirrors by '
                                      'comparing outer and inner children.',
                              'is_optimal': True,
                              'name': 'Recursive mirror helper',
                              'space_complexity': 'O(h)',
                              'space_why': 'The recursive stack frames reach a maximum depth equal to tree '
                                           'height `h`.',
                              'steps': [   'If the root is null, return true immediately.',
                                           'Call a mirror helper comparing `root.left` and `root.right`.',
                                           'In the helper, return true if both nodes are null, or false if '
                                           'only one is null.',
                                           'Return true if node values match and both outer pair and inner '
                                           'pair are mirrors.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node in the tree is visited once by the mirror helper.',
                              'when_to_use': 'Best standard way to test tree symmetry cleanly with minimal '
                                             'memory.'}],
        'edge_cases': [   {   'expected': 'true',
                              'input': 'root = [1]',
                              'why': 'A single root node with no children is symmetric.'},
                          {   'expected': 'false',
                              'input': 'root = [1,2,2,null,3,null,3]',
                              'why': 'Values match on both sides but child positions are not mirrored.'},
                          {   'expected': 'false',
                              'input': 'root = [1,2,3]',
                              'why': 'Different values on left and right children.'},
                          {   'expected': 'true',
                              'input': 'root = [1,2,2]',
                              'why': 'A root with matching two children is symmetric.'}],
        'follow_ups': [   {   'answer': 'Yes, invert the right subtree and call the same tree helper between '
                                        'left and right.',
                              'question': 'Can we check symmetry by inverting the right subtree and checking '
                                          'identity?'},
                          {   'answer': 'Compare child `i` of the left node with child `k - 1 - i` of the '
                                        'right node across all children.',
                              'question': 'What if the tree is an n-ary tree?'},
                          {   'answer': 'Push root left and right to separate stacks, popping pairs and '
                                        'pushing opposite children.',
                              'question': 'How would you do this with two stacks without recursion?'}],
        'interview_script': [   'I need to check whether a binary tree is symmetric around its center.',
                                'My obvious first idea is using a queue to compare mirrored node pairs, '
                                'taking O(n) time and O(n) space.',
                                'A key point is that symmetry requires outer children to match and inner '
                                'children to match.',
                                'I would write a recursive mirror helper, reducing extra space to O(h) '
                                'recursion frames with O(n) time.',
                                'I would test this on a single node, identical values with wrong shapes, and '
                                'fully symmetric trees.'],
        'mistakes': [   {   'name': 'The Same-Side Trap',
                            'right': 'Compare outer children `left.left` with `right.right` and inner '
                                     'children `left.right` with `right.left`.',
                            'wrong': 'Comparing left with left and right with right checks for equality '
                                     'rather than mirror symmetry.'},
                        {   'name': 'Null check omission',
                            'right': 'Check if either node is null before comparing their values.',
                            'wrong': 'Accessing node values before verifying null references leads to null '
                                     'pointer errors.'},
                        {   'name': 'Relying solely on inorder values',
                            'right': 'Ensure that null children are accounted for when checking mirrored '
                                     'structure.',
                            'wrong': 'Assuming a symmetric inorder array guarantees tree symmetry misses '
                                     'asymmetric shapes.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-100', 'lc-226'],
        'slugs': ['lc-101', 'symmetric-tree'],
        'summary': 'Check whether left and right subtrees mirror each other by comparing opposite children '
                   'recursively.',
        'trigger': 'Given the root of a binary tree, check whether it is a mirror of itself.',
        'walkthrough': {   'columns': ['Step', 'Left Subtree Node', 'Right Subtree Node', 'Outcome'],
                           'input': 'root = [1, 2, 2, 3, 4, 4, 3]',
                           'result': 'All mirrored pairs match, returning true.',
                           'rows': [   [   '1',
                                           'Node 2 (left)',
                                           'Node 2 (right)',
                                           'Values match; check outer and inner pairs'],
                                       [   '2 (Outer)',
                                           'Node 3 (outer left)',
                                           'Node 3 (outer right)',
                                           'Values match; continue'],
                                       [   '3 (Inner)',
                                           'Node 4 (inner right)',
                                           'Node 4 (inner left)',
                                           'Values match; continue']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<List<Integer>> levelOrder(TreeNode root) {\n'
                                      '        List<List<Integer>> result = new ArrayList<>();\n'
                                      '        dfs(root, 0, result);\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void dfs(TreeNode node, int depth, List<List<Integer>> '
                                      'result) {\n'
                                      '        if (node == null) return;\n'
                                      '        if (depth == result.size()) {\n'
                                      '            result.add(new ArrayList<>());\n'
                                      '        }\n'
                                      '        result.get(depth).add(node.val);\n'
                                      '        dfs(node.left, depth + 1, result);\n'
                                      '        dfs(node.right, depth + 1, result);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Pass the current depth along recursive calls, appending each node '
                                      'value to its corresponding level list.',
                              'is_optimal': False,
                              'name': 'Depth-first search with depth index',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is bounded by tree height `h`.',
                              'steps': [   'If the root is null, return an empty list.',
                                           'In a helper function, if depth equals list size, add a new empty '
                                           'level list.',
                                           'Append the current node value to the list at index depth.',
                                           'Recurse on the left child at depth plus one, then on the right '
                                           'child.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node in the tree is visited once.',
                              'when_to_use': 'Useful if you want to avoid managing an explicit queue '
                                             'collection.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<List<Integer>> levelOrder(TreeNode root) {\n'
                                      '        List<List<Integer>> result = new ArrayList<>();\n'
                                      '        if (root == null) return result;\n'
                                      '\n'
                                      '        Queue<TreeNode> queue = new ArrayDeque<>();\n'
                                      '        queue.add(root);\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int levelSize = queue.size();\n'
                                      '            List<Integer> currentLevel = new ArrayList<>(levelSize);\n'
                                      '\n'
                                      '            for (int i = 0; i < levelSize; i++) {\n'
                                      '                TreeNode node = queue.poll();\n'
                                      '                currentLevel.add(node.val);\n'
                                      '\n'
                                      '                if (node.left != null) queue.add(node.left);\n'
                                      '                if (node.right != null) queue.add(node.right);\n'
                                      '            }\n'
                                      '\n'
                                      '            result.add(currentLevel);\n'
                                      '        }\n'
                                      '\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Process nodes level by level by freezing the queue size at the start '
                                      'of each level loop.',
                              'is_optimal': True,
                              'name': 'Breadth-first search with queue batching',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queue holds the largest level, which can contain up to `n / '
                                           '2` nodes.',
                              'steps': [   'If the root is null, return an empty list.',
                                           'Add the root node to a queue.',
                                           'At each level, record the queue size into a count variable '
                                           'before polling nodes.',
                                           'Poll that many nodes, collecting values into a list and adding '
                                           'their children to the queue.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is enqueued and dequeued once.',
                              'when_to_use': 'Best standard way to collect tree levels in order.'}],
        'edge_cases': [   {'expected': '[]', 'input': 'root = null', 'why': 'An empty tree has no levels.'},
                          {   'expected': '[[1]]',
                              'input': 'root = [1]',
                              'why': 'A single node forms one level.'},
                          {   'expected': '[[1],[2],[3],[4]]',
                              'input': 'root = [1,2,null,3,null,4]',
                              'why': 'A skewed tree produces single-node levels.'},
                          {   'expected': '[[1],[2,3],[4,5,6,7]]',
                              'input': 'root = [1,2,3,4,5,6,7]',
                              'why': 'A full binary tree doubles node count at each level.'}],
        'follow_ups': [   {   'answer': 'Reverse the final result list or insert each level list at index 0 '
                                        'using a linked list.',
                              'question': 'How would you return levels from bottom to top?'},
                          {   'answer': 'Sum values during the level loop and divide by the fixed level '
                                        'count before storing.',
                              'question': 'What if you need the average value of each level?'},
                          {   'answer': 'Yes, pull from the current level queue and push children to a next '
                                        'level queue, swapping references.',
                              'question': 'Can this be done with two queues instead of measuring size?'}],
        'interview_script': [   'I need to group binary tree values by level as lists of integers.',
                                'My obvious first idea is recursive depth search with depth indexing, taking '
                                'O(n) time and O(h) recursion stack space.',
                                'A key point is freezing queue size before looping through each level so '
                                'children wait for the next row.',
                                'I would use breadth-first search with a queue, taking O(n) time and O(n) '
                                'queue space.',
                                'I would test this on an empty tree, a single node, and skewed trees.'],
        'mistakes': [   {   'name': 'The Growing Line Trap',
                            'right': 'Read line.size() into count once, before the inner loop. If the loop '
                                     're-reads the size while children are joining, two levels leak into one '
                                     'row.',
                            'wrong': 'Calling `queue.size()` dynamically inside the loop condition causes '
                                     'newly enqueued children to be processed on the current level.'},
                        {   'name': 'Adding null children to queue',
                            'right': 'Only push a child to the queue if the child reference is non-null.',
                            'wrong': 'Adding null children without checking adds extra null nodes that '
                                     'corrupt the level size count.'},
                        {   'name': 'Forgetting null root check',
                            'right': 'Return an empty list immediately when the root is null.',
                            'wrong': 'Pushing a null root into the queue produces an output of `[[]]` or '
                                     'causes null pointer errors.'}],
        'pattern': 'Tree BFS',
        'related_slugs': ['lc-103', 'lc-199'],
        'slugs': ['lc-102', 'level-walk'],
        'summary': 'Visit nodes level by level using a queue. Snapshot the queue size before each level so '
                   'children wait for the next row.',
        'trigger': 'Given the root of a binary tree, return the level order values of its nodes.',
        'walkthrough': {   'columns': ['Level', 'Fixed Count', 'Polled Node', 'Next Level Queued'],
                           'input': 'root = [3, 9, 20, null, null, 15, 7]',
                           'result': 'Nodes grouped strictly by level, returning [[3], [9, 20], [15, 7]].',
                           'rows': [   ['0', '1 (frozen before loop)', '3', '[9, 20]'],
                                       ['1', '2 (frozen before loop)', '9', '[20]'],
                                       ['1', '2', '20', '[15, 7] added; wait for next round'],
                                       ['2', '2 (frozen before loop)', '15', '[7]'],
                                       ['2', '2', '7', '[]']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<List<Integer>> zigzagLevelOrder(TreeNode root) {\n'
                                      '        List<List<Integer>> result = new ArrayList<>();\n'
                                      '        if (root == null) return result;\n'
                                      '        int height = getHeight(root);\n'
                                      '        for (int d = 1; d <= height; d++) {\n'
                                      '            List<Integer> level = new ArrayList<>();\n'
                                      '            collectLevel(root, d, level, d % 2 == 1);\n'
                                      '            result.add(level);\n'
                                      '        }\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '\n'
                                      '    private int getHeight(TreeNode node) {\n'
                                      '        if (node == null) return 0;\n'
                                      '        return 1 + Math.max(getHeight(node.left), '
                                      'getHeight(node.right));\n'
                                      '    }\n'
                                      '\n'
                                      '    private void collectLevel(TreeNode node, int d, List<Integer> '
                                      'level, boolean leftToRight) {\n'
                                      '        if (node == null) return;\n'
                                      '        if (d == 1) {\n'
                                      '            level.add(node.val);\n'
                                      '            return;\n'
                                      '        }\n'
                                      '        if (leftToRight) {\n'
                                      '            collectLevel(node.left, d - 1, level, leftToRight);\n'
                                      '            collectLevel(node.right, d - 1, level, leftToRight);\n'
                                      '        } else {\n'
                                      '            collectLevel(node.right, d - 1, level, leftToRight);\n'
                                      '            collectLevel(node.left, d - 1, level, leftToRight);\n'
                                      '        }\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'For each level from 1 to height, collect node values from the root, '
                                      'alternating child visit order.',
                              'is_optimal': False,
                              'name': 'Level scan from root with depth helper',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to the tree height `h`.',
                              'steps': [   'Find the height of the tree using a recursive helper.',
                                           'For each level depth from 1 to height, create a list.',
                                           'Visit nodes from the root down to that depth, adding values in '
                                           'alternating order.',
                                           'Append each level list to the final result.'],
                              'time_complexity': 'O(n * h)',
                              'time_why': 'We scan from the root down to level `d` for each of the `h` '
                                          'levels, re-visiting upper nodes.',
                              'when_to_use': 'Only sensible if memory is strictly limited to recursion '
                                             'frames with no queue allowed.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<List<Integer>> zigzagLevelOrder(TreeNode root) {\n'
                                      '        List<List<Integer>> result = new ArrayList<>();\n'
                                      '        if (root == null) return result;\n'
                                      '\n'
                                      '        Queue<TreeNode> queue = new ArrayDeque<>();\n'
                                      '        queue.add(root);\n'
                                      '        boolean leftToRight = true;\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int levelSize = queue.size();\n'
                                      '            LinkedList<Integer> currentLevel = new LinkedList<>();\n'
                                      '\n'
                                      '            for (int i = 0; i < levelSize; i++) {\n'
                                      '                TreeNode node = queue.poll();\n'
                                      '\n'
                                      '                if (leftToRight) {\n'
                                      '                    currentLevel.addLast(node.val);\n'
                                      '                } else {\n'
                                      '                    currentLevel.addFirst(node.val);\n'
                                      '                }\n'
                                      '\n'
                                      '                if (node.left != null) queue.add(node.left);\n'
                                      '                if (node.right != null) queue.add(node.right);\n'
                                      '            }\n'
                                      '\n'
                                      '            result.add(currentLevel);\n'
                                      '            leftToRight = !leftToRight;\n'
                                      '        }\n'
                                      '\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Use breadth-first search with a queue, adding values to a deque at '
                                      'either front or back depending on level parity.',
                              'is_optimal': True,
                              'name': 'Deque per level insertion',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queue holds up to `n / 2` nodes at the bottom level.',
                              'steps': [   'If the root is null, return an empty list.',
                                           'Add the root to a queue and maintain a boolean flag for '
                                           'direction.',
                                           'For each level, snapshot the queue size and initialize a linked '
                                           'list.',
                                           'Insert polled values at the end if going left-to-right, or at '
                                           'the front if going right-to-left.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is polled once and inserted into the level list in '
                                          'constant time.',
                              'when_to_use': 'Best standard way to produce zigzag level order results.'}],
        'edge_cases': [   {   'expected': '[]',
                              'input': 'root = null',
                              'why': 'An empty tree returns an empty list.'},
                          {   'expected': '[[1]]',
                              'input': 'root = [1]',
                              'why': 'A single node requires only one level.'},
                          {   'expected': '[[1],[3,2],[4,5]]',
                              'input': 'root = [1,2,3,4,null,null,5]',
                              'why': 'Zigzag flips direction across consecutive rows with gaps.'},
                          {   'expected': '[[1],[2],[3],[4]]',
                              'input': 'root = [1,2,null,3,null,4]',
                              'why': 'Single-child chains alternate direction at every depth.'}],
        'follow_ups': [   {   'answer': 'Yes, pop from one stack and push children to the other stack in '
                                        'alternating child order.',
                              'question': 'Can this be done with two stacks instead of a queue?'},
                          {   'answer': 'Use temporary threaded pointers to visit nodes and reverse level '
                                        'segments without extra memory.',
                              'question': 'How would you do this if memory is strictly O(1) auxiliary '
                                          'space?'},
                          {   'answer': 'Filter levels during result collection by checking level index '
                                        'parity.',
                              'question': 'What if we only want odd levels reversed and even levels '
                                          'omitted?'}],
        'interview_script': [   'I need to visit a binary tree in a zigzag level order pattern.',
                                'My obvious first idea is scanning from the root for each level, which takes '
                                'O(n * h) time and O(h) space.',
                                'A key point is keeping queue order left-to-right while alternating '
                                'front-versus-back insertion in the level list.',
                                'I would use breadth-first search with a deque per level, taking O(n) time '
                                'and O(n) space.',
                                'I would test this on an empty tree, single node trees, and trees with '
                                'uneven branches.'],
        'mistakes': [   {   'name': 'The Shuffled Line Trap',
                            'right': 'Always enqueue children left-then-right, and only alternate where '
                                     'values are placed into the level list.',
                            'wrong': 'Changing child push order in the queue breaks the left-to-right '
                                     'structure needed for subsequent levels.'},
                        {   'name': 'Slow array insertions at index zero',
                            'right': 'Use a `LinkedList` or `ArrayDeque` which supports constant-time '
                                     'prepending.',
                            'wrong': 'Calling `ArrayList.add(0, val)` takes linear time per insertion, '
                                     'causing quadratic runtime per level.'},
                        {   'name': 'Forgetting to toggle direction',
                            'right': 'Invert the `leftToRight` boolean after completing each level.',
                            'wrong': 'Omitting the boolean flip at the end of each level causes all levels '
                                     'to face the same direction.'}],
        'pattern': 'Tree BFS',
        'related_slugs': ['lc-102', 'lc-199'],
        'slugs': ['lc-103', 'binary-tree-zigzag-level-order-traversal'],
        'summary': 'Process nodes level by level using a queue. Alternate insertion direction on each level '
                   'so values zigzag left and right.',
        'trigger': "Return the zigzag level order values of a binary tree's nodes.",
        'walkthrough': {   'columns': ['Level', 'Direction', 'Polled Node', 'Level List State'],
                           'input': 'root = [3, 9, 20, null, null, 15, 7]',
                           'result': 'Levels alternate directions, returning [[3], [20, 9], [15, 7]].',
                           'rows': [   ['0', 'Left to Right', '3', '[3]'],
                                       ['1', 'Right to Left', '9', '[9]'],
                                       ['1', 'Right to Left', '20', '[20, 9] (20 added at front)'],
                                       ['2', 'Left to Right', '15', '[15]'],
                                       ['2', 'Left to Right', '7', '[15, 7] (7 added at end)']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int maxDepth(TreeNode root) {\n'
                                      '        if (root == null) return 0;\n'
                                      '        Queue<TreeNode> queue = new ArrayDeque<>();\n'
                                      '        queue.add(root);\n'
                                      '        int depth = 0;\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int size = queue.size();\n'
                                      '            for (int i = 0; i < size; i++) {\n'
                                      '                TreeNode curr = queue.poll();\n'
                                      '                if (curr.left != null) queue.add(curr.left);\n'
                                      '                if (curr.right != null) queue.add(curr.right);\n'
                                      '            }\n'
                                      '            depth++;\n'
                                      '        }\n'
                                      '\n'
                                      '        return depth;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Process nodes level by level using a queue, incrementing a depth '
                                      'counter for each completed level.',
                              'is_optimal': False,
                              'name': 'Breadth-first search level count',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queue holds up to `n / 2` leaf nodes in the worst case of a '
                                           'full binary tree.',
                              'steps': [   'If the root is null, return 0.',
                                           'Push the root into a queue and set depth to 0.',
                                           'While the queue has nodes, measure queue size and poll all nodes '
                                           'on that level.',
                                           'Increment the depth counter after each full level finishes.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node in the tree is processed exactly once.',
                              'when_to_use': 'Useful when the tree is very deep and call stack depth is '
                                             'limited.'},
                          {   'code': 'class Solution {\n'
                                      '    public int maxDepth(TreeNode root) {\n'
                                      '        if (root == null) return 0;\n'
                                      '        return 1 + Math.max(maxDepth(root.left), '
                                      'maxDepth(root.right));\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Find the maximum depth of both subtrees and add 1 for the current '
                                      'node.',
                              'is_optimal': True,
                              'name': 'Recursive depth-first search',
                              'space_complexity': 'O(h)',
                              'space_why': 'The recursion stack requires memory proportional to tree height '
                                           '`h`.',
                              'steps': [   'If the node is null, return 0 because an empty branch has no '
                                           'depth.',
                                           'Recursively find the maximum depth of the left subtree.',
                                           'Recursively find the maximum depth of the right subtree.',
                                           'Return 1 plus the maximum of the two subtree depths.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is visited once during the post-order depth search.',
                              'when_to_use': 'Best standard way to compute tree height with minimal code.'}],
        'edge_cases': [   {'expected': '0', 'input': 'root = null', 'why': 'An empty tree has 0 depth.'},
                          {'expected': '1', 'input': 'root = [1]', 'why': 'A single node has depth 1.'},
                          {   'expected': '4',
                              'input': 'root = [1,2,null,3,null,4]',
                              'why': 'A linear branch has depth equal to total node count.'},
                          {   'expected': '2',
                              'input': 'root = [1,null,2]',
                              'why': 'A tree with only a right child has depth 2.'}],
        'follow_ups': [   {   'answer': 'Ignore null branches and use breadth-first search to stop at the '
                                        'very first leaf encountered.',
                              'question': 'How would you find the minimum depth to the nearest leaf?'},
                          {   'answer': 'Yes, use a stack storing paired node references and current depth '
                                        'values.',
                              'question': 'Can this be computed with a stack instead of recursion?'},
                          {   'answer': 'Distribute subtrees across parallel workers and take the maximum of '
                                        'returned heights.',
                              'question': 'What if the tree contains billions of nodes?'}],
        'interview_script': [   'I need to compute the maximum depth of a binary tree from root to leaf.',
                                'My obvious first idea is level-by-level breadth-first search counting '
                                'levels, taking O(n) time and O(n) space.',
                                'A key point is that the depth of any subtree is one plus the maximum depth '
                                'of its children.',
                                'I would use a recursive post-order helper, taking O(n) time and O(h) call '
                                'stack space.',
                                'I would test this on an empty tree, a single node tree, and a completely '
                                'skewed tree.'],
        'mistakes': [   {   'name': 'The Count Trap',
                            'right': 'Remember that a single root node has depth 1, and an empty tree has '
                                     'depth 0.',
                            'wrong': 'Counting edges instead of nodes gives a depth one less than required.'},
                        {   'name': 'Missing null check',
                            'right': 'Always return 0 immediately when a null node reference is encountered.',
                            'wrong': 'Accessing children without checking if the node is null causes null '
                                     'pointer exceptions.'},
                        {   'name': 'Taking minimum instead of maximum',
                            'right': 'Use Math.max to find the longest path to any leaf.',
                            'wrong': 'Using Math.min instead of Math.max finds the shortest branch rather '
                                     'than the maximum depth.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-110', 'lc-543'],
        'slugs': ['lc-104', 'maximum-depth-of-binary-tree'],
        'summary': 'Find the depth of left and right subtrees recursively. The answer is one plus the larger '
                   'of the two depths.',
        'trigger': 'Given the root of a binary tree, return its maximum depth.',
        'walkthrough': {   'columns': ['Node', 'Left Depth', 'Right Depth', 'Computed Depth'],
                           'input': 'root = [3, 9, 20, null, null, 15, 7]',
                           'result': 'Root combines depths from both subtrees, returning 3.',
                           'rows': [   ['9', '0', '0', '1 + max(0, 0) = 1'],
                                       ['15', '0', '0', '1 + max(0, 0) = 1'],
                                       ['7', '0', '0', '1 + max(0, 0) = 1'],
                                       ['20', '1', '1', '1 + max(1, 1) = 2'],
                                       ['3 (Root)', '1', '2', '1 + max(1, 2) = 3']]}},
    {   'approaches': [   {   'code': 'class Solution {\n'
                                      '    public TreeNode buildTree(int[] preorder, int[] inorder) {\n'
                                      '        return build(preorder, 0, preorder.length - 1, inorder, 0, '
                                      'inorder.length - 1);\n'
                                      '    }\n'
                                      '\n'
                                      '    private TreeNode build(int[] preorder, int preStart, int preEnd, '
                                      'int[] inorder, int inStart, int inEnd) {\n'
                                      '        if (preStart > preEnd || inStart > inEnd) return null;\n'
                                      '\n'
                                      '        int rootVal = preorder[preStart];\n'
                                      '        TreeNode root = new TreeNode(rootVal);\n'
                                      '\n'
                                      '        int inIndex = inStart;\n'
                                      '        while (inIndex <= inEnd && inorder[inIndex] != rootVal) {\n'
                                      '            inIndex++;\n'
                                      '        }\n'
                                      '\n'
                                      '        int leftSize = inIndex - inStart;\n'
                                      '        root.left = build(preorder, preStart + 1, preStart + '
                                      'leftSize, inorder, inStart, inIndex - 1);\n'
                                      '        root.right = build(preorder, preStart + leftSize + 1, preEnd, '
                                      'inorder, inIndex + 1, inEnd);\n'
                                      '\n'
                                      '        return root;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'For each root picked from preorder, linearly scan inorder to find '
                                      'where to split subtrees.',
                              'is_optimal': False,
                              'name': 'Linear search in inorder array',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack depth reaches `O(h)` frames without extra data '
                                           'structures.',
                              'steps': [   'Pick the current root value from the start of the preorder '
                                           'range.',
                                           'Scan linearly through the inorder range to locate that root '
                                           'value.',
                                           'Recursively build the left subtree using elements before the '
                                           'split index.',
                                           'Recursively build the right subtree using elements after the '
                                           'split index.'],
                              'time_complexity': 'O(n^2)',
                              'time_why': 'Scanning the inorder array takes `O(n)` time for each of the `n` '
                                          'nodes on a skewed tree.',
                              'when_to_use': 'Only sensible if memory is strictly limited and no hash map is '
                                             'allowed.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    private int preIndex = 0;\n'
                                      '    private Map<Integer, Integer> inMap = new HashMap<>();\n'
                                      '\n'
                                      '    public TreeNode buildTree(int[] preorder, int[] inorder) {\n'
                                      '        for (int i = 0; i < inorder.length; i++) {\n'
                                      '            inMap.put(inorder[i], i);\n'
                                      '        }\n'
                                      '        return build(preorder, 0, inorder.length - 1);\n'
                                      '    }\n'
                                      '\n'
                                      '    private TreeNode build(int[] preorder, int left, int right) {\n'
                                      '        if (left > right) return null;\n'
                                      '\n'
                                      '        int rootVal = preorder[preIndex++];\n'
                                      '        TreeNode root = new TreeNode(rootVal);\n'
                                      '        int mid = inMap.get(rootVal);\n'
                                      '\n'
                                      '        root.left = build(preorder, left, mid - 1);\n'
                                      '        root.right = build(preorder, mid + 1, right);\n'
                                      '\n'
                                      '        return root;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Map each value to its index in inorder for constant-time lookups, '
                                      'then divide and conquer recursively.',
                              'is_optimal': True,
                              'name': 'Hash map lookup for inorder split',
                              'space_complexity': 'O(n)',
                              'space_why': 'The hash map stores `n` elements and the call stack takes `O(h)` '
                                           'space.',
                              'steps': [   'Store each value and its index from the inorder array in a hash '
                                           'map.',
                                           'Track the current root index in preorder with an integer '
                                           'pointer.',
                                           'Use the map to find the root split index in constant time.',
                                           'Recursively construct the left subtree, then the right subtree, '
                                           'and link them to the root.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node is created once, with index lookups taking `O(1)` '
                                          'average time via the hash map.',
                              'when_to_use': 'Best standard way to reconstruct trees from ordered visit '
                                             'arrays.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public TreeNode buildTree(int[] preorder, int[] inorder) {\n'
                                      '        if (preorder.length == 0) return null;\n'
                                      '\n'
                                      '        TreeNode root = new TreeNode(preorder[0]);\n'
                                      '        Deque<TreeNode> stack = new ArrayDeque<>();\n'
                                      '        stack.push(root);\n'
                                      '        int inIndex = 0;\n'
                                      '\n'
                                      '        for (int i = 1; i < preorder.length; i++) {\n'
                                      '            TreeNode node = new TreeNode(preorder[i]);\n'
                                      '\n'
                                      '            if (stack.peek().val != inorder[inIndex]) {\n'
                                      '                stack.peek().left = node;\n'
                                      '            } else {\n'
                                      '                TreeNode parent = null;\n'
                                      '                while (!stack.isEmpty() && stack.peek().val == '
                                      'inorder[inIndex]) {\n'
                                      '                    parent = stack.pop();\n'
                                      '                    inIndex++;\n'
                                      '                }\n'
                                      '                parent.right = node;\n'
                                      '            }\n'
                                      '\n'
                                      '            stack.push(node);\n'
                                      '        }\n'
                                      '\n'
                                      '        return root;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Read the preorder values in order while a stack holds the path from '
                                      'the root down, and let the inorder values say when to stop going left '
                                      'and climb back up.',
                              'is_alternative': True,
                              'is_optimal': False,
                              'name': 'One pass with a stack, no lookup map',
                              'space_complexity': 'O(h)',
                              'space_why': 'The stack holds the path from the root down to the node just '
                                           'made, which is the height of the tree.',
                              'steps': [   'Make a node from the first preorder value, call it the root, and '
                                           'put it on a stack. Point at the first inorder value.',
                                           'Take the next preorder value and make a node for it.',
                                           'If the node on top of the stack does not hold the inorder value '
                                           'you are pointing at, the new node becomes its left child.',
                                           'Otherwise pop while the top holds the value you point at, moving '
                                           'the inorder pointer on one each time. The last node popped takes '
                                           'the new node as its right child.',
                                           'Push the new node and carry on until the preorder values run '
                                           'out.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every value is pushed once and popped once, and nothing is '
                                          'searched for.',
                              'when_to_use': 'When the follow-up takes the hash map away, or you want the '
                                             'tree built going forward rather than by splitting ranges. The '
                                             'only memory is the path from the root down to the newest '
                                             'node.'}],
        'edge_cases': [   {   'expected': '[1]',
                              'input': 'preorder = [1], inorder = [1]',
                              'why': 'A single node tree has a single element.'},
                          {   'expected': '[1,2,null,3]',
                              'input': 'preorder = [1,2,3], inorder = [3,2,1]',
                              'why': 'A left-skewed tree has decreasing preorder values.'},
                          {   'expected': '[1,null,2,null,3]',
                              'input': 'preorder = [1,2,3], inorder = [1,2,3]',
                              'why': 'A right-skewed tree has identical preorder and inorder arrays.'},
                          {   'expected': '[1,2]',
                              'input': 'preorder = [1,2], inorder = [2,1]',
                              'why': 'Two-node tree tests base recursive boundary steps.'}],
        'follow_ups': [   {   'answer': 'Yes, pick roots from the end of postorder and construct right '
                                        'subtrees before left subtrees.',
                              'question': 'Can we reconstruct the tree from inorder and postorder '
                                          'traversals?'},
                          {   'answer': 'Yes, use an explicit stack tracking ancestors in O(h) space.',
                              'question': 'Can we solve this without extra hash map memory?'},
                          {   'answer': 'Reconstruction is impossible without additional disambiguation '
                                        'rules.',
                              'question': 'What if duplicate values are allowed?'}],
        'interview_script': [   'I need to reconstruct a binary tree given its preorder and inorder visit '
                                'arrays.',
                                'My obvious first idea is searching linearly for each root in inorder, which '
                                'takes O(n^2) time.',
                                'A key point is that caching inorder indices in a hash map gives instant '
                                'root boundaries.',
                                'I would use divide and conquer with a hash map, taking O(n) time and O(n) '
                                'space.',
                                'I would test this on single-node trees, left-skewed trees, and right-skewed '
                                'trees.'],
        'mistakes': [   {   'name': 'The Wrong Cut Trap',
                            'right': 'Calculate left subtree size as `mid - left` and advance pointers '
                                     'carefully.',
                            'wrong': 'Passing incorrect slice offsets causes nodes to cross over into the '
                                     'wrong subtree ranges.'},
                        {   'name': 'Duplicate values assumption',
                            'right': 'Ensure the problem guarantees unique node values before relying on '
                                     'value-to-index maps.',
                            'wrong': 'Using a hash map when values can repeat creates ambiguous index '
                                     'lookups.'},
                        {   'name': 'Building right subtree before left',
                            'right': 'Always construct the left child before the right child to match '
                                     'preorder sequence.',
                            'wrong': 'Constructing right subtree before left with a shared preIndex reads '
                                     'left-subtree roots as right children.'}],
        'pattern': 'Divide and conquer',
        'related_slugs': ['lc-108', 'lc-94'],
        'slugs': ['lc-105', 'construct-binary-tree-from-preorder-and-inorder-traversal'],
        'summary': 'The first preorder element is the root. Find its position in inorder to partition left '
                   'and right subtrees recursively.',
        'trigger': 'Given two integer arrays preorder and inorder, construct and return the binary tree.',
        'walkthrough': {   'columns': ['Preorder Root', 'Inorder Index', 'Left Range', 'Right Range'],
                           'input': 'preorder = [3, 9, 20, 15, 7], inorder = [9, 3, 15, 20, 7]',
                           'result': 'Root 3 connects left child 9 and right subtree [20, 15, 7].',
                           'rows': [   ['3', '1', 'inorder: [9]', 'inorder: [15, 20, 7]'],
                                       ['9', '0', 'empty', 'empty'],
                                       ['20', '3', 'inorder: [15]', 'inorder: [7]'],
                                       ['15', '2', 'empty', 'empty'],
                                       ['7', '4', 'empty', 'empty']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public TreeNode sortedArrayToBST(int[] nums) {\n'
                                      '        if (nums == null || nums.length == 0) return null;\n'
                                      '\n'
                                      '        TreeNode root = new TreeNode(0);\n'
                                      '        Deque<Object[]> stack = new ArrayDeque<>();\n'
                                      '        stack.push(new Object[]{root, 0, nums.length - 1, "root"});\n'
                                      '\n'
                                      '        while (!stack.isEmpty()) {\n'
                                      '            Object[] curr = stack.pop();\n'
                                      '            TreeNode parent = (TreeNode) curr[0];\n'
                                      '            int left = (int) curr[1];\n'
                                      '            int right = (int) curr[2];\n'
                                      '            String type = (String) curr[3];\n'
                                      '\n'
                                      '            int mid = left + (right - left) / 2;\n'
                                      '            TreeNode node = new TreeNode(nums[mid]);\n'
                                      '\n'
                                      '            if ("left".equals(type)) parent.left = node;\n'
                                      '            else if ("right".equals(type)) parent.right = node;\n'
                                      '            else root.val = nums[mid];\n'
                                      '\n'
                                      '            TreeNode target = "root".equals(type) ? root : node;\n'
                                      '\n'
                                      '            if (left <= mid - 1) {\n'
                                      '                stack.push(new Object[]{target, left, mid - 1, '
                                      '"left"});\n'
                                      '            }\n'
                                      '            if (mid + 1 <= right) {\n'
                                      '                stack.push(new Object[]{target, mid + 1, right, '
                                      '"right"});\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return root;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Use an explicit stack to store node parents and sub-array ranges, '
                                      'building the tree level by level.',
                              'is_optimal': False,
                              'name': 'Iterative stack range partitioning',
                              'space_complexity': 'O(n)',
                              'space_why': 'The stack stores state objects for up to `n` nodes during '
                                           'construction.',
                              'steps': [   'If the array is empty, return null.',
                                           'Push the full range [0, n - 1] and a root placeholder onto a '
                                           'stack.',
                                           'While the stack is not empty, pop a range and find its middle '
                                           'index.',
                                           'Set the node value, push left half for the left child, and push '
                                           'right half for the right child.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each of the `n` array elements is converted into a tree node '
                                          'once.',
                              'when_to_use': 'Useful if you must avoid recursive call stack limits on very '
                                             'large inputs.'},
                          {   'code': 'class Solution {\n'
                                      '    public TreeNode sortedArrayToBST(int[] nums) {\n'
                                      '        if (nums == null || nums.length == 0) return null;\n'
                                      '        return build(nums, 0, nums.length - 1);\n'
                                      '    }\n'
                                      '\n'
                                      '    private TreeNode build(int[] nums, int left, int right) {\n'
                                      '        if (left > right) return null;\n'
                                      '        int mid = left + (right - left) / 2;\n'
                                      '        TreeNode node = new TreeNode(nums[mid]);\n'
                                      '        node.left = build(nums, left, mid - 1);\n'
                                      '        node.right = build(nums, mid + 1, right);\n'
                                      '        return node;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Choose the middle element as root, recurse on the left half for the '
                                      'left child, and right half for the right child.',
                              'is_optimal': True,
                              'name': 'Recursive middle-element divide and conquer',
                              'space_complexity': 'O(log n)',
                              'space_why': 'Since the tree is balanced, the call stack is strictly bounded '
                                           'by `O(log n)` height.',
                              'steps': [   'If the left pointer exceeds the right pointer, return null.',
                                           'Find the middle index using `left + (right - left) / 2` to '
                                           'prevent overflow.',
                                           'Create a new TreeNode with the middle element value.',
                                           'Set left child from left half range and right child from right '
                                           'half range, then return the root.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every element of the array is visited once to create a node.',
                              'when_to_use': 'Best standard way to create a height-balanced search tree from '
                                             'sorted data.'}],
        'edge_cases': [   {   'expected': '[1]',
                              'input': 'nums = [1]',
                              'why': 'A single element builds a single node tree.'},
                          {   'expected': '[1,null,3]',
                              'input': 'nums = [1,3]',
                              'why': 'Two elements test even-length middle selection.'},
                          {   'expected': '[2,1,3,null,null,null,4]',
                              'input': 'nums = [1,2,3,4]',
                              'why': 'Four elements verify balanced subtrees with even counts.'},
                          {   'expected': '[0,-10,5,null,-3,null,9]',
                              'input': 'nums = [-10,-3,0,5,9]',
                              'why': 'Standard odd-length sorted array producing perfectly balanced tree.'}],
        'follow_ups': [   {   'answer': 'Use slow and fast pointers to find the middle, or simulate inorder '
                                        'visits in O(n) time.',
                              'question': 'What if the input is a sorted singly linked list instead of an '
                                          'array?'},
                          {   'answer': 'Yes, either middle element in an even-sized range produces a valid '
                                        'height-balanced tree.',
                              'question': 'Are multiple valid balanced trees possible for the same array?'},
                          {   'answer': 'Run a post-order height check to confirm that left and right '
                                        'heights differ by at most one at every node.',
                              'question': 'How would you verify that the constructed tree is balanced?'}],
        'interview_script': [   'I need to build a height-balanced binary search tree from a sorted array.',
                                'My obvious first idea is using an explicit stack to partition ranges, '
                                'taking O(n) time and O(n) space.',
                                'A key point is that choosing the middle element balances node counts on '
                                'both sides.',
                                'I would use divide and conquer recursion on array halves, taking O(n) time '
                                'and O(log n) stack space.',
                                'I would test this on single elements, even-length arrays, and odd-length '
                                'arrays.'],
        'mistakes': [   {   'name': 'The Big Sum Trap',
                            'right': 'Use `left + (right - left) / 2` to avoid integer overflow.',
                            'wrong': 'Writing `(left + right) / 2` can overflow when arrays are extremely '
                                     'large.'},
                        {   'name': 'Off-by-one on boundary ranges',
                            'right': 'Pass `mid - 1` for the left boundary and `mid + 1` for the right '
                                     'boundary.',
                            'wrong': 'Using `mid` instead of `mid - 1` for the left half range causes '
                                     'infinite recursion.'},
                        {   'name': 'Picking non-middle elements',
                            'right': 'Always select the exact median to balance subtree sizes evenly.',
                            'wrong': 'Picking the first or last element makes the tree completely skewed and '
                                     'unbalanced.'}],
        'pattern': 'Divide and conquer',
        'related_slugs': ['lc-98', 'lc-230'],
        'slugs': ['lc-108', 'convert-sorted-array-to-binary-search-tree'],
        'summary': 'Pick the middle element as root to keep heights balanced. Recursively build left and '
                   'right subtrees from the halves.',
        'trigger': 'Convert an integer array nums where the elements are sorted in ascending order to a '
                   'height-balanced binary search tree.',
        'walkthrough': {   'columns': ['Range', 'Mid Index', 'Selected Value', 'Child Links'],
                           'input': 'nums = [-10, -3, 0, 5, 9]',
                           'result': 'Balanced tree built with root 0, height 3.',
                           'rows': [   ['[0, 4]', '2', '0', 'Root node chosen'],
                                       ['[0, 1]', '0', '-10', 'Left child of 0'],
                                       ['[1, 1]', '1', '-3', 'Right child of -10'],
                                       ['[3, 4]', '3', '5', 'Right child of 0'],
                                       ['[4, 4]', '4', '9', 'Right child of 5']]}},
    {   'approaches': [   {   'code': 'class Solution {\n'
                                      '    public boolean isBalanced(TreeNode root) {\n'
                                      '        if (root == null) return true;\n'
                                      '        int leftHeight = height(root.left);\n'
                                      '        int rightHeight = height(root.right);\n'
                                      '        if (Math.abs(leftHeight - rightHeight) > 1) return false;\n'
                                      '        return isBalanced(root.left) && isBalanced(root.right);\n'
                                      '    }\n'
                                      '\n'
                                      '    private int height(TreeNode node) {\n'
                                      '        if (node == null) return 0;\n'
                                      '        return 1 + Math.max(height(node.left), height(node.right));\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'For every node in the tree, calculate its left and right heights from '
                                      'scratch and check the difference.',
                              'is_optimal': False,
                              'name': 'Top-down height checks',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to tree height `h`.',
                              'steps': [   'If the current node is null, return true.',
                                           'Calculate the height of the left subtree with a separate helper '
                                           'function.',
                                           'Calculate the height of the right subtree with the helper '
                                           'function.',
                                           'Return true only if the heights differ by at most 1 and both '
                                           'subtrees are balanced.'],
                              'time_complexity': 'O(n^2)',
                              'time_why': 'We calculate heights from scratch for all `n` nodes, taking '
                                          'quadratic time on skewed trees.',
                              'when_to_use': 'Simple to write if a height helper already exists.'},
                          {   'code': 'class Solution {\n'
                                      '    public boolean isBalanced(TreeNode root) {\n'
                                      '        return checkHeight(root) != -1;\n'
                                      '    }\n'
                                      '\n'
                                      '    private int checkHeight(TreeNode node) {\n'
                                      '        if (node == null) return 0;\n'
                                      '\n'
                                      '        int left = checkHeight(node.left);\n'
                                      '        if (left == -1) return -1;\n'
                                      '\n'
                                      '        int right = checkHeight(node.right);\n'
                                      '        if (right == -1) return -1;\n'
                                      '\n'
                                      '        if (Math.abs(left - right) > 1) return -1;\n'
                                      '\n'
                                      '        return 1 + Math.max(left, right);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Compute heights bottom-up, immediately returning -1 to signal '
                                      'imbalance and prune further checks.',
                              'is_optimal': True,
                              'name': 'Bottom-up postorder traversal',
                              'space_complexity': 'O(h)',
                              'space_why': 'The recursion stack depth is equal to tree height `h`.',
                              'steps': [   'Write a helper that returns the height of a subtree or -1 if '
                                           'imbalanced.',
                                           'If the current node is null, return height 0.',
                                           'Check the left child height; if it returns -1, return -1 '
                                           'immediately.',
                                           'Check the right child height; if it returns -1 or the heights '
                                           'differ by more than 1, return -1.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node in the tree is visited at most once.',
                              'when_to_use': 'Best standard way to test tree balance in linear time.'}],
        'edge_cases': [   {   'expected': 'true',
                              'input': 'root = null',
                              'why': 'An empty tree is height-balanced by definition.'},
                          {   'expected': 'true',
                              'input': 'root = [1]',
                              'why': 'A single root node has height 1 and is balanced.'},
                          {   'expected': 'false',
                              'input': 'root = [1,2,2,3,null,null,3,4,null,null,4]',
                              'why': 'Leaves extend deeper on one branch, causing an imbalance.'},
                          {   'expected': 'true',
                              'input': 'root = [1,2,3]',
                              'why': 'A root with two single children is balanced.'}],
        'follow_ups': [   {   'answer': 'An AVL tree has maximum height bounded strictly by 1.44 log2(n).',
                              'question': 'What is the maximum depth of an AVL tree with n nodes?'},
                          {   'answer': 'Store nodes in sorted order using sorted order, then rebuild a '
                                        'balanced BST from the array.',
                              'question': 'How would you rebalance a tree if it is not balanced?'},
                          {   'answer': 'Yes, use a stack and map to track subtree heights bottom-up.',
                              'question': 'Can this be done without recursion?'}],
        'interview_script': [   'I need to determine if a binary tree is height-balanced at every node.',
                                'My obvious first idea is top-down height checks from each node, taking '
                                'O(n^2) time.',
                                'A key point is that returning -1 from a bottom-up pass stops work as soon '
                                'as an imbalance is found.',
                                'I would use a bottom-up post-order check, taking O(n) time and O(h) '
                                'recursion stack space.',
                                'I would test this on an empty tree, single-node trees, and trees with '
                                'balanced roots but skewed subtrees.'],
        'mistakes': [   {   'name': 'The Measure Again Trap',
                            'right': 'Combine height calculation and balance validation in a single '
                                     'bottom-up pass.',
                            'wrong': 'Calling a separate height function at every node leads to slow '
                                     'quadratic runtime.'},
                        {   'name': 'Checking balance only at the root',
                            'right': 'Ensure that every node in the tree satisfies the balance condition.',
                            'wrong': "Only checking that the root's left and right heights differ by at most "
                                     'one misses deeper imbalances.'},
                        {   'name': 'Ignoring early termination',
                            'right': 'Return -1 immediately when any child reports an imbalance.',
                            'wrong': 'Continuing to compute heights after a subtree is already known to be '
                                     'imbalanced wastes work.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-104', 'lc-543'],
        'slugs': ['lc-110', 'balanced-binary-tree'],
        'summary': 'Check that left and right subtree heights differ by at most one. Return minus one upward '
                   'as soon as an imbalance is found.',
        'trigger': 'Given a binary tree, determine if it is height-balanced.',
        'walkthrough': {   'columns': ['Node', 'Left Subtree Height', 'Right Subtree Height', 'Outcome'],
                           'input': 'root = [1, 2, 2, 3, 3, null, null, 4, 4]',
                           'result': 'Imbalance detected at node 2, early stopping returns false.',
                           'rows': [   ['4 (Leaves)', '0', '0', 'Height = 1'],
                                       ['3 (Depth 2)', '1', '1', 'Height = 2'],
                                       ['2 (Left Child)', '2', '0', 'Height difference = 2 > 1; return -1'],
                                       [   '1 (Root)',
                                           'Aborted',
                                           'Aborted',
                                           'Left returned -1; return false']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public boolean hasPathSum(TreeNode root, int targetSum) {\n'
                                      '        if (root == null) return false;\n'
                                      '\n'
                                      '        Queue<TreeNode> nodeQueue = new ArrayDeque<>();\n'
                                      '        Queue<Integer> sumQueue = new ArrayDeque<>();\n'
                                      '\n'
                                      '        nodeQueue.add(root);\n'
                                      '        sumQueue.add(root.val);\n'
                                      '\n'
                                      '        while (!nodeQueue.isEmpty()) {\n'
                                      '            TreeNode curr = nodeQueue.poll();\n'
                                      '            int currSum = sumQueue.poll();\n'
                                      '\n'
                                      '            if (curr.left == null && curr.right == null && currSum == '
                                      'targetSum) {\n'
                                      '                return true;\n'
                                      '            }\n'
                                      '\n'
                                      '            if (curr.left != null) {\n'
                                      '                nodeQueue.add(curr.left);\n'
                                      '                sumQueue.add(currSum + curr.left.val);\n'
                                      '            }\n'
                                      '            if (curr.right != null) {\n'
                                      '                nodeQueue.add(curr.right);\n'
                                      '                sumQueue.add(currSum + curr.right.val);\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return false;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Use two queues to store nodes and their accumulated path sums from '
                                      'the root level by level.',
                              'is_optimal': False,
                              'name': 'Breadth-first search with sum queue',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queues can hold up to `n / 2` nodes across the widest level.',
                              'steps': [   'If the root is null, return false immediately.',
                                           'Initialize a node queue with root and a sum queue with root '
                                           'value.',
                                           'Dequeue a node and its path sum; if it is a leaf and sum equals '
                                           'targetSum, return true.',
                                           'Enqueue left and right children with updated accumulated sums.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is visited at most once.',
                              'when_to_use': 'Useful if you want to find the shallowest path that meets the '
                                             'target sum.'},
                          {   'code': 'class Solution {\n'
                                      '    public boolean hasPathSum(TreeNode root, int targetSum) {\n'
                                      '        if (root == null) return false;\n'
                                      '        if (root.left == null && root.right == null) {\n'
                                      '            return targetSum == root.val;\n'
                                      '        }\n'
                                      '        int remaining = targetSum - root.val;\n'
                                      '        return hasPathSum(root.left, remaining) || '
                                      'hasPathSum(root.right, remaining);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': "Subtract the current node's value from targetSum and recurse down to "
                                      'child nodes until a leaf is found.',
                              'is_optimal': True,
                              'name': 'Recursive depth-first search',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is bounded by tree height `h`.',
                              'steps': [   'If the current node is null, return false because no path '
                                           'exists.',
                                           'If the node is a leaf, return whether its value matches the '
                                           'remaining target sum.',
                                           'Recursively check the left child with `targetSum - root.val`.',
                                           'Return true if either the left or right child path achieves the '
                                           'required sum.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node is visited at most once during the depth-first search.',
                              'when_to_use': 'Best standard way to verify root-to-leaf path sums cleanly.'}],
        'edge_cases': [   {   'expected': 'false',
                              'input': 'root = null, targetSum = 0',
                              'why': 'An empty tree has no root-to-leaf paths.'},
                          {   'expected': 'false',
                              'input': 'root = [1,2], targetSum = 1',
                              'why': 'Node 1 is not a leaf, so path cannot end there.'},
                          {   'expected': 'true',
                              'input': 'root = [1,2], targetSum = 3',
                              'why': 'Path 1 -> 2 reaches leaf with sum 3.'},
                          {   'expected': 'true',
                              'input': 'root = [-2,null,-3], targetSum = -5',
                              'why': 'Handles negative node values correctly.'}],
        'follow_ups': [   {   'answer': 'Use backtracking to maintain the current path list, copying it when '
                                        'a valid leaf is reached.',
                              'question': 'What if we need to return all valid root-to-leaf paths?'},
                          {   'answer': 'Use prefix sums stored in a hash map during tree depth-first search '
                                        'in O(n) time.',
                              'question': 'What if paths can start and end at any node?'},
                          {   'answer': 'Use 64-bit long integers for accumulated sums to avoid integer '
                                        'overflow.',
                              'question': 'How would you handle very large target sums that exceed 32-bit '
                                          'integers?'}],
        'interview_script': [   'I need to check if there is a root-to-leaf path that sums up to targetSum.',
                                'My obvious first idea is breadth-first search tracking running sums, taking '
                                'O(n) time and O(n) queue space.',
                                'A key point is that the path must reach a real leaf node, not just an '
                                'internal node.',
                                'I would use recursive depth-first search subtracting node values, taking '
                                'O(n) time and O(h) space.',
                                'I would test this on an empty tree, single-node trees, negative node '
                                'values, and incomplete paths.'],
        'mistakes': [   {   'name': 'The Early Stop Trap',
                            'right': 'Only check the target condition when both left and right children are '
                                     'null.',
                            'wrong': 'Returning true when remaining sum reaches zero at an internal node '
                                     'violates the root-to-leaf path rule.'},
                        {   'name': 'Null root returning true for zero target',
                            'right': 'Always return false when root is null regardless of targetSum.',
                            'wrong': 'Returning true when root is null and targetSum is 0 is incorrect '
                                     'because an empty tree has no paths.'},
                        {   'name': 'Early pruning with negative values',
                            'right': 'Do not prune paths based on sum size because negative values can '
                                     'reduce the sum later.',
                            'wrong': 'Assuming sum only grows breaks when node values can be negative '
                                     'numbers.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-124', 'lc-104'],
        'slugs': ['lc-112', 'path-sum'],
        'summary': 'Subtract node values along each path. When reaching a leaf, check if the remaining '
                   'target equals the leaf value.',
        'trigger': 'Given the root of a binary tree and an integer targetSum, return true if the tree has a '
                   'root-to-leaf path.',
        'walkthrough': {   'columns': ['Current Node', 'Target Left', 'Is Leaf', 'Decision'],
                           'input': 'root = [5, 4, 8, 11, null, 13, 4], targetSum = 20',
                           'result': 'No leaf path adds up to 20, returning false.',
                           'rows': [   ['5', '20', 'No', 'Subtract 5, search children with remaining 15'],
                                       ['4', '15', 'No', 'Subtract 4, search children with remaining 11'],
                                       ['11', '11', 'No (has child)', 'Subtract 11, remaining 0'],
                                       ['8 (Right Branch)', '15', 'No', 'Search right children']]}},
    {   'approaches': [   {   'code': 'class Solution {\n'
                                      '    private int maxPath = Integer.MIN_VALUE;\n'
                                      '\n'
                                      '    public int maxPathSum(TreeNode root) {\n'
                                      '        if (root == null) return 0;\n'
                                      '        evaluate(root);\n'
                                      '        return maxPath;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void evaluate(TreeNode node) {\n'
                                      '        if (node == null) return;\n'
                                      '        int leftGain = Math.max(0, maxGainFrom(node.left));\n'
                                      '        int rightGain = Math.max(0, maxGainFrom(node.right));\n'
                                      '        maxPath = Math.max(maxPath, node.val + leftGain + '
                                      'rightGain);\n'
                                      '        evaluate(node.left);\n'
                                      '        evaluate(node.right);\n'
                                      '    }\n'
                                      '\n'
                                      '    private int maxGainFrom(TreeNode node) {\n'
                                      '        if (node == null) return 0;\n'
                                      '        return node.val + Math.max(0, '
                                      'Math.max(maxGainFrom(node.left), maxGainFrom(node.right)));\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'For every node in the tree, calculate the maximum downward branch '
                                      'from left and right children separately.',
                              'is_optimal': False,
                              'name': 'Recursive helper with separate branch sums',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to the tree height `h`.',
                              'steps': [   'Visit each node in the tree recursively.',
                                           'At each node, compute the max downward branch from the left '
                                           'child.',
                                           'Compute the max downward branch from the right child.',
                                           'Update a global maximum path with `left + node.val + right`, '
                                           'then recurse on children.'],
                              'time_complexity': 'O(n^2)',
                              'time_why': 'We compute branch gains from scratch for each of the `n` nodes, '
                                          'taking quadratic time on skewed trees.',
                              'when_to_use': 'Only sensible as a conceptual first approach before combining '
                                             'calculations.'},
                          {   'code': 'class Solution {\n'
                                      '    private int maxSum = Integer.MIN_VALUE;\n'
                                      '\n'
                                      '    public int maxPathSum(TreeNode root) {\n'
                                      '        maxGain(root);\n'
                                      '        return maxSum;\n'
                                      '    }\n'
                                      '\n'
                                      '    private int maxGain(TreeNode node) {\n'
                                      '        if (node == null) return 0;\n'
                                      '\n'
                                      '        int leftGain = Math.max(0, maxGain(node.left));\n'
                                      '        int rightGain = Math.max(0, maxGain(node.right));\n'
                                      '\n'
                                      '        int priceNewPath = node.val + leftGain + rightGain;\n'
                                      '        maxSum = Math.max(maxSum, priceNewPath);\n'
                                      '\n'
                                      '        return node.val + Math.max(leftGain, rightGain);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Compute the maximum single-branch gain bottom-up, while updating the '
                                      'global maximum with the combined arch at each node.',
                              'is_optimal': True,
                              'name': 'Bottom-up postorder subtree gains',
                              'space_complexity': 'O(h)',
                              'space_why': 'The recursion stack requires memory bounded by tree height `h`.',
                              'steps': [   'Maintain a global variable initialized to minimum integer value.',
                                           'In a post-order helper, recursively find the maximum branch gain '
                                           'from left and right subtrees.',
                                           'Discard negative branch gains by taking `Math.max(0, gain)`.',
                                           'Update the global maximum with `node.val + leftGain + '
                                           'rightGain`.',
                                           'Return `node.val + Math.max(leftGain, rightGain)` to the parent '
                                           'caller.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is visited once during the post-order depth search.',
                              'when_to_use': 'Best standard way to compute maximum path sums in trees in '
                                             'linear time.'}],
        'edge_cases': [   {   'expected': '-3',
                              'input': 'root = [-3]',
                              'why': 'A single negative node must return its own value.'},
                          {   'expected': '6',
                              'input': 'root = [1,2,3]',
                              'why': 'All positive values combine through the root: 2 + 1 + 3 = 6.'},
                          {   'expected': '-1',
                              'input': 'root = [-2,-1]',
                              'why': 'Max path selects the least negative single node.'},
                          {   'expected': '2',
                              'input': 'root = [2,-1]',
                              'why': 'Excludes the negative child branch.'}],
        'follow_ups': [   {   'answer': 'Track the best split node and reconstruct the path by walking down '
                                        'the highest gain branches.',
                              'question': 'How would you return the actual nodes along the maximum path?'},
                          {   'answer': 'Store depth-indexed gain lists at each node and combine them using '
                                        'dynamic programming.',
                              'question': 'What if the path length is restricted to at most k edges?'},
                          {   'answer': 'Finding longest simple path in a general graph is NP-hard, '
                                        'requiring exponential search.',
                              'question': 'Can this be extended to an arbitrary general graph?'}],
        'interview_script': [   'I need to find the maximum path sum between any two nodes in a binary tree.',
                                'My obvious first idea is evaluating separate branch sums from each node, '
                                'taking O(n^2) time.',
                                'A key point is clamping negative branch sums to zero and returning only the '
                                'single best branch to the parent.',
                                'I would use a bottom-up post-order helper updating a global max, taking '
                                'O(n) time and O(h) space.',
                                'I would test this on all-negative trees, single-node trees, and trees where '
                                'the best path avoids the root.'],
        'mistakes': [   {   'name': 'The Fork Trap',
                            'right': 'Only return `node.val + Math.max(left, right)` because a path can only '
                                     'extend down one branch.',
                            'wrong': 'Returning `node.val + left + right` to parent forms a branching path '
                                     'which is invalid for a simple path.'},
                        {   'name': 'Including negative branch gains',
                            'right': 'Clamp negative branch gains to 0 with `Math.max(0, gain)` to omit '
                                     'harmful paths.',
                            'wrong': 'Adding a negative branch sum reduces the total path sum.'},
                        {   'name': 'Initializing global max to zero',
                            'right': 'Initialize global max to Integer.MIN_VALUE so negative node values are '
                                     'handled correctly.',
                            'wrong': 'Setting max to 0 fails when all node values in the tree are '
                                     'negative.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-543', 'lc-112'],
        'slugs': ['lc-124', 'binary-tree-maximum-path-sum'],
        'summary': 'At each node, compute the best branch sum from left and right. Update the global path '
                   'sum with left plus root plus right.',
        'trigger': 'Given the root of a binary tree, return the maximum path sum of any non-empty path.',
        'walkthrough': {   'columns': ['Node', 'Left Gain', 'Right Gain', 'Arch Sum', 'Returned Gain'],
                           'input': 'root = [-10, 9, 20, null, null, 15, 7]',
                           'result': 'Arch centered at 20 yields maximum sum 42, returning 42.',
                           'rows': [   ['9', '0', '0', '9', '9'],
                                       ['15', '0', '0', '15', '15'],
                                       ['7', '0', '0', '7', '7'],
                                       ['20', '15', '7', '20 + 15 + 7 = 42', '20 + max(15, 7) = 35'],
                                       [   '-10 (Root)',
                                           '9',
                                           '35',
                                           '-10 + 9 + 35 = 34',
                                           'Ignored (max is 42)']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<Integer> rightSideView(TreeNode root) {\n'
                                      '        List<Integer> result = new ArrayList<>();\n'
                                      '        dfs(root, 0, result);\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void dfs(TreeNode node, int depth, List<Integer> result) '
                                      '{\n'
                                      '        if (node == null) return;\n'
                                      '        if (depth == result.size()) {\n'
                                      '            result.add(node.val);\n'
                                      '        }\n'
                                      '        dfs(node.right, depth + 1, result);\n'
                                      '        dfs(node.left, depth + 1, result);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Visit right children before left children, adding the first node '
                                      'visited at each new depth to the result list.',
                              'is_optimal': False,
                              'name': 'Depth-first search right-to-left',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to tree height `h`.',
                              'steps': [   'Create an empty list to hold the visible node values.',
                                           'In a helper function, check if the current depth matches the '
                                           'result list size.',
                                           'If the depth matches, add the node value as the first rightmost '
                                           'node at this level.',
                                           'Recursively visit the right child first at `depth + 1`, then the '
                                           'left child.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'We visit each node in the tree at most once.',
                              'when_to_use': 'Useful if you want to find visible nodes without managing an '
                                             'explicit queue.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<Integer> rightSideView(TreeNode root) {\n'
                                      '        List<Integer> result = new ArrayList<>();\n'
                                      '        if (root == null) return result;\n'
                                      '\n'
                                      '        Queue<TreeNode> queue = new ArrayDeque<>();\n'
                                      '        queue.add(root);\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int levelSize = queue.size();\n'
                                      '            for (int i = 0; i < levelSize; i++) {\n'
                                      '                TreeNode curr = queue.poll();\n'
                                      '                if (i == levelSize - 1) {\n'
                                      '                    result.add(curr.val);\n'
                                      '                }\n'
                                      '                if (curr.left != null) queue.add(curr.left);\n'
                                      '                if (curr.right != null) queue.add(curr.right);\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Process nodes level by level using a queue, recording the last '
                                      'element of each level.',
                              'is_optimal': True,
                              'name': 'Breadth-first search level order traversal',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queue holds up to `n / 2` nodes across the widest tree '
                                           'level.',
                              'steps': [   'If the root is null, return an empty list immediately.',
                                           'Add the root node to a queue.',
                                           'For each level, record the queue size to process the current '
                                           'level completely.',
                                           'When polling nodes on that level, append the value of the last '
                                           'polled node to the result.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is added to and removed from the queue exactly once.',
                              'when_to_use': 'Best standard way to collect visible level nodes using '
                                             'standard level order batching.'}],
        'edge_cases': [   {   'expected': '[]',
                              'input': 'root = null',
                              'why': 'An empty tree has no visible nodes.'},
                          {'expected': '[1]', 'input': 'root = [1]', 'why': 'A single root node is visible.'},
                          {   'expected': '[1,2,3,4]',
                              'input': 'root = [1,2,null,3,null,4]',
                              'why': 'A left-skewed tree exposes all left nodes to the right side view.'},
                          {   'expected': '[1,3,4]',
                              'input': 'root = [1,2,3,4]',
                              'why': 'Node 4 on the left branch is visible because node 3 has no children.'}],
        'follow_ups': [   {   'answer': 'Record the first node of each level at index 0 rather than the last '
                                        'node.',
                              'question': 'How would you return the left side view instead?'},
                          {   'answer': 'Yes, visit right before left and append to the result when depth '
                                        'equals the list size.',
                              'question': 'Can this be solved using right-to-left preorder recursion?'},
                          {   'answer': 'Track horizontal column offsets with a map and keep the last seen '
                                        'node for each column.',
                              'question': 'What if we also need the bottom view of the tree?'}],
        'interview_script': [   'I need to return the values of nodes visible when looking at the tree from '
                                'the right side.',
                                'My obvious first idea is depth-first search visiting right subtrees first, '
                                'taking O(n) time and O(h) space.',
                                'A key point is that the rightmost node at any depth is just the last node '
                                'on that level.',
                                'I would use breadth-first search with queue level batching, taking O(n) '
                                'time and O(n) space.',
                                'I would test this on an empty tree, a left-skewed tree, and trees where '
                                'left branches outgrow right branches.'],
        'mistakes': [   {   'name': 'The Right Turn Trap',
                            'right': 'Visit all nodes level by level or visit both subtrees so deeper left '
                                     'nodes can be seen.',
                            'wrong': 'Walking down only right child pointers misses left-subtree nodes that '
                                     'become visible when right branches end early.'},
                        {   'name': 'Picking first node instead of last',
                            'right': 'Record the node at index `levelSize - 1` to capture the rightmost '
                                     'element.',
                            'wrong': 'Selecting index 0 in the level queue returns the left side view '
                                     'instead of the right side view.'},
                        {   'name': 'Dynamic queue size inside level loop',
                            'right': 'Snapshot the queue size into a constant before beginning the level '
                                     'loop.',
                            'wrong': 'Re-reading queue size while children are being enqueued leaks nodes '
                                     'across levels.'}],
        'pattern': 'Tree BFS',
        'related_slugs': ['lc-102', 'lc-103'],
        'slugs': ['lc-199', 'binary-tree-right-side-view'],
        'summary': 'Process the tree level by level. The last node processed on each level is the one '
                   'visible from the right.',
        'trigger': 'Imagine yourself standing on the right side of it, return the values of the nodes you '
                   'can see ordered from top to bottom.',
        'walkthrough': {   'columns': ['Level', 'Nodes on Level', 'Last Polled Node', 'Visible List'],
                           'input': 'root = [1, 2, 3, null, 5, null, 4]',
                           'result': 'Rightmost nodes collected level by level, returning [1, 3, 4].',
                           'rows': [   ['0', '[1]', '1', '[1]'],
                                       ['1', '[2, 3]', '3', '[1, 3]'],
                                       ['2', '[5, 4]', '4', '[1, 3, 4]']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public TreeNode invertTree(TreeNode root) {\n'
                                      '        if (root == null) return null;\n'
                                      '        Queue<TreeNode> queue = new ArrayDeque<>();\n'
                                      '        queue.add(root);\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            TreeNode curr = queue.poll();\n'
                                      '            TreeNode temp = curr.left;\n'
                                      '            curr.left = curr.right;\n'
                                      '            curr.right = temp;\n'
                                      '\n'
                                      '            if (curr.left != null) queue.add(curr.left);\n'
                                      '            if (curr.right != null) queue.add(curr.right);\n'
                                      '        }\n'
                                      '\n'
                                      '        return root;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Push nodes into a queue and swap left and right child references for '
                                      'each dequeued node.',
                              'is_optimal': False,
                              'name': 'Iterative breadth-first search swap',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queue can hold up to `n / 2` nodes on the widest tree level.',
                              'steps': [   'If the root is null, return null immediately.',
                                           'Add the root node to a queue.',
                                           'While the queue has nodes, dequeue a node and swap its left and '
                                           'right pointers.',
                                           'Enqueue any non-null children to continue swapping down the '
                                           'tree.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is processed once by the queue.',
                              'when_to_use': 'Good when you want to avoid deep recursion call stack limits.'},
                          {   'code': 'class Solution {\n'
                                      '    public TreeNode invertTree(TreeNode root) {\n'
                                      '        if (root == null) return null;\n'
                                      '        TreeNode left = invertTree(root.left);\n'
                                      '        TreeNode right = invertTree(root.right);\n'
                                      '        root.left = right;\n'
                                      '        root.right = left;\n'
                                      '        return root;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Recursively invert the left and right subtrees and swap their '
                                      'pointers at the current node.',
                              'is_optimal': True,
                              'name': 'Recursive child pointer swap',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to tree height `h`.',
                              'steps': [   'If the current node is null, return null.',
                                           'Invert the left subtree recursively and store the result.',
                                           'Invert the right subtree recursively and store the result.',
                                           'Assign the inverted right subtree to `root.left` and inverted '
                                           'left subtree to `root.right`.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node in the tree is visited exactly once.',
                              'when_to_use': 'Best standard way to mirror a binary tree cleanly in place.'}],
        'edge_cases': [   {'expected': '[]', 'input': 'root = null', 'why': 'An empty tree returns null.'},
                          {   'expected': '[1]',
                              'input': 'root = [1]',
                              'why': 'A single root node remains unchanged.'},
                          {   'expected': '[1,null,2]',
                              'input': 'root = [1,2]',
                              'why': 'A left child flips to become a right child.'},
                          {   'expected': '[1,2]',
                              'input': 'root = [1,null,2]',
                              'why': 'A right child flips to become a left child.'}],
        'follow_ups': [   {   'answer': 'Yes, use a stack to visit nodes and swap child references '
                                        'identically to the queue approach.',
                              'question': 'Can this be done without recursion using a single stack?'},
                          {   'answer': 'Inverting twice returns the tree to its exact original structure.',
                              'question': 'What happens if you invert an already inverted tree?'},
                          {   'answer': 'Reverse the list of children at each node and recursively invert '
                                        'each child.',
                              'question': 'How would you invert an n-ary tree?'}],
        'interview_script': [   'I need to invert a binary tree by mirroring left and right subtrees at '
                                'every node.',
                                'My obvious first idea is breadth-first search swapping child pointers in a '
                                'queue, taking O(n) time and O(n) space.',
                                'A key point is that inverting subtrees recursively and swapping their '
                                'references mirrors the tree in place.',
                                'I would use recursive depth-first search, taking O(n) time and O(h) '
                                'recursion stack space.',
                                'I would test this on an empty tree, single-node trees, and asymmetric '
                                'trees.'],
        'mistakes': [   {   'name': 'The Lost Side Trap',
                            'right': 'Store the inverted subtrees in temporary variables before reassigning '
                                     'child pointers.',
                            'wrong': 'Writing `root.left = invert(root.right)` overwrites the original left '
                                     'pointer before inverting it.'},
                        {   'name': 'Missing null root check',
                            'right': 'Return null immediately when a null node reference is received.',
                            'wrong': 'Calling methods on a null root without a guard causes null pointer '
                                     'exceptions.'},
                        {   'name': 'Swapping values instead of pointers',
                            'right': 'Swap the structural node references so different subtree shapes mirror '
                                     'properly.',
                            'wrong': 'Attempting to swap integer values only works on symmetric tree '
                                     'structures.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-100', 'lc-101'],
        'slugs': ['lc-226', 'invert-binary-tree'],
        'summary': 'Swap the left and right child pointers at every node recursively. Return the root after '
                   'all children are swapped.',
        'trigger': 'Given the root of a binary tree, invert the tree, and return its root.',
        'walkthrough': {   'columns': ['Node', 'Original Left', 'Original Right', 'Swapped Children'],
                           'input': 'root = [4, 2, 7, 1, 3, 6, 9]',
                           'result': 'Entire tree is mirrored around the root, returning inverted tree.',
                           'rows': [   ['2', '1', '3', 'Left becomes 3, right becomes 1'],
                                       ['7', '6', '9', 'Left becomes 9, right becomes 6'],
                                       [   '4 (Root)',
                                           'Subtree 2',
                                           'Subtree 7',
                                           'Left becomes Subtree 7, right becomes Subtree 2']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int kthSmallest(TreeNode root, int k) {\n'
                                      '        List<Integer> list = new ArrayList<>();\n'
                                      '        inorder(root, list);\n'
                                      '        return list.get(k - 1);\n'
                                      '    }\n'
                                      '\n'
                                      '    private void inorder(TreeNode node, List<Integer> list) {\n'
                                      '        if (node == null) return;\n'
                                      '        inorder(node.left, list);\n'
                                      '        list.add(node.val);\n'
                                      '        inorder(node.right, list);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Perform a complete inorder visit of the tree into a list, then return '
                                      'the element at index `k - 1`.',
                              'is_optimal': False,
                              'name': 'Full inorder traversal to list',
                              'space_complexity': 'O(n)',
                              'space_why': 'The array list stores all `n` values in memory.',
                              'steps': [   'Create an empty array list to store sorted node values.',
                                           'Visit the tree in left-root-right sequence, adding every value '
                                           'to the list.',
                                           'Retrieve the element at index `k - 1` from the list.',
                                           'Return that value as the kth smallest element.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'We visit all `n` nodes and append them to an array list.',
                              'when_to_use': 'Simple if you need to answer multiple queries on a static '
                                             'tree.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int kthSmallest(TreeNode root, int k) {\n'
                                      '        Deque<TreeNode> stack = new ArrayDeque<>();\n'
                                      '        TreeNode curr = root;\n'
                                      '\n'
                                      '        while (curr != null || !stack.isEmpty()) {\n'
                                      '            while (curr != null) {\n'
                                      '                stack.push(curr);\n'
                                      '                curr = curr.left;\n'
                                      '            }\n'
                                      '\n'
                                      '            curr = stack.pop();\n'
                                      '            k--;\n'
                                      '            if (k == 0) {\n'
                                      '                return curr.val;\n'
                                      '            }\n'
                                      '\n'
                                      '            curr = curr.right;\n'
                                      '        }\n'
                                      '\n'
                                      '        return -1;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Use an explicit stack to walk nodes in sorted order, decrementing k '
                                      'and stopping as soon as k reaches 0.',
                              'is_optimal': True,
                              'name': 'Iterative inorder with early stopping',
                              'space_complexity': 'O(h)',
                              'space_why': 'The stack holds at most `h` ancestor nodes at any point.',
                              'steps': [   'Push all left ancestors of the root onto an explicit stack.',
                                           'Pop the top node from the stack and decrement the k counter.',
                                           'If k reaches 0, return the value of the popped node immediately.',
                                           "Move to the popped node's right child and continue pushing its "
                                           'left descendants.'],
                              'time_complexity': 'O(h + k)',
                              'time_why': 'We descend to the smallest element in `O(h)` time and step '
                                          'through only `k` elements.',
                              'when_to_use': 'Best standard way to find the kth smallest value with early '
                                             'exit.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int kthSmallest(TreeNode root, int k) {\n'
                                      '        Map<TreeNode, Integer> counts = new HashMap<>();\n'
                                      '        countNodes(root, counts);\n'
                                      '\n'
                                      '        TreeNode node = root;\n'
                                      '        while (node != null) {\n'
                                      '            int left = counts.getOrDefault(node.left, 0);\n'
                                      '            if (k == left + 1) {\n'
                                      '                return node.val;\n'
                                      '            }\n'
                                      '            if (k <= left) {\n'
                                      '                node = node.left;\n'
                                      '            } else {\n'
                                      '                k -= left + 1;\n'
                                      '                node = node.right;\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return -1;\n'
                                      '    }\n'
                                      '\n'
                                      '    private int countNodes(TreeNode node, Map<TreeNode, Integer> '
                                      'counts) {\n'
                                      '        if (node == null) return 0;\n'
                                      '        int size = 1 + countNodes(node.left, counts) + '
                                      'countNodes(node.right, counts);\n'
                                      '        counts.put(node, size);\n'
                                      '        return size;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Work out once how many nodes hang under every node, then each '
                                      'question walks straight down: the count on the left says whether the '
                                      'answer is left, here, or right.',
                              'is_alternative': True,
                              'is_optimal': False,
                              'name': 'Store a subtree count in each node',
                              'space_complexity': 'O(n)',
                              'space_why': 'One count is kept per node, plus the O(h) call stack that fills '
                                           'them in.',
                              'steps': [   'Make one pass that records, for every node, how many nodes its '
                                           'own part of the tree holds.',
                                           'Start at the root with the k you were asked for.',
                                           'Look up L, the count stored for the left child. If k is L plus '
                                           '1, the current node is the answer.',
                                           'If k is smaller than that, step left and keep k. If it is '
                                           'bigger, take L plus 1 away from k and step right.',
                                           'Each step throws away a whole side, so the walk only ever goes '
                                           'down one path.'],
                              'time_complexity': 'O(n) to store the counts, then O(h) per question',
                              'time_why': 'The counts take one pass over the tree. After that a question '
                                          'only walks down one path.',
                              'when_to_use': 'When the same tree is asked many times, or values come and go '
                                             'between questions, which is the usual follow-up here. Each '
                                             'question then costs only the height, and an insert or delete '
                                             'fixes the counts on one path.'}],
        'edge_cases': [   {   'expected': '1',
                              'input': 'root = [1], k = 1',
                              'why': 'A single node tree with k = 1.'},
                          {   'expected': '1',
                              'input': 'root = [2,1,3], k = 1',
                              'why': 'Smallest element sits at the leftmost leaf.'},
                          {   'expected': '3',
                              'input': 'root = [2,1,3], k = 3',
                              'why': 'Largest element sits at the rightmost leaf.'},
                          {   'expected': '2',
                              'input': 'root = [3,1,4,null,2], k = 2',
                              'why': 'Second smallest is an inner right child of the left subtree.'}],
        'follow_ups': [   {   'answer': 'Augment each node with a subtree size counter to answer rank '
                                        'queries in O(h) time.',
                              'question': 'What if the BST is modified often and kth smallest queries are '
                                          'frequent?'},
                          {   'answer': 'Run a reverse inorder walk visiting right child, root, then left '
                                        'child.',
                              'question': 'How would you find the kth largest element?'},
                          {   'answer': 'Yes, use `Morris traversal` to visit nodes in sorted order without '
                                        'a stack or recursion.',
                              'question': 'Can this be done in O(1) extra space?'}],
        'interview_script': [   'I need to find the kth smallest value in a binary search tree.',
                                'My obvious first idea is collecting all values with an inorder visit, '
                                'taking O(n) time and O(n) space.',
                                'A key point is that an explicit stack lets us stop as soon as we pop k '
                                'elements.',
                                'I would use an explicit stack for an inorder walk, taking O(h + k) time and '
                                'O(h) space.',
                                'I would test this with k = 1, k = n, and trees with zigzag branches.'],
        'mistakes': [   {   'name': 'The Full List Trap',
                            'right': 'Stop the search immediately once `k` nodes have been visited.',
                            'wrong': 'Collecting all `n` nodes into an array when `k = 1` does unnecessary '
                                     'linear work.'},
                        {   'name': 'One-based versus zero-based indexing',
                            'right': 'Remember `k` is 1-indexed, so the first element corresponds to `k = '
                                     '1`.',
                            'wrong': 'Returning element at index `k` instead of `k - 1` gives the (k+1)th '
                                     'smallest value.'},
                        {   'name': 'Missing right child exploration',
                            'right': 'Set `curr = curr.right` after popping each node to explore its right '
                                     'branch.',
                            'wrong': 'Popping nodes from the stack without exploring their right subtrees '
                                     'skips subsequent values.'}],
        'pattern': 'Binary search tree',
        'related_slugs': ['lc-98', 'lc-94'],
        'slugs': ['lc-230', 'kth-smallest-element-in-a-bst'],
        'summary': 'Walk the binary search tree in sorted order. Stop and return the value as soon as k '
                   'nodes have been visited.',
        'trigger': 'Given the root of a binary search tree, and an integer k, return the kth smallest value '
                   'in the tree.',
        'walkthrough': {   'columns': ['Current Node', 'Stack State', 'k Counter', 'Popped Value'],
                           'input': 'root = [3, 1, 4, null, 2], k = 1',
                           'result': 'First element popped is 1, returning 1.',
                           'rows': [   ['Descend left', '[3, 1]', '1', '-'],
                                       ['Pop node 1', '[3]', 'Decrements to 0', 'val = 1'],
                                       ['k is 0', 'Stop search', '0', 'Return 1']]}},
    {   'approaches': [   {   'code': 'class Solution {\n'
                                      '    public int lowestCommonAncestor(TreeNode root, int p, int q) {\n'
                                      '        TreeNode node = find(root, p, q);\n'
                                      '        return node == null ? -1 : node.val;\n'
                                      '    }\n'
                                      '\n'
                                      '    private TreeNode find(TreeNode node, int p, int q) {\n'
                                      '        if (node == null || node.val == p || node.val == q) return '
                                      'node;\n'
                                      '        TreeNode left = find(node.left, p, q);\n'
                                      '        TreeNode right = find(node.right, p, q);\n'
                                      '        if (left != null && right != null) return node;\n'
                                      '        return left != null ? left : right;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Search both subtrees recursively as if this were an ordinary binary '
                                      'tree without BST ordering.',
                              'is_optimal': False,
                              'name': 'Unconstrained tree search',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to tree height `h`.',
                              'steps': [   'Check if the current node is null or matches either target '
                                           'value.',
                                           'Recursively search the left subtree and the right subtree.',
                                           'If both subtrees return non-null, the current node is the '
                                           'ancestor.',
                                           'Otherwise, return whichever subtree search returned a matching '
                                           'node.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Without using the BST ordering, we may visit all `n` nodes.',
                              'when_to_use': 'Standard general binary tree search when BST ordering is not '
                                             'assumed.'},
                          {   'code': 'class Solution {\n'
                                      '    public int lowestCommonAncestor(TreeNode root, int p, int q) {\n'
                                      '        TreeNode curr = root;\n'
                                      '        int low = Math.min(p, q);\n'
                                      '        int high = Math.max(p, q);\n'
                                      '        while (curr != null) {\n'
                                      '            if (curr.val > high) {\n'
                                      '                curr = curr.left;\n'
                                      '            } else if (curr.val < low) {\n'
                                      '                curr = curr.right;\n'
                                      '            } else {\n'
                                      '                return curr.val;\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return -1;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Walk down the tree using BST ordering without recursion until target '
                                      'values split.',
                              'is_optimal': True,
                              'name': 'Iterative pointer walk',
                              'space_complexity': 'O(1)',
                              'space_why': 'No recursive stack frames or helper structures are needed.',
                              'steps': [   'Start a pointer at the root of the tree.',
                                           'If both values are smaller than the node value, move to the left '
                                           'child.',
                                           'If both values are greater than the node value, move to the '
                                           'right child.',
                                           'When the values split across the current node, return its '
                                           'value.'],
                              'time_complexity': 'O(h)',
                              'time_why': 'Each step descends one level, inspecting at most `h` nodes.',
                              'when_to_use': 'Best optimal approach for binary search trees.'}],
        'edge_cases': [   {   'expected': '2',
                              'input': 'root = [2,1], p = 2, q = 1',
                              'why': 'One node is the ancestor of the other.'},
                          {   'expected': '2',
                              'input': 'root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4',
                              'why': 'Target 2 is the parent of target 4 in the left branch.'},
                          {   'expected': '6',
                              'input': 'root = [6,2,8], p = 2, q = 8',
                              'why': 'Targets sit in different subtrees of the root.'},
                          {   'expected': '3',
                              'input': 'root = [3,1,4,null,2], p = 2, q = 3',
                              'why': 'Root is one of the target nodes.'}],
        'follow_ups': [   {   'answer': 'Use post-order recursive search to find where reports from both '
                                        'targets meet in O(n) time.',
                              'question': 'What if the tree is an arbitrary binary tree without the BST '
                                          'property?'},
                          {   'answer': 'Verify that both target nodes exist in the tree before or after '
                                        'finding the candidate ancestor.',
                              'question': 'How would you handle nodes that might not be in the tree?'},
                          {   'answer': 'Yes, walk down as long as all target values lie entirely to the '
                                        'left or entirely to the right.',
                              'question': 'Can this be extended to find the LCA of three or more nodes?'}],
        'interview_script': [   'I need to find the lowest common ancestor of two nodes with values p and q '
                                'in a binary search tree.',
                                'My obvious first idea is standard tree recursion without BST ordering, '
                                'taking O(n) time and O(h) space.',
                                'A key point is that BST ordering tells us exactly which subtree holds both '
                                'values without searching both sides.',
                                'I would walk down with a single pointer in a loop, taking O(h) time and '
                                'O(1) space.',
                                'I would test this when one node is an ancestor of the other, and when they '
                                'lie in different subtrees.'],
        'mistakes': [   {   'name': 'The Blind Search Trap',
                            'right': 'Leverage BST ordering to follow only one path down the tree.',
                            'wrong': 'Using general binary tree search ignores the BST ordering property and '
                                     'takes linear time.'},
                        {   'name': 'Assuming p is smaller than q',
                            'right': 'Check whether both values lie on the same side regardless of which one '
                                     'is smaller.',
                            'wrong': 'Writing comparisons assuming `p.val < q.val` fails when `p` has a '
                                     'larger value than `q`.'},
                        {   'name': 'Stepping past ancestor when p equals node',
                            'right': 'If the current node matches either target, it is the ancestor; return '
                                     'it immediately.',
                            'wrong': 'Checking strictly greater or less without handling when current node '
                                     'equals `p` or `q` steps too deep.'}],
        'pattern': 'Binary search tree',
        'related_slugs': ['lc-236', 'lc-98'],
        'slugs': ['lc-235', 'lowest-common-ancestor-of-a-binary-search-tree'],
        'summary': 'Use BST ordering: if both values are smaller, go left. If both are greater, go right. '
                   'Otherwise, the current node is the split.',
        'trigger': 'Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two '
                   'given nodes in the BST.',
        'walkthrough': {   'columns': ['Current Node', 'p Value', 'q Value', 'Decision'],
                           'input': 'root = [6, 2, 8, 0, 4, 7, 9], p = 0, q = 4',
                           'result': 'Lowest common ancestor found at node 2 where the two search paths '
                                     'diverge.',
                           'rows': [   [   '6',
                                           '0',
                                           '4',
                                           'Both values are smaller than 6, so move down to left child 2.'],
                                       [   '2',
                                           '0',
                                           '4',
                                           '0 is smaller than 2 while 4 is larger than 2, so values split '
                                           'here.'],
                                       ['2', '0', '4', 'Return node 2 as the lowest common ancestor.']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int lowestCommonAncestor(TreeNode root, int p, int q) {\n'
                                      '        Map<Integer, TreeNode> parent = new HashMap<>();\n'
                                      '        Queue<TreeNode> queue = new ArrayDeque<>();\n'
                                      '        parent.put(root.val, null);\n'
                                      '        queue.add(root);\n'
                                      '\n'
                                      '        while (!parent.containsKey(p) || !parent.containsKey(q)) {\n'
                                      '            TreeNode curr = queue.poll();\n'
                                      '            if (curr.left != null) {\n'
                                      '                parent.put(curr.left.val, curr);\n'
                                      '                queue.add(curr.left);\n'
                                      '            }\n'
                                      '            if (curr.right != null) {\n'
                                      '                parent.put(curr.right.val, curr);\n'
                                      '                queue.add(curr.right);\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        Set<Integer> ancestors = new HashSet<>();\n'
                                      '        TreeNode curr = findNode(root, p);\n'
                                      '        while (curr != null) {\n'
                                      '            ancestors.add(curr.val);\n'
                                      '            curr = parent.get(curr.val);\n'
                                      '        }\n'
                                      '\n'
                                      '        curr = findNode(root, q);\n'
                                      '        while (!ancestors.contains(curr.val)) {\n'
                                      '            curr = parent.get(curr.val);\n'
                                      '        }\n'
                                      '        return curr.val;\n'
                                      '    }\n'
                                      '\n'
                                      '    private TreeNode findNode(TreeNode root, int val) {\n'
                                      '        if (root == null || root.val == val) return root;\n'
                                      '        TreeNode left = findNode(root.left, val);\n'
                                      '        return left != null ? left : findNode(root.right, val);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': "Record every node's parent with BFS, trace one target back to the "
                                      'root, then walk the other up until their paths cross.',
                              'is_optimal': False,
                              'name': 'Map nodes to their parents',
                              'space_complexity': 'O(n)',
                              'space_why': 'The parent map and queue hold entries for every node visited.',
                              'steps': [   "Walk the tree with a queue and save each node's parent in a map.",
                                           'Stop once both targets have their parent links recorded.',
                                           'Walk up from the first target to the root, adding each node '
                                           'visited.',
                                           'Collect all ancestors of the first node into a set by climbing '
                                           'up to the root.',
                                           'Climb up from the second node until hitting a node already in '
                                           'that ancestor set.',
                                           'Return that shared node as the answer.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'We visit each node once and climb the ancestor chain to the root.',
                              'when_to_use': 'Mention it when nodes already have parent pointers or to show '
                                             'an alternative way.'},
                          {   'code': 'class Solution {\n'
                                      '    public int lowestCommonAncestor(TreeNode root, int p, int q) {\n'
                                      '        TreeNode node = find(root, p, q);\n'
                                      '        return node == null ? -1 : node.val;\n'
                                      '    }\n'
                                      '\n'
                                      '    private TreeNode find(TreeNode node, int p, int q) {\n'
                                      '        if (node == null || node.val == p || node.val == q) return '
                                      'node;\n'
                                      '        TreeNode left = find(node.left, p, q);\n'
                                      '        TreeNode right = find(node.right, p, q);\n'
                                      '        if (left != null && right != null) return node;\n'
                                      '        return left != null ? left : right;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Search down once: a matching node reports itself up, and the node '
                                      'where two reports meet is the answer.',
                              'is_optimal': True,
                              'name': 'Reports climbing the tree',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory equals the tree height h.',
                              'steps': [   'If the current node is empty or matches either target, return '
                                           'the current node.',
                                           'Search the left child for any matching nodes.',
                                           'Search the right child for any matching nodes.',
                                           'If both sides report a node, the current node is their lowest '
                                           'common ancestor.',
                                           'Otherwise, return whichever child returned a match.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'We visit every node at most once in the tree.',
                              'when_to_use': 'The standard interview answer: one clean pass with no extra '
                                             'data structures.'}],
        'edge_cases': [   {   'expected': '3',
                              'input': 'root = [3, 5, 1], p = 5, q = 1',
                              'why': 'The two targets sit in different subtrees of the root.'},
                          {   'expected': '3',
                              'input': 'root = [3, 5, 1], p = 3, q = 5',
                              'why': 'One target is the root and the ancestor of the other.'},
                          {   'expected': '1',
                              'input': 'root = [1, 2], p = 1, q = 2',
                              'why': 'A tiny tree with only two nodes.'},
                          {   'expected': '5',
                              'input': 'root = [3, 5, 1, null, 2], p = 5, q = 2',
                              'why': 'One target is the parent of the other target.'},
                          {   'expected': '2',
                              'input': 'root = [1, 2, null, 3, null, 4], p = 2, q = 4',
                              'why': 'A completely skewed tree like a linked list.'}],
        'follow_ups': [   {   'answer': 'Do a full search to count matches and only return the ancestor if '
                                        'the count reaches two.',
                              'question': 'What if one or both nodes might not be present in the tree?'},
                          {   'answer': "Find each node's depth, lift the deeper node until depths match, "
                                        'then walk both up together.',
                              'question': 'How would you solve this if nodes had parent pointers?'},
                          {   'answer': 'Use an explicit stack for depth-first search while tracking whether '
                                        'both nodes have been found.',
                              'question': 'Can we solve this without recursion?'}],
        'interview_script': [   'I need to find the lowest node that sits above both target nodes in the '
                                'tree.',
                                'The obvious way is to map every node to its parent with BFS. That is O(n) '
                                'time and O(n) space because I store all parents.',
                                'The key point: when I reach either target, it reports itself up and I never '
                                'need to search below it.',
                                'So I do one bottom-up search. That takes O(n) time and O(h) recursion space '
                                'where two reports meet.',
                                'I will test when one target is above the other, targets in different '
                                'subtrees, and a skewed tree.'],
        'mistakes': [   {   'name': 'The Look Below Trap',
                            'right': 'A marked node reports itself at once; never search below it. If the '
                                     'other marked node hides down there, this one is the answer anyway.',
                            'wrong': 'Searching below a matching node when one target node is found.'},
                        {   'name': 'Assuming parent pointers exist',
                            'right': 'Standard tree nodes only point down, so information must travel back '
                                     'up through return values.',
                            'wrong': 'Trying to walk upward from the targets without having parent '
                                     'pointers.'},
                        {   'name': 'Comparing node values instead of nodes',
                            'right': 'Compare the node references directly unless the problem statement '
                                     'guarantees unique values.',
                            'wrong': 'Comparing integer values when node values might not be unique.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-235', 'lc-100'],
        'slugs': ['lc-236', 'shared-ancestor'],
        'summary': 'Search down recursively. When a node matches p or q, report it up immediately. If both '
                   'left and right return a match, this node is their lowest common ancestor.',
        'trigger': 'a tree and two of its nodes, and you are asked for the lowest node that sits above both',
        'walkthrough': {   'columns': [   'call',
                                          'node',
                                          'action',
                                          'left report',
                                          'right report',
                                          'return value'],
                           'input': 'root = [3, 5, 1, null, 2], p = 5, q = 2',
                           'result': 'Lowest common ancestor is 5.',
                           'rows': [   [   'find(1)',
                                           '1',
                                           'neither target, both children empty',
                                           'null',
                                           'null',
                                           'null'],
                                       [   'find(5)',
                                           '5',
                                           'matches p, so report 5 without looking below',
                                           '-',
                                           '-',
                                           'node 5'],
                                       [   'find(3)',
                                           '3',
                                           'left child reported 5 and right was null',
                                           'node 5',
                                           'null',
                                           'node 5']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Codec {\n'
                                      '    public String serialize(TreeNode root) {\n'
                                      '        if (root == null) return "";\n'
                                      '        Queue<TreeNode> queue = new LinkedList<>();\n'
                                      '        queue.add(root);\n'
                                      '        String res = "";\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            TreeNode node = queue.poll();\n'
                                      '            if (node == null) {\n'
                                      '                res += "null,";\n'
                                      '            } else {\n'
                                      '                res += node.val + ",";\n'
                                      '                queue.add(node.left);\n'
                                      '                queue.add(node.right);\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return res;\n'
                                      '    }\n'
                                      '\n'
                                      '    public TreeNode deserialize(String data) {\n'
                                      '        if (data == null || data.isEmpty()) return null;\n'
                                      '        String[] values = data.split(",");\n'
                                      '        TreeNode root = new TreeNode(Integer.parseInt(values[0]));\n'
                                      '        Queue<TreeNode> queue = new LinkedList<>();\n'
                                      '        queue.add(root);\n'
                                      '\n'
                                      '        for (int i = 1; i < values.length && !queue.isEmpty(); i++) '
                                      '{\n'
                                      '            TreeNode parent = queue.poll();\n'
                                      '            if (!values[i].equals("null")) {\n'
                                      '                TreeNode left = new '
                                      'TreeNode(Integer.parseInt(values[i]));\n'
                                      '                parent.left = left;\n'
                                      '                queue.add(left);\n'
                                      '            }\n'
                                      '            if (++i < values.length && !values[i].equals("null")) {\n'
                                      '                TreeNode right = new '
                                      'TreeNode(Integer.parseInt(values[i]));\n'
                                      '                parent.right = right;\n'
                                      '                queue.add(right);\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return root;\n'
                                      '    }\n'
                                      '}\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public TreeNode roundtrip(TreeNode root) {\n'
                                      '        Codec codec = new Codec();\n'
                                      '        return codec.deserialize(codec.serialize(root));\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Serialize tree level by level using a queue, using repeated string '
                                      'additions, and reconstruct level by level.',
                              'is_optimal': False,
                              'name': 'Level order serialization with queue',
                              'space_complexity': 'O(n)',
                              'space_why': 'The queue and token array take `O(n)` memory.',
                              'steps': [   'Use a queue to process nodes level by level.',
                                           'Append node values or null symbols to a string with commas.',
                                           'For deserialization, split the string into tokens and rebuild '
                                           'the tree using a queue.',
                                           'Link left and right children as tokens are read.'],
                              'time_complexity': 'O(n^2)',
                              'time_why': 'Repeated string concatenations inside the queue loop create '
                                          'quadratic overhead.',
                              'when_to_use': 'Useful if a level-by-level representation matches a desired '
                                             'display format.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Codec {\n'
                                      '    public String serialize(TreeNode root) {\n'
                                      '        StringBuilder sb = new StringBuilder();\n'
                                      '        buildString(root, sb);\n'
                                      '        return sb.toString();\n'
                                      '    }\n'
                                      '\n'
                                      '    private void buildString(TreeNode node, StringBuilder sb) {\n'
                                      '        if (node == null) {\n'
                                      '            sb.append("#,");\n'
                                      '            return;\n'
                                      '        }\n'
                                      '        sb.append(node.val).append(",");\n'
                                      '        buildString(node.left, sb);\n'
                                      '        buildString(node.right, sb);\n'
                                      '    }\n'
                                      '\n'
                                      '    public TreeNode deserialize(String data) {\n'
                                      '        Queue<String> nodes = new '
                                      'LinkedList<>(Arrays.asList(data.split(",")));\n'
                                      '        return buildTree(nodes);\n'
                                      '    }\n'
                                      '\n'
                                      '    private TreeNode buildTree(Queue<String> nodes) {\n'
                                      '        String val = nodes.poll();\n'
                                      '        if ("#".equals(val)) return null;\n'
                                      '\n'
                                      '        TreeNode node = new TreeNode(Integer.parseInt(val));\n'
                                      '        node.left = buildTree(nodes);\n'
                                      '        node.right = buildTree(nodes);\n'
                                      '        return node;\n'
                                      '    }\n'
                                      '}\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public TreeNode roundtrip(TreeNode root) {\n'
                                      '        Codec codec = new Codec();\n'
                                      '        return codec.deserialize(codec.serialize(root));\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Serialize with recursive preorder walk using StringBuilder, and '
                                      'rebuild with a queue of tokens.',
                              'is_optimal': True,
                              'name': 'Preorder traversal with null marker delimiter',
                              'space_complexity': 'O(n)',
                              'space_why': 'The StringBuilder and token list store strings for all `n` '
                                           'nodes.',
                              'steps': [   'In a helper function, append node values separated by commas.',
                                           "If a node is null, append a marker like '#' and a comma.",
                                           'For deserialization, split the string into a queue of tokens.',
                                           'Recursively pop tokens: build the root, then left child, then '
                                           'right child.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is serialized and parsed exactly once in linear time.',
                              'when_to_use': 'Best standard way to serialize and deserialize binary trees.'}],
        'edge_cases': [   {   'expected': '[]',
                              'input': 'root = null',
                              'why': 'An empty tree serializes to a single null marker.'},
                          {   'expected': '[1]',
                              'input': 'root = [1]',
                              'why': 'A single node with two null markers.'},
                          {   'expected': '[1,-2,3]',
                              'input': 'root = [1,-2,3]',
                              'why': 'Handles negative integers correctly.'},
                          {   'expected': '[1,2,null,3,null,4]',
                              'input': 'root = [1,2,null,3,null,4]',
                              'why': 'Preserves single-child skewed chains accurately.'}],
        'follow_ups': [   {   'answer': 'Use binary bit-packing: write 1 bit for null/non-null flags and '
                                        'packed varints for numbers.',
                              'question': 'How would you optimize serialization for minimal bandwidth?'},
                          {   'answer': 'Yes, record the number of children before each node or use '
                                        'end-of-children markers.',
                              'question': 'Can we serialize an n-ary tree with the same technique?'},
                          {   'answer': 'Maintain an object ID map during serialization and reference '
                                        'previously seen IDs.',
                              'question': 'What if the tree contains cyclic graph references?'}],
        'interview_script': [   'I need to design an algorithm to serialize a binary tree into a string and '
                                'deserialize it back.',
                                'My obvious first idea is level order queue serialization with string '
                                'additions, taking O(n^2) time and O(n) space.',
                                'A key point is that preorder order with explicit null markers uniquely '
                                'determines the binary tree.',
                                'I would use preorder recursion with a StringBuilder and token queue, taking '
                                'O(n) time and O(n) space.',
                                'I would test this on an empty tree, single-node trees, negative numbers, '
                                'and skewed trees.'],
        'mistakes': [   {   'name': 'The Missing Mark Trap',
                            'right': "Include an explicit marker like '#' for null children so tree "
                                     'structure is uniquely preserved.',
                            'wrong': 'Serializing only non-null values makes it impossible to distinguish '
                                     'different tree shapes.'},
                        {   'name': 'Missing delimiter between values',
                            'right': 'Always separate values with a clear delimiter such as a comma.',
                            'wrong': 'Joining values without commas makes numbers like 12 and 1, 2 '
                                     'indistinguishable.'},
                        {   'name': 'Repeated string concatenation',
                            'right': 'Use a `StringBuilder` for linear-time string construction.',
                            'wrong': 'Using `+=` on Strings creates a new string copy on every node, taking '
                                     'quadratic time.'}],
        'pattern': 'Tree serialization',
        'related_slugs': ['lc-105', 'lc-102'],
        'slugs': ['lc-297', 'serialize-and-deserialize-binary-tree'],
        'summary': 'Encode the tree using preorder order with null markers. Rebuild by consuming tokens in '
                   'the exact same preorder sequence.',
        'trigger': 'Design an algorithm to serialize and deserialize a binary tree.',
        'walkthrough': {   'columns': ['Action', 'Processed Node', 'Serialized Stream', 'Remaining Tokens'],
                           'input': 'root = [1, 2, 3, null, null, 4, 5]',
                           'result': 'Tree serialized and restored identically, returning root 1.',
                           'rows': [   ['Serialize root', '1', '1,', 'Node 1 processed'],
                                       ['Serialize left', '2', '1,2,#,#,', 'Node 2 with null children'],
                                       [   'Serialize right',
                                           '3',
                                           '1,2,#,#,3,4,#,#,5,#,#,',
                                           'Node 3 with children 4 and 5'],
                                       [   'Deserialize',
                                           '1',
                                           'Build root 1',
                                           'Left token builds 2, right builds 3']]}},
    {   'approaches': [   {   'code': 'class Solution {\n'
                                      '    public int diameterOfBinaryTree(TreeNode root) {\n'
                                      '        if (root == null) return 0;\n'
                                      '        int leftH = height(root.left);\n'
                                      '        int rightH = height(root.right);\n'
                                      '        int currentDiameter = leftH + rightH;\n'
                                      '        int subDiameter = Math.max(diameterOfBinaryTree(root.left), '
                                      'diameterOfBinaryTree(root.right));\n'
                                      '        return Math.max(currentDiameter, subDiameter);\n'
                                      '    }\n'
                                      '\n'
                                      '    private int height(TreeNode node) {\n'
                                      '        if (node == null) return 0;\n'
                                      '        return 1 + Math.max(height(node.left), height(node.right));\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'For every node in the tree, calculate its left and right heights from '
                                      'scratch and find the maximum sum.',
                              'is_optimal': False,
                              'name': 'Top-down diameter search',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to tree height `h`.',
                              'steps': [   'If the current node is null, return 0.',
                                           'Calculate the height of the left subtree with a separate helper '
                                           'function.',
                                           'Calculate the height of the right subtree with the helper '
                                           'function.',
                                           'Combine the local diameter `leftHeight + rightHeight` with '
                                           'recursive results from children.'],
                              'time_complexity': 'O(n^2)',
                              'time_why': 'We calculate heights from scratch for each of the `n` nodes, '
                                          'taking quadratic time on skewed trees.',
                              'when_to_use': 'Simple conceptual approach if a height function is already '
                                             'implemented.'},
                          {   'code': 'class Solution {\n'
                                      '    private int maxDiameter = 0;\n'
                                      '\n'
                                      '    public int diameterOfBinaryTree(TreeNode root) {\n'
                                      '        maxDepth(root);\n'
                                      '        return maxDiameter;\n'
                                      '    }\n'
                                      '\n'
                                      '    private int maxDepth(TreeNode node) {\n'
                                      '        if (node == null) return 0;\n'
                                      '        int left = maxDepth(node.left);\n'
                                      '        int right = maxDepth(node.right);\n'
                                      '        maxDiameter = Math.max(maxDiameter, left + right);\n'
                                      '        return 1 + Math.max(left, right);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Compute subtree heights in a single bottom-up pass, updating the '
                                      'maximum diameter at each node.',
                              'is_optimal': True,
                              'name': 'Bottom-up postorder depth computation',
                              'space_complexity': 'O(h)',
                              'space_why': 'The recursion stack requires memory bounded by tree height `h`.',
                              'steps': [   'Maintain a global diameter variable initialized to 0.',
                                           'In a helper function, compute the maximum height of left and '
                                           'right subtrees.',
                                           'Update the global diameter with `leftHeight + rightHeight`.',
                                           'Return `1 + Math.max(leftHeight, rightHeight)` to the parent '
                                           'caller.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is visited once during the post-order depth search.',
                              'when_to_use': 'Best standard way to compute tree diameter in linear time.'}],
        'edge_cases': [   {   'expected': '0',
                              'input': 'root = [1]',
                              'why': 'A single node has no edges, so diameter is 0.'},
                          {   'expected': '1',
                              'input': 'root = [1,2]',
                              'why': 'Two nodes connected by a single edge have diameter 1.'},
                          {   'expected': '3',
                              'input': 'root = [1,2,3,4,5]',
                              'why': 'Longest path runs through node 2 to node 3 with 3 edges.'},
                          {   'expected': '3',
                              'input': 'root = [1,2,null,3,null,4]',
                              'why': 'A skewed tree forms a line of 3 edges.'}],
        'follow_ups': [   {   'answer': 'Track the node that produced the max diameter and reconstruct the '
                                        'two longest branch paths.',
                              'question': 'How would you return the actual nodes along the diameter path?'},
                          {   'answer': 'Multiply child heights by edge weights before adding them together.',
                              'question': 'What if edges have arbitrary positive weights?'},
                          {   'answer': 'Yes, use a postorder walk with a stack and map to store computed '
                                        'heights for each node.',
                              'question': 'Can this be done without recursion?'}],
        'interview_script': [   'I need to find the length of the longest path between any two nodes in a '
                                'binary tree.',
                                'My obvious first idea is top-down diameter search recalculating heights, '
                                'taking O(n^2) time.',
                                'A key point is that the longest path through any node is the sum of its '
                                'left and right subtree heights.',
                                'I would use a bottom-up post-order helper updating a global max, taking '
                                'O(n) time and O(h) space.',
                                'I would test this on a single node, a linear chain, and a tree where '
                                'diameter avoids the root.'],
        'mistakes': [   {   'name': 'The Through The Top Trap',
                            'right': 'Update the global maximum at every single node, not just at the root.',
                            'wrong': 'Calculating only `height(root.left) + height(root.right)` misses cases '
                                     'where the diameter is entirely inside a child subtree.'},
                        {   'name': 'Counting nodes instead of edges',
                            'right': 'Remember diameter is measured in edges, so height sum directly equals '
                                     'edge count.',
                            'wrong': 'Returning node count along the path yields one more than the edge '
                                     'count required.'},
                        {   'name': 'Quadratic height recalculation',
                            'right': 'Compute height and update diameter simultaneously in a single '
                                     'bottom-up pass.',
                            'wrong': 'Calling height separately from diameter causes repeated scans and '
                                     'quadratic time.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-104', 'lc-124'],
        'slugs': ['lc-543', 'diameter-of-binary-tree'],
        'summary': 'The longest path through any node is its left height plus its right height. Update the '
                   'max diameter during a bottom-up pass.',
        'trigger': 'Given the root of a binary tree, return the length of the diameter of the tree.',
        'walkthrough': {   'columns': [   'Node',
                                          'Left Height',
                                          'Right Height',
                                          'Diameter Through Node',
                                          'Returned Height'],
                           'input': 'root = [1, 2, 3, 4, 5]',
                           'result': 'Longest path is through root with length 3, returning 3.',
                           'rows': [   ['4 (Leaf)', '0', '0', '0', '1'],
                                       ['5 (Leaf)', '0', '0', '0', '1'],
                                       ['2', '1', '1', '1 + 1 = 2', '1 + max(1, 1) = 2'],
                                       ['3 (Leaf)', '0', '0', '0', '1'],
                                       ['1 (Root)', '2', '1', '2 + 1 = 3', '1 + max(2, 1) = 3']]}},
    {   'approaches': [   {   'code': 'class Solution {\n'
                                      '    public boolean isSubtree(TreeNode root, TreeNode subRoot) {\n'
                                      '        StringBuilder sb1 = new StringBuilder();\n'
                                      '        StringBuilder sb2 = new StringBuilder();\n'
                                      '        serialize(root, sb1);\n'
                                      '        serialize(subRoot, sb2);\n'
                                      '        return sb1.toString().contains(sb2.toString());\n'
                                      '    }\n'
                                      '\n'
                                      '    private void serialize(TreeNode node, StringBuilder sb) {\n'
                                      '        if (node == null) {\n'
                                      '            sb.append(",#");\n'
                                      '            return;\n'
                                      '        }\n'
                                      '        sb.append(",").append(node.val);\n'
                                      '        serialize(node.left, sb);\n'
                                      '        serialize(node.right, sb);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Serialize both trees with delimiters and null markers, checking if '
                                      "subRoot's string is a substring of root's string.",
                              'is_optimal': False,
                              'name': 'Preorder string serialization check',
                              'space_complexity': 'O(m + n)',
                              'space_why': 'The serialized string representations store `m + n` characters.',
                              'steps': [   'Serialize the main tree into a string using preorder sequence '
                                           'with delimiters.',
                                           'Serialize the subRoot tree into a string with the exact same '
                                           'format.',
                                           'Check whether the subRoot serialization is contained within the '
                                           'main tree string.',
                                           'Return true if a substring match is found, false otherwise.'],
                              'time_complexity': 'O(m * n)',
                              'time_why': 'Substring search on serialized strings of length `m` and `n` '
                                          'takes `O(m * n)` in the worst case.',
                              'when_to_use': 'Useful if tree structures can be pre-hashed or '
                                             'string-indexed.'},
                          {   'code': 'class Solution {\n'
                                      '    public boolean isSubtree(TreeNode root, TreeNode subRoot) {\n'
                                      '        if (root == null) return false;\n'
                                      '        if (isSame(root, subRoot)) return true;\n'
                                      '        return isSubtree(root.left, subRoot) || isSubtree(root.right, '
                                      'subRoot);\n'
                                      '    }\n'
                                      '\n'
                                      '    private boolean isSame(TreeNode p, TreeNode q) {\n'
                                      '        if (p == null && q == null) return true;\n'
                                      '        if (p == null || q == null) return false;\n'
                                      '        if (p.val != q.val) return false;\n'
                                      '        return isSame(p.left, q.left) && isSame(p.right, q.right);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Visit candidate nodes in the main tree, running a same-tree check '
                                      'whenever a node value matches subRoot.',
                              'is_optimal': True,
                              'name': 'Recursive preorder matching with sameTree helper',
                              'space_complexity': 'O(h)',
                              'space_why': 'The recursion stack requires memory bounded by tree height `h`.',
                              'steps': [   'If the main root is null, return false because an empty tree '
                                           'cannot contain subRoot.',
                                           'If the current root matches subRoot via a sameTree helper, '
                                           'return true.',
                                           'Recursively check if subRoot appears in the left subtree.',
                                           'Return true if subRoot is found in either the left or right '
                                           'subtree.'],
                              'time_complexity': 'O(m * n)',
                              'time_why': 'In the worst case of identical values, we compare up to `n` nodes '
                                          'of subRoot at all `m` positions.',
                              'when_to_use': 'Best standard way to check for subtree equivalence with '
                                             'minimal memory.'}],
        'edge_cases': [   {   'expected': 'true',
                              'input': 'root = [1,1], subRoot = [1]',
                              'why': 'A leaf node matches the single-node subRoot.'},
                          {   'expected': 'false',
                              'input': 'root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]',
                              'why': 'Candidate has an extra child 0, so structure does not match subRoot.'},
                          {   'expected': 'true',
                              'input': 'root = [1], subRoot = [1]',
                              'why': 'Identical single-node trees match.'},
                          {   'expected': 'true',
                              'input': 'root = [1,2,3], subRoot = [2]',
                              'why': 'Left child forms a matching subtree.'}],
        'follow_ups': [   {   'answer': 'Yes, compute Merkle tree hashes for each subtree bottom-up and '
                                        'compare root hash values.',
                              'question': 'Can this be solved in O(m + n) linear time?'},
                          {   'answer': 'Compare tree node counts up front; if subRoot has more nodes, '
                                        'return false immediately.',
                              'question': 'What if subRoot is larger than the main tree?'},
                          {   'answer': 'Yes, serialize with delimiters and apply KMP pattern matching in '
                                        'O(m + n) time.',
                              'question': 'Can we use KMP string matching on serializations?'}],
        'interview_script': [   'I need to check if tree subRoot is a subtree of tree root.',
                                'My obvious first idea is string serialization comparison, taking O(m * n) '
                                'time and O(m + n) space.',
                                'A key point is that at any candidate node, we can run an identical tree '
                                'check with a sameTree helper.',
                                'I would use preorder recursion with a sameTree helper, taking O(m * n) '
                                'worst-case time and O(h) space.',
                                'I would test this on identical trees, trees with extra leaves on the '
                                'candidate, and duplicate values.'],
        'mistakes': [   {   'name': 'The Delimiter Trap',
                            'right': 'Wrap every node value with distinct delimiters like commas and null '
                                     'markers.',
                            'wrong': 'Checking substring containment without delimiters makes node 2 match '
                                     'inside node 12 or 23.'},
                        {   'name': 'Stopping search on first value mismatch',
                            'right': 'Continue checking recursively on `root.left` and `root.right` when the '
                                     'current node does not match.',
                            'wrong': "Returning false when the root doesn't match subRoot terminates before "
                                     'inspecting child subtrees.'},
                        {   'name': 'Allowing partial subtree matches',
                            'right': 'Ensure that leaves in subRoot correspond to exact leaves or nulls in '
                                     'the candidate subtree.',
                            'wrong': 'Matching values while subRoot ends early treats a prefix as a '
                                     'subtree.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-100', 'lc-101'],
        'slugs': ['lc-572', 'subtree-of-another-tree'],
        'summary': 'At each candidate node in the main tree, check if the subtree matches subRoot completely '
                   'using a same-tree helper.',
        'trigger': 'Given the roots of two binary trees root and subRoot, return true if there is a subtree '
                   'of root with the same structure.',
        'walkthrough': {   'columns': [   'Inspected Node',
                                          'Matches SubRoot Root',
                                          'sameTree Result',
                                          'Decision'],
                           'input': 'root = [3, 4, 5, 1, 2], subRoot = [4, 1, 2]',
                           'result': 'Subtree match confirmed at node 4, returning true.',
                           'rows': [   [   '3',
                                           'No (3 != 4)',
                                           'Skipped',
                                           'Value does not match subRoot, so check children of node 3.'],
                                       [   '4 (Left Child)',
                                           'Yes (4 == 4)',
                                           'Check children 1 and 2',
                                           'Roots match, so compare left child 1 and right child 2.'],
                                       [   '4 (Subtree)',
                                           'Yes',
                                           'Both child subtrees match',
                                           'The entire subtree rooted at node 4 matches subRoot '
                                           'perfectly.']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<Integer> distanceK(TreeNode root, int target, int k) '
                                      '{\n'
                                      '        Map<Integer, List<Integer>> adj = new HashMap<>();\n'
                                      '        buildGraph(root, null, adj);\n'
                                      '\n'
                                      '        List<Integer> result = new ArrayList<>();\n'
                                      '        if (!adj.containsKey(target)) return result;\n'
                                      '\n'
                                      '        Queue<Integer> queue = new ArrayDeque<>();\n'
                                      '        Set<Integer> visited = new HashSet<>();\n'
                                      '\n'
                                      '        queue.add(target);\n'
                                      '        visited.add(target);\n'
                                      '        int dist = 0;\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            if (dist == k) {\n'
                                      '                result.addAll(queue);\n'
                                      '                return result;\n'
                                      '            }\n'
                                      '\n'
                                      '            int size = queue.size();\n'
                                      '            for (int i = 0; i < size; i++) {\n'
                                      '                int curr = queue.poll();\n'
                                      '                for (int neighbor : adj.getOrDefault(curr, new '
                                      'ArrayList<>())) {\n'
                                      '                    if (visited.add(neighbor)) {\n'
                                      '                        queue.add(neighbor);\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '            dist++;\n'
                                      '        }\n'
                                      '\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void buildGraph(TreeNode node, TreeNode parent, '
                                      'Map<Integer, List<Integer>> adj) {\n'
                                      '        if (node == null) return;\n'
                                      '        adj.putIfAbsent(node.val, new ArrayList<>());\n'
                                      '        if (parent != null) {\n'
                                      '            adj.get(node.val).add(parent.val);\n'
                                      '            adj.get(parent.val).add(node.val);\n'
                                      '        }\n'
                                      '        buildGraph(node.left, node, adj);\n'
                                      '        buildGraph(node.right, node, adj);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Convert the entire tree into an undirected graph adjacency list, then '
                                      'run breadth-first search from the target node.',
                              'is_optimal': False,
                              'name': 'Graph adjacency list conversion',
                              'space_complexity': 'O(n)',
                              'space_why': 'The adjacency list and visited set store entries for all `n` '
                                           'nodes.',
                              'steps': [   'Build an adjacency list mapping each node value to its children '
                                           'and parent.',
                                           'Push the target node value into a queue and set up a visited '
                                           'set.',
                                           'Spread the search outward level by level up to `k` steps.',
                                           'Collect and return all node values at distance `k`.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'We visit each node once to construct the adjacency list and once '
                                          'during the breadth-first search.',
                              'when_to_use': 'Useful when multiple shortest path queries will be performed '
                                             'on the tree.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<Integer> distanceK(TreeNode root, int target, int k) '
                                      '{\n'
                                      '        Map<TreeNode, TreeNode> parents = new HashMap<>();\n'
                                      '        TreeNode start = link(root, null, target, parents);\n'
                                      '        List<Integer> out = new ArrayList<>();\n'
                                      '        if (start == null) return out;\n'
                                      '        Set<TreeNode> seen = new HashSet<>();\n'
                                      '        Queue<TreeNode> queue = new ArrayDeque<>();\n'
                                      '        queue.add(start);\n'
                                      '        seen.add(start);\n'
                                      '        int distance = 0;\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int size = queue.size();\n'
                                      '            if (distance == k) {\n'
                                      '                for (TreeNode node : queue) out.add(node.val);\n'
                                      '                return out;\n'
                                      '            }\n'
                                      '            for (int i = 0; i < size; i++) {\n'
                                      '                TreeNode node = queue.poll();\n'
                                      '                for (TreeNode next : new TreeNode[] { node.left, '
                                      'node.right, parents.get(node) }) {\n'
                                      '                    if (next != null && seen.add(next)) '
                                      'queue.add(next);\n'
                                      '                }\n'
                                      '            }\n'
                                      '            distance++;\n'
                                      '        }\n'
                                      '        return out;\n'
                                      '    }\n'
                                      '\n'
                                      '    private TreeNode link(TreeNode node, TreeNode parent, int '
                                      'target,\n'
                                      '                          Map<TreeNode, TreeNode> parents) {\n'
                                      '        if (node == null) return null;\n'
                                      '        parents.put(node, parent);\n'
                                      '        if (node.val == target) return node;\n'
                                      '        TreeNode left = link(node.left, node, target, parents);\n'
                                      '        TreeNode right = link(node.right, node, target, parents);\n'
                                      '        return left != null ? left : right;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Build a parent map using a depth search, then run a breadth-first '
                                      'search starting directly from the target node.',
                              'is_optimal': True,
                              'name': 'Parent pointer map with BFS wave',
                              'space_complexity': 'O(h)',
                              'space_why': 'The parent map and queue hold nodes bounded by tree height `h` '
                                           'along the path.',
                              'steps': [   'Map each node to its parent pointer using a depth search from '
                                           'the root.',
                                           'Initialize a queue with the target node and mark it visited.',
                                           'Expand the search outward level by level, checking each left '
                                           'child, right child, and parent.',
                                           'When distance reaches `k`, collect all nodes in the queue and '
                                           'return their values.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node is visited once to find parents and at most once during '
                                          'queue expansion.',
                              'when_to_use': 'Best standard way to find nodes at distance k in a tree.'}],
        'edge_cases': [   {   'expected': '[]',
                              'input': 'root = [1], target = 1, k = 3',
                              'why': 'No nodes exist at distance 3 in a single-node tree.'},
                          {   'expected': '[1]',
                              'input': 'root = [1], target = 1, k = 0',
                              'why': 'Distance zero returns the target node itself.'},
                          {   'expected': '[1]',
                              'input': 'root = [3,5,1], target = 5, k = 2',
                              'why': 'Path goes up to root 3 and down to sibling 1.'},
                          {   'expected': '[3]',
                              'input': 'root = [0,1,null,null,2,null,3], target = 1, k = 2',
                              'why': 'Distance 2 on a skewed tree walks down two steps.'}],
        'follow_ups': [   {   'answer': 'Yes, compute target distance in a post-order return and search '
                                        'downward from ancestors.',
                              'question': 'Can this be solved without a parent hash map?'},
                          {   'answer': 'Build the full graph once and run breadth-first search for each '
                                        'query.',
                              'question': 'What if multiple queries are asked for different target nodes?'},
                          {   'answer': "Use Dijkstra's algorithm if weights are non-negative or "
                                        'Bellman-Ford if weights can be negative.',
                              'question': 'How would you handle negative edge lengths?'}],
        'interview_script': [   'I need to return all node values at distance k from a given target node.',
                                'My obvious first idea is converting the tree into an undirected graph '
                                'adjacency list, taking O(n) time and O(n) space.',
                                'A key point is that mapping parent pointers lets us treat the tree as an '
                                'undirected graph and spread outward.',
                                'I would use a parent pointer map with a breadth-first search wave, taking '
                                'O(n) time and O(h) space.',
                                'I would test this on k = 0, k exceeding tree depth, and nodes reachable '
                                'through ancestors.'],
        'mistakes': [   {   'name': 'The One-Way Trap',
                            'right': 'Map parent references so the search can move upward as well as '
                                     'downward.',
                            'wrong': "Only searching downward into target's children misses nodes at "
                                     'distance k that lie through ancestors.'},
                        {   'name': 'Cycles caused by parent child oscillation',
                            'right': 'Maintain a visited set and never re-enqueue an already visited node.',
                            'wrong': 'Stepping back and forth between a node and its parent creates infinite '
                                     'loops.'},
                        {   'name': 'Handling k equals zero',
                            'right': 'Check if distance equals k before expanding the current level.',
                            'wrong': 'Skipping distance 0 check fails to return `[target.val]` when k = 0.'}],
        'pattern': 'Tree BFS',
        'related_slugs': ['lc-102', 'lc-236'],
        'slugs': ['lc-863', 'all-nodes-distance-k-in-binary-tree'],
        'summary': 'Map each node to its parent so we can move upward. Then spread outward from the target '
                   'node k steps using breadth-first search.',
        'trigger': 'Given the root of a binary tree, the value of a target node target, and an integer k, '
                   'return an array of values of all nodes at distance k.',
        'walkthrough': {   'columns': ['Distance', 'Queue State', 'Visited', 'Action'],
                           'input': 'root = [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], target = 5, k = 2',
                           'result': 'Nodes at distance 2 are [7, 4, 1], returning [7, 4, 1].',
                           'rows': [   ['0', '[5]', '{5}', 'Explore left (6), right (2), parent (3)'],
                                       ['1', '[6, 2, 3]', '{5, 6, 2, 3}', 'Explore neighbors of 6, 2, 3'],
                                       [   '2',
                                           '[7, 4, 1]',
                                           '{5, 6, 2, 3, 7, 4, 1}',
                                           'Distance reaches k = 2; stop and collect values']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<Integer> inorderTraversal(TreeNode root) {\n'
                                      '        List<Integer> result = new ArrayList<>();\n'
                                      '        helper(root, result);\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void helper(TreeNode node, List<Integer> result) {\n'
                                      '        if (node == null) return;\n'
                                      '        helper(node.left, result);\n'
                                      '        result.add(node.val);\n'
                                      '        helper(node.right, result);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Use a recursive helper to visit the left subtree, record the current '
                                      'value, and visit the right subtree.',
                              'is_optimal': False,
                              'name': 'Recursive inorder traversal',
                              'space_complexity': 'O(n)',
                              'space_why': 'The result list stores `n` elements and the call stack holds '
                                           '`O(h)` frames.',
                              'steps': [   'Create an empty result list.',
                                           'If the current node is null, return immediately.',
                                           'Recursively visit the left child.',
                                           'Add the current node value to the result list, then recursively '
                                           'visit the right child.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node is visited once during the depth-first search.',
                              'when_to_use': 'Standard recursion when memory limits allow call stack '
                                             'growth.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<Integer> inorderTraversal(TreeNode root) {\n'
                                      '        List<Integer> result = new ArrayList<>();\n'
                                      '        Deque<TreeNode> stack = new ArrayDeque<>();\n'
                                      '        TreeNode curr = root;\n'
                                      '\n'
                                      '        while (curr != null || !stack.isEmpty()) {\n'
                                      '            while (curr != null) {\n'
                                      '                stack.push(curr);\n'
                                      '                curr = curr.left;\n'
                                      '            }\n'
                                      '            curr = stack.pop();\n'
                                      '            result.add(curr.val);\n'
                                      '            curr = curr.right;\n'
                                      '        }\n'
                                      '\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Push left nodes onto an explicit stack until reaching null, then pop, '
                                      'record value, and move right.',
                              'is_optimal': True,
                              'name': 'Iterative inorder traversal with stack',
                              'space_complexity': 'O(h)',
                              'space_why': 'The stack holds at most tree height `h` nodes at any point.',
                              'steps': [   'Initialize an explicit stack and a pointer at the root.',
                                           'While the pointer is non-null, push it onto the stack and move '
                                           'to its left child.',
                                           'When the pointer becomes null, pop a node from the stack and '
                                           'record its value.',
                                           "Move the pointer to the popped node's right child and repeat."],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node is pushed and popped from the stack exactly once.',
                              'when_to_use': 'Best standard way to perform inorder visits without '
                                             'recursion.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<Integer> inorderTraversal(TreeNode root) {\n'
                                      '        List<Integer> result = new ArrayList<>();\n'
                                      '        TreeNode curr = root;\n'
                                      '\n'
                                      '        while (curr != null) {\n'
                                      '            if (curr.left == null) {\n'
                                      '                result.add(curr.val);\n'
                                      '                curr = curr.right;\n'
                                      '            } else {\n'
                                      '                // The node visited just before curr: rightmost node '
                                      'of the left side.\n'
                                      '                TreeNode prev = curr.left;\n'
                                      '                while (prev.right != null && prev.right != curr) {\n'
                                      '                    prev = prev.right;\n'
                                      '                }\n'
                                      '\n'
                                      '                if (prev.right == null) {\n'
                                      '                    prev.right = curr;   // borrow the empty link\n'
                                      '                    curr = curr.left;\n'
                                      '                } else {\n'
                                      '                    prev.right = null;   // put it back, the left '
                                      'side is done\n'
                                      '                    result.add(curr.val);\n'
                                      '                    curr = curr.right;\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Borrow the empty right links inside the tree itself to remember where '
                                      'to come back to, so the walk needs no stack and no recursion.',
                              'is_alternative': True,
                              'is_optimal': False,
                              'name': 'Morris traversal with threaded links',
                              'space_complexity': 'O(1)',
                              'space_why': 'No stack and no recursion. The only memory is the links borrowed '
                                           'inside the tree, and each is given back.',
                              'steps': [   'Start at the root. If a node has no left child, record its value '
                                           'and step right.',
                                           'Otherwise follow the right edge down from its left child to '
                                           'reach the node that comes just before it in sorted order.',
                                           "If that node's right link is empty, point it back at the current "
                                           'node and step left.',
                                           'Later the walk arrives back at the current node through that '
                                           'borrowed link. Remove the link, record the value, and step '
                                           'right.',
                                           'Every borrowed link is put back, so the tree ends exactly as it '
                                           'started.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Each node is reached at most twice, and the walks down the right '
                                          'edges add up to one pass over the links.',
                              'when_to_use': 'When the interviewer asks for constant extra space, or the '
                                             'tree is deep enough that the stack itself is the problem. Say '
                                             'out loud that it changes the tree while it runs and puts every '
                                             'link back before returning.'}],
        'edge_cases': [   {   'expected': '[]',
                              'input': 'root = null',
                              'why': 'An empty tree returns an empty list.'},
                          {   'expected': '[1]',
                              'input': 'root = [1]',
                              'why': 'A single node produces a single-element list.'},
                          {   'expected': '[2,1,3]',
                              'input': 'root = [1,2,3]',
                              'why': 'Left child 2 precedes root 1 and right child 3.'},
                          {   'expected': '[1,3,2]',
                              'input': 'root = [1,null,2,3]',
                              'why': 'Right-leaning branch with a left child.'}],
        'follow_ups': [   {   'answer': 'Yes, use `Morris traversal` with temporary threaded pointers to '
                                        'avoid any stack or recursion.',
                              'question': 'Can we do an inorder walk in O(1) auxiliary space?'},
                          {   'answer': 'Preorder records values before going left; postorder uses two '
                                        'stacks or tracks the previously visited node.',
                              'question': 'How do preorder and postorder loop-based algorithms differ?'},
                          {   'answer': 'An inorder visit of a valid binary search tree always yields values '
                                        'in strictly increasing sorted order.',
                              'question': 'What is the relationship between an inorder walk and binary '
                                          'search trees?'}],
        'interview_script': [   "I need to return the inorder list of a binary tree's values.",
                                'My obvious first idea is recursive depth-first search, taking O(n) time and '
                                'O(n) total space.',
                                'A key point is that an explicit stack simulates recursion while keeping '
                                'extra space bounded by tree height.',
                                'I would use a manual stack in a loop pushing left nodes, taking O(n) time '
                                'and O(h) stack space.',
                                'I would test this on an empty tree, single-node trees, and left-skewed '
                                'trees.'],
        'mistakes': [   {   'name': 'The Early Pop Trap',
                            'right': 'Push left children repeatedly until a null pointer is reached before '
                                     'popping.',
                            'wrong': 'Popping nodes immediately without pushing all left descendants breaks '
                                     'inorder sequence.'},
                        {   'name': 'Re-pushing processed nodes',
                            'right': 'Set `curr = curr.right` after popping to advance to the unvisited '
                                     'right branch.',
                            'wrong': 'Setting `curr = curr.left` after popping re-visits already processed '
                                     'left subtrees in an infinite loop.'},
                        {   'name': 'Missing stack empty check in loop condition',
                            'right': 'Continue the outer loop as long as `curr != null || !stack.isEmpty()`.',
                            'wrong': 'Terminating when `curr == null` while the stack still contains parent '
                                     'nodes leaves visits incomplete.'}],
        'pattern': 'Tree DFS',
        'related_slugs': ['lc-230', 'lc-98'],
        'slugs': ['lc-94', 'binary-tree-inorder-traversal'],
        'summary': 'Visit left child, then record the current node, then visit right child. With a stack, '
                   'push left nodes until hitting null.',
        'trigger': 'Given the root of a binary tree, return the inorder sequence of its node values.',
        'walkthrough': {   'columns': ['Current Pointer', 'Stack', 'Popped Value', 'Result List'],
                           'input': 'root = [1, null, 2, 3]',
                           'result': 'Inorder visit complete, returning [1, 3, 2].',
                           'rows': [   ['1', '[1]', '-', '[]'],
                                       ['null', '[]', '1', '[1]'],
                                       ['2', '[2]', '-', '[1]'],
                                       ['3', '[2, 3]', '-', '[1]'],
                                       ['null', '[2]', '3', '[1, 3]'],
                                       ['null', '[]', '2', '[1, 3, 2]']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public boolean isValidBST(TreeNode root) {\n'
                                      '        List<Integer> list = new ArrayList<>();\n'
                                      '        inorder(root, list);\n'
                                      '        for (int i = 1; i < list.size(); i++) {\n'
                                      '            if (list.get(i) <= list.get(i - 1)) {\n'
                                      '                return false;\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return true;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void inorder(TreeNode node, List<Integer> list) {\n'
                                      '        if (node == null) return;\n'
                                      '        inorder(node.left, list);\n'
                                      '        list.add(node.val);\n'
                                      '        inorder(node.right, list);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Collect all node values in an inorder list, then verify that every '
                                      'value is strictly greater than the preceding value.',
                              'is_optimal': False,
                              'name': 'Inorder traversal sorted array check',
                              'space_complexity': 'O(n)',
                              'space_why': 'The list holds `n` integers in memory.',
                              'steps': [   'Visit the tree in left-root-right order and store values in a '
                                           'list.',
                                           'Walk through the list from start to finish.',
                                           'Verify that each element is strictly greater than its '
                                           'predecessor.',
                                           'Return false if any inversion or duplicate is found, true '
                                           'otherwise.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'We visit all `n` nodes and store them in an array list.',
                              'when_to_use': 'Simple conceptual way to check validity by using sorted '
                                             'order.'},
                          {   'code': 'class Solution {\n'
                                      '    public boolean isValidBST(TreeNode root) {\n'
                                      '        return validate(root, null, null);\n'
                                      '    }\n'
                                      '\n'
                                      '    private boolean validate(TreeNode node, Integer min, Integer max) '
                                      '{\n'
                                      '        if (node == null) return true;\n'
                                      '        if (min != null && node.val <= min) return false;\n'
                                      '        if (max != null && node.val >= max) return false;\n'
                                      '        return validate(node.left, min, node.val) && '
                                      'validate(node.right, node.val, max);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Pass valid min and max limits down recursive calls, tightening bounds '
                                      'when branching left or right.',
                              'is_optimal': True,
                              'name': 'Recursive range bounds validation',
                              'space_complexity': 'O(h)',
                              'space_why': 'The call stack memory is proportional to tree height `h`.',
                              'steps': [   'Call a helper function with null lower and upper bounds.',
                                           'If the current node is null, return true.',
                                           'If the node value violates the lower bound or upper bound, '
                                           'return false.',
                                           'Recurse left tightening the upper bound to `node.val`, and right '
                                           'tightening the lower bound to `node.val`.'],
                              'time_complexity': 'O(n)',
                              'time_why': 'Every node in the tree is checked at most once.',
                              'when_to_use': 'Best standard way to validate a binary search tree with early '
                                             'termination.'}],
        'edge_cases': [   {   'expected': 'true',
                              'input': 'root = [2,1,3]',
                              'why': 'Standard valid BST with 3 nodes.'},
                          {   'expected': 'false',
                              'input': 'root = [5,1,4,null,null,3,6]',
                              'why': "Node 4 is in root's right subtree but is smaller than 5."},
                          {   'expected': 'false',
                              'input': 'root = [2,2,2]',
                              'why': 'Duplicate values are not allowed in a strict BST.'},
                          {   'expected': 'true',
                              'input': 'root = [2147483647]',
                              'why': 'A single node holding Integer.MAX_VALUE is valid.'}],
        'follow_ups': [   {   'answer': 'Yes, use an inorder walk with a manual stack, tracking only the '
                                        'previous popped value.',
                              'question': 'Can this be done without recursion?'},
                          {   'answer': 'Change the lower bound condition from strictly greater to greater '
                                        'than or equal to.',
                              'question': 'What if duplicate values are allowed in the left subtree?'},
                          {   'answer': 'Yes, use `Morris traversal` and verify that the current node is '
                                        'strictly greater than the previous node.',
                              'question': 'Can this be done in O(1) extra space?'}],
        'interview_script': [   'I need to determine whether a binary tree satisfies all properties of a '
                                'valid binary search tree.',
                                'My obvious first idea is collecting values with an inorder visit and '
                                'checking if sorted, taking O(n) time and O(n) space.',
                                'A key point is that every node must lie strictly between a lower bound and '
                                'upper bound inherited from ancestors.',
                                'I would validate range bounds recursively, taking O(n) time and O(h) '
                                'recursion space.',
                                'I would test this on single nodes holding Integer.MAX_VALUE, duplicate '
                                'values, and deep ancestor bound violations.'],
        'mistakes': [   {   'name': 'The Parent Only Trap',
                            'right': 'Pass global min and max bounds down through the recursion to constrain '
                                     'all descendants.',
                            'wrong': 'Comparing a node only with its direct left and right children allows '
                                     'deeper nodes to violate ancestor bounds.'},
                        {   'name': 'Integer MIN and MAX overflow',
                            'right': 'Use `Integer` wrapper objects initialized to null or 64-bit `Long` '
                                     'bounds.',
                            'wrong': 'Using `Integer.MIN_VALUE` and `Integer.MAX_VALUE` as boundary bounds '
                                     'fails when tree nodes hold those exact values.'},
                        {   'name': 'Allowing duplicate values',
                            'right': 'Ensure strict inequality `<` and `>` so duplicate values are properly '
                                     'rejected.',
                            'wrong': 'Allowing `node.val <= min` or `<=` comparisons permits duplicate '
                                     'values that violate BST rules.'}],
        'pattern': 'Binary search tree',
        'related_slugs': ['lc-230', 'lc-235'],
        'slugs': ['lc-98', 'validate-binary-search-tree'],
        'summary': 'Every node must fall within a strict lower and upper bound. As you step left or right, '
                   'narrow the allowed range.',
        'trigger': 'Given the root of a binary tree, determine if it is a valid binary search tree (BST).',
        'walkthrough': {   'columns': ['Node', 'Allowed Range', 'Node Value', 'Status'],
                           'input': 'root = [5, 1, 4, null, null, 3, 6]',
                           'result': 'Node 4 violates lower bound 5, returning false.',
                           'rows': [   ['5', '(-inf, +inf)', '5', 'Valid'],
                                       ['1', '(-inf, 5)', '1', 'Valid'],
                                       ['4', '(5, +inf)', '4', 'Invalid: 4 is not greater than 5']]}}]
