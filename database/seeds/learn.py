"""Interview-focused learning catalog. Seeded into PostgreSQL — never hardcoded in the UI."""

from __future__ import annotations


def lesson_markdown(
    title: str,
    *,
    concept: str,
    why: str,
    how: str,
    example: str,
    uses: str,
    tradeoffs: str,
    mistakes: str,
    tip: str,
) -> str:
    return f"""# {title}

{concept}

## Why It Matters

{why}

## How It Works

{how}

## Example

{example}

## Common Use Cases

{uses}

## Tradeoffs

{tradeoffs}

## Common Mistakes

{mistakes}

## Interview Tip

{tip}
"""


CATEGORIES = [
    {
        "slug": "dsa",
        "title": "Data Structures & Algorithms",
        "description": "Master the patterns and algorithms commonly used in coding interviews.",
        "icon": "binary",
        "order": 1,
    },
    {
        "slug": "system-design",
        "title": "System Design",
        "description": "Learn how to design scalable distributed systems in a 45-minute interview.",
        "icon": "network",
        "order": 2,
    },
    {
        "slug": "java",
        "title": "Java",
        "description": "Master the Java concepts frequently tested in backend interviews.",
        "icon": "coffee",
        "order": 3,
    },
    {
        "slug": "cs-fundamentals",
        "title": "Computer Science Fundamentals",
        "description": "Operating systems, networking, and databases — the questions that sit under the code.",
        "icon": "cpu",
        "order": 4,
    },
    {
        "slug": "ood",
        "title": "Object-Oriented Design",
        "description": "SOLID, patterns, and low-level design problems interviewers actually ask.",
        "icon": "boxes",
        "order": 5,
    },
    {
        "slug": "behavioral",
        "title": "Behavioral Interviews",
        "description": "Tell a clear story. Structure answers. Handle the questions that decide the offer.",
        "icon": "message",
        "order": 6,
    },
    {
        "slug": "ai-ml",
        "title": "AI & Machine Learning",
        "description": "Master machine learning, LLMs, RAG, agents, and production AI systems for modern software engineering interviews.",
        "icon": "sparkles",
        "order": 7,
    },
]


def L(
    slug: str,
    title: str,
    short: str,
    minutes: int,
    concept: str,
    why: str,
    how: str,
    example: str,
    uses: str,
    tradeoffs: str,
    mistakes: str,
    tip: str,
    takeaways: list[str],
    questions: list[str],
    problems: list[str] | None = None,
) -> dict:
    return {
        "slug": slug,
        "title": title,
        "short": short,
        "minutes": minutes,
        "content": lesson_markdown(
            title,
            concept=concept,
            why=why,
            how=how,
            example=example,
            uses=uses,
            tradeoffs=tradeoffs,
            mistakes=mistakes,
            tip=tip,
        ),
        "takeaways": takeaways,
        "questions": questions,
        "problems": problems or [],
    }


TOPICS: list[dict] = [
    # ---------- DSA ----------
    {
        "category": "dsa",
        "slug": "big-o-complexity",
        "title": "Big-O Complexity",
        "description": "Describe how runtime and memory grow so you can defend an approach out loud.",
        "difficulty": "EASY",
        "minutes": 12,
        "roadmap_key": None,
        "practice_tag": "array",
        "order": 1,
        "lessons": [
            L(
                "what-is-big-o",
                "What is Big-O Complexity?",
                "How to talk about growth rate without drowning in constants.",
                10,
                "Big-O describes how runtime or memory grows as the input gets large. Interviewers care about the dominant term, not the exact millisecond count on your laptop.",
                "You will be asked to compare approaches. Saying 'a hash map is better' is weaker than 'this is O(n) time and O(n) extra space versus O(n²) with no extra memory.'",
                "Drop constants and lower-order terms. `3n + 20` is O(n). Nested loops over n are O(n²). Halving the search space each step is O(log n). Recursion needs a recurrence or a clear branching argument.",
                "Scanning an array once is O(n). Checking every pair is O(n²). Binary search on a sorted array is O(log n). Building a frequency map then scanning it is still O(n).",
                "- Choosing between brute force and a linear scan\n- Explaining why a hash map is worth the extra memory\n- Bounding recursive solutions",
                "Big-O hides constants. An O(n log n) sort can beat a clever O(n) method on small n. Also distinguish worst, average, and amortized cases when the interviewer pushes.",
                "- Calling a hash map lookup O(n) 'because hashing is work'\n- Forgetting extra memory\n- Saying O(n/2) instead of O(n)",
                "State time and space together, then name the input: 'O(n) time, O(k) space where k is the alphabet.'",
                [
                    "Big-O is about growth, not wall-clock time.",
                    "Always pair time with space.",
                    "Name what n is.",
                ],
                [
                    "What is Big-O?",
                    "Difference between O(n) and O(log n)?",
                    "What is amortized complexity?",
                ],
                ["pair-target", "anagram-bundles"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "arrays-hashing",
        "title": "Arrays & Hashing",
        "description": "Indexing, frequency maps, and the core patterns most interviews start with.",
        "difficulty": "EASY",
        "minutes": 25,
        "roadmap_key": "arrays-hashing",
        "practice_tag": "array",
        "order": 2,
        "lessons": [
            L(
                "arrays-in-interviews",
                "Arrays in Interviews",
                "Index math, in-place edits, and when a second array is allowed.",
                8,
                "An array is a contiguous block of values you can reach in O(1) by index. Most easy/medium screens start here because the interviewer can watch you handle bounds, copies, and extra space.",
                "If you mishandle indices or mutate while iterating, the rest of the interview is noise. Arrays also unlock two pointers, sliding windows, and prefix sums.",
                "Know length, random access, and that inserts/deletes in the middle are O(n). Prefer a new array when the problem forbids mutating input. Use a write pointer when you must compact in place.",
                "To remove zeros in place, keep a `write` index and copy every non-zero forward, then fill the tail. That is O(n) time and O(1) extra space.",
                "- Frequency counting with a partner hash map\n- Prefix sums\n- In-place partitioning",
                "Arrays waste space if the useful values are sparse. Linked structures win at mid-list inserts but lose cache locality — mention that if asked.",
                "- Off-by-one on the last index\n- Mutating the array you are still scanning\n- Assuming sorted input",
                "Restate whether the array is sorted and whether you may mutate it before you touch the keyboard.",
                ["Random access is O(1); mid-array insert is O(n).", "Clarify mutate vs copy.", "Bounds checks belong in the first minute."],
                ["When is an array the wrong structure?", "How do you delete in place?", "What is a prefix sum?"],
                ["pair-target", "missing-range-value"],
            ),
            L(
                "hashing-and-frequency-maps",
                "Hashing and Frequency Maps",
                "Turn 'have I seen this?' into an O(1) lookup.",
                9,
                "A hash map stores key → value with expected O(1) insert and lookup. In interviews it is the default way to remember what you have already seen.",
                "Nested loops that search for a complement, anagram, or duplicate are usually a hash map away from a linear solution.",
                "Pick a key that collapses equivalents: the value itself, a sorted string, or a 26-count signature. Store the index, a count, or a list of members depending on the ask.",
                "For two-sum, store `value → index` as you walk. For anagrams, store `signature → list of words`. Both are one pass after you define the key.",
                "- Complements (two-sum)\n- Grouping anagrams\n- First unique / first duplicate",
                "Expected O(1) is not worst-case O(1). Say 'expected linear time' and mention O(n) extra memory. Do not invent a perfect hash.",
                "- Using the value as the key when you needed the index\n- Forgetting collisions exist\n- Sorting every string when a count key is enough",
                "Say the key out loud: 'I will key on the sorted word so anagrams collide.'",
                ["A good key is the whole solution.", "Hash maps trade space for time.", "State expected vs worst case if asked."],
                ["Why not sort and two-pointer two-sum?", "What makes two strings anagrams?", "How does HashMap handle collisions?"],
                ["pair-target", "anagram-bundles"],
            ),
            L(
                "hashmap-internals",
                "HashMap Internals",
                "What Java actually does when you call put and get.",
                10,
                "A HashMap turns a key into a bucket index with `hash % capacity`, then stores an entry in that bucket. Java 8+ uses a list that can treeify if a bucket gets long.",
                "Interviewers use this to test whether you understand equals/hashCode, load factor, and why a bad hash turns O(1) into O(n).",
                "Capacity starts as a power of two. When size exceeds capacity × load factor (0.75), the table resizes and rehashes. Keys must implement a consistent `equals` and `hashCode`.",
                "If every key hashes to the same bucket, lookups walk a chain (or a tree). That is why `return 1;` as hashCode is legally correct and practically disastrous.",
                "- Frequency maps\n- Caching computed work\n- Deduplicating objects",
                "Resizes are amortized. A single put can be O(n). Treeified buckets help worst-case but you still need a decent hash.",
                "- Mutating a key after insert\n- Using a mutable array as a key\n- Ignoring that null keys are a special case in HashMap",
                "If they ask 'why 0.75?', talk about the space/collision tradeoff, not a magic constant.",
                ["equals and hashCode must agree.", "Load factor triggers resize.", "Worst case is a long bucket."],
                ["What is load factor?", "Why power-of-two capacity?", "What happens if hashCode is constant?"],
                ["pair-target", "anagram-bundles"],
            ),
        ],
    },
    {
        "category": "dsa",
        "slug": "arrays",
        "title": "Arrays",
        "description": "Contiguous storage, in-place patterns, and prefix techniques.",
        "difficulty": "EASY",
        "minutes": 10,
        "practice_tag": "array",
        "order": 3,
        "lessons": [
            L(
                "prefix-sums-and-ranges",
                "Prefix Sums and Ranges",
                "Answer range questions after one precomputation.",
                8,
                "A prefix sum array stores the running total so any subarray sum becomes two lookups.",
                "Range-sum and 'does a subarray equal k' questions become linear once you precompute.",
                "Build `pref[i] = nums[0] + … + nums[i-1]`. Then `sum(l, r)` is `pref[r+1] - pref[l]`. Pair with a hash map of seen prefixes to find a target sum.",
                "For [2, 3, 5], prefixes are [0, 2, 5, 10]. Sum of the last two elements is 10 - 2 = 8.",
                "- Subarray sum equals k\n- Range queries\n- Equilibrium index",
                "Uses O(n) extra space. Does not help if values change often unless you add a Fenwick tree — usually out of scope.",
                "- Off-by-one between inclusive and exclusive prefixes\n- Forgetting the dummy 0 at the front",
                "Draw the prefix array once. Interviewers like seeing the invariant.",
                ["Range sum is two prefix lookups.", "A map of prefixes finds target sums.", "Watch inclusive bounds."],
                ["How do you get sum(l, r) in O(1)?", "How do you find a subarray that sums to k?"],
                ["missing-range-value", "valley-rain"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "hashing",
        "title": "Hashing",
        "description": "Keys, collisions, and grouping equivalents.",
        "difficulty": "EASY",
        "minutes": 10,
        "practice_tag": "hashmap",
        "order": 4,
        "lessons": [
            L(
                "choosing-a-hash-key",
                "Choosing a Hash Key",
                "The key you pick is the algorithm.",
                8,
                "Hashing is useful only if equivalent items land in the same bucket. The interview is often about inventing that key.",
                "Anagrams, isomorphic strings, and group-by-signature problems collapse once the key is right.",
                "Ask: what stays the same across items that should group? Sorted characters, counts, or a canonical transform. Then store lists or counts under that key.",
                "All of `eat`, `tea`, `ate` share the count key `[1,0,0,0,1,…]`. Group them without sorting if the alphabet is tiny.",
                "- Anagram groups\n- Isomorphic mappings\n- Deduping by canonical form",
                "A huge key (full sorted string of length k) costs O(k log k) to build. A 26-int count is O(k).",
                "- Using the original string as the key\n- Ignoring Unicode vs lowercase assumptions",
                "Confirm the alphabet before you commit to a 26-slot array.",
                ["Equivalent items need the same key.", "Cheaper keys beat sorting when the alphabet is small."],
                ["What key would you use for anagrams?", "When is sorting the key acceptable?"],
                ["anagram-bundles"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "strings",
        "title": "Strings",
        "description": "Immutable text, windows, and character counts.",
        "difficulty": "EASY",
        "minutes": 10,
        "practice_tag": "string",
        "order": 5,
        "lessons": [
            L(
                "strings-as-arrays",
                "Strings as Arrays of Characters",
                "Treat a string like an array, then watch immutability.",
                8,
                "In Java a `String` is immutable. Every `+` in a loop copies. Interview string problems are usually array problems plus a character set.",
                "You will lose time — and complexity — if you rebuild strings instead of counting or windowing.",
                "Convert to `char[]` when you must rewrite. Use `StringBuilder` to assemble. Prefer counts and two pointers over constructing intermediate strings.",
                "Reversing words: split on spaces carefully, or reverse the whole buffer and then reverse each word in place.",
                "- Palindromes\n- Anagrams\n- Longest unique substring",
                "Immutability is safe and slow to concatenate. `StringBuilder` is mutable and not thread-safe — fine in an interview solution.",
                "- Comparing strings with `==`\n- Ignoring case/whitespace rules\n- Quadratic concatenation",
                "Ask whether the string is ASCII and whether you may allocate another buffer.",
                ["Java strings are immutable.", "Count or window before you rebuild.", "Clarify the alphabet."],
                ["Why is String immutable?", "When do you use StringBuilder?"],
                ["anagram-bundles", "longest-unique-window"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "two-pointers",
        "title": "Two Pointers",
        "description": "Walk a sequence from both ends or at two speeds.",
        "difficulty": "EASY",
        "minutes": 10,
        "roadmap_key": "two-pointers",
        "practice_tag": "two-pointers",
        "order": 6,
        "lessons": [
            L(
                "two-pointer-patterns",
                "Two Pointer Patterns",
                "Replace a nested loop with two moving indexes.",
                9,
                "Two pointers move through a sequence in concert: opposite ends, same direction, or fast/slow. They turn many O(n²) pair searches into O(n).",
                "Interviewers expect you to notice sorted input or a shrinking window of candidates.",
                "Opposite ends: move the pointer that can improve the pair. Same direction: a read pointer and a write pointer. Fast/slow: cycle detection on lists.",
                "On a sorted array, find two numbers that sum to target by moving left up if the sum is small and right down if it is large.",
                "- Pair sums on sorted arrays\n- In-place compacting\n- Linked-list cycles",
                "Needs a monotonic property. If the array is unsorted and you cannot sort, a hash map is usually better.",
                "- Forgetting to sort when the pattern requires it\n- Infinite loops when a pointer never moves",
                "Name why each pointer moves. That is the proof.",
                ["Two pointers need a reason to move.", "Sorted or partitioned input is the usual tell.", "Fast/slow is the list variant."],
                ["When do you sort first?", "How do two pointers find a pair sum?"],
                ["widest-water-basin", "pair-target"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "sliding-window",
        "title": "Sliding Window",
        "description": "Maintain a moving range over arrays and strings.",
        "difficulty": "MEDIUM",
        "minutes": 12,
        "roadmap_key": "sliding-window",
        "practice_tag": "sliding-window",
        "order": 7,
        "lessons": [
            L(
                "fixed-and-variable-windows",
                "Fixed and Variable Windows",
                "Grow and shrink a range while you keep a running answer.",
                10,
                "A sliding window is a subarray or substring you expand and contract as you scan. The invariant is 'the window always represents a valid candidate.'",
                "Longest/shortest substring with a constraint is almost always a window, not DP.",
                "Expand `right`. While the window is invalid, advance `left` and undo the count. Track the best length or sum as you go.",
                "Longest substring without repeating characters: grow until a duplicate appears, then move `left` past the previous copy.",
                "- Longest unique substring\n- Minimum window covering a set\n- Max sum of size k",
                "Works on linear sequences. Graphs and trees need other tools. Variable windows need a clear invalid condition.",
                "- Not shrinking enough\n- Using a set but forgetting to erase\n- Off-by-one on length `right - left + 1`",
                "State the invariant: 'the window always has unique characters.'",
                ["Expand right, shrink left.", "The invariant is the algorithm.", "Length is right - left + 1."],
                ["Fixed vs variable window?", "How do you know when to shrink?"],
                ["longest-unique-window"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "stack",
        "title": "Stack",
        "description": "LIFO structure, matching, and monotonic sequences.",
        "difficulty": "EASY",
        "minutes": 10,
        "roadmap_key": "stack-queue",
        "practice_tag": "stack",
        "order": 8,
        "lessons": [
            L(
                "stacks-and-matching",
                "Stacks and Matching",
                "The last unresolved opening waits on top.",
                8,
                "A stack is last-in, first-out. Interview problems use it to match, undo, or keep a decreasing/increasing sequence.",
                "Bracket matching, calculator parsing, and next-greater-element all collapse to 'what is still waiting?'",
                "Push openings. On a closer, the top must match. For monotonic stacks, pop while the top cannot beat the current value.",
                "`{ [ ] }` is valid. `{ [ }` is not — the top of the stack is `[` when `}` arrives.",
                "- Balanced brackets\n- Next greater element\n- Min stack",
                "O(n) extra space. If you only need the previous few values, an explicit stack is still clearer than recursion.",
                "- Popping an empty stack\n- Matching the wrong closer\n- Forgetting leftover openings",
                "Handle the empty-stack case out loud before you code.",
                ["LIFO matches nested structure.", "Monotonic stacks answer next-greater.", "Empty stack is an edge case."],
                ["How do you validate brackets?", "What is a monotonic stack?"],
                ["balanced-brackets", "minimum-tracker-stack"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "queue",
        "title": "Queue",
        "description": "FIFO order, BFS, and sliding-window maxima.",
        "difficulty": "EASY",
        "minutes": 8,
        "practice_tag": "queue",
        "order": 9,
        "lessons": [
            L(
                "queues-and-bfs",
                "Queues and BFS",
                "Process the oldest item next — that is level order.",
                8,
                "A queue is first-in, first-out. Breadth-first search uses a queue so you finish a level before the next.",
                "Tree level-order and shortest path on unweighted graphs are queue problems.",
                "Enqueue the start. While the queue is not empty, dequeue, visit neighbors, enqueue unseen ones. Optionally store the level size.",
                "Level-walk a tree: start with the root, then drain the current level's count before moving on.",
                "- Binary tree level order\n- Shortest path in a grid\n- Sliding window maximum (deque)",
                "A deque can pop both ends for window-max. A plain queue cannot.",
                "- Using a stack and calling it BFS\n- Forgetting a visited set on graphs",
                "If they ask 'why a queue?', say 'so earlier nodes are processed first.'",
                ["BFS is a queue.", "Level size gives you per-level answers.", "Grids need a visited mark."],
                ["BFS vs DFS?", "When do you use a deque?"],
                ["level-walk"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "binary-search",
        "title": "Binary Search",
        "description": "Halve a sorted range — or a range of answers.",
        "difficulty": "MEDIUM",
        "minutes": 12,
        "roadmap_key": "binary-search",
        "practice_tag": "binary-search",
        "order": 10,
        "lessons": [
            L(
                "search-on-ranges",
                "Binary Search on Ranges",
                "The predicate must be monotonic.",
                10,
                "Binary search finds a boundary in a sorted space. The space can be indexes or the answer itself ('smallest capacity that works').",
                "First/last position, rotated arrays, and 'minimum feasible value' questions are search, not linear scans.",
                "Keep `lo` and `hi` with a clear invariant. Mid should make progress. For answer-space search, write a `feasible(x)` that is false, false, true, true…",
                "First and last position of a target: one search for the left boundary, one for the right.",
                "- Index lookup in a sorted array\n- Boundary of a predicate\n- Peak / rotated array",
                "Easy to get infinite loops. Prefer inclusive/exclusive conventions and test a 1-element array.",
                "- Unsorted input\n- Overflow in `(lo+hi)/2` — use `lo + (hi-lo)/2`\n- Off-by-one on the last true",
                "Write the invariant on the side: 'lo is the first index that could still be the answer.'",
                ["Need a monotonic predicate.", "You can search the answer, not just indexes.", "Invariants prevent infinite loops."],
                ["How do you find first and last position?", "What is binary search on the answer?"],
                ["first-and-last-position", "merged-median"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "linked-list",
        "title": "Linked List",
        "description": "Pointer rewiring, cycles, and dummy heads.",
        "difficulty": "MEDIUM",
        "minutes": 12,
        "roadmap_key": "linked-list",
        "practice_tag": "linked-list",
        "order": 11,
        "lessons": [
            L(
                "rewiring-pointers",
                "Rewiring Pointers",
                "Draw the nodes. Then change one pointer at a time.",
                10,
                "A linked list is nodes plus next pointers. The skill is not the structure — it is changing links without losing the rest of the list.",
                "Reversals, cycle detection, and merge steps show whether you can hold two or three pointers in your head.",
                "Use a dummy head for insert/delete at the front. Fast/slow finds the middle or a cycle. Reverse by walking `prev, curr, next`.",
                "Floyd's cycle: fast moves two steps, slow one. If they meet, there is a cycle. Reset one to head and walk together to find the start.",
                "- Reverse a list\n- Detect a cycle\n- Merge two sorted lists",
                "No random access — k-th node is O(k). Extra pointers are usually fine; extra lists are rarely needed.",
                "- Losing the next reference\n- Forgetting the dummy tail\n- Null on the last node",
                "Narrate each pointer update. Interviewers follow the story more than the code.",
                ["Dummy heads simplify edges.", "Fast/slow finds middle and cycles.", "Never overwrite next before you save it."],
                ["How does Floyd's algorithm work?", "How do you reverse a list in place?"],
                ["cycle-in-a-chain"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "trees",
        "title": "Trees",
        "description": "Traversal, ancestry, and recursive structure.",
        "difficulty": "MEDIUM",
        "minutes": 12,
        "roadmap_key": "trees",
        "practice_tag": "tree",
        "order": 12,
        "lessons": [
            L(
                "tree-traversals",
                "Tree Traversals",
                "Preorder, inorder, postorder, and level order each answer a different question.",
                10,
                "A binary tree node has a value and two children. Recursion matches the structure: solve left, solve right, combine.",
                "Most tree interviews are 'which traversal gives me the order I need?' plus a careful null base case.",
                "Preorder: node, left, right. Inorder on a BST is sorted. Postorder cleans up children first. Level order uses a queue.",
                "Lowest common ancestor: if the current node is p or q, return it. If p and q sit on different sides, this node is the LCA.",
                "- Validate a BST\n- Serialize a tree\n- Path sums",
                "Recursion uses O(h) stack space. Skewed trees are O(n). Mention that.",
                "- Missing the null base case\n- Mixing up inorder and preorder\n- Mutating children while traversing",
                "Start every tree answer with the base case and the recursive contract.",
                ["Name the traversal first.", "BST inorder is sorted.", "Height is the recursion depth."],
                ["When is inorder useful?", "How do you find the LCA?"],
                ["level-walk", "shared-ancestor"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "binary-search-tree",
        "title": "Binary Search Tree",
        "description": "Ordered trees and the invariants that make search log n.",
        "difficulty": "MEDIUM",
        "minutes": 10,
        "practice_tag": "tree",
        "order": 13,
        "lessons": [
            L(
                "bst-invariants",
                "BST Invariants",
                "Left < node < right — and it must hold for the whole subtree.",
                9,
                "A BST stores keys so every left descendant is smaller and every right descendant is larger. Search, insert, and inorder listing follow from that.",
                "Interviewers will ask you to validate a BST or to search without scanning every node.",
                "Validate with a running (low, high) bound, not just 'left < node < right' on the children. Search by comparing and walking one child.",
                "The tree `2 / 1, 3` is valid. `2 / 3, 1` is not. A node 5 under a left child of 10 must also be < 10.",
                "- Search / insert\n- k-th smallest via inorder\n- Validate BST",
                "Unbalanced BSTs degrade to O(n). Red-black / AVL keep O(log n) — mention, do not implement, unless asked.",
                "- Checking only immediate children\n- Allowing duplicates without a policy",
                "Say the bound out loud as you recurse: 'this node must be between 3 and 10.'",
                ["The invariant is on descendants, not just children.", "Inorder is sorted.", "Balance is why trees stay log n."],
                ["How do you validate a BST?", "What is the time to search an unbalanced BST?"],
                ["shared-ancestor"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "heap",
        "title": "Heap / Priority Queue",
        "description": "Repeatedly pull the current smallest or largest.",
        "difficulty": "MEDIUM",
        "minutes": 10,
        "roadmap_key": "heap",
        "practice_tag": "queue",
        "order": 14,
        "lessons": [
            L(
                "priority-queues",
                "Priority Queues",
                "Use a heap when you need the extreme value after every update.",
                9,
                "A binary heap is a complete tree that keeps the min or max at the root. Java's `PriorityQueue` is a min-heap by default.",
                "Top-k, merging k lists, and scheduling are heap-shaped. Sorting everything is usually overkill.",
                "Insert and delete-min are O(log n). To get top k in a stream, keep a min-heap of size k. Reverse the comparator for a max-heap.",
                "The k largest numbers: push each value into a min-heap; if size > k, poll. The heap then holds the k largest, smallest of them on top.",
                "- Top k\n- Merge k sorted lists\n- Median of a stream (two heaps)",
                "No cheap arbitrary lookup. If you need decrease-key often, say you would wrap entries or use a TreeMap.",
                "- Forgetting Java's min-heap default\n- Using a heap when a sort would be simpler and n is tiny",
                "State k vs n. Interviewers want to hear O(n log k), not just 'I'll use a heap.'",
                ["Heaps give repeated min/max.", "Top-k is a size-k heap.", "Java PriorityQueue is a min-heap."],
                ["How do you find the k largest?", "Min-heap vs max-heap in Java?"],
                ["minimum-tracker-stack"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "tries",
        "title": "Tries",
        "description": "Prefix trees for dictionaries and autocomplete.",
        "difficulty": "MEDIUM",
        "minutes": 10,
        "roadmap_key": "tries",
        "practice_tag": "string",
        "order": 15,
        "lessons": [
            L(
                "prefix-trees",
                "Prefix Trees",
                "Share prefixes so lookups cost the length of the word.",
                9,
                "A trie stores strings character by character. Each edge is a character; a node can mark the end of a word.",
                "Autocomplete, word search, and prefix counting are awkward with hash sets and natural with tries.",
                "Insert walks or creates a child per character. Search fails at the first missing edge. A `isWord` flag distinguishes prefixes from words.",
                "`app` and `apple` share `a-p-p`. Searching `ap` is a prefix, not a word, unless you inserted it.",
                "- Autocomplete\n- Spell check\n- Word search II",
                "Memory-heavy if the alphabet is large. A hash set is simpler if you only need exact match.",
                "- Forgetting the end-of-word mark\n- Using a map vs a 26-array without stating why",
                "If they only need exact lookup, say you would use a HashSet and reserve the trie for prefixes.",
                ["Cost is O(length), not O(dictionary).", "Mark word endings.", "Tries shine at prefixes."],
                ["When is a trie better than a hash set?", "How do you store an end of word?"],
                ["anagram-bundles"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "graphs",
        "title": "Graphs",
        "description": "Nodes, edges, and how you represent them.",
        "difficulty": "MEDIUM",
        "minutes": 10,
        "roadmap_key": "graphs",
        "practice_tag": "tree",
        "order": 16,
        "lessons": [
            L(
                "graph-representations",
                "Graph Representations",
                "Pick adjacency lists unless you need a dense matrix.",
                9,
                "A graph is vertices plus edges. Directed or undirected, weighted or not. In interviews you usually build an adjacency list from the input.",
                "Wrong representation makes BFS/DFS clumsy and hides the true complexity.",
                "List: `Map<Integer, List<Integer>>`. Matrix: `boolean[n][n]`. Grid problems are implicit graphs — four neighbors of each cell.",
                "For n = 4 edges [[0,1],[1,2],[2,3]], lists are 0→1, 1→0,2, etc. BFS from 0 visits in distance order.",
                "- Social networks\n- Grids as graphs\n- Dependency graphs",
                "Matrix is O(1) edge check and O(n²) space. Lists are O(n+m) space and better for sparse graphs.",
                "- Forgetting undirected edges go both ways\n- Not marking visited\n- 1-based vs 0-based ids",
                "Before coding, say 'I'll build an adjacency list and run BFS/DFS.'",
                ["Most interview graphs are sparse lists.", "Grids are implicit graphs.", "Always ask directed vs undirected."],
                ["Adjacency list vs matrix?", "How do you model a grid?"],
                ["level-walk"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "graph-traversal",
        "title": "Graph Traversal",
        "description": "BFS, DFS, and when each is the right walk.",
        "difficulty": "MEDIUM",
        "minutes": 10,
        "practice_tag": "tree",
        "order": 17,
        "lessons": [
            L(
                "bfs-vs-dfs",
                "BFS vs DFS",
                "BFS for shortest unweighted paths. DFS for explore-and-prune.",
                9,
                "Traversal visits every reachable node once. BFS uses a queue (levels). DFS uses a stack or recursion (paths).",
                "Picking the wrong walk is a common way to fail a graph question that you otherwise understand.",
                "BFS: first time you reach a node is the shortest hop count. DFS: great for cycle detection, components, and backtracking on implicit graphs.",
                "Number of islands: DFS or BFS flood-fill from each unvisited land cell and mark the component.",
                "- Shortest path in a grid (BFS)\n- Connected components\n- Cycle detection",
                "DFS recursion can blow the stack on a long path. Iterative DFS is safer for huge graphs.",
                "- Missing visited\n- Using DFS and claiming shortest path on weighted graphs",
                "If they say 'shortest', reach for BFS unless there are weights — then say Dijkstra.",
                ["BFS = shortest unweighted.", "DFS = components and paths.", "Visited is not optional."],
                ["When is DFS wrong for shortest path?", "How do you detect a cycle?"],
                ["level-walk"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "backtracking",
        "title": "Backtracking",
        "description": "Explore, prune, and undo.",
        "difficulty": "MEDIUM",
        "minutes": 10,
        "roadmap_key": "backtracking",
        "practice_tag": "tree",
        "order": 18,
        "lessons": [
            L(
                "choose-explore-unchoose",
                "Choose, Explore, Unchoose",
                "Build a candidate, recurse, then undo.",
                9,
                "Backtracking is DFS on a decision tree: choose a move, recurse, undo the move. Prune when a partial answer cannot succeed.",
                "Permutations, combinations, and constraint puzzles are not 'I need a clever formula' — they are search.",
                "Keep a path list. At each step iterate legal choices. Push, recurse, pop. Stop when the path is a complete answer or clearly invalid.",
                "Subsets: for each index, either include nums[i] or skip it. The recursion tree has 2^n leaves.",
                "- Permutations / combinations\n- N-queens\n- Word search",
                "Exponential time. You must talk about pruning. Extra space is the path plus recursion depth.",
                "- Forgetting to undo\n- Mutating a shared list you later store — copy the path when you record an answer",
                "Say the branching factor and why a prune is legal. That is the interview.",
                ["Push, recurse, pop.", "Copy answers off the path.", "Pruning is the optimization."],
                ["How do you avoid mutating previous answers?", "What is the complexity of subsets?"],
                ["balanced-brackets"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "greedy",
        "title": "Greedy",
        "description": "Local choices that stay correct globally.",
        "difficulty": "MEDIUM",
        "minutes": 10,
        "roadmap_key": "greedy",
        "practice_tag": "array",
        "order": 19,
        "lessons": [
            L(
                "when-greedy-works",
                "When Greedy Works",
                "Sort, then commit — only if you can prove no later choice is better.",
                9,
                "A greedy algorithm locks in the locally best move. It works when that move is safe for the global optimum.",
                "Interviewers want the proof sketch, not just 'I'll take the smallest each time.'",
                "Typical pattern: sort by start, end, or ratio, then scan once. Interval scheduling takes the meeting that finishes first.",
                "Buy/sell stock once: track the minimum price so far and the best profit. That is greedy on the cheapest buy before today.",
                "- Interval scheduling\n- Jump game\n- Single-pass stock profit",
                "If a later decision can invalidate an earlier one, you need DP. Greedy is faster when it applies — usually O(n log n) from the sort.",
                "- Greedy on a problem that needs DP\n- Sorting by the wrong key",
                "Name a counter-example if greedy is wrong. That earns more trust than forcing it.",
                ["Greedy needs a proof.", "Sorting is usually step one.", "If tomorrow can invalidate today, think DP."],
                ["When does greedy fail?", "Why sort intervals by end time?"],
                ["single-pass-profit"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "dp-1d",
        "title": "1-D Dynamic Programming",
        "description": "Linear recurrences and overlapping subproblems.",
        "difficulty": "MEDIUM",
        "minutes": 12,
        "roadmap_key": "dp-1d",
        "practice_tag": "dynamic-programming",
        "order": 20,
        "lessons": [
            L(
                "one-dimensional-dp",
                "One-Dimensional DP",
                "Define the state as 'best answer ending at i'.",
                10,
                "1-D DP stores answers along a line. You need optimal substructure and overlapping subproblems — otherwise just iterate.",
                "House robber, climb stairs, and decode ways are the classic screen questions.",
                "Name `dp[i]`. Write the recurrence from smaller i. Initialize the first one or two cells. Iterate forward. Compress to a few variables if only the last k matter.",
                "Climbing stairs: `dp[i] = dp[i-1] + dp[i-2]`. Same as Fibonacci. You only keep two integers.",
                "- Climb stairs\n- House robber\n- Coin change (unbounded)",
                "O(n) time, often O(1) extra after compression. Harder than greedy to get right; easier than 2-D DP to explain.",
                "- Off-by-one initialization\n- Using a future state\n- Forgetting you can skip an element",
                "Start with the English state, then the recurrence, then code. Do not open a `dp` array first.",
                ["State, then recurrence, then init.", "Many 1-D DPs compress to a few vars.", "Overlapping work is the reason for DP."],
                ["What is the state for house robber?", "When can you compress a DP array?"],
                ["single-pass-profit"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "dp-2d",
        "title": "2-D Dynamic Programming",
        "description": "Grids, pairs of sequences, and two-index recurrences.",
        "difficulty": "HARD",
        "minutes": 12,
        "roadmap_key": "dp-2d",
        "practice_tag": "dynamic-programming",
        "order": 21,
        "lessons": [
            L(
                "two-index-dp",
                "Two-Index DP",
                "One index per sequence, or row and column in a grid.",
                10,
                "2-D DP answers questions about two moving positions: `dp[i][j]` is the best answer using the first i of A and first j of B, or a cell in a grid.",
                "Edit distance, LCS, and unique paths show whether you can fill a table without mixing up dependencies.",
                "Draw the table. Each cell uses already-computed neighbors (usually left, up, or diagonal). Initialize the first row/column carefully.",
                "Unique paths in an m×n grid with only right/down moves: `dp[i][j] = dp[i-1][j] + dp[i][j-1]`.",
                "- Unique paths\n- Edit distance\n- Longest common subsequence",
                "O(m n) time and space. You can often keep only the previous row. Mention that if they ask to optimize.",
                "- Filling in the wrong direction\n- Forgetting empty-prefix initialization",
                "Point at a cell and say which cells it depends on. That is the whole interview.",
                ["Two indexes, one table.", "Initialize edges first.", "Space can often drop to one row."],
                ["How do you define dp[i][j] for LCS?", "How do you cut space to O(min(m,n))?"],
                ["valley-rain"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "bit-manipulation",
        "title": "Bit Manipulation",
        "description": "Masks, parity, and the xor tricks interviewers still like.",
        "difficulty": "MEDIUM",
        "minutes": 8,
        "roadmap_key": "bit-manipulation",
        "practice_tag": "math",
        "order": 22,
        "lessons": [
            L(
                "xor-and-masks",
                "XOR and Masks",
                "Bits are a set. XOR is a toggle.",
                8,
                "Bit tricks replace extra memory when the universe is small or when duplicates cancel.",
                "Single-number, subset masks, and 'count bits' still appear in screens.",
                "XOR of a number with itself is 0; XOR with 0 is the number. A mask `1 << i` tests or sets bit i. `n & (n-1)` clears the lowest set bit.",
                "Find the value that appears once when every other value appears twice: XOR the whole array.",
                "- Single number\n- Subsets via bit masks\n- Power of two (`n > 0 && (n & (n-1)) == 0`)",
                "Harder to read. Prefer a hash map if n is tiny and clarity matters — then mention the bit solution as an optimization.",
                "- Sign bit surprises in Java (`>>>` vs `>>`)\n- Off-by-one on 32-bit loops",
                "If you use XOR, say why the duplicates vanish. Do not treat it as magic.",
                ["XOR cancels pairs.", "A mask tests one bit.", "Clarity still beats a clever one-liner."],
                ["How do you find the single number?", "How do you test if n is a power of two?"],
                ["missing-range-value"],
            )
        ],
    },
    {
        "category": "dsa",
        "slug": "intervals",
        "title": "Intervals",
        "description": "Merge, overlap, and schedule ranges.",
        "difficulty": "MEDIUM",
        "minutes": 10,
        "roadmap_key": "intervals",
        "practice_tag": "array",
        "order": 23,
        "lessons": [
            L(
                "merge-and-overlap",
                "Merge and Overlap",
                "Sort by start, then sweep once.",
                9,
                "Interval problems become linear after you sort. The active end is the only thing you need to remember.",
                "Calendar merge, meeting rooms, and insert-interval are the same sweep in different clothes.",
                "Sort by start. If the next interval starts after the current end, emit the current and start a new one. Otherwise extend the end.",
                "`[1,3] [2,6] [8,10]` merges to `[1,6] [8,10]`.",
                "- Merge intervals\n- Meeting rooms\n- Insert interval",
                "Sorting dominates: O(n log n). A min-heap of end times answers 'how many rooms?'",
                "- Forgetting to sort\n- Using < instead of <= for touching ends — ask if touching intervals merge",
                "Ask whether `[1,2][2,3]` should merge. That one question prevents a wrong answer.",
                ["Sort, then sweep.", "Keep the running end.", "Clarify touching edges."],
                ["How do you merge intervals?", "How many meeting rooms do you need?"],
                ["missing-range-value"],
            )
        ],
    },
]


def _topic(category: str, slug: str, title: str, description: str, difficulty: str, minutes: int, order: int, lessons: list[dict], roadmap_key: str | None = None, practice_tag: str | None = None) -> dict:
    return {
        "category": category,
        "slug": slug,
        "title": title,
        "description": description,
        "difficulty": difficulty,
        "minutes": minutes,
        "roadmap_key": roadmap_key,
        "practice_tag": practice_tag,
        "order": order,
        "lessons": lessons,
    }


def _one(
    category: str,
    slug: str,
    title: str,
    description: str,
    order: int,
    concept: str,
    why: str,
    how: str,
    example: str,
    uses: str,
    tradeoffs: str,
    mistakes: str,
    tip: str,
    takeaways: list[str],
    questions: list[str],
    difficulty: str = "MEDIUM",
    minutes: int = 8,
    problems: list[str] | None = None,
) -> dict:
    return _topic(
        category,
        slug,
        title,
        description,
        difficulty,
        minutes,
        order,
        [
            L(
                slug,
                title,
                description,
                minutes,
                concept,
                why,
                how,
                example,
                uses,
                tradeoffs,
                mistakes,
                tip,
                takeaways,
                questions,
                problems,
            )
        ],
    )


def _system_design_template_topic() -> dict:
    return _topic(
        "system-design",
        "system-design-template",
        "System Design Template",
        "ASK → SIZE → SHAPE → STRESS → SELL — the repeatable 45-minute playbook.",
        "EASY",
        14,
        1,
        [
            {
                "slug": "system-design-template",
                "title": "System Design Template",
                "short": "An interview framework you can run on any prompt.",
                "minutes": 14,
                "content": """# System Design Template

A repeatable framework for system design interviews. If you remember only five words, remember these.

ASK → SIZE → SHAPE → STRESS → SELL

| Step | What you do |
| --- | --- |
| **ASK** | Requirements — what are we building, and what is out of scope? |
| **SIZE** | Scale and estimates — QPS, storage, bandwidth, read/write ratio |
| **SHAPE** | APIs, data, and architecture — the outside, the records, then the boxes |
| **STRESS** | Deep dive and failures — the 1–3 hard parts, then what breaks |
| **SELL** | Trade-offs and summary — why this design, in 30 seconds |

## The Full Interview Flow

1. **Clarify** — What are we building? What is in and out of scope?
2. **Requirements** — Functional + non-functional priorities
3. **Estimate** — QPS, storage, bandwidth, read/write ratio
4. **API + Data** — How clients interact and what we store
5. **Architecture** — High-level components and request flow
6. **Deep Dive** — The 1–3 hardest or most important components
7. **Failures** — Bottlenecks, reliability, scaling, and recovery
8. **Trade-offs** — Why this design? What are the alternatives?
9. **Summary** — Recap the architecture and major decisions

## 1. Clarify Requirements

Start with questions. Do not immediately draw boxes.

- Who are the users?
- What are the core features?
- What operations must the system support?
- What is explicitly out of scope?

Example: "Before I start, I would like to clarify the requirements. Should we support only URL creation and redirection, or also analytics, custom aliases, and expiration?"

> Memory cue: ASK = Ask before you architect.

## 2. Functional + Non-Functional Requirements

Decide what matters before deciding what technology to use.

- **Functional** — What must the system do?
- **Scale** — How many users and requests?
- **Latency** — How fast must it respond?
- **Availability** — How much downtime is acceptable?
- **Consistency** — Strong or eventual?
- **Durability** — Can data ever be lost?

> Memory cue: Write the NFRs on the board. They justify every later box.

## 3. Back-of-the-Envelope Estimation

Estimate only enough to justify the architecture. Order-of-magnitude is enough.

- Average QPS = Daily requests ÷ 86,400
- Peak QPS = Average QPS × peak factor (often 2–3×)
- Storage = Writes × average record size × retention
- Bandwidth = QPS × average request/response size

> Memory cue: SIZE = How big is the problem?

## 4. APIs + Data Model

Define the system boundary and the data before designing internals.

- What API endpoints are needed?
- What are the request and response formats?
- What entities must be stored?
- What is the primary key?
- What indexes are needed?
- SQL or NoSQL, and why?

> Memory cue: SHAPE begins here — define the outside and the data.

## 5. High-Level Architecture

Start simple. Add a box only when a requirement or a number forces it.

Client → Load Balancer → Services → Cache → Database

Walk the request flow out loud. The interviewer should always know what happens next.

## 6. Deep Dive

Pick only the most important 1–3 areas. Do not deep dive into everything.

- **URL shortener** — ID generation, caching, database scaling
- **Chat system** — WebSockets, ordering, offline messages
- **Video platform** — Upload, transcoding, storage, CDN
- **Ride sharing** — Location updates, geospatial indexing, matching

> Memory cue: STRESS the part of the system most likely to fail at scale.

## 7. Bottlenecks, Failures & Scaling

Ask these out loud, then name the tool that answers each one.

- What happens if the database fails?
- What happens if the cache is unavailable?
- What happens during a traffic spike?
- What happens if a service or availability zone goes down?
- How do retries, replication, queues, and failover work?

Common tools: replication, load balancing, retries, dead-letter queues, circuit breakers, multi-AZ, rate limiting.

## 8. Trade-offs

This is where senior candidates pull ahead. Every major decision should answer: why this, instead of something else?

- **Cache** — lower latency, at the cost of invalidation and stale reads
- **SQL** — stronger transactions, harder to shard for some write patterns
- **NoSQL** — easier scale and flexible schemas, weaker joins and transactions
- **Async processing** — better throughput and resilience, eventual consistency and more ops

> Useful phrase: "I chose X because the primary requirement is Y. The trade-off is Z."

## 9. Final Summary

Finish with a 30-second recap.

"We designed a highly available system optimized for low-latency reads. The architecture uses load balancing for horizontal scale, caching to reduce database load, and replicated storage for durability. The main trade-off is increased complexity from distributed components and cache consistency."

## The Visual Memory Map

ASK → SIZE → SHAPE → STRESS → SELL

- **ASK** → Requirements
- **SIZE** → Estimates
- **SHAPE** → API → Data → Architecture
- **STRESS** → Deep dive → Bottlenecks → Failures
- **SELL** → Trade-offs → Summary

## 30-Second Pre-Interview Checklist

- **ASK** — Have I clarified the scope?
- **SIZE** — Do I know the scale and traffic?
- **SHAPE** — Have I defined APIs, data, and high-level architecture?
- **STRESS** — Did I analyze the hardest parts and failure modes?
- **SELL** — Did I explain the trade-offs and summarize the design?

## Practice Tip: Use the 3-Pass Method

- **Pass 1** — Design the system yourself without notes.
- **Pass 2** — Compare against a strong reference solution.
- **Pass 3** — Redesign it aloud in 30–45 minutes.

The goal is not to memorize architecture diagrams. Memorize the thinking process.

## Golden Rule

Do not memorize solutions. Memorize the questions you ask yourself.
""",
                "takeaways": [
                    "Memorize ASK → SIZE → SHAPE → STRESS → SELL, not architecture diagrams.",
                    "Ask and estimate before you draw boxes.",
                    "Deep-dive 1–3 hard parts, then sell the trade-offs in 30 seconds.",
                ],
                "questions": [
                    "How do you start a system design interview?",
                    "What does ASK, SIZE, SHAPE, STRESS, SELL stand for?",
                    "What belongs in the final 30-second summary?",
                ],
                "problems": [],
            }
        ],
    )


def _system_design_topics() -> list[dict]:
    rows = [
        ("system-design-fundamentals", "System Design Fundamentals", "A repeatable 45-minute structure: requirements, API, data, scale, deepen.", "Start every design with users, constraints, and a single request path before you draw boxes.", "Interviewers grade structure more than whether you picked Kafka.", "Clarify functional + non-functional requirements. Estimate QPS and storage. Sketch API and a single-box design. Then split bottlenecks: load balancer, app, cache, DB, queue.", "Design URL shortener: write, read, 100:1 read ratio. Start with one app + SQL, then add cache and a key generator.", "Any 45-minute design", "Depth in one area beats a crowded diagram.", "Jumping to microservices first", "Say the numbers out loud. They justify every later box.", ["Requirements, then a simple design, then scale.", "Numbers justify architecture."], ["How do you start a system design interview?", "What do you estimate first?"]),
        ("requirements-gathering", "Requirements Gathering", "Ask before you draw.", "Functional vs non-functional requirements decide the design.", "Wrong assumptions waste the remaining 40 minutes.", "Ask who the user is, write vs read, consistency, latency, and what you can drop. Summarize back.", "News feed: 'Is this Twitter or LinkedIn? How fresh must the feed be?'", "Every design interview", "Too many questions eat the clock. Cap at 3–5 critical ones.", "Designing a chat app when they wanted email", "Write the requirements on the board and point at them later.", ["Repeat requirements back.", "NFRs drive the architecture."], ["What questions do you ask first?", "Functional vs non-functional?"]),
        ("capacity-estimation", "Capacity Estimation", "Back-of-the-envelope math that justifies shards and caches.", "QPS, storage, and bandwidth tell you when one box dies.", "Without numbers, 'we should shard' is fashion.", "Users × actions/day / 86400 = QPS. Average payload × writes × retention = storage. Peak is often 2–3× average.", "100M users, 5 reads/day → ~6k average read QPS, ~15k peak.", "Storage vs QPS vs bandwidth", "Order-of-magnitude is enough. Fake precision looks worse.", "Forgetting replication multiplier", "Round aggressively. Interviewers want the method.", ["QPS, storage, bandwidth.", "Peak ≠ average.", "Replication multiplies storage."], ["How do you estimate QPS?", "Why does peak matter?"]),
        ("api-design", "API Design", "Resources, verbs, pagination, and idempotency.", "A clean API is the contract between client and design.", "It shows you can think from the caller inward.", "REST for CRUD. Idempotent PUTs. Cursor pagination. Version when you must. Error bodies that a client can parse.", "`POST /v1/urls` returns `{id, short, long}`. `GET /{code}` 302s.", "Public APIs and internal services", "GraphQL is a tool, not a default flex.", "Unbounded list endpoints", "Define the write path first. Reads follow.", ["Idempotency on writes.", "Paginate lists.", "Design from the caller."], ["What makes an API idempotent?", "Cursor vs offset pagination?"]),
        ("load-balancing", "Load Balancing", "Spread traffic so no single app box is the bottleneck.", "Horizontal scale starts with a balancer.", "It is the first box after 'one server is not enough.'", "L4 vs L7. Round robin, least connections, consistent hash. Health checks and connection draining.", "TLS terminates at the L7 balancer; app pods see HTTP.", "Stateless app tiers", "Sticky sessions fight scale — put session in Redis instead.", "No health checks", "Say 'stateless app + LB' before you add more boxes.", ["LB enables horizontal scale.", "Prefer stateless apps.", "Health checks matter."], ["L4 vs L7?", "Why avoid sticky sessions?"]),
        ("caching", "Caching", "Store expensive answers closer to the reader.", "Caches cut latency and database load.", "Most read-heavy designs die without one.", "Aside cache (Redis) with cache-aside: read cache, miss → DB → fill. Set TTLs. Invalidate on write when freshness matters.", "URL redirect: cache code → long URL. TTL plus write-through on create.", "Hot keys, sessions, feed fanout", "Stale data vs load. Cache stampede needs locking or early refresh.", "Caching without a TTL or invalidation story", "Name what you cache and why it is safe to be slightly stale.", ["Cache-aside is the default.", "TTL or invalidate.", "Watch stampedes."], ["What is cache-aside?", "How do you prevent a stampede?"]),
        ("databases", "Databases", "Pick the store that matches the access pattern.", "The database is usually the hard part of the design.", "Wrong store forces a rewrite of everything above it.", "Rows + relations → SQL. Huge append-only or flexible docs → NoSQL. Ask about transactions, query shapes, and growth.", "Payments stay on SQL. Activity streams may use a log or wide-column store.", "System of record vs derived views", "Polyglot persistence has ops cost. Start with one store.", "Defaulting to the trendy database", "Describe the queries first, then pick the store.", ["Access patterns pick the DB.", "Transactions favor SQL.", "Start with one store."], ["How do you choose a database?", "When is NoSQL the wrong call?"]),
        ("sql-vs-nosql", "SQL vs NoSQL", "Joins and transactions versus scale and flexibility.", "This comparison comes up in almost every design.", "It tests whether you understand consistency and query shape.", "SQL: schema, joins, ACID. NoSQL: partition key, denormalize, scale writes. Many systems use both.", "User accounts in Postgres. Session store in Redis. Analytics in a warehouse.", "Core vs satellite data", "NoSQL is not 'faster SQL'. It is a different data model.", "Pretending you never need joins", "Say what you would join, then say how you would denormalize it.", ["SQL for relations and transactions.", "NoSQL for partition-shaped access.", "Denormalize on purpose."], ["When would you pick Postgres?", "What do you give up with NoSQL?"]),
        ("replication", "Replication", "Copies of data for reads and durability.", "Replication is how you survive a disk dying and how you scale reads.", "Interviewers want leader/follower and lag in your vocabulary.", "Primary takes writes. Replicas serve reads. Async is faster and can lose the last writes. Sync is safer and slower.", "A checkout primary with two async read replicas for product pages.", "Read scale, HA", "Replica lag makes a user miss their own write — read-your-writes needs sticky or primary reads.", "Treating replicas as instantly consistent", "Ask if the product can tolerate lag.", ["Primary writes, replica reads.", "Async vs sync is a durability tradeoff.", "Lag is real."], ["What is replica lag?", "Sync vs async replication?"]),
        ("sharding", "Sharding", "Split data by a key when one primary cannot hold it.", "Sharding is the step after vertical scale and replicas.", "It is easy to say and hard to get the key right.", "Pick a shard key with even load and a query that always includes it. Directory or hash. Plan resharding.", "Shard users by user_id. A request for user 42 always hits the same shard.", "Very large datasets, write-heavy systems", "Cross-shard joins and transactions hurt. Hot keys (one celebrity) break hash dreams.", "Sharding by an ever-increasing timestamp", "Name the key and one query that would be painful.", ["The shard key is the design.", "Avoid cross-shard transactions.", "Plan for rebalancing."], ["How do you choose a shard key?", "What is a hot shard?"]),
        ("message-queues", "Message Queues", "Decouple a write from slow work.", "Queues absorb spikes and let workers retry.", "They are the difference between a request that times out and a job that finishes.", "Producer puts a message. Consumers pull. At-least-once delivery means consumers must be idempotent.", "After checkout, enqueue 'send email' instead of talking to SMTP in the request.", "Emails, image processing, fanout", "At-least-once duplicates. Ordering across partitions is limited.", "Assuming exactly-once without saying how", "Say 'at-least-once + idempotent consumer' out loud.", ["Queues decouple latency.", "Idempotent consumers.", "At-least-once is the default."], ["Why use a queue?", "What does at-least-once imply?"]),
        ("event-driven-architecture", "Event-Driven Architecture", "Services react to facts instead of calling each other for every write.", "Events scale independent teams and async workflows.", "Useful when a write has many side effects.", "A service emits `OrderPlaced`. Billing, email, and inventory subscribe. The log is the history.", "An order service never calls email directly.", "Commerce, notifications, audit", "Harder to trace a single request. You need ids and observability.", "A cyclic event storm", "Draw one write and the events it fans out to — not twelve services.", ["Events are facts.", "Consumers stay decoupled.", "Tracing needs correlation ids."], ["Event vs command?", "What goes wrong in event-driven systems?"]),
        ("consistency", "Consistency", "How stale is too stale?", "Consistency is the NFR that decides caches, replicas, and transactions.", "Strong words without a definition lose the room.", "Strong: every read sees the latest write. Eventual: replicas catch up. Read-your-writes and causal are useful middle grounds.", "A 'like' count can be eventual. A bank transfer cannot.", "Caches, replicas, multi-region", "Strong consistency costs availability or latency. Be explicit.", "Saying 'eventual consistency' for money movement", "Pick consistency per use case, not per company slogan.", ["Consistency is per use case.", "Name the stale window.", "Money is usually strong."], ["Strong vs eventual?", "What is read-your-writes?"]),
        ("cap-theorem", "CAP Theorem", "When a partition happens, you choose consistency or availability.", "CAP is the vocabulary for multi-node failure.", "They want a crisp definition, not a slogan.", "Partition is not optional on a network. CP refuses some requests. AP serves possibly stale data. CA is 'no partition' — a single node.", "A quorum write (CP) vs serving last cached inventory (AP) during a split.", "Multi-region designs", "CAP is about a partition, not everyday latency. PACELC adds the latency tradeoff.", "Using CAP to reject every cache", "Talk about the user-visible failure first, then name CP or AP.", ["Partition forces C or A.", "Choose per request type.", "CA means one node."], ["What does CAP actually say?", "Give a CP example."]),
        ("rate-limiting", "Rate Limiting", "Protect the system from noisy or abusive clients.", "Without a limit, one client is a denial-of-service.", "It is a concrete, implementable design slice.", "Token bucket or sliding window at the edge. Key by user or IP. Return 429 with a retry-after.", "100 requests / minute / API key, enforced on the gateway.", "Public APIs, login, SMS", "Distributed counters need Redis. Local limits drift across pods.", "Silent drops without a 429", "Mention fairness and a bypass for internal health checks.", ["Limit at the edge.", "Token bucket is the usual model.", "Return 429."], ["Token bucket vs window?", "Where do you enforce the limit?"]),
        ("distributed-systems", "Distributed Systems", "Clocks lie. Nodes fail. Retries duplicate.", "These are the rules under every multi-box design.", "Senior interviews live here.", "Use timeouts, retries with jitter, idempotency keys, and health checks. Prefer unique ids from a generator over 'now()'.", "A payment retry must not charge twice — key the charge by `idempotency-key`.", "Any multi-service design", "More nodes mean more failure modes. Complexity is a cost.", "Assuming a global clock", "Name one failure and how the user sees it.", ["Retries need idempotency.", "Timeouts everywhere.", "Do not trust clocks."], ["Why are retries dangerous?", "How do you generate unique ids?"]),
        ("observability", "Observability", "Logs, metrics, traces — so you can debug at 2am.", "A design without this is unfinished.", "It shows you have run production systems.", "RED/USE metrics, structured logs with request ids, and traces across services. Alerts on symptoms (latency, errors), not only CPU.", "A trace id follows a checkout through API, queue, and worker.", "Every production system", "High-cardinality labels explode metric cost.", "Logging payloads that contain secrets", "Pick one user journey and show how you would debug it.", ["Metrics, logs, traces.", "Alert on user symptoms.", "Correlate with request ids."], ["What is a trace?", "What would you alert on?"]),
        ("security", "Security", "Authn, authz, secrets, and the data you must not leak.", "Security is an NFR that reshapes APIs and storage.", "Skipping it looks junior.", "TLS in transit. Encrypt sensitive columns. Short-lived tokens. Least privilege. Never log secrets or PII you do not need.", "OAuth2 access token on the API, refresh token in an HttpOnly cookie.", "Any user-facing system", "Security vs convenience. Extra checks add latency — usually worth it.", "Rolling your own crypto", "Mention abuse cases: IDOR, injection, leaked tokens.", ["TLS, authn, authz.", "Least privilege.", "Do not invent crypto."], ["Authn vs authz?", "Where do you store tokens?"]),
        ("scalability", "Scalability", "Do more work by adding machines, not bigger ones.", "Scale is the plot of most system designs.", "They want the sequence: vertical, then horizontal, then split.", "Stateless app tier + LB. Cache reads. Replicate for read scale. Shard when the primary cannot take writes. Async the slow path.", "A photo service: CDN for images, app pods, SQL for metadata, queue for thumbnails.", "Growth after the MVP box", "Premature sharding is expensive. Scale the measured bottleneck.", "Drawing 15 boxes on the first sketch", "Scale the bottleneck you named in the estimate.", ["Horizontal over hero hardware.", "Cache, replicate, then shard.", "Async slow work."], ["Vertical vs horizontal?", "When do you shard?"]),
    ]
    out = []
    for i, row in enumerate(rows):
        slug, title, desc, why, how, example, uses, tradeoffs, mistakes, tip, takeaways, questions = _twelve(row)
        out.append(
            _one(
                "system-design",
                slug,
                title,
                desc,
                i + 2,
                concept=desc,
                why=why,
                how=how,
                example=example,
                uses=uses,
                tradeoffs=tradeoffs,
                mistakes=mistakes,
                tip=tip,
                takeaways=takeaways,
                questions=questions,
            )
        )
    return out


def _system_design_problem_topic() -> dict:
    return _topic(
        "system-design",
        "sd-design-problems",
        "Design Problems",
        "Full 45-minute system design interview prompts. Practice the structure on real products, not just the vocabulary.",
        "MEDIUM",
        80,
        22,
        [
            L(
                "sd-url-shortener",
                "Design a URL Shortener",
                "The classic opener: write path, read path, and a 100:1 read ratio.",
                12,
                "Design a service like bit.ly. Users submit a long URL and get a short code. Opening the short link 302s to the original. Interviewers want requirements, a key scheme, a simple first design, then cache and scale.",
                "This is the most common 45-minute design. It tests whether you start with API and numbers before drawing six databases.",
                "Clarify: custom aliases, expiry, auth, analytics. Estimate: 100M new URLs/month, 100:1 reads. API: POST /v1/urls → {code, short, long}, GET /{code} → 302. First design: one app + SQL table (code PK, long_url, created_at). Generate a 7-char base62 code from a counter or hash; handle collisions. Then add a cache on code→url and a unique-id generator so writes do not serialize on one row.",
                "Write: app allocates id 125, encodes to base62 `cb`, stores {cb → https://example.com/a}. Read: cache hit returns the long URL; miss loads SQL and fills the cache with a TTL.",
                "- Read-heavy redirects\n- Unique id generation\n- Cache-aside on a hot key",
                "Hash of the URL is simpler but collides and cannot support two shorts for one long URL. A counter needs a range allocator (Snowflake-style or DB sequences in batches) so app nodes do not fight one lock.",
                "- Jumping to Kafka and Cassandra on a 100M-row table\n- No collision or uniqueness story\n- Forgetting that GET must be fast and cacheable\n- 6-char codes that run out sooner than you think",
                "Say the read path in one sentence, then the write path. Depth on the key generator beats a crowded diagram.",
                [
                    "Requirements and QPS first, then one box, then the bottleneck.",
                    "Base62 + unique ids beat hashing the URL.",
                    "Cache the redirect. Writes can be slower.",
                ],
                [
                    "How do you generate a unique short code?",
                    "What is the read path at 100:1?",
                    "When do you shard this table?",
                ],
            ),
            L(
                "sd-news-feed",
                "Design a News Feed",
                "Fan-out on write vs read, ranking, and what 'fresh' means.",
                12,
                "Design a home feed: a user posts, followers see it, roughly in time order with some ranking. The hard part is fan-out — who materializes the feed, and when.",
                "Feeds show whether you can pick a consistency model and defend a write amplification number.",
                "Ask: Twitter-style (follow graph, public) or LinkedIn-style (connection, slower)? How many follows? How fresh? API: POST /posts, GET /feed?cursor=. Fan-out on write: on publish, push the post id onto each follower's precomputed feed (Redis list / Cassandra). Fan-out on read: pull recent posts from people you follow at request time. Hybrid: precompute for normal users, pull celebrities at read time so one mega-user does not write 40M rows.",
                "A user with 200 followers posts. The write path enqueues 200 feed inserts. A celebrity with 20M followers only writes the post; readers merge that author's recent posts into the cached feed.",
                "- Social timelines\n- Notification inboxes\n- Activity streams",
                "Fan-out on write is fast to read and expensive to write. Fan-out on read is cheap to write and slow or bursty to read. Ranking on the precomputed list needs a later re-rank of a candidate set, not a global sort of the internet.",
                "- One strategy for every user\n- No pagination story\n- Ignoring celebrity / hot-key fan-out\n- Designing the whole ranking ML stack in 15 minutes",
                "Pick hybrid and name the celebrity threshold. Then walk one publish and one GET /feed.",
                [
                    "Fan-out on write vs read is the design.",
                    "Celebrities break naive fan-out.",
                    "Cursor pagination, not offset.",
                ],
                [
                    "Fan-out on write vs read?",
                    "How do you handle a celebrity post?",
                    "How do you paginate a feed?",
                ],
            ),
            L(
                "sd-chat-system",
                "Design a Chat System",
                "1:1 and group messages, delivery, and online presence.",
                11,
                "Design a messenger: 1:1 chat first, then groups, unread, and 'online'. Messages must arrive quickly and survive refresh. The shape is connections + an append-only message store.",
                "Chat tests websockets vs polling, ordering, and what happens when a phone goes to sleep.",
                "API: websocket for live traffic, REST to load history. Store messages in an append-only table keyed by chat_id + created_at/id. 1:1 chats are a conversation id. Groups need a member list and fan-out to online connections (gateway holds sockets; a pub/sub channel per chat). Presence is a heartbeat in Redis with a short TTL. Unread is a per-user last_read_id, not a row per message.",
                "Alice sends to Bob. Gateway writes the message, publishes to chat:42, Bob's gateway connection receives it. If Bob is offline, the next history fetch returns everything after last_read_id.",
                "- 1:1 messaging\n- Small group chat\n- Typing indicators and presence",
                "Polling is simpler and worse for latency. Multiple devices need the event on every connection for that user. Exactly-once delivery is a lie — use at-least-once plus an idempotent message id.",
                "- Storing one row per unread recipient on every send\n- No offline story\n- Ordering across partitions you never named\n- Building a full end-to-end encrypted protocol unprompted",
                "Draw the websocket, the message table, and the offline fetch. Mention message ids before 'Kafka'.",
                [
                    "Live path is a socket. History is a query.",
                    "Append-only messages keyed by chat.",
                    "Presence is a TTL, not a boolean forever.",
                ],
                [
                    "Websocket vs long polling?",
                    "How do you store group messages?",
                    "How do you implement unread counts?",
                ],
            ),
            L(
                "sd-rate-limiter-design",
                "Design a Rate Limiter",
                "Protect the edge: token bucket, keys, and 429s.",
                10,
                "Design a limiter that caps requests per user or API key, usually at the gateway. Interviewers want the algorithm, where state lives, and what the client sees.",
                "It is a compact design you can finish well. It also shows up inside every public API design.",
                "Ask: per user, IP, or API key? Burst or strict window? Distributed or one box? Token bucket is the default: each key has tokens that refill at rate R, burst B. Sliding window is smoother and more state. Store counters in Redis (INCR + EXPIRE, or a Lua token-bucket). Return 429 with Retry-After. Fail open or closed if Redis is down — say it out loud.",
                "100 req/min/key. Gateway asks Redis. Token available → decrement and proxy. Empty → 429. A burst of 20 is allowed if B=20, then refill 100/60 tokens per second.",
                "- Public APIs\n- Login and OTP\n- Downstream protection",
                "Local in-memory limits drift across pods. A global Redis key is correct and becomes a hot key — shard by key hash. Strict fixed windows let a user double-fire at the boundary.",
                "- Silent drops with no 429\n- One global counter for every user\n- Ignoring multi-pod drift\n- Perfect precision on a clock you do not own",
                "Name the key, the algorithm, Redis, and the 429. That is a complete answer.",
                [
                    "Token bucket at the edge.",
                    "State is per key in Redis.",
                    "Always return 429 + Retry-After.",
                ],
                [
                    "Token bucket vs sliding window?",
                    "Where do you store the counters?",
                    "What happens if Redis is down?",
                ],
            ),
            L(
                "sd-web-crawler",
                "Design a Web Crawler",
                "Frontier, politeness, dedup, and what you store.",
                10,
                "Design a crawler that starts from seed URLs, fetches pages, extracts links, and stores content without melting target sites or looping forever.",
                "It is a distributed-queue problem with politeness constraints. Interviewers listen for robots.txt, per-host rate limits, and URL dedup.",
                "Frontier queue of URLs to visit. Fetcher workers pull a URL, honor robots.txt and a per-host delay, download, canonicalize, extract links, enqueue new ones. Dedup visited URLs with a Bloom filter plus a store of seen hosts/paths. Persist raw HTML or extracted text in object storage; keep metadata in a DB. Politely isolate queues per host so one domain cannot starve the crawl.",
                "Seed example.com. Worker fetches /, extracts /a and /b, skips /a if already seen, waits 1s before the next example.com fetch, while another worker hits a different host.",
                "- Search indexing\n- Site mirrors\n- Link graph analysis",
                "A single FIFO frontier hotspots popular hosts. Per-host queues plus a scheduler are fairer and slower. Freshness needs recrawl priority, not only BFS from seeds.",
                "- No politeness / robots.txt\n- Dedup only in memory on one box\n- Crawling query-string duplicates as new pages\n- Treating JavaScript apps as static HTML without saying so",
                "Frontier, fetcher, politeness, dedup. In that order. Then mention storage.",
                [
                    "Per-host queues keep the crawl polite.",
                    "Dedup URLs before you fetch.",
                    "Separate metadata from page blobs.",
                ],
                [
                    "How do you avoid recrawling the same URL?",
                    "How do you stay polite to one host?",
                    "BFS vs priority recrawl?",
                ],
            ),
            L(
                "sd-video-streaming",
                "Design a Video Streaming Service",
                "Upload, transcode, CDN, and adaptive bitrate.",
                11,
                "Design something like YouTube: upload a video, process it, and play it worldwide with acceptable startup time. The live path is not the origin server.",
                "This one tests async pipelines and CDNs. If you stream bytes from your API box, you failed the setup.",
                "Upload: client PUTs to object storage via a signed URL. A queue kicks transcode workers that produce renditions (360p–1080p) and a manifest (HLS/DASH). Metadata (title, owner, duration) lives in SQL. Playback: the app returns a CDN URL for the manifest; the player picks a bitrate and fetches segments from the edge. Thumbnails and previews are extra objects. Comments and likes are a separate, eventual service.",
                "A 1GB upload lands in S3. Workers emit 360/720/1080p segments. The watch page returns https://cdn/.../master.m3u8. Tokyo viewers hit a nearby POP, not your origin.",
                "- VOD platforms\n- Course video\n- Product demos",
                "Transcode is CPU-heavy and async — never in the upload request. More renditions cost storage and processing. Live streaming adds ingest and a much tighter lag budget; say so if they want live.",
                "- Serving video from the app tier\n- One bitrate for the world\n- No CDN\n- Mixing metadata updates with the byte path",
                "Signed upload, queue, renditions, CDN manifest. Leave recommendation ML for the last five minutes.",
                [
                    "Upload to object storage, not your API.",
                    "Transcode asynchronously into renditions.",
                    "Playback is a CDN problem.",
                ],
                [
                    "Why adaptive bitrate?",
                    "What happens after upload?",
                    "Where do viewers fetch segments?",
                ],
            ),
            L(
                "sd-ride-sharing",
                "Design a Ride Sharing System",
                "Riders, drivers, matching, and live location.",
                11,
                "Design a ride-hailing loop: request a ride, match a nearby driver, track the trip, settle payment. Matching and location updates are the interesting boxes.",
                "It combines geo queries, a stateful trip, and a marketplace that must not double-book a driver.",
                "Actors: rider, driver, trip. Location: drivers send GPS every few seconds to a location service (Redis GEO or a tiled in-memory grid). Request: find the k nearest available drivers in the tile, offer in order, first accept wins — use a lock on driver_id. Trip is a state machine (requested → matched → pickup → in_ride → done) in SQL. Payment is an async call with an idempotency key. Notifications go through push. ETA is a separate map service, not something you invent.",
                "A rider requests in a downtown tile. Three drivers are offered. Driver B accepts; A and C offers cancel. Both apps subscribe to trip:99 for location and state.",
                "- Ride hailing\n- Delivery dispatch\n- Nearby-driver maps",
                "Global 'nearest driver' scans do not scale — tile the map. Over-offering reduces wait and wastes driver attention. Strong consistency on the accept lock matters; location can be a few seconds stale.",
                "- One SQL query of all drivers by haversine\n- No trip state machine\n- Double-dispatching the same driver\n- Building your own routing engine",
                "Tiles + an accept lock + a trip state machine. Location is approximate on purpose.",
                [
                    "Geo-tile drivers. Do not scan the planet.",
                    "Matching needs a lock on accept.",
                    "A trip is a state machine.",
                ],
                [
                    "How do you find nearby drivers?",
                    "How do you prevent two riders matching one driver?",
                    "What state does a trip have?",
                ],
            ),
            L(
                "sd-autocomplete",
                "Design Search Autocomplete",
                "Prefix queries at type-ahead latency, with a way to rank suggestions.",
                10,
                "Design type-ahead: as the user types, show the top k completions in ~50–100ms. The data structure is a trie or a prefix index; the product question is freshness vs speed.",
                "It is a tight, finishable design. It also connects to ranking and caching.",
                "Client debounces and GETs /suggest?q=ca. An in-memory trie (or n-gram table) on each suggest box holds prefixes → top k terms. Rank by historical frequency, with a daily (or hourly) offline job rebuilding the top lists so the live path is a memory lookup. Cache hot prefixes at the edge. Personalization, if asked, is a cheap re-rank of the global top k, not a unique trie per user. Handle typos only if they push — fuzzy is a later layer.",
                "Prefix `ca` returns [cat, car, cafe] from a precomputed list. A new viral query appears after the next aggregation job, not on the next keystroke.",
                "- Search bars\n- Tag suggest\n- Command palettes",
                "A live update on every query is fresher and harder. Precomputed top-k is fast and slightly stale. Sharding the trie by prefix keeps each box in RAM.",
                "- Hitting the primary search index on every keystroke\n- No debounce\n- Building a unique structure per user on day one\n- Ignoring unicode / normalization",
                "Debounce, in-memory prefix → top k, offline rebuild. Mention cache for `a` and `the`.",
                [
                    "Live path is an in-memory prefix lookup.",
                    "Rank offline; serve a top-k list.",
                    "Debounce the client.",
                ],
                [
                    "Why not query the search index on each key?",
                    "How do you keep suggestions fresh?",
                    "How do you shard a trie?",
                ],
            ),
        ],
    )


def _twelve(row: tuple) -> tuple:
    items = list(row)
    if items and isinstance(items[-1], str) and items[-1] in {"EASY", "MEDIUM", "HARD"}:
        items = items[:-1]
    if items and isinstance(items[-1], list) and isinstance(items[-2], list) and items and isinstance(items[-3], list):
        items = items[:-1]
    takeaways, questions = items[-2], items[-1]
    head = items[:-2]
    if len(head) == 11:
        slug, title, desc, extra, *rest = head
        head = [slug, title, extra or desc, *rest]
    if len(head) != 10:
        raise ValueError(f"unexpected lesson row for {row[0]!r}: head={len(head)} total={len(row)}")
    return (*head, takeaways, questions)


def _java_row(row: tuple) -> tuple:
    items = list(row)
    probs = items.pop() if items and isinstance(items[-1], list) else []
    diff = items.pop() if items and isinstance(items[-1], str) and items[-1] in {"EASY", "MEDIUM", "HARD"} else "MEDIUM"
    return (*_twelve(tuple(items)), diff, probs)


def _java_topics() -> list[dict]:
    rows = [
        ("java-collections", "Java Collections", "List, Set, Map — pick the interface, then the implementation.", "Interviewers expect you to choose ArrayList vs LinkedList vs HashMap with a reason.", "The Collection API is the daily toolbox.", "List for order, Set for uniqueness, Map for keys. Default to ArrayList and HashMap unless you need otherwise.", "`new ArrayList<>()` for random access; `HashSet` to dedupe.", "Almost every Java solution", "LinkedList is rarely faster in real hardware.", "Declaring `ArrayList` instead of `List`", "Program to the interface.", ["Interface first.", "ArrayList and HashMap are the defaults.", "Know cost of get/add."], ["ArrayList vs LinkedList?", "When do you use a Set?"], "EASY", ["pair-target"]),
        ("hashmap-internals-java", "HashMap Internals", "Buckets, hashCode, and treeify.", "This is the most common Java deep-dive.", "It connects hashing theory to the JDK.", "hash → bucket. Collisions chain, then treeify at 8. Resize at 0.75. Keys need stable equals/hashCode.", "A bad hashCode turns get into a scan of a bucket.", "Any map-backed solution", "Worse than TreeMap for sorted keys.", "Using a mutable key", "Walk put() out loud.", ["Power-of-two table.", "equals and hashCode.", "Treeify is a worst-case guard."], ["What is load factor?", "What happens on collision?"], "MEDIUM", ["anagram-bundles", "pair-target"]),
        ("arraylist-vs-linkedlist", "ArrayList vs LinkedList", "Contiguous array versus node pointers.", "They will ask you to choose and justify.", "It is a complexity plus cache-locality question.", "ArrayList: O(1) get, amortized add at end, O(n) mid insert. LinkedList: O(n) get, O(1) insert if you already hold the node.", "Prefer ArrayList for almost all interview lists.", "Stacks, queues, results", "LinkedList loses on scans because of pointer chasing.", "Using LinkedList for random access", "Say 'cache locality' once. It lands.", ["ArrayList for access.", "LinkedList for rare mid inserts.", "Defaults matter."], ["When is LinkedList better?", "What is amortized add?"], "EASY", ["pair-target"]),
        ("equals-and-hashcode", "equals() and hashCode()", "The contract that keeps maps honest.", "Broken equals/hashCode is a classic trap.", "Hash-based collections depend on it.", "Equal objects must share a hashCode. If you override one, override both. Include the same fields.", "Two User ids equal must hash equal or a HashMap loses them.", "Entity keys, value objects", "Including mutable fields makes the key vanish after a setId.", "Only overriding equals", "List the fields in both methods in the same order.", ["Override both.", "Same fields.", "Do not mutate keys."], ["What is the contract?", "What if only equals is overridden?"], "MEDIUM", ["anagram-bundles"]),
        ("string-and-stringbuilder", "String and StringBuilder", "Immutable text versus a mutable buffer.", "String concatenation in a loop is a giveaway.", "It shows you know the JVM cost model.", "String is immutable. `+` in a loop is O(n²). StringBuilder appends in amortized O(1).", "Build a result with StringBuilder, then toString once.", "Answers that assemble text", "StringBuffer is synchronized — unused in interview code.", "Comparing with ==", "Mention the string pool only if they ask.", ["Strings are immutable.", "Builder in loops.", "Never == for content."], ["Why is String immutable?", "StringBuilder vs StringBuffer?"], "EASY", ["anagram-bundles"]),
        ("generics", "Generics", "Type parameters that vanish at runtime.", "You will write `List<Integer>` and maybe a generic method.", "It prevents ClassCastException and shows API taste.", "Type erasure: the JVM sees raw types. No `new T()`. Bounds with `extends`. Wildcards `?` for producers/consumers (PECS).", "`List<? extends Number>` can read Numbers, not add Integers safely.", "Collections and APIs", "Erasure forbids overloading on generic type alone.", "Using raw types", "Keep it to List<T> unless they push.", ["Erasure is real.", "PECS for wildcards.", "No new T()."], ["What is type erasure?", "What does PECS mean?"], "MEDIUM", []),
        ("streams", "Streams", "Declarative pipelines over collections.", "Many teams expect fluent map/filter. Interviews still want you to know the cost.", "It is Java 8+ fluency without hiding Big-O.", "Source → intermediate (lazy) → terminal. Prefer simple loops if the pipeline is forced.", "`list.stream().map(User::id).toList()`.", "Transformations, grouping", "Harder to debug. Easy to hide O(n²).", "A 12-step stream in a 20-minute problem", "Use a stream when it is clearer, a loop when it is not.", ["Lazy until terminal.", "Clarity over cleverness.", "Know the complexity."], ["Intermediate vs terminal?", "Are streams faster than loops?"], "MEDIUM", ["anagram-bundles"]),
        ("lambdas", "Lambdas", "Functions as values.", "Lambdas unlock streams and APIs like sort.", "They test whether you know functional interfaces.", "A lambda implements a single-abstract-method type. Method references `User::getId` are shorter lambdas.", "`list.sort(Comparator.comparingInt(User::age))`.", "Callbacks, comparators", "Capturing mutable locals is illegal; capturing effectively final is fine.", "Side-effecting lambdas that mutate shared lists", "Keep lambdas one line.", ["SAM types.", "Method references.", "No mutable capture."], ["What is a functional interface?", "What can a lambda capture?"], "EASY", []),
        ("exception-handling", "Exception Handling", "Checked, unchecked, and what you should throw.", "Clean error paths look professional.", "It is also a design question: who handles what?", "Unchecked for programming bugs. Checked when the caller must decide. Never swallow. Wrap with context.", "A parse method throws IllegalArgumentException on bad input, not a bare Exception.", "I/O, validation", "Checked exceptions clutter APIs — many teams wrap them.", "Empty catch blocks", "Fail fast with a precise type.", ["Don't swallow.", "Precise types.", "Add context when wrapping."], ["Checked vs unchecked?", "When do you create a custom exception?"], "EASY", []),
        ("jvm-basics", "JVM Basics", "Compile to bytecode, run on a VM.", "Senior Java interviews go below the language.", "It explains performance and portability.", "javac → bytecode → JIT. Heap for objects, stacks per thread. Class loading is lazy.", "A hot loop gets JIT-compiled after enough invocations.", "Performance talks", "You rarely tune JIT in an interview. Know the picture.", "Confusing JDK, JRE, and JVM", "Draw heap vs stack if they ask about memory.", ["Bytecode + JIT.", "Heap vs stack.", "Hot code gets compiled."], ["What does the JIT do?", "JDK vs JRE vs JVM?"], "MEDIUM", []),
        ("garbage-collection", "Garbage Collection", "Unreachable objects get reclaimed.", "GC pauses are a production topic that leaks into interviews.", "It shows you have run Java services.", "GC roots → mark live objects → reclaim the rest. Generational heap: young/old. Stop-the-world pauses vary by collector.", "A cache without eviction fills old gen and GC thrashes.", "Long-running services", "More memory is not always fewer pauses.", "Holding unused collections 'just in case'", "Mention a modern collector (G1) if they ask which.", ["Unreachable ⇒ collectible.", "Generational heap.", "Pauses depend on the collector."], ["What is a GC root?", "Young vs old generation?"], "MEDIUM", []),
        ("multithreading", "Multithreading", "More than one call stack in one JVM.", "Concurrency questions start here.", "Races are easier to discuss with shared vocabulary.", "A Thread runs a Runnable. Shared mutable state needs coordination. Prefer executors over raw threads.", "A web server handles each request on a pool thread.", "I/O wait, parallel CPU", "More threads ≠ more speed. Context switches cost.", "Starting unbounded threads per request", "Name the shared state first.", ["Threads share the heap.", "Pools beat raw threads.", "Shared mutation is the risk."], ["Process vs thread?", "Why a thread pool?"], "MEDIUM", []),
        ("concurrency", "Concurrency", "Happens-before, locks, and concurrent collections.", "This is the Java deep end.", "They want you to avoid `synchronized` on everything.", "volatile for visibility of one field. synchronized / ReentrantLock for mutual exclusion. ConcurrentHashMap for maps. Don't invent lock-free.", "A hit counter needs AtomicInteger, not `++` on an int.", "Caches, counters, queues", "Coarse locks serialize the app. Fine locks deadlock.", "Double-checked locking without volatile", "Prefer java.util.concurrent types.", ["Visibility ≠ atomicity.", "Use j.u.c.", "Smallest lock possible."], ["What does volatile guarantee?", "ConcurrentHashMap vs synchronized Map?"], "HARD", []),
        ("completable-future", "CompletableFuture", "Compose async work without blocking the request thread.", "Modern Java services are full of them.", "It tests async composition, not just threads.", "supplyAsync, thenApply, thenCombine, exceptionally. Know which pool you run on.", "Fetch user and prefs in parallel, then combine.", "Fan-out IO", "Blocking inside a common pool starves everyone.", "Ignoring exceptions in the chain", "Say which executor you would pass.", ["Compose, don't block.", "Always handle exceptions.", "Name the pool."], ["thenApply vs thenCompose?", "What pool does supplyAsync use?"], "HARD", []),
        ("java-8-features", "Java 8+ Features", "The baseline language level most interviews assume.", "You should sound current without reciting a release train.", "It is fluency, not trivia.", "Lambdas, streams, Optional, default methods, records (16+), pattern matching, text blocks, var.", "A record `Pair(int i, int j)` beats a hand-rolled tuple.", "Everyday Java", "Optional is for return types, not fields.", "Optional.get() without a check", "Use new features when they delete boilerplate.", ["Optional for returns.", "Records for data.", "Streams when they clarify."], ["What is a record?", "When should you not use Optional?"], "EASY", []),
    ]
    out = []
    for i, row in enumerate(rows):
        slug, title, desc, why, how, example, uses, tradeoffs, mistakes, tip, takeaways, questions, diff, probs = _java_row(row)
        out.append(
            _one(
                "java",
                slug,
                title,
                desc,
                i + 1,
                concept=desc,
                why=why,
                how=how,
                example=example,
                uses=uses,
                tradeoffs=tradeoffs,
                mistakes=mistakes,
                tip=tip,
                takeaways=takeaways,
                questions=questions,
                difficulty=diff,
                problems=probs,
            )
        )
    return out


def _cs_topics() -> list[dict]:
    rows = [
        ("operating-systems", "Operating Systems", "The OS multiplexes hardware for processes.", "OS questions sit under every backend interview.", "They test mental models, not kernel trivia.", "Process isolation, virtual memory, scheduling, and I/O. User space vs kernel space.", "A syscall crosses into the kernel to read a file.", "Performance, concurrency", "Don't recite every scheduler by name.", "Mixing process and thread isolation", "Start from 'what does the hardware actually do?'", ["User vs kernel.", "The OS isolates and schedules.", "Syscalls are the boundary."], ["What is a syscall?", "User space vs kernel space?"]),
        ("processes-vs-threads", "Processes vs Threads", "Address spaces versus shared heaps.", "This is the classic CS screening question.", "It unlocks the rest of concurrency.", "A process has its own memory. Threads of a process share the heap and open files, not their stacks.", "Chrome uses processes for tabs (isolation). A web server uses threads or an event loop for requests.", "Isolation vs cheap context switch", "A crash in a thread can take the process.", "Saying threads are 'faster processes' with no model", "Talk about memory first, then cost.", ["Processes isolate.", "Threads share a heap.", "Stacks are per thread."], ["What do threads share?", "Why isolate in processes?"]),
        ("memory-management", "Memory Management", "Virtual addresses, pages, and the heap.", "Memory explains GC, OOM, and locality.", "Senior interviews go here quickly.", "Virtual memory maps pages to physical frames. Heap grows via allocator. Stack frames are automatic.", "A page fault loads a missing page from disk — expensive.", "Tuning JVMs, avoiding leaks", "More RAM hides bad locality until it does not.", "Confusing virtual and physical addresses", "Draw a page table if they push.", ["Virtual memory.", "Heap vs stack.", "Page faults are expensive."], ["What is virtual memory?", "Stack vs heap?"]),
        ("cpu-scheduling", "CPU Scheduling", "Who runs next on a core.", "Latency vs throughput lives here.", "Useful when discussing thread pools and SLAs.", "Ready queue. Preemption. RR, CFS, priorities. I/O-bound vs CPU-bound.", "A UI thread needs low latency; a batch job can wait.", "OS and runtime schedulers", "Priority inversion without priority inheritance", "Fairness vs shortest-job myths", "Name the workload before the policy.", ["Preemption enables sharing.", "Workload decides the policy.", "I/O-bound vs CPU-bound."], ["What is preemption?", "Why not always shortest job first?"]),
        ("deadlocks", "Deadlocks", "Four conditions, one cycle.", "They will ask you to name the conditions.", "It is a concurrency safety check.", "Mutual exclusion, hold and wait, no preemption, circular wait. Break one. Lock ordering is the usual fix.", "Thread A holds lock 1 waits for 2; B holds 2 waits for 1.", "Multi-lock code", "Detection vs prevention", "Locking in different orders in two methods", "Always acquire locks in a global order.", ["Four conditions.", "Lock ordering.", "Avoid nested locks if you can."], ["What are the four conditions?", "How do you prevent deadlock?"]),
        ("networking-fundamentals", "Networking Fundamentals", "Layers, packets, and sockets.", "Backend work is networked by default.", "They want a clean stack, not vendor gear.", "IP delivers packets. TCP/UDP sit on top. A socket is the OS handle. DNS finds addresses.", "A browser resolves api.example.com, opens TCP 443, then speaks TLS/HTTP.", "Every service call", "Don't climb all seven OSI layers unless asked.", "HTTP 'over IP' with no TCP", "Walk a single request from URL to bytes.", ["IP + transport + app.", "Sockets are the API.", "DNS comes first."], ["What happens when you type a URL?", "What is a socket?"]),
        ("tcp-vs-udp", "TCP vs UDP", "Reliable stream versus datagrams.", "A standard networking fork.", "It shows you can pick a transport.", "TCP: handshake, retransmission, ordered byte stream. UDP: fire and forget, no connection.", "TCP for HTTP. UDP for games, DNS, video when you prefer freshness.", "APIs vs realtime", "TCP head-of-line blocking; QUIC/HTTP3 address it", "Using UDP for payments", "Reliability vs latency is the axis.", ["TCP is reliable and ordered.", "UDP is cheap and unreliable.", "Choose by loss tolerance."], ["When would you use UDP?", "What does the TCP handshake do?"]),
        ("http-https", "HTTP / HTTPS", "Requests, responses, and TLS around them.", "You will design APIs over HTTP.", "Status codes and methods are table stakes.", "Methods, headers, body. 2xx success, 4xx client, 5xx server. HTTPS is HTTP over TLS.", "GET is safe and idempotent. POST creates. PUT replaces.", "Every web API", "GET with a body is a mess. Don't.", "Using 200 for every error", "Name method + status in API sketches.", ["Methods have semantics.", "HTTPS is HTTP + TLS.", "Status codes communicate."], ["Idempotent methods?", "What does HTTPS add?"]),
        ("dns", "DNS", "Names to addresses, recursively.", "Outages and latency often start at DNS.", "A short, concrete walk wins.", "Stub resolver → recursive resolver → root → TLD → authoritative. Records cached with TTLs. CNAME, A/AAAA.", "api.example.com → 203.0.113.10 via an A record.", "Service discovery, failover", "Low TTLs help failover and raise query load.", "Hardcoding IPs in clients", "Mention TTL when you talk about cutover.", ["Hierarchical lookup.", "TTL is the cache.", "CNAME vs A."], ["Walk a DNS lookup.", "What does TTL do?"]),
        ("tls", "TLS", "Confidentiality and authenticity on the wire.", "HTTPS without TLS is a slogan.", "They want handshake intuition, not cipher suites.", "Certificate proves the server. Handshake agrees a key. Then symmetric crypto. SNI picks the cert.", "A browser checks the cert chain to a trusted CA before sending a password.", "All public APIs", "CPU cost of handshake — hence keepalive and TLS 1.3", "Disabling verification in clients 'to make it work'", "Certificates + handshake + symmetric session.", ["Certs authenticate the server.", "Symmetric after handshake.", "Never skip verification."], ["What does a certificate prove?", "Why is TLS 1.3 faster?"]),
        ("database-transactions", "Database Transactions", "A bundle of reads and writes that succeed or fail together.", "Transactions are how you keep money and inventory honest.", "They connect SQL to real bugs.", "BEGIN, work, COMMIT or ROLLBACK. Atomicity is the user's mental model.", "Transfer $10: debit A and credit B in one transaction.", "Writes that must not half-apply", "Long transactions hold locks.", "One statement per transaction when two must be atomic", "Name what must appear together.", ["All or nothing.", "Keep transactions short.", "COMMIT is the publish."], ["What is a transaction?", "Why keep them short?"]),
        ("acid", "ACID", "Atomicity, Consistency, Isolation, Durability.", "The vocabulary for transactional stores.", "Say each letter with a user-facing meaning.", "A: all or nothing. C: constraints hold. I: concurrent transactions don't wreck each other. D: committed data survives a crash.", "A committed payment is still there after the DB restarts (D).", "Relational systems of record", "Relaxing isolation is a performance lever.", "Treating ACID as a single switch", "Pick the letter they actually asked about.", ["Four properties, four meanings.", "Isolation is a spectrum.", "Durability is the WAL."], ["What does Isolation mean?", "How is durability implemented?"]),
        ("isolation-levels", "Isolation Levels", "How much you can see of other transactions.", "This is the follow-up after ACID.", "It separates people who have been on-call.", "Read uncommitted → committed → repeatable read → serializable. Phenomena: dirty, non-repeatable, phantom.", "A inventory read under READ COMMITTED can see a different count on the next select.", "High-contention writes", "Serializable is safest and slowest.", "Picking serializable 'to be safe' on a huge OLTP system without measuring", "Name the anomaly you are preventing.", ["Levels trade correctness for throughput.", "Know dirty vs phantom.", "Postgres default is read committed."], ["What is a phantom read?", "What is your default isolation?"]),
        ("indexes", "Indexes", "Extra structures that make lookups cheap.", "Slow query? They will say 'did you index it?'", "It is the most practical DB lever.", "A B-tree index is a sorted copy of key → row pointer. Great for equality and ranges. Extra write cost and space.", "INDEX(user_id) turns 'orders for user 9' from a scan into a seek.", "Point lookups, joins, ORDER BY", "Too many indexes slow writes. Low-cardinality flags are weak indexes.", "Indexing every column", "Index the columns in the WHERE and JOIN.", ["Indexes speed reads, tax writes.", "B-tree for ranges.", "Selectivity matters."], ["What does a B-tree index store?", "When does an index hurt?"]),
        ("query-optimization", "Query Optimization", "The planner picks a strategy; you give it facts.", "EXPLAIN is how adults debug SQL.", "It shows you do not treat the DB as a black box.", "Statistics + indexes + join order. EXPLAIN ANALYZE. Rewrite N+1 into a join or an IN list.", "A loop of `SELECT` per user is N+1. One `WHERE user_id IN (...)` is one plan.", "Hot endpoints", "Hints are a last resort.", "SELECT * on wide rows", "Show the plan before you add hardware.", ["Read EXPLAIN.", "Kill N+1.", "Select only needed columns."], ["What is N+1?", "What does EXPLAIN show?"]),
        ("db-concurrency", "Database Concurrency", "Locks, MVCC, and why writers don't always block readers.", "Production SQL is concurrent.", "This is the CS/DB overlap.", "Row locks, table locks, MVCC snapshots. Writers create new versions; readers see a snapshot.", "Postgres readers don't block writers thanks to MVCC.", "Hot rows, queues in tables", "Hot rows still serialize.", "Using a table as a lock without a timeout", "Ask which row is contended.", ["MVCC snapshots.", "Hot rows serialize.", "Lock the least you can."], ["What is MVCC?", "How do you deal with a hot row?"]),
    ]
    out = []
    for i, row in enumerate(rows):
        slug, title, desc, why, how, example, uses, tradeoffs, mistakes, tip, takeaways, questions = _twelve(row)
        out.append(_one("cs-fundamentals", slug, title, desc, i + 1, concept=desc, why=why, how=how, example=example, uses=uses, tradeoffs=tradeoffs, mistakes=mistakes, tip=tip, takeaways=takeaways, questions=questions))
    return out


def _ood_topics() -> list[dict]:
    rows = [
        ("oop-fundamentals", "OOP Fundamentals", "Encapsulation, inheritance, polymorphism, abstraction.", "LLD interviews assume this vocabulary.", "It is the language of class design.", "Hide state. Share behavior through types. Prefer composition when inheritance is only for reuse.", "A Shape interface with area(); Circle and Rectangle implement it.", "Domain models", "Inheritance hierarchies go stale.", "God classes", "Start from behavior, not from a class diagram fetish.", ["Encapsulate state.", "Depend on abstractions.", "Composition over inheritance."], ["What is polymorphism?", "Why prefer composition?"]),
        ("solid-principles", "SOLID Principles", "Five habits that keep classes changeable.", "They will ask for an example, not the acronym only.", "It is how you justify a split.", "SRP one reason to change. OCP extend without edit. LSP subtypes must honor contracts. ISP small interfaces. DIP depend on abstractions.", "A ReceiptPrinter should not also send email — that is two reasons to change.", "Any LLD", "Over-applying SOLID produces soup.", "Reciting letters without a refactor", "Pick one letter and refactor a class live.", ["One reason to change.", "Depend on interfaces.", "Don't over-split."], ["Give an SRP example.", "What does DIP mean in code?"]),
        ("composition-vs-inheritance", "Composition vs Inheritance", "Has-a usually ages better than is-a.", "A design fork they love.", "It prevents brittle hierarchies.", "Inheritance is for true subtype relationships. Composition lets you swap parts (a Duck has a FlyBehavior).", "Strategy: inject the algorithm instead of subclassing for each variant.", "Game entities, payment methods", "Deep inheritance is hard to test.", "Inheriting only to reuse a helper method", "If you cannot say 'is a', compose.", ["Is-a vs has-a.", "Composition is easier to swap.", "Inheritance is a strong claim."], ["When is inheritance right?", "How does strategy use composition?"]),
        ("interfaces", "Interfaces", "A contract without an implementation.", "Java interviews live on interfaces.", "They enable testing and DIP.", "Define the methods a caller needs. Implement many ways. Default methods exist but keep them thin.", "`interface PaymentGateway { ChargeResult charge(Card, Money); }`", "Boundaries between modules", "Fat interfaces force empty methods.", "One 30-method interface", "Interface around the caller, not the implementor.", ["Contracts, not classes.", "Keep them small.", "Callers own the shape."], ["Abstract class vs interface?", "What is a fat interface?"]),
        ("dependency-injection", "Dependency Injection", "Give an object its collaborators.", "It is how you test LLD.", "Interviewers watch whether you `new` everything inside.", "Pass dependencies in the constructor. A framework can wire them; you can also do it by hand.", "`new OrderService(new StripeGateway())` in main, not inside OrderService.", "Services, testdoubles", "Hidden `new` is an untestable seam.", "Service locator as a global bag", "Constructor injection is the default.", ["Inject, don't construct.", "Constructors list needs.", "Tests pass fakes."], ["Why inject?", "Constructor vs setter injection?"]),
        ("factory-pattern", "Factory Pattern", "A method that decides which class to build.", "Useful when creation has rules.", "It hides `new` and switch statements.", "A factory method or simple factory maps a type to an implementation.", "`PaymentFactory.create(type)` returns Stripe or Invoice.", "Drivers, parsers, payments", "A giant switch factory becomes a magnet for change.", "Factory for every class, including ones with one impl", "Use it when the caller should not know the concrete type.", ["Hide construction.", "Map a type to a class.", "Don't factory everything."], ["Simple factory vs factory method?", "When is a factory overkill?"]),
        ("strategy-pattern", "Strategy Pattern", "Swap an algorithm behind an interface.", "It is the cleanest 'remove this switch' move.", "Comes up in pricing, sorting, and auth.", "An interface `Pricing`, implementations per rule, injected into the context.", "Weekend vs weekday pricing strategies on a cart.", "Rates, compression, comparators", "Too many tiny strategy classes", "Name the varying behavior and extract it.", ["Algorithm behind an interface.", "Inject the variant.", "Open for extension."], ["Strategy vs if/else?", "How does it relate to composition?"]),
        ("observer-pattern", "Observer Pattern", "Dependents get notified of a subject's change.", "Event-like design without a broker.", "UI and domain events use it.", "Subject keeps a list of observers and calls `update` on change.", "An Order notifies EmailNotifier and Inventory when it is placed.", "Notifications, UI bindings", "Sync observers can make a write slow or reentrant.", "Forgetting to unsubscribe", "Mention async if the work is heavy.", ["Publish changes.", "Observers stay decoupled.", "Watch reentrancy."], ["How does observer work?", "What goes wrong with sync observers?"]),
        ("builder-pattern", "Builder Pattern", "Assemble a complex object step by step.", "Telescoping constructors are a smell.", "It shows taste in APIs.", "A builder with fluent setters and a `build()` that validates.", "`new HttpRequest.Builder().url(u).timeout(t).build()`.", "Requests, configs, SQL", "Builders on tiny types are noise.", "Build that can emit invalid objects", "Validate in build().", ["Fluent construction.", "Validate at the end.", "Use when there are many optional fields."], ["When do you use a builder?", "Builder vs telescoping constructors?"]),
        ("decorator-pattern", "Decorator Pattern", "Wrap an object to add behavior without changing its type.", "It is how Java I/O streams work.", "Useful when inheritance would explode combinations.", "A component interface; decorators implement it and delegate, adding work before/after.", "`new BufferedInputStream(new FileInputStream(file))`.", "Logging, auth, compression around a service", "Deep decorator stacks are hard to debug.", "Decorator that breaks the contract", "Show one wrap live.", ["Same interface, extra behavior.", "Stack wraps.", "Prefer this to subclass explosion."], ["Give a Java IO example.", "Decorator vs inheritance?"]),
        ("low-level-design", "Low-Level Design", "Classes, collaborations, and a first API.", "This is the LLD interview genre.", "They want a walk, not a UML dump.", "Clarify use cases. Identify nouns. Define public methods. Walk one happy path and one failure. Mention concurrency if state is shared.", "Parking lot: TicketService.park(Vehicle) → Ticket, leave(Ticket) → Receipt.", "Any 40-minute LLD", "Too many classes too soon.", "Coding before the API", "Drive from use cases.", ["Use cases first.", "Small public API.", "Walk a path end to end."], ["How do you start an LLD?", "What do you do after the class list?"]),
        ("parking-lot", "Practice: Parking Lot", "Spots, vehicles, tickets, fees.", "A canonical LLD.", "It exercises objects and policies.", "Vehicle types, spot sizes, a Ticket issued on entry, a FeePolicy on exit. A ParkingLot maps spots.", "park(car) finds a fit spot, marks it occupied, returns a ticket.", "Similar: cinema seats, hotel rooms", "One class that does allocation and billing", "Separate allocation from pricing.", ["Model spots and tickets.", "Policy objects for fees.", "Don't mix billing into the lot."], ["How do you assign a spot?", "How do you compute the fee?"], "MEDIUM"),
        ("vending-machine", "Practice: Vending Machine", "State machine plus inventory plus money.", "Another standard LLD.", "State is the point.", "States: Idle, HasCoin, Dispensing. Inventory of SKUs. Coin handler that can make change.", "insertCoin → select(A1) → dispense or refund.", "ATMs, lockers", "A boolean soup instead of states", "Draw the state diagram first.", ["Explicit states.", "Inventory separate from cash.", "Handle exact change."], ["What states do you need?", "How do you make change?"]),
        ("elevator", "Practice: Elevator", "Requests, scheduling, and a car.", "A concurrency-flavored LLD.", "It tests queues and direction.", "An ElevatorCar with floor and direction. A Controller assigns requests (SCAN/LOOK). External vs internal buttons.", "A request for floor 7 while going up is served on the way if the policy allows.", "Lifts, shuttles", "Omniscient perfect scheduling in v1", "Start with one car, then add a dispatcher.", ["Direction matters.", "Separate car and controller.", "Start with one car."], ["How do you avoid starvation?", "Internal vs external requests?"]),
        ("library", "Practice: Library", "Catalog, copies, members, loans.", "Data-model heavy LLD.", "Relations first, then methods.", "Book vs BookCopy. Member. Loan with due date. Search by isbn/title/author.", "checkout(member, copy) fails if already loaned.", "Inventory systems", "One Book row used as the only copy", "Separate title from copy.", ["Book vs copy.", "Loans are objects.", "Search the catalog, not the copies."], ["How do you model multiple copies?", "What happens on overdue?"]),
        ("chess", "Practice: Chess", "Board, pieces, moves, rules.", "A rules-engine LLD.", "Polymorphism for piece moves.", "Board[8][8], Piece with legalMoves(board), Move validator, Game state (turn, check).", "A Knight knows its L-shaped moves; the Game checks check.", "Other board games", "One 200-line move method", "Each piece type implements its movement.", ["Piece hierarchy.", "Game validates checks.", "Don't bake every rule into Board."], ["How do you model pieces?", "Where does check get validated?"]),
        ("ood-rate-limiter", "Practice: Rate Limiter", "Allow or reject a request.", "Connects LLD to system design.", "A concrete, implementable class design.", "RateLimiter.allow(key) using token bucket stored per key. A clock you can fake in tests.", "allow('user:9') returns false when the bucket is empty.", "APIs, login", "A global static counter", "Inject the clock. Make allow() thread-safe.", ["Per-key buckets.", "Inject time.", "Thread-safe allow()."], ["How do you store tokens?", "How do you test without sleeping?"]),
    ]
    out = []
    for i, row in enumerate(rows):
        diff = "MEDIUM"
        if isinstance(row[-1], str) and row[-1] in {"EASY", "MEDIUM", "HARD"}:
            diff = row[-1]
            row = row[:-1]
        slug, title, desc, why, how, example, uses, tradeoffs, mistakes, tip, takeaways, questions = _twelve(row)
        out.append(
            _one(
                "ood",
                slug,
                title,
                desc,
                i + 1,
                concept=desc,
                why=why,
                how=how,
                example=example,
                uses=uses,
                tradeoffs=tradeoffs,
                mistakes=mistakes,
                tip=tip,
                takeaways=takeaways,
                questions=questions,
                difficulty=diff,
            )
        )
    return out


def _behavioral_topics() -> list[dict]:
    rows = [
        ("tell-me-about-yourself", "Tell Me About Yourself", "A 90-second arc: past, present, why this role.", "It is the first impression.", "Unstructured autobiographies waste the room.", "Present role → one relevant win → why this company now. Stop. Let them steer.", "'I'm a backend engineer at X. I spent the last year on payments reliability. I'm here because you own the checkout path end to end.'", "Openers", "A 6-minute life story", "Memorizing a speech that ignores the job", "Practice out loud to 90 seconds.", ["Present → relevant win → why here.", "Ninety seconds.", "Stop talking."], ["How long should this be?", "What do you leave out?"]),
        ("star-method", "STAR Method", "Situation, Task, Action, Result.", "This is the skeleton for every story.", "Interviewers can follow it.", "Set the scene in one sentence. Your responsibility. What you did (first person, specific). The measurable result and what you learned.", "'On-call week, checkout p99 doubled. I owned the incident. I traced it to a lock. We shipped a fix; p99 returned; we added a gauge.'", "Every behavioral answer", "A Situation that lasts three minutes", "Action should be mostly 'I', not 'we'", "Write four STAR cards before the loop.", ["Short situation.", "I-actions.", "A number in the result."], ["What does STAR stand for?", "How do you keep Situation short?"]),
        ("leadership", "Leadership", "You do not need a title to lead.", "They want influence without authority.", "Staff+ loops lean here.", "A time you aligned people, made a call, or unblocked a path. Show the decision, not the vibes.", "You convened two teams on an API break, wrote the migration plan, and hit the date.", "Cross-team work", "Leadership as 'I worked a lot'", "Name the hard call.", ["Influence without title.", "A real decision.", "Outcome and follow-through."], ["Tell me about a time you led.", "How do you lead without authority?"]),
        ("conflict", "Conflict", "Disagreement that you resolved like an adult.", "They are testing safety and spine.", "Conflict-avoidant answers score poorly.", "Name the disagreement, not the villain. Data, a proposal, a decision owner. Stay respectful.", "You and a peer disagreed on a store. You prototyped both, measured, and adopted theirs when it won.", "Design reviews, priorities", "Trash-talking a coworker", "End with the relationship intact.", ["No villains.", "Use data.", "Own the close."], ["Tell me about a conflict.", "What if you still disagreed?"]),
        ("failure", "Failure", "A real miss, owned, with a change after.", "Fake failures ('I work too hard') fail the test.", "They want learning velocity.", "Pick a real miss with stakes. What you did, what you missed, what changed in your process.", "You shipped a migration without a backfill check. You rolled back, wrote the check, and taught the team.", "Incidents, missed dates", "Blaming tools only", "The last third of the answer is the system you changed.", ["Real stake.", "Your part.", "A process change."], ["Tell me about a failure.", "What did you change after?"]),
        ("difficult-technical-decision", "Difficult Technical Decision", "A tradeoff you can still defend.", "This is a senior signal.", "They want reasoning under uncertainty.", "Options, constraints, the call, what you would revisit.", "SQL vs a queue for a spike. You chose the queue, set SLOs, and reviewed in a month.", "Architecture choices", "A decision with no alternative", "Name what you would need to reverse it.", ["Options on the table.", "A reversible default if you can.", "Revisit criteria."], ["Walk me through a hard call.", "How do you revisit it?"]),
        ("project-proud-of", "Project You Are Proud Of", "Scope, your slice, impact.", "They are mapping you to their work.", "Pride should sound like ownership, not luck.", "Problem, your design or execution, the number that moved, what you would do differently.", "You cut p99 of search by 40% by adding a cache and fixing an N+1.", "Portfolio stories", "A project where you were a bystander", "Use 'I' for your slice and 'we' for the team.", ["Your slice.", "A metric.", "A retrospective line."], ["What was your role?", "What would you change?"]),
        ("handling-ambiguity", "Handling Ambiguity", "You made a fuzzy problem smaller.", "Startups and platform teams live here.", "They want a method, not vibes.", "Write the unknown, pick a thin slice, time-box a spike, confirm with a stakeholder.", "A vague 'improve onboarding' became three measurable drop-off fixes in a week.", "0→1 work", "Waiting for a perfect spec", "Show the first question you asked.", ["Name the unknown.", "Time-box.", "Confirm early."], ["How do you start when the spec is missing?", "When do you ask for help?"]),
        ("difficult-people", "Working With Difficult People", "Curiosity first, then boundaries.", "They are testing professionalism.", "This is not therapy hour.", "Assume missing context. Private conversation. Specific asks. Escalate on behavior, not personality.", "A reviewer blocked everything. You asked for their risk list and addressed it in the RFC.", "Reviews, partners", "Diagnosing their childhood", "Keep it about the work artifact.", ["Private first.", "Specific asks.", "Escalate behavior."], ["Tell me about a difficult colleague.", "When do you escalate?"]),
        ("production-incident", "Production Incident", "Detect, mitigate, communicate, fix, prevent.", "On-call stories are gold when structured.", "They want calm and a customer lens.", "How you knew, what you did to stop the bleeding, who you told, the cause, the follow-up.", "You flipped a flag, restored checkout, then fixed the lock in a postmortem with an action item you owned.", "SRE, backend", "A 12-minute timeline with no mitigation", "Mitigate first. Forensics second.", ["Mitigate, then analyze.", "Communicate status.", "One owned action item."], ["Walk an incident.", "What did you do first?"]),
        ("disagreement-with-manager", "Disagreement With Manager", "You can push back and still align.", "They want backbone plus loyalty to the outcome.", "This is a trust question.", "State the concern with data. Offer a smaller experiment. Commit once the decision is made.", "You argued to delay a launch. You lost, shipped, and added the extra monitors you wanted.", "Priorities, scope", "Undermining after the call", "Disagree and commit is the close.", ["Data, not drama.", "Propose a smaller bet.", "Commit after the decision."], ["Tell me about disagreeing with a manager.", "What if you still think they are wrong?"]),
        ("why-this-company", "Why This Company?", "Specific product, specific problem, specific you.", "Generic praise is forgettable.", "They are filtering tourists.", "Name a product detail, a technical challenge that matches your skills, and what you want to own.", "'You settle payments in 40 markets. I've spent two years on idempotent ledgers. I want that problem at your scale.'", "Every onsite close", "Reciting the about page", "Do 20 minutes of real product homework.", ["Specific, not flattering.", "Match your proof.", "Name the work you want."], ["Why us?", "Why not a competitor?"]),
    ]
    out = []
    for i, row in enumerate(rows):
        slug, title, desc, why, how, example, uses, tradeoffs, mistakes, tip, takeaways, questions = _twelve(row)
        out.append(
            _one(
                "behavioral",
                slug,
                title,
                desc,
                i + 1,
                concept=desc,
                why=why,
                how=how,
                example=example,
                uses=uses,
                tradeoffs=tradeoffs,
                mistakes=mistakes,
                tip=tip,
                takeaways=takeaways,
                questions=questions,
                difficulty="EASY",
                minutes=7,
            )
        )
    return out


def _ai_topics() -> list[dict]:
    from database.seeds.learn_ai import ai_topics

    return ai_topics()


TOPICS.append(_system_design_template_topic())
TOPICS.extend(_system_design_topics())
TOPICS.append(_system_design_problem_topic())
TOPICS.extend(_java_topics())
TOPICS.extend(_cs_topics())
TOPICS.extend(_ood_topics())
TOPICS.extend(_behavioral_topics())
TOPICS.extend(_ai_topics())

