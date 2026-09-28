"""Plain-language openings for every catalog problem.

``describe`` replaces the first paragraph of the authored statement. Any later
paragraph is kept as written: judge harness notes, numbered rules, and
platform input shapes. The opening says what the problem is asking. It does
not name a method.

``python -m app.problems.seed_catalog`` writes these onto existing rows.
"""

from __future__ import annotations

LEADS: dict[int, str] = {
    1: (
        "You have a list of numbers and a target sum. Find the two different positions "
        "whose values add up to the target. Exactly one pair exists. Return the two "
        "positions in either order."
    ),
    2: (
        "Two numbers are stored as linked lists, one digit per node, with the ones digit "
        "at the front. Add them and return the sum in the same form."
    ),
    3: (
        "A substring is a block of characters that sit next to each other. Return the "
        "length of the longest substring of `s` that never repeats a character."
    ),
    4: (
        "`nums1` and `nums2` are already sorted. Imagine merging them into one sorted "
        "list. Return the median of that list: the middle value, or the average of the "
        "two middle values when the combined length is even."
    ),
    5: (
        "A palindrome reads the same forwards and backwards, like `aba` or `aa`. Return "
        "the longest palindromic substring of `s`. If several tie for length, return the "
        "one that starts furthest left."
    ),
    7: (
        "Reverse the digits of the 32-bit signed integer `x`. Keep the sign in front. "
        "If the reversed value does not fit in a 32-bit signed integer, return 0."
    ),
    8: (
        "Turn the string `s` into a 32-bit signed integer, the way a careful reader would."
    ),
    11: (
        "Each value in `height` is a vertical line on the x-axis at that index. Pick two "
        "lines. The area they hold is the distance between them times the shorter line. "
        "Return the largest area."
    ),
    15: (
        "Find every trio of different positions whose values add up to zero. Return the "
        "three values, not the positions. Do not return the same trio twice. Order of "
        "the trios, and order inside a trio, does not matter."
    ),
    16: (
        "Pick three different positions. Return the sum of their values that lands closest "
        "to `target`. One sum is enough: you do not return the positions."
    ),
    17: (
        "Each digit from 2 to 9 stands for letters on a phone key: 2 is `abc`, 3 is `def`, "
        "and so on up to 9. Return every string you can spell by picking one letter from "
        "each digit, in order."
    ),
    19: (
        "Remove the n-th node from the end of the list. `n = 1` removes the last node. "
        "Return the first node of what remains."
    ),
    20: (
        "Brackets must close in order. `(` matches `)`, `{` matches `}`, and `[` matches `]`. "
        "An opener must be closed by its own closer before an outer one closes. Return true "
        "when `s` is valid."
    ),
    21: (
        "Both linked lists are sorted from small to large. Merge them into one sorted list "
        "and return its first node."
    ),
    22: (
        "Build every string of `n` pairs of parentheses that is correctly matched. "
        "`n = 3` includes `((()))` and `()()()` and `(()())`. Order of the strings does not matter."
    ),
    23: (
        "You are given `k` linked lists, and each one is already sorted. Merge them into "
        "one sorted list and return its first node."
    ),
    25: (
        "Cut the linked list into blocks of `k` nodes. Reverse each full block. If the tail "
        "is shorter than `k`, leave that tail in its original order. Change the links only, "
        "not the values inside the nodes. Return the new first node."
    ),
    26: (
        "`nums` is sorted. Remove the extra copies in place, packing each distinct value once "
        "at the front and in the same order. Return how many distinct values that is. The "
        "first that many slots of `nums` must hold them."
    ),
    31: (
        "A permutation is an arrangement of the same values. Rearrange `nums` into the next "
        "arrangement in dictionary order. If `nums` is already the last arrangement, turn it "
        "into the first one, which is sorted ascending."
    ),
    33: (
        "`nums` was sorted, with no repeated values, and was then rotated: a tail was moved "
        "to the front, as in `[4,5,6,7,0,1,2]`. Return the index of `target`, or -1 if it is "
        "missing. Do this in O(log n) time."
    ),
    34: (
        "`nums` is sorted, and `target` may appear more than once. Return the index of its "
        "first copy and the index of its last copy. If it is missing, return `[-1, -1]`. "
        "Do this in O(log n) time."
    ),
    36: (
        "Decide whether this partly filled 9 by 9 Sudoku board breaks a rule. You do not "
        "have to solve the puzzle. Empty cells are `'.'`."
    ),
    39: (
        "Pick numbers from `candidates` that add up to `target`. You may use the same number "
        "as many times as you want. Return every different combination. Order inside a "
        "combination does not matter, and the list of combinations may arrive in any order."
    ),
    41: (
        "Look through `nums` for positive integers: 1, 2, 3, and so on. Return the smallest "
        "positive integer that does not appear. Zero and negative numbers do not count as "
        "that missing value."
    ),
    42: (
        "`height[i]` is a bar of width 1. Rain falls, and water sits wherever a bar has a "
        "taller or equal bar somewhere to its left and somewhere to its right. Return how "
        "many units of water are trapped."
    ),
    43: (
        "Two non-negative integers are written as strings of digits, the way you would write "
        "them on paper. Return their product, also as a string of digits."
    ),
    45: (
        "You start on the first index. From index `i` you may jump forward by at most "
        "`nums[i]` steps. The last index can always be reached. Return the fewest jumps "
        "that get you there."
    ),
    46: (
        "`nums` has distinct integers. Return every possible ordering of those integers. "
        "The orderings themselves may be listed in any order."
    ),
    48: (
        "Rotate the square matrix 90 degrees clockwise, in place, and return it."
    ),
    49: (
        "Two strings are anagrams when one is a rearrangement of the other's letters. Group "
        "the anagrams together. The groups may come back in any order, and so may the strings "
        "inside a group."
    ),
    50: (
        "Return `x` raised to the integer power `n`. A negative `n` means one over `x` to "
        "the power of `-n`."
    ),
    51: (
        "Place `n` queens on an `n` by `n` chessboard so that no two queens share a row, a "
        "column, or a diagonal. Return every different board. A board is `n` strings of "
        "length `n`: `Q` is a queen and `.` is empty. The order of the boards does not matter."
    ),
    53: (
        "A contiguous subarray is a stretch of values with nothing skipped. Return the largest "
        "sum of any such stretch. The array is never empty. If every value is negative, the "
        "answer is the largest single value."
    ),
    54: (
        "Walk the matrix in a spiral and return the values in the order you visit them: across "
        "the top row, down the right side, back across the bottom, up the left side, then "
        "inward, until every cell has been visited once."
    ),
    55: (
        "You start on the first index. From index `i` you may jump forward by at most "
        "`nums[i]` steps. Return true if some sequence of jumps lands on the last index."
    ),
    56: (
        "Each interval is `[start, end]`, covering every point from start to end, including "
        "both ends. If two intervals share any point, including just an endpoint, they are "
        "one span. Merge every such pile into the smallest interval that covers it. Return "
        "the merged intervals sorted by start."
    ),
    57: (
        "`intervals` is sorted by start, and no two of them overlap or touch. Insert "
        "`newInterval`, then merge anything that now overlaps or touches. Return the list "
        "still sorted by start."
    ),
    61: (
        "Rotate the linked list to the right by `k` places. Each step takes the last node "
        "and moves it to the front. Return the new first node. `k` may be larger than the "
        "length of the list."
    ),
    62: (
        "A robot starts in the top-left cell of a grid with `m` rows and `n` columns. Each "
        "step is one cell right or one cell down. Return how many different routes reach "
        "the bottom-right cell."
    ),
    69: (
        "Return the greatest integer whose square is still less than or equal to `x`. "
        "That is the square root of `x`, rounded down."
    ),
    70: (
        "You are climbing a staircase of `n` steps. Each move climbs either 1 step or 2 steps. "
        "Return how many different sequences of moves reach the top. Order matters: 1 then 2 "
        "is different from 2 then 1."
    ),
    71: (
        "An absolute path starts at the root of a filesystem. Simplify it to its canonical form."
    ),
    72: (
        "You may insert one character, delete one character, or replace one character. "
        "Return the fewest operations that turn `word1` into `word2`."
    ),
    73: (
        "If a cell of the matrix is 0, set its whole row and its whole column to 0. Do this "
        "from the original zeros only: a zero you write must not create more zeros to spread. "
        "Change the matrix in place and return it."
    ),
    74: (
        "Each row of the matrix is sorted left to right, and the first value of each row is "
        "greater than the last value of the row above it. So the whole grid, read row by row, "
        "is one sorted list. Return true if `target` appears."
    ),
    76: (
        "Find the shortest contiguous piece of `s` that contains every character of `t`, "
        "including repeated characters: if `t` has two `a`s, the piece needs two `a`s. "
        "If no such piece exists, return an empty string. If several pieces are equally "
        "short, return any one of them."
    ),
    78: (
        "A subset is any selection of the values, including selecting none of them and "
        "selecting all of them. `nums` has no duplicates. Return every subset. Do not return "
        "the same subset twice. Order does not matter."
    ),
    79: (
        "The board is a grid of letters, one string per row, every row the same length. "
        "You may step up, down, left, or right, not diagonally. Return true if some path "
        "spells `word`. A path may not visit the same cell twice."
    ),
    84: (
        "Each bar of the histogram has width 1 and height `heights[i]`. A rectangle sits on "
        "a contiguous run of bars, and its height is the shortest bar in that run. Return "
        "the largest area."
    ),
    88: (
        "`nums1` has room for both arrays: the first `m` slots hold a sorted list, and the "
        "rest are unused. `nums2` holds `n` sorted values. Merge `nums2` into `nums1` so "
        "that `nums1` becomes one sorted list. Return `nums1`."
    ),
    90: (
        "Return every subset of `nums`. `nums` may contain duplicates, but the answer must "
        "not list the same subset twice. Order does not matter."
    ),
    91: (
        "Digits encode letters: `1` is A, `2` is B, and so on through `26` as Z. A digit "
        "string can be cut into letters in more than one way. Return how many ways `s` can be read."
    ),
    94: (
        "Return the values of the binary tree in inorder: all of the left subtree, then the "
        "node itself, then all of the right subtree."
    ),
    98: (
        "Return true if this tree is a binary search tree. For every node, every value in "
        "its left subtree must be strictly smaller, and every value in its right subtree "
        "must be strictly larger. Checking only the node's own two children is not enough."
    ),
    100: (
        "Return true if the two binary trees are the same: the same shape, and the same "
        "value in every matching position."
    ),
    101: (
        "Return true if the tree is symmetric around its center. The left subtree must be "
        "a mirror of the right subtree, in shape and in values."
    ),
    102: (
        "Return the tree's values level by level, root first. Inside a level, list values "
        "from left to right."
    ),
    103: (
        "Return the tree level by level. The root is depth 0. Even depths go left to right. "
        "Odd depths go right to left."
    ),
    104: (
        "The depth of a tree is the number of nodes on the longest path from the root down "
        "to a leaf. Return that depth. An empty tree has depth 0."
    ),
    105: (
        "You are given the preorder list and the inorder list of the same binary tree. "
        "Preorder visits a node before its children. Inorder visits the left subtree, then "
        "the node, then the right subtree. Rebuild the tree and return its root. The values "
        "are unique."
    ),
    108: (
        "Turn a sorted array into a height-balanced binary search tree: the depth of the "
        "left and right sides of every node differs by at most one. Return the root. More "
        "than one shape can be correct."
    ),
    110: (
        "A tree is height-balanced when, at every node, the depth of the left subtree and "
        "the depth of the right subtree differ by at most one. Return true when that holds "
        "for the whole tree."
    ),
    112: (
        "A root-to-leaf path adds up the values of the nodes it visits. Return true if any "
        "path from the root down to a leaf adds up to `targetSum`. A leaf is a node with "
        "no children."
    ),
    116: (
        "The tree is perfect: every parent has two children, and every leaf is on the same "
        "level. Each node has a `next` pointer that starts as null."
    ),
    121: (
        "Each value in `prices` is the price of a stock on that day. Buy on one day and sell "
        "on a later day. Return the largest profit. If no later day is higher, return 0."
    ),
    122: (
        "Prices are given one per day. You may buy and sell as many times as you like, but "
        "you may hold at most one share: you must sell before you buy again. Return the "
        "largest total profit."
    ),
    124: (
        "A path is a connected chain of nodes. It may bend, but it may not branch, and it "
        "does not have to go through the root. A single node is a path. Return the largest "
        "sum of values along any path."
    ),
    125: (
        "Ignore spaces and punctuation, and treat uppercase and lowercase as the same letter. "
        "Return true if the letters and digits that remain read the same forwards and backwards."
    ),
    127: (
        "Start at `beginWord`. Change one letter at a time. Every word you produce must be "
        "in `wordList`. Return how many words are in the shortest chain that reaches "
        "`endWord`, counting `beginWord` as the first word. If no chain exists, return 0."
    ),
    128: (
        "Find the longest run of consecutive integers in `nums`, such as 4, 5, 6, 7. The "
        "numbers do not have to be next to each other in the array, and order in the array "
        "does not matter. Return the length of that run. Do this in O(n) time."
    ),
    130: (
        "The board is filled with the letters `X` and `O`. A region is a group of `O` cells "
        "connected up, down, left, or right. Capture a region by flipping its `O` cells to `X`."
    ),
    131: (
        "Split `s` into contiguous pieces so that every piece is a palindrome: it reads the "
        "same forwards and backwards. Return every way to split it. A single letter is a palindrome."
    ),
    133: (
        "Make a deep copy of an undirected graph: new nodes, new edges, same connections. "
        "The graph is given as an adjacency list. `adj[i]` lists the neighbors of node `i + 1`, "
        "and those neighbor numbers start at 1. Return the copy in the same shape."
    ),
    134: (
        "Gas stations stand in a circle. Station `i` has `gas[i]` fuel, and the trip from "
        "station `i` to the next one costs `cost[i]` fuel. You start with an empty tank."
    ),
    136: (
        "Every value in the array appears twice, except one value that appears once. Return that one value."
    ),
    138: (
        "Each node has a `next` pointer and a `random` pointer. `random` may point at any "
        "node in the list, or at nothing. Build a copy of the list, with copied random "
        "pointers, and return its first node."
    ),
    139: (
        "Return true if `s` can be cut into a sequence of words that all appear in "
        "`wordDict`. The pieces must cover `s` with nothing left over and nothing overlapping. "
        "You may use the same dictionary word more than once."
    ),
    141: (
        "Return true if the linked list contains a cycle: following `next` eventually "
        "repeats a node. Return false if it ends."
    ),
    143: (
        "Reorder the list so the nodes go: first, last, second, second-to-last, and so on. "
        "Change the links, not the values. For example, 1, 2, 3, 4 becomes 1, 4, 2, 3."
    ),
    146: (
        "Build a cache that stores at most `capacity` keys. `get(key)` returns the stored "
        "value, or -1 if the key is absent. `put(key, value)` stores a value. If the cache "
        "is already full, `put` first drops the key that was used least recently. A `get` "
        "or a `put` of a key counts as using it. Both operations should take O(1) time on average."
    ),
    148: (
        "Sort the linked list from smallest value to largest, and return its first node. "
        "Change the links, not the values."
    ),
    150: (
        "The tokens are an arithmetic expression in Reverse Polish Notation: each operator "
        "comes after the two numbers it applies to, rather than between them. `2 1 +` means "
        "`2 + 1`. Evaluate the expression and return the result."
    ),
    151: (
        "Reverse the order of the words in `s`. A word is a run of non-space characters."
    ),
    152: (
        "Return the largest product of any contiguous stretch of `nums`. A stretch may be "
        "a single element."
    ),
    153: (
        "`nums` was sorted ascending, with no repeats, and was then rotated: some tail was "
        "moved in front of the head. Return the smallest value. Do this in O(log n) time."
    ),
    155: (
        "Build a stack with the usual `push`, `pop`, and `top`, plus `getMin`, which returns "
        "the smallest value currently on the stack. Every one of these must take O(1) time."
    ),
    160: (
        "Two singly linked lists may share a tail: from some node on, they are the same nodes, "
        "not just equal values. Return the value of the first shared node, or 0 if the lists "
        "never meet."
    ),
    162: (
        "A peak is strictly greater than the value on its left and the value on its right. "
        "Treat the positions just outside the array as infinitely low, so either end can be "
        "a peak. Return the index of any peak. Do this in O(log n). Every test here has a single peak."
    ),
    167: (
        "`numbers` is sorted ascending. Find the two different positions whose values add up "
        "to `target`. There is exactly one solution. Return the two positions using 1-based "
        "indexes, smaller index first. The first element is position 1, not 0."
    ),
    168: (
        "Spreadsheet columns are named A, B, C, and so on. After Z comes AA, then AB. "
        "Given a column number, where 1 is A and 26 is Z, return that name."
    ),
    169: (
        "One value appears more than `n / 2` times, where `n` is the length of the array. "
        "Return that value. It is guaranteed to exist."
    ),
    173: (
        "Build an iterator that returns the values of a binary search tree from smallest "
        "to largest."
    ),
    189: (
        "Rotate `nums` to the right by `k` steps. Each step moves the last element to the "
        "front. Do it in place, with only a constant amount of extra memory, and return the "
        "array. `k` may be larger than the length."
    ),
    191: (
        "Return how many bits are 1 in the binary form of the given integer. This count is "
        "the Hamming weight."
    ),
    198: (
        "Houses stand in a line. `nums[i]` is the money in house `i`. You cannot rob two "
        "houses that are next to each other. Return the most money you can rob."
    ),
    199: (
        "Imagine standing on the right side of the tree and looking left. Return the value "
        "you see on each level, from the root downward. That is the rightmost node of each level."
    ),
    200: (
        "The grid is given as strings of equal length. `'1'` is land and `'0'` is water. "
        "An island is land cells connected up, down, left, or right. A diagonal touch does "
        "not connect them. Return how many islands there are."
    ),
    206: (
        "Reverse the singly linked list so the old last node becomes the first. Return that new first node."
    ),
    207: (
        "There are `numCourses` courses, numbered from 0. A pair `[a, b]` means you must "
        "finish course `b` before you can take course `a`. Return true if there is an order "
        "that finishes every course. If the prerequisites loop, no such order exists."
    ),
    208: (
        "A trie stores words so that words with a shared prefix share a path from the root. "
        "Support `insert(word)`, `search(word)` which is true only for a whole word you inserted, "
        "and `startsWith(prefix)` which is true when any inserted word begins with that prefix."
    ),
    209: (
        "Find the shortest contiguous stretch of `nums` whose values add up to at least "
        "`target`. Return its length. If no stretch is large enough, return 0."
    ),
    210: (
        "Same prerequisite rule as Course Schedule: `[a, b]` means finish `b` before `a`. "
        "Return one order that takes every course. If the prerequisites loop, return an "
        "empty array. In these tests that order is unique."
    ),
    211: (
        "Build a dictionary of words that you can add to, and that you can search. A search "
        "word may contain `.`, and a dot matches any one letter."
    ),
    212: (
        "The board is a grid of letters. Return every word from `words` that you can spell "
        "by stepping up, down, left, or right through adjacent cells. A single word may not "
        "reuse a cell. The same cell may be used in a different word."
    ),
    213: (
        "Houses stand in a circle, so the first house and the last house are neighbors. "
        "`nums[i]` is the money in house `i`. You cannot rob two neighbors. Return the most "
        "money you can rob."
    ),
    215: (
        "Return the k-th largest value in `nums`. Counting starts at 1, so `k = 1` is the "
        "maximum. Duplicates count separately: sort descending and take the value in position "
        "`k`. It is not the k-th distinct value."
    ),
    217: (
        "Return true if any value appears at least twice in `nums`. Return false if every value is unique."
    ),
    221: (
        "The matrix is given as strings of `0` and `1`. Find the largest square that contains "
        "only ones, and return its area. Area is the side length squared."
    ),
    226: (
        "Invert the binary tree: at every node, swap the left child with the right child. "
        "Return the same root."
    ),
    227: (
        "Evaluate the arithmetic expression in `s` and return the result."
    ),
    230: (
        "Return the k-th smallest value in the binary search tree. Counting starts at 1, "
        "so `k = 1` is the smallest value in the tree."
    ),
    234: (
        "Return true if the linked list is a palindrome: the values read the same from the "
        "front and from the back. For example, 1, 2, 2, 1 is a palindrome and 1, 2 is not."
    ),
    235: (
        "The tree is a binary search tree, and both `p` and `q` are values that appear in it. "
        "Return the value of their lowest common ancestor: the deepest node that has both "
        "values somewhere in its subtree. A node counts as being in its own subtree, so if "
        "one value sits above the other, that upper value is the answer."
    ),
    236: (
        "Return the value of the lowest common ancestor of `p` and `q`. That is the deepest "
        "node which has both of them in its subtree. A node counts as an ancestor of itself. "
        "`p` and `q` are values that exist in the tree, not pointers to nodes."
    ),
    238: (
        "Build an array `answer` of the same length as `nums`, where `answer[i]` is the "
        "product of every element of `nums` except `nums[i]` itself."
    ),
    239: (
        "Slide a window of exactly `k` adjacent values from the left of the array to the right. "
        "Return the maximum value inside each window, in that same left-to-right order."
    ),
    242: (
        "Return true if `t` is an anagram of `s`: the same letters, each used the same number "
        "of times, in any order."
    ),
    253: (
        "Each meeting is a half-open span `[start, end]`: it occupies the room from `start` "
        "up to but not including `end`. A room can take the next meeting at the instant the "
        "previous one ends. Return the fewest rooms that let every meeting happen."
    ),
    268: (
        "`nums` holds `n` different numbers taken from the range `0, 1, ..., n`. Exactly one "
        "number in that range is absent. Return it."
    ),
    269: (
        "`words` is sorted in the dictionary order of an unknown alphabet. Recover one valid "
        "order of the letters and return it as a string. If the words contradict each other, "
        "or a longer word is sorted before a shorter word that is its prefix, return an empty "
        "string. In these tests the order is unique."
    ),
    273: (
        "Write the non-negative integer in English words. For example, 123 is "
        "`One Hundred Twenty Three`. Follow the usual spacing of English number names."
    ),
    278: (
        "Versions are numbered `1` through `n`. Some version failed, and every version after "
        "it fails too. Find the first bad version, using as few checks as you can."
    ),
    283: (
        "Move every 0 to the end of `nums`. Keep the order of the non-zero values. Do this "
        "in place and return the array."
    ),
    286: (
        "The grid uses three kinds of cell. `-1` is a wall. `0` is a gate. `2147483647` is "
        "an empty room. Distance is the number of steps up, down, left, or right."
    ),
    289: (
        "Each cell is alive (`1`) or dead (`0`). Every cell looks at its eight neighbors: "
        "the cells that share a side or a corner. Then every cell updates at the same moment, "
        "from the old board, not from values you have already written."
    ),
    295: (
        "Numbers arrive one at a time. After each arrival you may be asked for the median of "
        "everything seen so far. If the count is odd, the median is the middle value. If the "
        "count is even, the median is the average of the two middle values."
    ),
    297: (
        "Turn a binary tree into a string you choose, and turn that string back into the same "
        "tree. `roundtrip` runs both directions and must return a tree with the same shape "
        "and the same values, including an empty tree."
    ),
    300: (
        "A subsequence keeps values in their original order but may skip some. It does not "
        "have to be contiguous. Return the length of the longest strictly increasing subsequence. "
        "Equal values do not count as increasing."
    ),
    314: (
        "Lay the tree out in columns. The root is column 0. A left child is one column to the "
        "left of its parent, and a right child is one column to the right."
    ),
    322: (
        "You have coin denominations in `coins`, and you may use each denomination any number "
        "of times. Return the fewest coins that add up to `amount`. If no combination does, return -1."
    ),
    323: (
        "There are `n` nodes, numbered from 0 to `n - 1`, and a list of undirected edges. "
        "A connected component is a largest group of nodes that can reach each other. Return "
        "how many components there are. A node with no edges is a component by itself."
    ),
    338: (
        "Return an array `ans` of length `n + 1`. `ans[i]` is how many bits are 1 in the binary form of `i`."
    ),
    340: (
        "Return the length of the longest substring of `s` that uses at most `k` different characters."
    ),
    347: (
        "Return the `k` values that appear most often in `nums`. The answer is unique. "
        "You may return those values in any order."
    ),
    348: (
        "Two players take turns on an `n` by `n` board. A player wins by filling a whole row, "
        "a whole column, or a whole diagonal with their own mark."
    ),
    355: (
        "Build a small Twitter. A user can post a tweet, follow someone, unfollow someone, "
        "and read a news feed. The feed is the user's own tweets plus tweets from people they "
        "follow, newest first, at most 10 of them."
    ),
    362: (
        "Count hits over a rolling window of 300 seconds. A hit at time `t` is still inside "
        "the window for a query at time `q` when `q - 299 <= t <= q`."
    ),
    380: (
        "Build a set of integers with three operations, each in O(1) time on average. "
        "`insert` adds a value and returns false if it was already present. `remove` deletes "
        "a value and returns false if it was absent. `getRandom` returns any stored value, "
        "each with equal chance."
    ),
    394: (
        "Decode the string. `k[text]` means `text` repeated `k` times. The text inside the "
        "brackets may itself contain encodings, as in `3[a2[c]]`, which is `acc` repeated "
        "three times. `k` is a positive integer written in decimal."
    ),
    416: (
        "Return true if `nums` can be split into two groups with the same sum. Every number "
        "goes in exactly one group. The groups do not have to be the same size."
    ),
    417: (
        "The Pacific Ocean touches the top edge and the left edge of the island. The Atlantic "
        "touches the bottom edge and the right edge. Water flows from a cell to a neighbor "
        "that is lower or the same height, moving up, down, left, or right. Return every cell "
        "from which water can reach both oceans. Order does not matter."
    ),
    424: (
        "You may replace up to `k` characters of `s`. Return the length of the longest "
        "substring you can make that consists of one repeated character."
    ),
    430: (
        "Some nodes in this doubly linked list have a `child` pointer to another doubly "
        "linked list, and those lists may have children of their own. Flatten everything "
        "into one doubly linked list."
    ),
    435: (
        "Return the smallest number of intervals to delete so that the ones you keep do not "
        "overlap. Two intervals that only touch at an endpoint do not overlap: `[1, 2]` and "
        "`[2, 3]` may both be kept."
    ),
    438: (
        "Return the starting index of every substring of `s` that is an anagram of `p`: the "
        "same letters, each the same number of times. The indexes may be in any order."
    ),
    450: (
        "Delete the node whose value is `key` from the binary search tree, and return the "
        "root of the tree that remains. If `key` is not in the tree, return the tree unchanged."
    ),
    535: (
        "A tiny URL is a short code that stands for a long URL. `encode` turns a long URL "
        "into a short one. `decode` turns that short one back. `roundtrip` must return the "
        "original long URL."
    ),
    542: (
        "Return a matrix of the same size. Each cell holds the distance to the nearest 0. "
        "A step is one cell up, down, left, or right. A cell that is already 0 has distance 0."
    ),
    543: (
        "The diameter is the longest path between any two nodes, measured as the number of "
        "edges on that path. The path does not have to pass through the root. Return the diameter."
    ),
    545: (
        "Walk the outline of the tree anti-clockwise, starting at the root, and return the "
        "values you visit."
    ),
    547: (
        "`isConnected` is an `n` by `n` matrix. A 1 at row `i`, column `j` means city `i` "
        "and city `j` have a direct road. Cities are connected if you can travel between "
        "them through any number of roads."
    ),
    560: (
        "Return how many contiguous stretches of `nums` add up to `k`. A stretch can be a "
        "single element. Different stretches may overlap or sit inside one another, and each "
        "one counts."
    ),
    567: (
        "Return true if some contiguous piece of `s2` is an anagram of `s1`: a rearrangement "
        "of exactly the letters in `s1`."
    ),
    572: (
        "Return true if `subRoot` occurs anywhere in `root` as a subtree with the same shape "
        "and the same values. The match has to include all descendants of that node, not only "
        "the node itself."
    ),
    621: (
        "Tasks are letters A through Z. Two tasks with the same letter must have at least "
        "`n` other slots between them. Those slots may be a different task or idle time. "
        "Return the smallest number of slots needed to finish every task."
    ),
    647: (
        "Return how many substrings of `s` are palindromes. Every single letter counts. "
        "The same text in two different positions counts twice."
    ),
    680: (
        "Return true if `s` is already a palindrome, or if deleting one character makes it one. "
        "You may delete at most one character."
    ),
    684: (
        "The graph started as a tree on `n` nodes: connected, with no cycle. One extra edge "
        "was added, so there is now exactly one cycle. Return an edge you can remove to make "
        "it a tree again."
    ),
    704: (
        "`nums` is sorted ascending. Return the index of `target`, or -1 if it is not there. "
        "Do this in O(log n) time."
    ),
    706: (
        "Build a hash map from scratch, without using a language hash map. It stores integer "
        "keys and integer values."
    ),
    721: (
        "Each account starts with a name and then one or more email addresses. If two accounts "
        "share any email, they are the same person, even through a chain of shared emails. "
        "Merge those accounts. Return one row per person: the name, then that person's emails "
        "in sorted order. The rows themselves may be in any order."
    ),
    739: (
        "`temperatures[i]` is the temperature on day `i`. For each day, return how many days "
        "you wait until a strictly warmer day. If no later day is warmer, the wait is 0."
    ),
    743: (
        "Each triple `[u, v, w]` is a one-way link from node `u` to node `v` that takes `w` "
        "time. Send a signal from node `k`. Return the time until every node has received it, "
        "which is the time the last node receives it. If some node can never receive it, return -1. "
        "Nodes are numbered from 1 to `n`."
    ),
    763: (
        "Cut `s` into as many pieces as possible so that each letter of the alphabet appears "
        "in at most one piece. Return the lengths of those pieces, from left to right."
    ),
    787: (
        "Each flight is `[from, to, price]`. A stop is an intermediate city, so a direct "
        "flight has zero stops and a route with two flights has one stop. Return the cheapest "
        "price from `src` to `dst` using at most `k` stops. If no such route exists, return -1. "
        "Cities are numbered from 0 to `n - 1`."
    ),
    863: (
        "Count edges, not nodes. Return every node value that sits exactly `k` edges away "
        "from the node whose value is `target`. You may have to go up to a parent and then "
        "down a different branch. `target` is unique."
    ),
    875: (
        "Koko has `h` hours to eat every banana. The piles are in `piles`. Each hour she "
        "picks one pile and eats `k` bananas from it, or the rest of the pile if fewer than "
        "`k` remain. She eats from only one pile in an hour. Return the smallest integer `k` "
        "that lets her finish in time."
    ),
    895: (
        "Build a stack that pops by frequency. `push` adds a value. `pop` removes the value "
        "that appears most often. If several values are tied, remove the one that was pushed "
        "most recently among them."
    ),
    904: (
        "Trees stand in a row, and `fruits[i]` is the type of fruit on tree `i`."
    ),
    973: (
        "A point is `[x, y]`. Distance to the origin is the usual straight-line distance, "
        "`x² + y²` under the square root. Return the `k` points closest to the origin. "
        "You may return those points in any order."
    ),
    981: (
        "Store string values under a key, each stamped with a time. Times for one key arrive "
        "in increasing order."
    ),
    994: (
        "In the grid, 0 is an empty cell, 1 is a fresh orange, and 2 is a rotten orange. "
        "Every minute, each rotten orange rots the fresh oranges that share a side with it. "
        "Return how many minutes pass until every fresh orange is rotten. If some fresh "
        "orange can never rot, return -1."
    ),
    1004: (
        "The array contains only 0 and 1. You may flip up to `k` zeros into ones. Return "
        "the length of the longest run of ones you can produce. The run has to be contiguous."
    ),
    1011: (
        "Packages must ship in the order given. `weights[i]` is the weight of package `i`. "
        "Each day the ship loads a contiguous batch of packages, in order, without exceeding "
        "its capacity, and it will not leave a gap to pick up a later lighter package. "
        "Return the smallest capacity that finishes every package within `days` days."
    ),
    1046: (
        "Each number is the weight of a stone. While at least two stones remain, take the "
        "two heaviest. If they weigh the same, both are destroyed. If not, the lighter one "
        "is destroyed and the heavier one is replaced by the difference of the weights."
    ),
    1143: (
        "A subsequence keeps characters in order but may skip some. It does not have to be "
        "a contiguous substring. Return the length of the longest subsequence that appears "
        "in both `text1` and `text2`."
    ),
}


def describe(leetcode_id: int, original: str) -> str:
    """Return the statement a reader sees, with the plain opening in front."""
    lead = LEADS[leetcode_id].strip()
    parts = original.strip().split("\n\n")
    if len(parts) == 1:
        return lead
    kept = "\n\n".join(part.strip() for part in parts[1:])
    return f"{lead}\n\n{kept}"
