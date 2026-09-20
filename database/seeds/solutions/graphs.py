"""Solutions for Graph problems."""

SOLUTIONS = [   {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int ladderLength(String beginWord, String endWord, List<String> '
                                      'wordList) {\n'
                                      '        if (!wordList.contains(endWord)) {\n'
                                      '            return 0;\n'
                                      '        }\n'
                                      '        Queue<String> queue = new ArrayDeque<>();\n'
                                      '        Set<String> visited = new HashSet<>();\n'
                                      '        queue.add(beginWord);\n'
                                      '        visited.add(beginWord);\n'
                                      '        int steps = 1;\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int size = queue.size();\n'
                                      '            for (int i = 0; i < size; i++) {\n'
                                      '                String cur = queue.poll();\n'
                                      '                if (cur.equals(endWord)) {\n'
                                      '                    return steps;\n'
                                      '                }\n'
                                      '                for (String word : wordList) {\n'
                                      '                    if (!visited.contains(word) && differsByOne(cur, word)) {\n'
                                      '                        visited.add(word);\n'
                                      '                        queue.add(word);\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '            steps++;\n'
                                      '        }\n'
                                      '        return 0;\n'
                                      '    }\n'
                                      '\n'
                                      '    private boolean differsByOne(String a, String b) {\n'
                                      '        int diff = 0;\n'
                                      '        for (int i = 0; i < a.length(); i++) {\n'
                                      '            if (a.charAt(i) != b.charAt(i)) {\n'
                                      '                diff++;\n'
                                      '                if (diff > 1) {\n'
                                      '                    return false;\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return diff == 1;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Look through all words in the dictionary to find words that differ by one '
                                      'letter, then step forward level by level.',
                              'is_optimal': False,
                              'name': 'Compare against dictionary',
                              'space_complexity': 'O(n * L)',
                              'space_why': 'The queue and the visited set hold up to `n` words of length `L`.',
                              'steps': [   'Put the starting word into a queue and set up a visited collection.',
                                           'Take words from the queue level by level, tracking the step counter.',
                                           'For each word, compare it against all dictionary words to find matches '
                                           'that differ in one letter.',
                                           'When the target word comes off the queue, return the current step count.'],
                              'time_complexity': 'O(n^2 * L)',
                              'time_why': 'We compare each of the `n` words against all `n` dictionary entries, taking '
                                          '`L` time per pair.',
                              'when_to_use': 'Only useful if the dictionary is tiny and the alphabet size is huge.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int ladderLength(String beginWord, String endWord, List<String> '
                                      'wordList) {\n'
                                      '        Set<String> dict = new HashSet<>(wordList);\n'
                                      '        if (!dict.contains(endWord)) {\n'
                                      '            return 0;\n'
                                      '        }\n'
                                      '\n'
                                      '        Set<String> beginSet = new HashSet<>();\n'
                                      '        Set<String> endSet = new HashSet<>();\n'
                                      '        Set<String> visited = new HashSet<>();\n'
                                      '\n'
                                      '        beginSet.add(beginWord);\n'
                                      '        endSet.add(endWord);\n'
                                      '        visited.add(beginWord);\n'
                                      '        visited.add(endWord);\n'
                                      '\n'
                                      '        int level = 1;\n'
                                      '\n'
                                      '        while (!beginSet.isEmpty() && !endSet.isEmpty()) {\n'
                                      '            if (beginSet.size() > endSet.size()) {\n'
                                      '                Set<String> swap = beginSet;\n'
                                      '                beginSet = endSet;\n'
                                      '                endSet = swap;\n'
                                      '            }\n'
                                      '\n'
                                      '            Set<String> nextLevel = new HashSet<>();\n'
                                      '            for (String word : beginSet) {\n'
                                      '                char[] chars = word.toCharArray();\n'
                                      '                for (int i = 0; i < chars.length; i++) {\n'
                                      '                    char original = chars[i];\n'
                                      "                    for (char c = 'a'; c <= 'z'; c++) {\n"
                                      '                        chars[i] = c;\n'
                                      '                        String next = new String(chars);\n'
                                      '\n'
                                      '                        if (endSet.contains(next)) {\n'
                                      '                            return level + 1;\n'
                                      '                        }\n'
                                      '\n'
                                      '                        if (dict.contains(next) && visited.add(next)) {\n'
                                      '                            nextLevel.add(next);\n'
                                      '                        }\n'
                                      '                    }\n'
                                      '                    chars[i] = original;\n'
                                      '                }\n'
                                      '            }\n'
                                      '\n'
                                      '            beginSet = nextLevel;\n'
                                      '            level++;\n'
                                      '        }\n'
                                      '\n'
                                      '        return 0;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Expand frontiers from both the start word and target word simultaneously, '
                                      'swapping to always expand the smaller frontier.',
                              'is_optimal': True,
                              'name': 'Bidirectional breadth-first search',
                              'space_complexity': 'O(n * L)',
                              'space_why': 'The sets store words from the dictionary, bounded by `n` words of length '
                                           '`L`.',
                              'steps': [   'Verify that the target word exists in the dictionary, returning 0 if '
                                           'missing.',
                                           'Place the start word in one set and the end word in another set.',
                                           'Always expand the smaller set by replacing each character with all '
                                           'twenty-six alphabet letters.',
                                           'If a transformed word appears in the opposite set, return the total '
                                           'distance.'],
                              'time_complexity': 'O(n * L^2)',
                              'time_why': 'There are up to `n` words visited, and for each word we check `26 * L` '
                                          'mutations taking `O(L)` to hash.',
                              'when_to_use': 'Best for shortest path between two specific states with a known target '
                                             'state.'}],
        'edge_cases': [   {   'expected': '0',
                              'input': 'beginWord = "hit", endWord = "cog", wordList = ["cog"]',
                              'why': 'No intermediate words exist to link start and end.'},
                          {   'expected': '0',
                              'input': 'beginWord = "hit", endWord = "cog", wordList = ["hit","cog"]',
                              'why': 'The words differ by more than one letter.'},
                          {   'expected': '0',
                              'input': 'beginWord = "hot", endWord = "dog", wordList = ["hot","dog"]',
                              'why': 'Two letters differ, so direct transition is impossible.'},
                          {   'expected': '2',
                              'input': 'beginWord = "a", endWord = "c", wordList = ["a","b","c"]',
                              'why': 'A single letter difference links start directly to end in two words.'}],
        'follow_ups': [   {   'answer': 'Run breadth-first search to build a directed graph of shortest steps, then '
                                        'use depth-first search to collect the paths.',
                              'question': 'What if you need to output all shortest paths instead of just the length?'},
                          {   'answer': 'Group dictionary words by their length first so transitions only occur within '
                                        'the matching length group.',
                              'question': 'How would you handle a dictionary where words have varying lengths?'},
                          {   'answer': "Build intermediate pattern keys with wildcards such as 'h*t' to link neighbor "
                                        'words directly.',
                              'question': 'What if the alphabet size is very large?'}],
        'interview_script': [   'I need to find the shortest transformation sequence from a begin word to an end word.',
                                'My obvious first idea is to check the current word against all dictionary words, '
                                'taking O(n^2 * L) time.',
                                'A key point is that mutating each character twenty-six times is much faster when '
                                'words are short.',
                                'I would search from both ends at once with hash sets, taking O(n * L^2) time.',
                                'I would test this on cases where the end word is absent and on short ladders.'],
        'mistakes': [   {   'name': 'Linear dictionary scanning',
                            'right': 'Change each of the `L` letters through the alphabet and look up the result in a '
                                     'hash set.',
                            'wrong': 'Comparing each word against every word in the dictionary takes quadratic time.'},
                        {   'name': 'Missing target word check',
                            'right': 'Check if the end word exists in the dictionary before beginning the search.',
                            'wrong': 'Starting the search when the target word is missing wastes time and may loop.'},
                        {   'name': 'Off by one on steps',
                            'right': 'Start the distance counter at one because the problem counts words in the '
                                     'sequence, not edges.',
                            'wrong': 'Counting transitions instead of words returns one fewer than required.'}],
        'pattern': 'Breadth-first search',
        'related_slugs': ['lc-130', 'lc-200', 'lc-743'],
        'slugs': ['lc-127', 'word-ladder'],
        'summary': 'Step word by word using breadth-first search. At each word, replace one letter at a time to find '
                   'valid neighbors until reaching the target.',
        'trigger': 'Find the length of the shortest transformation sequence from a begin word to an end word.',
        'walkthrough': {   'columns': ['Step', 'Begin Set', 'End Set', 'Action'],
                           'input': 'beginWord = "hit", endWord = "cog", wordList = '
                                    '["hot","dot","dog","lot","log","cog"]',
                           'result': 'Frontiers meet at distance 5, returning 5.',
                           'rows': [   ['1', "{'hit'}", "{'cog'}", "Expand 'hit', find 'hot' in dictionary"],
                                       ['2', "{'cog'}", "{'hot'}", "Swap sets, expand 'hot', find 'dot' and 'lot'"],
                                       ['3', "{'dot','lot'}", "{'cog'}", "Expand 'cog', find 'dog' and 'log'"],
                                       [   '4',
                                           "{'dot','lot'}",
                                           "{'dog','log'}",
                                           "Expand 'dot', neighbor 'dog' meets opposite set"]]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public String[] solve(String[] board) {\n'
                                      '        int m = board.length;\n'
                                      '        int n = board[0].length();\n'
                                      '        char[][] grid = new char[m][];\n'
                                      '        for (int r = 0; r < m; r++) grid[r] = board[r].toCharArray();\n'
                                      '        boolean[][] visited = new boolean[m][n];\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      "                if (grid[r][c] == 'O' && !visited[r][c]) {\n"
                                      '                    List<int[]> group = new ArrayList<>();\n'
                                      '                    boolean[] reaches = new boolean[1];\n'
                                      '                    dfs(grid, r, c, visited, group, reaches);\n'
                                      '                    if (!reaches[0]) {\n'
                                      '                        for (int[] cell : group) {\n'
                                      "                            grid[cell[0]][cell[1]] = 'X';\n"
                                      '                        }\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        String[] out = new String[m];\n'
                                      '        for (int r = 0; r < m; r++) out[r] = new String(grid[r]);\n'
                                      '        return out;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void dfs(char[][] grid, int r, int c, boolean[][] visited, '
                                      'List<int[]> group, boolean[] reaches) {\n'
                                      '        visited[r][c] = true;\n'
                                      '        group.add(new int[]{r, c});\n'
                                      '        if (r == 0 || r == grid.length - 1 || c == 0 || c == grid[0].length - '
                                      '1) {\n'
                                      '            reaches[0] = true;\n'
                                      '        }\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '        for (int[] d : dirs) {\n'
                                      '            int nr = r + d[0];\n'
                                      '            int nc = c + d[1];\n'
                                      '            if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) '
                                      '{\n'
                                      "                if (grid[nr][nc] == 'O' && !visited[nr][nc]) {\n"
                                      '                    dfs(grid, nr, nc, visited, group, reaches);\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '    }\n'
                                      '}\n',
                              'idea': "Find each connected component of 'O' cells, record all its cells in a list, and "
                                      'flip them if none touch the boundary.',
                              'is_optimal': False,
                              'name': 'Collect regions and check boundary',
                              'space_complexity': 'O(m * n)',
                              'space_why': 'The visited array and list of cells in each group require memory '
                                           'proportional to the grid size.',
                              'steps': [   'Convert the board strings into a mutable grid of characters.',
                                           "When an unvisited 'O' is found, explore its whole group and collect the "
                                           'coordinates.',
                                           'If none of the cells in the group lie on the boundary, flip every cell in '
                                           "the list to 'X'.",
                                           'Pack the rows back into strings and return the final board.'],
                              'time_complexity': 'O(m * n)',
                              'time_why': 'Every cell is inspected a constant number of times during the group search.',
                              'when_to_use': 'Useful if you need to inspect or modify the captured regions '
                                             'individually.'},
                          {   'code': 'class Solution {\n'
                                      '    public String[] solve(String[] board) {\n'
                                      '        int rows = board.length;\n'
                                      '        int cols = board[0].length();\n'
                                      '        char[][] grid = new char[rows][];\n'
                                      '        for (int r = 0; r < rows; r++) grid[r] = board[r].toCharArray();\n'
                                      '\n'
                                      '        for (int r = 0; r < rows; r++) {\n'
                                      '            keep(grid, r, 0);\n'
                                      '            keep(grid, r, cols - 1);\n'
                                      '        }\n'
                                      '        for (int c = 0; c < cols; c++) {\n'
                                      '            keep(grid, 0, c);\n'
                                      '            keep(grid, rows - 1, c);\n'
                                      '        }\n'
                                      '\n'
                                      '        String[] out = new String[rows];\n'
                                      '        for (int r = 0; r < rows; r++) {\n'
                                      '            for (int c = 0; c < cols; c++) {\n'
                                      "                if (grid[r][c] == 'O') grid[r][c] = 'X';\n"
                                      "                else if (grid[r][c] == '#') grid[r][c] = 'O';\n"
                                      '            }\n'
                                      '            out[r] = new String(grid[r]);\n'
                                      '        }\n'
                                      '        return out;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void keep(char[][] grid, int r, int c) {\n'
                                      '        if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) return;\n'
                                      "        if (grid[r][c] != 'O') return;\n"
                                      "        grid[r][c] = '#';\n"
                                      '        keep(grid, r + 1, c);\n'
                                      '        keep(grid, r - 1, c);\n'
                                      '        keep(grid, r, c + 1);\n'
                                      '        keep(grid, r, c - 1);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': "Start from border 'O' cells, mark them safe in place with a temporary "
                                      "character, then flip the remaining 'O' cells.",
                              'is_optimal': True,
                              'name': 'Boundary flood fill in place',
                              'space_complexity': 'O(1)',
                              'space_why': 'We modify the grid in place, using no extra heap storage besides the call '
                                           'stack.',
                              'steps': [   "Walk along the four edges of the board to find any border 'O' cells.",
                                           "Spread inward from each border 'O', changing connected 'O' cells to a "
                                           "temporary marker like '#'.",
                                           "Scan the entire board, turning every remaining 'O' to 'X' since it is "
                                           'trapped.',
                                           "Restore all temporary markers back to 'O' and convert the grid to "
                                           'strings.'],
                              'time_complexity': 'O(m * n)',
                              'time_why': 'Each cell is visited a constant number of times during the flood fill and '
                                          'final scan.',
                              'when_to_use': 'Best when modifying the board in place without extra collections.'}],
        'edge_cases': [   {   'expected': '["O"]',
                              'input': 'board = ["O"]',
                              'why': 'A single cell on the border cannot be surrounded.'},
                          {   'expected': '["XX","XX"]',
                              'input': 'board = ["XX","XX"]',
                              'why': "A board with no 'O' cells remains unchanged."},
                          {   'expected': '["OO","OO"]',
                              'input': 'board = ["OO","OO"]',
                              'why': 'All cells touch the border, so no cell is flipped.'},
                          {   'expected': '["XOX","XOX","XOX"]',
                              'input': 'board = ["XOX","XOX","XOX"]',
                              'why': 'A vertical strip touches both top and bottom boundaries.'}],
        'follow_ups': [   {   'answer': 'Process the grid in tiles and maintain boundary connectivity across tile '
                                        'seams using disjoint sets.',
                              'question': 'What if the grid is too large to fit in memory?'},
                          {   'answer': "Connect all border 'O' cells to a dummy node, then flip any 'O' cell not "
                                        'connected to that dummy node.',
                              'question': 'Can this be solved using union find?'},
                          {   'answer': 'Expand the direction offsets from four neighbors to eight neighbors during '
                                        'the flood fill.',
                              'question': 'How would you handle diagonal connections?'}],
        'interview_script': [   "I need to capture all surrounded regions of 'O's by changing them to 'X's.",
                                'My obvious first idea is to collect each region and test if it touches a border, '
                                'using O(m * n) extra space.',
                                "A key point is that any 'O' connected to an edge 'O' can never be captured.",
                                'I would flood inward from the boundaries in place, taking O(m * n) time and O(1) '
                                'extra space.',
                                "I would test this on small grids and boards where 'O's form strips touching borders."],
        'mistakes': [   {   'name': 'Flipping border cells',
                            'right': "Never flip an 'O' on the boundary, and protect any 'O' connected to it.",
                            'wrong': "Flipping an 'O' that touches the edge of the board violates the surrounded "
                                     'rule.'},
                        {   'name': 'Forgetting to restore markers',
                            'right': "Run a final scan that turns all temporary markers back into 'O'.",
                            'wrong': 'Leaving temporary markers on the board leaves the board in a broken state.'},
                        {   'name': 'Stack overflow on deep recursion',
                            'right': "Return immediately when indices fall out of bounds or when the cell is not 'O'.",
                            'wrong': 'Using recursion without bounds checking on large grids can overflow the call '
                                     'stack.'}],
        'pattern': 'Boundary flood fill',
        'related_slugs': ['lc-200', 'lc-417', 'lc-286'],
        'slugs': ['lc-130', 'surrounded-regions'],
        'summary': "Mark all 'O' cells connected to the boundary as safe. Then flip every remaining 'O' to 'X' and "
                   'restore the safe cells.',
        'trigger': "Capture all regions that are surrounded by 'X' by flipping them.",
        'walkthrough': {   'columns': ['Cell', 'Border Connected', 'Marker', 'Final Value'],
                           'input': 'board = ["XXX","XOX","XXX"]',
                           'result': "The interior 'O' has no connection to any boundary and is flipped to 'X'.",
                           'rows': [   ['(1, 1)', 'No', "'O'", "'X'"],
                                       ['(0, 1)', 'Yes (Border)', "'X'", "'X'"],
                                       ['(2, 1)', 'Yes (Border)', "'X'", "'X'"]]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int[][] cloneGraph(int[][] adj) {\n'
                                      '        int n = adj.length;\n'
                                      '        if (n == 0) return new int[0][];\n'
                                      '        Node[] originals = new Node[n + 1];\n'
                                      '        for (int i = 1; i <= n; i++) originals[i] = new Node(i);\n'
                                      '        for (int i = 1; i <= n; i++) {\n'
                                      '            for (int neighbor : adj[i - 1]) '
                                      'originals[i].neighbors.add(originals[neighbor]);\n'
                                      '        }\n'
                                      '\n'
                                      '        Map<Node, Node> clones = new HashMap<>();\n'
                                      '        Queue<Node> queue = new ArrayDeque<>();\n'
                                      '        clones.put(originals[1], new Node(1));\n'
                                      '        queue.add(originals[1]);\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            Node curr = queue.poll();\n'
                                      '            for (Node neighbor : curr.neighbors) {\n'
                                      '                if (!clones.containsKey(neighbor)) {\n'
                                      '                    clones.put(neighbor, new Node(neighbor.val));\n'
                                      '                    queue.add(neighbor);\n'
                                      '                }\n'
                                      '                clones.get(curr).neighbors.add(clones.get(neighbor));\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        int[][] out = new int[n][];\n'
                                      '        for (int i = 1; i <= n; i++) {\n'
                                      '            Node clone = clones.get(originals[i]);\n'
                                      '            List<Node> neighbors = clone == null ? List.of() : '
                                      'clone.neighbors;\n'
                                      '            out[i - 1] = new int[neighbors.size()];\n'
                                      '            for (int j = 0; j < neighbors.size(); j++) out[i - 1][j] = '
                                      'neighbors.get(j).val;\n'
                                      '        }\n'
                                      '        return out;\n'
                                      '    }\n'
                                      '}\n'
                                      '\n'
                                      'class Node {\n'
                                      '    public int val;\n'
                                      '    public List<Node> neighbors = new ArrayList<>();\n'
                                      '    public Node(int val) { this.val = val; }\n'
                                      '}\n',
                              'idea': 'Put nodes into a queue and store each newly created clone in a hash map, adding '
                                      'cloned neighbors as they are explored.',
                              'is_optimal': False,
                              'name': 'Breadth-first search with clone map',
                              'space_complexity': 'O(V + E)',
                              'space_why': 'The queue holds up to `V` nodes and the map stores all `V` nodes along '
                                           'with their neighbor connections.',
                              'steps': [   'Handle the empty graph case by returning an empty adjacency array '
                                           'immediately.',
                                           'Instantiate Node objects for all vertices based on the input adjacency '
                                           'list.',
                                           'Use a queue to process nodes level by level, linking cloned neighbor '
                                           'nodes.',
                                           'Convert the cloned nodes back into an adjacency list and return the '
                                           'array.'],
                              'time_complexity': 'O(V + E)',
                              'time_why': 'Every node and edge is inspected once during the breadth-first search.',
                              'when_to_use': 'Useful when you want to clone graph nodes level by level without '
                                             'recursion stack limits.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int[][] cloneGraph(int[][] adj) {\n'
                                      '        int n = adj.length;\n'
                                      '        if (n == 0) return new int[0][];\n'
                                      '        Node[] originals = new Node[n + 1];\n'
                                      '        for (int i = 1; i <= n; i++) originals[i] = new Node(i);\n'
                                      '        for (int i = 1; i <= n; i++) {\n'
                                      '            for (int neighbor : adj[i - 1]) '
                                      'originals[i].neighbors.add(originals[neighbor]);\n'
                                      '        }\n'
                                      '\n'
                                      '        Node clone = cloneDfs(originals[1], new HashMap<>());\n'
                                      '        int[][] out = new int[n][];\n'
                                      '        Map<Integer, Node> byValue = new HashMap<>();\n'
                                      '        collect(clone, byValue);\n'
                                      '\n'
                                      '        for (int i = 1; i <= n; i++) {\n'
                                      '            Node node = byValue.get(i);\n'
                                      '            List<Node> neighbors = node == null ? List.of() : node.neighbors;\n'
                                      '            out[i - 1] = new int[neighbors.size()];\n'
                                      '            for (int j = 0; j < neighbors.size(); j++) out[i - 1][j] = '
                                      'neighbors.get(j).val;\n'
                                      '        }\n'
                                      '        return out;\n'
                                      '    }\n'
                                      '\n'
                                      '    private Node cloneDfs(Node node, Map<Node, Node> seen) {\n'
                                      '        if (node == null) return null;\n'
                                      '        Node existing = seen.get(node);\n'
                                      '        if (existing != null) return existing;\n'
                                      '        Node copy = new Node(node.val);\n'
                                      '        seen.put(node, copy);\n'
                                      '        for (Node neighbor : node.neighbors) '
                                      'copy.neighbors.add(cloneDfs(neighbor, seen));\n'
                                      '        return copy;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void collect(Node node, Map<Integer, Node> byValue) {\n'
                                      '        if (node == null || byValue.containsKey(node.val)) return;\n'
                                      '        byValue.put(node.val, node);\n'
                                      '        for (Node neighbor : node.neighbors) collect(neighbor, byValue);\n'
                                      '    }\n'
                                      '}\n'
                                      '\n'
                                      'class Node {\n'
                                      '    public int val;\n'
                                      '    public List<Node> neighbors = new ArrayList<>();\n'
                                      '    public Node(int val) { this.val = val; }\n'
                                      '}\n',
                              'idea': 'Recursively clone each node and store it in a map, linking cloned neighbor '
                                      'nodes returned from recursive calls.',
                              'is_optimal': True,
                              'name': 'Depth-first search with clone map',
                              'space_complexity': 'O(V)',
                              'space_why': 'The recursion stack goes up to `V` deep and the hash map holds `V` node '
                                           'clones.',
                              'steps': [   'Handle the empty graph by returning an empty array immediately.',
                                           'Instantiate Node objects from the input adjacency list.',
                                           'Recursively clone each node and record it in a seen map before visiting '
                                           'neighbors.',
                                           'Reconstruct the cloned graph into the expected adjacency list format.'],
                              'time_complexity': 'O(V + E)',
                              'time_why': 'Each node and edge is visited once by the recursion.',
                              'when_to_use': 'Best standard way to clone a graph with simple recursive logic.'}],
        'edge_cases': [   {'expected': '[]', 'input': 'adj = []', 'why': 'An empty graph returns an empty array.'},
                          {   'expected': '[[]]',
                              'input': 'adj = [[]]',
                              'why': 'A single node with no neighbors clones to a single isolated node.'},
                          {   'expected': '[[2],[1]]',
                              'input': 'adj = [[2],[1]]',
                              'why': 'Two nodes connected to each other forms a two-node cycle.'},
                          {   'expected': '[[2,4],[1,3],[2,4],[1,3]]',
                              'input': 'adj = [[2,4],[1,3],[2,4],[1,3]]',
                              'why': 'A four-node cycle tests cycle handling across multiple vertices.'}],
        'follow_ups': [   {   'answer': 'Stream nodes in chunks, storing already serialized cloned components to disk.',
                              'question': 'What if the graph contains millions of nodes and cannot fit in memory?'},
                          {   'answer': "The map lookup still prevents cycles and connects the node's clone back to "
                                        'itself.',
                              'question': 'How would you handle directed graphs with self-loops?'},
                          {   'answer': 'Use an array indexed by node value instead of a hash map to speed up lookups.',
                              'question': 'Can we clone without extra hash map storage if node values are sequential '
                                          'from 1 to N?'}],
        'interview_script': [   'I need to produce a deep copy of a connected undirected graph.',
                                'My obvious first thought is breadth-first search storing all queued nodes and edges, '
                                'taking O(V + E) time and O(V + E) space.',
                                'A key point is that an undirected graph has cycles, so I must map original nodes to '
                                'clones before exploring neighbors.',
                                'I can use depth-first search with a clone map, keeping recursion space to O(V) and '
                                'taking O(V + E) time.',
                                'I would test this on an empty graph, a single node, and a cyclic graph.'],
        'mistakes': [   {   'name': 'Infinite recursion on cycles',
                            'right': 'Put the new clone into the map immediately before making recursive calls on its '
                                     'neighbors.',
                            'wrong': 'Exploring neighbors before recording the clone in the map loops infinitely on '
                                     'undirected edges.'},
                        {   'name': 'Shallow copying neighbor lists',
                            'right': 'Only link newly cloned nodes into the neighbors list of a cloned node.',
                            'wrong': 'Copying neighbor references from the original graph instead of creating new '
                                     'nodes creates a mixed graph.'},
                        {   'name': 'Null pointer on empty input',
                            'right': 'Check if the input is empty and return an empty result right at the start.',
                            'wrong': 'Accessing the neighbors of a null or empty input throws an exception.'}],
        'pattern': 'Graph search',
        'related_slugs': ['lc-200', 'lc-207', 'lc-547'],
        'slugs': ['lc-133', 'clone-graph'],
        'summary': 'Make a copy of each node as you visit it, storing clones in a map. Link neighbors together using '
                   'the mapped clones.',
        'trigger': 'Return a deep copy of a connected undirected graph.',
        'walkthrough': {   'columns': ['Current Node', 'Clone Map', 'Action', 'Neighbors Cloned'],
                           'input': 'adj = [[2],[1]]',
                           'result': 'Graph is deep-copied with cycle intact, returning cloned adjacency [[2], [1]].',
                           'rows': [   ['1', "{1: 1'}", "Create clone 1', inspect neighbor 2", '[]'],
                                       ['2', "{1: 1', 2: 2'}", "Create clone 2', inspect neighbor 1", '[]'],
                                       ['1', "{1: 1', 2: 2'}", "Node 1 found in clone map, return clone 1'", "[1']"],
                                       [   '2',
                                           "{1: 1', 2: 2'}",
                                           "Completed neighbor list for 2', return clone 2'",
                                           "[2']"]]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int numIslands(String[] grid) {\n'
                                      '        if (grid == null || grid.length == 0) return 0;\n'
                                      '        int m = grid.length, n = grid[0].length();\n'
                                      '        char[][] cells = new char[m][];\n'
                                      '        for (int r = 0; r < m; r++) cells[r] = grid[r].toCharArray();\n'
                                      '\n'
                                      '        int count = 0;\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      "                if (cells[r][c] == '1') {\n"
                                      '                    count++;\n'
                                      "                    cells[r][c] = '0';\n"
                                      '                    Queue<int[]> queue = new ArrayDeque<>();\n'
                                      '                    queue.add(new int[]{r, c});\n'
                                      '\n'
                                      '                    while (!queue.isEmpty()) {\n'
                                      '                        int[] curr = queue.poll();\n'
                                      '                        for (int[] d : dirs) {\n'
                                      '                            int nr = curr[0] + d[0], nc = curr[1] + d[1];\n'
                                      '                            if (nr >= 0 && nr < m && nc >= 0 && nc < n && '
                                      "cells[nr][nc] == '1') {\n"
                                      "                                cells[nr][nc] = '0';\n"
                                      '                                queue.add(new int[]{nr, nc});\n'
                                      '                            }\n'
                                      '                        }\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return count;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'When land is encountered, push it to a queue and turn neighbors into water as '
                                      'they are dequeued.',
                              'is_optimal': False,
                              'name': 'Breadth-first search queue sink',
                              'space_complexity': 'O(min(m, n))',
                              'space_why': 'In the worst case of a diagonal frontier, the queue holds at most `min(m, '
                                           'n)` cells.',
                              'steps': [   'Convert the input array of strings into a mutable two-dimensional '
                                           'character array.',
                                           'Scan through the grid cell by cell looking for land.',
                                           'When land is found, increment the island count and put the cell into a '
                                           'queue.',
                                           'While the queue is not empty, dequeue each cell and sink its unvisited '
                                           'land neighbors.'],
                              'time_complexity': 'O(m * n)',
                              'time_why': 'Every cell in the grid is visited and processed at most once.',
                              'when_to_use': 'Good when call stack depth is a concern on very large grids.'},
                          {   'code': 'class Solution {\n'
                                      '    public int numIslands(String[] grid) {\n'
                                      '        if (grid == null || grid.length == 0) return 0;\n'
                                      '        char[][] cells = new char[grid.length][];\n'
                                      '        for (int r = 0; r < grid.length; r++) cells[r] = '
                                      'grid[r].toCharArray();\n'
                                      '\n'
                                      '        int count = 0;\n'
                                      '        for (int r = 0; r < cells.length; r++) {\n'
                                      '            for (int c = 0; c < cells[r].length; c++) {\n'
                                      "                if (cells[r][c] == '1') {\n"
                                      '                    count++;\n'
                                      '                    sink(cells, r, c);\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return count;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void sink(char[][] cells, int r, int c) {\n'
                                      '        if (r < 0 || r >= cells.length || c < 0 || c >= cells[r].length) '
                                      'return;\n'
                                      "        if (cells[r][c] != '1') return;\n"
                                      "        cells[r][c] = '0';\n"
                                      '        sink(cells, r + 1, c);\n'
                                      '        sink(cells, r - 1, c);\n'
                                      '        sink(cells, r, c + 1);\n'
                                      '        sink(cells, r, c - 1);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'When an unvisited land cell is found, sink it immediately to water, explore all '
                                      'four neighbors recursively, and increment the island count.',
                              'is_optimal': True,
                              'name': 'The sinking island',
                              'space_complexity': 'O(m·n)',
                              'space_why': 'The recursive call stack can grow up to `m·n` in the worst case of a grid '
                                           'filled with land.',
                              'steps': [   'Convert the string input into a mutable two-dimensional character grid.',
                                           'Walk across every cell in the grid looking for land.',
                                           'When a piece of land is found, add one to the island counter.',
                                           'In the sink function, turn the current cell into water before visiting its '
                                           'four neighbors.'],
                              'time_complexity': 'O(m·n)',
                              'time_why': 'Every cell is checked once by the outer loops and visited once during '
                                          'sinking.',
                              'when_to_use': 'Cleanest approach for grid flood fill when recursion depth fits within '
                                             'memory.'}],
        'edge_cases': [   {'expected': '0', 'input': 'grid = ["0"]', 'why': 'A single water cell has zero islands.'},
                          {'expected': '1', 'input': 'grid = ["1"]', 'why': 'A single land cell forms one island.'},
                          {   'expected': '5',
                              'input': 'grid = ["101","010","101"]',
                              'why': 'Diagonal land cells do not connect, forming separate islands.'},
                          {   'expected': '1',
                              'input': 'grid = ["11","11"]',
                              'why': 'All land cells connect into a single large island.'}],
        'follow_ups': [   {   'answer': 'Use a boolean visited array or a hash set of cell coordinates to keep track '
                                        'of visited land.',
                              'question': 'What if modifying the input grid is forbidden?'},
                          {   'answer': 'Use a disjoint set data structure to union adjacent land cells as each new '
                                        'cell arrives.',
                              'question': 'How would you handle a dynamic stream of land additions?'},
                          {   'answer': 'Process the grid in horizontal slices and use union find along the shared '
                                        'boundary rows.',
                              'question': 'What if the grid is too large to fit in RAM?'}],
        'interview_script': [   'I need to count the number of disconnected islands in a binary grid.',
                                'My first thought is breadth-first search using a queue, which takes O(m * n) time and '
                                'O(min(m, n)) space.',
                                'A key point is that sinking each land cell to water before inspecting its neighbors '
                                'prevents infinite loops.',
                                'I can use depth-first search in place, taking O(m·n) time and O(m·n) call stack '
                                'space.',
                                'I would test this on an all-water grid, an all-land grid, and diagonally placed land '
                                'cells.'],
        'mistakes': [   {   'name': 'The Infinite Bounce Trap',
                            'right': "Turn a box to water BEFORE looking at its neighbours: grid[r][c] = '0' comes "
                                     'first in sink. Otherwise two land boxes send the search back and forth for ever.',
                            'wrong': 'Looking at neighbor cells before marking the current cell as visited causes two '
                                     'adjacent land cells to bounce endlessly.'},
                        {   'name': 'Missing out of bounds checks',
                            'right': 'Check boundary limits first before reading from the grid.',
                            'wrong': 'Accessing grid cells with negative indices or indices beyond row and column '
                                     'bounds causes exceptions.'},
                        {   'name': 'Incrementing island count inside helper',
                            'right': 'Increment the count only in the outer loop when a fresh unvisited land cell is '
                                     'first discovered.',
                            'wrong': 'Adding to the count inside the recursive helper counts individual land cells '
                                     'rather than whole islands.'}],
        'pattern': 'Flood fill',
        'related_slugs': ['lc-130', 'lc-417', 'lc-542'],
        'slugs': ['lc-200', 'number-of-islands'],
        'summary': 'Scan the grid for land. When a piece of land is found, increment the count and sink all connected '
                   'land cells.',
        'trigger': "Given a 2D grid map of '1's and '0's, count the number of islands.",
        'walkthrough': {   'columns': ['Cell', 'Value', 'Action', 'Islands'],
                           'input': 'grid = ["11","00"]',
                           'result': 'All connected land is sunk and 1 island is returned.',
                           'rows': [   [   '(0,0)',
                                           "'1'",
                                           "First land found; sink (0,0) to '0' immediately to avoid bouncing",
                                           '1'],
                                       [   '(0,1)',
                                           "'1'",
                                           "Neighbor of (0,0); sink (0,1) to '0' before checking its neighbors",
                                           '1'],
                                       ['(1,0)', "'0'", 'Water cell; skip', '1'],
                                       ['(1,1)', "'0'", 'Water cell; skip', '1']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public boolean canFinish(int numCourses, int[][] prerequisites) {\n'
                                      '        List<List<Integer>> adj = new ArrayList<>();\n'
                                      '        for (int i = 0; i < numCourses; i++) {\n'
                                      '            adj.add(new ArrayList<>());\n'
                                      '        }\n'
                                      '        for (int[] p : prerequisites) {\n'
                                      '            adj.get(p[1]).add(p[0]);\n'
                                      '        }\n'
                                      '        for (int i = 0; i < numCourses; i++) {\n'
                                      '            boolean[] visited = new boolean[numCourses];\n'
                                      '            if (hasCycle(i, i, adj, visited)) {\n'
                                      '                return false;\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return true;\n'
                                      '    }\n'
                                      '\n'
                                      '    private boolean hasCycle(int start, int curr, List<List<Integer>> adj, '
                                      'boolean[] visited) {\n'
                                      '        visited[curr] = true;\n'
                                      '        for (int next : adj.get(curr)) {\n'
                                      '            if (next == start) return true;\n'
                                      '            if (!visited[next] && hasCycle(start, next, adj, visited)) {\n'
                                      '                return true;\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return false;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Start a search from each course independently to check if any prerequisite path '
                                      'leads back to the start.',
                              'is_optimal': False,
                              'name': 'Check cycles from every course',
                              'space_complexity': 'O(V + E)',
                              'space_why': 'The adjacency list and path tracking arrays hold up to `V + E` entries.',
                              'steps': [   'Build an adjacency list from prerequisite pairs.',
                                           'From each course, explore prerequisite paths using depth-first search.',
                                           'Track visited courses along the current search path.',
                                           'If any path encounters the starting course, report a cycle immediately.'],
                              'time_complexity': 'O(V * (V + E))',
                              'time_why': 'We may search up to `V + E` edges from each of the `V` courses.',
                              'when_to_use': 'Only if you want to inspect cycles starting at a specific course.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public boolean canFinish(int numCourses, int[][] prerequisites) {\n'
                                      '        List<List<Integer>> adj = new ArrayList<>();\n'
                                      '        for (int i = 0; i < numCourses; i++) {\n'
                                      '            adj.add(new ArrayList<>());\n'
                                      '        }\n'
                                      '        int[] indegree = new int[numCourses];\n'
                                      '\n'
                                      '        for (int[] p : prerequisites) {\n'
                                      '            adj.get(p[1]).add(p[0]);\n'
                                      '            indegree[p[0]]++;\n'
                                      '        }\n'
                                      '\n'
                                      '        Queue<Integer> queue = new ArrayDeque<>();\n'
                                      '        for (int i = 0; i < numCourses; i++) {\n'
                                      '            if (indegree[i] == 0) {\n'
                                      '                queue.add(i);\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        int count = 0;\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int course = queue.poll();\n'
                                      '            count++;\n'
                                      '\n'
                                      '            for (int next : adj.get(course)) {\n'
                                      '                indegree[next]--;\n'
                                      '                if (indegree[next] == 0) {\n'
                                      '                    queue.add(next);\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return count == numCourses;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Build an adjacency list and count incoming prerequisites, putting ready courses '
                                      'into a queue to peel them off.',
                              'is_optimal': True,
                              'name': 'The domino chain',
                              'space_complexity': 'O(V+E)',
                              'space_why': 'The adjacency list stores `E` edges and the indegree array stores `V` '
                                           'courses.',
                              'steps': [   'Build an adjacency list and count incoming prerequisites for every course.',
                                           'Place all courses that have zero incoming prerequisites into a queue.',
                                           'Remove courses from the queue, decrementing prerequisites for dependent '
                                           'courses.',
                                           'Compare the total number of processed courses with the total course '
                                           'count.'],
                              'time_complexity': 'O(V+E)',
                              'time_why': 'Every course enters the queue once and every prerequisite edge is '
                                          'decremented once.',
                              'when_to_use': 'Best standard way to detect cycles and determine course order.'}],
        'edge_cases': [   {   'expected': 'true',
                              'input': 'numCourses = 1, prerequisites = []',
                              'why': 'A single course with no prerequisites can always be finished.'},
                          {   'expected': 'true',
                              'input': 'numCourses = 2, prerequisites = [[1,0]]',
                              'why': 'A linear chain of prerequisites has no cycle.'},
                          {   'expected': 'false',
                              'input': 'numCourses = 2, prerequisites = [[1,0],[0,1]]',
                              'why': 'Two courses depending on each other form an impossible loop.'},
                          {   'expected': 'true',
                              'input': 'numCourses = 3, prerequisites = [[0,1],[0,2],[1,2]]',
                              'why': 'A directed acyclic graph with multiple prerequisites can be completed.'}],
        'follow_ups': [   {   'answer': 'Record each course as it leaves the queue into an array; if all courses are '
                                        'taken, return that array.',
                              'question': 'How would you return the order in which to take the courses?'},
                          {   'answer': "Kahn's algorithm naturally discovers one valid order depending on queue "
                                        'order.',
                              'question': 'What if there are multiple valid orders and the interviewer wants any one?'},
                          {   'answer': 'Use depth-first search with three-color node states to capture the exact '
                                        'back-edge cycle path.',
                              'question': 'How would you find which specific courses form a cycle?'}],
        'interview_script': [   'I need to determine if all courses can be completed given their prerequisite '
                                'dependencies.',
                                'My obvious first thought is searching for cycles from each course, taking O(V * (V + '
                                'E)) time.',
                                'A key point is that courses with zero remaining prerequisites can always be taken '
                                'immediately.',
                                'I would use topological sorting with an indegree queue, taking O(V+E) time and O(V+E) '
                                'space.',
                                'I would test this on independent courses, valid linear chains, and direct cycles.'],
        'mistakes': [   {   'name': 'The Cycle Deadlock Trap',
                            'right': 'Courses that wait for each other in a circle are never blocked by 0, so they '
                                     'never enter the free line. Do not loop for ever waiting for them: count the '
                                     'falls and compare with numCourses.',
                            'wrong': 'Waiting for all courses to finish without checking if any circular dependencies '
                                     'remain unresolvable.'},
                        {   'name': 'Reversing prerequisite edges',
                            'right': 'Direct the edge from prerequisite `[1]` to course `[0]` so courses unlock in '
                                     'proper sequence.',
                            'wrong': 'Adding edges from target course to prerequisite inverts the flow of '
                                     'prerequisites.'},
                        {   'name': 'Missing self dependency',
                            'right': 'Self prerequisites increment the indegree and properly prevent the course from '
                                     'entering the queue.',
                            'wrong': 'Failing to check when a course lists itself as a prerequisite allows illegal '
                                     'loops.'}],
        'pattern': 'Topological sort',
        'related_slugs': ['lc-210', 'lc-269', 'lc-133'],
        'slugs': ['lc-207', 'course-schedule'],
        'summary': 'Count incoming prerequisite requirements for each course. Courses with zero requirements become '
                   'available and free up subsequent courses.',
        'trigger': 'Determine if it is possible to finish all courses given prerequisite pairs.',
        'walkthrough': {   'columns': ['Course', 'Indegree', 'Queue Action', 'Processed Count'],
                           'input': 'numCourses = 2, prerequisites = [[1,0],[0,1]]',
                           'result': 'Processed count 0 is less than 2, so false is returned.',
                           'rows': [   ['0', '1', 'Blocked by course 1; cannot enter queue', '0'],
                                       ['1', '1', 'Blocked by course 0; cannot enter queue', '0'],
                                       [   'Queue',
                                           'Empty',
                                           'Cycle deadlock reached: neither course has indegree 0',
                                           '0']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int[] findOrder(int numCourses, int[][] prerequisites) {\n'
                                      '        List<List<Integer>> adj = new ArrayList<>();\n'
                                      '        for (int i = 0; i < numCourses; i++) {\n'
                                      '            adj.add(new ArrayList<>());\n'
                                      '        }\n'
                                      '        int[] indegree = new int[numCourses];\n'
                                      '        for (int[] p : prerequisites) {\n'
                                      '            adj.get(p[1]).add(p[0]);\n'
                                      '            indegree[p[0]]++;\n'
                                      '        }\n'
                                      '\n'
                                      '        int[] order = new int[numCourses];\n'
                                      '        boolean[] used = new boolean[numCourses];\n'
                                      '        int idx = 0;\n'
                                      '\n'
                                      '        for (int step = 0; step < numCourses; step++) {\n'
                                      '            int pick = -1;\n'
                                      '            for (int i = 0; i < numCourses; i++) {\n'
                                      '                if (!used[i] && indegree[i] == 0) {\n'
                                      '                    pick = i;\n'
                                      '                    break;\n'
                                      '                }\n'
                                      '            }\n'
                                      '            if (pick == -1) return new int[0];\n'
                                      '            used[pick] = true;\n'
                                      '            order[idx++] = pick;\n'
                                      '            for (int next : adj.get(pick)) {\n'
                                      '                indegree[next]--;\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return order;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'At each step, look through all courses to find one with zero prerequisites, '
                                      'decrement dependent counts, and repeat.',
                              'is_optimal': False,
                              'name': 'Repeated scan for free courses',
                              'space_complexity': 'O(V + E)',
                              'space_why': 'The adjacency list and indegree array hold up to `V + E` elements.',
                              'steps': [   'Build an array of incoming prerequisite counts for each course.',
                                           'Look across all courses to find an unvisited course whose prerequisite '
                                           'count is zero.',
                                           'Decrement counts for all courses that depend on the chosen course.',
                                           'Repeat until all courses are ordered or no course can be picked.'],
                              'time_complexity': 'O(V^2 + E)',
                              'time_why': 'We scan across all `V` courses up to `V` times to find courses with zero '
                                          'indegree.',
                              'when_to_use': 'Simple to reason about when the number of courses is very small.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int[] findOrder(int numCourses, int[][] prerequisites) {\n'
                                      '        List<List<Integer>> adj = new ArrayList<>();\n'
                                      '        for (int i = 0; i < numCourses; i++) {\n'
                                      '            adj.add(new ArrayList<>());\n'
                                      '        }\n'
                                      '        int[] indegree = new int[numCourses];\n'
                                      '\n'
                                      '        for (int[] p : prerequisites) {\n'
                                      '            adj.get(p[1]).add(p[0]);\n'
                                      '            indegree[p[0]]++;\n'
                                      '        }\n'
                                      '\n'
                                      '        Queue<Integer> queue = new ArrayDeque<>();\n'
                                      '        for (int i = 0; i < numCourses; i++) {\n'
                                      '            if (indegree[i] == 0) {\n'
                                      '                queue.add(i);\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        int[] order = new int[numCourses];\n'
                                      '        int idx = 0;\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int course = queue.poll();\n'
                                      '            order[idx++] = course;\n'
                                      '\n'
                                      '            for (int next : adj.get(course)) {\n'
                                      '                indegree[next]--;\n'
                                      '                if (indegree[next] == 0) {\n'
                                      '                    queue.add(next);\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return idx == numCourses ? order : new int[0];\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Track prerequisites in an indegree array, place ready courses into a queue, and '
                                      'record the order as each course finishes.',
                              'is_optimal': True,
                              'name': "Kahn's algorithm with indegree queue",
                              'space_complexity': 'O(V + E)',
                              'space_why': 'The adjacency list stores `E` edges and the indegree and order arrays take '
                                           '`O(V)` space.',
                              'steps': [   'Build the adjacency list and count incoming prerequisites in an indegree '
                                           'array.',
                                           'Enqueue all courses that have zero incoming prerequisites.',
                                           'Dequeue courses one by one, recording each in the result order array.',
                                           'If the total recorded courses equals `numCourses`, return the array; '
                                           'otherwise return empty.'],
                              'time_complexity': 'O(V + E)',
                              'time_why': 'Every course is added to the queue once and each dependency edge is '
                                          'inspected once.',
                              'when_to_use': 'Best standard way to find a valid ordering or detect cyclic '
                                             'dependencies.'}],
        'edge_cases': [   {   'expected': '[0]',
                              'input': 'numCourses = 1, prerequisites = []',
                              'why': 'A single course with no dependencies is immediately valid.'},
                          {   'expected': '[0,1]',
                              'input': 'numCourses = 2, prerequisites = [[1,0]]',
                              'why': 'A direct dependency requires course 0 before course 1.'},
                          {   'expected': '[]',
                              'input': 'numCourses = 2, prerequisites = [[1,0],[0,1]]',
                              'why': 'A mutual cycle means no course can be completed.'},
                          {   'expected': '[0,1,2]',
                              'input': 'numCourses = 3, prerequisites = []',
                              'why': 'All courses are independent and can be taken in any order.'}],
        'follow_ups': [   {   'answer': 'Use a min-heap priority queue instead of a standard queue so smaller course '
                                        'numbers are taken first.',
                              'question': 'What if you need the lexicographically smallest order?'},
                          {   'answer': 'Yes, use three-color cycle detection and append courses to a list in '
                                        'post-order, then reverse the list.',
                              'question': 'Can we solve this using depth-first search?'},
                          {   'answer': 'Contract corequisite courses into single super-nodes using strongly connected '
                                        'components before sorting.',
                              'question': 'What if some courses have corequisites that must be taken simultaneously?'}],
        'interview_script': [   'I need to return a valid sequence to finish all courses, or an empty array if a cycle '
                                'exists.',
                                'My obvious first idea is scanning the entire course array for zero-indegree courses, '
                                'taking O(V^2 + E) time.',
                                'A key point is that an indegree queue lets us retrieve ready courses in constant '
                                'time.',
                                "I would use Kahn's algorithm with an indegree queue, taking O(V + E) time and O(V + "
                                'E) space.',
                                'I would test this on disconnected courses, single courses, and cyclic dependencies.'],
        'mistakes': [   {   'name': 'Returning partial array on cycle',
                            'right': 'Check if the recorded count equals `numCourses`; if not, return an empty array.',
                            'wrong': 'Returning the partially filled order array when a cycle exists produces an '
                                     'incomplete sequence.'},
                        {   'name': 'Reversing dependency direction',
                            'right': 'Direct arrows from prerequisite `[1]` to course `[0]` so courses unlock '
                                     'forwards.',
                            'wrong': 'Adding edges from target course to prerequisite inverts the course order.'},
                        {   'name': 'Forgetting to initialize empty lists',
                            'right': 'Fill the outer adjacency list with empty lists for all courses up front.',
                            'wrong': 'Accessing adjacency list entries without initializing each bucket causes null '
                                     'pointer errors.'}],
        'pattern': 'Topological sort',
        'related_slugs': ['lc-207', 'lc-269', 'lc-133'],
        'slugs': ['lc-210', 'course-schedule-ii'],
        'summary': 'Peel off courses with zero prerequisites using a queue. Append each finished course to the result '
                   'order until all courses are taken.',
        'trigger': 'Return the ordering of courses you should take to finish all courses.',
        'walkthrough': {   'columns': ['Dequeued Course', 'Updated Indegrees', 'Queue State', 'Result Order'],
                           'input': 'numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]',
                           'result': 'All 4 courses are ordered, returning [0, 1, 2, 3].',
                           'rows': [   ['Init', 'indegree: [0, 1, 1, 2]', '[0]', '[]'],
                                       ['0', 'indegree: [0, 0, 0, 2]', '[1, 2]', '[0]'],
                                       ['1', 'indegree: [0, 0, 0, 1]', '[2]', '[0, 1]'],
                                       ['2', 'indegree: [0, 0, 0, 0]', '[3]', '[0, 1, 2]'],
                                       ['3', 'indegree: [0, 0, 0, 0]', '[]', '[0, 1, 2, 3]']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public String alienOrder(String[] words) {\n'
                                      '        Map<Character, Set<Character>> adj = new HashMap<>();\n'
                                      '        for (String word : words) {\n'
                                      '            for (char c : word.toCharArray()) {\n'
                                      '                adj.putIfAbsent(c, new HashSet<>());\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        for (int i = 0; i < words.length - 1; i++) {\n'
                                      '            String w1 = words[i], w2 = words[i + 1];\n'
                                      '            if (w1.length() > w2.length() && w1.startsWith(w2)) {\n'
                                      '                return "";\n'
                                      '            }\n'
                                      '            for (int j = 0; j < Math.min(w1.length(), w2.length()); j++) {\n'
                                      '                if (w1.charAt(j) != w2.charAt(j)) {\n'
                                      '                    adj.get(w1.charAt(j)).add(w2.charAt(j));\n'
                                      '                    break;\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        Map<Character, Integer> state = new HashMap<>();\n'
                                      '        StringBuilder sb = new StringBuilder();\n'
                                      '\n'
                                      '        for (char c : adj.keySet()) {\n'
                                      '            if (!dfs(c, adj, state, sb)) {\n'
                                      '                return "";\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return sb.reverse().toString();\n'
                                      '    }\n'
                                      '\n'
                                      '    private boolean dfs(char c, Map<Character, Set<Character>> adj, '
                                      'Map<Character, Integer> state, StringBuilder sb) {\n'
                                      '        if (state.getOrDefault(c, 0) == 1) return false;\n'
                                      '        if (state.getOrDefault(c, 0) == 2) return true;\n'
                                      '\n'
                                      '        state.put(c, 1);\n'
                                      '        for (char next : adj.get(c)) {\n'
                                      '            if (!dfs(next, adj, state, sb)) return false;\n'
                                      '        }\n'
                                      '        state.put(c, 2);\n'
                                      '        sb.append(c);\n'
                                      '        return true;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Build a directed character graph from adjacent words and use depth-first search '
                                      'with three states to detect cycles.',
                              'is_optimal': False,
                              'name': 'Depth search with cycle detection',
                              'space_complexity': 'O(U + min(U^2, C))',
                              'space_why': 'The graph and state maps store `U` unique characters and up to `min(U^2, '
                                           'C)` edges.',
                              'steps': [   'Collect all unique characters and set up an adjacency list.',
                                           'Compare adjacent words to find the first differing character and add a '
                                           'directed edge.',
                                           'If a longer word precedes its own prefix, return an empty string '
                                           'immediately.',
                                           'Perform depth-first search with visited states, prepending characters to a '
                                           'post-order list.'],
                              'time_complexity': 'O(C)',
                              'time_why': 'We compare adjacent words character by character, bounded by total '
                                          'characters `C`.',
                              'when_to_use': 'Useful when implementing topological sort using recursive post-order '
                                             'depth search.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public String alienOrder(String[] words) {\n'
                                      '        Map<Character, Set<Character>> adj = new HashMap<>();\n'
                                      '        Map<Character, Integer> indegree = new HashMap<>();\n'
                                      '\n'
                                      '        for (String word : words) {\n'
                                      '            for (char c : word.toCharArray()) {\n'
                                      '                adj.putIfAbsent(c, new HashSet<>());\n'
                                      '                indegree.putIfAbsent(c, 0);\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        for (int i = 0; i < words.length - 1; i++) {\n'
                                      '            String w1 = words[i], w2 = words[i + 1];\n'
                                      '            if (w1.length() > w2.length() && w1.startsWith(w2)) {\n'
                                      '                return "";\n'
                                      '            }\n'
                                      '            for (int j = 0; j < Math.min(w1.length(), w2.length()); j++) {\n'
                                      '                char c1 = w1.charAt(j), c2 = w2.charAt(j);\n'
                                      '                if (c1 != c2) {\n'
                                      '                    if (adj.get(c1).add(c2)) {\n'
                                      '                        indegree.put(c2, indegree.get(c2) + 1);\n'
                                      '                    }\n'
                                      '                    break;\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        Queue<Character> queue = new ArrayDeque<>();\n'
                                      '        for (char c : indegree.keySet()) {\n'
                                      '            if (indegree.get(c) == 0) {\n'
                                      '                queue.add(c);\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        StringBuilder sb = new StringBuilder();\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            char c = queue.poll();\n'
                                      '            sb.append(c);\n'
                                      '            for (char next : adj.get(c)) {\n'
                                      '                indegree.put(next, indegree.get(next) - 1);\n'
                                      '                if (indegree.get(next) == 0) {\n'
                                      '                    queue.add(next);\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return sb.length() == indegree.size() ? sb.toString() : "";\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Count incoming character edges from word prefix differences, and peel off '
                                      'zero-indegree characters using a queue.',
                              'is_optimal': True,
                              'name': "Kahn's breadth-first search algorithm",
                              'space_complexity': 'O(1)',
                              'space_why': 'The alphabet size is fixed at 26 characters, so the graph and indegree '
                                           'maps take `O(1)` memory.',
                              'steps': [   'Collect all unique characters and set their initial indegrees to zero.',
                                           'Compare each adjacent pair of words, adding an edge and incrementing '
                                           'indegree on the first differing character.',
                                           'If a prefix error occurs where a longer word precedes its own prefix, '
                                           'return an empty string.',
                                           'Enqueue all characters with indegree zero, appending each to the output '
                                           'and unlocking dependent characters.'],
                              'time_complexity': 'O(C)',
                              'time_why': "We scan adjacent words taking `O(C)` time, and Kahn's algorithm processes "
                                          'at most 26 characters.',
                              'when_to_use': 'Best standard way to derive character order with clear prefix validation '
                                             'and cycle checks.'}],
        'edge_cases': [   {   'expected': '"zx"',
                              'input': 'words = ["z","x"]',
                              'why': 'Two single-character words define a direct ordering.'},
                          {   'expected': '""',
                              'input': 'words = ["z","x","z"]',
                              'why': 'A cycle z -> x -> z is invalid.'},
                          {   'expected': '""',
                              'input': 'words = ["abc","ab"]',
                              'why': 'A longer word preceding its own prefix is invalid lexicographical ordering.'},
                          {   'expected': '"z"',
                              'input': 'words = ["z"]',
                              'why': 'A single word contains only one character with no constraints.'}],
        'follow_ups': [   {   'answer': "Any valid topological order is acceptable; Kahn's algorithm outputs one valid "
                                        'sequence.',
                              'question': 'What if multiple valid alien character orders exist?'},
                          {   'answer': 'If the queue ever contains more than one character at the same time, the '
                                        'ordering is not unique.',
                              'question': 'How do you detect if the dictionary order is ambiguous?'},
                          {   'answer': 'Store graph edges and indegrees using hash maps, making space scale with '
                                        'unique characters rather than 26.',
                              'question': 'What if the alphabet contains thousands of Unicode characters?'}],
        'interview_script': [   'I need to reconstruct the character order of an alien dictionary from sorted words.',
                                'My first idea is building a graph and running depth-first search with cycle states, '
                                'taking O(C) time and O(U + min(U^2, C)) space.',
                                'A key point is that only the first differing character between adjacent words gives '
                                'relative order.',
                                "I would use Kahn's breadth-first search algorithm, keeping extra space bounded to "
                                'O(1) for twenty-six letters and taking O(C) time.',
                                'I would test this on single words, prefix violations, and circular dependencies.'],
        'mistakes': [   {   'name': 'Missing prefix validation',
                            'right': 'Check if a longer word starts with the subsequent shorter word; if so, return an '
                                     'empty string immediately.',
                            'wrong': 'Accepting input where a longer word appears before its own prefix violates '
                                     'lexicographical order.'},
                        {   'name': 'Multiple edges incrementing indegree twice',
                            'right': 'Use a hash set for neighbor edges and only increment indegree when the edge is '
                                     'newly added.',
                            'wrong': 'Incrementing indegree every time a character pair appears adds duplicate '
                                     'counts.'},
                        {   'name': 'Missing isolated characters',
                            'right': 'Add all unique characters from the word list into the indegree map up front.',
                            'wrong': 'Only tracking characters involved in differences misses characters that have no '
                                     'edges.'}],
        'pattern': 'Topological sort',
        'related_slugs': ['lc-207', 'lc-210', 'lc-133'],
        'slugs': ['lc-269', 'alien-dictionary'],
        'summary': 'Find the first differing character between adjacent words to build directed edges. Order the '
                   'characters using topological sort.',
        'trigger': 'Derive the order of characters in an alien language from a sorted list of words.',
        'walkthrough': {   'columns': ['Word Pair', 'First Difference', 'Added Edge', 'Indegrees'],
                           'input': 'words = ["wrt","wrf","er","ett","rftt"]',
                           'result': 'Zero-indegree character \'w\' starts the chain, producing valid order "wertf".',
                           'rows': [   ['wrt vs wrf', 't != f', 't -> f', 't:0, f:1'],
                                       ['wrf vs er', 'w != e', 'w -> e', 'w:0, e:1'],
                                       ['er vs ett', 'r != t', 'r -> t', 'r:0, t:1'],
                                       ['ett vs rftt', 'e != r', 'e -> r', 'e:1, r:1']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int[][] wallsAndGates(int[][] rooms) {\n'
                                      '        if (rooms == null || rooms.length == 0) return rooms;\n'
                                      '        int m = rooms.length, n = rooms[0].length;\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      '                if (rooms[r][c] == 0) {\n'
                                      '                    Queue<int[]> queue = new ArrayDeque<>();\n'
                                      '                    queue.add(new int[]{r, c, 0});\n'
                                      '                    boolean[][] visited = new boolean[m][n];\n'
                                      '                    visited[r][c] = true;\n'
                                      '\n'
                                      '                    while (!queue.isEmpty()) {\n'
                                      '                        int[] curr = queue.poll();\n'
                                      '                        int cr = curr[0], cc = curr[1], dist = curr[2];\n'
                                      '\n'
                                      '                        for (int[] d : dirs) {\n'
                                      '                            int nr = cr + d[0], nc = cc + d[1];\n'
                                      '                            if (nr >= 0 && nr < m && nc >= 0 && nc < n && '
                                      'rooms[nr][nc] > 0 && !visited[nr][nc]) {\n'
                                      '                                visited[nr][nc] = true;\n'
                                      '                                if (dist + 1 < rooms[nr][nc]) {\n'
                                      '                                    rooms[nr][nc] = dist + 1;\n'
                                      '                                }\n'
                                      '                                queue.add(new int[]{nr, nc, dist + 1});\n'
                                      '                            }\n'
                                      '                        }\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return rooms;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Run an independent breadth-first search starting from each gate, updating room '
                                      'distances when a shorter path is found.',
                              'is_optimal': False,
                              'name': 'Breadth-first search from each gate separately',
                              'space_complexity': 'O(m * n)',
                              'space_why': 'The queue and visited matrix hold up to `m * n` rooms for each search.',
                              'steps': [   'Locate all gates across the entire grid.',
                                           'For each gate, initialize a queue and run breadth-first search across '
                                           'empty rooms.',
                                           'Update a room with the shorter distance if this gate reaches it faster.',
                                           'Return the grid after completing searches from all gates.'],
                              'time_complexity': 'O(g * m * n)',
                              'time_why': 'We may explore the entire grid of size `m * n` from each of the `g` gates.',
                              'when_to_use': 'Only sensible if there is a single gate in the grid.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int[][] wallsAndGates(int[][] rooms) {\n'
                                      '        if (rooms == null || rooms.length == 0) return rooms;\n'
                                      '        int m = rooms.length, n = rooms[0].length;\n'
                                      '        Queue<int[]> queue = new ArrayDeque<>();\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      '                if (rooms[r][c] == 0) {\n'
                                      '                    queue.add(new int[]{r, c});\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int[] curr = queue.poll();\n'
                                      '            int r = curr[0], c = curr[1];\n'
                                      '\n'
                                      '            for (int[] d : dirs) {\n'
                                      '                int nr = r + d[0], nc = c + d[1];\n'
                                      '                if (nr >= 0 && nr < m && nc >= 0 && nc < n && rooms[nr][nc] == '
                                      'Integer.MAX_VALUE) {\n'
                                      '                    rooms[nr][nc] = rooms[r][c] + 1;\n'
                                      '                    queue.add(new int[]{nr, nc});\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return rooms;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Add all gates into a queue simultaneously, expanding outward level by level so '
                                      'each room is reached first by its closest gate.',
                              'is_optimal': True,
                              'name': 'Multi-source breadth-first search',
                              'space_complexity': 'O(m * n)',
                              'space_why': 'The queue can hold at most `m * n` rooms at any time.',
                              'steps': [   'Scan the grid to find all gate positions and put them all into a queue.',
                                           'While the queue is not empty, pop a room and inspect its four adjacent '
                                           'neighbors.',
                                           'If a neighbor is an empty room with default infinity, set its distance to '
                                           'current distance plus one.',
                                           'Return the updated rooms grid once the queue empties.'],
                              'time_complexity': 'O(m * n)',
                              'time_why': 'Each cell is enqueued and written to at most once because all gates expand '
                                          'in lockstep.',
                              'when_to_use': 'Best standard way to find nearest distances from multiple source '
                                             'points.'}],
        'edge_cases': [   {   'expected': '[[0]]',
                              'input': 'rooms = [[0]]',
                              'why': 'A single gate cell requires no changes.'},
                          {   'expected': '[[-1]]',
                              'input': 'rooms = [[-1]]',
                              'why': 'A single wall cell has no empty rooms to fill.'},
                          {   'expected': '[[2147483647]]',
                              'input': 'rooms = [[2147483647]]',
                              'why': 'An empty room with no gates remains unreachable.'},
                          {   'expected': '[[0, 1, 0]]',
                              'input': 'rooms = [[0, 2147483647, 0]]',
                              'why': 'Two gates compete for a shared middle room, both giving distance 1.'}],
        'follow_ups': [   {   'answer': "Use Dijkstra's algorithm with a priority queue seeded with all gates at "
                                        'distance zero.',
                              'question': 'What if edges have different weights instead of uniform step size?'},
                          {   'answer': 'Maintain a priority queue of frontier steps bounded by a sliding window '
                                        'around active rooms.',
                              'question': 'Can this be run on an infinitely expanding grid stream?'},
                          {   'answer': 'Store a parent pointer array pointing each cell back toward the neighbor that '
                                        'updated its distance.',
                              'question': 'How would you return the path to the closest gate for each room?'}],
        'interview_script': [   'I need to fill each empty room with the shortest distance to any gate.',
                                'My obvious first idea is running breadth-first search from each gate separately, '
                                'taking O(g * m * n) time.',
                                'A key point is that expanding from all gates together ensures every room is reached '
                                'by its nearest gate first.',
                                'I would use multi-source breadth-first search, taking O(m * n) time and O(m * n) '
                                'queue space.',
                                'I would test this on an isolated room surrounded by walls, multiple adjacent gates, '
                                'and unreachable rooms.'],
        'mistakes': [   {   'name': 'Searching from empty rooms to gates',
                            'right': 'Push all gates into the queue first and spread outward toward the empty rooms '
                                     'simultaneously.',
                            'wrong': 'Running a search from every empty room repeats redundant path explorations '
                                     'across the grid.'},
                        {   'name': 'Overwriting walls or gates',
                            'right': 'Only step into a neighbor if its current value is strictly Integer.MAX_VALUE.',
                            'wrong': 'Failing to check that a neighbor holds Integer.MAX_VALUE can overwrite walls '
                                     '(-1) or gates (0).'},
                        {   'name': 'Separate visited set',
                            'right': "Setting a room's distance immediately when adding it to the queue marks it as "
                                     'visited.',
                            'wrong': 'Using a separate boolean visited grid wastes memory when the room values '
                                     'themselves indicate visited state.'}],
        'pattern': 'Multi-source BFS',
        'related_slugs': ['lc-994', 'lc-542', 'lc-200'],
        'slugs': ['lc-286', 'walls-and-gates'],
        'summary': 'Add all gates to a queue at once. Spread outward step by step, writing the distance into each '
                   'visited room.',
        'trigger': 'Fill each empty room with the distance to its nearest gate.',
        'walkthrough': {   'columns': ['Dequeued Cell', 'Distance', 'Neighbor Inspected', 'Updated Value'],
                           'input': 'rooms = [[0, INF], [-1, INF]]',
                           'result': 'Grid is filled with nearest gate distances: [[0, 1], [-1, 2]].',
                           'rows': [   ['(0, 0)', '0', '(0, 1)', 'rooms[0][1] = 1'],
                                       ['(0, 0)', '0', '(1, 0)', 'rooms[1][0] is wall (-1); skip'],
                                       ['(0, 1)', '1', '(1, 1)', 'rooms[1][1] = 2']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<List<Integer>> pacificAtlantic(int[][] heights) {\n'
                                      '        List<List<Integer>> result = new ArrayList<>();\n'
                                      '        if (heights == null || heights.length == 0) return result;\n'
                                      '        int m = heights.length, n = heights[0].length;\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      '                boolean[] reaches = new boolean[2];\n'
                                      '                boolean[][] visited = new boolean[m][n];\n'
                                      '                dfsDown(heights, r, c, visited, reaches);\n'
                                      '                if (reaches[0] && reaches[1]) {\n'
                                      '                    result.add(Arrays.asList(r, c));\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void dfsDown(int[][] heights, int r, int c, boolean[][] visited, '
                                      'boolean[] reaches) {\n'
                                      '        if (reaches[0] && reaches[1]) return;\n'
                                      '        visited[r][c] = true;\n'
                                      '        if (r == 0 || c == 0) reaches[0] = true;\n'
                                      '        if (r == heights.length - 1 || c == heights[0].length - 1) reaches[1] = '
                                      'true;\n'
                                      '\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '        for (int[] d : dirs) {\n'
                                      '            int nr = r + d[0], nc = c + d[1];\n'
                                      '            if (nr >= 0 && nr < heights.length && nc >= 0 && nc < '
                                      'heights[0].length) {\n'
                                      '                if (!visited[nr][nc] && heights[nr][nc] <= heights[r][c]) {\n'
                                      '                    dfsDown(heights, nr, nc, visited, reaches);\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'For every cell in the grid, start a downhill path search to verify whether '
                                      'water reaches both ocean borders.',
                              'is_optimal': False,
                              'name': 'Search downhill from each cell',
                              'space_complexity': 'O(m * n)',
                              'space_why': 'The visited matrix and recursive call stack allocate `O(m * n)` space.',
                              'steps': [   'Walk across every cell in the grid one by one.',
                                           'From the current cell, explore downhill paths to see if water reaches the '
                                           'Pacific border.',
                                           'Explore downhill paths again to check if water reaches the Atlantic '
                                           'border.',
                                           'If both oceans are reached, add the coordinates to the answer list.'],
                              'time_complexity': 'O((m * n)^2)',
                              'time_why': 'We may search all `m * n` cells from each of the `m * n` grid locations.',
                              'when_to_use': 'Only if testing a single specific cell for ocean reachability.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public List<List<Integer>> pacificAtlantic(int[][] heights) {\n'
                                      '        List<List<Integer>> result = new ArrayList<>();\n'
                                      '        if (heights == null || heights.length == 0) return result;\n'
                                      '        int m = heights.length, n = heights[0].length;\n'
                                      '\n'
                                      '        boolean[][] pacific = new boolean[m][n];\n'
                                      '        boolean[][] atlantic = new boolean[m][n];\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            dfs(heights, r, 0, pacific, heights[r][0]);\n'
                                      '            dfs(heights, r, n - 1, atlantic, heights[r][n - 1]);\n'
                                      '        }\n'
                                      '        for (int c = 0; c < n; c++) {\n'
                                      '            dfs(heights, 0, c, pacific, heights[0][c]);\n'
                                      '            dfs(heights, m - 1, c, atlantic, heights[m - 1][c]);\n'
                                      '        }\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      '                if (pacific[r][c] && atlantic[r][c]) {\n'
                                      '                    result.add(Arrays.asList(r, c));\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return result;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void dfs(int[][] heights, int r, int c, boolean[][] ocean, int '
                                      'prevHeight) {\n'
                                      '        if (r < 0 || r >= heights.length || c < 0 || c >= heights[0].length) '
                                      'return;\n'
                                      '        if (ocean[r][c] || heights[r][c] < prevHeight) return;\n'
                                      '\n'
                                      '        ocean[r][c] = true;\n'
                                      '        dfs(heights, r - 1, c, ocean, heights[r][c]);\n'
                                      '        dfs(heights, r + 1, c, ocean, heights[r][c]);\n'
                                      '        dfs(heights, r, c - 1, ocean, heights[r][c]);\n'
                                      '        dfs(heights, r, c + 1, ocean, heights[r][c]);\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Climb uphill starting from the ocean edges, tracking reachable cells in two '
                                      'boolean grids and taking their intersection.',
                              'is_optimal': True,
                              'name': 'Reverse flow from ocean borders',
                              'space_complexity': 'O(m * n)',
                              'space_why': 'Two boolean grids store the reachability flags for all `m * n` cells.',
                              'steps': [   'Create two boolean matrices to record cells reachable from the Pacific and '
                                           'Atlantic oceans.',
                                           'Enqueue all Pacific border cells into one search and Atlantic border cells '
                                           'into another search.',
                                           'Flow uphill into neighboring cells that have equal or greater height.',
                                           'Collect all coordinates that are marked true in both reachability grids.'],
                              'time_complexity': 'O(m * n)',
                              'time_why': 'Each cell is visited at most twice, once for the Pacific and once for the '
                                          'Atlantic.',
                              'when_to_use': 'Best standard way to find cells that can reach multiple boundary '
                                             'targets.'}],
        'edge_cases': [   {   'expected': '[[0,0]]',
                              'input': 'heights = [[1]]',
                              'why': 'A single cell touches both oceans simultaneously.'},
                          {   'expected': '[[0,0],[0,1],[1,0],[1,1]]',
                              'input': 'heights = [[1,1],[1,1]]',
                              'why': 'A flat terrain allows water to flow in all directions to both oceans.'},
                          {   'expected': '[[0,0],[0,1],[1,0],[1,1]]',
                              'input': 'heights = [[10,1],[1,10]]',
                              'why': 'All four cells touch at least one border and the diagonal peaks flow outward.'},
                          {   'expected': '[[0,0],[0,1],[0,2]]',
                              'input': 'heights = [[1,2,3]]',
                              'why': 'A single row touches both oceans along its top and bottom borders.'}],
        'follow_ups': [   {   'answer': 'Change the condition to strictly greater height when moving uphill from '
                                        'borders.',
                              'question': 'What if water can only flow strictly downhill with no equal heights '
                                          'allowed?'},
                          {   'answer': 'Maintain a separate boolean matrix for each water body and take the '
                                        'intersection of all matrices.',
                              'question': 'How would you find cells that flow into three or more different water '
                                          'bodies?'},
                          {   'answer': 'Use external memory graph processing or split the grid into blocks linked at '
                                        'shared boundaries.',
                              'question': 'What if the grid contains millions of cells that cannot fit in memory at '
                                          'once?'}],
        'interview_script': [   'I need to find all coordinates where water can flow to both the Pacific and Atlantic '
                                'oceans.',
                                'My obvious first idea is searching downhill from every cell, taking O((m * n)^2) '
                                'time.',
                                'A key point is that reversing the problem by flowing uphill from ocean borders avoids '
                                'duplicate searches.',
                                'I would search uphill from Pacific and Atlantic borders separately, taking O(m * n) '
                                'time and O(m * n) space.',
                                'I would test this on a flat grid, a single cell, and a peak in the center.'],
        'mistakes': [   {   'name': 'Searching downhill from all cells',
                            'right': 'Start at the ocean borders and walk uphill, marking reachable cells in two '
                                     'boolean grids.',
                            'wrong': 'Starting a downhill search from each cell individually leads to repeated visits '
                                     'and quadratic time.'},
                        {   'name': 'Inverting the slope condition',
                            'right': 'When flowing backward from the ocean, only step to neighbor cells with equal or '
                                     'greater height.',
                            'wrong': 'Checking that the neighbor is lower during reverse search looks for downward '
                                     'flow instead of uphill climbing.'},
                        {   'name': 'Single shared visited array',
                            'right': 'Maintain two completely independent boolean grids, one for Pacific and one for '
                                     'Atlantic.',
                            'wrong': 'Using one visited array for both oceans causes Pacific visited marks to block '
                                     'Atlantic searches.'}],
        'pattern': 'Multi-source BFS',
        'related_slugs': ['lc-200', 'lc-286', 'lc-542'],
        'slugs': ['lc-417', 'pacific-atlantic-water-flow'],
        'summary': 'Start from the ocean edges and move uphill into the island. The cells reached by both oceans form '
                   'the answer.',
        'trigger': 'Find all grid coordinates where water can flow to both the Pacific and Atlantic ocean.',
        'walkthrough': {   'columns': ['Cell', 'Height', 'Pacific Reach', 'Atlantic Reach', 'Both'],
                           'input': 'heights = [[1, 2], [2, 1]]',
                           'result': 'Cells (0, 1) and (1, 0) reach both oceans, returning [[0, 1], [1, 0]].',
                           'rows': [   ['(0, 0)', '1', 'True (Border)', 'False (trapped by 2s)', 'False'],
                                       ['(0, 1)', '2', 'True (Border)', 'True (Border)', 'True'],
                                       ['(1, 0)', '2', 'True (Border)', 'True (Border)', 'True'],
                                       ['(1, 1)', '1', 'False (trapped by 2s)', 'True (Border)', 'False']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int[][] updateMatrix(int[][] mat) {\n'
                                      '        int m = mat.length, n = mat[0].length;\n'
                                      '        int[][] dist = new int[m][n];\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      '                if (mat[r][c] == 1) {\n'
                                      '                    Queue<int[]> queue = new ArrayDeque<>();\n'
                                      '                    boolean[][] visited = new boolean[m][n];\n'
                                      '                    queue.add(new int[]{r, c, 0});\n'
                                      '                    visited[r][c] = true;\n'
                                      '                    boolean found = false;\n'
                                      '\n'
                                      '                    while (!queue.isEmpty() && !found) {\n'
                                      '                        int[] curr = queue.poll();\n'
                                      '                        int cr = curr[0], cc = curr[1], d = curr[2];\n'
                                      '\n'
                                      '                        for (int[] dir : dirs) {\n'
                                      '                            int nr = cr + dir[0], nc = cc + dir[1];\n'
                                      '                            if (nr >= 0 && nr < m && nc >= 0 && nc < n && '
                                      '!visited[nr][nc]) {\n'
                                      '                                visited[nr][nc] = true;\n'
                                      '                                if (mat[nr][nc] == 0) {\n'
                                      '                                    dist[r][c] = d + 1;\n'
                                      '                                    found = true;\n'
                                      '                                    break;\n'
                                      '                                }\n'
                                      '                                queue.add(new int[]{nr, nc, d + 1});\n'
                                      '                            }\n'
                                      '                        }\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '        return dist;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'For every cell with value 1, run a breadth-first search to find the shortest '
                                      'path to any 0 cell.',
                              'is_optimal': False,
                              'name': 'Search from each one cell separately',
                              'space_complexity': 'O(m * n)',
                              'space_why': 'The queue and visited matrix use `O(m * n)` space during each search.',
                              'steps': [   'Scan the matrix to identify cells containing value 1.',
                                           'For each 1 cell, start a breadth-first search through the grid.',
                                           'Stop the search as soon as the first 0 cell is reached and record the step '
                                           'count.',
                                           'Repeat the search independently for all 1 cells.'],
                              'time_complexity': 'O((m * n)^2)',
                              'time_why': 'We may explore up to `m * n` cells for each of the `m * n` cells with value '
                                          '1.',
                              'when_to_use': 'Only sensible if there is a single cell of value 1.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int[][] updateMatrix(int[][] mat) {\n'
                                      '        int m = mat.length, n = mat[0].length;\n'
                                      '        int[][] dist = new int[m][n];\n'
                                      '        Queue<int[]> queue = new ArrayDeque<>();\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      '                if (mat[r][c] == 0) {\n'
                                      '                    dist[r][c] = 0;\n'
                                      '                    queue.add(new int[]{r, c});\n'
                                      '                } else {\n'
                                      '                    dist[r][c] = -1;\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int[] curr = queue.poll();\n'
                                      '            int r = curr[0], c = curr[1];\n'
                                      '\n'
                                      '            for (int[] d : dirs) {\n'
                                      '                int nr = r + d[0], nc = c + d[1];\n'
                                      '                if (nr >= 0 && nr < m && nc >= 0 && nc < n && dist[nr][nc] == '
                                      '-1) {\n'
                                      '                    dist[nr][nc] = dist[r][c] + 1;\n'
                                      '                    queue.add(new int[]{nr, nc});\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return dist;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Enqueue all 0 cells as sources at distance 0, spreading outward level by level '
                                      'to compute shortest distances to all 1 cells.',
                              'is_optimal': True,
                              'name': 'Multi-source breadth-first search',
                              'space_complexity': 'O(m * n)',
                              'space_why': 'The queue holds up to `m * n` cells and the distance grid takes `O(m * n)` '
                                           'memory.',
                              'steps': [   'Create a distance grid initialized to -1 for 1 cells and 0 for 0 cells.',
                                           'Enqueue all coordinates of 0 cells into a queue.',
                                           'Pop each cell, look at its four neighbors, and update unvisited neighbors '
                                           'with distance plus one.',
                                           'Enqueue each newly updated neighbor to propagate distances outward.'],
                              'time_complexity': 'O(m * n)',
                              'time_why': 'Each cell is enqueued and dequeued at most once.',
                              'when_to_use': 'Best standard way to compute distances from multiple sources in '
                                             'unweighted grids.'}],
        'edge_cases': [   {   'expected': '[[0]]',
                              'input': 'mat = [[0]]',
                              'why': 'A single zero cell has zero distance to itself.'},
                          {   'expected': '[[0,1],[1,2]]',
                              'input': 'mat = [[0,1],[1,1]]',
                              'why': 'Corner cell (1,1) requires two steps to reach the only zero at (0,0).'},
                          {   'expected': '[[0,0],[0,0]]',
                              'input': 'mat = [[0,0],[0,0]]',
                              'why': 'All cells are already zero.'},
                          {   'expected': '[[0,1,2,1,0]]',
                              'input': 'mat = [[0,1,1,1,0]]',
                              'why': 'Distances peak in the middle between two competing zeros.'}],
        'follow_ups': [   {   'answer': 'Yes, use a two-pass approach: top-left to bottom-right, then bottom-right to '
                                        'top-left.',
                              'question': 'Can this be solved using dynamic programming instead of a queue?'},
                          {   'answer': 'Include all eight diagonal directions in the offset array during queue '
                                        'expansion.',
                              'question': 'How would you handle diagonal movement?'},
                          {   'answer': 'Mark obstacle cells as visited and never add them to the queue or step '
                                        'through them.',
                              'question': 'What if the grid contains obstacles that cannot be entered?'}],
        'interview_script': [   'I need to compute the shortest distance to the nearest zero for each cell in a binary '
                                'matrix.',
                                'My obvious first idea is searching from each one cell toward any zero, taking O((m * '
                                'n)^2) time.',
                                'A key point is that all zeros can act as simultaneous starting points in a '
                                'multi-source breadth-first search.',
                                'I would push all zero cells into a queue and spread outward, taking O(m * n) time and '
                                'O(m * n) space.',
                                'I would test this on all-zero grids, single-zero grids, and long corridors.'],
        'mistakes': [   {   'name': 'Starting search from ones instead of zeros',
                            'right': 'Enqueue all 0 cells at the start and spread outward to all 1 cells '
                                     'simultaneously.',
                            'wrong': 'Running breadth-first search from each 1 cell leads to quadratic runtime across '
                                     'the matrix.'},
                        {   'name': 'Missing unvisited marker check',
                            'right': 'Initialize 1 cells with a distinct marker like -1 and only step into cells that '
                                     'still hold -1.',
                            'wrong': 'Adding already visited cells back to the queue causes infinite loops and wrong '
                                     'distances.'},
                        {   'name': 'Mutating input matrix directly without marker',
                            'right': 'Use a separate distance grid or distinguish unvisited cells before beginning the '
                                     'search.',
                            'wrong': 'Overwriting 1s with calculated distances can make distance 1 look like an '
                                     'original 1 cell.'}],
        'pattern': 'Multi-source BFS',
        'related_slugs': ['lc-286', 'lc-994', 'lc-417'],
        'slugs': ['lc-542', '01-matrix'],
        'summary': 'Put all zero cells into a queue with distance zero. Expand outward to update neighbor distances '
                   'level by level.',
        'trigger': 'Find the distance of the nearest 0 for each cell in a binary matrix.',
        'walkthrough': {   'columns': ['Round', 'Dequeued Cell', 'Neighbor Updated', 'Neighbor Distance'],
                           'input': 'mat = [[0,0,0],[0,1,0],[1,1,1]]',
                           'result': 'Every cell receives distance to nearest zero, returning '
                                     '[[0,0,0],[0,1,0],[1,2,1]].',
                           'rows': [   [   'Init',
                                           'All 0s queued',
                                           'dist initialized with 0 for zeros, -1 for ones',
                                           'Queue has five 0s'],
                                       ['Level 1', '(0, 1) and others', '(1, 1) updated', 'dist[1][1] = 1'],
                                       ['Level 1', '(1, 0)', '(2, 0) updated', 'dist[2][0] = 1'],
                                       ['Level 1', '(1, 2)', '(2, 2) updated', 'dist[2][2] = 1'],
                                       ['Level 2', '(1, 1)', '(2, 1) updated', 'dist[2][1] = 2']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int findCircleNum(int[][] isConnected) {\n'
                                      '        int n = isConnected.length;\n'
                                      '        List<List<Integer>> adj = new ArrayList<>();\n'
                                      '        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());\n'
                                      '\n'
                                      '        for (int i = 0; i < n; i++) {\n'
                                      '            for (int j = 0; j < n; j++) {\n'
                                      '                if (isConnected[i][j] == 1 && i != j) {\n'
                                      '                    adj.get(i).add(j);\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        boolean[] visited = new boolean[n];\n'
                                      '        int provinces = 0;\n'
                                      '\n'
                                      '        for (int i = 0; i < n; i++) {\n'
                                      '            if (!visited[i]) {\n'
                                      '                provinces++;\n'
                                      '                Queue<Integer> queue = new ArrayDeque<>();\n'
                                      '                queue.add(i);\n'
                                      '                visited[i] = true;\n'
                                      '\n'
                                      '                while (!queue.isEmpty()) {\n'
                                      '                    int curr = queue.poll();\n'
                                      '                    for (int neighbor : adj.get(curr)) {\n'
                                      '                        if (!visited[neighbor]) {\n'
                                      '                            visited[neighbor] = true;\n'
                                      '                            queue.add(neighbor);\n'
                                      '                        }\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return provinces;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Convert the connectivity matrix into an explicit list of neighbors for each '
                                      'city, then search each unvisited group.',
                              'is_optimal': False,
                              'name': 'Build adjacency lists then search',
                              'space_complexity': 'O(n^2)',
                              'space_why': 'The explicit adjacency list can store up to `n^2` directed edge '
                                           'connections.',
                              'steps': [   'Build an adjacency list for each of the `n` cities.',
                                           'Set up a boolean visited array of size `n`.',
                                           'For each unvisited city, increment the province counter and explore its '
                                           'neighbor list.',
                                           'Mark all reachable cities as visited until the entire component is seen.'],
                              'time_complexity': 'O(n^2)',
                              'time_why': 'We inspect all `n * n` entries in the matrix and then visit every city and '
                                          'edge once.',
                              'when_to_use': 'Useful if subsequent operations need fast neighbor queries on the '
                                             'graph.'},
                          {   'code': 'class Solution {\n'
                                      '    public int findCircleNum(int[][] isConnected) {\n'
                                      '        int n = isConnected.length;\n'
                                      '        boolean[] visited = new boolean[n];\n'
                                      '        int provinces = 0;\n'
                                      '\n'
                                      '        for (int i = 0; i < n; i++) {\n'
                                      '            if (!visited[i]) {\n'
                                      '                provinces++;\n'
                                      '                dfs(isConnected, i, visited);\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return provinces;\n'
                                      '    }\n'
                                      '\n'
                                      '    private void dfs(int[][] isConnected, int city, boolean[] visited) {\n'
                                      '        visited[city] = true;\n'
                                      '        for (int other = 0; other < isConnected.length; other++) {\n'
                                      '            if (isConnected[city][other] == 1 && !visited[other]) {\n'
                                      '                dfs(isConnected, other, visited);\n'
                                      '            }\n'
                                      '        }\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Search directly through the adjacency matrix without constructing explicit '
                                      'neighbor lists, marking cities in a visited array.',
                              'is_optimal': True,
                              'name': 'Direct matrix search',
                              'space_complexity': 'O(n)',
                              'space_why': 'The visited array and call stack take `O(n)` memory without building extra '
                                           'lists.',
                              'steps': [   'Create a boolean visited array of length `n` to track visited cities.',
                                           'Scan each city from `0` to `n - 1`.',
                                           'When an unvisited city is spotted, increment the province counter.',
                                           'Use depth-first search along row `i` to recursively mark all connected '
                                           'cities.'],
                              'time_complexity': 'O(n^2)',
                              'time_why': 'We check all `n` cells in the row for each of the `n` cities.',
                              'when_to_use': 'Best standard way to count connected components given an adjacency '
                                             'matrix.'}],
        'edge_cases': [   {'expected': '1', 'input': 'isConnected = [[1]]', 'why': 'A single city forms one province.'},
                          {   'expected': '2',
                              'input': 'isConnected = [[1,0],[0,1]]',
                              'why': 'Two completely disconnected cities form two provinces.'},
                          {   'expected': '1',
                              'input': 'isConnected = [[1,1],[1,1]]',
                              'why': 'Two connected cities form one single province.'},
                          {   'expected': '3',
                              'input': 'isConnected = [[1,0,0],[0,1,0],[0,0,1]]',
                              'why': 'Three isolated cities form three separate provinces.'}],
        'follow_ups': [   {   'answer': 'Yes, initialize `n` components and union city `i` and city `j` for every '
                                        'edge, returning remaining components.',
                              'question': 'Can this be solved using a disjoint set union find structure?'},
                          {   'answer': 'Disjoint set union is ideal for online edge streams because it processes each '
                                        'edge in nearly constant time.',
                              'question': 'What if edges arrive as an online stream of city pairs?'},
                          {   'answer': 'Group cities by their connected component root during the search and collect '
                                        'them into lists.',
                              'question': 'How would you return the list of cities in each province?'}],
        'interview_script': [   'I need to find the total number of connected components of cities in an adjacency '
                                'matrix.',
                                'My obvious first idea is building an explicit adjacency list and running search, '
                                'taking O(n^2) time and O(n^2) space.',
                                'A key point is that we can search directly over the matrix rows without allocating '
                                'neighbor lists.',
                                'I would search directly using a boolean visited array, taking O(n^2) time and only '
                                'O(n) extra space.',
                                'I would test this on all-connected cities, completely isolated cities, and transitive '
                                'chains.'],
        'mistakes': [   {   'name': 'Counting every connection as a province',
                            'right': 'Increment the province count only when a new unvisited city is spotted in the '
                                     'outer loop.',
                            'wrong': 'Adding to the count for every 1 entry in the matrix counts edges instead of '
                                     'components.'},
                        {   'name': 'Missing indirect connections',
                            'right': 'Use depth-first or breadth-first search to visit all transitively connected '
                                     'cities.',
                            'wrong': 'Only checking direct neighbors misses transitive connections like city 0 '
                                     'connected to 2 through 1.'},
                        {   'name': 'Forgetting self connections',
                            'right': 'Mark the city visited before looping through its connections to skip self-loops '
                                     'cleanly.',
                            'wrong': 'Checking diagonal entries without visited flags can cause self-loop recursion '
                                     'errors.'}],
        'pattern': 'Graph search',
        'related_slugs': ['lc-200', 'lc-133', 'lc-207'],
        'slugs': ['lc-547', 'number-of-provinces'],
        'summary': 'Go through all cities. When finding an unvisited city, increment the count and visit all cities in '
                   'its connected component.',
        'trigger': 'Find the total number of connected groups of cities from an adjacency matrix.',
        'walkthrough': {   'columns': ['City', 'Visited Before', 'Action', 'Provinces'],
                           'input': 'isConnected = [[1,1,0],[1,1,0],[0,0,1]]',
                           'result': 'Cities split into 2 provinces: {0, 1} and {2}, returning 2.',
                           'rows': [   ['0', 'False', 'New province! Start search, mark 0 and 1 as visited', '1'],
                                       ['1', 'True', 'Already visited in province 1; skip', '1'],
                                       ['2', 'False', 'New province! Start search, mark 2 as visited', '2']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int networkDelayTime(int[][] times, int n, int k) {\n'
                                      '        int[] dist = new int[n + 1];\n'
                                      '        Arrays.fill(dist, Integer.MAX_VALUE);\n'
                                      '        dist[k] = 0;\n'
                                      '\n'
                                      '        for (int i = 1; i < n; i++) {\n'
                                      '            for (int[] edge : times) {\n'
                                      '                int u = edge[0], v = edge[1], w = edge[2];\n'
                                      '                if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {\n'
                                      '                    dist[v] = dist[u] + w;\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        int maxTime = 0;\n'
                                      '        for (int i = 1; i <= n; i++) {\n'
                                      '            if (dist[i] == Integer.MAX_VALUE) return -1;\n'
                                      '            maxTime = Math.max(maxTime, dist[i]);\n'
                                      '        }\n'
                                      '        return maxTime;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Relax all edge distances `V - 1` times from the start node, then find the '
                                      'maximum distance among all nodes.',
                              'is_optimal': False,
                              'name': 'Bellman-Ford edge relaxation',
                              'space_complexity': 'O(V)',
                              'space_why': 'The distance array holds distances for `V` nodes.',
                              'steps': [   'Initialize an array of distances with infinity, setting the starting node '
                                           'distance to zero.',
                                           'Relax every directed edge in the times list `n - 1` times.',
                                           'If a distance can be shortened through an edge, update the destination '
                                           'distance.',
                                           'Return the maximum distance across all nodes, or -1 if any node remains '
                                           'unreachable.'],
                              'time_complexity': 'O(V * E)',
                              'time_why': 'We relax all `E` edges `V - 1` times in sequence.',
                              'when_to_use': 'Useful when negative edge weights are present or when graph structure is '
                                             'not stored as an adjacency list.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int networkDelayTime(int[][] times, int n, int k) {\n'
                                      '        Map<Integer, List<int[]>> adj = new HashMap<>();\n'
                                      '        for (int[] edge : times) {\n'
                                      '            adj.computeIfAbsent(edge[0], x -> new ArrayList<>()).add(new '
                                      'int[]{edge[1], edge[2]});\n'
                                      '        }\n'
                                      '\n'
                                      '        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a '
                                      '-> a[1]));\n'
                                      '        Map<Integer, Integer> dist = new HashMap<>();\n'
                                      '\n'
                                      '        pq.add(new int[]{k, 0});\n'
                                      '\n'
                                      '        while (!pq.isEmpty()) {\n'
                                      '            int[] curr = pq.poll();\n'
                                      '            int u = curr[0], d = curr[1];\n'
                                      '\n'
                                      '            if (dist.containsKey(u)) continue;\n'
                                      '            dist.put(u, d);\n'
                                      '\n'
                                      '            if (adj.containsKey(u)) {\n'
                                      '                for (int[] edge : adj.get(u)) {\n'
                                      '                    int v = edge[0], weight = edge[1];\n'
                                      '                    if (!dist.containsKey(v)) {\n'
                                      '                        pq.add(new int[]{v, d + weight});\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        if (dist.size() != n) return -1;\n'
                                      '\n'
                                      '        int maxTime = 0;\n'
                                      '        for (int time : dist.values()) {\n'
                                      '            maxTime = Math.max(maxTime, time);\n'
                                      '        }\n'
                                      '        return maxTime;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Use a min-heap to greedily expand the closest unvisited node, relaxing adjacent '
                                      'edges until all reachable nodes are settled.',
                              'is_optimal': True,
                              'name': 'Dijkstra with priority queue',
                              'space_complexity': 'O(V + E)',
                              'space_why': 'The adjacency list stores `E` edges and the priority queue stores up to '
                                           '`V` entries.',
                              'steps': [   'Build an adjacency list from the directed edges with weights.',
                                           'Initialize a min-heap with the start node at distance zero.',
                                           'Pop the node with the smallest distance; if already settled at a shorter '
                                           'distance, skip it.',
                                           'Relax all outgoing edges and push updated neighbor distances to the '
                                           'min-heap.'],
                              'time_complexity': 'O(E * log V)',
                              'time_why': 'Each edge is inserted into the min-heap at most once, with heap operations '
                                          'taking `O(log V)`.',
                              'when_to_use': 'Best standard way to find single-source shortest paths on non-negative '
                                             'weighted graphs.'}],
        'edge_cases': [   {   'expected': '1',
                              'input': 'times = [[1,2,1]], n = 2, k = 1',
                              'why': 'A direct edge between two nodes takes exactly the edge weight.'},
                          {   'expected': '-1',
                              'input': 'times = [[1,2,1]], n = 2, k = 2',
                              'why': 'Starting at node 2 cannot reach node 1 since the edge is directed.'},
                          {   'expected': '3',
                              'input': 'times = [[1,2,1],[2,3,2],[1,3,4]], n = 3, k = 1',
                              'why': 'Path 1->2->3 of cost 3 is chosen over direct edge 1->3 of cost 4.'},
                          {   'expected': '1',
                              'input': 'times = [[1,2,1],[2,1,1]], n = 2, k = 1',
                              'why': 'A cycle between two nodes does not disrupt shortest path computation.'}],
        'follow_ups': [   {   'answer': 'Dijkstra fails on negative edges; use the Bellman-Ford algorithm to handle '
                                        'negative weights correctly.',
                              'question': 'What if edges have negative weights?'},
                          {   'answer': 'Keep a parent array that updates whenever a neighbor distance is relaxed.',
                              'question': 'How would you reconstruct the actual path taken to the slowest node?'},
                          {   'answer': 'An array-based Dijkstra running in `O(V^2)` time without a heap is faster for '
                                        'dense graphs.',
                              'question': 'What if the graph is dense with `E` close to `V^2`?'}],
        'interview_script': [   'I need to find how long it takes for a signal to reach all nodes from node k.',
                                'My obvious first idea is Bellman-Ford edge relaxation, which takes O(V * E) time.',
                                "A key point is that edge weights are non-negative, which makes Dijkstra's algorithm "
                                'with a min-heap optimal.',
                                "I would use Dijkstra's algorithm with a priority queue, taking O(E * log V) time and "
                                'O(V + E) space.',
                                'I would test this on disconnected graphs, cyclic graphs, and single-node graphs.'],
        'mistakes': [   {   'name': 'Forgetting stale entries in priority queue',
                            'right': 'Skip the node if it already exists in the settled distance map.',
                            'wrong': 'Processing a node popped from the priority queue without checking if it was '
                                     'already settled wastes time.'},
                        {   'name': 'One-based versus zero-based node indexing',
                            'right': 'Allocate arrays of size `n + 1` to accommodate 1-indexed node numbers.',
                            'wrong': 'Using an array of size `n` instead of `n + 1` causes out-of-bounds errors on '
                                     '1-indexed nodes.'},
                        {   'name': 'Returning sum instead of maximum',
                            'right': 'Return the maximum shortest distance across all nodes because the signal travels '
                                     'in parallel.',
                            'wrong': 'Summing all shortest paths assumes signals travel sequentially instead of '
                                     'concurrently.'}],
        'pattern': 'Shortest path',
        'related_slugs': ['lc-787', 'lc-207', 'lc-210'],
        'slugs': ['lc-743', 'network-delay-time'],
        'summary': 'Find the shortest travel times to all nodes from the start node using a min-heap. Return the '
                   'maximum travel time.',
        'trigger': 'Return the minimum time for all nodes to receive a signal from a starting node.',
        'walkthrough': {   'columns': ['Settled Node', 'Travel Time', 'Relaxed Edges', 'Settled Distances'],
                           'input': 'times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2',
                           'result': 'All 4 nodes receive the signal; maximum time is 2, returning 2.',
                           'rows': [   ['2', '0', '2->1 (cost 1), 2->3 (cost 1)', '{2: 0}'],
                                       ['1', '1', 'No outgoing edges', '{2: 0, 1: 1}'],
                                       ['3', '1', '3->4 (cost 2)', '{2: 0, 1: 1, 3: 1}'],
                                       ['4', '2', 'No outgoing edges', '{2: 0, 1: 1, 3: 1, 4: 2}']]}},
    {   'approaches': [   {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int '
                                      'k) {\n'
                                      '        List<List<int[]>> adj = new ArrayList<>();\n'
                                      '        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());\n'
                                      '        for (int[] f : flights) {\n'
                                      '            adj.get(f[0]).add(new int[]{f[1], f[2]});\n'
                                      '        }\n'
                                      '\n'
                                      '        Queue<int[]> queue = new ArrayDeque<>();\n'
                                      '        queue.add(new int[]{src, 0, 0});\n'
                                      '        int[] minCost = new int[n];\n'
                                      '        Arrays.fill(minCost, Integer.MAX_VALUE);\n'
                                      '        minCost[src] = 0;\n'
                                      '\n'
                                      '        while (!queue.isEmpty()) {\n'
                                      '            int[] curr = queue.poll();\n'
                                      '            int city = curr[0], cost = curr[1], stops = curr[2];\n'
                                      '\n'
                                      '            if (stops > k) continue;\n'
                                      '\n'
                                      '            for (int[] next : adj.get(city)) {\n'
                                      '                int nextCity = next[0], price = next[1];\n'
                                      '                if (cost + price < minCost[nextCity]) {\n'
                                      '                    minCost[nextCity] = cost + price;\n'
                                      '                    queue.add(new int[]{nextCity, cost + price, stops + 1});\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        return minCost[dst] == Integer.MAX_VALUE ? -1 : minCost[dst];\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Use a queue to track the current city, accumulated cost, and stops taken, '
                                      'visiting states while pruning higher costs.',
                              'is_optimal': False,
                              'name': 'Breadth search tracking stops and price',
                              'space_complexity': 'O(V * k)',
                              'space_why': 'The queue can hold multiple states for each city across the `k + 1` '
                                           'levels.',
                              'steps': [   'Build an adjacency list from flight edges.',
                                           'Place the source city into a queue with cost 0 and stops 0.',
                                           'When popping a city, expand neighbors if current stops do not exceed `k`.',
                                           'Prune states if accumulated cost is greater than a previously recorded '
                                           'distance.'],
                              'time_complexity': 'O(k * E)',
                              'time_why': 'We explore edges level by level up to `k + 1` steps.',
                              'when_to_use': 'Useful when implementing stop-constrained search with explicit level '
                                             'queues.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int '
                                      'k) {\n'
                                      '        int[] prices = new int[n];\n'
                                      '        Arrays.fill(prices, Integer.MAX_VALUE);\n'
                                      '        prices[src] = 0;\n'
                                      '\n'
                                      '        for (int i = 0; i <= k; i++) {\n'
                                      '            int[] temp = Arrays.copyOf(prices, n);\n'
                                      '            for (int[] flight : flights) {\n'
                                      '                int u = flight[0], v = flight[1], w = flight[2];\n'
                                      '                if (prices[u] != Integer.MAX_VALUE && prices[u] + w < temp[v]) '
                                      '{\n'
                                      '                    temp[v] = prices[u] + w;\n'
                                      '                }\n'
                                      '            }\n'
                                      '            prices = temp;\n'
                                      '        }\n'
                                      '\n'
                                      '        return prices[dst] == Integer.MAX_VALUE ? -1 : prices[dst];\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Relax all flight edges `k + 1` times, reading prices from a clone of the '
                                      'previous round to ensure each round adds at most one flight.',
                              'is_optimal': True,
                              'name': 'Bellman-Ford with snapshot array',
                              'space_complexity': 'O(n)',
                              'space_why': 'Two arrays of size `n` store the prices and previous snapshot.',
                              'steps': [   'Initialize a price array with infinity, setting the source city price to '
                                           'zero.',
                                           'For each of the `k + 1` allowed flights, clone the current price array to '
                                           'form a snapshot.',
                                           'Inspect every flight edge, updating prices in the working array using '
                                           'values from the snapshot.',
                                           'After `k + 1` rounds, return the destination price or -1 if unreachable.'],
                              'time_complexity': 'O(k * E)',
                              'time_why': 'We relax all `E` flight edges exactly `k + 1` times.',
                              'when_to_use': 'Best standard way to find shortest paths with a fixed limit on edge '
                                             'count.'}],
        'edge_cases': [   {   'expected': '500',
                              'input': 'n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 0',
                              'why': 'Zero stops means only direct flights are allowed.'},
                          {   'expected': '100',
                              'input': 'n = 2, flights = [[0,1,100]], src = 0, dst = 1, k = 1',
                              'why': 'A direct flight arrives well within the stop allowance.'},
                          {   'expected': '-1',
                              'input': 'n = 3, flights = [[0,1,100]], src = 0, dst = 2, k = 1',
                              'why': 'Destination cannot be reached at all.'},
                          {   'expected': '-1',
                              'input': 'n = 4, flights = [[0,1,1],[1,2,1],[2,3,1]], src = 0, dst = 3, k = 1',
                              'why': 'Reaching destination requires 2 stops, which exceeds limit k = 1.'}],
        'follow_ups': [   {   'answer': 'Yes, maintain an array of minimum stops to reach each city to avoid exploring '
                                        'paths with more stops and higher cost.',
                              'question': 'Can this be solved using modified Dijkstra?'},
                          {   'answer': 'Bellman-Ford handles negative weights naturally as long as there are no '
                                        'negative weight cycles.',
                              'question': 'What if prices can be negative discounts?'},
                          {   'answer': 'Track the predecessor city and flight index in the snapshot array across '
                                        'rounds to reconstruct the path.',
                              'question': 'How would you return the flight itinerary instead of just the cost?'}],
        'interview_script': [   'I need to find the cheapest flight price from source to destination using at most k '
                                'stops.',
                                'My obvious first idea is breadth-first search tracking cost and stops, taking O(k * '
                                'E) time and O(V * k) space.',
                                'A key point is that taking at most k stops corresponds to relaxing all edges at most '
                                'k plus one times.',
                                'I would use Bellman-Ford with a snapshot array, taking O(k * E) time and O(n) space.',
                                'I would test this on zero allowed stops, unreachable destinations, and multi-hop '
                                'paths.'],
        'mistakes': [   {   'name': 'Chaining flights in a single round',
                            'right': 'Clone the prices array into a snapshot before each round and only read from the '
                                     'snapshot.',
                            'wrong': 'Updating the same price array during one round allows two flights to chain '
                                     'together within a single step.'},
                        {   'name': 'Standard Dijkstra priority pruning',
                            'right': 'Track both stops and price, or use Bellman-Ford rounds to enforce stop limits '
                                     'directly.',
                            'wrong': 'Pruning states in Dijkstra by cost alone discards valid paths that cost more but '
                                     'use fewer stops.'},
                        {   'name': 'Confusing stops with flights',
                            'right': 'Run the relaxation loop `k + 1` times because `k` stops allows `k + 1` flights.',
                            'wrong': 'Running `k` rounds instead of `k + 1` rounds allows only `k - 1` stops.'}],
        'pattern': 'Shortest path',
        'related_slugs': ['lc-743', 'lc-133', 'lc-207'],
        'slugs': ['lc-787', 'cheapest-flights-within-k-stops'],
        'summary': 'Relax all flight edges up to k plus one times. Use a copy of prices from the previous round so '
                   'flights do not chain in one step.',
        'trigger': 'Find the cheapest price from src to dst with at most k stops.',
        'walkthrough': {   'columns': ['Flight Round', 'Snapshot Prices', 'Edge Relaxed', 'Updated Prices'],
                           'input': 'n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 1',
                           'result': 'Path 0 -> 1 -> 2 uses 1 stop and costs 200, returning 200.',
                           'rows': [   [   'Round 0',
                                           'prices: [0, INF, INF]',
                                           '0->1 (cost 100), 0->2 (cost 500)',
                                           'temp: [0, 100, 500]'],
                                       [   'Round 1',
                                           'prices: [0, 100, 500]',
                                           '1->2 (cost 100 + 100 = 200)',
                                           'temp: [0, 100, 200]'],
                                       ['Done', 'k=1 stops reached', 'Best price to dst 2 is 200', 'Result: 200']]}},
    {   'approaches': [   {   'code': 'class Solution {\n'
                                      '    public int orangesRotting(int[][] grid) {\n'
                                      '        int m = grid.length, n = grid[0].length;\n'
                                      '        int fresh = 0;\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      '                if (grid[r][c] == 1) fresh++;\n'
                                      '            }\n'
                                      '        }\n'
                                      '        if (fresh == 0) return 0;\n'
                                      '\n'
                                      '        int minutes = 0;\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '\n'
                                      '        while (true) {\n'
                                      '            boolean changed = false;\n'
                                      '            int[][] next = new int[m][n];\n'
                                      '            for (int r = 0; r < m; r++) {\n'
                                      '                for (int c = 0; c < n; c++) {\n'
                                      '                    next[r][c] = grid[r][c];\n'
                                      '                }\n'
                                      '            }\n'
                                      '\n'
                                      '            for (int r = 0; r < m; r++) {\n'
                                      '                for (int c = 0; c < n; c++) {\n'
                                      '                    if (grid[r][c] == 2) {\n'
                                      '                        for (int[] d : dirs) {\n'
                                      '                            int nr = r + d[0], nc = c + d[1];\n'
                                      '                            if (nr >= 0 && nr < m && nc >= 0 && nc < n && '
                                      'grid[nr][nc] == 1) {\n'
                                      '                                if (next[nr][nc] == 1) {\n'
                                      '                                    next[nr][nc] = 2;\n'
                                      '                                    fresh--;\n'
                                      '                                    changed = true;\n'
                                      '                                }\n'
                                      '                            }\n'
                                      '                        }\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '\n'
                                      '            if (!changed) break;\n'
                                      '            grid = next;\n'
                                      '            minutes++;\n'
                                      '        }\n'
                                      '\n'
                                      '        return fresh == 0 ? minutes : -1;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'In each minute, scan the whole grid to find all oranges next to rotten ones, '
                                      'mark them rotten, and repeat until no changes happen.',
                              'is_optimal': False,
                              'name': 'Simulation pass by pass',
                              'space_complexity': 'O(1)',
                              'space_why': 'We modify the grid and snapshot using temporary arrays without extra queue '
                                           'memory.',
                              'steps': [   'Count fresh oranges across the grid up front.',
                                           'In each round, scan the entire grid to find fresh oranges adjacent to '
                                           'rotten oranges.',
                                           'Turn all newly infected oranges rotten and decrement the fresh orange '
                                           'counter.',
                                           'Repeat until no new oranges rot, returning elapsed minutes if zero fresh '
                                           'oranges remain.'],
                              'time_complexity': 'O((m * n)^2)',
                              'time_why': 'We scan all `m * n` cells during each minute, running up to `m * n` minutes '
                                          'in the worst case.',
                              'when_to_use': 'Simple simulation when grid dimensions are extremely tiny.'},
                          {   'code': 'import java.util.*;\n'
                                      '\n'
                                      'class Solution {\n'
                                      '    public int orangesRotting(int[][] grid) {\n'
                                      '        if (grid == null || grid.length == 0) return 0;\n'
                                      '        int m = grid.length, n = grid[0].length;\n'
                                      '        Queue<int[]> queue = new ArrayDeque<>();\n'
                                      '        int fresh = 0;\n'
                                      '\n'
                                      '        for (int r = 0; r < m; r++) {\n'
                                      '            for (int c = 0; c < n; c++) {\n'
                                      '                if (grid[r][c] == 2) {\n'
                                      '                    queue.add(new int[]{r, c});\n'
                                      '                } else if (grid[r][c] == 1) {\n'
                                      '                    fresh++;\n'
                                      '                }\n'
                                      '            }\n'
                                      '        }\n'
                                      '\n'
                                      '        if (fresh == 0) return 0;\n'
                                      '\n'
                                      '        int minutes = 0;\n'
                                      '        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};\n'
                                      '\n'
                                      '        while (!queue.isEmpty() && fresh > 0) {\n'
                                      '            int front = queue.size();\n'
                                      '            for (int i = 0; i < front; i++) {\n'
                                      '                int[] curr = queue.poll();\n'
                                      '                int r = curr[0], c = curr[1];\n'
                                      '\n'
                                      '                for (int[] d : dirs) {\n'
                                      '                    int nr = r + d[0], nc = c + d[1];\n'
                                      '                    if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] '
                                      '== 1) {\n'
                                      '                        grid[nr][nc] = 2;\n'
                                      '                        fresh--;\n'
                                      '                        queue.add(new int[]{nr, nc});\n'
                                      '                    }\n'
                                      '                }\n'
                                      '            }\n'
                                      '            minutes++;\n'
                                      '        }\n'
                                      '\n'
                                      '        return fresh == 0 ? minutes : -1;\n'
                                      '    }\n'
                                      '}\n',
                              'idea': 'Place all initial rotten oranges into a queue, and rot neighbor fresh oranges '
                                      'level by level, incrementing the timer for each wave.',
                              'is_optimal': True,
                              'name': 'The wave',
                              'space_complexity': 'O(m·n)',
                              'space_why': 'The queue holds coordinates of oranges, bounded by the grid dimensions '
                                           '`m·n`.',
                              'steps': [   'Count fresh oranges and put all initial rotten orange coordinates into a '
                                           'queue.',
                                           'Fix the queue size before starting each minute to process only the current '
                                           'round of infections.',
                                           'For each dequeued orange, infect adjacent fresh oranges and push them into '
                                           'the queue.',
                                           'When the queue empties, return the elapsed minutes if no fresh oranges '
                                           'remain.'],
                              'time_complexity': 'O(m·n)',
                              'time_why': 'Each cell in the grid is added to the queue and processed at most once.',
                              'when_to_use': 'Best standard way to model simultaneous multi-source spreading '
                                             'processes.'}],
        'edge_cases': [   {   'expected': '0',
                              'input': 'grid = [[0]]',
                              'why': 'A grid with no fresh oranges requires 0 minutes.'},
                          {   'expected': '-1',
                              'input': 'grid = [[1]]',
                              'why': 'A single fresh orange with no rotten oranges can never rot.'},
                          {   'expected': '0',
                              'input': 'grid = [[2]]',
                              'why': 'A single rotten orange has no fresh oranges to rot.'},
                          {   'expected': '-1',
                              'input': 'grid = [[2,1,1],[0,1,1],[1,0,1]]',
                              'why': 'Bottom-right orange is isolated behind empty cells and can never rot.'}],
        'follow_ups': [   {   'answer': 'Use a priority queue ordered by elapsed infection time instead of a standard '
                                        'FIFO queue.',
                              'question': 'What if some cells contain obstacles that slow down infection by two '
                                          'minutes?'},
                          {   'answer': 'Store visited and infected state in a separate boolean matrix or coordinate '
                                        'hash set.',
                              'question': 'Can this be solved without mutating the input grid?'},
                          {   'answer': 'Store the source orange identifier alongside coordinates in the queue nodes.',
                              'question': 'How would you identify which original rotten orange infected a specific '
                                          'fresh orange?'}],
        'interview_script': [   'I need to calculate the minimum minutes until all fresh oranges rot, or return -1 if '
                                'impossible.',
                                'My obvious first idea is scanning the entire grid minute by minute, taking O((m * '
                                'n)^2) time.',
                                'A key point is that fixing queue size per round ensures newly infected oranges wait '
                                'for the next minute.',
                                'I would use multi-source breadth-first search, taking O(m·n) time and O(m·n) queue '
                                'space.',
                                'I would test this on grids with no fresh oranges, unreachable fresh oranges, and '
                                'chain infections.'],
        'mistakes': [   {   'name': 'The Sequential Infection Trap',
                            'right': 'Fix the front before spreading: int front = queue.size(). An orange that rots in '
                                     'this minute must wait for the next one, or rot runs through a whole chain in a '
                                     'single minute.',
                            'wrong': 'Looping directly over queue size without freezing it, letting newly infected '
                                     'oranges rot their neighbors in the same minute.'},
                        {   'name': 'Incrementing minutes on empty queue',
                            'right': 'Only increment the minute counter if fresh oranges were actually infected or '
                                     'check fresh > 0.',
                            'wrong': 'Incrementing the minute counter after a level where no new oranges were infected '
                                     'overcounts the time.'},
                        {   'name': 'Missing unreachable fresh oranges',
                            'right': 'Compare the fresh count to zero at the end; return -1 if any fresh oranges '
                                     'remain.',
                            'wrong': 'Returning elapsed minutes without checking whether any fresh oranges remain '
                                     'yields false success.'}],
        'pattern': 'Multi-source BFS',
        'related_slugs': ['lc-286', 'lc-542', 'lc-200'],
        'slugs': ['lc-994', 'rotting-oranges'],
        'summary': 'Put all rotten oranges into a queue. Expand outward one minute at a time to rot adjacent fresh '
                   'oranges until none remain.',
        'trigger': 'Return the minimum number of minutes that must elapse until no cell has a fresh orange.',
        'walkthrough': {   'columns': ['Minute', 'Front Size', 'Queue Polled', 'Fresh Remaining'],
                           'input': 'grid = [[2,1,1]]',
                           'result': 'Sequential infection finishes in 2 minutes, returning 2.',
                           'rows': [   ['0', '1', '(0, 0)', '2 fresh oranges'],
                                       ['1', '1 (fixed front)', '(0, 1) infected; (0, 2) must wait', '1 fresh orange'],
                                       ['2', '1', '(0, 2) infected', '0 fresh oranges']]}}]
