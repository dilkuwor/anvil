"""Worked interview problems: full walkthroughs from prompt to defended solution.

Each lesson follows the interview arc rather than presenting a finished answer:
clarify, brute force, identify the waste, optimise, code, test, and handle the
follow-ups. Every problem links to the matching practice problem on the platform.
"""

from __future__ import annotations

from database.seeds.learn_dsa import DL, _dsa_topic


def _two_sum() -> dict:
    return DL(
        "wp-two-sum",
        "Worked Problem: Two Sum",
        "The canonical brute-force-to-hash-map optimisation, and the follow-ups that separate the variants.",
        14,
        "**Interviewer:** \"Given an array of integers and a target, return the indices of the two numbers that add up to the target. You may assume exactly one solution exists, and you may not use the same element twice.\"",
        [
            (
                "Why It Matters",
                """This is the most common opening problem in the industry, and it is asked precisely because the optimisation is instructive rather than difficult. The interviewer wants to watch you notice that the inner loop is a *search*, and that every search is a hash map away from O(1).

It is also a problem where candidates lose marks by moving too fast. Producing the optimal answer in ten seconds without explaining the brute force, the waste, or the duplicate case is a weaker performance than a narrated two-minute version.""",
            ),
            (
                "Step 1: Clarify",
                """The questions worth asking, and what each answer changes:

- *"Is the array sorted?"* — If yes, two pointers gives O(1) space and I would use that instead.
- *"Can there be duplicates?"* — Yes, which affects how I build the map.
- *"Can values be negative?"* — Yes, so I cannot use any positivity assumption.
- *"Return indices or values?"* — Indices, which rules out sorting.
- *"Is exactly one solution guaranteed?"* — Stated, so I do not need a not-found contract, though I will still return something sensible.
- *"May I use extra memory?"* — Yes.

The most consequential answer is "return indices". If the answer were the values, sorting plus two pointers would be viable at O(n log n) and O(1) space.""",
            ),
            (
                "Step 2: Brute Force",
                """State it and its complexity without writing it:

> "The brute force is to check every pair: for each i, scan every j after it and test whether they sum to the target. That is O(n^2) time and O(1) space."

```java
int[] twoSumBrute(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++)
        for (int j = i + 1; j < nums.length; j++)
            if (nums[i] + nums[j] == target) return new int[] {i, j};
    return new int[0];
}
```

Writing this is optional. Saying it is not — it establishes the baseline that the optimisation improves on.""",
            ),
            (
                "Step 3: Find the Waste",
                """> "The inner loop is doing a search: for a fixed `nums[i]`, it is looking for the value `target - nums[i]`. Searching a list is O(n), but searching a hash map is expected O(1). If I remember the values I have already seen, the inner loop disappears entirely."

That sentence is the whole optimisation, and it is what the interviewer is listening for. The map should store value to index, because the answer is indices.""",
            ),
            (
                "How It Works",
                """```java
int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();      // value -> index
    for (int i = 0; i < nums.length; i++) {
        Integer complement = seen.get(target - nums[i]);
        if (complement != null) {
            return new int[] {complement, i};
        }
        seen.put(nums[i], i);                          // insert AFTER checking
    }
    return new int[0];
}
// Expected O(n) time, O(n) space
```

The one detail that matters: **check before inserting**.

With input `[3, 3]` and target 6, checking first means that at index 1 the map already contains `3 -> 0`, so the answer is `[0, 1]`. Inserting first would overwrite the earlier index and then find the element as its own complement, returning `[1, 1]` — using the same element twice, which the problem forbids.

Explaining that ordering decision unprompted is the difference between a correct answer and a demonstrably understood one.""",
            ),
            (
                "Step 4: Test It",
                """Trace `[2, 7, 11, 15]` with target 9, out loud:

> "i = 0: complement is 7, not in the map, so insert 2 to 0. i = 1: complement is 2, which is in the map at index 0, so return `[0, 1]`. Correct.

Then the cases that matter for *this* implementation:

> "Duplicates: `[3, 3]` target 6 returns `[0, 1]` because I check before inserting. Negatives: `[-1, -2, -3]` target -5 works, since nothing assumes positivity. Two elements is the minimum viable input and works. A single element returns empty, which is fine given the guarantee.

One thing I am relying on: if no solution existed, I return an empty array. The problem guarantees one, but I would confirm what you want in that case rather than assume."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Notes |
| --- | --- | --- | --- |
| Brute force | O(n^2) | O(1) | No memory; fine for tiny n |
| Sort plus two pointers | O(n log n) | O(1) if mutable | Loses original indices |
| Hash map | O(n) expected | O(n) | The answer here |

The hash map trades memory for time, and its O(1) is expected rather than worst case. If the interviewer forbade extra memory, I would sort and use two pointers — and immediately note that I would need to keep the original indices alongside the values, which means allocating anyway, so the space saving is illusory for *this* problem.

That observation — that the space-free alternative is not actually space-free when indices are required — is a good thing to volunteer.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What if the array is sorted?"** — Two pointers from both ends: O(n) time, O(1) space, and the monotone argument for why moving one pointer loses nothing.
- **"What if there are multiple solutions and you need all pairs?"** — The output can be O(n^2), so the complexity is output-bound; use a map of value to list of indices and be careful not to emit a pair twice.
- **"What about three numbers summing to the target?"** — Sort, then fix one element and two-pointer the rest: O(n^2). The duplicate-skipping becomes the hard part.
- **"What if the array is too large for memory?"** — Sort externally and two-pointer, or hash-partition by value so complements land in the same partition.
- **"What is the worst case for the hash map?"** — O(n) per operation under adversarial keys, so O(n^2) overall; expected O(n) in practice.
- **"Can you return the values instead?"** — Then sorting becomes viable and the space drops.""",
            ),
            (
                "Common Mistakes",
                """- Inserting into the map before checking, breaking the duplicate case
- Storing the index as the key and the value as the value, which makes the lookup useless
- Sorting when indices are required
- Claiming worst-case O(1) for the map operations
- Not asking whether the array is sorted
- Solving it in silence because it is familiar""",
            ),
            (
                "Variations",
                """The same core idea extends across a family:

- **Three sum**: sort, fix one, two-pointer. O(n^2).
- **Four sum**: fix two, two-pointer. O(n^3), or hash all pairs for O(n^2) time and space.
- **Two sum closest**: sort, two pointers, track the best difference.
- **Subarray sum equals k**: not this technique at all — prefix sums with a hash map, because subarrays are contiguous.
- **Two sum with a BST**: in-order traversal into a sorted array, then two pointers; or a set during traversal.

The last one is worth noticing: recognising that the same complement trick applies to a completely different structure is the transferable part.""",
            ),
            (
                "Interview Tip",
                """Even on a problem you have seen a hundred times, narrate the brute force and name the specific waste before writing the optimal code. The interviewer is scoring the reasoning, and a memorised answer delivered instantly gives them nothing to score.""",
            ),
        ],
        [
            "The inner loop is a search, and every search is a hash map away from O(1) — that is the whole insight.",
            "Check the map before inserting, or duplicate values produce an invalid answer.",
            "Returning indices rules out sorting; returning values would make two pointers viable.",
            "Narrate the brute force even when you know the answer; the reasoning is what is scored.",
        ],
        [
            "Why does the hash map check come before the insertion?",
            "What changes if the array is sorted?",
            "How does this extend to three numbers summing to a target?",
            "What is the worst-case complexity of your solution?",
        ],
        ["pair-target"],
    )


def _group_anagrams() -> dict:
    return DL(
        "wp-group-anagrams",
        "Worked Problem: Group Anagrams",
        "Choosing the canonical key, and why the key choice is the entire algorithm.",
        13,
        "**Interviewer:** \"Given an array of strings, group the anagrams together. Return a list of groups in any order.\"",
        [
            (
                "Why It Matters",
                """This problem tests one specific skill: designing a canonical key. The grouping mechanism is four lines; deciding what makes two words equivalent, and computing a representation they share, is the whole problem.

It is also a good complexity-analysis exercise, because there are two valid keys with different costs and the better one depends on an assumption about the alphabet that you should state.""",
            ),
            (
                "Step 1: Clarify",
                """- *"What counts as an anagram?"* — Same characters with the same counts, in any order.
- *"What is the alphabet?"* — Lowercase English letters only, or arbitrary Unicode? This decides which key is viable.
- *"Is it case sensitive?"* — Assume yes unless told otherwise.
- *"How long are the strings, and how many are there?"* — Determines whether the L log L factor matters.
- *"Does the output order matter?"* — Any order, which simplifies things.
- *"Can the input contain duplicates?"* — If the same word appears twice, both copies go in the group.

The alphabet question is the important one, and asking it before choosing a key is the right instinct.""",
            ),
            (
                "Step 2: Brute Force",
                """> "The brute force compares every pair of words for anagram-ness, which is O(n^2) comparisons, each costing O(L log L) if I sort or O(L) if I count. That is at least O(n^2 * L), and then I still need to build groups from the pairwise relation, which is a connected-components problem."

Stating that the naive approach also creates a *grouping* problem, not just a comparison cost, is a good observation — it motivates the key-based approach more strongly than complexity alone.""",
            ),
            (
                "Step 3: Find the Waste",
                """> "Comparing pairs is wasteful because anagram-ness is an equivalence relation — if I can compute a canonical form that all anagrams share, then grouping is just a hash map from that form to a list. No comparisons at all."

Two candidate keys:

- **Sorted characters**: `"eat"` and `"tea"` both become `"aet"`. O(L log L) per word, works for any alphabet.
- **Character counts**: a 26-element signature. O(L) per word, assumes a known small alphabet.

Say both and choose with a reason.""",
            ),
            (
                "How It Works",
                """```java
List<List<String>> groupAnagrams(String[] words) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String word : words) {
        char[] chars = word.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(word);
    }
    return new ArrayList<>(groups.values());
}
// O(n * L log L) time, O(n * L) space
```

And the counting-key version, which is asymptotically better:

```java
List<List<String>> groupAnagrams(String[] words) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String word : words) {
        int[] counts = new int[26];
        for (char c : word.toCharArray()) counts[c - 'a']++;

        StringBuilder key = new StringBuilder();
        for (int i = 0; i < 26; i++) {
            key.append('#').append(counts[i]);          // delimiter prevents ambiguity
        }
        groups.computeIfAbsent(key.toString(), k -> new ArrayList<>()).add(word);
    }
    return new ArrayList<>(groups.values());
}
// O(n * L) time, O(n * L) space
```

The `'#'` delimiter is essential: without it, counts of `[1, 11]` and `[11, 1]` both render as `"111"`. It is exactly the string-concatenation ambiguity from the hashing lesson, and mentioning it shows you thought about the encoding rather than just the algorithm.

`computeIfAbsent` is the idiomatic way to build a multimap and avoids the null check that causes bugs under time pressure.""",
            ),
            (
                "Step 4: Test It",
                """> "Input `["eat", "tea", "tan", "ate", "nat", "bat"]`. Sorted keys: `aet`, `aet`, `ant`, `aet`, `ant`, `abt`. So three groups: the three `aet` words, the two `ant` words, and `bat` alone. Correct.

Edge cases: an empty array returns an empty list. An empty string is its own key and forms a group — worth confirming that is desired. Single-character words work. Two identical words land in the same group, which is right.

The case that would break the counting version specifically is a character outside `a` to `z` — an uppercase letter or a space would index outside the array and throw. That is why I asked about the alphabet, and if it is not guaranteed I would use the sorted key or a `HashMap<Character, Integer>` instead."
""",
            ),
            (
                "Trade-offs",
                """| Key | Time | Assumes | Notes |
| --- | --- | --- | --- |
| Sorted characters | O(n * L log L) | Nothing | Shorter code, works for Unicode |
| Count signature | O(n * L) | Small known alphabet | Better asymptotically, needs a delimiter |
| Prime product | O(n * L) | Small alphabet | Elegant and overflows quickly — avoid |

The prime-product idea — map each letter to a prime and multiply — is occasionally suggested and is a trap: the product overflows for words longer than about fifteen characters, which makes it silently wrong. Being able to reject it with a reason is better than not knowing it.

The sorted key is what I would write first for its brevity and generality; the counting key is the optimisation to offer when asked.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What if the strings are very long?"** — The counting key removes the log factor and is a real improvement when L is large.
- **"What if the alphabet is Unicode?"** — The fixed array breaks; use the sorted key, or a map keyed by code point, and note that some characters occupy two `char` values.
- **"Can you do it without sorting or counting?"** — Any canonical form works, but every valid one is essentially one of these two.
- **"What if the input does not fit in memory?"** — Compute the key per word and partition by `hash(key) % N` into files, then group each partition independently — which is the map-reduce shuffle.
- **"How would you group by 'shifted' strings instead?"** — The key becomes the sequence of gaps between consecutive characters modulo 26, with the negative-normalisation caveat.
- **"What is the memory usage?"** — O(n * L) for the keys and the groups, which is unavoidable since the output itself is that size.""",
            ),
            (
                "Common Mistakes",
                """- Comparing pairs instead of computing a canonical key
- Building a count key without a delimiter
- Using a fixed 26-element array without stating the alphabet assumption
- Suggesting the prime-product key without noticing the overflow
- Forgetting `computeIfAbsent` and writing a null check that misses a case
- Sorting the output when the problem says any order is acceptable""",
            ),
            (
                "Variations",
                """- **Valid anagram** (two strings): the same counting idea, one pass, O(1) space.
- **Find all anagrams of p in s**: a sliding window with a count array, O(n).
- **Group shifted strings**: key on the character gaps.
- **Group by island shape**: key on the normalised relative coordinates — the same canonical-form idea in a grid.
- **Find duplicate subtrees**: key on a serialisation of each subtree.

The last two are worth noticing because they look nothing like string problems and use exactly the same technique.""",
            ),
            (
                "Interview Tip",
                """Say the key and its justification in one sentence before writing any code: "two words are anagrams exactly when their sorted forms are identical, so I will key on that." The key *is* the algorithm, and naming it first makes the rest of the solution obviously correct.""",
            ),
        ],
        [
            "Grouping by an equivalence relation means computing a canonical form, not comparing pairs.",
            "The sorted-characters key is general at O(L log L); the count signature is O(L) and assumes a bounded alphabet.",
            "Count-based keys need a delimiter, or different count vectors collide.",
            "The same canonical-form technique groups island shapes and duplicate subtrees, not just strings.",
        ],
        [
            "What key would you use to group anagrams, and what does it assume?",
            "Why does a count-based key need a delimiter?",
            "What changes if the alphabet is Unicode?",
            "How would you solve this if the input did not fit in memory?",
        ],
        ["anagram-bundles"],
    )


def _longest_unique_substring() -> dict:
    return DL(
        "wp-longest-unique-substring",
        "Worked Problem: Longest Substring Without Repeating Characters",
        "The sliding window derived from first principles, including why the naive shrink is wrong.",
        14,
        "**Interviewer:** \"Given a string, find the length of the longest substring that contains no repeated characters.\"",
        [
            (
                "Why It Matters",
                """This is the canonical variable-size sliding window, and it is asked constantly. It tests whether you recognise that "substring" means contiguous, whether you can maintain a window invariant correctly, and whether you can give the amortised argument for why a nested loop is still linear.

It also has a subtle optimisation — jumping the left pointer rather than shrinking one step at a time — which is a good follow-up and a common source of off-by-one bugs.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Substring or subsequence?"* — Substring, so contiguous. This is the single most important question and it changes the entire approach.
- *"What is the character set?"* — ASCII or Unicode, which decides between a fixed array and a map.
- *"Return the length or the substring itself?"* — The length, though tracking the start costs nothing extra.
- *"Is it case sensitive?"* — Assume yes.
- *"Can the string be empty?"* — Yes, returning 0.

Asking substring-versus-subsequence takes three seconds and prevents solving a different problem.""",
            ),
            (
                "Step 2: Brute Force",
                """> "Check every substring for uniqueness: O(n^2) substrings, each costing O(n) to verify with a set, so O(n^3). With an incremental set it is O(n^2), because extending a substring by one character only requires checking that one character."

```java
int bruteForce(String s) {
    int best = 0;
    for (int start = 0; start < s.length(); start++) {
        Set<Character> seen = new HashSet<>();
        for (int end = start; end < s.length(); end++) {
            if (!seen.add(s.charAt(end))) break;      // duplicate: stop extending
            best = Math.max(best, end - start + 1);
        }
    }
    return best;
}
// O(n^2) time
```

Worth writing briefly, because the optimisation is visible from it.""",
            ),
            (
                "Step 3: Find the Waste",
                """> "When the substring starting at `start` hits a duplicate and stops, the next iteration restarts from `start + 1` and re-examines almost all the same characters. But I already know that a duplicate exists — the window does not need to be rebuilt, only shrunk from the left until the duplicate is gone.

That means both pointers only ever move forwards, which is the sliding window."

The invariant to state: **the window `[left, right]` always contains no duplicates.** Extending right may violate it; shrinking left restores it.

The monotonicity check: adding a character can only create a duplicate, and removing from the left can only remove one, so shrinking is guaranteed to restore validity. That is what makes the window valid here.""",
            ),
            (
                "How It Works",
                """```java
int lengthOfLongestSubstring(String s) {
    int[] count = new int[128];                 // ASCII
    int left = 0, best = 0;

    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        count[c]++;
        while (count[c] > 1) {                  // invariant violated
            count[s.charAt(left)]--;
            left++;
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}
// O(n) time, O(1) space for a fixed alphabet
```

The complexity argument to volunteer: "Although there is a nested while loop, `left` only ever increases and never exceeds n, so the total number of inner iterations across the whole run is at most n. That makes the algorithm O(n) overall, not O(n^2)."

The jump optimisation, which is the usual follow-up:

```java
int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastIndex = new HashMap<>();
    int left = 0, best = 0;

    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        Integer previous = lastIndex.get(c);
        if (previous != null && previous >= left) {
            left = previous + 1;                // jump past the earlier occurrence
        }
        lastIndex.put(c, right);
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

The `previous >= left` check is essential and is the classic bug: a character last seen *before* the current window is not a conflict, and jumping to `previous + 1` unconditionally would move `left` backwards, producing a window that is wrong and possibly a negative length.""",
            ),
            (
                "Step 4: Test It",
                """> "Input `abcabcbb`. right = 0,1,2: window grows to `abc`, best 3. right = 3 is `a`, count becomes 2, so shrink: remove `a` at left 0, left becomes 1, window `bca`, best still 3. This continues similarly. right = 6 and 7 are `b` and `b`, which shrink the window to `b`, best stays 3. Returns 3. Correct.

Edge cases: empty string returns 0 since the loop never runs. Single character returns 1. All identical, `aaaa`, returns 1 — and this is the case that exercises the shrink loop hardest. All distinct, `abcdef`, returns 6 with no shrinking at all.

The case specific to the jump version is `abba`: at right = 3 the character `a` was last seen at index 0, which is before the current `left` of 2. Without the `>= left` guard, `left` would jump back to 1 and the answer would be wrong. That is the input I would use to verify that optimisation."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Notes |
| --- | --- | --- | --- |
| Brute force with a set | O(n^2) | O(min(n, alphabet)) | Rebuilds the window each time |
| Sliding window with counts | O(n) | O(alphabet) | The standard answer |
| Sliding window with last-index jump | O(n) | O(alphabet) | Fewer operations, one subtle guard |

The array-versus-map choice depends on the alphabet: `int[128]` is faster and assumes ASCII; a `HashMap` is general. Say which you assumed.

The jump version does strictly less work but introduces the staleness guard, which is a real correctness risk under time pressure. For an interview I would write the count version and mention the jump as an optimisation.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Why is it O(n) with a nested loop?"** — `left` only moves forward, so the inner loop runs at most n times in total. Volunteer this.
- **"Return the substring, not the length."** — Track the start index whenever the best is updated, then substring at the end.
- **"What if at most k distinct characters are allowed?"** — The same template with the condition `count.size() > k`; the shrink loop changes and nothing else does.
- **"What if the string contains Unicode?"** — Replace the array with a map; space becomes O(distinct characters).
- **"Longest substring with at most two distinct characters?"** — Same template again, which is the point of learning it as a template.
- **"What if it were a subsequence rather than a substring?"** — Completely different: the answer would be the number of distinct characters, since order is preserved but contiguity is not required.""",
            ),
            (
                "Common Mistakes",
                """- Solving for subsequence instead of substring
- Using `if` instead of `while` for the shrink, which fails when several removals are needed
- Omitting the `previous >= left` guard in the jump version
- Computing the window length as `right - left` instead of `right - left + 1`
- Claiming O(n^2) because of the inner loop
- Resetting the window entirely on a duplicate rather than shrinking""",
            ),
            (
                "Variations",
                """The same template with a different validity condition solves a large family:

- **At most k distinct characters**: shrink while `distinct > k`.
- **Longest repeating character replacement**: shrink while `windowLength - maxFrequency > k`.
- **Minimum window substring**: shrink while the window is *valid*, recording as you go.
- **Permutation in string**: a fixed-size window with count matching.
- **Maximum consecutive ones with k flips**: shrink while `zerosInWindow > k`.

Recognising that these are one template with five different conditions is worth more than solving them individually.""",
            ),
            (
                "Interview Tip",
                """State the window invariant before coding — "the window always contains no duplicates" — and then say how each pointer maintains it. That single sentence makes the shrink loop obviously correct and gives you the amortised argument for free.""",
            ),
        ],
        [
            "'Substring' means contiguous and points at a sliding window; confirm it before anything else.",
            "State the invariant, then show that extending right can only break it and shrinking left can only restore it.",
            "The nested while loop is O(n) overall because `left` only moves forward — volunteer that argument.",
            "The jump optimisation needs a `previous >= left` staleness guard, or the window moves backwards.",
        ],
        [
            "Why is this O(n) despite the nested loop?",
            "What is the window invariant, and how is it maintained?",
            "How would you change it to allow at most k distinct characters?",
            "What breaks if you omit the staleness check in the jump version?",
        ],
        ["longest-unique-window"],
    )


def _best_time_stock() -> dict:
    return DL(
        "wp-best-time-to-buy-sell",
        "Worked Problem: Best Time to Buy and Sell Stock",
        "A one-pass running minimum, and the family of variants that follow from it.",
        12,
        "**Interviewer:** \"Given an array where each element is the stock price on that day, find the maximum profit from a single buy and a single sell. You must buy before you sell.\"",
        [
            (
                "Why It Matters",
                """The optimal solution is five lines, so the interview value is in the reasoning and the follow-ups. It is a good test of whether you can spot that a nested loop is recomputing a running aggregate, and the variant ladder — unlimited transactions, at most k, with a cooldown — moves cleanly from greedy into dynamic programming.

It is also frequently used as a warm-up before a harder problem, so being efficient and articulate here buys you time later.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Exactly one transaction, or at most one?"* — At most one, so zero profit is a valid answer if prices only fall.
- *"Must I sell after I buy?"* — Yes, so the answer is not simply max minus min.
- *"Can I buy and sell on the same day?"* — Profit would be zero, so it does not matter.
- *"Can prices be zero or negative?"* — Prices are non-negative in practice; confirm.
- *"What if the array is empty or has one element?"* — Return 0.

The at-most-one framing matters: a strictly-decreasing array returns 0, not a negative number.""",
            ),
            (
                "Step 2: Brute Force",
                """> "Try every buy day paired with every later sell day: O(n^2) time, O(1) space."

```java
int maxProfitBrute(int[] prices) {
    int best = 0;
    for (int buy = 0; buy < prices.length; buy++)
        for (int sell = buy + 1; sell < prices.length; sell++)
            best = Math.max(best, prices[sell] - prices[buy]);
    return best;
}
```""",
            ),
            (
                "Step 3: Find the Waste",
                """> "For a fixed sell day, the best profit is that price minus the *minimum* price before it. The inner loop is recomputing that minimum from scratch every time, but it can be maintained incrementally as I scan. One pass."

That reframing — from "every pair" to "for each sell day, the running minimum" — is the whole optimisation, and it is the same idea as the extend-or-restart DP pattern.""",
            ),
            (
                "How It Works",
                """```java
int maxProfit(int[] prices) {
    int minSoFar = Integer.MAX_VALUE;
    int best = 0;
    for (int price : prices) {
        minSoFar = Math.min(minSoFar, price);      // cheapest buy up to today
        best = Math.max(best, price - minSoFar);   // best sale if we sell today
    }
    return best;
}
// O(n) time, O(1) space
```

The ordering within the loop matters and is worth explaining: updating `minSoFar` before computing the profit means the same day can be both buy and sell, giving a profit of zero — which is harmless and keeps the code branch-free. Computing the profit first would use yesterday's minimum, which is also correct but requires the reader to think about it.

Initialising `best` to 0 rather than to a negative sentinel encodes the "at most one transaction" rule directly.""",
            ),
            (
                "Step 4: Test It",
                """> "Input `[7, 1, 5, 3, 6, 4]`. minSoFar goes 7, 1, 1, 1, 1, 1. Profits: 0, 0, 4, 2, 5, 3. Best is 5, from buying at 1 and selling at 6. Correct.

Strictly decreasing, `[7, 6, 4, 3, 1]`: minSoFar keeps falling and every profit is 0, so the answer is 0 — which is right for at-most-one-transaction.

Empty array: the loop never runs and `best` stays 0. Single element: one iteration, profit 0.

All identical prices: profit 0, no spurious value."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Notes |
| --- | --- | --- | --- |
| Brute force | O(n^2) | O(1) | Every pair |
| Running minimum | O(n) | O(1) | The answer |
| Kadane on differences | O(n) | O(1) | Equivalent — maximum subarray of daily deltas |

The Kadane framing is worth mentioning: the maximum profit equals the maximum subarray sum of the consecutive price differences. It is the same algorithm in different clothing, and noticing the equivalence is a nice observation.

There is no meaningful trade here — the one-pass version dominates on every axis. Where trades appear is in the variants.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What if you can make unlimited transactions?"** — Greedy: sum every positive daily difference, because any rising run can be decomposed into consecutive up-days.

```java
int maxProfitUnlimited(int[] prices) {
    int total = 0;
    for (int i = 1; i < prices.length; i++) {
        total += Math.max(0, prices[i] - prices[i - 1]);
    }
    return total;
}
```

- **"At most two transactions?"** — Four state variables: best after the first buy, first sell, second buy, second sell, updated in that order each day.
- **"At most k transactions?"** — DP over `(day, transactionsUsed, holding)`, O(n * k); and note that when k exceeds n/2 it degenerates to the unlimited case.
- **"With a cooldown after selling?"** — A three-state machine: holding, just sold, resting.
- **"With a transaction fee?"** — Subtract the fee on sale in the unlimited greedy, which remains correct.
- **"What if you must return the buy and sell days?"** — Track the index where `minSoFar` was set and the index where `best` was updated.

The ladder from greedy to DP is exactly the greedy-versus-DP boundary discussed in that lesson: once a transaction *count* is limited, using one now has a future cost, and greedy stops working.""",
            ),
            (
                "Common Mistakes",
                """- Returning `max - min` without respecting the buy-before-sell ordering
- Initialising the best profit to a negative value and returning it for a falling market
- Using `Integer.MIN_VALUE` for `minSoFar` instead of `MAX_VALUE`
- Applying the unlimited-transaction greedy to the single-transaction problem
- Not noticing that the k-transaction variant is DP rather than greedy""",
            ),
            (
                "Variations",
                """- **Maximum subarray**: the same running-aggregate shape applied to sums.
- **Best sightseeing pair**: maximise `values[i] + values[j] + i - j`, which becomes a running maximum of `values[i] + i`.
- **Container with most water**: a different technique, but the same instinct of replacing a nested loop with a single scan.

The transferable idea is: when the inner loop computes an aggregate over a prefix, maintain it incrementally instead.""",
            ),
            (
                "Interview Tip",
                """Say the reframing out loud before coding: "for each possible sell day, the best profit is today's price minus the cheapest price so far, and I can maintain that minimum as I scan." The code then writes itself, and the interviewer has heard the insight rather than inferred it.""",
            ),
        ],
        [
            "For each sell day the answer is today's price minus the running minimum — maintain it incrementally.",
            "Initialise the best profit to zero, which encodes the at-most-one-transaction rule.",
            "Unlimited transactions is greedy: sum every positive daily difference.",
            "Limiting the transaction count makes it dynamic programming, because using one now has a future cost.",
        ],
        [
            "Why is this not simply the maximum minus the minimum?",
            "How does the solution change with unlimited transactions?",
            "At what point does this problem stop being greedy?",
            "How would you return the actual buy and sell days?",
        ],
        ["single-pass-profit"],
    )


def _container_water() -> dict:
    return DL(
        "wp-container-with-most-water",
        "Worked Problem: Container With Most Water",
        "Two pointers on unsorted data, and the exchange argument that justifies discarding a side.",
        12,
        "**Interviewer:** \"Given an array of heights, each representing a vertical line, find two lines that together with the x-axis form a container holding the most water.\"",
        [
            (
                "Why It Matters",
                """This is the clearest demonstration that two pointers does not require sorted input — it requires a *monotone argument*. Candidates who have learned "two pointers means sorted" get stuck here, and candidates who understand the underlying principle do not.

The proof of correctness is short and is the actual content of the interview. Writing the five-line solution without justifying the pointer movement is an incomplete answer.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Is the water level limited by the shorter line?"* — Yes; the area is width times the minimum of the two heights.
- *"Can lines be zero height?"* — Yes, contributing no area.
- *"Do the lines have width?"* — No, they are infinitely thin; the width is the index difference.
- *"Can I reorder the array?"* — No; the positions are physical.
- *"Return the area or the two indices?"* — The area.

The "shorter line limits it" confirmation is worth making explicit, because the entire argument depends on it.""",
            ),
            (
                "Step 2: Brute Force",
                """> "Try every pair of lines and compute the area: O(n^2) time, O(1) space."

```java
int maxAreaBrute(int[] height) {
    int best = 0;
    for (int i = 0; i < height.length; i++)
        for (int j = i + 1; j < height.length; j++)
            best = Math.max(best, (j - i) * Math.min(height[i], height[j]));
    return best;
}
```""",
            ),
            (
                "Step 3: Find the Waste",
                """> "Start with the widest possible container — the two outermost lines. Any other container is narrower, so to beat it I need a greater minimum height.

Now consider the shorter of the two lines. Any container using that line is at most as tall as it, and every other container using it is *narrower* than the current one. So no container using the shorter line can beat what I have already recorded — I can discard it.

That means I move the pointer at the shorter line inwards, and repeat. Each step eliminates one line, so the scan is O(n)."

That paragraph is the exchange argument, and it is what the interviewer is asking for. Note that it never mentions sorting.""",
            ),
            (
                "How It Works",
                """```java
int maxArea(int[] height) {
    int lo = 0, hi = height.length - 1;
    int best = 0;

    while (lo < hi) {
        int area = (hi - lo) * Math.min(height[lo], height[hi]);
        best = Math.max(best, area);

        if (height[lo] < height[hi]) lo++;      // the shorter side cannot help further
        else hi--;
    }
    return best;
}
// O(n) time, O(1) space
```

When the two heights are equal, moving either is safe — both are limited by the same value and both would produce narrower containers. Moving one is sufficient and the code arbitrarily moves the right pointer, which is correct; a candidate who worries about the tie can be reassured by the same argument.

One more detail: the loop condition uses `lo < hi` rather than `lo <= hi`, because a container needs two distinct lines.""",
            ),
            (
                "Step 4: Test It",
                """> "Input `[1, 8, 6, 2, 5, 4, 8, 3, 7]`. lo = 0, hi = 8: area is 8 times min(1, 7) = 8. Height 1 is shorter, so lo becomes 1. Now area is 7 times min(8, 7) = 49, which is the best. Height 7 is shorter, so hi becomes 7. Area is 6 times min(8, 3) = 18. And so on — nothing beats 49. Correct.

Two elements: one iteration, area is 1 times the minimum. Correct.

All equal heights, `[5, 5, 5, 5]`: the widest is best, and the scan finds it on the first iteration. Correct.

Increasing heights, `[1, 2, 3, 4, 5]`: the left pointer advances every time, and the best is found early. Correct.

Contains a zero: contributes zero area and the pointer moves past it immediately."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space |
| --- | --- | --- |
| Brute force | O(n^2) | O(1) |
| Two pointers | O(n) | O(1) |

There is no space trade here — both are O(1) — which makes this a rare case where the optimisation is free. The only cost is that the two-pointer version requires an argument to believe, whereas the brute force is self-evidently correct.

That is worth saying explicitly: "the optimisation costs nothing in space; what it costs is that its correctness is not obvious, which is why I want to state the argument."
""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Why can you discard the shorter line?"** — The exchange argument. This is the question, and a candidate who cannot answer it has not solved the problem.
- **"What if the two heights are equal?"** — Either may be moved; both are limited by the same height and every remaining container using either is narrower.
- **"Does this need sorted input?"** — No. It needs a monotone argument, which is a weaker and different requirement.
- **"Can you return the indices too?"** — Track them whenever `best` is updated.
- **"How does this differ from trapping rain water?"** — Different problem: trapping sums water above *every* bar between two walls, not the area of a single container. Related technique, different objective.
- **"What if the lines had width?"** — The area formula changes and the argument needs rechecking; do not assume it survives.""",
            ),
            (
                "Common Mistakes",
                """- Believing two pointers requires sorted input and rejecting the approach
- Moving both pointers in the same iteration
- Moving the taller pointer, which can skip the optimum
- Using `lo <= hi`, which considers a degenerate container of width zero
- Writing the code without stating the correctness argument
- Confusing this with trapping rain water""",
            ),
            (
                "Variations",
                """- **Trapping rain water**: two pointers with running maxima, O(1) space — a different objective with a related technique.
- **Largest rectangle in a histogram**: a monotonic stack, because the constraint is different.
- **Three sum closest**: converging pointers on sorted input with a different monotone argument.

The transferable lesson is to ask "what does moving this pointer lose?" rather than "is the array sorted?".""",
            ),
            (
                "Interview Tip",
                """Lead with the argument, not the code: "the area is limited by the shorter line, and every other container using that line is narrower, so it cannot beat what I have — therefore I can discard it." Thirty seconds, and the five lines that follow are obviously correct.""",
            ),
        ],
        [
            "Two pointers needs a monotone argument, not sorted input — this problem proves it.",
            "Moving the pointer at the shorter line is safe because every container using it is narrower and no taller.",
            "The optimisation is free in space; its cost is that correctness needs an argument.",
            "Ties may move either pointer, since both are limited by the same height.",
        ],
        [
            "Why is it safe to discard the shorter line?",
            "Does two pointers require sorted input?",
            "What happens when the two heights are equal?",
            "How does this differ from trapping rain water?",
        ],
        ["widest-water-basin"],
    )


def _trapping_rain() -> dict:
    return DL(
        "wp-trapping-rain-water",
        "Worked Problem: Trapping Rain Water",
        "Four approaches from O(n^2) to O(1) space, and the insight that each one adds.",
        15,
        "**Interviewer:** \"Given an array of non-negative integers representing an elevation map where each bar has width 1, compute how much water can be trapped after raining.\"",
        [
            (
                "Why It Matters",
                """This is a genuine hard problem with a ladder of four solutions, each adding one idea: per-position reasoning, precomputation, a monotonic stack, and finally two pointers with O(1) space. Walking the ladder is a much better performance than jumping to the final answer, because each rung demonstrates a different technique.

It also has an insight that must be found before any code helps: water above a given position depends only on the tallest bar to its left and the tallest to its right.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Are heights non-negative?"* — Yes.
- *"Water at position i is limited by the tallest bar on each side?"* — Confirm this out loud; it is the crux.
- *"Return total water or a per-position array?"* — The total.
- *"Can the array be empty?"* — Yes, returning 0.
- *"Can the bars be very tall and the array long?"* — Determines whether the total can overflow an int.

Confirming the physical model — water is held between two walls and limited by the shorter one — is the single most valuable clarification.""",
            ),
            (
                "Step 2: The Per-Position Insight",
                """> "The water above position i is `min(maxLeft, maxRight) - height[i]`, where `maxLeft` is the tallest bar at or left of i and `maxRight` the tallest at or right of i — clamped at zero if that is negative.

Once I have that, the total is a sum over all positions. So the whole problem reduces to computing those two maxima efficiently."

That reduction is the insight. Everything afterwards is an engineering choice about how to get the maxima.

**Approach 1 — recompute per position:** scan left and right from each i. O(n^2) time, O(1) space. Correct and too slow.""",
            ),
            (
                "How It Works",
                """**Approach 2 — precompute both maxima.**

```java
int trapPrecomputed(int[] height) {
    int n = height.length;
    if (n == 0) return 0;

    int[] maxLeft = new int[n], maxRight = new int[n];
    maxLeft[0] = height[0];
    for (int i = 1; i < n; i++) maxLeft[i] = Math.max(maxLeft[i - 1], height[i]);

    maxRight[n - 1] = height[n - 1];
    for (int i = n - 2; i >= 0; i--) maxRight[i] = Math.max(maxRight[i + 1], height[i]);

    int water = 0;
    for (int i = 0; i < n; i++) {
        water += Math.min(maxLeft[i], maxRight[i]) - height[i];
    }
    return water;
}
// O(n) time, O(n) space
```

Two prefix-maximum arrays, which is the prefix-aggregate technique applied to maxima rather than sums. This is a complete, correct answer and a perfectly good place to stop if time is short.

**Approach 3 — monotonic stack**, filling water horizontally layer by layer:

```java
int trapStack(int[] height) {
    Deque<Integer> stack = new ArrayDeque<>();     // indices, decreasing heights
    int water = 0;
    for (int i = 0; i < height.length; i++) {
        while (!stack.isEmpty() && height[stack.peek()] < height[i]) {
            int bottom = stack.pop();
            if (stack.isEmpty()) break;            // no left wall, water escapes
            int left = stack.peek();
            int width = i - left - 1;
            int depth = Math.min(height[left], height[i]) - height[bottom];
            water += width * depth;
        }
        stack.push(i);
    }
    return water;
}
// O(n) time, O(n) space
```

**Approach 4 — two pointers, O(1) space.** The one the interviewer is usually driving towards:

```java
int trap(int[] height) {
    int lo = 0, hi = height.length - 1;
    int maxLeft = 0, maxRight = 0, water = 0;

    while (lo < hi) {
        if (height[lo] < height[hi]) {
            maxLeft = Math.max(maxLeft, height[lo]);
            water += maxLeft - height[lo];         // maxLeft is the true limit here
            lo++;
        } else {
            maxRight = Math.max(maxRight, height[hi]);
            water += maxRight - height[hi];
            hi--;
        }
    }
    return water;
}
// O(n) time, O(1) space
```

The argument, which must be stated: "If `height[lo] < height[hi]`, then there exists some bar on the right at least as tall as `height[hi]`, which is greater than `height[lo]`. So the water at `lo` is limited by `maxLeft`, not by anything on the right — I do not need to know `maxRight` exactly, only that it is large enough. That is what makes the single running maximum on each side sufficient."

Without that argument the code looks like a trick; with it, it is obviously correct.""",
            ),
            (
                "Step 4: Test It",
                """> "Input `[0,1,0,2,1,0,1,3,2,1,2,1]`, expected 6.

Trace the two-pointer version briefly: lo = 0 with height 0, hi = 11 with height 1. Since 0 < 1, maxLeft becomes 0, water adds 0, lo becomes 1. Height 1 versus 1 — not less, so the right branch: maxRight becomes 1, water adds 0, hi becomes 10. And so on; the total accumulates to 6.

Edge cases: empty array returns 0, since the loop never runs. A single bar traps nothing. Two bars trap nothing. Monotonically increasing, `[1,2,3,4]`, traps nothing — and this is the case that checks the running maximum is never ahead of itself. All equal traps nothing. A valley, `[3,0,3]`, traps 3.

Overflow: with a long array of tall bars, the total could exceed an int; I would use `long` for the accumulator if the constraints allowed large values."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Adds |
| --- | --- | --- | --- |
| Brute force | O(n^2) | O(1) | The per-position formula |
| Prefix maxima | O(n) | O(n) | Precomputation |
| Monotonic stack | O(n) | O(n) | Horizontal layer filling |
| Two pointers | O(n) | O(1) | The asymmetry argument |

The two-pointer version is best on both axes, so there is no trade between it and the others — only a difference in how obvious the correctness is.

The stack version is worth knowing anyway, because it generalises to largest-rectangle-in-histogram while the two-pointer version does not.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Can you do it in O(1) space?"** — The two-pointer version, with the asymmetry argument.
- **"Why is the running maximum on one side enough?"** — Because the comparison guarantees a tall enough bar exists on the other side, even though you do not know its value.
- **"What if it were 2D — a grid of heights?"** — Completely different: water escapes through the lowest boundary point, so it is a priority-queue BFS from the border inwards, processing the lowest boundary cell each time. Naming that is the expected answer; implementing it is not.
- **"What if bars could have different widths?"** — The formula generalises, multiplying depth by width per segment.
- **"Could the answer overflow?"** — Yes for large inputs; use `long`.
- **"Which approach would you write in production?"** — The prefix-maxima version, for readability, unless memory is genuinely constrained.

That last answer is worth giving honestly: the O(1) version is cleverer and the O(n) version is easier for a colleague to verify.""",
            ),
            (
                "Common Mistakes",
                """- Computing water per position without clamping at zero
- Forgetting that `maxLeft` and `maxRight` must include the current bar
- In the stack version, not breaking when the stack empties, so water escapes off the left edge
- In the two-pointer version, updating the maximum after adding water rather than before
- Jumping straight to the two-pointer code without the argument
- Overflowing the accumulator on large inputs""",
            ),
            (
                "Variations",
                """- **Container with most water**: a single container's area rather than total trapped water.
- **Largest rectangle in a histogram**: monotonic stack, and the stack version here is the closest relative.
- **Trapping rain water 2D**: priority-queue BFS from the boundary.
- **Product of array except self**: the same prefix-and-suffix aggregate technique with products.

The prefix-and-suffix pattern in approach 2 is the most transferable part of this problem.""",
            ),
            (
                "Interview Tip",
                """Start with the per-position formula — "water above i is `min(maxLeft, maxRight) - height[i]`" — before discussing any implementation. Every approach is a way of computing those two maxima, so stating the formula first makes the ladder of solutions a sequence of optimisations rather than four unrelated ideas.""",
            ),
        ],
        [
            "Water above position i is `min(maxLeft, maxRight) - height[i]` — every approach just computes those maxima.",
            "Prefix and suffix maximum arrays give a clear O(n) time, O(n) space solution.",
            "Two pointers reach O(1) space because the comparison guarantees a tall enough bar exists on the far side.",
            "The 2D version is a different algorithm: priority-queue BFS inward from the boundary.",
        ],
        [
            "What determines the water above a single position?",
            "Why is a single running maximum on each side sufficient in the two-pointer version?",
            "How would you solve the 2D version?",
            "Which approach would you choose for production code, and why?",
        ],
        ["valley-rain"],
    )


def _valid_parentheses() -> dict:
    return DL(
        "wp-valid-parentheses",
        "Worked Problem: Valid Parentheses",
        "The stack warm-up, the two failure cases, and the follow-ups that make it interesting.",
        11,
        "**Interviewer:** \"Given a string containing only the characters `()[]{}`, determine whether the brackets are correctly matched and nested.\"",
        [
            (
                "Why It Matters",
                """This is a warm-up, and warm-ups are scored. Interviewers use it to check that you handle edge cases without prompting, write clean code quickly, and do not over-engineer. Producing it in ninety seconds with both failure cases handled buys goodwill for the harder problem that follows.

The follow-ups are where it becomes interesting: the counter optimisation for a single bracket type, and the variant with a wildcard character, both test whether you understand *why* the stack is needed rather than that it is the standard answer.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Only bracket characters, or can other characters appear?"* — Only brackets, as stated; if others appeared I would skip them.
- *"Is an empty string valid?"* — Conventionally yes.
- *"Must brackets be correctly nested, or just balanced in count?"* — Nested. `([)]` is invalid even though the counts match, and this distinction is exactly why a counter is insufficient for multiple types.
- *"How long can the string be?"* — Determines whether stack memory matters.

The nesting-versus-counting question is the one that identifies the right data structure.""",
            ),
            (
                "Step 2: The Approach",
                """> "The most recently opened bracket must be the first one closed, which is last-in-first-out — so a stack. Push on an opener, and on a closer check that the top matches.

There are exactly two ways this fails: a closer arrives with nothing open, and openers remain when the string ends. Both need explicit handling."

Naming both failure cases before coding is what prevents forgetting the second one, which is the more commonly missed of the two.""",
            ),
            (
                "How It Works",
                """```java
boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        switch (c) {
            case '(' -> stack.push(')');          // push the EXPECTED closer
            case '[' -> stack.push(']');
            case '{' -> stack.push('}');
            default -> {
                if (stack.isEmpty() || stack.pop() != c) return false;
            }
        }
    }
    return stack.isEmpty();                        // nothing left unclosed
}
// O(n) time, O(n) space
```

Pushing the expected closing bracket rather than the opener is a small simplification worth explaining: it turns the match into a single equality comparison with no lookup table.

The two guards map exactly to the two failure cases: `stack.isEmpty()` inside the loop catches a closer with nothing open, and `stack.isEmpty()` at the end catches unclosed openers. Candidates routinely write one and forget the other.

`ArrayDeque` rather than `java.util.Stack`, because the latter is synchronised and iterates bottom-to-top.""",
            ),
            (
                "Step 4: Test It",
                """> "`"()"` — push `)`, then pop and match, stack empty at the end. Valid.

`"([)]"` — push `)`, push `]`, then `)` arrives and pops `]`, which does not match, so false. Correct, and this is the case a counter would wrongly accept.

`")("` — the first character is a closer with an empty stack, so false immediately. This is the first failure case.

`"("` — nothing fails inside the loop, but the stack is not empty at the end, so false. This is the second failure case, and it is the one people forget.

`""` — the loop never runs, the stack is empty, returns true.

A long string of openers, `"((((("`, exercises the stack depth and returns false correctly."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Works for |
| --- | --- | --- | --- |
| Counter | O(n) | O(1) | One bracket type only |
| Stack | O(n) | O(n) | Multiple types with nesting |
| Repeated string replacement | O(n^2) | O(n) | Correct and unacceptably slow |

The counter version is worth mentioning as the optimisation when only one bracket type exists:

```java
boolean isValidSingleType(String s) {
    int open = 0;
    for (char c : s.toCharArray()) {
        open += (c == '(') ? 1 : -1;
        if (open < 0) return false;               // a closer with nothing open
    }
    return open == 0;
}
// O(n) time, O(1) space
```

Volunteering that a counter suffices for one type, and that it does *not* for several because nesting order matters, demonstrates that you know why the stack is there.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What if there is only one bracket type?"** — A counter, O(1) space, with the negative check.
- **"What if the string contains other characters?"** — Skip them; only brackets affect validity.
- **"What is the minimum number of insertions to make it valid?"** — Track unmatched openers and unmatched closers separately; the answer is their sum.
- **"What if `*` can be an opener, a closer, or empty?"** — A greedy range: track the minimum and maximum possible number of open brackets, clamping the minimum at zero. Valid if the minimum reaches zero at the end and the maximum never goes negative. This is a genuinely harder variant with an elegant O(1)-space answer.
- **"What is the longest valid parentheses substring?"** — A stack of indices, or a DP; noticeably harder than the validity check.
- **"Can you do it in O(1) space for multiple types?"** — No, and say why: you must remember the *order* of unclosed openers, which requires storage proportional to the nesting depth.

That last answer is the one that shows you understand the lower bound rather than just the algorithm.""",
            ),
            (
                "Common Mistakes",
                """- Forgetting to check that the stack is empty at the end
- Popping without first checking that the stack is non-empty
- Using a counter for multiple bracket types, accepting `([)]`
- Using `java.util.Stack` and being surprised by iteration order
- Returning early on the first match rather than continuing
- Over-engineering a warm-up with a map of pairs when a switch is clearer""",
            ),
            (
                "Variations",
                """- **Minimum add to make valid**: count unmatched on both sides.
- **Minimum remove to make valid**: a stack of indices to delete.
- **Longest valid substring**: a stack of indices, or DP.
- **Valid parentheses with a wildcard**: the min/max range technique.
- **Remove outermost parentheses**: a depth counter.
- **Score of parentheses**: a stack of running scores.

All six use the same nesting insight with different bookkeeping, which is why the warm-up is worth doing properly.""",
            ),
            (
                "Interview Tip",
                """Name both failure cases before you write the loop: "a closing bracket with nothing open, and openers left over at the end." Both become one line each, and stating them first means you cannot forget the second one — which is the mistake this problem is designed to catch.""",
            ),
        ],
        [
            "Nesting means last-in-first-out, which means a stack; counting alone accepts `([)]`.",
            "There are exactly two failure cases: a closer with an empty stack, and a non-empty stack at the end.",
            "Push the expected closing bracket so matching is a single equality comparison.",
            "O(1) space is impossible for multiple bracket types, because the order of unclosed openers must be remembered.",
        ],
        [
            "What are the two ways this validation can fail?",
            "When is a counter sufficient instead of a stack?",
            "How would you handle a wildcard that can be either bracket or empty?",
            "Can this be done in O(1) space for multiple bracket types?",
        ],
        ["balanced-brackets"],
    )


def _min_stack() -> dict:
    return DL(
        "wp-min-stack",
        "Worked Problem: Min Stack",
        "A design question with a one-structure composition, and the duplicate-value trap.",
        11,
        "**Interviewer:** \"Design a stack that supports push, pop, top, and retrieving the minimum element, all in constant time.\"",
        [
            (
                "Why It Matters",
                """This is the simplest data-structure design question and a good introduction to the composition method: no single structure gives both LIFO ordering and O(1) minimum, so you combine two.

It also contains a specific trap — handling duplicate minimum values — that separates a working solution from a correct one, and interviewers test it deliberately with input like `[2, 2, 1]`.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Is `getMin` on an empty stack defined?"* — Ask; typically the problem guarantees it is only called on a non-empty stack, but the contract should be explicit.
- *"Can values repeat?"* — Yes, and this is the important one.
- *"Are the values integers, and can they be negative or extreme?"* — Affects sentinel choices.
- *"Must all four operations be worst-case O(1), or amortised?"* — Worst case is achievable here, so aim for it.
- *"Is memory constrained?"* — Determines whether the optimised variant is worth it.

The duplicates question is the one that changes the implementation.""",
            ),
            (
                "Step 2: The Composition",
                """Build the table:

| Operation | Required | Plain stack | Extra structure needed |
| --- | --- | --- | --- |
| push | O(1) | yes | must also record the new minimum |
| pop | O(1) | yes | must restore the previous minimum |
| top | O(1) | yes | none |
| getMin | O(1) | no — scanning is O(n) | a parallel record of minima |

> "A single minimum variable is not enough, because popping the minimum requires knowing the *previous* minimum — and that information is gone. What I need is the minimum at every point in the stack's history, which is itself a stack."

That reasoning — "a variable is insufficient because pop must restore history" — is the insight, and it is more valuable than the code.""",
            ),
            (
                "How It Works",
                """```java
class MinStack {
    private final Deque<Integer> values = new ArrayDeque<>();
    private final Deque<Integer> minima = new ArrayDeque<>();

    void push(int value) {
        values.push(value);
        minima.push(minima.isEmpty() ? value : Math.min(value, minima.peek()));
    }

    void pop() {
        values.pop();
        minima.pop();                  // always in lockstep
    }

    int top() { return values.peek(); }

    int getMin() { return minima.peek(); }
}
// All operations O(1) worst case; O(n) extra space
```

Keeping the two stacks exactly in lockstep is what makes this trivially correct — every push pushes to both, every pop pops from both, so they can never desynchronise.

The memory-optimised variant only pushes to the minima stack when the value is a new minimum:

```java
void push(int value) {
    values.push(value);
    if (minima.isEmpty() || value <= minima.peek()) minima.push(value);   // <= is essential
}

void pop() {
    int removed = values.pop();
    if (removed == minima.peek()) minima.pop();
}
```

**The `<=` rather than `<` is the trap.** With input `2, 2` and strict comparison, the second 2 is not pushed to the minima stack; popping one 2 then removes the single recorded minimum, and `getMin` afterwards returns the wrong value or throws. Using `<=` records both, so each pop removes one.

Explaining that with the concrete `[2, 2, 1]` trace is exactly what the interviewer is waiting for.""",
            ),
            (
                "Step 4: Test It",
                """> "Push 3, 5, 2, 2, 1. The minima stack holds 3, 3, 2, 2, 1 in the lockstep version. `getMin` returns 1.

Pop once: values lose the 1, minima lose the 1, `getMin` returns 2. Correct.

Pop again: one of the 2s goes from both, `getMin` still returns 2 because the other 2 remains. This is the duplicate case, and the lockstep version handles it automatically.

In the optimised version with `<=`, the minima stack holds 3, 2, 2, 1 — both 2s recorded — so the same sequence works. With strict `<` it would hold 3, 2, 1, and after two pops `getMin` would incorrectly return 3.

Edge cases: a single push then `getMin` returns that value. Pushing `Integer.MIN_VALUE` works because I never use it as a sentinel. Popping to empty then pushing again starts fresh, since both stacks are empty together."
""",
            ),
            (
                "Trade-offs",
                """| Approach | push | pop | getMin | Extra space |
| --- | --- | --- | --- | --- |
| Scan on getMin | O(1) | O(1) | O(n) | O(1) |
| Parallel minima stack | O(1) | O(1) | O(1) | O(n) |
| Optimised minima stack | O(1) | O(1) | O(1) | O(distinct minima) |
| Encoded single stack | O(1) | O(1) | O(1) | O(1) |

The encoded variant stores a transformed value when a new minimum arrives, allowing the previous minimum to be recovered arithmetically. It achieves O(1) extra space and risks overflow, so it is a clever answer rather than a good one — worth naming, not worth writing.

The lockstep version is what I would write: it is impossible to desynchronise, and the memory saving of the optimised version rarely matters.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Can you use less space?"** — Only push to the minima stack on a new minimum, with `<=` for duplicates. Explain the trap.
- **"What about a max stack with an O(1) popMax?"** — Harder: removing the maximum from the middle of the stack requires a doubly linked list plus a TreeMap of nodes, because the maximum is not at the top.
- **"What if getMin is called on an empty stack?"** — Define the contract: throw, or return an Optional.
- **"Can you do it with a single stack?"** — Yes, by encoding; mention the overflow risk.
- **"Would this be thread-safe?"** — No; the two stacks must be updated atomically, so it needs a lock around both operations.
- **"What if you also needed the median in O(1)?"** — That is a different problem entirely — two heaps, and pop becomes arbitrary removal, which heaps do not support efficiently.""",
            ),
            (
                "Common Mistakes",
                """- Keeping a single minimum variable, which cannot be restored on pop
- Using `<` instead of `<=` in the optimised version, breaking duplicates
- Letting the two stacks desynchronise by conditionally pushing but unconditionally popping
- Scanning for the minimum and claiming O(1)
- Using `Integer.MIN_VALUE` as an empty sentinel when it is a legal value
- Over-engineering with the encoded single-stack version and introducing overflow""",
            ),
            (
                "Variations",
                """- **Max stack with popMax**: doubly linked list plus TreeMap; substantially harder.
- **Min queue**: a monotonic deque, which is the sliding-window-maximum structure.
- **Stack with `getMedian`**: two heaps with lazy deletion.
- **Queue from two stacks**: a different composition with an amortised argument.

The min-queue variant is a nice follow-up because it is *not* solvable by the same parallel-stack trick — a queue removes from the opposite end, so the minima structure must be a deque.""",
            ),
            (
                "Interview Tip",
                """Say why a single variable fails before proposing the second stack: "popping the minimum requires the previous minimum, which a single variable has already lost." That sentence derives the solution rather than recalling it, and it takes five seconds.""",
            ),
        ],
        [
            "A single minimum variable cannot be restored after a pop; you need the minimum at every depth, which is a stack.",
            "Keeping both stacks in exact lockstep makes desynchronisation impossible.",
            "The space-optimised variant must use `<=`, or duplicate minima are lost on pop.",
            "A max stack with O(1) popMax is a genuinely harder problem needing a linked list plus an ordered map.",
        ],
        [
            "Why is a single minimum variable insufficient?",
            "What goes wrong with strict comparison in the optimised version?",
            "How would you support removing the maximum in O(1)?",
            "How would you make this thread-safe?",
        ],
        ["minimum-tracker-stack"],
    )


def _search_range() -> dict:
    return DL(
        "wp-search-range",
        "Worked Problem: First and Last Position in a Sorted Array",
        "Two boundary searches instead of one search plus a scan, and why the difference matters.",
        12,
        "**Interviewer:** \"Given a sorted array of integers and a target, find the first and last position of the target. If the target is absent, return [-1, -1]. Your algorithm must run in O(log n).\"",
        [
            (
                "Why It Matters",
                """The stated O(log n) requirement is the entire point: the obvious approach — binary search for any occurrence, then scan outwards — is O(n) in the worst case, and the interviewer chose an input where that matters.

It is also the cleanest demonstration of reframing binary search as boundary-finding rather than target-finding, which is the reframing that makes every binary-search variant straightforward.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Is the array sorted ascending?"* — Yes.
- *"Can it contain duplicates?"* — Yes; that is the whole problem.
- *"Can it be empty?"* — Yes, returning `[-1, -1]`.
- *"Are positions zero-indexed?"* — Yes.
- *"Is O(log n) required, or preferred?"* — Required, as stated — which rules out scanning.

The complexity requirement is not decoration; it is the constraint that selects the approach.""",
            ),
            (
                "Step 2: The Tempting Wrong Answer",
                """> "The obvious approach is a standard binary search to find any occurrence, then expand left and right while the neighbours equal the target.

That is O(log n) to find and O(k) to expand, where k is the number of occurrences. On an array that is entirely the target value, k is n, so the worst case is O(n) — which violates the stated requirement."

Identifying and rejecting this approach with the specific worst-case input is a strong move. It shows you read the constraint and understood why it was given.""",
            ),
            (
                "Step 3: Reframe as Boundaries",
                """> "Instead of searching for the target, I will search for two *boundaries*: the first index where the value is at least the target, and the first index where it is strictly greater.

The first gives me the start of the run; the second, minus one, gives me the end. Both are plain binary searches on a monotone predicate, so both are O(log n) regardless of how many duplicates exist."

That reframing is the answer, and it generalises: insert position, count of a value, and floor and ceiling queries are all the same two searches.""",
            ),
            (
                "How It Works",
                """```java
int[] searchRange(int[] nums, int target) {
    int first = lowerBound(nums, target);
    if (first == nums.length || nums[first] != target) {
        return new int[] {-1, -1};                 // target absent
    }
    int last = upperBound(nums, target) - 1;
    return new int[] {first, last};
}

// first index with nums[i] >= target, or nums.length if none
private int lowerBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;                  // hi is EXCLUSIVE
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] >= target) hi = mid;         // mid might be the answer
        else lo = mid + 1;                         // mid definitely is not
    }
    return lo;
}

// first index with nums[i] > target
private int upperBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] > target) hi = mid;          // only difference: > instead of >=
        else lo = mid + 1;
    }
    return lo;
}
// O(log n) time, O(1) space
```

Four properties make the template safe, and they are worth stating: the half-open range means "not found" lands naturally at `nums.length`; `while (lo < hi)` terminates when the range is empty; `hi = mid` versus `lo = mid + 1` guarantees the range strictly shrinks so no infinite loop is possible; and `lo + (hi - lo) / 2` cannot overflow.

The two functions differ by a single character, which is the point of learning the boundary template rather than deriving each variant.""",
            ),
            (
                "Step 4: Test It",
                """> "Input `[5, 7, 7, 8, 8, 10]`, target 8. `lowerBound` converges to index 3; `nums[3]` is 8, so the target is present. `upperBound` converges to index 5, so the last position is 4. Returns `[3, 4]`. Correct.

Target 6, which is absent: `lowerBound` returns 1, and `nums[1]` is 7, not 6, so `[-1, -1]`. Correct.

Empty array: `lowerBound` returns 0, which equals `nums.length`, so the guard catches it before indexing. That guard is why the order of the two conditions matters — checking `first == nums.length` before `nums[first]` avoids an out-of-bounds access.

All elements equal to the target, `[8, 8, 8, 8]`: `lowerBound` returns 0 and `upperBound` returns 4, giving `[0, 3]` in O(log n) — which is exactly the case the scanning approach would handle in O(n).

Target smaller than everything returns `[-1, -1]`; larger than everything makes `lowerBound` return `nums.length` and the guard catches it."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Notes |
| --- | --- | --- |
| Linear scan | O(n) | Trivially correct, violates the requirement |
| Binary search plus expansion | O(log n + k) | O(n) when the array is all target |
| Two boundary searches | O(log n) | The answer |

There is no space trade — all three are O(1). The only cost of the boundary approach is that it requires the reframing, which is why stating it explicitly is worth the time.

A related benefit worth mentioning: `upperBound - lowerBound` gives the *count* of occurrences in O(log n), which the expansion approach also gets but only in O(k).""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Why not find one occurrence and expand?"** — O(n) on an all-duplicates array; name that input specifically.
- **"How many times does the target occur?"** — `upperBound - lowerBound`, in O(log n).
- **"Where would the target be inserted if absent?"** — That is exactly `lowerBound`.
- **"What is the largest element less than the target?"** — `lowerBound - 1`, with a guard for index -1.
- **"What if the array were rotated?"** — Identify the sorted half first, then search; duplicates degrade it to O(n) in the worst case.
- **"How do you avoid an infinite loop?"** — The range must strictly shrink on every branch; `hi = mid` pairs with `lo < hi`, and `hi = mid - 1` pairs with `lo <= hi`. Mixing the two is the classic bug.""",
            ),
            (
                "Common Mistakes",
                """- Scanning outwards after finding an occurrence, then claiming O(log n)
- Mixing the half-open and inclusive templates, causing an infinite loop
- Indexing `nums[first]` before checking `first == nums.length`
- `(lo + hi) / 2` overflow
- Writing two subtly different searches instead of one template with a changed comparison
- Forgetting that `upperBound` returns one past the last occurrence""",
            ),
            (
                "Variations",
                """- **Insert position**: `lowerBound` alone.
- **Count occurrences**: the difference of the two bounds.
- **Floor and ceiling**: `lowerBound - 1` and `lowerBound`.
- **Peak element**: binary search on a different monotone predicate, on unsorted data.
- **Minimum in a rotated array**: compare against the right endpoint rather than the left.
- **Binary search on the answer**: the same template applied to a value range rather than an index range.

The last one is the most valuable connection: this template is the same machinery used for "minimise the maximum" problems.""",
            ),
            (
                "Interview Tip",
                """Say "I will search for boundaries rather than for the target" before writing anything, and then write one template and change one comparison. It converts four different binary-search questions into one piece of code you can write without thinking.""",
            ),
        ],
        [
            "Reframe binary search as finding the boundary of a monotone predicate, not finding a target.",
            "Find-then-expand is O(n) when the array is all duplicates, which is why the stated O(log n) rules it out.",
            "One half-open template with `>=` or `>` gives lower and upper bounds, insert position, and counts.",
            "Check `first == nums.length` before indexing, or an absent target causes an out-of-bounds access.",
        ],
        [
            "Why is finding one occurrence and expanding insufficient?",
            "How do lower and upper bound differ, and by how much code?",
            "How would you count the occurrences of the target?",
            "How do you guarantee the binary search terminates?",
        ],
        ["first-and-last-position"],
    )


def _median_two_sorted() -> dict:
    return DL(
        "wp-median-two-sorted",
        "Worked Problem: Median of Two Sorted Arrays",
        "A genuinely hard binary search, built up from the merge solution rather than recalled.",
        15,
        "**Interviewer:** \"Given two sorted arrays of sizes m and n, return the median of the combined sorted array. The overall run time should be O(log(m + n)).\"",
        [
            (
                "Why It Matters",
                """This is one of the hardest commonly-asked problems, and candidates who try to recall the solution almost always get the index arithmetic wrong. Candidates who derive it — starting from the merge, noticing that the median is defined by a *partition*, and binary searching that partition — usually get there.

It also rewards presenting the ladder: the O(m + n) merge is a complete correct answer, and offering it first means you have something working before attempting the hard version.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Can either array be empty?"* — Yes, and this is a real edge case.
- *"Is the median the average of the two middles for an even total?"* — Yes, so the return type is a double.
- *"Are the arrays sorted ascending?"* — Yes.
- *"Can they contain duplicates?"* — Yes, which the partition approach handles naturally.
- *"Is O(log(m + n)) required?"* — As stated, which rules out merging.

Confirming the even-length definition matters because it changes the final computation.""",
            ),
            (
                "Step 2: The Merge Solution",
                """> "The straightforward answer merges the two arrays and takes the middle. That is O(m + n) time. I do not even need to build the merged array — I can walk two pointers until I reach the middle position, which is O(m + n) time and O(1) space.

That is a complete, correct solution. The requirement asks for logarithmic time, so let me see whether I can do better — but I want this on the table first."

Offering the working solution before attempting the hard one is good practice on any problem, and especially this one.""",
            ),
            (
                "Step 3: Reframe as a Partition",
                """> "The median splits the combined array into two halves of equal size, where every element in the left half is at most every element in the right half.

I do not need to *build* that split. I only need to choose how many elements to take from the first array — call it `i`. Then the number from the second array is determined: `j = half - i`. So there is only one degree of freedom.

The split is correct exactly when `maxLeft1 <= minRight2` and `maxLeft2 <= minRight1`. If `maxLeft1 > minRight2`, I took too many from the first array and must decrease `i`; if `maxLeft2 > minRight1`, I took too few.

That condition is monotone in `i`, so I can binary search it — over the smaller array, giving O(log(min(m, n)))."

That derivation is the whole problem. The code that follows is bookkeeping.""",
            ),
            (
                "How It Works",
                """```java
double findMedianSortedArrays(int[] a, int[] b) {
    if (a.length > b.length) return findMedianSortedArrays(b, a);   // search the smaller

    int m = a.length, n = b.length;
    int half = (m + n + 1) / 2;                    // size of the left partition
    int lo = 0, hi = m;                            // how many to take from a

    while (lo <= hi) {
        int i = lo + (hi - lo) / 2;                // taken from a
        int j = half - i;                          // taken from b

        int maxLeftA  = (i == 0) ? Integer.MIN_VALUE : a[i - 1];
        int minRightA = (i == m) ? Integer.MAX_VALUE : a[i];
        int maxLeftB  = (j == 0) ? Integer.MIN_VALUE : b[j - 1];
        int minRightB = (j == n) ? Integer.MAX_VALUE : b[j];

        if (maxLeftA > minRightB) {
            hi = i - 1;                            // took too many from a
        } else if (maxLeftB > minRightA) {
            lo = i + 1;                            // took too few from a
        } else {
            int maxLeft = Math.max(maxLeftA, maxLeftB);
            if ((m + n) % 2 == 1) return maxLeft;                       // odd total
            int minRight = Math.min(minRightA, minRightB);
            return (maxLeft + minRight) / 2.0;                          // even total
        }
    }
    return 0.0;                                    // unreachable for valid input
}
// O(log(min(m, n))) time, O(1) space
```

Four details that make it correct, and each is worth a sentence:

1. **Searching the smaller array** bounds `j` within range and gives the better complexity.
2. **The infinity sentinels** handle the cases where a partition takes nothing or everything from one array, which removes every special case. This is the trick that makes the code short.
3. **`(m + n + 1) / 2`** puts the extra element on the left for odd totals, so the odd case reads the answer directly from `maxLeft`.
4. **`lo <= hi` with `hi = i - 1`** is the inclusive template; mixing it with the half-open one is the usual source of infinite loops here.""",
            ),
            (
                "Step 4: Test It",
                """> "`a = [1, 3]`, `b = [2]`. m = 2, n = 1, half = 2. lo = 0, hi = 2, so i = 1, j = 1. maxLeftA = 1, minRightA = 3, maxLeftB = 2, minRightB = infinity. Is 1 > infinity? No. Is 2 > 3? No. So the partition is valid. Total is odd, so return max(1, 2) = 2. Correct.

`a = [1, 2]`, `b = [3, 4]`. half = 2. i = 1, j = 1. maxLeftA = 1, minRightA = 2, maxLeftB = 3, minRightB = 4. Is 3 > 2? Yes, so `lo = i + 1 = 2`. Now i = 2, j = 0. maxLeftA = 2, minRightA = infinity, maxLeftB = -infinity, minRightB = 3. Both conditions pass. Even total, so `(max(2, -inf) + min(inf, 3)) / 2 = (2 + 3) / 2 = 2.5`. Correct.

One array empty: `a = []`, `b = [1, 2, 3]`. After the swap, a is the empty one. m = 0, so lo = hi = 0, i = 0, j = 2. The sentinels handle both ends of a, and the answer comes from b alone. Correct — and this is exactly the case the sentinels exist for.

Arrays that do not overlap at all, and arrays with all-identical values, both work because the partition condition only compares boundary elements."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Notes |
| --- | --- | --- | --- |
| Merge fully | O(m + n) | O(m + n) | Simplest, builds the array |
| Two pointers to the middle | O(m + n) | O(1) | Simple and space-efficient |
| Binary search on the partition | O(log(min(m, n))) | O(1) | Meets the requirement, hard to write |

The honest position to state: "For most real inputs the two-pointer merge is fast enough and dramatically easier to verify. I would write the binary search here because the requirement asks for it, but in production code I would want a strong justification before choosing the harder version."

That judgement is worth saying — interviewers respond well to candidates who know when cleverness is not warranted.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Why search the smaller array?"** — It bounds `j` legally and gives O(log(min(m, n))) rather than O(log(max)).
- **"How do you handle the empty partition cases?"** — Infinity sentinels, which remove every boundary special case.
- **"What is the kth smallest element of the two arrays?"** — The same partition idea generalises; or a recursive approach discarding k/2 elements at a time, also O(log k).
- **"What if there were three arrays?"** — The partition argument does not generalise cleanly; a heap-based merge or repeated pairwise application is the practical answer.
- **"What if the arrays were not sorted?"** — Sorting is O(n log n), which dominates, so the clever search buys nothing.
- **"Could you do this with quickselect?"** — On a merged array yes, at O(m + n) expected — worse than the merge and without a guarantee.""",
            ),
            (
                "Common Mistakes",
                """- Searching the larger array, making `j` fall out of range
- Omitting the infinity sentinels and writing four special cases instead
- Using `(m + n) / 2` instead of `(m + n + 1) / 2`, which breaks the odd case
- Mixing the inclusive and half-open binary search templates
- Integer division when the even case needs a double
- Attempting to recall the code rather than deriving the partition condition""",
            ),
            (
                "Variations",
                """- **Kth smallest in two sorted arrays**: the same partition with `half` replaced by k.
- **Kth smallest in a sorted matrix**: binary search on the *value* rather than the index, counting elements at most the candidate.
- **Median of a data stream**: two heaps — a completely different problem despite the similar name.
- **Merge k sorted arrays**: a heap, since the partition argument does not extend.

The matrix variant is a good contrast: both binary search, but one searches an index range and the other a value range.""",
            ),
            (
                "Interview Tip",
                """Offer the O(m + n) two-pointer merge first, say it is correct, and then say "the requirement asks for logarithmic, so let me reframe the median as a partition". If you run out of time on the hard version you still have a working answer, and the derivation is what is being scored anyway.""",
            ),
        ],
        [
            "The median is defined by a partition, and choosing how many elements come from one array determines the rest.",
            "The partition is valid when each side's maximum-left is at most the other side's minimum-right, and that condition is monotone.",
            "Binary search the smaller array and use infinity sentinels to remove every boundary special case.",
            "Offer the O(m + n) merge first so you have a correct answer before attempting the logarithmic one.",
        ],
        [
            "How do you reframe the median as a partition problem?",
            "Why binary search the smaller array?",
            "What do the infinity sentinels accomplish?",
            "How would you find the kth smallest element instead?",
        ],
        ["merged-median"],
    )


def _level_order() -> dict:
    return DL(
        "wp-level-order",
        "Worked Problem: Binary Tree Level Order Traversal",
        "The level-size trick, and the family of per-level questions it unlocks.",
        11,
        "**Interviewer:** \"Given the root of a binary tree, return its node values grouped by level, from left to right, top to bottom.\"",
        [
            (
                "Why It Matters",
                """The technique here — snapshotting the queue size before processing a level — is small, easy to miss, and unlocks an entire family of questions: right side view, zigzag order, level averages, minimum depth, and largest value per level. Learning it once solves six problems.

It is also a good test of whether you reach for BFS when the question is about depth, rather than defaulting to recursion.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Can the tree be empty?"* — Yes, returning an empty list.
- *"Should each level be a separate list, or one flat list?"* — Grouped by level, as stated.
- *"Left to right within a level?"* — Yes.
- *"Can node values repeat?"* — Yes, and it does not matter here.
- *"Is the tree balanced?"* — Affects the memory analysis but not the algorithm.

The grouping requirement is what forces the level-size trick; a flat traversal would not need it.""",
            ),
            (
                "Step 2: The Approach",
                """> "Breadth-first search visits nodes in order of depth, which gives the traversal order directly. The only difficulty is knowing where one level ends and the next begins.

The queue at the start of each iteration contains exactly the nodes of the current level — nothing more, because the previous level's nodes have all been dequeued and only their children have been added. So capturing the queue size before processing gives me the level boundary for free."

That observation is the entire technique, and stating it means the code needs no further explanation.""",
            ),
            (
                "How It Works",
                """```java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> out = new ArrayList<>();
    if (root == null) return out;

    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int levelSize = queue.size();                    // snapshot BEFORE adding children
        List<Integer> level = new ArrayList<>(levelSize);

        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        out.add(level);
    }
    return out;
}
// O(n) time, O(width) space
```

The `levelSize` snapshot is the whole trick. Without it, the inner loop would consume children added during the same iteration and the levels would merge into one flat list.

Pre-sizing the level list is a small efficiency detail — you know exactly how many elements it will hold.

`ArrayDeque` rather than `LinkedList` for the queue: better locality and no reason to choose the alternative.

There is also a DFS solution that passes the depth down and appends to the list at that index:

```java
void dfs(TreeNode node, int depth, List<List<Integer>> out) {
    if (node == null) return;
    if (depth == out.size()) out.add(new ArrayList<>());   // first node at this depth
    out.get(depth).add(node.val);
    dfs(node.left, depth + 1, out);
    dfs(node.right, depth + 1, out);
}
```

It is correct and produces the same result because left is visited before right at every depth. Worth mentioning as an alternative with O(height) space instead of O(width), which is better for a wide shallow tree and worse for a deep narrow one.""",
            ),
            (
                "Step 4: Test It",
                """> "Tree with root 3, children 9 and 20, and 20's children 15 and 7.

Iteration one: levelSize is 1, dequeue 3, enqueue 9 and 20, output `[3]`.
Iteration two: levelSize is 2, dequeue 9 (no children) and 20 (enqueue 15 and 7), output `[9, 20]`.
Iteration three: levelSize is 2, dequeue 15 and 7, no children, output `[15, 7]`.
Queue empty, done. Result `[[3], [9, 20], [15, 7]]`. Correct.

Empty tree: the guard returns an empty list before the loop.
Single node: one iteration, one level.
A left-only chain of depth n: each level has one node, producing n levels of one element — and this is the case where the BFS queue stays small but a recursive solution would be n deep.

The bug this design prevents: if I had used `while (!queue.isEmpty())` without the size snapshot and appended to a single list, I would get a flat traversal instead of grouped levels — correct order, wrong structure."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Better when |
| --- | --- | --- | --- |
| BFS with level size | O(n) | O(width) | General; natural for level questions |
| DFS with a depth parameter | O(n) | O(height) | Deep narrow trees, or when recursion is preferred |

For a complete tree the width is about n/2 at the last level, so BFS is O(n) space; for a degenerate chain the height is n, so DFS is O(n) stack. Neither dominates, and saying which you would pick and why — based on the expected tree shape — is a better answer than asserting one is correct.

For a very deep tree, BFS is also the safer choice because it does not risk a stack overflow.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Return the levels bottom-up."** — Build normally and reverse, or insert at index 0 with a `LinkedList` to avoid the final reversal.
- **"Zigzag order?"** — Alternate the direction: reverse every other level, or add to the front of the level list on odd levels.
- **"Right side view?"** — Take the last node of each level, which is the element at `i == levelSize - 1`.
- **"Average value per level?"** — Sum during the inner loop and divide; use `long` for the sum to avoid overflow with large values.
- **"Minimum depth?"** — Return as soon as a leaf is dequeued; BFS stops early, which beats a full DFS on a tree with a shallow leaf and a deep subtree.
- **"What if the tree is n-ary?"** — Loop over the children list instead of left and right; nothing else changes.
- **"Space complexity?"** — O(width), which is up to n/2 for a complete tree.

Six of those are one or two lines different from the base solution, which is why this technique is worth learning properly.""",
            ),
            (
                "Common Mistakes",
                """- Not snapshotting the queue size, merging all levels into one list
- Calling `queue.size()` inside the loop condition, which changes as children are added
- Forgetting the null check on the root
- Enqueuing null children and then dereferencing them
- Using DFS when the question is about minimum depth, losing the early exit
- Claiming O(n) space without qualifying it as the width""",
            ),
            (
                "Variations",
                """- **Right side view**: last node per level.
- **Zigzag traversal**: alternate direction per level.
- **Level averages, maxima, sums**: aggregate within the inner loop.
- **Minimum depth**: early return on the first leaf.
- **Vertical order traversal**: BFS carrying a column index, collected into a sorted map.
- **Connect next-right pointers**: link nodes within each level as you process it.

All six share the same skeleton, which is the argument for internalising it rather than re-deriving it each time.""",
            ),
            (
                "Interview Tip",
                """Say "I capture the queue size before the inner loop, because at that moment the queue holds exactly the current level" as you write the line. It is one sentence, it explains the only non-obvious part of the code, and it is the detail that makes six follow-up questions trivial.""",
            ),
        ],
        [
            "At the start of each iteration the queue contains exactly the current level — snapshot its size.",
            "The same skeleton solves right side view, zigzag, level averages, and minimum depth.",
            "BFS uses O(width) space and DFS uses O(height) — choose by the expected tree shape.",
            "Minimum depth should use BFS for the early exit, which a full DFS gives up.",
        ],
        [
            "How do you know where one level ends and the next begins?",
            "How would you produce a right side view or a zigzag order?",
            "What is the space complexity, and how does it compare to the DFS alternative?",
            "Why is BFS better than DFS for minimum depth?",
        ],
        ["level-walk"],
    )


def _lowest_common_ancestor() -> dict:
    return DL(
        "wp-lowest-common-ancestor",
        "Worked Problem: Lowest Common Ancestor",
        "A three-line recursion whose contract is the entire difficulty, plus the BST and parent-pointer variants.",
        13,
        "**Interviewer:** \"Given the root of a binary tree and two nodes p and q, find their lowest common ancestor — the deepest node that has both as descendants, where a node may be a descendant of itself.\"",
        [
            (
                "Why It Matters",
                """The optimal solution is three lines and looks like magic unless you can state what the recursion returns. This problem is therefore an excellent test of the tree-recursion contract: candidates who define the contract first write it immediately, and candidates who do not produce something that works on the examples and fails on the case where one node is an ancestor of the other.

The variants — BST, parent pointers, node possibly absent — each change one aspect and are common follow-ups.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Are both nodes guaranteed to be in the tree?"* — This is the important one. If not, the algorithm needs a flag to distinguish "found the LCA" from "found only one node".
- *"Can a node be its own ancestor?"* — Yes, as stated; if p is an ancestor of q, the answer is p.
- *"Is it a BST?"* — If yes, there is a much simpler O(h) solution using the ordering.
- *"Do nodes have parent pointers?"* — If yes, it becomes an intersection-of-two-lists problem.
- *"Are values unique?"* — Affects whether you compare by reference or by value.

Asking about guaranteed presence takes three seconds and determines whether the simple version is correct.""",
            ),
            (
                "Step 2: The Brute Force",
                """> "Find the root-to-node path for both p and q, then walk the two paths together and return the last shared node. That is O(n) time and O(h) space for the paths, and it is easy to reason about.

It also naturally handles the case where a node is absent, because the path search would fail."

Worth stating, because it is a correct answer and because it is exactly the structure the parent-pointer variant uses.""",
            ),
            (
                "Step 3: The Recursive Contract",
                """The key is to define precisely what the recursion returns:

> "`lca(node)` returns: p or q if exactly one of them is found in this subtree; the lowest common ancestor if *both* are found in this subtree; and null if neither is."

Given that contract, the body follows mechanically:

- If the node is null, neither is here — return null.
- If the node is p or q, return it. (We do not need to search deeper: if the other is below, this node is the ancestor.)
- Otherwise recurse both sides. If both return non-null, p and q are on opposite sides, so *this* node is the LCA. If only one returns non-null, pass it up.

Stating the contract out loud before the code is the whole technique, and it is what makes three cryptic lines obviously correct.""",
            ),
            (
                "How It Works",
                """```java
TreeNode lowestCommonAncestor(TreeNode node, TreeNode p, TreeNode q) {
    if (node == null || node == p || node == q) return node;

    TreeNode left = lowestCommonAncestor(node.left, p, q);
    TreeNode right = lowestCommonAncestor(node.right, p, q);

    if (left != null && right != null) return node;    // found on both sides
    return (left != null) ? left : right;              // pass up whatever was found
}
// O(n) time, O(h) space for the recursion stack
```

Two subtleties worth explaining:

**The early return when `node == p`.** If q is somewhere below p, this returns p without searching further — which is correct, because p is then the lowest common ancestor. It looks like an incomplete search and is not, and that is precisely the case a candidate without the contract gets wrong.

**This assumes both nodes exist.** If q were absent and p were present, the function returns p, which is wrong — the correct answer would be null or an error. Handling that needs two boolean flags set during the traversal:

```java
class Solution {
    private boolean foundP = false, foundQ = false;

    TreeNode lca(TreeNode root, TreeNode p, TreeNode q) {
        TreeNode result = helper(root, p, q);
        return (foundP && foundQ) ? result : null;
    }

    private TreeNode helper(TreeNode node, TreeNode p, TreeNode q) {
        if (node == null) return null;
        TreeNode left = helper(node.left, p, q);
        TreeNode right = helper(node.right, p, q);
        if (node == p) { foundP = true; return node; }
        if (node == q) { foundQ = true; return node; }
        if (left != null && right != null) return node;
        return (left != null) ? left : right;
    }
}
```

Note that the flag version must recurse *before* checking the current node, so that a descendant match is still recorded. That reordering is easy to miss.""",
            ),
            (
                "Step 4: Test It",
                """> "Tree: root 3, left subtree rooted at 5, right at 1. p = 5, q = 1. At the root, the left call returns 5 and the right returns 1, both non-null, so the root is the LCA. Correct.

p = 5, q = 4 where 4 is a descendant of 5. At the root, the left call reaches 5 and returns immediately — without finding 4. The right call returns null. So the left result, 5, is passed up and returned. Correct, and this is the ancestor-of-itself case that the early return handles.

Both nodes in the same subtree but neither an ancestor of the other: the recursion finds them at some deeper node where left and right are both non-null, and passes that up unchanged through every ancestor — because at each ancestor only one side is non-null.

Root itself is p: returns the root immediately, which is correct.

A node absent from the tree: the simple version returns the other node, which is wrong — which is why I asked whether presence is guaranteed."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Notes |
| --- | --- | --- | --- |
| Path finding | O(n) | O(h) | Easy to reason about, handles absence |
| Single recursion | O(n) | O(h) | Shortest; assumes both present |
| BST ordering | O(h) | O(1) iterative | Only for BSTs |
| Parent pointers | O(h) | O(1) | Only with parent links |
| Preprocessing (binary lifting) | O(n log n) build, O(log n) query | O(n log n) | Worth it for many queries |

The last row matters for a system-design-flavoured follow-up: if the tree is static and there are millions of queries, preprocessing beats an O(n) traversal per query.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What if it is a BST?"** — Walk down from the root: if both values are smaller go left, if both larger go right, otherwise this node is the LCA. O(h) time, O(1) space iteratively.

```java
TreeNode lcaBst(TreeNode node, TreeNode p, TreeNode q) {
    while (node != null) {
        if (p.val < node.val && q.val < node.val) node = node.left;
        else if (p.val > node.val && q.val > node.val) node = node.right;
        else return node;
    }
    return null;
}
```

- **"What if nodes have parent pointers?"** — Walk up from both to collect ancestors, or use the two-pointer trick: advance both upward and, when one hits the root, redirect it to the other node's start. They meet at the LCA, which is the same idea as finding the intersection of two linked lists.
- **"What if a node might not exist?"** — The flag version, and explain why the reordering is needed.
- **"What about many queries on the same tree?"** — Preprocess with binary lifting or Euler tour plus range-minimum query.
- **"What if it is an n-ary tree?"** — Loop over children; the LCA is the node where more than one child returns non-null.
- **"Can you do it iteratively?"** — Yes, with a parent map built by one traversal, then walking up from p collecting ancestors and from q checking membership.""",
            ),
            (
                "Common Mistakes",
                """- Writing the recursion without stating the contract, then failing the ancestor-of-itself case
- Assuming both nodes are present without asking
- In the flag version, checking the current node before recursing, so descendants are not recorded
- Comparing by value when nodes could have duplicate values
- Using the BST solution on a general binary tree
- Claiming O(log n) for the general tree version — it is O(n), because the tree may be degenerate""",
            ),
            (
                "Variations",
                """- **LCA in a BST**: ordering-based descent, O(h) and O(1) space.
- **LCA with parent pointers**: the linked-list intersection technique.
- **LCA of deepest leaves**: post-order returning depth alongside the node.
- **Distance between two nodes**: depth of p plus depth of q minus twice the depth of the LCA.
- **LCA of many nodes**: fold the pairwise LCA across the set, since the operation is associative.

The distance formula is a nice one to know: it turns a path-length question into three depth lookups plus one LCA.""",
            ),
            (
                "Interview Tip",
                """State the contract before the code: "this returns p or q if one is found here, the LCA if both are found on opposite sides, and null otherwise." Three lines of cryptic recursion become obviously correct, and you will handle the ancestor-of-itself case without thinking about it.""",
            ),
        ],
        [
            "Define what the recursion returns before writing it; the three-line body follows from the contract.",
            "Returning early when the node is p or q is correct, and it is what handles the ancestor-of-itself case.",
            "The simple version assumes both nodes exist — ask, and use flags if that is not guaranteed.",
            "A BST allows an O(h) descent with O(1) space, and parent pointers turn it into list intersection.",
        ],
        [
            "What does your recursive function return in each case?",
            "Why is it correct to return early when the node equals p?",
            "How does the solution change for a binary search tree?",
            "What if one of the nodes might not be in the tree?",
        ],
        ["shared-ancestor"],
    )


def _linked_list_cycle() -> dict:
    return DL(
        "wp-linked-list-cycle",
        "Worked Problem: Linked List Cycle",
        "Fast and slow pointers, the proof they must meet, and the cycle-entry result.",
        12,
        "**Interviewer:** \"Given the head of a linked list, determine whether it contains a cycle. Then, return the node where the cycle begins.\"",
        [
            (
                "Why It Matters",
                """Cycle detection is one of the most frequently asked linked list problems, and the follow-up — finding where the cycle starts — has a result that is surprising enough that interviewers use it to see whether you can reason rather than recall.

It is also a good test of the O(1)-space instinct: the hash-set solution is correct and obvious, and the question is really asking whether you can do better.""",
            ),
            (
                "Step 1: Clarify",
                """- *"Can the list be empty or have a single node?"* — Yes; a single node with a self-loop is a cycle.
- *"May I modify the list?"* — If yes, marking visited nodes is an option; usually the answer is no.
- *"Is extra space allowed?"* — If yes, a hash set is the easy answer; the interesting version forbids it.
- *"Do I return a boolean or the entry node?"* — Both are asked; handle them in sequence.
- *"Can node values repeat?"* — Yes, so comparison must be by reference, not by value.

The space question is the one that selects the algorithm.""",
            ),
            (
                "Step 2: The Hash Set Solution",
                """> "Walk the list adding each node to a set. If I ever see a node already present, that node is the cycle entry; if I reach null, there is no cycle. O(n) time, O(n) space, and it answers both parts directly."

```java
ListNode detectCycle(ListNode head) {
    Set<ListNode> seen = new HashSet<>();
    for (ListNode node = head; node != null; node = node.next) {
        if (!seen.add(node)) return node;      // first repeat is the entry
    }
    return null;
}
```

State this first. It is correct, it takes twenty seconds, and it gives you a working answer before attempting the O(1) version.""",
            ),
            (
                "Step 3: Two Pointers at Different Speeds",
                """> "To avoid the extra memory, I can use two pointers moving at different speeds. If there is no cycle, the fast one reaches null. If there is a cycle, both eventually enter it, and since the fast pointer gains exactly one position on the slow pointer per step, the gap shrinks by one each iteration and must reach zero. It cannot jump over, precisely because the gain per step is one."

That argument — the gap closes by exactly one per iteration, so it cannot be skipped — is the proof, and it is short enough to deliver in one breath.""",
            ),
            (
                "How It Works",
                """```java
boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}
// O(n) time, O(1) space
```

The loop condition checks both `fast` and `fast.next` because the fast pointer takes two steps. Checking only one of them throws a null-pointer exception on an even-length acyclic list, and it is the single most common bug in this problem.

Finding the entry:

```java
ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {                        // meeting point found
            ListNode probe = head;
            while (probe != slow) {                // advance both one step at a time
                probe = probe.next;
                slow = slow.next;
            }
            return probe;                          // the cycle entry
        }
    }
    return null;
}
```

The derivation, which is what the interviewer wants:

> "Let `a` be the distance from the head to the cycle entry, `b` the distance from the entry to the meeting point, and `c` the cycle length. When they meet, slow has travelled `a + b` and fast has travelled `2(a + b)`. The difference, `a + b`, must be a whole number of laps, so `a + b = k*c`.

> Rearranging, `a = k*c - b`, which is exactly the distance from the meeting point forward around the cycle to the entry. So a pointer starting at the head and one starting at the meeting point, both advancing one step at a time, meet at the entry."

You do not need to reproduce the algebra perfectly under pressure — knowing that the result follows from "the difference is a multiple of the cycle length" is enough to reconstruct it.""",
            ),
            (
                "Step 4: Test It",
                """> "No cycle, `1 -> 2 -> 3 -> null`. slow reaches 2, fast reaches 3, then `fast.next` is null so the loop exits and returns false. Correct.

Empty list: `fast` is null, the loop never runs, returns false.

Single node with no cycle: `fast.next` is null, returns false.

Single node pointing to itself: slow and fast both move to the same node, they are equal, returns true. The entry search then starts `probe` at head, which already equals slow, so it returns the node immediately. Correct.

Two nodes forming a cycle: slow moves to 2, fast moves to 1 (two steps around), they are not equal yet; next iteration slow moves to 1, fast moves to 2 — still not equal... let me trace more carefully with the actual pointers rather than assuming. This is exactly the kind of small case worth walking through explicitly rather than trusting.

The case I would specifically check is an even-length acyclic list, because that is where the `fast.next` null check matters."
""",
            ),
            (
                "Trade-offs",
                """| Approach | Time | Space | Mutates |
| --- | --- | --- | --- |
| Hash set | O(n) | O(n) | No |
| Fast and slow | O(n) | O(1) | No |
| Marking nodes | O(n) | O(1) | Yes |
| Reversing the list | O(n) | O(1) | Yes, and destructive |

The hash set is simpler and easier to verify; the two-pointer version is the answer when space is constrained. Both are O(n) time, so there is no time trade — only space against clarity.

Marking nodes as visited works and mutates the caller's data, which is usually unacceptable. Mention it as an option and say why you would not choose it.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Prove they must meet."** — The gap closes by exactly one per iteration inside the cycle, so it reaches zero rather than skipping past.
- **"Where does the cycle start?"** — Reset one pointer to the head; both advance one step and meet at the entry. Sketch the algebra.
- **"How long is the cycle?"** — From the meeting point, walk forward counting until you return to it.
- **"Can you remove the cycle?"** — Find the entry, then walk to the node just before it and set its `next` to null.
- **"What if the fast pointer moved three steps?"** — They still meet, but the entry-finding relation changes; two steps is what makes `a = k*c - b` work.
- **"Does this generalise beyond linked lists?"** — Yes: any iterated function. Finding a duplicate in an array of n+1 values from 1..n is the same algorithm with `next` defined as `nums[i]`.

That last one is a favourite follow-up and is worth having ready.""",
            ),
            (
                "Common Mistakes",
                """- Checking only `fast != null` and not `fast.next != null`
- Starting the two pointers at different nodes, breaking the meeting argument
- Assuming the meeting point *is* the cycle entry — it is not
- Comparing node values instead of references
- Forgetting the single-node self-loop case
- Not offering the hash-set solution first when it would have been accepted""",
            ),
            (
                "Variations",
                """- **Find the duplicate number**: treat the array as a function `i -> nums[i]`; the duplicate creates a cycle whose entry is the answer.
- **Happy number**: iterate the digit-square-sum; a cycle means it is not happy.
- **Middle of a linked list**: the same two-speed idea without a cycle.
- **Palindrome linked list**: find the middle, reverse the second half, compare.
- **Intersection of two linked lists**: a related two-pointer trick where each pointer switches to the other list's head.

The array-duplicate variant is the one that shows the technique is about iterated functions rather than linked lists specifically.""",
            ),
            (
                "Interview Tip",
                """Write the loop condition `while (fast != null && fast.next != null)` as your very first line. It is the part everyone gets wrong under pressure, and having it on the screen before you think about the logic means the rest is written against a safe skeleton.""",
            ),
        ],
        [
            "Fast and slow pointers detect a cycle in O(1) space; the gap closes by exactly one per step, so they must meet.",
            "The meeting point is not the cycle entry — reset one pointer to the head and advance both one step at a time.",
            "Guard with both `fast != null` and `fast.next != null`, or an even-length list throws.",
            "The technique applies to any iterated function, which is how array duplicate detection becomes cycle detection.",
        ],
        [
            "Why must the two pointers meet if a cycle exists?",
            "How do you find the node where the cycle begins?",
            "What is the hash-set alternative and when would you use it?",
            "How does this technique apply to finding a duplicate in an array?",
        ],
        ["cycle-in-a-chain"],
    )


def worked_problems_topic() -> dict:
    """The worked-problems module: complete interview walkthroughs."""
    return _dsa_topic(
        "dsa-worked-problems",
        "Worked Interview Problems",
        "Thirteen complete walkthroughs: clarify, brute force, find the waste, optimise, code, test, and handle the follow-ups.",
        "MEDIUM",
        30,
        [
            _two_sum(),
            _group_anagrams(),
            _longest_unique_substring(),
            _best_time_stock(),
            _container_water(),
            _trapping_rain(),
            _valid_parentheses(),
            _min_stack(),
            _search_range(),
            _median_two_sorted(),
            _level_order(),
            _lowest_common_ancestor(),
            _linked_list_cycle(),
        ],
        practice_tag="array",
    )
