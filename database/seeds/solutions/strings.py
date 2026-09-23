"""String problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["anagram-bundles"],
        "pattern": "Hash map",
        "trigger": "Group strings that are anagrams of one another.",
        "summary": (
            "Give each word a signature of its letter counts. "
            "Words with the same signature go in the same list."
        ),
        "approaches": [
            {
                "name": "Compare every pair",
                "idea": "Start a group from each unused word, then scan the rest for anagrams of it.",
                "steps": [
                    "For each word that is not yet in a group, start a new list with it.",
                    "Sort its letters. That is the group's signature.",
                    "Scan later words. If a word sorts to the same signature, add it to this group.",
                    "Mark used words so they are not started again.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        List<List<String>> groups = new ArrayList<>();
        boolean[] used = new boolean[strs.length];
        for (int i = 0; i < strs.length; i++) {
            if (used[i]) continue;
            String key = signature(strs[i]);
            List<String> group = new ArrayList<>();
            group.add(strs[i]);
            used[i] = true;
            for (int j = i + 1; j < strs.length; j++) {
                if (!used[j] && signature(strs[j]).equals(key)) {
                    group.add(strs[j]);
                    used[j] = true;
                }
            }
            groups.add(group);
        }
        return groups;
    }

    private String signature(String s) {
        char[] letters = s.toCharArray();
        Arrays.sort(letters);
        return new String(letters);
    }
}
""",
                "time_complexity": "O(n² · k log k)",
                "time_why": "Each pair of the n words may be compared, and each comparison sorts k letters.",
                "space_complexity": "O(n · k)",
                "space_why": "The answer lists hold every word, and each signature is a copy of a word.",
                "when_to_use": "Say it. Do not code it when n is large.",
                "is_optimal": False,
            },
            {
                "name": "Sorted word as the key",
                "idea": "Sort the letters of each word. That sorted string is the map key for its group.",
                "steps": [
                    "Make a map from a string key to a list of words.",
                    "For each word, sort its letters and use that as the key.",
                    "Append the original word to the list for that key.",
                    "Return the map's lists. Order of groups does not matter.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        for (String word : strs) {
            char[] letters = word.toCharArray();
            Arrays.sort(letters);
            String key = new String(letters);
            map.computeIfAbsent(key, unused -> new ArrayList<>()).add(word);
        }
        return new ArrayList<>(map.values());
    }
}
""",
                "time_complexity": "O(n · k log k)",
                "time_why": "Each of the n words is sorted once. Sorting k letters costs k log k.",
                "space_complexity": "O(n · k)",
                "space_why": "The map stores every word, plus one sorted copy as the key.",
                "when_to_use": "Correct and quick to write. Mention the count-key version if they ask to drop the sort.",
                "is_optimal": False,
            },
            {
                "name": "Letter counts as the key",
                "idea": "Count a through z in 26 slots. The count row is the signature, so no sort is needed.",
                "steps": [
                    "Make a map from a signature string to a list of words.",
                    "For each word, count how many times each letter appears.",
                    "Turn the 26 counts into a key, with a mark between slots so 1,11 and 11,1 stay different.",
                    "Append the word to that key's list. Return the lists.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        for (String word : strs) {
            int[] count = new int[26];
            for (int i = 0; i < word.length(); i++) {
                count[word.charAt(i) - 'a']++;
            }
            StringBuilder key = new StringBuilder();
            for (int n : count) key.append(n).append('#');
            map.computeIfAbsent(key.toString(), unused -> new ArrayList<>()).add(word);
        }
        return new ArrayList<>(map.values());
    }
}
""",
                "time_complexity": "O(n · k)",
                "time_why": "Each of the n words is read once, and building the 26-slot key is a fixed extra pass.",
                "space_complexity": "O(n · k)",
                "space_why": "The map holds every word. Each key is 26 counts.",
                "when_to_use": "The version to aim for. Same idea as sorting, without paying k log k per word.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 'strs = ["eat","tea","tan","ate","nat","bat"]',
            "columns": ["word", "counts", "key already there?", "action"],
            "rows": [
                ["eat", "a1 e1 t1", "no", "start a list"],
                ["tea", "a1 e1 t1", "yes", "add to eat"],
                ["tan", "a1 n1 t1", "no", "start a list"],
                ["ate", "a1 e1 t1", "yes", "add to eat"],
                ["nat", "a1 n1 t1", "yes", "add to tan"],
                ["bat", "a1 b1 t1", "no", "start a list"],
            ],
            "result": "Three lists: eat/tea/ate, tan/nat, and bat.",
        },
        "mistakes": [
            {
                "name": "The Letter Set Trap",
                "wrong": "Using the set of letters as the key, so `aab` and `abb` look the same.",
                "right": "Counts matter. `aab` is two a and one b. `abb` is one a and two b.",
            },
            {
                "name": "Stuck counts in the key",
                "wrong": "Writing `1` then `11` with no mark, so `1,11` and `11,1` become the same string.",
                "right": "Put a mark between slots, for example `1#11#` versus `11#1#`.",
            },
            {
                "name": "Sorting the word list",
                "wrong": "Sorting `strs` itself and hoping neighbours are anagrams.",
                "right": "Anagrams do not sort next to each other as whole words. Key each word, not the array.",
            },
        ],
        "edge_cases": [
            {"input": '[""]', "expected": '[[""]]', "why": "One empty string is one group."},
            {"input": '["a"]', "expected": '[["a"]]', "why": "A single letter."},
            {"input": '["eat","tea","tan","ate","nat","bat"]', "expected": '[["eat","tea","ate"],["tan","nat"],["bat"]]', "why": "Three families, including a singleton."},
            {"input": '["ddddddddddg","dgggggggggg"]', "expected": '[["ddddddddddg"],["dgggggggggg"]]', "why": "Same letters, different counts."},
        ],
        "interview_script": [
            "I need to bundle strings that use the same letters the same number of times.",
            "I could start a group from each word and scan the rest. That is O(n² k log k) if I sort to compare.",
            "The key point: I put two words in the same bundle when they share one signature.",
            "I count each word's letters into 26 slots, turn that row into a key, and map the key to a list.",
            "That is O(n k) time and O(n k) space. I will test an empty string, a singleton, and two words that share letters but not counts.",
        ],
        "follow_ups": [
            {
                "question": "The alphabet is Unicode, not just a to z.",
                "answer": "Sort the letters for the key, or use a map from character to count. The 26-slot array no longer fits.",
            },
            {
                "question": "Return the groups in sorted order.",
                "answer": "Sort each inner list, then sort the outer list by the first word. The judge here accepts any order.",
            },
            {
                "question": "Can you avoid building a string key?",
                "answer": "A 26-int array does not hash in Java. Wrap it, or keep using a string. Sorting the word is simpler.",
            },
        ],
        "related_slugs": ["lc-242", "lc-438", "lc-49", "lc-567"],
    },
    {
        "slugs": ["lc-151"],
        "pattern": "Reverse in place",
        "trigger": "Reverse the order of the words in a string, and collapse extra spaces.",
        "summary": (
            "Reverse the whole character array, reverse each word, then drop extra spaces. "
            "Word order flips. Letters inside a word stay in order."
        ),
        "approaches": [
            {
                "name": "Peel the last word each time",
                "idea": "Find the last word, append it, then drop it from the remaining string. Repeat until nothing is left.",
                "steps": [
                    "Trim the remaining string so edge spaces are gone.",
                    "Find the last space. The slice after it is the next word to write.",
                    "Append that word to the answer, then drop it and trim again.",
                    "Stop when the remaining string is empty.",
                ],
                "code": """class Solution {
    public String reverseWords(String s) {
        StringBuilder out = new StringBuilder();
        String rest = s.trim();
        while (!rest.isEmpty()) {
            int i = rest.length() - 1;
            while (i >= 0 && rest.charAt(i) != ' ') i--;
            if (out.length() > 0) out.append(' ');
            out.append(rest.substring(i + 1));
            rest = i < 0 ? "" : rest.substring(0, i).trim();
        }
        return out.toString();
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each peel copies the remaining string. A long row of short words copies almost n characters each time.",
                "space_complexity": "O(n)",
                "space_why": "Each remaining-string copy can hold the whole input.",
                "when_to_use": "Say it. Then reverse in place so you do not recopy the tail.",
                "is_optimal": False,
            },
            {
                "name": "Reverse all, reverse words, compact",
                "idea": "Flip the whole array, flip each word back, then copy words with a single space.",
                "steps": [
                    "Copy s into a char array and reverse the whole array.",
                    "Walk it again and reverse each run of non-spaces. That restores letters inside a word.",
                    "Copy words into the front of the array with one space between them.",
                    "Return the filled prefix. Leading and trailing spaces are gone.",
                ],
                "code": """class Solution {
    public String reverseWords(String s) {
        char[] a = s.toCharArray();
        reverse(a, 0, a.length - 1);
        reverseEachWord(a);
        return compact(a);
    }

    private void reverse(char[] a, int i, int j) {
        while (i < j) {
            char tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
            i++;
            j--;
        }
    }

    private void reverseEachWord(char[] a) {
        int n = a.length, start = 0;
        while (start < n) {
            while (start < n && a[start] == ' ') start++;
            int end = start;
            while (end < n && a[end] != ' ') end++;
            reverse(a, start, end - 1);
            start = end;
        }
    }

    private String compact(char[] a) {
        int n = a.length, write = 0, read = 0;
        while (read < n) {
            while (read < n && a[read] == ' ') read++;
            if (read == n) break;
            if (write > 0) a[write++] = ' ';
            while (read < n && a[read] != ' ') a[write++] = a[read++];
        }
        return new String(a, 0, write);
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character is reversed a constant number of times, then copied once in compact.",
                "space_complexity": "O(n)",
                "space_why": "Java strings cannot be edited, so the char copy is the extra memory.",
                "when_to_use": "The version to aim for. On a mutable buffer this is the O(1)-extra-space follow-up.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "  hello world  "',
            "columns": ["step", "array", "note"],
            "rows": [
                ["reverse all", '"  dlrow olleh  "', "whole string flipped"],
                ["reverse word", '"  world olleh  "', "dlrow becomes world"],
                ["reverse word", '"  world hello  "', "olleh becomes hello"],
                ["compact", '"world hello"', "drop extra spaces"],
            ],
            "result": "The answer is \"world hello\".",
        },
        "mistakes": [
            {
                "name": "The One Space Trap",
                "wrong": "Calling `split(\" \")` and joining the pieces, so extra spaces become empty words.",
                "right": "Skip runs of spaces, or split on one or more spaces after a trim.",
            },
            {
                "name": "Reversing letters inside a word",
                "wrong": "Reversing the whole string and stopping there, so `hello` becomes `olleh`.",
                "right": "After the whole reverse, reverse each word so its letters go back to the original order.",
            },
            {
                "name": "Leaving edge spaces",
                "wrong": "Returning `\" world hello \"` with a space on an end.",
                "right": "Compact must skip leading and trailing spaces. The answer has none.",
            },
        ],
        "edge_cases": [
            {"input": '"the sky is blue"', "expected": '"blue is sky the"', "why": "Single spaces, several words."},
            {"input": '"  hello world  "', "expected": '"world hello"', "why": "Leading and trailing spaces."},
            {"input": '"a good   example"', "expected": '"example good a"', "why": "A run of spaces in the middle."},
            {"input": '"single"', "expected": '"single"', "why": "One word, nothing to flip."},
        ],
        "interview_script": [
            "I need the words in reverse order, with one space between them and no spaces on the ends.",
            "I could peel the last word and recopy the rest each time. That is O(n²).",
            "The version I aim for: reverse the whole char array, reverse each word, then compact extra spaces.",
            "I reverse twice so letters go back in order, but the word order flips.",
            "That is O(n) time. In Java I still copy the string, so space is O(n). I will test leading spaces, a run of spaces, and one word.",
        ],
        "follow_ups": [
            {
                "question": "The input is a mutable char array and extra memory must be O(1).",
                "answer": "The same three steps, written on that array. Compact in place, then the filled prefix is the answer.",
            },
            {
                "question": "Also reverse the letters inside each word.",
                "answer": "Only reverse the whole array, then compact. Skip the per-word reverse.",
            },
            {
                "question": "Words are separated by any whitespace, not only `' '`.",
                "answer": "Treat every whitespace the way this solution treats space. Confirm the set with the interviewer.",
            },
        ],
        "related_slugs": ["lc-189", "lc-206", "lc-71"],
    },
    {
        "slugs": ["lc-273"],
        "pattern": "Digit grouping",
        "trigger": "Convert a non-negative integer into English words.",
        "summary": (
            "Split the number into groups of three digits. "
            "Spell each group with one helper, and skip a group that is zero."
        ),
        "approaches": [
            {
                "name": "Spell from the largest scale",
                "idea": "Peel off billions, then millions, then thousands, then the last three digits.",
                "steps": [
                    "If the number is 0, return Zero.",
                    "If it is at least a billion, spell that many billions and drop them.",
                    "Do the same for millions and thousands.",
                    "Spell whatever is left below 1000. Trim extra spaces.",
                ],
                "code": """class Solution {
    private static final String[] BELOW_TWENTY = {
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
        "Eighteen", "Nineteen"
    };
    private static final String[] TENS = {
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    };

    public String numberToWords(int num) {
        if (num == 0) return "Zero";
        StringBuilder out = new StringBuilder();
        if (num >= 1000000000) {
            out.append(spell(num / 1000000000)).append(" Billion ");
            num %= 1000000000;
        }
        if (num >= 1000000) {
            out.append(spell(num / 1000000)).append(" Million ");
            num %= 1000000;
        }
        if (num >= 1000) {
            out.append(spell(num / 1000)).append(" Thousand ");
            num %= 1000;
        }
        if (num > 0) out.append(spell(num));
        return out.toString().trim();
    }

    private String spell(int value) {
        if (value == 0) return "";
        if (value < 20) return BELOW_TWENTY[value];
        if (value < 100) {
            String rest = spell(value % 10);
            return TENS[value / 10] + (rest.isEmpty() ? "" : " " + rest);
        }
        String rest = spell(value % 100);
        return BELOW_TWENTY[value / 100] + " Hundred" + (rest.isEmpty() ? "" : " " + rest);
    }
}
""",
                "time_complexity": "O(log n)",
                "time_why": "Each scale peels a group of digits. A number n has O(log n) digits.",
                "space_complexity": "O(log n)",
                "space_why": "The answer string holds one word per digit group.",
                "when_to_use": "Clear when talking through place values. The loop version is the same idea.",
                "is_optimal": False,
            },
            {
                "name": "Groups of three from the right",
                "idea": "Repeatedly take num % 1000, spell that group, and attach Thousand, Million, or Billion.",
                "steps": [
                    "If the number is 0, return Zero.",
                    "While num is positive, take the last three digits as a group.",
                    "If the group is not zero, spell it, add the scale word, and put it in front of the answer.",
                    "Divide num by 1000 and move to the next scale. Skip a zero group entirely.",
                ],
                "code": """class Solution {
    private static final String[] BELOW_TWENTY = {
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
        "Eighteen", "Nineteen"
    };
    private static final String[] TENS = {
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    };
    private static final String[] SCALES = {"", "Thousand", "Million", "Billion"};

    public String numberToWords(int num) {
        if (num == 0) return "Zero";
        StringBuilder out = new StringBuilder();
        int scale = 0;
        while (num > 0) {
            int group = num % 1000;
            if (group != 0) {
                StringBuilder part = new StringBuilder(spell(group));
                if (!SCALES[scale].isEmpty()) part.append(' ').append(SCALES[scale]);
                if (out.length() > 0) part.append(' ').append(out);
                out = part;
            }
            num /= 1000;
            scale++;
        }
        return out.toString();
    }

    private String spell(int value) {
        if (value == 0) return "";
        if (value < 20) return BELOW_TWENTY[value];
        if (value < 100) {
            String rest = spell(value % 10);
            return TENS[value / 10] + (rest.isEmpty() ? "" : " " + rest);
        }
        String rest = spell(value % 100);
        return BELOW_TWENTY[value / 100] + " Hundred" + (rest.isEmpty() ? "" : " " + rest);
    }
}
""",
                "time_complexity": "O(1)",
                "time_why": "At most four groups of three digits. The helper does a few lookups per group.",
                "space_complexity": "O(1)",
                "space_why": "Fixed word tables, and the built string is bounded by a 32-bit int.",
                "when_to_use": "The version to write. One helper, reused for every group of three.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "num = 1000010",
            "columns": ["group", "digits", "spelled", "scale", "kept?", "so far"],
            "rows": [
                ["ones", "010", "Ten", "(none)", "yes", "Ten"],
                ["thousands", "000", "", "Thousand", "no", "Ten"],
                ["millions", "1", "One", "Million", "yes", "One Million Ten"],
            ],
            "result": "The answer is \"One Million Ten\".",
        },
        "mistakes": [
            {
                "name": "The Zero Group Trap",
                "wrong": "Spelling a zero group as Zero Thousand, so 1000010 becomes One Million Zero Thousand Ten.",
                "right": "If the three digits are 0, add nothing. Skip that scale.",
            },
            {
                "name": "Teens as tens plus ones",
                "wrong": "Spelling 12 as Ten Two.",
                "right": "Anything below 20 is one lookup: Twelve, not Ten Two.",
            },
            {
                "name": "Extra spaces",
                "wrong": "Joining with a space even when a piece is empty, leaving a double space.",
                "right": "Only insert a space when the next piece is not empty. Trim the ends.",
            },
        ],
        "edge_cases": [
            {"input": "0", "expected": '"Zero"', "why": "Zero is the word, not an empty string."},
            {"input": "12", "expected": '"Twelve"', "why": "A teen is one word."},
            {"input": "20", "expected": '"Twenty"', "why": "A round ten has no ones word."},
            {"input": "100", "expected": '"One Hundred"', "why": "No tens or ones after Hundred."},
            {"input": "1000010", "expected": '"One Million Ten"', "why": "A hole in the thousands group."},
            {"input": "12345", "expected": '"Twelve Thousand Three Hundred Forty Five"', "why": "A teen group plus a hundreds group."},
        ],
        "interview_script": [
            "I need to spell a non-negative int in English, with no extra spaces.",
            "I could write a branch for every place value. That is long, easy to get wrong, and still O(log n) in the digits.",
            "I split the number into groups of three digits: billion, million, thousand, then the rest.",
            "I write one helper that spells a number below 1000, and I skip any group that is zero.",
            "A 32-bit int has at most four groups, so time and space are O(1). I will test 0, a teen, and a hole like one million ten.",
        ],
        "follow_ups": [
            {
                "question": "The number can be negative.",
                "answer": "If it is negative, write Negative and spell the rest as a positive. Watch Integer.MIN_VALUE.",
            },
            {
                "question": "Use And, as in British style.",
                "answer": "After Hundred, insert And when the rest of the group is not zero. Confirm with the interviewer.",
            },
            {
                "question": "What is the longest answer?",
                "answer": "A 32-bit max is a handful of words. That is why we call time and space O(1).",
            },
        ],
        "related_slugs": ["lc-8", "lc-43", "lc-50"],
    },
    {
        "slugs": ["lc-5"],
        "pattern": "Expand around center",
        "trigger": "Return the longest palindromic substring. On a tie, the leftmost one.",
        "summary": (
            "A palindrome grows from its center. "
            "Try every center, expand while the two sides match, and keep the longest leftmost run."
        ),
        "approaches": [
            {
                "name": "Check every substring",
                "idea": "Try every start and end. If that slice is a palindrome and longer than the best, keep it.",
                "steps": [
                    "For each start index i, try each end j >= i.",
                    "Walk inward to test whether s[i..j] reads the same both ways.",
                    "If it is a palindrome and longer than the best, store i and the new length.",
                    "Only update on a strictly longer slice, so a tie keeps the leftmost.",
                ],
                "code": """class Solution {
    public String longestPalindrome(String s) {
        int n = s.length(), bestStart = 0, bestLen = 1;
        for (int i = 0; i < n; i++) {
            for (int j = i; j < n; j++) {
                if (j - i + 1 > bestLen && palindrome(s, i, j)) {
                    bestStart = i;
                    bestLen = j - i + 1;
                }
            }
        }
        return s.substring(bestStart, bestStart + bestLen);
    }

    private boolean palindrome(String s, int left, int right) {
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) return false;
            left++;
            right--;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n³)",
                "time_why": "There are n² slices, and checking one slice walks up to n letters.",
                "space_complexity": "O(1)",
                "space_why": "Only the best start and length are stored.",
                "when_to_use": "Say it. Do not code it when n is 1000.",
                "is_optimal": False,
            },
            {
                "name": "Boolean table",
                "idea": "A slice is a palindrome when its ends match and the inside is already a palindrome.",
                "steps": [
                    "Make an n by n table. A single letter is a palindrome.",
                    "Fill by length. For length 2, only the two letters need to match.",
                    "For longer slices, ends must match and the inner cell must be true.",
                    "When a true cell is longer than the best, store its start. Ties keep the first start.",
                ],
                "code": """class Solution {
    public String longestPalindrome(String s) {
        int n = s.length();
        boolean[][] pal = new boolean[n][n];
        int bestStart = 0, bestLen = 1;
        for (int i = 0; i < n; i++) pal[i][i] = true;
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                if (s.charAt(i) == s.charAt(j) && (len == 2 || pal[i + 1][j - 1])) {
                    pal[i][j] = true;
                    if (len > bestLen) {
                        bestLen = len;
                        bestStart = i;
                    }
                }
            }
        }
        return s.substring(bestStart, bestStart + bestLen);
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each of the n² cells is filled once.",
                "space_complexity": "O(n²)",
                "space_why": "The table is n by n booleans.",
                "when_to_use": "Good to mention. The expand version is the same time with no table.",
                "is_optimal": False,
            },
            {
                "name": "Expand around a center",
                "idea": "Every palindrome has a center: a letter, or the gap between two letters. Expand while sides match.",
                "steps": [
                    "There are 2n - 1 centers: n letters and n - 1 gaps.",
                    "From each center, walk left and right while the letters match.",
                    "The length is right - left - 1 after the walk steps one past the palindrome.",
                    "If this length is strictly bigger than the best, store the new start. That keeps the leftmost.",
                ],
                "code": """class Solution {
    public String longestPalindrome(String s) {
        int bestStart = 0, bestLen = 1;
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
                "time_complexity": "O(n²)",
                "time_why": "Each of the 2n - 1 centers expands at most n steps.",
                "space_complexity": "O(1)",
                "space_why": "Only the two expand pointers and the best start and length.",
                "when_to_use": "The version to write. Same time as the table, no extra array.",
                "is_optimal": True,
            },
            {
                "name": "Manacher's algorithm",
                "idea": "One left-to-right pass works out how far the palindrome at every center reaches, reusing what the mirror center on the left already proved.",
                "steps": [
                    "Put a `#` between every pair of letters and at both ends, so odd and even palindromes alike sit on one center.",
                    "Walk the padded string from left to right, recording how far the palindrome at each center reaches.",
                    "Remember the palindrome that reaches furthest right so far. If the current center sits inside it, its mirror on the left gives a reach already safe to assume.",
                    "Push outward only from that safe reach. Keep the best center, updating only on a strictly bigger reach so a tie keeps the leftmost.",
                    "The best reach is the answer's length, and it starts at `(bestCenter - bestReach) / 2` in the original string.",
                ],
                "code": """class Solution {
    public String longestPalindrome(String s) {
        StringBuilder padded = new StringBuilder("#");
        for (char c : s.toCharArray()) {
            padded.append(c).append('#');
        }
        char[] t = padded.toString().toCharArray();
        int n = t.length;
        int[] reach = new int[n];
        int center = 0, right = 0, bestCenter = 0, bestReach = 0;
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
            if (reach[i] > bestReach) {
                bestReach = reach[i];
                bestCenter = i;
            }
        }
        int start = (bestCenter - bestReach) / 2;
        return s.substring(start, start + bestReach);
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "The right edge of the furthest palindrome only ever moves right, so the outward pushing costs n steps in total.",
                "space_complexity": "O(n)",
                "space_why": "The padded string and the reach array are each about twice the length of the input.",
                "when_to_use": "The real answer to 'can you do it in linear time'. The same pass also hands you the reach of every center, which counts all palindromic substrings with one extra line.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": 's = "cbbd"',
            "columns": ["center", "type", "expand", "length", "best"],
            "rows": [
                ["0", "odd", "c", "1", "c"],
                ["0|1", "even", "cb, stop", "0", "c"],
                ["1", "odd", "b", "1", "c"],
                ["1|2", "even", "bb", "2", "bb"],
                ["2", "odd", "b", "1", "bb"],
                ["2|3", "even", "bd, stop", "0", "bb"],
                ["3", "odd", "d", "1", "bb"],
            ],
            "result": "The answer is \"bb\".",
        },
        "mistakes": [
            {
                "name": "The Even Center Trap",
                "wrong": "Only expanding around a single letter, so `bb` in `cbbd` is never found.",
                "right": "Also expand from `(center, center + 1)`. Even palindromes sit on a gap.",
            },
            {
                "name": "Not the leftmost",
                "wrong": "Updating the answer when the new length is equal, so a later tie overwrites the first.",
                "right": "Update only when `len > bestLen`. A tie keeps the earlier start.",
            },
            {
                "name": "Building the slice in the loop",
                "wrong": "Calling `substring` on every expand, which copies letters over and over.",
                "right": "Store start and length. Build one substring at the end.",
            },
        ],
        "edge_cases": [
            {"input": '"a"', "expected": '"a"', "why": "One letter is a palindrome."},
            {"input": '"ac"', "expected": '"a"', "why": "Two different letters: the leftmost of length 1."},
            {"input": '"cbbd"', "expected": '"bb"', "why": "The longest is even."},
            {"input": '"aaaa"', "expected": '"aaaa"', "why": "The whole string is a palindrome."},
        ],
        "interview_script": [
            "I need the longest palindrome sitting inside s, and the leftmost one if there is a tie.",
            "I could try every substring and check it. That is O(n³).",
            "I treat every palindrome as having a center: a letter, or a gap between two letters. That is 2n - 1 centers.",
            "I expand from each center while the two sides match, and I keep the longest I have seen.",
            "That is O(n²) time and O(1) space. I will test one letter, two different letters, and an even case like cbbd.",
        ],
        "follow_ups": [
            {
                "question": "Count every palindromic substring, not the longest.",
                "answer": "The same expand. Add one to the count at each successful step. That is Palindromic Substrings.",
            },
            {
                "question": "Can this be O(n)?",
                "answer": "Manacher's algorithm finds every palindrome radius in one pass. Few interviews want it coded.",
            },
            {
                "question": "Longest palindromic subsequence, not substring.",
                "answer": "Letters no longer have to sit together. That is a different DP, related to longest common subsequence.",
            },
        ],
        "related_slugs": ["lc-125", "lc-647", "lc-131", "lc-680"],
    },
    {
        "slugs": ["lc-8"],
        "pattern": "String parsing",
        "trigger": "Parse a string into a 32-bit integer: spaces, an optional sign, then digits, then clamp.",
        "summary": (
            "Skip leading spaces, read one sign, then read digits. "
            "Check overflow before multiplying, and stop at the first non-digit."
        ),
        "approaches": [
            {
                "name": "Collect digits, then BigInteger",
                "idea": "Copy the digit run into a BigInteger, apply the sign, and clamp to 32-bit range.",
                "steps": [
                    "Skip leading spaces. If the string ends, return 0.",
                    "Read a + or - if it is there. Then read the run of digits.",
                    "If no digit was read, return 0.",
                    "Parse that run as a BigInteger, apply the sign, and clamp to Integer min and max.",
                ],
                "code": """import java.math.BigInteger;

class Solution {
    public int myAtoi(String s) {
        int i = 0, n = s.length();
        while (i < n && s.charAt(i) == ' ') i++;
        if (i == n) return 0;
        int sign = 1;
        if (s.charAt(i) == '+' || s.charAt(i) == '-') {
            sign = s.charAt(i) == '-' ? -1 : 1;
            i++;
        }
        int start = i;
        while (i < n && Character.isDigit(s.charAt(i))) i++;
        if (start == i) return 0;
        BigInteger value = new BigInteger(s.substring(start, i));
        if (sign < 0) value = value.negate();
        if (value.compareTo(BigInteger.valueOf(Integer.MAX_VALUE)) > 0) return Integer.MAX_VALUE;
        if (value.compareTo(BigInteger.valueOf(Integer.MIN_VALUE)) < 0) return Integer.MIN_VALUE;
        return value.intValue();
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character is read once, then the digit run is parsed once.",
                "space_complexity": "O(n)",
                "space_why": "The BigInteger holds a copy of the digit run, which can be the whole string.",
                "when_to_use": "Correct. If they want no library type, parse digit by digit.",
                "is_optimal": False,
            },
            {
                "name": "Digit by digit, clamp before multiply",
                "idea": "Build the number in an int. Before `result * 10 + digit`, check against MAX / 10.",
                "steps": [
                    "Skip leading spaces. Read one optional sign.",
                    "While the next character is a digit, turn it into 0 to 9.",
                    "If result is already over MAX / 10, or it equals MAX / 10 and the digit is over 7, clamp and stop.",
                    "Otherwise result = result * 10 + digit. At the end, apply the sign.",
                ],
                "code": """class Solution {
    public int myAtoi(String s) {
        int i = 0, n = s.length();
        while (i < n && s.charAt(i) == ' ') i++;
        if (i == n) return 0;
        int sign = 1;
        if (s.charAt(i) == '+' || s.charAt(i) == '-') {
            sign = s.charAt(i) == '-' ? -1 : 1;
            i++;
        }
        int result = 0;
        while (i < n && Character.isDigit(s.charAt(i))) {
            int digit = s.charAt(i) - '0';
            if (result > Integer.MAX_VALUE / 10
                    || (result == Integer.MAX_VALUE / 10 && digit > 7)) {
                return sign == 1 ? Integer.MAX_VALUE : Integer.MIN_VALUE;
            }
            result = result * 10 + digit;
            i++;
        }
        return result * sign;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character is looked at at most once: spaces, one sign, then digits.",
                "space_complexity": "O(1)",
                "space_why": "Only the index, the sign, and the running result.",
                "when_to_use": "The version to write. Overflow is decided before the multiply, not after.",
                "is_optimal": True,
            },
            {
                "name": "A state machine with named states",
                "idea": "Give the reader four named states and let each character say which state comes next, instead of hiding the rules in a chain of loops.",
                "steps": [
                    "Name the states: skipping spaces, just after a sign, inside the digits, and finished.",
                    "Read one character at a time and let the state you are in decide what that character means.",
                    "While skipping spaces: a space stays put, a sign moves to the sign state, a digit starts the number, anything else finishes.",
                    "Just after a sign only a digit may follow. Anything else finishes.",
                    "Inside the digits a digit is added to the running value and anything else finishes. Clamp as soon as the value passes the 32-bit edge.",
                ],
                "code": """class Solution {
    private enum State { SKIPPING, SIGNED, DIGITS, DONE }

    public int myAtoi(String s) {
        State state = State.SKIPPING;
        int sign = 1;
        long value = 0;
        for (int i = 0; i < s.length() && state != State.DONE; i++) {
            char c = s.charAt(i);
            switch (state) {
                case SKIPPING -> {
                    if (c == '+' || c == '-') {
                        sign = c == '-' ? -1 : 1;
                        state = State.SIGNED;
                    } else if (Character.isDigit(c)) {
                        value = c - '0';
                        state = State.DIGITS;
                    } else if (c != ' ') {
                        state = State.DONE;
                    }
                }
                case SIGNED -> {
                    if (Character.isDigit(c)) {
                        value = c - '0';
                        state = State.DIGITS;
                    } else {
                        state = State.DONE;
                    }
                }
                case DIGITS -> {
                    if (!Character.isDigit(c)) {
                        state = State.DONE;
                    } else {
                        value = value * 10 + (c - '0');
                        // 2147483648 is the size of the most negative 32-bit value.
                        long limit = sign == 1 ? Integer.MAX_VALUE : 2147483648L;
                        if (value > limit) {
                            value = limit;
                            state = State.DONE;
                        }
                    }
                }
                default -> {}
            }
        }
        return (int) (value * sign);
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character moves the machine on once, and the machine never goes back.",
                "space_complexity": "O(1)",
                "space_why": "Only the current state, the sign, and the running value, held in a long so the clamp can be checked.",
                "when_to_use": "When the format grows: a decimal point, an exponent, a hex prefix. Each addition is one more state and its moves, not another branch buried in the loop, which is how real number readers are written.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": 's = "   -42"',
            "columns": ["index", "char", "action", "sign", "result"],
            "rows": [
                ["0", "space", "skip", "1", "0"],
                ["1", "space", "skip", "1", "0"],
                ["2", "space", "skip", "1", "0"],
                ["3", "-", "read sign", "-1", "0"],
                ["4", "4", "result = 4", "-1", "4"],
                ["5", "2", "result = 42", "-1", "42"],
                ["end", "", "apply sign", "-1", "-42"],
            ],
            "result": "The answer is -42.",
        },
        "mistakes": [
            {
                "name": "The After Multiply Trap",
                "wrong": "Doing `result * 10 + digit` first, then noticing it wrapped past MAX.",
                "right": "Compare `result` to `Integer.MAX_VALUE / 10` before multiplying. Digit 8 or 9 at that edge also clamps.",
            },
            {
                "name": "Words before digits",
                "wrong": "Scanning until the first digit, so `words and 987` becomes 987.",
                "right": "After spaces and one sign, the next character must be a digit. If not, return 0.",
            },
            {
                "name": "Sign in the middle",
                "wrong": "Accepting `+-12` as -12, or treating a second sign as part of the number.",
                "right": "At most one sign, and only right after the spaces. Then only digits count.",
            },
        ],
        "edge_cases": [
            {"input": '"42"', "expected": "42", "why": "Digits only."},
            {"input": '"   -42"', "expected": "-42", "why": "Leading spaces and a minus."},
            {"input": '"4193 with words"', "expected": "4193", "why": "Stop at the first non-digit."},
            {"input": '"words and 987"', "expected": "0", "why": "No digits after the optional sign."},
            {"input": '"-91283472332"', "expected": "-2147483648", "why": "Overflow clamps to Integer.MIN_VALUE."},
            {"input": '"+1"', "expected": "1", "why": "A leading plus is a valid sign.",},
        ],
        "interview_script": [
            "I need to read optional spaces, one sign, then digits, and clamp to 32-bit range.",
            "I walk past spaces, read a + or - if it is there, then read digits until a non-digit. A big-integer parse is extra O(n) work I do not need.",
            "The key point: I check overflow before I multiply, against Integer.MAX_VALUE / 10.",
            "If the next digit would overflow, I return MAX or MIN depending on the sign.",
            "That is one pass: O(n) time and O(1) space. I will test leading words, a lone plus, and a number that overflows.",
        ],
        "follow_ups": [
            {
                "question": "What counts as whitespace?",
                "answer": "This spec is only `' '`. Do not skip tabs unless the interviewer says so.",
            },
            {
                "question": "Decimals, like `3.14`.",
                "answer": "Stop at the dot, so this would return 3. A full float parse is a different problem.",
            },
            {
                "question": "The digit run can be 200 characters.",
                "answer": "Do not store it in a `long`. Clamp on the way, or the wrap gives a wrong answer.",
            },
        ],
        "related_slugs": ["lc-43", "lc-227", "lc-273"],
    },
]
