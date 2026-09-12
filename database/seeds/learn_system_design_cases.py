"""System Design interview case studies.

Each lesson is a complete interview walkthrough rather than an architecture
diagram: the prompt, the clarifying questions, the estimates, the APIs, the
data model, a deliberately simple first design, the bottleneck, the deep dive,
and then the design evolving under interviewer pressure ("now it is 10x",
"what if Redis goes down", "how would you go multi-region").

Rendering constraints are the same as ``learn_system_design.py``: no fenced
code blocks, no nested list items.
"""

from __future__ import annotations

from database.seeds.learn_system_design import SD, _sd_topic


def _url_shortener() -> dict:
    return SD(
        "sd-url-shortener",
        "Design a URL Shortener",
        "The classic opener: unique key generation, a 100:1 read ratio, and a design that evolves from one box to multi-region.",
        18,
        "**Interviewer:** \"Design a URL shortening service like bit.ly. A user submits a long URL and gets a short one back. Anyone opening the short link is redirected to the original.\"",
        [
            (
                "Why It Matters",
                """This is the most common opening prompt in system design interviews, and it is deceptively easy. The functional requirements take thirty seconds to satisfy; the interview is entirely about how you handle the read path, how you generate keys without coordination, and whether you can resist over-engineering a problem whose data fits comfortably on one machine.

It also has an unusually clean evolution path, which is why interviewers use it: they can turn the traffic up four times and watch your design change.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """**What to ask, and what each answer changes:**

- *"Can users choose a custom alias?"* — Yes means a uniqueness check on user input and a separate namespace collision problem.
- *"Do links expire?"* — Expiry means a TTL and a cleanup strategy for hundreds of millions of rows.
- *"Do we need analytics — click counts, referrers?"* — This is often the real second half of the question, and it is a write-heavy problem bolted onto a read-heavy one.
- *"Is creation authenticated?"* — It determines rate limiting and abuse handling.
- *"How long must links live?"* — Forever changes the storage estimate and the key space.
- *"Redirect 301 or 302?"* — This one matters more than candidates expect: a 301 is cached by browsers permanently, which is cheaper for you and destroys your analytics and your ability to change the target.

**Agreed scope:** create short links, redirect, optional custom alias, links live forever, basic click counting is in scope, and full analytics dashboards are out.

**Non-functional:** redirects must be fast — p99 under 100 ms globally — and highly available, because a broken redirect breaks somebody else's page. Creation can be slower and slightly less available. Click counts may lag by a minute.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """> "Let me size this before I choose anything."

- 100M new links per month, which is about 40 writes per second average and roughly 120 at peak.
- Read:write of 100:1, so 4,000 reads per second average and about 12,000 at peak.
- Storage per row: short code 7 bytes, long URL averaging 200 bytes, owner, timestamps, expiry — call it 500 bytes with overhead.
- 100M × 500 bytes ≈ 50 GB per month, 600 GB per year, 3 TB over five years, before replication.

**The conclusions that matter:**

1. 600 GB a year is small. One database holds this for years. Sharding is not a day-one concern, and saying so is a positive signal.
2. 12,000 peak reads per second against a single indexed lookup is more than one database should comfortably serve, and the same links are requested repeatedly. This is a caching problem.
3. Writes are trivial. The interesting part of the write path is not throughput, it is generating unique keys without a coordination bottleneck.""",
            ),
            (
                "Step 3: API Design",
                """Three endpoints.

- `POST /v1/links` with body `{url, alias?, expires_at?}` and an `Idempotency-Key` header. Returns `201` with `{code, short_url, created_at}`. Idempotency matters because a retried creation should not mint a second code.
- `GET /{code}` returns `302 Found` with a `Location` header and a short `Cache-Control`. Not 301, so we keep the ability to count clicks and to change or disable a link.
- `GET /v1/links/{code}/stats` returns `{code, clicks, created_at}` for the owner.

The redirect endpoint is deliberately on the root path with no version prefix, because short links must be short.""",
            ),
            (
                "Step 4: Data Model",
                """One table is enough.

| Column | Type | Notes |
| --- | --- | --- |
| `code` | varchar(10) | Primary key, base62 |
| `long_url` | text | The destination |
| `owner_id` | uuid | Nullable for anonymous creation |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | Nullable |

Indexes: primary key on `code` serves the only hot query. A secondary index on `(owner_id, created_at)` serves the user's list of links. An index on `expires_at` supports the cleanup job, partial to rows where it is not null.

Click counts do not belong in this table. Incrementing a row on every redirect turns a read into a write and makes the hot row a contention point at 12,000 per second. Counts go to a separate aggregation path.""",
            ),
            (
                "Step 5: First Architecture",
                """Client → Load balancer → Link service → Postgres

That is the whole v1, and it is correct for the write path and borderline for the read path. State that explicitly: "This handles 40 writes per second comfortably. The 12,000 reads are the part that needs work, so let me address that first."

Then add the cache:

Client → Load balancer → Link service → Redis → Postgres

Cache-aside on `code → long_url`, TTL of an hour, populated on write as well as on read because a freshly created link is very likely to be clicked immediately. Link popularity follows a steep power law, so the hit rate will be well above 95% and Postgres sees a few hundred reads per second.""",
            ),
            (
                "How It Works",
                """### The interesting part: generating the code

Four approaches, and the comparison is the substance of the interview.

**1. Hash the URL.** Take an MD5 or SHA of the long URL, base62-encode, take the first 7 characters.

- Simple and stateless.
- Collisions are certain at scale (the birthday problem on a 62⁷ space), so you need a check-and-retry loop, which is a read before every write.
- Two users shortening the same URL get the same code, which breaks per-user analytics and custom expiry.

**2. Random generation.** Generate 7 random base62 characters, insert, retry on unique-constraint violation.

- Stateless, unguessable, no coordination.
- Collision probability is negligible until the table is large, and the unique constraint makes it correct regardless.
- This is a genuinely good answer and is underrated by candidates who have read about counters.

**3. Counter plus base62.** A global counter, base62-encoded.

- Shortest possible codes, no collisions by construction.
- Sequential codes are guessable and enumerable, which leaks how many links exist and lets anyone crawl every link. Usually disqualifying for a public product unless you scramble the output.
- A single counter is a coordination point at every write.

**4. Ranged counter allocation — the production answer.** Each application node requests a block of 10,000 ids from a central allocator (a row in Postgres updated atomically, or a Redis `INCRBY`), then hands them out locally.

- One coordination round trip per 10,000 writes instead of per write.
- No collisions, no read-before-write.
- Gaps appear when a node dies holding an unused block, which is harmless.
- Ids are still sequential, so scramble them — a bijective transform such as multiplying by a large coprime modulo the key space, or Feistel-style encryption of the integer — to make codes unguessable while keeping them unique.

**Key space:** 62⁷ is about 3.5 trillion. At 100M links a month that is 2,900 years. Seven characters is right; six (56 billion) would last about 45 years and is defensible; eight is wasteful. Being able to do that arithmetic on the spot is the point.

### Custom aliases

A separate concern: they live in the same namespace, so a user-chosen alias must not collide with a generated code. The clean solution is to keep generated codes in a form users cannot request — a distinct length or a reserved character — or simply to attempt the insert and let the unique constraint decide, returning `409` on conflict.

### Click counting without killing the read path

The redirect must not do a synchronous database write. Options in increasing order of sophistication:

- Increment a Redis counter on each redirect, flush to Postgres every 30 seconds. Loses a few counts if Redis dies, which is acceptable for a click count.
- Emit an event to a queue or log, aggregate asynchronously. Durable, replayable, and gives you referrer and geography for free later.

Say which you would choose and why. For "basic click counting", the Redis counter is proportionate.""",
            ),
            (
                "Evolution Under Pressure",
                """This is the part the interviewer is actually running.

### Round 1 — "Now it is 10x: 120,000 reads per second."

The application tier scales horizontally; it is stateless, so this is just more nodes. Redis at 120,000 GETs per second is within one node's capability but leaves no headroom and no fault tolerance, so: Redis Cluster or a replicated primary with read replicas.

The real change is that a cache miss now matters. At a 97% hit rate, misses are 3,600 per second against Postgres, which is too many for one primary doing anything else. Add read replicas for the miss path.

Better still: put a CDN in front. A redirect is a cacheable HTTP response. If the CDN caches `GET /{code}` for 60 seconds, the vast majority of redirects for popular links never reach our infrastructure at all. This is the highest-leverage change and candidates rarely propose it.

### Round 2 — "Now 1 billion reads per day, and links are global."

Multi-region read deployment: the link table is effectively append-only and small, so replicate it fully to every region. Each region has its own Redis and its own read replica. Writes still go to one region, because 40 writes per second does not need local write capacity and routing writes centrally avoids the entire conflict problem.

Cross-region replication lag means a link created in the US might not resolve in Europe for a second. Mitigation: on a cache and database miss, fall back to querying the origin region before returning 404. That single fallback turns a correctness bug into an occasional slow request.

### Round 3 — "What happens if Redis goes down?"

Reads fall through to Postgres. At 120,000 per second that is far beyond what the replicas can serve, so:

- The client treats a Redis timeout (10–20 ms) as a miss rather than an error, so the system stays up.
- A concurrency limiter caps in-flight database queries so Postgres degrades rather than collapses. Excess requests get a fast 503 with `Retry-After`, which is better than everything timing out.
- The CDN layer keeps serving popular links throughout, which is now doing most of the work anyway.
- Recovery is a cold cache, so requests are limited while it warms.

### Round 4 — "One link is on the front page of a major site: 50,000 requests per second for one code."

A single hot key. Redis Cluster does not help, because the key hashes to one slot on one node.

- The CDN absorbs nearly all of it, since every request is identical and cacheable.
- Behind the CDN, a short in-process cache (5 seconds) in each application node collapses the remainder to a handful of Redis reads per node.
- This is the standard hot-key answer and it is worth stating in that order: edge first, local cache second, key splitting only if neither works.

### Round 5 — "When do you shard, and on what?"

At 3 TB and growing, Postgres is still fine with partitioning. If you did shard, the key is `code` itself, hashed — every read includes it, so every read is single-shard. The queries that break are "all links for this owner", which becomes a scatter-gather; the fix is a separate table keyed by `owner_id`, which is a small write amplification for a query that is rare.

Say this: "I would not shard at these numbers. If forced, hash on `code`, and I would maintain an owner-keyed index table separately."
""",
            ),
            (
                "Failure Modes",
                """- **Hot key** on a viral link, addressed above.
- **Malicious use** — the service becomes a redirector for phishing. Real products need URL scanning at creation, a blocklist, and the ability to disable a link instantly, which is another argument against 301 responses.
- **Redirect loops** — someone shortens a short link. Detect and reject at creation.
- **Enumeration** — sequential codes let anyone crawl every link. Scramble the ids.
- **Cache stampede** when a popular link expires from cache. TTL jitter plus single-flight.
- **Deletion and expiry at scale** — deleting hundreds of millions of expired rows needs partitioning by expiry month, so cleanup is a partition drop rather than a mass delete.""",
            ),
            (
                "Trade-offs",
                """- **302 versus 301.** 302 keeps analytics and control, and costs a request to your infrastructure every time. 301 is nearly free and permanent — you can never change or revoke that link for clients that cached it.
- **Counter versus random codes.** Counters give the shortest codes and need coordination and scrambling. Random needs a unique constraint and one extra character of length.
- **Caching the redirect at the CDN.** Enormous offload, and it weakens click counting and delays revocation. A 60-second TTL is usually the right compromise.
- **Analytics coupling.** Synchronous counting is simple and puts a write on the hot path; asynchronous is correct and adds a pipeline.
- **SQL versus key-value store.** This workload is a pure key lookup, so DynamoDB or Cassandra would fit well. Postgres is chosen for operational simplicity and because the volume does not require anything else — which is the honest reason and a good one.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Why not just hash the URL?"** — Collisions need a read-before-write, and identical URLs from different users must get different codes if you want per-link analytics or expiry.
- **"How long should the code be?"** — Do the arithmetic out loud: 62⁷ ≈ 3.5 trillion, which at your creation rate lasts millennia.
- **"How do you avoid two servers generating the same code?"** — Ranged allocation plus a unique constraint as the backstop. Never rely on coordination alone.
- **"Can users guess other people's links?"** — Not if codes are random or scrambled. Note that short links are inherently semi-public; genuinely private links need authentication, not obscurity.
- **"How do you handle 50,000 requests per second for one link?"** — Edge caching, then a local cache. Explain why sharding the cache does not help.
- **"What if the database is down?"** — Cached links keep redirecting; creation fails. That is a good degradation, and it is worth pointing out that the read path can survive without the write path entirely.""",
            ),
            (
                "Common Mistakes",
                """- Reaching for Kafka, Cassandra, and sharding on a 600 GB dataset
- Incrementing a click counter synchronously on the redirect path
- Using a single global counter with no batching
- Sequential, guessable codes with no scrambling
- Using 301 redirects without acknowledging that you have given up control
- Never mentioning what happens when the cache is unavailable
- Treating the write path as the interesting part when the read path is where all the traffic is""",
            ),
            (
                "Interview Tip",
                """Say the read path in one sentence and the write path in one sentence, then go deep on key generation — it is the only genuinely interesting algorithmic decision in the problem, and it is where the interviewer expects the depth.""",
            ),
        ],
        [
            "Estimate first: 600 GB a year and 12,000 peak reads means cache the read path and do not shard.",
            "Ranged counter allocation plus scrambling gives unique, unguessable codes with one coordination hop per 10,000 writes.",
            "Never write to the database on the redirect path — buffer click counts or emit events.",
            "A viral link is a hot-key problem solved at the CDN and in a local cache, not by scaling Redis.",
        ],
        [
            "How do you generate unique short codes across many servers?",
            "How long should the code be, and how do you justify it?",
            "What happens to the read path when Redis is unavailable?",
            "One link gets 50,000 requests per second. What do you do?",
            "When would you shard this, and on what key?",
        ],
    )


def _rate_limiter_case() -> dict:
    return SD(
        "sd-rate-limiter-design",
        "Design a Distributed Rate Limiter",
        "A compact, finishable design that exposes whether you understand distributed state, atomicity, and graceful failure.",
        16,
        "**Interviewer:** \"Design a rate limiter for a public API. It should cap each client to a configured number of requests per minute, and it runs across many gateway servers in several regions.\"",
        [
            (
                "Why It Matters",
                """This problem is small enough to finish in thirty minutes and deep enough to separate candidates completely. Everyone can describe a counter. The interview is in the details: atomicity of the increment, what happens when the counter store is unavailable, how you handle a client that is 40% of your traffic, and whether your limiter can be defeated by the attacker simply creating more accounts.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"What identifies a client — API key, user, IP, or tenant?"* — Determines the key and whether anonymous traffic is in scope.
- *"Is the limit global across regions or per region?"* — This is the single biggest architectural question in the problem.
- *"Are bursts allowed?"* — Decides token bucket versus a smooth window.
- *"Do different endpoints have different limits?"* — Usually yes, and cost-weighted limits are better than a single number.
- *"What should the client receive when limited?"* — `429` with `Retry-After` and limit headers.
- *"Is this protecting capacity, enforcing a pricing tier, or preventing abuse?"* — Different answers lead to different strictness and different failure behaviour.

**Agreed scope:** per-API-key limits, tiered by plan, enforced at the gateway, globally counted, with per-endpoint cost weighting. Bursts allowed up to a configured amount.

**Non-functional:** the limiter must add under 1 ms to p99, must not become a single point of failure, and must be accurate enough that a paying customer is never wrongly rejected at normal usage.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 50,000 requests per second at peak across the platform.
- 200,000 active API keys, of which a few thousand are active in any given minute.
- 50 gateway nodes across three regions.

**Consequences:**

- 50,000 limiter decisions per second. A Redis round trip at ~0.3 ms is affordable, and 50,000 operations per second is comfortable for a single Redis node but leaves no headroom, so plan for a cluster.
- State per key is tiny — two numbers — so memory is not a constraint: 200,000 keys × 100 bytes is 20 MB.
- The bottleneck is not capacity. It is the round trip on the hot path and the availability of the store.""",
            ),
            (
                "Step 3: API and Behaviour",
                """The limiter is not a user-facing API; its contract is the behaviour at the gateway.

Every response carries:

- `X-RateLimit-Limit` — the ceiling for this key and window
- `X-RateLimit-Remaining` — tokens left
- `X-RateLimit-Reset` — when the bucket refills

When rejected: `429 Too Many Requests`, a `Retry-After` in seconds, and a machine-readable error body. Never a silent drop — a client that cannot distinguish rejection from a network failure will retry immediately and make things worse.

An internal admin API sets and reads limits: `PUT /internal/limits/{key}` with `{requests_per_minute, burst, overrides_by_endpoint}`.""",
            ),
            (
                "Step 4: Choosing the Algorithm",
                """| Algorithm | Verdict for this problem |
| --- | --- |
| Fixed window | Rejected: allows 2x the limit across a window boundary |
| Sliding window log | Rejected: memory proportional to the limit, per key |
| Sliding window counter | Viable: smooth, cheap, approximate |
| Token bucket | **Chosen:** models burst and sustained rate with two parameters that map directly onto the product's pricing language |
| Leaky bucket | Rejected: shapes rather than rejects, which is not what an API tier needs |

Token bucket state per key is `(tokens, last_refill_timestamp)`. On each request, compute refill from elapsed time, cap at the burst size, decrement if a token is available.

Crucially, that read-compute-write must be **atomic**, or two concurrent requests both read the same token count and both proceed. In Redis this is a short Lua script evaluated server-side; `GET` then `SET` from the application has a race that will be exercised constantly at 50,000 requests per second.""",
            ),
            (
                "Step 5: First Architecture",
                """Client → Gateway → Redis (token bucket) → Upstream service

The gateway resolves the API key locally by verifying a signed token — no database lookup on the hot path — then evaluates the Lua script against Redis with key `rl:{api_key}`, and either proxies or returns `429`.

Placement matters: the limiter runs before authentication against any database, before request body parsing, and before any upstream call. A limiter that runs after the expensive work has already spent the resource it exists to protect.""",
            ),
            (
                "How It Works",
                """### Global counting across 50 gateways

The naive failure: each gateway keeps a local counter, so a limit of 1,000 per minute is enforced 50 times and the effective limit is 50,000. Any answer that does not address this is incomplete.

Three approaches:

**1. Central shared store (chosen).** All gateways evaluate against the same Redis. Exactly correct, one round trip per request, and Redis availability becomes a dependency.

**2. Local budgets with periodic reconciliation.** Each gateway is allocated a slice of the limit and syncs with the central store every few hundred milliseconds, adjusting its slice based on observed demand. Far fewer round trips, approximate enforcement, and the standard approach at very high throughput. Worth naming as the optimisation.

**3. Consistent routing by key.** Route all requests for a key to the same gateway so its local counter is authoritative. Exact and fast, and it creates a hot gateway for a heavy key and complicates deploys.

### Multi-region

The question the interviewer will ask: is the limit global or per region?

- **Global** requires cross-region coordination on every request, adding 80–150 ms. That is unacceptable on the hot path, so nobody does it synchronously.
- **Per region** is the practical answer: divide the limit across regions, either evenly or weighted by observed traffic. A customer whose traffic is entirely in one region gets only that region's share, which is wrong, so the allocation must be dynamic: each region periodically reports usage to a central service that redistributes the budget.
- The honest statement: **global limits across regions are approximate.** Say so, and say the bound: "worst case a customer briefly exceeds their limit by the number of regions, and we reconcile within a few seconds."

### When Redis is unavailable

Neither extreme is right:

- **Fail open** — no limiting, exactly when an attack may be causing the outage.
- **Fail closed** — the entire API is down because the limiter cannot decide.

**The answer:** fall back to a conservative local limit per gateway — the global limit divided by the node count — applied in memory. You lose global accuracy and keep a bound on total throughput. The degradation is announced by an alert, because degraded rate limiting is a security-relevant state, not just an availability one.

### Cost-weighted limits

A single number per key is crude when a search request costs 100 times a status check. Give each endpoint a token cost and deduct accordingly, so the limit expresses capacity rather than request count. This also lets the product sell "units" rather than "requests", which is how mature API products price.

### The hot customer

One enterprise customer generates 40% of traffic, so `rl:{their_key}` is a hot Redis key saturating one node.

- **Key sharding:** split into `rl:{key}:0` … `rl:{key}:9`, each with a tenth of the limit, chosen by a hash of the request id. Approximate — an unlucky distribution can reject a client below their limit — and it spreads load across ten nodes.
- **Dedicated capacity:** route that customer to a gateway pool with local enforcement, which is exact and operationally heavier.
- Choose based on how much the customer matters. For a large enterprise account, dedicated capacity is usually the right answer, and it is also a product differentiator.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "Traffic is 10x: 500,000 requests per second."

A single Redis will not do 500,000 round trips per second with headroom. Move to local budgets with reconciliation: each gateway holds a slice and syncs every 200 ms. Round trips to Redis drop by orders of magnitude. Accuracy becomes approximate within a sync interval, which for a rate limiter is fine and should be stated as a deliberate trade.

### Round 2 — "A client is hammering a rejected endpoint at 100,000 requests per second."

Rejecting still costs TCP, TLS, and a limiter evaluation. Persistent offenders must be dropped further out: propagate a block to the CDN or WAF layer so the traffic never reaches your gateways. Rate limiting is the polite mechanism; blocking is the mechanism for clients who ignore it.

### Round 3 — "A free-tier user creates 10,000 accounts."

The limiter is working perfectly and the defence has been defeated, because the attacker controls the dimension you are counting. This is the most interesting question in the problem.

Defences: limit account creation itself (by IP, by device fingerprint, by requiring verification), apply a second limit on a dimension the attacker does not control cheaply — source IP range, ASN — and detect correlated behaviour across accounts. The general lesson, worth stating: **a limiter keyed only on an identifier the attacker can mint is not an abuse defence.**

### Round 4 — "How do you change a customer's limit without a deploy?"

Limits live in a config store, cached at each gateway with a short TTL and a change notification. A limit change takes effect within seconds. The cache means a config store outage does not break the limiter.

### Round 5 — "How do you know the limiter is behaving?"

Metrics: rejection rate per key and per endpoint, limiter decision latency, Redis error rate, fallback-mode activations, and the number of keys near their limit. The last one is a product signal — customers approaching their limit are candidates for an upgrade conversation, which is the kind of observation that reads as commercial awareness.""",
            ),
            (
                "Failure Modes",
                """- **Non-atomic increment**, allowing overshoot under concurrency.
- **Per-node counters** multiplying the effective limit.
- **Hot key** on a large customer.
- **Clock skew** across gateways making refill calculations inconsistent; use the Redis server's clock inside the script rather than each gateway's.
- **Silent fail-open** during a store outage, with nobody alerted.
- **Keys without expiry** accumulating in Redis for every key ever seen.
- **Limiter after the expensive work**, so it protects nothing.""",
            ),
            (
                "Trade-offs",
                """- **Central counting versus local budgets.** Exactness versus a round trip per request; at high scale you must give up exactness.
- **Global versus per-region limits.** Correct versus achievable; per-region with dynamic reallocation is the practical compromise.
- **Strict enforcement versus customer experience.** Rejecting a paying customer at 1,001 requests when they bought 1,000 is technically correct and commercially unwise; a small grace margin is normal.
- **Token bucket versus sliding window.** Bursts allowed and simple parameters, versus smoother enforcement.
- **Rate limiting versus load shedding.** Per-client policy applied always, versus system-wide triage applied under stress. A complete design has both and distinguishes them.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Why token bucket?"** — Two parameters that map to how the product sells capacity, natural burst handling, and cheap state.
- **"How is the increment atomic?"** — A Lua script in Redis, evaluated server-side. Explain the race that a plain GET/SET has.
- **"What if Redis goes down?"** — Local conservative fallback plus an alert. Explain why both fail-open and fail-closed are wrong.
- **"Global or per-region?"** — Per region with dynamic budget reallocation, and state the accuracy bound.
- **"Someone creates 10,000 accounts. Now what?"** — The limiter is not the defence; name the other dimensions.
- **"What is the latency cost?"** — Sub-millisecond for a local Redis round trip, and zero extra round trips in the local-budget design.""",
            ),
            (
                "Common Mistakes",
                """- In-memory counters in a multi-node deployment
- Non-atomic read-modify-write
- No `Retry-After` header
- No answer for the limiter's own failure
- One limit for every endpoint regardless of cost
- Ignoring the hot-key problem
- Confusing rate limiting with load shedding""",
            ),
            (
                "Interview Tip",
                """Deliver the whole design in one sentence early — "token bucket, keyed by API key, atomic Lua script in Redis, enforced at the gateway, 429 with Retry-After, and a local conservative fallback if Redis is unreachable" — then spend the remaining time on global counting across regions and the hot-customer problem, which are where the depth is.""",
            ),
        ],
        [
            "Token bucket with an atomic Redis script at the gateway is the defensible default.",
            "Per-node counters multiply the limit by the node count; either count centrally or allocate local budgets that reconcile.",
            "Global cross-region limits are necessarily approximate — state the bound rather than pretending otherwise.",
            "When the counter store fails, fall back to a conservative local limit and alert; never silently fail open.",
        ],
        [
            "How do you enforce one global limit across fifty gateway nodes?",
            "Why must the counter update be atomic, and how do you achieve it?",
            "What happens when the rate limiter's storage is unavailable?",
            "A customer is 40% of your traffic and their key is hot. What do you do?",
            "An attacker creates thousands of accounts to multiply their quota. How do you respond?",
        ],
    )


def _news_feed() -> dict:
    return SD(
        "sd-news-feed",
        "Design a News Feed (Twitter / X)",
        "Fan-out on write versus read, the celebrity problem, and how a feed design evolves at 10x.",
        18,
        "**Interviewer:** \"Design the home timeline for a service like Twitter. A user posts, their followers see it. Focus on the read and write paths.\"",
        [
            (
                "Why It Matters",
                """The feed is the canonical read-heavy, fan-out problem. It tests whether you can quantify write amplification, choose a strategy per user rather than globally, and handle the extreme skew of a social graph — where the average user has 200 followers and a handful have 100 million.

It is also the problem where the naive answer works fine at small scale and fails catastrophically at large scale, which makes it perfect for the "now it is 10x" treatment.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"Chronological or ranked?"* — Chronological is a merge problem; ranked adds a scoring layer over a candidate set. Ask, because they are different systems.
- *"How fresh must the feed be?"* — Seconds or minutes? This decides whether precomputation is viable.
- *"What is the follower distribution?"* — The answer is always heavily skewed, and that skew is the entire design problem.
- *"Do we need to support unfollows and blocks applying immediately?"* — It affects whether a precomputed feed can be trusted.
- *"Media in posts?"* — Object storage plus CDN, mentioned and set aside.
- *"Do we need read receipts, edits, deletes?"* — Deletes matter: a deleted post must disappear from precomputed feeds.

**Agreed scope:** post a tweet, follow a user, read a reverse-chronological home timeline with light ranking. Search, ads, and direct messages out of scope.

**Non-functional:** feed read p99 under 200 ms, posts visible to followers within a few seconds, feed reads may be a few seconds stale, and the author must always see their own post immediately.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 300M monthly users, 150M daily.
- Each user reads their feed 10 times a day: 1.5B feed reads per day ≈ 15,000 QPS average, ~45,000 peak.
- Each user posts 0.5 times a day: 75M posts per day ≈ 800 per second average, ~2,500 peak.
- Read:write ≈ 20:1 at the post level, but the interesting ratio is fan-out.
- Average 200 followers means a post generates 200 feed insertions: 75M × 200 = **15 billion feed writes per day**, about 170,000 per second average.
- Post storage: 75M × 500 bytes ≈ 37 GB per day, 13 TB per year.

**The conclusion that drives everything:** 170,000 feed writes per second is far more than 2,500 post writes per second. Whether you pay that cost on write or on read is the central decision.""",
            ),
            (
                "Step 3: API Design",
                """- `POST /v1/posts` body `{text, media_ids?}` returns `201 {post_id, created_at}`.
- `GET /v1/feed?cursor=<opaque>&limit=20` returns `{items: [...], next_cursor}`. Cursor pagination, never offset — a feed shifts constantly and offsets produce duplicates and gaps.
- `POST /v1/follows` body `{target_user_id}`.
- `GET /v1/users/{id}/posts?cursor=` for a profile timeline, which is a much easier query.""",
            ),
            (
                "Step 4: Data Model",
                """**posts** — `post_id` (time-sortable, e.g. Snowflake), `author_id`, `text`, `media`, `created_at`. Partitioned by `post_id` range or hashed by `author_id` depending on the store.

**follows** — `(follower_id, followee_id, created_at)`. Two indexes are needed and they serve different queries: by `follower_id` to build a feed by pull, and by `followee_id` to fan out on write. This table is large — hundreds of billions of rows — and is usually its own sharded service.

**feed** (if precomputing) — `(user_id, post_id, author_id, score)` stored as a capped list per user. Redis sorted sets or a wide-column table keyed by `user_id` with `post_id` as the clustering column, descending.

The feed table holds only ids, not post content. Post bodies are fetched by id from a cache in a batch. This keeps the feed small, avoids duplicating post content 200 times, and means an edited or deleted post is corrected in one place.""",
            ),
            (
                "Step 5: First Architecture and the Central Decision",
                """### Fan-out on read (pull)

On feed request: look up who the user follows, query recent posts from each, merge, sort, return.

- Writes are trivial — one row per post.
- Reads are expensive: a user following 500 accounts triggers 500 queries or one large scatter-gather, then a merge. At 45,000 feed reads per second this is impossible.
- Correct and fresh by construction.

### Fan-out on write (push)

On post: look up the author's followers and insert the post id into each of their feed lists.

- Reads are a single range read of a precomputed list. Fast and cheap.
- Writes are amplified by the follower count. 170,000 feed writes per second on average, and a single celebrity post is tens of millions of writes.
- Feeds can be stale with respect to unfollows and deletes unless handled.

### The hybrid — the expected answer

- **Normal users (below ~10,000 followers):** fan out on write. Cheap, and it covers the overwhelming majority of posts.
- **Celebrities (above the threshold):** do not fan out. Store the post once. At read time, merge the reader's precomputed feed with recent posts from the small number of celebrities they follow.
- The merge is cheap because a user follows at most a handful of very large accounts, and those accounts' recent posts are heavily cached — one cache entry serves millions of readers.

Say the threshold and say it is tunable. The reasoning matters more than the number: the crossover is where the write cost of fanning out exceeds the read cost of merging at query time.""",
            ),
            (
                "How It Works",
                """### The write path

1. `POST /v1/posts` writes the post to the post store and returns immediately. The author's own timeline is updated synchronously so they always see their post.
2. An event goes to a queue.
3. Fan-out workers read the event, load the author's follower list, and batch-insert the post id into each follower's feed list.
4. Feed lists are capped — keep the most recent 800 entries per user. Nobody scrolls further, and an uncapped list grows without bound. Older content is served by falling back to a pull query.

Fan-out is asynchronous, so a post appears in followers' feeds within seconds. Backlog is monitored by oldest-message age, not queue depth.

### The read path

1. Read the top N ids from the user's feed list — one range read.
2. Fetch the small set of celebrity accounts this user follows, and read their recent posts from cache.
3. Merge by timestamp, apply filters (blocked users, muted words, already-seen), and light ranking.
4. Batch-fetch post bodies and author profiles by id from cache.
5. Return with a cursor.

Step 4 is where most of the latency lives, and it is a multi-get against cache with a very high hit rate. A naive implementation makes 20 sequential fetches and turns a 5 ms feed read into a 200 ms one — the N+1 problem at feed scale.

### Deletes, unfollows, and blocks

Precomputed feeds contain stale references. Rather than removing entries from millions of lists:

- **Filter at read time.** Check post existence and visibility when hydrating. A deleted post simply does not render. This is cheap because hydration already happens.
- **Unfollows** similarly: filter entries whose author the user no longer follows, and let the entries age out of the capped list.

This read-time filtering is the standard answer and it is much cheaper than write-time correction.

### Ranking

Once the candidate set exists (say 800 precomputed ids plus celebrity posts), ranking is a scoring pass over a few hundred items using features available at read time: recency, author affinity, engagement rate, and a model score. Critically, you never rank the entire corpus — retrieval narrows, ranking orders. Saying that distinction is worth more than describing a model.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A user with 100 million followers posts."

Pure fan-out on write means 100 million insertions for one post. Even at a million writes per second that is 100 seconds, during which the fan-out queue is saturated and every other user's posts are delayed.

The hybrid handles it: no fan-out at all for this account. The post is written once and merged at read time for anyone who follows them. The cost moves to the read path, where it is a single cached lookup shared by all readers.

### Round 2 — "Feed reads go to 450,000 per second."

- Feed lists move fully into Redis (sorted sets) with a database as the durable backing store.
- Post and profile hydration is served from a separate cache tier with very high hit rates, because the same popular posts are hydrated by millions of readers.
- Feed reads are shardable by `user_id` with no cross-shard work, so this scales horizontally cleanly. Say that — a design whose hot path is embarrassingly parallel by user is a good design.

### Round 3 — "What if Redis loses the feed lists?"

Feeds are derived data, which is the key property. Recovery options:

- Fall back to the pull path (query followed users directly) for affected users, degraded but functional, with a concurrency limit so the post store survives.
- Rebuild lists lazily on first request after a miss.
- Because feeds are rebuildable, they need no backup — only a documented and tested rebuild path with a known rate.

### Round 4 — "How do you go multi-region?"

Posts replicate globally. Feed lists are built per region for users homed in that region, so fan-out happens locally against a local follower-graph replica. A European user following an American celebrity reads that celebrity's cached posts from the local replica.

The consistency consequence: a post may appear in one region a second before another. That is acceptable for a feed, and you should say so explicitly rather than pretending it is synchronous.

### Round 5 — "The fan-out workers fall two hours behind."

- Alert on oldest-unprocessed-post age, not queue length.
- Shed selectively: prioritise fan-out for accounts with active followers, defer the long tail.
- Users whose feeds are stale fall back to the pull path for recent content, which is slower and correct.
- Add worker capacity, which is straightforward because workers are stateless and partitioned by author.""",
            ),
            (
                "Failure Modes",
                """- **Celebrity fan-out storm** blocking the queue for everyone.
- **Unbounded feed lists** consuming memory without limit.
- **N+1 hydration** making the read path slow despite a fast feed lookup.
- **Stale entries** for deleted posts and unfollowed authors, if there is no read-time filter.
- **Offset pagination** producing duplicates and gaps in a shifting feed.
- **Thundering herd on a viral post**, where one post id is hydrated millions of times per second — solved by local caching of hot posts.
- **Fan-out lag invisible** because monitoring watches queue depth rather than age.""",
            ),
            (
                "Trade-offs",
                """- **Push versus pull.** Fast reads and expensive writes, versus cheap writes and expensive reads. The hybrid takes the good half of each and costs you two code paths that must produce consistent results.
- **Precomputed feed versus freshness.** Capped precomputed lists are fast and slightly stale; a pull path is always fresh and slow.
- **Storing ids versus content in the feed.** Ids keep feeds small and require hydration; content avoids hydration and duplicates data 200 times and makes edits impossible to propagate.
- **Chronological versus ranked.** Chronological is simple and predictable; ranking improves engagement and adds a scoring service, a feature store, and a whole evaluation problem.
- **Feed as derived data.** Rebuildable means no backups and means a rebuild is a capacity event you must plan for.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Fan-out on write or read?"** — Hybrid, with the threshold and the reasoning behind it. Never one globally.
- **"What is the write amplification?"** — Do the arithmetic: posts per second × average followers. That number is the justification for everything else.
- **"A celebrity posts. Walk me through it."** — No fan-out, single write, read-time merge from a heavily cached entry.
- **"How do you paginate?"** — Cursor on `(timestamp, post_id)`, because the feed shifts under the reader.
- **"A post is deleted. How does it leave 5 million feeds?"** — It does not; it is filtered at hydration. Explain why that is cheaper.
- **"How do you rank without scoring everything?"** — Retrieval narrows to a candidate set, ranking orders it.
- **"What if the feed store is lost?"** — Derived data: fall back to pull, rebuild lazily, no backup required.""",
            ),
            (
                "Common Mistakes",
                """- Choosing one fan-out strategy for all users
- Not computing the write amplification number
- Storing full post content in every follower's feed
- Uncapped feed lists
- Offset pagination
- Ignoring deletes, blocks, and unfollows entirely
- Designing a ranking model instead of the retrieval and serving architecture""",
            ),
            (
                "Interview Tip",
                """Lead with the amplification arithmetic — "800 posts per second times 200 average followers is 170,000 feed writes per second" — because every subsequent decision follows from that number, and stating it early makes the hybrid design look inevitable rather than clever.""",
            ),
        ],
        [
            "Compute the write amplification first; it is the number that justifies the entire design.",
            "Use a hybrid: fan out on write for normal users, merge celebrity posts at read time.",
            "Store post ids in feeds and hydrate from cache, so edits and deletes are corrected in one place.",
            "Feeds are derived data — filter stale entries at read time and rebuild rather than back up.",
        ],
        [
            "Fan-out on write or on read, and why not one of them globally?",
            "What happens when an account with 100 million followers posts?",
            "How do you paginate a feed that changes while the user scrolls?",
            "A post is deleted. How does it disappear from millions of precomputed feeds?",
            "The feed store is wiped. How do you recover?",
        ],
    )


def _instagram() -> dict:
    return SD(
        "sd-instagram",
        "Design Instagram",
        "A media pipeline bolted onto a feed: uploads, derivatives, storage economics, and the write path for photos.",
        17,
        "**Interviewer:** \"Design Instagram — users upload photos, follow each other, and see a feed of photos from people they follow.\"",
        [
            (
                "Why It Matters",
                """Instagram looks like the news feed problem with pictures, and the feed half is indeed the same. The interesting and different half is the media pipeline: how bytes get in without touching your servers, how derivatives are produced, how storage cost is controlled, and how the metadata and the blobs stay consistent.

If you spend the whole interview on fan-out, you have answered the previous question rather than this one.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"Photos only, or video and stories too?"* — Scope it; video changes the pipeline substantially.
- *"What image sizes does the client need?"* — Thumbnail, feed, and full-screen at minimum, times device pixel ratios.
- *"Can posts be edited or deleted?"* — Deletion must remove every derivative and every cached copy, which is a real design item.
- *"Is the feed chronological or ranked?"* — Same question as the feed problem; agree and move on.
- *"Do we need direct messages, search, explore?"* — Out of scope.

**Agreed scope:** upload a photo with a caption, follow users, chronological feed with light ranking, likes and comment counts, and a profile grid.

**Non-functional:** upload feels instant even on mobile; feed images load in under 500 ms at p75 worldwide; a photo may take a few seconds to appear in followers' feeds; photos must never be lost.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 500M daily active users, 100M photos uploaded per day.
- Uploads: 100M / 100,000 s ≈ 1,000 per second average, ~3,000 peak.
- Original photo averages 3 MB: 300 TB per day of originals.
- Derivatives: five renditions averaging 600 KB total: another 60 TB per day.
- Feed reads: 500M users × 10 sessions × 20 photos = 100 billion image requests per day. At 200 KB per feed image that is **20 PB per day of egress** if served from origin.

**The conclusions:**

1. 20 PB of daily egress is not an origin workload. A CDN is not an optimisation here; it is the only viable architecture, and this number is why.
2. 360 TB of new storage per day is 130 PB per year. Storage tiering and rendition strategy are first-order cost decisions, not afterthoughts.
3. Metadata is small: 100M rows × 1 KB = 100 GB per day, 36 TB per year. Significant but ordinary.
4. 3,000 uploads per second of 3 MB each is 9 GB/s of ingest, which must not pass through the application tier.""",
            ),
            (
                "Step 3: API Design",
                """The upload is the interesting endpoint, and it is deliberately three calls.

1. `POST /v1/uploads` with `{content_type, size, checksum}` returns `{upload_id, upload_url, fields}` — a pre-signed, short-lived, size-limited URL scoped to one object key. A metadata row is created in state `pending`.
2. The client `PUT`s the bytes directly to object storage. Nothing passes through the API.
3. `POST /v1/posts` with `{upload_id, caption, location?}` returns `201 {post_id}`. The server verifies the object exists and matches the declared checksum, then creates the post in state `processing`.

Reads:

- `GET /v1/feed?cursor=` returns posts with a set of image URLs per rendition, each a signed CDN URL.
- `GET /v1/users/{id}/posts?cursor=` for the profile grid, which wants only thumbnails.

Returning one URL per rendition, rather than one URL the client resizes, keeps the client simple and lets the server change the rendition strategy without a client release.""",
            ),
            (
                "Step 4: Data Model",
                """**posts** — `post_id` (time-sortable), `author_id`, `caption`, `object_key`, `state`, `width`, `height`, `created_at`. Sharded by `author_id` so a profile grid is a single-shard read.

**media_renditions** — `post_id`, `variant`, `object_key`, `width`, `bytes`. Or, more compactly, derive rendition URLs from a naming convention so no row is needed at all — a good simplification worth mentioning.

**follows** — as in the feed problem, its own sharded service.

**feed** — capped list of `post_id` per user, in Redis, as in the feed problem.

**counters** — likes and comments per post, maintained separately from the post row so a viral post does not create a hot row.

The rule to state: **the database holds metadata, object storage holds bytes, and the post row is the source of truth for whether a photo exists.**""",
            ),
            (
                "Step 5: First Architecture",
                """Client → Pre-signed URL → Object storage → Event → Processing workers

Alongside:

Client → Load balancer → API → Metadata DB / Feed service / CDN URLs

The upload and the read path are almost entirely separate systems, which is worth drawing as two flows rather than one diagram.""",
            ),
            (
                "How It Works",
                """### The media pipeline

1. The client uploads the original directly to object storage.
2. Object storage emits an event. A worker picks it up.
3. The worker validates the image (real image, not a disguised payload, within dimension limits), strips EXIF (location data in photos is a genuine privacy issue and a good detail to mention), and generates renditions: thumbnail 150px, grid 320px, feed 1080px, full 2048px, plus modern formats such as WebP or AVIF alongside JPEG fallbacks.
4. Renditions are written to object storage under deterministic keys.
5. The post moves to `ready` and fan-out begins.
6. A moderation scan runs in parallel; a failure moves the post to `blocked` rather than deleting it.

Processing takes a few seconds. The client shows the photo optimistically using its local copy, so the user perceives an instant post — a product technique worth naming because it changes what the backend must guarantee.

### Reconciliation

Two stores must agree, and they will not always:

- **Object with no metadata** — an upload that was never completed. A sweeper deletes objects whose `pending` row is older than 24 hours, or that have no row at all.
- **Metadata with no object** — a post whose bytes are missing. A sweeper detects and flags these; they are rare and serious.
- **Deletion** — soft-delete the row immediately so it disappears from the product, then a background job removes all renditions and issues CDN purges. Hard-deleting synchronously races with in-flight readers and cannot be undone.

### Serving

Every image URL is a signed CDN URL with a long expiry for public content and a short one for private accounts. The CDN is the entire read tier: at a 98% offload ratio, origin egress falls from 20 PB to 400 TB per day, which is the difference between impossible and expensive.

Image format negotiation happens at the edge: serve AVIF to clients that accept it, WebP to others, JPEG as a fallback. This is roughly a 30% bandwidth reduction at equal quality, which at this scale is an enormous number.

### Storage economics

This is where the design gets genuinely interesting, and it is the part candidates skip.

- **Originals** are needed only to regenerate renditions. Move them to archive storage after 30 days; regenerating from archive is slow and almost never required.
- **Renditions for old posts** are rarely accessed. Viewing follows a steep recency curve — the overwhelming majority of views happen in the first week. Tier renditions to infrequent access after 30 days and to archive after a year, regenerating on demand for the rare old view.
- **Do not pre-generate every rendition.** Generate the two or three that are always needed, and produce the rest on first request, caching the result. For the long tail of photos nobody ever views at full size, this saves most of the derivative storage.

Stating this reduces the 130 PB per year figure substantially, and it is exactly the kind of reasoning that reads as staff-level.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "Uploads are slow on mobile networks in India."

- Multipart upload with per-part retry so a dropped connection resumes instead of restarting.
- Upload to the nearest edge endpoint rather than a distant region, with the object replicated onward.
- Client-side downscaling before upload — sending a 3 MB original when the largest rendition is 2048px wide is mostly waste. This is a client change with a large backend benefit, and noticing it is a good signal.

### Round 2 — "A photo goes viral: 500,000 requests per second for one image."

Entirely a CDN problem, and this is the easy case: the object is immutable and identical for everyone, so edge caching absorbs all of it. The origin sees one request per PoP. Contrast this with the feed's viral-post problem, which involves metadata and is harder.

### Round 3 — "Transcoding workers are backed up two hours during a peak event."

- Autoscale workers on queue age.
- Prioritise: generate the feed rendition first and everything else later, so the photo is usable within seconds even if full-size is delayed.
- Use spot capacity for the non-urgent renditions.
- Shed by deferring: the archive-quality rendition can wait a day.

### Round 4 — "How do you go multi-region?"

- Object storage replicated to the regions where the content is consumed, not everywhere — a photo posted in Brazil and viewed in Brazil should not be replicated to Asia.
- Metadata follows the feed design: home region per user, replicated reads elsewhere.
- The CDN makes most of this moot for reads; the cross-region question is really about where uploads land and how fast a photo becomes viewable in a distant region.

### Round 5 — "A user deletes their account. What happens?"

- All posts soft-deleted immediately; the profile disappears from the product at once.
- A background job removes originals and renditions, issues CDN purges, and removes entries from feed lists lazily at hydration.
- Backups still contain the data, which is a real compliance complication: your deletion policy must cover backup retention, and the usual answer is that backups expire on a defined schedule and deletion is completed when they do.
- Worth stating plainly, because it is the part of deletion designs that is usually hand-waved.""",
            ),
            (
                "Failure Modes",
                """- **Uploads through the API tier**, saturating memory and connections at 9 GB/s.
- **Orphaned objects and orphaned metadata**, without reconciliation sweeps.
- **Pre-generating every rendition**, multiplying storage cost for photos nobody views.
- **No lifecycle policy**, so storage grows without bound.
- **EXIF location data** left in served images — a privacy incident, not a bug.
- **CDN caching a private account's photos** with a long-lived public URL.
- **Deletion that removes the row but leaves the bytes**, which is a compliance problem rather than a storage one.""",
            ),
            (
                "Trade-offs",
                """- **Pre-generate versus generate on demand.** Predictable latency and high storage cost, versus a slow first request and much less storage. The right answer differs by rendition.
- **Original retention.** Keeping originals allows re-encoding with better codecs later; archiving them saves most of the storage bill.
- **Signed URLs versus proxying.** Signed URLs are efficient and leak-tolerant only for the expiry window; proxying gives exact authorisation and reintroduces the bandwidth problem.
- **Client-side resizing.** Saves upload bandwidth and puts trust in the client, so the server must still validate dimensions and content.
- **Feed strategy.** Identical trade-offs to the news feed problem; reference them rather than re-deriving them.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"How does a 3 MB photo get uploaded?"** — Pre-signed URL, direct to object storage, multipart for reliability, never through the API.
- **"What is the dominant cost?"** — Egress first, then storage. Give the numbers, then the levers: CDN offload, modern formats, tiering, and on-demand renditions.
- **"How do the database and object storage stay consistent?"** — The row is the source of truth, with reconciliation sweeps in both directions and soft delete to avoid races.
- **"How many renditions, and why?"** — Tie each to a real client surface, and say which are generated eagerly.
- **"A user makes their account private. What happens to previously public URLs?"** — Signed URLs with short expiry, plus a CDN purge. Long-lived public URLs cannot be recalled, which is why privacy-sensitive media should always be signed.
- **"How do you handle a photo that violates policy?"** — A state transition, not a delete, plus immediate CDN purge and feed filtering.""",
            ),
            (
                "Common Mistakes",
                """- Designing only the feed and ignoring the media pipeline
- Streaming uploads through application servers
- Storing images in the database
- Never computing the egress number, which is the number that decides the architecture
- No reconciliation between metadata and objects
- Forgetting that deletion must reach derivatives, caches, CDNs, and backups""",
            ),
            (
                "Interview Tip",
                """Compute the daily egress early and say it out loud. "100 billion image requests a day at 200 KB is 20 petabytes — that is a CDN problem, not a server problem" instantly establishes that you understand which half of this system is hard.""",
            ),
        ],
        [
            "The media pipeline, not the feed, is what makes this problem different — design the upload path first.",
            "Clients upload directly to object storage via pre-signed multipart URLs; the API only writes metadata.",
            "Egress dominates the cost: CDN offload, modern image formats, and on-demand renditions are the levers.",
            "Metadata and objects diverge in both directions; reconciliation sweeps and soft delete are mandatory.",
        ],
        [
            "How does a large photo get uploaded without touching your servers?",
            "What is the dominant infrastructure cost here and how would you halve it?",
            "How do the metadata store and object storage stay consistent?",
            "A user deletes a post. What has to happen, and where does it fail?",
        ],
    )


def _youtube() -> dict:
    return SD(
        "sd-video-streaming",
        "Design YouTube",
        "An asynchronous transcoding pipeline, adaptive bitrate playback, and a view-count problem that is harder than it looks.",
        18,
        "**Interviewer:** \"Design YouTube. Users upload videos, other users watch them. Handle the upload, the processing, and the playback.\"",
        [
            (
                "Why It Matters",
                """This problem is almost entirely about asynchronous pipelines and bandwidth economics, and it punishes anyone who treats video as a large file. The three things being tested are whether you keep bytes off the application tier, whether you understand that playback is a CDN and segment problem rather than a streaming-from-origin problem, and whether you can reason about the cost of transcoding and storage at scale.

The view counter is the sleeper question: it looks trivial and is a genuine write-throughput problem.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"Video on demand only, or live streaming too?"* — Live is a different system with a much tighter latency budget. Scope it out unless asked.
- *"What upload sizes and durations?"* — Up to several gigabytes and hours long, which forces resumable multipart uploads.
- *"Which resolutions must we support?"* — Determines the rendition ladder and therefore transcoding cost and storage.
- *"Do we need recommendations and search?"* — Mention them and set them aside; they are separate systems.
- *"Comments, likes, view counts?"* — Take view counts; they are the interesting one.
- *"Any DRM or access control?"* — Signed URLs at minimum; DRM changes the packaging step.

**Agreed scope:** upload, transcode, play back with adaptive bitrate worldwide, view counts. Recommendations, comments, monetisation, and live out of scope.

**Non-functional:** playback starts in under 2 seconds at p99 globally; a video is watchable within minutes of upload; uploads must survive a dropped connection; view counts may lag by a minute.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 2M uploads per day, averaging 10 minutes: about 23 uploads per second.
- Original file averages 1 GB: 2 PB of new originals per day.
- Five renditions (240p to 1080p) at roughly 0.6x the original in total: about 1.2 PB per day of derivatives.
- 5B views per day: about 58,000 views per second average, ~150,000 peak.
- Average watch 6 minutes at an average 2 Mbps: 90 MB per view. 5B × 90 MB ≈ **450 PB of egress per day**, roughly 40 Tbps sustained.

**The conclusions:**

1. 40 Tbps is not something you serve from an origin. This is a CDN problem, full stop, and the number is the argument.
2. Transcoding 2M videos a day is a very large compute fleet, and it is interruptible work — spot capacity, checkpointed per segment.
3. Storage grows at over 1 PB per day of renditions. Tiering by popularity is mandatory: the view distribution is extremely skewed, and most uploads are watched almost never.
4. 150,000 view events per second is a write-throughput problem that must not touch a row per view.""",
            ),
            (
                "Step 3: API Design",
                """- `POST /v1/videos` with `{title, description, size, content_type}` returns `{video_id, upload_id, part_urls[]}` — a multipart upload initialised with pre-signed part URLs.
- The client uploads parts directly to object storage, retrying individual parts.
- `POST /v1/videos/{id}/complete` finalises the multipart upload and moves the video to `processing`.
- `GET /v1/videos/{id}` returns metadata plus a `manifest_url` once ready, or a processing status.
- `GET /v1/videos/{id}/manifest.m3u8` — usually a CDN URL, signed, listing available bitrates.
- `POST /v1/videos/{id}/views` — or better, a batched telemetry endpoint, because a per-view API call at 150,000 per second is its own problem.

Note the state machine in the responses: `uploading → processing → ready | failed`. Exposing it is what lets the client show a progress bar instead of a spinner.""",
            ),
            (
                "Step 4: Data Model",
                """**videos** — `video_id`, `channel_id`, `title`, `description`, `duration`, `state`, `created_at`, `visibility`. Relational; a few billion rows, partitioned by creation time.

**renditions** — `video_id`, `resolution`, `codec`, `bitrate`, `manifest_key`, `segment_prefix`, `bytes`.

**view_counts** — `video_id`, `count`, `updated_at`. Updated in aggregate, never per view.

**watch_events** — an append-only stream, not a table: `(video_id, user_id, position, timestamp)` into a log for analytics, recommendations, and monetisation.

Object storage holds the original, the segments, the manifests, and the thumbnails. The database never holds a byte of video.""",
            ),
            (
                "Step 5: First Architecture",
                """Two flows, drawn separately.

**Upload and processing:**

Client → Pre-signed multipart → Object storage → Queue → Transcoding workers → Object storage

**Playback:**

Client → API (metadata + signed manifest URL) → CDN → Segments

The critical property to state: the video bytes never pass through your application tier in either direction. Your API serves JSON and URLs.""",
            ),
            (
                "How It Works",
                """### The transcoding pipeline

1. The completed upload emits an event.
2. A coordinator splits the video into chunks — typically by GOP boundaries, a few seconds each — and enqueues one job per chunk per rendition. A 10-minute video at five renditions becomes hundreds of small jobs.
3. Workers transcode chunks in parallel. This is the key trick: parallelising by chunk turns a serial 20-minute transcode into a two-minute one, and makes each unit of work small enough to run on interruptible capacity.
4. Chunks are reassembled into segments per rendition, packaged into HLS or DASH, and written to object storage with a manifest.
5. Thumbnails, preview sprites, and audio tracks are produced alongside.
6. The video moves to `ready` and becomes playable.

Failure handling: a failed chunk is retried individually rather than restarting the whole video. Idempotency is by `(video_id, chunk_index, rendition)`, so duplicate execution is harmless and a worker dying mid-chunk costs seconds.

### Adaptive bitrate

The manifest lists renditions. The player measures throughput and buffer level and requests the next segment at an appropriate bitrate, switching mid-stream at segment boundaries. Consequences worth naming:

- Segments are just immutable HTTP objects, so the entire playback path is ordinary CDN caching.
- Startup is fast because the player begins at a low bitrate and steps up.
- The server does no per-viewer work at all — there is no "streaming server", which is the insight candidates most often miss.

### View counting

150,000 events per second, and a naive `UPDATE videos SET views = views + 1` is impossible: it is a write per view, and for a popular video it is a single hot row with enormous contention.

The pipeline:

1. Client sends a view event (batched, with the watch position, so you can also count "meaningful" views rather than page loads).
2. Events go to a log, partitioned by `video_id`.
3. A stream processor aggregates per video in windows of a few seconds.
4. Aggregates are flushed to the counter store — a Redis counter for the live figure, periodically persisted.
5. The displayed count is the cached aggregate, seconds stale, which nobody can detect.

Two refinements to mention: **deduplication** (one user refreshing 50 times is not 50 views, so define a view and dedupe within a window), and **fraud detection** (view counts are monetised, so they attract abuse — which is why the authoritative count is computed in a batch pipeline with fraud filtering, separate from the fast approximate display count). The existence of two different counts, fast-and-approximate and slow-and-authoritative, is the mature answer.

### Storage tiering by popularity

Views follow an extreme power law. Most uploads receive almost no views; a tiny fraction receive almost all of them.

- Hot videos: all renditions on standard storage, widely cached at the edge.
- Warm: standard storage, less edge presence.
- Cold: high renditions moved to archive; if someone requests 1080p for a video nobody has watched in a year, regenerate from the original with a short delay, or serve a lower rendition.
- Very cold: consider keeping only the original plus one low rendition.

This is the single largest cost lever in the system after the CDN, and proposing it unprompted is a strong signal.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A video goes viral: 2 million concurrent viewers."

The CDN handles it, because every viewer requests the same immutable segments. The first request per PoP per segment goes to the shield, and one request per segment reaches the origin globally. The origin load for a viral video is approximately the same as for an unpopular one — which is a genuinely elegant property of segment-based delivery, and worth pointing out.

What does need attention: the metadata endpoint, the view-count write path, and comments, all of which are per-viewer. Those need the caching and counter treatment described above.

### Round 2 — "Transcoding is backed up six hours after a big event."

- Prioritise: transcode the 480p rendition first so the video becomes watchable, and produce higher renditions after. Time-to-watchable is the metric users feel.
- Autoscale on queue age; use spot capacity aggressively since chunk jobs are small and idempotent.
- Prioritise by channel size — a large channel's upload has millions of people waiting; an unknown upload does not.
- Shed: defer the least-watched renditions entirely for low-view-probability uploads and generate them on first request.

### Round 3 — "Playback start time is 4 seconds in Southeast Asia."

- Check CDN presence and offload ratio in the region first; a cold edge means a long first fetch from a distant shield.
- Reduce the initial segment size and start at a lower bitrate so playback begins sooner.
- Pre-position popular content into regional caches rather than waiting for the first viewer to pull it.
- Verify the manifest itself is cached at the edge — a manifest fetched from the origin adds a full round trip before any video byte is requested.

### Round 4 — "How do you support live streaming?"

A different pipeline and worth acknowledging rather than pretending it is the same: ingest via RTMP or SRT, transcode in near-real-time with a few seconds of latency, produce short segments (1–2 s), and accept that the CDN caching window is now seconds rather than forever. Latency and cost both rise sharply. For ultra-low latency you need chunked transfer or WebRTC, which bypasses conventional CDN caching and costs far more per viewer.

### Round 5 — "Reduce the bill by 40%."

In order of impact: adopt a more efficient codec for the most-watched content (30–50% bitrate reduction at equal quality, paid for in transcoding compute); tune the rendition ladder per content type; tier storage by popularity; raise the CDN offload ratio; and move transcoding to spot capacity. Note that the first item changes what bytes exist, which is always a bigger lever than changing how they are served.""",
            ),
            (
                "Failure Modes",
                """- **Bytes through the application tier**, on upload or playback.
- **Serial transcoding** of whole files, so a long video takes hours and cannot use interruptible capacity.
- **Per-view database writes**, creating a hot row on popular videos.
- **Uncached manifests**, adding a round trip before playback.
- **Pre-generating every rendition** for videos nobody watches.
- **No lifecycle policy**, so storage grows at over a petabyte a day forever.
- **Transcode failures with no per-chunk retry**, so one bad chunk fails an entire video.""",
            ),
            (
                "Trade-offs",
                """- **Number of renditions.** More renditions mean better adaptation on poor networks and more transcoding compute and storage.
- **Transcode on upload versus on demand.** Predictable playback versus large savings for the long tail, at the cost of a slow first view.
- **Codec efficiency versus compatibility.** Newer codecs cut bandwidth substantially and need fallbacks for older devices, which means transcoding twice.
- **Segment length.** Short segments adapt faster and start quicker, and produce more requests and more overhead.
- **Approximate versus authoritative view counts.** Fast and cheap and imprecise, versus slow, correct, and necessary for monetisation. Having both is the answer.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What happens after the upload completes?"** — Event, chunked parallel transcode, packaging, manifest, state change. Emphasise parallelism by chunk.
- **"How does playback actually work?"** — Manifest plus immutable segments over HTTP from a CDN, with the client choosing the bitrate. There is no streaming server.
- **"How do you count views at 150,000 per second?"** — Event stream, windowed aggregation, cached counter, with a separate authoritative batch pipeline for monetisation.
- **"A video gets 2 million concurrent viewers. What breaks?"** — Not the segments. The metadata, counter, and comment paths.
- **"What is your biggest cost, and how would you cut it?"** — Egress, then storage. Codec, ladder, tiering, offload.
- **"What if transcoding fails halfway?"** — Per-chunk retry with idempotent keys; the video stays in `processing` and only fails after repeated chunk failures.""",
            ),
            (
                "Common Mistakes",
                """- Describing a "streaming server" rather than segments on a CDN
- Transcoding synchronously in the upload request
- One write per view
- Ignoring the egress number, which is the number that defines the problem
- Treating all videos as equally worth storing at full rendition
- Forgetting that the manifest itself must be cached""",
            ),
            (
                "Interview Tip",
                """Say early that playback is a CDN-and-segments problem with no per-viewer server work, and give the egress arithmetic that proves it. Then spend your depth on the transcoding pipeline and view counting, which are the two places where there is real engineering to discuss.""",
            ),
        ],
        [
            "Compute the egress: hundreds of petabytes a day makes the CDN the architecture, not an optimisation.",
            "Transcode by chunk in parallel, idempotently, on interruptible capacity — never serially in the request.",
            "Playback is immutable segments plus a manifest over HTTP; there is no per-viewer streaming server.",
            "Count views through an event stream with windowed aggregation, and keep a separate authoritative pipeline for money.",
        ],
        [
            "Walk me through what happens between upload completing and the video being watchable.",
            "How does adaptive bitrate playback work, and what does the server do during playback?",
            "How do you count views at 150,000 events per second?",
            "What is the dominant cost and how would you reduce it by 40%?",
        ],
    )


def _netflix() -> dict:
    return SD(
        "sd-netflix",
        "Design Netflix",
        "A fixed catalogue changes everything: pre-encoding, edge placement, offline downloads, and playback that must never stutter.",
        15,
        "**Interviewer:** \"Design a subscription video streaming service like Netflix. Assume a professionally produced catalogue rather than user uploads.\"",
        [
            (
                "Why It Matters",
                """It is tempting to answer this with the YouTube design. The differences are what the interviewer is looking for, and they are substantial: the catalogue is small, fixed, and known in advance, which means you can pre-encode exhaustively, pre-position content at the edge before anyone requests it, and optimise per title rather than per upload.

It also introduces two features that do not exist in a UGC product: offline downloads with DRM, and a playback experience where a single rebuffer is a serious quality problem rather than an annoyance.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"How large is the catalogue?"* — Thousands to tens of thousands of titles, not billions. This single fact changes the architecture.
- *"Is content added continuously or in scheduled releases?"* — Scheduled releases mean predictable traffic spikes you can prepare for, which is a luxury.
- *"Do we need offline downloads?"* — Yes, and that means DRM and licence management.
- *"Multiple profiles per account, resume across devices?"* — Yes; playback position is a small but interesting write-heavy service.
- *"Recommendations?"* — Acknowledge and scope out, or discuss briefly at the end.

**Agreed scope:** browse a catalogue, play a title with adaptive bitrate anywhere in the world, resume where you left off across devices, download for offline viewing, and enforce subscription entitlement.

**Non-functional:** playback starts in under 1 second at p95; rebuffering ratio below 0.5%; the service must survive a regional outage; content must not be trivially copyable.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 250M subscribers, 100M daily viewers, averaging 2 hours per day.
- Concurrent peak: with viewing concentrated in evening hours, roughly 8–10% of daily viewers are watching at peak, so about 10M concurrent streams.
- Average bitrate 4 Mbps: 10M × 4 Mbps = **40 Tbps at peak**.
- Catalogue: 20,000 titles averaging 90 minutes, encoded in roughly 12 renditions plus multiple audio and subtitle tracks: perhaps 5–15 TB per title across all variants, so a few hundred petabytes of catalogue.
- Playback position writes: 10M concurrent streams checkpointing every 30 seconds is about 330,000 writes per second.

**The conclusions:**

1. 40 Tbps at peak is the same egress problem as YouTube, but with a decisive advantage: the catalogue is known, so content can be placed at the edge *before* it is requested.
2. A few hundred petabytes of catalogue is large but finite and static, which makes aggressive per-title encoding optimisation worthwhile in a way it never is for UGC.
3. 330,000 playback-position writes per second is a real workload and the most interesting non-video part of the system.""",
            ),
            (
                "Step 3: API Design",
                """- `GET /v1/catalogue?profile_id=&row=` returns the personalised home rows — heavily cached per segment, not per user.
- `GET /v1/titles/{id}` returns metadata plus artwork URLs.
- `POST /v1/playback/start` with `{title_id, device_id, profile_id}` returns `{manifest_url, licence_url, session_id, start_position}`. This is the entitlement checkpoint: subscription status, concurrent stream limit, and geographic licensing are all enforced here.
- `POST /v1/playback/heartbeat` with `{session_id, position, quality_metrics}` — batched, best-effort.
- `POST /v1/downloads` with `{title_id, quality}` returns download URLs and a licence with an expiry.

The design decision to highlight: entitlement is checked once at playback start and encoded into a short-lived signed manifest URL, rather than on every segment request. Checking entitlement 10 million times per second on segment fetches would be absurd; checking it once per session is correct and bounded.""",
            ),
            (
                "Step 4: Data Model",
                """**titles** — metadata, small, fully cacheable, replicated everywhere. This is reference data and should be treated as such.

**encodes** — `title_id`, `rendition`, `codec`, `bitrate`, `drm_scheme`, `object_key`.

**entitlements** — account, plan, region, concurrent-stream allowance.

**playback_position** — `(profile_id, title_id) → position, updated_at, device`. This is the write-heavy one: a key-value workload with a tiny value, high write rate, and no need for transactions. Wrong store: the relational catalogue database. Right store: a key-value store, written last-write-wins, with a cache in front.

**availability** — `title_id`, `region`, `start_date`, `end_date`. Content licensing is regional and time-bounded, which is a genuine business rule that shapes the catalogue API and is worth mentioning because it is specific to this domain.""",
            ),
            (
                "Step 5: First Architecture",
                """Client → API (entitlement, catalogue, session) → Signed manifest → CDN / edge caches → Segments

Alongside, an offline pipeline that encodes each title once, exhaustively, and distributes it to edge locations ahead of demand.

The two halves are: a modest request-serving system, and an enormous but largely static content distribution system that is mostly prepared in advance.""",
            ),
            (
                "How It Works",
                """### Pre-encoding, done properly

With a fixed catalogue you can afford per-title optimisation that is impossible for UGC:

- **Per-title encoding ladders.** An animated film compresses far better than a dark, grainy action sequence. Choosing bitrates per title rather than using a fixed ladder saves a large fraction of bandwidth at identical quality.
- **Per-shot or per-scene encoding** takes this further, varying bitrate within a title.
- **Multiple codecs** for device compatibility and efficiency, all generated once and stored forever.
- Encoding cost is a one-off per title and is amortised over hundreds of millions of views, so it is worth spending heavily on. This inversion — compute is cheap relative to bandwidth because the content is watched so many times — is the central economic insight, and stating it is the strongest thing you can say in this problem.

### Edge placement

Because the catalogue is known and demand is predictable, content is pushed to edge caches proactively:

- Popularity is predicted from release schedules, historical patterns, and region.
- New releases are pre-positioned to every relevant edge before launch, so the first viewer does not pay a cold-miss penalty.
- Caches are filled during off-peak hours, using bandwidth that would otherwise be idle.
- Very popular content sits in caches physically inside ISP networks, so the traffic never crosses the public internet at all.

This is the decisive difference from YouTube, where content popularity is unknown at upload time and caches fill reactively.

### Playback resilience

A rebuffer is the quality metric that matters, so playback is defensive:

- The client buffers aggressively — tens of seconds ahead.
- The manifest lists multiple CDN sources; the client can switch sources mid-stream if throughput degrades, which makes a single CDN's problem invisible.
- Quality metrics are reported continuously and used to steer future clients away from underperforming paths.
- Startup begins at a conservative bitrate and steps up once throughput is measured.

Multi-CDN steering is worth naming: it turns CDN outages and regional congestion from incidents into automatic degradations.

### Offline downloads and DRM

- Content is encrypted at rest in a DRM scheme; the client obtains a licence containing the decryption key and a policy (expiry, device binding, output restrictions).
- Licences are time-limited and renewed when online, which is how expiry is enforced on a device that is offline.
- Downloads are just the same segments fetched ahead of time, so no separate distribution path is needed.
- Licence issuance is a small, high-availability service; if it is down, existing licences keep working and new playback fails, which is the right degradation.

### Playback position

330,000 writes per second of a tiny value. The design:

- Client checkpoints every 30 seconds, and on pause and stop.
- Writes go to a key-value store with last-write-wins, keyed by `(profile_id, title_id)`.
- A write-behind cache absorbs the rate: update Redis immediately, flush to durable storage periodically. Losing 30 seconds of position on a cache failure is entirely acceptable, which makes this one of the rare legitimate uses of write-behind caching.
- Cross-device resume works because the position is read at playback start from a globally replicated store — and because the value is tiny, replication is cheap.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A tentpole release drops at midnight and 30 million people press play within an hour."

Almost everything is prepared: content is already at the edge, encodes are done, and segments are immutable.

What is not prepared and must be:

- The entitlement and session-start service sees a spike of hundreds of thousands of requests per second. Pre-scale it on the release schedule — you know the date, which is a luxury most systems do not have.
- Licence issuance spikes identically.
- The catalogue and home-page service spikes.

So the answer is: pre-scale on a known schedule, load-test against the expected curve, and have a queue-and-degrade plan for the session-start path. Say that predictability is the advantage and you should exploit it.

### Round 2 — "A CDN provider has a regional outage."

Multi-CDN steering. Clients holding a manifest with alternate sources switch mid-stream; new sessions are steered away at manifest generation. Viewers see, at worst, a brief quality reduction. This is the payoff for the multi-CDN complexity, and it is why large streaming services accept that complexity.

### Round 3 — "How do you enforce the concurrent stream limit?"

A counter per account, incremented at session start and decremented at session end — except sessions do not end cleanly: apps crash, devices sleep, networks drop.

So: sessions have a lease, renewed by heartbeats, and expire after a few minutes of silence. The count is the number of unexpired leases. The trade-off is honest and worth stating: a user who force-quits occupies a slot for a few minutes. Making the lease shorter reduces that and risks ending sessions for viewers on flaky connections. This is a good example of a user-visible product decision hiding inside a technical mechanism.

### Round 4 — "How do you handle regional licensing?"

Availability is per title, per region, per date range. The catalogue API filters by the viewer's region, determined at the edge. Playback start re-checks, because a VPN can make browsing and playing disagree. This is a business rule that must be enforced at the point of entitlement rather than at the point of browsing.

### Round 5 — "Cut bandwidth cost by 30%."

- Better codecs on the most-watched titles first, since viewing is extremely concentrated.
- Per-title and per-shot encoding refinement.
- Cap the maximum bitrate on devices where the difference is imperceptible — mobile screens do not need the top rendition.
- Push more content into ISP-embedded caches, which reduces transit cost.
- None of these change the architecture; all of them change what bytes travel. That is where the money is.""",
            ),
            (
                "Failure Modes",
                """- **Cold edge caches at launch**, producing a stampede to the origin exactly at the moment of peak attention.
- **Entitlement checked per segment**, creating an impossible request rate.
- **Session leases that never expire**, so users are locked out by phantom streams.
- **Single CDN dependency**, converting a provider incident into an outage.
- **Playback position writes on the relational database**, saturating it.
- **Licence service as a hard dependency for already-playing sessions**, rather than only for new ones.""",
            ),
            (
                "Trade-offs",
                """- **Pre-encoding everything versus storage.** A fixed catalogue makes exhaustive encoding worthwhile; the storage bill is the price of the bandwidth saving.
- **Aggressive client buffering versus wasted bandwidth.** Large buffers prevent rebuffering and waste data when viewers abandon quickly.
- **Multi-CDN versus complexity.** Resilience and performance, against configuration, measurement, and purging across providers.
- **Strict concurrency enforcement versus user experience.** Short leases inconvenience honest users; long leases permit sharing.
- **DRM versus openness.** Required by content owners, and it costs device compatibility work and adds a licence service to the critical path.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"How is this different from YouTube?"** — Known, fixed catalogue: pre-encode exhaustively, pre-position at the edge, optimise per title. UGC can do none of those.
- **"How do you get sub-second playback start?"** — Content already at a nearby edge, manifest cached, low initial bitrate, and entitlement resolved in one call rather than per segment.
- **"What happens when a CDN fails?"** — Multi-CDN with client-side switching and steering at manifest generation.
- **"How do offline downloads work?"** — Same segments, encrypted, with a time-limited DRM licence renewed when online.
- **"Where do you store playback position, and why not the main database?"** — Key-value with write-behind; 330,000 small writes per second with no transactional requirement is the wrong shape for a relational primary.
- **"How do you prepare for a known launch?"** — Pre-position content, pre-scale the session and licence paths, load-test the curve. Predictability is an asset; use it.""",
            ),
            (
                "Common Mistakes",
                """- Reproducing the YouTube answer without identifying what a fixed catalogue changes
- Checking entitlement on every segment request
- Ignoring DRM and offline entirely
- Putting playback position in the relational catalogue database
- Assuming a single CDN
- Missing that encoding compute is cheap relative to lifetime bandwidth, which justifies heavy per-title optimisation""",
            ),
            (
                "Interview Tip",
                """Open by naming the difference: "The catalogue is fixed and known, so unlike a UGC platform I can pre-encode exhaustively and pre-position content at the edge before anyone asks for it." That one sentence shows you are answering this question rather than reciting the previous one.""",
            ),
        ],
        [
            "A fixed catalogue lets you pre-encode per title and pre-position content at the edge before demand arrives.",
            "Encoding compute is cheap relative to lifetime bandwidth, which justifies heavy per-title optimisation.",
            "Check entitlement once at session start and encode it into a signed manifest, never per segment.",
            "Multi-CDN steering with client-side switching turns a provider outage into a quality dip.",
        ],
        [
            "What changes when the catalogue is fixed and known in advance?",
            "How do you achieve sub-second playback start worldwide?",
            "How do offline downloads and DRM licences work together?",
            "How do you enforce a concurrent stream limit when sessions do not end cleanly?",
        ],
    )


def _chat_system() -> dict:
    return SD(
        "sd-chat-system",
        "Design WhatsApp (Chat System)",
        "Connection gateways, message ordering, delivery receipts, offline sync, and group fan-out.",
        18,
        "**Interviewer:** \"Design a messaging app like WhatsApp. One-to-one chat first, then groups. Messages must arrive quickly and must not be lost.\"",
        [
            (
                "Why It Matters",
                """Chat is the canonical stateful-connection problem, and it punishes two common errors: treating the WebSocket as the source of truth, and treating group messaging as one-to-one repeated.

It also has an unusually strict correctness requirement. A dropped photo in a feed is a nuisance; a message that never arrives is a product failure. That forces you to separate durability (the message is stored) from delivery (the message reached a device), which is the central insight.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"One-to-one, groups, or both? How large can a group be?"* — 10 members and 100,000 members are different systems.
- *"Do we need delivery and read receipts?"* — Yes, and per-recipient read state in a group is a real data-volume question.
- *"Is history stored on the server or only on devices?"* — This is the biggest scoping question. Server-stored history means petabytes; device-stored means the server is a relay with a short retention.
- *"End-to-end encryption?"* — It rules out server-side search and server-side fan-out of content, so it must be decided early.
- *"Multiple devices per user?"* — Yes, and it complicates delivery and read state considerably.
- *"Media in messages?"* — Object storage, referenced by the message.

**Agreed scope:** 1:1 and group chat up to 500 members, text and media, delivery and read receipts, multi-device, server-stored history with a defined retention, presence and typing indicators. End-to-end encryption discussed but not fully designed.

**Non-functional:** message delivered to an online recipient in under 500 ms at p99; an accepted message is never lost; ordering within a conversation is consistent for all participants; the system supports tens of millions of concurrent connections.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 2B users, 500M daily active.
- 100B messages per day: about 1M messages per second average, 3M at peak.
- Concurrent connections: perhaps 20% of daily users online at peak, so 100M concurrent WebSockets.
- Message size averaging 200 bytes of text: 100B × 200 B = 20 TB per day of message payload, 7 PB per year before replication.
- Group fan-out: a 200-member group message is one write and 200 deliveries.

**The conclusions:**

1. 100M concurrent connections at 50 KB of memory each is 5 TB of RAM across the gateway fleet — at 250,000 connections per node that is 400 nodes purely to hold sockets. Connections are a capacity line item in their own right.
2. 1M messages per second of small writes is a wide-column or log-structured workload, not a relational one.
3. 7 PB per year forces a retention decision, and it is a product question as much as a technical one.
4. Fan-out is the cost driver in groups, exactly as in the news feed, but with a delivery guarantee attached.""",
            ),
            (
                "Step 3: API Design",
                """A WebSocket for the live path and HTTP for everything else. Being explicit about which is which is part of the answer.

**Over the socket:**

- `send` — `{client_message_id, conversation_id, body, media_ref?}`. The client-generated id is the idempotency key: a resend after a network blip must not create a second message.
- `ack` — server confirms persistence and returns the authoritative `message_id` and sequence number.
- `deliver` — server pushes a message to a connected device.
- `receipt` — delivered and read notifications.
- `typing`, `presence` — ephemeral, best-effort, never persisted.

**Over HTTP:**

- `GET /v1/conversations/{id}/messages?after_seq=&limit=` — history and catch-up after reconnect.
- `GET /v1/conversations?updated_after=` — the conversation list with unread counts.
- `POST /v1/media` — pre-signed upload, as in the media designs.

The key architectural statement: **the socket is a delivery optimisation; the HTTP catch-up endpoint is the correctness mechanism.** A client that has been offline reconnects and pulls everything after its last acknowledged sequence number. Nothing depends on the socket having stayed up.""",
            ),
            (
                "Step 4: Data Model",
                """**messages** — partition key `conversation_id`, clustering key `seq` descending. Columns: `message_id`, `sender_id`, `body`, `media_ref`, `created_at`. Append-only, never updated except for deletion tombstones.

This shape is chosen deliberately: the only read is "the most recent N messages in this conversation", which is a single-partition range scan — the cheapest possible query.

**conversations** — `conversation_id`, `type`, `created_at`, and for groups a separate membership table.

**members** — `(conversation_id, user_id, joined_at, last_read_seq, muted)`.

**user_inbox** — `(user_id, conversation_id) → last_message_seq, unread_count`. This is what powers the conversation list, and it is updated on every message.

**devices** — `(user_id, device_id, last_delivered_seq, push_token)`.

Two modelling decisions worth defending:

- **Unread is a pointer, not rows.** Storing one row per unread message per recipient is 100 billion rows a day. Storing `last_read_seq` per member makes unread count a subtraction. This is the single most important data-modelling decision in the problem.
- **Sequence numbers per conversation**, assigned by the server, give a total order within the conversation without needing synchronised clocks. Ordering across conversations does not matter.""",
            ),
            (
                "Step 5: First Architecture",
                """Client → Edge → Gateway (holds sockets) → Message service → Message store

Plus:

Message service → Pub/Sub → Gateways holding recipient sockets

And:

Message service → Push notification service (for offline devices)

The gateway tier holds connections and nothing else. A registry in Redis maps `user_id → {device_id: gateway_id}`. Business logic lives in stateless services behind it.""",
            ),
            (
                "How It Works",
                """### Sending a message, step by step

1. The client sends over its socket with a `client_message_id`.
2. The gateway forwards to the message service.
3. The message service deduplicates on `(sender_id, client_message_id)`, assigns the next `seq` for the conversation, and **persists the message**.
4. Only after persistence does it `ack` to the sender. The sender's single tick appears here.
5. It looks up conversation members, and for each member's devices consults the registry.
6. For connected devices, it publishes to the owning gateway's channel; the gateway writes to the socket.
7. For disconnected devices, it enqueues a push notification.
8. Delivery receipts flow back the same way and update `last_delivered_seq`; read receipts update `last_read_seq`.

The ordering of steps 3 and 4 is the whole design: **persist, then acknowledge, then deliver.** A system that acknowledges before persisting can lose an accepted message, which is the one failure this product cannot have.

### Sequence numbers and ordering

Assigning `seq` per conversation requires a single point of ordering per conversation. Options:

- Route all writes for a conversation to one shard and let the store's atomic counter or conditional write assign it.
- Use a per-conversation lease held by one message-service instance.

Both make ordering a partitioned problem rather than a global one, which is what makes it tractable. Ordering across different conversations is not defined and does not need to be — say that, because candidates often try to build a global order they do not need.

### Reconnection and catch-up

Mobile networks drop constantly. The flow:

1. The client reconnects with exponential backoff plus jitter.
2. It authenticates and registers in the gateway registry.
3. It sends `last_seq` per conversation, or a single watermark.
4. The server returns everything after that over HTTP, paginated.
5. Only then does the live socket matter again.

Because of this, a gateway crash costs a reconnect and nothing else. State that explicitly — it is what makes the stateful tier safe.

### Group messages

A 500-member group message is one write and up to 1,500 device deliveries (three devices each). The message is stored once in the conversation partition; delivery is fan-out.

At very large group sizes, three things change:

- Fan-out cost per message becomes significant, so delivery is batched per gateway rather than per device.
- Read receipts become quadratic: 500 members each reading generates 500 receipts, each of which would notify 500 members. Real products stop showing per-member read state above a threshold, which is a product decision forced by data volume — a good thing to point out.
- Very large groups (broadcast channels) switch from push to pull: members fetch on open rather than receiving pushes, because pushing to 100,000 devices per message is a different system.

### Presence and typing

Deliberately cheap and deliberately approximate: a heartbeat writes a key with a 30-second TTL. Typing indicators are published to the conversation channel and never stored. If either is lost, nothing breaks. Say that you would not spend correctness budget here.

### End-to-end encryption

If in scope: the server stores ciphertext and routes it, and cannot read content. Consequences to name — no server-side search, no server-side link previews, no content-based moderation, and multi-device requires per-device key exchange and re-encryption of each message per recipient device. Group messaging with E2EE fans out one ciphertext per recipient device rather than one message to many, which multiplies the payload volume.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A gateway node holding 250,000 connections dies."

All 250,000 clients detect the disconnect and reconnect. Without jitter they reconnect simultaneously and knock over the next gateway — the thundering herd. So: client backoff with jitter, a connection-rate limiter at the edge, and staggered gateway restarts during deploys.

No messages are lost, because the socket was never the source of truth. Reconnecting clients catch up by sequence number.

### Round 2 — "Traffic is 10x: 10 million messages per second."

- The message store is already partitioned by `conversation_id`, which is a naturally uniform key, so it scales horizontally.
- Gateways scale with connections, independently.
- The registry (`user_id → gateway`) becomes a hot component: 100M+ entries with frequent updates. It must be sharded and is a natural fit for a partitioned in-memory store.
- Fan-out becomes the cost: batch deliveries destined for the same gateway into one message rather than one per device.

### Round 3 — "What happens if the pub/sub layer fails?"

Live delivery stops; persistence continues. Clients stop receiving pushes and, after a heartbeat timeout, fall back to polling the catch-up endpoint. The product degrades from real-time to a few seconds of latency — which is exactly the right degradation and is only possible because catch-up exists as a first-class path.

### Round 4 — "How do you support multiple regions?"

- Users are homed to a region; their conversations live there.
- A conversation between users in different regions must have a home. Pick one — typically the creator's — and accept higher latency for the other participant, or replicate the conversation partition to both with a single write region.
- Gateways are everywhere; a user connects locally and their gateway forwards to the conversation's home region.
- The registry must be reachable cross-region, or each region keeps its own and routing falls back to a directory lookup.

Say the trade-off plainly: cross-region conversations pay a round trip on send, and the alternative — accepting writes in both regions — reintroduces ordering conflicts that the sequence-number design exists to avoid.

### Round 5 — "Retention: 7 PB a year and growing."

- Define a retention policy — a product decision. Many messaging products keep history on devices and only a short server-side window for undelivered messages, which reduces server storage by orders of magnitude.
- If history is server-side, partition by time and tier old partitions to cheap storage, accepting slower access for old conversations.
- Media dominates the bytes and should be tiered separately and aggressively.""",
            ),
            (
                "Failure Modes",
                """- **Acknowledging before persisting**, losing accepted messages on a crash.
- **Treating the socket as the transport of record**, so a disconnect loses messages.
- **Reconnect storms** without jitter after a gateway loss or deploy.
- **A row per unread message**, producing an unmanageable write volume.
- **Global ordering attempts** across conversations, creating a bottleneck for no product benefit.
- **Duplicate delivery across devices** when the registry maps a user to one connection rather than a set.
- **Stale registry entries** pointing at dead gateways, causing silent delivery failures — so publishes must be acknowledged and fall back to push notifications.
- **Read receipts in very large groups** producing quadratic traffic.""",
            ),
            (
                "Trade-offs",
                """- **WebSocket versus polling.** Real-time delivery and a stateful tier, versus simplicity and latency. Chat genuinely needs the socket, and it is worth saying that most other features do not.
- **Server-stored history versus device-only.** Multi-device convenience and search, against petabytes of storage and a privacy surface.
- **End-to-end encryption.** Strong privacy, at the cost of server-side search, previews, moderation, and much more complex multi-device delivery.
- **Per-message read state versus a read pointer.** Precise receipts, against a write per recipient per message.
- **Push to all devices versus pull on open.** Immediate delivery everywhere, against fan-out cost for large groups.
- **Conversation home region.** Simple ordering and asymmetric latency, versus local writes everywhere and conflict resolution.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What if the recipient is offline?"** — The message is already persisted; it is queued as a push notification and delivered by catch-up on reconnect. Nothing depends on them being online.
- **"How do you guarantee ordering?"** — Server-assigned sequence numbers per conversation, with a single ordering point per conversation. Across conversations, ordering is undefined and does not matter.
- **"How do you avoid sending a message twice?"** — Client-generated message id used as an idempotency key at persistence.
- **"How do unread counts work?"** — A `last_read_seq` pointer per member, not rows per message. Explain the volume arithmetic.
- **"A gateway with 250,000 connections dies. What happens?"** — Reconnect with jitter, catch up by sequence, no data loss.
- **"How many gateway machines for 100 million connections?"** — Give a per-node connection budget and multiply. This is a question about whether you know the cost of a socket.
- **"What changes for a 100,000-member group?"** — Pull instead of push, no per-member read receipts, and rate limiting on sends.""",
            ),
            (
                "Common Mistakes",
                """- Designing delivery around the socket instead of around persisted state plus a cursor
- Acknowledging the sender before the message is durable
- One row per recipient per message for unread or delivery state
- No reconnection or catch-up design
- Ignoring multi-device entirely
- Attempting global message ordering
- Forgetting push notifications for offline devices, which is how most messages are actually delivered""",
            ),
            (
                "Interview Tip",
                """Say the sentence that organises the whole design early: "Persist first, acknowledge second, deliver third — the socket is an optimisation and the catch-up endpoint is the correctness guarantee." Everything else follows from it, and it pre-empts half the follow-ups.""",
            ),
        ],
        [
            "Persist, then acknowledge, then deliver — the socket is a delivery optimisation, not the source of truth.",
            "Server-assigned per-conversation sequence numbers give ordering without global coordination or trusted clocks.",
            "Track unread and delivery as pointers per member, never as a row per message per recipient.",
            "Gateways hold sockets and nothing else; a gateway loss costs a reconnect with jittered backoff and a cursor-based catch-up.",
        ],
        [
            "What happens to a message when the recipient is offline?",
            "How do you guarantee message ordering within a conversation?",
            "A gateway holding 250,000 connections dies. Walk me through it.",
            "How do unread counts work without a row per message?",
            "What changes when a group has 100,000 members?",
        ],
    )


def _notification_system() -> dict:
    return SD(
        "sd-notification-system",
        "Design a Notification System",
        "Multi-channel delivery, user preferences, deduplication, rate limiting per human, and third-party providers that fail.",
        16,
        "**Interviewer:** \"Design a notification system that can send push, email, and SMS to users across a large product, triggered by events from many different services.\"",
        [
            (
                "Why It Matters",
                """Notifications look like a queue and a provider call. What makes it a real design problem is everything around that: dozens of producing services, per-user preferences and quiet hours, deduplication, per-human rate limiting so nobody receives forty alerts in a minute, template management, and third-party providers with their own limits and outages.

It is also a problem where the cost of getting it wrong is immediate and visible — duplicate or mistimed notifications are the fastest way to make users disable them entirely, which is worth saying out loud because it frames the design goals.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"Which channels?"* — Push (iOS and Android), email, SMS, in-app. Each has a different provider, latency, cost, and failure profile.
- *"Who triggers notifications?"* — Many services, which means a shared API rather than a library.
- *"Transactional or marketing, or both?"* — Critical difference: transactional messages (password reset, payment receipt) must be delivered and bypass most throttling; marketing must respect preferences, quiet hours, and unsubscribe.
- *"Do we need scheduling and batching?"* — Digests and send-at-local-time are common and change the design.
- *"What are the delivery guarantees?"* — At-least-once with deduplication, and clarity about which channels can confirm delivery.
- *"Do we need per-user rate limits?"* — Yes. This is the requirement candidates forget and interviewers care about.

**Agreed scope:** a notification API used by many services, four channels, user preferences including quiet hours, per-user rate limiting, templating and localisation, retries with provider failover, and delivery tracking.

**Non-functional:** transactional notifications dispatched within seconds at p99; no duplicate notifications for the same logical event; the system absorbs a 50x burst; a provider outage degrades one channel and not the product.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 100M users, 500M notifications per day: about 5,000 per second average.
- Peak is far spikier than average because notifications are event-driven: a marketing campaign or an incident can produce 10M in a few minutes, so 100,000 per second peak is realistic.
- Channel split: 70% push, 20% email, 8% in-app, 2% SMS. SMS is 2% of volume and frequently most of the cost.
- Delivery records: 500M rows per day. At 200 bytes that is 100 GB per day, 36 TB per year — so retention matters.

**The conclusions:**

1. The burst ratio, not the average, defines the architecture. A queue that absorbs 100,000 per second while workers drain at a provider-limited rate is the core of the design.
2. Provider rate limits, not your capacity, are usually the binding constraint. You must throttle outbound per provider.
3. SMS cost asymmetry means per-channel cost controls are a genuine requirement, not a nicety.""",
            ),
            (
                "Step 3: API Design",
                """One API for all producing services.

`POST /v1/notifications` with:

- `event_key` — a stable idempotency key from the producer, such as `order_shipped:order_123`
- `user_id`
- `template_id` and `params`
- `priority` — `transactional` or `marketing`
- `channels` — requested channels, or `auto` to let preferences decide
- `send_at` — optional, for scheduling

Returns `202 Accepted` with a `notification_id`. Always asynchronous: a producing service must never wait for an SMS provider.

`GET /v1/notifications/{id}` returns per-channel status: `queued`, `sent`, `delivered`, `failed`, `suppressed` — with a reason for suppression, which is what makes support questions answerable.

`PUT /v1/users/{id}/preferences` manages channel opt-ins, quiet hours, digest settings, and category-level preferences.

Two design decisions to defend: producers send *intent* (an event plus a template), not rendered content — so templates and localisation change without redeploying twelve services. And the `event_key` is mandatory, because it is the only defence against a producer retrying.""",
            ),
            (
                "Step 4: Data Model",
                """**notifications** — `notification_id`, `event_key` (unique), `user_id`, `template_id`, `params`, `priority`, `created_at`, `status`.

**deliveries** — `(notification_id, channel) → provider, provider_message_id, status, attempts, last_error, sent_at, delivered_at`. One row per channel attempt; this is the table that answers "did they get it?".

**preferences** — `(user_id, category) → channels enabled, quiet_hours, timezone, digest_frequency`.

**templates** — `template_id`, `channel`, `locale`, `subject`, `body`, `version`. Versioned, because a template change should be reviewable and revertible like code.

**suppressions** — hard bounces, unsubscribes, complaints, invalid device tokens. Checked before every send. This table is what keeps your sending reputation intact and is frequently forgotten.

**rate_state** — per user, per channel counters in a fast store.""",
            ),
            (
                "Step 5: First Architecture",
                """Producers → Notification API → Queue → Router → Per-channel queues → Workers → Providers

The router is where the interesting logic lives: it deduplicates, applies preferences and suppressions, applies rate limits, decides channels, renders the template, and enqueues per channel. Workers are deliberately dumb: take a rendered message, call a provider, record the outcome, retry on failure.

Separating the two matters because the policy layer changes constantly and the delivery layer must be simple and fast.""",
            ),
            (
                "How It Works",
                """### The routing pipeline

For each accepted notification:

1. **Deduplicate** on `event_key`. A unique constraint makes a producer's retry a no-op. This is the first line of defence and the cheapest.
2. **Check suppressions.** Unsubscribed, bounced, or invalid token means suppress with a recorded reason.
3. **Apply preferences.** Which channels has this user enabled for this category? Quiet hours in the user's own timezone — and note that quiet hours must not apply to transactional messages, which is a rule that has to be explicit or someone will suppress a password reset at 2am.
4. **Apply per-user rate limits.** A cap such as five marketing notifications per day and no more than one push per five minutes. Without this, a bug in one producer sends a user hundreds of notifications and they uninstall the app. This step is the one that most distinguishes a real design.
5. **Bundle or digest.** If the user has hourly digests enabled, or several notifications of the same category arrive close together, batch them into one.
6. **Render** the template for the user's locale.
7. **Enqueue** per channel.

### Per-channel delivery

Each channel has its own queue and worker pool, because their characteristics differ completely:

| Channel | Latency | Cost | Delivery confirmation | Failure mode |
| --- | --- | --- | --- | --- |
| Push | Sub-second | Near zero | Provider accepts; device delivery uncertain | Invalid tokens accumulate |
| Email | Seconds to minutes | Very low | Webhooks for delivered, bounced, opened | Reputation damage from bad sends |
| SMS | Seconds | High | Delivery receipts available | Cost, and per-country regulations |
| In-app | Immediate on next open | Zero | Read state is known | Only seen when the app is opened |

Separate queues mean an SMS provider outage does not delay push notifications — a shared queue would head-of-line block everything behind the slow channel.

### Providers, retries, and failover

- Each channel has a primary and a secondary provider. On sustained failure, a circuit breaker opens and traffic shifts to the secondary.
- Retries use exponential backoff with jitter and a cap. Permanent failures (invalid token, hard bounce) must not be retried at all — they go straight to the suppression list.
- Provider rate limits are enforced outbound with a token bucket per provider, or you will be throttled or blocked by them.
- Delivery status arrives asynchronously by webhook and updates the delivery row, which is how you know an email actually arrived rather than merely being accepted.

### Idempotency end to end

Three places duplicates can appear, and each needs its own guard:

1. **Producer retries** — the `event_key` unique constraint.
2. **Queue redelivery** — the worker checks the delivery row's state before calling the provider, and writes the provider message id transactionally with the state change.
3. **Provider retries** — most providers accept a client-supplied idempotency key; use it.

A notification system without all three will send duplicates, and duplicates are the failure users notice most.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "Marketing sends a campaign to 50 million users at once."

- The API accepts and enqueues at full speed; workers drain at the rate providers allow. The queue is doing exactly its job.
- Campaign traffic goes to a separate low-priority queue so a marketing burst cannot delay a password reset. Priority separation by queue, not by a priority field inside one queue — a field does not work, because a single consumer still processes in order.
- Per-user rate limiting means a user already at their daily cap is suppressed rather than added to the flood.
- Send-at-local-time spreads a global campaign across 24 hours naturally, which is both better for users and a free load-smoothing mechanism.

### Round 2 — "The push provider is down for 30 minutes."

- The circuit breaker opens after sustained failures; traffic shifts to the secondary provider if configured.
- If there is no secondary, messages stay queued. Transactional pushes may fall back to another channel — an SMS for a security code, for example — which is a policy decision expressed in the routing rules.
- Queue depth and age are monitored; if the backlog would take hours to drain, low-priority notifications are dropped rather than delivered a day late. A stale notification is worse than no notification, and saying so shows product judgement.

### Round 3 — "A bug causes one service to emit the same event 200 times."

- `event_key` deduplication absorbs it entirely if the key is stable. If the producer generates a new key each time, deduplication fails — so add a secondary guard: a content-based hash per user per template within a time window.
- Per-user rate limiting is the backstop that turns a producer bug into five notifications instead of two hundred. This is exactly why the rate limiter exists, and it is worth framing it as a blast-radius control rather than a politeness feature.

### Round 4 — "How do you handle a user with 10 devices and 3 email addresses?"

Fan-out within a channel: one notification, several device tokens. Track per-token delivery, and prune tokens the provider reports as invalid. Deduplicate at the human level, not the device level — the rate limit applies to the person.

### Round 5 — "How do you support digests and scheduled sends?"

- A scheduled store keyed by send time, polled by a dispatcher, or a delay queue.
- Digests accumulate notifications in a per-user bucket and flush on a schedule in the user's timezone.
- The subtlety worth mentioning: a notification that becomes irrelevant before the digest fires (the message was already read, the order was cancelled) should be dropped at flush time, which means the digest must re-evaluate relevance rather than replaying stored content.""",
            ),
            (
                "Failure Modes",
                """- **Duplicate notifications** from a missing idempotency key at any of the three layers.
- **Notification storms** from a producer bug, with no per-user cap.
- **Head-of-line blocking** when all channels share a queue.
- **Retrying permanent failures**, damaging sender reputation and wasting quota.
- **Ignoring suppression lists**, leading to spam complaints and provider-level blocking.
- **Quiet hours applied to transactional messages**, delaying a security code.
- **Unbounded backlog**, delivering yesterday's notifications tomorrow.
- **Invalid device tokens** never pruned, so push volume is inflated with guaranteed failures.""",
            ),
            (
                "Trade-offs",
                """- **Per-channel queues versus one queue.** Isolation and more infrastructure, against simplicity and head-of-line blocking.
- **Aggressive deduplication versus missed notifications.** Too broad a dedup window suppresses legitimately distinct events.
- **Rate limiting versus delivery.** Protecting the user from a flood means some notifications are deliberately never sent; the policy must be explicit about which.
- **Immediate versus digest.** Timeliness against volume; the right answer is usually per category and user-configurable.
- **Retry aggressiveness.** Persistence improves delivery and risks provider throttling and reputation damage.
- **Delivery tracking depth.** Full per-channel status is invaluable for support and generates hundreds of gigabytes a day.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"How do you prevent duplicates?"** — Three layers: producer `event_key`, worker state check, provider idempotency key. Name all three.
- **"A service sends the same event 200 times. What does the user receive?"** — Ideally one, and at worst the per-user rate limit caps it. Frame the limiter as a blast-radius control.
- **"The SMS provider is down. What happens to push notifications?"** — Nothing, because the queues are separate. That is the reason for the separation.
- **"How do you handle quiet hours across timezones?"** — Store the user's timezone, evaluate at send time, and exempt transactional messages explicitly.
- **"How do you know a notification was actually received?"** — Provider webhooks update the delivery row; push is accepted-not-guaranteed, and being honest about that distinction matters.
- **"A campaign to 50 million users — how long does it take and what does it affect?"** — Provider-limited, on a separate low-priority queue, spread by local time, with transactional traffic unaffected.""",
            ),
            (
                "Common Mistakes",
                """- No per-user rate limiting, so a producer bug becomes a user-facing disaster
- A single queue for all channels
- Producers sending rendered content instead of an event plus template
- No suppression list, damaging deliverability permanently
- Retrying hard failures
- Synchronous notification sending inside a business transaction
- Treating provider acceptance as delivery""",
            ),
            (
                "Interview Tip",
                """Volunteer the per-user rate limit early and explain it as blast-radius control: "A cap of five notifications per user per hour means a bug in any producing service costs a user five messages, not five hundred." It is the detail that most clearly signals you have operated one of these systems.""",
            ),
        ],
        [
            "Producers send an event plus a template id, never rendered content — so policy and localisation live in one place.",
            "Deduplicate at three layers: producer event key, worker state check, and provider idempotency key.",
            "Per-user rate limiting is blast-radius control, not politeness — it turns a producer bug into a minor annoyance.",
            "Give every channel its own queue and workers so one provider's outage cannot block the others.",
        ],
        [
            "How do you guarantee a user never receives the same notification twice?",
            "A producing service emits the same event 200 times. What does the user see?",
            "How do you handle a provider outage without affecting other channels?",
            "How do quiet hours and transactional messages interact?",
        ],
    )


def _ride_sharing() -> dict:
    return SD(
        "sd-ride-sharing",
        "Design Uber (Ride Sharing)",
        "Geospatial indexing, a matching problem that must not double-book, and a trip that is a distributed state machine.",
        18,
        "**Interviewer:** \"Design a ride-hailing service. Riders request a ride, we match them with a nearby driver, and both track the trip until it completes.\"",
        [
            (
                "Why It Matters",
                """This problem combines three things that are individually interesting and unusual together: a very high-rate write workload that is almost worthless (driver locations), a matching problem with a hard correctness requirement (a driver must not be assigned to two riders), and a long-lived stateful entity (the trip) spanning several services and a payment.

Candidates who treat it as CRUD with a map miss all three.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"One rider per trip, or pooled rides?"* — Pooling is a substantially harder matching and routing problem; scope it out first and offer it as an extension.
- *"How fresh must driver locations be?"* — Every few seconds is enough, and the answer determines the write volume.
- *"Who chooses the driver — the system, or do drivers accept?"* — Drivers accepting means an offer protocol with timeouts, which is where the concurrency problem lives.
- *"Do we need routing and ETAs?"* — Use a mapping service; do not design a routing engine unless asked.
- *"Is payment in scope?"* — Treat it as an external service with an idempotent charge and a callback.
- *"Surge pricing?"* — Mention it as a demand-supply computation over geographic cells, and scope it out or keep it as an extension.

**Agreed scope:** driver location updates, rider requests a ride, matching with driver acceptance, live trip tracking, trip completion and payment. Pooling, routing internals, and surge out of scope.

**Non-functional:** matching completes within seconds; a driver is never assigned two active trips; location updates may be a few seconds stale; trip state must never be lost; the system operates city by city.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 5M active drivers globally, 1M online at peak.
- Location pings every 4 seconds: 1M / 4 = **250,000 location writes per second**.
- 20M trips per day: about 230 per second average, with large city-level peaks.
- Location payload: driver id, lat, lon, heading, timestamp — about 50 bytes. 250,000 × 50 B = 12.5 MB/s, which is trivial in bytes and enormous in write operations.
- Trip records: 20M per day × 2 KB = 40 GB per day.

**The conclusions:**

1. 250,000 writes per second of data that is worthless after 30 seconds must not go to a durable database. It belongs in memory, keyed geospatially, with the durable trail written asynchronously if needed at all.
2. Matching at 230 per second is low volume and high stakes — the correctness requirement, not throughput, is what makes it hard.
3. Trips are ordinary transactional data at ordinary volume. Put them in a relational store and stop worrying about them.
4. The system is naturally partitioned by geography, which is the most important structural observation: a rider in Lagos never needs a driver in Lisbon.""",
            ),
            (
                "Step 3: API Design",
                """**Driver:**

- Location updates over a persistent connection, batched: `{driver_id, lat, lon, heading, ts}` every 4 seconds.
- `POST /v1/drivers/availability` — online, offline, on-trip.
- `POST /v1/offers/{offer_id}/accept` — with a short deadline.

**Rider:**

- `POST /v1/rides` with `{pickup, destination, product}` returns `202 {ride_id, status: "matching"}`. Asynchronous, because matching takes seconds.
- `GET /v1/rides/{id}` or a subscription for state changes and driver position.
- `POST /v1/rides/{id}/cancel`.

The ride request is deliberately asynchronous with a subscription for updates. Holding an HTTP request open while offers are made and declined is the wrong shape, and saying so demonstrates that you have thought about the matching protocol's duration.""",
            ),
            (
                "Step 4: Data Model",
                """**driver_locations** — in memory, not a database. Keyed by geospatial cell, holding `driver_id → (lat, lon, heading, updated_at, status)`. Redis with geospatial commands, or a purpose-built in-memory service partitioned by city. Entries expire after 30 seconds of silence, which handles disconnections without any explicit cleanup.

**trips** — `trip_id`, `rider_id`, `driver_id`, `state`, `pickup`, `destination`, `requested_at`, `accepted_at`, `started_at`, `completed_at`, `fare`, `payment_id`. Relational, partitioned by month. This is the system of record.

**offers** — `offer_id`, `trip_id`, `driver_id`, `expires_at`, `state`. Short-lived, and the table where the concurrency guarantee is enforced.

**driver_state** — `driver_id → current_trip_id or null`. The critical row: the uniqueness constraint that prevents double-booking.

**trip_events** — append-only history of state transitions, for support, disputes, and analytics.""",
            ),
            (
                "Step 5: First Architecture",
                """Driver app → Location service (in-memory, geo-indexed)

Rider app → Ride service → Matching service → Offer → Driver app

Ride service → Trip store (relational) → Payment service

Plus a real-time channel pushing trip state and driver position to both apps.

Note that the location service and the trip service have almost nothing in common: one is a high-rate ephemeral in-memory store, the other is a low-rate transactional database. Drawing them as separate systems with different properties is most of the design.""",
            ),
            (
                "How It Works",
                """### Geospatial indexing

"Find drivers near this point" cannot be a scan with a distance calculation over a million rows. The standard approaches:

- **Geohash** — encode lat/lon into a string where shared prefixes mean geographic proximity. Query by prefix to get a cell, and query neighbouring cells because a point near a cell boundary has close drivers in the adjacent cell. The boundary problem is the detail worth mentioning.
- **S2 cells or H3 hexagons** — hierarchical cell systems with better distance properties than geohash rectangles. H3's hexagons have uniform neighbour distances, which is genuinely nicer for this problem.
- **Redis geospatial commands** — a sorted set with geohash scores, supporting radius queries directly. Perfectly adequate and operationally simple.

The index is partitioned by city or region, so each partition holds thousands of drivers rather than millions, and a query touches one partition.

Cell size is a real trade-off: too large and you scan too many drivers, too small and you must query many neighbouring cells. Dense city centres and sparse rural areas want different resolutions, which is an argument for a hierarchical system.

### Matching and the double-booking problem

This is the correctness core of the problem.

1. A ride request arrives. The matching service queries the location index for available drivers within a radius, ranked by ETA rather than straight-line distance.
2. It creates offers to the top N drivers — either sequentially with a short timeout each, or in parallel to a few drivers with first-accept-wins.
3. A driver accepts. **This is the critical section.**
4. The accept is a conditional update: set `driver_state.current_trip_id = trip_id` **where** `current_trip_id IS NULL`. Zero rows updated means another trip claimed them first, and that driver's accept returns "too late".
5. The same transaction moves the trip to `matched` and records the driver.
6. Remaining offers are cancelled.

The guarantee comes from a **database constraint, not from a distributed lock**. That is the point worth making explicitly: the single-row conditional update in the trip database is a real, transactional mutual exclusion, and it is far more reliable than a Redis lock with a TTL. Interviewers specifically look for candidates who reach for the simple correct mechanism rather than the complicated approximate one.

Parallel offers reduce wait time and waste driver attention; sequential offers are efficient and slow. Most products do a hybrid: offer to two or three at once, staggered.

### The trip state machine

`requested → matching → matched → driver_arriving → driver_arrived → in_progress → completed → paid`

Plus cancellation paths from most states, each with its own policy (fee or no fee).

Properties that matter:

- Transitions are validated: you cannot go from `requested` to `completed`.
- Each transition is a conditional update on the current state, which makes transitions idempotent — a retried "start trip" from the same state is a no-op rather than an error.
- Every transition appends to `trip_events`, which is what makes disputes answerable six months later.
- The state machine lives in one service and one database. Spreading it across services would require a saga for something that fits comfortably in a single transaction, which would be a self-inflicted wound.

### Location updates at 250,000 per second

- Drivers hold a persistent connection to a location gateway, batched and compressed.
- The gateway writes to the in-memory geo index with a TTL. No durable write on this path.
- A sampled subset is written asynchronously to a log for analytics, ETA model training, and trip route reconstruction — but the live path never waits for it.
- During an active trip, the rider's app subscribes to that driver's position through the real-time channel. Only one subscriber, so this is cheap.

If the location service loses everything, drivers re-report within 4 seconds and the index rebuilds itself. That self-healing property is why keeping it in memory is safe, and it is worth saying.

### Payment

Handled as an external service with an idempotency key derived from the trip id. The trip moves to `completed` when the ride ends and to `paid` on callback. A payment failure does not roll back the trip — it moves it to a `payment_pending` state and enters a retry and collections flow. This is a saga with a compensation that is a business process rather than a technical rollback, which is realistic and worth naming.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A concert ends and 10,000 people request rides in one square kilometre within five minutes."

- The geo index for that cell is hot. Because the index is partitioned by city and cells are in memory, reads are fast, but the *matching* service is now doing 10,000 searches over the same small driver pool.
- Contention on driver rows spikes: many riders attempt to claim the same few drivers. The conditional update handles correctness, and throughput suffers from retries.
- Mitigations: batch matching (run an assignment over a batch of requests and drivers every second or two, rather than greedily per request — this produces better global assignments and dramatically reduces contention), queue riders with a visible position, and surge pricing to balance demand against supply.

Batch assignment is the strong answer here: it converts a contention problem into an optimisation problem solved once per interval.

### Round 2 — "The location service loses a node holding one city."

Drivers re-report within seconds and the index rebuilds. In the meantime, matching in that city degrades: fewer known drivers, so longer waits. No trips are affected, because active trips are in the trip database, not the location index.

This is the payoff for separating ephemeral from durable state, and it should be stated as a design property rather than a lucky outcome.

### Round 3 — "Two riders are matched to the same driver."

Only possible if the accept path is not a conditional update on a single row. Walk through the correct sequence and show why the second accept affects zero rows. If the interviewer proposes a distributed lock instead, explain the TTL-and-pause failure and why a database constraint is stronger.

### Round 4 — "How does this work across regions?"

Naturally: the system is geographically partitioned already. Each region runs its own location index, matching service, and trip store. There is essentially no cross-region traffic on the hot path, because rides are local by nature.

The global components are small: user accounts, driver profiles, payment methods. Those are replicated globally and read-mostly.

This is one of the rare designs where multi-region is straightforward, and saying why — the workload partitions perfectly by geography — is a good observation.

### Round 5 — "A driver's app crashes mid-trip."

- The trip stays in `in_progress` in the database; nothing is lost.
- Location updates stop; the rider's app shows the last known position and a warning.
- On reconnect, the driver's app fetches the active trip and resumes.
- If the driver never reconnects, a timeout escalates to support and the trip can be completed manually. Every long-running state machine needs a human escape hatch, and mentioning it is a maturity signal.""",
            ),
            (
                "Failure Modes",
                """- **Scanning all drivers** with a distance calculation instead of using a spatial index.
- **Double-booking** from a check-then-set instead of a conditional update.
- **Location writes to a durable database**, saturating it with worthless data.
- **Trip state spread across services**, requiring a saga for something that fits in one transaction.
- **Greedy per-request matching** under surge, producing contention and poor assignments.
- **No offer expiry**, so a driver who ignores an offer blocks the rider indefinitely.
- **Cell boundary misses**, where the nearest driver is in the adjacent cell and never considered.
- **No manual override** for trips stuck in an intermediate state.""",
            ),
            (
                "Trade-offs",
                """- **Location freshness versus write volume.** More frequent pings improve matching and ETAs and multiply the write rate; 4 seconds is a reasonable compromise.
- **In-memory location versus durable.** Fast, cheap, self-healing, and lost on restart — which is fine because it rebuilds in seconds.
- **Parallel versus sequential offers.** Faster matching against wasted driver attention and more contention.
- **Greedy versus batch matching.** Immediate response against better global assignment and less contention. Batch wins under load.
- **Cell size.** Fewer candidates per query against more neighbour queries; a hierarchical cell system addresses both.
- **Strong consistency on assignment, eventual everywhere else.** The right split, and worth stating as a deliberate choice.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"How do you find nearby drivers?"** — Geohash, S2, or H3 cells partitioned by city, with neighbour-cell queries. Never a global scan.
- **"How do you prevent two riders getting the same driver?"** — A conditional update on a single row inside a transaction. Explain why this beats a distributed lock.
- **"Where do location updates go?"** — An in-memory geo index with a TTL, never a durable database on the hot path.
- **"What is the trip's data model?"** — A validated state machine with an append-only event log, in one service and one transaction.
- **"A concert lets out. What happens?"** — Contention and demand imbalance; batch assignment, queueing, and surge.
- **"What if the payment fails after the ride?"** — The trip does not roll back; it enters a payment-pending state with retries and a collections process. A saga whose compensation is a business process.""",
            ),
            (
                "Common Mistakes",
                """- Writing driver locations to the primary database
- A `SELECT` then `UPDATE` for driver assignment, without a conditional update
- Reaching for a distributed lock where a database constraint is available
- Designing a routing engine instead of using a mapping service
- Ignoring offer timeouts and driver non-response
- Spreading the trip state machine across multiple services
- Missing that the whole system partitions cleanly by geography""",
            ),
            (
                "Interview Tip",
                """Separate the three subsystems explicitly at the start: "There is a very high-rate ephemeral location index, a low-rate high-stakes matching decision, and an ordinary transactional trip state machine. They have completely different requirements, so I will design them separately." That framing organises the whole answer and is the thing weaker candidates never do.""",
            ),
        ],
        [
            "Driver locations are ephemeral high-rate data — keep them in a geo-indexed in-memory store with a TTL, never in the primary database.",
            "Prevent double-booking with a conditional update on a single row, not with a distributed lock.",
            "The trip is a validated state machine with an append-only event log, living in one service and one transaction.",
            "Under demand spikes, batch assignment beats greedy per-request matching on both contention and assignment quality.",
        ],
        [
            "How do you find the nearest available drivers without scanning everything?",
            "How do you guarantee a driver is never assigned two rides?",
            "Where do 250,000 location updates per second go, and why not the database?",
            "A concert ends and demand spikes 50x in one cell. What happens?",
        ],
    )


def _dropbox() -> dict:
    return SD(
        "sd-dropbox",
        "Design Dropbox / Google Drive",
        "File sync across devices: chunking, deduplication, conflict resolution, and the metadata service that does the real work.",
        17,
        "**Interviewer:** \"Design a file storage and synchronisation service. Users have a folder on several devices, and changes on one device appear on the others.\"",
        [
            (
                "Why It Matters",
                """The naive answer — upload files to object storage and download them elsewhere — misses everything that makes sync hard: bandwidth efficiency when a 2 GB file changes by one byte, conflict resolution when two offline devices edit the same file, and the fact that the metadata service, not the storage, is the part that has to be fast and consistent.

It is also one of the few designs where chunking and content-addressed storage are the central mechanism rather than an optimisation.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"Do we need file versioning and restore?"* — Usually yes, and it changes the storage model from mutable to append-only.
- *"How do we handle two devices editing the same file offline?"* — Conflict handling is a product decision: last write wins, keep both, or merge. Ask, because the answer shapes the whole sync protocol.
- *"Sharing and permissions?"* — At least read/write sharing of files and folders.
- *"Maximum file size?"* — Several gigabytes, so chunking and resumable transfer are required.
- *"Does the client sync everything, or selectively?"* — Selective sync and placeholder files change what the client must know.
- *"Do we need real-time collaborative editing?"* — No, that is a different product; file-level sync is the scope.

**Agreed scope:** a synced folder across devices, file upload and download, versioning with restore, sharing with permissions, offline edits reconciled on reconnect, and efficient transfer of large files with small changes.

**Non-functional:** a change on one device appears on another within seconds when both are online; no user data is ever lost, including in a conflict; transfer must be bandwidth-efficient; the client must handle being offline for days.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 500M users, 100M daily active, averaging 3 devices each.
- 1B file changes per day: about 12,000 metadata operations per second average, several times that at peak.
- Average file 1 MB, but the distribution has a long tail into gigabytes.
- New data: 500 TB per day before deduplication. With chunk-level dedup, typically a large reduction — identical files and unchanged chunks are extremely common in shared folders and repeated documents.
- Metadata: 1B change records per day at 500 bytes is 500 GB per day, which is more than the file bytes in row count terms and needs its own scaling story.

**The conclusions:**

1. Metadata operations vastly outnumber byte transfers. The metadata service is the system's hot path and the thing that must scale.
2. Deduplication is not a nicety at this volume; it is a major cost saving and the mechanism that makes "upload" instant for a file the system already has.
3. Delta sync — transferring only changed chunks — is what makes the product feel fast and keeps bandwidth affordable.""",
            ),
            (
                "Step 3: API Design",
                """The protocol is more interesting than the endpoints, and it comes in four steps.

1. `POST /v1/chunks/check` with a list of chunk hashes returns which chunks the server already has. This is what makes deduplication and delta sync work, and it is the first call in every upload.
2. For missing chunks only: `PUT` to pre-signed URLs, direct to object storage.
3. `POST /v1/files` with `{path, chunk_hashes[], size, parent_version}` commits a new file version atomically. `parent_version` is the optimistic concurrency check.
4. `GET /v1/changes?cursor=` returns everything that changed since the client's cursor — the sync engine's heartbeat, polled or pushed.

Plus `POST /v1/files/{id}/share`, `GET /v1/files/{id}/versions`, and `POST /v1/files/{id}/restore`.

The design decision to defend: the client computes hashes locally and asks what is missing before sending any bytes. A 2 GB file with one changed chunk uploads 4 MB. This single round trip is the heart of the product.""",
            ),
            (
                "Step 4: Data Model",
                """**files** — `file_id`, `owner_id`, `path`, `current_version_id`, `is_deleted`. Sharded by `owner_id` or by workspace, so a user's whole tree is on one shard and listing a folder is a single-shard query.

**versions** — `version_id`, `file_id`, `chunk_list`, `size`, `created_by`, `created_at`, `parent_version_id`. Append-only. A file is a pointer to its current version, and history is free.

**chunks** — `chunk_hash` (primary key), `object_key`, `size`, `refcount`. Content-addressed: the hash *is* the identity, so identical content is stored once globally.

**device_cursors** — `(user_id, device_id) → last_seen_change_id`.

**changes** — an append-only log per user: `(user_id, change_id, file_id, version_id, type, timestamp)`. This is what `GET /changes` reads, and making it a log rather than a query over files is what makes sync efficient and resumable.

**shares** — `(file_or_folder_id, principal_id, permission)`.

Two decisions to highlight: content-addressed chunks give deduplication for free and make uploads idempotent; and a per-user change log turns "what changed?" from an expensive diff into a cheap sequential read.""",
            ),
            (
                "Step 5: First Architecture",
                """Client → Metadata service → Metadata DB (sharded by user)

Client → Chunk service (hash check) → Object storage (direct transfer)

Metadata service → Change log → Notification channel → Other devices

The bytes and the metadata travel on separate paths, and the metadata path is the one under load.""",
            ),
            (
                "How It Works",
                """### Chunking

Files are split into chunks — 4 MB is a common size. Two strategies:

- **Fixed-size chunking** is simple and breaks badly on insertion: inserting a byte at the start of a file shifts every subsequent boundary, so every chunk changes and delta sync achieves nothing.
- **Content-defined chunking** (a rolling hash, Rabin fingerprinting) places boundaries based on content, so an insertion changes only the chunks around it. Slightly more CPU, dramatically better delta efficiency for edited files.

Say which and why. For a document that is edited repeatedly, content-defined chunking is the difference between re-uploading 2 GB and uploading 8 MB.

### Deduplication

Chunks are addressed by hash, so:

- A user uploading a file another user already has uploads nothing — the "instant upload" experience.
- A file copied within a workspace costs only a metadata row.
- Reference counting tracks how many versions point at a chunk; garbage collection removes chunks at zero references, carefully, because a concurrent upload may be about to reference one.

Two caveats worth raising unprompted: cross-user deduplication leaks information (you can detect whether a file exists globally by timing an upload), and it complicates per-user encryption. Many products therefore deduplicate within a user or workspace rather than globally. Noticing the privacy implication is a strong signal.

### The sync protocol

**Upload:**
1. The client detects a local change with a filesystem watcher.
2. It chunks the file and computes hashes.
3. It asks the server which chunks are missing.
4. It uploads only those, directly to object storage.
5. It commits a new version with `parent_version`.

**Download:**
1. The client polls or is notified of changes since its cursor.
2. It receives a list of file versions and their chunk lists.
3. It fetches only chunks it does not already have locally — which, for a small edit, is one chunk.
4. It reassembles and writes the file atomically (write to a temporary file, then rename), so a crash never leaves a half-written file.

The cursor makes sync resumable: a device offline for a week catches up by reading the change log from its cursor, with no expensive comparison of the entire tree.

### Conflicts

Two devices edit the same file while offline. Both come online and try to commit a version with the same `parent_version`.

1. The first commit succeeds.
2. The second fails the optimistic check — its `parent_version` is no longer current.
3. The client is told there is a conflict.

The resolution is a product decision, and the standard answer is **never lose data**: create a conflicted copy (`report (Ana's conflicted copy).docx`) and let the human resolve it. Last-write-wins silently discards someone's work and is nearly always the wrong choice for a file-sync product.

For a directory, conflicts are messier: a file moved on one device and edited on another, or a folder deleted on one while files were added on another. The rule that keeps this sane: **deletions never destroy data that has not been synced** — a delete of a folder containing unsynced changes should preserve those changes rather than propagate the delete.

### Notifying other devices

A long-poll or persistent connection per device, delivering "there are changes after cursor X". The notification carries no content — just a hint to call `GET /changes`. This keeps the notification path trivial and means a missed notification costs latency, not correctness, because the client also polls periodically.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A user has 2 million files in one folder."

- Listing is paginated and cursor-based; there is no "fetch the whole tree" operation.
- The client must not hold the entire tree in memory or stat every file on every scan; it uses filesystem change notifications with a periodic full reconciliation as a backstop.
- Metadata sharding by user means this user is large but still on one shard — which is a hot-tenant problem, solved by giving very large accounts their own shard.

### Round 2 — "A shared folder has 500 collaborators and changes constantly."

- Change notification fan-out: every change notifies 500 devices. This is the feed fan-out problem again; batch notifications and coalesce rapid changes.
- The per-user change log now receives entries from many writers, so ordering within the shared folder matters. Assign a sequence per folder and merge into each user's change stream.
- Permission changes must take effect quickly: a revoked user should stop receiving changes, which means the fan-out list is evaluated at notification time, not cached indefinitely.

### Round 3 — "A device has been offline for three months."

The change log for that user may be enormous, and much of it is superseded — a file changed 400 times only needs its current version.

The answer: **compaction**. If a device's cursor is older than the retained log window, fall back to a state-based sync — send the current state of the tree and let the client diff against its local state. This is slower but bounded, and it means the change log needs only a bounded retention. Recognising that you need both an incremental and a full-resync path is the mature answer.

### Round 4 — "How do you support end-to-end encryption?"

- Chunks are encrypted client-side before upload; the server stores ciphertext.
- Deduplication must then be per-user, since identical plaintext encrypts differently under different keys. Convergent encryption (deriving the key from the content hash) restores cross-user dedup and reintroduces the confirmation-of-file-existence leak.
- Server-side search, previews, and thumbnails become impossible and must move to the client.
- This is a genuine product trade-off, not a technical one, and framing it that way is the right answer.

### Round 5 — "How do you garbage-collect chunks safely?"

Reference counting is racy: a chunk's count drops to zero just as another user's upload is about to reference it.

The safe pattern: mark-and-sweep with a grace period. A chunk at zero references is marked, and only deleted if it is still at zero after a window longer than the maximum upload duration. Uploads that reference a marked chunk un-mark it. Getting this wrong deletes user data, which is why the conservative approach is correct even though it retains some garbage.""",
            ),
            (
                "Failure Modes",
                """- **Whole-file upload on every change**, making the product unusable for large files.
- **Fixed-size chunking**, destroying delta efficiency for edited documents.
- **Last-write-wins conflict resolution**, silently losing user work.
- **Unbounded change logs**, with no compaction or full-resync fallback.
- **Aggressive chunk garbage collection** racing with concurrent uploads.
- **Non-atomic local writes**, leaving corrupted files after a crash mid-download.
- **Propagating a delete** that destroys unsynced local changes.
- **A single hot shard** for a very large account or shared workspace.""",
            ),
            (
                "Trade-offs",
                """- **Content-defined versus fixed chunking.** Far better delta efficiency for more client CPU.
- **Global versus per-user deduplication.** Large storage savings against an information leak and incompatibility with per-user encryption.
- **Conflicted copies versus automatic merge.** Never losing data and occasionally confusing users, versus silently discarding work.
- **Push notifications versus polling.** Seconds of latency against a connection per device; most designs use both, with polling as the correctness backstop.
- **Change log retention.** Long retention makes incremental sync always possible and costs storage; short retention needs a full-resync path.
- **Client complexity.** Most of this product's difficulty lives in the client, and a design that ignores that is incomplete.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"A 2 GB file changes by one byte. What is transferred?"** — One chunk, because of content-defined chunking and a hash check before upload. This is the question that tests whether you understand the product.
- **"Two devices edit the same file offline. What happens?"** — Optimistic version check, second commit fails, conflicted copy created. Never silently discard.
- **"How does a device know what changed?"** — A per-user change log plus a cursor, with a full-resync fallback when the cursor is too old.
- **"What does the server store for a file that ten users share?"** — One copy of each chunk, ten metadata pointers.
- **"How do you delete a chunk safely?"** — Mark-and-sweep with a grace period, not immediate reference-count deletion.
- **"Where is the bottleneck?"** — Metadata operations, not bytes. That reordering of expectations is itself the answer.""",
            ),
            (
                "Common Mistakes",
                """- Treating this as "upload files to object storage"
- No chunking, so large files are re-uploaded in full
- Fixed-size chunks with no discussion of the insertion problem
- Last-write-wins conflict handling
- No cursor-based change feed, so sync requires comparing entire trees
- Ignoring the client, where most of the complexity actually lives
- Missing that metadata operations dominate the load""",
            ),
            (
                "Interview Tip",
                """Open with the chunking insight: "The core mechanism is content-addressed chunks — the client hashes chunks locally, asks the server which are missing, and uploads only those. That gives deduplication, delta sync, and resumable uploads from one idea." Everything else in the design hangs off that sentence.""",
            ),
        ],
        [
            "Content-defined chunking plus content-addressed storage gives delta sync, deduplication and resumability from one mechanism.",
            "The metadata service and the per-user change log are the hot path; bytes go directly to object storage.",
            "Resolve conflicts by creating a conflicted copy — never silently discard a user's work.",
            "Sync needs both an incremental cursor path and a full-resync fallback for devices that have been offline too long.",
        ],
        [
            "A 2 GB file changes by one byte. What crosses the network?",
            "Two devices edit the same file while offline. What happens on reconnect?",
            "How does a device that has been offline for months catch up?",
            "How do you garbage-collect chunks without deleting data someone is about to reference?",
        ],
    )


def _autocomplete() -> dict:
    return SD(
        "sd-autocomplete",
        "Design Search Autocomplete",
        "Sub-50ms prefix lookups, an offline ranking pipeline, and why the live path never touches the search index.",
        14,
        "**Interviewer:** \"Design the type-ahead suggestion system for a large search engine. As the user types, show the top suggestions.\"",
        [
            (
                "Why It Matters",
                """Autocomplete has an unusually hard latency budget — suggestions must appear faster than the user types the next character, so the budget is tens of milliseconds — combined with an unusually forgiving correctness requirement, since nobody can tell whether the suggestions are perfectly ranked.

That combination has a clean architectural consequence: do everything expensive offline, and make the live path a memory lookup. Candidates who propose querying the search index on every keystroke have missed the entire point, and interviewers ask this question specifically to see whether you make that separation.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"How many suggestions, and how fresh?"* — Top 5–10, and freshness within hours is usually fine except for breaking news.
- *"Personalised or global?"* — Global ranking with light personalisation on top is the standard compromise; a per-user index is not viable.
- *"Typo tolerance?"* — A separate and much harder layer. Scope it out initially and offer it as an extension.
- *"Multiple languages and scripts?"* — Normalisation, tokenisation, and character handling differ significantly; agree scope.
- *"Do we suggest queries, entities, or both?"* — Queries from logs is the classic problem.

**Agreed scope:** global query suggestions ranked by popularity with recency weighting, top 10, English plus basic Unicode normalisation, refreshed hourly. Typo tolerance and deep personalisation are extensions.

**Non-functional:** p99 under 50 ms end to end; a suggestion service outage must degrade silently (no suggestions, search still works); stale suggestions by up to an hour are acceptable.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 5B searches per day.
- Each search generates roughly 4–6 suggestion requests (one per keystroke after debouncing): about 25B suggestion requests per day, or **250,000 per second average** and perhaps 750,000 at peak.
- Distinct queries: hundreds of millions, but the distribution is extreme — the top 10 million queries cover the overwhelming majority of traffic.
- Index size: 10M queries × 50 bytes plus trie overhead is a few gigabytes. It fits in memory on one machine, which is the crucial observation.

**The conclusions:**

1. 250,000 requests per second at sub-50 ms means an in-memory lookup with no network hop to a database. Anything else fails the budget.
2. The index is small enough to replicate in full to every serving node, which eliminates sharding entirely at this size — and that simplification is worth stating.
3. Ranking must be precomputed, because you cannot score candidates at request time within the budget.""",
            ),
            (
                "Step 3: API Design",
                """The endpoint: `GET /v1/suggest?q=<prefix>&limit=10&lang=en`, returning `{suggestions: [{text, score}], prefix}`.

Client-side behaviour is part of the design and should be stated:

- **Debounce** 50–100 ms so a fast typist generates fewer requests than keystrokes.
- **Cancel in-flight requests** when a newer keystroke arrives; a late response for an earlier prefix must never overwrite the current suggestions — a real bug in naive implementations.
- **Cache locally**, because backspacing returns to a prefix already fetched.
- **Fail silently**: an error shows no suggestions rather than an error message.

These four client behaviours reduce backend load by more than any server-side optimisation, and mentioning them shows you are designing the feature rather than just the service.""",
            ),
            (
                "Step 4: Data Model",
                """**The serving structure** — a trie where each node stores the top-k completions for the prefix at that node, precomputed. A lookup is a walk of at most `len(prefix)` nodes followed by reading a small list. No aggregation, no sorting, no scoring at request time.

Alternative serving structure: a flat hash map from prefix to a precomputed top-k list, for prefixes up to some length. Simpler, larger, and arguably better in practice — memory is cheap and a hash lookup is a single operation. Being able to argue for the flat map over the elegant trie is a good sign, because the trie is the textbook answer and the map is often the better engineering choice.

**The source data** — an append-only log of queries with timestamps, geography, and result-click signals.

**The aggregate** — `(query, count_last_1h, count_last_24h, count_last_7d, score)`, rebuilt by the offline pipeline.""",
            ),
            (
                "Step 5: Architecture",
                """Two entirely separate paths, and drawing them separately is most of the answer.

**Offline (minutes to hours):**

Query logs → Aggregation → Filtering → Scoring → Trie build → Distribution

**Online (microseconds):**

Client → Edge cache → Suggest service (in-memory trie) → Response

The serving nodes never read a database, never call another service, and never compute a score. They walk a data structure in memory.""",
            ),
            (
                "How It Works",
                """### The offline pipeline

1. **Aggregate** query counts over several windows — the last hour, day, and week.
2. **Filter** aggressively. This step is more important than the ranking: remove queries below a frequency threshold (which also protects privacy, since a rare query may identify an individual), remove personally identifying strings, remove offensive and unsafe content, and remove spam and bot-generated queries.
3. **Score.** A weighted blend of long-term popularity and recent velocity, so a query trending today rises without a single day of noise dominating a stable ranking. Click-through on the resulting search is a better signal than query frequency alone, because it distinguishes queries that were satisfying from those that were merely typed.
4. **Build** the trie or prefix map with top-k stored at each node.
5. **Distribute** the new index to every serving node, which swap it atomically — build the new structure in memory, then flip a pointer. No downtime, no partial state.

### Why the live path cannot do this

Consider the alternative: on each keystroke, query a search index for terms matching the prefix, rank them, return the top ten. That is a distributed query, a scoring pass, and a sort, per keystroke, at 250,000 per second. It cannot meet a 50 ms budget and it would cost more than the search engine itself.

The general principle worth naming: **move work from read time to write time when reads outnumber writes by orders of magnitude.** Autocomplete is the extreme case of that principle.

### Handling the head of the distribution

Prefixes like `a`, `th`, and `fa` receive a huge share of traffic. They are cached at the CDN or edge with a short TTL, so a large fraction of requests never reach the service. Because the response for a given prefix is identical for all users (before personalisation), it is perfectly cacheable — an unusually favourable property.

### Personalisation without a per-user index

Building a trie per user is impossible. The workable approach:

1. Retrieve the global top 20 for the prefix.
2. Re-rank those 20 using the user's recent query history and location.
3. Optionally blend in the user's own recent queries matching the prefix, held client-side.

Retrieval stays global and cheap; personalisation is a cheap re-rank over a tiny candidate set. This retrieval-then-rank split is the same pattern as the news feed, and pointing out the similarity is a good move.

### Freshness for breaking events

The hourly rebuild is too slow when something suddenly becomes the most-searched query in the world. The standard solution is a two-tier index: the large hourly-built base index, plus a small real-time overlay built from the last few minutes of query volume, merged at lookup time. The overlay is tiny, so merging is cheap.

### Typo tolerance, if asked

- Precompute common misspellings from logs — users who search `recieve` then immediately search `receive` are labelling your data for you. This is by far the cheapest source of correction pairs.
- Edit-distance search over a trie, or an n-gram index, for the general case. Both are much more expensive than exact prefix matching, which is why they run as a fallback when exact matching yields too few results, not as the default path.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "Now the index does not fit in memory on one node."

Shard by prefix: nodes owning `a`–`f`, `g`–`m`, and so on. A request routes to one shard based on the first characters. Distribution is uneven — far more queries begin with `t` than with `z` — so shard by hash of the first two characters, or split by observed traffic rather than alphabetically.

Note the trade-off: sharding adds a routing hop and breaks the "replicate everything everywhere" simplicity. At this problem's real scale, the index fits in memory, so say that you would not shard until it genuinely did not.

### Round 2 — "A news event makes a new query the top search worldwide within minutes."

The real-time overlay described above. Say the merge is cheap because the overlay holds thousands of entries rather than millions.

### Round 3 — "The suggest service goes down entirely."

Nothing breaks. The client shows no suggestions and search continues to work. This is one of the few systems where complete failure is acceptable, and designing for silent degradation — rather than retries and error states — is the correct answer. Saying this explicitly is a good signal, because most candidates reflexively design resilience that this feature does not need.

### Round 4 — "How do you handle multiple languages and scripts?"

- Separate indexes per language, selected by the request's locale.
- Normalisation matters: accents, case, and Unicode composition must be handled consistently at both build and query time, or `café` and `cafe` behave inconsistently.
- Scripts without spaces (Chinese, Japanese) need different tokenisation, and prefix matching operates on characters rather than words. Recognising that the trie assumption is language-dependent is a nice detail.

### Round 5 — "Someone is poisoning your suggestions by botting a query."

- Frequency thresholds plus distinct-user counts rather than raw query counts — 10,000 searches from 12 users is not popularity.
- Anomaly detection on velocity.
- A manual blocklist and a review queue for suggestions that appear suddenly at high rank.
- This is a real and recurring problem for any system that surfaces aggregated user behaviour, and mentioning it unprompted shows you have thought about adversarial use.""",
            ),
            (
                "Failure Modes",
                """- **Querying the search index per keystroke**, which cannot meet the latency budget.
- **No debounce or request cancellation**, multiplying load and producing flickering out-of-order results.
- **Scoring at request time** instead of precomputing.
- **Index swap without atomicity**, serving a partially built structure.
- **No frequency threshold**, exposing rare queries that may contain personal information.
- **Bot-inflated suggestions**.
- **Stale index with no real-time overlay**, so the system is visibly behind during major events.""",
            ),
            (
                "Trade-offs",
                """- **Precomputed top-k versus live ranking.** Microsecond lookups and staleness, against freshness at impossible cost.
- **Trie versus flat prefix map.** Memory efficiency and elegance, against simplicity and a single hash lookup. Memory is cheap; simplicity often wins.
- **Rebuild frequency.** Fresher suggestions against pipeline cost; a two-tier index mostly resolves it.
- **Personalisation depth.** Better suggestions against cacheability — personalised responses cannot be shared at the edge, which is a significant loss.
- **Typo tolerance.** Better recall against substantially more expensive lookups; run it as a fallback, not a default.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"Why not query the search index?"** — Latency budget and cost, with the arithmetic.
- **"How fresh are suggestions?"** — Hourly base plus a real-time overlay for the head.
- **"How do you personalise?"** — Re-rank a global candidate set; never build a per-user index. Note the cacheability cost.
- **"How big is the index and where does it live?"** — A few gigabytes, replicated in full to every serving node, which is why there is no sharding.
- **"What happens when the service is down?"** — Nothing visible except the absence of suggestions, and that is the correct design.
- **"How do you keep offensive or private queries out?"** — Frequency thresholds, distinct-user thresholds, PII filtering, and blocklists in the offline pipeline, where you can afford the work.""",
            ),
            (
                "Common Mistakes",
                """- Hitting the search index on every keystroke
- Ignoring client-side debouncing and cancellation
- Building a trie per user for personalisation
- No filtering pipeline, so private or offensive queries surface
- Treating the suggest service as critical and over-engineering its availability
- Forgetting that the top-k must be precomputed at each node, not computed by traversing the subtree""",
            ),
            (
                "Interview Tip",
                """State the separation in the first thirty seconds: "Everything expensive happens in an offline pipeline; the live path is an in-memory prefix lookup returning a precomputed list." That single sentence is the design, and everything afterwards is elaboration.""",
            ),
        ],
        [
            "Precompute top-k per prefix offline; the live path is an in-memory lookup with no scoring and no database call.",
            "Client debouncing, cancellation and local caching remove more load than any server optimisation.",
            "Personalise by re-ranking a global candidate set — a per-user index is not viable, and personalisation costs edge cacheability.",
            "A two-tier index — hourly base plus a small real-time overlay — gives freshness without rebuilding constantly.",
        ],
        [
            "Why can you not query the search index on each keystroke?",
            "How do you keep suggestions fresh during a breaking news event?",
            "How would you personalise suggestions without a per-user index?",
            "What happens when the suggestion service fails, and why is that acceptable?",
        ],
    )


def _web_crawler() -> dict:
    return SD(
        "sd-web-crawler",
        "Design a Web Crawler",
        "A politeness-constrained distributed queue: frontier design, deduplication at scale, trap avoidance, and recrawl scheduling.",
        15,
        "**Interviewer:** \"Design a web crawler that starts from a set of seed URLs, fetches pages, extracts links, and builds a corpus for a search index.\"",
        [
            (
                "Why It Matters",
                """A crawler is a distributed queue with unusual constraints: you must not overwhelm any single site, you must avoid fetching the same content twice from a near-infinite URL space, and you must decide what to fetch next from a frontier of billions of candidates.

It tests whether you can design a system whose limiting factor is a policy — politeness — rather than a resource, and whether you understand probabilistic data structures, which is the natural answer to deduplication at this scale.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"What is the corpus target and time budget?"* — A billion pages a month is a very different system from a million.
- *"Do we need to render JavaScript?"* — This is the biggest cost question. A headless browser is roughly two orders of magnitude more expensive per page than an HTTP fetch.
- *"Freshness — do we recrawl?"* — Continuous recrawl with per-site frequency is a different scheduler from a one-off crawl.
- *"What do we store — raw HTML, extracted text, or both?"* — Determines the storage estimate.
- *"Do we honour robots.txt?"* — Yes, always. Say so unprompted.
- *"Any domain restrictions?"* — Whole web, or a vertical.

**Agreed scope:** crawl 1B pages per month, HTML only with JavaScript rendering for a selected subset, honour robots.txt and per-host rate limits, deduplicate URLs and content, store raw pages and extracted text, and recrawl based on observed change frequency.

**Non-functional:** never overload a host; be restartable without losing progress; avoid crawler traps; be politically well-behaved enough not to get blocked.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 1B pages per month ≈ 400 pages per second sustained.
- Average page 100 KB of HTML: 100 TB per month of raw content, or roughly 20 TB compressed.
- Extracted text averaging 10 KB: another 10 TB per month.
- Links: roughly 50 outlinks per page, so 50B URLs discovered per month, nearly all of them duplicates.
- Frontier size: tens of billions of known URLs.

**The conclusions:**

1. 400 pages per second is easily achievable in raw bandwidth — that is 40 MB/s. The limit is politeness: at one request per second per host, you need at least 400 distinct hosts in flight at all times, and realistically thousands, because hosts are not uniformly available.
2. 50B URL dedup checks per month against a set of tens of billions cannot be exact lookups against a database on the hot path. This is where a Bloom filter earns its place.
3. Storage grows at 30 TB per month, so the store is object storage with metadata in a database — never pages in rows.""",
            ),
            (
                "Step 3: Component Design",
                """There is no external API; the interfaces are internal, and naming them is the design.

- **Seeder** — injects initial and manually prioritised URLs.
- **Frontier** — the prioritised set of URLs to fetch, organised so politeness is structurally guaranteed.
- **Fetcher workers** — pull URLs, respect robots and delays, download.
- **Renderer pool** — optional headless browsers for JavaScript-heavy pages.
- **Parser** — extracts links, text, and metadata.
- **URL filter and deduplicator** — normalises and rejects already-seen URLs.
- **Content deduplicator** — detects identical and near-identical pages.
- **Storage** — raw pages in object storage, metadata in a database.
- **Scheduler** — decides recrawl timing per URL.""",
            ),
            (
                "Step 4: Data Model",
                """**url_frontier** — partitioned by host. Each host has its own FIFO queue plus a `next_allowed_fetch_time`. A separate priority structure selects which host queue to serve next.

**url_state** — `url_hash` (primary key), `host`, `first_seen`, `last_fetched`, `last_status`, `content_hash`, `change_frequency_estimate`, `priority`.

**robots_cache** — `host → rules, crawl_delay, fetched_at`, with a TTL of hours.

**pages** — object storage keyed by content hash, so identical content across URLs is stored once.

**content_index** — `content_hash → canonical_url`, plus a SimHash or MinHash value for near-duplicate detection.

The frontier's shape — queues per host, not one global queue — is the single most important structural decision, because it makes politeness a property of the data structure rather than a rule that workers must remember to follow.""",
            ),
            (
                "Step 5: Architecture",
                """Frontier (per-host queues) → Fetcher pool → Parser → URL filter → Frontier

With side flows to object storage, the content deduplicator, and the scheduler.

The fetcher pool is stateless and horizontally scalable. The frontier is the stateful, interesting component and the one to deep-dive.""",
            ),
            (
                "How It Works",
                """### The frontier, in two layers

This is the Mercator design and it is the expected answer.

**Front queues (priority):** several queues, one per priority level. A URL's priority comes from its PageRank-like importance, its change frequency, and how long since it was last crawled. A selector picks a front queue with a bias toward high priority.

**Back queues (politeness):** many queues, each dedicated to exactly one host. A URL taken from a front queue is routed to its host's back queue. Each back queue has a timestamp indicating when its host may next be contacted.

A worker takes the back queue whose next-allowed time has passed, fetches one URL from it, and sets a new next-allowed time based on `crawl_delay` or a default. Because a host maps to exactly one back queue and a back queue is served by one worker at a time, **it is structurally impossible to exceed the rate limit for a host**, no matter how many workers exist.

That structural guarantee is the insight. Contrast it with the naive design — a global queue plus a rate-limit check — where a popular host's URLs cluster in the queue and many workers contend on the same host simultaneously.

### URL deduplication at scale

50 billion discovered URLs per month against a set of tens of billions.

1. **Normalise first.** Lowercase the host, remove default ports, sort or strip query parameters that do not affect content (`utm_source`, session ids), resolve relative paths, remove fragments. Normalisation eliminates the majority of apparent duplicates before any lookup.
2. **Bloom filter in memory** for the fast negative check. A Bloom filter for 10 billion URLs at a 1% false-positive rate needs roughly 12 GB. False positives mean occasionally skipping a genuinely new URL, which for a web crawl is an acceptable loss — and being able to say that the error mode is tolerable is exactly why the structure fits here.
3. **Exact store** behind it for the cases the filter says it has seen, if you need certainty.

Note the direction of the error: a Bloom filter never produces a false negative, so it never causes a re-fetch; it only occasionally skips something. That asymmetry is what makes it correct for this use.

### Content deduplication

Different URLs frequently serve identical or near-identical content — mirrors, print versions, session-id variants, syndicated articles.

- **Exact duplicates:** hash the normalised content; store once, map many URLs to one content hash.
- **Near-duplicates:** SimHash produces similar fingerprints for similar documents, so near-duplicates are detected by Hamming distance between fingerprints. This catches templated pages differing only in a timestamp or an advert.

### Traps and hazards

Real crawlers spend a lot of design effort here, and mentioning these is what distinguishes someone who has thought about the web as it actually is:

- **Infinite URL spaces** — calendars generating a page per day forever, faceted search producing combinatorial URLs. Defences: depth limits, per-host page caps, detecting parameter patterns that generate unbounded variation, and detecting near-duplicate content.
- **Redirect loops** — cap the redirect chain.
- **Slow-response tarpits** — strict timeouts and per-host budgets.
- **Enormous files** — content-length limits and streaming with a cap.
- **Soft 404s** — pages returning 200 with "not found" content, detected by near-duplicate matching against known error pages.

### Recrawl scheduling

A news homepage changes hourly; an archived page does not change for years. Recrawling both weekly is doubly wrong.

Estimate change frequency per URL from observed history: if the content hash has not changed over the last five crawls, back off exponentially; if it changes on every crawl, crawl more often. Combine with importance, so a high-traffic page is checked more often than an obscure one even at the same change rate.

This makes recrawl a scheduling and estimation problem rather than a fixed loop, and framing it that way is the mature answer.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "Scale to 10x: 4,000 pages per second."

- Fetchers are stateless; add more.
- The frontier must be partitioned. Shard by hash of host, so all URLs for a host live on one frontier shard and the politeness guarantee survives sharding. This is the constraint that decides the shard key.
- The Bloom filter is also partitioned by URL hash, with each frontier shard owning its own filter.
- Politeness now requires at least 4,000 distinct hosts in flight; in practice you need tens of thousands, so host discovery and breadth become a priority in the frontier's scheduling.

### Round 2 — "A large site complains that we are hammering them."

- Check `crawl_delay` in robots.txt and honour it strictly.
- Implement adaptive politeness: if a host's response times increase or errors rise, back off automatically. Treating the target's latency as a backpressure signal is the right instinct and is what a well-behaved crawler does.
- Provide a clear user-agent and a contact address so operators can reach you rather than blocking you.
- Support a per-host override for sites that request it.

### Round 3 — "Half the pages we care about require JavaScript."

- A separate rendering pool of headless browsers, which is 10–100x the cost per page and much slower.
- Do not render everything: classify pages first — render if the static HTML has very little content relative to the script volume, or if the domain is known to require it.
- Rendering pools need their own resource limits and aggressive timeouts, because a hostile or broken page can consume an entire browser instance indefinitely.

### Round 4 — "A fetcher crashes holding 500 URLs."

The frontier uses a lease model: a URL is leased to a worker for a period and returns to the queue if not acknowledged. A crash costs the lease duration, not the URLs. Fetching is idempotent — re-fetching a page is harmless — so at-least-once processing is entirely acceptable here, which simplifies everything.

### Round 5 — "How do you prioritise what to crawl with a finite budget?"

You can never crawl everything, so the frontier's priority function is the product. Inputs: link-graph importance, observed change frequency, freshness of the current copy, user demand signals if you have them, and domain-level quality. Budget is allocated per host so a single large site cannot consume the whole crawl.

This is the place to say something senior: a crawler is not a program that visits all pages; it is a system that continuously allocates a scarce budget across a near-infinite candidate set.""",
            ),
            (
                "Failure Modes",
                """- **A single global frontier queue**, clustering requests to popular hosts and violating politeness.
- **In-memory dedup on one node**, lost on restart and not shared across workers.
- **Crawler traps** consuming the entire budget on one site's infinite calendar.
- **No robots.txt handling**, resulting in blocks and complaints.
- **Fetching the same content under many URLs** because of missing normalisation.
- **No lease or acknowledgement**, so a worker crash loses URLs permanently.
- **Uniform recrawl intervals**, wasting most of the budget on unchanged pages.
- **Unbounded page sizes or redirect chains**.""",
            ),
            (
                "Trade-offs",
                """- **Politeness versus throughput.** Strict per-host delays cap the rate per site; total throughput comes from breadth across hosts, not depth on any one.
- **Bloom filter versus exact dedup.** Tiny memory and a small rate of skipped URLs, against exact correctness and much higher cost.
- **Rendering versus cost.** Complete coverage of modern sites against a 10–100x per-page cost; render selectively.
- **Breadth-first versus priority-driven.** Simple and fair, against a crawl that spends its budget where it matters.
- **Storing raw HTML versus extracted text only.** Reprocessability later against a much larger store.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"How do you avoid hammering one site?"** — Per-host back queues with a next-allowed timestamp, so politeness is structural rather than a check.
- **"How do you know you have seen a URL before?"** — Normalise, then a partitioned Bloom filter, and explain why the false-positive direction is acceptable.
- **"What about two URLs with the same content?"** — Content hashing plus SimHash for near-duplicates.
- **"How do you handle a site with infinite URLs?"** — Depth and per-host caps, parameter-pattern detection, and near-duplicate content detection.
- **"How do you decide what to crawl next?"** — A priority function over importance, change frequency, and staleness, with per-host budgets.
- **"A worker dies mid-fetch. What happens?"** — Lease expiry returns the URL; re-fetching is idempotent, so at-least-once is fine.""",
            ),
            (
                "Common Mistakes",
                """- One global FIFO frontier
- No robots.txt or crawl-delay handling
- Deduplication only in a single process's memory
- Ignoring URL normalisation, so the same page is fetched dozens of times
- Treating all pages as equally worth recrawling
- No trap defences
- Assuming static HTML is the whole web""",
            ),
            (
                "Interview Tip",
                """Lead with the frontier's two-layer structure and explain that per-host back queues make politeness impossible to violate rather than merely enforced. That structural framing is the strongest single idea in this problem, and it also decides your shard key when you scale out.""",
            ),
        ],
        [
            "Per-host back queues make politeness a structural property, not a rule workers must remember.",
            "Normalise URLs first, then use a partitioned Bloom filter — its false positives skip pages, which is a tolerable error direction.",
            "Deduplicate content as well as URLs; SimHash catches the near-duplicates that hashing misses.",
            "A crawler continuously allocates a scarce budget over a near-infinite candidate set, so priority and recrawl estimation are the product.",
        ],
        [
            "How do you guarantee you never overload a single host?",
            "How do you check whether a URL has been seen, at tens of billions of URLs?",
            "How do you handle a site that generates infinite URLs?",
            "How do you decide what to crawl next and how often to recrawl?",
        ],
    )


def _job_scheduler() -> dict:
    return SD(
        "sd-job-scheduler",
        "Design a Distributed Job Scheduler",
        "Running the right job exactly once at the right time across a fleet, and surviving workers that die mid-task.",
        16,
        "**Interviewer:** \"Design a distributed job scheduler. Users register jobs — one-off or recurring on a cron expression — and the system runs them reliably across a worker fleet.\"",
        [
            (
                "Why It Matters",
                """This problem is a concentrated test of coordination, idempotency, and failure handling. The headline requirement — "run each job exactly once" — is impossible in the strict sense, and the interviewer knows it. What they are checking is whether you know it too, and whether you reach for idempotency rather than trying to build a perfect lock.

It also has a clean progression: the naive design is a cron on every node, which runs everything N times; the next is a lock, which is subtly broken; and the right answer makes duplicate execution harmless.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"One-off, recurring, or both?"* — Both, and recurring jobs raise the question of what happens when a run is missed.
- *"Exactly once, at least once, or at most once?"* — Push on this. "Exactly once" is not achievable across a network and an external side effect; what you can offer is at-least-once execution with idempotent jobs, or at-most-once with the risk of a skipped run.
- *"What is the timing precision?"* — Within a second, or within a minute? Precision costs a lot.
- *"How long can a job run?"* — Seconds to hours changes the lease design entirely.
- *"Do jobs have dependencies?"* — A DAG of jobs is a workflow engine, which is a bigger problem. Scope it out or discuss briefly.
- *"What happens if a scheduled run is missed?"* — Skip, run late, or run all missed occurrences? A real product decision.

**Agreed scope:** one-off and cron-recurring jobs, at-least-once execution with idempotency support, second-level precision, jobs up to one hour, retries with backoff, and a dead-letter path. Job DAGs out of scope.

**Non-functional:** a job scheduled for time T starts within a few seconds of T; no job is silently skipped; a worker crash delays a job rather than losing it; the system handles 100,000 scheduled jobs per minute.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 10M registered jobs, of which 100,000 fire per minute at peak: about 1,700 executions per second.
- Average job duration 5 seconds: 1,700 × 5 = **8,500 concurrently running jobs**, which sets the worker fleet size.
- Execution records: 150M per day at 500 bytes is 75 GB per day, so retention and partitioning are needed.
- Scheduling query: "which jobs are due in the next N seconds?" runs continuously and must be cheap.

**The conclusions:**

1. The due-jobs query is the hot path. Indexing and partitioning it correctly is the core data-modelling decision.
2. 8,500 concurrent executions means workers are the scaling dimension, and they must be stateless and replaceable.
3. 150M execution records per day means the history table needs time partitioning and a retention policy from day one.""",
            ),
            (
                "Step 3: API Design",
                """- `POST /v1/jobs` with `{name, schedule, payload, target, timeout, max_retries, idempotency_mode}` returns `201 {job_id}`. The `schedule` is either a timestamp or a cron expression with a timezone — and the timezone matters, because "every day at 9am" across a daylight-saving transition is a genuine source of bugs.
- `GET /v1/jobs/{id}/runs?cursor=` returns execution history with status, duration, and errors.
- `POST /v1/jobs/{id}/trigger` for a manual run.
- `PATCH /v1/jobs/{id}` to pause, resume, or reschedule.
- `POST /v1/runs/{run_id}/complete` — the worker callback reporting success or failure.

One design decision worth defending: the system delivers jobs to workers rather than workers polling arbitrary queues, and every execution has a `run_id` that the worker echoes back. That `run_id` is what makes the whole thing traceable and idempotent.""",
            ),
            (
                "Step 4: Data Model",
                """**jobs** — `job_id`, `owner`, `schedule`, `timezone`, `payload`, `target`, `timeout_s`, `max_retries`, `state`, `next_run_at`.

The critical index is on `next_run_at` for enabled jobs — ideally a partial index restricted to active jobs, because it is queried continuously and most jobs are not due.

**runs** — `run_id`, `job_id`, `scheduled_for`, `started_at`, `finished_at`, `status`, `attempt`, `worker_id`, `lease_expires_at`, `error`. Partitioned by `scheduled_for` month so old partitions are dropped rather than deleted.

The uniqueness constraint that does the real work: **`UNIQUE (job_id, scheduled_for, attempt)`**. Two schedulers that both decide job 42 is due at 09:00:00 will both try to insert the same row, and exactly one will succeed. That constraint, not a distributed lock, is what prevents duplicate scheduling.

**workers** — `worker_id`, `last_heartbeat`, `capacity`, `current_load`.""",
            ),
            (
                "Step 5: Architecture",
                """Scheduler (finds due jobs) → Run records → Dispatch queue → Workers → Completion callback

Plus a reaper process that finds runs whose lease has expired and returns them for retry.

Three components, and the interesting behaviour is in the interaction between the scheduler's uniqueness constraint and the reaper's lease expiry.""",
            ),
            (
                "How It Works",
                """### Finding due jobs

The scheduler runs in a loop, every second or so:

1. Query jobs where `next_run_at <= now() + lookahead` and state is active, limited to a batch.
2. For each, insert a run row with the unique constraint on `(job_id, scheduled_for, attempt)`.
3. Advance `next_run_at` for recurring jobs by evaluating the cron expression.
4. Enqueue the run for dispatch.

Run several scheduler instances for availability. They will race, and that is fine: the unique constraint means duplicate inserts fail harmlessly. This is the key design move — **no leader election is needed for the scheduler, because the database constraint provides the mutual exclusion.**

To reduce wasted work, partition the job space across schedulers by hash, so they rarely contend. But correctness does not depend on the partitioning, only performance does — which is exactly the property you want.

### Dispatch and leases

1. A worker pulls a run from the dispatch queue, or the dispatcher pushes to a worker with capacity.
2. The run row is updated to `running` with `worker_id` and `lease_expires_at = now() + timeout`.
3. The worker executes, heartbeating to extend the lease for long jobs.
4. On completion, the worker reports the outcome and the row moves to `succeeded` or `failed`.

### The reaper

A background process finds runs in `running` whose `lease_expires_at` has passed and returns them for retry as a new attempt.

This is where the impossibility surfaces, and it should be stated plainly: **a lease expiring does not mean the job did not run.** The worker may have completed the work and died before reporting, or may be alive and paused and about to finish. Either way you cannot tell, so retrying means the job may execute twice.

### Which is why jobs must be idempotent

The resolution, and the sentence to deliver:

> "I cannot guarantee exactly-once execution — a worker can complete the work and die before acknowledging. What I can guarantee is at-least-once delivery with a stable `run_id`, and the job contract requires idempotency keyed on that id. For jobs that genuinely cannot be made idempotent, I would offer an at-most-once mode that does not retry, and be explicit that a run can then be skipped."

Offering both modes, and being honest about what each gives up, is the complete answer.

Practical idempotency support the scheduler can provide: pass `run_id` to every execution so the job can deduplicate; make the results table keyed by `(job_id, scheduled_for)` so a duplicate write is rejected; and expose "has this run already completed?" to the worker before it starts expensive work.

### Recurring jobs and missed runs

If the system was down from 09:00 to 11:00 and a job runs hourly, what should happen at 11:00?

Three policies, and the right answer is that it is configurable per job:

- **Skip** — only run the current occurrence. Correct for a job that refreshes a cache.
- **Run once** — catch up with a single run. Correct for most reporting.
- **Backfill all** — run every missed occurrence. Correct for a job that processes a time window and must not leave gaps.

Having a considered answer to this, rather than an implicit one, is a strong signal — it is the question that separates a scheduler from a cron loop.

### Cron and timezones

Evaluating a cron expression in a timezone with daylight saving produces two genuinely ambiguous cases: a time that occurs twice (clocks going back) and a time that does not occur (clocks going forward). Decide and document: run once for the duplicated hour, and run at the next valid time for the skipped one. Interviewers who have operated a scheduler will notice if you raise this unprompted.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "10x: 1M jobs firing per minute."

- Partition the jobs table by hash and give each scheduler instance a partition, so the due-jobs query is local and contention disappears.
- The dispatch queue partitions naturally by job id.
- The runs table grows to 1.5B rows per day; partition by hour rather than month, and move completed runs to cheaper storage quickly.
- Workers scale horizontally; they are stateless.

### Round 2 — "A single job must run every second, and it is late."

Second-level precision means the scheduler loop must run at sub-second intervals with a lookahead, pre-loading due jobs into memory and dispatching at the exact moment. The trade-off is that a scheduler holding jobs in memory for dispatch can lose them on a crash — so the run row is created before the in-memory hold, making recovery possible.

### Round 3 — "A job's target service is down and 50,000 runs are failing."

- Exponential backoff with jitter per job, not a fixed retry interval, or all 50,000 retry simultaneously.
- A circuit breaker per target: once a target is clearly failing, stop dispatching to it and hold runs rather than burning retries.
- After `max_retries`, runs go to a dead-letter state with an alert — and crucially, the alert is on the *rate* of dead-lettering, not each individual failure.

### Round 4 — "A worker is paused by garbage collection for 90 seconds; its lease expires; the reaper retries; then it wakes and completes."

Two executions of the same run. Exactly the scenario that proves exactly-once is not available.

Mitigations: the worker checks whether it still holds the lease before performing any side effect (which narrows but does not close the window); the job is idempotent on `run_id`; and if the target supports it, the worker passes `run_id` as an idempotency key so the *target* deduplicates. That last one is the only genuinely complete fix, and it requires cooperation from the thing being called — which is a true and useful thing to say.

### Round 5 — "How do you support jobs with dependencies?"

Acknowledge the scope change: a DAG of jobs is a workflow engine. The scheduler becomes the timer that starts a workflow, and a workflow service tracks state across steps, handles partial failure, and supports compensation. Attempting to encode dependencies as "job B is scheduled 10 minutes after job A" is the wrong answer and worth naming as such.""",
            ),
            (
                "Failure Modes",
                """- **Cron on every node**, running every job N times.
- **A distributed lock as the correctness mechanism**, broken by pauses and clock skew.
- **No lease expiry**, so a crashed worker's job never runs.
- **Lease shorter than the job duration**, causing systematic duplicate execution under load.
- **No missed-run policy**, so an outage silently skips hours of work.
- **Synchronised retries** after a target recovers, immediately knocking it over again.
- **Unbounded runs table**, degrading the due-jobs query over time.
- **Daylight saving ambiguity** producing duplicate or skipped runs twice a year.""",
            ),
            (
                "Trade-offs",
                """- **At-least-once versus at-most-once.** Duplicate execution against skipped runs; offer both and let the job owner choose.
- **Lease duration.** Short leases recover quickly from crashes and cause duplicates for slow jobs; long leases are safe and delay recovery.
- **Scheduler partitioning.** Reduces contention and adds a rebalancing problem; correctness stays with the constraint either way.
- **Precision versus cost.** Second-level scheduling requires tight loops and in-memory pre-loading; minute-level is dramatically cheaper.
- **Retention of run history.** Valuable for debugging and auditing, and expensive at billions of rows.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"How do you guarantee a job runs exactly once?"** — You cannot; explain the pause-and-expire scenario and offer at-least-once with idempotency, or at-most-once without retries.
- **"How do you prevent two schedulers from double-scheduling?"** — A unique constraint on `(job_id, scheduled_for, attempt)`, not a lock. Explain why the constraint is stronger.
- **"A worker dies mid-job. What happens?"** — Lease expires, the reaper creates a new attempt, and the job must tolerate having partially run.
- **"The system was down for two hours. What happens to hourly jobs?"** — Name the three policies and say it is per-job configuration.
- **"How do you handle a job that takes an hour?"** — Heartbeat-extended leases, and a hard timeout so a hung job does not hold a slot forever.
- **"How do you avoid a retry storm?"** — Per-job exponential backoff with jitter, plus a per-target circuit breaker.""",
            ),
            (
                "Common Mistakes",
                """- Claiming exactly-once execution
- Using a TTL-based distributed lock as the correctness mechanism
- No lease or reaper, so crashes lose jobs
- Ignoring the missed-run question entirely
- Fixed retry intervals producing synchronised storms
- No partitioning or retention on the runs table
- Treating job dependencies as a timing problem""",
            ),
            (
                "Interview Tip",
                """When the interviewer says "exactly once", correct it immediately and constructively: "Exactly-once execution is not achievable, because a worker can complete the work and die before acknowledging. I will design at-least-once with a stable run id, and make idempotency part of the job contract." That single exchange usually settles the level of the conversation.""",
            ),
        ],
        [
            "Exactly-once execution is impossible; offer at-least-once with a stable run id and idempotent jobs, or at-most-once without retries.",
            "Prevent double-scheduling with a unique constraint on (job_id, scheduled_for, attempt) rather than a distributed lock.",
            "Leases plus a reaper handle worker crashes; a lease expiring never proves the work did not happen.",
            "Missed-run policy — skip, run once, or backfill — is a per-job product decision that must be explicit.",
        ],
        [
            "How do you guarantee a job runs exactly once, and what do you say when it cannot?",
            "How do two scheduler instances avoid scheduling the same run twice?",
            "A worker is paused, its lease expires, the job is retried, then it wakes up. What happens?",
            "The scheduler was down for two hours. What should recurring jobs do?",
        ],
    )


def _payment_system() -> dict:
    return SD(
        "sd-payment-system",
        "Design a Payment System",
        "Money makes every distributed systems problem serious: idempotency, ledgers, sagas across providers, and reconciliation.",
        18,
        "**Interviewer:** \"Design a payment system. Users pay merchants with a card; we integrate with external payment providers, and we must never lose or duplicate money.\"",
        [
            (
                "Why It Matters",
                """Every technique in the distributed systems module appears here with the stakes raised: an ambiguous timeout is a possible double charge, an unhandled duplicate is a real financial loss, and eventual consistency on a balance is a regulatory problem.

It is also the problem where the correct answer is the most conservative: append-only ledgers, idempotency keys everywhere, sagas rather than distributed transactions, and reconciliation as a first-class system rather than a nightly script. Candidates who propose a clever optimisation here are usually signalling that they have not worked on payments.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"Are we the payment processor, or integrating with one?"* — Integrating. We never store raw card numbers; we tokenise via the provider.
- *"Which flows — authorisation and capture, refunds, chargebacks, payouts?"* — All of them eventually; start with auth-capture and refunds.
- *"Single provider or several?"* — Several, for redundancy and cost routing. This makes it a routing problem as well as a payments one.
- *"Do we hold balances, or is it pass-through?"* — Holding balances makes us a ledger system with far stricter requirements.
- *"What are the consistency requirements?"* — Strong for money movement, and every state change must be auditable.
- *"Compliance scope?"* — PCI DSS if card data is anywhere near us, which is the argument for tokenisation and a narrow compliance boundary.

**Agreed scope:** authorise and capture card payments through multiple providers, refunds, webhook handling, a double-entry ledger, and reconciliation. Payouts and chargebacks acknowledged and deferred.

**Non-functional:** no double charges ever; no lost payments; every state change auditable indefinitely; p99 authorisation under 3 seconds; the system must remain correct when a provider times out ambiguously.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 10M payments per day: about 120 per second average, 500 at peak. This is low volume by internet standards, and worth saying so — the difficulty is entirely in correctness, not throughput.
- Ledger entries: each payment produces several double-entry rows across its lifecycle, so roughly 100M rows per day.
- Retention: financial records are typically kept for seven years. 100M × 365 × 7 × 200 bytes ≈ 50 TB, which is large but ordinary.
- Webhooks in: several per payment, retried by providers, so hundreds per second with heavy duplication.

**The conclusions:**

1. Throughput is not the problem. A single well-designed relational database handles this comfortably, and choosing one is the right call — transactions and constraints are exactly what this workload needs.
2. The ledger is the largest table and is append-only, which makes time partitioning and archival straightforward.
3. Duplicate webhooks are not an edge case; they are the normal operating condition, so deduplication is on the main path.""",
            ),
            (
                "Step 3: API Design",
                """- `POST /v1/payments` with header `Idempotency-Key` (mandatory, not optional) and body `{amount, currency, payment_method_token, merchant_id, reference, capture: true|false}`. Returns `201 {payment_id, status}`.
- `POST /v1/payments/{id}/capture` for deferred capture.
- `POST /v1/payments/{id}/refunds` with its own idempotency key and `{amount, reason}`.
- `GET /v1/payments/{id}` is the authoritative status — clients poll this or subscribe to webhooks.
- `POST /webhooks/{provider}` receives provider callbacks, signature-verified.

Two rules to state explicitly:

1. **The idempotency key is required.** A payments API that accepts a charge request without one is inviting double charges, and making it mandatory is a design decision worth defending.
2. **Every response is a state, never a boolean.** `pending`, `authorised`, `captured`, `failed`, `unknown`. The `unknown` state is the honest one and is the reason reconciliation exists.""",
            ),
            (
                "Step 4: Data Model",
                """**payments** — `payment_id`, `idempotency_key` (unique per merchant), `merchant_id`, `amount`, `currency`, `status`, `provider`, `provider_reference`, `created_at`, `updated_at`. The status is a validated state machine.

**payment_events** — append-only: `(payment_id, seq, event_type, payload, created_at)`. Every transition is recorded. This table, not the payment row, is the truth about what happened and when — the row is a projection of it.

**ledger_entries** — double-entry and immutable: `(entry_id, transaction_id, account_id, direction, amount, currency, created_at)`. Every transaction has entries that sum to zero. Nothing is ever updated or deleted; a mistake is corrected by a compensating entry, which is how accounting has worked for six hundred years and is exactly right here.

**accounts** — merchant balance, platform fee, provider settlement, reserve. Balances are derived by summing entries, with periodic snapshots so the sum is bounded.

**idempotency_keys** — `key`, `request_hash`, `status`, `response`, `created_at`.

**provider_webhooks** — `(provider, provider_event_id)` unique, with the raw payload retained.

The two decisions to defend: **the ledger is append-only with balances derived**, so no concurrent update can corrupt a balance and every figure is explainable; and **the event log is the source of truth**, so disputes months later are answerable.""",
            ),
            (
                "Step 5: Architecture",
                """Client → Payment API → Payment service → Provider adapter → External provider

Payment service → Ledger service (same transaction where possible)

Provider → Webhook receiver → Queue → Event processor → Payment state + Ledger

Reconciliation service → Provider settlement files → Compare against ledger → Exceptions queue

The reconciliation path is drawn as a first-class component, not an afterthought. That placement alone communicates that you understand the domain.""",
            ),
            (
                "How It Works",
                """### The authorisation flow, with the ambiguity handled

1. Request arrives with an idempotency key.
2. Insert the key with status `in_progress`. A conflict means a duplicate: return the stored response if complete, or `409` if still running.
3. Create the payment row in `pending` and write a `payment.created` event. Commit.
4. Call the provider, passing our `payment_id` as the provider's idempotency key.
5. On success, record `authorised`, write the event and the ledger entries, store the response against the idempotency key. Commit.
6. Return.

**Step 4 is where the money is at risk.** Three outcomes:

- **Success response** — straightforward.
- **Explicit failure** — mark failed; no money moved.
- **Timeout or network error** — *unknown*. The charge may or may not have happened.

The handling of the third case is the whole interview:

- Do **not** retry blindly. Retry only with the same provider idempotency key, so the provider returns the original result rather than charging again.
- If the provider does not support idempotency keys, query by our reference before retrying: "does a charge with reference X exist?"
- If neither is possible, mark the payment `unknown`, do not tell the customer it failed, and resolve it in reconciliation. An unknown payment that is later found to have succeeded is recoverable; a duplicate charge is a refund, an apology, and sometimes a regulatory report.

Say this out loud: **the correct response to ambiguity is to record the ambiguity, not to guess.**

### Double-entry ledger

Every movement is at least two entries that sum to zero.

A £100 payment with a £3 fee:

| Account | Direction | Amount |
| --- | --- | --- |
| Customer receivable | credit | 100.00 |
| Merchant payable | debit | 97.00 |
| Platform revenue | debit | 3.00 |

Properties this buys you:

- **Balances cannot drift**, because the invariant "every transaction sums to zero" is checkable continuously and any violation is a bug caught immediately.
- **No concurrent update problem**, because you append rather than update a balance row. The hot-row contention that would otherwise exist on a popular merchant simply does not arise.
- **Complete auditability** — you can reconstruct any balance at any past moment.
- **Corrections are reversals**, never edits, so history is never rewritten.

Balance queries sum entries since the last snapshot, and snapshots are written periodically, so the sum is always over a bounded number of rows.

### Webhooks

Providers deliver asynchronously, at-least-once, out of order, and sometimes long after the fact.

1. Verify the signature. An unsigned or wrongly signed webhook is discarded — this is a genuine attack surface.
2. Insert `(provider, provider_event_id)` with a unique constraint; a conflict means a duplicate and the request is acknowledged with no further action.
3. Acknowledge quickly with `200`, then process asynchronously. A provider that times out will retry, multiplying load exactly when you are slow.
4. Process against the state machine, not by assumption: a `captured` event arriving before `authorised` is applied by state rules, and an event for an unknown payment is parked for retry rather than discarded.

### Multiple providers and routing

Each provider sits behind an adapter with a common interface. Routing considers cost, the issuing country, the card scheme, and current health. A provider failing health checks is removed from routing, and a payment that failed with one provider may be retried with another — but **only if the first attempt is definitively known to have failed**, never when it is unknown.

That distinction is a good example of a rule that only makes sense once you take the unknown state seriously.

### Reconciliation

Providers publish settlement files daily. A reconciliation job compares three sources: our ledger, our payment records, and the provider's file.

Discrepancy classes:

- **In the provider file, not in our ledger** — we lost an event, usually a missed webhook. Ingest it.
- **In our ledger, not in the provider file** — we recorded something that did not happen. Investigate urgently.
- **Amount mismatch** — fees, currency conversion, or a partial capture.
- **Unknown payments now resolved** — the ambiguous cases from earlier, finally decided.

Every unresolved discrepancy goes to a human queue with an ageing alert. **No payment system runs without reconciliation**, because no amount of careful design removes ambiguity from a network — and saying that sentence is, in this problem, the strongest signal you can give.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A customer double-clicks the pay button."

Two requests, same idempotency key, arriving milliseconds apart. The unique constraint means one insert wins; the other sees `in_progress` and receives `409`, and the client retries a moment later to get the real result. One charge. This is why the key must be enforced by a constraint rather than a read-then-write check.

### Round 2 — "The provider times out on 5% of requests during an incident."

- Those payments enter `unknown`.
- A background resolver queries the provider's status API for each, with backoff, and resolves them over the following minutes or hours.
- Customers see "processing" rather than a success or failure, which is honest.
- No automatic retry against a second provider while the state is unknown — that is exactly how double charges happen.

### Round 3 — "We need to support refunds, and a refund fails after we told the customer it succeeded."

Refunds are their own state machine and their own ledger transaction, with an idempotency key of their own. The rule is that you never mark a refund as complete until the provider confirms it; the customer-facing status must reflect the true state, and "refund initiated" is a different statement from "refund completed".

A failed refund goes to the exceptions queue. Money owed to a customer that has not moved is an incident with a clock on it, not a ticket.

### Round 4 — "How do you support multiple currencies?"

- Store amounts as integers in the currency's minor unit. **Never floating point** — this is a reliable interview tripwire.
- Store the currency with every amount and never sum across currencies without an explicit conversion.
- Conversion uses a rate captured and stored at transaction time, because the rate on the day of a dispute is not the rate that applied.
- Ledger accounts are per currency, so the zero-sum invariant holds within each.

### Round 5 — "How do you handle a chargeback six months later?"

- The event log and ledger still contain everything, because nothing was ever deleted or updated.
- A chargeback is a new transaction reversing the original, plus a fee — not an edit of the original.
- Evidence for dispute is assembled from the event log and from stored metadata about the transaction.
- This is the payoff for append-only design, and it is worth saying so: the reason for the discipline is precisely the question being asked six months later.""",
            ),
            (
                "Failure Modes",
                """- **Blind retry on timeout**, producing duplicate charges.
- **Mutable balance rows**, which drift and cannot be audited.
- **Floating-point amounts**, producing rounding errors that compound.
- **Trusting webhook delivery** with no reconciliation, so lost events cause silent divergence.
- **Unverified webhook signatures**, allowing forged payment confirmations.
- **Treating an unknown outcome as a failure**, telling the customer it failed when they were charged.
- **Deleting or editing financial records** rather than writing reversals.
- **Retrying a different provider while the first attempt's state is unknown.**""",
            ),
            (
                "Trade-offs",
                """- **Synchronous versus asynchronous authorisation.** Immediate answers against provider latency and timeouts; most systems are synchronous with an asynchronous resolution path for the ambiguous cases.
- **Single versus multiple providers.** Redundancy and better routing economics, against much more reconciliation and adapter maintenance.
- **Strict consistency everywhere.** The right choice for money, and it costs latency and rules out several scaling techniques that would be fine elsewhere.
- **Holding balances versus pass-through.** More product capability and a far heavier regulatory and correctness burden.
- **Aggressive automated resolution versus human review.** Speed against the risk of automating a mistake with money; payments systems deliberately keep humans in the loop.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"The provider call times out. Did the charge happen?"** — Unknown. Record it as unknown, resolve by status query, never blind-retry, never tell the customer it failed.
- **"How do you prevent double charges?"** — Idempotency keys enforced by a unique constraint, passed through to the provider, at both layers.
- **"Why double-entry?"** — Continuous verifiability, no mutable balance to corrupt, no hot-row contention, and complete auditability.
- **"What if a webhook is lost?"** — Reconciliation against the provider's settlement file finds it. Webhooks are an optimisation; reconciliation is the guarantee.
- **"How do you store money amounts?"** — Integer minor units with an explicit currency. Never floats.
- **"How do you handle a partial failure across services?"** — Saga with compensating transactions, and the compensations are business actions such as refunds, with their own failure paths.""",
            ),
            (
                "Common Mistakes",
                """- Retrying a timed-out charge without an idempotency key
- Updating a balance column instead of appending ledger entries
- Using floating-point for money
- No reconciliation process
- Treating provider webhooks as reliable and ordered
- Deleting or editing financial records
- Optimising for throughput in a problem whose difficulty is correctness""",
            ),
            (
                "Interview Tip",
                """Put reconciliation on the diagram before you are asked. "Webhooks and API responses are best-effort; the daily reconciliation against the provider's settlement file is what makes the ledger correct" is the sentence that tells a payments interviewer you have actually done this.""",
            ),
        ],
        [
            "The correct response to an ambiguous provider timeout is to record the ambiguity, never to guess or blind-retry.",
            "Use an append-only double-entry ledger with derived balances: verifiable, auditable, and free of hot-row contention.",
            "Idempotency keys are mandatory at both the API and the provider boundary, enforced by unique constraints.",
            "Reconciliation against provider settlement files is the correctness guarantee; webhooks are only an optimisation.",
        ],
        [
            "The provider call times out. Did the money move, and what do you do?",
            "How do you guarantee a customer is never charged twice?",
            "Why a double-entry ledger rather than a balance column?",
            "What happens when a webhook is never delivered?",
        ],
    )


def _ticket_booking() -> dict:
    return SD(
        "sd-ticket-booking",
        "Design a Ticket Booking System",
        "Extreme contention on a fixed inventory: seat locking, on-sale bursts, and why overselling one concert seat is not acceptable.",
        17,
        "**Interviewer:** \"Design a ticket booking system for concerts and events with reserved seating. Handle the on-sale moment when tens of thousands of people try to buy at once.\"",
        [
            (
                "Why It Matters",
                """Most system design problems are about scale. This one is about **contention on a small, fixed, non-fungible inventory** — 60,000 specific seats, each of which can be sold exactly once, with 500,000 people trying to buy in the first minute.

That inverts the usual trade-offs. You cannot solve it with eventual consistency and reconciliation, because a customer who is told they have seat 14B and later told they do not is a much worse outcome than a slow page. It is the clearest example in the curriculum of a problem where CP is the right choice and where the design must make that choice work at burst scale.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"Reserved seating or general admission?"* — Reserved is far harder; general admission is a counter. Ask, because the two are different systems.
- *"Can we oversell at all?"* — For an airline, yes deliberately. For a concert seat, absolutely not. This single answer determines the consistency model.
- *"How long does a user hold a seat while paying?"* — A hold with an expiry is the core mechanism; 10 minutes is typical.
- *"Is there a queue for high-demand on-sales?"* — Increasingly yes, and it transforms the problem from a contention problem into an admission-control problem.
- *"Is payment synchronous with the booking?"* — Almost always, which makes the hold duration the payment window.
- *"Do we support seat maps, best-available, or both?"* — Both, and best-available is much easier to serve at scale.

**Agreed scope:** reserved seating with a seat map, holds with expiry, synchronous payment, a virtual waiting room for high-demand events, and no overselling ever.

**Non-functional:** no seat is ever sold twice; the seat map is approximately fresh (seconds) while the *purchase* is exact; the system absorbs a 1,000x burst at on-sale; a user who is told the booking succeeded always has the seat.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- Steady state: 1,000 bookings per minute across all events. Trivial.
- On-sale burst: a 60,000-seat stadium with 500,000 interested buyers. In the first 60 seconds: 500,000 users, each refreshing the seat map several times and attempting a hold — perhaps **200,000 requests per second**, against inventory of 60,000 rows.
- Ratio to internalise: 500,000 buyers for 60,000 seats means **88% of users will fail**, and most of the system's work is serving people who will not buy anything.
- Seat map payload: 60,000 seats with status, a few hundred kilobytes uncompressed.

**The conclusions:**

1. The burst is 1,000x steady state and entirely predictable in time. That predictability is the biggest asset in the design — you can pre-scale and you can gate admission.
2. Most traffic is browsing, not buying. Browsing can be cached and approximate; buying cannot. Separating those two paths is the central architectural move.
3. 60,000 rows with 200,000 requests per second against them is a contention problem, not a throughput problem. No amount of sharding helps if everyone wants the same front-row seats.""",
            ),
            (
                "Step 3: API Design",
                """- `GET /v1/events/{id}/seatmap` — heavily cached, explicitly approximate. Returns seat status with a `generated_at` timestamp so the client can show staleness honestly.
- `POST /v1/events/{id}/holds` with `{seat_ids[]}` or `{quantity, preference}` for best-available. Returns `201 {hold_id, expires_at}` or `409` if any seat is taken. This is the contended call.
- `POST /v1/holds/{id}/checkout` with payment details and an idempotency key. Converts the hold into a booking.
- `DELETE /v1/holds/{id}` releases early.
- `GET /v1/queue/{event_id}/position` for the waiting room.

The design decision to state clearly: **the seat map is eventually consistent and the hold is strongly consistent.** A user may attempt to hold a seat that the map showed as free and be rejected. That is correct behaviour, and the UI must be designed for it — which is a product consequence of a consistency decision, and exactly the kind of connection interviewers want to see drawn.""",
            ),
            (
                "Step 4: Data Model",
                """**events** — `event_id`, `venue_id`, `starts_at`, `on_sale_at`, `status`.

**seats** — `(event_id, seat_id)`, `section`, `row`, `number`, `price_tier`, `status` in `available | held | sold`, `hold_id`, `hold_expires_at`, `version`.

This is the contended table, and its design is the answer. Key properties:

- Partitioned by `event_id`, so one event's on-sale does not affect any other event. Blast radius is one event.
- The status transition is a **conditional update**: `UPDATE seats SET status='held', hold_id=?, hold_expires_at=? WHERE event_id=? AND seat_id=? AND status='available'`. Zero rows affected means someone else got it.
- No distributed lock, no separate lock service. The database row *is* the lock, and it is transactional.

**holds** — `hold_id`, `user_id`, `event_id`, `seat_ids`, `expires_at`, `state`.

**bookings** — `booking_id`, `hold_id`, `user_id`, `seat_ids`, `payment_id`, `created_at`. Immutable once created.

**queue_tokens** — for the waiting room: `token`, `event_id`, `position`, `admitted_at`.""",
            ),
            (
                "Step 5: Architecture",
                """Two paths, deliberately separated.

**Browse (high volume, approximate):**

Client → CDN → Seat map cache (Redis) ← async updates from the booking service

**Buy (low volume, exact):**

Client → Waiting room → Booking service → Seats table (conditional update) → Payment → Booking

Plus a reaper releasing expired holds.

The separation is the design: 200,000 requests per second of browsing never touch the seats table, and the few thousand per second of hold attempts are the only thing that does.""",
            ),
            (
                "How It Works",
                """### The hold, which is the whole problem

A hold is a time-bounded reservation — a semantic lock with an expiry.

1. The user selects seats.
2. A single transaction attempts the conditional update for each seat. If any seat fails, the whole transaction rolls back and the user is told which seats went.
3. On success, a hold row is created with `expires_at = now() + 10 minutes`.
4. The user pays.
5. Checkout converts held seats to `sold` and creates the booking, in one transaction.
6. If the hold expires first, a reaper resets those seats to `available`.

Why a hold rather than locking during payment: payment takes seconds to minutes and may involve a redirect to a bank. Holding a database transaction open for that is impossible. The hold externalises the lock into data with an expiry, which is the standard answer for any "reserve then confirm" workflow — the same pattern as the saga lesson's reservation.

**The expiry is what makes it self-healing.** A user who closes their browser mid-payment does not remove a seat from sale forever; it returns automatically. Any design with a reservation and no expiry is broken.

### The reaper, and its race

The reaper releases expired holds. It must handle the race where a checkout is in flight as the hold expires:

- Checkout's conditional update includes `WHERE hold_id = ? AND status = 'held' AND hold_expires_at > now()`, so a hold that has just expired cannot be checked out.
- The reaper's update includes `WHERE status='held' AND hold_expires_at <= now()`, so it cannot release a seat that has just become sold.
- Both are conditional updates on the same row, so the database serialises them and exactly one wins.

Talking through that race explicitly is a strong moment in the interview, because it is the kind of detail that only appears when you have thought about the implementation rather than the diagram.

### The virtual waiting room

This is the mechanism that makes the burst survivable, and it is the answer interviewers most want to hear.

1. Before the on-sale, users arriving are issued a queue token at the edge and shown a waiting room page. This page is static and served entirely by the CDN, so 500,000 people waiting costs almost nothing.
2. At on-sale, the system admits users into the purchase flow at a controlled rate — perhaps 1,000 per second — based on measured capacity.
3. Admitted users get a session token valid for a limited window.
4. Everyone else waits, sees their position, and is admitted in order.

What this buys: the booking service sees a steady, sized load instead of a 1,000x spike. Contention on the seats table drops to a manageable level because only a bounded number of people are competing at any moment. And the experience is fairer and far more honest than a site that fails with errors.

The admission rate is the tuning knob, and it should be derived from measured booking-service capacity rather than guessed.

### Seat map freshness

At 200,000 requests per second, the seat map cannot be a live query.

- The map is cached and served from the edge with a TTL of a few seconds.
- Updates are pushed asynchronously as holds and bookings occur.
- The client is told the data is approximate, and a failed hold shows a clear "someone just took that seat" message rather than an error.

For very high-demand events, an even stronger approach: do not show a seat map at all, and offer only **best available**. That removes the browsing contention entirely, is much fairer (nobody is racing for the same specific seat), and is what several ticketing systems do for the highest-demand on-sales. Proposing it is a good product-level answer.

### Best available

Allocating "the best two seats together" is a different query: find contiguous available seats in the highest-priced available tier. Implemented as a conditional update over a candidate set, retrying with the next candidate on conflict. Much lower contention than named-seat selection because two users rarely target the same candidate simultaneously — and when they do, one retries transparently rather than seeing a failure.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "500,000 people hit the site at 10:00:00 exactly."

The waiting room absorbs it. The waiting page is static and CDN-served; the queue token issuance is a cheap, horizontally scalable write. Admission is metered. The booking service never sees more than it can handle.

Also: pre-scale everything on the known on-sale time. This is a rare case of a completely predictable spike, and not exploiting that predictability would be a missed opportunity.

### Round 2 — "Everyone wants the front row: 50,000 hold attempts on 200 seats."

- Conditional updates mean 200 succeed and the rest get `409`. Correctness holds.
- Throughput suffers from contention on those rows. Mitigations: reduce concurrent attempts via admission control, and push users toward best-available rather than named-seat selection.
- The honest framing: this is not a bug to be engineered away. 50,000 people want 200 seats; 49,800 of them must be disappointed, and the system's job is to disappoint them quickly, clearly, and fairly rather than slowly and confusingly.

### Round 3 — "Payment takes 30 seconds and the hold is 10 minutes. What if payment succeeds after the hold expires?"

A genuinely nasty case, and it does happen.

- Checkout's conditional update fails because the hold expired, but the payment already succeeded.
- Correct handling: do not silently keep the money. Attempt to re-acquire the seats; if they are still available, complete the booking. If they are gone, refund automatically and immediately, and tell the user clearly.
- Prevention: extend the hold when checkout begins, so the window during payment cannot expire, and only release after the payment's own timeout.
- This is a saga where the compensation is a refund, and naming it as such ties the case study back to the distributed transactions lesson.

### Round 4 — "How do you prevent bots from taking everything?"

An essential part of any real ticketing system:

- Rate limiting per account, per IP, and per device fingerprint.
- Per-account purchase limits enforced at hold time, not just at checkout.
- Queue tokens issued before the on-sale and bound to a verified account, which makes mass automation expensive.
- Behavioural detection and challenges for suspicious clients.
- The point worth making: a limiter keyed only on something the attacker can mint cheaply is not a defence, which is the same lesson as the rate limiter case study.

### Round 5 — "How does this work across regions?"

Events are geographically anchored — a London concert is bought mostly by people near London. Home each event's inventory in one region, and serve the seat map from the edge globally.

Do **not** distribute inventory writes across regions. A seat is a single, non-fungible item, and cross-region consensus on every hold would add a hundred milliseconds to the most contended operation in the system. Keeping inventory single-homed is the right call, and saying that a global system can still have single-homed inventory is a good distinction.""",
            ),
            (
                "Failure Modes",
                """- **Check-then-act** on seat availability, overselling under concurrency.
- **Holds with no expiry**, permanently removing seats from sale when users abandon.
- **The reaper racing checkout**, either releasing a sold seat or letting an expired hold be purchased.
- **Live seat map queries** at burst scale, saturating the database that must serve holds.
- **No admission control**, so the on-sale is an outage rather than a queue.
- **Payment succeeding after hold expiry**, with the money kept and no seat delivered.
- **Bots consuming the inventory** in seconds.
- **Distributed locks** used where a conditional update is available and stronger.""",
            ),
            (
                "Trade-offs",
                """- **Strong consistency on inventory.** Non-negotiable here, and it costs latency and rules out multi-region writes for the seats table.
- **Seat map freshness versus load.** An approximate map is the only affordable option, and it guarantees some failed holds — which must be designed into the UI.
- **Hold duration.** Longer holds are kinder to slow payers and remove inventory from sale for longer, which matters enormously when demand exceeds supply.
- **Named seats versus best available.** Customer choice against far lower contention and a fairer allocation.
- **Waiting room.** Honest and fair and it makes people wait, which is a product decision as much as a technical one.
- **Per-event partitioning.** Perfect blast-radius isolation, and it means a single event's contention cannot be spread across shards.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"How do you prevent selling the same seat twice?"** — A conditional update on the seat row inside a transaction. Explain why this beats a distributed lock and why check-then-act fails.
- **"How long do you hold a seat, and what if the user disappears?"** — A hold with an expiry and a reaper; the expiry is what makes the system self-healing.
- **"500,000 people at 10:00:00. What happens?"** — Waiting room, metered admission, pre-scaling, and a CDN-served waiting page.
- **"The seat map says free but the hold fails. Is that a bug?"** — No, it is the design. The map is eventually consistent; the hold is authoritative. The UI must communicate it.
- **"Payment succeeds after the hold expires. What now?"** — Attempt re-acquisition, otherwise refund immediately. Never keep the money without the seat.
- **"Can you oversell?"** — For a concert, no. For an airline, deliberately yes with a compensation policy — and noticing that the answer differs by domain is a good observation.""",
            ),
            (
                "Common Mistakes",
                """- Reading availability then writing, instead of a conditional update
- Reaching for a distributed lock service
- Holds without expiry
- Serving a live seat map from the database during an on-sale
- No admission control for the burst
- Ignoring the payment-after-expiry race
- Treating this as a throughput problem when it is a contention problem""",
            ),
            (
                "Interview Tip",
                """Say the two-path separation in your first sentence: "Browsing is high-volume and can be approximate and cached; purchasing is low-volume and must be exact, and I will enforce it with a conditional update on the seat row." That framing resolves the apparent conflict between the scale and the strict consistency requirement, which is the thing the problem is testing.""",
            ),
        ],
        [
            "Separate the approximate, cacheable browse path from the exact, contended purchase path.",
            "A conditional update on the seat row is the correct mutual exclusion — stronger and simpler than any distributed lock.",
            "Holds with an expiry externalise the lock so payment can take minutes, and the expiry is what makes the system self-healing.",
            "A virtual waiting room converts a 1,000x burst into a metered, fair, survivable load.",
        ],
        [
            "How do you guarantee a seat is never sold twice?",
            "What happens when 500,000 people arrive at the on-sale moment?",
            "The seat map showed the seat as available but the hold failed. Is that a bug?",
            "Payment succeeds after the hold has expired. What does the system do?",
        ],
    )


def _api_gateway_case() -> dict:
    return SD(
        "sd-api-gateway-design",
        "Design an API Gateway",
        "The component every request passes through: plugin chains, config propagation, and a failure domain that spans the whole platform.",
        14,
        "**Interviewer:** \"Design an API gateway for a platform with two hundred backend services and thousands of external API consumers.\"",
        [
            (
                "Why It Matters",
                """This is an infrastructure design question rather than a product one, and it tests a different muscle: extreme availability requirements, a global blast radius, sub-millisecond latency budgets, and configuration as a first-class distributed systems problem.

The thing interviewers are watching for is whether you treat the gateway as a piece of software to be built, or as a control plane plus a data plane — because that separation is the whole design.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"What must the gateway do?"* — TLS termination, authentication, authorisation at the route level, rate limiting, routing, request and response transformation, and observability.
- *"Internal traffic, external, or both?"* — Both, probably through separate gateway deployments so a public traffic surge cannot affect internal calls.
- *"Who configures routes — a central team or each service team?"* — Self-service configuration is essential at 200 services, and it creates a validation and safety problem.
- *"What latency budget?"* — Single-digit milliseconds added at p99, which rules out synchronous external calls in the request path.
- *"Do we need protocol translation?"* — REST externally, gRPC internally is a common requirement.

**Agreed scope:** a public gateway handling authentication, per-consumer rate limiting, routing with versioning and canaries, request validation, and full observability. Self-service route configuration with validation. Protocol translation to gRPC internally.

**Non-functional:** 99.99% availability — higher than any service behind it, because it is in every path; under 5 ms added at p99; a configuration change is live within seconds and reversible within seconds.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """- 500,000 requests per second at peak across all routes.
- 200 services, 5,000 routes, 10,000 API consumers.
- Configuration size: 5,000 routes with policies is a few megabytes — small enough to hold entirely in memory on every node, which is the key enabling fact.
- Gateway nodes: at roughly 20,000 requests per second per node, about 25 nodes plus headroom, spread across zones.

**The conclusions:**

1. The config is small and read constantly. Push it to every node and keep it in memory; never look it up per request.
2. At 500,000 requests per second, anything that adds a network call to the request path adds it 500,000 times per second. Everything must be local: token verification, rate-limit decisions where possible, and routing.
3. The gateway is in front of everything, so its availability must exceed the services behind it, and its config changes need more safety than most code deploys.""",
            ),
            (
                "Step 3: The Two Planes",
                """The organising idea, and the thing to say first.

**Control plane** — where configuration is authored, validated, versioned, and distributed. Not in the request path. May be unavailable without affecting traffic.

**Data plane** — the gateway nodes handling requests. Stateless, holding the current config in memory, and able to run indefinitely without the control plane.

Config authoring → Validation → Versioned store → Distribution → Data plane nodes (in-memory)

That last property is the critical one: **if the control plane is down, traffic continues on the last-known-good configuration.** A gateway whose request path depends on a live config lookup has made the config store a single point of failure for the entire platform.""",
            ),
            (
                "Step 4: Configuration Model",
                """**routes** — `path_pattern`, `method`, `service`, `version`, `timeout`, `retry_policy`, `auth_requirement`, `rate_limit_policy`, `transformations`.

**consumers** — `consumer_id`, `credentials`, `plan`, `quotas`, `allowed_routes`.

**policies** — reusable named bundles so 5,000 routes do not each carry a bespoke configuration.

**config_versions** — every published configuration is an immutable, numbered snapshot. Rollback is republishing a previous version number, which takes seconds and is the single most valuable operational property in the design.

Routing lookup is a prefix or trie match over path patterns, precompiled at config load into a structure optimised for matching rather than evaluated per request.""",
            ),
            (
                "Step 5: The Request Path",
                """An ordered chain, and being able to state the order is most of the answer:

1. **Accept and terminate TLS.**
2. **Match the route.** Failure means `404`, before any other work.
3. **Validate the request** — size limits, content type, malformed headers. Cheap rejections first.
4. **Authenticate.** Verify a signed token locally using cached public keys. No network call.
5. **Authorise at the route level** — may this consumer call this route?
6. **Rate limit** — local token bucket against a distributed budget.
7. **Transform** — strip client-supplied internal headers, add trusted identity headers, translate protocol.
8. **Route upstream** — pick a healthy instance, apply the timeout.
9. **Handle the response** — transform, compress, normalise errors.
10. **Emit telemetry** — metrics, a trace span, a structured access log.

Note the ordering principle: **cheap rejections before expensive work.** Rejecting an oversized body before parsing it, and an unknown route before authenticating, is what keeps the gateway cheap under attack.

Step 7 contains a security-critical detail worth stating: the gateway must *strip* any inbound header it uses internally to convey trusted identity. Forgetting this lets a client claim to be any tenant, and it is a real, recurring vulnerability.""",
            ),
            (
                "How It Works",
                """### Configuration distribution

The interesting distributed-systems part.

1. A team submits a route change through an API or a repository.
2. It is validated: schema, conflicting path patterns, references to services that exist, policies that resolve.
3. On acceptance, a new immutable config version is published.
4. Data plane nodes watch for new versions, fetch, validate locally, compile into their matching structures, and swap atomically — build then flip a pointer, never mutate in place.
5. If a node cannot load a new version, it keeps the old one and reports unhealthy config rather than failing requests.

**Staged rollout** matters as much as it does for code: apply a new config to one node, then 10%, then everything, watching error rates between steps. A bad route configuration can break every request to a service, and it will not be caught by a code review because it is not code. Treating config as a deployable artefact with canaries and rollback is the point.

### Authentication without a network call

Verifying a signed JWT requires only the issuer's public key, which is cached and refreshed periodically. That turns authentication into a local CPU operation of tens of microseconds instead of a round trip.

The cost is revocation: a token remains valid until it expires. Mitigations are short token lifetimes and a small revocation list pushed to the data plane for the rare urgent case. For API keys, the key-to-consumer mapping is part of the distributed configuration, so it is also a local lookup.

The general rule to state: **nothing in the request path may depend on a synchronous call to another system.** Every dependency must be resolvable from in-memory state that is refreshed asynchronously.

### Rate limiting at 500,000 requests per second

A Redis round trip per request would work and would add a millisecond and a dependency. Instead, local budgets: each node holds a share of each consumer's limit and reconciles with a central store every few hundred milliseconds, adjusting its share based on demand. Enforcement is approximate within a sync interval, which is the correct trade for a rate limiter.

### Plugin architecture

Cross-cutting behaviour is implemented as plugins in the chain. Two rules keep this from destroying the gateway:

- **A CPU and latency budget per plugin**, measured, with a metric per plugin so latency creep is attributable.
- **No synchronous external calls from a plugin.** This is the rule that is most often broken and most damaging: an authentication plugin that calls an identity service turns that service's availability into the platform's ceiling.

### Failure behaviour

- **A backend is down** — the gateway returns a clear error, applies the circuit breaker, and does not retry non-idempotent requests.
- **The control plane is down** — traffic continues on the current config; only changes are blocked.
- **A gateway node is unhealthy** — removed by the load balancer; the tier is stateless so this is routine.
- **The whole gateway tier is overloaded** — shed load by priority, rejecting anonymous and low-tier traffic before authenticated premium traffic.

### Multi-tenancy and isolation

One consumer's traffic surge must not degrade others. Concurrency limits per consumer, separate connection pools per upstream service, and — for the largest consumers — dedicated gateway pools. This is the bulkhead pattern applied at the edge.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A bad config change breaks routing for every service."

This is the gateway's defining risk, so the answer must be process plus mechanism: validation at submission, immutable versioned configs, staged rollout with automated error-rate checks between stages, and instant rollback by republishing the previous version number. Recovery should be under a minute and should not require a deploy.

### Round 2 — "The identity service goes down."

Nothing happens to traffic, because token verification is local against cached keys. New tokens cannot be issued, so users cannot log in, but every existing session continues. This is exactly the degradation you want, and it is only available because you refused to put a network call in the request path.

If the design had called the identity service per request, the entire platform would be down. State that contrast explicitly — it is the strongest argument for the local-verification decision.

### Round 3 — "One consumer sends 300,000 requests per second, ten times their limit."

- Local rate limiting rejects them cheaply, at the cost of TCP and TLS work.
- Sustained abuse is escalated to the edge — a CDN or WAF block, so the traffic never reaches the gateway.
- Per-consumer concurrency limits prevent them from occupying connection capacity while being rejected.
- The key insight: rejecting is not free, so persistent abuse must be handled further out than the gateway.

### Round 4 — "How do you migrate a service to a new version without downtime?"

- Weighted routing: 1% of traffic to v2, watch error rates and latency, ramp gradually.
- Traffic mirroring: send a copy of production traffic to v2 without using its responses, and compare. Ideal for validating a rewrite, with the caveat that mirrored writes must be suppressed or sent to a shadow store.
- Header-based routing so internal testers can opt into v2.
- Instant rollback by shifting the weight, which requires no deploy.

### Round 5 — "How do you go multi-region?"

Gateway nodes in every region, each holding the full configuration — which is possible precisely because the config is small. The control plane is global and asynchronous; a config change propagates to all regions within seconds, and a region cut off from the control plane keeps serving on its last-known-good config.

Routing prefers same-region backends and spills over to another region only if the local backends are unavailable, because cross-region spillover trades latency for availability and should be a deliberate, per-route choice.""",
            ),
            (
                "Failure Modes",
                """- **Synchronous external calls in the request path**, making another system's availability the platform's ceiling.
- **Unstaged config rollout** with a global blast radius.
- **Business logic creeping into the gateway**, turning it into a monolith that every team must coordinate through.
- **Plugin latency creep**, each addition small and the total substantial.
- **Not stripping client-supplied trust headers.**
- **Timeout misalignment** with upstream services, so work continues after the gateway has given up.
- **No per-consumer isolation**, letting one consumer's surge degrade everyone.
- **Config stored only in a live database** the data plane reads per request.""",
            ),
            (
                "Trade-offs",
                """- **Centralisation versus coupling.** Uniform policy in one place, and one component every team depends on.
- **Feature richness versus latency.** Each capability is milliseconds on every request forever.
- **Local versus centralised rate limiting.** Speed and approximation, against accuracy and a round trip.
- **Local token verification versus revocation.** No dependency, at the cost of tokens valid until expiry.
- **Self-service config versus safety.** Team autonomy against the risk of a global outage from a route mistake — resolved by validation and staged rollout rather than by gatekeeping.
- **One gateway versus several.** Simplicity against blast-radius isolation between public, partner, and internal traffic.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What is in the request path and in what order?"** — The ten steps, with cheap rejections first.
- **"How does a config change reach 25 nodes?"** — Control plane publishes an immutable version, nodes watch and swap atomically, staged with automated checks.
- **"What happens if the control plane is down?"** — Traffic continues on the last-known-good config. This is the question being asked.
- **"How do you add authentication without a network call?"** — Local signature verification with cached keys, short token lifetimes, and a pushed revocation list.
- **"How much latency does the gateway add, and how do you keep it there?"** — A budget per plugin, measured per plugin, and a prohibition on synchronous external calls.
- **"A route change breaks everything. How fast can you recover?"** — Republish the previous immutable version; under a minute, no deploy.""",
            ),
            (
                "Common Mistakes",
                """- Not separating control plane from data plane
- Config lookups in the request path
- Synchronous calls to an identity service per request
- Treating configuration as less risky than code
- Putting business logic or response aggregation in the general gateway
- Ignoring the gateway's own latency budget
- No per-consumer isolation""",
            ),
            (
                "Interview Tip",
                """Open with the plane separation and the property it buys: "Control plane authors and distributes configuration; the data plane holds it in memory and can run indefinitely without the control plane. Nothing in the request path makes a synchronous call to anything." Those two sentences answer most of the follow-ups before they are asked.""",
            ),
        ],
        [
            "Separate control plane from data plane; the request path must run indefinitely on in-memory, last-known-good configuration.",
            "Nothing in the request path may make a synchronous external call — verify tokens locally and budget rate limits locally.",
            "Configuration is a deployable artefact: immutable versions, validation, staged rollout, and instant rollback.",
            "Order the chain so cheap rejections happen before expensive work, and strip client-supplied trust headers.",
        ],
        [
            "What happens to traffic when the control plane or identity service is unavailable?",
            "How does a configuration change reach every node safely, and how fast can you roll back?",
            "How do you keep the gateway's added latency under a few milliseconds?",
            "How do you prevent one consumer's traffic surge from affecting others?",
        ],
    )


def _metrics_platform() -> dict:
    return SD(
        "sd-metrics-platform",
        "Design a Metrics and Logging Platform",
        "Extreme write volume, cardinality as the dominant constraint, and a system that must stay up while everything it observes is down.",
        16,
        "**Interviewer:** \"Design a metrics and logging platform for a company running thousands of services. Engineers query dashboards, and alerts fire on thresholds.\"",
        [
            (
                "Why It Matters",
                """This is the clearest example in the curriculum of a write-dominated system, and it has a constraint that appears almost nowhere else: **cardinality**. The failure mode is not "too many requests" but "too many distinct time series", and a single badly labelled metric can take the whole platform down.

It also has an unusual reliability requirement: the observability platform must be more available than everything it observes, and must work during the incident it is needed for. Systems that share dependencies with what they monitor fail exactly when they matter.""",
            ),
            (
                "Step 1: Clarify the Requirements",
                """- *"Metrics, logs, traces, or all three?"* — They have completely different shapes and should be different subsystems. Take metrics and logs.
- *"What retention?"* — Full resolution for days, downsampled for a year, is typical. Retention is the main cost lever.
- *"Query patterns?"* — Dashboards (repeated, recent, aggregated) and ad-hoc investigation (arbitrary, historical). Very different optimisations.
- *"What is the alerting latency requirement?"* — Under a minute from event to page.
- *"Can we lose data?"* — For metrics, a few dropped points is acceptable. For audit logs, no. Those are different systems with different guarantees, and separating them is a good early move.
- *"Multi-tenant?"* — Yes, with per-team isolation and quotas.

**Agreed scope:** metrics ingestion and query, log ingestion and search, dashboards, alerting, multi-tenant quotas. Traces acknowledged as a third subsystem.

**Non-functional:** ingestion accepts data even when downstream storage is degraded; queries over the last hour return in under a second; alert evaluation within a minute; the platform survives the failure of any service it monitors, including its own dependencies where possible.""",
            ),
            (
                "Step 2: Estimate the Scale",
                """**Metrics:**

- 50,000 hosts and containers, each exposing 1,000 series, scraped every 15 seconds.
- 50M active series, 50M / 15 = **3.3M data points per second**.
- Each point compresses to roughly 2 bytes with delta-of-delta timestamp encoding and XOR value compression. 3.3M × 2 bytes × 86,400 ≈ 570 GB per day raw, far less after compaction.

**Logs:**

- 1M log lines per second at 500 bytes each = 500 MB/s = **43 TB per day** raw, perhaps 4–8 TB compressed.

**The conclusions:**

1. Metrics compress extraordinarily well because consecutive points are similar. The specialised encodings are why a time-series database beats a general one by an order of magnitude here, and naming them is a depth signal.
2. Logs are 50–100x larger than metrics for the same information value. Logs dominate cost, which is why sampling and retention policy matter most there.
3. 50M series is the number to watch. Series count, not data volume, determines index size and query performance — and it is what a single bad label can multiply by a thousand overnight.""",
            ),
            (
                "Step 3: API and Data Model",
                """**Metrics** — a metric is `(name, {labels}) → [(timestamp, value)]`. The label set defines the series; `http_requests_total{service="api", status="200", region="eu"}` is one series, and every distinct combination of label values is another.

That definition contains the whole cardinality problem: adding a `user_id` label to a metric with a million users creates a million series from one metric.

- Ingest: push (`POST /v1/metrics` with batched samples) or pull (the platform scrapes targets). Pull gives you a free liveness signal and a controlled rate; push works for short-lived jobs. Most platforms support both.
- Query: a time-series query language over selection, aggregation across series, rate calculation, and time windows.

**Logs** — `(timestamp, service, level, message, {structured fields})`.

- Ingest: batched, compressed, with a local agent buffering on disk so a network blip does not lose data.
- Query: filter by time and service first, then search text. The time-plus-service filter is what makes this affordable, and the data layout must make it cheap.""",
            ),
            (
                "Step 4: Storage Design",
                """**Metrics storage** — a time-series database, and the reasons are specific:

- **Columnar, time-partitioned blocks.** Data for a time window is written once, compacted, and never updated. Append-only with immutable blocks means no update path, no fragmentation, and easy deletion by dropping whole blocks.
- **Specialised compression.** Delta-of-delta for timestamps (regular intervals compress to almost nothing) and XOR for values (consecutive values are usually similar). Together these reach roughly 1–2 bytes per point, versus tens of bytes in a general-purpose store.
- **An inverted index from label to series id**, so `{service="api", region="eu"}` is a set intersection rather than a scan.
- **Downsampling on a schedule** — 15-second resolution for 7 days, 1-minute for 30 days, 5-minute for a year. Nobody examines second-level detail from eight months ago, and the storage saving is enormous.

**Log storage** — object storage with an index, not a database:

- Logs are written as compressed, time-and-service-partitioned objects.
- A lightweight index records which objects contain which time ranges, services, and label sets.
- Full-text search is expensive; many modern log systems index only the labels and grep the compressed blocks on demand, trading query speed for a dramatic reduction in index cost. Knowing that this trade exists, and that it is the difference between an affordable and an unaffordable log platform, is worth mentioning.

**Partitioning** — by time first, then by tenant. Time-first means a query for the last hour touches one partition, and expiring old data is dropping partitions rather than deleting rows.""",
            ),
            (
                "Step 5: Architecture",
                """Agents → Ingest gateway → Buffer (log/queue) → Writers → Storage

Query API → Query planner → Storage + Cache

Alert evaluator → Query API → Notification system

The buffer between ingestion and storage is the critical component: it decouples the arrival rate from the write rate, so a storage problem becomes a backlog rather than data loss. Ingestion must keep accepting even when storage is degraded, because the moment storage is struggling is exactly when the data is most needed.""",
            ),
            (
                "How It Works",
                """### Cardinality, the defining constraint

Every distinct label combination is a separate series with its own index entry and its own storage stream. The damage is multiplicative: a metric with 5 services × 10 endpoints × 5 status codes is 250 series, which is fine. Add `user_id` with a million values and it is 250 million series, which will take down the platform.

This happens regularly and by accident: a request id, a full URL path with ids in it, an email address, or a container id in a rapidly-churning environment.

Defences, all of which are needed:

- **Per-tenant series limits**, enforced at ingestion. Over the limit, reject new series and alert the owning team rather than accepting and dying.
- **Label value limits** — reject or truncate high-cardinality values at ingest.
- **Detection** — report the top metrics by series count so teams can see what they are doing.
- **Churn monitoring** — series that appear and disappear constantly (a new container id every minute) are as damaging as high cardinality, and are less obvious.

Say this clearly: **cardinality limits are not a nicety; they are the platform's admission control.** Without them one team's mistake is everyone's outage.

### Ingestion that does not lose data

- Agents buffer locally on disk, so a network or platform outage does not lose the data — it delays it.
- The ingest gateway is stateless and does minimal work: validate, check quota, append to a durable buffer, acknowledge.
- Writers consume the buffer and write to storage. If storage is slow, the buffer grows and ingestion continues.
- Backpressure is explicit: if the buffer approaches its limit, shed lower-priority data (debug logs before error logs, and detailed metrics before critical ones) rather than dropping indiscriminately.

The priority-aware shedding is the part candidates miss. Under pressure you want to lose debug logs from a healthy service, not error logs from the failing one.

### Query

- **Dashboards** are the same queries repeated every few seconds by many viewers. Cache aggressively: query results for completed time windows are immutable and can be cached indefinitely; only the most recent window changes.
- **Query limits** are essential: bound the number of series touched, the time range, and the execution time. A single unbounded query over a year of data can consume the cluster. Reject early with a clear message.
- **Push predicates down**: filter by time and labels before reading data, and use the inverted index to select series before touching any samples.

### Alerting

Alert rules are queries evaluated on a schedule. Considerations that matter:

- **Evaluation must be distributed** — thousands of rules cannot be evaluated by one node. Partition rules across evaluators.
- **Alert on burn rate, not raw thresholds**, as the observability lesson argues.
- **Deduplicate and group.** A datacentre failure should produce one notification about a datacentre, not four thousand about individual hosts. Grouping and inhibition rules are the difference between useful alerting and an unusable pager.
- **Handle missing data explicitly.** If a service stops reporting, is that healthy or dead? Both answers are wrong sometimes, so the rule must say which it means.

### The independence requirement

The platform must work when the things it monitors are broken. That implies:

- It should not depend on the same database, service mesh, or cluster as the workloads it observes.
- Its own monitoring must be external — a separate, minimal system watching the watcher.
- Alert delivery must not route through infrastructure that could be part of the outage.

This is the point worth making unprompted: an observability platform that shares a failure domain with production is not an observability platform, it is another thing that will be down when you need it.""",
            ),
            (
                "Evolution Under Pressure",
                """### Round 1 — "A team ships a metric labelled with user id; series count goes from 50M to 500M in an hour."

- The per-tenant series limit rejects the new series and fires an alert naming the metric and the team.
- Existing series are unaffected; the platform stays up.
- Without the limit: the index grows past memory, query latency collapses, writers fall behind, and the platform is down during an ordinary Tuesday. Describing that cascade makes the case for the limit.

### Round 2 — "Log volume triples after a debug flag is left on in production."

- Per-tenant ingestion quotas with rate limiting.
- Priority-aware shedding: drop debug-level logs first.
- Alert the owning team with the specific service and level driving the increase, so it is actionable rather than a vague "logs are high".
- Cost attribution per team is what makes this self-correcting over time, and it is a genuine organisational mechanism rather than a technical one.

### Round 3 — "A major incident: every service is erroring and log volume spikes 10x, exactly when engineers need queries to be fast."

The hardest scenario in the problem.

- Ingestion buffers absorb the spike; storage lags; recent data is queryable from the buffer or a hot tier before it is fully written.
- Query capacity is reserved separately from ingestion capacity, so writes cannot starve reads. This isolation is the key design decision.
- Shed detailed data before critical data.
- The system degrades to "recent data available, historical queries slow" rather than becoming unavailable.

### Round 4 — "How do you handle queries over a year of data?"

- Downsampled resolutions are selected automatically based on the query's time range — a year-long graph does not need 15-second points and cannot display them anyway.
- Pre-aggregated rollups for common groupings.
- Hard limits on series and time range, with a clear error and a suggestion rather than a timeout.

### Round 5 — "Halve the cost."

- Retention is the biggest lever: shorten full-resolution retention and downsample earlier.
- Sample logs: keep all errors, sample successful-request logs at 1–10%. Most log volume is successful requests that nobody reads.
- Reduce cardinality: it is the largest driver of index and compute cost, and much of it is accidental.
- Tier old data to cheaper storage with slower query.
- Charge teams for their usage, which reduces volume faster than any technical measure — an observation worth making because it is true and rarely said.""",
            ),
            (
                "Failure Modes",
                """- **Cardinality explosion** from an unbounded label, taking down the platform.
- **Series churn** in ephemeral environments, which is cardinality with a time dimension.
- **Unbounded queries** consuming the cluster.
- **Ingestion and query sharing capacity**, so a write spike makes the platform unusable during an incident.
- **The platform depending on what it monitors**, failing exactly when needed.
- **Alert storms** with no grouping or inhibition, making the pager useless.
- **Averaging pre-computed percentiles** across instances, producing meaningless numbers.
- **No local buffering in agents**, so a platform blip loses the data about the blip.""",
            ),
            (
                "Trade-offs",
                """- **Resolution and retention versus cost.** The primary lever, and downsampling captures most of the value for a fraction of the storage.
- **Index everything versus index labels only.** Fast text search against far cheaper ingestion and storage; modern log systems increasingly choose the latter.
- **Push versus pull for metrics.** Pull gives liveness and rate control; push handles short-lived jobs and firewalled environments.
- **Strict quotas versus developer friction.** Limits protect everyone and will occasionally block a legitimate use; the fix is fast, self-service quota changes rather than no limits.
- **Sampling logs.** Large cost reduction against the small chance that the one line you needed was sampled out — which is why errors are never sampled.""",
            ),
            (
                "Interviewer Follow-ups",
                """- **"What limits this system?"** — Cardinality, not data volume. Explain why, with the multiplication.
- **"A team adds a user id label. What happens?"** — Per-tenant limits reject and alert; describe the cascade that would otherwise occur.
- **"Why a time-series database rather than Postgres?"** — Columnar time-partitioned blocks, delta-of-delta and XOR compression reaching 1–2 bytes per point, and a label-to-series inverted index. Give the compression numbers.
- **"How do you stay up during an incident?"** — Buffered ingestion, isolated query capacity, priority shedding, and no shared failure domain with production.
- **"How do you keep query costs bounded?"** — Automatic resolution selection, series and range limits, and result caching for immutable windows.
- **"How would you halve the bill?"** — Retention, downsampling, log sampling, cardinality reduction, and cost attribution per team.""",
            ),
            (
                "Common Mistakes",
                """- Treating this as a generic write-heavy problem and missing cardinality entirely
- Using a general-purpose database for time series
- No per-tenant limits or quotas
- Sharing infrastructure with the systems being monitored
- No local buffering in agents
- Unbounded queries with no limits
- Ignoring that logs are 50–100x the cost of metrics for similar information""",
            ),
            (
                "Interview Tip",
                """Name cardinality as the binding constraint in your first minute, with the arithmetic: "Adding a user id label to one metric turns 250 series into 250 million. Series count, not byte volume, is what limits this platform." That reframing is the thing the question is actually testing.""",
            ),
        ],
        [
            "Cardinality — the number of distinct label combinations — is the binding constraint, and per-tenant limits are the platform's admission control.",
            "Time-series databases win through time-partitioned immutable blocks and specialised compression reaching 1–2 bytes per point.",
            "Buffer ingestion so storage problems become backlog rather than data loss, and shed by priority under pressure.",
            "The observability platform must not share a failure domain with what it observes, or it is down when you need it.",
        ],
        [
            "What actually limits a metrics platform, and why is it not data volume?",
            "A team adds a high-cardinality label. What happens, and what should happen?",
            "Why a purpose-built time-series store rather than a relational database?",
            "How does the platform stay usable during the incident it is needed for?",
        ],
    )


def case_study_topic() -> dict:
    """The System Design case-study module: full interview walkthroughs."""
    return _sd_topic(
        "sd-design-problems",
        "Interview Case Studies",
        "Seventeen complete interview walkthroughs: requirements, estimates, APIs, data models, a first design, the bottleneck, and the design evolving under interviewer pressure.",
        "HARD",
        24,
        [
            _url_shortener(),
            _rate_limiter_case(),
            _news_feed(),
            _instagram(),
            _youtube(),
            _netflix(),
            _chat_system(),
            _notification_system(),
            _ride_sharing(),
            _dropbox(),
            _autocomplete(),
            _web_crawler(),
            _job_scheduler(),
            _payment_system(),
            _ticket_booking(),
            _api_gateway_case(),
            _metrics_platform(),
        ],
    )
