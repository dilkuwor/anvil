"""Case study: Design a Collaborative Editor (Office / Google Docs)."""

from __future__ import annotations

from database.seeds.learn_system_design import SD


CASE = SD(
    "sd-collaborative-editor",
    "Design a Collaborative Editor (Office / Google Docs)",
    "Many people typing in one document at once: one ordering server per document, versioned operations, transforms for conflicts, and snapshots so joining is fast.",
    16,
    "**Interviewer:** \"Design a collaborative editor like Google Docs or Office online. Several people open the same document and type at the same time. Everyone sees the same text, and nobody's edit is lost.\"",
    [
        (
            "Why It Matters",
            """This problem is about one hard thing: two people change the same text at the same moment. Every other part of the design exists to make that safe.

It tests skills most designs skip: real-time push over WebSockets, a strict order for events, fixing a conflict without asking a human, and a story for a laptop that goes offline for an hour.

The hard part is not throughput. It is correctness under concurrency.""",
        ),
        (
            "Step 1: Clarify the Requirements",
            """- *"How many people edit one document at once?"* — Usually two to ten, rarely more than fifty. This number shapes everything.
- *"Do users see each other's cursors?"* — Yes. It makes the editor feel live, and it is cheap if kept separate from the text.
- *"Can someone edit while offline?"* — Yes. Edits queue on the device and merge when the network returns.
- *"History and undo?"* — Yes. Users expect old versions, and undo of their own change even after others typed.
- *"Comments, permissions, formatting?"* — Out of scope today. Formatting is the same problem with more operation types.
- *"Plain text or a tree?"* — Start with a flat sequence of characters. The flat case teaches the idea.

**Agreed scope:** open a document, type with others in real time, see cursors, keep editing offline, view history, undo. Comments and permissions set aside.

**Non-functional:** a keystroke reaches other editors in under 200 ms. No acknowledged edit is ever lost. Everyone converges to the same text, always.""",
        ),
        (
            "Step 2: Estimate the Scale",
            """- 100 million documents stored, 5 million opened on a busy day.
- At peak, 500,000 documents open at once, about two active editors each.
- A fast typist sends 5 operations per second, but most editors are idle. Call it 1 million operations per second across the service at peak.
- A document averages 50 KB of text. Its full log is far bigger: a year of edits can be tens of megabytes.

**Consequences:**

- Per document the load is tiny: a few people, a few dozen operations per second. One small server can own a document with room to spare.
- Across the service the load spreads over many servers. It is many small independent problems, not one big one.
- The log grows forever. A new joiner must not replay a year of edits. That forces **snapshots**.
- 500,000 open documents means about a million open WebSockets. Connection handling is its own layer.""",
        ),
        (
            "Step 3: API",
            """The editor holds one WebSocket per open document. Everything below is a message on that socket.

- `open(doc_id)` → the latest **snapshot**, its version number, and any operations after it.
- `send_op(doc_id, base_version, op)` → the version the server assigned.
- `receive_op(version, op, author)` — pushed to every other session on the document, in version order.
- `presence(doc_id, cursor, selection)` — sent often, never stored, fanned out to the other sessions.
- `GET /v1/docs/{id}/history?from=&to=` — a plain HTTP call that returns operations in a version range.

One detail shows care: every operation carries a client-generated `op_id`. If the socket drops right after sending, the client resends and the server ignores the duplicate.""",
        ),
        (
            "Step 4: Data Model",
            """**documents** — `doc_id`, `title`, `owner_id`, `latest_snapshot_version`, `head_version`.

**operations** — `(doc_id, version, op_id, author_id, op, created_at)`. Append only. `version` goes up by one per operation, with no gaps. This table is the truth. Partition by `doc_id` so one document's log lives together.

**snapshots** — `(doc_id, version, text_blob)`. The full text at that version, stored every few hundred operations.

**presence** — not in the database. Cursor positions live in memory on the document's server and vanish when a session ends.

The whole model fits one sentence: a document is a snapshot plus the ordered log of operations after it. To load version N, take the newest snapshot at or below N and apply the operations up to N. History and undo come from the same log.""",
        ),
        (
            "Step 5: First Architecture",
            """Editor → Gateway (sticky by doc id) → Doc server for that document → Op log, snapshots, presence

:::viz architecture {"title": "Collaborative editor: one server orders every edit to a document", "nodes": [{"id": "client", "label": "Editor A", "kind": "client", "col": 0, "row": 0}, {"id": "peers", "label": "Editors B, C", "kind": "client", "col": 0, "row": 2}, {"id": "gw", "label": "WebSocket gateway", "kind": "edge", "col": 1, "row": 1, "note": "routes by doc id"}, {"id": "doc", "label": "Doc server", "kind": "service", "col": 2, "row": 1, "note": "one owner per document, assigns versions"}, {"id": "log", "label": "Op log", "kind": "db", "col": 3, "row": 0, "note": "append only, by version"}, {"id": "snap", "label": "Snapshots", "kind": "storage", "col": 3, "row": 1, "note": "every 500 ops"}, {"id": "pres", "label": "Presence pub/sub", "kind": "cache", "col": 3, "row": 2, "note": "cursors, never saved"}], "edges": [{"from": "client", "to": "gw", "label": "WebSocket"}, {"from": "gw", "to": "doc", "label": "same doc, same server"}, {"from": "doc", "to": "log", "label": "append op"}, {"from": "doc", "to": "snap", "label": "load or save"}, {"from": "doc", "to": "pres", "label": "cursor moves"}, {"from": "gw", "to": "peers", "label": "push ops and cursors"}], "steps": [{"title": "Open the document", "explain": "Editor A connects. The gateway hashes the doc id and sends the session to the one server that owns this document. That server loads the newest snapshot, applies the few operations after it, and sends the text plus its version number.", "interview": "Say that every session for one document lands on the same server, so that server can give each edit a version number with no distributed agreement at all.", "path": ["client>gw", "gw>doc", "doc>snap"], "kind": "invariant"}, {"title": "Send one edit", "explain": "A types a character and sends the operation with the version it was based on. The server transforms it against any operations it has not seen, assigns the next version, and appends it to the log before replying.", "interview": "Say the log append happens before the acknowledgement, so a server crash after the reply cannot lose an edit the user saw as saved.", "path": ["client>gw", "gw>doc", "doc>log"], "kind": "decision"}, {"title": "Everyone else hears it", "explain": "The server pushes the operation, with its version, to every other session on the document. Cursor moves take a cheaper path through pub/sub and are never written to disk.", "interview": "Say why presence is separate: cursor updates are ten times more frequent than edits and nobody cares about a lost one, so they must not touch the op log.", "path": ["gw>doc", "doc>pres", "gw>peers"], "kind": "tradeoff", "hot": ["pres"]}, {"title": "The whole path", "explain": "Sticky routing by doc id, one server that orders edits, an append-only log for truth, snapshots so joining is fast, and pub/sub for cursors. That is the entire first design.", "interview": "Close by naming the weak point out loud: the doc server is a single point of ordering per document, and say how a replacement server rebuilds state from the log in seconds.", "path": ["client>gw", "gw>doc", "doc>log", "doc>snap", "doc>pres", "gw>peers"], "kind": "result"}]}

**Gateway:** holds the WebSockets and routes every session for a document to the same doc server by hashing the doc id. **Sticky by document**, not by user.

**Doc server:** keeps the current text and head version of each document it owns in memory. It is the only thing that assigns versions for that document. That one rule removes every distributed-ordering problem.

**Op log and snapshots:** the log is the truth. The snapshot is a shortcut so nobody replays the log from the start.

**Presence:** a small pub/sub channel per document. Cheap to send, fine to lose.""",
        ),
        (
            "How It Works",
            """### The core problem: two edits at the same place

The text is `cat`, at version 5. Alice and Bob both see version 5.

Alice inserts `s` at position 3. Her screen shows `cats`. At the same moment Bob inserts `a ` at position 0. His screen shows `a cat`.

Both operations say "based on version 5". Now suppose Bob's client receives Alice's operation as "insert `s` at 3" and applies it to `a cat`. That gives `a csat`. The two screens differ, forever.

### Operational Transformation

**Operational Transformation (OT)** adjusts an operation before applying it. The rule for two inserts is short: if the other insert landed before your position, shift your position right by its length. Otherwise do nothing.

In the example, the server takes Alice's operation first and calls it version 6. Bob's arrives next, based on version 5. Bob's insert at 0 is before Alice's position 3, so it does not move. It becomes version 7, and the server's text is `a cats`.

Bob's client receives version 6, "insert `s` at 3". His own insert added two characters before that spot, so his client shifts it to position 5. `a cat` becomes `a cats`. Both screens match.

Delete against insert and delete against delete each need their own rule. The rules are fiddly but finite.

### CRDTs

A **CRDT** (conflict-free replicated data type) gives every character a permanent unique id. Inserts and deletes refer to ids, not positions, so they mean the same thing on every device in any order. No transform and no central server are needed.

The cost is size. Each character carries an id, and deleted characters leave tombstones, so the document in memory can be many times bigger than the text.

**When to use which:** OT when you have a server anyway and want a compact document, which is our case. CRDTs when peers sync directly or offline periods are long. Google Docs uses OT; Figma and many note apps use CRDTs.

### One ordering server per document

All sessions for one document go to one server. It holds the text in memory, transforms each incoming operation against anything the sender had not seen, assigns the next version, appends to the log, and only then acknowledges. Because versions come from one place, every client sees the same order. Convergence follows from that single fact.

### Broadcast over WebSockets

The doc server pushes each new operation to every session but the sender, which gets an acknowledgement with the version instead. Messages are a few dozen bytes, so even a busy document costs little bandwidth.

### Snapshots

Every few hundred operations the doc server writes the full text as a snapshot at the current version. A new joiner loads the latest snapshot and the few operations after it, not the whole history. The history view is built the same way.

### Offline and reconnect

When the network drops, the client keeps accepting keystrokes and queues operations with the version it last saw. On reconnect it fetches everything after that version, transforms its queued operations against those, and sends them one at a time. This is a **rebase**: replay my changes on top of what happened while I was away. After a long outage the result is consistent but may not be what the user meant, so show a review step.

### Presence

Cursor positions go through a per-document pub/sub channel, a few times per second per user, and are never written to disk. A cursor that stops updating fades out. Incoming operations shift cursors the same way OT shifts an insert.""",
        ),
        (
            "Evolution Under Pressure",
            """### Round 1 — "Ten times the documents."

Nothing per document changes. Add doc servers and spread doc ids across them with consistent hashing, so adding a server moves only a slice of documents. Moving a document is cheap: the new owner loads the snapshot and recent operations.

### Round 2 — "The doc server dies mid-session."

Every acknowledged operation is already in the log, so nothing is lost. The gateway picks a new owner for those doc ids and reconnects the sessions. The new owner rebuilds the text from snapshot plus log in well under a second. Clients resend any operation with no acknowledgement, and the `op_id` stops duplicates. Say the rule: the server is a cache of the log, so it can die.

### Round 3 — "One document has 500 viewers."

Editing stays cheap because few people type. Broadcast is the cost: each operation now goes to 500 sockets, and 500 cursors are thousands of messages per second. Put relay nodes between the doc server and the viewers, so the server sends each operation once. Batch operations for viewers, and hide cursors above a threshold.

### Round 4 — "Editors in London and Sydney share a document."

The doc server lives in one place, so one side pays a 150 ms round trip per keystroke. Local echo hides most of it: the client shows its own edit at once, and only the acknowledgement is slow. Place the server near the owner. Never run two ordering servers for one document. If the product truly needs local writes everywhere, that is the CRDT case.

### Round 5 — "Undo my change, but keep what others typed after it."

Undo cannot pop the last operation, because it may be someone else's. Each client keeps an undo stack of its own operations. To undo, it builds the inverse, transforms that inverse against everything since, and sends it as a new operation. The log only grows. Undo is a new edit, not a rewind.""",
        ),
        (
            "Failure Modes",
            """- **Acknowledging before the log append**, so a crash loses an edit the user saw as saved.
- **Two servers owning one document** after a network split, giving two version 42s that can never be reconciled.
- **No `op_id`**, so a resend after a lost acknowledgement inserts the same text twice.
- **Snapshots never taken**, so opening an old document replays a year of operations.
- **Presence written to the database**, turning a cheap feature into most of the write load.
- **A viewer-heavy document on one server**, where broadcast fan-out starves the editing path.
- **Offline rebase with no review**, so a user returns to find their paragraph inside someone else's sentence.""",
        ),
        (
            "Trade-offs",
            """- **OT versus CRDT.** Compact documents and a central server, versus larger documents and no server needed.
- **One ordering server versus consensus per document.** Simple and fast, with a short pause on failover, versus no pause but a slow write path. The pause is the better deal here.
- **Snapshot often versus rarely.** Fast opens and more storage, versus cheap storage and slow opens.
- **Push every keystroke versus batch.** Lower latency for editors, versus fewer messages for large audiences. Do both, chosen per session.
- **One central region versus local editing.** Correct with one slow side, versus fast everywhere with merge surprises.""",
        ),
        (
            "Interviewer Follow-ups",
            """- **"Why not lock the paragraph someone is editing?"** — Locks feel broken to users and do nothing for offline edits. Transforms let everyone type.
- **"Where does the version number come from?"** — The one doc server that owns the document. No clocks, no consensus.
- **"Two operations arrive in the same millisecond. Then what?"** — The server handles them one at a time. Arrival order is the order.
- **"How does a new person open a document with a million edits?"** — Latest snapshot plus the operations after it, usually a few dozen.
- **"What does the client do while waiting for an acknowledgement?"** — Shows the edit at once and keeps typing.
- **"How do you know all clients have the same text?"** — Same operations, same order, same transforms. Hash the text now and then and log any mismatch.""",
        ),
        (
            "Common Mistakes",
            """- Sending whole document copies on every change instead of small operations
- Putting sessions on random servers, so nobody can assign a single version order
- Treating cursor updates like edits and storing them
- Skipping the conflict example and saying "the server merges it" with no rule
- Forgetting that undo must be a new operation transformed against later edits
- Promising real-time editing across regions with no mention of the round trip""",
        ),
        (
            "Interview Tip",
            """Draw the two-inserts example in the first five minutes. It proves you understand the real problem, and every other choice follows from it. Then give the shape in one breath: "one server per document orders every operation, the log is the truth, snapshots make opening fast, WebSockets push each operation to the others, and cursors take a cheap separate path". Spend the rest on doc server failover and offline rebase, because that is where candidates go quiet.""",
        ),
    ],
    [
        "The core problem is two edits at the same place; Operational Transformation shifts an operation by what landed before it, and one server ordering every operation makes that work.",
        "A document is a snapshot plus an append-only log of versioned operations; every session for a document goes to the one server that assigns those versions.",
        "The doc server is a cache of the log, so it can die: a new owner rebuilds the text from snapshot plus log, and client op ids stop duplicates on resend.",
        "Cursors take a cheap, unsaved pub/sub path; undo and offline edits are new operations rebased on top of what others did.",
    ],
    [
        "Two people insert text at the same moment. Walk through what the server and each client do.",
        "Why does every session for one document go to the same server, and what breaks if it does not?",
        "A new editor opens a document with a million past edits. How does it load fast?",
        "The doc server crashes while five people are typing. What happens now, and what is lost?",
        "When would you choose a CRDT over Operational Transformation?",
    ],
)
