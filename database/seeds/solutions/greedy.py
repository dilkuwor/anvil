"""Greedy problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-122"],
        "pattern": "Greedy: every uphill step",
        "trigger": "You may buy and sell as many times as you like, but you may hold only one share.",
        "summary": (
            "Add every uphill step. If the price rises from one day to the next, that rise is profit you can take. "
            "A falling day is a skip."
        ),
        "approaches": [
            {
                "name": "Try every trade, then recurse",
                "idea": "Pick a buy day and a later sell day, take that profit, then solve the rest of the days.",
                "steps": [
                    "From a start day, try every later buy index.",
                    "For each buy, try every later sell whose price is higher.",
                    "Add that profit to the best answer on the days after the sell.",
                    "Keep the largest total. Doing nothing is 0.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        return dfs(prices, 0);
    }

    private int dfs(int[] prices, int start) {
        int best = 0;
        for (int buy = start; buy < prices.length; buy++) {
            for (int sell = buy + 1; sell < prices.length; sell++) {
                if (prices[sell] > prices[buy]) {
                    best = Math.max(best, prices[sell] - prices[buy] + dfs(prices, sell + 1));
                }
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n² · 2ⁿ)",
                "time_why": "Each pair of days can start a trade, then the rest of the row is solved again from scratch.",
                "space_complexity": "O(n)",
                "space_why": "The call stack is one frame per trade, at most one per day.",
                "when_to_use": "Say it first, in one sentence, to show you understand many trades. Do not code it.",
                "is_optimal": False,
            },
            {
                "name": "Add every uphill step",
                "idea": "Any climb from day i-1 to day i can be taken as its own tiny trade.",
                "steps": [
                    "Start total at 0.",
                    "Read the prices from day 1 onward.",
                    "If today is higher than yesterday, add the difference to total.",
                    "Return total. A list that only falls stays 0.",
                ],
                "code": """class Solution {
    public int maxProfit(int[] prices) {
        int total = 0;
        for (int i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) {
                total += prices[i] - prices[i - 1];
            }
        }
        return total;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each day is compared with the day before it, once.",
                "space_complexity": "O(1)",
                "space_why": "Only the running total is stored.",
                "when_to_use": "The version to write. One pass, no extra array.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "prices = [7,1,5,3,6,4]",
            "columns": ["day", "price", "vs yesterday", "add", "total"],
            "rows": [
                ["1", "1", "1 vs 7", "no", "0"],
                ["2", "5", "5 vs 1", "+4", "4"],
                ["3", "3", "3 vs 5", "no", "4"],
                ["4", "6", "6 vs 3", "+3", "7"],
                ["5", "4", "4 vs 6", "no", "7"],
            ],
            "result": "The answer is 7, from the climbs 1 to 5 and 3 to 6.",
        },
        "mistakes": [
            {
                "name": "The One Trade Trap",
                "wrong": "Solving it like Best Time I and returning a single best pair.",
                "right": "You may trade many times. Sum every climb, not just the biggest one.",
            },
            {
                "name": "Waiting for a deep valley",
                "wrong": "Holding through a dip so you can sell later at a higher peak.",
                "right": "Sell at the local peak, then buy again after the dip. The two climbs add up to the same profit.",
            },
            {
                "name": "Adding a fall",
                "wrong": "Adding `prices[i] - prices[i-1]` even when it is negative.",
                "right": "Only add a positive difference. Doing nothing on a down day is allowed.",
            },
        ],
        "edge_cases": [
            {"input": "[7,6,4,3,1]", "expected": "0", "why": "Prices only fall: no trade."},
            {"input": "[1,2,3,4,5]", "expected": "4", "why": "A strict climb is one long uphill, sum of the steps."},
            {"input": "[1]", "expected": "0", "why": "One day: the loop never runs."},
            {"input": "[7,1,5,3,6,4]", "expected": "7", "why": "Two separate climbs."},
        ],
        "interview_script": [
            "I may buy and sell as many times as I like, but I hold at most one share.",
            "I could try every buy, then every later sell, then recurse on the rest. That is O(n² · 2ⁿ) and far too slow.",
            "The key point: every uphill step can be taken. I never gain by skipping a rise.",
            "So I add prices[i] - prices[i-1] whenever that is positive.",
            "That is O(n) time and O(1) space. I will test a falling list, a strict climb, and [7,1,5,3,6,4].",
        ],
        "follow_ups": [
            {
                "question": "You may complete at most one trade.",
                "answer": "Track the cheapest so far and the best profit. That is Best Time I.",
            },
            {
                "question": "There is a cooldown of one day after each sell.",
                "answer": "Keep three running values: free, holding, and cooldown. Update them left to right.",
            },
            {
                "question": "Each sale charges a fee.",
                "answer": "Add a climb only when it still beats the fee, or keep a hold/cash pair that subtracts the fee on sell.",
            },
        ],
        "related_slugs": ["lc-121", "single-pass-profit", "lc-53"],
    },
    {
        "slugs": ["lc-134"],
        "pattern": "Greedy circuit",
        "trigger": "Stations on a circle, each with gas and a cost to reach the next, and you start with an empty tank.",
        "summary": (
            "If total gas is less than total cost, it is impossible. "
            "Otherwise the unique start is the station after the last time the tank went negative."
        ),
        "approaches": [
            {
                "name": "Try every starting station",
                "idea": "From each index, drive a full lap and see if the tank stays non-negative.",
                "steps": [
                    "Pick a start index.",
                    "Add gas[at] - cost[at] at each station around the circle.",
                    "If the tank drops below 0, this start fails. Try the next start.",
                    "If a lap finishes, return that start. If every start fails, return -1.",
                ],
                "code": """class Solution {
    public int canCompleteCircuit(int[] gas, int[] cost) {
        int n = gas.length;
        for (int start = 0; start < n; start++) {
            int tank = 0;
            int steps = 0;
            for (; steps < n; steps++) {
                int at = (start + steps) % n;
                tank += gas[at] - cost[at];
                if (tank < 0) break;
            }
            if (steps == n) return start;
        }
        return -1;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each of n starts may drive all n stations.",
                "space_complexity": "O(1)",
                "space_why": "Only the tank and the two loop indices are stored.",
                "when_to_use": "Say it. Do not code it when n is large.",
                "is_optimal": False,
            },
            {
                "name": "Skip a station that runs the tank dry",
                "idea": "A start that fails at station i cannot sit anywhere in that failed stretch. The next try is i + 1.",
                "steps": [
                    "Track total gain, the tank for the current stretch, and a candidate start at 0.",
                    "At station i, add gas[i] - cost[i] to both total and tank.",
                    "If the tank drops below 0, set start to i + 1 and reset tank to 0.",
                    "After the loop, if total is negative return -1, else return start.",
                ],
                "code": """class Solution {
    public int canCompleteCircuit(int[] gas, int[] cost) {
        int total = 0;
        int tank = 0;
        int start = 0;
        for (int i = 0; i < gas.length; i++) {
            int gain = gas[i] - cost[i];
            total += gain;
            tank += gain;
            if (tank < 0) {
                start = i + 1;
                tank = 0;
            }
        }
        return total < 0 ? -1 : start;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each station is visited once.",
                "space_complexity": "O(1)",
                "space_why": "Only total, tank, and start are stored.",
                "when_to_use": "The version to write. One pass, and the problem says the start is unique.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "gas = [1,2,3,4,5], cost = [3,4,5,1,2]",
            "columns": ["i", "gain", "tank", "start", "total"],
            "rows": [
                ["0", "-2", "-2, reset 0", "1", "-2"],
                ["1", "-2", "-2, reset 0", "2", "-4"],
                ["2", "-2", "-2, reset 0", "3", "-6"],
                ["3", "3", "3", "3", "-3"],
                ["4", "3", "6", "3", "0"],
            ],
            "result": "Total is 0, so a circuit exists, and the start is 3.",
        },
        "mistakes": [
            {
                "name": "The Unchecked Start Trap",
                "wrong": "Returning the candidate start even when total gas is less than total cost.",
                "right": "If `total < 0`, return -1. A unique start only exists when the whole circle has enough gas.",
            },
            {
                "name": "Resetting start to i, not i + 1",
                "wrong": "Setting `start = i` when the tank goes negative.",
                "right": "Station i is where this stretch died. The next try begins at `i + 1`.",
            },
            {
                "name": "Requiring a strict surplus at the end",
                "wrong": "Returning -1 when total is 0.",
                "right": "Total 0 is enough: you finish on empty. Only a negative total is impossible.",
            },
        ],
        "edge_cases": [
            {"input": "gas = [2,3,4], cost = [3,4,3]", "expected": "-1", "why": "Total gas is less than total cost."},
            {"input": "gas = [5,1,2,3,4], cost = [4,4,1,5,1]", "expected": "4", "why": "The start wraps around the end of the array."},
            {"input": "gas = [1,2,3,4,5], cost = [3,4,5,1,2]", "expected": "3", "why": "The usual unique start after a dry stretch."},
            {"input": "gas = [5], cost = [4]", "expected": "0", "why": "One station: start there if gas covers the cost."},
        ],
        "interview_script": [
            "I am on a circle of stations. Each gives gas[i] and costs cost[i] to leave.",
            "I could start at each station and simulate a full lap. That is O(n²).",
            "The key point: if the tank dies at i, no start inside that stretch works, so I move start to i + 1.",
            "I also track the total of gas minus cost. If that is negative, I return -1.",
            "One pass, O(n) time and O(1) space. I will test a unique start, a wrap-around start, and a negative total.",
        ],
        "follow_ups": [
            {
                "question": "The answer might not be unique.",
                "answer": "This greedy still finds one valid start. Finding every valid start needs a second pass over prefix tanks.",
            },
            {
                "question": "You may travel either clockwise or counter-clockwise.",
                "answer": "Run the same scan on the reversed arrays as well, then pick a start that works in either direction.",
            },
            {
                "question": "Stations have a limit on how much you may take.",
                "answer": "The one-pass skip no longer holds. You would search each start, or use a deque of prefix gains.",
            },
        ],
        "related_slugs": ["lc-45", "lc-55", "lc-122"],
    },
    {
        "slugs": ["lc-45"],
        "pattern": "Greedy jump range",
        "trigger": "Each index names a jump length, the end is always reachable, and you want the fewest jumps.",
        "summary": (
            "The indices you can reach with k jumps form one range. "
            "Walk that range, remember the farthest landing, and count one jump when the range ends."
        ),
        "approaches": [
            {
                "name": "Fewest jumps in a table",
                "idea": "From each index, try every landing and keep the fewest jumps that reach it.",
                "steps": [
                    "Let dp[i] be the fewest jumps to index i. Start dp[0] at 0 and the rest at a large number.",
                    "At index i, the landing spots are i+1 through i + nums[i].",
                    "Set each landing to min of its old value and dp[i] + 1.",
                    "Return dp at the last index.",
                ],
                "code": """class Solution {
    public int jump(int[] nums) {
        int n = nums.length;
        int[] dp = new int[n];
        for (int i = 1; i < n; i++) dp[i] = n;
        for (int i = 0; i < n; i++) {
            int far = Math.min(n - 1, i + nums[i]);
            for (int j = i + 1; j <= far; j++) {
                dp[j] = Math.min(dp[j], dp[i] + 1);
            }
        }
        return dp[n - 1];
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "From each index you may rewrite every later index.",
                "space_complexity": "O(n)",
                "space_why": "The table holds one value per index.",
                "when_to_use": "Fine to mention. Do not code it when n can be 10^4.",
                "is_optimal": False,
            },
            {
                "name": "One jump per range",
                "idea": "Treat the search like a breadth-first scan without a queue: one range is one jump.",
                "steps": [
                    "Track jumps, the end of the current range, and the farthest index seen so far.",
                    "Walk i from 0 to the second-last index, stretching farthest to i + nums[i].",
                    "When i hits the end of the current range, add one jump and set that end to farthest.",
                    "Stop before the last index so you do not count a jump after you have already arrived.",
                ],
                "code": """class Solution {
    public int jump(int[] nums) {
        int jumps = 0;
        int currentEnd = 0;
        int farthest = 0;
        for (int i = 0; i < nums.length - 1; i++) {
            farthest = Math.max(farthest, i + nums[i]);
            if (i == currentEnd) {
                jumps++;
                currentEnd = farthest;
            }
        }
        return jumps;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each index is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only jumps, currentEnd, and farthest are stored.",
                "when_to_use": "The version to write. The problem promises the end is reachable.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [2,3,1,1,4]",
            "columns": ["i", "i + nums[i]", "farthest", "currentEnd", "jumps"],
            "rows": [
                ["0", "2", "2", "0 to 2", "1"],
                ["1", "4", "4", "2", "1"],
                ["2", "3", "4", "2 to 4", "2"],
                ["3", "4", "4", "4", "2"],
            ],
            "result": "The loop stops before the last index, so the answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Every Index Trap",
                "wrong": "Adding 1 to jumps on every i, not only when i hits currentEnd.",
                "right": "One range is one jump. Count it when you finish the range, then set currentEnd to farthest.",
            },
            {
                "name": "Looping through the last index",
                "wrong": "Running i to nums.length, so a jump is counted after you already sit on the end.",
                "right": "Stop at `nums.length - 1`. An array of length 1 must return 0.",
            },
            {
                "name": "Greedy landing, not greedy range",
                "wrong": "From i, always jumping to the neighbour with the largest nums value.",
                "right": "Pick the landing that can reach the farthest later index, which the range scan already does.",
            },
        ],
        "edge_cases": [
            {"input": "[0]", "expected": "0", "why": "Already there: zero jumps."},
            {"input": "[1,2,3]", "expected": "2", "why": "Must jump twice even though the first jump is only length 1."},
            {"input": "[2,3,1,1,4]", "expected": "2", "why": "The usual two-range case."},
            {"input": "[2,3,0,1,4]", "expected": "2", "why": "A zero in the middle is still covered by an earlier range.",},
        ],
        "interview_script": [
            "I start at index 0 and nums[i] is how far I may jump. I want the fewest jumps to the end.",
            "I could fill a table: from i, try every landing, and keep the fewest jumps. That is O(n²).",
            "The key point: the indices I can reach with k jumps form one range. I count a jump when that range ends.",
            "I walk once, tracking the end of the current jump and the farthest I can see.",
            "That is O(n) time and O(1) space. I will test [0] and the usual [2,3,1,1,4] case.",
        ],
        "follow_ups": [
            {
                "question": "The last index might not be reachable.",
                "answer": "After a jump, if currentEnd does not move, return -1. That is Jump Game I plus a count.",
            },
            {
                "question": "Return one shortest path of indices, not the length.",
                "answer": "When you close a range, also remember which index set farthest, then walk those parents backwards.",
            },
            {
                "question": "Each jump has a cost, not just a count.",
                "answer": "The range greedy no longer works. Fill a table, or run a 0-1 deque if costs are 0 or 1.",
            },
        ],
        "related_slugs": ["lc-55", "lc-134", "lc-763"],
    },
    {
        "slugs": ["lc-55"],
        "pattern": "Greedy farthest reach",
        "trigger": "Each index names a jump length, and you only need to know if the last index is reachable.",
        "summary": (
            "Walk left to right and stretch how far you can reach. "
            "If you ever stand past that reach, you are stuck. If you finish the row, the end is reachable."
        ),
        "approaches": [
            {
                "name": "Mark who can reach the end",
                "idea": "Work backwards. An index is good if it can jump onto a later good index.",
                "steps": [
                    "Let ok[i] mean index i can reach the end. Set the last index to true.",
                    "Walk i from the second-last index down to 0.",
                    "If any landing between i+1 and i + nums[i] is already ok, set ok[i] true.",
                    "Return whether the first index is marked as able to reach the end.",
                ],
                "code": """class Solution {
    public boolean canJump(int[] nums) {
        int n = nums.length;
        boolean[] ok = new boolean[n];
        ok[n - 1] = true;
        for (int i = n - 2; i >= 0; i--) {
            int far = Math.min(n - 1, i + nums[i]);
            for (int j = i + 1; j <= far; j++) {
                if (ok[j]) {
                    ok[i] = true;
                    break;
                }
            }
        }
        return ok[0];
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each index may look at every later index until it finds a good landing.",
                "space_complexity": "O(n)",
                "space_why": "The ok table holds one flag per index.",
                "when_to_use": "Say it. The same idea becomes one number if you only store the farthest reach.",
                "is_optimal": False,
            },
            {
                "name": "Track the farthest reach",
                "idea": "The farthest index you could already reach is the only gate. Past it, you cannot step.",
                "steps": [
                    "Start the farthest reach at 0.",
                    "For each index i, if i is past reach, return false.",
                    "Stretch the reach to max(reach, i + nums[i]).",
                    "If the loop finishes, return true.",
                ],
                "code": """class Solution {
    public boolean canJump(int[] nums) {
        int reach = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > reach) return false;
            reach = Math.max(reach, i + nums[i]);
        }
        return true;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each index is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only reach is stored.",
                "when_to_use": "The version to write. Stop early when a gap appears.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [3,2,1,0,4]",
            "columns": ["i", "nums[i]", "reach", "i > reach", "status"],
            "rows": [
                ["0", "3", "3", "no", "continue"],
                ["1", "2", "3", "no", "continue"],
                ["2", "1", "3", "no", "continue"],
                ["3", "0", "3", "no", "continue"],
                ["4", "4", "3", "yes", "stuck"],
            ],
            "result": "Index 4 sits past reach 3, so the answer is false.",
        },
        "mistakes": [
            {
                "name": "The Unreachable Trap",
                "wrong": "Always doing `reach = max(reach, i + nums[i])`, even when i is past reach.",
                "right": "If `i > reach`, return false first. The last index must not stretch reach for you.",
            },
            {
                "name": "Treating 0 as always fatal",
                "wrong": "Returning false as soon as nums[i] is 0.",
                "right": "A 0 is fine if it is the last index, or if an earlier index already jumps past it.",
            },
            {
                "name": "Requiring an exact landing",
                "wrong": "Only jumping exactly nums[i] steps, never fewer.",
                "right": "nums[i] is a maximum. Any landing from 1 through nums[i] is allowed.",
            },
        ],
        "edge_cases": [
            {"input": "[0]", "expected": "true", "why": "Already at the end."},
            {"input": "[2,0,0]", "expected": "true", "why": "The first jump covers both zeros."},
            {"input": "[3,2,1,0,4]", "expected": "false", "why": "The zero at index 3 is a gap the last 4 must not hide."},
            {"input": "[2,3,1,1,4]", "expected": "true", "why": "The usual reachable case."},
        ],
        "interview_script": [
            "I start at index 0. I want to know if I can reach the last index.",
            "I could mark which indices can reach the end, walking backwards. That is O(n²).",
            "The key point: if I ever stand past the farthest index I could reach, I am stuck.",
            "I walk left to right, stretching reach to i + nums[i], and stop if i is past reach.",
            "That is O(n) time and O(1) space. I will test [0], a zero we can cover, and a gap after a zero.",
        ],
        "follow_ups": [
            {
                "question": "Return the fewest jumps, not just yes or no.",
                "answer": "Count a jump each time you finish the current reach range. That is Jump Game II.",
            },
            {
                "question": "You must jump exactly nums[i], not fewer.",
                "answer": "Then it is a graph walk: from i, only i + nums[i] is a neighbour. BFS or a boolean table.",
            },
            {
                "question": "Jumps may go left as well as right.",
                "answer": "Treat indices as a graph and search. The one-direction reach scan no longer works.",
            },
        ],
        "related_slugs": ["lc-45", "lc-134"],
    },
    {
        "slugs": ["lc-621"],
        "pattern": "Greedy: idle-frame formula",
        "trigger": "Tasks labeled A–Z, and two of the same letter must be at least n slots apart.",
        "summary": (
            "The busiest letter sets a frame of (maxCount - 1) groups of n + 1 slots, plus the letters that tie. "
            "If other tasks fill every gap, the answer is just the number of tasks."
        ),
        "approaches": [
            {
                "name": "Fill each slot",
                "idea": "At every time slot, run the ready task that still has the most copies left. Idle if none is ready.",
                "steps": [
                    "Count each letter. Also store the next time that letter is allowed.",
                    "While tasks remain, scan the 26 letters and pick a ready one with the highest leftover count.",
                    "If you pick one, drop its count by 1 and set it on cooldown for n + 1 slots.",
                    "If none is ready, the slot is idle. Then advance time by 1.",
                ],
                "code": """class Solution {
    public int leastInterval(char[] tasks, int n) {
        int[] count = new int[26];
        for (char task : tasks) count[task - 'A']++;
        int[] ready = new int[26];
        int done = 0;
        int time = 0;
        while (done < tasks.length) {
            int pick = -1;
            int best = 0;
            for (int i = 0; i < 26; i++) {
                if (count[i] > 0 && ready[i] <= time && count[i] > best) {
                    best = count[i];
                    pick = i;
                }
            }
            if (pick != -1) {
                count[pick]--;
                done++;
                ready[pick] = time + n + 1;
            }
            time++;
        }
        return time;
    }
}
""",
                "time_complexity": "O(t)",
                "time_why": "Each slot scans 26 letters, and the number of slots is the answer length t.",
                "space_complexity": "O(1)",
                "space_why": "Two arrays of length 26.",
                "when_to_use": "A correct picture of the schedule. Fine if you are asked to print the slots.",
                "is_optimal": False,
            },
            {
                "name": "Idle-frame formula",
                "idea": "Leave gaps after each copy of the busiest letter, then fill those gaps. Extra tasks spill past the frame.",
                "steps": [
                    "Count each letter and let maxCount be the highest count.",
                    "Count how many letters share that highest count. Call that ties.",
                    "The frame length is (maxCount - 1) * (n + 1) + ties.",
                    "Return the max of that frame and tasks.length.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "One pass over the tasks, then a 26-long pass for ties.",
                "space_complexity": "O(1)",
                "space_why": "A count array of length 26.",
                "when_to_use": "The version to write when you only need the length, not the schedule.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 'tasks = ["A","A","A","B","B","B"], n = 2',
            "columns": ["what", "value", "why"],
            "rows": [
                ["tasks.length", "6", "six tasks in total"],
                ["maxCount", "3", "A and B each appear three times"],
                ["ties", "2", "two letters share that max"],
                ["frame", "8", "(3 - 1) * (2 + 1) + 2"],
                ["answer", "8", "max(6, 8)"],
            ],
            "result": "The answer is 8, which is the frame A B _ A B _ A B.",
        },
        "mistakes": [
            {
                "name": "The Task Count Trap",
                "wrong": "Returning only `(maxCount - 1) * (n + 1) + ties`.",
                "right": "If other letters fill every gap, there is no idle time. Return `max(tasks.length, frame)`.",
            },
            {
                "name": "Cooldown of n, not n + 1",
                "wrong": "Building the frame with groups of size n.",
                "right": "A letter, then n other slots: each group has size n + 1. The last copy has no trailing gap.",
            },
            {
                "name": "Counting only one busiest letter",
                "wrong": "Ending the frame with 1, even when B is as busy as A.",
                "right": "The last row holds every letter that ties for maxCount.",
            },
        ],
        "edge_cases": [
            {"input": 'tasks = ["A","A","A","B","B","B"], n = 2', "expected": "8", "why": "Idle slots are required."},
            {"input": 'tasks = ["A","C","A","B","D","B"], n = 1', "expected": "6", "why": "Other letters fill the gaps, so the answer is the task count."},
            {"input": 'tasks = ["A","A","A","B","B","B"], n = 3', "expected": "10", "why": "A wider cooldown leaves more idle slots."},
            {"input": 'tasks = ["A","A","A"], n = 0', "expected": "3", "why": "n = 0: no gap needed, answer is the length."},
        ],
        "interview_script": [
            "I must run every task, with at least n idle slots between two of the same letter.",
            "I could fill each time slot by picking the ready task with the most left. That is O(n · 26) if I walk every slot.",
            "The key point: I let the busiest letter set a frame of (maxCount - 1) groups of n + 1, plus the letters that tie.",
            "I take the max of that frame and the number of tasks, because extra letters fill the gaps.",
            "That is O(n) time and O(1) space for 26 letters. I will test n = 0 and a case that needs idle slots.",
        ],
        "follow_ups": [
            {
                "question": "Print one valid schedule, not only its length.",
                "answer": "Use the slot-by-slot pick, or fill the frame rows first with the busiest letters, then the rest.",
            },
            {
                "question": "Each letter has its own cooldown.",
                "answer": "The single frame formula breaks. Simulate with a heap of leftover counts and a cooldown queue.",
            },
            {
                "question": "Tasks arrive over time, not all at once.",
                "answer": "Keep the same leftover counts, but only a task whose arrival time is due may be picked.",
            },
        ],
        "related_slugs": ["lc-347", "lc-215", "lc-1046"],
    },
    {
        "slugs": ["lc-763"],
        "pattern": "Greedy: last-seen partition",
        "trigger": "Cut a string into as many parts as you can, and each letter may appear in at most one part.",
        "summary": (
            "A part must reach the last index of every letter it contains. "
            "Record those last indices, walk once, stretch the end, and cut when you land on it."
        ),
        "approaches": [
            {
                "name": "Grow each part by rescan",
                "idea": "From a start, stretch the end to the last copy of every letter inside the current part.",
                "steps": [
                    "Set the start index at 0.",
                    "Set end at start, then for each index i from start through end, scan right for that letter's last copy.",
                    "When i catches end, the part is closed. Store end - start + 1.",
                    "Move start to end + 1 and repeat until the string is used up.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> partitionLabels(String s) {
        List<Integer> out = new ArrayList<>();
        int start = 0;
        int n = s.length();
        while (start < n) {
            int end = start;
            for (int i = start; i <= end; i++) {
                for (int j = n - 1; j > end; j--) {
                    if (s.charAt(j) == s.charAt(i)) {
                        end = j;
                        break;
                    }
                }
            }
            out.add(end - start + 1);
            start = end + 1;
        }
        return out;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each time a part grows, you may scan the rest of the string for a last copy.",
                "space_complexity": "O(1)",
                "space_why": "Besides the output, only start and end are stored.",
                "when_to_use": "Say it. Then precompute last indices so you do not rescan.",
                "is_optimal": False,
            },
            {
                "name": "One pass with last index",
                "idea": "After one count of last positions, stretching end is a single max, not a scan.",
                "steps": [
                    "Fill last[c] with the last index of each letter.",
                    "Walk each index from left to right, stretching the end to the last copy of that letter.",
                    "When i equals end, the part is closed: store end - start + 1.",
                    "Set the start to i + 1 and keep walking.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> partitionLabels(String s) {
        int[] lastIndex = new int[26];
        for (int i = 0; i < s.length(); i++) {
            lastIndex[s.charAt(i) - 'a'] = i;
        }
        List<Integer> out = new ArrayList<>();
        int start = 0;
        int end = 0;
        for (int i = 0; i < s.length(); i++) {
            end = Math.max(end, lastIndex[s.charAt(i) - 'a']);
            if (i == end) {
                out.add(end - start + 1);
                start = i + 1;
            }
        }
        return out;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One pass to record last indices, then one pass to cut.",
                "space_complexity": "O(1)",
                "space_why": "A last-index array of length 26, plus the output list.",
                "when_to_use": "The version to write. Same idea as merging letter-span intervals.",
                "is_optimal": True,
            },
            {
                "name": "Merge the letter spans as intervals",
                "idea": "Each letter covers one span, from its first index to its last. The parts are what is left once every pair of overlapping spans is joined.",
                "steps": [
                    "Record the first and the last index of every letter that appears.",
                    "Turn each of those pairs into a span, then sort the spans by their first index.",
                    "Hold one block. If the next span starts at or before the block ends, stretch the block's end to cover it.",
                    "If the next span starts after the block ends, the block is finished: store its length and open a new block at that span.",
                    "Store the last block as well. The lengths come out in left-to-right order.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<Integer> partitionLabels(String s) {
        int[] firstIndex = new int[26];
        int[] lastIndex = new int[26];
        Arrays.fill(firstIndex, -1);
        for (int i = 0; i < s.length(); i++) {
            int letter = s.charAt(i) - 'a';
            if (firstIndex[letter] == -1) {
                firstIndex[letter] = i;
            }
            lastIndex[letter] = i;
        }
        List<int[]> spans = new ArrayList<>();
        for (int letter = 0; letter < 26; letter++) {
            if (firstIndex[letter] != -1) {
                spans.add(new int[] {firstIndex[letter], lastIndex[letter]});
            }
        }
        List<Integer> out = new ArrayList<>();
        if (spans.isEmpty()) {
            return out;
        }
        spans.sort(Comparator.comparingInt(span -> span[0]));
        int start = spans.get(0)[0];
        int end = spans.get(0)[1];
        for (int i = 1; i < spans.size(); i++) {
            int[] span = spans.get(i);
            if (span[0] <= end) {
                end = Math.max(end, span[1]);
            } else {
                out.add(end - start + 1);
                start = span[0];
                end = span[1];
            }
        }
        out.add(end - start + 1);
        return out;
    }
}
""",
                "time_complexity": "O(n + A log A)",
                "time_why": "One pass records the spans, then at most 26 of them are sorted and joined.",
                "space_complexity": "O(1)",
                "space_why": "Two arrays of length 26 and a list of at most 26 spans, besides the output.",
                "when_to_use": "When the pieces are not letters but labelled spans of any kind: bookings, sessions, jobs. There is no small alphabet to walk then, and joining the spans is the same code as Merge Intervals.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": 's = "ababcc"',
            "columns": ["i", "letter", "last", "end", "cut"],
            "rows": [
                ["0", "a", "2", "2", "no"],
                ["1", "b", "3", "3", "no"],
                ["2", "a", "2", "3", "no"],
                ["3", "b", "3", "3", "yes, size 4"],
                ["4", "c", "5", "5", "no"],
                ["5", "c", "5", "5", "yes, size 2"],
            ],
            "result": "The parts have sizes [4, 2].",
        },
        "mistakes": [
            {
                "name": "The First Sight Trap",
                "wrong": "Closing a part as soon as the next letter has not appeared yet in it.",
                "right": "A letter already inside the part may still appear later. Stretch end to that last index first.",
            },
            {
                "name": "Using first index instead of last",
                "wrong": "Recording where each letter starts, then cutting there.",
                "right": "The part must cover the last copy. Fill `last[c]` on every sight, so the final value is the right edge.",
            },
            {
                "name": "Off-by-one size",
                "wrong": "Storing `end - start` when a part closes.",
                "right": "Both ends are inside the part, so the size is `end - start + 1`.",
            },
        ],
        "edge_cases": [
            {"input": '"abc"', "expected": "[1,1,1]", "why": "Each letter is its own part."},
            {"input": '"eccbbbbdec"', "expected": "[10]", "why": "Every letter reappears, so the whole string is one part."},
            {"input": '"a"', "expected": "[1]", "why": "A single letter."},
            {"input": '"ababcbacadefegdehijhklij"', "expected": "[9,7,8]", "why": "The usual three-part case."},
        ],
        "interview_script": [
            "I must cut the string into as many parts as I can, and each letter may live in only one part.",
            "I could grow a part and, for each letter in it, scan right to find its last copy. That is O(n²).",
            "The key point: a part must reach the last index of every letter it contains, so I stretch end to those last copies.",
            "I record each letter's last index, then walk once, stretching end, and cut when I land on end.",
            "That is O(n) time and O(1) space for 26 letters. I will test all-distinct letters and a one-part string.",
        ],
        "follow_ups": [
            {
                "question": "Return the parts themselves, not their sizes.",
                "answer": "When a part closes, also store `s.substring(start, end + 1)`, then move start.",
            },
            {
                "question": "You may reuse a letter in later parts.",
                "answer": "Then each cut is free. The constraint is what forces a part to stretch to the last copy.",
            },
            {
                "question": "The alphabet is huge, not 26 letters.",
                "answer": "Replace the array with a map of letter to last index. Time stays one pass; space is the alphabet size.",
            },
        ],
        "related_slugs": ["lc-56", "lc-3", "lc-438"],
    },
]
