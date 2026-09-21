# Task: write Visual Stories for 73 coding problems (Antigravity)

You are working in the **Anvil** repository (an interview-prep app, Next.js + TypeScript frontend).
Every coding problem page can have a **Visual Story**: a step-by-step, user-paced picture story that
teaches that one problem so it is understood and still remembered months later.

**Who it is for:** someone recovering from a brain injury who is preparing for software interviews.
Low load, recall, calm. Short plain sentences. One new idea per step. Nothing that flashes or jumps.
This is the whole point of the feature.

21 stories exist and are approved. You will write the stories for the problems listed at the bottom.
**Another AI tool is writing the other half at the same time. You own different files. Stay in yours.**

## History you must learn from

The previous wave of 20 stories **failed review, all 20**, and had to be rewritten. They compiled and
passed the old tests, and were still wrong. The failures were:

1. **Fake frames.** Captions and states typed by hand instead of produced by running the algorithm
   on the input; `answer()` returning a literal; the input ignored; "practice" replaying the example.
2. **Questions that were not predictions.** Asked on a frame where the answer was already highlighted,
   labelled, or named in the caption or in the question itself. `otherwise: "Click index 3"`.
   A correct click rejected because several cells were right (ties).
3. **Static picture / slow / insight scenes** with invented counters (`n*n`) and magic indices that
   were false for other examples.
4. **Captions written for someone who already knows the algorithm:** code in sentences
   (`height[left] >= leftMax`, `root === p`), jargon, ALL CAPS, exclamation marks, several changes in one frame.
5. **The metaphor only in the title**, the named trap only on the card, never drawn.
6. **TypeScript shown as the solution** instead of Java; highlighted line pointing at a lone `}`.
7. **Pictures:** text clipped outside the viewBox, overlapping labels, wrong arrows, inline `transition`
   styles (ignores reduced motion), `<g onClick>` with no keyboard support, the answer pre-coloured.
8. **The card gave itself away:** trigger containing "→ think X", a "Remember: …" frame before practice.

The tests were tightened so most of this now fails automatically — but tests cannot judge whether a
question is a real prediction or whether a sentence is clear. **You must.**

## Read these first, in this order (all under `frontend/src/components/story/`)

1. `STORY_GUIDE.md` — the rules. Follow every line.
2. `types.ts` — the story shape. `view-kit.tsx` — shared motion, click targets, ✕ marks.
3. **The reference:** `stories/longest-unique-substring.ts` + `string-window-view.tsx`. Match its quality.
4. Two more good ones to study for harder shapes: `stories/daily-temperatures.ts` + `monotonic-stack-view.tsx`,
   and `stories/lowest-common-ancestor.ts` + `tree-story-view.tsx`.
5. `story.test.ts` — the acceptance tests. `story-player.tsx` — how a story is played (read only).

## Files you own

- **New story files:** `stories/<problem-name>.ts`, one per problem.
- **New view files, only if needed:** `agy-<what-it-draws>-view.tsx` (the `agy-` prefix keeps your
  names apart from the other tool's). Must end in `-view.tsx` so the picture tests find it.
- **Your registry:** `registry-agy.ts`. Import each finished story and add it to `AGY_STORIES`.

**Read-only for you:** `types.ts`, `view-kit.tsx`, `story-player.tsx`, `story.test.ts`, `registry.ts`,
`registry-grok.ts`, `known-problems.ts`, `STORY_GUIDE.md`, `story-badge.tsx`, every existing story and
every existing `*-view.tsx`. Also nothing under `backend/`, `database/`, `frontend/src/lib`, or any
other frontend folder. No dependencies added. No dev server, no browser, no commits.

If a shared file seems wrong, or an existing view almost fits but needs a change: do **not** edit it.
Make your own view (you may copy code from an existing one into your new file) and mention it in your report.

## Reusing pictures — do this first, it is also better teaching

Problems of the same pattern should share **the same metaphor and the same picture**. A learner who
knows "the caterpillar" from one sliding-window problem should meet the caterpillar again in the next
one; that is how a pattern becomes memory. So before drawing anything, check whether an existing view
already fits. You may `import` any of them:

| View | Draws | Metaphor already used with it |
|---|---|---|
| `string-window-view.tsx` | string as boxes, a window band, tail/head markers, a last-seen row | The caterpillar (sliding window) |
| `checklist-window-view.tsx` | string + a checklist of needed letters with need/have counts | The grocery checklist (window that must contain things) |
| `array-three-pointer-view.tsx` | number boxes, a peg and two calipers, a sum row, found list | Peg and calipers (sorted array, two/three pointers) |
| `container-water-view.tsx` | bars as walls, a water tank between two of them | Walls and tank |
| `trapping-water-view.tsx` | bars with trapped water and two running walls | Two walls closing in |
| `rotated-array-view.tsx` | bars with left/right/middle flags, faded discarded part | The ramp and the cliff (binary search) |
| `koko-eating-view.tsx` | piles plus a numbered dial/number line that narrows | The speed dial (binary search on the answer) |
| `intervals-view.tsx` | meetings as rows on a time axis, busy blocks below | Meetings and busy blocks |
| `monotonic-stack-view.tsx` | bars plus a "waiting room" list with a door | The waiting room (next greater / stack of waiting items) |
| `histogram-rectangle-view.tsx` | bars, drawn rectangles, a "still growing" list | Growing rectangles |
| `linked-list-cycle-view.tsx` | nodes in a row, a loop as a round track, null box | Tortoise and hare |
| `linked-list-reverse-view.tsx` | train cars, couplings that swing, null boxes, markers, curved long links | Train couplings (any pointer rewiring) |
| `tree-story-view.tsx` | **any** binary tree with automatic layout, edge marks, node tags, strips for a queue/rows/lists, counter | Waiting line (BFS) and reports climbing up (DFS) |
| `grid-matrix-view.tsx` | grid with row/column numbers, legend, arrows | Sinking island (grid search) |
| `oranges-view.tsx` | grid of oranges, wave rings | Spreading wave, minute by minute |
| `course-graph-view.tsx` | labelled boxes on an oval, arrows, "blocked by N", a free line | Dominoes (dependency order) |
| `coin-change-view.tsx` | a row of stones with hop arcs above and below | Stepping stones (1-D table) |
| `lcs-table-view.tsx` | two words as letter rows + a 2-D table with arrows and a traced path | The diagonal path (2-D table) |
| `lru-cache-view.tsx` | a line of guests with two-way links, doors, a guest list (map) | The VIP line (map + linked list) |

Read a view's state type before reusing it; produce exactly that state. If its labels are hard-wired
to a metaphor that does not suit your problem, write your own view rather than forcing it.

## Agree with the Solution tab

Every problem already has a written **Solution** (in `database/seeds/solutions/*.py`, read-only; find
your problem by its slug). The learner sees both tabs, so they must say the same thing:

- `traps[0]` is **the same mistake** as the Solution's first mistake (shown next to each problem below),
  and its rule must agree with the Solution's `right`. Give it a short, memorable name in the form
  "The … Trap" (like "The Ghost Trap", "The Spill Trap"): a name is easier to recall than a condition.
  List the names you chose in your report; the Solution entries will be renamed to match afterwards.
- `pattern` = the Solution's pattern name.
- `code` = the Solution's **best** approach in Java, as the lines of the method (see how the reference
  story does it), with variable names matching your captions and legend.
- `insight` says the same idea as the Solution's `summary`, told in your metaphor.
- `complexity.time` / `.space` = the best approach's costs. `complexity.slow` = the slow way's **time**.
- If you believe the Solution is wrong or its trap is a poor choice, do not change it: say so in your report.

To read a problem's statement, examples and signature:

```bash
cd backend && .venv/bin/python - <<'PY'
import app.main
from sqlalchemy import select
from app.common.database import SessionLocal
from app.problems.models import Problem
p = SessionLocal().scalar(select(Problem).where(Problem.slug == "lc-1"))
print(p.title); print(p.description); print(p.constraints); print(p.examples); print(p.function_signature)
PY
```

## How to work

1. **Write ONE story completely first** (pick one that can reuse an existing view). Make every check
   green, read it as a story, then **STOP and report** so it can be reviewed before you write more.
   The last wave was rewritten because nobody looked until all 20 were done.
2. After review, go topic by topic. Finish a story fully (checks green, captions read aloud in your
   head for every example) before starting the next. Never batch-generate.
3. For each story:
   - Choose 2–4 examples. At least one must reach the trap. Choose a fresh `practiceInput` that reaches it too.
   - Write an independent real solver for `answer()`.
   - Write `frames()` by **running the real algorithm** and pushing a frame at each change. Picture,
     slow and insight scenes are computed from the input too; the slow way is really executed with a real counter.
   - Every quiz: build the frame BEFORE the move (nothing pre-coloured, caption does not name the answer),
     then the next frame reveals. Exactly one right cell; if a moment has several right answers, do not
     ask there, or ask a two-option `choice` question. `feedback` explains why each plausible wrong cell
     is wrong; `otherwise` nudges; neither names the answer. "Nothing / null" needs a real clickable box.
   - Draw the trap: a frame whose picture shows the mistake and its consequence, with the trap's name in the caption.
   - Keep each example within about 25–55 frames (hard limit 70): give the first occurrence full detail,
     then summarise repetitive stretches in one frame.
4. Geometry: compute positions from the data. For your largest example and the practice input, work
   out the coordinates and make sure nothing leaves the viewBox and no two texts overlap.

## Checks (all must be clean before a story counts as done)

```bash
cd frontend
npx vitest run src/components/story -t "<the story's first slug> "     # note the trailing space, so lc-1 does not match lc-11
npx vitest run src/components/story -t "<your-view-file-name>"          # if you made a view
npx tsc --noEmit 2>&1 | grep -E "components/story/(stories/<yours>|agy-|registry-agy)"
npx eslint src/components/story/stories/<yours>.ts src/components/story/agy-*.tsx src/components/story/registry-agy.ts
```

Then print the story and read it: write a throwaway `zz-agy-dump.test.ts` in the story folder that
prints scene, caption, codeLine and quiz question for every frame of every example, run it, **delete it**.
Hand-check the first example against the real algorithm, step by step.

Never edit a test to get a pass. Errors in files that are not yours (the other tool is working) are
not yours to fix — ignore them.

## Notes for your half (trees, graphs, tables, search trees, design)

- **Trees (19):** `tree-story-view.tsx` lays out any tree and already draws queues, rows, reports and
  the call path. Reuse it for almost all of these; refer to nodes by the value in the circle, never by id.
- **Graphs (11):** the domino view for ordering problems, the grid/oranges views for grid graphs. For
  general graphs you may need your own node-link view; compute edge ends on the node border and bend opposite arrows apart.
- **Dynamic programming (12):** stones view for 1-D tables, the 2-D table view for two-sequence problems.
  Say in words what one cell **means** before filling anything. The slow way is plain recursion, really run, with a real call counter (cap the display, not the truth).
- **Backtracking (9):** you will need a small decision-tree view: choose → explore → un-choose, one branch per frame,
  pruned branches drawn faded with the reason. Keep inputs tiny (3 items) so the tree fits.
- **Heap (6):** draw the heap as a small tree AND as the array under it; one swap per frame.
- **Trie / union find (6):** trie = letters on edges growing down; union find = groups as clusters with a leader, one merge per frame.
- **Design (7):** the VIP-line view fits cache-like problems; otherwise draw the structure's parts and run the example's operation list one call per frame.

## Your problems (73)

Order: start with the topics that can reuse an existing view. Tick them off as you go.

### Trees — 19

- [ ] `lc-100` — Same Tree (Easy) · pattern: Tree DFS · the mistake to build the trap on: **Comparing values before checking nulls**
- [ ] `lc-101` — Symmetric Tree (Easy) · pattern: Tree DFS · the mistake to build the trap on: **Comparing same-side children**
- [ ] `lc-103` — Binary Tree Zigzag Level Order Traversal (Medium) · pattern: Tree BFS · the mistake to build the trap on: **Altering queue child insertion order**
- [ ] `lc-104` — Maximum Depth of Binary Tree (Easy) · pattern: Tree DFS · the mistake to build the trap on: **Off-by-one depth count**
- [ ] `lc-105` — Construct Binary Tree from Preorder and Inorder Traversal (Medium) · pattern: Divide and conquer · the mistake to build the trap on: **Wrong boundary calculations**
- [ ] `lc-108` — Convert Sorted Array to Binary Search Tree (Easy) · pattern: Divide and conquer · the mistake to build the trap on: **Integer overflow on mid calculation**
- [ ] `lc-110` — Balanced Binary Tree (Easy) · pattern: Tree DFS · the mistake to build the trap on: **Recalculating heights redundantly**
- [ ] `lc-112` — Path Sum (Easy) · pattern: Tree DFS · the mistake to build the trap on: **Stopping at non-leaf nodes**
- [ ] `lc-124` — Binary Tree Maximum Path Sum (Hard) · pattern: Tree DFS · the mistake to build the trap on: **Returning both branches to parent**
- [ ] `lc-199` — Binary Tree Right Side View (Medium) · pattern: Tree BFS · the mistake to build the trap on: **Only following right pointers**
- [ ] `lc-226` — Invert Binary Tree (Easy) · pattern: Tree DFS · the mistake to build the trap on: **Overwriting pointer before saving**
- [ ] `lc-230` — Kth Smallest Element in a BST (Medium) · pattern: Binary search tree · the mistake to build the trap on: **Visiting entire tree when k is small**
- [ ] `lc-235` — Lowest Common Ancestor of a Binary Search Tree (Medium) · pattern: Binary search tree · the mistake to build the trap on: **Searching both branches blindly**
- [ ] `lc-297` — Serialize and Deserialize Binary Tree (Hard) · pattern: Tree serialization · the mistake to build the trap on: **Omitting null markers**
- [ ] `lc-543` — Diameter of Binary Tree (Easy) · pattern: Tree DFS · the mistake to build the trap on: **Assuming diameter must pass through the root**
- [ ] `lc-572` — Subtree of Another Tree (Easy) · pattern: Tree DFS · the mistake to build the trap on: **String contains without delimiters**
- [ ] `lc-863` — All Nodes Distance K in Binary Tree (Medium) · pattern: Tree BFS · the mistake to build the trap on: **Forgetting to search upward to parent**
- [ ] `lc-94` — Binary Tree Inorder Traversal (Easy) · pattern: Tree DFS · the mistake to build the trap on: **Popping before reaching leftmost node**
- [ ] `lc-98` — Validate Binary Search Tree (Medium) · pattern: Binary search tree · the mistake to build the trap on: **Checking only immediate children**

### Heap — 6

- [ ] `lc-1046` — Last Stone Weight (Easy) · pattern: Heap / top K · the mistake to build the trap on: **Using default min-heap in Java**
- [ ] `lc-215` — Kth Largest Element in an Array (Medium) · pattern: Heap / top K · the mistake to build the trap on: **Using a max-heap of size n**
- [ ] `lc-23` — Merge k Sorted Lists (Hard) · pattern: Heap / top K · the mistake to build the trap on: **Adding null list heads to heap**
- [ ] `lc-253` — Meeting Rooms II (Medium) · pattern: Heap / top K · the mistake to build the trap on: **Strict inequality on room reuse**
- [ ] `lc-295` — Find Median from Data Stream (Hard) · pattern: Heap / top K · the mistake to build the trap on: **Integer division truncating median**
- [ ] `lc-973` — K Closest Points to Origin (Medium) · pattern: Heap / top K · the mistake to build the trap on: **Computing square roots unnecessarily**

### Graphs — 11

- [ ] `lc-127` — Word Ladder (Hard) · pattern: Breadth-first search · the mistake to build the trap on: **Linear dictionary scanning**
- [ ] `lc-130` — Surrounded Regions (Medium) · pattern: Boundary flood fill · the mistake to build the trap on: **Flipping border cells**
- [ ] `lc-133` — Clone Graph (Medium) · pattern: Graph search · the mistake to build the trap on: **Infinite recursion on cycles**
- [ ] `lc-210` — Course Schedule II (Medium) · pattern: Topological sort · the mistake to build the trap on: **Returning partial array on cycle**
- [ ] `lc-269` — Alien Dictionary (Hard) · pattern: Topological sort · the mistake to build the trap on: **Missing prefix validation**
- [ ] `lc-286` — Walls and Gates (Medium) · pattern: Multi-source BFS · the mistake to build the trap on: **Searching from empty rooms to gates**
- [ ] `lc-417` — Pacific Atlantic Water Flow (Medium) · pattern: Multi-source BFS · the mistake to build the trap on: **Searching downhill from all cells**
- [ ] `lc-542` — 01 Matrix (Medium) · pattern: Multi-source BFS · the mistake to build the trap on: **Starting search from ones instead of zeros**
- [ ] `lc-547` — Number of Provinces (Medium) · pattern: Graph search · the mistake to build the trap on: **Counting every connection as a province**
- [ ] `lc-743` — Network Delay Time (Medium) · pattern: Shortest path · the mistake to build the trap on: **Forgetting stale entries in priority queue**
- [ ] `lc-787` — Cheapest Flights Within K Stops (Medium) · pattern: Shortest path · the mistake to build the trap on: **Chaining flights in a single round**

### Backtracking — 9

- [ ] `lc-131` — Palindrome Partitioning (Medium) · pattern: Backtracking · the mistake to build the trap on: **Adding path reference directly**
- [ ] `lc-17` — Letter Combinations of a Phone Number (Medium) · pattern: Backtracking · the mistake to build the trap on: **Returning list with empty string for empty input**
- [ ] `lc-22` — Generate Parentheses (Medium) · pattern: Constrained backtracking · the mistake to build the trap on: **Allowing close bracket before open bracket**
- [ ] `lc-39` — Combination Sum (Medium) · pattern: Backtracking · the mistake to build the trap on: **Recursing on i + 1 instead of i**
- [ ] `lc-46` — Permutations (Medium) · pattern: Permutations · the mistake to build the trap on: **Starting loop from current index**
- [ ] `lc-51` — N-Queens (Hard) · pattern: N-Queens · the mistake to build the trap on: **Negative array index for diagonal calculation**
- [ ] `lc-78` — Subsets (Medium) · pattern: Subsets · the mistake to build the trap on: **Adding path without copying**
- [ ] `lc-79` — Word Search (Medium) · pattern: Grid search · the mistake to build the trap on: **Reusing the same cell twice**
- [ ] `lc-90` — Subsets II (Medium) · pattern: Subsets with duplicates · the mistake to build the trap on: **Checking i > 0 instead of i > start**

### Dynamic programming — 12

- [ ] `lc-139` — Word Break (Medium) · pattern: 1-D DP · the mistake to build the trap on: **Using wordDict list directly**
- [ ] `lc-152` — Maximum Product Subarray (Medium) · pattern: Dynamic programming · the mistake to build the trap on: **Forgetting negative times negative is positive**
- [ ] `lc-198` — House Robber (Medium) · pattern: 1-D DP · the mistake to build the trap on: **Odd versus even index trap**
- [ ] `lc-213` — House Robber II (Medium) · pattern: 1-D DP · the mistake to build the trap on: **Missing single-house base condition**
- [ ] `lc-221` — Maximal Square (Medium) · pattern: 2-D DP · the mistake to build the trap on: **Returning side length instead of area**
- [ ] `lc-300` — Longest Increasing Subsequence (Medium) · pattern: Patience sorting · the mistake to build the trap on: **Assuming tails represents the actual subsequence**
- [ ] `lc-416` — Partition Equal Subset Sum (Medium) · pattern: 0/1 Knapsack · the mistake to build the trap on: **Walking the sum loop forward**
- [ ] `lc-62` — Unique Paths (Medium) · pattern: 2-D DP · the mistake to build the trap on: **Integer overflow in combination formula**
- [ ] `lc-647` — Palindromic Substrings (Medium) · pattern: Center expansion · the mistake to build the trap on: **Missing even-length centers**
- [ ] `lc-70` — Climbing Stairs (Easy) · pattern: 1-D DP · the mistake to build the trap on: **Uncached recursive branching**
- [ ] `lc-72` — Edit Distance (Medium) · pattern: 2-D DP · the mistake to build the trap on: **Adding cost on matching characters**
- [ ] `lc-91` — Decode Ways (Medium) · pattern: 1-D DP · the mistake to build the trap on: **Treating '0' as valid single digit**

### Trie and union find — 6

- [ ] `lc-208` — Implement Trie (Prefix Tree) (Medium) · pattern: Trie · the mistake to build the trap on: **Confusing search with startsWith**
- [ ] `lc-211` — Design Add and Search Words Data Structure (Medium) · pattern: Trie · the mistake to build the trap on: **Checking null child branches without guard**
- [ ] `lc-212` — Word Search II (Hard) · pattern: Trie · the mistake to build the trap on: **Duplicate words in output list**
- [ ] `lc-323` — Number of Connected Components in an Undirected Graph (Medium) · pattern: Union find · the mistake to build the trap on: **Unioning nodes directly instead of their roots**
- [ ] `lc-684` — Redundant Connection (Medium) · pattern: Union find · the mistake to build the trap on: **One-based indexing off-by-one error**
- [ ] `lc-721` — Accounts Merge (Medium) · pattern: Union find · the mistake to build the trap on: **Merging accounts by name instead of email**

### Design — 7

- [ ] `lc-355` — Design Twitter (Medium) · pattern: Heap / Hash map · the mistake to build the trap on: **Excluding the user's own tweets from their feed**
- [ ] `lc-362` — Design Hit Counter (Medium) · pattern: Circular bucket counter · the mistake to build the trap on: **Failing to overwrite stale second values**
- [ ] `lc-380` — Insert Delete GetRandom O(1) (Medium) · pattern: Array with map index · the mistake to build the trap on: **Updating map index before removing target**
- [ ] `lc-535` — Encode and Decode TinyURL (Medium) · pattern: Base62 encoding · the mistake to build the trap on: **Hashing without collision handling**
- [ ] `lc-706` — Design HashMap (Easy) · pattern: Separate chaining · the mistake to build the trap on: **Adding duplicate keys during put**
- [ ] `lc-895` — Maximum Frequency Stack (Hard) · pattern: Frequency stack · the mistake to build the trap on: **Moving elements between stacks on push**
- [ ] `lc-981` — Time Based Key-Value Store (Medium) · pattern: Binary search on time · the mistake to build the trap on: **Returning exact match only**

### Matrix — 3

- [ ] `lc-48` — Rotate Image (Medium) · pattern: Matrix · the mistake to build the trap on: **Swapping across the diagonal twice**
- [ ] `lc-54` — Spiral Matrix (Medium) · pattern: Matrix · the mistake to build the trap on: **Missing checks before bottom and left sweeps**
- [ ] `lc-73` — Set Matrix Zeroes (Medium) · pattern: Matrix · the mistake to build the trap on: **Zeroing cells during the first scan**

## Report (after the first story, then after each topic)

1. Stories finished: slug, frames per example, the view used (existing or new), the metaphor.
2. For each: the exact quiz questions asked, and in which frame the trap is drawn.
3. The final lines of every check you ran. Report only checks you actually ran.
4. Anything skipped or uncertain, and any disagreement with a Solution entry.
