"""Hash map and frequency-count problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-1"],
        "pattern": "Hash map",
        "trigger": "Two indices whose values add to a target, and exactly one pair exists.",
        "summary": (
            "Walk once. For each value, look up target minus that value in a map of earlier indices. "
            "On a hit, return those two indices; otherwise store this value and keep going."
        ),
        "approaches": [
            {
                "name": "Try every pair",
                "idea": "Check every pair of distinct indices and return the pair that adds to target.",
                "steps": [
                    "Pick each index i as the first of a pair.",
                    "Pick a later index j.",
                    "If the two values add to the target, return [i, j].",
                ],
                "code": """class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) return new int[] {i, j};
            }
        }
        return new int[0];
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every pair of indices is added once.",
                "space_complexity": "O(1)",
                "space_why": "Only the two answer indices are stored.",
                "when_to_use": "Say it first, in one sentence. Do not code it when n is 10^4.",
                "is_optimal": False,
            },
            {
                "name": "Map of value to index",
                "idea": "The partner of nums[i] is target - nums[i]. Ask the map if that partner was already seen.",
                "steps": [
                    "Keep a map: value to the index where it was seen.",
                    "For each i, let need be target - nums[i].",
                    "If need is in the map, return that index and i.",
                    "Otherwise store the current value at its index and continue.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) return new int[] {seen.get(need), i};
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is stored once and looked up once.",
                "space_complexity": "O(n)",
                "space_why": "The map holds earlier values.",
                "when_to_use": "The version to write. One pass, and it keeps the original indices.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [3,2,4], target = 6",
            "columns": ["i", "value", "need", "seen", "hit?"],
            "rows": [
                ["0", "3", "3", "{}", "no, store 3 at 0"],
                ["1", "2", "4", "{3:0}", "no, store 2 at 1"],
                ["2", "4", "2", "{3:0, 2:1}", "yes, index 1"],
            ],
            "result": "The answer is [1, 2].",
        },
        "mistakes": [
            {
                "name": "Using the same index twice",
                "wrong": "Storing the value before looking up, so 3 + 3 uses index 0 twice when target is 6.",
                "right": "Look up first, then store. The partner must be a different earlier index.",
            },
            {
                "name": "Returning the values",
                "wrong": "Returning [nums[i], nums[j]].",
                "right": "Return the indices.",
            },
            {
                "name": "Filling the map first",
                "wrong": "Putting every value in the map, then looking up, so a value can pair with itself.",
                "right": "One pass: look up, then insert. That also handles two equal values at two indices.",
            },
        ],
        "edge_cases": [
            {"input": "[2,7,11,15]\n9", "expected": "[0,1]", "why": "The pair is at the front."},
            {"input": "[3,2,4]\n6", "expected": "[1,2]", "why": "Must not pair 3 with itself."},
            {"input": "[3,3]\n6", "expected": "[0,1]", "why": "Two equal values at two indices."},
            {"input": "[0,4,3,0]\n0", "expected": "[0,3]", "why": "Zeros that add to zero."},
        ],
        "interview_script": [
            "So I need two different indices whose values add to target. Exactly one pair exists.",
            "The obvious way is to try every pair. That is O(n²), because I add every pair once.",
            "The key point: for each value I already know the partner, target minus that value.",
            "So I keep a map of value to index. I look up the partner first, then I store the current value.",
            "That is one pass: O(n) time and O(n) space. I will test two equal values and a case that must not reuse one index.",
        ],
        "follow_ups": [
            {
                "question": "The array is already sorted.",
                "answer": "Two pointers from the ends. O(n) time and O(1) extra space. That is Two Sum II.",
            },
            {
                "question": "Return the values, not the indices.",
                "answer": "Same map, or two pointers after sorting. Sorting is fine when indices are not needed.",
            },
            {
                "question": "Three values that add to target.",
                "answer": "Sort, peg one index, two-pointer the rest. O(n²). That is 3Sum.",
            },
        ],
        "related_slugs": ["lc-167", "lc-15", "pair-target"],
    },
    {
        "slugs": ["lc-128"],
        "pattern": "Hash set",
        "trigger": "Longest run of consecutive integers, and the values need not sit next to each other in the array.",
        "summary": (
            "Put the values in a set. Only start a run at a number whose predecessor is missing, then walk forward. "
            "Each run is walked once, so the inner loop does not make the cost quadratic."
        ),
        "approaches": [
            {
                "name": "Sort, then scan",
                "idea": "After sorting, consecutive values sit next to each other. Walk once and skip duplicates.",
                "steps": [
                    "If the array is empty, return 0.",
                    "Sort a copy of the values.",
                    "Walk left to right. Equal values do not break a run; skip them.",
                    "If this value is one more than the last, grow the run. Otherwise start a new run of length 1.",
                    "Keep the longest run.",
                ],
                "code": """import java.util.*;

class Solution {
    public int longestConsecutive(int[] nums) {
        if (nums.length == 0) return 0;
        int[] sorted = nums.clone();
        Arrays.sort(sorted);
        int best = 1, run = 1;
        for (int i = 1; i < sorted.length; i++) {
            if (sorted[i] == sorted[i - 1]) continue;
            if (sorted[i] == sorted[i - 1] + 1) run++;
            else run = 1;
            best = Math.max(best, run);
        }
        return best;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting the n values dominates. The later scan is one pass.",
                "space_complexity": "O(n)",
                "space_why": "A copy is sorted so the input is left unchanged.",
                "when_to_use": "Fine if O(n log n) is allowed. The follow-up asks for linear time, so keep going.",
                "is_optimal": False,
            },
            {
                "name": "Set, start only at a run's head",
                "idea": "A run has a unique start: the value whose predecessor is not in the set.",
                "steps": [
                    "Put every value in a set, so duplicates collapse.",
                    "For each value, if value - 1 is in the set, skip it. It is not a start.",
                    "If value - 1 is missing, walk value + 1, value + 2, and so on while those values are in the set.",
                    "The walk length is a candidate for the best.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(n)",
                "time_why": "Each value is inserted once, and each value is walked at most once from a start.",
                "space_complexity": "O(n)",
                "space_why": "The set holds the distinct values.",
                "when_to_use": "The version to write when they ask for linear time.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [100,4,200,1,3,2]",
            "columns": ["value", "value-1", "action", "run", "best"],
            "rows": [
                ["100", "missing", "walk 100", "1", "1"],
                ["4", "present", "skip, not a start", "-", "1"],
                ["200", "missing", "walk 200", "1", "1"],
                ["1", "missing", "walk 1,2,3,4", "4", "4"],
                ["3", "present", "skip, not a start", "-", "4"],
                ["2", "present", "skip, not a start", "-", "4"],
            ],
            "result": "The answer is 4.",
        },
        "mistakes": [
            {
                "name": "Starting a run at every value",
                "wrong": "From every number, walking forward in the set.",
                "right": "Only start when value - 1 is missing. That is what keeps the total walk O(n).",
            },
            {
                "name": "Treating duplicates as a break",
                "wrong": "After sorting, resetting the run when two neighbours are equal.",
                "right": "Equal values are the same number. Skip them and keep the run.",
            },
            {
                "name": "Wanting neighbours in the array",
                "wrong": "Looking only at nums[i] and nums[i+1] without sorting or a set.",
                "right": "Consecutive means the integers themselves, not the positions.",
            },
        ],
        "edge_cases": [
            {"input": "[]", "expected": "0", "why": "Empty input. The loop never starts a run."},
            {"input": "[1]", "expected": "1", "why": "A single value is a run of length 1."},
            {"input": "[1,2,0,1]", "expected": "3", "why": "Duplicates must not break the run 0,1,2."},
            {"input": "[100,4,200,1,3,2]", "expected": "4", "why": "The classic 1,2,3,4 run beside two loners."},
        ],
        "interview_script": [
            "I need the length of the longest run of consecutive values, not consecutive positions.",
            "I could sort and then scan. That is O(n log n), and I have to skip duplicates.",
            "The key point: I only start a run at a value whose predecessor is missing.",
            "So I put the values in a set. I walk forward only from those starts, and I never re-walk a run.",
            "That is O(n) time and O(n) space. I will test empty, a single value, and duplicates inside a run.",
        ],
        "follow_ups": [
            {
                "question": "Return the run itself, not just its length.",
                "answer": "When best improves, remember the start value. At the end the run is start, start+1, ... for best steps.",
            },
            {
                "question": "The values use a huge range. Is a boolean array better?",
                "answer": "No. A set of the n values stays O(n). A table over the value range would not fit.",
            },
            {
                "question": "Can you do this in O(1) extra space?",
                "answer": "Sorting in place is O(n log n) time and O(1) extra if the input may be changed. Linear time needs the set.",
            },
        ],
        "related_slugs": ["lc-41", "lc-268", "missing-range-value"],
    },
    {
        "slugs": ["lc-217"],
        "pattern": "Hash set",
        "trigger": "Return true if any value appears at least twice.",
        "summary": (
            "Add each value to a set as you go. If an add fails, that value was already there, so a duplicate exists."
        ),
        "approaches": [
            {
                "name": "Compare every pair",
                "idea": "For each index, scan the rest of the array for the same value.",
                "steps": [
                    "Pick each index i as the first of a pair.",
                    "Pick a later index j.",
                    "If the two values are equal, return true.",
                    "If no pair matches, return false.",
                ],
                "code": """class Solution {
    public boolean containsDuplicate(int[] nums) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] == nums[j]) return true;
            }
        }
        return false;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each pair of indices is compared once.",
                "space_complexity": "O(1)",
                "space_why": "No extra structure.",
                "when_to_use": "Say it. Do not code it when n is 10^5.",
                "is_optimal": False,
            },
            {
                "name": "Sort, then check neighbours",
                "idea": "After sorting, equal values sit next to each other.",
                "steps": [
                    "Sort a copy of the array.",
                    "Walk each pair of neighbours after the sort.",
                    "If two neighbours are equal, return true.",
                    "If the scan ends, return false.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        int[] sorted = nums.clone();
        Arrays.sort(sorted);
        for (int i = 1; i < sorted.length; i++) {
            if (sorted[i] == sorted[i - 1]) return true;
        }
        return false;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Sorting the n values dominates. The later scan is one pass.",
                "space_complexity": "O(n)",
                "space_why": "A copy is sorted so the input is left unchanged.",
                "when_to_use": "If a set's extra memory is a concern. Name the slower time.",
                "is_optimal": False,
            },
            {
                "name": "Set of seen values",
                "idea": "A set add fails exactly when the value was already present.",
                "steps": [
                    "Keep a set of values already seen.",
                    "For each value, try to add it.",
                    "If the add returns false, return true.",
                    "If every add succeeds, return false.",
                ],
                "code": """import java.util.*;

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
                "time_complexity": "O(n)",
                "time_why": "Each value is inserted at most once.",
                "space_complexity": "O(n)",
                "space_why": "The set holds the distinct values seen so far.",
                "when_to_use": "The version to write. Say the extra memory out loud; that is the trade-off.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,2,3,1]",
            "columns": ["value", "seen", "add", "return"],
            "rows": [
                ["1", "{}", "yes", "keep going"],
                ["2", "{1}", "yes", "keep going"],
                ["3", "{1,2}", "yes", "keep going"],
                ["1", "{1,2,3}", "no", "true"],
            ],
            "result": "The answer is true.",
        },
        "mistakes": [
            {
                "name": "Sorting in place without asking",
                "wrong": "Calling Arrays.sort(nums) when the caller still needs the original order.",
                "right": "Sort a copy, or use a set and leave the array alone.",
            },
            {
                "name": "Comparing only neighbours in the unsorted array",
                "wrong": "Checking nums[i] == nums[i+1] without sorting.",
                "right": "Duplicates need not be adjacent until you sort, or you use a set.",
            },
            {
                "name": "Building the whole set first",
                "wrong": "Inserting every value, then asking if size is less than n.",
                "right": "That works, but returning on the first failed add can stop early.",
            },
        ],
        "edge_cases": [
            {"input": "[1]", "expected": "false", "why": "One value cannot be a duplicate."},
            {"input": "[1,2,3,1]", "expected": "true", "why": "The repeat is not adjacent."},
            {"input": "[1,2,3,4]", "expected": "false", "why": "All distinct."},
            {"input": "[1,1]", "expected": "true", "why": "The shortest true case."},
        ],
        "interview_script": [
            "I need to know if any value appears twice.",
            "I could compare every pair. That is O(n²), so I will not code it at 10^5.",
            "I could sort and check neighbours in O(n log n), which uses little extra memory.",
            "The version I write uses a set. If an add fails, I return true.",
            "That is O(n) time and O(n) space. I will test one value, no duplicates, and a repeat that is not adjacent.",
        ],
        "follow_ups": [
            {
                "question": "You may not use extra memory.",
                "answer": "Sort in place and scan neighbours. O(n log n) time, O(1) extra if the input may be changed.",
            },
            {
                "question": "Return true only if some value appears at least k times.",
                "answer": "A map of counts. Return true when a count reaches k.",
            },
            {
                "question": "Return true if a duplicate sits at most k apart.",
                "answer": "A sliding window set of the last k values. That is Contains Duplicate II.",
            },
        ],
        "related_slugs": ["lc-26", "lc-136", "lc-169"],
    },
    {
        "slugs": ["lc-242"],
        "pattern": "Frequency count",
        "trigger": "Return true if one string is an anagram of the other.",
        "summary": (
            "If the lengths differ, they cannot match. Count each letter of s up and of t down. "
            "All 26 slots must end at zero."
        ),
        "approaches": [
            {
                "name": "Sort both strings",
                "idea": "Anagrams become the same string once their letters are sorted.",
                "steps": [
                    "If the lengths differ, return false.",
                    "Copy both strings to char arrays and sort them.",
                    "Return whether the two arrays are equal.",
                ],
                "code": """import java.util.*;

class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        char[] a = s.toCharArray();
        char[] b = t.toCharArray();
        Arrays.sort(a);
        Arrays.sort(b);
        return Arrays.equals(a, b);
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Each string of length n is sorted.",
                "space_complexity": "O(n)",
                "space_why": "Two char copies are sorted.",
                "when_to_use": "Correct and short. Fine if n is small. Counting is faster.",
                "is_optimal": False,
            },
            {
                "name": "Count 26 letters",
                "idea": "Anagrams use each letter the same number of times.",
                "steps": [
                    "If the lengths differ, return false.",
                    "Keep an int array of size 26.",
                    "For each index, add one for s.charAt(i) and subtract one for t.charAt(i).",
                    "If any slot is not zero, return false. Otherwise return true.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Each letter of s and t is read once, then 26 slots are checked.",
                "space_complexity": "O(1)",
                "space_why": "The count array has a fixed 26 slots.",
                "when_to_use": "The version to write for lowercase English. Ask about the alphabet first.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "rat", t = "car"',
            "columns": ["after", "a", "c", "r", "t"],
            "rows": [
                ["start", "0", "0", "0", "0"],
                ["s: r, t: c", "0", "-1", "1", "0"],
                ["s: a, t: a", "0", "-1", "1", "0"],
                ["s: t, t: r", "0", "-1", "0", "1"],
                ["scan", "0", "-1", "0", "1"],
            ],
            "result": "Slots c and t are not zero, so the answer is false.",
        },
        "mistakes": [
            {
                "name": "Skipping the length check",
                "wrong": "Counting without comparing lengths, then hoping the scan catches it.",
                "right": "Different lengths cannot be anagrams. Return false first. It also keeps the two loops in lockstep.",
            },
            {
                "name": "Comparing as sets",
                "wrong": "Putting letters in a set, so aabb and ab look the same.",
                "right": "Counts matter, not just which letters appear.",
            },
            {
                "name": "Assuming Unicode",
                "wrong": "Indexing with `c - 'a'` on letters outside a-z, which can crash.",
                "right": "Ask the alphabet. Lowercase English gets 26 slots. Anything else needs a map.",
            },
        ],
        "edge_cases": [
            {"input": '"a"\n"a"', "expected": "true", "why": "The shortest true case."},
            {"input": '"a"\n"ab"', "expected": "false", "why": "Different lengths."},
            {"input": '"anagram"\n"nagaram"', "expected": "true", "why": "A true anagram."},
            {"input": '"rat"\n"car"', "expected": "false", "why": "Same length, different counts."},
            {"input": '"ab"\n"ba"', "expected": "true", "why": "A swap of two letters."},
        ],
        "interview_script": [
            "I need to know if t is a rearrangement of s.",
            "I could sort both strings and compare. That is O(n log n).",
            "The key point: I only need the letter counts to match.",
            "So I count letters in s up and in t down. If every slot ends at zero, they match.",
            "That is O(n) time and O(1) space for 26 letters. I will test different lengths, a true anagram, and a near miss.",
        ],
        "follow_ups": [
            {
                "question": "The strings can hold Unicode.",
                "answer": "Use a HashMap from character to count, same increment and decrement. Space grows with distinct letters.",
            },
            {
                "question": "Do this with only one extra integer.",
                "answer": "Not for a full alphabet. A bitset only tracks presence, not counts, so aabb and ab would collide.",
            },
            {
                "question": "Group many words that are anagrams of each other.",
                "answer": "Same count (or sorted word) becomes the map key. That is Group Anagrams.",
            },
        ],
        "related_slugs": ["lc-49", "lc-438", "anagram-bundles"],
    },
    {
        "slugs": ["lc-347"],
        "pattern": "Frequency count",
        "trigger": "Return the k values that appear most often. Order does not matter, and the answer is unique.",
        "summary": (
            "Count how often each value appears. Put values into buckets indexed by that count. "
            "Read the buckets from high count down until you have k values."
        ),
        "approaches": [
            {
                "name": "Count, then sort",
                "idea": "Count each value, then sort the distinct values by count and take the first k.",
                "steps": [
                    "Count how often each value appears.",
                    "Copy the distinct values into a list.",
                    "Sort that list so higher counts come first.",
                    "Return the first k values.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> counts = new HashMap<>();
        for (int value : nums) counts.put(value, counts.getOrDefault(value, 0) + 1);
        List<Integer> values = new ArrayList<>(counts.keySet());
        values.sort((a, b) -> counts.get(b) - counts.get(a));
        int[] out = new int[k];
        for (int i = 0; i < k; i++) out[i] = values.get(i);
        return out;
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Counting is O(n). Sorting up to n distinct values is O(n log n).",
                "space_complexity": "O(n)",
                "space_why": "The map and the list of distinct values.",
                "when_to_use": "Say it. Fine when k is close to n. A heap or buckets beat it when k is small.",
                "is_optimal": False,
            },
            {
                "name": "Count, then a min-heap of size k",
                "idea": "Keep only k values in a min-heap ordered by count, so the weakest of the current best sits on top.",
                "steps": [
                    "Count how often each value appears.",
                    "Push each distinct value into a min-heap ordered by count.",
                    "If the heap grows past k, drop the top (lowest count).",
                    "The heap now holds the k most frequent values. Copy them out.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> counts = new HashMap<>();
        for (int value : nums) counts.put(value, counts.getOrDefault(value, 0) + 1);
        PriorityQueue<Integer> heap = new PriorityQueue<>(
            (a, b) -> counts.get(a) - counts.get(b)
        );
        for (int value : counts.keySet()) {
            heap.offer(value);
            if (heap.size() > k) heap.poll();
        }
        int[] out = new int[k];
        for (int i = 0; i < k; i++) out[i] = heap.poll();
        return out;
    }
}
""",
                "time_complexity": "O(n log k)",
                "time_why": "Each distinct value is offered to a heap of size k.",
                "space_complexity": "O(n)",
                "space_why": "The map holds every distinct value. The heap holds k more.",
                "when_to_use": "A strong interview answer when they want heap practice. Buckets still win on time.",
                "is_optimal": False,
            },
            {
                "name": "Bucket by count",
                "idea": "A count cannot exceed n, so an array of n+1 lists can hold values by frequency.",
                "steps": [
                    "Count how often each value appears.",
                    "Make n+1 empty buckets. Put each value into buckets[count].",
                    "Walk buckets from index n down to 1.",
                    "Copy values into the answer until k are filled.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> counts = new HashMap<>();
        for (int value : nums) counts.put(value, counts.getOrDefault(value, 0) + 1);
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
                "time_complexity": "O(n)",
                "time_why": "Counting, placing, and reading buckets each touch n items at most.",
                "space_complexity": "O(n)",
                "space_why": "The map and n+1 buckets hold the distinct values.",
                "when_to_use": "The version to aim for. Same extra memory as the map, and no log factor.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,1,1,2,2,3], k = 2",
            "columns": ["stage", "where", "k left", "out"],
            "rows": [
                ["count done", "{1:3, 2:2, 3:1}", "2", "[]"],
                ["place 1", "bucket[3] gets 1", "2", "[]"],
                ["place 2", "bucket[2] gets 2", "2", "[]"],
                ["place 3", "bucket[1] gets 3", "2", "[]"],
                ["read freq 3", "take 1", "1", "[1]"],
                ["read freq 2", "take 2", "0", "[1,2]"],
            ],
            "result": "The answer is [1, 2].",
        },
        "mistakes": [
            {
                "name": "Max-heap of size n",
                "wrong": "Pushing every value into a max-heap and popping k times.",
                "right": "To keep the k highest counts, use a min-heap of size k so the weakest of the best sits on top.",
            },
            {
                "name": "Bucket index off by one",
                "wrong": "Allocating n buckets and writing to index n when one value fills the array.",
                "right": "Counts run from 1 to n, so allocate n+1 lists and index by count.",
            },
            {
                "name": "Sorting the original array",
                "wrong": "Sorting nums and counting runs, then taking k run lengths.",
                "right": "That can work, but a map of counts does not need the array sorted and keeps the values themselves.",
            },
        ],
        "edge_cases": [
            {"input": "[1]\n1", "expected": "[1]", "why": "One value, k is 1."},
            {"input": "[1,1,1,2,2,3]\n2", "expected": "[1,2]", "why": "The usual k=2 case."},
            {"input": "[4,1,-1,2,-1,2,3]\n2", "expected": "[-1,2]", "why": "Negatives, and two values tied at the top."},
            {"input": "[1,2,3]\n3", "expected": "[1,2,3]", "why": "k equals the number of distinct values."},
        ],
        "interview_script": [
            "I need the k values that appear most often. Order does not matter.",
            "I count first. Then I could sort every distinct value by count. That is O(n log n).",
            "I could also keep a min-heap of size k, which is O(n log k).",
            "The key point: a count cannot exceed n, so I can bucket values by their count.",
            "I fill n+1 buckets, then I read from the high end until I have k values.",
            "That is O(n) time and O(n) space. I will test k=1, k equal to the distinct count, and negatives.",
        ],
        "follow_ups": [
            {
                "question": "The stream is huge and k is small. You cannot store all counts.",
                "answer": "Then you are in approximation territory (Count-Min, lossy counting). The exact heap needs the counts.",
            },
            {
                "question": "Return the values in order of frequency.",
                "answer": "Read the buckets from high to low as now. Ties inside one bucket can be left as they are, or sorted.",
            },
            {
                "question": "What if two values can share the k-th count?",
                "answer": "This problem says the answer is unique. If not, the prompt must say how to break ties.",
            },
        ],
        "related_slugs": ["lc-215", "lc-973", "lc-895"],
    },
    {
        "slugs": ["lc-49"],
        "pattern": "Hash map",
        "trigger": "Group strings that are anagrams of one another. Order of groups does not matter.",
        "summary": (
            "Anagrams share a key: the sorted word, or a 26-slot letter count. "
            "Group words in a map from that key to a list."
        ),
        "approaches": [
            {
                "name": "Sorted word as the key",
                "idea": "Sorting the letters of a word makes one key that every anagram of it shares.",
                "steps": [
                    "For each word, copy its letters, sort them, and use that as a map key.",
                    "Append the original word to the list for that key.",
                    "Return the lists. Sorting each list makes the output stable for tests.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String word : strs) {
            char[] chars = word.toCharArray();
            Arrays.sort(chars);
            String key = new String(chars);
            groups.computeIfAbsent(key, x -> new ArrayList<>()).add(word);
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
                "time_complexity": "O(n·k log k)",
                "time_why": "Each of n words of length k is sorted.",
                "space_complexity": "O(n·k)",
                "space_why": "The map stores every word, plus a key of length k per group.",
                "when_to_use": "The usual interview answer. Fast enough unless words are long.",
                "is_optimal": False,
            },
            {
                "name": "Letter-count key",
                "idea": "A 26-slot count is the same for every anagram, and it is built in linear time.",
                "steps": [
                    "For each word, count its letters in 26 slots.",
                    "Turn that count into a string key, with a mark between slots so 1,11 does not collide with 11,1.",
                    "Append the word to the list for that key.",
                    "Return the lists, sorting each list so tests match in any group order.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String word : strs) {
            int[] counts = new int[26];
            for (int i = 0; i < word.length(); i++) counts[word.charAt(i) - 'a']++;
            StringBuilder key = new StringBuilder();
            for (int n : counts) key.append(n).append('#');
            groups.computeIfAbsent(key.toString(), x -> new ArrayList<>()).add(word);
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
                "time_complexity": "O(n·k)",
                "time_why": "Each of n words of length k is counted once. Building a 26-slot key is constant per word.",
                "space_complexity": "O(n·k)",
                "space_why": "The map stores every word and one key per group.",
                "when_to_use": "The version to aim for when words are long. Same grouping idea, no sort per word.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 'strs = ["eat","tea","tan","ate","nat","bat"]',
            "columns": ["word", "count key", "that group"],
            "rows": [
                ["eat", "a1 e1 t1", "eat"],
                ["tea", "a1 e1 t1", "eat, tea"],
                ["tan", "a1 n1 t1", "tan"],
                ["ate", "a1 e1 t1", "eat, tea, ate"],
                ["nat", "a1 n1 t1", "tan, nat"],
                ["bat", "a1 b1 t1", "bat"],
            ],
            "result": "The groups are [ate, eat, tea], [nat, tan], and [bat].",
        },
        "mistakes": [
            {
                "name": "Using a set of letters as the key",
                "wrong": "Keying on the distinct letters, so aab and ab land in the same group.",
                "right": "Counts (or the fully sorted word) must be part of the key.",
            },
            {
                "name": "Gluing counts without a mark",
                "wrong": "Keying with 111, so one 1 and eleven 1s collide with eleven and one.",
                "right": "Put a mark between slots, like 1#11#, or write the letter next to its count.",
            },
            {
                "name": "Mutating the word in place",
                "wrong": "Sorting the word's own characters and storing that, so the output letters are scrambled.",
                "right": "Sort a copy for the key. Append the original word to the list.",
            },
        ],
        "edge_cases": [
            {"input": '[""]', "expected": '[[""]]', "why": "One empty string is its own group."},
            {"input": '["a"]', "expected": '[["a"]]', "why": "One letter."},
            {"input": '["eat","tea","tan","ate","nat","bat"]', "expected": '[["bat"],["nat","tan"],["ate","eat","tea"]]', "why": "Three groups, two of them with more than one word."},
            {"input": '["","",""]', "expected": '[["","",""]]', "why": "Several empties share one key."},
        ],
        "interview_script": [
            "I need to group words that use the same letters. Order of groups does not matter.",
            "I could sort each word and use that as a map key. That is O(n k log k) if words have length k.",
            "The key point: I can build a 26-slot count in linear time, and every anagram shares it.",
            "So I turn each count into a key, append the original word to that list, then I return the lists.",
            "That is O(n k) time. I will test empty strings, one word, and a mix of groups.",
        ],
        "follow_ups": [
            {
                "question": "Words can hold Unicode.",
                "answer": "The count array is gone. Use a map from character to count, then a canonical string of those pairs as the key.",
            },
            {
                "question": "Group words that are rotations of each other, not anagrams.",
                "answer": "A different key: s+s contains the other word as a substring, or the smallest rotation.",
            },
            {
                "question": "Must the groups come out in a given order?",
                "answer": "This problem allows any order. If a judge is strict, sort each group and sort the list of groups.",
            },
        ],
        "related_slugs": ["lc-242", "lc-438", "anagram-bundles"],
    },
    {
        "slugs": ["lc-560"],
        "pattern": "Prefix sum",
        "trigger": "Count how many contiguous subarrays sum to k. Values may be negative, so a shrinking window does not work.",
        "summary": (
            "Every slice sum is a difference of two prefix sums. "
            "Store how many times each prefix has appeared, and add the count of current minus k."
        ),
        "approaches": [
            {
                "name": "Every start and end",
                "idea": "From each left index, grow right and add. Each running sum is one subarray.",
                "steps": [
                    "Pick a start index i.",
                    "Set sum to 0.",
                    "Walk j from i to the end, adding nums[j] to sum.",
                    "Each time sum equals k, add one to the answer.",
                ],
                "code": """class Solution {
    public int subarraySum(int[] nums, int k) {
        int count = 0;
        for (int i = 0; i < nums.length; i++) {
            int sum = 0;
            for (int j = i; j < nums.length; j++) {
                sum += nums[j];
                if (sum == k) count++;
            }
        }
        return count;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every start re-adds every value to its right.",
                "space_complexity": "O(1)",
                "space_why": "Only the running sum and the answer are stored.",
                "when_to_use": "Say it first. Do not code it when n is 2·10^4.",
                "is_optimal": False,
            },
            {
                "name": "Prefix counts in a map",
                "idea": "A slice nums[i..j] sums to k exactly when prefix[j] - prefix[i-1] equals k.",
                "steps": [
                    "Keep a map: prefix sum to how many times it has appeared. Start it at 0 seen once.",
                    "Walk left to right, adding each value to prefix.",
                    "Add the map's count of prefix - k to the answer. Those earlier prefixes close a slice of sum k.",
                    "Then record the current prefix in the map.",
                ],
                "code": """import java.util.*;

class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>();
        seen.put(0, 1);
        int prefix = 0, count = 0;
        for (int value : nums) {
            prefix += value;
            count += seen.getOrDefault(prefix - k, 0);
            seen.put(prefix, seen.getOrDefault(prefix, 0) + 1);
        }
        return count;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value updates prefix once and hits the map twice.",
                "space_complexity": "O(n)",
                "space_why": "The map holds one entry per distinct prefix so far.",
                "when_to_use": "The version to write. Mention that a window fails once negatives appear.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [1,-1,0], k = 0",
            "columns": ["value", "prefix", "prefix-k", "seen", "add", "count"],
            "rows": [
                ["1", "1", "1", "{0:1}", "0", "0"],
                ["-1", "0", "0", "{0:1, 1:1}", "1", "1"],
                ["0", "0", "0", "{0:2, 1:1}", "2", "3"],
            ],
            "result": "The three slices are [1,-1], [1,-1,0], and [0]. The answer is 3.",
        },
        "mistakes": [
            {
                "name": "Using a sliding window",
                "wrong": "Growing and shrinking a window as if sums only increase.",
                "right": "Negatives break that. Prefix sums plus a map work for any sign.",
            },
            {
                "name": "Forgetting to seed 0",
                "wrong": "Starting with an empty map, so a prefix that already equals k is missed.",
                "right": "Put 0 seen once. That counts slices that start at index 0.",
            },
            {
                "name": "Recording the prefix too soon",
                "wrong": "Inserting the current prefix before looking up prefix - k.",
                "right": "Look up first, then insert. Otherwise a k of 0 counts an empty slice at every step.",
            },
        ],
        "edge_cases": [
            {"input": "[1,1,1]\n2", "expected": "2", "why": "Two overlapping slices of length 2."},
            {"input": "[1,2,3]\n3", "expected": "2", "why": "[1,2] and [3]."},
            {"input": "[1,-1,0]\n0", "expected": "3", "why": "Zeros and negatives. Three slices sum to 0."},
            {"input": "[0,0]\n0", "expected": "3", "why": "[0], [0], and [0,0]."},
            {"input": "[3]\n3", "expected": "1", "why": "The whole array. Relies on seeding 0."},
        ],
        "interview_script": [
            "I need the number of contiguous slices whose values add to k.",
            "I could start at every index and grow right, adding as I go. That is O(n²).",
            "The key point: I can turn a slice sum into a difference of two prefix sums.",
            "So I store how many times each prefix has appeared. For the current prefix, I add the count of prefix minus k.",
            "That is O(n) time and O(n) space. I seed the map with 0 seen once, so a prefix that equals k counts. I will test zeros, negatives, and k equal to 0.",
        ],
        "follow_ups": [
            {
                "question": "All values are positive.",
                "answer": "Then a shrinking window works too, for the shortest slice. For a count of slices, the prefix map still works.",
            },
            {
                "question": "Count slices whose sum is a multiple of k.",
                "answer": "Map prefix % k, not prefix. Watch negatives in Java modulo. That is Continuous Subarray Sum.",
            },
            {
                "question": "Return one such slice, not the count.",
                "answer": "Store the first index where each prefix appeared, instead of a count. On a hit, the slice is that index + 1 to here.",
            },
        ],
        "related_slugs": ["lc-53", "lc-209", "lc-152"],
    },
]
