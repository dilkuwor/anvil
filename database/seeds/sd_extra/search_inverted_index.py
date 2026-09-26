"""Search and Inverted Indexes: why LIKE does not scale, and what a search engine does instead."""

from __future__ import annotations

from database.seeds.learn_system_design import SD

TOPIC = "search-systems"

LESSON = SD(
    "sd-search-inverted-index",
    "Search and Inverted Indexes",
    "How full-text search works: tokens, posting lists, ranking, sharding, and keeping the index in sync.",
    14,
    "Every product with a search box hits the same wall. A database `LIKE '%word%'` query reads every row, and it gets slower as the data grows. A search engine fixes this by turning the data inside out: instead of \"document → words\", it stores \"word → documents\". That structure is called an inverted index. Once you can draw it, you can explain Bing, product search and log search with the same picture.",
    [
        (
            "Why It Matters",
            """Search shows up in almost every system design prompt. A shop: users search products. A mail client: users search messages. A logging platform: engineers search logs.

The weak answer is "we use Elasticsearch". The strong answer is "we build an inverted index, here is how a query runs, here is how it is sharded, and here is how it stays in sync with the database". This lesson gives you that answer.

> Memory cue: the database index is sorted by row. The search index is sorted by word.""",
        ),
        (
            "Mental Model",
            """Think of the index at the back of a textbook. You do not read the whole book to find "caching". You look up the word and get page numbers.

An inverted index is that, built by a program:

- Each document gets a number, its doc id.
- Each word (a term) points to a sorted list of doc ids that contain it. That list is a posting list.
- A query looks up one posting list per word and combines them.

The cost of a query is the size of the posting lists it touches, not the size of the corpus. That is the whole reason search scales.""",
        ),
        (
            "How It Works",
            """### Why LIKE does not scale

A B-tree index is sorted by the whole value. `WHERE title LIKE 'cat%'` can use it, because "cat" is a prefix. `WHERE body LIKE '%cat%'` cannot, because the match can start anywhere. The database reads every row.

With 10,000 rows this is fine. With 100 million it takes minutes. Adding servers does not help. The structure is wrong.

### Tokenising and normalising

Before anything is indexed, text is broken into terms. This step is called analysis.

- **Tokenise.** Split on spaces and punctuation. "The cat runs!" becomes the, cat, runs.
- **Lowercase.** "Cat" and "cat" should match.
- **Stop words.** Drop very common words like the, a, of. They match every document and mean little.
- **Stemming.** Cut words to a root so "runs" and "running" both become "run". Porter and Snowball are the common stemmers.

The rule that matters: the same analyser must run at index time and at query time. If documents are stemmed and queries are not, "running" never finds "run".

### The inverted index

The index has two parts.

- **The dictionary.** Every term, sorted, with a pointer to its posting list. Usually in memory.
- **The posting lists.** For each term, a sorted list of doc ids. Each entry can also carry the term frequency (how many times the word appears) and positions (where).

Example: park → [1, 3], run → [1, 2], beach → [2, 3].

Step through the picture below. It tokenises three documents, builds the posting lists, then answers a two-word query.

:::viz inverted-index {"docs": ["The cat runs in the park", "Dogs love running on the beach", "A quiet park by the beach"], "query": "running park"}

### Building the index

**Batch.** Read all documents, analyse them, write the index in one job. Right for a fixed corpus, like a nightly catalogue rebuild.

**Incremental.** New documents arrive all the time. Appending to a posting list in place is slow, so engines buffer new documents in memory and flush them as a small immutable file called a segment. A query searches every segment and merges the answers. In the background, small segments merge into bigger ones. A delete is a marker until a merge removes the document for real. This is the same idea as an LSM tree.

### Querying

**AND.** Fetch one posting list per term and intersect them. Both lists are sorted, so walk them with two pointers. Skip lists let you jump ahead in the longer list.

**OR.** Merge the lists instead. The result is larger, so it needs ranking to be useful.

**Phrase.** "new york" needs positions. Find documents in both lists, then check that a position of "york" is one more than a position of "new".

**Prefix.** "cach*" matches cache, caching, cached. The dictionary is sorted, so take the range of terms with that prefix and OR their lists. Autocomplete works this way.

### Ranking basics

Matching gives candidates. Ranking orders them. Two ideas do most of the work.

- **Term frequency (TF).** A document that says "battery" ten times is more about batteries than one that says it once.
- **Inverse document frequency (IDF).** A term in almost every document tells you little. A rare term tells you a lot, so it gets more weight.

TF-IDF multiplies the two. BM25 is the modern refinement: it stops rewarding TF after a point (the tenth mention is worth less than the second), and it corrects for document length, so long documents are not favoured for having more words.

**Boosting** adds product rules on top. A match in the title counts more than one in the body. In-stock items rank above out-of-stock. Often a second stage reorders the top few hundred with signals like clicks or price.

### Sharding and replication

One machine cannot hold a billion documents. Shard the index by document: hash the doc id to pick a shard. Every shard holds a full index for its own documents.

A query goes to every shard. This is scatter-gather. Each shard returns its top k with scores, and a coordinator merges those lists and keeps the overall top k. With k of 10 and 20 shards, the coordinator merges 200 results. Cheap.

Deep pagination is the trap. Page 100 means each shard returns 1,000 results and the coordinator merges 20,000. Cap the depth, or use a cursor (search-after).

Replication is for reads and safety. Each shard has copies on other machines. Any copy can answer a query, so read capacity grows with replicas, and a lost machine does not lose a shard.

### Staying in sync with the source of truth

The database is the source of truth. The search index is a derived copy. It always lags a little.

Two ways to feed it:

- **Change data capture (CDC).** Tail the database write log and turn each change into an index update. Debezium into Kafka into an indexer is the common shape.
- **A queue from the service.** After the service writes a row, it publishes an event. An indexer consumes it. The outbox pattern makes this reliable.

Either way the index is eventually consistent. A product edited a second ago may not show in search yet. Say this out loud, and say the fix: after a write, show the user's own change from the database, not from search.

### Elasticsearch and Lucene vocabulary

Lucene is the library that builds and searches inverted indexes. Elasticsearch, OpenSearch and Solr wrap it with sharding, replication and an HTTP API.

- **Index.** A named collection of documents, like a table.
- **Mapping.** The schema: which fields are text (analysed) and which are keyword (exact match).
- **Shard and replica.** A Lucene index and its copies.
- **Segment.** One immutable file inside a shard.
- **Refresh.** Makes recent writes visible, by default once a second. This is the lag to mention.

### Search engine or database

Use the database for an exact match or a prefix on one field. `WHERE email = ?` does not need a search engine.

Use a search engine when users type free text, expect typo tolerance and ranking, or filter on any mix of fields.

Postgres has built-in full-text search (`tsvector` with a GIN index). It is a real inverted index and a good first step. Move to a dedicated engine for better ranking, more scale, or to keep search traffic off the transactional database.""",
        ),
        (
            "Design Decisions",
            """**What goes in the index?** Only the fields users search, filter or display. Keep the full record in the database and fetch it by id.

**Positions or not?** Positions make phrase queries possible and the index bigger. Log search needs them. A product title search often does not.

**Shard count?** Fix it up front with room to grow, because resharding means reindexing everything.

**Time-based data?** For logs, make one index per day. A time-range query touches a few indexes, and old data is dropped by deleting whole indexes.""",
        ),
        (
            "Example",
            """Product search for a shop with 50 million products and 5,000 searches per second.

Data flow: the product service writes to Postgres. An outbox row goes to Kafka. An indexer consumes it and upserts a document into Elasticsearch with title, description, brand, category, price and a stock flag.

Mapping: title and description are text fields with an English analyser. Brand and category are keyword fields. Price is a number for range filters.

Query: the user types "wireless headphones". The analyser produces "wireless" and "headphone". The engine intersects the two posting lists, scores by BM25 with a title boost, filters out-of-stock items, and returns the top 20.

Scale: 20 shards of about 2.5 million products, two replicas each. Each shard returns its top 20 and the coordinator merges 400 results. Replicas triple read capacity.

Freshness: refresh every second. A price edit shows in search within a couple of seconds. The product page reads from Postgres, so the seller always sees their own edit right away.

The follow-up: "a category page filters by brand and sorts by price, with no text. Search engine or database?" Fixed filters: a composite index in Postgres. Any mix of attributes: the search engine, because every field has its own inverted index.""",
        ),
        (
            "Trade-offs",
            """- **Positions versus size.** Positions enable phrase queries and roughly double the index.
- **Stemming versus precision.** Stemming finds more matches and sometimes wrong ones.
- **Stop words versus phrases.** Dropping "the" saves space but breaks a search for "The Who".
- **Refresh interval versus cost.** Faster refresh means more small segments to merge.
- **Search engine versus database.** Better search, one more system to run and keep in sync.""",
        ),
        (
            "Common Failure Modes",
            """- **Different analysers at index and query time.** Nothing matches, and nobody knows why.
- **The index drifts from the database** because the indexer dropped events. Fix with a periodic full reindex.
- **Deep pagination** that makes every shard return thousands of results.
- **A shard count with no room to grow**, forcing a full reindex under pressure.
- **Unbounded wildcard queries** like "a*" that expand to millions of terms.""",
        ),
        (
            "Interviewer Follow-ups",
            """- **"Why not just use LIKE?"** — A B-tree cannot serve a match in the middle of a string, so the database scans every row.
- **"How does a two-word query run?"** — One posting list per term, intersect with two pointers, then score with BM25.
- **"How does the index stay up to date?"** — CDC or an outbox event into a queue; an indexer consumes it. About a second of lag.
- **"How do you scale to a billion documents?"** — Shard by document, scatter the query, merge the top k. Replicate shards for reads.
- **"What is BM25 in one sentence?"** — Rare terms count more, repeats count more with diminishing returns, long documents are penalised.""",
        ),
        (
            "Common Mistakes",
            """- Saying "use Elasticsearch" without explaining what it does inside
- Forgetting that the analyser must match at index time and query time
- Treating the search index as the source of truth
- Promising that a write is visible in search immediately
- Letting users paginate to page 1,000 through a sharded index""",
        ),
        (
            "Mini Design Exercise",
            """Design search for a mail client like Outlook. Each user has up to 100,000 messages. Searches are always scoped to one user.

1. What do you shard by, and why is it different from product search?
2. Which fields are text and which are keyword?
3. How does a new message become searchable, and how long does it take?
4. A user searches for "invoice from Dana last week". Which parts are full-text and which are filters?

Hint for the first one: keep all of a user's messages in one shard, so a query touches one shard, not all of them.""",
        ),
        (
            "Interview Tip",
            """Draw the index once, small: three documents on the left, three posting lists on the right, and an arrow from the query to the two lists it touches. Then say "a query costs the size of the lists it touches, not the size of the corpus". That one sentence shows you understand why search scales, and it takes ten seconds.""",
        ),
    ],
    [
        "An inverted index maps each term to a sorted list of the documents that contain it; a query touches those lists, not the corpus.",
        "The same analyser (lowercase, stop words, stemming) must run on documents and on queries, or nothing matches.",
        "AND is an intersection of posting lists, OR is a merge, phrases need positions, and BM25 orders the candidates.",
        "The search index is a derived copy fed by CDC or a queue; it is eventually consistent, and it is sharded by document with scatter-gather for queries.",
    ],
    [
        "Why can a database LIKE query not use a B-tree index, and what does the inverted index do differently?",
        "Walk through how a two-word AND query runs against an inverted index.",
        "What is BM25 doing, in plain words, and where does boosting fit?",
        "How is a search index sharded, and how does the coordinator return the top ten across shards?",
        "How does the search index stay in sync with the database, and what does the user notice?",
    ],
)
LESSON["display_order"] = 1
