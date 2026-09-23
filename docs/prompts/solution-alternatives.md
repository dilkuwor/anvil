# Task: add "other algorithms that also solve this" to the Solution tab

Every coding problem in the **Anvil** repo has a written Solution (`database/seeds/solutions/*.py`)
with 2–3 approaches: the obvious slow way, then the best way. A learner reading it never finds out
that the same problem can also be solved by a **line sweep**, or **quickselect**, or **union find**.
That breadth is what this task adds.

A new kind of approach entry exists: `"is_alternative": True`. It is rendered in its own section,
**Other algorithms that also solve this**, after the best approach, with an "Another way" badge.
It is not a ranking — it is a different named idea worth recognising.

## Read first

1. `database/seeds/solutions/SOLUTION_GUIDE.md` — all the rules, including the new section
   "Other algorithms that also solve it". Follow every line.
2. **The worked example:** the `lc-56` entry in `database/seeds/solutions/intervals.py`. Its third
   approach, "Line sweep over start and end events", is finished and approved. Copy its shape, its
   length and its tone. `lc-435` in the same file has a second example.
3. `backend/tests/test_solution_content.py` — the rules that run automatically.

## What an alternative entry looks like

Same fields as any approach, plus `"is_alternative": True`, and `"is_optimal": False`:

```python
{
    "name": "Line sweep over start and end events",   # starts with the algorithm's usual name
    "idea": "One sentence: the different way of seeing the problem.",
    "steps": [ ... ],            # 3–6 whole sentences, plain words
    "code": """...Java...""",    # complete, correct, run by the checker
    "time_complexity": "O(n log n)",
    "time_why": "...",           # point at something concrete
    "space_complexity": "O(n)",
    "space_why": "...",
    "when_to_use": "...",        # THE POINT: what this one buys you that the best approach does not
    "is_optimal": False,
    "is_alternative": True,
},
```

It goes **last** in the `approaches` list, after the approach marked `is_optimal`.

## Rules that matter most

- **Only when it is genuinely a different algorithm.** Not a tidier loop, not the same idea with a
  cache, not "recursive instead of iterative" unless that really is the named technique (Morris is;
  "recursive DFS" next to "iterative DFS" is not). **If a problem has no such algorithm, add none.**
  A file where every problem gained one is a sign of padding.
- **At most 2 per problem.** Usually 0 or 1.
- **It may be slower.** An alternative earns its place by being a different tool, not a faster one.
  Say its true cost. The checker allows a slower approach to time out on the big tests; it never
  allows a wrong answer.
- **`when_to_use` is the value.** "When the question turns into counting rather than merging: how
  many meetings overlap at once. The same sweep answers that with one extra line." Not "another way
  to do it".
- **Plain words.** Every writing rule in the guide applies: no shop talk (memo, base case,
  subproblem, populate, traverse, iterate), at most 3 sentences per field, no exclamation marks.
  Naming the algorithm is fine and wanted; explain what it does in everyday words the first time.
- Do not touch `summary`, `pattern`, `trigger`, `walkthrough`, `mistakes`, `edge_cases`,
  `interview_script`, `follow_ups`, `related_slugs`, or the existing approaches. **Add only.**

## Candidates

Below is the list I judged worth adding, per file. **Check each one yourself**: if you think the
algorithm is not genuinely different for that problem, skip it and say so in your report. If you
know a better alternative for a problem that is not listed, add that instead and say so. Problems
not listed are expected to gain nothing.

### `intervals.py` — DONE, do not edit (this is your worked example)

### `arrays.py`
- `lc-53` Maximum Subarray → **Divide and conquer**: best run is in the left half, the right half, or
  crosses the middle. O(n log n). Worth it because it is the classic follow-up when Kadane is banned.
- `lc-189` Rotate Array → **Cyclic replacements**: move each value straight to its final slot,
  following the cycles. O(n), O(1).
- `lc-121` Best Time to Buy and Sell Stock → **Kadane on daily differences**: the profit is the best
  run of day-to-day changes.
- `lc-169` Majority Element → **Sort and take the middle**, or **count bit by bit** (the bit version
  is the one that generalises to "more than n/3").
- `lc-41` First Missing Positive → **Mark by sign**: use the sign of the value at each index as the
  "seen" flag instead of swapping values into place.
- `single-pass-profit` is the same problem as `lc-121`; keep them consistent.

### `two_pointers.py`
- `lc-42` Trapping Rain Water → **Monotonic stack**: each time a taller bar arrives, the dip it closes
  is filled. Genuinely different from closing in from both ends, and it is the bridge to `lc-84`.
- `lc-15` 3Sum → **Hash set for the third number** instead of the two pointers.
- `lc-167` Two Sum II → **Binary search for the partner** of each value. O(n log n).
- `lc-11`, `lc-125`, `lc-26`, `lc-283`, `lc-680`, `lc-88`, `lc-16`: probably nothing. Check `lc-16`.

### `sliding_window.py`
- `lc-239` Sliding Window Maximum → **Block maxima (prefix and suffix scan)**: cut the row into blocks
  of k, precompute maxima running forwards and backwards, then every window is one pair. O(n), no deque.
  Also possible: **heap with lazy removal**, O(n log n).
- `lc-438` / `lc-567` → **Rolling hash** is a stretch; only if you can make it plain. Probably skip.
- The rest: probably nothing.

### `stack.py`
- `lc-84` Largest Rectangle in Histogram → **Divide and conquer on the smallest bar**: the best
  rectangle either spans the whole range at the height of the smallest bar, or lives entirely on one
  side of it. O(n log n) when the bars are balanced.
- `lc-739` Daily Temperatures → **Walk from the right with jumps**: for each day, hop forward using
  the answers already worked out instead of keeping a stack.
- `lc-155` / `minimum-tracker-stack` Min Stack → **Store the difference from the minimum** in one
  stack, so no second stack is needed. A well-known trick worth naming.
- `lc-20` / `balanced-brackets`, `lc-150`, `lc-71`, `lc-227`, `lc-394`: probably nothing.

### `binary_search.py`
- `lc-153` Find Minimum in Rotated Sorted Array → nothing genuinely different; skip.
- `lc-4` Median of Two Sorted Arrays already has three; leave it.
- `lc-74` Search a 2D Matrix already has three; leave it.
- `lc-162` Find Peak Element → **Walk uphill from index 0**: O(n) but a real, different idea people
  give first. Only add it if the existing slow approach is not already that.
- Otherwise: probably nothing. These are all binary search by nature.

### `heap.py`
- `lc-215` Kth Largest Element → **Quickselect**: partition around a pivot and recurse into the side
  that holds position k. O(n) on average. This is the single most valuable addition in the whole task.
- `lc-973` K Closest Points → **Quickselect** on distance, same idea.
- `lc-23` Merge k Sorted Lists → **Divide and conquer pairwise merging**: merge lists in pairs,
  halving the count each round. O(N log k) with no heap.
- `lc-253` Meeting Rooms II → **Line sweep**: sort the start times and the end times separately and
  walk both with two pointers, or count +1/-1 events. Point the reader at `lc-56`'s line sweep.
- `lc-295` Find Median from Data Stream → probably nothing plain enough. Check.
- `lc-1046` Last Stone Weight → probably nothing.

### `hashmap.py`
- `lc-128` Longest Consecutive Sequence → **Union find**: join each value to its neighbour and take
  the biggest group.
- `lc-217`, `lc-242`, `lc-49`, `lc-1`, `lc-560`, `lc-347`: probably nothing. `lc-347` already has three.

### `graphs.py`
- `lc-200` Number of Islands → **Union find**: join neighbouring land cells and count the groups.
- `lc-547` Number of Provinces → **Union find**, same idea. Point the two at each other.
- `lc-207` Course Schedule → **Depth-first search with three colours** (unvisited, on the current
  path, finished): a cycle is an edge back to a node on the current path.
- `lc-210` Course Schedule II → **Depth-first search, finishing order reversed** gives the order.
- `lc-743` Network Delay Time → **Floyd-Warshall**: every pair's shortest path in three loops. O(V³),
  and the natural answer when the question becomes "all pairs".
- `lc-787` Cheapest Flights Within K Stops → **Dijkstra carrying the stop count** in the queue.
- `lc-127` Word Ladder already has bidirectional search; probably nothing more.
- `lc-133`, `lc-130`, `lc-286`, `lc-417`, `lc-542`, `lc-994`, `lc-269`: probably nothing.

### `trees.py`
- `lc-94` Binary Tree Inorder Traversal → **Morris traversal**: thread each node's rightmost
  predecessor back to it, so the walk needs no stack at all. O(1) space. A famous one.
- `lc-98` Validate BST → **Iterative in-order with a previous value**, if the existing pair does not
  already cover it. Check first.
- `lc-105` Construct Binary Tree from Preorder and Inorder → **One pass with a stack**, no index map.
- `lc-230` Kth Smallest in a BST → **Store a subtree count in each node**: answers repeated queries in
  O(h) and is the standard follow-up.
- `lc-863` All Nodes Distance K → probably nothing beyond the parent map.
- `lc-100`, `lc-101`, `lc-104`, `lc-110`, `lc-112`, `lc-124`, `lc-226`, `lc-543`, `lc-572`, `lc-199`,
  `lc-102`, `lc-103`, `lc-108`, `lc-235`, `lc-236`, `lc-297`: mostly recursive-versus-iterative pairs
  they already have. Add nothing unless you find a genuinely named technique.

### `dynamic_programming.py`
- `lc-62` Unique Paths → **Combinatorics**: every path is a choice of which moves go down, so the
  answer is a single binomial coefficient. O(m + n), no table at all. Excellent one.
- `lc-70` Climbing Stairs → **Fast doubling / matrix power** for huge n, or **Binet's formula**. Keep
  it plain; if you cannot, skip.
- `lc-322` Coin Change → **Breadth-first search over amounts**: each coin is a step, so the fewest
  coins is the shortest path from 0 to the amount.
- `lc-647` Palindromic Substrings → **Manacher's algorithm**, O(n). Only if you can explain it
  plainly; otherwise add the **DP table** instead.
- `lc-416` Partition Equal Subset Sum → **Bitset**: keep the reachable sums as the bits of one big
  number and shift it by each value.
- `lc-300` already has patience sorting; leave it.
- `lc-72`, `lc-91`, `lc-139`, `lc-152`, `lc-198`, `lc-213`, `lc-221`, `lc-1143`: probably nothing.

### `backtracking.py`
- `lc-78` Subsets → **Bitmask enumeration**: the numbers 0 to 2ⁿ−1 are the subsets, one bit per item.
- `lc-46` Permutations → **Swap in place** instead of a used-array, or **Heap's algorithm**.
- `lc-51` N-Queens → **Bitmask columns and diagonals**: three integers replace the three boolean rows.
- `lc-22` Generate Parentheses → **Build from smaller answers**: every string is `(` + a smaller
  answer + `)` + another smaller answer.
- `lc-17`, `lc-39`, `lc-79`, `lc-90`, `lc-131`: probably nothing.

### `matrix.py`
- `lc-48` Rotate Image → **Four-way cycle swap**: move four cells at a time around the square, one
  ring at a time. Different from transpose-then-reverse.
- `lc-54`, `lc-73`: probably nothing.

### `greedy.py`
- `lc-621` Task Scheduler → **Max-heap simulation**: run the clock and always start the task with the
  most left. It is slower than the formula but it is what you reach for when the rules get complicated.
- `lc-45` Jump Game II → **Breadth-first search over ranges**, if the existing pair does not already
  read that way. Check.
- `lc-122`, `lc-134`, `lc-55`, `lc-763`: probably nothing.

### `linked_list.py`
- `lc-148` Sort List → **Bottom-up merge sort**: merge runs of 1, then 2, then 4, with no recursion
  and O(1) extra space.
- `lc-141` Linked List Cycle → nothing (the hash set is already the slow approach).
- The rest: probably nothing.

### `design.py`
- `lc-146` LRU Cache → **LinkedHashMap with access order**: the library already keeps the order, so
  `removeEldestEntry` does the eviction. Worth naming because interviewers ask whether you know it.
- `lc-380`, `lc-706`, `lc-895`, `lc-981`, `lc-355`, `lc-362`, `lc-535`: probably nothing.

### `math_bits.py`
- `lc-338` Counting Bits → **Count by the lowest set bit** (`i & (i - 1)`) as well as the
  highest-power version, if the two existing ones do not already cover both.
- `lc-191` Number of 1 Bits → **Lookup table by byte**, the trick used in real libraries.
- `lc-50`, `lc-136`, `lc-268`, `lc-43`, `mirror-number`: already have three, or nothing to add.

### `strings.py`
- `lc-5` Longest Palindromic Substring already has three. Only add **Manacher's algorithm** if you can
  keep it plain.
- `lc-8`, `lc-151`, `lc-273`, `anagram-bundles`: probably nothing.

### `trie_union_find.py`
- `lc-684` Redundant Connection → probably nothing (union find is already the best).
- `lc-208`, `lc-211`, `lc-212`, `lc-323`, `lc-721`: probably nothing.

## How to work

1. Start with **one file**. Do `heap.py` first if you are choosing: quickselect and the line sweep
   there are the highest-value entries, and they set the tone.
2. For each candidate: decide honestly whether it is a different algorithm. Write the entry. Run both
   checks. Read it next to the `lc-56` example and ask whether `when_to_use` actually tells the reader
   something they did not know.
3. Both checks must be clean before you move to the next file:

```bash
cd backend
.venv/bin/python -m pytest tests/test_solution_content.py -q -k "<slug>"
.venv/bin/python scripts/check_solutions.py --file <file_name_without_py>
```

The checker compiles and runs every approach, including yours, against the problem's own test cases
from the database. The best approach must pass everything; an alternative must never be wrong, and
may run out of time on the big tests.

Never edit a test, the checker, the guide, or `intervals.py`. Do not run migrations, do not run the
seeder, do not commit. Failures in files you are not working on are not yours to fix.

## Report

1. Per file: which problems gained an alternative, and the algorithm's name for each.
2. Which listed candidates you **skipped**, and why — this is as useful as the ones you added.
3. Any alternative you added that was not on the list.
4. The final lines of both checks. Report only checks you actually ran.
