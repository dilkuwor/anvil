"""Recommended problems, batch 06 (dynamic programming). See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-64"],
        "pattern": "2-D DP",
        "trigger": "“Smallest total” of a walk through a grid that may only move right or down.",
        "summary": (
            "Each square holds the cheapest total to reach it. You can only arrive from above or from the left, "
            "so a square is its own number plus the cheaper of those two. The bottom right square holds the answer."
        ),
        "approaches": [
            {
                "name": "Try every walk (plain recursion)",
                "idea": "From each square, try stepping down and stepping right, and keep the cheaper of the two walks.",
                "steps": [
                    "Start a helper on the top left square.",
                    "If the square is the bottom right one, return its number.",
                    "If the square is outside the grid, return a huge number so it is never chosen.",
                    "Otherwise ask the helper for the square below and the square on the right.",
                    "Return this square's number plus the smaller of the two answers.",
                ],
                "code": """class Solution {
    public int minPathSum(int[][] grid) {
        return walk(grid, 0, 0);
    }

    private int walk(int[][] grid, int r, int c) {
        int m = grid.length;
        int n = grid[0].length;
        if (r >= m || c >= n) return Integer.MAX_VALUE;
        if (r == m - 1 && c == n - 1) return grid[r][c];
        int down = walk(grid, r + 1, c);
        int right = walk(grid, r, c + 1);
        return grid[r][c] + Math.min(down, right);
    }
}
""",
                "time_complexity": "O(2^(m+n))",
                "time_why": "Every square splits into two new calls, and a walk is m + n - 1 squares long.",
                "space_complexity": "O(m + n)",
                "space_why": "The chain of open calls is as long as one walk.",
                "when_to_use": "Say it first to show the choice at each square. The same squares are worked out again and again, so do not stop here.",
                "is_optimal": False,
            },
            {
                "name": "Fill one row of best totals",
                "idea": "Go through the grid row by row and keep one row of cheapest totals, written over as you go.",
                "steps": [
                    "Make an array `best` with one slot per column.",
                    "On the top row, a square can only be reached from the left: add its number to the total on its left.",
                    "On the left edge, a square can only be reached from above: add its number to the total above it.",
                    "Every other square gets its own number plus the smaller of `best[c]` (above) and `best[c - 1]` (left).",
                    "After the last row, `best[n - 1]` is the bottom right total. Return it.",
                ],
                "code": """class Solution {
    public int minPathSum(int[][] grid) {
        int m = grid.length;
        int n = grid[0].length;
        int[] best = new int[n];
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (r == 0 && c == 0) best[c] = grid[0][0];
                else if (r == 0) best[c] = best[c - 1] + grid[r][c];
                else if (c == 0) best[c] = best[c] + grid[r][c];
                else best[c] = grid[r][c] + Math.min(best[c], best[c - 1]);
            }
        }
        return best[n - 1];
    }
}
""",
                "time_complexity": "O(m · n)",
                "time_why": "Each square is filled once, with one comparison and one addition.",
                "space_complexity": "O(n)",
                "space_why": "A square only looks one row up, so one row of n totals is enough.",
                "when_to_use": "The answer to give. Mention that a full m by n table works too if they want the walk itself back.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "grid = [[1,3,1],[1,5,1],[4,2,1]]",
            "columns": ["square", "number", "from above", "from left", "best total", "note"],
            "rows": [
                ["(0,0)", "1", "–", "–", "1", "the start"],
                ["(0,1), (0,2)", "3, 1", "–", "1, 4", "4, 5", "top edge: only from the left"],
                ["(1,0), (2,0)", "1, 4", "1, 2", "–", "2, 6", "left edge: only from above"],
                ["(1,1)", "5", "4", "2", "7", "left is cheaper: 5 + 2"],
                ["(1,2)", "1", "5", "7", "6", "above is cheaper: 1 + 5"],
                ["(2,1)", "2", "7", "6", "8", "left is cheaper: 2 + 6"],
                ["(2,2)", "1", "6", "8", "7", "above is cheaper: 1 + 6"],
                ["cheap next step", "1, 1, 4, 2, 1", "–", "–", "9", "two cheap 1s lead into the 4"],
            ],
            "result": "The bottom right square holds 7, so the answer is 7.",
        },
        "mistakes": [
            {
                "name": "The Cheap Step Trap",
                "wrong": "Walking to whichever next square is cheaper. On `[[1,3,1],[1,5,1],[4,2,1]]` that walks 1, 1, 4, 2, 1 and pays 9.",
                "right": "A cheap next square can lead into an expensive area. Give every square its best total, from the cheaper of above and left.",
            },
            {
                "name": "Treating the outside as free",
                "wrong": "Using 0 for the missing square above the top row or left of the left edge, so `min` picks the outside.",
                "right": "The top row can only come from the left, and the left edge only from above. Handle those two edges on their own.",
            },
            {
                "name": "Forgetting the start square",
                "wrong": "Starting the total at 0 and adding only the squares you step onto.",
                "right": "The start square counts too: `best[0]` begins as `grid[0][0]`.",
            },
        ],
        "edge_cases": [
            {"input": "[[5]]", "expected": "5", "why": "One square: the start is also the end."},
            {"input": "[[1,2,3,4]]", "expected": "10", "why": "One row: there is only one walk, straight right."},
            {"input": "[[1],[2],[3]]", "expected": "6", "why": "One column: there is only one walk, straight down."},
            {"input": "[[2,1,3],[1,9,1],[1,1,2]]", "expected": "7", "why": "Cheapest next step walks into the 9 region. Catches the Cheap Step Trap."},
            {"input": "[[0,0],[0,0]]", "expected": "0", "why": "Zeros are allowed and must not break the minimum."},
        ],
        "interview_script": [
            "So I walk from the top left to the bottom right, only right or down, and I want the smallest sum of squares I stand on.",
            "Picking the cheaper next square each time can fail, so the obvious correct way is to try every walk. That is O(2^(m+n)).",
            "The key point is that I can only enter a square from above or from the left, so its best total depends on just those two.",
            "I fill the grid row by row with one array of best totals: O(m · n) time and O(n) space.",
            "I would test a single square, a single row, a single column, and a grid where the cheap first step is a trap.",
        ],
        "follow_ups": [
            {"question": "Can you return the walk itself, not only the total?", "answer": "Keep the full m by n table. Start at the bottom right and step back to whichever of above or left has the smaller total."},
            {"question": "What if you may also move diagonally down and right?", "answer": "Add the diagonal square as a third way in. The minimum is over three squares instead of two."},
            {"question": "Can you use no extra memory at all?", "answer": "Write the totals into `grid` itself, if you are allowed to change the input."},
            {"question": "What if some squares are walls?", "answer": "Give a wall a total of a huge number so it is never the cheaper way in. Watch for adding to that huge number."},
        ],
        "related_slugs": ["lc-62", "lc-221", "lc-1143"],
    },
    {
        "slugs": ["lc-309"],
        "pattern": "State machine DP",
        "trigger": "Buy and sell as often as you like, but after a sale you must wait a day.",
        "summary": (
            "Each day you are in one of three rooms: holding a share, just sold, or free. Keep the best profit for each room. "
            "You may buy only from free, never straight after a sale: that is the one-day wait."
        ),
        "approaches": [
            {
                "name": "Try every choice each day (plain recursion)",
                "idea": "On each day, either do nothing or make a trade, and take the better of the two futures.",
                "steps": [
                    "Start a helper on day 0, with no share in hand.",
                    "If the days have run out, return 0.",
                    "Doing nothing moves to the next day with the same hand.",
                    "With no share, you may buy: pay today's price and move to the next day holding a share.",
                    "With a share, you may sell: earn today's price and jump two days ahead, which is the wait.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        return best(prices, 0, false);
    }

    private int best(int[] prices, int day, boolean holding) {
        if (day >= prices.length) return 0;
        int wait = best(prices, day + 1, holding);
        int trade;
        if (holding) trade = prices[day] + best(prices, day + 2, false);
        else trade = -prices[day] + best(prices, day + 1, true);
        return Math.max(wait, trade);
    }
}
""",
                "time_complexity": "O(2^n)",
                "time_why": "Every day splits into two choices, and nothing remembers a day it has already worked out.",
                "space_complexity": "O(n)",
                "space_why": "The chain of open calls can be one call per day.",
                "when_to_use": "Say it to show the three choices clearly. It repeats the same days many times, so move on.",
                "is_optimal": False,
            },
            {
                "name": "Three rooms, one pass",
                "idea": "Carry the best profit for holding, just sold and free from one day to the next.",
                "steps": [
                    "Start with `hold = -prices[0]` (bought on day 0), and `sold = 0` and `rest = 0`.",
                    "For each next day, first save yesterday's `sold`, because the free room needs it.",
                    "Just sold today means you held yesterday and sell today: `sold = hold + price`.",
                    "Holding today means you kept the share, or bought today from the free room: `hold = max(hold, rest - price)`.",
                    "Free today means you were free yesterday, or yesterday was the sale and today is the wait: `rest = max(rest, soldBefore)`.",
                    "At the end you should not own a share, so return the larger of `sold` and `rest`.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        int hold = -prices[0];
        int sold = 0;
        int rest = 0;
        for (int i = 1; i < prices.length; i++) {
            int soldBefore = sold;
            sold = hold + prices[i];
            hold = Math.max(hold, rest - prices[i]);
            rest = Math.max(rest, soldBefore);
        }
        return Math.max(sold, rest);
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each day updates three numbers once.",
                "space_complexity": "O(1)",
                "space_why": "Only yesterday's three numbers are kept, whatever the number of days.",
                "when_to_use": "The answer to give. Draw the three rooms and their arrows before writing the code.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "prices = [1,2,3,0,2]",
            "columns": ["day", "price", "holding", "just sold", "free", "note"],
            "rows": [
                ["0", "1", "-1", "0", "0", "buy on day 0"],
                ["1", "2", "-1", "1", "0", "sell now would give 1"],
                ["2", "3", "-1", "2", "1", "yesterday's sale reaches free"],
                ["3", "0", "1", "-1", "2", "buy from free (1), not from yesterday's sale (2)"],
                ["4", "2", "1", "3", "2", "sell the share bought at 0"],
            ],
            "result": "The best of just sold and free on the last day is 3, so the answer is 3.",
        },
        "mistakes": [
            {
                "name": "The No-Rest Trap",
                "wrong": "Buying straight from yesterday's sale: `hold = max(hold, sold - price)`. On `[1,2,3,0,2]` that returns 4.",
                "right": "After a sale the next day is rest. Buy only from the free room, never straight from yesterday's sale.",
            },
            {
                "name": "Overwriting sold too early",
                "wrong": "Updating `sold` first and then using the new `sold` to update `rest`.",
                "right": "Save yesterday's `sold` in `soldBefore` before changing it, and use that saved value for `rest`.",
            },
            {
                "name": "Returning the holding room",
                "wrong": "Returning `max(hold, sold, rest)`.",
                "right": "Holding a share at the end means money spent and never earned back. Return `max(sold, rest)`.",
            },
        ],
        "edge_cases": [
            {"input": "[1]", "expected": "0", "why": "One day: there is no day to sell on."},
            {"input": "[2,1]", "expected": "0", "why": "Prices only fall, so the best is to never trade."},
            {"input": "[1,2,4]", "expected": "3", "why": "One long rise: one trade from 1 to 4 beats two small trades."},
            {"input": "[1,2,3,0,2]", "expected": "3", "why": "The wait blocks buying at 0 right after selling at 3. Catches the No-Rest Trap."},
            {"input": "[6,1,3,2,4,7]", "expected": "6", "why": "Two trades would need a wait day in between. One trade from 1 to 7 is better."},
        ],
        "interview_script": [
            "So I can trade many times, I hold at most one share, and after a sale I must wait one day before I buy.",
            "The obvious way is to try buy, sell or wait on every day with recursion. That is O(2^n).",
            "The key point is that each day ends in one of three rooms: holding, just sold, or free, and I can buy only from free.",
            "I carry the best profit for those three rooms through the days: O(n) time and O(1) space.",
            "I would test one day, falling prices, one long rise, and a case where buying right after a sale would look better.",
        ],
        "follow_ups": [
            {"question": "What if the wait is k days instead of one?", "answer": "Keep the free room's value from k days ago. Buy from `rest` as it was k days back, using a small array of past values."},
            {"question": "What if every sale also costs a fee?", "answer": "Drop the wait and subtract the fee when you sell. That is lc-714, with two rooms instead of three."},
            {"question": "What if you may trade at most k times?", "answer": "Keep a holding and a free value for each trade count from 1 to k. That is O(n · k)."},
        ],
        "related_slugs": ["lc-121", "lc-122", "lc-198"],
    },
    {
        "slugs": ["lc-518"],
        "pattern": "Unbounded knapsack count",
        "trigger": "“How many combinations” make an amount, with coins you may reuse and order not mattering.",
        "summary": (
            "Let the coins join one kind at a time. After each coin's pass, every amount holds the number of ways "
            "using only the coins seen so far. Coins on the outside means each group is counted once."
        ),
        "approaches": [
            {
                "name": "Use this coin again, or move on (plain recursion)",
                "idea": "At each step either use the current coin once more, or never use it again and move to the next coin.",
                "steps": [
                    "Start a helper at coin 0 with the full amount left.",
                    "If the amount left is 0, that is one way. Return 1.",
                    "If the amount left is below 0, or the coins have run out, return 0.",
                    "Add two answers: use this coin again (amount left minus the coin), or move to the next coin.",
                    "Because you never go back to an earlier coin, each group of coins is counted once.",
                ],
                "code": """class Solution {
    public int change(int amount, int[] coins) {
        return count(coins, 0, amount);
    }

    private int count(int[] coins, int index, int left) {
        if (left == 0) return 1;
        if (left < 0 || index == coins.length) return 0;
        return count(coins, index, left - coins[index]) + count(coins, index + 1, left);
    }
}
""",
                "time_complexity": "O(2^(amount + coins))",
                "time_why": "Every call splits in two, and one chain can be up to amount + coins calls long.",
                "space_complexity": "O(amount + coins)",
                "space_why": "The chain of open calls can be that long.",
                "when_to_use": "Say it to show how order is avoided: you never go back to an earlier coin. It repeats work, so move on.",
                "is_optimal": False,
            },
            {
                "name": "One row of ways, coins on the outside",
                "idea": "Add the coins one kind at a time, and let each new coin add to the ways of every amount it can reach.",
                "steps": [
                    "Make `ways` with one slot per amount from 0 to `amount`, and set `ways[0] = 1`: pay nothing with no coins.",
                    "Take the coins one at a time. This outer loop is the important part.",
                    "For this coin, go through the amounts from the coin's value up to `amount`.",
                    "Add `ways[a - coin]` to `ways[a]`: every way to pay the rest, followed by this coin.",
                    "After the last coin, `ways[amount]` counts every group once. Return it.",
                ],
                "code": """class Solution {
    public int change(int amount, int[] coins) {
        int[] ways = new int[amount + 1];
        ways[0] = 1;
        for (int coin : coins) {
            for (int a = coin; a <= amount; a++) {
                ways[a] += ways[a - coin];
            }
        }
        return ways[amount];
    }
}
""",
                "time_complexity": "O(amount × coins)",
                "time_why": "Each coin makes one pass over the amounts.",
                "space_complexity": "O(amount)",
                "space_why": "One slot per amount from 0 to `amount`.",
                "when_to_use": "The answer to give. Say out loud why the coin loop is outside: it stops `1 + 2` and `2 + 1` both being counted.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "amount = 5, coins = [1,2,5]",
            "columns": ["pass", "coin", "ways for 0, 1, 2, 3, 4, 5", "note"],
            "rows": [
                ["start", "–", "1, 0, 0, 0, 0, 0", "one way to pay 0: no coins"],
                ["1", "1", "1, 1, 1, 1, 1, 1", "only 1s: one way each"],
                ["2", "2", "1, 1, 2, 2, 3, 3", "now 1s and 2s"],
                ["3", "5", "1, 1, 2, 2, 3, 4", "the 5 adds one way to 5"],
                ["amounts outside", "all", "1, 1, 2, 3, 5, 9", "counts 1 + 2 + 2 and 2 + 1 + 2 as two ways"],
            ],
            "result": "With the coins on the outside, `ways[5]` is 4, so the answer is 4.",
        },
        "mistakes": [
            {
                "name": "The Double Count Trap",
                "wrong": "Putting the amounts on the outside and the coins inside. For amount 5 with `[1,2,5]` that counts 9, because `1 + 2` and `2 + 1` both count.",
                "right": "Put the coins on the outside. Each coin is only added after the smaller ones, so every group is counted once.",
            },
            {
                "name": "Starting with ways[0] = 0",
                "wrong": "Leaving `ways[0]` at 0, so nothing ever gets counted.",
                "right": "Paying 0 has exactly one way: use no coins. Set `ways[0] = 1`.",
            },
            {
                "name": "Going through the amounts backwards",
                "wrong": "Running the inner loop from `amount` down to `coin`, as in problems where each item is used once.",
                "right": "Coins here can be reused, so go upwards. Then `ways[a - coin]` already includes this coin.",
            },
        ],
        "edge_cases": [
            {"input": "amount = 0, coins = [7]", "expected": "1", "why": "Paying nothing is one way, even though no coin fits."},
            {"input": "amount = 3, coins = [2]", "expected": "0", "why": "The amount cannot be paid at all."},
            {"input": "amount = 10, coins = [10]", "expected": "1", "why": "A single coin equal to the amount."},
            {"input": "amount = 5, coins = [1,2,5]", "expected": "4", "why": "Amounts on the outside would give 9. Catches the Double Count Trap."},
            {"input": "amount = 500, coins = [3,5,7,8,9,10,11]", "expected": "35502874", "why": "Large enough that plain recursion runs out of time."},
        ],
        "interview_script": [
            "So I count the groups of coins that pay the amount exactly, and the order of the coins does not matter.",
            "My obvious way is recursion: use this coin again, or move to the next one. That is O(2^(amount + coins)).",
            "The key point is that I add coins one kind at a time. With coins as the outer loop, a group is never counted in two orders.",
            "I keep one row of ways per amount: O(amount × coins) time and O(amount) space.",
            "I would test amount 0, an amount that cannot be paid, and amount 5 with coins 1, 2 and 5 to catch double counting.",
        ],
        "follow_ups": [
            {"question": "What if the order of the coins does matter?", "answer": "Swap the loops: amounts outside, coins inside. That is lc-377, Combination Sum IV."},
            {"question": "What if each coin may be used only once?", "answer": "Keep coins outside, but run the amounts from high to low, so a coin cannot build on itself."},
            {"question": "What if they want the fewest coins instead?", "answer": "Store the fewest coins per amount and take a minimum instead of a sum. That is lc-322."},
        ],
        "related_slugs": ["lc-322", "lc-377", "lc-416"],
    },
    {
        "slugs": ["lc-377"],
        "pattern": "1-D DP, count orders",
        "trigger": "“How many combinations” add up to a target, but different orders count as different lists.",
        "summary": (
            "Look at the last number of a list. For each total, add up the ways to reach the total minus each number. "
            "Totals on the outside means every order is counted."
        ),
        "approaches": [
            {
                "name": "Try every last number (plain recursion)",
                "idea": "The number of lists for a total is the sum, over every number, of the lists for the total minus that number.",
                "steps": [
                    "Start a helper on the target.",
                    "If the total is 0, that is one finished list. Return 1.",
                    "Otherwise, for every number that is not bigger than the total, ask the helper about the total minus that number.",
                    "Add all of those answers and return the sum.",
                ],
                "code": """class Solution {
    public int combinationSum4(int[] nums, int target) {
        if (target == 0) return 1;
        int ways = 0;
        for (int x : nums) {
            if (x <= target) ways += combinationSum4(nums, target - x);
        }
        return ways;
    }
}
""",
                "time_complexity": "O(nums^target)",
                "time_why": "Every call can split into one call per number, up to target levels deep.",
                "space_complexity": "O(target)",
                "space_why": "The chain of open calls is at most target long, when the number 1 is used every time.",
                "when_to_use": "Say it first: it shows the idea of the last number. It works out the same totals again and again, so move on.",
                "is_optimal": False,
            },
            {
                "name": "One row of ways, totals on the outside",
                "idea": "Fill the ways for every total from 1 up, each one built from the totals below it.",
                "steps": [
                    "Make `ways` with one slot per total from 0 to `target`, and set `ways[0] = 1`: the empty list.",
                    "Go through the totals from 1 up to `target`. This outer loop is the important part.",
                    "For this total, try every number `x` that is not bigger than it as the last number of the list.",
                    "Add `ways[t - x]` to `ways[t]`: every list for the rest, with `x` written at the end.",
                    "Return `ways[target]`.",
                ],
                "code": """class Solution {
    public int combinationSum4(int[] nums, int target) {
        int[] ways = new int[target + 1];
        ways[0] = 1;
        for (int t = 1; t <= target; t++) {
            for (int x : nums) {
                if (x <= t) ways[t] += ways[t - x];
            }
        }
        return ways[target];
    }
}
""",
                "time_complexity": "O(target × nums)",
                "time_why": "Each total tries every number once.",
                "space_complexity": "O(target)",
                "space_why": "One slot per total from 0 to `target`.",
                "when_to_use": "The answer to give. Point out it is lc-518 with the two loops swapped, and say why.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,2,3], target = 4",
            "columns": ["total", "last 1", "last 2", "last 3", "ways"],
            "rows": [
                ["0", "–", "–", "–", "1"],
                ["1", "ways[0] = 1", "–", "–", "1"],
                ["2", "ways[1] = 1", "ways[0] = 1", "–", "2"],
                ["3", "ways[2] = 2", "ways[1] = 1", "ways[0] = 1", "4"],
                ["4", "ways[3] = 4", "ways[2] = 2", "ways[1] = 1", "7"],
                ["numbers outside", "–", "–", "–", "4, the orders are lost"],
            ],
            "result": "`ways[4]` is 4 + 2 + 1 = 7, so the answer is 7.",
        },
        "mistakes": [
            {
                "name": "The Lost Order Trap",
                "wrong": "Putting the numbers on the outside, as in Coin Change II. For `[1,2,3]` and 4 that returns 4, because `1 + 3` and `3 + 1` count once.",
                "right": "Order matters here. Put the totals on the outside, so every number is tried as the last step of every total.",
            },
            {
                "name": "Starting with ways[0] = 0",
                "wrong": "Leaving `ways[0]` at 0, so no total ever gets a way.",
                "right": "The empty list adds up to 0. Set `ways[0] = 1`.",
            },
            {
                "name": "Reading past the start",
                "wrong": "Adding `ways[t - x]` when `x` is bigger than `t`.",
                "right": "Skip any number bigger than the total. It cannot be the last step.",
            },
        ],
        "edge_cases": [
            {"input": "nums = [9], target = 3", "expected": "0", "why": "Every number is too big."},
            {"input": "nums = [3], target = 9", "expected": "1", "why": "One number, used three times, in one order."},
            {"input": "nums = [1,3], target = 5", "expected": "4", "why": "Small enough to list by hand: 11111, 113, 131, 311."},
            {"input": "nums = [1,2,3], target = 4", "expected": "7", "why": "Numbers on the outside would give 4. Catches the Lost Order Trap."},
            {"input": "nums = [2,1,3], target = 35", "expected": "1132436852", "why": "Close to the int limit, and too slow for plain recursion."},
        ],
        "interview_script": [
            "So I count ordered lists of numbers that add up to the target, and 1 + 2 is different from 2 + 1.",
            "My obvious way is recursion: I try every number as the last one. That is O(nums^target), with the same totals repeated.",
            "The key point for me is the last number. The lists for a total are the lists for the total minus each number, with it added at the end.",
            "I fill one row of ways from 0 up to the target: O(target × nums) time and O(target) space.",
            "I would test numbers that are all too big, a single number, and 1, 2, 3 with target 4 to be sure the orders are counted.",
        ],
        "follow_ups": [
            {"question": "How is this different from Coin Change II?", "answer": "Only the loop order. Coins outside counts groups once; totals outside counts every order."},
            {"question": "What if negative numbers were allowed?", "answer": "Lists could go on forever, like 1 + (-1) + 1. You would need a limit on the list length."},
            {"question": "What if they ask for the lists themselves?", "answer": "Use backtracking and start every step from the first number, not the current one. The output can be huge."},
        ],
        "related_slugs": ["lc-39", "lc-518", "lc-70"],
    },
]
