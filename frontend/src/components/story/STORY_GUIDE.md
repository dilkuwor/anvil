# Writing a Visual Story

A Visual Story teaches **one problem** so that it is understood and still remembered months later.
The reader has a brain injury: every choice below serves low load, recall, and calm.

**Reference implementation — read it before writing anything:**
`stories/longest-unique-substring.ts` + `string-window-view.tsx`. Match its quality.
`story.test.ts` enforces most of these rules. Fix the story, never the test.

## The five scenes (always these, always in this order)

1. **picture** — the problem drawn on the chosen example. What is asked, one allowed thing, one not-allowed thing, the goal. No algorithm yet.
2. **slow** — the obvious way, **really run on the input** with a real counter (count actual work in a loop; never a formula like `n*n`). End by naming its cost. It must be a slower way to the *same* answer, not a wrong method.
3. **insight** — the one idea, in 2–4 frames, computed from the input (find the first interesting moment with the solver; no magic indices). Introduce the metaphor here.
4. **solution** — the real algorithm, **one frame per change**, each frame highlighting the Java line that does it. After the answer: a `Time: …` frame and a `Space: …` frame, each pointing at something visible (a counter, a highlighted structure).
5. **card** — a practice run on `practiceInput` (fresh, and it must hit the trap) where the reader makes every real decision, then one final quiet frame: "the picture to remember" (no quiz). Practice frames have no `codeLine`.

## Frames are computed, never typed

- `frames(input)` is pure and runs the real algorithm on the parsed input. Every example in `examples`, plus `practiceInput`, must work.
- `answer(input)` comes from an independent real solver (not a lookup, not a flag from the input).
- State copied into a frame must be the state **at that moment**. Copy arrays (`[...x]`) *before or after* a mutation deliberately; build captions from the same values the picture shows.
- Type the state. No `any`.

## Captions

- At most 3 short sentences, 170 characters. **One new idea per frame.** One `!` at most. No ALL CAPS.
- Plain words. No code in sentences (`nums[i]`, `===`, `Math.floor`, `.next`). No jargon (monotonic, in-degree, sentinel, base case, brute force, BFS/DFS, initialize, traverse…). If a term is unavoidable, say what it means in everyday words instead.
- **Speak in the metaphor.** Pick one physical picture, give its parts names (`metaphor.terms`), and use those names in most solution captions. `metaphor.legend` maps them to the code's variable names.
- Refer to things by what the reader sees. If nodes show values, say "the node 4", never "node 3" meaning index 3.
- Show "new best" as its own frame; never let a number change silently in a corner.

## Questions are predictions

- A quiz frame shows the moment **before** the move: its picture and caption must not show, highlight, label or name the answer. The **next frame is the reveal**.
- Ask the algorithm's real decision ("which side moves?", "where does the tail snap to?", "which one leaves?") — never "what is highlighted?" or arithmetic.
- Prefer `kind: "cell"` (click the picture). Every correct cell must be accepted: if several cells are right, ask a question with exactly one right answer instead.
- `feedback[wrongCell]` explains *why that one is wrong*. `otherwise` is a nudge. Neither may name the answer ("Click index 3" is forbidden).
- "Nothing / null" is never answered by clicking some unrelated cell. Draw a real target for it (e.g. a `null` box) or ask a different question.
- Set `numbered: true` only if the picture prints each cell's number.
- Solution scene: ask at the first occurrence of each kind of decision. Practice: ask at **every** decision, including the trap.

## The trap

- One named mistake per story (`traps[0]`). The name must appear in a caption, in a frame where the picture **shows** the mistake and its consequence (like the Ghost Trap's "✕ never backwards"). At least one example and the practice input must reach it.

## The card

- `trigger` is only the "when you see…" half. Never include the pattern or "→ think …": the card asks the reader to recall it.
- The first card frame introduces the practice run; it must not restate the insight.
- `template` is the reusable skeleton in a few pseudo-code lines, not a copy of `code`.
- `code` is **Java**, complete enough to be correct, and every highlighted line is a real statement (not a lone `}`).
- `siblings` and `slugs` must exist in `known-problems.ts`.
- `complexity.slow` is the slow way's **time**, comparable with `complexity.time`.

## Pictures (views)

- Use `view-kit.tsx`: `GLIDE` for all motion (never an inline `transition`), `<PickTarget>` for clicks (rendered last), `pickTone` and `<RejectedMark>` for ruled-out cells. Nothing flashes, pulses, shakes or bounces. No emoji as the only carrier of meaning.
- One colour language everywhere: accent = where we are, teal = good/done, coral = problem/trap, faded = no longer matters. The answer to an open question is never pre-coloured.
- Lay out from the data: sizes and positions scale so the **largest example fits inside the viewBox** with no clipped or overlapping text. Two labels that can land on the same spot need an offset rule.
- Draw what the insight depends on (a doubly linked list shows both directions; a re-stitched list shows the new link).
- Keep picture labels short; long explanations belong in the caption.

## Before you call it done

1. `npx vitest run src/components/story` — all green for your stories.
2. `npx tsc --noEmit` and `npx eslint src/components/story` — clean.
3. Print every caption of every example in order and read them as a story. Hand-check the first example's pointers and values against the real algorithm.
4. Length: aim for 25–55 frames per example. Summarise repetitive stretches in one frame.
