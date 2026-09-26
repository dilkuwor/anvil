"""Building Blocks — Unique ID Generation."""

from __future__ import annotations

from database.seeds.learn_system_design import SD

TOPIC = "sd-building-blocks"

LESSON = SD(
    "sd-unique-ids",
    "Unique ID Generation",
    "Why auto-increment stops working at scale, and the three ways to make ids that are unique, sortable and cheap.",
    12,
    "Every row, message, order and short link needs an id. On one database this is easy: the database counts. Once data lives on many machines in many regions, nobody can count for everyone. This lesson is about how to make ids that never collide, sort by time, and fit in 64 bits, without a single machine in the middle.",
    [
        (
            "Why It Matters",
            """Auto-increment works because one database holds the counter. It gives out 1, 2, 3 and never repeats.

Sharding breaks that. Shard A gives out 1, 2, 3. Shard B also gives out 1, 2, 3. The ids collide as soon as the rows meet in one place.

Regions break it too. If every region asks one central database for the next number, every write crosses an ocean. That is slow, and when that database is down, no region can write at all.

Interviewers use ids as a quick depth check. "How do you generate ids?" comes up in the URL shortener, the news feed and the chat app. A clear answer takes one minute.""",
        ),
        (
            "Mental Model",
            """An id has two jobs: be unique, and be useful.

Unique is the hard part when machines cannot talk. Three ways get it without a central counter.

1. **Make it random and big.** So big that a collision is practically impossible. This is UUID v4.
2. **Put the machine in the id.** Each machine gets its own number range and counts inside it. This is Snowflake.
3. **Hand out ranges in batches.** One service gives each machine a block of ids to use. This is the ticket server.

Useful means the id also does something for you. People want **time order** (new ids sort after old ones) and **small size** (64 bits fits an integer column and an index).

> Memory cue: random ids are easy but sort badly. Time-based ids sort well but need a clock you can trust.

The requirements an interviewer will probe, in order:

- Unique across every machine and region.
- Roughly ordered by time.
- Fits in 64 bits.
- Tens of thousands of ids per second, or more.
- No single point of failure.""",
        ),
        (
            "How It Works",
            """Every Snowflake id is one 64-bit number split into three bands. Step through the diagram to watch the sequence count up inside one millisecond and the generator refuse when the clock goes backwards.

:::viz snowflake-id {"machineId": 7, "timestamps": [1600000005000, 1600000005000, 1600000005000, 1600000005001, 1600000004999, 1600000005003]}

### UUID v4

A UUID v4 is 122 random bits inside a 128-bit value. Collisions are so unlikely that nobody checks for them.

The bad part is that random ids are a poor primary key. Each new row lands in a random place in the B-tree index, so inserts get slow and the cache stays cold. The id is also 128 bits, twice a normal integer, and it says nothing about when the row was made.

### UUID v7 and ULID

Both fix the ordering problem. The first 48 bits are a millisecond timestamp. The rest is random. New ids sort after old ones, so inserts go to the end of the index.

They are still 128 bits. Use them when you want no coordination at all and can afford the size. ULID is the same idea in a readable base32 text form.

### Snowflake, bit by bit

Twitter's Snowflake packs everything into a signed 64-bit integer.

- **1 bit** unused, so the number stays positive.
- **41 bits** of milliseconds since a custom epoch. That is about 69 years.
- **10 bits** of machine id. That is 1,024 generators.
- **12 bits** of sequence. That is 4,096 ids per millisecond per machine.

id = (timestamp − epoch) << 22 | machine_id << 12 | sequence

The custom epoch matters. Milliseconds since 1970 already use 41 bits, so counting from your own launch date gives you the whole 69 years.

The generator keeps two numbers in memory: the last timestamp used and the current sequence. On each request it reads the clock. New millisecond: sequence goes back to 0. Same millisecond: sequence goes up by one. At 4,095 it waits for the next millisecond.

The dangerous case is the clock going backwards. NTP corrections and virtual machine pauses can do this. If the clock reads a time older than the last timestamp used, the generator could hand out an id it already gave. So it must not generate. It returns an error or waits until the clock catches up. Set NTP to slew (adjust slowly) rather than step (jump), and alert on any large jump.

The machine id must be unique too. It is assigned once, from configuration, ZooKeeper, or a database row on startup. Two nodes with the same machine id will collide in the same millisecond.

What you get: about four million ids per second per node, no network call per id, and ids that sort by time across the cluster to within clock drift.

### Ticket server and range allocation

Flickr's approach uses the database you already have. One table with one row. Each request runs `REPLACE INTO tickets` and reads `LAST_INSERT_ID()`. That database is a single point of failure, so Flickr ran two: one hands out odd numbers, the other even.

The cheaper version is **range allocation**. A service, or a row in the database, hands each application server a batch of 1,000 ids. The server counts through the batch in memory and asks for the next batch when it is almost out. One round trip per thousand ids instead of one per id.

These ids are unique and roughly increasing. They are not strictly time-ordered across servers, because server A may still be using its batch when server B gets a later one. If a server crashes, the rest of its batch is lost. Gaps do not matter.

### Short ids for URLs

A URL shortener needs about seven characters, not 64 bits. There are two ways to get there.

**Base62 of a counter.** Take a unique number from Snowflake or a range allocator and write it in base62 (0-9, a-z, A-Z). Seven characters hold 3.5 trillion values. There is no collision because the number was already unique. The cost is that the ids are guessable: the next link is one more than this one.

**Hash the long URL.** Take MD5 or SHA-256 of the URL and keep the first seven characters. Same URL gives the same short id, which is sometimes wanted. But seven characters of a hash will collide eventually. You must check the database, and on a collision add a salt and hash again. That is an extra read on every write.

Most designs use the counter. If guessing is a problem, shuffle the bits before encoding.""",
        ),
        (
            "Choosing By Need",
            """Ask three questions about the ids and the answer falls out.

**Do they need to sort by time?** A feed, a chat, or anything paged by "newer than" wants time-ordered ids. Snowflake, UUID v7, or range allocation. Plain UUID v4 does not sort.

**Is guessing a problem?** A public URL or an invoice number that reveals how many orders you have is a leak. Random UUIDs are unguessable. Snowflake ids reveal time and rough volume. Counters reveal everything.

**How big can they be?** A primary key on a table with billions of rows wants 64 bits. Every index carries the key, so 128 bits costs twice the space in every index. Snowflake and range allocation give 64 bits. UUIDs give 128.

Example: a news feed picks Snowflake, because posts must sort by time and are paged constantly. A URL shortener picks a counter plus base62, because it wants short strings and does not care about time.""",
        ),
        (
            "Example",
            """A chat service stores messages for a million conversations across 64 shards.

**Requirement.** Messages must show in order. Clients page with "give me messages after id X". The service writes 50,000 messages per second.

**Choice.** Snowflake ids. Each API server runs its own generator with a machine id assigned from ZooKeeper at startup. No network call per message.

**Why not auto-increment.** Each shard would count on its own. Message 500 on shard 3 and message 500 on shard 9 would collide.

**Why not UUID v4.** The ids would not sort, so "after id X" would mean nothing, and every shard's index would take random inserts.

**Failure.** A server's clock jumps back 200 ms after an NTP correction. Its generator refuses for 200 ms and returns errors. The load balancer routes around it. No duplicate id is ever issued, which is the property that matters.""",
        ),
        (
            "Trade-offs",
            """- **UUID v4** — no coordination and unguessable, at the cost of 128 bits and random index inserts.
- **UUID v7 / ULID** — no coordination and time-sorted, still 128 bits.
- **Snowflake** — 64 bits, time-sorted, millions per second per node; needs unique machine ids and trustworthy clocks.
- **Ticket server** — simple and uses the database you have; every id is a round trip and the server is a hot spot.
- **Range allocation** — one round trip per batch; ids are not strictly time-ordered across servers, and a crash wastes the rest of the batch.
- **Hash for short ids** — same input gives the same id; collisions must be checked on every write.""",
        ),
        (
            "Common Mistakes",
            """- Saying "use a UUID" without saying which version, so the ordering problem stays hidden.
- Using UUID v4 as the primary key on a large table and being surprised by slow inserts.
- Forgetting the custom epoch and running out of the 41-bit timestamp early.
- Letting the generator keep going when the clock goes backwards.
- Assigning machine ids by hand, so two nodes end up with the same one after a redeploy.
- Hashing a URL to seven characters and not handling the collision.
- Treating Snowflake ids as exactly ordered across machines. They are ordered to within clock drift.""",
        ),
        (
            "Interviewer Follow-ups",
            """- **"Why not just use auto-increment?"** — It works on one database only. Shards collide and regions serialize on one machine.
- **"What happens when the clock goes backwards?"** — The generator refuses or waits. Say how you keep the jump small: slew, not step.
- **"How many ids per second does one node give?"** — 4,096 per millisecond, about four million per second, and it waits a millisecond when the sequence is full.
- **"How do nodes get their machine id?"** — Configuration, ZooKeeper, or a database row on startup. It must be unique across the cluster.
- **"Are Snowflake ids exactly ordered?"** — Within one node, yes. Across nodes, only as well as the clocks agree.
- **"Are these ids safe to show users?"** — They reveal creation time and rough volume. If that matters, use random ids or shuffle before encoding.""",
        ),
        (
            "Interview Tip",
            """Say the full sentence once and move on: "I'll use Snowflake-style ids: 41 bits of time, 10 bits of machine, 12 bits of sequence. They are unique without coordination, sort by time, and fit in 64 bits. If the clock goes backwards the generator refuses rather than risk a duplicate." That answers the next three questions before they are asked.""",
        ),
    ],
    [
        "Auto-increment needs one counter; shards and regions break that, so ids must be made without a central machine.",
        "Snowflake packs time, machine and sequence into 64 bits: unique without coordination and sorted by time.",
        "A clock that goes backwards must stop the generator; a duplicate id is worse than a short pause.",
        "Pick by need: time order wants Snowflake or UUID v7, unguessable wants random, small wants 64 bits.",
    ],
    [
        "Why does auto-increment stop working once a table is sharded?",
        "What are the three fields in a Snowflake id and how many bits does each get?",
        "What should an id generator do when the machine clock goes backwards?",
        "When would you choose UUID v7 over Snowflake, and what does it cost you?",
        "How does a URL shortener turn a counter into a seven-character id, and why is hashing riskier?",
    ],
)

LESSON["display_order"] = 1
