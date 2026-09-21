# Task: write Visual Stories for 78 coding problems (Grok)

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
- **New view files, only if needed:** `grok-<what-it-draws>-view.tsx` (the `grok-` prefix keeps your
  names apart from the other tool's). Must end in `-view.tsx` so the picture tests find it.
- **Your registry:** `registry-grok.ts`. Import each finished story and add it to `GROK_STORIES`.

**Read-only for you:** `types.ts`, `view-kit.tsx`, `story-player.tsx`, `story.test.ts`, `registry.ts`,
`registry-agy.ts`, `known-problems.ts`, `STORY_GUIDE.md`, `story-badge.tsx`, every existing story and
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
npx tsc --noEmit 2>&1 | grep -E "components/story/(stories/<yours>|grok-|registry-grok)"
npx eslint src/components/story/stories/<yours>.ts src/components/story/grok-*.tsx src/components/story/registry-grok.ts
```

Then print the story and read it: write a throwaway `zz-grok-dump.test.ts` in the story folder that
prints scene, caption, codeLine and quiz question for every frame of every example, run it, **delete it**.
Hand-check the first example against the real algorithm, step by step.

Never edit a test to get a pass. Errors in files that are not yours (the other tool is working) are
not yours to fix — ignore them.

## Notes for your half (arrays, pointers, windows, stacks, search, lists)

- **Sliding window (8):** reuse the caterpillar (`string-window-view.tsx`) or the checklist view. These are
  siblings of the reference story; keep the same words (head, tail, body) so the family reads as one.
- **Two pointers / arrays on sorted data:** the peg-and-calipers or walls views usually fit.
- **Stack (8):** most are "who is still waiting for an answer" problems: the waiting room view. For
  bracket matching and expression problems draw a real stack of plates/trays in your own view.
- **Binary search (8):** the ramp view or the dial view. Show the half that is thrown away fading out.
- **Linked list (8):** the train view handles any rewiring; draw `null` boxes; refer to cars by the value shown.
- **Hash map (7) and arrays (12):** you will likely need one simple new view: number boxes plus a
  "notebook" (the map) drawn as pairs, with an arc linking a box to its notebook entry.
- **Math and bits (7):** draw the bits as a row of 0/1 boxes; one bit changes per frame.

## Your problems (78)

Order: start with the topics that can reuse an existing view. Tick them off as you go.

### Strings — 5

- [ ] `anagram-bundles` — Anagram Bundles (Medium) · pattern: Hash map · the mistake to build the trap on: **Letters as a set**
- [ ] `lc-151` — Reverse Words in a String (Medium) · pattern: Reverse in place · the mistake to build the trap on: **split on one space**
- [ ] `lc-273` — Integer to English Words (Hard) · pattern: Digit grouping · the mistake to build the trap on: **Zero groups**
- [ ] `lc-5` — Longest Palindromic Substring (Medium) · pattern: Expand around center · the mistake to build the trap on: **Missing even centers**
- [ ] `lc-8` — String to Integer (atoi) (Medium) · pattern: String parsing · the mistake to build the trap on: **Overflow after the multiply**

### Stack — 8

- [ ] `balanced-brackets` — Balanced Brackets (Easy) · pattern: Stack · the mistake to build the trap on: **Counting kinds, ignoring order**
- [ ] `lc-150` — Evaluate Reverse Polish Notation (Medium) · pattern: Stack · the mistake to build the trap on: **Operand order**
- [ ] `lc-155` — Min Stack (Medium) · pattern: Design: min stack · the mistake to build the trap on: **One min field that never comes back**
- [ ] `lc-20` — Valid Parentheses (Easy) · pattern: Stack · the mistake to build the trap on: **Crossing pairs**
- [ ] `lc-227` — Basic Calculator II (Medium) · pattern: Stack · the mistake to build the trap on: **Left to right with no precedence**
- [ ] `lc-394` — Decode String (Medium) · pattern: Stack · the mistake to build the trap on: **Single-digit counts only**
- [ ] `lc-71` — Simplify Path (Medium) · pattern: Stack · the mistake to build the trap on: **Going above root**
- [ ] `minimum-tracker-stack` — Minimum Tracker Stack (Medium) · pattern: Design: min stack · the mistake to build the trap on: **Pushing the min only when val is strictly smaller**

### Arrays — 12

- [ ] `first-and-last-position` — First and Last Position (Medium) · pattern: Binary search · the mistake to build the trap on: **One search, then a linear walk**
- [ ] `lc-121` — Best Time to Buy and Sell Stock (Easy) · pattern: One pass, running minimum · the mistake to build the trap on: **Selling on the buy day**
- [ ] `lc-169` — Majority Element (Easy) · pattern: Boyer-Moore voting · the mistake to build the trap on: **Sorting and picking the middle**
- [ ] `lc-189` — Rotate Array (Medium) · pattern: In-place reverse · the mistake to build the trap on: **Forgetting k modulo n**
- [ ] `lc-238` — Product of Array Except Self (Medium) · pattern: Prefix and suffix products · the mistake to build the trap on: **Using division**
- [ ] `lc-31` — Next Permutation (Medium) · pattern: Next permutation in place · the mistake to build the trap on: **Using > instead of >= on the pivot walk**
- [ ] `lc-41` — First Missing Positive (Hard) · pattern: Index as a hash table · the mistake to build the trap on: **Using if instead of while**
- [ ] `lc-53` — Maximum Subarray (Medium) · pattern: Kadane, best run ending here · the mistake to build the trap on: **Starting best at 0**
- [ ] `merged-median` — Merged Median (Hard) · pattern: Binary search on a partition · the mistake to build the trap on: **Searching the longer array**
- [ ] `missing-range-value` — Missing Range Value (Easy) · pattern: XOR or sum of 0..n · the mistake to build the trap on: **Forgetting to xor n**
- [ ] `pair-target` — Pair Target (Easy) · pattern: Hash map of seen values · the mistake to build the trap on: **Using the same index twice**
- [ ] `single-pass-profit` — Single Pass Profit (Easy) · pattern: One pass, running minimum · the mistake to build the trap on: **Updating min after a same-day sale**

### Hash map — 7

- [ ] `lc-1` — Two Sum (Easy) · pattern: Hash map · the mistake to build the trap on: **Using the same index twice**
- [ ] `lc-128` — Longest Consecutive Sequence (Medium) · pattern: Hash set · the mistake to build the trap on: **Starting a run at every value**
- [ ] `lc-217` — Contains Duplicate (Easy) · pattern: Hash set · the mistake to build the trap on: **Sorting in place without asking**
- [ ] `lc-242` — Valid Anagram (Easy) · pattern: Frequency count · the mistake to build the trap on: **Skipping the length check**
- [ ] `lc-347` — Top K Frequent Elements (Medium) · pattern: Frequency count · the mistake to build the trap on: **Max-heap of size n**
- [ ] `lc-49` — Group Anagrams (Medium) · pattern: Hash map · the mistake to build the trap on: **Using a set of letters as the key**
- [ ] `lc-560` — Subarray Sum Equals K (Medium) · pattern: Prefix sum · the mistake to build the trap on: **Using a sliding window**

### Sliding window — 8

- [ ] `lc-1004` — Max Consecutive Ones III (Medium) · pattern: Sliding window, at most k zeros · the mistake to build the trap on: **k = 0 and a zero**
- [ ] `lc-209` — Minimum Size Subarray Sum (Medium) · pattern: Sliding window, positives · the mistake to build the trap on: **Using this window when values can be negative**
- [ ] `lc-239` — Sliding Window Maximum (Hard) · pattern: Monotonic deque, sliding window · the mistake to build the trap on: **Storing values, not indices**
- [ ] `lc-340` — Longest Substring with At Most K Distinct Characters (Medium) · pattern: Window, at most k distinct · the mistake to build the trap on: **k = 0**
- [ ] `lc-424` — Longest Repeating Character Replacement (Medium) · pattern: Sliding window, replacements · the mistake to build the trap on: **Recomputing maxCount on every shrink**
- [ ] `lc-438` — Find All Anagrams in a String (Medium) · pattern: Fixed window, anagrams · the mistake to build the trap on: **Window off-by-one**
- [ ] `lc-567` — Permutation in String (Medium) · pattern: Fixed window, anagrams · the mistake to build the trap on: **Checking subsequence, not substring**
- [ ] `lc-904` — Fruit Into Baskets (Medium) · pattern: Window, at most 2 distinct · the mistake to build the trap on: **Restarting at the third kind**

### Binary search — 8

- [ ] `lc-1011` — Capacity To Ship Packages Within D Days (Medium) · pattern: Binary search on the answer · the mistake to build the trap on: **Capacity below the heaviest package**
- [ ] `lc-153` — Find Minimum in Rotated Sorted Array (Medium) · pattern: Binary search on a rotated row · the mistake to build the trap on: **Comparing mid with the left end**
- [ ] `lc-162` — Find Peak Element (Medium) · pattern: Binary search on a peak · the mistake to build the trap on: **Reading nums[mid + 1] when mid is the last index**
- [ ] `lc-278` — First Bad Version (Easy) · pattern: Binary search on a yes/no prefix · the mistake to build the trap on: **Overflow in the middle index**
- [ ] `lc-34` — Find First and Last Position of Element in Sorted Array (Medium) · pattern: Binary search for a range · the mistake to build the trap on: **One search, then a linear walk**
- [ ] `lc-4` — Median of Two Sorted Arrays (Hard) · pattern: Binary search on a partition · the mistake to build the trap on: **Searching the longer array**
- [ ] `lc-704` — Binary Search (Easy) · pattern: Binary search · the mistake to build the trap on: **Overflow in the middle index**
- [ ] `lc-74` — Search a 2D Matrix (Medium) · pattern: Binary search on a flat matrix · the mistake to build the trap on: **Using the wrong column count in the map**

### Greedy — 6

- [ ] `lc-122` — Best Time to Buy and Sell Stock II (Medium) · pattern: Greedy: every uphill step · the mistake to build the trap on: **Only one trade**
- [ ] `lc-134` — Gas Station (Medium) · pattern: Greedy circuit · the mistake to build the trap on: **Returning start without checking total**
- [ ] `lc-45` — Jump Game II (Medium) · pattern: Greedy jump range · the mistake to build the trap on: **Jumping at every index**
- [ ] `lc-55` — Jump Game (Medium) · pattern: Greedy farthest reach · the mistake to build the trap on: **Updating reach from an unreachable index**
- [ ] `lc-621` — Task Scheduler (Medium) · pattern: Greedy: idle-frame formula · the mistake to build the trap on: **Forgetting max with the task count**
- [ ] `lc-763` — Partition Labels (Medium) · pattern: Greedy: last-seen partition · the mistake to build the trap on: **Cutting on first sight of a new letter**

### Two pointers — 7

- [ ] `lc-125` — Valid Palindrome (Easy) · pattern: Two pointers · the mistake to build the trap on: **Forgetting to skip junk**
- [ ] `lc-16` — 3Sum Closest (Medium) · pattern: Sort + two pointers · the mistake to build the trap on: **Comparing sums, not distances**
- [ ] `lc-167` — Two Sum II - Input Array Is Sorted (Medium) · pattern: Two pointers on a sorted row · the mistake to build the trap on: **0-based indices**
- [ ] `lc-26` — Remove Duplicates from Sorted Array (Easy) · pattern: Read and write pointers · the mistake to build the trap on: **Comparing to nums[read-1] after overwrites**
- [ ] `lc-283` — Move Zeroes (Easy) · pattern: Read and write pointers · the mistake to build the trap on: **Breaking non-zero order**
- [ ] `lc-680` — Valid Palindrome II (Easy) · pattern: Two pointers, one skip · the mistake to build the trap on: **Greedy skip of one side only**
- [ ] `lc-88` — Merge Sorted Array (Easy) · pattern: Two pointers from the back · the mistake to build the trap on: **Merging from the front**

### Math and bits — 7

- [ ] `lc-136` — Single Number (Easy) · pattern: Bit XOR · the mistake to build the trap on: **Using OR or AND**
- [ ] `lc-191` — Number of 1 Bits (Easy) · pattern: Bit counting · the mistake to build the trap on: **Arithmetic shift**
- [ ] `lc-268` — Missing Number (Easy) · pattern: Bit XOR · the mistake to build the trap on: **Forgetting to xor n**
- [ ] `lc-338` — Counting Bits (Easy) · pattern: Bit dynamic programming · the mistake to build the trap on: **Array of length n**
- [ ] `lc-43` — Multiply Strings (Medium) · pattern: Digit array multiplication · the mistake to build the trap on: **Wrong place for the ones digit**
- [ ] `lc-50` — Pow(x, n) (Medium) · pattern: Fast exponentiation · the mistake to build the trap on: **Negating Integer.MIN_VALUE as an int**
- [ ] `mirror-number` — Mirror Number (Easy) · pattern: Reverse half the digits · the mistake to build the trap on: **Keeping a trailing zero**

### Linked list — 8

- [ ] `lc-138` — Copy List with Random Pointer (Medium) · pattern: Hash map of original to copy · the mistake to build the trap on: **Wiring random on the first pass**
- [ ] `lc-143` — Reorder List (Medium) · pattern: Find middle, reverse, weave · the mistake to build the trap on: **Not cutting before the reverse**
- [ ] `lc-148` — Sort List (Medium) · pattern: Merge sort on a linked list · the mistake to build the trap on: **Not cutting at the middle**
- [ ] `lc-160` — Intersection of Two Linked Lists (Easy) · pattern: Two pointers on two lists · the mistake to build the trap on: **Matching on value**
- [ ] `lc-19` — Remove Nth Node From End of List (Medium) · pattern: Two pointers, n steps apart · the mistake to build the trap on: **No dummy when dropping the head**
- [ ] `lc-2` — Add Two Numbers (Medium) · pattern: Digit-by-digit add with carry · the mistake to build the trap on: **Dropping the last carry**
- [ ] `lc-21` — Merge Two Sorted Lists (Easy) · pattern: Merge two sorted lists · the mistake to build the trap on: **Losing the first node**
- [ ] `lc-234` — Palindrome Linked List (Easy) · pattern: Reverse the second half · the mistake to build the trap on: **Comparing into the reversed half too far**

### Intervals — 2

- [ ] `lc-435` — Non-overlapping Intervals (Medium) · pattern: Greedy: earliest end · the mistake to build the trap on: **Sorting by start, then keeping the first**
- [ ] `lc-57` — Insert Interval (Medium) · pattern: Sweep a sorted interval list · the mistake to build the trap on: **Stopping the merge too early**

## Report (after the first story, then after each topic)

1. Stories finished: slug, frames per example, the view used (existing or new), the metaphor.
2. For each: the exact quiz questions asked, and in which frame the trap is drawn.
3. The final lines of every check you ran. Report only checks you actually ran.
4. Anything skipped or uncertain, and any disagreement with a Solution entry.
