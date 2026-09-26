"""Case study: Design a Distributed Message Queue (Kafka / Service Bus)."""

from __future__ import annotations

from database.seeds.learn_system_design import SD

CASE = SD(
    "sd-message-queue",
    "Design a Distributed Message Queue (Kafka / Service Bus)",
    "The pipe between services: producers append, consumers read at their own pace, and nothing is lost when a broker dies.",
    16,
    "**Interviewer:** \"Design a message queue like Kafka or Azure Service Bus. Services publish events to a topic. Other services read them later, in order, at their own speed. A message must not be lost once we say it is accepted.\"",
    [
        (
            "Why It Matters",
            """A message queue sits between almost every pair of services in a large system. Orders go on a queue before billing sees them. If you can explain a queue from the inside, you can explain how any two services talk without breaking each other.

It is also a clean test of three ideas interviewers love: how a write becomes durable on many machines, how order is kept without one giant lock, and what "exactly once" really costs. Most candidates hand-wave the third one.""",
        ),
        (
            "Step 1: Clarify the Requirements",
            """- *"Does order matter?"* — Only per key. All events for one order stay in order. Different orders can interleave.
- *"At-least-once or exactly-once?"* — At-least-once is the default. A consumer may see a message twice after a crash. Exactly-once costs more and only holds inside the queue.
- *"How long do we keep messages?"* — Seven days is common. Messages are not deleted when read, so a new consumer can start from the beginning.
- *"Can many services read the same topic?"* — Yes. Each service is its own **consumer group** with its own place. This is fan-out.
- *"How big is a message?"* — A few KB, with a 1 MB cap. Big payloads go to object storage with a pointer in the message.

**Agreed scope:** topics with ordered partitions; at-least-once delivery, with exactly-once as an option; seven-day retention; many consumer groups per topic; messages up to 1 MB.

**Non-functional:** no acknowledged message is ever lost, even when a broker dies; under 10 ms to acknowledge a write; consumers can fall behind for hours and catch up.""",
        ),
        (
            "Step 2: Estimate the Scale",
            """- 1 million messages per second at peak, 1 KB each: 1 GB per second in.
- Three copies: 3 GB per second to disk across the cluster.
- Seven days of retention: 1 GB × 86,400 × 7 ≈ 600 TB, or 1.8 PB with three copies.
- One broker writes about 200 MB per second to disk, so 15 brokers for throughput alone, 30 with headroom.
- One partition carries about 10 MB per second, so the busiest topic needs at least 100 partitions.

**Consequences:**

- The numbers are about disk, not CPU. Writes must be sequential, because random writes cut disk speed by ten times.
- 600 TB does not fit on one machine, so topics must be **partitioned** across brokers.
- Every message is written three times and read once per group. Network bandwidth is the second bottleneck.""",
        ),
        (
            "Step 3: API",
            """- **Produce:** `POST /v1/topics/{topic}/messages` with a batch of `key`, `value` pairs → `200` with the `partition` and `offset` of each.
- **Consume:** `GET /v1/topics/{topic}/partitions/{p}/messages?offset=1234&max=500` → a batch starting at that offset.
- **Commit:** `POST /v1/groups/{group}/offsets` with `{topic, partition, offset}` → `200`. It means "I have finished everything before this offset."
- **Create topic:** `POST /v1/topics` with `name`, `partitions` and `replication` → `201`.
- **Join a group:** `POST /v1/groups/{group}/subscribe` with a list of topics → `200` with the partitions this member now owns.

Produce takes a batch, because batching is where throughput comes from. And consume is a pull, so a slow consumer pulls slower and nothing piles up inside the broker.""",
        ),
        (
            "Step 4: Data Model",
            """A **topic** is just a name.

A topic is split into **partitions**. A partition is an ordered, append-only list of messages. Each message gets a number called its **offset**, starting at 0 and going up by one. Order is only promised inside one partition.

On disk, a partition is a folder of **segment files**. The broker appends to the newest segment and starts a new one at 1 GB. Old segments are deleted whole when they pass the retention age. Deleting a file is cheap. Deleting one message from the middle would not be.

A small **index** per segment maps offset → byte position. Binary search the index, then read forward.

A **consumer group** is a name plus a map: `(group, topic, partition) → committed offset`. That map lives in the broker, in an internal topic, so it survives consumer crashes. The consumer does not remember its place. It asks the broker.

Say the sentence: "a topic is partitions, a partition is an append-only log, an offset is a position in it, and a group's progress is a saved offset per partition."

Example: topic `orders` with 3 partitions. Key `order-77` always hashes to partition 1, so every event for that order lands in the same log in the same order.""",
        ),
        (
            "Step 5: First Architecture",
            """Producer → Leader broker → two follower replicas → Consumer group pulls by offset

:::viz architecture {"title": "Message queue: one write, three copies, one pull", "nodes": [{"id": "producer", "label": "Producer", "kind": "client", "col": 0, "row": 1}, {"id": "leader", "label": "Leader broker", "kind": "queue", "col": 1, "row": 1, "note": "partition 1 leader"}, {"id": "f1", "label": "Follower 1", "kind": "queue", "col": 2, "row": 0, "note": "in-sync replica"}, {"id": "f2", "label": "Follower 2", "kind": "queue", "col": 2, "row": 2, "note": "in-sync replica"}, {"id": "meta", "label": "Controller", "kind": "service", "col": 1, "row": 0, "note": "KRaft, who leads what"}, {"id": "consumer", "label": "Consumer group", "kind": "worker", "col": 3, "row": 1, "note": "pulls by offset"}], "edges": [{"from": "producer", "to": "leader", "label": "append batch"}, {"from": "leader", "to": "f1", "label": "replicate"}, {"from": "leader", "to": "f2", "label": "replicate"}, {"from": "meta", "to": "leader", "dashed": true}, {"from": "leader", "to": "consumer", "label": "fetch + commit"}], "steps": [{"title": "The producer picks a partition", "explain": "The producer hashes the message key to choose a partition, asks the controller once for that partition's leader, then sends a batch straight to that broker.", "interview": "Say that the key decides the partition, so events for one key stay in order, and that the producer caches the leader map so the controller is off the hot path.", "path": ["producer>leader", "meta>leader"], "kind": "invariant"}, {"title": "The leader appends and replicates", "explain": "The leader appends the batch to the partition's newest segment file. The two followers pull the new bytes and append them too. Every machine does a sequential write.", "interview": "Say why it is fast: appends only, no seeks, and the page cache absorbs the write, so one broker pushes hundreds of MB per second to a plain disk.", "path": ["leader>f1", "leader>f2"], "kind": "decision"}, {"title": "acks=all, then the producer hears back", "explain": "The leader waits until both in-sync followers confirm, then answers the producer with the offset. A leader crash now loses nothing, because two other brokers hold the bytes.", "interview": "Say the trade: acks=1 is faster but a leader crash can lose the tail, acks=all costs one extra round trip and is the only honest answer to no data loss.", "path": ["producer>leader", "leader>f1", "leader>f2"], "kind": "tradeoff", "hot": ["leader"]}, {"title": "A consumer pulls and commits", "explain": "A consumer in the group asks the leader for messages from its saved offset, processes them, then commits the new offset to the broker. A slow consumer just pulls less.", "interview": "Say that the committed offset is the only state the broker keeps per consumer, and that a crash between processing and commit is where a duplicate comes from.", "path": ["leader>consumer"], "kind": "decision"}, {"title": "The whole path", "explain": "Producer to the partition leader, leader to two followers, acknowledge when all three have it, consumer pulls by offset and commits. The controller only says who leads what.", "interview": "Close by naming what happens when the leader dies: the controller promotes an in-sync follower, producers refresh their map, and no acknowledged message is missing.", "path": ["producer>leader", "meta>leader", "leader>f1", "leader>f2", "leader>consumer"], "kind": "result"}]}

**Brokers:** each holds some partitions. For every partition, one broker is the **leader** and the others holding a copy are **followers**.

**Controller:** a few brokers that agree, using Raft, on who leads each partition. Older Kafka used ZooKeeper for this. Newer Kafka calls it KRaft. It is not on the message path. It only answers "who leads partition 7" and reacts when a broker dies.

**Producers:** hash the key, look up the leader, send batches straight to that broker. No proxy in the middle to become a bottleneck.

**Consumers:** join a group, get assigned partitions, pull from the leaders, commit offsets. One member reads each partition at a time. That is how order is kept on the read side.""",
        ),
        (
            "How It Works",
            """### The log, and why it is fast

Every write is an append to the end of a file. The disk never seeks. The operating system's **page cache** keeps the newest bytes in memory, so a consumer that is close behind reads from RAM. The queue is fast because it is boring.

### Partitions and keys give you order

A keyed message always goes to `hash(key) mod partitions`. Inside one partition, offsets only go up, so all events for one order are in order. Across partitions there is no order. Say it clearly: "per key, not global."

### Replication and in-sync replicas

Each partition has a leader and two followers. Followers pull from the leader and append. A follower that is caught up is **in-sync**. With `acks=all`, the leader answers only after every in-sync follower has the bytes. A follower that falls too far behind is dropped from the set, so one slow disk cannot stall the world. Set `min.insync.replicas = 2` so a write is refused rather than stored on one copy.

### Consumer groups and rebalancing

A group with 3 members on 6 partitions gets 2 each. When a member joins or dies, the group **rebalances** and partitions are handed out again. Reading pauses during the shuffle. Members beyond the partition count sit idle.

### Offset commits and the duplicate

The consumer reads offsets 100 to 199, does its work, then commits 200. If it crashes before the commit, the next member starts at 100 again. Those messages are processed twice. That is **at-least-once**. It is the contract, not a bug. The fix is on the consumer: make the work **idempotent**, for example by keying the database write on the message id.

### Idempotent producers and transactions

A producer that retries after a timeout can write the same message twice. An **idempotent producer** adds a producer id and a sequence number to each batch, and the broker drops a sequence it has seen.

For **exactly-once** inside the queue, the producer opens a **transaction**: it writes output messages and commits the input offset as one atomic unit. This does not reach into your database or an email service. Say that limit out loud.

### Retention and compaction

Old segments are deleted after seven days or a size limit. For a topic that is really a table, like user settings, turn on **log compaction**: a background job keeps only the newest message per key. A null value is a **tombstone** and removes the key.

### Metadata and leader election

The controller keeps the map of partitions and leaders, agreed by Raft so it survives its own crash. When a broker misses its heartbeat, the controller picks an in-sync follower for each partition it led. Clients refresh their map and carry on.

### Backpressure and lag

Consumers pull, so a slow consumer does not overload the broker. It falls behind. **Lag** is the gap between the newest offset and the committed offset, and it is the one number to watch. When a broker cannot keep up, produce calls block. That is backpressure reaching the source.""",
        ),
        (
            "Evolution Under Pressure",
            """### Round 1 — "Traffic grows ten times."

Add brokers and partitions. Old partitions can be moved by copying segments and switching the leader. One warning: adding partitions changes `hash(key) mod partitions`, so a key moves and its order is briefly split across two logs. Plan partition counts with room to grow.

### Round 2 — "A broker dies."

The controller misses its heartbeat and promotes an in-sync follower for each partition it led. Clients refresh their leader map. With `acks=all` and `min.insync.replicas = 2`, nothing acknowledged is lost. Those partitions are under-replicated until the broker returns and catches up.

### Round 3 — "One consumer is slow."

Lag climbs on its partitions only, because partitions are independent. Add members up to the partition count. If the work itself is slow, hand heavy steps to another queue. If one key is hot, split it into `order-77:0` to `order-77:3` and give up order for it.

### Round 4 — "One bad message crashes the consumer every time."

This is a **poison message**. The consumer reads it, throws, restarts, reads it again. Lag never moves. Add a retry limit: after three failures, write the message to a **dead-letter topic** with the error attached, commit the offset, and move on.

### Round 5 — "We need order across two partitions."

Push back first. Usually "events for one order" is what is needed, and a key already gives that. If two keys must be ordered together, give them the same key, such as the customer id instead of the order id. If true global order is needed, use one partition and accept its limit. Global order and horizontal scale do not go together.""",
        ),
        (
            "Failure Modes",
            """- **acks=1 with a leader crash**, so the last acknowledged messages are gone.
- **An out-of-sync follower elected leader**, so a stale copy becomes the truth.
- **Committing the offset before the work is done**, so a crash loses messages instead of duplicating them.
- **More group members than partitions**, so half the fleet sits idle.
- **No dead-letter topic**, so one bad message stops a partition for hours.
- **Lag not monitored**, so a dead consumer goes unnoticed for a day.
- **Producer retries without idempotence**, so a timeout writes the same payment event twice.""",
        ),
        (
            "Trade-offs",
            """- **acks=all versus acks=1.** One extra round trip on every write, versus a window where a leader crash loses data.
- **At-least-once versus exactly-once.** Simple and fast with idempotent consumers, versus transactions that cost throughput and only cover queue-to-queue work.
- **More partitions versus fewer.** More parallel consumers, versus more open files, slower elections, and a key shuffle when the count changes.
- **Pull versus push.** Consumers set their own pace, versus lower latency but brokers that must track every consumer.
- **Deletion versus compaction.** Cheap and time bounded, versus a forever table of latest values that costs background CPU.
- **A Kafka-style log versus a classic queue like RabbitMQ or Service Bus.** Replayable history and huge throughput, versus per-message acknowledgement and simple work-queue semantics.""",
        ),
        (
            "Interviewer Follow-ups",
            """- **"Why is it fast on cheap disks?"** — Sequential appends, and the page cache serves recent reads.
- **"How do you keep order?"** — Per key: the key picks one partition, and one consumer owns that partition at a time.
- **"What does acks=all mean?"** — The leader waits for every in-sync follower. With min in-sync of 2, a leader crash loses nothing.
- **"Where does a duplicate come from?"** — A crash after doing the work and before committing the offset. Make the work idempotent.
- **"How does exactly-once work?"** — Idempotent producer plus a transaction that writes outputs and commits the input offset together. Only inside the queue.
- **"What happens when a broker dies?"** — The controller promotes in-sync followers and clients refresh their map.""",
        ),
        (
            "Common Mistakes",
            """- Promising global order across the whole topic
- Saying "exactly-once" without saying it stops at the queue's edge
- Treating the consumer's memory, not the broker's committed offset, as the source of truth
- Putting a proxy between producers and brokers that becomes the bottleneck
- Ignoring the poison message case
- Treating the controller as if it were on the path of every message
- Choosing partition counts with no room to grow""",
        ),
        (
            "Interview Tip",
            """Give the whole design in one breath early: "topics split into partitions, each partition an append-only log with three replicas and one leader, producers hash a key to a partition, consumer groups pull by offset and commit, a Raft controller decides who leads". Then spend the time on what acks=all really guarantees and where the at-least-once duplicate comes from. Those two answers separate people who have run a queue from people who have read about one.""",
        ),
    ],
    [
        "A partition is an append-only log of segment files; sequential appends and the page cache make it fast on plain disks.",
        "Order is per key: the key picks the partition, and one consumer in a group owns that partition at a time.",
        "acks=all with min in-sync replicas of 2 means a leader crash loses nothing; acks=1 is faster and can lose the tail.",
        "At-least-once is the default contract; duplicates come from crashing before the offset commit, so consumers must be idempotent.",
    ],
    [
        "Walk through a write from the producer to the acknowledgement with acks=all.",
        "Why does a queue keep order only inside one partition, and how would you keep two keys in order together?",
        "A consumer crashes after doing its work but before committing. What happens next, and how do you make that safe?",
        "A broker dies. Who notices, what changes, and what could be lost under each acks setting?",
        "One message crashes the consumer on every retry. What do you do so the partition keeps moving?",
    ],
)
