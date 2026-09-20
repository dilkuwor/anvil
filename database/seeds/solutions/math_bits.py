"""Math and bit problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-136"],
        "pattern": "Bit XOR",
        "trigger": "Every value appears twice except one, and you must use linear time and constant extra space.",
        "summary": (
            "XOR every value into one integer. A pair x XOR x is 0, so duplicates cancel and the single number is left."
        ),
        "approaches": [
            {
                "name": "Count with a map",
                "idea": "Count how many times each value appears, then return the one with count 1.",
                "steps": [
                    "Put every value into a map of value → count.",
                    "Walk the array again.",
                    "Return the first value whose count is 1.",
                ],
                "code": """import java.util.*;

class Solution {
    public int singleNumber(int[] nums) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int value : nums) {
            count.put(value, count.getOrDefault(value, 0) + 1);
        }
        for (int value : nums) {
            if (count.get(value) == 1) return value;
        }
        return 0;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is counted once, then read once more to find the singleton.",
                "space_complexity": "O(n)",
                "space_why": "The map stores one entry per different value.",
                "when_to_use": "Correct, but it uses extra memory. They asked for O(1) space, so keep going.",
                "is_optimal": False,
            },
            {
                "name": "Sort, then walk in pairs",
                "idea": "After sorting, duplicates sit next to each other. The unpaired value is the answer.",
                "steps": [
                    "Sort the array.",
                    "Walk indices 0, 2, 4, … and compare each value with the next one.",
                    "On a mismatch, return the left value of that pair.",
                    "If every pair matches, the singleton is the last value.",
                ],
                "code": """import java.util.*;

class Solution {
    public int singleNumber(int[] nums) {
        Arrays.sort(nums);
        for (int i = 0; i + 1 < nums.length; i += 2) {
            if (nums[i] != nums[i + 1]) return nums[i];
        }
        return nums[nums.length - 1];
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting dominates. The pair walk is one pass.",
                "space_complexity": "O(1)",
                "space_why": "The sort is in place. Only the walk index is extra.",
                "when_to_use": "Works, but they asked for linear time. Mention it, then XOR.",
                "is_optimal": False,
            },
            {
                "name": "XOR every value",
                "idea": "x XOR x is 0 and 0 XOR y is y, so every pair vanishes and the single number remains.",
                "steps": [
                    "Start a running xor at 0.",
                    "XOR each value into it.",
                    "Return the running xor.",
                ],
                "code": """class Solution {
    public int singleNumber(int[] nums) {
        int result = 0;
        for (int value : nums) result ^= value;
        return result;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is mixed in once.",
                "space_complexity": "O(1)",
                "space_why": "Only the running xor is stored.",
                "when_to_use": "The version to write. Linear time, no extra array.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [2,2,1]",
            "columns": ["value", "xor so far", "why"],
            "rows": [
                ["2", "0 ^ 2 = 2", "first value"],
                ["2", "2 ^ 2 = 0", "the pair cancels"],
                ["1", "0 ^ 1 = 1", "the single number"],
            ],
            "result": "The answer is 1.",
        },
        "mistakes": [
            {
                "name": "Using OR or AND",
                "wrong": "Mixing values with `|` or `&`, which does not cancel a pair.",
                "right": "XOR is the operation that sends x ^ x to 0 and leaves the singleton.",
            },
            {
                "name": "Stepping by one after a sort",
                "wrong": "Comparing nums[i] with nums[i+1] and then i++.",
                "right": "After a matching pair, skip both: i += 2. Otherwise you compare the second of a pair with the next pair.",
            },
            {
                "name": "A set of seen values",
                "wrong": "Inserting into a set and removing on the second sighting.",
                "right": "That still uses extra memory. XOR uses none.",
            },
        ],
        "edge_cases": [
            {"input": "[1]", "expected": "1", "why": "A single element is already the answer."},
            {"input": "[2,2,1]", "expected": "1", "why": "The singleton is last."},
            {"input": "[4,1,2,1,2]", "expected": "4", "why": "The singleton is first."},
            {"input": "[-3,5,5]", "expected": "-3", "why": "XOR works on negatives too."},
        ],
        "interview_script": [
            "I need the value that appears once, while every other value appears twice.",
            "I could count with a map. That is O(n) time and O(n) space.",
            "The key point: a pair x XOR x is 0, and 0 XOR y is y, so I know pairs vanish.",
            "I XOR every value into one integer. The single number is left.",
            "That is O(n) time and O(1) space. I will test a single element and a negative.",
        ],
        "follow_ups": [
            {
                "question": "Every other value appears three times.",
                "answer": "XOR no longer works. Count each bit modulo 3, or use a map.",
            },
            {
                "question": "Two values appear once, the rest twice.",
                "answer": "XOR everything. The result is a ^ b. Split the array on a bit where a and b differ, then XOR each group.",
            },
            {
                "question": "You may use extra memory.",
                "answer": "A set: add on first sight, remove on second. The last remaining value is the answer.",
            },
        ],
        "related_slugs": ["lc-268", "lc-191", "lc-169"],
    },
    {
        "slugs": ["lc-191"],
        "pattern": "Bit counting",
        "trigger": "Return how many bits are set to 1 (the Hamming weight).",
        "summary": (
            "n & (n - 1) drops the lowest 1-bit. Count how many times you can do that before n becomes 0."
        ),
        "approaches": [
            {
                "name": "Read all 32 bits",
                "idea": "Look at the lowest bit, then shift, 32 times.",
                "steps": [
                    "Repeat 32 times, once per bit of an int.",
                    "Add n & 1 to the count.",
                    "Shift n right with `>>>` so the sign bit does not stick.",
                ],
                "code": """class Solution {
    public int hammingWeight(int n) {
        int count = 0;
        for (int i = 0; i < 32; i++) {
            count += n & 1;
            n >>>= 1;
        }
        return count;
    }
}
""",
                "time_complexity": "O(1)",
                "time_why": "The loop always reads 32 bits, whether they are 0 or 1.",
                "space_complexity": "O(1)",
                "space_why": "Only the count and the loop index.",
                "when_to_use": "Fine and easy to write. Mention you always pay for the zeros too.",
                "is_optimal": False,
            },
            {
                "name": "Drop the lowest 1 each time",
                "idea": "n & (n - 1) clears the lowest set bit, so the loop runs once per 1, not once per bit.",
                "steps": [
                    "While n is not 0, the number still has a 1 somewhere.",
                    "Replace n with n & (n - 1). That 1 is gone.",
                    "Add 1 to the count.",
                    "When n is 0, return the count.",
                ],
                "code": """class Solution {
    public int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;
            count++;
        }
        return count;
    }
}
""",
                "time_complexity": "O(k)",
                "time_why": "Each step clears one 1-bit. k is how many ones n has (at most 32).",
                "space_complexity": "O(1)",
                "space_why": "Only the count.",
                "when_to_use": "The version to write. Zeros are skipped.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "n = 11 (binary 1011)",
            "columns": ["n", "n - 1", "n & (n - 1)", "count"],
            "rows": [
                ["1011 (11)", "1010 (10)", "1010 (10)", "1"],
                ["1010 (10)", "1001 (9)", "1000 (8)", "2"],
                ["1000 (8)", "0111 (7)", "0000 (0)", "3"],
            ],
            "result": "The answer is 3.",
        },
        "mistakes": [
            {
                "name": "Arithmetic shift",
                "wrong": "Using `n >>= 1`. On a negative n the sign bit stays 1 and the loop never ends.",
                "right": "Use `n >>>= 1`, or avoid shifting and drop bits with n & (n - 1).",
            },
            {
                "name": "Stopping at n > 0",
                "wrong": "Writing `while (n > 0)` and then shifting.",
                "right": "If n can be negative, that loop never runs. Use `n != 0` with n & (n - 1).",
            },
            {
                "name": "Counting zeros",
                "wrong": "Adding 1 on every shift, including bits that are 0.",
                "right": "Add only when n & 1 is 1, or only when you drop a 1.",
            },
        ],
        "edge_cases": [
            {"input": "0", "expected": "0", "why": "No bits set. The loop must not run."},
            {"input": "11", "expected": "3", "why": "1011 has three ones."},
            {"input": "128", "expected": "1", "why": "A single high bit."},
            {"input": "2147483645", "expected": "30", "why": "Many ones. The 32-bit loop still finishes."},
        ],
        "interview_script": [
            "I need the number of 1 bits in n.",
            "I can read all 32 bits one by one. That is O(1) for a 32-bit int.",
            "The key point: n & (n - 1) drops the lowest 1, so I skip the zeros.",
            "I repeat that until n is 0 and count the drops.",
            "That is O(k) time and O(1) space. I will test 0, a power of two, and a number with many ones.",
        ],
        "follow_ups": [
            {
                "question": "Hamming distance of two integers.",
                "answer": "XOR them, then count the 1 bits of the result. Ones sit where they differ.",
            },
            {
                "question": "The input is 64-bit.",
                "answer": "The same drop-lowest-1 loop. k is at most 64.",
            },
            {
                "question": "Reverse the bits instead of counting them.",
                "answer": "Build a new int: 32 times, shift the answer left and add n & 1, then unsigned-shift n.",
            },
        ],
        "related_slugs": ["lc-338", "lc-136", "lc-268"],
    },
    {
        "slugs": ["lc-268"],
        "pattern": "Bit XOR",
        "trigger": "n distinct numbers taken from 0..n, and exactly one value in that range is missing.",
        "summary": (
            "XOR every index with every value, and also XOR n. Pairs cancel. The missing number is left."
        ),
        "approaches": [
            {
                "name": "Sort, then find the gap",
                "idea": "After sorting, the missing number is the first index i where nums[i] is not i.",
                "steps": [
                    "Sort the array.",
                    "Walk i from 0 to n-1. If `nums[i] != i`, return i.",
                    "If every index matches, n is missing.",
                ],
                "code": """import java.util.*;

class Solution {
    public int missingNumber(int[] nums) {
        Arrays.sort(nums);
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] != i) return i;
        }
        return nums.length;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting dominates. The scan is one pass.",
                "space_complexity": "O(1)",
                "space_why": "The sort is in place.",
                "when_to_use": "Correct. They will want linear time next.",
                "is_optimal": False,
            },
            {
                "name": "Sum 0 through n, subtract",
                "idea": "The missing value is n(n+1)/2 minus the sum of the array.",
                "steps": [
                    "Let n be the length.",
                    "Compute n * (n + 1) / 2 as a long, so the product does not overflow.",
                    "Subtract each nums[i].",
                    "The remainder is the missing number.",
                ],
                "code": """class Solution {
    public int missingNumber(int[] nums) {
        int n = nums.length;
        long sum = (long) n * (n + 1) / 2;
        for (int value : nums) sum -= value;
        return (int) sum;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is subtracted once.",
                "space_complexity": "O(1)",
                "space_why": "Only the running sum is stored.",
                "when_to_use": "Fine if n is small. Mention overflow if n is large, then XOR.",
                "is_optimal": False,
            },
            {
                "name": "XOR indices and values",
                "idea": "x XOR x is 0, so every present number cancels its index, and n is left with the missing one.",
                "steps": [
                    "Start the xor at n, so n is in the mix.",
                    "For each i, xor in both i and nums[i].",
                    "Return the xor.",
                ],
                "code": """class Solution {
    public int missingNumber(int[] nums) {
        int result = nums.length;
        for (int i = 0; i < nums.length; i++) result ^= i ^ nums[i];
        return result;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each index and each value is mixed in once.",
                "space_complexity": "O(1)",
                "space_why": "Only the running xor is stored.",
                "when_to_use": "The version to write. No overflow, no extra set.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [3,0,1]",
            "columns": ["i", "nums[i]", "xor after i ^ nums[i]"],
            "rows": [
                ["start", "-", "3 (n)"],
                ["0", "3", "3 ^ 0 ^ 3 = 0"],
                ["1", "0", "0 ^ 1 ^ 0 = 1"],
                ["2", "1", "1 ^ 2 ^ 1 = 2"],
            ],
            "result": "The answer is 2.",
        },
        "mistakes": [
            {
                "name": "Forgetting to xor n",
                "wrong": "Only xoring indices 0..n-1 with the values, so n itself can never appear.",
                "right": "Start at n, or xor n at the end. The range is 0..n, one past the last index.",
            },
            {
                "name": "Integer overflow on the sum",
                "wrong": "Using int for n*(n+1)/2 when n is large.",
                "right": "Use long, or skip the sum and XOR.",
            },
            {
                "name": "A set of seen values",
                "wrong": "Putting every value in a HashSet, then probing 0..n.",
                "right": "That is extra O(n) space. XOR uses none.",
            },
        ],
        "edge_cases": [
            {"input": "[3,0,1]", "expected": "2", "why": "A hole in the middle."},
            {"input": "[0,1]", "expected": "2", "why": "n is missing."},
            {"input": "[0]", "expected": "1", "why": "n is missing, n = 1."},
            {"input": "[1]", "expected": "0", "why": "0 is missing."},
        ],
        "interview_script": [
            "I have n distinct numbers from 0..n and I need the missing one.",
            "I could sort and look for a gap. That is O(n log n).",
            "I could sum 0..n and subtract, but I have to watch overflow.",
            "I XOR every index with every value, and also XOR n, so pairs cancel.",
            "That is O(n) time and O(1) space. I will test missing 0, missing n, and a hole in the middle.",
        ],
        "follow_ups": [
            {
                "question": "Two numbers are missing.",
                "answer": "XOR still finds the xor of the two missing values. Then split on a set bit, or use sum and sum-of-squares.",
            },
            {
                "question": "The range is 1..n with one missing.",
                "answer": "Same idea: xor 1..n with the values. Do not xor 0.",
            },
            {
                "question": "Values may repeat.",
                "answer": "This method needs distinct values. Use a set, or the index-swap method from First Missing Positive.",
            },
        ],
        "related_slugs": ["lc-136", "missing-range-value", "lc-41"],
    },
    {
        "slugs": ["lc-338"],
        "pattern": "Bit dynamic programming",
        "trigger": "An array of length n+1 where ans[i] is the number of 1 bits in i.",
        "summary": (
            "Each i has one more 1-bit than i with its lowest 1 removed. Fill ans[i] from ans[i & (i - 1)] in one pass."
        ),
        "approaches": [
            {
                "name": "Count each number on its own",
                "idea": "For every i from 0 to n, drop 1-bits until i is 0 and store the count.",
                "steps": [
                    "Allocate the answer array of length n+1.",
                    "For each i, copy it to x and count how many times x & (x - 1) can run.",
                    "Store that count at ans[i].",
                ],
                "code": """class Solution {
    public int[] countBits(int n) {
        int[] ans = new int[n + 1];
        for (int i = 0; i <= n; i++) {
            int x = i;
            int count = 0;
            while (x != 0) {
                x &= x - 1;
                count++;
            }
            ans[i] = count;
        }
        return ans;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Each i is counted from scratch. A number i has at most log i ones.",
                "space_complexity": "O(n)",
                "space_why": "The answer array has n+1 slots.",
                "when_to_use": "Correct. They will ask you to reuse earlier counts.",
                "is_optimal": False,
            },
            {
                "name": "Reuse the count after dropping a 1",
                "idea": "i & (i - 1) is i with its lowest 1 gone, and that value is smaller, so its count is already in ans.",
                "steps": [
                    "Allocate the answer array of length n+1. The slot at 0 stays 0.",
                    "For each i from 1 to n, set ans[i] to the count of i with its lowest 1 dropped, plus one.",
                    "Return the filled array.",
                ],
                "code": """class Solution {
    public int[] countBits(int n) {
        int[] ans = new int[n + 1];
        for (int i = 1; i <= n; i++) ans[i] = ans[i & (i - 1)] + 1;
        return ans;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each i does a constant amount of work, using a count already stored.",
                "space_complexity": "O(n)",
                "space_why": "The answer array has n+1 slots. No extra table.",
                "when_to_use": "The version to write. One pass, and each i uses a smaller i you already filled.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "n = 5",
            "columns": ["i", "binary", "i & (i-1)", "ans[i]"],
            "rows": [
                ["0", "0", "-", "0"],
                ["1", "1", "0", "0 + 1 = 1"],
                ["2", "10", "0", "0 + 1 = 1"],
                ["3", "11", "2", "1 + 1 = 2"],
                ["4", "100", "0", "0 + 1 = 1"],
                ["5", "101", "4", "1 + 1 = 2"],
            ],
            "result": "The answer is [0,1,1,2,1,2].",
        },
        "mistakes": [
            {
                "name": "Array of length n",
                "wrong": "Allocating `new int[n]`, so index n is missing.",
                "right": "`new int[n + 1]`. You need a slot for every i from 0 through n.",
            },
            {
                "name": "Starting the fill at 0",
                "wrong": "Computing i & (i - 1) when i is 0. That is (-1) and it is not a valid index.",
                "right": "Leave ans[0] as 0. Start the loop at 1.",
            },
            {
                "name": "Forgetting the + 1",
                "wrong": "Setting ans[i] = ans[i & (i - 1)], which copies a smaller count and never adds the dropped bit.",
                "right": "That dropped bit is the extra 1. Add 1.",
            },
        ],
        "edge_cases": [
            {"input": "0", "expected": "[0]", "why": "Only i = 0. The fill loop never runs."},
            {"input": "2", "expected": "[0,1,1]", "why": "A small prefix of the table."},
            {"input": "5", "expected": "[0,1,1,2,1,2]", "why": "Shows both even and odd i."},
            {"input": "1", "expected": "[0,1]", "why": "n = 1: only zero and one."},
        ],
        "interview_script": [
            "I need an array where index i holds how many 1 bits i has, from 0 through n.",
            "I could count the bits of each i on its own. That is O(n log n) and repeats work I have already done.",
            "The key point: i & (i - 1) is i with its lowest 1 removed, so I already know that count.",
            "I fill ans[i] = ans[i & (i - 1)] + 1 in one pass.",
            "That is O(n) time and O(n) space for the answer. I will test n = 0 and n = 5.",
        ],
        "follow_ups": [
            {
                "question": "Only the count for n, not the whole table.",
                "answer": "Drop 1-bits of n until it is 0. That is Number of 1 Bits, O(k) time and O(1) space.",
            },
            {
                "question": "Fill from the high half instead.",
                "answer": "ans[i] = ans[i >> 1] + (i & 1) also works. i >> 1 is i without its last bit.",
            },
            {
                "question": "Count 0-bits instead of 1-bits.",
                "answer": "For a 32-bit int, zeros = 32 - ones. For 0..n with no fixed width, you must pick a width first.",
            },
        ],
        "related_slugs": ["lc-191", "lc-136", "lc-50"],
    },
    {
        "slugs": ["lc-43"],
        "pattern": "Digit array multiplication",
        "trigger": "Multiply two non-negative integers given as strings, without a big-integer type.",
        "summary": (
            "Multiply digit by digit into an array of length m+n. The product of positions i and j lands at i+j and i+j+1, then drop leading zeros."
        ),
        "approaches": [
            {
                "name": "Partial products as strings",
                "idea": "For each digit of num2, multiply num1 into a string, pad with zeros, and add those rows.",
                "steps": [
                    "If either input is 0, return 0.",
                    "For each digit of num2, multiply num1 by that digit, then append zeros for its place.",
                    "Add that row onto a running string total, digit by digit from the right.",
                    "Return the total.",
                ],
                "code": """class Solution {
    public String multiply(String num1, String num2) {
        if (num1.equals("0") || num2.equals("0")) return "0";
        String result = "0";
        for (int j = num2.length() - 1; j >= 0; j--) {
            int d = num2.charAt(j) - '0';
            StringBuilder row = new StringBuilder();
            for (int z = 0; z < num2.length() - 1 - j; z++) row.append('0');
            int carry = 0;
            for (int i = num1.length() - 1; i >= 0; i--) {
                int prod = (num1.charAt(i) - '0') * d + carry;
                row.append(prod % 10);
                carry = prod / 10;
            }
            if (carry > 0) row.append(carry);
            result = addStrings(result, row.reverse().toString());
        }
        return result;
    }

    private String addStrings(String a, String b) {
        StringBuilder sb = new StringBuilder();
        int i = a.length() - 1, j = b.length() - 1, carry = 0;
        while (i >= 0 || j >= 0 || carry > 0) {
            int x = i >= 0 ? a.charAt(i--) - '0' : 0;
            int y = j >= 0 ? b.charAt(j--) - '0' : 0;
            int s = x + y + carry;
            sb.append(s % 10);
            carry = s / 10;
        }
        return sb.reverse().toString();
    }
}
""",
                "time_complexity": "O(n (m + n))",
                "time_why": "Each of n digits of num2 builds a row and adds it onto a total that can grow to m+n digits.",
                "space_complexity": "O(m + n)",
                "space_why": "Each partial product and the running total are strings of at most m+n digits.",
                "when_to_use": "Shows you can add and multiply digits by hand. A lot of string work. Keep going.",
                "is_optimal": False,
            },
            {
                "name": "One digit array",
                "idea": "The product of num1[i] and num2[j] belongs at index i+j+1, with the carry sitting at i+j.",
                "steps": [
                    "Allocate an int array of length m+n, all zeros.",
                    "Walk i and j from the right. Add the product onto digits[i+j+1].",
                    "Write the ones digit there, and add the tens into digits[i+j].",
                    "Skip leading zeros and build the string. If every digit is 0, return 0.",
                ],
                "code": """class Solution {
    public String multiply(String num1, String num2) {
        int m = num1.length();
        int n = num2.length();
        int[] digits = new int[m + n];
        for (int i = m - 1; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                int product = (num1.charAt(i) - '0') * (num2.charAt(j) - '0');
                int low = i + j + 1;
                int total = product + digits[low];
                digits[low] = total % 10;
                digits[i + j] += total / 10;
            }
        }
        StringBuilder sb = new StringBuilder();
        for (int digit : digits) {
            if (sb.length() > 0 || digit != 0) sb.append(digit);
        }
        return sb.length() == 0 ? "0" : sb.toString();
    }
}
""",
                "time_complexity": "O(mn)",
                "time_why": "Each pair of digits is multiplied once.",
                "space_complexity": "O(m + n)",
                "space_why": "The digit array has one slot per output place.",
                "when_to_use": "The version to write. One array, no extra string rows.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 'num1 = "12", num2 = "34"',
            "columns": ["i", "j", "product", "low i+j+1", "digits after"],
            "rows": [
                ["1 (2)", "1 (4)", "8", "3", "[0,0,0,8]"],
                ["1 (2)", "0 (3)", "6", "2", "[0,0,6,8]"],
                ["0 (1)", "1 (4)", "4", "2", "[0,1,0,8]"],
                ["0 (1)", "0 (3)", "3", "1", "[0,4,0,8]"],
            ],
            "result": "Skip the leading 0. The answer is 408.",
        },
        "mistakes": [
            {
                "name": "Wrong place for the ones digit",
                "wrong": "Writing the product of i and j into digits[i+j].",
                "right": "The ones place is digits[i+j+1]. The carry goes to digits[i+j].",
            },
            {
                "name": "Keeping leading zeros",
                "wrong": "Returning \"0408\" or an empty string when every digit is 0.",
                "right": "Skip zeros until the first non-zero. If none remain, return \"0\".",
            },
            {
                "name": "Parsing as a long",
                "wrong": "Long.parseLong on each string, then multiplying.",
                "right": "That fails once the product is bigger than 64 bits. Stay in digits.",
            },
        ],
        "edge_cases": [
            {"input": '"2"\n"3"', "expected": '"6"', "why": "Single digits."},
            {"input": '"0"\n"52"', "expected": '"0"', "why": "A zero factor. The result is 0, not 000."},
            {"input": '"123"\n"456"', "expected": '"56088"', "why": "Carries across several places."},
            {"input": '"999"\n"999"', "expected": '"998001"', "why": "Heavy carry into the high slots."},
        ],
        "interview_script": [
            "I need the product of two numbers given as strings, without a big-integer type.",
            "I could build each partial product as a string and add them. That is O(m n) and I shuffle a lot of characters.",
            "The key point: the product of num1[i] and num2[j] lands at i+j and i+j+1, so I keep a digit array of length m+n.",
            "I fill that array from the right, carrying tens into the slot to the left, then skip leading zeros.",
            "That is O(m n) time and O(m+n) space. I will test a zero, 999 times 999, and a case with a carry.",
        ],
        "follow_ups": [
            {
                "question": "Add two numbers given as strings.",
                "answer": "One pass from the right with a carry, like addStrings. No product array.",
            },
            {
                "question": "The numbers can have a leading minus.",
                "answer": "Track the sign separately, multiply the absolute values, then prefix '-' if the signs differ and the product is not 0.",
            },
            {
                "question": "Return the product modulo 10^k.",
                "answer": "Keep only the last k slots of the digit array. Same nested loops.",
            },
        ],
        "related_slugs": ["lc-2", "lc-8", "lc-273"],
    },
    {
        "slugs": ["lc-50"],
        "pattern": "Fast exponentiation",
        "trigger": "Implement myPow(x, n): raise x to the integer power n.",
        "summary": (
            "Square the base and halve the exponent. On an odd exponent, multiply the current base into the result. Use a long so n = Integer.MIN_VALUE does not overflow."
        ),
        "approaches": [
            {
                "name": "Multiply x, |n| times",
                "idea": "If n is negative, invert x and use -n. Then multiply the result by x, once per remaining step.",
                "steps": [
                    "Copy n into a long. If it is negative, set x to 1/x and negate the long.",
                    "Start the result at 1.",
                    "Multiply the result by x, once for each remaining unit of the exponent.",
                    "Using a long means n = Integer.MIN_VALUE does not overflow when negated.",
                ],
                "code": """class Solution {
    public double myPow(double x, int n) {
        long exp = n;
        if (exp < 0) {
            x = 1 / x;
            exp = -exp;
        }
        double result = 1;
        for (long i = 0; i < exp; i++) result *= x;
        return result;
    }
}
""",
                "time_complexity": "O(|n|)",
                "time_why": "One multiply per unit of the exponent.",
                "space_complexity": "O(1)",
                "space_why": "Only the running product.",
                "when_to_use": "Say it first. Too slow when |n| is in the billions. Do not code it under time pressure.",
                "is_optimal": False,
            },
            {
                "name": "Halve the exponent with recursion",
                "idea": "x^n is (x*x)^(n/2), and if n is odd you multiply in one extra x.",
                "steps": [
                    "Copy n into a long and invert x when the exponent is negative.",
                    "If the exponent is 0, return 1.",
                    "If the exponent is odd, return x times the call on x*x with half the exponent.",
                    "If the exponent is even, return the call on x*x with half the exponent.",
                ],
                "code": """class Solution {
    public double myPow(double x, int n) {
        long exp = n;
        if (exp < 0) {
            x = 1 / x;
            exp = -exp;
        }
        return pow(x, exp);
    }

    private double pow(double x, long exp) {
        if (exp == 0) return 1.0;
        if ((exp & 1) == 1) return x * pow(x * x, exp / 2);
        return pow(x * x, exp / 2);
    }
}
""",
                "time_complexity": "O(log |n|)",
                "time_why": "Each call halves the exponent, so there are log |n| calls.",
                "space_complexity": "O(log |n|)",
                "space_why": "Each call waits on one smaller exponent, so the stack holds log |n| frames.",
                "when_to_use": "A clear way to explain the split. Count the stack as extra space.",
                "is_optimal": False,
            },
            {
                "name": "Halve the exponent in a loop",
                "idea": "The same square-and-halve idea, with the extra x multiplied into the result on odd steps.",
                "steps": [
                    "Copy n into a long and invert x when the exponent is negative.",
                    "Start the result at 1.",
                    "While the exponent is positive: if it is odd, multiply the result by x.",
                    "Square x and shift the exponent right by one. Repeat until it is 0.",
                ],
                "code": """class Solution {
    public double myPow(double x, int n) {
        long exponent = n;
        if (exponent < 0) {
            x = 1 / x;
            exponent = -exponent;
        }
        double result = 1;
        while (exponent > 0) {
            if ((exponent & 1) == 1) result *= x;
            x *= x;
            exponent >>= 1;
        }
        return result;
    }
}
""",
                "time_complexity": "O(log |n|)",
                "time_why": "The exponent is halved every step, so the loop runs log |n| times.",
                "space_complexity": "O(1)",
                "space_why": "Only the running product and the current base. No call stack.",
                "when_to_use": "The version to write. Same time as the recursive split, with no stack.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "x = 2, n = 10",
            "columns": ["exponent", "odd?", "result", "x after square"],
            "rows": [
                ["10", "no", "1", "2 → 4"],
                ["5", "yes", "1 × 4 = 4", "4 → 16"],
                ["2", "no", "4", "16 → 256"],
                ["1", "yes", "4 × 256 = 1024", "256 → 65536"],
            ],
            "result": "The answer is 1024.",
        },
        "mistakes": [
            {
                "name": "Negating Integer.MIN_VALUE as an int",
                "wrong": "Writing `n = -n` when n is -2147483648. That value has no positive int partner, so n stays negative.",
                "right": "Copy n into a long first, then negate the long.",
            },
            {
                "name": "Ignoring a negative exponent",
                "wrong": "Looping n times when n is negative, so the loop never runs and you return 1.",
                "right": "Invert x and use the absolute value of n.",
            },
            {
                "name": "Forgetting the stack",
                "wrong": "Calling the recursive split O(1) space.",
                "right": "Each call waits on a smaller exponent. That is O(log |n|) frames. Loop if they want O(1) space.",
            },
        ],
        "edge_cases": [
            {"input": "2.00000\n10", "expected": "1024", "why": "A positive even exponent."},
            {"input": "2.10000\n3", "expected": "9.261", "why": "An odd exponent and a non-integer base."},
            {"input": "2.00000\n-2", "expected": "0.25", "why": "A negative exponent inverts x first."},
            {"input": "1.00000\n-2147483648", "expected": "1", "why": "n is Integer.MIN_VALUE. Negating it as an int overflows."},
        ],
        "interview_script": [
            "I need x raised to the integer power n, including a negative n.",
            "I could multiply x, |n| times. That is O(|n|), and I must use a long so Integer.MIN_VALUE does not overflow.",
            "The key point: x^n is (x*x)^(n/2), and if n is odd I multiply in one extra x.",
            "I square x and halve the exponent in a loop. Recursion would use O(log |n|) stack, so I keep the work in the loop.",
            "That is O(log |n|) time and O(1) space. I will test a negative exponent and n = Integer.MIN_VALUE.",
        ],
        "follow_ups": [
            {
                "question": "x is 0 and n is negative.",
                "answer": "That is 1/0. Confirm with the interviewer. Often you return Infinity or treat it as invalid.",
            },
            {
                "question": "Return x^n modulo a prime.",
                "answer": "The same square-and-halve loop, multiplying modulo p. Still O(log |n|).",
            },
            {
                "question": "n fits in 64 bits, not 32.",
                "answer": "Take n as a long from the start. The same loop. There is no Integer.MIN_VALUE trap if you never narrow it.",
            },
        ],
        "related_slugs": ["lc-338", "lc-191", "lc-43"],
    },
    {
        "slugs": ["mirror-number"],
        "pattern": "Reverse half the digits",
        "trigger": "Is this integer a mirror: the same forwards and backwards. Negatives are not.",
        "summary": (
            "Negatives and numbers that end in 0 (except 0) are not mirrors. Reverse only the second half of the digits and compare it with the first half."
        ),
        "approaches": [
            {
                "name": "Convert to a string",
                "idea": "Write the digits, then compare from both ends.",
                "steps": [
                    "If the number is negative, return false.",
                    "Convert x to a string.",
                    "Walk inward from both ends. If a pair differs, return false.",
                    "If every pair matches, return true.",
                ],
                "code": """class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0) return false;
        String s = String.valueOf(x);
        int i = 0, j = s.length() - 1;
        while (i < j) {
            if (s.charAt(i++) != s.charAt(j--)) return false;
        }
        return true;
    }
}
""",
                "time_complexity": "O(d)",
                "time_why": "d is the number of digits. Each digit is written once and compared at most once.",
                "space_complexity": "O(d)",
                "space_why": "The string holds every digit.",
                "when_to_use": "Correct. The prompt asks you not to convert the whole number if you can avoid it.",
                "is_optimal": False,
            },
            {
                "name": "Reverse only the second half",
                "idea": "Peel digits from the right onto a reversed half until it is at least as long as what remains of x.",
                "steps": [
                    "If the number is negative, or the number ends in 0 and is not 0, return false.",
                    "While x is greater than rev, append x % 10 onto rev and drop that digit from x.",
                    "Even length: x == rev. Odd length: the middle digit sits on rev, so compare x with rev / 10.",
                ],
                "code": """class Solution {
    public boolean isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;
        int rev = 0;
        while (x > rev) {
            rev = rev * 10 + x % 10;
            x /= 10;
        }
        return x == rev || x == rev / 10;
    }
}
""",
                "time_complexity": "O(d)",
                "time_why": "You peel about half the digits. d is the number of digits.",
                "space_complexity": "O(1)",
                "space_why": "Only x and rev. No string of digits.",
                "when_to_use": "The version to write. Constant extra space, and the trailing-zero check is free.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "x = 12321",
            "columns": ["x", "rev", "action"],
            "rows": [
                ["12321", "0", "start"],
                ["1232", "1", "take 1"],
                ["123", "12", "take 2"],
                ["12", "123", "take 3, now x <= rev"],
                ["12", "123", "odd length: 12 == 123 / 10"],
            ],
            "result": "The halves match, so the answer is true.",
        },
        "mistakes": [
            {
                "name": "Keeping a trailing zero",
                "wrong": "Reversing 10 into 01, which becomes 1, then comparing 1 with 10 and missing the fail.",
                "right": "If x ends in 0 and x is not 0, return false at the start. The reverse would drop that zero.",
            },
            {
                "name": "Reversing the whole int",
                "wrong": "Building the reverse of every digit in an int. A large palindrome can overflow.",
                "right": "Stop at half. The reverse of half the digits always fits.",
            },
            {
                "name": "Odd length",
                "wrong": "Requiring x == rev when the original had an odd number of digits.",
                "right": "The middle digit sits on rev. Compare x with rev / 10.",
            },
        ],
        "edge_cases": [
            {"input": "121", "expected": "true", "why": "Odd length. Drop the middle 2."},
            {"input": "-121", "expected": "false", "why": "Negatives are not mirrors."},
            {"input": "10", "expected": "false", "why": "A trailing zero that is not the number 0."},
            {"input": "0", "expected": "true", "why": "A single 0 is a mirror."},
            {"input": "1221", "expected": "true", "why": "Even length. x == rev with no middle digit."},
        ],
        "interview_script": [
            "I need to know if x reads the same forwards and backwards. Negatives are not mirrors.",
            "I could convert x to a string and compare ends. That is O(d) time and O(d) space, which the prompt asks me to avoid.",
            "The key point: I only reverse the second half, then compare it with what is left of x.",
            "I stop when x is no longer greater than the reversed half. For an odd length I drop the middle digit with rev / 10.",
            "That is O(d) time and O(1) space. A trailing zero is not a mirror unless x is 0. I will test 0, 10, 1221, and 12321.",
        ],
        "follow_ups": [
            {
                "question": "Allow negatives by ignoring the sign.",
                "answer": "Take Math.abs into a long first, then run the same half-reverse. -121 would then be true.",
            },
            {
                "question": "The input is a string of digits.",
                "answer": "Two pointers on the string. No math. That is Valid Palindrome, without the junk-skipping.",
            },
            {
                "question": "You may delete at most one digit.",
                "answer": "On the first mismatch of the two halves, try dropping the left digit or the right one.",
            },
        ],
        "related_slugs": ["lc-125", "lc-234", "lc-680"],
    },
]
