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


TOPICS: list[dict] = []


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
    from database.seeds.learn_ood import ood_topics

    return ood_topics()


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
        ("star-story-bank", "Build a STAR Story Bank", "Six stories cover forty questions.", "You cannot invent a good story live.", "Most behavioral questions map to the same handful of competencies.", "Write six stories: a win, a failure, a conflict, an incident, an ambiguous project, a hard call. Tag each with the competencies it proves. Practice each to two minutes.", "Your incident story answers 'failure', 'pressure', 'ownership', and 'communication' depending on which part you stress.", "Every loop", "Stories that only prove one thing", "Reusing one story for every question in the same loop", "Keep the bank in Notes and re-read it the night before.", ["Six stories, tagged.", "Two minutes each.", "One story per question per loop."], ["How many stories do you need?", "How do you tag them?"]),
        ("questions-to-ask", "Questions to Ask the Interviewer", "The last five minutes are still the interview.", "'No questions' reads as no interest.", "Good questions show what you care about.", "Ask about the work, not the perks: what the team shipped last quarter, what a bad week looks like, how decisions get made, what would make the first 90 days a success.", "'What did the team ship last quarter that you are proudest of, and what got cut to ship it?'", "Every round", "Questions the website answers", "Asking about compensation in the technical round", "Prepare three; ask two; one should be specific to that interviewer.", ["Ask about the work.", "Three prepared, two asked.", "One specific to the person."], ["What do you ask an engineer vs a manager?", "What should you never ask here?"]),
        ("recruiter-screen", "The Recruiter Screen", "A fit check and a logistics call, not a technical exam.", "It decides whether you get the loop at all.", "Recruiters screen for role fit, level, timeline, and enthusiasm.", "Have a 60-second summary, your level and location constraints, your timeline, and two questions about the process. Do not negotiate yet; give a range only if pushed, and anchor it on the market.", "'I am a backend engineer with five years on payments systems, targeting senior roles, available in four weeks. What does the loop look like?'", "First contact", "Over-sharing your current salary", "Naming a number before you know the band", "Ask what level they are hiring for before you describe yourself.", ["Sixty-second summary.", "Level, location, timeline.", "Defer the number."], ["Should you give a salary number here?", "What do you ask about the process?"]),
        ("take-home-assignments", "Take-Home Assignments", "Scoped, tested, documented, and on time.", "Reviewers read the README before the code.", "They grade judgment as much as code.", "Clarify scope in writing. Time-box to what they asked. Ship tests, a README with how to run and what you skipped, and clean commits. Say what you would do with more time.", "A README that opens with 'Run: make test' and ends with 'Not done: retries and pagination, here is how I would add them'.", "Startups, some big companies", "Gold-plating for a week", "Silent scope creep with no README", "Spend the last hour on the README, not on one more feature.", ["Clarify scope first.", "Tests and README.", "Name what you skipped."], ["What do reviewers read first?", "How long should it take?"]),
        ("salary-negotiation", "Offer & Negotiation", "Negotiate the package, politely, with leverage.", "Almost every offer has room.", "Companies expect a counter; they rarely rescind for asking.", "Get the full package in writing: base, equity, bonus, sign-on, start date. Anchor on the band and competing data, not your current pay. Ask for one thing at a time, in priority order. Stay warm; recruiters are allies.", "'I am excited about the team. On total comp the offer is below the two others I am weighing; can we get base to X or add a sign-on to close the gap?'", "Every offer", "Bluffing offers you do not have", "Accepting on the call", "Ask for 48 hours, then counter once with a specific number.", ["Full package in writing.", "One counter, specific.", "Stay warm."], ["What can you negotiate besides base?", "How do you counter without an alternative offer?"]),
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


def _dsa_topics() -> list[dict]:
    from database.seeds.learn_dsa import dsa_core_topics
    from database.seeds.learn_dsa_patterns import dsa_pattern_topics
    from database.seeds.learn_dsa_problems import worked_problems_topic

    return [*dsa_core_topics(), *dsa_pattern_topics(), worked_problems_topic()]


def _system_design_topics() -> list[dict]:
    from database.seeds.learn_system_design import system_design_topics

    return system_design_topics()


def _ai_topics() -> list[dict]:
    from database.seeds.learn_ai import ai_topics

    return ai_topics()


TOPICS.extend(_dsa_topics())
TOPICS.extend(_system_design_topics())
TOPICS.extend(_java_topics())
TOPICS.extend(_cs_topics())
TOPICS.extend(_ood_topics())
TOPICS.extend(_behavioral_topics())
TOPICS.extend(_ai_topics())

