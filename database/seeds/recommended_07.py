"""Recommended problems, batch 07: two-colouring, cheapest network, worst-step paths, staircase search.

See ``recommended.md`` for why each one was picked. Every problem carries its reference solution,
complexity target and progressive hints inline, like ``microsoft_extra``.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

GRAPH = "graph"
MATRIX = "matrix"


PROBLEMS: list[dict] = [
    _p(
        785, "Is Graph Bipartite?", "MEDIUM", GRAPH,
        "isBipartite", [("graph", "int[][]")], "boolean",
        "Some pairs of people do not get along. You want to seat everyone at two tables so that no "
        "two people who do not get along share a table. Can it be done? A graph that can be split "
        "this way is called bipartite.\n\n"
        "The graph has `n` nodes numbered `0` to `n - 1`. `graph[u]` lists every node joined to `u` "
        "by an edge. Edges go both ways: if `v` is in `graph[u]`, then `u` is in `graph[v]`. There "
        "are no self-loops and no repeated edges. The graph may be in several separate pieces.\n\n"
        "Return `true` if every node can get one of two colours so that each edge joins two "
        "different colours, and `false` otherwise.",
        [
            {"input": "[[1,2,3],[0,2],[0,1,3],[0,2]]", "expected": "false", "hidden": False, "order": 1},
            {"input": "[[1,3],[0,2],[1,3],[0,2]]", "expected": "true", "hidden": False, "order": 2},
            {"input": "[[]]", "expected": "true", "hidden": True, "order": 3},
            {"input": "[[1],[0],[3],[2]]", "expected": "true", "hidden": True, "order": 4},
            {"input": "[[],[2,5],[1,3],[2,4],[3,5],[4,1]]", "expected": "false", "hidden": True, "order": 5},
        ],
        constraints=(
            "1 <= n <= 100\n0 <= graph[u].length < n\ngraph[u] does not contain u\n"
            "All values of graph[u] are unique\nIf graph[u] contains v, then graph[v] contains u"
        ),
        input_format="The adjacency list as a matrix: row u lists the neighbours of node u",
        output_format="true or false",
        time="O(V + E)", space="O(V)",
        hints=[
            "Pick any node and give it a colour. Its neighbours then have no choice: they must get "
            "the other colour.",
            "Spread the colours outward from that node. If you ever find an edge whose two ends "
            "already have the same colour, the answer is false.",
            "Use a BFS with a queue and a `color` array (0 = not coloured yet). Start a new BFS from "
            "every node that is still uncoloured, because the graph can be in separate pieces.",
        ],
        solution=r"""
import java.util.*;

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
    ),
    _p(
        1584, "Min Cost to Connect All Points", "MEDIUM", GRAPH,
        "minCostConnectPoints", [("points", "int[][]")], "int",
        "You have some points on a grid, like houses on a map. You want to lay cables so that every "
        "house can reach every other house, maybe through other houses. A cable between two houses "
        "costs their Manhattan distance: the steps across plus the steps up or down. Return the "
        "smallest total cost.\n\n"
        "`points[i] = [x, y]`. The cost of joining `[x1, y1]` and `[x2, y2]` is "
        "`|x1 - x2| + |y1 - y2|`. Any two points may be joined directly. All points are different.\n\n"
        "Return the minimum total cost so that every pair of points is joined by exactly one simple "
        "path.",
        [
            {"input": "[[0,0],[2,2],[3,10],[5,2],[7,0]]", "expected": "20", "hidden": False, "order": 1},
            {"input": "[[3,12],[-2,5],[-4,1]]", "expected": "18", "hidden": False, "order": 2},
            {"input": "[[0,0]]", "expected": "0", "hidden": True, "order": 3},
            {"input": "[[0,0],[1,1],[1,0],[-1,1]]", "expected": "4", "hidden": True, "order": 4},
            {"input": "[[-1000000,-1000000],[1000000,1000000]]", "expected": "4000000", "hidden": True, "order": 5},
        ],
        constraints="1 <= points.length <= 1000\n-10^6 <= x, y <= 10^6\nAll pairs (x, y) are distinct",
        input_format="The points as a matrix: each row is [x, y]",
        output_format="An integer, the minimum total cost",
        time="O(n²)", space="O(n)",
        hints=[
            "The cheapest network never has a loop: a loop always contains a cable you could remove. "
            "So you need exactly n - 1 cables.",
            "Grow the network one point at a time. At each step, add the cheapest cable that joins "
            "a point already in the network to a point outside it.",
            "Keep, for each outside point, the cheapest cable to the network so far (Prim's "
            "algorithm). After adding a point, lower those prices using only the new point. With "
            "an array instead of a heap this is O(n²), which suits a full graph.",
        ],
        solution=r"""
import java.util.*;

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
    ),
    _p(
        1631, "Path With Minimum Effort", "MEDIUM", GRAPH,
        "minimumEffortPath", [("heights", "int[][]")], "int",
        "You are a hiker on a grid of heights. You start at the top-left cell and want to reach the "
        "bottom-right cell, moving up, down, left or right. The effort of a route is its single "
        "hardest step: the biggest height difference between two neighbouring cells on it. Return "
        "the smallest effort any route can have.\n\n"
        "`heights` is a `rows x columns` grid, and `heights[r][c]` is the height of cell `(r, c)`. "
        "A step between two neighbouring cells costs the absolute difference of their heights. "
        "The effort of a route is the largest step on it, not the sum.\n\n"
        "Return the minimum effort needed to go from `(0, 0)` to `(rows - 1, columns - 1)`. A grid "
        "with one cell needs effort `0`.",
        [
            {"input": "[[1,2,2],[3,8,2],[5,3,5]]", "expected": "2", "hidden": False, "order": 1},
            {"input": "[[1,2,3],[3,8,4],[5,3,5]]", "expected": "1", "hidden": False, "order": 2},
            {"input": "[[5]]", "expected": "0", "hidden": True, "order": 3},
            {"input": "[[1,2,1,1,1],[1,2,1,2,1],[1,2,1,2,1],[1,2,1,2,1],[1,1,1,2,1]]", "expected": "0", "hidden": True, "order": 4},
            {"input": "[[1,10,6,7,9,10,4,9]]", "expected": "9", "hidden": True, "order": 5},
        ],
        constraints="1 <= rows, columns <= 100\n1 <= heights[r][c] <= 10^6",
        input_format="The heights as a matrix",
        output_format="An integer, the minimum effort",
        time="O(m·n·log(m·n))", space="O(m·n)",
        hints=[
            "This is a shortest path problem on a grid, but the cost of a route is its largest "
            "step, not the total of its steps.",
            "A route's largest step can never get smaller as the route gets longer. That is what "
            "lets the usual shortest path idea work: always extend the cheapest route found so far.",
            "Run Dijkstra with a min-heap. Moving from a cell with effort `e` over a step of size `d` "
            "gives effort `max(e, d)`. Keep the best effort per cell and stop when the bottom-right "
            "cell leaves the heap.",
        ],
        solution=r"""
import java.util.*;

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
    ),
    _p(
        240, "Search a 2D Matrix II", "MEDIUM", MATRIX,
        "searchMatrix", [("matrix", "int[][]"), ("target", "int")], "boolean",
        "You have a grid of numbers. Each row goes up from left to right, and each column goes up "
        "from top to bottom. Is the number `target` somewhere in the grid? Answer yes or no.\n\n"
        "`matrix` is an `m x n` grid. Every row is sorted in ascending order, and every column is "
        "sorted in ascending order. The grid as a whole is not one sorted list: the end of one row "
        "can be bigger than the start of the next.\n\n"
        "Return `true` if `target` is in `matrix`, and `false` otherwise.",
        [
            {"input": "[[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]]\n5",
             "expected": "true", "hidden": False, "order": 1},
            {"input": "[[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]]\n20",
             "expected": "false", "hidden": False, "order": 2},
            {"input": "[[-5]]\n-5", "expected": "true", "hidden": True, "order": 3},
            {"input": "[[1,4],[2,5]]\n3", "expected": "false", "hidden": True, "order": 4},
            {"input": "[[1,2,3,4,5]]\n5", "expected": "true", "hidden": True, "order": 5},
            {"input": "[[1],[3],[5]]\n0", "expected": "false", "hidden": True, "order": 6},
        ],
        constraints=(
            "1 <= m, n <= 300\n-10^9 <= matrix[i][j] <= 10^9\nEvery row and every column is sorted "
            "in ascending order\n-10^9 <= target <= 10^9"
        ),
        input_format="Line 1: the matrix\nLine 2: integer target",
        output_format="true or false",
        time="O(m + n)", space="O(1)",
        hints=[
            "Checking every cell works but ignores the sorting. Which cell tells you the most "
            "when you compare it with the target?",
            "Look at the top-right corner. Everything to its left is smaller and everything below "
            "it is bigger. So one comparison rules out a whole row or a whole column.",
            "Start at the top-right. If the cell is bigger than the target, move one column left; "
            "if it is smaller, move one row down; if it is equal, return true. Stop when you walk "
            "off the grid.",
        ],
        solution=r"""
class Solution {
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
    ),
]
