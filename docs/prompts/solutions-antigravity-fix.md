# Task: second pass on your 81 Solution entries (Antigravity)

Your first pass was reviewed. **The Java is good: all 162 approaches compile and pass every test on
the real judge. Do not break that.** The writing is the problem: it meets the minimum of every rule
and reads like notes for someone who already knows the algorithm. The reader is recovering from a
brain injury and is *learning* these problems. Compare any of your entries with the approved
`lc-3` entry in `database/seeds/solutions/sliding_window.py` — that is the standard.

The guide and the tests have been tightened so these problems now fail automatically. Re-read:

1. `database/seeds/solutions/SOLUTION_GUIDE.md` (changed — read it again in full)
2. the approved `lc-3` entry in `sliding_window.py`
3. `backend/tests/test_solution_content.py` (changed)

## Files you own (unchanged)

`trees.py`, `heap.py`, `dynamic_programming.py`, `graphs.py`, `backtracking.py`, `design.py`,
`trie_union_find.py`, `matrix.py` — all in `database/seeds/solutions/`.

Do NOT edit the guide, the tests, the checker, `__init__.py`, `_stories.json`, any other topic file,
or anything under `backend/app`, `backend/alembic`, `frontend/`. No migrations, no seeding, no commits.
Also: delete the empty file `backend/anvil.db` that your first pass created. The project database is
Postgres (see `backend/.env`); there is no SQLite database, so never report checking against one.

## What was wrong, measured across your 81 entries

| Finding | How many |
|---|---|
| Exactly 2 mistakes, 2 follow-ups, 3 test inputs — the bare minimum | almost all 81 |
| The "first approach" costs the same as the best one, so there is no slow way to compare with | 55 |
| Interview script padded with filler ("In my analysis…", "I keep in mind…") to satisfy the first-person rule | 73 |
| Interview script never states the obvious way and its cost | 79 |
| Interview script never says what to test | 77 |
| `pattern` is a sentence instead of a short name | 46 |
| Steps written as clipped notes ("Traverse tree with BFS queue to populate parent hash map") | 38% of all steps |
| Unexplained shop talk: memo, base case, subproblem, traverse, populate, iterate | dozens of entries |
| Walkthrough example is a case where nothing interesting happens | several (e.g. `lc-236`: p and q are the root's two children, so the named trap never appears) |

## What to change in EVERY entry

1. **`pattern`**: the usual short name, at most 32 characters: "Tree BFS", "Tree DFS", "1-D DP",
   "2-D DP", "Backtracking", "Topological sort", "Union find", "Heap / top K", "Trie", "Matrix".
2. **First approach = a genuinely costlier first idea.** The tests now require its (time, space) to
   differ from the best approach.
   - DP and backtracking: plain recursion with its true cost (often exponential), NOT the same
     algorithm with a cache. Example — Coin Change: "try every coin at every amount, recursively"
     is O(coins^amount); the table is the better way.
   - Trees/graphs where the honest first idea has the same time: pick the version that uses more
     memory (store all paths, build a parent map, copy the grid) and say that in `space_why`.
   - Its Java must still be correct; the checker lets a slow approach time out on big tests but never
     lets it give a wrong answer. If a plain-recursion version would exceed the time limit even on
     the small visible tests, that is fine.
3. **Steps are whole sentences** someone could follow with no code in front of them. Before:
   "Traverse tree with BFS queue to populate parent hash map until p and q are found." After:
   "Visit the tree level by level. For every node, write down who its parent is."
4. **No shop talk** (see the guide's banned list). Say what happens: "remember answers we already
   worked out" instead of "memoize"; "when there is nothing left to split" instead of "base case";
   "visit every node" instead of "traverse".
5. **Mistakes: 3–4**, real ones for THIS problem. Keep `mistakes[0]` as the Visual Story's trap
   where there is one. Add the mistakes people actually make: off-by-one on depth, forgetting to
   un-choose in backtracking, marking a cell visited too late, integer overflow, mutating the input,
   comparing node values instead of nodes, and so on.
6. **Walkthrough must reach `mistakes[0]`.** Choose the smallest input where that situation happens,
   and make one row show it. For `lc-236` use p and q where one is below the other, or deep in
   different branches, so the row "this node reports itself and we do not look below it" appears.
7. **Test inputs: 4–6**, each one a different kind of risk (empty, single, all equal, skewed tree,
   disconnected graph, a cycle, the largest sensible value…), not three variations of the same case.
8. **Follow-ups: 3–4**, the ones an interviewer really asks about this problem, with a concrete
   one- or two-sentence answer ("use a parent array and walk back from the target" — not
   "optimize the space").
9. **Interview script, 4–6 spoken lines**, in this order: restate the problem → the obvious way and
   its cost `O(...)` → the key point → the better way and its cost `O(...)` → what I would test.
   Write what a person would say aloud. Never add words only to satisfy a rule.
10. **Do not mention the Visual Story** in any text.

Keep what is already right: slugs, trap names that match `_stories.json`, related slugs, and the
best-approach Java. Only rewrite the best approach's code if its variable names do not match your
new steps.

## How to work

1. Fix **3 entries first** (`lc-236`, `lc-322`, `lc-146`). Run both checks. Re-read them next to `lc-3`
   and ask honestly: would a tired learner understand every sentence on first read? Then continue.
2. One file at a time. After each file, both checks must be clean before you start the next:

```bash
cd backend
.venv/bin/python -m pytest tests/test_solution_content.py -q -k "<slug or file's slugs>"
.venv/bin/python scripts/check_solutions.py --file <file_name_without_py>
```

   Run pytest **without deselecting anything in your own files**. Failures in files you do not own
   (another tool is still writing them) are not yours to fix — ignore them, do not edit them.
3. Never edit a test, the checker or the guide to get a pass. If a rule truly cannot fit a problem,
   leave that entry failing and explain why in your report.

## Report when done

1. Per file: entries rewritten, and the last lines of both checks.
2. For each entry where you changed which approach comes first: the old and new first approach.
3. Anything you could not make pass, with the reason.
4. Be exact about what you ran. Do not report checks you did not run.
