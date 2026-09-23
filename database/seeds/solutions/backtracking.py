"""Written solutions for backtracking problems."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-131"],
        "pattern": "Backtracking",
        "trigger": "split a string into all possible sets of palindromic substrings",
        "summary": (
            "Choose a split point where the prefix is a palindrome, add the substring to our path, "
            "and recursively partition the rest of the string. When the start index reaches the string length, "
            "save the current partition."
        ),
        "approaches": [
            {
                "name": "Backtracking with dynamic programming table",
                "is_optimal": False,
                "idea": "Precompute palindrome validity for all substrings in a 2D table, then use recursive backtracking to collect partitions.",
                "steps": [
                    "Build an n by n boolean table where dp[i][j] indicates whether s[i...j] is a palindrome.",
                    "Fill the table for substrings of length 1, 2, and greater.",
                    "Launch recursive backtracking starting at index 0.",
                    "For each ending index where the table marks a palindrome, add the substring to the path.",
                    "Recurse on the next index, and remove the substring on return.",
                    "Collect the completed path whenever the start index reaches the string length.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> partition(String s) {
        int n = s.length();
        boolean[][] dp = new boolean[n][n];
        for (int i = 0; i < n; i++) {
            dp[i][i] = true;
        }
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i <= n - len; i++) {
                int j = i + len - 1;
                if (s.charAt(i) == s.charAt(j)) {
                    dp[i][j] = (len == 2) || dp[i + 1][j - 1];
                }
            }
        }

        List<List<String>> out = new ArrayList<>();
        backtrack(s, 0, dp, new ArrayList<>(), out);
        return out;
    }

    private void backtrack(String s, int start, boolean[][] dp, List<String> path, List<List<String>> out) {
        if (start == s.length()) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int end = start; end < s.length(); end++) {
            if (dp[start][end]) {
                path.add(s.substring(start, end + 1));
                backtrack(s, end + 1, dp, path, out);
                path.remove(path.size() - 1);
            }
        }
    }
}""",
                "time_complexity": "O(n · 2^n)",
                "time_why": "There are 2^(n-1) possible partition points, and copying substrings takes O(n) work.",
                "space_complexity": "O(n²)",
                "space_why": "The dynamic programming table requires n x n space, and recursion uses O(n) depth.",
                "when_to_use": "Mention it first as the precomputed table approach before saving space with two pointers.",
            },
            {
                "name": "Backtracking with two-pointer verification",
                "is_optimal": True,
                "idea": "Check if each prefix is a palindrome on the fly using two pointers, avoiding quadratic extra space.",
                "steps": [
                    "Initialize a results list and begin backtracking from start index 0.",
                    "If the start index reaches the string length, append a copy of the current path.",
                    "Loop the end index from start to the end of the string.",
                    "Verify if the substring from start to end is a palindrome using two pointers.",
                    "If valid, append the substring to the path and recurse on the next index.",
                    "Backtrack by removing the last substring from the path.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> partition(String s) {
        List<List<String>> out = new ArrayList<>();
        build(s, 0, new ArrayList<>(), out);
        return out;
    }

    private void build(String s, int start, List<String> path, List<List<String>> out) {
        if (start == s.length()) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int end = start; end < s.length(); end++) {
            if (!isPalindrome(s, start, end)) {
                continue;
            }
            path.add(s.substring(start, end + 1));
            build(s, end + 1, path, out);
            path.remove(path.size() - 1);
        }
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
                "time_complexity": "O(n · 2^n)",
                "time_why": "There are up to 2^n partitions, each requiring O(n) time for substring checks and copying.",
                "space_complexity": "O(n)",
                "space_why": "The recursion stack and path list hold at most n string elements.",
                "when_to_use": "The optimal interview approach verifying palindromes on the fly without extra table allocation.",
            },
        ],
        "walkthrough": {
            "input": 's = "aab"',
            "result": "The two valid palindrome partitions are [a, a, b] and [aa, b].",
            "columns": ["step", "start", "choose prefix", "path state", "action"],
            "rows": [
                ["1", "0", '"a"', '["a"]', "Recurse from index 1"],
                ["2", "1", '"a"', '["a","a"]', "Recurse from index 2"],
                ["3", "2", '"b"', '["a","a","b"]', "End reached: save partition"],
                ["4", "1", "None", '["a"]', "Unchoose 'a' and backtrack to 0"],
                ["5", "0", '"aa"', '["aa"]', "Recurse from index 2"],
                ["6", "2", '"b"', '["aa","b"]', "End reached: save partition"],
            ],
        },
        "mistakes": [
            {
                "name": "The Shared Bag Trap",
                "wrong": "Adding the mutable path object directly into the results stores references that get cleared later.",
                "right": "Always create a shallow copy new ArrayList<>(path) when saving a completed partition.",
            },
            {
                "name": "Substring index off-by-one",
                "wrong": "Using s.substring(start, end) drops the character at index end from the partition.",
                "right": "Call s.substring(start, end + 1) because the second argument in Java is exclusive.",
            },
            {
                "name": "Checking palindrome after completing the entire string",
                "wrong": "Generating arbitrary partitions first and verifying them at the leaves explores exponential dead branches.",
                "right": "Check whether each prefix is a palindrome before recursing into deeper cuts.",
            },
        ],
        "edge_cases": [
            {
                "input": 's = "a"',
                "expected": '[["a"]]',
                "why": "A single character string produces one valid single-element partition.",
            },
            {
                "input": 's = "ab"',
                "expected": '[["a","b"]]',
                "why": "Two distinct characters cannot merge into a multi-letter palindrome.",
            },
            {
                "input": 's = "aaa"',
                "expected": '[["a","a","a"],["a","aa"],["aa","a"],["aaa"]]',
                "why": "All substrings of repeated characters are palindromes, producing all split combinations.",
            },
            {
                "input": 's = "racecar"',
                "expected": "Includes both individual letters and the full word ['racecar']",
                "why": "Handles palindromes that span the entire string cleanly.",
            },
        ],
        "interview_script": [
            "I need to find all possible ways to partition a string into palindromic substrings.",
            "The obvious way I could try is precomputing an n by n table, which uses O(n²) space and O(n · 2^n) time.",
            "The key point I notice is that checking each prefix with two pointers on the fly needs zero extra storage.",
            "So I backtrack with two-pointer validation, keeping O(n · 2^n) time and reducing space to O(n).",
            "I will test a single letter string, a string with no multi-letter palindromes, and an all-identical string.",
        ],
        "follow_ups": [
            {
                "question": "How would you find the minimum cuts needed for palindrome partitioning?",
                "answer": "Switch to 1D dynamic programming where dp[i] is the minimum cuts for prefix s[0...i].",
            },
            {
                "question": "What if string length reaches 2000?",
                "answer": "Generating all partitions is impossible due to exponential combinations, but minimum cut DP still runs in O(n^2).",
            },
            {
                "question": "Can we precompute palindrome validation across recursive calls?",
                "answer": "Yes, storing palindrome check results in a boolean array avoids repeated substring comparisons.",
            },
        ],
        "related_slugs": ["lc-139", "lc-46", "lc-78"],
    },
    {
        "slugs": ["lc-17"],
        "pattern": "Backtracking",
        "trigger": "map phone digits to all possible letter combinations",
        "summary": (
            "Each digit maps to three or four telephone letters. "
            "Use depth-first search to pick one letter for the current digit, step to the next digit, and backtrack. "
            "When the path length matches the input length, save the combination."
        ),
        "approaches": [
            {
                "name": "Iterative queue expansion",
                "is_optimal": False,
                "idea": "Expand combinations digit by digit using a queue without recursion.",
                "steps": [
                    "Handle an empty digits string by returning an empty list immediately.",
                    "Initialize a queue with an empty string as a seed.",
                    "For each digit in the input, look up its mapped letters.",
                    "Dequeue all partial combinations from the previous digit.",
                    "Append each letter option to each dequeued string and enqueue the result.",
                    "Return the contents of the queue once all digits are processed.",
                ],
                "code": """import java.util.*;

class Solution {
    private static final String[] KEYS = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };

    public List<String> letterCombinations(String digits) {
        List<String> out = new ArrayList<>();
        if (digits.isEmpty()) {
            return out;
        }
        Queue<String> queue = new ArrayDeque<>();
        queue.add("");

        for (int i = 0; i < digits.length(); i++) {
            String letters = KEYS[digits.charAt(i) - '0'];
            int size = queue.size();
            for (int s = 0; s < size; s++) {
                String prefix = queue.poll();
                for (char c : letters.toCharArray()) {
                    queue.add(prefix + c);
                }
            }
        }
        out.addAll(queue);
        return out;
    }
}""",
                "time_complexity": "O(4^n)",
                "time_why": "Each digit branches into up to 4 letter choices, generating 4^n leaf combinations.",
                "space_complexity": "O(4^n)",
                "space_why": "The queue holds up to 4^n strings of length n during the final layer.",
                "when_to_use": "Mention it first as the breadth-first queue baseline before using recursive backtracking.",
            },
            {
                "name": "Recursive backtracking with character buffer",
                "is_optimal": True,
                "idea": "Build combinations depth-first with a single reusable string builder, appending and deleting on backtrack.",
                "steps": [
                    "Return an empty list if the input string is empty.",
                    "Define the keypad mapping array from index 0 to 9.",
                    "In the recursive helper, check if the current index equals the digits length.",
                    "If so, convert the string builder to a string and append to the results.",
                    "Loop over the mapped letters for the current digit, append to the builder, and recurse.",
                    "Delete the appended letter from the builder upon returning.",
                ],
                "code": """import java.util.*;

class Solution {
    private static final String[] KEYS = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };

    public List<String> letterCombinations(String digits) {
        List<String> out = new ArrayList<>();
        if (digits.isEmpty()) {
            return out;
        }
        build(digits, 0, new StringBuilder(), out);
        return out;
    }

    private void build(String digits, int index, StringBuilder path, List<String> out) {
        if (index == digits.length()) {
            out.add(path.toString());
            return;
        }
        for (char letter : KEYS[digits.charAt(index) - '0'].toCharArray()) {
            path.append(letter);
            build(digits, index + 1, path, out);
            path.deleteCharAt(path.length() - 1);
        }
    }
}""",
                "time_complexity": "O(4^n)",
                "time_why": "In the worst case where all digits are 7 or 9, we generate 4^n combinations of length n.",
                "space_complexity": "O(n)",
                "space_why": "The call stack and StringBuilder both use space proportional to digits length n.",
                "when_to_use": "The optimal interview approach minimizing allocations with a single reusable buffer.",
            },
            {
                "name": "Counting in mixed bases",
                "idea": "Number the answers 0, 1, 2 and so on. The number itself says which letter to take from each digit, the way an odometer rolls over.",
                "steps": [
                    "Look up the letters for each digit and multiply their counts together: that is how many answers there are.",
                    "Give every answer a number, from 0 up to that total minus 1.",
                    "To spell out answer number k, go through the digits from the last one back to the first.",
                    "At each digit, take the letter at position k % count, then divide k by that count and move left.",
                    "Collect the letters into a string and add it to the list. Counting upwards gives the answers in order.",
                ],
                "code": """import java.util.*;

class Solution {
    private static final String[] KEYS = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };

    public List<String> letterCombinations(String digits) {
        List<String> out = new ArrayList<>();
        if (digits.isEmpty()) {
            return out;
        }
        int total = 1;
        for (int i = 0; i < digits.length(); i++) {
            total *= KEYS[digits.charAt(i) - '0'].length();
        }
        for (int k = 0; k < total; k++) {
            char[] answer = new char[digits.length()];
            int rest = k;
            for (int i = digits.length() - 1; i >= 0; i--) {
                String letters = KEYS[digits.charAt(i) - '0'];
                answer[i] = letters.charAt(rest % letters.length());
                rest /= letters.length();
            }
            out.add(new String(answer));
        }
        return out;
    }
}""",
                "time_complexity": "O(4^n · n)",
                "time_why": "There are up to 4^n answers, and each one is spelled out letter by letter across n digits.",
                "space_complexity": "O(n)",
                "space_why": "One character buffer of length n is filled per answer, with no queue and no call stack.",
                "when_to_use": "When you want one answer out of the set without building the rest: the 500th name, or a random one. The same multiplication gives the count up front, so you can page through the answers.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": 'digits = "23"',
            "result": "The nine valid letter combinations for digits 23 are generated.",
            "columns": ["step", "digit index", "choose char", "path state", "action"],
            "rows": [
                ["1", "0 (key 2)", "'a'", '"a"', "Recurse to index 1"],
                ["2", "1 (key 3)", "'d'", '"ad"', "Length 2: save 'ad'"],
                ["3", "1 (key 3)", "'e'", '"ae"', "Unchoose 'd', save 'ae'"],
                ["4", "1 (key 3)", "'f'", '"af"', "Unchoose 'e', save 'af'"],
                ["5", "0 (key 2)", "'b'", '"b"', "Backtrack to 0, choose 'b'"],
            ],
        },
        "mistakes": [
            {
                "name": "The Empty Dial Trap",
                "wrong": "Returning a list containing an empty string fails when the problem requires an empty list.",
                "right": "Check digits.isEmpty() before beginning recursion and return an empty list immediately.",
            },
            {
                "name": "String concatenation inside loop",
                "wrong": "Using path + letter creates temporary string objects on every recursive call.",
                "right": "Use a single StringBuilder, appending before recursion and deleting on backtrack.",
            },
            {
                "name": "Missing digits 7 and 9 with four letters",
                "wrong": "Assuming every digit maps to three letters cuts off 's' and 'z'.",
                "right": "Ensure the mapping array correctly assigns four letters to 7 ('pqrs') and 9 ('wxyz').",
            },
        ],
        "edge_cases": [
            {
                "input": 'digits = ""',
                "expected": "[]",
                "why": "Empty digits string must return an empty list without empty string elements.",
            },
            {
                "input": 'digits = "2"',
                "expected": '["a","b","c"]',
                "why": "A single digit maps directly to its corresponding individual letters.",
            },
            {
                "input": 'digits = "7"',
                "expected": '["p","q","r","s"]',
                "why": "Digit 7 maps to four distinct letters rather than three.",
            },
            {
                "input": 'digits = "79"',
                "expected": "16 combinations",
                "why": "Two 4-letter digits produce 4 x 4 = 16 combinations.",
            },
        ],
        "interview_script": [
            "I need to generate all possible letter combinations mapped from a string of phone digits.",
            "The obvious way I could try is level-by-level queue expansion, which stores O(4^n) combinations in memory.",
            "The key point I notice is that depth-first search with a single buffer uses only stack frames.",
            "So I backtrack with a StringBuilder, keeping O(4^n) time and reducing space to O(n).",
            "I will test an empty digits string, a single digit, and digits 7 and 9 with four letters each.",
        ],
        "follow_ups": [
            {
                "question": "What if digits contains '0' or '1'?",
                "answer": "Since 0 and 1 do not map to letters, we could skip them or map them to special characters.",
            },
            {
                "question": "How would you filter results to only valid English words?",
                "answer": "Prune branches early using a Trie prefix tree before recursing.",
            },
            {
                "question": "Can this be solved using Java streams?",
                "answer": "Yes, using flatMap with reduce creates Cartesian products functionally at slight memory overhead.",
            },
        ],
        "related_slugs": ["lc-22", "lc-46", "lc-78"],
    },
    {
        "slugs": ["lc-22"],
        "pattern": "Constrained backtracking",
        "trigger": "generate all combinations of well-formed parentheses pairs",
        "summary": (
            "Track counts of placed open and close parentheses. "
            "An open bracket can be placed whenever fewer than n have been used. "
            "A close bracket can be placed only when the close count is strictly less than the open count."
        ),
        "approaches": [
            {
                "name": "Generate all candidates and validate",
                "is_optimal": False,
                "idea": "Generate all 2^(2n) sequences of brackets and check each one with a balance counter.",
                "steps": [
                    "Recursively generate all combinations of open and close brackets.",
                    "When the string length reaches 2 * n, check whether the brackets are balanced.",
                    "In the validator, increment the balance on an open bracket and decrement on a close bracket.",
                    "If the balance drops below zero at any point, reject the string as invalid.",
                    "If the balance ends at exactly zero, add the string to the output.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> out = new ArrayList<>();
        generate(new char[2 * n], 0, out);
        return out;
    }

    private void generate(char[] current, int pos, List<String> out) {
        if (pos == current.length) {
            if (isValid(current)) {
                out.add(new String(current));
            }
            return;
        }
        current[pos] = '(';
        generate(current, pos + 1, out);
        current[pos] = ')';
        generate(current, pos + 1, out);
    }

    private boolean isValid(char[] current) {
        int balance = 0;
        for (char c : current) {
            if (c == '(') {
                balance++;
            } else {
                balance--;
            }
            if (balance < 0) {
                return false;
            }
        }
        return balance == 0;
    }
}""",
                "time_complexity": "O(2^(2n) · n)",
                "time_why": "There are 2^(2n) total bracket strings, each checked in O(n) validation time.",
                "space_complexity": "O(n)",
                "space_why": "The character array and recursion stack have length 2 * n.",
                "when_to_use": "Mention it first as the brute force generation baseline before applying balance pruning.",
            },
            {
                "name": "Backtracking with balance constraints",
                "is_optimal": True,
                "idea": "Only place brackets that maintain validity: add '(' when open < n, and ')' when close < open.",
                "steps": [
                    "Initialize a string builder and begin recursion with open at zero and close at zero.",
                    "If the string builder length reaches 2 * n, add the completed string to results.",
                    "If open is less than n, append '(', recurse with open + 1, and delete the character on return.",
                    "If close is less than open, append ')', recurse with close + 1, and delete the character on return.",
                    "Return the accumulated results list.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> out = new ArrayList<>();
        build(new StringBuilder(), 0, 0, n, out);
        return out;
    }

    private void build(StringBuilder path, int open, int close, int n, List<String> out) {
        if (path.length() == 2 * n) {
            out.add(path.toString());
            return;
        }
        if (open < n) {
            path.append('(');
            build(path, open + 1, close, n, out);
            path.deleteCharAt(path.length() - 1);
        }
        if (close < open) {
            path.append(')');
            build(path, open, close + 1, n, out);
            path.deleteCharAt(path.length() - 1);
        }
    }
}""",
                "time_complexity": "O(4^n / sqrt(n))",
                "time_why": "The number of valid parenthesis expressions is the nth Catalan number, bounded by 4^n / (n * sqrt(n)).",
                "space_complexity": "O(n)",
                "space_why": "The recursion stack depth and StringBuilder buffer never exceed 2 * n characters.",
                "when_to_use": "The optimal interview approach guaranteeing that every generated string is valid.",
            },
            {
                "name": "Lexicographic successor, one string at a time",
                "idea": "Start from the smallest valid string and work out the next one in dictionary order, the way next permutation steps through arrangements of an array.",
                "steps": [
                    "Start with the smallest valid string: n open brackets followed by n close brackets.",
                    "To find the next one, walk from the right and stop at an open bracket that has more opens than closes before it.",
                    "Turn that bracket into a close bracket. The count in front of it keeps the string valid.",
                    "Fill everything after it with all the open brackets still owed, then all the close brackets. That tail is the smallest possible ending.",
                    "Write the string down and repeat. When no bracket can be turned, the last string has been reached.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> out = new ArrayList<>();
        char[] current = new char[2 * n];
        for (int i = 0; i < n; i++) {
            current[i] = '(';
            current[n + i] = ')';
        }
        while (true) {
            out.add(new String(current));
            if (!step(current, n)) {
                return out;
            }
        }
    }

    // Rewrites current as the next valid string in dictionary order, or reports there is none.
    private boolean step(char[] current, int n) {
        int opensRight = 0;
        int closesRight = 0;
        for (int i = current.length - 1; i >= 0; i--) {
            if (current[i] == ')') {
                closesRight++;
                continue;
            }
            opensRight++;
            int opensBefore = n - opensRight;
            int closesBefore = n - closesRight;
            if (opensBefore > closesBefore && closesBefore < n) {
                current[i] = ')';
                int pos = i + 1;
                for (int owed = n - opensBefore; owed > 0; owed--) {
                    current[pos++] = '(';
                }
                while (pos < current.length) {
                    current[pos++] = ')';
                }
                return true;
            }
        }
        return false;
    }
}""",
                "time_complexity": "O(n · C(n))",
                "time_why": "Each string is produced by one walk over 2n characters, and there are C(n) of them, the nth Catalan number.",
                "space_complexity": "O(n)",
                "space_why": "One buffer of 2n characters is rewritten in place, with no call stack and no queue.",
                "when_to_use": "When the answers should arrive one at a time instead of all at once: hand out the next string, or carry on from the last one seen. They come in dictionary order with no recursion.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "n = 2",
            "result": "The two balanced parenthesis strings (()) and ()() are generated.",
            "columns": ["step", "open count", "close count", "path state", "decision"],
            "rows": [
                ["1", "0", "0", '""', "open < 2: append '('"],
                ["2", "1", "0", '"("', "open < 2: append '('"],
                ["3", "2", "0", '"(("', "close < open: append ')'"],
                ["4", "2", "1", '"(()"', "close < open: append ')'"],
                ["5", "2", "2", '"(())"', "Length 4: save '(())'"],
                ["6", "1", "0", '"("', "Backtrack: close < open: append ')'"],
                ["7", "1", "1", '"()"', "open < 2: append '(' -> produces '()()'"],
            ],
        },
        "mistakes": [
            {
                "name": "The Premature Close Trap",
                "wrong": "Checking close < n instead of close < open generates invalid prefixes like ')(...'.",
                "right": "Only append a closing parenthesis when close is strictly less than open.",
            },
            {
                "name": "Creating multiple string copies",
                "wrong": "Using string concatenation path + '(' allocates a new String on every recursive call.",
                "right": "Use a single StringBuilder, appending before recursion and deleting the last character after.",
            },
            {
                "name": "Validating after building full strings",
                "wrong": "Exploring all 2^(2n) paths and validating at leaves wastes exponential time on dead ends.",
                "right": "Maintain balance constraints during construction so invalid states are never visited.",
            },
        ],
        "edge_cases": [
            {
                "input": "n = 1",
                "expected": '["()"]',
                "why": "Only one pair of parentheses can be formed.",
            },
            {
                "input": "n = 2",
                "expected": '["(())","()()"]',
                "why": "Generates the two valid arrangements for two pairs.",
            },
            {
                "input": "n = 3",
                "expected": '["((()))","(()())","(())()","()(())","()()()"]',
                "why": "Generates all five valid arrangements of three parentheses pairs.",
            },
            {
                "input": "n = 4",
                "expected": "14 valid combinations",
                "why": "Matches the 4th Catalan number C(4) = 14.",
            },
        ],
        "interview_script": [
            "I need to generate all combinations of n pairs of balanced parentheses.",
            "The obvious way I could try is generating all 2^(2n) strings and validating them, taking O(2^(2n) · n) time.",
            "The key point I notice is that a closing bracket is only valid when fewer closing than opening brackets exist.",
            "So I prune invalid branches immediately, achieving O(4^n / sqrt(n)) time and O(n) space.",
            "I will test n = 1, n = 2, and n = 3 to verify all Catalan configurations.",
        ],
        "follow_ups": [
            {
                "question": "What is the exact count of valid strings for a given n?",
                "answer": "It equals the nth Catalan number, given by C(n) = (1 / (n + 1)) * (2n choose n).",
            },
            {
                "question": "How would you handle multiple bracket types like (), [], and {}?",
                "answer": "Track a stack of opened bracket types rather than a simple numeric counter.",
            },
            {
                "question": "Can we generate them with loops without recursion?",
                "answer": "Yes, using dynamic programming by composing smaller valid expressions like '(' + left + ')' + right.",
            },
        ],
        "related_slugs": ["lc-17", "lc-46", "lc-78"],
    },
    {
        "slugs": ["lc-39"],
        "pattern": "Backtracking",
        "trigger": "all unique combinations where numbers sum to an exact target with unlimited reuse",
        "summary": (
            "Sort the candidate numbers and use recursive backtracking. "
            "At each step, pick a number and stay at the same index to allow unlimited reuse, or move forward. "
            "Sorting allows stopping immediately when a number exceeds the remaining sum."
        ),
        "approaches": [
            {
                "name": "Choose or skip binary recursion",
                "is_optimal": False,
                "idea": "At each index, branch into two decisions: include current candidate and stay at index, or skip to next index.",
                "steps": [
                    "Sort the candidates array in ascending order.",
                    "If the remaining target is 0, add a copy of the current combination to results.",
                    "If the index reaches candidates length or candidate exceeds target, return.",
                    "Choice 1: Include candidates[index], recurse with remaining minus candidates[index] at the same index.",
                    "Un-choose: Remove the candidate from the path.",
                    "Choice 2: Skip candidates[index] and recurse with the next index.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        Arrays.sort(candidates);
        List<List<Integer>> out = new ArrayList<>();
        backtrack(candidates, target, 0, new ArrayList<>(), out);
        return out;
    }

    private void backtrack(int[] candidates, int remaining, int index, List<Integer> path, List<List<Integer>> out) {
        if (remaining == 0) {
            out.add(new ArrayList<>(path));
            return;
        }
        if (index == candidates.length || candidates[index] > remaining) {
            return;
        }
        path.add(candidates[index]);
        backtrack(candidates, remaining - candidates[index], index, path, out);
        path.remove(path.size() - 1);
        backtrack(candidates, remaining, index + 1, path, out);
    }
}""",
                "time_complexity": "O(2^(target / min))",
                "time_why": "Binary branching creates a recursion tree of depth bounded by target divided by the smallest candidate value.",
                "space_complexity": "O(target / min)",
                "space_why": "The recursion stack and path list grow at most target divided by the smallest candidate value.",
                "when_to_use": "Mention it first as the binary knapsack-style choice tree before using loop pruning.",
            },
            {
                "name": "Backtracking with loop and pruning",
                "is_optimal": True,
                "idea": "Loop candidates from start index; sort beforehand to prune loops as soon as a number exceeds remaining sum.",
                "steps": [
                    "Sort the candidates in ascending order to enable early loop termination.",
                    "In the recursive helper, check if the remaining target has reached 0.",
                    "If so, save a copy of the current path and return.",
                    "Loop from the start index to the candidates length.",
                    "If the candidate exceeds remaining, break the loop immediately.",
                    "Append the candidate, recurse with remaining minus candidate at index i, and remove on return.",
                ],
                "code": """import java.util.*;

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
            if (candidates[i] > remaining) {
                break;
            }
            path.addLast(candidates[i]);
            backtrack(candidates, remaining - candidates[i], i, path, out);
            path.removeLast();
        }
    }
}""",
                "time_complexity": "O(N^(target / min))",
                "time_why": "Each state branches across up to N candidates with maximum tree depth target / min.",
                "space_complexity": "O(target / min)",
                "space_why": "The deque and call stack hold at most target / min elements.",
                "when_to_use": "The optimal interview approach pruning fruitless branches early with sorted candidates.",
            },
            {
                "name": "Coin change table over every amount",
                "idea": "Work out the combinations for every amount from 0 up to the target, each one built from the combinations of a smaller amount.",
                "steps": [
                    "Keep a list of combinations for every amount from 0 to the target. Amount 0 starts with one empty combination.",
                    "Take the candidate numbers one at a time, smallest first.",
                    "For the current number, walk the amounts upward from that number to the target.",
                    "At each amount, copy every combination stored at the amount minus that number, add the number to the copy, and store it here.",
                    "Handling one number at a time keeps every combination in sorted order, so no combination is built twice.",
                    "The answer is the list sitting at the target.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        List<List<List<Integer>>> table = new ArrayList<>();
        for (int amount = 0; amount <= target; amount++) {
            table.add(new ArrayList<>());
        }
        table.get(0).add(new ArrayList<>());

        int[] sorted = candidates.clone();
        Arrays.sort(sorted);
        for (int value : sorted) {
            for (int amount = value; amount <= target; amount++) {
                for (List<Integer> smaller : table.get(amount - value)) {
                    List<Integer> longer = new ArrayList<>(smaller);
                    longer.add(value);
                    table.get(amount).add(longer);
                }
            }
        }
        return table.get(target);
    }
}""",
                "time_complexity": "O(N · target · K)",
                "time_why": "Each of the N candidates sweeps the whole table, and every stored combination is copied in full, K being how many combinations appear on the way.",
                "space_complexity": "O(target · K)",
                "space_why": "Every amount up to the target keeps its own list of combinations, not only the target.",
                "when_to_use": "When the question is about the target itself rather than one list: how many ways reach each amount, or the fewest numbers that do. The table has already answered those.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "candidates = [2,3,5], target = 5",
            "result": "The two combinations summing to 5 are [2, 3] and [5].",
            "columns": ["step", "start index", "choose candidate", "remaining target", "path state"],
            "rows": [
                ["1", "0", "Choose 2", "3", "[2]"],
                ["2", "0", "Choose 2", "1", "[2, 2]"],
                ["3", "0", "2 > 1: break", "1", "Backtrack to [2]"],
                ["4", "1", "Choose 3", "0", "[2, 3] -> saved"],
                ["5", "2", "Choose 5", "0", "[5] -> saved"],
            ],
        },
        "mistakes": [
            {
                "name": "The One Use Trap",
                "wrong": "Passing i + 1 to the recursive call prevents reusing the same number multiple times.",
                "right": "Pass index i to the recursive call so the same number can be selected again.",
            },
            {
                "name": "Failing to sort before pruning",
                "wrong": "Using break when candidates[i] > remaining on an unsorted array skips valid smaller numbers later.",
                "right": "Always sort candidates first so numbers are monotonically increasing before using break.",
            },
            {
                "name": "Adding the path reference without copying",
                "wrong": "Passing path directly stores a mutable list that ends up empty when backtracking finishes.",
                "right": "Always make a snapshot using new ArrayList<>(path) when saving a valid combination.",
            },
        ],
        "edge_cases": [
            {
                "input": "candidates = [2], target = 1",
                "expected": "[]",
                "why": "The smallest candidate is larger than the target so no combination is possible.",
            },
            {
                "input": "candidates = [2], target = 6",
                "expected": "[[2,2,2]]",
                "why": "Reusing the single candidate three times reaches the target.",
            },
            {
                "input": "candidates = [1], target = 2",
                "expected": "[[1,1]]",
                "why": "Candidate 1 reuses twice to hit target 2.",
            },
            {
                "input": "candidates = [2,3,6,7], target = 7",
                "expected": "[[2,2,3],[7]]",
                "why": "Tests multiple distinct combination lengths.",
            },
        ],
        "interview_script": [
            "I need to find all unique combinations of candidate numbers that sum to a target with unlimited reuse.",
            "The obvious way I could try is binary pick-or-skip recursion, which explores O(2^(target / min)) branches.",
            "The key point I notice is that sorting candidates lets me break out of loops as soon as a number is too large.",
            "So I use loop backtracking with pruning, taking O(N^(target / min)) time and O(target / min) space.",
            "I will test a target smaller than all candidates, a single candidate reused multiple times, and target 7.",
        ],
        "follow_ups": [
            {
                "question": "What if each number in candidates can only be used once?",
                "answer": "Advance the recursive index to i + 1 and skip duplicate adjacent elements.",
            },
            {
                "question": "What if candidate numbers can be negative?",
                "answer": "Negative numbers allow infinite cycles of sum 0; we would need an explicit length limit or dynamic programming.",
            },
            {
                "question": "How can we speed up combinations with large targets?",
                "answer": "Dynamic programming or knapsack-style precomputation can determine reachability before backtracking.",
            },
        ],
        "related_slugs": ["lc-78", "lc-90", "lc-46"],
    },
    {
        "slugs": ["lc-46"],
        "pattern": "Permutations",
        "trigger": "all possible orderings or permutations of an array of distinct integers",
        "summary": (
            "To generate all orderings, pick any unused number for the first position, "
            "then any remaining unused number for the second position, until all numbers are placed. "
            "Backtracking unmarks used numbers to explore other arrangements."
        ),
        "approaches": [
            {
                "name": "List with contains lookup",
                "is_optimal": False,
                "idea": "Build permutations by testing if the candidate number is already present in the current path list.",
                "steps": [
                    "In the recursive helper, check if the path size equals the array length.",
                    "If so, add a new copy of the path to results and return.",
                    "Loop over each number in the input array.",
                    "If the path already contains the number, continue to the next candidate.",
                    "Append the number to the path, recurse, and remove the last element on return.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        backtrack(nums, new ArrayList<>(), out);
        return out;
    }

    private void backtrack(int[] nums, List<Integer> path, List<List<Integer>> out) {
        if (path.size() == nums.length) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int num : nums) {
            if (path.contains(num)) {
                continue;
            }
            path.add(num);
            backtrack(nums, path, out);
            path.remove(path.size() - 1);
        }
    }
}""",
                "time_complexity": "O(n² · n!)",
                "time_why": "Generating `n!` permutations where each step scans a list of up to n elements takes `O(n² · n!)` time.",
                "space_complexity": "O(n)",
                "space_why": "The recursion stack and path list hold at most n elements.",
                "when_to_use": "Mention it first as the simple list contains approach before optimizing lookups with a boolean array.",
            },
            {
                "name": "Boolean visited array tracking",
                "is_optimal": True,
                "idea": "Maintain a boolean used array to select any unused element in O(1) time, resetting on backtrack.",
                "steps": [
                    "Initialize a boolean used array of length equal to the input array.",
                    "In the recursive helper, check if the path size equals the array length.",
                    "If so, add a new copy of the path to results and return.",
                    "Loop index i from 0 to nums length minus 1.",
                    "If used[i] is true, continue to skip already chosen elements.",
                    "Mark used[i] true, append nums[i] to path, recurse, then undo both actions on return.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        build(nums, new boolean[nums.length], new ArrayList<>(), out);
        return out;
    }

    private void build(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> out) {
        if (path.size() == nums.length) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) {
                continue;
            }
            used[i] = true;
            path.add(nums[i]);
            build(nums, used, path, out);
            path.remove(path.size() - 1);
            used[i] = false;
        }
    }
}""",
                "time_complexity": "O(n · n!)",
                "time_why": "Generating `n!` permutations requires visiting each leaf and copying an n-element list in `O(n · n!)` time.",
                "space_complexity": "O(n)",
                "space_why": "The boolean used array, path list, and call stack each scale linearly with n.",
                "when_to_use": "The optimal interview approach using an O(1) lookup array to avoid linear list scanning.",
            },
            {
                "name": "Next permutation in dictionary order",
                "idea": "Sort the numbers, then keep rearranging them into the next ordering in dictionary order until no later ordering exists.",
                "steps": [
                    "Sort the numbers so the smallest ordering comes first, and write it down.",
                    "To step forward, scan from the right for the first slot holding a number smaller than the one just after it.",
                    "Swap that number with the smallest number to its right that is still larger than it.",
                    "Reverse everything after that slot, which turns the tail into its smallest ordering.",
                    "Write down the new ordering and repeat. When the scan finds no such slot, the last ordering has been reached.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> permute(int[] nums) {
        int[] order = nums.clone();
        Arrays.sort(order);
        List<List<Integer>> out = new ArrayList<>();
        while (true) {
            List<Integer> snapshot = new ArrayList<>();
            for (int value : order) {
                snapshot.add(value);
            }
            out.add(snapshot);
            if (!step(order)) {
                return out;
            }
        }
    }

    // Rewrites order as the next ordering in dictionary order, or reports there is none.
    private boolean step(int[] order) {
        int slot = order.length - 2;
        while (slot >= 0 && order[slot] > order[slot + 1]) {
            slot--;
        }
        if (slot < 0) {
            return false;
        }
        int bigger = order.length - 1;
        while (order[bigger] < order[slot]) {
            bigger--;
        }
        swap(order, slot, bigger);
        for (int left = slot + 1, right = order.length - 1; left < right; left++, right--) {
            swap(order, left, right);
        }
        return true;
    }

    private void swap(int[] order, int i, int j) {
        int keep = order[i];
        order[i] = order[j];
        order[j] = keep;
    }
}""",
                "time_complexity": "O(n · n!)",
                "time_why": "Each step scans and reverses at most n slots, and there are `n!` orderings to reach.",
                "space_complexity": "O(n)",
                "space_why": "One copy of the numbers is rearranged in place, with no used array and no call stack.",
                "when_to_use": "When the orderings should come in dictionary order, or the question is only what comes straight after a given ordering. Nothing is held between answers, so a run can stop and pick up again.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,2,3]",
            "result": "All 6 unique permutations of [1, 2, 3] are generated.",
            "columns": ["step", "slot", "chosen number", "used flags", "path state"],
            "rows": [
                ["1", "0", "1", "[T, F, F]", "[1]"],
                ["2", "1", "2", "[T, T, F]", "[1, 2]"],
                ["3", "2", "3", "[T, T, T]", "[1, 2, 3] -> saved"],
                ["4", "1", "Backtrack 2, pick 3", "[T, F, T]", "[1, 3]"],
                ["5", "2", "Pick 2", "[T, T, T]", "[1, 3, 2] -> saved"],
            ],
        },
        "mistakes": [
            {
                "name": "The Left Behind Trap",
                "wrong": "Looping from start to nums.length instead of 0 misses earlier unused elements for later positions.",
                "right": "In permutations, every position can pick any unused element, so always loop from index 0.",
            },
            {
                "name": "Using contains instead of boolean array",
                "wrong": "Checking path.contains(nums[i]) takes O(n) time per check, adding unnecessary overhead.",
                "right": "Use a boolean[] used array for O(1) membership lookups.",
            },
            {
                "name": "Adding path reference without copying",
                "wrong": "Adding the mutable path reference directly results in empty lists after backtracking completes.",
                "right": "Always make a snapshot copy using new ArrayList<>(path) when adding to results.",
            },
        ],
        "edge_cases": [
            {
                "input": "nums = [1]",
                "expected": "[[1]]",
                "why": "A single element array has exactly one permutation.",
            },
            {
                "input": "nums = [0,1]",
                "expected": "[[0,1],[1,0]]",
                "why": "Two elements produce two distinct orderings.",
            },
            {
                "input": "nums = [1,2,3]",
                "expected": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
                "why": "Three elements yield all six permutations.",
            },
            {
                "input": "nums with negative numbers",
                "expected": "Permutes cleanly regardless of sign",
                "why": "Element identity is determined by array index rather than value magnitude.",
            },
        ],
        "interview_script": [
            "I need to generate all possible permutations of an array of distinct integers.",
            "The obvious way I could try is checking path.contains(x), which takes `O(n² · n!)` time due to linear list scans.",
            "The key point I notice is that a boolean array provides O(1) checks for whether an element has been placed.",
            "So I track visited indices with a boolean array, reducing time to `O(n · n!)` with O(n) space.",
            "I will test a single element, a two-element array, and an array with negative numbers.",
        ],
        "follow_ups": [
            {
                "question": "What if the input contains duplicate numbers?",
                "answer": "Sort the array and skip duplicates if the previous identical element was not used in this round.",
            },
            {
                "question": "How would you find the kth permutation directly without generating all permutations?",
                "answer": "Compute factorial bucket sizes and greedily select each digit mathematically in O(n^2) time.",
            },
            {
                "question": "Can we generate permutations in place by swapping elements?",
                "answer": "Yes, swapping elements at start and i in place avoids extra array allocations.",
            },
        ],
        "related_slugs": ["lc-78", "lc-90", "lc-39"],
    },
    {
        "slugs": ["lc-51"],
        "pattern": "N-Queens",
        "trigger": "place n queens on an n x n chessboard so no two queens threaten each other",
        "summary": (
            "Queens threaten any square in their row, column, or diagonal. "
            "Place queens row by row. For each row, test columns using boolean arrays for occupied columns and diagonals, "
            "and backtrack when blocked."
        ),
        "approaches": [
            {
                "name": "Backtracking with board scan validation",
                "is_optimal": False,
                "idea": "Place queens row by row and scan prior rows to test column and diagonal safety before each placement.",
                "steps": [
                    "Represent the queen placements with an integer array where each index stores a column.",
                    "At the current row, loop each column index from 0 up to n minus 1.",
                    "Scan the previous rows: if any queen shares a column or a diagonal, reject the position.",
                    "If the cell is safe, place the queen and recurse on the next row.",
                    "When the row reaches n, format the board into a list of strings and add it to the results.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> solveNQueens(int n) {
        List<List<String>> out = new ArrayList<>();
        int[] queens = new int[n];
        place(0, n, queens, out);
        return out;
    }

    private void place(int row, int n, int[] queens, List<List<String>> out) {
        if (row == n) {
            out.add(render(queens, n));
            return;
        }
        for (int col = 0; col < n; col++) {
            if (isSafe(row, col, queens)) {
                queens[row] = col;
                place(row + 1, n, queens, out);
            }
        }
    }

    private boolean isSafe(int row, int col, int[] queens) {
        for (int prev = 0; prev < row; prev++) {
            int prevCol = queens[prev];
            if (prevCol == col || Math.abs(row - prev) == Math.abs(col - prevCol)) {
                return false;
            }
        }
        return true;
    }

    private List<String> render(int[] queens, int n) {
        List<String> board = new ArrayList<>();
        for (int r = 0; r < n; r++) {
            char[] line = new char[n];
            Arrays.fill(line, '.');
            line[queens[r]] = 'Q';
            board.add(new String(line));
        }
        return board;
    }
}""",
                "time_complexity": "O(n · n!)",
                "time_why": "Scanning up to row earlier placements takes O(n) time per candidate across the search tree.",
                "space_complexity": "O(n)",
                "space_why": "The queens position array and recursion stack have size n.",
                "when_to_use": "Mention it first as the simple row scan baseline before accelerating checks with boolean arrays.",
            },
            {
                "name": "Backtracking with boolean conflict sets",
                "is_optimal": True,
                "idea": "Track column, main diagonal (r - c + n), and anti-diagonal (r + c) using boolean arrays for O(1) checks.",
                "steps": [
                    "Allocate three boolean arrays to track the used columns, main diagonals, and anti-diagonals.",
                    "In the recursive helper, check if the row equals n; if so, render the board and add it to the output.",
                    "Loop each column candidate from 0 up to n minus 1.",
                    "Calculate the diagonal index as row minus col plus n and the anti-diagonal as row plus col.",
                    "If the column, main diagonal, or anti-diagonal is already marked, continue to the next column.",
                    "Mark the three flags as used, recurse to the next row, and unmark each flag on return.",
                ],
                "code": """import java.util.*;

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
            if (usedCol[col] || usedDiag[diag] || usedAnti[anti]) {
                continue;
            }
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
}""",
                "time_complexity": "O(n!)",
                "time_why": "Each queen placement takes O(1) conflict validation with at most `n!` valid branching configurations.",
                "space_complexity": "O(n)",
                "space_why": "Three boolean lookup arrays and the recursion stack scale linearly with board dimension n.",
                "when_to_use": "The optimal interview approach using constant-time diagonal and column lookups.",
            },
        ],
        "walkthrough": {
            "input": "n = 4",
            "result": "Two distinct valid 4x4 queen placements are found.",
            "columns": ["row", "col placed", "used columns", "diagonals blocked", "action"],
            "rows": [
                ["0", "1", "{1}", "diag: 0-1+4=3, anti: 0+1=1", "Recurse row 1"],
                ["1", "3", "{1, 3}", "diag: 1-3+4=2, anti: 1+3=4", "Recurse row 2"],
                ["2", "0", "{0, 1, 3}", "diag: 2-0+4=6, anti: 2+0=2", "Recurse row 3"],
                ["3", "2", "{0, 1, 2, 3}", "All rows filled", "Save solution [.Q.., ...Q, Q..., ..Q.]"],
            ],
        },
        "mistakes": [
            {
                "name": "The Negative Diagonal Trap",
                "wrong": "Using row - col directly produces negative array indices when col > row.",
                "right": "Offset the difference by adding n: row - col + n guarantees non-negative indices.",
            },
            {
                "name": "Trying to place multiple queens per row",
                "wrong": "Searching over all n x n cells causes redundant states since each row must contain exactly one queen.",
                "right": "Recurse row by row so the row constraint is satisfied automatically.",
            },
            {
                "name": "Missing the anti-diagonal constraint",
                "wrong": "Only checking columns and main diagonals allows queens to attack along the anti-diagonal.",
                "right": "Track row + col in a separate boolean array to guard anti-diagonals.",
            },
        ],
        "edge_cases": [
            {
                "input": "n = 1",
                "expected": '[["Q"]]',
                "why": "A 1x1 board with one queen is immediately solved.",
            },
            {
                "input": "n = 2",
                "expected": "[]",
                "why": "No 2x2 board placement exists where queens do not threaten each other.",
            },
            {
                "input": "n = 3",
                "expected": "[]",
                "why": "No 3x3 board placement satisfies queen safety rules.",
            },
            {
                "input": "n = 4",
                "expected": "2 distinct solutions",
                "why": "Smallest board size with working queen placements.",
            },
        ],
        "interview_script": [
            "I need to place n non-attacking queens on an n by n chessboard.",
            "The obvious way I could try is scanning earlier rows for conflicts, taking `O(n · n!)` time.",
            "The key point I notice is that columns, main diagonals, and anti-diagonals can be checked in O(1) time using arrays.",
            "So I track conflicts with boolean arrays, taking `O(n!)` time and O(n) space.",
            "I will test n = 1 with one queen, n = 2 with no solutions, and n = 4 with two solutions.",
        ],
        "follow_ups": [
            {
                "question": "How would you only count the total number of solutions rather than returning boards?",
                "answer": "Increment an integer counter instead of allocating and formatting string boards.",
            },
            {
                "question": "Can we optimize space even further?",
                "answer": "We can use integer bitmasks for columns and diagonals, running checks in bitwise operations.",
            },
            {
                "question": "How does board symmetry reduce the search space?",
                "answer": "Only search the first n/2 columns in row 0 and reflect solutions horizontally.",
            },
        ],
        "related_slugs": ["lc-46", "lc-79", "lc-39"],
    },
    {
        "slugs": ["lc-78"],
        "pattern": "Subsets",
        "trigger": "return all possible subsets or power set of distinct integers",
        "summary": (
            "Every element can either be included or excluded from a subset. "
            "Use recursive backtracking, adding the current path at every step and looping through remaining elements "
            "to generate all 2^n subsets."
        ),
        "approaches": [
            {
                "name": "Cascading iterative construction",
                "is_optimal": False,
                "idea": "Start with the empty subset and double the subsets list for each number by appending it to existing sets.",
                "steps": [
                    "Initialize the output list with an empty list.",
                    "For each number in the input, inspect all currently existing subsets.",
                    "Create a new copy of each subset with the current number appended.",
                    "Add all newly created subsets back into the output list.",
                    "Return the completed list after processing all numbers.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        out.add(new ArrayList<>());
        for (int x : nums) {
            int size = out.size();
            for (int i = 0; i < size; i++) {
                List<Integer> subset = new ArrayList<>(out.get(i));
                subset.add(x);
                out.add(subset);
            }
        }
        return out;
    }
}""",
                "time_complexity": "O(n · 2^n)",
                "time_why": "We generate 2^n subsets, and copying each subset takes O(n) work.",
                "space_complexity": "O(n · 2^n)",
                "space_why": "The output stores all 2^n subsets of average size n / 2.",
                "when_to_use": "Mention it first as a level-by-level doubling baseline before introducing recursive backtracking.",
            },
            {
                "name": "Backtracking choose and un-choose",
                "is_optimal": True,
                "idea": "At each step, add the current subset to results, then recursively branch on each remaining element.",
                "steps": [
                    "Initialize an output list and launch recursive build starting at index 0.",
                    "Save a copy of the current path to output at the start of every call.",
                    "Loop index i from start to nums length minus 1.",
                    "Add nums[i] to the path, and recurse with start = i + 1.",
                    "Remove the last element from the path to restore state.",
                    "Return the accumulated list of subsets.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        build(nums, 0, new ArrayList<>(), out);
        return out;
    }

    private void build(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
        out.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);
            build(nums, i + 1, path, out);
            path.remove(path.size() - 1);
        }
    }
}""",
                "time_complexity": "O(n · 2^n)",
                "time_why": "There are 2^n subsets, and each subset takes O(n) to clone into the results list.",
                "space_complexity": "O(n)",
                "space_why": "The recursion stack depth and path list require at most n elements.",
                "when_to_use": "The optimal interview approach exploring subsets depth-first with O(n) auxiliary stack space.",
            },
            {
                "name": "Gray code order, one element changed at a time",
                "idea": "List the subsets so that each one differs from the one before it by a single element going in or coming out.",
                "steps": [
                    "Keep a flag for each number saying whether it is in the current subset. Start with every flag off and save the empty subset.",
                    "Count the steps from 1 up to 2^n - 1.",
                    "At step k, flip the flag of the number whose position matches how many zeros sit at the end of k written in binary.",
                    "The step number only picks which flag to flip. It is never read as the subset itself, which is what makes this different from letting the bits of k stand for the numbers.",
                    "Read the flags in order to write down the subset that the flip produced, and save it.",
                    "Every subset shows up exactly once, and each one is a single flip away from the one before it.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        int n = nums.length;
        List<List<Integer>> out = new ArrayList<>();
        boolean[] inSubset = new boolean[n];
        out.add(new ArrayList<>());

        for (int step = 1; step < (1 << n); step++) {
            int flipped = Integer.numberOfTrailingZeros(step);
            inSubset[flipped] = !inSubset[flipped];
            List<Integer> subset = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                if (inSubset[i]) {
                    subset.add(nums[i]);
                }
            }
            out.add(subset);
        }
        return out;
    }
}""",
                "time_complexity": "O(n · 2^n)",
                "time_why": "There are 2^n subsets, and reading the n flags to write each one down costs n.",
                "space_complexity": "O(n)",
                "space_why": "One flag per number is kept, with no call stack and no copies of earlier subsets.",
                "when_to_use": "When the answer for a subset can be updated from the previous one instead of worked out afresh: add or drop one number and adjust a running total. It is also the order for testing settings one change at a time.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,2,3]",
            "result": "All 8 subsets of [1, 2, 3] are generated.",
            "columns": ["step", "start index", "element chosen", "path state", "action"],
            "rows": [
                ["1", "0", "None", "[]", "Save empty set []"],
                ["2", "0", "1", "[1]", "Save [1], recurse to start 1"],
                ["3", "1", "2", "[1, 2]", "Save [1, 2], recurse to start 2"],
                ["4", "2", "3", "[1, 2, 3]", "Save [1, 2, 3], unchoose 3"],
                ["5", "1", "Backtrack 2", "[1]", "Unchoose 2, pick 3 to get [1, 3]"],
            ],
        },
        "mistakes": [
            {
                "name": "The Empty Notebook Trap",
                "wrong": "Calling out.add(path) stores a reference to a mutable list that ends up empty when backtracking finishes.",
                "right": "Always add a new snapshot: out.add(new ArrayList<>(path)).",
            },
            {
                "name": "Base case return statement",
                "wrong": "Placing a return statement immediately after adding the empty path prevents processing remaining elements.",
                "right": "Add the current path unconditionally, then proceed into the loop without returning early.",
            },
            {
                "name": "Starting inner loop from 0 instead of start",
                "wrong": "Starting from index 0 produces permutations rather than subsets, causing duplicates.",
                "right": "Start the loop from the current start parameter so elements are only chosen in forward order.",
            },
        ],
        "edge_cases": [
            {
                "input": "nums = [0]",
                "expected": "[[],[0]]",
                "why": "A single element array has two subsets: the empty set and the single-element set.",
            },
            {
                "input": "nums = [1,2]",
                "expected": "[[],[1],[1,2],[2]]",
                "why": "Two elements yield all 2^2 = 4 subsets.",
            },
            {
                "input": "nums = [3,4,5]",
                "expected": "[[],[3],[3,4],[3,4,5],[3,5],[4],[4,5],[5]]",
                "why": "Three elements produce all 2^3 = 8 subsets.",
            },
            {
                "input": "nums with negative numbers",
                "expected": "Generates valid subsets with negative integers",
                "why": "Subset logic is index-driven and independent of number values.",
            },
        ],
        "interview_script": [
            "I need to generate all possible subsets from an array of distinct integers.",
            "The obvious way I could try is cascading list duplication, which stores O(n · 2^n) subset copies at once.",
            "The key point I notice is that recursive backtracking only needs a single mutable path list on the stack.",
            "So I backtrack by choosing and un-choosing, using O(n · 2^n) time and only O(n) stack space.",
            "I will test a single element, two elements, and an array with negative values.",
        ],
        "follow_ups": [
            {
                "question": "Can this be generated using bit manipulation?",
                "answer": "Yes, numbers from 0 to (1 << n) - 1 can represent presence or absence of each element as bits.",
            },
            {
                "question": "What if the input contains duplicates?",
                "answer": "Sort the input and skip consecutive identical elements at the same recursion depth.",
            },
            {
                "question": "How can we stream subsets without generating all at once?",
                "answer": "Use a generator tracking a binary counter from 0 to 2^n - 1 to generate subsets on demand.",
            },
        ],
        "related_slugs": ["lc-90", "lc-39", "lc-46"],
    },
    {
        "slugs": ["lc-79"],
        "pattern": "Grid search",
        "trigger": "determine if a word exists in a grid of characters moving horizontally or vertically",
        "summary": (
            "Try starting the word from every cell in the grid. "
            "From each cell, explore four adjacent directions, marking visited cells temporarily with a marker character. "
            "If all letters match, return true; otherwise restore the character."
        ),
        "approaches": [
            {
                "name": "Backtracking with boolean visited grid",
                "is_optimal": False,
                "idea": "Maintain a separate boolean matrix seen to prevent reusing cells within the same word path.",
                "steps": [
                    "Check for an empty board or empty word, returning false immediately.",
                    "Allocate a boolean matrix seen of dimensions m by n.",
                    "Loop over every row and column in the grid.",
                    "If the cell matches the first character, launch recursive depth-first search.",
                    "In the search, mark seen true, check four neighbors, and reset seen on return.",
                    "Return true if any path matches the full word; otherwise return false.",
                ],
                "code": """class Solution {
    public boolean exist(String[] board, String word) {
        int rows = board.length;
        int cols = board[0].length();
        boolean[][] seen = new boolean[rows][cols];

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (dfs(board, r, c, word, 0, seen)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean dfs(String[] board, int r, int c, String word, int index, boolean[][] seen) {
        if (index == word.length()) {
            return true;
        }
        if (r < 0 || r >= board.length || c < 0 || c >= board[0].length()) {
            return false;
        }
        if (seen[r][c] || board[r].charAt(c) != word.charAt(index)) {
            return false;
        }

        seen[r][c] = true;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int[] d : dirs) {
            if (dfs(board, r + d[0], c + d[1], word, index + 1, seen)) {
                return true;
            }
        }
        seen[r][c] = false;
        return false;
    }
}""",
                "time_complexity": "O(m · n · 3^L)",
                "time_why": "From each starting cell, the search branches in at most 3 directions for each of the L characters.",
                "space_complexity": "O(m · n + L)",
                "space_why": "The boolean seen table uses m * n space and recursion depth reaches word length L.",
                "when_to_use": "Mention it first as the external visited matrix approach before masking cells in place.",
            },
            {
                "name": "In-place grid modification backtracking",
                "is_optimal": True,
                "idea": "Convert strings to a mutable character grid and temporarily replace visited cells with '#' during search.",
                "steps": [
                    "Handle empty inputs by returning false immediately.",
                    "Convert the input string rows into a 2D character array for fast mutation.",
                    "Loop over every row and column looking for matching start letters.",
                    "When the cell matches the target character, record the original char and overwrite with '#'.",
                    "Recurse into the four cardinal directions with the next character index.",
                    "Restore the original char before returning false, or return true immediately on success.",
                ],
                "code": """class Solution {
    public boolean exist(String[] board, String word) {
        if (board.length == 0 || word.isEmpty()) {
            return false;
        }
        char[][] grid = new char[board.length][];
        for (int r = 0; r < board.length; r++) {
            grid[r] = board[r].toCharArray();
        }
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (dfs(grid, r, c, word, 0)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean dfs(char[][] grid, int r, int c, String word, int index) {
        if (index == word.length()) {
            return true;
        }
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) {
            return false;
        }
        if (grid[r][c] != word.charAt(index)) {
            return false;
        }
        char original = grid[r][c];
        grid[r][c] = '#';
        boolean found = dfs(grid, r + 1, c, word, index + 1)
                || dfs(grid, r - 1, c, word, index + 1)
                || dfs(grid, r, c + 1, word, index + 1)
                || dfs(grid, r, c - 1, word, index + 1);
        grid[r][c] = original;
        return found;
    }
}""",
                "time_complexity": "O(m · n · 3^L)",
                "time_why": "We test m * n starting positions, each branching into at most 3 directions for L word characters.",
                "space_complexity": "O(L)",
                "space_why": "The recursion stack depth is bounded by word length L.",
                "when_to_use": "The optimal interview approach modifying the grid in place to avoid allocating a boolean matrix.",
            },
        ],
        "walkthrough": {
            "input": 'board = ["ABCE","SFCS","ADEE"], word = "ABCCED"',
            "result": "The word ABCCED is found along a valid contiguous path.",
            "columns": ["step", "cell", "char matched", "action", "grid state"],
            "rows": [
                ["1", "(0, 0)", "'A'", "Match word[0], mask with '#'", "(0,0) becomes '#'"],
                ["2", "(0, 1)", "'B'", "Match word[1], mask with '#'", "(0,1) becomes '#'"],
                ["3", "(0, 2)", "'C'", "Match word[2], mask with '#'", "(0,2) becomes '#'"],
                ["4", "(1, 2)", "'C'", "Match word[3], mask with '#'", "(1,2) becomes '#'"],
                ["5", "(2, 2)", "'E'", "Match word[4], mask with '#'", "(2,2) becomes '#'"],
                ["6", "(2, 1)", "'D'", "Match word[5], word complete", "Return true"],
            ],
        },
        "mistakes": [
            {
                "name": "The Reused Cell Trap",
                "wrong": "Failing to mark the current cell as visited allows the search to bounce back and forth between two cells.",
                "right": "Overwrite the current cell with a temporary marker '#' before recursing into adjacent neighbors.",
            },
            {
                "name": "Forgetting to unmark on backtrack",
                "wrong": "Leaving '#' in place when a path fails permanently destroys the character for alternative search paths.",
                "right": "Always restore grid[r][c] = original after exploring all four neighbor branches.",
            },
            {
                "name": "Allowing diagonal moves",
                "wrong": "Checking diagonal steps produces invalid word paths when only horizontal and vertical moves are allowed.",
                "right": "Only recurse into the four cardinal directions (up, down, left, right).",
            },
        ],
        "edge_cases": [
            {
                "input": 'board = ["A"], word = "A"',
                "expected": "true",
                "why": "A single cell grid matches a single character target word.",
            },
            {
                "input": 'board = ["A"], word = "B"',
                "expected": "false",
                "why": "A single cell grid with non-matching letter returns false immediately.",
            },
            {
                "input": 'board = ["AB","CD"], word = "ABCD"',
                "expected": "false",
                "why": "Letters are adjacent only cardinally; B to C is diagonal so no path exists.",
            },
            {
                "input": "Word longer than total cells in grid",
                "expected": "false",
                "why": "A valid path cannot visit any cell more than once, capping path length at m * n.",
            },
        ],
        "interview_script": [
            "I need to determine whether a word exists along a contiguous horizontal or vertical path in a grid.",
            "The obvious way I could try is using an m by n boolean visited array, taking O(m · n + L) space.",
            "The key point I notice is that masking visited cells with '#' in place eliminates the visited matrix.",
            "So I search depth-first with in-place cell masking, taking O(m · n · 3^L) time and O(L) space.",
            "I will test a single cell match, a single cell mismatch, and diagonal adjacent characters.",
        ],
        "follow_ups": [
            {
                "question": "How would you optimize if the word list is large and we want all matching words?",
                "answer": "Store all words in a Trie prefix tree and search the grid once, pruning branches with Trie nodes.",
            },
            {
                "question": "Can we prune searches based on character frequencies?",
                "answer": "Yes, if the board has fewer occurrences of the last character than the first, searching the word reversed is faster.",
            },
            {
                "question": "What if the board cannot be mutated in place?",
                "answer": "Use a boolean array or long bitmask for visited cells when the board is immutable.",
            },
        ],
        "related_slugs": ["lc-200", "lc-51", "lc-46"],
    },
    {
        "slugs": ["lc-90"],
        "pattern": "Subsets with duplicates",
        "trigger": "all possible subsets from an integer collection that may contain duplicate values",
        "summary": (
            "To avoid duplicate subsets, first sort the array. "
            "When deciding which element to include at the current position, "
            "skip any number identical to the previous number if it was already explored at this level."
        ),
        "approaches": [
            {
                "name": "Set deduplication of all subsets",
                "is_optimal": False,
                "idea": "Sort the array, generate all 2^n subsets, and filter duplicates using a set of lists.",
                "steps": [
                    "Sort the input numbers array in ascending order.",
                    "Maintain a HashSet of lists to store unique subsets.",
                    "Use recursive backtracking to explore all 2^n include or exclude combinations.",
                    "Add every constructed path into the set.",
                    "Convert the set of unique subsets into a list and return.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> subsetsWithDup(int[] nums) {
        Arrays.sort(nums);
        Set<List<Integer>> set = new HashSet<>();
        backtrack(nums, 0, new ArrayList<>(), set);
        return new ArrayList<>(set);
    }

    private void backtrack(int[] nums, int start, List<Integer> path, Set<List<Integer>> set) {
        set.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);
            backtrack(nums, i + 1, path, set);
            path.remove(path.size() - 1);
        }
    }
}""",
                "time_complexity": "O(n · 2^n)",
                "time_why": "We generate up to 2^n subsets, and hashing each list takes O(n) operations.",
                "space_complexity": "O(n · 2^n)",
                "space_why": "The set stores up to 2^n subsets in memory.",
                "when_to_use": "Mention it first as the brute force set deduplication baseline before sorting and pruning.",
            },
            {
                "name": "Sorted duplicate skipping",
                "is_optimal": True,
                "idea": "Sort the array and skip identical adjacent elements at the same tree depth to avoid duplicate branches.",
                "steps": [
                    "Sort the input array nums in ascending order.",
                    "In the recursive build helper, add a copy of the current path to the output list.",
                    "Loop index i from start to nums length minus 1.",
                    "If i is greater than start and nums[i] == nums[i - 1], skip the element with continue.",
                    "Append nums[i] to path, recurse with start = i + 1, and remove the last element on return.",
                    "Return the finished output list.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> subsetsWithDup(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        build(nums, 0, new ArrayList<>(), out);
        return out;
    }

    private void build(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
        out.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            if (i > start && nums[i] == nums[i - 1]) {
                continue;
            }
            path.add(nums[i]);
            build(nums, i + 1, path, out);
            path.remove(path.size() - 1);
        }
    }
}""",
                "time_complexity": "O(n · 2^n)",
                "time_why": "There are at most 2^n unique subsets, each copied in O(n) time into results.",
                "space_complexity": "O(n)",
                "space_why": "The path buffer and recursive call stack never exceed n elements.",
                "when_to_use": "The optimal interview approach pruning duplicate branches directly without set overhead.",
            },
        ],
        "walkthrough": {
            "input": "nums = [1,2,2]",
            "result": "All 6 unique subsets of [1, 2, 2] are produced without duplicates.",
            "columns": ["step", "start", "i", "nums[i]", "duplicate check", "action"],
            "rows": [
                ["1", "0", "-", "-", "-", "Save []"],
                ["2", "0", "0", "1", "i == start: OK", "Save [1], recurse start 1"],
                ["3", "1", "1", "2", "i == start: OK", "Save [1, 2], recurse start 2"],
                ["4", "2", "2", "2", "i == start: OK", "Save [1, 2, 2], backtrack"],
                ["5", "1", "2", "2", "i > start and 2 == 2", "Skip duplicate branch"],
                ["6", "0", "1", "2", "i == start: OK", "Save [2], recurse start 2"],
            ],
        },
        "mistakes": [
            {
                "name": "The Twin Trap",
                "wrong": "Using i > 0 skips duplicate elements across deeper levels, preventing valid subsets like [2, 2].",
                "right": "Check i > start to only skip duplicates among siblings at the current recursion level.",
            },
            {
                "name": "Skipping sorting",
                "wrong": "Without sorting, identical elements may not be adjacent, making duplicate detection fail.",
                "right": "Always sort the array before backtracking so duplicate values sit next to each other.",
            },
            {
                "name": "Filtering with a set instead of pruning early",
                "wrong": "Generating duplicate branches and deduplicating in a set wastes exponential time.",
                "right": "Prune duplicate branches during recursion using the condition i > start && nums[i] == nums[i - 1].",
            },
        ],
        "edge_cases": [
            {
                "input": "nums = [0]",
                "expected": "[[],[0]]",
                "why": "A single element array has two unique subsets.",
            },
            {
                "input": "nums = [2,2,2]",
                "expected": "[[],[2],[2,2],[2,2,2]]",
                "why": "All identical elements produce only subsets varying by count.",
            },
            {
                "input": "nums = [4,4,4,1,4]",
                "expected": "10 unique subsets",
                "why": "Sorting brings all 4s together so duplicate branches prune cleanly.",
            },
            {
                "input": "nums with no duplicates",
                "expected": "Behaves like standard subset generation",
                "why": "When all elements are distinct, duplicate checks never trigger.",
            },
        ],
        "interview_script": [
            "I need to generate all unique subsets from an array that may contain duplicate numbers.",
            "The obvious way I could try is putting all 2^n subsets into a HashSet, taking O(n · 2^n) space.",
            "The key point I notice is that sorting groups duplicates, so skipping nums[i] == nums[i-1] when i > start prunes identical branches.",
            "So I backtrack with sibling duplicate skipping, keeping O(n · 2^n) time and reducing space to O(n).",
            "I will test a single element, all identical elements, and an array with no duplicates.",
        ],
        "follow_ups": [
            {
                "question": "Can this be done with loops instead of recursion?",
                "answer": "Yes, by tracking the start index of the newly added subsets from the previous step when a duplicate is seen.",
            },
            {
                "question": "How does this compare with Combination Sum II?",
                "answer": "The duplicate skipping condition i > start && nums[i] == nums[i - 1] is identical in both problems.",
            },
            {
                "question": "What if the input contains duplicates that cannot be sorted?",
                "answer": "A frequency map of unique elements can guide backtracking without requiring array sorting.",
            },
        ],
        "related_slugs": ["lc-78", "lc-39", "lc-46"],
    },
]
