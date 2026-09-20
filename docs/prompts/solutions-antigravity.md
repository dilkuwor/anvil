# Task: write the "Solution" tab content for 81 coding problems (Antigravity)

You are working in the **Anvil** repository (an interview-prep app). Each coding problem page has a
**Solution** tab: a short written reference with the idea, the approaches with Java code, a
walkthrough, common mistakes, test inputs, an interview script and follow-ups. The content lives in
Python seed files and is loaded into the database later by the owner.

One problem (`lc-3`) is finished and **approved**. Your job is to write the same thing, to the same
standard, for the problems assigned to you below.

**Another AI tool is doing the other half of the catalog at the same time.** You each own different
files. Stay inside yours.

## Read these first (in this order)

1. `database/seeds/solutions/SOLUTION_GUIDE.md` — the rules. Follow it exactly.
2. `database/seeds/solutions/sliding_window.py` — the approved `lc-3` entry. **Copy its tone, length and structure.**
3. `database/seeds/solutions/_stories.json` — problems that have a Visual Story; your text must agree with it (the guide explains how).
4. `backend/tests/test_solution_content.py` — the automatic rules your content must pass.
5. `backend/scripts/check_solutions.py` — runs your Java on the real judge.

Who the reader is: someone recovering from a brain injury who is preparing for software interviews.
Short sentences. Plain words. One idea at a time. Correct above all. This is the point of the whole
feature — do not write like a textbook or like LeetCode editorial.

## Files you own (create them; touch nothing else)

- `database/seeds/solutions/trees.py`
- `database/seeds/solutions/dynamic_programming.py`
- `database/seeds/solutions/backtracking.py`
- `database/seeds/solutions/design.py`
- `database/seeds/solutions/graphs.py`
- `database/seeds/solutions/heap.py`
- `database/seeds/solutions/trie_union_find.py`
- `database/seeds/solutions/matrix.py`

Create each file with the header `from __future__ import annotations` and `SOLUTIONS: list[dict] = [...]`. Do not open or edit `sliding_window.py` except to read the approved example.

**Do NOT edit:** `SOLUTION_GUIDE.md`, `__init__.py`, `_stories.json`, ``arrays.py`, `two_pointers.py`` or any file
in the other tool's list, anything under `backend/app`, `backend/tests`, `backend/scripts`,
`backend/alembic`, or `frontend/`. Do not run migrations. Do not run the seeder. Do not commit.
Do not touch the database except through the read-only checker.

## How to get each problem's details

Every problem is in the database. From `backend/`:

```bash
.venv/bin/python - <<'PY'
import app.main
from sqlalchemy import select
from app.common.database import SessionLocal
from app.problems.models import Problem
p = SessionLocal().scalar(select(Problem).where(Problem.slug == "lc-11"))
print(p.title, p.difficulty, [t.name for t in p.tags]); print(p.description); print(p.constraints)
print(p.examples); print(p.function_signature); print(p.starter_code)
print(p.time_complexity, p.space_complexity); print(p.hints); print(p.explanation)
print(p.reference_solution)   # a correct best approach: reuse it, tidy the names
PY
```

To check that a slug exists before using it in `related_slugs`:
`select(Problem.slug).where(Problem.slug.in_([...]))` — or look at `frontend/src/components/story/known-problems.ts`, which lists every slug with its title.

## Notes for your half

Your topics are the harder ones to explain. Extra care:

- **Trees / graphs:** the walkthrough table should list the nodes in the order they are visited, with what the queue/stack/recursion holds at each step. Say what BFS/DFS *does* the first time you use the word.
- **Dynamic programming:** state in words what one table cell *means* before giving the formula. The slow approach is usually plain recursion; give its real cost.
- **Backtracking:** the walkthrough shows choose → explore → un-choose on a tiny input (3 items at most).
- **Design problems (`design.py`):** the judge drives a class through a list of operations. Read the problem's `function_signature` and `reference_solution` carefully and mirror their class layout. If the checker cannot run one, skip it and report it.
- Recursion depth counts as space. Say so in `space_why`.

## How to work

1. **Do 3 problems first**, from your first file. Run both checks (below). Fix until clean. Only then continue — this catches misunderstandings early.
2. Work **one file at a time**. After each file, run both checks for that file and fix everything before starting the next file.
3. For each problem: read it → decide the 2–3 approaches → write and *mentally run* the Java → pick the smallest example that shows the key moment (ideally the one that triggers the first mistake) → write the rest.
4. Java must be a complete file with `class Solution` and the problem's exact method signature (see `function_signature` / `starter_code`). Helper types `ListNode` and `TreeNode` are provided by the judge — do not redefine them. Design problems need the supporting class the signature expects (see the problem's `reference_solution`).
5. The slow approach must still be **correct** — it may only be slow. The checker allows it to time out on big tests but never to give a wrong answer.

## The two checks (both must be clean for every file)

```bash
cd backend
.venv/bin/python -m pytest tests/test_solution_content.py -q
.venv/bin/python scripts/check_solutions.py --file <file_name_without_py>
```

Never edit a test or the checker to make something pass. If a rule truly cannot fit a problem
(for example a design problem the judge harness cannot run), **skip that problem** and list it in
your report with the reason.

## Quality bar — reread before each file

- Would a tired person understand each sentence on first read? If not, shorten it.
- Does every cost (`time_why`, `space_why`) point at something concrete in the algorithm?
- Is the walkthrough table small (3–9 rows) and does it show the moment that matters?
- Is the first mistake the one people really make on this problem (and, for story problems, the story's trap by the same name)?
- Does the interview script sound like a person talking, in the first person, 4–6 lines?
- Are the follow-ups ones an interviewer would actually ask about *this* problem?
- No filler, no praise, no exclamation marks, no emoji, no banned words (see the guide).

## Your problems (81)

Tick them off as you go. "has a Visual Story" means the entry must agree with `_stories.json`.
"also serves" means put both slugs in that entry's `slugs` list.

### `database/seeds/solutions/trees.py` — 21 problems

- [ ] `lc-100` — Same Tree (Easy)
- [ ] `lc-101` — Symmetric Tree (Easy)
- [ ] `lc-102` — Binary Tree Level Order Traversal (Medium) · **has a Visual Story** · also serves `level-walk`
- [ ] `lc-103` — Binary Tree Zigzag Level Order Traversal (Medium)
- [ ] `lc-104` — Maximum Depth of Binary Tree (Easy)
- [ ] `lc-105` — Construct Binary Tree from Preorder and Inorder Traversal (Medium)
- [ ] `lc-108` — Convert Sorted Array to Binary Search Tree (Easy)
- [ ] `lc-110` — Balanced Binary Tree (Easy)
- [ ] `lc-112` — Path Sum (Easy)
- [ ] `lc-124` — Binary Tree Maximum Path Sum (Hard)
- [ ] `lc-199` — Binary Tree Right Side View (Medium)
- [ ] `lc-226` — Invert Binary Tree (Easy)
- [ ] `lc-230` — Kth Smallest Element in a BST (Medium)
- [ ] `lc-235` — Lowest Common Ancestor of a Binary Search Tree (Medium)
- [ ] `lc-236` — Lowest Common Ancestor of a Binary Tree (Medium) · **has a Visual Story** · also serves `shared-ancestor`
- [ ] `lc-297` — Serialize and Deserialize Binary Tree (Hard)
- [ ] `lc-543` — Diameter of Binary Tree (Easy)
- [ ] `lc-572` — Subtree of Another Tree (Easy)
- [ ] `lc-863` — All Nodes Distance K in Binary Tree (Medium)
- [ ] `lc-94` — Binary Tree Inorder Traversal (Easy)
- [ ] `lc-98` — Validate Binary Search Tree (Medium)

### `database/seeds/solutions/heap.py` — 6 problems

- [ ] `lc-1046` — Last Stone Weight (Easy)
- [ ] `lc-215` — Kth Largest Element in an Array (Medium)
- [ ] `lc-23` — Merge k Sorted Lists (Hard)
- [ ] `lc-253` — Meeting Rooms II (Medium)
- [ ] `lc-295` — Find Median from Data Stream (Hard)
- [ ] `lc-973` — K Closest Points to Origin (Medium)

### `database/seeds/solutions/dynamic_programming.py` — 14 problems

- [ ] `lc-1143` — Longest Common Subsequence (Medium) · **has a Visual Story**
- [ ] `lc-139` — Word Break (Medium)
- [ ] `lc-152` — Maximum Product Subarray (Medium)
- [ ] `lc-198` — House Robber (Medium)
- [ ] `lc-213` — House Robber II (Medium)
- [ ] `lc-221` — Maximal Square (Medium)
- [ ] `lc-300` — Longest Increasing Subsequence (Medium)
- [ ] `lc-322` — Coin Change (Medium) · **has a Visual Story**
- [ ] `lc-416` — Partition Equal Subset Sum (Medium)
- [ ] `lc-62` — Unique Paths (Medium)
- [ ] `lc-647` — Palindromic Substrings (Medium)
- [ ] `lc-70` — Climbing Stairs (Easy)
- [ ] `lc-72` — Edit Distance (Medium)
- [ ] `lc-91` — Decode Ways (Medium)

### `database/seeds/solutions/graphs.py` — 14 problems

- [ ] `lc-127` — Word Ladder (Hard)
- [ ] `lc-130` — Surrounded Regions (Medium)
- [ ] `lc-133` — Clone Graph (Medium)
- [ ] `lc-200` — Number of Islands (Medium) · **has a Visual Story**
- [ ] `lc-207` — Course Schedule (Medium) · **has a Visual Story**
- [ ] `lc-210` — Course Schedule II (Medium)
- [ ] `lc-269` — Alien Dictionary (Hard)
- [ ] `lc-286` — Walls and Gates (Medium)
- [ ] `lc-417` — Pacific Atlantic Water Flow (Medium)
- [ ] `lc-542` — 01 Matrix (Medium)
- [ ] `lc-547` — Number of Provinces (Medium)
- [ ] `lc-743` — Network Delay Time (Medium)
- [ ] `lc-787` — Cheapest Flights Within K Stops (Medium)
- [ ] `lc-994` — Rotting Oranges (Medium) · **has a Visual Story**

### `database/seeds/solutions/backtracking.py` — 9 problems

- [ ] `lc-131` — Palindrome Partitioning (Medium)
- [ ] `lc-17` — Letter Combinations of a Phone Number (Medium)
- [ ] `lc-22` — Generate Parentheses (Medium)
- [ ] `lc-39` — Combination Sum (Medium)
- [ ] `lc-46` — Permutations (Medium)
- [ ] `lc-51` — N-Queens (Hard)
- [ ] `lc-78` — Subsets (Medium)
- [ ] `lc-79` — Word Search (Medium)
- [ ] `lc-90` — Subsets II (Medium)

### `database/seeds/solutions/design.py` — 8 problems

- [ ] `lc-146` — LRU Cache (Medium) · **has a Visual Story**
- [ ] `lc-355` — Design Twitter (Medium)
- [ ] `lc-362` — Design Hit Counter (Medium)
- [ ] `lc-380` — Insert Delete GetRandom O(1) (Medium)
- [ ] `lc-535` — Encode and Decode TinyURL (Medium)
- [ ] `lc-706` — Design HashMap (Easy)
- [ ] `lc-895` — Maximum Frequency Stack (Hard)
- [ ] `lc-981` — Time Based Key-Value Store (Medium)

### `database/seeds/solutions/trie_union_find.py` — 6 problems

- [ ] `lc-208` — Implement Trie (Prefix Tree) (Medium)
- [ ] `lc-211` — Design Add and Search Words Data Structure (Medium)
- [ ] `lc-212` — Word Search II (Hard)
- [ ] `lc-323` — Number of Connected Components in an Undirected Graph (Medium)
- [ ] `lc-684` — Redundant Connection (Medium)
- [ ] `lc-721` — Accounts Merge (Medium)

### `database/seeds/solutions/matrix.py` — 3 problems

- [ ] `lc-48` — Rotate Image (Medium)
- [ ] `lc-54` — Spiral Matrix (Medium)
- [ ] `lc-73` — Set Matrix Zeroes (Medium)

## When you finish, report

1. Per file: how many problems written, and the final output of both checks.
2. Any problem you skipped, with the reason.
3. Any slug in `related_slugs` you were unsure about.
4. Anything in the guide, the tests or the checker that you think is wrong (do not change it — report it).
