"""Reference solutions, complexity targets and hints for the LeetCode-based catalog.

``database/seeds/microsoft_interview.py`` and ``database/seeds/looptracker.py`` build
problem specs from a compact ``_p(...)`` helper that carries only the statement, the
signature and the test cases. Everything a candidate actually studies with — a worked
reference solution, the complexity the interviewer expects, and progressive hints — lives
here, keyed by LeetCode ID, and is merged in by :func:`enrich`.

Keeping it in a separate module means the reference solutions can be compiled and executed
against their own test cases in CI without touching the statement definitions.

Every solution is a complete Java source file: it must define ``class Solution`` with the
exact method from the problem's ``function_signature``, plus any supporting class the
adapted signature references (``LRUCache``, ``Codec``, ``Trie`` and friends).
"""

from __future__ import annotations

META: dict[int, dict] = {}


def _m(
    leetcode_id: int,
    time: str,
    space: str,
    hints: list[str],
    solution: str,
) -> None:
    if leetcode_id in META:
        raise RuntimeError(f"duplicate problem_meta entry for LeetCode {leetcode_id}")
    if len(hints) < 2:
        raise RuntimeError(f"LeetCode {leetcode_id} needs at least two progressive hints")
    META[leetcode_id] = {
        "time_complexity": time,
        "space_complexity": space,
        "hints": hints,
        "reference_solution": solution.strip() + "\n",
    }


def enrich(spec: dict) -> dict:
    """Return ``spec`` with reference solution, complexity and hints merged in."""
    meta = META.get(spec.get("leetcode_id"))
    if meta is None:
        return spec
    out = dict(spec)
    out["time_complexity"] = meta["time_complexity"]
    out["space_complexity"] = meta["space_complexity"]
    out["reference_solution"] = meta["reference_solution"]
    if not out.get("hints"):
        out["hints"] = list(meta["hints"])
    return out


_m(
    1, "O(n)", "O(n)",
    [
        "Brute force is every pair in O(n^2). The only way to beat it is to stop re-scanning "
        "the prefix you have already walked past.",
        "For each element you know exactly what you need: `target - nums[i]`. Turn 'have I seen "
        "this value?' into an O(1) question.",
        "Store value to index in a HashMap as you go, and check for the complement before you "
        "insert the current element so you never pair an element with itself.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[] { j, i };
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}
""",
)

_m(
    3, "O(n)", "O(min(n, alphabet))",
    [
        "A substring without repeats is a window. Ask what has to happen to the window when the "
        "character you just added is already inside it.",
        "Keep the last index at which every character was seen. When you re-see a character, the "
        "window can never start before that index plus one.",
        "Move `start` forward only (never backwards) so each character is visited at most twice.",
    ],
    r"""
import java.util.*;
class Solution {
    public int lengthOfLongestSubstring(String s) {
        int[] last = new int[128];
        Arrays.fill(last, -1);
        int best = 0;
        int start = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (last[c] >= start) start = last[c] + 1;
            last[c] = i;
            best = Math.max(best, i - start + 1);
        }
        return best;
    }
}
""",
)

_m(
    5, "O(n^2)", "O(1)",
    [
        "Every palindrome has a center. How many centers does a string of length n have?",
        "There are 2n-1 centers: n single characters and n-1 gaps between characters. Expand "
        "outward from each one while the characters match.",
        "Track only the best start and length; building substrings inside the loop turns an "
        "O(n^2) algorithm into an O(n^3) one.",
    ],
    r"""
class Solution {
    public String longestPalindrome(String s) {
        if (s.isEmpty()) return "";
        int bestStart = 0;
        int bestLen = 1;
        for (int center = 0; center < s.length(); center++) {
            int len = Math.max(expand(s, center, center), expand(s, center, center + 1));
            if (len > bestLen) {
                bestLen = len;
                bestStart = center - (len - 1) / 2;
            }
        }
        return s.substring(bestStart, bestStart + bestLen);
    }

    private int expand(String s, int left, int right) {
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            left--;
            right++;
        }
        return right - left - 1;
    }
}
""",
)

_m(
    11, "O(n)", "O(1)",
    [
        "Area is `min(height[i], height[j]) * (j - i)`. Start with the widest possible pair and "
        "reason about what you are allowed to give up.",
        "Moving the taller wall inward can never help: width shrinks and the height is still "
        "capped by the shorter wall.",
        "So always move the shorter pointer inward. One pass, two pointers, no extra space.",
    ],
    r"""
class Solution {
    public int maxArea(int[] height) {
        int left = 0;
        int right = height.length - 1;
        int best = 0;
        while (left < right) {
            int h = Math.min(height[left], height[right]);
            best = Math.max(best, h * (right - left));
            if (height[left] < height[right]) left++;
            else right--;
        }
        return best;
    }
}
""",
)

_m(
    15, "O(n^2)", "O(1) beyond the output",
    [
        "Fix one number and the rest is Two Sum on a sorted array, which two pointers solve in "
        "linear time.",
        "Sort first. Sorting is what makes both the two-pointer sweep and duplicate skipping "
        "possible, and it is free next to the O(n^2) main loop.",
        "Skip duplicates in three places: the fixed index, and both pointers after recording a "
        "hit. Missing any of them produces repeated triplets.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        for (int i = 0; i + 2 < nums.length; i++) {
            if (nums[i] > 0) break;
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int left = i + 1;
            int right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum < 0) {
                    left++;
                } else if (sum > 0) {
                    right--;
                } else {
                    out.add(List.of(nums[i], nums[left], nums[right]));
                    left++;
                    right--;
                    while (left < right && nums[left] == nums[left - 1]) left++;
                    while (left < right && nums[right] == nums[right + 1]) right--;
                }
            }
        }
        return out;
    }
}
""",
)

_m(
    20, "O(n)", "O(n)",
    [
        "Matching requires most-recent-first order. Which data structure gives you that?",
        "Push opening brackets; on a closing bracket the top of the stack must be its partner.",
        "Two failure modes are easy to miss: popping an empty stack, and a non-empty stack at the "
        "end.",
    ],
    r"""
import java.util.*;
class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '(' -> stack.push(')');
                case '[' -> stack.push(']');
                case '{' -> stack.push('}');
                default -> {
                    if (stack.isEmpty() || stack.pop() != c) return false;
                }
            }
        }
        return stack.isEmpty();
    }
}
""",
)

_m(
    23, "O(n log k)", "O(k)",
    [
        "Merging two lists is easy. Merging k of them one at a time costs O(nk) because early "
        "elements get copied again and again.",
        "At every step you only need the smallest of k candidate heads. A min-heap of size k "
        "answers that in O(log k).",
        "The alternative with the same bound is divide and conquer: merge lists pairwise, halving "
        "the count each round for log k rounds.",
    ],
    r"""
import java.util.*;
class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));
        for (ListNode node : lists) {
            if (node != null) heap.add(node);
        }
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        while (!heap.isEmpty()) {
            ListNode node = heap.poll();
            tail.next = node;
            tail = node;
            if (node.next != null) heap.add(node.next);
        }
        tail.next = null;
        return dummy.next;
    }
}
""",
)

_m(
    25, "O(n)", "O(1)",
    [
        "Before reversing a group you must know a full group exists. Walk k nodes ahead first.",
        "Reverse the k nodes in place, then wire the previous group's tail to the new head and "
        "keep the old head as the next tail.",
        "A dummy node in front of the list removes the special case where the first group changes "
        "the head pointer.",
    ],
    r"""
class Solution {
    public ListNode reverseKGroup(ListNode head, int k) {
        ListNode dummy = new ListNode(0, head);
        ListNode groupPrev = dummy;
        while (true) {
            ListNode kth = groupPrev;
            for (int i = 0; i < k && kth != null; i++) kth = kth.next;
            if (kth == null) break;
            ListNode groupNext = kth.next;
            ListNode prev = groupNext;
            ListNode cur = groupPrev.next;
            while (cur != groupNext) {
                ListNode next = cur.next;
                cur.next = prev;
                prev = cur;
                cur = next;
            }
            ListNode newTail = groupPrev.next;
            groupPrev.next = kth;
            groupPrev = newTail;
        }
        return dummy.next;
    }
}
""",
)

_m(
    26, "O(n)", "O(1)",
    [
        "The array is sorted, so duplicates are adjacent. You never need to look further than the "
        "previous kept element.",
        "Use a write pointer. Read every element; write it only when it differs from the last "
        "written value.",
        "The write pointer's final value is the length, and the first k slots hold the answer.",
    ],
    r"""
class Solution {
    public int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int write = 1;
        for (int read = 1; read < nums.length; read++) {
            if (nums[read] != nums[write - 1]) nums[write++] = nums[read];
        }
        return write;
    }
}
""",
)

_m(
    33, "O(log n)", "O(1)",
    [
        "A rotated sorted array always has one sorted half around the midpoint. Identify which.",
        "Compare `nums[low]` with `nums[mid]`: if `nums[low] <= nums[mid]` the left half is sorted, "
        "otherwise the right half is.",
        "Once you know the sorted half, you can test whether the target lies inside its range and "
        "discard half the array either way.",
    ],
    r"""
class Solution {
    public int search(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[low] <= nums[mid]) {
                if (target >= nums[low] && target < nums[mid]) high = mid - 1;
                else low = mid + 1;
            } else {
                if (target > nums[mid] && target <= nums[high]) low = mid + 1;
                else high = mid - 1;
            }
        }
        return -1;
    }
}
""",
)

_m(
    34, "O(log n)", "O(1)",
    [
        "Finding any occurrence is easy; finding the boundary is the interview point. Run binary "
        "search twice with different tie-breaking.",
        "For the left bound, on equality keep searching left instead of returning. For the right "
        "bound, keep searching right.",
        "Write one helper that returns the first index with `nums[i] >= target`; the answer is "
        "that index and `firstIndexWith(target + 1) - 1`.",
    ],
    r"""
class Solution {
    public int[] searchRange(int[] nums, int target) {
        int left = lowerBound(nums, target);
        if (left == nums.length || nums[left] != target) return new int[] { -1, -1 };
        return new int[] { left, lowerBound(nums, target + 1) - 1 };
    }

    private int lowerBound(int[] nums, int target) {
        int low = 0;
        int high = nums.length;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] < target) low = mid + 1;
            else high = mid;
        }
        return low;
    }
}
""",
)

_m(
    39, "O(n^(target/min))", "O(target/min) recursion depth",
    [
        "Candidates may be reused, so the recursive call keeps the same start index instead of "
        "advancing past it.",
        "Passing a start index is what prevents permutations of the same multiset from being "
        "reported twice.",
        "Prune as soon as the remaining target goes negative, and sort the candidates so you can "
        "break out of the loop entirely instead of continuing.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        Arrays.sort(candidates);
        List<List<Integer>> out = new ArrayList<>();
        backtrack(candidates, target, 0, new ArrayDeque<>(), out);
        return out;
    }

    private void backtrack(int[] candidates, int remaining, int start,
                           Deque<Integer> path, List<List<Integer>> out) {
        if (remaining == 0) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int i = start; i < candidates.length; i++) {
            if (candidates[i] > remaining) break;
            path.addLast(candidates[i]);
            backtrack(candidates, remaining - candidates[i], i, path, out);
            path.removeLast();
        }
    }
}
""",
)

_m(
    42, "O(n)", "O(1)",
    [
        "Water above index i is `min(maxLeft, maxRight) - height[i]`. The naive version recomputes "
        "those maxima for every index.",
        "Two pointers let you commit to an answer for whichever side has the smaller running max, "
        "because that side's max is the binding constraint.",
        "Advance the pointer on the smaller side, update that side's running max first, then add "
        "`runningMax - height[pointer]`.",
    ],
    r"""
class Solution {
    public int trap(int[] height) {
        int left = 0;
        int right = height.length - 1;
        int leftMax = 0;
        int rightMax = 0;
        int total = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                leftMax = Math.max(leftMax, height[left]);
                total += leftMax - height[left];
                left++;
            } else {
                rightMax = Math.max(rightMax, height[right]);
                total += rightMax - height[right];
                right--;
            }
        }
        return total;
    }
}
""",
)

_m(
    49, "O(n * k log k)", "O(n * k)",
    [
        "Anagrams need a canonical form: something identical for every member of a group.",
        "Sorting each word is the obvious key; a 26-slot character count rendered as a string is "
        "the O(k) alternative when words are long.",
        "Group with a HashMap from key to list. Sorting each group before returning makes the "
        "output deterministic.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String word : strs) {
            char[] chars = word.toCharArray();
            Arrays.sort(chars);
            groups.computeIfAbsent(new String(chars), key -> new ArrayList<>()).add(word);
        }
        List<List<String>> out = new ArrayList<>();
        for (List<String> group : groups.values()) {
            Collections.sort(group);
            out.add(group);
        }
        return out;
    }
}
""",
)

_m(
    51, "O(n!)", "O(n)",
    [
        "Place exactly one queen per row, so the only decision at depth r is which column to use.",
        "Conflicts are three sets: used columns, used diagonals `r - c`, and used anti-diagonals "
        "`r + c`. Each is an O(1) membership test.",
        "Add to the sets before recursing and remove after; forgetting the undo is the classic "
        "backtracking bug.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<List<String>> solveNQueens(int n) {
        List<List<String>> out = new ArrayList<>();
        int[] columnOfRow = new int[n];
        boolean[] usedCol = new boolean[n];
        boolean[] usedDiag = new boolean[2 * n];
        boolean[] usedAnti = new boolean[2 * n];
        place(0, n, columnOfRow, usedCol, usedDiag, usedAnti, out);
        return out;
    }

    private void place(int row, int n, int[] columnOfRow, boolean[] usedCol,
                       boolean[] usedDiag, boolean[] usedAnti, List<List<String>> out) {
        if (row == n) {
            out.add(render(columnOfRow, n));
            return;
        }
        for (int col = 0; col < n; col++) {
            int diag = row - col + n;
            int anti = row + col;
            if (usedCol[col] || usedDiag[diag] || usedAnti[anti]) continue;
            usedCol[col] = true;
            usedDiag[diag] = true;
            usedAnti[anti] = true;
            columnOfRow[row] = col;
            place(row + 1, n, columnOfRow, usedCol, usedDiag, usedAnti, out);
            usedCol[col] = false;
            usedDiag[diag] = false;
            usedAnti[anti] = false;
        }
    }

    private List<String> render(int[] columnOfRow, int n) {
        List<String> board = new ArrayList<>();
        for (int row = 0; row < n; row++) {
            char[] line = new char[n];
            Arrays.fill(line, '.');
            line[columnOfRow[row]] = 'Q';
            board.add(new String(line));
        }
        return board;
    }
}
""",
)

_m(
    53, "O(n)", "O(1)",
    [
        "At each index there are only two options: extend the best subarray ending at i-1, or "
        "start fresh at i.",
        "You start fresh exactly when the running sum has gone negative, because a negative prefix "
        "can only hurt what follows.",
        "Track the running sum and the best seen separately, and seed `best` with the first "
        "element so all-negative inputs work.",
    ],
    r"""
class Solution {
    public int maxSubArray(int[] nums) {
        int best = nums[0];
        int running = nums[0];
        for (int i = 1; i < nums.length; i++) {
            running = Math.max(nums[i], running + nums[i]);
            best = Math.max(best, running);
        }
        return best;
    }
}
""",
)

_m(
    56, "O(n log n)", "O(n)",
    [
        "Unsorted intervals can overlap with anything. Sorting by start bounds each interval's "
        "possible partners to its immediate neighbour.",
        "After sorting, a new interval either extends the last merged one (its start is at or "
        "before that end) or begins a fresh block.",
        "When extending, take the max of the two ends: a fully contained interval must not shrink "
        "the block.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[][] merge(int[][] intervals) {
        if (intervals.length == 0) return new int[0][];
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        List<int[]> out = new ArrayList<>();
        int[] current = new int[] { intervals[0][0], intervals[0][1] };
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] <= current[1]) {
                current[1] = Math.max(current[1], intervals[i][1]);
            } else {
                out.add(current);
                current = new int[] { intervals[i][0], intervals[i][1] };
            }
        }
        out.add(current);
        return out.toArray(new int[0][]);
    }
}
""",
)

_m(
    57, "O(n)", "O(n)",
    [
        "The input is already sorted and disjoint, so no sort is needed. Walk it once in three "
        "phases.",
        "Phase one copies intervals that end before the new one starts; phase two absorbs every "
        "interval that overlaps; phase three copies the rest.",
        "The overlap test is `intervals[i][0] <= newInterval[1]`; while it holds, widen the new "
        "interval with min of starts and max of ends.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        List<int[]> out = new ArrayList<>();
        int i = 0;
        int n = intervals.length;
        while (i < n && intervals[i][1] < newInterval[0]) out.add(intervals[i++]);
        int start = newInterval[0];
        int end = newInterval[1];
        while (i < n && intervals[i][0] <= end) {
            start = Math.min(start, intervals[i][0]);
            end = Math.max(end, intervals[i][1]);
            i++;
        }
        out.add(new int[] { start, end });
        while (i < n) out.add(intervals[i++]);
        return out.toArray(new int[0][]);
    }
}
""",
)

_m(
    62, "O(m * n)", "O(n)",
    [
        "Every path to a cell arrives from above or from the left, so paths(r, c) = paths(r-1, c) "
        "+ paths(r, c-1).",
        "The first row and first column are all 1: there is exactly one way to walk a straight "
        "line.",
        "You only ever read the previous row, so a single rolling array of width n is enough. The "
        "closed form is C(m+n-2, m-1).",
    ],
    r"""
import java.util.*;
class Solution {
    public int uniquePaths(int m, int n) {
        int[] row = new int[n];
        Arrays.fill(row, 1);
        for (int r = 1; r < m; r++) {
            for (int c = 1; c < n; c++) {
                row[c] += row[c - 1];
            }
        }
        return row[n - 1];
    }
}
""",
)

_m(
    72, "O(m * n)", "O(n)",
    [
        "Define dp[i][j] as the edit distance between the first i characters of word1 and the "
        "first j of word2.",
        "If the characters match, nothing is spent: dp[i][j] = dp[i-1][j-1]. Otherwise it is one "
        "plus the best of replace, delete and insert.",
        "Base cases are dp[i][0] = i and dp[0][j] = j: turning a prefix into the empty string "
        "costs one deletion per character.",
    ],
    r"""
class Solution {
    public int minDistance(String word1, String word2) {
        int m = word1.length();
        int n = word2.length();
        int[] prev = new int[n + 1];
        int[] cur = new int[n + 1];
        for (int j = 0; j <= n; j++) prev[j] = j;
        for (int i = 1; i <= m; i++) {
            cur[0] = i;
            for (int j = 1; j <= n; j++) {
                if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                    cur[j] = prev[j - 1];
                } else {
                    cur[j] = 1 + Math.min(prev[j - 1], Math.min(prev[j], cur[j - 1]));
                }
            }
            int[] swap = prev;
            prev = cur;
            cur = swap;
        }
        return prev[n];
    }
}
""",
)

_m(
    74, "O(log(m * n))", "O(1)",
    [
        "Every row is sorted and each row starts after the previous one ends, so the matrix reads "
        "as one sorted array.",
        "Binary search indices 0 to m*n-1 and map index to a cell with `row = idx / n` and "
        "`col = idx % n`.",
        "The two-step variant (binary search the row, then inside it) is also O(log m + log n), "
        "which is the same bound; the flattened version is less code.",
    ],
    r"""
class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        if (matrix.length == 0 || matrix[0].length == 0) return false;
        int rows = matrix.length;
        int cols = matrix[0].length;
        int low = 0;
        int high = rows * cols - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            int value = matrix[mid / cols][mid % cols];
            if (value == target) return true;
            if (value < target) low = mid + 1;
            else high = mid - 1;
        }
        return false;
    }
}
""",
)

_m(
    76, "O(n + m)", "O(alphabet)",
    [
        "Grow the window until it is valid, then shrink from the left while it stays valid. Record "
        "the best valid window each time.",
        "Checking validity by comparing whole maps is O(alphabet) per step. Keep a counter of how "
        "many distinct characters are still short instead.",
        "Decrement that counter only when a character's count reaches exactly the required amount, "
        "and increment it only when the count drops below it.",
    ],
    r"""
import java.util.*;
class Solution {
    public String minWindow(String s, String t) {
        if (s.length() < t.length() || t.isEmpty()) return "";
        int[] need = new int[128];
        for (char c : t.toCharArray()) need[c]++;
        int missing = t.length();
        int bestStart = 0;
        int bestLen = Integer.MAX_VALUE;
        int left = 0;
        for (int right = 0; right < s.length(); right++) {
            if (need[s.charAt(right)]-- > 0) missing--;
            while (missing == 0) {
                if (right - left + 1 < bestLen) {
                    bestLen = right - left + 1;
                    bestStart = left;
                }
                if (need[s.charAt(left)]++ == 0) missing++;
                left++;
            }
        }
        return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
    }
}
""",
)

_m(
    79, "O(rows * cols * 3^L)", "O(L) recursion depth",
    [
        "From each cell, run a depth-first search that matches one character per level of "
        "recursion.",
        "A cell must not be reused inside the same path. Mark it before recursing and restore it "
        "afterwards so other starting cells still see the full board.",
        "Overwriting the visited cell with a sentinel character avoids allocating a separate "
        "boolean grid; just remember to put the original character back.",
    ],
    r"""
class Solution {
    public boolean exist(String[] board, String word) {
        if (board.length == 0 || word.isEmpty()) return false;
        char[][] grid = new char[board.length][];
        for (int r = 0; r < board.length; r++) grid[r] = board[r].toCharArray();
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (dfs(grid, r, c, word, 0)) return true;
            }
        }
        return false;
    }

    private boolean dfs(char[][] grid, int r, int c, String word, int index) {
        if (index == word.length()) return true;
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) return false;
        if (grid[r][c] != word.charAt(index)) return false;
        char original = grid[r][c];
        grid[r][c] = '#';
        boolean found = dfs(grid, r + 1, c, word, index + 1)
                || dfs(grid, r - 1, c, word, index + 1)
                || dfs(grid, r, c + 1, word, index + 1)
                || dfs(grid, r, c - 1, word, index + 1);
        grid[r][c] = original;
        return found;
    }
}
""",
)

_m(
    84, "O(n)", "O(n)",
    [
        "For each bar, the largest rectangle with that bar as the height stretches until a strictly "
        "shorter bar on each side.",
        "A stack that holds indices of increasing heights finds both boundaries in one pass: when "
        "you pop a bar, the current index is its right boundary and the new stack top is its left.",
        "Append a sentinel height of 0 at the end so every remaining bar is popped and measured.",
    ],
    r"""
import java.util.*;
class Solution {
    public int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        int best = 0;
        for (int i = 0; i <= heights.length; i++) {
            int height = i == heights.length ? 0 : heights[i];
            while (!stack.isEmpty() && heights[stack.peek()] >= height) {
                int barHeight = heights[stack.pop()];
                int left = stack.isEmpty() ? -1 : stack.peek();
                best = Math.max(best, barHeight * (i - left - 1));
            }
            stack.push(i);
        }
        return best;
    }
}
""",
)

_m(
    88, "O(m + n)", "O(1)",
    [
        "Merging front to back forces you to shift elements, which costs O(m * n).",
        "The tail of nums1 is empty. Fill it from the back, always writing the larger of the two "
        "current candidates.",
        "When nums1 runs out you must keep draining nums2, but when nums2 runs out you can stop: "
        "the rest of nums1 is already in place.",
    ],
    r"""
class Solution {
    public int[] merge(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1;
        int j = n - 1;
        int write = m + n - 1;
        while (j >= 0) {
            if (i >= 0 && nums1[i] > nums2[j]) nums1[write--] = nums1[i--];
            else nums1[write--] = nums2[j--];
        }
        return nums1;
    }
}
""",
)

_m(
    94, "O(n)", "O(h)",
    [
        "Inorder is left, node, right. The recursive version is three lines; the interview usually "
        "wants the iterative one.",
        "Push nodes while walking left. When you cannot go left any further, pop, record, and "
        "switch to the right child.",
        "Space is the stack depth, which is the tree height: O(log n) balanced, O(n) for a "
        "degenerate chain.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (node != null || !stack.isEmpty()) {
            while (node != null) {
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();
            out.add(node.val);
            node = node.right;
        }
        return out;
    }
}
""",
)

_m(
    98, "O(n)", "O(h)",
    [
        "Checking only `left.val < node.val < right.val` is the classic wrong answer: it misses a "
        "deep node that violates an ancestor's bound.",
        "Pass an open interval down the recursion. The left child inherits an upper bound of the "
        "node's value, the right child a lower bound.",
        "Use `Long` bounds or nullable bounds so a node holding `Integer.MIN_VALUE` is not rejected "
        "at the root.",
    ],
    r"""
class Solution {
    public boolean isValidBST(TreeNode root) {
        return check(root, null, null);
    }

    private boolean check(TreeNode node, Integer low, Integer high) {
        if (node == null) return true;
        if (low != null && node.val <= low) return false;
        if (high != null && node.val >= high) return false;
        return check(node.left, low, node.val) && check(node.right, node.val, high);
    }
}
""",
)

_m(
    102, "O(n)", "O(w)",
    [
        "Breadth-first search visits nodes level by level, but a plain queue loses the level "
        "boundaries.",
        "Snapshot `queue.size()` at the top of each iteration; that count is exactly one level.",
        "Space is the widest level, which is up to n/2 nodes in a complete tree.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> out = new ArrayList<>();
        if (root == null) return out;
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            List<Integer> level = new ArrayList<>(size);
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                level.add(node.val);
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
            out.add(level);
        }
        return out;
    }
}
""",
)

_m(
    103, "O(n)", "O(w)",
    [
        "This is level order with one extra bit of state: which direction the current level reads.",
        "Do not reverse the queue. Build the level list normally and reverse it, or insert at the "
        "front of a LinkedList, only for right-to-left levels.",
        "Flip the direction flag once per level, not once per node.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<List<Integer>> zigzagLevelOrder(TreeNode root) {
        List<List<Integer>> out = new ArrayList<>();
        if (root == null) return out;
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        boolean leftToRight = true;
        while (!queue.isEmpty()) {
            int size = queue.size();
            LinkedList<Integer> level = new LinkedList<>();
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                if (leftToRight) level.addLast(node.val);
                else level.addFirst(node.val);
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
            out.add(level);
            leftToRight = !leftToRight;
        }
        return out;
    }
}
""",
)

_m(
    104, "O(n)", "O(h)",
    [
        "Depth of a node is one plus the deeper of its two subtrees. That sentence is the whole "
        "recursion.",
        "The empty tree has depth 0, which is the only base case you need.",
        "If the interviewer bans recursion, do a level-order traversal and count the levels.",
    ],
    r"""
class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }
}
""",
)

_m(
    105, "O(n)", "O(n)",
    [
        "The first element of preorder is always the root. Where that value sits in inorder splits "
        "the array into the two subtrees.",
        "Scanning inorder for the root each time costs O(n^2). Precompute a value to index map.",
        "Carry an index into preorder that only ever moves forward, plus the inorder bounds for "
        "the current subtree.",
    ],
    r"""
import java.util.*;
class Solution {
    private int preorderIndex = 0;
    private Map<Integer, Integer> inorderIndex = new HashMap<>();

    public TreeNode buildTree(int[] preorder, int[] inorder) {
        for (int i = 0; i < inorder.length; i++) inorderIndex.put(inorder[i], i);
        return build(preorder, 0, inorder.length - 1);
    }

    private TreeNode build(int[] preorder, int left, int right) {
        if (left > right) return null;
        int value = preorder[preorderIndex++];
        TreeNode node = new TreeNode(value);
        int mid = inorderIndex.get(value);
        node.left = build(preorder, left, mid - 1);
        node.right = build(preorder, mid + 1, right);
        return node;
    }
}
""",
)

_m(
    124, "O(n)", "O(h)",
    [
        "Separate two quantities: the best path that passes through a node, and the best path that "
        "can be extended upward from it.",
        "A path handed to the parent can only use one child, so it is `node.val + max(0, "
        "max(leftGain, rightGain))`.",
        "The answer candidate at each node is `node.val + leftGain + rightGain`, with negative "
        "gains clamped to zero.",
    ],
    r"""
class Solution {
    private int best = Integer.MIN_VALUE;

    public int maxPathSum(TreeNode root) {
        gain(root);
        return best;
    }

    private int gain(TreeNode node) {
        if (node == null) return 0;
        int left = Math.max(0, gain(node.left));
        int right = Math.max(0, gain(node.right));
        best = Math.max(best, node.val + left + right);
        return node.val + Math.max(left, right);
    }
}
""",
)

_m(
    125, "O(n)", "O(1)",
    [
        "Building a filtered lowercase copy works but costs O(n) extra space. The interviewer "
        "usually wants O(1).",
        "Two pointers walking inward, each skipping non-alphanumeric characters before comparing.",
        "Compare case-insensitively, and keep the inner skip loops bounded by `left < right` so an "
        "all-punctuation string does not run off the end.",
    ],
    r"""
class Solution {
    public boolean isPalindrome(String s) {
        int left = 0;
        int right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}
""",
)

_m(
    127, "O(n * L^2)", "O(n * L)",
    [
        "Every word is a node and single-character edits are edges. Shortest path on an unweighted "
        "graph means breadth-first search, not dynamic programming.",
        "Comparing every pair of words to build edges is O(n^2 * L). Instead, generate the L * 26 "
        "candidate mutations of the current word and test each against a HashSet.",
        "Remove a word from the set the moment you enqueue it; that is what keeps the search from "
        "revisiting and looping.",
    ],
    r"""
import java.util.*;
class Solution {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> unused = new HashSet<>(wordList);
        if (!unused.contains(endWord)) return 0;
        Queue<String> queue = new ArrayDeque<>();
        queue.add(beginWord);
        unused.remove(beginWord);
        int steps = 1;
        while (!queue.isEmpty()) {
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                String word = queue.poll();
                if (word.equals(endWord)) return steps;
                char[] chars = word.toCharArray();
                for (int p = 0; p < chars.length; p++) {
                    char original = chars[p];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == original) continue;
                        chars[p] = c;
                        String next = new String(chars);
                        if (unused.remove(next)) queue.add(next);
                    }
                    chars[p] = original;
                }
            }
            steps++;
        }
        return 0;
    }
}
""",
)

_m(
    128, "O(n)", "O(n)",
    [
        "Sorting gives O(n log n) immediately. The follow-up asks for linear, which rules sorting "
        "out.",
        "Put everything in a HashSet, then only start counting from a value whose predecessor is "
        "absent.",
        "That guard is what makes it linear: each run is walked exactly once, so the total work is "
        "O(n) even though there is a loop inside a loop.",
    ],
    r"""
import java.util.*;
class Solution {
    public int longestConsecutive(int[] nums) {
        Set<Integer> values = new HashSet<>();
        for (int n : nums) values.add(n);
        int best = 0;
        for (int value : values) {
            if (values.contains(value - 1)) continue;
            int length = 1;
            while (values.contains(value + length)) length++;
            best = Math.max(best, length);
        }
        return best;
    }
}
""",
)

_m(
    133, "O(V + E)", "O(V)",
    [
        "A deep copy needs a map from original node to its clone, otherwise a cycle sends you into "
        "infinite recursion.",
        "Create the clone and register it in the map before recursing into neighbours. Order "
        "matters here.",
        "Whether you walk with DFS or BFS is a style choice; the map is what makes either one "
        "correct.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[][] cloneGraph(int[][] adj) {
        int n = adj.length;
        if (n == 0) return new int[0][];
        Node[] originals = new Node[n + 1];
        for (int i = 1; i <= n; i++) originals[i] = new Node(i);
        for (int i = 1; i <= n; i++) {
            for (int neighbor : adj[i - 1]) originals[i].neighbors.add(originals[neighbor]);
        }
        Node clone = clone(originals[1], new HashMap<>());
        int[][] out = new int[n][];
        Map<Integer, Node> byValue = new HashMap<>();
        collect(clone, byValue);
        for (int i = 1; i <= n; i++) {
            Node node = byValue.get(i);
            List<Node> neighbors = node == null ? List.of() : node.neighbors;
            out[i - 1] = new int[neighbors.size()];
            for (int j = 0; j < neighbors.size(); j++) out[i - 1][j] = neighbors.get(j).val;
        }
        return out;
    }

    private Node clone(Node node, Map<Node, Node> seen) {
        if (node == null) return null;
        Node existing = seen.get(node);
        if (existing != null) return existing;
        Node copy = new Node(node.val);
        seen.put(node, copy);
        for (Node neighbor : node.neighbors) copy.neighbors.add(clone(neighbor, seen));
        return copy;
    }

    private void collect(Node node, Map<Integer, Node> byValue) {
        if (node == null || byValue.containsKey(node.val)) return;
        byValue.put(node.val, node);
        for (Node neighbor : node.neighbors) collect(neighbor, byValue);
    }
}
class Node {
    public int val;
    public List<Node> neighbors = new ArrayList<>();
    public Node(int val) { this.val = val; }
}
""",
)

_m(
    141, "O(n)", "O(1)",
    [
        "A HashSet of visited nodes detects the cycle in O(n) time but O(n) space. The follow-up "
        "asks for constant space.",
        "Run a slow pointer one step at a time and a fast pointer two steps. If there is a loop, "
        "the fast pointer laps the slow one.",
        "The fast pointer is what terminates the loop: check both `fast` and `fast.next` for null "
        "before advancing.",
    ],
    r"""
class Solution {
    public boolean hasCycle(int[] values, int pos) {
        return detect(build(values, pos));
    }

    public boolean detect(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }

    private ListNode build(int[] values, int pos) {
        if (values.length == 0) return null;
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        ListNode cycle = null;
        for (int i = 0; i < values.length; i++) {
            cur.next = new ListNode(values[i]);
            cur = cur.next;
            if (i == pos) cycle = cur;
        }
        cur.next = cycle;
        return dummy.next;
    }
}
""",
)

_m(
    146, "O(1) per operation", "O(capacity)",
    [
        "You need O(1) lookup and O(1) reordering. No single built-in structure gives both, so "
        "combine two.",
        "A HashMap from key to node gives lookup; a doubly linked list in recency order gives "
        "O(1) move-to-front and O(1) eviction from the tail.",
        "Use sentinel head and tail nodes so unlink and insert never need null checks. Remember "
        "that `get` also counts as a use.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[][] args) {
        LRUCache cache = null;
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "LRUCache" -> cache = new LRUCache(args[i][0]);
                case "put" -> cache.put(args[i][0], args[i][1]);
                case "get" -> out.add(cache.get(args[i][0]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class LRUCache {
    private static class Entry {
        int key;
        int value;
        Entry prev;
        Entry next;
        Entry(int key, int value) { this.key = key; this.value = value; }
    }

    private final int capacity;
    private final Map<Integer, Entry> index = new HashMap<>();
    private final Entry head = new Entry(0, 0);
    private final Entry tail = new Entry(0, 0);

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Entry entry = index.get(key);
        if (entry == null) return -1;
        unlink(entry);
        pushFront(entry);
        return entry.value;
    }

    public void put(int key, int value) {
        Entry entry = index.get(key);
        if (entry != null) {
            entry.value = value;
            unlink(entry);
            pushFront(entry);
            return;
        }
        if (index.size() == capacity) {
            Entry evicted = tail.prev;
            unlink(evicted);
            index.remove(evicted.key);
        }
        Entry fresh = new Entry(key, value);
        index.put(key, fresh);
        pushFront(fresh);
    }

    private void unlink(Entry entry) {
        entry.prev.next = entry.next;
        entry.next.prev = entry.prev;
    }

    private void pushFront(Entry entry) {
        entry.next = head.next;
        entry.prev = head;
        head.next.prev = entry;
        head.next = entry;
    }
}
""",
)

_m(
    153, "O(log n)", "O(1)",
    [
        "The minimum is the single point where the array stops increasing. Binary search can find "
        "it without a target value.",
        "Compare `nums[mid]` with `nums[high]`, not with `nums[low]`: that tells you which side "
        "the rotation point is on.",
        "If `nums[mid] > nums[high]` the minimum is strictly right of mid, so `low = mid + 1`; "
        "otherwise mid itself may be the answer, so `high = mid`.",
    ],
    r"""
class Solution {
    public int findMin(int[] nums) {
        int low = 0;
        int high = nums.length - 1;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] > nums[high]) low = mid + 1;
            else high = mid;
        }
        return nums[low];
    }
}
""",
)

_m(
    155, "O(1) per operation", "O(n)",
    [
        "Recomputing the minimum on every call is O(n). The trick is to remember the minimum as of "
        "each push.",
        "Push a pair, or keep a parallel stack of running minima, so popping automatically "
        "restores the previous minimum.",
        "Pushing the minimum on every push wastes space only by a constant factor, and it removes "
        "every edge case around duplicate minima.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[] values) {
        MinStack stack = new MinStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> stack.pop();
                case "top" -> out.add(stack.top());
                case "getMin" -> out.add(stack.getMin());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class MinStack {
    private final Deque<int[]> stack = new ArrayDeque<>();

    public MinStack() {}

    public void push(int val) {
        int min = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
        stack.push(new int[] { val, min });
    }

    public void pop() {
        stack.pop();
    }

    public int top() {
        return stack.peek()[0];
    }

    public int getMin() {
        return stack.peek()[1];
    }
}
""",
)

_m(
    160, "O(m + n)", "O(1)",
    [
        "The lists have different lengths, so walking in lockstep from both heads misaligns them.",
        "Measure both lengths and skip the difference on the longer list, then walk together.",
        "The elegant version: when a pointer hits the end, restart it at the other head. Both "
        "pointers then travel m + n steps and meet at the junction, or both reach null.",
    ],
    r"""
class Solution {
    public int getIntersectionNode(int[] a, int[] b, int skipA, int skipB) {
        ListNode[] heads = build(a, b, skipA, skipB);
        ListNode node = getIntersection(heads[0], heads[1]);
        return node == null ? 0 : node.val;
    }

    public ListNode getIntersection(ListNode headA, ListNode headB) {
        if (headA == null || headB == null) return null;
        ListNode p = headA;
        ListNode q = headB;
        while (p != q) {
            p = p == null ? headB : p.next;
            q = q == null ? headA : q.next;
        }
        return p;
    }

    private ListNode[] build(int[] a, int[] b, int skipA, int skipB) {
        ListNode[] nodesA = new ListNode[a.length];
        for (int i = 0; i < a.length; i++) nodesA[i] = new ListNode(a[i]);
        for (int i = 0; i + 1 < a.length; i++) nodesA[i].next = nodesA[i + 1];
        ListNode[] nodesB = new ListNode[Math.max(skipB, 0)];
        for (int i = 0; i < skipB; i++) nodesB[i] = new ListNode(b[i]);
        for (int i = 0; i + 1 < skipB; i++) nodesB[i].next = nodesB[i + 1];
        ListNode shared = skipA >= 0 && skipA < a.length ? nodesA[skipA] : null;
        if (skipB > 0) nodesB[skipB - 1].next = shared;
        ListNode headB = skipB > 0 ? nodesB[0] : shared;
        ListNode headA = a.length == 0 ? null : nodesA[0];
        return new ListNode[] { headA, headB };
    }
}
""",
)

_m(
    162, "O(log n)", "O(1)",
    [
        "There is no sorted order to exploit, yet the problem still wants logarithmic time. That "
        "is the hint: binary search does not require a sorted array, only a decidable direction.",
        "Compare `nums[mid]` with `nums[mid + 1]`. If the slope rises, a peak exists to the right; "
        "if it falls, a peak exists at mid or to the left.",
        "The out-of-bounds neighbours are treated as negative infinity, which is what guarantees a "
        "peak always exists.",
    ],
    r"""
class Solution {
    public int findPeakElement(int[] nums) {
        int low = 0;
        int high = nums.length - 1;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] < nums[mid + 1]) low = mid + 1;
            else high = mid;
        }
        return low;
    }
}
""",
)

_m(
    167, "O(n)", "O(1)",
    [
        "The array is sorted, so a HashMap is overkill and costs space you do not need.",
        "Two pointers at both ends: the sum is monotone in each pointer, so every comparison "
        "eliminates one candidate for good.",
        "Sum too small means the left value is too small, so move left inward; sum too large means "
        "move right inward. Watch the 1-based output indices.",
    ],
    r"""
class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int left = 0;
        int right = numbers.length - 1;
        while (left < right) {
            int sum = numbers[left] + numbers[right];
            if (sum == target) return new int[] { left + 1, right + 1 };
            if (sum < target) left++;
            else right--;
        }
        return new int[0];
    }
}
""",
)

_m(
    198, "O(n)", "O(1)",
    [
        "At every house you make one binary choice: rob it and skip the neighbour, or skip it and "
        "keep the best so far.",
        "dp[i] = max(dp[i-1], dp[i-2] + nums[i]). That single line is the whole problem.",
        "You only ever read two previous states, so replace the array with two rolling variables.",
    ],
    r"""
class Solution {
    public int rob(int[] nums) {
        int skip = 0;
        int take = 0;
        for (int value : nums) {
            int next = Math.max(skip + value, take);
            skip = take;
            take = next;
        }
        return take;
    }
}
""",
)

_m(
    200, "O(rows * cols)", "O(rows * cols)",
    [
        "Every land cell belongs to exactly one island. Counting islands means counting how many "
        "times you have to start a fresh traversal.",
        "When you find an unvisited '1', increment the counter and flood the entire connected "
        "component so it is never counted again.",
        "Sinking the island by writing '0' over it avoids a visited array, but mention to the "
        "interviewer that it mutates the input.",
    ],
    r"""
class Solution {
    public int numIslands(String[] grid) {
        if (grid.length == 0) return 0;
        char[][] cells = new char[grid.length][];
        for (int r = 0; r < grid.length; r++) cells[r] = grid[r].toCharArray();
        int islands = 0;
        for (int r = 0; r < cells.length; r++) {
            for (int c = 0; c < cells[r].length; c++) {
                if (cells[r][c] == '1') {
                    islands++;
                    sink(cells, r, c);
                }
            }
        }
        return islands;
    }

    private void sink(char[][] cells, int r, int c) {
        if (r < 0 || r >= cells.length || c < 0 || c >= cells[r].length) return;
        if (cells[r][c] != '1') return;
        cells[r][c] = '0';
        sink(cells, r + 1, c);
        sink(cells, r - 1, c);
        sink(cells, r, c + 1);
        sink(cells, r, c - 1);
    }
}
""",
)

_m(
    206, "O(n)", "O(1)",
    [
        "Reversing means every node's `next` points to what used to precede it. Track that "
        "predecessor as you walk.",
        "Save `cur.next` before you overwrite it, or you lose the rest of the list immediately.",
        "The loop ends with `cur` at null and `prev` at the new head. The recursive version is "
        "shorter but costs O(n) stack.",
    ],
    r"""
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode cur = head;
        while (cur != null) {
            ListNode next = cur.next;
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        return prev;
    }
}
""",
)

_m(
    207, "O(V + E)", "O(V + E)",
    [
        "Courses and prerequisites form a directed graph. 'Can I finish?' is exactly 'is this "
        "graph acyclic?'",
        "Kahn's algorithm: repeatedly remove a node with in-degree zero. If you cannot remove all "
        "n nodes, the leftovers form a cycle.",
        "The DFS alternative needs three colours (unvisited, in-progress, done); a back edge to an "
        "in-progress node is the cycle.",
    ],
    r"""
import java.util.*;
class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
        int[] indegree = new int[numCourses];
        for (int[] edge : prerequisites) {
            graph.get(edge[1]).add(edge[0]);
            indegree[edge[0]]++;
        }
        Queue<Integer> ready = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) {
            if (indegree[i] == 0) ready.add(i);
        }
        int taken = 0;
        while (!ready.isEmpty()) {
            int course = ready.poll();
            taken++;
            for (int next : graph.get(course)) {
                if (--indegree[next] == 0) ready.add(next);
            }
        }
        return taken == numCourses;
    }
}
""",
)

_m(
    208, "O(L) per operation", "O(total characters)",
    [
        "A HashSet answers `search` in O(1) but cannot answer `startsWith` without scanning every "
        "key. That gap is why the trie exists.",
        "Each node holds 26 child links and a flag saying 'a word ends here'. Insert walks down, "
        "creating nodes as needed.",
        "`search` and `startsWith` share the same walk; they differ only in whether the final node "
        "must carry the end-of-word flag.",
    ],
    r"""
import java.util.*;
class Solution {
    public String[] process(String[] operations, String[][] args) {
        Trie trie = new Trie();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert" -> trie.insert(args[i][0]);
                case "search" -> out.add(String.valueOf(trie.search(args[i][0])));
                case "startsWith" -> out.add(String.valueOf(trie.startsWith(args[i][0])));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class Trie {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean terminal;
    }

    private final TrieNode root = new TrieNode();

    public Trie() {}

    public void insert(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int index = c - 'a';
            if (node.children[index] == null) node.children[index] = new TrieNode();
            node = node.children[index];
        }
        node.terminal = true;
    }

    public boolean search(String word) {
        TrieNode node = walk(word);
        return node != null && node.terminal;
    }

    public boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }

    private TrieNode walk(String text) {
        TrieNode node = root;
        for (char c : text.toCharArray()) {
            node = node.children[c - 'a'];
            if (node == null) return null;
        }
        return node;
    }
}
""",
)

_m(
    209, "O(n)", "O(1)",
    [
        "All values are positive, which means the window sum grows when you extend right and "
        "shrinks when you advance left. That monotonicity is what makes a sliding window valid.",
        "Extend right until the sum reaches the target, then shrink from the left as far as it "
        "still can while staying at or above target.",
        "Shrink with a while loop, not an if: one new element can allow several removals.",
    ],
    r"""
class Solution {
    public int minSubArrayLen(int target, int[] nums) {
        int best = Integer.MAX_VALUE;
        int sum = 0;
        int left = 0;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum >= target) {
                best = Math.min(best, right - left + 1);
                sum -= nums[left++];
            }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }
}
""",
)

_m(
    210, "O(V + E)", "O(V + E)",
    [
        "This is Course Schedule with the order kept instead of discarded, so the same topological "
        "sort answers both.",
        "With Kahn's algorithm the order you dequeue nodes is a valid topological order; collect "
        "it as you go.",
        "If the collected order is shorter than numCourses there is a cycle, and the contract says "
        "return an empty array.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] findOrder(int numCourses, int[][] prerequisites) {
        List<List<Integer>> graph = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
        int[] indegree = new int[numCourses];
        for (int[] edge : prerequisites) {
            graph.get(edge[1]).add(edge[0]);
            indegree[edge[0]]++;
        }
        Queue<Integer> ready = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) {
            if (indegree[i] == 0) ready.add(i);
        }
        int[] order = new int[numCourses];
        int size = 0;
        while (!ready.isEmpty()) {
            int course = ready.poll();
            order[size++] = course;
            for (int next : graph.get(course)) {
                if (--indegree[next] == 0) ready.add(next);
            }
        }
        return size == numCourses ? order : new int[0];
    }
}
""",
)

_m(
    213, "O(n)", "O(1)",
    [
        "The houses form a circle, so the first and last are now neighbours and cannot both be "
        "robbed.",
        "That constraint splits into two independent linear problems: rob houses 0..n-2, or rob "
        "houses 1..n-1.",
        "Run the House Robber scan twice and take the larger result. Handle n == 1 before you "
        "split, or both ranges come out empty.",
    ],
    r"""
class Solution {
    public int rob(int[] nums) {
        if (nums.length == 1) return nums[0];
        return Math.max(robRange(nums, 0, nums.length - 2), robRange(nums, 1, nums.length - 1));
    }

    private int robRange(int[] nums, int from, int to) {
        int skip = 0;
        int take = 0;
        for (int i = from; i <= to; i++) {
            int next = Math.max(skip + nums[i], take);
            skip = take;
            take = next;
        }
        return take;
    }
}
""",
)

_m(
    215, "O(n) average", "O(k)",
    [
        "Sorting is O(n log n) and answers a harder question than you asked. You only need one "
        "position.",
        "A min-heap capped at size k keeps the k largest seen so far; its root is the answer and "
        "the cost is O(n log k).",
        "Quickselect gives O(n) on average by partitioning and recursing into only the side that "
        "contains index n-k. Randomise the pivot to avoid the sorted-input worst case.",
    ],
    r"""
import java.util.*;
class Solution {
    public int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        for (int value : nums) {
            heap.add(value);
            if (heap.size() > k) heap.poll();
        }
        return heap.peek();
    }
}
""",
)

_m(
    217, "O(n)", "O(n)",
    [
        "Sorting makes duplicates adjacent and costs O(n log n) with O(1) extra space.",
        "A HashSet trades space for time: return true the first time an insert fails.",
        "Say both out loud in the interview and name the trade-off; that is what the question is "
        "really testing.",
    ],
    r"""
import java.util.*;
class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int value : nums) {
            if (!seen.add(value)) return true;
        }
        return false;
    }
}
""",
)

_m(
    226, "O(n)", "O(h)",
    [
        "Inverting a tree means swapping the two children of every node.",
        "Recursion is three lines: swap the children, then recurse into both.",
        "The iterative version is any traversal (BFS or DFS) that performs the same swap at each "
        "node; the traversal order does not matter.",
    ],
    r"""
class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode left = root.left;
        root.left = invertTree(root.right);
        root.right = invertTree(left);
        return root;
    }
}
""",
)

_m(
    230, "O(h + k)", "O(h)",
    [
        "An inorder traversal of a BST emits values in sorted order, so the kth value emitted is "
        "the answer.",
        "Do not collect the whole traversal: stop the moment the counter reaches k. That is what "
        "makes it O(h + k) instead of O(n).",
        "If the interviewer asks about frequent queries on a mutable tree, the answer is to store "
        "a subtree size in each node and descend in O(h).",
    ],
    r"""
import java.util.*;
class Solution {
    public int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (node != null || !stack.isEmpty()) {
            while (node != null) {
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();
            if (--k == 0) return node.val;
            node = node.right;
        }
        return -1;
    }
}
""",
)

_m(
    235, "O(h)", "O(1)",
    [
        "In a BST you never have to search both subtrees. The node values tell you which way to "
        "go.",
        "If both targets are smaller than the current node, the answer is in the left subtree; if "
        "both are larger, it is in the right subtree.",
        "The first node that sits between them, inclusive, is the lowest common ancestor. No "
        "recursion or extra space is needed.",
    ],
    r"""
class Solution {
    public int lowestCommonAncestor(TreeNode root, int p, int q) {
        TreeNode node = root;
        int low = Math.min(p, q);
        int high = Math.max(p, q);
        while (node != null) {
            if (node.val > high) node = node.left;
            else if (node.val < low) node = node.right;
            else return node.val;
        }
        return -1;
    }
}
""",
)

_m(
    236, "O(n)", "O(h)",
    [
        "Without the BST ordering you must actually search both subtrees, so the bound becomes "
        "O(n).",
        "Return the node itself when you find p or q, and null when a subtree contains neither.",
        "A node whose two recursive calls both return non-null is the split point, and therefore "
        "the answer. Otherwise pass up whichever side was non-null.",
    ],
    r"""
class Solution {
    public int lowestCommonAncestor(TreeNode root, int p, int q) {
        TreeNode node = find(root, p, q);
        return node == null ? -1 : node.val;
    }

    private TreeNode find(TreeNode node, int p, int q) {
        if (node == null || node.val == p || node.val == q) return node;
        TreeNode left = find(node.left, p, q);
        TreeNode right = find(node.right, p, q);
        if (left != null && right != null) return node;
        return left != null ? left : right;
    }
}
""",
)

_m(
    239, "O(n)", "O(k)",
    [
        "Recomputing the maximum per window is O(n * k), and a heap only gets you to O(n log k) "
        "because stale entries linger.",
        "Keep a deque of indices whose values are strictly decreasing. The front is always the "
        "window maximum.",
        "Two evictions per step: drop the front when it falls out of the window, and drop the back "
        "while it is no larger than the incoming value.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        if (nums.length == 0 || k == 0) return new int[0];
        int[] out = new int[nums.length - k + 1];
        Deque<Integer> window = new ArrayDeque<>();
        for (int i = 0; i < nums.length; i++) {
            while (!window.isEmpty() && window.peekFirst() <= i - k) window.pollFirst();
            while (!window.isEmpty() && nums[window.peekLast()] <= nums[i]) window.pollLast();
            window.addLast(i);
            if (i >= k - 1) out[i - k + 1] = nums[window.peekFirst()];
        }
        return out;
    }
}
""",
)

_m(
    242, "O(n)", "O(1) for a fixed alphabet",
    [
        "Sorting both strings and comparing is O(n log n) and always correct.",
        "Counting characters is linear: increment for s, decrement for t, then check every count "
        "is zero.",
        "Ask about the alphabet. For lowercase English a 26-slot array is enough; for Unicode you "
        "need a HashMap keyed by code point.",
    ],
    r"""
class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] counts = new int[26];
        for (int i = 0; i < s.length(); i++) {
            counts[s.charAt(i) - 'a']++;
            counts[t.charAt(i) - 'a']--;
        }
        for (int count : counts) {
            if (count != 0) return false;
        }
        return true;
    }
}
""",
)

_m(
    253, "O(n log n)", "O(n)",
    [
        "You never care which meeting is in which room, only how many overlap at the busiest "
        "moment.",
        "Sort by start time and keep a min-heap of end times. Before starting a meeting, release "
        "every room whose end time has already passed.",
        "The equivalent sweep-line view: sort starts and ends separately, walk them together, and "
        "track the running count of open meetings.",
    ],
    r"""
import java.util.*;
class Solution {
    public int minMeetingRooms(int[][] intervals) {
        if (intervals.length == 0) return 0;
        Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
        PriorityQueue<Integer> ends = new PriorityQueue<>();
        for (int[] meeting : intervals) {
            if (!ends.isEmpty() && ends.peek() <= meeting[0]) ends.poll();
            ends.add(meeting[1]);
        }
        return ends.size();
    }
}
""",
)

_m(
    269, "O(total characters)", "O(1) for a fixed alphabet",
    [
        "Each adjacent pair of words gives you exactly one ordering fact: the first position where "
        "they differ.",
        "Build a graph from those facts and topologically sort it. Letters that appear but are "
        "never constrained still have to appear in the output.",
        "Two failure cases return the empty string: a cycle, and a prefix violation where a longer "
        "word precedes its own prefix.",
    ],
    r"""
import java.util.*;
class Solution {
    public String alienOrder(String[] words) {
        Map<Character, Set<Character>> graph = new HashMap<>();
        Map<Character, Integer> indegree = new HashMap<>();
        for (String word : words) {
            for (char c : word.toCharArray()) {
                graph.putIfAbsent(c, new HashSet<>());
                indegree.putIfAbsent(c, 0);
            }
        }
        for (int i = 0; i + 1 < words.length; i++) {
            String first = words[i];
            String second = words[i + 1];
            int limit = Math.min(first.length(), second.length());
            if (first.length() > second.length() && first.startsWith(second)) return "";
            for (int j = 0; j < limit; j++) {
                char a = first.charAt(j);
                char b = second.charAt(j);
                if (a != b) {
                    if (graph.get(a).add(b)) indegree.merge(b, 1, Integer::sum);
                    break;
                }
            }
        }
        Queue<Character> ready = new ArrayDeque<>();
        for (Map.Entry<Character, Integer> entry : indegree.entrySet()) {
            if (entry.getValue() == 0) ready.add(entry.getKey());
        }
        StringBuilder order = new StringBuilder();
        while (!ready.isEmpty()) {
            char c = ready.poll();
            order.append(c);
            for (char next : graph.get(c)) {
                if (indegree.merge(next, -1, Integer::sum) == 0) ready.add(next);
            }
        }
        return order.length() == indegree.size() ? order.toString() : "";
    }
}
""",
)

_m(
    283, "O(n)", "O(1)",
    [
        "Removing elements one at a time shifts the tail repeatedly and costs O(n^2).",
        "Use a write pointer for the next non-zero slot. Copy every non-zero forward, then fill "
        "the remainder with zeros.",
        "The swap variant does it in a single pass and performs the minimum number of writes, "
        "which is what the follow-up asks for.",
    ],
    r"""
class Solution {
    public int[] moveZeroes(int[] nums) {
        int write = 0;
        for (int read = 0; read < nums.length; read++) {
            if (nums[read] != 0) {
                int temp = nums[write];
                nums[write] = nums[read];
                nums[read] = temp;
                write++;
            }
        }
        return nums;
    }
}
""",
)

_m(
    297, "O(n)", "O(n)",
    [
        "Inorder alone is not enough to rebuild a tree. Preorder with explicit null markers is, "
        "and so is level order with null markers.",
        "Serialize with a preorder walk that writes a sentinel for every missing child; "
        "deserialize by consuming the same stream in the same order.",
        "Deserialization is naturally recursive: read a token, and if it is not the sentinel, "
        "build the node and recurse left then right.",
    ],
    r"""
import java.util.*;
class Solution {
    public TreeNode roundtrip(TreeNode root) {
        Codec codec = new Codec();
        return codec.deserialize(codec.serialize(root));
    }
}
class Codec {
    public String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        write(root, sb);
        return sb.toString();
    }

    private void write(TreeNode node, StringBuilder sb) {
        if (sb.length() > 0) sb.append(',');
        if (node == null) {
            sb.append('#');
            return;
        }
        sb.append(node.val);
        write(node.left, sb);
        write(node.right, sb);
    }

    public TreeNode deserialize(String data) {
        Deque<String> tokens = new ArrayDeque<>(Arrays.asList(data.split(",")));
        return read(tokens);
    }

    private TreeNode read(Deque<String> tokens) {
        if (tokens.isEmpty()) return null;
        String token = tokens.poll();
        if (token.equals("#") || token.isEmpty()) return null;
        TreeNode node = new TreeNode(Integer.parseInt(token));
        node.left = read(tokens);
        node.right = read(tokens);
        return node;
    }
}
""",
)

_m(
    300, "O(n log n)", "O(n)",
    [
        "The O(n^2) dynamic program is dp[i] = 1 + max(dp[j]) over every j < i with nums[j] < "
        "nums[i]. Get that right before optimising.",
        "Patience sorting keeps an array `tails` where tails[k] is the smallest possible tail of "
        "an increasing subsequence of length k+1.",
        "For each value, binary search for the first tail at least as large and overwrite it. The "
        "length of `tails` is the answer, but its contents are not a valid subsequence.",
    ],
    r"""
import java.util.*;
class Solution {
    public int lengthOfLIS(int[] nums) {
        int[] tails = new int[nums.length];
        int size = 0;
        for (int value : nums) {
            int low = 0;
            int high = size;
            while (low < high) {
                int mid = low + (high - low) / 2;
                if (tails[mid] < value) low = mid + 1;
                else high = mid;
            }
            tails[low] = value;
            if (low == size) size++;
        }
        return size;
    }
}
""",
)

_m(
    322, "O(amount * coins)", "O(amount)",
    [
        "Greedy fails here: taking the biggest coin first gives 4 coins for amount 6 with coins "
        "[1,3,4] when 2 is possible.",
        "dp[a] is the fewest coins that make amount a. For each coin, dp[a] = min(dp[a], "
        "dp[a - coin] + 1).",
        "Initialise with a sentinel larger than any real answer (amount + 1 works) so unreachable "
        "amounts stay unreachable.",
    ],
    r"""
import java.util.*;
class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int value = 1; value <= amount; value++) {
            for (int coin : coins) {
                if (coin <= value) dp[value] = Math.min(dp[value], dp[value - coin] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}
""",
)

_m(
    323, "O(V + E)", "O(V)",
    [
        "Start with n components and watch what a useful edge does to that count.",
        "Union-Find: every edge that joins two different components reduces the count by one. "
        "Edges inside a component change nothing.",
        "Path compression plus union by rank keeps each operation near constant. A plain DFS from "
        "every unvisited node is equally acceptable and often easier to write.",
    ],
    r"""
class Solution {
    public int countComponents(int n, int[][] edges) {
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int components = n;
        for (int[] edge : edges) {
            int a = find(parent, edge[0]);
            int b = find(parent, edge[1]);
            if (a != b) {
                parent[a] = b;
                components--;
            }
        }
        return components;
    }

    private int find(int[] parent, int node) {
        while (parent[node] != node) {
            parent[node] = parent[parent[node]];
            node = parent[node];
        }
        return node;
    }
}
""",
)

_m(
    340, "O(n)", "O(k)",
    [
        "The window is valid while it holds at most k distinct characters, so the counter you need "
        "is the number of distinct keys currently inside.",
        "Extend right always; shrink from the left only while the distinct count exceeds k.",
        "Remove the key from the map when its count hits zero, otherwise the distinct count never "
        "goes back down.",
    ],
    r"""
import java.util.*;
class Solution {
    public int lengthOfLongestSubstringKDistinct(String s, int k) {
        if (k == 0) return 0;
        Map<Character, Integer> counts = new HashMap<>();
        int best = 0;
        int left = 0;
        for (int right = 0; right < s.length(); right++) {
            counts.merge(s.charAt(right), 1, Integer::sum);
            while (counts.size() > k) {
                char out = s.charAt(left++);
                if (counts.merge(out, -1, Integer::sum) == 0) counts.remove(out);
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
)

_m(
    347, "O(n log k)", "O(n)",
    [
        "Count frequencies first; the rest of the problem is 'top k by value' over at most n "
        "distinct keys.",
        "A min-heap of size k gives O(n log k). Sorting all distinct keys is O(n log n), which is "
        "worse when k is small.",
        "Bucket sort gives true O(n): index buckets by frequency, since no frequency can exceed n, "
        "then read buckets from the high end.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> counts = new HashMap<>();
        for (int value : nums) counts.merge(value, 1, Integer::sum);
        List<List<Integer>> buckets = new ArrayList<>();
        for (int i = 0; i <= nums.length; i++) buckets.add(new ArrayList<>());
        for (Map.Entry<Integer, Integer> entry : counts.entrySet()) {
            buckets.get(entry.getValue()).add(entry.getKey());
        }
        int[] out = new int[k];
        int size = 0;
        for (int freq = nums.length; freq >= 1 && size < k; freq--) {
            for (int value : buckets.get(freq)) {
                if (size == k) break;
                out[size++] = value;
            }
        }
        return out;
    }
}
""",
)

_m(
    355, "O(followees log n) per feed", "O(users + tweets)",
    [
        "Two maps carry the whole design: user to their tweets, and user to the set of people they "
        "follow.",
        "Tweets need a global monotonically increasing timestamp, otherwise you cannot order "
        "tweets from different users.",
        "The feed is a k-way merge of the newest tweets of each followee, which is exactly what a "
        "heap of size k does. The real-world follow-up is fan-out on write versus on read.",
    ],
    r"""
import java.util.*;
class Solution {
    public String[] process(String[] operations, int[][] args) {
        Twitter twitter = new Twitter();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "postTweet" -> twitter.postTweet(args[i][0], args[i][1]);
                case "getNewsFeed" -> out.add(Helpers.format(twitter.getNewsFeed(args[i][0])));
                case "follow" -> twitter.follow(args[i][0], args[i][1]);
                case "unfollow" -> twitter.unfollow(args[i][0], args[i][1]);
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class Twitter {
    private int clock = 0;
    private final Map<Integer, List<int[]>> tweets = new HashMap<>();
    private final Map<Integer, Set<Integer>> following = new HashMap<>();

    public Twitter() {}

    public void postTweet(int userId, int tweetId) {
        tweets.computeIfAbsent(userId, id -> new ArrayList<>()).add(new int[] { clock++, tweetId });
    }

    public List<Integer> getNewsFeed(int userId) {
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> b[0] - a[0]);
        Set<Integer> sources = new HashSet<>(following.getOrDefault(userId, Set.of()));
        sources.add(userId);
        for (int source : sources) {
            List<int[]> posts = tweets.get(source);
            if (posts == null) continue;
            for (int i = posts.size() - 1; i >= 0 && i >= posts.size() - 10; i--) {
                heap.add(posts.get(i));
            }
        }
        List<Integer> feed = new ArrayList<>();
        while (!heap.isEmpty() && feed.size() < 10) feed.add(heap.poll()[1]);
        return feed;
    }

    public void follow(int followerId, int followeeId) {
        if (followerId == followeeId) return;
        following.computeIfAbsent(followerId, id -> new HashSet<>()).add(followeeId);
    }

    public void unfollow(int followerId, int followeeId) {
        Set<Integer> set = following.get(followerId);
        if (set != null) set.remove(followeeId);
    }
}
""",
)

_m(
    362, "O(1) amortised per call", "O(window)",
    [
        "Timestamps arrive in non-decreasing order, so anything older than 300 seconds can be "
        "discarded permanently rather than searched.",
        "A queue of timestamps, drained from the front on every call, is the simplest correct "
        "design.",
        "For a high hit rate, a 300-slot circular buffer of (second, count) pairs holds memory "
        "constant; that is the answer the interviewer is fishing for.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[] values) {
        HitCounter counter = new HitCounter();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "hit" -> counter.hit(values[i]);
                case "getHits" -> out.add(counter.getHits(values[i]));
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class HitCounter {
    private final int[] seconds = new int[300];
    private final int[] counts = new int[300];

    public HitCounter() {}

    public void hit(int timestamp) {
        int slot = timestamp % 300;
        if (seconds[slot] != timestamp) {
            seconds[slot] = timestamp;
            counts[slot] = 1;
        } else {
            counts[slot]++;
        }
    }

    public int getHits(int timestamp) {
        int total = 0;
        for (int i = 0; i < 300; i++) {
            if (timestamp - seconds[i] < 300) total += counts[i];
        }
        return total;
    }
}
""",
)

_m(
    380, "O(1) average per operation", "O(n)",
    [
        "A HashSet gives O(1) insert and remove but cannot pick a uniform random element; an "
        "ArrayList gives O(1) random access but O(n) removal.",
        "Use both: an ArrayList holding the values and a HashMap from value to its index in that "
        "list.",
        "To remove, swap the target with the last element, update that element's index, then pop "
        "the tail. Order is irrelevant, which is what makes the swap legal.",
    ],
    r"""
import java.util.*;
class Solution {
    public String[] process(String[] operations, int[] values) {
        RandomizedSet set = new RandomizedSet();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "insert" -> out.add(String.valueOf(set.insert(values[i])));
                case "remove" -> out.add(String.valueOf(set.remove(values[i])));
                case "getRandom" -> out.add(String.valueOf(set.getRandom()));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class RandomizedSet {
    private final List<Integer> values = new ArrayList<>();
    private final Map<Integer, Integer> indexOf = new HashMap<>();
    private final Random random = new Random();

    public RandomizedSet() {}

    public boolean insert(int val) {
        if (indexOf.containsKey(val)) return false;
        indexOf.put(val, values.size());
        values.add(val);
        return true;
    }

    public boolean remove(int val) {
        Integer index = indexOf.remove(val);
        if (index == null) return false;
        int last = values.get(values.size() - 1);
        values.set(index, last);
        if (last != val) indexOf.put(last, index);
        values.remove(values.size() - 1);
        return true;
    }

    public int getRandom() {
        return values.get(random.nextInt(values.size()));
    }
}
""",
)

_m(
    417, "O(rows * cols)", "O(rows * cols)",
    [
        "Simulating the flow forward from every cell is O((rows * cols)^2). Reverse the question.",
        "Start at the ocean borders and walk uphill (to neighbours that are at least as high), "
        "marking everything that can reach that ocean.",
        "Run the reverse flood twice, once per ocean, and intersect the two reachable sets.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<List<Integer>> pacificAtlantic(int[][] heights) {
        List<List<Integer>> out = new ArrayList<>();
        if (heights.length == 0 || heights[0].length == 0) return out;
        int rows = heights.length;
        int cols = heights[0].length;
        boolean[][] pacific = new boolean[rows][cols];
        boolean[][] atlantic = new boolean[rows][cols];
        for (int r = 0; r < rows; r++) {
            flow(heights, pacific, r, 0);
            flow(heights, atlantic, r, cols - 1);
        }
        for (int c = 0; c < cols; c++) {
            flow(heights, pacific, 0, c);
            flow(heights, atlantic, rows - 1, c);
        }
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (pacific[r][c] && atlantic[r][c]) out.add(List.of(r, c));
            }
        }
        return out;
    }

    private void flow(int[][] heights, boolean[][] seen, int r, int c) {
        seen[r][c] = true;
        int[][] steps = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
        for (int[] step : steps) {
            int nr = r + step[0];
            int nc = c + step[1];
            if (nr < 0 || nr >= heights.length || nc < 0 || nc >= heights[0].length) continue;
            if (seen[nr][nc] || heights[nr][nc] < heights[r][c]) continue;
            flow(heights, seen, nr, nc);
        }
    }
}
""",
)

_m(
    424, "O(n)", "O(1)",
    [
        "A window is valid when `length - countOfMostFrequentCharacter <= k`, because everything "
        "else must be replaced.",
        "Track the count of the most frequent character seen in any window so far. It never needs "
        "to be decreased.",
        "Since the answer only grows, the window never has to shrink by more than one step per "
        "iteration; an `if` is enough where other problems need a `while`.",
    ],
    r"""
class Solution {
    public int characterReplacement(String s, int k) {
        int[] counts = new int[26];
        int left = 0;
        int maxCount = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right++) {
            maxCount = Math.max(maxCount, ++counts[s.charAt(right) - 'A']);
            while (right - left + 1 - maxCount > k) {
                counts[s.charAt(left) - 'A']--;
                left++;
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
)

_m(
    438, "O(n)", "O(1) for a fixed alphabet",
    [
        "Every anagram of p has exactly p.length() characters, so the window size is fixed. That "
        "removes all the shrink logic.",
        "Slide a window of that width, adding the entering character and removing the leaving one "
        "in O(1).",
        "Comparing two 26-slot arrays each step is O(26) and still linear overall, but tracking a "
        "single 'matches' counter is the cleaner answer.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<Integer> findAnagrams(String s, String p) {
        List<Integer> out = new ArrayList<>();
        if (s.length() < p.length()) return out;
        int[] need = new int[26];
        int[] window = new int[26];
        for (char c : p.toCharArray()) need[c - 'a']++;
        for (int i = 0; i < s.length(); i++) {
            window[s.charAt(i) - 'a']++;
            if (i >= p.length()) window[s.charAt(i - p.length()) - 'a']--;
            if (i >= p.length() - 1 && Arrays.equals(need, window)) out.add(i - p.length() + 1);
        }
        return out;
    }
}
""",
)

_m(
    535, "O(1) per call", "O(n)",
    [
        "Correctness needs only a map from a generated key back to the original URL. The interview "
        "value is in how you generate the key.",
        "An incrementing counter encoded in base 62 gives the shortest keys and no collisions, but "
        "it leaks how many URLs exist and is guessable.",
        "Random keys need a collision check on insert; hashing the URL gives idempotence but needs "
        "a documented strategy for hash collisions.",
    ],
    r"""
import java.util.*;
class Solution {
    public String roundtrip(String url) {
        Codec codec = new Codec();
        return codec.decode(codec.encode(url));
    }
}
class Codec {
    private static final String ALPHABET =
            "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private final Map<String, String> byKey = new HashMap<>();
    private int counter = 1;

    public String encode(String longUrl) {
        String key = toBase62(counter++);
        byKey.put(key, longUrl);
        return "http://tinyurl.com/" + key;
    }

    public String decode(String shortUrl) {
        return byKey.get(shortUrl.substring(shortUrl.lastIndexOf('/') + 1));
    }

    private String toBase62(int value) {
        StringBuilder sb = new StringBuilder();
        while (value > 0) {
            sb.append(ALPHABET.charAt(value % 62));
            value /= 62;
        }
        return sb.reverse().toString();
    }
}
""",
)

_m(
    560, "O(n)", "O(n)",
    [
        "Every subarray sum is a difference of two prefix sums, so the question becomes how many "
        "earlier prefixes equal `current - k`.",
        "Keep a HashMap from prefix sum to how many times it has occurred, and seed it with "
        "`{0: 1}` for subarrays that start at index 0.",
        "A sliding window does not work here: negative numbers break the monotonicity the window "
        "depends on.",
    ],
    r"""
import java.util.*;
class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>();
        seen.put(0, 1);
        int prefix = 0;
        int count = 0;
        for (int value : nums) {
            prefix += value;
            count += seen.getOrDefault(prefix - k, 0);
            seen.merge(prefix, 1, Integer::sum);
        }
        return count;
    }
}
""",
)

_m(
    567, "O(n)", "O(1) for a fixed alphabet",
    [
        "A permutation of s1 inside s2 is a substring of exactly s1.length() characters with "
        "matching character counts.",
        "Fixed window size again: add the entering character, drop the leaving one, compare the "
        "two count arrays.",
        "Maintain a counter of how many of the 26 slots currently match to make each step O(1) "
        "instead of O(26).",
    ],
    r"""
import java.util.*;
class Solution {
    public boolean checkInclusion(String s1, String s2) {
        if (s1.length() > s2.length()) return false;
        int[] need = new int[26];
        int[] window = new int[26];
        for (char c : s1.toCharArray()) need[c - 'a']++;
        for (int i = 0; i < s2.length(); i++) {
            window[s2.charAt(i) - 'a']++;
            if (i >= s1.length()) window[s2.charAt(i - s1.length()) - 'a']--;
            if (Arrays.equals(need, window)) return true;
        }
        return false;
    }
}
""",
)

_m(
    621, "O(n)", "O(1)",
    [
        "Only the most frequent task constrains the schedule; everything else can be slotted into "
        "the gaps it creates.",
        "With maxCount copies of the busiest task there are maxCount - 1 gaps of length n, giving "
        "`(maxCount - 1) * (n + 1) + tiesAtMax`.",
        "When there are enough distinct tasks the gaps fill completely and no idling happens, so "
        "the answer is simply `tasks.length`. Take the max of the two.",
    ],
    r"""
class Solution {
    public int leastInterval(char[] tasks, int n) {
        int[] counts = new int[26];
        int maxCount = 0;
        for (char task : tasks) {
            counts[task - 'A']++;
            maxCount = Math.max(maxCount, counts[task - 'A']);
        }
        int ties = 0;
        for (int count : counts) {
            if (count == maxCount) ties++;
        }
        return Math.max(tasks.length, (maxCount - 1) * (n + 1) + ties);
    }
}
""",
)

_m(
    704, "O(log n)", "O(1)",
    [
        "The whole problem is getting the invariant right: `low` and `high` bound the range that "
        "may still contain the target.",
        "Compute the midpoint as `low + (high - low) / 2`, not `(low + high) / 2`, which can "
        "overflow for large indices.",
        "With inclusive bounds the loop condition is `low <= high` and each branch must move past "
        "mid, or the loop never terminates.",
    ],
    r"""
class Solution {
    public int search(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}
""",
)

_m(
    721, "O(total emails * alpha)", "O(total emails)",
    [
        "Accounts that share any email belong together, and that relation is transitive. "
        "Transitive grouping is Union-Find (or connected components).",
        "Union every email in an account with the account's first email; names are not identifying "
        "and must never be used as keys.",
        "Collect emails by their root, sort each group, and put the name back in front.",
    ],
    r"""
import java.util.*;
class Solution {
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        Map<String, String> parent = new HashMap<>();
        Map<String, String> owner = new HashMap<>();
        for (List<String> account : accounts) {
            String name = account.get(0);
            String first = account.get(1);
            for (int i = 1; i < account.size(); i++) {
                String email = account.get(i);
                parent.putIfAbsent(email, email);
                owner.put(email, name);
                union(parent, first, email);
            }
        }
        Map<String, List<String>> groups = new HashMap<>();
        for (String email : parent.keySet()) {
            groups.computeIfAbsent(find(parent, email), key -> new ArrayList<>()).add(email);
        }
        List<List<String>> out = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : groups.entrySet()) {
            List<String> emails = entry.getValue();
            Collections.sort(emails);
            List<String> row = new ArrayList<>();
            row.add(owner.get(entry.getKey()));
            row.addAll(emails);
            out.add(row);
        }
        return out;
    }

    private String find(Map<String, String> parent, String node) {
        while (!parent.get(node).equals(node)) {
            parent.put(node, parent.get(parent.get(node)));
            node = parent.get(node);
        }
        return node;
    }

    private void union(Map<String, String> parent, String a, String b) {
        String rootA = find(parent, a);
        String rootB = find(parent, b);
        if (!rootA.equals(rootB)) parent.put(rootA, rootB);
    }
}
""",
)

_m(
    739, "O(n)", "O(n)",
    [
        "This is 'next greater element' in disguise. The brute force rescans the tail for every "
        "index.",
        "Keep a stack of indices whose answers are still unknown, with temperatures decreasing "
        "from bottom to top.",
        "A warmer day resolves every index on top of the stack that it beats, and each index is "
        "pushed and popped exactly once, so the total work is linear.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int[] out = new int[temperatures.length];
        Deque<Integer> pending = new ArrayDeque<>();
        for (int i = 0; i < temperatures.length; i++) {
            while (!pending.isEmpty() && temperatures[pending.peek()] < temperatures[i]) {
                int day = pending.pop();
                out[day] = i - day;
            }
            pending.push(i);
        }
        return out;
    }
}
""",
)

_m(
    743, "O(E log V)", "O(V + E)",
    [
        "All nodes must receive the signal, so the answer is the largest shortest-path distance "
        "from k, or -1 if any node is unreachable.",
        "Edge weights are positive, which is exactly the precondition for Dijkstra's algorithm.",
        "Use a min-heap keyed by distance and skip any entry whose distance is already worse than "
        "the recorded one; that lazy deletion keeps the code short.",
    ],
    r"""
import java.util.*;
class Solution {
    public int networkDelayTime(int[][] times, int n, int k) {
        List<List<int[]>> graph = new ArrayList<>();
        for (int i = 0; i <= n; i++) graph.add(new ArrayList<>());
        for (int[] edge : times) graph.get(edge[0]).add(new int[] { edge[1], edge[2] });
        int[] best = new int[n + 1];
        Arrays.fill(best, Integer.MAX_VALUE);
        best[k] = 0;
        PriorityQueue<int[]> heap = new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));
        heap.add(new int[] { k, 0 });
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            if (top[1] > best[top[0]]) continue;
            for (int[] edge : graph.get(top[0])) {
                int candidate = top[1] + edge[1];
                if (candidate < best[edge[0]]) {
                    best[edge[0]] = candidate;
                    heap.add(new int[] { edge[0], candidate });
                }
            }
        }
        int answer = 0;
        for (int node = 1; node <= n; node++) {
            if (best[node] == Integer.MAX_VALUE) return -1;
            answer = Math.max(answer, best[node]);
        }
        return answer;
    }
}
""",
)

_m(
    787, "O(k * E)", "O(V)",
    [
        "Plain Dijkstra is wrong here: the cheapest path may use too many stops, and a pricier "
        "path with fewer stops can still lead to the answer.",
        "Bellman-Ford relaxes all edges k + 1 times, and round i computes the cheapest route using "
        "at most i edges. That is exactly the stop limit.",
        "Relax from a snapshot of the previous round's costs, not the live array, or one round can "
        "chain several edges and undercount stops.",
    ],
    r"""
import java.util.*;
class Solution {
    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        int[] best = new int[n];
        Arrays.fill(best, Integer.MAX_VALUE);
        best[src] = 0;
        for (int round = 0; round <= k; round++) {
            int[] snapshot = best.clone();
            for (int[] flight : flights) {
                if (snapshot[flight[0]] == Integer.MAX_VALUE) continue;
                int candidate = snapshot[flight[0]] + flight[2];
                if (candidate < best[flight[1]]) best[flight[1]] = candidate;
            }
        }
        return best[dst] == Integer.MAX_VALUE ? -1 : best[dst];
    }
}
""",
)

_m(
    875, "O(n log maxPile)", "O(1)",
    [
        "You are not searching the array, you are searching the answer: every speed from 1 to the "
        "largest pile is a candidate.",
        "Feasibility is monotone. If speed v finishes in time then so does every speed above it, "
        "which is what licenses binary search.",
        "The check is `sum of ceil(pile / v) <= h`. Use `(pile + v - 1) / v` to avoid floating "
        "point, and remember the total can overflow int.",
    ],
    r"""
class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int low = 1;
        int high = 0;
        for (int pile : piles) high = Math.max(high, pile);
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (canFinish(piles, mid, h)) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    private boolean canFinish(int[] piles, int speed, int h) {
        long hours = 0;
        for (int pile : piles) {
            hours += (pile + speed - 1) / speed;
            if (hours > h) return false;
        }
        return true;
    }
}
""",
)

_m(
    895, "O(log n) per operation", "O(n)",
    [
        "Pop returns the most frequent value, and ties break toward the most recently pushed. Two "
        "orderings at once means you need more than one structure.",
        "Keep a frequency map, plus a stack per frequency level. Pushing a value onto the stack "
        "for its new frequency records the recency automatically.",
        "Pop from the stack at the current maximum frequency, and decrease the maximum when that "
        "stack empties. Every operation is O(1) amortised.",
    ],
    r"""
import java.util.*;
class Solution {
    public int[] process(String[] operations, int[] values) {
        FreqStack stack = new FreqStack();
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "push" -> stack.push(values[i]);
                case "pop" -> out.add(stack.pop());
                default -> {}
            }
        }
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }
}
class FreqStack {
    private final Map<Integer, Integer> frequency = new HashMap<>();
    private final Map<Integer, Deque<Integer>> byFrequency = new HashMap<>();
    private int maxFrequency = 0;

    public FreqStack() {}

    public void push(int val) {
        int freq = frequency.merge(val, 1, Integer::sum);
        maxFrequency = Math.max(maxFrequency, freq);
        byFrequency.computeIfAbsent(freq, f -> new ArrayDeque<>()).push(val);
    }

    public int pop() {
        Deque<Integer> top = byFrequency.get(maxFrequency);
        int value = top.pop();
        frequency.merge(value, -1, Integer::sum);
        if (top.isEmpty()) maxFrequency--;
        return value;
    }
}
""",
)

_m(
    904, "O(n)", "O(1)",
    [
        "Two baskets means at most two distinct values in the window. This is the k-distinct "
        "sliding window with k fixed at 2.",
        "Grow right unconditionally; shrink left while the map holds three distinct types.",
        "Erase a key when its count reaches zero, otherwise the distinct count is wrong and the "
        "window never shrinks.",
    ],
    r"""
import java.util.*;
class Solution {
    public int totalFruit(int[] fruits) {
        Map<Integer, Integer> basket = new HashMap<>();
        int left = 0;
        int best = 0;
        for (int right = 0; right < fruits.length; right++) {
            basket.merge(fruits[right], 1, Integer::sum);
            while (basket.size() > 2) {
                int out = fruits[left++];
                if (basket.merge(out, -1, Integer::sum) == 0) basket.remove(out);
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
)

_m(
    981, "O(log n) per get", "O(n)",
    [
        "Values for a key arrive with non-decreasing timestamps, so each key's history is already "
        "a sorted array. Do not sort it again.",
        "`get` asks for the largest timestamp at or below the query, which is a binary search for "
        "the upper bound.",
        "Return the empty string when every stored timestamp is later than the query; that is the "
        "case candidates forget.",
    ],
    r"""
import java.util.*;
class Solution {
    public String[] process(String[] operations, String[] keys, String[] values, int[] timestamps) {
        TimeMap store = new TimeMap();
        List<String> out = new ArrayList<>();
        for (int i = 0; i < operations.length; i++) {
            switch (operations[i]) {
                case "set" -> store.set(keys[i], values[i], timestamps[i]);
                case "get" -> out.add(store.get(keys[i], timestamps[i]));
                default -> {}
            }
        }
        return out.toArray(new String[0]);
    }
}
class TimeMap {
    private final Map<String, List<int[]>> stamps = new HashMap<>();
    private final Map<String, List<String>> texts = new HashMap<>();

    public TimeMap() {}

    public void set(String key, String value, int timestamp) {
        stamps.computeIfAbsent(key, k -> new ArrayList<>()).add(new int[] { timestamp });
        texts.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
    }

    public String get(String key, int timestamp) {
        List<int[]> history = stamps.get(key);
        if (history == null) return "";
        int low = 0;
        int high = history.size();
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (history.get(mid)[0] <= timestamp) low = mid + 1;
            else high = mid;
        }
        return low == 0 ? "" : texts.get(key).get(low - 1);
    }
}
""",
)

_m(
    994, "O(rows * cols)", "O(rows * cols)",
    [
        "Rot spreads one ring per minute from every rotten orange at once. That is multi-source "
        "breadth-first search.",
        "Seed the queue with every rotten cell before the first round, not one at a time; "
        "otherwise the minute counts are wrong.",
        "Count fresh oranges up front so you can return -1 when any are still fresh after the "
        "search ends.",
    ],
    r"""
import java.util.*;
class Solution {
    public int orangesRotting(int[][] grid) {
        Queue<int[]> queue = new ArrayDeque<>();
        int fresh = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (grid[r][c] == 2) queue.add(new int[] { r, c });
                else if (grid[r][c] == 1) fresh++;
            }
        }
        if (fresh == 0) return 0;
        int minutes = 0;
        int[][] steps = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
        while (!queue.isEmpty() && fresh > 0) {
            int size = queue.size();
            minutes++;
            for (int i = 0; i < size; i++) {
                int[] cell = queue.poll();
                for (int[] step : steps) {
                    int r = cell[0] + step[0];
                    int c = cell[1] + step[1];
                    if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) continue;
                    if (grid[r][c] != 1) continue;
                    grid[r][c] = 2;
                    fresh--;
                    queue.add(new int[] { r, c });
                }
            }
        }
        return fresh == 0 ? minutes : -1;
    }
}
""",
)

_m(
    1004, "O(n)", "O(1)",
    [
        "Flipping at most k zeros means the window is valid while it contains at most k zeros. "
        "Nothing else about the window matters.",
        "Count zeros as they enter the window and shrink from the left while that count exceeds k.",
        "The same template answers Longest Repeating Character Replacement and Max Consecutive "
        "Ones II; recognising that is the point.",
    ],
    r"""
class Solution {
    public int longestOnes(int[] nums, int k) {
        int left = 0;
        int zeros = 0;
        int best = 0;
        for (int right = 0; right < nums.length; right++) {
            if (nums[right] == 0) zeros++;
            while (zeros > k) {
                if (nums[left] == 0) zeros--;
                left++;
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
""",
)

_m(
    1143, "O(m * n)", "O(n)",
    [
        "Compare the two strings one character at a time from the end and ask what each outcome "
        "lets you discard.",
        "If the characters match, both can be consumed together: dp[i][j] = 1 + dp[i-1][j-1]. "
        "Otherwise drop one character from either string and take the better result.",
        "Only the previous row is ever read, so two rolling arrays reduce space from O(m * n) to "
        "O(n).",
    ],
    r"""
class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        int m = text1.length();
        int n = text2.length();
        int[] prev = new int[n + 1];
        int[] cur = new int[n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) cur[j] = prev[j - 1] + 1;
                else cur[j] = Math.max(prev[j], cur[j - 1]);
            }
            int[] swap = prev;
            prev = cur;
            cur = swap;
        }
        return prev[n];
    }
}
""",
)
