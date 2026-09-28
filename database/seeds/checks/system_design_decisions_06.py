"""Knowledge checks: decision-focused questions for the system design lessons on key-value stores,
news feeds, Instagram, video streaming (YouTube), Netflix, chat systems (WhatsApp), notification
systems, ride sharing (Uber), Dropbox/Drive, and search autocomplete.

Each question is a scenario the learner must decide: which component or technology fits given
concrete constraints, an A-vs-B trade-off, a back-of-the-envelope capacity call, a design decision
under a stated non-functional requirement, a design or interview answer with a flaw to spot, or the
strongest answer to an interviewer follow-up. These supplement the existing recall-oriented pools
for the same lessons.
"""

from __future__ import annotations

CHECKS: dict[str, list[dict]] = {
    "sd-key-value-store": [
        {
            "key": "d-blob-in-kv-store",
            "kind": "choice",
            "prompt": "A teammate wants to store 50 MB product images directly as values in this key-value store because 'it's just another put call'. Given the scoping decision in the lesson, what should you push back with?",
            "options": [
                "Store the image bytes directly; the store's replication protects them just as well as any other value.",
                "Split the image into 1 KB chunks and store each chunk as its own key.",
                "Store the image in object storage and put only a small pointer key (like an S3 URL) in the key-value store.",
                "Refuse to support images at all until the schema is redesigned."
            ],
            "answer": 2,
            "explanation": "The lesson scopes this store to 'a few KB' values; large blobs belong in object storage with a pointer key, keeping commit logs, memtables and compaction cheap. Chunking the image into keys reinvents object storage badly inside a system tuned for small values.",
            "section": "step-1-clarify-the-requirements",
            "concept": "sd-key-value-store.value-size-scope",
            "mistake": "sd-key-value-store.blob-in-kv"
        },
        {
            "key": "d-partition-reason-not-size",
            "kind": "choice",
            "prompt": "Suppose one machine could easily hold all 300 GB of replicated data on its disk. Given the non-functional requirement that the store survives any single machine failing, why would the design still require at least 3 machines?",
            "options": [
                "Failure tolerance requires the three replicas to live on independent machines, regardless of whether the data would fit on one.",
                "Partitioning by hash always requires at least 3 nodes to function correctly.",
                "Consistent hashing needs at least 3 nodes on the ring to compute a hash.",
                "Three reads for every write means three separate machines must exist to serve them."
            ],
            "answer": 0,
            "explanation": "The requirement 'survives any single machine failing' is what forces N=3 independent replicas, entirely separate from whether the data volume would technically fit on one disk.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-key-value-store.replication-for-failure-not-size"
        },
        {
            "key": "d-prevent-lost-update",
            "kind": "choice",
            "prompt": "Two clients read the same key's current version, then each issue a PUT without checking whether the other already changed it, so the loser's update silently vanishes. Which API detail from the lesson prevents this?",
            "options": [
                "The ttl field on PUT, since it expires stale writes automatically.",
                "The consistency=strong setting on GET, since it always returns the latest version.",
                "Changing DELETE to return 200 instead of 204 so clients can see the prior state.",
                "The optional if-version condition on PUT, which rejects the write if the version has moved on since the client last read it."
            ],
            "answer": 3,
            "explanation": "An optional if-version on PUT is exactly the lesson's answer to two writers silently overwriting each other; consistency=strong only affects reads, and ttl is for expiry, not conflict detection.",
            "section": "step-3-api",
            "concept": "sd-key-value-store.conditional-put"
        },
        {
            "key": "d-bloom-filter-miss",
            "kind": "choice",
            "prompt": "A GET for a key that does not exist currently has to check the memtable and then every SSTable on disk before returning 404, and this is the slow path under load. Which single addition from the lesson fixes this without touching the read order?",
            "options": [
                "A Bloom filter per SSTable that says 'definitely not here' so most misses cost no disk read.",
                "A B-tree index instead of sorted SSTables.",
                "Increasing W so more replicas must confirm the miss.",
                "A larger memtable so more data stays in memory before flushing."
            ],
            "answer": 0,
            "explanation": "The lesson's single-node design already includes a per-file Bloom filter for exactly this reason; switching storage engines or changing quorum knobs would change the whole design, not just fix the miss path.",
            "section": "step-4-one-machine-first",
            "concept": "sd-key-value-store.bloom-filter-purpose"
        },
        {
            "key": "d-hash-vs-range-partitioning",
            "kind": "choice",
            "prompt": "The lesson explicitly rules out range scans in scope. Given that, and the need for an even load spread as nodes join and leave, which partitioning scheme does the design use, and what is the cost of that choice?",
            "options": [
                "Hash partitioning via consistent hashing, which spreads load evenly but gives up ordered range scans.",
                "Range partitioning by key, which supports scans but creates hot ranges for sequential keys.",
                "Round-robin partitioning per request, which balances load perfectly but loses the ability to route a key deterministically.",
                "A single global index shared by all nodes, which supports both scans and even load."
            ],
            "answer": 0,
            "explanation": "Since get/put/delete never need ranges, hashing each key onto a ring is the natural fit: even spread, and adding or removing a node moves only neighbouring keys. Range partitioning buys scans the design does not need at the cost of hot ranges.",
            "section": "step-5-many-machines",
            "concept": "sd-key-value-store.hash-partitioning-choice"
        },
        {
            "key": "d-hot-key-fix",
            "kind": "choice",
            "prompt": "One key is read a million times a second and its three owner nodes are pegged at 100% CPU while every other node in the cluster is idle. What does the lesson recommend?",
            "options": [
                "Raise W and R for that key so more replicas share the read load.",
                "Move the key to its own dedicated shard with a bigger virtual node count.",
                "Reduce the replication factor for that key to spread requests across fewer, faster nodes.",
                "Put a small cache (Redis or in the coordinator) in front of the hottest keys."
            ],
            "answer": 3,
            "explanation": "The lesson's fix for read-hot keys is a small cache in front of the hottest keys; raising W/R makes every read slower without reducing load on the three owners, and lowering replication removes fault tolerance exactly where it matters most.",
            "section": "how-it-works",
            "concept": "sd-key-value-store.hot-key-cache"
        },
        {
            "key": "d-add-nodes-no-downtime",
            "kind": "choice",
            "prompt": "The interviewer says 'add ten nodes without downtime.' What has to be true about the ring for this to work without a service pause?",
            "options": [
                "Every node must be taken offline briefly while the ring is rebalanced.",
                "All data must be re-hashed and rewritten to every node simultaneously.",
                "Only the key ranges owned by the new nodes' neighbours move, and both old and new owners serve reads during the move.",
                "Writes must be paused globally until the new nodes finish loading their share."
            ],
            "answer": 2,
            "explanation": "Consistent hashing means new nodes take ranges only from their immediate neighbours on the ring, and the design serves reads from both old and new owners mid-move, so nothing pauses.",
            "section": "evolution-under-pressure",
            "concept": "sd-key-value-store.rebalance-without-downtime",
            "mistake": "sd-key-value-store.full-rehash-on-scale-out"
        },
        {
            "key": "d-clock-drift-versions",
            "kind": "choice",
            "prompt": "Nodes in the cluster have clocks that drift by a few hundred milliseconds relative to each other, and the design uses wall-clock timestamps as versions with last-writer-wins. What is the concrete risk the lesson warns about?",
            "options": [
                "Reads become slower because clock checks add a network hop.",
                "Consistent hashing breaks because ring positions are derived from timestamps.",
                "Compaction cannot run because SSTables are ordered by timestamp.",
                "A write with a later real-world time can be timestamped earlier than an actual-older write on a drifted node, silently losing the newer write."
            ],
            "answer": 3,
            "explanation": "The lesson lists 'clock-based versions across machines with drifting clocks' as a failure mode precisely because drift can make an actually-later write look older, so last-writer-wins silently drops it.",
            "section": "failure-modes",
            "concept": "sd-key-value-store.clock-drift-risk"
        },
        {
            "key": "d-lsm-vs-btree",
            "kind": "choice",
            "prompt": "A colleague argues for a B-tree storage engine instead of the log-structured design because B-trees give faster point reads. For this key-value store's 40,000 ops/sec with 10,000 writes/sec, what does the lesson's trade-off say?",
            "options": [
                "Use a B-tree; point-read speed always dominates the choice of storage engine.",
                "Use log-structured storage; sequential appends keep the heavy write path cheap, at the cost of reading a few sorted files per lookup.",
                "Use both engines side by side, one for reads and one for writes, kept in sync.",
                "The choice makes no difference at this throughput."
            ],
            "answer": 1,
            "explanation": "The lesson frames this exactly as log-structured (fast writes, background compaction) versus B-tree (faster point reads, slower writes); at 10,000 writes/sec the sequential write path is the one that must not fall behind.",
            "section": "trade-offs",
            "concept": "sd-key-value-store.lsm-vs-btree-tradeoff"
        },
        {
            "key": "d-strongest-node-down-answer",
            "kind": "choice",
            "prompt": "The interviewer asks: 'A node is down during a write. What happens?' Which answer is strongest?",
            "options": [
                "The write fails and the client must retry later, since one of the three replicas is unreachable.",
                "The coordinator promotes one of the two remaining replicas to be the new permanent owner of that key range.",
                "The write succeeds once the other two replicas confirm (W = 2), and a hint for the missing node is stored and replayed via hinted handoff when it returns.",
                "The write is buffered in the coordinator's memory until the third replica comes back, then all three commit together."
            ],
            "answer": 2,
            "explanation": "This is the lesson's own answer: W=2 lets the write succeed with the healthy replicas, and hinted handoff catches the dead one up later.",
            "section": "interviewer-follow-ups",
            "concept": "sd-key-value-store.hinted-handoff-follow-up"
        },
        {
            "key": "d-explaining-not-drawing",
            "kind": "spot_mistake",
            "prompt": "A candidate opens by spending five minutes explaining that key-value stores power sessions, carts, counters and feature flags across the industry, then starts on requirements. What is the mistake?",
            "options": [
                "There is no mistake; establishing why the problem matters shows good judgement before diving in.",
                "They should have covered vector clocks first, since consistency is the hardest part.",
                "Time spent narrating general importance instead of clarifying requirements and reaching the single-node write path eats into the limited interview clock with nothing to show for it.",
                "They should have started with the many-machines architecture since that is more impressive."
            ],
            "answer": 2,
            "explanation": "The lesson's interview tip is to get the whole design out in one breath early and spend real time on the write path and W/R; a preamble about general importance is exactly the clarifying-forever trap.",
            "section": "why-it-matters",
            "concept": "sd-key-value-store.dont-narrate-importance",
            "mistake": "sd-key-value-store.explaining-instead-of-drawing"
        },
        {
            "key": "d-one-breath-summary",
            "kind": "choice",
            "prompt": "You have covered requirements and are about to start drawing. Which one-sentence opening best matches the lesson's advice to give the whole design in one breath early?",
            "options": [
                "Let me first explain the CAP theorem in detail before we touch any components.",
                "Consistent hashing places keys across replicas, quorum reads and writes tune consistency, each node logs then memtables then sorted files, and hinted handoff plus read repair heal failures.",
                "I'll start with the database schema and add replication once that is settled.",
                "We should discuss which programming language to implement this in first."
            ],
            "answer": 1,
            "explanation": "This is close to the lesson's own suggested opening line, giving the interviewer the whole shape before the deep dive; a CAP theorem lecture or a language debate burns time without showing the design.",
            "section": "interview-tip",
            "concept": "sd-key-value-store.one-breath-opening"
        }
    ],
    "sd-news-feed": [
        {
            "key": "d-uniform-fanout-strategy",
            "kind": "spot_mistake",
            "prompt": "A candidate designs fan-out on write for every user, celebrities included, and calls the design finished. What has this design missed, given why this problem is hard in the first place?",
            "options": [
                "The follower graph is extremely skewed, so a single global strategy fails at the extreme end (a 100M-follower account) even though it works for typical users.",
                "Nothing; fan-out on write is correct for all users since writes are cheaper than reads.",
                "The design should have used fan-out on read for everyone instead, since it is simpler.",
                "The design needs a ranking model before it can be evaluated at all."
            ],
            "answer": 0,
            "explanation": "The lesson's entire point is that the naive answer works at small scale and fails catastrophically at large scale because of skew — a handful of accounts with 100M followers break a uniform push strategy, which is why the hybrid exists.",
            "section": "why-it-matters",
            "concept": "sd-news-feed.skew-breaks-uniform-strategy",
            "mistake": "sd-news-feed.one-strategy-for-everyone"
        },
        {
            "key": "d-zero-staleness-requirement",
            "kind": "choice",
            "prompt": "The interviewer insists the feed must reflect a just-published post with zero staleness, no exceptions. Given that precomputation's viability depends on how fresh the feed must be, what does this requirement force?",
            "options": [
                "Nothing changes; precomputed feeds are always instantly consistent.",
                "It only affects the celebrity read-time merge, not normal users.",
                "It removes the option of relying on a few seconds of asynchronous fan-out lag, pushing the design toward stronger, more expensive synchronous guarantees on the write path.",
                "It means the read:write ratio no longer matters for the design."
            ],
            "answer": 2,
            "explanation": "The lesson makes freshness a first clarifying question precisely because it decides whether asynchronous precomputation (with its few seconds of lag) is acceptable; a true zero-staleness bar would undercut the whole hybrid's asynchronous fan-out.",
            "section": "step-1-clarify-the-requirements",
            "concept": "sd-news-feed.freshness-drives-precomputation"
        },
        {
            "key": "d-composite-cursor",
            "kind": "choice",
            "prompt": "The feed API paginates with a cursor on (timestamp, post_id) rather than on post_id alone. Two posts can share the same millisecond timestamp under load. What does including post_id in the cursor prevent?",
            "options": [
                "It prevents duplicate post ids from appearing anywhere in storage.",
                "It prevents ties at the same timestamp from causing ambiguous ordering, which could skip or duplicate a post across pages.",
                "It reduces the size of the feed table by half.",
                "It removes the need for cursor pagination entirely."
            ],
            "answer": 1,
            "explanation": "A tie on timestamp alone can't tell the server where the reader left off, so the id breaks the tie deterministically; this is a refinement of the lesson's 'never offset, always cursor' rule for a feed that shifts under the reader.",
            "section": "step-3-api-design",
            "concept": "sd-news-feed.composite-cursor-tiebreak"
        },
        {
            "key": "d-strongest-celebrity-walkthrough",
            "kind": "choice",
            "prompt": "The interviewer asks: 'A celebrity with 100 million followers posts. Walk me through it.' Which answer is strongest?",
            "options": [
                "It fans out to all 100 million follower feed lists asynchronously over several minutes via the queue.",
                "The post is rejected until the follower count drops below the threshold.",
                "It fans out only to the follower's first 10,000 feed lists and drops the rest.",
                "The post is written once with no fan-out; at read time, each follower's feed request merges in this account's recent posts from a heavily cached entry."
            ],
            "answer": 3,
            "explanation": "This is the hybrid's exact answer for accounts above the threshold — no fan-out at all, cost moved entirely to a cheap, shared, cached read-time merge. Fanning out slowly still saturates the queue for everyone else.",
            "section": "interviewer-follow-ups",
            "concept": "sd-news-feed.celebrity-read-merge-followup"
        },
        {
            "key": "d-skip-arithmetic-opening",
            "kind": "spot_mistake",
            "prompt": "A candidate opens by sketching the database schema before mentioning any numbers, and only computes posts-per-second and followers-per-post ten minutes later when asked. What does the lesson say this costs them?",
            "options": [
                "Leading with the write-amplification arithmetic (posts/sec times average followers) is what makes the hybrid design look inevitable rather than arbitrary, so delaying it makes every later decision look unjustified until it finally appears.",
                "Nothing; schema-first is a perfectly valid opening order.",
                "It costs them nothing as long as the schema is correct.",
                "The mistake is not mentioning ranking early enough."
            ],
            "answer": 0,
            "explanation": "The interview tip explicitly says stating the amplification number early makes the hybrid look inevitable; without it, the schema and architecture choices appear to come from nowhere.",
            "section": "interview-tip",
            "concept": "sd-news-feed.lead-with-amplification",
            "mistake": "sd-news-feed.schema-before-numbers"
        },
        {
            "key": "d-read-qps-cache-decision",
            "kind": "choice",
            "prompt": "Feed reads run at 45,000 QPS peak, each needing a range read of a precomputed list plus batched hydration of post bodies. Given this, what does the read path require to hit p99 under 200 ms?",
            "options": [
                "A relational join across posts and follows on every read.",
                "Running the feed merge logic synchronously inside the database.",
                "A cache-backed hydration layer with a very high hit rate, since the same popular posts are fetched by millions of readers.",
                "Increasing W and R quorum settings on the feed store."
            ],
            "answer": 2,
            "explanation": "The lesson is explicit that hydration is where most read-path latency lives and that it must be a high-hit-rate cache multi-get; a per-read relational join could not meet 200 ms at this QPS.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-news-feed.hydration-cache-requirement"
        },
        {
            "key": "d-two-follows-indexes",
            "kind": "choice",
            "prompt": "The follows table needs an index by follower_id and a separate index by followee_id. Which query does each one serve?",
            "options": [
                "Both serve the same query; the second index is redundant.",
                "By follower_id builds a feed by pull (who do I follow); by followee_id supports fan-out on write (who follows this author).",
                "By follower_id supports fan-out on write; by followee_id builds a feed by pull.",
                "Neither is needed once the hybrid is in place."
            ],
            "answer": 1,
            "explanation": "The lesson names both indexes for exactly these two different access patterns; without followee_id, fan-out on write would require a full scan to find an author's followers.",
            "section": "step-4-data-model",
            "concept": "sd-news-feed.follows-two-indexes"
        },
        {
            "key": "d-threshold-crossover-reasoning",
            "kind": "choice",
            "prompt": "A team debates whether the celebrity threshold should be 1,000 or 50,000 followers. What is the correct way to justify the number, per the lesson?",
            "options": [
                "Pick whichever number is a round figure so it is easy to remember.",
                "Always use 10,000 exactly, since that is the industry standard everyone uses.",
                "Base it purely on the account's verification badge status.",
                "Set it wherever the write cost of fanning out to that many followers exceeds the read cost of merging that account's posts at query time."
            ],
            "answer": 3,
            "explanation": "The lesson is explicit that the number itself matters less than the reasoning: the crossover point is where fan-out write cost overtakes read-time merge cost, so it should be tuned to real data, not memorized.",
            "section": "step-5-first-architecture-and-the-central-decision",
            "concept": "sd-news-feed.threshold-is-tunable-reasoning"
        },
        {
            "key": "d-n-plus-1-hydration",
            "kind": "spot_mistake",
            "prompt": "A feed read fetches 20 post ids from the precomputed list, then calls the post-detail service once per id in a loop, turning a 5 ms lookup into 200 ms. What is this failure and its fix?",
            "options": [
                "This is the N+1 problem at feed scale; the fix is a single batched multi-get against the cache for all 20 ids at once.",
                "This is correct behaviour; latency scales linearly with feed length by design.",
                "This is a sign the feed list is too long and should be capped at 5 items.",
                "This is caused by the quorum consistency setting and is fixed by lowering W."
            ],
            "answer": 0,
            "explanation": "The lesson names this exact failure mode — sequential per-id fetches turning a fast lookup into a slow one — and its remedy, a batched multi-get, which is standard practice for hydration at this scale.",
            "section": "how-it-works",
            "concept": "sd-news-feed.n-plus-1-hydration-fix",
            "mistake": "sd-news-feed.sequential-hydration"
        },
        {
            "key": "d-multiregion-consistency",
            "kind": "choice",
            "prompt": "A European user follows an American celebrity. Posts are served per-region with local fan-out and local follower-graph replicas. What consistency property should you state explicitly about this design?",
            "options": [
                "The feed is always perfectly synchronous across regions with zero delay.",
                "Cross-region users cannot follow each other at all.",
                "A post may appear in one region a moment before another, which is acceptable for a feed and should be said outright rather than hidden.",
                "Multi-region requires abandoning the hybrid fan-out strategy entirely."
            ],
            "answer": 2,
            "explanation": "The lesson calls this out directly: regional fan-out means a small cross-region delay is a real consequence, and the mature answer names it rather than pretending the system is synchronous.",
            "section": "evolution-under-pressure",
            "concept": "sd-news-feed.multiregion-staleness-tradeoff"
        },
        {
            "key": "d-viral-post-thundering-herd",
            "kind": "choice",
            "prompt": "A single post goes viral and is hydrated millions of times per second by the read path. Which failure mode does this risk, and what avoids it?",
            "options": [
                "Feed list corruption, avoided by increasing the replication factor of the feed store.",
                "A thundering herd on that one post id, avoided by caching the hot post locally so repeated hydration hits cache rather than the origin store.",
                "Fan-out queue starvation, avoided by raising the celebrity threshold.",
                "Cursor pagination breaking, avoided by switching to offset pagination."
            ],
            "answer": 1,
            "explanation": "The lesson lists this exactly as a failure mode with the fix being local caching of hot posts — the same mechanism that makes celebrity read-time merges cheap in the first place.",
            "section": "failure-modes",
            "concept": "sd-news-feed.viral-post-caching",
            "mistake": "sd-news-feed.viral-post-uncached"
        },
        {
            "key": "d-chronological-vs-ranked-cost",
            "kind": "choice",
            "prompt": "Product wants to switch from a chronological feed to a ranked one to improve engagement. What does the lesson say this trade costs, beyond the ranking model itself?",
            "options": [
                "Nothing extra; ranking is a drop-in replacement for sorting by time.",
                "It removes the need for a candidate-set retrieval step.",
                "It eliminates the fan-out amplification problem entirely.",
                "A scoring service, a feature store, and a whole evaluation problem, in exchange for improved engagement over a simple, predictable order."
            ],
            "answer": 3,
            "explanation": "The lesson's trade-off is explicit: ranking adds real infrastructure (scoring, features, evaluation) on top of retrieval, which chronological ordering never needed.",
            "section": "trade-offs",
            "concept": "sd-news-feed.ranking-adds-infrastructure"
        }
    ],
    "sd-instagram": [
        {
            "key": "d-fanout-only-instagram",
            "kind": "spot_mistake",
            "prompt": "A candidate spends the whole interview re-deriving the news feed's hybrid fan-out strategy for Instagram and never discusses uploads, renditions, or the media pipeline. What has this candidate missed?",
            "options": [
                "They answered the feed question, not this one; the interesting and different half of Instagram is the media pipeline — how bytes get in, how derivatives are produced, and how storage cost is controlled.",
                "Nothing; the feed strategy is identical, so repeating it is the correct and complete answer.",
                "They should have designed a ranking model for the feed instead of fan-out.",
                "They should have discussed direct messages, which are the real differentiator."
            ],
            "answer": 0,
            "explanation": "The lesson opens by warning exactly against this: the feed half is the same as the news-feed problem, but spending the whole interview there means 'you have answered the previous question rather than this one.'",
            "section": "why-it-matters",
            "concept": "sd-instagram.media-pipeline-is-the-point",
            "mistake": "sd-instagram.only-solving-feed"
        },
        {
            "key": "d-edit-photo-derivative-scope",
            "kind": "choice",
            "prompt": "The interviewer confirms posts can be edited after upload. Given the non-functional requirement that photos must never be lost, what does allowing edits force into scope?",
            "options": [
                "Nothing; edits only touch the caption, never the image bytes or derivatives.",
                "A defined path for regenerating and re-caching every derivative and cached copy when the image itself changes, not just the metadata row.",
                "A ban on any caching of images, since edits would otherwise always be stale.",
                "Storing every historical edit as a separate full-size original forever."
            ],
            "answer": 1,
            "explanation": "The lesson flags deletion as 'a real design item' precisely because derivatives, caches, and CDN copies must all be reached — the same reasoning extends to edits that change the image itself, not just captions.",
            "section": "step-1-clarify-the-requirements",
            "concept": "sd-instagram.edit-implies-derivative-invalidation"
        },
        {
            "key": "d-two-separate-flows",
            "kind": "choice",
            "prompt": "The architecture draws the upload path (client to storage to workers) and the read path (client to API to feed/metadata/CDN) as two almost entirely separate flows. Why does this separation matter for capacity planning?",
            "options": [
                "It doesn't; both paths must always be scaled together as one unit.",
                "It means the CDN can be removed from the read path since uploads already handle bandwidth.",
                "Each half scales independently by its own driver — workers scale with upload rate, API/feed capacity scales with read rate, and the CDN carries the read bandwidth — so a spike in one does not force over-provisioning the other.",
                "It means the metadata database must also store image bytes to stay consistent with object storage."
            ],
            "answer": 2,
            "explanation": "The lesson states this directly: 'workers scale with uploads, API servers scale with reads, and the CDN carries the bandwidth' — drawing them separately is what makes that independent scaling visible.",
            "section": "step-5-first-architecture",
            "concept": "sd-instagram.independent-scaling-of-two-flows"
        },
        {
            "key": "d-strongest-private-account-answer",
            "kind": "choice",
            "prompt": "The interviewer asks: 'A user makes their account private. What happens to previously public image URLs that are already cached or bookmarked?' Which answer is strongest?",
            "options": [
                "Nothing needs to change; object storage access control alone handles this instantly everywhere.",
                "The database marks the account private and that alone stops all future access to old URLs.",
                "Public CDN URLs must be reissued as signed URLs with short expiry going forward, and old caches simply expire naturally over time.",
                "Long-lived public URLs cannot be recalled once issued, so privacy-sensitive media must always be served through short-expiry signed URLs from the start, plus a CDN purge for anything still live."
            ],
            "answer": 3,
            "explanation": "This is the lesson's own answer word for word: long-lived public URLs can't be recalled, which is why signed URLs with short expiry are the only real fix, alongside a purge.",
            "section": "interviewer-follow-ups",
            "concept": "sd-instagram.signed-urls-cannot-be-recalled"
        },
        {
            "key": "d-original-retention-tradeoff",
            "kind": "choice",
            "prompt": "Storage costs are under pressure. A proposal keeps originals forever versus a proposal that archives originals after 30 days. What does the lesson say this trade-off actually buys and cost?",
            "options": [
                "Keeping originals lets you re-encode with better codecs later; archiving them instead saves most of the storage bill, since originals are needed only to regenerate renditions.",
                "There is no trade-off; originals should always be deleted immediately after the first rendition is made.",
                "Archiving originals makes derivative generation faster, not slower.",
                "Keeping originals is required for the feed to function at all."
            ],
            "answer": 0,
            "explanation": "The lesson states originals are needed only to regenerate renditions, so archiving after 30 days is the standard cost lever, while keeping them retains the option of future re-encoding.",
            "section": "trade-offs",
            "concept": "sd-instagram.original-retention-tradeoff"
        },
        {
            "key": "d-ingest-bypass-app-tier",
            "kind": "choice",
            "prompt": "3,000 uploads per second at 3 MB each is roughly 9 GB/s of ingest traffic. What decision does this number force?",
            "options": [
                "The application servers must be scaled to handle 9 GB/s of pass-through traffic directly.",
                "Uploads must go straight from the client to object storage via pre-signed URLs, never through the application tier, since 9 GB/s would saturate app servers' memory and connections.",
                "The database must be upgraded to store the raw bytes at this rate.",
                "9 GB/s is small enough to ignore and route through the API normally."
            ],
            "answer": 1,
            "explanation": "The lesson's own conclusion from this number is that ingest 'must not pass through the application tier' — this is exactly why the upload API only hands out pre-signed URLs.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-instagram.ingest-bypasses-app-tier"
        },
        {
            "key": "d-rendition-row-vs-convention",
            "kind": "choice",
            "prompt": "A design stores a media_renditions row for every one of the seven generated sizes per post. The lesson suggests a simplification. What is it, and why does it work?",
            "options": [
                "Store renditions in a separate database entirely, sharded by rendition size.",
                "Cache rendition metadata in Redis instead of the primary database, keeping the same number of rows.",
                "Derive rendition URLs from a naming convention on the object key so no row is needed at all, since the variant and post id fully determine the object's location.",
                "Store all renditions inline in the post row as a JSON blob."
            ],
            "answer": 2,
            "explanation": "The lesson explicitly calls this out as 'a good simplification worth mentioning' — a deterministic key naming scheme eliminates the need for a renditions table entirely.",
            "section": "step-4-data-model",
            "concept": "sd-instagram.rendition-naming-convention"
        },
        {
            "key": "d-optimistic-upload-display",
            "kind": "choice",
            "prompt": "Processing a photo (validate, strip EXIF, generate renditions) takes a few seconds, yet users perceive posting as instant. How is this achieved, and what does it require the backend to guarantee?",
            "options": [
                "Processing is made synchronous and fast enough that the user simply waits, so nothing special is required of the backend.",
                "The photo is shown to other users immediately from a low-quality preview generated client-side, so the backend has nothing to guarantee.",
                "Uploads are rejected until processing finishes, so there is no illusion of speed at all.",
                "The client shows the photo optimistically using its own local copy while the backend processes in the background; the backend must guarantee that processing eventually completes reliably (or clearly fails) so the optimistic view is never permanently wrong."
            ],
            "answer": 3,
            "explanation": "The lesson names this product technique explicitly and says it 'changes what the backend must guarantee' — the local optimistic view still depends on the async pipeline actually finishing correctly.",
            "section": "how-it-works",
            "concept": "sd-instagram.optimistic-ui-backend-guarantee"
        },
        {
            "key": "d-slow-uploads-mobile-network",
            "kind": "choice",
            "prompt": "Uploads are slow and frequently fail on mobile networks in a region with poor connectivity. Which combination of fixes does the lesson recommend?",
            "options": [
                "Multipart upload with per-part retry, uploading to the nearest edge endpoint, and client-side downscaling before upload so a 3 MB original isn't sent when the largest rendition needed is far smaller.",
                "Increase the pre-signed URL expiry time so uploads have longer to complete without retry logic.",
                "Route all uploads through the application tier so the server can retry on the client's behalf.",
                "Require Wi-Fi for all uploads and block uploads over cellular networks entirely."
            ],
            "answer": 0,
            "explanation": "The lesson lists exactly these three fixes for this scenario, including the detail that client-side downscaling is 'a client change with a large backend benefit.'",
            "section": "evolution-under-pressure",
            "concept": "sd-instagram.mobile-upload-resilience"
        },
        {
            "key": "d-pregenerate-every-rendition-cost",
            "kind": "spot_mistake",
            "prompt": "A design pre-generates and stores all seven renditions for every uploaded photo, including ones nobody will ever view at full size. What failure mode is this, and what's the fix?",
            "options": [
                "This is correct and required; every rendition must exist before the post can go live.",
                "It multiplies storage cost for photos nobody views; the fix is to generate only the two or three always-needed renditions eagerly and produce the rest on first request, caching the result.",
                "It has no cost implications since object storage is effectively free at any volume.",
                "The fix is to reduce the number of renditions offered to users, not to change when they are generated."
            ],
            "answer": 1,
            "explanation": "The lesson lists 'pre-generating every rendition' as a failure mode and gives exactly this fix — most photos are never viewed at full size, so generating on demand for the long tail saves most of the derivative storage.",
            "section": "failure-modes",
            "concept": "sd-instagram.on-demand-rendition-fix",
            "mistake": "sd-instagram.pregenerate-everything"
        },
        {
            "key": "d-egress-number-opening",
            "kind": "choice",
            "prompt": "You are 30 seconds into the interview and want to establish immediately that you understand which half of this system is hard. What should you say?",
            "options": [
                "I'll start by designing the database schema for posts and comments.",
                "Let's discuss whether we need stories or just photos first.",
                "'100 billion image requests a day at 200 KB is 20 petabytes — that is a CDN problem, not a server problem.'",
                "I'll assume a monolith is fine at this scale and move straight to the API."
            ],
            "answer": 2,
            "explanation": "This is the lesson's own interview tip verbatim — computing and stating the egress number early is what signals you understand the architecture-defining constraint.",
            "section": "interview-tip",
            "concept": "sd-instagram.state-egress-early"
        }
    ],
    "sd-video-streaming": [
        {
            "key": "d-treat-video-as-large-file",
            "kind": "spot_mistake",
            "prompt": "A candidate designs video upload and playback by treating a video exactly like a large photo: one file, one URL, served directly from origin on request. What is the core misunderstanding, per the lesson?",
            "options": [
                "Playback is a CDN-and-segment problem, not a large-file-serving problem — the server does no per-viewer work at all, unlike a single large file served on demand.",
                "Nothing; a video is just a larger file, so the same approach that works for photos works here too.",
                "The mistake is only that the file should be split into two renditions instead of one.",
                "The mistake is storing video in a relational database instead of object storage, which is unrelated to playback."
            ],
            "answer": 0,
            "explanation": "The lesson opens by saying this problem 'punishes anyone who treats video as a large file' — the real insight is adaptive bitrate over immutable segments via a CDN, with no streaming server involved.",
            "section": "why-it-matters",
            "concept": "sd-video-streaming.not-a-large-file-problem",
            "mistake": "sd-video-streaming.video-as-large-file"
        },
        {
            "key": "d-live-vs-vod-scope",
            "kind": "choice",
            "prompt": "The interviewer says live streaming is in scope alongside video on demand. Given the lesson's guidance, what does this change about the design?",
            "options": [
                "Nothing; live streaming reuses the exact same VOD pipeline with no changes.",
                "It introduces a much tighter latency budget and a fundamentally different system, so it should be scoped as a separate design unless explicitly required, not bolted onto VOD.",
                "It removes the need for adaptive bitrate entirely.",
                "It means transcoding no longer needs to be parallelized by chunk."
            ],
            "answer": 1,
            "explanation": "The lesson explicitly flags live as a different system with a much tighter latency budget, to be scoped out unless asked — treating it as a VOD add-on misses that it changes ingest, segment length, and CDN caching assumptions.",
            "section": "step-1-clarify-the-requirements",
            "concept": "sd-video-streaming.live-is-a-different-system"
        },
        {
            "key": "d-batched-view-endpoint",
            "kind": "choice",
            "prompt": "At 150,000 view events per second, a naive design calls POST /v1/videos/{id}/views once per view. What does the lesson recommend instead, and why?",
            "options": [
                "Call the same endpoint but make it synchronous so the client waits for confirmation.",
                "Remove the views endpoint entirely and infer views from CDN access logs only.",
                "A batched telemetry endpoint, because a per-view API call at 150,000 per second is its own problem distinct from the counting pipeline behind it.",
                "Route each view call directly to the relational videos table with an UPDATE statement."
            ],
            "answer": 2,
            "explanation": "The lesson calls out the per-view API call itself as 'its own problem' at this rate and recommends batching telemetry, feeding the stream-processing pipeline described in view counting.",
            "section": "step-3-api-design",
            "concept": "sd-video-streaming.batched-view-telemetry"
        },
        {
            "key": "d-strongest-2million-concurrent-answer",
            "kind": "choice",
            "prompt": "The interviewer asks: 'A video gets 2 million concurrent viewers. What breaks?' Which answer is strongest?",
            "options": [
                "The CDN falls over because it cannot handle that much concurrent traffic for one object.",
                "The transcoding pipeline breaks because it must re-encode the video for each new viewer.",
                "Nothing breaks, because the system was already provisioned for exactly this case.",
                "Not the segments — the origin load for a viral video is roughly the same as for an unpopular one, since all viewers request the same immutable segments. What actually needs attention is the metadata endpoint, the view-count write path, and comments, all of which are per-viewer."
            ],
            "answer": 3,
            "explanation": "This is the lesson's own answer: segment-based delivery makes origin load nearly popularity-independent; the real pressure lands on per-viewer paths like metadata and counters.",
            "section": "interviewer-follow-ups",
            "concept": "sd-video-streaming.viral-video-followup"
        },
        {
            "key": "d-diving-into-codecs-first",
            "kind": "spot_mistake",
            "prompt": "A candidate opens the interview by discussing codec choices (H.264 vs AV1) in detail before mentioning any scale numbers. What does the interview tip suggest they should have led with instead?",
            "options": [
                "Saying early that playback is a CDN-and-segments problem with no per-viewer server work, backed by the egress arithmetic, then spending depth on transcoding and view counting.",
                "Nothing; codec choice is the single most important decision and should always come first.",
                "The candidate should have led with the database schema for the videos table.",
                "The candidate should have led with a discussion of recommendation algorithms."
            ],
            "answer": 0,
            "explanation": "The lesson's interview tip is explicit about leading with the CDN-and-segments claim plus the egress arithmetic before going deep on the two areas with real engineering substance.",
            "section": "interview-tip",
            "concept": "sd-video-streaming.lead-with-cdn-claim",
            "mistake": "sd-video-streaming.codec-details-too-early"
        },
        {
            "key": "d-storage-tiering-decision",
            "kind": "choice",
            "prompt": "Storage grows at over 1 PB per day of renditions, and views follow an extreme power law where most uploads are watched almost never. Given this, what should the storage strategy be?",
            "options": [
                "Store every rendition of every video permanently on standard storage, since disk is cheap.",
                "Tier renditions by popularity: keep hot videos widely cached and on standard storage, and move cold, rarely-watched renditions to archive, regenerating on demand for rare views.",
                "Delete all renditions after a fixed 30-day window regardless of popularity.",
                "Store only the original file and transcode fresh on every single playback request."
            ],
            "answer": 1,
            "explanation": "The lesson states storage tiering by popularity is 'the single largest cost lever in the system after the CDN,' precisely because of this power-law view distribution.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-video-streaming.tier-by-popularity"
        },
        {
            "key": "d-watch-events-log-not-table",
            "kind": "choice",
            "prompt": "Where should per-view watch events (video_id, user_id, position, timestamp) live, and why not a normal indexed table?",
            "options": [
                "In the same relational table as videos, indexed by video_id, for easy joins.",
                "Nowhere; per-view events don't need to be retained at all.",
                "As an append-only stream/log, since it feeds analytics, recommendations, and monetisation and would create enormous write and index pressure as an indexed relational table at this volume.",
                "In the view_counts table directly, replacing the aggregate count column."
            ],
            "answer": 2,
            "explanation": "The lesson models watch_events explicitly as 'an append-only stream, not a table,' separate from the aggregate view_counts, because of its volume and its role feeding downstream batch consumers.",
            "section": "step-4-data-model",
            "concept": "sd-video-streaming.watch-events-as-log"
        },
        {
            "key": "d-chunked-parallel-transcode",
            "kind": "choice",
            "prompt": "A 10-minute video is transcoded as a single serial job at five renditions. What does the lesson recommend instead, and what does it buy?",
            "options": [
                "Transcode only the most popular rendition and skip the rest to save time.",
                "Keep it serial but run five separate machines, one per rendition, in parallel with no chunking.",
                "Reduce the video to one rendition to eliminate serial work entirely.",
                "Split the video into small chunks (by GOP boundary) and enqueue one job per chunk per rendition; this turns a serial 20-minute transcode into a two-minute parallel one and lets small jobs run on cheap interruptible capacity."
            ],
            "answer": 3,
            "explanation": "The lesson names chunked parallel transcoding as 'the key trick' for exactly this reason — smaller units of work both parallelize well and tolerate interruption cheaply.",
            "section": "how-it-works",
            "concept": "sd-video-streaming.chunked-transcode-parallelism"
        },
        {
            "key": "d-add-live-streaming-support",
            "kind": "choice",
            "prompt": "The interviewer asks how you'd support live streaming on top of this design. What should you say?",
            "options": [
                "It's a genuinely different pipeline: RTMP/SRT ingest, near-real-time transcoding with a few seconds of latency, much shorter segments (1-2s), and a CDN caching window measured in seconds rather than forever — both latency and cost rise sharply.",
                "It's identical to VOD; simply point the same upload pipeline at a live camera feed.",
                "Live streaming removes the need for adaptive bitrate since there's only one viewer experience.",
                "Live streaming can reuse the exact same segment lengths and CDN caching assumptions as VOD without changes."
            ],
            "answer": 0,
            "explanation": "The lesson is explicit that live is worth acknowledging as a different pipeline rather than pretending it's the same, with concrete differences in ingest protocol, segment length, and caching window.",
            "section": "evolution-under-pressure",
            "concept": "sd-video-streaming.live-streaming-differences"
        },
        {
            "key": "d-uncached-manifest-latency",
            "kind": "spot_mistake",
            "prompt": "Playback start time in a region is measured at 4 seconds instead of under 2. The CDN presence looks fine. What else should you check, per the lesson?",
            "options": [
                "Whether the video's original resolution is too high for that region's devices.",
                "Whether the manifest itself is cached at the edge — an uncached manifest adds a full round trip to a distant origin before any video byte is even requested.",
                "Whether the audio track is a separate file from the video track.",
                "Whether the view-counting pipeline is falling behind in that region."
            ],
            "answer": 1,
            "explanation": "The lesson calls this out specifically: verifying the manifest is edge-cached matters because a manifest fetched from origin adds a full round trip before any segment request begins.",
            "section": "failure-modes",
            "concept": "sd-video-streaming.manifest-caching-latency",
            "mistake": "sd-video-streaming.uncached-manifest"
        },
        {
            "key": "d-segment-length-tradeoff",
            "kind": "choice",
            "prompt": "A team is deciding between short (2s) and long (10s) HLS segments. What does the lesson say this trades off?",
            "options": [
                "Segment length has no effect on adaptation speed or startup time, only on file naming.",
                "Longer segments always win because they reduce the total number of files stored.",
                "Short segments adapt faster to changing bandwidth and start playback quicker, but produce more requests and overhead; long segments are the opposite.",
                "Segment length only matters for live streaming, never for video on demand."
            ],
            "answer": 2,
            "explanation": "The lesson's trade-off list states this directly: shorter segments improve adaptation speed and startup at the cost of more requests and overhead.",
            "section": "trade-offs",
            "concept": "sd-video-streaming.segment-length-tradeoff"
        }
    ],
    "sd-netflix": [
        {
            "key": "d-reuse-youtube-answer",
            "kind": "spot_mistake",
            "prompt": "A candidate answers 'Design Netflix' by reciting the YouTube design almost verbatim: unknown popularity, reactive edge caching, per-upload transcoding ladders. What is the mistake?",
            "options": [
                "Netflix's catalogue is small, fixed, and known in advance, which lets you pre-encode exhaustively and pre-position content at the edge before anyone requests it — a reactive, unknown-popularity design misses the entire point of the question.",
                "Nothing; YouTube and Netflix are architecturally identical, so the same answer applies.",
                "The only real difference is that Netflix needs subtitles and YouTube does not.",
                "The mistake is only that Netflix needs DRM, which is a minor addition to the YouTube answer."
            ],
            "answer": 0,
            "explanation": "The lesson opens by warning against exactly this: reproducing the YouTube answer without identifying what a fixed, known catalogue changes is listed as a common mistake.",
            "section": "why-it-matters",
            "concept": "sd-netflix.fixed-catalogue-changes-everything",
            "mistake": "sd-netflix.reused-youtube-answer"
        },
        {
            "key": "d-entitlement-check-once",
            "kind": "choice",
            "prompt": "Entitlement (subscription status, concurrent stream limit, regional licensing) is checked once at POST /v1/playback/start rather than on every segment request. Why is this the right design?",
            "options": [
                "Because segment requests are encrypted and cannot carry entitlement information at all.",
                "Because checking entitlement on every one of 10 million concurrent segment requests per second would be absurd; checking once per session and encoding the result into a short-lived signed manifest URL is correct and bounded.",
                "Because the CDN performs entitlement checks automatically for all signed URLs.",
                "Because catalogue metadata changes too frequently to check once."
            ],
            "answer": 1,
            "explanation": "The lesson names this as the design decision to highlight: entitlement at segment-request rate is an impossible check volume, while once-per-session is exactly right.",
            "section": "step-3-api-design",
            "concept": "sd-netflix.entitlement-once-per-session"
        },
        {
            "key": "d-two-halves-architecture",
            "kind": "choice",
            "prompt": "The lesson describes the architecture as 'one small request-serving system, and one enormous but largely static content distribution system.' What does a new release do to each half?",
            "options": [
                "It spikes both halves equally, since new content always requires re-architecting the request-serving system.",
                "It causes no change to either half, since catalogue additions are invisible to both systems.",
                "It causes a spike on the request side (session starts, licence issuance, catalogue browsing) and, if content was pre-positioned well ahead of launch, no spike at origin at all on the distribution side.",
                "It only affects the distribution system, since request volume for a title is unrelated to its release."
            ],
            "answer": 2,
            "explanation": "The lesson's own closing point on this architecture is exactly this asymmetry — the small system spikes, the large one doesn't, if pre-positioning was done in advance.",
            "section": "step-5-first-architecture",
            "concept": "sd-netflix.release-spikes-request-side-only"
        },
        {
            "key": "d-strongest-playback-position-answer",
            "kind": "choice",
            "prompt": "The interviewer asks: 'Where do you store playback position, and why not the main database?' Which answer is strongest?",
            "options": [
                "In the catalogue database, since it needs to be joined with title metadata on every read.",
                "In a queue, since position updates are naturally ordered events rather than state.",
                "In object storage alongside the video segments, keyed by profile.",
                "In a key-value store with write-behind caching, because 330,000 small writes per second with no transactional requirement is the wrong shape for a relational primary; losing 30 seconds of position on a cache failure is entirely acceptable."
            ],
            "answer": 3,
            "explanation": "This is the lesson's own answer, naming both the store choice and why the relational catalogue database would be the wrong tool for this specific write pattern.",
            "section": "interviewer-follow-ups",
            "concept": "sd-netflix.playback-position-store-followup"
        },
        {
            "key": "d-open-with-fixed-catalogue-line",
            "kind": "choice",
            "prompt": "You want your opening sentence to immediately show you're answering this question and not the previous one (YouTube). What should you say?",
            "options": [
                "'The catalogue is fixed and known, so unlike a UGC platform I can pre-encode exhaustively and pre-position content at the edge before anyone asks for it.'",
                "'Let's start by designing the recommendation engine, since that's what makes Netflix special.'",
                "'I'll assume this is identical to YouTube except for DRM and billing.'",
                "'The most important thing is choosing the right video codec first.'"
            ],
            "answer": 0,
            "explanation": "This is the lesson's interview tip verbatim — naming the fixed-catalogue difference up front is what separates this answer from a recycled UGC design.",
            "section": "interview-tip",
            "concept": "sd-netflix.open-with-catalogue-difference"
        },
        {
            "key": "d-playback-writes-store-choice",
            "kind": "choice",
            "prompt": "10 million concurrent streams checkpoint position every 30 seconds, producing about 330,000 writes per second of a tiny value with no transactional need. What kind of store does this call for?",
            "options": [
                "A relational store with strict ACID transactions, since correctness of position matters most.",
                "A key-value store with last-write-wins semantics and a write-behind cache in front, since durability of any single checkpoint is not critical.",
                "An object storage bucket, one object per profile-title pair, overwritten on each checkpoint.",
                "The same catalogue database used for titles, since it's already provisioned for high throughput."
            ],
            "answer": 1,
            "explanation": "The lesson is explicit that this is 'a key-value workload with a tiny value, high write rate, and no need for transactions,' calling the relational catalogue database the wrong store.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-netflix.position-writes-kv-store"
        },
        {
            "key": "d-availability-table-purpose",
            "kind": "choice",
            "prompt": "The data model includes an availability table keyed by (title_id, region, start_date, end_date), separate from the titles table. What does this enable that a single global titles table could not?",
            "options": [
                "It allows the CDN to cache titles for longer periods.",
                "It reduces the total number of renditions that must be encoded per title.",
                "It lets the catalogue API filter what a viewer sees by their region and by time-bounded licensing windows, which is a real, domain-specific business rule rather than a generic metadata field.",
                "It removes the need for the entitlement check at playback start."
            ],
            "answer": 2,
            "explanation": "The lesson calls regional, time-bounded content licensing 'a genuine business rule that shapes the catalogue API,' which is exactly what a separate availability table is for.",
            "section": "step-4-data-model",
            "concept": "sd-netflix.availability-table-regional-licensing"
        },
        {
            "key": "d-proactive-vs-reactive-caching",
            "kind": "choice",
            "prompt": "Netflix pre-positions new releases at edge caches before anyone requests them, during off-peak hours. What makes this possible, and how is it different from YouTube's approach?",
            "options": [
                "It requires no prediction at all; every title is pushed to every edge location equally regardless of expected popularity.",
                "It only works because Netflix uses a single CDN provider, unlike YouTube's multi-CDN approach.",
                "It's the same as YouTube; both platforms cache reactively based on the first viewer's request.",
                "Because the catalogue and release schedule are known in advance, popularity can be predicted from release schedules and historical patterns, letting content be pushed proactively — this is the decisive difference from YouTube, where popularity is unknown at upload time and caches fill reactively."
            ],
            "answer": 3,
            "explanation": "The lesson states this is 'the decisive difference from YouTube' — a known catalogue with predictable demand allows proactive edge placement instead of reactive cache-fill-on-miss.",
            "section": "how-it-works",
            "concept": "sd-netflix.proactive-edge-placement"
        },
        {
            "key": "d-tentpole-release-prep",
            "kind": "choice",
            "prompt": "A tentpole release drops at midnight and 30 million people press play within an hour. Content is already at the edge and encodes are done. What still needs explicit preparation?",
            "options": [
                "The entitlement/session-start service and licence issuance, both of which see a spike of hundreds of thousands of requests per second and should be pre-scaled against the known release schedule.",
                "The video segments themselves, which must be re-encoded at launch time to handle the surge.",
                "The CDN, which cannot handle predictable traffic and must be reconfigured live at midnight.",
                "The playback position store, which must be taken offline during the spike to avoid contention."
            ],
            "answer": 0,
            "explanation": "The lesson identifies the session-start and licence services as the parts that are not already prepared, precisely because they are the request-side systems that spike; segments and CDN placement are handled ahead of time.",
            "section": "evolution-under-pressure",
            "concept": "sd-netflix.prescale-session-and-licence-services"
        },
        {
            "key": "d-session-lease-never-expires",
            "kind": "spot_mistake",
            "prompt": "A concurrent-stream-limit design increments a counter at session start and decrements at session end, with no lease expiry. What breaks, and what's the fix?",
            "options": [
                "Nothing breaks; sessions always end cleanly so decrementing on end is sufficient.",
                "Apps crash and devices sleep without a clean session end, so the counter only ever grows and users get phantom-locked out; the fix is a lease renewed by heartbeats that expires after a few minutes of silence.",
                "The fix is to remove the concurrent stream limit entirely since it cannot be enforced reliably.",
                "The fix is to check entitlement on every segment request instead of at session start."
            ],
            "answer": 1,
            "explanation": "The lesson names exactly this failure mode — sessions that never expire lock out users with phantom streams — and its fix, a heartbeat-renewed lease.",
            "section": "failure-modes",
            "concept": "sd-netflix.lease-based-stream-limit",
            "mistake": "sd-netflix.counter-without-expiry"
        },
        {
            "key": "d-drm-tradeoff",
            "kind": "choice",
            "prompt": "Content owners require DRM on all streams. What does the lesson say this decision costs, beyond satisfying the licensing requirement?",
            "options": [
                "It has no real cost; DRM is transparent to both device compatibility and the playback critical path.",
                "It only affects offline downloads, never live streaming playback.",
                "It costs device compatibility work and adds a licence service to the critical path, in exchange for content owners' required protection.",
                "It removes the need for signed manifest URLs entirely, since DRM alone secures the content."
            ],
            "answer": 2,
            "explanation": "The lesson's trade-off list states DRM is 'required by content owners, and it costs device compatibility work and adds a licence service to the critical path' — a real ongoing cost, not a one-time checkbox.",
            "section": "trade-offs",
            "concept": "sd-netflix.drm-cost-tradeoff"
        }
    ],
    "sd-chat-system": [
        {
            "key": "d-websocket-as-source-of-truth",
            "kind": "spot_mistake",
            "prompt": "A design acknowledges a message to the sender as soon as the gateway receives it over the socket, before it's persisted anywhere. What core principle does this violate?",
            "options": [
                "It treats the WebSocket as the source of truth rather than separating durability (the message is stored) from delivery (it reached a device) — the exact error the lesson calls the central insight to avoid.",
                "Nothing; acknowledging on receipt is the fastest possible design and is recommended for lowest latency.",
                "It only matters for group chats, not one-to-one messages.",
                "The issue is only that it should acknowledge after delivery to all devices, not after persistence."
            ],
            "answer": 0,
            "explanation": "The lesson's central insight is separating durability from delivery; acking before persistence is exactly the failure mode it warns against, since a crash between ack and write loses an accepted message.",
            "section": "why-it-matters",
            "concept": "sd-chat-system.durability-before-delivery",
            "mistake": "sd-chat-system.ack-before-persist"
        },
        {
            "key": "d-e2ee-scoping-consequence",
            "kind": "choice",
            "prompt": "The interviewer confirms end-to-end encryption is fully in scope, not just discussed. Given the lesson's framing, what must be decided early because of this?",
            "options": [
                "The group size limit must be reduced to under 50 members.",
                "It rules out server-side search and server-side fan-out of content, since the server can only route ciphertext it cannot read — this must be decided before designing search or moderation features.",
                "It means WebSockets are no longer needed for delivery.",
                "It removes the need for a catch-up endpoint on reconnect."
            ],
            "answer": 1,
            "explanation": "The lesson lists E2EE as a requirements question specifically because it 'rules out server-side search and server-side fan-out of content,' which must shape the design from the start rather than be retrofitted.",
            "section": "step-1-clarify-the-requirements",
            "concept": "sd-chat-system.e2ee-rules-out-server-features"
        },
        {
            "key": "d-gateway-holds-connections-only",
            "kind": "choice",
            "prompt": "The gateway tier holds WebSocket connections and nothing else — no business logic. Why does this specific separation matter?",
            "options": [
                "It doesn't matter; putting business logic in the gateway would work identically.",
                "It reduces the number of gateway machines needed, since business logic normally requires more RAM per connection.",
                "A gateway crash then costs only a reconnect, not lost messages or corrupted state, because durable logic and storage live in the stateless message service and the message store instead.",
                "It removes the need for a registry mapping users to gateways."
            ],
            "answer": 2,
            "explanation": "The lesson states this directly under evolution: because gateways hold only sockets, a gateway holding 250,000 connections dying costs a reconnect and nothing else, since nothing depended on that gateway for correctness.",
            "section": "step-5-first-architecture",
            "concept": "sd-chat-system.stateless-gateway-safety"
        },
        {
            "key": "d-strongest-100k-group-answer",
            "kind": "choice",
            "prompt": "The interviewer asks: 'What changes for a 100,000-member group?' Which answer is strongest?",
            "options": [
                "Nothing changes; the same push-to-all-devices fan-out that works for 500-member groups scales linearly with more infrastructure.",
                "Message ordering becomes global across all members instead of per-conversation.",
                "The message store must switch from partitioned by conversation_id to a single global partition.",
                "Push switches to pull-on-open instead of pushing to every device, per-member read receipts are dropped, and rate limiting is applied to sends — because pushing to 100,000 devices per message is a fundamentally different system than pushing to 500."
            ],
            "answer": 3,
            "explanation": "This is the lesson's own answer to this exact follow-up: broadcast-scale groups switch from push to pull, drop per-member read state, and rate-limit sends.",
            "section": "interviewer-follow-ups",
            "concept": "sd-chat-system.broadcast-group-followup"
        },
        {
            "key": "d-open-with-persist-ack-deliver",
            "kind": "choice",
            "prompt": "You want one sentence that organizes your entire chat design and preempts half the follow-up questions. What should it be?",
            "options": [
                "'Persist first, acknowledge second, deliver third — the socket is an optimisation and the catch-up endpoint is the correctness guarantee.'",
                "'WebSockets guarantee delivery, so once the socket acks the client, the message is safe.'",
                "'Every message needs a globally synchronized clock to establish total order.'",
                "'The database is only needed for storing user profiles, not messages.'"
            ],
            "answer": 0,
            "explanation": "This is the lesson's interview tip verbatim; it organizes the whole design around durability-before-delivery and explains why so many follow-ups are already answered by it.",
            "section": "interview-tip",
            "concept": "sd-chat-system.persist-ack-deliver-opener"
        },
        {
            "key": "d-gateway-node-budget",
            "kind": "choice",
            "prompt": "100 million concurrent WebSockets need to be held across a gateway fleet, and each node comfortably holds 250,000 connections. How many gateway nodes are needed purely to hold sockets, and what does this tell you?",
            "options": [
                "About 40 nodes; connections are cheap enough to ignore in capacity planning.",
                "About 400 nodes; connections are a capacity line item in their own right, independent of message throughput or business logic load.",
                "About 4,000 nodes, because each connection also needs its own database shard.",
                "It cannot be estimated without knowing the average message size."
            ],
            "answer": 1,
            "explanation": "The lesson does exactly this division (100M / 250,000 = 400) and calls connections out as their own capacity line item, separate from the message-processing workload.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-chat-system.gateway-node-count"
        },
        {
            "key": "d-messages-partition-key-choice",
            "kind": "choice",
            "prompt": "The messages table uses conversation_id as the partition key with seq as a descending clustering key. Why this shape rather than partitioning by, say, message_id or sender_id?",
            "options": [
                "Partitioning by sender_id would be simpler and equally effective for the only query this table serves.",
                "Partitioning by message_id spreads messages evenly and is preferred for write throughput.",
                "The only read this table serves is 'the most recent N messages in this conversation', which this shape turns into a single-partition range scan — the cheapest possible query for that access pattern.",
                "This shape is required only because of end-to-end encryption, not for query performance."
            ],
            "answer": 2,
            "explanation": "The lesson states this shape is chosen deliberately because the dominant read pattern is a per-conversation range scan, and conversation_id as the partition key makes that a single-partition operation.",
            "section": "step-4-data-model",
            "concept": "sd-chat-system.conversation-partition-key"
        },
        {
            "key": "d-sequence-number-assignment",
            "kind": "choice",
            "prompt": "Ordering within a conversation is achieved with server-assigned sequence numbers rather than client timestamps. What two mechanisms does the lesson offer for assigning seq, and what do they have in common?",
            "options": [
                "A single global counter shared by all conversations, requiring no partitioning at all.",
                "Client-side vector clocks merged by the receiving device, which requires no server coordination.",
                "Routing all writes for a conversation through a coordinator elected by majority vote across all gateways.",
                "Routing all writes for a conversation to one shard's atomic counter, or a per-conversation lease held by one service instance — both make ordering a partitioned per-conversation problem rather than a global one."
            ],
            "answer": 3,
            "explanation": "The lesson names both mechanisms explicitly and states their shared property: ordering is tractable exactly because it is scoped per conversation, not attempted globally.",
            "section": "how-it-works",
            "concept": "sd-chat-system.per-conversation-ordering-mechanisms"
        },
        {
            "key": "d-registry-hot-at-10x",
            "kind": "choice",
            "prompt": "Traffic rises to 10 million messages per second. The message store scales cleanly because conversation_id is naturally uniform. What component becomes the new bottleneck, and what's the fix?",
            "options": [
                "The registry mapping user_id to gateway, which has 100M+ entries and frequent updates; it must be sharded as a partitioned in-memory store, and fan-out should batch deliveries per gateway rather than per device.",
                "The gateway tier itself, which must switch from WebSockets to HTTP polling at this scale.",
                "The push notification service, which should be removed entirely at this volume.",
                "The trip database, which needs to move from relational to log-structured storage."
            ],
            "answer": 0,
            "explanation": "The lesson identifies the registry as the hot component at 10x scale and prescribes sharding it as a partitioned in-memory store plus batched delivery per gateway.",
            "section": "evolution-under-pressure",
            "concept": "sd-chat-system.registry-becomes-hot-at-scale"
        },
        {
            "key": "d-registry-one-connection-per-user",
            "kind": "spot_mistake",
            "prompt": "A registry design maps user_id to a single connection rather than a set of device connections. What failure does this cause for a multi-device user?",
            "options": [
                "No failure; a single mapping is sufficient since users only need one active device at a time.",
                "Duplicate delivery across devices becomes impossible to prevent, or delivery to only one of several logged-in devices happens silently, since the registry can't represent all of a user's active sessions.",
                "It only affects read receipts, not message delivery.",
                "It causes messages to be delivered out of order within a single device."
            ],
            "answer": 1,
            "explanation": "The lesson lists this exactly as a failure mode: mapping a user to one connection instead of a set causes duplicate or missed delivery across a user's multiple devices.",
            "section": "failure-modes",
            "concept": "sd-chat-system.registry-must-map-device-set",
            "mistake": "sd-chat-system.single-connection-registry"
        },
        {
            "key": "d-history-storage-location-tradeoff",
            "kind": "choice",
            "prompt": "Product debates whether message history lives on the server (server-stored, with retention) or only on devices (device-stored, server as relay). What does the lesson say this trades off?",
            "options": [
                "Device-only storage always wins because server storage is never needed for a chat product.",
                "Server-stored history is strictly better in every dimension, so there's no real trade-off.",
                "Multi-device convenience and search versus petabytes of storage and a real privacy surface — this is called the biggest scoping question in the whole design.",
                "The trade-off only affects group chats, never one-to-one conversations."
            ],
            "answer": 2,
            "explanation": "The lesson calls this the biggest scoping question and names exactly this trade-off: multi-device convenience and searchability against storage volume and privacy exposure.",
            "section": "trade-offs",
            "concept": "sd-chat-system.history-storage-tradeoff"
        }
    ],
    "sd-notification-system": [
        {
            "key": "d-notifications-are-just-a-queue",
            "kind": "spot_mistake",
            "prompt": "A candidate says: 'Notifications are simple — a queue and a provider call.' What does the lesson say this misses?",
            "options": [
                "Everything around that simple core: dozens of producing services, per-user preferences and quiet hours, deduplication, per-human rate limiting, templating, and third-party provider limits and outages — these are what make it a real design problem.",
                "Nothing; a queue and a provider call is a complete and sufficient design.",
                "The only thing missing is choosing which cloud provider's queue to use.",
                "The missing piece is only the database schema for storing message content."
            ],
            "answer": 0,
            "explanation": "The lesson opens by saying notifications 'look like a queue and a provider call' but the real problem is everything surrounding that — exactly the list this option gives.",
            "section": "why-it-matters",
            "concept": "sd-notification-system.more-than-queue-and-provider",
            "mistake": "sd-notification-system.oversimplified-as-plumbing"
        },
        {
            "key": "d-suppressions-table-purpose",
            "kind": "choice",
            "prompt": "The data model includes a suppressions table (hard bounces, unsubscribes, complaints, invalid tokens) checked before every send. What happens if this table is missing or ignored?",
            "options": [
                "Only cost increases slightly; there's no other consequence.",
                "Sending reputation is damaged, potentially leading to spam complaints and provider-level blocking — the lesson calls this table 'frequently forgotten' and central to keeping deliverability intact.",
                "Templates fail to render for affected users.",
                "The rate limiter stops working correctly for all users."
            ],
            "answer": 1,
            "explanation": "The lesson is explicit that the suppressions table 'keeps your sending reputation intact and is frequently forgotten' — skipping it risks provider blocking, not just wasted sends.",
            "section": "step-4-data-model",
            "concept": "sd-notification-system.suppressions-protect-reputation"
        },
        {
            "key": "d-router-vs-worker-separation",
            "kind": "choice",
            "prompt": "The architecture puts all policy logic (dedup, preferences, quiet hours, rate limits, rendering) in a router, and keeps channel workers deliberately dumb (call provider, record outcome, retry). Why separate these two layers?",
            "options": [
                "It doesn't matter; combining policy and delivery into one layer would perform identically.",
                "Workers need the policy logic more than the router does, so this split is backwards from what's optimal.",
                "The policy layer changes constantly while the delivery layer must stay simple and fast; separating them means a policy change never risks destabilizing the fast, simple part of the system that actually talks to providers.",
                "The separation exists purely to reduce the number of database tables needed."
            ],
            "answer": 2,
            "explanation": "The lesson states this plainly: policy changes constantly and delivery must be simple and fast, so keeping them apart protects delivery reliability from policy churn.",
            "section": "step-5-first-architecture",
            "concept": "sd-notification-system.policy-delivery-separation"
        },
        {
            "key": "d-strongest-campaign-followup",
            "kind": "choice",
            "prompt": "The interviewer asks: 'A campaign goes out to 50 million users. How long does it take, and what does it affect?' Which answer is strongest?",
            "options": [
                "It floods the same queue as transactional messages, so a password reset might be delayed behind the campaign.",
                "It completes instantly because the API accepts all 50 million requests synchronously.",
                "It has no effect on anything else in the system since campaigns are entirely separate infrastructure end to end.",
                "It's provider-limited (workers drain at the rate providers allow), runs on a separate low-priority queue so transactional traffic is unaffected, and is spread across time zones by send-at-local-time."
            ],
            "answer": 3,
            "explanation": "This is the lesson's own answer: the queue absorbs the burst, priority separation by queue (not a field) protects transactional traffic, and local-time sending naturally smooths load.",
            "section": "interviewer-follow-ups",
            "concept": "sd-notification-system.campaign-followup-answer"
        },
        {
            "key": "d-lead-with-rate-limit-framing",
            "kind": "choice",
            "prompt": "You want to volunteer the one detail that most signals you've operated a system like this in production. What should you say, and how should you frame it?",
            "options": [
                "'A cap of five notifications per user per hour means a bug in any producing service costs a user five messages, not five hundred' — framed as blast-radius control, not politeness.",
                "'We should support at least ten notification channels from day one.'",
                "'The most important thing is picking a fast message queue technology.'",
                "'Users should be able to fully customize the visual design of every notification.'"
            ],
            "answer": 0,
            "explanation": "This is the lesson's interview tip verbatim — volunteering the per-user rate limit and framing it as blast-radius control is called the detail that most clearly signals operational experience.",
            "section": "interview-tip",
            "concept": "sd-notification-system.volunteer-rate-limit-early"
        },
        {
            "key": "d-sms-cost-asymmetry",
            "kind": "choice",
            "prompt": "Channel split is 70% push, 20% email, 8% in-app, 2% SMS — yet SMS is frequently most of the total cost. What does this asymmetry force into the design?",
            "options": [
                "SMS should be removed from the product entirely since it's such a small share of volume.",
                "Per-channel cost controls become a genuine requirement, not a nicety — a design that treats all channels as interchangeable will blow the budget on SMS specifically.",
                "Push notifications should be deprioritized in favor of SMS since SMS is more expensive to build.",
                "The channel split percentages should be hidden from the router, since it doesn't need cost information."
            ],
            "answer": 1,
            "explanation": "The lesson draws this conclusion directly from the numbers: SMS's cost asymmetry means per-channel cost controls are a genuine requirement, not an afterthought.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-notification-system.sms-cost-forces-controls"
        },
        {
            "key": "d-event-key-mandatory",
            "kind": "choice",
            "prompt": "The API makes event_key a mandatory field on every POST /v1/notifications call rather than optional. What does this buy, and what would making it optional risk?",
            "options": [
                "It buys nothing extra beyond what template_id already provides.",
                "It's mandatory purely for analytics purposes, unrelated to correctness.",
                "It is the only defence against a producer retrying the same logical event and creating a duplicate notification — making it optional would let any producer skip deduplication by omission.",
                "It's mandatory only so the router can pick a channel, not for deduplication."
            ],
            "answer": 2,
            "explanation": "The lesson states event_key is mandatory precisely 'because it is the only defence against a producer retrying' — an optional field would undermine deduplication for any producer that omits it.",
            "section": "step-3-api-design",
            "concept": "sd-notification-system.event-key-mandatory-dedup"
        },
        {
            "key": "d-per-channel-queue-isolation",
            "kind": "choice",
            "prompt": "Push, email, SMS, and in-app each have their own queue and worker pool rather than sharing one queue. What specific failure does this prevent?",
            "options": [
                "It prevents templates from needing localisation.",
                "It prevents the router from needing to check user preferences.",
                "It prevents duplicate notifications from being sent to the same user.",
                "It prevents head-of-line blocking: a shared queue would let a slow channel (like a struggling SMS provider) delay every other channel's messages behind it."
            ],
            "answer": 3,
            "explanation": "The lesson states this explicitly: separate queues mean an SMS provider outage does not delay push notifications, because a shared queue would head-of-line block everything behind the slow channel.",
            "section": "how-it-works",
            "concept": "sd-notification-system.per-channel-queue-isolation"
        },
        {
            "key": "d-push-provider-outage-response",
            "kind": "choice",
            "prompt": "The push provider is down for 30 minutes with no secondary configured. Backlog would take hours to drain at the current rate. What does the lesson recommend?",
            "options": [
                "Keep messages queued, let transactional pushes optionally fall back to another channel like SMS via routing policy, and drop low-priority notifications rather than deliver them a day late — a stale notification is worse than no notification.",
                "Immediately delete all queued messages regardless of priority to keep the queue healthy.",
                "Switch every message to SMS automatically without any policy decision.",
                "Pause all other channels until the push provider recovers, to keep delivery order consistent across channels."
            ],
            "answer": 0,
            "explanation": "The lesson gives this exact sequence: queue and consider a channel fallback for transactional messages via policy, and explicitly drop low-priority notifications rather than deliver them stale.",
            "section": "evolution-under-pressure",
            "concept": "sd-notification-system.provider-outage-response"
        },
        {
            "key": "d-invalid-tokens-not-pruned",
            "kind": "spot_mistake",
            "prompt": "Push volume looks inflated and a growing share of sends fail with 'invalid token' errors that are never acted on. What failure mode is this, and what's the fix?",
            "options": [
                "This is expected and requires no fix; invalid tokens are a normal, unavoidable background noise level.",
                "Invalid device tokens are never pruned, guaranteeing wasted sends; the fix is to prune tokens the provider reports as invalid, as part of ongoing per-token delivery tracking.",
                "The fix is to switch entirely from push to SMS for all affected users.",
                "This indicates the rate limiter is misconfigured and should be loosened."
            ],
            "answer": 1,
            "explanation": "The lesson lists 'invalid device tokens never pruned' as a failure mode directly, with pruning reported-invalid tokens as the fix, alongside per-token delivery tracking.",
            "section": "failure-modes",
            "concept": "sd-notification-system.prune-invalid-tokens",
            "mistake": "sd-notification-system.tokens-never-pruned"
        },
        {
            "key": "d-retry-aggressiveness-tradeoff",
            "kind": "choice",
            "prompt": "A team wants to retry every failed send as aggressively as possible to maximise delivery. What does the lesson say this trades off?",
            "options": [
                "There's no trade-off; maximal retries always improve outcomes with no downside.",
                "Aggressive retries only matter for SMS, never for email or push.",
                "Persistence improves delivery, but risks provider throttling and reputation damage — and permanent failures (invalid token, hard bounce) must not be retried at all, going straight to suppression instead.",
                "Retry aggressiveness has no relationship to provider rate limits."
            ],
            "answer": 2,
            "explanation": "The lesson's trade-off is explicit: retrying helps delivery but risks throttling and reputation damage, and permanent failures should never be retried, only suppressed.",
            "section": "trade-offs",
            "concept": "sd-notification-system.retry-aggressiveness-tradeoff"
        }
    ],
    "sd-ride-sharing": [
        {
            "key": "d-crud-with-a-map",
            "kind": "spot_mistake",
            "prompt": "A candidate treats this problem as CRUD with a map: a drivers table, a riders table, and a query for nearby drivers. What three things does this design miss, per the lesson?",
            "options": [
                "A very high-rate write workload that's almost worthless (locations), a matching problem with a hard correctness requirement (no driver double-booked), and a long-lived stateful entity (the trip) spanning services and payment.",
                "Nothing important; CRUD with a map is a complete and correct architecture for this problem.",
                "Only that the map needs a better UI, which is out of scope for a backend design interview.",
                "Only that surge pricing needs its own microservice."
            ],
            "answer": 0,
            "explanation": "The lesson opens by naming exactly these three combined difficulties and states candidates who treat it as CRUD with a map miss all three.",
            "section": "why-it-matters",
            "concept": "sd-ride-sharing.three-combined-difficulties",
            "mistake": "sd-ride-sharing.crud-with-a-map"
        },
        {
            "key": "d-pooling-scope-decision",
            "kind": "choice",
            "prompt": "The interviewer asks whether pooled rides are in scope. What should you do, per the lesson's guidance?",
            "options": [
                "Design pooling in full detail immediately, since it's clearly more impressive.",
                "Scope pooling out first and offer it as an extension, since pooling is a substantially harder matching and routing problem than single-rider matching.",
                "Refuse to discuss pooling under any circumstances.",
                "Assume pooling and single rides use identical matching logic, so no scoping decision is needed."
            ],
            "answer": 1,
            "explanation": "The lesson explicitly recommends scoping pooling out first and offering it as an extension, because it is a substantially harder matching and routing problem.",
            "section": "step-1-clarify-the-requirements",
            "concept": "sd-ride-sharing.pooling-scoped-as-extension"
        },
        {
            "key": "d-two-systems-different-properties",
            "kind": "choice",
            "prompt": "The architecture draws the location service and the trip service as almost entirely separate systems with different properties. What is the key property difference between them?",
            "options": [
                "The location service is transactional and low-rate; the trip service is ephemeral and high-rate — the reverse of the actual design.",
                "There is no real difference; both should share the same database for consistency.",
                "The location service is high-rate and ephemeral (in-memory, worthless after 30 seconds); the trip service is low-rate and transactional (relational, must never lose state) — drawing them separately is described as most of the design.",
                "The only difference is which programming language each service is written in."
            ],
            "answer": 2,
            "explanation": "The lesson states this is 'most of the design': one system is high-rate ephemeral in-memory, the other low-rate transactional, and conflating them would be a mistake.",
            "section": "step-5-first-architecture",
            "concept": "sd-ride-sharing.location-vs-trip-system-properties"
        },
        {
            "key": "d-strongest-double-booking-answer",
            "kind": "choice",
            "prompt": "The interviewer asks: 'How do you prevent two riders from getting the same driver?' Which answer is strongest?",
            "options": [
                "A Redis lock with a TTL held during the matching process for that driver.",
                "A SELECT to check the driver's current_trip_id, followed by an UPDATE if it's null.",
                "A global lock service that serializes all ride matching across the entire system.",
                "A conditional update on a single row inside a transaction — set current_trip_id where it is currently null — so a second accept for the same driver affects zero rows; this beats a distributed lock because it's a real transactional guarantee, not an approximate one with a TTL."
            ],
            "answer": 3,
            "explanation": "This is the lesson's own answer, explicit that the guarantee should come from a database constraint rather than a distributed lock, and that interviewers specifically look for this choice.",
            "section": "interviewer-follow-ups",
            "concept": "sd-ride-sharing.conditional-update-followup"
        },
        {
            "key": "d-open-with-three-subsystems",
            "kind": "choice",
            "prompt": "You want an opening framing that organizes your whole answer and that weaker candidates typically skip. What should you say?",
            "options": [
                "'There is a very high-rate ephemeral location index, a low-rate high-stakes matching decision, and an ordinary transactional trip state machine. They have completely different requirements, so I will design them separately.'",
                "'The hardest part of this problem is choosing a mapping provider for routing.'",
                "'I'll start by designing the payment integration since that's the most complex part.'",
                "'Everything in this system can share one database since the data volumes are all similar.'"
            ],
            "answer": 0,
            "explanation": "This is the lesson's interview tip verbatim, and it's called the framing that organises the whole answer and that weaker candidates never do.",
            "section": "interview-tip",
            "concept": "sd-ride-sharing.open-with-three-subsystems"
        },
        {
            "key": "d-trip-records-store-choice",
            "kind": "choice",
            "prompt": "20 million trips per day at 2 KB each is 40 GB per day of ordinary trip records. What store should hold this data, per the lesson's reasoning?",
            "options": [
                "The same in-memory geospatial store used for driver locations, since both are write-heavy.",
                "An ordinary relational store — this data is transactional at ordinary volume, and the lesson says to 'put them in a relational store and stop worrying about them.'",
                "A specialized time-series database optimized for high-frequency writes.",
                "A content-addressed object store keyed by trip hash."
            ],
            "answer": 1,
            "explanation": "The lesson explicitly contrasts this with the location workload: trip data is ordinary transactional volume, so a relational store is correct and the matter doesn't need more engineering than that.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-ride-sharing.trips-are-ordinary-relational-data"
        },
        {
            "key": "d-driver-state-uniqueness",
            "kind": "choice",
            "prompt": "The driver_state table maps driver_id to current_trip_id or null. Why is this specific row called 'the critical row' in the data model?",
            "options": [
                "Because it stores the driver's location history for analytics.",
                "Because it's the largest table in the system by row count.",
                "Because the uniqueness constraint on this row is what prevents double-booking — the conditional update against this exact field is the entire correctness mechanism for matching.",
                "Because it's replicated across every region for low-latency reads."
            ],
            "answer": 2,
            "explanation": "The lesson calls driver_state 'the critical row: the uniqueness constraint that prevents double-booking' — it's the single point where the correctness guarantee lives.",
            "section": "step-4-data-model",
            "concept": "sd-ride-sharing.driver-state-critical-row"
        },
        {
            "key": "d-geohash-boundary-problem",
            "kind": "choice",
            "prompt": "A rider is near the edge of a geohash cell. The nearest available driver is just across the boundary in the adjacent cell. What must the query account for, and why?",
            "options": [
                "Nothing; geohash cells are designed so drivers never end up near a boundary.",
                "The system should widen the cell size globally so boundaries never occur.",
                "The query must also switch entirely to H3 hexagons, since geohash cannot be queried across cells at all.",
                "The query must also check neighbouring cells, not just the rider's own cell, because a point near a cell boundary can have close drivers in the adjacent cell — this is named explicitly as 'the boundary problem' worth mentioning."
            ],
            "answer": 3,
            "explanation": "The lesson names this exact issue and its fix: query neighbouring cells in addition to the rider's own, because proximity doesn't respect cell boundaries.",
            "section": "how-it-works",
            "concept": "sd-ride-sharing.geohash-boundary-problem"
        },
        {
            "key": "d-multiregion-straightforward-why",
            "kind": "choice",
            "prompt": "The interviewer asks how this design extends to multiple regions. The lesson calls this 'one of the rare designs where multi-region is straightforward.' Why?",
            "options": [
                "Because the workload partitions perfectly by geography — rides are local by nature, so each region runs its own location index, matching service, and trip store with essentially no cross-region traffic on the hot path.",
                "Because driver locations are stored durably and can simply be replicated globally with no extra work.",
                "Because payment processing eliminates the need for any regional consideration.",
                "Because the trip state machine is stateless and can run in any region interchangeably per request."
            ],
            "answer": 0,
            "explanation": "The lesson gives this exact reasoning — rides are inherently local, so the system already partitions by geography with almost no cross-region hot-path traffic.",
            "section": "evolution-under-pressure",
            "concept": "sd-ride-sharing.geography-partitions-naturally"
        },
        {
            "key": "d-no-offer-expiry",
            "kind": "spot_mistake",
            "prompt": "A driver receives a ride offer and simply never responds — no accept, no decline. With no offer expiry configured, what happens, and what's the fix?",
            "options": [
                "Nothing bad happens; the rider automatically gets matched to the next driver after a fixed system-wide delay with no configuration needed.",
                "The rider is blocked indefinitely waiting on that one offer; the fix is an explicit offer expiry (a deadline) so unresponsive offers time out and the next driver can be tried.",
                "The driver is automatically banned from the platform after one ignored offer.",
                "This only affects surge pricing calculations, not the rider's wait time."
            ],
            "answer": 1,
            "explanation": "The lesson lists 'no offer expiry' as a failure mode directly, noting a driver who ignores an offer can block the rider indefinitely without a deadline.",
            "section": "failure-modes",
            "concept": "sd-ride-sharing.offer-expiry-required",
            "mistake": "sd-ride-sharing.no-offer-timeout"
        },
        {
            "key": "d-parallel-vs-sequential-offers",
            "kind": "choice",
            "prompt": "The matching service can offer a ride to drivers sequentially (one at a time, short timeout each) or in parallel (several at once, first-accept-wins). What does the lesson say each costs?",
            "options": [
                "Sequential offers are always strictly better and parallel offers should never be used.",
                "Parallel offers eliminate contention entirely, so they are the only correct choice.",
                "Parallel offers reduce wait time but waste driver attention and increase contention; sequential offers are efficient per-driver but slow overall — most products use a hybrid, staggering offers to two or three drivers at once.",
                "The choice between them has no effect on driver experience, only on rider wait time."
            ],
            "answer": 2,
            "explanation": "The lesson names this trade-off directly and recommends the hybrid most products actually use: offering to a few drivers at once, staggered.",
            "section": "trade-offs",
            "concept": "sd-ride-sharing.parallel-vs-sequential-offers"
        }
    ],
    "sd-dropbox": [
        {
            "key": "d-upload-download-naive-answer",
            "kind": "spot_mistake",
            "prompt": "A candidate says: 'Upload the files to object storage, download them on the other device — done.' What three things does this naive answer skip, per the lesson?",
            "options": [
                "Bandwidth efficiency when a large file changes by one byte, conflict resolution when two offline devices edit the same file, and the fact that the metadata service — not the storage — is the part that must be fast and consistent.",
                "Nothing; this is a complete and correct answer for a sync product.",
                "Only that files need to be compressed before upload.",
                "Only that object storage needs versioning enabled."
            ],
            "answer": 0,
            "explanation": "The lesson opens by naming exactly these three misses of the naive upload/download answer.",
            "section": "why-it-matters",
            "concept": "sd-dropbox.naive-answer-misses-three-things",
            "mistake": "sd-dropbox.upload-download-is-not-sync"
        },
        {
            "key": "d-conflict-policy-scoping",
            "kind": "choice",
            "prompt": "The interviewer asks how two offline devices editing the same file should be reconciled, before any architecture is drawn. Why does the lesson call this an early, not a late, question?",
            "options": [
                "Because it's purely a UI concern with no backend implications.",
                "Because the answer (last-write-wins, keep-both, or merge) is a product decision that shapes the whole sync protocol, not a detail to bolt on afterward.",
                "Because it only affects the mobile client, never the desktop client.",
                "Because it determines the maximum supported file size, nothing else."
            ],
            "answer": 1,
            "explanation": "The lesson flags this explicitly as shaping 'the whole sync protocol,' which is why it belongs among the very first clarifying questions rather than a later detail.",
            "section": "step-1-clarify-the-requirements",
            "concept": "sd-dropbox.conflict-policy-shapes-protocol"
        },
        {
            "key": "d-bytes-metadata-separate-paths",
            "kind": "choice",
            "prompt": "The architecture draws bytes (client to chunk service to object storage) and metadata (client to metadata service to sharded DB to change log) as separate paths. Which path is described as 'the one under load'?",
            "options": [
                "The bytes path, since large files dominate total data volume.",
                "Both paths carry identical load, so the distinction doesn't matter for capacity planning.",
                "The metadata path, since metadata operations vastly outnumber byte transfers at this scale, making it the system's hot path.",
                "Neither; the notification channel is the actual bottleneck."
            ],
            "answer": 2,
            "explanation": "The lesson states this directly: 'the metadata path is the one under load' because metadata operations vastly outnumber byte transfers.",
            "section": "step-5-first-architecture",
            "concept": "sd-dropbox.metadata-path-is-hot"
        },
        {
            "key": "d-strongest-shared-chunk-answer",
            "kind": "choice",
            "prompt": "The interviewer asks: 'What does the server store for a file that ten users share?' Which answer is strongest?",
            "options": [
                "Ten full copies of the file's bytes, one per user, plus ten metadata rows.",
                "One copy of the bytes, compressed ten times more aggressively than a single-owner file.",
                "Ten copies of the metadata row only, with bytes stored once implicitly by the filesystem.",
                "One copy of each chunk (content-addressed by hash) and ten metadata pointers referencing it."
            ],
            "answer": 3,
            "explanation": "This is the lesson's own answer: content-addressed chunks mean identical content is stored once globally, with each user's file just a pointer to the same chunks.",
            "section": "interviewer-follow-ups",
            "concept": "sd-dropbox.shared-file-storage-followup"
        },
        {
            "key": "d-open-with-chunking-insight",
            "kind": "choice",
            "prompt": "You want one sentence that the rest of the design hangs off of. What should you say?",
            "options": [
                "'The core mechanism is content-addressed chunks — the client hashes chunks locally, asks the server which are missing, and uploads only those. That gives deduplication, delta sync, and resumable uploads from one idea.'",
                "'The most important decision is which cloud provider to use for object storage.'",
                "'I'll assume every file sync is a full re-upload for simplicity.'",
                "'Conflict resolution is out of scope for this design.'"
            ],
            "answer": 0,
            "explanation": "This is the lesson's interview tip verbatim — one idea (content-addressed chunking) that everything else, from dedup to delta sync to idempotent uploads, hangs off of.",
            "section": "interview-tip",
            "concept": "sd-dropbox.open-with-chunking-insight"
        },
        {
            "key": "d-dedup-storage-savings-decision",
            "kind": "choice",
            "prompt": "500 TB per day of new data before deduplication, with identical files and unchanged chunks common in shared folders and repeated documents. What does this justify as a mandatory design element, not a nicety?",
            "options": [
                "A requirement to disable versioning entirely to save space.",
                "Content-addressed, chunk-level deduplication, since it is 'a major cost saving and the mechanism that makes upload instant for a file the system already has.'",
                "A requirement to store every file at reduced quality to save bandwidth.",
                "A requirement to delete files after 30 days regardless of user preference."
            ],
            "answer": 1,
            "explanation": "The lesson states plainly that deduplication is not a nicety at this volume — it's a major cost saving and the mechanism behind instant uploads for known content.",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-dropbox.dedup-is-mandatory-not-nicety"
        },
        {
            "key": "d-versions-append-only-history-free",
            "kind": "choice",
            "prompt": "The versions table is append-only, with a file being just a pointer to its current version. What capability does this give 'for free'?",
            "options": [
                "It gives conflict-free multi-device writes with no optimistic concurrency check needed.",
                "It gives unlimited storage at zero marginal cost.",
                "It gives version history and restore, since old versions are simply older rows that were never overwritten or deleted — nothing extra needs to be built for history.",
                "It gives real-time collaborative editing across devices."
            ],
            "answer": 2,
            "explanation": "The lesson states this directly: 'A file is a pointer to its current version, and history is free' — the append-only shape is what makes restore trivial.",
            "section": "step-4-data-model",
            "concept": "sd-dropbox.append-only-versions-free-history"
        },
        {
            "key": "d-fixed-chunking-insertion-problem",
            "kind": "spot_mistake",
            "prompt": "A design uses fixed-size chunking (every chunk exactly 4 MB, boundaries at fixed byte offsets). A user inserts one byte at the very start of a large document. What happens to delta sync efficiency?",
            "options": [
                "Delta sync is unaffected; only the first chunk needs re-uploading.",
                "Delta sync improves, since inserting a byte makes chunk boundaries easier to detect.",
                "Nothing changes because chunk boundaries are based on content, not position.",
                "The insertion shifts every subsequent chunk boundary, so every chunk after the insertion point changes and delta sync achieves nothing — content-defined chunking (a rolling hash) avoids this by placing boundaries based on content instead."
            ],
            "answer": 3,
            "explanation": "The lesson names this exactly as fixed-size chunking's failure mode, and content-defined chunking (Rabin fingerprinting) as the fix that only changes chunks near the edit.",
            "section": "how-it-works",
            "concept": "sd-dropbox.fixed-chunking-insertion-problem",
            "mistake": "sd-dropbox.fixed-size-chunking-for-edited-docs"
        },
        {
            "key": "d-convergent-encryption-tradeoff",
            "kind": "choice",
            "prompt": "The product wants end-to-end encryption and also wants to keep cross-user deduplication. What technique makes both possible, and what does it cost?",
            "options": [
                "Convergent encryption, deriving the encryption key from the content hash — this restores cross-user dedup but reintroduces the leak of being able to confirm a file exists globally by timing an upload.",
                "Storing all files unencrypted server-side and encrypting only the transport layer.",
                "Disabling deduplication entirely is the only way to support E2EE, with no alternative technique available.",
                "Using a single shared encryption key for all users, which has no privacy cost."
            ],
            "answer": 0,
            "explanation": "The lesson names convergent encryption as exactly this technique and is explicit about its cost: it reintroduces the confirmation-of-file-existence leak that per-user encryption otherwise avoids.",
            "section": "evolution-under-pressure",
            "concept": "sd-dropbox.convergent-encryption-tradeoff"
        },
        {
            "key": "d-non-atomic-local-write-corruption",
            "kind": "spot_mistake",
            "prompt": "A client writes a downloaded file directly to its final path, and the app crashes mid-write. What failure results, and what's the standard fix?",
            "options": [
                "No failure; partial writes to the final path are always safely recoverable on next launch.",
                "A corrupted, half-written file is left at the final path; the fix is to write to a temporary file first, then atomically rename it into place so a crash never leaves a half-written file visible.",
                "The fix is to disable local caching of downloaded files entirely.",
                "The fix is to always re-download the entire file tree after any crash, regardless of what was mid-write."
            ],
            "answer": 1,
            "explanation": "The lesson names this failure mode directly and gives the exact fix: write to a temp file, then rename, so a crash can never leave a half-written file.",
            "section": "failure-modes",
            "concept": "sd-dropbox.atomic-write-then-rename",
            "mistake": "sd-dropbox.direct-write-to-final-path"
        },
        {
            "key": "d-push-vs-poll-notification-tradeoff",
            "kind": "choice",
            "prompt": "Devices need to learn about remote changes. The design uses both a push notification channel and periodic polling as a backstop, rather than push alone. What does the lesson say this buys?",
            "options": [
                "Nothing; using both is redundant and should be simplified to push-only.",
                "Polling alone would be sufficient and push adds only unnecessary connection overhead.",
                "Seconds of latency via push, against a persistent connection per device — most designs use both, with polling as the correctness backstop so a missed notification costs latency, not correctness.",
                "Polling replaces the need for a change log entirely."
            ],
            "answer": 2,
            "explanation": "The lesson's trade-off list states this exactly: push gives low latency at the cost of a connection per device, and polling as a backstop ensures a missed notification is never a correctness failure.",
            "section": "trade-offs",
            "concept": "sd-dropbox.push-plus-poll-backstop"
        }
    ],
    "sd-autocomplete": [
        {
            "key": "d-query-search-index-per-keystroke",
            "kind": "spot_mistake",
            "prompt": "A candidate proposes querying the full search index on every keystroke, ranking results live, and returning the top 10. What core architectural consequence has this candidate missed?",
            "options": [
                "Autocomplete's combination of a brutal latency budget (tens of milliseconds) and forgiving correctness means everything expensive should happen offline, with the live path reduced to a memory lookup — querying the index live cannot meet the budget and interviewers ask this question specifically to see this separation.",
                "Nothing; querying the live index is the standard and correct approach for autocomplete.",
                "The only issue is that the index should be sharded differently, not that it's queried live.",
                "The issue is only that ranking should happen client-side instead of server-side."
            ],
            "answer": 0,
            "explanation": "The lesson states this is exactly the point of the question — the tight latency budget plus forgiving correctness demands moving all expensive work offline, which querying the live index defeats entirely.",
            "section": "why-it-matters",
            "concept": "sd-autocomplete.offline-work-online-lookup",
            "mistake": "sd-autocomplete.query-index-per-keystroke"
        },
        {
            "key": "d-personalisation-scope-decision",
            "kind": "choice",
            "prompt": "The interviewer asks whether suggestions should be fully personalised per user via a dedicated index per person. What does the lesson say about this as a scoping choice?",
            "options": [
                "A per-user index is the standard, expected design and should be built by default.",
                "A per-user index is not viable; the standard compromise is global ranking with light personalisation layered on top, which should be clarified and agreed early.",
                "Personalisation should never be discussed at all in this interview.",
                "Personalisation only matters for typo tolerance, not for ranking."
            ],
            "answer": 1,
            "explanation": "The lesson states directly that 'a per-user index is not viable' and that global ranking plus light personalisation is the standard compromise to agree on during clarification.",
            "section": "step-1-clarify-the-requirements",
            "concept": "sd-autocomplete.no-per-user-index"
        },
        {
            "key": "d-two-paths-never-meet",
            "kind": "choice",
            "prompt": "The architecture draws an offline pipeline (minutes to hours) and an online path (microseconds) as two paths that never meet at request time. What do the serving nodes never do, according to the lesson?",
            "options": [
                "They never cache responses at the edge.",
                "They never handle more than one language.",
                "They never read a database, never call another service, and never compute a score — they only walk a data structure in memory.",
                "They never return more than one suggestion per request."
            ],
            "answer": 2,
            "explanation": "The lesson states this as the defining property of the online path: no database reads, no service calls, no request-time scoring — only an in-memory structure walk.",
            "section": "step-5-architecture",
            "concept": "sd-autocomplete.serving-nodes-memory-only"
        },
        {
            "key": "d-strongest-service-down-answer",
            "kind": "choice",
            "prompt": "The interviewer asks: 'What happens when the suggest service is down entirely?' Which answer is strongest?",
            "options": [
                "The client retries repeatedly with exponential backoff until suggestions return, blocking further typing.",
                "Search itself goes down too, since suggestions and search share infrastructure.",
                "An error message is shown to the user explaining that suggestions are temporarily unavailable.",
                "Nothing visible breaks except the absence of suggestions; search continues to work normally, because this is one of the rare systems where complete failure is an acceptable, correct design outcome."
            ],
            "answer": 3,
            "explanation": "This is the lesson's own answer, explicitly calling out that designing for silent degradation here — rather than retries or error states — is the correct answer, unlike almost any other system in this unit.",
            "section": "interviewer-follow-ups",
            "concept": "sd-autocomplete.silent-degradation-followup"
        },
        {
            "key": "d-state-separation-in-30-seconds",
            "kind": "choice",
            "prompt": "You want to state the entire design's organizing idea within the first thirty seconds. What should you say?",
            "options": [
                "'Everything expensive happens in an offline pipeline; the live path is an in-memory prefix lookup returning a precomputed list.'",
                "'The most important decision is which programming language the trie is implemented in.'",
                "'I'll start by designing typo tolerance, since that's the hardest part.'",
                "'Suggestions should always be personalised per user from the very first keystroke.'"
            ],
            "answer": 0,
            "explanation": "This is the lesson's interview tip verbatim — one sentence that is described as being the design itself, with everything else as elaboration.",
            "section": "interview-tip",
            "concept": "sd-autocomplete.state-separation-early"
        },
        {
            "key": "d-index-fits-in-memory-decision",
            "kind": "choice",
            "prompt": "10 million distinct queries at roughly 50 bytes each plus trie overhead comes to a few gigabytes — small enough to fit fully in memory on one machine. What architectural simplification does this enable?",
            "options": [
                "It means the index must still be sharded for redundancy even though it fits on one machine.",
                "It means the index can be replicated in full to every serving node, eliminating sharding entirely at this size — a simplification worth stating explicitly rather than assuming sharding is always needed.",
                "It means personalisation can now be done with a per-user index after all.",
                "It means the offline pipeline can be removed since the index is small."
            ],
            "answer": 1,
            "explanation": "The lesson calls this out as a conclusion worth stating: because the whole index fits in memory, it can simply be replicated everywhere, which 'eliminates sharding entirely at this size.'",
            "section": "step-2-estimate-the-scale",
            "concept": "sd-autocomplete.index-fits-eliminates-sharding"
        },
        {
            "key": "d-trie-vs-flat-map-choice",
            "kind": "choice",
            "prompt": "A candidate defaults to a trie for the serving structure because it's the textbook answer. What does the lesson say about arguing for a flat hash map instead?",
            "options": [
                "A flat map is never viable because it cannot store top-k lists per prefix.",
                "The trie is strictly superior in every practical dimension, so arguing for a flat map is always wrong.",
                "Both structures are equally memory-efficient, so the choice is arbitrary.",
                "A flat map from prefix to precomputed top-k list is simpler and often the better engineering choice — memory is cheap and a hash lookup is a single operation — and being able to argue for it over the 'elegant' trie is called a good sign."
            ],
            "answer": 3,
            "explanation": "The lesson explicitly frames arguing for the flat map as a positive signal, since it shows practical judgement over defaulting to the textbook-elegant answer.",
            "section": "step-4-data-model",
            "concept": "sd-autocomplete.flat-map-as-good-engineering"
        },
        {
            "key": "d-move-work-to-write-time-principle",
            "kind": "choice",
            "prompt": "The lesson states a general principle behind this whole design: 'move work from read time to write time when reads outnumber writes by orders of magnitude.' At 250,000 reads/sec against an hourly rebuild, what does this principle justify?",
            "options": [
                "It justifies scoring and ranking candidates freshly on every single request, since reads are so frequent.",
                "It justifies skipping the offline pipeline entirely, since writes (rebuilds) are rare.",
                "It has no bearing on this design since query logs are writes, not reads.",
                "It justifies doing all filtering, scoring, and ranking once per rebuild cycle (write time) rather than once per request (read time), since a request-time computation repeated 250,000 times per second is orders of magnitude more expensive than doing it once per rebuild."
            ],
            "answer": 3,
            "explanation": "The lesson names this as 'the general principle worth naming,' and autocomplete is called its extreme case — precompute once, serve many times.",
            "section": "how-it-works",
            "concept": "sd-autocomplete.write-time-vs-read-time-principle"
        },
        {
            "key": "d-shard-when-index-too-big",
            "kind": "choice",
            "prompt": "The index grows beyond what fits in memory on one node. The lesson recommends sharding by prefix. What is the important refinement to a naive alphabetical shard split?",
            "options": [
                "Shard by hash of the first two characters or by observed traffic rather than strict alphabetical ranges, since far more queries begin with common letters like 't' than rare ones like 'z' and an alphabetical split would be wildly uneven.",
                "Shard by the length of the query string instead of its prefix.",
                "Shard by the requesting user's ID instead of the query prefix.",
                "Avoid sharding altogether and instead reduce the number of stored suggestions per prefix."
            ],
            "answer": 0,
            "explanation": "The lesson flags this exactly: alphabetical shards are uneven because letter frequency is skewed, so sharding by traffic or hashed prefix balances load properly.",
            "section": "evolution-under-pressure",
            "concept": "sd-autocomplete.shard-by-traffic-not-alphabet"
        },
        {
            "key": "d-no-frequency-threshold-privacy",
            "kind": "spot_mistake",
            "prompt": "A design suggests every query seen in the logs, including ones typed by only one or two people. What failure mode does this create, beyond noisy suggestions?",
            "options": [
                "It only affects ranking quality, with no other consequence.",
                "It exposes rare queries that may contain personal information — a frequency threshold is not just a quality filter but a privacy safeguard, since a rare query can identify an individual.",
                "It causes the trie to run out of memory immediately.",
                "It only matters for languages other than English."
            ],
            "answer": 1,
            "explanation": "The lesson is explicit that dropping queries below a frequency threshold 'also protects privacy, since a rare query may identify an individual' — this is named as a failure mode, not just a nicety.",
            "section": "failure-modes",
            "concept": "sd-autocomplete.frequency-threshold-is-privacy-safeguard",
            "mistake": "sd-autocomplete.no-frequency-filter"
        },
        {
            "key": "d-rebuild-frequency-tradeoff",
            "kind": "choice",
            "prompt": "The offline pipeline can rebuild the trie every 15 minutes or every 4 hours. What does the lesson say this trades off, and what largely resolves the tension?",
            "options": [
                "There is no trade-off; more frequent rebuilds are always strictly better with no cost.",
                "Rebuild frequency only affects typo tolerance, not general suggestion freshness.",
                "Fresher suggestions against pipeline cost — and a two-tier index (the hourly base plus a small real-time overlay for breaking terms) mostly resolves the tension without requiring very frequent full rebuilds.",
                "Rebuild frequency has no relationship to the real-time overlay used for breaking news."
            ],
            "answer": 2,
            "explanation": "The lesson names this trade-off directly and states the two-tier index (base plus overlay) is what 'mostly resolves' the tension between freshness and rebuild cost.",
            "section": "trade-offs",
            "concept": "sd-autocomplete.rebuild-frequency-two-tier-resolution"
        }
    ]
}
