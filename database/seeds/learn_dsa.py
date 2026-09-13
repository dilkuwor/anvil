"""Interview-focused Data Structures & Algorithms curriculum.

Split out of ``learn.py`` because the DSA track is a full FANG-interview
preparation course rather than a glossary: every lesson teaches when a pattern
applies, the template to write, the complexity to state out loud, the edge
cases that break it, and the follow-ups an interviewer actually asks.

Rendering constraints (see ``frontend/src/components/learn/markdown.tsx``):

* ``#``/``##``/``###`` headings, tables, blockquotes, ordered lists, flat
  unordered lists, ``a -> b -> c`` arrow flows, ``x = y`` formula lines,
  ``Example: ...`` lines and fenced code blocks all render.
* Nested list items are NOT supported. Use flat lists.
* ``## Why It Matters`` / ``## How It Works`` / ``## Example`` /
  ``## Common Use Cases`` / ``## Trade-offs`` / ``## Common Mistakes`` /
  ``## Interview Tip`` are parsed by ``app.learn.service._parse_lesson_sections``
  to build AI-tutor context, so keep those headings on concept lessons.
* Heading text must be unique inside a lesson: the in-page table of contents
  keys anchors off the heading slug.

Code samples are Java, matching the platform's editor and runner.
"""

from __future__ import annotations

Section = tuple[str, str]


def DL(
    slug: str,
    title: str,
    short: str,
    minutes: int,
    lead: str,
    sections: list[Section],
    takeaways: list[str],
    questions: list[str],
    problems: list[str] | None = None,
) -> dict:
    """Build a lesson dict from a lead paragraph plus ``## heading`` sections."""
    parts: list[str] = [f"# {title}", "", lead.strip(), ""]
    seen: set[str] = set()
    for heading, body in sections:
        key = heading.strip().lower()
        if key in seen:
            raise ValueError(f"duplicate heading {heading!r} in lesson {slug!r}")
        seen.add(key)
        parts.append(f"## {heading}")
        parts.append("")
        parts.append(body.strip())
        parts.append("")
    return {
        "slug": slug,
        "title": title,
        "short": short,
        "minutes": minutes,
        "content": "\n".join(parts).strip() + "\n",
        "takeaways": takeaways,
        "questions": questions,
        "problems": problems or [],
    }


def _dsa_topic(
    slug: str,
    title: str,
    description: str,
    difficulty: str,
    order: int,
    lessons: list[dict],
    roadmap_key: str | None = None,
    practice_tag: str | None = None,
) -> dict:
    from database.seeds.learn import _topic

    return _topic(
        "dsa",
        slug,
        title,
        description,
        difficulty,
        sum(lesson["minutes"] for lesson in lessons),
        order,
        lessons,
        roadmap_key=roadmap_key,
        practice_tag=practice_tag,
    )


# ---------------------------------------------------------------------------
# Module 1 — The coding interview method
# ---------------------------------------------------------------------------


def _method_topic() -> dict:
    return _dsa_topic(
        "coding-interview-method",
        "The Coding Interview Method",
        "A repeatable 45-minute process, what the interviewer is actually scoring, and how to recognise which pattern a problem wants.",
        "EASY",
        1,
        [
            DL(
                "interview-problem-framework",
                "The Problem-Solving Framework",
                "The seven steps that turn a prompt into a defended, tested solution — and why silence loses interviews.",
                16,
                "A coding interview is not a test of whether you have seen the problem. It is a forty-five minute simulation of you solving an unfamiliar problem next to a colleague: can you clarify it, find a working approach, improve it, write code that runs, and convince someone it is correct? The framework below is the order that makes all of that visible.",
                [
                    (
                        "Why It Matters",
                        """Two candidates produce the same optimal solution. One narrates the brute force, states its complexity, explains the insight that removes the nested loop, writes clean code, and traces an edge case. The other stares at the screen for eleven minutes and then types the answer from memory.

The second candidate frequently fails, and it surprises them. Interviewers are scoring a process they can observe, and a correct answer that arrives without visible reasoning reads as recall rather than problem solving — which is exactly what the interview is designed to distinguish.

The framework also protects you on the problems you cannot immediately solve, which are the ones that decide your level. A candidate with a process always has a next move.""",
                    ),
                    (
                        "Mental Model",
                        """Seven steps, roughly forty-five minutes.

Clarify → Examples → Brute force → Optimize → Code → Test → Analyze

| Step | Minutes | What the interviewer learns |
| --- | --- | --- |
| Clarify | 2-4 | Do you solve the real problem or the one you assumed? |
| Examples | 2-3 | Can you find the edge cases before the code does? |
| Brute force | 2-3 | Can you always produce something that works? |
| Optimize | 5-10 | Can you find and remove the bottleneck? |
| Code | 12-18 | Can you write correct, readable code at speed? |
| Test | 4-6 | Do you verify, or do you hope? |
| Analyze | 1-2 | Can you state and defend the complexity? |

> Memory cue: never write code you have not first described in one sentence. If you cannot say the approach out loud, you are not ready to type it.""",
                    ),
                    (
                        "How It Works",
                        """### 1. Clarify

Never start coding from the prompt as given. Ask about:

- **Input domain** — can the array be empty, contain negatives, duplicates, or nulls? How large is n?
- **Output shape** — return the value, the index, all answers, or any one valid answer?
- **Guarantees** — is the input sorted? Is a solution guaranteed to exist? Is it unique?
- **Constraints** — can I mutate the input? Is there a memory limit? Do I need it in one pass?
- **Ties and errors** — what should happen when the answer is ambiguous or the input is invalid?

The size of n is the most valuable single question, because it tells you the target complexity before you have thought about the algorithm at all.

| n | Target complexity |
| --- | --- |
| n <= 12 | O(n!) or O(2^n) is fine — permutations, subsets |
| n <= 25 | O(2^n) — bitmask, meet in the middle |
| n <= 100 | O(n^3) |
| n <= 1,000 | O(n^2) |
| n <= 100,000 | O(n log n) |
| n <= 1,000,000 | O(n) or O(n log n) |
| n > 10,000,000 | O(n) or O(log n), and watch memory |

If the interviewer says n can be a million, they have told you a nested loop is wrong before you wrote it.

### 2. Examples

Write a small example by hand and solve it manually. Then write the edge cases:

- Empty input, single element, two elements
- All elements identical
- Already sorted, reverse sorted
- Negative numbers and zero
- The largest and smallest legal values

This step routinely reveals that you misunderstood the problem, and finding that in minute four costs nothing. Finding it in minute thirty costs the interview.

### 3. Brute force

State the obvious solution and its complexity, out loud, in one sentence. Do not code it unless asked.

> "The brute force is to check every pair, which is O(n^2) time and O(1) space. Let me see if I can do better."

Two reasons this matters. It guarantees you have something if you run out of time, and the optimal solution is almost always the brute force with one specific redundancy removed — so naming the brute force is how you find the optimisation.

### 4. Optimize

Ask what the brute force is wasting. The answer is usually one of a handful of things:

- **Recomputing something** -> memoise, or precompute a prefix array
- **Re-scanning for a value** -> hash map
- **Re-sorting or re-searching** -> sort once, or use a heap
- **Exploring an ordered space linearly** -> binary search
- **Rebuilding overlapping windows** -> sliding window
- **Recomputing overlapping subproblems** -> dynamic programming

Say the insight before you code it: "I am scanning the whole array to find the complement. If I store what I have seen in a hash map, that lookup becomes O(1) and the whole thing is one pass."

### 5. Code

Write as if a colleague will read it. Meaningful names, small helpers, no clever one-liners. Narrate as you go, but narrate at the level of intent, not syntax: "now I handle the case where the window shrinks" beats "now I increment i".

Handle the edge cases you listed in step 2 explicitly, at the top, as guard clauses.

### 6. Test

Do not say "I think that works". Trace your code against a real example, line by line, with actual values. Then run the edge cases.

Interviewers weight this heavily, because finding your own bug is the single strongest positive signal in the entire interview. A candidate who says "wait, on an empty array this returns the wrong thing — let me fix that" has just demonstrated the thing the job actually requires.

### 7. Analyze

State time and space, name what n is, and mention the dominant term:

> "This is O(n log n) time, dominated by the sort, and O(n) space for the hash map. If the input were already sorted, it would be O(n) time and O(1) space."

That last clause — how the answer changes under a different constraint — is a senior signal and costs one sentence.""",
                    ),
                    (
                        "Example",
                        """The framework applied to "find two numbers in an array that sum to a target", compressed.

> **Clarify:** "Can the array contain duplicates and negatives? Is it sorted? Do I return the values or the indices? Is exactly one solution guaranteed? Can I use extra memory?" Answers: duplicates and negatives yes, unsorted, return indices, exactly one solution, extra memory is fine.

> **Examples:** `[2, 7, 11, 15]` target 9 gives `[0, 1]`. Edge cases: two elements exactly, negatives like `[-3, 4, 3]` target 0, and duplicates like `[3, 3]` target 6 — which tells me I cannot use a value-keyed map naively without care about ordering.

> **Brute force:** "Check every pair — O(n^2) time, O(1) space."

> **Optimize:** "The inner loop is a search for `target - nums[i]`. If I store values I have already seen in a hash map from value to index, that search is O(1). One pass, checking the map before inserting, which also handles the duplicate case correctly."

> **Code**, then **test** by tracing `[3, 3]` target 6 to confirm the duplicate case works, then **analyze**: "O(n) time, O(n) space. If the array were sorted I could use two pointers for O(1) space."

Total elapsed: about twenty minutes, and every step was audible.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Every coding interview round, at every level
- Take-home exercises, where the same steps become the structure of your write-up
- Debugging an unfamiliar problem at work, which is the same process with a longer clock""",
                    ),
                    (
                        "Trade-offs",
                        """- **Clarifying versus the clock.** Two to four minutes is right. Ten minutes of questions reads as stalling, and the interviewer will start answering for you.
- **Brute force first versus jumping to optimal.** If you genuinely see the optimal solution immediately, say so and state the brute force in one sentence anyway, so the interviewer knows you understand why the optimisation helps.
- **Narrating versus thinking.** You cannot do both continuously. It is entirely acceptable to say "give me thirty seconds to think about this" — what is not acceptable is five minutes of silence.
- **Perfect code versus finished code.** A working solution with a small style flaw beats an elegant half-written one. Get to running code, then improve it.""",
                    ),
                    (
                        "Common Failure Modes",
                        """| Situation | Recovery |
| --- | --- |
| You are stuck with no approach | Go back to the brute force and ask what it wastes. Say this out loud. |
| You realise your approach is wrong mid-code | Say so immediately and switch. Self-correction scores well; silently patching a broken approach does not. |
| The interviewer gives a hint | Take it, say thank you, and use it. Ignoring a hint is the worst possible response. |
| You run out of time | Finish the explanation even if the code is incomplete, and state the complexity. A clearly explained approach with partial code is far from a zero. |
| You do not know the required data structure | Say what property you need — "I want something that gives me the minimum in O(log n)" — and the interviewer will usually name it for you. |
| Your code has a bug you cannot find | Trace it with a concrete small input. Do not re-read it hoping to spot it. |""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do better?"** — Almost always yes, and it means your current solution is not the target. Return to what the current approach wastes.
- **"What is the complexity?"** — Time and space, with n defined. If you hesitate here after writing the code, it reads as not understanding your own solution.
- **"What if the input does not fit in memory?"** — Streaming, external sort, or chunking. This is the bridge question into system design.
- **"What if the array were sorted?"** — Usually unlocks two pointers or binary search and drops the space to O(1).
- **"How would you test this?"** — Name categories, not cases: empty, single, duplicates, extremes, and the property that must always hold.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Coding before stating the approach in one sentence
- Skipping the clarifying questions because the problem "seems obvious"
- Never producing a brute force, so a hard problem ends with nothing
- Claiming the code works without tracing it
- Not knowing the complexity of the code you just wrote
- Going silent for minutes at a time
- Arguing with a hint instead of using it""",
                    ),
                    (
                        "Mini Exercise",
                        """Take any problem you have already solved. Set a timer and narrate the seven steps out loud, recording yourself. Then check:

1. Did you ask about the size of n before choosing an approach?
2. Did you state a brute force and its complexity?
3. Did you name the specific waste that the optimisation removes?
4. Did you trace real values through your code, or did you just say it looks right?
5. Could a listener who could not see your screen follow what you were doing?

Question 5 is the one that matters most, because that is what a phone screen actually is.""",
                    ),
                    (
                        "Interview Tip",
                        """Open every problem with the same sentence: "Let me make sure I understand the problem, then I will talk through a brute force before optimising." It takes five seconds, it tells the interviewer how to follow you, and it buys you permission to think out loud for the next forty minutes.""",
                    ),
                ],
                [
                    "Clarify, examples, brute force, optimize, code, test, analyze — in that order, every time.",
                    "Ask the size of n early; it tells you the target complexity before you have chosen an algorithm.",
                    "The optimal solution is usually the brute force with one specific redundancy removed — name that redundancy out loud.",
                    "Finding your own bug while testing is the strongest positive signal available in the interview.",
                ],
                [
                    "Walk me through how you approach a problem you have never seen.",
                    "Why state a brute force if you already know the optimal solution?",
                    "What do you do when you are stuck with no approach after five minutes?",
                    "How do you decide what complexity to aim for?",
                ],
                ["pair-target"],
            ),
            DL(
                "how-coding-interviews-are-scored",
                "How Coding Interviews Are Scored",
                "The rubric behind the conversation, and what changes between mid-level, senior, and staff.",
                12,
                "Interviewers are not comparing your code against a reference solution. They are filling in a scorecard with four or five dimensions, and the same problem is graded against a different bar depending on the level. Knowing the dimensions changes how you spend your forty-five minutes — and explains why a correct answer sometimes fails.",
                [
                    (
                        "Why It Matters",
                        """Candidates optimise for the wrong thing. They practise solving more problems when their actual weakness is that they cannot explain a solution, or that they never test, or that they freeze when the problem is unfamiliar.

The rubric tells you where the marks are. On most scorecards, raw problem-solving is one of four or five dimensions — and the other dimensions are far easier to improve.""",
                    ),
                    (
                        "Mental Model",
                        """Most scorecards reduce to five dimensions.

| Dimension | The question being answered |
| --- | --- |
| **Problem solving** | Can they get from the prompt to a working, efficient approach? |
| **Coding** | Is the code correct, readable, and written at a reasonable speed? |
| **Verification** | Do they test, find their own bugs, and reason about edge cases? |
| **Communication** | Could a colleague follow their reasoning without seeing the screen? |
| **Complexity and trade-offs** | Do they understand the cost of what they wrote and the alternatives? |

A candidate who is strong on four and weak on one usually passes. A candidate who solves the problem and scores nothing on verification or communication frequently does not.""",
                    ),
                    (
                        "How It Works",
                        """### The bars by level

**Mid-level (L3/L4).** The bar is *a correct solution to a standard problem*.

- Recognises the applicable pattern with limited hinting
- Writes working code with few syntax problems
- Knows the complexity of what they wrote
- Handles obvious edge cases when prompted
- May need a hint to reach the optimal approach

**Senior (L5).** The bar is *an optimal solution, explained and verified without prompting*.

- Reaches the optimal approach largely unaided
- Volunteers the trade-off between approaches rather than waiting to be asked
- Tests without being told to, and finds their own bugs
- Writes code a colleague would accept in review
- Handles the follow-up variation smoothly, which is where the level is usually decided

**Staff (L6+).** The bar is *judgement plus depth under variation*.

- Solves the problem quickly, then engages seriously with the harder follow-up
- Discusses what changes at scale: memory limits, streaming input, concurrency, distribution
- Questions the problem when it deserves it: "is this the real constraint?"
- Explains why a simpler solution might be preferable in production even if it is asymptotically worse
- Communicates like someone who has led design reviews

### What actually fails candidates

Ordered roughly by frequency:

1. **Silence.** The interviewer cannot score what they cannot hear.
2. **Never testing.** Declaring "that should work" and stopping.
3. **Not knowing the complexity** of their own code.
4. **Rejecting hints**, or arguing instead of listening.
5. **Unreadable code** — single letter names, no structure, heavy nesting.
6. **Getting stuck and having no process** — no brute force, no smaller case, no next move.
7. **Solving a different problem** than the one asked, because of a skipped clarification.

Notice how few of those are about algorithmic knowledge.

### Company variation

The core rubric is shared; the emphasis differs.

- Some companies weight speed and pattern coverage — expect two problems in one session, which rewards fluency with standard templates.
- Some weight depth on a single harder problem, with aggressive follow-ups.
- Some explicitly score a "behavioural and collaboration" dimension inside the coding round, so how you receive a hint is graded.
- Most modern loops include at least one round where the code must actually compile and run against tests, which rewards care over cleverness.

Practise for all of it by defaulting to: state the approach, write compiling code, test it yourself, and stay audible.""",
                    ),
                    (
                        "Example",
                        """The same question, three answers.

**Interviewer: "Why did you use a hash map here?"**

- *Mid:* "To look things up faster."
- *Senior:* "The brute force scans the array for the complement on every iteration, which makes it O(n^2). A hash map turns that lookup into expected O(1), so the whole algorithm becomes one pass at O(n) time. The cost is O(n) additional memory, and the O(1) is expected rather than worst case — a pathological set of keys could degrade it, which does not matter here but would matter if the keys were attacker-controlled."
- *Staff:* All of the above, plus: "If memory were the binding constraint and the array could be mutated, sorting first and using two pointers gives O(n log n) time with O(1) extra space, and I would take that trade if n were large and memory tight."

Same three lines of code. Three different scores.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Deciding what to practise next when your pass rate is inconsistent
- Self-scoring a mock interview on all five dimensions rather than just "did I solve it"
- Understanding a rejection where you solved the problem""",
                    ),
                    (
                        "Trade-offs",
                        """- **Speed versus care.** Rushing to code produces bugs that cost more time than planning would have. Two minutes of approach beats ten minutes of debugging.
- **Optimal versus finished.** An O(n log n) solution that runs beats an O(n) solution that does not compile. Say "I will code the O(n log n) first and then optimise if there is time" — that is a legitimate and well-regarded choice.
- **Talking versus thinking.** Announce your silences: "let me think for a moment" is not a penalty.
- **Confidence versus honesty.** "I have not used that structure, but I need something with O(log n) insert and ordered iteration" is a far better answer than a confident invention.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """These exist to probe the level, not to trick you.

- "Can you do it in one pass?"
- "Can you do it without extra space?"
- "What if the input is a stream and you cannot hold it in memory?"
- "What if the array is sorted? What if it is nearly sorted?"
- "What if this had to run on many machines?"
- "What would you change if this were production code?"

The last two are the senior and staff probes. The expected answers involve partitioning, streaming, and the observation that production code needs input validation, clear failure behaviour, and tests — not more cleverness.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Practising only problem solving and neglecting verification and communication
- Treating the interviewer as an examiner rather than a collaborator
- Never saying "I do not know"
- Optimising prematurely and running out of time with nothing running
- Forgetting that how you take a hint is itself being scored""",
                    ),
                    (
                        "Mini Exercise",
                        """Record yourself solving a medium problem. Then score yourself out of 4 on each dimension: problem solving, coding, verification, communication, complexity.

Most people discover that their lowest two scores are verification and communication, and that both are far cheaper to improve than raw algorithmic ability. Spend your next five practice sessions fixing only those two: test every solution out loud before declaring it done, and narrate continuously.""",
                    ),
                    (
                        "Interview Tip",
                        """After you finish coding, say: "Let me trace through an example before I call this done." Then actually do it, with real values, out loud. It takes ninety seconds and it directly scores the dimension most candidates leave blank.""",
                    ),
                ],
                [
                    "Interviews score problem solving, coding, verification, communication, and complexity — not just the final answer.",
                    "Most failures are process failures: silence, no testing, unknown complexity, or rejecting hints.",
                    "Senior means reaching the optimal solution unaided and volunteering trade-offs; staff means depth under variation.",
                    "Verification and communication are the cheapest dimensions to improve and the most commonly neglected.",
                ],
                [
                    "What separates a senior answer from a mid-level one on the same problem?",
                    "What are the most common reasons strong engineers fail coding interviews?",
                    "How should you respond to a hint you disagree with?",
                    "Would you rather submit a working suboptimal solution or an unfinished optimal one?",
                ],
            ),
            DL(
                "pattern-recognition",
                "Pattern Recognition: Mapping a Problem to a Technique",
                "The signals in a problem statement that tell you which of about fifteen techniques applies.",
                14,
                "Interview problems are drawn from a surprisingly small set of techniques. What separates fluent candidates is not knowing more algorithms — it is reading a problem statement and recognising, within a minute, which two or three techniques could apply. That recognition is a learnable skill with concrete triggers.",
                [
                    (
                        "Why It Matters",
                        """Most candidates who freeze are not missing knowledge. They know how binary search works; they did not notice that the problem was asking for a binary search. The gap is between the statement and the technique.

Trigger recognition also gives you something to say when you are stuck, which is worth more than any single algorithm: "the input is sorted and we want a pair, so two pointers or binary search are the candidates — let me try two pointers first."

Being explicit about your candidate techniques also invites the interviewer to steer you, which they will usually do for free.""",
                    ),
                    (
                        "Mental Model",
                        """Read the problem for four things, in this order.

Input shape → Output shape → Constraints → Forbidden costs

- **Input shape** — sorted? a tree? a grid? a stream? intervals? a string over a small alphabet?
- **Output shape** — one value, all values, a count, the best value, a yes/no, or a structure?
- **Constraints** — the size of n, and the memory limit.
- **Forbidden costs** — "in one pass", "without extra space", "in O(log n)". These are not politeness; they are the answer in disguise.

A constraint like "O(1) extra space" eliminates hash maps and usually points at two pointers, in-place marking, or bit tricks. A constraint like "O(log n)" leaves almost nothing except binary search or a balanced-tree structure.""",
                    ),
                    (
                        "How It Works",
                        """### The trigger table

| Signal in the statement | Reach for |
| --- | --- |
| Sorted array, find a pair or triplet | Two pointers |
| Sorted array, find a position or boundary | Binary search |
| "Minimum/maximum value such that ..." with a monotone check | Binary search on the answer |
| Contiguous subarray or substring | Sliding window |
| "At most K distinct" / "longest valid window" | Variable-size sliding window |
| Range sum queries on a static array | Prefix sums |
| Range updates on a static array | Difference array |
| Next greater/smaller element, or histogram spans | Monotonic stack |
| Maximum in every window of size k | Monotonic deque |
| "Have I seen this before?", grouping, counting | Hash map or hash set |
| Top K, or a running median | Heap (or two heaps) |
| K-th largest, one-off | Quickselect |
| Prefix strings, autocomplete, word dictionaries | Trie |
| Connectivity, grouping, "are these in the same set?" | Union-Find |
| Shortest path in an unweighted graph or grid | BFS |
| All paths, connected components, cycle detection | DFS |
| Weighted shortest path, non-negative | Dijkstra |
| Ordering with dependencies | Topological sort |
| All combinations, permutations, or subsets | Backtracking |
| Overlapping subproblems and optimal substructure | Dynamic programming |
| Locally optimal choice provably safe | Greedy |
| Overlapping ranges, meeting rooms, calendars | Interval sort plus sweep |
| Duplicates or missing values in a bounded range | Index marking, cycle sort, or XOR |
| Subset enumeration over n <= 20 | Bitmask |
| Linked structure, find middle or cycle | Fast and slow pointers |

### The constraint clues

| Constraint | What it usually means |
| --- | --- |
| "In O(1) extra space" | Two pointers, in-place marking, bit manipulation, or pointer reversal |
| "In one pass" | Hash map, or a running aggregate |
| "In O(log n)" | Binary search, heap, or balanced tree |
| "The array is sorted" | Two pointers or binary search — the sort is a gift, use it |
| "Return any valid answer" | Greedy is likely viable |
| "Return all answers" | Backtracking, and the output size dominates the complexity |
| "Count the ways" | DP, almost always |
| "Is it possible to ..." | Greedy, DP, or binary search on the answer |
| n <= 20 | Exponential is intended: subsets, permutations, bitmask |
| n up to 10^5 with a time limit | O(n log n) is the target |

### Distinguishing the confusable pairs

**Greedy or DP?** If a locally optimal choice can be proven never to hurt (an exchange argument), greedy. If a choice now changes what is optimal later, DP. When unsure, write the DP — it is rarely wrong, only slower.

**BFS or DFS?** Shortest path or level-by-level, BFS. Existence, full exploration, or path enumeration, DFS. On a grid where all moves cost the same, BFS gives the shortest path and DFS does not.

**Sliding window or two pointers?** Both move indices. Sliding window maintains a *contiguous* region with a property; two pointers converge from the ends or move at different speeds. If the problem says "subarray" or "substring", it is a window.

**Hash map or sorting?** A hash map gives O(n) with O(n) memory. Sorting gives O(n log n) with O(1) extra and additionally gives you order, which you may need for the follow-up.

**Heap or sort?** If you need the top k out of n and k is much smaller than n, a heap is O(n log k) and streams. If you need everything ordered, sort.""",
                    ),
                    (
                        "Example",
                        """Four statements, read for triggers.

> "Given an array of integers, return the length of the longest subarray whose sum is at most K. All values are positive."

*Contiguous* plus *longest* plus *positive values* -> variable sliding window. The positivity matters: it is what makes the window monotone and the technique valid. With negatives allowed, the window breaks and you need prefix sums with a hash map instead. Noticing that distinction is the whole problem.

> "You are given a sorted array of n integers and a target. Return the first and last index of the target."

*Sorted* plus *boundary* -> binary search, twice, for the lower and upper bound.

> "Given the number of courses and a list of prerequisite pairs, determine whether you can finish all courses."

*Dependencies* plus *is it possible* -> topological sort, and the answer is "yes if and only if there is no cycle".

> "Split an array into m subarrays to minimise the largest subarray sum."

*Minimise the maximum* plus a monotone feasibility check -> binary search on the answer. This trigger is the single highest-value one to internalise, because the problems that use it look nothing like search problems.""",
                    ),
                    (
                        "Common Use Cases",
                        """- The first ninety seconds of every coding interview
- Structuring practice: grouping problems by trigger rather than by source
- Getting unstuck: enumerate the candidate techniques out loud and eliminate them""",
                    ),
                    (
                        "Trade-offs",
                        """- **Pattern matching versus understanding.** Recognising the trigger gets you to a candidate technique; it does not write the solution. Candidates who only pattern-match fail on variations.
- **Speed versus correctness of recognition.** Committing to the wrong technique in minute two is worse than spending an extra minute deciding. Say your candidates out loud and let the interviewer react.
- **Memorised templates versus derivation.** Templates are valuable for speed and dangerous when the problem differs subtly. Know why the template is shaped as it is.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why did you choose that approach?"** — Name the trigger: "the array is sorted and we want a pair, so two pointers gives O(n) with no extra memory."
- **"What else did you consider?"** — Always have a second candidate and the reason you rejected it.
- **"What if the input were not sorted?"** — Usually costs you a sort, so O(n log n), or pushes you to a hash map.
- **"What if the values could be negative?"** — Frequently invalidates a sliding window and forces prefix sums with a map. This is the most common trap variation in the entire subject.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Committing to the first technique that comes to mind without checking the constraints
- Missing that "subarray" means contiguous and "subsequence" does not
- Applying a sliding window to an array containing negatives
- Ignoring the stated complexity requirement, which is usually the whole hint
- Failing to notice that n <= 20 is an invitation to enumerate subsets""",
                    ),
                    (
                        "Mini Exercise",
                        """For each statement, name the technique and the trigger that decides it. Do not solve them.

1. "Find the k most frequent elements in an array."
2. "Given a string, find the length of the longest substring with no repeating characters."
3. "Given n non-negative integers representing a histogram, find the largest rectangle."
4. "Given a list of flights with costs, find the cheapest route with at most k stops."
5. "Determine if you can partition an array into two subsets with equal sum."
6. "Given a stream of integers, return the median after each insertion."
7. "Given a 2D grid of 0s and 1s, count the islands."
8. "Find the smallest divisor such that the sum of the division results is at most a threshold."

Answers in one word each: heap-or-bucket-sort, sliding-window, monotonic-stack, bounded-BFS-or-Bellman-Ford, subset-sum-DP, two-heaps, DFS-or-BFS-flood-fill, binary-search-on-answer. If you got six or more, your recognition is interview-ready.""",
                    ),
                    (
                        "Interview Tip",
                        """Say your candidate techniques out loud before choosing: "This is a contiguous substring problem with a constraint, so I am thinking sliding window; the alternative is prefix sums with a hash map if the values can be negative." You have just shown pattern recognition, awareness of the trap, and given the interviewer a chance to steer you.""",
                    ),
                ],
                [
                    "Read for input shape, output shape, constraints, and forbidden costs — the stated complexity is usually the hint.",
                    "Roughly twenty triggers cover most interview problems; learn the trigger, not just the algorithm.",
                    "'Minimise the maximum' with a monotone check means binary search on the answer.",
                    "Negative values break sliding windows and push you to prefix sums with a hash map — the most common trap variation.",
                ],
                [
                    "How do you decide which technique a problem needs?",
                    "What does a constraint of O(1) extra space tell you?",
                    "When is a sliding window invalid, and what replaces it?",
                    "Greedy or dynamic programming — how do you decide?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 2 — Complexity
# ---------------------------------------------------------------------------


def _complexity_topic() -> dict:
    return _dsa_topic(
        "big-o-complexity",
        "Complexity Analysis",
        "Growth rates, recursion recurrences, amortised cost, and the practical performance facts that Big-O hides.",
        "EASY",
        2,
        [
            DL(
                "what-is-big-o",
                "What is Big-O Complexity?",
                "How to describe growth precisely, and how to state it out loud the way interviewers expect.",
                14,
                "Big-O describes how runtime or memory grows as the input grows large. It is the shared vocabulary of every technical interview, and stating it correctly and unprompted is one of the cheapest ways to sound like someone who has done this before. It is also the tool you use to decide whether an approach is worth coding at all.",
                [
                    (
                        "Why It Matters",
                        """Every comparison you make in an interview is a complexity claim. "A hash map is better" is an opinion; "this is O(n) time and O(n) space versus O(n^2) time and O(1) space, and n is a million, so the memory is worth it" is an argument.

It also saves you from wasted work. If the interviewer says n can be 10^6 and your idea is O(n^2), you know before writing a line that it will not pass. Complexity analysis is the filter you apply to your own ideas.""",
                    ),
                    (
                        "Mental Model",
                        """Big-O is an upper bound on growth, with constants and lower-order terms dropped.

- `3n + 20` is O(n)
- `n^2 + 500n` is O(n^2)
- `log2(n)` and `log10(n)` are both O(log n) — the base is a constant factor

Three related notations, and interviewers do occasionally ask:

| Notation | Meaning | Usual use |
| --- | --- | --- |
| O(f) | Grows no faster than f | Worst case, the default |
| Omega(f) | Grows no slower than f | Lower bounds |
| Theta(f) | Grows exactly like f | When upper and lower match |

In practice "what is the complexity?" means "what is the worst-case time, in Big-O, and what extra space does it use?".

> Memory cue: always answer with three things — time, space, and what n is.""",
                    ),
                    (
                        "How It Works",
                        """### The ladder

| Complexity | Name | Typical source | n = 10^6 feels |
| --- | --- | --- | --- |
| O(1) | Constant | Hash lookup, array index, arithmetic | Instant |
| O(log n) | Logarithmic | Binary search, balanced tree, heap push | Instant |
| O(n) | Linear | Single scan | Fast |
| O(n log n) | Linearithmic | Sorting, heap of n items, divide and conquer | Fine |
| O(n^2) | Quadratic | Nested loops over the input, all pairs | Too slow |
| O(n^3) | Cubic | Triple loop, naive matrix multiply | Hopeless |
| O(2^n) | Exponential | Subsets, naive recursion on n items | Only n <= 25 |
| O(n!) | Factorial | Permutations | Only n <= 12 |

### Reading complexity off code

Count the work as a function of n.

```java
// O(n) - one pass
for (int i = 0; i < n; i++) { sum += a[i]; }

// O(n^2) - nested over the same input
for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++) { check(a[i], a[j]); }

// O(n^2) as well - the inner loop averages n/2, and constants drop
for (int i = 0; i < n; i++)
    for (int j = i + 1; j < n; j++) { check(a[i], a[j]); }

// O(n log n) - the inner loop halves each time
for (int i = 0; i < n; i++)
    for (int j = 1; j < n; j *= 2) { work(); }

// O(n + m) - two different inputs, NOT O(n^2)
for (int i = 0; i < n; i++) { work(); }
for (int j = 0; j < m; j++) { work(); }
```

The last one matters: when two inputs exist, say `O(n + m)` and define both. Collapsing them into "O(n)" loses information the interviewer is listening for.

### Space complexity

Count everything you allocate that grows with the input, plus the recursion stack.

```java
// O(1) extra space - a fixed number of variables
int max = Integer.MIN_VALUE;
for (int x : a) max = Math.max(max, x);

// O(n) extra space - the map grows with the input
Map<Integer, Integer> seen = new HashMap<>();
for (int i = 0; i < n; i++) seen.put(a[i], i);

// O(n) space even though nothing is allocated - the call stack is n deep
int sum(int[] a, int i) {
    if (i == a.length) return 0;
    return a[i] + sum(a, i + 1);
}
```

That third case is the one candidates miss. Recursion depth is space, and an interviewer asking "what is the space complexity?" after a recursive solution is usually checking exactly that.

The distinction between *auxiliary* space (what you allocate) and *total* space (including the input) occasionally comes up. If asked for space, give auxiliary and say so.

### Best, average, worst

- **Worst case** is the default and what you should state.
- **Average case** matters for hash maps (expected O(1)) and quicksort (expected O(n log n)).
- **Best case** is rarely interesting, except to note early termination.

Say "expected O(1)" for a hash lookup rather than "O(1)". It is more accurate and interviewers notice.

### Complexity with multiple variables

Be precise about what grows:

- Building a frequency map over a string of length n with an alphabet of size k: O(n) time, O(k) space — not O(n) space, because the map is bounded by the alphabet.
- BFS on a graph: O(V + E), not O(n).
- Comparing n strings of average length L: O(n * L), because a string comparison is not O(1).

That last point is a genuinely common error: `s1.equals(s2)` is O(L), and sorting n strings is O(n * L * log n), not O(n log n).""",
                    ),
                    (
                        "Example",
                        """Two solutions to "does this array contain a duplicate?", analysed properly.

```java
// Approach 1: compare every pair
boolean hasDuplicate(int[] a) {
    for (int i = 0; i < a.length; i++)
        for (int j = i + 1; j < a.length; j++)
            if (a[i] == a[j]) return true;
    return false;
}
// O(n^2) time, O(1) extra space

// Approach 2: remember what we have seen
boolean hasDuplicate(int[] a) {
    Set<Integer> seen = new HashSet<>();
    for (int x : a) {
        if (!seen.add(x)) return true;
    }
    return false;
}
// Expected O(n) time, O(n) extra space
```

The sentence to say out loud: "The first is O(n^2) time with no extra memory. The second is expected O(n) time and O(n) space — I would take the second unless memory is constrained or n is small enough that the constant factors favour the scan. There is also a third option: sort first, which is O(n log n) time and O(1) extra space if I may mutate the input, and that is the right choice when memory is tight."

Three approaches, three complexity profiles, and a stated preference with a condition. That is a complete answer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Choosing between two approaches before coding either one
- Answering "can you do better?" by naming the current bound and the target
- Justifying extra memory
- Deciding whether an approach can possibly pass the stated constraints""",
                    ),
                    (
                        "Trade-offs",
                        """- **Big-O hides constants.** An O(n log n) sort routinely beats an O(n) hash-based method for small n, because hashing has a large constant and poor cache behaviour.
- **Asymptotics hide memory hierarchy.** A cache-friendly O(n^2) scan over an array can outrun a pointer-chasing O(n log n) structure at realistic sizes.
- **Time versus space is the recurring trade.** Hash maps, memoisation, and precomputation all buy time with memory.
- **Worst case versus expected.** Hash maps are expected O(1) and worst case O(n). Quicksort is expected O(n log n) and worst case O(n^2). Say which you mean.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Saying O(2n) or O(n/2) instead of O(n)
- Forgetting the recursion stack when stating space
- Calling a hash lookup O(1) without the word "expected"
- Treating string comparison or concatenation as O(1)
- Ignoring the second input and saying O(n) when it is O(n + m)
- Stating time and never stating space until asked
- Claiming a complexity without being able to point at the line that causes it""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What is the space complexity?"** — Auxiliary space including the call stack. If you used recursion, say the depth.
- **"Can you do better?"** — Name the current bound, the theoretical floor (you must read the input, so O(n) is often the floor), and where the gap is.
- **"What is the worst case for your hash map solution?"** — O(n) per operation under adversarial collisions; in practice expected O(1).
- **"Is O(n log n) good enough here?"** — Compare to the constraint. At n = 10^5, yes. At n = 10^8, probably not.
- **"Which term dominates?"** — Point at the specific line. If you cannot, you do not yet understand your own solution.""",
                    ),
                    (
                        "Mini Exercise",
                        """State the time and space complexity of each, including the call stack, and name n:

1. Reversing a string by building a new one character by character with `+=`.
2. Sorting an array of n strings each of average length L.
3. A recursive Fibonacci with no memoisation.
4. The same with memoisation.
5. Inserting n items into a HashMap and then iterating it.
6. Checking whether a string of length n is a palindrome with two pointers.
7. BFS over a graph with V vertices and E edges.

Answer 1 is the interesting one: `+=` on immutable strings copies the whole string each time, so it is O(n^2) time, not O(n). That is a real bug pattern in Java, not a trivia question.""",
                    ),
                    (
                        "Interview Tip",
                        """State time and space together, unprompted, the moment you finish describing an approach — and define n. "O(n) time, O(k) extra space where k is the number of distinct characters" is a complete, senior-sounding sentence, and it prevents the interviewer from having to ask.""",
                    ),
                ],
                [
                    "Always answer with three things: time, space, and what n is.",
                    "Recursion depth counts as space, and interviewers ask about it specifically.",
                    "Say 'expected O(1)' for hash operations and 'O(n + m)' when there are two inputs.",
                    "String comparison and concatenation are not O(1) — a common and costly analysis error.",
                ],
                [
                    "What is the difference between O(n) and O(log n)?",
                    "What is the space complexity of a recursive solution?",
                    "Why is a hash map lookup expected O(1) rather than O(1)?",
                    "When might an O(n log n) algorithm beat an O(n) one in practice?",
                ],
                ["pair-target", "anagram-bundles"],
            ),
            DL(
                "complexity-of-recursion",
                "Analysing Recursion and Divide-and-Conquer",
                "Recursion trees, recurrences, and the branching arguments that produce O(2^n), O(n log n), and O(log n).",
                13,
                "Loops are easy to analyse; recursion is where candidates lose confidence. The good news is that almost every recursive interview solution falls into one of about five shapes, and each shape has a one-line argument you can deliver out loud without solving a recurrence formally.",
                [
                    (
                        "Why It Matters",
                        """The question "what is the complexity of your recursion?" is asked constantly, and hesitating signals that you wrote code you do not fully understand. It also drives decisions: recognising that naive recursion is O(2^n) is exactly what motivates memoisation, and recognising that a divide-and-conquer split is O(n log n) is what justifies merge sort over insertion sort.""",
                    ),
                    (
                        "Mental Model",
                        """Multiply the number of calls by the work done in each call.

Branching factor ^ depth = number of calls

Then add the work per call, and remember that the *space* is the depth of the stack, not the number of calls.

| Shape | Calls | Complexity | Example |
| --- | --- | --- | --- |
| One call, n deep | n | O(n) time, O(n) stack | Linear recursion, linked list traversal |
| Two calls, halving | 2^log n = n | O(n) time, O(log n) stack | Binary tree traversal on a balanced tree |
| Two calls, n deep | 2^n | O(2^n) time, O(n) stack | Naive Fibonacci, subset enumeration |
| Two calls, halving, O(n) merge | n log n | O(n log n) | Merge sort, quicksort average |
| One call, halving | log n | O(log n) time and stack | Binary search |
| n calls, n deep | n! | O(n!) | Permutations |""",
                    ),
                    (
                        "How It Works",
                        """### The recursion tree argument

Draw (or describe) the tree of calls. Count the nodes and the work per node.

```java
// Naive Fibonacci: two calls, depth n
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
```

Each call spawns two, and the tree is about n deep, so the number of nodes is roughly 2^n. Work per node is O(1). Time is O(2^n); space is O(n) for the deepest path, not O(2^n), because the stack only ever holds one root-to-leaf path.

Saying "time O(2^n), space O(n) because only one branch is on the stack at a time" is exactly the level of precision expected.

```java
// Memoised: each n is computed once
int fib(int n, Integer[] memo) {
    if (n <= 1) return n;
    if (memo[n] != null) return memo[n];
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
    return memo[n];
}
```

Now there are n distinct subproblems, each computed once in O(1). Time O(n), space O(n) for the memo plus O(n) stack.

**The general rule for memoised recursion**, which is worth memorising because it answers most DP complexity questions: time equals the number of distinct states multiplied by the work per state.

### Divide and conquer

```java
// Merge sort: split in half, recurse twice, merge in O(n)
void sort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    sort(a, lo, mid);
    sort(a, mid + 1, hi);
    merge(a, lo, mid, hi);   // O(n) work at this level
}
```

The recurrence is `T(n) = 2T(n/2) + O(n)`. The argument to say out loud: there are log n levels, each level does O(n) total work across all its calls, so the total is O(n log n). Space is O(n) for the merge buffer plus O(log n) stack.

### The master theorem, at interview depth

The general form: `T(n) = a*T(n/b) + O(n^d)`. The three cases are:

- If `d > log_b(a)`: O(n^d) — the work at the top dominates
- If `d = log_b(a)`: O(n^d log n) — every level costs the same
- If `d < log_b(a)`: O(n^(log_b a)) — the leaves dominate

You will rarely need to cite it by name. Merge sort is `a=2, b=2, d=1`, and `log_2(2) = 1 = d`, so the middle case gives O(n log n). Binary search is `a=1, b=2, d=0`, which gives O(log n).

### Tree recursion

For a binary tree with n nodes, a traversal visits each node once:

```java
int depth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(depth(root.left), depth(root.right));
}
```

Time is O(n) — every node visited once. Space is O(h) where h is the height: O(log n) for a balanced tree and O(n) for a degenerate one. **Always express tree recursion space in terms of the height, then say what the height is in the worst case.** That is the distinction interviewers listen for.

### Backtracking

```java
void permute(List<Integer> current, boolean[] used, int[] nums, List<List<Integer>> out) {
    if (current.size() == nums.length) { out.add(new ArrayList<>(current)); return; }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        current.add(nums[i]);
        permute(current, used, nums, out);
        current.remove(current.size() - 1);
        used[i] = false;
    }
}
```

There are n! permutations and each costs O(n) to copy into the output, so O(n * n!) time. Space is O(n) for the recursion and the current path, excluding the output.

For subsets it is 2^n results, each up to O(n) to copy: O(n * 2^n).

The honest framing: for enumeration problems the output size is part of the complexity, and you cannot beat it. Saying "the output itself is 2^n, so no algorithm can be faster" is a strong observation.""",
                    ),
                    (
                        "Example",
                        """The same problem analysed three ways: "count the ways to climb n stairs taking 1 or 2 steps".

- **Naive recursion** — two calls, depth n. O(2^n) time, O(n) space.
- **Memoised** — n distinct states, O(1) work each. O(n) time, O(n) space.
- **Bottom-up with two variables** — a single loop keeping only the last two values. O(n) time, O(1) space.

The progression is itself the answer to "can you do better?", twice. Being able to walk that ladder and state the complexity at each rung is the skill this lesson exists to build.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Justifying memoisation by naming the exponential blow-up it removes
- Stating the complexity of any tree or graph recursion
- Analysing backtracking, where the output size dominates
- Choosing iterative over recursive when the stack depth is a risk""",
                    ),
                    (
                        "Trade-offs",
                        """- **Recursive clarity versus stack safety.** Recursion reads better for trees and divide-and-conquer; at depth 10^5 or more it risks a stack overflow, and an explicit stack is the fix.
- **Memoisation cost.** Turning O(2^n) into O(n) usually costs O(n) memory. Almost always worth it, and worth stating as a trade.
- **Top-down versus bottom-up.** Memoised recursion is easier to write and carries stack overhead; tabulation is faster and often allows space reduction.
- **Tail recursion.** Java does not optimise it, so a tail-recursive Java solution still uses O(n) stack. Worth knowing when an interviewer asks.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Claiming O(2^n) space for naive Fibonacci — it is O(n), only one path is on the stack
- Forgetting the stack entirely when asked for space
- Saying O(n) for tree recursion space instead of O(h), then failing to note h can be n
- Missing that copying a result into the output list adds a factor
- Assuming memoisation always reduces the complexity — it only helps when subproblems actually repeat""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What is the space complexity of that recursion?"** — Depth of the stack, expressed in terms of the structure, with the worst case named.
- **"Why is the naive version exponential?"** — Because the same subproblem is recomputed across different branches. Point at `fib(n-2)` being computed twice.
- **"Can you make it iterative?"** — Yes, with an explicit stack, or bottom-up for DP. Say why you would: stack depth safety.
- **"How many distinct subproblems are there?"** — This is the DP complexity question in disguise: states times work per state.
- **"What is the recurrence?"** — `T(n) = 2T(n/2) + O(n)` and the level-counting argument. You rarely need the theorem itself.""",
                    ),
                    (
                        "Mini Exercise",
                        """Give time and space for each, and name the shape:

1. Binary search, recursive.
2. In-order traversal of a binary tree with n nodes.
3. Generating all subsets of n elements.
4. Quicksort, average and worst case.
5. Naive recursive edit distance on strings of length m and n.
6. The same with memoisation.
7. Computing the height of a linked-list-shaped tree with 10^5 nodes.

Number 7 has a practical sting: the recursion is O(n) deep on a degenerate tree and will overflow the default Java stack, which is exactly why interviewers like degenerate-tree follow-ups.""",
                    ),
                    (
                        "Interview Tip",
                        """Analyse recursion out loud with the two-part sentence: "Each call branches into two and the depth is n, so time is O(2^n); the stack only holds one path at a time, so space is O(n)." Branching times depth for time, depth alone for space — that formula answers most of these questions.""",
                    ),
                ],
                [
                    "Time is branching factor to the power of depth; space is the depth alone, because only one path is on the stack.",
                    "Memoised recursion costs distinct states multiplied by work per state — the formula behind most DP complexities.",
                    "Express tree recursion space as O(h) and then say h can be n for a degenerate tree.",
                    "For enumeration problems the output size is part of the complexity and cannot be beaten.",
                ],
                [
                    "Why is naive Fibonacci O(2^n) in time but only O(n) in space?",
                    "What is the complexity of merge sort and how do you argue it?",
                    "How do you compute the complexity of a memoised recursion?",
                    "What is the space complexity of a binary tree traversal?",
                ],
            ),
            DL(
                "amortized-and-real-performance",
                "Amortised Cost and What Big-O Hides",
                "Why an ArrayList add is O(1), when constants decide the answer, and the practical facts interviewers reward.",
                12,
                "Big-O is an abstraction, and like every abstraction it leaks. Amortised analysis explains why a structure with an occasional expensive operation is still cheap on average; constant factors and memory behaviour explain why the asymptotically better algorithm sometimes loses. Both come up as follow-up questions, and both separate candidates who have measured real code from those who have not.",
                [
                    (
                        "Why It Matters",
                        """Two specific questions recur: "what is the complexity of adding to an ArrayList?" and "is your O(n) solution actually faster than the O(n log n) one here?". Both require going one level below the asymptotic notation.

The second question is also where interviewers check whether you can be pragmatic. A candidate who insists the asymptotically better solution is always better has not profiled real code.""",
                    ),
                    (
                        "Mental Model",
                        """Amortised cost is the total cost of a sequence of operations divided by the number of operations.

It is not the average case. Average case is about the distribution of inputs; amortised is a worst-case guarantee over a sequence, regardless of input. A dynamic array's `add` is amortised O(1) even in the worst possible sequence.

Total cost of n operations / n = amortised cost per operation""",
                    ),
                    (
                        "How It Works",
                        """### Dynamic array growth

`ArrayList.add` is O(1) amortised. The argument, which interviewers expect you to be able to give:

When the backing array is full, a new array of double the size is allocated and the elements are copied — that single `add` is O(n). But doubling means the resizes happen at sizes 1, 2, 4, 8, ..., n, and the total copying work is `1 + 2 + 4 + ... + n < 2n`. Spread over n adds, that is O(1) each.

The doubling is essential. If the array grew by a fixed amount each time, resizes would happen every k adds and total copying would be O(n^2) — so growth factor is a real design decision, not an implementation detail.

```java
List<Integer> list = new ArrayList<>();
for (int i = 0; i < n; i++) {
    list.add(i);   // amortised O(1); occasionally O(n) when it resizes
}
// Total: O(n). If you know the size up front:
List<Integer> sized = new ArrayList<>(n);   // avoids every resize
```

### Other amortised structures

| Operation | Amortised | Worst single op |
| --- | --- | --- |
| ArrayList add | O(1) | O(n) on resize |
| HashMap put | O(1) expected | O(n) on resize or collisions |
| StringBuilder append | O(1) | O(n) on resize |
| Union-Find find, with path compression and union by rank | Near O(1) | O(log n) |
| Monotonic stack per element | O(1) | O(n) for one element |

The monotonic stack is the one worth internalising for interviews: a single element may pop many others, but **each element is pushed once and popped once across the whole run**, so the total is O(n). That amortised argument is exactly what you say when asked why a nested-looking loop is actually linear.

```java
// Next greater element: looks like it could be O(n^2), is O(n)
int[] nextGreater(int[] a) {
    int[] res = new int[a.length];
    Arrays.fill(res, -1);
    Deque<Integer> stack = new ArrayDeque<>();   // holds indices
    for (int i = 0; i < a.length; i++) {
        while (!stack.isEmpty() && a[stack.peek()] < a[i]) {
            res[stack.pop()] = a[i];
        }
        stack.push(i);
    }
    return res;
}
// Each index is pushed once and popped at most once: O(n) total.
```

### What Big-O hides

**Constant factors.** A hash map lookup involves hashing, a modulo, a memory dereference to a bucket, and possibly a comparison. A linear scan of a 16-element array may be faster than a single hash lookup. For small n, the simple approach often wins.

**Cache behaviour.** Sequential access to an array is dramatically faster per element than pointer chasing through a linked structure, because of prefetching and cache lines. This is why `ArrayList` beats `LinkedList` for nearly every realistic workload, including ones where the asymptotics favour `LinkedList`. If asked "ArrayList or LinkedList?", the answer is almost always ArrayList, and the reason is memory locality, not asymptotics.

**Hidden costs in library calls.** `list.remove(0)` on an ArrayList is O(n). `String` concatenation in a loop is O(n^2). `substring` may copy. `contains` on a List is O(n), not O(1) — using a List where a Set was needed is one of the most common accidental O(n^2) bugs.

**Allocation and garbage collection.** Creating objects inside a hot loop has a real cost that no complexity analysis shows.

### Practical latency intuition

Rough orders of magnitude worth carrying:

- A simple operation: about a nanosecond
- A main-memory access: about 100 nanoseconds
- Modern hardware does on the order of 10^8 to 10^9 simple operations per second

So with a one-second budget, roughly 10^8 operations is the practical ceiling. That is why n = 10^5 with an O(n^2) algorithm (10^10 operations) fails and O(n log n) (about 1.7 x 10^6) passes comfortably. Being able to do that sanity check is a genuinely useful skill.""",
                    ),
                    (
                        "Example",
                        """"Count distinct elements in an array of 20 integers."

- Hash set: expected O(n) time, O(n) space, plus hashing overhead and object allocation for boxed Integers.
- Sort then scan: O(n log n) time, O(1) extra space if you may mutate.
- Nested loop: O(n^2) = 400 operations.

At n = 20, the nested loop is very likely the fastest of the three in wall-clock time, and all three are instantaneous. The right interview answer names the asymptotics, then says: "at n = 20 the constants dominate and any of these is fine; I would write the hash set version because it is the clearest, and it remains correct if n grows."

That answer demonstrates both the analysis and the judgement to know when the analysis does not decide anything.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Justifying why a stack-based loop is O(n) despite a nested while
- Explaining ArrayList versus LinkedList properly
- Sanity-checking whether an approach fits the time limit
- Spotting accidental O(n^2) from string concatenation or List.contains""",
                    ),
                    (
                        "Trade-offs",
                        """- **Amortised versus worst-case guarantees.** Amortised O(1) is fine for throughput and unacceptable for a hard real-time latency bound, where the occasional O(n) resize is a problem.
- **Preallocating versus flexibility.** Sizing a collection up front removes resizes and wastes memory if the estimate is high.
- **Asymptotics versus constants.** Choose asymptotics when n can grow, constants when n is bounded and small.
- **Clarity versus micro-optimisation.** In an interview, clear code that is asymptotically correct beats a faster version nobody can read.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Confusing amortised with average case
- Calling a monotonic stack loop O(n^2) because of the inner while
- Using `String +=` inside a loop, making it O(n^2)
- Using `List.contains` inside a loop instead of a `Set`
- Calling `list.remove(0)` in a loop on an ArrayList
- Recommending LinkedList for performance
- Ignoring that boxing and allocation have real costs""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why is ArrayList add O(1) when it sometimes copies everything?"** — Give the doubling argument and the geometric sum.
- **"That inner while loop looks like O(n^2) — is it?"** — No: each element is pushed and popped at most once, so O(n) total. This is the classic amortised question.
- **"Would you use an ArrayList or a LinkedList here?"** — ArrayList, for cache locality, unless you genuinely need O(1) insertion at a known node reference.
- **"Your solution is O(n) and mine is O(n log n) — is yours faster?"** — Depends on n and the constants. Give the crossover reasoning rather than a reflexive yes.
- **"Will this pass with n = 10^6?"** — Do the arithmetic against roughly 10^8 operations per second.""",
                    ),
                    (
                        "Mini Exercise",
                        """Find the hidden complexity problem in each snippet and state the real cost:

1. Building a result string with `result += word` inside a loop over n words.
2. `for (int i = 0; i < n; i++) if (list.contains(a[i])) count++;` where `list` is an `ArrayList` of size n.
3. `while (!list.isEmpty()) process(list.remove(0));` on an `ArrayList`.
4. Inserting n elements into a `HashMap` created with `new HashMap<>()` when n is known to be a million.
5. A monotonic stack loop with a nested while.

Four of the five are genuine performance bugs; the fifth is fine and is the one you must be able to defend. Number 4 is subtler than the others: it is asymptotically fine, and pre-sizing avoids about twenty rehashes of a growing table.""",
                    ),
                    (
                        "Interview Tip",
                        """When a loop contains a nested while that looks quadratic, pre-empt the question: "this is O(n) overall because each element is pushed and popped at most once." Volunteering the amortised argument before being asked is a clear signal you understand your own code.""",
                    ),
                ],
                [
                    "Amortised means total cost over a sequence divided by the operations — a worst-case guarantee, not an average over inputs.",
                    "Dynamic arrays are amortised O(1) because doubling makes total copy work geometric and bounded by 2n.",
                    "Each element pushed and popped once makes monotonic-stack loops O(n) despite the nested while.",
                    "Constants and cache locality decide real performance at small n; ArrayList beats LinkedList for that reason.",
                ],
                [
                    "Why is adding to a dynamic array amortised O(1)?",
                    "Is a nested while loop inside a for loop always quadratic?",
                    "When would you prefer an asymptotically worse algorithm?",
                    "What is the difference between amortised and average-case complexity?",
                ],
            ),
        ],
        practice_tag="array",
    )


# ---------------------------------------------------------------------------
# Module 3 — Core data structures
# ---------------------------------------------------------------------------


def _arrays_hashing_topic() -> dict:
    return _dsa_topic(
        "arrays-hashing",
        "Arrays & Hashing",
        "The two structures that appear in most interviews, and the patterns built directly on them.",
        "EASY",
        3,
        [
            DL(
                "arrays-in-interviews",
                "Arrays in Interviews",
                "Index discipline, in-place editing with a write pointer, and the questions to ask before touching the array.",
                12,
                "An array is a contiguous block of values reachable in O(1) by index. Almost every interview begins here, because the interviewer can watch you handle bounds, decide whether to mutate, and choose between extra memory and in-place work. Getting the index discipline wrong early makes the rest of the interview noise.",
                [
                    (
                        "Why It Matters",
                        """Arrays are the substrate for two pointers, sliding windows, prefix sums, sorting, and binary search. The patterns built on them account for a large share of all interview problems.

They are also where the cheap mistakes live: off-by-one on the last index, mutating while iterating, and assuming sortedness that was never stated. Those errors cost more interviews than any missing algorithm.""",
                    ),
                    (
                        "Mental Model",
                        """Contiguous memory with O(1) random access, and everything else follows.

| Operation | Cost | Why |
| --- | --- | --- |
| Read or write by index | O(1) | Address arithmetic |
| Append (dynamic array) | O(1) amortised | Doubling |
| Insert or delete in the middle | O(n) | Everything after must shift |
| Search, unsorted | O(n) | Must look at each |
| Search, sorted | O(log n) | Binary search |

> Memory cue: the three questions to ask before you write a line — is it sorted, may I mutate it, and can it be empty?""",
                    ),
                    (
                        "How It Works",
                        """### The write-pointer pattern

The single most useful in-place technique. Keep a `write` index for where the next kept element goes, and a `read` index scanning forward. Everything before `write` is the answer so far.

```java
// Remove all occurrences of val in place, return the new length
int removeElement(int[] nums, int val) {
    int write = 0;
    for (int read = 0; read < nums.length; read++) {
        if (nums[read] != val) {
            nums[write++] = nums[read];
        }
    }
    return write;   // nums[0..write) is the result
}
// O(n) time, O(1) extra space
```

The same shape solves: remove duplicates from a sorted array, move zeros to the end, and partition by a predicate. Recognising that these are one pattern rather than four problems is the point.

```java
// Remove duplicates from a SORTED array in place
int removeDuplicates(int[] nums) {
    if (nums.length == 0) return 0;
    int write = 1;
    for (int read = 1; read < nums.length; read++) {
        if (nums[read] != nums[write - 1]) {
            nums[write++] = nums[read];
        }
    }
    return write;
}
```

### Bounds discipline

Two habits that prevent most index bugs:

1. **Prefer half-open ranges** `[lo, hi)`. The length is `hi - lo`, an empty range is `lo == hi`, and splitting is `[lo, mid)` and `[mid, hi)` with no off-by-one arithmetic.
2. **Write the guard clauses first.** `if (nums == null || nums.length == 0) return ...;` at the top, before the logic.

```java
// Safe midpoint: lo + (hi - lo) / 2 avoids integer overflow
int mid = lo + (hi - lo) / 2;
// NOT (lo + hi) / 2, which overflows when lo + hi exceeds Integer.MAX_VALUE
```

That overflow is a real interview gotcha and a famous bug in production binary search implementations. It costs one habit to avoid permanently.

### Mutating while iterating

Never remove from a collection you are iterating forward over with an index, because the indices shift underneath you. Either iterate backwards, use an iterator's `remove`, or build a new collection.

```java
// Wrong: skips elements after each removal
for (int i = 0; i < list.size(); i++)
    if (list.get(i) == target) list.remove(i);

// Right: iterate backwards so removals do not shift unvisited indices
for (int i = list.size() - 1; i >= 0; i--)
    if (list.get(i) == target) list.remove(i);
```

### Rotation and reversal

The reversal trick appears often enough to be worth memorising: rotating an array right by k is three reversals.

```java
void rotate(int[] nums, int k) {
    int n = nums.length;
    k %= n;                    // k can exceed n
    reverse(nums, 0, n - 1);
    reverse(nums, 0, k - 1);
    reverse(nums, k, n - 1);
}

void reverse(int[] a, int lo, int hi) {
    while (lo < hi) {
        int tmp = a[lo]; a[lo++] = a[hi]; a[hi--] = tmp;
    }
}
// O(n) time, O(1) space
```

### Arrays in Java specifically

- `int[]` holds primitives with no boxing; `Integer[]` and `List<Integer>` box, which costs memory and comparison surprises.
- `==` on `Integer` compares references outside the small cache range — use `equals` or unbox deliberately. This is a real source of silent bugs.
- `Arrays.sort` on primitives is a dual-pivot quicksort (O(n log n) average, no stability concern); on objects it is a stable merge sort.
- `Arrays.asList` returns a fixed-size view, so `add` throws.
- Multi-dimensional arrays are arrays of arrays, so rows can have different lengths and row-major traversal is the cache-friendly order.""",
                    ),
                    (
                        "Example",
                        """"Move all zeros to the end of the array, preserving the order of the non-zero elements, in place."

```java
void moveZeroes(int[] nums) {
    int write = 0;
    for (int read = 0; read < nums.length; read++) {
        if (nums[read] != 0) {
            nums[write++] = nums[read];
        }
    }
    while (write < nums.length) {
        nums[write++] = 0;
    }
}
// O(n) time, O(1) extra space, order preserved
```

What to say: "I use a write pointer for the next position a non-zero value should occupy. After the first pass, everything from `write` onwards is filled with zeros. That is one pass plus a fill, O(n) time and O(1) space, and it preserves relative order — which a swap-based version would not necessarily do."

That final clause about order is exactly the kind of detail that distinguishes a careful answer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- In-place filtering, deduplication, and partitioning
- Two pointers, sliding windows, and prefix sums, all of which build on array indexing
- Matrix problems, where row-major traversal and boundary handling dominate
- Any problem where the follow-up is "now do it without extra space" """,
                    ),
                    (
                        "Trade-offs",
                        """- **In place versus a new array.** In place is O(1) space and destroys the input; a copy is safe and costs O(n). Ask which is acceptable before choosing.
- **Array versus hash map.** An array indexed by value is an O(1) lookup with no hashing overhead, but only when values are small, non-negative, and bounded. For a fixed alphabet, `int[26]` beats a HashMap on both speed and clarity.
- **Sorting first.** Costs O(n log n) and frequently converts a hard problem into a two-pointer scan. Often the right trade.
- **Primitive arrays versus collections.** Primitives avoid boxing and are faster; collections are more flexible and resize.""",
                    ),
                    (
                        "Common Mistakes",
                        """- `(lo + hi) / 2` overflowing on large indices
- Off-by-one at the final index, especially with inclusive ranges
- Removing from a list while iterating forward
- Assuming the input is sorted, or that it is non-empty
- Using `==` to compare boxed `Integer` values
- Forgetting that `k` may exceed the array length in rotation problems
- Allocating a second array when the interviewer asked for O(1) space""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do it in place?"** — Write pointer, or two pointers from the ends. Then confirm whether relative order must be preserved, because that decides between compaction and swapping.
- **"What if the array is sorted?"** — Two pointers or binary search, usually dropping a factor or the extra space.
- **"What if you cannot modify the input?"** — Copy, or use an index-based structure rather than rearranging.
- **"What is the space complexity?"** — O(1) if you only use a fixed number of indices; say so explicitly.
- **"What happens on an empty array?"** — Have the guard clause already written; this question is checking whether you thought about it before being asked.""",
                    ),
                    (
                        "Mini Exercise",
                        """Implement each in place with O(1) extra space, and state whether relative order is preserved:

1. Remove all duplicates from a sorted array.
2. Move every zero to the end, preserving order of the rest.
3. Partition the array so all even numbers come before all odd numbers (order need not be preserved).
4. Rotate the array left by k positions.
5. Reverse only the vowels in a character array.

Number 3 is the interesting one: because order does not matter, two pointers converging from the ends with swaps is simpler and does fewer writes than a write pointer. Matching the technique to whether order matters is the lesson.""",
                    ),
                    (
                        "Interview Tip",
                        """Ask the three questions out loud before writing anything: "Is the array sorted? May I mutate it? Can it be empty or null?" Ten seconds, and it prevents the three most common ways this category of problem goes wrong.""",
                    ),
                ],
                [
                    "The write-pointer pattern solves in-place removal, deduplication and partitioning with O(1) space.",
                    "Use half-open ranges and `lo + (hi - lo) / 2` to eliminate off-by-one and overflow bugs permanently.",
                    "An `int[]` indexed by value beats a HashMap when the value range is small and bounded.",
                    "Ask whether the array is sorted, whether you may mutate it, and whether it can be empty — before coding.",
                ],
                [
                    "How do you remove elements from an array in place?",
                    "Why is `(lo + hi) / 2` dangerous, and what do you write instead?",
                    "When would you prefer an int array over a HashMap for counting?",
                    "How do you rotate an array by k with O(1) extra space?",
                ],
                ["pair-target", "missing-range-value"],
            ),
            DL(
                "hashing-and-frequency-maps",
                "Hashing and Frequency Maps",
                "Turning 'have I seen this?' into an O(1) lookup, and choosing the key that makes the problem collapse.",
                13,
                "A hash map stores key to value with expected O(1) insert and lookup. In interviews it is the default way to remember what you have already seen, and the entire difficulty is usually in choosing the key. Once the right key is chosen, most of these problems become a single pass.",
                [
                    (
                        "Why It Matters",
                        """A very large fraction of O(n^2) brute forces contain an inner loop that is searching for something. Every one of those searches is a hash map away from O(1), which turns the whole algorithm linear.

Learning to spot that inner search — and to name the key that eliminates it — is probably the highest-return single skill in array and string interviews.""",
                    ),
                    (
                        "Mental Model",
                        """The key is the solution. Ask: what makes two things equivalent for this problem?

Inner search → Hash lookup → One pass

| Problem asks | Key on |
| --- | --- |
| Find a pair summing to target | The complement, `target - x` |
| Group anagrams | A canonical form: sorted string or a 26-count signature |
| First non-repeating character | The character, with a count |
| Subarray sums to k | The running prefix sum |
| Detect duplicates within distance k | The value, with its last index |
| Longest consecutive sequence | Set membership, so you can walk runs |
| Isomorphic strings or word patterns | Both directions of the mapping |""",
                    ),
                    (
                        "How It Works",
                        """### The three shapes

Nearly every hash-map problem is one of three:

**1. Seen set** — have I encountered this before?

```java
Set<Integer> seen = new HashSet<>();
for (int x : nums) {
    if (!seen.add(x)) return true;   // add returns false if already present
}
return false;
```

**2. Count map** — how many times does each key occur?

```java
Map<Character, Integer> counts = new HashMap<>();
for (char c : s.toCharArray()) {
    counts.merge(c, 1, Integer::sum);
}
```

`merge` and `getOrDefault` are the idiomatic Java forms and avoid the null checks that cause bugs under time pressure.

**3. Index or grouping map** — where did I see this, or what belongs together?

```java
Map<String, List<String>> groups = new HashMap<>();
for (String word : words) {
    String key = canonical(word);
    groups.computeIfAbsent(key, k -> new ArrayList<>()).add(word);
}
```

`computeIfAbsent` is the clean way to build a multimap and is worth having at your fingertips.

### The complement trick

```java
// Two Sum: return indices of the two numbers adding to target
int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();   // value -> index
    for (int i = 0; i < nums.length; i++) {
        Integer j = seen.get(target - nums[i]);
        if (j != null) return new int[] {j, i};
        seen.put(nums[i], i);
    }
    return new int[0];
}
// O(n) time, O(n) space
```

The critical detail: **check before inserting**. Checking first handles the case where an element would pair with itself, and it means duplicates work correctly without special handling. Candidates who insert first then check produce a subtle bug on input like `[3, 3]` with target 6.

### The prefix-sum plus hash map pattern

This is the one that unlocks a whole family of otherwise hard problems, and the one to know cold.

```java
// Count subarrays whose sum equals k. Values may be negative.
int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCounts = new HashMap<>();
    prefixCounts.put(0, 1);        // the empty prefix
    int sum = 0, result = 0;
    for (int x : nums) {
        sum += x;
        result += prefixCounts.getOrDefault(sum - k, 0);
        prefixCounts.merge(sum, 1, Integer::sum);
    }
    return result;
}
// O(n) time, O(n) space
```

Why it works: a subarray `(i, j]` sums to k exactly when `prefix[j] - prefix[i] == k`, so for each j you count how many earlier prefixes equal `prefix[j] - k`. The `put(0, 1)` seeds the empty prefix so subarrays starting at index 0 are counted.

**This is the correct answer when a sliding window would fail because values can be negative.** That connection — window breaks, prefix map works — is exactly the trap discussed in the pattern-recognition lesson.

### Choosing the key

For grouping anagrams, two valid keys with different costs:

```java
// Key by sorted characters: O(L log L) per word
String key = new String(chars);   // after Arrays.sort(chars)

// Key by a 26-count signature: O(L) per word
int[] count = new int[26];
for (char c : word.toCharArray()) count[c - 'a']++;
String key = Arrays.toString(count);
```

Say the trade: sorting is shorter to write and O(L log L); counting is O(L) and assumes a known alphabet. For n words of average length L, that is O(n L log L) versus O(n L).

### Sets versus maps

Use a `Set` when you only need membership and a `Map` when you need an associated value. `HashSet` is backed by a `HashMap` internally, so the costs are the same. `LinkedHashSet` and `LinkedHashMap` preserve insertion order at a small memory cost, and `LinkedHashMap` with access-order is the standard trick for an LRU cache.""",
                    ),
                    (
                        "Example",
                        """"Find the length of the longest run of consecutive integers in an unsorted array."

The sorting solution is O(n log n). The hash solution is O(n) and the insight is worth internalising:

```java
int longestConsecutive(int[] nums) {
    Set<Integer> set = new HashSet<>();
    for (int x : nums) set.add(x);

    int best = 0;
    for (int x : set) {
        if (set.contains(x - 1)) continue;   // only start from a run's beginning
        int length = 1;
        while (set.contains(x + length)) length++;
        best = Math.max(best, length);
    }
    return best;
}
// O(n) time, O(n) space
```

The `continue` is the whole algorithm. Without it, walking every element's run is O(n^2); with it, each run is walked exactly once from its smallest element, so the total inner work across the whole loop is O(n). That is an amortised argument, and stating it is what proves you know the code is linear rather than hoping it is.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Detecting duplicates, complements, and first-unique elements
- Grouping by a canonical form
- Counting subarrays or substrings with a target property, via prefix sums
- Caching computed results inside a loop
- Two-way mapping checks such as isomorphic strings""",
                    ),
                    (
                        "Trade-offs",
                        """- **Time for space.** O(n) memory buys the linear scan. If the interviewer forbids extra space, you are heading for sorting plus two pointers instead.
- **Expected versus worst case.** Hash operations are expected O(1) and worst case O(n) under pathological collisions. Say "expected".
- **Hash map versus array counter.** For a bounded small alphabet, `int[26]` or `int[128]` is faster, allocation-free, and clearer.
- **Sorted key versus count key.** Shorter code versus better complexity.
- **Ordering.** A `HashMap` gives no order. If you need sorted keys, that is a `TreeMap` at O(log n) per operation.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Inserting before checking in the complement pattern, breaking the duplicate case
- Forgetting to seed `prefixCounts.put(0, 1)`, which drops every subarray starting at index 0
- Using a mutable object as a key and then mutating it
- Storing the value when the index was needed
- Assuming a sliding window works when the values can be negative
- Using a `List` for membership tests, making the loop O(n^2)
- Ignoring that iteration order of a `HashMap` is unspecified""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do it without extra space?"** — Sort first and use two pointers, at O(n log n). Name the trade.
- **"What is the worst case?"** — O(n) per operation under adversarial keys; expected O(1) in practice. Java's treeified buckets bound it at O(log n) per bucket.
- **"What if the values can be negative?"** — For subarray-sum problems this is the trigger to move from a sliding window to prefix sums with a map.
- **"What if the array is huge and does not fit in memory?"** — External sorting, or hashing into partitions and processing each — the bridge into system design.
- **"Why that key?"** — Always be able to answer in one sentence: "sorted characters, because anagrams share it."
""",
                    ),
                    (
                        "Mini Exercise",
                        """Name the key for each, and say whether a set, count map, or index map is right:

1. Find the first character in a string that does not repeat.
2. Determine whether two strings are anagrams.
3. Count subarrays with sum exactly k, values may be negative.
4. Find all pairs of indices i < j with nums[i] == nums[j] and j - i <= k.
5. Check whether two strings are isomorphic.
6. Find the longest substring with at most two distinct characters.

Number 5 needs two maps, one in each direction — a single map accepts `"badc"` mapping to `"baba"`, which is wrong. Number 6 is a sliding window with a count map, not a pure hashing problem, and noticing which technique dominates is the point of the exercise.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the key out loud before you write the map: "I will key on the running prefix sum, because a subarray sums to k exactly when two prefixes differ by k." Naming the key is naming the insight, and it is the sentence the interviewer is waiting for.""",
                    ),
                ],
                [
                    "Every O(n^2) inner search is a hash map away from O(n) — find the search and name the key.",
                    "Check the map before inserting in the complement pattern, or duplicate inputs break.",
                    "Prefix sums plus a count map handles subarray-sum problems that a sliding window cannot, including negatives.",
                    "Use an int array rather than a HashMap when the key space is small and bounded.",
                ],
                [
                    "How would you find two numbers summing to a target in one pass?",
                    "How do you count subarrays summing to k when values can be negative?",
                    "What key would you use to group anagrams, and what does it cost?",
                    "What is the worst-case complexity of a hash map operation?",
                ],
                ["pair-target", "anagram-bundles"],
            ),
            DL(
                "hashmap-internals",
                "HashMap Internals",
                "What Java actually does on put and get, and the equals/hashCode contract that keeps it correct.",
                13,
                "Interviewers use HashMap internals to check whether you understand the structure you reach for in every other problem. The questions are predictable — load factor, collisions, treeification, and the equals/hashCode contract — and the answers connect directly to why a lookup can silently become O(n).",
                [
                    (
                        "Why It Matters",
                        """Three things go wrong in real code because of this material: a key whose `hashCode` is inconsistent with `equals` makes entries unfindable; a mutable key mutated after insertion is permanently lost; and a poor hash turns an O(1) map into an O(n) list.

It is also one of the few places where an interviewer can quickly distinguish someone who has read the source from someone who has only used the API.""",
                    ),
                    (
                        "Mental Model",
                        """An array of buckets, each holding entries whose keys hash to that index.

hash(key) -> bucket index -> search the bucket for an equal key

- The table length is always a power of two, so the index is computed with a bitmask rather than a modulo.
- Java spreads the hash (`h ^ (h >>> 16)`) so that high bits influence the low-order index bits, which matters because the mask keeps only low bits.
- Within a bucket, entries form a linked list; once a bucket exceeds a threshold the list becomes a red-black tree.""",
                    ),
                    (
                        "How It Works",
                        """### put, step by step

1. Compute `hash = spread(key.hashCode())`.
2. Compute `index = hash & (table.length - 1)`.
3. If the bucket is empty, place the entry.
4. Otherwise walk the bucket comparing `hash` first, then `equals`. A matching key replaces the value.
5. If no match, append. If the bucket now holds 8 or more entries and the table is at least 64 long, treeify that bucket.
6. If `size > capacity * loadFactor`, resize to double and redistribute.

### get, step by step

1. Same hash and index computation.
2. Walk the bucket, comparing `hash` then `equals`, and return the match.

Comparing the stored hash before calling `equals` is an important optimisation: `equals` can be expensive, and unequal hashes mean unequal keys.

### Load factor and resizing

The default load factor is 0.75, which is a deliberate trade between space and collision probability. Lower means more empty buckets and fewer collisions; higher means denser buckets and longer chains.

A resize allocates a new table of double the size and redistributes every entry. Because the capacity is a power of two, an entry either stays at index `i` or moves to `i + oldCapacity` — a single bit decides, which is why resizing is cheap per entry.

This makes `put` **amortised** O(1) with occasional O(n) operations. If you know the size in advance, `new HashMap<>(expectedSize / 0.75 + 1)` avoids the resizes entirely.

### Treeification

Since Java 8, a bucket with 8 or more entries converts to a red-black tree when the table has at least 64 slots, bounding worst-case lookup within a bucket at O(log n) instead of O(n). It reverts to a list if the bucket shrinks to 6.

This was added as a defence against hash-collision denial-of-service attacks on maps keyed by untrusted input. It is a safety net, not a substitute for a good hash.

### The equals and hashCode contract

```java
class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Point)) return false;
        Point p = (Point) o;
        return x == p.x && y == p.y;
    }

    @Override public int hashCode() {
        return Objects.hash(x, y);
    }
}
```

The rules:

- Equal objects **must** have equal hash codes. Violating this makes entries unfindable.
- Unequal objects **may** share a hash code — that is a collision, which is correct but slow.
- `hashCode` must be consistent while the object is in the map.

The last rule is why **mutable keys are dangerous**. Mutating a field used in `hashCode` after insertion changes the bucket the key would now map to, so the entry becomes unreachable — it is neither findable by `get` nor removable, yet it still occupies space and still appears during iteration.

```java
List<Integer> key = new ArrayList<>(List.of(1, 2));
Map<List<Integer>, String> map = new HashMap<>();
map.put(key, "value");
key.add(3);                  // hashCode has now changed
map.get(key);                // null - the entry is stranded
```

### The map family

| Implementation | Ordering | Operation cost | Notes |
| --- | --- | --- | --- |
| HashMap | None | Expected O(1) | The default |
| LinkedHashMap | Insertion or access order | Expected O(1) | Access order gives you an LRU cache |
| TreeMap | Sorted by key | O(log n) | Range queries: floorKey, ceilingKey, headMap |
| ConcurrentHashMap | None | Expected O(1) | Thread-safe with lock striping |
| EnumMap | Enum ordinal | O(1) | Array-backed, very fast |

`TreeMap` is worth remembering for interviews: when a problem needs "the closest key below x" or "all keys in a range", a HashMap cannot do it and a TreeMap does it in O(log n).

Null handling differs and is occasionally asked: `HashMap` permits one null key and null values; `TreeMap` rejects null keys (it must compare them); `ConcurrentHashMap` rejects both.""",
                    ),
                    (
                        "Example",
                        """"Why might a HashMap lookup be O(n)?"

A complete answer covers all three causes:

> "Three ways. First, a poor hash function — the extreme case is `hashCode` returning a constant, which puts every entry in one bucket, so lookups walk the whole chain. Java 8 treeifies large buckets, which bounds that at O(log n) once a bucket passes eight entries in a table of at least 64. Second, an adversary choosing colliding keys deliberately, which is the denial-of-service scenario treeification was added to defend against. Third, a single `put` triggering a resize is O(n) for that call, though it is amortised O(1) across all operations.

> And there is a correctness failure that looks like a performance one: if `hashCode` is inconsistent with `equals`, or a key is mutated after insertion, the entry is not slow to find — it is impossible to find."

That last paragraph is the part most candidates miss and the one interviewers most appreciate.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any frequency, seen-set, or grouping problem
- Caching computed results
- Deduplicating objects by a business key
- LRU caches via LinkedHashMap with access order
- Range and nearest-key queries via TreeMap""",
                    ),
                    (
                        "Trade-offs",
                        """- **HashMap versus TreeMap.** Expected O(1) with no ordering, versus O(log n) with sorted iteration and range queries.
- **Load factor.** Lower means fewer collisions and more memory; 0.75 is the standard compromise.
- **Pre-sizing.** Avoids rehashing at the cost of allocating up front. Worth it when the size is known and large.
- **Boxing.** `HashMap<Integer, Integer>` boxes every key and value. For dense integer keys, an `int[]` is dramatically cheaper.
- **Treeified buckets.** Better worst case, at the cost of requiring comparable keys or falling back to identity comparison.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Overriding `equals` without `hashCode`, or the reverse
- Using a mutable object as a key and mutating it afterwards
- Assuming HashMap iteration order is stable or meaningful
- Assuming `hashCode` is unique — it is a 32-bit value, collisions are expected
- Using `==` on boxed keys instead of `equals`
- Forgetting that `TreeMap` requires keys to be comparable and rejects null keys
- Treating HashMap as thread-safe""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What happens on a collision?"** — Entries chain in the bucket, compared by hash then equals; large buckets treeify to red-black trees.
- **"Why is the capacity a power of two?"** — The index becomes `hash & (length - 1)`, a single bitmask instead of a modulo, and resizing moves each entry by exactly one bit's worth of offset.
- **"What is the load factor and why 0.75?"** — The space-versus-collision trade; below it, collisions are rare, above it, chains grow.
- **"What breaks if hashCode always returns 1?"** — Everything lands in one bucket; correct but O(n), or O(log n) once treeified.
- **"Can you use an array as a key?"** — Not usefully: arrays use identity hashCode, so two equal-content arrays are different keys. Use a List or a String instead.
- **"How would you make this thread-safe?"** — `ConcurrentHashMap`, not `Collections.synchronizedMap`, and explain that the former uses per-bin locking rather than one global lock.""",
                    ),
                    (
                        "Mini Exercise",
                        """Predict the output or the bug in each:

1. A class overrides `equals` but not `hashCode`, and two equal instances are used as map keys.
2. A `List` used as a key, mutated after insertion, then looked up.
3. `new HashMap<>(1_000_000)` versus `new HashMap<>()` filled with a million entries — how many resizes each?
4. `map.get(new int[]{1, 2})` after `map.put(new int[]{1, 2}, "x")`.
5. Iterating a HashMap twice in the same JVM run and comparing the orders.

Number 4 returns null, because arrays do not override `hashCode` or `equals`, so each array instance is its own key. It is a bug people hit in real code, not just an interview curiosity.""",
                    ),
                    (
                        "Interview Tip",
                        """Walk `put` out loud in five steps — hash, index, bucket, equals, resize — then volunteer the equals/hashCode contract and the mutable-key hazard before being asked. Those two extras are what distinguish someone who understands the structure from someone who has memorised "it uses buckets".""",
                    ),
                ],
                [
                    "put: spread the hash, mask to a bucket, compare hash then equals, resize at load factor 0.75.",
                    "Equal objects must have equal hash codes, and a key mutated after insertion becomes permanently unreachable.",
                    "Treeified buckets bound a pathological bucket at O(log n) — a safety net, not a substitute for a good hash.",
                    "TreeMap is the answer when you need ordering, range queries, or nearest-key lookups.",
                ],
                [
                    "What happens when two keys collide?",
                    "Why must equals and hashCode be consistent?",
                    "Why is the table capacity always a power of two?",
                    "When would you use a TreeMap instead of a HashMap?",
                ],
                ["pair-target", "anagram-bundles"],
            ),
        ],
        roadmap_key="arrays-hashing",
        practice_tag="array",
    )


def _arrays_topic() -> dict:
    return _dsa_topic(
        "arrays",
        "Prefix Sums, Matrices, and In-Place Work",
        "Precomputation that turns range queries into O(1), and the grid problems that hide behind array indexing.",
        "EASY",
        4,
        [
            DL(
                "prefix-sums-and-ranges",
                "Prefix Sums and Difference Arrays",
                "Precompute once so every range query is O(1) — and the reverse trick for range updates.",
                13,
                "A prefix sum array stores the running total, so the sum of any range becomes a single subtraction. It is the cheapest precomputation in the toolkit, it turns a family of O(n) queries into O(1), and — combined with a hash map — it solves the subarray problems that sliding windows cannot.",
                [
                    (
                        "Why It Matters",
                        """Any problem asking about the sum of a range, repeatedly, is a prefix-sum problem. Without it, q queries over an array of length n cost O(n*q); with it, they cost O(n + q).

More importantly, prefix sums plus a hash map is the canonical answer to "count subarrays with property X" when the values can be negative — which is precisely where candidates reach for a sliding window and get it wrong.""",
                    ),
                    (
                        "Mental Model",
                        """Store the answer for every prefix, then take differences.

prefix[i] = sum of the first i elements

sum(i, j) = prefix[j + 1] - prefix[i]

Use a prefix array of length `n + 1` with `prefix[0] = 0`. The extra slot removes every off-by-one from the formula, which is why it is worth the one extra element.

> Memory cue: prefix sums answer range queries on a static array. Difference arrays apply range updates. They are inverses of each other.""",
                    ),
                    (
                        "How It Works",
                        """### Building and querying

```java
int[] prefix = new int[nums.length + 1];
for (int i = 0; i < nums.length; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
}

// Sum of nums[i..j] inclusive:
int rangeSum = prefix[j + 1] - prefix[i];
```

O(n) to build, O(1) per query, O(n) extra space.

### The prefix-sum plus hash map family

```java
// Longest subarray summing to k (values may be negative)
int longestSubarray(int[] nums, int k) {
    Map<Integer, Integer> firstIndex = new HashMap<>();
    firstIndex.put(0, -1);          // prefix 0 occurs before index 0
    int sum = 0, best = 0;
    for (int i = 0; i < nums.length; i++) {
        sum += nums[i];
        Integer j = firstIndex.get(sum - k);
        if (j != null) best = Math.max(best, i - j);
        firstIndex.putIfAbsent(sum, i);   // keep the EARLIEST index for longest
    }
    return best;
}
```

Two details that decide correctness:

- `putIfAbsent` keeps the earliest occurrence of each prefix, which is what maximises `i - j`. If you were counting subarrays instead, you would keep a count rather than an index.
- Seeding `(0, -1)` handles subarrays that start at index 0.

Variants built on the same skeleton:

| Problem | Key stored |
| --- | --- |
| Count subarrays summing to k | Count of each prefix sum |
| Longest subarray summing to k | Earliest index of each prefix sum |
| Subarray sum divisible by k | Earliest index of `sum % k` (normalise negatives) |
| Longest subarray with equal 0s and 1s | Treat 0 as -1, then longest sum-zero subarray |
| Contiguous subarray with equal counts of several values | A tuple of differences as the key |

The modulo variant has a trap worth knowing: in Java, `-3 % 5` is `-3`, not `2`. Normalise with `((sum % k) + k) % k` or the map lookups silently miss.

### Difference arrays: the inverse

When you must apply many range updates and read the array only at the end, invert the technique.

```java
// Apply updates [lo, hi] += val, then materialise the array
int[] applyUpdates(int n, int[][] updates) {
    int[] diff = new int[n + 1];
    for (int[] u : updates) {
        diff[u[0]] += u[2];
        diff[u[1] + 1] -= u[2];
    }
    int[] result = new int[n];
    int running = 0;
    for (int i = 0; i < n; i++) {
        running += diff[i];
        result[i] = running;
    }
    return result;
}
// O(n + u) instead of O(n * u)
```

This is the standard solution to "car pooling", "corporate flight bookings", and any problem where many intervals each add a value to a range. Recognising it saves a nested loop.

### Two-dimensional prefix sums

```java
// prefix[i+1][j+1] = sum of the rectangle from (0,0) to (i,j)
int[][] prefix = new int[rows + 1][cols + 1];
for (int i = 0; i < rows; i++)
    for (int j = 0; j < cols; j++)
        prefix[i + 1][j + 1] = grid[i][j]
            + prefix[i][j + 1] + prefix[i + 1][j] - prefix[i][j];

// Sum of the rectangle (r1,c1) to (r2,c2) inclusive:
int sum = prefix[r2 + 1][c2 + 1] - prefix[r1][c2 + 1]
        - prefix[r2 + 1][c1] + prefix[r1][c1];
```

The inclusion-exclusion — subtract the two overlapping strips, add back the corner counted twice — is the part to be able to explain rather than memorise.

### Other running aggregates

The same "carry a running value" idea extends beyond sums:

- **Running maximum or minimum** from the left and from the right, which solves trapping-rain-water style problems in O(n) with O(n) space.
- **Prefix products**, with the standard caution about zeros — the classic "product of array except self" uses prefix and suffix products to avoid division.
- **Prefix XOR**, where `xor(i, j) = prefixXor[j+1] ^ prefixXor[i]`, because XOR is its own inverse.""",
                    ),
                    (
                        "Example",
                        """"Product of array except self, without division, in O(n)."

```java
int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];

    result[0] = 1;
    for (int i = 1; i < n; i++) {
        result[i] = result[i - 1] * nums[i - 1];   // prefix products
    }

    int suffix = 1;
    for (int i = n - 1; i >= 0; i--) {
        result[i] *= suffix;                       // fold in suffix products
        suffix *= nums[i];
    }
    return result;
}
// O(n) time, O(1) extra space beyond the output
```

What to say: "Each answer is the product of everything to its left times everything to its right. I build the prefix products into the output array in one pass, then walk backwards carrying a running suffix product and multiply it in. That is two passes, O(n), and the only extra memory is a single variable — the output array does not count as auxiliary space since it is the required return value."

The division-based one-liner fails on zeros, and saying so unprompted is exactly the kind of edge-case awareness that scores.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Repeated range-sum queries on a static array
- Counting or measuring subarrays with a sum property, including negative values
- Many range updates followed by a single read, via a difference array
- Submatrix sums in grid problems
- Any "except self" or left-and-right aggregate problem""",
                    ),
                    (
                        "Trade-offs",
                        """- **Precompute versus compute on demand.** O(n) memory and a one-time O(n) build, in exchange for O(1) queries. Not worth it for a single query.
- **Static versus dynamic.** Prefix sums assume the array does not change. If updates interleave with queries, you need a Fenwick tree or segment tree at O(log n) per operation.
- **Prefix sums versus sliding window.** A window is O(1) space and only valid when the values are non-negative; prefix sums plus a map cost O(n) space and always work.
- **Overflow.** Sums of large arrays overflow `int`. Use `long` for prefix arrays when values can be large — a genuine correctness bug that interviewers do notice.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Off-by-one from using a length-n prefix array instead of n+1
- Forgetting to seed the map with prefix 0 before the loop
- Keeping the latest index instead of the earliest when maximising length
- Not normalising negative remainders when working modulo k
- Applying a sliding window to an array containing negatives
- Integer overflow on large sums
- Rebuilding the prefix array inside a loop, silently restoring O(n^2)""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if the array is updated between queries?"** — Prefix sums break; move to a Fenwick tree or segment tree for O(log n) updates and queries.
- **"What if the values can be negative?"** — Sliding windows are invalid; prefix sums with a hash map still work. This is the key discriminator.
- **"Can you do it in O(1) space?"** — Only if you do not need arbitrary range queries. For single-pass aggregates, carry running values instead.
- **"What about 2D?"** — Inclusion-exclusion, and be ready to derive the four-term formula rather than recite it.
- **"How would you handle overflow?"** — `long` accumulators, and mention it before being asked.""",
                    ),
                    (
                        "Mini Exercise",
                        """Solve each with prefix sums or a difference array, and state the complexity:

1. Answer q range-sum queries on a fixed array of length n.
2. Find the longest subarray with equal numbers of 0s and 1s.
3. Count subarrays whose sum is divisible by k.
4. Given n flights and bookings `[start, end, seats]`, produce the seats booked per flight.
5. Given a matrix, answer q submatrix-sum queries.
6. Find the pivot index where the left sum equals the right sum.

Number 2 is the transformation worth internalising: replacing every 0 with -1 turns "equal counts" into "sum equals zero", and a problem that looked like counting becomes a standard prefix-sum lookup.""",
                    ),
                    (
                        "Interview Tip",
                        """When a problem mentions ranges or subarrays, say prefix sums out loud as a candidate immediately, then check whether values can be negative — because that single question decides between a sliding window and a prefix-sum map, and getting it wrong is the most common failure in this whole family.""",
                    ),
                ],
                [
                    "Use a prefix array of length n+1 seeded with 0 so range sums have no off-by-one.",
                    "Prefix sums plus a hash map solves subarray-sum problems that sliding windows cannot, including negatives.",
                    "Difference arrays are the inverse: many range updates, then one materialising pass.",
                    "Prefix sums assume a static array; interleaved updates require a Fenwick or segment tree.",
                ],
                [
                    "How do you answer many range-sum queries efficiently?",
                    "How do you count subarrays summing to k when values may be negative?",
                    "What changes if the array is updated between queries?",
                    "How would you apply thousands of range updates efficiently?",
                ],
                ["missing-range-value", "valley-rain"],
            ),
            DL(
                "matrix-and-in-place",
                "Matrices, Simulation, and In-Place Transformations",
                "Grid traversal, boundary discipline, and the rotate-and-mark tricks that avoid extra space.",
                12,
                "Matrix problems are array problems with two indices and far more opportunities for off-by-one errors. They come up constantly because they are easy to state, hard to code carefully, and they reward candidates who set up their boundaries deliberately instead of improvising.",
                [
                    (
                        "Why It Matters",
                        """Grid problems test something the rest of the curriculum does not: whether you can write careful index-heavy code under time pressure without a bug. Spiral traversal, rotation, and matrix marking are all short problems where the difficulty is entirely in the boundaries.

They also form the substrate for grid BFS and DFS — islands, flood fill, shortest path in a maze — so the traversal conventions you learn here get reused constantly.""",
                    ),
                    (
                        "Mental Model",
                        """A matrix is an array of rows. `grid[r][c]` means row r, column c.

- `grid.length` is the number of rows; `grid[0].length` is the number of columns. Mixing them is the classic bug.
- Row-major traversal (`for r ... for c ...`) is the cache-friendly order.
- Neighbours are usually the four cardinal directions, sometimes eight.

```java
int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};   // up, down, left, right

for (int[] d : DIRS) {
    int nr = r + d[0], nc = c + d[1];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    // visit grid[nr][nc]
}
```

Writing the direction array once, with a single bounds check, eliminates the four copy-pasted if-statements where mistakes hide.""",
                    ),
                    (
                        "How It Works",
                        """### Rotation in place

Rotating a square matrix 90 degrees clockwise is transpose followed by reversing each row. The decomposition is the insight; the code is then trivially correct.

```java
void rotate(int[][] m) {
    int n = m.length;
    // transpose: swap across the main diagonal
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;
        }
    // reverse each row
    for (int[] row : m)
        for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) {
            int t = row[lo]; row[lo] = row[hi]; row[hi] = t;
        }
}
// O(n^2) time, O(1) extra space
```

Note `j = i + 1` in the transpose. Starting at `j = 0` swaps every pair twice and leaves the matrix unchanged — a bug that looks correct until you test it.

Counter-clockwise is transpose then reverse each *column*, or reverse rows then transpose. Being able to derive it rather than recall it is what you want.

### Spiral traversal

Maintain four boundaries and shrink them after each pass.

```java
List<Integer> spiralOrder(int[][] m) {
    List<Integer> out = new ArrayList<>();
    if (m.length == 0) return out;
    int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;

    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.add(m[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) out.add(m[r][right]);
        right--;
        if (top <= bottom) {                       // guard: row may be exhausted
            for (int c = right; c >= left; c--) out.add(m[bottom][c]);
            bottom--;
        }
        if (left <= right) {                       // guard: column may be exhausted
            for (int r = bottom; r >= top; r--) out.add(m[r][left]);
            left++;
        }
    }
    return out;
}
```

The two inner guards are the whole problem. Without them, a single-row or single-column matrix emits duplicates. Mention them out loud — it shows you tested mentally rather than pattern-matched.

### In-place marking

When a problem forbids extra space, the matrix itself can carry the marks.

```java
// Set entire row and column to zero wherever a zero appears - O(1) extra space
void setZeroes(int[][] m) {
    int rows = m.length, cols = m[0].length;
    boolean firstRowHasZero = false, firstColHasZero = false;

    for (int c = 0; c < cols; c++) if (m[0][c] == 0) firstRowHasZero = true;
    for (int r = 0; r < rows; r++) if (m[r][0] == 0) firstColHasZero = true;

    // use row 0 and column 0 as marker storage
    for (int r = 1; r < rows; r++)
        for (int c = 1; c < cols; c++)
            if (m[r][c] == 0) { m[r][0] = 0; m[0][c] = 0; }

    for (int r = 1; r < rows; r++)
        for (int c = 1; c < cols; c++)
            if (m[r][0] == 0 || m[0][c] == 0) m[r][c] = 0;

    if (firstRowHasZero) for (int c = 0; c < cols; c++) m[0][c] = 0;
    if (firstColHasZero) for (int r = 0; r < rows; r++) m[r][0] = 0;
}
```

The pattern generalises: encode extra information into the existing values. Other forms include negating a value to mark it visited, adding `n` to a value and reading `value % n` for the original, or using a sentinel that cannot occur naturally.

### Simulation problems

Some problems are simply "implement these rules carefully": game of life, rotating a queue, robot movement, spiral matrix generation. The technique is discipline rather than insight:

1. Write the rules down as a list before coding.
2. Decide whether updates are simultaneous or sequential — for game of life they are simultaneous, which is why you need the two-bit encoding trick or a copy.
3. Handle boundaries once, in a helper.
4. Trace a 3x3 example by hand.

For game of life in place, the standard trick is to store the next state in the second bit: `board[r][c] |= (nextState << 1)`, then shift everything right at the end. It is a clean example of encoding two states in one integer.""",
                    ),
                    (
                        "Example",
                        """"Search a matrix where each row is sorted left to right and each column is sorted top to bottom."

The naive approach is binary search per row at O(rows * log cols). There is a better one:

```java
boolean searchMatrix(int[][] m, int target) {
    int r = 0, c = m[0].length - 1;      // start at the top-right corner
    while (r < m.length && c >= 0) {
        if (m[r][c] == target) return true;
        if (m[r][c] > target) c--;       // this whole column is too large
        else r++;                        // this whole row is too small
    }
    return false;
}
// O(rows + cols) time, O(1) space
```

The insight to state: "From the top-right corner, moving left strictly decreases and moving down strictly increases, so each comparison eliminates an entire row or column. That gives O(m + n), better than binary searching each row. The bottom-left corner works identically; the other two corners do not, because both directions move the same way."

That last sentence is the one that shows you understand the property rather than the recipe.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Image and grid manipulation: rotate, transpose, flip
- Spiral, diagonal, and boustrophedon traversals
- Flood fill, islands, and grid shortest paths, which build on the neighbour pattern
- Simulation problems with explicit rules
- Any problem where the follow-up is "now without extra space" """,
                    ),
                    (
                        "Trade-offs",
                        """- **In-place marking versus a visited array.** O(1) space versus code that is far easier to read and does not mutate the caller's data. If mutation is not allowed, a `boolean[][]` is the honest answer.
- **Copying versus mutating.** A copy is one line and O(n^2) memory; in place is the harder, showier answer. Ask which the interviewer wants.
- **Direction array versus explicit checks.** The array is shorter and less error-prone; explicit checks are marginally faster and much easier to get wrong.
- **Recursion versus an explicit stack for grid DFS.** Recursion is cleaner; on a 1000x1000 grid it can overflow the stack, and saying so is a good observation.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Confusing `grid.length` with `grid[0].length`
- Assuming the matrix is square when it is rectangular
- Not handling an empty matrix or empty rows
- Transposing with `j = 0` instead of `j = i + 1`, undoing every swap
- Missing the guards in spiral traversal, producing duplicates on single-row inputs
- Mutating the grid while still reading the original values, when updates must be simultaneous
- Four copy-pasted neighbour checks with one typo in the third one""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do it in place?"** — Marking within the matrix, or the transpose-and-reverse decomposition. Confirm mutation is allowed first.
- **"What if the matrix is not square?"** — Rotation in place no longer works dimensionally; you need a new matrix.
- **"What if it is very large and sparse?"** — Store coordinates in a map or a list of occupied cells rather than a dense grid.
- **"How do you avoid revisiting cells?"** — A visited set, or marking in place, and note the trade.
- **"What is the complexity?"** — O(rows * cols) for a full traversal; say it in terms of both dimensions, not "O(n^2)", unless the matrix is square.""",
                    ),
                    (
                        "Mini Exercise",
                        """Implement each, in place where possible, and trace a 1x3 and a 3x1 input through it:

1. Rotate an n x n matrix 90 degrees clockwise.
2. Print the matrix in spiral order.
3. Set the whole row and column to zero wherever a zero appears.
4. Transpose a rectangular matrix.
5. Rotate the matrix 180 degrees.

The 1x3 and 3x1 traces are the point of the exercise. Degenerate single-row and single-column inputs break more matrix code than any other case, and building the habit of testing them costs nothing.""",
                    ),
                    (
                        "Interview Tip",
                        """Declare the direction array and a single `inBounds` helper before writing any grid logic. It takes fifteen seconds, removes the most common bug in the whole category, and makes the rest of your code short enough to read aloud.""",
                    ),
                ],
                [
                    "Rotation decomposes into transpose plus row reversal — derive it rather than memorising the index arithmetic.",
                    "A direction array plus one bounds check eliminates the copy-paste errors that dominate grid bugs.",
                    "In-place marking encodes extra state into existing values when O(1) space is required.",
                    "Always trace a single-row and single-column input; degenerate matrices break most first drafts.",
                ],
                [
                    "How do you rotate a matrix in place?",
                    "How do you traverse a matrix in spiral order without duplicating elements?",
                    "How would you mark visited cells without extra space?",
                    "How do you search a row-sorted and column-sorted matrix efficiently?",
                ],
            ),
        ],
        practice_tag="array",
    )


def _hashing_topic() -> dict:
    return _dsa_topic(
        "hashing",
        "Hashing Patterns",
        "Designing the key, and the set-based patterns that turn quadratic scans into linear ones.",
        "EASY",
        5,
        [
            DL(
                "choosing-a-hash-key",
                "Choosing a Hash Key",
                "The key defines what counts as 'the same thing' — get it right and the problem collapses.",
                12,
                "In almost every hash-map problem the algorithm is trivial and the key is the insight. Choosing a key means deciding what makes two inputs equivalent for this specific question, and then computing a canonical form that equivalent inputs share.",
                [
                    (
                        "Why It Matters",
                        """Given the right key, grouping anagrams is four lines. Given the wrong key, it is a nested loop comparing every pair of words. The code barely changes; the key changes everything.

Interviewers probe this directly with "why that key?" and with variations designed to break a lazy choice — Unicode instead of lowercase ASCII, very long strings, or a definition of equivalence that is subtler than it first appears.""",
                    ),
                    (
                        "Mental Model",
                        """A key is a canonical form: a deterministic representation that all equivalent inputs map to and no inequivalent ones do.

Equivalence → Canonical form → Key

Three properties a good key needs:

1. **Complete** — equivalent inputs always collide.
2. **Sound** — inequivalent inputs never collide (or collisions are handled).
3. **Cheap** — computing it costs less than the comparison it replaces.""",
                    ),
                    (
                        "How It Works",
                        """### Canonical forms by problem type

| Equivalence | Canonical key | Cost |
| --- | --- | --- |
| Anagrams | Sorted characters, or a 26-count signature | O(L log L) or O(L) |
| Same shape of island | Normalised list of relative coordinates | O(cells) |
| Same digits regardless of order | Sorted digit string | O(d log d) |
| Case and punctuation insensitive | Lowercased, stripped | O(L) |
| Same slope from a point | Reduced fraction `dy/gcd : dx/gcd` with a sign convention | O(1) |
| Equivalent word pattern | Index-of-first-occurrence encoding | O(L) |
| Same set of characters | A bitmask over the alphabet | O(L) |

The slope one is a useful example of a subtle canonical form: representing a slope as a double loses precision, so the correct key is the reduced fraction with a normalised sign — and interviewers ask that follow-up specifically.

### Composite keys

When equivalence depends on several fields, encode them together. In Java the options are a record, a `List`, or a string with a delimiter that cannot appear in the parts.

```java
// Group points by (row, col) diagonal identity
Map<Integer, List<int[]>> byDiagonal = new HashMap<>();
for (int[] p : points) {
    byDiagonal.computeIfAbsent(p[0] - p[1], k -> new ArrayList<>()).add(p);
}
```

For structured keys, prefer a record over string concatenation:

```java
record Cell(int row, int col) {}          // equals and hashCode generated
Map<Cell, Integer> distance = new HashMap<>();
```

String keys built by concatenation are a common source of bugs when a delimiter can appear in the data — `"ab" + "c"` and `"a" + "bc"` collide without a separator.

### Encoding to avoid collisions

When you must use a string key, make the encoding unambiguous:

```java
// Bad: "1,23" and "12,3" are distinguishable, but "" and null are not
String key = a + "," + b;

// Better for fixed-width numeric parts:
long key = (long) a * 1_000_003L + b;      // if b is bounded
```

Packing two bounded integers into a single `long` is a common and fast trick for grid coordinates, and it avoids allocation entirely.

### The pattern-encoding key

```java
// Do two strings follow the same pattern? "egg" and "add" do; "foo" and "bar" do not.
String canonical(String s) {
    Map<Character, Integer> firstSeen = new HashMap<>();
    StringBuilder sb = new StringBuilder();
    for (char c : s.toCharArray()) {
        firstSeen.putIfAbsent(c, firstSeen.size());
        sb.append(firstSeen.get(c)).append(',');
    }
    return sb.toString();
}
```

Encoding each character by the index at which it first appeared produces a key shared by all structurally identical strings. The same idea normalises island shapes, isomorphic sequences, and pattern-matching problems.

### When not to hash

- **Small bounded key space** — an `int[26]` or `int[128]` array is faster, allocation-free, and clearer than a map.
- **Ordering needed** — a `TreeMap` gives sorted iteration and nearest-key queries that a hash cannot.
- **Prefix queries** — a trie, not a hash of every prefix.
- **Ranges** — an interval tree or a sorted list with binary search.""",
                    ),
                    (
                        "Example",
                        """"Group all strings that are shifted versions of each other — `abc`, `bcd`, and `xyz` are one group because each letter shifts by the same amount."

The key is the sequence of gaps between consecutive characters, modulo 26:

```java
String shiftKey(String s) {
    StringBuilder sb = new StringBuilder();
    for (int i = 1; i < s.length(); i++) {
        int diff = (s.charAt(i) - s.charAt(i - 1) + 26) % 26;
        sb.append(diff).append(',');
    }
    return sb.toString();
}
```

The `+ 26` before the modulo is the detail that matters: `'a' - 'z'` is negative, and Java's `%` preserves the sign, so `az` and `ba` would get different keys without it. That single correction is the difference between a correct answer and one that fails on wraparound — and volunteering it is exactly the kind of care interviewers reward.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Grouping by a structural property rather than exact equality
- Deduplicating objects by a business identity
- Memoising a recursive function on a composite state
- Detecting repeats where equality is defined loosely""",
                    ),
                    (
                        "Trade-offs",
                        """- **Sorted key versus counting key.** Shorter code at O(L log L) versus O(L) with an alphabet assumption.
- **String key versus record.** Strings are universal and allocate and can collide through concatenation; records are typed, allocation-light, and need a class.
- **Packing into a long.** Fastest and allocation-free, valid only when the parts are bounded.
- **Hash versus array.** For a small dense key space, an array wins on every axis.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Concatenating key parts without a delimiter
- Using a double for a slope or ratio instead of a reduced fraction
- Forgetting to normalise negative values before a modulo
- Using a mutable object as a key
- Choosing a key that is more expensive to compute than the comparison it replaces
- Assuming lowercase ASCII when the input may be Unicode""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why that key?"** — One sentence tying the key to the equivalence: "sorted characters, because anagrams are exactly the strings with the same multiset of letters."
- **"What if the strings are very long?"** — The counting key is O(L) rather than O(L log L), and for a fixed alphabet the key itself is constant size.
- **"What if the alphabet is Unicode?"** — A 26-slot array no longer works; fall back to a map-based count or the sorted form.
- **"Could two different inputs produce the same key?"** — If yes, the key is unsound and you need to store and verify the full value.
- **"Can you avoid allocating a key per element?"** — Pack into a primitive when the parts are bounded.""",
                    ),
                    (
                        "Mini Exercise",
                        """Design the key for each:

1. Group words that are anagrams.
2. Group points that lie on the same line through the origin.
3. Group islands in a grid that have the same shape regardless of position.
4. Detect whether a Sudoku board is valid.
5. Find duplicate subtrees in a binary tree.
6. Group strings that are isomorphic to each other.

Number 5 is the most instructive: the key is a serialisation of the subtree that distinguishes structure, so it must encode nulls explicitly — `"1,2,#,#,#"` and `"1,#,2,#,#"` are different trees and must not collide.""",
                    ),
                    (
                        "Interview Tip",
                        """State the key and the reason in one breath before writing the map: "I will key on the sorted character array, because two words are anagrams exactly when their sorted forms are identical." That sentence is the solution; the code is bookkeeping.""",
                    ),
                ],
                [
                    "A key is a canonical form: complete, sound, and cheaper than the comparison it replaces.",
                    "Encode composite keys with a record or a packed long, never by naive string concatenation.",
                    "Normalise negatives before a modulo, and never use a floating-point ratio as a key.",
                    "For a small bounded key space, an array beats a hash map on speed, memory and clarity.",
                ],
                [
                    "What key would you use to group anagrams and why?",
                    "How do you build a key from several fields safely?",
                    "When is a hash map the wrong structure?",
                    "How would you key on a slope without floating-point error?",
                ],
                ["anagram-bundles"],
            ),
            DL(
                "hash-set-patterns",
                "Set Patterns and Deduplication",
                "Membership, cycle detection by state, and the problems where a set replaces a nested loop.",
                11,
                "A hash set answers one question in expected O(1): have I seen this before? That single capability removes the inner loop from a surprising number of problems, and knowing the standard shapes means recognising them within seconds rather than deriving them.",
                [
                    (
                        "Why It Matters",
                        """Candidates reach for sorting when a set would do, or use a `List` for membership and accidentally write O(n^2). The set patterns are short, they come up constantly, and each one has a specific trigger.

Sets also supply the cleanest solution to a family of problems that look unrelated — cycle detection in a sequence, deduplication with order preserved, and interval or window uniqueness.""",
                    ),
                    (
                        "Mental Model",
                        """Four shapes cover most set usage.

Seen → Required → Window → State

1. **Seen set** — detect repeats.
2. **Required set** — track what remains to be found.
3. **Window set** — membership within a bounded range, added and removed as the window slides.
4. **State set** — detect a cycle in an iterated process by remembering visited states.""",
                    ),
                    (
                        "How It Works",
                        """### Seen set

```java
boolean containsNearbyDuplicate(int[] nums, int k) {
    Set<Integer> window = new HashSet<>();
    for (int i = 0; i < nums.length; i++) {
        if (i > k) window.remove(nums[i - k - 1]);   // keep the window size bounded
        if (!window.add(nums[i])) return true;
        }
    return false;
}
// O(n) time, O(k) space
```

The eviction line is what makes it a *window* set rather than a plain seen set, and it is the bit candidates forget. Without it the answer is "are there any duplicates at all", which is a different question.

### Required set

```java
// Longest consecutive run, revisited as a set pattern
int longestConsecutive(int[] nums) {
    Set<Integer> set = new HashSet<>();
    for (int x : nums) set.add(x);
    int best = 0;
    for (int x : set) {
        if (set.contains(x - 1)) continue;          // not a run start
        int len = 1;
        while (set.contains(x + len)) len++;
        best = Math.max(best, len);
    }
    return best;
}
```

### State set for cycle detection

Any process that repeatedly transforms a value either terminates or enters a cycle. A set of seen states detects the cycle.

```java
boolean isHappy(int n) {
    Set<Integer> seen = new HashSet<>();
    while (n != 1 && seen.add(n)) {
        n = sumOfSquaredDigits(n);
    }
    return n == 1;
}
```

`seen.add(n)` returning false means we have been here before, so the loop exits. Combining the membership test and the insertion into one call is idiomatic and avoids the double-lookup bug.

The O(1)-space alternative is Floyd's cycle detection with a slow and fast pointer, which is the expected follow-up: "can you do it without extra space?"

### Set operations

```java
Set<Integer> a = new HashSet<>(listA);
Set<Integer> b = new HashSet<>(listB);

Set<Integer> intersection = new HashSet<>(a);
intersection.retainAll(b);

Set<Integer> union = new HashSet<>(a);
union.addAll(b);

Set<Integer> difference = new HashSet<>(a);
difference.removeAll(b);
```

All are O(size of the smaller set) when used sensibly. Building the smaller set first and iterating the larger is the efficient order, and mentioning it shows care.

### Deduplication with order preserved

```java
// LinkedHashSet keeps insertion order
List<String> deduped = new ArrayList<>(new LinkedHashSet<>(words));
```

A plain `HashSet` loses order, which silently breaks problems that require the first occurrence. `LinkedHashSet` costs a little more memory and removes the whole class of bug.

### Bitset as a set

When the universe is small integers, a `boolean[]` or a `long` bitmask is a faster set:

```java
// Are all characters in the string unique? Alphabet is lowercase a-z.
boolean allUnique(String s) {
    int mask = 0;
    for (char c : s.toCharArray()) {
        int bit = 1 << (c - 'a');
        if ((mask & bit) != 0) return false;
        mask |= bit;
    }
    return true;
}
// O(n) time, O(1) space
```

This is the O(1)-space answer to "check for duplicate characters without extra data structures", and it is the one interviewers are fishing for with that constraint.""",
                    ),
                    (
                        "Example",
                        """"Given two arrays, return their intersection with each element appearing as many times as it does in both."

The set answer is wrong here — the multiplicity requirement makes it a count problem:

```java
int[] intersect(int[] a, int[] b) {
    Map<Integer, Integer> counts = new HashMap<>();
    for (int x : a) counts.merge(x, 1, Integer::sum);

    List<Integer> out = new ArrayList<>();
    for (int x : b) {
        int remaining = counts.getOrDefault(x, 0);
        if (remaining > 0) {
            out.add(x);
            counts.put(x, remaining - 1);
        }
    }
    return out.stream().mapToInt(Integer::intValue).toArray();
}
// O(n + m) time, O(min(n, m)) space if you count the smaller array
```

What to say: "Because duplicates must be preserved, a set loses information — I need counts. I build the map from the smaller array to bound the memory, then walk the larger one decrementing. If both arrays were sorted, I could do it with two pointers and O(1) extra space, which is the better answer when the inputs are already sorted or too large to hold in memory."

The follow-up "what if they are sorted?" and "what if one array is on disk?" are standard, and both have that same two-pointer answer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Duplicate detection, globally or within a window
- Membership tests inside a loop, replacing a nested scan
- Cycle detection in an iterated numeric process
- Set algebra: intersection, union, difference
- Visited tracking in graph and grid traversal""",
                    ),
                    (
                        "Trade-offs",
                        """- **Set versus sort.** O(n) with O(n) memory versus O(n log n) with O(1) extra — and sorting additionally gives order for the follow-up.
- **HashSet versus LinkedHashSet.** Ordering costs a little memory and removes a whole class of ordering bug.
- **Set versus count map.** A set discards multiplicity; if duplicates matter, you need counts.
- **Bitmask versus HashSet.** Constant space and far faster, only valid for a small bounded universe.
- **Set versus Floyd's cycle detection.** O(n) memory and simple, versus O(1) memory and a trickier argument.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using a `List` for membership tests, silently creating O(n^2)
- Using a set when multiplicity matters
- Forgetting to evict from a window set, answering a different question
- Relying on `HashSet` iteration order
- Building the set from the larger collection when the smaller would bound memory
- Boxing overhead in hot loops where a `boolean[]` would do""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do it without extra space?"** — Sorting plus two pointers, or Floyd's cycle detection, or a bitmask for a small universe.
- **"What if the arrays are sorted?"** — Two pointers, O(1) extra space, and it streams.
- **"What if one input does not fit in memory?"** — Build the set from the smaller one and stream the larger; or hash-partition both and process partition by partition.
- **"What is the worst case?"** — O(n) per operation under adversarial hashing; expected O(1).
- **"Why not sort?"** — Sorting is O(n log n) and mutates; a set is O(n) if the memory is available.""",
                    ),
                    (
                        "Mini Exercise",
                        """Choose set, count map, bitmask, or sorting for each, and justify in one line:

1. Does the array contain any duplicate?
2. Does it contain a duplicate within distance k?
3. Return the elements common to two arrays, ignoring duplicates.
4. Return them preserving duplicate counts.
5. Does a string of lowercase letters have all unique characters, with O(1) space?
6. Does repeatedly summing squared digits of n reach 1?

Numbers 5 and 6 both have an O(1)-space answer that is not a set — a bitmask and Floyd's cycle detection respectively. Recognising when the set is the easy answer and something else is the *asked-for* answer is the point.""",
                    ),
                    (
                        "Interview Tip",
                        """Use `set.add(x)` as the membership test rather than `contains` then `add` — it is one lookup instead of two, it reads cleanly, and it removes the race-condition-shaped bug of checking and inserting separately.""",
                    ),
                ],
                [
                    "Four shapes cover most set usage: seen, required, sliding window, and visited state.",
                    "A set discards multiplicity — if duplicates matter, you need a count map.",
                    "A bitmask is the O(1)-space set when the universe is small and bounded.",
                    "`set.add(x)` returning false is the idiomatic one-lookup membership test.",
                ],
                [
                    "How do you detect duplicates within a distance k?",
                    "When is a set the wrong structure for an intersection problem?",
                    "How do you check for repeated characters with O(1) extra space?",
                    "How do you detect a cycle in an iterated numeric process?",
                ],
            ),
        ],
        practice_tag="hashmap",
    )


def _strings_topic() -> dict:
    return _dsa_topic(
        "strings",
        "Strings",
        "Character-level manipulation, Java's string performance traps, and the matching algorithms interviewers ask for by name.",
        "EASY",
        6,
        [
            DL(
                "strings-as-arrays",
                "Strings as Arrays of Characters",
                "Every array technique applies to strings — plus the character arithmetic that makes them concise.",
                12,
                "A string is a sequence of characters with random access by index, so two pointers, sliding windows, prefix techniques, and frequency counting all transfer directly. What is different is immutability, the small fixed alphabet that enables array-based counting, and the character arithmetic that keeps the code short.",
                [
                    (
                        "Why It Matters",
                        """String problems are the most common category in phone screens because they are easy to state and hard to get exactly right. The recurring failures are not algorithmic — they are forgetting case sensitivity, mishandling an empty string, or building a result with `+=` and turning a linear solution quadratic.

Strings are also where the alphabet assumption matters. `int[26]` is elegant and wrong the moment the input contains an uppercase letter or a space, and interviewers test that boundary deliberately.""",
                    ),
                    (
                        "Mental Model",
                        """Treat the string as `char[]` and reuse every array pattern.

| Technique | String form |
| --- | --- |
| Two pointers | Palindrome check, reverse in place |
| Sliding window | Longest substring with a property |
| Frequency map | Anagram, character counts |
| Prefix sums | Counting characters up to index i |
| Monotonic stack | Remove duplicate letters, valid parentheses |
| Hashing | Grouping by canonical form |

> Memory cue: "substring" means contiguous and points at a window; "subsequence" means order-preserving but not contiguous and usually points at dynamic programming. That one distinction decides the whole approach.""",
                    ),
                    (
                        "How It Works",
                        """### Character arithmetic

```java
char c = 'd';
int index = c - 'a';          // 3 - position in the lowercase alphabet
char back = (char) ('a' + 3); // 'd'

boolean isDigit  = c >= '0' && c <= '9';
int digitValue   = c - '0';
boolean isLetter = Character.isLetterOrDigit(c);
char lower       = Character.toLowerCase(c);
```

Counting with a fixed array is faster and clearer than a map when the alphabet is known:

```java
int[] counts = new int[26];
for (char c : s.toCharArray()) counts[c - 'a']++;
```

State the assumption out loud — "assuming lowercase ASCII" — because the interviewer may immediately relax it, and you want that to be a considered change rather than a bug.

### Two pointers on strings

```java
// Palindrome check ignoring non-alphanumerics and case
boolean isPalindrome(String s) {
    int lo = 0, hi = s.length() - 1;
    while (lo < hi) {
        while (lo < hi && !Character.isLetterOrDigit(s.charAt(lo))) lo++;
        while (lo < hi && !Character.isLetterOrDigit(s.charAt(hi))) hi--;
        if (Character.toLowerCase(s.charAt(lo)) != Character.toLowerCase(s.charAt(hi))) {
            return false;
        }
        lo++; hi--;
    }
    return true;
}
// O(n) time, O(1) space
```

The `lo < hi` guard inside the skip loops matters: without it, a string of only punctuation runs the pointer past the end.

### Expand around centre

The standard technique for palindromic substrings, and worth knowing because the DP alternative is slower and more code.

```java
String longestPalindrome(String s) {
    if (s.isEmpty()) return "";
    int start = 0, end = 0;
    for (int i = 0; i < s.length(); i++) {
        int odd = expand(s, i, i);        // odd-length centre
        int even = expand(s, i, i + 1);   // even-length centre
        int len = Math.max(odd, even);
        if (len > end - start) {
            start = i - (len - 1) / 2;
            end = i + len / 2;
        }
    }
    return s.substring(start, end + 1);
}

int expand(String s, int lo, int hi) {
    while (lo >= 0 && hi < s.length() && s.charAt(lo) == s.charAt(hi)) { lo--; hi++; }
    return hi - lo - 1;
}
// O(n^2) time, O(1) space
```

Handling both odd and even centres is the part candidates forget, and it silently fails on inputs like `"abba"`.

### Splitting and parsing

```java
String[] words = s.trim().split("\\s+");    // collapse runs of whitespace
```

`split` on a regex is convenient and slow in hot loops; a manual scan with indices is faster and is what you should write when the interviewer asks for no library help. Be aware that `split` with a trailing empty field drops it by default, which occasionally matters.

### Comparison and equality

```java
s1.equals(s2)              // value equality - O(min length)
s1 == s2                   // reference equality - almost never what you want
s1.equalsIgnoreCase(s2)
s1.compareTo(s2)           // lexicographic, negative/zero/positive
```

Beware: string literals are interned, so `==` sometimes appears to work. That makes the bug intermittent and hard to spot, which is why you should always use `equals`.""",
                    ),
                    (
                        "Example",
                        """"Determine whether two strings are anagrams of each other."

```java
boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;      // cheap early exit
    int[] counts = new int[26];
    for (int i = 0; i < s.length(); i++) {
        counts[s.charAt(i) - 'a']++;
        counts[t.charAt(i) - 'a']--;                 // one pass over both
    }
    for (int c : counts) if (c != 0) return false;
    return true;
}
// O(n) time, O(1) space - the array is a fixed 26 regardless of n
```

Two things to say: the length check first, because unequal lengths cannot be anagrams and it costs nothing; and that incrementing for one string while decrementing for the other needs only one loop rather than two maps and a comparison.

Then volunteer the constraint: "this assumes lowercase ASCII. For arbitrary Unicode I would use a `HashMap<Character, Integer>`, or a `Map<Integer, Integer>` keyed by code point if I need to handle characters outside the basic plane correctly."

That final sentence is the one that separates a complete answer from a textbook one.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Palindromes, anagrams, and character frequency problems
- Longest substring problems, which are sliding windows
- Parsing and tokenising input
- Canonical-form grouping
- Encoding and decoding problems""",
                    ),
                    (
                        "Trade-offs",
                        """- **Fixed array versus map for counts.** O(1) space and faster, against only working for a known small alphabet.
- **Sorting versus counting for anagram checks.** O(n log n) with no alphabet assumption, versus O(n) with one.
- **`charAt` versus `toCharArray`.** The array costs O(n) memory and avoids repeated bounds checks in tight loops; `charAt` is fine for most interview code.
- **Expand-around-centre versus DP for palindromes.** Both O(n^2) time, but the expansion uses O(1) space and the DP uses O(n^2).""",
                    ),
                    (
                        "Common Mistakes",
                        """- Assuming lowercase ASCII without saying so
- Forgetting the empty string and single-character cases
- Missing even-length centres in palindrome expansion
- Using `==` instead of `equals`
- Ignoring case or punctuation when the problem requires it, or handling them when it does not
- Confusing substring (contiguous) with subsequence (not contiguous)
- Building results with `+=` inside a loop""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if the string contains Unicode?"** — The 26-slot array breaks; use a map keyed by code point, and note that some characters occupy two `char` values.
- **"What if it is case insensitive?"** — Normalise once at the start rather than calling `toLowerCase` inside the loop.
- **"Can you do it in one pass?"** — Usually yes, by incrementing and decrementing the same counter array.
- **"What about very long strings?"** — Avoid `substring` in a loop, avoid `+=`, and consider streaming the input.
- **"Substring or subsequence?"** — Ask this before choosing a technique; it changes the answer completely.""",
                    ),
                    (
                        "Mini Exercise",
                        """Solve each with O(1) extra space where possible:

1. Reverse the words in a sentence, in place on a char array.
2. Check whether a string is a palindrome ignoring punctuation and case.
3. Find the first non-repeating character.
4. Determine whether one string is a rotation of another.
5. Compress a string so `aabcccccaaa` becomes `a2b1c5a3`, returning the original if the compression is not shorter.

Number 4 has an elegant one-liner: `s2` is a rotation of `s1` exactly when `s2` has the same length and `(s1 + s1).contains(s2)`. Interviewers like it because the insight is a single observation rather than an algorithm.""",
                    ),
                    (
                        "Interview Tip",
                        """State your alphabet assumption the moment you allocate a counting array: "I will use `int[26]` assuming lowercase English letters — tell me if the input can be wider and I will switch to a map." It converts a hidden bug into a stated design choice.""",
                    ),
                ],
                [
                    "Every array technique transfers to strings; the difference is immutability and the bounded alphabet.",
                    "Say your alphabet assumption out loud when you allocate a fixed counting array.",
                    "Palindrome expansion must handle both odd and even centres, and the skip loops need a `lo < hi` guard.",
                    "'Substring' means contiguous and suggests a window; 'subsequence' usually means dynamic programming.",
                ],
                [
                    "How do you check whether two strings are anagrams, and what does it assume?",
                    "How do you find the longest palindromic substring?",
                    "What changes if the input can contain Unicode?",
                    "What is the difference between a substring and a subsequence, and why does it matter?",
                ],
                ["anagram-bundles", "longest-unique-window"],
            ),
            DL(
                "string-building-java",
                "String Performance in Java",
                "Immutability, StringBuilder, and the accidental O(n^2) that appears in almost every first draft.",
                10,
                "Java strings are immutable, which makes them safe to share and expensive to build incrementally. Almost every candidate writes `result += c` inside a loop at least once, turning a linear algorithm quadratic without noticing. Knowing why, and knowing the alternatives, is a small amount of knowledge that prevents a visible mistake.",
                [
                    (
                        "Why It Matters",
                        """This is one of the few places where an interviewer can point at your code and say "that is O(n^2)" when you believed it was O(n). It is a correctness-of-analysis failure as much as a performance one, and it is entirely avoidable.

It also matters for the follow-up question: interviewers frequently ask "what is the complexity?" specifically after you have written a string-building loop, to see whether you noticed.""",
                    ),
                    (
                        "Mental Model",
                        """A `String` cannot change. Every operation that appears to modify one allocates a new one and copies.

Under the hood: `s += c` becomes `s = new StringBuilder(s).append(c).toString()`

So a loop of n appends copies 1, then 2, then 3, ... characters: O(n^2) total.

A `StringBuilder` holds a mutable `char[]` that doubles when full, so n appends are O(n) amortised in total.""",
                    ),
                    (
                        "How It Works",
                        """### The quadratic trap and its fix

```java
// O(n^2) - allocates and copies on every iteration
String result = "";
for (char c : chars) {
    result += c;
}

// O(n) - one growing buffer
StringBuilder sb = new StringBuilder();
for (char c : chars) {
    sb.append(c);
}
String result = sb.toString();
```

The compiler does optimise a single-expression concatenation like `a + b + c` into one `StringBuilder`, but it cannot do so across loop iterations — each iteration builds and discards its own. That is exactly why the loop case is the dangerous one.

### StringBuilder essentials

```java
StringBuilder sb = new StringBuilder();
sb.append("abc").append(42).append('x');   // chainable, accepts any type
sb.insert(0, "prefix");                     // O(n) - shifts everything
sb.deleteCharAt(sb.length() - 1);           // O(1) at the end - the common case
sb.setLength(sb.length() - 1);              // also O(1), useful for trailing separators
sb.reverse();
sb.setCharAt(0, 'A');
String out = sb.toString();                 // O(n) copy, do it once at the end
```

Two habits worth forming: pre-size with `new StringBuilder(expectedLength)` when the size is known, and use `setLength` to drop a trailing delimiter rather than building a conditional into the loop.

The backtracking idiom depends on `deleteCharAt` being cheap at the end:

```java
void backtrack(StringBuilder path, ...) {
    path.append(choice);
    backtrack(path, ...);
    path.deleteCharAt(path.length() - 1);   // undo - O(1)
}
```

This is why backtracking uses a single shared `StringBuilder` rather than a new string per call, and it is a meaningful constant-factor difference.

### substring, and what it copies

Since Java 7, `substring` copies the characters rather than sharing the original array. So it is O(k) for the resulting length, not O(1).

The consequence: calling `substring` inside a loop can be quadratic.

```java
// O(n^2) - each substring copies
for (int i = 0; i < s.length(); i++) {
    if (s.substring(i).startsWith(prefix)) { ... }
}

// O(n * p) - no copying
for (int i = 0; i < s.length(); i++) {
    if (s.startsWith(prefix, i)) { ... }
}
```

`startsWith(prefix, offset)` and `regionMatches` are the allocation-free alternatives, and knowing they exist is a small but real signal.

### String versus StringBuilder versus StringBuffer

| Type | Mutable | Thread-safe | Use |
| --- | --- | --- | --- |
| String | No | Inherently | Values, keys, returns |
| StringBuilder | Yes | No | Building in a single thread — the default |
| StringBuffer | Yes | Yes, synchronised | Legacy; almost never needed |

Use `StringBuilder` unless you genuinely share a builder across threads, which in interview code you never do.

### Other allocation traps

- `String.format` is convenient and comparatively slow; fine outside hot loops.
- `String.join` and `String.valueOf` are clear and efficient for their purposes.
- `s.toCharArray()` allocates a copy; `charAt` does not.
- Repeated `s.length()` inside a loop condition is free in practice (it is a field read), so do not obfuscate code to avoid it.
- Interning with `String.intern()` is rarely the right tool and can hurt; do not volunteer it as an optimisation.""",
                    ),
                    (
                        "Example",
                        """"Run-length encode a string: `aaabbc` becomes `a3b2c1`."

```java
String encode(String s) {
    if (s.isEmpty()) return "";
    StringBuilder sb = new StringBuilder(s.length());   // pre-sized
    int runStart = 0;
    for (int i = 1; i <= s.length(); i++) {
        if (i == s.length() || s.charAt(i) != s.charAt(runStart)) {
            sb.append(s.charAt(runStart)).append(i - runStart);
            runStart = i;
        }
    }
    return sb.toString();
}
// O(n) time, O(n) space for the output
```

The `i <= s.length()` with the `i == s.length()` guard is a deliberate choice: it flushes the final run inside the loop instead of duplicating the append after it. Sentinel-style loop bounds like this remove a whole class of "forgot the last group" bug, and explaining why you wrote it that way is a good use of ten seconds.

Then the complexity sentence: "O(n) time and O(n) space for the result. If I had built this with `+=` it would have been O(n^2), which is the reason for the StringBuilder."
""",
                    ),
                    (
                        "Common Use Cases",
                        """- Building any string result in a loop
- Backtracking paths, where append and remove must be cheap
- Serialising a tree or graph into a string key
- Parsing and reformatting input
- Joining with delimiters""",
                    ),
                    (
                        "Trade-offs",
                        """- **StringBuilder versus String concatenation.** Linear versus quadratic; there is no real trade, only a habit to form.
- **Pre-sizing.** Avoids internal copies at the cost of possibly over-allocating.
- **char[] versus StringBuilder.** A raw array is marginally faster and needs manual index management; the builder is clearer.
- **substring versus offset-based comparison.** Copying is simpler to read; `regionMatches` avoids the allocation in hot loops.
- **Immutability.** Costs allocations and buys safe sharing, cacheable hash codes, and usability as map keys.""",
                    ),
                    (
                        "Common Mistakes",
                        """- `result += c` inside a loop
- Calling `sb.toString()` inside the loop instead of once at the end
- `substring` inside a loop where an offset comparison would do
- Using `StringBuffer` out of habit
- `insert(0, ...)` in a loop, which is O(n) each time — build reversed and reverse once instead
- Claiming O(n) for a loop that concatenates strings""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What is the complexity of that loop?"** — If it concatenates, it is O(n^2). Notice before being asked.
- **"Why is String immutable?"** — Safe sharing across threads, a cacheable hash code so strings work well as map keys, and security for values like file paths that are validated once.
- **"How would you reverse a string?"** — `new StringBuilder(s).reverse().toString()`, or two pointers on a `char[]` for O(1) extra space beyond the array.
- **"How would you build this with no extra allocation?"** — A pre-sized `char[]` with a write index.
- **"Does substring copy?"** — Yes, since Java 7, so it is O(k) and can make a loop quadratic.""",
                    ),
                    (
                        "Mini Exercise",
                        """Find the complexity problem in each and fix it:

1. `for (String w : words) out += w + ",";`
2. `for (int i = 0; i < n; i++) if (s.substring(i, i + p.length()).equals(p)) count++;`
3. Building a reversed string with `sb.insert(0, c)` in a loop.
4. Calling `sb.toString().length()` inside a loop condition.
5. Joining a million strings with `String.format` per element.

Number 3 is the sneaky one: `insert(0, ...)` shifts the entire buffer on every call, so it is O(n^2) even though a StringBuilder is being used correctly in every other respect. Append and reverse once at the end instead.""",
                    ),
                    (
                        "Interview Tip",
                        """Reach for `StringBuilder` the moment you see yourself building a string in a loop, and say why in five words: "StringBuilder, so this stays linear." It pre-empts the complexity question and shows you know what the abstraction costs.""",
                    ),
                ],
                [
                    "String concatenation in a loop is O(n^2); StringBuilder makes it O(n) amortised.",
                    "`substring` copies since Java 7, so it can make a loop quadratic — use `startsWith(prefix, i)` or `regionMatches`.",
                    "`insert(0, ...)` is O(n) per call; append and reverse once instead.",
                    "Immutability buys safe sharing and cacheable hash codes, which is why Strings make good map keys.",
                ],
                [
                    "Why is building a string with += in a loop O(n^2)?",
                    "When would you use StringBuilder over String, and StringBuffer over either?",
                    "Does substring copy the characters, and why does it matter?",
                    "Why is String immutable in Java?",
                ],
            ),
            DL(
                "string-matching-algorithms",
                "String Matching: KMP, Rabin-Karp, and Palindromes",
                "The named algorithms interviewers ask for, at the depth they actually expect.",
                13,
                "Most string problems are solved with windows, counting, or two pointers. A small set require a named algorithm: finding a pattern in text without quadratic rescanning, comparing many substrings cheaply, or finding all palindromic substrings in linear time. Knowing what each one buys — and being able to explain the idea even if you cannot write it perfectly — is what interviewers are checking.",
                [
                    (
                        "Why It Matters",
                        """"Implement strStr" or "find all occurrences of a pattern" appears regularly, and the naive O(n*m) solution is accepted only until the interviewer asks whether you can do better. At that point, being able to explain KMP's idea in two sentences is worth far more than a half-remembered implementation.

Rolling hashes are also the enabling trick behind a family of problems — repeated substrings, longest duplicate substring, comparing subtrees — where they turn an O(L) comparison into O(1).""",
                    ),
                    (
                        "Mental Model",
                        """Naive matching rescans; the named algorithms avoid rescanning by remembering something.

| Algorithm | What it remembers | Complexity |
| --- | --- | --- |
| Naive | Nothing | O(n * m) |
| KMP | How much of the pattern's prefix is also a suffix | O(n + m) |
| Rabin-Karp | A rolling hash of the current window | O(n + m) expected |
| Z-algorithm | Longest match with the prefix at each position | O(n + m) |
| Manacher | Palindrome radii, reusing symmetry | O(n) |

For interviews: know KMP's idea and the failure function, know Rabin-Karp well enough to implement, and know that Manacher exists without needing to write it.""",
                    ),
                    (
                        "How It Works",
                        """### Why naive matching is wasteful

Matching `aaab` against `aaaaaaaab`, the naive approach matches three characters, fails on the fourth, then restarts one position later and re-matches the same characters. It re-reads text it has already seen.

KMP's insight: when a mismatch occurs after matching k characters, you already know those k characters. If the pattern's prefix of length k has a proper suffix that is also a prefix, you can resume from there instead of from zero — and you never move the text pointer backwards.

### The failure function

`lps[i]` is the length of the longest proper prefix of `pattern[0..i]` that is also a suffix of it.

```java
int[] buildLps(String p) {
    int[] lps = new int[p.length()];
    int len = 0;
    for (int i = 1; i < p.length(); ) {
        if (p.charAt(i) == p.charAt(len)) {
            lps[i++] = ++len;
        } else if (len > 0) {
            len = lps[len - 1];        // fall back within the pattern
        } else {
            lps[i++] = 0;
        }
    }
    return lps;
}
```

For `ababaca` the table is `[0,0,1,2,3,0,1]`. The interviewer usually wants to see that you can compute it for a small example by hand more than that you can write the loop from memory.

### KMP search

```java
int strStr(String text, String pattern) {
    if (pattern.isEmpty()) return 0;
    int[] lps = buildLps(pattern);
    int i = 0, j = 0;                       // i over text, j over pattern
    while (i < text.length()) {
        if (text.charAt(i) == pattern.charAt(j)) {
            i++; j++;
            if (j == pattern.length()) return i - j;
        } else if (j > 0) {
            j = lps[j - 1];                 // slide the pattern, do not move i
        } else {
            i++;
        }
    }
    return -1;
}
// O(n + m) time, O(m) space
```

The line that carries the algorithm: `j = lps[j - 1]`. The text index `i` never decreases, which is exactly why the total work is linear.

### Rabin-Karp and rolling hashes

Compare hashes instead of characters, updating the hash in O(1) as the window slides.

```java
int rabinKarp(String text, String pattern) {
    int n = text.length(), m = pattern.length();
    if (m > n) return -1;
    long base = 256, mod = 1_000_000_007L;

    long power = 1;                            // base^(m-1) % mod
    for (int i = 0; i < m - 1; i++) power = power * base % mod;

    long patternHash = 0, windowHash = 0;
    for (int i = 0; i < m; i++) {
        patternHash = (patternHash * base + pattern.charAt(i)) % mod;
        windowHash  = (windowHash  * base + text.charAt(i))    % mod;
    }

    for (int i = 0; i + m <= n; i++) {
        if (windowHash == patternHash && text.startsWith(pattern, i)) return i;
        if (i + m < n) {
            windowHash = (windowHash - text.charAt(i) * power % mod + mod) % mod;
            windowHash = (windowHash * base + text.charAt(i + m)) % mod;
        }
    }
    return -1;
}
// O(n + m) expected, O(n * m) worst case under hash collisions
```

Three details that decide correctness, and all three are things interviewers probe:

1. **Verify on a hash match.** Hashes collide; without the `startsWith` check the answer can be wrong.
2. **Use a large prime modulus** to keep collisions rare and avoid overflow.
3. **Add `mod` before the final modulo** when subtracting, because Java's `%` can produce a negative result.

Rolling hashes shine where KMP does not apply: comparing many substrings against each other, finding the longest duplicated substring by binary searching the length, or matching subtrees by serialising and hashing them.

### Palindromes in linear time

Expand-around-centre is O(n^2) and is what you should write. Manacher's algorithm achieves O(n) by reusing the radii already computed inside a known palindrome, mirroring around its centre.

The honest interview position: "Expand around centre is O(n^2) and is what I would write. Manacher's algorithm does it in O(n) by exploiting symmetry to avoid re-expanding regions already known to be palindromic. I would only reach for it if the constraints demanded linear time." That answer is complete; writing Manacher from memory is not expected.""",
                    ),
                    (
                        "Example",
                        """"Find the shortest palindrome you can make by adding characters only to the front of a string."

The insight is that this is a KMP problem in disguise: you need the longest palindromic *prefix*, and that is what the failure function of `s + "#" + reverse(s)` gives you.

```java
String shortestPalindrome(String s) {
    if (s.isEmpty()) return s;
    String rev = new StringBuilder(s).reverse().toString();
    String combined = s + "#" + rev;             // '#' prevents overlap
    int[] lps = buildLps(combined);
    int longestPalindromicPrefix = lps[combined.length() - 1];
    return rev.substring(0, s.length() - longestPalindromicPrefix) + s;
}
// O(n) time and space
```

The separator is the detail to explain: without `#`, the prefix-suffix match could span the boundary between the two copies and report a length longer than the string itself.

This problem is a good illustration of why KMP is worth understanding rather than memorising — the algorithm is not being used for searching at all, but for the property its failure function computes.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Substring search in large text
- Finding repeated or duplicated substrings
- Detecting whether a string is a rotation or repetition of another
- Comparing subtrees or sequences cheaply via hashing
- Palindrome partitioning and longest-palindrome problems""",
                    ),
                    (
                        "Trade-offs",
                        """- **KMP versus naive.** Guaranteed linear versus much simpler code; for short patterns and short text, naive is fine and you should say so.
- **Rabin-Karp versus KMP.** Rolling hashes generalise to multiple patterns and to comparing arbitrary substrings; KMP has no collision risk.
- **Hash collisions.** Expected linear degrades to quadratic in the worst case; verification on match restores correctness at a small cost.
- **Manacher versus expand-around-centre.** Linear versus quadratic, at a large cost in implementation risk under interview pressure.
- **Library versus hand-rolled.** `indexOf` is usually the right production answer; interviewers asking you to implement it want the algorithm.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Forgetting to verify a Rabin-Karp hash match against the actual characters
- Negative hash values from Java's `%` on a subtraction
- Overflow from using `int` for hash arithmetic instead of `long`
- Moving the text pointer backwards in KMP, which destroys the linear bound
- Omitting the separator when concatenating a string with its reverse
- Reaching for KMP when a sliding window or `indexOf` is the appropriate answer""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you beat O(n*m)?"** — Yes, KMP or Rabin-Karp at O(n + m). Explain the idea before writing code.
- **"What does the failure function mean?"** — Longest proper prefix that is also a suffix, and it tells you where to resume after a mismatch.
- **"What if you must search for many patterns at once?"** — Aho-Corasick, which is KMP generalised to a trie; or Rabin-Karp with a set of pattern hashes.
- **"What is the worst case for Rabin-Karp?"** — O(n*m) when hashes collide constantly; mitigated by a large prime modulus and verification.
- **"How would you find the longest duplicated substring?"** — Binary search the length plus a rolling hash set, giving O(n log n) expected.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Compute the LPS table for `aabaaab` by hand.
2. Explain in two sentences why KMP never moves the text index backwards.
3. Implement Rabin-Karp and deliberately create a collision to show why verification is needed.
4. Use the failure function to determine whether a string is built by repeating a shorter substring.
5. Decide, for each: "does `s` contain `p`", "is `s` a rotation of `t`", "what is the longest substring appearing twice" — which technique applies.

Number 4 is a neat result worth knowing: a string of length n is a repetition of a shorter block exactly when `n % (n - lps[n-1]) == 0` and `lps[n-1] > 0`.""",
                    ),
                    (
                        "Interview Tip",
                        """Lead with the idea, not the implementation: "Naive matching rescans text it has already matched. KMP precomputes, for each prefix of the pattern, the longest proper prefix that is also a suffix, so after a mismatch it resumes inside the pattern without moving the text pointer back — that makes it O(n + m)." If the interviewer wants code after that, you have already earned the benefit of the doubt.""",
                    ),
                ],
                [
                    "KMP is linear because the text pointer never moves backwards; the failure function says where to resume in the pattern.",
                    "Rabin-Karp compares rolling hashes in O(1) per shift, and a hash match must always be verified against the characters.",
                    "Use `long` arithmetic, a large prime modulus, and add `mod` before a final modulo to avoid negatives.",
                    "Expand-around-centre is the palindrome answer to write; know that Manacher gives O(n) without needing to implement it.",
                ],
                [
                    "How do you find a pattern in text faster than O(n*m)?",
                    "What does the KMP failure function compute, and how is it used?",
                    "Why must a Rabin-Karp hash match be verified?",
                    "How would you find the longest substring that appears twice?",
                ],
            ),
        ],
        practice_tag="string",
    )


# ---------------------------------------------------------------------------
# Module 4 — Core techniques
# ---------------------------------------------------------------------------


def _two_pointers_topic() -> dict:
    return _dsa_topic(
        "two-pointers",
        "Two Pointers",
        "Converging pointers on sorted data, and fast/slow pointers for cycles and midpoints.",
        "EASY",
        7,
        [
            DL(
                "two-pointer-patterns",
                "Two Pointer Patterns",
                "Why sorted input plus two indices gives O(n) with no extra memory.",
                12,
                "Two pointers replaces a nested loop with a single pass by exploiting an ordering property: if you know moving one pointer can only increase a value and moving the other can only decrease it, you can eliminate half the search space with every comparison. It is the standard answer whenever an array is sorted and the question is about pairs.",
                [
                    (
                        "Why It Matters",
                        """It is the direct answer to "can you do it without extra space?" on problems where the hash-map solution costs O(n) memory. When the input is sorted — or you are allowed to sort it — two pointers gives O(n) time and O(1) space.

It is also the technique behind the classic follow-up ladder: two-sum becomes three-sum becomes four-sum, and each step is the same converging scan wrapped in one more loop.""",
                    ),
                    (
                        "Mental Model",
                        """Two indices moving under a rule that never revisits a discarded possibility.

| Variant | Start | Movement |
| --- | --- | --- |
| Converging | Both ends | Move the end that cannot be part of a better answer |
| Same direction | Both at 0 | One scans, one writes or trails |
| Fast and slow | Both at head | One moves twice as fast |
| Two sequences | One per array | Advance the smaller |

The converging variant needs sorted input. The others do not.

> Memory cue: the correctness argument is always "moving this pointer cannot lose a valid answer". If you cannot state that sentence, the technique does not apply.""",
                    ),
                    (
                        "How It Works",
                        """### Converging pointers

```java
// Two sum on a SORTED array - return indices of the pair summing to target
int[] twoSumSorted(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        int sum = a[lo] + a[hi];
        if (sum == target) return new int[] {lo, hi};
        if (sum < target) lo++;      // need a larger sum
        else hi--;                   // need a smaller sum
    }
    return new int[0];
}
// O(n) time, O(1) space
```

The correctness argument, which you should state: "If the sum is too small, no pair using `a[lo]` with anything at or below `hi` can reach the target, because `a[hi]` is the largest remaining value. So `lo` can be discarded safely." Every converging two-pointer proof has that shape.

### Three sum

```java
List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> out = new ArrayList<>();
    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;       // skip duplicate anchors
        if (nums[i] > 0) break;                              // no positive triple sums to 0
        int lo = i + 1, hi = nums.length - 1;
        while (lo < hi) {
            int sum = nums[i] + nums[lo] + nums[hi];
            if (sum < 0) lo++;
            else if (sum > 0) hi--;
            else {
                out.add(List.of(nums[i], nums[lo], nums[hi]));
                while (lo < hi && nums[lo] == nums[lo + 1]) lo++;   // skip dup lows
                while (lo < hi && nums[hi] == nums[hi - 1]) hi--;   // skip dup highs
                lo++; hi--;
            }
        }
    }
    return out;
}
// O(n^2) time, O(1) extra space beyond the output
```

The duplicate-skipping is the entire difficulty. Three separate skips are needed — the anchor, the low pointer, and the high pointer — and missing any one produces duplicate triples. Walking through why each is needed is a much better use of interview time than typing faster.

### Same-direction pointers

Already met as the write pointer. The general shape is one pointer reading and another marking a boundary:

```java
// Backspace string compare, walking from the end
boolean backspaceCompare(String s, String t) {
    int i = s.length() - 1, j = t.length() - 1;
    while (i >= 0 || j >= 0) {
        i = nextValid(s, i);
        j = nextValid(t, j);
        if (i >= 0 && j >= 0 && s.charAt(i) != t.charAt(j)) return false;
        if ((i >= 0) != (j >= 0)) return false;
        i--; j--;
    }
    return true;
}
```

Walking backwards is the trick that makes this O(1) space — forwards, you cannot know how many backspaces are coming.

### Merging two sequences

```java
// Merge two sorted arrays into a
void merge(int[] a, int m, int[] b, int n) {
    int i = m - 1, j = n - 1, write = m + n - 1;
    while (j >= 0) {
        a[write--] = (i >= 0 && a[i] > b[j]) ? a[i--] : b[j--];
    }
}
// O(m + n) time, O(1) space - filling from the back avoids overwriting
```

Filling from the back is the insight: writing forwards would overwrite elements of `a` that have not been merged yet.

### When two pointers does not apply

- The array is unsorted and sorting would destroy needed index information.
- The property is not monotone — moving a pointer might skip a valid answer.
- You need all pairs rather than one, and the output is inherently quadratic.""",
                    ),
                    (
                        "Example",
                        """"Container with most water: given heights, pick two lines forming the largest area."

```java
int maxArea(int[] height) {
    int lo = 0, hi = height.length - 1, best = 0;
    while (lo < hi) {
        best = Math.max(best, (hi - lo) * Math.min(height[lo], height[hi]));
        if (height[lo] < height[hi]) lo++;
        else hi--;
    }
    return best;
}
// O(n) time, O(1) space
```

The proof is the interesting part and it is what the interviewer wants: "The area is width times the minimum height. Moving the taller pointer inwards can only reduce the width and cannot increase the minimum, so it can never produce a better area. Moving the shorter one is the only move that might help, so discarding it loses nothing."

Note that this problem is *not* sorted, which makes it a good illustration that two pointers needs a monotone argument rather than sortedness specifically. Being able to articulate that distinction is a strong signal.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Pair, triplet, and quadruplet sums on sorted arrays
- Palindrome verification
- In-place removal, partitioning, and compaction
- Merging sorted sequences
- Container and trapping problems where a monotone argument exists""",
                    ),
                    (
                        "Trade-offs",
                        """- **Two pointers versus hash map.** O(1) space and requires sortedness; O(n) space and works unsorted. If the input is already sorted, two pointers is strictly better.
- **Sorting to enable it.** Costs O(n log n) and destroys original indices — fatal if the answer must be indices into the original array, which is why unsorted two-sum uses a map.
- **Converging versus same-direction.** Converging needs a monotone property; same-direction is a general scanning technique.
- **Readability.** Two-pointer code is compact and easy to get subtly wrong; narrate the invariant as you write it.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Applying converging pointers to unsorted data with no monotone argument
- Forgetting all three duplicate skips in three-sum
- `lo <= hi` instead of `lo < hi`, which pairs an element with itself
- Sorting when the answer must be original indices
- Moving both pointers when only one should move
- Merging forwards and overwriting unread elements""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why can you discard that element?"** — State the monotone argument explicitly. This is the question that distinguishes understanding from pattern matching.
- **"What if the array is not sorted?"** — Sort first at O(n log n), or use a hash map at O(n) time and space. Note the index issue.
- **"What about four-sum?"** — Another outer loop: O(n^3). Or hash all pairs for O(n^2) time and space.
- **"Can you avoid the extra space?"** — That is exactly what two pointers buys.
- **"What if there are duplicates?"** — Describe the skipping precisely; this is where most implementations break.""",
                    ),
                    (
                        "Mini Exercise",
                        """For each, decide two pointers or hash map, and state the monotone argument if you choose pointers:

1. Two numbers summing to target in a sorted array.
2. The same in an unsorted array, returning original indices.
3. Is a string a palindrome, ignoring punctuation.
4. Remove duplicates from a sorted array in place.
5. Container with most water.
6. Merge two sorted arrays in place, with room at the end of the first.
7. Three numbers summing to zero, no duplicate triples.

Number 2 is the one where two pointers is wrong: sorting loses the indices the problem asks for.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the invariant before you code: "I will move the pointer at the smaller value, because moving the other one cannot produce a better answer." That single sentence is the proof of correctness, and interviewers listen for it specifically.""",
                    ),
                ],
                [
                    "Two pointers needs a monotone argument, not necessarily sorted input — be able to say why a move loses nothing.",
                    "It gives O(1) space where the hash-map alternative costs O(n), which is why it answers 'without extra space'.",
                    "Three-sum needs three separate duplicate skips: the anchor and both pointers.",
                    "Sorting to enable two pointers destroys original indices, which is why unsorted two-sum uses a map.",
                ],
                [
                    "Why can you safely discard an element when the sum is too small?",
                    "When is a hash map better than two pointers for a pair-sum problem?",
                    "How do you avoid duplicate triples in three-sum?",
                    "Why does container-with-most-water work even though the input is unsorted?",
                ],
                ["widest-water-basin", "pair-target"],
            ),
            DL(
                "fast-slow-pointers",
                "Fast and Slow Pointers",
                "Cycle detection, midpoints, and nth-from-end — one traversal, constant memory.",
                11,
                "Running two pointers at different speeds through a sequence detects cycles, finds the midpoint, and locates the nth element from the end, all in one pass with O(1) memory. The technique applies to linked lists and to any function you can iterate, which is why it answers several problems that look unrelated.",
                [
                    (
                        "Why It Matters",
                        """Cycle detection in a linked list is one of the most frequently asked problems in the entire subject, and the follow-up — "now find where the cycle starts" — has a surprising answer that candidates either know or derive painfully.

More generally, whenever a problem says "without extra space" and involves a sequence you can only traverse forwards, fast and slow pointers is the technique being asked for.""",
                    ),
                    (
                        "Mental Model",
                        """Two pointers, one moving twice as fast. If there is a cycle, the fast one laps the slow one and they meet.

Advance slow one step → advance fast two steps → they meet inside the cycle

Three standard uses:

| Goal | Setup |
| --- | --- |
| Detect a cycle | They meet if and only if a cycle exists |
| Find the midpoint | When fast reaches the end, slow is at the middle |
| Find nth from the end | Advance fast n steps first, then move both |""",
                    ),
                    (
                        "How It Works",
                        """### Cycle detection

```java
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

The loop condition checks both `fast` and `fast.next` because the fast pointer takes two steps — omitting either check is a null-pointer exception on an even-length list, and it is the single most common bug in this problem.

Why they must meet: inside a cycle, the fast pointer gains one position on the slow pointer per iteration, so the gap shrinks by one each time and eventually reaches zero. It cannot jump over, precisely because the gain per step is exactly one.

### Finding the cycle start

The follow-up, and the result worth memorising:

```java
ListNode detectCycleStart(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            ListNode p = head;
            while (p != slow) { p = p.next; slow = slow.next; }
            return p;                      // the cycle entry
        }
    }
    return null;
}
```

The argument: let the distance from the head to the cycle entry be `a`, and from the entry to the meeting point be `b`, with cycle length `c`. When they meet, slow has travelled `a + b` and fast has travelled `2(a + b)`, and the difference is a whole number of laps, so `a + b = k*c`. Therefore `a = k*c - b`, which is exactly the distance from the meeting point back round to the entry. Walking one pointer from the head and one from the meeting point at the same speed makes them meet at the entry.

You do not need to reproduce the algebra under pressure, but knowing that the result follows from "the difference is a multiple of the cycle length" is enough to reconstruct it.

### Midpoint

```java
ListNode middle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;    // for even length, this is the SECOND middle node
}
```

Whether you get the first or second middle on an even-length list depends on the initialisation, and it matters for problems like "reorder list" and "palindrome linked list". Starting `fast` at `head.next` gives the first middle instead. Check which one the problem needs and say so.

### Nth from the end

```java
ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head);
    ListNode fast = dummy, slow = dummy;
    for (int i = 0; i < n; i++) fast = fast.next;      // create the gap
    while (fast.next != null) { fast = fast.next; slow = slow.next; }
    slow.next = slow.next.next;                        // slow is just before the target
    return dummy.next;
}
```

The dummy node removes the special case where the head itself is removed — a pattern worth using in nearly every linked-list modification problem.

### Beyond linked lists

The technique works on any iterated function, because "next" need not be a pointer:

```java
// Find the duplicate in an array of n+1 integers in the range 1..n,
// without modifying the array and with O(1) extra space.
int findDuplicate(int[] nums) {
    int slow = nums[0], fast = nums[0];
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow != fast);

    slow = nums[0];
    while (slow != fast) { slow = nums[slow]; fast = nums[fast]; }
    return slow;
}
// O(n) time, O(1) space
```

Treating the array as a function `i -> nums[i]` turns duplicate detection into cycle detection, because two indices pointing at the same value create a cycle entry. This is the constraint-driven answer to "no extra space and do not modify the input", and it is a genuinely elegant reduction worth being able to explain.""",
                    ),
                    (
                        "Example",
                        """"Determine whether a singly linked list is a palindrome, in O(1) extra space."

The pieces compose: find the midpoint with fast and slow, reverse the second half, compare, and optionally restore.

```java
boolean isPalindrome(ListNode head) {
    if (head == null || head.next == null) return true;

    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }                                     // slow is the end of the first half

    ListNode second = reverse(slow.next);
    ListNode p = head, q = second;
    boolean ok = true;
    while (q != null) {
        if (p.val != q.val) { ok = false; break; }
        p = p.next; q = q.next;
    }
    slow.next = reverse(second);          // restore the list
    return ok;
}
// O(n) time, O(1) space
```

What to say: "Fast and slow gives me the midpoint in one pass. I reverse the second half in place so I can compare inwards without extra memory, then reverse it back so I do not leave the caller's list mutated — that restoration is a courtesy the interviewer usually notices, and in production it would be required."

The alternative — copying values into an array and using two pointers — is O(n) space and perfectly acceptable if stated as a trade.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Cycle detection and finding the cycle entry
- Midpoint of a list, for splitting or reordering
- Nth node from the end
- Palindrome checks on linked lists
- Duplicate detection framed as a functional graph""",
                    ),
                    (
                        "Trade-offs",
                        """- **Fast/slow versus a hash set.** O(1) space versus a much simpler O(n)-space solution. If space is unconstrained, the set is easier to write correctly.
- **Mutating to solve.** Reversing half the list is O(1) space and changes the caller's data; restoring costs one more pass.
- **Two-speed versus counting.** Counting the length then walking halfway is two passes and is often clearer; interviewers usually accept it and then ask for the one-pass version.
- **Derivation risk.** The cycle-start result is easy to misremember; if unsure, say what you know and offer the hash-set solution as a correct fallback.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Not checking both `fast != null` and `fast.next != null`
- Returning the wrong middle on even-length lists
- Forgetting the dummy node when the head itself may be removed
- Starting both pointers at different nodes and breaking the meeting argument
- Reversing a list and leaving the caller's structure broken
- Assuming the meeting point is the cycle start — it is not""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Where does the cycle start?"** — Reset one pointer to the head and advance both one step at a time.
- **"How long is the cycle?"** — From the meeting point, walk round until you return to it, counting.
- **"Can you do it without extra space?"** — That is the whole point of the technique; the hash-set version is the O(n)-space alternative.
- **"What if the list is very long?"** — Still O(1) space; the concern would be traversal time, not memory.
- **"Prove they must meet."** — The gap closes by exactly one per iteration inside the cycle, so it cannot be skipped over.""",
                    ),
                    (
                        "Mini Exercise",
                        """Implement each with O(1) extra space:

1. Detect whether a linked list has a cycle.
2. Return the node where the cycle begins.
3. Return the length of the cycle.
4. Find the middle node, returning the first middle for even lengths.
5. Remove the nth node from the end in one pass.
6. Find the duplicate in an array of n+1 values in the range 1..n without modifying it.

Number 6 is the one that demonstrates the technique is about iterated functions rather than linked lists specifically — and it is a favourite follow-up precisely because the reduction is not obvious.""",
                    ),
                    (
                        "Interview Tip",
                        """Write the loop condition `while (fast != null && fast.next != null)` before anything else in the body. It is the line that everyone gets wrong under pressure, and writing it first means the rest of the code is written against a safe skeleton.""",
                    ),
                ],
                [
                    "Fast and slow pointers detect cycles, find midpoints and locate nth-from-end in one pass with O(1) space.",
                    "After they meet, resetting one pointer to the head and advancing both finds the cycle entry.",
                    "Always guard with `fast != null && fast.next != null` — the single most common bug here.",
                    "The technique applies to any iterated function, which is how array duplicate detection becomes cycle detection.",
                ],
                [
                    "How do you detect a cycle in a linked list without extra space?",
                    "How do you find the node where the cycle begins, and why does it work?",
                    "How do you find the middle of a list in one pass?",
                    "How would you find a duplicate in an array without modifying it or using extra space?",
                ],
                ["cycle-in-a-chain"],
            ),
        ],
        roadmap_key="two-pointers",
        practice_tag="two-pointers",
    )


def _sliding_window_topic() -> dict:
    return _dsa_topic(
        "sliding-window",
        "Sliding Window",
        "Contiguous subarray and substring problems, the two templates that solve almost all of them, and when the technique is invalid.",
        "MEDIUM",
        8,
        [
            DL(
                "fixed-and-variable-windows",
                "Fixed and Variable Windows",
                "Maintain a contiguous region and update it incrementally instead of recomputing.",
                13,
                "A sliding window keeps a contiguous range of the input together with a summary of its contents, updating that summary in O(1) as the range moves. It converts the O(n*k) recomputation of every window into a single O(n) pass, and it is the correct answer to almost every problem containing the words 'subarray' or 'substring'.",
                [
                    (
                        "Why It Matters",
                        """"Longest substring with ...", "smallest subarray such that ...", "maximum sum of k consecutive ..." — this family is enormous, and every member has the same two-pointer skeleton.

The technique is also where a specific and frequently-tested trap lives: the window argument depends on the summary being monotone as the window grows, which fails the moment values can be negative. Knowing exactly when a window is invalid is as valuable as knowing how to write one.""",
                    ),
                    (
                        "Mental Model",
                        """A range `[left, right]` plus a running summary, with two rules: when to expand and when to contract.

Expand right → update summary → while invalid, contract left → record answer

| Window type | Right moves | Left moves |
| --- | --- | --- |
| Fixed size k | Every step | Every step once the size reaches k |
| Longest valid | Every step | Only while the window is invalid |
| Shortest valid | Every step | While the window is still valid, recording as you go |

> Memory cue: for *longest*, record the answer after contracting. For *shortest*, record it while contracting. That one difference is the whole distinction between the two templates.""",
                    ),
                    (
                        "How It Works",
                        """:::viz sliding-window {"array": [2, 3, 1, 2, 4, 3], "target": 7}

### Fixed-size window

```java
// Maximum sum of any k consecutive elements
int maxSum(int[] nums, int k) {
    int sum = 0;
    for (int i = 0; i < k; i++) sum += nums[i];
    int best = sum;
    for (int right = k; right < nums.length; right++) {
        sum += nums[right] - nums[right - k];   // add the new, drop the old
        best = Math.max(best, sum);
    }
    return best;
}
// O(n) time, O(1) space
```

One line carries the technique: `sum += nums[right] - nums[right - k]`, an incremental update rather than a recomputation.

### Variable window: longest valid

```java
// Longest substring with no repeated characters
int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastSeen = new HashMap<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (lastSeen.containsKey(c) && lastSeen.get(c) >= left) {
            left = lastSeen.get(c) + 1;          // jump past the previous occurrence
        }
        lastSeen.put(c, right);
        best = Math.max(best, right - left + 1);
    }
    return best;
}
// O(n) time, O(min(n, alphabet)) space
```

The `>= left` check matters: a character seen before the current window started is not a conflict, and omitting the check shrinks the window incorrectly.

The same problem with the generic contract-until-valid template:

```java
int lengthOfLongestSubstring(String s) {
    int[] count = new int[128];
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        count[s.charAt(right)]++;
        while (count[s.charAt(right)] > 1) {     // invalid: duplicate present
            count[s.charAt(left++)]--;
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

The second version generalises better. Learn this shape, because swapping the validity condition solves the whole family.

### Variable window: shortest valid

```java
// Smallest subarray with sum at least target (positive values)
int minSubArrayLen(int target, int[] nums) {
    int left = 0, sum = 0, best = Integer.MAX_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {                  // still valid: try to shrink
            best = Math.min(best, right - left + 1);
            sum -= nums[left++];
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}
// O(n) time, O(1) space
```

Note where the answer is recorded — inside the contraction loop, because every valid window found while shrinking is a candidate.

### The at-most-K trick

A pattern worth knowing by name, because it converts "exactly K" into two easy problems:

exactly(K) = atMost(K) - atMost(K - 1)

```java
// Count subarrays with exactly K distinct integers
int subarraysWithKDistinct(int[] nums, int k) {
    return atMostK(nums, k) - atMostK(nums, k - 1);
}

int atMostK(int[] nums, int k) {
    Map<Integer, Integer> count = new HashMap<>();
    int left = 0, total = 0;
    for (int right = 0; right < nums.length; right++) {
        count.merge(nums[right], 1, Integer::sum);
        while (count.size() > k) {
            int x = nums[left++];
            if (count.merge(x, -1, Integer::sum) == 0) count.remove(x);
        }
        total += right - left + 1;               // all windows ending at right
    }
    return total;
}
```

`total += right - left + 1` counts every valid window ending at `right`, which is the counting idiom for windows. "Exactly K" is genuinely hard with a single window because the validity condition is not monotone; the subtraction makes it two monotone problems.

### When a sliding window is invalid

The window argument requires that extending right moves the summary monotonically in one direction, so that contracting left is guaranteed to restore validity.

That fails when:

- **Values can be negative** and the condition is about a sum. Adding an element might decrease the sum, so shrinking from the left is not guaranteed to help. Use prefix sums with a hash map instead.
- **The condition is not monotone** in window size — "exactly K" is the standard example, solved by the subtraction trick above.
- **The problem is about subsequences** rather than contiguous ranges. A window cannot skip elements.

This is the most valuable single thing in the lesson: recognising that "subarray sum equals k with negative values allowed" is a prefix-sum problem, not a window problem.""",
                    ),
                    (
                        "Example",
                        """"Find the minimum window in `s` that contains every character of `t`, including duplicates."

```java
String minWindow(String s, String t) {
    if (s.length() < t.length()) return "";
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;

    int missing = t.length();            // total characters still required
    int left = 0, bestLeft = 0, bestLen = Integer.MAX_VALUE;

    for (int right = 0; right < s.length(); right++) {
        if (need[s.charAt(right)]-- > 0) missing--;     // only counts if it was needed

        while (missing == 0) {                          // valid window, shrink it
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestLeft = left;
            }
            if (++need[s.charAt(left++)] > 0) missing++; // we gave up a needed char
        }
    }
    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestLeft, bestLeft + bestLen);
}
// O(n) time, O(1) space for a fixed alphabet
```

The elegance is in `need` going negative for surplus characters, so a single counter `missing` tracks validity without comparing two maps. Explaining that — "negative counts represent surplus, so I only adjust `missing` when crossing zero" — is the part that demonstrates understanding rather than recall.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Longest or shortest substring with a constraint
- Maximum or minimum over every window of fixed size k
- Counting subarrays satisfying a monotone property
- Anagram and permutation searches within a string
- Rate-limiting and streaming aggregates over a time window""",
                    ),
                    (
                        "Trade-offs",
                        """- **Window versus prefix sums.** O(1) space and requires monotonicity; O(n) space and works with negatives.
- **Jump-left versus contract-left.** Jumping is faster for the no-repeat case; contracting is the general template that handles every variant.
- **Array counter versus hash map.** Faster and O(1) space for a known alphabet, versus general.
- **Recomputing versus incremental.** Incremental is what makes it O(n); if the summary cannot be updated in O(1), the window may not help.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using a window on an array with negative values for a sum condition
- Recording the answer in the wrong place — after contraction for longest, during for shortest
- Forgetting to remove a key when its count reaches zero, so a `size()` check is wrong
- Off-by-one in the window length: it is `right - left + 1`
- Moving left unconditionally in a variable-size window
- Missing the `>= left` staleness check when jumping the left pointer""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if the values can be negative?"** — The window is invalid; switch to prefix sums with a hash map. This is the key test.
- **"Can you do it in one pass?"** — The templates already are; the total work is O(n) because each pointer only moves forwards.
- **"Why is it O(n) when there is a nested while loop?"** — `left` advances at most n times across the entire run, so the inner loop is amortised O(1). Volunteer this.
- **"How do you count exactly K?"** — `atMost(K) - atMost(K-1)`.
- **"What if the alphabet is Unicode?"** — Replace the fixed array with a hash map and note the space becomes O(distinct).""",
                    ),
                    (
                        "Mini Exercise",
                        """Decide window or prefix-sum for each, and if a window, whether it is fixed, longest, or shortest:

1. Maximum average of any k consecutive elements.
2. Longest substring with at most two distinct characters.
3. Smallest subarray with sum at least S, all values positive.
4. Count subarrays with sum exactly k, values may be negative.
5. Longest subarray with at most k zeros flipped to ones.
6. Number of substrings containing all three of a, b and c.

Number 4 is the trap: negatives make it a prefix-sum problem. Number 6 uses the counting idiom — for each right, add the number of valid left positions.""",
                    ),
                    (
                        "Interview Tip",
                        """Before writing a window, say the validity condition out loud and check it is monotone: "the window is invalid while it contains a duplicate, and adding a character can only create duplicates, so contracting from the left will always restore validity." If you cannot make that statement, the window is the wrong technique.""",
                    ),
                ],
                [
                    "Expand right, contract left while invalid — record the answer after contracting for longest, during for shortest.",
                    "The window is O(n) because each pointer only moves forwards; say the amortised argument before being asked.",
                    "Negative values break sum-based windows: use prefix sums with a hash map instead.",
                    "Count 'exactly K' as atMost(K) minus atMost(K-1), because exact conditions are not monotone.",
                ],
                [
                    "When is a sliding window invalid, and what replaces it?",
                    "Why is a window with a nested while loop still O(n)?",
                    "What is the difference between the longest-valid and shortest-valid templates?",
                    "How do you count subarrays with exactly K distinct values?",
                ],
                ["longest-unique-window"],
            ),
            DL(
                "sliding-window-advanced",
                "Windows with Structure: Deques and Ordered Maps",
                "When the window summary is not a simple counter — maximums, medians, and ordered queries.",
                11,
                "A basic window keeps a sum or a count, both updatable in O(1). Some problems need the window's maximum, its median, or its sorted contents — summaries that are not trivially updatable when an element leaves. Each has a standard structure that restores the O(1) or O(log k) per step, and knowing which to reach for is the lesson.",
                [
                    (
                        "Why It Matters",
                        """"Maximum in every window of size k" is a classic, and the naive O(n*k) answer is rejected immediately. The monotonic deque solution is O(n) and the argument for why is a small piece of amortised reasoning that interviewers like.

The broader skill is recognising that the window technique is parameterised by its summary structure: counter, deque, heap, or ordered map, chosen by what the question asks about the window.""",
                    ),
                    (
                        "Mental Model",
                        """Pick the structure by the query you must answer about the window.

| Window query | Structure | Cost per step |
| --- | --- | --- |
| Sum or count | Running value | O(1) |
| Distinct count | Hash map of counts | O(1) |
| Maximum or minimum | Monotonic deque | O(1) amortised |
| Median | Two heaps, or an ordered multiset | O(log k) |
| k-th smallest, or nearest value | TreeMap as a multiset | O(log k) |
| Any of several aggregates | Segment tree | O(log k) |""",
                    ),
                    (
                        "How It Works",
                        """### Monotonic deque for window maximum

Keep indices in a deque whose values are strictly decreasing. The front is always the maximum of the current window.

```java
int[] maxSlidingWindow(int[] nums, int k) {
    int[] out = new int[nums.length - k + 1];
    Deque<Integer> deque = new ArrayDeque<>();       // holds indices

    for (int i = 0; i < nums.length; i++) {
        // drop indices that have fallen out of the window
        if (!deque.isEmpty() && deque.peekFirst() <= i - k) deque.pollFirst();

        // drop values that can never be the maximum again
        while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) deque.pollLast();

        deque.offerLast(i);
        if (i >= k - 1) out[i - k + 1] = nums[deque.peekFirst()];
    }
    return out;
}
// O(n) time, O(k) space
```

Two invariants to state:

1. **Values in the deque are decreasing**, so the front is the maximum.
2. **An element smaller than the incoming one can never be the maximum again**, because the incoming element is both larger and stays in the window longer. That is why popping from the back loses nothing.

The complexity argument is amortised: each index is pushed once and popped once, so the total work is O(n) despite the inner while loop.

Storing indices rather than values is essential — you need the index to know when an element leaves the window.

### Two heaps for a window median

```java
// Sketch: maxHeap holds the smaller half, minHeap the larger half
PriorityQueue<Integer> low  = new PriorityQueue<>(Comparator.reverseOrder());
PriorityQueue<Integer> high = new PriorityQueue<>();
// after each insert: rebalance so low.size() == high.size() or low.size() == high.size() + 1
// median = low.peek(), or the average of the two peeks for even k
```

For a *sliding* median, the difficulty is removing an arbitrary element when it leaves the window, which a binary heap cannot do in O(log k). The standard fixes are lazy deletion — keep a map of elements pending removal and discard them when they surface at the top — or using a `TreeMap` as a multiset, where removal is O(log k) directly.

Being able to name that difficulty and its two fixes is the expected depth; a full implementation is rarely required.

### TreeMap as a multiset

When you need ordered queries over the window, `TreeMap<value, count>` gives you a multiset with O(log k) insert, remove, and nearest-key queries.

```java
TreeMap<Integer, Integer> window = new TreeMap<>();

void add(int x) { window.merge(x, 1, Integer::sum); }

void remove(int x) {
    if (window.merge(x, -1, Integer::sum) == 0) window.remove(x);
}

// queries:
int min = window.firstKey();
int max = window.lastKey();
Integer atLeast = window.ceilingKey(target);    // nearest value >= target
```

The remove-on-zero line is required; leaving zero-count entries breaks `firstKey`, `size`, and every other query. It is the most common bug with this pattern.

This structure solves "is there a pair within index distance k whose values differ by at most t" cleanly:

```java
boolean containsNearbyAlmostDuplicate(int[] nums, int k, int t) {
    TreeSet<Long> window = new TreeSet<>();
    for (int i = 0; i < nums.length; i++) {
        Long floor = window.floor((long) nums[i] + t);
        if (floor != null && floor >= (long) nums[i] - t) return true;
        window.add((long) nums[i]);
        if (window.size() > k) window.remove((long) nums[i - k]);
    }
    return false;
}
// O(n log k) time, O(k) space
```

The `long` casts prevent overflow when `nums[i] + t` exceeds the int range — a real edge case with adversarial inputs and a detail worth mentioning.

### Choosing the structure

Ask what the answer needs from the window:

- Only an aggregate that composes and decomposes (sum, count) — a running value.
- An extreme value — a monotonic deque.
- An order statistic — heaps or an ordered multiset.
- Arbitrary range queries — a segment tree, though this is rare in interviews.""",
                    ),
                    (
                        "Example",
                        """"Find the longest subarray where the difference between the maximum and minimum is at most `limit`."

This needs both the window maximum and the window minimum, so it uses two monotonic deques:

```java
int longestSubarray(int[] nums, int limit) {
    Deque<Integer> maxDq = new ArrayDeque<>();    // decreasing values
    Deque<Integer> minDq = new ArrayDeque<>();    // increasing values
    int left = 0, best = 0;

    for (int right = 0; right < nums.length; right++) {
        while (!maxDq.isEmpty() && nums[maxDq.peekLast()] < nums[right]) maxDq.pollLast();
        while (!minDq.isEmpty() && nums[minDq.peekLast()] > nums[right]) minDq.pollLast();
        maxDq.offerLast(right);
        minDq.offerLast(right);

        while (nums[maxDq.peekFirst()] - nums[minDq.peekFirst()] > limit) {
            if (maxDq.peekFirst() == left) maxDq.pollFirst();
            if (minDq.peekFirst() == left) minDq.pollFirst();
            left++;
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}
// O(n) time, O(n) space
```

What to say: "The validity condition is about the window's max minus its min, so I maintain both with monotonic deques. Contracting from the left evicts a deque front only when that front *is* the element leaving, which keeps both deques consistent with the window. Each index enters and leaves each deque once, so the whole thing is O(n)."

The detail that `left` only evicts the front when it matches is where implementations go wrong.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Maximum or minimum over every window of size k
- Windows constrained by a range of values rather than a count
- Streaming medians and percentiles
- Nearest-value queries within a recent window
- Any window where the summary cannot be updated by simple addition""",
                    ),
                    (
                        "Trade-offs",
                        """- **Deque versus heap for window maximum.** O(n) total versus O(n log k), and the heap needs lazy deletion to handle expiry.
- **TreeMap versus two heaps for medians.** Direct removal at O(log k) versus faster constants but awkward arbitrary deletion.
- **Storing indices versus values.** Indices are necessary for expiry; values alone are insufficient.
- **Segment tree.** General and powerful, and usually more machinery than an interview problem needs.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Storing values instead of indices in the deque, making expiry impossible
- Forgetting to evict the front when it leaves the window
- Using `<` instead of `<=` when popping equal values, which affects duplicate handling
- Leaving zero-count entries in a TreeMap multiset
- Integer overflow in range comparisons
- Claiming O(n*k) for the deque solution because of the inner while loop""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why is the deque solution O(n)?"** — Each index is pushed once and popped at most once; amortised O(1) per step.
- **"Why store indices?"** — To know when an element has fallen out of the window.
- **"What if you need the median instead of the maximum?"** — Two heaps with lazy deletion, or a TreeMap multiset at O(log k).
- **"What if elements can be removed from anywhere?"** — Heaps do not support that efficiently; use an ordered multiset.
- **"Could you use a heap here?"** — Yes at O(n log k), and explain why the deque is better.""",
                    ),
                    (
                        "Mini Exercise",
                        """Choose the structure for each window query:

1. Maximum of every window of size k.
2. Whether the window contains two values within t of each other.
3. The median of every window of size k.
4. The sum of every window of size k.
5. The number of distinct values in every window of size k.
6. The longest window where max minus min is at most a limit.

Then answer: for (1), why can you discard a smaller element when a larger one arrives, and why is that argument false for the *minimum* deque?""",
                    ),
                    (
                        "Interview Tip",
                        """When you introduce a deque, state both invariants immediately — "values decrease front to back, so the front is the window maximum" and "each index is pushed and popped once, so this is O(n)". Those two sentences pre-empt the correctness and the complexity questions together.""",
                    ),
                ],
                [
                    "Choose the window's summary structure by the query: running value, deque, heaps, or ordered multiset.",
                    "A monotonic deque gives window maximum in O(n) total because each index is pushed and popped once.",
                    "Store indices, not values, so you can evict elements that have left the window.",
                    "Heaps cannot remove arbitrary elements efficiently — use lazy deletion or a TreeMap multiset.",
                ],
                [
                    "How do you find the maximum in every window of size k in O(n)?",
                    "Why can you discard smaller elements from the back of the deque?",
                    "How would you maintain a sliding median?",
                    "When would you use a TreeMap instead of a heap for a window?",
                ],
            ),
        ],
        roadmap_key="sliding-window",
        practice_tag="sliding-window",
    )


def _stack_topic() -> dict:
    return _dsa_topic(
        "stack",
        "Stacks and Monotonic Stacks",
        "LIFO matching problems, and the monotonic stack that answers 'next greater element' in linear time.",
        "EASY",
        9,
        [
            DL(
                "stacks-and-matching",
                "Stacks and Matching",
                "When the most recent unresolved thing is the one you need — brackets, expressions, and undo.",
                12,
                "A stack gives O(1) push, pop, and peek at one end. Its interview value is that it naturally tracks the most recent unfinished item, which is exactly what matching, nesting, and evaluation problems need. If a problem involves nesting or 'the last one that has not been closed', the answer is a stack.",
                [
                    (
                        "Why It Matters",
                        """Bracket matching is one of the most common warm-up problems in the industry, and the family extends a long way: expression evaluation, path simplification, decoding nested strings, and the iterative form of any recursive traversal.

Stacks are also the bridge to understanding recursion, because the call stack is exactly this structure. Converting a recursive solution to an iterative one with an explicit stack is a standard follow-up when the interviewer raises stack-overflow risk.""",
                    ),
                    (
                        "Mental Model",
                        """The stack holds work that is started but not finished.

Push when something opens -> Pop when it closes -> Empty at the end means balanced

| Signal in the problem | Why a stack |
| --- | --- |
| Nested brackets, tags, or scopes | The innermost unclosed item is on top |
| "Undo the last operation" | LIFO is the definition of undo |
| Evaluate an expression | Operands and operators resolve innermost first |
| Simplify a path with `..` | Going up means popping |
| Iterative DFS | Replaces the call stack explicitly |

In Java, use `ArrayDeque` rather than the legacy `Stack` class: `Stack` extends `Vector` and is synchronised, so it is slower and its iteration order is bottom-to-top, which surprises people.

```java
Deque<Character> stack = new ArrayDeque<>();
stack.push(c);        // addFirst
stack.pop();          // removeFirst
stack.peek();         // peekFirst
stack.isEmpty();
```""",
                    ),
                    (
                        "How It Works",
                        """### Bracket matching

```java
boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        switch (c) {
            case '(' -> stack.push(')');      // push what we expect to see
            case '[' -> stack.push(']');
            case '{' -> stack.push('}');
            default -> {
                if (stack.isEmpty() || stack.pop() != c) return false;
            }
        }
    }
    return stack.isEmpty();
}
// O(n) time, O(n) space
```

Pushing the *expected closer* rather than the opener removes the mapping lookup and makes the comparison a single equality. The two checks that matter are `stack.isEmpty()` before popping — a closer with nothing open — and `stack.isEmpty()` at the end — openers never closed. Candidates routinely write one and forget the other.

### Expression evaluation

```java
// Evaluate a basic expression with + - * / and no parentheses
int calculate(String s) {
    Deque<Integer> stack = new ArrayDeque<>();
    int num = 0;
    char op = '+';                                  // operator preceding num
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (Character.isDigit(c)) num = num * 10 + (c - '0');
        if ((!Character.isDigit(c) && c != ' ') || i == s.length() - 1) {
            switch (op) {
                case '+' -> stack.push(num);
                case '-' -> stack.push(-num);
                case '*' -> stack.push(stack.pop() * num);
                case '/' -> stack.push(stack.pop() / num);
            }
            op = c;
            num = 0;
        }
    }
    int total = 0;
    for (int x : stack) total += x;
    return total;
}
```

The technique: defer addition and subtraction by pushing signed values, but apply multiplication and division immediately against the top of the stack, because they bind tighter. The `i == s.length() - 1` clause flushes the final number — a sentinel pattern that avoids duplicating the flush after the loop.

### Path simplification

```java
String simplifyPath(String path) {
    Deque<String> stack = new ArrayDeque<>();
    for (String part : path.split("/")) {
        if (part.isEmpty() || part.equals(".")) continue;
        if (part.equals("..")) stack.pollLast();       // going up; safe if empty
        else stack.offerLast(part);
    }
    return "/" + String.join("/", stack);
}
```

Using a deque from the back makes the final join trivially in order. `pollLast` on an empty deque returns null rather than throwing, which handles `/../` cleanly without a guard.

### Converting recursion to iteration

```java
// Iterative in-order traversal - the explicit form of the call stack
List<Integer> inorder(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode node = root;
    while (node != null || !stack.isEmpty()) {
        while (node != null) { stack.push(node); node = node.left; }
        node = stack.pop();
        out.add(node.val);
        node = node.right;
    }
    return out;
}
```

This is the answer to "what if the tree is 100,000 nodes deep and the recursion overflows?" — a follow-up that comes up specifically on degenerate trees.

### Two stacks, and a stack from queues

Classic design questions that test whether you understand the structures rather than the API:

- **Min stack** — keep a second stack of running minima, pushing the new minimum on every push. Every operation stays O(1). The space-efficient variant only pushes to the min stack when the value is less than or equal to the current minimum, and the `equal` case is the detail that matters for duplicates.
- **Queue from two stacks** — an input stack and an output stack; transfer only when the output stack is empty. Each element moves at most twice, so dequeue is amortised O(1). Stating the amortised argument is the point of the question.""",
                    ),
                    (
                        "Example",
                        """"Decode a string like `3[a2[c]]` into `accaccacc`."

```java
String decodeString(String s) {
    Deque<Integer> counts = new ArrayDeque<>();
    Deque<StringBuilder> parts = new ArrayDeque<>();
    StringBuilder current = new StringBuilder();
    int k = 0;

    for (char c : s.toCharArray()) {
        if (Character.isDigit(c)) {
            k = k * 10 + (c - '0');               // multi-digit counts
        } else if (c == '[') {
            counts.push(k);
            parts.push(current);
            current = new StringBuilder();
            k = 0;
        } else if (c == ']') {
            StringBuilder decoded = parts.pop();
            int repeat = counts.pop();
            for (int i = 0; i < repeat; i++) decoded.append(current);
            current = decoded;
        } else {
            current.append(c);
        }
    }
    return current.toString();
}
// O(output length) time
```

What to say: "Nesting means a stack. I push the pending count and the text accumulated so far when a bracket opens, then on close I pop them and repeat. Two parallel stacks keep it readable. The `k * 10 + digit` accumulation handles multi-digit repeat counts, which is the edge case a single-character parse would miss."

The multi-digit detail is the one interviewers add if you do not handle it.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Bracket, tag, and scope matching
- Expression parsing and evaluation
- Path and string simplification
- Iterative tree and graph traversal
- Undo and history features
- Backtracking state, where the stack is the path""",
                    ),
                    (
                        "Trade-offs",
                        """- **ArrayDeque versus Stack.** Faster, unsynchronised, and sane iteration order; `Stack` is legacy.
- **Explicit stack versus recursion.** Recursion is shorter and clearer; an explicit stack survives deep inputs and gives you control over the traversal order.
- **One stack versus two.** Parallel stacks are often clearer than packing several values into one entry.
- **Stack versus counter.** For a single bracket type, a counter is O(1) space; a stack is needed only when types can be interleaved. Mentioning that optimisation is a nice touch.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Popping without checking `isEmpty` first
- Forgetting to check the stack is empty at the end
- Using `java.util.Stack` and being surprised by iteration order
- Handling only single-digit numbers when parsing
- Losing the accumulated buffer when pushing a nested scope
- Not considering whether recursion depth is a risk on adversarial input""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if there is only one bracket type?"** — A counter suffices at O(1) space; increment on open, decrement on close, and fail if it ever goes negative.
- **"What if the input is a stream?"** — The stack approach already works incrementally, which is worth pointing out.
- **"Can you do this iteratively?"** — For tree problems, yes, with an explicit stack; describe why you would bother.
- **"How would you implement a min stack?"** — Auxiliary stack of minima, all operations O(1), with the equal-value detail.
- **"Why ArrayDeque and not Stack?"** — Synchronisation overhead and the confusing iteration order of the legacy class.""",
                    ),
                    (
                        "Mini Exercise",
                        """Solve with a stack, and state the empty-stack edge case for each:

1. Validate a string of `()[]{}`.
2. Evaluate reverse Polish notation.
3. Simplify a Unix path containing `.` and `..`.
4. Implement a stack that returns its minimum in O(1).
5. Remove all adjacent duplicate characters repeatedly.
6. Implement a queue using two stacks and prove the amortised O(1).

Number 5 is a nice one: push each character, and pop instead of pushing when it equals the top. The whole solution is four lines and the stack *is* the answer, not a helper.""",
                    ),
                    (
                        "Interview Tip",
                        """When you see nesting, say "this is a stack problem" immediately and then name what you will push. Naming the pushed value — the expected closing bracket, the pending count, the accumulated prefix — is where the actual design decision lives.""",
                    ),
                ],
                [
                    "A stack holds work that is started but unfinished, which is exactly what nesting problems need.",
                    "Push the expected closer rather than the opener, and check emptiness both before popping and at the end.",
                    "Use `ArrayDeque`, not the legacy synchronised `Stack` class.",
                    "An explicit stack is the answer when recursion depth on adversarial input is a risk.",
                ],
                [
                    "How do you validate nested brackets, and what are the two failure cases?",
                    "How would you implement a min stack with O(1) operations?",
                    "How do you convert a recursive traversal into an iterative one?",
                    "When is a counter enough instead of a stack?",
                ],
                ["balanced-brackets", "minimum-tracker-stack"],
            ),
            DL(
                "monotonic-stack",
                "Monotonic Stacks",
                "Next greater element, histogram spans, and the amortised argument that makes them linear.",
                13,
                "A monotonic stack keeps its contents sorted in one direction, popping anything that violates the order as new elements arrive. That single discipline answers a whole family of questions — for each element, what is the next larger value, or how far can it extend before something blocks it — in O(n) rather than O(n^2).",
                [
                    (
                        "Why It Matters",
                        """The trigger phrases are specific and worth memorising: "next greater", "previous smaller", "how far until", "largest rectangle", "span", "visible from the left". Every one of these is a monotonic stack, and the naive solution is quadratic.

It is also the technique where the complexity argument is most often misstated. Interviewers ask "that has a nested while loop — is it O(n^2)?" precisely to see whether you can give the amortised answer.""",
                    ),
                    (
                        "Mental Model",
                        """The stack holds elements still waiting for their answer.

New element arrives → pop everything it resolves → push it to wait

- **Decreasing stack** (values decrease from bottom to top): popping happens when a *larger* element arrives, so it answers "next greater".
- **Increasing stack**: popping happens when a *smaller* element arrives, so it answers "next smaller".

> Memory cue: the direction you pop in is the question you are answering. If a bigger element pops the stack, you are computing next-greater.""",
                    ),
                    (
                        "How It Works",
                        """### Next greater element

```java
int[] nextGreater(int[] nums) {
    int[] res = new int[nums.length];
    Arrays.fill(res, -1);
    Deque<Integer> stack = new ArrayDeque<>();     // indices, values decreasing

    for (int i = 0; i < nums.length; i++) {
        while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
            res[stack.pop()] = nums[i];            // i is the answer for that index
        }
        stack.push(i);
    }
    return res;                                     // unresolved indices keep -1
}
// O(n) time, O(n) space
```

The complexity sentence to deliver unprompted: "Each index is pushed exactly once and popped at most once, so although there is a nested while loop, the total number of pop operations across the whole run is bounded by n. That makes it O(n) amortised."

Storing indices rather than values is what lets you write the answer into the right slot and compute distances.

### Daily temperatures: distance instead of value

```java
int[] daysUntilWarmer(int[] temps) {
    int[] res = new int[temps.length];
    Deque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < temps.length; i++) {
        while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
            int j = stack.pop();
            res[j] = i - j;                        // distance, not value
        }
        stack.push(i);
    }
    return res;
}
```

Identical skeleton; only the value written changes. Recognising that these are the same problem is most of the benefit of learning the pattern.

### Circular arrays

When the array wraps, iterate twice and take indices modulo n, pushing only on the first pass:

```java
for (int i = 0; i < 2 * n; i++) {
    int idx = i % n;
    while (!stack.isEmpty() && nums[stack.peek()] < nums[idx]) res[stack.pop()] = nums[idx];
    if (i < n) stack.push(idx);
}
```

### Largest rectangle in a histogram

The hardest standard application, and the one worth practising because several problems reduce to it.

```java
int largestRectangleArea(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();     // increasing heights
    int best = 0;
    for (int i = 0; i <= heights.length; i++) {
        int h = (i == heights.length) ? 0 : heights[i];   // sentinel flushes the stack
        while (!stack.isEmpty() && heights[stack.peek()] > h) {
            int height = heights[stack.pop()];
            int left = stack.isEmpty() ? -1 : stack.peek();
            int width = i - left - 1;
            best = Math.max(best, height * width);
        }
        stack.push(i);
    }
    return best;
}
// O(n) time, O(n) space
```

The insight: when a bar is popped, the current index `i` is its first strictly smaller bar to the right, and the new stack top is its first smaller bar to the left. Those two boundaries define the widest rectangle of that height, so every bar gets its maximal rectangle considered exactly once.

Two implementation details:

- The trailing sentinel `h = 0` at `i == length` flushes the stack without duplicating the popping code after the loop.
- `width = i - left - 1` uses the *exclusive* boundaries, which is why `left` is the element below the popped one rather than the popped one itself.

The "maximal rectangle in a binary matrix" problem is this function applied to a running histogram per row, which is a satisfying reduction to mention.

### Trapping rain water

```java
int trap(int[] height) {
    Deque<Integer> stack = new ArrayDeque<>();     // decreasing heights
    int water = 0;
    for (int i = 0; i < height.length; i++) {
        while (!stack.isEmpty() && height[stack.peek()] < height[i]) {
            int bottom = stack.pop();
            if (stack.isEmpty()) break;            // no left wall
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

This fills water layer by layer horizontally. The two-pointer solution is O(1) space and generally preferred, so the good answer names both: "the stack version accumulates horizontally in O(n) space; two pointers does it in O(1) space by tracking the running left and right maxima, which is the better answer here."

### Recognising the pattern

Ask: for each element, do I need to find the nearest element on one side satisfying a comparison? If yes, it is a monotonic stack, and the only decisions are the direction of iteration and whether the stack increases or decreases.""",
                    ),
                    (
                        "Example",
                        """"Remove k digits from a number string to make the smallest possible result."

```java
String removeKdigits(String num, int k) {
    Deque<Character> stack = new ArrayDeque<>();   // increasing digits
    for (char c : num.toCharArray()) {
        while (k > 0 && !stack.isEmpty() && stack.peek() > c) {
            stack.pop(); k--;                      // a larger digit earlier is worse
        }
        stack.push(c);
    }
    while (k-- > 0) stack.pop();                   // still have removals to spend

    StringBuilder sb = new StringBuilder();
    Iterator<Character> it = stack.descendingIterator();
    while (it.hasNext()) sb.append(it.next());
    while (sb.length() > 1 && sb.charAt(0) == '0') sb.deleteCharAt(0);
    return sb.length() == 0 ? "0" : sb.toString();
}
// O(n) time, O(n) space
```

The greedy insight, which is what the interviewer wants: "a digit should be removed when a smaller digit follows it, because the leftmost digits dominate the value. Maintaining an increasing stack removes exactly those digits, and any removals left over come off the end where they do the least harm."

Then the edge cases: leading zeros must be stripped, and an empty result is `"0"`. Both are the kind of detail that turns a working solution into a correct one.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Next or previous greater or smaller element
- Days or distance until a condition is met
- Largest rectangle, maximal area, and span problems
- Trapping water
- Removing characters to build a lexicographically optimal result
- Stock span and visibility problems""",
                    ),
                    (
                        "Trade-offs",
                        """- **Monotonic stack versus two pointers.** For trapping water, two pointers is O(1) space; the stack generalises to more shapes.
- **Indices versus values on the stack.** Indices give you distances and boundaries; values alone are usually insufficient.
- **Strict versus non-strict comparison.** `<` and `<=` change duplicate handling. For "next strictly greater", pop on `<`; for "next greater or equal", pop on `<=`. Decide deliberately and say which.
- **Sentinel versus post-loop flush.** A sentinel removes duplicated code at the cost of a slightly odd loop bound.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Claiming O(n^2) because of the inner while loop
- Storing values instead of indices, losing the ability to compute widths
- Getting the boundary arithmetic wrong: it is `i - left - 1` with exclusive bounds
- Forgetting to flush the stack at the end, dropping the answers for unresolved elements
- Choosing the wrong monotonic direction for the question being asked
- Mishandling duplicates by using the wrong comparison operator""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Is that nested loop O(n^2)?"** — No: each index is pushed once and popped at most once, so O(n) total. Have this ready.
- **"Why store indices?"** — To compute distances and to identify the left boundary when popping.
- **"What about duplicates?"** — Depends on strict versus non-strict comparison; state the choice and its consequence.
- **"What if the array is circular?"** — Iterate 2n times with modulo indices, pushing only on the first pass.
- **"Can you do trapping water in O(1) space?"** — Yes, with two pointers and running maxima; explain why the stack version uses O(n).""",
                    ),
                    (
                        "Mini Exercise",
                        """For each, state the stack direction and what you store:

1. Next greater element for each position.
2. Number of days until a warmer temperature.
3. Largest rectangle in a histogram.
4. Trapping rain water.
5. Stock span: consecutive previous days with a price at most today's.
6. Remove duplicate letters so the result is the lexicographically smallest with each letter once.

Number 6 combines a monotonic stack with a "can I see this letter again later" check, which requires last-occurrence indices — a good illustration that the stack is a component rather than the whole solution.""",
                    ),
                    (
                        "Interview Tip",
                        """Volunteer the amortised argument the moment you write the inner while loop: "each index is pushed once and popped at most once, so this is O(n) despite the nested loop." It is the single question every interviewer asks about this pattern, and answering it before it is asked is a clear competence signal.""",
                    ),
                ],
                [
                    "The popping direction defines the question: a larger element popping the stack computes next-greater.",
                    "Each index is pushed once and popped once, so the nested while loop is still O(n) overall.",
                    "Store indices to recover widths and boundaries; the largest-rectangle width is `i - left - 1`.",
                    "Use a sentinel at the end to flush the stack rather than duplicating the pop logic after the loop.",
                ],
                [
                    "Why is a monotonic stack O(n) despite the inner while loop?",
                    "How would you compute the next greater element for every position?",
                    "How does the largest-rectangle algorithm identify each bar's boundaries?",
                    "How does the choice of strict versus non-strict comparison affect duplicates?",
                ],
                ["valley-rain"],
            ),
        ],
        roadmap_key="stack-queue",
        practice_tag="stack",
    )


def _queue_topic() -> dict:
    return _dsa_topic(
        "queue",
        "Queues and Deques",
        "FIFO processing, level-order traversal, and the double-ended queue that serves as stack, queue, and window.",
        "EASY",
        10,
        [
            DL(
                "queues-and-bfs",
                "Queues and Breadth-First Processing",
                "Why FIFO order gives you shortest paths and level-by-level structure.",
                12,
                "A queue processes items in the order they arrived. That single property is what makes breadth-first search explore a graph in order of distance, which is why BFS finds shortest paths in unweighted graphs and why level-order traversal falls out for free. Almost every interview use of a queue is a breadth-first process of some kind.",
                [
                    (
                        "Why It Matters",
                        """The moment a problem says "shortest", "fewest steps", "minimum number of moves", or "level by level", the answer involves a queue. Getting this association automatic saves the minutes you would otherwise spend deciding between BFS and DFS.

The level-size trick — processing a whole level at a time — is also a small piece of technique that makes a large family of tree and grid problems straightforward, and candidates who do not know it write much messier code.""",
                    ),
                    (
                        "Mental Model",
                        """First in, first out, which means nodes are dequeued in order of their distance from the source.

Enqueue the start -> dequeue, process, enqueue neighbours -> repeat

Because every edge has the same cost, the first time you reach a node is necessarily via a shortest path. That is the entire correctness argument for BFS, and it is worth being able to state.

In Java use `ArrayDeque` as the queue:

```java
Deque<Integer> queue = new ArrayDeque<>();
queue.offer(x);      // addLast
queue.poll();        // removeFirst, returns null when empty
queue.peek();        // peekFirst
```

`LinkedList` also implements `Queue` and is slower; `ArrayDeque` is the default choice.""",
                    ),
                    (
                        "How It Works",
                        """### Level-order traversal with the level-size trick

```java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> out = new ArrayList<>();
    if (root == null) return out;

    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int levelSize = queue.size();               // snapshot BEFORE adding children
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

Capturing `queue.size()` before the inner loop is the whole trick. Without it, the loop would consume children added during the same iteration and the levels would merge. Once you know it, "right side view", "zigzag traversal", "average per level", "maximum per level", and "minimum depth" are all variations of three lines.

### Grid BFS and shortest paths

```java
int shortestPath(char[][] grid, int[] start, int[] target) {
    int rows = grid.length, cols = grid[0].length;
    int[][] DIRS = {{-1,0},{1,0},{0,-1},{0,1}};
    boolean[][] visited = new boolean[rows][cols];

    Deque<int[]> queue = new ArrayDeque<>();
    queue.offer(start);
    visited[start[0]][start[1]] = true;
    int steps = 0;

    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        for (int i = 0; i < levelSize; i++) {
            int[] cell = queue.poll();
            if (cell[0] == target[0] && cell[1] == target[1]) return steps;
            for (int[] d : DIRS) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                if (visited[nr][nc] || grid[nr][nc] == '#') continue;
                visited[nr][nc] = true;             // mark on ENQUEUE, not dequeue
                queue.offer(new int[] {nr, nc});
            }
        }
        steps++;
    }
    return -1;
}
```

**Mark visited when enqueuing, not when dequeuing.** If you mark on dequeue, the same cell can be enqueued many times before it is first processed, and the queue can blow up to O(V*E) entries. This is the most consequential BFS bug and interviewers do look for it.

### Multi-source BFS

Seed the queue with every source at distance zero, and the BFS computes the distance to the *nearest* source for every cell in one pass.

```java
// Rotting oranges: every rotten orange starts the spread simultaneously
Deque<int[]> queue = new ArrayDeque<>();
for (int r = 0; r < rows; r++)
    for (int c = 0; c < cols; c++)
        if (grid[r][c] == ROTTEN) queue.offer(new int[] {r, c});
// then a normal level-by-level BFS, counting levels as minutes
```

This is a genuinely useful trick: problems like "distance to the nearest 0", "walls and gates", and "rotting oranges" are all one multi-source BFS rather than a BFS per source.

### Bidirectional BFS

When both the start and the target are known, searching from both ends and meeting in the middle roughly halves the explored depth, turning `b^d` into `2 * b^(d/2)`. It is the expected optimisation for word-ladder style problems and is worth naming even if you do not implement it.

### Monotonic deque, briefly

A deque supports adding and removing at both ends in O(1), which is what makes the sliding-window-maximum technique possible. That is covered in the sliding window module; the point here is that `ArrayDeque` is a single class that serves as stack, queue, and monotonic structure.""",
                    ),
                    (
                        "Example",
                        """"Given a rotting-oranges grid, return the number of minutes until no fresh orange remains, or -1 if some can never rot."

```java
int orangesRotting(int[][] grid) {
    int rows = grid.length, cols = grid[0].length, fresh = 0;
    Deque<int[]> queue = new ArrayDeque<>();

    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) queue.offer(new int[] {r, c});
            else if (grid[r][c] == 1) fresh++;
        }

    if (fresh == 0) return 0;                       // nothing to rot
    int[][] DIRS = {{-1,0},{1,0},{0,-1},{0,1}};
    int minutes = 0;

    while (!queue.isEmpty() && fresh > 0) {
        int levelSize = queue.size();
        for (int i = 0; i < levelSize; i++) {
            int[] cell = queue.poll();
            for (int[] d : DIRS) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                if (grid[nr][nc] != 1) continue;
                grid[nr][nc] = 2;                   // mark immediately
                fresh--;
                queue.offer(new int[] {nr, nc});
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}
// O(rows * cols) time and space
```

What to say: "Every rotten orange spreads simultaneously, so this is a multi-source BFS where each BFS level is one minute. I count the fresh oranges up front so I can tell at the end whether any were unreachable. The `fresh > 0` condition in the loop prevents counting an extra minute after the last orange rots — an off-by-one that is easy to miss."

That off-by-one is precisely the kind of thing testing would catch, and mentioning it demonstrates that you thought about termination rather than just the traversal.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Shortest path in an unweighted graph or grid
- Level-order traversal and every per-level tree question
- Multi-source spreading: infection, flooding, distance-to-nearest
- Word ladders and state-space search with uniform move cost
- Task scheduling in arrival order""",
                    ),
                    (
                        "Trade-offs",
                        """- **BFS versus DFS.** BFS gives shortest paths and uses memory proportional to the frontier width; DFS uses memory proportional to depth and does not give shortest paths.
- **Memory.** On a wide graph the BFS frontier can be enormous; on a deep one, DFS recursion can overflow. Choose by shape as well as by question.
- **Multi-source versus repeated single-source.** One pass versus one BFS per source — a factor of the number of sources.
- **Bidirectional BFS.** Large speedup for known targets, at the cost of more complex bookkeeping.
- **ArrayDeque versus LinkedList.** Better constants and locality; there is no reason to choose `LinkedList` here.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Marking visited on dequeue instead of enqueue, allowing duplicate enqueues
- Forgetting to snapshot `queue.size()` before processing a level
- Using BFS on a weighted graph, where it does not give shortest paths — that needs Dijkstra
- Counting one level too many at termination
- Using `LinkedList` for the queue out of habit
- Forgetting the empty-input case before the loop""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why does BFS give the shortest path?"** — All edges cost the same, so nodes are dequeued in non-decreasing distance order and the first arrival is optimal.
- **"What if edges have different weights?"** — BFS is wrong; use Dijkstra, or 0-1 BFS with a deque when weights are only 0 and 1.
- **"What is the space complexity?"** — O(width of the frontier), which for a grid is O(rows * cols) in the worst case.
- **"How do you handle multiple starting points?"** — Seed them all at distance zero.
- **"How would you speed it up when you know the target?"** — Bidirectional BFS, roughly halving the search depth.""",
                    ),
                    (
                        "Mini Exercise",
                        """Solve with BFS and state where you mark visited:

1. Level-order traversal of a binary tree.
2. Minimum depth of a binary tree.
3. Shortest path through a grid with walls.
4. Distance from every cell to the nearest zero.
5. Fewest perfect squares summing to n.
6. Word ladder: fewest single-letter changes from start to end using a dictionary.

Number 5 is the one that looks unlike a graph problem: the states are integers, the moves are "subtract a perfect square", and BFS finds the fewest moves. Recognising a state-space search in a numeric problem is the skill being built.""",
                    ),
                    (
                        "Interview Tip",
                        """Say "mark visited on enqueue" out loud as you write the line. It is the difference between an O(V + E) BFS and one that can enqueue the same node repeatedly, and volunteering it shows you have debugged this before.""",
                    ),
                ],
                [
                    "BFS gives shortest paths only because all edges cost the same — say that argument when asked.",
                    "Snapshot `queue.size()` to process one level at a time; it unlocks the whole family of per-level questions.",
                    "Mark nodes visited when enqueuing, never when dequeuing.",
                    "Seed the queue with every source for multi-source BFS, computing distance-to-nearest in one pass.",
                ],
                [
                    "Why does BFS find the shortest path in an unweighted graph?",
                    "How do you process a tree one level at a time?",
                    "Why must you mark visited on enqueue rather than dequeue?",
                    "What changes if the edges have different weights?",
                ],
                ["level-walk"],
            ),
            DL(
                "deque-and-queue-design",
                "Deques, Circular Buffers, and Queue Design",
                "Double-ended queues, ring buffers, and the design questions built on them.",
                10,
                "A deque supports insertion and removal at both ends in O(1), which makes it simultaneously a stack, a queue, and the backbone of sliding-window maximum. Circular buffers add a fixed capacity with wraparound, which is how bounded queues are implemented in practice and a common design question in its own right.",
                [
                    (
                        "Why It Matters",
                        """Beyond BFS, queues appear as explicit design questions: implement a circular queue, design a hit counter over a rolling window, build a queue from stacks, or build a moving average. These test whether you can reason about capacity, wraparound, and amortised cost rather than whether you know an algorithm.

The deque is also the single most versatile collection in Java for interview code, and knowing that one class covers three roles simplifies a lot of solutions.""",
                    ),
                    (
                        "Mental Model",
                        """A deque is a sequence with O(1) access at both ends and no access in the middle.

addFirst / removeFirst <-> addLast / removeLast

| Used as | Operations |
| --- | --- |
| Stack | `push` / `pop` (both at the front) |
| Queue | `offer` (back) / `poll` (front) |
| Monotonic window | `offerLast` / `pollLast` / `pollFirst` |
| Sliding history | Append at one end, expire at the other |

A circular buffer is a deque with fixed capacity implemented over an array, where indices wrap with modulo arithmetic.""",
                    ),
                    (
                        "How It Works",
                        """### Circular queue

```java
class CircularQueue {
    private final int[] data;
    private int head = 0, size = 0;

    CircularQueue(int capacity) { data = new int[capacity]; }

    boolean enqueue(int value) {
        if (size == data.length) return false;
        data[(head + size) % data.length] = value;
        size++;
        return true;
    }

    Integer dequeue() {
        if (size == 0) return null;
        int value = data[head];
        head = (head + 1) % data.length;
        size--;
        return value;
    }

    Integer front() { return size == 0 ? null : data[head]; }
    Integer rear()  { return size == 0 ? null : data[(head + size - 1) % data.length]; }
    boolean isEmpty() { return size == 0; }
    boolean isFull()  { return size == data.length; }
}
// All operations O(1), fixed O(capacity) space
```

The design decision worth explaining: tracking `head` and `size` rather than `head` and `tail`. With two indices, a full buffer and an empty buffer both satisfy `head == tail`, so you need either a wasted slot or a separate flag. Keeping `size` removes the ambiguity entirely and makes every method trivially correct.

### Moving average over a window

```java
class MovingAverage {
    private final int[] window;
    private int index = 0, count = 0;
    private double sum = 0;

    MovingAverage(int size) { window = new int[size]; }

    double next(int value) {
        sum -= window[index];              // remove the value leaving the window
        window[index] = value;
        sum += value;
        index = (index + 1) % window.length;
        count = Math.min(count + 1, window.length);
        return sum / count;
    }
}
// O(1) per call, O(size) space
```

Subtracting the outgoing value before overwriting is the whole technique, and it is the same incremental-update idea as the fixed sliding window.

A caution worth mentioning: repeatedly adding and subtracting doubles accumulates floating-point drift over millions of calls. For a long-running counter, keeping a running integer sum and dividing only on read avoids it.

### Hit counter over a rolling window

A classic design question: count hits in the last 300 seconds.

```java
class HitCounter {
    private final Deque<int[]> hits = new ArrayDeque<>();   // {timestamp, cumulativeCount}
    private int total = 0;

    void hit(int timestamp) {
        if (!hits.isEmpty() && hits.peekLast()[0] == timestamp) hits.peekLast()[1]++;
        else hits.offerLast(new int[] {timestamp, 1});
        total++;
        evict(timestamp);
    }

    int getHits(int timestamp) {
        evict(timestamp);
        return total;
    }

    private void evict(int now) {
        while (!hits.isEmpty() && hits.peekFirst()[0] <= now - 300) {
            total -= hits.pollFirst()[1];
        }
    }
}
```

The design points to raise: bucketing by timestamp keeps memory proportional to distinct seconds rather than to the number of hits, eviction is amortised O(1) because each bucket is removed once, and the follow-up "what if hits are out of order, or from many threads?" changes the structure to a fixed 300-slot array indexed by `timestamp % 300` with a stored timestamp per slot. That fixed-array variant is the answer interviewers usually want, and it is bounded in memory regardless of traffic.

### Queue from two stacks

```java
class QueueFromStacks {
    private final Deque<Integer> in = new ArrayDeque<>();
    private final Deque<Integer> out = new ArrayDeque<>();

    void push(int x) { in.push(x); }

    int pop() {
        transferIfNeeded();
        return out.pop();
    }

    int peek() {
        transferIfNeeded();
        return out.peek();
    }

    private void transferIfNeeded() {
        if (out.isEmpty()) {
            while (!in.isEmpty()) out.push(in.pop());
        }
    }
}
```

The amortised argument is the answer being tested: each element is pushed to `in` once, moved to `out` once, and popped once — three constant-time operations across its lifetime, so `pop` is amortised O(1) even though a single call can be O(n). Transferring only when `out` is empty is what preserves the ordering; transferring on every call would be both wrong and slow.""",
                    ),
                    (
                        "Example",
                        """"Design a data structure supporting `push`, `pop`, `top`, and retrieving the maximum, all in O(1)."

```java
class MaxStack {
    private final Deque<Integer> values = new ArrayDeque<>();
    private final Deque<Integer> maxima = new ArrayDeque<>();

    void push(int x) {
        values.push(x);
        maxima.push(maxima.isEmpty() ? x : Math.max(x, maxima.peek()));
    }

    int pop() {
        maxima.pop();
        return values.pop();
    }

    int top() { return values.peek(); }
    int max() { return maxima.peek(); }
}
// All operations O(1); O(n) extra space
```

What to say: "I keep a parallel stack whose top is always the maximum of everything currently in the main stack. Pushing stores the running maximum, so popping restores the previous one automatically. Every operation is O(1) at the cost of doubling the memory.

If memory mattered, I would only push to the auxiliary stack when the new value is greater than *or equal to* the current maximum, and pop from it only when the popped value equals the top. The `or equal to` is essential — with strict comparison, duplicates of the maximum are popped too early and the structure silently returns the wrong maximum."

Volunteering that duplicate subtlety is the difference between a correct answer and a nearly correct one.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Bounded buffers and producer-consumer queues
- Rolling-window aggregates: moving averages, rate counters, hit counters
- Undo and redo, using two deques
- Palindrome checking by comparing both ends
- Monotonic window structures""",
                    ),
                    (
                        "Trade-offs",
                        """- **Array-backed versus linked.** `ArrayDeque` has better locality and amortised growth; a linked deque has stable O(1) worst case per operation and worse constants.
- **Fixed capacity versus growable.** A ring buffer bounds memory and must define what happens when full: reject, block, or overwrite the oldest.
- **head/size versus head/tail.** Tracking size removes the full-versus-empty ambiguity for one extra field.
- **Bucketed versus per-event storage** in rolling counters: bucketing bounds memory by time resolution rather than by traffic.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using `head == tail` to mean both full and empty
- Forgetting modulo wraparound on one of the index updates
- Transferring between stacks on every operation instead of only when the output stack is empty
- Strict comparison in a max or min stack, breaking duplicate handling
- Unbounded growth in a rolling counter that stores one entry per event
- Accumulating floating-point drift in a long-running moving average""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why is dequeue amortised O(1) with two stacks?"** — Each element moves between stacks at most once in its lifetime.
- **"How do you distinguish full from empty in a ring buffer?"** — Track the size, or sacrifice one slot.
- **"What if the hit counter receives millions of hits per second?"** — Bucket by time unit; memory becomes proportional to the window length rather than to traffic.
- **"What if timestamps arrive out of order?"** — The deque assumption breaks; a fixed-slot array indexed by `timestamp % window` handles it.
- **"Can you make it thread-safe?"** — `ArrayBlockingQueue` or `ConcurrentLinkedQueue`, and note the difference between bounded blocking and unbounded lock-free.""",
                    ),
                    (
                        "Mini Exercise",
                        """Implement each and state the complexity of every operation:

1. A circular queue with a fixed capacity.
2. A moving average over the last k values.
3. A queue using two stacks.
4. A stack using two queues.
5. A hit counter over the last 300 seconds.
6. A max stack with O(1) maximum.

Number 4 is the mirror of number 3 and is instructive because the amortisation does *not* work out the same way: one of push or pop must be O(n), and being able to say which you chose and why is the answer.""",
                    ),
                    (
                        "Interview Tip",
                        """For any bounded-structure design question, state the capacity policy before writing code: "when the buffer is full, `enqueue` returns false rather than overwriting." Interviewers are watching for whether you notice that the policy is a decision rather than a detail.""",
                    ),
                ],
                [
                    "A deque is stack, queue and monotonic window in one class — prefer `ArrayDeque` throughout.",
                    "In a ring buffer, track head and size rather than head and tail to avoid the full-versus-empty ambiguity.",
                    "A queue from two stacks is amortised O(1) because each element transfers at most once.",
                    "Bucket rolling counters by time unit so memory scales with the window, not with traffic.",
                ],
                [
                    "How do you implement a circular queue, and how do you tell full from empty?",
                    "Why is dequeue amortised O(1) when building a queue from two stacks?",
                    "How would you design a hit counter for the last five minutes?",
                    "How do you keep the maximum of a stack available in O(1)?",
                ],
            ),
        ],
        practice_tag="queue",
    )


def _binary_search_topic() -> dict:
    return _dsa_topic(
        "binary-search",
        "Binary Search",
        "Boundary-finding templates that eliminate off-by-one bugs, and binary search on the answer — the highest-value pattern in the subject.",
        "MEDIUM",
        11,
        [
            DL(
                "search-on-ranges",
                "Binary Search and Boundaries",
                "One template that finds lower and upper bounds without ever getting the off-by-one wrong.",
                13,
                "Binary search halves the search space each step, giving O(log n). The algorithm is famously easy to describe and famously easy to get wrong: the loop condition, the midpoint update, and which half to discard interact in ways that produce infinite loops and off-by-one errors. The fix is to stop improvising and use one boundary-finding template.",
                [
                    (
                        "Why It Matters",
                        """Most real interview uses of binary search are not "find this exact value" — they are "find the first position where a condition becomes true". Insert position, first and last occurrence, the smallest element at least x, the rotation point: all of them are boundary problems, and all of them are the same three lines once you have the right template.

It is also, notoriously, a place where competent engineers write bugs under pressure. Having a template you trust converts a risky five minutes into a safe one.""",
                    ),
                    (
                        "Mental Model",
                        """Stop thinking "find the target". Think "find the boundary between false and true".

Imagine the array mapped through a predicate: `[F, F, F, T, T, T]`. Binary search finds the first `T`.

Predicate is monotone -> binary search finds the boundary

Every standard variant is a choice of predicate:

| Goal | Predicate |
| --- | --- |
| First index with `a[i] >= target` (lower bound) | `a[i] >= target` |
| First index with `a[i] > target` (upper bound) | `a[i] > target` |
| Insert position | Lower bound |
| First occurrence | Lower bound, then check equality |
| Last occurrence | Upper bound minus one |
| Count of target | Upper bound minus lower bound |

> Memory cue: if the predicate is not monotone — false then true, never flipping back — binary search does not apply.""",
                    ),
                    (
                        "How It Works",
                        """:::viz binary-search {"array": [1, 3, 4, 4, 4, 7, 9, 12, 15], "target": 4, "variant": "first"}

### The one template to memorise

```java
// Returns the first index in [0, n] where predicate(i) is true.
// If no index satisfies it, returns n.
int lowerBound(int[] a, int target) {
    int lo = 0, hi = a.length;            // hi is EXCLUSIVE
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] >= target) hi = mid;   // mid might be the answer, keep it
        else lo = mid + 1;                // mid is definitely not, discard it
    }
    return lo;                            // lo == hi == the boundary
}
```

Four properties make this template safe:

1. **Half-open range** `[lo, hi)` with `hi = a.length`, so the "not found" case lands naturally at `n`.
2. **`while (lo < hi)`**, so the loop ends when the range is empty.
3. **`hi = mid`** when `mid` might be the answer; **`lo = mid + 1`** when it definitely is not. The range always shrinks, so no infinite loop is possible.
4. **`lo + (hi - lo) / 2`** avoids overflow.

Once this is automatic, the variants are one-line changes:

```java
int upperBound(int[] a, int target) {
    int lo = 0, hi = a.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] > target) hi = mid;    // only change: > instead of >=
        else lo = mid + 1;
    }
    return lo;
}

int firstOccurrence(int[] a, int target) {
    int i = lowerBound(a, target);
    return (i < a.length && a[i] == target) ? i : -1;
}

int countOf(int[] a, int target) {
    return upperBound(a, target) - lowerBound(a, target);
}
```

### Exact-match search, when that is genuinely what you want

```java
int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;        // inclusive here
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

Note the different loop condition and the `- 1` updates. Mixing the two templates is the single most common source of bugs — pick one style per problem and stay in it.

### Rotated sorted arrays

The array is not globally sorted, but one half always is, which is enough.

```java
int searchRotated(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;

        if (a[lo] <= a[mid]) {                       // left half is sorted
            if (a[lo] <= target && target < a[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                     // right half is sorted
            if (a[mid] < target && target <= a[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}
```

The decision procedure to state: identify which half is sorted by comparing `a[lo]` to `a[mid]`, then check whether the target lies within that sorted half's range. If it does, search there; otherwise search the other half.

Duplicates break this — with `[1,1,1,0,1]`, `a[lo] == a[mid]` tells you nothing, and the worst case degrades to O(n) because you must shrink one step at a time. That degradation is a good follow-up answer.

### Finding the rotation point

```java
int findMin(int[] a) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] > a[hi]) lo = mid + 1;   // minimum is strictly right of mid
        else hi = mid;                      // mid could be the minimum
    }
    return a[lo];
}
```

Comparing against `a[hi]` rather than `a[lo]` is deliberate: comparing to the left endpoint fails on a non-rotated array, and this version handles it without a special case.

### Binary search on a 2D matrix

If each row is sorted and the first element of each row exceeds the last of the previous, treat the matrix as one flat sorted array:

```java
int index = lo + (hi - lo) / 2;
int value = matrix[index / cols][index % cols];
```

That index arithmetic is the whole trick, and it turns the problem into a plain binary search over `rows * cols` elements.""",
                    ),
                    (
                        "Example",
                        """"Find the first and last position of a target in a sorted array with duplicates."

```java
int[] searchRange(int[] nums, int target) {
    int first = lowerBound(nums, target);
    if (first == nums.length || nums[first] != target) return new int[] {-1, -1};
    int last = upperBound(nums, target) - 1;
    return new int[] {first, last};
}
// O(log n) time, O(1) space
```

What to say: "Rather than searching for the target and then scanning outwards — which is O(n) when the array is all one value — I run two boundary searches. The lower bound gives the first index at least as large as the target; if that element is not the target, it is absent. The upper bound gives the first index strictly greater, so one less is the last occurrence. Two O(log n) searches, no linear scan."

The all-duplicates input is the case that makes the scan-outwards approach fail its complexity requirement, and calling it out shows you thought about the worst case rather than the typical one.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Searching sorted arrays, and finding insert positions
- First or last occurrence, and counting occurrences
- Rotated arrays and peak finding
- Searching a sorted matrix
- Any `TreeMap`-style nearest-key query implemented over an array""",
                    ),
                    (
                        "Trade-offs",
                        """- **Half-open versus inclusive.** Half-open removes most off-by-one errors; inclusive is more familiar. Choose one and be consistent.
- **Iterative versus recursive.** Iterative is O(1) space and is what you should write; recursive is O(log n) stack and no clearer.
- **Binary search versus hash map.** O(log n) with no extra memory and requires order; O(1) expected with O(n) memory and no order.
- **Sorting to enable it.** Only worth it for repeated queries, since the sort itself is O(n log n).""",
                    ),
                    (
                        "Common Mistakes",
                        """- `(lo + hi) / 2` overflowing
- Mixing `lo <= hi` with `hi = mid`, causing an infinite loop
- Forgetting that the boundary result may equal the array length
- Scanning linearly after finding one occurrence, breaking the O(log n) claim
- Applying binary search to a non-monotone predicate
- Mishandling duplicates in rotated arrays and claiming O(log n) anyway""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if there are duplicates?"** — Boundary searches still work; rotated search degrades to O(n) in the worst case.
- **"What if the array is rotated?"** — Identify the sorted half and decide which side the target lies in.
- **"How do you find the insert position?"** — That is exactly the lower bound.
- **"How would you avoid the infinite loop?"** — The range must strictly shrink on every branch; `hi = mid` pairs with `lo < hi`, and `hi = mid - 1` pairs with `lo <= hi`.
- **"Can you do it recursively?"** — Yes, but it costs O(log n) stack for no benefit.""",
                    ),
                    (
                        "Mini Exercise",
                        """Implement each with the lower-bound template, and test on an empty array, a single element, all-equal elements, and a target outside the range:

1. Insert position for a target.
2. First occurrence of a target.
3. Last occurrence of a target.
4. Count of a target.
5. Smallest element strictly greater than a target.
6. Minimum of a rotated sorted array.
7. Peak element, where neighbours are strictly smaller.

Number 7 is worth noticing: the array is not sorted at all, yet binary search applies, because "is `a[mid] < a[mid+1]`" is a monotone-enough predicate to always point towards a peak. It is the bridge to the next lesson.""",
                    ),
                    (
                        "Interview Tip",
                        """Write the template's four lines first, then adjust the comparison for the specific question. Saying "I am going to find the first index where the predicate is true" frames every variant as the same problem, and it is much more convincing than deriving the bounds live.""",
                    ),
                ],
                [
                    "Think in boundaries, not targets: find the first index where a monotone predicate becomes true.",
                    "Use the half-open template with `while (lo < hi)`, `hi = mid`, and `lo = mid + 1` to eliminate off-by-one and infinite loops.",
                    "First occurrence, last occurrence, insert position and count are all one template with a changed comparison.",
                    "Duplicates degrade rotated-array search to O(n) — say so rather than claiming O(log n).",
                ],
                [
                    "How do you find the first and last occurrence of a value in O(log n)?",
                    "How do you avoid an infinite loop in binary search?",
                    "How do you search a rotated sorted array?",
                    "What happens to your approach when duplicates are allowed?",
                ],
                ["first-and-last-position", "merged-median"],
            ),
            DL(
                "binary-search-on-answer",
                "Binary Search on the Answer",
                "The pattern that solves 'minimise the maximum' problems that look nothing like search.",
                14,
                "Some problems ask for the smallest or largest value satisfying a condition, where the condition is expensive to invert but cheap to check. If the condition is monotone in that value, you can binary search the answer space itself — testing candidate answers rather than searching data. It is the single highest-leverage pattern in the subject, because the problems that use it rarely look like search problems.",
                [
                    (
                        "Why It Matters",
                        """"Split an array into m parts minimising the largest part", "find the minimum eating speed", "find the smallest ship capacity to deliver in d days", "find the kth smallest element in a sorted matrix" — these all look like optimisation or DP problems, and they all collapse to a twenty-line binary search.

Candidates who know the trigger solve them in ten minutes. Candidates who do not typically attempt a DP, run out of time, and never find the much simpler answer.""",
                    ),
                    (
                        "Mental Model",
                        """Search the space of possible answers rather than the input.

Define feasible(x) -> check it is monotone -> binary search the smallest feasible x

Three requirements:

1. **A bounded answer range** `[lo, hi]` you can state.
2. **A feasibility check** `feasible(x)` you can evaluate, typically in O(n).
3. **Monotonicity**: if `x` is feasible then every larger `x` is feasible (or every smaller one, depending on direction).

Total cost is O(n log(range)), which is almost always fast enough.""",
                    ),
                    (
                        "How It Works",
                        """### The template

```java
int smallestFeasible(int lo, int hi) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (feasible(mid)) hi = mid;      // mid works, try smaller
        else lo = mid + 1;                // mid fails, must go larger
    }
    return lo;
}
```

It is the same boundary template as the previous lesson, applied to a range of candidate answers rather than array indices. That is the whole idea.

### Recognising the trigger

The phrasings that should fire this pattern:

- "Minimise the maximum ..." or "maximise the minimum ..."
- "Find the smallest X such that ..." or "the largest X such that ..."
- "What is the minimum capacity / speed / time / size needed to ..."
- "Can it be done within K?" — when the answer to that question is easier than finding the optimum

If you can answer "is X enough?" quickly, and "enough" is monotone in X, binary search the answer.

### Worked pattern: minimum eating speed

> Piles of bananas, h hours available. Eating speed k means each pile takes `ceil(pile / k)` hours. Find the smallest k that finishes in time.

```java
int minEatingSpeed(int[] piles, int h) {
    int lo = 1, hi = 0;
    for (int p : piles) hi = Math.max(hi, p);       // speed never needs to exceed the largest pile

    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (hoursNeeded(piles, mid) <= h) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

long hoursNeeded(int[] piles, int speed) {
    long hours = 0;
    for (int p : piles) hours += (p + speed - 1) / speed;   // ceiling division
    return hours;
}
// O(n log(max pile)) time, O(1) space
```

Three details to state: the bounds (1 to the largest pile, because a faster speed than that changes nothing), the monotonicity (a faster speed never takes more hours), and the ceiling division without floating point.

### Worked pattern: split array to minimise the largest sum

```java
int splitArray(int[] nums, int m) {
    int lo = 0, hi = 0;
    for (int x : nums) { lo = Math.max(lo, x); hi += x; }   // lower bound is the largest element

    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (piecesNeeded(nums, mid) <= m) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int piecesNeeded(int[] nums, int cap) {
    int pieces = 1, running = 0;
    for (int x : nums) {
        if (running + x > cap) { pieces++; running = 0; }
        running += x;
    }
    return pieces;
}
// O(n log(sum)) time, O(1) space
```

The lower bound is the largest single element — no cap smaller than that can ever work — and the upper bound is the total sum, which always works with one piece. Deriving those bounds out loud is half the answer.

This problem also has an O(n^2 * m) DP solution. Being able to say "there is a DP, but binary search on the answer is O(n log sum) and far simpler" is exactly the kind of comparison that scores well.

### Binary search on a real-valued answer

When the answer is continuous, iterate a fixed number of times or until the interval is smaller than the required precision.

```java
double findRoot(double lo, double hi) {
    for (int i = 0; i < 100; i++) {                 // 100 halvings is ample precision
        double mid = (lo + hi) / 2;
        if (feasible(mid)) hi = mid; else lo = mid;
    }
    return lo;
}
```

Using a fixed iteration count avoids the infinite loop that `while (hi - lo > 1e-9)` can cause with floating-point representation issues.

### Kth smallest in a sorted matrix

A less obvious application worth knowing, because it looks like a heap problem:

```java
int kthSmallest(int[][] matrix, int k) {
    int n = matrix.length;
    int lo = matrix[0][0], hi = matrix[n - 1][n - 1];
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (countLessOrEqual(matrix, mid) >= k) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int countLessOrEqual(int[][] m, int target) {
    int n = m.length, count = 0, row = n - 1, col = 0;
    while (row >= 0 && col < n) {                   // staircase walk from bottom-left
        if (m[row][col] <= target) { count += row + 1; col++; }
        else row--;
    }
    return count;
}
// O(n log(range)) time, O(1) space
```

The counting function uses the staircase walk from the sorted-matrix search. Note that the answer returned is guaranteed to be an element of the matrix, because the boundary lands on the smallest value whose count reaches k — a subtlety worth mentioning, since it looks like it might return a value not present.""",
                    ),
                    (
                        "Example",
                        """"You must ship packages within `days` days. Packages must ship in order. Find the minimum ship capacity."

```java
int shipWithinDays(int[] weights, int days) {
    int lo = 0, hi = 0;
    for (int w : weights) { lo = Math.max(lo, w); hi += w; }

    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (daysNeeded(weights, mid) <= days) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int daysNeeded(int[] weights, int capacity) {
    int days = 1, load = 0;
    for (int w : weights) {
        if (load + w > capacity) { days++; load = 0; }
        load += w;
    }
    return days;
}
// O(n log(sum)) time, O(1) space
```

The full narration: "The answer is a capacity, and I can check any candidate capacity in O(n) by greedily filling ships. More capacity never needs more days, so feasibility is monotone — which means I can binary search it. The lower bound is the heaviest single package, since no smaller capacity can ever ship it; the upper bound is the total weight, which always works in one day. That gives O(n log(total weight))."

Requirements, monotonicity, bounds, complexity — four clauses, and the problem is solved before any code is written.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Minimise the maximum, or maximise the minimum
- Capacity, rate, and threshold problems
- Scheduling within a deadline
- Kth smallest in a structure too large to enumerate
- Real-valued optimisation with a feasibility test""",
                    ),
                    (
                        "Trade-offs",
                        """- **Against DP.** Usually far simpler and often faster; DP is required when you need the actual partition rather than just its cost.
- **Against a heap.** For kth-smallest in a sorted matrix, a heap is O(k log k) and binary search is O(n log range) — which wins depends on k relative to n.
- **Integer versus real answers.** Integers terminate exactly; reals need a precision policy.
- **Cost of the feasibility check.** The whole approach is only worthwhile when the check is much cheaper than solving the problem directly.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Failing to verify monotonicity, so the search converges on a wrong answer
- Bounds that are too tight, excluding the true answer
- Off-by-one from mixing templates, landing on the largest infeasible value
- Integer overflow when the upper bound is a sum of large values — use `long`
- Floating-point loops that never terminate
- Reaching for DP on a problem that is a four-line feasibility check""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you know the answer is monotone?"** — State it explicitly: more capacity never requires more days. If you cannot argue it, the technique does not apply.
- **"What are your bounds and why?"** — Derive both; the lower bound is often "the largest single element" and the upper "the total".
- **"What is the complexity?"** — O(check * log(range)). Note that the log factor is over the *value range*, not n.
- **"Could you do it with DP?"** — Often yes; compare and justify your choice.
- **"What if the answer is a real number?"** — Fixed iteration count for the required precision.""",
                    ),
                    (
                        "Mini Exercise",
                        """For each, define `feasible(x)`, the bounds, and argue monotonicity:

1. Minimum eating speed to finish piles in h hours.
2. Minimum ship capacity to deliver in d days.
3. Split an array into m subarrays minimising the largest sum.
4. Smallest divisor such that the sum of ceilings is at most a threshold.
5. Maximum minimum distance when placing k items in given positions.
6. Kth smallest element in a sorted matrix.
7. Median of two sorted arrays.

Number 5 reverses the direction — you are maximising, so feasibility is "can I place k items with at least this spacing", and the template's comparison flips. Working out which way the template points is the real exercise.""",
                    ),
                    (
                        "Interview Tip",
                        """When a problem says "minimise the maximum" or "smallest X such that", say out loud: "this looks like binary search on the answer — let me define the feasibility check and confirm it is monotone." That sentence alone often earns the problem, because recognising the pattern is what is being tested.""",
                    ),
                ],
                [
                    "Search the answer space, not the input: define feasible(x), confirm monotonicity, binary search the boundary.",
                    "The triggers are 'minimise the maximum', 'maximise the minimum', and 'smallest X such that'.",
                    "Derive both bounds explicitly — usually the largest element and the total sum.",
                    "Complexity is the cost of the feasibility check times log of the value range, not log n.",
                ],
                [
                    "How do you recognise a binary-search-on-answer problem?",
                    "How do you argue that the feasibility check is monotone?",
                    "What are the bounds for the minimum-capacity problem and why?",
                    "When would you prefer dynamic programming over this approach?",
                ],
            ),
        ],
        roadmap_key="binary-search",
        practice_tag="binary-search",
    )


def _sorting_topic() -> dict:
    return _dsa_topic(
        "sorting",
        "Sorting and Selection",
        "The algorithms, when stability matters, custom comparators, and selecting the kth element without sorting.",
        "MEDIUM",
        12,
        [
            DL(
                "sorting-algorithms",
                "Sorting Algorithms and When They Matter",
                "What each algorithm buys, what Java actually uses, and when O(n log n) is not the floor.",
                12,
                "You will rarely implement a sort in an interview, and you will frequently be asked which one you would use and why. The valuable knowledge is the comparison: which are stable, which are in place, which degrade, and which linear-time sorts become available when the input is constrained.",
                [
                    (
                        "Why It Matters",
                        """Sorting is the most common preprocessing step in the whole subject — it enables two pointers, greedy interval algorithms, and binary search. Knowing its cost, and when it is avoidable, is part of nearly every complexity discussion.

The stability question also has real consequences: sorting by one field and then another only produces a correct multi-key ordering if the sort is stable, and that bites people in production as well as in interviews.""",
                    ),
                    (
                        "Mental Model",
                        """Comparison sorts cannot beat O(n log n); non-comparison sorts can, by exploiting constraints on the values.

| Algorithm | Time | Space | Stable | Notes |
| --- | --- | --- | --- | --- |
| Merge sort | O(n log n) always | O(n) | Yes | Predictable; good for linked lists and external sorting |
| Quicksort | O(n log n) average, O(n^2) worst | O(log n) | No | Best constants in practice, in place |
| Heapsort | O(n log n) always | O(1) | No | Guaranteed bound with no extra memory, poor locality |
| Insertion sort | O(n^2), O(n) nearly sorted | O(1) | Yes | Excellent for tiny or nearly sorted inputs |
| Counting sort | O(n + k) | O(k) | Yes | Small integer range only |
| Radix sort | O(d * (n + b)) | O(n + b) | Yes | Fixed-width keys |
| Bucket sort | O(n) expected | O(n) | Depends | Uniformly distributed values |

> Memory cue: the O(n log n) lower bound applies to *comparison* sorts. If you can exploit the value range, you can beat it.""",
                    ),
                    (
                        "How It Works",
                        """### What Java actually uses

- `Arrays.sort(int[])` and other primitives: dual-pivot quicksort — in place, no stability concern since primitives are indistinguishable, with introsort-style protection against adversarial inputs.
- `Arrays.sort(Object[])` and `Collections.sort`: TimSort — a stable merge sort that detects existing runs and is close to O(n) on nearly sorted data.

The asymmetry is deliberate and worth knowing: stability is meaningless for primitives, so the faster in-place algorithm is used; stability matters for objects, so the stable one is.

### Stability, concretely

A stable sort preserves the relative order of equal keys. That is what makes multi-key sorting by successive passes work:

```java
// Sort by last name, then by first name within equal last names
people.sort(Comparator.comparing(Person::firstName));   // secondary key first
people.sort(Comparator.comparing(Person::lastName));    // primary key second
```

This only works because the second sort is stable. With an unstable sort, the first-name ordering is destroyed.

In practice you would write it as one comparator, which is clearer and faster:

```java
people.sort(Comparator.comparing(Person::lastName)
                      .thenComparing(Person::firstName));
```

### Merge sort, since it is the one you may be asked to write

```java
void mergeSort(int[] a, int lo, int hi, int[] buffer) {
    if (hi - lo <= 1) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(a, lo, mid, buffer);
    mergeSort(a, mid, hi, buffer);

    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) buffer[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i < mid) buffer[k++] = a[i++];
    while (j < hi) buffer[k++] = a[j++];
    System.arraycopy(buffer, lo, a, lo, hi - lo);
}
// O(n log n) time, O(n) space
```

`a[i] <= a[j]` rather than `<` is what makes it stable: on a tie, the element from the left half is taken first. Changing that one character silently makes the sort unstable, and it is a good detail to point out.

Merge sort is also the right answer for sorting a linked list — no random access is needed, and it can be done with O(1) extra space beyond the recursion by relinking nodes.

### Quicksort and the partition

```java
int partition(int[] a, int lo, int hi) {
    int pivot = a[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) swap(a, i++, j);
    }
    swap(a, i, hi);
    return i;
}
```

Quicksort's worst case is O(n^2) on already-sorted input with a naive pivot choice. The mitigations to name: random pivot, median-of-three, or switching to heapsort after too much recursion depth (introsort). Production implementations do all three.

### Three-way partitioning

When there are many duplicates, the Dutch national flag partition avoids quicksort's degradation and is a standalone interview problem ("sort colours"):

```java
void sortColors(int[] a) {
    int low = 0, mid = 0, high = a.length - 1;
    while (mid <= high) {
        if (a[mid] == 0) swap(a, low++, mid++);
        else if (a[mid] == 2) swap(a, mid, high--);   // do NOT advance mid
        else mid++;
    }
}
// O(n) time, O(1) space, single pass
```

Not advancing `mid` after swapping with `high` is the crucial detail: the value swapped in from the back has not been examined yet.

### Beating O(n log n)

```java
// Counting sort: values in a known small range
int[] countingSort(int[] a, int maxValue) {
    int[] counts = new int[maxValue + 1];
    for (int x : a) counts[x]++;
    int[] out = new int[a.length];
    int k = 0;
    for (int v = 0; v <= maxValue; v++)
        while (counts[v]-- > 0) out[k++] = v;
    return out;
}
// O(n + k) time, O(k) space
```

When the interviewer says "the values are between 0 and 100" or "these are ages", counting sort is the intended answer and it is linear. Bucket sort generalises it to uniformly distributed real values, and radix sort applies it digit by digit for fixed-width keys.""",
                    ),
                    (
                        "Example",
                        """"Sort an array of n integers where every element is at most k positions away from its sorted position."

The general sort is O(n log n); the constraint allows better:

```java
int[] sortNearlySorted(int[] a, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    int[] out = new int[a.length];
    int write = 0;
    for (int x : a) {
        heap.offer(x);
        if (heap.size() > k + 1) out[write++] = heap.poll();
    }
    while (!heap.isEmpty()) out[write++] = heap.poll();
    return out;
}
// O(n log k) time, O(k) space
```

The argument: "Because each element is within k positions of where it belongs, the smallest remaining element is always within the next k + 1 candidates. A heap of that size always has the correct next element at its top, so I emit one element per step. That gives O(n log k), which beats a general sort when k is much smaller than n — and it streams, so it works if the input does not fit in memory."

The streaming property is a nice bonus to mention, and it connects directly to external sorting.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Preprocessing to enable two pointers, greedy, or binary search
- Interval problems, which almost always start with a sort by start time
- Multi-key ordering with comparators
- Nearly sorted or bounded-range data, where a linear-time approach applies
- Sorting data too large for memory, via external merge sort""",
                    ),
                    (
                        "Trade-offs",
                        """- **Merge versus quick.** Guaranteed O(n log n) and stable at O(n) memory, versus better constants in place with a bad worst case.
- **Stability.** Required for multi-key passes and for preserving input order among ties; costs memory or a slower algorithm.
- **Sorting versus not sorting.** A sort costs O(n log n) and often removes a hash map's O(n) memory and unlocks order-dependent follow-ups.
- **Counting and radix sorts.** Linear, and only valid under constraints on the values, and they cost O(range) memory.
- **In place versus stable.** You generally get one or the other; know which the problem needs.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Assuming `Arrays.sort` is stable for primitives — the concept does not apply, and the algorithm is not a stable one
- Sorting by two keys with two unstable passes
- Using `Integer` boxing comparators in hot loops unnecessarily
- Claiming O(n log n) is a universal lower bound, ignoring non-comparison sorts
- Advancing the middle pointer after a swap in three-way partitioning
- Sorting when a heap or quickselect would be cheaper for the actual question""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Which sort does Java use?"** — Dual-pivot quicksort for primitives, TimSort for objects, and the stability reason for the difference.
- **"What if the values are all between 0 and 1000?"** — Counting sort, O(n + k).
- **"What if the data does not fit in memory?"** — External merge sort: sort chunks, write them out, k-way merge with a heap.
- **"Do you need a full sort?"** — Frequently not. For the kth element, quickselect is O(n) average; for the top k, a heap is O(n log k).
- **"What makes a sort stable and why do you care?"** — Equal keys keep their input order, which is what makes successive multi-key sorts correct.""",
                    ),
                    (
                        "Mini Exercise",
                        """Choose an algorithm and justify it:

1. Sort a million 32-bit integers.
2. Sort a million records by department, then by salary descending.
3. Sort ages between 0 and 120.
4. Sort a linked list.
5. Sort an array that is already nearly sorted.
6. Sort 100 GB of data on a machine with 8 GB of memory.
7. Find the 10 largest of a billion streamed values.

Number 7 is the trap: it is not a sorting problem at all. A min-heap of size 10 answers it in O(n log 10) with constant memory, and sorting would be both slower and impossible on a stream.""",
                    ),
                    (
                        "Interview Tip",
                        """Before sorting, ask whether you actually need full order. "I could sort for O(n log n), but I only need the top k, so a heap gives O(n log k)" is a better answer than sorting, and interviewers specifically listen for whether you over-sort.""",
                    ),
                ],
                [
                    "Java uses dual-pivot quicksort for primitives and stable TimSort for objects — know why the two differ.",
                    "Stability is what makes successive multi-key sorts correct; prefer one composed comparator instead.",
                    "Counting, radix and bucket sorts beat O(n log n) by exploiting constraints on the values.",
                    "Ask whether you need a full sort — a heap or quickselect is often cheaper for the actual question.",
                ],
                [
                    "Which sorting algorithm does Java use, and why does it differ for primitives and objects?",
                    "What does stability mean and when does it matter?",
                    "When can you sort in linear time?",
                    "How would you sort data that does not fit in memory?",
                ],
            ),
            DL(
                "comparators-and-quickselect",
                "Comparators, Custom Ordering, and Quickselect",
                "Writing comparators that do not break, and finding the kth element in O(n) average without sorting.",
                12,
                "Half of sorting in interviews is defining the order rather than performing it. The other half is realising you do not need a full sort: quickselect finds the kth smallest element in O(n) on average, and a heap finds the top k in O(n log k). Both come up as the optimisation after a candidate proposes sorting.",
                [
                    (
                        "Why It Matters",
                        """Custom comparators appear whenever objects are sorted by a derived or multi-field key — meetings by start time, words by frequency then lexicographically, numbers by a concatenation rule. Getting the comparator contract wrong causes exceptions that only appear on larger inputs, which is a genuinely nasty failure mode.

Quickselect is the standard answer to "kth largest element", and knowing both it and the heap alternative — with the condition that decides between them — is exactly what the follow-up is testing.""",
                    ),
                    (
                        "Mental Model",
                        """A comparator defines a total order. It must be consistent, or the sort may throw.

`compare(a, b)` returns negative if a comes first, zero if tied, positive if b comes first

The contract:

- **Antisymmetric**: `sgn(compare(a,b)) == -sgn(compare(b,a))`
- **Transitive**: if a before b and b before c, then a before c
- **Consistent on ties**: if `compare(a,b) == 0`, then both compare the same way against every c

Violating transitivity causes TimSort to throw `IllegalArgumentException: Comparison method violates its general contract!` — and only on inputs large enough to trigger the merge path, which is why it surfaces in production rather than in tests.""",
                    ),
                    (
                        "How It Works",
                        """### Writing comparators

```java
// Single key
list.sort(Comparator.comparingInt(Interval::start));

// Multi-key: start ascending, then end descending
list.sort(Comparator.comparingInt(Interval::start)
                    .thenComparing(Interval::end, Comparator.reverseOrder()));

// Descending by value, then ascending by key
entries.sort(Comparator.<Map.Entry<String,Integer>>comparingInt(Map.Entry::getValue).reversed()
                       .thenComparing(Map.Entry::getKey));
```

The comparison itself must not overflow:

```java
// WRONG: a - b overflows for large or negative values
Comparator<Integer> bad = (a, b) -> a - b;

// RIGHT
Comparator<Integer> good = Integer::compare;
```

Subtraction-based comparators are a classic bug: `Integer.MIN_VALUE - 1` wraps to a positive number, so the ordering is silently wrong for extreme values. Use `Integer.compare`, `Long.compare`, or `Double.compare`.

### Comparators that encode a rule

```java
// Arrange numbers to form the largest possible concatenation: [3,30,34,5,9] -> "9534330"
String largestNumber(int[] nums) {
    String[] s = new String[nums.length];
    for (int i = 0; i < nums.length; i++) s[i] = String.valueOf(nums[i]);

    Arrays.sort(s, (a, b) -> (b + a).compareTo(a + b));   // whichever pairing is larger

    if (s[0].equals("0")) return "0";                      // all zeros
    return String.join("", s);
}
```

The comparator is the entire algorithm: `a` should precede `b` exactly when `a + b` is a larger string than `b + a`. Proving transitivity for this comparator is non-trivial but it does hold, and the all-zeros guard is the edge case.

### Quickselect

```java
int findKthLargest(int[] nums, int k) {
    int target = nums.length - k;            // index in ascending order
    int lo = 0, hi = nums.length - 1;
    Random rand = new Random();
    while (lo < hi) {
        int pivotIndex = lo + rand.nextInt(hi - lo + 1);   // randomise to avoid O(n^2)
        int p = partition(nums, lo, hi, pivotIndex);
        if (p == target) break;
        if (p < target) lo = p + 1;
        else hi = p - 1;
    }
    return nums[target];
}

int partition(int[] a, int lo, int hi, int pivotIndex) {
    int pivot = a[pivotIndex];
    swap(a, pivotIndex, hi);
    int store = lo;
    for (int i = lo; i < hi; i++) {
        if (a[i] < pivot) swap(a, store++, i);
    }
    swap(a, store, hi);
    return store;
}
// O(n) average, O(n^2) worst case, O(1) extra space
```

Why it is O(n) on average: each partition discards one side, so the expected work is `n + n/2 + n/4 + ... = 2n`. That geometric argument is what the interviewer wants when they ask "why is it linear when quicksort is n log n?" — quicksort recurses into *both* halves, quickselect into only one.

The random pivot matters. With a fixed pivot, an adversarial or already-sorted input gives O(n^2).

### Quickselect versus heap

| | Quickselect | Min-heap of size k |
| --- | --- | --- |
| Time | O(n) average, O(n^2) worst | O(n log k) guaranteed |
| Space | O(1) | O(k) |
| Mutates input | Yes | No |
| Works on a stream | No | Yes |
| Returns | The kth element | All top k |

The decision rule to state: if k is small relative to n, or the data streams, or you need all k elements, use a heap. If you need just the kth element from an array you may mutate, quickselect is faster on average.

### Top k with a heap

```java
List<Integer> topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> counts = new HashMap<>();
    for (int x : nums) counts.merge(x, 1, Integer::sum);

    PriorityQueue<Map.Entry<Integer,Integer>> heap =
        new PriorityQueue<>(Map.Entry.comparingByValue());     // min-heap by count

    for (var e : counts.entrySet()) {
        heap.offer(e);
        if (heap.size() > k) heap.poll();                      // evict the smallest
    }

    List<Integer> out = new ArrayList<>();
    while (!heap.isEmpty()) out.add(heap.poll().getKey());
    Collections.reverse(out);
    return out;
}
// O(n log k) time, O(n) space
```

The counter-intuitive part worth explaining: to find the k *largest*, you keep a *min*-heap, so the smallest of your current best k sits at the top and is the one to evict. Getting this backwards is the most common error with top-k problems.

There is also an O(n) alternative here — bucket sort by frequency, since a frequency cannot exceed n — which is a good thing to offer as the follow-up optimisation.""",
                    ),
                    (
                        "Example",
                        """"Find the kth largest element in an unsorted array."

The ladder of answers, which is what the interviewer wants to hear:

> "Sorting gives O(n log n) and is the obvious baseline. A min-heap of size k is O(n log k), better when k is small. Quickselect is O(n) on average by partitioning and recursing into only the side containing the kth index — the expected work is n + n/2 + n/4, which sums to 2n. Its worst case is O(n^2), mitigated by choosing a random pivot; if I needed a guaranteed linear bound I would mention median-of-medians, though its constants make it slower in practice.

> I would write quickselect here if I am allowed to mutate the array, and the heap if the data streams or I need all k elements."

Three approaches, the complexity of each, the condition that selects between them, and an acknowledgement of the worst case. That is a complete senior answer to a very common question.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Kth largest or smallest element
- Top k frequent, closest, or largest items
- Median finding, which is the n/2-th element
- Custom ordering by derived keys or business rules
- Multi-key sorting for scheduling and interval problems""",
                    ),
                    (
                        "Trade-offs",
                        """- **Quickselect versus heap.** Average linear in place, versus a guaranteed bound that streams.
- **Randomised versus deterministic pivot.** Randomisation gives good expected behaviour cheaply; median-of-medians guarantees linear at a large constant cost.
- **Mutating the input.** Quickselect reorders the array; if the caller needs it intact, you must copy.
- **Comparator complexity.** A clever comparator can make the sort the whole solution, and an incorrect one produces an exception that appears only at scale.""",
                    ),
                    (
                        "Common Mistakes",
                        """- `(a, b) -> a - b` comparators that overflow
- Comparators that are not transitive, causing TimSort to throw on large inputs
- Using a max-heap when finding the k largest — it should be a min-heap of size k
- Forgetting to randomise the quickselect pivot and claiming O(n)
- Off-by-one converting between kth largest and the ascending index
- Sorting the whole array when only the kth element is needed""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why is quickselect O(n) when quicksort is O(n log n)?"** — It recurses into one side only, giving a geometric series that sums to 2n.
- **"What is the worst case, and how do you avoid it?"** — O(n^2) on adversarial pivots; randomise, or use median-of-medians for a guarantee.
- **"What if the data is a stream?"** — Quickselect needs random access; a size-k heap streams naturally.
- **"Why a min-heap for the k largest?"** — So the weakest of the current best k is at the top and is cheapest to evict.
- **"Can you do top-k frequent in O(n)?"** — Yes: bucket by frequency, since frequencies are bounded by n.""",
                    ),
                    (
                        "Mini Exercise",
                        """Choose sort, heap, or quickselect for each, and write the comparator where one is needed:

1. Kth largest element in an array of a million values.
2. Top 10 most frequent words in a document.
3. The median of a static array.
4. The 100 points closest to the origin, from a stream of a billion.
5. Sort strings by length, then alphabetically.
6. Arrange numbers to form the largest possible concatenated number.

Number 4 forces the heap: a billion points cannot be held in memory, so a size-100 max-heap of distances streaming through the input is the only viable answer.""",
                    ),
                    (
                        "Interview Tip",
                        """When you propose sorting, immediately ask yourself whether you need the full order. Saying "I only need the kth element, so quickselect gives O(n) average rather than O(n log n)" turns a baseline answer into an optimised one without any extra prompting.""",
                    ),
                ],
                [
                    "Never write `a - b` comparators; use `Integer.compare` to avoid overflow and contract violations.",
                    "Quickselect is O(n) average because it recurses into one side only — the work sums to 2n.",
                    "Use a min-heap of size k to find the k largest, and evict the top when it overflows.",
                    "Choose a heap when the data streams or you need all k; quickselect when you need one element from a mutable array.",
                ],
                [
                    "How do you find the kth largest element faster than sorting?",
                    "Why is quickselect linear on average while quicksort is n log n?",
                    "Why is a min-heap used to track the k largest elements?",
                    "What can go wrong with a comparator, and how does it surface?",
                ],
            ),
        ],
        practice_tag="array",
    )


def _linked_list_topic() -> dict:
    return _dsa_topic(
        "linked-list",
        "Linked Lists",
        "Pointer rewiring without losing the list, the dummy-head technique, and the standard manipulation patterns.",
        "MEDIUM",
        13,
        [
            DL(
                "rewiring-pointers",
                "Rewiring Pointers Safely",
                "The three-pointer discipline that makes reversal and reordering routine instead of risky.",
                12,
                "Linked list problems are not conceptually hard; they are bookkeeping under pressure. Every bug is the same bug — you overwrote a pointer before you were finished with it, and now the rest of the list is unreachable. The discipline of naming your pointers and advancing them in a fixed order removes almost all of it.",
                [
                    (
                        "Why It Matters",
                        """Linked list questions are popular precisely because they expose careless pointer handling immediately. There is no clever insight to hide behind: either the code is correct or the list is corrupted.

They are also a good test of edge-case thinking. Empty list, single node, two nodes, and operating on the head itself are four cases that break naive implementations, and the dummy-head technique eliminates the last one entirely.""",
                    ),
                    (
                        "Mental Model",
                        """Never let go of a node until you have somewhere else to reach it from.

prev <- current -> next

The universal loop shape:

1. Save `next` before you modify `current.next`.
2. Rewire `current`.
3. Advance `prev` to `current`, then `current` to the saved `next`.

Doing these in any other order loses the tail of the list.

> Memory cue: save, rewire, advance. Every reversal and reordering is that loop with a different rewire step.""",
                    ),
                    (
                        "How It Works",
                        """### Reversal, the canonical example

```java
ListNode reverse(ListNode head) {
    ListNode prev = null, current = head;
    while (current != null) {
        ListNode next = current.next;   // 1. save
        current.next = prev;            // 2. rewire
        prev = current;                 // 3. advance
        current = next;
    }
    return prev;                        // prev is the new head
}
// O(n) time, O(1) space
```

Returning `prev` rather than `current` is the detail people get wrong: when the loop ends, `current` is null and `prev` is the last node processed, which is the new head.

The recursive version is elegant and costs O(n) stack, which is worth stating as a trade:

```java
ListNode reverseRecursive(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode newHead = reverseRecursive(head.next);
    head.next.next = head;      // the node ahead now points back
    head.next = null;           // and this node becomes the tail
    return newHead;
}
```

### The dummy head

Any operation that might modify the head should use a dummy node, which removes the special case entirely.

```java
ListNode removeElements(ListNode head, int val) {
    ListNode dummy = new ListNode(0, head);
    ListNode prev = dummy;
    while (prev.next != null) {
        if (prev.next.val == val) prev.next = prev.next.next;   // skip it
        else prev = prev.next;
    }
    return dummy.next;
}
```

Without the dummy, removing the head requires a separate branch before the loop, and forgetting it is the classic failure. With it, there is exactly one code path.

Note also that `prev` only advances when nothing was removed — advancing unconditionally skips consecutive matches.

### Reversing a sublist

```java
ListNode reverseBetween(ListNode head, int left, int right) {
    ListNode dummy = new ListNode(0, head);
    ListNode beforeLeft = dummy;
    for (int i = 1; i < left; i++) beforeLeft = beforeLeft.next;

    ListNode current = beforeLeft.next;
    for (int i = 0; i < right - left; i++) {          // head-insertion splicing
        ListNode moved = current.next;
        current.next = moved.next;
        moved.next = beforeLeft.next;
        beforeLeft.next = moved;
    }
    return dummy.next;
}
```

Rather than reversing and re-stitching, this repeatedly moves the node after `current` to the front of the sublist. It is a cleaner formulation and avoids holding four separate boundary pointers.

### Merging two sorted lists

```java
ListNode merge(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0);
    ListNode tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else               { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;    // attach the remainder wholesale
    return dummy.next;
}
```

Attaching the remaining list in one assignment rather than looping is both shorter and a small signal of fluency. The `<=` keeps the merge stable.

### Java specifics

`LinkedList` in Java is a doubly linked list implementing both `List` and `Deque`. In interviews you almost always define your own node class, because the standard library type hides the pointers you are being asked to manipulate.

For actual use, `ArrayList` outperforms `LinkedList` for nearly every workload due to cache locality — `LinkedList` only wins when you hold a reference to the node and insert there, which the `List` interface does not let you do.""",
                    ),
                    (
                        "Example",
                        """"Add two numbers represented as linked lists with digits in reverse order."

```java
ListNode addTwoNumbers(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0);
    ListNode tail = dummy;
    int carry = 0;

    while (a != null || b != null || carry != 0) {      // one condition covers all cases
        int sum = carry;
        if (a != null) { sum += a.val; a = a.next; }
        if (b != null) { sum += b.val; b = b.next; }
        carry = sum / 10;
        tail.next = new ListNode(sum % 10);
        tail = tail.next;
    }
    return dummy.next;
}
// O(max(m, n)) time, O(max(m, n)) space for the result
```

What to say: "The loop condition includes the carry, so a final carry produces an extra node without any code after the loop. The dummy head means I never special-case the first digit. Lists of different lengths are handled by the null checks rather than by padding."

Then the follow-up worth pre-empting: "If the digits were in forward order, I would either reverse both lists first or push the digits onto stacks and build the result from the least significant end — the stack version avoids mutating the inputs."

That anticipated follow-up is asked more often than not.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Reversal, in whole or in part
- Merging sorted lists
- Removing nodes by value or position
- Detecting and removing cycles
- Reordering, partitioning, and rotating
- Implementing LRU caches, where a doubly linked list gives O(1) removal""",
                    ),
                    (
                        "Trade-offs",
                        """- **Iterative versus recursive.** O(1) space versus clearer code at O(n) stack, which can overflow on long lists.
- **Dummy head.** One extra node allocation removes an entire class of edge case.
- **Singly versus doubly linked.** Doubly linked allows O(1) removal given a node reference, at the cost of a second pointer per node — that is precisely why an LRU cache needs it.
- **Mutating versus copying.** In-place is O(1) space and destroys the caller's list; ask before assuming it is allowed.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Overwriting `current.next` before saving it
- Returning `current` instead of `prev` after a reversal
- Not using a dummy head when the head may be removed
- Advancing the previous pointer after a removal, skipping consecutive matches
- Forgetting to null-terminate a detached sublist, creating a cycle
- Assuming the list is non-empty""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do it without extra space?"** — Iterative rewiring is already O(1); the recursive version is not.
- **"What if the list has a cycle?"** — Most manipulations loop forever; detect with fast and slow pointers first if cycles are possible.
- **"Can you do it recursively?"** — Yes, and note the O(n) stack.
- **"What if you cannot modify the input?"** — Build a new list, at O(n) space.
- **"How do you find the middle?"** — Fast and slow pointers, which composes with reversal for palindrome and reorder problems.""",
                    ),
                    (
                        "Mini Exercise",
                        """Implement each iteratively with a dummy head where appropriate, and test on empty, one-node, and two-node lists:

1. Reverse a linked list.
2. Reverse only the nodes between positions left and right.
3. Merge two sorted lists.
4. Remove all nodes with a given value.
5. Remove duplicates from a sorted list, keeping one of each.
6. Remove duplicates from a sorted list, keeping none of the duplicated values.
7. Partition the list so all nodes less than x come before the rest, preserving relative order.

Number 6 is harder than number 5 and is the one that needs the dummy head most, because the head itself may be a duplicate that must be removed entirely.""",
                    ),
                    (
                        "Interview Tip",
                        """Write `ListNode dummy = new ListNode(0, head);` as your first line whenever the head might change, and say why: "a dummy head means removing the first node is not a special case." It costs one line and eliminates the bug interviewers are watching for.""",
                    ),
                ],
                [
                    "Save the next pointer, rewire, then advance — in that order, every time.",
                    "Return `prev` after a reversal loop; `current` is null by then.",
                    "A dummy head removes the special case where the head itself is modified or removed.",
                    "Attach the remaining list wholesale after a merge instead of looping through it.",
                ],
                [
                    "How do you reverse a linked list in place?",
                    "Why use a dummy head node?",
                    "What is the space complexity of the recursive reversal?",
                    "How do you remove all occurrences of a value, including at the head?",
                ],
                ["cycle-in-a-chain"],
            ),
            DL(
                "linked-list-patterns",
                "Linked List Patterns and Composition",
                "Reorder, rotate, copy with random pointers, and merging k lists — the problems built by composing primitives.",
                12,
                "Beyond reversal and merging, most linked list problems are compositions: find the middle, reverse a half, merge two halves. Recognising that a problem decomposes into primitives you already have is faster and far less error-prone than solving it from scratch.",
                [
                    (
                        "Why It Matters",
                        """"Reorder list", "palindrome list", and "sort list" all look like new problems and are all two or three primitives stitched together. Candidates who see the decomposition write correct code quickly; candidates who do not attempt to track five pointers at once and produce a tangle.

The composition mindset also produces better narration: "I need the middle, so fast and slow; then I reverse the second half; then I interleave" is far easier for an interviewer to follow than a description of pointer moves.""",
                    ),
                    (
                        "Mental Model",
                        """Four primitives compose into most problems.

Find middle → Reverse → Merge → Split

| Problem | Composition |
| --- | --- |
| Palindrome check | Middle, reverse second half, compare |
| Reorder list | Middle, reverse second half, interleave |
| Sort list | Middle, split, sort each, merge |
| Rotate right | Find length, close into a ring, cut at the right place |
| Merge k lists | Pairwise merge, or a heap over the heads |""",
                    ),
                    (
                        "How It Works",
                        """### Reorder list

Given `1 -> 2 -> 3 -> 4 -> 5`, produce `1 -> 5 -> 2 -> 4 -> 3`.

```java
void reorderList(ListNode head) {
    if (head == null || head.next == null) return;

    // 1. find the end of the first half
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }

    // 2. reverse the second half and detach it
    ListNode second = reverse(slow.next);
    slow.next = null;

    // 3. interleave
    ListNode first = head;
    while (second != null) {
        ListNode n1 = first.next, n2 = second.next;
        first.next = second;
        second.next = n1;
        first = n1;
        second = n2;
    }
}
// O(n) time, O(1) space
```

Three named steps, each of which you already know. `slow.next = null` is essential — without it the two halves still reference each other and the interleave creates a cycle.

### Rotate right by k

```java
ListNode rotateRight(ListNode head, int k) {
    if (head == null || head.next == null || k == 0) return head;

    int length = 1;
    ListNode tail = head;
    while (tail.next != null) { tail = tail.next; length++; }

    k %= length;                        // k can exceed the length
    if (k == 0) return head;

    tail.next = head;                   // close into a ring
    ListNode newTail = head;
    for (int i = 1; i < length - k; i++) newTail = newTail.next;
    ListNode newHead = newTail.next;
    newTail.next = null;                // cut
    return newHead;
}
```

Closing the list into a ring and cutting at the right place is much cleaner than tracking two pointers with a gap, and the `k %= length` line is the edge case interviewers add.

### Copy a list with random pointers

A list where each node has both `next` and an arbitrary `random` pointer. The interleaving trick achieves O(1) extra space:

```java
Node copyRandomList(Node head) {
    if (head == null) return null;

    // 1. weave copies in: A -> A' -> B -> B' -> ...
    for (Node p = head; p != null; p = p.next.next) {
        Node copy = new Node(p.val);
        copy.next = p.next;
        p.next = copy;
    }

    // 2. assign random pointers using the adjacency
    for (Node p = head; p != null; p = p.next.next) {
        if (p.random != null) p.next.random = p.random.next;
    }

    // 3. unweave
    Node dummy = new Node(0), tail = dummy;
    for (Node p = head; p != null; p = p.next) {
        tail.next = p.next;
        tail = tail.next;
        p.next = p.next.next;           // restore the original list
    }
    return dummy.next;
}
// O(n) time, O(1) extra space beyond the output
```

The insight to state: "By placing each copy directly after its original, `original.random.next` *is* the copy of the random target, so the random pointers can be assigned in one pass with no map." The alternative — a `HashMap<Node, Node>` from original to copy — is O(n) space, much easier to write, and a perfectly acceptable first answer to offer before the interviewer asks for the space optimisation.

Restoring the original list in step 3 is a courtesy that interviewers notice.

### Merge k sorted lists

```java
ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));
    for (ListNode l : lists) if (l != null) heap.offer(l);

    ListNode dummy = new ListNode(0), tail = dummy;
    while (!heap.isEmpty()) {
        ListNode node = heap.poll();
        tail.next = node;
        tail = node;
        if (node.next != null) heap.offer(node.next);
    }
    return dummy.next;
}
// O(N log k) where N is the total number of nodes and k the number of lists
```

The heap holds at most one node per list, so it is O(k) space. The alternative is divide-and-conquer pairwise merging, which is the same O(N log k) with O(1) extra space and no heap — worth offering as the alternative.

Naive sequential merging is O(N * k), and explaining why — the first list is re-traversed on every merge — is the reason to reject it.

### Sorting a linked list

Merge sort is the right answer: it needs only sequential access and can relink nodes rather than copying.

```java
ListNode sortList(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode slow = head, fast = head.next;          // note fast starts one ahead
    while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
    ListNode second = slow.next;
    slow.next = null;                                // split
    return merge(sortList(head), sortList(second));
}
// O(n log n) time, O(log n) stack
```

Starting `fast` at `head.next` guarantees the first half is never empty, which prevents infinite recursion on a two-node list — a subtle but fatal detail.""",
                    ),
                    (
                        "Example",
                        """"Determine whether a linked list is a palindrome in O(1) space, then restore the list."

```java
boolean isPalindrome(ListNode head) {
    if (head == null || head.next == null) return true;

    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {
        slow = slow.next; fast = fast.next.next;
    }

    ListNode second = reverse(slow.next);
    boolean ok = true;
    for (ListNode p = head, q = second; q != null; p = p.next, q = q.next) {
        if (p.val != q.val) { ok = false; break; }
    }
    slow.next = reverse(second);      // restore
    return ok;
}
```

What to say: "This is three primitives — find the middle, reverse the second half, compare inwards — and then a fourth step to restore the list so the caller's data is unchanged. Comparing only until the second half is exhausted handles odd lengths, because the middle element is never compared against anything and does not need to be."

The odd-length handling and the restoration are both details that separate a working answer from a careful one.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Reordering and interleaving
- Rotation and cyclic shifts
- Deep copying structures with arbitrary references
- Merging multiple sorted sources
- Sorting when random access is unavailable""",
                    ),
                    (
                        "Trade-offs",
                        """- **Interleaving trick versus a hash map** for the random-pointer copy: O(1) versus O(n) space, and the map version is far easier to write correctly.
- **Heap versus pairwise merge** for k lists: same complexity, heap uses O(k) space and streams, pairwise uses O(1) extra.
- **Restoring the input.** Costs a pass and is the right thing to do; say you are doing it.
- **Recursion.** Natural for merge sort and costs O(log n) stack; on a million-node list that is fine, unlike the O(n) stack of naive recursive reversal.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Forgetting to detach the halves, creating a cycle
- Starting the fast pointer at the wrong node in merge sort, causing infinite recursion
- Not taking `k` modulo the length when rotating
- Leaving the original list mutated when the problem implied it should not be
- Merging k lists sequentially and calling it O(N log k)
- Losing the random pointers by copying `next` before assigning them""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can you do the random-pointer copy without extra space?"** — Yes, with the weave-and-unweave trick. Offer the map version first, then this.
- **"Why merge sort rather than quicksort for a list?"** — No random access is needed, and merge sort is stable and predictable; quicksort's partition needs indexing.
- **"What is the complexity of merging k lists?"** — O(N log k) with a heap or pairwise; explain why sequential merging is O(N * k).
- **"Can you restore the list afterwards?"** — Yes, and doing so unprompted is a good signal.
- **"What if the list is doubly linked?"** — Several problems simplify; reversal becomes a swap of the two pointers per node.""",
                    ),
                    (
                        "Mini Exercise",
                        """Decompose each into named primitives before coding:

1. Reorder a list into first, last, second, second-last, and so on.
2. Check whether a list is a palindrome in O(1) space.
3. Sort a linked list in O(n log n).
4. Rotate a list right by k.
5. Merge k sorted lists.
6. Deep copy a list with random pointers.
7. Swap every two adjacent nodes.

For each, write the decomposition in one line before any code — for example, number 1 is "middle, reverse second, interleave". That habit is the actual lesson.""",
                    ),
                    (
                        "Interview Tip",
                        """State the decomposition before touching the pointers: "I will find the middle with fast and slow, reverse the second half, then merge." The interviewer can then follow your code trivially, and you have converted one hard problem into three you have already solved.""",
                    ),
                ],
                [
                    "Most list problems decompose into four primitives: find middle, reverse, merge, split.",
                    "Detach halves explicitly with `slow.next = null`, or you create a cycle.",
                    "The weave-and-unweave trick copies a random-pointer list in O(1) extra space; offer the hash map version first.",
                    "Merge k lists with a heap or pairwise merging for O(N log k) — sequential merging is O(N * k).",
                ],
                [
                    "How would you reorder a list into first, last, second, second-last order?",
                    "How do you deep copy a list with random pointers without extra space?",
                    "Why is merge sort the right choice for sorting a linked list?",
                    "How do you merge k sorted lists efficiently?",
                ],
            ),
        ],
        roadmap_key="linked-list",
        practice_tag="linked-list",
    )


def _trees_topic() -> dict:
    return _dsa_topic(
        "trees",
        "Binary Trees",
        "Traversal orders, the return-up/pass-down recursion framework, and construction from traversals.",
        "MEDIUM",
        14,
        [
            DL(
                "tree-traversals",
                "Tree Traversals",
                "Four orders, their iterative forms, and which one each problem needs.",
                13,
                "Every tree algorithm is a traversal with work attached. Choosing the order — pre-order, in-order, post-order, or level-order — is usually the entire design decision, because each one makes different information available at the moment you visit a node.",
                [
                    (
                        "Why It Matters",
                        """Choosing the wrong order makes a problem much harder than it is. Computing the height needs post-order, because you need the children's answers first. Validating a BST is natural in-order, because that yields sorted values. Serialising is easiest pre-order, because the root comes first and rebuilding is straightforward.

Iterative forms matter too: interviewers ask for them when the tree may be deep enough to overflow the stack, and in-order iterative traversal is a common request in its own right.""",
                    ),
                    (
                        "Mental Model",
                        """The order is defined by when you process the node relative to its children.

| Order | Sequence | Gives you |
| --- | --- | --- |
| Pre-order | Node, left, right | Root first — copying, serialising, prefix expressions |
| In-order | Left, node, right | Sorted order in a BST |
| Post-order | Left, right, node | Children's results before the parent — heights, deletion, bottom-up aggregation |
| Level-order | By depth | Distance from the root, per-level questions |

> Memory cue: the prefix describes where the *node* is processed. Pre-order processes the node before recursing; post-order after.""",
                    ),
                    (
                        "How It Works",
                        """### Recursive traversals

```java
void preorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    out.add(node.val);
    preorder(node.left, out);
    preorder(node.right, out);
}

void inorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    inorder(node.left, out);
    out.add(node.val);
    inorder(node.right, out);
}

void postorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    postorder(node.left, out);
    postorder(node.right, out);
    out.add(node.val);
}
// All O(n) time, O(h) stack where h is the height
```

Say the space as O(h), then add that h is O(log n) for a balanced tree and O(n) for a degenerate one. That two-part answer is what interviewers want.

### Iterative in-order

The one most often requested, because it is the least obvious:

```java
List<Integer> inorderIterative(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode node = root;
    while (node != null || !stack.isEmpty()) {
        while (node != null) { stack.push(node); node = node.left; }   // go as far left as possible
        node = stack.pop();
        out.add(node.val);
        node = node.right;                                             // then one step right
    }
    return out;
}
```

The structure to narrate: descend left pushing everything, pop and visit, then move right and repeat. The outer condition needs both checks — `node != null` for the descent in progress and `!stack.isEmpty()` for work still pending.

This traversal is also how you implement a BST iterator with O(h) space and O(1) amortised `next()`, which is a standard follow-up.

### Iterative pre-order and post-order

```java
List<Integer> preorderIterative(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    if (root == null) return out;
    Deque<TreeNode> stack = new ArrayDeque<>();
    stack.push(root);
    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        out.add(node.val);
        if (node.right != null) stack.push(node.right);   // right first, so left pops first
        if (node.left != null) stack.push(node.left);
    }
    return out;
}
```

Post-order has a neat trick: do a modified pre-order visiting node, right, left, then reverse the result. Explaining that shortcut is better than writing the two-stack version from memory.

### Level-order

```java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> out = new ArrayList<>();
    if (root == null) return out;
    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int size = queue.size();                  // snapshot before adding children
        List<Integer> level = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        out.add(level);
    }
    return out;
}
```

### Morris traversal

In-order in O(1) space by temporarily threading each node's in-order predecessor to point at it, then undoing the thread on the way back. Worth knowing by name as the answer to "can you traverse without recursion *or* a stack?"; writing it from memory is rarely expected. The trade is that it temporarily mutates the tree, which matters in concurrent settings.

### Choosing the order

| Problem | Order | Why |
| --- | --- | --- |
| Copy or serialise a tree | Pre-order | Root available before children |
| Validate a BST | In-order | Yields sorted values |
| Compute height or diameter | Post-order | Needs children's results |
| Delete a tree | Post-order | Free children before the parent |
| Minimum depth | Level-order | Stops at the first leaf found |
| Right side view | Level-order | Last node of each level |
| Evaluate an expression tree | Post-order | Operands before the operator |""",
                    ),
                    (
                        "Example",
                        """"Find the maximum depth of a binary tree, then find the minimum depth."

```java
int maxDepth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
// Post-order: both children's answers are needed before this node's
```

Minimum depth is the trap:

```java
int minDepth(TreeNode root) {
    if (root == null) return 0;
    if (root.left == null) return 1 + minDepth(root.right);   // not a leaf
    if (root.right == null) return 1 + minDepth(root.left);
    return 1 + Math.min(minDepth(root.left), minDepth(root.right));
}
```

The naive mirror of `maxDepth` using `Math.min` is wrong: for a node with only a right child, the null left child returns 0 and the answer becomes 1, even though that node is not a leaf. Minimum depth must be measured to a *leaf*, so a missing child must not count as one.

And the better answer for minimum depth: "Level-order BFS returns as soon as it reaches the first leaf, which is O(nodes visited) rather than O(n) — on a tree with a shallow leaf and a deep subtree, that is a large saving."

Noticing both the correctness trap and the BFS improvement is a strong response to what looks like a trivial question.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any computation over a whole tree
- Serialisation and deserialisation
- Validating structural properties
- Building iterators
- Per-level questions and shortest-path-to-a-leaf""",
                    ),
                    (
                        "Trade-offs",
                        """- **Recursive versus iterative.** Recursion is clearer and costs O(h) stack, which overflows on degenerate trees of around 10^5 nodes.
- **DFS versus BFS memory.** DFS is O(h); BFS is O(width), which for a complete tree is about n/2 at the bottom level.
- **Morris traversal.** O(1) space and mutates the tree temporarily, making it unsuitable when the tree is shared.
- **Collecting versus streaming.** Building a list of all values is O(n) space; an iterator is O(h).""",
                    ),
                    (
                        "Common Mistakes",
                        """- Mirroring maxDepth with `Math.min` and getting minimum depth wrong
- Forgetting the null check at the top of the recursion
- Pushing left before right in iterative pre-order, reversing the output
- Stating O(n) space for recursion instead of O(h), or forgetting h can be n
- Not snapshotting the queue size in level-order
- Choosing DFS for a shortest-path-to-leaf question""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What is the space complexity?"** — O(h), and h is O(n) in the worst case.
- **"Can you do it iteratively?"** — Yes; explain the stack version and why you would use it on a deep tree.
- **"What if the tree is very deep?"** — Recursion risks a stack overflow; use the iterative form.
- **"Can you do it in O(1) space?"** — Morris traversal, with the caveat that it mutates the tree.
- **"Which traversal would you use here and why?"** — Tie it to what information you need at the node: children's results means post-order, sorted output means in-order.""",
                    ),
                    (
                        "Mini Exercise",
                        """Name the traversal order for each and say why:

1. Serialise a tree so it can be rebuilt.
2. Check whether a tree is a valid BST.
3. Compute the diameter.
4. Return the rightmost node of every level.
5. Evaluate an arithmetic expression tree.
6. Find the shortest root-to-leaf path length.
7. Build a BST iterator with O(h) memory.

Then implement number 7. It is the iterative in-order traversal paused between steps, and recognising that is the whole design.""",
                    ),
                    (
                        "Interview Tip",
                        """Choose the traversal by asking what you need at the moment you process a node. "I need both children's heights before I can compute this node's, so it is post-order" is a one-sentence justification that makes the rest of the code obvious.""",
                    ),
                ],
                [
                    "The traversal prefix says when the node is processed relative to its children.",
                    "Post-order when you need children's results, in-order for sorted BST output, level-order for depth questions.",
                    "State recursion space as O(h) and note that h is O(n) for a degenerate tree.",
                    "Iterative in-order — descend left, pop, go right — is also the BST iterator.",
                ],
                [
                    "Which traversal would you use to validate a BST, and why?",
                    "How do you write an iterative in-order traversal?",
                    "What is the space complexity of a recursive traversal?",
                    "Why is minimum depth not just maxDepth with min?",
                ],
                ["level-walk", "shared-ancestor"],
            ),
            DL(
                "tree-recursion-patterns",
                "The Tree Recursion Framework",
                "Decide what you return upward and what you pass downward, and most tree problems write themselves.",
                14,
                "Nearly every tree problem is solved by a single recursive function, and the design work is answering two questions: what does each call return to its parent, and what does each call receive from its parent? Once those are decided, the body is usually three lines. This framework turns a category of problems that feel ad hoc into a mechanical process.",
                [
                    (
                        "Why It Matters",
                        """Candidates often flail on tree problems because they try to write the code before deciding what the recursion computes. Stating the contract first — "this function returns the height of the subtree, and updates a shared maximum as a side effect" — makes the implementation nearly automatic.

It also handles the problems where the answer at a node is not the same as what you return to the parent, which is the specific thing that makes diameter and maximum-path-sum confusing.""",
                    ),
                    (
                        "Mental Model",
                        """Two channels of information.

Pass down (parameters) → node → Return up (return value)

| Channel | Carries | Examples |
| --- | --- | --- |
| Downward | Context from ancestors | Depth, path so far, allowed value range, running prefix |
| Upward | Summary of the subtree | Height, sum, count, whether valid, best found |

Some problems need only one channel; the hard ones need both plus a shared accumulator.

> Memory cue: write the one-sentence contract before the code. "Returns the height of this subtree and updates `best` with the diameter through this node."
""",
                    ),
                    (
                        "How It Works",
                        """### Bottom-up: return a summary

```java
int height(TreeNode node) {
    if (node == null) return 0;
    return 1 + Math.max(height(node.left), height(node.right));
}
```

Contract: returns the height of this subtree. Nothing passes down.

### Top-down: pass context

```java
// Does a root-to-leaf path sum to target?
boolean hasPathSum(TreeNode node, int remaining) {
    if (node == null) return false;
    remaining -= node.val;
    if (node.left == null && node.right == null) return remaining == 0;
    return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
}
```

Contract: `remaining` is what is still needed below this node. The leaf check must come before the recursion, or a null child is mistaken for a leaf.

### The hard shape: return one thing, record another

Diameter is the canonical example. The value you return to the parent (height) is different from the value you are computing (the longest path through any node).

```java
class Solution {
    private int best = 0;

    int diameterOfBinaryTree(TreeNode root) {
        height(root);
        return best;
    }

    private int height(TreeNode node) {
        if (node == null) return 0;
        int left = height(node.left);
        int right = height(node.right);
        best = Math.max(best, left + right);   // path THROUGH this node
        return 1 + Math.max(left, right);      // path DOWN from this node
    }
}
// O(n) time, O(h) space
```

The two lines at the end are the entire insight, and explaining the difference between them — "a path through this node uses both children, but a path I can extend upward can only use one" — is what demonstrates understanding.

Maximum path sum is the same shape with one addition:

```java
private int maxGain(TreeNode node) {
    if (node == null) return 0;
    int left = Math.max(maxGain(node.left), 0);    // negative contributions are dropped
    int right = Math.max(maxGain(node.right), 0);
    best = Math.max(best, node.val + left + right);
    return node.val + Math.max(left, right);
}
```

Clamping negative subtree sums to zero is the detail that handles negative values, and it is the follow-up interviewers add.

### Passing down a validity range

```java
boolean isValidBST(TreeNode node, Long min, Long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return isValidBST(node.left, min, (long) node.val)
        && isValidBST(node.right, (long) node.val, max);
}
// call with (root, Long.MIN_VALUE, Long.MAX_VALUE)
```

Checking only `node.left.val < node.val` locally is the classic wrong answer — it accepts trees where a deep left descendant exceeds an ancestor. The range must narrow as you descend, and using `long` bounds avoids the edge case where a node holds `Integer.MIN_VALUE`.

### Returning multiple values

When the parent needs several facts, return a small record rather than using fields:

```java
record Info(boolean balanced, int height) {}

Info check(TreeNode node) {
    if (node == null) return new Info(true, 0);
    Info left = check(node.left);
    Info right = check(node.right);
    boolean balanced = left.balanced() && right.balanced()
                    && Math.abs(left.height() - right.height()) <= 1;
    return new Info(balanced, 1 + Math.max(left.height(), right.height()));
}
// O(n) time - each node visited once
```

The naive version calls `height` inside `isBalanced` at every node, which is O(n^2). Returning both facts in one pass is the optimisation, and noticing it unprompted is a good signal.

### Lowest common ancestor

```java
TreeNode lca(TreeNode node, TreeNode p, TreeNode q) {
    if (node == null || node == p || node == q) return node;
    TreeNode left = lca(node.left, p, q);
    TreeNode right = lca(node.right, p, q);
    if (left != null && right != null) return node;   // p and q are on opposite sides
    return left != null ? left : right;
}
// O(n) time, O(h) space
```

The contract is subtle and worth stating precisely: "returns p or q if either is found in this subtree, the LCA if both are found in different subtrees, and null otherwise." That sentence makes the three-line body obviously correct; without it, the code looks like magic.

Note this assumes both nodes are present. If they might not be, you need a flag to distinguish "found the LCA" from "found only one".""",
                    ),
                    (
                        "Example",
                        """"Count the number of paths that sum to a target, where paths go downward but need not start at the root or end at a leaf."

The naive answer is O(n^2) — run a path sum from every node. The good answer uses the prefix-sum-plus-map idea from arrays, applied along the current root-to-node path:

```java
class Solution {
    private final Map<Long, Integer> prefixCounts = new HashMap<>();
    private int total = 0;

    int pathSum(TreeNode root, int target) {
        prefixCounts.put(0L, 1);            // the empty prefix
        dfs(root, 0L, target);
        return total;
    }

    private void dfs(TreeNode node, long running, int target) {
        if (node == null) return;
        running += node.val;

        total += prefixCounts.getOrDefault(running - target, 0);

        prefixCounts.merge(running, 1, Integer::sum);
        dfs(node.left, running, target);
        dfs(node.right, running, target);
        prefixCounts.merge(running, -1, Integer::sum);   // BACKTRACK
    }
}
// O(n) time, O(h) space
```

The backtracking line is the crux and the thing candidates forget: the map must only contain prefixes on the *current* root-to-node path. Without removing the entry on the way out, sums from a sibling subtree leak in and the count is wrong.

What to say: "This is the same prefix-sum-with-a-hash-map technique as counting subarrays that sum to k, except the array is the current path from the root. The only addition is undoing the map entry as the recursion unwinds, so the map always reflects exactly the current path."

Connecting a tree problem to an array technique you have already explained is a strong move.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any aggregate over a tree: height, sum, count, diameter
- Structural validation: BST, balanced, symmetric, same tree
- Path problems: root-to-leaf, any-to-any, path counting
- Lowest common ancestor and its variants
- Converting a tree to another representation""",
                    ),
                    (
                        "Trade-offs",
                        """- **Shared field versus returned record.** A field is shorter and is not thread-safe or reentrant; a record is cleaner and allocates.
- **One pass versus repeated computation.** Returning several facts at once turns O(n^2) into O(n) — always check whether your helper is being recomputed.
- **Recursive versus iterative.** Recursion suits trees naturally; depth is the risk on degenerate inputs.
- **Global accumulator versus threading the answer through returns.** The accumulator is usually clearer when the answer is not the same shape as the return value.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Validating a BST with only local parent-child comparisons
- Calling a height helper inside a per-node check, creating O(n^2)
- Forgetting to backtrack shared state on the way out of the recursion
- Treating a null child as a leaf in root-to-leaf problems
- Confusing "path through this node" with "path extendable upward"
- Not clamping negative subtree contributions in maximum-path-sum""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What does your recursion return?"** — Have the one-sentence contract ready before you write the body.
- **"Is this O(n) or O(n^2)?"** — Check whether any helper recomputes work the recursion already did.
- **"What if the values can be negative?"** — Clamping and range assumptions change; say what breaks.
- **"What if the tree is very deep?"** — O(h) stack becomes a risk; convert to an explicit stack.
- **"Can you do it without a shared field?"** — Yes, by returning a record with both values.""",
                    ),
                    (
                        "Mini Exercise",
                        """Write the one-sentence contract before coding each:

1. Is the tree height-balanced, in one pass?
2. The diameter of the tree.
3. The maximum path sum, values may be negative.
4. Is the tree symmetric?
5. The lowest common ancestor of two nodes.
6. Count paths summing to a target, paths going downward only.
7. The sum of all root-to-leaf numbers, where each path spells a number.

Number 4 is instructive because the recursion takes *two* nodes rather than one — the contract is "are these two subtrees mirror images?", and realising that the function signature must change is the insight.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the contract out loud before writing the recursion: "This returns the height of the subtree, and as a side effect updates the best diameter seen so far." Interviewers can then verify your logic instantly, and you will catch your own errors while saying it.""",
                    ),
                ],
                [
                    "Decide what each call returns upward and what it receives downward before writing any code.",
                    "When the answer differs from what the parent needs, return the parent's value and record the answer in an accumulator.",
                    "Return a record of several facts to avoid recomputing helpers and turning O(n) into O(n^2).",
                    "Validate a BST with a narrowing range passed down, never with local parent-child comparisons.",
                ],
                [
                    "What does your recursive function return, and what does it pass down?",
                    "How do you compute the diameter, and why are the two final lines different?",
                    "How do you check whether a tree is balanced in one pass?",
                    "Why does local comparison fail when validating a BST?",
                ],
                ["shared-ancestor"],
            ),
            DL(
                "tree-construction",
                "Building and Serialising Trees",
                "Reconstructing a tree from traversals, and turning a tree into a string and back.",
                12,
                "Construction problems invert traversal: given the output of one or two traversals, rebuild the tree. They test whether you understand what each traversal order tells you, and they lead directly into serialisation, which is one of the most commonly asked tree problems.",
                [
                    (
                        "Why It Matters",
                        """"Serialise and deserialise a binary tree" is a standard question at every level, and the follow-ups — making it compact, handling arbitrary values, doing it for a BST more efficiently — probe real understanding rather than recall.

Construction from traversals is also the cleanest way to demonstrate that you know what each order provides: pre-order gives you roots, in-order gives you the left/right split, and one alone is not enough.""",
                    ),
                    (
                        "Mental Model",
                        """Each traversal contributes one piece of information.

| Traversal | Tells you |
| --- | --- |
| Pre-order | The root is first |
| Post-order | The root is last |
| In-order | Everything left of the root is the left subtree |
| Level-order | The root is first, then its children |

A single traversal is ambiguous — many trees produce the same in-order sequence. You need either two traversals, or one traversal that encodes the nulls explicitly.

> Memory cue: pre-order plus in-order identifies the tree. In-order plus post-order does too. Pre-order plus post-order does not, unless the tree is full.""",
                    ),
                    (
                        "How It Works",
                        """### Build from pre-order and in-order

```java
class Solution {
    private int preIndex = 0;
    private Map<Integer, Integer> inorderIndex;

    TreeNode buildTree(int[] preorder, int[] inorder) {
        inorderIndex = new HashMap<>();
        for (int i = 0; i < inorder.length; i++) inorderIndex.put(inorder[i], i);
        return build(preorder, 0, inorder.length - 1);
    }

    private TreeNode build(int[] preorder, int lo, int hi) {
        if (lo > hi) return null;
        int rootValue = preorder[preIndex++];          // pre-order gives the root
        TreeNode root = new TreeNode(rootValue);
        int mid = inorderIndex.get(rootValue);          // in-order gives the split
        root.left = build(preorder, lo, mid - 1);       // left subtree first
        root.right = build(preorder, mid + 1, hi);
        return root;
    }
}
// O(n) time, O(n) space
```

Two points to state: the hash map from value to in-order index removes the linear search that would otherwise make this O(n^2); and the left subtree must be built before the right, because `preIndex` advances in pre-order sequence.

This assumes distinct values. With duplicates the reconstruction is ambiguous, and saying so is the right response to "what if there are duplicates?".

For post-order and in-order, the same code works with the post-order index walked from the end and the *right* subtree built first.

### Serialise and deserialise

```java
String serialize(TreeNode root) {
    StringBuilder sb = new StringBuilder();
    serializeHelper(root, sb);
    return sb.toString();
}

private void serializeHelper(TreeNode node, StringBuilder sb) {
    if (node == null) { sb.append("#,"); return; }     // explicit null marker
    sb.append(node.val).append(',');
    serializeHelper(node.left, sb);
    serializeHelper(node.right, sb);
}

TreeNode deserialize(String data) {
    Deque<String> tokens = new ArrayDeque<>(Arrays.asList(data.split(",")));
    return deserializeHelper(tokens);
}

private TreeNode deserializeHelper(Deque<String> tokens) {
    String token = tokens.poll();
    if (token.equals("#")) return null;
    TreeNode node = new TreeNode(Integer.parseInt(token));
    node.left = deserializeHelper(tokens);
    node.right = deserializeHelper(tokens);
    return node;
}
// O(n) time and space both ways
```

The null marker is what makes a single traversal sufficient: with nulls encoded, pre-order uniquely determines the tree. That is the key insight and the answer to "why do you need the hash symbol?".

Using a deque as a cursor over the tokens keeps the recursion clean — each call consumes exactly what it needs and leaves the rest.

### Serialising a BST more compactly

For a BST you can omit the null markers, because the value range constrains the structure:

```java
TreeNode deserializeBst(Deque<Integer> values, int min, int max) {
    if (values.isEmpty()) return null;
    int value = values.peek();
    if (value < min || value > max) return null;      // belongs to a different subtree
    values.poll();
    TreeNode node = new TreeNode(value);
    node.left = deserializeBst(values, min, value);
    node.right = deserializeBst(values, value, max);
    return node;
}
```

Serialise with a plain pre-order and no markers. This is a genuinely better answer for the BST variant, and offering it when the interviewer says "what if it is a BST?" is exactly the expected response.

### Level-order serialisation

The format used by most online judges: a breadth-first listing with nulls. It is more human-readable, handles wide shallow trees compactly, and is slightly more code. Either format is acceptable; the important thing is to state the format you chose and why it is unambiguous.

### Construction from a sorted array

```java
TreeNode sortedArrayToBST(int[] nums, int lo, int hi) {
    if (lo > hi) return null;
    int mid = lo + (hi - lo) / 2;
    TreeNode node = new TreeNode(nums[mid]);
    node.left = sortedArrayToBST(nums, lo, mid - 1);
    node.right = sortedArrayToBST(nums, mid + 1, hi);
    return node;
}
// O(n) time, O(log n) stack - produces a height-balanced BST
```

Choosing the middle element as the root is what guarantees balance. There are several valid answers depending on which middle you pick for even-sized ranges, and mentioning that the result is not unique is a nice detail.""",
                    ),
                    (
                        "Example",
                        """"Find all duplicate subtrees in a binary tree — subtrees with the same structure and values."

The insight is that serialisation gives you a key, connecting this back to the hashing lesson:

```java
class Solution {
    private final Map<String, Integer> counts = new HashMap<>();
    private final List<TreeNode> out = new ArrayList<>();

    List<TreeNode> findDuplicateSubtrees(TreeNode root) {
        serialize(root);
        return out;
    }

    private String serialize(TreeNode node) {
        if (node == null) return "#";
        String key = node.val + "," + serialize(node.left) + "," + serialize(node.right);
        if (counts.merge(key, 1, Integer::sum) == 2) out.add(node);   // report once
        return key;
    }
}
```

Two details worth explaining: the null marker is essential, because without it `1 -> left 2` and `1 -> right 2` would produce the same key; and adding to the output only when the count reaches exactly 2 reports each duplicate subtree once rather than every time it recurs.

The complexity caveat is also worth volunteering: string concatenation makes each key O(n) in the worst case, so this is O(n^2) overall. Assigning each distinct serialisation an integer id and keying on a triple of ids instead brings it to O(n) — which is the optimisation an interviewer will push for.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Serialising trees for storage or transmission
- Rebuilding a tree from traversal output
- Comparing subtrees for equality via a canonical key
- Building a balanced BST from sorted data
- Cloning a tree""",
                    ),
                    (
                        "Trade-offs",
                        """- **Pre-order with nulls versus two traversals.** One pass and larger output, versus needing both sequences but no markers.
- **Level-order versus pre-order serialisation.** Readable and compact for wide trees, versus simpler recursive code.
- **BST-specific format.** Smaller output by exploiting the ordering, at the cost of only working for BSTs.
- **String keys versus integer ids** for subtree comparison: simple but O(n) per key, versus O(1) comparison with more bookkeeping.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Omitting null markers, making the serialisation ambiguous
- Building the right subtree before the left when consuming pre-order sequentially
- Linear search for the root in the in-order array, giving O(n^2)
- Assuming values are distinct without saying so
- Delimiters that can appear in the values themselves
- Not handling the empty tree in either direction""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why do you need null markers?"** — Without them a single traversal does not determine the tree uniquely.
- **"What if it is a BST?"** — Omit the markers and use the value range to decide where each value belongs.
- **"What if values can be any string?"** — The delimiter must be escaped, or use a length-prefixed encoding.
- **"Can you do it iteratively?"** — Yes, with an explicit stack or a level-order format.
- **"What if there are duplicate values?"** — Reconstruction from two traversals becomes ambiguous; serialisation with markers still works.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Build a tree from pre-order and in-order traversals.
2. Build a tree from in-order and post-order traversals.
3. Serialise and deserialise a general binary tree.
4. Do the same for a BST without null markers.
5. Build a height-balanced BST from a sorted array.
6. Explain why pre-order plus post-order is insufficient for a general binary tree.

Number 6 is the conceptual check: with a node that has exactly one child, pre-order and post-order cannot tell you whether that child is on the left or the right. For a full binary tree, where every node has zero or two children, the ambiguity disappears.""",
                    ),
                    (
                        "Interview Tip",
                        """State your serialisation format explicitly before writing code — "pre-order, comma separated, hash for null" — and say why it is unambiguous. The format is the design decision; the recursion that implements it is mechanical.""",
                    ),
                ],
                [
                    "Pre-order gives the root, in-order gives the left/right split — together they determine the tree.",
                    "A single traversal suffices only if nulls are encoded explicitly.",
                    "Use a value-to-index map when reconstructing, or the linear search makes it O(n^2).",
                    "A BST can be serialised without null markers by using the value range during reconstruction.",
                ],
                [
                    "How do you rebuild a tree from pre-order and in-order traversals?",
                    "Why does serialisation need explicit null markers?",
                    "How would you serialise a BST more compactly?",
                    "Why is pre-order plus post-order insufficient for a general binary tree?",
                ],
            ),
        ],
        roadmap_key="trees",
        practice_tag="tree",
    )


def _bst_topic() -> dict:
    return _dsa_topic(
        "binary-search-tree",
        "Binary Search Trees",
        "The ordering invariant, the operations it enables, and the balanced trees behind TreeMap.",
        "MEDIUM",
        15,
        [
            DL(
                "bst-invariants",
                "BST Invariants and Operations",
                "Every node's whole left subtree is smaller — and the consequences of that one rule.",
                12,
                "A binary search tree maintains one invariant: for every node, all values in its left subtree are smaller and all values in its right subtree are larger. That single rule gives O(h) search, insertion and deletion, and makes an in-order traversal produce sorted output. Almost every BST problem is a direct consequence of it.",
                [
                    (
                        "Why It Matters",
                        """BST questions test whether you reason from the invariant or from a vague sense that "it is sorted somehow". The classic failure — validating a BST by comparing each node only to its immediate children — happens because the candidate never stated the invariant precisely.

The invariant also unlocks optimisations: the lowest common ancestor in a BST is O(h) rather than O(n), and searching for a value does not require visiting both subtrees.""",
                    ),
                    (
                        "Mental Model",
                        """For every node: `max(left subtree) < node.val < min(right subtree)`.

The invariant is about entire subtrees, not immediate children. Three consequences follow:

1. **In-order traversal yields sorted values.** Many BST problems reduce to "do this on a sorted sequence".
2. **Search is a single root-to-leaf path.** Each comparison discards an entire subtree.
3. **All operations are O(h).** That is O(log n) when balanced and O(n) when degenerate — so "what if the tree is a straight line?" is always a valid follow-up.""",
                    ),
                    (
                        "How It Works",
                        """### Search, insert, delete

```java
TreeNode search(TreeNode node, int target) {
    while (node != null && node.val != target) {
        node = target < node.val ? node.left : node.right;
    }
    return node;
}
// O(h) time, O(1) space iteratively
```

```java
TreeNode insert(TreeNode node, int value) {
    if (node == null) return new TreeNode(value);
    if (value < node.val) node.left = insert(node.left, value);
    else if (value > node.val) node.right = insert(node.right, value);
    return node;                                    // equal: ignore, or handle duplicates
}
```

Deletion is the one worth knowing carefully, because it has three cases:

```java
TreeNode delete(TreeNode node, int value) {
    if (node == null) return null;
    if (value < node.val) node.left = delete(node.left, value);
    else if (value > node.val) node.right = delete(node.right, value);
    else {
        if (node.left == null) return node.right;       // 0 or 1 child
        if (node.right == null) return node.left;
        TreeNode successor = node.right;                // 2 children
        while (successor.left != null) successor = successor.left;
        node.val = successor.val;                       // copy the in-order successor
        node.right = delete(node.right, successor.val); // then delete it
    }
    return node;
}
// O(h) time
```

The two-child case is the interesting one: replace the node's value with its in-order successor — the smallest value in the right subtree — then delete that successor, which by construction has at most one child. Using the in-order predecessor works identically.

### Validation, done correctly

```java
boolean isValidBST(TreeNode node, Long min, Long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return isValidBST(node.left, min, (long) node.val)
        && isValidBST(node.right, (long) node.val, max);
}
```

The alternative is in-order traversal with a check that values strictly increase:

```java
private Integer previous = null;

boolean isValidBST(TreeNode node) {
    if (node == null) return true;
    if (!isValidBST(node.left)) return false;
    if (previous != null && node.val <= previous) return false;
    previous = node.val;
    return isValidBST(node.right);
}
```

Both are O(n). The in-order version is often cleaner and generalises to "find the two swapped nodes in a nearly-valid BST", which is a known follow-up.

### Kth smallest

```java
int kthSmallest(TreeNode root, int k) {
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode node = root;
    while (node != null || !stack.isEmpty()) {
        while (node != null) { stack.push(node); node = node.left; }
        node = stack.pop();
        if (--k == 0) return node.val;
        node = node.right;
    }
    return -1;
}
// O(h + k) time, O(h) space - stops early
```

The iterative in-order traversal stops as soon as the kth value is reached, which beats collecting all values. The standard follow-up — "what if kth smallest is queried frequently and the tree is modified?" — is answered by augmenting each node with its subtree size, making the query O(h). That augmentation idea is worth knowing: an order-statistic tree.

### Lowest common ancestor in a BST

```java
TreeNode lca(TreeNode node, TreeNode p, TreeNode q) {
    while (node != null) {
        if (p.val < node.val && q.val < node.val) node = node.left;
        else if (p.val > node.val && q.val > node.val) node = node.right;
        else return node;                    // they split here, or one is this node
    }
    return null;
}
// O(h) time, O(1) space
```

Much simpler than the general binary tree version, because the ordering tells you which way to go. The first node where the two values fall on opposite sides is the LCA.

### Successor and predecessor

```java
TreeNode successor(TreeNode root, TreeNode target) {
    TreeNode result = null, node = root;
    while (node != null) {
        if (target.val < node.val) { result = node; node = node.left; }   // candidate
        else node = node.right;
    }
    return result;
}
```

Keeping the last node where you turned left is the technique. It is the tree equivalent of `ceiling` in a `TreeMap`.""",
                    ),
                    (
                        "Example",
                        """"Two nodes of a BST have been swapped by mistake. Recover the tree without changing its structure."

```java
class Solution {
    private TreeNode first, second, previous;

    void recoverTree(TreeNode root) {
        inorder(root);
        int tmp = first.val; first.val = second.val; second.val = tmp;
    }

    private void inorder(TreeNode node) {
        if (node == null) return;
        inorder(node.left);
        if (previous != null && previous.val > node.val) {
            if (first == null) first = previous;    // first violation: take the larger
            second = node;                          // always update: take the smaller
        }
        previous = node;
        inorder(node.right);
    }
}
// O(n) time, O(h) space
```

The reasoning to narrate: "An in-order traversal of a valid BST is strictly increasing. Swapping two nodes creates either one violation, if the nodes are adjacent in the in-order sequence, or two violations if they are not. On the first violation I record the larger element; on any violation I record the smaller. That single pass handles both cases without branching on which situation I am in."

The adjacent-versus-separated distinction is the whole difficulty, and handling both with one rule is the elegant part.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Ordered sets and maps with range queries
- Kth smallest or largest, and rank queries
- Nearest-value lookups: floor, ceiling, successor, predecessor
- Maintaining a sorted collection under insertions and deletions
- Interval and scheduling structures""",
                    ),
                    (
                        "Trade-offs",
                        """- **BST versus hash map.** O(log n) with ordering, range queries and sorted iteration, versus expected O(1) with none of those.
- **BST versus sorted array.** O(log n) insertion versus O(n) insertion but better cache locality and O(1) indexed access.
- **Unbalanced versus balanced.** A plain BST degrades to O(n) on sorted insertions; self-balancing variants guarantee O(log n).
- **Recursive versus iterative.** Iterative search is O(1) space; recursion costs O(h).""",
                    ),
                    (
                        "Common Mistakes",
                        """- Validating with local parent-child comparisons only
- Forgetting that equal values must be handled explicitly by a stated policy
- Using `Integer.MIN_VALUE` as a sentinel bound when a node may hold that value
- Assuming O(log n) without mentioning that a degenerate tree is O(n)
- Getting the two-child deletion case wrong
- Collecting the entire in-order traversal when an early exit would do""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if the tree is unbalanced?"** — Everything becomes O(n); a self-balancing tree or a rebuild fixes it.
- **"How do you handle duplicates?"** — Decide a policy: reject, keep a count per node, or always insert to one side. State it.
- **"Can you do kth smallest faster than O(k)?"** — Augment nodes with subtree sizes for O(h).
- **"How do you delete a node with two children?"** — Replace with the in-order successor, then delete that successor.
- **"Why is LCA easier in a BST?"** — The ordering tells you which subtree contains each node, so no exploration is needed.""",
                    ),
                    (
                        "Mini Exercise",
                        """Implement each and state the complexity in terms of h:

1. Search for a value iteratively.
2. Insert a value.
3. Delete a value, handling all three cases.
4. Validate the BST invariant.
5. Find the kth smallest with an early exit.
6. Find the in-order successor of a given node.
7. Convert a BST into a sorted doubly linked list in place.

Number 7 is a good synthesis: it is an in-order traversal where the "work" is relinking pointers, and recognising that makes an intimidating problem routine.""",
                    ),
                    (
                        "Interview Tip",
                        """State the invariant in full before writing anything: "every value in the left subtree is less than the node, and every value in the right subtree is greater — for the whole subtree, not just the children." That precision is exactly what prevents the most common BST bug.""",
                    ),
                ],
                [
                    "The invariant constrains entire subtrees, not just immediate children — which is why local validation fails.",
                    "In-order traversal of a BST is sorted, so many BST problems reduce to sorted-sequence problems.",
                    "All operations are O(h): O(log n) balanced, O(n) degenerate. Always say both.",
                    "Delete a two-child node by copying the in-order successor's value and deleting the successor.",
                ],
                [
                    "How do you validate a BST correctly?",
                    "How do you delete a node with two children?",
                    "Why is the lowest common ancestor easier in a BST than a general binary tree?",
                    "What happens to the complexity if the tree is unbalanced?",
                ],
                ["shared-ancestor"],
            ),
            DL(
                "balanced-trees-and-treemap",
                "Balanced Trees and TreeMap",
                "Why self-balancing matters, what rotations do, and how to use TreeMap when a hash map is not enough.",
                11,
                "A plain BST degrades to a linked list when values arrive in sorted order, which is exactly what happens with timestamps, ids, and any real ordered data. Self-balancing trees fix that with rotations, and in Java you almost always consume them through TreeMap rather than implementing one. Knowing when to reach for TreeMap is worth more in an interview than being able to write a red-black tree.",
                [
                    (
                        "Why It Matters",
                        """Several interview problems have a clean O(n log n) solution using an ordered map and a painful O(n^2) one without — nearest-value queries within a window, interval scheduling with lookups, and "find the smallest element greater than x" are all examples.

Candidates who only know `HashMap` end up writing linear scans. Recognising that you need *order* and reaching for `TreeMap` is a small piece of knowledge with a large payoff.""",
                    ),
                    (
                        "Mental Model",
                        """Balancing keeps the height O(log n) by restructuring after modifications.

Insert → detect imbalance → rotate → height stays O(log n)

| Structure | Balance rule | Notes |
| --- | --- | --- |
| AVL | Heights of subtrees differ by at most 1 | Stricter balance, faster lookups, more rotations |
| Red-black | No path is more than twice another | Fewer rotations, faster modification — what TreeMap uses |
| B-tree | Many keys per node | Disk and database indexes, fewer nodes touched per lookup |
| Skip list | Probabilistic layers | Simpler to implement, expected O(log n) |

You will not be asked to implement red-black insertion. You may be asked what a rotation does and why balancing matters.""",
                    ),
                    (
                        "How It Works",
                        """### Rotations

A rotation restructures three nodes while preserving the BST invariant. A right rotation about node `y` with left child `x` makes `x` the new root of that subtree, `y` becomes `x`'s right child, and `x`'s old right subtree becomes `y`'s left subtree.

```java
TreeNode rotateRight(TreeNode y) {
    TreeNode x = y.left;
    y.left = x.right;
    x.right = y;
    return x;                  // new subtree root
}
```

The property to state: in-order order is unchanged, and the height of the heavy side decreases by one. That is all a rotation does, and it is all you need to say.

### Why balance matters

Inserting `1, 2, 3, 4, 5` into an unbalanced BST produces a right-leaning chain with height 5 — every operation becomes O(n). Real data is frequently sorted or nearly sorted, so this is not a hypothetical.

Self-balancing guarantees O(log n) for search, insert and delete, at the cost of rotation work on modification and a little extra memory per node for the balance metadata.

### TreeMap in practice

This is the part that pays off in interviews.

```java
TreeMap<Integer, String> map = new TreeMap<>();

map.firstKey();              // smallest key
map.lastKey();               // largest
map.floorKey(x);             // greatest key <= x
map.ceilingKey(x);           // smallest key >= x
map.lowerKey(x);             // greatest key strictly < x
map.higherKey(x);            // smallest key strictly > x
map.headMap(x);              // view of keys < x
map.tailMap(x);              // view of keys >= x
map.subMap(lo, hi);          // view of keys in [lo, hi)
map.pollFirstEntry();        // remove and return the smallest
```

All O(log n). `TreeSet` offers the same navigation without values.

The recognition rule: **if the problem needs "the nearest value", "the next larger", or "everything in this range", a hash map cannot do it and a TreeMap can.**

### Using TreeMap as a multiset

```java
TreeMap<Integer, Integer> counts = new TreeMap<>();

void add(int x) { counts.merge(x, 1, Integer::sum); }

void remove(int x) {
    if (counts.merge(x, -1, Integer::sum) == 0) counts.remove(x);   // essential
}

int min() { return counts.firstKey(); }
int max() { return counts.lastKey(); }
```

Removing zero-count entries is mandatory; leaving them corrupts `firstKey`, `size` and every range query.

### Interval maps

A particularly useful pattern: store intervals keyed by start, and use `floorEntry` to find the interval that might contain a point.

```java
// Calendar booking: reject overlapping intervals
TreeMap<Integer, Integer> calendar = new TreeMap<>();

boolean book(int start, int end) {
    Integer previous = calendar.floorKey(start);
    Integer next = calendar.ceilingKey(start);
    if (previous != null && calendar.get(previous) > start) return false;
    if (next != null && next < end) return false;
    calendar.put(start, end);
    return true;
}
// O(log n) per booking
```

Checking only the nearest interval on each side is sufficient because non-overlapping intervals are ordered — a useful observation that generalises to many interval problems.

### Alternatives

- **PriorityQueue** gives you the minimum in O(1) and cannot answer "nearest to x" or remove arbitrary elements efficiently.
- **Sorted array with binary search** is faster for lookups and O(n) for insertion — right for static data.
- **Skip list** is the structure behind `ConcurrentSkipListMap`, which is the concurrent ordered map.""",
                    ),
                    (
                        "Example",
                        """"Design a structure supporting insert, delete, and query for the value closest to a target, all in O(log n)."

```java
class ClosestValueSet {
    private final TreeMap<Integer, Integer> counts = new TreeMap<>();

    void insert(int x) { counts.merge(x, 1, Integer::sum); }

    void delete(int x) {
        Integer c = counts.get(x);
        if (c == null) return;
        if (c == 1) counts.remove(x); else counts.put(x, c - 1);
    }

    Integer closest(int target) {
        Integer below = counts.floorKey(target);
        Integer above = counts.ceilingKey(target);
        if (below == null) return above;
        if (above == null) return below;
        return (target - below <= above - target) ? below : above;
    }
}
```

What to say: "A hash map gives O(1) insert and delete but cannot answer the closest-value query without scanning everything. A TreeMap keeps the keys ordered, so `floorKey` and `ceilingKey` give the two candidates in O(log n) and the answer is whichever is nearer. I use counts rather than a set so duplicates are handled, and I remove the key entirely at zero so the navigation methods stay correct.

The tie-breaking rule — preferring the lower value on an equal distance — is a decision I would confirm with you rather than assume."

Naming the tie-break as a question rather than silently choosing is the kind of detail that reads as careful.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Nearest-value, floor, and ceiling queries
- Range queries over keys
- Interval and calendar scheduling
- Sliding windows that need order statistics
- Leaderboards and rank queries, with subtree-size augmentation""",
                    ),
                    (
                        "Trade-offs",
                        """- **TreeMap versus HashMap.** O(log n) with ordering and range queries, versus expected O(1) with neither.
- **AVL versus red-black.** Stricter balance and faster lookups versus fewer rotations and faster modification — which is why library maps use red-black.
- **Tree versus sorted array.** O(log n) insertion versus better locality and O(1) indexing for static data.
- **Tree versus heap.** A heap gives only the extreme in O(1); a tree gives arbitrary order statistics and deletion.
- **Implementing versus using.** Writing a balanced tree in an interview is almost never the right use of time; say you would use `TreeMap` and explain what it provides.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using `HashMap` when the problem needs ordering, then scanning
- Leaving zero-count entries in a TreeMap multiset
- Forgetting that `TreeMap` rejects null keys
- Assuming `TreeMap` operations are O(1)
- Using a `PriorityQueue` when arbitrary deletion is required
- Attempting to implement red-black insertion under time pressure""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why not a HashMap here?"** — The query needs order, which hashing destroys.
- **"What does a rotation do?"** — Restructures three nodes, preserves in-order ordering, reduces the height of the heavy side.
- **"Why does TreeMap use red-black rather than AVL?"** — Fewer rotations per modification, which suits general-purpose workloads.
- **"How would you get the rank of an element?"** — Augment nodes with subtree sizes; `TreeMap` does not expose this, so you would implement it or maintain a Fenwick tree alongside.
- **"What if you need this concurrently?"** — `ConcurrentSkipListMap`, which is lock-free and gives the same ordered operations.""",
                    ),
                    (
                        "Mini Exercise",
                        """Decide HashMap, TreeMap, heap, or sorted array for each:

1. Count word frequencies.
2. Find the smallest key greater than x.
3. Retrieve the k smallest elements repeatedly as items arrive.
4. Book meetings, rejecting overlaps.
5. Find, for each element, the nearest earlier element within a value range.
6. Maintain a leaderboard supporting "what rank is this score?".

Number 6 is the one `TreeMap` cannot do directly — rank requires subtree sizes, so the answer is an augmented tree or a Fenwick tree over the score range. Knowing the limit of the standard library is as useful as knowing its capabilities.""",
                    ),
                    (
                        "Interview Tip",
                        """When a problem needs the nearest key, a range, or ordered iteration, say "this needs an ordered map, so `TreeMap` with `floorKey` and `ceilingKey` at O(log n)". Naming the exact methods signals practical familiarity rather than textbook knowledge.""",
                    ),
                ],
                [
                    "Unbalanced BSTs degrade to O(n) on sorted input, which is common in real data.",
                    "A rotation preserves in-order ordering and reduces the height of the heavy side — that is all you need to explain.",
                    "Reach for TreeMap when the problem needs nearest-value, range, or ordered iteration; a HashMap cannot provide them.",
                    "Remove zero-count entries when using TreeMap as a multiset, or the navigation methods break.",
                ],
                [
                    "Why does a plain BST degrade, and what fixes it?",
                    "When would you use a TreeMap instead of a HashMap?",
                    "What does a tree rotation actually do?",
                    "How would you answer rank queries, which TreeMap does not support?",
                ],
            ),
        ],
        practice_tag="tree",
    )


def _heap_topic() -> dict:
    return _dsa_topic(
        "heap",
        "Heaps and Priority Queues",
        "Partial ordering for O(log n) extremes, the top-k pattern, and two heaps for a running median.",
        "MEDIUM",
        16,
        [
            DL(
                "priority-queues",
                "Heaps and Priority Queues",
                "Why a heap beats a sorted structure when you only ever need the extreme.",
                12,
                "A heap maintains just enough order to know the minimum or maximum in O(1), with O(log n) insertion and removal. That partial ordering is much cheaper than full sorting, and it is exactly what you need whenever a problem repeatedly asks for the best remaining item.",
                [
                    (
                        "Why It Matters",
                        """Any problem phrased as "repeatedly take the smallest", "merge k sorted things", "the k largest", or "schedule by priority" is a heap problem. Recognising the phrasing is most of the work.

Heaps also appear inside other algorithms — Dijkstra, Huffman coding, and k-way merges all depend on one — so understanding the cost of `offer` and `poll` is needed to state those complexities correctly.""",
                    ),
                    (
                        "Mental Model",
                        """A complete binary tree stored in an array, where each parent is at least as extreme as its children.

- **Heap property**: parent <= children for a min-heap. There is no ordering *between* siblings, which is why it is cheaper than a sorted structure.
- **Array layout**: children of index `i` are at `2i + 1` and `2i + 2`; the parent is at `(i - 1) / 2`. No pointers, excellent cache behaviour.

| Operation | Cost |
| --- | --- |
| Peek the extreme | O(1) |
| Insert | O(log n) |
| Remove the extreme | O(log n) |
| Build from n items | O(n) — not O(n log n) |
| Search for an arbitrary value | O(n) |
| Remove an arbitrary value | O(n) to find, O(log n) to remove |

The last two are the limitations that decide when a heap is the wrong choice.""",
                    ),
                    (
                        "How It Works",
                        """### Java usage

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();                         // natural order
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
PriorityQueue<int[]> byDistance = new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));

minHeap.offer(5);      // O(log n)
minHeap.peek();        // O(1), null if empty
minHeap.poll();        // O(log n), null if empty
```

`PriorityQueue` in Java is a min-heap by default. Getting a max-heap requires a reversed comparator, and forgetting that is a common slip.

Two behaviours that surprise people: iterating a `PriorityQueue` does **not** produce sorted order — only polling does — and `remove(Object)` is O(n) because it must search.

### Sift up and sift down

```java
// Insert: place at the end, then sift up while smaller than the parent
void siftUp(int[] heap, int i) {
    while (i > 0) {
        int parent = (i - 1) / 2;
        if (heap[parent] <= heap[i]) break;
        swap(heap, i, parent);
        i = parent;
    }
}

// Remove the root: move the last element to the root, then sift down
void siftDown(int[] heap, int i, int size) {
    while (true) {
        int smallest = i, left = 2 * i + 1, right = 2 * i + 2;
        if (left < size && heap[left] < heap[smallest]) smallest = left;
        if (right < size && heap[right] < heap[smallest]) smallest = right;
        if (smallest == i) break;
        swap(heap, i, smallest);
        i = smallest;
    }
}
```

Both walk one root-to-leaf path, so both are O(log n).

### Building a heap in O(n)

Sifting down from the last internal node backwards builds a heap in linear time, not O(n log n):

```java
for (int i = n / 2 - 1; i >= 0; i--) siftDown(heap, i, n);
```

The argument: most nodes are near the leaves and sift down very little. Summing `height * count` across levels gives a series that converges to O(n). This is a favourite follow-up and the answer is worth having ready — `new PriorityQueue<>(collection)` uses exactly this.

### Top k, and the counter-intuitive heap choice

```java
int[] topK(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();   // MIN-heap for the k LARGEST
    for (int x : nums) {
        heap.offer(x);
        if (heap.size() > k) heap.poll();                  // evict the smallest
    }
    return heap.stream().mapToInt(Integer::intValue).toArray();
}
// O(n log k) time, O(k) space
```

The rule: **to keep the k largest, use a min-heap of size k**, so the weakest of your current best sits at the top and is the cheapest to discard. Reversing this is the most common top-k bug.

Compared to sorting at O(n log n), this is better when k is much smaller than n, and it works on a stream where sorting does not.

### Merging k sorted sources

```java
ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));
    for (ListNode l : lists) if (l != null) heap.offer(l);

    ListNode dummy = new ListNode(0), tail = dummy;
    while (!heap.isEmpty()) {
        ListNode node = heap.poll();
        tail.next = node; tail = node;
        if (node.next != null) heap.offer(node.next);
    }
    return dummy.next;
}
// O(N log k) time, O(k) space
```

The heap holds one candidate per source, which is what makes it O(k) space and O(log k) per element.

### Lazy deletion

Heaps cannot remove an arbitrary element efficiently. The standard workaround is to mark it deleted and discard it when it surfaces:

```java
// Keep a map of pending removals; before using the top, discard any that are stale.
while (!heap.isEmpty() && pendingRemoval.getOrDefault(heap.peek(), 0) > 0) {
    pendingRemoval.merge(heap.poll(), -1, Integer::sum);
}
```

This keeps amortised O(log n) and is the technique behind sliding-window medians and several scheduling problems. If you need real arbitrary deletion, a `TreeMap` multiset is the better structure.""",
                    ),
                    (
                        "Example",
                        """"Given n tasks each taking one unit of time and a cooldown of n units between identical tasks, find the minimum time to finish."

```java
int leastInterval(char[] tasks, int cooldown) {
    int[] counts = new int[26];
    for (char t : tasks) counts[t - 'A']++;

    PriorityQueue<Integer> heap = new PriorityQueue<>(Comparator.reverseOrder());
    for (int c : counts) if (c > 0) heap.offer(c);

    int time = 0;
    while (!heap.isEmpty()) {
        List<Integer> cycle = new ArrayList<>();
        for (int i = 0; i <= cooldown && !heap.isEmpty(); i++) {
            cycle.add(heap.poll());                 // take the most frequent available
        }
        for (int remaining : cycle) {
            if (remaining > 1) heap.offer(remaining - 1);
        }
        time += heap.isEmpty() ? cycle.size() : cooldown + 1;   // last cycle needs no idling
    }
    return time;
}
// O(n log 26) = O(n) time, O(1) space
```

The greedy argument to state: "At every step I should schedule the task with the most remaining instances, because delaying it risks forced idle time later. A max-heap gives me that in O(log k). The final cycle does not need padding to the full cooldown length, which is the `heap.isEmpty()` check."

There is also a closed-form arithmetic solution, and mentioning that the heap version generalises better while the formula is faster is a good comparison to offer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Top k largest, smallest, closest, or most frequent
- Merging k sorted sequences
- Scheduling by priority or deadline
- Dijkstra and other best-first searches
- Running medians and percentiles, with two heaps""",
                    ),
                    (
                        "Trade-offs",
                        """- **Heap versus sorting.** O(n log k) and streams, versus O(n log n) and gives full order.
- **Heap versus quickselect.** Guaranteed bound and streaming, versus O(n) average in place for a single kth element.
- **Heap versus TreeMap.** O(1) extreme access, versus arbitrary deletion and order statistics at O(log n).
- **Lazy deletion.** Keeps the heap usable with arbitrary removals, at the cost of extra memory and stale entries.
- **Build cost.** Building from a collection is O(n); inserting one by one is O(n log n).""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using a max-heap when tracking the k largest
- Assuming iteration over a `PriorityQueue` is sorted
- Calling `remove(Object)` in a loop, making it O(n^2)
- Forgetting the reversed comparator for a max-heap in Java
- Claiming O(n log n) for heap construction when it is O(n)
- Using a heap where arbitrary deletion is required""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why a min-heap for the k largest?"** — The top is the weakest of the current best k, so it is the one to evict.
- **"How fast can you build a heap?"** — O(n) by sifting down from the last internal node; explain the summation argument.
- **"Can you remove an arbitrary element?"** — Not efficiently; lazy deletion or a TreeMap multiset.
- **"What if the data streams?"** — A size-k heap is the natural answer and uses bounded memory.
- **"Heap or quickselect?"** — Streaming and all-k favours the heap; a single kth element from a mutable array favours quickselect.""",
                    ),
                    (
                        "Mini Exercise",
                        """Choose the heap type and size, and state the complexity:

1. The 10 largest of a billion streamed numbers.
2. Merge 100 sorted files too large for memory.
3. The k closest points to the origin.
4. The kth smallest element in a sorted matrix.
5. Reorganise a string so no two adjacent characters are equal.
6. Minimum number of meeting rooms needed for a set of intervals.

Number 6 is a good one to notice: sort by start time, then a min-heap of end times tracks how many rooms are in use, and the heap size is the answer. It connects heaps to the intervals module.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the heap type and size in one sentence when you introduce it: "a min-heap of size k, so the smallest of my current best k is on top and gets evicted." That single sentence prevents the most common top-k mistake and shows you know why the choice is what it is.""",
                    ),
                ],
                [
                    "A heap gives O(1) access to the extreme with O(log n) insert and remove, and no ordering between siblings.",
                    "To keep the k largest, use a min-heap of size k and evict the top.",
                    "Building a heap from n items is O(n), not O(n log n) — know the summation argument.",
                    "Heaps cannot delete arbitrary elements efficiently; use lazy deletion or a TreeMap multiset.",
                ],
                [
                    "Why use a min-heap to track the k largest elements?",
                    "How fast can you build a heap from an unsorted array, and why?",
                    "What are the limitations of a heap compared to a balanced tree?",
                    "When would you prefer quickselect over a heap?",
                ],
                ["minimum-tracker-stack"],
            ),
            DL(
                "top-k-and-streaming",
                "Two Heaps, Streaming, and Order Statistics",
                "Running medians, percentiles, and the problems where data arrives continuously.",
                12,
                "Some problems require an order statistic that must stay current as data arrives — the median of a stream, the k closest so far, a rolling percentile. The two-heap technique maintains a split at exactly the point you care about, and the streaming constraint rules out any solution that needs to see all the data at once.",
                [
                    (
                        "Why It Matters",
                        """"Design a structure that returns the median of all numbers added so far" is a standard question, and it has a clean answer that candidates either know or spend twenty minutes rediscovering. The technique generalises to any fixed quantile and to sliding windows.

Streaming constraints also test whether you can distinguish "I need all the data" from "I need a bounded summary of it", which is the same distinction that matters in system design.""",
                    ),
                    (
                        "Mental Model",
                        """Split the data at the point of interest and keep both halves as heaps facing each other.

max-heap (smaller half) <- median -> min-heap (larger half)

- The **max-heap** holds the smaller half, so its top is the largest of the small values.
- The **min-heap** holds the larger half, so its top is the smallest of the large values.
- The median is one of those two tops, or their average.

Maintain the invariant that the sizes differ by at most one, and that every value in the max-heap is at most every value in the min-heap.""",
                    ),
                    (
                        "How It Works",
                        """### Median of a data stream

```java
class MedianFinder {
    private final PriorityQueue<Integer> low  = new PriorityQueue<>(Comparator.reverseOrder());
    private final PriorityQueue<Integer> high = new PriorityQueue<>();

    void addNum(int num) {
        low.offer(num);                 // always insert into low first
        high.offer(low.poll());         // move its largest across, preserving the split
        if (high.size() > low.size()) {
            low.offer(high.poll());     // rebalance so low is never smaller
        }
    }

    double findMedian() {
        if (low.size() > high.size()) return low.peek();
        return (low.peek() + high.peek()) / 2.0;
    }
}
// O(log n) per insertion, O(1) per query, O(n) space
```

The three-line insertion is the elegant part, and explaining why it works is the answer: "Inserting into `low` and immediately moving its maximum to `high` guarantees the ordering invariant without any comparison. The rebalance then fixes the sizes. Two unconditional moves are easier to get right than a branch on which heap the value belongs in."

The alternative with explicit comparisons works too and has more edge cases to get wrong.

### Sliding-window median

The same structure, plus removal when an element leaves the window — which heaps do not support directly. Two approaches:

- **Lazy deletion**: keep a map of values pending removal, and discard them when they reach a heap top. Track the effective sizes separately from the actual heap sizes.
- **TreeMap multiset**: supports O(log k) arbitrary removal directly, at the cost of slower constants.

Naming the difficulty — "heaps cannot remove an arbitrary element, so I need lazy deletion or an ordered multiset" — is more important than writing either from memory.

### K closest points, streaming

```java
int[][] kClosest(int[][] points, int k) {
    PriorityQueue<int[]> heap = new PriorityQueue<>(
        Comparator.comparingInt(p -> -(p[0] * p[0] + p[1] * p[1])));   // max-heap by distance

    for (int[] p : points) {
        heap.offer(p);
        if (heap.size() > k) heap.poll();       // discard the farthest
    }
    return heap.toArray(new int[0][]);
}
// O(n log k) time, O(k) space
```

A **max**-heap here, because we are keeping the k *smallest* distances and want to evict the largest. This is the mirror of the top-k rule and it is worth stating the symmetry: to keep the k smallest, use a max-heap; to keep the k largest, use a min-heap.

Note also that comparing squared distances avoids a square root, which is both faster and avoids floating-point comparison issues.

### Bounded memory and streaming

The general pattern: when data is unbounded, you cannot store it all, so the question becomes what bounded summary suffices.

| Query | Bounded structure | Memory |
| --- | --- | --- |
| Top k | Heap of size k | O(k) |
| Exact median | Two heaps | O(n) — unavoidable for exact |
| Approximate quantiles | t-digest or reservoir sample | O(1) or O(sample) |
| Distinct count | HyperLogLog | O(1) approximate |
| Any element uniformly at random | Reservoir sampling | O(1) |

Exact median over an unbounded stream genuinely requires O(n) memory, and saying so — rather than inventing a constant-memory exact answer — is the correct response. If approximation is acceptable, quantile sketches give bounded memory, and that is the right follow-up answer.

### Reservoir sampling

Worth knowing as the companion technique for streams of unknown length:

```java
int pick(Iterator<Integer> stream) {
    int result = 0, count = 0;
    Random rand = new Random();
    while (stream.hasNext()) {
        int value = stream.next();
        count++;
        if (rand.nextInt(count) == 0) result = value;   // keep with probability 1/count
    }
    return result;
}
// O(n) time, O(1) space, uniform over the stream
```

The proof sketch: the ith element is kept with probability `1/i` and survives all later replacements with probability `i/n`, giving `1/n` overall. Being able to state that briefly is the expected depth.""",
                    ),
                    (
                        "Example",
                        """"Design a leaderboard supporting `addScore`, `top(k)` returning the sum of the k highest scores, and `reset(playerId)`."

```java
class Leaderboard {
    private final Map<Integer, Integer> scores = new HashMap<>();

    void addScore(int playerId, int score) {
        scores.merge(playerId, score, Integer::sum);
    }

    int top(int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>();      // min-heap of size k
        for (int s : scores.values()) {
            heap.offer(s);
            if (heap.size() > k) heap.poll();
        }
        int sum = 0;
        for (int s : heap) sum += s;
        return sum;
    }

    void reset(int playerId) { scores.remove(playerId); }
}
// addScore and reset O(1); top(k) is O(n log k)
```

What to say: "A hash map handles add and reset in O(1). The `top` query needs the k largest, so a min-heap of size k gives O(n log k) per call.

If `top` were called far more often than `addScore`, I would instead maintain a `TreeMap<score, count>` so `top(k)` walks down from the highest scores in O(k log n), at the cost of making `addScore` O(log n). The right structure depends on the read-to-write ratio, which I would ask about."

Offering both designs and making the choice depend on a stated access pattern is exactly the reasoning that distinguishes a design answer from a coding answer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Running medians and percentiles
- Top k over a stream with bounded memory
- K closest or k most similar items
- Leaderboards and rank queries
- Sampling from a stream of unknown length""",
                    ),
                    (
                        "Trade-offs",
                        """- **Exact versus approximate.** Exact quantiles need O(n) memory; sketches give bounded memory with error guarantees.
- **Two heaps versus an ordered multiset.** Better constants versus support for arbitrary deletion.
- **Recompute versus maintain.** Recomputing top-k per query is simple and O(n log k); maintaining an ordered structure shifts cost to writes.
- **Squared versus actual distances.** Comparing squares avoids a square root and floating-point comparison issues.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Getting the heap directions backwards in the two-heap median
- Forgetting to rebalance after insertion, so the size invariant breaks
- Using a min-heap when keeping the k smallest
- Claiming constant memory for an exact streaming median
- Ignoring that heaps cannot remove arbitrary elements when the window slides
- Integer overflow when summing or squaring large coordinates""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you keep the two heaps balanced?"** — Insert into one, move its top across, then rebalance sizes. Two unconditional moves, no branching.
- **"What if elements are removed?"** — Heaps do not support it; lazy deletion or a TreeMap multiset.
- **"Can you do the median in O(1) memory?"** — Not exactly. With approximation, quantile sketches; say which guarantee you are giving up.
- **"What if the numbers are bounded integers?"** — A counting array with a running count finds the median in O(range), which can beat the heaps.
- **"How would you sample one element uniformly from a stream?"** — Reservoir sampling, with the probability argument.""",
                    ),
                    (
                        "Mini Exercise",
                        """Design each and state the memory:

1. Median of a growing stream of integers.
2. Median of the last k values.
3. The 100 most frequent words in a very large document.
4. A uniformly random element from a stream of unknown length.
5. The 95th percentile latency over a rolling hour.
6. The k closest points to a query point, from a static set.

Number 5 is where exactness becomes impractical: storing every latency for an hour at high traffic is unaffordable, so the real answer is a quantile sketch or bucketed histogram. Recognising when the interview problem becomes a systems problem is the point.""",
                    ),
                    (
                        "Interview Tip",
                        """State the invariant of the two heaps before writing the code: "the max-heap holds the smaller half, the min-heap the larger half, and their sizes never differ by more than one." Everything in the implementation follows from that sentence, and it is much easier to verify than the code.""",
                    ),
                ],
                [
                    "Two heaps facing each other maintain a split at the median: max-heap below, min-heap above.",
                    "Insert into one heap and move its top across, then rebalance sizes — two unconditional moves avoid branching bugs.",
                    "Keep the k largest with a min-heap and the k smallest with a max-heap.",
                    "Exact streaming medians need O(n) memory; approximate quantiles need a sketch, and saying so is the correct answer.",
                ],
                [
                    "How do you maintain the median of a stream?",
                    "What breaks when the window slides and elements must be removed?",
                    "Can you compute an exact median with constant memory?",
                    "How would you sample uniformly from a stream of unknown length?",
                ],
            ),
        ],
        roadmap_key="heap",
        practice_tag="queue",
    )


def _tries_topic() -> dict:
    return _dsa_topic(
        "tries",
        "Tries",
        "Prefix trees for dictionary problems, and the applications where a trie beats a hash set decisively.",
        "MEDIUM",
        17,
        [
            DL(
                "prefix-trees",
                "Prefix Trees",
                "Sharing prefixes turns a dictionary into a structure you can walk one character at a time.",
                12,
                "A trie stores strings as paths through a tree, one character per edge, so words sharing a prefix share a path. That structure makes prefix queries O(length) regardless of how many words are stored, which is something no hash set can do.",
                [
                    (
                        "Why It Matters",
                        """The trigger is specific: if a problem involves prefixes, autocomplete, or matching many words at once against a text or a grid, it is a trie. A hash set answers "is this exact word present?" and cannot answer "does any word start with this?" without scanning everything.

Tries also unlock the grid word-search problem that is otherwise hopeless: searching a board for 10,000 words individually is impossible, but walking the board once against a trie of all of them is fast.""",
                    ),
                    (
                        "Mental Model",
                        """A tree where the path from the root spells a string, and nodes mark word endings.

root → c → a → t (end of word)

| Operation | Cost |
| --- | --- |
| Insert a word of length L | O(L) |
| Search for an exact word | O(L) |
| Check whether any word has a prefix | O(L) |
| Collect all words with a prefix | O(L + output) |
| Space | O(total characters), worst case |

Notice what is absent from every row: the number of words stored. That independence is the whole reason to use a trie.""",
                    ),
                    (
                        "How It Works",
                        """### Implementation

```java
class Trie {
    private static class Node {
        Node[] children = new Node[26];     // lowercase a-z
        boolean isWord;
    }

    private final Node root = new Node();

    void insert(String word) {
        Node node = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (node.children[i] == null) node.children[i] = new Node();
            node = node.children[i];
        }
        node.isWord = true;
    }

    boolean search(String word) {
        Node node = find(word);
        return node != null && node.isWord;
    }

    boolean startsWith(String prefix) {
        return find(prefix) != null;
    }

    private Node find(String s) {
        Node node = root;
        for (char c : s.toCharArray()) {
            node = node.children[c - 'a'];
            if (node == null) return null;
        }
        return node;
    }
}
```

The `isWord` flag is what distinguishes a stored word from a prefix of one — without it, `search("ca")` would return true after inserting `cat`. That flag is the most commonly forgotten detail.

**Array versus map for children.** An `int[26]` array is fast and uses 26 references per node even when only one is used. A `HashMap<Character, Node>` is compact for sparse tries and supports any alphabet, at the cost of hashing per step. State the assumption: "array of 26, assuming lowercase English; I would switch to a map for Unicode."

### Deletion

```java
boolean delete(Node node, String word, int depth) {
    if (depth == word.length()) {
        if (!node.isWord) return false;
        node.isWord = false;
        return isEmpty(node);                 // can this node be pruned?
    }
    int i = word.charAt(depth) - 'a';
    Node child = node.children[i];
    if (child == null) return false;
    if (delete(child, word, depth + 1)) {
        node.children[i] = null;
        return !node.isWord && isEmpty(node);
    }
    return false;
}
```

Deletion must only prune nodes that are not part of another word and are not word endings themselves. Getting this wrong removes unrelated entries, and it is the reason many implementations simply clear the flag and skip pruning — which is a legitimate choice if memory is not tight, and worth saying out loud.

### Wildcard search

```java
boolean search(Node node, String pattern, int index) {
    if (node == null) return false;
    if (index == pattern.length()) return node.isWord;
    char c = pattern.charAt(index);
    if (c == '.') {
        for (Node child : node.children) {
            if (search(child, pattern, index + 1)) return true;
        }
        return false;
    }
    return search(node.children[c - 'a'], pattern, index + 1);
}
```

A `.` branches into every child, which is why worst-case wildcard search is O(26^d) for d wildcards. The structure makes this natural; a hash set makes it impossible.

### Collecting words with a prefix

```java
List<String> withPrefix(String prefix) {
    List<String> out = new ArrayList<>();
    Node start = find(prefix);
    if (start != null) collect(start, new StringBuilder(prefix), out);
    return out;
}

private void collect(Node node, StringBuilder path, List<String> out) {
    if (node.isWord) out.add(path.toString());
    for (int i = 0; i < 26; i++) {
        if (node.children[i] == null) continue;
        path.append((char) ('a' + i));
        collect(node.children[i], path, out);
        path.deleteCharAt(path.length() - 1);     // backtrack
    }
}
```

The append-recurse-remove pattern is the backtracking idiom, and using a single shared `StringBuilder` rather than building strings per call is the efficient form.

### Trie versus hash set

| Query | Hash set | Trie |
| --- | --- | --- |
| Exact word present | O(L) expected | O(L) |
| Any word with this prefix | O(n * L) scan | O(L) |
| All words with this prefix | O(n * L) scan | O(L + output) |
| Wildcard patterns | Not supported | Natural |
| Memory | Compact | Higher, unless prefixes are heavily shared |
| Lexicographic iteration | Requires sorting | Free, by child order |

The one-line summary: use a hash set for exact membership, and a trie the moment prefixes matter.""",
                    ),
                    (
                        "Example",
                        """"Design an autocomplete that returns the top three historical sentences matching a typed prefix, ranked by frequency then lexicographically."

```java
class AutocompleteSystem {
    private static class Node {
        Map<Character, Node> children = new HashMap<>();
        Map<String, Integer> counts = new HashMap<>();   // sentences through this node
    }

    private final Node root = new Node();
    private Node current = root;
    private final StringBuilder typed = new StringBuilder();

    void add(String sentence, int times) {
        Node node = root;
        for (char c : sentence.toCharArray()) {
            node = node.children.computeIfAbsent(c, k -> new Node());
            node.counts.merge(sentence, times, Integer::sum);   // cache at every prefix
        }
    }

    List<String> input(char c) {
        if (c == '#') {
            add(typed.toString(), 1);
            typed.setLength(0);
            current = root;
            return List.of();
        }
        typed.append(c);
        current = (current == null) ? null : current.children.get(c);
        if (current == null) return List.of();

        return current.counts.entrySet().stream()
            .sorted((a, b) -> a.getValue().equals(b.getValue())
                ? a.getKey().compareTo(b.getKey())
                : b.getValue() - a.getValue())
            .limit(3)
            .map(Map.Entry::getKey)
            .toList();
    }
}
```

The design decision to explain: "Storing the candidate sentences at every node along the path trades memory for query speed — a query becomes a lookup plus a small sort rather than a subtree traversal. If memory were the constraint, I would instead traverse the subtree below the prefix and keep a size-three heap, which is O(subtree) per query but O(total characters) space.

Keeping `current` across calls means each keystroke is one character step rather than re-walking the prefix, which matters because this is called per keystroke."

That trade — precompute at every node versus traverse on query — is the core of the problem, and this lesson connects directly to the search-autocomplete system design case study.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Autocomplete and type-ahead
- Spell checking and dictionary lookups
- IP routing tables, via bitwise tries
- Word search across a grid with many target words
- Longest common prefix across a set of strings
- Maximum XOR pair, using a binary trie""",
                    ),
                    (
                        "Trade-offs",
                        """- **Memory.** A trie can use far more memory than a hash set unless prefixes are genuinely shared. For random strings it is wasteful.
- **Array versus map children.** Fast and fixed-alphabet, versus compact and general.
- **Caching results at nodes.** Faster queries, more memory, and updates must touch every prefix node.
- **Trie versus sorted array with binary search.** For a static dictionary, a sorted array with prefix binary search is compact and nearly as fast.
- **Compressed tries (radix trees).** Collapse single-child chains, saving substantial memory at the cost of more complex code.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Omitting the `isWord` flag and treating any reachable node as a word
- Assuming a fixed 26-letter alphabet without saying so
- Deleting a word by removing nodes that other words still need
- Rebuilding the prefix string at every node instead of using a shared builder with backtracking
- Using a trie for exact membership only, where a hash set is simpler and smaller
- Forgetting that wildcard search can branch exponentially""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why not a hash set?"** — Prefix queries. A hash set cannot answer them without a full scan.
- **"What is the memory cost?"** — O(total characters) worst case; better when prefixes are shared. Mention radix trees if memory matters.
- **"How do you support wildcards?"** — Branch into all children on the wildcard character, and note the exponential worst case.
- **"How do you delete a word?"** — Clear the flag, then prune only nodes with no children and no word flag.
- **"What if the alphabet is large or Unicode?"** — Map-backed children rather than a fixed array.""",
                    ),
                    (
                        "Mini Exercise",
                        """Implement each:

1. Insert, search, and startsWith.
2. Search with `.` matching any single character.
3. Return all words with a given prefix.
4. Find the longest common prefix of a set of words.
5. Delete a word, pruning only what is safe.
6. Return the k most frequent words with a given prefix.

Number 4 is worth noticing: the answer is the path from the root until a node has more than one child or is a word ending, so the trie makes it a single walk rather than a comparison across all pairs.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the cost in terms of the word length, not the dictionary size: "prefix lookup is O(L) regardless of how many words are stored." That framing is the reason the structure exists, and it immediately answers "why not a hash set?".""",
                    ),
                ],
                [
                    "Trie operations cost O(word length) and are independent of the number of stored words.",
                    "The `isWord` flag is what separates a stored word from a prefix of one.",
                    "Use a hash set for exact membership and a trie the moment prefixes matter.",
                    "Deletion must prune only nodes with no children and no word flag, or it removes other words.",
                ],
                [
                    "Why use a trie instead of a hash set?",
                    "What is the memory cost of a trie, and when is it wasteful?",
                    "How do you support wildcard matching?",
                    "How do you safely delete a word from a trie?",
                ],
                ["anagram-bundles"],
            ),
            DL(
                "trie-applications",
                "Trie Applications: Word Search, XOR, and Matching",
                "The problems where a trie turns an impossible search into a linear one.",
                11,
                "A trie's real power appears when you must match many patterns at once. Searching a grid for one word is a simple backtracking problem; searching it for ten thousand words is only tractable if you walk the board once against a trie. The same idea — many patterns, one pass — underlies multi-pattern text matching and bitwise tries for XOR problems.",
                [
                    (
                        "Why It Matters",
                        """These are the problems where the trie is not a convenience but the difference between a feasible and an infeasible solution. They are also the ones interviewers use as the harder follow-up after basic trie implementation.

The binary trie for XOR problems is a particularly good thing to know, because the problems it solves look like they need bit manipulation and have no obvious structure otherwise.""",
                    ),
                    (
                        "Mental Model",
                        """Invert the search: instead of running one search per pattern, run one traversal against all patterns at once.

Many patterns → one trie → one pass over the input

The same inversion appears in three forms:

- **Grid search**: walk the board, advancing through the trie as you move.
- **Text matching**: walk the text, following trie edges (Aho-Corasick adds failure links).
- **Bitwise trie**: walk the bits of a number, choosing the branch that maximises or minimises the result.""",
                    ),
                    (
                        "How It Works",
                        """### Word search in a grid

Searching a board for many words. The naive approach runs a DFS per word; the trie approach runs one DFS that tracks position in all words simultaneously.

```java
class Solution {
    private static class Node {
        Node[] children = new Node[26];
        String word;                       // non-null at a word ending
    }

    List<String> findWords(char[][] board, String[] words) {
        Node root = buildTrie(words);
        List<String> out = new ArrayList<>();
        for (int r = 0; r < board.length; r++)
            for (int c = 0; c < board[0].length; c++)
                dfs(board, r, c, root, out);
        return out;
    }

    private void dfs(char[][] board, int r, int c, Node node, List<String> out) {
        if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return;
        char ch = board[r][c];
        if (ch == '#') return;                       // already on the current path
        Node next = node.children[ch - 'a'];
        if (next == null) return;                    // no word continues this way - prune

        if (next.word != null) {
            out.add(next.word);
            next.word = null;                        // avoid duplicates
        }

        board[r][c] = '#';                           // mark visited
        dfs(board, r + 1, c, next, out);
        dfs(board, r - 1, c, next, out);
        dfs(board, r, c + 1, next, out);
        dfs(board, r, c - 1, next, out);
        board[r][c] = ch;                            // restore
    }
}
```

Three details carry this solution:

1. **Pruning on a null child** is where the speed comes from — the moment no word continues down this path, the entire subtree of board positions is abandoned.
2. **Storing the word at the terminal node** avoids rebuilding the string from the path.
3. **Nulling the word after collecting it** deduplicates without a set.

Marking the cell in place and restoring it is the standard grid-backtracking idiom, and it avoids a separate visited array.

### Bitwise trie for maximum XOR

"Find the maximum XOR of any two numbers in an array" looks like it needs all pairs at O(n^2). A binary trie makes it O(n * 32).

```java
class BitTrie {
    private static class Node { Node[] children = new Node[2]; }
    private final Node root = new Node();

    void insert(int value) {
        Node node = root;
        for (int bit = 31; bit >= 0; bit--) {
            int b = (value >> bit) & 1;
            if (node.children[b] == null) node.children[b] = new Node();
            node = node.children[b];
        }
    }

    int maxXorWith(int value) {
        Node node = root;
        int result = 0;
        for (int bit = 31; bit >= 0; bit--) {
            int b = (value >> bit) & 1;
            int want = 1 - b;                        // opposite bit maximises XOR
            if (node.children[want] != null) {
                result |= (1 << bit);
                node = node.children[want];
            } else {
                node = node.children[b];
            }
        }
        return result;
    }
}
```

The greedy argument to state: "XOR is maximised by differing in the highest possible bit, and a higher bit outweighs every lower bit combined. So at each level I take the opposite branch if it exists. Storing numbers bit by bit makes that a single walk of depth 32."

That "a higher bit outweighs all lower bits" observation is the entire justification, and it is the kind of reasoning interviewers want before any code.

### Multi-pattern text matching

Aho-Corasick builds a trie of all patterns and adds *failure links* — the KMP idea generalised to a trie. When a character mismatches, the failure link jumps to the longest proper suffix that is still a valid prefix of some pattern, so the text is scanned once regardless of how many patterns there are.

The honest interview position: "For matching many patterns at once, Aho-Corasick is the standard algorithm — a trie of the patterns plus KMP-style failure links, giving O(text + total pattern length + matches). I would not implement it from memory, but that is the tool." Naming it correctly is what is being tested.

### Trie with counts for prefix queries

Storing a count of words passing through each node answers "how many words start with this prefix?" in O(L):

```java
// during insert:
node.prefixCount++;
```

This composes with the deletion logic — decrement on removal — and it is the structure behind "count words with prefix" style problems.""",
                    ),
                    (
                        "Example",
                        """"Replace every word in a sentence with the shortest root from a dictionary that is a prefix of it."

```java
String replaceWords(List<String> roots, String sentence) {
    Node root = new Node();
    for (String r : roots) insert(root, r);

    StringBuilder out = new StringBuilder();
    for (String word : sentence.split(" ")) {
        if (out.length() > 0) out.append(' ');
        out.append(shortestRoot(root, word));
    }
    return out.toString();
}

private String shortestRoot(Node root, String word) {
    Node node = root;
    StringBuilder prefix = new StringBuilder();
    for (char c : word.toCharArray()) {
        node = node.children[c - 'a'];
        if (node == null) return word;          // no root matches
        prefix.append(c);
        if (node.isWord) return prefix.toString();   // shortest root wins - stop here
    }
    return word;
}
// O(total characters) time
```

What to say: "Walking the trie character by character and stopping at the first word ending gives the *shortest* matching root automatically, because a shorter root is encountered earlier along the path. Checking every root against every word would be O(roots * words * length); this is one walk per word.

If no root matches, I return the original word — the null-child case handles that in the same loop."

The observation that the trie gives shortest-match for free, without any comparison, is the insight worth stating.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Searching a grid or text for many words at once
- Autocomplete with ranking
- Maximum or minimum XOR pair
- IP prefix routing, using a binary trie over address bits
- Replacing or highlighting many terms in a document
- Counting words with a given prefix""",
                    ),
                    (
                        "Trade-offs",
                        """- **Trie plus one traversal versus one search per pattern.** Linear in the input regardless of pattern count, at the cost of building and holding the trie.
- **Bitwise trie versus sorting or hashing.** O(n * bits) with predictable behaviour, versus approaches that do not generalise to "maximum XOR".
- **Storing words at terminal nodes.** Avoids reconstructing strings, at the cost of memory.
- **In-place grid marking.** Saves a visited array and mutates the input, which must be restored.
- **Aho-Corasick.** Optimal for multi-pattern matching and substantial to implement; naming it is usually enough.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Running a separate search per word instead of inverting to one traversal
- Forgetting to restore the board cell after the recursive calls
- Not deduplicating results when the same word is reachable from several start positions
- Iterating bits from the least significant end in a bitwise trie, which breaks the greedy argument
- Building the trie inside the loop rather than once
- Ignoring that pruning is where the performance comes from, and writing a version that does not prune""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why is the trie faster than searching each word?"** — One traversal covers all patterns, and a null child prunes the entire remaining search.
- **"What is the complexity of grid word search?"** — O(rows * cols * 4^maxWordLength) worst case, drastically reduced in practice by trie pruning.
- **"Why iterate bits from the most significant end?"** — A higher bit contributes more than all lower bits combined, so greedy from the top is optimal.
- **"How would you match thousands of patterns in a text stream?"** — Aho-Corasick.
- **"How do you avoid duplicate results?"** — Null the stored word once collected, or use a set.""",
                    ),
                    (
                        "Mini Exercise",
                        """1. Search a grid for a list of words using one trie-guided DFS.
2. Find the maximum XOR of any two numbers in an array.
3. Replace words in a sentence with their shortest dictionary root.
4. Count how many stored words begin with a given prefix.
5. Find the longest word in a dictionary that can be built one character at a time from other dictionary words.
6. Design a structure supporting insert and "is any stored word a prefix of this query?".

Number 5 is a nice trie problem: do a DFS from the root that only descends through nodes marked as words, so every prefix along the path is itself a valid word.""",
                    ),
                    (
                        "Interview Tip",
                        """When a problem gives you many patterns and one input, say "rather than searching once per pattern, I will build a trie of all patterns and make a single pass" before writing anything. That inversion is the insight the problem is testing, and stating it early frames everything that follows.""",
                    ),
                ],
                [
                    "Invert multi-pattern search: build a trie of all patterns and traverse the input once.",
                    "Pruning on a missing child is where trie-guided grid search gets its speed.",
                    "A binary trie over bits from the most significant end solves maximum-XOR greedily in O(n * 32).",
                    "Aho-Corasick is the named algorithm for matching many patterns in one text pass.",
                ],
                [
                    "How do you search a grid for thousands of words efficiently?",
                    "How does a bitwise trie find the maximum XOR pair?",
                    "Why must you iterate bits from the most significant end?",
                    "What algorithm matches many patterns against a text in one pass?",
                ],
            ),
        ],
        roadmap_key="tries",
        practice_tag="string",
    )


def _graphs_topic() -> dict:
    return _dsa_topic(
        "graphs",
        "Graph Representations and Modelling",
        "Choosing a representation, and recognising the graph hiding inside a problem that never mentions one.",
        "MEDIUM",
        18,
        [
            DL(
                "graph-representations",
                "Graph Representations",
                "Adjacency lists, matrices, and implicit graphs — and the complexity consequences of each.",
                12,
                "A graph is a set of nodes and edges, and how you store it determines the complexity of everything you do with it. Most interview graphs are sparse, so an adjacency list is almost always right, and knowing why is more useful than knowing the alternatives exist.",
                [
                    (
                        "Why It Matters",
                        """Every graph complexity is stated in terms of V and E, and those bounds depend on the representation. "Find all neighbours" is O(degree) with a list and O(V) with a matrix, which changes BFS from O(V + E) to O(V^2).

The representation also shapes the code. Candidates who build an adjacency list cleanly from an edge array spend their time on the algorithm; candidates who improvise spend it on indexing.""",
                    ),
                    (
                        "Mental Model",
                        """Three ways to store the same thing.

| Representation | Space | Neighbours of v | Is (u,v) an edge? | Use when |
| --- | --- | --- | --- | --- |
| Adjacency list | O(V + E) | O(degree) | O(degree) | Sparse graphs — almost always |
| Adjacency matrix | O(V^2) | O(V) | O(1) | Dense graphs, or frequent edge lookups |
| Edge list | O(E) | O(E) | O(E) | Kruskal's algorithm, or as raw input |
| Implicit | O(1) | Computed | Computed | Grids, state spaces, generated neighbours |

A graph is sparse when E is much less than V^2, which describes nearly every real graph and nearly every interview graph.""",
                    ),
                    (
                        "How It Works",
                        """### Building an adjacency list

```java
List<List<Integer>> buildGraph(int n, int[][] edges, boolean directed) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        if (!directed) graph.get(e[1]).add(e[0]);      // undirected: both directions
    }
    return graph;
}
```

Forgetting the reverse edge for an undirected graph is one of the most common and most silent bugs — the code runs and gives wrong answers.

For weighted graphs, store pairs:

```java
List<int[]>[] graph = new List[n];                    // each entry {neighbour, weight}
```

When nodes are not integers, a map-backed list is cleaner:

```java
Map<String, List<String>> graph = new HashMap<>();
for (String[] e : edges) {
    graph.computeIfAbsent(e[0], k -> new ArrayList<>()).add(e[1]);
    graph.computeIfAbsent(e[1], k -> new ArrayList<>()).add(e[0]);
}
```

### Adjacency matrix

```java
boolean[][] adj = new boolean[n][n];
for (int[] e : edges) {
    adj[e[0]][e[1]] = true;
    adj[e[1]][e[0]] = true;
}
```

Use it when the graph is dense, when you need O(1) edge existence checks, or when n is small and the code is simpler for it. The cost is O(V^2) memory, which rules it out for large sparse graphs.

### Implicit graphs

Many problems have a graph that is never given to you. The neighbours are computed rather than stored:

- **Grid**: the neighbours of `(r, c)` are the four or eight adjacent cells.
- **Word ladder**: the neighbours of a word are all words differing by one letter.
- **State space**: the neighbours of a board position are the positions reachable by one move.
- **Numeric**: the neighbours of n are `n - 1`, `n + 1`, `n * 2`, or whatever operations are allowed.

```java
// Neighbours computed on demand - no stored graph at all
for (int[] d : DIRS) {
    int nr = r + d[0], nc = c + d[1];
    if (inBounds(nr, nc) && grid[nr][nc] != WALL) visit(nr, nc);
}
```

Recognising an implicit graph is the single most valuable graph skill in interviews, because those problems do not look like graph problems.

### Directed, undirected, weighted, cyclic

Terms you must use precisely:

- **Directed** edges go one way; **undirected** edges go both.
- **Weighted** edges carry a cost, which rules out plain BFS for shortest paths.
- **Cyclic** graphs contain a cycle; a **DAG** is directed and acyclic, which is what topological sort requires.
- **Connected** means every node is reachable from every other; a graph may have several **components**, and forgetting to loop over all starting nodes is a classic bug.
- **Degree** is the number of edges at a node; in a directed graph, in-degree and out-degree differ and in-degree is what topological sort counts.

### Complexity in terms of V and E

- BFS and DFS with an adjacency list: O(V + E). With a matrix: O(V^2).
- Dijkstra with a binary heap: O((V + E) log V).
- For a connected graph, E is at least V - 1, so O(V + E) is often written O(E) — but say both, since a graph can have isolated nodes.

Stating complexity as O(n) rather than O(V + E) is a small imprecision that interviewers notice.""",
                    ),
                    (
                        "Example",
                        """"You are given `n` courses and a list of prerequisite pairs. Determine whether all courses can be finished."

The modelling step is the answer:

```java
List<List<Integer>> buildGraph(int n, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] p : prerequisites) {
        graph.get(p[1]).add(p[0]);     // p[1] must come BEFORE p[0]
    }
    return graph;
}
```

What to say: "The nodes are courses and the edges are prerequisite relations, directed from the prerequisite to the dependent course. Choosing that direction matters: it makes the question 'is this graph acyclic?', because a cycle means a course indirectly requires itself.

The graph is sparse — the number of prerequisite pairs is far smaller than n^2 — so an adjacency list at O(V + E) is right. I will also need in-degrees if I use Kahn's algorithm."

Then the follow-up: "Note that the pair is given as `[course, prerequisite]`, so the edge goes from index 1 to index 0. Getting that direction backwards produces a graph that is acyclic exactly when the real one is, so it happens to work for this question — but for 'return a valid ordering' it would produce the reverse order."

Noticing that the direction convention matters for the follow-up, even though it does not for the yes/no question, is a genuinely sharp observation.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Dependency and prerequisite problems
- Social and network connectivity
- Grid and maze traversal
- State-space search over moves or transformations
- Scheduling, routing, and matching""",
                    ),
                    (
                        "Trade-offs",
                        """- **List versus matrix.** O(V + E) memory and O(degree) neighbour access, versus O(V^2) memory and O(1) edge checks.
- **Building versus computing neighbours.** Storing is reusable and costs memory; computing on demand is O(1) space and recomputes.
- **Integer versus map-keyed nodes.** Arrays are faster and require dense integer ids; maps are general and allocate.
- **Storing both directions.** Necessary for undirected graphs and doubles the memory; forgetting it is a silent correctness bug.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Adding only one direction for an undirected edge
- Getting the edge direction backwards for dependency problems
- Using a matrix for a large sparse graph
- Stating complexity as O(n) instead of O(V + E)
- Assuming the graph is connected and only starting from node 0
- Not handling self-loops or duplicate edges when the input allows them""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Which representation would you use and why?"** — Adjacency list for sparse, which is nearly always; justify with the memory figures.
- **"What if the graph is dense?"** — A matrix becomes competitive and gives O(1) edge lookups.
- **"What if the nodes are strings?"** — A map of node to neighbour list, or an index mapping if you want array speed.
- **"Is the graph connected?"** — Never assume it; loop over all nodes as potential starting points.
- **"What is the complexity?"** — In terms of V and E, with the representation stated.""",
                    ),
                    (
                        "Mini Exercise",
                        """For each, state the nodes, the edges, whether it is directed and weighted, and the representation you would choose:

1. Course prerequisites.
2. A maze with walls.
3. Word ladder between two words using a dictionary.
4. Flight routes with prices.
5. Friend recommendations in a social network.
6. The minimum number of operations to turn x into y using doubling and decrementing.

Numbers 2, 3, and 6 are implicit graphs with no stored structure at all, and identifying that is the point of the exercise.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the modelling out loud before any code: "The nodes are courses, the edges are directed from prerequisite to dependent, the graph is sparse so I will use an adjacency list." That sentence is the design, and it lets the interviewer correct your model before you have written fifty lines against the wrong one.""",
                    ),
                ],
                [
                    "Adjacency lists are O(V + E) and right for sparse graphs, which describes nearly every interview graph.",
                    "Undirected edges must be added in both directions — forgetting this fails silently.",
                    "Many problems are implicit graphs where neighbours are computed rather than stored.",
                    "State graph complexity in terms of V and E, and say which representation you assumed.",
                ],
                [
                    "Which graph representation would you choose here and why?",
                    "What is the memory and neighbour-access cost of a matrix versus a list?",
                    "How would you model a word ladder or a maze as a graph?",
                    "What breaks if the graph is disconnected?",
                ],
                ["level-walk"],
            ),
            DL(
                "graph-modeling",
                "Recognising a Graph Problem",
                "The signals that a problem is a graph in disguise, and how to define the nodes and edges.",
                11,
                "The hardest part of most graph questions is realising that they are graph questions. Once the nodes and edges are named, the algorithm is usually one of four standard ones. This lesson is about the modelling step — the translation from a problem statement into nodes, edges, and a question about them.",
                [
                    (
                        "Why It Matters",
                        """"Minimum number of steps to transform x into y", "can these tasks be ordered", "how many distinct groups are there" — none of these mention graphs, and all of them are graph problems. Candidates who do not make the translation attempt ad-hoc simulation or DP and usually stall.

Once the model is named, the algorithm choice is nearly mechanical, which is why the modelling step is where the thinking should go.""",
                    ),
                    (
                        "Mental Model",
                        """Three questions produce the model.

What is a node? -> What connects two nodes? -> What am I asking about the graph?

Then the question maps to an algorithm:

| Question about the graph | Algorithm |
| --- | --- |
| Fewest steps, all moves equal cost | BFS |
| Is it reachable, or explore everything | DFS or BFS |
| How many separate groups | DFS/BFS per component, or union-find |
| Cheapest path with weights | Dijkstra |
| Valid ordering with dependencies | Topological sort |
| Is there a cycle | DFS with colours, or Kahn's algorithm |
| Cheapest way to connect everything | Minimum spanning tree |""",
                    ),
                    (
                        "How It Works",
                        """### Signals that a problem is a graph

- **Relationships between entities**: prerequisites, friendships, dependencies, exchange rates.
- **Transformations**: "change one letter", "apply an operation", "make a move" — the states are nodes and the moves are edges.
- **Grids**: cells are nodes, adjacency is edges. Almost every grid problem is a graph problem.
- **Grouping**: "how many islands", "how many connected components", "are these equivalent" — connectivity.
- **Ordering with constraints**: dependency edges and a topological sort.
- **Reachability**: "can I get from A to B", with or without constraints.

### The state-space translation

The most valuable modelling skill. When a problem describes operations on a value, the states are nodes and the operations are edges:

> "Starting from x, you may double or subtract one. Find the fewest operations to reach y."

Nodes are integers, edges are the allowed operations, all edges cost one, so BFS gives the answer. The only additional design decision is bounding the state space so the search terminates — here, noting that you should never exceed some bound above y.

```java
int minOperations(int x, int y) {
    Deque<Integer> queue = new ArrayDeque<>();
    Set<Integer> seen = new HashSet<>();
    queue.offer(x); seen.add(x);
    int steps = 0;

    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            int current = queue.poll();
            if (current == y) return steps;
            for (int next : new int[] {current * 2, current - 1}) {
                if (next < 0 || next > 2 * y || !seen.add(next)) continue;   // bound the space
                queue.offer(next);
            }
        }
        steps++;
    }
    return -1;
}
```

The bound `next > 2 * y` is the modelling decision that makes the search finite, and justifying it — "doubling past twice the target can never help, since you would then need more subtractions than you saved" — is part of the answer.

### Grid as a graph

```java
// Number of islands: connected components in an implicit grid graph
int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { count++; sink(grid, r, c); }
    return count;
}

private void sink(char[][] grid, int r, int c) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return;
    if (grid[r][c] != '1') return;
    grid[r][c] = '0';                     // mark visited in place
    sink(grid, r + 1, c); sink(grid, r - 1, c);
    sink(grid, r, c + 1); sink(grid, r, c - 1);
}
// O(rows * cols) time, O(rows * cols) stack worst case
```

Mutating the grid to mark visited is O(1) extra space and destroys the input; a separate `boolean[][]` preserves it. Ask which is acceptable.

The stack depth on a fully-filled 1000x1000 grid is a million, which will overflow — so the honest answer includes "for a large grid I would use an explicit stack or BFS".

### Nodes that are not obvious

Sometimes the right node is a pair or a tuple:

- **Grid with k allowed wall removals**: the node is `(row, col, wallsUsed)`, not just the cell. The same cell reached with different budgets is a genuinely different state.
- **Keys and doors**: the node is `(position, keysHeld)` with keys as a bitmask.
- **Two simultaneous movers**: the node is the pair of positions.

Recognising that the state needs extra dimensions is the step candidates most often miss, and the symptom is a solution that "almost works" but revisits states incorrectly.

### Edges that are not obvious

- **Equivalence relations**: "a == b" creates an undirected edge; union-find answers the queries.
- **Ratios**: "a / b = 2" creates weighted edges in both directions with reciprocal weights, and the query becomes a path product.
- **Implicit adjacency by shared property**: words differing by one letter, numbers differing by one bit.

The last one has a performance trap: building edges by comparing all pairs is O(n^2 * L). For word ladders the standard trick is to bucket words by wildcard patterns — `h*t` groups `hot`, `hat`, `hit` — which makes neighbour lookup O(L) instead.""",
                    ),
                    (
                        "Example",
                        """The prompt: "Given equations like `a / b = 2.0` and queries like `a / c`, return the value of each query, or -1 if it cannot be determined."

```java
double[] calcEquation(List<List<String>> equations, double[] values,
                      List<List<String>> queries) {
    Map<String, Map<String, Double>> graph = new HashMap<>();
    for (int i = 0; i < equations.size(); i++) {
        String u = equations.get(i).get(0), v = equations.get(i).get(1);
        graph.computeIfAbsent(u, k -> new HashMap<>()).put(v, values[i]);
        graph.computeIfAbsent(v, k -> new HashMap<>()).put(u, 1.0 / values[i]);
    }

    double[] out = new double[queries.size()];
    for (int i = 0; i < queries.size(); i++) {
        String from = queries.get(i).get(0), to = queries.get(i).get(1);
        out[i] = (!graph.containsKey(from) || !graph.containsKey(to))
            ? -1.0
            : dfs(graph, from, to, 1.0, new HashSet<>());
    }
    return out;
}

private double dfs(Map<String, Map<String, Double>> graph, String current, String target,
                   double product, Set<String> visited) {
    if (current.equals(target)) return product;
    visited.add(current);
    for (var entry : graph.get(current).entrySet()) {
        if (visited.contains(entry.getKey())) continue;
        double result = dfs(graph, entry.getKey(), target, product * entry.getValue(), visited);
        if (result != -1.0) return result;
    }
    return -1.0;
}
```

The modelling to narrate: "Variables are nodes and each equation is a pair of directed weighted edges — forward with the given ratio, backward with its reciprocal. A query is then a path from one node to another, and the answer is the product of the edge weights along it. Unreachable means the ratio is not determined by the given equations.

I check that both variables exist before searching, because an unknown variable is different from an unreachable one — both return -1 here, but the distinction matters if the problem ever asks why."

Turning division into a weighted path product is a genuinely non-obvious model, and it is the entire problem.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Dependency resolution and build ordering
- Shortest transformation sequences
- Connectivity and grouping
- Currency conversion and unit conversion
- Puzzle and game state search
- Network routing and flow""",
                    ),
                    (
                        "Trade-offs",
                        """- **Explicit graph versus implicit neighbours.** Building costs memory and time; computing avoids both and recomputes.
- **State dimensionality.** Adding dimensions to the node makes the search correct and multiplies the state space — bound it or it will not terminate.
- **Union-find versus traversal** for connectivity: near-constant per query with incremental updates, versus one pass and no extra structure.
- **Bucketed neighbour lookup.** Removes an O(n^2) edge build at the cost of a preprocessing pass.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Not recognising the problem as a graph at all
- Using the cell as the node when the state needs extra dimensions
- Building all-pairs edges when bucketing would be linear
- Failing to bound an infinite state space
- Assuming connectivity and starting from one node only
- Using DFS for a shortest-path question""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What are the nodes and edges here?"** — Answer precisely; vagueness here predicts a wrong solution.
- **"Is this graph directed? Weighted?"** — Both decide the algorithm.
- **"How large is the state space?"** — Multiply the dimensions; if it is unbounded, say how you bound it.
- **"Why BFS rather than DFS?"** — Shortest path with uniform cost. If costs differ, Dijkstra.
- **"Can you avoid building the graph?"** — Often yes, by computing neighbours on demand.""",
                    ),
                    (
                        "Mini Exercise",
                        """Define nodes, edges, and the algorithm for each:

1. Minimum number of coin flips to turn one binary string into another using allowed operations.
2. Whether two words are connected through a chain of one-letter changes.
3. Number of provinces in a friendship matrix.
4. Cheapest flight from A to B with at most k stops.
5. Escaping a maze that has k keys and k doors.
6. Evaluating division queries from a set of equations.

Number 5 is the state-dimension example: the node is `(cell, keysHeldBitmask)`, and using just the cell makes the search wrong in a way that is hard to debug.""",
                    ),
                    (
                        "Interview Tip",
                        """Before any code, say one sentence: "The nodes are X, an edge means Y, and the question is Z, so this is a BFS." If the interviewer disagrees with your model, you find out in ten seconds rather than twenty minutes.""",
                    ),
                ],
                [
                    "Name the nodes, the edges, and the question — then the algorithm choice is nearly mechanical.",
                    "Transformations and moves make a state-space graph; grids are graphs with computed neighbours.",
                    "When the same position can be reached in meaningfully different conditions, the state needs extra dimensions.",
                    "Bound an infinite state space explicitly, and justify the bound.",
                ],
                [
                    "How do you recognise that a problem is really a graph problem?",
                    "When does the node need to be more than just a position?",
                    "How would you model division equations as a graph?",
                    "How do you avoid an O(n^2) edge construction for word ladders?",
                ],
            ),
        ],
        roadmap_key="graphs",
        practice_tag="tree",
    )


def dsa_core_topics() -> list[dict]:
    """Foundations, data structures, and core techniques."""
    return [
        _method_topic(),
        _complexity_topic(),
        _arrays_hashing_topic(),
        _arrays_topic(),
        _hashing_topic(),
        _strings_topic(),
        _two_pointers_topic(),
        _sliding_window_topic(),
        _stack_topic(),
        _queue_topic(),
        _binary_search_topic(),
        _sorting_topic(),
        _linked_list_topic(),
        _trees_topic(),
        _bst_topic(),
        _heap_topic(),
        _tries_topic(),
        _graphs_topic(),
    ]
