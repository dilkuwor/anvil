"""Two pointer problems. See SOLUTION_GUIDE.md in this folder."""

from __future__ import annotations

SOLUTIONS: list[dict] = [
    {
        "slugs": ["lc-11", "widest-water-basin"],
        "pattern": "Two pointers",
        "trigger": "Pick two lines that hold the most water, or any best pair where width fights height.",
        "summary": (
            "Start with the widest tank. The water stops at the shorter wall, so only the shorter wall steps inward. "
            "Moving the taller wall only loses width."
        ),
        "approaches": [
            {
                "name": "Try every pair of walls",
                "idea": "For each left wall, try every right wall and keep the biggest area.",
                "steps": [
                    "Pick a left index i.",
                    "Pick a right index j > i.",
                    "Area is min(height[i], height[j]) times (j - i).",
                    "Keep the largest area.",
                ],
                "code": """class Solution {
    public int maxArea(int[] height) {
        int best = 0;
        for (int i = 0; i < height.length; i++) {
            for (int j = i + 1; j < height.length; j++) {
                int area = Math.min(height[i], height[j]) * (j - i);
                best = Math.max(best, area);
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Every pair of walls is measured once.",
                "space_complexity": "O(1)",
                "space_why": "Only the best area is stored.",
                "when_to_use": "Say it. Do not code it when n is large.",
                "is_optimal": False,
            },
            {
                "name": "Shrink from both ends",
                "idea": "Start widest. The shorter wall is the bottleneck, so only that wall steps in.",
                "steps": [
                    "Set left at 0 and right at the last index.",
                    "Area is min of the two heights times the width.",
                    "If the left wall is shorter, step left inward. Otherwise step right inward.",
                    "Stop when the two pointers meet. Keep the best area.",
                ],
                "code": """class Solution {
    public int maxArea(int[] height) {
        int left = 0, right = height.length - 1, best = 0;
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
                "time_complexity": "O(n)",
                "time_why": "Left only moves right and right only moves left, so each wall is left at most once.",
                "space_complexity": "O(1)",
                "space_why": "Only the two pointers and the best area are stored.",
                "when_to_use": "The version to write. One pass from the ends.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "height = [1,8,6,2,5,4,8,3,7]",
            "columns": ["left", "right", "short wall", "width", "area", "move"],
            "rows": [
                ["0", "8", "1 vs 7", "8", "8", "left is shorter, left++"],
                ["1", "8", "8 vs 7", "7", "49", "right is shorter, right--"],
                ["1", "7", "8 vs 3", "6", "18", "right--"],
                ["1", "6", "8 vs 8", "5", "40", "tie, right--"],
                ["1", "5", "8 vs 4", "4", "16", "right--"],
            ],
            "result": "The best area is 49, from walls at 1 and 8.",
        },
        "mistakes": [
            {
                "name": "The Taller Wall Trap",
                "wrong": "Moving the taller wall because it looks more promising.",
                "right": "Never move the taller wall. The tank gets narrower and the water still stops at the shorter wall, so it can only hold less.",
            },
            {
                "name": "Using max of the two heights",
                "wrong": "Area = max(left, right) * width.",
                "right": "Water spills over the shorter wall, so use min.",
            },
            {
                "name": "Off-by-one width",
                "wrong": "Using right - left + 1 as the width.",
                "right": "The walls sit at the indices. The width is right - left.",
            },
        ],
        "edge_cases": [
            {"input": "[1,1]", "expected": "1", "why": "Two walls of height 1."},
            {"input": "[1,8,6,2,5,4,8,3,7]", "expected": "49", "why": "The usual wide tank."},
            {"input": "[4,3,2,1,4]", "expected": "16", "why": "Equal end walls, width 4."},
            {"input": "[1,2]", "expected": "1", "why": "Two walls, width 1."},
        ],
        "interview_script": [
            "I need two lines that hold the most water.",
            "I could try every pair in O(n²). That is slow.",
            "I start at the widest tank. Water stops at the shorter wall, so only that wall is worth moving.",
            "I step the shorter pointer inward and keep the best area.",
            "That is O(n) time and O(1) space. I will test two walls and the usual [1,8,...,7] case.",
        ],
        "follow_ups": [
            {
                "question": "You must pick k lines, not two.",
                "answer": "That is a different problem. The two-pointer shrink does not extend to k.",
            },
            {
                "question": "The ground between the walls is not flat.",
                "answer": "Then it is trapping rain water: fill from both ends using the lower side's max.",
            },
            {
                "question": "Print the two indices, not the area.",
                "answer": "When best improves, also store left and right.",
            },
        ],
        "related_slugs": ["lc-42", "lc-167", "lc-15"],
    },
    {
        "slugs": ["lc-15"],
        "pattern": "Sort + two pointers",
        "trigger": "All different triplets that add up to a target, in a list that may hold repeats.",
        "summary": (
            "Sort first. Push a peg into one number, then squeeze two pointers over the rest: "
            "too small, the left pointer steps right; too big, the right pointer steps left."
        ),
        "approaches": [
            {
                "name": "Try every triple",
                "idea": "Check every three distinct indices, keep unique sorted triples that sum to 0.",
                "steps": [
                    "Loop i, j, k with i < j < k.",
                    "If the three values sum to 0, put them in a sorted triple.",
                    "Store triples in a set so duplicates collapse.",
                    "Copy the set into the answer list.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Set<List<Integer>> unique = new LinkedHashSet<>();
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    if (nums[i] + nums[j] + nums[k] == 0) {
                        List<Integer> t = Arrays.asList(nums[i], nums[j], nums[k]);
                        t.sort(Integer::compareTo);
                        unique.add(t);
                    }
                }
            }
        }
        List<List<Integer>> out = new ArrayList<>(unique);
        out.sort((a, b) -> {
            for (int i = 0; i < 3; i++) if (!a.get(i).equals(b.get(i))) return a.get(i) - b.get(i);
            return 0;
        });
        return out;
    }
}
""",
                "time_complexity": "O(n³)",
                "time_why": "Every triple of indices is added once.",
                "space_complexity": "O(n)",
                "space_why": "The set of unique triples. Sorting each triple is extra work, not extra input space.",
                "when_to_use": "Say it. Do not code it.",
                "is_optimal": False,
            },
            {
                "name": "Peg plus two pointers",
                "idea": "After sorting, fix one value and two-sum the rest to the opposite.",
                "steps": [
                    "Sort the array.",
                    "For each index i, skip it if nums[i] is the same as nums[i-1].",
                    "Set left = i+1 and right at the end. Move them like two-sum toward -nums[i].",
                    "On a hit, store the triple and skip duplicate left and right values.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        for (int i = 0; i + 2 < nums.length; i++) {
            if (nums[i] > 0) break;
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int left = i + 1, right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum < 0) left++;
                else if (sum > 0) right--;
                else {
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
                "time_complexity": "O(n²)",
                "time_why": "After the O(n log n) sort, each peg walks the rest of the row once.",
                "space_complexity": "O(1)",
                "space_why": "Besides the output, only the two pointers are stored. Sorting is in place.",
                "when_to_use": "The version to write. Sort, then peg and squeeze.",
                "is_optimal": True,
            },
            {
                "name": "Hash set for the third number",
                "idea": "Pin the first value, then walk the rest keeping a set of what you have passed; the third number is fixed by the other two, so a lookup decides it.",
                "steps": [
                    "Sort the array, so repeats sit together and each triple comes out in rising order.",
                    "For each first value, skip it if it matches the value before it, and start with an empty set.",
                    "Walk the values after it. For a second value, the third must be `-(first + second)`.",
                    "If that third number is already in the set, record the triple, then step past any copy of the second value.",
                    "Add the second value to the set and carry on.",
                ],
                "code": """import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        for (int i = 0; i + 2 < nums.length; i++) {
            if (nums[i] > 0) break;
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            Set<Integer> seen = new HashSet<>();
            for (int j = i + 1; j < nums.length; j++) {
                int third = -(nums[i] + nums[j]);
                if (seen.contains(third)) {
                    out.add(List.of(nums[i], third, nums[j]));
                    while (j + 1 < nums.length && nums[j] == nums[j + 1]) j++;
                }
                seen.add(nums[j]);
            }
        }
        return out;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each pinned value walks the rest of the row once, and a set lookup costs the same each time.",
                "space_complexity": "O(n)",
                "space_why": "The set can grow to hold every value after the pinned one.",
                "when_to_use": "When you have already written Two Sum with a hash map: this is that same lookup with one value pinned in front, so there is nothing new to work out under pressure. Reach for it when you are unsure which pointer to move.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [-1,0,1,2,-1,-4]",
            "columns": ["sorted", "peg i", "left", "right", "sum", "action"],
            "rows": [
                ["-4,-1,-1,0,1,2", "0 (-4)", "1", "5", "-3", "too small, left++"],
                ["-4,-1,-1,0,1,2", "1 (-1)", "2", "5", "0", "hit [-1,-1,2], skip dups"],
                ["-4,-1,-1,0,1,2", "1 (-1)", "3", "4", "0", "hit [-1,0,1]"],
                ["-4,-1,-1,0,1,2", "3 (0)", "4", "5", "3", "too big, and i stops soon"],
            ],
            "result": "The unique triples are [-1,-1,2] and [-1,0,1].",
        },
        "mistakes": [
            {
                "name": "The Duplicate Triplet Trap",
                "wrong": "Starting the peg, or a pointer after a hit, on a value it has just used.",
                "right": "Never start the peg, or a pointer after a find, on a value it has just used. A triplet may still use the same value twice, like [-1, -1, 2].",
            },
            {
                "name": "Not sorting first",
                "wrong": "Two-pointer on an unsorted row.",
                "right": "The move (left++ when too small) only works after a sort.",
            },
            {
                "name": "Using the peg twice",
                "wrong": "Setting left = i, so the same index is used twice.",
                "right": "left starts at i + 1. Three distinct indices.",
            },
        ],
        "edge_cases": [
            {"input": "[-1,0,1,2,-1,-4]", "expected": "[[-1,-1,2],[-1,0,1]]", "why": "The usual case with a repeated -1."},
            {"input": "[0,1,1]", "expected": "[]", "why": "No triple sums to 0."},
            {"input": "[0,0,0]", "expected": "[[0,0,0]]", "why": "Three zeros are one unique triple."},
            {"input": "[-2,0,1,1,2]", "expected": "[[-2,0,2],[-2,1,1]]", "why": "Two triples share the same first value."},
        ],
        "interview_script": [
            "I need every unique triple that sums to zero.",
            "I could try every three indices in O(n³), then drop duplicate triples.",
            "I sort first, peg one value, and two-sum the rest to its opposite.",
            "I skip a peg or a pointer that repeats the value I just used, so triples stay unique.",
            "That is O(n²) time. I will test three zeros, no answer, and a repeated -1.",
        ],
        "follow_ups": [
            {
                "question": "4Sum.",
                "answer": "Peg two values, then two-pointer the rest. O(n³) after the sort.",
            },
            {
                "question": "The target is not zero.",
                "answer": "Same loop: two-sum the rest to target - nums[i].",
            },
            {
                "question": "Return the count of triples, not the triples.",
                "answer": "Same skip rules, increment a counter on a hit instead of storing.",
            },
        ],
        "related_slugs": ["lc-16", "lc-167", "lc-1"],
    },
    {
        "slugs": ["lc-42", "valley-rain"],
        "pattern": "Two pointers",
        "trigger": "How much water stays on uneven ground, or any amount held in from both sides.",
        "summary": (
            "Two walls close in from the ends. The side with the lower wall is safe to fill, "
            "because water only ever stands as high as the lower wall."
        ),
        "approaches": [
            {
                "name": "Max on both sides of each bar",
                "idea": "Water on bar i is min(tallest left, tallest right) minus height[i], if that is positive.",
                "steps": [
                    "For each index i, scan 0..i for the max height on the left.",
                    "Scan i..n-1 for the max on the right.",
                    "Add the trapped water: max(0, min(leftMax, rightMax) - height[i]).",
                ],
                "code": """class Solution {
    public int trap(int[] height) {
        int total = 0, n = height.length;
        for (int i = 0; i < n; i++) {
            int leftMax = 0, rightMax = 0;
            for (int j = 0; j <= i; j++) leftMax = Math.max(leftMax, height[j]);
            for (int j = i; j < n; j++) rightMax = Math.max(rightMax, height[j]);
            total += Math.max(0, Math.min(leftMax, rightMax) - height[i]);
        }
        return total;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each bar re-scans the whole row for the two maxes.",
                "space_complexity": "O(1)",
                "space_why": "Only the two maxes and the total are stored.",
                "when_to_use": "Say it to show the formula. Then precompute the maxes or use two pointers.",
                "is_optimal": False,
            },
            {
                "name": "Fill from the lower side",
                "idea": "The lower of the two end walls is a safe ceiling. Fill that side and step it in.",
                "steps": [
                    "Set left and right at the ends. Track leftMax and rightMax.",
                    "If height[left] is smaller than height[right], the left side is safe.",
                    "Raise the left max, add leftMax - height[left], then step left forward.",
                    "Otherwise do the same on the right. Never fill from the higher side.",
                ],
                "code": """class Solution {
    public int trap(int[] height) {
        int left = 0, right = height.length - 1;
        int leftMax = 0, rightMax = 0, total = 0;
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
                "time_complexity": "O(n)",
                "time_why": "Each bar is visited once as left or right moves inward.",
                "space_complexity": "O(1)",
                "space_why": "Only the two pointers, two maxes, and the total are stored.",
                "when_to_use": "The version to write. Same idea as precomputed max arrays, no extra arrays.",
                "is_optimal": True,
            },
            {
                "name": "Monotonic stack, one flat layer at a time",
                "idea": "Hold the bars on a stack while they keep getting shorter; the moment a taller bar arrives it closes a dip, and that dip is paid off as one flat layer.",
                "steps": [
                    "Go left to right. Keep a stack of bar positions whose heights only fall as you look down it.",
                    "While the new bar is taller than the bar on top, pop that top. The popped bar is the floor of a dip.",
                    "The dip's walls are the new bar and whatever is on top now. If the stack is empty there is no left wall, so stop popping.",
                    "Add width times depth: width is the gap between the two walls, depth is the lower wall minus the floor.",
                    "Push the new bar and carry on. Whatever is left on the stack at the end holds nothing.",
                ],
                "code": """import java.util.*;

class Solution {
    public int trap(int[] height) {
        Deque<Integer> falling = new ArrayDeque<>();
        int total = 0;
        for (int i = 0; i < height.length; i++) {
            while (!falling.isEmpty() && height[i] > height[falling.peek()]) {
                int floor = falling.pop();
                if (falling.isEmpty()) break;
                int leftWall = falling.peek();
                int width = i - leftWall - 1;
                int depth = Math.min(height[leftWall], height[i]) - height[floor];
                total += width * depth;
            }
            falling.push(i);
        }
        return total;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Every bar is pushed once and popped at most once.",
                "space_complexity": "O(n)",
                "space_why": "The stack holds every bar when the heights only fall, as in [5,4,3,2,1].",
                "when_to_use": "When the water is counted layer by layer instead of column by column, which is what a follow-up about pouring or draining in stages wants. It is also the bridge to Largest Rectangle in Histogram: the same falling stack, popped the same way.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "height = [4,2,0,3,2,5]",
            "columns": ["left", "right", "leftMax", "rightMax", "add", "total"],
            "rows": [
                ["0", "5", "4", "5", "left 4 < right 5, add 0, left++", "0"],
                ["1", "5", "4", "5", "left 2 < 5, add 4-2=2", "2"],
                ["2", "5", "4", "5", "left 0 < 5, add 4-0=4", "6"],
                ["3", "5", "4", "5", "left 3 < 5, add 4-3=1", "7"],
                ["4", "5", "4", "5", "left 2 < 5, add 4-2=2", "9"],
            ],
            "result": "The answer is 9.",
        },
        "mistakes": [
            {
                "name": "The Spill Trap",
                "wrong": "Filling from the side with the higher wall.",
                "right": "Never fill from the side with the higher wall: water that high could spill over the lower wall. Always move the side whose wall is lower.",
            },
            {
                "name": "Not including the bar in its own max",
                "wrong": "leftMax from 0..i-1 only, so a peak bar subtracts below zero.",
                "right": "Update leftMax with height[left] before adding. A peak adds 0.",
            },
            {
                "name": "Two extra arrays and forgetting the min",
                "wrong": "Adding leftMax[i] - height[i] without taking min with rightMax[i].",
                "right": "Water height is min of the two sides.",
            },
        ],
        "edge_cases": [
            {"input": "[0,1,0,2,1,0,1,3,2,1,2,1]", "expected": "6", "why": "The usual skyline."},
            {"input": "[4,2,0,3,2,5]", "expected": "9", "why": "A deep well."},
            {"input": "[4,2,3]", "expected": "1", "why": "A small dip of 1."},
            {"input": "[1,0,1]", "expected": "1", "why": "One unit sits between two walls of height 1."},
        ],
        "interview_script": [
            "I need how much water sits on the bars after rain.",
            "I could, for each bar, scan for the tallest bar on each side. That is O(n²).",
            "I use that water at a bar is min of the two side maxes, minus the bar.",
            "I close in from both ends and only fill the lower side, which is safe.",
            "That is O(n) time and O(1) space. I will test a flat dip and the usual skyline.",
        ],
        "follow_ups": [
            {
                "question": "The bars have different widths.",
                "answer": "Multiply the trapped height by that bar's width when you add.",
            },
            {
                "question": "A 2D height map.",
                "answer": "That is Trapping Rain Water II: a min-heap of the border, grow inward.",
            },
            {
                "question": "Return the water above each bar, not the total.",
                "answer": "Store leftMax[i] and rightMax[i] in two arrays, then min - height at each i.",
            },
        ],
        "related_slugs": ["lc-11", "lc-84", "lc-15"],
    },
    {
        "slugs": ["lc-125"],
        "pattern": "Two pointers",
        "trigger": "Is this string a palindrome after dropping punctuation and ignoring case.",
        "summary": (
            "Two pointers walk inward. Skip any character that is not a letter or a digit. "
            "Compare the rest in lowercase."
        ),
        "approaches": [
            {
                "name": "Clean a copy, then check",
                "idea": "Build a new string of lowercase letters and digits, then compare it to its reverse.",
                "steps": [
                    "Walk s and keep only letters and digits, in lowercase, in a StringBuilder.",
                    "Set two pointers on that builder.",
                    "If any pair differs, return false. Otherwise true.",
                ],
                "code": """class Solution {
    public boolean isPalindrome(String s) {
        StringBuilder cleaned = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isLetterOrDigit(c)) cleaned.append(Character.toLowerCase(c));
        }
        int left = 0, right = cleaned.length() - 1;
        while (left < right) {
            if (cleaned.charAt(left++) != cleaned.charAt(right--)) return false;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character is read once to build the copy, then compared at most once.",
                "space_complexity": "O(n)",
                "space_why": "The cleaned copy can hold every character.",
                "when_to_use": "Correct. If they ask for O(1) extra space, skip the copy.",
                "is_optimal": False,
            },
            {
                "name": "Skip in place",
                "idea": "Walk the original string. Jump over junk, then compare.",
                "steps": [
                    "Set left at 0 and right at the last index.",
                    "Advance left while it is not a letter or digit. Do the same for right, moving in.",
                    "Compare lowercase. If they differ, return false.",
                    "Step both inward. An empty cleaned string is true.",
                ],
                "code": """class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) return false;
            left++;
            right--;
        }
        return true;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each character is visited at most a couple of times.",
                "space_complexity": "O(1)",
                "space_why": "Only the two pointers.",
                "when_to_use": "The version to write. No extra string.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "A man, a plan, a canal: Panama"',
            "columns": ["left char", "right char", "equal?", "action"],
            "rows": [
                ["A", "a", "yes", "step in"],
                ["m", "m", "yes", "step in"],
                ["a", "a", "yes", "skip spaces and punctuation as we go"],
                ["n", "n", "yes", "continue"],
                ["p", "p", "yes", "still matching"],
            ],
            "result": "Every pair matches, so the answer is true.",
        },
        "mistakes": [
            {
                "name": "The Junk Trap",
                "wrong": "Comparing commas and spaces as if they counted.",
                "right": "Only letters and digits count. Skip the rest.",
            },
            {
                "name": "Case",
                "wrong": "Comparing 'A' and 'a' as different.",
                "right": "Lowercase both before comparing.",
            },
            {
                "name": "Empty after cleaning",
                "wrong": "Returning false on a string of only spaces.",
                "right": "Zero letters is a palindrome. Return true.",
            },
        ],
        "edge_cases": [
            {"input": '"A man, a plan, a canal: Panama"', "expected": "true", "why": "The usual phrase."},
            {"input": '"race a car"', "expected": "false", "why": "Not a palindrome."},
            {"input": '" "', "expected": "true", "why": "Only a space."},
            {"input": '"0P"', "expected": "false", "why": "A digit and a letter are not the same after lowercasing."},
        ],
        "interview_script": [
            "I need to know if s is a palindrome after dropping junk and ignoring case.",
            "I could build a cleaned string and reverse it. That is O(n) time and O(n) space.",
            "I walk from both ends on the original string and skip anything that is not a letter or digit.",
            "I compare lowercase. If a pair differs, I return false.",
            "That is O(n) time and O(1) space. I will test a space-only string and a case mix.",
        ],
        "follow_ups": [
            {
                "question": "Unicode letters.",
                "answer": "Character.isLetterOrDigit still works for many scripts. Confirm the alphabet with the interviewer.",
            },
            {
                "question": "You may delete at most one character.",
                "answer": "On the first mismatch, try skipping left or skipping right. That is Valid Palindrome II.",
            },
            {
                "question": "The string is a linked list of characters.",
                "answer": "Find the middle, reverse the second half, compare. O(n) time, O(1) space.",
            },
        ],
        "related_slugs": ["lc-680", "lc-234", "lc-5"],
    },
    {
        "slugs": ["lc-16"],
        "pattern": "Sort + two pointers",
        "trigger": "Three values whose sum is closest to a target. Exactly one such sum exists.",
        "summary": (
            "Sort, peg one value, two-pointer the rest. "
            "Track the sum whose distance to the target is smallest."
        ),
        "approaches": [
            {
                "name": "Try every triple",
                "idea": "Compute every three-sum and keep the one nearest the target.",
                "steps": [
                    "Start best at the first three values.",
                    "Loop over every triple of indices i < j < k.",
                    "If this sum is nearer the target than best, replace best.",
                ],
                "code": """class Solution {
    public int threeSumClosest(int[] nums, int target) {
        int best = nums[0] + nums[1] + nums[2];
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    int sum = nums[i] + nums[j] + nums[k];
                    if (Math.abs(sum - target) < Math.abs(best - target)) best = sum;
                }
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n³)",
                "time_why": "Every triple is added once.",
                "space_complexity": "O(1)",
                "space_why": "Only best is stored.",
                "when_to_use": "Say it. Then sort and two-pointer.",
                "is_optimal": False,
            },
            {
                "name": "Peg plus two pointers",
                "idea": "After a sort, move the pair toward the target and remember the closest sum.",
                "steps": [
                    "Sort. Set best to the first three.",
                    "For each i, two-pointer the rest.",
                    "If this sum is nearer, keep it. If it equals target, return it.",
                    "If the sum is too small, step the left pointer. If it is too big, step the right pointer.",
                ],
                "code": """import java.util.*;

class Solution {
    public int threeSumClosest(int[] nums, int target) {
        Arrays.sort(nums);
        int best = nums[0] + nums[1] + nums[2];
        for (int i = 0; i + 2 < nums.length; i++) {
            int left = i + 1, right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (Math.abs(sum - target) < Math.abs(best - target)) best = sum;
                if (sum == target) return sum;
                if (sum < target) left++;
                else right--;
            }
        }
        return best;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "After the sort, each peg walks the rest once.",
                "space_complexity": "O(1)",
                "space_why": "Sorting is in place. Only best and the two pointers are extra.",
                "when_to_use": "The version to write. Same skeleton as 3Sum.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [-1,2,1,-4], target = 1",
            "columns": ["sorted", "peg", "left", "right", "sum", "best"],
            "rows": [
                ["-4,-1,1,2", "-4", "-1", "2", "-3", "-3"],
                ["-4,-1,1,2", "-4", "1", "2", "-1", "-1"],
                ["-4,-1,1,2", "-1", "1", "2", "2", "2"],
                ["done", "-", "-", "-", "-", "2 is 1 away, closer than -1"],
            ],
            "result": "The answer is 2.",
        },
        "mistakes": [
            {
                "name": "The Distance Trap",
                "wrong": "Keeping the sum that is larger, not the one nearer the target.",
                "right": "Compare Math.abs(sum - target).",
            },
            {
                "name": "Not seeding best",
                "wrong": "Starting best at 0, which may not be a real triple.",
                "right": "Seed with nums[0]+nums[1]+nums[2]. The problem promises n >= 3.",
            },
            {
                "name": "Stopping at the first sum over the target",
                "wrong": "Returning as soon as sum > target.",
                "right": "A later peg can still get closer. Only return early on an exact hit.",
            },
        ],
        "edge_cases": [
            {"input": "[-1,2,1,-4]\n1", "expected": "2", "why": "Closest is 2, not -1."},
            {"input": "[0,0,0]\n1", "expected": "0", "why": "Only one triple."},
            {"input": "[1,1,1,0]\n-100", "expected": "2", "why": "All sums sit far above a tiny target."},
            {"input": "[0,1,2]\n0", "expected": "3", "why": "The only triple is 0+1+2, so the closest sum is 3."},
        ],
        "interview_script": [
            "I need the three-sum closest to target. Exactly one such sum exists.",
            "I could try every triple in O(n³).",
            "I sort, peg one value, and two-pointer the rest, tracking the nearest sum.",
            "I only stop early if I hit the target exactly.",
            "That is O(n²) time. I will test all zeros and a target far from every sum.",
        ],
        "follow_ups": [
            {
                "question": "Return the triple, not the sum.",
                "answer": "When best improves, also store the three values.",
            },
            {
                "question": "k-sum closest.",
                "answer": "Peg k-2 values, two-pointer the last two. Cost grows fast.",
            },
            {
                "question": "Several triples share the same distance.",
                "answer": "The problem says exactly one closest sum, so you do not have to break ties.",
            },
        ],
        "related_slugs": ["lc-15", "lc-167", "lc-1"],
    },
    {
        "slugs": ["lc-167"],
        "pattern": "Two pointers on a sorted row",
        "trigger": "A sorted array and two values that add to a target. Return 1-based indices.",
        "summary": (
            "Left at the start, right at the end. Too small, move left; too big, move right. "
            "The sort makes that move safe."
        ),
        "approaches": [
            {
                "name": "Map of value to index",
                "idea": "Same as unsorted two-sum: store values as you walk.",
                "steps": [
                    "Keep a map of value to 1-based index.",
                    "For each number, look up target minus it.",
                    "On a hit, return those two 1-based indices.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] twoSum(int[] numbers, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < numbers.length; i++) {
            int need = target - numbers[i];
            if (seen.containsKey(need)) return new int[] {seen.get(need), i + 1};
            seen.put(numbers[i], i + 1);
        }
        return new int[0];
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each value is stored and looked up once.",
                "space_complexity": "O(n)",
                "space_why": "The map holds earlier values.",
                "when_to_use": "Works, but ignores the sort. They want O(1) extra space.",
                "is_optimal": False,
            },
            {
                "name": "Two pointers from the ends",
                "idea": "Because the row is sorted, a too-small sum must grow from the left, a too-big sum must shrink from the right.",
                "steps": [
                    "Set left at 0 and right at the last index.",
                    "If the sum equals target, return left+1 and right+1.",
                    "If the sum is too small, left++. If too big, right--.",
                ],
                "code": """class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int left = 0, right = numbers.length - 1;
        while (left < right) {
            int sum = numbers[left] + numbers[right];
            if (sum == target) return new int[] {left + 1, right + 1};
            if (sum < target) left++;
            else right--;
        }
        return new int[0];
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Each pointer only moves inward.",
                "space_complexity": "O(1)",
                "space_why": "Only the two pointers.",
                "when_to_use": "The version to write. The sort is the whole point.",
                "is_optimal": True,
            },
            {
                "name": "Binary search for the partner",
                "idea": "For each value the number it needs is fixed, and the row is sorted, so look that number up by halving the part of the row to its right.",
                "steps": [
                    "For each index i, work out the partner it needs: target minus `numbers[i]`.",
                    "Binary search for that partner in the part of the row after i, halving the range at each step.",
                    "If it is found at index j, return i+1 and j+1, because the answer is 1-based.",
                    "Searching only to the right of i stops the same entry being used twice.",
                ],
                "code": """class Solution {
    public int[] twoSum(int[] numbers, int target) {
        for (int i = 0; i < numbers.length; i++) {
            int need = target - numbers[i];
            int lo = i + 1, hi = numbers.length - 1;
            while (lo <= hi) {
                int mid = lo + (hi - lo) / 2;
                if (numbers[mid] == need) return new int[] {i + 1, mid + 1};
                if (numbers[mid] < need) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return new int[0];
    }
}
""",
                "time_complexity": "O(n log n)",
                "time_why": "Each of the n values pays for one search that halves the range about log n times.",
                "space_complexity": "O(1)",
                "space_why": "Only the two search bounds and the middle index are stored.",
                "when_to_use": "When you need the nearest partner at or above a value rather than an exact match: the same search lands on that spot, while the two pointers would need rewriting. It also suits a row too big to hold, read a slice at a time.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "numbers = [2,7,11,15], target = 9",
            "columns": ["left", "right", "sum", "action"],
            "rows": [
                ["0 (2)", "3 (15)", "17", "too big, right--"],
                ["0 (2)", "2 (11)", "13", "too big, right--"],
                ["0 (2)", "1 (7)", "9", "hit, return [1,2]"],
            ],
            "result": "The answer is [1, 2].",
        },
        "mistakes": [
            {
                "name": "The Zero-Based Trap",
                "wrong": "Returning [left, right].",
                "right": "The problem wants 1-based: left + 1 and right + 1.",
            },
            {
                "name": "Using a hash map",
                "wrong": "Ignoring the sort and using O(n) extra space.",
                "right": "Two pointers use the sort to get O(1) extra space.",
            },
            {
                "name": "Moving the wrong pointer",
                "wrong": "Incrementing right when the sum is too small.",
                "right": "Too small: left++. Too big: right--.",
            },
        ],
        "edge_cases": [
            {"input": "[2,7,11,15]\n9", "expected": "[1,2]", "why": "The first two."},
            {"input": "[2,3,4]\n6", "expected": "[1,3]", "why": "Uses the ends."},
            {"input": "[-1,0]\n-1", "expected": "[1,2]", "why": "Negatives."},
            {"input": "[5,25,75]\n100", "expected": "[2,3]", "why": "The pair is not the first two values."},
        ],
        "interview_script": [
            "I need two 1-based indices in a sorted array that add to target.",
            "I could use a hash map like unsorted two-sum. That is O(n) time and O(n) space.",
            "I put one pointer at each end.",
            "Too small, I move left. Too big, I move right. On a hit I add one to each index.",
            "That is O(n) time and O(1) space. I will test negatives and a pair that is not adjacent.",
        ],
        "follow_ups": [
            {
                "question": "The array is not sorted.",
                "answer": "Then a hash map is the right linear answer, or sort a copy of index pairs.",
            },
            {
                "question": "Return every pair.",
                "answer": "On a hit, record, then left++ and skip duplicates, like 3Sum.",
            },
            {
                "question": "Values may overflow int when added.",
                "answer": "Add in long, or compare without adding: numbers[left] == target - numbers[right] with care at the int edges.",
            },
        ],
        "related_slugs": ["lc-1", "pair-target", "lc-15"],
    },
    {
        "slugs": ["lc-26"],
        "pattern": "Read and write pointers",
        "trigger": "A sorted array, and you must drop duplicates in place and return the new length.",
        "summary": (
            "One pointer reads. One pointer writes the next unique value. "
            "Because the row is sorted, a new unique value is just one that differs from the last write."
        ),
        "approaches": [
            {
                "name": "Copy uniques into a list",
                "idea": "Collect unique values, then copy them back onto the front of nums.",
                "steps": [
                    "Walk nums. If the list is empty or the value differs from the last stored, append it.",
                    "Copy the list back onto nums[0..k).",
                    "Return the unique count k.",
                ],
                "code": """import java.util.*;

class Solution {
    public int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        List<Integer> unique = new ArrayList<>();
        for (int value : nums) {
            if (unique.isEmpty() || unique.get(unique.size() - 1) != value) unique.add(value);
        }
        for (int i = 0; i < unique.size(); i++) nums[i] = unique.get(i);
        return unique.size();
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "One walk to collect, one walk to copy back.",
                "space_complexity": "O(n)",
                "space_why": "The list can hold n unique values.",
                "when_to_use": "Correct. They want in-place, so use a write index instead.",
                "is_optimal": False,
            },
            {
                "name": "Write index",
                "idea": "The next unique value is written at write, then write steps forward.",
                "steps": [
                    "If the array is empty, return 0.",
                    "Set write = 1. The first value is already unique.",
                    "For each later read, if it differs from nums[write-1], write it and increment write.",
                    "Return the write index, which is the unique count.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Each index is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only the write index.",
                "when_to_use": "The version to write. In-place, one pass.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [0,0,1,1,1,2,2,3,3,4]",
            "columns": ["read", "nums[read]", "write", "action"],
            "rows": [
                ["1", "0", "1", "same as last write, skip"],
                ["2", "1", "1", "new, write at 1, write=2"],
                ["5", "2", "2", "new, write at 2, write=3"],
                ["7", "3", "3", "new, write at 3, write=4"],
                ["9", "4", "4", "new, write at 4, write=5"],
            ],
            "result": "k = 5. The front is [0,1,2,3,4].",
        },
        "mistakes": [
            {
                "name": "The Overwrite Trap",
                "wrong": "Using a neighbour that was already overwritten.",
                "right": "Compare to nums[write-1], the last unique you kept.",
            },
            {
                "name": "Returning the whole length",
                "wrong": "Returning nums.length.",
                "right": "Return the write index, which is the unique count.",
            },
            {
                "name": "A HashSet",
                "wrong": "A set of seen values, which also loses the sorted order contract.",
                "right": "The row is sorted, so the last written unique is enough.",
            },
        ],
        "edge_cases": [
            {"input": "[1,1,2]", "expected": "2", "why": "One duplicate."},
            {"input": "[0,0,1,1,1,2,2,3,3,4]", "expected": "5", "why": "Several runs."},
            {"input": "[1]", "expected": "1", "why": "Already unique."},
            {"input": "[1,1,1]", "expected": "1", "why": "A long run of the same value."},
        ],
        "interview_script": [
            "I need to drop duplicates in a sorted array in place and return the unique count.",
            "I could collect uniques in a list and copy back. That is O(n) time and O(n) space.",
            "I keep a write index. The first value stays.",
            "I write each later value that differs from the last unique.",
            "That is O(n) time and O(1) space. I will test one element and a long run of copies.",
        ],
        "follow_ups": [
            {
                "question": "Allow each value at most twice.",
                "answer": "Write when `nums[read] != nums[write-2]`. Same idea, window of two.",
            },
            {
                "question": "The array is not sorted.",
                "answer": "A set, or sort first. In-place unique then needs a sort.",
            },
            {
                "question": "Do not mutate, return a new array.",
                "answer": "Then the list copy is the whole answer.",
            },
        ],
        "related_slugs": ["lc-283", "lc-88", "lc-189"],
    },
    {
        "slugs": ["lc-283"],
        "pattern": "Read and write pointers",
        "trigger": "Move zeros to the end, keep the order of the rest, in place.",
        "summary": (
            "Write each non-zero forward. The write index is the next free slot. "
            "Zeros land in the holes you left behind, or you fill the tail with zeros after."
        ),
        "approaches": [
            {
                "name": "Collect, then fill zeros",
                "idea": "Copy non-zeros into a list, write them back, then pad zeros.",
                "steps": [
                    "Collect every non-zero in a list, in order.",
                    "Copy them onto the front of nums.",
                    "Fill the rest of nums with 0.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] moveZeroes(int[] nums) {
        List<Integer> kept = new ArrayList<>();
        for (int value : nums) if (value != 0) kept.add(value);
        int i = 0;
        for (int value : kept) nums[i++] = value;
        while (i < nums.length) nums[i++] = 0;
        return nums;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "Two walks of n.",
                "space_complexity": "O(n)",
                "space_why": "The list can hold n non-zeros.",
                "when_to_use": "Correct. They want in-place next.",
                "is_optimal": False,
            },
            {
                "name": "Swap non-zeros forward",
                "idea": "write is the next slot that should hold a non-zero. Swap each non-zero there.",
                "steps": [
                    "Start a write index at 0, the next slot that should hold a non-zero.",
                    "For each read, if nums[read] is not 0, swap it with nums[write] and write++.",
                    "Zeros swap rightward and keep the relative order of the non-zeros.",
                    "Return the mutated array.",
                ],
                "code": """class Solution {
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
                "time_complexity": "O(n)",
                "time_why": "Each index is read once.",
                "space_complexity": "O(1)",
                "space_why": "Only write and a temp.",
                "when_to_use": "The version to write. One pass, in place.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": "nums = [0,1,0,3,12]",
            "columns": ["read", "nums[read]", "write", "array after"],
            "rows": [
                ["0", "0", "0", "0 1 0 3 12"],
                ["1", "1", "0->1", "1 0 0 3 12"],
                ["2", "0", "1", "1 0 0 3 12"],
                ["3", "3", "1->2", "1 3 0 0 12"],
                ["4", "12", "2->3", "1 3 12 0 0"],
            ],
            "result": "The answer is [1,3,12,0,0].",
        },
        "mistakes": [
            {
                "name": "The Order Trap",
                "wrong": "Swapping the last non-zero with the first zero, which reorders the rest.",
                "right": "Always swap the next non-zero into the next write slot, left to right.",
            },
            {
                "name": "Two extra arrays",
                "wrong": "A queue of non-zeros and a count of zeros.",
                "right": "The write index is enough.",
            },
            {
                "name": "Skipping the swap when write == read",
                "wrong": "Special-casing, then forgetting to increment write.",
                "right": "A swap with itself is fine. Always increment write after a non-zero.",
            },
        ],
        "edge_cases": [
            {"input": "[0,1,0,3,12]", "expected": "[1,3,12,0,0]", "why": "The usual mix."},
            {"input": "[0]", "expected": "[0]", "why": "Only a zero."},
            {"input": "[1,0]", "expected": "[1,0]", "why": "Already almost done."},
            {"input": "[0,0,1]", "expected": "[1,0,0]", "why": "A non-zero at the end must slide to the front."},
        ],
        "interview_script": [
            "I need to move zeros to the end and keep the order of the rest, in place.",
            "I could collect non-zeros and pad zeros. That is O(n) time and O(n) space.",
            "I keep a write index for the next non-zero slot.",
            "I swap each non-zero there. Zeros slide right.",
            "That is O(n) time and O(1) space. I will test all zeros and already-correct input.",
        ],
        "follow_ups": [
            {
                "question": "Move zeros to the front.",
                "answer": "Write from the right, or count zeros and shift non-zeros right.",
            },
            {
                "question": "The relative order of zeros must also stay (it already does).",
                "answer": "This swap keeps non-zero order. Zeros are identical, so their order does not matter.",
            },
            {
                "question": "Minimize writes.",
                "answer": "Write non-zeros forward without swapping, then fill the tail with zeros. Fewer writes when zeros are rare.",
            },
        ],
        "related_slugs": ["lc-26", "lc-88", "lc-189"],
    },
    {
        "slugs": ["lc-680"],
        "pattern": "Two pointers, one skip",
        "trigger": "A palindrome after deleting at most one character.",
        "summary": (
            "Walk inward. On the first mismatch, try skipping the left character, or skipping the right. "
            "If either remaining slice is a palindrome, return true."
        ),
        "approaches": [
            {
                "name": "Try deleting each index",
                "idea": "For each index, check whether the string without that character is a palindrome.",
                "steps": [
                    "If s is already a palindrome, return true.",
                    "For each index i, build s without i and check palindrome.",
                    "If any of those is a palindrome, return true.",
                ],
                "code": """class Solution {
    public boolean validPalindrome(String s) {
        if (ok(s, 0, s.length() - 1)) return true;
        for (int skip = 0; skip < s.length(); skip++) {
            int left = 0, right = s.length() - 1;
            boolean good = true;
            while (left < right) {
                if (left == skip) left++;
                if (right == skip) right--;
                if (left >= right) break;
                if (s.charAt(left++) != s.charAt(right--)) { good = false; break; }
            }
            if (good) return true;
        }
        return false;
    }

    private boolean ok(String s, int left, int right) {
        while (left < right) if (s.charAt(left++) != s.charAt(right--)) return false;
        return true;
    }
}
""",
                "time_complexity": "O(n²)",
                "time_why": "Each of n skips re-reads the string.",
                "space_complexity": "O(1)",
                "space_why": "Only the pointers.",
                "when_to_use": "Say it. Then only try a skip at the first mismatch.",
                "is_optimal": False,
            },
            {
                "name": "Skip only at the first mismatch",
                "idea": "You may delete at most one character, so one mismatch is the only place that matters.",
                "steps": [
                    "Walk inward while the two ends match.",
                    "On a mismatch, check s[left+1..right] or s[left..right-1].",
                    "If either is a palindrome, return true.",
                    "If the walk never mismatches, return true.",
                ],
                "code": """class Solution {
    public boolean validPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) {
                return pal(s, left + 1, right) || pal(s, left, right - 1);
            }
            left++;
            right--;
        }
        return true;
    }

    private boolean pal(String s, int left, int right) {
        while (left < right) if (s.charAt(left++) != s.charAt(right--)) return false;
        return true;
    }
}
""",
                "time_complexity": "O(n)",
                "time_why": "The main walk is one pass. Each helper walk is at most one more pass.",
                "space_complexity": "O(1)",
                "space_why": "Only the pointers. The two helper calls are not nested.",
                "when_to_use": "The version to write.",
                "is_optimal": True,
            },
        ],
        "walkthrough": {
            "input": 's = "abca"',
            "columns": ["left", "right", "chars", "action"],
            "rows": [
                ["0", "3", "a vs a", "match, step in"],
                ["1", "2", "b vs c", "mismatch"],
                ["skip left", "2..2", "c", "s[2..2] is c, palindrome"],
                ["skip right", "1..1", "b", "also a palindrome"],
            ],
            "result": "Either skip works, so the answer is true.",
        },
        "mistakes": [
            {
                "name": "The One-Side Trap",
                "wrong": "Always deleting the left character on a mismatch.",
                "right": "Try both skips. One of them may be the only one that works.",
            },
            {
                "name": "Allowing two deletes",
                "wrong": "Calling the same skip logic again inside the helper.",
                "right": "The helper must be a strict palindrome. Only one delete is allowed.",
            },
            {
                "name": "Off-by-one on the slice",
                "wrong": "Checking left+1..right-1, which deletes both characters.",
                "right": "Delete one end: (left+1, right) or (left, right-1).",
            },
        ],
        "edge_cases": [
            {"input": '"aba"', "expected": "true", "why": "Already a palindrome."},
            {"input": '"abca"', "expected": "true", "why": "Delete b or c."},
            {"input": '"abc"', "expected": "false", "why": "Needs two deletes."},
            {"input": '"deeee"', "expected": "true", "why": "Delete the leading d and the rest is a palindrome."},
        ],
        "interview_script": [
            "I may delete at most one character to make a palindrome.",
            "I could try deleting each index. That is O(n²).",
            "I walk inward. On the first mismatch I try skipping left, or skipping right.",
            "Each try is a normal palindrome check. I do not allow a second delete.",
            "That is O(n) time and O(1) space. I will test already-palindrome, one delete, and two needed.",
        ],
        "follow_ups": [
            {
                "question": "At most k deletes.",
                "answer": "That becomes edit distance against the reverse, or recursion with a remaining budget.",
            },
            {
                "question": "Return the index you would delete.",
                "answer": "When a helper succeeds, return that skipped index.",
            },
            {
                "question": "Ignore case and punctuation, then at most one delete.",
                "answer": "Skip junk like Valid Palindrome, then apply this skip on the first real mismatch.",
            },
        ],
        "related_slugs": ["lc-125", "lc-234", "lc-5"],
    },
    {
        "slugs": ["lc-88"],
        "pattern": "Two pointers from the back",
        "trigger": "Merge two sorted arrays into the first one, which has spare slots at the end.",
        "summary": (
            "Write from the end of nums1, where the spare zeros sit. "
            "Take the larger of the two remaining tails so you never overwrite a value you still need."
        ),
        "approaches": [
            {
                "name": "Copy, sort",
                "idea": "Copy nums2 into the spare slots, then sort nums1.",
                "steps": [
                    "Copy the second array into the spare slots of the first.",
                    "Sort the first array in place.",
                    "Return the merged first array.",
                ],
                "code": """import java.util.*;

class Solution {
    public int[] merge(int[] nums1, int m, int[] nums2, int n) {
        System.arraycopy(nums2, 0, nums1, m, n);
        Arrays.sort(nums1);
        return nums1;
    }
}
""",
                "time_complexity": "O((m+n) log(m+n))",
                "time_why": "Sorting the merged row dominates.",
                "space_complexity": "O(1)",
                "space_why": "The sort is in place on nums1.",
                "when_to_use": "Correct and short. They want linear time next.",
                "is_optimal": False,
            },
            {
                "name": "Fill from the back",
                "idea": "The spare slots are at the end, so writing from the end cannot clobber a still-needed value.",
                "steps": [
                    "Set i at the last real value of nums1, j at the last of nums2, and write at the last slot.",
                    "While nums2 still has values, write the larger of nums1[i] and nums2[j] into write, then step back.",
                    "If nums1 runs out first, copy the rest of nums2.",
                    "If nums2 runs out first, the front of nums1 is already in place.",
                ],
                "code": """class Solution {
    public int[] merge(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1, j = n - 1, write = m + n - 1;
        while (j >= 0) {
            if (i >= 0 && nums1[i] > nums2[j]) nums1[write--] = nums1[i--];
            else nums1[write--] = nums2[j--];
        }
        return nums1;
    }
}
""",
                "time_complexity": "O(m + n)",
                "time_why": "Each value is written once.",
                "space_complexity": "O(1)",
                "space_why": "Only the three indices.",
                "when_to_use": "The version to write. Linear, in place.",
                "is_optimal": True,
            },
            {
                "name": "The gap method, from shell sort",
                "idea": "Lay the two sorted runs end to end and compare values a fixed distance apart, halving that distance each round, until neighbours are in order.",
                "steps": [
                    "Copy nums2 into the spare slots so the row is two sorted runs, one after the other.",
                    "Start with a gap of half the total length, rounded up.",
                    "Walk the row comparing each value with the one a gap ahead, and swap the pair when the earlier one is larger.",
                    "Halve the gap, rounding up, and walk again. Stop after the round with a gap of 1.",
                    "Each round pushes large values further right, and the last round leaves every neighbour in order.",
                ],
                "code": """class Solution {
    public int[] merge(int[] nums1, int m, int[] nums2, int n) {
        System.arraycopy(nums2, 0, nums1, m, n);
        int total = m + n;
        int gap = (total + 1) / 2;
        while (gap > 0) {
            for (int i = 0, j = gap; j < total; i++, j++) {
                if (nums1[i] > nums1[j]) {
                    int temp = nums1[i];
                    nums1[i] = nums1[j];
                    nums1[j] = temp;
                }
            }
            gap = gap == 1 ? 0 : (gap + 1) / 2;
        }
        return nums1;
    }
}
""",
                "time_complexity": "O((m+n) log(m+n))",
                "time_why": "The gap halves each round, so there are about log(m+n) rounds, and each round walks the whole row once.",
                "space_complexity": "O(1)",
                "space_why": "Only the gap and the two indices. Every swap happens inside the row.",
                "when_to_use": "When neither row has spare slots: two sorted arrays that must be merged in place, which the back-fill cannot do because it has nowhere to write. It costs a log factor and needs no room at all.",
                "is_optimal": False,
                "is_alternative": True,
            },
        ],
        "walkthrough": {
            "input": "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3",
            "columns": ["i", "j", "write", "pick", "nums1"],
            "rows": [
                ["2", "2", "5", "6 > 3", "1,2,3,0,0,6"],
                ["2", "1", "4", "5 > 3", "1,2,3,0,5,6"],
                ["2", "0", "3", "3 > 2", "1,2,3,3,5,6"],
                ["1", "0", "2", "2 == 2, take nums2", "1,2,2,3,5,6"],
            ],
            "result": "The answer is [1,2,2,3,5,6].",
        },
        "mistakes": [
            {
                "name": "The Front Merge Trap",
                "wrong": "Writing into nums1[0], which overwrites a value you still need.",
                "right": "Write from the back, where the spare slots are.",
            },
            {
                "name": "Forgetting nums2 leftovers",
                "wrong": "Stopping when i < 0 without copying the rest of nums2.",
                "right": "The while j >= 0 loop keeps copying nums2 after nums1 is spent.",
            },
            {
                "name": "Returning nums instead of nums1",
                "wrong": "The starter mentions nums. The array to mutate is nums1.",
                "right": "Return nums1.",
            },
        ],
        "edge_cases": [
            {"input": "[1,2,3,0,0,0]\n3\n[2,5,6]\n3", "expected": "[1,2,2,3,5,6]", "why": "The usual merge."},
            {"input": "[1]\n1\n[]\n0", "expected": "[1]", "why": "nums2 is empty."},
            {"input": "[0]\n0\n[1]\n1", "expected": "[1]", "why": "nums1 has no real values."},
            {"input": "[2,0]\n1\n[1]\n1", "expected": "[1,2]", "why": "The new value belongs in front of the old one."},
        ],
        "interview_script": [
            "I must merge nums2 into nums1, which already has spare slots at the end.",
            "I could copy and sort in O((m+n) log(m+n)).",
            "I write from the back so I do not overwrite a value I still need.",
            "I take the larger remaining tail. If nums1 runs out, I copy the rest of nums2.",
            "That is O(m+n) time and O(1) space. I will test empty nums2 and empty nums1.",
        ],
        "follow_ups": [
            {
                "question": "The spare slots are at the front.",
                "answer": "Write from the front, taking the smaller head each time.",
            },
            {
                "question": "Linked lists instead of arrays.",
                "answer": "That is Merge Two Sorted Lists: dummy node, walk both.",
            },
            {
                "question": "k sorted arrays.",
                "answer": "A min-heap of k heads. That is Merge k Sorted Lists.",
            },
        ],
        "related_slugs": ["lc-21", "lc-23", "lc-26"],
    },
]


