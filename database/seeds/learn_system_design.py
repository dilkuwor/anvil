"""Interview-focused System Design curriculum.

Split out of ``learn.py`` because the System Design track is a full preparation
course rather than a glossary: every lesson teaches reasoning, trade-offs,
failure modes, and the follow-up questions an interviewer actually asks.

Rendering constraints (see ``frontend/src/components/learn/markdown.tsx``):

* ``#``/``##``/``###`` headings, tables, blockquotes, ordered lists, flat
  unordered lists, ``a → b → c`` flows, ``x = y`` formula lines and
  ``Example: ...`` lines all get first-class rendering.
* Fenced code blocks and nested list items are NOT supported. Use inline
  ``code`` spans and flat lists instead.
* ``## Why It Matters`` / ``## How It Works`` / ``## Example`` /
  ``## Trade-offs`` / ``## Common Mistakes`` / ``## Interview Tip`` are parsed
  by ``app.learn.service._parse_lesson_sections`` to build AI-tutor context, so
  keep those headings on every lesson.
* Heading text must be unique inside a lesson: the in-page table of contents
  keys anchors off the heading slug.
"""

from __future__ import annotations

Section = tuple[str, str]


def SD(
    slug: str,
    title: str,
    short: str,
    minutes: int,
    lead: str,
    sections: list[Section],
    takeaways: list[str],
    questions: list[str],
    problems: list[str] | None = None,
) -> dict:
    """Build a lesson dict from a lead paragraph plus ``## heading`` sections."""
    parts: list[str] = [f"# {title}", "", lead.strip(), ""]
    seen: set[str] = set()
    for heading, body in sections:
        key = heading.strip().lower()
        if key in seen:
            raise ValueError(f"duplicate heading {heading!r} in lesson {slug!r}")
        seen.add(key)
        parts.append(f"## {heading}")
        parts.append("")
        parts.append(body.strip())
        parts.append("")
    return {
        "slug": slug,
        "title": title,
        "short": short,
        "minutes": minutes,
        "content": "\n".join(parts).strip() + "\n",
        "takeaways": takeaways,
        "questions": questions,
        "problems": problems or [],
    }


def _sd_topic(
    slug: str,
    title: str,
    description: str,
    difficulty: str,
    order: int,
    lessons: list[dict],
) -> dict:
    from database.seeds.learn import _topic

    return _topic(
        "system-design",
        slug,
        title,
        description,
        difficulty,
        sum(lesson["minutes"] for lesson in lessons),
        order,
        lessons,
    )


# ---------------------------------------------------------------------------
# Module 1 — The interview method
# ---------------------------------------------------------------------------


def _playbook_topic() -> dict:
    return _sd_topic(
        "system-design-template",
        "The Interview Playbook",
        "ASK → SIZE → SHAPE → STRESS → SELL, the thirteen steps under it, and what the interviewer is scoring at each one.",
        "EASY",
        1,
        [
            SD(
                "system-design-template",
                "System Design Template",
                "A repeatable framework you can run on any prompt, and the reason each step exists.",
                18,
                "A system design interview is not a memory test. It is a forty-five minute simulation of you leading a design review: can you find the real requirements, size the problem, propose something that works, spot where it breaks, and defend the choice when someone pushes back? The template below is the order that makes all of that legible to an interviewer.",
                [
                    (
                        "Why It Matters",
                        """Candidates lose these interviews for structural reasons far more often than technical ones. The four common failure shapes:

- **Silent designing.** Ten minutes of drawing with no narration. The interviewer cannot score thinking they cannot hear.
- **Jumping to components.** "We'll use Kafka, Cassandra and Redis" before anyone has said how many requests per second the system takes. Every one of those choices is now unjustified.
- **Breadth with no depth.** Fifteen boxes, none explained. Senior interviews are scored on depth in one or two places.
- **Running out of time.** Forty minutes on requirements, five minutes of hand-waving at scale.

A framework fixes all four. It gives you a clock, it forces narration, and it puts justification before selection.

> Memory cue: the template is not there to make you look organised. It is there so that every box you draw has a number or a requirement behind it.""",
                    ),
                    (
                        "Mental Model",
                        """Five words, in order.

ASK → SIZE → SHAPE → STRESS → SELL

| Step | What you do | Minutes | What the interviewer is scoring |
| --- | --- | --- | --- |
| **ASK** | Requirements, scope, what you are *not* building | 5–8 | Do you design for the real problem, or the first one you imagined? |
| **SIZE** | QPS, storage, bandwidth, read:write ratio | 3–5 | Can you turn a product into numbers that justify architecture? |
| **SHAPE** | APIs, data model, high-level architecture | 10–12 | Can you produce a working system, end to end, at all? |
| **STRESS** | Deep dive, bottlenecks, failure modes | 12–15 | Do you know where real systems break? This is the senior signal. |
| **SELL** | Trade-offs and a 30-second summary | 3–5 | Can you defend a decision instead of reciting one? |

The proportions matter as much as the order. If you are twenty-five minutes in and have not drawn a box, you have already lost. If you drew every box in minute twelve and have nothing to say for the remaining half hour, you have also lost.""",
                    ),
                    (
                        "How It Works",
                        """The five words expand into thirteen steps. Each step exists because an interviewer is checking something specific.

1. **Clarify the prompt** — Turn "design Twitter" into a scoped product. Ask who the users are, what the two or three core flows are, and what is explicitly out of scope.
2. **Functional requirements** — The verbs. "A user can post. A user can follow. A user can read a home timeline." Three to five is right; ten means you have not prioritised.
3. **Non-functional requirements** — The adjectives, with numbers. Availability target, latency target for the hot path, consistency expectation, durability expectation, scale horizon.
4. **Estimate scale** — DAU, actions per user, QPS average and peak, storage per year, bandwidth. Order of magnitude only.
5. **Define the APIs** — The system boundary. Two or three endpoints with real request and response shapes, not a list of nouns.
6. **Design the data model** — Entities, primary keys, the one or two access patterns each table must serve, and the indexes that follow.
7. **High-level architecture** — The simplest thing that satisfies the requirements. Client, load balancer, service, database. Draw it, then walk one write and one read through it out loud.
8. **Deep dive** — Pick the one or two components where this problem is actually hard, and go three levels down.
9. **Identify bottlenecks** — Say out loud which component saturates first, and at roughly what traffic.
10. **Handle failures** — For each major component: what happens when it dies, what the user sees, and how the system recovers.
11. **Scale it** — Evolve the design under 10x. Caching, replicas, sharding, async, regions — in the order the numbers demand.
12. **Explain trade-offs** — For each major decision: what you chose, what you rejected, and what the choice costs you.
13. **Summarise and defend** — Thirty seconds recapping the architecture, the two or three key decisions, and the one thing you would revisit with more time.

> Useful phrase: "Let me start with requirements and some rough numbers, then sketch a first design and evolve it. Stop me if you want to go deeper anywhere."

### 1. Clarify

Do not start drawing. Start scoping. Four questions cover most prompts:

- Who uses this, and what are the two or three things they do most?
- Roughly how many of them, and where are they?
- Is this read-heavy, write-heavy, or balanced?
- What is out of scope — payments, moderation, analytics, mobile offline?

Then say the scope back: "So we are building X for Y users, optimising for Z, and I will leave W out unless you want it."

### 2. Requirements

Split them and write both lists where the interviewer can see them.

| Functional (verbs) | Non-functional (adjectives + numbers) |
| --- | --- |
| User uploads a video | 99.9% availability for playback |
| Viewer streams a video | p99 start-of-playback under 2 s |
| Viewer sees view counts | View counts may lag 60 s (eventual) |

The non-functional list is the one that justifies architecture. "Playback must be fast globally" is what buys you a CDN. "View counts can lag" is what buys you an async counter pipeline. If you skip this list, every later component is a guess.

### 3. Size

Estimate only what changes a decision. Usually four numbers: peak QPS, storage per year, egress bandwidth, and the read:write ratio. Round hard. 86,400 seconds becomes 100,000. The point is to learn whether you are building for one machine, ten, or ten thousand.

### 4. Shape

APIs first, then data, then boxes. APIs define the contract; the data model usually determines whether the design is possible at all; the boxes are the easy part once those two exist.

Start the architecture at the smallest thing that works — one service, one database — and say so: "This handles our current numbers. Let me now add what the estimates force."

### 5. Stress

This is where senior and staff candidates separate themselves. For your chosen deep-dive component, go down three levels: what it does, how it does it, and what happens when it fails. Then walk the failure table for the whole system.

### 6. Sell

Close on your own terms. Recap the architecture in one sentence, name two or three decisions with their trade-offs, and volunteer the weakest part of your design before the interviewer finds it. Volunteering a weakness reads as senior; being caught by one does not.""",
                    ),
                    (
                        "Example",
                        """A URL shortener, run through the template in compressed form.

- **ASK** — "Short link creation and redirect. Custom aliases yes, analytics out of scope, links never expire unless asked. Public read, authenticated write."
- **SIZE** — "100M new links per month, 100:1 read ratio. That is ~40 writes/s and ~4,000 reads/s average, call it 12,000 peak. 100M links × ~500 bytes × 12 months ≈ 600 GB a year. Small. This fits on one database for a long time; the interesting problem is read latency and unique key generation."
- **SHAPE** — `POST /v1/links {url, alias?}` returns `{code, short_url}`. `GET /{code}` returns 302. One table keyed by `code`, secondary index on `owner_id`. One service, Postgres, Redis in front of the read path.
- **STRESS** — "The redirect is the hot path. Cache hit ratio will be very high because link popularity is heavily skewed, so Redis takes almost all read load. If Redis dies, 12,000 QPS lands on Postgres — that is survivable with a read replica but latency degrades, so I would size the replicas for it rather than assume the cache is always up."
- **SELL** — "Counter-based base62 codes over hashing, because hashing needs collision handling and cannot give two short links for one URL. The cost is a coordination point for ID allocation, which I solved with batched ranges per node."

Notice that no component appeared before a number or a requirement justified it.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any forty-five minute product design prompt: "design X"
- Take-home and written design documents — the same thirteen steps make a good document outline
- Internal design reviews, where the same structure is how you get a proposal approved""",
                    ),
                    (
                        "Trade-offs",
                        """The template itself has trade-offs, and good candidates adapt it.

- **Rigid order vs interviewer's agenda.** If the interviewer interrupts with "let's talk about the database", go there. Return to the template afterwards: "Good — that covers storage. Can I come back to the read path?"
- **Time spent on requirements.** Five minutes of clarification saves twenty minutes of designing the wrong system, but twelve minutes of clarification is a stalling tactic and reads as such.
- **Estimation depth.** Numbers justify architecture, but arithmetic is not the skill being tested. Two minutes, out loud, rounded.
- **Breadth vs depth in STRESS.** You cannot deep-dive five components in fifteen minutes. Choose the one the interviewer keeps asking about — that is them telling you where the points are.""",
                    ),
                    (
                        "Common Failure Modes",
                        """What goes wrong during the interview itself, and the recovery line for each.

| Situation | Recovery |
| --- | --- |
| You freeze on the prompt | "Let me start by scoping this, then I will estimate before designing." Requirements are always a safe first minute. |
| You realise the data model is wrong | Say it. "This schema forces a cross-shard read on the hot path — let me denormalise it." Self-correction scores well. |
| The interviewer keeps pushing on one area | That is the rubric. Stay there; do not try to return to your plan. |
| You do not know a technology they name | "I have not used Cassandra in production. I know it is a wide-column store with tunable consistency, so I would use it for the write-heavy append table. What matters here is the access pattern." Never bluff. |
| You are running out of time | Skip to SELL. A design with a clear summary beats a half-finished deep dive. |""",
                    ),
                    (
                        "What A Strong Candidate Says",
                        """Weak opening:

> "Okay, so we'll have a load balancer, then some app servers, then Redis, then a database, and Kafka for events."

Strong opening:

> "Before I draw anything — is this a consumer product or internal? What is the write volume? And should I assume a single region to start? … Good. Then the two hard parts are going to be the read path latency and the fan-out on writes, and I want to size both before I choose storage."

The difference is not vocabulary. It is that the second candidate is deciding what matters before deciding what to use.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Drawing boxes before stating requirements or numbers
- Listing technologies as if naming them is the same as justifying them
- Designing for a billion users when the prompt implies a million, then having no simpler fallback
- Spending the whole interview on the part you happen to know well
- Silent thinking — the interviewer scores what they hear, not what you intend
- No summary: ending on "…and I think that's it" instead of a defended recap""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Set a timer for eight minutes. Prompt: **"Design a pastebin."**

Write only the ASK and SIZE steps — no architecture. You are done when you have:

1. Three to five functional requirements
2. Three non-functional requirements, each with a number
3. Two things you explicitly put out of scope
4. Peak QPS, storage per year, and the read:write ratio

If that takes more than eight minutes, the bottleneck is scoping discipline, not knowledge. Repeat with "design a job board" until eight minutes is comfortable.""",
                    ),
                    (
                        "Interview Tip",
                        """Narrate the template as you use it. "I'm going to clarify, estimate, sketch, then deep-dive" takes eight seconds and tells the interviewer exactly how to score you — and if they want a different order, they will say so now instead of at minute thirty.""",
                    ),
                ],
                [
                    "ASK → SIZE → SHAPE → STRESS → SELL, in that order, with roughly 6/4/12/14/4 minutes each.",
                    "Every box you draw should be traceable to a requirement or an estimate you said out loud.",
                    "STRESS — deep dive, bottlenecks, failures — is where senior candidates earn the level.",
                    "Close by volunteering your design's weakest point before the interviewer finds it.",
                ],
                [
                    "How do you structure the first ten minutes of a system design interview?",
                    "What does ASK, SIZE, SHAPE, STRESS, SELL stand for, and why is the order fixed?",
                    "The interviewer interrupts your architecture to ask about the database. What do you do?",
                    "What belongs in the final thirty-second summary?",
                ],
            ),
            SD(
                "sd-interview-scoring",
                "How System Design Interviews Are Scored",
                "The rubric behind the conversation: what mid, senior, and staff candidates are expected to do differently.",
                12,
                "Interviewers are not grading your architecture against a reference answer — most prompts have several acceptable designs. They are filling in a rubric with four or five dimensions, and the same prompt is scored against a different bar depending on the level you are interviewing for. Knowing the rubric changes what you spend your forty-five minutes on.",
                [
                    (
                        "Why It Matters",
                        """Two candidates can produce identical diagrams and get opposite outcomes. The one who said "I chose leader-follower replication because reads dominate 100:1 and we can tolerate a second of replica lag on this endpoint — the cost is that a user may not see their own write, which I'll fix with read-your-writes routing" gets a strong signal. The one who drew the same replica and said nothing gets "did not demonstrate depth".

The diagram is the artifact. The reasoning is the product.""",
                    ),
                    (
                        "Mental Model",
                        """Most rubrics reduce to five dimensions.

| Dimension | Question the interviewer is answering |
| --- | --- |
| **Problem framing** | Did they design the right system, or the first system that came to mind? |
| **Technical breadth** | Do they know the standard components and when each one applies? |
| **Technical depth** | Can they go three levels down in at least one area without hand-waving? |
| **Trade-off reasoning** | Do they compare alternatives, or recite one answer? |
| **Communication** | Can a colleague follow the design, and does the candidate handle being challenged? |

Breadth gets you to the bar. Depth and trade-off reasoning get you above it.""",
                    ),
                    (
                        "How It Works",
                        """The same prompt, three bars.

### Mid-level (L3/L4)

The bar is *a working system*.

- Requirements gathered, scope stated
- A design that actually satisfies the functional requirements end to end
- Correct use of the standard components: load balancer, cache, database, queue
- Can answer "what happens when this box fails?" for the main components
- Estimation may be rough; depth may be shallow in places

### Senior (L5)

The bar is *a working system you can defend and scale*.

- Everything above, plus:
- Numbers drive the architecture, explicitly
- At least one genuine deep dive: sharding strategy, consistency model, fan-out design, indexing
- Trade-offs are volunteered, not extracted — "I chose X over Y because…"
- Failure modes are handled concretely: retries, idempotency, degradation, not just "we'd have redundancy"
- The design evolves correctly when the interviewer applies pressure ("now it's 10x")

### Staff (L6+)

The bar is *judgement about the whole problem, including the parts nobody asked about*.

- Everything above, plus:
- Questions the requirements themselves: "Do we actually need strong consistency here? That constraint costs us a region."
- Operational reality: migration path, rollout, cost, on-call burden, team boundaries
- Explicit simplicity bias — knows when *not* to add a component
- Handles ambiguity without needing to be steered
- Can articulate what they would build first, and what they would defer to v2""",
                    ),
                    (
                        "Design Decisions",
                        """Three habits that move you up a level, regardless of the prompt.

**1. Attach a number to every component.** Not "we add a cache" but "we add a cache because 4,000 reads/s against a 2 ms database query is 8 core-seconds per second of database CPU, and the key distribution is skewed enough that a 90% hit rate is realistic."

**2. Name the alternative you rejected.** Every choice has one. "Kafka rather than SQS because we need replay and multiple independent consumer groups; if we only needed one consumer with at-least-once delivery, SQS would be less operational work."

**3. Volunteer the weakness.** "The part of this design I am least happy with is the cross-shard read on the search path. With more time I would denormalise a search index rather than fan out to every shard." This is the single highest-signal sentence in the interview, because it is what senior engineers do in real design reviews.""",
                    ),
                    (
                        "Example",
                        """Same question, three answers.

**Interviewer: "Why did you put a queue between the API and the worker?"**

- *Mid:* "So the work happens asynchronously and the API is faster."
- *Senior:* "The thumbnail job takes two to five seconds of CPU. Inline, that pins request latency to worker capacity and a traffic spike turns into timeouts. The queue decouples arrival rate from processing rate — the API returns in 50 ms and the backlog absorbs bursts. The cost is that the client now sees eventual completion, so I need a status endpoint and the consumer has to be idempotent because delivery is at-least-once."
- *Staff:* All of the above, plus: "And I would put a bound on the queue. An unbounded backlog during an incident means we are still processing yesterday's uploads tomorrow, which is worse for users than shedding load. I would set a max age, alert on queue depth rather than CPU, and drop or defer low-priority jobs first."

Same box on the diagram. Three different scores.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Deciding how to spend your remaining ten minutes in an interview
- Self-scoring a practice design: which of the five dimensions did you actually demonstrate?
- Calibrating preparation — if your weakness is depth, practising more prompts will not help; practising one prompt three levels deeper will""",
                    ),
                    (
                        "Trade-offs",
                        """- **Depth vs coverage.** Going deep costs time you could spend covering more of the system. Resolve it by asking: "I could go deeper on the sharding strategy, or cover notifications and search at a high level — which is more useful to you?" Interviewers almost always pick depth, and asking scores well by itself.
- **Confidence vs honesty.** Confident wrong answers are the worst outcome. "I do not know, but here is how I would reason about it" scores far higher than a plausible invention.
- **Simplicity vs sophistication.** Reaching for the complex tool signals inexperience more often than expertise. Adding Kafka to a system doing 40 writes per second is a negative signal.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **The recital.** A memorised design for a prompt you have seen, delivered without adapting to this interviewer's constraints. Interviewers detect it by changing one requirement and watching the answer not change.
- **The buzzword cascade.** Naming six technologies in a sentence. Each one is a question you have now invited.
- **Defensiveness.** When challenged, doubling down. The correct response to a good challenge is "that's a real problem — let me fix it" and then fixing it.
- **Excessive agreement.** Changing your design every time the interviewer raises an eyebrow. Sometimes the right answer is "I still think this is right, because…".""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """These are level-probes. They are asked precisely to see whether you can go a level deeper.

- "Why not just use a bigger database?"
- "What breaks first if traffic goes up 10x?"
- "What would you build in the first month, and what would you defer?"
- "How much does this design cost to run?"
- "If you had to remove one component from this diagram, which one?"
- "What would you monitor to know this system is healthy?"

The last two are staff-level probes. Answering them well signals operational experience more than any architecture choice.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Optimising for looking impressive instead of being clear
- Treating the interviewer as an examiner rather than a colleague in a design review
- Never saying "I don't know"
- Designing for scale nobody asked for, and then being unable to explain the cost
- Leaving the summary out because time ran short""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Take any design you have already practised. Record yourself answering these three questions, out loud, for ninety seconds each:

1. What is the single most likely thing to break in this system, and what does the user see when it does?
2. Which component would you delete if you had to, and what would you lose?
3. What would you build in week one, and what would you defer to v2?

If any answer is shorter than sixty seconds, that is the dimension to work on.""",
                    ),
                    (
                        "Interview Tip",
                        """Ask the interviewer where they want depth: "There are three areas I could go deep on here — the fan-out, the storage layout, or the failure handling. Which is most interesting to you?" You will almost never be penalised for it, and you get the rubric handed to you.""",
                    ),
                ],
                [
                    "Interviewers score framing, breadth, depth, trade-off reasoning, and communication — not diagram similarity.",
                    "Mid = a working system. Senior = a defended, scalable system. Staff = judgement about cost, migration, and simplicity.",
                    "Naming the alternative you rejected is the cheapest way to demonstrate trade-off reasoning.",
                    "Volunteering your design's weakest point is a senior signal; being caught by it is not.",
                ],
                [
                    "What separates a senior answer from a mid-level answer on the same design?",
                    "How should you respond when the interviewer challenges a decision you believe is correct?",
                    "Which component would you remove from your design, and what would you lose?",
                    "How do you decide between going deeper and covering more of the system?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 2 — Foundations
# ---------------------------------------------------------------------------


def _foundations_topic() -> dict:
    return _sd_topic(
        "system-design-fundamentals",
        "Foundations",
        "What system design actually is, the non-functional properties that drive every decision, and why statelessness is the first thing you design for.",
        "EASY",
        2,
        [
            SD(
                "system-design-fundamentals",
                "System Design Fundamentals",
                "What the discipline actually is, and the three questions that produce every architecture.",
                14,
                "System design is the practice of choosing a structure that satisfies a set of requirements under constraints you do not control: finite machines, unreliable networks, a budget, and a team. There is rarely one correct design. There are designs that satisfy the requirements and designs that do not, and among the former, ones whose costs you can live with.",
                [
                    (
                        "Why It Matters",
                        """Writing correct code is a solved problem at the scale of one function. Nothing about knowing how a hash map works tells you what happens when two hundred machines each hold part of one, one of them is unreachable, and a user is waiting.

System design is the layer where the interesting failures live:

- The database is correct but saturated at 3,000 writes per second, and you need 12,000.
- Every service is up, but a retry storm between two of them has made the product unusable.
- The write succeeded, the cache did not get the memo, and the user is looking at data from four minutes ago.
- The design works perfectly in one region, and the company just opened in Singapore.

Interviewers care about this layer because it is where senior engineers spend their judgement, and because it is very hard to fake.""",
                    ),
                    (
                        "Mental Model",
                        """Every architecture is an answer to three questions, in this order.

Requirements → Constraints → Structure

1. **What must be true?** Functional behaviour plus non-functional properties: how fast, how available, how consistent, how durable.
2. **What is in the way?** Scale, latency of physics, cost, existing systems, team size, deadline.
3. **What structure satisfies (1) given (2)?** And what does that structure cost you?

If you can only remember one sentence about system design, make it this: **architecture is the set of decisions that are expensive to change later.** Which database you chose is architecture. Which HTTP library you used is not.

> Memory cue: you are not picking components. You are trading one set of problems for a different set you prefer.""",
                    ),
                    (
                        "How It Works",
                        """### The universal shape

Almost every internet-facing system, at every company, is some elaboration of this:

Client → DNS → Load balancer → Service → Cache → Database

Everything else is added for a reason you can name:

| Component | Added because |
| --- | --- |
| CDN | Static or media bytes are large and users are far away |
| Cache | The same reads repeat and the database is the bottleneck |
| Queue | Work is slow, bursty, or must survive a consumer restart |
| Search index | Query patterns the primary store cannot serve efficiently |
| Read replica | Reads exceed what one primary can serve, lag is acceptable |
| Shards | Data or write volume exceeds one machine |
| Object storage | Blobs do not belong in a row-oriented database |
| Second region | Latency for distant users, or survival of a regional outage |

Being able to recite the right-hand column is the skill. The left-hand column is trivia.

### Start simple, then force complexity

The strongest habit in a design interview is to begin with the smallest system that meets the stated requirements, say so explicitly, and then let the numbers push you:

1. One service, one database. Say: "at 40 writes per second this is genuinely fine."
2. Reads dominate → add a cache, then replicas.
3. Writes exceed one primary → shard, or move the hot table to a store designed for the access pattern.
4. Work is slow or spiky → move it off the request path with a queue.
5. Users are global, or one region is not enough → replicate across regions and decide what consistency you give up.

Each arrow should be justified by a number. Skipping to step five without walking the path is the most common way to fail the interview.

### Vocabulary you are expected to use precisely

- **Latency** — time for one operation. Always quote a percentile, never a mean.
- **Throughput** — operations per unit time.
- **Availability** — fraction of time the system serves requests successfully.
- **Reliability** — the system produces correct results, including under failure.
- **Durability** — committed data survives crashes, disks, and datacentres.
- **Consistency** — what a reader is guaranteed to see relative to recent writes.
- **Scalability** — capacity grows roughly proportionally with resources added.""",
                    ),
                    (
                        "Example",
                        """A team ships an internal expense tool. 500 employees, a few hundred requests a minute, one Postgres instance, one service. This is a *good* design: it meets every requirement, it costs almost nothing, one engineer understands all of it.

The same company ships a consumer app. 20M monthly users, 4M daily, 30 actions each — 120M requests/day, ~1,200 average QPS, ~4,000 peak. That number changes everything above the database: the service is now several stateless replicas behind a load balancer, the hot read path is cached, the primary has replicas, and image uploads went to object storage with a CDN in front.

Nothing about the second design is more *correct*. It is more expensive, harder to operate, and only justified by the number.

> Useful phrase: "The simplest design that meets these requirements is X. Here is the specific number that forces me past it."
""",
                    ),
                    (
                        "Common Use Cases",
                        """- Forty-five minute interview prompts
- Design documents and RFCs for new services
- Deciding whether an existing system needs re-architecture or just a bigger machine""",
                    ),
                    (
                        "Trade-offs",
                        """Six trade-offs recur in nearly every design. Being able to state both sides of each is most of what "knows system design" means.

| Trade-off | You gain | You pay |
| --- | --- | --- |
| Cache vs read from source | Latency, database load | Staleness, invalidation complexity |
| Async vs synchronous | Throughput, spike absorption, isolation | Eventual results, duplicate handling, ops |
| Denormalise vs normalise | Read speed, fewer joins | Write amplification, update anomalies |
| Strong vs eventual consistency | Simple reasoning, correctness | Latency, availability under partition |
| Horizontal vs vertical scale | Headroom, fault isolation | Distribution problems: coordination, partial failure |
| More components vs fewer | Fit to purpose, independent scaling | Operational burden, more failure modes |

Notice that none of these has a universally correct side. That is the point.""",
                    ),
                    (
                        "Common Failure Modes",
                        """The failures that define the discipline:

- **Saturation** — a component runs out of CPU, IOPS, connections, or file descriptors. Queues grow, latency climbs, then timeouts cascade.
- **Partial failure** — one of five services is down. The system is neither up nor down; it is wrong in a specific way.
- **Cascading failure** — a slow dependency causes retries, retries increase load, load makes it slower. Systems usually fall over from feedback loops, not from a single dead machine.
- **Correlated failure** — "we have three replicas" means nothing if all three are in the same rack, availability zone, or deploy.
- **Grey failure** — the component is up, passes health checks, and is returning garbage or 10x normal latency. Harder than a clean crash.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- "Why not just buy a bigger machine?" — Sometimes you should. Vertical scaling is cheaper and simpler until you hit the ceiling or need fault isolation. Say that before you shard anything.
- "What is the simplest version of this system?" — Have the answer ready. Candidates who can only describe the complex version look like they are reciting.
- "Which of your components is most likely to fail?" — Name one, say what the user sees, say what recovers it.
- "How would you know this system is unhealthy?" — Latency percentiles and error rate at the user-facing edge, not CPU.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating architecture as component selection rather than requirement satisfaction
- Quoting average latency instead of p95/p99
- Confusing availability (it responds) with reliability (it responds correctly) with durability (the data survives)
- Adding a queue, a cache and a second region before any number justified any of them
- Being unable to describe the simpler design you skipped past""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Take a product you use daily. In writing, no more than one page:

1. Name three functional requirements and three non-functional ones with numbers you can defend.
2. Draw the simplest architecture that satisfies them.
3. Now assume 50x the users. Which component breaks first? Add exactly one thing to fix it, and state what that thing costs.
4. Repeat step 3 twice more.

The output you want is not the final diagram. It is the sequence of forced moves.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the simple design out loud before you complicate it. "One service and one Postgres handles this comfortably at our current numbers — I will add components as the estimates force them" buys you credibility for everything that follows, and protects you from the "why is this so complicated?" question.""",
                    ),
                ],
                [
                    "Architecture is the set of decisions that are expensive to change later.",
                    "Every added component must trace back to a requirement or a number you stated.",
                    "Latency, availability, reliability, durability and consistency are distinct — use them precisely.",
                    "Real systems fail from saturation, partial failure and feedback loops, not single dead machines.",
                ],
                [
                    "What is the difference between availability, reliability and durability?",
                    "What is the simplest design that would satisfy these requirements, and what forces you past it?",
                    "Why do distributed systems usually fail from cascades rather than single failures?",
                    "Give three trade-offs you would expect to make in almost any design.",
                ],
            ),
            SD(
                "sd-nonfunctional-requirements",
                "Non-Functional Requirements: Scalability, Availability, Latency",
                "The properties that actually determine the architecture — and how to turn each into a number.",
                14,
                "Functional requirements tell you what to build. Non-functional requirements tell you how to build it. \"Users can watch a video\" is satisfied by a single web server; \"p95 start-of-playback under two seconds for users in Jakarta, 99.95% of the time\" is what buys you a CDN, adaptive bitrate, and a second region. Every meaningful architectural decision traces back to a non-functional requirement.",
                [
                    (
                        "Why It Matters",
                        """Interviewers watch for whether you gather these at all. A candidate who asks "what latency do we need on the read path, and can any of it be stale?" has already demonstrated more than one who draws a cache.

They also matter because they conflict. You cannot maximise availability, consistency and latency simultaneously — the whole discipline is choosing which to relax, per endpoint, on purpose.""",
                    ),
                    (
                        "Mental Model",
                        """Six properties, each of which must become a number before it is useful.

| Property | Vague version | Useful version |
| --- | --- | --- |
| Scalability | "It should scale" | "10x traffic in 18 months without re-architecture" |
| Availability | "It should be up" | "99.95% for reads, 99.9% for writes" |
| Latency | "It should be fast" | "p99 under 150 ms for the feed endpoint" |
| Throughput | "Handles lots of traffic" | "12,000 peak QPS reads, 400 writes" |
| Consistency | "Data should be correct" | "Read-your-writes for the author; 30 s staleness acceptable for others" |
| Durability | "Do not lose data" | "No committed write lost; RPO 0 for orders, RPO 5 min for analytics" |

The right-hand column is architecture. The left-hand column is a wish.""",
                    ),
                    (
                        "How It Works",
                        """### Scalability

A system is scalable if you can meet increased demand by adding resources, roughly proportionally. Two axes:

- **Vertical** — a bigger machine. Simple, no distribution problems, immediate. Bounded by the largest instance money can buy, and a single failure domain.
- **Horizontal** — more machines. Effectively unbounded and fault-tolerant, but introduces coordination, partial failure, and data distribution.

The honest answer in most interviews is "vertical until it stops being the cheap option, then horizontal for the stateless tier, then partition the data tier last" — because data partitioning is the expensive, hard-to-reverse move.

Amdahl's observation applies: if 5% of your request path is a serialised section (a single counter row, one lock, one coordinator), no amount of horizontal scaling gets you past 20x. Look for the serialised part.

### Availability

Availability = uptime / (uptime + downtime)

The subtlety is the definition of "up", which you must state explicitly before the number means anything.

| Target | Downtime per year | Downtime per month | Typical shape |
| --- | --- | --- | --- |
| 99% | 3.65 days | 7.3 hours | Internal tool |
| 99.9% | 8.8 hours | 43 minutes | Standard SaaS SLA |
| 99.95% | 4.4 hours | 22 minutes | Serious consumer product |
| 99.99% | 52 minutes | 4.4 minutes | Multi-AZ, no manual failover |
| 99.999% | 5.3 minutes | 26 seconds | Multi-region, automated everything |

Two facts candidates get wrong:

1. **Dependencies multiply.** A request that must touch four services, each 99.9% available, is 99.9%⁴ ≈ 99.6% — over a day of downtime a year. Availability is a property of the *path*, not of individual boxes. Removing a synchronous dependency from the hot path is often the cheapest availability win available.
2. **Redundancy in the same failure domain is not redundancy.** Three replicas in one availability zone survive a machine failure, not a zone failure.

### Reliability vs availability vs durability

- **Available** — it answered.
- **Reliable** — it answered *correctly*, and keeps doing so under failure.
- **Durable** — what it accepted is still there after a crash, a disk loss, or a datacentre fire.

A system that returns HTTP 200 with a stale or wrong body is available and unreliable. A cache is available and not durable. These are three different budgets.

### Latency vs throughput

Latency is time per operation; throughput is operations per second. They are not inverses, and improving one often harms the other.

- Batching raises throughput and raises latency.
- Adding queue depth raises throughput and raises tail latency.
- More parallelism raises throughput until contention makes latency worse.

Always quote percentiles. In a service where each page load makes 20 backend calls, a p99 of 1 second means roughly one in five page loads contains a 1-second call — the tail *is* the user experience. This is why p99 and p999 are the numbers that matter, and why "average latency is 40 ms" is close to meaningless.

### SLI, SLO, SLA, error budget

- **SLI** — the measurement. "Fraction of feed requests served in under 200 ms."
- **SLO** — the internal target. "99% of feed requests under 200 ms over 28 days."
- **SLA** — the contractual promise, with consequences. Always looser than the SLO.
- **Error budget** — 100% minus the SLO. At 99.9%, you may be down 43 minutes a month. Spend it deliberately: risky deploys, migrations, experiments.

The error budget is the concept that makes reliability an engineering decision rather than an aspiration. Zero errors is not a target; it is a statement that you are over-investing in reliability relative to features.""",
                    ),
                    (
                        "Design Decisions",
                        """These requirements should be gathered *per endpoint*, not per system. A single product typically has wildly different needs:

| Endpoint | Availability | Latency | Consistency |
| --- | --- | --- | --- |
| Read product page | 99.99% | p99 < 200 ms | Stale up to 60 s is fine |
| Add to cart | 99.95% | p99 < 300 ms | Read-your-writes |
| Place order | 99.9% | p99 < 2 s | Strong, exactly-once effect |
| View order history | 99.5% | p99 < 1 s | Eventual |

This table is one of the highest-value things you can put on the whiteboard early. It pre-justifies half of your later decisions and it immediately reads as experience — because it is what real design documents contain.""",
                    ),
                    (
                        "Example",
                        """A checkout service must be 99.99% available. It synchronously calls: auth (99.99%), inventory (99.9%), pricing (99.95%), and payments (99.9%).

Path availability ≈ 0.9999 × 0.999 × 0.9995 × 0.999 ≈ 99.74% — about 23 hours of downtime a year. The target is unreachable without changing the structure, not the individual services.

The fixes are structural: make pricing a cached read with a stale fallback, make inventory a soft check with reconciliation afterwards, make the payment call asynchronous with an order in `PENDING`. Now only auth is hard-synchronous, and the path is ~99.99%. Same services, different topology.""",
                    ),
                    (
                        "Common Use Cases",
                        """- The first five minutes of any design interview
- Writing an SLO for a service you own
- Justifying an architecture change to people who ask why you cannot just add a server
""",
                    ),
                    (
                        "Trade-offs",
                        """- **Availability costs money, roughly logarithmically.** Each additional nine typically multiplies infrastructure and operational cost. Ask what the business actually needs before promising four nines.
- **Latency targets constrain topology.** A sub-50 ms p99 for a global audience is not achievable from one region — physics puts a floor of roughly 70–150 ms round trip between continents. Sub-50 ms globally means edge compute or regional replicas, which means a consistency decision.
- **Strong consistency costs availability under partition, and latency always.** Quorum writes across regions add a cross-region round trip to every write.
- **Higher throughput via batching costs tail latency.** Fine for analytics, bad for interactive requests.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Tail amplification** — a page making 50 parallel calls to a service with p99 = 100 ms will have roughly a 40% chance of containing at least one 100 ms call. Fan-out turns a rare slow case into the common case.
- **Health checks that lie** — a process that responds to `/health` while its thread pool is exhausted stays in the load balancer pool and black-holes traffic.
- **Availability measured at the wrong place** — 99.99% measured at the load balancer while users see failures from a broken CDN or DNS.
- **Retry-amplified outages** — a dependency degrades, clients retry three times, effective load triples, dependency dies properly.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What availability do you need, and why?"** — Tie it to the business: an internal tool at 99.9% is fine; a payments API at 99.9% means 43 minutes a month of declined transactions.
- **"Your service calls four dependencies synchronously. What is your availability?"** — Multiply them. Then propose removing dependencies from the critical path.
- **"What if latency needed to be under 50 ms?"** — Name the physics first. Then: edge caching, regional replicas, precomputation, and dropping any synchronous cross-region hop. Say what consistency you give up.
- **"Average latency is 40 ms — is that good?"** — Refuse the question politely: ask for p95, p99, and the fan-out factor.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Saying "highly available" or "low latency" without a number
- Applying one availability and consistency target to every endpoint
- Ignoring that dependency availabilities multiply along a path
- Quoting means instead of percentiles
- Promising five nines in an interview — it usually signals you have never operated a system with even three""",
                    ),
                    (
                        "Mini Design Exercise",
                        """For a food delivery app, write the four-column table (endpoint, availability, latency, consistency) for these five operations: browse restaurants, search, place order, track courier location, view receipt.

Then, for each row, name the one architectural component that the row justifies. If a row justifies nothing, either the number is too loose or the row is not interesting — tighten it until it forces a decision.""",
                    ),
                    (
                        "Interview Tip",
                        """Gather requirements per endpoint, and put the table on the board. When the interviewer later asks "why is the courier location eventually consistent but the order strongly consistent?", you can point at a decision you already justified instead of improvising.""",
                    ),
                ],
                [
                    "A non-functional requirement is useless until it has a number attached.",
                    "Availability multiplies along a synchronous dependency path — shortening that path is the cheapest availability win.",
                    "Latency must be quoted as a percentile; fan-out turns p99 into the typical experience.",
                    "Gather availability, latency and consistency per endpoint, not per system.",
                ],
                [
                    "What is the difference between an SLI, an SLO, an SLA and an error budget?",
                    "Your endpoint calls four services at 99.9% each. What is your availability, and how do you improve it?",
                    "Why do we care about p99 rather than average latency?",
                    "What would you change if the latency requirement dropped to 50 ms globally?",
                ],
            ),
            SD(
                "sd-stateless-services",
                "Stateless Services, Horizontal Scaling, and Where State Goes",
                "Why the first architectural move is always to push state out of the application tier.",
                12,
                "Horizontal scaling is trivial for a component that holds no state and hard for one that does. That single asymmetry explains the standard shape of modern systems: a thick, stateless, easily replaced application tier, and a small number of carefully designed stateful systems behind it that specialists have already solved.",
                [
                    (
                        "Why It Matters",
                        """If a server holds a user's session in memory, every subsequent request from that user must reach that exact server. That one decision costs you: load balancing flexibility, the ability to deploy without dropping sessions, autoscaling, and graceful handling of a machine dying. Every one of those is a real outage you will otherwise have.

In an interview, "the application tier is stateless; session and cache state live in Redis, durable state in Postgres" is a single sentence that resolves a dozen later questions. Candidates who skip it end up hand-waving about sticky sessions when asked how they deploy.""",
                    ),
                    (
                        "Mental Model",
                        """State does not disappear. It moves to a component designed to hold it.

Client → Load balancer → Stateless app tier → State tier

| Kind of state | Where it belongs | Why |
| --- | --- | --- |
| Session / auth | Signed token in the client, or Redis | Any app node can validate it |
| Cached reads | Redis / Memcached | Shared across nodes, evictable |
| Durable records | SQL / NoSQL | Replicated, backed up, transactional |
| Blobs | Object storage | Cheap, durable, CDN-frontable |
| In-flight work | Queue | Survives a worker crash |
| Long-lived connections | Gateway tier with pub/sub | The one legitimately stateful tier |

Anything left in an application process's memory should be a pure cache — losing it must cost latency, never correctness.""",
                    ),
                    (
                        "How It Works",
                        """### What "stateless" actually means

A stateless service handles every request using only (a) the request itself and (b) shared external state. Two consequences:

- Any instance can serve any request.
- Killing an instance mid-flight loses at most the in-flight requests, which the client retries.

That is what makes rolling deploys, autoscaling, spot instances, and "just restart it" viable.

### Vertical vs horizontal scaling

| | Vertical | Horizontal |
| --- | --- | --- |
| Move | Bigger machine | More machines |
| Ceiling | Largest instance available | Practically none |
| Fault tolerance | None — one failure domain | Built in |
| Complexity | Near zero | Load balancing, distribution, partial failure |
| Data tier | Usually the first and best option | Requires partitioning — expensive |
| Cost curve | Superlinear at the top end | Roughly linear |

The honest sequence in an interview: scale vertically first because it is free engineering time; scale the stateless tier horizontally next because it is nearly free; partition the data tier last because it is the only genuinely hard one.

### Sessions without stickiness

Three options, in increasing order of operational comfort:

1. **Sticky sessions.** The load balancer pins a client to a node. Works, but breaks deploys, makes autoscaling lumpy, and creates hot nodes. Acceptable as a legacy accommodation, not as a design.
2. **External session store.** Session ID in a cookie, session data in Redis. Any node serves any request; Redis becomes a dependency on the auth path, so it needs replication.
3. **Self-contained tokens.** A signed JWT or similar carries identity and claims; no lookup at all. Fastest, and the trade-off is revocation: a token is valid until it expires. Mitigate with short lifetimes plus refresh tokens, or a small revocation list checked on sensitive operations.

Most systems end up with 3 for identity plus 2 for anything mutable.

### The legitimately stateful tier: long-lived connections

WebSocket gateways, game servers, and streaming ingest genuinely hold per-connection state. The pattern is to make that tier as thin as possible:

- The gateway holds sockets and nothing else.
- A registry (Redis) maps `user_id → gateway_instance`.
- Messages are delivered by publishing to a channel the owning gateway subscribes to.
- Business logic lives in stateless services behind the gateway.

Now the stateful part is a routing problem, not an application problem, and a gateway restart costs a reconnect rather than data.""",
                    ),
                    (
                        "Design Decisions",
                        """**Where do you terminate TLS?** Usually at the load balancer or edge, so app nodes are cheap and certificates are managed in one place. Inside a zero-trust network you re-encrypt between tiers (mTLS).

**Do you need sticky sessions for anything?** Occasionally yes: an in-progress multipart upload, a WebSocket, a server-side rendering cache. Scope stickiness to that endpoint rather than the whole service.

**How much in-process cache is acceptable?** A local cache in front of a shared cache is a real and valuable pattern (it removes a network hop for the hottest keys), but it introduces per-node staleness. Bound it with a short TTL — seconds — and never let it hold anything correctness depends on.

**What does graceful shutdown look like?** Stop accepting new connections, fail the health check so the load balancer drains you, finish in-flight requests with a timeout, then exit. Without this, every deploy is a small outage.""",
                    ),
                    (
                        "Example",
                        """Before: a Java service stores the shopping cart in the HTTP session, in memory. Deploys are done at 3 a.m. because they drop carts. Autoscaling is disabled because scaling in loses sessions. One node handles a disproportionate share of traffic because a big customer got pinned to it.

After: cart moves to Redis keyed by cart ID, with the ID in a signed cookie; identity moves to a short-lived JWT. Deploys are now rolling and happen during the day. Autoscaling is on. Any node can serve any request, and the load balancer uses least-connections instead of IP hash.

The new failure mode is real and must be named: Redis is now on the critical path for cart operations. So Redis is replicated with automatic failover, and cart writes are also persisted asynchronously to Postgres so a total cache loss degrades the experience rather than destroying carts.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any horizontally scaled HTTP service
- Preparing a service for autoscaling or spot instances
- Chat, notifications, and live dashboards — the connection-gateway pattern
- Migrating a legacy session-based monolith""",
                    ),
                    (
                        "Trade-offs",
                        """- **External session store vs token.** Store: revocable, larger payloads, extra network hop, new dependency. Token: fast and dependency-free, hard to revoke, size limits, claims can go stale.
- **Local cache vs shared cache.** Local is faster and eliminates a hop; shared is consistent across nodes and has a higher hit rate. Many systems run both, accepting bounded per-node staleness.
- **Statelessness vs efficiency.** Recomputing or refetching per request costs something. That cost is usually far smaller than the operational cost of stickiness, but not always — a server holding a large expensive-to-rebuild model in memory is a legitimate exception.
- **Vertical vs horizontal.** Vertical is genuinely the right first answer more often than interview folklore suggests. Saying so is a signal of judgement, not of ignorance.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Sticky sessions plus autoscaling** — scaling in silently logs users out.
- **Session store as a single point of failure** — Redis restarts, everyone is logged out at once, and the login stampede takes down the auth service.
- **In-memory rate limit counters** — each node enforces its own limit, so the effective limit is N times what you intended.
- **Local caches with long TTLs** — different users get different answers depending on which node they hit, which is nearly impossible to debug from the outside.
- **No graceful shutdown** — every deploy produces a burst of 502s.
- **Uneven hashing** — IP-hash load balancing behind a corporate NAT sends an entire company to one node.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you deploy this without downtime?"** — Rolling deploy, readiness probes, connection draining, graceful shutdown. Only possible because the tier is stateless.
- **"A node dies mid-request. What happens?"** — The load balancer removes it after a failed health check; in-flight requests fail and are retried by the client; nothing is lost because nothing durable lived on the node. Then: is the retried operation idempotent?
- **"Where does session state live, and what if that store is down?"** — Answer both halves. For a token-based design, degraded: existing tokens keep working, new logins fail.
- **"You have WebSockets. Is your service still stateless?"** — No, and say so. Then describe the thin-gateway plus registry pattern.
- **"Why not just scale up?"** — Because of fault isolation and the instance ceiling. But agree that vertical scaling is the right first move.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Claiming a service is stateless while it holds sessions, counters, or in-flight job state in memory
- Reaching for sticky sessions instead of moving the state out
- Forgetting that the session store is now a critical dependency that needs its own availability story
- Using JWTs for everything and having no revocation answer
- Ignoring graceful shutdown and connection draining""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Here is a service that is not stateless. Find all the state and relocate it.

- Shopping cart in the HTTP session
- A per-node in-memory rate limiter, 100 requests per minute
- Uploaded files written to local disk, served from the same node
- A background thread that emails abandoned carts hourly
- An in-memory WebSocket map for live order tracking

For each item: where does the state go, what new dependency does that create, and what is the failure behaviour when that dependency is unavailable? The background thread is the interesting one — moving it requires either leader election or a scheduler with distributed locking.""",
                    ),
                    (
                        "Interview Tip",
                        """Say "the application tier is stateless" early and explicitly, then name exactly where each kind of state lives. It is one sentence that pre-answers the deploy question, the autoscaling question, the node-failure question, and the load balancing question.""",
                    ),
                ],
                [
                    "Stateless application tiers are what make rolling deploys, autoscaling and node failure boring.",
                    "State does not vanish — it moves to Redis, the database, object storage, or a queue, each with its own availability story.",
                    "Scale vertically first, then the stateless tier horizontally, and partition the data tier last.",
                    "Long-lived connections are the one legitimately stateful tier: keep the gateway thin and route through a registry.",
                ],
                [
                    "What makes a service stateless, and why does it matter for deployment?",
                    "Where should session state live, and what breaks when that store is unavailable?",
                    "Why are sticky sessions usually the wrong answer, and when are they acceptable?",
                    "You need WebSockets. How do you keep the rest of the system horizontally scalable?",
                ],
            ),
        ],
    )


def _back_of_envelope_lesson() -> dict:
    return {
        "slug": "back-of-the-envelope-estimation",
        "title": "Back-of-the-Envelope Estimation",
        "short": "Tricks, formulas, and memory aids for QPS, storage, bandwidth, and latency.",
        "minutes": 16,
        "content": """# Back-of-the-Envelope Estimation

A fast study filter for system design interviews. Memorize the first section; understand the second. Structured reasoning beats exact arithmetic.

## Study Priority

| A. Must memorize | B. Know conceptually |
| --- | --- |
| Time, QPS, and storage anchors | Exact L1/L2 cache latency |
| Peak ≈ 3× average | Powers of 2 (2¹⁰, 2²⁰, 2³⁰) |
| 1 Gbps ≈ 125 MB/s | Common object-size ranges |
| Replication ×3 | Read/write ratios and availability nines |
| Latency hierarchy + USS-B sequence | Pareto 80/20 cache heuristic |

> Interview rule: Do not try to recall every number. State assumptions, calculate the order of magnitude, keep units visible, and explain how the result affects architecture.

## 1. The CORE Framework: USS-B

Users → Storage → Speed → Bandwidth

| U — Users | S — Storage | S — Speed | B — Bandwidth |
| --- | --- | --- | --- |
| How many people use the system? | How much data must be stored? | QPS, latency, throughput | How much data moves on the network? |

> Memory cue: USS-B = Users, Storage, Speed, Bandwidth. Estimate in that order.

## 2. Golden Numbers to Memorize

| Anchor | Meaning / use |
| --- | --- |
| 10⁶ | 1 million |
| 10⁹ | 1 billion |
| 1 day ≈ 10⁵ s | Use 100,000 instead of 86,400 |
| 1 year ≈ 3×10⁷ s | Use 30 million |
| 100M req/day ≈ 1K QPS | Critical QPS anchor |
| Peak QPS ≈ 3× average | Default unless the traffic pattern says otherwise |
| 1M × 1 KB ≈ 1 GB | Storage / memory anchor |
| 1M × 1 MB ≈ 1 TB | Storage anchor |
| 1B × 1 KB ≈ 1 TB | Storage anchor |
| 1 Gbps ≈ 125 MB/s | Network throughput (÷ 8 for bytes) |
| Replication ≈ 3× | Always multiply storage for durability |

## 3. The Most Important Formula: QPS

Average QPS = Requests per day ÷ 100,000

Example: 100 million requests/day ÷ 100,000 ≈ 1,000 QPS

- **1M**/day → ~10 QPS
- **10M**/day → ~100 QPS
- **100M**/day → ~1K QPS
- **1B**/day → ~10K QPS
- **10B**/day → ~100K QPS

Peak QPS = Average QPS × 3

> Memory cue: drop two zeros from millions-of-requests-per-day to get QPS (100M → 1K).

## 4. Latency Numbers Every Engineer Must Know

CPU (ns) → RAM (100 ns) → SSD (μs) → Disk (ms) → Cross-region (100+ ms)

| Operation | Latency | Mental bucket |
| --- | --- | --- |
| L1 cache reference | ~0.5 ns | Instant (CPU) |
| L2 cache reference | ~7 ns | Instant |
| Main memory (RAM) | ~100 ns | Very fast |
| SSD random read (4 KB) | ~100–150 μs | Fast |
| HDD disk seek | ~10 ms | Slow |
| Same-datacenter RTT | ~0.5 ms | Fast enough |
| Cross-region RTT (US–EU) | ~80–150 ms | Expensive |

Key ratios: RAM ≫ SSD (~1,000×) ≫ HDD (~100×). Same-DC ≫ cross-region (~200–300×). These gaps are why you cache, shard, and put replicas in other regions.

## 5. Powers of 2 (Storage Sizes)

> Memory aid: 10 → thousand (KB), 20 → million (MB), 30 → billion (GB), 40 → trillion (TB).

| Power | Exact | Approx | Name |
| --- | --- | --- | --- |
| 2¹⁰ | 1,024 | ~10³ | 1 KB |
| 2²⁰ | 1,048,576 | ~10⁶ | 1 MB |
| 2³⁰ | ~1.07B | ~10⁹ | 1 GB |
| 2⁴⁰ | ~1.1T | ~10¹² | 1 TB |
| 2⁵⁰ | ~1.1Q | ~10¹⁵ | 1 PB |

## 6. Users Estimation

MAU → DAU → Concurrent Users

- DAU ≈ 10–20% of MAU for general consumer products (higher for social / messaging)
- Concurrent ≈ DAU × (avg session minutes / 1,440) — e.g. 30 min session → ~2% of DAU online
- Always state the assumption out loud. Reasoning beats an exact percentage

## 7. Storage Estimation

Storage = items × size per item × replication × overhead

Example: 100M photos/day × 1 MB = 100 TB/day → with 3× replication ≈ 300 TB/day

- Tweet / short message ≈ 200–500 bytes
- Profile / small JSON ≈ 1–10 KB
- Photo (compressed) ≈ 0.5–5 MB
- 1-min 1080p video ≈ 50–150 MB

Always project to 1 year and 5 years of retention, and add 20–30% overhead on top of replication.

## 8. Bandwidth Estimation

Bandwidth = QPS × data per request

Example: 10K QPS × 100 KB/request ≈ 1 GB/s → immediately suggests CDN, object storage, or streaming

1 Gbps ≈ 125 MB/s

If the number exceeds a few Gbps, you need multiple NICs, sharding, or a CDN.

## 9. Cache Estimation

Cache size = cached objects × size (Pareto: top 20% of data often serves 80% of traffic)

Example: 10M profiles × 10 KB = 100 GB → practical size 120–150 GB (overhead + growth)

## 10. Read vs Write Ratio

| System type | Typical starting assumption |
| --- | --- |
| Social feed / timeline | Very read-heavy, e.g. **100:1** or higher |
| Typical web / e-commerce | Read-heavy, e.g. **10:1 – 50:1** |
| Chat / messaging | Closer to balanced (depends on fan-out) |
| Write-heavy analytics | Often write-heavy or near **1:1** |

These are starting points only. Adjust and say the assumption out loud.

## 11. Universal Estimation Sequence

Users → Active Users → Actions/User → Requests/Day → QPS → Peak QPS → Storage

1. **100M users**
2. **10% DAU** → 10M daily active
3. **10 actions / user / day** → 100M requests/day
4. **100M ÷ 100K s/day** → ~1K average QPS
5. **Peak = 3×** → ~3K peak QPS
6. Then storage and bandwidth from item size, retention, and payload

## 12. Interview Example: Video Platform

1. Assume **1B** total users
2. **10% DAU** → 100M daily active
3. **10 views / active user / day** → 1B views/day
4. **1B ÷ 100K s/day** → ~10K average QPS
5. **Peak 3×** → ~30K peak QPS
6. Then bandwidth (views × bitrate) and storage (uploads × size × retention × resolutions × replication)

## 13. Mental Math Tricks

- Round aggressively: 86,400 → 100,000; 365 → 400 (or 300)
- Powers of ten: KB=10³, MB=10⁶, GB=10⁹, TB=10¹², PB=10¹⁵
- Keep units visible throughout the calculation
- Order-of-magnitude only — within 2–5× is excellent
- State assumptions first so the interviewer can course-correct
- Sanity-check: does the final number feel reasonable for the product?

## 14. Availability (The 9s)

| Availability | Downtime / year | Memory tip |
| --- | --- | --- |
| 99% (2 nines) | ~3.65 days | Basic |
| 99.9% (3 nines) | ~8.76 hours | Common SLA |
| 99.99% (4 nines) | ~52.6 minutes | High availability |
| 99.999% (5 nines) | ~5.26 minutes | Carrier-grade |

## 15. The BIG Memory Card

| Time | QPS anchors |
| --- | --- |
| 1 day ≈ 100K seconds | 100M req/day ≈ 1K QPS |
| 1 year ≈ 30M seconds | 1B req/day ≈ 10K QPS |
| Peak ≈ 3× average QPS | 10B req/day ≈ 100K QPS |

| Storage anchors | Latency hierarchy |
| --- | --- |
| 1M × 1 KB ≈ 1 GB | RAM ~100 ns |
| 1M × 1 MB ≈ 1 TB | SSD ~100 μs (1,000× slower) |
| 1B × 1 KB ≈ 1 TB | HDD ~10 ms · cross-region ~100 ms |
| Always ×3 replication | Same-DC RTT ~0.5 ms |

| Network | Quick rules |
| --- | --- |
| 1 Gbps ≈ 125 MB/s | Round to powers of 10 |
| Sequence: Users → Actions → QPS | Pareto 20/80 for cache |
| Then storage / bandwidth | State assumptions first |

## 16. What to Say in the Interview

> I'll make a few reasonable assumptions for a back-of-the-envelope estimate. I'll estimate active users, actions per user, requests per day, average and peak QPS, then storage and bandwidth. These numbers are approximate and intended only to determine the order of magnitude so we can choose the right architecture.

## 17. Practice Systems

- **URL shortener** — classic storage + QPS
- **Twitter / X** — read-heavy feed + fan-out
- **YouTube / video** — bandwidth + multi-resolution storage
- **WhatsApp / messaging** — concurrent connections + fan-out
- **Google Drive / Dropbox** — storage growth + sync bandwidth
- **Instagram / photos** — write + read amplification

> Final tip: The interviewer cares more about structured thinking and clear assumptions than hitting the exact number. Practice the sequence until it is automatic.

## 18. 30-Second Review Before an Interview

- Time: 1 day ≈ 100K seconds · 1 year ≈ 30M seconds
- Traffic: 100M/day ≈ 1K QPS · 1B/day ≈ 10K QPS · peak ≈ 3×
- Storage: 1M×1KB ≈ 1GB · 1M×1MB ≈ 1TB · include replication
- Network: 1 Gbps ≈ 125 MB/s
- Flow: Users → Actions → Requests → QPS → Peak → Storage/Bandwidth
- Always state assumptions and aim for order-of-magnitude accuracy
""",
        "takeaways": [
            "USS-B: Users, Storage, Speed, Bandwidth — estimate in that order.",
            "100M requests/day ≈ 1K QPS. Peak is ~3× average. 1 day ≈ 100K seconds.",
            "Storage: 1M × 1 KB ≈ 1 GB. Always multiply by ~3 for replication.",
            "Order-of-magnitude plus stated assumptions beats fake precision.",
        ],
        "questions": [
            "How do you estimate QPS from daily requests?",
            "Why multiply storage by about 3×?",
            "Which latency gaps justify a cache vs a multi-region replica?",
            "Walk through back-of-the-envelope numbers for a video platform.",
        ],
        "problems": [],
    }


# ---------------------------------------------------------------------------
# Module 3 — Requirements and estimation
# ---------------------------------------------------------------------------


def _requirements_topic() -> dict:
    return _sd_topic(
        "requirements-gathering",
        "Requirements Gathering",
        "The five minutes that decide whether you spend the next forty designing the right system.",
        "EASY",
        3,
        [
            SD(
                "requirements-gathering",
                "Requirements Gathering",
                "How to turn a two-word prompt into a scoped, numbered problem — without burning the clock.",
                14,
                "\"Design Twitter\" is not a problem statement; it is an invitation to ask questions. The interviewer has a specific system in mind, usually a narrow slice of the real product, and they are waiting to see whether you find it or invent your own. Requirements gathering is the step where you convert ambiguity into a contract that the rest of the interview is judged against.",
                [
                    (
                        "Why It Matters",
                        """Two things are being tested, and only one of them is obvious.

The obvious one: can you find the real problem? A candidate who designs a photo-sharing app when the interviewer wanted a short-video feed has produced forty minutes of unusable work.

The subtle one: **do you create your own constraints?** Interviewers deliberately leave prompts underspecified. Senior engineers respond by proposing scope — "I'll assume single region, 10M DAU, and leave search out unless you want it" — rather than waiting to be told. Proposing and confirming is much stronger than interrogating.

This is also where you plant the justifications you will harvest later. Every component you add in minute thirty should point back to a line you wrote in minute four.""",
                    ),
                    (
                        "Mental Model",
                        """Four moves, five to eight minutes total.

Scope → Functional → Non-functional → Confirm

1. **Scope** — What slice of this product are we building, and what am I explicitly not building?
2. **Functional** — Three to five verbs the system must support.
3. **Non-functional** — Availability, latency, consistency, scale, durability — each with a number.
4. **Confirm** — Say it back in two sentences and get a yes.

The confirm step is the one candidates skip and the one interviewers notice.

> Memory cue: you are not gathering requirements. You are proposing a contract and asking them to sign it.""",
                    ),
                    (
                        "How It Works",
                        """### Functional vs non-functional

| Functional | Non-functional |
| --- | --- |
| What the system does | How well it must do it |
| "A user can upload a video" | "Upload accepted within 2 s; processing may take minutes" |
| "A viewer can watch a video" | "p99 start of playback under 2 s worldwide" |
| "A viewer sees a view count" | "View counts may lag up to 60 s" |
| Determines the API and data model | Determines the architecture |

Both lists matter, but the second is the one that produces boxes on the diagram. A candidate who lists only functional requirements will end up choosing components by taste.

### The question set that covers most prompts

Ask five or six of these, not all fifteen.

**Scope and users**

- Which slice are we building — the whole product, or one flow?
- Who are the users, and where are they? One region, or global?
- Is there an existing system we are extending, or is this greenfield?

**Behaviour**

- What are the two or three most important operations?
- Read-heavy, write-heavy, or balanced? What is the rough ratio?
- Is anything real-time, or is a few seconds of delay acceptable?

**Scale**

- How many daily active users?
- How many of the core action per user per day?
- How much data per item, and how long do we keep it?

**Quality**

- What availability do we need, and does it differ by endpoint?
- What latency is acceptable on the hot path?
- Can any of this be stale? For how long?
- Is any of it irreplaceable — must we never lose it?

**Out of scope**

- Do I need to handle auth, payments, moderation, analytics, or mobile offline?

### Proposing rather than interrogating

Fifteen questions in a row feels like an audit and burns four minutes. Bundle them and propose defaults:

> "I'm going to assume this is consumer-facing, globally distributed, read-heavy at roughly 100:1, and that we care most about feed latency. I'll treat moderation and ads as out of scope. Does that match what you have in mind?"

One sentence, four decisions, and the interviewer can correct any of them in five seconds. This is how the question is meant to be answered.

### Writing it down

Put both lists somewhere visible and leave them there. Later, when you add a CDN, you point at "p99 playback under 2 s worldwide" instead of asserting that CDNs are good. When the interviewer asks "why is this eventually consistent?", you point at "view counts may lag 60 s" — a constraint they agreed to.

### Reading the interviewer

Interviewers steer. Learn the signals:

- "Let's say 10 million daily users" — they want you at a scale that forces sharding or fan-out design.
- "Assume a single region for now" — multi-region is a later follow-up, not part of the main design.
- "Don't worry about that" — genuinely drop it and do not return to it.
- "Interesting, why?" — they disagree, or they want depth. Either way, stay there.
- Repeating a question — you have not answered it. Answer it directly before moving on.""",
                    ),
                    (
                        "Design Decisions",
                        """**How many questions is right?** Five to eight, in under six minutes. Beyond that you are stalling, and interviewers read it as avoidance.

**Which assumptions can you just make?** Anything that does not change the architecture. Authentication mechanism, exact schema types, cloud vendor. State them in passing and move on.

**Which must you ask about?** Anything that changes the shape of the system: scale, read:write ratio, consistency needs, global vs regional, real-time vs batch. Getting one of these wrong invalidates the design.

**What if the interviewer says "you decide"?** Decide, out loud, with a reason: "Then I'll assume 10M DAU, because that is the point where a single database stops being sufficient and the design gets interesting." You have just chosen a scale that makes the rest of the interview show your best work — that is a legitimate and expected move.""",
                    ),
                    (
                        "Example",
                        """**Prompt:** "Design a ticket booking system."

A weak start jumps to "we'll need a database of events and seats". A strong start:

> "A few questions. Is this general-admission or reserved seating? Reserved seating is a much harder problem because of seat locking. Second: are we handling the on-sale spike for a stadium show, or steady-state traffic? Because a 60,000-seat on-sale is essentially a distributed contention problem, and that is where I would want to spend my time. Third: is payment in scope, or can I treat it as an external service with a callback?"

The interviewer now says "reserved seating, yes handle the on-sale, payment is external". In three questions the candidate has learned that the interview is really about seat-level contention and burst traffic, not CRUD. Everything after that targets the actual rubric.

Contrast with the candidate who spent the same three minutes designing a normalised schema for venues.""",
                    ),
                    (
                        "Common Use Cases",
                        """- The opening of every design interview
- The first section of any design document
- Scoping a project with a product manager, where the same four moves apply""",
                    ),
                    (
                        "Trade-offs",
                        """- **Thoroughness vs clock.** Every minute here is a minute not spent on the deep dive where senior signal lives. Six minutes is the upper bound.
- **Asking vs assuming.** Asking is safer but slower, and too much of it reads as indecision. Assume the things that do not change the architecture; ask about the things that do.
- **Narrow vs broad scope.** Narrow scope lets you go deep and finish; too narrow and you look like you are avoiding the hard part. If you cut something, name it as a deliberate cut: "I'll leave search out — happy to come back to it if there is time."
- **Following the interviewer vs holding your plan.** Follow them. Their interruptions are the rubric leaking.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Designing the wrong product.** Usually caused by pattern-matching the prompt to a design you memorised.
- **Silent assumptions.** You assumed eventual consistency; the interviewer assumed strong. Neither of you notices until minute thirty-five.
- **Requirements that justify nothing.** "It should be secure and maintainable" produces no architecture. If a requirement does not force a decision, it is filler.
- **Scope creep mid-interview.** Adding features as you go, ending with a design that does eight things badly.
- **Ignoring an explicit constraint.** The interviewer said single region; you built multi-region anyway. That reads as not listening.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why do you need to know the read:write ratio?"** — Because it decides whether the design is about caching and replicas, or about partitioning and write throughput. Those are different systems.
- **"Assume whatever you like."** — Then assume out loud, with the reason: "10M DAU, because that is where the interesting problems start."
- **"Is that all you want to ask?"** — Usually a hint you missed something structural. Check: scale, consistency, geography, and what happens when it fails.
- **"We also want X."** — Mid-interview requirement changes are deliberate. Say what X changes and what it costs before you draw it.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Starting to draw before any requirement exists
- Asking fifteen questions in a row instead of proposing a scoped assumption
- Collecting only functional requirements, so nothing justifies the architecture
- Writing requirements you never refer to again
- Not confirming scope back to the interviewer before moving on""",
                    ),
                    (
                        "Mini Design Exercise",
                        """For each prompt, write the single question whose answer most changes the architecture — and say what each possible answer would change.

1. "Design a chat app."
2. "Design a payment system."
3. "Design a metrics dashboard."
4. "Design a file storage service."
5. "Design a recommendation feed."

Model answer for (1): *"Is this 1:1 messaging or large group chat?"* — 1:1 is a routing problem with a simple message store; 10,000-member groups turn every send into a fan-out problem with its own delivery, ordering and read-state design. Same prompt, two completely different systems.""",
                    ),
                    (
                        "Interview Tip",
                        """End the requirements step with one sentence and a question mark: "So: reserved seating, on-sale bursts, payments external, single region, and I'm optimising for not double-selling a seat. Sound right?" You have just written the grading criteria for your own interview, and had them approved.""",
                    ),
                ],
                [
                    "Propose a scoped assumption and ask for confirmation — do not interrogate for four minutes.",
                    "Non-functional requirements with numbers are what justify the architecture; functional ones only shape the API.",
                    "Ask only about things that change the shape of the system; assume the rest out loud.",
                    "Write the requirements where you can point at them when defending a decision later.",
                ],
                [
                    "What questions do you ask before designing anything, and why those?",
                    "What is the difference between a functional and a non-functional requirement?",
                    "The interviewer says 'assume whatever you like'. What do you do?",
                    "Give a prompt where one clarifying question completely changes the system.",
                ],
            ),
        ],
    )


def _capacity_topic() -> dict:
    return _sd_topic(
        "capacity-estimation",
        "Capacity Estimation",
        "Turning a product description into the four numbers that justify every component you are about to draw.",
        "EASY",
        4,
        [
            SD(
                "capacity-estimation",
                "Capacity Estimation",
                "Why estimation is an architecture tool, not an arithmetic test — and how to do it in three minutes out loud.",
                14,
                "Estimation exists for one reason: to tell you which design you are allowed to propose. At 40 writes per second a single Postgres instance is not just adequate, it is correct. At 400,000 writes per second nothing about that design survives. The numbers are how you find out which world you are in, and they are how you prove to the interviewer that the component you just drew is necessary.",
                [
                    (
                        "Why It Matters",
                        """Without numbers, every architectural claim is taste. "We should shard" is fashion. "We should shard, because 40,000 writes per second at 1 KB each is 40 MB/s of sustained write throughput plus index maintenance, which is past what one primary handles comfortably" is engineering.

Estimation also protects you from the opposite failure, which is more common in interviews than under-designing: adding Kafka, Cassandra, and a service mesh to a system that does two hundred requests per second. If you run the numbers first, you will not do that — and if you do it anyway, the interviewer now has evidence.""",
                    ),
                    (
                        "Mental Model",
                        """Four numbers. Nothing else, unless the prompt demands it.

Users → QPS → Storage → Bandwidth

| Number | Why you need it | What it decides |
| --- | --- | --- |
| **Peak QPS** | Sizing the request path | Servers, cache, whether one DB is enough |
| **Storage/year** | Sizing the data tier | Single node vs sharded, hot/cold tiering |
| **Bandwidth** | Sizing the network path | CDN, object storage, egress cost |
| **Read:write ratio** | The shape of the whole design | Caching and replicas, or partitioning |

Every one of those maps to a decision. If a number you are computing does not map to a decision, stop computing it.""",
                    ),
                    (
                        "How It Works",
                        """### The sequence

Say it out loud in this order, rounding aggressively at every step.

1. **Daily active users.** Given, or derived: DAU is typically 10–25% of MAU for a general consumer product, higher for messaging.
2. **Actions per user per day.** State it as an assumption. "Say 20 feed loads and 2 posts."
3. **Requests per day.** DAU × actions.
4. **Average QPS.** Requests ÷ 100,000. (A day is 86,400 seconds; use 100,000 and keep moving.)
5. **Peak QPS.** Average × 3 for a normal consumer diurnal curve. Use 10x or more if the product has scheduled spikes — ticket on-sales, sports events, flash sales.
6. **Storage.** Writes/day × bytes per item × retention × replication factor, then add 20–30% for indexes and overhead.
7. **Bandwidth.** QPS × average payload size. Convert: 1 Gbps ≈ 125 MB/s.

### The anchors worth memorising

| Anchor | Value |
| --- | --- |
| One day | ≈ 100,000 seconds |
| One year | ≈ 30,000,000 seconds |
| 1M requests/day | ≈ 10 QPS |
| 100M requests/day | ≈ 1,000 QPS |
| 1B requests/day | ≈ 10,000 QPS |
| Peak | ≈ 3 × average (more for spiky products) |
| 1M × 1 KB | ≈ 1 GB |
| 1M × 1 MB | ≈ 1 TB |
| 1 Gbps | ≈ 125 MB/s |
| Replication | ×3 |

### Rough capacity of one machine

This is the part candidates most often lack, and it is what turns a number into a decision.

| Component | Comfortable range on one modern node |
| --- | --- |
| Stateless app server | 1,000–10,000 QPS, depending on work per request |
| Postgres/MySQL, simple indexed reads | 5,000–20,000 QPS |
| Postgres/MySQL writes | 1,000–10,000/s before tuning becomes a project |
| Redis | 100,000+ ops/s, single-threaded per core |
| Kafka broker | Hundreds of MB/s sequential |
| SSD random reads | ~100 μs, tens of thousands of IOPS |

So: 4,000 peak read QPS is one database's worth of work, maybe two with headroom. 400,000 is fifty, which means partitioning, caching, or both. The estimate is only useful because you know what one machine does.

### Latency anchors

These justify caching, regional replicas, and async boundaries.

| Operation | Latency |
| --- | --- |
| L1 cache reference | ~1 ns |
| Main memory read | ~100 ns |
| SSD random read | ~100 μs |
| Same-datacentre round trip | ~0.5 ms |
| Redis GET over the network | ~1 ms |
| Rotational disk seek | ~10 ms |
| Cross-continent round trip | ~80–150 ms |

Two ratios matter more than the absolute numbers: memory is roughly 1,000x faster than SSD, and a cross-region hop is roughly 200x a local one. The first ratio is why you cache. The second is why you do not make a synchronous cross-region call on a user-facing path.""",
                    ),
                    (
                        "Example",
                        """**Prompt: design a photo-sharing feed. 100M MAU.**

> "Let me size this. 100M monthly, assume 20% daily, so 20M DAU. Say each user opens the feed 10 times a day and posts 0.2 photos — that is 200M feed reads and 4M uploads per day.

> Feed reads: 200M ÷ 100,000 seconds ≈ 2,000 QPS average, ~6,000 peak. That is a handful of database nodes if uncached, or one Redis cluster if cached — and since feeds are read-heavy and repeat, I will cache.

> Uploads: 4M ÷ 100,000 ≈ 40/s average, ~120 peak. That is nothing for a database, but at 2 MB per photo it is 8 TB of new media a day, which is very much not nothing. That number alone tells me media goes to object storage, not the database, and playback goes through a CDN.

> Metadata: 4M rows/day × 1 KB × 365 ≈ 1.5 TB/year before replication, so call it 5 TB with three copies. One well-provisioned database handles that for a couple of years; I do not need to shard on day one, but I will pick a shard key now so I can later.

> Read:write is 50:1, so this is a caching and fan-out problem, not a write throughput problem."

Six numbers, ninety seconds, and the design has been decided: object storage plus CDN for media, cache plus replicas for the feed, a single but shard-ready metadata store. Every later component now has a citation.""",
                    ),
                    (
                        "Design Decisions",
                        """**Which numbers do you actually need?** Only the ones that change a decision. For a chat system, concurrent connections matters more than QPS. For a video platform, egress bandwidth dominates everything. For a metrics pipeline, cardinality and write throughput matter and read QPS barely does. Pick the two or three the product is actually shaped by.

**How precise?** Order of magnitude. Being within 3x is a complete success. Producing 43,891 QPS from arithmetic performed silently is a failure, because nobody heard the reasoning and the precision was fake.

**Peak multiplier?** 2–3x for a normal consumer product. 10–100x for anything with a scheduled event: ticket sales, product launches, live sports, tax deadlines. If the product has a spike shape, say so — it changes the design from "provision for peak" to "queue and shed".

**When do you skip estimation?** Almost never, but keep it to two minutes if the interviewer signals impatience. You can also front-load a single decisive number: "The one number that matters here is 8 TB a day of new media, so let me start there."
""",
                    ),
                    (
                        "Common Use Cases",
                        """- Justifying every component in a design interview
- Capacity planning for a launch
- Deciding whether a proposed feature is affordable before building it
- Sanity-checking a vendor or a colleague's architecture""",
                    ),
                    (
                        "Trade-offs",
                        """- **Precision vs speed.** More precision almost never changes the decision, and always costs interview time.
- **Provisioning for peak vs average.** Peak provisioning wastes money most of the day; average provisioning fails at peak. Autoscaling narrows the gap but has a lag, which is why queues and load shedding still matter for sharp spikes.
- **Estimating storage with or without replication and indexes.** Forgetting them understates by 3–5x, which is the difference between one node and a cluster.
- **Designing for the number you estimated vs the number in 18 months.** Design for roughly 10x headroom in the structure, provision for today's traffic.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **The silent calculation.** Doing the maths in your head and announcing a result. Nobody can score that.
- **Forgetting the replication multiplier.** 1 TB of data is 3 TB of disk.
- **Ignoring index and overhead cost.** Indexes frequently add 30–100% on top of row storage.
- **Using average QPS to size a system that has a spike shape.** A ticketing system sized for average QPS is a system that is down on every on-sale.
- **Estimating a number nobody needed.** Computing bandwidth for a text-only API wastes two minutes.
- **Treating the estimate as a commitment.** It is a rounded assumption; say so, and let the interviewer adjust it.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Where did that number come from?"** — Name the assumption, not the arithmetic. "I assumed 20% of monthly users are daily, which is typical for social products; if it is 40% everything doubles and I would add a second cache shard."
- **"What if traffic is 10x that?"** — Do not re-estimate. Say which component saturates first at 10x and what the next move is. That is the real question.
- **"Is your database going to handle that?"** — Compare against what one node does. This is why the machine-capacity table matters.
- **"How much will this cost?"** — Egress and storage usually dominate. 8 TB/day of media is roughly 3 PB/year; at typical object storage prices that is a meaningful monthly bill, and CDN egress is often larger than compute. Staff-level answers know that.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Doing arithmetic instead of drawing conclusions from it
- Not knowing roughly what one machine can do, which makes every number meaningless
- Quoting average when the product is spiky
- Omitting replication, indexes, and retention from storage estimates
- Spending five minutes here and then not referring to any of it again""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Estimate, out loud, in under three minutes each. For every result, state the one architectural decision it forces.

1. A messaging app: 500M DAU, 40 messages sent per user per day, 200 bytes per message, kept forever.
2. A video platform: 2M uploads/day, average 10 minutes, stored in four renditions, 1B views/day at an average 5 Mbps for 6 minutes.
3. A metrics platform: 50,000 hosts, 1,000 series each, one data point every 10 seconds, 16 bytes per point, 13-month retention.

For (2), notice that the view bandwidth number is so large it dominates the entire design — that is the point of the exercise. Storage is a cost problem; egress is an architecture problem.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the conclusion, not just the number. "That is about 6,000 peak QPS, which is more than one database should serve, so I will cache the read path" — the sentence contains the estimate and the decision it forces, which is exactly what the step is for.""",
                    ),
                ],
                [
                    "Estimate four things: peak QPS, storage per year, bandwidth, and the read:write ratio.",
                    "A number is only useful if you know what one machine can do — memorise rough per-node capacities.",
                    "Round hard, narrate everything, and state the decision each number forces.",
                    "Peak is 3x average for normal products and 10–100x for anything with a scheduled event.",
                ],
                [
                    "How do you estimate QPS from a user count, and what do you round?",
                    "Why multiply storage by three, and what else do people forget?",
                    "Roughly how many QPS can one relational database node serve, and why does that matter?",
                    "Your estimate says 6,000 peak QPS. What does that tell you about the architecture?",
                ],
            ),
            _back_of_envelope_lesson(),
        ],
    )


# ---------------------------------------------------------------------------
# Module 4 — Core building blocks
# ---------------------------------------------------------------------------


def _networking_topic() -> dict:
    return _sd_topic(
        "networking-foundations",
        "Networking Foundations",
        "DNS, HTTP and TLS, and how to choose between polling, SSE and WebSockets — the parts of the request path that exist before your code runs.",
        "EASY",
        5,
        [
            SD(
                "sd-dns",
                "DNS and Traffic Steering",
                "The first hop of every request, and the cheapest global load balancer you will ever deploy.",
                10,
                "Before a client can talk to your system it has to find it, and DNS is how. In an interview DNS is rarely the main topic, but it is the answer to several questions that come up constantly: how do users reach the nearest region, how do you fail traffic over to another datacentre, and why did your change take an hour to take effect.",
                [
                    (
                        "Why It Matters",
                        """Three interview moments depend on understanding DNS:

- **"How do users in Europe reach your European servers?"** The honest first answer is usually DNS-based geo-steering or anycast, not application logic.
- **"A region goes down. How does traffic move?"** If your answer involves DNS, you must also talk about TTLs and client caching, because failover is not instant.
- **"How long does a deploy or a failover take to be visible?"** DNS caching means the answer is "as long as the TTL, plus resolvers that ignore it".

Candidates who treat DNS as magic give vague failover answers. Candidates who know it is a cache hierarchy with TTLs give precise ones.""",
                    ),
                    (
                        "Mental Model",
                        """A hierarchical, aggressively cached lookup.

Browser cache → OS cache → Recursive resolver → Root → TLD → Authoritative

The first three are caches. Your control is limited to what the authoritative server returns and the TTL you set on it — everything upstream of that is somebody else's cache honouring, or ignoring, your TTL.

> Memory cue: DNS is a globally distributed cache you can write to, but cannot invalidate.""",
                    ),
                    (
                        "How It Works",
                        """### Record types worth knowing

| Record | Meaning | Use |
| --- | --- | --- |
| A / AAAA | Hostname to IPv4 / IPv6 address | Pointing at a load balancer |
| CNAME | Alias to another hostname | Pointing at a CDN or managed LB endpoint |
| ALIAS / ANAME | CNAME-like behaviour at the zone apex | `example.com` pointing at a CDN |
| MX | Mail exchange | Email |
| TXT | Arbitrary text | Domain verification, SPF/DKIM |
| SRV | Service location with port and priority | Internal service discovery |
| NS | Delegation to authoritative servers | Zone structure |

### Traffic steering

The authoritative server can return different answers to different clients, which makes DNS a routing layer:

- **Simple / round robin** — return several A records and let clients pick. Crude, no health awareness.
- **Weighted** — send 10% of resolutions to the new stack. The standard mechanism for a canary at the region level.
- **Latency-based** — return the region with the lowest measured latency to the resolver.
- **Geolocation** — return an answer based on the client's approximate location, often for data residency rather than speed.
- **Failover** — health-check endpoints and stop returning unhealthy ones.

An important subtlety: these decisions are made based on the *resolver's* location, not the client's. A user on a corporate VPN or a centralised public resolver can be steered to the wrong region. EDNS Client Subnet mitigates this by passing a truncated client subnet to the authoritative server.

### Anycast

The alternative to steering with DNS is steering with routing: announce the same IP address from many locations and let BGP deliver packets to the topologically nearest one. This is how CDNs, public DNS resolvers, and modern global load balancers work.

| | DNS steering | Anycast |
| --- | --- | --- |
| Failover speed | TTL-bound, minutes | Seconds, via route withdrawal |
| Granularity | Per resolver | Per network path |
| Client cache problems | Yes | No |
| Operational complexity | Low | High — needs network infrastructure |

In practice you usually get anycast by putting a CDN or a cloud global load balancer in front, and keep DNS simple.

### TTL

The TTL is the promise you make about how long an answer may be cached, and it is the core trade-off:

- **Low TTL (30–60 s)** — fast failover, more query volume, and more dependence on your authoritative DNS being available.
- **High TTL (hours)** — resilient and cheap, but a failover takes hours to fully drain.

The standard pattern is a low TTL on the records you might need to move quickly, a normal TTL elsewhere, and never relying on DNS alone for fast failover. Some clients and JVMs cache DNS results indefinitely regardless of TTL, which is a classic production surprise.""",
                    ),
                    (
                        "Example",
                        """A service runs active-active in `us-east` and `eu-west`, fronted by a global load balancer with an anycast IP.

A European user resolves `api.example.com` once and gets the anycast address. Their packets enter the provider's network at a nearby edge and are forwarded to `eu-west`. When `eu-west` fails health checks, the edge starts forwarding to `us-east` within seconds — no DNS change, no client cache to wait for. Latency for European users roughly doubles, and the product degrades but stays up.

Compare with pure DNS failover and a 300-second TTL: the authoritative server stops returning the European address, but clients that resolved a minute ago keep hammering the dead region for up to five minutes, and some misbehaving resolvers do it for far longer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Routing users to the nearest region
- Regional failover and blue-green cutovers
- Weighted migration between two stacks
- Internal service discovery via SRV records in some architectures""",
                    ),
                    (
                        "Trade-offs",
                        """- **DNS failover is cheap and slow; anycast is fast and operationally heavy.** Most teams buy anycast from a CDN or cloud provider rather than running BGP.
- **Low TTL buys agility and costs query volume plus a hard dependency on DNS availability.** A DNS provider outage with 30-second TTLs takes you down in under a minute.
- **Geo-steering improves latency and complicates consistency.** Once users are pinned to regions, you have to decide what happens to their data.
- **Multiple A records give crude client-side balancing for free** but with no health awareness — a dead address is retried by every client until it is removed.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Clients that ignore TTL.** Older JVM defaults cache forever; some libraries resolve once at startup and never again. Failover silently does not work for them.
- **DNS provider outage.** Your servers are all healthy and nobody can find them. This is why serious setups use two independent DNS providers.
- **Resolver-location steering errors.** VPN and central resolver users get routed to a far region.
- **Negative caching.** A mistake that returns NXDOMAIN gets cached too, and the fix takes as long as the negative TTL.
- **TTL not lowered before a planned migration.** Cut the TTL a day in advance; raising it back afterwards.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you fail over to another region?"** — Name the mechanism and its speed. Anycast or a global load balancer for seconds; DNS for minutes; and say that clients may lag the TTL.
- **"How long until a DNS change takes effect?"** — TTL plus the tail of misbehaving caches. Never "immediately".
- **"How do you route users to the closest datacentre?"** — Anycast at the edge, or latency-based DNS, with the caveat that DNS sees the resolver rather than the user.
- **"Your DNS provider is down. What happens?"** — Existing cached entries keep working; new resolutions fail. Mitigation is a second provider on the same zone.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating DNS failover as instant
- Ignoring client-side DNS caching entirely
- Forgetting that DNS itself is a dependency that can fail
- Using DNS round robin as if it were a health-aware load balancer
- Setting a 24-hour TTL and then needing to move traffic in five minutes""",
                    ),
                    (
                        "Mini Design Exercise",
                        """You must migrate `api.example.com` from one cloud provider to another with zero downtime and the ability to roll back within two minutes.

Write the plan. It should include: when you lower the TTL and to what, how you shift a small percentage of traffic first, how you verify, what your rollback action is, how long rollback actually takes for the worst-behaved client, and why you might put a proxy in front and avoid DNS as the switching mechanism entirely.""",
                    ),
                    (
                        "Interview Tip",
                        """When failover comes up, give the time constant. "DNS-based failover takes about a TTL, so with a 60-second TTL most traffic moves within a minute and stragglers take longer; if we need seconds, we need anycast or a proxy layer." Quantified answers read as operational experience.""",
                    ),
                ],
                [
                    "DNS is a cache hierarchy you can write to but cannot invalidate — TTL is the only lever.",
                    "DNS failover is TTL-bound and approximate; anycast or a global proxy layer gives second-level failover.",
                    "Geo-steering sees the resolver, not the user, so VPN and central-resolver traffic gets misrouted.",
                    "DNS is itself a dependency: plan for provider failure with a second authoritative provider.",
                ],
                [
                    "How do you route users to the nearest region, and what are the options?",
                    "How fast is DNS failover, and what determines that?",
                    "What is anycast and when would you prefer it to DNS steering?",
                    "Your DNS provider has an outage. What still works and what does not?",
                ],
            ),
            SD(
                "sd-http-tls",
                "HTTP, TLS, and the Cost of a Request",
                "What actually happens between a client and your load balancer, and which parts you can remove.",
                12,
                "Every user-facing design has an HTTP hop at the front, and a surprising amount of perceived latency lives there rather than in your code. Knowing what a connection costs — round trips, handshakes, head-of-line blocking — is what lets you answer \"how do we get this under 100 ms?\" with something other than \"add a cache\".",
                [
                    (
                        "Why It Matters",
                        """A cold HTTPS request to a distant origin costs: one DNS lookup, one TCP handshake (1 round trip), one TLS handshake (1–2 round trips), then the request itself. At a 100 ms round trip that is 300–400 ms before your server has done any work. No amount of backend optimisation touches it.

That is why CDNs, connection reuse, and TLS session resumption matter, and why "terminate TLS at the edge" is one of the highest-leverage sentences in a latency-sensitive design.""",
                    ),
                    (
                        "Mental Model",
                        """Think in round trips, not milliseconds.

DNS → TCP handshake → TLS handshake → Request → Response

| Step | Round trips | Removable by |
| --- | --- | --- |
| DNS | 0–1 | Caching, preconnect |
| TCP | 1 | Connection reuse, QUIC (0-RTT with TCP folded in) |
| TLS 1.3 | 1 | Session resumption (0-RTT), keep-alive |
| TLS 1.2 | 2 | Upgrading to 1.3 |
| Request/response | 1 | Nothing — this is the actual work |

Each round trip costs one network latency. Terminating at a nearby edge turns 100 ms round trips into 5 ms round trips for the handshake portion, even when the origin is still far away.""",
                    ),
                    (
                        "How It Works",
                        """### HTTP versions

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
| --- | --- | --- | --- |
| Transport | TCP | TCP | QUIC over UDP |
| Concurrency | One request per connection at a time | Multiplexed streams | Multiplexed streams |
| Head-of-line blocking | Per connection | At the TCP layer | Eliminated |
| Header compression | None | HPACK | QPACK |
| Connection setup | TCP + TLS | TCP + TLS | Combined, 0-RTT resumption |

HTTP/2 solved application-level head-of-line blocking but not transport-level: one lost TCP segment stalls every multiplexed stream. HTTP/3 moves to QUIC so a lost packet only stalls its own stream, which matters most on lossy mobile networks.

For a system design interview the useful claims are: multiplexing removes the need for domain sharding and request bundling; HTTP/3 helps mobile and high-loss networks most; and both are usually terminated at the edge while the edge-to-origin hop stays HTTP/1.1 or HTTP/2.

### TLS

TLS gives confidentiality, integrity, and server authentication. Two facts that come up:

- **TLS 1.3 handshakes in one round trip**, and zero with session resumption. TLS 1.2 needs two. Upgrading is a real latency win.
- **Termination point is an architectural decision.** Terminating at the edge or load balancer centralises certificates and lets the edge do compression, caching and routing on plaintext. Everything behind that point is then unencrypted unless you re-encrypt — which is exactly what mTLS between internal services is for.

**mTLS** adds client certificates so both sides authenticate. In service meshes it is the standard way to get service identity without passing tokens around.

### Connection management

- **Keep-alive** — reuse a connection for many requests. Without it, every request pays the handshake.
- **Connection pooling** — the server-side equivalent for calls to databases and downstream services. Pool exhaustion is one of the most common production incidents: a slow dependency holds connections, the pool empties, and unrelated requests start failing.
- **Timeouts** — separate connect, read, and total timeouts. A missing read timeout means one hung dependency can occupy a thread forever.

### Idempotency and methods

| Method | Safe | Idempotent | Cacheable |
| --- | --- | --- | --- |
| GET | Yes | Yes | Yes |
| HEAD | Yes | Yes | Yes |
| PUT | No | Yes | No |
| DELETE | No | Yes | No |
| POST | No | No | Rarely |
| PATCH | No | Not necessarily | No |

This table is why retrying a failed GET or PUT is safe and retrying a POST is not, which is where idempotency keys come from.

### Status codes that matter in design discussions

- **429** — rate limited, with `Retry-After`
- **503** — overloaded or shedding load, usually retryable
- **502 / 504** — upstream failure or timeout at a proxy
- **409** — conflict, typically an optimistic concurrency failure
- **412 / 428** — precondition failed or required, used for conditional writes with ETags""",
                    ),
                    (
                        "Example",
                        """A mobile client in Sydney calls an API in Virginia. Round trip is about 200 ms.

Cold request over TLS 1.2: DNS (cached) + TCP (200) + TLS (400) + request (200) = roughly 800 ms before any backend work.

Now put an edge POP in Sydney that terminates TLS, with a warm keep-alive connection back to Virginia. The handshake round trips are now ~5 ms each locally, and only the actual request crosses the Pacific: roughly 210 ms. The backend did not change at all, and the request got nearly four times faster.

This is the single most common answer to "our API is slow for international users" and it is worth being able to produce the arithmetic.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Explaining and fixing latency for geographically distant users
- Choosing where to terminate TLS and whether to re-encrypt internally
- Debating HTTP/3 adoption for mobile-heavy products
- Setting sane timeouts and pool sizes between services""",
                    ),
                    (
                        "Trade-offs",
                        """- **Edge termination vs end-to-end encryption.** Edge termination is faster and enables caching and routing; it means the edge provider sees plaintext. Regulated workloads may require passthrough or re-encryption.
- **Keep-alive vs connection count.** Long-lived connections save handshakes and consume server file descriptors and memory. Millions of idle mobile connections is a real capacity problem.
- **HTTP/3 vs operational maturity.** Real wins on lossy networks, but UDP is blocked or deprioritised on some corporate networks, so you always keep a TCP fallback.
- **Aggressive timeouts vs spurious failures.** Short timeouts protect the pool and cause false failures on slow-but-healthy requests. Tune from the p99, not the mean.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Connection pool exhaustion** caused by one slow downstream, taking out endpoints that do not even use it.
- **No read timeout**, so a hung dependency pins threads until the process dies.
- **Certificate expiry** — still one of the most common causes of self-inflicted outages. Automate renewal and alert on days remaining, not on failure.
- **Retry without backoff on 503**, converting a degraded service into a dead one.
- **Head-of-line blocking on HTTP/2 over a lossy link**, presenting as sporadic multi-second stalls on mobile.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why is our API slow in Asia when the servers are healthy?"** — Count round trips. Propose edge termination and connection reuse before touching the backend.
- **"Where do you terminate TLS and why?"** — At the edge for latency and certificate management; re-encrypt internally with mTLS if the threat model requires it.
- **"Which requests are safe to retry?"** — GET, PUT, DELETE by definition; POST only with an idempotency key.
- **"What timeouts would you set between these two services?"** — Give numbers derived from the downstream p99, and mention that the caller's timeout must be shorter than its own caller's, or retries pile up.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Measuring latency only server-side and missing the handshake cost entirely
- Assuming HTTP/2 eliminated head-of-line blocking
- Retrying POST requests without an idempotency key
- Leaving default, effectively infinite, client timeouts in place
- Treating TLS as free""",
                    ),
                    (
                        "Mini Design Exercise",
                        """An API serves users in three continents from one region. p50 is 40 ms measured at the server; users report two-second page loads.

List every source of latency between the user's tap and the rendered response, estimate each in round trips, and then propose three changes ordered by impact per unit of effort. The point of the exercise is that the biggest wins are usually not in the application.""",
                    ),
                    (
                        "Interview Tip",
                        """Reason in round trips rather than milliseconds. "That is three round trips before we do any work, so at 150 ms RTT the floor is 450 ms" is a sentence that instantly shows you understand where latency comes from.""",
                    ),
                ],
                [
                    "A cold HTTPS request costs 2–4 round trips before your server does anything.",
                    "Terminating TLS at a nearby edge removes handshake round trips even when the origin stays far away.",
                    "HTTP/2 multiplexes but still suffers TCP head-of-line blocking; HTTP/3 over QUIC does not.",
                    "GET, PUT and DELETE are idempotent and safely retryable; POST needs an idempotency key.",
                ],
                [
                    "Why is a first request to a distant API so much slower than subsequent ones?",
                    "Where would you terminate TLS, and what does that decision cost you?",
                    "What problem does HTTP/3 solve that HTTP/2 did not?",
                    "Which HTTP methods are safe to retry automatically, and why?",
                ],
            ),
            SD(
                "sd-realtime-protocols",
                "Polling, SSE, and WebSockets",
                "Choosing how the server pushes to the client — and what each choice costs at a million connections.",
                11,
                "Any design with live updates — chat, notifications, order tracking, dashboards, collaborative editing — has to answer one question: how does the server tell the client something happened? There are four real options, and the right one is determined by update frequency, direction, and how many concurrent clients you must hold.",
                [
                    (
                        "Why It Matters",
                        """Candidates reach for WebSockets reflexively, and interviewers push back because WebSockets turn a stateless tier into a stateful one. You now own connection affinity, reconnection, fan-out routing, and the memory cost of a million open sockets.

Sometimes that is exactly right. Often a five-second poll or server-sent events is simpler and adequate, and being able to say why is the signal.""",
                    ),
                    (
                        "Mental Model",
                        """Four options along one axis: how urgent, and in which direction.

| Mechanism | Direction | Latency | Cost | Use when |
| --- | --- | --- | --- | --- |
| Short polling | Client pulls | Half the interval | Wasteful at scale | Updates are rare and latency tolerance is high |
| Long polling | Client pulls, server holds | Near real time | One held connection per client | You need push but cannot use WebSockets |
| Server-sent events | Server pushes, one way | Near real time | One HTTP connection per client | Notifications, feeds, progress, dashboards |
| WebSocket | Bidirectional | Lowest | Stateful connection per client | Chat, collaboration, games, high-rate two-way |

> Memory cue: pick the weakest mechanism that meets the requirement. Every step up the table costs you statefulness.""",
                    ),
                    (
                        "How It Works",
                        """### Short polling

The client asks every N seconds. Dead simple, works everywhere, completely stateless, and trivially cacheable. The cost is that most requests return nothing: 1M clients polling every 5 seconds is 200,000 QPS of mostly-empty responses.

It is the right answer more often than interview culture suggests — particularly for low-frequency updates where a 30-second poll against a cached endpoint costs almost nothing.

### Long polling

The client requests, the server holds the request open until there is data or a timeout (typically 30 s), then the client immediately re-requests. Near-real-time delivery over ordinary HTTP. The cost is a held connection per client and awkward interactions with proxies and load balancer timeouts.

### Server-sent events

A single long-lived HTTP response that streams events. One direction only: server to client. Built-in reconnection with `Last-Event-ID` for resuming. Works through most proxies because it is just HTTP, and it is dramatically simpler to operate than WebSockets.

SSE is the correct and underused answer for notifications, live counters, progress indicators, and dashboards — anywhere the client does not need to send high-rate messages back. Older browsers cap connections per domain over HTTP/1.1, which HTTP/2 fixes.

### WebSockets

A real bidirectional, persistent, low-overhead channel after an HTTP upgrade handshake. The right choice for chat, multiplayer, collaborative editing, and trading.

What you take on:

- **Stateful gateways.** Each connection lives on one process. You need a registry mapping user to gateway and a pub/sub fabric so any service can reach any connection.
- **Reconnection and resume.** Mobile networks drop constantly. Clients need exponential backoff with jitter, and the protocol needs a cursor so a reconnecting client can fetch what it missed.
- **Backpressure.** A slow consumer must not let the server buffer unboundedly. Drop, coalesce, or disconnect.
- **Scale cost.** Roughly tens of kilobytes of memory per connection plus a file descriptor; a well-tuned node holds 100k–500k connections, so a million concurrent users is a fleet, not a server.
- **Load balancing.** Connections are long-lived, so "least connections" balancing drifts; new nodes stay empty until clients reconnect. Some systems force periodic reconnects to rebalance.

### The standard architecture

Client → Edge → Gateway tier → Pub/Sub → Services

The gateway holds sockets and does nothing else. A registry in Redis maps `user_id → gateway_id`. When a service needs to push, it publishes to a channel; the owning gateway is subscribed and writes to the socket. Business logic stays stateless and horizontally scalable.

Critically, the live channel is a *delivery optimisation*, not the source of truth. Messages are persisted first, then pushed. A client that reconnects fetches everything after its last acknowledged cursor over plain HTTP. If you design it this way, losing a WebSocket costs latency rather than data.""",
                    ),
                    (
                        "Design Decisions",
                        """**Push the event, or push a hint?** Sending the full payload is fewer round trips. Sending "something changed, go fetch" keeps the socket cheap, avoids ordering and authorisation problems in the push path, and lets the fetch be cached. For anything with complex permissions, the hint pattern is safer.

**How do clients catch up after a disconnect?** Always with a cursor-based HTTP fetch, never by replaying the socket. This single decision removes an entire class of bugs.

**Do you need per-connection state beyond the socket?** Try hard to say no. Subscriptions, presence and read cursors belong in Redis, not in gateway memory, so a gateway restart costs a reconnect and nothing else.

**How do you handle presence?** A heartbeat writing a key with a short TTL. Presence is inherently approximate — say so rather than designing a consistent presence system.""",
                    ),
                    (
                        "Example",
                        """An order-tracking screen shows courier location and status.

Status changes maybe five times per order, so status goes over SSE — one stream, no client-to-server traffic, trivially resumable. Courier location updates every three seconds but only matters while the screen is open, so the client polls a cached location endpoint at 3-second intervals; the endpoint reads from Redis and costs nothing.

No WebSocket is needed anywhere, because nothing in the product requires high-rate client-to-server messaging. If the product later adds courier-customer chat, that feature gets a WebSocket and the rest stays as it is.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Chat and messaging — WebSocket
- Notifications and activity feeds — SSE or push notifications
- Live dashboards and progress bars — SSE
- Collaborative editing — WebSocket, with conflict resolution above it
- Order and delivery tracking — polling a cached endpoint plus SSE for status""",
                    ),
                    (
                        "Trade-offs",
                        """- **Simplicity vs latency.** Polling is stateless, cacheable and operationally boring; the price is delay and wasted requests.
- **SSE vs WebSocket.** SSE is one-directional and far simpler to run; WebSocket is required only if the client sends frequently.
- **Connection count vs push latency.** Holding a million sockets is a genuine cost in memory, file descriptors, and deploy complexity. Every deploy disconnects everyone.
- **Payload in the push vs fetch on hint.** Payload is faster; hint is safer for authorisation and ordering.
- **Mobile reality.** Native apps often should not hold sockets at all — platform push notification services exist precisely so the OS holds one connection instead of every app holding its own.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Thundering herd on reconnect.** A gateway deploy drops 200,000 clients that all reconnect within a second. Mandatory: exponential backoff with jitter on the client, and staggered gateway restarts.
- **Lost messages during disconnect** because delivery relied on the socket instead of a persisted cursor.
- **Slow consumers** causing unbounded server-side buffering.
- **Proxy and load balancer idle timeouts** silently killing connections; you need application-level pings inside the idle window.
- **Uneven gateway load** after a scale-out, because existing connections never move.
- **Duplicate delivery across a user's devices** when the registry maps a user to a single connection instead of a set.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why WebSockets instead of polling?"** — Justify with update frequency and direction. If you cannot, you probably should be polling.
- **"You have 10M concurrent users. How many gateway machines?"** — Give a per-node connection budget and multiply. This is a question about whether you know the cost.
- **"A gateway node dies. What happens?"** — Clients reconnect with backoff, land on another node, re-register, and fetch anything missed by cursor. No data loss because the socket was never the source of truth.
- **"How do you deploy the gateway tier without disrupting everyone?"** — Drain slowly, stagger, cap reconnect rate, and make the client resilient.
- **"How do you push to a specific user across a fleet?"** — Registry plus pub/sub, and say what happens when the registry entry is stale.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Choosing WebSockets by default and inheriting statefulness for no benefit
- Treating the socket as the source of truth, so a disconnect loses messages
- No jitter in client reconnect logic
- Forgetting that every deploy of the gateway tier is a mass reconnection event
- Ignoring the memory and file descriptor cost per connection when sizing""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the live layer for a sports app: 5M concurrent viewers during a match, score updates roughly every 30 seconds, a live commentary feed of about one message per 10 seconds, and no client-to-server messaging.

Choose the mechanism and justify it against the alternatives. Then answer: what is the cheapest possible design here, given that every viewer sees the *same* updates? The intended realisation is that identical-payload broadcast is a CDN problem, not a socket problem — a cached endpoint with a 5-second TTL serves 5M viewers from the edge for almost nothing, and the socket tier you were about to build was unnecessary.""",
                    ),
                    (
                        "Interview Tip",
                        """Say which mechanism you are choosing and why the weaker one is insufficient: "Updates are one-directional and about one per minute, so SSE is enough — WebSockets would add a stateful tier for no benefit." Declining complexity, with a reason, scores higher than adopting it.""",
                    ),
                ],
                [
                    "Pick the weakest push mechanism that meets the requirement: polling, then SSE, then WebSockets.",
                    "WebSockets convert a stateless tier into a stateful one — you then own routing, reconnection and backpressure.",
                    "Persist first and push second; a reconnecting client catches up by cursor over HTTP.",
                    "Every gateway deploy is a mass reconnect, so clients need exponential backoff with jitter.",
                ],
                [
                    "When would you use SSE instead of WebSockets?",
                    "How do you push a message to a specific user across a fleet of gateway servers?",
                    "A gateway node dies holding 200,000 connections. Walk through what happens.",
                    "How many concurrent WebSocket connections can one server realistically hold?",
                ],
            ),
        ],
    )


def _api_topic() -> dict:
    return _sd_topic(
        "api-design",
        "API Design",
        "The system boundary: resources, idempotency, pagination, versioning, and how to design an API that survives scale.",
        "MEDIUM",
        6,
        [
            SD(
                "api-design",
                "API Design",
                "Designing the contract first, because it constrains everything behind it.",
                14,
                "The API is the only part of your system the outside world can see, and it is the hardest part to change once clients depend on it. In an interview, writing three concrete endpoints with real request and response shapes is worth more than ten minutes of boxes — it forces you to decide what the system actually does, and it exposes data model problems before you draw the database.",
                [
                    (
                        "Why It Matters",
                        """A well-chosen API answers questions the diagram cannot:

- Is this operation synchronous or does it return a job id? That decides whether you need a queue.
- Does the write carry an idempotency key? That decides how retries behave.
- Is the list endpoint cursor-paginated? That decides whether it survives a large dataset.
- Does the read accept a staleness parameter? That decides your caching story.

Interviewers also use the API step to check that you think from the caller inward rather than from the database outward. Candidates who design the schema first usually produce an API that leaks their storage decisions, and then cannot change storage later.""",
                    ),
                    (
                        "Mental Model",
                        """An API is three promises: what you can ask for, what you get back, and what happens when it goes wrong.

Resource → Operation → Contract → Failure semantics

Design each endpoint by answering four questions:

1. Who calls this, and how often?
2. Is it safe to retry?
3. What does it return when the underlying work is slow?
4. What is the worst-case response size?

The fourth question is the one candidates skip and the one that kills systems — an endpoint that returns "all of a user's orders" is fine for two years and then someone has 400,000 orders.""",
                    ),
                    (
                        "How It Works",
                        """### Style: REST, RPC, GraphQL

| | REST | gRPC / RPC | GraphQL |
| --- | --- | --- | --- |
| Shape | Resources and verbs | Methods | One endpoint, client-specified query |
| Best for | Public APIs, CRUD, caching | Internal service-to-service | Aggregating many resources for varied clients |
| Caching | Excellent, HTTP-native | Manual | Hard — POST bodies, per-query variance |
| Typing | Schema optional | Strong, code-generated | Strong |
| Cost | Over/under-fetching | Browser support, tooling | Server complexity, query cost control |

A defensible default: REST at the edge for cacheability and simplicity, gRPC between internal services for performance and typed contracts, GraphQL only when many heterogeneous clients need different slices of the same graph — and then with query depth limits and cost analysis, because an unbounded GraphQL endpoint is a self-service denial-of-service tool.

### Designing a write endpoint

Take link creation:

`POST /v1/links` with body `{url, alias?, expires_at?}` returning `201` and `{code, short_url, created_at}`.

Decisions embedded in that one line: versioned path, resource plural, creation returns the created representation, optional fields are genuinely optional, and the response gives the client everything it needs without a follow-up GET.

Now make it retry-safe. `POST` is not idempotent, so add a header: `Idempotency-Key: <client-generated-uuid>`. The server stores the key with the result for 24 hours; a repeat with the same key returns the original response rather than creating a second link. This is how payment APIs work and it is the expected answer whenever an interviewer asks "what if the client retries?".

### Pagination

Never return an unbounded list.

| | Offset / page | Cursor / keyset |
| --- | --- | --- |
| Query | `LIMIT 20 OFFSET 10000` | `WHERE id < ? LIMIT 20` |
| Cost at depth | Grows linearly — the database walks and discards | Constant |
| Stability | Items shift when data changes; duplicates and skips | Stable |
| Jump to page 500 | Possible | Not possible |
| Use for | Small admin tables | Everything user-facing |

Cursor pagination is the correct answer for feeds, message history, logs, and anything that grows. The cursor should be opaque — base64 of `(sort_key, tie_breaker_id)` — so you can change the underlying ordering later.

### Long-running work

If an operation takes more than a second or two, do not hold the request open:

1. `POST /v1/videos` returns `202 Accepted` with `{job_id, status_url}`.
2. Work happens on a queue.
3. The client polls `GET /v1/jobs/{id}` or receives a webhook or SSE event.

This is the API-level signature of an async pipeline, and stating it early makes the queue on your diagram obviously necessary rather than decorative.

### Versioning

- **URI versioning** (`/v1/`) — visible, trivially routable, the usual choice for public APIs.
- **Header versioning** — cleaner URLs, harder to debug and cache.
- **No breaking changes** — additive-only evolution. The most disciplined option and how most large internal APIs actually work.

The practical rule: adding an optional field is safe; removing a field, changing a type, or changing a default is not. Clients you do not control never upgrade.

### Errors

Return a structured, machine-readable body: a stable `code`, a human `message`, and a `request_id` the client can quote in a support ticket. Use status codes honestly — `429` with `Retry-After` for limits, `409` for conflicts, `422` for validation, `503` when shedding load. Clients build retry logic off status codes; lying about them produces retry storms.""",
                    ),
                    (
                        "Design Decisions",
                        """**Chatty vs chunky.** Many small endpoints are clean and cost round trips; one aggregate endpoint is fast and couples clients to a composite shape. For mobile, chunkier wins — round trips are expensive on cellular networks. Internally, chattier is fine.

**Who owns aggregation?** Either a BFF (backend for frontend) per client type, or a gateway that composes. Both beat asking the mobile client to make eleven calls.

**Field filtering.** A query parameter naming the fields you want: `?fields=id,title` reduces payloads cheaply and is much simpler than GraphQL when that is all you need.

**Bulk endpoints.** A `POST /v1/items/batch` that accepts 100 items turns 100 round trips into one — but now you need partial-failure semantics: return per-item status rather than failing the whole batch.

**Consistency knobs.** Letting a caller pass `consistency=strong` on a read is a powerful pattern: most reads go to replicas, and the few that must be fresh say so.""",
                    ),
                    (
                        "Example",
                        """A payment API, designed for a world where the network drops.

- `POST /v1/payments` with `Idempotency-Key` header, body `{amount, currency, source, reference}`. Returns `201` with `{payment_id, status: "pending"}`.
- A retry with the same key returns the same `payment_id` and status, never a second charge.
- `GET /v1/payments/{id}` is the authoritative status. The client polls or subscribes to a webhook.
- A webhook delivers `payment.succeeded` at least once, signed, with an event id so the receiver can deduplicate.
- `GET /v1/payments?cursor=...&limit=50` is cursor-paginated because merchants accumulate millions of rows.

Every one of those decisions exists because the network is unreliable. That is the point to make out loud: API design in distributed systems is mostly about what happens on the second attempt.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Defining the boundary in the SHAPE step of a design interview
- Public developer APIs where compatibility is a contract
- Internal service contracts where typed RPC and evolution rules matter
- Mobile clients where round trips and payload size dominate""",
                    ),
                    (
                        "Trade-offs",
                        """- **REST vs gRPC.** REST is cacheable, debuggable and universal; gRPC is faster, typed, and streams well but is awkward from browsers and through proxies.
- **GraphQL flexibility vs server control.** Clients get exactly what they want, and you inherit query cost control, caching difficulty and N+1 resolution problems.
- **Cursor vs offset.** Cursor is correct and scalable; offset gives users page numbers, which some products require.
- **Idempotency keys.** They make retries safe and require storing keys with responses, plus a TTL and a concurrency guard for simultaneous duplicates.
- **Versioning vs additive evolution.** Versions are simple to reason about and multiply maintenance; additive-only avoids that and constrains design forever.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Unbounded list endpoints** that work until one account has a million rows, then time out and take the database with them.
- **Offset pagination on a large table**, where page 5,000 is a full scan.
- **Retried POSTs creating duplicates** because there is no idempotency key.
- **Chatty mobile APIs** that need fifteen calls to render a screen, so the app is slow on every non-ideal network.
- **Breaking changes shipped as non-breaking**, such as tightening a field's type or changing a default.
- **Error bodies that are HTML or free text**, which clients cannot branch on, so they retry everything.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What happens if the client retries this POST?"** — Idempotency key, stored result, same response returned. Then: what if two identical requests arrive concurrently? Answer: a unique constraint on the key and one loses, returning the winner's result.
- **"How do you paginate a feed with 10 million items?"** — Cursor, opaque, on an indexed sort key, with the tie-breaker included.
- **"How do you change this API without breaking clients?"** — Additive fields, new version for breaking changes, deprecation window, usage metrics per client to know when it is safe.
- **"This endpoint got slow. How would you find out why?"** — Per-endpoint latency percentiles, downstream call breakdown, payload size distribution — and check whether one caller changed their usage pattern.
- **"How do you stop one client from overwhelming the API?"** — Per-key rate limits at the gateway, quotas, and pagination limits enforced server-side rather than trusted from the client.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Designing the database schema first and exposing it as the API
- No pagination, or offset pagination on growing datasets
- Non-idempotent writes with no retry story
- Overloading `200 OK` with an error body
- Inventing a new versioning scheme instead of using a boring one
- Not stating whether an operation is synchronous or asynchronous""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the API for a file storage product. Cover: upload (including files larger than a request body), download, listing a folder with a million files, sharing a file with another user, and deleting.

For each endpoint give the method, path, key request and response fields, and one line on failure behaviour. The upload endpoint should end up as a pre-signed URL flow rather than streaming through your API — if it does not, ask what happens to your service when a thousand users upload 5 GB files simultaneously.""",
                    ),
                    (
                        "Interview Tip",
                        """Write two or three endpoints concretely, with a real body, on the board. It takes ninety seconds and it makes every later discussion — caching, idempotency, pagination, async — concrete instead of abstract.""",
                    ),
                ],
                [
                    "Design the API before the schema; the contract constrains everything behind it.",
                    "Every write needs a retry story, which usually means an idempotency key.",
                    "Cursor pagination is the default for anything that grows; offset is for small admin tables.",
                    "Operations longer than a second or two return 202 with a job id, which is what makes the queue necessary.",
                ],
                [
                    "How do you make a POST endpoint safe to retry?",
                    "Cursor versus offset pagination — when does offset break?",
                    "How would you evolve this API without breaking existing clients?",
                    "When would you choose gRPC or GraphQL over REST?",
                ],
            ),
        ],
    )


def _load_balancing_topic() -> dict:
    return _sd_topic(
        "load-balancing",
        "Load Balancing, Proxies, and Gateways",
        "How traffic is distributed, where cross-cutting concerns live, and what happens when the thing in front of everything fails.",
        "MEDIUM",
        7,
        [
            SD(
                "load-balancing",
                "Load Balancing",
                "The first component you add after one server stops being enough — and the one that decides how failure is handled.",
                13,
                "A load balancer spreads requests across a pool of servers, removes unhealthy ones, and gives you a single stable address in front of a changing fleet. It is the component that makes horizontal scaling possible, and it is also where most of your failure handling actually happens: health checks, draining, retries, and timeouts all live here or nowhere.",
                [
                    (
                        "Why It Matters",
                        """Everything downstream depends on the load balancer doing three jobs correctly:

1. **Distribution** — no node gets disproportionate load.
2. **Health** — dead or degraded nodes stop receiving traffic quickly.
3. **Draining** — nodes being removed finish their in-flight work.

Get health checks wrong and you route traffic into a black hole. Get draining wrong and every deploy drops requests. Both are far more common causes of user-visible errors than any algorithm choice.""",
                    ),
                    (
                        "Mental Model",
                        """Client → Load balancer → Healthy subset of the pool

Two layers, and the distinction matters in interviews:

| | L4 (transport) | L7 (application) |
| --- | --- | --- |
| Sees | IP, port, TCP | HTTP method, path, headers, cookies |
| Can do | Fast connection forwarding | Routing by path, header rewriting, TLS termination, retries, rate limits |
| Cost | Very low, millions of connections | Higher CPU, must parse requests |
| Use for | Raw throughput, non-HTTP protocols, DDoS absorption | Anything where routing depends on content |

Most real systems run both: an L4 layer at the edge for volume, an L7 layer behind it for routing and policy.""",
                    ),
                    (
                        "How It Works",
                        """:::viz load-balancing {"algorithm": "round_robin", "servers": 2, "durations": [4, 1, 1, 4, 1, 1]}

### Algorithms

| Algorithm | Behaviour | When it is right |
| --- | --- | --- |
| Round robin | Next server in order | Uniform requests, uniform servers |
| Weighted round robin | Proportional to capacity | Heterogeneous instance sizes |
| Least connections | Fewest active connections | Variable request durations — the best general default |
| Least response time | Lowest latency plus connections | Latency-sensitive services |
| Consistent hashing | Same key to the same node | Cache affinity, sharded stateful tiers |
| Power of two choices | Sample two at random, pick the less loaded | Large fleets — nearly optimal without global state |

For a stateless HTTP service, least connections is the sensible default. Round robin is fine and fails badly when request cost varies — one node gets three slow requests and keeps receiving new ones because it is "next".

Power of two random choices is worth knowing by name: it gets close to least-connections quality without any node needing global knowledge, which is why it appears in large-scale proxies.

### Health checks

- **Passive** — observe real traffic; eject a node after N consecutive failures. Fast and free, but it needs failing requests to detect a problem.
- **Active** — poll an endpoint on a schedule. Detects problems before users do, and costs a little traffic.

The important distinction that candidates miss:

- **Liveness** — is the process alive? Failing liveness means restart me.
- **Readiness** — can it serve traffic right now? Failing readiness means stop sending me requests but do not kill me.

A node with an exhausted connection pool or a cold cache should fail readiness, not liveness. And a health check that just returns `200 OK` from a static handler tells you nothing — it should exercise the critical dependencies, but shallowly, because a health check that calls the database means a database blip marks your entire fleet unhealthy simultaneously.

### Draining

When a node is removed — deploy, scale-in, spot reclamation — the sequence must be:

1. Node fails readiness.
2. Load balancer stops sending new requests.
3. In-flight requests complete, up to a drain timeout.
4. Process exits.

Without this, every deploy produces a burst of 502s. This is one of the most common real-world sources of error budget consumption and it is entirely preventable.

### Where the load balancer sits

- **Global** — anycast or DNS, steering between regions.
- **Regional** — a managed L4/L7 balancer in front of the fleet.
- **Internal** — between services, often client-side (the caller picks from a service registry) or via a service mesh sidecar.

Client-side load balancing removes a network hop and a failure domain, at the cost of pushing logic into every client. It is the standard approach inside gRPC-based architectures.

### The load balancer itself

It is a single point of failure unless you design otherwise. Real answers: multiple instances behind an anycast IP or a floating address, active-active across availability zones, and a managed service whose availability is someone else's problem. "The load balancer has redundancy" is a weak answer; naming the mechanism is a strong one.""",
                    ),
                    (
                        "Design Decisions",
                        """**Where do you retry?** At the load balancer, retries are cheap to configure and dangerous: a retry on a timeout can double load exactly when the fleet is struggling. Safe rule: retry only idempotent requests, only on connection failures and `503`, with a retry budget (for example, retries capped at 10% of requests) so retries cannot amplify an outage.

**Where do you terminate TLS?** Usually at the L7 layer, so that certificate management is centralised and the proxy can route on content.

**Sticky sessions?** Only if something genuinely cannot be made stateless. Prefer an external session store. If you must, use a cookie-based affinity rather than IP hashing, because corporate NAT puts thousands of users behind one IP.

**How aggressive should health checks be?** Tension: fast detection versus flapping. Typical shape is a 2–5 second interval, 2–3 consecutive failures to eject, and more consecutive successes to reinstate.""",
                    ),
                    (
                        "Example",
                        """A service runs 30 nodes behind an L7 balancer. One node's disk fills; the process stays up but every request returns 500 in 3 ms.

With passive health checks, the node is ejected after a handful of failures — but because it fails *fast*, least-connections routing sends it *more* traffic than healthy nodes in the meantime. This is a real and counter-intuitive failure mode: the fastest node is the broken one.

The fix is failure-aware ejection (outlier detection on error rate, not just connection failures) plus a readiness check that actually inspects disk and dependency health. Worth mentioning in an interview because it shows you have watched this happen.""",
                    ),
                    (
                        "Common Use Cases",
                        """- In front of any horizontally scaled stateless tier
- Blue-green and canary deploys via weighted pools
- Splitting traffic by path to different services
- Absorbing and rate-limiting abusive traffic at the edge""",
                    ),
                    (
                        "Trade-offs",
                        """- **L4 vs L7.** L4 is faster and blind; L7 is smart and costs CPU and latency. Content-based routing requires L7.
- **Aggressive health checks vs flapping.** Fast ejection risks removing healthy nodes during a transient blip, which can cascade if it removes enough capacity.
- **Retries at the proxy.** Great for transient failures, catastrophic during overload without a retry budget.
- **Sticky sessions.** Simplifies legacy apps, breaks even load distribution and graceful deploys.
- **Managed vs self-hosted.** Managed balancers hide real complexity and limit control over algorithms, timeouts and connection behaviour.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Fast-failing nodes attracting traffic** under least-connections or least-response-time.
- **Health check that is too shallow** — returns 200 while the app cannot serve.
- **Health check that is too deep** — checks the shared database, so one database blip marks the whole fleet unhealthy and the balancer takes everything out of rotation at once.
- **No connection draining**, so deploys drop requests.
- **Retry amplification** turning a degraded backend into a dead one.
- **Idle timeout mismatch**, where the proxy closes a connection the client still believes is open, producing sporadic 502s.
- **Uneven load from long-lived connections**, so a newly added node sits idle.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What happens when a server dies?"** — Health check fails, ejected within a few seconds, in-flight requests fail and are retried if idempotent, capacity drops by 1/N so the remaining nodes must have headroom.
- **"What if the load balancer itself dies?"** — Name the redundancy mechanism: multiple instances, anycast or floating IP, multi-AZ.
- **"How do you deploy without downtime?"** — Readiness, draining, rolling batches, and a canary with a weighted pool.
- **"Why not round robin?"** — Because request cost varies; least connections tracks actual load.
- **"All your nodes report healthy but users see errors. What now?"** — The health check does not exercise the failing path. Check at the edge with real user journeys, not liveness probes.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating the load balancer as a box that needs no design
- Health checks that return a hardcoded 200
- Health checks that depend on the shared database, creating correlated ejection
- Retrying non-idempotent requests
- Forgetting connection draining
- Assuming the load balancer is infinitely available and never saying how it is made redundant""",
                    ),
                    (
                        "Mini Design Exercise",
                        """You run 50 nodes. A bad deploy makes 10 of them return 500 in 2 ms while remaining "up".

1. Which load balancing algorithms make this worse, and why?
2. What signal would correctly eject them?
3. If ejecting all 10 leaves insufficient capacity, what should the system do instead of ejecting?

Part 3 is the interesting one: the correct answer involves a floor on the healthy pool size (never eject below N% of the fleet) and shedding load rather than routing everything to a fleet that cannot take it.""",
                    ),
                    (
                        "Interview Tip",
                        """Say "stateless application tier behind a load balancer" and then immediately cover health checks, draining, and what happens when a node dies. Those three sentences cover most of what interviewers want from this component, and very few candidates volunteer them.""",
                    ),
                ],
                [
                    "Least connections is the sensible default; round robin fails when request cost varies.",
                    "Distinguish liveness from readiness — readiness failure means drain, not restart.",
                    "Connection draining is what makes deploys invisible to users.",
                    "Proxy-level retries need a retry budget, or they amplify a degradation into an outage.",
                ],
                [
                    "What is the difference between L4 and L7 load balancing?",
                    "What happens when a node starts failing fast, and which algorithms make it worse?",
                    "How do you deploy a new version with no dropped requests?",
                    "What makes the load balancer itself highly available?",
                ],
            ),
            SD(
                "sd-proxies-and-gateways",
                "Reverse Proxies and API Gateways",
                "Where cross-cutting concerns live: authentication, rate limiting, routing, and everything you do not want in every service.",
                11,
                "Once you have more than one service, a set of concerns appears that belongs to none of them: who is this caller, are they allowed, are they over their quota, which version should they hit, and how do we see what happened. An API gateway is the layer that owns those, and where you draw its boundary is a real architectural decision with real costs.",
                [
                    (
                        "Why It Matters",
                        """Without a gateway, every service reimplements authentication, rate limiting, logging, and CORS — inconsistently, and with security bugs in the least-maintained one. With an overweight gateway, you have recreated a monolith with worse deployment properties and a single team blocking everyone else's releases.

Interviewers use this topic to check whether you can distinguish a proxy from a gateway from a service mesh, and whether you understand that centralising something makes it both consistent and critical.""",
                    ),
                    (
                        "Mental Model",
                        """Three overlapping things with different jobs.

| Layer | Direction | Primary job |
| --- | --- | --- |
| **Reverse proxy** | North-south | Terminate TLS, route, cache, compress, buffer |
| **API gateway** | North-south | Everything a proxy does, plus auth, quotas, transformation, per-client policy |
| **Service mesh** | East-west | mTLS, retries, timeouts, circuit breaking, telemetry between internal services |

A forward proxy sits in front of *clients* (corporate egress filtering). A reverse proxy sits in front of *servers*. Interviewers occasionally ask for the distinction.""",
                    ),
                    (
                        "How It Works",
                        """### What a gateway does

Client → Gateway → Services

Requests pass through an ordered chain, and being able to name it in order is a strong signal:

1. **TLS termination**
2. **Request validation** — size limits, malformed input, schema
3. **Authentication** — verify the token or key, resolve identity
4. **Authorisation** — coarse-grained: is this client allowed to call this route at all
5. **Rate limiting and quotas** — per key, per route, per tenant
6. **Routing** — path, header, or version to the right upstream
7. **Transformation** — protocol translation, response shaping, aggregation
8. **Observability** — assign a request id, emit metrics and trace spans
9. **Response handling** — caching, compression, error normalisation

Fine-grained authorisation ("can this user edit *this* document?") stays in the service, because only the service knows the resource. Coarse-grained authorisation belongs at the gateway. Confusing the two is a common design error in both directions.

### Backend for frontend

When clients differ substantially — a web app, an iOS app, a partner integration — a single API serves all of them badly. The BFF pattern gives each client type its own thin aggregation layer, owned by that client's team, calling the same internal services.

The cost is duplication across BFFs; the benefit is that the mobile team can change their payload shape without a cross-team negotiation.

### Service mesh

For service-to-service traffic, a sidecar proxy next to each instance provides mTLS, retries, timeouts, circuit breaking, load balancing and telemetry without application code. You get consistent policy and per-hop observability; you pay in latency (an extra hop each way), memory per pod, and a substantial operational learning curve.

The honest interview position: a mesh is valuable at dozens of services and several teams. Below that it is usually more machinery than problem.

### The gateway as a failure domain

Everything goes through it, so:

- It must be horizontally scaled and multi-AZ.
- Its own latency is added to every request — budget 1–5 ms, and be suspicious of plugins that call external systems synchronously.
- Configuration is a deploy. A bad route or auth rule takes down everything, so gateway config needs the same review, staging and rollback as code.
- Auth dependencies must be cached. If the gateway calls an identity service on every request, that service's availability is now your ceiling.""",
                    ),
                    (
                        "Design Decisions",
                        """**How much logic belongs in the gateway?** The test: is it identical for every service and independent of business meaning? Auth, rate limiting, request ids, TLS — yes. Anything that needs to know what an "order" is — no.

**Token validation: local or remote?** Locally verifying a signed JWT is fast and avoids a dependency, but revocation is delayed until expiry. Remote introspection is authoritative and puts the identity service on every request path. Common compromise: local verification with short-lived tokens plus a cached revocation list.

**Aggregation at the gateway?** Tempting and usually a mistake in the general gateway — it becomes business logic in an infrastructure component. Put it in a BFF that a product team owns.

**One gateway or several?** Separate gateways for public, partner, and internal traffic isolate blast radius and let each have different policy defaults.""",
                    ),
                    (
                        "Example",
                        """A SaaS product exposes a public API. The gateway chain, concretely:

- Terminates TLS and enforces a 1 MB body limit.
- Validates the API key, resolves it to a tenant, and attaches `tenant_id` as a trusted internal header — while stripping that header if the client tried to send it. (Forgetting to strip client-supplied trust headers is a classic real vulnerability.)
- Applies a per-tenant token bucket in Redis: 1,000 requests per minute, burst 100. Over the limit, `429` with `Retry-After`.
- Routes `/v2/*` to the new service, `/v1/*` to the legacy one, and mirrors 1% of `/v1` traffic to `/v2` for shadow testing.
- Attaches a request id, starts a trace span, and records latency and status per route per tenant.

The services behind it trust `tenant_id` and implement only resource-level authorisation. Adding a new service means adding a route, not reimplementing five policies.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Public and partner APIs with per-client quotas
- Migrating from a monolith: the gateway routes some paths to the new service and the rest to the old one — the strangler pattern
- Multi-tenant SaaS, where tenant resolution and isolation belong at the edge
- Protocol translation, such as REST at the edge and gRPC internally""",
                    ),
                    (
                        "Trade-offs",
                        """- **Centralisation vs coupling.** Consistent policy in one place, and one team can become a bottleneck for everyone's releases.
- **Feature-rich gateway vs latency.** Every plugin adds milliseconds to every request. Synchronous external calls in the chain are the usual culprit for gateway p99 problems.
- **Gateway as single point of failure.** Mitigated by scale and multi-AZ, never eliminated. Its config is a global blast radius.
- **Mesh vs direct calls.** Uniform mTLS, retries and telemetry, against an extra hop and a lot of operational surface.
- **BFF duplication vs client fit.** Multiple BFFs repeat work; one shared API serves nobody especially well.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Gateway saturation** during a traffic spike: it is the first thing to fall over and it takes everything with it.
- **Auth dependency outage** making every request fail, because token validation was not cached or local.
- **Bad config rollout** with global blast radius — a wrong route or a misconfigured rate limit.
- **Trusting client-supplied internal headers** that the gateway forgot to strip.
- **Plugin latency creep** where each addition is 2 ms and nobody notices until p99 has doubled.
- **Timeout misalignment** — the gateway times out at 30 s, the service at 60 s, so the service keeps doing work nobody is waiting for.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why have a gateway at all?"** — Cross-cutting concerns implemented once, consistently, and enforced before traffic reaches services.
- **"What happens when the gateway is down?"** — Everything is down. So: multiple instances, multi-AZ, config staged and rollback-able, and health independent of any single backend.
- **"Where do you enforce authorisation?"** — Coarse at the gateway, fine-grained in the service. Explain why the split exists.
- **"Do you need a service mesh?"** — Only above a threshold of services and teams. Saying "not yet, and here is the threshold" is a strong answer.
- **"How do you migrate a monolith behind this?"** — Strangler: route one path at a time, mirror traffic, compare, then cut over.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Putting business logic in the gateway
- Treating gateway config as not-code: unreviewed, unstaged, unrollback-able
- Calling the identity service synchronously on every request
- Ignoring the gateway's own latency budget
- Confusing an API gateway with a service mesh
- Forgetting to strip inbound headers the gateway itself sets""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the gateway layer for a multi-tenant API with three client types: a web app with session cookies, mobile apps with OAuth tokens, and partners with long-lived API keys.

Specify the chain order, where each identity type is resolved, how per-tenant rate limits are enforced across many gateway instances, and what happens to each client type when the identity service is unavailable for five minutes. The last part is the real question — the three answers should not be the same.""",
                    ),
                    (
                        "Interview Tip",
                        """When you draw the gateway, say the chain out loud in order: "TLS, validation, authn, coarse authz, rate limit, route, observability." Ten seconds, and it demonstrates you know what the box contains rather than that you know its name.""",
                    ),
                ],
                [
                    "A gateway owns concerns identical across services: TLS, authn, quotas, routing, request ids.",
                    "Coarse authorisation belongs at the gateway; resource-level authorisation belongs in the service.",
                    "The gateway is a global failure domain — its config needs the same rigour as code.",
                    "A service mesh handles east-west traffic and is justified by service count, not by fashion.",
                ],
                [
                    "What belongs in an API gateway and what does not?",
                    "What happens to your system when the gateway or its auth dependency fails?",
                    "When is a service mesh worth its operational cost?",
                    "How would you use a gateway to migrate away from a monolith?",
                ],
            ),
        ],
    )


def _caching_topic() -> dict:
    return _sd_topic(
        "caching",
        "Caching",
        "The highest-leverage component in most designs, and the one with the most ways to be wrong: patterns, invalidation, stampedes, hot keys, and what happens when Redis dies.",
        "MEDIUM",
        8,
        [
            SD(
                "caching",
                "Caching: Why, What, and Where",
                "How to reason about a cache instead of just adding one to the diagram.",
                16,
                "A cache trades memory and correctness for latency and load. That sentence contains the whole topic: you are buying speed with staleness, and the engineering is in deciding exactly how much staleness you are buying, for which data, and what happens when the cache is not there.",
                [
                    (
                        "Why It Matters",
                        """Caching is the single most common component in system design interviews and the one candidates handle most shallowly. "We'll add Redis to make reads fast" is the answer that gets four follow-up questions, all of which are the actual interview:

- What exactly are you caching, at what granularity?
- How does a cached value become correct again after a write?
- What happens at a 0% hit rate — can the database survive?
- What happens to the hottest key when it expires?
- What does the user see when Redis is unreachable?

A candidate who has thought about these gives a two-minute answer. One who has not gives five one-line answers that each create a new problem.

There is also a non-obvious reason caching matters: it is usually how you avoid sharding. Sharding is expensive, hard to reverse, and complicates every query. A cache that removes 95% of read load buys you years before you need to partition, and saying that out loud shows you understand the relationship between the components.""",
                    ),
                    (
                        "Mental Model",
                        """A cache is a **bet that the same thing will be asked for again soon**.

Two numbers determine whether the bet pays:

- **Hit ratio** — what fraction of requests are served from cache.
- **Cost ratio** — how much cheaper a hit is than a miss.

Effective load on the origin = requests × (1 − hit ratio)

At a 95% hit rate, 10,000 QPS becomes 500 QPS on the database — a twentyfold reduction. At 50%, it becomes 5,000 QPS, and you have added a component, a failure mode, and a consistency problem for a 2x improvement. This arithmetic, said out loud, is what separates "we add a cache" from a justified decision.

The hit rate depends almost entirely on whether access is skewed. Most real workloads are: a small fraction of items get the overwhelming majority of requests. If access is uniform across a huge key space, caching does very little and you should say so.""",
                    ),
                    (
                        "How It Works",
                        """:::viz cache-aside {"ops": ["R:user1", "R:user1", "R:user2", "R:user3", "W:user1", "R:user1", "R:user2"], "capacity": 2, "writePolicy": "invalidate"}

### Where caches live

Every layer can cache, and they compound.

| Layer | Example | TTL | Invalidation | Notes |
| --- | --- | --- | --- | --- |
| Client | Browser cache, app storage | Minutes to days | Effectively impossible | Cheapest; you cannot recall it |
| CDN / edge | Static assets, cached API responses | Seconds to days | Purge API | Removes the request entirely |
| Reverse proxy | Nginx, Varnish | Seconds | Purge | Per-region shared cache |
| Application memory | Local map, Caffeine | Seconds | Per-node, hard | No network hop; per-node staleness |
| Distributed cache | Redis, Memcached | Minutes to hours | Direct delete | The one people mean by "cache" |
| Database | Buffer pool, query cache | Automatic | Automatic | Already working; not your design |
| Materialised view | Precomputed table | Minutes | Refresh job | A cache you can query |

An important framing: **the cheapest request is the one that never reaches you.** Before adding Redis, ask whether the CDN or the client could have served it. Candidates skip straight to the distributed cache and miss the two cheaper layers above it.

### What to cache

Rank candidates by (frequency of reads) × (cost to compute) × (tolerance for staleness).

Good candidates:

- Expensive derived data: a rendered feed, an aggregation, a search result page
- Hot immutable objects: a video's metadata, a product record, a short link target
- Session and auth data: validated tokens, permission sets
- Results of calls to slow external services

Poor candidates:

- Data read once per user per year — no reuse, no hit rate
- Rapidly changing values where any staleness is a bug, such as an account balance shown before a transfer
- Very large objects with low reuse, which simply evict everything valuable
- Data whose authorisation varies per requester, unless the cache key includes the requester

### Granularity

This is an underrated decision.

- **Object-level** (`user:123`) — high reuse, composable, more round trips.
- **Fragment-level** (a rendered feed page) — fewer lookups, lower reuse, harder to invalidate.
- **Full-response** — fastest, invalidated by almost any change.

Coarse caching gives better latency and worse hit rates and invalidation. Object-level caching with a small number of parallel fetches is usually the right default.

### Patterns

**Cache-aside (lazy loading)** — the default, and what you should propose unless asked otherwise.

1. Read the cache. On a hit, return.
2. On a miss, read the database.
3. Write the value to the cache with a TTL.
4. Return.

Writes go to the database and then *delete* the cache key (not update it — see the failure modes lesson).

Properties: only requested data is cached, the cache can be lost without losing data, and a miss costs one extra round trip. The staleness window is the TTL, or until the next write invalidates.

**Read-through** — the same behaviour, but the cache library owns the database fetch. Cleaner application code, and your cache client is now in the data path.

**Write-through** — write to the cache and the database synchronously, in that order or the reverse.

Properties: the cache is always warm and consistent with the database for keys that exist. Writes are slower (two systems), and you cache data that may never be read, wasting memory. Good for data that is written once and read many times immediately after.

**Write-behind (write-back)** — write to the cache, acknowledge, flush to the database asynchronously.

Properties: extremely fast writes, absorbs spikes, and you can lose acknowledged data if the cache dies before the flush. Legitimate for counters, view counts, and metrics where losing a few seconds of increments is acceptable. Never for money.

**Refresh-ahead** — proactively refresh popular keys before they expire, so users never take the miss. Effective for a small, known-hot set; wasteful if you guess wrong about what is hot.

| Pattern | Write cost | Read after write | Data loss risk | Use for |
| --- | --- | --- | --- | --- |
| Cache-aside | Low | Miss, then fill | None | General purpose default |
| Read-through | Low | Miss, then fill | None | Same, with library-managed fetch |
| Write-through | Higher | Hit | None | Read-heavy right after write |
| Write-behind | Lowest | Hit | Real | Counters, metrics, tolerant data |
| Refresh-ahead | Background | Hit | None | Small hot set, predictable |

### Sizing

Cache size = items to cache × average size × overhead

If the working set does not fit, the eviction rate rises and the hit ratio collapses non-linearly. Estimate the hot set using the skew: often 20% of items serve 80% of traffic, so caching that 20% is most of the benefit at a fraction of the memory. Add 20–30% for Redis overhead and fragmentation, and leave headroom so you are not evicting under normal load.""",
                    ),
                    (
                        "Design Decisions",
                        """**Should the cache be local, shared, or both?** A two-tier cache — a few seconds of in-process cache in front of Redis — removes a network hop for the hottest keys and protects Redis from hot-key concentration. The cost is per-node staleness bounded by the local TTL. This is the standard answer for extremely hot, small, tolerant data such as feature flags and configuration.

**What TTL?** Derive it from the business tolerance, not from habit. "How wrong can this be before a user complains?" A product price: seconds. A user's display name: minutes. A video's duration: hours, because it never changes. State the reasoning; the number itself is not the point.

**Do you cache negative results?** Yes, usually, and briefly. Without negative caching, a flood of requests for non-existent keys passes straight through to the database — which is exactly how cache penetration attacks work. Cache "not found" for a short TTL, or use a Bloom filter to reject impossible keys cheaply.

**Redis or Memcached?** Memcached is simpler, multi-threaded, and purely a cache. Redis has data structures, persistence, replication, pub/sub, Lua scripting, and cluster mode — which is why it is usually chosen even when only strings are needed. If an interviewer asks "why Redis?", the honest answer is: the sorted sets and atomic operations solve adjacent problems (rate limiting, leaderboards, queues, distributed locks) and one operational component is better than three. Do not say "because it is fast".

**Does the cache need to be durable?** Normally no, by definition — but a cold start after a total cache loss can kill the database. Options: Redis persistence for faster recovery, warming on startup, or explicit load shedding during the warm-up window.""",
                    ),
                    (
                        "Example",
                        """A product catalogue serves 20,000 reads per second across 2 million products. The database does 3 ms indexed reads and tops out around 15,000 QPS.

Access is heavily skewed: the top 50,000 products account for about 90% of views.

Design: cache-aside in Redis, key `product:{id}`, value the serialised product JSON at roughly 2 KB, TTL 10 minutes, and explicit invalidation on the product-updated event. Cache size: 50,000 × 2 KB ≈ 100 MB for the hot set; cache 500,000 for headroom at about 1 GB, which is trivially affordable.

Result: roughly 90–95% hit rate, so database read load drops to 1,000–2,000 QPS, comfortably inside capacity with room for growth. The product page p99 improves from 3–10 ms to under 1 ms for hits.

Now the part that matters in the interview: **what if Redis goes down?** 20,000 QPS lands on a database that handles 15,000. Without a plan this is an outage. So: Redis runs replicated with automatic failover; the client has a short timeout (10–20 ms) and treats a cache failure as a miss rather than an error; and there is a concurrency limiter on database reads so that when the cache is gone, the database degrades gracefully — some requests get a 503 or a stale fallback — instead of collapsing and taking writes down with it.

That last paragraph is the answer that distinguishes candidates.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Read-heavy endpoints where the same data is requested repeatedly
- Expensive computations: feeds, aggregations, recommendations, search results
- Session and permission lookups on every authenticated request
- Rate limiter counters, leaderboards, and other small hot state
- Buffering counters that are too write-heavy for the database""",
                    ),
                    (
                        "Trade-offs",
                        """- **Latency and load versus staleness.** This is the core trade. Every cached read may be wrong by up to the TTL. Decide per data type, not globally.
- **Memory cost versus hit rate.** The last few percent of hit rate is disproportionately expensive because the tail of the distribution is enormous.
- **An extra component versus fewer moving parts.** The cache adds a dependency, a failure mode, an ops burden, and a new class of bug — inconsistency between two copies of the truth.
- **Local versus distributed.** Local is faster with no hop and inconsistent across nodes; distributed is consistent and costs a round trip and a shared failure domain.
- **Caching versus fixing the query.** Sometimes an index, a denormalised column, or a materialised view removes the need for the cache entirely, with no staleness. Interviewers appreciate the candidate who asks whether the read is slow for a fixable reason.

### When caching makes the system worse

Worth saying explicitly, because volunteering it is a strong signal:

- **Low reuse.** Uniform access across a huge key space means you pay for the cache and gain a rounding error.
- **Write-heavy data.** If every item is written more often than read, the cache is invalidated before it is used and you have added cost and complexity.
- **Correctness-critical reads.** A cached authorisation decision that outlives a permission revocation is a security bug, not a performance win.
- **Hidden capacity.** The cache masks that the database is undersized, so you discover the real capacity during an incident, at the worst possible time.
- **Two sources of truth.** Any time the cache can be written independently of the database, you will eventually serve data that never existed.""",
                    ),
                    (
                        "Common Failure Modes",
                        """The detailed treatment is in the next lesson, but name them here:

- **Stampede** — a hot key expires and thousands of concurrent requests all miss and hit the database simultaneously.
- **Hot key** — one key gets so much traffic that a single cache node or connection saturates.
- **Cold start** — cache is empty after a restart or failover and full read load lands on the database.
- **Penetration** — requests for keys that do not exist bypass the cache every time.
- **Inconsistency** — a race between a write and a concurrent miss-fill leaves a stale value cached indefinitely.
- **Eviction of the wrong things** — one large low-value object evicts thousands of hot small ones.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why Redis?"** — Not "because it's fast". Because it is an in-memory store with the data structures this design needs (sorted sets for the leaderboard, atomic counters for rate limits), it supports replication and failover, and using one component for several of these problems is less operational surface than three. Then name the trade-off: it is another stateful system to run, and cluster mode restricts multi-key operations to the same slot.
- **"What is your cache hit rate, and how do you know?"** — Instrument it. Hit rate, miss rate, eviction rate, and p99 latency for hits and misses separately. An uninstrumented cache is an assumption.
- **"What happens if Redis goes down?"** — Cover all three: does the system stay up (fail open to the database), can the database survive the load (usually no — so limit concurrency or shed), and how does it recover (failover time, cold cache, warm-up).
- **"How does a write make the cache correct again?"** — Delete the key, do not update it, and explain the race that motivates that choice.
- **"How does caching change database load?"** — Give the arithmetic: load becomes requests × (1 − hit rate), and point out that the database must still be sized for something well above that, because the hit rate is not a guarantee.
- **"When would you not add a cache?"** — Low reuse, write-heavy, correctness-critical, or when a fixed index solves the real problem.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Adding a cache without stating what is cached, at what granularity, or with what TTL
- Sizing the database for the cached load, so a cache outage is automatically a total outage
- Treating a high hit rate as guaranteed rather than measured
- Caching per-user authorisation decisions without including the user in the key
- Updating the cache on write instead of invalidating, creating a lost-update race
- Never mentioning what happens when the cache is unavailable""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A news site serves 50,000 requests per second. Article content changes rarely. The homepage changes every few minutes. Each page shows a personalised "recommended for you" strip and a live comment count.

Decide, for each of the four elements — article body, homepage layout, recommendations, comment count — the cache layer, granularity, TTL, and invalidation method. Then answer:

1. Which of these should not be cached in the same place as the others, and why?
2. How do you cache a page that is 95% identical for everyone but has a personalised strip?
3. The comment count is written far more often than it is read for popular articles. What is the right pattern?

The intended answers involve edge-caching the article shell, composing the personalised fragment client-side or via edge-side includes, and write-behind for the counter.""",
                    ),
                    (
                        "Interview Tip",
                        """Whenever you draw a cache, immediately say five things: what is cached, the key, the TTL, how it is invalidated, and what happens when it is down. That is fifteen seconds of speech and it pre-empts the entire follow-up sequence.""",
                    ),
                ],
                [
                    "Origin load = requests × (1 − hit ratio); say the arithmetic out loud before adding the cache.",
                    "Cache-aside with delete-on-write is the default; write-through and write-behind are for specific, nameable reasons.",
                    "Choose the TTL from how wrong the data is allowed to be, not from habit.",
                    "Size the database to survive a cache outage, or the cache is a single point of failure wearing a disguise.",
                ],
                [
                    "What exactly would you cache in this system, and at what granularity?",
                    "Compare cache-aside, write-through and write-behind, and say when each is correct.",
                    "What happens to the database when the cache is empty or unavailable?",
                    "Why Redis rather than Memcached, and what does that choice cost you?",
                    "When does adding a cache make a system worse?",
                ],
            ),
            SD(
                "sd-cache-invalidation",
                "Cache Invalidation, Stampedes, and Hot Keys",
                "The hard half of caching: keeping it correct, and keeping it from taking the database down with it.",
                15,
                "Putting data in a cache is easy. Getting it out at the right moment, surviving the instant it disappears, and handling the one key that ten thousand users want simultaneously — that is where caching designs actually fail. These are also the questions interviewers ask when they want to find the ceiling of your experience.",
                [
                    (
                        "Why It Matters",
                        """Nearly every cache-related production incident is one of five things: a stale value nobody could explain, a stampede after an expiry, a hot key saturating one node, a cold cache after a restart, or a flood of misses for keys that do not exist. Each has a standard mitigation, and knowing them by name is exactly what "has operated a cache" sounds like.""",
                    ),
                    (
                        "Mental Model",
                        """Two separate problems, often conflated.

- **Correctness** — the cached value no longer matches the truth. Solved by expiry or invalidation.
- **Load** — the cache stops absorbing traffic, momentarily or entirely. Solved by coalescing, jitter, and limits.

Write → Invalidate → Miss → Refill

Every step in that chain has a race condition, and the design is mostly about which races you choose to tolerate.""",
                    ),
                    (
                        "How It Works",
                        """### Expiry versus invalidation

**TTL-based expiry** is passive: the value is wrong for at most the TTL, then corrects itself. It is simple, self-healing, and requires no coordination between the writer and the cache. Almost everything should have a TTL as a backstop even if it is also explicitly invalidated, because explicit invalidation will eventually be missed.

**Explicit invalidation** is active: on write, delete (or update) the cached entry. Freshness is near-immediate, and you now have the hard problem: knowing every key affected by a write. Changing a product's price may affect `product:123`, `category:45:page:1`, the homepage fragment, and a search result. This is the real meaning of "cache invalidation is hard" — not the deletion, but the dependency tracking.

Three approaches to that dependency problem:

- **Key derivation** — make the cache key contain everything the value depends on, so a change produces a different key and the old one simply ages out.
- **Versioned keys** — include a version or updated-at in the key: `product:123:v7`. A write bumps the version; old entries are never read again and expire naturally. No deletion needed, no race, and slightly more memory. This is an excellent answer.
- **Tag-based invalidation** — associate keys with tags and purge by tag. Powerful, and supported by most CDNs; needs bookkeeping in a distributed cache.

### Delete, do not update

On a write, deleting the key is safer than writing the new value into the cache. Consider the race with write-on-update:

1. Request A reads the database, gets value `v1`.
2. Request B writes `v2` to the database and sets the cache to `v2`.
3. Request A, now scheduled again, sets the cache to `v1`.

The cache now holds `v1` forever. Deleting instead means the next read repopulates from the database. The race still exists in a narrower form — this is why you also keep a TTL, and why very strict systems use versioned keys or compare-and-set.

The related ordering rule: **write the database first, then invalidate the cache.** Invalidating first leaves a window where a concurrent read refills the cache with the old value from the not-yet-updated database.

For stronger guarantees, invalidate from the database's change stream (change data capture) rather than from application code. Then any writer, including a manual SQL statement, produces correct invalidation. It is more machinery and it removes an entire class of bug.

### Cache stampede (dogpile)

A popular key expires. In the microsecond after, every concurrent request for that key misses and goes to the database simultaneously. A key serving 5,000 QPS becomes 5,000 concurrent identical database queries.

Four mitigations, usually combined:

1. **Request coalescing (single-flight)** — the first miss acquires a short lock (a Redis `SET NX` with a small TTL); everyone else either waits briefly and re-reads, or is served the stale value. Only one request reaches the database.
2. **Probabilistic early expiry** — refresh the value *before* it expires, with a probability that rises as expiry approaches. Spreads refreshes over time so nothing expires under load.
3. **Stale-while-revalidate** — serve the expired value immediately and refresh it in the background. The user never waits; the data is briefly stale. This is the best default for anything where a few seconds of staleness is acceptable.
4. **TTL jitter** — never use a fixed TTL for a class of keys. If 100,000 keys were populated during a deploy with a 600-second TTL, they all expire in the same second. Use 600 seconds plus a random 0–60.

### Hot keys

One key — a celebrity's profile, a flash-sale product, a single tenant's config — receives a disproportionate share of traffic. Because a key lives on exactly one cache node, that node saturates on CPU or network while the rest of the cluster is idle. Sharding the cache does not help: hashing sends all those requests to the same shard.

Mitigations:

- **Local (in-process) cache in front** with a 1–5 second TTL. The single most effective fix: it collapses thousands of requests per node into one, and bounded staleness is usually acceptable for exactly this kind of data.
- **Key splitting** — store `hotkey:0` … `hotkey:9` with the same value and have clients read a random one. Multiplies the write and invalidation cost by 10; spreads read load across nodes.
- **Read replicas of the cache** — some Redis setups allow reads from replicas, accepting replication lag.
- **Detection** — you cannot fix what you cannot see. Track per-key request rates, at least sampled, or use Redis key-space hotspot tooling.

### Cache penetration and cold start

**Penetration**: requests for keys that do not exist never populate the cache, so every one hits the database. Malicious versions of this are a cheap attack. Fixes: cache the negative result with a short TTL, and/or put a Bloom filter in front that can cheaply prove a key was never created.

**Cold start**: after a restart, failover, or flush, the cache is empty and 100% of traffic hits the origin. This is the single most dangerous cache failure mode, because it happens at exactly the moment the system is already unstable. Fixes: warm the cache before accepting traffic, bring capacity back gradually, cap concurrent origin requests so the database degrades rather than dies, and — most importantly — never size the origin on the assumption the cache is present.

### Eviction

When memory is full, something must go.

| Policy | Behaviour | Good for |
| --- | --- | --- |
| LRU | Evict least recently used | General purpose default |
| LFU | Evict least frequently used | Stable hot sets; resists one-off scan pollution |
| FIFO | Evict oldest inserted | Rarely what you want |
| TTL / volatile | Evict only keys with a TTL | Mixed cache-and-store usage |
| Random | Evict anything | Surprisingly acceptable and cheap |

The failure to know about: **scan pollution**, where a batch job reads a million cold items and evicts the entire hot set. LFU resists this; so does routing analytical traffic away from the cache entirely.

Watch the eviction rate as a first-class metric. Rising evictions mean the working set no longer fits, and the hit rate is about to fall off a cliff.""",
                    ),
                    (
                        "Design Decisions",
                        """**How stale can this be?** Answer per data type and write it down. It determines TTL, whether stale-while-revalidate is acceptable, and whether you need explicit invalidation at all.

**Invalidate from application code or from a change stream?** Application code is simple and misses writes that bypass it. CDC is complete and adds a pipeline. For a system with multiple writers, CDC is the more defensible choice.

**Fail open or fail closed when the cache is unavailable?** Fail open (treat as a miss) for reads — but with a concurrency limit, or you have converted a cache outage into a database outage. Fail closed for things where a cache miss is not safe: a rate limiter that fails open stops limiting exactly when it is under attack, which may be worse than rejecting traffic.

**Do you need consistency between the cache and the database?** Usually you need *bounded* staleness, not consistency. If you genuinely need read-after-write for a user's own changes, the usual solution is not a stronger cache — it is routing that user's reads past the cache for a few seconds after their write.""",
                    ),
                    (
                        "Example",
                        """A social platform caches user profiles with a 5-minute TTL. A celebrity with 40 million followers changes their display name.

What goes wrong without design:

- The profile key is requested roughly 30,000 times a second. It expires. Thirty thousand concurrent requests hit the profile database in the same instant; it stalls; every product that reads profiles degrades simultaneously.
- The cluster is fine on average — one node is at 100% CPU and the others are at 5%.

The design that prevents it:

- Local in-process cache with a 2-second TTL in every service that reads profiles. 30,000 QPS across 200 nodes becomes at most 200 requests every 2 seconds to Redis.
- Redis entry with a 5-minute TTL plus 0–30 seconds of jitter.
- Single-flight on miss: one refill per node, others wait up to 50 ms and re-read.
- Stale-while-revalidate: an expired value is still served while a background refresh runs.
- Explicit invalidation on profile update, driven by the profile service's change stream, which deletes the Redis key and publishes an event that clears local caches.

Net effect: the database sees single-digit QPS for this key. Staleness is bounded at about two seconds, which nobody will notice for a display name.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any cached entity that can be edited
- Content that becomes hot unpredictably: viral posts, breaking news, flash sales
- Multi-tenant systems where one tenant is orders of magnitude larger than the rest
- Systems with scheduled events, where a fixed TTL means synchronised expiry""",
                    ),
                    (
                        "Trade-offs",
                        """- **Short TTL versus origin load.** Fresher data costs more misses. Stale-while-revalidate mostly breaks this trade-off, at the cost of serving known-stale data briefly.
- **Explicit invalidation versus simplicity.** Precise freshness costs dependency tracking and a new way to be wrong. TTL-only is dumber and self-healing.
- **Single-flight versus latency.** Coalescing protects the database and makes the waiting requests slower. Serving stale during the refill avoids that, if staleness is allowed.
- **Key splitting versus write cost.** Ten copies of a hot key means ten invalidations and ten times the memory for that key.
- **Local cache versus consistency.** Bounded per-node staleness is the price of eliminating the hot-key problem, and it is usually worth paying.
- **Fail open versus fail closed.** Availability versus correctness, and the right answer differs by endpoint within the same system.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Synchronised expiry** from a fixed TTL applied during a deploy or a bulk load.
- **The stale value that never heals** because invalidation was missed and there was no TTL backstop.
- **Cache-database race** leaving a permanently stale entry after a concurrent read and write.
- **Hot key saturating one node** while the cluster looks healthy on average.
- **Cold cache after failover** taking down the database it was protecting.
- **Scan pollution** from a batch job evicting the hot set.
- **Unbounded key growth** — keys written with no TTL, memory fills, evictions begin on everything, hit rate collapses.
- **Rate limiter failing open** during a cache outage, removing protection exactly when it is needed.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"A key expires and 10,000 requests arrive at once. What happens?"** — Name the stampede, then give the four mitigations and say which you would use here.
- **"One celebrity account is 30% of your read traffic. Fix it."** — Local cache first, then key splitting, and explain why sharding the cache does not help.
- **"How do you know the cached value is stale?"** — Honestly: you often do not. That is why you set a TTL as a floor on wrongness and measure it, rather than relying on invalidation being perfect.
- **"Why delete instead of update on write?"** — Describe the interleaving that leaves a stale value cached indefinitely.
- **"Redis restarts empty. Walk me through the next sixty seconds."** — 100% miss rate, database at many times normal load, concurrency limiter kicks in, some requests shed or served degraded, warm-up proceeds, hit rate recovers. Then: how do you rehearse this?
- **"Your cache hit rate dropped from 95% to 60% overnight. What do you check?"** — Eviction rate (working set grew or memory shrank), TTL changes, a new access pattern or batch job, a deploy that changed key naming, or a partial cluster failure.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Explicit invalidation with no TTL backstop
- Fixed TTLs across a whole class of keys, producing synchronised expiry
- Updating the cache on write rather than deleting
- Invalidating before the database write commits
- Not knowing what happens on a cold cache, or assuming warm-up is instant
- Assuming a cache cluster balances hot keys — it does not
- Treating the cache as available in capacity planning""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A flash sale starts at 12:00. One product, 500,000 people watching the page, inventory decrementing in real time.

1. What is your cache strategy for the product page, and what TTL?
2. Inventory count must look roughly live. Cache it or not? If yes, how do you avoid showing "in stock" for a sold-out item?
3. At 12:00 the cache is cold for the sale-specific keys. How do you prevent the database from being destroyed in the first second?
4. Now the sale ends and inventory hits zero. How fast does every cached page reflect that, and what is your worst case?

The strong answer pre-warms everything before 12:00, serves a heavily cached page shell, treats the inventory number as intentionally approximate with a short TTL and stale-while-revalidate, and makes the *purchase* path — not the display path — the place where correctness is enforced.""",
                    ),
                    (
                        "Interview Tip",
                        """Use the vocabulary precisely: stampede, hot key, cold start, penetration, jitter, single-flight, stale-while-revalidate. These are the terms that signal you have run a cache rather than read about one, and each comes with a mitigation you can state in one sentence.""",
                    ),
                ],
                [
                    "Write the database first, then delete the cache key — never update it, and always keep a TTL backstop.",
                    "Stampedes are solved by single-flight, early probabilistic refresh, stale-while-revalidate, and TTL jitter.",
                    "Hot keys are not fixed by sharding the cache; a short-TTL local cache in front is the standard answer.",
                    "A cold cache is the most dangerous state — never size the origin assuming the cache is there.",
                ],
                [
                    "What is a cache stampede and how do you prevent it?",
                    "One key receives 30% of all traffic. Why does adding cache nodes not help, and what does?",
                    "Why delete the cache entry on write rather than updating it?",
                    "Redis comes back empty after a failover. Describe the next minute and how you survive it.",
                ],
            ),
            SD(
                "sd-cdn",
                "CDNs and Edge Delivery",
                "Moving bytes and computation close to users, and the invalidation problem that comes with it.",
                12,
                "A CDN is a globally distributed cache in front of your origin. It is the highest-leverage latency improvement available for any product with users outside your region, and for media-heavy systems it is not an optimisation but the only viable architecture — no origin fleet serves petabytes of video egress directly.",
                [
                    (
                        "Why It Matters",
                        """Two arguments, and interviewers want both.

**Latency.** A user in São Paulo fetching from Virginia pays roughly 120 ms per round trip. Fetching from a São Paulo edge costs about 5 ms. For a page making several sequential requests, that is the difference between fast and unusable — and no backend change touches it.

**Economics and capacity.** Serving 1 Tbps of video from your own origin is a networking project. Serving it from a CDN is a line item. For any design involving images, video, or large static assets, "CDN" should appear on the diagram in the first minute, and saying why is the easy part of the interview.""",
                    ),
                    (
                        "Mental Model",
                        """A hierarchy of caches between the user and your origin.

User → Edge PoP → Regional shield → Origin

- Hundreds of **edge points of presence** close to users.
- Often a **shield** or mid-tier that aggregates misses so the origin sees one request rather than three hundred.
- Your **origin**, which should see very little traffic.

The offload ratio — the fraction of requests served without touching the origin — is the number that matters. A well-configured CDN for static content offloads well over 95%.""",
                    ),
                    (
                        "How It Works",
                        """### What to put behind a CDN

- **Static assets** — JS, CSS, fonts, images. Immutable, fingerprinted filenames, cached effectively forever.
- **Media** — video segments, thumbnails, downloads. The dominant use by volume.
- **Cacheable API responses** — public, non-personalised GETs, with short TTLs.
- **Whole pages** — for content sites, with personalisation composed at the edge or on the client.

### Cache control

The origin tells the CDN and the browser what to do:

- `Cache-Control: public, max-age=31536000, immutable` — for fingerprinted assets that never change. The key insight: do not invalidate, change the URL. `app.a1b2c3.js` never needs purging.
- `s-maxage` — a separate, usually longer, TTL for shared caches than for browsers. Lets you keep a short browser TTL and a long edge TTL, so you can purge the edge and users see the change quickly.
- `stale-while-revalidate` — serve stale and refresh in the background. Excellent for API responses.
- `stale-if-error` — serve stale content when the origin is failing. This turns the CDN into an availability mechanism, not just a latency one, and it is worth mentioning.
- `ETag` / `If-None-Match` — revalidation with `304 Not Modified`, saving bandwidth but not the round trip.
- `Vary` — the header that ruins hit rates. `Vary: Accept-Encoding` is fine. `Vary: User-Agent` fragments the cache into hundreds of copies. Never vary on anything high-cardinality.

### Invalidation

- **Versioned URLs** — the best mechanism, because there is nothing to invalidate. Content-hash the filename.
- **Purge by URL** — precise, and propagation across a global network takes seconds to minutes.
- **Purge by tag or surrogate key** — tag responses with entity ids and purge everything related to a changed entity. The standard approach for content sites.
- **Short TTL** — the blunt instrument: accept staleness instead of coordinating.

### Personalised and dynamic content

Most pages are mostly identical with a small personalised part. Three ways to keep the cacheable majority cacheable:

1. **Client-side composition** — cache the shell at the edge, fetch personalised fragments from the API.
2. **Edge-side includes / edge compute** — assemble at the PoP, so the user gets one response and most of it came from cache.
3. **Cache keyed by segment** — vary on a coarse dimension such as country or logged-in status, which keeps the number of variants small.

Never key a shared cache on a user id. That is not a cache, it is a distributed storage bill.

### Edge compute

Modern CDNs run code at the PoP: auth checks, A/B assignment, header rewriting, redirects, request routing, and lightweight personalisation. The advantage is removing a round trip to the origin for logic that does not need origin data. The constraint is a restricted runtime, tight CPU and memory limits, and no access to your primary database — anything needing state needs an edge key-value store with its own consistency model.

### Media specifics

Video is the reason CDNs exist at their current scale:

- Content is segmented (typically 2–10 seconds per chunk) and served as ordinary cacheable objects.
- A manifest lists the available bitrates; the client picks and adapts.
- Popular content is cached at the edge; the long tail is fetched from the shield or origin, which is why offload ratios for large catalogues are lower than for static assets.
- Signed URLs with expiry provide access control without the CDN calling your auth service per request.""",
                    ),
                    (
                        "Design Decisions",
                        """**Push or pull?** Pull (origin-fetch on first miss) is the default: simple, self-managing, and the first user in each region pays the miss. Push (pre-positioning) is for predictable large launches — a new episode, a game patch — where you do not want a million simultaneous first-misses.

**How do you protect the origin?** A shield tier so that a cold object is fetched once globally rather than once per PoP, plus request collapsing at the edge. Without collapsing, a viral object's first second is a distributed denial of service against your own origin.

**How do you authorise cached content?** Signed URLs or signed cookies with a short expiry. The CDN validates the signature without calling you. The trade-off is that a leaked URL is valid until it expires, so keep expiries short and bind them to constraints where possible.

**Do you need multiple CDNs?** For high-traffic media, multi-CDN with steering is common: it survives a single provider's outage and improves performance in regions where providers differ. It costs complexity in configuration, purging, and analytics.""",
                    ),
                    (
                        "Example",
                        """An e-commerce site serves users in twelve countries.

- Product images and static bundles: immutable fingerprinted URLs, `max-age` one year, offload above 99%.
- Product detail pages: cached at the edge for 60 seconds with `stale-while-revalidate=600`, tagged with the product id. A price change purges by tag and propagates within a few seconds, so most users see it almost immediately and nobody waits on the origin.
- The cart and checkout: never cached, marked `private, no-store`, and routed directly to the origin.
- The personalised "recommended" strip: fetched by the client after page load, so it does not block the cached page or fragment its cache key.
- Search results: cached for 30 seconds keyed by the normalised query plus country. High-cardinality queries miss; the head of the distribution hits, which is most of the traffic.

Origin traffic drops by roughly two orders of magnitude, and the p75 page load in distant countries falls from seconds to a few hundred milliseconds.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Static assets and media for any global product
- Video and large file distribution, where the CDN is mandatory rather than optional
- Absorbing traffic spikes and DDoS at the edge
- Serving stale content to keep a product partially alive during an origin outage
- Software and game updates, where push pre-positioning matters""",
                    ),
                    (
                        "Trade-offs",
                        """- **Freshness versus offload.** Longer TTLs mean higher offload and staler content. Tag-based purging mostly resolves this at the cost of bookkeeping.
- **Cost.** CDN egress is usually cheaper than origin egress at volume, and it is still frequently the largest line item in a media product's bill. Worth mentioning when asked about cost.
- **Personalisation versus cacheability.** Every personalised element in a cached response either fragments the cache or must be composed separately.
- **Edge compute versus complexity.** Removing origin round trips is powerful; debugging logic distributed across hundreds of PoPs is not pleasant, and the runtime is constrained.
- **Single versus multi-CDN.** Resilience and performance versus configuration drift and operational overhead.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Caching something private.** A `Set-Cookie` or an authenticated response cached at the edge and served to another user. This is a serious, real, and recurring class of incident — hence `private`, `no-store`, and careful `Vary`.
- **Vary explosion** destroying the hit rate.
- **Purge storms** — invalidating a huge set of objects at once, so the next requests all miss and stampede the origin.
- **Origin overload on a cold or purged cache**, especially without a shield tier.
- **Misconfigured TTL of zero**, which quietly turns the CDN into an expensive proxy.
- **Stale content nobody can explain**, because a browser cached it for a year and there is no mechanism to recall it. This is why versioned URLs matter.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do users in another continent get fast responses?"** — Edge caching for anything cacheable, TLS termination at the edge for everything else, then regional replicas only if dynamic reads still dominate.
- **"How do you invalidate a CDN?"** — Prefer versioned URLs; otherwise purge by tag; expect seconds of propagation and a miss spike afterwards.
- **"What do you cache for a logged-in user?"** — The shell and assets; compose the personal parts client-side. Never key a shared cache by user.
- **"Your origin is down. What do users see?"** — With `stale-if-error`, cached pages keep working and only uncached paths fail. This is a cheap and under-used availability win.
- **"How would you reduce cost?"** — Raise TTLs and offload, use a shield to cut origin egress, right-size images and use modern formats, and check whether a large share of egress comes from a small number of objects or a single abusive client.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating the CDN as only for images, and missing that API responses and whole pages are often cacheable
- Varying on high-cardinality headers
- No plan for invalidation beyond "we'll purge"
- Assuming purge is instant and global
- Caching authenticated responses
- Forgetting the origin still needs protection for the miss path""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A news organisation publishes a breaking story. Traffic goes from 2,000 to 400,000 requests per second in ninety seconds. The article is edited four times in the first ten minutes.

Design the delivery path. Specify: what is cached where, TTLs, how an edit reaches users and how fast, what happens at the edge when the article is first requested in a region, and how the origin survives. Then answer the awkward question: an editor corrects a factual error and needs it live everywhere within five seconds. Is your design capable of that, and if not, what would you change — and what would that change cost on an ordinary day?""",
                    ),
                    (
                        "Interview Tip",
                        """For any product with global users or media, put the CDN on the diagram before anything else and say the two reasons: latency from proximity, and origin offload. Then name your invalidation mechanism immediately, because that is the follow-up.""",
                    ),
                ],
                [
                    "A CDN buys both latency (proximity) and capacity (origin offload) — say both.",
                    "Prefer versioned, immutable URLs so there is nothing to invalidate; otherwise purge by tag.",
                    "Keep personalisation out of shared cache keys; compose it client-side or at the edge.",
                    "stale-if-error turns the CDN into an availability mechanism during an origin outage.",
                ],
                [
                    "How does a CDN improve both latency and capacity?",
                    "How do you invalidate CDN content, and how long does it take?",
                    "How do you cache a page that is mostly identical but partly personalised?",
                    "What happens at the edge when your origin goes down?",
                ],
            ),
        ],
    )


def _databases_topic() -> dict:
    return _sd_topic(
        "databases",
        "Databases and Storage",
        "Choosing a store from the access pattern, making it fast with the right indexes, and knowing what belongs in object storage instead.",
        "MEDIUM",
        9,
        [
            SD(
                "databases",
                "Choosing a Data Store",
                "Start from the queries, not from the technology — and know what each store is actually good at.",
                14,
                "The data tier is the part of a design that is hardest to change and most likely to be the bottleneck. Choose it from the access patterns: what you write, what you read, how you find things, how much of it there is, and what must be transactional. Choose it from the logo on the slide and you will spend the rest of the interview defending an accident.",
                [
                    (
                        "Why It Matters",
                        """You can rewrite a service in a fortnight. Migrating a live, sharded, 20 TB datastore with no downtime is a multi-quarter project with a real risk of data loss. Interviewers know this, which is why database choice attracts more follow-up questions than any other component.

The choice also cascades. Picking a store with no multi-row transactions means every workflow above it needs sagas and idempotency. Picking one with no secondary indexes means duplicating data into query-specific tables. Those are not implementation details; they reshape the whole design.""",
                    ),
                    (
                        "Mental Model",
                        """Write the queries first. Then pick the store that serves them.

Access patterns → Constraints → Store → Schema

For each entity, list:

1. How is it written? Point insert, bulk append, high-rate updates?
2. How is it read? By primary key, by range, by a secondary attribute, by full text, by aggregate?
3. How much is there, and how fast does it grow?
4. What must be atomic together?
5. How stale may a read be?

If you can answer those five for the two or three main entities, the store usually picks itself — and you can defend it.""",
                    ),
                    (
                        "How It Works",
                        """### The families

| Family | Shape | Strong at | Weak at | Examples |
| --- | --- | --- | --- | --- |
| Relational | Tables, rows, joins | Transactions, flexible queries, constraints | Horizontal write scale, huge blobs | Postgres, MySQL |
| Key-value | Key to opaque value | Massive read/write throughput by key | Anything but key lookup | Redis, DynamoDB, Memcached |
| Document | JSON documents | Flexible schema, whole-object reads | Cross-document transactions, joins | MongoDB, DynamoDB |
| Wide-column | Partition key plus clustering columns | Enormous write volume, time-ordered rows | Ad-hoc queries, joins | Cassandra, HBase, Bigtable |
| Search | Inverted index | Full-text, relevance, faceting | Being a source of truth | Elasticsearch, OpenSearch |
| Time series | Timestamped metrics | Compression, downsampling, range scans | General-purpose queries | Prometheus, InfluxDB, Timescale |
| Graph | Nodes and edges | Multi-hop traversal | Analytics scans, scale | Neo4j, Neptune |
| Object storage | Immutable blobs | Cheap, durable, unlimited | Queries, mutation | S3, GCS, R2 |
| Analytical / columnar | Column-oriented | Aggregations over billions of rows | Point writes and reads | Snowflake, BigQuery, ClickHouse |

### The storage engine distinction that matters

Two designs underlie most operational databases, and knowing the difference is a genuine depth signal:

**B-tree** (Postgres, MySQL/InnoDB) — updates in place, reads are a handful of page fetches, excellent for read-heavy and range queries. Writes cost random I/O and write amplification through the write-ahead log.

**LSM tree** (Cassandra, RocksDB, ScyllaDB, and the engine under many key-value stores) — writes go to an in-memory table and are flushed as sorted immutable files, so writes are sequential and very fast. Reads may consult several files (mitigated by Bloom filters), and background compaction consumes I/O and can cause latency spikes.

So: write-heavy workloads lean LSM, read-heavy and range-query workloads lean B-tree. That single sentence answers a surprising number of "why Cassandra here?" questions properly.

### Polyglot persistence, carefully

Real systems use several stores: Postgres for core records, Redis for cache and counters, object storage for media, Elasticsearch for search, a warehouse for analytics. That is normal and expected.

What is not defensible is choosing four stores in an interview without saying why each exists and how they stay in sync. Every additional store adds: operational burden, another failure mode, another backup and restore plan, and a synchronisation problem. The correct framing is "one system of record, plus derived stores fed from it" — where derived stores can be rebuilt from the source of truth, which is what makes them safe.

### The default, and when to leave it

**Start with a relational database.** It is the right answer far more often than interview folklore suggests: a well-indexed Postgres instance comfortably handles tens of thousands of reads per second and thousands of writes, gives you transactions and constraints for free, and supports JSON columns when the schema is genuinely fluid.

Leave it when you have a specific, nameable reason:

- Write volume exceeds what one primary can absorb even after tuning, and the data partitions cleanly — consider wide-column.
- The access pattern is purely by key at enormous scale — key-value.
- You need full-text relevance ranking — a search index, alongside the relational store.
- You are storing blobs — object storage, with metadata in the database.
- You are running aggregations over billions of rows — a columnar warehouse, fed asynchronously.

"We'll use Postgres, and here is the specific signal that would make me move" is a stronger answer than any exotic choice.""",
                    ),
                    (
                        "Design Decisions",
                        """**What is the source of truth?** Exactly one store per piece of data. Everything else is derived and rebuildable. Systems where two stores can both be authoritative for the same fact eventually disagree, and there is no correct resolution.

**How do derived stores stay current?** Dual writes from application code are the tempting answer and the wrong one — they fail partially and silently diverge. Use change data capture from the source of truth, or the transactional outbox pattern, so the derived store is eventually consistent but never permanently wrong.

**Normalise or denormalise?** Normalise until a read path is too expensive, then denormalise that path deliberately and own the update cost. In wide-column and document stores, denormalisation is not a fallback but the design method: you model tables per query.

**Where does the blob go?** Never in the database. Blobs in rows destroy buffer-pool efficiency, inflate backups, and make replication painful. Metadata in the database, bytes in object storage, a key linking them.

**What about connection limits?** A practical detail that catches people: relational databases handle a few hundred connections well, not thousands. A fleet of 200 application nodes with 50-connection pools each will exhaust the database. Answer: a connection pooler such as PgBouncer. Mentioning this reads as production experience.""",
                    ),
                    (
                        "Example",
                        """A ride-hailing system, one entity at a time.

- **Users and drivers** — modest volume, relational constraints, transactional updates. Postgres.
- **Trips** — a state machine with money attached; must be atomic and auditable. Postgres, partitioned by month once it grows.
- **Driver locations** — 100,000 drivers writing every 4 seconds is 25,000 writes/s of data that is worthless after a minute. This does not belong in Postgres at all: Redis with geospatial indexes, or an in-memory grid service. Losing it costs a few seconds of staleness, not correctness.
- **Trip history for analytics** — billions of rows, aggregate queries. A columnar warehouse, loaded asynchronously from the trips table.
- **Receipts and map tiles** — object storage.

Five stores, and each one has a one-sentence justification tied to an access pattern. That is what good polyglot persistence sounds like; the alternative is a list of logos.""",
                    ),
                    (
                        "Common Use Cases",
                        """- The SHAPE step of any design interview
- Deciding whether a new feature fits the existing store or needs a new one
- Diagnosing why a database is the bottleneck: wrong store, wrong index, or simply undersized
- Planning a migration off a store that no longer fits""",
                    ),
                    (
                        "Trade-offs",
                        """- **Flexibility versus guarantees.** Relational gives constraints, transactions, and ad-hoc queries; NoSQL trades some of those for scale or schema freedom.
- **One store versus several.** Fewer moving parts and a poorer fit, versus an ideal fit per pattern and much more to operate, monitor, back up, and keep in sync.
- **Normalised versus denormalised.** Write simplicity and read cost, versus read speed and write amplification.
- **Managed versus self-hosted.** Managed services remove operational load and constrain version, extension, and tuning choices.
- **B-tree versus LSM.** Read latency and range scans, versus write throughput with compaction overhead and less predictable tail latency.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Dual writes diverging.** The write to the database succeeds, the write to the search index fails, and nothing reconciles them.
- **Connection exhaustion** from too many application nodes without a pooler.
- **Blobs in rows** making backups slow and replication fragile.
- **No plan for schema migration** on a large hot table — an `ALTER TABLE` that locks for an hour is an outage.
- **Unbounded table growth** with no retention or partitioning, so queries slowly degrade and deletes become impossible to run.
- **Analytics on the primary.** A single reporting query scanning the transactions table competes with production traffic.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why this database?"** — Lead with the access pattern, not the feature list. "Reads are by primary key, writes are 40,000/s and append-only, and we never need a join, so a wide-column store fits and a relational primary would not."
- **"What happens when this table reaches a billion rows?"** — Partitioning, archival tiering, index bloat, and whether the queries still use an index at that size.
- **"How do the search index and the database stay in sync?"** — CDC or outbox, never dual writes. Say what happens if the pipeline lags or fails, and how you rebuild.
- **"Could you do this with just Postgres?"** — Frequently yes, and saying so is a good signal. JSONB, full-text search, `LISTEN/NOTIFY`, and partitioning cover a lot of ground before you need another system.
- **"How do you migrate to a different store with no downtime?"** — Dual-write behind a flag or backfill plus CDC, shadow reads to compare, gradual read cutover, then retire the old store. Keep a rollback until the comparison is clean.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Choosing the store before describing a single query
- Assuming NoSQL means "faster" rather than "a different data model with different guarantees"
- Dual-writing to two stores and calling them consistent
- Storing files in the database
- Ignoring connection limits and pooling
- Running analytics against the production primary""",
                    ),
                    (
                        "Mini Design Exercise",
                        """For each workload, choose a store and justify it in two sentences, naming the access pattern that decides it:

1. User accounts with email uniqueness and password resets.
2. 500,000 IoT sensors each writing one reading every 10 seconds, queried as ranges per sensor and as aggregates per fleet.
3. A product search over 50 million items with typo tolerance and faceting.
4. A social graph answering "friends of friends who live in this city".
5. Chat messages: append-only, read by conversation in reverse chronological order, retained forever.
6. Invoices and payments.

Then: which two of these could reasonably be served by the *same* store, and what would you give up by doing that? Consolidation is often the right answer for a small team, and being able to argue it both ways is the point.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the access patterns out loud before naming any database. "Writes are append-only at 40,000/s, reads are always by partition key and a time range, and we never join" makes the choice obvious to the interviewer before you name it — and then the name is a conclusion rather than a guess.""",
                    ),
                ],
                [
                    "Derive the store from the access patterns; naming the technology first is how designs go wrong.",
                    "Exactly one source of truth per fact; everything else is derived and rebuildable via CDC or an outbox.",
                    "B-tree engines favour reads and ranges; LSM engines favour write throughput at the cost of compaction.",
                    "A well-indexed relational database handles far more than candidates assume — know the signal that would make you leave it.",
                ],
                [
                    "How do you choose a database for a given workload?",
                    "What is the difference between a B-tree and an LSM storage engine, and when does it matter?",
                    "How do you keep a search index in sync with your primary store?",
                    "When is polyglot persistence justified, and what does each extra store cost?",
                ],
            ),
            SD(
                "sd-indexes",
                "Indexes and Query Performance",
                "Why a query is slow, what an index actually does, and the cost of every index you add.",
                13,
                "Most database performance problems in real systems are not capacity problems; they are one missing or unusable index. Understanding what an index is, which queries it can serve, and what it costs on writes is the difference between \"we'll scale the database\" and knowing that the database was never the problem.",
                [
                    (
                        "Why It Matters",
                        """In an interview, "we'd add an index" is often the correct answer to "how do you make this faster", and it is far cheaper than the sharding or caching the candidate usually proposes instead. But it only counts if you can say *which* index, on which columns, in which order, and why the query planner will use it.

This is also one of the few areas where interviewers can test real depth quickly. "You have a query filtering on `status` and sorting by `created_at` for a given `tenant_id` — what index?" takes ten seconds to ask and reveals a lot.""",
                    ),
                    (
                        "Mental Model",
                        """An index is a sorted copy of some columns with a pointer back to the row. That is all.

Consequences that follow directly:

- **Sorted** means it serves equality, range, prefix, and ordering — and cannot serve "contains" or a function of the column unless you indexed that function.
- **Copy** means it costs storage and must be updated on every write that touches those columns.
- **Pointer back to the row** means the database may need a second lookup to fetch other columns, unless the index already contains them.

> Memory cue: reading gets cheaper, writing gets more expensive, and you pay disk for both.""",
                    ),
                    (
                        "How It Works",
                        """### Index types

| Type | Serves | Notes |
| --- | --- | --- |
| B-tree | Equality, range, prefix, ordering | The default; almost always what you want |
| Hash | Equality only | Rarely worth it over B-tree |
| Composite | Multiple columns, left-to-right | Column order is the whole design |
| Covering | Query answered from the index alone | Add included columns to avoid the row fetch |
| Partial / filtered | A subset of rows | Index only `WHERE status = 'active'` — small and fast |
| Unique | Enforces uniqueness | A constraint that is also an index |
| Full text / inverted | Token search | Different structure entirely |
| Geospatial | 2D proximity | R-tree or geohash-based |

### Composite index column order

This is the highest-value detail in the topic. A composite index on `(a, b, c)` can serve:

- `WHERE a = ?`
- `WHERE a = ? AND b = ?`
- `WHERE a = ? AND b = ? AND c = ?`
- `WHERE a = ? AND b = ? ORDER BY c`

It cannot efficiently serve a query filtering on `b` alone, because the index is sorted by `a` first. This is the leftmost-prefix rule.

The practical ordering heuristic: **equality columns first, then the range or sort column.** For "all open orders for tenant 42, newest first", the index is `(tenant_id, status, created_at)` — two equality predicates, then the sort. With `created_at` in the middle, the database can no longer use the index for both filtering and ordering, and you get a sort of the whole matching set.

### Selectivity

An index is only useful if it eliminates most rows. An index on a boolean column where 95% of rows are `true` will usually be ignored by the planner — a sequential scan is cheaper than millions of random row fetches. A partial index on the rare value (`WHERE archived = true`) is often the right answer instead.

### Why an index is not used

Worth knowing by heart, because it is a common interview question:

- The column is wrapped in a function: `WHERE lower(email) = ?` cannot use an index on `email`. Fix with an expression index.
- An implicit type cast between the column and the parameter.
- Leading wildcard: `LIKE '%foo'` cannot use a B-tree prefix. Full-text or a trigram index instead.
- Low selectivity, so the planner chooses a scan.
- Stale statistics after a bulk load, so the planner's estimates are wrong.
- `OR` across different columns, which often defeats a single index — sometimes fixable by a union of two indexed queries.

### The cost of an index

Every index:

- Adds write amplification: an insert updates the table and every index on it.
- Consumes storage, often 10–30% of the table size each.
- Slows bulk loads, which is why you drop and rebuild indexes for large imports.
- Adds a lock or a long build during creation, unless you build it concurrently.

So a table with twelve indexes has a write path that is many times more expensive than the row write itself. Unused indexes are pure cost, and most large systems have several.

### Reading a query plan

The vocabulary to have available: sequential scan, index scan, index-only scan, bitmap scan, nested loop, hash join, merge join, and the difference between estimated and actual rows. You do not need to recite planner internals — but "I would look at the plan and check whether the estimate matches reality, because a bad estimate usually means stale statistics or a correlated predicate" is exactly the right depth.

### Pagination and indexes

Related to the API lesson and worth repeating here: `OFFSET 100000` makes the database produce and discard 100,000 rows. Keyset pagination — `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 20` — uses the index directly and costs the same at any depth. The tie-breaker column is required, or rows with identical timestamps are skipped or duplicated.""",
                    ),
                    (
                        "Design Decisions",
                        """**Which indexes at design time?** One per access pattern you listed, and no more. In the interview, saying "this query needs a composite index on `(user_id, created_at)`" as you describe the data model is a strong, cheap signal.

**Index or denormalise?** If a read requires joining three tables under latency pressure, sometimes the answer is a denormalised column or a materialised view rather than more indexes. Materialised views trade staleness for a precomputed answer.

**Where do the heavy reads go?** Reporting and export queries on the primary are a common source of production incidents. Route them to a replica, or to an analytical store.

**How do you add an index to a hot table?** Concurrently, or via a replica-first rollout, because a blocking index build on a large busy table is an outage. Similarly, adding a column with a default, changing a type, or adding a foreign key can all take table locks — plan schema migrations as carefully as deploys.""",
                    ),
                    (
                        "Example",
                        """An orders table with 200 million rows. The endpoint powering the merchant dashboard is:

Return the 20 most recent orders for merchant 42 with status `pending`.

Without an index on those columns, the database scans an enormous number of rows and sorts them; the query takes seconds and holds resources while doing it.

With `(merchant_id, status, created_at DESC)`, the database seeks directly to the first matching entry and reads 20 consecutive index entries. Milliseconds, and the cost does not grow as the table does.

Now the follow-up an interviewer will ask: the dashboard also filters by date range and sorts by total. Do you add a second composite index? The answer is a judgement call — measure which filters are actually common, prefer a small number of well-chosen composite indexes over one per query shape, and consider a partial index if `pending` is a small fraction of rows. If the query shapes are genuinely unbounded, that is a signal the dashboard should be served by a search or analytical store instead.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any endpoint that filters or sorts a large table
- Enforcing uniqueness, such as one email per account
- Keyset pagination on feeds and history views
- Making a foreign-key join efficient in both directions""",
                    ),
                    (
                        "Trade-offs",
                        """- **Read speed versus write cost.** Every index makes writes slower and storage larger.
- **Covering index versus size.** Including extra columns avoids the row fetch and makes the index much bigger.
- **Many narrow indexes versus few composites.** Composites serve more query shapes efficiently; narrow ones combine less effectively than people expect.
- **Index versus materialised view.** An index speeds a query; a materialised view removes it, at the cost of staleness and refresh.
- **Partial index versus general.** Much smaller and only usable when the query matches the predicate.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **An index that cannot be used** because of a function, a cast, or a leading wildcard.
- **Wrong composite column order**, so the query filters with the index and then sorts everything anyway.
- **Too many indexes** on a write-heavy table, quietly halving write throughput.
- **A blocking index build** on a hot table during business hours.
- **Index bloat** after heavy updates and deletes, degrading until a rebuild.
- **Stale statistics** after a bulk load, producing catastrophic plan choices.
- **Deep OFFSET pagination** scanning and discarding hundreds of thousands of rows per request.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"This query is slow. What do you do?"** — Look at the plan first. Then: is there a usable index, is it selective enough, and is the sort being done by the index or in memory? Only after that consider caching or scaling.
- **"What index for `WHERE tenant = ? AND status = ? ORDER BY created_at DESC`?"** — `(tenant, status, created_at DESC)`, and explain the equality-then-sort rule.
- **"Why not index every column?"** — Write amplification, storage, and the planner's job gets harder. Indexes are not free lookups; they are a write tax you pay continuously.
- **"How do you add an index to a 500 GB live table?"** — Build concurrently, or on a replica then promote. Never a blocking build.
- **"How do you paginate deeply?"** — Keyset with a tie-breaker, not OFFSET.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Proposing sharding or caching when the real fix is one composite index
- Getting composite column order wrong
- Assuming an index is used without checking the plan
- Ignoring the write cost of indexes on a write-heavy table
- Using OFFSET pagination on large datasets
- Forgetting that a unique constraint is also an index with a write cost""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A messages table: `id, conversation_id, sender_id, body, created_at, deleted_at`. Two billion rows.

Design the indexes for these access patterns, and for each, say which index serves it and why:

1. Load the last 50 messages in a conversation, newest first, excluding deleted.
2. Count unread messages for a user across all conversations.
3. Full-text search a user's own messages.
4. Delete all messages older than two years.

Then answer: which of these should *not* be solved with an index on this table at all? (Two of them should not — one wants a separate counter maintained on write, and one wants a different store entirely.)""",
                    ),
                    (
                        "Interview Tip",
                        """When you describe a data model, name the index for each access pattern in the same breath: "messages keyed by `(conversation_id, created_at DESC)` because the only read is the most recent page of a conversation." It takes five seconds and it is a depth signal most candidates never give.""",
                    ),
                ],
                [
                    "An index is a sorted copy: it speeds reads, taxes every write, and costs storage.",
                    "Composite index order is equality columns first, then the range or sort column.",
                    "An index the planner cannot use is worse than none — functions, casts and leading wildcards defeat it.",
                    "Keyset pagination is constant-cost at any depth; OFFSET is linear and eventually fatal.",
                ],
                [
                    "What index would you create for a filter-plus-sort query, and in what column order?",
                    "Why might the database ignore an index that exists?",
                    "What does each additional index cost you?",
                    "How do you add an index to a very large, busy table safely?",
                ],
            ),
            SD(
                "sd-object-storage",
                "Object Storage and Large Files",
                "Where bytes belong, how they get there, and why the upload never goes through your API.",
                11,
                "Any system handling images, video, documents, backups, or logs needs a place to put bytes that is cheap, effectively unlimited, and extremely durable. Object storage is that place, and the design patterns around it — pre-signed uploads, multipart transfers, storage classes, and lifecycle rules — come up in a large fraction of design interviews.",
                [
                    (
                        "Why It Matters",
                        """The single most common mistake in media-handling designs is routing bytes through the application tier. A 5 GB upload streaming through your API server occupies a connection and memory for minutes, makes autoscaling meaningless, and turns a hundred concurrent uploads into an outage.

The correct pattern — the client uploads directly to object storage using a short-lived pre-signed URL, and your API only handles metadata — removes the entire problem. Knowing it is close to mandatory for any prompt involving files.""",
                    ),
                    (
                        "Mental Model",
                        """Object storage is a key-to-bytes map with HTTP semantics.

- **Flat namespace.** Keys look like paths but there are no real directories; prefixes are conventions used for listing.
- **Immutable objects.** You replace an object, you do not edit it. Versioning keeps prior copies.
- **Eventually consistent listings, strongly consistent reads** in modern implementations — a read after a write returns the new object, but listing may lag.
- **Very high durability, moderate latency.** Tens of milliseconds per request, and effectively infinite throughput if you parallelise.
- **Not a filesystem and not a database.** No partial updates, no queries, no transactions.""",
                    ),
                    (
                        "How It Works",
                        """### The upload flow

Client → API (authorise) → Pre-signed URL → Object storage → Event → Processing

1. The client asks your API to start an upload, sending the filename, content type, and size.
2. Your API authorises, creates a metadata row in state `pending`, and returns a pre-signed URL scoped to one key, one method, a size limit, and a short expiry.
3. The client `PUT`s the bytes directly to object storage. Your servers never see them.
4. Object storage emits an event, or the client calls back, and your service marks the record `ready` and enqueues processing.

For large files, step 3 becomes a **multipart upload**: the file is split into parts (typically 5–100 MB), each uploaded independently and retried independently, then completed with a manifest. This is what makes a 50 GB upload survive a flaky mobile connection, and it enables parallel uploads for speed.

Downloads mirror this: your API returns a pre-signed download URL, or a CDN URL with a signed token, and the bytes never pass through you.

### Metadata lives in a database

The canonical split:

| In the database | In object storage |
| --- | --- |
| File id, owner, permissions | The bytes |
| Key, size, content type, checksum | Derived renditions |
| Upload state, timestamps | Thumbnails, transcodes |
| Version history pointers | |

The database is the source of truth for *what exists*; object storage holds *the content*. This makes permissions, search, and listing fast, and keeps blobs out of your rows.

### Storage classes and lifecycle

| Class | Cost | Retrieval | Use |
| --- | --- | --- | --- |
| Standard | Highest | Immediate | Active content |
| Infrequent access | Lower storage, retrieval fee | Immediate | Backups, older media |
| Archive / cold | Very low | Minutes to hours | Compliance, long-tail archives |

Lifecycle rules move objects automatically: standard for 30 days, infrequent for 90, archive after a year, delete after seven. For any system storing a lot of data, mentioning lifecycle policy is a cheap and genuine cost-optimisation signal.

### Consistency, versioning, and deletion

- **Versioning** keeps every write as a new version, which makes accidental deletion recoverable and makes overwrites safe. It costs storage, so pair it with a lifecycle rule to expire old versions.
- **Soft delete** — mark deleted in the database, remove the object later by a background job. Immediate hard deletion makes "undo" impossible and races with in-flight readers.
- **Checksums** — store one with the metadata, verify on upload, and use it for deduplication.

### Deduplication

Content-addressed storage — key the object by the hash of its content — means identical files are stored once. This is how file-sync products achieve large savings, and it composes nicely with chunk-level dedup: split the file into content-defined chunks, hash each, and only upload chunks the server does not have. That single idea is the core of the Dropbox design question.""",
                    ),
                    (
                        "Design Decisions",
                        """**Pre-signed URL expiry and scope.** Short (minutes), bound to one key, one method, and a maximum size. A long-lived, broadly scoped URL is a security incident waiting to happen.

**Who triggers processing?** Storage events are more reliable than client callbacks, because a client can upload successfully and then lose connectivity. Prefer the event, and reconcile with a sweeper job that finds `pending` records older than an hour.

**How do you serve private content?** Signed URLs with short expiry, served through a CDN. The alternative — proxying every download through your API to check permissions — reintroduces the bandwidth problem you just solved. If authorisation is complex, do the check once and issue a short-lived signed URL.

**Where do renditions live?** Derived objects (thumbnails, transcodes) are rebuildable, so they can live in a cheaper class and be regenerated on demand if lost. Marking derived data as rebuildable simplifies your durability story.

**Which region?** Storage is regional. Cross-region replication costs money and provides disaster recovery and local read latency. For global read patterns, a CDN in front usually beats replicating the bucket.""",
                    ),
                    (
                        "Example",
                        """A document management product accepts files up to 5 GB.

- `POST /v1/files` returns `{file_id, upload_url, parts}` — a metadata row in `pending` and a multipart upload initialised with pre-signed part URLs.
- The client uploads parts in parallel, retrying individual parts on failure, then calls `POST /v1/files/{id}/complete`.
- The completion triggers an event; a worker extracts text for search, generates a preview, and computes a checksum for dedup.
- The metadata row moves to `ready`. Search indexes the extracted text. The preview goes to a separate key.
- Downloads return a 5-minute signed CDN URL after an authorisation check.
- Lifecycle: previews expire after 90 days of no access and are regenerated on demand; originals move to infrequent access after 30 days.

Your API tier has handled only JSON throughout. It could run on small instances while moving petabytes.""",
                    ),
                    (
                        "Common Use Cases",
                        """- User uploads: images, video, documents
- Static website and application assets, behind a CDN
- Data lake and log storage for analytics
- Database backups and snapshots
- Intermediate artefacts in processing pipelines""",
                    ),
                    (
                        "Trade-offs",
                        """- **Cheap and durable versus no query capability.** You cannot ask object storage a question; that is what the metadata database is for.
- **Direct upload versus control.** Pre-signed uploads remove your servers from the byte path and also remove your ability to inspect content inline — validation and virus scanning become asynchronous.
- **Storage class savings versus retrieval cost and latency.** Archive tiers are dramatically cheaper to store and can be expensive and slow to read; a lifecycle rule that archives frequently-read data costs more than it saves.
- **Versioning versus storage growth.** Safety against accidents, paid for in bytes.
- **Cross-region replication versus cost.** Disaster recovery and local latency, at double the storage plus transfer.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Uploads through the API tier**, exhausting memory and connections.
- **Orphaned objects** — the upload succeeded, the metadata write failed, and nobody knows the object exists. Fix with a reconciliation sweep over both sides.
- **Orphaned metadata** — the row says `ready` but the object is missing. Same fix, other direction.
- **Over-permissive pre-signed URLs**, or a publicly readable bucket. Still one of the most common real-world data exposures.
- **Hot prefix throttling** — keys that all share a sequential prefix can limit throughput on some providers; hash-prefixing keys avoids it.
- **Unbounded growth** with no lifecycle policy, producing a bill nobody predicted.
- **Listing a prefix with millions of objects** as if it were a directory, which is slow and paginated.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How does the file actually get uploaded?"** — Pre-signed URL, direct to storage, multipart for large files. If your answer routes bytes through the API, expect to be pushed on it.
- **"How do you handle a 5 GB upload on a mobile connection?"** — Multipart with per-part retry and resumability, plus a client that can resume after the app is backgrounded.
- **"Where does the metadata live, and what if the two disagree?"** — Database is the source of truth for existence; reconcile in both directions with a sweeper; use soft delete so a race never destroys data.
- **"How do you serve private files efficiently?"** — Signed, short-lived CDN URLs after one authorisation check. Never proxy the bytes.
- **"How would you cut storage cost by half?"** — Lifecycle tiering, expiring old versions and derived objects, deduplication, better compression and formats, and finding the small number of prefixes that account for most of the bytes.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Streaming uploads and downloads through the application tier
- Storing blobs in the database
- Long-lived or overly broad pre-signed URLs
- No reconciliation between metadata and objects
- No lifecycle policy, so cost grows without bound
- Treating object storage as a filesystem with real directories""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the storage layer for a product where users upload video up to 10 GB, and every upload produces four transcoded renditions plus a thumbnail.

Specify: the upload flow end to end, what is stored where, how processing is triggered and retried, what happens if transcoding fails halfway, how a user's deletion request removes all five derived objects, and your lifecycle policy. Then estimate the storage cost for 10,000 uploads a day averaging 500 MB, held for two years, and say which single change would most reduce it.""",
                    ),
                    (
                        "Interview Tip",
                        """The moment a prompt involves files, say: "Bytes go to object storage via a pre-signed URL — the client uploads directly, our API only writes metadata." It is one sentence, it is the expected answer, and it prevents an entire line of questioning about bandwidth through your service.""",
                    ),
                ],
                [
                    "Clients upload directly to object storage via short-lived pre-signed URLs; your API handles only metadata.",
                    "Multipart upload is what makes large files survive unreliable networks and upload in parallel.",
                    "The database is the source of truth for existence; reconcile both directions to catch orphans.",
                    "Lifecycle policies and storage classes are the main lever on storage cost, and are worth naming unprompted.",
                ],
                [
                    "How does a 5 GB file get uploaded without touching your application servers?",
                    "What lives in the database and what lives in object storage, and what happens when they disagree?",
                    "How do you serve private files without proxying the bytes?",
                    "How would you halve the storage bill for a media-heavy product?",
                ],
            ),
        ],
    )


def _sql_nosql_topic() -> dict:
    return _sd_topic(
        "sql-vs-nosql",
        "SQL vs NoSQL",
        "How to reason your way to an answer instead of reciting a comparison table.",
        "MEDIUM",
        10,
        [
            SD(
                "sql-vs-nosql",
                "SQL vs NoSQL",
                "The question is never which is better. It is which guarantees this workload needs and which it can give up.",
                14,
                "This comparison appears in almost every design interview, and it is almost always asked badly and answered badly. The useful version is not \"SQL has joins, NoSQL scales\" — it is a reasoning process: name the access patterns, name the guarantees you need, then choose the store that provides them and say what you gave up.",
                [
                    (
                        "Why It Matters",
                        """The question is a proxy for something else. The interviewer is checking whether you understand transactions, consistency, and data modelling well enough to make a defensible choice — and whether you will reach for a distributed database out of habit when a single relational instance would do.

The most common failure is not choosing wrong. It is choosing without reasoning, then being unable to answer "what would make you change your mind?" """,
                    ),
                    (
                        "Mental Model",
                        """Do not compare technologies. Compare what the workload requires.

Access patterns → Required guarantees → Store → What you gave up

Four questions decide it:

1. **Do multiple records need to change atomically?** If yes, and they are related, relational is the path of least resistance.
2. **Are the query shapes known and stable, or ad-hoc?** Ad-hoc favours relational; a small fixed set of patterns can be modelled efficiently in almost anything.
3. **Does write volume exceed one primary, even after tuning?** That is the real trigger for a distributed store — not anticipated growth.
4. **Is the schema genuinely heterogeneous?** Documents help; note that relational JSON columns cover much of this case.

> Memory cue: relational is the default because it is the most flexible; you leave it when you can name the specific guarantee you are trading away and what you get for it.""",
                    ),
                    (
                        "How It Works",
                        """### What relational actually gives you

- **ACID transactions across rows and tables.** Not just atomicity: isolation means concurrent transactions do not see each other's partial work.
- **Constraints.** Foreign keys, uniqueness, and check constraints enforced by the database, so a buggy service cannot corrupt data.
- **Ad-hoc queries.** You can answer questions you did not anticipate, with a join and a `WHERE` clause, without a migration.
- **A mature ecosystem.** Query planners, replication, backup and point-in-time restore, migration tooling, and decades of operational knowledge.

### What NoSQL stores give you, by family

They are not one thing, and treating them as one is a tell:

- **Key-value (DynamoDB, Redis)** — predictable single-digit-millisecond access by key at essentially any scale. You must know the key.
- **Document (MongoDB, DynamoDB)** — store an aggregate as one object, read it in one operation, evolve the shape without a migration.
- **Wide-column (Cassandra, Bigtable)** — enormous write throughput, rows ordered within a partition, designed for time-series and append-heavy workloads, linear scale by adding nodes.
- **Search (Elasticsearch)** — relevance-ranked text queries and faceting that relational full-text cannot match.

### The honest scaling comparison

The folklore says "SQL does not scale". What is actually true:

- Relational databases scale **reads** very well through replicas.
- They scale **writes** vertically to a real but high ceiling — thousands to low tens of thousands per second on good hardware.
- Beyond that they scale writes by **sharding**, which is possible but is application work: you choose a key, you lose cross-shard transactions and joins, and you own rebalancing. Managed distributed SQL (Spanner, CockroachDB, Vitess, Aurora Limitless) makes this less manual, at a cost in latency or money.
- Wide-column stores were designed for that write regime from the start. That is the genuine difference: not speed, but whether horizontal write scale is the default or a project.

### Modelling is the real difference

Relational modelling: normalise, then query by joining.

NoSQL modelling: **start from the queries and build a table per access pattern**, duplicating data freely. In Cassandra or DynamoDB, "how do I query by a second attribute?" is answered by writing a second table or index at write time, not by a join at read time.

That inverts the cost: writes become more expensive and more numerous, reads become single-partition lookups, and any change to the access patterns may require backfilling a new table. If the product's queries are still moving, that inversion is painful — which is a strong argument for relational early in a product's life.

### Transactions in NoSQL

The picture has changed, and saying so shows currency:

- DynamoDB supports transactions across items, with limits.
- MongoDB supports multi-document transactions in replica sets and sharded clusters.
- Cassandra offers lightweight transactions via Paxos for compare-and-set, which are much slower than normal writes.

So "NoSQL has no transactions" is out of date. The accurate statement is that transactions in distributed stores are more constrained, more expensive, and easier to accidentally misuse than in a single-node relational database.""",
                    ),
                    (
                        "Design Decisions",
                        """The reasoning script, worth being able to deliver almost verbatim:

> "The core entities here are users, orders and payments. Orders and payments must change atomically and there are real invariants — an order cannot be paid twice, and inventory must not go negative. That pushes me to a relational store; Postgres gives me those constraints without building them myself.

> Write volume is about 500 orders per second at peak, which one primary handles comfortably, so I do not need to shard on day one. I will pick a partition key now — `merchant_id` — so that sharding later is a migration rather than a redesign.

> The event stream is different: it is append-only, 50,000 writes per second, never updated, and always read by `(entity_id, time range)`. That is a wide-column access pattern, so it goes to Cassandra, and I accept no joins and no cross-row transactions there because I do not need them.

> Search is a third pattern, so a search index fed by change data capture, treated as derived and rebuildable."

Three stores, each with a named access pattern and a named trade-off. That is the answer the question is fishing for.

**When would you change your mind?** Have the trigger ready: "If orders exceeded roughly 20,000 writes per second sustained, or if a single merchant's data exceeded what one node holds, I would move to a sharded or distributed SQL setup rather than to a different data model — because the transactional requirements do not go away with scale."
""",
                    ),
                    (
                        "Example",
                        """**Instagram-scale photo metadata.** 100M photos per day, always read by photo id or by `(user_id, time range)`, never joined, never updated after creation, must never be lost.

Reasoning: single-pattern access by key, enormous append volume, no transactions needed across photos. That is a wide-column or key-value workload. Relational would work but would require sharding for write volume with no benefit from the features you are paying for.

**A bank ledger.** 500 transfers per second, each debiting and crediting two accounts, with a hard invariant that the ledger balances.

Reasoning: multi-row atomicity and constraints are the entire problem, the volume is modest, and correctness failures are unacceptable. Relational, no hesitation. You could build this on a NoSQL store with sagas and idempotency — and you would be reimplementing transactions, badly, for no gain.

**A product catalogue with wildly varying attributes per category.** Sounds like documents. But a relational table with a JSONB column and a GIN index also handles it, keeps constraints on the common columns, and does not require a new operational component. Say that — it is the answer that shows judgement rather than pattern matching.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Core transactional records: accounts, orders, payments, inventory — relational
- High-volume append-only streams: events, messages, metrics, location pings — wide-column
- Session, cache, counters, leaderboards — key-value
- Flexible product or content documents — document store, or relational JSON
- Text relevance and faceting — a search index, always alongside a source of truth""",
                    ),
                    (
                        "Trade-offs",
                        """| Dimension | Relational | Distributed NoSQL |
| --- | --- | --- |
| Multi-record atomicity | Native | Limited, expensive, or absent |
| Query flexibility | Ad-hoc, joins | Fixed patterns you modelled for |
| Write scale ceiling | High, then sharding is a project | Horizontal by design |
| Schema change | Migration, can be locking | Often no migration, but backfills for new access patterns |
| Constraints | Enforced by the database | Enforced by your application, if at all |
| Operational maturity | Very high | Varies by system |
| Cost of a wrong choice | Sharding project | Backfill and re-model, or a full migration |

The asymmetry worth stating: moving from relational to NoSQL later is usually a data migration. Moving from NoSQL to relational later is usually a data migration *and* the discovery that you have been enforcing invariants in application code that were violated years ago.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Choosing a distributed store for a workload with strong invariants**, then reimplementing transactions in application code with races.
- **Modelling NoSQL relationally** — normalised tables and client-side joins, giving you the worst of both.
- **Unbounded partitions** in a wide-column store, because the partition key has no time or hash component.
- **Adding a new access pattern** after launch and discovering it requires backfilling a new table over a billion rows.
- **Assuming eventual consistency is invisible.** It is not: a user creates a record and immediately does not see it in a list.
- **Using a search index as the source of truth**, and losing data when it needs a reindex.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why SQL and not NoSQL here?"** — Because multiple records change atomically and there are constraints the database should enforce, and the write volume does not require horizontal write scale. Then: the number at which you would revisit.
- **"Why NoSQL and not SQL here?"** — Because access is always by a known key, writes are append-only at a volume beyond one primary, and no query needs a join. Then: what you gave up.
- **"How would you shard this relational database?"** — Name the key, name the queries that become cross-shard, and say how you would avoid them.
- **"What if you need a query you did not plan for in your NoSQL design?"** — New table or secondary index plus a backfill; or stream to a search or analytical store. Be honest that this is the cost of the model.
- **"Can you do this with one store instead of three?"** — Frequently yes, at some cost. A candidate who can argue for consolidation is more credible than one who reflexively adds components.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Reciting a features table instead of reasoning from the workload
- Treating "NoSQL" as a single technology
- Claiming relational databases cannot scale
- Claiming NoSQL has no transactions
- Choosing a store before stating a single query
- Having no answer to "what would change your mind?"
""",
                    ),
                    (
                        "Mini Design Exercise",
                        """For each, pick a store, give the reasoning in three sentences, and name the trigger that would make you switch:

1. A URL shortener: 100M links, read by code, written once, never updated.
2. A hotel booking system: rooms, rates, reservations, no double-booking.
3. An IoT platform: 2M devices, one reading every 5 seconds, queried per device over time ranges.
4. A social graph: follows, and "people you may know" two hops out.
5. A multi-tenant analytics dashboard: 500 tenants, arbitrary filters over a billion events.

Then: (1) and (3) could both be served by the same store. Which one, and what would each give up?""",
                    ),
                    (
                        "Interview Tip",
                        """Answer the question in the form the interviewer wants: requirement, choice, trade-off, trigger. "We need multi-row atomicity and the volume is modest, so Postgres; the cost is that horizontal write scale is a future project, and I would revisit above roughly 20,000 writes per second." Four clauses, complete answer.""",
                    ),
                ],
                [
                    "Reason from access patterns and required guarantees; never from a features comparison.",
                    "Relational is the sensible default — leave it when you can name the guarantee you are trading and the number that forces it.",
                    "NoSQL modelling means a table per access pattern, which shifts cost from reads to writes and to future changes.",
                    "Always be ready with the trigger that would change your mind.",
                ],
                [
                    "Walk me through how you would choose between Postgres and Cassandra for this workload.",
                    "What do you actually give up by moving to a distributed NoSQL store?",
                    "At what point does a relational database stop being the right answer?",
                    "How do you add a new query pattern to a NoSQL design after launch?",
                ],
            ),
        ],
    )


def _replication_topic() -> dict:
    return _sd_topic(
        "replication",
        "Replication",
        "Copies of data for read scale and survival — and the lag that makes users see the past.",
        "MEDIUM",
        11,
        [
            SD(
                "replication",
                "Replication",
                "How data gets copied, what that buys you, and the read-your-writes problem it creates.",
                14,
                "Replication is how a database survives losing a machine and how it serves more reads than one node can. It is also the source of one of the most common user-visible bugs in distributed systems: a user saves something, reloads, and it is not there. Understanding replication means understanding both halves.",
                [
                    (
                        "Why It Matters",
                        """Three interview questions rest on this topic: how do you scale reads, how do you survive a database failure, and what happens when a user does not see their own write. All three have precise answers, and vague ones are noticed.

It is also the cheapest scaling move available. Adding read replicas requires no application redesign, unlike sharding — which is why "replicas first, shard later" is the correct order and worth stating.""",
                    ),
                    (
                        "Mental Model",
                        """One writable copy, several readable copies, and a delay between them.

Primary → Replication log → Replicas

Every design question reduces to two properties:

- **When is a write acknowledged?** Before or after replicas have it. This is the durability and latency trade.
- **How stale can a replica be?** This is the correctness trade that users feel.""",
                    ),
                    (
                        "How It Works",
                        """:::viz replication {"mode": "async", "followers": 2}

### Topologies

| Topology | Writes | Strength | Weakness |
| --- | --- | --- | --- |
| Single leader | One primary | Simple, no write conflicts | Primary is a write bottleneck and a failure point |
| Multi-leader | Several primaries | Local writes in each region | Write conflicts you must resolve |
| Leaderless (quorum) | Any node | High availability, tunable | Conflict resolution, read repair complexity |

Single leader is the default and the correct starting answer. Multi-leader appears in multi-region designs, and its whole difficulty is conflict resolution. Leaderless (Dynamo-style) uses quorums: with N replicas, if the write quorum W and the read quorum R satisfy W + R > N, a read overlaps at least one up-to-date replica.

### Synchronous versus asynchronous

- **Asynchronous** — the primary acknowledges immediately and ships changes after. Fast writes; if the primary dies before shipping, those acknowledged writes are lost. This is the default almost everywhere.
- **Synchronous** — the primary waits for one or more replicas to confirm. No acknowledged write is lost; write latency now includes the slowest required replica, and if that replica is down, writes block.
- **Semi-synchronous** — wait for one replica, the rest asynchronous. The usual compromise: survives a single node loss without paying for full synchrony.

This is the durability question in concrete form. For money, semi-synchronous or synchronous. For a social feed, asynchronous is fine and you should say why.

### Replication lag

Replicas trail the primary by milliseconds normally, and by seconds or minutes under load, during a large write, or while rebuilding. Three anomalies follow, and knowing their names is the depth signal:

- **Read-your-writes** — a user updates their profile, the read goes to a lagging replica, and they see the old value. Fixes: route a user's reads to the primary for a few seconds after their write; or track the write position (a log sequence number) in the session and require a replica at or beyond it; or read from the cache you just updated.
- **Monotonic reads** — two successive reads hit different replicas and the second is *older* than the first, so data appears to go backwards. Fix: pin a user to one replica for a session, usually by hashing the user id.
- **Consistent prefix** — with partitioned replication, a reader can see an effect before its cause. Fix: causal ordering or keeping causally related writes in the same partition.

### Failover

When the primary dies:

1. Detect it — health checks, with a timeout long enough to avoid reacting to a network blip.
2. Choose a new primary — the most up-to-date replica, via consensus or an external coordinator.
3. Reconfigure — clients and replicas must learn the new primary, usually via a virtual IP, DNS, or a proxy.
4. Recover the old primary — it may hold writes the new primary never received, which must be discarded or reconciled.

Two things to say out loud in an interview, because they show you have seen it go wrong:

- **Asynchronous failover can lose data.** Writes acknowledged but not replicated are gone. If that is unacceptable, you needed synchronous replication.
- **Split brain.** If the old primary is alive but partitioned, two nodes both believe they are primary and both accept writes. Prevention requires fencing: a majority quorum, a lease, or STONITH. "We use a majority quorum so a minority partition cannot elect a primary" is the right sentence.

### Reading from replicas

Routing reads to replicas is the point, but be deliberate: route reads that tolerate staleness, and keep reads that must be fresh on the primary. In practice this is a per-endpoint decision, which is why the endpoint table from the requirements lesson pays off here.""",
                    ),
                    (
                        "Design Decisions",
                        """**How many replicas?** Enough for read capacity plus one for failover plus one for maintenance. Three is the common minimum. Replicas across availability zones protect against zone failure; replicas in other regions protect against region failure and serve local reads.

**Where do backups fit?** Replication is not a backup. A replica faithfully replicates a `DELETE FROM users` in milliseconds. Backups with point-in-time restore protect against human and application error; replication protects against hardware failure. Saying this unprompted is a strong signal.

**Do you need a proxy?** A connection router that knows who the primary is (ProxySQL, PgBouncer with an orchestrator, or the cloud provider's endpoint) means applications do not need to discover failover. Without it, every client must handle a primary change.

**Which reads go to replicas?** Default reads to replicas, exceptions on the primary, and make the exception explicit in the code path rather than implicit.""",
                    ),
                    (
                        "Example",
                        """An e-commerce site: one primary, three asynchronous replicas, typical lag 200 ms.

- Product pages, search, and category listings read from replicas. Lag is irrelevant — the price was the same 200 ms ago.
- The cart reads from the primary, because a user adding an item and not seeing it is an immediate, obvious bug.
- Order placement writes to the primary in a transaction.
- The order confirmation page reads from the primary for 10 seconds after the write, then falls back to replicas — implemented by storing the write's log position in the session.
- Analytics runs against a dedicated replica so a slow reporting query cannot affect production reads.

Now the interviewer asks: **"The primary dies. What happens?"**

Writes fail for the duration of failover — typically 10–60 seconds with automated orchestration. Reads continue from replicas throughout, so the site stays browsable and only checkout is affected: a meaningful degradation rather than an outage. Up to 200 ms of acknowledged writes may be lost, which is acceptable for cart updates and is not acceptable for payments — which is why the payment write path is semi-synchronous and the payment provider holds the authoritative record anyway.

That paragraph answers the question at a senior level: what fails, for how long, what is lost, and why that is acceptable for each data type.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Scaling read-heavy workloads without changing the application
- Surviving node and zone failure
- Isolating analytics and export queries from production traffic
- Serving low-latency reads in a second region
- Zero-downtime maintenance: fail over, patch the old primary, fail back""",
                    ),
                    (
                        "Trade-offs",
                        """- **Async versus sync.** Write latency and availability, against the possibility of losing acknowledged writes on failover.
- **More replicas.** More read capacity and more cost, and every replica adds replication load on the primary.
- **Reads from replicas.** Capacity, at the price of staleness anomalies you must handle explicitly.
- **Fast failover versus false failover.** Aggressive detection recovers quickly and risks promoting during a transient blip, which is its own incident.
- **Multi-leader.** Local write latency in each region, paid for with conflict resolution you cannot avoid thinking about.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Replication lag spikes** during bulk writes, migrations, or replica rebuilds — making every "eventually consistent" read visibly wrong at the worst moment.
- **Split brain** after a network partition, with two primaries accepting divergent writes.
- **Data loss on failover** with asynchronous replication.
- **A replica silently falling behind** because nobody alerts on lag.
- **Failover to a replica that cannot handle the write load**, because it was sized for reads.
- **Cascading read failure** — one replica dies, its traffic shifts to the others, they saturate, and the whole read tier fails in sequence.
- **Treating replicas as backups**, then replicating a destructive statement perfectly.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"A user updates their profile and does not see the change. Why?"** — Replica lag. Then give three fixes and pick one with a reason.
- **"The primary fails. Walk me through it."** — Detection, election, reconfiguration, client behaviour, data loss window, and the split-brain guard.
- **"How much data can you lose?"** — With async, the replication lag at the moment of failure. Quantify it and say whether it is acceptable per data type.
- **"How do you prevent split brain?"** — Majority quorum or leases and fencing; a minority partition must not be able to elect a primary.
- **"Can you scale writes with replicas?"** — No. Replicas scale reads. Write scaling is vertical, then sharding, then multi-leader with conflict resolution.
- **"Is replication a backup?"** — No, and explain the deletion scenario.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Assuming replicas are instantly consistent
- Confusing replication with backup
- Expecting replicas to help write throughput
- No plan for read-your-writes
- Not alerting on replication lag
- Ignoring split brain when describing failover""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A social app has one primary and five replicas, average lag 500 ms, occasionally 5 seconds under load.

For each operation, decide primary or replica, and if replica, what happens when lag is 5 seconds:

1. Posting a status update.
2. Viewing your own profile immediately after editing it.
3. Viewing someone else's profile.
4. The notification badge count.
5. Checking whether a username is available during signup.
6. Loading the home feed.

Item 5 is the interesting one: a stale replica says a username is free, two users both pass the check, and the unique constraint on the primary rejects one of them at insert time. The lesson is that a uniqueness *check* on a replica is only a hint — the constraint on the primary is what actually enforces it, and the API must handle the conflict gracefully.""",
                    ),
                    (
                        "Interview Tip",
                        """Whenever you draw a replica, immediately say the lag number and name one read that cannot tolerate it. "Replicas lag around 200 ms, so browse reads go there and the cart reads from the primary" shows you understand what replication actually costs.""",
                    ),
                ],
                [
                    "Replication scales reads and survives node loss; it does not scale writes and is not a backup.",
                    "Asynchronous replication can lose acknowledged writes on failover — quantify the window per data type.",
                    "Read-your-writes, monotonic reads and consistent prefix are the three lag anomalies, each with a standard fix.",
                    "Failover design is incomplete without a split-brain guard: quorum, leases, or fencing.",
                ],
                [
                    "A user does not see their own write. Explain why and give three fixes.",
                    "Walk me through what happens when the primary fails, including the data loss window.",
                    "How do you prevent split brain during failover?",
                    "Why can replicas not help with write throughput?",
                ],
            ),
        ],
    )


def _sharding_topic() -> dict:
    return _sd_topic(
        "sharding",
        "Partitioning and Sharding",
        "Splitting data across machines: choosing the key, living with hot shards, and rebalancing without downtime.",
        "HARD",
        12,
        [
            SD(
                "sharding",
                "Partitioning and Sharding",
                "The move you make when one machine can no longer hold the data or absorb the writes — and the one you should delay as long as honestly possible.",
                16,
                "Sharding splits a dataset across independent machines so that capacity grows with machine count. It is the most powerful scaling tool in the data tier and by far the most expensive: the shard key becomes a permanent constraint on every query you will ever write, and getting it wrong is a migration measured in quarters.",
                [
                    (
                        "Why It Matters",
                        """Interviewers use sharding to separate candidates who have read about scaling from those who understand its cost. Two failure modes, and both are common:

- **Sharding too early.** Adding a distributed data tier to a system doing 800 writes per second, then spending the interview explaining cross-shard joins you did not need.
- **Sharding without a key.** Saying "we'd shard the database" and having no answer to "on what, and which of your queries break?"

The strong answer sequence is always: vertical scale, then read replicas, then caching, then — only when writes or data volume genuinely exceed one node — sharding, with a named key and a list of the queries it makes expensive.""",
                    ),
                    (
                        "Mental Model",
                        """One logical dataset, many physical homes, and a function that maps a record to its home.

Record → Shard key → Partition function → Shard

Two distinctions worth being precise about:

- **Vertical partitioning** splits *columns* or tables across stores: rarely-read blobs into one place, hot columns into another.
- **Horizontal partitioning (sharding)** splits *rows* across stores by a key. This is what people mean.
- **Partitioning within one database** (Postgres declarative partitioning, for example) splits a table into physical pieces on one machine: it improves query pruning, retention deletes, and index size. It is not sharding — it does not add capacity across machines — and knowing the difference is a real signal.

> Memory cue: the shard key is a schema decision that behaves like an architecture decision. You cannot change it cheaply, so choose it while you still have time to think.""",
                    ),
                    (
                        "How It Works",
                        """:::viz consistent-hashing {"nodes": ["N1", "N2", "N3"], "add": "N4", "virtual": 1}

### Partitioning strategies

| Strategy | How | Strength | Weakness |
| --- | --- | --- | --- |
| Range | `A–F`, `G–M`, by date | Efficient range scans | Hotspots — recent dates get all the writes |
| Hash | `hash(key) mod N` | Even distribution | No range queries; resharding moves everything |
| Consistent hash | Hash onto a ring | Minimal movement when adding nodes | More complex; still hot-key prone |
| Directory / lookup | An explicit key-to-shard map | Total flexibility, easy rebalancing | The lookup service is a dependency and a bottleneck |
| Geographic | By region | Data residency, local latency | Uneven, and cross-region users are awkward |

Range partitioning by time is the classic trap: every new write goes to the newest partition, so one shard takes all the write load while the rest sit idle. If you partition by time for retention reasons, combine it with a hash component so writes spread.

### Choosing the shard key

Four criteria, in order:

1. **High cardinality.** Enough distinct values to spread across many shards. `country` has about 200 values; `user_id` has millions.
2. **Even distribution.** Not just many values — similar traffic per value. `user_id` is usually even; `merchant_id` is not, because one merchant may be 30% of your volume.
3. **Present in your queries.** If the most common read does not include the shard key, every read becomes a scatter-gather across all shards. This is the criterion candidates forget, and it is the one that hurts most.
4. **Stable.** The key must not change, because changing it means moving the row to another shard, which is a delete plus insert with no transaction across them.

Composite keys are often the right answer: `(tenant_id, entity_id)` shards by tenant so a tenant's data is co-located and queries are single-shard, while entity id provides distribution within the tenant.

### What sharding costs you

Name these explicitly in an interview:

- **No cross-shard transactions.** Anything spanning shards needs a saga, a two-phase commit, or a redesign to avoid it.
- **No cross-shard joins.** You denormalise, or you fan out and join in the application, which is slow and fragile.
- **Scatter-gather reads.** A query without the shard key hits every shard; latency becomes the slowest shard's latency, and one slow shard degrades everything.
- **Global uniqueness becomes hard.** Auto-increment ids do not work across shards; you need UUIDs, Snowflake-style ids, or a central allocator.
- **Aggregates get expensive.** `COUNT(*)` across shards means querying all of them, so most systems maintain counters separately.
- **Operations multiply.** Backups, migrations, and schema changes now happen N times, and can be partially applied.

### Hot shards

Even with a good key, load is rarely uniform. One tenant, one celebrity, one viral item concentrates traffic on a single shard, which saturates while the rest are idle.

Mitigations, in escalating order:

1. **Cache in front** — the cheapest fix for read hotspots, and often sufficient.
2. **Key salting** — append a bucket number to spread one logical key across several physical partitions, then fan out on read. Effective for extreme write hotspots; complicates reads.
3. **Split the hot shard** — give the heavy tenant its own shard or its own database. Common in B2B SaaS, where the distribution of customer sizes is extremely skewed.
4. **Change the key** — the expensive answer, and sometimes the right one.

For write hotspots specifically, note the classic case: sequential ids or timestamps as the partition key send every new write to the same place. Hash or reverse the high-order bits to spread them.

### Resharding

Splitting shards is the operation everyone underestimates.

With **hash modulo N**, increasing N remaps nearly every key — you must move almost all the data. That is why naive `mod N` is a bad choice for anything expected to grow.

The practical approaches:

- **Consistent hashing** — only a fraction of keys move when a node is added.
- **Virtual shards (the best general answer).** Hash into a large fixed number of logical shards — say 1,024 — and map logical shards to physical machines. Growing means reassigning some logical shards to a new machine and moving only their data. The mapping is a small, cheap lookup table, and the key never has to change.
- **Directory-based** — the mapping is explicit, so any split is possible; the directory itself must be highly available and cached.

The migration itself: copy the data to the new shard while the old one still serves, replicate the delta continuously, verify, then cut over reads and writes for that logical shard atomically, keeping the old copy until you are confident. This is a *dual-write and backfill* problem, and being able to describe it as one is a senior-level answer.""",
                    ),
                    (
                        "Design Decisions",
                        """**Do you shard at all?** Say the alternatives first. Vertical scaling is cheap; read replicas absorb reads; caching removes most reads; archiving old data shrinks the working set; moving one heavy table to its own database is a lighter form of splitting. Sharding when none of those is left is defensible; sharding first is not.

**Where does the routing live?** In the application, in a proxy (Vitess, ProxySQL), or in a database that shards natively (Spanner, CockroachDB, DynamoDB). Application routing is simple and spreads shard knowledge everywhere; a proxy centralises it and adds a hop; a native distributed database removes the decision and costs money or latency.

**How do you generate ids?** UUIDv4 is simple and non-sequential, which fragments B-tree indexes. UUIDv7 and Snowflake ids are time-ordered, which keeps index locality and leaks a timestamp. A central allocator handing out ranges is also fine and adds a dependency. Pick one and say why.

**How many shards to start with?** More logical shards than you need — 256 or 1,024 — mapped onto a handful of machines. Growing is then a mapping change rather than a rehash. This one decision prevents the most painful version of resharding.""",
                    ),
                    (
                        "Example",
                        """A multi-tenant SaaS product reaches 40,000 writes per second and 15 TB. One primary cannot keep up.

**Key choice:** `tenant_id`. Almost every query is scoped to a tenant, so reads stay single-shard. Tenants are independent, so cross-shard transactions are rare by construction.

**Implementation:** hash `tenant_id` into 1,024 logical shards; map logical shards to 16 physical databases, 64 each. A small routing table, cached in every service and in a config store, holds the mapping.

**The problem that appears immediately:** the largest tenant is 20% of total load, and it sits on one physical shard. So the mapping is adjusted to give that tenant's logical shard its own machine — possible precisely because the mapping is data, not arithmetic. The three next-largest tenants get similar treatment.

**Cross-shard queries:** internal admin reporting needs "total usage across all tenants". Rather than scatter-gather over 16 databases, usage events stream to an analytical store, and reporting queries run there.

**Growth:** at 24 physical machines, 1,024 logical shards still divide cleanly. Adding machines means moving a set of logical shards, copying their data, and updating the map — hours of background copying and a sub-second cutover per shard, instead of a full rehash.

Every painful part of sharding was made survivable by one early decision: indirection between the hash and the machine.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Datasets larger than one machine can hold or back up in a reasonable window
- Write throughput beyond one primary after tuning and vertical scaling
- Multi-tenant isolation, where per-tenant shards also bound blast radius
- Data residency, where rows must physically stay in a jurisdiction""",
                    ),
                    (
                        "Trade-offs",
                        """- **Capacity versus query flexibility.** You gain unbounded growth and lose joins, transactions, and unplanned queries across shards.
- **Hash versus range.** Even distribution versus efficient range scans; you rarely get both without a composite key.
- **Fewer big shards versus many small.** Fewer are simpler to operate; more give finer rebalancing and smaller blast radius.
- **Application routing versus a proxy versus a distributed database.** Control, an extra hop, or a bill — pick one.
- **Sharding versus buying a bigger machine.** Modern single instances are very large. The engineering cost of sharding is often greater than several years of a larger instance, and saying so is good judgement.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Hot shard** from a skewed key, saturating one machine while the cluster looks fine on average.
- **Sequential key hotspot** where every new write lands on the newest partition.
- **Scatter-gather everywhere**, because the common query does not include the shard key — the design's fatal error.
- **Resharding with `mod N`**, requiring a near-total data move.
- **Cross-shard transactions invented ad hoc**, producing partial writes nobody detects.
- **Id collisions** after moving away from auto-increment carelessly.
- **One shard's failure taking down the product**, because there is no per-shard degradation and every request touches every shard.
- **Operational drift** — one shard on an old schema or version after a partially applied migration.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What is your shard key, and why?"** — Cardinality, distribution, presence in queries, stability. Then name the query that becomes expensive.
- **"One shard is far hotter than the others. What do you do?"** — Cache, then salt, then isolate that key onto its own shard, then consider changing the key. Say which you would try first and why.
- **"How do you add shards without downtime?"** — Virtual shards plus copy, sync, verify, cut over. If you answer "rehash everything", expect a follow-up you will not enjoy.
- **"How do you run a query that spans shards?"** — Fan out and merge, with a timeout and partial results, or maintain a derived store designed for that query. Prefer the second for anything frequent.
- **"How do you generate unique ids?"** — Name a scheme and its trade-off, including index locality.
- **"Could you avoid sharding entirely?"** — Frequently yes. Archive cold data, move one table out, add replicas, cache aggressively, or buy a bigger instance. Volunteering this reads as experience.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Proposing sharding before replicas, caching, or vertical scaling
- Choosing a key that is absent from the most common query
- Using `hash mod N` with no indirection layer
- Ignoring the hot-key problem because "hashing spreads load" — it spreads keys, not traffic per key
- Assuming cross-shard transactions are available
- Forgetting that every operational task is now N tasks""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A messaging product stores 5 billion messages. Access patterns:

- Load the most recent 50 messages in a conversation (very frequent)
- Full-text search a user's messages (occasional)
- Delete everything for a user, for compliance (rare, must be complete)
- Count unread per user (frequent)

1. Choose a shard key and justify it against all four patterns.
2. Which patterns become scatter-gather, and what would you build so they are not?
3. A group conversation has 100,000 members and is extremely active. What breaks, and what do you do?
4. Deletion must be provably complete. How do you verify it across shards?

The intended conclusions: shard by `conversation_id` so the dominant read is single-shard; search and per-user deletion need a separate index keyed by user; unread counts are maintained as counters rather than computed; and the giant conversation needs sub-partitioning by time so a single partition does not grow without bound.""",
                    ),
                    (
                        "Interview Tip",
                        """Introduce sharding with the sequence you rejected: "We are past vertical scaling and replicas do not help writes, so I will shard on `tenant_id` — every query is tenant-scoped, so reads stay single-shard. The cost is that cross-tenant reporting becomes a separate analytical store." Rejected alternatives, key, and cost in three clauses.""",
                    ),
                ],
                [
                    "Choose the shard key for cardinality, even load, presence in the dominant query, and stability.",
                    "Always shard into many logical shards mapped onto fewer machines — never hash modulo the machine count.",
                    "Sharding removes cross-shard transactions, joins, and cheap aggregates; name those costs out loud.",
                    "Hot shards are a traffic problem, not a key-distribution problem: cache, salt, or isolate.",
                ],
                [
                    "What shard key would you choose here, and which queries does it make expensive?",
                    "How do you add capacity to a sharded cluster without a full data reshuffle?",
                    "One shard carries 30% of traffic. What are your options, in order?",
                    "What alternatives would you exhaust before sharding at all?",
                ],
            ),
            SD(
                "sd-consistent-hashing",
                "Consistent Hashing",
                "How distributed caches and datastores add and remove nodes without reshuffling everything.",
                11,
                "Consistent hashing solves one specific problem: with plain `hash(key) mod N`, changing N remaps almost every key. In a cache that means a near-total miss storm; in a datastore it means moving nearly all your data. Consistent hashing reduces the movement to roughly 1/N of keys, and it appears in Dynamo-style databases, Cassandra, distributed caches, and load balancers.",
                [
                    (
                        "Why It Matters",
                        """It is one of the few named algorithms that comes up directly in system design interviews, usually as a follow-up: "you have ten cache nodes and you add an eleventh — what happens?" The wrong answer is "the keys redistribute"; the right answer quantifies it.

With `mod 10 → mod 11`, roughly 90% of keys map to a different node. Every one of those is a cache miss, simultaneously — which is a stampede against your database at exactly the moment you were trying to add capacity.""",
                    ),
                    (
                        "Mental Model",
                        """Put the keys and the nodes on the same circle.

Hash key → Walk clockwise → First node owns it

- Hash the node identifiers onto a ring of, say, 0 to 2³²−1.
- Hash each key onto the same ring.
- A key belongs to the first node encountered walking clockwise.

Adding a node only steals the keys in the arc between it and its predecessor. Removing a node hands its arc to its successor. Everything else is untouched.""",
                    ),
                    (
                        "How It Works",
                        """### The basic ring

With N nodes placed on the ring, adding one node moves on average 1/(N+1) of the keys, and only from one neighbour. Compare to modulo hashing, which moves nearly everything.

### Virtual nodes

The naive ring has a serious flaw: with a handful of nodes, the arcs are wildly uneven — one node might own 40% of the ring by chance. Worse, when a node leaves, its entire load goes to exactly one successor, which may then fall over.

The fix is **virtual nodes**: each physical node is hashed onto the ring many times, typically 100–500, under names like `node-a#1`, `node-a#2`. Now:

- Load evens out, because the law of large numbers applies to many small arcs.
- When a node fails, its many small arcs are distributed among *many* successors rather than one.
- Heterogeneous machines are easy: give a machine twice the capacity twice as many virtual nodes.

Virtual nodes are not an optimisation; without them, consistent hashing is not usable in practice, and mentioning them is the detail that shows you have actually thought about it.

### Replication on the ring

Dynamo-style systems store each key on the first R distinct physical nodes clockwise from its position. That gives replication without a separate placement system, and it makes the preference list for a key trivially computable by any client.

### Bounded loads

A refinement worth knowing by name: consistent hashing with bounded loads caps how much any node may exceed the average, and overflow keys go to the next node on the ring. It prevents the residual imbalance that virtual nodes leave, and it is used in load balancers where a single backend must not be overwhelmed.

### Rendezvous hashing

An alternative with the same goal: for a key, compute `hash(key, node)` for every node and pick the highest. Movement on node changes is similarly minimal, distribution is naturally even without virtual nodes, and the cost is O(number of nodes) per lookup rather than a ring search. For small clusters it is simpler and perfectly good. Naming it as an alternative is a nice depth signal.

### Where you actually meet it

- **Distributed caches** — memcached clients, Redis Cluster (via 16,384 hash slots, which is the virtual-shard idea rather than a literal ring)
- **Dynamo-style databases** — Cassandra, Riak, DynamoDB internally
- **Load balancers** — routing a session or a cache key to a consistent backend
- **CDNs** — deciding which edge server caches which object
- **Sharded services** — any place where clients must independently agree on which node owns what

Note the Redis Cluster detail: a fixed number of slots mapped to nodes achieves the same goal — indirection between the hash and the machine — with a simpler mental model and explicit control over placement. In a design interview, "hash into a large fixed number of logical shards and map those to machines" is often a better answer than a literal ring, because it is easier to operate and to rebalance deliberately.""",
                    ),
                    (
                        "Example",
                        """A cache tier of 10 nodes serving 100,000 keys at a 95% hit rate. One node dies.

**With modulo hashing:** every key rehashes against 9 nodes. Roughly 90% of keys now live on a different node than the one holding the data — effectively a 90% cache miss rate. The database, sized for 5% of read traffic, receives something close to all of it. The cache tier's failure has taken the database with it.

**With consistent hashing and virtual nodes:** the dead node owned about 10% of the ring, spread as hundreds of small arcs. Those arcs are absorbed by many different successors. About 10% of keys miss, and the remaining 90% continue to hit. The database sees roughly double its normal load instead of twenty times.

That difference — surviving a node loss versus cascading into an outage — is the entire point, and it is the story to tell when asked.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Sharded cache tiers where nodes are added, removed, or fail regularly
- Partition placement in Dynamo-style datastores
- Sticky routing where a session or a key must reach the same backend
- Any client-side sharding where nodes must agree on ownership without coordination""",
                    ),
                    (
                        "Trade-offs",
                        """- **Minimal movement versus perfect balance.** Even with virtual nodes there is residual imbalance; bounded-load variants fix it with extra complexity.
- **Ring versus fixed slot map.** The ring is automatic; a slot map is explicit, auditable, and lets you deliberately place a hot partition. Operationally, the slot map is usually preferable.
- **Virtual node count.** More virtual nodes means better balance and a larger ring to maintain and gossip about.
- **Consistent hashing does nothing for hot keys.** A single popular key still lands on one node. This is the most important limitation to state, and it is what interviewers probe with the celebrity example.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **No virtual nodes**, producing badly uneven arcs and a single successor absorbing a whole failed node's load.
- **Clients with inconsistent ring views** during a membership change, so two clients disagree about ownership and write to different nodes.
- **Flapping membership** causing repeated redistribution, which is worse than a single clean failure.
- **Treating it as a fix for hot keys**, which it is not.
- **Forgetting the miss storm.** Even 10% of keys missing at once is a large, sudden load increase on the origin — you still want request coalescing and a concurrency limit.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"You add a cache node. What fraction of keys move?"** — About 1/(N+1) with consistent hashing; nearly all of them with modulo.
- **"Why virtual nodes?"** — Even distribution and spreading a failed node's load across many successors, plus weighting for heterogeneous hardware.
- **"Does consistent hashing solve hot keys?"** — No. Explain why, and give the actual fixes: local cache, key splitting, dedicated capacity.
- **"How do clients agree on the ring?"** — Gossip, a coordination service, or a config store. And what happens during the window when they disagree.
- **"Would you use this or a fixed slot map?"** — A slot map for anything you operate yourself, because deliberate placement and auditable rebalancing beat automatic placement in practice.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Describing the ring without virtual nodes
- Claiming it eliminates cache misses during membership changes
- Confusing it with a solution to load skew from a single hot key
- Not mentioning that clients need a consistent view of membership""",
                    ),
                    (
                        "Mini Design Exercise",
                        """You run a 20-node cache tier with consistent hashing and 150 virtual nodes each, holding 500 GB and serving 200,000 QPS at 97% hit rate.

1. A node fails. How many keys move, what is the new hit rate in the first seconds, and what does the database see?
2. You add 10 nodes to double capacity. Do you add them all at once or gradually, and why?
3. One key is 5% of all requests. Which of your mechanisms helps, and which does not?
4. Two clients briefly disagree about the ring during the membership change. What is the worst thing that can happen, and does it matter for a cache? Would your answer change if this were a datastore rather than a cache?

Part 4 is the real question: for a cache, disagreement costs a duplicate entry and a miss. For a datastore, it costs a write to the wrong node — which is why datastores need consensus on membership and caches do not.""",
                    ),
                    (
                        "Interview Tip",
                        """Give the number. "With modulo hashing, adding an eleventh node moves about 90% of keys and produces a miss storm; with consistent hashing it is about 9%." Quantified contrast is what makes the answer land.""",
                    ),
                ],
                [
                    "Modulo hashing remaps nearly every key when the node count changes; consistent hashing moves about 1/N.",
                    "Virtual nodes are mandatory in practice: they even out load and spread a failed node's arcs across many successors.",
                    "Consistent hashing does nothing for a single hot key — that needs a local cache or key splitting.",
                    "A fixed slot map with an explicit node mapping is often the better operational choice than a literal ring.",
                ],
                [
                    "What happens to a cache tier when you add a node under modulo hashing versus consistent hashing?",
                    "Why are virtual nodes necessary, and what do they fix?",
                    "Does consistent hashing solve hot keys? Why not?",
                    "How do clients stay in agreement about ring membership?",
                ],
            ),
        ],
    )


def _queues_topic() -> dict:
    return _sd_topic(
        "message-queues",
        "Queues, Logs, and Pub/Sub",
        "Moving work off the request path, the delivery guarantees you actually get, and how to answer \"why Kafka?\" properly.",
        "MEDIUM",
        13,
        [
            SD(
                "message-queues",
                "Message Queues and Async Processing",
                "Decoupling arrival rate from processing rate — and everything that follows from at-least-once delivery.",
                15,
                "A queue lets a fast producer hand work to a slow consumer without either one waiting for the other. That decoupling buys latency, spike absorption, and failure isolation. It costs you synchronous confirmation, and it forces you to handle duplicates and ordering explicitly — because at-least-once delivery is what you will actually get.",
                [
                    (
                        "Why It Matters",
                        """The reasoning matters more than the box. Compare two answers to "why is there a queue here?":

- *Weak:* "So it's asynchronous and scalable."
- *Strong:* "Thumbnail generation takes two to five seconds of CPU. Inline, request latency is bound to worker capacity, and a traffic spike becomes timeouts. The queue decouples arrival from processing: the API responds in 50 ms and the backlog absorbs the burst. The costs are that the client now sees eventual completion — so I need a status endpoint — and that delivery is at-least-once, so the consumer must be idempotent."

The second answer names the problem, the mechanism, and both costs. That is the entire skill.""",
                    ),
                    (
                        "Mental Model",
                        """A queue is a buffer that converts a latency problem into a backlog problem.

Producer → Queue → Consumer → Side effect

Three properties define any messaging system, and you should state all three when you add one:

1. **Delivery guarantee** — at-most-once, at-least-once, or "effectively once".
2. **Ordering guarantee** — global, per partition or key, or none.
3. **Retention** — deleted on acknowledgement, or retained for a window and replayable.

> Memory cue: the backlog is the point. If your queue is always empty you may not have needed it; if it is always growing, your consumers are undersized and you have hidden the problem rather than solved it.""",
                    ),
                    (
                        "How It Works",
                        """:::viz queue-backpressure {"producerRate": 1000, "consumerRate": 300, "consumers": 2, "addConsumersAt": 6, "seconds": 12, "bound": 0}

### When to go asynchronous

Move work off the request path when it is:

- **Slow** — transcoding, report generation, sending email
- **Bursty** — order spikes, batch imports
- **Failure-prone or external** — third-party APIs you do not control
- **Fan-out** — one event with many independent consumers
- **Not needed for the response** — analytics, search indexing, audit logs

Keep it synchronous when the user must know the outcome now: payment authorisation, login, inventory reservation at checkout.

### Delivery semantics

| Guarantee | Mechanism | Reality |
| --- | --- | --- |
| At-most-once | Fire and forget, ack before processing | Messages can be lost. Acceptable for metrics, rarely elsewhere |
| At-least-once | Ack after processing, redeliver on failure | The default. Duplicates are guaranteed to happen eventually |
| Exactly-once | Not achievable end-to-end across systems | What you can build is at-least-once delivery plus idempotent processing |

This is the point interviewers press hardest. "Exactly-once" exists inside some systems (Kafka's transactional producer plus consumer offsets within Kafka), but the moment your consumer writes to an external database or calls a third-party API, the guarantee ends at the boundary. The professional answer is always: **at-least-once delivery with an idempotent consumer**.

Making a consumer idempotent, concretely:

- Give every message a stable id from the producer.
- Before performing the side effect, insert that id into a processed-messages table with a unique constraint, in the same transaction as the effect. A duplicate violates the constraint and is skipped.
- Or make the effect naturally idempotent: `SET status = 'paid'` rather than `increment attempts`, or an upsert keyed by a business key.

### Ordering

Global ordering across a distributed queue means one consumer, which means no parallelism. Nobody wants that. What you get instead is **ordering within a partition or key**: all messages for `user_42` go to the same partition and are processed in order, while different users are processed in parallel.

So the design question is always "what is the ordering key?" — usually the entity the messages mutate. If the answer is "we need strict global order", push back: it is almost never a real requirement, and it caps throughput at one consumer.

Also worth knowing: with at-least-once redelivery, a retried message can arrive *after* a later message for the same key, so ordering guarantees can be violated by retries unless the consumer handles it — for example by ignoring updates with an older version number.

### Failure handling

- **Visibility timeout / lease** — a consumer takes a message and it becomes invisible for N seconds. If the consumer dies, it reappears. If processing exceeds N, it reappears *while still being processed*, causing a duplicate. Set the timeout above the p99 processing time, or extend the lease while working.
- **Retries with backoff** — exponential plus jitter, and a maximum attempt count.
- **Dead letter queue** — after N failures, move the message aside rather than retrying forever. A DLQ that nobody monitors is a silent data-loss mechanism, so alert on its depth and have a documented replay procedure.
- **Poison messages** — one malformed message retried forever blocks its partition. The DLQ exists for exactly this.

### Backpressure and load shedding

Queues do not create capacity; they defer work. If arrival exceeds processing for long enough, the backlog becomes unbounded:

- Memory or disk fills.
- End-to-end latency grows without limit — you are still processing yesterday's jobs tomorrow.
- Recovery takes longer than the incident.

Mitigations: bound the queue and reject or shed at the producer, autoscale consumers on queue depth or age, prioritise with separate queues (never a priority field in one queue — it does not work at scale), and drop or defer low-value work during overload.

The metric to watch is **oldest message age**, not queue depth. Depth alone does not tell you whether you are falling behind.

### Queue versus log

Two different shapes, covered in depth in the next lesson:

- **Queue** (SQS, RabbitMQ) — a message is consumed and deleted. Competing consumers share the work.
- **Log** (Kafka, Pulsar, Kinesis) — messages are appended and retained; consumers track their own offsets and can replay. Multiple independent consumer groups each read everything.""",
                    ),
                    (
                        "Design Decisions",
                        """**What happens if the consumer crashes mid-processing?** The lease expires and the message is redelivered. So: is the partial work safe to repeat? If it wrote to three systems, you need idempotency in all three, or a saga.

**Where is the transaction boundary?** The classic bug: write to the database, then publish to the queue. If the publish fails, the database says the order exists and no downstream system ever hears about it. The fix is the **transactional outbox** — write the event into an outbox table in the same transaction as the business change, and a relay publishes from the outbox. Alternatively, derive events from the database's change stream. Naming this pattern is a strong signal.

**How do consumers scale?** One consumer per partition is the usual bound in a log; queues scale with competing consumers freely. Autoscale on backlog age.

**Do you need ordering at all?** Frequently the answer is no if the consumer is idempotent and operations commute. Ask before paying for it.""",
                    ),
                    (
                        "Example",
                        """An order pipeline.

Synchronous path: validate, reserve inventory, authorise payment, write the order, return `201`. The user must know these succeeded.

Everything else goes to the queue, published via an outbox in the same transaction as the order write:

- Send confirmation email — third-party, slow, retryable
- Update the search index — eventual is fine
- Notify the warehouse — separate system, must not block checkout
- Emit analytics — lossy is acceptable

Consumer design: each message carries `order_id` and an `event_id`. The email consumer records `(event_id)` in a processed table inside the same transaction as marking the email sent, so a redelivery does not send twice. The search indexer is naturally idempotent because it upserts by `order_id` — and it discards events with a version older than what it has already applied, which protects it from out-of-order redelivery.

Failure behaviour: the email provider is down for twenty minutes. Messages retry with backoff; the queue grows to a few thousand; alerting fires on oldest-message-age exceeding five minutes. Nothing else in the system is affected — which is exactly what the queue was for. After three failed attempts a message goes to the DLQ, and there is a runbook for replaying it.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Email, SMS, and push notification delivery
- Media processing: transcoding, thumbnails, virus scanning
- Search and cache index updates
- Fan-out to multiple downstream services from one event
- Buffering writes to a store that cannot take the peak rate
- Scheduled and deferred work""",
                    ),
                    (
                        "Trade-offs",
                        """- **Latency of the request versus eventual completion.** Fast responses, and the client must learn the outcome another way.
- **Spike absorption versus unbounded backlog.** The buffer protects you until it does not; bound it and shed.
- **Decoupling versus debuggability.** A request now spans several systems and no single log shows the whole story — you need correlation ids and tracing.
- **At-least-once versus complexity.** Reliable delivery forces idempotency work into every consumer.
- **Ordering versus parallelism.** Per-key ordering is the practical compromise; global ordering costs all your throughput.
- **One more system to operate.** A managed queue removes most of that; a self-hosted broker cluster does not.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Duplicate side effects** — two charges, two emails — from a consumer that is not idempotent.
- **Poison message** blocking a partition indefinitely.
- **Unmonitored dead letter queue** quietly accumulating lost work.
- **Visibility timeout shorter than processing time**, producing duplicates under load precisely when load is highest.
- **Unbounded backlog** during an outage, so recovery takes longer than the incident.
- **Lost events from dual writes** — database committed, publish failed, no outbox.
- **Retry storms** when a downstream recovers and every queued message is replayed at once without rate limiting.
- **Consumer lag invisible** because nobody alerts on oldest-message age.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if the consumer crashes halfway through?"** — Redelivery after the lease expires; the consumer must be idempotent; describe the dedup mechanism concretely.
- **"How do you guarantee this is not processed twice?"** — At-least-once plus an idempotency key persisted transactionally with the effect. Never claim exactly-once across systems.
- **"What if the queue backs up?"** — Alert on oldest-message age, autoscale consumers, shed or defer low-priority work, and bound the queue at the producer.
- **"How do you preserve ordering?"** — Partition by the entity key; state that global ordering is not on offer and is rarely needed.
- **"Why not just call the service directly?"** — Because it is slow, spiky, or unreliable, and coupling checkout availability to the email provider's availability is a bad trade.
- **"What happens to messages if the broker loses a node?"** — Replication factor and acknowledgement settings; if the producer acknowledges before replication, messages can be lost.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Claiming exactly-once delivery
- Consumers that are not idempotent, with no dedup story
- Writing to the database and publishing separately with no outbox
- No dead letter queue, or one nobody watches
- Treating the queue as infinite capacity
- Using a queue for work the user is synchronously waiting on
- Monitoring queue depth but not message age""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A payment webhook receiver accepts callbacks from a provider that retries aggressively and may deliver out of order.

Design it. Cover: what happens on receipt before you acknowledge, how you deduplicate, how you handle a `payment.succeeded` arriving *before* the `payment.created` it refers to, what you do with an event referring to an unknown payment, and how a consumer bug that ran for two hours is corrected afterwards.

The strong design acknowledges fast and processes asynchronously, deduplicates on the provider's event id, handles out-of-order by state-machine rules rather than assuming sequence, parks unknown references for retry with a bounded window, and can replay from the retained event log after fixing the bug — which is the argument for a log rather than a queue here.""",
                    ),
                    (
                        "Interview Tip",
                        """Say "at-least-once delivery with idempotent consumers" the moment you draw a queue. It is the single sentence that pre-empts the duplicate-processing follow-up, and claiming exactly-once instead is one of the fastest ways to lose credibility.""",
                    ),
                ],
                [
                    "Queues convert a latency problem into a backlog problem — bound the backlog or you have only deferred the failure.",
                    "You get at-least-once delivery; exactly-once effects come from idempotent consumers, not from the broker.",
                    "Ordering is per partition or key; global ordering costs all your parallelism and is rarely required.",
                    "Use a transactional outbox so a database commit and its event are never separated.",
                ],
                [
                    "How do you guarantee a message is not processed twice?",
                    "What happens when the consumer crashes halfway through a message?",
                    "The queue is backing up. What do you do, and what do you alert on?",
                    "Why not call the downstream service directly instead of queueing?",
                ],
            ),
            SD(
                "sd-kafka-vs-queue",
                "Log-Based Streaming vs Traditional Queues",
                "What a commit log gives you that a queue does not, and how to answer \"why Kafka?\" without saying \"because it scales\".",
                12,
                "Kafka is not a faster queue; it is a different data structure. A queue is a work distribution mechanism where messages disappear when handled. A log is an ordered, retained, replayable record of what happened, which many independent consumers read at their own pace. Choosing between them is a question about replay, fan-out, and retention — not about throughput.",
                [
                    (
                        "Why It Matters",
                        """"Why Kafka?" is one of the most reliably asked follow-ups in system design interviews, and "because it is scalable and high throughput" is one of the most reliably bad answers — modern managed queues are also fast.

The defensible answer names a capability a queue does not have: multiple independent consumer groups reading the same stream, retention that allows replay, ordering per key at high parallelism, and the ability to rebuild a downstream store from scratch by replaying history.""",
                    ),
                    (
                        "Mental Model",
                        """Queue: a to-do list. Take an item, do it, it is gone.

Log: a ledger. Append facts; readers keep a bookmark.

Producers → Partitioned log → Consumer groups

Because the log retains messages, the consumer's position — its offset — is the only state that determines what it sees. Rewind the offset and you replay history. That single property is what makes a log a fundamentally different tool.""",
                    ),
                    (
                        "How It Works",
                        """### Side by side

| | Traditional queue (SQS, RabbitMQ) | Log (Kafka, Pulsar, Kinesis) |
| --- | --- | --- |
| After consumption | Message deleted | Message retained for a window |
| Replay | Not possible | Reset the offset |
| Multiple consumers | Compete for messages | Each group reads everything independently |
| Ordering | Limited or FIFO-specific | Strict within a partition |
| Consumer scaling | Add consumers freely | Bounded by partition count |
| Per-message operations | Ack, delay, dead-letter individually | Offsets, not individual acks |
| Typical use | Work distribution | Event streaming, integration, analytics |

### Partitions

A topic is split into partitions. A message's key determines its partition, so all events for `user_42` are ordered relative to each other and processed by one consumer in a group. Different users process in parallel.

Consequences to state:

- **Parallelism is capped by partition count.** Sixteen partitions means at most sixteen useful consumers per group. Partition count is easy to increase and hard to decrease — and increasing it changes which partition a key maps to, breaking ordering across the change.
- **A skewed key distribution makes a hot partition**, exactly like a hot shard. One enormous tenant on one partition limits the whole pipeline.

### Consumer groups

Each group has its own offsets. The billing service, the search indexer, and the analytics pipeline all read the same topic independently; a slow consumer in one group does not affect the others. Adding a new consumer later is free, and it can start from the beginning of retained history.

This is the fan-out property that makes a log the backbone of event-driven architectures.

### Retention and compaction

- **Time or size retention** — keep seven days, or 500 GB per partition. Replay within that window.
- **Log compaction** — retain only the latest message per key, forever. The topic becomes a snapshot of current state that can be replayed to rebuild a cache or a materialised view from nothing. This is how "the log is the source of truth" designs work, and mentioning compaction is a real depth signal.

### Delivery semantics in a log

Same rules as anywhere: at-least-once by default. If a consumer processes a batch then crashes before committing its offset, it reprocesses on restart. Kafka offers transactional produce plus offset commit for exactly-once *within Kafka*, which is genuinely useful for stream processing topologies — and still does not cover a write to an external database.

### Operational reality

Self-hosted Kafka is not a small commitment: broker sizing, partition rebalancing, retention tuning, consumer group rebalance storms, and ZooKeeper or KRaft to understand. Managed offerings remove most of it for money. A candidate who says "I would use a managed streaming service because we do not have the operational capacity to run brokers well" is demonstrating judgement, not weakness.

### Others in the family

- **Pulsar** — separates serving from storage, so scaling brokers and storage is independent; supports both queue and stream semantics.
- **Kinesis / managed cloud streams** — Kafka-like, with provider-imposed shard limits.
- **Redis Streams** — log semantics with consumer groups, good for modest volumes when Redis is already present.
- **NATS JetStream** — lighter weight, good latency, less ecosystem.""",
                    ),
                    (
                        "Design Decisions",
                        """**Do you need replay?** This is the deciding question. If rebuilding a downstream store from history is valuable — a new search index, a corrected consumer after a bug, a new analytics consumer — you need a log. If work simply needs doing once, a queue is simpler.

**Do you need multiple independent consumers?** One event, five interested services, each at its own pace, each able to fall behind and catch up — a log. One consumer doing one job — a queue.

**What is the partition key?** The entity whose ordering matters: user, account, conversation, device. Check the distribution: if one key is a large fraction of volume, you have a hot partition.

**How long is retention?** Long enough to survive your worst realistic outage plus the time to notice and fix a consumer bug. Seven days is a common default; compacted topics are effectively permanent for current state.

**Is a database enough?** For modest volumes, an outbox table polled by a worker gives you ordering, retention, and replay without a new system. That is a legitimate and often correct answer for a small team.""",
                    ),
                    (
                        "Example",
                        """An e-commerce platform publishes `OrderPlaced` to a topic partitioned by `order_id`.

Four consumer groups read it independently: fulfilment, billing, the search indexer, and the analytics loader. Each keeps its own offset.

What the log makes possible, concretely:

- **The search indexer has a bug** that mis-indexes two days of orders. Fix the code, reset the group's offset to two days ago, reprocess. No coordination with anyone else, no data lost. With a queue, those messages were consumed and deleted — the only recovery would be a bespoke backfill from the database.
- **A new recommendations team** wants order history. They create a consumer group and read from the start of retention. No producer change, no coordination.
- **Billing falls behind for an hour** during an incident. Fulfilment and search are unaffected because offsets are per group. Billing catches up afterwards.
- **Ordering per order is preserved** because all events for one order share a partition, so `OrderPlaced` is always processed before `OrderShipped`.

Now the honest counterweight: if the only consumer were fulfilment, none of these benefits would exist, and a managed queue would be less to run. That comparison is what the interviewer wants to hear.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Event backbones where many services consume the same events
- Change data capture: streaming database changes to caches, search, and warehouses
- Metrics, logs, and clickstream ingestion
- Stream processing: windowed aggregation, joins, enrichment
- Rebuilding derived stores by replaying history
- Event sourcing, where the log is the system of record""",
                    ),
                    (
                        "Trade-offs",
                        """- **Replay and fan-out versus operational weight.** The capabilities are real, and so is the cost of running or paying for the platform.
- **Ordering versus parallelism.** Per-partition ordering is a good compromise; it caps consumers at partition count and creates hot partitions under skew.
- **Retention versus storage cost.** Longer replay windows cost disk; compaction bounds it for state-like topics.
- **Per-message control.** Queues give per-message delay, visibility, and dead-lettering naturally; logs work in offsets, so a poison message needs handling in the consumer.
- **Kafka versus a database outbox.** At low volume the outbox is simpler, transactional, and already backed up. Reaching for Kafka at 50 events per second is over-engineering.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Hot partition** from a skewed key, limiting the whole pipeline to one consumer's throughput.
- **Consumer group rebalance storms**, where slow consumers repeatedly trigger rebalances and nobody makes progress.
- **Offset committed before processing**, silently losing messages on crash.
- **Retention shorter than the outage**, so the replay you were counting on is not possible.
- **Partition count increased**, changing key-to-partition mapping and breaking ordering across the change.
- **A poison message stalling a partition** because the consumer retries forever instead of side-lining it.
- **Unbounded consumer lag** unnoticed because nobody alerted on it.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Why Kafka instead of SQS?"** — Replay, multiple independent consumer groups, per-key ordering at high parallelism, and retention that lets you rebuild downstream state. If none of those apply, say a queue is the better choice.
- **"Why not Kafka?"** — Operational cost, partition management, and the fact that per-message semantics are more awkward. At low volume an outbox table is often better.
- **"What is your partition key and what breaks with it?"** — Name it and name the skew risk.
- **"A consumer has a bug and processed a day of events incorrectly. What now?"** — Fix, reset offsets, reprocess — and confirm the consumer is idempotent so reprocessing is safe.
- **"How many partitions?"** — Enough for your target consumer parallelism plus headroom, given that increasing later disrupts key mapping.
- **"What if a broker dies?"** — Replication factor, in-sync replicas, and producer acknowledgement settings; acknowledging on the leader alone can lose data.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Answering "why Kafka?" with "it is scalable"
- Using a log where a queue is simpler, or vice versa, without stating the deciding property
- Ignoring partition count as a hard cap on consumer parallelism
- Forgetting that retention limits how far you can replay
- Assuming exactly-once extends to external writes
- Introducing a streaming platform for a volume a database table would handle""",
                    ),
                    (
                        "Mini Design Exercise",
                        """You are designing the event backbone for a company with eight services. Volume is 5,000 events per second, growing. Requirements: a new service must be able to consume historical events from the last week; a buggy consumer must be recoverable by reprocessing; events for the same customer must be ordered; and one customer accounts for 15% of all events.

1. Log or queue, and why?
2. Partition key, partition count, and what you do about the 15% customer.
3. Retention, and how you chose it.
4. A consumer needs to reprocess a week of history while also keeping up with live traffic. How?
5. At what volume, or with what change in requirements, would you move back to a plain queue or an outbox table?

Part 4 is the interesting one: the usual answer is a separate consumer group for the backfill so live processing is unaffected, with the results written to a shadow table and swapped in when the backfill catches up.""",
                    ),
                    (
                        "Interview Tip",
                        """Decide with one question: does anything need to read this stream more than once, or more than one way? If yes, a log. If no, a queue — and say the queue is less to operate. Choosing the simpler tool with a reason is a positive signal, not a weak one.""",
                    ),
                ],
                [
                    "A log retains and replays; a queue distributes and deletes. That difference, not throughput, is the reason to choose one.",
                    "Multiple independent consumer groups and offset resets are what a queue cannot give you.",
                    "Consumer parallelism is capped by partition count, and a skewed key creates a hot partition.",
                    "At low volume, an outbox table in your existing database is often the better answer than a streaming platform.",
                ],
                [
                    "Why Kafka instead of a traditional message queue?",
                    "When would Kafka be the wrong choice?",
                    "A consumer processed a day of events incorrectly. How do you recover?",
                    "How does partition count limit your consumers, and what happens with a skewed key?",
                ],
            ),
        ],
    )


def _eda_topic() -> dict:
    return _sd_topic(
        "event-driven-architecture",
        "Event-Driven Architecture",
        "Services reacting to facts instead of calling each other — and what it costs in traceability and correctness.",
        "HARD",
        14,
        [
            SD(
                "event-driven-architecture",
                "Event-Driven Architecture",
                "When publishing a fact beats calling five services, and the failure modes that come with it.",
                14,
                "In an event-driven architecture, a service announces that something happened and does not care who listens. It removes the coupling where every new side effect means changing the service that triggered it. It replaces that with a different problem: no single place describes what the system does, and correctness now depends on eventual consistency you have to reason about explicitly.",
                [
                    (
                        "Why It Matters",
                        """Consider an order service that must, on checkout: charge the card, reserve inventory, send an email, update the search index, notify the warehouse, and record analytics. Calling all six synchronously means checkout is as available as the least available of them, as slow as the slowest, and must be modified every time a seventh is added.

Publishing `OrderPlaced` inverts the dependency. Checkout depends on nothing but its own database and the event bus. New consumers appear without touching it.

The cost is equally real, and interviewers want you to name it: the behaviour of the system is now distributed across consumers, debugging spans several logs, and "the order is placed" no longer means "the email was sent".""",
                    ),
                    (
                        "Mental Model",
                        """Events are facts about the past. Commands are requests about the future.

- **Command** — `ChargeCard`. Directed at one handler, expects a result, the sender cares whether it worked.
- **Event** — `OrderPlaced`. Broadcast, past tense, the publisher does not know or care who reacts.

Producer → Event → Any number of consumers

Getting this distinction right is most of the topic. A message named `SendEmail` published to a topic is a command wearing an event's clothing: it names the reaction rather than the fact, which re-couples the publisher to the consumer's behaviour.""",
                    ),
                    (
                        "How It Works",
                        """### Event content styles

| Style | Payload | Pros | Cons |
| --- | --- | --- | --- |
| Notification | Just ids: `{order_id}` | Tiny, no stale data | Every consumer calls back for details — a load amplifier |
| Event-carried state | The full relevant state | Consumers are independent, no callback | Larger, can be stale, schema coupling |
| Delta | What changed | Compact | Consumers must have prior state and apply in order |

Event-carried state transfer is usually the right default: it keeps consumers from stampeding the producer for details, and it lets a consumer work while the producer is down. Include a version and a timestamp so late or duplicate events can be discarded.

### Choreography versus orchestration

- **Choreography** — each service reacts to events and emits its own. No central controller. Maximum decoupling; the overall flow exists only in the collective behaviour, and understanding it means reading every service.
- **Orchestration** — a coordinator (a workflow or saga engine) explicitly drives the steps and handles compensation. The flow is visible, testable, and debuggable in one place, at the cost of a central component that knows about everyone.

The pragmatic position: choreography for simple fan-out where nobody needs to know the overall outcome; orchestration for multi-step business processes with compensation, deadlines, and a state anyone might ask about. "Order fulfilment" is an orchestration problem; "send notifications when something happens" is a choreography problem.

### Getting events out of a service correctly

The single most important implementation detail. Do **not** write to the database and then publish — that is a dual write, and it fails partially.

- **Transactional outbox** — insert the event into an outbox table in the same transaction as the state change; a relay reads the outbox and publishes, marking rows sent. Guarantees the event exists if and only if the change committed. At-least-once, so consumers deduplicate.
- **Change data capture** — read the database's replication log and publish changes. No application change, complete coverage including writes that bypass your code, and the events are database-shaped rather than domain-shaped unless you transform them.

### Schema evolution

Events are a contract with consumers you may not know about. Rules that hold up:

- Additive changes only: new optional fields are safe.
- Never change the meaning or type of an existing field.
- Version the event type when you must break it, and publish both for a deprecation period.
- Use a schema registry with compatibility checks if the organisation is large enough that you cannot ask everyone.

### Event sourcing (adjacent, not the same)

Event-driven architecture means services communicate with events. **Event sourcing** means a service stores its state *as* a sequence of events, deriving current state by replaying them. It gives a perfect audit log and time travel, and it costs you: queries need projections, schema changes need care over years of stored events, and most teams do not need it. Knowing the distinction and not conflating them is a good signal.

### Observability is not optional

Once behaviour is distributed, you must be able to follow one user action across services. That means a correlation id generated at the edge, propagated on every event, and present in every log line and trace span. Without it, debugging is archaeology. Say this when you propose the architecture, not when the interviewer asks.""",
                    ),
                    (
                        "Design Decisions",
                        """**Which interactions should be events?** Use an event when the publisher genuinely does not need the outcome: notifications, indexing, analytics, downstream workflows. Keep a synchronous call when the caller must know the result now: authorisation, payment capture at checkout, inventory reservation.

**What is the consistency story for the user?** If the order page says "confirmed" but the warehouse has not received it yet, is that acceptable? Usually yes, and you should say so explicitly and describe what the user sees in the gap.

**How do you handle a consumer that fails permanently?** Retries, DLQ, alert, replay. And decide whether the business process should stall or continue — a failed analytics consumer should not block fulfilment, but a failed inventory consumer probably should surface as an order in an exception state.

**Do you need a saga?** Any multi-service process with steps that must be undone on failure needs compensation. Design the compensating action for each step before you draw the happy path — "cancel the reservation", "refund the charge" — because some actions have no clean inverse and that shapes the ordering of steps.""",
                    ),
                    (
                        "Example",
                        """Before: the order service makes six synchronous calls. Availability is the product of six services; a slow email provider makes checkout slow; adding a loyalty-points feature means a pull request against checkout.

After: the order service writes the order and an `OrderPlaced` event in one transaction. A relay publishes it. Six consumers subscribe. Checkout depends only on its own database.

What must be designed, and is the substance of the answer:

- **Idempotency.** Every consumer deduplicates by `event_id`, because the relay is at-least-once.
- **Ordering.** Events for one order share a partition key, so `OrderCancelled` cannot be processed before `OrderPlaced`. Consumers also check a version field and ignore stale events.
- **Failure isolation.** The email consumer failing does not affect inventory. Each has its own retry and DLQ.
- **Business visibility.** Someone will ask "is order 123 fully processed?", and no single service knows. So a lightweight orchestrator or a process-state table tracks which steps completed, which is also what makes stuck orders detectable.
- **Tracing.** The checkout request's trace id rides on the event and appears in all six consumers.

The user-visible consequence to state plainly: the confirmation page appears immediately, and the email may arrive thirty seconds later. That is a product decision as much as a technical one.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Commerce: order, payment, fulfilment, notification
- Keeping derived stores current: search indexes, caches, read models, warehouses
- Cross-team integration where teams deploy independently
- Audit trails and compliance records
- Reacting to third-party webhooks""",
                    ),
                    (
                        "Trade-offs",
                        """- **Decoupling versus comprehensibility.** No single file describes the business process; you trade change-cost for understanding-cost.
- **Availability versus immediacy.** The publisher survives consumer outages; the user waits for effects they cannot see.
- **Eventual consistency is now user-visible.** "Placed" and "reflected everywhere" are different moments, and the UI must be honest about it.
- **Choreography versus orchestration.** Freedom versus visibility.
- **Event-carried state versus notification.** Payload size and staleness versus callback load on the producer.
- **More infrastructure.** A broker, a schema registry, a DLQ strategy, and tracing all become mandatory rather than nice to have.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Dual write** — state committed, event lost, downstream permanently wrong. The reason the outbox exists.
- **Event storms and cycles** — consumer A emits an event that triggers B, which triggers A. One bad deploy becomes an infinite loop generating millions of events.
- **Ordering violations** from parallel consumers or redelivery, applying a stale update over a newer one.
- **Schema break** silently poisoning a consumer that nobody owns any more.
- **No end-to-end view**, so "where is my order?" has no answer.
- **Duplicate side effects** from non-idempotent consumers.
- **Silent DLQ accumulation**, where the business process simply stops for some orders and nobody notices for a week.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What if a consumer is down for an hour?"** — Events are retained; it catches up. Say what the user sees in the meantime and whether any step is time-sensitive.
- **"How do you ensure the event is published if the transaction commits?"** — Transactional outbox or CDC. Never dual writes.
- **"What if events arrive out of order?"** — Partition by entity key, and include a version so consumers ignore stale updates.
- **"How do you debug a failed checkout across six services?"** — Correlation id from the edge, propagated on events, with distributed tracing and a process-state view.
- **"Event or synchronous call here?"** — Decide by whether the caller needs the outcome to respond. Give the rule, then apply it.
- **"How do you roll back if step four fails?"** — Sagas with compensating actions, and name which steps have no clean inverse.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Publishing commands disguised as events
- Dual writes with no outbox
- Assuming ordered delivery without a partition key
- No correlation id, making the system undebuggable
- Turning every internal call into an event, producing an unreadable system
- Ignoring schema evolution until a consumer breaks
- Conflating event-driven architecture with event sourcing""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A travel booking consists of a flight, a hotel, and a car, each owned by a different service. All three must succeed or none should.

1. Design this as a choreographed saga: which events, which order, what compensations.
2. Design it as an orchestrated saga: what the coordinator stores and how it recovers if it crashes mid-flow.
3. The hotel booking succeeds but the car service is down for two hours. What does the user see, and what does the system do?
4. The compensating action for the flight is a cancellation that incurs a fee. How does that change the order in which you attempt the steps?

Part 4 is the design insight: you attempt the step with the most expensive or least reversible compensation *last*, so the cheap failures happen before the expensive commitment.""",
                    ),
                    (
                        "Interview Tip",
                        """When you propose events, immediately state the three mandatory pieces: an outbox so the event cannot be lost, idempotent consumers because delivery is at-least-once, and a correlation id because you will have to debug this. Volunteering the obligations is what makes the proposal credible.""",
                    ),
                ],
                [
                    "Events are past-tense facts; commands are directed requests. Publishing a command as an event re-couples the services.",
                    "Use a transactional outbox or CDC — never write to the database and publish separately.",
                    "Choreography maximises decoupling; orchestration gives you a visible, debuggable business process.",
                    "Correlation ids and tracing are mandatory the moment behaviour is distributed across consumers.",
                ],
                [
                    "When should an interaction be an event rather than a synchronous call?",
                    "How do you guarantee an event is published if and only if the transaction committed?",
                    "How do you debug a business process spread across six consumers?",
                    "Choreography or orchestration for a multi-step booking, and why?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 5 — Distributed systems
# ---------------------------------------------------------------------------


def _consistency_topic() -> dict:
    return _sd_topic(
        "consistency",
        "Consistency Models and Transactions",
        "What a reader is guaranteed to see, and how to keep a multi-service operation correct without a global transaction.",
        "HARD",
        15,
        [
            SD(
                "consistency",
                "Consistency Models",
                "A spectrum, not a switch — and a decision you make per operation, not per system.",
                14,
                "Consistency is the guarantee a system gives about what a read will return relative to recent writes. It is not a property you turn on; it is a spectrum from \"every read sees the latest write\" to \"reads may return anything recent\", and the engineering skill is choosing the weakest point on that spectrum that the product can tolerate, because weaker is faster, cheaper, and more available.",
                [
                    (
                        "Why It Matters",
                        """Every caching, replication, and multi-region decision is a consistency decision in disguise. Candidates who treat consistency as binary produce designs that are either needlessly slow (strong everywhere) or quietly wrong (eventual where it matters).

The vocabulary is also a fast credibility test. "Eventually consistent" used as a synonym for "sometimes wrong" is noticed immediately; naming read-your-writes, monotonic reads, and causal consistency is noticed just as quickly in the other direction.""",
                    ),
                    (
                        "Mental Model",
                        """Order the guarantees from strongest to weakest and pick the weakest that works.

Linearizable → Sequential → Causal → Read-your-writes → Eventual

| Model | Guarantee | Cost |
| --- | --- | --- |
| Linearizable | Every read sees the most recent completed write, globally, as if there were one copy | Coordination on every operation; unavailable under partition |
| Sequential | All nodes see operations in the same order, not necessarily real time | Cheaper than linearizable, still ordered |
| Causal | Related operations are seen in order; unrelated ones may differ | Practical, requires tracking dependencies |
| Read-your-writes | You always see your own writes; others may lag | Cheap: session routing or version tracking |
| Monotonic reads | You never see time go backwards | Cheap: session affinity |
| Eventual | Given no new writes, replicas converge | Cheapest and most available |

Eventual consistency without any session guarantee is usually a bad user experience even when it is technically adequate — which is why read-your-writes is the practical floor for anything a user edits.""",
                    ),
                    (
                        "How It Works",
                        """:::viz quorum {"n": 3, "w": 2, "r": 2}

### The anomalies, named

Being able to name the specific anomaly is more useful than the model taxonomy:

- **Stale read** — you read an old value from a lagging replica or cache.
- **Read-your-writes violation** — you update your profile and the next page shows the old name. The most common and most complained-about anomaly.
- **Monotonic read violation** — refresh twice and the second result is older than the first, because you hit different replicas.
- **Lost update** — two concurrent read-modify-writes, and one silently overwrites the other. Fixed with optimistic concurrency or atomic operations, not with a stronger read model.
- **Write skew** — two transactions each read a valid state and write, and together they violate an invariant that neither violated alone. The classic example: two on-call engineers each check "at least one other person is on call" and both go off call.
- **Phantom read** — a query run twice returns different rows because another transaction inserted matching rows.

### Getting read-your-writes cheaply

Three practical mechanisms, and you should know all three:

1. **Route to the primary for a short window after a write**, keyed by session. Simple, effective, and slightly wasteful.
2. **Track the write position.** Store the log sequence number of the user's last write in their session; require any replica serving them to be at or beyond it, else fall back to the primary. Precise, and the best answer.
3. **Read from what you just wrote.** Update the cache on write and read from it, or return the written entity in the write response so the client does not need to read at all. Often the cheapest fix of all, and frequently overlooked.

### Optimistic and pessimistic concurrency

For lost updates, the read model is irrelevant; you need a concurrency control:

- **Optimistic** — every row has a version. Update with `WHERE id = ? AND version = ?`; zero rows affected means someone else won, and the caller retries or is shown a conflict. Excellent when conflicts are rare. This is also what HTTP `ETag` plus `If-Match` gives you at the API level.
- **Pessimistic** — lock the row (`SELECT FOR UPDATE`) for the duration. Correct, and it serialises and can deadlock.
- **Atomic operations** — `UPDATE counter SET n = n + 1` or a database-native atomic increment avoids the read-modify-write entirely. Always prefer this when the operation allows it.

### Isolation levels

A related and frequently confused axis. Consistency is about replicas; isolation is about concurrent transactions on one database.

| Level | Prevents | Still allows |
| --- | --- | --- |
| Read committed | Dirty reads | Non-repeatable reads, phantoms, write skew |
| Repeatable read / snapshot | Non-repeatable reads | Write skew, some phantoms |
| Serializable | Everything | Nothing — at the cost of aborts or locking |

Most databases default to read committed, and most application bugs assume serializable. Knowing your default, and knowing that snapshot isolation permits write skew, is a strong depth signal.

### CRDTs and convergence

When multiple replicas can accept writes, convergence needs a rule. Options:

- **Last write wins** by timestamp. Simple, loses data silently, and depends on clocks you cannot trust.
- **CRDTs** — data types designed so that concurrent updates merge deterministically: counters, sets, and text sequences. Used in collaborative editors and offline-first apps.
- **Application-level merge** — keep both versions and let the user or a business rule decide, as version-vector systems do.

Mentioning CRDTs in a collaborative-editing or offline-sync design is the expected depth; claiming last-write-wins is fine only if you say what gets lost.""",
                    ),
                    (
                        "Design Decisions",
                        """**Decide per operation.** The table from the requirements lesson pays off here: a like count can be seconds stale; an account balance shown before a transfer cannot; a username uniqueness check must be enforced by a constraint regardless of what the read said.

**What does the user see during the inconsistency window?** This is a product question. Options: show the optimistic result immediately (and reconcile), show a pending state, or block until confirmed. Most good products choose optimistic UI plus reconciliation, and saying so shows you think about the whole experience.

**Where is the invariant enforced?** Never in a read. Uniqueness comes from a unique constraint; non-negative inventory comes from a conditional update (`WHERE quantity >= ?`) or a reservation row, not from checking-then-writing.

**How long is the window?** Quantify it. "Replica lag is typically 200 ms, up to 5 seconds under load" is an answer; "eventually" is not.""",
                    ),
                    (
                        "Example",
                        """A social app, consistency chosen per operation:

| Operation | Model | Mechanism | Why |
| --- | --- | --- | --- |
| Post a status | Read-your-writes | Author reads from primary for 10 s | The author not seeing their own post is unacceptable |
| Others see the post | Eventual, seconds | Replicas and cache | Nobody can tell |
| Like count | Eventual, up to a minute | Buffered counter, periodic flush | Exact counts are not a product requirement |
| Follower list | Causal | Same partition as the follow event | You must not see a post from someone you just unfollowed |
| Username availability | Strong at write | Unique constraint on the primary | The read is only a hint; the constraint is the truth |
| Direct message delivery | Ordered per conversation | Partition by conversation | Out-of-order messages are visibly broken |
| Account deletion | Strong | Synchronous, then cascade | Legal requirement, must not be partially applied |

Seven operations, five different answers. A design that applies one model to all of them is either slow or wrong.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Choosing which reads go to replicas and which to the primary
- Deciding cache TTLs and invalidation urgency
- Multi-region designs, where the consistency choice is the architecture
- Collaborative and offline-capable applications
- Any counter, balance, or inventory value""",
                    ),
                    (
                        "Trade-offs",
                        """- **Strong consistency costs latency always and availability under partition.** Quorum or consensus writes add round trips; across regions they add a hundred milliseconds or more.
- **Eventual consistency costs correctness reasoning.** The system is faster and every consumer must handle staleness.
- **Read-your-writes is cheap and usually sufficient** — it buys most of the perceived correctness for a fraction of the cost.
- **Serializable isolation prevents every anomaly** and introduces aborts and retries your application must handle.
- **CRDTs converge without coordination** and constrain what operations you may offer.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Check-then-act races** — read that inventory is 1, two requests both proceed, and you oversell. Fix with a conditional update.
- **Lost updates** from read-modify-write without a version.
- **Write skew under snapshot isolation**, which most people assume is impossible.
- **Last-write-wins with clock skew**, silently discarding the write that was actually later.
- **Cache and database disagreeing indefinitely** after a missed invalidation.
- **Cross-service reads assuming immediacy** — service B reads from service A's replica right after A committed, and gets the old value.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Can this be eventually consistent?"** — Answer per field, not per system, and say what the user sees during the window.
- **"Two users update the same record simultaneously. What happens?"** — Optimistic version check, one gets a 409, the client refetches and retries. Or an atomic operation if the update commutes.
- **"How do you prevent overselling the last item?"** — Conditional update or a reservation row with a unique constraint. Not a read followed by a write.
- **"What is your database's default isolation level, and does it matter here?"** — Read committed, usually, and yes: name the anomaly it permits for this workload.
- **"The user does not see their own change. Fix it."** — The three read-your-writes mechanisms; pick one and justify it.
- **"How stale is acceptable?"** — Give a number and where it came from.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating consistency as a single system-wide setting
- Using "eventual consistency" to mean "occasionally incorrect"
- Enforcing invariants with a read instead of a constraint or conditional write
- Assuming the default isolation level prevents anomalies it does not
- Last-write-wins without acknowledging that data is silently discarded
- Not quantifying the staleness window""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A collaborative document editor. Multiple users type in the same paragraph simultaneously, sometimes offline.

1. What consistency model can you actually offer, and why is linearizability not it?
2. Two users edit the same sentence while one is offline for ten minutes. What happens on reconnect, and what are the three possible product behaviours?
3. The document's *title* is a single field. Does it need the same treatment as the body?
4. A user's cursor position is shared with others. What consistency does that need?

The intended conclusions: the body needs a convergent data type or operational transformation; the title is a single-value conflict where last-write-wins with a visible conflict indicator is acceptable; cursor position is ephemeral and needs no consistency at all beyond recency — three different answers inside one screen.""",
                    ),
                    (
                        "Interview Tip",
                        """Give consistency per operation, with a number: "Feed reads are eventually consistent with about a second of lag, the author's own posts are read-your-writes via session routing, and the payment path is strongly consistent." Three clauses, and you have answered most of the follow-ups in advance.""",
                    ),
                ],
                [
                    "Consistency is a spectrum chosen per operation — pick the weakest model the product tolerates.",
                    "Read-your-writes is cheap and buys most of the perceived correctness; eventual with no session guarantee feels broken.",
                    "Invariants belong in constraints and conditional writes, never in a read-then-write.",
                    "Snapshot isolation permits write skew, and most application code assumes it does not.",
                ],
                [
                    "What consistency does each operation in this system need, and why?",
                    "How do you give a user read-your-writes without sending all reads to the primary?",
                    "Two concurrent updates to the same row — how do you prevent a lost update?",
                    "How do you prevent overselling the last item in stock?",
                ],
            ),
            SD(
                "sd-distributed-transactions",
                "Distributed Transactions and Sagas",
                "Keeping a multi-service operation correct when there is no transaction to wrap it in.",
                14,
                "As soon as an operation spans two databases or two services, the database transaction that used to guarantee all-or-nothing is gone. You have three options: avoid the situation, coordinate with two-phase commit, or accept eventual correctness with compensating actions. Knowing which to use, and why two-phase commit is usually the wrong answer, is a senior-level distinction.",
                [
                    (
                        "Why It Matters",
                        """"Book a flight, a hotel, and a car, all or nothing" is a standard interview prompt precisely because the naive answer — a distributed transaction — is the answer experienced engineers avoid. The interviewer wants to see whether you know why, and what you do instead.

The same shape appears constantly in real systems: charge the card and create the order; debit one account and credit another in a different service; reserve inventory and confirm a booking.""",
                    ),
                    (
                        "Mental Model",
                        """Three strategies, in order of preference.

1. **Avoid it.** Put the data that must change together in the same database, and the operation becomes a local transaction. Service boundaries drawn along transactional boundaries are good boundaries; this is the most underrated answer in the topic.
2. **Saga.** A sequence of local transactions, each with a compensating action to undo it. Eventually consistent, no global lock, and the system is briefly in a partially-applied state that must be visible and correct.
3. **Two-phase commit.** A coordinator gets everyone to prepare, then commits. Atomic and blocking: participants hold locks until the coordinator decides, and if the coordinator dies they hold them indefinitely.

> Memory cue: 2PC buys atomicity with availability. In a system that must stay up, that is usually a bad trade, which is why sagas dominate in practice.""",
                    ),
                    (
                        "How It Works",
                        """### Two-phase commit

- **Prepare** — the coordinator asks each participant to prepare; each writes the change durably and promises it can commit, holding locks.
- **Commit** — if all prepared successfully, the coordinator tells everyone to commit; otherwise everyone aborts.

Why it is avoided:

- **Blocking.** If the coordinator fails between phases, participants are stuck holding locks with no authority to decide. A human or a recovery protocol must intervene.
- **Availability.** The operation succeeds only if every participant *and* the coordinator are available. Availability is the product of all of them.
- **Latency and lock duration.** Locks are held across network round trips, limiting throughput.
- **Support.** Many modern datastores and all third-party APIs simply do not participate.

It remains reasonable inside one trusted boundary — several databases in one datacentre under one team, or a message broker and a database with transactional support. Across services or organisations, no.

### Sagas

Break the operation into local transactions T1…Tn, each with a compensation C1…Cn. On failure at step k, run Ck-1 … C1 in reverse.

**Choreographed** — each service listens for the previous step's event and emits its own. No coordinator. Simple for three steps, unreadable at eight.

**Orchestrated** — a coordinator holds the saga state and invokes each step, handling failures and compensations. Visible, debuggable, testable, and worth the central component for anything non-trivial. Workflow engines exist for exactly this.

The properties you must design for:

- **Compensations are not rollbacks.** They are new business actions with their own effects: a refund is visible to the customer; a cancellation may incur a fee; an email cannot be unsent. Design them as first-class operations.
- **Some steps cannot be compensated.** Order the saga so the irreversible step is last, and make everything before it reversible. This is the single most useful design rule in the topic.
- **Every step and every compensation must be idempotent**, because retries are guaranteed.
- **Intermediate states are visible.** The booking is "pending" for a while, and the product must show that honestly.
- **Compensation can fail too.** It needs retries, and eventually a human-visible exception queue. "Stuck sagas" is a real operational concept.

### Semantic locks and reservations

The pattern that makes sagas safe: instead of committing a resource, *reserve* it with a short expiry.

- Reserve the seat for 10 minutes, then confirm or let it expire.
- Authorise the card (a hold), capture later.
- Mark inventory as allocated rather than sold.

Reservations give you the isolation that a saga otherwise lacks, with a bounded blast radius if something is abandoned. Any design involving booking, ticketing, or inventory should use this, and expiry is what makes it self-healing.

### Idempotency keys and the outbox, again

Two supporting patterns that make any of this work:

- **Idempotency key** per logical operation, stored with its result, so a retry returns the original outcome rather than repeating the effect.
- **Transactional outbox** so the local transaction and the message that triggers the next step cannot diverge.

### The simplest correct pattern

For two-party cases — "write to my database and tell another system" — you rarely need a saga. The outbox plus an idempotent consumer gives you: the local change is atomic, the message is guaranteed to be published eventually, and the consumer applies it exactly once in effect. That covers a very large fraction of real distributed-transaction questions.""",
                    ),
                    (
                        "Design Decisions",
                        """**Can you redraw the boundary?** If two services constantly need atomic updates together, the boundary is wrong. Merging them is often the correct engineering answer and a strong thing to say in an interview.

**What is the user-visible intermediate state?** "Pending", "processing", "partially confirmed". Design it into the API and the UI, because it will exist.

**What is the timeout for each step, and for the whole saga?** Steps hang. A saga without deadlines accumulates stuck instances forever.

**Where does the saga state live?** Durably, in a database, keyed by a saga id, updated after each step. If the orchestrator crashes, it resumes from that state. An orchestrator with in-memory state is not an orchestrator.

**What happens when compensation fails permanently?** An exception queue and a human. Every mature system has one; pretending otherwise is the tell.""",
                    ),
                    (
                        "Example",
                        """Booking a trip: flight, hotel, car. Orchestrated saga.

1. **Create booking** in `PENDING`, generate a saga id. Local transaction.
2. **Reserve hotel** — a hold with a 15-minute expiry. Compensation: release the hold, free.
3. **Reserve car** — same shape. Compensation: release, free.
4. **Book flight** — this one has a cancellation fee and is the least reversible, so it goes last.
5. **Capture payment**, then confirm all three reservations. Move the booking to `CONFIRMED`.

Failure at step 4: release the car and hotel holds. Nothing was charged, no fee was incurred, and the user sees "we could not complete the booking" within seconds.

Failure at step 5 after the flight is booked: retry the capture; if it permanently fails, compensate by cancelling the flight (incurring the fee, which the business absorbs), release the holds, and log a financial exception for reconciliation.

Design details that make it work: every step is idempotent and keyed by saga id plus step; state is persisted after each transition so a crashed orchestrator resumes; every reservation expires on its own so an abandoned saga self-heals; and the whole saga has a deadline after which it is force-compensated and surfaced.

Note the ordering rule doing real work: putting the fee-incurring step last means the common failure cases cost nothing.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Travel, ticketing, and any multi-resource booking
- Order fulfilment spanning payment, inventory, and shipping
- Account provisioning across several systems
- Money movement between services or institutions
- Any workflow involving a third-party API that cannot join your transaction""",
                    ),
                    (
                        "Trade-offs",
                        """- **2PC versus saga.** Atomicity and blocking, versus availability and a visible intermediate state.
- **Choreography versus orchestration.** Decoupled and opaque, versus centralised and comprehensible. Orchestration wins beyond three steps.
- **Reservations versus immediate commitment.** Safety and self-healing, at the cost of holding resources and needing an expiry policy.
- **Compensations versus prevention.** Ordering steps so the irreversible one is last removes whole classes of compensation you would otherwise have to design.
- **Eventual correctness versus user expectation.** Pending states are honest and require product work.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Stuck sagas** — a step never returns, no deadline exists, the instance sits pending forever.
- **Compensation failure** with no exception path, leaving money or inventory in an inconsistent state.
- **Non-idempotent steps**, so a retry books two hotel rooms.
- **Orchestrator state lost on crash**, so the saga cannot be resumed or compensated.
- **Reservations without expiry**, so abandoned attempts permanently consume inventory.
- **Compensating an irreversible action**, discovered at design time if you are lucky and in production if you are not.
- **Hidden partial success** — the API returns failure, but two of three steps committed and nothing reconciles them.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you make these three updates atomic?"** — Ask first whether they can live in one database. If not, saga with compensations, and explain why not 2PC.
- **"What if the compensation fails?"** — Retry with backoff, then an exception queue and a human. Say it plainly; every real system has this.
- **"What does the user see while this is in progress?"** — A pending state, with an expected resolution time and a way to check status.
- **"How do you avoid double-charging on retry?"** — Idempotency key stored with the result, checked before the effect.
- **"Why not two-phase commit?"** — Blocking coordinator, availability as a product of all participants, held locks, and third parties that cannot participate.
- **"How do you detect sagas that are stuck?"** — A sweeper over saga state older than the deadline, plus a metric and an alert on count and age.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Reaching for 2PC as the default answer
- Designing the happy path and treating compensation as an implementation detail
- Assuming compensation is a rollback with no side effects
- Ordering the irreversible step first
- No deadlines, so stuck instances accumulate silently
- Keeping orchestrator state in memory
- Reservations with no expiry""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Money transfer between two banks. Debit account A at bank 1, credit account B at bank 2. Neither can join the other's transaction, and the networks are unreliable.

1. Design the saga, including the states A's balance passes through.
2. The credit fails permanently. What is the compensation, and what does the customer see?
3. The debit response is lost — you do not know whether it happened. What do you do, and what makes that safe?
4. Both transfers are retried by an impatient client. How do you guarantee exactly one transfer?
5. Reconciliation runs nightly and finds a debit with no matching credit. What should the system have recorded so that this is resolvable rather than a mystery?

Part 5 is the one that separates answers: the design must record a transfer id, per-leg state, and timestamps so that any discrepancy is attributable. Systems that move money are built around reconciliation, not around hoping the happy path holds.""",
                    ),
                    (
                        "Interview Tip",
                        """Lead with avoidance: "Can these live in the same database? If yes, this is a local transaction and we are done." Then propose a saga and immediately name the irreversible step and where you placed it. That ordering insight is the part that sounds like you have built one.""",
                    ),
                ],
                [
                    "Prefer redrawing the boundary so the operation is a local transaction; that is the best answer when it is available.",
                    "Sagas trade atomicity for availability: local transactions plus compensating actions and visible intermediate states.",
                    "Order steps so the least reversible one is last, and use reservations with expiry as semantic locks.",
                    "Two-phase commit blocks on its coordinator and makes availability the product of every participant.",
                ],
                [
                    "How do you make an operation spanning three services all-or-nothing?",
                    "Why is two-phase commit usually avoided in microservice architectures?",
                    "What happens when a compensating action fails?",
                    "How do you prevent a retried request from booking twice?",
                ],
            ),
        ],
    )


def _cap_topic() -> dict:
    return _sd_topic(
        "cap-theorem",
        "CAP, PACELC, and Quorums",
        "What the theorem actually says, what it does not, and how quorums let you tune the trade-off per operation.",
        "HARD",
        16,
        [
            SD(
                "cap-theorem",
                "CAP Theorem and Quorums",
                "A precise statement about partitions, not a slogan about databases.",
                13,
                "CAP says that when a network partition occurs, a distributed system must choose between consistency and availability. That is the whole theorem. It is narrower than it is usually quoted, it does not describe everyday operation, and PACELC — which adds the latency trade-off that applies when there is no partition — is the more useful framing in practice.",
                [
                    (
                        "Why It Matters",
                        """CAP is the most frequently misquoted idea in system design interviews. Candidates say "we picked an AP system" as if it were a property of a database rather than a per-operation choice, or use CAP to justify rejecting caches, or describe a single-node database as "CA".

Stating it precisely takes fifteen seconds and immediately separates you from that. More importantly, quorums are the mechanism that turns the abstract trade-off into a tunable dial, and that is what actually appears in designs.""",
                    ),
                    (
                        "Mental Model",
                        """Partition is not a choice. C and A are.

- **Consistency** here means linearizability: every read sees the latest completed write.
- **Availability** means every non-failing node returns a non-error response.
- **Partition tolerance** means the system keeps operating despite dropped messages between nodes.

Since networks partition, P is not optional in any distributed system. So the real statement is: **during a partition, choose C or A.**

- **CP** — refuse requests on the minority side rather than serve possibly-stale data.
- **AP** — serve from both sides, accept divergence, reconcile later.
- **CA** — only meaningful for a single node, which is not a distributed system.

> Memory cue: CAP is about behaviour during a partition. It says nothing about normal operation, which is exactly why PACELC exists.""",
                    ),
                    (
                        "How It Works",
                        """### PACELC

**If there is a Partition, choose Availability or Consistency; Else, choose Latency or Consistency.**

The second half is the one that governs your system 99.9% of the time. Even with a perfectly healthy network, stronger consistency costs round trips: a quorum write must reach a majority, and across regions that is 100 ms or more added to every write.

Classifications people quote: DynamoDB and Cassandra are PA/EL by default (available and low-latency, tunable toward consistency); traditional relational replication is PC/EC in spirit; Spanner is PC/EC, buying consistency with synchronised clocks and paying for it in write latency.

### Quorums

Quorums make the trade-off numeric. With N replicas, a write must be acknowledged by W and a read must consult R:

If W + R > N, then reads and writes overlap on at least one replica

| N | W | R | Behaviour |
| --- | --- | --- | --- |
| 3 | 3 | 1 | Fast reads, writes fail if any replica is down |
| 3 | 2 | 2 | Balanced; survives one node loss for both |
| 3 | 1 | 1 | Fastest, no overlap guarantee — eventual |
| 3 | 1 | 3 | Fast writes, slow and fragile reads |

The common default is three replicas with a write quorum of two and a read quorum of two: a majority both ways, tolerating one failure, with overlap guaranteed.

Two important caveats:

- **Quorum overlap does not give you linearizability by itself.** Concurrent writes, partial write failures, and read repair mean edge cases remain; systems add read repair, hinted handoff, and anti-entropy to converge.
- **Sloppy quorums** — writing to any N available nodes rather than the N that own the key — preserve availability during a partition and explicitly break the overlap guarantee. That is an AP choice, stated numerically.

### Consensus is the CP tool

When you genuinely need agreement — leader election, configuration, distributed locks, sequence numbers — you need consensus: Raft, Paxos, or a system built on them (etcd, ZooKeeper, Consul). These are CP by construction: a minority partition cannot make progress, because progress requires a majority.

That is also why coordination services are deliberately small. You put the metadata that must be consistent in them, and keep the bulk data in a system optimised for availability and throughput.

### Per-operation, not per-system

The most useful correction to the usual framing: a single product mixes both. A payment system is CP for the ledger and AP for the transaction history view. A shopping site is AP for browsing and CP for the final inventory decrement. Saying "this system is AP" is nearly always less accurate than "this operation is AP and this one is CP, and here is why".""",
                    ),
                    (
                        "Design Decisions",
                        """**During a partition, what should each operation do?** Write it down per operation. Reads of a product catalogue: serve stale, obviously. Decrementing inventory for the last unit: refuse rather than oversell — or accept overselling and compensate, which is a legitimate business decision that Amazon famously made for shopping carts.

**What does the user see when you choose C?** An error, a retry, or a degraded mode. "Unavailable" is a design output, not an accident, and the UX should be designed.

**What does the user see when you choose A?** Possibly-stale data, possibly-conflicting writes, and a reconciliation later. Decide whether conflicts are resolved by last-write-wins, by a merge rule, or by the user.

**Where do you put the consistent part?** Concentrate strong consistency in the smallest possible component — a coordination service, a single-shard transaction, a conditional write — and let everything around it be available. Systems that need consistency everywhere are slow everywhere.""",
                    ),
                    (
                        "Example",
                        """An inventory system across two datacentres. The link between them fails.

**CP choice:** only the side with a majority quorum may decrement inventory. Users served by the minority side cannot buy — they see an error or a "try again" message. No item is ever sold twice. Revenue is lost during the partition.

**AP choice:** both sides continue selling from their local view. Nobody is blocked. When the partition heals, the two sides have both sold the last three units of a popular product, and the business absorbs the overselling: apologise, refund, back-order.

Neither is wrong. The choice depends on the cost of each failure, which is a business question. For concert tickets, overselling is a serious problem and CP is right. For a warehouse with deep stock, blocking sales is worse than an occasional back-order and AP is right — which is why real retailers choose AP and build reconciliation.

The senior version of this answer goes further: sell AP against a *buffer*, keeping a reserve that is not offered for sale, so the AP path is safe for the common case and only extreme skew produces an oversell. That is designing around the theorem rather than being constrained by it.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Multi-region designs, where partitions are a real and regular event
- Choosing and tuning quorum settings in Cassandra or DynamoDB
- Deciding what a service does when its coordination dependency is unreachable
- Explaining to non-engineers why "always available and always correct" is not purchasable""",
                    ),
                    (
                        "Trade-offs",
                        """- **CP** — correctness always, downtime during partitions, and higher latency for coordinated operations.
- **AP** — always answers, may answer with stale or conflicting data, and requires a reconciliation strategy you must actually build.
- **Tunable quorums** — per-query control, and a configuration surface people get wrong.
- **Consensus** — genuine agreement, bounded by majority availability and by round-trip latency, which is brutal across regions.
- **PACELC's else branch** — the everyday cost: every step toward stronger consistency is latency you pay on every request, partition or not.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Assuming partitions are rare.** They include not just cable cuts but GC pauses, overloaded nodes, misconfigured firewalls, and cloud network blips. They are routine.
- **Split brain** — both sides believe they are authoritative and both accept writes, because there is no majority requirement.
- **Choosing AP and never building reconciliation**, so divergence accumulates permanently.
- **Choosing CP and having no degraded mode**, so a partition is a total outage rather than a reduced service.
- **Quorum misconfiguration**, such as W=1 R=1 with an expectation of consistency.
- **Cross-region consensus on the write path**, adding 150 ms to every write and surprising everyone.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Is your system CP or AP?"** — Reject the premise politely: it is per operation. Give two examples from your design with opposite answers.
- **"What happens during a network partition?"** — Walk through it concretely: which operations continue, which fail, what the user sees, and what happens when it heals.
- **"Why is CA not an option?"** — Because a distributed system cannot refuse to have partitions; CA describes a single node.
- **"What quorum settings would you choose?"** — N, W, R with the reasoning, and what failure each tolerates.
- **"How do you reconcile after an AP partition heals?"** — Version vectors, last-write-wins with the data-loss caveat, CRDTs, or business-rule merge. Name one and its cost.
- **"Does CAP mean you cannot use a cache?"** — No. A cache is an availability and latency choice with bounded staleness; CAP is about behaviour during a partition, not about every copy of data.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Quoting CAP as "pick two"
- Calling a single-node database CA
- Labelling a whole system AP or CP
- Forgetting PACELC's latency trade-off, which applies far more often
- Choosing AP with no conflict resolution design
- Using CAP as a reason to avoid caching or replication""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A global e-commerce platform runs in three regions. The link between Europe and the others fails for twenty minutes.

For each operation, decide C or A during the partition, say what the user in the isolated region sees, and say what happens at heal time:

1. Browsing the product catalogue.
2. Adding to cart.
3. Checking out and decrementing inventory.
4. Viewing order history.
5. Changing the account password.
6. Applying a single-use discount code.

Item 6 is the interesting one: a single-use code is a uniqueness invariant, which is exactly what cannot be maintained under AP. The options are to refuse code redemption in the isolated region (CP for that one operation), or to accept the risk of double redemption and reconcile by absorbing the cost — and the right answer depends on the value of the code. Being able to reason to that conclusion is the point.""",
                    ),
                    (
                        "Interview Tip",
                        """State CAP in one precise sentence — "during a network partition you must choose between consistency and availability" — then immediately move to PACELC and to which of your operations sit where. The precision plus the immediate application is what makes it a strength rather than a recited fact.""",
                    ),
                ],
                [
                    "CAP applies only during a partition: choose consistency or availability; CA describes a single node.",
                    "PACELC adds the everyday trade-off — even without a partition, consistency costs latency.",
                    "Quorums make the dial numeric: W + R > N gives overlap, and N=3, W=2, R=2 is the common balance.",
                    "Make the choice per operation and concentrate strong consistency in the smallest possible component.",
                ],
                [
                    "State the CAP theorem precisely. What does it not say?",
                    "Is your system CP or AP, and why is that question slightly wrong?",
                    "What happens to each operation during a partition, and at heal time?",
                    "What quorum settings would you choose and what failure do they tolerate?",
                ],
            ),
        ],
    )


def _distributed_topic() -> dict:
    return _sd_topic(
        "distributed-systems",
        "Distributed Systems Reality",
        "The rules that hold under every multi-machine design: unreliable networks, duplicate messages, coordination, and the patterns that keep a degradation from becoming an outage.",
        "HARD",
        17,
        [
            SD(
                "distributed-systems",
                "The Fallacies and What They Cost",
                "Networks drop, clocks lie, and nodes fail in ways that look like slowness — design for it or be surprised by it.",
                13,
                "A distributed system is one where a machine you have never heard of can make your code fail. The discipline is mostly a set of habits built from a small number of hard facts: the network is unreliable, latency is not zero, you cannot tell a dead node from a slow one, and time is not a global variable. Senior interviews live in this territory.",
                [
                    (
                        "Why It Matters",
                        """Almost every "what happens when X fails?" question is really asking whether you have internalised these facts. A candidate who has will say things like "the caller cannot distinguish a timeout from a failure, so the write may or may not have happened — which is why it needs an idempotency key". A candidate who has not will say "we'd retry".""",
                    ),
                    (
                        "Mental Model",
                        """The eight fallacies of distributed computing, as design obligations rather than trivia.

| Fallacy | What it forces you to design |
| --- | --- |
| The network is reliable | Retries, timeouts, idempotency |
| Latency is zero | Fewer round trips, batching, locality |
| Bandwidth is infinite | Pagination, compression, payload limits |
| The network is secure | TLS, authn/authz between services |
| Topology does not change | Service discovery, no hardcoded addresses |
| There is one administrator | Versioned contracts, independent deploys |
| Transport cost is zero | Serialisation and egress cost as real budget items |
| The network is homogeneous | Protocol negotiation, varied client behaviour |

> Memory cue: every one of these is a thing that is true on your laptop and false in production.""",
                    ),
                    (
                        "How It Works",
                        """### The two-generals problem, practically

You send a request. You get no response. Three possibilities, and you cannot distinguish them:

1. The request never arrived.
2. It arrived, executed, and the response was lost.
3. It arrived and is still executing.

This is why "did my write succeed?" is unanswerable in general, and why every unsafe retry is a potential duplicate. It is the origin of idempotency keys, of at-least-once delivery, and of reconciliation processes.

### Failure detection

You detect failure with timeouts, and a timeout cannot distinguish a dead node from a slow one. Consequences:

- **Too short** — healthy but slow nodes are declared dead, work is reassigned, load increases, more nodes look slow. A cascading failure built entirely out of impatience.
- **Too long** — real failures go unnoticed and requests hang.

Refinements worth naming: **phi-accrual failure detection**, which outputs a suspicion level rather than a boolean and adapts to observed variance; and **heartbeats with leases**, where a node holds a time-bounded right to act, so a partitioned node stops acting on its own when its lease expires.

### Time

- **Wall clocks** (`now()`) drift, jump on NTP correction, and can go backwards. Never use them to order events or measure durations.
- **Monotonic clocks** only go forwards. Use them for timeouts and elapsed time.
- **Clock skew** between machines is typically milliseconds and occasionally seconds. Last-write-wins by timestamp across machines silently discards the write that was actually later.
- **Logical clocks** — Lamport timestamps give a total order consistent with causality; vector clocks detect concurrency. Use these when ordering matters and you cannot trust wall clocks.
- **Spanner's TrueTime** is the exception that proves the rule: with GPS and atomic clocks, uncertainty is bounded to a few milliseconds, and the system *waits out* that uncertainty to make timestamps meaningful. Global consistency is purchased with hardware and latency.

### Partial failure

The defining property. In a single process, either everything runs or the process dies. In a distributed system, three of five calls succeeded, one timed out ambiguously, and one returned a stale answer. Every operation needs an answer to "what if only part of this happened?"

### Grey failure

Worse than a crash: the node is up, health checks pass, and it is returning errors, wrong answers, or ten times normal latency. Clean crashes are easy; grey failures are what cause long incidents. Mitigations: health checks that exercise real work, outlier detection on error rate and latency rather than liveness alone, and client-side hedging or ejection.

### Retries are dangerous

A retry multiplies load at the moment a system is least able to take it. Three obligations:

1. **Only retry idempotent operations**, or operations carrying an idempotency key.
2. **Exponential backoff with jitter.** Without jitter, all clients retry in the same instant forever.
3. **A retry budget.** Cap retries as a fraction of total requests so a widespread failure cannot triple the load.

Note the amplification arithmetic: if each of three layers retries three times, one user request can become 27 backend calls. Retry at one layer, ideally the outermost one that can make a sensible decision.

### Idempotency, briefly

Covered fully in the next lesson, but it is the answer to most of the above: if an operation can be safely repeated, ambiguity stops being dangerous.""",
                    ),
                    (
                        "Example",
                        """A payment service calls a provider. The call times out after 5 seconds.

The naive handler retries, and the customer is charged twice — because the first call did succeed, and the response was lost.

The correct design: generate an idempotency key before the first attempt and send it on every retry. The provider recognises the key and returns the original result. If the provider does not support keys, the fallback is a status query — "does a charge with reference X exist?" — before retrying, and, failing that, marking the payment `UNKNOWN` and resolving it in reconciliation rather than guessing.

This example is worth having ready, because "what if the response is lost?" is one of the most commonly asked follow-ups in the entire subject.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any call between two services
- Designing retry and timeout policy
- Ordering events across machines
- Deciding what to do with an ambiguous write outcome""",
                    ),
                    (
                        "Trade-offs",
                        """- **Aggressive timeouts** free resources quickly and kill healthy-but-slow requests.
- **Retries** improve success rates for transient faults and amplify load during real outages.
- **Strong ordering** simplifies reasoning and costs coordination and throughput.
- **More nodes** give capacity and fault tolerance, and add failure modes and coordination cost.
- **Reconciliation** catches everything the happy path misses, and is real work nobody budgets for until the first incident.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Retry storms** converting a degradation into an outage.
- **Duplicate side effects** from ambiguous timeouts.
- **Clock-based ordering** discarding the wrong write.
- **Cascading failure** where one slow dependency exhausts thread pools across the fleet.
- **Grey failures** passing health checks while serving garbage.
- **Timeouts longer at the caller than the callee**, so work continues after nobody is listening.
- **Unbounded queues in front of an overloaded service**, so recovery takes longer than the incident.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"The response is lost. Did the write happen?"** — Unknowable; describe the idempotency key and the status-query fallback.
- **"How do you know a node is down?"** — Timeouts and heartbeats, and admit you cannot distinguish dead from slow. Name leases.
- **"How do you order events across machines?"** — Not by wall clock. Logical clocks, a sequencer, or a single partition per entity.
- **"Your retries made an outage worse. Why, and what changes?"** — Amplification arithmetic, then jitter, budgets, and circuit breaking.
- **"What if a node is up but broken?"** — Grey failure: outlier ejection on error rate and latency, health checks that do real work.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Retrying without backoff, jitter, idempotency, or a budget
- Ordering by `now()` across machines
- Assuming a timeout means the operation did not happen
- Designing only for clean crashes
- Retrying at every layer of the stack
- No reconciliation for the cases the happy path cannot cover""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Service A calls B, which calls C. Each has a 10-second timeout and retries three times.

1. What is the worst-case latency a user experiences, and what is wrong with it?
2. How many calls can C receive from one user request?
3. C slows to a 9-second response. Trace what happens to A, B, and the user.
4. Fix it: set timeouts and retry policy for each layer, and say the rule you used.

The rule you should arrive at: each caller's timeout must be meaningfully shorter than its caller's remaining budget, retries happen at one layer only, and a deadline is propagated down the call chain so nobody works on a request that has already been abandoned.""",
                    ),
                    (
                        "Interview Tip",
                        """When you describe any cross-service call, state the timeout, whether it retries, and whether it is idempotent. Three short clauses that demonstrate you know a network call is not a function call.""",
                    ),
                ],
                [
                    "A timeout cannot distinguish a lost request, a lost response, or slow work — so writes need idempotency keys.",
                    "Never order events by wall-clock time across machines; use logical clocks or a single ordering point.",
                    "Retries need backoff, jitter, a budget, and to happen at one layer only.",
                    "Grey failures — up but wrong or slow — cause longer incidents than clean crashes.",
                ],
                [
                    "A request times out. Did it succeed, and what do you do?",
                    "Why is retrying dangerous, and how do you make it safe?",
                    "How do you order events happening on different machines?",
                    "How do you detect a node that is up but broken?",
                ],
            ),
            SD(
                "sd-idempotency",
                "Idempotency and Exactly-Once Effects",
                "The single most useful property in distributed systems, and how to actually implement it.",
                12,
                "An operation is idempotent if performing it twice has the same effect as performing it once. Because networks make duplicates inevitable, idempotency is what converts \"this might be processed twice\" from a correctness disaster into a non-event. Nearly every interview question about duplicate charges, duplicate messages, or duplicate jobs is asking whether you know how to build it.",
                [
                    (
                        "Why It Matters",
                        """Duplicates are not an edge case; they are guaranteed. Clients retry, load balancers retry, queues redeliver, users double-click, mobile apps resend after a network switch, and operators replay a backlog after an incident.

The interview signal is specific: claiming "exactly-once" is a red flag, while "at-least-once delivery with idempotent handling, implemented like this" is the answer senior engineers give.""",
                    ),
                    (
                        "Mental Model",
                        """Two ways to be safe against duplicates.

1. **Naturally idempotent operations** — the effect does not accumulate. `SET status = 'shipped'` is idempotent; `increment attempts` is not. Design operations this way when you can; it removes all bookkeeping.
2. **Deduplicated operations** — the effect accumulates, so you record that you have already done it, keyed by a client-supplied identifier.

Request + key → Seen before? → Return stored result : Execute and store

The key insight people miss: the dedup record and the effect must be written **in the same transaction**. Otherwise you can perform the effect and crash before recording it, and the retry does it again.""",
                    ),
                    (
                        "How It Works",
                        """:::viz idempotency {"mode": "without"}

### Where the key comes from

The **client** generates it, not the server, because the whole point is that the retry must carry the *same* key as the original attempt. A server-generated id changes on every attempt and is useless.

Common shapes:

- A UUID generated per logical user action, held for the duration of retries.
- A business key that is naturally unique: `(order_id, step_name)` for a saga, or the payment provider's `event_id` for a webhook.

### Implementation

The table:

`idempotency_keys(key PK, request_hash, status, response_body, created_at)`

The flow:

1. Begin a transaction.
2. Insert the key with status `in_progress`. A unique-constraint violation means another attempt is in flight or complete.
3. Perform the effect.
4. Update the row to `completed` with the stored response.
5. Commit.

On a duplicate:

- `completed` — return the stored response, with the original status code.
- `in_progress` — return `409 Conflict` or `425 Too Early`, and let the client retry shortly. Do not execute concurrently.

Two details that make it correct in practice:

- **Store the request hash** and reject a reused key with a different body. Otherwise a client bug silently returns the wrong answer for a different request.
- **Expire keys** after a bounded window — 24 hours is typical — and be explicit that a retry after expiry is no longer protected.

### Idempotency in consumers

For queue consumers, the same pattern with the message id:

- Insert `(message_id)` into a processed table in the same transaction as the effect. A duplicate violates the unique constraint and is skipped.
- Or make the write an upsert keyed by a business key, so reapplying is harmless.
- Or include a version and ignore messages older than the current state — which also protects against out-of-order redelivery.

### Natural idempotency patterns

Prefer these; they need no table:

- **Absolute rather than relative.** `SET balance = 500` is idempotent; `balance = balance - 50` is not. When the operation is inherently relative, use a keyed ledger entry instead and derive the balance.
- **Upsert by business key.** `INSERT ... ON CONFLICT DO UPDATE` keyed by something stable.
- **Conditional state transitions.** `UPDATE orders SET status='shipped' WHERE id=? AND status='paid'` — the second execution affects zero rows and is a no-op.
- **PUT rather than POST.** Placing the resource at a client-chosen URL makes the operation idempotent by construction.
- **Ledger append with a unique key.** For money, never mutate a balance: append entries with a unique transaction id and sum them. A duplicate entry is rejected by the constraint, and the balance is always derivable and auditable.

### Concurrency, not just sequence

The subtle case: two copies of the same request arrive *simultaneously*, not one after the other. The unique constraint on the key is what makes this safe — one insert wins, the other fails and takes the duplicate path. A check-then-insert without a constraint has a race and will eventually double-execute.""",
                    ),
                    (
                        "Design Decisions",
                        """**Which operations need keys?** Every non-idempotent state-changing operation exposed to a network: payments, order creation, message sends, job submissions, outbound webhooks.

**How long do you retain keys?** Long enough to cover client retry windows and operator replays. 24 hours to 7 days is typical; storage is trivial relative to the cost of a duplicate charge.

**What scope is the key?** Per endpoint and per tenant, not global, so two tenants cannot collide and a key reused on a different endpoint is rejected.

**Where does the dedup record live?** Ideally the same database as the effect, so one transaction covers both. If the effect is in another system, you need a saga or an outbox — this is exactly where distributed transactions come back.

**What about read operations?** Naturally idempotent; no work needed. This is why `GET` retries are safe and worth saying.""",
                    ),
                    (
                        "Example",
                        """A payments API.

`POST /v1/charges` with header `Idempotency-Key: 7f3c...`, body `{amount: 5000, currency: "usd", source: "card_x"}`.

First request: insert the key, call the processor, store the result, return `201 {charge_id: "ch_123", status: "succeeded"}`.

The client's network drops the response and it retries with the same key: the insert conflicts, the stored response is returned, `201 {charge_id: "ch_123"}`. One charge.

Two copies race: one insert wins and proceeds, the other sees `in_progress` and gets `409`; the client retries in a second and gets the stored result.

The client reuses the key with `amount: 9000`: the request hash differs, so the API returns `422` rather than silently returning the old charge. This is the detail that catches real client bugs.

Twenty-five hours later the key has expired and the same request creates a second charge. That is expected behaviour, and the API documents the window — because the alternative, keeping keys forever, is not free and the client should not be relying on it.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Payment and financial APIs
- Order and booking creation
- Queue and stream consumers
- Inbound webhooks from providers that retry
- Job submission and scheduled task execution
- Any public API where clients retry""",
                    ),
                    (
                        "Trade-offs",
                        """- **Storage and a write on every request** versus the cost of a duplicate. Almost always worth it for anything with a side effect.
- **Key retention window** — longer is safer and costs storage; expiry must be documented.
- **Returning the stored response** is correct and can surprise a client expecting fresh data. It is still better than re-executing.
- **Natural idempotency versus a dedup table.** Natural is simpler and cheaper and constrains the operations you can offer.
- **Rejecting on a body mismatch** catches bugs and produces support tickets for clients who reuse keys carelessly.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Server-generated keys**, which change on retry and protect nothing.
- **Effect and dedup record written separately**, so a crash between them allows a duplicate.
- **Check-then-insert without a unique constraint**, which races under concurrency.
- **No handling of the in-progress state**, so simultaneous duplicates both execute.
- **Keys expiring faster than the client's retry policy.**
- **Assuming the queue provides exactly-once**, so the consumer is not idempotent at all.
- **Idempotent write, non-idempotent side effect** — the row is upserted correctly and an email is sent twice, because the email call was outside the transaction.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you guarantee this is not processed twice?"** — Idempotency key, unique constraint, effect and record in one transaction, and what happens for a concurrent duplicate.
- **"Who generates the key?"** — The client, and explain why a server-generated one is useless.
- **"What if the same key arrives with different content?"** — Reject; store a request hash.
- **"What if the effect spans two systems?"** — One transaction is no longer possible: outbox plus idempotent consumer, or a saga.
- **"Is this operation naturally idempotent?"** — A question worth asking yourself out loud about each write in your design; often the answer is yes with a small change.
- **"How long do you keep the keys?"** — Give a window and say what happens after it.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Claiming exactly-once delivery
- Writing the dedup record outside the transaction that performs the effect
- Ignoring concurrent duplicates and only handling sequential ones
- Making the database write idempotent but leaving an external side effect unprotected
- Never expiring keys, or expiring them too aggressively
- Using relative updates where an absolute or ledger-based design would be naturally safe""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design idempotency for a "send money" endpoint that debits one account, credits another, and sends a push notification.

1. Where does the key come from and what is its scope?
2. What exactly is written in the transaction?
3. The notification is sent by a third-party service outside your database. How do you avoid sending it twice, and is "at most once" or "at least once" the better failure for a notification?
4. Two identical requests arrive 5 ms apart on different servers. Trace both.
5. The service crashes after the debit and before the credit. What recovers it, and how does idempotency help?

Part 3 has a genuinely interesting answer: notifications are usually better at-least-once (a duplicate push is mildly annoying; a missing one is a support ticket), whereas the money movement must be exactly-once in effect. Different guarantees for different effects inside one operation is the insight.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the full sentence: "Delivery is at-least-once, so the handler is idempotent — the client supplies a key, and we write the dedup record in the same transaction as the effect, with a unique constraint so concurrent duplicates are safe too." That one sentence answers three follow-ups at once.""",
                    ),
                ],
                [
                    "Duplicates are guaranteed; idempotency is what makes them harmless.",
                    "The client generates the key, and the dedup record must be written in the same transaction as the effect.",
                    "A unique constraint — not a check-then-insert — is what makes concurrent duplicates safe.",
                    "Prefer naturally idempotent designs: absolute updates, upserts, conditional transitions, and keyed ledger appends.",
                ],
                [
                    "How do you make a payment endpoint safe to retry?",
                    "Why must the client generate the idempotency key?",
                    "What happens when two identical requests arrive simultaneously?",
                    "How do you handle idempotency when the effect spans two systems?",
                ],
            ),
            SD(
                "sd-coordination",
                "Leader Election, Consensus, and Distributed Locks",
                "When nodes must agree, how they do it, and why you should need it as rarely as possible.",
                13,
                "Sometimes exactly one node must do something: run a scheduled job, own a partition, hold a lock on a resource. Coordination is how a group of machines agrees on that, and it is expensive, subtle, and the source of some of the most damaging bugs in distributed systems. The best coordination design is usually the one that needs the least of it.",
                [
                    (
                        "Why It Matters",
                        """Two interview moments need this: "you have a cron job and ten instances of the service — how do you run it once?" and "how do you stop two workers from processing the same item?" Both look simple and both have a wrong answer that is extremely common: a lock implemented with a single `SET NX` and no fencing, which does not actually guarantee mutual exclusion.

Understanding why it does not is a genuine senior signal.""",
                    ),
                    (
                        "Mental Model",
                        """Coordination means agreement despite failures, and agreement requires a majority.

Propose → Majority agrees → Decision is durable

- **Consensus** — a group agrees on a value even if a minority fails. Raft and Paxos are the algorithms; etcd, ZooKeeper, and Consul are the systems.
- **Leader election** — consensus applied to "who is in charge", usually with a lease so leadership expires if the leader stops renewing.
- **Distributed lock** — consensus applied to "who may touch this resource right now".

> Memory cue: a majority is required, so a coordination service is CP. A minority partition cannot elect anyone, which is exactly the property that prevents split brain.""",
                    ),
                    (
                        "How It Works",
                        """### Raft, at the level an interview needs

- Nodes are follower, candidate, or leader.
- A follower that hears nothing from a leader within a randomised election timeout becomes a candidate and requests votes.
- A candidate with a majority of votes becomes leader for a term.
- All writes go to the leader, which replicates to followers; an entry is committed once a majority has it.
- A minority partition cannot elect a leader or commit entries, so it makes no progress — and therefore cannot diverge.

You do not need to implement it. You need to know that it needs a majority, that it tolerates the failure of a minority, and that it is what etcd and ZooKeeper give you.

### Leader election in practice

Three approaches:

1. **A coordination service.** Contend for a key in etcd or ZooKeeper with a lease; the holder is the leader and renews continuously. Correct, and adds a dependency.
2. **The database you already have.** A row with an owner and an expiry, claimed by a conditional update. Correct enough for most cron-style problems and uses no new infrastructure — often the right answer for a small system, and worth proposing.
3. **Built into the platform.** Kubernetes leases, a cloud scheduler with a singleton guarantee, or a framework's built-in election.

### Distributed locks and why the naive one is broken

The common recipe: `SET lock:resource <token> NX PX 30000`, do the work, delete the key if the token matches.

The failure it does not survive:

1. Client A acquires the lock with a 30-second TTL.
2. Client A pauses — a long garbage collection, a hypervisor stall, a network delay — for 40 seconds.
3. The lock expires. Client B acquires it and starts working.
4. Client A resumes, believing it still holds the lock, and writes.

Both clients are now in the critical section, and no amount of Redis configuration fixes it, because the problem is that A cannot know time passed.

**Fencing tokens** are the fix: the lock service issues a monotonically increasing token with each grant. Every write to the protected resource includes the token, and the resource *rejects any write with a token lower than the highest it has seen*. A's stale write carries token 33, the resource has already seen 34, and the write is refused.

The crucial part: fencing requires the protected resource to participate. If the downstream store cannot check a token, you cannot have a correct distributed lock, and you should design so you do not need one.

### Avoiding coordination

The strongest designs need less of it:

- **Partition the work.** Assign each worker a shard; no two workers can collide because they own disjoint keys. This replaces mutual exclusion with static ownership.
- **Make the operation idempotent.** If running twice is harmless, you do not need a lock. This is very often the cheapest path.
- **Use a single-writer database transaction.** `SELECT FOR UPDATE` or a conditional update within one database is a real lock with real guarantees, and far simpler than a distributed one.
- **Use a queue.** A message is delivered to one consumer at a time; visibility timeouts give you a lease for free — with the same expiry caveat, so consumers should still be idempotent.
- **Optimistic concurrency.** Let both proceed and have one lose on a version check.

The interview-worthy line: "I would avoid a distributed lock here by partitioning the work by key, so each worker owns a disjoint set and mutual exclusion is structural rather than coordinated."

### What belongs in a coordination service

Small, critical metadata only: leader identity, cluster membership, configuration, shard assignment, feature flags. It is CP, so if it is unavailable your system must degrade gracefully — typically by continuing with the last-known configuration rather than stopping. Putting high-volume data or per-request calls into ZooKeeper or etcd is a well-known way to take down a cluster.""",
                    ),
                    (
                        "Design Decisions",
                        """**Do you actually need exclusivity, or just correctness?** These are different. Idempotent work run twice is correct without any lock.

**What happens when the leader dies?** Quantify: lease duration plus election time, typically a few seconds, during which the singleton work is not happening. Is that acceptable? For a nightly report, yes. For a market data feed, no — and then you need hot standby with fencing.

**What happens when the coordination service is unavailable?** Decide explicitly: stop doing the exclusive work (safe, unavailable) or continue with the last lease (available, risks split brain). For most background jobs, stopping is right.

**How long is the lease?** Short leases mean fast failover and more risk of a spurious expiry during a pause. Long leases mean the opposite. Typical values are 10–30 seconds with renewal at a third of that.""",
                    ),
                    (
                        "Example",
                        """A billing job must run once an hour across twelve service instances.

**Wrong:** every instance runs it on a cron; twelve invoices per customer.

**Naive:** a Redis lock with a TTL. Mostly works, and fails exactly when a GC pause exceeds the TTL — producing duplicate invoices occasionally, which is the worst failure mode because it is rare enough to be dismissed as a mystery.

**Better:** make the job idempotent. Each invoice row has a unique constraint on `(customer_id, billing_period)`. Now if two instances run it, the second one's inserts conflict and are skipped. Correctness no longer depends on the lock at all — the lock becomes an optimisation to avoid wasted work rather than a correctness mechanism.

**Better still, if the work is expensive:** partition customers across instances by `hash(customer_id) mod 12`, with assignment held in a coordination service. Each instance bills only its own slice. No mutual exclusion is required anywhere, the work is parallel, and a failed instance's slice is reassigned by the same coordination service.

The progression — from lock, to idempotency, to partitioning — is the answer an interviewer is hoping to hear, because it shows you treat coordination as a cost to be minimised.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Singleton background jobs across a horizontally scaled service
- Shard and partition ownership assignment
- Primary election for a replicated datastore
- Cluster membership and dynamic configuration
- Mutual exclusion on an external resource that cannot enforce its own concurrency""",
                    ),
                    (
                        "Trade-offs",
                        """- **Correctness versus availability.** Consensus is CP: a minority partition stops rather than risking divergence.
- **Lease length.** Fast failover versus spurious expiry under pauses.
- **A coordination service versus your database.** A new dependency with real guarantees, versus reusing infrastructure you already operate.
- **Locking versus idempotency.** Locks prevent concurrency; idempotency makes concurrency harmless. The second is usually cheaper and more robust.
- **Central coordination versus static partitioning.** Flexible rebalancing versus no coordination at all.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Locks without fencing tokens**, silently allowing two holders after a pause.
- **Split brain** when there is no majority requirement, so two nodes both act as leader.
- **Coordination service overload** from per-request calls or high-volume data.
- **Clock-based lock expiry** with skewed clocks, so a lock expires earlier or later than anyone thinks.
- **Leader failover gap** with no design for what happens during it.
- **A leader that keeps its lease but stops doing work** — liveness looks fine and nothing progresses.
- **Lock held across a long operation**, so a slow call blocks the entire system.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"You have ten instances and one cron job. How do you run it once?"** — Lease-based election, or better, make it idempotent and let duplication be harmless. Say both.
- **"Is your Redis lock actually safe?"** — No, not without fencing. Explain the pause scenario. This is the question that separates candidates.
- **"What if the lock holder dies?"** — The lease expires and another node acquires. Say how long that takes and what happens to partial work.
- **"Why not just use a database row as a lock?"** — Frequently you should; it is transactional and you already run it. Name the limitation: it does not help across systems that cannot see that database.
- **"What happens if ZooKeeper is down?"** — Your system must degrade, not stop. Decide whether exclusive work pauses or continues on last-known state.
- **"Can you avoid coordination entirely here?"** — Partitioning and idempotency. The best answer to most coordination questions.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating a Redis `SET NX` lock as a correctness guarantee
- Not knowing about fencing tokens
- Ignoring the failover window
- Making a coordination service a per-request dependency
- Using a lock where idempotency or partitioning would remove the need
- Assuming clock-based TTLs are reliable under GC and virtualisation pauses""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A job scheduler runs 10,000 scheduled tasks per minute across a pool of 20 workers. Each task must execute once per schedule.

1. How do workers claim tasks without two claiming the same one?
2. A worker claims 50 tasks and dies. What happens to them, and how long until they are retried?
3. A worker is paused for 60 seconds by garbage collection, its claims expire, another worker takes them, and then the first wakes up and finishes. What have you got, and how do you prevent it?
4. Can you design this so that the answer to (3) does not matter?
5. How does this behave if the coordination store is unavailable for two minutes?

Part 4 is the target: if task execution is idempotent and results are written keyed by `(task_id, scheduled_time)`, the double execution is absorbed by a unique constraint, and the whole class of problems in (3) becomes a wasted-CPU issue rather than a correctness one.""",
                    ),
                    (
                        "Interview Tip",
                        """Whenever a lock appears in your design, say the sentence: "A lease-based lock can be violated by a long pause, so either the protected resource checks a fencing token, or the operation is idempotent and duplication is harmless." Then say which one you chose.""",
                    ),
                ],
                [
                    "Consensus needs a majority, which is why a minority partition cannot elect a leader and cannot diverge.",
                    "A TTL-based distributed lock is not safe without fencing tokens the protected resource actually checks.",
                    "Prefer removing the need for coordination: partition the work, or make it idempotent.",
                    "Keep coordination services small and off the per-request path, and decide how you degrade when they are down.",
                ],
                [
                    "How do you run a scheduled job exactly once across ten instances?",
                    "Why is a Redis lock with a TTL not sufficient, and what fixes it?",
                    "What happens during leader failover, and how long does it take?",
                    "How would you design this so no distributed lock is needed at all?",
                ],
            ),
            SD(
                "sd-resilience-patterns",
                "Timeouts, Retries, Circuit Breakers, and Graceful Degradation",
                "The patterns that stop one slow dependency from taking down everything.",
                13,
                "Most large outages are not caused by a component failing. They are caused by a component getting slow, and everything upstream waiting for it, retrying it, and exhausting its own resources. Resilience engineering is the set of patterns that turns a dependency's bad day into a degraded feature instead of a total outage.",
                [
                    (
                        "Why It Matters",
                        """"What happens when this service is slow?" is a better interview question than "what happens when it fails", because failure is easy — you get an error and handle it. Slowness is what kills systems: threads block, pools exhaust, queues grow, health checks time out, and the failure propagates upstream through resource exhaustion rather than through error codes.

Candidates who can describe that mechanism, and name the patterns that break it, are describing real production experience.""",
                    ),
                    (
                        "Mental Model",
                        """Every call to a dependency needs four decisions.

Timeout → Retry policy → Circuit breaker → Fallback

1. **Timeout** — how long before I give up. Mandatory, always.
2. **Retry** — whether and how often to try again, safely.
3. **Circuit breaker** — when to stop trying at all for a while.
4. **Fallback** — what I do instead: cached data, a default, a reduced feature, or a clean error.

A dependency with no timeout and no fallback is a dependency that can take you down.""",
                    ),
                    (
                        "How It Works",
                        """:::viz circuit-breaker {"threshold": 3, "cooldown": 4, "calls": ["ok", "fail", "fail", "fail", "ok", "ok", "wait", "wait", "ok", "ok", "fail"]}

### Timeouts

Set them from the dependency's observed p99, not from a round number. Three separate values matter: connect timeout (short — a healthy TCP connect is milliseconds), read timeout (from p99 plus headroom), and total deadline for the whole operation.

**Deadline propagation** is the pattern worth naming: the caller passes its remaining budget downstream, so a service does not spend three seconds on work whose requester gave up two seconds ago. gRPC does this natively; in HTTP you pass a deadline header. Without it, an overloaded system spends most of its capacity on abandoned work — which is one of the main reasons overload is so hard to recover from.

The rule that prevents cascades: **each layer's timeout must be shorter than its caller's remaining budget.** If the frontend waits 10 s, the API should wait 3 s, and the downstream 1 s.

### Retries

Retry only what is safe: idempotent operations, or ones carrying an idempotency key. Then:

- **Exponential backoff** — 100 ms, 200 ms, 400 ms.
- **Jitter** — randomise, or every client retries in the same instant. Full jitter (a random value between zero and the backoff) is the standard recommendation.
- **A cap** on attempts and on total elapsed time.
- **A retry budget** — allow retries only up to, say, 10% of total requests. This is the mechanism that makes retries safe during a widespread failure, and few candidates mention it.
- **Retry at one layer.** Three layers retrying three times is 27 calls from one request.

### Circuit breakers

A state machine that stops calling a dependency that is clearly failing.

| State | Behaviour | Transition |
| --- | --- | --- |
| Closed | Calls pass through; failures counted | Error rate over threshold → Open |
| Open | Calls fail immediately, no network attempt | After a cool-down → Half-open |
| Half-open | A few trial calls | Success → Closed; failure → Open |

What it buys you: failing fast instead of accumulating blocked threads, and giving the struggling dependency room to recover instead of hammering it.

Tuning matters: trip on error *rate* over a rolling window with a minimum request volume, not on a raw count — otherwise a low-traffic endpoint trips on two errors. And consider tripping on latency, not just errors, because slow is the dangerous case.

### Bulkheads

Isolate resources so one dependency cannot consume all of them. Separate connection pools or thread pools per downstream, and concurrency limits per dependency. Named after ship compartments: a flooded compartment does not sink the vessel.

The classic failure this prevents: one slow dependency consumes every thread in a shared pool, and endpoints that do not even call it start failing.

### Load shedding and backpressure

When you cannot keep up, rejecting work is better than accepting all of it and failing everything slowly.

- **Shed by priority.** Reject anonymous or low-value traffic first; protect checkout and login.
- **Queue with limits, not unbounded.** An unbounded queue converts a capacity problem into a latency problem and then into an outage.
- **Reject early.** Drop at the edge before consuming downstream resources.
- **Adaptive concurrency limits** — measure latency and reduce allowed concurrency automatically when it degrades, rather than using a fixed number.

`503` with `Retry-After` is a cooperative, honest answer. Accepting a request you cannot serve is not.

### Graceful degradation

Decide in advance what the product looks like with each dependency missing:

| Dependency down | Degraded behaviour |
| --- | --- |
| Recommendation service | Show a curated static list |
| Search | Show browse categories and a message |
| Review service | Hide the review section, keep the page |
| Image CDN | Serve placeholders |
| Payments | Queue the order as pending, notify the user |

The product question is which features are load-bearing. An e-commerce page without reviews still sells; without prices it does not. Presenting this as a table in an interview is a strong move because it shows you think in terms of user experience under failure, not just uptime.

### Hedged requests

For latency-critical reads, send a second request to another replica if the first has not returned by p95, and take whichever answers first. Costs a few percent extra load and dramatically cuts tail latency. Only valid for idempotent reads, and worth naming when the interviewer asks about p99.""",
                    ),
                    (
                        "Design Decisions",
                        """**Is this dependency critical or optional?** Mark every one. Optional dependencies get short timeouts, no retries, an aggressive breaker, and a fallback. Critical ones get more patience and a clear failure story.

**What is the fallback?** Options in order of preference: serve stale cached data, serve a default, degrade the feature, then fail with a clear error. Have an answer for every dependency.

**Where do you retry?** Once, at the layer that can make a meaningful decision — usually the outermost service that owns the user-facing operation.

**Do you fail open or closed?** Depends on the dependency: an authorisation service failing open is a security hole; a recommendation service failing closed removes a feature for no reason. Decide per dependency and say so.""",
                    ),
                    (
                        "Example",
                        """A product page calls four services: catalogue (critical), pricing (critical), reviews (optional), recommendations (optional).

The recommendation service degrades to five-second responses.

**Without protection:** each request blocks a thread for five seconds. The thread pool fills. Requests that only need the catalogue also block. The whole page is down because of an optional widget, and health checks start failing so the load balancer removes nodes, concentrating load on the rest.

**With protection:** recommendations have a 200 ms timeout, no retries, their own bulkhead of 20 concurrent calls, and a circuit breaker that trips at a 50% error rate over 20 requests. Within seconds the breaker opens; calls fail instantly; the page renders with a curated fallback list. Users notice nothing except slightly less relevant suggestions. An alert fires. The breaker probes every 30 seconds and closes when the dependency recovers.

That contrast — the same failure producing an outage or a barely-visible degradation — is the whole argument for the patterns, and it is the story to tell.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Every synchronous call between services
- Calls to third-party APIs you do not control
- Protecting a database from an overloaded application tier
- Keeping a page renderable when optional widgets fail
- Surviving a partial dependency outage without paging anyone""",
                    ),
                    (
                        "Trade-offs",
                        """- **Short timeouts** free resources and fail slow-but-valid requests.
- **Retries** recover transient faults and amplify load; budgets bound the damage.
- **Circuit breakers** protect you and can trip spuriously, denying a recovering dependency traffic it could have served.
- **Bulkheads** isolate failure and reduce total utilisation, because pools cannot be shared.
- **Load shedding** keeps the system alive by explicitly failing some users.
- **Fallbacks** keep the product usable and can mask a real problem — so always alert when a fallback is in use.
- **Hedging** cuts tail latency and adds load.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **No timeout**, so one hung call holds a thread forever.
- **Timeouts longer at the caller than the callee**, so retries stack.
- **Retry storms** without jitter or budget.
- **Shared thread pool** letting one dependency starve all endpoints.
- **Unbounded queues** turning overload into a long, unrecoverable backlog.
- **Circuit breaker thresholds too sensitive**, tripping on normal variance.
- **Silent fallbacks** — the system degrades and nobody notices for a week.
- **Retry after the deadline has passed**, spending capacity on work nobody wants.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What happens if this dependency is slow rather than down?"** — The resource-exhaustion mechanism, then timeouts, bulkheads, and breakers.
- **"How do you prevent a retry storm?"** — Backoff with jitter, a retry budget, retries at one layer only, and a breaker.
- **"Your service has four dependencies. What is your availability?"** — Multiply them, then propose removing the optional ones from the critical path with fallbacks.
- **"What does the user see when reviews are unavailable?"** — The degradation table. Have it ready.
- **"How do you recover from an overload?"** — Shed load, drain the backlog with bounded concurrency, and make sure you are not spending capacity on abandoned requests. Say deadline propagation.
- **"What would you monitor to catch this early?"** — Per-dependency latency percentiles and error rates, breaker state changes, fallback usage rate, and pool saturation.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Any network call without a timeout
- Treating all dependencies as equally critical
- Retrying non-idempotent operations
- No jitter and no retry budget
- Unbounded queues and unbounded concurrency
- Fallbacks that are silent, so degradation goes unnoticed
- Talking only about a dependency being down and never about it being slow""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A checkout flow depends on: auth, cart, inventory, pricing, payment, fraud scoring, and email.

1. Classify each as critical or optional.
2. Give each a timeout, a retry policy, and a fallback.
3. Fraud scoring takes 8 seconds instead of 80 ms. What should happen, and what is the business decision hidden in your answer?
4. Payments are down for ten minutes. Design the degraded flow rather than an error page.
5. Traffic is 5x normal and you cannot serve it all. What do you shed, in what order?

Part 3 is a trap worth thinking about: failing open on fraud scoring means accepting potentially fraudulent orders, and failing closed means losing revenue. The right answer depends on order value, and a good system makes that threshold explicit rather than implicit in a timeout.""",
                    ),
                    (
                        "Interview Tip",
                        """For every dependency you draw, say four things: timeout, retry policy, what trips the breaker, and the fallback. Doing it for even two dependencies signals more operational maturity than any architectural flourish.""",
                    ),
                ],
                [
                    "Slow dependencies cause outages through resource exhaustion, not error codes — design for slow, not just down.",
                    "Every call needs a timeout, and each layer's timeout must fit inside its caller's remaining budget.",
                    "Retries need backoff, jitter, a budget, and a single layer; circuit breakers stop you hammering a failing dependency.",
                    "Decide the degraded behaviour for every optional dependency in advance, and alert whenever a fallback is used.",
                ],
                [
                    "What happens to your service when a dependency becomes slow rather than failing?",
                    "How do you prevent retries from amplifying an outage?",
                    "What does the product look like with each optional dependency unavailable?",
                    "How do you shed load, and in what order?",
                ],
            ),
        ],
    )


def _rate_limiting_topic() -> dict:
    return _sd_topic(
        "rate-limiting",
        "Rate Limiting",
        "Protecting the system from abuse and accidents: algorithms, distributed counters, and what to do when the limiter itself fails.",
        "MEDIUM",
        18,
        [
            SD(
                "rate-limiting",
                "Rate Limiting",
                "A small, finishable design that appears inside almost every other design.",
                14,
                "A rate limiter caps how much a given client may do in a given window. Without one, a single buggy script, an aggressive scraper, or one enthusiastic customer becomes an outage for everybody. It is also a favourite interview problem in its own right, because it is small enough to design completely in twenty minutes and deep enough to expose whether you understand distributed state.",
                [
                    (
                        "Why It Matters",
                        """Three reasons to rate limit, and naming all three is better than naming one:

1. **Protection** — one client cannot consume capacity intended for thousands.
2. **Fairness** — a shared resource is divided by policy rather than by who loops fastest.
3. **Cost control** — especially for endpoints that call paid third-party APIs or expensive models.

It also composes with everything else: an API gateway does it, a login endpoint needs it, a notification system needs per-user limits, and a public API sells it as a product tier.""",
                    ),
                    (
                        "Mental Model",
                        """Three questions decide the whole design.

Identify → Count → Decide

1. **What is the key?** API key, user id, IP, tenant, or a composite. This is a policy decision with real consequences.
2. **Where is the count?** Local memory (fast, wrong across nodes) or shared store (correct, a network hop and a dependency).
3. **What happens over the limit?** Reject with `429`, queue, throttle, or degrade.""",
                    ),
                    (
                        "How It Works",
                        """:::viz token-bucket {"capacity": 3, "refillPerSec": 2, "requests": [0, 0.1, 0.2, 0.3, 0.9, 1.0, 1.1, 1.2, 2.5, 2.6]}

### Algorithms

| Algorithm | State | Bursts | Accuracy | Notes |
| --- | --- | --- | --- | --- |
| Fixed window | One counter per window | Allows 2x at the boundary | Poor | Simplest; the boundary flaw is real |
| Sliding window log | Timestamp per request | Exact | Exact | Memory grows with the limit |
| Sliding window counter | Two counters, weighted | Smooth | Good approximation | The usual production choice |
| Token bucket | Tokens plus refill rate | Configurable burst | Good | The best default; models capacity naturally |
| Leaky bucket | Queue drained at a fixed rate | None | Smooths output | Shapes traffic rather than rejecting it |

**Fixed window's flaw**, which interviewers like to probe: with a limit of 100 per minute, a client can send 100 at 11:59:59 and 100 at 12:00:00 — 200 requests in one second while never breaking the stated limit.

**Token bucket** is the default answer. A bucket holds up to B tokens and refills at R per second; a request takes one token or is rejected. It naturally allows a burst of B after an idle period, which matches how real clients behave, and the two parameters map directly onto product language: "100 requests per minute with a burst of 20".

**Sliding window counter** approximates the exact log cheaply: weight the previous window's count by how much of it remains in view. Small memory, no boundary spike, good enough.

### Distributed counting

The real design problem. Ten gateway nodes each enforcing 100 per minute locally means an effective limit of 1,000.

- **Shared store (Redis).** One source of truth. Must be atomic: `INCR` plus `EXPIRE` has a race if the process dies between them, so use a Lua script or a single atomic command. Token bucket in Redis is a short Lua script that computes refill from the elapsed time and decrements — evaluated atomically. Cost is a round trip per request, typically under a millisecond.
- **Local counters with a global budget.** Each node gets a share of the limit and periodically reconciles with the shared store. Far fewer round trips, approximate enforcement. This is how high-throughput limiters work in practice.
- **Consistent routing.** Route all requests for a key to the same node so its local counter is authoritative. Exact and fast, and it makes that node a hot spot for a heavy key and complicates deploys.

For most designs: Redis with an atomic script, and mention the local-budget approach as the optimisation for very high traffic.

### The response

- Status `429 Too Many Requests`.
- `Retry-After` with seconds — this is what makes clients behave.
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` so clients can self-regulate before being rejected.

Silently dropping requests is the worst option: clients cannot distinguish it from a network failure, so they retry immediately and make it worse.

### Choosing the key

- **API key or user id** — the right default for authenticated traffic.
- **IP** — the only option for anonymous traffic, and blunt: corporate NAT and mobile carrier NAT put thousands of users behind one address. Use it with generous limits and combine it with other signals.
- **Composite** — per user *and* per IP *and* per endpoint. Expensive endpoints deserve their own tighter limit.
- **Tenant** — in B2B, the limit usually belongs to the organisation, with a fair-share sub-limit per user so one user cannot consume the whole tenant's quota.

### Where to enforce

At the edge or gateway, before the request consumes application resources. A limiter that runs after authentication and database lookups has already spent the resources it was meant to protect. If the limit depends on identity, do the cheapest possible identity resolution first — verifying a signed token locally, not a database lookup.""",
                    ),
                    (
                        "Design Decisions",
                        """**Fail open or fail closed when Redis is down?** The genuinely interesting question. Fail open keeps the product working and removes protection exactly when an attack might be causing the outage. Fail closed protects the backend and turns a cache outage into a total outage.

The mature answer is neither: **fall back to a local in-process limit** with a conservative per-node budget. You lose global accuracy and keep a bound on total traffic. Say this — it is the answer that shows you have thought past the binary.

**Hard limit or throttle?** Rejecting is simplest. Queuing with delay is kinder for batch clients and adds latency and memory. For internal traffic, shaping is often better than rejecting.

**Different limits for different things.** A read endpoint at 1,000 per minute, a search at 100, a password reset at 5 per hour. One global limit is a blunt instrument; per-endpoint cost-weighted limits are better, and some APIs use a cost unit system where each endpoint deducts a different number of tokens.

**What about bursts?** Clients are bursty by nature. A limiter with no burst allowance rejects legitimate traffic constantly. Token bucket with a burst of 10–20% of the per-minute rate is a reasonable default.""",
                    ),
                    (
                        "Example",
                        """A public API: 1,000 requests per minute per API key, burst 100, enforced at the gateway across 20 nodes.

Implementation: token bucket in Redis. Key `rl:{api_key}`, value `(tokens, last_refill_ms)`. A Lua script computes tokens to add from elapsed time, caps at 100, decrements if available, and returns the remaining count and the time until the next token. One round trip, atomic, roughly 0.3 ms.

Response headers on every request tell the client where they stand; over the limit they get `429` with `Retry-After: 3`.

**Scaling concern:** a very large customer generates 40% of traffic, so their key is a hot Redis key. Mitigation: shard that key into ten sub-buckets each with a tenth of the limit, chosen by hash of the request id — approximate, and it spreads the load. Or route that customer's traffic to a dedicated gateway pool with local enforcement.

**Failure behaviour:** if Redis is unreachable, each gateway node falls back to a local limit of 1,000 ÷ 20 = 50 per minute per key per node, which caps worst-case throughput at the intended global limit and errs toward over-permissiveness only when traffic is unevenly distributed. An alert fires immediately, because degraded rate limiting is a security-relevant condition.

**Abuse case:** a client hammers an endpoint that returns `429` at 50,000 requests per second. Even rejecting costs TCP and TLS work, so persistent offenders get blocked further out — at the CDN or WAF layer — rather than being politely rejected forever.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Public APIs with tiered plans
- Login, signup, password reset, OTP — abuse-prone endpoints needing strict limits
- Expensive endpoints: search, exports, report generation, model inference
- Internal service-to-service quotas to contain a misbehaving caller
- Per-user limits on writes to prevent spam""",
                    ),
                    (
                        "Trade-offs",
                        """- **Accuracy versus latency.** Exact global counting costs a round trip per request; local budgets are approximate and nearly free.
- **Strict limits versus user experience.** Too strict and legitimate bursts are punished; too loose and the limiter does not protect anything.
- **Rejecting versus queueing.** Fast and honest, versus kinder and slower with memory cost.
- **Per-user versus per-IP.** Precise and requires identity, versus available for anonymous traffic and unfair behind NAT.
- **Fail open versus fail closed.** Availability versus protection — and the local-fallback middle path beats both.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Per-node counters** giving N times the intended limit.
- **Non-atomic increment and expire**, leaking keys that never expire or losing counts.
- **Hot key** for a large customer saturating one Redis node.
- **Fixed window boundary bursts** allowing double the limit briefly.
- **Limiter behind expensive work**, so the protected resource is consumed before the decision.
- **No `Retry-After`**, so clients retry immediately and turn rejection into a tight loop.
- **Clock skew** across nodes making window boundaries inconsistent.
- **Silent fail-open** during a Redis outage, with nobody alerted.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Where do you store the counters, and what if that store is down?"** — Redis with atomic scripts; on failure, local per-node budgets plus an alert. Explain why pure fail-open and pure fail-closed are both wrong.
- **"Token bucket or sliding window?"** — Token bucket for natural bursts and simple parameters; sliding window counter when you want smoothness without burst allowance. Both are defensible; the reasoning is the answer.
- **"One customer is 40% of traffic and their key is hot. Fix it."** — Key sharding with divided limits, or dedicated capacity with local enforcement.
- **"How do you rate limit anonymous traffic?"** — IP with generous limits, plus proof-of-work or a challenge for suspicious patterns, and the NAT caveat.
- **"What is the difference between rate limiting and load shedding?"** — Rate limiting is per-client policy applied always; load shedding is system-wide triage applied under stress. Good systems have both.
- **"What do you return, exactly?"** — `429`, `Retry-After`, and the limit headers. Never a silent drop.""",
                    ),
                    (
                        "Common Mistakes",
                        """- In-memory counters in a multi-node deployment
- Non-atomic read-modify-write on the counter
- No `Retry-After` or limit headers
- Applying one limit to every endpoint regardless of cost
- Enforcing after the expensive work
- Having no answer for the limiter's own failure
- Confusing rate limiting with load shedding""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design a distributed rate limiter for a platform with three tiers: free (100/hour), pro (10,000/hour), enterprise (custom, up to 1M/hour). Enforcement happens at 50 gateway nodes worldwide across three regions.

1. Algorithm and storage, with the reasoning.
2. Should enterprise customers be counted globally or per region? What does each choice mean for a customer whose traffic shifts regions?
3. How do you apply different limits per endpoint cost within one customer's quota?
4. Redis in one region becomes unavailable. Exactly what happens to each tier?
5. A free-tier user creates 10,000 accounts to get 10,000 × 100 requests per hour. What have you got, and how do you defend against it?

Part 5 is the one that matters in practice: per-key limits do not stop an attacker who can mint keys, which is why rate limiting must be paired with account-creation controls and IP or device-level signals. A limiter that only counts the dimension the attacker controls is not a defence.""",
                    ),
                    (
                        "Interview Tip",
                        """Give the complete answer in one breath: "Token bucket, keyed by API key, in Redis with an atomic Lua script at the gateway, returning 429 with Retry-After; if Redis is unavailable we fall back to a conservative per-node local limit and alert." Algorithm, key, storage, location, response, and failure mode — six decisions in one sentence.""",
                    ),
                ],
                [
                    "Token bucket keyed by client, enforced at the edge, is the defensible default.",
                    "Per-node counters multiply your limit by the node count — counting must be shared or budgeted.",
                    "Always return 429 with Retry-After and limit headers; silent drops cause tight retry loops.",
                    "When the counter store fails, fall back to conservative local limits rather than choosing between fail-open and fail-closed.",
                ],
                [
                    "Which algorithm would you choose and why?",
                    "How do you enforce a global limit across many gateway nodes?",
                    "What happens when the rate limiter's storage is unavailable?",
                    "How do you rate limit anonymous traffic, and what are the pitfalls?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 6 — Production architecture
# ---------------------------------------------------------------------------


def _services_topic() -> dict:
    return _sd_topic(
        "microservices",
        "Monoliths, Microservices, and Service Discovery",
        "How to split a system — or decline to — and how services find each other once you have.",
        "MEDIUM",
        19,
        [
            SD(
                "sd-monolith-vs-microservices",
                "Monolith vs Microservices",
                "An organisational decision with technical consequences, not the other way round.",
                13,
                "Microservices are a way of letting many teams deploy independently. They are not a performance technique, and they are not free: you trade in-process function calls for network calls, and local transactions for distributed ones. The interview skill is knowing what actually forces a split, and being willing to say that a well-structured monolith is the right answer more often than the industry admits.",
                [
                    (
                        "Why It Matters",
                        """Candidates reach for microservices reflexively and then spend the interview solving problems they created: distributed transactions, cross-service joins, tracing, and deployment coordination. Interviewers notice.

The strong position is that the split should be justified by a specific constraint — team autonomy, independent scaling of a genuinely different workload, isolation of a failure domain, or a compliance boundary — and that absent one, a modular monolith is simpler, faster, and easier to change.""",
                    ),
                    (
                        "Mental Model",
                        """Ask what you are actually trying to buy.

| Goal | Does splitting help? |
| --- | --- |
| Independent deploys per team | Yes — this is the main reason |
| Independent scaling of an unusual workload | Yes, if the workloads genuinely differ |
| Fault isolation | Yes, if you also build bulkheads and fallbacks |
| Technology diversity | Yes, and it is usually a cost, not a benefit |
| Performance | No — network calls are slower than function calls |
| Code organisation | No — modules do this without the network |
| Scaling the whole application | No — run more copies of the monolith |

> Memory cue: microservices are a deployment and ownership boundary. If the boundary you want is a code boundary, use a module.""",
                    ),
                    (
                        "How It Works",
                        """### The modular monolith

The option people skip. One deployable, with strict internal module boundaries: each module owns its tables, exposes an interface, and no other module reaches into its storage. Communication is in-process function calls.

You get: a single deploy, local transactions, one log, trivial refactoring across boundaries, and no network failure modes. You give up: independent deploys and independent scaling.

Crucially, if the module boundaries are real, extracting one into a service later is mechanical. If they are not, splitting into services just distributes the mess and adds latency. **Get the boundaries right first, in a monolith, where mistakes are cheap.**

### When to split

- **Team scale.** Above roughly 20–30 engineers on one deployable, release coordination starts to dominate. This is the most honest trigger.
- **Divergent scaling.** A video transcoding component needs GPUs and scales with uploads; the API tier scales with requests. Splitting lets each scale and fail independently.
- **Failure isolation.** A component whose failure must not affect the rest — a third-party integration, an experimental feature.
- **Compliance.** Payment card or health data in a smaller, separately audited service with a smaller attack surface.
- **Different lifecycle.** A component that changes daily next to one that changes yearly.

### How to split

Along **business capabilities**, not technical layers. "Orders", "payments", "catalogue" are services. "The database layer", "the API layer", "the business logic" are not — splitting by layer means every feature change touches every service, which is the worst of both worlds.

The test for a good boundary: most changes touch exactly one service, and services do not need each other's data synchronously to do their own job.

### Data ownership

The rule that makes or breaks a microservice architecture: **each service owns its data, and no other service touches that store directly.** A shared database means services are coupled through schema, cannot deploy independently, and can corrupt each other's invariants — which removes the entire benefit while keeping all the costs.

Consequences you must design for:

- Cross-service queries become API calls or replicated read models.
- Cross-service transactions become sagas.
- Reporting across services needs a separate analytical store fed by events.

### The strangler pattern

How you migrate without a rewrite:

1. Put a gateway in front of the monolith so all traffic is routable.
2. Build the new service alongside, and route one endpoint to it.
3. Optionally mirror traffic to both and compare results before cutting over.
4. Move the data it owns, then remove the old code.
5. Repeat.

Each step is reversible. Every successful large migration looks like this, and the big-bang rewrite is the recognised failure mode.

### The costs, named honestly

- Network calls fail, are slow, and need timeouts, retries, and breakers.
- Transactions become sagas with compensations.
- Debugging needs distributed tracing and correlation ids.
- Local development becomes harder — running twelve services on a laptop is a project of its own.
- Versioning between services becomes a contract-management problem.
- Availability multiplies along synchronous call paths.
- Every service needs its own deploy pipeline, monitoring, alerts, on-call, and backups.

A single team running fifteen services usually has fifteen partially-maintained deployment pipelines. That is the real-world failure mode of premature splitting.""",
                    ),
                    (
                        "Design Decisions",
                        """**Start monolith or start services?** For a new product with a small team: modular monolith, almost always. You do not yet know where the boundaries are, and getting them wrong in a distributed system is far more expensive to fix.

**How big is a service?** Big enough to be owned by one team and to contain the data for its own decisions. "One service per team" is a much better heuristic than "one service per entity".

**Synchronous or asynchronous between services?** Prefer asynchronous events where the caller does not need the result, because synchronous chains multiply latency and divide availability. Keep synchronous calls for genuine request-response needs and keep the chains short.

**Shared libraries?** A shared library across services re-introduces coupling: a change means coordinating redeploys. Small, stable, versioned libraries are fine; a shared domain-model library is a monolith with extra steps.""",
                    ),
                    (
                        "Example",
                        """A company at 15 engineers runs a modular monolith with clear modules: catalogue, orders, payments, notifications. One deploy, one database with per-module schemas, and a rule that modules only call each other through interfaces.

At 60 engineers, release coordination is painful and the transcoding workload needs different hardware. They extract, in order:

1. **Media processing** — clearly separable, different hardware, asynchronous by nature, and no transactional coupling. Easiest and highest value.
2. **Notifications** — a leaf with no callers depending on its result.
3. **Payments** — motivated by compliance and a smaller audit surface, and the hardest because orders and payments share transactional invariants. Solved with a saga and a reservation/authorisation model.

Catalogue and orders stay in the monolith, because they change together constantly and splitting them would turn every feature into a two-service release.

That last sentence is the most senior part of the answer: knowing which parts *not* to split.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Organisations past the point where one deployable can be coordinated
- Workloads with genuinely different resource profiles
- Compliance-scoped components
- Incremental migration away from a legacy system""",
                    ),
                    (
                        "Trade-offs",
                        """- **Independent deploys versus operational multiplication.** Every service is a pipeline, a dashboard, an alert set, and an on-call surface.
- **Fault isolation versus availability multiplication.** Isolation only materialises if you build fallbacks; otherwise a synchronous chain is less available than a monolith.
- **Team autonomy versus coordination cost.** Cross-service changes need contracts, versioning, and negotiation.
- **Scaling granularity versus overhead.** Scaling one component precisely, against per-service baseline cost.
- **Technology freedom versus fragmentation.** Five languages means five sets of libraries, tooling, and expertise.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **The distributed monolith** — services that must be deployed together, share a database, or call each other synchronously for every operation. All the costs, none of the benefits.
- **Shared database** across services.
- **Chatty boundaries** — one user action making dozens of cross-service calls.
- **Splitting by technical layer** rather than business capability.
- **No tracing**, making cross-service debugging impossible.
- **A service per entity**, producing dozens of tiny services one team cannot maintain.
- **Big-bang rewrite** instead of strangling.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Would you build this as microservices?"** — Ask about team size and deployment constraints first. Then usually: modular monolith now, with these seams, extracting X first when Y happens.
- **"How do you split this system?"** — By business capability, and name which parts you would deliberately keep together and why.
- **"How do services share data?"** — They do not share stores. APIs for queries, events for propagation, read models for cross-service views.
- **"How do you handle a transaction across services?"** — Saga with compensations, or redraw the boundary so it is local. Prefer the second.
- **"What is the hardest part of this architecture?"** — Good answers: debugging across services, data consistency, and the operational multiplication. Saying "nothing really" is a bad sign.
- **"How would you migrate the monolith?"** — Strangler, one endpoint at a time, with traffic mirroring and reversible steps.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Choosing microservices for performance
- Splitting before knowing the boundaries
- Sharing a database between services
- Creating a service per database table
- Ignoring the operational cost multiplier
- Designing synchronous chains and then being surprised by the availability maths""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A monolithic e-commerce application: 200,000 lines, 25 engineers, deploys twice a week, and the deploy is a two-hour event everyone dreads. Checkout traffic spikes 20x on promotion days; the rest of the app does not.

1. What is the actual problem — deployment coordination, scaling, or something else?
2. Which component would you extract first, and what makes it the easiest?
3. Which components should stay together, and why?
4. Checkout and inventory currently share a transaction. What happens to that if you split them, and what do you build instead?
5. How would you prove the split was worth it — what metric changes?

Part 5 is the question most candidates have never considered: deploy frequency, lead time to change, and change failure rate are the metrics that a service split is supposed to improve. If none of them move, the split was not justified.""",
                    ),
                    (
                        "Interview Tip",
                        """Ask about team size before answering. "How many engineers, and are they blocked on each other's releases?" reframes the question as the organisational one it actually is, and it is the reframing that senior candidates make.""",
                    ),
                ],
                [
                    "Microservices buy independent deployment and ownership, not performance — split for organisational reasons.",
                    "A modular monolith with real boundaries is the right starting point, and makes later extraction mechanical.",
                    "Each service owns its data; a shared database is a distributed monolith with all the costs and none of the benefits.",
                    "Migrate by strangling one endpoint at a time, never by rewriting.",
                ],
                [
                    "When is splitting into services actually justified?",
                    "How do you decide where the service boundaries go?",
                    "How do two services share data without sharing a database?",
                    "How would you migrate a monolith incrementally, and how would you prove it helped?",
                ],
            ),
            SD(
                "sd-service-discovery",
                "Service Discovery and Configuration",
                "How services find each other in an environment where addresses change constantly.",
                10,
                "Once instances are created and destroyed by an autoscaler or a scheduler, hardcoded addresses stop working. Service discovery is the mechanism by which a caller finds a currently-healthy instance of a callee, and it is a small topic with one important property: it must keep working when the discovery system itself is unavailable.",
                [
                    (
                        "Why It Matters",
                        """It comes up as a follow-up rather than a main topic: "you have twenty instances behind this service and they change every deploy — how does the caller find them?" A vague answer suggests you have only worked with fixed hosts.

It is also a dependency question. If every request consults a registry, that registry's availability caps yours — and the answer to that is caching, which brings staleness, which brings its own failure mode.""",
                    ),
                    (
                        "Mental Model",
                        """Three moving parts.

Register → Discover → Health check

- **Registration** — an instance announces itself on startup, or the platform registers it.
- **Discovery** — a caller resolves a logical name to a set of addresses.
- **Health** — unhealthy instances are removed, and this is where most of the subtlety lives.""",
                    ),
                    (
                        "How It Works",
                        """### Patterns

| Pattern | How it works | Trade-off |
| --- | --- | --- |
| DNS-based | A service name resolves to instance addresses | Universal, and TTL caching makes changes slow |
| Server-side (load balancer) | Caller talks to a stable endpoint; the balancer knows the instances | Simple for callers, adds a hop and a component |
| Client-side | Caller fetches the instance list and chooses | No extra hop, better balancing, logic in every client |
| Service mesh sidecar | A local proxy handles discovery and balancing | Uniform across languages, adds operational weight |
| Platform-native | Kubernetes Services and Endpoints | Free if you are on the platform, less portable |

In practice, most systems use the platform's mechanism, which is usually DNS plus a control plane maintaining the endpoint list. Client-side discovery is common in gRPC ecosystems because it enables better load balancing algorithms than a round-robin proxy.

### Registration styles

- **Self-registration** — the instance calls the registry on startup and heartbeats. Simple; a crashed instance lingers until its lease expires.
- **Third-party registration** — the platform registers instances based on observed state. Cleaner, and it is what orchestrators do.

### Health and readiness

The same distinction as in load balancing, and it matters here too: an instance should be removed from discovery when it cannot serve (readiness), not only when the process dies (liveness). During startup — warming caches, opening pools — it must not be discoverable.

### Caching and the failure question

Every caller caches the resolved instance list, because consulting the registry per request is too slow and too fragile. That produces the key design question: **what happens when the registry is down?**

The right behaviour is to keep using the last-known-good list and continue serving. Instances that have died will be discovered by connection failures and ejected locally; new instances will not be found until the registry recovers. That is a graceful degradation, and it is the answer interviewers want.

The wrong behaviour — refusing to serve because discovery failed — makes the registry a hard dependency of everything, which is exactly what a control plane should never be.

### Configuration

Closely related, and often the same system. Configuration that changes at runtime — feature flags, limits, routing rules — lives in a config store with a watch or poll mechanism. The same rule applies: cache locally, tolerate the store being unavailable, and never block startup on it if you can avoid it.

A related discipline worth mentioning: configuration changes should be rolled out like code — staged, observable, and reversible. A bad config push has taken down more large systems than a bad deploy, because config often bypasses the review and canary process that code goes through.""",
                    ),
                    (
                        "Example",
                        """A checkout service calls an inventory service running 30 instances that change on every deploy and autoscale event.

On Kubernetes: `inventory.default.svc.cluster.local` resolves through the platform to healthy endpoints. Readiness probes keep starting and draining pods out of the set. Checkout caches resolution briefly and retries a different endpoint on connection failure.

If the control plane is unavailable: existing endpoint caches persist, traffic keeps flowing, and only changes — new pods, scaling — stall. Nothing user-facing breaks. That is the property worth stating explicitly.

With client-side discovery instead: checkout holds the instance list and uses least-request balancing, which handles variable request cost better than the platform's round-robin, at the cost of discovery logic in the client.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any environment with autoscaling or scheduled workloads
- Blue-green and canary routing
- Multi-region routing with locality preference
- Dynamic configuration and feature flags""",
                    ),
                    (
                        "Trade-offs",
                        """- **DNS simplicity versus TTL staleness.** Universal support against slow propagation, and clients that cache beyond the TTL.
- **Server-side versus client-side.** An extra hop and a simpler client, against better balancing and logic duplicated per language.
- **Mesh uniformity versus operational weight.** Consistent behaviour for free, at the price of a substantial platform to run.
- **Aggressive health checking versus flapping.** Fast removal of bad instances, against removing healthy ones during a blip.
- **Fresh discovery versus resilience.** Frequent lookups track reality; cached lists survive a registry outage.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Registry as a hard dependency**, so its outage becomes a total outage.
- **Stale entries** pointing at terminated instances, producing connection errors until ejected.
- **Instances registering before they are ready**, so early traffic fails.
- **No deregistration on shutdown**, so traffic goes to a dying instance for the lease duration.
- **DNS caching beyond TTL** in clients and runtimes, so scale-in leaves clients calling dead addresses.
- **Bad config push** propagating instantly and globally with no canary.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How does service A find service B?"** — Name the mechanism and the caching behaviour.
- **"What happens when the registry is down?"** — Last-known-good endpoints, keep serving, degrade only on changes. This is the question being asked.
- **"How do new instances start receiving traffic?"** — Registration plus readiness, and nothing before the cache is warm.
- **"How do you drain an instance?"** — Fail readiness, deregister, let in-flight finish, then exit.
- **"How do you roll out a config change safely?"** — Staged, canaried, observable, reversible — the same discipline as code.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Hardcoded addresses or hand-maintained host lists
- Treating discovery as always available
- Registering before readiness and not deregistering on shutdown
- Ignoring client-side DNS caching
- Pushing configuration globally with no staging""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A service runs 200 instances across three availability zones and autoscales between 100 and 400 instances during the day.

1. How do callers discover instances, and how quickly does a new instance receive traffic?
2. An instance becomes unhealthy. How long until callers stop sending to it, and what do in-flight requests experience?
3. The registry is unavailable for ten minutes, during which the autoscaler adds 50 instances. What is the state of the system, and is it serving?
4. You want callers to prefer instances in their own availability zone to reduce cross-zone traffic cost and latency. How, and what happens when the local zone has no healthy instances?

Part 4 has a real trap: zone-local preference with no fallback turns a zonal failure into a zonal outage for every caller in that zone. The answer needs a preference with automatic spillover, not a hard affinity.""",
                    ),
                    (
                        "Interview Tip",
                        """Answer with both halves: the mechanism and the degradation. "Platform DNS with cached endpoints, and if the control plane is unavailable we keep serving on the last-known list and only lose the ability to see new instances." The second half is what is actually being probed.""",
                    ),
                ],
                [
                    "Discovery resolves a logical name to currently-healthy instances; registration, discovery and health are the three parts.",
                    "Callers must cache endpoints and keep serving from the last-known-good list when the registry is unavailable.",
                    "Readiness, not liveness, controls discoverability — and deregistration on shutdown is what makes deploys clean.",
                    "Configuration changes deserve the same staging, canarying and rollback discipline as code.",
                ],
                [
                    "How does one service find another in an autoscaled environment?",
                    "What happens to your system when the service registry is unavailable?",
                    "How quickly does a new instance start receiving traffic, and what controls that?",
                    "How would you prefer same-zone instances without creating a zonal outage risk?",
                ],
            ),
        ],
    )


def _observability_topic() -> dict:
    return _sd_topic(
        "observability",
        "Observability",
        "Metrics, logs, traces, and SLOs — how you know the system is healthy and how you debug it when it is not.",
        "MEDIUM",
        20,
        [
            SD(
                "observability",
                "Observability",
                "A design is not finished until you can answer 'is it working?' and 'why not?' at three in the morning.",
                14,
                "Observability is the ability to understand a system's internal state from its outputs. In a monolith you could attach a debugger; in a distributed system the only instrument you have is what the system emits. Interviewers treat this topic as a proxy for whether you have actually operated something, because candidates who have run production systems always bring it up unprompted.",
                [
                    (
                        "Why It Matters",
                        """Two questions matter and they need different tools:

- **Is the system healthy?** Metrics and SLOs answer this. Cheap, aggregate, always on.
- **Why is this particular request broken?** Traces and logs answer this. Expensive, detailed, sampled.

A design that has one without the other is incomplete. Metrics tell you something is wrong and cannot tell you what; logs tell you what happened to one request and cannot tell you whether it is widespread.""",
                    ),
                    (
                        "Mental Model",
                        """Three signals with different shapes and costs.

Metrics → Traces → Logs

| Signal | Shape | Cardinality | Cost | Answers |
| --- | --- | --- | --- | --- |
| Metrics | Numeric time series | Must stay low | Cheap, constant | Is it healthy? How much? How fast? |
| Traces | A request's path across services | Sampled | Moderate | Where did the time go? Which hop failed? |
| Logs | Discrete events with context | Unbounded | Expensive at volume | What exactly happened here? |

The correct workflow is metrics to detect, traces to localise, logs to diagnose. Designing for that workflow is what makes a system debuggable.""",
                    ),
                    (
                        "How It Works",
                        """### Metrics: what to measure

Two standard frameworks worth naming:

- **RED** for services: **R**ate (requests/s), **E**rrors (failed/s), **D**uration (latency distribution). Apply per endpoint.
- **USE** for resources: **U**tilisation, **S**aturation, **E**rrors. Apply per CPU, disk, pool, queue.

Saturation is the underused one: queue depth, thread pool usage, connection pool usage. Utilisation tells you how busy something is; saturation tells you how much work is waiting, and it is the leading indicator of the failure.

Always record latency as a **histogram**, not an average, so you can compute percentiles and aggregate them correctly across instances. Averaging pre-computed percentiles across nodes is meaningless, and it is a mistake real systems make.

**Cardinality** is the cost driver. A metric with a `user_id` label creates one time series per user, and will bankrupt or break your metrics backend. Labels must be low-cardinality: endpoint, status class, region, version. High-cardinality dimensions belong in traces and logs.

### Logs

Structured, not free text. A log line should be a JSON object with a timestamp, level, service, request id, and typed fields — because you will want to filter and aggregate, and grep does not scale.

Rules that matter in practice:

- **Include the correlation id on every line**, or you cannot reconstruct a request.
- **Never log secrets or unnecessary personal data.** Tokens, card numbers, passwords, and full request bodies are recurring and serious incidents.
- **Sample high-volume logs.** Log every error, sample successes.
- **Log levels used consistently.** ERROR means someone should look; if it does not, it is noise and it will train people to ignore real errors.

### Distributed tracing

A trace is a tree of spans representing one request's journey. Each span has a service, an operation, a start and duration, and attributes. Context propagates via headers (the W3C `traceparent` standard).

What it gives you that nothing else does: the latency breakdown across services for a single slow request, and the exact hop that failed. When someone asks "why is checkout p99 two seconds when every service reports p99 under 200 ms?", the answer is almost always visible in a trace and almost never in metrics — because the request made fifteen sequential calls.

Tracing is sampled — commonly 1% — because full tracing is expensive. **Tail-based sampling**, where the decision is made after the request completes so that all slow or failed requests are kept, is much more useful than head-based, and worth naming.

### SLIs, SLOs, and alerting

Alert on **symptoms**, not causes. High CPU is not an incident; users getting errors is. The canonical set:

- Error rate above the SLO burn threshold
- Latency percentile above target
- Saturation trending toward exhaustion
- Data freshness or queue age beyond bound

**Error budget burn rate** alerting is the mature form: page when you are consuming the monthly budget fast enough to exhaust it (for example, a 14x burn rate over an hour), rather than on every threshold crossing. It produces far fewer false pages and catches real degradations earlier.

Every alert should be actionable and have a runbook. An alert nobody acts on trains people to ignore the ones that matter — alert fatigue is a genuine reliability risk, not a complaint.

### The health of the pipeline itself

Your observability stack is a system too, with its own failure modes: it can lag, drop data, or fall over under the very incident you need it for. Two habits: keep a minimal independent path to the most critical signals, and make sure metrics ingestion degrades by dropping detail rather than dropping everything.""",
                    ),
                    (
                        "Design Decisions",
                        """**What do you instrument first?** The user-facing edge: rate, errors, and latency per endpoint. That single dashboard answers "is the product working?" and is the basis of every SLO.

**What is the sampling strategy?** Head-based for cheapness, tail-based to guarantee you keep the interesting ones. Always trace 100% of errors.

**How long do you retain?** Metrics at full resolution for days, downsampled for a year. Traces for days. Logs for days to weeks at full fidelity, longer only for audit logs — which have different requirements and should be stored separately, immutably.

**How much does this cost?** Observability commonly runs 5–15% of infrastructure spend, and logs usually dominate. Cardinality and log volume are the two levers. This is a legitimate cost-optimisation answer and shows commercial awareness.""",
                    ),
                    (
                        "Example",
                        """Checkout error rate rises from 0.1% to 4%. The on-call workflow, as it should be designed:

1. **Alert** fires on error-budget burn rate, not on a raw threshold, so it is real.
2. **Dashboard** shows errors concentrated on `POST /checkout`, one region, starting at 14:32 — which coincides with a deploy.
3. **Traces** for failed requests show a 3-second span on the inventory service, failing with a timeout. Inventory's own error metrics are clean, which immediately means the problem is latency, not failure.
4. **Inventory metrics** show connection pool saturation at 100%, with normal CPU. Saturation, not utilisation, is the signal that identifies it.
5. **Logs** on inventory, filtered by the trace id, show slow queries against a table whose index was dropped in the 14:32 migration.
6. **Resolution:** roll back, recreate the index, verify error rate.

Four minutes from alert to cause, because each signal handed off to the next. Without tracing, step 3 is an hour of guessing; without saturation metrics, step 4 looks like "inventory seems fine".""",
                    ),
                    (
                        "Common Use Cases",
                        """- On-call debugging
- Capacity planning from utilisation and saturation trends
- Verifying a deploy or a canary
- Setting and reporting SLOs
- Attributing cost and load to endpoints, tenants, or features""",
                    ),
                    (
                        "Trade-offs",
                        """- **Detail versus cost.** Full-fidelity logs and traces for everything are unaffordable at scale; sampling is mandatory and loses information.
- **Cardinality versus usefulness.** Per-user metrics would be wonderful and will break the backend.
- **Alert sensitivity versus fatigue.** Every false page reduces the response to real ones.
- **Retention versus storage.** Long retention is valuable for trend analysis and expensive.
- **Instrumentation effort versus coverage.** Auto-instrumentation gets 80% cheaply; the valuable business-level signals need deliberate work.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Cardinality explosion** taking down the metrics system, often from a user id or a URL path with ids in it.
- **Alerting on causes** — CPU, memory — producing noise and missing user-visible problems.
- **No correlation ids**, making cross-service debugging archaeology.
- **Averages instead of percentiles**, hiding the tail entirely.
- **Logging secrets**, creating a compliance incident out of a debugging aid.
- **The observability stack failing during the incident it was needed for.**
- **Dashboards nobody trusts**, because the metrics were never validated against reality.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you know this system is healthy?"** — RED at the edge per endpoint, against an SLO. Not CPU.
- **"A user reports a slow request. How do you investigate?"** — Trace id from the response, pull the trace, find the slow span, then logs for that span. Say that the response should carry a request id for exactly this reason.
- **"What would you alert on?"** — Symptoms with burn-rate thresholds, plus saturation as a leading indicator.
- **"How do you debug across ten services?"** — Correlation id propagated everywhere, distributed tracing, and structured logs keyed by it.
- **"How much does observability cost, and how would you reduce it?"** — 5–15% is typical; cut log volume, reduce cardinality, sample smarter with tail-based tracing, and downsample old metrics.
- **"What is the difference between monitoring and observability?"** — Monitoring answers known questions with predefined dashboards; observability lets you answer questions you did not anticipate. The practical difference is high-cardinality context.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Leaving observability out of the design entirely
- Alerting on resource metrics rather than user symptoms
- Unstructured logs with no request id
- High-cardinality labels on metrics
- Reporting averages
- No runbook attached to alerts
- Treating audit logs and debug logs as the same thing""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the observability for a payment service: 500 transactions per second, 99.95% availability target, money involved.

1. Name five metrics, with their labels, and justify the cardinality of each.
2. Define one SLI and one SLO precisely, and say what the error budget is in minutes per month.
3. What do you log for every transaction, and what must you never log?
4. A merchant says a payment succeeded but was not credited. What is the exact sequence of lookups you perform, and what must exist in the system for that to be possible?
5. Your metrics pipeline is down. How do you know whether payments are working?

Parts 3 and 5 are the ones with real content: payment logs need an audit trail that is immutable and separate from debug logs, and part 5 forces an independent minimal health signal — often a synthetic transaction checked from outside the system.""",
                    ),
                    (
                        "Interview Tip",
                        """Volunteer this section before you are asked. After the architecture, say: "For observability I would track RED per endpoint against an SLO, propagate a trace id from the edge through every service and event, and alert on error-budget burn rather than raw thresholds." Three sentences that read as someone who has carried a pager.""",
                    ),
                ],
                [
                    "Metrics detect, traces localise, logs diagnose — design for that handoff.",
                    "Use RED for services and USE for resources; saturation is the leading indicator of failure.",
                    "Keep metric cardinality low and put high-cardinality context in traces and logs instead.",
                    "Alert on user-visible symptoms and error-budget burn, never on CPU, and give every alert a runbook.",
                ],
                [
                    "How do you know the system is healthy, and what would you alert on?",
                    "A single request is slow. Walk me through the investigation.",
                    "What is the difference between monitoring and observability in practice?",
                    "How would you cut observability cost without losing the ability to debug?",
                ],
            ),
        ],
    )


def _security_topic() -> dict:
    return _sd_topic(
        "security",
        "Security in System Design",
        "Authentication, authorisation, secrets, and the threats that reshape an architecture rather than decorate it.",
        "MEDIUM",
        21,
        [
            SD(
                "security",
                "Security in System Design",
                "The non-functional requirement that changes APIs, storage, and boundaries — not a checklist at the end.",
                14,
                "Security in a design interview is not a recitation of OWASP. It is a small number of decisions that change the architecture: how identity is established and propagated, where authorisation is enforced, what data is sensitive and therefore where it may live, and what happens when a credential leaks. Getting those four right covers most of what an interviewer is looking for.",
                [
                    (
                        "Why It Matters",
                        """Two failure modes in interviews. The first is omitting security entirely, which reads as inexperience. The second is listing controls — "we'll use HTTPS and hash passwords" — without connecting any of them to the design.

The strong version integrates security into the architecture: "Because we store card data, that path lives in a separate service with a reduced audit scope, and the rest of the system only ever sees a token." That is a security requirement producing an architectural boundary, which is what the topic is actually about.""",
                    ),
                    (
                        "Mental Model",
                        """Four questions, in order.

Identity → Authorisation → Data protection → Blast radius

1. **Who is this?** Authentication, for users and for services.
2. **May they do this to this resource?** Authorisation, coarse and fine.
3. **What is sensitive, and how is it protected at rest and in transit?**
4. **When something is compromised, how much is exposed and how fast can you revoke it?**

> Memory cue: assume a breach will happen somewhere. Design so that it is contained and detectable, not so that it is impossible.""",
                    ),
                    (
                        "How It Works",
                        """### Authentication

- **Passwords** must be hashed with a slow, memory-hard function — bcrypt, scrypt, or Argon2 — never a fast hash, and never home-made. Salting is built into these.
- **Sessions versus tokens.** A session id in an HttpOnly, Secure, SameSite cookie is revocable by deleting server state. A signed JWT is stateless and fast to verify and cannot be revoked before expiry. The standard compromise: short-lived access tokens (5–15 minutes) plus a long-lived refresh token that is stored server-side and can be revoked.
- **OAuth 2.0 and OIDC** for delegation and third-party sign-in. Authorisation code flow with PKCE for public clients. Know that OAuth is authorisation and OIDC is the identity layer on top.
- **MFA** for anything privileged.
- **Service-to-service** identity via mTLS or short-lived signed tokens from a workload identity system. Long-lived shared secrets between services are the thing to avoid.

### Authorisation

Two layers, and confusing them is a classic design error:

- **Coarse-grained** at the gateway: may this client call this route at all? Cheap, uniform, centralised.
- **Fine-grained** in the service: may this user read *this* document? Only the service knows the resource's owner, so only it can decide.

Models: role-based access control is simple and gets coarse quickly; attribute-based scales to complex rules; relationship-based (the Zanzibar model) handles "users who are members of a group that has been granted access to a folder containing this file", which is what document and collaboration products actually need.

The single most common real vulnerability in this area is **insecure direct object reference**: an endpoint that fetches by id without checking that the caller owns it. Every resource-level read and write needs an ownership check, and saying so explicitly is worth doing.

### Data protection

- **In transit** — TLS everywhere, including between internal services in a zero-trust posture.
- **At rest** — disk and database encryption is table stakes and protects against a stolen disk, not against a compromised application. Field-level encryption for the genuinely sensitive columns protects against more.
- **Key management** — keys in a KMS or HSM, never in code or environment files committed anywhere, with rotation.
- **Tokenisation** — replace a sensitive value with a meaningless token and keep the real value in one small, tightly controlled service. This is how payment systems keep card data out of the rest of the architecture, and it is an architectural pattern rather than a control.
- **Data minimisation** — the cheapest security control is not storing it. Interviewers notice when you ask whether a field is needed at all.

### Secrets

Not in code, not in images, not in environment variables committed to a repository. A secrets manager with short-lived dynamic credentials where possible, audit logging of access, and automated rotation. Leaked long-lived credentials in repositories remain one of the most common real breach vectors.

### The threats worth naming in a design

- **Injection** — parameterised queries, always.
- **Broken access control** — the IDOR case above.
- **SSRF** — a service fetching a user-supplied URL can be tricked into reaching internal endpoints. Allowlist destinations; this one comes up often in designs with webhooks or link previews.
- **Credential stuffing** — rate limiting, MFA, and breach-password checks on login, not just a stronger password policy.
- **Enumeration** — timing and error messages that reveal whether an account exists.
- **Supply chain** — dependency pinning, lockfiles, and image scanning.

### Multi-tenancy

In any B2B design, the question is how tenant isolation is enforced. Options in increasing strength: a `tenant_id` column with enforcement in application code (cheapest, one missing `WHERE` clause is a cross-tenant leak), row-level security in the database (enforced below the application), a schema per tenant, or a database per tenant (strongest and most operationally expensive).

Saying "tenant isolation is enforced at the query layer by row-level security, not by remembering to filter" is a strong, specific answer.""",
                    ),
                    (
                        "Design Decisions",
                        """**Where does identity get established, and how does it propagate?** At the gateway, which validates the token and attaches a trusted identity header — while stripping any such header supplied by the client. Downstream services trust it because the network boundary guarantees traffic came through the gateway; in a zero-trust design they verify independently.

**Access token lifetime?** Short. It bounds the damage of a stolen token, which is the main reason revocation is hard for stateless tokens.

**What is the audit trail?** Who did what, to what, when, from where — immutable, stored separately from application logs, retained per policy. Any system with money, health data, or admin actions needs this by design, not as a later addition.

**What is your rotation and revocation story?** "A credential leaked — what do you do, and how long until it is useless?" should have a short answer for every credential type in the design.""",
                    ),
                    (
                        "Example",
                        """A healthcare application storing patient records.

- **Identity:** OIDC against the hospital's identity provider, MFA required, 10-minute access tokens with refresh tokens held server-side and revocable.
- **Authorisation:** relationship-based — a clinician may read a record if they are on the patient's care team, an assignment with a start and end time. Enforced in the records service on every read, never inferred from the role alone.
- **Data:** records encrypted at rest with per-tenant keys in a KMS; the most sensitive fields encrypted at the field level so a database dump is not sufficient; personal identifiers tokenised so analytics works on tokens.
- **Boundaries:** the records service is the only component with decryption keys. Search operates on a separate index with only the fields needed for search. Analytics receives de-identified data.
- **Audit:** every read of a patient record is logged immutably with clinician, patient, timestamp, and reason — because in this domain, *reads* are the sensitive operation, which is unusual and worth noticing.
- **Blast radius:** a compromised analytics service exposes de-identified data; a compromised search service exposes names but not clinical content; only the records service is catastrophic, and it is the smallest and most controlled component.

That last paragraph is the security design. The controls are ordinary; the containment structure is the architecture.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any system with user accounts
- Multi-tenant B2B products, where isolation is the core requirement
- Payment, health, and identity data with regulatory scope
- Public APIs with third-party clients
- Internal admin tooling, which is usually the least protected and most powerful surface""",
                    ),
                    (
                        "Trade-offs",
                        """- **Stateless tokens versus revocability.** Fast and dependency-free, against the inability to revoke before expiry. Short lifetimes are the compromise.
- **Encryption granularity.** Field-level encryption protects more and breaks querying, indexing, and sorting on those fields.
- **Strict isolation versus cost.** A database per tenant is the strongest isolation and multiplies operational work.
- **Security controls versus latency and friction.** Every check costs time, and every additional authentication step costs conversion. Both are real, and the right level depends on what is being protected.
- **Centralised authorisation versus service autonomy.** A central policy service is consistent and becomes a dependency on every request.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Missing ownership checks** on resource endpoints.
- **Trusting client-supplied internal headers** that the gateway forgot to strip.
- **Long-lived credentials** in repositories, images, or CI configuration.
- **Overly broad pre-signed URLs or public buckets.**
- **A missing tenant filter** in one query, leaking across customers.
- **Sensitive data in logs**, especially full request bodies.
- **SSRF through a URL-fetching feature.**
- **No revocation path** for tokens or API keys.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How do you authenticate, and where is authorisation enforced?"** — Both layers, with the reason for the split.
- **"A token is stolen. What is the impact and how do you respond?"** — Bounded by lifetime and scope; revoke the refresh token, rotate signing keys if needed, and audit what was accessed.
- **"How do you prevent one tenant from reading another's data?"** — Enforce below the application: row-level security or separate schemas, plus tests that attempt cross-tenant access.
- **"Where do secrets live?"** — A secrets manager with rotation, short-lived credentials, and access auditing.
- **"What data would you refuse to store?"** — Anything you do not need. Tokenise or hash the rest. This answer scores well.
- **"How do you protect the login endpoint?"** — Rate limiting per IP and per account, MFA, breached-password checks, and uniform responses to prevent enumeration.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating security as a checklist rather than an architectural constraint
- Relying on role checks without resource ownership checks
- Storing JWTs in local storage where any script can read them
- Encrypting at rest and calling the data protected from an application compromise
- Building custom cryptography or a custom auth protocol
- Ignoring internal admin tools, which usually have the widest access""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A file-sharing product: users upload files, share them with individuals or groups, and generate public links.

1. Design the authorisation model. What can a user do with a file they own, one shared with them directly, one shared with a group they belong to, and one with a public link?
2. Public links must work without authentication. How do you make them unguessable, revocable, and optionally expiring?
3. An employee with database access should not be able to read file contents. What does that require, and what does it break?
4. A user shares a file, then leaves the group. What happens to their access, and when — immediately, or at token expiry?
5. The link-preview feature fetches URLs users paste. What is the vulnerability, and how do you prevent it?

Parts 3 and 5 have the most content: client-side or service-held encryption keys break server-side search and preview generation, which is a real product trade-off; and part 5 is SSRF, which needs destination allowlisting and blocking of internal address ranges.""",
                    ),
                    (
                        "Interview Tip",
                        """Tie one security requirement to an architectural boundary. "Because card data is in scope, it lives in a separate tokenisation service and nothing else in the system ever sees a card number" demonstrates that you treat security as a design input rather than a layer applied afterwards.""",
                    ),
                ],
                [
                    "Answer four questions: how identity is established, where authorisation is enforced, what is sensitive, and what a breach exposes.",
                    "Coarse authorisation at the gateway, resource-ownership checks in the service — missing the second is the most common real vulnerability.",
                    "Short-lived access tokens plus revocable refresh tokens resolve the stateless-versus-revocable tension.",
                    "Enforce tenant isolation below the application layer, not by remembering to add a filter.",
                ],
                [
                    "Where do you enforce authorisation, and why in two places?",
                    "A token or API key leaks. What is the blast radius and how fast can you revoke it?",
                    "How do you guarantee one tenant cannot read another's data?",
                    "What data would you choose not to store at all, and why?",
                ],
            ),
        ],
    )


def _scalability_topic() -> dict:
    return _sd_topic(
        "scalability",
        "Scaling a System",
        "The ordered sequence of moves from one server to a globally distributed system, and how to know which move is next.",
        "MEDIUM",
        22,
        [
            SD(
                "scalability",
                "Scaling a System",
                "A path, not a property — and the ability to say which step comes next and why.",
                14,
                "Scalability questions in interviews are almost always the same question in disguise: \"here is a design, now traffic is 10x — what breaks and what do you do?\" The skill is having an ordered sequence of moves, knowing what each one costs, and being able to identify which bottleneck you are actually facing rather than applying every technique at once.",
                [
                    (
                        "Why It Matters",
                        """Interviewers apply pressure deliberately: 10x, then 100x, then multi-region. They are testing whether your design has a growth path, whether you can identify the next bottleneck, and whether you avoid the two failure modes — a design that cannot grow, and a design that was over-built for scale nobody asked for.

The candidate who says "at this point the bottleneck moves from the application tier to the database write path, so the next move is X" is describing a system they understand. The candidate who adds three components at once is guessing.""",
                    ),
                    (
                        "Mental Model",
                        """A fixed order, because each step is cheaper than the next.

Measure → Scale up → Scale out → Cache → Replicate → Async → Shard → Regions

| Step | Cost | Buys you |
| --- | --- | --- |
| Measure | Hours | Knowing which component is actually the limit |
| Vertical scale | Money only | 2–10x, immediately, with no redesign |
| Horizontal stateless tier | Low | Elastic capacity and fault tolerance |
| Caching | Moderate | Often 10–20x read capacity |
| Read replicas | Moderate | Read capacity, with staleness |
| Async / queues | Moderate | Removes slow work from the request path |
| Sharding | High, hard to reverse | Write and storage capacity |
| Multi-region | Very high | Latency and survival of a region loss |

The rule: **never skip a step without saying why.** Going straight to sharding when a cache would remove 95% of the load is the most common over-engineering error, and interviewers ask about it precisely because it is common.""",
                    ),
                    (
                        "How It Works",
                        """### Find the actual bottleneck

Every system has exactly one limiting resource at a time. Candidates for it:

| Symptom | Likely bottleneck |
| --- | --- |
| CPU saturated on app nodes | Application compute — scale out |
| Database CPU high, queries simple | Read volume — cache, then replicas |
| Database write latency rising, IO saturated | Write throughput — batch, buffer, then shard |
| Connection pool exhausted | Pooling or a slow dependency, not capacity |
| Memory pressure and eviction | Cache undersized or a leak |
| Network egress saturated | Payload sizes, missing CDN |
| One shard or key far hotter than others | Skew, not capacity |
| Latency high, all resources idle | Waiting on a dependency — a queueing or lock problem |

The last row is the one people miss: if nothing is busy and everything is slow, you have a serialisation point — a lock, a single coordinator, a synchronous dependency — and adding capacity will do nothing.

### The steps in detail

**Scale up.** Doubling the instance size is a config change. Modern machines are very large. Do this first and say so; the engineering time saved is usually worth more than the money.

**Scale out the stateless tier.** Load balancer plus N identical nodes. Requires statelessness, which is why that lesson comes first. Nearly free once the tier is stateless.

**Cache.** Usually the highest leverage single change for read-heavy systems. Origin load becomes requests × (1 − hit rate).

**Read replicas.** Adds read capacity beyond cache misses. Costs staleness and a read-your-writes design.

**Go asynchronous.** Move anything not needed for the response off the request path. This reduces latency, decouples failure, and absorbs spikes without adding capacity.

**Shard.** The first genuinely expensive and hard-to-reverse move. Only for write throughput or data volume that exceeds one primary.

**Multi-region.** For latency to distant users or survival of a regional failure. It forces a consistency decision and roughly doubles operational complexity.

### Scaling patterns worth naming

- **Precompute.** Turning a read-time computation into a write-time one — materialised feeds, denormalised counters, aggregated rollups. Often better than scaling the thing that computes.
- **Batch.** Amortise per-operation overhead. Raises throughput, raises latency.
- **Approximate.** Exact counts are expensive at scale; HyperLogLog for unique counts, sampling for analytics, and an approximate "2.4M views" instead of an exact figure. A very good answer when exactness is not a product requirement.
- **Tier the data.** Hot data in memory, warm on SSD, cold in object storage. Most systems have an access distribution that makes this dramatic.
- **Shed and degrade.** Capacity you do not have is capacity you must decline to use. Serve a reduced experience rather than failing.

### Amdahl, practically

If any part of your request path is serialised — a single counter row, a global lock, one coordinator — that part caps your scaling regardless of everything else. The first question when scaling stops working is "what is still serialised?"
""",
                    ),
                    (
                        "Design Decisions",
                        """**How much headroom?** Design the structure for roughly 10x current traffic, provision capacity for about 2x peak. Designing for 1,000x means building something you cannot ship, and interviewers penalise it.

**Scale for peak or use autoscaling?** Autoscaling is cheaper and has a lag of minutes — insufficient for a sharp spike. For scheduled events, pre-scale. For sudden ones, you need queues and shedding, because no autoscaler is fast enough.

**What do you deliberately not scale?** A good answer names something: an admin panel, a reporting endpoint, a rarely used feature. Applying uniform scaling effort everywhere is waste.

**What is the cost curve?** At each step, roughly what does it cost, and does the revenue justify it? Staff-level answers include this.""",
                    ),
                    (
                        "Example",
                        """A product goes from 10,000 to 10 million daily users. The sequence, each step triggered by a measurement:

**10K DAU.** One app server, one Postgres. Fine, and correct.

**100K DAU (~100 peak QPS).** App CPU is the limit. Three app nodes behind a load balancer, sessions moved to Redis. One database, untouched.

**1M DAU (~1,000 peak QPS).** Database CPU at 70%, dominated by repeated reads. Add caching: hit rate 92%, database read load falls to 80 QPS. Add two read replicas for the misses and for reporting. Move image uploads to object storage with a CDN — egress was becoming the second bottleneck.

**5M DAU (~5,000 peak QPS).** Writes are now 800/s and the primary's IO is the limit. Move the highest-volume table — activity events — out of Postgres into a store designed for append-heavy writes. Buffer counter updates and flush periodically instead of updating rows per event. Feed generation moves to a queue and is precomputed on write.

**10M DAU (~12,000 peak QPS).** Core writes still exceed one primary. Shard by `user_id` into 1,024 logical shards on 8 machines. Cross-user queries move to an analytical store. This is the first step that took a quarter rather than a week — and that asymmetry is the point of the whole sequence.

**Global users.** Read replicas and CDN presence in a second region; writes stay in the primary region initially, accepting higher write latency for distant users, because active-active writes would force a conflict-resolution design that the product does not yet need.

Each move was triggered by a measured bottleneck, and the expensive moves came last.""",
                    ),
                    (
                        "Common Use Cases",
                        """- The "now it is 10x" phase of every design interview
- Planning capacity before a launch or a marketing event
- Deciding whether a performance problem needs scale or a fix
- Choosing what to build now versus what to make possible later""",
                    ),
                    (
                        "Trade-offs",
                        """- **Every scaling step adds operational complexity.** More components, more failure modes, more to monitor.
- **Caching and replication add staleness.** Sharding removes transactions and joins. Async removes immediate confirmation. Nothing is free.
- **Over-provisioning versus risk.** Headroom costs money continuously; too little means an incident.
- **Scale versus simplicity.** The best scaling move is sometimes deleting a feature, reducing payload size, or fixing an N+1 query.
- **Precomputation versus flexibility.** Materialised views are fast and must be rebuilt when the logic changes.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Scaling the wrong layer** because nobody measured — adding app nodes when the database is the limit.
- **Premature sharding**, adding permanent complexity for capacity nobody needed.
- **A serialised component** invisibly capping everything.
- **Autoscaling too slow** for the actual spike shape.
- **Scaling the app tier into the database**, where more app nodes simply exhaust database connections faster.
- **Unbounded queues** turning overload into a multi-hour backlog.
- **Cost growing superlinearly** with traffic, because the architecture never changed shape.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Traffic is 10x. What breaks first?"** — Name one component, name the number at which it breaks, name the next move. Then ask whether they want you to continue to 100x.
- **"Why not just shard now?"** — Because a cache removes 95% of reads for a fraction of the effort, and sharding is not reversible. Sequence matters.
- **"Everything is at 20% utilisation and it is still slow. What is wrong?"** — A serialisation point or a dependency wait, not capacity.
- **"How would you handle a 100x spike in one minute?"** — No autoscaler is that fast: pre-scale if predictable, otherwise queue, shed, and degrade. Say which requests you drop first.
- **"What would you do differently if cost were the constraint?"** — Cache harder, tier storage, reduce payloads, use spot capacity, and delete the features nobody uses.
- **"What is the limit of this architecture?"** — Every design has one. Naming yours before being asked is a strong move.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Applying every scaling technique at once
- Skipping vertical scaling because it seems unsophisticated
- Scaling without identifying the bottleneck
- Ignoring the serialised part of the path
- Forgetting that added components add failure modes
- Having no answer for what the design cannot do""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A photo-sharing app currently serves 100,000 daily users from two app servers and one database. Growth to 50 million daily users is expected over two years.

Write the scaling sequence. For each step: the trigger (a measured number), the change, the cost, and the new bottleneck it creates. You should have five to eight steps.

Then answer three harder questions:

1. Which step would you do *before* it is needed, because retrofitting it is disproportionately painful? (Hint: choosing a shard key and using logical shards costs almost nothing early and is extremely expensive later.)
2. Which step would you delay as long as possible, and how would you know you had waited too long?
3. At 50M users, what is the single largest line item in the infrastructure bill, and what architectural change addresses it?""",
                    ),
                    (
                        "Interview Tip",
                        """When asked to scale, always answer in the form: bottleneck, number, move, new bottleneck. "At 10x the database write path saturates around 8,000 writes per second, so I would buffer counters and move the event table out; after that the next limit is the primary's connection count." It sounds like someone who has watched a system grow.""",
                    ),
                ],
                [
                    "Scale in order: measure, scale up, scale out, cache, replicate, go async, shard, then regions.",
                    "Identify the single limiting resource before changing anything; if nothing is busy and everything is slow, you have a serialisation point.",
                    "Sharding and multi-region are the expensive, hard-to-reverse moves — delay them and prepare for them early.",
                    "Precomputation, batching, approximation and tiering often beat adding capacity.",
                ],
                [
                    "Traffic increases 10x. What breaks first and what do you do?",
                    "Why not shard immediately if you know you will need it?",
                    "All resources are idle and latency is high. What is the problem?",
                    "How would you absorb a 100x spike that arrives in one minute?",
                ],
            ),
        ],
    )


def _operations_topic() -> dict:
    return _sd_topic(
        "resilience-operations",
        "Multi-Region, Disaster Recovery, and Cost",
        "The three questions senior candidates get asked last and most: how it survives a region loss, how it recovers from data loss, and what it costs to run.",
        "HARD",
        23,
        [
            SD(
                "sd-multi-region",
                "Multi-Region Architecture",
                "Serving users from several places at once, and the consistency decision you cannot avoid.",
                14,
                "Going multi-region is done for two reasons: latency for distant users, and survival of an entire region failing. Both are legitimate, both are expensive, and the hard part is neither the compute nor the networking — it is deciding what happens to data that can be written in more than one place.",
                [
                    (
                        "Why It Matters",
                        """"How would you support multiple regions?" is a standard senior and staff follow-up, and it is a good one because it forces every earlier decision to be re-examined. Your cache, your database, your queues, your session handling, and your consistency model all change.

The wrong answer is "we'd deploy to two regions and use DNS". The right answer starts by asking what the second region is *for*, because a read-latency region and a disaster-recovery region are different systems.""",
                    ),
                    (
                        "Mental Model",
                        """Four topologies, in ascending order of cost and capability.

| Topology | Writes | Failover | Cost | Complexity |
| --- | --- | --- | --- | --- |
| Single region, multi-AZ | One region | Survives a zone, not a region | Baseline | Low |
| Active-passive | Primary region only | Manual or automated promotion, minutes | +30–60% | Moderate |
| Active-active, single write region | Reads local, writes central | Reads fail over instantly | +60–100% | Moderate |
| Active-active, multi-write | Writes anywhere | Instant | +100% and up | High — conflicts |

> Memory cue: read replication across regions is a normal engineering project. Accepting writes in two regions is a different discipline, because it means conflicts.

Most products stop at the third row, and saying that is a strong answer: local reads everywhere, writes routed to one region, and the consistency model stays comprehensible.""",
                    ),
                    (
                        "How It Works",
                        """### Start with multi-AZ

Before multi-region: three availability zones within one region gives you synchronous replication at sub-millisecond latency, survival of a datacentre failure, and almost none of the consistency problems. Most "we need high availability" requirements are satisfied here, at a fraction of the cost. Say this before you propose regions.

### The physics

Cross-region round trips are 60–200 ms. That number governs everything:

- A synchronous cross-region write adds a full round trip to every write.
- A quorum across three distant regions adds the latency to the second-nearest.
- Asynchronous replication is fast and means the remote region is behind by the replication lag — which is exactly the data you lose on an unplanned failover.

### Routing

Anycast or a global load balancer at the edge, with health-based failover. DNS-based steering is the cheaper alternative and is TTL-bound. Users should be routed to their nearest healthy region, with automatic spillover.

### Data: the actual problem

Four strategies:

1. **Single write region, read replicas elsewhere.** Simplest. Distant users get fast reads and slow writes. Read-your-writes needs care: after a write, route that user's reads to the write region briefly.
2. **Partition by geography.** Each user's data has a home region and is written only there. This is the best answer for most consumer products: European users write in Europe, American users in America, and there are no conflicts because no record is written in two places. Cross-region access is a read from the home region — slower, and rare.
3. **Active-active with conflict resolution.** Any region accepts writes; conflicts resolved by last-write-wins, CRDTs, or business rules. Necessary for genuinely global shared state, and it is real work.
4. **Globally consistent database.** Spanner, CockroachDB, or similar buys strong consistency across regions with consensus, and charges for it in write latency — typically tens to hundreds of milliseconds. Legitimate when correctness dominates.

Geo-partitioning is also frequently a legal requirement rather than a performance one: data residency rules may mandate that records stay in a jurisdiction, which decides the strategy for you.

### Everything else must also be regional

Easy to forget and important to mention:

- **Caches** are per region; a cache invalidation must be broadcast to all of them.
- **Queues and streams** are usually per region, with either regional consumers or cross-region mirroring.
- **Object storage** is regional; cross-region replication is a configuration and a cost.
- **Sessions** must be valid in any region, which argues for stateless tokens.
- **Schema migrations and deploys** must be safe in a partially-migrated, mixed-version, multi-region state.
- **Coordination services** need a majority, so a three-region deployment tolerates one region loss and a two-region one does not.

### Failover

- **RTO** — how long until service is restored.
- **RPO** — how much data you may lose, which with asynchronous replication is the replication lag.

Failover steps: detect, promote the replica, redirect traffic, and verify. The hardest part is the decision to fail over at all: doing it unnecessarily is itself an incident, and doing it during a partial degradation can be worse than staying put.

**Failback** is the part nobody plans and everyone needs. When the original region recovers, it holds writes the promoted region never saw. Those must be reconciled or discarded deliberately, and the process should be written down before you need it.

Finally: **an untested failover does not work.** Regular game days, or a routine that regularly shifts traffic between regions, is the only way to know. Saying this is a strong signal.""",
                    ),
                    (
                        "Design Decisions",
                        """**Why the second region?** Latency, availability, or data residency. The answer determines the topology. Do not build active-active for a latency problem that read replicas would solve.

**What is the acceptable RPO?** Zero means synchronous cross-region replication and its latency cost. Seconds means asynchronous, which is what most products choose.

**Do writes need to be local?** Only if write latency is a product problem or a region must operate independently. Otherwise route writes centrally and keep the model simple.

**How do you handle the user who moves?** A European user travelling to Asia still has European data. Their reads are slower, and they should not be silently migrated. Naming this shows you have thought past the diagram.

**What is the blast radius of a deploy?** Region-by-region rollout with bake time is one of the main benefits of multi-region — a bad deploy affects one region, not everyone.""",
                    ),
                    (
                        "Example",
                        """A SaaS product with customers in North America and Europe, and a legal requirement that European customer data stays in Europe.

**Topology:** active-active with geo-partitioning by tenant. Each tenant has a home region recorded in a small globally replicated routing table.

**Routing:** anycast edge; a request is resolved to the tenant's home region. A European user hitting a US edge is proxied to Europe — slower for that request, correct for the law.

**Data:** each region has its own primary and replicas; no tenant's data is written in two regions, so there are no conflicts by construction. The tenant routing table is the only globally consistent data, it is tiny, and it changes rarely.

**Caches, queues, object storage:** all regional. Cross-region invalidation applies only to the routing table.

**Failure:** if Europe is down, European tenants are unavailable — because their data legally cannot be served from the US. That is an explicit, documented trade-off, and the mitigation is multi-AZ within Europe plus backups, not cross-region serving. Stating the limitation plainly is stronger than pretending the design survives everything.

**Deploys:** rolled out to one region first, with a bake period, then the other.

The reason this design is clean is that geo-partitioning eliminated the conflict problem entirely. That is the move worth remembering.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Global consumer products with latency requirements
- Regulated industries with data residency rules
- Systems whose availability target exceeds what one region provides
- Large enterprises requiring regional isolation between business units""",
                    ),
                    (
                        "Trade-offs",
                        """- **Latency versus consistency.** Local writes mean conflicts; central writes mean slow writes for distant users.
- **Cost.** Roughly double the infrastructure plus cross-region data transfer, which is often the surprise line item.
- **Complexity.** Every stateful component needs a regional story, and every runbook doubles.
- **Availability versus correctness during a partition.** Regions will lose contact with each other; you must decide in advance what each does alone.
- **Active-active versus active-passive.** Instant failover and conflict handling, versus minutes of downtime and a simple model.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Split brain across regions** with both accepting writes and no reconciliation.
- **Data loss on unplanned failover** equal to the asynchronous replication lag.
- **Untested failover** that fails when needed, usually because of a forgotten dependency.
- **Forgotten regional component** — a queue, a cache, a cron job — that only exists in one region.
- **Failback with no plan**, leaving divergent data permanently.
- **Cross-region calls on the hot path**, adding 150 ms that nobody budgeted.
- **Cross-region data transfer costs** exceeding compute costs.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"How would you support multiple regions?"** — Ask why first. Then the topology, the data strategy, and the consistency consequence.
- **"A region goes down. Walk me through it."** — Detection, traffic shift, promotion, RPO, what users experience, and failback.
- **"How do you handle writes in two regions?"** — Prefer geo-partitioning so the question does not arise; otherwise name the conflict resolution mechanism and what it loses.
- **"What is your RTO and RPO?"** — Give numbers and say what they cost.
- **"What does this cost?"** — Roughly double, plus inter-region transfer. Naming transfer specifically shows you have seen a real bill.
- **"How do you know failover works?"** — Regular drills. Anything else is a hope.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Proposing multi-region when multi-AZ meets the requirement
- Going active-active without a conflict story
- Forgetting caches, queues, and scheduled jobs are regional
- No failback plan
- Ignoring cross-region latency on the request path
- Never testing failover""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A social app with 100M users across the Americas, Europe, and Asia. Users interact globally — an Asian user comments on an American user's post.

1. Which topology, and why?
2. Where does a post live, and where does a comment on it live?
3. A user in Asia comments on a post whose home region is the US. What is the write latency, and how would you make the UI feel fast anyway?
4. Two users in different regions like the same post simultaneously. Is that a conflict? What about two users editing the same post?
5. The Europe region fails. Which users are affected, in what way, and what is the recovery sequence?

Part 4 is the interesting distinction: a like is a commutative increment and needs no conflict resolution at all (a counter CRDT or per-user like rows), whereas an edit to shared text is a genuine conflict. Recognising which operations commute is what makes global designs tractable.""",
                    ),
                    (
                        "Interview Tip",
                        """Ask why before designing: "Is the second region for latency, for availability, or for data residency?" Each answer produces a different architecture, and asking demonstrates that you know that.""",
                    ),
                ],
                [
                    "Multi-AZ solves most availability requirements; multi-region is for latency, region loss, or data residency.",
                    "Geo-partitioning — each record has a home region — avoids write conflicts entirely and is the best default.",
                    "Asynchronous cross-region replication means your RPO equals the replication lag on an unplanned failover.",
                    "Every stateful component needs a regional story, and an untested failover does not work.",
                ],
                [
                    "Why do you want a second region, and how does the answer change the design?",
                    "How do you handle writes accepted in two regions?",
                    "A region fails. What is your RTO, your RPO, and what do users see?",
                    "What does multi-region cost, and which line item surprises people?",
                ],
            ),
            SD(
                "sd-disaster-recovery",
                "Backups, Disaster Recovery, and Data Loss",
                "The failures replication does not protect you from, and the restore you have never tested.",
                12,
                "Replication protects against hardware failure. It does not protect against a bad migration, a buggy deploy, ransomware, or an engineer running a DELETE without a WHERE clause — because it replicates all of those faithfully, in milliseconds. Backups and recovery are a separate discipline, and the part that matters is restore, not backup.",
                [
                    (
                        "Why It Matters",
                        """"How do you recover from data loss?" distinguishes candidates who have only designed systems from those who have operated them. The common answer — "we have replicas" — is wrong in a specific and instructive way, and interviewers ask it because of that.

The follow-up that matters even more is "when did you last test a restore?", because an untested backup is a belief, not a control.""",
                    ),
                    (
                        "Mental Model",
                        """Different failures need different protections.

| Failure | Protection |
| --- | --- |
| Disk or node dies | Replication |
| Availability zone dies | Multi-AZ replication |
| Region dies | Cross-region replication or backups |
| Bad deploy corrupts data | Point-in-time restore |
| Accidental deletion | Backups, soft delete, versioning |
| Ransomware or a compromised account | Immutable, isolated backups |
| Slow logical corruption | Long retention plus the ability to find when it started |

Only the first three are replication. The rest are backups, and the last one requires backups an attacker with your credentials cannot delete.

Two numbers frame everything:

- **RPO** — how much data you can afford to lose, measured in time.
- **RTO** — how long you can be down while recovering.""",
                    ),
                    (
                        "How It Works",
                        """### Backup types

- **Full** — everything. Slow, large, simple to restore.
- **Incremental** — changes since the last backup. Fast and small; restore needs the chain, and a broken link is fatal.
- **Snapshot** — a point-in-time copy at the storage layer. Fast to take, usually in the same failure domain as the original unless copied elsewhere.
- **Continuous / write-ahead log archiving** — ship the transaction log continuously. Enables point-in-time recovery to any second, which is the capability that matters for "undo the bad migration at 14:32".

Point-in-time recovery is the one to name. A nightly backup gives an RPO of up to 24 hours; a nightly backup plus continuous log archiving gives an RPO of seconds and the ability to stop just before the damaging statement.

### The 3-2-1 rule

Three copies, on two different media or systems, one off-site. In cloud terms: the primary, an automated backup in the same region, and a copy in a different region or a different account.

The account separation matters more than the region separation for the threat that actually loses companies their data: a compromised set of credentials with permission to delete backups. Backups should be in an isolated account with write-once retention that the production role cannot override.

### Restore is the product

Backups have a completion metric that is easy to satisfy and meaningless. The metrics that matter:

- **Time to restore** a full production dataset, measured, not estimated. A 10 TB restore can take many hours.
- **Verified restores** on a schedule — restore into an isolated environment and run consistency checks.
- **A documented runbook** somebody other than its author has followed.

The classic failure: backups ran successfully for two years, and the first real restore reveals they were of the wrong database, missing a table, or encrypted with a key nobody has.

### Soft delete and versioning

The cheapest protection against the most common cause of data loss, which is a person or a bug:

- Mark rows deleted and purge later, so a mistake is reversible for a window.
- Object storage versioning, so an overwrite is recoverable.
- A delay between a user requesting account deletion and the data actually going, consistent with your privacy policy.

### Application-level corruption

The hardest case. A bug writes subtly wrong data for six hours before anyone notices. Now you must restore to a point in the past *without* discarding the six hours of legitimate writes mixed in with the bad ones.

The techniques: restore a copy to a parallel environment, identify affected records by the bug's signature, and repair selectively rather than rolling everything back. This is far easier if you have an append-only event log or an audit trail to reconstruct from — which is a real argument for keeping one.

### Disaster recovery tiers

| Strategy | RTO | RPO | Cost |
| --- | --- | --- | --- |
| Backup and restore | Hours to days | Hours | Lowest |
| Pilot light — minimal standby, data replicated | Tens of minutes | Minutes | Low |
| Warm standby — scaled-down full stack | Minutes | Seconds | Moderate |
| Hot standby / active-active | Seconds | Near zero | Highest |

Match the tier to the business impact per hour of downtime. Not every system deserves hot standby, and saying that an internal analytics tool gets backup-and-restore while the payment path gets warm standby is exactly the kind of proportionality interviewers want.""",
                    ),
                    (
                        "Design Decisions",
                        """**What is the RPO and RTO per dataset?** They differ. Orders might be RPO zero; a derived search index might be RPO infinite because it can be rebuilt from the source. Marking data as *rebuildable* is a genuine simplification — you do not need to back up what you can regenerate.

**How long do you retain?** Enough to detect slow corruption. Thirty days of daily backups plus a few monthly ones is common; regulated data may require years.

**Where do backups live?** Different region, different account, immutable retention, encrypted with keys managed separately from production.

**Who can delete a backup?** Ideally nobody with production access, and not without a second approval.

**How often do you test?** Quarterly at minimum, and after any significant schema or infrastructure change.""",
                    ),
                    (
                        "Example",
                        """A migration at 14:32 drops a column with six months of data. It replicates to all replicas within 200 ms, and to the cross-region replica a second later. Every copy of the data is now equally wrong.

Recovery with point-in-time capability:

1. **14:40** — detected by an error-rate alert and confirmed by a report of missing data.
2. **14:45** — restore a new instance to 14:31:59 from the base snapshot plus archived logs. This takes 40 minutes for a 2 TB dataset — a number you should know in advance rather than discover now.
3. **15:25** — extract the dropped column's data from the restored copy.
4. **15:40** — backfill the column into the live database, which has continued serving writes throughout. Users lost that field for about an hour; no other data was lost.

Note what made this work: the live system was never rolled back, only one column was repaired, and the recovery was surgical. The alternative — restoring the whole database to 14:31 — would have discarded an hour of legitimate orders, which is usually a worse outcome than the original bug.

Without point-in-time recovery, the choice would have been between losing up to 24 hours of everything or losing the column permanently.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any system holding data that cannot be regenerated
- Regulated industries with retention requirements
- Protection against ransomware and insider risk
- Recovering from bad migrations and buggy deploys
- Cloning production data into a test environment, which is the best way to make restores routine""",
                    ),
                    (
                        "Trade-offs",
                        """- **RPO versus cost.** Continuous log archiving costs more than nightly dumps and is usually worth it.
- **Retention versus storage and privacy.** Long retention aids recovery and conflicts with data-minimisation obligations; deletion requests must reach backups too, which is a real and often-missed requirement.
- **Immutable backups versus flexibility.** Write-once retention protects against deletion and prevents you from correcting mistakes in the backup set.
- **Hot standby versus cost.** Near-zero RTO for a continuously-paid premium.
- **Testing restores versus effort.** It is real work, and it is the only thing that converts a backup into a recovery capability.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Backups that were never restored**, discovered to be unusable at the worst moment.
- **Backups in the same account or region** as the thing they protect.
- **Replication mistaken for backup.**
- **Restore time far longer than the RTO**, never measured.
- **Backup encryption keys** lost or stored only in the system being restored.
- **Partial backups** — the database is backed up and object storage is not, so metadata and files no longer match.
- **Deletion requests not propagating to backups**, creating a compliance problem.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"Someone runs DELETE without a WHERE clause. What happens?"** — Replication propagates it; recovery is point-in-time restore plus a surgical repair. Give the timeline.
- **"What is your RPO and RTO?"** — Per dataset, with numbers, and say which data is rebuildable and therefore needs neither.
- **"How do you know your backups work?"** — Scheduled test restores with verification. Anything else is faith.
- **"How long does a restore take?"** — A measured number. "We have backups" without this is an incomplete answer.
- **"How do you protect against ransomware?"** — Immutable backups in an isolated account that production credentials cannot delete.
- **"A bug wrote bad data for six hours. How do you fix it without losing the good writes?"** — Parallel restore, identify by signature, selective repair. This is the hardest and best version of the question.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating replication as a backup
- Never testing a restore
- Storing backups where the same credentials can delete them
- No point-in-time capability, so the only option is losing a day
- Backing up the database but not object storage, or vice versa
- Ignoring that deletion requests must reach backups""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A system holds: a 5 TB transactional database, 200 TB of user-uploaded files in object storage, a 2 TB search index, and a 50 TB analytics warehouse.

1. Give an RPO and RTO for each, with justification.
2. Which of these do you not need to back up at all, and why?
3. A deploy at 09:00 corrupts a field in 2% of rows. You discover it at 15:00. Describe the recovery for the database.
4. A compromised credential deletes the production database and attempts to delete the backups. What stops it?
5. A user exercises their right to erasure. What must happen, and what makes backups awkward here?

Part 2 has the answer worth internalising: the search index is derived and should be rebuildable from the database, so it needs no backup — only a documented and tested rebuild procedure, and an honest estimate of how long that rebuild takes.""",
                    ),
                    (
                        "Interview Tip",
                        """Say the sentence that separates you: "Replication is not a backup — it will replicate a destructive statement perfectly. We need point-in-time recovery, backups in a separate account, and a tested restore procedure with a known restore time." Four clauses, and it is the answer most candidates do not give.""",
                    ),
                ],
                [
                    "Replication protects against hardware failure; only backups protect against bad code, bad commands, and attackers.",
                    "Point-in-time recovery is the capability that turns a 24-hour RPO into a seconds-long one.",
                    "Keep backups in a separate account with immutable retention that production credentials cannot delete.",
                    "The metric that matters is measured restore time, and an untested backup is not a recovery capability.",
                ],
                [
                    "Why is replication not a backup?",
                    "What are your RPO and RTO, and how do you know the restore meets them?",
                    "A bug wrote bad data for six hours. How do you recover without losing the good writes?",
                    "Which data in your system does not need backing up, and why?",
                ],
            ),
            SD(
                "sd-cost-optimization",
                "Cost, Capacity, and Efficiency",
                "The dimension that separates staff-level answers: what this architecture costs to run and what you would change if the budget halved.",
                11,
                "Every architectural decision has a price, and at scale the bill is frequently the binding constraint rather than latency or throughput. Interviewers ask about cost to find out whether you have ever owned a system's economics, and it is one of the easiest ways to demonstrate seniority because so few candidates volunteer it.",
                [
                    (
                        "Why It Matters",
                        """A design that is technically excellent and costs three times what the product earns is not excellent. Real architectural decisions are routinely made on cost: choosing a cheaper storage tier, accepting eventual consistency to avoid cross-region writes, or deleting a feature whose infrastructure cost exceeds its revenue.

The question "how would you reduce this system's cost by 50%?" is a genuine staff-level probe, and it has real answers that are worth knowing.""",
                    ),
                    (
                        "Mental Model",
                        """Know roughly where the money goes, because it is rarely where people assume.

| Category | Typical share | Main lever |
| --- | --- | --- |
| Compute | 30–50% | Right-sizing, autoscaling, spot, efficiency |
| Storage | 10–30% | Tiering, retention, compression, deduplication |
| Data transfer | 5–30% | CDN, locality, avoiding cross-zone and cross-region hops |
| Managed services | 10–30% | Tier selection, consolidation |
| Observability | 5–15% | Log volume, metric cardinality, retention |

The two that consistently surprise people are **data transfer** — especially cross-AZ and cross-region — and **observability**, which grows with traffic and is rarely budgeted.

> Memory cue: at scale, the cheapest request is the one that never reaches your servers, and the cheapest byte is the one you never stored.""",
                    ),
                    (
                        "How It Works",
                        """### Compute

- **Right-size.** Most fleets are provisioned from a guess and run at low utilisation. Measuring before scaling is usually the single largest immediate win.
- **Autoscale.** Consumer traffic varies 3–5x between peak and trough; provisioning for peak all day wastes most of it.
- **Spot or preemptible capacity** for interruptible work — batch, transcoding, CI — at 60–90% discounts. Requires the workload to tolerate termination, which is another argument for statelessness and idempotency.
- **Commitments.** Reserved or committed-use pricing for the steady baseline, on-demand for the variable part.
- **Efficiency.** A 30% CPU reduction is a 30% compute saving forever. Profiling the hot path is sometimes cheaper than any infrastructure change.

### Storage

- **Lifecycle tiering.** Hot to infrequent to archive on an access-based schedule. For large media archives this is frequently the biggest single saving available.
- **Retention.** Most systems store data nobody has read in years. Deleting is free and permanent.
- **Compression and format.** Columnar formats with compression for analytical data routinely reduce size by 5–10x and speed up queries at the same time.
- **Deduplication.** Content-addressed storage for files that repeat.
- **Derived data.** Anything rebuildable can live in cheaper storage with a shorter retention, because the recovery path is regeneration.

### Data transfer

The line item people discover late:

- **Cross-AZ traffic is charged** in most clouds. A chatty service mesh spreading requests randomly across zones can generate a large bill for nothing; zone-aware routing with spillover removes most of it.
- **Cross-region replication** costs per byte, continuously.
- **Egress to the internet** is the expensive direction; CDN offload reduces both origin egress and origin compute.
- **Payload size.** Compression, efficient serialisation, and not returning fields nobody uses reduce cost and latency together.

### Managed services

Managed databases, queues, and search cost more per unit than self-hosted and remove operational work. The honest comparison includes engineer time and the cost of the outages you would have had. The usual answer is that managed is worth it until a component is so large that a dedicated team is cheaper than the premium.

### Observability

Logs dominate. Sample successful requests, keep all errors, reduce metric cardinality, shorten hot retention and downsample older data. A 10x log volume reduction is usually achievable without losing debugging capability, because most logs are never read.

### The most effective lever

Caching and CDN offload, because they reduce compute, database load, and egress simultaneously. Raising a CDN offload ratio from 85% to 97% can cut origin infrastructure by half.

### Cost per unit

The metric that makes this manageable: cost per user, per request, or per transaction. Tracking it turns cost into an engineering signal rather than a monthly surprise — you can see a deploy make it worse. Attributing cost per tenant also tells you which customers are unprofitable, which is a business insight infrastructure can provide.""",
                    ),
                    (
                        "Design Decisions",
                        """**What is the dominant cost of this design?** Answer it while designing. For a video platform it is egress; for an analytics platform it is storage and query compute; for a chat system it is the connection tier.

**Where is exactness optional?** Approximate counting, sampled analytics, and eventual consistency are all cheaper. Ask whether the product needs exactness before paying for it.

**What is the cost of the reliability target?** Each additional nine costs real money. If the business impact of an hour of downtime is small, four nines is over-investment — and saying so is a sign of judgement rather than carelessness.

**What is the cost of the deployment topology?** Multi-region roughly doubles infrastructure. Confirm the requirement justifies it.""",
                    ),
                    (
                        "Example",
                        """A video platform's monthly bill: 60% CDN egress, 20% storage, 15% transcoding compute, 5% everything else.

Halving it, in order of impact per unit of effort:

1. **Encoding efficiency.** Moving to a more efficient codec for the most-watched content reduces bitrate 30–50% at equivalent quality. That cuts the largest line item directly, and improves playback on poor connections. The cost is more transcoding compute and a compatibility fallback for older devices.
2. **Rendition strategy.** Do not generate 4K for videos nobody watches. Transcode the top renditions on upload and generate the rest on first request. Cuts both transcoding compute and storage, with a small first-view latency penalty for rare content.
3. **Storage tiering.** Viewing follows a steep power law: most content is watched in the first week. Move older, rarely-watched renditions to archive tiers, regenerating on demand if requested.
4. **Transcoding on spot capacity.** Interruptible by nature, checkpointed per segment. Large discount, occasional restarts.
5. **CDN offload ratio.** Longer TTLs and a shield tier to reduce origin fetches.

Notice that the biggest saving was not an infrastructure setting; it was changing what bytes exist. That is the general pattern, and it is why cost optimisation is an architecture topic rather than a procurement one.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Staff-level design interview follow-ups
- Annual infrastructure budget planning
- Making a low-margin product viable
- Deciding between managed and self-hosted
- Understanding unit economics per customer""",
                    ),
                    (
                        "Trade-offs",
                        """- **Cost versus reliability.** Fewer replicas and fewer regions are cheaper and less resilient. Make the trade explicit rather than accidental.
- **Cost versus latency.** Archive tiers, fewer edge locations, and smaller caches all save money and cost milliseconds.
- **Cost versus engineering time.** Self-hosting saves licence fees and consumes engineers, who are usually more expensive.
- **Commitments versus flexibility.** Reserved capacity is cheaper and locks you in.
- **Spot versus complexity.** Large discounts for workloads that can be interrupted, which requires the design to tolerate it.
- **Optimising now versus later.** Premature cost optimisation is as wasteful as premature scaling; it matters when the bill is material.""",
                    ),
                    (
                        "Common Failure Modes",
                        """- **Cross-AZ traffic** generating a large invisible bill.
- **No lifecycle policies**, so storage grows forever.
- **Log volume growing with traffic** until observability rivals compute.
- **Over-provisioned fleets** running at 10% utilisation.
- **Orphaned resources** — unattached disks, idle load balancers, forgotten environments.
- **Development environments** running at production scale overnight and at weekends.
- **Per-tenant cost never measured**, so unprofitable customers are invisible.""",
                    ),
                    (
                        "Interviewer Follow-ups",
                        """- **"What does this system cost to run?"** — Name the dominant category and roughly why. Precision is not expected; knowing where the money goes is.
- **"How would you halve the cost?"** — Three or four concrete levers, ordered by impact, each with its trade-off.
- **"What is the most expensive part of this design?"** — Usually egress or storage for media systems, compute for request-heavy ones.
- **"Would you use managed services?"** — Yes at first, with the threshold at which self-hosting becomes worth it.
- **"How do you stop cost growing faster than usage?"** — Track cost per request or per user, alert on the ratio, and attribute by service and tenant.
- **"What would you cut if the budget halved tomorrow?"** — Have an ordered list: retention first, then non-production environments, then reliability margin, then features.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Never mentioning cost in a design
- Assuming compute dominates when transfer or storage often does
- Ignoring cross-zone transfer charges
- Letting observability grow unbounded
- Over-provisioning for a peak that autoscaling would handle
- Optimising cost before the system has meaningful traffic""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A B2B analytics product: 500 customers, 2 TB ingested daily, 90-day hot retention and 2-year cold, dashboard queries all day. The monthly bill is 40% query compute, 35% storage, 15% ingestion, 10% observability.

1. Give three changes to halve it, ordered by impact per unit of effort.
2. Which changes are invisible to customers and which are not?
3. One customer generates 30% of the query cost and pays 3% of the revenue. What are your options, technically and commercially?
4. What would you measure so this does not recur?

Part 3 is the one that makes this a staff-level topic: the technical answers (per-tenant quotas, result caching, query cost limits, pre-aggregation) and the commercial answers (usage-based pricing, tier limits) are both legitimate, and knowing that infrastructure design and pricing are the same conversation is the insight.""",
                    ),
                    (
                        "Interview Tip",
                        """Volunteer one sentence of cost awareness in every design: "The dominant cost here will be CDN egress, so the offload ratio is the number I would watch." It takes five seconds and very few candidates say anything about money at all.""",
                    ),
                ],
                [
                    "Know where the money goes: compute, storage, transfer, managed services, and observability — transfer and logging are the usual surprises.",
                    "The cheapest request never reaches your origin and the cheapest byte was never stored — caching and lifecycle policies are the biggest levers.",
                    "Track cost per request or per tenant so cost becomes an engineering signal instead of a monthly surprise.",
                    "Every additional nine of availability costs real money; match the target to the business impact.",
                ],
                [
                    "What is the dominant cost in this architecture, and why?",
                    "How would you halve this system's running cost?",
                    "Which costs grow faster than traffic, and how do you control them?",
                    "One customer is unprofitable. What are your technical and commercial options?",
                ],
            ),
        ],
    )


def system_design_topics() -> list[dict]:
    """Every topic in the System Design category, in curriculum order."""
    from database.seeds.learn_system_design_cases import case_study_topic

    return [
        _playbook_topic(),
        _foundations_topic(),
        _requirements_topic(),
        _capacity_topic(),
        _networking_topic(),
        _api_topic(),
        _load_balancing_topic(),
        _caching_topic(),
        _databases_topic(),
        _sql_nosql_topic(),
        _replication_topic(),
        _sharding_topic(),
        _queues_topic(),
        _eda_topic(),
        _consistency_topic(),
        _cap_topic(),
        _distributed_topic(),
        _rate_limiting_topic(),
        _services_topic(),
        _observability_topic(),
        _security_topic(),
        _scalability_topic(),
        _operations_topic(),
        case_study_topic(),
    ]
