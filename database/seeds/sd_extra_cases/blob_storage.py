"""Interview Case Study — Design Blob Storage (Azure Blob / S3)."""

from __future__ import annotations

from database.seeds.learn_system_design import SD

CASE = SD(
    "sd-blob-storage",
    "Design Blob Storage (Azure Blob / S3)",
    "The store under every other store: put a file of any size in a bucket, get it back by key, and never lose it, even after years and many dead disks.",
    16,
    "**Interviewer:** \"Design an object store like Amazon S3 or Azure Blob Storage. Users upload files of any size into buckets, read them back by key, and expect them to never be lost. It must hold petabytes and keep growing.\"",
    [
        (
            "Why It Matters",
            """Blob storage sits under almost everything: photos, videos, backups, logs and data lakes. The Dropbox, YouTube and Instagram lessons all end with "put the file in object storage". This lesson opens that box.

It teaches one of the most useful splits in system design: keep the small, hot **metadata** away from the big, cold **bytes**. It also shows where eleven nines of durability really come from.""",
        ),
        (
            "Step 1: Clarify the Requirements",
            """- *"How big are the objects?"* — From a few bytes to many terabytes. Big objects must be uploaded in parts.
- *"How durable?"* — Eleven nines: 99.999999999 percent per year, or about one object lost in ten billion. Copies on one machine, or one rack, are nowhere near enough.
- *"Strong or eventual consistency?"* — Read-after-write on one key must be strong. A client that just uploaded a file must see it. Listing can lag at first; we revisit that under pressure.
- *"Versioning?"* — Yes, per bucket. A `PUT` on an existing key makes a new version instead of overwriting.
- *"Access control?"* — Buckets are private by default. Policies per bucket and key, plus short-lived signed links for sharing.
- *"Listing?"* — List keys by prefix, sorted, in pages. No search inside file contents.

**Agreed scope:** put, get and delete on objects of any size; multipart upload; versioning; prefix listing; presigned URLs; eleven nines of durability.

**Non-functional:** first byte of a read within about 50 milliseconds, no acknowledged object ever lost, and adding capacity never pauses the service.""",
        ),
        (
            "Step 2: Estimate the Scale",
            """- 100 PB stored, growing by 10 PB a year.
- 100 billion objects, average 1 MB, with a long tail of multi-gigabyte video and backups.
- 100 million new objects a day: about 1,200 per second, 3,000 at peak.
- Reads are ten times writes: 30,000 `GET` per second at peak.
- About 1 percent of objects are over 100 MB, but they hold half of all the bytes.

**Consequences:**

- Metadata is about 200 bytes per object, so 100 billion objects is roughly 20 TB. Tiny next to 100 PB, but too big for one machine, so metadata must be **sharded**.
- Three full copies of 100 PB is 300 PB of disk. **Erasure coding** brings that to about 150 PB. That saving is worth millions.
- 30,000 reads per second at 1 MB each is 30 GB per second leaving the system. Bytes must stream straight between front servers and data nodes, never through the metadata store.""",
        ),
        (
            "Step 3: API",
            """- `PUT /{bucket}/{key}` with the body → `200` with an `ETag` and a version id.
- `GET /{bucket}/{key}` → `200` with the bytes. Accepts a `Range` header and an optional `versionId`.
- `DELETE /{bucket}/{key}` → `204`. With versioning on, this adds a delete marker rather than removing data.
- `POST /{bucket}/{key}?uploads` → an `uploadId`. This begins a multipart upload.
- `PUT /{bucket}/{key}?uploadId=…&partNumber=n` with one part → `200` with that part's `ETag`.
- `POST /{bucket}/{key}?uploadId=…` with the list of parts → `200`. The object appears all at once.
- `GET /{bucket}?prefix=photos/2024/&max-keys=1000&continuation-token=…` → one sorted page of keys.
- A **presigned URL** is any of the above with an expiry and a signature added, so a browser can upload or download without our credentials.

One small detail shows care: a checksum header on `PUT`, so a corrupted upload is rejected instead of stored.""",
        ),
        (
            "Step 4: Data Model",
            """**Metadata: small, hot, point lookups.** A `buckets` table holds `bucket_id`, owner, region, the versioning flag and the policy. An `objects` table is keyed by `(bucket_id, key, version_id)` and holds size, `ETag`, storage class, and the **chunk list**: each chunk's id, length and where its copies live. Keys are stored sorted within a bucket, so a prefix listing is a plain range scan.

**Data: huge, cold, sequential.** An object is cut into chunks of a fixed size, say 64 MB. Each chunk has an id and a checksum. Data nodes store chunks inside big append-only files, so disks write sequentially.

The rule that makes the design work: the metadata store never holds bytes, and the data nodes never know a key or a bucket. Say the sentence: "metadata maps a key to a list of chunks; data nodes store chunks; the two never mix". That is the shape of every object store.""",
        ),
        (
            "Step 5: First Architecture",
            """Client → Front door → Data service → three data nodes in three zones, then Front door → Metadata service → Metadata DB

:::viz architecture {"title": "Blob storage: bytes first, metadata last", "nodes": [{"id": "client", "label": "Client", "kind": "client", "col": 0, "row": 1}, {"id": "front", "label": "Front door", "kind": "edge", "col": 1, "row": 1, "note": "auth, policy, presigned"}, {"id": "meta", "label": "Metadata service", "kind": "service", "col": 2, "row": 0, "note": "key to chunk list"}, {"id": "metadb", "label": "Metadata DB", "kind": "db", "col": 3, "row": 0, "note": "sharded by bucket + key"}, {"id": "data", "label": "Data service", "kind": "service", "col": 2, "row": 2, "note": "chunk, checksum, place"}, {"id": "n1", "label": "Data node, zone A", "kind": "storage", "col": 3, "row": 1}, {"id": "n2", "label": "Data node, zone B", "kind": "storage", "col": 3, "row": 2}, {"id": "n3", "label": "Data node, zone C", "kind": "storage", "col": 4, "row": 2}], "edges": [{"from": "client", "to": "front", "label": "PUT or GET"}, {"from": "front", "to": "data", "label": "bytes"}, {"from": "data", "to": "n1"}, {"from": "data", "to": "n2"}, {"from": "data", "to": "n3"}, {"from": "front", "to": "meta", "label": "lookup or commit"}, {"from": "meta", "to": "metadb"}], "steps": [{"title": "A PUT reaches the front door", "explain": "The client sends the object. The front door checks the signature and the bucket policy. It is stateless, so any front door can take any request.", "interview": "Say that the front door only checks and routes; it never keeps the object in memory, because a 5 TB upload would sink it. Bytes stream through.", "path": ["client>front"], "kind": "invariant"}, {"title": "Bytes go to three zones", "explain": "The data service cuts the stream into 64 MB chunks, checksums each one, and writes each chunk to three data nodes in three different zones. It waits for all three to confirm.", "interview": "Say why three zones and not three disks: a rack switch or a whole building can fail, and a copy behind the same failure is not a copy at all.", "path": ["front>data", "data>n1", "data>n2", "data>n3"], "kind": "decision"}, {"title": "Metadata commits last", "explain": "Only after every chunk is safe does the front door write the object record, the key and its chunk list, to the metadata DB. Then it answers 200 with the ETag.", "interview": "Say the order out loud: bytes first, metadata last. A crash in between leaves an orphan chunk that GC cleans, never a key that points at nothing.", "path": ["front>meta", "meta>metadb"], "kind": "tradeoff", "hot": ["metadb"]}, {"title": "The whole path", "explain": "Client, stateless front door, data service fanning bytes to three zones, then one small metadata write. The big bytes and the small records never share a machine.", "interview": "Close by naming what scales each half: more data nodes for bytes, more metadata shards for keys, and more front doors for requests, all independently.", "path": ["client>front", "front>data", "data>n1", "data>n2", "data>n3", "front>meta", "meta>metadb"], "kind": "result"}]}

**Front door:** stateless servers behind a load balancer. They check signatures, apply policies, mint presigned URLs, and stream bytes. They keep nothing.

**Data service:** cuts the stream into chunks, checksums each, asks a small **placement** service for three healthy nodes in three zones, and waits for all to confirm.

**Metadata last:** the object record is written in one transaction after the bytes are safe. Written first, a crash would leave a key pointing at bytes that never arrived. Bytes first, the worst case is a stray chunk that a cleanup job removes.""",
        ),
        (
            "How It Works",
            """### The upload path

1. The front door verifies the request and streams the body to the data service.
2. The data service cuts the stream into 64 MB chunks, checksums each, and writes it to three data nodes in three zones. Each node appends, syncs to disk, and replies.
3. When every chunk is confirmed, the front door writes the object record with a new version id into the metadata DB.
4. It answers `200` with the `ETag`. The object is now visible to every reader.

### Three copies or erasure coding

**Three copies** is simple: write three, read any one, pay three times the disk. **Erasure coding** cuts a chunk into 6 data pieces plus 3 parity pieces on 9 nodes. Any 6 rebuild the chunk. It survives 3 losses at 1.5 times the disk.

The cost is on reads and repairs: a missing piece needs 6 reads plus arithmetic. Most real systems do both: three copies while data is new and hot, then a background job erasure-codes it once it is old and cold.

### Placement and checksums

Copies or pieces go to different racks and different zones, never the same one. Say "rack-aware and zone-aware placement" and you have said the important part.

At petabyte scale, disks silently flip bits. Every chunk carries a checksum, checked on write, on every read, and by a background **scrubber** that reads every chunk every few weeks. A bad copy is rebuilt from the good ones. Eleven nines comes from this loop, not just from the copies.

### The download path

`GET` looks up `(bucket, key)` in the metadata DB, gets the chunk list, then reads each chunk from the nearest healthy copy and streams it. A `Range` request maps to just the chunks it covers.

### Metadata sharded by bucket and key

The metadata DB is partitioned by bucket, then by key range inside a bucket, so a giant bucket spreads across many shards while keys stay sorted. Each shard is a small Raft group, so a write is durable on a majority before it is acknowledged. That is what makes read-after-write strong on one key.

### Deletes and garbage collection

A `DELETE` writes a delete marker or removes the record. It does not free bytes. A **garbage collector** finds chunk ids that no object version references and tells data nodes to drop them, including orphans from failed uploads. It waits a few hours first, so an in-flight read or a mistaken delete cannot hit freed space.

### Multipart upload state

Begin writes a row in an `uploads` table. Each part is uploaded like a small object, with a part record holding its number, `ETag` and chunk list. Parts go in parallel and retry alone. Complete is one metadata transaction: join the chunk lists in part order, write the object record, delete the upload row. An upload never completed expires after a week and GC frees the parts.

### Hot objects and the CDN

One viral file read a million times an hour hammers the three nodes that hold it. Detect it with a read counter, then cache it in the front doors, add extra copies for a while, and for public files put a CDN in front.""",
        ),
        (
            "Evolution Under Pressure",
            """### Round 1 — "Now it is ten times bigger."

Front doors are stateless, so add more. New data nodes are added and placement prefers them until they catch up. Metadata shards split as they grow. The real risk is a **hot shard**: a bucket where every key starts with today's date lands on one shard. Spread keys with a hash prefix, or split shards by write rate as well as size.

### Round 2 — "A whole data centre is lost."

Copies live in three zones, so every object still has two. Erasure-coded chunks have at most three pieces per zone, so six survive. Metadata shards keep a majority outside any one zone, so leaders re-elect and writes continue. For a whole **region**, replicate buckets asynchronously and say plainly that a few minutes of uploads could be lost.

### Round 3 — "One object is suddenly read a million times an hour."

Three copies cannot serve that. Read counters flag it. Add extra copies for a while, cache it at the front door, and push public files to a CDN. Name the cost: the cache breaks first if the hot set changes quickly.

### Round 4 — "Storage cost is too high. Move old data to a cold tier."

Add **lifecycle rules** per bucket: after 30 days move to cool storage, after a year to archive. A background job copies old chunks to dense cold nodes with a heavier erasure code, such as 12 data plus 4 parity, updates the storage class, and lets GC free the hot copies. Say the trade: archive reads take hours, so the API must answer "restore first".

### Round 5 — "A client uploads a file, lists the bucket, and it is not there."

Listing was served from an index built a few seconds behind the writes. To make it strong, read the listing from the sorted key range in the shard that took the write. That loads the leader, so let followers serve listings once they have caught up to the write's commit position. S3 did exactly this in 2020.""",
        ),
        (
            "Failure Modes",
            """- **Metadata written before the bytes**, so a crash leaves a key that points at nothing.
- **All three copies in one rack**, so one switch failure loses the object.
- **No checksums**, so a flipped bit is served to a client as if it were correct.
- **Garbage collection too eager**, freeing a chunk that an in-flight read still needs, or never running, so orphan chunks fill the disks.
- **Repair storm after a node dies**, when rebuilding all its chunks at once saturates the network.""",
        ),
        (
            "Trade-offs",
            """- **Three copies versus erasure coding.** Simple and fast to read, versus half the disk cost but slower repairs and heavier reads of small objects.
- **Big chunks versus small chunks.** Fewer metadata entries and sequential disks, versus finer parallelism and cheaper repair of one chunk.
- **Strong listing versus eventual listing.** Every list sees every write, versus far cheaper listing from a separate index.
- **Synchronous versus asynchronous cross-region replication.** No loss when a region dies, versus fast uploads with a minutes-long loss window.""",
        ),
        (
            "Interviewer Follow-ups",
            """- **"Why separate metadata from data?"** — They scale differently. Metadata is small and needs fast point lookups; bytes are huge and need sequential streaming.
- **"Where do eleven nines come from?"** — Copies in separate zones, checksums on every read, a scrubber that rebuilds silent corruption, and repair that finishes long before a second failure is likely.
- **"The client dies halfway through a 5 TB upload."** — The finished parts stay for a week. The client uploads the missing parts, then calls complete. If it never returns, GC frees the parts.
- **"How do you list a bucket with a billion keys?"** — Keys are sorted within the bucket's shards, so a prefix list is a range scan that returns one page and a continuation token.
- **"A disk fails. What happens?"** — Its chunks are marked under-replicated and copied from surviving replicas to new nodes, throttled so repair does not starve reads.""",
        ),
        (
            "Common Mistakes",
            """- Storing object bytes in a relational database or a key-value store
- Sending bytes through the metadata service, which turns it into the bottleneck
- Forgetting checksums and the scrubber, then claiming eleven nines
- Multipart complete that is not one atomic metadata write
- Treating delete as freeing bytes right away
- No answer at all for how a very large object is uploaded or resumed""",
        ),
        (
            "Interview Tip",
            """Give the whole design in one breath early: "stateless front doors, chunks written to three zones with checksums, then one small metadata record written last, metadata sharded by bucket and key, erasure coding and a scrubber for durability, GC for deletes". Then spend the time on the upload path and on why metadata and bytes live apart, because that split is the idea the interviewer is checking for.""",
        ),
    ],
    [
        "Keep small hot metadata and big cold bytes in different systems; metadata maps a key to a chunk list, data nodes only store chunks.",
        "Write bytes first and metadata last, so a crash leaves an orphan chunk for GC, never a key that points at nothing.",
        "Durability comes from copies in separate zones plus checksums, a scrubber and fast repair; erasure coding halves the disk cost.",
        "Multipart upload is parts written like small objects and one atomic complete; deletes only mark, and a delayed GC frees the bytes.",
    ],
    [
        "Walk through what happens from the moment a PUT arrives until the client gets a 200.",
        "Why must the metadata record be written after the bytes, and what does GC clean up because of that?",
        "How does an object store reach eleven nines of durability? Name at least three mechanisms.",
        "A client uploads a 5 TB file over a bad connection. How do the API and the metadata make that work?",
        "A whole zone goes dark. What still works, what does not, and why?",
    ],
)
