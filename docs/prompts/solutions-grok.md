# Task: write the "Solution" tab content for 90 coding problems (Grok)

> **Update — the rules were tightened after the first review. Re-read `SOLUTION_GUIDE.md` and
> `backend/tests/test_solution_content.py` before you continue, and bring the entries you have
> already written up to the new rules.** In short: `pattern` is a short name (≤ 32 characters); the
> first approach must really cost more than the best one; steps are whole sentences; 3–4 mistakes,
> 4–6 test inputs, 3–4 follow-ups; no shop talk (memo, base case, subproblem, populate, traverse,
> iterate); the interview script states the cost of the obvious way AND the better way and ends with
> what you would test, with no filler like "In my analysis…"; the walkthrough example must reach the
> first mistake. The approved `lc-3` entry passes all of this — keep copying it.

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

- `database/seeds/solutions/arrays.py`
- `database/seeds/solutions/two_pointers.py`
- `database/seeds/solutions/sliding_window.py`
- `database/seeds/solutions/stack.py`
- `database/seeds/solutions/binary_search.py`
- `database/seeds/solutions/linked_list.py`
- `database/seeds/solutions/hashmap.py`
- `database/seeds/solutions/strings.py`
- `database/seeds/solutions/greedy.py`
- `database/seeds/solutions/intervals.py`
- `database/seeds/solutions/math_bits.py`

`sliding_window.py` already exists with the approved `lc-3` entry: **add your entries to its `SOLUTIONS` list and do not change the `lc-3` entry.** Create the other files with the same header (`from __future__ import annotations` and `SOLUTIONS: list[dict] = [...]`).

**Do NOT edit:** `SOLUTION_GUIDE.md`, `__init__.py`, `_stories.json`, ``trees.py`, `graphs.py`` or any file
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

## Your problems (90)

Tick them off as you go. "has a Visual Story" means the entry must agree with `_stories.json`.
"also serves" means put both slugs in that entry's `slugs` list.

### `database/seeds/solutions/strings.py` — 5 problems

- [ ] `anagram-bundles` — Anagram Bundles (Medium)
- [ ] `lc-151` — Reverse Words in a String (Medium)
- [ ] `lc-273` — Integer to English Words (Hard)
- [ ] `lc-5` — Longest Palindromic Substring (Medium)
- [ ] `lc-8` — String to Integer (atoi) (Medium)

### `database/seeds/solutions/stack.py` — 10 problems

- [ ] `balanced-brackets` — Balanced Brackets (Easy)
- [ ] `lc-150` — Evaluate Reverse Polish Notation (Medium)
- [ ] `lc-155` — Min Stack (Medium)
- [ ] `lc-20` — Valid Parentheses (Easy)
- [ ] `lc-227` — Basic Calculator II (Medium)
- [ ] `lc-394` — Decode String (Medium)
- [ ] `lc-71` — Simplify Path (Medium)
- [ ] `lc-739` — Daily Temperatures (Medium) · **has a Visual Story**
- [ ] `lc-84` — Largest Rectangle in Histogram (Hard) · **has a Visual Story**
- [ ] `minimum-tracker-stack` — Minimum Tracker Stack (Medium)

### `database/seeds/solutions/arrays.py` — 12 problems

- [ ] `first-and-last-position` — First and Last Position (Medium)
- [ ] `lc-121` — Best Time to Buy and Sell Stock (Easy)
- [ ] `lc-169` — Majority Element (Easy)
- [ ] `lc-189` — Rotate Array (Medium)
- [ ] `lc-238` — Product of Array Except Self (Medium)
- [ ] `lc-31` — Next Permutation (Medium)
- [ ] `lc-41` — First Missing Positive (Hard)
- [ ] `lc-53` — Maximum Subarray (Medium)
- [ ] `merged-median` — Merged Median (Hard)
- [ ] `missing-range-value` — Missing Range Value (Easy)
- [ ] `pair-target` — Pair Target (Easy)
- [ ] `single-pass-profit` — Single Pass Profit (Easy)

### `database/seeds/solutions/hashmap.py` — 7 problems

- [ ] `lc-1` — Two Sum (Easy)
- [ ] `lc-128` — Longest Consecutive Sequence (Medium)
- [ ] `lc-217` — Contains Duplicate (Easy)
- [ ] `lc-242` — Valid Anagram (Easy)
- [ ] `lc-347` — Top K Frequent Elements (Medium)
- [ ] `lc-49` — Group Anagrams (Medium)
- [ ] `lc-560` — Subarray Sum Equals K (Medium)

### `database/seeds/solutions/sliding_window.py` — 9 problems

- [ ] `lc-1004` — Max Consecutive Ones III (Medium)
- [ ] `lc-209` — Minimum Size Subarray Sum (Medium)
- [ ] `lc-239` — Sliding Window Maximum (Hard)
- [ ] `lc-340` — Longest Substring with At Most K Distinct Characters (Medium)
- [ ] `lc-424` — Longest Repeating Character Replacement (Medium)
- [ ] `lc-438` — Find All Anagrams in a String (Medium)
- [ ] `lc-567` — Permutation in String (Medium)
- [ ] `lc-76` — Minimum Window Substring (Hard) · **has a Visual Story**
- [ ] `lc-904` — Fruit Into Baskets (Medium)

### `database/seeds/solutions/binary_search.py` — 10 problems

- [ ] `lc-1011` — Capacity To Ship Packages Within D Days (Medium)
- [ ] `lc-153` — Find Minimum in Rotated Sorted Array (Medium)
- [ ] `lc-162` — Find Peak Element (Medium)
- [ ] `lc-278` — First Bad Version (Easy)
- [ ] `lc-33` — Search in Rotated Sorted Array (Medium) · **has a Visual Story**
- [ ] `lc-34` — Find First and Last Position of Element in Sorted Array (Medium)
- [ ] `lc-4` — Median of Two Sorted Arrays (Hard)
- [ ] `lc-704` — Binary Search (Easy)
- [ ] `lc-74` — Search a 2D Matrix (Medium)
- [ ] `lc-875` — Koko Eating Bananas (Medium) · **has a Visual Story**

### `database/seeds/solutions/two_pointers.py` — 10 problems

- [ ] `lc-11` — Container With Most Water (Medium) · **has a Visual Story** · also serves `widest-water-basin`
- [ ] `lc-125` — Valid Palindrome (Easy)
- [ ] `lc-15` — 3Sum (Medium) · **has a Visual Story**
- [ ] `lc-16` — 3Sum Closest (Medium)
- [ ] `lc-167` — Two Sum II - Input Array Is Sorted (Medium)
- [ ] `lc-26` — Remove Duplicates from Sorted Array (Easy)
- [ ] `lc-283` — Move Zeroes (Easy)
- [ ] `lc-42` — Trapping Rain Water (Hard) · **has a Visual Story** · also serves `valley-rain`
- [ ] `lc-680` — Valid Palindrome II (Easy)
- [ ] `lc-88` — Merge Sorted Array (Easy)

### `database/seeds/solutions/greedy.py` — 6 problems

- [ ] `lc-122` — Best Time to Buy and Sell Stock II (Medium)
- [ ] `lc-134` — Gas Station (Medium)
- [ ] `lc-45` — Jump Game II (Medium)
- [ ] `lc-55` — Jump Game (Medium)
- [ ] `lc-621` — Task Scheduler (Medium)
- [ ] `lc-763` — Partition Labels (Medium)

### `database/seeds/solutions/math_bits.py` — 7 problems

- [ ] `lc-136` — Single Number (Easy)
- [ ] `lc-191` — Number of 1 Bits (Easy)
- [ ] `lc-268` — Missing Number (Easy)
- [ ] `lc-338` — Counting Bits (Easy)
- [ ] `lc-43` — Multiply Strings (Medium)
- [ ] `lc-50` — Pow(x, n) (Medium)
- [ ] `mirror-number` — Mirror Number (Easy)

### `database/seeds/solutions/linked_list.py` — 11 problems

- [ ] `lc-138` — Copy List with Random Pointer (Medium)
- [ ] `lc-141` — Linked List Cycle (Easy) · **has a Visual Story** · also serves `cycle-in-a-chain`
- [ ] `lc-143` — Reorder List (Medium)
- [ ] `lc-148` — Sort List (Medium)
- [ ] `lc-160` — Intersection of Two Linked Lists (Easy)
- [ ] `lc-19` — Remove Nth Node From End of List (Medium)
- [ ] `lc-2` — Add Two Numbers (Medium)
- [ ] `lc-206` — Reverse Linked List (Easy) · **has a Visual Story**
- [ ] `lc-21` — Merge Two Sorted Lists (Easy)
- [ ] `lc-234` — Palindrome Linked List (Easy)
- [ ] `lc-25` — Reverse Nodes in k-Group (Hard) · **has a Visual Story**

### `database/seeds/solutions/intervals.py` — 3 problems

- [ ] `lc-435` — Non-overlapping Intervals (Medium)
- [ ] `lc-56` — Merge Intervals (Medium) · **has a Visual Story**
- [ ] `lc-57` — Insert Interval (Medium)

## When you finish, report

1. Per file: how many problems written, and the final output of both checks.
2. Any problem you skipped, with the reason.
3. Any slug in `related_slugs` you were unsure about.
4. Anything in the guide, the tests or the checker that you think is wrong (do not change it — report it).
