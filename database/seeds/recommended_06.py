"""Recommended problems, batch 06: four dynamic-programming problems that sit beside ones the
catalog already has (lc-62, lc-121/122, lc-322, lc-39). See ``recommended.md`` for why.

Each problem carries its reference solution, complexity and progressive hints inline, like
``microsoft_extra``. Check with ``backend/scripts/check_recommended.py recommended_06``.
"""

from __future__ import annotations

from database.seeds.microsoft_interview import _p

DP = "dynamic-programming"


PROBLEMS: list[dict] = [
    _p(
        64, "Minimum Path Sum", "MEDIUM", DP,
        "minPathSum", [("grid", "int[][]")], "int",
        "A grid holds a number in every square. You start on the top left square and walk to the "
        "bottom right square, one step at a time. Each step goes one square to the right or one "
        "square down. Add up the numbers of every square you stand on, including the first and "
        "the last. Return the smallest total any walk can have.\n\n"
        "`grid` has `m` rows and `n` columns. Every number is 0 or more. You may never step left "
        "or up.",
        [
            {"input": "[[1,3,1],[1,5,1],[4,2,1]]", "expected": "7", "hidden": False, "order": 1},
            {"input": "[[1,2,3],[4,5,6]]", "expected": "12", "hidden": False, "order": 2},
            {"input": "[[5]]", "expected": "5", "hidden": True, "order": 3},
            {"input": "[[1,2,3,4]]", "expected": "10", "hidden": True, "order": 4},
            {"input": "[[2,1,3],[1,9,1],[1,1,2]]", "expected": "7", "hidden": True, "order": 5},
        ],
        constraints="1 <= m, n <= 200\n0 <= grid[i][j] <= 200",
        input_format="The grid as a matrix",
        output_format="An integer: the smallest total",
        time="O(m * n)", space="O(n)",
        hints=[
            "Stepping to the cheaper next square each time can lead you into an expensive area "
            "later. You need to look at the whole grid.",
            "You can only arrive at a square from the square above it or from the square on its "
            "left. So its best total depends on only those two.",
            "Best total of a square = its own number + the smaller best total of the square above "
            "and the square on the left. Fill the grid row by row; one row of totals is enough.",
        ],
        solution=r"""
class Solution {
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
    ),
    _p(
        309, "Best Time to Buy and Sell Stock with Cooldown", "MEDIUM", DP,
        "maxProfit", [("prices", "int[]")], "int",
        "`prices` lists the price of one share, one day after another. You may buy and sell as "
        "many times as you like, but you can own at most one share at a time. After you sell, "
        "you must wait one full day (a cooldown) before you can buy again. Return the biggest "
        "total profit you can make.\n\n"
        "You must sell a share before you buy the next one. Buying and never selling earns "
        "nothing, and making no trades at all gives a profit of 0.",
        [
            {"input": "[1,2,3,0,2]", "expected": "3", "hidden": False, "order": 1},
            {"input": "[1]", "expected": "0", "hidden": False, "order": 2},
            {"input": "[2,1]", "expected": "0", "hidden": True, "order": 3},
            {"input": "[1,2,4]", "expected": "3", "hidden": True, "order": 4},
            {"input": "[6,1,3,2,4,7]", "expected": "6", "hidden": True, "order": 5},
            {"input": "[3,5,1,4]", "expected": "3", "hidden": True, "order": 6},
        ],
        constraints="1 <= prices.length <= 5000\n0 <= prices[i] <= 1000",
        input_format="The prices as an array",
        output_format="An integer: the biggest profit",
        time="O(n)", space="O(1)",
        hints=[
            "Without the wait, you would add up every rise in price. The wait after a sale is "
            "what makes that wrong.",
            "At the end of any day you are in one of three situations: you own a share, you sold "
            "today, or you own nothing and are free to buy. Track the best profit for each.",
            "Owning = max(owning yesterday, free yesterday - price). Sold = owning yesterday + "
            "price. Free = max(free yesterday, sold yesterday). Buying only from free is the wait.",
        ],
        solution=r"""
class Solution {
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
    ),
    _p(
        518, "Coin Change II", "MEDIUM", DP,
        "change", [("amount", "int"), ("coins", "int[]")], "int",
        "You have coins of a few different values, and as many of each coin as you want. Count "
        "the different ways to pay exactly `amount`. A way is a group of coins: the order does "
        "not matter, so `1 + 2` and `2 + 1` are the same way.\n\n"
        "The values in `coins` are all different. If `amount` is 0 there is exactly one way: "
        "use no coins. If the amount cannot be paid, return 0. The answer fits in a 32-bit "
        "signed integer.",
        [
            {"input": "5\n[1,2,5]", "expected": "4", "hidden": False, "order": 1},
            {"input": "3\n[2]", "expected": "0", "hidden": False, "order": 2},
            {"input": "10\n[10]", "expected": "1", "hidden": True, "order": 3},
            {"input": "0\n[7]", "expected": "1", "hidden": True, "order": 4},
            {"input": "500\n[3,5,7,8,9,10,11]", "expected": "35502874", "hidden": True, "order": 5},
        ],
        constraints="1 <= coins.length <= 300\n1 <= coins[i] <= 5000\nAll values in coins are different\n0 <= amount <= 5000",
        input_format="Line 1: integer amount\nLine 2: the coins as an array",
        output_format="An integer: the number of ways",
        time="O(amount * coins)", space="O(amount)",
        hints=[
            "Counting every order of coins counts `1 + 2` and `2 + 1` twice. You need each group "
            "of coins once.",
            "Decide the coins one kind at a time. First count the ways that use only the first "
            "coin, then allow the second coin as well, and so on.",
            "Keep `ways[a]`, with `ways[0] = 1`. Put the loop over coins outside and the loop "
            "over amounts inside: `ways[a] += ways[a - coin]`.",
        ],
        solution=r"""
class Solution {
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
    ),
    _p(
        377, "Combination Sum IV", "MEDIUM", DP,
        "combinationSum4", [("nums", "int[]"), ("target", "int")], "int",
        "You have a list of different positive numbers, and you may use each one as often as "
        "you like. Count the lists of numbers, written in order, that add up to `target`. Here "
        "the order matters: `1 + 2` and `2 + 1` are two different lists.\n\n"
        "The values in `nums` are all different. If no list adds up to `target`, return 0. The "
        "answer fits in a 32-bit signed integer.",
        [
            {"input": "[1,2,3]\n4", "expected": "7", "hidden": False, "order": 1},
            {"input": "[9]\n3", "expected": "0", "hidden": False, "order": 2},
            {"input": "[3]\n9", "expected": "1", "hidden": True, "order": 3},
            {"input": "[1,3]\n5", "expected": "4", "hidden": True, "order": 4},
            {"input": "[2,1,3]\n35", "expected": "1132436852", "hidden": True, "order": 5},
        ],
        constraints="1 <= nums.length <= 200\n1 <= nums[i] <= 1000\nAll values in nums are different\n1 <= target <= 1000",
        input_format="Line 1: the numbers as an array\nLine 2: integer target",
        output_format="An integer: the number of ordered lists",
        time="O(target * nums)", space="O(target)",
        hints=[
            "Trying every list one number at a time works, but the same smaller totals get "
            "counted again and again.",
            "Think about the last number of a list. If it is `x`, the rest of the list is any "
            "ordered list that adds up to `target - x`.",
            "Keep `ways[t]`, with `ways[0] = 1`. Put the loop over totals outside and the loop "
            "over numbers inside: `ways[t] += ways[t - x]` for every `x <= t`.",
        ],
        solution=r"""
class Solution {
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
    ),
]
