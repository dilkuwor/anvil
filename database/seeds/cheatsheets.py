"""Interview cheat sheets. Seeded into PostgreSQL — not hardcoded in the UI.

These are reference sheets, not lessons. The Learn catalog teaches; a cheat
sheet is for recall under pressure, so the content is weighted toward lookup
tables, copyable templates, formulas, and checklists rather than prose.

Block kinds and how they render (see
``frontend/src/components/cheatsheets/cheatsheet-blocks.tsx``):

* ``table``   — scannable grid. The workhorse; prefer it for anything comparative.
* ``formula`` — monospace ``<pre>`` with a copy button. Multi-line is fine, so
  this is also how code templates are shipped.
* ``example`` — monospace, whitespace preserved, no copy button.
* ``bullets`` / ``steps`` — tickable checklist (steps are numbered).
* ``tip``     — highlighted callout. One per section at most; it must earn it.
* ``rule`` / ``definition`` — plain prose card. Use sparingly.

Bodies, list items, and table cells support ``inline code`` and ``**bold**``.
"""

from __future__ import annotations


def D(body: str, title: str = "Definition") -> dict:
    return {"kind": "definition", "title": title, "body": body}


def R(body: str, title: str = "Key rule") -> dict:
    return {"kind": "rule", "title": title, "body": body}


def E(body: str, title: str = "Example") -> dict:
    return {"kind": "example", "title": title, "body": body}


def T(body: str, title: str = "Interview tip") -> dict:
    return {"kind": "tip", "title": title, "body": body}


def B(items: list[str], title: str = "Remember") -> dict:
    return {"kind": "bullets", "title": title, "body": "", "items": items}


def F(body: str, title: str = "Formula") -> dict:
    """Copyable monospace block. Used for formulas and for code templates."""
    return {"kind": "formula", "title": title, "body": body}


def S(items: list[str], title: str = "Steps") -> dict:
    return {"kind": "steps", "title": title, "body": "", "items": items}


def TB(headers: list[str], rows: list[list[str]], title: str = "") -> dict:
    return {"kind": "table", "title": title, "body": "", "items": {"headers": headers, "rows": rows}}


def section(slug: str, title: str, *blocks: dict) -> dict:
    return {"slug": slug, "title": title, "blocks": list(blocks)}


DSA_SHEET = {
    "slug": "dsa",
    "title": "DSA Patterns & Templates",
    "description": "Pattern triggers, complexity targets, and copy-ready Java templates for coding rounds.",
    "minutes": 18,
    "order": 1,
    "sections": [
        section(
            "pattern-picker",
            "Pattern Picker",
            TB(
                ["If the problem says...", "Reach for", "Typical cost"],
                [
                    ["Sorted array, find a pair or triplet", "Two pointers", "O(n) after sort"],
                    ["Sorted array, find a position or boundary", "Binary search", "O(log n)"],
                    ["**Minimise the maximum** / smallest X such that", "Binary search on the answer", "O(n log range)"],
                    ["Contiguous **subarray** or **substring**", "Sliding window", "O(n)"],
                    ["Subarray sum with **negative** values", "Prefix sums + hash map", "O(n)"],
                    ["Range sum queries on a static array", "Prefix sums", "O(1) per query"],
                    ["Many range updates, one read at the end", "Difference array", "O(n + u)"],
                    ["Next greater / smaller, spans, histograms", "Monotonic stack", "O(n)"],
                    ["Max or min of every window of size k", "Monotonic deque", "O(n)"],
                    ["Have I seen this? grouping, counting", "Hash map / set", "O(n)"],
                    ["Top K, running median, merge k sources", "Heap (or two heaps)", "O(n log k)"],
                    ["Kth largest, one-off, array is mutable", "Quickselect", "O(n) average"],
                    ["Prefixes, autocomplete, many words at once", "Trie", "O(word length)"],
                    ["Connectivity, grouping, edges arriving", "Union-Find", "~O(1) amortised"],
                    ["Fewest steps, unweighted graph or grid", "BFS", "O(V + E)"],
                    ["Components, cycles, all paths", "DFS", "O(V + E)"],
                    ["Ordering with dependencies", "Topological sort", "O(V + E)"],
                    ["Cheapest path, non-negative weights", "Dijkstra", "O((V+E) log V)"],
                    ["All subsets / permutations / combinations", "Backtracking", "Output-bound"],
                    ["Count the ways, or best over choices", "Dynamic programming", "states x transitions"],
                    ["Locally optimal choice is provably safe", "Greedy", "O(n log n)"],
                    ["Overlapping ranges, meetings, calendars", "Sort by end or start, sweep", "O(n log n)"],
                    ["Find missing/duplicate in a bounded range", "XOR, cycle sort, or index marking", "O(n), O(1) space"],
                    ["`n <= 20` and subsets matter", "Bitmask", "O(2^n * n)"],
                    ["Linked list: cycle, middle, nth from end", "Fast and slow pointers", "O(n), O(1) space"],
                ],
                "Signal to technique",
            ),
            T("Say your candidate techniques out loud before choosing: \"contiguous substring with a constraint, so sliding window; prefix sums if values can be negative.\" That one sentence shows pattern recognition and invites the interviewer to steer you."),
        ),
        section(
            "complexity-targets",
            "What Complexity Should I Aim For?",
            TB(
                ["Input size n", "Target complexity", "What that looks like"],
                [
                    ["n <= 12", "O(n!)", "Permutations"],
                    ["n <= 20", "O(2^n)", "Subsets, bitmask DP"],
                    ["n <= 100", "O(n^3)", "Floyd-Warshall, interval DP"],
                    ["n <= 1,000", "O(n^2)", "Nested loops, 2D DP"],
                    ["n <= 100,000", "O(n log n)", "Sort, heap, binary search per element"],
                    ["n <= 1,000,000", "O(n) or O(n log n)", "Single pass, hash map"],
                    ["n > 10,000,000", "O(n) or O(log n)", "Streaming, and watch memory"],
                ],
                "Constraints tell you the answer",
            ),
            E("~10^8 simple operations per second is the practical budget.\n\nn = 10^5 with O(n^2)      -> 10^10 ops  -> too slow\nn = 10^5 with O(n log n)  -> ~1.7 x 10^6 -> comfortable", "Sanity check"),
            T("Ask for the size of `n` in your first minute. It tells you the target complexity before you have thought about an algorithm at all, and it stops you coding a nested loop that was never going to pass."),
        ),
        section(
            "big-o-operations",
            "Big-O by Data Structure",
            TB(
                ["Structure", "Access", "Search", "Insert", "Delete", "Notes"],
                [
                    ["Array", "O(1)", "O(n)", "O(n)", "O(n)", "Append is O(1) amortised"],
                    ["Sorted array", "O(1)", "O(log n)", "O(n)", "O(n)", "Binary search"],
                    ["Linked list", "O(n)", "O(n)", "O(1) at a known node", "O(1) at a known node", "Finding the node is O(n)"],
                    ["Hash map / set", "-", "O(1) exp.", "O(1) exp.", "O(1) exp.", "O(n) worst case"],
                    ["Balanced BST / TreeMap", "-", "O(log n)", "O(log n)", "O(log n)", "Ordered, range queries"],
                    ["Heap", "O(1) peek", "O(n)", "O(log n)", "O(log n)", "Build from n is O(n)"],
                    ["Trie", "-", "O(L)", "O(L)", "O(L)", "L = word length"],
                    ["Union-Find", "-", "~O(1)", "~O(1)", "n/a", "No deletion"],
                    ["Stack / Queue / Deque", "-", "O(n)", "O(1)", "O(1)", "Ends only"],
                ],
                "Worst case unless marked",
            ),
            TB(
                ["Algorithm", "Time", "Space", "Stable", "When"],
                [
                    ["Merge sort", "O(n log n)", "O(n)", "Yes", "Guaranteed bound, linked lists, external"],
                    ["Quicksort", "O(n log n) avg", "O(log n)", "No", "Best constants in place"],
                    ["Heapsort", "O(n log n)", "O(1)", "No", "Guaranteed with no extra memory"],
                    ["Insertion sort", "O(n^2), O(n) near-sorted", "O(1)", "Yes", "Tiny or nearly sorted input"],
                    ["Counting sort", "O(n + k)", "O(k)", "Yes", "Small integer range"],
                    ["Radix sort", "O(d(n + b))", "O(n + b)", "Yes", "Fixed-width keys"],
                ],
                "Sorting",
            ),
            T("Java uses dual-pivot quicksort for primitives and stable TimSort for objects. The reason for the split is that stability is meaningless for primitives, and interviewers do ask why."),
        ),
        section(
            "java-collection-costs",
            "Java Collections: Pick and Cost",
            TB(
                ["Need", "Use", "Cost", "Watch out for"],
                [
                    ["Indexed list", "`ArrayList`", "get O(1), add O(1) amortised", "`remove(0)` is O(n)"],
                    ["Queue or stack", "`ArrayDeque`", "O(1) both ends", "Not `java.util.Stack` (synchronised)"],
                    ["Membership", "`HashSet`", "O(1) expected", "Iteration order unspecified"],
                    ["Key to value", "`HashMap`", "O(1) expected", "Needs stable `equals`/`hashCode`"],
                    ["Insertion or access order", "`LinkedHashMap`", "O(1) expected", "Access order gives an LRU cache"],
                    ["Sorted keys, nearest key, ranges", "`TreeMap` / `TreeSet`", "O(log n)", "No null keys"],
                    ["Min or max on demand", "`PriorityQueue`", "peek O(1), poll O(log n)", "Min-heap by default; iteration is unsorted"],
                    ["Counting", "`int[]` or `HashMap`", "O(1)", "Array wins for a small bounded alphabet"],
                    ["Thread-safe map", "`ConcurrentHashMap`", "O(1) expected", "Not `Collections.synchronizedMap`"],
                ],
                "Decision table",
            ),
            F("counts.merge(key, 1, Integer::sum);                       // frequency\ngroups.computeIfAbsent(key, k -> new ArrayList<>()).add(v); // multimap\nif (!seen.add(x)) return true;                            // one-lookup dup test\nmap.getOrDefault(key, 0);\nnew ArrayList<>(new LinkedHashSet<>(list));               // dedupe, keep order", "Idioms worth memorising"),
            T("`list.contains(x)` inside a loop is the most common accidental O(n^2). If you are testing membership repeatedly, it must be a `Set`."),
        ),
        section(
            "template-binary-search",
            "Template: Binary Search",
            F("""// First index where predicate is true. Returns nums.length if never.
int lowerBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;          // hi EXCLUSIVE
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;      // no overflow
        if (nums[mid] >= target) hi = mid; // mid might be the answer
        else lo = mid + 1;                 // mid definitely is not
    }
    return lo;
}
// upperBound: change >= to >
// firstOccurrence: lowerBound, then check nums[i] == target
// count of target: upperBound - lowerBound""", "Boundary template"),
            F("""// Binary search on the ANSWER
int smallestFeasible(int lo, int hi) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (feasible(mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
// Needs: bounded range, a cheap feasible(x), and monotonicity.""", "Search the answer space"),
            B(
                [
                    "Half-open `[lo, hi)` with `while (lo < hi)` — the range always shrinks, so no infinite loop",
                    "`hi = mid` pairs with `lo < hi`; `hi = mid - 1` pairs with `lo <= hi`. Never mix the two",
                    "Not-found lands naturally at `nums.length`",
                    "Duplicates degrade rotated-array search to O(n) — say so rather than claiming O(log n)",
                ],
                "Why this template",
            ),
        ),
        section(
            "template-sliding-window",
            "Template: Sliding Window",
            F("""// Longest valid window
int longest(int[] nums) {
    int left = 0, best = 0;
    for (int right = 0; right < nums.length; right++) {
        add(nums[right]);
        while (!valid()) { remove(nums[left]); left++; }
        best = Math.max(best, right - left + 1);   // record AFTER shrinking
    }
    return best;
}

// Shortest valid window
int shortest(int[] nums) {
    int left = 0, best = Integer.MAX_VALUE;
    for (int right = 0; right < nums.length; right++) {
        add(nums[right]);
        while (valid()) {
            best = Math.min(best, right - left + 1); // record WHILE valid
            remove(nums[left]); left++;
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}""", "Two shapes"),
            F("exactly(K) = atMost(K) - atMost(K - 1)", "Counting exactly K"),
            B(
                [
                    "Window length is `right - left + 1`",
                    "It is O(n) because `left` only moves forward — say the amortised argument before being asked",
                    "**Negative values break sum-based windows.** Switch to prefix sums with a hash map",
                    "If you cannot state the validity condition, it is not a window problem",
                ],
                "Window rules",
            ),
        ),
        section(
            "template-graphs",
            "Template: BFS, DFS, Topological Sort",
            F("""int[][] DIRS = {{-1,0},{1,0},{0,-1},{0,1}};

// BFS with level counting (shortest path, unweighted)
int bfs(int[][] grid, int[] start) {
    int rows = grid.length, cols = grid[0].length;
    boolean[][] seen = new boolean[rows][cols];
    Deque<int[]> queue = new ArrayDeque<>();
    queue.offer(start);
    seen[start[0]][start[1]] = true;        // mark on ENQUEUE
    int steps = 0;
    while (!queue.isEmpty()) {
        int size = queue.size();            // snapshot the level
        for (int i = 0; i < size; i++) {
            int[] cell = queue.poll();
            for (int[] d : DIRS) {
                int r = cell[0] + d[0], c = cell[1] + d[1];
                if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
                if (seen[r][c] || grid[r][c] == 1) continue;
                seen[r][c] = true;
                queue.offer(new int[] {r, c});
            }
        }
        steps++;
    }
    return steps;
}""", "BFS on a grid"),
            F("""// Kahn's topological sort. Returns empty if there is a cycle.
int[] topoSort(int n, List<List<Integer>> graph, int[] inDegree) {
    Deque<Integer> queue = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (inDegree[i] == 0) queue.offer(i);

    int[] order = new int[n];
    int index = 0;
    while (!queue.isEmpty()) {
        int node = queue.poll();
        order[index++] = node;
        for (int next : graph.get(node))
            if (--inDegree[next] == 0) queue.offer(next);
    }
    return index == n ? order : new int[0];   // fewer than n == cycle
}""", "Topological sort"),
            F("""// Dijkstra with a binary heap
int[] dijkstra(int n, List<int[]>[] graph, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    pq.offer(new int[] {src, 0});
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        if (top[1] > dist[top[0]]) continue;      // stale entry
        for (int[] e : graph[top[0]]) {
            int nd = top[1] + e[1];
            if (nd < dist[e[0]]) { dist[e[0]] = nd; pq.offer(new int[] {e[0], nd}); }
        }
    }
    return dist;
}""", "Dijkstra"),
            TB(
                ["Weights", "Algorithm", "Cost"],
                [
                    ["All equal", "BFS", "O(V + E)"],
                    ["Only 0 and 1", "0-1 BFS (deque)", "O(V + E)"],
                    ["Non-negative", "Dijkstra", "O((V+E) log V)"],
                    ["May be negative", "Bellman-Ford", "O(V * E)"],
                    ["All pairs, small V", "Floyd-Warshall", "O(V^3)"],
                    ["At most k edges", "Bellman-Ford, k+1 rounds", "O(k * E)"],
                ],
                "Shortest path: pick by the weights",
            ),
            T("Mark nodes visited when you **enqueue**, never when you dequeue. Marking on dequeue lets the same node enter the queue many times and turns O(V + E) into something much worse."),
        ),
        section(
            "template-backtracking",
            "Template: Backtracking",
            F("""void backtrack(int start, List<Integer> current, List<List<Integer>> out) {
    out.add(new ArrayList<>(current));          // copy! current is mutated
    for (int i = start; i < nums.length; i++) {
        if (i > start && nums[i] == nums[i - 1]) continue;  // skip dups (sort first)
        current.add(nums[i]);                   // choose
        backtrack(i + 1, current, out);         // explore  (i = reuse allowed)
        current.remove(current.size() - 1);     // unchoose
    }
}""", "Subsets / combinations"),
            F("""void permute(boolean[] used, List<Integer> current, List<List<Integer>> out) {
    if (current.size() == nums.length) { out.add(new ArrayList<>(current)); return; }
    for (int i = 0; i < nums.length; i++) {     // from 0, not from start
        if (used[i]) continue;
        used[i] = true;  current.add(nums[i]);
        permute(used, current, out);
        current.remove(current.size() - 1);  used[i] = false;
    }
}""", "Permutations"),
            TB(
                ["Shape", "Loop from", "Recurse with", "Example"],
                [
                    ["Subsets", "`start`", "`i + 1`", "All subsets, palindrome partition"],
                    ["Combinations, no reuse", "`start`", "`i + 1`", "Combination sum II"],
                    ["Combinations, with reuse", "`start`", "`i`", "Coin combinations"],
                    ["Permutations", "`0` with `used[]`", "n/a", "Orderings, N-Queens"],
                    ["Grid paths", "neighbours", "marked cell", "Word search"],
                ],
                "One character changes the meaning",
            ),
            T("If the question asks **how many** or **what is the best** rather than **list them all**, it is dynamic programming, not backtracking. Enumeration is exponential by definition."),
        ),
        section(
            "template-union-find",
            "Template: Union-Find",
            F("""class UnionFind {
    int[] parent, size;
    int components;

    UnionFind(int n) {
        parent = new int[n]; size = new int[n]; components = n;
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    }

    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;                              // path halving
    }

    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;            // already connected == cycle
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra; size[ra] += size[rb]; components--;
        return true;
    }
}""", "Disjoint set union"),
            B(
                [
                    "`union` returning **false** means the edge was redundant — that is cycle detection for free",
                    "Kruskal's MST: sort edges by weight, union each, stop after `n - 1` successes",
                    "Amortised near-constant with path compression **and** union by size. Formally inverse Ackermann",
                    "No deletion. For removal problems, process the edges offline in reverse and add instead",
                ],
                "Uses and limits",
            ),
        ),
        section(
            "template-monotonic-stack",
            "Template: Monotonic Stack and Heap",
            F("""// Next greater element. Stack holds INDICES, values decreasing.
int[] nextGreater(int[] a) {
    int[] res = new int[a.length];
    Arrays.fill(res, -1);
    Deque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < a.length; i++) {
        while (!stack.isEmpty() && a[stack.peek()] < a[i]) res[stack.pop()] = a[i];
        stack.push(i);
    }
    return res;
}
// Each index is pushed once and popped once -> O(n), despite the inner while.""", "Monotonic stack"),
            F("""// Top K largest -> MIN-heap of size k (evict the weakest)
PriorityQueue<Integer> heap = new PriorityQueue<>();
for (int x : nums) {
    heap.offer(x);
    if (heap.size() > k) heap.poll();
}

// Running median -> two heaps facing each other
PriorityQueue<Integer> low  = new PriorityQueue<>(Comparator.reverseOrder());
PriorityQueue<Integer> high = new PriorityQueue<>();
low.offer(x); high.offer(low.poll());
if (high.size() > low.size()) low.offer(high.poll());""", "Heap patterns"),
            T("For the **k largest** use a min-heap; for the **k smallest** use a max-heap. Getting this backwards is the most common top-k bug, and the reason is that you want the weakest of your current best on top so it is cheapest to evict."),
        ),
        section(
            "template-dp",
            "Template: Dynamic Programming",
            S(
                [
                    "**State** — finish the sentence \"dp of i is the ... of ...\". This is the whole problem",
                    "**Recurrence** — how does this state depend on smaller ones?",
                    "**Base cases** — the smallest states, answered directly",
                    "**Order** — every state computed after everything it depends on",
                    "**Space** — keep only the rows the recurrence still reads",
                ],
                "Five steps, in order",
            ),
            F("Time = number of states x work per state", "DP complexity"),
            F("""// 0/1 knapsack, one row. Capacity DESCENDING = each item used once.
for (int i = 0; i < items; i++)
    for (int c = capacity; c >= weight[i]; c--)
        dp[c] = Math.max(dp[c], dp[c - weight[i]] + value[i]);

// Unbounded knapsack: capacity ASCENDING = unlimited reuse.
for (int c = weight[i]; c <= capacity; c++)
    dp[c] = Math.max(dp[c], dp[c - weight[i]] + value[i]);""", "Knapsack: loop direction is the variant"),
            TB(
                ["Shape", "Recurrence", "Classic"],
                [
                    ["Fixed look-back", "`dp[i]` from `dp[i-1]`, `dp[i-2]`", "Stairs, house robber"],
                    ["Extend or restart", "`max(x[i], dp[i-1] + x[i])`", "Maximum subarray"],
                    ["Scan all previous", "`f(dp[j])` for `j < i`", "LIS, word break"],
                    ["Unbounded choice", "`f(dp[a - c])` over choices", "Coin change"],
                    ["Two sequences", "match -> diagonal; else neighbours", "LCS, edit distance"],
                    ["Interval", "split at k, iterate by length", "Burst balloons, matrix chain"],
                    ["Bitmask", "`dp[mask]`, n <= 20", "TSP, assignment"],
                ],
                "Recognise the shape",
            ),
            T("For extend-or-restart the answer is the **running maximum**, not `dp[n-1]`. That single mistake fails maximum-subarray more often than any other."),
        ),
        section(
            "edge-cases",
            "Edge Cases to Check Before You Say Done",
            TB(
                ["Input", "Always try"],
                [
                    ["Array", "empty, one element, two elements, all equal, sorted, reverse sorted"],
                    ["String", "empty, one char, all same char, mixed case, non-letter"],
                    ["Tree", "null root, single node, one-sided chain, complete"],
                    ["Linked list", "empty, one node, two nodes, cycle"],
                    ["Graph", "empty, disconnected, self-loop, single node"],
                    ["Numbers", "0, negative, `Integer.MAX_VALUE`, overflow in a sum"],
                ],
                "By input type",
            ),
            B(
                [
                    "Does a **sliding window** solution survive negative values?",
                    "Does an `int[26]` counter survive an uppercase letter?",
                    "Does the recursion survive a degenerate tree 100,000 deep?",
                    "Does the sum survive a million large values in an `int`?",
                    "Does the hash map key survive being mutated after insertion?",
                ],
                "Adversarial to your specific code",
            ),
            T("Trace one concrete example out loud with real variable values before declaring a solution done. Finding your own bug scores higher than quietly not having one, because it demonstrates a repeatable process."),
        ),
        section(
            "common-bugs",
            "Bug Checklist",
            TB(
                ["Bug", "Symptom", "Fix"],
                [
                    ["`(lo + hi) / 2`", "Wrong answer on huge indices", "`lo + (hi - lo) / 2`"],
                    ["`max = 0` initial", "Fails on all-negative input", "Initialise from `nums[0]`"],
                    ["`i <= length`", "Index out of bounds", "`i < length`"],
                    ["`a - b` comparator", "Overflow, TimSort exception", "`Integer.compare(a, b)`"],
                    ["`result += c` in a loop", "Silently O(n^2)", "`StringBuilder`"],
                    ["`list.contains` in a loop", "Silently O(n^2)", "Use a `Set`"],
                    ["Insert before check (two-sum)", "Element pairs with itself", "Check the map, then insert"],
                    ["Mark visited on dequeue", "Queue explodes", "Mark on enqueue"],
                    ["No `fast.next` null check", "NPE on even-length list", "`fast != null && fast.next != null`"],
                    ["Forgot to unmark in backtracking", "State leaks between branches", "Undo after the recursive call"],
                    ["Missing `prefixCounts.put(0, 1)`", "Drops subarrays starting at 0", "Seed the empty prefix"],
                    ["`==` on boxed `Integer`", "Intermittent wrong comparison", "`.equals` or unbox"],
                ],
                "Check these before running",
            ),
        ),
        section(
            "closing-checklist",
            "Before You Say You Are Done",
            S(
                [
                    "Guard clauses for null and empty are at the top",
                    "Traced one real example out loud, line by line",
                    "Checked two edge cases specific to this implementation",
                    "Stated time **and** space complexity, and named what `n` is",
                    "Named one thing you would change with more time",
                ],
                "Five-item close",
            ),
            T("Closing line that works: \"That is O(n) time and O(n) space. If the array were sorted I could drop to O(1) space with two pointers, and the part I am least happy with is X.\" Volunteering the weakness reads as senior; being caught by it does not."),
        ),
    ],
}


JAVA_SHEET = {
    "slug": "java",
    "title": "Java",
    "description": "Collections, equality, streams, concurrency, and the JVM facts backend loops actually ask about.",
    "minutes": 16,
    "order": 2,
    "sections": [
        section(
            "collections-map",
            "Collections: Which One",
            TB(
                ["Interface", "Default pick", "Alternatives", "Choose the alternative when"],
                [
                    ["`List`", "`ArrayList`", "`LinkedList`", "Almost never — see the note below"],
                    ["`Set`", "`HashSet`", "`LinkedHashSet`, `TreeSet`", "You need insertion order, or sorted order"],
                    ["`Map`", "`HashMap`", "`LinkedHashMap`, `TreeMap`", "You need order, LRU eviction, or range queries"],
                    ["`Queue`", "`ArrayDeque`", "`PriorityQueue`, `LinkedList`", "You need priority ordering"],
                    ["`Deque`", "`ArrayDeque`", "`LinkedList`", "Never in practice"],
                    ["Thread-safe map", "`ConcurrentHashMap`", "`Collections.synchronizedMap`", "Legacy code only"],
                ],
                "Interface first, then implementation",
            ),
            TB(
                ["Operation", "ArrayList", "LinkedList", "HashMap", "TreeMap", "ArrayDeque"],
                [
                    ["get by index", "O(1)", "O(n)", "n/a", "n/a", "n/a"],
                    ["get by key", "n/a", "n/a", "O(1) exp.", "O(log n)", "n/a"],
                    ["add at end", "O(1) amortised", "O(1)", "O(1) exp.", "O(log n)", "O(1)"],
                    ["add at front", "O(n)", "O(1)", "n/a", "n/a", "O(1)"],
                    ["remove middle", "O(n)", "O(1) given node", "O(1) exp.", "O(log n)", "n/a"],
                    ["contains", "O(n)", "O(n)", "O(1) exp.", "O(log n)", "O(n)"],
                ],
                "Costs",
            ),
            T("If asked `ArrayList` or `LinkedList`, the answer is `ArrayList` and the reason is **memory locality**, not asymptotics. `LinkedList` only wins when you already hold a reference to the node, which the `List` interface never gives you."),
        ),
        section(
            "equality-contract",
            "equals / hashCode",
            F("""@Override public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Point p)) return false;
    return x == p.x && y == p.y;
}

@Override public int hashCode() {
    return Objects.hash(x, y);
}""", "The contract, implemented"),
            B(
                [
                    "Equal objects **must** have equal hash codes. Violating this makes entries unfindable",
                    "Unequal objects **may** share a hash code — that is a collision, correct but slow",
                    "`hashCode` must stay constant while the object is a key in a map",
                    "**Never use a mutable object as a key** and then mutate it — the entry is stranded: not findable, not removable, still occupying space",
                    "Arrays do not override `equals`/`hashCode` — `map.get(new int[]{1,2})` after putting `new int[]{1,2}` returns null",
                ],
                "Rules",
            ),
            TB(
                ["Question", "Answer"],
                [
                    ["What happens on a collision?", "Chain in the bucket; treeify at 8 entries in a table of 64+"],
                    ["Why power-of-two capacity?", "Index is `hash & (length - 1)` — a mask, not a modulo"],
                    ["What is the load factor?", "0.75 — the space-versus-collision trade; resize doubles and rehashes"],
                    ["`hashCode` returns a constant?", "Everything in one bucket: O(n), or O(log n) once treeified"],
                    ["Is `HashMap` thread-safe?", "No. Use `ConcurrentHashMap`, which locks per bin"],
                ],
                "HashMap internals: the questions that get asked",
            ),
            T("`put` in five steps: spread the hash, mask to a bucket, compare hash then `equals`, insert or replace, resize if past the load factor. Then volunteer the mutable-key hazard — that is the part most candidates miss."),
        ),
        section(
            "strings",
            "Strings",
            TB(
                ["Type", "Mutable", "Thread-safe", "Use"],
                [
                    ["`String`", "No", "Inherently", "Values, map keys, returns"],
                    ["`StringBuilder`", "Yes", "No", "Building in one thread — the default"],
                    ["`StringBuffer`", "Yes", "Synchronised", "Legacy; effectively never"],
                ],
                "",
            ),
            F("""// O(n^2) - allocates and copies every iteration
String out = "";
for (char c : chars) out += c;

// O(n)
StringBuilder sb = new StringBuilder(expectedSize);
for (char c : chars) sb.append(c);
String out = sb.toString();

// substring COPIES since Java 7, so this is O(n^2):
for (int i = 0; i < s.length(); i++)
    if (s.substring(i).startsWith(p)) ...

// allocation-free alternative:
    if (s.startsWith(p, i)) ...""", "The quadratic traps"),
            B(
                [
                    "`sb.insert(0, c)` in a loop is O(n^2) — append and `reverse()` once instead",
                    "`sb.deleteCharAt(sb.length() - 1)` is O(1) — this is what makes backtracking on a shared builder cheap",
                    "Use `equals`, never `==`. Literals are interned so `==` sometimes appears to work, which makes the bug intermittent",
                    "`char` arithmetic: `c - 'a'` for an index, `(char)('a' + i)` back",
                    "Immutability buys safe sharing and a cacheable hash code, which is why `String` makes a good map key",
                ],
                "Rules",
            ),
        ),
        section(
            "comparators",
            "Comparable and Comparator",
            F("""// Natural order, one type, one ordering
class Task implements Comparable<Task> {
    public int compareTo(Task other) { return Integer.compare(priority, other.priority); }
}

// External order, many orderings
list.sort(Comparator.comparingInt(Task::priority));
list.sort(Comparator.comparing(Task::name).thenComparing(Task::due, Comparator.reverseOrder()));
list.sort(Comparator.comparingInt(Task::priority).reversed());""", "Both forms"),
            B(
                [
                    "**Never** `(a, b) -> a - b` — it overflows, and TimSort throws `Comparison method violates its general contract`",
                    "Use `Integer.compare`, `Long.compare`, `Double.compare`",
                    "The contract: antisymmetric, transitive, and consistent on ties. Breaking transitivity only fails on large inputs",
                    "Multi-key sorting by two passes needs a **stable** sort; one composed comparator is clearer and faster",
                ],
                "Rules",
            ),
        ),
        section(
            "streams",
            "Streams",
            F("""List<String> names = people.stream()
    .filter(p -> p.age() >= 18)
    .map(Person::name)
    .sorted()
    .toList();

Map<String, List<Person>> byCity = people.stream()
    .collect(Collectors.groupingBy(Person::city));

Map<String, Long> counts = words.stream()
    .collect(Collectors.groupingBy(w -> w, Collectors.counting()));

int total = orders.stream().mapToInt(Order::amount).sum();
Optional<Person> oldest = people.stream().max(Comparator.comparingInt(Person::age));""", "The ones you actually use"),
            TB(
                ["Concept", "Meaning"],
                [
                    ["Intermediate op", "`filter`, `map`, `sorted` — lazy, returns a stream"],
                    ["Terminal op", "`collect`, `forEach`, `sum`, `findFirst` — triggers evaluation"],
                    ["Short-circuiting", "`findFirst`, `anyMatch`, `limit` — may not read the whole source"],
                    ["`parallelStream`", "Only for CPU-bound work on large data with no shared state"],
                    ["Stateful lambda", "A bug — never mutate external state inside a stream"],
                ],
                "",
            ),
            T("If asked when **not** to use streams: hot loops where allocation matters, when you need an index, and when a plain loop is simply clearer. Reaching for streams everywhere is as much a smell as never using them."),
        ),
        section(
            "exceptions",
            "Exceptions",
            TB(
                ["Kind", "Extends", "Checked", "Use for"],
                [
                    ["`Exception`", "`Throwable`", "Yes", "Recoverable conditions the caller should handle"],
                    ["`RuntimeException`", "`Exception`", "No", "Programming errors: bad argument, illegal state"],
                    ["`Error`", "`Throwable`", "No", "Do not catch: `OutOfMemoryError`, `StackOverflowError`"],
                ],
                "",
            ),
            B(
                [
                    "`finally` always runs — including after a `return` in `try`, which can silently discard the return value",
                    "try-with-resources closes in **reverse** order of declaration and is the right way to handle closeable resources",
                    "Never swallow: `catch (Exception e) {}` loses the failure entirely",
                    "Never catch `Throwable` — it catches `Error` too",
                    "Wrap and rethrow with the cause: `throw new ServiceException(\"context\", e)`, or you lose the stack trace",
                ],
                "Rules",
            ),
        ),
        section(
            "concurrency",
            "Concurrency",
            TB(
                ["Tool", "Use for", "Note"],
                [
                    ["`synchronized`", "Simple mutual exclusion", "Reentrant; cannot time out or interrupt"],
                    ["`ReentrantLock`", "Mutual exclusion with control", "`tryLock`, timeouts, fairness; must unlock in `finally`"],
                    ["`ReadWriteLock`", "Many readers, few writers", "Writers starve under heavy read load"],
                    ["`volatile`", "Visibility of a single field", "**Not** atomicity — `count++` is still a race"],
                    ["`AtomicInteger`", "Lock-free counters", "CAS-based; `incrementAndGet` is atomic"],
                    ["`ConcurrentHashMap`", "Shared map", "Per-bin locking; use `compute`/`merge` for atomic updates"],
                    ["`ExecutorService`", "Running tasks", "Always shut it down; prefer it to raw threads"],
                    ["`CompletableFuture`", "Async composition", "`thenApply`, `thenCompose`, `allOf`"],
                    ["`CountDownLatch`", "Wait for N events", "One-shot; `CyclicBarrier` is reusable"],
                ],
                "",
            ),
            F("""// volatile gives visibility, NOT atomicity
private volatile boolean running = true;    // correct use: a flag

private volatile int count;
count++;                                     // WRONG: read-modify-write is a race

private final AtomicInteger count = new AtomicInteger();
count.incrementAndGet();                     // correct

// Atomic update in a shared map
map.merge(key, 1, Integer::sum);
map.compute(key, (k, v) -> v == null ? 1 : v + 1);""", "The volatile trap"),
            B(
                [
                    "**Race condition** — the result depends on timing. **Deadlock** — each thread holds what the other needs",
                    "Avoid deadlock by always acquiring locks in the same global order, or by using timeouts",
                    "`wait`/`notify` must be inside `synchronized`, and `wait` must be in a **while** loop (spurious wakeups)",
                    "Thread pool sizing: CPU-bound ~= cores; IO-bound can be much higher because threads are blocked, not working",
                    "Prefer immutability. A value that cannot change needs no synchronisation at all",
                ],
                "Rules",
            ),
        ),
        section(
            "jvm-gc",
            "JVM and Garbage Collection",
            TB(
                ["Area", "Holds", "Per"],
                [
                    ["Heap", "Objects, arrays", "JVM (shared)"],
                    ["Stack", "Frames, locals, references", "Thread"],
                    ["Metaspace", "Class metadata", "JVM (native memory)"],
                    ["PC register", "Current instruction", "Thread"],
                ],
                "Memory layout",
            ),
            B(
                [
                    "Generational hypothesis: most objects die young, so the heap is split into young and old generations",
                    "Minor GC collects the young generation and is cheap. Major/full GC touches the old generation and is not",
                    "`OutOfMemoryError: Java heap space` = a leak or an undersized heap. `StackOverflowError` = recursion too deep",
                    "The common leak in practice is a long-lived collection that is never pruned — a static cache with no eviction",
                    "G1 is the modern default; ZGC and Shenandoah target low pause times",
                ],
                "What to say",
            ),
            T("`finalize` is deprecated and was never a reliable cleanup mechanism. If asked about resource cleanup, the answer is try-with-resources and `AutoCloseable`, not finalizers."),
        ),
        section(
            "java-gotchas",
            "Gotchas That Cost Interviews",
            TB(
                ["Code", "What actually happens"],
                [
                    ["`==` on `Integer`", "Reference comparison outside the -128..127 cache"],
                    ["`list.remove(1)` on `List<Integer>`", "Removes **index** 1, not the value 1 — use `remove(Integer.valueOf(1))`"],
                    ["`Arrays.asList(arr).add(x)`", "Throws — fixed-size view"],
                    ["`long product = a * b;`", "Computed as `int` then widened — cast an operand: `(long) a * b`"],
                    ["`Math.abs(Integer.MIN_VALUE)`", "Returns `Integer.MIN_VALUE` — still negative"],
                    ["`-3 % 5`", "`-3`, not `2` — normalise with `((x % m) + m) % m`"],
                    ["`double` money arithmetic", "Rounding errors — use `BigDecimal` or integer minor units"],
                    ["Modifying a list while iterating", "`ConcurrentModificationException`"],
                    ["`switch` without `break`", "Falls through (classic form)"],
                    ["`String.split` trailing empties", "Dropped by default"],
                ],
                "",
            ),
        ),
        section(
            "modern-java",
            "Modern Java Worth Knowing",
            F("""record Point(int x, int y) {}          // equals, hashCode, toString generated

sealed interface Shape permits Circle, Square {}

String text = switch (day) {
    case SATURDAY, SUNDAY -> "weekend";
    default -> "weekday";
};

if (obj instanceof String s && s.length() > 3) { ... }   // pattern matching

var list = new ArrayList<String>();     // local inference only
String json = \"\"\"
    { "key": "value" }
    \"\"\";                                // text block""", "Since Java 17"),
            B(
                [
                    "`record` is the right answer for a value-carrying key or a small DTO — it generates the equality contract for you",
                    "`Optional` is a **return type**, not a field type and not a parameter type",
                    "`var` is inference, not dynamic typing, and only works for local variables",
                    "Virtual threads (Java 21) make blocking IO cheap; they do not help CPU-bound work",
                ],
                "Rules",
            ),
        ),
    ],
}


SYSTEM_DESIGN_SHEET = {
    "slug": "system-design",
    "title": "System Design",
    "description": "The 45-minute framework, numbers to memorise, component decision tables, and failure-mode checklists.",
    "minutes": 18,
    "order": 3,
    "sections": [
        section(
            "framework",
            "The 45-Minute Framework",
            S(
                [
                    "**ASK** (5-8 min) — scope, functional and non-functional requirements, what is out of scope",
                    "**SIZE** (3-5 min) — peak QPS, storage/year, bandwidth, read:write ratio",
                    "**SHAPE** (10-12 min) — 2-3 concrete APIs, data model, simplest architecture that works",
                    "**STRESS** (12-15 min) — deep dive on the 1-2 hard parts, bottlenecks, failure modes",
                    "**SELL** (3-5 min) — trade-offs, 30-second recap, volunteer the weakest part",
                ],
                "ASK -> SIZE -> SHAPE -> STRESS -> SELL",
            ),
            TB(
                ["Step", "What the interviewer is scoring"],
                [
                    ["ASK", "Do you design for the real problem, or the first one you imagined?"],
                    ["SIZE", "Can you turn a product into numbers that justify architecture?"],
                    ["SHAPE", "Can you produce a working system end to end at all?"],
                    ["STRESS", "Do you know where real systems break? This is the senior signal"],
                    ["SELL", "Can you defend a decision instead of reciting one?"],
                ],
                "",
            ),
            T("Every box you draw should trace back to a requirement or a number you said out loud. If you cannot justify a component, do not draw it."),
        ),
        section(
            "clarifying-questions",
            "Questions to Ask in the First Five Minutes",
            B(
                [
                    "Which slice of the product are we building, and what is out of scope?",
                    "How many daily active users, and how many of the core action each?",
                    "Read-heavy, write-heavy, or balanced? Roughly what ratio?",
                    "What latency do we need on the hot path, and at which percentile?",
                    "What availability, and does it differ by endpoint?",
                    "Can any of this be stale? For how long?",
                    "Is anything irreplaceable — must we never lose it?",
                    "Single region or global? Any data residency rules?",
                ],
                "Pick five to eight, not all of them",
            ),
            T("Propose rather than interrogate: \"I'll assume consumer-facing, global, 100:1 read-heavy, optimising for feed latency, with moderation out of scope. Does that match?\" One sentence, four decisions, correctable in five seconds."),
        ),
        section(
            "numbers",
            "Numbers to Memorise",
            TB(
                ["Anchor", "Value"],
                [
                    ["One day", "~100,000 seconds (86,400, rounded)"],
                    ["One year", "~30,000,000 seconds"],
                    ["1M requests/day", "~10 QPS"],
                    ["100M requests/day", "~1,000 QPS"],
                    ["1B requests/day", "~10,000 QPS"],
                    ["Peak", "~3x average (10-100x for scheduled events)"],
                    ["1M x 1 KB", "~1 GB"],
                    ["1M x 1 MB", "~1 TB"],
                    ["1B x 1 KB", "~1 TB"],
                    ["Replication", "x3"],
                    ["1 Gbps", "~125 MB/s"],
                ],
                "Traffic and storage",
            ),
            TB(
                ["Operation", "Latency", "Relative"],
                [
                    ["L1 cache reference", "~1 ns", "Instant"],
                    ["Main memory read", "~100 ns", "Very fast"],
                    ["SSD random read", "~100 us", "~1,000x slower than RAM"],
                    ["Same-datacentre round trip", "~0.5 ms", "Fast enough"],
                    ["Redis GET over the network", "~1 ms", "Fast"],
                    ["Rotational disk seek", "~10 ms", "Slow"],
                    ["Cross-continent round trip", "~80-150 ms", "~200x a local hop"],
                ],
                "Latency",
            ),
            TB(
                ["Component", "Comfortable on one node"],
                [
                    ["Stateless app server", "1,000-10,000 QPS"],
                    ["Postgres/MySQL indexed reads", "5,000-20,000 QPS"],
                    ["Postgres/MySQL writes", "1,000-10,000/s before tuning is a project"],
                    ["Redis", "100,000+ ops/s"],
                    ["Kafka broker", "Hundreds of MB/s sequential"],
                    ["WebSocket connections per node", "100k-500k, ~tens of KB each"],
                ],
                "What one machine does — this is what makes an estimate mean something",
            ),
            TB(
                ["Availability", "Downtime/year", "Downtime/month"],
                [
                    ["99%", "3.65 days", "7.3 hours"],
                    ["99.9%", "8.8 hours", "43 minutes"],
                    ["99.95%", "4.4 hours", "22 minutes"],
                    ["99.99%", "52 minutes", "4.4 minutes"],
                    ["99.999%", "5.3 minutes", "26 seconds"],
                ],
                "The nines",
            ),
        ),
        section(
            "estimation",
            "Estimation Formulas",
            F("Average QPS  = requests per day / 100,000\nPeak QPS     = average x 3\nStorage/year = writes/day x bytes x 365 x replication x 1.3 (indexes)\nBandwidth    = QPS x average payload size\nOrigin load  = requests x (1 - cache hit rate)\nPath avail.  = product of every synchronous dependency's availability", "Copy these"),
            E("100M MAU -> 20% DAU        = 20M daily\n20M x 10 feed loads/day    = 200M reads/day\n200M / 100,000             = 2,000 QPS average\nx3                         = 6,000 QPS peak\n-> more than one database should serve, so cache the read path", "Worked example"),
            T("Say the conclusion, not just the number: \"that's ~6,000 peak QPS, which is more than one database should serve, so I'll cache the read path.\" The number alone scores nothing."),
        ),
        section(
            "component-picker",
            "Component Picker",
            TB(
                ["Add this", "Only when", "It costs you"],
                [
                    ["CDN", "Bytes are large or users are distant", "Invalidation, staleness"],
                    ["Cache", "The same reads repeat and the DB is the bottleneck", "Staleness, invalidation, a new failure mode"],
                    ["Read replica", "Reads exceed one primary and lag is acceptable", "Read-your-writes anomalies"],
                    ["Queue", "Work is slow, bursty, or must survive a restart", "Eventual results, duplicate handling"],
                    ["Log (Kafka)", "Multiple consumers, or you need replay", "Operational weight, partition management"],
                    ["Search index", "Query shapes the primary store cannot serve", "Sync pipeline, a second source of truth"],
                    ["Shards", "Writes or data exceed one machine", "No cross-shard joins or transactions"],
                    ["Object storage", "You are storing blobs", "Metadata/object reconciliation"],
                    ["Second region", "Latency for distant users, or region-loss survival", "~2x cost, a consistency decision"],
                ],
                "Nothing goes on the diagram without a reason",
            ),
            T("Say the simple design first: \"one service and one Postgres handles this comfortably at these numbers — I'll add components as the estimates force them.\" It buys credibility for everything that follows."),
        ),
        section(
            "storage-picker",
            "Storage Picker",
            TB(
                ["Access pattern", "Store", "Why"],
                [
                    ["Relational, transactional, ad-hoc queries", "Postgres / MySQL", "ACID, joins, constraints"],
                    ["Always by key, huge volume", "DynamoDB / Redis", "Predictable O(1) by key"],
                    ["Append-heavy, read by (key, time range)", "Cassandra / Bigtable", "LSM writes, horizontal by design"],
                    ["Whole-object reads, fluid schema", "MongoDB / documents", "No migration to add a field"],
                    ["Text relevance, faceting", "Elasticsearch", "Inverted index — never the source of truth"],
                    ["Metrics, time series", "Prometheus / Timescale", "Compression, downsampling"],
                    ["Blobs", "S3 / GCS", "Cheap, durable, CDN-frontable"],
                    ["Aggregations over billions of rows", "Snowflake / ClickHouse", "Columnar, fed asynchronously"],
                ],
                "Derive from the queries, not the logo",
            ),
            TB(
                ["Dimension", "SQL", "Distributed NoSQL"],
                [
                    ["Multi-record atomicity", "Native", "Limited or expensive"],
                    ["Query flexibility", "Ad-hoc, joins", "Only the patterns you modelled"],
                    ["Write scale", "High, then sharding is a project", "Horizontal by design"],
                    ["Constraints", "Enforced by the database", "Enforced by your code, if at all"],
                    ["Cost of a wrong choice", "A sharding project", "A re-model and backfill"],
                ],
                "SQL vs NoSQL",
            ),
            T("Answer in four clauses: requirement, choice, trade-off, trigger. \"We need multi-row atomicity and volume is modest, so Postgres; the cost is that horizontal write scale is a future project; I'd revisit above ~20,000 writes/s.\""),
        ),
        section(
            "caching",
            "Caching",
            TB(
                ["Pattern", "Write cost", "Read after write", "Data loss risk", "Use for"],
                [
                    ["Cache-aside", "Low", "Miss, then fill", "None", "General default"],
                    ["Read-through", "Low", "Miss, then fill", "None", "Library-managed fetch"],
                    ["Write-through", "Higher", "Hit", "None", "Read-heavy right after write"],
                    ["Write-behind", "Lowest", "Hit", "**Real**", "Counters, metrics, tolerant data"],
                    ["Refresh-ahead", "Background", "Hit", "None", "Small, predictable hot set"],
                ],
                "",
            ),
            B(
                [
                    "Write the database **first**, then **delete** the key — never update it (a concurrent read can re-cache the old value forever)",
                    "Always keep a TTL as a backstop, even when you also invalidate explicitly",
                    "**Stampede** — jitter the TTL, single-flight the refill, or serve stale while revalidating",
                    "**Hot key** — sharding the cache does not help; put a 1-5 second in-process cache in front",
                    "**Cold start** — the most dangerous state. Never size the database assuming the cache is there",
                    "**Penetration** — cache negative results briefly, or use a Bloom filter",
                ],
                "The five things that go wrong",
            ),
            E("Origin load = requests x (1 - hit rate)\n\n10,000 QPS at 95% hit rate -> 500 QPS on the database\n10,000 QPS at 50% hit rate -> 5,000 QPS: barely worth the component", "Is the cache worth it?"),
            T("When you draw a cache, immediately say five things: what is cached, the key, the TTL, how it is invalidated, and what happens when it is down. Fifteen seconds, and it pre-empts the whole follow-up sequence."),
        ),
        section(
            "consistency",
            "Consistency and CAP",
            TB(
                ["Model", "Guarantee", "Cost"],
                [
                    ["Linearizable", "Every read sees the latest completed write", "Coordination per op; unavailable under partition"],
                    ["Sequential", "Same order everywhere, not real-time", "Cheaper, still ordered"],
                    ["Causal", "Related operations seen in order", "Requires dependency tracking"],
                    ["Read-your-writes", "You see your own writes", "Cheap: session routing or version tracking"],
                    ["Monotonic reads", "Time never goes backwards", "Cheap: session affinity"],
                    ["Eventual", "Replicas converge", "Cheapest, most available"],
                ],
                "Pick the weakest model that works, per operation",
            ),
            B(
                [
                    "**CAP** applies only during a partition: choose consistency or availability. `CA` describes a single node, not a distributed system",
                    "**PACELC** adds the part that applies 99.9% of the time: even without a partition, consistency costs latency",
                    "**Quorum**: with N replicas, `W + R > N` guarantees overlap. N=3, W=2, R=2 is the usual balance",
                    "Make the choice **per operation**. A like count can be eventual; a payment cannot",
                    "Read-your-writes is the practical floor for anything a user edits",
                ],
                "",
            ),
            TB(
                ["Anomaly", "What the user sees", "Fix"],
                [
                    ["Stale read", "Old data", "TTL, or read from primary"],
                    ["Read-your-writes violation", "\"My edit didn't save\"", "Route to primary for N seconds, or track the write position"],
                    ["Monotonic read violation", "Data goes backwards on refresh", "Pin the session to one replica"],
                    ["Lost update", "One of two edits vanishes", "Optimistic version check, or an atomic operation"],
                    ["Write skew", "Invariant broken by two valid transactions", "Serializable isolation, or a constraint"],
                ],
                "",
            ),
        ),
        section(
            "distributed-rules",
            "Distributed Systems Rules",
            B(
                [
                    "A timeout cannot distinguish lost request, lost response, or slow work — so every write needs an **idempotency key**",
                    "Delivery is **at-least-once**. Exactly-once effects come from idempotent consumers, never from the broker",
                    "Retries need backoff, **jitter**, a budget (cap at ~10% of requests), and to happen at **one** layer only",
                    "Never order events by wall-clock time across machines. Use logical clocks or a single ordering point per entity",
                    "Availability multiplies along a synchronous path — four 99.9% dependencies give ~99.6%",
                    "Grey failures (up but wrong or slow) cause longer incidents than clean crashes",
                    "Use a **transactional outbox**: never write to the database and publish separately",
                    "A TTL-based distributed lock is not safe without fencing tokens the resource actually checks",
                ],
                "",
            ),
            TB(
                ["Dependency behaviour", "Response"],
                [
                    ["Slow", "Timeout from the p99, bulkhead, circuit breaker"],
                    ["Failing", "Circuit breaker opens, fall back or degrade"],
                    ["Overloaded", "Shed load by priority; bounded queues, never unbounded"],
                    ["Ambiguous outcome", "Record it as unknown and reconcile — never guess"],
                ],
                "Resilience",
            ),
        ),
        section(
            "scaling-ladder",
            "Scaling Ladder",
            S(
                [
                    "**Measure** — find the one limiting resource",
                    "**Scale up** — a bigger machine; free engineering time",
                    "**Scale out** the stateless tier — needs statelessness first",
                    "**Cache** — often 10-20x read capacity",
                    "**Read replicas** — read capacity, costs staleness",
                    "**Go async** — move slow work off the request path",
                    "**Shard** — expensive and hard to reverse; only for write/storage limits",
                    "**Multi-region** — latency or region-loss survival; doubles complexity",
                ],
                "In this order — never skip a step without saying why",
            ),
            TB(
                ["Symptom", "Likely bottleneck"],
                [
                    ["App CPU saturated", "Application compute — scale out"],
                    ["DB CPU high, queries simple", "Read volume — cache, then replicas"],
                    ["DB write latency rising, IO saturated", "Write throughput — batch, buffer, then shard"],
                    ["Connection pool exhausted", "A slow dependency, not capacity"],
                    ["Network egress saturated", "Payload size, missing CDN"],
                    ["One shard far hotter", "Skew, not capacity"],
                    ["**Latency high, everything idle**", "A serialisation point — a lock or a single coordinator"],
                ],
                "Find the bottleneck first",
            ),
            T("The last row is the one people miss. If nothing is busy and everything is slow, adding capacity will do nothing — you have a lock, a single counter row, or a synchronous dependency in the path."),
        ),
        section(
            "tradeoffs",
            "Trade-offs to State Out Loud",
            TB(
                ["Choice", "You gain", "You pay"],
                [
                    ["Cache", "Latency, database load", "Staleness, invalidation, a failure mode"],
                    ["Async / queue", "Throughput, spike absorption, isolation", "Eventual results, duplicates, ops"],
                    ["Denormalise", "Read speed", "Write amplification, update anomalies"],
                    ["Strong consistency", "Simple reasoning", "Latency always; availability under partition"],
                    ["Horizontal scale", "Headroom, fault isolation", "Coordination, partial failure"],
                    ["Sharding", "Write and storage capacity", "No cross-shard joins or transactions"],
                    ["Microservices", "Independent deploys", "Operational multiplication, distributed debugging"],
                    ["Multi-region", "Latency, region-loss survival", "~2x cost, conflict resolution"],
                    ["More components", "Fit to purpose", "More failure modes, more to operate"],
                ],
                "None of these has a universally correct side",
            ),
            T("Useful phrase: \"I chose X because the primary requirement is Y. The trade-off is Z, and I'd revisit it if W changed.\" Four clauses, and it turns a choice into an argument."),
        ),
        section(
            "followups",
            "Follow-ups to Rehearse",
            B(
                [
                    "\"Traffic is 10x — what breaks first?\" Name one component, the number it breaks at, and the next move",
                    "\"What if the cache goes down?\" Fail open to the DB, but bound concurrency or you convert it into a total outage",
                    "\"How do you avoid processing this twice?\" Idempotency key, unique constraint, effect and record in one transaction",
                    "\"How do you handle a hot key or hot shard?\" Cache, then salt, then isolate; sharding alone does not help",
                    "\"What happens in a regional outage?\" RTO, RPO, what users see, and how failback works",
                    "\"Why Kafka not a queue?\" Replay, multiple consumer groups, per-key ordering — not \"it scales\"",
                    "\"What would you change for <50ms?\" Name the physics first, then edge caching and regional replicas",
                    "\"How would you reduce cost?\" Egress and storage usually dominate; tiering, offload, retention",
                ],
                "",
            ),
            T("End on your own terms: recap the architecture in one sentence, name two decisions with their trade-offs, and volunteer the weakest part of the design before the interviewer finds it."),
        ),
    ],
}


LLD_SHEET = {
    "slug": "lld-ood",
    "title": "LLD / OOD",
    "description": "SOLID, pattern selection, class-design method, and the prompts LLD rounds actually use.",
    "minutes": 14,
    "order": 4,
    "sections": [
        section(
            "lld-method",
            "How to Run an LLD Round",
            S(
                [
                    "**Clarify scope** — which flows, what is out of scope, single machine or distributed?",
                    "**List the actors and use cases** — who does what to what",
                    "**Name the nouns** — these become your classes; name the verbs — these become methods",
                    "**Define the core interfaces** before any implementation",
                    "**Draw the class relationships** — who owns what, who depends on what",
                    "**Walk one flow end to end** out loud, method by method",
                    "**Handle concurrency and edge cases**, then discuss extensibility",
                ],
                "Seven steps",
            ),
            B(
                [
                    "Start with the **interface**, not the class. It forces you to name the contract",
                    "Prefer **composition** over inheritance — say it, and mean it",
                    "Keep entities dumb and behaviour in services when the behaviour spans entities",
                    "Every class should have one reason to change; if you cannot name it, the class is doing too much",
                    "Say what you are **not** building, so scope stays fixed",
                ],
                "Principles that survive contact with the clock",
            ),
            T("Interviewers score the class boundaries and the extensibility discussion far more than the syntax. Spend your time naming responsibilities, not writing getters."),
        ),
        section(
            "solid",
            "SOLID",
            TB(
                ["Principle", "In one line", "Smell when violated"],
                [
                    ["**S**ingle responsibility", "One reason to change", "A class named `...Manager` doing five things"],
                    ["**O**pen/closed", "Extend without modifying", "A growing `switch` on a type field"],
                    ["**L**iskov substitution", "A subtype must honour the supertype's contract", "`Square extends Rectangle`; overrides that throw"],
                    ["**I**nterface segregation", "Many small interfaces beat one fat one", "Implementations full of `UnsupportedOperationException`"],
                    ["**D**ependency inversion", "Depend on abstractions, not concretions", "`new ConcreteThing()` inside business logic"],
                ],
                "",
            ),
            T("The highest-value one to demonstrate is open/closed: when the interviewer adds a requirement, a design where you add a class beats one where you edit a switch statement. Say that out loud when it happens."),
        ),
        section(
            "composition",
            "Composition, Inheritance, Interfaces",
            TB(
                ["", "Interface", "Abstract class", "Composition"],
                [
                    ["Expresses", "Can-do capability", "Is-a with shared code", "Has-a"],
                    ["Multiple", "Yes", "No (single inheritance)", "Yes"],
                    ["Shared state", "No", "Yes", "Yes, via the component"],
                    ["Changeable at runtime", "No", "No", "**Yes**"],
                    ["Default choice", "For contracts", "For shared skeleton code", "For behaviour"],
                ],
                "",
            ),
            F("""// Inheritance: behaviour is fixed at compile time
class CreditCardPayment extends Payment { ... }

// Composition: behaviour is injected and swappable
class Checkout {
    private final PaymentStrategy payment;      // interface
    Checkout(PaymentStrategy payment) { this.payment = payment; }
}""", "The difference that matters"),
            B(
                [
                    "Inheritance couples you to the parent's implementation forever — that is why it is the fallback, not the default",
                    "Use an abstract class only when subclasses genuinely share a skeleton and state",
                    "Program to the interface: `List<String> x = new ArrayList<>()`",
                    "Dependency injection is just composition with the wiring moved to the caller — it is what makes a class testable",
                ],
                "",
            ),
        ),
        section(
            "pattern-picker",
            "Pattern Picker",
            TB(
                ["If the requirement is...", "Pattern", "Core idea"],
                [
                    ["Swap an algorithm at runtime", "**Strategy**", "Inject an interface; each implementation is one algorithm"],
                    ["Create objects without naming the class", "**Factory**", "A method or class decides which concrete type to build"],
                    ["Notify many objects when something changes", "**Observer**", "Subject holds subscribers, calls them on change"],
                    ["Construct an object with many optional fields", "**Builder**", "Fluent setters, `build()` validates and returns immutable"],
                    ["Make an incompatible interface fit", "**Adapter**", "Wrap and translate"],
                    ["Add behaviour without subclassing", "**Decorator**", "Wrap the same interface, delegate plus extra"],
                    ["Exactly one instance", "**Singleton**", "Prefer DI with a single registered instance"],
                    ["An algorithm with pluggable steps", "**Template method**", "Base defines the order, subclasses fill steps"],
                    ["Undo, queued operations, history", "**Command**", "Wrap a request as an object with `execute`/`undo`"],
                    ["Traverse without exposing internals", "**Iterator**", "`hasNext` / `next`"],
                    ["Behaviour depends on internal state", "**State**", "State objects handle transitions themselves"],
                    ["Route a request through handlers", "**Chain of responsibility**", "Each handler handles or passes on"],
                ],
                "",
            ),
            T("Name the pattern only after describing the requirement. \"Payment methods vary and we may add more, so I'll inject a `PaymentStrategy`\" is far stronger than \"I'll use the Strategy pattern.\""),
        ),
        section(
            "pattern-code",
            "Patterns in Ten Lines",
            F("""// Strategy
interface PricingStrategy { BigDecimal price(Order o); }
class Checkout {
    private final PricingStrategy pricing;
    Checkout(PricingStrategy pricing) { this.pricing = pricing; }
}

// Factory
static Notifier create(Channel c) {
    return switch (c) {
        case EMAIL -> new EmailNotifier();
        case SMS   -> new SmsNotifier();
    };
}""", "Strategy and Factory"),
            F("""// Observer
interface Listener { void onEvent(Event e); }
class Subject {
    private final List<Listener> listeners = new CopyOnWriteArrayList<>();
    void subscribe(Listener l) { listeners.add(l); }
    void publish(Event e) { for (Listener l : listeners) l.onEvent(e); }
}

// Builder
Pizza p = new Pizza.Builder().size(12).topping("olive").build();""", "Observer and Builder"),
            F("""// Singleton, the only version worth writing
enum Config {
    INSTANCE;
    private final Map<String, String> values = new ConcurrentHashMap<>();
}

// Decorator
class TimingRepository implements Repository {
    private final Repository delegate;
    public User find(long id) {
        long start = System.nanoTime();
        try { return delegate.find(id); }
        finally { record(System.nanoTime() - start); }
    }
}""", "Singleton and Decorator"),
            T("On Singleton, say what is wrong with it: global mutable state, hard to test, and a hidden dependency. Then say you would register one instance with the container instead. Naming its downsides is the expected answer."),
        ),
        section(
            "concurrency-in-lld",
            "Concurrency in Class Design",
            B(
                [
                    "Ask early: \"is this single-threaded or do I need to handle concurrent access?\" It changes the design",
                    "Prefer immutability — an immutable object needs no synchronisation at all",
                    "Guard the smallest possible critical section; never hold a lock across an IO call",
                    "For counters and maps, reach for `AtomicInteger` and `ConcurrentHashMap.merge` before `synchronized`",
                    "For \"only one of these at a time\", a conditional update on a single row beats a distributed lock",
                    "Always acquire multiple locks in a fixed global order, or you have designed a deadlock",
                ],
                "",
            ),
            T("In parking-lot, booking, or inventory designs, the interviewer is usually waiting for \"two users try to take the last one at the same time.\" Have the answer ready: a conditional update or an atomic compare-and-set, not a read-then-write."),
        ),
        section(
            "common-prompts",
            "Common LLD Prompts and Their Core Classes",
            TB(
                ["Prompt", "Core classes", "The hard part"],
                [
                    ["Parking lot", "`ParkingLot`, `Level`, `Spot`, `Ticket`, `Vehicle`, `PricingStrategy`", "Spot allocation, concurrent claims"],
                    ["Elevator system", "`Building`, `Elevator`, `Request`, `SchedulingStrategy`", "Scheduling policy, direction state machine"],
                    ["Library / booking", "`Catalog`, `Item`, `Member`, `Loan`, `Reservation`", "Availability, holds with expiry"],
                    ["Vending machine", "`Machine`, `State`, `Inventory`, `Coin`", "State machine transitions"],
                    ["Chess / tic-tac-toe", "`Board`, `Piece`, `Move`, `Rule`, `Player`", "Move validation, win detection"],
                    ["Rate limiter", "`Limiter`, `Bucket`, `Clock`", "Clock injection for testability"],
                    ["Splitwise", "`User`, `Group`, `Expense`, `SplitStrategy`, `Ledger`", "Split strategies, settlement"],
                    ["Logger", "`Logger`, `Appender`, `Formatter`, `Level`", "Async appending, backpressure"],
                    ["Cache with eviction", "`Cache`, `EvictionPolicy`, `Entry`", "LRU via map plus doubly linked list"],
                    ["Ride matching", "`Rider`, `Driver`, `Trip`, `MatchingStrategy`", "Trip state machine, no double-booking"],
                ],
                "",
            ),
            B(
                [
                    "Inject the clock (`Clock` or a `Supplier<Instant>`) — hard-coded `System.currentTimeMillis()` is untestable",
                    "Make the varying rule a strategy: pricing, splitting, scheduling, eviction",
                    "Model lifecycle as an explicit **state machine** with validated transitions, not booleans",
                    "Return immutable value objects; keep mutable state inside the owning aggregate",
                ],
                "Moves that work on almost every prompt",
            ),
        ),
        section(
            "lld-smells",
            "What Loses Points",
            TB(
                ["Smell", "Do instead"],
                [
                    ["God class doing everything", "Split by responsibility; name each one's reason to change"],
                    ["Growing `switch` on a type", "Polymorphism or a strategy map"],
                    ["`new` inside business logic", "Inject the dependency"],
                    ["Booleans for lifecycle (`isPaid`, `isShipped`)", "One `status` enum with validated transitions"],
                    ["Getters and setters on everything", "Behaviour on the object that owns the data"],
                    ["Deep inheritance chains", "Composition"],
                    ["Static mutable state", "Instance state, injected"],
                    ["Ignoring concurrency when asked", "Say the contention point and how you guard it"],
                ],
                "",
            ),
            T("When the interviewer adds a requirement late, that is the test. If your answer is \"I add a new class implementing this interface,\" the design passed. If it is \"I add a case to the switch and a field to the class,\" it did not."),
        ),
    ],
}


BEHAVIORAL_SHEET = {
    "slug": "behavioral",
    "title": "Behavioral",
    "description": "STAR structure, a story bank that covers every question, signal mapping, and the answers that fail.",
    "minutes": 14,
    "order": 5,
    "sections": [
        section(
            "star",
            "STAR, Weighted Properly",
            S(
                [
                    "**Situation** (15%) — context in two sentences. Team, product, constraint, why it mattered",
                    "**Task** (10%) — what *you* specifically owned",
                    "**Action** (60%) — what *you* did, the decisions you made, and why. This is the answer",
                    "**Result** (15%) — the outcome with a number, plus what you learned",
                ],
                "Target: 2-3 minutes total",
            ),
            TB(
                ["Symptom", "Fix"],
                [
                    ["Five minutes of background", "Cut Situation to two sentences"],
                    ["\"We decided...\" throughout", "Say **I**. The interviewer is scoring you, not your team"],
                    ["No numbers anywhere", "Add one: latency, cost, headcount, time saved, incidents avoided"],
                    ["Story ends at \"and it worked\"", "Add what you learned and what you would do differently"],
                    ["Same story for every question", "Build a bank of 6-8 and map them deliberately"],
                ],
                "Common failures",
            ),
            T("Time yourself once. Most people run five to seven minutes and think they ran two. An over-long first answer eats the two follow-ups where the real signal is."),
        ),
        section(
            "story-bank",
            "Build a Story Bank",
            TB(
                ["Story", "Primarily answers", "Also covers"],
                [
                    ["Hardest technical problem", "Technical depth, problem solving", "Ambiguity, learning"],
                    ["Shipped under a hard deadline", "Delivery, prioritisation", "Trade-offs, pressure"],
                    ["Disagreed with someone senior", "Conflict, backbone", "Influence, data-driven argument"],
                    ["Something you broke or got wrong", "Failure, ownership", "Learning, blameless response"],
                    ["Led without authority", "Leadership, influence", "Mentoring, collaboration"],
                    ["Improved something nobody asked you to", "Ownership, bias for action", "Initiative, impact"],
                    ["Changed direction on new information", "Judgement, humility", "Data-driven decisions, customer focus"],
                    ["Mentored or unblocked someone", "Mentorship, teamwork", "Communication, growth"],
                ],
                "Eight stories cover essentially every question",
            ),
            B(
                [
                    "Write each one once, in STAR, with a number in the Result",
                    "Tag each story with the two or three signals it demonstrates",
                    "Practise each at **two lengths**: 90 seconds and 3 minutes",
                    "Know the **technical detail** behind each one — the follow-up is always \"how exactly did you do that?\"",
                    "Pick stories from the last 2-3 years where you were the main actor",
                ],
                "Preparation checklist",
            ),
            T("When a question does not match a prepared story, take the closest one and reframe the opening sentence to the question asked. That is far better than improvising a weak new story."),
        ),
        section(
            "question-map",
            "Question to Signal Map",
            TB(
                ["Question", "What they are really scoring", "Lead with"],
                [
                    ["Tell me about yourself", "Communication, relevance", "Now, then how you got here, then why this role — 90 seconds"],
                    ["Hardest problem you have solved", "Technical depth", "The constraint that made it hard, not the domain"],
                    ["Tell me about a failure", "Ownership, honesty", "A real failure you caused, and what changed afterwards"],
                    ["Disagreement with a colleague", "Conflict handling, influence", "The disagreement, the data, and the resolution"],
                    ["Difficult teammate", "Maturity, empathy", "What you tried, not what they did wrong"],
                    ["Ambiguous requirements", "Judgement, initiative", "How you narrowed scope and who you asked"],
                    ["Tight deadline", "Prioritisation", "What you cut and why — never \"I worked weekends\""],
                    ["Convinced others of an unpopular idea", "Influence", "The evidence you gathered and how you framed it"],
                    ["Mentored someone", "Leadership", "What they could not do before and can do now"],
                    ["Feedback you received", "Coachability", "Real critical feedback and the behaviour change"],
                    ["Why this company / role", "Motivation", "Something specific and true about the product or team"],
                    ["Questions for us?", "Engagement", "Always have three — see below"],
                ],
                "",
            ),
        ),
        section(
            "tell-me-about-yourself",
            "Tell Me About Yourself",
            F("""[Now]      "I'm a backend engineer at X, where I own <system> handling <scale>."
[Path]     "I got there through <one or two prior roles>, focusing on <theme>."
[Proof]    "The thing I'm proudest of is <one concrete result with a number>."
[Why here] "I'm looking at <company> because <specific, true reason>."

Target: 90 seconds. Four sentences. Practise it until it is boring to you.""", "The structure"),
            B(
                [
                    "It is a positioning statement, not a biography — no childhood, no chronology from university",
                    "Aim it at the role you are interviewing for; the emphasis changes between a platform role and a product role",
                    "End on why *this* company, which invites the natural next question",
                    "Never say \"as you can see on my resume\"",
                ],
                "",
            ),
            T("This is the only answer worth memorising word for word. It is asked almost every time, it sets the tone, and being fluent here buys goodwill for the harder questions."),
        ),
        section(
            "difficult-questions",
            "The Ones That Trip People",
            TB(
                ["Question", "Weak answer", "Strong answer"],
                [
                    ["Tell me about a failure", "A disguised success, or blaming the team", "A real failure you caused, the impact, what you changed in your process"],
                    ["Your biggest weakness", "\"I work too hard\"", "A real one, plus the specific thing you do to manage it"],
                    ["Conflict with a manager", "\"I just did what they said\"", "You disagreed with data, escalated appropriately, committed once decided"],
                    ["Why are you leaving?", "Criticising your current employer", "What you want next that you cannot get where you are"],
                    ["Something you would do differently", "\"Nothing\"", "A specific decision and the better alternative you now see"],
                    ["Working with someone underperforming", "\"I reported them\"", "You talked to them first, then escalated with specifics"],
                ],
                "",
            ),
            B(
                [
                    "**Disagree and commit** is the phrase for the manager question: argue with evidence, then support the decision fully",
                    "Never criticise a named individual or a previous employer",
                    "Own your part even when the failure was mostly someone else's — the interviewer is scoring ownership, not fault",
                    "\"I don't have an example of that\" is acceptable once, and it is better than a fabricated story",
                ],
                "",
            ),
        ),
        section(
            "seniority-signals",
            "What Changes by Level",
            TB(
                ["Level", "Scope of the story", "What they listen for"],
                [
                    ["Mid", "A feature or component you owned", "Delivered it, handled obstacles, learned something"],
                    ["Senior", "A project across a team or quarter", "Made trade-offs, influenced others, owned the outcome"],
                    ["Staff+", "Cross-team or organisational", "Changed how the org works, aligned people, chose what *not* to do"],
                ],
                "Same question, different bar",
            ),
            B(
                [
                    "Senior and above: at least one story must involve **influencing without authority**",
                    "Staff and above: at least one must involve **deciding not to build something**",
                    "Show the trade-off, not just the effort. \"We shipped\" is mid-level; \"we shipped by cutting X because Y\" is senior",
                    "Quantify scope: team size, user count, revenue, incident reduction",
                ],
                "",
            ),
        ),
        section(
            "questions-to-ask",
            "Questions to Ask Them",
            B(
                [
                    "What does the first 90 days look like for this role?",
                    "What is the biggest technical challenge the team is facing right now?",
                    "How do decisions get made when the team disagrees on an approach?",
                    "What does the on-call rotation look like, and how noisy is it?",
                    "How do you balance new work against paying down technical debt?",
                    "What separates someone doing well in this role from someone doing exceptionally?",
                    "What is something about working here that surprised you?",
                ],
                "Have three ready, ask two",
            ),
            T("Do not ask anything answerable from the careers page. The on-call and decision-making questions are the ones that get honest, revealing answers — and they signal that you have operated real systems."),
        ),
        section(
            "loop-prep",
            "Loop Preparation Checklist",
            S(
                [
                    "Write 8 stories in STAR with a number in each Result",
                    "Map each story to 2-3 signals; check every common question has a story",
                    "Practise each aloud at 90 seconds and 3 minutes — out loud, not in your head",
                    "Research the company's stated values and map one story to each",
                    "Prepare your 90-second \"tell me about yourself\"",
                    "Prepare three questions to ask, specific to this team",
                    "Know your own resume cold — every claim on it is fair game",
                ],
                "",
            ),
            T("Record yourself once and listen back. Nearly everyone discovers they say \"we\" when they mean \"I\", and that single change is the highest-leverage fix in behavioural preparation."),
        ),
    ],
}


CS_SHEET = {
    "slug": "cs-fundamentals",
    "title": "CS Fundamentals",
    "description": "OS, networking, HTTP, and database facts that sit under backend interviews — as lookup tables.",
    "minutes": 16,
    "order": 6,
    "sections": [
        section(
            "process-thread",
            "Processes, Threads, and Scheduling",
            TB(
                ["", "Process", "Thread"],
                [
                    ["Memory", "Own address space", "Shared heap, own stack"],
                    ["Creation cost", "High", "Low"],
                    ["Communication", "IPC: pipes, sockets, shared memory", "Shared variables"],
                    ["Crash isolation", "Isolated", "Takes the process down"],
                    ["Context switch", "Expensive (TLB flush)", "Cheaper"],
                ],
                "",
            ),
            TB(
                ["Term", "Meaning"],
                [
                    ["Context switch", "Saving one execution context and restoring another"],
                    ["Preemptive scheduling", "The OS can interrupt a running task"],
                    ["User vs kernel mode", "Kernel mode can execute privileged instructions; a syscall crosses the boundary"],
                    ["Zombie process", "Exited but its parent has not reaped the exit status"],
                    ["Daemon", "Background process detached from a terminal"],
                    ["Virtual memory", "Per-process address space mapped to physical frames by the MMU"],
                    ["Page fault", "Accessing a page not resident in memory; the OS loads it"],
                    ["Thrashing", "More time paging than working — the working set exceeds RAM"],
                ],
                "",
            ),
            T("Thread pool sizing: CPU-bound work wants roughly one thread per core; IO-bound work can use many more, because those threads are blocked rather than computing. Saying that distinction is what the question is usually after."),
        ),
        section(
            "concurrency-os",
            "Concurrency Hazards",
            TB(
                ["Problem", "Definition", "Fix"],
                [
                    ["Race condition", "Result depends on timing of unsynchronised access", "Mutual exclusion, or atomics"],
                    ["Deadlock", "Each holds what the other needs, forever", "Global lock ordering, timeouts, or avoid nesting"],
                    ["Livelock", "Threads keep responding to each other, no progress", "Backoff with randomisation"],
                    ["Starvation", "A thread never gets the resource", "Fair locks, priority ageing"],
                    ["Priority inversion", "Low-priority holder blocks a high-priority waiter", "Priority inheritance"],
                ],
                "",
            ),
            B(
                [
                    "Deadlock needs all four: mutual exclusion, hold-and-wait, no preemption, circular wait. Break any one",
                    "**Mutex** = one holder. **Semaphore** = up to N holders. **Monitor** = mutex plus condition variables",
                    "Optimistic locking (version check) beats pessimistic locking when conflicts are rare",
                    "A spinlock burns CPU while waiting — only correct for very short critical sections on multiple cores",
                ],
                "",
            ),
        ),
        section(
            "networking-model",
            "Networking Layers",
            TB(
                ["Layer", "Unit", "Examples", "Addresses by"],
                [
                    ["Application", "Message", "HTTP, DNS, TLS, gRPC", "URL / hostname"],
                    ["Transport", "Segment", "TCP, UDP, QUIC", "Port"],
                    ["Network", "Packet", "IP, ICMP", "IP address"],
                    ["Link", "Frame", "Ethernet, Wi-Fi", "MAC address"],
                ],
                "",
            ),
            TB(
                ["", "TCP", "UDP"],
                [
                    ["Connection", "Handshake first", "Connectionless"],
                    ["Delivery", "Reliable, ordered, retransmits", "Best effort, may drop or reorder"],
                    ["Flow/congestion control", "Yes", "No"],
                    ["Header overhead", "20+ bytes", "8 bytes"],
                    ["Use for", "HTTP, databases, anything correctness-critical", "DNS, video, gaming, telemetry"],
                ],
                "TCP vs UDP",
            ),
            B(
                [
                    "TCP handshake is **SYN, SYN-ACK, ACK** — one round trip before any data",
                    "Close is a four-way FIN exchange; `TIME_WAIT` holds the port briefly to catch stragglers",
                    "**Head-of-line blocking**: one lost TCP segment stalls everything behind it, which is what QUIC/HTTP-3 fixes",
                    "MTU is typically 1500 bytes; exceeding it causes fragmentation",
                ],
                "",
            ),
        ),
        section(
            "http",
            "HTTP",
            TB(
                ["Method", "Safe", "Idempotent", "Cacheable"],
                [
                    ["GET", "Yes", "Yes", "Yes"],
                    ["HEAD", "Yes", "Yes", "Yes"],
                    ["PUT", "No", "**Yes**", "No"],
                    ["DELETE", "No", "**Yes**", "No"],
                    ["POST", "No", "**No**", "Rarely"],
                    ["PATCH", "No", "Not necessarily", "No"],
                ],
                "This table is why POST needs an idempotency key",
            ),
            TB(
                ["Code", "Meaning", "When you see it"],
                [
                    ["200 / 201 / 204", "OK / Created / No content", "Success"],
                    ["301 / 302", "Moved permanently / found", "301 is cached forever by browsers"],
                    ["304", "Not modified", "Conditional GET with ETag"],
                    ["400 / 422", "Bad request / validation failed", "Client error"],
                    ["401 / 403", "Unauthenticated / unauthorised", "Not logged in vs not allowed"],
                    ["404", "Not found", "Also used to hide existence"],
                    ["409", "Conflict", "Optimistic concurrency failure"],
                    ["429", "Too many requests", "Rate limited — send `Retry-After`"],
                    ["500 / 502 / 503 / 504", "Server / bad gateway / unavailable / gateway timeout", "503 and 504 are usually retryable"],
                ],
                "Status codes worth knowing",
            ),
            TB(
                ["", "HTTP/1.1", "HTTP/2", "HTTP/3"],
                [
                    ["Transport", "TCP", "TCP", "QUIC over UDP"],
                    ["Concurrency", "One request at a time per connection", "Multiplexed streams", "Multiplexed streams"],
                    ["Head-of-line blocking", "Application level", "Transport level", "Eliminated"],
                    ["Headers", "Plain text", "HPACK compressed", "QPACK compressed"],
                ],
                "Versions",
            ),
            E("Cold HTTPS request = DNS + TCP (1 RTT) + TLS 1.3 (1 RTT) + request (1 RTT)\n\nAt 100 ms RTT that is ~300 ms before your server does anything.\nTerminating TLS at a nearby edge removes the handshake round trips.", "Why distant users are slow"),
            T("`Cache-Control: max-age` is for browsers, `s-maxage` for shared caches, and `stale-if-error` lets a CDN keep serving when your origin is down. That last one is an availability mechanism most people forget exists."),
        ),
        section(
            "dns-tls",
            "DNS and TLS",
            TB(
                ["Record", "Maps", "Used for"],
                [
                    ["A / AAAA", "Name to IPv4 / IPv6", "Pointing at a load balancer"],
                    ["CNAME", "Name to another name", "Pointing at a CDN"],
                    ["MX", "Domain to mail server", "Email"],
                    ["TXT", "Arbitrary text", "Domain verification, SPF/DKIM"],
                    ["NS", "Delegation", "Zone structure"],
                ],
                "",
            ),
            B(
                [
                    "Resolution order: browser cache, OS cache, recursive resolver, root, TLD, authoritative",
                    "**TTL is the only lever** — DNS is a global cache you can write to but cannot invalidate",
                    "DNS failover takes about a TTL, plus resolvers and JVMs that ignore it. For seconds, you need anycast or a proxy",
                    "Geo-steering sees the **resolver**, not the user — VPN traffic gets misrouted",
                    "TLS 1.3 handshakes in one round trip, zero on resumption. TLS 1.2 needs two",
                    "mTLS authenticates both sides — the standard way services prove identity to each other",
                ],
                "",
            ),
        ),
        section(
            "db-indexes",
            "Indexes",
            F("""-- Composite index rule: EQUALITY columns first, then the range/sort column
-- Query: WHERE tenant = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX ON orders (tenant_id, status, created_at DESC);""", "Column order is the design"),
            TB(
                ["Reason an index is not used", "Fix"],
                [
                    ["Column wrapped in a function: `lower(email)`", "Expression index"],
                    ["Implicit type cast", "Match the parameter type"],
                    ["Leading wildcard: `LIKE '%foo'`", "Full-text or trigram index"],
                    ["Low selectivity (95% one value)", "Partial index on the rare value"],
                    ["Stale statistics after a bulk load", "Analyze the table"],
                    ["Not the leftmost prefix of a composite", "Reorder, or add an index"],
                ],
                "",
            ),
            B(
                [
                    "An index is a **sorted copy** — reads get faster, every write gets slower, storage grows 10-30% per index",
                    "**B-tree**: updates in place, great for reads and ranges. **LSM**: sequential writes, compaction cost, great for write-heavy",
                    "A covering index answers the query without touching the row",
                    "`OFFSET 100000` makes the database produce and discard 100,000 rows — use keyset pagination with a tie-breaker",
                    "Build indexes concurrently on a large live table, or the build is an outage",
                ],
                "",
            ),
        ),
        section(
            "transactions",
            "Transactions and Isolation",
            TB(
                ["Property", "Meaning"],
                [
                    ["**A**tomicity", "All or nothing"],
                    ["**C**onsistency", "Constraints hold before and after"],
                    ["**I**solation", "Concurrent transactions do not see each other's partial work"],
                    ["**D**urability", "Committed data survives a crash"],
                ],
                "ACID",
            ),
            TB(
                ["Isolation level", "Prevents", "Still allows"],
                [
                    ["Read uncommitted", "Nothing", "Dirty reads"],
                    ["**Read committed** (common default)", "Dirty reads", "Non-repeatable reads, phantoms, write skew"],
                    ["Repeatable read / snapshot", "Non-repeatable reads", "**Write skew**, some phantoms"],
                    ["Serializable", "Everything", "Nothing — at the cost of aborts or locking"],
                ],
                "",
            ),
            TB(
                ["Anomaly", "Example"],
                [
                    ["Dirty read", "Reading a value from an uncommitted transaction"],
                    ["Non-repeatable read", "The same row read twice returns different values"],
                    ["Phantom read", "The same query returns extra rows on re-run"],
                    ["Write skew", "Two on-call engineers each check \"someone else is on call\" and both go off call"],
                    ["Lost update", "Two read-modify-writes; one silently overwrites the other"],
                ],
                "",
            ),
            T("Most databases default to read committed, and most application code assumes serializable. Knowing that snapshot isolation still permits **write skew** is the detail that separates a real answer from a recited one."),
        ),
        section(
            "db-scaling",
            "Database Scaling Facts",
            TB(
                ["Technique", "Scales", "Does not scale", "Cost"],
                [
                    ["Read replica", "Reads", "Writes", "Replica lag, read-your-writes anomalies"],
                    ["Connection pooler", "Connection count", "Query throughput", "Another component"],
                    ["Caching", "Reads", "Writes", "Staleness, cold-start risk"],
                    ["Vertical scale", "Everything, to a ceiling", "Beyond the largest instance", "Money, single failure domain"],
                    ["Sharding", "Writes and storage", "Cross-shard queries", "No joins or transactions across shards"],
                    ["Partitioning (single node)", "Query pruning, retention", "Capacity", "Not the same as sharding"],
                ],
                "",
            ),
            B(
                [
                    "Replication is **not** a backup — it replicates `DELETE FROM users` perfectly, in milliseconds",
                    "Asynchronous replication can lose acknowledged writes on failover; the window is the replication lag",
                    "Split brain needs a majority quorum or fencing — \"we have redundancy\" is not an answer",
                    "Relational databases handle a few hundred connections well, not thousands — that is what the pooler is for",
                    "Point-in-time recovery is what turns a 24-hour RPO into seconds",
                ],
                "",
            ),
        ),
        section(
            "security-basics",
            "Security Basics",
            TB(
                ["Concept", "One line"],
                [
                    ["Authentication", "Who are you"],
                    ["Authorisation", "May you do this to this resource"],
                    ["Hashing", "One-way. Passwords need a **slow** hash: bcrypt, scrypt, Argon2"],
                    ["Encryption", "Reversible with a key. TLS in transit, KMS-managed keys at rest"],
                    ["Salt", "Per-password random value; defeats rainbow tables"],
                    ["JWT", "Signed, stateless, **not revocable** before expiry — use short lifetimes"],
                    ["OAuth 2.0 / OIDC", "Delegated authorisation / identity layer on top"],
                    ["CORS", "Browser rule controlling cross-origin requests"],
                    ["CSRF", "Forged request from an authenticated browser; fix with tokens or SameSite"],
                    ["XSS", "Injected script in a page; fix by escaping output"],
                    ["SQL injection", "Fix with parameterised queries, never string concatenation"],
                    ["SSRF", "Your server fetches an attacker-chosen URL; allowlist destinations"],
                ],
                "",
            ),
            T("The most common real vulnerability in interview designs is the missing ownership check — an endpoint that fetches by id without verifying the caller owns it. Say that every resource read and write checks ownership, not just the route."),
        ),
    ],
}


AI_SHEET = {
    "slug": "ai-ml",
    "title": "AI & Machine Learning",
    "description": "Metrics, model selection, transformers, RAG, agents, and the numbers AI interviews ask you to reason with.",
    "minutes": 16,
    "order": 7,
    "sections": [
        section(
            "problem-to-approach",
            "Problem to Approach",
            TB(
                ["The task is...", "Approach", "Primary metric"],
                [
                    ["Predict a label from examples", "Supervised classification", "PR-AUC, F1, or recall at fixed precision"],
                    ["Predict a number", "Supervised regression", "RMSE or MAE"],
                    ["Find structure, no labels", "Clustering, dimensionality reduction", "Silhouette, plus human judgement"],
                    ["Rank items for a user", "Learning to rank, retrieval + ranking", "nDCG, MRR, recall@k"],
                    ["Detect rare anomalies", "Anomaly detection, heavily imbalanced classification", "Precision at fixed recall"],
                    ["Generate or transform text", "LLM, prompted or fine-tuned", "Task-specific eval + LLM judge"],
                    ["Answer over private documents", "**RAG**, not fine-tuning", "Retrieval recall, answer faithfulness"],
                    ["Teach a fixed format or style", "Fine-tuning (often LoRA)", "Format adherence, held-out quality"],
                    ["Multi-step task with tools", "Agent with tool calls", "Task completion rate, steps, cost"],
                ],
                "",
            ),
            T("The most common AI interview mistake is reaching for fine-tuning when the problem is knowledge access. Fine-tuning teaches **behaviour and format**; RAG supplies **facts**. Say which one the problem needs and why."),
        ),
        section(
            "metrics",
            "Metrics",
            TB(
                ["Metric", "Formula", "Use when"],
                [
                    ["Accuracy", "correct / total", "Balanced classes only — misleading otherwise"],
                    ["Precision", "TP / (TP + FP)", "False positives are expensive (spam, moderation)"],
                    ["Recall", "TP / (TP + FN)", "False negatives are expensive (disease, fraud)"],
                    ["F1", "harmonic mean of P and R", "You need one number and both matter"],
                    ["PR-AUC", "Area under precision-recall", "**Imbalanced** data — prefer over ROC-AUC"],
                    ["ROC-AUC", "Area under TPR/FPR", "Balanced data, threshold-free comparison"],
                    ["RMSE", "sqrt(mean squared error)", "Regression; punishes large errors"],
                    ["MAE", "mean absolute error", "Regression; robust to outliers"],
                    ["nDCG@k", "Discounted gain vs ideal", "Ranking quality with graded relevance"],
                    ["MRR", "mean of 1/rank of first hit", "One correct answer, position matters"],
                ],
                "",
            ),
            E("""                Predicted +   Predicted -
Actual +           TP            FN        <- recall = TP/(TP+FN)
Actual -           FP            TN

precision = TP/(TP+FP)""", "Confusion matrix"),
            B(
                [
                    "With 1% positives, a model predicting \"negative\" always scores **99% accuracy** and is useless",
                    "Precision and recall trade off against each other through the **threshold**, not the model",
                    "Pick the operating point from the business cost of each error type, then report the metric at that point",
                    "Always compare against a baseline: majority class, or the current heuristic",
                ],
                "",
            ),
        ),
        section(
            "training-hygiene",
            "Splits, Overfitting, and Leakage",
            TB(
                ["Symptom", "Diagnosis", "Fix"],
                [
                    ["Train error low, val error high", "Overfitting (high variance)", "More data, regularisation, simpler model, early stopping"],
                    ["Both errors high", "Underfitting (high bias)", "More capacity, better features"],
                    ["Val score suspiciously high", "**Leakage**", "Check for future information or a bad split"],
                    ["Val good, production bad", "Distribution shift, or a broken split", "Split by time or by entity, monitor drift"],
                ],
                "",
            ),
            B(
                [
                    "**Train** fits parameters, **validation** chooses hyperparameters, **test** is a one-shot estimate. Never tune on test",
                    "Split by the unit of generalisation: by **time** for logs, by **user** for grouped data. A random row split leaks",
                    "Fit scalers and encoders on **train only**, then transform validation and test",
                    "Leakage test: \"would this feature be known at prediction time?\" If not, it is leakage",
                    "Class imbalance: resample, class weights, or a threshold chosen on the PR curve — not accuracy",
                ],
                "",
            ),
            T("Leakage is the most expensive ML interview miss. A model that uses `days_until_churn` to predict churn scores beautifully and will not survive a design review — and interviewers plant exactly that kind of feature."),
        ),
        section(
            "transformers",
            "Transformers and LLMs",
            TB(
                ["Concept", "One line"],
                [
                    ["Self-attention", "Every token attends to every other; cost is O(n^2) in sequence length"],
                    ["Multi-head", "Several attention subspaces in parallel, then concatenated"],
                    ["Positional encoding", "Order information, since attention itself is order-agnostic"],
                    ["Encoder-only", "BERT-style; classification and embeddings"],
                    ["Decoder-only", "GPT-style; next-token generation. Most modern LLMs"],
                    ["Pretraining", "Self-supervised next-token or masked-token prediction"],
                    ["Fine-tuning", "Supervised adaptation to a task or format"],
                    ["LoRA", "Train small low-rank adapters instead of all weights — far cheaper"],
                    ["RLHF / preference tuning", "Align outputs with human preferences after supervised tuning"],
                    ["KV cache", "Cached keys/values so generation is O(1) per new token, not O(n)"],
                ],
                "",
            ),
            TB(
                ["Decoding parameter", "Effect", "Typical"],
                [
                    ["`temperature`", "0 is deterministic; higher is more random", "0 for extraction, 0.7 for creative"],
                    ["`top_p`", "Sample from the smallest set covering p of the mass", "0.9-1.0"],
                    ["`top_k`", "Sample from the k most likely tokens", "Often unused when top_p is set"],
                    ["`max_tokens`", "Hard cap on output length", "Set it — it bounds cost and latency"],
                    ["`stop`", "Sequences that end generation", "Useful for structured output"],
                ],
                "Tune temperature or top_p, rarely both",
            ),
            T("Attention being O(n^2) in sequence length is why context windows are expensive and why chunking matters. If asked why long context costs more than proportionally, that is the answer."),
        ),
        section(
            "tokens-cost",
            "Tokens, Context, and Cost",
            F("""1 token ~= 4 characters ~= 0.75 English words
1,000 words ~= 1,300 tokens
1 page of text ~= 500 tokens

cost = (input tokens x input rate) + (output tokens x output rate)
Output tokens are typically several times the price of input tokens.""", "Token math"),
            B(
                [
                    "Context window is shared by system prompt + history + retrieved documents + output — budget all four",
                    "Latency is dominated by **output** tokens; generation is sequential, input is processed in parallel",
                    "**Time to first token** and **tokens per second** are the two latency numbers that matter to users",
                    "Prompt caching makes a large static prefix much cheaper on repeat calls — put the stable part first",
                    "Long conversations grow cost quadratically if you resend the whole history every turn: summarise or window it",
                ],
                "",
            ),
            T("When asked to reduce LLM cost, the levers in order are: send fewer input tokens (retrieve less, summarise history), cap output tokens, cache the static prefix, and only then consider a smaller model."),
        ),
        section(
            "prompting",
            "Prompting Patterns",
            TB(
                ["Pattern", "Use when", "Note"],
                [
                    ["Zero-shot", "The task is common and well-specified", "Always try first"],
                    ["Few-shot", "Format or edge cases matter", "2-5 examples; make them cover the hard cases"],
                    ["Chain of thought", "Multi-step reasoning", "Costs output tokens; modern reasoning models often do it internally"],
                    ["Structured output", "You will parse the result", "Request JSON with a schema, and validate it"],
                    ["Role and context framing", "Domain-specific tone or knowledge", "Put stable instructions first for cache reuse"],
                    ["Decomposition", "The task is too big for one call", "Chain calls; each step is separately testable"],
                    ["Self-check", "Accuracy matters more than cost", "A second pass that verifies the first"],
                ],
                "",
            ),
            B(
                [
                    "Be specific about the **output format** and what to do when the answer is unknown",
                    "Put instructions before the data, and the stable prefix first for prompt caching",
                    "Never concatenate untrusted user input into an instruction — mark it clearly as data",
                    "Validate structured output and retry on parse failure; models occasionally break format",
                    "Version prompts like code. A prompt change is a deploy and needs an eval run",
                ],
                "",
            ),
        ),
        section(
            "rag",
            "RAG",
            S(
                [
                    "**Ingest** — load, clean, and chunk documents",
                    "**Embed** — vectorise chunks and store with metadata",
                    "**Retrieve** — embed the query, fetch top-k by similarity (plus keyword search)",
                    "**Rerank** — a cross-encoder reorders candidates for precision",
                    "**Generate** — build the prompt with retrieved context and cite sources",
                ],
                "Pipeline",
            ),
            TB(
                ["Knob", "Typical", "Trade-off"],
                [
                    ["Chunk size", "200-800 tokens", "Small = precise but loses context; large = context but noisy"],
                    ["Chunk overlap", "10-20%", "Avoids cutting mid-idea; costs storage"],
                    ["Top-k", "3-10", "More recall, more tokens, more distraction"],
                    ["Hybrid search", "Dense + BM25", "Catches exact terms embeddings miss (codes, names)"],
                    ["Reranker", "Cross-encoder on top-50", "Big precision win, adds latency"],
                    ["Metadata filters", "Tenant, date, document type", "Essential for multi-tenant correctness"],
                ],
                "",
            ),
            TB(
                ["Failure", "Cause", "Fix"],
                [
                    ["Answers are wrong but confident", "Retrieval missed the right chunk", "Measure **retrieval recall** separately from answer quality"],
                    ["Right chunk retrieved, answer still wrong", "Generation or prompt problem", "Improve the prompt, require citations"],
                    ["Exact identifiers never found", "Pure dense retrieval", "Add keyword/BM25 search"],
                    ["Answers from another tenant", "Missing metadata filter", "Filter at query time, never post-filter"],
                    ["Stale answers", "Index not updated", "Re-embed on document change via a pipeline"],
                ],
                "Debug retrieval and generation separately",
            ),
            T("The single most useful thing to say about RAG: evaluate retrieval and generation as **two separate metrics**. Most RAG failures are retrieval failures, and an end-to-end score cannot tell you which half is broken."),
        ),
        section(
            "agents",
            "Agents and Tools",
            TB(
                ["Concept", "One line"],
                [
                    ["Tool / function calling", "The model returns a structured call; your code executes it"],
                    ["ReAct loop", "Reason, act, observe, repeat until done"],
                    ["Planning", "Decompose into steps before acting; better for long tasks"],
                    ["Memory", "Short-term (context) vs long-term (a store you retrieve from)"],
                    ["MCP", "A standard protocol for exposing tools and resources to a model"],
                    ["Guardrails", "Validation, allowlists, and limits around what tools can do"],
                ],
                "",
            ),
            B(
                [
                    "**Bound every loop** — a maximum step count and a total token/cost budget, or an agent can run forever",
                    "Tools must be **idempotent** or confirmed, because the model will retry",
                    "Validate every tool argument. The model is an untrusted caller of your API",
                    "Give the model few, well-described tools. Twenty vague tools perform worse than five clear ones",
                    "Log every step — prompt, tool call, result — or failures are undebuggable",
                    "Prefer deterministic code for anything the model does not need to decide",
                ],
                "Production rules",
            ),
            T("When asked to design an agent, the interesting parts are the loop bound, the tool permission model, and observability — not the prompt. Those are the parts that make it safe to run unattended."),
        ),
        section(
            "llm-eval",
            "Evaluating LLM Systems",
            TB(
                ["Method", "Good for", "Limitation"],
                [
                    ["Golden set of examples", "Regression testing prompts and models", "Needs maintenance; limited coverage"],
                    ["Exact match / F1", "Extraction, classification", "Too brittle for free text"],
                    ["LLM-as-judge", "Subjective quality at scale", "Biased, needs its own calibration"],
                    ["Human review", "Ground truth", "Slow and expensive; sample it"],
                    ["A/B test", "Real impact", "Slow, needs traffic"],
                    ["Retrieval recall@k", "The RAG retrieval half", "Says nothing about the generated answer"],
                ],
                "",
            ),
            B(
                [
                    "Build the eval set **before** iterating on prompts, or you are tuning on vibes",
                    "Include the failure cases you have already seen — every bug becomes a test",
                    "LLM-as-judge needs a rubric and spot-checking against human labels, or it drifts",
                    "Track cost and latency alongside quality; a 2% quality gain for 5x cost is usually a bad trade",
                    "Non-determinism is real: pin temperature to 0 for evals and still expect some variance",
                ],
                "",
            ),
        ),
        section(
            "ai-serving",
            "Serving and Production",
            TB(
                ["Concern", "Lever"],
                [
                    ["Latency", "Smaller model, fewer output tokens, streaming, prompt caching"],
                    ["Throughput", "Batching, more replicas, quantisation"],
                    ["Cost", "Fewer input tokens, cap output, cache, route easy requests to a cheaper model"],
                    ["Reliability", "Timeouts, retries with backoff, a fallback model, circuit breaker"],
                    ["Safety", "Input and output filtering, allowlisted tools, human review for high-risk actions"],
                    ["Observability", "Log prompt, response, tokens, latency, cost, and a trace id per request"],
                ],
                "",
            ),
            B(
                [
                    "**Stream** the response — time to first token is what users perceive as speed",
                    "Model routing (cheap model first, escalate on low confidence) is often the biggest cost win",
                    "Rate limit per tenant; one customer can otherwise consume the whole quota",
                    "Treat the model provider as an unreliable dependency: timeout, retry with backoff, and have a fallback",
                    "Pin model versions. A silent provider upgrade changes behaviour under you",
                ],
                "",
            ),
        ),
        section(
            "ai-security",
            "AI Security",
            TB(
                ["Risk", "What it is", "Mitigation"],
                [
                    ["Prompt injection", "Untrusted content carries instructions the model follows", "Separate data from instructions; never let retrieved text grant permissions"],
                    ["Indirect injection", "Injection arrives via a retrieved document or tool result", "Treat all tool and retrieval output as untrusted data"],
                    ["Data exfiltration", "Model reveals other tenants' or system data", "Metadata filters, least-privilege tools, output scanning"],
                    ["Training data leakage", "Model reproduces sensitive training text", "Do not train on secrets; scrub PII before ingestion"],
                    ["Excessive agency", "Model takes a destructive action", "Allowlist tools, require confirmation for writes, bound the loop"],
                    ["Hallucination", "Confident wrong answer", "Require citations, verify claims, say \"I don't know\" is allowed"],
                ],
                "",
            ),
            T("The answer interviewers want on prompt injection: you cannot fully solve it with prompting. The defence is architectural — least-privilege tools, treating all retrieved content as untrusted, and confirmation gates on anything destructive."),
        ),
        section(
            "mlops",
            "MLOps Checklist",
            S(
                [
                    "Version **code, data, and model** — all three, or you cannot reproduce a result",
                    "Log every experiment with params, metrics, data revision, and commit",
                    "Evaluate on a held-out set that mirrors production distribution",
                    "Deploy behind a flag; canary on a small traffic slice first",
                    "Monitor input drift, output distribution, latency, cost, and a business metric",
                    "Keep a rollback path — the previous model stays deployable",
                    "Schedule retraining triggered by drift or a metric drop, not by the calendar alone",
                ],
                "",
            ),
            T("If asked what is different about deploying an ML model versus a service: the model can degrade silently while every system metric stays green. That is why drift and output monitoring exist, and it is the answer that shows production experience."),
        ),
    ],
}


CHEAT_SHEETS: list[dict] = [
    DSA_SHEET,
    JAVA_SHEET,
    SYSTEM_DESIGN_SHEET,
    LLD_SHEET,
    BEHAVIORAL_SHEET,
    CS_SHEET,
    AI_SHEET,
]
