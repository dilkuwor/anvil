"""Case study: Design a Leaderboard (Top-K)."""

from __future__ import annotations

from database.seeds.learn_system_design import SD

CASE = SD(
    "sd-leaderboard",
    "Design a Leaderboard (Top-K)",
    "Rank millions of players in real time: top 10, my rank and my neighbours, per game and global, reset every month.",
    14,
    "**Interviewer:** \"Design a game leaderboard like the one on Xbox. When a match ends, the player's rank updates right away. Players see the top 10, their own rank, and the players just above and below them. There is one board per game and one global board, and boards reset every month.\"",
    [
        (
            "Why It Matters",
            """A leaderboard looks small. It is not. It is a **sorted structure under constant writes**, and that is hard to keep fast.

The problem tests one idea: "rank" means "how many people are above me". A plain database counts rows to answer that. A sorted set answers by position. Knowing why is the whole interview.

Candidates who reach for SQL `ORDER BY` get stuck at scale. Candidates who name a Redis sorted set, then explain how to keep it durable and how to split it, finish the interview.""",
        ),
        (
            "Step 1: Clarify the Requirements",
            """- *"How fast must a rank update show up?"* — Within a second. Players look right after a match.
- *"What do players read?"* — Top 10, my rank, and the five players above and below me.
- *"Per game, global, or both?"* — Both. The global board sums a player's scores across games.
- *"Do scores replace or add?"* — Usually a new score replaces the old one. Ask which.
- *"How often does it reset?"* — Monthly. Old boards must stay readable.
- *"What about ties?"* — Equal scores need a stable order. Earlier score wins is the usual rule.

**Agreed scope:** submit score, read top N, read my rank, read the players around me. Per-game and global boards. Monthly periods with history.

**Non-functional:** rank visible within one second. Reads under 50 ms. No score lost after the server says "saved". Cheating must be hard.""",
        ),
        (
            "Step 2: Estimate the Scale",
            """- 25 million monthly players, 5 million active on a busy day.
- About 10 matches per active player per day: 50 million score updates a day, 5,000 per second at peak.
- Each match end triggers a read of "my rank" and often the top 10: 10,000 reads per second at peak.

**Consequences:**

- 5,000 sorted writes per second is beyond a SQL index with a rank query. The structure must be in memory.
- 25 million entries at about 100 bytes each is 2.5 GB. That fits one Redis node, with little room to grow. Plan to split.
- Top 10 is the same answer for everyone. Cache it for one second and almost all top-10 reads cost nothing.
- My rank is a different answer per player, so it cannot be cached that way. This read shapes the design.""",
        ),
        (
            "Step 3: API",
            """- `POST /v1/boards/{game}/scores` with `player_id`, `score`, `match_id` → `202` with the player's new rank.
- `GET /v1/boards/{game}/top?n=10` → the top N players with scores and ranks.
- `GET /v1/boards/{game}/players/{player_id}/rank` → the player's rank and score.
- `GET /v1/boards/{game}/players/{player_id}/around?k=5` → the K players above and below, with ranks.

`game` can be `global`. Each call takes an optional `period`, such as `2026-09`, so old months stay readable.

Two small details show care. The `match_id` makes a retried submit safe, so one match cannot count twice. The top-N call sets a one-second `Cache-Control`, so the client absorbs repeat reads.""",
        ),
        (
            "Step 4: Data Model",
            """There are two shapes of data. Keep them apart.

**The score update stream.** Every match end is an event: `player_id`, `game`, `score`, `match_id`, `time`. It goes to a durable log first, such as Kafka or a database table. It is the source of truth. If the ranked structure is lost, this stream rebuilds it.

**The sorted structure.** One **sorted set** per board and per period, keyed `lb:{game}:{period}`. Each member is a `player_id` with its score. The set keeps members in score order, so "who is above me" is a position, not a count.

Say the sentence: "the stream is the truth, the sorted set is the fast view". Then the interviewer knows you will not lose data when a cache node dies.

A small **player profile** table holds names and avatars. The set stores only ids, so it stays small.""",
        ),
        (
            "Step 5: First Architecture",
            """Client → API → Redis sorted set, with a durable log beside it and a rebuild path back

:::viz architecture {"title": "Leaderboard: a score lands, then reads by position", "nodes": [{"id": "client", "label": "Game client", "kind": "client", "col": 0, "row": 1}, {"id": "api", "label": "Score API", "kind": "service", "col": 1, "row": 1, "note": "validates, idempotent"}, {"id": "log", "label": "Score log", "kind": "queue", "col": 2, "row": 2, "note": "source of truth"}, {"id": "redis", "label": "Sorted set", "kind": "cache", "col": 2, "row": 0, "note": "lb:{game}:{period}"}, {"id": "db", "label": "Scores DB", "kind": "db", "col": 3, "row": 2, "note": "history, rebuild"}, {"id": "topcache", "label": "Top-10 cache", "kind": "cache", "col": 3, "row": 0, "note": "one second TTL"}], "edges": [{"from": "client", "to": "api", "label": "submit or read"}, {"from": "api", "to": "log", "label": "append first"}, {"from": "api", "to": "redis", "label": "ZADD, ZRANK"}, {"from": "log", "to": "db"}, {"from": "db", "to": "redis", "label": "rebuild", "dashed": true}, {"from": "api", "to": "topcache", "label": "top 10"}], "steps": [{"title": "A score arrives", "explain": "The match ends and the client posts the score. The API checks the match id has not been seen, then appends the event to the durable log before doing anything else.", "interview": "Say the log comes first because Redis is memory; if the sorted set node dies, the log still holds every score and the set can be rebuilt from it.", "path": ["client>api", "api>log"], "kind": "invariant"}, {"title": "The sorted set updates", "explain": "The API runs ZADD on lb:{game}:{period}. The set moves the player to the right position in O(log n). The API reads the new rank with ZRANK and answers.", "interview": "Say why the update is cheap: a skip list keeps members in order, so an insert touches about log n of 25 million, around 25 steps, not a full re-sort.", "path": ["api>redis"], "kind": "decision"}, {"title": "Reads are positions, not counts", "explain": "Top 10 is ZREVRANGE 0 9. My rank is ZREVRANK. Around me is ZREVRANGE from rank minus 5 to rank plus 5. None of them scan the set.", "interview": "Say that the top 10 is the same for everyone, so it sits in a one-second cache, and that my rank is different per player, so it goes to the set every time.", "path": ["client>api", "api>topcache", "api>redis"], "kind": "tradeoff", "hot": ["redis"]}, {"title": "The whole path", "explain": "Client, API, log first, then the sorted set. A consumer copies the log into the scores database for history and for a rebuild if the set is ever lost.", "interview": "Close by naming the limit: one sorted set on one Redis node is the bottleneck at ten times the writes, and say you would shard it by score range or by player.", "path": ["client>api", "api>log", "api>redis", "log>db", "db>redis", "api>topcache"], "kind": "result"}]}

**The write path:** validate the score, check the `match_id` is new, append to the log, then `ZADD` into the sorted set. Answer with the new rank.

**The read path:** top 10 comes from a cache that refreshes every second. My rank and around-me go straight to the sorted set.

**The rebuild path:** a consumer copies the log into the scores database. If Redis is lost, a job replays the current period into a fresh set in minutes.""",
        ),
        (
            "How It Works",
            """### The sorted set

A Redis **sorted set** keeps members in score order at all times. Inside it is a **skip list** plus a hash map. The hash map finds a member by id. The skip list finds a member by position.

- `ZADD lb:racing:2026-09 4820 player:17` puts the player at 4820, or moves them.
- `ZREVRANGE lb:racing:2026-09 0 9` returns the top 10, highest first.
- `ZREVRANK lb:racing:2026-09 player:17` returns the player's rank from the top.
- `ZREVRANGE` from `rank - 5` to `rank + 5` returns the neighbours.

Each is **O(log n)**. A skip list has levels. The top level skips most members; each level down skips fewer. Finding a position takes about `log n` hops: about 25 for 25 million players. Say that number.

### Why SQL does not scale here

In a table, "my rank" is `SELECT COUNT(*) FROM scores WHERE score > my_score`. Even with an index that walks every row above you, millions of rows for a player near the bottom, on every read.

Top 10 with `ORDER BY score DESC LIMIT 10` is fine on an index. Rank and around-me are not. SQL keeps the history; it does not serve the rank.

### Sharding the sorted set

One set on one node handles a few tens of thousands of writes per second. Past that, split it.

**By score range:** shard 1 holds scores 0 to 999, shard 2 holds 1000 to 1999, and so on. Top 10 comes from the highest shard only. My rank is my position in my shard plus the size of every shard above it, one cheap `ZCARD` each. The cost: a player moves shards when their score crosses a boundary.

**By player:** hash the `player_id` to a shard. Writes spread evenly. Top 10 needs a merge: the top 10 from each shard, then the best 10 of that pile. My rank is the sum of one `ZCOUNT` per shard.

Pick score range when reads dominate. Pick player hash when writes dominate.

### Approximate top-K for "trending"

Some boards can be a little wrong, such as "most played games this hour". Use a **count-min sketch** with a small heap. The sketch counts items in fixed memory. The heap keeps the top K it has seen. Counts can be slightly high, never low. Never use this for a player's rank.

### Durability

Redis is memory. Turn on **AOF** persistence and keep a replica, so a restart or a dead node does not take the board with it.

The real safety net is the score log. Every score is appended there before `ZADD`. The scores database is built from the log, and a rebuild job replays the current period into a fresh set. Say the time: a few minutes for one month of one game.

### Time windows

Use one key per period: `lb:racing:2026-09`, then `lb:racing:2026-10`. A reset is not a delete. It is a new key. The old key stays for the "last month's winners" page, then expires after a few months. The database keeps it forever.

### Ties and stable ordering

Two players with 4820 points need a fixed order. Redis breaks ties by member name, which looks random to a player.

Fold time into the score: `score * 2^20 + (max_time - time_of_score)`. The main score dominates. Among equal scores, the earlier one is higher. Strip the time bits when showing the score. Redis scores are doubles, so keep the packed value under 2^53.""",
        ),
        (
            "Evolution Under Pressure",
            """### Round 1 — "Writes went up ten times."

50,000 writes per second is past one Redis node. Shard the set by player hash across ten nodes. Top 10 becomes a ten-way merge of ten small lists, still cheap. Pipeline the `ZADD` calls so each node sees fewer round trips.

### Round 2 — "Make the global board work across three regions."

Each region keeps its own set and takes local writes. A background job copies each region's score log to the others, and each region applies the foreign scores into its own set. Say the cost: a global rank can lag by seconds across regions.

### Round 3 — "Players are cheating."

Three checks. The game server, not the client, reports the score and signs it. The API rejects scores above the maximum possible for that mode. A background job flags a score that jumped more than any human could, and holds it out of the set until reviewed. The raw event stays in the log, so a wrongly flagged score can be restored.

### Round 4 — "Show the top 10 among my friends."

Do not build a set per friend list. A player has about 100 friends. Read their scores with one `ZMSCORE` call, sort the 100 in memory, and show the top 10. A few milliseconds. The list is small, so the simple answer is the right one.

### Round 5 — "One key is hot."

The global board takes every write from every game. On a launch day that is 20,000 `ZADD` calls per second on one key. Two fixes. Split the key into 16 sub-keys by player hash and merge for reads. Or slow the global write: sum a player's global score once a minute from their per-game scores. The per-game board stays instant; the global board is a minute behind and no one notices.""",
        ),
        (
            "Failure Modes",
            """- **`ZADD` before the log**, so a Redis crash loses scores players already saw.
- **No idempotency key**, so a retried submit counts one match twice.
- **Counting rows in SQL for rank**, so the read gets slower every day.
- **One sorted set for all time**, so a monthly reset means a long delete and an empty board.
- **Ties broken by member name**, so two equal players swap places on every refresh.
- **Trusting the client's score**, so the top 10 fills with impossible numbers.
- **Rebuild job never tested**, so the first outage is when everyone learns it takes six hours.""",
        ),
        (
            "Trade-offs",
            """- **Exact versus approximate.** A sorted set gives exact ranks and grows with players. A count-min sketch gives fixed memory and small errors. Players need exact; trending does not.
- **Shard by score range versus by player.** Cheap top-K and rank versus even writes and a merge on every read.
- **Instant global board versus batched.** Every write hits the global key, versus a one-minute lag that removes the hot key.
- **Redis persistence versus a separate log.** AOF is simple but ties durability to one process. The log is more parts but survives anything.
- **One key per period versus one key for all time.** Simple reset and history versus one ever-growing key.""",
        ),
        (
            "Interviewer Follow-ups",
            """- **"Why not a SQL table with an index?"** — Rank means counting rows above me, which is a scan. A sorted set answers by position in `O(log n)`.
- **"How do you get a player's rank?"** — `ZREVRANK` on the period key, about 25 hops for 25 million players.
- **"Redis dies. What happens?"** — A replica takes over. If both are lost, the rebuild job replays the current period from the database in minutes.
- **"How do you reset monthly?"** — A new key per period. Old keys stay for history and expire later.
- **"The set is too big for one node?"** — Shard by score range or by player hash, and merge the small per-shard answers.
- **"How do you stop cheating?"** — Server-signed scores, a maximum per mode, and a jump detector that holds odd scores for review.""",
        ),
        (
            "Common Mistakes",
            """- Reaching for SQL `ORDER BY` and never explaining why rank does not scale
- Writing to Redis first and calling it durable
- Forgetting that "my rank" cannot be cached like "top 10"
- Building a sorted set per friend list instead of sorting 100 scores in memory
- Ignoring ties, so the board flickers
- Never saying how long a rebuild takes""",
        ),
        (
            "Interview Tip",
            """Give the whole design in one breath early: "append every score to a log, then `ZADD` into a Redis sorted set keyed by game and month; top 10 is `ZREVRANGE`, my rank is `ZREVRANK`, both `O(log n)`; the database is built from the log and can rebuild the set". Then spend the time on why rank is a position and not a count, and on how you shard the set when one node is not enough. That is where most candidates go quiet.""",
        ),
    ],
    [
        "Rank is a position, not a count. A Redis sorted set answers top 10, my rank and around-me in O(log n); a SQL count scans rows.",
        "The score log is the source of truth and the sorted set is the fast view. Append to the log first, then ZADD, and rebuild the set from the database if it is lost.",
        "Shard by score range when reads dominate and by player hash when writes dominate; merge the small per-shard answers.",
        "One key per period makes a monthly reset a new key, not a delete, and folding time into the score keeps ties stable.",
    ],
    [
        "Why does a sorted set find my rank fast when a SQL table has to count rows?",
        "A score comes in. What is written first, and why?",
        "Redis loses the whole set. Walk through how the board comes back.",
        "The set no longer fits on one node. Name two ways to split it and what each costs on a read.",
        "Two players have the same score. How do you keep their order stable?",
    ],
)
