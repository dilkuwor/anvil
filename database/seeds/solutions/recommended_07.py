"""Recommended problems, batch 07: bipartite check, cheapest network, minimum effort path, staircase search.

See SOLUTION_GUIDE.md in this folder.
"""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-785"],
        "pattern": "Two-colouring with BFS",
        "trigger": "“Split the nodes into two groups so that every edge crosses between them.”",
        "summary": (
            "Give one node a colour; its neighbours are then forced to take the other colour. Spread the "
            "colours outward, and start again at every node still uncoloured. An edge with the same colour at both ends means false."
        ),
        "approaches": [
            {
                "name": "Try every split into two groups",
                "idea": "Each node goes in group A or group B, so try all 2^n ways and check every edge.",
                "steps": [
                    "Number the splits from 0 to 2^n - 1. Bit i of the number says which group node i is in.",
                    "For each split, look at every edge.",
                    "If some edge has both ends in the same group, this split fails. Try the next one.",
                    "If a split passes every edge, return true. If none passes, return false.",
                ],
                "code": """class Solution {
    public boolean isBipartite(int[][] graph) {
        int n = graph.length;
        for (long split = 0; split < (1L << n); split++) {
            boolean ok = true;
            for (int u = 0; u < n && ok; u++) {
                for (int v : graph[u]) {
                    if (((split >> u) & 1) == ((split >> v) & 1)) {
                        ok = false;
                        break;
                    }
                }
            }
            if (ok) return true;
        }
        return false;
    }
}
""",
                "time_complexity": "O(2^n · (V + E))",
                "time_why": "There are 2^n splits, and each one checks every edge.",
                "space_complexity": "O(1)",
                "space_why": "Only the split number and a few loop counters are kept.",
                "when_to_use": "Mention it to show you understand the question. With 100 nodes it would never finish, so do not code it.",
                "is_optimal": False,
            },
            {
                "name": "BFS colouring from every uncoloured node",
                "idea": "A colour forces the colour of every neighbour, so spread colours outward and look for a clash.",
                "steps": [
                    "Keep a `color` array where 0 means not coloured yet, and 1 and -1 are the two colours.",
                    "Go through the nodes in order. When a node is still uncoloured, give it colour 1 and put it in a queue.",
                    "Take a node from the queue. Give each uncoloured neighbour the opposite colour and add it to the queue.",
                    "If a neighbour already has the same colour as the node, return false.",
                    "When every piece of the graph has been coloured with no clash, return true.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean isBipartite(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];
        for (int start = 0; start < n; start++) {
            if (color[start] != 0) continue;
            color[start] = 1;
            Deque<Integer> queue = new ArrayDeque<>();
            queue.add(start);
            while (!queue.isEmpty()) {
                int node = queue.poll();
                for (int next : graph[node]) {
                    if (color[next] == 0) {
                        color[next] = -color[node];
                        queue.add(next);
                    } else if (color[next] == color[node]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
""",
                "time_complexity": "O(V + E)",
                "time_why": "Each node enters the queue once, and each edge is looked at once from each end.",
                "space_complexity": "O(V)",
                "space_why": "The `color` array and the queue hold at most one entry per node.",
                "when_to_use": "The answer to give. Say out loud that the outer loop is there because the graph can be in pieces.",
                "is_optimal": True,
            },
            {
                "name": "Union find on each node's neighbours",
                "idea": "All neighbours of one node must share a group, so join them together and check that no node shares a group with a neighbour.",
                "steps": [
                    "Give every node its own group in a union find table.",
                    "For each node, join all of its neighbours into one group.",
                    "Before joining, check the node itself. If it is already in the same group as a neighbour, return false.",
                    "If no node ever lands with a neighbour, return true.",
                ],
                "code": """class Solution {
    private int[] parent;

    public boolean isBipartite(int[][] graph) {
        int n = graph.length;
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        for (int u = 0; u < n; u++) {
            for (int v : graph[u]) {
                if (find(u) == find(v)) return false;
                union(graph[u][0], v);
            }
        }
        return true;
    }

    private int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    private void union(int a, int b) {
        parent[find(a)] = find(b);
    }
}
""",
                "time_complexity": "O((V + E) · α(V))",
                "time_why": "Each edge causes one find and one join, and each costs almost constant time.",
                "space_complexity": "O(V)",
                "space_why": "The `parent` table has one entry per node.",
                "when_to_use": "Useful when edges arrive one at a time and you must say after each one whether the graph can still be split.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "graph = [[1],[0],[3,4],[2,4],[2,3]]  (the pair 0-1, and a triangle 2-3-4)",
            "columns": ["start", "node taken", "neighbour", "what happens", "colours so far"],
            "rows": [
                ["0", "0", "1", "1 is uncoloured, so it gets the other colour", "0:A 1:B"],
                ["0", "1", "0", "0 is A and 1 is B, so this edge is fine", "0:A 1:B"],
                ["1", "-", "-", "1 is already coloured, so skip it", "0:A 1:B"],
                ["2", "2", "3, 4", "2 was never reached from 0: a new piece. Both neighbours get B", "2:A 3:B 4:B"],
                ["2", "3", "4", "3 and 4 are both B, but they share an edge", "clash"],
            ],
            "result": "Starting only from node 0 would miss the triangle. The answer is false.",
        },
        "mistakes": [
            {
                "name": "The Single Start Trap",
                "wrong": "Colouring only from node 0 and returning true when that piece has no clash.",
                "right": "Loop over every node and start a new colouring at each one that is still uncoloured. The graph can be in separate pieces.",
            },
            {
                "name": "Colouring a node twice",
                "wrong": "Giving a colour to a neighbour that already has one, which hides the clash.",
                "right": "Only colour a neighbour that is still 0. If it already has a colour, compare instead.",
            },
            {
                "name": "Checking only uncoloured neighbours",
                "wrong": "Skipping neighbours that are already coloured, so a clash is never found.",
                "right": "An already coloured neighbour is exactly where a clash shows up. Compare its colour with the current node.",
            },
        ],
        "edge_cases": [
            {"input": "[[]]", "expected": "true", "why": "One node with no edges fits at one table."},
            {"input": "[[1],[0],[3],[2]]", "expected": "true", "why": "Two separate pairs: the outer loop must start twice."},
            {"input": "[[],[2,5],[1,3],[2,4],[3,5],[4,1]]", "expected": "false", "why": "Node 0 is alone; the odd loop is only found by starting again."},
            {"input": "[[1,2],[0,2],[0,1]]", "expected": "false", "why": "A triangle: three nodes in a loop can never alternate two colours."},
            {"input": "[[1,3],[0,2],[1,3],[0,2]]", "expected": "true", "why": "A square: a loop with an even number of nodes is fine."},
        ],
        "interview_script": [
            "I need to know if I can give each node one of two colours so no edge joins the same colour.",
            "My first idea is to try all 2^n splits and check the edges. That is O(2^n · (V + E)), far too slow.",
            "The key point for me: one colour decides all its neighbours, so I never guess after the first node.",
            "I will colour outward with a BFS and restart at every uncoloured node. That is O(V + E) time and O(V) space.",
            "I would test one node alone, two separate pieces, a triangle, and an even loop.",
        ],
        "follow_ups": [
            {
                "question": "Can you return the two groups, not just true or false?",
                "answer": "Yes. After the colouring finishes with no clash, the nodes with colour 1 form one group and the rest form the other.",
            },
            {
                "question": "Would DFS work instead of BFS?",
                "answer": "Yes. Any order that colours a neighbour from its node works. DFS with recursion uses stack space as deep as the longest chain.",
            },
            {
                "question": "What does a false answer tell you about the graph?",
                "answer": "It contains a loop with an odd number of nodes. A graph can be split in two exactly when it has no odd loop.",
            },
            {
                "question": "The input is a list of edges instead. What changes?",
                "answer": "Build the neighbour lists first, in O(V + E). The colouring itself stays the same.",
            },
        ],
        "related_slugs": ["lc-207", "lc-200", "lc-547"],
    },
    {
        "slugs": ["lc-1584"],
        "pattern": "Minimum spanning tree (Prim)",
        "trigger": "“Connect all points with the smallest total cost”, where any two points can be joined.",
        "summary": (
            "Grow one network from any point. Every outside point keeps a price: its cheapest cable to any point already "
            "in. Add the cheapest outside point, then lower prices using only that new point."
        ),
        "approaches": [
            {
                "name": "Grow the network, rescan every pair each round",
                "idea": "Each round, check every cable between a point inside and a point outside, and add the cheapest.",
                "steps": [
                    "Put the first point in the network.",
                    "For every point inside and every point outside, measure the cable between them.",
                    "Add the outside point with the cheapest cable, and add that cable's cost to the total.",
                    "Repeat until every point is inside, then return the total.",
                ],
                "code": """class Solution {
    public int minCostConnectPoints(int[][] points) {
        int n = points.length;
        boolean[] inNetwork = new boolean[n];
        inNetwork[0] = true;
        int total = 0;
        for (int round = 1; round < n; round++) {
            int best = Integer.MAX_VALUE, bestPoint = -1;
            for (int a = 0; a < n; a++) {
                if (!inNetwork[a]) continue;
                for (int b = 0; b < n; b++) {
                    if (inNetwork[b]) continue;
                    int cable = Math.abs(points[a][0] - points[b][0]) + Math.abs(points[a][1] - points[b][1]);
                    if (cable < best) {
                        best = cable;
                        bestPoint = b;
                    }
                }
            }
            inNetwork[bestPoint] = true;
            total += best;
        }
        return total;
    }
}
""",
                "time_complexity": "O(n³)",
                "time_why": "There are n rounds, and each round measures up to n² inside-outside pairs again.",
                "space_complexity": "O(n)",
                "space_why": "Only the `inNetwork` flags are kept.",
                "when_to_use": "A good way to explain the idea. Then point out that each round re-measures cables it already measured.",
                "is_optimal": False,
            },
            {
                "name": "Prim's algorithm with a price per point",
                "idea": "Remember each outside point's cheapest cable to the network, so a new round only measures cables from the newest point.",
                "steps": [
                    "Give every point a price of infinity, except the first point, which costs 0.",
                    "Pick the outside point with the lowest price. Add it to the network and add its price to the total.",
                    "For every point still outside, measure the cable to the newly added point.",
                    "If that cable is cheaper than the point's price, lower the price. An older, cheaper cable keeps its price.",
                    "Repeat until every point is inside, then return the total.",
                ],
                "code": """import java.util.*;

class Solution {
    public int minCostConnectPoints(int[][] points) {
        int n = points.length;
        int[] price = new int[n];
        Arrays.fill(price, Integer.MAX_VALUE);
        boolean[] inNetwork = new boolean[n];
        price[0] = 0;
        int total = 0;
        for (int round = 0; round < n; round++) {
            int next = -1;
            for (int i = 0; i < n; i++) {
                if (!inNetwork[i] && (next == -1 || price[i] < price[next])) next = i;
            }
            inNetwork[next] = true;
            total += price[next];
            for (int i = 0; i < n; i++) {
                if (inNetwork[i]) continue;
                int cable = Math.abs(points[i][0] - points[next][0]) + Math.abs(points[i][1] - points[next][1]);
                price[i] = Math.min(price[i], cable);
            }
        }
        return total;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "There are n rounds, and each round makes two passes over the n prices.",
                "space_complexity": "O(n)",
                "space_why": "The `price` array and the `inNetwork` flags hold one entry per point.",
                "when_to_use": "The answer to give. Every pair of points is a possible cable, so a plain array beats a heap here.",
                "is_optimal": True,
            },
            {
                "name": "Kruskal's algorithm with union find",
                "idea": "Sort every possible cable by cost and take each one that joins two separate groups.",
                "steps": [
                    "Build every pair of points as a cable with its cost.",
                    "Sort the cables from cheapest to most expensive.",
                    "Go through the cables. If the two ends are in different groups, join the groups and add the cost.",
                    "Stop after n - 1 cables have been added, and return the total.",
                ],
                "code": """import java.util.*;

class Solution {
    private int[] parent;

    public int minCostConnectPoints(int[][] points) {
        int n = points.length;
        List<int[]> cables = new ArrayList<>();
        for (int a = 0; a < n; a++) {
            for (int b = a + 1; b < n; b++) {
                int cost = Math.abs(points[a][0] - points[b][0]) + Math.abs(points[a][1] - points[b][1]);
                cables.add(new int[] {cost, a, b});
            }
        }
        cables.sort((x, y) -> Integer.compare(x[0], y[0]));
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int total = 0, used = 0;
        for (int[] cable : cables) {
            if (used == n - 1) break;
            int ra = find(cable[1]), rb = find(cable[2]);
            if (ra == rb) continue;
            parent[ra] = rb;
            total += cable[0];
            used++;
        }
        return total;
    }

    private int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }
}
""",
                "time_complexity": "O(n² log n)",
                "time_why": "There are about n²/2 cables, and sorting them costs O(n² log n).",
                "space_complexity": "O(n²)",
                "space_why": "The list holds every possible cable at once.",
                "when_to_use": "Better when the graph has few edges, or when the cables are given as a list. It reuses the union find from Redundant Connection.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "points = [[0,0],[2,2],[3,10],[5,2],[7,0]]",
            "columns": ["round", "point added", "cost paid", "prices of outside points", "total"],
            "rows": [
                ["1", "[0,0]", "0", "[2,2]:4 [3,10]:13 [5,2]:7 [7,0]:7", "0"],
                ["2", "[2,2]", "4", "[3,10]:9 [5,2]:3 [7,0]:7", "4"],
                ["3", "[5,2]", "3", "[3,10]:9 (a cable from [5,2] costs 10, so the old 9 stays) [7,0]:4", "7"],
                ["4", "[7,0]", "4", "[3,10]:9 (a cable from [7,0] costs 14; 9 from [2,2] still wins)", "11"],
                ["5", "[3,10]", "9", "none left", "20"],
            ],
            "result": "The cheapest cable for [3,10] comes from an older point, not the newest one. The answer is 20.",
        },
        "mistakes": [
            {
                "name": "The Newest House Trap",
                "wrong": "Choosing the next cable only among cables from the point added last.",
                "right": "The next cable may start at any point already in the network. Keep each outside point's cheapest price and only lower it.",
            },
            {
                "name": "Forgetting the network flag",
                "wrong": "Letting a point already inside be picked again, or lowering its price after it joined.",
                "right": "Mark a point as inside when it is added, and skip inside points in both passes.",
            },
            {
                "name": "Using straight-line distance",
                "wrong": "Measuring cables with the square root formula.",
                "right": "The cost is `|x1 - x2| + |y1 - y2|`, steps across plus steps up or down, and it stays a whole number.",
            },
        ],
        "edge_cases": [
            {"input": "[[0,0]]", "expected": "0", "why": "One point needs no cable."},
            {"input": "[[3,12],[-2,5],[-4,1]]", "expected": "18", "why": "Negative positions: the distance uses absolute values."},
            {"input": "[[0,0],[1,1],[1,0],[-1,1]]", "expected": "4", "why": "Several cables tie on cost; any tie gives the same total."},
            {"input": "[[-1000000,-1000000],[1000000,1000000]]", "expected": "4000000", "why": "The largest distance still fits in an `int`."},
        ],
        "interview_script": [
            "I need the cheapest set of cables that links every point, where a cable costs the Manhattan distance.",
            "The obvious way grows the network and re-measures every inside-outside pair each round. That is O(n³).",
            "The key point is that the next cable can start from any point already in, so I keep one best price per outside point.",
            "After adding a point I only measure cables from that new point to lower prices. That is O(n²) time and O(n) space.",
            "I would test one point, negative positions, ties, and the biggest distance.",
        ],
        "follow_ups": [
            {
                "question": "Why not use a heap for Prim's algorithm?",
                "answer": "Every pair is a possible cable, so there are about n² edges. A heap would make it O(n² log n), slower than the plain array.",
            },
            {
                "question": "How would you solve it with Kruskal's algorithm?",
                "answer": "Sort all pairs by cost and add each cable whose ends are in different union find groups. It costs O(n² log n) time and O(n²) space.",
            },
            {
                "question": "Return the cables, not only the cost.",
                "answer": "Keep a `from` array next to `price`. When a price is lowered, record which point gave it. Each added point's `from` is its cable.",
            },
        ],
        "related_slugs": ["lc-684", "lc-743", "lc-547"],
    },
    {
        "slugs": ["lc-1631"],
        "pattern": "Dijkstra on a grid",
        "trigger": "“The cost of a route is its largest single step”, and you want the cheapest route between two cells.",
        "summary": (
            "Run Dijkstra, but a route's cost is its steepest step, not a sum. Moving on gives max(effort so far, this step). "
            "The first time the corner leaves the heap, its effort is the answer."
        ),
        "approaches": [
            {
                "name": "Try every effort limit from 0 upward",
                "idea": "For limits 0, 1, 2 and so on, flood the grid using only steps no bigger than the limit, and stop at the first limit that reaches the corner.",
                "steps": [
                    "Start with a limit of 0.",
                    "Flood out from the top-left cell, stepping only to neighbours whose height differs by at most the limit.",
                    "If the flood reaches the bottom-right cell, return the limit.",
                    "Otherwise raise the limit by one and flood again from the start.",
                ],
                "code": """import java.util.*;

class Solution {
    public int minimumEffortPath(int[][] heights) {
        for (int limit = 0; ; limit++) {
            if (reaches(heights, limit)) return limit;
        }
    }

    private boolean reaches(int[][] heights, int limit) {
        int rows = heights.length, cols = heights[0].length;
        boolean[][] seen = new boolean[rows][cols];
        Deque<int[]> queue = new ArrayDeque<>();
        queue.add(new int[] {0, 0});
        seen[0][0] = true;
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            if (cell[0] == rows - 1 && cell[1] == cols - 1) return true;
            for (int[] move : moves) {
                int r = cell[0] + move[0], c = cell[1] + move[1];
                if (r < 0 || r >= rows || c < 0 || c >= cols || seen[r][c]) continue;
                if (Math.abs(heights[r][c] - heights[cell[0]][cell[1]]) > limit) continue;
                seen[r][c] = true;
                queue.add(new int[] {r, c});
            }
        }
        return false;
    }
}
""",
                "time_complexity": "O(m·n·H)",
                "time_why": "Each limit floods the whole grid, and the answer can be as large as H, the biggest height difference.",
                "space_complexity": "O(m·n)",
                "space_why": "The `seen` grid and the queue can hold every cell.",
                "when_to_use": "A clear first idea: it turns the question into many yes-or-no floods. Then say that the limits can be searched faster.",
                "is_optimal": False,
            },
            {
                "name": "Binary search on the effort limit",
                "idea": "If a limit reaches the corner, every bigger limit does too, so binary search for the smallest one that works.",
                "steps": [
                    "Search the limits from 0 to the largest possible height difference.",
                    "Take the middle limit and flood the grid using only steps no bigger than it.",
                    "If the flood reaches the corner, the answer is this limit or smaller. Otherwise it is bigger.",
                    "Keep halving the range until one limit is left, and return it.",
                ],
                "code": """import java.util.*;

class Solution {
    public int minimumEffortPath(int[][] heights) {
        int low = 0, high = 1_000_000;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (reaches(heights, mid)) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    private boolean reaches(int[][] heights, int limit) {
        int rows = heights.length, cols = heights[0].length;
        boolean[][] seen = new boolean[rows][cols];
        Deque<int[]> queue = new ArrayDeque<>();
        queue.add(new int[] {0, 0});
        seen[0][0] = true;
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            if (cell[0] == rows - 1 && cell[1] == cols - 1) return true;
            for (int[] move : moves) {
                int r = cell[0] + move[0], c = cell[1] + move[1];
                if (r < 0 || r >= rows || c < 0 || c >= cols || seen[r][c]) continue;
                if (Math.abs(heights[r][c] - heights[cell[0]][cell[1]]) > limit) continue;
                seen[r][c] = true;
                queue.add(new int[] {r, c});
            }
        }
        return false;
    }
}
""",
                "time_complexity": "O(m·n·log H)",
                "time_why": "About log H floods, each touching every cell once.",
                "space_complexity": "O(m·n)",
                "space_why": "The `seen` grid and the queue can hold every cell.",
                "when_to_use": "A strong answer and easy to get right. Mention it if Dijkstra's details worry you.",
                "is_optimal": False,
            },
            {
                "name": "Dijkstra with the largest step as the cost",
                "idea": "Always extend the route with the smallest effort so far, where effort is the largest step taken.",
                "steps": [
                    "Keep an `effort` grid filled with infinity, and set the start cell to 0.",
                    "Put the start in a min-heap, a pile that always hands back the smallest effort first.",
                    "Take the cell with the smallest effort. If it is the bottom-right cell, return its effort.",
                    "For each neighbour, the new effort is the larger of this cell's effort and the step to the neighbour.",
                    "If that is lower than the neighbour's recorded effort, record it and add the neighbour to the heap.",
                ],
                "code": """import java.util.*;

class Solution {
    public int minimumEffortPath(int[][] heights) {
        int rows = heights.length;
        int cols = heights[0].length;
        int[][] effort = new int[rows][cols];
        for (int[] row : effort) Arrays.fill(row, Integer.MAX_VALUE);
        effort[0][0] = 0;
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        heap.add(new int[] {0, 0, 0});
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            int e = top[0], r = top[1], c = top[2];
            if (e > effort[r][c]) continue;
            if (r == rows - 1 && c == cols - 1) return e;
            for (int[] move : moves) {
                int nr = r + move[0], nc = c + move[1];
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                int next = Math.max(e, Math.abs(heights[nr][nc] - heights[r][c]));
                if (next < effort[nr][nc]) {
                    effort[nr][nc] = next;
                    heap.add(new int[] {next, nr, nc});
                }
            }
        }
        return 0;
    }
}
""",
                "time_complexity": "O(m·n·log(m·n))",
                "time_why": "Each cell can be added to the heap a few times, and each heap step costs O(log(m·n)).",
                "space_complexity": "O(m·n)",
                "space_why": "The `effort` grid and the heap can hold every cell.",
                "when_to_use": "The answer to give. It is Network Delay Time with one change: `max` instead of `+`.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "heights = [[1,2,2],[3,8,2],[5,3,5]]",
            "columns": ["taken from heap", "height", "neighbours given an effort", "note"],
            "rows": [
                ["(0,0) effort 0", "1", "(1,0): 2, (0,1): 1", "the start"],
                ["(0,1) effort 1", "2", "(1,1): 6, (0,2): 1", "the step 2 to 2 is 0, so the effort stays 1"],
                ["(0,2) effort 1", "2", "(1,2): 1", "still along the top"],
                ["(1,2) effort 1", "2", "(2,2): 3", "the right route: steps 1, 0, 0, 3. Its worst step is 3; a sum would say 4"],
                ["(1,0) effort 2", "3", "(2,0): 2, (1,1): 5", "the left route begins"],
                ["(2,0) effort 2", "5", "(2,1): 2", "steps so far: 2, 2"],
                ["(2,1) effort 2", "3", "(2,2): 2", "the left route: steps 2, 2, 2, 2. Worst step 2 beats 3, even though its sum is 8"],
                ["(2,2) effort 2", "5", "-", "the corner leaves the heap: stop"],
            ],
            "result": "Adding the steps would keep the right route. The answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Sum Trap",
                "wrong": "Adding the step sizes along a route, as in Network Delay Time.",
                "right": "A route costs its largest step, so the new effort is `max(effort, step)`, never `effort + step`.",
            },
            {
                "name": "Stopping when the corner is first reached",
                "wrong": "Returning as soon as the corner gets any effort, while a better route is still in the heap.",
                "right": "Return only when the corner is taken out of the heap. Then no cheaper route can still arrive.",
            },
            {
                "name": "Old heap entries",
                "wrong": "Working on a heap entry whose effort is higher than the one now recorded for that cell.",
                "right": "Skip an entry when its effort is bigger than `effort[r][c]`. A better route already handled that cell.",
            },
        ],
        "edge_cases": [
            {"input": "[[5]]", "expected": "0", "why": "One cell: the start is already the end."},
            {"input": "[[1,10,6,7,9,10,4,9]]", "expected": "9", "why": "One row: there is only one route, so its worst step is the answer."},
            {"input": "[[1,2,1,1,1],[1,2,1,2,1],[1,2,1,2,1],[1,2,1,2,1],[1,1,1,2,1]]", "expected": "0", "why": "A winding flat route exists, so the effort is 0."},
            {"input": "[[1,2,2],[3,8,2],[5,3,5]]", "expected": "2", "why": "The route with the smallest sum is not the route with the smallest worst step."},
        ],
        "interview_script": [
            "I need the route from top-left to bottom-right whose largest single step is as small as possible.",
            "My first idea tries each limit 0, 1, 2 and floods the grid each time. That is O(m·n·H) for heights up to H.",
            "The key point for me: a route's worst step never gets smaller as the route grows, so Dijkstra still works.",
            "I run Dijkstra where moving on costs max of the effort so far and the step. That is O(m·n·log(m·n)) time and O(m·n) space.",
            "I would test one cell, one row, a flat winding route, and a grid where the smallest sum is the wrong route.",
        ],
        "follow_ups": [
            {
                "question": "Can you solve it without a heap?",
                "answer": "Yes. Binary search the limit and flood the grid for each guess, in O(m·n·log H). Or sort all steps and join cells with union find until start and end meet.",
            },
            {
                "question": "Why can you return as soon as the corner leaves the heap?",
                "answer": "The heap hands out the smallest effort first, and efforts never go down along a route. Nothing left in the heap can reach the corner more cheaply.",
            },
            {
                "question": "What if you may also move diagonally?",
                "answer": "Add the four diagonal moves to the `moves` list. Nothing else changes.",
            },
        ],
        "related_slugs": ["lc-743", "lc-787", "lc-200"],
    },
    {
        "slugs": ["lc-240"],
        "pattern": "Staircase search",
        "trigger": "A grid where every row and every column is sorted, and you must find one value.",
        "summary": (
            "Stand on the top-right cell. If it is too big, the whole column below is too big, so step left. "
            "If it is too small, the whole row to the left is too small, so step down."
        ),
        "approaches": [
            {
                "name": "Check every cell",
                "idea": "Look at each cell in turn and compare it with the target.",
                "steps": [
                    "Go through the rows from top to bottom.",
                    "In each row, compare every cell with the target.",
                    "If a cell equals the target, return true.",
                    "If no cell matched, return false.",
                ],
                "code": """class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        for (int[] row : matrix) {
            for (int value : row) {
                if (value == target) return true;
            }
        }
        return false;
    }
}
""",
                "time_complexity": "O(m·n)",
                "time_why": "Every one of the m·n cells may be checked.",
                "space_complexity": "O(1)",
                "space_why": "Only the loop positions are kept.",
                "when_to_use": "Say it in one sentence to show the sorting is being ignored. Do not code it.",
                "is_optimal": False,
            },
            {
                "name": "Binary search in each row",
                "idea": "Each row is sorted, so binary search it for the target.",
                "steps": [
                    "Go through the rows one at a time.",
                    "In each row, binary search: look at the middle cell and throw away the half that cannot hold the target.",
                    "If a row holds the target, return true.",
                    "If no row holds it, return false.",
                ],
                "code": """class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        for (int[] row : matrix) {
            int low = 0, high = row.length - 1;
            while (low <= high) {
                int mid = low + (high - low) / 2;
                if (row[mid] == target) return true;
                if (row[mid] < target) low = mid + 1;
                else high = mid - 1;
            }
        }
        return false;
    }
}
""",
                "time_complexity": "O(m log n)",
                "time_why": "Each of the m rows costs one binary search of log n steps.",
                "space_complexity": "O(1)",
                "space_why": "Only `low`, `high` and `mid` are kept.",
                "when_to_use": "Better than checking every cell, and fine when the grid is very wide and short.",
                "is_optimal": False,
            },
            {
                "name": "Staircase from the top-right corner",
                "idea": "From the top-right cell, one comparison throws away a whole row or a whole column.",
                "steps": [
                    "Start at the top-right cell: row 0, the last column.",
                    "If the cell equals the target, return true.",
                    "If the cell is bigger than the target, every cell below it is bigger too, so step one column left.",
                    "If the cell is smaller, every cell to its left is smaller too, so step one row down.",
                    "If you walk off the grid, the target is not there: return false.",
                ],
                "code": """class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        int row = 0;
        int col = matrix[0].length - 1;
        while (row < matrix.length && col >= 0) {
            int value = matrix[row][col];
            if (value == target) return true;
            if (value > target) col--;
            else row++;
        }
        return false;
    }
}
""",
                "time_complexity": "O(m + n)",
                "time_why": "Each step removes one row or one column, and there are only m + n of them.",
                "space_complexity": "O(1)",
                "space_why": "Only the current `row` and `col` are kept.",
                "when_to_use": "The answer to give. Explain why the top-right corner works and the top-left does not.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "matrix = [[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]], target = 5",
            "columns": ["position", "value", "compared with 5", "move", "thrown away"],
            "rows": [
                ["top-left (0,0)", "1", "smaller", "right and down are both bigger: no safe move", "nothing"],
                ["top-right (0,4)", "15", "bigger", "step left", "column 4"],
                ["(0,3)", "11", "bigger", "step left", "column 3"],
                ["(0,2)", "7", "bigger", "step left", "column 2"],
                ["(0,1)", "4", "smaller", "step down", "row 0"],
                ["(1,1)", "5", "equal", "stop", "-"],
            ],
            "result": "Starting at the top-left gives no safe move; from the top-right it takes 5 cells. The answer is true.",
        },
        "mistakes": [
            {
                "name": "The Wrong Corner Trap",
                "wrong": "Starting at the top-left, where moving right and moving down both make the value bigger.",
                "right": "Start at the top-right or bottom-left. There one direction goes up and the other goes down, so every comparison rules out a row or a column.",
            },
            {
                "name": "Treating the grid as one sorted list",
                "wrong": "Running one binary search over all cells as in Search a 2D Matrix.",
                "right": "Here the end of a row can be bigger than the start of the next row, so the cells are not one sorted list.",
            },
            {
                "name": "Wrong loop bounds",
                "wrong": "Stopping when either index hits zero, or reading past the last row.",
                "right": "Keep going while `row < matrix.length && col >= 0`.",
            },
        ],
        "edge_cases": [
            {"input": "[[-5]], -5", "expected": "true", "why": "One cell that matches."},
            {"input": "[[1,4],[2,5]], 3", "expected": "false", "why": "The target falls between cells, so the walk ends off the grid."},
            {"input": "[[1,2,3,4,5]], 5", "expected": "true", "why": "One row, and the target is the first cell looked at."},
            {"input": "[[1],[3],[5]], 0", "expected": "false", "why": "One column, and the target is smaller than every cell."},
        ],
        "interview_script": [
            "I need to say whether the target is in a grid where every row and every column is sorted.",
            "My first idea checks every cell in O(m·n); binary searching each row gets me O(m log n).",
            "The key point for me is the top-right corner: left is smaller and down is bigger, so one comparison drops a row or a column.",
            "So I walk a staircase from that corner. That is O(m + n) time and O(1) space.",
            "I would test one cell, a target between values, one row, one column, and a missing target.",
        ],
        "follow_ups": [
            {
                "question": "Why not start at the top-left?",
                "answer": "Both neighbours there are bigger, so a smaller-than-target cell does not tell you which way to go. The bottom-left works as well as the top-right.",
            },
            {
                "question": "Can you count how many cells are smaller than the target?",
                "answer": "Walk the same staircase from the bottom-left. Each time you step right, add the number of rows above and including the current one.",
            },
            {
                "question": "How is this different from Search a 2D Matrix?",
                "answer": "There each row starts after the previous row ends, so the grid is one sorted list and one binary search works in O(log(m·n)).",
            },
        ],
        "related_slugs": ["lc-74", "lc-704"],
    },
]
