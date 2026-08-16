"""Interview cheat sheets. Seeded into PostgreSQL — not hardcoded in the UI."""

from __future__ import annotations


def D(body: str) -> dict:
    return {"kind": "definition", "title": "Definition", "body": body}


def R(body: str) -> dict:
    return {"kind": "rule", "title": "Key rule", "body": body}


def E(body: str) -> dict:
    return {"kind": "example", "title": "Example", "body": body}


def T(body: str) -> dict:
    return {"kind": "tip", "title": "Interview tip", "body": body}


def B(items: list[str], title: str = "Remember") -> dict:
    return {"kind": "bullets", "title": title, "body": "", "items": items}


def F(body: str) -> dict:
    return {"kind": "formula", "title": "Formula", "body": body}


def S(items: list[str], title: str = "Steps") -> dict:
    return {"kind": "steps", "title": title, "body": "", "items": items}


def TB(headers: list[str], rows: list[list[str]], title: str = "") -> dict:
    return {"kind": "table", "title": title, "body": "", "items": {"headers": headers, "rows": rows}}


def section(slug: str, title: str, *blocks: dict) -> dict:
    return {"slug": slug, "title": title, "blocks": list(blocks)}


CHEAT_SHEETS: list[dict] = [
    {
        "slug": "dsa",
        "title": "DSA Patterns",
        "description": "Pattern recognition, Big-O, and Java templates coding interviews actually use.",
        "minutes": 15,
        "order": 1,
        "sections": [
            section(
                "two-pointers",
                "Two Pointers",
                D("Walk an array or string from both ends, or at two speeds, instead of nested loops."),
                R("Sort first if the problem is about pairs/sums. Otherwise move the pointer that can still improve the answer."),
                E("`left = 0; right = n-1;` while left < right, move inward on Two Sum (sorted) or container-with-most-water."),
                T("Say O(n) after sort. Mention the invariant: everything outside [left, right] is decided."),
            ),
            section(
                "sliding-window",
                "Sliding Window",
                D("Maintain a contiguous range that grows/shrinks as you scan once."),
                R("Expand right every step. Shrink left while the window is invalid. Track the best window."),
                E("Longest substring without repeat: grow right, shrink left when a char repeats (map of last index)."),
                T("Name the constraint that makes the window valid. If you cannot define it, it is not a window."),
            ),
            section(
                "binary-search",
                "Binary Search",
                D("Halve a monotonic search space — on an array or on the answer."),
                R("Write the predicate `ok(x)` first. Then binary search the smallest/largest x where ok is true."),
                E("First-and-last position: two searches (left-most and right-most). Capacity-to-ship: search days, check feasibility."),
                T("Avoid `mid = (lo+hi)/2` overflow talk; in Java use `lo + (hi-lo)/2`. State the loop invariant."),
            ),
            section(
                "bfs-dfs",
                "BFS / DFS",
                D("BFS explores by distance (queue). DFS explores a branch fully (stack/recursion)."),
                R("Unweighted shortest path → BFS. Components, cycles, islands, trees → DFS or BFS. Topo → Kahn BFS or DFS finish times."),
                E("Grid islands: DFS/BFS from each unvisited `1`. Word ladder: BFS on words."),
                T("State visited immediately when you enqueue (BFS) so you do not explode the queue."),
            ),
            section(
                "stack-monotonic",
                "Stack / Monotonic Stack",
                D("LIFO for matching and undo. Monotonic stack keeps values increasing or decreasing to find next greater/smaller."),
                R("Parentheses / path → stack. Next greater element → scan once, pop while top is worse."),
                E("Daily temperatures: pop indices while current is warmer; distance = i - stack.pop()."),
                T("Store indices, not values, when you need the span."),
            ),
            section(
                "heap",
                "Heap / Priority Queue",
                D("Repeated min/max extraction in O(log n)."),
                R("Top-k → min-heap of size k. Merge k lists → heap of heads. Two heaps for running median."),
                E("`PriorityQueue<Integer>` is a min-heap in Java. Max-heap: `(a,b) -> b-a` or reverseOrder."),
                T("Say why heap, not sort: you stream or you only need k, not full order."),
            ),
            section(
                "intervals",
                "Intervals",
                D("Sort by start, then sweep. The running end is the only memory you need."),
                R("Merge if next.start <= current.end (ask if touching merges). Meeting rooms: min-heap of ends."),
                E("`[1,3][2,6][8,10]` → `[1,6][8,10]`."),
                T("First question: do `[1,2][2,3]` merge? That one word prevents an off-by-one."),
            ),
            section(
                "backtracking",
                "Backtracking",
                D("Build a candidate, recurse, undo. Prune when the partial answer cannot win."),
                R("Choose → explore → unchoose. Bound the branching. Dedup with sort + skip equals."),
                E("Subsets, permutations, combination sum, N-queens."),
                T("Talk pruning before code. Interviewers want the tree, not a blob of recursion."),
            ),
            section(
                "greedy",
                "Greedy",
                D("A local choice that stays optimal if the problem has the greedy-choice property."),
                R("Prove or name the sort key. If you cannot, it is probably DP."),
                E("Jump game: track farthest. Interval scheduling: earliest finish. Huffman / activity selection."),
                T("Say 'I would DP if greedy fails this case' and give the counterexample if asked."),
            ),
            section(
                "dynamic-programming",
                "Dynamic Programming",
                D("Optimal substructure + overlapping subproblems. Define state, transition, base, order."),
                R("1-D: `dp[i]` from prefix. 2-D: two sequences or a grid. Start from brute recursion, then memo, then bottom-up."),
                E("LIS, coin change, unique paths, edit distance, house robber."),
                T("Write the recurrence in words first. Space-optimize only after the 2-D table is correct."),
            ),
            section(
                "big-o",
                "Big-O",
                D("Growth of time/space as n → large. Drop constants and lower terms."),
                TB(
                    ["Pattern", "Time", "Space"],
                    [
                        ["Two pointers / window", "O(n)", "O(1)–O(k)"],
                        ["Binary search", "O(log n)", "O(1)"],
                        ["Heap of size k", "O(n log k)", "O(k)"],
                        ["Sort + sweep", "O(n log n)", "O(1)–O(n)"],
                        ["DFS/BFS graph", "O(V+E)", "O(V)"],
                        ["2-D DP", "O(n·m)", "O(n·m) or O(min)"],
                    ],
                    "Common bounds",
                ),
                T("Always pair time with space and name n. Amortized vs worst if they push HashMap."),
            ),
            section(
                "java-templates",
                "Common Java DSA templates",
                B(
                    [
                        "`int lo = 0, hi = n - 1; while (lo <= hi) { int mid = lo + (hi - lo) / 2; ... }`",
                        "`ArrayDeque<Integer> q` for BFS. `ArrayList` for results. `HashMap` / `HashSet` for seen.",
                        "`PriorityQueue<int[]> pq = new PriorityQueue<>((a,b) -> a[0]-b[0]);`",
                        "`Collections.sort(intervals, Comparator.comparingInt(a -> a[0]));`",
                    ],
                    "Paste-ready shapes",
                ),
                T("Use interfaces in signatures (`List`, `Map`). Avoid `Stack` class — use `ArrayDeque`."),
            ),
        ],
    },
    {
        "slug": "java",
        "title": "Java",
        "description": "Collections, equality, streams, exceptions, and concurrency backend loops expect.",
        "minutes": 12,
        "order": 2,
        "sections": [
            section(
                "collections",
                "Collections",
                D("Program to List / Set / Map. Pick the implementation for access pattern."),
                R("Default: ArrayList + HashMap. Need order + unique → LinkedHashSet. Need sorted → TreeMap/TreeSet."),
                TB(
                    ["Type", "Get", "Add end", "Notes"],
                    [
                        ["ArrayList", "O(1)", "amortized O(1)", "contiguous, default"],
                        ["LinkedList", "O(n)", "O(1) at ends", "rarely faster in real HW"],
                        ["HashMap", "avg O(1)", "avg O(1)", "equals/hashCode"],
                        ["TreeMap", "O(log n)", "O(log n)", "sorted keys"],
                    ],
                ),
                T("Say the interface first, then the class, then the complexity."),
            ),
            section(
                "arraylist-vs-linkedlist",
                "ArrayList vs LinkedList",
                D("ArrayList is a resizable array. LinkedList is nodes + pointers."),
                R("Random access or scan → ArrayList. Mid insert only if you already hold the node — still usually ArrayList."),
                E("Building an answer list: `new ArrayList<>()`. Never LinkedList for get(i) in a loop."),
                T("Mention cache locality once. It lands."),
            ),
            section(
                "hashmap",
                "HashMap",
                D("Array of buckets. Key → hash → index. Collisions chain, treeify at 8. Load factor 0.75."),
                R("equals and hashCode must use the same fields. Never mutate a key after put."),
                E("Interview Two Sum: `Map<Integer,Integer> seen` value → index."),
                T("Walk put() out loud: hash, bucket, collide, resize."),
            ),
            section(
                "hashset",
                "HashSet",
                D("A HashMap with dummy values. Uniqueness via equals/hashCode."),
                R("Membership and dedup. Iteration order is undefined unless LinkedHashSet."),
                E("Seen characters in a window: `Set<Character>` or a freq map if you need counts."),
                T("If they ask order, switch to LinkedHashSet — do not sort a HashSet after the fact unless you say so."),
            ),
            section(
                "treemap-treeset",
                "TreeMap / TreeSet",
                D("Red-black tree. Keys stay sorted. O(log n) get/put."),
                R("Need range queries or floor/ceiling → TreeMap. Need a sorted unique set → TreeSet."),
                E("`map.floorKey(x)`, `subMap(from, to)` for sliding windows on keys."),
                T("Do not use TreeMap 'to be safe'. HashMap is faster when you do not need order."),
            ),
            section(
                "equals-hashcode",
                "equals() / hashCode()",
                D("Equal objects must share a hashCode. Override both or neither."),
                R("Same fields in both. Symmetric, transitive, consistent. Include in HashMap keys only immutables."),
                E("Two User ids equal → same hash or the map loses them after resize."),
                T("If you only override equals, say what breaks: HashMap/HashSet lookup."),
            ),
            section(
                "comparable-comparator",
                "Comparable vs Comparator",
                D("Comparable = natural order on the class. Comparator = external order."),
                R("`compareTo` for the type's default. Comparator for sort-this-once (intervals by start)."),
                E("`intervals.sort(Comparator.comparingInt(a -> a[0]))`."),
                T("Never `a-b` for ints if overflow matters; use `Integer.compare`."),
            ),
            section(
                "string-stringbuilder",
                "String / StringBuilder",
                D("String is immutable. `+` in a loop is O(n²). StringBuilder appends amortized O(1)."),
                R("Build text with StringBuilder; toString once. Compare with equals, never `==`."),
                E("Reverse words, assemble paths, DP string reconstruction."),
                T("Mention the pool only if they ask. StringBuffer is synchronized — skip it."),
            ),
            section(
                "streams",
                "Streams",
                D("Source → intermediate (lazy) → terminal. Prefer a loop if the pipeline hides O(n²)."),
                R("Use when it is clearer. Know map/filter/collect, groupingBy. Do not side-effect in map."),
                E("`list.stream().map(User::id).toList()`."),
                T("Interviewers accept a for-loop. A 12-step stream in a 20-minute problem is a smell."),
            ),
            section(
                "exceptions",
                "Exceptions",
                D("Checked must be declared or caught. Unchecked (RuntimeException) need not."),
                R("Catch the specific type. Do not swallow. Prefer fail-fast on contract violations."),
                E("`IllegalArgumentException` for bad input. Do not catch Exception around business logic in interview code."),
                T("In coding interviews, validate and throw; do not build a checked-exception hierarchy."),
            ),
            section(
                "concurrency",
                "Concurrency",
                D("Threads share heap. Visibility and atomicity are the bugs. Happens-before is the language."),
                R("Shared mutable state needs synchronization, a concurrent collection, or confinement."),
                B(
                    [
                        "volatile: visibility, not atomic ++",
                        "AtomicInteger: single-variable atomics",
                        "ConcurrentHashMap: segmented concurrency, no nulls",
                        "ExecutorService over raw Thread",
                    ]
                ),
                T("Name the race, then the tool. 'I would synchronize the whole method' is a junior default."),
            ),
            section(
                "synchronized-locks",
                "synchronized / locks",
                D("synchronized acquires a monitor. ReentrantLock adds tryLock, fairness, condition queues."),
                R("Synchronize on a private final lock object, not `this`, if the API is public."),
                E("Singleton lazy init: holder class or enum. Double-checked locking needs volatile."),
                T("Prefer java.util.concurrent over hand-rolled wait/notify unless they ask."),
            ),
            section(
                "jvm-gc",
                "JVM / GC basics",
                D("Heap: young (eden + survivors) then old. GC reclaims unreachable objects."),
                R("Short-lived objects die in young gen. Leaks are reachable leftovers (caches without bounds)."),
                E("A static Map growing forever is a leak. A local list in a method is not."),
                T("Stop at: generations, STW pauses, why you bound caches. Do not recite collector names unless asked."),
            ),
        ],
    },
    {
        "slug": "system-design",
        "title": "System Design",
        "description": "45-minute framework, capacity estimation, scalability, databases, caching and distributed systems.",
        "minutes": 15,
        "order": 3,
        "sections": [
            section(
                "framework",
                "45-Minute Interview Framework",
                S(
                    [
                        "Requirements — 5 min",
                        "Capacity — 5 min",
                        "API / Data Model — 5 min",
                        "High-Level Design — 10 min",
                        "Deep Dive — 10 min",
                        "Scalability / Reliability — 5 min",
                        "Trade-offs — 5 min",
                    ],
                    "Clock",
                ),
                T("Say the numbers out loud. They justify every later box. Depth in one area beats a crowded diagram."),
            ),
            section(
                "requirements",
                "Requirements gathering",
                D("Ask before you draw. Wrong product wastes the remaining 40 minutes."),
                R("Cap at 3–5 critical questions. Repeat them back. Write them on the board."),
                B(
                    [
                        "Who is the user? Read vs write?",
                        "Latency, consistency, freshness?",
                        "What can we drop for v1?",
                    ]
                ),
                T("News feed: 'Is this Twitter or LinkedIn? How fresh must the feed be?'"),
            ),
            section(
                "fnr-nfr",
                "Functional vs non-functional",
                D("Functional = what the system does. NFR = how well (latency, consistency, availability)."),
                R("NFRs pick the architecture. Features pick the API."),
                E("Shorten URL is functional. p99 redirect < 100ms and 99.9% availability are NFRs."),
                T("Pick one NFR to optimize; say what you are not optimizing."),
            ),
            section(
                "capacity",
                "Capacity estimation",
                D("Back-of-the-envelope math that justifies shards and caches."),
                F("QPS = users × actions/user/day ÷ 86,400"),
                F("Storage = payload × writes/day × retention × replication"),
                F("Peak ≈ 2–3 × average"),
                T("State assumptions before calculating. Order-of-magnitude is enough. Fake precision looks worse."),
            ),
            section(
                "formulas",
                "QPS / storage / bandwidth",
                B(
                    [
                        "100M users × 5 reads/day → ~6k average read QPS, ~15k peak",
                        "Bandwidth ≈ QPS × response size",
                        "Replication multiplies storage (3× is a common default)",
                    ]
                ),
                T("Round aggressively. Interviewers want the method, not six significant digits."),
            ),
            section(
                "api-design",
                "API design",
                D("Resources, verbs, pagination, idempotency. Design from the caller inward."),
                R("REST for CRUD. Idempotent PUT/POST with keys. Cursor pagination. Typed error bodies."),
                E("`POST /v1/urls` → `{id, short, long}`. `GET /{code}` 302s."),
                T("Define the write path first. Unbounded list endpoints are a fail."),
            ),
            section(
                "load-balancing",
                "Load balancing",
                D("Spread traffic so no single app box is the bottleneck."),
                R("Stateless app + LB. L4 vs L7. Health checks and drain."),
                E("TLS terminates at L7; pods see HTTP. Least-connections or round robin."),
                T("Sticky sessions fight scale — put session in Redis."),
            ),
            section(
                "caching",
                "Caching",
                D("Store expensive answers closer to the reader."),
                R("Cache-aside default: read cache → miss DB → fill. TTL or invalidate. Name stampede."),
                E("URL redirect: cache code → long URL."),
                T("Name what you cache and why slightly stale is safe."),
            ),
            section(
                "sql-vs-nosql",
                "SQL vs NoSQL",
                TB(
                    ["", "SQL", "NoSQL"],
                    [
                        ["Good for", "Relations, ACID", "Partition-shaped access"],
                        ["Give up", "Easy write scale", "Joins / multi-row tx"],
                        ["Start with", "Postgres", "Only if the key is obvious"],
                    ],
                ),
                T("Describe the queries first, then pick the store. Payments stay on SQL."),
            ),
            section(
                "replication",
                "Replication",
                D("Primary takes writes. Replicas serve reads. Copies for durability and read scale."),
                R("Async = faster, can lose last writes. Sync = safer, slower. Lag is real."),
                E("Checkout primary + two async replicas for product pages. Read-your-writes → primary or sticky."),
                T("Ask if the product can tolerate lag before you say 'eventual'."),
            ),
            section(
                "sharding",
                "Sharding",
                D("Split data by a key when one primary cannot hold writes or size."),
                R("Shard key must be on every query you care about. Even load. Plan reshard."),
                E("Shard users by user_id. Timestamp keys create hot shards."),
                T("Name the key and one query that becomes painful."),
            ),
            section(
                "queues",
                "Message queues",
                D("Decouple a write from slow work. Absorb spikes. Retry."),
                R("At-least-once + idempotent consumer. Exactly-once needs a story."),
                E("After checkout, enqueue 'send email' instead of SMTP in the request."),
                T("Say 'at-least-once + idempotent' out loud."),
            ),
            section(
                "cap",
                "CAP theorem",
                D("On a partition you choose consistency or availability. CA is one node."),
                R("CAP is about a split, not everyday latency. Choose per request type."),
                E("Quorum write = CP. Serve last cached inventory during a split = AP."),
                T("Talk about the user-visible failure first, then name CP or AP."),
            ),
            section(
                "consistency",
                "Consistency",
                D("How stale is too stale? Strong / read-your-writes / causal / eventual."),
                R("Pick per use case. Money is usually strong. Like counts can be eventual."),
                E("A user must see their own write → read primary or session stickiness."),
                T("Name the stale window. Do not say 'eventual' for transfers."),
            ),
            section(
                "availability-reliability",
                "Availability / Reliability",
                D("Availability = uptime fraction. Reliability = it does the right thing when up."),
                R("Replicas + health checks + timeouts + retries with jitter + idempotency."),
                E("99.9% ≈ 8.8h down/year. Multi-AZ before multi-region."),
                T("Retries without idempotency double-charge. Timeouts everywhere."),
            ),
            section(
                "tradeoffs",
                "Common system-design trade-offs",
                TB(
                    ["Choice", "Gain", "Pay"],
                    [
                        ["Cache", "Latency, DB load", "Stale data, stampede"],
                        ["Async queue", "Fast writes", "At-least-once, complexity"],
                        ["Shard", "Write scale", "Cross-shard pain"],
                        ["Strong consistency", "Correctness", "Latency / availability"],
                        ["Microservices", "Team scale", "Ops, traces, failures"],
                    ],
                ),
                T("Pick one tradeoff and defend it. Do not list every buzzword."),
            ),
        ],
    },
    {
        "slug": "lld-ood",
        "title": "LLD / OOD",
        "description": "SOLID, composition, patterns, and the class designs LLD rounds expect.",
        "minutes": 12,
        "order": 4,
        "sections": [
            section(
                "solid",
                "SOLID",
                B(
                    [
                        "S — one reason to change",
                        "O — extend without editing (strategy, decorator)",
                        "L — subtype honors the contract",
                        "I — small interfaces",
                        "D — depend on abstractions; inject",
                    ]
                ),
                T("Name the letter that applies to the design, not all five."),
            ),
            section(
                "composition",
                "Composition vs inheritance",
                D("Inheritance is 'is-a'. Composition is 'has-a' and a behavior object."),
                R("Prefer composition when combinations explode or the subtype would break the parent contract."),
                E("Duck that flies: inject FlyBehavior, do not subclass FlyingDuck / NonFlyingDuck forever."),
                T("Interviewers treat deep inheritance as a smell unless the domain is truly taxonomic."),
            ),
            section(
                "interfaces-abstract",
                "Interfaces vs abstract classes",
                D("Interface = capability. Abstract class = shared partial implementation + identity."),
                R("Java: implement multiple interfaces; extend one class. Default methods are for evolution, not fat APIs."),
                E("`Comparable`, `AutoCloseable` are interfaces. A base `AbstractStore` may share retry logic."),
                T("Start with an interface. Promote to abstract class only when you share state."),
            ),
            section(
                "di",
                "Dependency injection",
                D("Pass collaborators in. Do not `new` them inside if you need to test or swap."),
                R("Constructor injection is the default. It makes dependencies obvious."),
                E("`new RateLimiter(clock, store)` — fake the clock in tests."),
                T("If they ask testability, point at the injected clock or repository."),
            ),
            section(
                "patterns",
                "Common design patterns",
                D("Named solutions to recurring structure problems. Use when the name saves time."),
                R("Do not spray patterns. Pick one that removes a real branch or duplication."),
                T("Implement one live. Talking through six patterns with no code is weak."),
            ),
            section(
                "factory",
                "Factory",
                D("Create objects without the caller naming the concrete class."),
                R("Use when the type depends on config or a string the caller should not switch on."),
                E("`Parser.create(filename)` returns JsonParser or XmlParser."),
                T("Simple factory is enough. Abstract factory only if families of products appear."),
            ),
            section(
                "strategy",
                "Strategy",
                D("Swap an algorithm behind an interface."),
                R("Replace if/else families that choose a behavior."),
                E("Payment: CardStrategy / WalletStrategy injected into Checkout."),
                T("This is the pattern they want when they say 'make it open for extension'."),
            ),
            section(
                "observer",
                "Observer",
                D("Subject notifies dependents when state changes."),
                R("One-to-many, loose coupling. Watch update cost and cycles."),
                E("OrderPlaced → email, inventory, analytics subscribe."),
                T("In LLD, an in-process list of listeners is enough. Do not jump to Kafka."),
            ),
            section(
                "builder",
                "Builder",
                D("Stepwise construct a complex immutable object."),
                R("Many optional fields or telescoping constructors → builder."),
                E("`HttpRequest.builder().url().header().build()`."),
                T("Do not builder a 2-field class. It looks like cargo-cult."),
            ),
            section(
                "adapter",
                "Adapter",
                D("Wrap an existing type to match the interface you need."),
                R("You cannot change the foreign API. You can change your side."),
                E("Legacy XmlClient adapted to your JsonRepo interface."),
                T("Adapter changes shape. Decorator adds behavior and keeps the same type."),
            ),
            section(
                "singleton",
                "Singleton",
                D("One instance. Hard to test. Hidden global state."),
                R("Prefer injecting a single shared instance from the edge. If you must: enum singleton."),
                E("A Logger singleton is common and still painful in tests."),
                T("Say you would avoid it unless they insist. That is the senior answer."),
            ),
            section(
                "lld-questions",
                "Common LLD interview questions",
                B(
                    [
                        "Parking lot / elevator / library",
                        "Rate limiter (token bucket, injectable clock)",
                        "Pub/sub or notification service",
                        "Snake and ladder / card game / chess",
                        "Splitwise / URL shortener (LLD, not scale)",
                    ]
                ),
                T("Clarify actors and use cases for 3 minutes. Then classes, then one sequence diagram in words."),
            ),
        ],
    },
    {
        "slug": "behavioral",
        "title": "Behavioral",
        "description": "STAR stories, culture signals, and the loops that decide the offer.",
        "minutes": 10,
        "order": 5,
        "sections": [
            section(
                "star",
                "STAR framework",
                S(
                    [
                        "Situation — one sentence of context",
                        "Task — your responsibility",
                        "Action — what you did (most of the time)",
                        "Result — metric, learning, or decision",
                    ]
                ),
                T("80% Action + Result. Cut the company history. Prepare 6 stories you can rotate."),
            ),
            section(
                "tell-me-about-yourself",
                "Tell me about yourself",
                D("A 90-second arc: past → present → why this role."),
                R("End on the job. Do not recite your résumé. One achievement per stop."),
                E("'I spent N years on X, recently shipped Y (metric), I want this team because Z.'"),
                T("Practice out loud to 90 seconds. They will interrupt — land the last sentence first if you have to cut."),
            ),
            section(
                "leadership",
                "Leadership examples",
                D("Influence without a title counts. Interviewers want ownership, not heroics."),
                R("Show how you aligned people, unblocked, or raised the bar. Name the tradeoff you made."),
                E("You drove an API review that cut a week of rework. You did not 'work weekends to save it' as the whole story."),
                T("Use 'I' for your actions and 'we' for the outcome. Pure 'we' hides you."),
            ),
            section(
                "conflict",
                "Conflict",
                D("Disagreement with a peer or partner that you resolved without dumping them."),
                R("Steelman their view. Data or user impact. The decision, not the grudge."),
                E("PM wanted scope; you showed latency data; you cut v1 and scheduled v2."),
                T("Never make the other person the villain. Collaboration is scored hard."),
            ),
            section(
                "failure",
                "Failure",
                D("A real miss you owned, diagnosed, and changed behavior after."),
                R("No fake failures ('I work too hard'). Name the blast radius and the new habit."),
                E("You shipped a migration without a backout; you wrote the runbook and rehearsal after."),
                T("End on what you do differently now. Show you learned, not just that you failed."),
            ),
            section(
                "difficult-teammate",
                "Difficult teammate",
                D("Someone blocking quality, pace, or culture."),
                R("Private first. Specific examples. Offer help. Escalate with facts if needed."),
                E("A reviewer nits forever; you agreed a rubric and SLA; cycle time dropped."),
                T("Do not diagnose their personality. Diagnose the working agreement."),
            ),
            section(
                "ambiguity",
                "Ambiguous requirements",
                D("Unclear goal, missing owner, or conflicting stakeholders."),
                R("Write the decision, list options, pick a default, time-box, confirm."),
                E("Two PMs, two metrics; you picked the customer-facing SLA and documented the other as non-goal."),
                T("Show a bias to ship a thin slice, then learn from it."),
            ),
            section(
                "ownership",
                "Leadership / ownership",
                D("You saw a gap and closed it without being asked."),
                R("Scope the problem, pull in the right people, finish, and leave a system so it does not recur."),
                E("On-call pages at 2am; you added a probe and a dashboard, not just a hotfix."),
                T("Ownership is follow-through, not volunteering for everything."),
            ),
            section(
                "customer-focus",
                "Customer focus",
                D("Start from the customer and work back. Internal users count."),
                R("Name the user, the pain, the metric, the thing you cut that they would not miss."),
                E("You killed a clever feature that support tickets showed nobody used."),
                T("Bring one number: time-to-complete, tickets, conversion, p95."),
            ),
            section(
                "growth-mindset",
                "Growth mindset",
                D("Know-it-all vs learn-it-all. They hire the second."),
                R("Show a time you were wrong, sought feedback, and changed the design or your skill."),
                E("A design review flattened your proposal; you rebuilt around the constraint and thanked the reviewer."),
                T("Curiosity beats perfection. Ask a smart question at the end of the interview."),
            ),
            section(
                "company-loop",
                "Company-loop preparation",
                B(
                    [
                        "Respect, integrity, accountability — do not trash prior employers",
                        "Cross-team: not local optimization",
                        "Inclusive: who was missing from the decision?",
                        "Hiring manager: motivation, team fit, how you take feedback",
                        "Prepare: 2 leadership, 1 conflict, 1 failure, 1 ambiguity, 1 customer",
                    ]
                ),
                T("Map each story to one signal at the end: 'that was learn-it-all' — once, not every answer."),
            ),
        ],
    },
    {
        "slug": "cs-fundamentals",
        "title": "CS Fundamentals",
        "description": "OS, networking, HTTP, and database facts that sit under backend interviews.",
        "minutes": 12,
        "order": 6,
        "sections": [
            section(
                "os",
                "Operating systems",
                D("The OS multiplexes CPU, memory, and I/O. You see it as processes, threads, virtual memory, and syscalls."),
                R("User space vs kernel. Blocking I/O vs async. Context switch is not free."),
                T("If they go deep: scheduling, page faults, and why too many threads thrash."),
            ),
            section(
                "process-thread",
                "Processes vs threads",
                D("Process = isolated address space. Threads share heap, not stacks."),
                R("IPC between processes. Locks between threads. A crash in a process usually dies alone."),
                E("A web worker pool is threads (or processes if you want isolation)."),
                T("Shared mutable heap is why thread bugs exist."),
            ),
            section(
                "memory",
                "Memory",
                D("Stack (frames, automatic) vs heap (new / GC). Virtual address space vs physical RAM. Cache lines matter."),
                R("Locality beats clever pointer structures on large n. GC allocates on the heap."),
                E("ArrayList scans faster than LinkedList because of contiguous memory."),
                T("In Java interviews, pair this with escape analysis only if they push."),
            ),
            section(
                "concurrency-cs",
                "Concurrency",
                D("Multiple tasks in flight. Parallelism is them running at the same time."),
                R("Race = unsynchronized shared write. Deadlock = cycle of locks. Starvation = never scheduled."),
                E("Check-then-act on a map without a lock loses updates."),
                T("Give the bug class, then the fix (confine, atomic, lock, queue)."),
            ),
            section(
                "networking",
                "Networking",
                D("Layers: app (HTTP) on transport (TCP/UDP) on IP. DNS finds the IP."),
                R("TCP is reliable and ordered. UDP is not. TLS sits on TCP for HTTPS."),
                T("Draw the path: browser → DNS → TCP handshake → TLS → HTTP."),
            ),
            section(
                "http-https",
                "HTTP / HTTPS",
                D("Request/response. Methods, status codes, headers. HTTPS = HTTP over TLS."),
                B(
                    [
                        "GET safe/idempotent. PUT idempotent. POST not necessarily",
                        "200 / 201 / 204 / 301 / 302 / 304 / 400 / 401 / 403 / 404 / 429 / 500 / 503",
                        "Idempotency-Key on payments. Cache-Control on reads",
                    ]
                ),
                T("Know 401 vs 403 and why 429 belongs on a limiter."),
            ),
            section(
                "tcp-udp",
                "TCP vs UDP",
                TB(
                    ["", "TCP", "UDP"],
                    [
                        ["Guarantee", "Ordered, retransmit", "None"],
                        ["Use", "HTTP, DBs", "DNS, games, video"],
                        ["Cost", "Handshake, HOL blocking", "Cheap, stale-ok"],
                    ],
                ),
                T("Reliability vs latency is the axis. Do not use UDP for money."),
            ),
            section(
                "dns",
                "DNS",
                D("Hierarchical name → IP. Recursive resolver, cache, TTL. CNAME vs A."),
                R("TTL is your cache. Low TTL = faster failover, more queries."),
                E("api.foo.com → CNAME to a load balancer DNS name → A records to anycast IPs."),
                T("Failover stories start at DNS TTL, not only at the load balancer."),
            ),
            section(
                "databases",
                "Databases",
                D("A store with a query language, indexes, and a transaction story — or a deliberate lack of one."),
                R("Access pattern first. Transactions favor SQL. Huge append-only or key lookup may not."),
                T("Do not default to the trendy store. Say what you would join."),
            ),
            section(
                "indexes",
                "Indexes",
                D("A B-tree (usually) that makes some lookups and sorts cheap and writes a bit more expensive."),
                R("Index the columns in the WHERE / JOIN / ORDER BY you actually run. High-cardinality equality first."),
                E("user_id on orders. A leading-wildcard `LIKE '%foo'` will not use a normal B-tree."),
                T("Every extra index slows writes. Name one you would not add."),
            ),
            section(
                "transactions",
                "Transactions",
                D("A bundle of reads/writes that commits or rolls back together."),
                R("Keep them short. Do not hold a transaction open across a network call."),
                E("Debit A and credit B in one transaction. Email send stays outside."),
                T("If you cannot fit it in one DB, you need idempotency and a saga — say that."),
            ),
            section(
                "acid",
                "ACID",
                B(
                    [
                        "Atomicity — all or nothing",
                        "Consistency — constraints hold after commit",
                        "Isolation — concurrent tx do not wreck each other",
                        "Durability — committed data survives a crash",
                    ]
                ),
                T("Consistency here is constraints, not CAP-C. Do not mix the words."),
            ),
            section(
                "isolation",
                "Isolation levels",
                TB(
                    ["Level", "Prevents", "Still allows"],
                    [
                        ["Read uncommitted", "almost nothing", "dirty reads"],
                        ["Read committed", "dirty reads", "non-repeatable"],
                        ["Repeatable read", "non-repeatable", "phantoms (engine-dependent)"],
                        ["Serializable", "the anomalies above", "more aborts / latency"],
                    ],
                ),
                T("Postgres default is read committed. Say when you would raise it (money, inventory)."),
            ),
        ],
    },
]
