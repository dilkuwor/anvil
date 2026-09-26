"""Building Blocks: Bloom filters, HyperLogLog and Count-Min Sketch."""

from __future__ import annotations

from database.seeds.learn_system_design import SD

TOPIC = "sd-building-blocks"

LESSON = SD(
    "sd-probabilistic-structures",
    "Bloom Filters and Other Probabilistic Structures",
    "Three tiny structures that answer big questions almost right: membership, distinct counts and heavy hitters.",
    12,
    "Some questions are cheap to ask and expensive to answer exactly. Have we seen this URL before? How many unique visitors today? What is trending right now? At scale, the exact answer needs gigabytes. A probabilistic structure gives an almost-right answer in kilobytes. This lesson covers the three you will be asked about: the Bloom filter, HyperLogLog and the Count-Min Sketch. Each makes the same trade: a little wrongness for a lot less memory.",
    [
        (
            "Why It Matters",
            """These structures sit inside systems you will be asked to design. LSM-tree databases use Bloom filters to skip disk reads. Redis ships HyperLogLog as a command. Trending lists run on Count-Min Sketches.

Interviewers use them as a test of judgement: do you know what each one gets wrong, in which direction, and when that is fine?

> Memory cue: all three trade a small, known error for a huge saving in memory. Your job is to say what the error is and show the system can live with it.""",
        ),
        (
            "Mental Model",
            """Each structure answers one question. Each one is wrong in only one direction.

| Structure | Question | Can be wrong how | Size |
| --- | --- | --- | --- |
| Bloom filter | Is X in the set? | Says yes when the answer is no | About 10 bits per item |
| HyperLogLog | How many distinct items? | Off by about 1% either way | About 12 KB, fixed |
| Count-Min Sketch | How many times did X appear? | Counts too high, never too low | A few KB to a few MB, fixed |

The size does not grow with the data. That is the point.

The error is the price. Before you use one, ask: what happens when it is wrong? If the answer is "one wasted lookup", use it. If the answer is "a customer is billed twice", do not.""",
        ),
        (
            "How It Works",
            """### The Bloom filter

A Bloom filter is a bit array of m bits, all starting at 0, plus k hash functions.

To insert an item, hash it k times. Each hash picks one bit. Set those k bits to 1. The item itself is never stored.

To look up an item, hash it the same k times and check the k bits.

- If any bit is 0: the item is **definitely not** in the set. If it had been inserted, that bit would be 1.
- If all bits are 1: the item is **probably** in the set. Other items may have set those bits by chance.

Step through it below. Watch the third query: every bit it checks is 1, but it was never inserted. That is a false positive.

:::viz bloom-filter {"bits": 16, "hashes": 3, "inserts": ["red", "green", "blue"], "queries": ["fig", "red", "pear"]}

### Sizing a Bloom filter

The false-positive rate depends on m bits, n items and k hashes.

false-positive rate ≈ (1 − e^(−k·n/m))^k

You do not need the formula. Remember the rule of thumb.

Rule of thumb: about 10 bits per item and 7 hash functions gives about 1% false positives.

Example: one million URLs. Ten bits each is ten million bits, which is 1.2 MB. Storing the URLs themselves at 60 bytes each would take 60 MB. Fifty times smaller, and one lookup in a hundred is wasted.

Bits per item is the knob. Twenty bits per item gets you near 0.01%. Plan for growth: a filter sized for one million items gets much worse at two million, and resizing means rebuilding from source data.

### No deletes

You cannot remove an item from a Bloom filter. Clearing one of its bits might clear a bit another item needs. That item would then get a false negative, and the one guarantee is broken.

If you need deletes, use a **counting Bloom filter**. Each slot holds a small counter instead of a bit. Insert adds one, delete subtracts one, lookup checks for non-zero. It costs about four times the memory.

### Where Bloom filters are used

- **SSTable lookups in LSM stores.** Cassandra and RocksDB keep one filter per file on disk. A read asks each filter first. "Definitely not" means skip that file.
- **Web crawler: "have we crawled this URL?"** Billions of URLs fit in gigabytes rather than terabytes. A false positive skips one page by mistake, which is fine.
- **Cache-miss guard.** A filter in front of the cache holds every key that exists. A request for a key that was never created is rejected before it touches storage.
- **One-hit-wonder CDN.** Most objects at an edge are requested only once. Akamai puts a first request into a filter and caches only on the second. This roughly halved edge disk writes.

### HyperLogLog

Question: how many distinct items have I seen? Unique visitors today, unique search queries this hour.

The exact way is a set of every item. For 100 million visitors that is gigabytes. HyperLogLog does it in about 12 KB with roughly 1% error.

The intuition is a coin-flip trick. Hash every item to a random-looking bit string and count its leading zeros. Half of all hashes start with 0. A quarter start with 00. About one in a thousand starts with ten zeros. So if the longest run you have ever seen is ten, you have probably seen about a thousand distinct items. The same item twice changes nothing, because it hashes to the same string.

One such number is a noisy guess. HyperLogLog splits items into many buckets by the first few bits of the hash, keeps the longest run per bucket, and averages them. Redis uses 16,384 buckets, which is where the 12 KB and the 0.81% error come from.

Merging is free: take the larger value in each bucket. Keep one per server per hour, then merge for a daily total across the fleet.

### Count-Min Sketch

Question: how many times did each item appear, for items I did not know in advance? Trending hashtags, the most requested keys, the noisiest client IP.

An exact counter per item grows without bound. A Count-Min Sketch is a fixed grid: d rows of w counters, with one hash function per row.

To count an item, hash it once per row and add one to that counter in each row. To read a count, hash the same way and take the **minimum** across rows.

Why the minimum? Other items collide with it in some rows and inflate those counters. The row with the least collision damage is closest to the truth. That row can still be too high, but never too low, because nothing subtracts.

So the sketch **over-counts only**. A rare item can look popular by accident. A popular item can never look rare. For top-k that is the right direction: you will not miss a heavy hitter, and you can verify the few candidates with exact counts.

Top-k in practice: keep a small min-heap of the k highest estimates next to the sketch. For trending, keep one sketch per time window.""",
        ),
        (
            "Example",
            """Design a URL shortener with 10 billion short links.

Bots and typos generate a steady stream of lookups for codes that were never created. Each one misses the cache and hits the database. Under a scan attack the database is the bottleneck.

Fix: insert every created code into a Bloom filter. On lookup, check the filter first.

- "Definitely not" ends the request with a 404 in microseconds.
- "Probably yes" goes to the cache, then the database, as normal. About 1% of these are wasted trips. Fine.

Sizing: 10 billion codes at 10 bits each is 12.5 GB. Too big for one process, so keep one filter per database shard and rebuild each from its shard on startup.

Now the interviewer asks for a dashboard: unique visitors per link per day, and the top ten links this hour.

- Unique visitors: one HyperLogLog per link per day, merged across servers. Off by about 1%, which nobody reading a chart will notice.
- Top ten: one Count-Min Sketch per hour with a heap of candidates. Verify the ten against exact counts if needed.

Then: link owners pay per click. Can the dashboard drive billing? No. Write click events to a log and count them exactly. The sketch is for the chart, not the invoice.""",
        ),
        (
            "When You Need the Exact Answer",
            """- **Money.** Billing, balances, payouts. An over-count is a customer charged for a click that never happened.
- **Correctness gates.** "Has this payment ID been processed?" needs a real store. A false positive here silently drops a real payment.
- **Small data.** If the exact set fits in memory, use the set. The approximate version is not simpler, only smaller.

The interviewer trap is the money question. It usually comes right after you introduce one of these structures. Answer in one line: "Not for billing. For billing I write every event to an append-only log and count exactly." Saying it unprompted is even better.""",
        ),
        (
            "Trade-offs",
            """- **Memory versus certainty.** Fifty times smaller, one answer in a hundred wrong. The rate is a dial, but it never reaches zero.
- **Fixed size versus growth.** A filter sized for last year's data gives a worse rate this year. Rebuild on a schedule or over-provision.
- **Speed versus deletes.** A plain Bloom filter cannot delete. A counting Bloom filter can, at four times the memory.
- **Answer direction.** Each structure is wrong one way only. Make sure the wrong way is the cheap way: a wasted lookup, an extra candidate to verify, a chart off by a percent.""",
        ),
        (
            "Common Mistakes",
            """- Saying a Bloom filter "has the item" instead of "probably has the item"
- Deleting from a plain Bloom filter, which creates false negatives
- Sizing the filter for today's item count with no room to grow
- Using a Count-Min Sketch or HyperLogLog for billing or any money number
- Using a Bloom filter to check "was this request already processed", where a false positive drops real work
- Forgetting the filter must be rebuilt from source data after a restart""",
        ),
        (
            "Interviewer Follow-ups",
            """- **"Can it have false negatives?"** — Never, as long as nothing clears a bit. That is why deletes are not allowed.
- **"How does Cassandra read a missing key quickly?"** — One Bloom filter per SSTable. Every filter says "definitely not", so no file is read.
- **"Can we use this for the monthly invoice?"** — No. Exact counts from the event log. The sketch is for the live chart.""",
        ),
        (
            "Interview Tip",
            """Introduce the structure, then say its wrong direction in the same breath. "A Bloom filter in front of the database. It can say yes when the answer is no, about 1% of the time, so we waste one lookup in a hundred. It can never say no when the answer is yes, so we never lose a real key."

Then close the money door before the interviewer opens it: "This drives the live view. Anything billed comes from the exact event log." """,
        ),
    ],
    [
        "All three structures trade a small, known error for memory that does not grow with the data.",
        "A Bloom filter answers 'definitely not' or 'probably yes'. About 10 bits per item and 7 hashes gives about 1% false positives, and it cannot delete.",
        "HyperLogLog counts distinct items in about 12 KB using the longest run of leading zeros, and merges by taking the max per bucket.",
        "A Count-Min Sketch over-counts only, which makes it safe for top-k and trending but never for money.",
    ],
    [
        "A Bloom filter says an item is present. What exactly do you know, and what must you do next?",
        "Size a Bloom filter for 50 million items at about 1% false positives. How much memory is that, and what changes if the count doubles?",
        "Why can you not delete from a plain Bloom filter, and what do you use instead?",
        "Explain how HyperLogLog estimates 1,000 distinct items from the longest run of leading zeros, and why merging two of them is cheap.",
        "The product team wants to bill link owners per click using the Count-Min Sketch behind the trending list. What do you say, and what do you build instead?",
    ],
)

LESSON["display_order"] = 2
