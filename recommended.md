# Problems worth adding

The catalog already has 176 LeetCode problems and 15 original ones. It is heavy on mediums (122) and light on the easy step that makes the next problem make sense. The list below is the missing step, or one picture the set never shows.

These stay extra practice in the study unit named beside them. Today's core lists are capped at eight problems, so nothing here replaces a core unless you choose to swap one later.

Do not add a near-copy of a problem that is already here. That includes another "at most k" window (lc-3, lc-424, lc-1004, and lc-340 already cover that family), Combination Sum II, Permutations II, Search in Rotated Sorted Array II, Unique Paths II, another "binary search on the answer" beside lc-875 and lc-1011, or a second "build one structure out of the other" after a queue made of stacks.

## Add these first

Each one is the rung under a problem people already meet.

| Add | Title | Difficulty | Study it before | Why it belongs |
| --- | --- | --- | --- | --- |
| 643 | Maximum Average Subarray I | Easy | lc-3, lc-209 | A window of a fixed size. The catalog starts at windows that grow and shrink. |
| 977 | Squares of a Sorted Array | Easy | lc-167, lc-15 | Two pointers that walk inward from the two ends of a sorted array. |
| 75 | Sort Colors | Medium | lc-283 | Three regions in one pass. There is no problem like this in the catalog. |
| 303 | Range Sum Query - Immutable | Easy | lc-560 | Build a prefix array and answer a range. Subarray Sum Equals K is that idea plus a map. |
| 35 | Search Insert Position | Easy | lc-34 | "Where would this value go?" lc-704 is find-or-missing. lc-34 is first and last. This is the step between them. |
| 540 | Single Element in a Sorted Array | Medium | lc-33 | Every value is paired except one. You keep the half whose pairing is broken. |
| 946 | Validate Stack Sequences | Medium | lc-155, lc-84 | Push and pop against a required order, so a stack is something you can watch before Min Stack and the histogram. |
| 252 | Meeting Rooms | Easy | lc-253 | "Do any two meetings overlap?" before "how many rooms?" |
| 986 | Interval List Intersections | Medium | lc-56 | Two lists that are already sorted. Merge Intervals is one list. |
| 876 | Middle of the Linked List | Easy | lc-234, lc-143 | The fast and slow pointers that find the middle. Palindrome list and reorder list both assume it. |
| 92 | Reverse Linked List II | Medium | lc-25 | Reverse one span. Reverse Nodes in k-Group is that move repeated. |
| 144 | Binary Tree Preorder Traversal | Easy | lc-105 | The catalog has inorder (lc-94) and not preorder. Building a tree from a preorder list needs the walk first. |
| 701 | Insert into a Binary Search Tree | Medium | lc-450 | Insert is the easy change to a BST. Delete is already in the catalog without it. |
| 703 | Kth Largest Element in a Stream | Easy | lc-295 | Keep a heap of size k while numbers arrive. Median from a stream is the two-heap version of the same idea. |
| 64 | Minimum Path Sum | Medium | after lc-62 | The same grid as Unique Paths. The answer is a smallest sum, not a count of paths. |
| 232 | Implement Queue using Stacks | Easy | the design unit | The design problems are caches, a trie, and a board. None of them ask you to build one plain structure out of another. |

## Add these next

Each one is a picture the catalog does not have yet.

| Add | Title | Difficulty | Put it with | The new picture |
| --- | --- | --- | --- | --- |
| 142 | Linked List Cycle II | Medium | lc-141 | Return where the cycle starts, not only whether a cycle exists. |
| 202 | Happy Number | Easy | lc-141 | The same cycle idea on a number, so it is not only a linked-list trick. |
| 735 | Asteroid Collision | Medium | lc-739 | A stack of things that destroy each other. Different from "next warmer day" and the histogram. |
| 853 | Car Fleet | Medium | lc-739 | Cars that cannot pass become one fleet. The stack stores arrival times. |
| 309 | Best Time to Buy and Sell Stock with Cooldown | Medium | lc-121, lc-122 | A third state: you just sold, so you must wait a day. The two stock problems already here have no wait. |
| 518 | Coin Change II | Medium | lc-322 | lc-322 asks for the fewest coins. This asks how many combinations make the amount. |
| 377 | Combination Sum IV | Medium | lc-39 | lc-39 asks for the groups. This asks how many orders add up to the target. Order matters. |
| 337 | House Robber III | Medium | lc-198 | The houses are a tree. Nothing else in the catalog is dynamic programming on a tree. |
| 437 | Path Sum III | Medium | lc-112, lc-560 | Prefix sums, which lc-560 teaches on an array, asked on a tree. |
| 785 | Is Graph Bipartite | Medium | the graph unit | Color every node with one of two colors so no edge joins the same color. |
| 1584 | Min Cost to Connect All Points | Medium | lc-684 | Build the cheapest network that links every point. lc-684 only removes one extra edge from a tree that already exists. |
| 1631 | Path With Minimum Effort | Medium | lc-743 | lc-743 adds the weights along a path. Here the cost of a path is its single worst step. |
| 240 | Search a 2D Matrix II | Medium | lc-74 | Rows and columns are both sorted, but the grid is not one sorted list. From a corner you can throw away a whole row or a whole column. |
| 135 | Candy | Hard | the greedy unit | One pass to the right, one pass to the left. No greedy problem here needs both directions. |
| 371 | Sum of Two Integers | Medium | lc-136, lc-338 | Add two numbers without using `+`. The bit problems here only count bits or find a missing number. |
| 460 | LFU Cache | Hard | lc-146 | Drop the least frequently used key, and use recency only to break a tie. This is the follow-up the LRU problem is building toward. |

## What is already in good shape

Leave these families alone. Adding another member would repeat a picture.

- Sliding window already runs from a variable window (lc-3) through "at most k", anagram windows, the minimum cover (lc-76), and the window maximum (lc-239). The only hole is the fixed-size warm-up, which is 643 above.
- Backtracking already has subsets, subsets with duplicates, permutations, combination sum, phone letters, palindrome splits, parentheses (lc-22), word search, and N-Queens.
- The trie set is insert/search (lc-208), wildcard search (lc-211), and word search on a board (lc-212).
- Binary search already has a plain search, a rotated array, first and last position, a peak, a 2D matrix treated as one sorted list, Koko, and shipping capacity. 35 and 540 above are the two holes. Do not add another capacity-style search.
- Graphs already have islands, clone, courses, rotting oranges, Pacific/Atlantic, word ladder, cheapest flights, and network delay. 785, 1584, and 1631 are the pictures still missing.
- Linked lists already have reverse, cycle detection, merge, the nth from the end, a random pointer, reorder, palindrome, and k-group reverse. 876, 92, and 142 are the missing steps inside that ladder, not new list tricks.

## Original problems

The 15 original statements (Pair Target, Valley Rain, and the rest) are already written in plain sentences. They do not need a rewrite. Several of them are the same task as a LeetCode row (Pair Target and lc-1, Widest Water Basin and lc-11). New work belongs on the gaps above, not on a third copy of those.
