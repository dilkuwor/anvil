"""DSA algorithm patterns: traversal, graphs, backtracking, greedy, DP, and production topics.

Continues ``learn_dsa.py``. Same authoring rules: Java code samples, flat lists,
unique ``##`` headings per lesson, and the canonical tutor-context headings.
"""

from __future__ import annotations

from database.seeds.learn_dsa import DL, _dsa_topic


def _graph_traversal_topic() -> dict:
    return _dsa_topic(
        "graph-traversal",
        "Graph Traversal",
        "DFS and BFS as templates, the visited-set discipline, and the grid problems built on them.",
        "MEDIUM",
        19,
        [
            DL(
                "bfs-vs-dfs",
                "BFS vs DFS: Choosing and Writing Them",
                "Two templates, one decision rule, and the visited handling that decides correctness.",
                13,
                "Depth-first search follows one path as far as it goes before backtracking; breadth-first search explores in order of distance. Both visit every reachable node in O(V + E), and choosing between them comes down to a single question: does the answer depend on distance?",
                [
                    (
                        "Why It Matters",
                        """Choosing wrong is expensive. DFS on a shortest-path problem produces a path, just not the shortest one, and the bug is invisible on small examples. BFS on a "find any path" problem works but uses far more memory than necessary on a wide graph.

The visited-set discipline matters even more. Almost every infinite loop and every quadratic blow-up in graph code comes from marking nodes at the wrong moment or not at all.""",
                    ),
                    (
                        "Mental Model",
                        """One rule decides it.

Does the answer depend on distance? -> yes: BFS -> no: DFS

| | DFS | BFS |
| --- | --- | --- |
| Order | Deep first | By distance |
| Structure | Stack, or recursion | Queue |
| Memory | O(depth) | O(width of the frontier) |
| Shortest path | No | Yes, with uniform edge cost |
| Natural for | Full exploration, path enumeration, cycle detection, topological sort | Shortest path, level-by-level, nearest-anything |

Memory is the secondary consideration: on a deep narrow graph DFS is cheaper; on a wide shallow one BFS is.""",
                    ),
                    (
                        "How It Works",
                        """:::viz graph-traversal {"edges": ["A-B", "A-C", "B-D", "C-D", "C-E", "D-F", "E-F"], "start": "A", "mode": "bfs"}

### DFS template

```java
void dfs(int node, List<List<Integer>> graph, boolean[] visited) {
    visited[node] = true;
    // process node here for pre-order work
    for (int next : graph.get(node)) {
        if (!visited[next]) dfs(next, graph, visited);
    }
    // process node here for post-order work
}
```

Iteratively, when depth is a risk:

```java
void dfsIterative(int start, List<List<Integer>> graph, boolean[] visited) {
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(start);
    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (visited[node]) continue;      // may have been queued twice
        visited[node] = true;
        for (int next : graph.get(node)) {
            if (!visited[next]) stack.push(next);
        }
    }
}
```

Note the `if (visited[node]) continue;` after popping. With a stack, a node can be pushed multiple times before it is first popped, so the check must happen on pop as well.

### BFS template

```java
int bfs(int start, int target, List<List<Integer>> graph) {
    boolean[] visited = new boolean[graph.size()];
    Deque<Integer> queue = new ArrayDeque<>();
    queue.offer(start);
    visited[start] = true;                // mark on ENQUEUE
    int distance = 0;

    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        for (int i = 0; i < levelSize; i++) {
            int node = queue.poll();
            if (node == target) return distance;
            for (int next : graph.get(node)) {
                if (visited[next]) continue;
                visited[next] = true;     // mark immediately
                queue.offer(next);
            }
        }
        distance++;
    }
    return -1;
}
```

### The visited rule

**BFS: mark on enqueue.** If you mark on dequeue, the same node can sit in the queue many times, and the queue grows to O(E) rather than O(V). On a dense graph that is the difference between working and not.

**DFS: mark on entry**, and check again on pop in the iterative form.

**Backtracking is different.** When enumerating paths rather than visiting nodes, you must *unmark* on the way out, because a node excluded from one path may belong to another:

```java
void allPaths(int node, int target, List<List<Integer>> graph,
              boolean[] onPath, List<Integer> path, List<List<Integer>> out) {
    path.add(node);
    onPath[node] = true;
    if (node == target) out.add(new ArrayList<>(path));
    else for (int next : graph.get(node)) {
        if (!onPath[next]) allPaths(next, target, graph, onPath, path, out);
    }
    onPath[node] = false;                 // UNMARK - this is backtracking
    path.remove(path.size() - 1);
}
```

Confusing "visited ever" with "on the current path" is a deep bug: the first gives you reachability, the second gives you path enumeration, and using the wrong one silently gives the wrong answer.

### Connected components

```java
int countComponents(int n, List<List<Integer>> graph) {
    boolean[] visited = new boolean[n];
    int components = 0;
    for (int i = 0; i < n; i++) {         // every node is a candidate start
        if (!visited[i]) { components++; dfs(i, graph, visited); }
    }
    return components;
}
```

The outer loop is essential and frequently forgotten — starting only from node 0 misses every other component.

### Cycle detection

In an **undirected** graph, track the parent so the edge you arrived on does not count as a cycle:

```java
boolean hasCycle(int node, int parent, List<List<Integer>> graph, boolean[] visited) {
    visited[node] = true;
    for (int next : graph.get(node)) {
        if (!visited[next]) {
            if (hasCycle(next, node, graph, visited)) return true;
        } else if (next != parent) {
            return true;                  // a visited neighbour that is not where we came from
        }
    }
    return false;
}
```

In a **directed** graph, that parent trick does not work. You need three states — unvisited, in progress, done — and a cycle is an edge back to a node that is in progress:

```java
// 0 = unvisited, 1 = in progress, 2 = done
boolean hasCycleDirected(int node, List<List<Integer>> graph, int[] state) {
    state[node] = 1;
    for (int next : graph.get(node)) {
        if (state[next] == 1) return true;          // back edge to the current path
        if (state[next] == 0 && hasCycleDirected(next, graph, state)) return true;
    }
    state[node] = 2;
    return false;
}
```

The distinction between "in progress" and "done" is what separates a cycle from a node merely reachable by two different paths, and it is the most common directed-cycle bug.""",
                    ),
                    (
                        "Example",
                        """"Count the number of islands in a grid of land and water."

```java
int numIslands(char[][] grid) {
    if (grid == null || grid.length == 0) return 0;
    int count = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { count++; bfsSink(grid, r, c); }
    return count;
}

private void bfsSink(char[][] grid, int sr, int sc) {
    int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};
    Deque<int[]> queue = new ArrayDeque<>();
    queue.offer(new int[] {sr, sc});
    grid[sr][sc] = '0';                       // mark on enqueue

    while (!queue.isEmpty()) {
        int[] cell = queue.poll();
        for (int[] d : DIRS) {
            int nr = cell[0] + d[0], nc = cell[1] + d[1];
            if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) continue;
            if (grid[nr][nc] != '1') continue;
            grid[nr][nc] = '0';               // mark immediately
            queue.offer(new int[] {nr, nc});
        }
    }
}
// O(rows * cols) time and space
```

What to say: "Each unvisited land cell starts a new component, and the flood fill marks the whole island so it is counted once. I used BFS rather than DFS because a fully-filled 1000-by-1000 grid would recurse a million deep and overflow the stack — the recursive version is shorter but not safe at that size.

I mark cells as water as I enqueue them, which both prevents re-enqueuing and avoids needing a separate visited array. That mutates the input, so if the caller needs the grid intact I would use a `boolean[][]` instead."

The stack-depth justification for choosing BFS is the detail that shows judgement rather than preference.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Connected components, islands, and regions
- Shortest path in unweighted graphs and grids
- Cycle detection
- Reachability and flood fill
- Path enumeration, with backtracking
- Bipartite checking, by two-colouring during traversal""",
                    ),
                    (
                        "Trade-offs",
                        """- **DFS memory versus BFS memory.** O(depth) versus O(width); choose by the graph's shape as well as the question.
- **Recursive versus iterative DFS.** Shorter versus safe on deep graphs.
- **Marking in place versus a visited array.** O(1) extra space versus preserving the input.
- **Visited-ever versus on-path.** Reachability versus path enumeration — a correctness distinction, not a performance one.
- **BFS for shortest path.** Only valid with uniform edge costs; otherwise Dijkstra.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Marking visited on dequeue in BFS
- Forgetting the outer loop over all possible starting nodes
- Using DFS for a shortest-path question
- Using the parent trick for cycle detection in a directed graph
- Failing to unmark when enumerating paths
- Recursing on a large grid and overflowing the stack
- Not checking visited again after popping in iterative DFS""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why did you choose BFS here?"** — Shortest path, or bounded memory on a wide-but-shallow graph, or stack safety.
- **"What is the complexity?"** — O(V + E) with an adjacency list; for a grid, O(rows * cols).
- **"Will this overflow the stack?"** — On a large grid or a path-shaped graph, yes; switch to iterative.
- **"How do you detect a cycle in a directed graph?"** — Three-state DFS, or Kahn's algorithm counting processed nodes.
- **"What if you need all paths, not just one?"** — Backtracking with unmarking, and note that the output can be exponential.""",
                    ),
                    (
                        "Mini Exercise",
                        """Choose DFS or BFS, and state where you mark visited:

1. Count islands in a grid.
2. Shortest path through a maze.
3. Detect a cycle in an undirected graph.
4. Detect a cycle in a directed graph.
5. List all paths from source to target in a DAG.
6. Determine whether a graph is bipartite.
7. Find the largest island after flipping at most one water cell.

Number 7 is a nice composite: label each island with an id and its size in one pass, then for each water cell sum the distinct neighbouring island sizes. The naive approach — flood fill per water cell — is O((rows * cols)^2).""",
                    ),
                    (
                        "Interview Tip",
                        """Say the decision rule out loud: "the answer depends on distance, so BFS" or "I only need reachability, so DFS with less memory". Then immediately state where you mark visited. Those two sentences cover the two things this topic is actually graded on.""",
                    ),
                ],
                [
                    "Choose BFS when the answer depends on distance, DFS otherwise; memory is the tie-breaker.",
                    "Mark visited on enqueue in BFS, and re-check after popping in iterative DFS.",
                    "Path enumeration requires unmarking on the way out — 'on the current path' is not 'visited ever'.",
                    "Directed cycle detection needs three states; the undirected parent trick does not generalise.",
                ],
                [
                    "How do you decide between BFS and DFS?",
                    "Why must BFS mark nodes visited on enqueue?",
                    "How does cycle detection differ between directed and undirected graphs?",
                    "When would a recursive DFS be unsafe?",
                ],
                ["level-walk"],
            ),
            DL(
                "grid-and-multisource-traversal",
                "Grid Traversal and Multi-Source Search",
                "Flood fill, distance maps, boundary tricks, and searching from many origins at once.",
                11,
                "Grid problems are graph problems with computed neighbours, and they have their own repertoire: flood fill, multi-source distance maps, boundary-inward marking, and searches where the state is more than a cell. These patterns cover a large share of all interview grid questions.",
                [
                    (
                        "Why It Matters",
                        """Grids are the most common concrete setting for traversal questions because they are easy to state and easy to visualise. The patterns are few and highly reusable, so recognising which one applies is most of the work.

Multi-source BFS in particular converts a family of problems that look like they need one search per source into a single linear pass, and it is the optimisation interviewers ask for.""",
                    ),
                    (
                        "Mental Model",
                        """Four recurring shapes.

| Shape | Technique |
| --- | --- |
| Count or measure regions | Flood fill per unvisited cell |
| Distance to the nearest X | Multi-source BFS seeded with every X |
| Cells that can reach the edge | Traverse inward from the boundary |
| Path with a resource or constraint | State is (cell, resource), not just cell |

> Memory cue: if the question is "distance to the nearest", seed the queue with every source rather than running one BFS per source.""",
                    ),
                    (
                        "How It Works",
                        """### Flood fill

```java
void floodFill(int[][] image, int r, int c, int from, int to) {
    if (r < 0 || r >= image.length || c < 0 || c >= image[0].length) return;
    if (image[r][c] != from || image[r][c] == to) return;    // guard against infinite recursion
    image[r][c] = to;
    floodFill(image, r + 1, c, from, to);
    floodFill(image, r - 1, c, from, to);
    floodFill(image, r, c + 1, from, to);
    floodFill(image, r, c - 1, from, to);
}
```

The `image[r][c] == to` guard matters: if the new colour equals the old one, the recursion never terminates. It is a genuine edge case that a careless implementation misses.

### Multi-source BFS

```java
// Distance from every cell to the nearest zero
int[][] nearestZero(int[][] grid) {
    int rows = grid.length, cols = grid[0].length;
    int[][] dist = new int[rows][cols];
    Deque<int[]> queue = new ArrayDeque<>();

    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 0) queue.offer(new int[] {r, c});
            else dist[r][c] = -1;                  // -1 marks unvisited
        }

    int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!queue.isEmpty()) {
        int[] cell = queue.poll();
        for (int[] d : DIRS) {
            int nr = cell[0] + d[0], nc = cell[1] + d[1];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (dist[nr][nc] != -1) continue;      // already assigned
            dist[nr][nc] = dist[cell[0]][cell[1]] + 1;
            queue.offer(new int[] {nr, nc});
        }
    }
    return dist;
}
// O(rows * cols) - one pass regardless of how many sources
```

Seeding all zeros at distance 0 means the BFS expands outward from all of them simultaneously, so the first time a cell is reached is via its nearest source. Running one BFS per source would be O(sources * rows * cols).

### Boundary-inward traversal

For problems like "capture all regions not touching the border", it is far easier to find what *is* connected to the border and mark it, then invert.

```java
void solve(char[][] board) {
    int rows = board.length, cols = board[0].length;
    for (int r = 0; r < rows; r++) {
        mark(board, r, 0); mark(board, r, cols - 1);
    }
    for (int c = 0; c < cols; c++) {
        mark(board, 0, c); mark(board, rows - 1, c);
    }
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (board[r][c] == 'O') board[r][c] = 'X';       // enclosed
            else if (board[r][c] == 'S') board[r][c] = 'O';  // safe, restore
        }
}
```

Searching from the boundary inward, rather than testing each region for border contact, converts an awkward "does this region touch the edge?" check into a single traversal. That inversion is the technique.

### State beyond the cell

```java
// Shortest path in a grid where you may remove up to k walls
int shortestPath(int[][] grid, int k) {
    int rows = grid.length, cols = grid[0].length;
    boolean[][][] seen = new boolean[rows][cols][k + 1];      // third dimension: walls used
    Deque<int[]> queue = new ArrayDeque<>();                  // {row, col, wallsUsed}
    queue.offer(new int[] {0, 0, 0});
    seen[0][0][0] = true;
    int steps = 0;

    int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            int[] cur = queue.poll();
            if (cur[0] == rows - 1 && cur[1] == cols - 1) return steps;
            for (int[] d : DIRS) {
                int nr = cur[0] + d[0], nc = cur[1] + d[1];
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                int used = cur[2] + grid[nr][nc];             // 1 if it is a wall
                if (used > k || seen[nr][nc][used]) continue;
                seen[nr][nc][used] = true;
                queue.offer(new int[] {nr, nc, used});
            }
        }
        steps++;
    }
    return -1;
}
```

The three-dimensional visited array is the whole solution. Reaching the same cell having used fewer walls is a genuinely better state, so the two must not be conflated — and using a two-dimensional visited array produces a plausible-looking answer that is wrong.

### Diagonal and eight-direction movement

```java
int[][] EIGHT = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};
```

Read the problem carefully: "adjacent" usually means four directions, but island problems occasionally specify eight, and the difference changes the answer.""",
                    ),
                    (
                        "Example",
                        """"Given a grid where 1 is land and 0 is water, find the largest island you can create by flipping at most one water cell to land."

The naive approach flood-fills for every water cell: O((rows * cols)^2). The two-pass approach is linear:

```java
int largestIsland(int[][] grid) {
    int n = grid.length, id = 2;                      // ids start at 2 to avoid 0 and 1
    Map<Integer, Integer> sizes = new HashMap<>();

    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++)
            if (grid[r][c] == 1) sizes.put(id, paint(grid, r, c, id++));

    int best = sizes.values().stream().max(Integer::compare).orElse(0);
    int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};

    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++) {
            if (grid[r][c] != 0) continue;
            Set<Integer> neighbours = new HashSet<>();    // distinct islands only
            for (int[] d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                if (grid[nr][nc] > 1) neighbours.add(grid[nr][nc]);
            }
            int total = 1;
            for (int islandId : neighbours) total += sizes.get(islandId);
            best = Math.max(best, total);
        }
    return best;
}
// O(n^2) time and space
```

What to say: "Painting each island with a distinct id and recording its size lets me evaluate a candidate flip in constant time — sum the sizes of the distinct neighbouring islands plus one. The `Set` is essential because two neighbouring cells may belong to the same island, and counting it twice would overstate the result.

Starting ids at 2 avoids colliding with the existing 0 and 1 values, so the grid itself stores the labels and no extra array is needed."

The duplicate-neighbour subtlety is the trap, and the id-painting technique generalises to many grid problems.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Counting or measuring regions
- Distance maps and nearest-source queries
- Spreading processes: infection, fire, water
- Escape and enclosure problems
- Pathfinding with resources or obstacles
- Image processing operations""",
                    ),
                    (
                        "Trade-offs",
                        """- **Marking in place versus a visited array.** No extra memory versus preserving the caller's grid.
- **Multi-source versus repeated single-source.** One pass versus one per source — a factor equal to the number of sources.
- **DFS versus BFS on grids.** DFS is shorter; BFS is stack-safe and gives distances.
- **Extra state dimensions.** Correctness for problems with resources, at the cost of multiplying the visited array.
- **Boundary-inward versus per-region checks.** One traversal versus a check per region.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Missing the guard when the fill colour equals the original
- Running one BFS per source instead of seeding them all
- Using a two-dimensional visited array when the state has a third dimension
- Counting a duplicate neighbouring island twice
- Mutating the grid when the caller needs it preserved
- Assuming four-directional adjacency when the problem says eight
- Recursing on a large grid and overflowing the stack""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do it without extra space?"** — Mark in the grid itself, and say that it mutates the input.
- **"What if there are many sources?"** — Multi-source BFS, one pass.
- **"What if you can remove k obstacles?"** — Add a dimension to the state and to the visited array.
- **"What if the grid is very large?"** — BFS rather than recursive DFS, for stack safety.
- **"What is the complexity?"** — O(rows * cols), or multiplied by the extra state dimension.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Count islands.
2. Flood fill a region with a new colour.
3. Distance from every cell to the nearest zero.
4. Rotting oranges: minutes until none are fresh.
5. Capture all regions not connected to the border.
6. Shortest path removing at most k walls.
7. Largest island after flipping one water cell.

For each, state whether it is single-source, multi-source, boundary-inward, or extra-state. Categorising them is the point — the code is nearly identical across all seven.""",
                    ),
                    (
                        "Interview Tip",
                        """Write the direction array and the bounds check as a helper before anything else, then say which of the four grid shapes this problem is. Both take fifteen seconds and both eliminate the mistakes that actually cost marks here.""",
                    ),
                ],
                [
                    "Seed the queue with every source for distance-to-nearest problems — one pass instead of one per source.",
                    "Traverse inward from the boundary when the question is about what does or does not reach the edge.",
                    "When a cell can be reached in meaningfully different conditions, add a dimension to the visited array.",
                    "Prefer BFS on large grids: a recursive flood fill on a million cells overflows the stack.",
                ],
                [
                    "How do you compute the distance from every cell to the nearest source?",
                    "How do you handle a grid path problem where you may remove k obstacles?",
                    "Why traverse from the boundary inward for enclosure problems?",
                    "When is a recursive flood fill unsafe?",
                ],
            ),
        ],
        practice_tag="tree",
    )


def _advanced_graphs_topic() -> dict:
    return _dsa_topic(
        "advanced-graphs",
        "Advanced Graphs",
        "Union-find, topological sort, and shortest paths on weighted graphs.",
        "HARD",
        20,
        [
            DL(
                "union-find",
                "Union-Find (Disjoint Set Union)",
                "Near-constant-time connectivity queries, and the problems that are trivial with it and awkward without.",
                12,
                "Union-find answers one question extremely well: are these two elements in the same group? It supports merging groups and querying membership in near-constant amortised time, which makes it the right structure whenever connectivity changes incrementally rather than being fixed up front.",
                [
                    (
                        "Why It Matters",
                        """Connectivity by traversal requires a full DFS or BFS per query. Union-find answers each query in effectively constant time and handles edges arriving one at a time, which traversal cannot do without redoing the work.

It is also the enabling structure for Kruskal's minimum spanning tree, for detecting cycles as edges arrive, and for a family of problems — accounts merge, equations satisfiability, redundant connection — that are otherwise fiddly.""",
                    ),
                    (
                        "Mental Model",
                        """Each group is a tree; the root is the group's identity.

find(x) -> walk to the root -> two elements are connected iff they share a root

Two optimisations turn it from O(n) to effectively O(1):

- **Path compression**: after a find, point every node on the path directly at the root.
- **Union by rank or size**: always attach the smaller tree under the larger, so trees stay shallow.

Together the amortised cost per operation is the inverse Ackermann function, which is below 5 for any input that fits in the universe. Saying "effectively constant, technically inverse Ackermann" is the precise answer.""",
                    ),
                    (
                        "How It Works",
                        """:::viz union-find {"n": 7, "ops": ["U:0-1", "U:2-3", "U:1-3", "U:4-5", "F:0", "U:5-6", "U:3-6", "F:6"]}

### Implementation

```java
class UnionFind {
    private final int[] parent;
    private final int[] size;
    private int components;

    UnionFind(int n) {
        parent = new int[n];
        size = new int[n];
        components = n;
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    }

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving - compresses as it walks
            x = parent[x];
        }
        return x;
    }

    boolean union(int a, int b) {
        int rootA = find(a), rootB = find(b);
        if (rootA == rootB) return false;    // already connected
        if (size[rootA] < size[rootB]) { int t = rootA; rootA = rootB; rootB = t; }
        parent[rootB] = rootA;               // smaller under larger
        size[rootA] += size[rootB];
        components--;
        return true;
    }

    boolean connected(int a, int b) { return find(a) == find(b); }
    int componentCount() { return components; }
    int componentSize(int x) { return size[find(x)]; }
}
```

Three details worth pointing out:

1. **Path halving** — `parent[x] = parent[parent[x]]` — compresses during the walk without a second pass or recursion. It is simpler than full path compression and asymptotically equivalent.
2. **`union` returning a boolean** tells you whether the edge was redundant, which directly answers cycle-detection questions.
3. **Maintaining `components` and `size`** costs nothing and answers "how many groups?" and "how big is this group?" for free.

### Cycle detection as edges arrive

```java
// Redundant connection: return the edge that creates a cycle
int[] findRedundantConnection(int[][] edges) {
    UnionFind uf = new UnionFind(edges.length + 1);
    for (int[] e : edges) {
        if (!uf.union(e[0], e[1])) return e;   // both endpoints already connected
    }
    return new int[0];
}
```

A union that returns false means the two endpoints were already in the same component, so this edge closes a cycle. That is a two-line solution to a problem that is awkward with traversal.

### Kruskal's minimum spanning tree

```java
int minimumSpanningTree(int n, int[][] edges) {
    Arrays.sort(edges, Comparator.comparingInt(e -> e[2]));   // by weight
    UnionFind uf = new UnionFind(n);
    int total = 0, used = 0;
    for (int[] e : edges) {
        if (uf.union(e[0], e[1])) {
            total += e[2];
            if (++used == n - 1) break;        // a spanning tree has n-1 edges
        }
    }
    return used == n - 1 ? total : -1;         // -1 if the graph is disconnected
}
// O(E log E) dominated by the sort
```

The greedy argument: taking the cheapest edge that does not create a cycle is always safe, because any spanning tree not containing it can be improved by swapping that edge in. Union-find is exactly the "does this create a cycle?" test.

### When union-find is the wrong tool

- **Edges are removed.** Union-find has no efficient delete. Removal problems are usually solved by processing in reverse and adding instead — a genuinely useful trick worth knowing.
- **You need the actual path**, not just connectivity. Union-find loses path information; use BFS or DFS.
- **Directed reachability.** Union-find models undirected connectivity only.

### Weighted union-find

Storing a weight relative to the parent lets you answer relational queries, such as "is this set of equalities and inequalities satisfiable?" or "what is a / b given a chain of ratios?". It is a genuine generalisation and worth naming if a problem involves relations rather than plain grouping.""",
                    ),
                    (
                        "Example",
                        """"Given a list of accounts where each has a name and a list of emails, merge accounts that share any email."

```java
List<List<String>> accountsMerge(List<List<String>> accounts) {
    Map<String, Integer> emailToId = new HashMap<>();
    Map<String, String> emailToName = new HashMap<>();
    int id = 0;
    for (List<String> account : accounts) {
        String name = account.get(0);
        for (int i = 1; i < account.size(); i++) {
            String email = account.get(i);
            emailToName.put(email, name);
            emailToId.putIfAbsent(email, id++);
        }
    }

    UnionFind uf = new UnionFind(id);
    for (List<String> account : accounts) {
        int first = emailToId.get(account.get(1));
        for (int i = 2; i < account.size(); i++) {
            uf.union(first, emailToId.get(account.get(i)));    // same account = same group
        }
    }

    Map<Integer, List<String>> groups = new HashMap<>();
    for (var entry : emailToId.entrySet()) {
        groups.computeIfAbsent(uf.find(entry.getValue()), k -> new ArrayList<>())
              .add(entry.getKey());
    }

    List<List<String>> out = new ArrayList<>();
    for (List<String> emails : groups.values()) {
        Collections.sort(emails);
        List<String> merged = new ArrayList<>();
        merged.add(emailToName.get(emails.get(0)));
        merged.addAll(emails);
        out.add(merged);
    }
    return out;
}
```

What to say: "Emails are the nodes. Two emails in the same account are connected, so I union every email in an account with the first one. Union-find then groups all transitively connected emails, which is exactly the merge semantics — if account A and account B share one email, everything in both belongs together.

I map emails to integer ids because union-find works over a dense index range. The name comes from any email in the group, since the problem guarantees a shared name."

The transitive-merge property is what makes union-find the right tool here; doing this with traversal would require building a graph and running a component search, which is more code for the same result.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Connected components when edges arrive incrementally
- Cycle detection in an undirected graph
- Kruskal's minimum spanning tree
- Merging entities by shared attributes
- Equivalence and equality constraint satisfaction
- Counting islands as land is added one cell at a time""",
                    ),
                    (
                        "Trade-offs",
                        """- **Union-find versus traversal.** Near-constant incremental queries versus one pass that also gives paths and distances.
- **Path compression cost.** Mutates the structure during a read, which matters only for concurrent use.
- **No deletion.** If edges can be removed, process in reverse or use a different structure.
- **Dense integer ids required.** Non-integer nodes need a mapping layer.
- **Undirected only.** Directed reachability needs a different approach entirely.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Omitting path compression or union by size, making find O(n)
- Unioning without checking whether the roots already match
- Comparing `parent[a] == parent[b]` instead of `find(a) == find(b)`
- Forgetting to map non-integer nodes to a dense id range
- Trying to delete edges
- Using it for directed graphs""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What is the complexity?"** — Effectively constant amortised, formally inverse Ackermann, with both optimisations.
- **"What if edges can be removed?"** — Union-find cannot; process offline in reverse, adding instead of removing.
- **"How do you count components?"** — Start at n and decrement on each successful union.
- **"Why union by size?"** — Keeps trees shallow, bounding the find path length.
- **"Could you do this with DFS?"** — Yes for a static graph, at O(V + E) per query set; union-find wins when edges arrive incrementally.""",
                    ),
                    (
                        "Mini Exercise",
                        """Solve each with union-find:

1. Count connected components in an undirected graph.
2. Find the edge that creates a cycle.
3. Build a minimum spanning tree.
4. Merge accounts sharing an email.
5. Determine whether a set of equality and inequality equations is satisfiable.
6. Count islands after each land cell is added, returning the count at every step.

Number 6 is the one that shows union-find's advantage clearly: recomputing components after each addition with DFS is O(k * rows * cols), while union-find is effectively O(k).""",
                    ),
                    (
                        "Interview Tip",
                        """When a problem involves grouping or "are these connected", say "this is union-find" and then write the class from memory — it is twenty lines and having it fluent frees your whole remaining time for the actual problem.""",
                    ),
                ],
                [
                    "Union-find gives effectively constant amortised connectivity queries with path compression and union by size.",
                    "A union that returns false means the edge was redundant — that is cycle detection for free.",
                    "It is the cycle test inside Kruskal's minimum spanning tree.",
                    "It cannot delete edges; for removal problems, process offline in reverse order.",
                ],
                [
                    "What is the complexity of union-find, and what makes it that fast?",
                    "How do you detect a cycle as edges arrive one at a time?",
                    "How does Kruskal's algorithm use union-find?",
                    "What can union-find not do?",
                ],
            ),
            DL(
                "topological-sort",
                "Topological Sort",
                "Ordering with dependencies, detecting cycles, and the two algorithms that do both.",
                12,
                "A topological order lists the nodes of a directed acyclic graph so that every edge points forward. It is the answer to every dependency problem — build order, course prerequisites, task scheduling — and it doubles as a cycle detector, because an ordering exists if and only if the graph is acyclic.",
                [
                    (
                        "Why It Matters",
                        """"Can these courses be completed?" and "in what order should these tasks run?" are the same question, and both are topological sort. The pairing with cycle detection is what makes it so useful: the algorithm either produces an order or proves that none exists.

It is also a common building block for DAG dynamic programming, where processing nodes in topological order guarantees that dependencies are resolved before they are needed.""",
                    ),
                    (
                        "Mental Model",
                        """Repeatedly take a node with no unmet dependencies.

in-degree 0 → emit → remove its edges → repeat

Two implementations:

| Algorithm | Approach | Cycle detection |
| --- | --- | --- |
| Kahn's (BFS) | Repeatedly emit in-degree-zero nodes | Fewer than n emitted means a cycle |
| DFS | Post-order, then reverse | A back edge to an in-progress node |

Both are O(V + E). Kahn's is easier to reason about and naturally detects cycles; the DFS version is shorter.""",
                    ),
                    (
                        "How It Works",
                        """:::viz topological-sort {"edges": ["A>B", "A>C", "B>D", "C>D", "D>E", "F>C"]}

### Kahn's algorithm

```java
int[] topologicalSort(int n, int[][] edges) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    int[] inDegree = new int[n];

    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);      // e[0] must come before e[1]
        inDegree[e[1]]++;
    }

    Deque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (inDegree[i] == 0) queue.offer(i);

    int[] order = new int[n];
    int index = 0;
    while (!queue.isEmpty()) {
        int node = queue.poll();
        order[index++] = node;
        for (int next : graph.get(node)) {
            if (--inDegree[next] == 0) queue.offer(next);   // last dependency satisfied
        }
    }
    return index == n ? order : new int[0];   // fewer than n means a cycle
}
// O(V + E) time and space
```

Cycle detection: the `index == n` check catches it, because nodes inside a cycle never reach in-degree zero and so are never emitted.

Decrementing the in-degree and enqueuing only when it hits zero is the core idea — a node becomes available exactly when its last prerequisite is emitted.

### DFS-based topological sort

```java
boolean dfs(int node, List<List<Integer>> graph, int[] state, Deque<Integer> out) {
    state[node] = 1;                              // in progress
    for (int next : graph.get(node)) {
        if (state[next] == 1) return false;       // back edge: cycle
        if (state[next] == 0 && !dfs(next, graph, state, out)) return false;
    }
    state[node] = 2;                              // done
    out.push(node);                               // push AFTER all descendants
    return true;
}
```

Pushing in post-order and reading the stack gives the reverse post-order, which is a valid topological order. The three-state marking is what distinguishes a cycle from a node reachable by two paths.

### Lexicographically smallest order

Replace the queue with a priority queue:

```java
PriorityQueue<Integer> available = new PriorityQueue<>();
```

Now, among all currently available nodes, the smallest is emitted first. The cost rises to O(V log V + E). This is a standard follow-up, and it is a one-line change — worth noting because it shows the structure of the algorithm is unchanged.

### Uniqueness of the order

The topological order is unique exactly when the queue contains at most one node at every step. If it ever holds two, there are multiple valid orders. Checking `queue.size() > 1` answers "is the ordering unique?" — another common follow-up with a one-line answer.

### Longest path in a DAG

Once nodes are in topological order, dynamic programming over them is trivial, because every predecessor is processed first:

```java
// Longest path ending at each node
for (int node : topologicalOrder) {
    for (int next : graph.get(node)) {
        longest[next] = Math.max(longest[next], longest[node] + 1);
    }
}
```

Longest path is NP-hard in general graphs and linear in a DAG, and that contrast is worth stating — it is the reason topological order matters beyond scheduling.

### Course schedule, the canonical framing

```java
boolean canFinish(int numCourses, int[][] prerequisites) {
    // prerequisites[i] = [course, requiredFirst]
    // edge from requiredFirst -> course
    return topologicalSort(numCourses, flip(prerequisites)).length == numCourses;
}
```

The edge direction is the detail that trips people: the prerequisite points at the dependent course, so the ordering emits prerequisites first. Getting it backwards still detects cycles correctly but produces a reversed order.""",
                    ),
                    (
                        "Example",
                        """"There is a new alien language using the English letters in an unknown order. Given a list of words sorted lexicographically in that language, derive the letter order."

```java
String alienOrder(String[] words) {
    Map<Character, Set<Character>> graph = new HashMap<>();
    Map<Character, Integer> inDegree = new HashMap<>();
    for (String w : words)
        for (char c : w.toCharArray()) {
            graph.putIfAbsent(c, new HashSet<>());
            inDegree.putIfAbsent(c, 0);
        }

    for (int i = 0; i + 1 < words.length; i++) {
        String a = words[i], b = words[i + 1];
        if (a.length() > b.length() && a.startsWith(b)) return "";   // invalid input
        for (int j = 0; j < Math.min(a.length(), b.length()); j++) {
            char x = a.charAt(j), y = b.charAt(j);
            if (x != y) {
                if (graph.get(x).add(y)) inDegree.merge(y, 1, Integer::sum);
                break;                       // only the FIRST difference is informative
            }
        }
    }

    Deque<Character> queue = new ArrayDeque<>();
    for (var e : inDegree.entrySet()) if (e.getValue() == 0) queue.offer(e.getKey());

    StringBuilder sb = new StringBuilder();
    while (!queue.isEmpty()) {
        char c = queue.poll();
        sb.append(c);
        for (char next : graph.get(c)) {
            if (inDegree.merge(next, -1, Integer::sum) == 0) queue.offer(next);
        }
    }
    return sb.length() == inDegree.size() ? sb.toString() : "";   // cycle
}
```

Three points worth narrating: only the first differing character between adjacent words gives an ordering constraint — everything after it is unconstrained; the prefix case (`"abc"` before `"ab"`) is invalid input and must be rejected explicitly; and the `add` returning true prevents double-counting a duplicate edge into the in-degree.

That last one is a real bug source — adding the same edge twice inflates the in-degree so the node is never emitted, and the function wrongly reports a cycle.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Build systems and dependency resolution
- Course and task scheduling
- Detecting circular dependencies
- Deriving an order from pairwise constraints
- DAG dynamic programming, including longest path""",
                    ),
                    (
                        "Trade-offs",
                        """- **Kahn's versus DFS.** Iterative with natural cycle detection, versus shorter code with recursion-depth risk.
- **Queue versus priority queue.** Any valid order at O(V + E), versus the lexicographically smallest at O(V log V + E).
- **Detecting a cycle versus reporting it.** Kahn's tells you a cycle exists; DFS can report the nodes involved by tracking the current path.
- **Building in-degrees.** A small extra pass that makes the algorithm much easier to reason about.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Reversing the edge direction, producing a backwards order
- Double-counting duplicate edges in the in-degree
- Forgetting the cycle check, returning a partial order as if it were complete
- Missing isolated nodes, which have in-degree zero and must still be emitted
- Comparing all pairs of words instead of adjacent ones
- Not rejecting the invalid prefix case in the alien-dictionary problem""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you know there is a cycle?"** — Fewer than n nodes emitted, or a back edge to an in-progress node.
- **"What if several orders are valid?"** — Any is acceptable unless specified; use a priority queue for the lexicographically smallest.
- **"Is the order unique?"** — Only if the available set never holds more than one node.
- **"Can you report which nodes form the cycle?"** — With DFS, yes: the current recursion path when the back edge is found.
- **"How would you parallelise the schedule?"** — Each Kahn's level is a set of independent tasks that can run concurrently; the number of levels is the critical path length.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Determine whether all courses can be finished.
2. Return a valid course order.
3. Return the lexicographically smallest valid order.
4. Derive the alien alphabet from sorted words.
5. Find the minimum number of semesters if unlimited courses can be taken in parallel.
6. Find the longest chain of dependencies.

Number 5 is the level-counting variant: each Kahn's level is one semester, so the answer is the number of BFS levels, which is also the length of the longest path.""",
                    ),
                    (
                        "Interview Tip",
                        """State the edge direction explicitly before coding — "the edge goes from prerequisite to dependent, so prerequisites are emitted first". It is the single most common error in this topic, and saying it out loud both prevents it and shows you know it is a decision.""",
                    ),
                ],
                [
                    "Topological sort orders a DAG so every edge points forward, and fails exactly when a cycle exists.",
                    "Kahn's algorithm emits in-degree-zero nodes; emitting fewer than n proves a cycle.",
                    "Swap the queue for a priority queue to get the lexicographically smallest order.",
                    "Processing in topological order makes DAG dynamic programming, including longest path, linear.",
                ],
                [
                    "How do you produce a valid ordering with dependencies?",
                    "How does topological sort detect a cycle?",
                    "How would you get the lexicographically smallest valid order?",
                    "How do you know whether the ordering is unique?",
                ],
            ),
            DL(
                "shortest-paths",
                "Weighted Shortest Paths and Spanning Trees",
                "Dijkstra, 0-1 BFS, Bellman-Ford, and when each one is the right tool.",
                14,
                "BFS finds shortest paths only when every edge costs the same. Once weights differ, you need an algorithm that considers cost rather than hop count. Dijkstra handles non-negative weights, Bellman-Ford handles negative ones and detects negative cycles, and there are cheaper specialised options when the weights are constrained.",
                [
                    (
                        "Why It Matters",
                        """Using BFS on a weighted graph is a silent correctness bug — it returns a path, just not the cheapest one. Recognising that weights change the algorithm is the first thing being tested.

The choice between the algorithms is the second. Each has a specific condition attached, and naming that condition is what distinguishes knowing the names from knowing the tools.""",
                    ),
                    (
                        "Mental Model",
                        """Pick by the weights.

| Weights | Algorithm | Complexity |
| --- | --- | --- |
| All equal | BFS | O(V + E) |
| Only 0 and 1 | 0-1 BFS with a deque | O(V + E) |
| Non-negative | Dijkstra with a heap | O((V + E) log V) |
| May be negative | Bellman-Ford | O(V * E) |
| Negative cycle detection needed | Bellman-Ford | O(V * E) |
| All pairs, small V | Floyd-Warshall | O(V^3) |
| Bounded number of edges in the path | Bellman-Ford style relaxation | O(k * E) |

> Memory cue: Dijkstra's correctness depends on non-negative weights. With a negative edge, a node finalised early may later be improvable, and the greedy argument collapses.""",
                    ),
                    (
                        "How It Works",
                        """:::viz dijkstra {"edges": ["A-B:4", "A-C:1", "C-B:2", "B-D:5", "C-D:8", "D-E:3", "C-E:10"], "start": "A"}

### Dijkstra

```java
int[] dijkstra(int n, List<int[]>[] graph, int source) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[source] = 0;

    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));
    pq.offer(new int[] {source, 0});

    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int node = top[0], d = top[1];
        if (d > dist[node]) continue;                 // stale entry - skip

        for (int[] edge : graph[node]) {
            int next = edge[0], weight = edge[1];
            if (dist[node] + weight < dist[next]) {
                dist[next] = dist[node] + weight;
                pq.offer(new int[] {next, dist[next]});
            }
        }
    }
    return dist;
}
// O((V + E) log V) with a binary heap
```

Two implementation points that matter:

1. **The stale-entry check.** Java's `PriorityQueue` has no decrease-key, so the standard approach pushes a new entry and skips outdated ones on poll. Without that check the algorithm still works but wastes time re-relaxing.
2. **Finality.** Once a node is polled with its current best distance, that distance is final — because all weights are non-negative, no later path can be shorter. That is the correctness argument, and it is exactly what negative weights break.

### 0-1 BFS

When edges cost only 0 or 1, a deque replaces the heap and the complexity drops to linear:

```java
int zeroOneBfs(int n, List<int[]>[] graph, int source, int target) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[source] = 0;

    Deque<Integer> deque = new ArrayDeque<>();
    deque.offerFirst(source);

    while (!deque.isEmpty()) {
        int node = deque.pollFirst();
        for (int[] edge : graph[node]) {
            int next = edge[0], weight = edge[1];
            if (dist[node] + weight < dist[next]) {
                dist[next] = dist[node] + weight;
                if (weight == 0) deque.offerFirst(next);   // free move: front
                else deque.offerLast(next);                // costly move: back
            }
        }
    }
    return dist[target];
}
```

Pushing zero-weight moves to the front preserves the same ordering property a heap would give, without the log factor. This is the right answer for grid problems like "minimum obstacle removals to reach the exit", and recognising it is a strong signal.

### Bellman-Ford

```java
int[] bellmanFord(int n, int[][] edges, int source) {
    long[] dist = new long[n];
    Arrays.fill(dist, Long.MAX_VALUE / 2);
    dist[source] = 0;

    for (int i = 0; i < n - 1; i++) {               // n-1 rounds suffice
        boolean changed = false;
        for (int[] e : edges) {
            if (dist[e[0]] + e[2] < dist[e[1]]) {
                dist[e[1]] = dist[e[0]] + e[2];
                changed = true;
            }
        }
        if (!changed) break;                         // early exit when stable
    }

    for (int[] e : edges) {                          // one more round detects negatives
        if (dist[e[0]] + e[2] < dist[e[1]]) return null;   // negative cycle
    }
    return Arrays.stream(dist).mapToInt(d -> (int) d).toArray();
}
// O(V * E)
```

Why `n - 1` rounds: a shortest path has at most `n - 1` edges, and each round guarantees that paths of one more edge are correct. An improvement on round n therefore proves a negative cycle.

### Bounded-stop variant

"Cheapest flight with at most k stops" is Bellman-Ford with exactly `k + 1` rounds, and the crucial detail is relaxing against a snapshot of the previous round:

```java
int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    for (int round = 0; round <= k; round++) {
        int[] previous = dist.clone();               // ESSENTIAL
        for (int[] f : flights) {
            if (previous[f[0]] == Integer.MAX_VALUE) continue;
            dist[f[1]] = Math.min(dist[f[1]], previous[f[0]] + f[2]);
        }
    }
    return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
}
```

Without the clone, a path could use more than `k + 1` edges within a single round, because a value updated earlier in the same pass gets used again. That is the classic bug in this problem and worth calling out explicitly.

### Floyd-Warshall

```java
for (int k = 0; k < n; k++)
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
// O(V^3), all pairs, handles negative edges (not negative cycles)
```

The loop order matters: `k` must be outermost, because it represents "paths allowed to use intermediate nodes up to k". Three lines, and useful whenever V is small and you need all pairs.

### Prim's minimum spanning tree

Dijkstra's shape with one change — the priority is the edge weight rather than the accumulated distance:

```java
// pq holds {node, edgeWeight}; add the cheapest edge leaving the current tree
```

Prim's is better for dense graphs; Kruskal's with union-find is better for sparse ones and is usually easier to write.""",
                    ),
                    (
                        "Example",
                        """"A network of n nodes; a signal sent from node k takes `time[i]` along each directed edge. How long until all nodes receive it, or -1 if some never do?"

```java
int networkDelayTime(int[][] times, int n, int k) {
    List<int[]>[] graph = new List[n + 1];
    for (int i = 1; i <= n; i++) graph[i] = new ArrayList<>();
    for (int[] t : times) graph[t[0]].add(new int[] {t[1], t[2]});

    int[] dist = new int[n + 1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[k] = 0;

    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));
    pq.offer(new int[] {k, 0});

    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        if (top[1] > dist[top[0]]) continue;
        for (int[] e : graph[top[0]]) {
            int nd = top[1] + e[1];
            if (nd < dist[e[0]]) { dist[e[0]] = nd; pq.offer(new int[] {e[0], nd}); }
        }
    }

    int max = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == Integer.MAX_VALUE) return -1;    // unreachable
        max = Math.max(max, dist[i]);
    }
    return max;
}
// O((V + E) log V)
```

What to say: "The signal reaches each node along its shortest path, so the answer is the maximum over all shortest-path distances from the source. Weights are positive travel times, so Dijkstra applies. Any node still at infinity is unreachable, which is the -1 case.

If weights could be negative — which would not make physical sense here — Dijkstra would be invalid and I would use Bellman-Ford at O(V * E)."

Naming the condition that justifies Dijkstra, and what you would use instead, is the complete answer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Routing and navigation with costs
- Cheapest path with constraints on hops
- Network latency and propagation
- Currency arbitrage detection, via negative cycles
- Minimum cost to connect all nodes, via a spanning tree
- Grid paths where moves have different costs""",
                    ),
                    (
                        "Trade-offs",
                        """- **Dijkstra versus Bellman-Ford.** Much faster and requires non-negative weights, versus slower and handles negatives plus cycle detection.
- **Heap versus deque.** The log factor disappears when weights are only 0 and 1.
- **Single-source versus all-pairs.** Dijkstra from every node is O(V * (V + E) log V); Floyd-Warshall is O(V^3) and simpler when V is small.
- **Prim's versus Kruskal's.** Dense versus sparse, and Kruskal's is usually easier to write given union-find.
- **Stale entries versus decrease-key.** Extra heap entries cost memory and avoid needing an indexed priority queue.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using BFS on a weighted graph
- Using Dijkstra with negative weights
- Omitting the stale-entry check, or worse, using a visited set that blocks legitimate improvements
- Forgetting to clone the distance array in the bounded-stops variant
- Integer overflow when summing large weights — use `long`
- Wrong loop order in Floyd-Warshall
- Not handling unreachable nodes""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why not BFS?"** — Edge weights differ, so hop count is not cost.
- **"What if weights can be negative?"** — Bellman-Ford; Dijkstra's finality argument fails.
- **"What if there is a negative cycle?"** — No shortest path exists; Bellman-Ford detects it with one extra round.
- **"What if weights are only 0 and 1?"** — 0-1 BFS with a deque, linear time.
- **"What if you need at most k edges?"** — Bellman-Ford with k+1 rounds over a snapshot.
- **"What is the complexity with a Fibonacci heap?"** — O(E + V log V) in theory; binary heaps are faster in practice at interview scales.""",
                    ),
                    (
                        "Mini Exercise",
                        """Choose the algorithm and justify it:

1. Shortest path in an unweighted maze.
2. Cheapest flight route with no constraints.
3. Cheapest flight with at most k stops.
4. Detecting currency arbitrage.
5. Minimum effort path where cost is the maximum elevation change along the route.
6. Minimum cost to connect all points.
7. Shortest path in a grid where some cells cost 1 to enter and others are free.

Number 5 is a variant worth noticing: the path cost is a maximum rather than a sum, and Dijkstra still works with the relaxation changed from addition to `max` — the algorithm generalises to any cost function that is monotone and non-decreasing along a path.""",
                    ),
                    (
                        "Interview Tip",
                        """Before choosing, say the weight condition out loud: "all weights are non-negative, so Dijkstra is valid." That single clause is the correctness argument, and it shows you know the algorithms are distinguished by their preconditions rather than their speed.""",
                    ),
                ],
                [
                    "BFS is only correct when all edges cost the same; weights require Dijkstra or Bellman-Ford.",
                    "Dijkstra depends on non-negative weights — that is what makes a polled node's distance final.",
                    "0-1 weights allow a deque instead of a heap, giving linear time.",
                    "Bounded-stop shortest paths need a snapshot of the previous round, or paths exceed the hop limit.",
                ],
                [
                    "Why can you not use BFS on a weighted graph?",
                    "Why does Dijkstra require non-negative weights?",
                    "How do you find the cheapest path with at most k stops?",
                    "How would you detect a negative cycle?",
                ],
            ),
        ],
        roadmap_key="advanced-graphs",
        practice_tag="tree",
    )


def _backtracking_topic() -> dict:
    return _dsa_topic(
        "backtracking",
        "Backtracking",
        "Systematic enumeration with undo, the templates for subsets, permutations and combinations, and pruning.",
        "MEDIUM",
        21,
        [
            DL(
                "choose-explore-unchoose",
                "Choose, Explore, Unchoose",
                "The three-line skeleton that generates every valid configuration exactly once.",
                13,
                "Backtracking builds a candidate solution incrementally and abandons a partial candidate as soon as it cannot be completed. The implementation is always the same three steps — make a choice, recurse, undo the choice — and the design work is deciding what a choice is and when to prune.",
                [
                    (
                        "Why It Matters",
                        """Whenever a problem asks for *all* solutions, or for a valid configuration under constraints, backtracking is the technique. Subsets, permutations, combinations, N-Queens, Sudoku, word search, and partitioning problems are all the same skeleton.

Candidates who know the skeleton write these quickly and correctly. Candidates who improvise typically produce duplicates, miss the undo, or mutate shared state and cannot work out why the output is wrong.""",
                    ),
                    (
                        "Mental Model",
                        """A depth-first search over a tree of partial solutions.

choose → explore → unchoose

```java
void backtrack(State state) {
    if (isComplete(state)) { record(state); return; }
    for (Choice choice : choicesFrom(state)) {
        if (!isValid(choice, state)) continue;   // prune
        apply(choice, state);                    // choose
        backtrack(state);                        // explore
        undo(choice, state);                     // unchoose
    }
}
```

Four questions define any backtracking solution:

1. What is a partial state?
2. What choices extend it?
3. When is it complete?
4. What makes a choice invalid — the pruning rule?""",
                    ),
                    (
                        "How It Works",
                        """### Subsets

```java
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> out = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), out);
    return out;
}

void backtrack(int[] nums, int start, List<Integer> current, List<List<Integer>> out) {
    out.add(new ArrayList<>(current));            // every node is a valid subset
    for (int i = start; i < nums.length; i++) {
        current.add(nums[i]);                      // choose
        backtrack(nums, i + 1, current, out);      // explore - i+1 prevents reuse
        current.remove(current.size() - 1);        // unchoose
    }
}
// O(n * 2^n) time - 2^n subsets, each up to O(n) to copy
```

Two details: `new ArrayList<>(current)` copies, because `current` is mutated afterwards — adding `current` directly puts the same reference in every result. And `start` prevents generating the same subset in a different order.

### Permutations

```java
void permute(int[] nums, boolean[] used, List<Integer> current, List<List<Integer>> out) {
    if (current.size() == nums.length) { out.add(new ArrayList<>(current)); return; }
    for (int i = 0; i < nums.length; i++) {        // start from 0 - order matters
        if (used[i]) continue;
        used[i] = true;
        current.add(nums[i]);
        permute(nums, used, current, out);
        current.remove(current.size() - 1);
        used[i] = false;
    }
}
// O(n * n!) time
```

The difference from subsets is exactly one thing: permutations loop from 0 with a `used` array because order matters, while subsets loop from `start` because it does not. Understanding that single distinction covers most of the family.

### Combinations

```java
void combine(int n, int k, int start, List<Integer> current, List<List<Integer>> out) {
    if (current.size() == k) { out.add(new ArrayList<>(current)); return; }
    // prune: not enough numbers left to reach size k
    for (int i = start; i <= n - (k - current.size()) + 1; i++) {
        current.add(i);
        combine(n, k, i + 1, current, out);
        current.remove(current.size() - 1);
    }
}
```

The loop bound is a pruning optimisation: if there are fewer than `k - current.size()` numbers remaining, no completion is possible, so those branches are skipped entirely.

### Handling duplicates

The standard technique: sort, then skip a value equal to the previous one at the same recursion depth.

```java
List<List<Integer>> subsetsWithDup(int[] nums) {
    Arrays.sort(nums);                             // required
    List<List<Integer>> out = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), out);
    return out;
}

void backtrack(int[] nums, int start, List<Integer> current, List<List<Integer>> out) {
    out.add(new ArrayList<>(current));
    for (int i = start; i < nums.length; i++) {
        if (i > start && nums[i] == nums[i - 1]) continue;   // skip duplicates at this level
        current.add(nums[i]);
        backtrack(nums, i + 1, current, out);
        current.remove(current.size() - 1);
    }
}
```

`i > start` rather than `i > 0` is the crucial detail: it skips a duplicate only when it is a sibling choice at the same level, not when it is legitimately being used at a deeper level. Getting this wrong either produces duplicates or drops valid results.

For permutations with duplicates the analogous condition is `i > 0 && nums[i] == nums[i-1] && !used[i-1]`, which enforces that duplicates are used in a fixed left-to-right order.

### Pruning

Pruning is where backtracking becomes practical. Three kinds:

- **Feasibility**: this choice violates a constraint, so stop.
- **Bound**: even the best completion cannot beat the current answer.
- **Symmetry**: this branch is equivalent to one already explored.

```java
// Combination sum: prune once the running total exceeds the target
if (remaining < 0) return;                        // feasibility
if (candidates[i] > remaining) break;             // sorted, so all later ones also exceed
```

Using `break` rather than `continue` on a sorted array skips the entire remaining loop, which is a substantial saving.

### Complexity

Backtracking complexity is driven by the output size, which is usually exponential and unavoidable:

- Subsets: O(n * 2^n)
- Permutations: O(n * n!)
- N-Queens: roughly O(n!) with heavy pruning in practice

State it honestly: "The output itself is 2^n, so no algorithm can be asymptotically faster. Pruning improves the constant and the practical runtime, not the bound."
""",
                    ),
                    (
                        "Example",
                        """"Place n queens on an n-by-n board so that none attack each other. Return all distinct solutions."

```java
List<List<String>> solveNQueens(int n) {
    List<List<String>> out = new ArrayList<>();
    int[] queenCol = new int[n];                   // queenCol[row] = column
    boolean[] colUsed = new boolean[n];
    boolean[] diag1 = new boolean[2 * n];          // row + col
    boolean[] diag2 = new boolean[2 * n];          // row - col + n
    backtrack(0, n, queenCol, colUsed, diag1, diag2, out);
    return out;
}

void backtrack(int row, int n, int[] queenCol, boolean[] colUsed,
               boolean[] diag1, boolean[] diag2, List<List<String>> out) {
    if (row == n) { out.add(render(queenCol, n)); return; }

    for (int col = 0; col < n; col++) {
        int d1 = row + col, d2 = row - col + n;
        if (colUsed[col] || diag1[d1] || diag2[d2]) continue;    // prune

        queenCol[row] = col;
        colUsed[col] = diag1[d1] = diag2[d2] = true;
        backtrack(row + 1, n, queenCol, colUsed, diag1, diag2, out);
        colUsed[col] = diag1[d1] = diag2[d2] = false;            // unchoose
    }
}
```

What to say: "Placing one queen per row makes row conflicts impossible by construction, so the state is just which column each row uses. Column and diagonal conflicts are tracked with three boolean arrays, which makes the validity check O(1) rather than scanning the board.

The diagonal indices are the trick: cells on the same down-right diagonal share `row + col`, and cells on the same down-left diagonal share `row - col`, offset by n to keep the index non-negative.

The pruning is what makes this feasible — without it the search is n^n rather than roughly n!."

That O(1) conflict check via precomputed diagonal keys is the difference between an elegant solution and one that scans the board at every step.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Generating all subsets, permutations, or combinations
- Constraint satisfaction: N-Queens, Sudoku, graph colouring
- Partitioning problems: palindrome partitioning, equal-sum subsets
- Path enumeration in grids and graphs
- Expression generation and parenthesisation""",
                    ),
                    (
                        "Trade-offs",
                        """- **Shared mutable state versus copying.** Mutating one list with undo is efficient; copying per call is simpler and allocates heavily.
- **Pruning effort versus benefit.** Each pruning check costs time on every node; a weak check can cost more than it saves.
- **Backtracking versus dynamic programming.** Enumerate all solutions versus count or optimise. If the question asks "how many" or "what is the best", DP is usually right; "list them all" means backtracking.
- **Iterative versus recursive.** Recursion is natural; an explicit stack is needed only for very deep searches.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Forgetting to undo the choice, so state leaks into sibling branches
- Adding the mutable working list to the output instead of a copy
- Using `i > 0` instead of `i > start` when skipping duplicates
- Not sorting before deduplicating
- Looping from `start` for permutations, or from 0 for subsets
- Claiming a polynomial complexity when the output is exponential
- Pruning incorrectly and dropping valid solutions""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What is the complexity?"** — Driven by the output size; state it and note that pruning affects constants.
- **"How do you avoid duplicate results?"** — Sort, then skip equal siblings at the same level. Explain `i > start`.
- **"Can you prune more aggressively?"** — Feasibility, bound, and symmetry pruning; give a concrete example for this problem.
- **"Can you do it iteratively?"** — Yes, with an explicit stack, or for subsets with bitmask enumeration.
- **"What if you only need the count?"** — Then it is probably dynamic programming, not enumeration.""",
                    ),
                    (
                        "Mini Exercise",
                        """Write the four answers — state, choices, completion, pruning — before coding each:

1. All subsets of a set with distinct elements.
2. All subsets when duplicates are present.
3. All permutations.
4. All combinations summing to a target, values reusable.
5. Partition a string into palindromic substrings, all ways.
6. Solve a Sudoku board.
7. All valid parenthesis strings of n pairs.

Number 7 has a neat pruning rule that makes it much faster than generating and filtering: only add an opening bracket if fewer than n have been used, and only add a closing one if it would not exceed the openings.""",
                    ),
                    (
                        "Interview Tip",
                        """Write the skeleton first — choose, explore, unchoose — and fill in the four decisions out loud. Interviewers can follow the structure immediately, and having the undo line written before the recursion means you cannot forget it.""",
                    ),
                ],
                [
                    "Every backtracking solution is choose, explore, unchoose, with four decisions: state, choices, completion, pruning.",
                    "Subsets loop from `start`; permutations loop from 0 with a `used` array — that single difference defines the family.",
                    "Deduplicate by sorting and skipping equal siblings with `i > start`, not `i > 0`.",
                    "Complexity is driven by the output size; pruning improves constants, not the asymptotic bound.",
                ],
                [
                    "What is the difference between generating subsets and permutations?",
                    "How do you avoid duplicate results when the input has repeats?",
                    "What is the complexity of generating all subsets, and why?",
                    "Where would you prune in the N-Queens search?",
                ],
                ["balanced-brackets"],
            ),
            DL(
                "backtracking-templates",
                "Backtracking Templates and Search Optimisation",
                "The five standard shapes, memoised search, and turning exponential enumeration into polynomial counting.",
                12,
                "Once the skeleton is automatic, the remaining skill is recognising which of a handful of shapes a problem takes, and knowing when enumeration should become counting. Many problems that look like backtracking are dynamic programming in disguise, and the difference is whether you need the solutions themselves or just a number.",
                [
                    (
                        "Why It Matters",
                        """Choosing enumeration when counting would do is the difference between an exponential solution and a polynomial one. "How many ways" almost never requires listing the ways, and candidates who enumerate anyway run out of time or blow the limits.

The templates also save real minutes: recognising that combination sum, partition, and subset sum are the same shape means you write the second and third without deriving them.""",
                    ),
                    (
                        "Mental Model",
                        """Five shapes cover most problems.

| Shape | Loop | Reuse | Example |
| --- | --- | --- | --- |
| Subsets | from `start` | no | All subsets, palindrome partitioning |
| Permutations | from 0 with `used` | no | Orderings, N-Queens by row |
| Combinations with reuse | from `i` (not `i+1`) | yes | Coin combinations, combination sum |
| Grid or graph paths | neighbours | path-scoped | Word search, rat in a maze |
| Constraint filling | next empty slot | no | Sudoku, graph colouring |

And one decision that overrides all of them: **if the question asks "how many" or "what is the best", consider dynamic programming instead.**""",
                    ),
                    (
                        "How It Works",
                        """### Reuse versus no reuse

A single index change controls whether elements can be chosen more than once:

```java
// No reuse: each element used at most once
backtrack(candidates, i + 1, remaining - candidates[i], current, out);

// With reuse: the same element may be chosen again
backtrack(candidates, i, remaining - candidates[i], current, out);
```

Combination sum with reuse:

```java
void combinationSum(int[] candidates, int start, int remaining,
                    List<Integer> current, List<List<Integer>> out) {
    if (remaining == 0) { out.add(new ArrayList<>(current)); return; }
    for (int i = start; i < candidates.length; i++) {
        if (candidates[i] > remaining) break;      // sorted: prune the rest
        current.add(candidates[i]);
        combinationSum(candidates, i, remaining - candidates[i], current, out);   // i, not i+1
        current.remove(current.size() - 1);
    }
}
```

Sorting first makes the `break` valid and is worth doing purely for that pruning.

### Grid path enumeration

```java
boolean exist(char[][] board, String word) {
    for (int r = 0; r < board.length; r++)
        for (int c = 0; c < board[0].length; c++)
            if (dfs(board, r, c, word, 0)) return true;
    return false;
}

boolean dfs(char[][] board, int r, int c, String word, int index) {
    if (index == word.length()) return true;
    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return false;
    if (board[r][c] != word.charAt(index)) return false;

    char saved = board[r][c];
    board[r][c] = '#';                              // mark on the current path
    boolean found = dfs(board, r + 1, c, word, index + 1)
                 || dfs(board, r - 1, c, word, index + 1)
                 || dfs(board, r, c + 1, word, index + 1)
                 || dfs(board, r, c - 1, word, index + 1);
    board[r][c] = saved;                            // restore - this is the backtrack
    return found;
}
```

Marking in the board itself avoids a separate visited array, and restoring it is what makes the mark path-scoped rather than global. That distinction — visited on this path versus visited ever — is the same one from graph traversal.

### Constraint filling

```java
boolean solveSudoku(char[][] board) {
    for (int r = 0; r < 9; r++)
        for (int c = 0; c < 9; c++) {
            if (board[r][c] != '.') continue;
            for (char d = '1'; d <= '9'; d++) {
                if (!isValid(board, r, c, d)) continue;
                board[r][c] = d;
                if (solveSudoku(board)) return true;    // found a full solution
                board[r][c] = '.';                      // undo
            }
            return false;                               // no digit works here
        }
    return true;                                        // no empty cells left
}
```

The `return false` after the digit loop is essential: if no digit fits an empty cell, this branch is dead and must report failure rather than continuing to the next cell.

A significant optimisation worth mentioning: choosing the *most constrained* empty cell — the one with fewest legal digits — rather than the first one, which is the minimum-remaining-values heuristic and dramatically reduces the search.

### When to switch to dynamic programming

```java
// Enumeration: O(2^n) - lists every valid partition
List<List<String>> partition(String s) { ... }

// Counting: O(n^2) - how many ways, memoised
int countPartitions(String s, int start, Integer[] memo) {
    if (start == s.length()) return 1;
    if (memo[start] != null) return memo[start];
    int total = 0;
    for (int end = start; end < s.length(); end++) {
        if (isPalindrome(s, start, end)) total += countPartitions(s, end + 1, memo);
    }
    return memo[start] = total;
}
```

The rule: **memoisation is only valid when the answer depends solely on the state, not on the path taken to reach it.** Enumeration problems cannot be memoised because each path produces a distinct output; counting and optimisation problems usually can.

That test — "does the answer depend on how I got here?" — is the precise criterion for whether backtracking can become DP.

### Iterative subset generation

For subsets specifically, bitmask enumeration avoids recursion entirely:

```java
for (int mask = 0; mask < (1 << n); mask++) {
    List<Integer> subset = new ArrayList<>();
    for (int i = 0; i < n; i++) {
        if ((mask & (1 << i)) != 0) subset.add(nums[i]);
    }
    out.add(subset);
}
```

Each bit pattern is a subset, and this is often clearer than the recursive version for n up to about 20.""",
                    ),
                    (
                        "Example",
                        """"Given a string and a dictionary, return all possible sentences formed by breaking the string into dictionary words."

Plain backtracking is exponential on adversarial inputs like `"aaaaaaaaaaaaaaab"` with dictionary `["a","aa","aaa",...]`. Memoising the *suffix results* fixes it:

```java
List<String> wordBreak(String s, List<String> wordDict) {
    return dfs(s, 0, new HashSet<>(wordDict), new HashMap<>());
}

List<String> dfs(String s, int start, Set<String> dict, Map<Integer, List<String>> memo) {
    if (memo.containsKey(start)) return memo.get(start);

    List<String> results = new ArrayList<>();
    if (start == s.length()) { results.add(""); return results; }

    for (int end = start + 1; end <= s.length(); end++) {
        String word = s.substring(start, end);
        if (!dict.contains(word)) continue;
        for (String suffix : dfs(s, end, dict, memo)) {
            results.add(suffix.isEmpty() ? word : word + " " + suffix);
        }
    }
    memo.put(start, results);
    return results;
}
```

What to say: "Naive backtracking re-explores the same suffix from many different prefixes, which is where the exponential blow-up comes from. The set of sentences for a given suffix depends only on the starting index, not on how I reached it, so it can be memoised.

The output can still be exponential in the number of valid sentences — memoisation removes the redundant *work*, not the size of the answer. If the problem only asked whether a break exists, a boolean DP would be O(n^2) with no exponential component at all."

Distinguishing "exponential because of redundant work" from "exponential because the output is exponential" is exactly the analysis the follow-up is testing.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Combination and partition enumeration
- Constraint satisfaction puzzles
- Path enumeration in grids and graphs
- Expression and parenthesisation generation
- Any problem asking for all valid configurations""",
                    ),
                    (
                        "Trade-offs",
                        """- **Enumeration versus counting.** Listing solutions is inherently exponential; counting or optimising is often polynomial with DP.
- **Memoisation applicability.** Only when the result depends on the state alone; path-dependent results cannot be cached.
- **Pruning cost.** A more expensive validity check can still win by eliminating whole subtrees — measure the trade.
- **Heuristic ordering.** Choosing the most constrained option first is free to implement and can transform runtime.
- **Bitmask versus recursion for subsets.** Simpler and iterative, limited to about n = 20.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Enumerating when the question only asks for a count or a best value
- Memoising a path-dependent result
- Using `i + 1` when elements may be reused, or `i` when they may not
- Forgetting to restore the marked cell in grid path search
- Missing the failure return in constraint filling, so dead branches continue
- Not sorting before applying a sorted-order pruning `break`""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you memoise this?"** — Only if the answer depends on the state alone. Say why it does or does not.
- **"What if I only want the count?"** — Switch to DP; the complexity usually drops from exponential to polynomial.
- **"How would you speed up the search?"** — Better pruning, and ordering choices by most-constrained-first.
- **"What is the worst case?"** — Give the output size, and separate it from redundant work.
- **"Can you do it iteratively?"** — Bitmask for subsets, explicit stack otherwise.""",
                    ),
                    (
                        "Mini Exercise",
                        """For each, decide backtracking or DP, and if backtracking, which of the five shapes:

1. All combinations summing to a target, values reusable.
2. The number of combinations summing to a target.
3. All palindromic partitions of a string.
4. The minimum number of palindromic partitions.
5. Whether a string can be segmented into dictionary words.
6. All sentences formed by segmenting a string.
7. Solve a Sudoku board.

Numbers 2, 4 and 5 are DP; the rest are enumeration. Noticing that 5 and 6 are the same problem with different outputs — and wildly different complexities — is the lesson.""",
                    ),
                    (
                        "Interview Tip",
                        """Ask yourself "do I need the solutions, or just a number?" before writing any recursion. If a number will do, say "this is really dynamic programming" and switch — that recognition is worth more than any amount of pruning.""",
                    ),
                ],
                [
                    "Five shapes cover most backtracking: subsets, permutations, reuse-combinations, path search, constraint filling.",
                    "`i + 1` means no reuse and `i` means reuse — one character controls the whole semantics.",
                    "Memoise only when the result depends on the state alone, never when it depends on the path.",
                    "If the question asks 'how many' or 'what is the best', it is probably dynamic programming, not enumeration.",
                ],
                [
                    "How do you allow elements to be reused in a combination search?",
                    "When can a backtracking solution be memoised?",
                    "How would you speed up a constraint-satisfaction search?",
                    "When should you switch from enumeration to dynamic programming?",
                ],
            ),
        ],
        roadmap_key="backtracking",
        practice_tag="tree",
    )


def _greedy_topic() -> dict:
    return _dsa_topic(
        "greedy",
        "Greedy Algorithms",
        "When a locally optimal choice is provably safe, how to argue it, and how to tell greedy from dynamic programming.",
        "MEDIUM",
        22,
        [
            DL(
                "when-greedy-works",
                "When Greedy Works",
                "The exchange argument, and why 'it looks right' is not a justification.",
                13,
                "A greedy algorithm makes the choice that looks best right now and never reconsiders. When it works it is simple and fast; when it does not, it produces a plausible wrong answer that passes small test cases. The skill is not writing greedy code — it is proving, or at least arguing convincingly, that the greedy choice is safe.",
                [
                    (
                        "Why It Matters",
                        """Greedy is the most dangerous technique in the subject because wrong greedy solutions look correct. Coin change with coins 1, 3, 4 and a target of 6 is the standard counterexample: greedy takes 4 + 1 + 1 for three coins, while the optimum is 3 + 3 for two.

Interviewers therefore ask "why is that safe?" and a candidate who cannot answer has not solved the problem, even if the code is right. Conversely, being able to give an exchange argument is a strong signal.""",
                    ),
                    (
                        "Mental Model",
                        """Greedy is valid when two properties hold.

1. **Greedy choice property** — a globally optimal solution can be built by making the locally optimal choice at each step.
2. **Optimal substructure** — after making that choice, the remaining problem is the same problem on a smaller input.

The standard proof technique is the **exchange argument**: take any optimal solution, show that it can be transformed into one containing the greedy choice without getting worse, and conclude that a greedy solution is at least as good.

> Memory cue: if you cannot construct an exchange argument in one sentence, write the DP instead. It is slower and it is correct.""",
                    ),
                    (
                        "How It Works",
                        """### The exchange argument in practice

**Interval scheduling**: to select the maximum number of non-overlapping intervals, always take the one that finishes earliest.

```java
int maxNonOverlapping(int[][] intervals) {
    Arrays.sort(intervals, Comparator.comparingInt(i -> i[1]));   // by END time
    int count = 0, lastEnd = Integer.MIN_VALUE;
    for (int[] interval : intervals) {
        if (interval[0] >= lastEnd) { count++; lastEnd = interval[1]; }
    }
    return count;
}
// O(n log n) - the sort dominates
```

The exchange argument: "Suppose an optimal solution does not include the earliest-finishing interval. Replace its first interval with the earliest-finishing one. That interval ends no later, so it cannot conflict with anything the original first interval did not conflict with. The new solution has the same size and contains the greedy choice. By induction, a greedy solution is optimal."

That paragraph is what "prove your greedy is correct" means, and it takes twenty seconds to deliver.

Note the sort key: **by end time, not start time**. Sorting by start gives a wrong answer, and the exchange argument is what tells you which key is right.

### Where greedy fails

```java
// Coin change with coins {1, 3, 4}, target 6
// Greedy: 4 + 1 + 1 = three coins
// Optimal: 3 + 3   = two coins
```

Greedy coin change is correct for *canonical* coin systems, such as standard currency denominations, and wrong in general. The distinction matters: if the interviewer says "coins are 1, 5, 10, 25", greedy is fine; if the coins are arbitrary, it is not.

```java
// Correct for arbitrary coins: dynamic programming
int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int coin : coins)
            if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}
// O(amount * coins)
```

### Classic correct greedy algorithms

| Problem | Greedy rule | Why it is safe |
| --- | --- | --- |
| Interval scheduling | Earliest finish time | Leaves the most room for the rest |
| Minimum platforms or rooms | Sort events, sweep counts | Counting concurrency is exact |
| Jump game | Track the furthest reachable index | Reachability is monotone |
| Gas station | Reset the start when the running total goes negative | A failing start cannot succeed from any station within it |
| Huffman coding | Merge the two lowest frequencies | Least frequent symbols must be deepest |
| Fractional knapsack | Highest value per unit weight | Items are divisible, so no packing decision is lost |
| Task scheduler | Schedule the most frequent task first | Delaying it risks forced idle time |
| Minimum spanning tree | Cheapest safe edge | Cut property |

Note that **0/1 knapsack is not in this list** — items being indivisible breaks the argument entirely, and it is dynamic programming.

### Jump game, with the argument

```java
boolean canJump(int[] nums) {
    int furthest = 0;
    for (int i = 0; i < nums.length; i++) {
        if (i > furthest) return false;              // cannot even reach here
        furthest = Math.max(furthest, i + nums[i]);
    }
    return true;
}
// O(n) time, O(1) space
```

The argument: "Reachability is monotone — if I can reach index i, I can reach every index before it. So tracking a single furthest-reachable value is sufficient, and I never need to know *how* I got there."

### Gas station

```java
int canCompleteCircuit(int[] gas, int[] cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < gas.length; i++) {
        int gain = gas[i] - cost[i];
        total += gain;
        tank += gain;
        if (tank < 0) { start = i + 1; tank = 0; }   // restart from the next station
    }
    return total >= 0 ? start : -1;
}
// O(n) time, O(1) space
```

The argument, which is the whole problem: "If the tank goes negative between stations a and b, then no station in that range can be a valid start — because starting later means arriving at each subsequent station with no more fuel than we had. So the next candidate is b + 1, and one pass suffices. The total tells us whether any solution exists at all."

Being able to state that is worth far more than the six lines of code.""",
                    ),
                    (
                        "Example",
                        """"Given an array where each element is the maximum jump length from that position, find the minimum number of jumps to reach the end."

```java
int minJumps(int[] nums) {
    int jumps = 0, currentEnd = 0, furthest = 0;
    for (int i = 0; i < nums.length - 1; i++) {      // note: stop before the last index
        furthest = Math.max(furthest, i + nums[i]);
        if (i == currentEnd) {                        // exhausted the current jump's range
            jumps++;
            currentEnd = furthest;
        }
    }
    return jumps;
}
// O(n) time, O(1) space
```

What to say: "This is implicitly a BFS over positions, where each 'level' is the set of indices reachable in the same number of jumps. Rather than a queue, I track the boundary of the current level with `currentEnd` and the furthest reachable in the next level with `furthest`. When the scan reaches the boundary, a jump is committed and the level advances.

The greedy choice is safe because within a level I do not care *which* index I jump from — only how far the level collectively reaches. The loop stops at `length - 1` so arriving exactly at the end does not count an extra jump."

Framing it as BFS-without-a-queue is the insight, and the off-by-one in the loop bound is the detail interviewers check.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Interval selection and scheduling
- Activity and resource allocation
- Jump and reachability problems
- Huffman coding and merge-cost problems
- Minimum spanning trees
- Assignment problems where a sort exposes the right order""",
                    ),
                    (
                        "Trade-offs",
                        """- **Greedy versus DP.** O(n log n) and requires a proof, versus polynomial and always correct. When unsure, write the DP.
- **Proof effort.** An exchange argument takes a minute and converts a guess into a solution.
- **Sorting cost.** Most greedy algorithms are dominated by an initial sort.
- **Fragility.** A small change to the problem — indivisible items, a second constraint — can invalidate the greedy rule entirely, so re-derive rather than reuse.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Applying greedy without any correctness argument
- Sorting by the wrong key, such as start time instead of end time
- Using greedy for 0/1 knapsack or arbitrary-denomination coin change
- Assuming a greedy rule that works on the examples generalises
- Missing that the greedy choice must be provably safe, not merely plausible
- Off-by-one at the final step in jump and interval problems""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why is that choice safe?"** — Give the exchange argument. This is the question.
- **"Can you find a counterexample?"** — Try to break your own rule; if you cannot, and you can argue the exchange, you are probably right.
- **"What if the items were indivisible?"** — Fractional knapsack becomes 0/1 knapsack, and greedy becomes DP.
- **"What if there were a second constraint?"** — Most greedy rules break; say so rather than patching.
- **"Would DP also work?"** — Usually yes, more slowly. Offer it as the safe fallback.""",
                    ),
                    (
                        "Mini Exercise",
                        """For each, decide greedy or DP, and if greedy, state the exchange argument in one sentence:

1. Maximum number of non-overlapping intervals.
2. Minimum number of meeting rooms.
3. Minimum coins to make an amount, arbitrary denominations.
4. Minimum coins with denominations 1, 5, 10, 25.
5. Maximum value in a knapsack with divisible items.
6. The same with indivisible items.
7. Minimum jumps to reach the end of an array.

Numbers 3 and 6 are DP; the rest are greedy. The pair 3/4 and the pair 5/6 are the same problem with one property changed, and that property is exactly what decides the technique.""",
                    ),
                    (
                        "Interview Tip",
                        """Whenever you propose greedy, immediately say why the choice is safe: "taking the earliest-finishing interval leaves at least as much room as any other choice, so an optimal solution can always be rewritten to include it." Without that sentence, a correct greedy answer still looks like a guess.""",
                    ),
                ],
                [
                    "Greedy needs the greedy-choice property and optimal substructure — argue it with an exchange argument.",
                    "Interval scheduling sorts by end time; sorting by start time is a different and wrong algorithm.",
                    "Greedy coin change is correct only for canonical denominations; arbitrary coins need DP.",
                    "If you cannot state why the choice is safe in one sentence, write the dynamic program instead.",
                ],
                [
                    "How do you prove a greedy algorithm is correct?",
                    "Why does interval scheduling sort by end time?",
                    "Give a case where greedy coin change fails.",
                    "How do you decide between greedy and dynamic programming?",
                ],
                ["single-pass-profit"],
            ),
            DL(
                "greedy-vs-dp",
                "Greedy, DP, and Choosing Between Them",
                "The decision procedure, the problems that sit on the boundary, and what to do when you are not sure.",
                11,
                "Greedy and dynamic programming both build a solution from smaller decisions. The difference is whether a decision made now can be regretted later. Deciding which applies is the single most consequential choice in a large family of optimisation problems, and there is a reliable procedure for making it.",
                [
                    (
                        "Why It Matters",
                        """Choosing greedy when DP is needed produces a wrong answer that passes the examples. Choosing DP when greedy would do produces a correct but slower answer, which is a much better failure — and knowing that asymmetry is itself useful under time pressure.

Interviewers often design the problem specifically to sit near the boundary, then move it with a follow-up: "now items cannot be split", "now there is a second constraint". Recognising that the follow-up has changed the technique is what is being tested.""",
                    ),
                    (
                        "Mental Model",
                        """Ask one question: can a choice that looks best now turn out to be wrong later?

Choice is locally verifiable -> greedy. Choice depends on the future -> DP.

| | Greedy | Dynamic programming |
| --- | --- | --- |
| Decides | Once, never revisits | Considers all options per state |
| Needs | A provable safe choice | Overlapping subproblems |
| Typical cost | O(n log n) | O(states * transitions) |
| Failure mode | Silently wrong | Slow or memory-heavy |
| When unsure | Risky | Safe |""",
                    ),
                    (
                        "How It Works",
                        """### The decision procedure

1. **Try to construct a counterexample to greedy.** Small adversarial cases: unequal weights, an item that is attractive now and blocks two better ones later. If you find one, it is DP.
2. **Try to state an exchange argument.** If it comes easily, greedy is probably right.
3. **Check whether the problem says "maximum/minimum" with interacting choices.** Interaction usually means DP.
4. **Check the constraints.** If n is small enough for O(n^2) or O(n * W), DP is affordable and safe.
5. **If still unsure, write the DP.** Correct and slower beats fast and wrong.

### The boundary cases

**Fractional versus 0/1 knapsack.** Divisible items mean you can always take the best value-per-weight and fill exactly — greedy. Indivisible items mean taking one item blocks another, so the choice depends on what comes later — DP.

**Canonical versus arbitrary coins.** With denominations where each is a multiple pattern of the smaller ones, greedy is provably optimal. With arbitrary coins it is not.

**Maximum subarray.** Kadane's algorithm looks greedy and is genuinely a one-dimensional DP with the state compressed to a single variable:

```java
int maxSubArray(int[] nums) {
    int best = nums[0], current = nums[0];
    for (int i = 1; i < nums.length; i++) {
        current = Math.max(nums[i], current + nums[i]);   // extend, or start fresh
        best = Math.max(best, current);
    }
    return best;
}
```

The recurrence `dp[i] = max(nums[i], dp[i-1] + nums[i])` is DP; keeping only the previous value is the space optimisation. Calling it "greedy" is a common imprecision, and being precise about it is a small credibility win.

**Jump game versus minimum jumps.** "Can I reach the end?" is greedy because reachability is monotone. "What is the minimum number of jumps?" is also greedy, via the level argument — but "minimum cost when jumps have different costs" is DP, because the cheapest route is not the furthest one.

That progression is a good one to have in mind: the same surface problem moves across the boundary as the objective changes.

### Stock problems, a family that spans the boundary

```java
// One transaction: greedy - track the minimum so far
int maxProfitOnce(int[] prices) {
    int minPrice = Integer.MAX_VALUE, best = 0;
    for (int p : prices) {
        minPrice = Math.min(minPrice, p);
        best = Math.max(best, p - minPrice);
    }
    return best;
}

// Unlimited transactions: greedy - take every upward move
int maxProfitUnlimited(int[] prices) {
    int total = 0;
    for (int i = 1; i < prices.length; i++) {
        total += Math.max(0, prices[i] - prices[i - 1]);
    }
    return total;
}

// At most k transactions: DP - the state is (day, transactions used, holding)
int maxProfitK(int k, int[] prices) { ... }
```

The first two are greedy because no decision constrains a later one. The third is DP because using a transaction now means not having it later — the choice has a future cost, which is exactly the greedy-versus-DP criterion made concrete.

Walking this ladder out loud is one of the best ways to demonstrate that you understand the distinction rather than having memorised which problems are which.

### When greedy plus a data structure beats DP

Some problems are greedy but need a structure to make the greedy choice efficiently:

- **Meeting rooms**: greedy over sorted start times, with a min-heap of end times.
- **Task scheduling with cooldown**: greedy on the most frequent task, with a max-heap.
- **Merging k sorted lists optimally**: repeatedly merge the two smallest, with a heap — this is Huffman's algorithm.

If your greedy rule requires "the best remaining option", the structure is usually a heap, and saying so connects the technique to the data structure naturally.""",
                    ),
                    (
                        "Example",
                        """"You are given tasks with deadlines and profits. Each task takes one unit of time and must finish before its deadline. Maximise the total profit."

This looks like DP and is greedy with a twist:

```java
int maxProfit(int[][] tasks) {          // tasks[i] = {deadline, profit}
    Arrays.sort(tasks, Comparator.comparingInt(t -> t[0]));   // by deadline
    PriorityQueue<Integer> chosen = new PriorityQueue<>();    // min-heap of profits

    for (int[] task : tasks) {
        chosen.offer(task[1]);
        if (chosen.size() > task[0]) {
            chosen.poll();              // drop the least profitable chosen task
        }
    }
    int total = 0;
    for (int p : chosen) total += p;
    return total;
}
// O(n log n)
```

What to say: "Processing tasks in deadline order, I tentatively accept each one. If accepting it means I have more tasks than time slots available before this deadline, I drop the least profitable task chosen so far — which may be the one I just added.

The exchange argument: at every prefix, the heap holds the most profitable feasible set for the deadlines seen so far. Swapping in a more profitable task for a less profitable one never reduces the total and never breaks feasibility, because the count is unchanged.

I would reach for DP if profits depended on *which* slot a task occupied, because then the choice would have a future cost — here it does not, which is what makes greedy safe."

The "drop the worst chosen so far, possibly the one just added" pattern is a recurring greedy-with-a-heap shape worth recognising.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Optimisation problems with a natural sort order
- Scheduling with deadlines or durations
- Resource allocation where choices do not interact
- Problems where a heap supplies the best remaining option
- Deciding whether a follow-up has moved the problem across the boundary""",
                    ),
                    (
                        "Trade-offs",
                        """- **Speed versus safety.** Greedy is usually faster and can be silently wrong; DP is slower and reliably correct.
- **Proof effort versus implementation effort.** Greedy needs a proof; DP needs a state definition and more code.
- **Memory.** DP tables can be large; many can be reduced to one or two rows.
- **Generality.** A greedy rule often breaks when a constraint is added; a DP formulation usually extends by adding a dimension.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Calling Kadane's algorithm greedy
- Applying fractional-knapsack reasoning to the 0/1 version
- Assuming a greedy rule survives an added constraint
- Choosing greedy because the examples pass
- Writing DP when an O(n log n) greedy with a clean argument exists, and not mentioning it
- Not noticing that a follow-up changed the technique""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Would greedy work here?"** — Give a counterexample, or an exchange argument. Never "I think so".
- **"What if items cannot be split?"** — The greedy argument breaks; move to DP.
- **"What if there is a second constraint?"** — Usually an extra DP dimension; greedy rarely survives.
- **"Can you reduce the memory?"** — Most DP tables only need the previous row or two.
- **"Which would you write under time pressure?"** — The DP, unless the exchange argument is immediate. Saying that is a sign of judgement, not timidity.""",
                    ),
                    (
                        "Mini Exercise",
                        """For each pair, say which is greedy and which is DP, and what property differs:

1. Buy and sell stock once, versus at most k transactions.
2. Fractional knapsack, versus 0/1 knapsack.
3. Can you reach the end of the array, versus minimum cost to reach the end with per-jump costs.
4. Maximum non-overlapping intervals, versus maximum total weight of non-overlapping intervals.
5. Coin change with canonical denominations, versus arbitrary ones.

Number 4 is the subtle one: counting intervals is greedy by earliest finish, but maximising *weight* is DP with binary search over the sorted intervals — because a long valuable interval may be worth more than several short ones.""",
                    ),
                    (
                        "Interview Tip",
                        """Say "let me check whether greedy is safe here" and then actually try to break it with a small adversarial example, out loud. Either you find a counterexample — and have just justified DP — or you do not, and you have earned the greedy solution honestly.""",
                    ),
                ],
                [
                    "Greedy applies when a choice cannot be regretted; DP when a choice now constrains the future.",
                    "Fractional versus 0/1, canonical versus arbitrary coins, one transaction versus k — the same problem moves across the boundary.",
                    "Kadane's algorithm is a space-optimised DP, not a greedy algorithm.",
                    "When unsure, write the DP: slower and correct beats faster and silently wrong.",
                ],
                [
                    "How do you decide between greedy and dynamic programming?",
                    "Why is 0/1 knapsack not solvable greedily when fractional knapsack is?",
                    "At what point do the stock-trading problems stop being greedy?",
                    "What would you write if you could not decide within a minute?",
                ],
            ),
        ],
        roadmap_key="greedy",
        practice_tag="array",
    )


def _dp1d_topic() -> dict:
    return _dsa_topic(
        "dp-1d",
        "Dynamic Programming Foundations",
        "Recognising DP, defining the state, memoisation versus tabulation, and the one-dimensional classics.",
        "MEDIUM",
        23,
        [
            DL(
                "dp-recognition-and-framework",
                "Recognising DP and Defining the State",
                "The five-step framework that turns a hard problem into a recurrence.",
                14,
                "Dynamic programming is recursion with the redundant work removed. The hard part is never the caching — it is defining the state precisely enough that the recurrence writes itself. A five-step framework makes that definition mechanical, and most DP failures are failures at step two.",
                [
                    (
                        "Why It Matters",
                        """DP is the technique candidates fear most, and the fear is usually about pattern recall rather than reasoning. With a framework, an unfamiliar DP problem is approachable: define the state, write the recurrence, fix the base cases, choose an order, and optimise space.

Interviewers are watching for exactly that process. A candidate who says "let `dp[i]` be the best answer considering the first i items, ending with item i included" has done the hard part in one sentence.""",
                    ),
                    (
                        "Mental Model",
                        """Five steps, in order.

State → Recurrence → Base cases → Order → Space

1. **State**: what does `dp[...]` mean, in a full sentence? This is the whole problem.
2. **Recurrence**: how does this state depend on smaller ones?
3. **Base cases**: the smallest states, answered directly.
4. **Order**: every state must be computed after everything it depends on.
5. **Space**: can you keep only the rows or values you still need?

> Memory cue: if you cannot finish the sentence "dp of i is the ... of ...", you do not have a state yet, and writing code will not help.""",
                    ),
                    (
                        "How It Works",
                        """### Recognising a DP problem

Three signals, and you usually need all three:

1. **Optimal substructure** — the best solution contains best solutions to subproblems.
2. **Overlapping subproblems** — the same subproblem is reached by many different paths.
3. **A question shape** — "how many ways", "minimum or maximum", "is it possible", over sequences of choices.

Compare with the alternatives: no overlapping subproblems means plain divide and conquer; a provably safe local choice means greedy; a request to *list* all solutions means backtracking.

### Defining the state

The state must capture everything that affects the future. Common shapes:

| State | Meaning |
| --- | --- |
| `dp[i]` | Best answer for the first i elements |
| `dp[i]` | Best answer for subarrays *ending at* i |
| `dp[i][j]` | Best answer for the range i..j |
| `dp[i][j]` | Best answer using the first i of one input and first j of another |
| `dp[i][c]` | Best answer for the first i items with c capacity or budget remaining |
| `dp[i][s]` | Best answer at position i in state s, such as holding or not holding |

The distinction between "the first i elements" and "ending at i" is the one that catches people. For maximum subarray, the answer must be about subarrays *ending at* i, because that is what allows the extend-or-restart recurrence.

### Memoisation versus tabulation

```java
// Top-down: recursion plus a cache. Mirrors the problem statement.
int climb(int n, Integer[] memo) {
    if (n <= 2) return n;
    if (memo[n] != null) return memo[n];
    return memo[n] = climb(n - 1, memo) + climb(n - 2, memo);
}

// Bottom-up: iterate states in dependency order. Faster, no stack.
int climb(int n) {
    if (n <= 2) return n;
    int[] dp = new int[n + 1];
    dp[1] = 1; dp[2] = 2;
    for (int i = 3; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}

// Space-optimised: only the last two values are ever needed.
int climb(int n) {
    if (n <= 2) return n;
    int prev2 = 1, prev1 = 2;
    for (int i = 3; i <= n; i++) {
        int current = prev1 + prev2;
        prev2 = prev1; prev1 = current;
    }
    return prev1;
}
```

| | Memoisation | Tabulation |
| --- | --- | --- |
| Written as | Recursion with a cache | Loops over a table |
| Computes | Only reachable states | All states |
| Risk | Stack depth | Getting the iteration order wrong |
| Easier to | Derive from the recurrence | Space-optimise |

The practical advice: derive with memoisation because it mirrors your thinking, then convert to tabulation if you need the speed or the space reduction. Saying you would do that is a perfectly good interview answer.

### Complexity

Time = number of states × work per state

That formula answers every DP complexity question.

- `dp[i]` with O(1) transition: O(n)
- `dp[i]` with a loop over j < i: O(n^2)
- `dp[i][j]` with O(1) transition: O(n * m)
- `dp[i][capacity]`: O(n * capacity) — pseudo-polynomial, since capacity is a value not a length

**Space** is the table size, reducible when each state depends only on a bounded window of previous ones.

### Worked derivation: house robber

> Houses in a line, each with a value; you cannot rob two adjacent houses. Maximise the total.

1. **State**: `dp[i]` is the maximum obtainable from the first i houses.
2. **Recurrence**: for house i, either skip it and take `dp[i-1]`, or rob it and take `dp[i-2] + value[i]`. So `dp[i] = max(dp[i-1], dp[i-2] + value[i])`.
3. **Base cases**: `dp[0] = 0`, `dp[1] = value[0]`.
4. **Order**: increasing i.
5. **Space**: only two previous values are needed, so O(1).

```java
int rob(int[] nums) {
    int prev2 = 0, prev1 = 0;
    for (int value : nums) {
        int current = Math.max(prev1, prev2 + value);
        prev2 = prev1;
        prev1 = current;
    }
    return prev1;
}
// O(n) time, O(1) space
```

Five sentences produced the code. That is what the framework is for, and narrating those five steps is a far better use of interview time than writing quickly.

### When the state needs more dimensions

If the recurrence needs information the state does not carry, the state is wrong. Symptoms: you find yourself wanting to know "how many have I used so far" or "am I currently holding one", and those must become dimensions.

- House robber in a circle: two runs, one excluding the first house and one excluding the last, because the first and last interact.
- Stock with a cooldown: the state becomes `(day, holding)` because the action depends on the previous state, not just the day.""",
                    ),
                    (
                        "Example",
                        """"Given an array of coin denominations and an amount, return the fewest coins that make that amount, or -1."

Walking the framework aloud:

> "**State**: `dp[a]` is the fewest coins needed to make amount a.

> **Recurrence**: for each coin c that is at most a, I could use it, leaving `a - c`. So `dp[a] = 1 + min over c of dp[a - c]`.

> **Base case**: `dp[0] = 0` — zero coins make zero.

> **Order**: increasing a, because `dp[a]` depends on smaller amounts.

> **Space**: O(amount); each state depends on arbitrary smaller ones, so I cannot reduce it to a constant."

```java
int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);              // sentinel: larger than any real answer
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int coin : coins) {
            if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
// O(amount * coins) time, O(amount) space
```

Then the two things worth adding: "The sentinel `amount + 1` is safely above any achievable answer, since no solution uses more than `amount` coins of value at least 1 — that avoids overflow from using `Integer.MAX_VALUE` and then adding one.

And note this is pseudo-polynomial: it is linear in the *value* of the amount, not in its input size. For a very large amount with few coins, that matters."

Both details are the kind interviewers probe for.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Counting ways to reach a target
- Minimum or maximum over sequences of choices
- Feasibility questions over subsets or partitions
- Sequence alignment and editing
- Any recursion where the same arguments recur""",
                    ),
                    (
                        "Trade-offs",
                        """- **Memoisation versus tabulation.** Natural derivation and stack risk, versus speed and easier space reduction.
- **Space optimisation versus clarity.** Reducing to one row is a good follow-up answer and makes debugging harder — get it correct first.
- **DP versus greedy.** Always correct and slower, versus fast and needing proof.
- **Pseudo-polynomial cost.** O(n * amount) is fine for modest amounts and not for huge ones; say so.
- **Reconstructing the solution.** Storing choices alongside values costs memory and is needed when the answer is the path rather than the value.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Writing code before stating the state in a full sentence
- Choosing "first i elements" when the recurrence needs "ending at i"
- Wrong base cases, especially the empty case
- Iterating in an order where a dependency is not yet computed
- Using `Integer.MAX_VALUE` as a sentinel and overflowing when adding
- Space-optimising before the unoptimised version is correct
- Claiming polynomial complexity for a pseudo-polynomial algorithm""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What does dp[i] mean?"** — Answer in one full sentence. Hesitation here predicts a wrong recurrence.
- **"What is the complexity?"** — States times work per state, and say which is which.
- **"Can you reduce the space?"** — Usually yes when the recurrence uses a bounded window.
- **"Can you reconstruct the actual solution?"** — Store parent choices, or walk the table backwards from the answer.
- **"Top-down or bottom-up?"** — Either; name the trade and say which you would write first.
- **"Would greedy work?"** — Have a counterexample ready if it would not.""",
                    ),
                    (
                        "Mini Exercise",
                        """Write the five steps for each before writing any code:

1. Number of ways to climb n stairs taking 1 or 2 steps.
2. Maximum sum of non-adjacent elements.
3. Fewest coins to make an amount.
4. Number of ways to make an amount with unlimited coins.
5. Longest increasing subsequence.
6. Whether a string can be segmented into dictionary words.
7. Maximum product subarray.

Number 7 is the instructive one: the state must track *both* the maximum and the minimum product ending at i, because a negative number turns the smallest product into the largest. Discovering that the state needs a second component is exactly the step-two skill this lesson teaches.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the state definition out loud as a complete sentence before writing anything, and pause for the interviewer to react. If the state is right, the rest is mechanical; if it is wrong, you have just saved fifteen minutes.""",
                    ),
                ],
                [
                    "Five steps: state, recurrence, base cases, order, space — and step one is the whole problem.",
                    "Time equals the number of states multiplied by the work per state.",
                    "'First i elements' and 'ending at i' are different states; the recurrence decides which you need.",
                    "Derive with memoisation, then convert to tabulation for speed and space reduction.",
                ],
                [
                    "How do you recognise that a problem needs dynamic programming?",
                    "What does your dp array mean, precisely?",
                    "What is the difference between memoisation and tabulation?",
                    "How do you compute the complexity of a DP solution?",
                ],
                ["single-pass-profit"],
            ),
            DL(
                "one-dimensional-dp",
                "One-Dimensional DP Patterns",
                "Linear sequences, the extend-or-restart shape, and the classics you should be able to write from memory.",
                13,
                "One-dimensional DP covers problems where a single index defines the state: positions in an array, amounts of money, lengths of a sequence. A small number of recurrence shapes cover almost all of them, and recognising the shape is faster and more reliable than deriving each from scratch.",
                [
                    (
                        "Why It Matters",
                        """These are the most commonly asked DP problems, and several appear as the follow-up to an easier question. Being fluent in the four or five shapes means you spend your time on the parts that are specific to this problem rather than rediscovering the recurrence.

They are also the foundation for the two-dimensional problems: most 2D recurrences are a 1D shape with a second index added.""",
                    ),
                    (
                        "Mental Model",
                        """Four recurrence shapes cover most 1D problems.

| Shape | Recurrence | Example |
| --- | --- | --- |
| Fixed look-back | `dp[i]` from `dp[i-1]`, `dp[i-2]` | Stairs, house robber |
| Extend or restart | `dp[i] = max(x[i], dp[i-1] + x[i])` | Maximum subarray |
| Scan all previous | `dp[i] = f(dp[j])` for all `j < i` | Longest increasing subsequence, word break |
| Unbounded choice | `dp[a] = f(dp[a - c])` over choices c | Coin change, perfect squares |

The first is O(n); the second is O(n) with O(1) space; the third is O(n^2) and often improvable; the fourth is O(n * choices).""",
                    ),
                    (
                        "How It Works",
                        """:::viz dp-1d {"values": [2, 7, 9, 3, 1]}

### Extend or restart: maximum subarray

```java
int maxSubArray(int[] nums) {
    int current = nums[0], best = nums[0];
    for (int i = 1; i < nums.length; i++) {
        current = Math.max(nums[i], current + nums[i]);   // restart, or extend
        best = Math.max(best, current);
    }
    return best;
}
// O(n) time, O(1) space
```

`dp[i]` is the best subarray sum *ending at* i. The answer is the maximum over all i, not `dp[n-1]` — that distinction is the most common bug in this shape.

The variant that tests whether you understand it: **maximum product subarray**, where a negative value flips the ordering, so the state must carry both extremes:

```java
int maxProduct(int[] nums) {
    int maxEnding = nums[0], minEnding = nums[0], best = nums[0];
    for (int i = 1; i < nums.length; i++) {
        int x = nums[i];
        int previousMax = maxEnding;
        maxEnding = Math.max(x, Math.max(previousMax * x, minEnding * x));
        minEnding = Math.min(x, Math.min(previousMax * x, minEnding * x));
        best = Math.max(best, maxEnding);
    }
    return best;
}
```

Saving `previousMax` before overwriting it is essential; using the updated value in the `min` computation is a silent bug.

### Scan all previous: longest increasing subsequence

```java
int lengthOfLIS(int[] nums) {
    int[] dp = new int[nums.length];
    Arrays.fill(dp, 1);                        // every element alone is length 1
    int best = 1;
    for (int i = 1; i < nums.length; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        best = Math.max(best, dp[i]);
    }
    return best;
}
// O(n^2) time, O(n) space
```

The O(n log n) improvement is a standard follow-up and worth knowing:

```java
int lengthOfLIS(int[] nums) {
    List<Integer> tails = new ArrayList<>();   // tails[k] = smallest tail of an LIS of length k+1
    for (int x : nums) {
        int i = Collections.binarySearch(tails, x);
        if (i < 0) i = -(i + 1);               // insertion point
        if (i == tails.size()) tails.add(x);
        else tails.set(i, x);
    }
    return tails.size();
}
// O(n log n) time, O(n) space
```

The crucial caveat to state: **`tails` is not an actual increasing subsequence** — it only has the correct *length*. Claiming otherwise is a common error. If the actual subsequence is needed, you must track predecessors separately.

### Unbounded choice: coin change variants

```java
// Minimum coins
for (int a = 1; a <= amount; a++)
    for (int coin : coins)
        if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);

// Number of COMBINATIONS (order does not matter)
dp[0] = 1;
for (int coin : coins)                          // coin loop OUTSIDE
    for (int a = coin; a <= amount; a++)
        dp[a] += dp[a - coin];

// Number of PERMUTATIONS (order matters)
dp[0] = 1;
for (int a = 1; a <= amount; a++)               // amount loop OUTSIDE
    for (int coin : coins)
        if (coin <= a) dp[a] += dp[a - coin];
```

The loop order is the entire difference between combinations and permutations, and it is a favourite interview trap. Putting the coin loop outside means each coin is considered once in a fixed order, so `1 + 2` and `2 + 1` are the same; putting the amount loop outside allows any coin at any step, so they are different.

Being able to explain *why* the loop order changes the semantics is the answer; memorising which is which is not.

### Fixed look-back with a twist: house robber in a circle

```java
int robCircular(int[] nums) {
    if (nums.length == 1) return nums[0];
    return Math.max(robLinear(nums, 0, nums.length - 2),    // exclude the last
                    robLinear(nums, 1, nums.length - 1));   // exclude the first
}
```

The circular constraint couples the first and last elements, and the standard resolution is two linear runs. Recognising that a constraint between the ends can be handled by case-splitting rather than a new recurrence is a transferable idea.

### State machines

When the answer depends on a mode as well as a position, add a small state dimension:

```java
// Stock with cooldown: states are holding, sold today, resting
int maxProfit(int[] prices) {
    int hold = Integer.MIN_VALUE, sold = 0, rest = 0;
    for (int p : prices) {
        int prevSold = sold;
        sold = hold + p;                        // sell today
        hold = Math.max(hold, rest - p);        // keep holding, or buy from rest
        rest = Math.max(rest, prevSold);        // rest, or cool down after selling
    }
    return Math.max(sold, rest);
}
// O(n) time, O(1) space
```

Saving `prevSold` before overwriting matters for exactly the same reason as in maximum product subarray: the transitions reference the previous step's values, not this step's.""",
                    ),
                    (
                        "Example",
                        """"Given a string and a dictionary, determine whether the string can be segmented into dictionary words."

```java
boolean wordBreak(String s, List<String> wordDict) {
    Set<String> dict = new HashSet<>(wordDict);
    boolean[] dp = new boolean[s.length() + 1];
    dp[0] = true;                                    // the empty prefix is always breakable

    for (int end = 1; end <= s.length(); end++) {
        for (int start = 0; start < end; start++) {
            if (dp[start] && dict.contains(s.substring(start, end))) {
                dp[end] = true;
                break;                               // one valid split is enough
            }
        }
    }
    return dp[s.length()];
}
// O(n^2 * L) time where L is the substring length, O(n) space
```

The five steps, said aloud: "`dp[i]` is whether the first i characters can be segmented. For each end position I look for a split point where the prefix is breakable and the remainder is a dictionary word. The base case is `dp[0] = true` for the empty string, which is what seeds everything. I iterate ends increasing, so every split point is already computed.

The `break` is a small optimisation — once one valid split is found, the answer for this end is settled."

Then the improvement worth volunteering: "The substring allocation makes this more expensive than it looks. I could bound the inner loop by the longest dictionary word, or use a trie to walk characters without allocating substrings, which brings it closer to O(n * maxWordLength)."

That optimisation shows you noticed the hidden cost of `substring`, which connects back to the Java string lesson.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Sequence decisions with a constraint between neighbours
- Counting ways to reach a target
- Best subarray or subsequence by some measure
- Segmentation and parsing feasibility
- Trading and scheduling with modes or cooldowns""",
                    ),
                    (
                        "Trade-offs",
                        """- **O(n^2) versus O(n log n) for LIS.** Simpler and slower, versus faster and only giving the length directly.
- **Space reduction.** Fixed look-back reduces to O(1); scan-all-previous cannot.
- **Break on first success.** Valid for feasibility, wrong for counting.
- **Substring allocation.** Clear code with a hidden cost; a trie or an index-based comparison avoids it.
- **Extra state dimensions.** More modes mean more correctness and more code; keep the dimension as small as the problem allows.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Returning `dp[n-1]` for extend-or-restart problems instead of the running maximum
- Overwriting a state value before the other transitions have used it
- Getting the loop order wrong in coin-change counting
- Claiming the LIS `tails` array is the actual subsequence
- Forgetting the empty base case in segmentation problems
- Ignoring the cost of `substring` inside a nested loop""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do it in O(1) space?"** — Yes for fixed look-back; no for scan-all-previous.
- **"Can you make LIS faster?"** — The patience-sorting approach at O(n log n), with the caveat about reconstruction.
- **"Count the ways instead of the best."** — Change `max` to `+` and check whether the loop order now matters.
- **"What if the array is circular?"** — Case-split on the coupled elements.
- **"Reconstruct the actual answer."** — Store predecessors and walk backwards.""",
                    ),
                    (
                        "Mini Exercise",
                        """Write the state and recurrence for each:

1. Maximum subarray sum.
2. Maximum product subarray.
3. Longest increasing subsequence, then the O(n log n) version.
4. House robber, then the circular variant.
5. Number of ways to make an amount as combinations, then as permutations.
6. Minimum number of perfect squares summing to n.
7. Best time to buy and sell stock with a cooldown.

Numbers 5a and 5b differ only in loop order. Write both, run them on amount 4 with coins 1 and 2, and confirm you get 3 and 5 respectively — that experiment makes the distinction permanent.""",
                    ),
                    (
                        "Interview Tip",
                        """Name the shape out loud: "this is the extend-or-restart pattern, so `dp[i]` is the best ending at i and the answer is the maximum over all i." Naming the shape gets you to a correct recurrence faster than deriving it, and it tells the interviewer you recognise the family rather than the specific problem.""",
                    ),
                ],
                [
                    "Four shapes cover 1D DP: fixed look-back, extend-or-restart, scan-all-previous, and unbounded choice.",
                    "For extend-or-restart, the answer is the running maximum, not the final state.",
                    "Loop order decides combinations versus permutations in counting problems — know why, not just which.",
                    "Save previous values before overwriting when several transitions reference the same step.",
                ],
                [
                    "What does dp[i] mean in the maximum subarray problem, and why is the answer not dp[n-1]?",
                    "How does the loop order change coin-change counting?",
                    "How do you find the longest increasing subsequence in O(n log n)?",
                    "How do you handle a circular constraint in a linear DP?",
                ],
                ["single-pass-profit"],
            ),
            DL(
                "dp-space-and-reconstruction",
                "Space Optimisation and Reconstructing the Answer",
                "Rolling arrays, in-place updates, and recovering the actual solution rather than just its value.",
                11,
                "Two follow-ups arrive on almost every DP problem: can you use less memory, and can you produce the actual solution rather than its score? Both have standard techniques, and both are worth practising separately from the recurrence, because they are mechanical once the DP is correct.",
                [
                    (
                        "Why It Matters",
                        """"Can you reduce the space?" is asked so consistently that having no answer is conspicuous. The technique is simple — keep only the states still needed — but the details, particularly the iteration direction for in-place updates, are easy to get wrong under pressure.

Reconstruction matters because many real questions want the subsequence, the path, or the partition rather than its length, and a DP that only stores values cannot produce it.""",
                    ),
                    (
                        "Mental Model",
                        """Keep only what the recurrence still reads.

Full table → rolling rows → single row → constants

| Recurrence reads | Keep |
| --- | --- |
| `dp[i-1]` only | One variable, or one row |
| `dp[i-1]` and `dp[i-2]` | Two variables |
| Row `i-1` of a 2D table | One row, iterated carefully |
| Arbitrary earlier states | The whole table |

For reconstruction, either store a parent pointer per state, or walk the completed table backwards re-deriving which transition was taken.""",
                    ),
                    (
                        "How It Works",
                        """### Rolling a 2D table to one row

Knapsack is the canonical example, and the iteration direction is the whole trick.

```java
// Full table: O(n * capacity) space
int knapsack(int[] weights, int[] values, int capacity) {
    int[][] dp = new int[weights.length + 1][capacity + 1];
    for (int i = 1; i <= weights.length; i++)
        for (int c = 0; c <= capacity; c++) {
            dp[i][c] = dp[i - 1][c];                                   // skip item i
            if (weights[i - 1] <= c) {
                dp[i][c] = Math.max(dp[i][c],
                                    dp[i - 1][c - weights[i - 1]] + values[i - 1]);
            }
        }
    return dp[weights.length][capacity];
}

// One row: O(capacity) space - iterate capacity DOWNWARDS
int knapsack1D(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];
    for (int i = 0; i < weights.length; i++)
        for (int c = capacity; c >= weights[i]; c--) {                 // DESCENDING
            dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
        }
    return dp[capacity];
}
```

**Why descending?** Because `dp[c - weight]` must still hold the value from the *previous* item. Iterating upwards would read a value already updated for the current item, which allows using the item more than once.

That is exactly the difference between 0/1 knapsack and unbounded knapsack:

```java
// Unbounded: each item may be used many times - iterate capacity UPWARDS
for (int c = weights[i]; c <= capacity; c++) {
    dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
}
```

One loop direction changes the semantics of the algorithm. Being able to explain that, rather than recall it, is the depth signal in this topic.

### Two rows when both are needed

```java
// Edit distance with two rows
int minDistance(String a, String b) {
    int[] previous = new int[b.length() + 1];
    int[] current = new int[b.length() + 1];
    for (int j = 0; j <= b.length(); j++) previous[j] = j;

    for (int i = 1; i <= a.length(); i++) {
        current[0] = i;
        for (int j = 1; j <= b.length(); j++) {
            current[j] = (a.charAt(i - 1) == b.charAt(j - 1))
                ? previous[j - 1]
                : 1 + Math.min(previous[j - 1], Math.min(previous[j], current[j - 1]));
        }
        int[] swap = previous; previous = current; current = swap;    // rotate
    }
    return previous[b.length()];
}
// O(n * m) time, O(m) space
```

Swapping the row references rather than copying is the efficient form. Returning `previous` after the final swap, not `current`, is the off-by-one to watch.

### Reconstruction by storing choices

```java
// Longest increasing subsequence, with the actual subsequence
List<Integer> lisSequence(int[] nums) {
    int n = nums.length;
    int[] dp = new int[n], parent = new int[n];
    Arrays.fill(dp, 1);
    Arrays.fill(parent, -1);
    int bestIndex = 0;

    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
                dp[i] = dp[j] + 1;
                parent[i] = j;                       // remember where we came from
            }
        }
        if (dp[i] > dp[bestIndex]) bestIndex = i;
    }

    LinkedList<Integer> out = new LinkedList<>();
    for (int i = bestIndex; i != -1; i = parent[i]) out.addFirst(nums[i]);
    return out;
}
```

The parent array costs O(n) and turns a length into a sequence. Note that this reconstruction is incompatible with the space-optimised version — **you generally cannot both minimise space and reconstruct the path**, and saying so is the honest answer when asked for both.

### Reconstruction by walking the table backwards

When the full table is retained, no parent array is needed — re-derive which transition was taken:

```java
// Which items are in the knapsack
List<Integer> chosenItems(int[][] dp, int[] weights, int capacity) {
    List<Integer> out = new ArrayList<>();
    int c = capacity;
    for (int i = weights.length; i > 0; i--) {
        if (dp[i][c] != dp[i - 1][c]) {              // value changed, so item i was taken
            out.add(i - 1);
            c -= weights[i - 1];
        }
    }
    return out;
}
```

This is O(n) extra time and no extra space beyond the table you already had.

### In-place DP on the input

Some problems allow using the input array as the table:

```java
// Minimum path sum, modifying the grid in place
for (int r = 0; r < rows; r++)
    for (int c = 0; c < cols; c++) {
        if (r == 0 && c == 0) continue;
        int fromTop  = (r > 0) ? grid[r - 1][c] : Integer.MAX_VALUE;
        int fromLeft = (c > 0) ? grid[r][c - 1] : Integer.MAX_VALUE;
        grid[r][c] += Math.min(fromTop, fromLeft);
    }
```

O(1) extra space, at the cost of destroying the input. Always confirm mutation is acceptable before doing this.""",
                    ),
                    (
                        "Example",
                        """"Partition an array into two subsets with equal sum, and return one of the subsets."

```java
List<Integer> partition(int[] nums) {
    int total = Arrays.stream(nums).sum();
    if (total % 2 != 0) return null;                 // odd total cannot split
    int target = total / 2;

    boolean[][] dp = new boolean[nums.length + 1][target + 1];
    for (int i = 0; i <= nums.length; i++) dp[i][0] = true;   // empty subset makes 0

    for (int i = 1; i <= nums.length; i++)
        for (int s = 1; s <= target; s++) {
            dp[i][s] = dp[i - 1][s];                          // skip this number
            if (nums[i - 1] <= s) dp[i][s] |= dp[i - 1][s - nums[i - 1]];
        }

    if (!dp[nums.length][target]) return null;

    List<Integer> subset = new ArrayList<>();
    int s = target;
    for (int i = nums.length; i > 0; i--) {
        if (!dp[i - 1][s]) {                                  // this number was needed
            subset.add(nums[i - 1]);
            s -= nums[i - 1];
        }
    }
    return subset;
}
// O(n * sum) time and space
```

What to say: "The feasibility DP is subset-sum: can any subset reach half the total? For reconstruction I keep the full two-dimensional table and walk backwards — if the answer was not already achievable without item i, then item i must have been used.

If I only needed the yes/no answer, I could reduce to a single boolean row iterated downwards, giving O(sum) space. But reconstruction needs the history, so the two-dimensional table is the price of returning the actual subset."

Making the space-versus-reconstruction trade explicit is exactly what the follow-up is looking for.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Reducing knapsack-style tables from 2D to 1D
- Two-row rolling for string alignment problems
- Recovering the actual subsequence, path, or partition
- In-place DP over a grid
- Fitting a large DP into a memory limit""",
                    ),
                    (
                        "Trade-offs",
                        """- **Space versus reconstruction.** You usually cannot have both; keep the table if the path is needed.
- **In-place versus preserving the input.** O(1) space at the cost of mutation.
- **Parent pointers versus backward re-derivation.** Extra memory and simpler code, versus no memory and slightly subtler logic.
- **Optimise early versus late.** Get the correct unoptimised version first; space reduction is a mechanical transformation afterwards.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Iterating capacity upwards in 0/1 knapsack, silently allowing item reuse
- Returning the wrong row after the final swap
- Space-optimising before the base version is correct
- Trying to reconstruct from a space-optimised table
- Mutating the caller's input without asking
- Forgetting that reconstruction needs a tie-breaking rule when several optimal solutions exist""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you reduce the space?"** — Name what the recurrence reads and keep only that.
- **"Why does the loop direction matter?"** — Descending keeps previous-item values; ascending allows reuse, which is unbounded knapsack.
- **"Can you return the actual items?"** — Yes, with the full table or parent pointers, and note the space trade.
- **"What if there are several optimal answers?"** — Any is usually acceptable; the reconstruction rule determines which you get.
- **"Can you do it in place?"** — Sometimes, and it destroys the input.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Reduce 0/1 knapsack to one row and explain the loop direction.
2. Change it to unbounded knapsack by changing one line.
3. Reduce edit distance to two rows, then to one plus a temporary.
4. Reconstruct the longest common subsequence, not just its length.
5. Return the items in an optimal knapsack.
6. Compute minimum path sum in a grid with O(1) extra space.

Number 3 is the hardest reduction: going from two rows to one requires holding the diagonal value in a temporary before it is overwritten, and working out where that temporary must be saved is a genuine exercise.""",
                    ),
                    (
                        "Interview Tip",
                        """Write the correct full-table DP first and say "I will reduce the space once this is right". Interviewers accept that readily, and it prevents the very common failure of producing a space-optimised version with an inverted loop that quietly solves a different problem.""",
                    ),
                ],
                [
                    "Keep only the states the recurrence still reads — often one or two rows, or two variables.",
                    "In 0/1 knapsack the capacity loop must descend; ascending turns it into unbounded knapsack.",
                    "Reconstruction needs history: parent pointers, or the full table walked backwards.",
                    "You generally cannot both minimise space and reconstruct the path — state the trade.",
                ],
                [
                    "How do you reduce a 2D DP table to one row?",
                    "Why must the knapsack capacity loop iterate downwards?",
                    "How do you return the actual solution rather than its value?",
                    "What is the trade-off between space optimisation and reconstruction?",
                ],
            ),
        ],
        roadmap_key="dp-1d",
        practice_tag="dynamic-programming",
    )


def _dp2d_topic() -> dict:
    return _dsa_topic(
        "dp-2d",
        "Two-Dimensional and Advanced DP",
        "Grids, two sequences, knapsack, interval DP, and the bitmask and tree variants.",
        "HARD",
        24,
        [
            DL(
                "two-index-dp",
                "Two-Index DP: Grids and Sequence Pairs",
                "When the state needs two indices, and the three transitions that cover most of them.",
                13,
                "Two-dimensional DP appears in two guises: a grid where the state is a cell, and a pair of sequences where the state is a position in each. Both reduce to a small set of transitions, and recognising which guise you are in tells you the recurrence almost immediately.",
                [
                    (
                        "Why It Matters",
                        """Edit distance, longest common subsequence, and grid paths are among the most frequently asked hard-ish problems, and they are all the same shape. Once you can write the LCS recurrence without thinking, edit distance, distinct subsequences, and interleaving strings all follow.

They also teach the discipline of drawing the table. Candidates who sketch a small grid and fill in three cells by hand almost never get the recurrence wrong; candidates who reason purely in their heads frequently do.""",
                    ),
                    (
                        "Mental Model",
                        """Two guises, one framework.

| Guise | State | Transitions |
| --- | --- | --- |
| Grid | `dp[r][c]` = best to reach or from cell (r, c) | From the cell above and the cell to the left |
| Two sequences | `dp[i][j]` = best using the first i of A and first j of B | Match, or advance one, or advance the other |

For sequence pairs, the recurrence almost always splits on whether the current characters match:

- If they match, the answer extends the diagonal `dp[i-1][j-1]`.
- If they do not, it comes from `dp[i-1][j]` or `dp[i][j-1]`, or both.

> Memory cue: draw the table with the empty prefix as row 0 and column 0. Those base cases are where most of the errors live.""",
                    ),
                    (
                        "How It Works",
                        """### Grid paths

```java
int uniquePaths(int rows, int cols) {
    int[] dp = new int[cols];
    Arrays.fill(dp, 1);                         // the top row has exactly one path each
    for (int r = 1; r < rows; r++)
        for (int c = 1; c < cols; c++)
            dp[c] += dp[c - 1];                 // from above (dp[c]) plus from the left
    return dp[cols - 1];
}
// O(rows * cols) time, O(cols) space
```

The rolled version reads `dp[c]` as "the value from the previous row" before it is overwritten, which is exactly why the single row works without a temporary here.

With obstacles, the only change is zeroing blocked cells:

```java
if (grid[r][c] == OBSTACLE) dp[c] = 0;
else if (c > 0) dp[c] += dp[c - 1];
```

### Minimum path sum

```java
int minPathSum(int[][] grid) {
    int rows = grid.length, cols = grid[0].length;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (r == 0 && c == 0) continue;
            int fromTop  = (r > 0) ? grid[r - 1][c] : Integer.MAX_VALUE;
            int fromLeft = (c > 0) ? grid[r][c - 1] : Integer.MAX_VALUE;
            grid[r][c] += Math.min(fromTop, fromLeft);
        }
    return grid[rows - 1][cols - 1];
}
// O(rows * cols) time, O(1) extra space (mutates the input)
```

Note that this only works because movement is restricted to right and down, making the grid a DAG. **If movement were in all four directions, this would not be DP at all — it would be Dijkstra**, because there would be no acyclic ordering of the states. That distinction is a genuinely good thing to volunteer.

### Longest common subsequence

```java
int lcs(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++) {
            dp[i][j] = (a.charAt(i - 1) == b.charAt(j - 1))
                ? dp[i - 1][j - 1] + 1                                 // match: take the diagonal
                : Math.max(dp[i - 1][j], dp[i][j - 1]);                // skip one or the other
        }
    return dp[a.length()][b.length()];
}
// O(n * m) time, O(n * m) space, reducible to O(min(n, m))
```

Row 0 and column 0 are zero, representing an empty prefix — which the array initialisation gives for free. The `i - 1` indexing into the strings while the table uses `i` is the standard offset, and mixing them up is the most common bug in this shape.

### Edit distance

```java
int minDistance(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    for (int i = 0; i <= a.length(); i++) dp[i][0] = i;    // delete everything
    for (int j = 0; j <= b.length(); j++) dp[0][j] = j;    // insert everything

    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];                // free match
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],   // replace
                                Math.min(dp[i - 1][j],      // delete from a
                                         dp[i][j - 1]));    // insert into a
            }
        }
    return dp[a.length()][b.length()];
}
```

The three operations map exactly to the three neighbours, and naming which neighbour is which operation is how you avoid guessing. Unlike LCS, the base row and column are *not* zero — they represent converting a prefix to or from an empty string.

### Longest common substring, which is different

```java
// SUBSTRING must be contiguous: a mismatch resets to 0
int longestCommonSubstring(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    int best = 0;
    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                best = Math.max(best, dp[i][j]);            // answer is the maximum anywhere
            }
            // else: leave it at 0 - the run is broken
        }
    return best;
}
```

Three differences from LCS, all consequences of contiguity: mismatches reset to zero rather than carrying forward, the answer is the maximum over the whole table rather than the corner, and there is no `max` of the two neighbours.

Being able to state why each difference follows from "contiguous" is the mark of understanding rather than memorisation.

### Drawing the table

For any of these, sketch a 3-by-4 table, fill in row 0 and column 0, then compute three interior cells by hand before writing code. It takes ninety seconds and it catches base-case and indexing errors while they are still cheap. Doing it visibly in an interview is also good narration.""",
                    ),
                    (
                        "Example",
                        """"Given strings s, t, and an interleaving candidate r, determine whether r is formed by interleaving s and t while preserving the relative order of each."

```java
boolean isInterleave(String s, String t, String r) {
    if (s.length() + t.length() != r.length()) return false;    // cheap early exit

    boolean[][] dp = new boolean[s.length() + 1][t.length() + 1];
    dp[0][0] = true;

    for (int i = 0; i <= s.length(); i++)
        for (int j = 0; j <= t.length(); j++) {
            if (i > 0 && dp[i - 1][j] && s.charAt(i - 1) == r.charAt(i + j - 1)) {
                dp[i][j] = true;                                // took a character from s
            }
            if (j > 0 && dp[i][j - 1] && t.charAt(j - 1) == r.charAt(i + j - 1)) {
                dp[i][j] = true;                                // took a character from t
            }
        }
    return dp[s.length()][t.length()];
}
// O(n * m) time, O(n * m) space, reducible to one row
```

What to say: "`dp[i][j]` is whether the first `i + j` characters of r can be formed from the first i of s and the first j of t. The key observation is that the position in r is *determined* by i and j — it is `i + j` — so no third dimension is needed.

Each state has two transitions: the last character of r came from s, or from t. The length check first rules out the trivially impossible case.

A greedy approach fails here, because when both s and t offer the same next character, the correct choice depends on what follows — which is exactly the signal that this needs DP."

That last observation is worth volunteering, because "why not greedy?" is the obvious follow-up and the answer is concrete.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Grid path counting and optimisation
- Sequence comparison: diffs, alignment, similarity
- Matching with wildcards or regular expressions
- Subsequence counting
- Any problem over two sequences advanced independently""",
                    ),
                    (
                        "Trade-offs",
                        """- **Full table versus rolled rows.** O(n * m) versus O(min(n, m)) space, at the cost of reconstruction.
- **Top-down versus bottom-up.** Memoisation skips unreachable states; tabulation is faster per state and easier to roll.
- **Mutating the input grid.** O(1) space and destructive.
- **DP versus Dijkstra on grids.** Restricted movement makes it a DAG and therefore DP; free movement makes it a shortest-path problem.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Confusing subsequence with substring, and using the wrong recurrence
- Wrong base row and column — zero for LCS, but not for edit distance
- Mixing the table index with the string index, which are offset by one
- Reading the answer from the corner when it should be the table maximum
- Rolling to one row without accounting for the diagonal value being overwritten
- Applying DP to a grid with unrestricted movement""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What does dp[i][j] mean?"** — A full sentence naming both indices.
- **"What are the base cases?"** — Row 0 and column 0, and say what they represent.
- **"Can you reduce the space?"** — One or two rows; note that reconstruction then becomes impossible.
- **"What if movement were unrestricted?"** — It stops being DP and becomes Dijkstra or BFS.
- **"Substring or subsequence?"** — Always confirm; the recurrences differ fundamentally.""",
                    ),
                    (
                        "Mini Exercise",
                        """Write the state, recurrence, and base cases for each, then hand-fill a 3-by-4 table:

1. Unique paths in a grid.
2. Minimum path sum.
3. Longest common subsequence.
4. Longest common substring.
5. Edit distance.
6. Number of distinct subsequences of s equal to t.
7. Is r an interleaving of s and t.

Numbers 3 and 4 differ by two lines and are a good test of whether you understand the recurrences rather than recall them.""",
                    ),
                    (
                        "Interview Tip",
                        """Draw the table and fill three cells by hand before writing the loops. It takes a minute, it catches the base-case errors that otherwise cost ten, and narrating it gives the interviewer a clear view of your reasoning.""",
                    ),
                ],
                [
                    "Two-index DP comes in two guises: grid cells, and positions in a pair of sequences.",
                    "Sequence-pair recurrences split on whether the current characters match: diagonal if yes, neighbours if no.",
                    "LCS base cases are zero; edit distance base cases are the prefix lengths — they represent different things.",
                    "A grid with restricted movement is DP; unrestricted movement makes it a shortest-path problem.",
                ],
                [
                    "What is the recurrence for longest common subsequence?",
                    "How does longest common substring differ, and why?",
                    "What do the base row and column represent in edit distance?",
                    "When does a grid problem stop being dynamic programming?",
                ],
                ["valley-rain"],
            ),
            DL(
                "knapsack-and-subset-dp",
                "Knapsack and Subset DP",
                "The family of capacity-constrained problems, and how to recognise a knapsack in disguise.",
                12,
                "Knapsack problems ask which items to choose subject to a capacity. An enormous number of interview problems are knapsack in disguise — partition into equal subsets, target sum, coin change, and stone game are all the same recurrence with different framing. Recognising the disguise is the skill.",
                [
                    (
                        "Why It Matters",
                        """The knapsack recurrence is one of the highest-return things to know cold, because the problems that reduce to it rarely mention capacity or items. "Can this array be split into two equal-sum halves?" is subset-sum, which is knapsack with values equal to weights.

The 0/1 versus unbounded distinction also has a one-line implementation difference that is a favourite follow-up.""",
                    ),
                    (
                        "Mental Model",
                        """Each item: take it or leave it, subject to remaining capacity.

`dp[i][c] = max(dp[i-1][c], dp[i-1][c - weight[i]] + value[i])`

| Variant | Rule | Loop direction when rolled |
| --- | --- | --- |
| 0/1 knapsack | Each item once | Capacity descending |
| Unbounded knapsack | Unlimited copies | Capacity ascending |
| Bounded knapsack | At most k copies | Binary splitting, or an extra dimension |
| Subset sum | Values equal weights, feasibility only | Either, with a boolean table |
| Partition into equal halves | Subset sum to half the total | As above |

> Memory cue: the loop direction *is* the variant. Descending means each item is considered once; ascending lets it be reused.""",
                    ),
                    (
                        "How It Works",
                        """### 0/1 knapsack

```java
int knapsack(int[] weights, int[] values, int capacity) {
    int[] dp = new int[capacity + 1];
    for (int i = 0; i < weights.length; i++)
        for (int c = capacity; c >= weights[i]; c--) {      // DESCENDING
            dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
        }
    return dp[capacity];
}
// O(items * capacity) time, O(capacity) space
```

### Subset sum and equal partition

```java
boolean canPartition(int[] nums) {
    int total = Arrays.stream(nums).sum();
    if (total % 2 != 0) return false;                        // odd sums cannot split
    int target = total / 2;

    boolean[] dp = new boolean[target + 1];
    dp[0] = true;                                            // empty subset sums to 0
    for (int x : nums)
        for (int s = target; s >= x; s--) {                  // descending: each number once
            dp[s] |= dp[s - x];
        }
    return dp[target];
}
// O(n * sum) time, O(sum) space
```

The framing translation to state: "This is subset-sum where each number's weight and value are the same, and the target capacity is half the total. The odd-total check is a free early exit."

### Target sum with plus and minus signs

A neat reduction worth knowing:

> Assign + or - to each number so the total equals a target.

Let P be the subset assigned +, and N the subset assigned -. Then `P - N = target` and `P + N = total`, so `P = (target + total) / 2`. The problem becomes: how many subsets sum to P — a counting subset-sum.

```java
int findTargetSumWays(int[] nums, int target) {
    int total = Arrays.stream(nums).sum();
    if ((total + target) % 2 != 0 || Math.abs(target) > total) return 0;
    int p = (total + target) / 2;

    int[] dp = new int[p + 1];
    dp[0] = 1;
    for (int x : nums)
        for (int s = p; s >= x; s--) {
            dp[s] += dp[s - x];
        }
    return dp[p];
}
```

The algebraic reduction is the whole problem; without it, the naive recursion is 2^n. Deriving it out loud is a strong moment in an interview.

### Unbounded knapsack: coin change

```java
// Minimum coins
int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int coin : coins)
            if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}
```

### Two-dimensional capacity

Some problems constrain on two resources at once, which simply adds a dimension:

```java
// Maximum strings formable with at most m zeros and n ones
int findMaxForm(String[] strs, int m, int n) {
    int[][] dp = new int[m + 1][n + 1];
    for (String s : strs) {
        int zeros = (int) s.chars().filter(c -> c == '0').count();
        int ones = s.length() - zeros;
        for (int i = m; i >= zeros; i--)                     // both descending
            for (int j = n; j >= ones; j--) {
                dp[i][j] = Math.max(dp[i][j], dp[i - zeros][j - ones] + 1);
            }
    }
    return dp[m][n];
}
// O(items * m * n)
```

Both capacity loops descend, for the same reason as in one dimension.

### The pseudo-polynomial caveat

Knapsack is O(items * capacity), which is polynomial in the *value* of the capacity but exponential in its number of bits. For a capacity of 10^9 it is intractable, and 0/1 knapsack is NP-hard in general.

Saying this unprompted is a strong signal: "This is pseudo-polynomial — fine for a capacity in the thousands, not for one in the billions. If the capacity were huge but the number of items small, I would consider meet-in-the-middle at O(2^(n/2)) instead."

### Recognising the disguise

| Problem framing | Actually |
| --- | --- |
| Split into two equal halves | Subset sum to half the total |
| Assign + and - to reach a target | Counting subset sum after an algebraic reduction |
| Fewest coins for an amount | Unbounded knapsack, minimising count |
| Number of ways to make an amount | Unbounded knapsack, counting |
| Fill a bag of given size with items | 0/1 knapsack |
| Maximise score picking from ends | Interval DP, not knapsack — a useful negative example |""",
                    ),
                    (
                        "Example",
                        """"You have stones with given weights. Each turn, smash two stones together; if they differ, the difference remains. Return the smallest possible remaining weight."

The reduction is the entire problem:

```java
int lastStoneWeightII(int[] stones) {
    int total = Arrays.stream(stones).sum();
    int target = total / 2;

    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int stone : stones)
        for (int s = target; s >= stone; s--) {
            dp[s] |= dp[s - stone];
        }

    for (int s = target; s >= 0; s--) {
        if (dp[s]) return total - 2 * s;            // the best achievable split
    }
    return total;
}
// O(n * sum) time, O(sum) space
```

What to say: "Every smashing sequence is equivalent to assigning each stone to one of two piles and taking the difference of their totals — the order of smashing does not change the achievable differences. So I want two piles as close to equal as possible.

That is subset-sum: find the largest achievable sum at most half the total. The answer is `total - 2 * bestSum`.

The insight is that a physical-sounding simulation problem is really a partition problem. A greedy 'always smash the two largest' approach seems natural and is wrong — on stones 3, 4, 5 it gives 2, while the optimal partition gives 0."

Having the greedy counterexample ready is what makes the argument convincing rather than assertive.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Resource allocation under a budget or capacity
- Partitioning into balanced groups
- Counting subsets meeting a sum condition
- Currency and denomination problems
- Selection under two simultaneous constraints""",
                    ),
                    (
                        "Trade-offs",
                        """- **Pseudo-polynomial cost.** Fine for modest capacities; intractable for very large ones.
- **Boolean versus integer tables.** Feasibility needs one bit per state; counting and optimisation need more.
- **Rolled versus full table.** Space reduction versus the ability to reconstruct the chosen items.
- **DP versus meet-in-the-middle.** When n is small but the capacity is huge, O(2^(n/2)) can win.
- **Greedy temptation.** Almost every knapsack disguise has a plausible greedy that fails; have the counterexample.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Iterating capacity ascending in 0/1 knapsack, allowing reuse
- Forgetting `dp[0] = true` or `dp[0] = 1` as the base case
- Missing the parity or range check in the target-sum reduction
- Claiming polynomial complexity for a pseudo-polynomial algorithm
- Applying a greedy rule to a knapsack problem
- Not recognising the disguise and attempting an exponential search""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why does the loop go downwards?"** — So each item is considered once; ascending makes it unbounded.
- **"What is the complexity?"** — O(items * capacity), and note it is pseudo-polynomial.
- **"Which items were chosen?"** — Keep the full table and walk backwards.
- **"What if each item may be used k times?"** — Add a dimension, or binary-split the counts into powers of two.
- **"Would greedy work?"** — No for 0/1; give the counterexample.
- **"What if the capacity is enormous but there are only 30 items?"** — Meet in the middle.""",
                    ),
                    (
                        "Mini Exercise",
                        """Identify the knapsack variant and write the recurrence:

1. Can an array be split into two equal-sum subsets?
2. Number of ways to assign + and - to reach a target.
3. Fewest coins to make an amount.
4. Number of ways to make an amount with unlimited coins.
5. Maximum value in a bag of capacity W with each item available once.
6. Maximum number of strings formable from a budget of zeros and ones.
7. Smallest possible remaining stone weight.

Numbers 1, 2 and 7 all reduce to subset-sum with different post-processing, and seeing that all three are one algorithm is the point of the exercise.""",
                    ),
                    (
                        "Interview Tip",
                        """When you see a partition, selection, or budget constraint, say "this looks like knapsack — let me define the capacity and the items". Naming the reduction converts an unfamiliar problem into one you have already solved several times.""",
                    ),
                ],
                [
                    "Knapsack is take-or-leave under a capacity, and a large family of problems is it in disguise.",
                    "Descending capacity means 0/1; ascending means unbounded — one loop direction defines the variant.",
                    "Target-sum reduces to counting subset-sum via `P = (target + total) / 2`.",
                    "Knapsack is pseudo-polynomial: O(items * capacity) is fine for thousands, not for billions.",
                ],
                [
                    "How do you recognise a knapsack problem that does not mention capacity?",
                    "Why does the capacity loop direction change the meaning of the algorithm?",
                    "How does target-sum reduce to subset-sum?",
                    "What does pseudo-polynomial mean and why does it matter here?",
                ],
            ),
            DL(
                "string-dp",
                "String DP: Matching, Palindromes, and Subsequences",
                "Wildcards, regular expressions, palindromic substructure, and counting distinct subsequences.",
                13,
                "String dynamic programming extends the two-sequence framework to matching problems where a character can consume a variable amount of input, and to palindrome problems where the natural state is an interval rather than a prefix. Both are common and both have specific traps.",
                [
                    (
                        "Why It Matters",
                        """Wildcard and regular-expression matching are among the hardest commonly-asked problems, and they are entirely tractable with the two-index framework plus careful handling of the star operator. Palindrome problems are asked constantly and have an unusual iteration order that catches people.

These are also the problems where drawing the table matters most, because the transitions are not symmetric and reasoning in your head is unreliable.""",
                    ),
                    (
                        "Mental Model",
                        """Two shapes beyond plain LCS.

| Shape | State | Iteration |
| --- | --- | --- |
| Matching with wildcards | `dp[i][j]` = does s[0..i) match p[0..j) | Row by row, forwards |
| Palindromic substructure | `dp[i][j]` = property of the substring i..j | By increasing length, or i descending |

The palindrome iteration order is the trap: `dp[i][j]` depends on `dp[i+1][j-1]`, which is a *shorter* interval, so you must either iterate by length or iterate i downwards.""",
                    ),
                    (
                        "How It Works",
                        """### Longest palindromic substring, as DP

```java
String longestPalindrome(String s) {
    int n = s.length();
    boolean[][] dp = new boolean[n][n];
    int start = 0, maxLength = 1;

    for (int i = 0; i < n; i++) dp[i][i] = true;            // single characters

    for (int length = 2; length <= n; length++)             // BY LENGTH
        for (int i = 0; i + length - 1 < n; i++) {
            int j = i + length - 1;
            if (s.charAt(i) != s.charAt(j)) continue;
            if (length == 2 || dp[i + 1][j - 1]) {
                dp[i][j] = true;
                if (length > maxLength) { maxLength = length; start = i; }
            }
        }
    return s.substring(start, start + maxLength);
}
// O(n^2) time, O(n^2) space
```

The `length == 2` special case is needed because `dp[i+1][j-1]` would be an empty interval. Iterating by length guarantees the inner interval is already computed.

Expand-around-centre solves the same problem in O(n^2) time and O(1) space, so it is the better answer for *this* question — but the DP table generalises to counting palindromic substrings and to palindrome partitioning, which the expansion does not. Saying that is the right way to present both.

### Longest palindromic subsequence

```java
int longestPalindromeSubseq(String s) {
    int n = s.length();
    int[][] dp = new int[n][n];
    for (int i = n - 1; i >= 0; i--) {                      // i DESCENDING
        dp[i][i] = 1;
        for (int j = i + 1; j < n; j++) {
            dp[i][j] = (s.charAt(i) == s.charAt(j))
                ? dp[i + 1][j - 1] + 2
                : Math.max(dp[i + 1][j], dp[i][j - 1]);
        }
    }
    return dp[0][n - 1];
}
// O(n^2) time and space
```

Iterating i downwards means `dp[i+1][...]` is already filled. The neat alternative worth mentioning: the longest palindromic subsequence of s equals the LCS of s and its reverse — which is a one-line solution reusing code you already have.

### Wildcard matching

Pattern with `?` matching any single character and `*` matching any sequence including empty.

```java
boolean isMatch(String s, String p) {
    int n = s.length(), m = p.length();
    boolean[][] dp = new boolean[n + 1][m + 1];
    dp[0][0] = true;

    for (int j = 1; j <= m; j++) {                          // empty s: only stars can match
        dp[0][j] = dp[0][j - 1] && p.charAt(j - 1) == '*';
    }

    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            char pc = p.charAt(j - 1);
            if (pc == '*') {
                dp[i][j] = dp[i - 1][j]      // star consumes this character of s
                        || dp[i][j - 1];     // star matches empty
            } else {
                dp[i][j] = dp[i - 1][j - 1]
                        && (pc == '?' || pc == s.charAt(i - 1));
            }
        }
    return dp[n][m];
}
// O(n * m) time and space
```

The star's two transitions are the whole problem, and the base row — where only a pattern of all stars can match an empty string — is where implementations most often break.

### Regular expression matching

`.` matches any character, `*` means zero or more of the *preceding* element, which is a different and harder semantics.

```java
boolean isMatch(String s, String p) {
    int n = s.length(), m = p.length();
    boolean[][] dp = new boolean[n + 1][m + 1];
    dp[0][0] = true;

    for (int j = 2; j <= m; j++) {                          // patterns like a*b*c* match empty
        if (p.charAt(j - 1) == '*') dp[0][j] = dp[0][j - 2];
    }

    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            char pc = p.charAt(j - 1);
            if (pc == '*') {
                char preceding = p.charAt(j - 2);
                dp[i][j] = dp[i][j - 2]                     // zero occurrences
                        || (matches(s.charAt(i - 1), preceding) && dp[i - 1][j]);   // one more
            } else {
                dp[i][j] = dp[i - 1][j - 1] && matches(s.charAt(i - 1), pc);
            }
        }
    return dp[n][m];
}

private boolean matches(char sc, char pc) { return pc == '.' || pc == sc; }
```

The difference from wildcard matching: the star applies to the *previous* pattern character, so skipping it means jumping back two positions, not one. Confusing the two star semantics is the most common error, and stating the difference explicitly before coding is the way to avoid it.

### Distinct subsequences

```java
// How many distinct subsequences of s equal t
int numDistinct(String s, String t) {
    int[] dp = new int[t.length() + 1];
    dp[0] = 1;                                              // empty t matches once
    for (int i = 1; i <= s.length(); i++)
        for (int j = t.length(); j >= 1; j--) {             // DESCENDING, like 0/1 knapsack
            if (s.charAt(i - 1) == t.charAt(j - 1)) dp[j] += dp[j - 1];
        }
    return dp[t.length()];
}
// O(n * m) time, O(m) space
```

The descending inner loop is the same trick as 0/1 knapsack: each character of s may be used at most once per subsequence, so `dp[j-1]` must hold the previous row's value.""",
                    ),
                    (
                        "Example",
                        """"Count the palindromic substrings in a string."

Both approaches are worth presenting:

```java
// Expand around centre: O(n^2) time, O(1) space
int countSubstrings(String s) {
    int count = 0;
    for (int centre = 0; centre < s.length(); centre++) {
        count += expand(s, centre, centre);        // odd length
        count += expand(s, centre, centre + 1);    // even length
    }
    return count;
}

int expand(String s, int lo, int hi) {
    int found = 0;
    while (lo >= 0 && hi < s.length() && s.charAt(lo) == s.charAt(hi)) {
        found++; lo--; hi++;
    }
    return found;
}
```

What to say: "Expansion is O(n^2) time and O(1) space, and it is what I would write. The DP table is the same time complexity with O(n^2) space, so it is strictly worse for this question — but if the follow-up asked for the minimum number of palindrome partitions, I would want the table, because it lets me test `isPalindrome(i, j)` in O(1) inside a second DP.

Manacher's algorithm gives O(n) but is substantially more code and I would only reach for it if the constraints demanded linear time."

Presenting three approaches with the condition that selects each is a complete answer, and the observation that the table is worth building when a second DP needs it is the kind of forward-looking reasoning that reads as experienced.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Pattern matching with wildcards or regular expressions
- Palindrome detection, counting, and partitioning
- Sequence similarity and alignment
- Subsequence counting
- Text transformation with edit operations""",
                    ),
                    (
                        "Trade-offs",
                        """- **DP table versus expansion for palindromes.** Same time, worse space, and reusable by a second DP.
- **Wildcard star versus regex star.** Different semantics, different recurrences; never reuse one for the other.
- **Memoised recursion versus tabulation.** Recursion mirrors the matching semantics and is easier to derive; tabulation is faster.
- **Greedy for wildcard matching.** There is an O(n) two-pointer greedy for wildcards specifically; it does not generalise to regex, and it is trickier to get right.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Iterating palindromic intervals in the wrong order, reading uncomputed states
- Missing the `length == 2` case
- Confusing wildcard and regex star semantics
- Forgetting the base row where a pattern must match the empty string
- Ascending inner loop in distinct subsequences, allowing reuse
- Off-by-one between table indices and string indices""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why iterate by length?"** — Because the interval recurrence depends on shorter intervals.
- **"What is the difference between the two star semantics?"** — Wildcard star matches any sequence; regex star repeats the preceding element. Say it before coding.
- **"Can you do it with less space?"** — Palindrome expansion is O(1); matching DPs roll to one row.
- **"How would you find the actual matched substring?"** — Track the best start and length, or store parents.
- **"Could you use LCS here?"** — For longest palindromic subsequence, yes: LCS of s and its reverse.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Longest palindromic substring, by expansion and by DP.
2. Count all palindromic substrings.
3. Longest palindromic subsequence, then via LCS with the reverse.
4. Minimum cuts to partition a string into palindromes.
5. Wildcard matching with `?` and `*`.
6. Regular expression matching with `.` and `*`.
7. Count distinct subsequences of s equal to t.

Number 4 is the one that justifies building the palindrome table: it is a second DP that queries `isPalindrome(i, j)` in O(1), and without the table each query would be O(n).""",
                    ),
                    (
                        "Interview Tip",
                        """State the star semantics before writing a single line of a matching problem: "here the star repeats the preceding character, so skipping it means jumping back two pattern positions." That one sentence separates the two hardest problems in this family and prevents the error that makes both of them fail.""",
                    ),
                ],
                [
                    "Interval DP over substrings must iterate by increasing length, or with the left index descending.",
                    "Wildcard star matches any sequence; regex star repeats the preceding element — different recurrences entirely.",
                    "The longest palindromic subsequence is the LCS of the string and its reverse.",
                    "Expansion beats the DP table for a single palindrome query; the table pays off when a second DP needs O(1) palindrome tests.",
                ],
                [
                    "Why must palindrome DP iterate by interval length?",
                    "How do wildcard and regular-expression star semantics differ?",
                    "How would you count all palindromic substrings, and with what space?",
                    "How does distinct-subsequence counting resemble 0/1 knapsack?",
                ],
            ),
            DL(
                "advanced-dp-patterns",
                "Interval, Bitmask, and Tree DP",
                "The three advanced shapes that appear in harder interviews, and how to recognise them.",
                12,
                "Beyond sequences and grids, three DP shapes appear in harder interviews: interval DP, where the state is a range and the transition picks a split point; bitmask DP, where the state is a subset; and tree DP, where the state is a node and its children's answers. Each has a distinctive trigger.",
                [
                    (
                        "Why It Matters",
                        """These are the shapes that separate candidates at senior level. They are not exotic — burst balloons, matrix chain multiplication, travelling salesman on small n, and house robber on a tree are all standard — but they are unfamiliar enough that a candidate without the framework tends to stall.

The triggers are also distinctive, which makes them learnable: a small n around 20 means bitmask; "merge adjacent" or "remove and the neighbours join" means interval; a tree input with an optimisation objective means tree DP.""",
                    ),
                    (
                        "Mental Model",
                        """Three shapes, three triggers.

| Shape | State | Trigger |
| --- | --- | --- |
| Interval DP | `dp[i][j]` over a range, split at k | Merging, bursting, or partitioning a sequence where removal changes neighbours |
| Bitmask DP | `dp[mask]` or `dp[mask][i]` | n is roughly 20 or fewer and the state is "which subset have I used" |
| Tree DP | `dp[node][state]` | Tree input with an optimisation over the whole tree |""",
                    ),
                    (
                        "How It Works",
                        """### Interval DP

The transition picks a split point or a "last" element within the range.

```java
// Burst balloons: bursting balloon i yields left * nums[i] * right
int maxCoins(int[] nums) {
    int n = nums.length;
    int[] values = new int[n + 2];
    values[0] = values[n + 1] = 1;                    // virtual boundaries
    System.arraycopy(nums, 0, values, 1, n);

    int[][] dp = new int[n + 2][n + 2];
    for (int length = 1; length <= n; length++)       // by interval length
        for (int left = 1; left + length - 1 <= n; left++) {
            int right = left + length - 1;
            for (int last = left; last <= right; last++) {      // the LAST burst in this range
                dp[left][right] = Math.max(dp[left][right],
                    dp[left][last - 1]
                  + values[left - 1] * values[last] * values[right + 1]
                  + dp[last + 1][right]);
            }
        }
    return dp[1][n];
}
// O(n^3) time, O(n^2) space
```

The key reframing: iterate over which balloon is burst **last** in the interval, not first. If it is last, its neighbours at that moment are exactly the interval's boundaries, which are fixed — whereas "first" leaves the neighbours undetermined. That inversion is the entire insight, and it is the thing to say before writing anything.

The virtual boundary values of 1 remove the edge cases at the array ends.

Matrix chain multiplication has the same shape: `dp[i][j]` is the minimum cost to multiply matrices i through j, split at k.

### Bitmask DP

When n is small, a subset fits in an integer.

```java
// Travelling salesman, n up to about 20
int tsp(int[][] dist) {
    int n = dist.length;
    int[][] dp = new int[1 << n][n];                  // dp[mask][i] = best cost visiting mask, ending at i
    for (int[] row : dp) Arrays.fill(row, Integer.MAX_VALUE / 2);
    dp[1][0] = 0;                                     // start at city 0

    for (int mask = 1; mask < (1 << n); mask++)
        for (int last = 0; last < n; last++) {
            if ((mask & (1 << last)) == 0) continue;  // last must be in the mask
            if (dp[mask][last] >= Integer.MAX_VALUE / 2) continue;
            for (int next = 0; next < n; next++) {
                if ((mask & (1 << next)) != 0) continue;        // already visited
                int nextMask = mask | (1 << next);
                dp[nextMask][next] = Math.min(dp[nextMask][next],
                                              dp[mask][last] + dist[last][next]);
            }
        }

    int best = Integer.MAX_VALUE;
    for (int last = 1; last < n; last++) {
        best = Math.min(best, dp[(1 << n) - 1][last] + dist[last][0]);
    }
    return best;
}
// O(2^n * n^2) time, O(2^n * n) space
```

The bit operations to have fluent: `mask & (1 << i)` tests membership, `mask | (1 << i)` adds, `Integer.bitCount(mask)` counts, and `mask == (1 << n) - 1` means complete.

The complexity is why n must be small: at n = 20 that is about 4 x 10^8 operations, which is borderline; at n = 25 it is hopeless. Saying "n is 20, so this is a bitmask problem" is exactly the reasoning the constraint is signalling.

### Tree DP

```java
// House robber on a tree: cannot rob a node and its direct child
int rob(TreeNode root) {
    int[] result = robHelper(root);
    return Math.max(result[0], result[1]);
}

// returns {bestIfThisNodeNotRobbed, bestIfThisNodeRobbed}
private int[] robHelper(TreeNode node) {
    if (node == null) return new int[] {0, 0};
    int[] left = robHelper(node.left);
    int[] right = robHelper(node.right);

    int robbed = node.val + left[0] + right[0];                    // children must not be robbed
    int notRobbed = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);
    return new int[] {notRobbed, robbed};
}
// O(n) time, O(h) space
```

Tree DP is post-order recursion returning a small array or record of per-state answers. The state dimension is whatever the parent needs to know — here, whether this node was taken.

This connects directly to the tree recursion framework: "what do I return up?" is exactly the DP state definition.

### Digit DP, briefly

For counting numbers in a range with a digit property, the state is `(position, tight, started, property)` where `tight` tracks whether the prefix equals the bound's prefix. It is a real technique, rare in interviews outside competitive-programming-influenced companies, and worth being able to name.

### Recognising which shape

- Does removing an element change its neighbours' interaction? Interval DP.
- Is n around 20 with subset-shaped state? Bitmask.
- Is the input a tree with an optimisation objective? Tree DP.
- Is there a sequence with independent positions? Ordinary 1D or 2D DP.""",
                    ),
                    (
                        "Example",
                        """"Given n couples seated in 2n seats, find the minimum number of swaps so that every couple sits together."

```java
int minSwapsCouples(int[] row) {
    int n = row.length / 2;
    int[] position = new int[row.length];
    for (int i = 0; i < row.length; i++) position[row[i]] = i;

    int swaps = 0;
    for (int i = 0; i < row.length; i += 2) {
        int first = row[i];
        int partner = (first % 2 == 0) ? first + 1 : first - 1;
        if (row[i + 1] == partner) continue;                 // already together

        int partnerPos = position[partner];
        position[row[i + 1]] = partnerPos;                   // swap bookkeeping
        position[partner] = i + 1;
        int temp = row[i + 1];
        row[i + 1] = partner;
        row[partnerPos] = temp;
        swaps++;
    }
    return swaps;
}
// O(n) time, O(n) space
```

What to say: "My first instinct was bitmask DP over which couples are seated, at O(2^n * n) — and for n up to 30 seats that would be fine. But the greedy is provably optimal here: fixing the first seat's partner reduces the problem by one couple and never makes a later swap worse, because each swap places at least one person correctly.

The union-find formulation is also nice: each pair of adjacent seats is a node, couples split across two nodes create edges, and the answer is `couples - components`. Three approaches, and greedy is both the simplest and the fastest.

I would mention the bitmask approach as the general fallback if the constraints ruled the greedy out — for instance if swaps had different costs, greedy would break and bitmask DP would be the right answer."

Recognising a bitmask problem, then noticing something better, and keeping the DP as the fallback for a modified version, is exactly the reasoning these advanced shapes are for.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Interval: burst balloons, matrix chain, optimal BST, stone-merging games
- Bitmask: travelling salesman, assignment problems, subset covers, seating arrangements
- Tree: independent sets on trees, tree diameters with weights, distributing resources over a hierarchy
- Digit: counting numbers with digit constraints""",
                    ),
                    (
                        "Trade-offs",
                        """- **Bitmask exponentiality.** Only viable for n up to about 20; the constraint tells you.
- **Interval DP cost.** O(n^3) is fine for n in the hundreds, not thousands.
- **Tree DP state size.** Each extra state dimension multiplies the work; keep it minimal.
- **Memoised recursion versus tabulation.** For interval and bitmask, recursion is much easier to get right; tabulation needs the iteration order derived carefully.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Iterating over the first element rather than the last in interval DP
- Wrong iteration order, reading uncomputed intervals
- Bitmask DP for n far too large
- Forgetting to check membership before transitioning in bitmask DP
- Tree DP that recomputes children instead of returning both states at once
- Not recognising that a constraint like n <= 20 is a signal rather than an incidental detail""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why iterate over the last element?"** — Because it fixes the interval's boundaries as its neighbours.
- **"Why is bitmask viable here?"** — n is small; give the 2^n * n^2 arithmetic.
- **"What is the state in tree DP?"** — Node plus whatever the parent needs to know.
- **"Could you memoise instead?"** — Usually yes and usually easier; note the stack depth.
- **"What if n were 100?"** — Bitmask is out; look for structure, greedy, or a different formulation.""",
                    ),
                    (
                        "Mini Exercise",
                        """Identify the shape and write the state:

1. Burst balloons for maximum coins.
2. Minimum cost to merge stones in adjacent groups.
3. Travelling salesman with 15 cities.
4. Assign n tasks to n workers minimising total cost.
5. House robber on a binary tree.
6. Maximum sum of non-adjacent nodes in a general tree.
7. Count integers below N whose digits sum to k.

Numbers 3 and 4 are both bitmask with the same `dp[mask]` shape; noticing that assignment problems and TSP share a formulation is the generalisation worth taking away.""",
                    ),
                    (
                        "Interview Tip",
                        """Read the constraints for the shape signal before designing: n around 20 means bitmask, a tree input with an optimisation means tree DP, and "removing an element changes its neighbours" means interval DP with the last-element inversion. The constraints are telling you the technique.""",
                    ),
                ],
                [
                    "Interval DP iterates over which element is handled *last*, which fixes the interval boundaries.",
                    "Bitmask DP is viable only for n around 20 — the constraint is the signal.",
                    "Tree DP is post-order recursion returning one value per state the parent needs.",
                    "Iterate interval DP by increasing length so shorter intervals are already computed.",
                ],
                [
                    "Why does burst balloons iterate over the last balloon rather than the first?",
                    "What constraint tells you a problem is bitmask DP?",
                    "What is the state in tree DP, and how does it relate to the recursion contract?",
                    "How do you choose the iteration order for interval DP?",
                ],
            ),
        ],
        roadmap_key="dp-2d",
        practice_tag="dynamic-programming",
    )


def _intervals_topic() -> dict:
    return _dsa_topic(
        "intervals",
        "Intervals and Sweep Line",
        "Sorting by the right key, merging and overlap detection, and counting concurrency with a sweep.",
        "MEDIUM",
        25,
        [
            DL(
                "merge-and-overlap",
                "Merging and Overlap",
                "Sort once, then a single scan answers most interval questions.",
                12,
                "Interval problems almost always begin with a sort, and almost always finish with one linear pass. The difficulty is entirely in choosing the sort key and getting the boundary condition right — whether touching intervals count as overlapping is a question you must ask rather than assume.",
                [
                    (
                        "Why It Matters",
                        """Calendars, bookings, meeting rooms, and range merging are common interview settings because they are easy to state and have a clean O(n log n) answer. They are also where a single wrong comparison operator produces a solution that is right on the examples and wrong on the edge case.

The sort key is the design decision: merging sorts by start, selecting the maximum non-overlapping set sorts by end, and using the wrong one silently gives a wrong answer rather than an error.""",
                    ),
                    (
                        "Mental Model",
                        """Sort, then scan, comparing each interval to what you have already accepted.

Sort → scan → extend or start new

| Question | Sort by | Then |
| --- | --- | --- |
| Merge overlapping intervals | Start | Extend the current interval or emit it |
| Maximum non-overlapping count | End | Greedily take each compatible interval |
| Minimum removals to make disjoint | End | Total minus the maximum non-overlapping |
| Does any pair overlap | Start | Compare each to its predecessor |
| Insert into a sorted list | Already sorted | Three phases: before, merging, after |
| How many concurrent at a time | Events | Sweep line |""",
                    ),
                    (
                        "How It Works",
                        """:::viz merge-intervals {"intervals": ["1-3", "8-10", "2-6", "15-18", "17-20", "6-7"]}

### Merging

```java
int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));      // by START
    List<int[]> out = new ArrayList<>();

    for (int[] interval : intervals) {
        if (!out.isEmpty() && interval[0] <= out.get(out.size() - 1)[1]) {
            out.get(out.size() - 1)[1] = Math.max(out.get(out.size() - 1)[1], interval[1]);
        } else {
            out.add(new int[] {interval[0], interval[1]});
        }
    }
    return out.toArray(new int[0][]);
}
// O(n log n) time, O(n) space
```

Two details:

1. **`<=` versus `<`** decides whether `[1,2]` and `[2,3]` merge. Ask the interviewer; for time ranges, an end at 2 and a start at 2 usually do *not* conflict, so `<` is right. For integer ranges they usually do merge, so `<=` is right. Getting the question asked is worth more than either answer.
2. **`Math.max` on the end** is essential — a fully contained interval like `[1,10]` followed by `[2,3]` must not shrink the result.

### Maximum non-overlapping intervals

```java
int maxNonOverlapping(int[][] intervals) {
    Arrays.sort(intervals, Comparator.comparingInt(a -> a[1]));      // by END
    int count = 0, lastEnd = Integer.MIN_VALUE;
    for (int[] interval : intervals) {
        if (interval[0] >= lastEnd) { count++; lastEnd = interval[1]; }
    }
    return count;
}
```

Sorting by end is the greedy from the greedy lesson: finishing earliest leaves the most room. Sorting by start here gives a wrong answer, which is why the key is the design decision rather than an implementation detail.

"Minimum intervals to remove so the rest are disjoint" is `total - maxNonOverlapping`, which is worth recognising rather than deriving separately.

### Insert and merge

```java
int[][] insert(int[][] intervals, int[] newInterval) {
    List<int[]> out = new ArrayList<>();
    int i = 0, n = intervals.length;

    while (i < n && intervals[i][1] < newInterval[0]) out.add(intervals[i++]);   // entirely before

    while (i < n && intervals[i][0] <= newInterval[1]) {                          // overlapping
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    out.add(newInterval);

    while (i < n) out.add(intervals[i++]);                                        // entirely after
    return out.toArray(new int[0][]);
}
// O(n) time - the input is already sorted
```

Three explicit phases is much clearer than one loop with branches, and it makes each boundary condition visible.

### Interval intersection

```java
int[][] intervalIntersection(int[][] a, int[][] b) {
    List<int[]> out = new ArrayList<>();
    int i = 0, j = 0;
    while (i < a.length && j < b.length) {
        int lo = Math.max(a[i][0], b[j][0]);
        int hi = Math.min(a[i][1], b[j][1]);
        if (lo <= hi) out.add(new int[] {lo, hi});      // non-empty intersection
        if (a[i][1] < b[j][1]) i++; else j++;           // advance the one ending first
    }
    return out.toArray(new int[0][]);
}
// O(n + m) time - two pointers over two sorted lists
```

The intersection of two intervals is `[max(starts), min(ends)]`, non-empty when `lo <= hi`. Advancing the one that ends first is the two-pointer rule, and it is correct because that interval cannot intersect anything later in the other list.

### Overlap detection

Two intervals `[a1, a2]` and `[b1, b2]` overlap exactly when `a1 < b2 && b1 < a2` for half-open ranges, or with `<=` for closed ones. Writing that condition once as a helper avoids reasoning about four cases every time.""",
                    ),
                    (
                        "Example",
                        """"Given a list of meeting intervals, find the minimum number of rooms required."

```java
int minMeetingRooms(int[][] intervals) {
    Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));      // by start
    PriorityQueue<Integer> endTimes = new PriorityQueue<>();         // min-heap

    for (int[] meeting : intervals) {
        if (!endTimes.isEmpty() && endTimes.peek() <= meeting[0]) {
            endTimes.poll();                       // a room has freed up - reuse it
        }
        endTimes.offer(meeting[1]);
    }
    return endTimes.size();                        // rooms in use at the peak
}
// O(n log n) time, O(n) space
```

What to say: "Sorting by start time processes meetings in the order they begin. The heap holds the end times of meetings currently in progress, so its smallest element is the next room to free up. If that room is free by the time the next meeting starts, I reuse it; otherwise I need a new one. The heap's final size is the peak concurrency, which is the answer.

`<=` on the comparison means a meeting ending at 10 and one starting at 10 can share a room — I would confirm that convention, since some products treat them as conflicting."

The sweep-line alternative is worth offering: separate the starts and ends, sort both, and walk them with two pointers incrementing on a start and decrementing on an end, tracking the maximum. It is O(n log n) with O(n) space and no heap, and some interviewers prefer it.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Calendar and booking systems
- Meeting room and resource allocation
- Merging ranges, IP blocks, or time windows
- Detecting schedule conflicts
- Finding free slots between busy periods""",
                    ),
                    (
                        "Trade-offs",
                        """- **Sort by start versus end.** Merging needs start; greedy selection needs end. This is the decision, not a detail.
- **Heap versus sweep line** for concurrency: similar complexity, and the sweep needs no heap but separates the coordinates.
- **In-place versus new list.** Merging into a new list is clearer; mutating requires care with the shrinking size.
- **Closed versus half-open intervals.** Half-open ranges remove most boundary ambiguity; confirm which the problem means.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Sorting by the wrong key
- Forgetting `Math.max` when extending an interval, shrinking it on a contained interval
- Getting `<` versus `<=` wrong at touching boundaries without asking
- Not handling an empty input
- Assuming the input is sorted when it is not, or re-sorting when it already is
- Comparing every pair, producing O(n^2) where a sort and scan is O(n log n)""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Do touching intervals overlap?"** — Ask this before coding; it is a real product decision.
- **"What if the list is already sorted?"** — The insert case becomes O(n) with no sort.
- **"What if intervals arrive one at a time?"** — A `TreeMap` keyed by start with `floorKey` and `ceilingKey` gives O(log n) per insertion.
- **"What if there are millions of intervals?"** — The sort dominates; consider an interval tree or a segment tree if queries are also frequent.
- **"How many meetings are concurrent at time t?"** — A sweep line with a prefix sum over events.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Merge all overlapping intervals.
2. Insert a new interval into a sorted list and merge.
3. Maximum number of non-overlapping intervals.
4. Minimum intervals to remove so the rest are disjoint.
5. Minimum meeting rooms.
6. Intersection of two sorted interval lists.
7. Free slots common to several employees' calendars.

Number 7 composes several of the others: merge each employee's busy intervals, merge across employees, then take the gaps. Recognising it as a composition rather than a new problem is the point.""",
                    ),
                    (
                        "Interview Tip",
                        """Ask "do intervals that touch at a boundary count as overlapping?" before writing any comparison. It takes five seconds, it is a genuine ambiguity in the problem, and asking it demonstrates that you know where this family of problems goes wrong.""",
                    ),
                ],
                [
                    "Merging sorts by start; greedy selection sorts by end — the key is the design decision.",
                    "Always take `Math.max` of the ends when extending, or a contained interval shrinks the result.",
                    "Ask whether touching intervals overlap; it changes `<` to `<=` and is a real ambiguity.",
                    "A min-heap of end times gives minimum rooms; its final size is the peak concurrency.",
                ],
                [
                    "Why does merging sort by start but interval selection sort by end?",
                    "How do you compute the minimum number of meeting rooms?",
                    "Do intervals that touch at a boundary overlap?",
                    "How do you find the intersection of two sorted interval lists?",
                ],
                ["missing-range-value"],
            ),
            DL(
                "sweep-line-and-scheduling",
                "Sweep Line and Event Processing",
                "Turning intervals into events, counting concurrency, and the problems that need a running structure.",
                11,
                "A sweep line converts interval problems into event problems: instead of reasoning about ranges, you process a sorted list of start and end points while maintaining a running state. It is the technique behind concurrency counting, skyline problems, and range-stabbing queries, and it generalises further than merging does.",
                [
                    (
                        "Why It Matters",
                        """Some interval questions cannot be answered by merging: "what is the maximum number of overlapping intervals at any point?", "what is the outline of these buildings?", "how many intervals contain this point?". All of them are sweeps.

The sweep also scales better conceptually: once you think in events, adding a second dimension or a weight is a small change rather than a redesign.""",
                    ),
                    (
                        "Mental Model",
                        """Replace each interval with two events and process them in coordinate order.

`[start, end]` becomes `(start, +1)` and `(end, -1)`

Sweep left to right, maintaining a running aggregate. The aggregate is whatever the question needs: a count, a heap of active heights, or a set of active items.

> Memory cue: the tie-break between a start and an end at the same coordinate is the whole edge case. Process ends first if touching intervals do not conflict; starts first if they do.""",
                    ),
                    (
                        "How It Works",
                        """### Counting maximum concurrency

```java
int maxOverlap(int[][] intervals) {
    int n = intervals.length;
    int[] starts = new int[n], ends = new int[n];
    for (int i = 0; i < n; i++) { starts[i] = intervals[i][0]; ends[i] = intervals[i][1]; }
    Arrays.sort(starts);
    Arrays.sort(ends);

    int active = 0, best = 0, e = 0;
    for (int s = 0; s < n; s++) {
        while (e < n && ends[e] <= starts[s]) { active--; e++; }   // free finished intervals
        active++;
        best = Math.max(best, active);
    }
    return best;
}
// O(n log n) time, O(n) space
```

Sorting the starts and ends independently is valid because the aggregate only depends on how many of each have been passed, not on which interval they belong to. That decoupling is a small but genuinely surprising insight.

The `<=` in the while loop encodes "an interval ending exactly when another starts does not conflict". Flip it to `<` for the other convention.

### The event-list formulation

For anything more complex than counting, build an explicit event list:

```java
// Car pooling: can all passengers be carried without exceeding capacity?
boolean carPooling(int[][] trips, int capacity) {
    Map<Integer, Integer> delta = new TreeMap<>();       // location -> net passenger change
    for (int[] trip : trips) {
        delta.merge(trip[1], trip[0], Integer::sum);     // board
        delta.merge(trip[2], -trip[0], Integer::sum);    // alight
    }

    int onboard = 0;
    for (int change : delta.values()) {                  // TreeMap iterates in key order
        onboard += change;
        if (onboard > capacity) return false;
    }
    return true;
}
// O(n log n) time
```

A `TreeMap` keyed by coordinate is the natural event store when coordinates are sparse; a difference array is better when they are dense and bounded, which connects back to the prefix-sums lesson.

### The skyline problem

The hardest standard sweep, and worth understanding rather than memorising:

```java
List<int[]> getSkyline(int[][] buildings) {
    List<int[]> events = new ArrayList<>();
    for (int[] b : buildings) {
        events.add(new int[] {b[0], -b[2]});     // start: negative height sorts first
        events.add(new int[] {b[1], b[2]});      // end: positive height
    }
    events.sort((p, q) -> p[0] != q[0] ? p[0] - q[0] : p[1] - q[1]);

    TreeMap<Integer, Integer> active = new TreeMap<>();   // height -> count
    active.put(0, 1);                                     // ground level
    List<int[]> out = new ArrayList<>();
    int previousHeight = 0;

    for (int[] event : events) {
        if (event[1] < 0) active.merge(-event[1], 1, Integer::sum);          // building starts
        else if (active.merge(event[1], -1, Integer::sum) == 0) {
            active.remove(event[1]);                                         // building ends
        }
        int currentHeight = active.lastKey();
        if (currentHeight != previousHeight) {
            out.add(new int[] {event[0], currentHeight});
            previousHeight = currentHeight;
        }
    }
    return out;
}
// O(n log n) time, O(n) space
```

Three design decisions worth explaining:

1. **Encoding starts as negative heights** makes the sort handle all the tie-breaking: at the same x, taller starts come before shorter starts, and all starts come before all ends. Getting that ordering right by hand would need several comparator cases.
2. **A `TreeMap` as a multiset** gives the current maximum height in O(log n) and supports removing an arbitrary height when a building ends — which a heap cannot do without lazy deletion.
3. **Emitting only on a height change** produces the compact skyline rather than a point per event.

### Range-stabbing and offline queries

"How many intervals contain point p?" for many points: sort the intervals and the queries together, sweep, and maintain a count. Processing queries offline in sorted order rather than one at a time turns O(queries * intervals) into O((queries + intervals) log(...)).

That offline-processing idea — sort everything together and sweep once — generalises to many problems and is worth naming.""",
                    ),
                    (
                        "Example",
                        """"Given employee schedules as lists of busy intervals, return the free time common to everyone."

```java
List<int[]> employeeFreeTime(List<List<int[]>> schedules) {
    List<int[]> all = new ArrayList<>();
    for (List<int[]> schedule : schedules) all.addAll(schedule);
    all.sort(Comparator.comparingInt(a -> a[0]));

    List<int[]> free = new ArrayList<>();
    int currentEnd = all.get(0)[1];
    for (int i = 1; i < all.size(); i++) {
        int[] interval = all.get(i);
        if (interval[0] > currentEnd) {
            free.add(new int[] {currentEnd, interval[0]});     // a gap
        }
        currentEnd = Math.max(currentEnd, interval[1]);        // extend the busy region
    }
    return free;
}
// O(n log n) time, O(n) space
```

What to say: "Everyone is free exactly when nobody is busy, so I can pool all the busy intervals regardless of whose they are and find the gaps between merged busy periods.

`Math.max` on the end is essential — a long meeting containing several short ones must not be shortened, and without it I would report a gap that does not exist.

If there were many employees each with long schedules, I would merge with a heap of the next interval per employee rather than concatenating and sorting, which is O(n log k) instead of O(n log n) — the same k-way merge idea as merging sorted lists."

Offering the k-way merge refinement connects this to the heap module and shows you are thinking about which n dominates.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Maximum concurrency: rooms, servers, connections
- Skyline and silhouette problems
- Capacity checks over time, such as car pooling or bandwidth
- Free-slot and availability computation
- Offline range queries processed in sorted order""",
                    ),
                    (
                        "Trade-offs",
                        """- **Sweep versus merge.** Merging answers "what are the combined ranges"; sweeping answers "what is true at each point".
- **TreeMap versus heap for the active set.** Arbitrary removal versus better constants with lazy deletion.
- **Event list versus difference array.** Sparse coordinates favour events; dense bounded ones favour a difference array.
- **Online versus offline.** Sorting all queries together is much faster and requires knowing them all in advance.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Tie-breaking starts and ends incorrectly at equal coordinates
- Using a heap where arbitrary removal is needed
- Forgetting to remove zero-count entries from a TreeMap multiset
- Emitting an output point when the height has not actually changed
- Not taking the maximum when extending a busy region
- Treating a sweep as a merge and losing the concurrency information""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What happens when a start and an end share a coordinate?"** — State the convention and encode it in the sort.
- **"How do you track the current maximum?"** — A multiset supporting removal; explain why a plain heap is awkward.
- **"What if coordinates are dense integers?"** — A difference array is simpler and linear.
- **"What if the queries are known in advance?"** — Process them offline in the sweep.
- **"Can you do it without sorting?"** — Only if the input is already ordered or the coordinate range is small enough to bucket.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Maximum number of overlapping intervals.
2. Minimum meeting rooms, by sweep rather than heap.
3. Can all car-pool trips be served within capacity?
4. The skyline of a set of buildings.
5. Common free time across several employee schedules.
6. For each query point, how many intervals contain it.

Number 6 is the offline-processing exercise: sorting the queries and intervals together and sweeping once is dramatically faster than answering each query independently.""",
                    ),
                    (
                        "Interview Tip",
                        """Say "I will turn each interval into a start event and an end event and sweep in coordinate order" and then immediately state the tie-break rule. The tie-break is where these problems break, and naming it first shows you know that.""",
                    ),
                ],
                [
                    "A sweep replaces intervals with sorted start and end events and maintains a running aggregate.",
                    "The tie-break between a start and an end at the same coordinate encodes the overlap convention.",
                    "Use a multiset when the active set needs arbitrary removal; a plain heap needs lazy deletion.",
                    "Sorting queries together with the data and sweeping once turns many independent queries into one pass.",
                ],
                [
                    "How do you find the maximum number of overlapping intervals?",
                    "How do you handle a start and an end at the same coordinate?",
                    "Why does the skyline problem need a multiset rather than a heap?",
                    "When is a difference array better than an event list?",
                ],
            ),
        ],
        roadmap_key="intervals",
        practice_tag="array",
    )


def _bit_topic() -> dict:
    return _dsa_topic(
        "bit-manipulation",
        "Bit Manipulation",
        "XOR tricks, masks, subset enumeration, and the operations that replace a data structure with an integer.",
        "MEDIUM",
        26,
        [
            DL(
                "xor-and-masks",
                "XOR, Masks, and Bit Operations",
                "The properties that make bit tricks work, and the handful of idioms worth memorising.",
                12,
                "Bit manipulation solves a small set of problems dramatically better than anything else: finding a unique element among pairs, representing a subset in a single integer, and testing membership in constant space. The tricks are few, they depend on a couple of algebraic properties, and knowing those properties means deriving the tricks rather than recalling them.",
                [
                    (
                        "Why It Matters",
                        """"Find the single number when every other value appears twice" has an O(n) time, O(1) space answer that is one line, and no other technique achieves it. Interviewers use these problems specifically because the constraint — constant space — rules out the obvious hash-set solution.

Bitmasks are also the enabling representation for subset DP, and the operations show up inside tries, hashing, and low-level optimisation.""",
                    ),
                    (
                        "Mental Model",
                        """Three XOR properties carry most of the tricks.

- `x ^ x = 0` — a value cancels itself
- `x ^ 0 = x` — zero is the identity
- XOR is commutative and associative — order does not matter

Together: XOR everything, and anything appearing an even number of times vanishes.

| Operation | Idiom |
| --- | --- |
| Test bit i | `(x >> i) & 1` |
| Set bit i | `x OR (1 << i)`, using bitwise or |
| Clear bit i | `x & ~(1 << i)` |
| Toggle bit i | `x ^ (1 << i)` |
| Lowest set bit | `x & -x` |
| Clear lowest set bit | `x & (x - 1)` |
| Is a power of two | `x > 0 && (x & (x - 1)) == 0` |
| Count set bits | `Integer.bitCount(x)` |
| All ones for n bits | `(1 << n) - 1` |""",
                    ),
                    (
                        "How It Works",
                        """### Single number

```java
int singleNumber(int[] nums) {
    int result = 0;
    for (int x : nums) result ^= x;
    return result;
}
// O(n) time, O(1) space
```

Every paired value cancels; the unique one remains. The hash-set solution is O(n) space, so this is the answer when the constraint says constant space.

### Two unique numbers

The generalisation, and a genuinely elegant derivation:

```java
int[] singleNumberIII(int[] nums) {
    int xorAll = 0;
    for (int x : nums) xorAll ^= x;              // = a ^ b, the two uniques

    int lowestDiff = xorAll & -xorAll;           // any bit where a and b differ

    int a = 0, b = 0;
    for (int x : nums) {
        if ((x & lowestDiff) != 0) a ^= x;       // partition by that bit
        else b ^= x;
    }
    return new int[] {a, b};
}
```

The reasoning: the XOR of everything equals `a ^ b`, and any set bit in that result is a position where a and b differ. Partitioning the array by that bit puts a and b in different groups, and every paired value goes entirely into one group — so XOR within each group isolates one unique. Two passes, O(1) space.

`x & -x` isolating the lowest set bit relies on two's complement: `-x` is `~x + 1`, which flips everything above the lowest set bit and leaves it set.

### Single number among triples

When every other value appears three times, XOR does not cancel. Count bits modulo 3 instead:

```java
int singleNumberII(int[] nums) {
    int ones = 0, twos = 0;
    for (int x : nums) {
        ones = (ones ^ x) & ~twos;
        twos = (twos ^ x) & ~ones;
    }
    return ones;
}
```

The bitwise state machine is clever and hard to derive under pressure. The honest alternative, which is perfectly acceptable and far easier to explain: count occurrences of each bit position across all numbers, take each count modulo 3, and reassemble. That is O(32n) time and O(1) space, and it generalises to "every other appears k times" trivially.

Offering the understandable version and mentioning the clever one is better than attempting the clever one and getting it wrong.

### Subset enumeration

```java
// All subsets of n elements
for (int mask = 0; mask < (1 << n); mask++) {
    for (int i = 0; i < n; i++) {
        if ((mask & (1 << i)) != 0) { /* element i is in this subset */ }
    }
}
```

And the submask enumeration idiom, which is worth knowing for subset DP:

```java
// Iterate all submasks of mask, including 0
for (int sub = mask; ; sub = (sub - 1) & mask) {
    // use sub
    if (sub == 0) break;
}
```

Total work across all masks is 3^n rather than 4^n, which is the standard result for submask DP.

### Bitmask as a set

```java
// Are all characters unique? Lowercase only.
boolean allUnique(String s) {
    int seen = 0;
    for (char c : s.toCharArray()) {
        int bit = 1 << (c - 'a');
        if ((seen & bit) != 0) return false;
        seen |= bit;
    }
    return true;
}
// O(n) time, O(1) space
```

This is the answer when the interviewer forbids additional data structures. The same representation solves "maximum product of two words with no shared letters" by precomputing a mask per word and testing `(maskA & maskB) == 0`.

### Java pitfalls

- `>>` is arithmetic (sign-extending); `>>>` is logical. For bit manipulation on possibly-negative values, `>>>` is usually what you want.
- `1 << 31` overflows into the sign bit; use `1L << 31` when you need the value.
- Shift counts are taken modulo 32 for `int`, so `1 << 32` is `1`, not zero — a genuinely surprising behaviour.
- Operator precedence: `&` binds more loosely than `==`, so `if (x & mask == 0)` parses as `x & (mask == 0)` and does not compile. Parenthesise everything.""",
                    ),
                    (
                        "Example",
                        """"An array contains n distinct numbers taken from 0 to n. Find the missing one, in O(1) space."

Three valid answers, and presenting the set is better than presenting one:

```java
// XOR: no overflow risk
int missingNumber(int[] nums) {
    int result = nums.length;                   // start with n, which is not an index
    for (int i = 0; i < nums.length; i++) {
        result ^= i ^ nums[i];
    }
    return result;
}

// Sum: simpler to explain, can overflow for large n
int missingNumberSum(int[] nums) {
    int n = nums.length;
    int expected = n * (n + 1) / 2;
    int actual = Arrays.stream(nums).sum();
    return expected - actual;
}
```

What to say: "The XOR approach pairs every index with its value; everything present cancels and the missing number survives. Starting at n covers the index that does not exist.

The Gauss-sum version is easier to explain and risks overflow when n is large — for n near 2^16 the sum exceeds the int range, so I would use `long`. XOR has no such issue, which is why I would prefer it despite being slightly less obvious.

A third option is cyclic sort — place each value at its own index and scan for the mismatch — which also works in O(1) space and additionally handles the variant where there are duplicates."

Three approaches with the condition that selects each, including an overflow consideration, is a complete answer to a deceptively simple question.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Finding unique elements among duplicates with constant space
- Representing subsets for enumeration or DP
- Membership tests over a small fixed universe
- Permission and flag handling
- Low-level optimisations: parity, powers of two, alignment""",
                    ),
                    (
                        "Trade-offs",
                        """- **Bit tricks versus readable code.** Concise and fast, and harder to read and verify. In production, comment them; in interviews, explain them.
- **XOR versus sum.** XOR avoids overflow; sum is easier to explain.
- **Bitmask versus a set.** O(1) space and limited to a small universe, versus general and allocating.
- **Clever versus derivable.** A bit trick you cannot explain is a liability; prefer the version you can justify.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using `>>` where `>>>` is needed, sign-extending a negative value
- Missing parentheses around bitwise operations in comparisons
- `1 << 31` overflowing when a `long` was needed
- Assuming a shift by 32 gives zero
- Applying XOR cancellation when values appear three times
- Reaching for bit tricks where a hash map is clearer and the space is available""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do it in O(1) space?"** — This constraint is usually the signal for a bit trick or cyclic sort.
- **"What if every other number appears three times?"** — Bit counting modulo 3; offer the explainable version.
- **"How do you find two unique numbers?"** — XOR all, isolate a differing bit, partition.
- **"Why does `x & (x - 1)` clear the lowest set bit?"** — Subtracting one flips the lowest set bit and everything below it; the AND keeps what is unchanged above.
- **"What is the risk with the sum approach?"** — Overflow; use `long` or XOR.""",
                    ),
                    (
                        "Mini Exercise",
                        """Solve each in O(1) space:

1. Find the number appearing once when all others appear twice.
2. Find the two numbers appearing once when all others appear twice.
3. Find the number appearing once when all others appear three times.
4. Find the missing number from 0 to n.
5. Count the set bits in an integer.
6. Determine whether a string of lowercase letters has all unique characters.
7. Find the maximum product of the lengths of two words with no shared letters.

Number 7 is the nice application: precompute a 26-bit mask per word, then a pairwise loop testing `(a & b) == 0` is O(n^2) with constant-time comparisons instead of O(n^2 * L).""",
                    ),
                    (
                        "Interview Tip",
                        """Treat "O(1) extra space" as the trigger to consider XOR, bitmasks, or cyclic sort. And always explain the property you are relying on — "XOR cancels pairs" — rather than presenting the line as if it were self-evident.""",
                    ),
                ],
                [
                    "XOR cancels pairs, which solves unique-element problems in O(1) space.",
                    "`x & -x` isolates the lowest set bit and `x & (x - 1)` clears it — derive them from two's complement.",
                    "A bitmask is an O(1)-space set when the universe is small and bounded.",
                    "In Java: use `>>>` for logical shifts, parenthesise bitwise operations, and beware shift counts modulo 32.",
                ],
                [
                    "How do you find the single non-duplicated number in O(1) space?",
                    "How would you find two unique numbers among pairs?",
                    "Why does `x & (x - 1)` clear the lowest set bit?",
                    "When is a bitmask preferable to a hash set?",
                ],
                ["missing-range-value"],
            ),
            DL(
                "bit-tricks-and-subsets",
                "Bitmask State and Subset Techniques",
                "Encoding state in an integer, submask enumeration, and the problems where a mask is the natural representation.",
                11,
                "Once a set fits in an integer, it can be a DP state, a hash key, or a visited marker — all with constant-time operations. Bitmask representation is what makes travelling-salesman-style DP feasible for small n, and it appears in several problems where the subset structure is not obvious at first.",
                [
                    (
                        "Why It Matters",
                        """When constraints say n is at most 20 or so, they are telling you that an exponential-in-n solution is intended, and the standard way to express that is a bitmask. Candidates who do not read the constraint that way usually attempt a polynomial solution that does not exist.

Bitmasks also make certain state comparisons free: "have I collected these keys?" or "which characters have I seen?" become integer equality rather than set operations.""",
                    ),
                    (
                        "Mental Model",
                        """An integer is a set over a universe of up to 32 or 64 elements.

| Set operation | Bit operation |
| --- | --- |
| Empty set | `0` |
| Full set of n | `(1 << n) - 1` |
| Contains i | `(mask >> i & 1) == 1` |
| Add i | `mask OR (1 << i)`, using bitwise or |
| Remove i | `mask & ~(1 << i)` |
| Union | `a OR b`, using bitwise or |
| Intersection | `a & b` |
| Difference | `a & ~b` |
| Is subset | `(a & b) == a` |
| Size | `Integer.bitCount(mask)` |

> Memory cue: n <= 20 in the constraints is an instruction, not a coincidence.""",
                    ),
                    (
                        "How It Works",
                        """### Bitmask as a DP state

```java
// Minimum cost to assign n tasks to n workers
int minCost(int[][] cost) {
    int n = cost.length;
    int[] dp = new int[1 << n];                   // dp[mask] = cost to assign tasks in mask
    Arrays.fill(dp, Integer.MAX_VALUE / 2);
    dp[0] = 0;

    for (int mask = 0; mask < (1 << n); mask++) {
        if (dp[mask] >= Integer.MAX_VALUE / 2) continue;
        int worker = Integer.bitCount(mask);       // assign workers in order
        if (worker == n) continue;
        for (int task = 0; task < n; task++) {
            if ((mask & (1 << task)) != 0) continue;
            int next = mask | (1 << task);
            dp[next] = Math.min(dp[next], dp[mask] + cost[worker][task]);
        }
    }
    return dp[(1 << n) - 1];
}
// O(2^n * n) time, O(2^n) space
```

The trick that removes a dimension: `Integer.bitCount(mask)` tells you how many tasks are assigned, which is also which worker is next. Without that observation the state would be `dp[mask][worker]`, which is n times larger and unnecessary.

### Submask enumeration

For problems where you must split a set into groups:

```java
// Iterate every submask of mask
for (int sub = mask; sub > 0; sub = (sub - 1) & mask) {
    int complement = mask ^ sub;
    // consider splitting mask into sub and complement
}
```

`(sub - 1) & mask` is the idiom: subtracting one borrows through the low zero bits, and the AND restricts the result back to the original mask. It enumerates every submask exactly once in decreasing order.

The total work over all masks is 3^n, not 4^n, because each element is in the submask, in the complement, or outside the mask entirely. That 3^n bound is a standard result worth being able to state.

### Bitmask for visited state in search

```java
// Shortest path collecting all keys: state is (position, keysHeld)
// keysHeld is a bitmask over up to 6 keys
boolean[][][] seen = new boolean[rows][cols][1 << keyCount];
```

Combining a position with a collected-items mask is the standard way to make BFS correct when the same cell can be visited in different conditions. This is the same "state needs more dimensions" idea from graph modelling, with the extra dimension compactly encoded.

### Masks as hash keys

```java
// Words with no shared letters
int[] masks = new int[words.length];
for (int i = 0; i < words.length; i++) {
    for (char c : words[i].toCharArray()) masks[i] |= 1 << (c - 'a');
}
// Then (masks[i] & masks[j]) == 0 tests disjointness in O(1)
```

Precomputing a mask per item turns an O(L) comparison into an O(1) one, which converts an O(n^2 * L) algorithm into O(n^2 + nL).

### Iterating bits efficiently

```java
// Visit only the set bits, skipping zeros
for (int m = mask; m != 0; m &= m - 1) {
    int lowest = m & -m;
    int index = Integer.numberOfTrailingZeros(lowest);
    // use index
}
```

This iterates exactly `bitCount(mask)` times rather than 32, which matters inside a hot loop over 2^n masks.

### When a bitmask is wrong

- **n above about 25.** 2^25 is 33 million states; beyond that memory and time fail.
- **The universe is unbounded.** Use a set.
- **The order matters.** A mask records membership, not sequence; if order matters you need a permutation state, which is n! rather than 2^n.

That last one is worth checking explicitly: TSP works with a mask because only the *set* of visited cities and the current position matter, not the order they were visited in. If the cost depended on the order, the mask would be insufficient.""",
                    ),
                    (
                        "Example",
                        """"Given a list of words, find the maximum value of `length(a) * length(b)` where a and b share no common letters."

```java
int maxProduct(String[] words) {
    int n = words.length;
    int[] masks = new int[n];
    for (int i = 0; i < n; i++) {
        for (char c : words[i].toCharArray()) {
            masks[i] |= 1 << (c - 'a');
        }
    }

    int best = 0;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            if ((masks[i] & masks[j]) == 0) {            // disjoint letter sets
                best = Math.max(best, words[i].length() * words[j].length());
            }
        }
    return best;
}
// O(n * L + n^2) time, O(n) space
```

What to say: "The naive comparison checks every character pair, which is O(n^2 * L^2) or O(n^2 * L) with sets. Since the alphabet is only 26 letters, each word's letter set fits in an integer, so I precompute one mask per word in O(n * L) and then each disjointness test is a single AND.

That reduces the dominant term from O(n^2 * L) to O(n^2), which matters when the words are long.

If the alphabet were Unicode, this would not work and I would fall back to sets or sorted signatures — the 26-letter bound is what makes the encoding possible."

Naming the constraint that makes the encoding valid is what turns a trick into a justified design choice.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Subset DP: assignment, TSP, set cover, partitioning
- State compression in BFS and DFS over collected items
- Fast set operations over a small fixed universe
- Precomputed signatures for O(1) comparison
- Enumerating all subsets or all splits of a set""",
                    ),
                    (
                        "Trade-offs",
                        """- **Exponential in n.** Viable only up to about 20 to 25 elements.
- **Compactness versus readability.** A mask is fast and opaque; name the bits or comment them.
- **Membership only.** Masks encode sets, not sequences or multiplicities.
- **`int` versus `long`.** 32 versus 64 elements; beyond that you need an array of longs or a `BitSet`.
- **Precomputation cost.** Building masks is O(n * L) and pays off only if compared many times.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using a bitmask when n is far too large
- Encoding a problem where order matters, which a mask cannot express
- Forgetting `Integer.bitCount` and writing a manual loop in a hot path
- Getting the submask enumeration idiom slightly wrong and missing the empty submask
- Overflowing `1 << i` for i at or above 31
- Not recognising that n <= 20 in the constraints was the hint""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why is a bitmask appropriate here?"** — n is small; give the 2^n arithmetic.
- **"What is the complexity?"** — Usually O(2^n * n) or O(3^n) for submask enumeration.
- **"How do you enumerate submasks?"** — `(sub - 1) & mask`, and explain why the total is 3^n.
- **"What if n were 40?"** — Meet in the middle, splitting into two halves of 2^20 each.
- **"Could you use a Set instead?"** — Yes, and each operation becomes a hash lookup rather than a single instruction; at 2^n states that constant matters.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Enumerate all subsets of n elements.
2. Enumerate all submasks of a given mask.
3. Assign n tasks to n workers at minimum cost.
4. Travelling salesman with 15 cities.
5. Shortest path in a grid collecting all keys.
6. Maximum product of lengths of two words with disjoint letters.
7. Partition a set into k subsets with equal sums.

Number 7 is the one where the mask alone is not enough — you also need to track the current subset's running sum, so the state is `dp[mask]` plus a derived value, and working out that the sum can be *derived* from the mask rather than stored is the insight.""",
                    ),
                    (
                        "Interview Tip",
                        """Read the constraints first and say what they imply: "n is at most 20, so an exponential solution over subsets is intended — I will use a bitmask DP." The constraint is the hint, and naming it demonstrates you know how to read a problem.""",
                    ),
                ],
                [
                    "A constraint of n around 20 is an instruction to consider bitmask enumeration or DP.",
                    "`(sub - 1) & mask` enumerates submasks; the total work over all masks is 3^n.",
                    "Masks encode membership, not order — TSP works because only the visited set and current position matter.",
                    "Precomputed masks turn O(L) comparisons into single instructions, which changes the dominant term.",
                ],
                [
                    "What constraint tells you to use a bitmask?",
                    "How do you enumerate all submasks of a mask, and what does it cost?",
                    "Why can a bitmask represent the TSP state but not an ordering?",
                    "What would you do if n were 40 rather than 20?",
                ],
            ),
        ],
        roadmap_key="bit-manipulation",
        practice_tag="math",
    )


def _math_topic() -> dict:
    return _dsa_topic(
        "math-geometry",
        "Math, Number Theory, and Randomised Algorithms",
        "GCD, primes, modular arithmetic, overflow safety, and the sampling techniques interviewers ask about.",
        "MEDIUM",
        27,
        [
            DL(
                "number-theory-for-interviews",
                "Number Theory and Overflow Safety",
                "GCD, primes, modular arithmetic, and the arithmetic bugs that fail silently.",
                12,
                "A small amount of number theory covers most of what interviews require: computing a greatest common divisor, generating primes, doing arithmetic under a modulus, and avoiding overflow. The last one is the most commonly needed and the most commonly missed, because an overflowed int produces a plausible wrong answer rather than an error.",
                [
                    (
                        "Why It Matters",
                        """Overflow is the single most common silent bug in interview code. `(lo + hi) / 2`, summing a large array into an `int`, and multiplying two large values all fail quietly and produce wrong answers that pass small tests.

The rest — GCD, sieve, modular arithmetic — appear in specific problems where the alternative is impractical, and knowing them means those problems take five minutes rather than twenty.""",
                    ),
                    (
                        "Mental Model",
                        """Four tools, each with one trigger.

| Tool | Trigger |
| --- | --- |
| Euclid's GCD | Fractions, ratios, cycles, "simplify", periodicity |
| Sieve of Eratosthenes | "All primes up to n" |
| Modular arithmetic | "Return the answer modulo 10^9 + 7" |
| Overflow awareness | Any sum, product, or midpoint of large values |

`int` in Java holds up to about 2.1 x 10^9. Any computation that can exceed that needs `long`, and noticing which ones can is the skill.""",
                    ),
                    (
                        "How It Works",
                        """### Greatest common divisor

```java
int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
// O(log(min(a, b)))

int lcm(int a, int b) {
    return a / gcd(a, b) * b;          // divide FIRST to avoid overflow
}
```

Writing `a / gcd * b` rather than `a * b / gcd` avoids an intermediate product that may overflow. It is the same result and a strictly safer expression, and noticing it is a good detail.

GCD's uses are broader than they look: reducing a fraction to canonical form (for use as a hash key), finding the period of a repeating pattern, and determining whether a set of jumps can reach a target.

### Sieve of Eratosthenes

```java
boolean[] sieve(int n) {
    boolean[] composite = new boolean[n + 1];
    for (int i = 2; (long) i * i <= n; i++) {
        if (composite[i]) continue;
        for (int j = i * i; j <= n; j += i) composite[j] = true;   // start at i*i
    }
    return composite;                                              // !composite[k] means prime
}
// O(n log log n) time, O(n) space
```

Starting the inner loop at `i * i` rather than `2 * i` is the standard optimisation: smaller multiples of i have already been marked by smaller primes. The `(long) i * i` cast prevents overflow when n is near the int limit.

For a single primality test, trial division up to the square root is O(sqrt(n)) and does not need the array.

### Modular arithmetic

When a problem says "return the answer modulo 10^9 + 7", it is telling you the result would otherwise overflow.

```java
static final int MOD = 1_000_000_007;

long add(long a, long b) { return (a + b) % MOD; }
long mul(long a, long b) { return (a * b) % MOD; }
long sub(long a, long b) { return ((a - b) % MOD + MOD) % MOD; }   // keep it non-negative
```

Three rules:

- Take the modulus after every operation, not at the end.
- Use `long` for the intermediate product: two values below 10^9 multiply to nearly 10^18, which fits in a `long` and not an `int`.
- Add `MOD` before the final modulus after a subtraction, because Java's `%` can return a negative value.

Modular exponentiation, for problems asking for large powers:

```java
long power(long base, long exponent, long mod) {
    long result = 1;
    base %= mod;
    while (exponent > 0) {
        if ((exponent & 1) == 1) result = result * base % mod;
        base = base * base % mod;
        exponent >>= 1;
    }
    return result;
}
// O(log exponent)
```

Division under a modulus requires the modular inverse, which for a prime modulus is `power(x, MOD - 2, MOD)` by Fermat's little theorem. Worth knowing exists; rarely needed in interviews.

### Overflow, concretely

```java
// Overflows for large indices
int mid = (lo + hi) / 2;
int mid = lo + (hi - lo) / 2;                  // safe

// Overflows for a large array of large values
int sum = 0; for (int x : nums) sum += x;
long sum = 0; for (int x : nums) sum += x;     // safe

// Overflows before the assignment - the cast is too late
long product = a * b;                          // a and b are ints: computed as int
long product = (long) a * b;                   // safe

// Comparators
(a, b) -> a - b                                // overflows
Integer::compare                               // safe
```

The third one catches people: in Java the right-hand side is evaluated in `int` arithmetic and only then widened, so the cast must be on an operand rather than the result.

`Math.abs(Integer.MIN_VALUE)` is also negative, because the positive value is not representable. It is a real edge case in problems involving absolute differences.

### Digit manipulation

```java
int reverse(int x) {
    long result = 0;                           // long to detect overflow
    while (x != 0) {
        result = result * 10 + x % 10;
        x /= 10;
        if (result > Integer.MAX_VALUE || result < Integer.MIN_VALUE) return 0;
    }
    return (int) result;
}
```

Note that `x % 10` in Java preserves the sign, so negative numbers work without special handling — which is convenient and worth verifying rather than assuming.""",
                    ),
                    (
                        "Example",
                        """"Return the number of trailing zeros in n factorial."

```java
int trailingZeroes(int n) {
    int count = 0;
    for (long power = 5; power <= n; power *= 5) {
        count += n / power;
    }
    return count;
}
// O(log n) time, O(1) space
```

What to say: "Computing the factorial is impossible — 21 factorial already overflows a `long`. A trailing zero comes from a factor of 10, which is a factor of 2 times a factor of 5. Factors of 2 are far more plentiful than factors of 5, so the count of trailing zeros equals the count of factors of 5.

Multiples of 5 contribute one each, multiples of 25 contribute an extra one, multiples of 125 another, and so on — which is the sum of `n / 5^k`.

I use `long` for the power because `5^13` exceeds the int range and the loop condition would misbehave."

This is a good example of a problem where the naive approach is not merely slow but impossible, and the whole answer is an observation rather than an algorithm.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Reducing fractions and ratios to a canonical form
- Prime generation and factorisation
- Counting problems with large answers, returned modulo a prime
- Cycle and period detection
- Any arithmetic on large values where overflow is possible""",
                    ),
                    (
                        "Trade-offs",
                        """- **Sieve versus trial division.** Sieve is better for many queries, trial division for one.
- **`long` everywhere versus targeted.** Using `long` liberally is safe and costs a little memory; that is usually the right trade in an interview.
- **Modular arithmetic discipline.** Taking the modulus everywhere is slightly slower and removes a whole class of bug.
- **Closed form versus iteration.** Some counting problems have a formula; deriving it is faster to run and slower to get right.""",
                    ),
                    (
                        "Common Mistakes",
                        """- `(lo + hi) / 2` overflow
- Casting after the multiplication rather than before
- Summing into an `int`
- Forgetting that Java's `%` can return a negative result
- `Math.abs(Integer.MIN_VALUE)` being negative
- Not taking the modulus after every operation
- Starting the sieve's inner loop at `2 * i` instead of `i * i`""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What is the range of the inputs?"** — Ask it; it decides whether you need `long`.
- **"Could this overflow?"** — Identify the specific expression and show the safe form.
- **"Why modulo 10^9 + 7?"** — It is prime and keeps products within a `long`, which makes modular inverses available.
- **"How would you test primality of a huge number?"** — Trial division to the square root, or Miller-Rabin probabilistically for very large values.
- **"Can you avoid the loop entirely?"** — Sometimes; a closed form exists for several counting problems.""",
                    ),
                    (
                        "Mini Exercise",
                        """Find and fix the arithmetic bug in each:

1. `int mid = (lo + hi) / 2;` with indices near two billion.
2. `long area = width * height;` with int width and height near 100,000.
3. `int sum = 0;` accumulating a million values near a million.
4. `if (Math.abs(a - b) < threshold)` with a near `Integer.MAX_VALUE` and b negative.
5. `(a, b) -> a - b` as a comparator over the full int range.
6. `int result = (a * b) % MOD;` with a and b near 10^9.

All six appear in real interview code, and five of them produce a wrong answer rather than an exception — which is why they are worth practising as a checklist.""",
                    ),
                    (
                        "Interview Tip",
                        """Ask about the input range early, and when you write any sum, product, or midpoint of potentially large values, say "I will use `long` here to avoid overflow". It takes two seconds and it is one of the few bugs an interviewer can spot instantly.""",
                    ),
                ],
                [
                    "Overflow is the most common silent bug: use `lo + (hi - lo) / 2`, `long` accumulators, and cast before multiplying.",
                    "Compute LCM as `a / gcd * b` so no intermediate product overflows.",
                    "Take the modulus after every operation and add MOD before a final modulus after subtraction.",
                    "Start the sieve's inner loop at `i * i`; smaller multiples are already marked.",
                ],
                [
                    "Where could this computation overflow, and how do you fix it?",
                    "How do you compute a GCD and why is it O(log n)?",
                    "Why do counting problems ask for the answer modulo a large prime?",
                    "How would you count the trailing zeros of n factorial without computing it?",
                ],
                ["mirror-number"],
            ),
            DL(
                "geometry-and-randomized",
                "Geometry, Sampling, and Randomised Algorithms",
                "Coordinate problems without floating point, reservoir sampling, and shuffling correctly.",
                11,
                "Geometry in interviews is mostly about avoiding floating-point comparisons, and randomised algorithms are mostly about two techniques: sampling from a stream of unknown length, and shuffling uniformly. Both appear as design questions where a naive answer is subtly biased.",
                [
                    (
                        "Why It Matters",
                        """Floating-point comparison is a correctness trap: two points on the same line can produce slightly different slopes as doubles, so a hash map keyed on slope silently fails. The fix — reduced integer fractions — is small and specific.

Sampling and shuffling appear as "design" questions precisely because the obvious implementations are biased in ways that are hard to notice, and being able to state why the correct version is uniform is exactly what is being tested.""",
                    ),
                    (
                        "Mental Model",
                        """Avoid division and floating point; prefer exact integer arithmetic.

| Instead of | Use |
| --- | --- |
| Slope as a double | Reduced fraction `(dy/g, dx/g)` with a sign convention |
| Distance with a square root | Squared distance |
| Comparing doubles with `==` | Cross products, or a tolerance you justify |
| Area with division | Twice the area via the shoelace formula |

For randomisation, two algorithms cover most questions: reservoir sampling for streams, and Fisher-Yates for shuffles.""",
                    ),
                    (
                        "How It Works",
                        """### Points on a line

```java
int maxPointsOnALine(int[][] points) {
    int best = 1;
    for (int i = 0; i < points.length; i++) {
        Map<String, Integer> slopes = new HashMap<>();
        for (int j = i + 1; j < points.length; j++) {
            int dy = points[j][1] - points[i][1];
            int dx = points[j][0] - points[i][0];
            int g = gcd(Math.abs(dy), Math.abs(dx));
            if (g != 0) { dy /= g; dx /= g; }
            if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }   // canonical sign
            String key = dy + "/" + dx;
            best = Math.max(best, slopes.merge(key, 1, Integer::sum) + 1);
        }
    }
    return best;
}
// O(n^2) time
```

Three details: reducing by the GCD makes equivalent slopes identical; the sign normalisation stops `(1, 2)` and `(-1, -2)` being different keys; and the `+ 1` accounts for the anchor point itself, which is not counted in the map.

Using a double slope here fails on points like `(0,0)`, `(3,1)`, `(6,2)` in unlucky coordinate ranges, which is exactly the kind of bug that passes the examples.

### Cross products

The cross product of two vectors tells you orientation without any division:

```java
// > 0 means counter-clockwise, < 0 clockwise, 0 collinear
long cross(int[] o, int[] a, int[] b) {
    return (long) (a[0] - o[0]) * (b[1] - o[1]) - (long) (a[1] - o[1]) * (b[0] - o[0]);
}
```

The `long` cast matters — coordinates near 10^4 produce products near 10^8, and near 10^9 they overflow immediately.

Cross products are the basis for convex hull, segment intersection, and polygon area, all without floating point.

### Reservoir sampling

Select k items uniformly from a stream of unknown length, with O(k) memory:

```java
int[] sample(Iterator<Integer> stream, int k) {
    int[] reservoir = new int[k];
    int count = 0;
    Random rand = new Random();

    while (stream.hasNext()) {
        int value = stream.next();
        if (count < k) {
            reservoir[count] = value;                 // fill the reservoir first
        } else {
            int r = rand.nextInt(count + 1);          // 0..count inclusive
            if (r < k) reservoir[r] = value;          // replace with probability k/(count+1)
        }
        count++;
    }
    return reservoir;
}
// O(n) time, O(k) space
```

The proof for k = 1: element i is chosen with probability `1/i` and survives every later step with probability `(i/(i+1)) * ((i+1)/(i+2)) * ... * ((n-1)/n) = i/n`. Multiplying gives `1/n` for every element. Being able to sketch that telescoping product is what the follow-up asks for.

### Fisher-Yates shuffle

```java
void shuffle(int[] a) {
    Random rand = new Random();
    for (int i = a.length - 1; i > 0; i--) {
        int j = rand.nextInt(i + 1);        // 0..i inclusive - INCLUSIVE is essential
        int temp = a[i]; a[i] = a[j]; a[j] = temp;
    }
}
// O(n) time, O(1) space, uniform over all n! permutations
```

The naive variant `int j = rand.nextInt(a.length)` — swapping with any position rather than one at or below i — is **biased**. It produces n^n equally likely execution paths mapping onto n! permutations, and since n^n is not divisible by n! the permutations cannot all be equally likely.

Being able to state that argument is the point of the question. The correct version has exactly n! paths, one per permutation.

### Weighted random selection

```java
class WeightedPicker {
    private final int[] prefix;
    private final Random rand = new Random();

    WeightedPicker(int[] weights) {
        prefix = new int[weights.length];
        prefix[0] = weights[0];
        for (int i = 1; i < weights.length; i++) prefix[i] = prefix[i - 1] + weights[i];
    }

    int pick() {
        int target = rand.nextInt(prefix[prefix.length - 1]) + 1;
        int lo = 0, hi = prefix.length - 1;
        while (lo < hi) {                                  // lower bound
            int mid = lo + (hi - lo) / 2;
            if (prefix[mid] >= target) hi = mid; else lo = mid + 1;
        }
        return lo;
    }
}
// O(n) to build, O(log n) per pick
```

Prefix sums plus binary search is the standard answer, and it reuses two techniques from earlier modules.

### Random point in a circle

The naive approach — uniform radius and uniform angle — clusters points near the centre, because area grows with the square of the radius. The fix is `radius = R * sqrt(random())`, or rejection sampling within the bounding square. Recognising the bias is the interesting part; the correction is one line.""",
                    ),
                    (
                        "Example",
                        """"Design a structure that, given a stream of numbers, returns a uniformly random index of a target value."

```java
class RandomPick {
    private final int[] nums;
    private final Random rand = new Random();

    RandomPick(int[] nums) { this.nums = nums; }

    int pick(int target) {
        int result = -1, seen = 0;
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] != target) continue;
            seen++;
            if (rand.nextInt(seen) == 0) result = i;      // keep with probability 1/seen
        }
        return result;
    }
}
// O(n) per pick, O(1) extra space
```

What to say: "This is reservoir sampling with k = 1, applied to the matching indices only. Each matching index is kept with probability one over the number seen so far, which gives a uniform distribution over all matches by the telescoping argument.

The alternative is to precompute a map from value to its list of indices, which makes `pick` O(1) but costs O(n) memory and an O(n) constructor. Which is better depends on how many picks there will be relative to the array size — I would ask.

Reservoir sampling is the right answer when the array is too large to index, or when it is genuinely a stream."

Offering both designs with the access-pattern question is exactly how a design-flavoured question should be answered.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Collinearity, orientation, and convex hull problems
- Closest-pair and distance comparisons
- Sampling from large or streaming datasets
- Shuffling and randomised selection
- Weighted random choice and load distribution""",
                    ),
                    (
                        "Trade-offs",
                        """- **Integer fractions versus doubles.** Exact and slightly more code, versus concise and subtly wrong.
- **Squared distances.** Avoids a square root and precision loss, and cannot be used where the actual distance is required.
- **Reservoir sampling versus precomputed index.** O(1) memory with O(n) per query, versus O(n) memory with O(1) per query.
- **Rejection sampling.** Simple and correct, with a variable number of attempts.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Comparing floating-point slopes for equality
- Forgetting to normalise the sign of a reduced fraction
- Overflowing a cross product without a `long` cast
- Writing the biased shuffle by swapping with any index
- Sampling a radius uniformly and producing a centre-heavy distribution
- Using `rand.nextInt(i)` instead of `rand.nextInt(i + 1)` in Fisher-Yates""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why not use doubles for the slope?"** — Precision; equal slopes can compare unequal.
- **"Prove your shuffle is uniform."** — n! execution paths, one per permutation; the biased version has n^n paths, which is not divisible by n!.
- **"Prove reservoir sampling is uniform."** — The telescoping product giving 1/n for every element.
- **"What if the stream length is known?"** — Then a simple random index works and reservoir sampling is unnecessary.
- **"How do you sample with weights?"** — Prefix sums and binary search.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Maximum number of points on a line.
2. Determine whether three points are collinear, without division.
3. Shuffle an array uniformly, and explain why the naive version is biased.
4. Pick a uniformly random element from a stream of unknown length.
5. Pick an index uniformly among those matching a target.
6. Pick an index with probability proportional to a weight.
7. Generate a uniformly random point inside a circle.

Number 3 is the one to be able to argue rather than just implement — the counting argument is short and it is what the interviewer is asking for.""",
                    ),
                    (
                        "Interview Tip",
                        """Whenever a problem involves slopes, distances, or areas, say "I will avoid floating point by using reduced integer fractions and squared distances". It pre-empts the precision follow-up and is a small, concrete signal of care.""",
                    ),
                ],
                [
                    "Represent slopes as GCD-reduced integer fractions with a normalised sign, never as doubles.",
                    "Compare squared distances to avoid square roots, and cast to `long` before cross products.",
                    "Fisher-Yates must swap with an index at or below i; swapping with any index is provably biased.",
                    "Reservoir sampling gives uniform selection from a stream of unknown length in O(1) memory.",
                ],
                [
                    "Why should you not compare slopes as floating-point values?",
                    "Prove that Fisher-Yates produces a uniform shuffle.",
                    "How does reservoir sampling work, and why is it uniform?",
                    "How would you pick an element with probability proportional to its weight?",
                ],
                ["mirror-number"],
            ),
        ],
        roadmap_key="math-geometry",
        practice_tag="math",
    )


def _design_topic() -> dict:
    return _dsa_topic(
        "data-structure-design",
        "Data Structure Design",
        "Composing structures to hit an O(1) requirement: LRU caches, randomised sets, and iterators.",
        "HARD",
        28,
        [
            DL(
                "design-framework",
                "Designing a Data Structure to Meet a Complexity Target",
                "The method: list the operations, list their required complexities, then compose structures until every row is satisfied.",
                12,
                "Design questions give you an API and a complexity requirement, usually O(1) for everything. No single structure provides constant-time ordered access, membership, and removal simultaneously, so the answer is always a composition — and the method for finding it is mechanical once you have seen it.",
                [
                    (
                        "Why It Matters",
                        """These questions test something different from algorithm questions: whether you know what each structure provides and what it costs, and whether you can combine them. They are also close to real work, where choosing the right composition is a daily decision.

They reward a systematic approach. Candidates who write a table of operations against required complexities find the answer; candidates who guess a structure and try to make it fit usually do not.""",
                    ),
                    (
                        "Mental Model",
                        """Build the table first, then satisfy each row.

Operations → required complexity → which structure gives that → compose

| Need | Structure |
| --- | --- |
| Membership, key lookup | Hash map |
| Ordered access, nearest key | Balanced tree (TreeMap) |
| Extremes | Heap |
| Insertion order, recency | Doubly linked list |
| Random access by index | Array |
| Uniform random selection | Array plus an index map |
| Prefix queries | Trie |

When one structure cannot satisfy every row, use two and keep them in sync. The recurring pattern is **a hash map for lookup, plus a second structure for order**, with the map's values holding references into the second structure.""",
                    ),
                    (
                        "How It Works",
                        """### The method, applied

> "Design a structure supporting insert, remove, and getRandom, all in O(1)."

Build the table:

| Operation | Required | Hash set | Array |
| --- | --- | --- | --- |
| insert | O(1) | yes | yes (append) |
| remove | O(1) | yes | no (shifts) |
| getRandom | O(1) | no (no indexing) | yes |

Neither alone works, so combine them: an array for random access, and a map from value to its index in the array.

```java
class RandomizedSet {
    private final List<Integer> values = new ArrayList<>();
    private final Map<Integer, Integer> indexOf = new HashMap<>();
    private final Random rand = new Random();

    boolean insert(int value) {
        if (indexOf.containsKey(value)) return false;
        indexOf.put(value, values.size());
        values.add(value);
        return true;
    }

    boolean remove(int value) {
        Integer index = indexOf.remove(value);
        if (index == null) return false;
        int last = values.get(values.size() - 1);
        values.set(index, last);                     // move the last element into the gap
        indexOf.put(last, index);
        values.remove(values.size() - 1);            // O(1) - removing the tail
        return true;
    }

    int getRandom() {
        return values.get(rand.nextInt(values.size()));
    }
}
```

The swap-with-last trick is the insight: removing from the middle of an array is O(n), but overwriting the gap with the last element and shrinking is O(1), and order does not matter for a set.

The ordering of operations in `remove` matters: if the removed element *is* the last one, updating `indexOf` for `last` before the removal would reinsert the key you just deleted. Handling that case is a genuine correctness detail worth mentioning.

### Design questions and their compositions

| Problem | Composition |
| --- | --- |
| LRU cache | Hash map + doubly linked list |
| LFU cache | Hash map + frequency map of lists + minimum frequency |
| Insert/delete/getRandom | Array + index map |
| Min stack | Stack + stack of minima |
| Max stack with O(1) popMax | Doubly linked list + TreeMap of nodes |
| Time-based key-value store | Map to a sorted list, binary search on timestamps |
| Autocomplete | Trie + cached top-k per node |
| Snapshot array | Map to a sorted list of (snapshotId, value) |
| Median of a stream | Two heaps |
| Rate limiter | Deque of timestamps, or a fixed-slot ring buffer |

Recognising that the composition is drawn from a small set is what makes these questions fast.

### Keeping two structures in sync

The recurring hazard: every mutation must update every structure, and forgetting one produces a corruption that appears much later.

Two habits help. Write the mutation methods first and make each one update everything before returning, and prefer storing *references* rather than duplicated data — for example, mapping a key to a linked-list node rather than to a copy of its value.

### Amortised versus worst case

State which you are providing. `ArrayList` append is amortised O(1); `HashMap` operations are expected O(1). If the question demands worst-case O(1), say that hashing does not strictly provide it and explain what does — an array indexed directly, or a structure with a bounded key space.

Being precise here is a differentiator, because most candidates say "O(1)" without qualification.""",
                    ),
                    (
                        "Example",
                        """"Design a time-based key-value store supporting `set(key, value, timestamp)` and `get(key, timestamp)` returning the value with the largest timestamp at or before the query."

```java
class TimeMap {
    private record Entry(int timestamp, String value) {}
    private final Map<String, List<Entry>> store = new HashMap<>();

    void set(String key, String value, int timestamp) {
        store.computeIfAbsent(key, k -> new ArrayList<>()).add(new Entry(timestamp, value));
    }

    String get(String key, int timestamp) {
        List<Entry> entries = store.get(key);
        if (entries == null) return "";

        int lo = 0, hi = entries.size();              // find the first entry AFTER timestamp
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (entries.get(mid).timestamp() > timestamp) hi = mid;
            else lo = mid + 1;
        }
        return lo == 0 ? "" : entries.get(lo - 1).value();
    }
}
// set O(1), get O(log n)
```

What to say: "Each key maps to a list of timestamped values. The problem states that timestamps are strictly increasing per key, so appending keeps the list sorted with no sorting cost — I would confirm that assumption, because without it `set` becomes O(n) or needs a TreeMap.

`get` is a binary search for the first entry strictly after the query timestamp; the answer is the one before it. I used the boundary template, so the empty and not-found cases fall out without special handling.

If timestamps were not increasing, I would use a `TreeMap<Integer, String>` per key and call `floorEntry`, which is O(log n) for both operations and handles arbitrary insertion order."

Naming the assumption that makes the simple version valid, and the structure you would use without it, is the complete answer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Caches with eviction policies
- Collections requiring uniform random selection
- Stacks and queues with auxiliary queries
- Versioned or time-indexed stores
- Rate limiters and sliding-window counters
- Iterators over nested or lazy structures""",
                    ),
                    (
                        "Trade-offs",
                        """- **More structures, more sync.** Each additional structure is another place to forget an update.
- **Memory versus time.** Every O(1) guarantee is usually bought with an auxiliary index.
- **Amortised versus worst case.** Hashing gives expected O(1); state it rather than claiming a strict guarantee.
- **Ordered versus unordered.** If ordering is never queried, do not pay for a tree.
- **Thread safety.** Usually out of scope; if raised, say what would need to change rather than adding locks speculatively.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Choosing a structure before listing the required complexities
- Removing from the middle of an array and claiming O(1)
- Updating one structure and not the other
- Missing the self-referential edge case, such as removing the last element in the swap trick
- Claiming worst-case O(1) for hash operations
- Ignoring what happens at capacity, or on a missing key""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Which operations must be O(1)?"** — Ask it explicitly; it determines the composition.
- **"What happens when the key is absent?"** — Define it: null, a sentinel, or an exception.
- **"Is that amortised or worst case?"** — Be precise, and say what would give a strict guarantee.
- **"What if duplicates are allowed?"** — The index map becomes a map to a set of indices, and removal needs care.
- **"How much memory does this use?"** — Roughly the sum of the structures; say which dominates.""",
                    ),
                    (
                        "Mini Exercise",
                        """For each, write the operations-versus-complexity table before choosing structures:

1. Insert, remove, and getRandom in O(1).
2. The same, allowing duplicates.
3. A stack with O(1) minimum.
4. A time-based key-value store.
5. A structure returning the most frequent element in O(1).
6. A snapshot array supporting `set`, `snap`, and `get(index, snapId)`.

Number 2 is the instructive variant: allowing duplicates turns the value-to-index map into a value-to-set-of-indices map, and the swap-with-last removal must then update the moved element's entry in a set rather than a single slot.""",
                    ),
                    (
                        "Interview Tip",
                        """Draw the operations-versus-complexity table out loud before naming any structure. It takes thirty seconds, it makes the composition obvious, and it is the difference between deriving the answer and guessing it.""",
                    ),
                ],
                [
                    "List the operations and their required complexities first; the composition follows from the table.",
                    "The recurring pattern is a hash map for lookup plus a second structure for order or recency.",
                    "Swap-with-last makes array removal O(1) when order does not matter.",
                    "Say whether your O(1) is amortised, expected, or worst case — most candidates do not.",
                ],
                [
                    "How do you achieve insert, remove and getRandom all in O(1)?",
                    "What is the general method for designing to a complexity target?",
                    "What goes wrong when you keep two structures in sync?",
                    "Is a hash map operation worst-case O(1)?",
                ],
            ),
            DL(
                "design-lru-and-caches",
                "LRU and LFU Caches",
                "The canonical design question, and the eviction policies built on the same composition.",
                12,
                "An LRU cache is the most frequently asked data structure design question, and it is worth being able to write from memory. The composition — a hash map for lookup and a doubly linked list for recency — is also the template for LFU and several other eviction policies.",
                [
                    (
                        "Why It Matters",
                        """It appears constantly, it has a clean correct answer, and the follow-ups (LFU, thread safety, a distributed version) lead naturally into system design. Being fluent means you get through the implementation quickly and spend the time on the interesting variants.

The composition also teaches a transferable idea: when you need both fast lookup and fast reordering, store map values as *references into* the ordered structure rather than as copies.""",
                    ),
                    (
                        "Mental Model",
                        """Two structures, kept in lockstep.

Hash map: key -> node. Doubly linked list: least recent ... most recent.

- The map gives O(1) lookup of the node.
- The list gives O(1) removal and reinsertion, because you already have the node reference.
- A singly linked list would not work: removing a node requires its predecessor, which costs O(n) to find.

That last point is the reason the list must be doubly linked, and it is the detail interviewers probe.""",
                    ),
                    (
                        "How It Works",
                        """### LRU cache

```java
class LRUCache {
    private static class Node {
        int key, value;
        Node prev, next;
        Node(int key, int value) { this.key = key; this.value = value; }
    }

    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0);      // sentinel: most recent side
    private final Node tail = new Node(0, 0);      // sentinel: least recent side

    LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;
        moveToFront(node);
        return node.value;
    }

    void put(int key, int value) {
        Node node = map.get(key);
        if (node != null) {
            node.value = value;
            moveToFront(node);
            return;
        }
        if (map.size() == capacity) {
            Node lru = tail.prev;                  // the least recently used
            remove(lru);
            map.remove(lru.key);                   // remove by KEY, which is why nodes store it
        }
        Node fresh = new Node(key, value);
        map.put(key, fresh);
        addAfterHead(fresh);
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addAfterHead(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    private void moveToFront(Node node) {
        remove(node);
        addAfterHead(node);
    }
}
// All operations O(1)
```

Three details to explain:

1. **Sentinel head and tail nodes** eliminate every null check in `remove` and `addAfterHead`. Without them each method needs four branches, and that is where implementations break under time pressure.
2. **Nodes store their key**, not just the value, because eviction finds the node first and must then remove it from the map by key.
3. **`get` must also update recency** — a read counts as a use. Forgetting that turns LRU into first-in-first-out.

### The shortcut worth knowing

Java's `LinkedHashMap` supports access order and an eviction hook:

```java
class LRUCache extends LinkedHashMap<Integer, Integer> {
    private final int capacity;

    LRUCache(int capacity) {
        super(capacity, 0.75f, true);              // true = access order
        this.capacity = capacity;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > capacity;
    }
}
```

Six lines. Mention it — it shows you know the standard library — and then offer to write the explicit version, because the interviewer almost always wants to see the structure.

### LFU cache

Evict the least frequently used, breaking ties by least recently used. The composition grows by one map:

```java
class LFUCache {
    private final Map<Integer, Integer> values = new HashMap<>();
    private final Map<Integer, Integer> counts = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> byFrequency = new HashMap<>();
    private final int capacity;
    private int minFrequency = 0;

    LFUCache(int capacity) { this.capacity = capacity; }

    int get(int key) {
        if (!values.containsKey(key)) return -1;
        touch(key);
        return values.get(key);
    }

    void put(int key, int value) {
        if (capacity == 0) return;
        if (values.containsKey(key)) { values.put(key, value); touch(key); return; }

        if (values.size() == capacity) {
            int evict = byFrequency.get(minFrequency).iterator().next();   // LRU within the bucket
            byFrequency.get(minFrequency).remove(evict);
            values.remove(evict);
            counts.remove(evict);
        }
        values.put(key, value);
        counts.put(key, 1);
        byFrequency.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFrequency = 1;                          // a new key always has frequency 1
    }

    private void touch(int key) {
        int frequency = counts.get(key);
        counts.put(key, frequency + 1);
        byFrequency.get(frequency).remove(key);
        if (byFrequency.get(frequency).isEmpty() && frequency == minFrequency) {
            minFrequency++;                        // the only way minFrequency can rise
        }
        byFrequency.computeIfAbsent(frequency + 1, k -> new LinkedHashSet<>()).add(key);
    }
}
// All operations O(1)
```

Two insights worth stating: `LinkedHashSet` gives O(1) removal *and* insertion-order iteration, which is exactly what "least recently used within this frequency" needs. And `minFrequency` only ever increases by one when the current minimum bucket empties, or resets to 1 on an insertion — so it never needs to be searched for, which is what keeps the operation O(1).

### Other eviction policies

- **FIFO**: a plain queue, no reordering on access. Simpler and usually worse.
- **Random**: an array with swap-with-last removal. Surprisingly competitive and trivial to implement.
- **TTL-based**: a min-heap or a TreeMap keyed by expiry, with lazy deletion on access.
- **Segmented LRU**: two LRU lists, probationary and protected, which resists a single scan flushing the whole cache.

Mentioning that a plain LRU is vulnerable to a sequential scan evicting everything useful — and that segmented LRU or LFU addresses it — is a nice bridge into the caching system design lesson.""",
                    ),
                    (
                        "Example",
                        """The full narration for the LRU design, as you would deliver it:

> "Both `get` and `put` must be O(1). A hash map gives O(1) lookup but no recency information. A list gives ordering but O(n) lookup. So I will use both: the map stores key to node, and the nodes form a doubly linked list ordered by recency.

> The list must be doubly linked because removing a node from the middle requires updating its predecessor, and with only forward links I would have to scan to find it — which would make the operation O(n).

> I will use sentinel head and tail nodes so that insertion and removal never need null checks. Each node stores its key as well as its value, because when I evict the tail I need to remove that key from the map.

> `get` looks up the node, moves it to the front, and returns the value. `put` either updates an existing node and moves it to the front, or creates a new one — evicting the node before the tail sentinel first if the cache is full.

> Every operation is O(1). Memory is O(capacity) for both structures.

> Java's `LinkedHashMap` with access order and an overridden `removeEldestEntry` does all of this in six lines, but I assume you want the explicit version."

That narration covers the composition, the reason for each choice, the edge cases, and the library shortcut — which is a complete answer before a single line is typed.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Application and database caches
- Page replacement in operating systems
- Memoisation with a bounded size
- Session and connection pools
- Any bounded store needing an eviction policy""",
                    ),
                    (
                        "Trade-offs",
                        """- **LRU versus LFU.** Recency is cheap and simple and vulnerable to scans; frequency resists scans and adapts slowly to changing access patterns.
- **Explicit structures versus LinkedHashMap.** Control and demonstrated understanding, versus six lines.
- **Doubly linked list memory.** Two extra references per entry, which is the price of O(1) removal.
- **Thread safety.** Not free; a concurrent version needs either a lock or a fundamentally different design such as striping or a clock algorithm.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using a singly linked list and claiming O(1) removal
- Not updating recency on `get`
- Omitting the key from the node, making eviction impossible in O(1)
- Forgetting sentinel nodes and mishandling the first or last entry
- Not handling a capacity of zero
- Updating one structure and not the other during eviction""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why doubly linked?"** — Removal from the middle needs the predecessor.
- **"Does `get` change the order?"** — Yes, a read is a use. This is the definition of LRU.
- **"How would you make it LFU?"** — Add a frequency map and buckets of keys, with a tracked minimum frequency.
- **"How would you make it thread-safe?"** — A lock around both structures, or a concurrent design with striping; note that the linked list is the hard part to make lock-free.
- **"What if this were distributed?"** — Consistent hashing across nodes, per-node eviction, and the invalidation problem — which is the system design conversation.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Implement an LRU cache with explicit structures.
2. Implement it with `LinkedHashMap` in under ten lines.
3. Implement an LFU cache with O(1) operations.
4. Add a per-entry time-to-live.
5. Implement a cache that evicts randomly, and compare the implementation effort.
6. Explain what happens to an LRU cache during a full table scan, and how you would mitigate it.

Number 6 is the bridge into system design: a sequential scan evicts the entire working set, which is why real caches use segmented LRU or admission policies rather than plain LRU.""",
                    ),
                    (
                        "Interview Tip",
                        """Explain the composition and the reason for the doubly linked list *before* writing code. The implementation is twenty lines of pointer updates, and an interviewer who already understands your design will forgive a small slip in them — whereas the same slip in an unexplained implementation looks like confusion.""",
                    ),
                ],
                [
                    "LRU is a hash map from key to node plus a doubly linked list ordered by recency.",
                    "The list must be doubly linked so removal from the middle is O(1); nodes must store their key for eviction.",
                    "Sentinel head and tail nodes remove every null check from the pointer updates.",
                    "LFU adds a frequency map and per-frequency LinkedHashSets, with a tracked minimum frequency.",
                ],
                [
                    "Why does an LRU cache need a doubly linked list?",
                    "Does a read update recency, and why does that matter?",
                    "How would you extend the design to LFU?",
                    "What happens to an LRU cache during a sequential scan?",
                ],
            ),
            DL(
                "design-iterators-and-streams",
                "Iterators, Lazy Structures, and Stateful Designs",
                "Flattening nested data, peeking, and designs where the state is the whole problem.",
                11,
                "Iterator design questions ask you to expose a sequence one element at a time without materialising it. They test laziness, state management, and careful handling of `hasNext` — which is where almost all the bugs are, because it often has to do the work that `next` will later return.",
                [
                    (
                        "Why It Matters",
                        """Flattening a nested list, iterating a BST in order, or merging several sources lazily are all common questions, and they have a shared difficulty: `hasNext` must determine whether an element exists without consuming it, which frequently means advancing internal state and buffering.

They are also a good test of whether you can design for memory: the naive answer materialises everything, and the point of the question is usually to avoid that.""",
                    ),
                    (
                        "Mental Model",
                        """The iterator holds exactly enough state to produce the next element.

Lazy: hold cursors -> `hasNext` advances until an element is found or sources are exhausted

Two implementation styles:

- **Eager**: flatten into a list in the constructor. Simple, O(n) memory, and often the wrong answer to the question being asked.
- **Lazy**: hold a stack or cursors and advance on demand. O(depth) memory, and what interviewers usually want.

> Memory cue: put the advancing logic in `hasNext`, and make `next` trivial. Trying to do it the other way round produces the classic double-advance bug.""",
                    ),
                    (
                        "How It Works",
                        """### Flatten a nested list

```java
class NestedIterator implements Iterator<Integer> {
    private final Deque<Iterator<NestedInteger>> stack = new ArrayDeque<>();
    private Integer nextValue;

    NestedIterator(List<NestedInteger> nestedList) {
        stack.push(nestedList.iterator());
    }

    @Override
    public boolean hasNext() {
        if (nextValue != null) return true;              // already buffered
        while (!stack.isEmpty()) {
            Iterator<NestedInteger> top = stack.peek();
            if (!top.hasNext()) { stack.pop(); continue; }
            NestedInteger item = top.next();
            if (item.isInteger()) { nextValue = item.getInteger(); return true; }
            stack.push(item.getList().iterator());       // descend into the nested list
        }
        return false;
    }

    @Override
    public Integer next() {
        if (!hasNext()) throw new NoSuchElementException();
        Integer result = nextValue;
        nextValue = null;                                // consume the buffer
        return result;
    }
}
// O(1) amortised per call, O(depth) space
```

The buffered `nextValue` is what makes repeated `hasNext` calls idempotent — a caller may legitimately call it several times before `next`, and without the buffer each call would consume an element.

A stack of iterators rather than a flattened list keeps memory proportional to the nesting depth rather than the total size, which is the whole point.

### BST iterator

```java
class BSTIterator {
    private final Deque<TreeNode> stack = new ArrayDeque<>();

    BSTIterator(TreeNode root) { pushLeft(root); }

    boolean hasNext() { return !stack.isEmpty(); }

    int next() {
        TreeNode node = stack.pop();
        pushLeft(node.right);
        return node.val;
    }

    private void pushLeft(TreeNode node) {
        while (node != null) { stack.push(node); node = node.left; }
    }
}
// O(1) amortised per call, O(h) space
```

This is the iterative in-order traversal, paused between steps. Each node is pushed once and popped once across a full traversal, so `next` is amortised O(1) despite the loop — the same amortised argument as the monotonic stack.

O(h) space rather than O(n) is what makes it a useful iterator rather than just a list in disguise.

### Peeking iterator

```java
class PeekingIterator implements Iterator<Integer> {
    private final Iterator<Integer> source;
    private Integer buffered;

    PeekingIterator(Iterator<Integer> source) { this.source = source; }

    Integer peek() {
        if (buffered == null) buffered = source.next();
        return buffered;
    }

    @Override
    public Integer next() {
        if (buffered != null) { Integer result = buffered; buffered = null; return result; }
        return source.next();
    }

    @Override
    public boolean hasNext() { return buffered != null || source.hasNext(); }
}
```

One slot of buffering implements `peek` over any iterator. The `hasNext` check must consider the buffer, which is the detail that is easy to miss.

### Merging several sorted sources lazily

```java
class MergingIterator {
    private final PriorityQueue<Iterator<Integer>> heap;
    // ... ordered by each iterator's current head value
}
```

A heap of iterators keyed by their next value gives O(log k) per element with O(k) memory, regardless of the total size. This is the streaming form of merging k sorted lists.

### Designing for the awkward cases

Three questions to settle before coding any iterator:

- **What does `hasNext` do when called repeatedly?** It must be idempotent, which is what the buffer provides.
- **What does `next` do when exhausted?** Throw `NoSuchElementException`, matching the interface contract, rather than returning null.
- **Is `remove` supported?** Usually not; say so rather than leaving it unimplemented silently.

### Stateful design more generally

The same discipline applies to any design where the state is the product:

- **Snapshot array**: each index maps to a sorted list of `(snapshotId, value)`; `get` binary searches. Memory is proportional to the number of writes, not to snapshots multiplied by length, which is the insight.
- **Undo/redo**: two stacks, with the redo stack cleared on a new action.
- **Iterator over a matrix in diagonal or spiral order**: cursors plus a direction, with the turn rule as the only real logic.""",
                    ),
                    (
                        "Example",
                        """"Design an iterator over a 2D vector — a list of lists — supporting `next` and `hasNext`."

```java
class Vector2D implements Iterator<Integer> {
    private final List<List<Integer>> data;
    private int outer = 0, inner = 0;

    Vector2D(List<List<Integer>> data) { this.data = data; }

    @Override
    public boolean hasNext() {
        while (outer < data.size() && inner == data.get(outer).size()) {
            outer++;                       // skip empty or exhausted inner lists
            inner = 0;
        }
        return outer < data.size();
    }

    @Override
    public Integer next() {
        if (!hasNext()) throw new NoSuchElementException();
        return data.get(outer).get(inner++);
    }
}
// O(1) amortised per call, O(1) extra space
```

What to say: "The state is just two cursors. The awkward case is empty inner lists, possibly several in a row, so `hasNext` advances past them in a loop rather than an `if` — a single conditional would fail on two consecutive empty lists.

Putting all the advancing in `hasNext` and having `next` call it first means the two can never disagree, and `hasNext` stays idempotent because it only moves the cursor past positions that hold nothing.

I could have flattened everything in the constructor, which is simpler but O(n) memory. Two cursors is O(1), and for a large or lazily-produced input that is the difference between working and not."

The consecutive-empty-lists case is exactly the input an interviewer will test, and mentioning it before being asked is the signal.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Flattening nested or hierarchical data
- Lazy traversal of large trees
- Merging multiple sorted sources
- Paginated or streaming APIs
- Undo/redo and versioned state""",
                    ),
                    (
                        "Trade-offs",
                        """- **Lazy versus eager.** O(depth) memory and more state management, versus O(n) memory and trivial code.
- **Buffer slot.** One extra field makes `hasNext` idempotent and adds a state to reason about.
- **Amortised versus per-call cost.** Individual calls may do real work; the total across a traversal is linear.
- **Supporting `remove`.** Rarely needed and significantly complicates the state; declare it unsupported.""",
                    ),
                    (
                        "Common Mistakes",
                        """- `hasNext` consuming an element, so two calls skip one
- Using `if` instead of `while` when skipping empty sub-collections
- Returning null on exhaustion rather than throwing
- Materialising everything in the constructor when the question asked for laziness
- Forgetting the buffer in `hasNext` for a peeking iterator
- Claiming O(1) per call rather than O(1) amortised""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if `hasNext` is called twice?"** — Idempotent, because of the buffer or because it only skips empty positions.
- **"Can you avoid flattening up front?"** — Yes, with a stack of iterators or cursors; state the memory saving.
- **"What is the space complexity?"** — O(depth) or O(h), not O(n) — that is the point.
- **"What if an inner list is empty?"** — Loop past it; test consecutive empties.
- **"Is each call O(1)?"** — Amortised; each element is touched a constant number of times overall.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Iterate a 2D vector lazily.
2. Flatten an arbitrarily nested list lazily.
3. Build a BST iterator with O(h) memory.
4. Wrap any iterator with a `peek` operation.
5. Merge k sorted iterators lazily.
6. Design a snapshot array with `set`, `snap`, and `get(index, snapId)`.

For each, write down what `hasNext` does when the underlying data is exhausted and when it is called twice in a row — those two cases contain nearly every bug in this category.""",
                    ),
                    (
                        "Interview Tip",
                        """Put all the advancing logic in `hasNext` and make `next` call it first. That single structural decision makes the two methods impossible to desynchronise, and it is the difference between an iterator that works and one that skips elements on repeated calls.""",
                    ),
                ],
                [
                    "Put the advancing logic in `hasNext` and make `next` trivial — that keeps them consistent.",
                    "Buffer one element so repeated `hasNext` calls are idempotent.",
                    "Lazy iterators use O(depth) or O(h) memory; materialising in the constructor defeats the purpose.",
                    "Skip empty sub-collections with a loop, not a conditional — consecutive empties are the test case.",
                ],
                [
                    "How do you make `hasNext` idempotent?",
                    "Why is a lazy iterator preferable to flattening in the constructor?",
                    "What is the space complexity of a BST iterator, and why?",
                    "What should `next` do when the iterator is exhausted?",
                ],
            ),
        ],
        practice_tag="hashmap",
    )


def _execution_topic() -> dict:
    return _dsa_topic(
        "coding-execution",
        "Writing and Testing Code Under Pressure",
        "Producing correct code quickly, finding your own bugs, and communicating while you do it.",
        "EASY",
        29,
        [
            DL(
                "writing-bug-free-code",
                "Writing Code That Works First Time",
                "Habits that eliminate the bugs interviewers actually see.",
                12,
                "Most interview bugs are not algorithmic. They are off-by-one errors, unhandled empty inputs, reversed comparisons, and variables used before they are assigned. A small set of habits removes most of them before the code is run, which matters because debugging under observation costs far more time than writing carefully.",
                [
                    (
                        "Why It Matters",
                        """Coding quality is a scored dimension in its own right, and it is the one candidates practise least. Two solutions with the same algorithm can score very differently: one is readable, guarded, and correct on the first trace; the other needs five minutes of hunting for a sign error.

The habits are also cheap. Writing guard clauses first and naming variables properly costs seconds and saves minutes.""",
                    ),
                    (
                        "Mental Model",
                        """Write the frame before the logic.

Signature → guards → main structure → fill in → trace

1. Write the method signature and return type.
2. Write the guard clauses for empty, null, and single-element inputs.
3. Write the loop or recursion skeleton with the termination condition.
4. Fill in the body.
5. Trace a small example before declaring it done.

Doing these in order means you are never holding more than one decision in your head at a time.""",
                    ),
                    (
                        "How It Works",
                        """### Guards first

```java
int solve(int[] nums, int target) {
    if (nums == null || nums.length == 0) return -1;     // write this before anything else
    // ... main logic
}
```

Writing the guards first means the empty case can never be forgotten, and it is the case interviewers test first.

### Name things properly

```java
// Hard to verify
for (int i = 0; i < n; i++)
    for (int j = 0; j < m; j++)
        if (g[i][j] == 1) c++;

// Easy to verify
for (int row = 0; row < rows; row++)
    for (int col = 0; col < cols; col++)
        if (grid[row][col] == LAND) landCount++;
```

Single-letter names are fine for loop indices in short loops and actively harmful for anything nested or indexed. `row` and `col` make an index transposition visible; `i` and `j` do not.

### Extract helpers

```java
private boolean inBounds(int r, int c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
}
```

A named helper is written once, verified once, and reused. Four inline copies of a bounds check is four chances for a typo, and that typo is the single most common grid bug.

### Prefer the shapes that are hard to get wrong

- **Half-open ranges** `[lo, hi)`: length is `hi - lo`, empty is `lo == hi`.
- **`lo + (hi - lo) / 2`** rather than `(lo + hi) / 2`.
- **`Integer.compare`** rather than subtraction.
- **`for (var x : collection)`** rather than an index when the index is not needed.
- **Early returns** rather than deep nesting.
- **`Math.max` into an accumulator** rather than a conditional assignment.

### Comparison and boundary checklist

Before running anything, check each of:

- Is the loop bound `<` or `<=`, and is that right for this range convention?
- Does the loop start at 0 or 1?
- Is the comparison `<` or `>` the right direction?
- Are the two indices in a 2D access in the right order?
- Is a variable modified inside the loop that the condition also reads?
- Does every branch return or assign?

Reading the code once against this list takes twenty seconds and catches most of what a first run would.

### Handle the standard edge cases explicitly

| Input type | Cases to consider |
| --- | --- |
| Array | Empty, one element, two elements, all equal, already sorted, reverse sorted |
| String | Empty, one character, all same character, mixed case |
| Tree | Null root, single node, one-sided chain, complete |
| Linked list | Empty, one node, two nodes, cycle |
| Graph | Empty, disconnected, self-loop, single node |
| Numbers | Zero, negative, `Integer.MAX_VALUE`, overflow in sums |

You do not need to handle all of them in every problem; you need to have considered them and said which apply.

### Narrate at the level of intent

```java
// Say: "now I shrink the window until it is valid again"
// Not: "now I increment left"
```

Narrating intent lets the interviewer follow without reading every character, and it makes your own logical errors audible to you as you speak — which is a genuine debugging technique, not just a communication one.

### When you do get stuck in a bug

1. Stop reading the code. Re-reading rarely finds it.
2. Trace with a concrete small input, writing down each variable's value.
3. Check the boundary cases first — they are where the bug usually is.
4. Say what you expected and what you got. Articulating the gap frequently reveals it.

Silently staring at code is the worst use of interview time, and it is what candidates default to.""",
                    ),
                    (
                        "Example",
                        """A first draft with four common bugs, and the corrected version.

```java
// Buggy
int findMax(int[] nums) {
    int max = 0;                                  // BUG 1: fails for all-negative input
    for (int i = 0; i <= nums.length; i++) {      // BUG 2: off-by-one, out of bounds
        if (nums[i] > max) max = nums[i];
    }
    return max;                                   // BUG 3: no empty-input guard
}
```

```java
// Corrected
int findMax(int[] nums) {
    if (nums == null || nums.length == 0) {
        throw new IllegalArgumentException("empty input");   // explicit contract
    }
    int max = nums[0];                            // initialise from the data, not from zero
    for (int i = 1; i < nums.length; i++) {
        max = Math.max(max, nums[i]);
    }
    return max;
}
```

What to say while writing the corrected version: "I initialise from the first element rather than zero, because the array may be entirely negative. The loop starts at one since index zero is already accounted for, and the bound is strictly less than the length.

For the empty case I am throwing rather than returning a sentinel, because there is no correct maximum of an empty set — but if you would prefer a sentinel or an `Optional`, that is a contract decision I am happy to change."

Three of the four bugs are prevented by habits rather than by thinking about this specific problem, and the fourth — the contract for empty input — is raised as a question rather than assumed.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Every coding round
- Take-home exercises, where readability is weighted more heavily
- Pair programming and code review at work""",
                    ),
                    (
                        "Trade-offs",
                        """- **Guards versus brevity.** A few extra lines that demonstrate care; in interviews this is almost always worth it.
- **Helper methods versus inline code.** Clearer and verifiable once, at the cost of a little scrolling.
- **Descriptive names versus typing speed.** Names cost seconds and save debugging minutes.
- **Defensive checks versus assuming valid input.** Ask which the interviewer wants rather than guessing; both are defensible when stated.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Initialising a maximum to zero rather than the first element
- `<=` in a loop bound over an array length
- Not handling empty or null input
- Copy-pasted bounds checks with one typo
- Modifying a collection while iterating it
- Deep nesting instead of early returns
- Writing the whole solution before tracing any of it""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if the input is empty?"** — Have the guard already written, and state the contract you chose.
- **"What if all values are negative?"** — The initialisation question; this is asked specifically.
- **"Can you make this more readable?"** — Extract a helper, name the constants, flatten the nesting.
- **"Is this thread-safe?"** — Usually out of scope; say what would need to change rather than adding synchronisation speculatively.
- **"Would you write it this way in production?"** — Mention validation, logging, and tests, which is the honest difference.""",
                    ),
                    (
                        "Mini Exercise",
                        """Find every bug without running the code:

1. `for (int i = 0; i <= s.length(); i++) sum += s.charAt(i);`
2. `int min = 0; for (int x : nums) if (x < min) min = x;`
3. `while (lo <= hi) { int mid = (lo + hi) / 2; if (a[mid] < t) lo = mid; else hi = mid; }`
4. `for (int i = 0; i < list.size(); i++) if (list.get(i) == target) list.remove(i);`
5. `if (map.get(key) > 0) count++;` where the key may be absent.

Number 3 has two bugs — potential overflow and an infinite loop from `lo = mid` — and is the one most likely to appear in real interview code.""",
                    ),
                    (
                        "Interview Tip",
                        """Write the guard clauses before the algorithm, every time. It takes ten seconds, it handles the case the interviewer will test first, and it visibly demonstrates that you think about inputs rather than only about the happy path.""",
                    ),
                ],
                [
                    "Write the signature and guard clauses before the logic; empty input is the first case tested.",
                    "Initialise extremes from the data, never from zero.",
                    "Extract bounds checks into a named helper rather than copy-pasting them.",
                    "Narrate at the level of intent, which makes your own logical errors audible to you.",
                ],
                [
                    "What edge cases do you check before declaring a solution done?",
                    "Why initialise a maximum from the first element rather than zero?",
                    "What do you do when you cannot find a bug by reading the code?",
                    "How would this differ if it were production code?",
                ],
            ),
            DL(
                "testing-and-edge-cases",
                "Testing Your Own Solution",
                "Tracing, categories of test input, and finding your own bug before the interviewer does.",
                11,
                "Verification is a scored dimension and the one most candidates skip entirely. Declaring \"that should work\" scores nothing; tracing a concrete example, finding a bug, and fixing it scores more than writing the same code correctly by luck. The technique is systematic, and it takes two minutes.",
                [
                    (
                        "Why It Matters",
                        """Interviewers consistently report that self-verification is the strongest positive signal available, because it is the behaviour the job actually requires. Finding your own bug is better than not having one, from a scoring perspective, because it demonstrates a repeatable process.

It is also the cheapest improvement available to most candidates. The algorithmic skill takes months to build; the habit of tracing takes one practice session.""",
                    ),
                    (
                        "Mental Model",
                        """Test in three widening circles.

Happy path → edges → adversarial

1. **Happy path**: the example from the problem, traced by hand.
2. **Edges**: empty, single element, two elements, all equal, extremes.
3. **Adversarial**: what would break *this specific implementation*?

The third circle is the valuable one, because it requires thinking about your own code rather than about the problem.""",
                    ),
                    (
                        "How It Works",
                        """### Tracing properly

Pick a small input and write down the value of each variable at each iteration. Out loud, visibly.

> "Input `[3, 1, 4]`, target 5. Iteration zero: `i` is 0, `nums[0]` is 3, I look for 2 in the map — not present, so I insert 3 mapping to 0. Iteration one: `nums[1]` is 1, I look for 4 — not present, insert 1 to 1. Iteration two: `nums[2]` is 4, I look for 1 — present at index 1, so I return `[1, 2]`. Correct."

Two minutes, and it catches the errors that would otherwise take ten to find. It also fills the silence productively.

### Categories of test input

| Category | Examples |
| --- | --- |
| Empty | `[]`, `""`, null root |
| Single | One element, one node |
| Two | The smallest case where order matters |
| All identical | `[5, 5, 5, 5]` |
| Already sorted | Best or worst case for several algorithms |
| Reverse sorted | Often the adversarial case |
| Extremes | `Integer.MAX_VALUE`, `Integer.MIN_VALUE`, zero |
| Negatives | Breaks sliding windows and greedy assumptions |
| Duplicates | Breaks two-pointer and backtracking dedup logic |
| Degenerate structure | A tree that is a straight line, a disconnected graph |

You will not test all of these. Naming the two or three that matter for *this* problem is what demonstrates judgement.

### Implementation-specific adversarial tests

This is the part that separates good verification from going through the motions. Ask what *your* code assumes:

- Used a `int[26]` counter? Test an uppercase or non-letter character.
- Used a sliding window on sums? Test negative values.
- Used `int` arithmetic? Test values near the maximum.
- Used recursion? Test a degenerate input that makes it deep.
- Used a hash map keyed on an object? Test two equal-content instances.
- Assumed the input is sorted? Test unsorted input.
- Used `<` where `<=` might be right? Test the exact boundary.

### Property-based reasoning

Sometimes a property is easier to check than a specific output:

- The output length equals the input length.
- The result is always non-negative.
- The output is sorted.
- Every input element appears exactly once in the output.
- The answer is at most the brute-force answer.

Stating an invariant and checking it against your trace is a fast way to verify a complex output.

### If you find a bug

Say so immediately and clearly: "I have a bug — on an empty array this throws. Let me add a guard." Then fix it and re-trace.

Do not silently patch it. The visible find-and-fix is the thing being scored; a silent correction looks like you were unsure of the code all along.

### What to say when you are done

> "I have traced the example and it produces the expected output. I have checked the empty array, a single element, and all-duplicates, which all behave correctly. The case I would want a real test for is a very large input, because the recursion depth here is O(n) on a degenerate tree and could overflow the stack — in production I would make that iterative."

That closing statement covers verification, edge cases, and a known limitation, in three sentences.""",
                    ),
                    (
                        "Example",
                        """A sliding-window solution, verified properly.

```java
int longestSubarrayWithSumAtMost(int[] nums, int k) {
    int left = 0, sum = 0, best = 0;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum > k) sum -= nums[left++];
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

The verification, out loud:

> "Happy path: `[1, 2, 3]` with k = 5. Right 0: sum 1, window `[1]`, best 1. Right 1: sum 3, best 2. Right 2: sum 6, which exceeds 5, so shrink — subtract 1, sum 5, left is 1, window `[2,3]`, best 2. Returns 2. Correct.

> Empty array: the loop never runs, returns 0. Correct.

> Single element larger than k: sum exceeds k, the while loop shrinks until left passes right, giving a window of size zero, best stays 0. Correct — and worth checking, because if the while condition were wrong this would loop forever or produce a negative width.

> Now the adversarial case for *this* implementation: **negative numbers**. With `[2, -1, 3]` and k = 3, adding a negative value can bring the sum back under k, but my while loop only shrinks from the left — it never reconsiders. So this solution is only correct for non-negative values.

> If negatives are possible, the sliding window is invalid and I would use prefix sums with a hash map instead. Is the input guaranteed non-negative?"

That final question is the highest-value sentence in the whole answer: the candidate found the precondition their own solution depends on, said it, and named the correct alternative.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Every coding interview, before declaring a solution complete
- Take-home submissions, where you should include the tests
- Reviewing your own pull requests""",
                    ),
                    (
                        "Trade-offs",
                        """- **Time spent testing versus time spent coding.** Two to four minutes is right; a full test suite is not expected.
- **Tracing every case versus naming them.** Trace one fully, name the others and say why they are fine.
- **Finding a bug versus looking confident.** Finding it is worth more; interviewers are explicitly told to reward it.
- **Fixing versus explaining.** For a small bug, fix it. For a structural one, explain what you would change rather than rewriting under time pressure.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Saying "that should work" and stopping
- Tracing mentally rather than out loud
- Testing only the given example
- Testing generic edge cases without asking what *this* implementation assumes
- Silently patching a bug when it is found
- Rewriting from scratch instead of fixing the specific line""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How would you test this?"** — Give the categories and name the two or three that matter here.
- **"What happens on an empty input?"** — Should already be handled and mentioned.
- **"Are you confident this is correct?"** — Cite what you traced, and name any assumption you are relying on.
- **"What would you add for production?"** — Input validation, unit tests per category, and a property-based test if the invariant is expressible.
- **"What is the weakest part of your solution?"** — Have an answer; volunteering it is a strong signal.""",
                    ),
                    (
                        "Mini Exercise",
                        """For each, name the implementation-specific adversarial input:

1. A sliding-window solution summing values.
2. A solution using `int[26]` for character counts.
3. A recursive tree traversal.
4. A binary search using `(lo + hi) / 2`.
5. A two-pointer solution on a sorted array with duplicates.
6. A hash map keyed on a mutable object.
7. A solution accumulating a sum of a large array into an `int`.

Each has exactly one input that breaks it, and being able to produce that input from the code alone is the skill this lesson builds.""",
                    ),
                    (
                        "Interview Tip",
                        """After you finish coding, say "let me trace this" and do it out loud with real values. It is two minutes, it directly scores the verification dimension that most candidates leave blank, and it is the most reliable way to find your own bug before the interviewer does.""",
                    ),
                ],
                [
                    "Trace a concrete example out loud with real variable values before declaring anything done.",
                    "Test in three circles: happy path, generic edges, then inputs adversarial to your specific implementation.",
                    "Finding and announcing your own bug scores higher than quietly having none.",
                    "Name the precondition your solution depends on and the alternative if it does not hold.",
                ],
                [
                    "How do you verify a solution without running it?",
                    "What edge cases matter for this particular implementation?",
                    "What should you do the moment you find a bug in your own code?",
                    "What assumption does your solution rely on, and what would you use instead?",
                ],
            ),
        ],
        practice_tag="array",
    )


def dsa_pattern_topics() -> list[dict]:
    """Algorithm patterns and interview-execution topics."""
    return [
        _graph_traversal_topic(),
        _advanced_graphs_topic(),
        _backtracking_topic(),
        _greedy_topic(),
        _dp1d_topic(),
        _dp2d_topic(),
        _intervals_topic(),
        _bit_topic(),
        _math_topic(),
        _design_topic(),
        _execution_topic(),
    ]
