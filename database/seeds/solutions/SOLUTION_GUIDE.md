# Writing a problem's Solution

This content fills the **Solution** tab on a problem page. It is the written reference a learner
returns to after trying the problem. The learner has a brain injury: write short, plain and calm.

**The example to copy:** the `lc-3` entry in `sliding_window.py`. It has been reviewed and approved.
Match its tone, length and level of detail. When unsure, do what it does.

## Where things go

- One Python file per topic in this folder, exporting `SOLUTIONS: list[dict]`. Files are picked up
  automatically; never edit `__init__.py`. Files starting with `_` are not content.
- One dict per problem. `slugs` lists every catalog slug the problem has (some problems appear
  twice; `_stories.json` shows the pairs). A slug may appear in only one dict in the whole folder.

## The fields (all required)

| Field | What to write |
|---|---|
| `slugs` | `["lc-11", "widest-water-basin"]` |
| `pattern` | The pattern's usual name: "Two pointers", "Sliding window", "Tree BFS". |
| `trigger` | How to recognise the problem: the words in the statement that give it away. One sentence. |
| `summary` | The idea in 1–3 sentences, 40–280 characters. What you would want to remember in a year. |
| `approaches` | 2 or 3, ordered from the obvious way to the best. See below. |
| `walkthrough` | The best approach on ONE small example, as a table. See below. |
| `mistakes` | 2–4 items: `name`, `wrong` (what people do), `right` (what to do instead). |
| `edge_cases` | 3–6 items: `input`, `expected`, `why` it is worth testing. Use the problem's input style. |
| `interview_script` | 4–6 lines, spoken in the first person: restate → obvious way + cost → key point → better way + cost → what I would test. |
| `follow_ups` | 2–4 real interviewer follow-ups, each with a short `answer`. |
| `related_slugs` | 2–4 slugs of problems that use the same idea. They must exist in the catalog. |

### An approach

`name`, `idea` (one sentence), `steps` (3–6 plain steps, each under 170 characters), `code`,
`time_complexity` + `time_why`, `space_complexity` + `space_why`, `when_to_use` (what to do with it
in an interview), `is_optimal`.

- Exactly one approach has `is_optimal: True`, and it is the **last** one.
- The first approach is the way most people think of first, even if slow. Say its cost honestly.
- Add a third approach only if it is a genuinely different idea people really use.
- `code` is a **complete Java file**: `import java.util.*;` if needed, then `class Solution` with the
  problem's exact method (see the problem's `function_signature` and `starter_code`), plus any
  helper class the signature needs. It must pass the judge — see "Checking" below.
- The problem's `reference_solution` in the database is a correct best approach. You may use it,
  but tidy it so the variable names match the words in your `steps`.
- `time_why` / `space_why` point at something concrete: "each letter enters the window once",
  not "linear scan".

### The walkthrough

`input` (the example), `columns` (3–7 short headers), `rows` (3–9 rows, every cell a **string**),
`result` (one sentence ending with the answer). Choose the smallest example that shows the key
moment — ideally the one that triggers the first mistake in `mistakes`.

## Problems that have a Visual Story

`_stories.json` lists them with the story's pattern, insight, metaphor, trap and costs. For these:

- `mistakes[0]["name"]` must be exactly the story's `trap` name, and its `right` must agree with `trap_rule`.
- The best approach's `time_complexity` must equal the story's `time`.
- `summary` should say the same idea as the story's `insight`. You may use plain window/pointer
  words instead of the metaphor, but do not contradict it.
- `slugs` must include every slug the story lists.

## Writing rules

- At most 3 sentences and 260 characters per text field. No exclamation marks.
- Plain words. Banned: invariant, amortized, sentinel, trivial(ly), simply, naive, straightforward, WLOG.
  Standard interview terms (BFS, DFS, heap, hash map) are fine — the learner needs them — but say
  what they do the first time ("a queue, so nodes leave in the order they arrived").
- Code and identifiers go in `backticks`. Text in backticks is exempt from the word rules.
- No filler ("Let's dive in", "It's important to note"). No praise. No emoji.
- Be truthful about costs: recursion depth counts as space; sorting costs O(n log n).
- Never invent a catalog slug. Check it exists before listing it in `related_slugs`.

## Checking (run both; both must be clean)

```bash
cd backend
.venv/bin/python -m pytest tests/test_solution_content.py -q          # shape + wording, no database needed
.venv/bin/python scripts/check_solutions.py --file <your_file>        # runs every Java approach on the real judge
```

The checker uses the problem's own test cases from the database (`backend/.env`), locally with
`javac`/`java`. The best approach must pass every test. A slower approach must never give a wrong
answer; running out of time on the big tests is allowed and reported.

**Never** edit the tests, the checker, this guide, `__init__.py`, `_stories.json`, or another
topic's file. If a rule seems wrong for a problem, leave that problem out and say why in your report.

## Loading into the app (the owner does this, not you)

```bash
cd backend && .venv/bin/python -m app.problems.seed_solutions
```
