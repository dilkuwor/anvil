# Learn platform audit and recommendations

Response to `docs/RESEARCH.md`. Analysis only, no code was changed for this document.
Written 2026-09-27 against the live database (342 lessons, 7 categories) and the current code.

Every recommendation is tagged so evidence is not mixed with opinion:

- **[Evidence]** a learning-science finding with sources
- **[Hypothesis]** a product idea that is plausible but not proven
- **[UX]** a design preference
- **[Eng]** an engineering recommendation

---

## A. Executive summary

**What works.** Anvil is already far past "a collection of pages". It has a study path with ten
units, a daily plan, a Leitner review queue with self-rating, a readiness score built from
coverage and modelled retention, 57 step-through visualizers, a Java sandbox, three kinds of
mock interview, a system design simulator with a real queueing model, an AI tutor with quiz
and interview modes, notes, and now an audio reader that follows the text. Lesson structure is
remarkably consistent: 341 of 342 lessons have Why it matters, How it works, Common mistakes
and Interview tip, and every lesson has takeaways and interview questions.

**What is missing.** The platform teaches well but it does not yet *test* well. Nearly all
retrieval is self-graded recall of takeaways. There are no answerable check questions, no
predict-before-reveal interaction, no prerequisite links, no mistake tracking, and the review
scheduler cannot tell an easy card from a hard one. Three whole categories are stubs.

**The largest learning problems, in order**

1. **Retrieval is thin.** A lesson review card says "recall the main points, then reveal". The
   interview questions have no answers, so they cannot be checked. Nothing in the product can
   tell whether a learner *knows* a concept or only *recognises* it. This is the "illusion of
   learning" the brief warns about, and it is the highest-value gap.
2. **48 lessons are empty.** Java (15), CS fundamentals (16) and Behavioral (17) lessons average
   about 500 characters, with no mental model, no exercise, no code and no tables. They exist
   in navigation but teach almost nothing.
3. **Lessons are islands.** Only 4 of 342 lessons mention a prerequisite. Only 62 lesson-to-problem
   links exist, and 55 of those are in DSA. System design, OOD and AI/ML lessons link to no
   practice at all. The roadmap graph has prerequisites, but only for coding topics.
4. **Review is coarse.** Five fixed Leitner boxes (1, 3, 7, 21, 60 days) treat every card the
   same. A "shaky" rating changes nothing except the date. There is no per-card difficulty, so
   easy cards come back too often and hard ones too rarely.
5. **The lesson is a wall.** Average lesson length is 8,600 characters, system design 12,900.
   All seven sections are open at once. For a learner with limited attention this is the
   single biggest cognitive-load problem, and it is a presentation fix, not a content fix.

---

## B. What the brief asks for versus what exists

| Brief area | State today | Gap |
|---|---|---|
| Retrieval practice | Review cards (recall takeaways, self-rate), Ask AI quiz mode, self-check ticks on interview questions | No answerable items, no correctness signal |
| Spaced repetition | Leitner, 5 boxes, cards for lessons, problems and designs | Fixed intervals, no difficulty, "shaky" is a no-op |
| Predict-before-reveal | 204 lessons *mention* predicting; renderer has no reveal block | No way to commit an answer |
| Worked examples | 13 worked DSA problems, code blocks in 805 places | No fading (complete-the-step) |
| Interleaving | Review queue mixes kinds; Today mixes problems, lessons, designs | Not deliberate across topics |
| Cognitive load | Consistent sections, calm UI, reader, collapsible rails | Everything expanded at once, 8.6k chars per lesson |
| Mental models | 236 lessons have a Mental model section | Missing in Java, CS, Behavioral (stubs) |
| Visualizations | 57 viz directives across 46 lessons, 44 DSA, 44 system design | 0 in OOD, AI/ML, Java, CS |
| Common mistakes | Section in 341 lessons | Prose only; not tracked, not retrievable |
| Knowledge graph | Roadmap prerequisites for coding topics; topic sidebar | No lesson prerequisites, no related concepts across categories |
| Adaptive learning | Readiness = coverage x modelled retention | No learner model per concept, no weakness detection |
| Confidence | None | Not collected |
| Interview transfer | 4 interview questions per lesson, interview tip, follow-ups in 292 lessons | Questions have no model answers |
| System design interaction | Simulator with queueing, failures, cost, SLO review | Not embedded in lessons; 70 SD lessons have 0 problem links |
| DSA interaction | 44 visualizers, sandbox, mock interviews | Lessons rarely ask the learner to *do* anything before practice |
| Learning metrics | Recall rate over recent reviews, readiness, streak, activity | No per-topic accuracy, no delayed recall, no calibration |
| AI | Tutor with explain, quiz, interview modes, streaming | No teach-back grading, no weakness-driven questions |
| Illusion of learning | "Mark complete" is the completion signal | Completion is free and unverified |
| Micro-learning | Lessons are one page each | No layers or optional deep dives |

---

## C. Learning-science findings that should drive the work

Only principles that change what Anvil should build are listed.

1. **Retrieval beats rereading, and the gap grows with delay. [Evidence]** Roediger and
   Karpicke (2006) found testing after study produced markedly better one-week retention than
   repeated study. Karpicke and Blunt (2011) found retrieval practice beat concept mapping even
   for meaningful learning. Dunlosky et al. (2013) rate practice testing and distributed
   practice as the two highest-utility techniques across their review. *For Anvil:* every lesson
   needs items the learner must answer, and the review queue must present those items, not the
   lesson summary.

2. **Spacing works, and optimal gaps scale with the retention interval. [Evidence]** Cepeda
   et al. (2006, 2008) show expanding gaps of roughly 10 to 20 percent of the target retention
   interval. Modern schedulers (FSRS, Ye et al. 2022) fit per-card stability and difficulty from
   ratings and outperform fixed-box systems on the same review budget. *For Anvil:* replace
   fixed boxes with a per-card model. The rating UI can stay as calm as it is now.

3. **Generation and prediction improve encoding. [Evidence]** The generation effect (Slamecka
   and Graf 1978) and pretesting effects (Kornell, Hays and Bjork 2009) show that committing to
   an answer before seeing it, even a wrong one, improves later recall. *For Anvil:* a
   predict-before-reveal block that requires a click or a short answer, not a rhetorical
   question in prose.

4. **Worked examples first, then fade them. [Evidence]** Sweller and Cooper (1985) and Renkl
   and Atkinson (2003) show novices learn faster from worked examples than from problem
   solving, and that gradually removing steps ("completion problems") bridges to independent
   practice. *For Anvil:* the 13 worked problems should have "you write the next step" versions;
   DSA lessons should hand off to problems through a completion step, not a jump.

5. **Interleaving improves discrimination. [Evidence]** Rohrer and Taylor (2007) and Rohrer,
   Dedrick and Stershic (2015) show mixed practice hurts short-term performance but improves
   later test performance, especially for choosing which method applies. *For Anvil:* the key
   interview skill is pattern recognition, so review sessions should deliberately mix topics and
   ask "which technique" questions.

6. **Cognitive load is real and manageable. [Evidence]** Sweller (1988, 2011): extraneous
   load reduces learning; split attention and redundancy are the common culprits. Progressive
   disclosure and one-idea-at-a-time reduce it. *For Anvil:* layer lessons, keep the core short,
   keep the reader and the text in sync (already done).

7. **Metacognition is unreliable without feedback. [Evidence]** Koriat and Bjork (2005) on
   the illusion of competence from fluent rereading; Dunning (2011) on poor self-assessment.
   Confidence judgements paired with correctness improve calibration over time. *For Anvil:*
   collect a two-level confidence with each answer and show calibration only as a gentle
   per-topic signal, never as a score to chase.

8. **Feedback should be timely and explanatory. [Evidence]** Hattie and Timperley (2007);
   Bangert-Drowns et al. (1991): feedback that explains why an answer is right or wrong
   outperforms correct/incorrect alone. *For Anvil:* every check item needs an explanation and a
   link back to the exact lesson section.

9. **Self-explanation and teaching improve understanding. [Evidence]** Chi et al. (1989) on
   self-explanation; Fiorella and Mayer (2013) on learning by teaching. *For Anvil:* a
   teach-back step graded against the lesson's takeaways, spoken or typed.

10. **Desirable difficulties, in moderation. [Evidence]** Bjork and Bjork (2011). Difficulty
    that forces retrieval or generation helps; difficulty from confusion does not. *For Anvil:*
    keep hard locks and pass/fail gates out. Make retrieval the default path, not a wall.

What the evidence does *not* support: points, badges and streak pressure as learning tools
(Hanus and Fox 2015 found gamification reduced motivation and grades in a classroom study), and
"I understand" buttons as a completion signal.

---

## D. Content audit by category

Numbers are from the live database.

| Category | Lessons | Avg length | Viz | Mental model | Exercise | Code per lesson | Problem links |
|---|---|---|---|---|---|---|---|
| DSA | 81 | 9.2k | 16% | 84% | 84% | 4.7 | 55 |
| System design | 70 | 12.9k | 63% | 67% | 64% | 0 | 0 |
| OOD | 55 | 10.0k | 0% | 69% | 69% | 4.8 | 0 |
| AI/ML | 88 | 8.2k | 0% | 94% | 0% | 1.8 | 0 |
| Java | 15 | 0.5k | 0% | 0% | 0% | 0 | 7 |
| CS fundamentals | 16 | 0.5k | 0% | 0% | 0% | 0 | 0 |
| Behavioral | 17 | 0.6k | 0% | 0% | 0% | 0 | 0 |

**DSA.** The strongest category: mental models, exercises, code, tables and most of the problem
links. Gaps: only 16 percent have a visualizer even though the topics are the most visual in
the catalog (sorting, heaps, tries, DP tables have none). The mini exercise is prose; nothing
checks the answer. The hand-off to problems is a button, not a faded example.

**System design.** Longest lessons, best visual coverage, and a real simulator elsewhere in the
app that the lessons never use. Zero problem links because the "practice" for design is the
outline plus mock interview, which lives in the study path, not the lesson. The 22 design
problem lessons follow a good "clarify, estimate, design, deep dive" flow and are the natural
home for embedded "what if traffic doubles" simulator presets.

**OOD.** Solid structure and code, no visualizers at all, no link to any practice. Design
patterns and LLD problems are the best candidates for "spot the bug" and "which pattern"
retrieval items because the mistakes are crisp.

**AI/ML.** The most uniform category (94 percent mental models, 99 percent tables) and the most
predict prompts (41 percent), but zero exercises, zero visualizers, and no practice of any
kind. It reads like a very good textbook. It needs retrieval items more than any other category
because nothing else in the app exercises it.

**Java, CS fundamentals, Behavioral.** These are stubs of a few hundred characters. They should
either be written to the same standard as DSA or hidden from the path until they are, because
an empty lesson that can be "completed" is the purest form of the illusion of learning.
Behavioral is partly covered by the STAR story bank and behavioral mock, so its lessons could
be short by design, but Java and CS fundamentals are core interview material.

**Cross-cutting.** 204 lessons contain phrases like "predict before you look" with no
interaction. 4 lessons name a prerequisite. Common mistakes are prose in 341 lessons but are
never asked about later.

---

## E. Proposed features

### P0, essential

**1. Check items on every lesson ("Check yourself"). [Evidence]**
- *Problem:* nothing verifies understanding; review cards ask the learner to grade themselves on a summary.
- *Solution:* 3 to 5 authored items per lesson with an answer and an explanation. Item kinds: recall (short answer, self-graded against a model answer), choose-the-structure or choose-the-pattern (single choice), predict-the-output (single choice), spot-the-mistake (single choice from the lesson's Common mistakes), trade-off (choice with rationale). Each item carries a `concept_key`, an optional `mistake_key`, and a link to the section it comes from. Each answer records a two-level confidence ("sure" or "not sure").
- *Where it appears:* at the end of the lesson before Mark complete; in the review queue as the card content instead of "recall the takeaways"; on Today as short retrieval tasks.
- *Learning benefit:* turns 342 read-only lessons into retrieval practice, gives the scheduler a correctness signal, and collects calibration data.
- *UX:* one item at a time, calm, no timer, no pass/fail gate. Mark complete stays available; the lesson shows "checked 3 of 4" as a small win rather than a lock.
- *Engineering:* medium. New table, a directive or JSON field on the lesson, one renderer component, review card changes. Content is the real cost: about 1,400 items. Author the study path's lessons first (roughly 40), then DSA, then the rest. AI can draft items from each lesson's Common mistakes and takeaways, but a human must approve every item that ships.
- *Build now.* This is the foundation for P0-2, P1-1, P1-5 and P1-6.

**2. Per-card scheduling with FSRS instead of fixed boxes. [Evidence, Eng]**
- *Problem:* five fixed intervals, no difficulty, "shaky" changes nothing.
- *Solution:* adopt the open-source FSRS algorithm through the `fsrs` Python package (py-fsrs, MIT). Add `stability`, `difficulty`, `state`, `lapses` and `last_review` to `review_cards`. Map the existing ratings: forgot = Again, shaky = Hard, good = Good. Keep box display as a derived "level" so the UI does not change.
- *Learning benefit:* the same daily review budget covers more material with better retention; hard cards return sooner, easy ones later.
- *UX:* none visible. Keep the three buttons and the daily cap.
- *Engineering:* small. One migration, one scheduler function, readiness's `retrievability()` can use FSRS's own retrievability formula instead of the hand-rolled one.
- *Build now.*

**3. Predict-before-reveal block. [Evidence]**
- *Problem:* 204 lessons ask the learner to predict, then show the answer in the next paragraph.
- *Solution:* a `:::predict` directive in lesson markdown with a question, 2 to 4 options or a free-text box, and the reveal text. The learner must commit before the reveal opens. Answers are stored as evidence like check items, because they are retrieval.
- *Learning benefit:* pretesting and generation effects on the exact points authors already flagged as important.
- *Engineering:* small for the block; content work to convert the existing 204 prose prompts, starting with the study path lessons.
- *Build now*, alongside P0-1, since it is the same authoring model.

**4. Prerequisite and related-concept links. [Hypothesis, backed by schema-formation evidence]**
- *Problem:* lessons are islands; 4 of 342 name a prerequisite.
- *Solution:* two lists per lesson, `prerequisites` and `related`, each a lesson slug and a one-line reason ("HashMap internals builds on this key-choice idea"). Show "Before this" at the top of the study rail and "Builds on what you learned" at the end. Cross-category links are the point: hashing to consistent hashing to caching; two pointers to sliding window; ACID to isolation levels to distributed transactions.
- *Learning benefit:* schema formation, cheaper re-encounters, and a light knowledge graph without a graph UI.
- *Engineering:* small. Seed metadata plus a validation test that every slug exists. The existing roadmap prerequisites cover coding topics; reuse those for DSA.
- *Build now.*

**5. Fill or hide the 48 stub lessons. [Content]**
- *Problem:* Java, CS fundamentals and Behavioral lessons are placeholders that can be completed.
- *Solution:* write Java and CS fundamentals to the DSA standard (they are core interview material); shorten the Behavioral lessons deliberately and point them at the STAR bank and behavioral mock. Until written, mark them "coming soon" and exclude them from the path and from completion counts.
- *Build now*, at least the hide step.

### P1, high value

**6. Mistake taxonomy and weak-spot detection. [Hypothesis]**
- Tag the Common mistakes in each lesson with a `mistake_key` (for example `binary-search.off-by-one`, `java.equals-vs-==`). Check items and predict blocks reference the same keys. When a learner misses items with the same key twice, Today shows a "weak spot" task: the simplest explanation, one more example, one retrieval item, re-test later. This is the adaptive loop the brief describes, built on data P0-1 produces, without a full learner model.
- Data: `check_attempts` (user, item, correct, confidence, at) plus a small derived `concept_mastery` view. No new framework.

**7. Teach-back graded by AI, spoken or typed. [Evidence for self-explanation; Hypothesis for AI grading]**
- After the checks, "Explain this lesson in your own words". The tutor grades against the takeaways as a rubric: covered, missing, misconceptions, and one follow-up question. The tutor must not explain first. Spoken input uses the browser's Web Speech API (no cost, no server), typed input as the fallback. The result is stored as retrieval evidence.
- The existing tutor already has quiz and interview intents; this is a fourth intent with a fixed rubric prompt.

**8. Layered lessons. [Evidence for cognitive load; UX]**
- Core layer open by default: Why it matters, Mental model, How it works, Example. Deep layer collapsed with a "Go deeper" control: Trade-offs, Common failure modes, Interviewer follow-ups, Evolution under pressure. The reader reads the open layers. Remembered per user.
- This alone cuts the visible lesson roughly in half without deleting anything.

**9. Fading worked examples for DSA. [Evidence]**
- Extend the 13 worked problems with a "complete the next step" variant: the lesson shows the approach and the first half of the solution; the learner writes the next step in the existing sandbox with the hidden tests. Then the full problem. This is the bridge from lesson to practice that the current "Practice problems" button skips.

**10. Learning metrics that mean something. [Hypothesis]**
- From check attempts and reviews: recall accuracy per topic, delayed recall at 7, 14 and 30 days for items answered correctly once, and confidence calibration (share of "sure and wrong"). Show them on the dashboard as three quiet numbers with a sentence each. Keep readiness, but let observed recall replace the modelled retention once enough data exists.

**11. Deliberate interleaving in review. [Evidence]**
- When building a review session, alternate topics and include "which technique fits" items across DSA patterns. Cheap change to the existing `_review_mix`.

### P2, advanced

**12. Simulator presets inside system design lessons.** Embed the existing simulator with a preset design and one slider per lesson ("raise traffic to 50k RPS, watch the database saturate"). The engine and components already exist; this is a directive and a preset file per lesson.
**13. AI-drafted items for weak spots.** Generate extra retrieval items for a concept the learner keeps missing, from the lesson text, with human-reviewed templates. Only after P0-1 has shown which item kinds work.
**14. Concept map view.** A small graph of prerequisite and related links using the xyflow library already in the app. Useful once P0-4 data exists; not before.
**15. Visualizers for OOD and AI/ML.** Object graphs for patterns, attention and gradient descent for AI/ML. Same `:::viz` mechanism.

---

## F. Frameworks and libraries

**Add**

| Need | Recommendation | Why |
|---|---|---|
| Spaced repetition scheduling | `fsrs` (py-fsrs) on the backend | Fitted, open-source, actively maintained, tiny; replaces the hand-rolled Leitner intervals and retrievability formula |
| Spoken teach-back | Browser Web Speech API | No server, no cost; typed fallback where unsupported |

**Do not add**

- No LMS, quiz engine, or xAPI/SCORM layer. The item model above is four tables and fits the existing FastAPI and seed pattern.
- No CMS. Keep lessons as markdown with directives (`:::viz`, `:::predict`, `:::check`) validated in seed tests, like `validate_catalog()` does for problems.
- No Redis, no queue. Nothing here needs it.
- No new frontend framework. React, TanStack Query, xyflow and Monaco cover every UI above.
- No gamification library.

**Author tooling worth building [Eng]**

- A lesson lint script that scores each lesson on measurable dimensions: length, has mental model, has predict block, has check items, has prerequisites, links to a problem, has a visualizer, code-to-prose ratio. Run it in CI like the catalog validator so quality cannot regress and so the lesson-by-lesson audit the brief asks for becomes a report that is always current instead of a one-off document.

---

## G. Data model changes

```
lesson_checks        id, lesson_id, order, kind, prompt, options(json), answer, explanation,
                     section_id, concept_key, mistake_key
lesson_links         lesson_id, related_lesson_id, relation ('prerequisite'|'related'), reason
check_attempts       id, user_id, check_id, correct, confidence ('sure'|'unsure'),
                     answered_at, source ('lesson'|'review'|'today')
review_cards         + stability, difficulty, state, lapses, last_review   (FSRS)
                     kind gains 'check' so items are cards in their own right
```

`concept_mastery` is a query over `check_attempts` and `review_cards`, not a table, until it
needs to be one.

---

## H. The learning loop as it would work in the product

1. **Learn.** Open the lesson. Core layer visible, deep layer folded. Read or listen; the reader
   follows the text. Predict blocks interrupt at the points the author chose.
2. **Retrieve.** "Check yourself": 3 to 5 items, one at a time, confidence with each. Wrong
   answers show the explanation and the section link. Mark complete is available throughout;
   the study rail shows "checked 4 of 5".
3. **Practice.** DSA: faded worked example, then the linked problems in the sandbox. System
   design: outline, then mock. OOD and AI/ML: check items and follow-up questions, since there
   is no sandbox for them.
4. **Feedback.** Every item explains; the tutor's teach-back grades against the takeaways.
5. **Apply.** Mock interviews and the simulator, already in the app, now linked from the
   lesson's Practice card.
6. **Review.** FSRS schedules the items and the lesson card. Sessions interleave topics.
   Missed items with a shared mistake key become a weak-spot task on Today.
7. **Re-test.** Delayed recall at 7, 14 and 30 days is measured from the same items. Readiness
   uses observed recall once there is enough of it.

Nothing locks. The path only changes what Today suggests.

---

## I. Example: "Hashing and Frequency Maps" redesigned

Core layer (visible): Why it matters (2 paragraphs). Mental model with the existing flow and
table. How it works with the three shapes and their code. Example.

Predict block after the table: "Group anagrams. Which key?" with three options; reveal
explains why the sorted string or 26-count works and why the raw string does not.

Check yourself (5 items): choose the key for "subarray sums to k"; predict the output of a
`merge` count loop; spot the mistake in a two-sum that inserts before it checks; which of four
problems needs a map in both directions; short answer "why is lookup not always O(1)".
Each carries a mistake key such as `hashing.insert-before-check`.

Practice: complete-the-step version of Two Sum (the lookup is written, write the insert), then
Pair Target and Anagram Bundles in the sandbox.

Deep layer (folded): Trade-offs, Common mistakes in full, Interviewer follow-ups, Interview tip.

Links: prerequisite Arrays in interviews; related HashMap internals, Choosing a hash key,
Consistent hashing (system design), Cache aside (system design).

Teach-back: "Explain when a hash map turns an O(n²) search into O(n), and name the key for one
example." Graded against the four takeaways.

---

## J. Roadmap

**Phase 1, highest learning impact (about 4 to 6 weeks of work)**
- Check items and predict blocks: data model, directives, renderer, review card integration.
- FSRS scheduling.
- Prerequisite and related links.
- Hide the 48 stub lessons from the path; write Java and CS fundamentals.
- Author items for the study path lessons first, then DSA.
- Lesson lint in CI.

**Phase 2**
- Mistake taxonomy and weak-spot tasks on Today.
- Layered lessons.
- Teach-back with AI grading, typed first, spoken second.
- Fading worked examples for the 13 worked problems.
- Learning metrics on the dashboard; readiness from observed recall.
- Deliberate interleaving in review sessions.

**Phase 3**
- Simulator presets inside system design lessons.
- AI-drafted items for weak concepts, human reviewed.
- Concept map view.
- Visualizers for OOD and AI/ML.

---

## K. The ten changes with the most impact

1. **Check items on every lesson.** Converts reading into retrieval; everything else measures or schedules what this produces.
2. **FSRS scheduling.** Same review effort, better retention, and a correct retrievability number for readiness.
3. **Predict blocks.** The cheapest generation-effect win; the prompts are already written.
4. **Fill or hide the 48 stubs.** Removes the most misleading completion signal in the product.
5. **Prerequisite and related links.** Turns pages into a network at almost no engineering cost.
6. **Layered lessons.** Halves the visible load for every learner without deleting content.
7. **Mistake keys and weak-spot tasks.** The first real adaptive behaviour, built from data the checks already produce.
8. **Teach-back.** The strongest guard against the illusion of competence, and it fits the tutor that already exists.
9. **Fading worked examples.** Closes the gap between "I followed the solution" and "I can write it".
10. **Observed-recall metrics.** Replaces "lesson completed" with numbers that reflect learning, shown quietly.

---

## L. Things the brief asks for that I recommend against

- **A full lesson-by-lesson audit as a document.** With 342 lessons it would be stale within a
  month. The lint script in section F gives the same information continuously.
- **Eight-level mastery ladders per concept.** Too much machinery for the signal available.
  Three states derived from items (not yet checked, shaky, solid) carry the same decisions.
- **Confidence on a four-point scale.** Two levels are enough for calibration and cost one tap.
- **A learner knowledge model as a first-class system.** Start with item attempts and mistake
  keys; promote to a model only if Phase 2 shows the derived view is not enough.
- **AI everywhere.** Keep AI to three jobs: grading teach-back, drafting items for human
  review, and the existing tutor. The learner should do the retrieving.
