"""Batch and Stream Processing: pipelines, MapReduce, windows, watermarks and exactly-once results."""

from __future__ import annotations

from database.seeds.learn_system_design import SD

TOPIC = "data-processing"

LESSON = SD(
    "sd-batch-stream-processing",
    "Batch and Stream Processing",
    "How data gets from the request path to reports and alerts: batch jobs, streaming windows, watermarks, and how to keep the numbers right.",
    15,
    "Your main database answers one question at a time: this user, this order, right now. Analytics asks a different kind of question: how many orders per minute, across every user, all week. A data pipeline is the path between those two worlds. It runs in one of two modes. Batch processes a big pile of data on a schedule. Stream processes each event soon after it happens. The interview is about knowing which one you need, and how to keep the results correct when data arrives late.",
    [
        (
            "Why It Matters",
            """Every design has a second half that candidates forget. The first half serves users. The second half counts, reports, and alerts on what those users did.

Interviewers ask about it directly: "How do you build the dashboard?", "How does the ad-click count stay correct?" A vague "we send it to a data pipeline" scores nothing.

The strong answer names the mode, the clock you count by, and how you handle late and duplicate data. That is a small vocabulary.

> Memory cue: batch is a photo of the whole table, taken once a day. Stream is a video of the changes, watched as they happen.""",
        ),
        (
            "Mental Model",
            """Two systems live side by side.

- **OLTP** — the database behind the app. Small reads and writes, one row at a time. Must never be slowed down by a report.
- **Analytics** — big scans across millions of rows. Slow by nature. Must never run on the OLTP database.

The pipeline moves data from the first to the second.

App database → Pipeline → Warehouse or lake → Dashboards, alerts, models

Batch moves it in large chunks on a timer. Stream moves it one event at a time through a log. The difference is how fresh the answer is, and how hard correctness is.""",
        ),
        (
            "How It Works",
            """:::viz stream-window {"events": ["1:4", "3:2", "2:5", "6:1", "5:3", "8:2", "4:7", "9:1", "13:2", "10:2", "12:4"], "windowSec": 5, "lateness": 2}

### Batch: MapReduce in plain words

MapReduce is the original way to process data too big for one machine. Three phases.

1. **Map** — split the input. Each worker reads its piece and emits key-value pairs. For word count, each word becomes `(word, 1)`.
2. **Shuffle** — group the pairs by key and send every pair with the same key to the same worker.
3. **Reduce** — each worker adds up the values for its keys and writes `(apple, 4123)`.

The shuffle is the only step where data moves between machines. Everything else is local, so the job scales by adding workers.

The weak part is disk. Classic MapReduce writes to disk after every phase.

### Spark and why memory helped

Spark keeps the data in memory between steps. A ten-step job touches disk once at the start and once at the end. Typical jobs got ten to a hundred times faster.

Spark also gave a friendlier API: `filter`, `groupBy`, `join`. "Batch job" today usually means Spark or SQL on the warehouse.

### Daily jobs and idempotent reruns

Batch jobs run on a schedule: "every night, read yesterday's events, write yesterday's totals". A scheduler such as Airflow runs the steps in order and retries what fails.

The rule that keeps this sane: every job must be safe to run twice. The job for day D reads only day D and overwrites only the output for day D. Crash halfway, run again, same result. That is what lets you fix a bug and rerun a month.

### Stream: the log

A stream pipeline starts with a log, usually Kafka. Producers append events to a topic. The topic is split into partitions. Each consumer keeps an offset, a bookmark into the partition.

Because the log keeps the events, a consumer can fall behind and catch up. It can also rewind and replay. Every recovery story below depends on that.

### Stream engines

- **Flink** — the reference engine for event time, windows, watermarks and checkpoints.
- **Spark Structured Streaming** — runs a small batch every few hundred milliseconds. One skill set for batch and stream.
- **Kafka Streams** — a library inside your service, no cluster to run. Good for one team's topic-to-topic transforms.

Name one and move on to the hard parts.

### Event time versus processing time

Every event has two clocks.

- **Event time** — when the thing happened, stamped by the device that saw it.
- **Processing time** — when your pipeline saw the event.

They differ whenever a phone is offline or a consumer is catching up. A click at 09:59 on a plane may reach you at 11:30.

Counting by processing time is easy and wrong: the click lands in the 11:00 bucket. Counting by event time is right and harder, because you never know when all the events for 09:00 have arrived.

### Windows

A window is a slice of time you count over.

- **Tumbling** — fixed size, no overlap. Every five minutes, one bucket. Dashboards and billing.
- **Sliding** — fixed size, overlapping. The last five minutes, refreshed every minute. Alerts and rate detection.
- **Session** — starts at the first event and closes after a gap of silence. One window per user visit.

The diagram above uses tumbling windows. Each event is placed by its event time, not by when it arrived.

### Watermarks and late data

A watermark is the pipeline's guess of how far event time has progressed. It says: "I do not expect events older than T any more."

The simplest rule is the one in the diagram. The watermark trails the newest event time by the allowed lateness. With lateness two seconds and newest event at 08, the watermark is at 06.

When the watermark passes the end of a window, the window closes and emits its result. An event that arrives after its window closed is late. The pipeline drops it, or sends it to a side output for a batch correction.

Allowed lateness is a dial. More catches more late events and delays every result. Less gives faster results and drops more. That is the central trade-off of streaming.

### State and checkpoints

An open window is state. So is the last-seen value per user. That state lives on the worker.

If the worker dies, the state must not vanish. The engine writes a checkpoint every few seconds: all state plus the log offsets it had read. On restart it loads the checkpoint, rewinds the log to those offsets, and replays what came after.

### Exactly-once results

Replaying from a checkpoint means some events are processed twice. The result must still be right. Two ways.

- **Idempotent sink** — write results keyed by window and key, and overwrite. Writing `(09:00, apple, 41)` twice leaves 41.
- **Transactional writes** — the engine writes results and commits its offsets in one transaction. Kafka-to-Kafka supports this. Most external databases do not.

Say "effectively once" if you want to be precise. Events may be seen twice; the results are as if they were seen once.

### Lambda versus kappa

- **Lambda** — run both. A stream path gives fast approximate results. A nightly batch path recomputes the truth and overwrites. Two code paths, two sets of bugs.
- **Kappa** — run only the stream. To recompute, replay the log through the same code. One code path, but retention must be long enough.

Kappa is the modern default.

### Backfills

A backfill recomputes old results after a bug or a new metric. In batch, rerun the days. In stream, start a second consumer group at an old offset, write to a shadow table, swap when it catches up. The live pipeline is not touched.

### Warehouse versus lake

A data warehouse stores structured tables in a columnar format built for big scans; dashboards query it. A data lake stores raw files of any shape, cheaply, on object storage; batch jobs read it. Most companies have both: raw events land in the lake, cleaned tables land in the warehouse.""",
        ),
        (
            "Design Decisions",
            """**Batch or stream?** Ask how fresh the answer must be. Daily report: batch. Minutes: micro-batch. Seconds: stream. Streaming is more work, so only pay for it when freshness is a requirement.

**Which clock?** Event time whenever the result is a fact about the world: counts, billing, fraud. Processing time only for monitoring the pipeline itself.

**Window and lateness.** Size from the question ("per minute", "per session"). Lateness from measured arrival delay, usually the 99th percentile.

**Where does correctness live?** Decide the sink strategy up front: upsert keyed by window, or a transaction.

**Partition key.** The entity whose events must stay together: user for sessions, campaign for click counts. Check for a hot key.

**Retention.** Long enough to replay after your worst outage plus the time to notice a bug.""",
        ),
        (
            "Example",
            """Ad-click counting. Advertisers pay per click, so the count must be right, and the dashboard should update within a minute.

Clicks land in a Kafka topic partitioned by `campaign_id`. A Flink job counts per campaign per one-minute tumbling window, by event time.

Allowed lateness is thirty seconds, from measured mobile delay. When the watermark passes the end of the 09:00 window, the job emits `(campaign, 09:00, count)` and upserts it into the serving store keyed by campaign and minute. A crash and replay writes the same row with the same value.

Clicks later than thirty seconds go to a side topic. A nightly batch job recounts those minutes from the raw log and overwrites the rows. The stream gives the fast number. The batch gives the billing number.

Fraud detection reads the same topic with its own consumer group, on a sliding window: clicks per IP over the last five minutes, refreshed every ten seconds. Over the threshold, it alerts within seconds.

The honest counterweight: if the dashboard only needed hourly updates, a Spark job every hour on the raw log would give the same numbers with far less to run.""",
        ),
        (
            "Trade-offs",
            """- **Freshness versus simplicity.** Stream gives seconds; batch gives hours with a fraction of the moving parts.
- **Lateness versus latency.** More allowed lateness catches more events and delays every result.
- **Event time versus processing time.** Correct buckets versus simple code with no watermark.
- **Kappa versus lambda.** One code path versus a fast approximate path plus a trusted slow one.
- **Exactly-once versus throughput.** Transactional sinks cost latency; idempotent upserts are cheaper but need a natural key.""",
        ),
        (
            "Interviewer Follow-ups",
            """- **"How does the count stay correct if a phone was offline?"** — Event time, a watermark with allowed lateness, and a side output plus batch correction for anything later.
- **"A worker dies mid-window. What happens?"** — Restore the last checkpoint, rewind to its offsets, replay. The sink is idempotent, so replayed writes are harmless.
- **"How do you fix a bug in last month's numbers?"** — Batch: rerun the days. Stream: replay from the log into a shadow table, then swap.
- **"What is your window and lateness?"** — Give both numbers and where the lateness number came from.""",
        ),
        (
            "Common Mistakes",
            """- Saying "send it to Kafka" and stopping there
- Choosing streaming for a report that is read once a day
- Counting by processing time, so a slow network moves revenue into the wrong hour
- Setting the watermark too tight (drops real events) or too loose (results arrive too late)
- Claiming exactly-once with no idempotent or transactional sink
- Writing a batch job that appends instead of overwriting, so a rerun doubles the day""",
        ),
        (
            "Mini Design Exercise",
            """A food-delivery app emits order placed, driver assigned, and order delivered, at ten thousand events per second. Requirements: a live map of late orders updated within thirty seconds; a nightly delivery-time report finance treats as truth; a new metric computed over the last ninety days.

1. Batch, stream, or both, and which path serves which requirement?
2. Which clock do you measure delivery time by, and what about a driver's phone that was offline?
3. Window type and lateness for the live map, and where those numbers come from.
4. How does the nightly report stay correct if the stream job double counts after a crash?
5. How do you compute the new metric over ninety days without touching the live pipeline?

Part 5 separates candidates: retention long enough to replay, a second consumer group or a batch job over the lake, a shadow table, and a swap.""",
        ),
        (
            "Interview Tip",
            """Answer in one sentence, then defend the parts: "Events go to a log, a stream job counts them per window by event time, a watermark with N seconds of lateness decides when a window closes, and the sink is an upsert so replay is safe." Every noun in that sentence is a follow-up you are ready for.""",
        ),
    ],
    [
        "Batch processes a pile on a schedule; stream processes each event through a log. Pick by how fresh the answer must be.",
        "Count by event time, not processing time. A watermark with allowed lateness decides when a window closes.",
        "Checkpoints plus log replay recover state; an idempotent or transactional sink turns that replay into exactly-once results.",
        "Every batch job must be safe to rerun, and every stream job must be replayable. That is how you fix last month.",
    ],
    [
        "What is the difference between event time and processing time, and which do you count by?",
        "What is a watermark, and what happens to an event that arrives after its window closed?",
        "A stream worker crashes in the middle of a window. How is the result still correct?",
        "When would you choose a nightly batch job over a streaming pipeline?",
        "Explain MapReduce in three words, and why Spark was faster.",
    ],
)
