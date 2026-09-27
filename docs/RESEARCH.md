Since you want Claude to research the entire learning system first and recommend improvements before touching code, I’d make the prompt very explicit about learning science, practical interview preparation, and avoiding superficial content expansion.

You are working on the Learn platform for AnvilPrep, an educational platform designed to help software engineers genuinely learn and retain knowledge and ultimately perform better in technical interviews.

IMPORTANT: DO NOT CODE YET

Before making any code changes, perform a deep research and product/UX audit of the entire Learn experience and all lessons.

The goal is NOT simply to make lessons longer.

The goal is to redesign the learning experience around how humans actually learn, understand, retrieve, practice, and retain technical knowledge, while keeping the content highly practical for software engineering interviews and real-world engineering work.

⸻

1. Audit the ENTIRE Learn System

Go through the complete Learn section, including:

* All categories
* All courses
* All modules
* All lessons
* Lesson structure
* Navigation
* Progress tracking
* Exercises
* Quizzes
* Examples
* Visualizations
* Code examples
* Practice sections
* Review mechanisms
* Completion states
* Related lessons
* Search/discovery
* Learning journey
* Any existing personalization
* Any AI-assisted learning features

Do not assume that existing content is sufficient.

Identify:

* Missing concepts
* Concepts that are too shallow
* Concepts that are too abstract
* Concepts that are unnecessarily verbose
* Concepts that need examples
* Concepts that need visualizations
* Concepts that need interactive exercises
* Concepts that need coding practice
* Concepts that need interview questions
* Concepts that need spaced review
* Concepts that need comparison tables
* Concepts that need mental models
* Concepts that need real-world scenarios
* Concepts that need common mistakes/pitfalls
* Concepts that should be split into multiple lessons
* Concepts that should be merged
* Concepts that are prerequisites for other concepts but are currently disconnected

⸻

2. Research How Humans Learn Technical Concepts

Before proposing changes, research current evidence and established principles around:

* Retrieval practice
* Spaced repetition
* The testing effect
* Active recall
* Interleaving
* Elaborative encoding
* Dual coding
* Cognitive load theory
* Chunking
* Schema formation
* Worked examples
* Fading worked examples
* Generation effect
* Desirable difficulties
* Feedback timing
* Metacognition
* Transfer of learning
* Context-dependent learning
* Concept mapping
* Progressive disclosure
* Error-based learning
* Deliberate practice
* Mastery learning

Use credible sources such as peer-reviewed research, books/research from recognized cognitive science and learning-science researchers, university resources, and established educational research.

Do NOT blindly implement every learning theory.

For each principle, determine:

1. What the evidence actually supports
2. How relevant it is to technical/software-engineering education
3. How it could practically be applied inside AnvilPrep
4. Whether it would improve learning enough to justify additional UI/engineering complexity

⸻

3. Think About the Human Learning Journey

Evaluate whether each lesson helps a learner progress through something like:

Encounter → Understand → Connect → Practice → Retrieve → Apply → Make Mistakes → Receive Feedback → Revisit → Transfer

A lesson should ideally answer:

Before learning

* Why should I care?
* Where is this used?
* What prerequisite knowledge do I need?
* What should I already know?

During learning

* What is the mental model?
* Can I visualize it?
* Can I see a concrete example?
* Can I connect it to something I already know?
* Can I interact with it?
* Can I predict what happens before seeing the answer?

After learning

* Can I explain it in my own words?
* Can I solve a problem using it?
* Can I recognize when to use it?
* Can I distinguish it from similar concepts?
* Can I answer an interview question about it?
* Can I apply it in a realistic engineering situation?

Later

* Will the system bring this concept back at the right time?
* Will I have to retrieve it rather than simply reread it?
* Can the system identify that I misunderstood it?

⸻

4. Evaluate Every Lesson Against a Standard

Create a proposed Lesson Quality Framework.

For every lesson, evaluate dimensions such as:

* Concept clarity
* Mental-model quality
* Prerequisite clarity
* Real-world relevance
* Example quality
* Visual explanation
* Interactive potential
* Practice quality
* Retrieval opportunities
* Feedback quality
* Interview relevance
* Real-world engineering relevance
* Common misconceptions
* Difficulty progression
* Cognitive load
* Retention potential
* Transfer/application potential

Do NOT simply assign arbitrary scores.

Explain what is missing and why.

⸻

5. Make Learning PRACTICAL

AnvilPrep should not become another documentation website.

For appropriate concepts, consider adding:

Mental Models

Example:

Instead of simply explaining:

“A hash table provides O(1) average lookup.”

Help the learner understand:

* What problem does it solve?
* What is actually happening internally?
* Why does hashing help?
* What happens during collisions?
* Why isn’t it truly O(1) in every case?
* When should an engineer choose it?
* When should they NOT choose it?

⸻

Worked Examples

Start with a problem and progressively demonstrate:

Problem → Thought Process → Approach → Implementation → Result → Why it works → Common mistakes

⸻

Predict-Before-Reveal

Before showing an answer:

“What do you think happens when this request reaches the load balancer?”

Let the learner commit to an answer.

Then reveal the explanation.

Use this wherever it genuinely improves learning.

⸻

Active Recall

After teaching a concept, ask the learner to retrieve it.

Examples:

* Explain it without looking
* Fill in missing steps
* Predict output
* Identify the correct architecture
* Choose the appropriate data structure
* Explain why an approach fails

⸻

Scenario-Based Learning

Instead of:

“What is caching?”

Use:

“Your API receives 50,000 requests per second. 80% of requests ask for the same product metadata. The database is becoming the bottleneck. What would you change?”

Then progressively introduce constraints.

⸻

Error-Based Learning

Intentionally expose realistic incorrect approaches.

Example:

“This implementation looks correct. What is wrong with it?”

Then explain the failure.

This should be used extensively for:

* DSA
* System Design
* Databases
* Networking
* Distributed Systems
* Operating Systems
* Java
* Backend Engineering
* Cloud
* AI/ML

⸻

6. Build Progressive Difficulty

Investigate whether lessons should follow a progression such as:

Recognition → Understanding → Recall → Guided Practice → Independent Practice → Application → Interview Simulation

For example:

Level 1

Understand the concept.

Level 2

Recognize it.

Level 3

Recall it without assistance.

Level 4

Apply it to a simple problem.

Level 5

Apply it to an unfamiliar problem.

Level 6

Explain the tradeoffs.

Level 7

Use it in an interview-style problem.

Level 8

Use it in a realistic engineering scenario.

Determine which concepts need this progression and which do not.

⸻

7. Connect the Knowledge Graph

Look for opportunities to connect concepts.

For example:

Hash Tables

should connect to:

* Arrays
* Hashing
* Collision resolution
* Sets
* Caches
* Database indexes
* Consistent hashing
* Distributed systems
* Load balancing
* Redis

The learner should gradually build a network of knowledge, not isolated lessons.

Identify where AnvilPrep currently feels like a collection of pages instead of a connected knowledge system.

Propose improvements such as:

* Related concepts
* Prerequisites
* Next concepts
* “You already learned this” references
* Concept maps
* Cross-course connections
* Review queues
* Dependency graphs

⸻

8. Add Spaced Review

Investigate how AnvilPrep can automatically bring concepts back after the learner has completed them.

For example:

Day 0
Learn

Day 1
Quick retrieval

Day 3
Application question

Day 7
Mixed practice

Day 14
Interview question

Day 30
Real-world scenario

Do not assume these exact intervals are optimal.

Research appropriate approaches and propose a practical implementation.

The system should prioritize retrieval over rereading.

⸻

9. Adaptive Learning

Investigate whether AnvilPrep should adapt based on learner behavior.

For example:

If a learner repeatedly gets:

* Hash collision questions wrong
* Binary search boundary conditions wrong
* CAP theorem tradeoffs wrong

the platform should recognize the weakness and:

1. Identify the underlying concept
2. Recommend targeted review
3. Give a simpler explanation
4. Provide another example
5. Give retrieval questions
6. Re-test later
7. Increase difficulty after mastery

Think about a Learner Knowledge Model.

Determine what data should be tracked, such as:

* Attempts
* Accuracy
* Time
* Confidence
* Hints used
* Mistake categories
* Repeated errors
* Review history
* Last successful retrieval
* Difficulty
* Mastery estimate

⸻

10. Confidence vs Knowledge

Investigate adding confidence-based questions.

Example:

“What is the time complexity?”

Answer:

O(log n)

Confidence:

* Very unsure
* Somewhat unsure
* Confident
* Very confident

This can help distinguish:

I don’t know this

from

I think I know this but I’m actually wrong.

Research whether this is educationally useful and how it should influence review scheduling.

⸻

11. Interview Transfer

Every major concept should eventually answer:

“How would this appear in an interview?”

But don’t turn every lesson into an interview-question dump.

For appropriate concepts include:

Concept Question

“What is a hash table?”

Understanding Question

“Why is lookup usually O(1)?”

Tradeoff Question

“When would you not use a hash table?”

Implementation Question

“Implement a hash map.”

Debugging Question

“What’s wrong with this implementation?”

System Design Question

“How would you use hashing in a distributed cache?”

Behavioral/Communication Angle

“Explain this concept to an interviewer.”

Determine where these layers are appropriate.

⸻

12. System Design Should Be Especially Practical

For System Design lessons, investigate whether learners should be able to manipulate systems rather than just read about them.

Potential interactive elements:

* Traffic sliders
* User count
* Requests per second
* Database capacity
* Cache hit rate
* Replication factor
* Latency
* Storage
* Bandwidth
* Failure rates
* Region count
* Availability requirements

Then allow learners to see how architectural decisions affect:

* Latency
* Throughput
* Cost
* Availability
* Consistency
* Scalability
* Failure recovery

Investigate whether this can become a System Design Simulator / Sandbox.

⸻

13. DSA Should Also Be Interactive

Investigate features such as:

* Visual array manipulation
* Pointer movement
* Stack/queue visualization
* Tree traversal animation
* Graph traversal
* Heap operations
* Hash table collisions
* Sorting visualization
* Binary search visualization
* Recursion stack visualization

But avoid animations that are merely decorative.

Every visualization should answer:

“What mental model does this help the learner build?”

⸻

14. Explain WHY, Not Just WHAT

Audit the content for statements like:

“Use Redis for caching.”

The learner should instead understand:

Why caching exists → what bottleneck it solves → why Redis fits → what tradeoffs it introduces → when it fails → when not to use it.

Apply this principle across the curriculum.

⸻

15. Common Mistakes Database

Investigate creating a structured system for misconceptions.

Examples:

Binary Search

Common mistake:
Using incorrect boundary conditions.

Distributed Systems

Common mistake:
Assuming replication automatically provides consistency.

SQL

Common mistake:
Using WHERE instead of HAVING.

System Design

Common mistake:
Choosing technologies before understanding requirements.

Java

Common mistake:
Confusing == and .equals().

A learner should be able to encounter:

“Common mistake”

before making the mistake themselves.

⸻

16. Micro-Learning Without Oversimplifying

Investigate whether large lessons should be broken into smaller cognitive units.

However:

DO NOT create hundreds of tiny pages just because “microlearning” sounds good.

Determine the appropriate lesson size based on:

* Concept complexity
* Cognitive load
* Prerequisites
* Practice requirements
* Natural conceptual boundaries

A lesson should feel complete enough to build a useful mental model.

⸻

17. Improve Lesson Structure

Propose a reusable lesson architecture.

For example:

1. Why this matters
2. Prerequisites
3. Learning objectives
4. Mental model
5. Core explanation
6. Visual explanation
7. Worked example
8. Predict-before-reveal
9. Common mistakes
10. Guided practice
11. Independent practice
12. Retrieval questions
13. Real-world scenario
14. Interview application
15. Summary
16. Teach-back
17. Spaced review

Do NOT assume this exact structure is correct.

Research and determine the best structure for different lesson types.

Different lesson types may require different structures.

⸻

18. Avoid Cognitive Overload

Audit whether the current UI/content introduces too much information simultaneously.

Consider:

* Progressive disclosure
* Collapsible explanations
* Layered complexity
* Visual hierarchy
* One concept at a time
* Optional deep dives
* “Explain more” interactions
* Beginner vs advanced paths

The goal is:

Simple entry point → increasing depth

not:

huge wall of information

⸻

19. Measure Learning, Not Page Completion

Investigate better learning metrics than:

“Lesson completed.”

Potential metrics:

* Retrieval accuracy
* Delayed recall
* Application accuracy
* Error reduction
* Time to solve
* Confidence calibration
* Transfer to unfamiliar problems
* Retention after 7/14/30 days
* Interview performance

Determine which metrics are realistically measurable without making the product annoying.

⸻

20. AI-Powered Learning

Investigate meaningful uses of AI.

Avoid gimmicks.

Potential uses:

Socratic Tutor

Instead of immediately giving the answer, ask guiding questions.

Personalized Explanation

Explain the same concept using:

* Simple explanation
* Technical explanation
* Analogy
* Code
* Visual explanation

Teach-Back

Ask the learner to explain the concept.

AI evaluates:

* Correctness
* Missing concepts
* Misconceptions
* Clarity

Adaptive Practice

Generate additional questions targeting a learner’s weaknesses.

Interviewer Mode

AI behaves like a technical interviewer.

Debugging Coach

AI gives progressively stronger hints.

System Design Interviewer

AI introduces requirements dynamically.

Research where AI actually improves learning and where it could create illusion of competence by doing too much for the learner.

⸻

21. Research “Illusion of Learning”

This is extremely important.

Investigate whether features such as:

* Reading explanations
* Watching animations
* AI-generated explanations
* Seeing solutions
* Clicking “I understand”
* Completing pages

can create a false sense of mastery.

Design the system so that learners must retrieve and apply knowledge, not merely recognize it.

⸻

22. Make the Platform Feel Like a Learning System

The end goal should be more than:

Course → Lesson → Next Lesson

Consider whether the experience should become:

Learn → Practice → Retrieve → Apply → Review → Master → Transfer

The platform should know:

What the learner has seen.

What the learner can recall.

What the learner can apply.

What the learner repeatedly gets wrong.

What the learner is ready to learn next.

⸻

23. Research Comparable Learning Platforms

Study educational approaches used by platforms such as:

* Brilliant
* Khan Academy
* Duolingo
* DataCamp
* Educative
* LeetCode
* NeetCode
* Coursera
* MIT OpenCourseWare
* Anki
* Codecademy

Also examine successful technical interview preparation products.

Do NOT copy their UI blindly.

Identify:

* What learning mechanisms they use
* What appears effective
* What could translate to AnvilPrep
* What would not fit AnvilPrep

⸻

24. Research Interview Preparation Specifically

Investigate what actually makes technical interview preparation effective.

Consider:

* Retrieval
* Problem classification
* Pattern recognition
* Deliberate practice
* Timed practice
* Verbal explanation
* Tradeoff reasoning
* Debugging
* Coding from scratch
* Unfamiliar problems
* System design under constraints
* Mock interviews
* Error analysis

Determine how Learn should connect with the existing:

Coding Practice

System Design

AI/ML Interview Prep

Mock Interviews

rather than treating them as separate products.

⸻

25. Produce a Comprehensive Audit Before Coding

Your output should contain:

A. Executive Summary

What is currently working?

What is missing?

What are the largest learning problems?

⸻

B. Learning Science Findings

Summarize the most relevant evidence and how it should affect AnvilPrep.

Include sources.

⸻

C. Current Learn Architecture Audit

Identify structural problems across the Learn system.

⸻

D. Lesson-by-Lesson Audit

For EVERY lesson/category, identify:

* What is good
* What is missing
* What should be expanded
* What should be simplified
* What should become interactive
* What needs practice
* What needs retrieval
* What needs examples
* What needs real-world scenarios
* What needs interview application
* What should connect to another lesson

Do not merely say:

“This lesson could be improved.”

Be specific.

⸻

E. Proposed Lesson Templates

Create different templates for:

* DSA
* System Design
* Programming Languages
* Databases
* Networking
* Operating Systems
* Distributed Systems
* Cloud
* AI/ML
* Behavioral/Interview Concepts

⸻

F. Proposed Features

Prioritize proposed features into:

P0 — Essential

Major learning improvements.

P1 — High Value

Strong learning improvements.

P2 — Advanced

Potentially valuable future improvements.

For every feature explain:

* Problem
* Proposed solution
* Learning benefit
* UX impact
* Engineering complexity
* Data requirements
* Whether it should be built now or later

⸻

G. Learning Architecture

Propose how the platform should model:

Concept → Lesson → Practice → Skill → Mastery → Review

Include potential database/data-model changes if required.

⸻

H. Adaptive Learning Model

Propose how AnvilPrep could determine:

* What the learner knows
* What they forgot
* What they struggle with
* What they should review
* What they should learn next

⸻

I. Learning Loop

Design the ideal recurring loop:

Learn → Retrieve → Practice → Feedback → Apply → Review → Re-test

Explain exactly how this could work in the product.

⸻

J. Example Redesigned Lessons

Choose several representative existing lessons and show what a dramatically improved version would look like.

Choose examples from different areas, such as:

* One DSA lesson
* One System Design lesson
* One database lesson
* One programming lesson
* One networking/distributed systems lesson
* One AI/ML lesson

⸻

26. VERY IMPORTANT: Separate Evidence From Ideas

For every major recommendation distinguish:

Evidence-backed learning principle

from

Product hypothesis

from

UX preference

from

Engineering recommendation

Do not present speculation as scientific fact.

⸻

27. Do Not Overengineer

AnvilPrep is an actual product.

Every proposed feature must pass:

Does this materially improve learning?

If not, don’t recommend building it.

Avoid:

* Gamification for its own sake
* Excessive animations
* Artificial badges
* Point systems that don’t improve learning
* AI chat everywhere
* Unnecessary notifications
* Complex dashboards with little educational value

The goal is effective learning, not feature count.

⸻

28. Final Recommendation

At the end, provide a proposed roadmap:

Phase 1 — Highest learning impact

What should change first?

Phase 2

What should come next?

Phase 3

What advanced capabilities should eventually be built?

Also identify:

The 10 highest-impact changes you would make to AnvilPrep if you were responsible for making it one of the strongest technical-learning platforms available.

Do not rank them with arbitrary numerical scores. Explain their expected impact and rationale.

⸻

29. FINAL RULE

DO NOT MODIFY THE CODE AFTER THIS AUDIT.

Do not start implementing anything.

First produce the complete research, audit, recommendations, feature proposals, lesson architecture, and prioritized roadmap.

After presenting the findings, wait for approval.

Only after approval should implementation begin.

The standard should be:

AnvilPrep should not merely teach developers what something is. It should help them understand it, remember it, recognize when to use it, apply it under pressure, explain it clearly, and transfer that knowledge to unfamiliar problems.