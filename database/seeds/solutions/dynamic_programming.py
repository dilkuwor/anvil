"""Dynamic programming problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    # 1. lc-70
    {
        "slugs": ["lc-70"],
        "pattern": "1-D DP",
        "trigger": "ways to reach a top floor taking 1 or 2 steps at a time",
        "summary": (
            "To reach any step, the final hop starts from one or two steps below. "
            "Therefore the count of ways to step i equals the sum of ways to reach the previous two steps. "
            "Tracking just those two previous counts gives a solution in linear time with constant memory."
        ),
        "approaches": [
            {
                "name": "Plain recursion",
                "is_optimal": False,
                "idea": "Express the step count directly as the sum of climbing from one step below and two steps below.",
                "steps": [
                    "Check if n is at most 2, returning n directly since 1 step has 1 way and 2 steps have 2 ways.",
                    "Recursively call the helper on n minus 1 to explore all paths ending with a single step.",
                    "Recursively call the helper on n minus 2 to explore all paths ending with a double step.",
                    "Add both recursive branches together and return the total sum.",
                ],
                "code": """class Solution {
    public int climbStairs(int n) {
        if (n <= 2) {
            return n;
        }
        return climbStairs(n - 1) + climbStairs(n - 2);
    }
}""",
                "time_complexity": "O(2^n)",
                "time_why": "Every call branches into two recursive calls, creating a binary tree of depth n.",
                "space_complexity": "O(n)",
                "space_why": "The call stack grows up to depth n along the left branch.",
                "when_to_use": "Mention it first as the direct recursive relationship before eliminating repeated work.",
            },
            {
                "name": "Rolling two-variable state",
                "is_optimal": True,
                "idea": "Track only the counts for the previous two steps to compute each new step in constant space.",
                "steps": [
                    "Initialize two integer variables prev = 1 and cur = 1 representing the ways to reach steps 0 and 1.",
                    "Loop an index from 2 up to n.",
                    "Compute the next count as the sum of prev and cur.",
                    "Advance the window by assigning prev to cur and cur to the newly computed sum.",
                    "Return cur once the loop finishes.",
                ],
                "code": """class Solution {
    public int climbStairs(int n) {
        int prev = 1;
        int cur = 1;
        for (int i = 2; i <= n; i++) {
            int next = prev + cur;
            prev = cur;
            cur = next;
        }
        return cur;
    }
}""",
                "time_complexity": "O(n)",
                "time_why": "A single loop runs n minus 1 times doing constant work per step.",
                "space_complexity": "O(1)",
                "space_why": "Only two integer state variables are maintained in memory.",
                "when_to_use": "The optimal interview approach calculating Fibonacci counts with constant extra space.",
            },
            {
                "name": "Fast doubling of the Fibonacci pair",
                "idea": "The answer is a Fibonacci number, and two doubling rules jump from the pair at k straight to the pair at 2k, so n can be halved instead of walked.",
                "steps": [
                    "The ways to climb n stairs equal the Fibonacci number at n + 1, counting from F(0) = 0 and F(1) = 1.",
                    "Write a helper that hands back the pair `{F(k), F(k + 1)}` for a given k, and answers `{0, 1}` when k is 0.",
                    "Otherwise ask the helper for k / 2, call its two answers a and b, and work out `c = a * (2b - a)` and `d = a * a + b * b`.",
                    "Those two are `F(2k)` and `F(2k + 1)`, so return `{c, d}` when k is even and `{d, c + d}` when k is odd.",
                    "Read the answer off the first slot of the pair for n + 1.",
                ],
                "code": """class Solution {
    public int climbStairs(int n) {
        return (int) fibPair(n + 1)[0];
    }

    // Returns {F(k), F(k + 1)} with F(0) = 0 and F(1) = 1.
    private long[] fibPair(int k) {
        if (k == 0) {
            return new long[] {0, 1};
        }
        long[] half = fibPair(k / 2);
        long a = half[0];
        long b = half[1];
        long c = a * (2 * b - a);
        long d = a * a + b * b;
        if (k % 2 == 0) {
            return new long[] {c, d};
        }
        return new long[] {d, c + d};
    }
}""",
                "time_complexity": "O(log n)",
                "time_why": "Each round halves n, so there are about log n rounds of a few multiplications.",
                "space_complexity": "O(log n)",
                "space_why": "The helper calls itself about log n times deep, holding one pair per level.",
                "when_to_use": "When n is far too big to step through, such as a billion, usually with the answer wanted modulo something. It is the same jump as raising the 2 by 2 Fibonacci matrix to a power, written without the matrix.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "n = 4",
            "columns": ["step i", "prev (i - 2)", "cur (i - 1)", "next (prev + cur)", "action"],
            "rows": [
                ["start", "1", "1", "-", "Set up step 0 and step 1"],
                ["2", "1", "1", "1 + 1 = 2", "Ways to reach step 2"],
                ["3", "1", "2", "1 + 2 = 3", "Ways to reach step 3"],
                ["4", "2", "3", "2 + 3 = 5", "Ways to reach step 4"],
            ],
            "result": "The total number of distinct ways to climb 4 stairs is 5.",
        },
        "mistakes": [
            {
                "name": "The Echo Trap",
                "wrong": "Calling `climbStairs(n - 1) + climbStairs(n - 2)` without saving results, exploding to O(2^n) time.",
                "right": "Accumulate values forward with loops or rolling variables in O(n) time.",
            },
            {
                "name": "Off-by-one initial conditions",
                "wrong": "Setting `prev = 0` and `cur = 1` which shifts all step counts down by one index.",
                "right": "Start with `prev = 1` for step 0 and `cur = 1` for step 1.",
            },
            {
                "name": "Allocating full array when only two values matter",
                "wrong": "Creating a full `int[n + 1]` array, using O(n) space unnecessarily.",
                "right": "Keep only two scalar registers to achieve O(1) auxiliary space.",
            },
        ],
        "edge_cases": [
            {"input": "n = 1", "expected": "1", "why": "A single step has exactly one hop of size 1."},
            {"input": "n = 2", "expected": "2", "why": "Two stairs allow either 1+1 or a single 2-step hop."},
            {"input": "n = 3", "expected": "3", "why": "Three stairs yield 1+1+1, 1+2, or 2+1."},
            {"input": "n = 45", "expected": "1836311903", "why": "Largest problem constraint testing 32-bit integer capacity without overflow."},
        ],
        "interview_script": [
            "I need to count the distinct ways to reach the top of n stairs taking 1 or 2 steps at a time.",
            "The obvious way I could try is plain recursion, which takes O(2^n) time because it branches twice at every step.",
            "The key point I notice is that each step depends only on the sums of the previous two steps.",
            "So I maintain two rolling variables from 0 to n, achieving O(n) time and O(1) space.",
            "I will test n = 1, n = 2, n = 3, and a larger value like n = 45.",
        ],
        "follow_ups": [
            {
                "question": "Can we solve this in O(log n) time?",
                "answer": "Yes, matrix exponentiation on the 2x2 Fibonacci matrix computes the nth term in logarithmic time.",
            },
            {
                "question": "What if you can take up to k steps at a time?",
                "answer": "Maintain a running window sum of the last k answers to advance the sequence in O(1) per step.",
            },
            {
                "question": "What if each step has an associated cost?",
                "answer": "Transition to minimum cost climbing stairs where each step adds the minimum cost of the prior two steps.",
            },
        ],
        "related_slugs": ["lc-198", "lc-62", "lc-91"],
    },

    # 2. lc-198
    {
        "slugs": ["lc-198"],
        "pattern": "1-D DP",
        "trigger": "maximize sum of non-adjacent elements along a line",
        "summary": (
            "For each house, you can either skip it and keep the best loot up to the previous house, "
            "or rob it and add its cash to the best loot from two houses back. "
            "Tracking two rolling variables gives the maximum profit in linear time."
        ),
        "approaches": [
            {
                "name": "Recursive branching at each house",
                "is_optimal": False,
                "idea": "At each house, branch into robbing the house or skipping to the next house.",
                "steps": [
                    "In the helper function, check if the current house index is past the end of the neighborhood.",
                    "If so, return 0 because no more cash can be collected.",
                    "Recursively calculate the profit from robbing the current house and jumping ahead by 2 houses.",
                    "Recursively calculate the profit from skipping the current house and moving to the next house.",
                    "Return the maximum of the two choices.",
                ],
                "code": """class Solution {
    public int rob(int[] nums) {
        return helper(nums, 0);
    }

    private int helper(int[] nums, int i) {
        if (i >= nums.length) {
            return 0;
        }
        int robCurrent = nums[i] + helper(nums, i + 2);
        int skipCurrent = helper(nums, i + 1);
        return Math.max(robCurrent, skipCurrent);
    }
}""",
                "time_complexity": "O(2^n)",
                "time_why": "Each house forks into two recursive paths without caching, creating an exponential call tree.",
                "space_complexity": "O(n)",
                "space_why": "The call stack reaches depth n when visiting houses sequentially.",
                "when_to_use": "Mention it first as the natural binary choice before caching or rolling state forward.",
            },
            {
                "name": "Rolling two-variable state",
                "is_optimal": True,
                "idea": "Keep two scalar values for profit without the previous house and with the previous house.",
                "steps": [
                    "Initialize two variables skip = 0 and take = 0 representing profits before visiting any houses.",
                    "For each cash value in nums, calculate the best profit if we rob or skip this house.",
                    "Set the new profit candidate as the maximum of skip plus cash and take.",
                    "Shift the states forward by setting skip to take and take to the new profit candidate.",
                    "Return take after considering all houses in the street.",
                ],
                "code": """class Solution {
    public int rob(int[] nums) {
        int skip = 0;
        int take = 0;
        for (int cash : nums) {
            int next = Math.max(skip + cash, take);
            skip = take;
            take = next;
        }
        return take;
    }
}""",
                "time_complexity": "O(n)",
                "time_why": "Each house in the array is inspected once with constant-time arithmetic.",
                "space_complexity": "O(1)",
                "space_why": "Only two integer accumulators are maintained across the pass.",
                "when_to_use": "The optimal interview solution that maximizes loot without allocating an array.",
            },
        ],
        "walkthrough": {
            "input": "nums = [2, 1, 1, 2]",
            "columns": ["house value", "skip (before)", "take (before)", "next = max(skip+val, take)", "new (skip, take)"],
            "rows": [
                ["2", "0", "0", "max(0+2, 0) = 2", "(0, 2)"],
                ["1", "0", "2", "max(0+1, 2) = 2", "(2, 2)"],
                ["1", "2", "2", "max(2+1, 2) = 3", "(2, 3)"],
                ["2", "2", "3", "max(2+2, 3) = 4", "(3, 4)"],
            ],
            "result": "The maximum loot without triggering alarms is 4 (robbing house 0 and house 3).",
        },
        "mistakes": [
            {
                "name": "The Every-Other Trap",
                "wrong": "Assuming the best plan is either all even-indexed houses or all odd-indexed houses.",
                "right": "Optimal plans can skip two consecutive houses, such as [2, 1, 1, 2] where robbing both 2s yields 4.",
            },
            {
                "name": "Overwriting skip before computing next",
                "wrong": "Assigning `skip = take` before computing `next = Math.max(skip + cash, take)`.",
                "right": "Compute the next candidate with the existing `skip` value first before shifting the variables.",
            },
            {
                "name": "Uncached recursive search",
                "wrong": "Branching recursively at each house without caching, causing O(2^n) time limit exceeded.",
                "right": "Recognize that earlier decisions overlap and roll the two prior answers forward in linear time.",
            },
        ],
        "edge_cases": [
            {"input": "nums = [5]", "expected": "5", "why": "A single house can always be robbed."},
            {"input": "nums = [2, 1, 1, 2]", "expected": "4", "why": "Skipping two consecutive houses beats strict parity alternation."},
            {"input": "nums = [0, 0, 0]", "expected": "0", "why": "Handles all zero cash values without issues."},
            {"input": "nums = [10, 1, 1, 10]", "expected": "20", "why": "Two distant high-value houses are chosen."},
        ],
        "interview_script": [
            "I need to find the maximum loot possible without robbing any two adjacent houses.",
            "The obvious way I could try is branching recursively at each house, which takes O(2^n) time.",
            "The key point I notice is that deciding house i only requires the best loot from i - 1 and i - 2.",
            "So I roll two integer variables forward, reducing time to O(n) with O(1) space.",
            "I will test a single house, all zeros, and [2, 1, 1, 2] where two houses are skipped.",
        ],
        "follow_ups": [
            {
                "question": "What if the houses are arranged in a circular street?",
                "answer": "Run the algorithm twice: once for houses 0 to n - 2, and once for houses 1 to n - 1, taking the maximum.",
            },
            {
                "question": "What if houses form a binary tree?",
                "answer": "Use postorder tree recursion returning a pair of values: profit robbing this node and profit skipping it.",
            },
            {
                "question": "Can we reconstruct the exact houses robbed?",
                "answer": "Store a boolean decision array or walk backward through the values comparing dp[i] with dp[i-1].",
            },
        ],
        "related_slugs": ["lc-213", "lc-70", "lc-152"],
    },

    # 3. lc-213
    {
        "slugs": ["lc-213"],
        "pattern": "1-D DP",
        "trigger": "maximize non-adjacent elements on a circular arrangement",
        "summary": (
            "Because the first and last houses are adjacent in a circle, they cannot both be robbed. "
            "Split the street into two linear segments: houses 0 through n - 2 and houses 1 through n - 1. "
            "Run the linear robbery logic on each segment and take the maximum."
        ),
        "approaches": [
            {
                "name": "Separate subarray copies",
                "is_optimal": False,
                "idea": "Copy the two candidate slices into separate arrays and rob each independently.",
                "steps": [
                    "If the array length is 1, return the only house value immediately.",
                    "Allocate a copy of the slice from index 0 to n minus 2 using Arrays.copyOfRange.",
                    "Allocate a copy of the slice from index 1 to n minus 1 using Arrays.copyOfRange.",
                    "Run the linear house robbery algorithm on both allocated slices.",
                    "Return the larger of the two resulting profits.",
                ],
                "code": """import java.util.*;

class Solution {
    public int rob(int[] nums) {
        if (nums.length == 1) {
            return nums[0];
        }
        int[] firstSlice = Arrays.copyOfRange(nums, 0, nums.length - 1);
        int[] secondSlice = Arrays.copyOfRange(nums, 1, nums.length);
        return Math.max(linearRob(firstSlice), linearRob(secondSlice));
    }

    private int linearRob(int[] arr) {
        int skip = 0;
        int take = 0;
        for (int cash : arr) {
            int next = Math.max(skip + cash, take);
            skip = take;
            take = next;
        }
        return take;
    }
}""",
                "time_complexity": "O(n)",
                "time_why": "Copying the arrays and scanning both slices takes linear time.",
                "space_complexity": "O(n)",
                "space_why": "Allocating two sliced arrays takes 2n auxiliary space.",
                "when_to_use": "Clear first step to break the circular dependency before eliminating array allocations.",
            },
            {
                "name": "In-place two-range linear robbery",
                "is_optimal": True,
                "idea": "Pass index boundaries directly into a linear helper to avoid copying arrays.",
                "steps": [
                    "Handle the single-house edge case by returning nums[0] if the array has length 1.",
                    "Define a helper taking start and end index bounds over the input array.",
                    "In the helper, run two rolling profit variables across the specified index range.",
                    "Call the helper on range 0 to n minus 2, and again on range 1 to n minus 1.",
                    "Return the maximum value returned by the two helper calls.",
                ],
                "code": """class Solution {
    public int rob(int[] nums) {
        if (nums.length == 1) {
            return nums[0];
        }
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
}""",
                "time_complexity": "O(n)",
                "time_why": "Two passes over slices of length at most n minus 1 run in linear time.",
                "space_complexity": "O(1)",
                "space_why": "Only scalar variables are used without allocating new arrays.",
                "when_to_use": "The optimal interview solution that solves circular robbery in constant space.",
            },
        ],
        "walkthrough": {
            "input": "nums = [2, 3, 2]",
            "columns": ["range", "houses included", "best loot", "notes"],
            "rows": [
                ["range 0 to 1", "[2, 3]", "3", "Excludes the last house"],
                ["range 1 to 2", "[3, 2]", "3", "Excludes the first house"],
                ["overall max", "-", "max(3, 3) = 3", "Cannot rob both ends of the circle"],
            ],
            "result": "The maximum loot possible from the circular street is 3.",
        },
        "mistakes": [
            {
                "name": "The Lone House Trap",
                "wrong": "Calling `robRange(nums, 0, -1)` when `nums.length == 1`, returning 0 instead of nums[0].",
                "right": "Check `if (nums.length == 1) return nums[0]` before setting up range boundaries.",
            },
            {
                "name": "Robbing both ends simultaneously",
                "wrong": "Running a single linear pass that allows house 0 and house n - 1 to both be robbed.",
                "right": "Enforce mutual exclusivity by running two separate passes that omit one end each.",
            },
            {
                "name": "Unnecessary array slice allocation",
                "wrong": "Using `Arrays.copyOfRange` to slice the inputs, wasting O(n) memory.",
                "right": "Pass start and end index bounds directly to the helper method.",
            },
        ],
        "edge_cases": [
            {"input": "nums = [1]", "expected": "1", "why": "A single house has no circular neighbor conflict."},
            {"input": "nums = [2, 3, 2]", "expected": "3", "why": "House 0 and house 2 are circular neighbors and cannot both be robbed."},
            {"input": "nums = [1, 2, 3, 1]", "expected": "4", "why": "Robbing houses 0 and 2 gives 1 + 3 = 4."},
            {"input": "nums = [1, 2, 1, 1]", "expected": "3", "why": "Circular connection prevents choosing both ends."},
        ],
        "interview_script": [
            "I need to maximize stolen loot from houses arranged in a circular street.",
            "The obvious way I could try is copying two separate subarrays, which takes O(n) extra space.",
            "The key point I notice is that the circle only forbids robbing house 0 and house n - 1 together.",
            "So I evaluate two index ranges in-place with rolling variables, taking O(n) time and O(1) space.",
            "I will test a single house, three houses where ends match, and four houses.",
        ],
        "follow_ups": [
            {
                "question": "What if houses form a general cycle of length k?",
                "answer": "The same principle holds: fix the state of any one house and solve the remaining linear path.",
            },
            {
                "question": "Can we reconstruct the exact houses robbed in the optimal circle plan?",
                "answer": "Record backtrack pointers during both range passes and take the winner path.",
            },
            {
                "question": "How does this compare to House Robber III on trees?",
                "answer": "Trees use postorder recursion returning two values per node, whereas cycles split into two linear passes.",
            },
        ],
        "related_slugs": ["lc-198", "lc-70", "lc-322"],
    },

    # 4. lc-322
    {
        "slugs": ["lc-322"],
        "pattern": "1-D DP",
        "trigger": "“fewest coins” (or fewest steps) to reach an exact total, with pieces you may reuse",
        "summary": (
            "Stepping stones, one per amount. "
            "A stone costs the cheapest stone one coin-hop behind it, plus 1. Fill the bridge from stone 0 forward."
        ),
        "approaches": [
            {
                "name": "Try every coin recursively",
                "idea": "At each step, try subtracting every coin and recurse on the remaining amount.",
                "steps": [
                    "If the remaining amount is zero, return zero coins.",
                    "If the remaining amount is negative, return an invalid result marker.",
                    "Try subtracting each coin and find the best count among the recursive calls.",
                    "Add one for the chosen coin and return the best count.",
                ],
                "code": """import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int res = helper(coins, amount);
        return res >= 100000 ? -1 : res;
    }

    private int helper(int[] coins, int rem) {
        if (rem == 0) return 0;
        if (rem < 0) return 100000;
        int best = 100000;
        for (int coin : coins) {
            best = Math.min(best, helper(coins, rem - coin) + 1);
        }
        return best;
    }
}""",
                "time_complexity": "O(coins^amount)",
                "time_why": "At every step we branch for each coin, forming an exponential tree of calls.",
                "space_complexity": "O(amount)",
                "space_why": "The recursion call stack can grow as deep as the target amount.",
                "when_to_use": "Mention it first to show the natural recursive structure before building the table.",
                "is_optimal": False,
            },
            {
                "name": "The stepping stones",
                "idea": "Build an array from 0 up to amount, updating each stone with the best hop from behind.",
                "steps": [
                    "Create an array of size amount + 1, filled with amount + 1 as an unreachable ceiling.",
                    "Set the starting stone at index 0 to cost zero coins.",
                    "For each stone from 1 up to amount, try each available coin value.",
                    "If a coin fits, take the minimum of the current stone cost and one plus the stone left behind.",
                    "Return the value at amount, or -1 if the stone remains unreachable.",
                ],
                "code": """import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int value = 1; value <= amount; value++) {
            for (int coin : coins) {
                if (coin <= value) {
                    dp[value] = Math.min(dp[value], dp[value - coin] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}""",
                "time_complexity": "O(amount × coins)",
                "time_why": "We fill amount entries, checking each of the coins at every stone.",
                "space_complexity": "O(amount)",
                "space_why": "The table allocates an array of size amount + 1.",
                "when_to_use": "The standard interview answer: simple array lookups with no recursion overhead.",
                "is_optimal": True,
            },
            {
                "name": "Breadth-first search over amounts",
                "idea": "Treat each amount as a place and each coin as one step away from it, so the fewest coins is the shortest path from 0 to the target.",
                "steps": [
                    "Answer 0 straight away when the amount is 0.",
                    "Put 0 in a queue, which hands places back in the order they arrived, and mark 0 as seen.",
                    "Take the whole current layer off the queue at once, counting one more coin for the layer after it.",
                    "From each place, add every coin that still fits. Landing exactly on the amount means the current layer number is the answer.",
                    "Push each new place onto the queue and mark it seen, so it is never opened twice. An empty queue means the amount cannot be made.",
                ],
                "code": """import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        if (amount == 0) {
            return 0;
        }
        boolean[] seen = new boolean[amount + 1];
        Deque<Integer> queue = new ArrayDeque<>();
        queue.add(0);
        seen[0] = true;
        int used = 0;
        while (!queue.isEmpty()) {
            used++;
            for (int layer = queue.size(); layer > 0; layer--) {
                int at = queue.poll();
                for (int coin : coins) {
                    if (coin > amount - at) {
                        continue;
                    }
                    int next = at + coin;
                    if (next == amount) {
                        return used;
                    }
                    if (!seen[next]) {
                        seen[next] = true;
                        queue.add(next);
                    }
                }
            }
        }
        return -1;
    }
}""",
                "time_complexity": "O(amount × coins)",
                "time_why": "Each amount enters the queue at most once, and each one tries every coin.",
                "space_complexity": "O(amount)",
                "space_why": "The seen flags and the queue each hold at most one entry per amount.",
                "when_to_use": "When the question is really about the fewest moves: reach a number by doubling or subtracting, or the shortest word ladder. Seeing it as a shortest path lets you stop the moment you touch the target.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "coins = [1, 3, 4], amount = 6",
            "columns": ["amount", "try coin 1", "try coin 3", "try coin 4", "best dp[i]"],
            "rows": [
                ["0", "-", "-", "-", "0"],
                ["1", "dp[0] + 1 = 1", "-", "-", "1"],
                ["2", "dp[1] + 1 = 2", "-", "-", "2"],
                ["3", "dp[2] + 1 = 3", "dp[0] + 1 = 1", "-", "1"],
                ["4", "dp[3] + 1 = 2", "dp[1] + 1 = 2", "dp[0] + 1 = 1", "1"],
                ["6", "dp[5] + 1 = 3", "dp[3] + 1 = 2", "dp[2] + 1 = 3", "2"],
            ],
            "result": "The fewest coins for 6 is 2 (3 + 3), beating the greedy choice of 4 + 1 + 1.",
        },
        "mistakes": [
            {
                "name": "The Greedy Trap",
                "wrong": "Greedily picking the largest coin denomination first.",
                "right": "Biggest coin first can be wrong: with coins 1, 3, 4 it pays 6 as 4 + 1 + 1, but 3 + 3 is fewer. Try every coin at every stone.",
            },
            {
                "name": "Integer overflow from MAX_VALUE",
                "wrong": "Filling the table with `Integer.MAX_VALUE` and adding one, wrapping around to negative numbers.",
                "right": "Use `amount + 1` as the ceiling value because no valid answer can ever exceed that.",
            },
            {
                "name": "Missing the zero base stone",
                "wrong": "Forgetting to set the cost of amount zero to zero.",
                "right": "Set index 0 to zero because making zero amount takes zero coins.",
            },
        ],
        "edge_cases": [
            {"input": "coins = [1], amount = 0", "expected": "0", "why": "Zero amount takes zero coins."},
            {"input": "coins = [2], amount = 3", "expected": "-1", "why": "Cannot make an odd amount using only even coins."},
            {"input": "coins = [1], amount = 1", "expected": "1", "why": "Exact single coin match."},
            {"input": "coins = [1, 3, 4], amount = 6", "expected": "2", "why": "Greedy choice of 4 fails; two 3s give the optimal answer."},
            {"input": "coins = [2, 5], amount = 3", "expected": "-1", "why": "Amount is smaller than one coin and not divisible by the other."},
        ],
        "interview_script": [
            "I need to find the fewest coins needed to make up the target amount.",
            "The obvious way is plain recursion, which takes O(coins^amount) time because I try every coin repeatedly.",
            "The key point: greedy choice fails, but each amount depends only on smaller amounts I already know.",
            "So I build a table from 0 up to amount. That is O(amount × coins) time and O(amount) space.",
            "I will test amount zero, an impossible odd total, and coins [1, 3, 4] with amount 6.",
        ],
        "follow_ups": [
            {
                "question": "How would you print the actual coins used in the optimal combination?",
                "answer": "Keep an array recording which coin gave the best count for each amount, then walk backwards.",
            },
            {
                "question": "What if each coin could only be used once?",
                "answer": "Put the coin loop on the outside and walk amounts backwards so no coin is reused.",
            },
            {
                "question": "What if we need the total number of combinations to form the amount?",
                "answer": "Loop over each coin on the outside and add dp[i - coin] into dp[i].",
            },
        ],
        "related_slugs": ["lc-198", "lc-70", "lc-300"],
    },

    # 5. lc-300
    {
        "slugs": ["lc-300"],
        "pattern": "Patience sorting",
        "trigger": "length of the longest strictly increasing subsequence in an array",
        "summary": (
            "Let dp[i] be the longest increasing subsequence ending at index i. "
            "To optimize to O(n log n), maintain a tails array where tails[len] is the smallest ending element "
            "among all increasing subsequences of that length, updating with binary search."
        ),
        "approaches": [
            {
                "name": "Quadratic table dynamic programming",
                "is_optimal": False,
                "idea": "Compute the longest subsequence ending at each index by comparing with all previous elements.",
                "steps": [
                    "Create an integer array dp of length n and fill every slot with 1.",
                    "Track an integer variable maxLen initialized to 1.",
                    "For index i from 1 to n minus 1, loop index j from 0 to i minus 1.",
                    "If nums[j] is strictly less than nums[i], update dp[i] to the maximum of dp[i] and dp[j] plus 1.",
                    "Update maxLen with dp[i] and return maxLen when finished.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lengthOfLIS(int[] nums) {
        if (nums.length == 0) {
            return 0;
        }
        int[] dp = new int[nums.length];
        Arrays.fill(dp, 1);
        int maxLen = 1;
        for (int i = 1; i < nums.length; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) {
                    dp[i] = Math.max(dp[i], dp[j] + 1);
                }
            }
            maxLen = Math.max(maxLen, dp[i]);
        }
        return maxLen;
    }
}""",
                "time_complexity": "O(n²)",
                "time_why": "Two nested loops check all pairs of elements up to index n.",
                "space_complexity": "O(n)",
                "space_why": "An array of size n stores the longest length ending at each index.",
                "when_to_use": "Mention it first as the standard quadratic dynamic programming baseline before optimizing searches.",
            },
            {
                "name": "Patience sorting with binary search",
                "is_optimal": True,
                "idea": "Maintain the smallest tail of each sequence length and binary search the placement slot for each number.",
                "steps": [
                    "Create an array tails of size n and an integer size initialized to 0.",
                    "For each value in nums, binary search its insertion slot inside tails from 0 to size.",
                    "Find the first index where tails[mid] is greater than or equal to the current value.",
                    "Replace tails at that slot with the current value to lower that sequence tail.",
                    "If the insertion slot equals size, increment size to extend the longest sequence.",
                    "Return size as the final length of the longest increasing subsequence.",
                ],
                "code": """class Solution {
    public int lengthOfLIS(int[] nums) {
        int[] tails = new int[nums.length];
        int size = 0;
        for (int x : nums) {
            int low = 0;
            int high = size;
            while (low < high) {
                int mid = low + (high - low) / 2;
                if (tails[mid] < x) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            tails[low] = x;
            if (low == size) {
                size++;
            }
        }
        return size;
    }
}""",
                "time_complexity": "O(n log n)",
                "time_why": "We binary search in a sorted array of length at most n for each of the n numbers.",
                "space_complexity": "O(n)",
                "space_why": "The tails array stores at most n tail elements.",
                "when_to_use": "The optimal interview approach using patience sorting to achieve O(n log n) time.",
            },
            {
                "name": "Longest common subsequence with the sorted values",
                "idea": "A rising run in the row is exactly a run the row shares, in order, with a sorted copy of its own distinct values.",
                "steps": [
                    "Sort a copy of the numbers and drop repeats, so the copy rises strictly.",
                    "Line the original row up against that copy and look for the longest run of numbers both hold in the same order.",
                    "Fill the usual shared-run table: equal numbers step diagonally and add 1, otherwise take the larger neighbour from above or the left.",
                    "Two rolling rows are enough, and the last cell holds the length.",
                ],
                "code": """import java.util.*;

class Solution {
    public int lengthOfLIS(int[] nums) {
        int[] rising = nums.clone();
        Arrays.sort(rising);
        int distinct = 0;
        for (int i = 0; i < rising.length; i++) {
            if (i == 0 || rising[i] != rising[i - 1]) rising[distinct++] = rising[i];
        }
        int[] prev = new int[distinct + 1];
        int[] cur = new int[distinct + 1];
        for (int i = 1; i <= nums.length; i++) {
            for (int j = 1; j <= distinct; j++) {
                if (nums[i - 1] == rising[j - 1]) {
                    cur[j] = prev[j - 1] + 1;
                } else {
                    cur[j] = Math.max(prev[j], cur[j - 1]);
                }
            }
            int[] swap = prev;
            prev = cur;
            cur = swap;
        }
        return prev[distinct];
    }
}""",
                "time_complexity": "O(n²)",
                "time_why": "Every number in the row is matched against every distinct value in the sorted copy.",
                "space_complexity": "O(n)",
                "space_why": "The sorted copy, plus two rows as long as the count of distinct values.",
                "when_to_use": "When a second list arrives and the question becomes the longest run that rises and appears in both. Sorting is what turns this problem into that one, and the shared-run table then answers both.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [10, 9, 2, 5, 3, 7, 101, 18]",
            "columns": ["num", "binary search slot", "tails array after", "longest size"],
            "rows": [
                ["10", "index 0", "[10]", "1"],
                ["9", "index 0", "[9]", "1"],
                ["2", "index 0", "[2]", "1"],
                ["5", "index 1", "[2, 5]", "2"],
                ["3", "index 1", "[2, 3]", "2"],
                ["7", "index 2", "[2, 3, 7]", "3"],
                ["101", "index 3", "[2, 3, 7, 101]", "4"],
                ["18", "index 3", "[2, 3, 7, 18]", "4"],
            ],
            "result": "The length of the longest strictly increasing subsequence is 4.",
        },
        "mistakes": [
            {
                "name": "The Pile Tops Trap",
                "wrong": "Reading the tails array directly to print the actual elements of the subsequence.",
                "right": "The tails array only records minimal ending values for each length, not the chronological subsequence.",
            },
            {
                "name": "Using less than or equal in binary search",
                "wrong": "Using `<=` in binary search when strictly increasing subsequences are required.",
                "right": "Use `<` so duplicate elements replace an existing tail instead of extending length.",
            },
            {
                "name": "Greedy element selection",
                "wrong": "Greedily picking the next larger element without considering future sequence choices.",
                "right": "Maintain all active minimal tails to keep options open for smaller incoming numbers.",
            },
        ],
        "edge_cases": [
            {"input": "nums = [0, 1, 0, 3, 2, 3]", "expected": "4", "why": "Increasing subsequence [0, 1, 2, 3] has length 4."},
            {"input": "nums = [7, 7, 7, 7, 7]", "expected": "1", "why": "Strictly increasing requires strictly greater numbers."},
            {"input": "nums = [4, 10, 4, 3, 8, 9]", "expected": "3", "why": "Multiple sequences of length 3 exist like [4, 8, 9] or [3, 8, 9]."},
            {"input": "nums = [1]", "expected": "1", "why": "A single element array has length 1."},
        ],
        "interview_script": [
            "I need to find the length of the longest strictly increasing subsequence in an array.",
            "The obvious way I could try is quadratic dynamic programming, comparing all pairs in O(n²) time.",
            "The key point I notice is that tracking the smallest tail for each length produces a sorted array.",
            "So I place each number using binary search, achieving O(n log n) time and O(n) space.",
            "I will test a single element, all identical elements, and an alternating array.",
        ],
        "follow_ups": [
            {
                "question": "How would you reconstruct one actual longest increasing subsequence?",
                "answer": "Store predecessor index pointers during binary search and trace back from the final tail.",
            },
            {
                "question": "How would you count the total number of longest increasing subsequences?",
                "answer": "Use two arrays tracking lengths and counts, or a Fenwick tree indexed by sorted values.",
            },
            {
                "question": "What if the subsequence only needs to be non-decreasing?",
                "answer": "Change the binary search condition to find the upper bound so duplicates extend lengths.",
            },
        ],
        "related_slugs": ["lc-322", "lc-1143", "lc-198"],
    },

    # 6. lc-139
    {
        "slugs": ["lc-139"],
        "pattern": "1-D DP",
        "trigger": "segmenting a string into words from a dictionary",
        "summary": (
            "Let dp[i] be true if the prefix of length i can be broken into dictionary words. "
            "For each end position, check if any earlier valid split point leaves a remainder that matches a dictionary word."
        ),
        "approaches": [
            {
                "name": "Plain recursive prefix branching",
                "is_optimal": False,
                "idea": "Try every prefix substring: if it is in the dictionary, recurse on the remainder of the string.",
                "steps": [
                    "Store all words from wordDict in a HashSet for fast lookup.",
                    "In the helper function, check if the start index has reached the end of the string.",
                    "If so, return true because the entire string has been segmented.",
                    "Loop an end index from start plus 1 to the end of the string.",
                    "If the dictionary contains the prefix substring and the recursive call on end succeeds, return true.",
                    "If no split leads to a valid segmentation, return false.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        Set<String> words = new HashSet<>(wordDict);
        return canBreak(s, 0, words);
    }

    private boolean canBreak(String s, int start, Set<String> words) {
        if (start == s.length()) {
            return true;
        }
        for (int end = start + 1; end <= s.length(); end++) {
            if (words.contains(s.substring(start, end)) && canBreak(s, end, words)) {
                return true;
            }
        }
        return false;
    }
}""",
                "time_complexity": "O(2^n)",
                "time_why": "At each character, the recursive call can branch, creating up to 2^n possible segmentations.",
                "space_complexity": "O(n)",
                "space_why": "The call stack depth equals the string length n in the worst case.",
                "when_to_use": "Mention it first as the simple recursive search before eliminating redundant prefix checks.",
            },
            {
                "name": "1D boolean prefix table",
                "is_optimal": True,
                "idea": "Build a boolean array where dp[i] tracks whether the prefix of length i is segmentable.",
                "steps": [
                    "Put the dictionary words into a HashSet for constant-time lookups.",
                    "Allocate a boolean array dp of length s.length() plus 1.",
                    "Set the empty string starting value dp[0] to true.",
                    "Loop an end index from 1 to s.length(), and an inner start index from 0 to end minus 1.",
                    "If dp[start] is true and the dictionary contains the substring between start and end, set dp[end] = true and break.",
                    "Return dp[s.length()] after evaluating all prefix positions.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        Set<String> words = new HashSet<>(wordDict);
        boolean[] dp = new boolean[s.length() + 1];
        dp[0] = true;
        for (int end = 1; end <= s.length(); end++) {
            for (int start = 0; start < end; start++) {
                if (dp[start] && words.contains(s.substring(start, end))) {
                    dp[end] = true;
                    break;
                }
            }
        }
        return dp[s.length()];
    }
}""",
                "time_complexity": "O(n³)",
                "time_why": "Nested loops check O(n²) split pairs, and extracting each substring takes O(n) time.",
                "space_complexity": "O(n)",
                "space_why": "The boolean reachability array and HashSet require linear auxiliary space.",
                "when_to_use": "The optimal interview approach building reachability prefix by prefix in polynomial time.",
            },
            {
                "name": "Breadth-first search over cut positions",
                "idea": "Each position in the string is a place, and each dictionary word is one step from one place to a later one, so the question is whether the end is reachable from the start.",
                "steps": [
                    "Put the dictionary words in a HashSet, and mark position 0 as reached.",
                    "Keep a queue of positions, which hands them back in the order they arrived, starting with 0.",
                    "Take a position off the queue. If it is the end of the string, the answer is true.",
                    "For every later position whose text from here is a dictionary word, mark it reached and add it to the queue.",
                    "A position is only ever opened once, so an empty queue means the string cannot be split.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        Set<String> words = new HashSet<>(wordDict);
        boolean[] reached = new boolean[s.length() + 1];
        Deque<Integer> queue = new ArrayDeque<>();
        queue.add(0);
        reached[0] = true;
        while (!queue.isEmpty()) {
            int start = queue.poll();
            if (start == s.length()) {
                return true;
            }
            for (int end = start + 1; end <= s.length(); end++) {
                if (!reached[end] && words.contains(s.substring(start, end))) {
                    reached[end] = true;
                    queue.add(end);
                }
            }
        }
        return false;
    }
}""",
                "time_complexity": "O(n³)",
                "time_why": "Each position is opened once, tries every later cut, and each cut copies a substring.",
                "space_complexity": "O(n)",
                "space_why": "One reached flag per position and a queue holding at most one entry per position, plus the word set.",
                "when_to_use": "When the question turns into the fewest words, or the shortest sentence: take the queue one layer at a time and the layer that first touches the end is the answer. It also stops the moment the end is reached.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "s = \"leetcode\", wordDict = [\"leet\", \"code\"]",
            "columns": ["end index", "matching start", "word found", "dp[end]", "status"],
            "rows": [
                ["0", "-", "-", "true", "Empty prefix valid"],
                ["4", "0", "\"leet\"", "true", "dp[4] valid (\"leet\")"],
                ["8", "4", "\"code\"", "true", "dp[8] valid (\"code\")"],
            ],
            "result": "dp[8] is true, confirming the string can be segmented into dictionary words.",
        },
        "mistakes": [
            {
                "name": "The Long List Trap",
                "wrong": "Calling `wordDict.contains(sub)` on the raw List, causing linear scans for every lookup.",
                "right": "Convert `wordDict` into a `HashSet` upfront for O(1) average lookup time.",
            },
            {
                "name": "Continuing inner loop after match found",
                "wrong": "Checking further start indices after `dp[end]` has already been proven true.",
                "right": "Break the inner loop immediately once a valid split is confirmed to save redundant checks.",
            },
            {
                "name": "Uncached exponential recursion",
                "wrong": "Branching recursively on every valid prefix without saving failed starts, causing O(2^n) timeouts.",
                "right": "Build reachability step by step from left to right so each prefix is verified only once.",
            },
        ],
        "edge_cases": [
            {"input": "s = \"a\", wordDict = [\"a\"]", "expected": "true", "why": "Single character string matching single character word."},
            {"input": "s = \"applepenapple\", wordDict = [\"apple\", \"pen\"]", "expected": "true", "why": "Words from the dictionary can be reused multiple times."},
            {"input": "s = \"catsandog\", wordDict = [\"cats\", \"dog\", \"sand\", \"and\", \"cat\"]", "expected": "false", "why": "Cannot segment the full string without leftover characters."},
            {"input": "s = \"aaaaaaa\", wordDict = [\"aaaa\", \"aaa\"]", "expected": "true", "why": "Multiple overlapping prefix lengths must combine correctly."},
        ],
        "interview_script": [
            "I need to determine whether a string can be segmented into words from a given dictionary.",
            "The obvious way I could try is plain recursive prefix search, which takes O(2^n) time.",
            "The key point I notice is that if prefix i is reachable, any valid dictionary word from i to j makes prefix j reachable.",
            "So I build a boolean table from left to right, running in O(n³) time and O(n) space.",
            "I will test a single character, word reuse like \"applepenapple\", and an impossible split.",
        ],
        "follow_ups": [
            {
                "question": "How would you return all possible segmented sentences?",
                "answer": "Use depth-first search with a caching map from index to list of valid suffix sentences.",
            },
            {
                "question": "How can you optimize substring checks using a Trie?",
                "answer": "Insert words into a Trie and check characters backwards from end to verify words without substring copies.",
            },
            {
                "question": "What if the dictionary words have a known maximum length k?",
                "answer": "Restrict the inner loop to end minus start at most k, dropping time to O(n · k²).",
            },
        ],
        "related_slugs": ["lc-1143", "lc-322", "lc-91"],
    },

    # 7. lc-416
    {
        "slugs": ["lc-416"],
        "pattern": "0/1 Knapsack",
        "trigger": "partitioning an array into two subsets with equal sum",
        "summary": (
            "If the total sum is odd, equal partition is impossible. "
            "Otherwise, target half the total sum and determine if any subset reaches that target "
            "using a boolean array walked backwards."
        ),
        "approaches": [
            {
                "name": "Recursive include or exclude branching",
                "is_optimal": False,
                "idea": "At each number, branch into including it in the subset or excluding it.",
                "steps": [
                    "Sum all numbers in the array, returning false if the total sum is odd.",
                    "Set the target sum equal to the total sum divided by 2.",
                    "In the helper, return true if the remaining target is 0.",
                    "If the remaining target is negative or no numbers remain, return false.",
                    "Recurse by either including the current number or skipping it, returning true if either path succeeds.",
                ],
                "code": """class Solution {
    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        if (total % 2 != 0) {
            return false;
        }
        return helper(nums, 0, total / 2);
    }

    private boolean helper(int[] nums, int i, int rem) {
        if (rem == 0) {
            return true;
        }
        if (rem < 0 || i >= nums.length) {
            return false;
        }
        return helper(nums, i + 1, rem - nums[i]) || helper(nums, i + 1, rem);
    }
}""",
                "time_complexity": "O(2^n)",
                "time_why": "Every element branches into two choices, producing up to 2^n recursive leaves.",
                "space_complexity": "O(n)",
                "space_why": "The call stack depth is at most n.",
                "when_to_use": "Mention it first as the raw include or exclude decision tree before caching sums.",
            },
            {
                "name": "1D backward knapsack array",
                "is_optimal": True,
                "idea": "Maintain a boolean array of reachable sums, updating backwards so numbers are used at most once.",
                "steps": [
                    "Sum all elements and return false immediately if the total is odd.",
                    "Set target = total / 2 and allocate a boolean array reachable of size target + 1.",
                    "Set reachable[0] = true representing a subset sum of zero.",
                    "For each value in nums, loop sum backwards from target down to that value.",
                    "If the state at sum minus value is true, mark reachable[sum] as true.",
                    "Return the value of reachable[target] after evaluating every number.",
                ],
                "code": """class Solution {
    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        if (total % 2 != 0) {
            return false;
        }
        int target = total / 2;
        boolean[] reachable = new boolean[target + 1];
        reachable[0] = true;
        for (int x : nums) {
            for (int sum = target; sum >= x; sum--) {
                if (reachable[sum - x]) {
                    reachable[sum] = true;
                }
            }
        }
        return reachable[target];
    }
}""",
                "time_complexity": "O(n · target)",
                "time_why": "An outer loop over n numbers pairs with an inner loop running target times.",
                "space_complexity": "O(target)",
                "space_why": "A single boolean array of size target + 1 tracks reachability.",
                "when_to_use": "The optimal interview solution that compresses the knapsack state into a single backwards array.",
            },
            {
                "name": "Bitset of reachable sums",
                "idea": "Hold every reachable sum as the bits of one huge number, so adding a value to all of them at once is a single shift and merge.",
                "steps": [
                    "Add up the numbers and answer false when the total is odd; otherwise the target is half the total.",
                    "Start with the number 1, meaning bit 0 is on, because the sum 0 is reachable by choosing nothing.",
                    "For each value x, shift the number left by x places. Every bit that was on moves up by x, which is that same sum with x now added.",
                    "Merge the shifted copy back into the number with `or`, so the old sums and the new ones are both marked.",
                    "When every value has been folded in, answer whether the bit at the target position is on.",
                ],
                "code": """import java.math.BigInteger;

class Solution {
    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) {
            total += x;
        }
        if (total % 2 != 0) {
            return false;
        }
        BigInteger reachable = BigInteger.ONE;
        for (int x : nums) {
            reachable = reachable.or(reachable.shiftLeft(x));
        }
        return reachable.testBit(total / 2);
    }
}""",
                "time_complexity": "O(n × total / 64)",
                "time_why": "Each value shifts and merges a number of about total bits, and the machine moves 64 bits per instruction.",
                "space_complexity": "O(total / 64)",
                "space_why": "One big number carries a single bit per sum up to the total.",
                "when_to_use": "When the flag array is the slow part and you want the same work to run about 64 times faster, or when you want the whole answer in four lines. Java offers `BigInteger` and `java.util.BitSet`; C++ has `std::bitset`.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1, 5, 11, 5]",
            "columns": ["number", "target sum 11 reachable?", "reachable sums updated", "status"],
            "rows": [
                ["start", "false", "{0}", "Base sum 0 is true"],
                ["1", "false", "{0, 1}", "Can make 1"],
                ["5", "false", "{0, 1, 5, 6}", "Can make 5 and 6"],
                ["11", "true", "{0, 1, 5, 6, 11, 12, 16, 17}", "Target 11 is reached"],
            ],
            "result": "Target sum 11 is reachable, so the array can be partitioned into two equal subsets.",
        },
        "mistakes": [
            {
                "name": "The Used Twice Trap",
                "wrong": "Looping `sum` from `value` up to `target`, which allows the same number to be reused multiple times.",
                "right": "Walk `sum` backwards from `target` down to `value` so each number is used at most once.",
            },
            {
                "name": "Missing the odd sum check",
                "wrong": "Running the knapsack algorithm when `total % 2 != 0`.",
                "right": "Check `if (total % 2 != 0) return false` immediately because an odd sum cannot split evenly.",
            },
            {
                "name": "Allocating full 2D table when 1D suffices",
                "wrong": "Using an `n x target` table that takes O(n · target) space.",
                "right": "Compress into a single 1D array walked backwards in O(target) space.",
            },
        ],
        "edge_cases": [
            {"input": "nums = [1, 5, 11, 5]", "expected": "true", "why": "Subsets [1, 5, 5] and [11] both sum to 11."},
            {"input": "nums = [1, 2, 3, 5]", "expected": "false", "why": "Total sum is 11, which is odd and impossible to halve."},
            {"input": "nums = [2, 2]", "expected": "true", "why": "Two identical elements split into [2] and [2]."},
            {"input": "nums = [100]", "expected": "false", "why": "A single element cannot form two non-empty subsets."},
        ],
        "interview_script": [
            "I need to determine if an array can be partitioned into two subsets with equal sum.",
            "The obvious way I could try is branching on include or exclude for every number, taking O(2^n) time.",
            "The key point I notice is that the problem reduces to 0/1 knapsack where the target is total sum divided by 2.",
            "So I maintain a 1D boolean array walked backwards, achieving O(n · target) time and O(target) space.",
            "I will test an odd sum array, [2, 2], and [1, 5, 11, 5].",
        ],
        "follow_ups": [
            {
                "question": "Can we speed up state transitions using bit manipulation?",
                "answer": "Yes, represent reachability as a BigInteger or BitSet and shift by each value using bitwise OR.",
            },
            {
                "question": "What if we need to partition into k subsets of equal sum?",
                "answer": "Use backtracking with bitmask state tracking to assign elements to k buckets.",
            },
            {
                "question": "What if numbers can be negative?",
                "answer": "Offset all values by the absolute minimum or use a hash set of reachable sums instead of a direct array.",
            },
        ],
        "related_slugs": ["lc-322", "lc-300", "lc-198"],
    },

    # 8. lc-1143 (Visual Story!)
    {
        "slugs": ["lc-1143"],
        "pattern": "2-D DP",
        "trigger": "two words or lists, and the “longest” thing they share with the order kept",
        "summary": (
            "A table of small answers guides the match. "
            "When letters match, step diagonally and add 1; when they differ, copy the larger neighbour from above or left. "
            "The final answer sits in the bottom-right corner."
        ),
        "approaches": [
            {
                "name": "Recursive match or skip branching",
                "is_optimal": False,
                "idea": "At each character pair, either match them or try skipping a character from either string.",
                "steps": [
                    "In the recursive helper, check if either pointer has reached the end of its string.",
                    "If so, return 0 because no further matching characters can be found.",
                    "If the characters at both pointers match, return 1 plus the recursive result advancing both pointers.",
                    "If the characters differ, take the maximum of advancing the first pointer or advancing the second pointer.",
                    "Return the best count from the two branches.",
                ],
                "code": """class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        return helper(text1, text2, 0, 0);
    }

    private int helper(String s1, String s2, int i, int j) {
        if (i == s1.length() || j == s2.length()) {
            return 0;
        }
        if (s1.charAt(i) == s2.charAt(j)) {
            return 1 + helper(s1, s2, i + 1, j + 1);
        }
        return Math.max(helper(s1, s2, i + 1, j), helper(s1, s2, i, j + 1));
    }
}""",
                "time_complexity": "O(2^(m+n))",
                "time_why": "When characters differ, the algorithm branches in two directions, generating an exponential recursion tree.",
                "space_complexity": "O(m+n)",
                "space_why": "The call stack depth can reach m + n.",
                "when_to_use": "Mention it first as the raw match or skip branching before building a 2D table.",
            },
            {
                "name": "The diagonal path",
                "is_optimal": True,
                "idea": "Compress the table into two rolling rows since each row only depends on the previous row.",
                "steps": [
                    "Initialize two 1D integer arrays prev and cur of size n plus 1.",
                    "Loop row index i from 1 to m representing characters of text1.",
                    "For column index j from 1 to n, if characters match, set cur[j] = prev[j - 1] + 1.",
                    "Otherwise set cur[j] = Math.max(prev[j], cur[j - 1]) to take the best neighbor.",
                    "Swap prev and cur at the end of each row, and return prev[n].",
                ],
                "code": """class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        int m = text1.length();
        int n = text2.length();
        int[] prev = new int[n + 1];
        int[] cur = new int[n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                    cur[j] = prev[j - 1] + 1;
                } else {
                    cur[j] = Math.max(prev[j], cur[j - 1]);
                }
            }
            int[] swap = prev;
            prev = cur;
            cur = swap;
        }
        return prev[n];
    }
}""",
                "time_complexity": "O(m × n)",
                "time_why": "Each character pair is compared once across the m by n grid.",
                "space_complexity": "O(n)",
                "space_why": "Only two rows of length n + 1 are kept in memory.",
                "when_to_use": "The optimal interview approach keeping only two rows in linear memory.",
            },
            {
                "name": "Hirschberg's divide and conquer on the middle row",
                "idea": "Cut the first word in half, work out where the second word has to be cut to match it, then solve the two smaller pairs the same way.",
                "steps": [
                    "Cut the first word at its middle letter.",
                    "For every split point of the second word, work out the best match of the two left parts, keeping one row at a time.",
                    "Do the same for the two right parts, reading both words backwards from their ends.",
                    "The split point where those two numbers add up to the most is where the second word gets cut.",
                    "Solve the left pair and the right pair the same way and glue their shared letters together.",
                    "A one-letter piece is easy: keep that letter if the other side holds it anywhere.",
                ],
                "code": """class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        StringBuilder shared = new StringBuilder();
        build(text1, 0, text1.length(), text2, 0, text2.length(), shared);
        return shared.length();
    }

    private void build(String a, int a0, int a1, String b, int b0, int b1, StringBuilder shared) {
        if (a1 - a0 == 0 || b1 - b0 == 0) {
            return;
        }
        if (a1 - a0 == 1) {
            for (int j = b0; j < b1; j++) {
                if (b.charAt(j) == a.charAt(a0)) {
                    shared.append(a.charAt(a0));
                    return;
                }
            }
            return;
        }
        int mid = (a0 + a1) / 2;
        int cut = bestCut(a, a0, mid, a1, b, b0, b1);
        build(a, a0, mid, b, b0, cut, shared);
        build(a, mid, a1, b, cut, b1, shared);
    }

    private int bestCut(String a, int a0, int mid, int a1, String b, int b0, int b1) {
        int[] left = row(a, a0, mid, b, b0, b1, false);
        int[] right = row(a, mid, a1, b, b0, b1, true);
        int n = b1 - b0;
        int cut = b0;
        int best = -1;
        for (int j = 0; j <= n; j++) {
            if (left[j] + right[n - j] > best) {
                best = left[j] + right[n - j];
                cut = b0 + j;
            }
        }
        return cut;
    }

    private int[] row(String a, int from, int to, String b, int b0, int b1, boolean backwards) {
        int n = b1 - b0;
        int[] prev = new int[n + 1];
        int[] cur = new int[n + 1];
        for (int i = 1; i <= to - from; i++) {
            char letter = backwards ? a.charAt(to - i) : a.charAt(from + i - 1);
            for (int j = 1; j <= n; j++) {
                char other = backwards ? b.charAt(b1 - j) : b.charAt(b0 + j - 1);
                if (letter == other) {
                    cur[j] = prev[j - 1] + 1;
                } else {
                    cur[j] = Math.max(prev[j], cur[j - 1]);
                }
            }
            int[] swap = prev;
            prev = cur;
            cur = swap;
        }
        return prev;
    }
}""",
                "time_complexity": "O(m · n)",
                "time_why": "Each split reads two rows across the whole second word, and the work halves at every level, so it adds up to about twice the plain table.",
                "space_complexity": "O(n)",
                "space_why": "Only two rows live at once, plus the shared letters and a stack of cut points about log m deep.",
                "when_to_use": "When you want the shared letters themselves and the words are too long for an m by n table. This is how `diff` compares large files, and it is the answer when the follow-up asks for the sequence without the memory.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "text1 = \"abcde\", text2 = \"ace\"",
            "columns": ["row i (letter)", "col 0 (\"\")", "col 1 ('a')", "col 2 ('c')", "col 3 ('e')"],
            "rows": [
                ["row 0 (\"\")", "0", "0", "0", "0"],
                ["row 1 ('a')", "0", "1 (match 'a')", "1", "1"],
                ["row 2 ('b')", "0", "1", "1", "1"],
                ["row 3 ('c')", "0", "1", "2 (match 'c')", "2"],
                ["row 4 ('d')", "0", "1", "2", "2"],
                ["row 5 ('e')", "0", "1", "2", "3 (match 'e')"],
            ],
            "result": "The longest common subsequence length is 3 for \"ace\".",
        },
        "mistakes": [
            {
                "name": "The Off-By-One Trap",
                "wrong": "Using 0-indexed string positions directly as table coordinates, indexing out of bounds.",
                "right": "The table has an extra row 0 and column 0 for the empty word. So the table is (m + 1) × (n + 1), and row i reads letter i − 1.",
            },
            {
                "name": "Greedy character matching",
                "wrong": "Greedily picking the earliest identical character without considering longer combinations later.",
                "right": "When characters differ, check both possibilities by taking the maximum of skipping a character in text1 or text2.",
            },
            {
                "name": "Uncached recursive search",
                "wrong": "Exploring match and skip decisions recursively without storing intermediate answers, taking exponential time.",
                "right": "Use a table or two rolling rows to compute each prefix pair exactly once.",
            },
        ],
        "edge_cases": [
            {"input": "text1 = \"abc\", text2 = \"abc\"", "expected": "3", "why": "Identical strings match completely."},
            {"input": "text1 = \"abc\", text2 = \"def\"", "expected": "0", "why": "Disjoint strings share zero common letters."},
            {"input": "text1 = \"a\", text2 = \"b\"", "expected": "0", "why": "Single character mismatch."},
            {"input": "text1 = \"abcde\", text2 = \"ace\"", "expected": "3", "why": "Subsequence characters appear interspersed in text1."},
        ],
        "interview_script": [
            "I need to find the length of the longest common subsequence between two strings.",
            "The obvious way I could try is plain recursion, which takes O(2^(m+n)) time by branching on every mismatch.",
            "The key point I notice is that each cell only depends on its top, left, and diagonal neighbors in a 2D grid.",
            "So I roll two rows forward, reducing cost to O(m · n) time and O(n) space.",
            "I will test identical strings, completely disjoint strings, and a single letter mismatch.",
        ],
        "follow_ups": [
            {
                "question": "How would you reconstruct the actual subsequence string?",
                "answer": "Trace backward through the full 2D table from (m, n), collecting characters when diagonal steps were taken.",
            },
            {
                "question": "How does LCS relate to shortest common supersequence?",
                "answer": "The shortest common supersequence length equals m + n minus the LCS length.",
            },
            {
                "question": "Can we solve this in O(min(m, n)) space?",
                "answer": "Yes, ensure the shorter string defines the column dimension so the two rolling rows use minimal space.",
            },
        ],
        "related_slugs": ["lc-72", "lc-300", "lc-139"],
    },

    # 9. lc-72
    {
        "slugs": ["lc-72"],
        "pattern": "2-D DP",
        "trigger": "minimum insertions, deletions, and replacements to convert one word into another",
        "summary": (
            "Build an edit distance table where dp[i][j] is the cost to transform word1 prefix of length i into word2 prefix of length j. "
            "If characters match, copy the diagonal cost. If they differ, take 1 plus the minimum of insert, delete, and replace."
        ),
        "approaches": [
            {
                "name": "Recursive three-way branching",
                "is_optimal": False,
                "idea": "At each character mismatch, branch into insertion, deletion, and replacement recursively.",
                "steps": [
                    "In the helper function, if either index is 0, return the other index as all remaining characters must be inserted or deleted.",
                    "If characters match at indices i minus 1 and j minus 1, recurse diagonally without adding cost.",
                    "Otherwise, recursively evaluate inserting a character by calling the helper on i and j minus 1.",
                    "Recursively evaluate deleting a character by calling the helper on i minus 1 and j.",
                    "Recursively evaluate replacing a character by calling the helper on i minus 1 and j minus 1.",
                    "Return 1 plus the minimum cost among the three choices.",
                ],
                "code": """class Solution {
    public int minDistance(String word1, String word2) {
        return helper(word1, word2, word1.length(), word2.length());
    }

    private int helper(String s1, String s2, int i, int j) {
        if (i == 0) return j;
        if (j == 0) return i;
        if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
            return helper(s1, s2, i - 1, j - 1);
        }
        int insert = helper(s1, s2, i, j - 1);
        int delete = helper(s1, s2, i - 1, j);
        int replace = helper(s1, s2, i - 1, j - 1);
        return 1 + Math.min(insert, Math.min(delete, replace));
    }
}""",
                "time_complexity": "O(3^(m+n))",
                "time_why": "Each character mismatch branches in three directions, generating an exponential recursion tree.",
                "space_complexity": "O(m+n)",
                "space_why": "The call stack depth can reach m + n.",
                "when_to_use": "Mention it first as the direct recursive formulation before storing answers in a table.",
            },
            {
                "name": "Two rolling rows space compression",
                "is_optimal": True,
                "idea": "Maintain only the previous and current rows since row i only looks back at row i minus 1.",
                "steps": [
                    "Initialize a prev array of size n plus 1 with values from 0 up to n representing base insertion costs.",
                    "Allocate a cur array of size n plus 1 to hold the current row answers.",
                    "For each character i in word1, set cur[0] = i for the base deletion cost.",
                    "Compute cur[j] using prev[j - 1] for replace, prev[j] for delete, and cur[j - 1] for insert.",
                    "Swap prev and cur after each row, returning prev[n] once all characters are processed.",
                ],
                "code": """class Solution {
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
}""",
                "time_complexity": "O(m · n)",
                "time_why": "Every cell in the m by n table is processed once with constant-time comparisons.",
                "space_complexity": "O(n)",
                "space_why": "Only two 1D arrays of length n + 1 are maintained in memory.",
                "when_to_use": "The optimal interview solution that achieves linear space using two rolling rows.",
            },
            {
                "name": "Shortest path across the grid (0-1 BFS)",
                "idea": "Stand at the start of both words and walk to the end of both: matching letters let you step diagonally for free, every edit costs one, and the cheapest route is the distance.",
                "steps": [
                    "Treat the pair (i, j) as a place: i letters of word1 and j letters of word2 are already handled.",
                    "A delete steps down, an insert steps right, and a replace steps diagonally, each costing one.",
                    "When the two letters at that place match, the diagonal step is free.",
                    "Walk with a double-ended queue: free steps go on the front and paid steps on the back, so places still come out cheapest first.",
                    "The cost carried by the far corner when it comes out is the edit distance.",
                ],
                "code": """import java.util.*;

class Solution {
    public int minDistance(String word1, String word2) {
        int m = word1.length();
        int n = word2.length();
        int[] best = new int[(m + 1) * (n + 1)];
        Arrays.fill(best, Integer.MAX_VALUE);
        Deque<Integer> queue = new ArrayDeque<>();
        best[0] = 0;
        queue.add(0);
        while (!queue.isEmpty()) {
            int at = queue.pollFirst();
            int i = at / (n + 1);
            int j = at % (n + 1);
            int steps = best[at];
            if (i == m && j == n) {
                return steps;
            }
            if (i < m && j < n && word1.charAt(i) == word2.charAt(j)) {
                relax(best, queue, at + n + 2, steps, true);
            }
            if (i < m && j < n) relax(best, queue, at + n + 2, steps + 1, false);
            if (i < m) relax(best, queue, at + n + 1, steps + 1, false);
            if (j < n) relax(best, queue, at + 1, steps + 1, false);
        }
        return best[best.length - 1];
    }

    private void relax(int[] best, Deque<Integer> queue, int to, int steps, boolean free) {
        if (steps < best[to]) {
            best[to] = steps;
            if (free) {
                queue.addFirst(to);
            } else {
                queue.addLast(to);
            }
        }
    }
}""",
                "time_complexity": "O(m · n)",
                "time_why": "Every place settles once and has at most four steps leading out of it.",
                "space_complexity": "O(m · n)",
                "space_why": "One best cost per place, plus the queue. That is more memory than the two rolling rows.",
                "when_to_use": "When you only need to know whether the words are within a few edits: the walk reaches the corner and stops, having touched only the cheap places. It is also the way in when the moves themselves are the puzzle, as on a grid of free and paid steps.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "word1 = \"horse\", word2 = \"ros\"",
            "columns": ["char", "cost vs 'r'", "cost vs 'o'", "cost vs 's'", "operation chosen"],
            "rows": [
                ["start", "1", "2", "3", "Insertions on empty string"],
                ["'h'", "1", "2", "3", "Replace 'h' with 'r'"],
                ["'o'", "2", "1", "2", "Match 'o' without cost"],
                ["'r'", "1", "2", "2", "Match 'r' without cost"],
                ["'s'", "2", "2", "2", "Match 's' without cost"],
                ["'e'", "3", "3", "3", "Delete 'e'"],
            ],
            "result": "The minimum edit distance to transform \"horse\" into \"ros\" is 3.",
        },
        "mistakes": [
            {
                "name": "The Free Match Trap",
                "wrong": "Adding 1 to the operation count when `word1.charAt(i - 1) == word2.charAt(j - 1)`.",
                "right": "Matching characters require zero operations: directly copy the diagonal cost `prev[j - 1]`.",
            },
            {
                "name": "Forgetting base boundary costs",
                "wrong": "Leaving `cur[0]` uninitialized or starting row 0 with all zeros.",
                "right": "Transforming to or from an empty string requires deleting or inserting every character.",
            },
            {
                "name": "Uncached recursive search",
                "wrong": "Branching recursively on insert, delete, and replace without caching, causing O(3^(m+n)) timeouts.",
                "right": "Store intermediate costs in a table or two rolling rows to compute each cell in O(1) time.",
            },
        ],
        "edge_cases": [
            {"input": "word1 = \"\", word2 = \"a\"", "expected": "1", "why": "One insertion needed into an empty string."},
            {"input": "word1 = \"same\", word2 = \"same\"", "expected": "0", "why": "Zero operations needed for identical strings."},
            {"input": "word1 = \"intention\", word2 = \"execution\"", "expected": "5", "why": "Standard multi-operation edit distance."},
            {"input": "word1 = \"a\", word2 = \"b\"", "expected": "1", "why": "A single replacement converts 'a' into 'b'."},
        ],
        "interview_script": [
            "I need to find the minimum number of insertions, deletions, and replacements to convert word1 into word2.",
            "The obvious way I could try is three-way recursion, which takes O(3^(m+n)) time.",
            "The key point I notice is that cell (i, j) depends only on insert from left, delete from above, and replace from diagonal.",
            "So I maintain two rolling rows, reducing the cost to O(m · n) time and O(n) space.",
            "I will test an empty string, identical strings, and a single letter change.",
        ],
        "follow_ups": [
            {
                "question": "What if each operation has an unequal cost?",
                "answer": "Multiply each operation transition by its respective cost weight in the recurrence formula.",
            },
            {
                "question": "What if word1 is much longer than word2?",
                "answer": "Swap the arguments so the shorter string defines the column dimension, minimizing row memory.",
            },
            {
                "question": "How would you reconstruct the exact edit script?",
                "answer": "Keep the full 2D table and trace back from (m, n) to determine which operation was chosen at each cell.",
            },
        ],
        "related_slugs": ["lc-1143", "lc-300", "lc-70"],
    },

    # 10. lc-62
    {
        "slugs": ["lc-62"],
        "pattern": "2-D DP",
        "trigger": "counting paths in a grid moving only right and down",
        "summary": (
            "Every cell can only be entered from the cell directly above it or the cell to its left. "
            "The number of unique paths to cell (r, c) is the sum of paths to (r - 1, c) and (r, c - 1). "
            "Rolling a single row forward gives the answer in linear space."
        ),
        "approaches": [
            {
                "name": "Recursive branching down and right",
                "is_optimal": False,
                "idea": "At each cell, branch into moving right and moving down recursively until reaching the goal.",
                "steps": [
                    "In the helper function, check if the current position is at the bottom-right corner.",
                    "If so, return 1 representing a complete valid path.",
                    "If row exceeds m minus 1 or column exceeds n minus 1, return 0 for out-of-bounds.",
                    "Recursively call the helper moving down to row plus 1.",
                    "Recursively call the helper moving right to col plus 1.",
                    "Return the sum of both paths.",
                ],
                "code": """class Solution {
    public int uniquePaths(int m, int n) {
        return helper(0, 0, m, n);
    }

    private int helper(int r, int c, int m, int n) {
        if (r == m - 1 && c == n - 1) {
            return 1;
        }
        if (r >= m || c >= n) {
            return 0;
        }
        return helper(r + 1, c, m, n) + helper(r, c + 1, m, n);
    }
}""",
                "time_complexity": "O(2^(m+n))",
                "time_why": "Every step forks into two recursive paths without caching, producing an exponential call tree.",
                "space_complexity": "O(m+n)",
                "space_why": "The call stack depth reaches m + n along any path to the corner.",
                "when_to_use": "Mention it first as the simple recursive path exploration before caching cell sums.",
            },
            {
                "name": "1D rolling row accumulation",
                "is_optimal": True,
                "idea": "Maintain a single array of size n initialized to 1s, accumulating values from left to right.",
                "steps": [
                    "Allocate an integer array row of size n and fill every element with 1.",
                    "Loop an outer row index r from 1 up to m minus 1.",
                    "Loop an inner column index c from 1 up to n minus 1.",
                    "Update row[c] by adding row[c - 1] to represent the sum of paths from above and left.",
                    "Return row[n - 1] as the total unique paths to the bottom-right cell.",
                ],
                "code": """import java.util.*;

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
}""",
                "time_complexity": "O(m · n)",
                "time_why": "We compute cell transitions over (m - 1) * (n - 1) constant-time additions.",
                "space_complexity": "O(n)",
                "space_why": "Only one 1D array of length n is maintained in memory.",
                "when_to_use": "The optimal interview approach that reduces space to O(min(m, n)).",
            },
            {
                "name": "Combinatorics: choose which moves go down",
                "idea": "Every path is the same list of moves in a different order, so counting paths is counting which of the moves are the down ones.",
                "steps": [
                    "Any route from corner to corner makes exactly `m - 1` down moves and `n - 1` right moves, for `m + n - 2` moves in all.",
                    "A route is fixed once you say which of those moves go down, so the count is the binomial coefficient `C(m + n - 2, m - 1)`.",
                    "Choose the smaller of `m - 1` and `n - 1` as the number being picked, which makes the loop as short as possible.",
                    "Build the value one factor at a time: multiply by the next term from the top, then divide by the step number.",
                    "Every one of those divisions comes out whole, so the running value stays near the answer. Keep it in a `long` while multiplying.",
                ],
                "code": """class Solution {
    public int uniquePaths(int m, int n) {
        int moves = m + n - 2;
        int down = Math.min(m - 1, n - 1);
        long ways = 1;
        for (int step = 1; step <= down; step++) {
            ways = ways * (moves - down + step) / step;
        }
        return (int) ways;
    }
}""",
                "time_complexity": "O(min(m, n))",
                "time_why": "One multiply and one divide per chosen move, and there are min(m, n) - 1 of them.",
                "space_complexity": "O(1)",
                "space_why": "Only the running product and the loop counter are kept.",
                "when_to_use": "When the grid is enormous and only the count is wanted: with no table, a grid of a million by a million costs the same as a small one. It breaks the moment a cell is blocked, which is why the table stays the expected answer.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "m = 3, n = 3",
            "columns": ["row index", "col 0", "col 1", "col 2", "action"],
            "rows": [
                ["row 0", "1", "1", "1", "Initial top row setup"],
                ["row 1", "1", "1 + 1 = 2", "2 + 1 = 3", "Accumulate left and top values"],
                ["row 2", "1", "1 + 2 = 3", "3 + 3 = 6", "Accumulate left and top values"],
            ],
            "result": "Total unique paths to reach bottom-right cell (2, 2) is 6.",
        },
        "mistakes": [
            {
                "name": "The Overflow Trap",
                "wrong": "Calculating `(m + n - 2)! / ((m - 1)! * (n - 1)!)` using standard factorial multiplications, overflowing 32-bit integers.",
                "right": "Use dynamic programming additions or multiply and divide factors incrementally to avoid integer overflow.",
            },
            {
                "name": "Swapping m and n bounds",
                "wrong": "Using `m` for column length and `n` for row length, causing index out-of-bounds errors.",
                "right": "The grid has `m` rows and `n` columns, so the rolling row array must have length `n`.",
            },
            {
                "name": "Uncached recursive search",
                "wrong": "Exploring paths down and right without storing intermediate answers, taking exponential time.",
                "right": "Accumulate values in a rolling array to run in polynomial time.",
            },
        ],
        "edge_cases": [
            {"input": "m = 1, n = 1", "expected": "1", "why": "Single cell grid where start and finish are the same cell."},
            {"input": "m = 1, n = 5", "expected": "1", "why": "Single row grid allows only moving right."},
            {"input": "m = 3, n = 7", "expected": "28", "why": "Standard grid calculation producing 28 paths."},
            {"input": "m = 2, n = 2", "expected": "2", "why": "Smallest two-by-two grid with exactly two routes."},
        ],
        "interview_script": [
            "I need to count the unique paths from top-left to bottom-right in an m by n grid.",
            "The obvious way I could try is branching down and right recursively, which takes O(2^(m+n)) time.",
            "The key point I notice is that every cell is reached only from above or from the left.",
            "So I accumulate counts into a single rolling row, taking O(m · n) time and O(n) space.",
            "I will test a 1x1 grid, a single row grid, and a standard 3x7 grid.",
        ],
        "follow_ups": [
            {
                "question": "How would you solve this in O(min(m, n)) time using combinatorics?",
                "answer": "Compute the combination formula C(m + n - 2, min(m - 1, n - 1)) multiplying and dividing alternately.",
            },
            {
                "question": "What if some cells contain obstacles?",
                "answer": "Set obstacle cells to 0 paths so no paths flow through them during row updates.",
            },
            {
                "question": "What if movement in all four directions is allowed with no repeated cells?",
                "answer": "The problem becomes self-avoiding walks, which requires backtracking or Hamiltonian path algorithms.",
            },
        ],
        "related_slugs": ["lc-70", "lc-221", "lc-198"],
    },

    # 11. lc-647
    {
        "slugs": ["lc-647"],
        "pattern": "Center expansion",
        "trigger": "counting all palindromic substrings in a string",
        "summary": (
            "Every palindrome expands around a center. "
            "A string of length n has 2n - 1 centers: n single characters and n - 1 adjacent character pairs. "
            "Expanding outward from each center counts all palindromes in quadratic time."
        ),
        "approaches": [
            {
                "name": "Check all substrings with two pointers",
                "is_optimal": False,
                "idea": "Generate every substring and verify whether it is a palindrome using two pointers.",
                "steps": [
                    "Initialize an integer counter total to 0.",
                    "Loop the start index from 0 up to the string length minus 1.",
                    "Loop each end index from the start index up to the string length minus 1.",
                    "Call a helper function to verify if the substring between start and end is a palindrome.",
                    "If the helper confirms a palindrome, increment the total count by 1.",
                    "Return the total count after inspecting every substring pair.",
                ],
                "code": """class Solution {
    public int countSubstrings(String s) {
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            for (int j = i; j < s.length(); j++) {
                if (isPalindrome(s, i, j)) {
                    total++;
                }
            }
        }
        return total;
    }

    private boolean isPalindrome(String s, int left, int right) {
        while (left < right) {
            if (s.charAt(left++) != s.charAt(right--)) {
                return false;
            }
        }
        return true;
    }
}""",
                "time_complexity": "O(n³)",
                "time_why": "There are O(n²) substrings, and checking each substring takes O(n) time.",
                "space_complexity": "O(1)",
                "space_why": "Only pointer indices and a counter are stored.",
                "when_to_use": "Mention it first as the brute force verification baseline before expanding from centers.",
            },
            {
                "name": "Expand around center",
                "is_optimal": True,
                "idea": "Expand outward from each of the 2n - 1 centers using two pointers, stopping as soon as characters differ.",
                "steps": [
                    "Initialize an integer total to 0.",
                    "Loop each center index from 0 up to the string length minus 1.",
                    "Add the count of odd-length palindromes by expanding from (center, center).",
                    "Add the count of even-length palindromes by expanding from (center, center + 1).",
                    "Return the total count after checking each center.",
                ],
                "code": """class Solution {
    public int countSubstrings(String s) {
        int total = 0;
        for (int center = 0; center < s.length(); center++) {
            total += count(s, center, center) + count(s, center, center + 1);
        }
        return total;
    }

    private int count(String s, int left, int right) {
        int found = 0;
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            found++;
            left--;
            right++;
        }
        return found;
    }
}""",
                "time_complexity": "O(n²)",
                "time_why": "There are 2n - 1 centers, and each expansion takes at most n steps.",
                "space_complexity": "O(1)",
                "space_why": "Only pointer variables and an integer counter are used.",
                "when_to_use": "The optimal interview approach that avoids table allocations and checks palindromes in-place.",
            },
            {
                "name": "Manacher's algorithm",
                "idea": "One left-to-right pass works out how far the palindrome at every center reaches, reusing what the mirror center on the left already proved.",
                "steps": [
                    "Put a `#` between every pair of letters and at both ends, so odd and even palindromes alike sit on one center.",
                    "Walk the padded string from left to right, recording how far the palindrome at each center reaches.",
                    "Remember the palindrome that reaches furthest right so far. If the current center sits inside it, its mirror on the left gives a reach already safe to assume.",
                    "Push outward only from that safe reach, so no pair of letters is compared twice.",
                    "A center whose reach is r covers `(r + 1) / 2` palindromes of the original string, so add that in as you go.",
                ],
                "code": """class Solution {
    public int countSubstrings(String s) {
        StringBuilder padded = new StringBuilder("#");
        for (char c : s.toCharArray()) {
            padded.append(c).append('#');
        }
        char[] t = padded.toString().toCharArray();
        int n = t.length;
        int[] reach = new int[n];
        int center = 0;
        int right = 0;
        int total = 0;
        for (int i = 0; i < n; i++) {
            if (i < right) {
                reach[i] = Math.min(right - i, reach[2 * center - i]);
            }
            while (i - reach[i] - 1 >= 0 && i + reach[i] + 1 < n
                    && t[i - reach[i] - 1] == t[i + reach[i] + 1]) {
                reach[i]++;
            }
            if (i + reach[i] > right) {
                center = i;
                right = i + reach[i];
            }
            total += (reach[i] + 1) / 2;
        }
        return total;
    }
}""",
                "time_complexity": "O(n)",
                "time_why": "The right edge of the furthest palindrome only ever moves right, so the outward pushing costs n steps in total.",
                "space_complexity": "O(n)",
                "space_why": "The padded string and the reach array are each about twice the length of the input.",
                "when_to_use": "When the string is long enough that O(n²) is too slow, or when the reach of every center is wanted for later questions. Naming it is the right answer to 'can this be linear', and few interviews ask for more than that.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "s = \"aaa\"",
            "columns": ["center", "type", "expansion steps", "palindromes counted"],
            "rows": [
                ["index 0", "odd", "\"a\"", "1"],
                ["indices 0-1", "even", "\"aa\"", "1"],
                ["index 1", "odd", "\"a\", \"aaa\"", "2"],
                ["indices 1-2", "even", "\"aa\"", "1"],
                ["index 2", "odd", "\"a\"", "1"],
            ],
            "result": "Total palindromic substrings is 6.",
        },
        "mistakes": [
            {
                "name": "The Gap Trap",
                "wrong": "Only expanding around single characters `(center, center)`, missing palindromes like \"aa\".",
                "right": "Palindromes can have even length, so expand around `(center, center + 1)` as well.",
            },
            {
                "name": "Checking all substrings in O(n³)",
                "wrong": "Looping through all pairs and checking palindromes from scratch, taking cubic time.",
                "right": "Expand outward from centers to verify palindromes incrementally in quadratic time.",
            },
            {
                "name": "Off-by-one boundary checks in expansion",
                "wrong": "Allowing `left` to drop below 0 or `right` to exceed string length during expansion.",
                "right": "Check `left >= 0 && right < s.length()` as the loop condition before reading characters.",
            },
        ],
        "edge_cases": [
            {"input": "s = \"abc\"", "expected": "3", "why": "Only 3 single-letter palindromes exist."},
            {"input": "s = \"aaa\"", "expected": "6", "why": "All substrings in an identical character string are palindromes."},
            {"input": "s = \"a\"", "expected": "1", "why": "A single character string has exactly one palindrome."},
            {"input": "s = \"abba\"", "expected": "6", "why": "Even-length palindromes nested inside a larger palindrome."},
        ],
        "interview_script": [
            "I need to count the total number of palindromic substrings in a string.",
            "The obvious way I could try is checking all O(n²) substrings with two pointers, taking O(n³) time.",
            "The key point I notice is that every palindrome expands around one of 2n - 1 centers.",
            "So I expand outward from both single characters and adjacent pairs, reducing time to O(n²) with O(1) space.",
            "I will test a single character, \"abc\" with no multi-letter palindromes, and all identical letters \"aaa\".",
        ],
        "follow_ups": [
            {
                "question": "Can we solve this in O(n) linear time?",
                "answer": "Yes, Manacher algorithm finds all palindrome radii in linear time by reusing mirrored expansion results.",
            },
            {
                "question": "What if we need to return the longest palindromic substring instead of counting them?",
                "answer": "Track the maximum length and starting index during center expansions.",
            },
            {
                "question": "How would you count distinct palindromic substrings?",
                "answer": "Add valid palindrome substrings to a HashSet, or use a palindromic tree structure in linear time.",
            },
        ],
        "related_slugs": ["lc-5", "lc-91", "lc-1143"],
    },

    # 12. lc-91
    {
        "slugs": ["lc-91"],
        "pattern": "1-D DP",
        "trigger": "number of ways to decode a digit string into letters",
        "summary": (
            "A single digit from 1 to 9 maps to a letter, contributing the ways from step i - 1. "
            "A two-digit pair from 10 to 26 maps to a letter, contributing the ways from step i - 2. "
            "Summing both valid transitions gives the total decoding ways."
        ),
        "approaches": [
            {
                "name": "Plain recursive branching for 1 and 2 digits",
                "is_optimal": False,
                "idea": "At each index, branch into decoding one digit or decoding a valid two-digit pair.",
                "steps": [
                    "In the helper, check if the index has reached the end of the string, returning 1 for a successful decode.",
                    "If the character at the current index is '0', return 0 immediately because '0' cannot decode alone.",
                    "Recursively call the helper on index plus 1 to decode a single digit.",
                    "If two digits remain and form a value between 10 and 26, recursively call the helper on index plus 2.",
                    "Return the sum of ways from both valid branches.",
                ],
                "code": """class Solution {
    public int numDecodings(String s) {
        return helper(s, 0);
    }

    private int helper(String s, int i) {
        if (i == s.length()) {
            return 1;
        }
        if (s.charAt(i) == '0') {
            return 0;
        }
        int ways = helper(s, i + 1);
        if (i + 1 < s.length()) {
            int val = (s.charAt(i) - '0') * 10 + (s.charAt(i + 1) - '0');
            if (val <= 26) {
                ways += helper(s, i + 2);
            }
        }
        return ways;
    }
}""",
                "time_complexity": "O(2^n)",
                "time_why": "Every position can branch into single and double digit calls, creating a binary tree.",
                "space_complexity": "O(n)",
                "space_why": "The call stack depth equals the string length n.",
                "when_to_use": "Mention it first as the direct recursive branching before eliminating repeated work.",
            },
            {
                "name": "Two rolling decode variables",
                "is_optimal": True,
                "idea": "Keep only the previous two decoding counts since each step only looks two digits back.",
                "steps": [
                    "If the string is empty or starts with '0', return 0 immediately.",
                    "Initialize two variables twoBack = 1 and oneBack = 1 representing empty and single-digit prefixes.",
                    "Loop index i from 1 to s.length() minus 1.",
                    "Calculate current ways: add oneBack if digit is not '0', and add twoBack if the two-digit pair is between 10 and 26.",
                    "Advance the window by updating twoBack = oneBack and oneBack = current.",
                    "Return oneBack after processing all digits.",
                ],
                "code": """class Solution {
    public int numDecodings(String s) {
        if (s.isEmpty() || s.charAt(0) == '0') {
            return 0;
        }
        int twoBack = 1;
        int oneBack = 1;
        for (int i = 1; i < s.length(); i++) {
            int current = 0;
            if (s.charAt(i) != '0') {
                current += oneBack;
            }
            int pair = (s.charAt(i - 1) - '0') * 10 + (s.charAt(i) - '0');
            if (pair >= 10 && pair <= 26) {
                current += twoBack;
            }
            twoBack = oneBack;
            oneBack = current;
        }
        return oneBack;
    }
}""",
                "time_complexity": "O(n)",
                "time_why": "A single pass processes each digit with constant-time arithmetic.",
                "space_complexity": "O(1)",
                "space_why": "Only two integer state variables are maintained.",
                "when_to_use": "The optimal interview approach decoding digit strings in linear time and constant space.",
            },
        ],
        "walkthrough": {
            "input": "s = \"226\"",
            "columns": ["digit index", "single valid?", "pair valid?", "ways calculated"],
            "rows": [
                ["start", "-", "-", "oneBack = 1, twoBack = 1"],
                ["index 1 ('2')", "'2' -> 'B'", "'22' -> 'V'", "1 + 1 = 2 ways"],
                ["index 2 ('6')", "'6' -> 'F'", "'26' -> 'Z'", "2 + 1 = 3 ways"],
            ],
            "result": "Total decoding ways for \"226\" is 3 (\"BZ\", \"VF\", \"BBF\").",
        },
        "mistakes": [
            {
                "name": "The Zero Trap",
                "wrong": "Allowing '0' to map to a letter or decode on its own.",
                "right": "Digits must be 1 to 9 for a single letter; '0' can only appear as the second digit in '10' or '20'.",
            },
            {
                "name": "Leading zero allowed in two-digit pair",
                "wrong": "Accepting '06' as a valid 2-digit number.",
                "right": "Pairs must be strictly between 10 and 26; numbers starting with 0 cannot form a valid pair.",
            },
            {
                "name": "Uncached exponential recursion",
                "wrong": "Branching recursively on each digit without saving results, causing O(2^n) time limit exceeded.",
                "right": "Notice overlapping calls and roll the two prior answers forward in linear time.",
            },
        ],
        "edge_cases": [
            {"input": "s = \"06\"", "expected": "0", "why": "Leading zero cannot be mapped to any letter."},
            {"input": "s = \"10\"", "expected": "1", "why": "Only decodes as 'J' (10)."},
            {"input": "s = \"27\"", "expected": "1", "why": "27 exceeds 26, so only separate digits 'B' and 'G' are valid."},
            {"input": "s = \"2101\"", "expected": "1", "why": "'10' must pair together, forcing a unique decoding sequence."},
        ],
        "interview_script": [
            "I need to count the number of ways to decode a digit string into characters A through Z.",
            "The obvious way I could try is recursive branching on 1 or 2 digits, which takes O(2^n) time.",
            "The key point I notice is that each step depends only on the valid decodings ending at i - 1 and i - 2.",
            "So I roll two integer state variables forward, reducing time to O(n) with O(1) space.",
            "I will test leading zeros like \"06\", internal zeros like \"10\", and values exceeding 26.",
        ],
        "follow_ups": [
            {
                "question": "What if the string contains wildcard characters like '*'?",
                "answer": "Count '*' as 1-9 for single digits and 11-19, 21-26 for pairs, taking modulo 10^9 + 7.",
            },
            {
                "question": "How would you return all actual decoded string representations?",
                "answer": "Use backtracking with recursion and a path builder, pruning when an invalid digit occurs.",
            },
            {
                "question": "What if digits could map to three-digit numbers?",
                "answer": "Extend the state to track three rolling variables and validate 3-digit ranges.",
            },
        ],
        "related_slugs": ["lc-70", "lc-139", "lc-198"],
    },

    # 13. lc-152
    {
        "slugs": ["lc-152"],
        "pattern": "Dynamic programming",
        "trigger": "contiguous subarray with the largest product",
        "summary": (
            "Because multiplying by a negative number turns a small negative product into a large positive product, "
            "track both the maximum and minimum products ending at each position. "
            "Swap or compare candidates at each step to maintain the global maximum."
        ),
        "approaches": [
            {
                "name": "Check all subarrays with running product",
                "is_optimal": False,
                "idea": "Compute the product of all pairs (i, j) and track the maximum product seen.",
                "steps": [
                    "Initialize an integer best to the first element nums[0].",
                    "Loop a start index from 0 to n minus 1.",
                    "Maintain a running product starting at 1.",
                    "Loop an end index from start to n minus 1, multiplying into product and updating best.",
                    "Return the best product after evaluating every subarray pair.",
                ],
                "code": """class Solution {
    public int maxProduct(int[] nums) {
        int best = nums[0];
        for (int i = 0; i < nums.length; i++) {
            int prod = 1;
            for (int j = i; j < nums.length; j++) {
                prod *= nums[j];
                best = Math.max(best, prod);
            }
        }
        return best;
    }
}""",
                "time_complexity": "O(n²)",
                "time_why": "Nested loops check all pairs of start and end indices.",
                "space_complexity": "O(1)",
                "space_why": "Only scalar variables are maintained.",
                "when_to_use": "Mention it first as the brute force pair inspection baseline before tracking running extremes.",
            },
            {
                "name": "Dual min and max tracking",
                "is_optimal": True,
                "idea": "Maintain running maximum and minimum products, updating both at each step.",
                "steps": [
                    "Initialize best, high, and low all to the first element nums[0].",
                    "Loop each index i from 1 up to nums.length minus 1.",
                    "Compute candidateHigh as the maximum of value, high times value, and low times value.",
                    "Compute candidateLow as the minimum of value, high times value, and low times value.",
                    "Update the running high and low values, keeping the maximum in best.",
                    "Return best after scanning the entire array.",
                ],
                "code": """class Solution {
    public int maxProduct(int[] nums) {
        int best = nums[0];
        int high = nums[0];
        int low = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int value = nums[i];
            int candidateHigh = Math.max(value, Math.max(high * value, low * value));
            int candidateLow = Math.min(value, Math.min(high * value, low * value));
            high = candidateHigh;
            low = candidateLow;
            best = Math.max(best, high);
        }
        return best;
    }
}""",
                "time_complexity": "O(n)",
                "time_why": "A single pass makes constant-time comparisons at each element.",
                "space_complexity": "O(1)",
                "space_why": "Only three integer variables are maintained.",
                "when_to_use": "The optimal interview approach finding the maximum product subarray in linear time.",
            },
        ],
        "walkthrough": {
            "input": "nums = [2, 3, -2, 4]",
            "columns": ["num", "high candidate", "low candidate", "best so far"],
            "rows": [
                ["2", "2", "2", "2"],
                ["3", "max(3, 6, 6) = 6", "min(3, 6, 6) = 3", "6"],
                ["-2", "max(-2, -12, -6) = -2", "min(-2, -12, -6) = -12", "6"],
                ["4", "max(4, -8, -48) = 4", "min(4, -8, -48) = -48", "6"],
            ],
            "result": "Maximum product is 6 from subarray [2, 3].",
        },
        "mistakes": [
            {
                "name": "The Sign Flip Trap",
                "wrong": "Only tracking the maximum product like in Kadane algorithm for sum.",
                "right": "Track both the minimum and maximum product because a negative number turns a negative minimum into a large maximum.",
            },
            {
                "name": "Overwriting high before calculating low",
                "wrong": "Updating `high` in place before using its old value in the `low` calculation.",
                "right": "Save candidate high and candidate low in local variables before updating state.",
            },
            {
                "name": "Failing to handle zeros correctly",
                "wrong": "Allowing zero to permanently zero out the running product chain.",
                "right": "Compare candidates against the current number itself so a new subarray can start immediately after a zero.",
            },
        ],
        "edge_cases": [
            {"input": "nums = [-2]", "expected": "-2", "why": "A single negative number is the only subarray."},
            {"input": "nums = [-2, 0, -1]", "expected": "0", "why": "Zero resets the product chain and is larger than individual negatives."},
            {"input": "nums = [-2, 3, -4]", "expected": "24", "why": "Two negative numbers multiply to positive 24 across the entire array."},
            {"input": "nums = [0, 2]", "expected": "2", "why": "A zero at the start should not prevent picking the subsequent positive."},
        ],
        "interview_script": [
            "I need to find the contiguous subarray that has the largest product.",
            "The obvious way I could try is computing all subarray products in O(n²) time.",
            "The key point I notice is that multiplying by a negative number flips the minimum into the maximum.",
            "So I track both running maximum and running minimum ending at each index, taking O(n) time and O(1) space.",
            "I will test a single negative number, an array containing zero, and two negative numbers.",
        ],
        "follow_ups": [
            {
                "question": "Can we solve this with prefix and suffix sweeps?",
                "answer": "Yes, compute prefix and suffix products resetting at zeros; the maximum encountered overall is the answer.",
            },
            {
                "question": "What if elements can cause 64-bit integer overflow?",
                "answer": "Work with logarithms and separate signs, or use BigInteger in Java.",
            },
            {
                "question": "How would you return the actual subarray indices?",
                "answer": "Track the start index of the current chain whenever high or low resets to value.",
            },
        ],
        "related_slugs": ["lc-53", "lc-198", "lc-300"],
    },

    # 14. lc-221
    {
        "slugs": ["lc-221"],
        "pattern": "2-D DP",
        "trigger": "largest square containing only 1s in a binary matrix",
        "summary": (
            "If cell (r, c) contains '1', the maximum side length of a square ending at (r, c) is 1 plus the minimum of its top, left, and diagonal neighbors. "
            "Tracking the maximum side length and returning its square gives the area."
        ),
        "approaches": [
            {
                "name": "Full 2D DP matrix",
                "is_optimal": False,
                "idea": "Build a 2D table where dp[r][c] records the maximum square side length ending at cell (r, c).",
                "steps": [
                    "Check if the matrix is null or empty, returning 0 immediately.",
                    "Allocate a 2D integer array dp of size (rows + 1) x (cols + 1).",
                    "Track an integer best initialized to 0.",
                    "For each cell containing '1', set dp[r][c] = 1 + min(dp[r - 1][c - 1], min(dp[r - 1][c], dp[r][c - 1])).",
                    "Update best with dp[r][c], and return best * best as the square area.",
                ],
                "code": """class Solution {
    public int maximalSquare(String[] matrix) {
        if (matrix == null || matrix.length == 0) return 0;
        int rows = matrix.length;
        int cols = matrix[0].length();
        int[][] dp = new int[rows + 1][cols + 1];
        int best = 0;
        for (int r = 1; r <= rows; r++) {
            for (int c = 1; c <= cols; c++) {
                if (matrix[r - 1].charAt(c - 1) == '1') {
                    dp[r][c] = 1 + Math.min(dp[r - 1][c - 1], Math.min(dp[r - 1][c], dp[r][c - 1]));
                    best = Math.max(best, dp[r][c]);
                }
            }
        }
        return best * best;
    }
}""",
                "time_complexity": "O(m · n)",
                "time_why": "Every cell in the matrix is evaluated once with constant-time neighbor checks.",
                "space_complexity": "O(m · n)",
                "space_why": "A 2D array of size (rows + 1) x (cols + 1) is allocated.",
                "when_to_use": "Mention it first to clearly show the relationship between a square and its three corner neighbors.",
            },
            {
                "name": "Two rolling rows space optimization",
                "is_optimal": True,
                "idea": "Maintain only two rows to reduce auxiliary memory to linear in columns.",
                "steps": [
                    "Check for an empty matrix, returning 0 if rows or columns are 0.",
                    "Allocate two 1D integer arrays prev and cur of size cols + 1.",
                    "Track an integer best initialized to 0.",
                    "For each row, if cell contains '1', set cur[c] = 1 + min(prev[c - 1], min(prev[c], cur[c - 1])); otherwise set cur[c] = 0.",
                    "Update best with cur[c], swap prev and cur after each row, and return best * best.",
                ],
                "code": """class Solution {
    public int maximalSquare(String[] matrix) {
        if (matrix == null || matrix.length == 0) return 0;
        int rows = matrix.length;
        int cols = matrix[0].length();
        int[] prev = new int[cols + 1];
        int[] cur = new int[cols + 1];
        int best = 0;
        for (int r = 1; r <= rows; r++) {
            for (int c = 1; c <= cols; c++) {
                if (matrix[r - 1].charAt(c - 1) == '1') {
                    cur[c] = 1 + Math.min(prev[c - 1], Math.min(prev[c], cur[c - 1]));
                    best = Math.max(best, cur[c]);
                } else {
                    cur[c] = 0;
                }
            }
            int[] swap = prev;
            prev = cur;
            cur = swap;
        }
        return best * best;
    }
}""",
                "time_complexity": "O(m · n)",
                "time_why": "Every cell is visited once with constant-time arithmetic.",
                "space_complexity": "O(n)",
                "space_why": "Only two rows of length cols + 1 are kept in memory.",
                "when_to_use": "The optimal interview approach that reduces memory from quadratic grid to linear column size.",
            },
            {
                "name": "Binary search on the side, with a 2D prefix sum",
                "idea": "If a square of side k fits somewhere, so does every smaller one, so the side can be searched — and a running count of 1s says in one step whether a given block is solid.",
                "steps": [
                    "Build a table where each entry holds the number of 1s from the top-left corner down to that cell.",
                    "The count inside any block is then four reads: the far corner, minus the two strips above and left, plus the overlap added back.",
                    "A block of side k is solid when its count is k times k.",
                    "Binary search k between 0 and the smaller side of the grid, sweeping every block of that size for each guess.",
                    "Return the largest side that fits, squared.",
                ],
                "code": """class Solution {
    public int maximalSquare(String[] matrix) {
        if (matrix == null || matrix.length == 0) return 0;
        int rows = matrix.length;
        int cols = matrix[0].length();
        int[][] ones = new int[rows + 1][cols + 1];
        for (int r = 1; r <= rows; r++) {
            for (int c = 1; c <= cols; c++) {
                int cell = matrix[r - 1].charAt(c - 1) == '1' ? 1 : 0;
                ones[r][c] = cell + ones[r - 1][c] + ones[r][c - 1] - ones[r - 1][c - 1];
            }
        }
        int low = 0;
        int high = Math.min(rows, cols);
        while (low < high) {
            int side = low + (high - low + 1) / 2;
            if (fits(ones, rows, cols, side)) {
                low = side;
            } else {
                high = side - 1;
            }
        }
        return low * low;
    }

    private boolean fits(int[][] ones, int rows, int cols, int side) {
        for (int r = side; r <= rows; r++) {
            for (int c = side; c <= cols; c++) {
                int total = ones[r][c] - ones[r - side][c] - ones[r][c - side] + ones[r - side][c - side];
                if (total == side * side) return true;
            }
        }
        return false;
    }
}""",
                "time_complexity": "O(m · n · log(min(m, n)))",
                "time_why": "Each guessed side sweeps every cell once, and the guesses halve the range of sides.",
                "space_complexity": "O(m · n)",
                "space_why": "The running-count table holds one number per cell.",
                "when_to_use": "When the rule changes to one a corner-by-corner count cannot carry, such as the largest square holding at most t zeros. The count table answers any block in one step, and the search still works because a bigger square is always harder to fit.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "matrix = [\"10100\", \"10111\", \"11111\", \"10010\"]",
            "columns": ["row", "max side in row", "best side overall", "notes"],
            "rows": [
                ["row 1", "1", "1", "Isolated 1s"],
                ["row 2", "1", "1", "No 2x2 square completed yet"],
                ["row 3", "2", "2", "2x2 square formed at columns 2-4"],
                ["row 4", "1", "2", "No larger square formed"],
            ],
            "result": "Max square side length is 2, producing an area of 2 * 2 = 4.",
        },
        "mistakes": [
            {
                "name": "The Side Trap",
                "wrong": "Returning `best` directly as the answer.",
                "right": "The problem asks for the area of the square, so return `best * best`.",
            },
            {
                "name": "Not resetting cur[c] to 0 on '0' cell",
                "wrong": "Leaving `cur[c]` unchanged when `matrix[r - 1].charAt(c - 1) == '0'`.",
                "right": "Reset `cur[c] = 0` so old values from the previous row do not leak into the current row.",
            },
            {
                "name": "Off-by-one indexing on 1-based table",
                "wrong": "Reading `matrix[r][c]` instead of `matrix[r - 1].charAt(c - 1)` when using padded dimensions.",
                "right": "Offset coordinates so table index r corresponds to matrix row r - 1.",
            },
        ],
        "edge_cases": [
            {"input": "matrix = [\"0\"]", "expected": "0", "why": "Matrix containing only '0' has area 0."},
            {"input": "matrix = [\"1\"]", "expected": "1", "why": "A single '1' cell has area 1."},
            {"input": "matrix = [\"11\", \"11\"]", "expected": "4", "why": "Full 2x2 square has area 4."},
            {"input": "matrix with single row", "expected": "1 if any '1' else 0", "why": "A single row cannot form any square larger than 1x1."},
        ],
        "interview_script": [
            "I need to find the largest square of 1s in a binary matrix and return its area.",
            "The obvious way I could try is storing a full 2D table, which takes O(m · n) space.",
            "The key point I notice is that a square ending at (r, c) depends only on its top, left, and diagonal neighbors.",
            "So I maintain two rolling rows, reducing space to O(n) while keeping O(m · n) time.",
            "I will test a single '0', a single '1', and a full 2x2 square.",
        ],
        "follow_ups": [
            {
                "question": "How would you find the maximal rectangle instead of square?",
                "answer": "Maintain column histogram heights and run the monotonic stack algorithm from Largest Rectangle in Histogram.",
            },
            {
                "question": "Can we optimize space further to a single row with one scalar?",
                "answer": "Yes, maintain the top-left diagonal element in a single integer variable before overwriting each cell.",
            },
            {
                "question": "What if the matrix contains weights or costs?",
                "answer": "Use 2D prefix sums to evaluate range sums of arbitrary squares in constant time.",
            },
        ],
        "related_slugs": ["lc-62", "lc-84", "lc-72"],
    },
]
