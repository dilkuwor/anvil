import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp3TableView, type Dp3Square, type Dp3TableState } from "../agy-dp3-table-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Dp3TableState>;
type Grid = number[][];

/** Fresh grid for the "your turn" run. The cheap next step walks 1, 1, 5, 1, 1 and pays 9; the best pays 6. */
const PRACTICE = "[[1,1,5],[2,9,1],[1,1,1]]";

const CODE = [
  "int m = grid.length, n = grid[0].length;",
  "int[] best = new int[n];",
  "for (int r = 0; r < m; r++) {",
  "    for (int c = 0; c < n; c++) {",
  "        if (r == 0 && c == 0) best[c] = grid[0][0];",
  "        else if (r == 0) best[c] = best[c - 1] + grid[r][c];",
  "        else if (c == 0) best[c] = best[c] + grid[r][c];",
  "        else best[c] = grid[r][c] + Math.min(best[c], best[c - 1]);",
  "    }",
  "}",
  "return best[n - 1];",
];

function parseInput(raw: string): Grid {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((row) => Array.isArray(row) && row.length === (parsed[0] as unknown[]).length && row.length > 0)) {
      return (parsed as unknown[][]).slice(0, 6).map((row) => row.slice(0, 10).map((value) => Math.max(0, Number(value) || 0)));
    }
  } catch {
    // fall through to the default grid
  }
  return [
    [1, 3, 1],
    [1, 5, 1],
    [4, 2, 1],
  ];
}

type Solved = {
  /** Cheapest total to reach each square. */
  best: number[][];
  /** Which way in the cheapest total came from. */
  from: ("above" | "left" | null)[][];
  /** The cheapest walk, start first. */
  route: Dp3Square[];
  /** The walk that always steps to the cheaper next square. */
  greedy: Dp3Square[];
  greedyTotal: number;
};

function solve(grid: Grid): Solved {
  const m = grid.length;
  const n = grid[0].length;
  const best = grid.map((row) => row.map(() => 0));
  const from: Solved["from"] = grid.map((row) => row.map(() => null));
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (r === 0 && c === 0) best[r][c] = grid[r][c];
      else if (r === 0) {
        best[r][c] = best[r][c - 1] + grid[r][c];
        from[r][c] = "left";
      } else if (c === 0) {
        best[r][c] = best[r - 1][c] + grid[r][c];
        from[r][c] = "above";
      } else if (best[r - 1][c] <= best[r][c - 1]) {
        best[r][c] = grid[r][c] + best[r - 1][c];
        from[r][c] = "above";
      } else {
        best[r][c] = grid[r][c] + best[r][c - 1];
        from[r][c] = "left";
      }
    }
  }
  const route: Dp3Square[] = [[m - 1, n - 1]];
  let [r, c] = [m - 1, n - 1];
  while (r > 0 || c > 0) {
    if (from[r][c] === "above") r--;
    else c--;
    route.unshift([r, c]);
  }
  const greedy: Dp3Square[] = [[0, 0]];
  let greedyTotal = grid[0][0];
  [r, c] = [0, 0];
  while (r < m - 1 || c < n - 1) {
    if (r === m - 1) c++;
    else if (c === n - 1) r++;
    else if (grid[r][c + 1] <= grid[r + 1][c]) c++;
    else r++;
    greedy.push([r, c]);
    greedyTotal += grid[r][c];
  }
  return { best, from, route, greedy, greedyTotal };
}

/** Independent check: the smallest total over every walk, by trying them all. */
function smallestByTryingAll(grid: Grid): number {
  const m = grid.length;
  const n = grid[0].length;
  const walk = (r: number, c: number): number => {
    if (r === m - 1 && c === n - 1) return grid[r][c];
    const down = r + 1 < m ? walk(r + 1, c) : Infinity;
    const right = c + 1 < n ? walk(r, c + 1) : Infinity;
    return grid[r][c] + Math.min(down, right);
  };
  return walk(0, 0);
}

const sumOf = (grid: Grid, walk: Dp3Square[]) => walk.reduce((total, [r, c]) => total + grid[r][c], 0);
const tollsOf = (grid: Grid, walk: Dp3Square[]) => walk.map(([r, c]) => grid[r][c]).join(", ");

function blank(grid: Grid): Dp3TableState {
  const m = grid.length;
  const n = grid[0].length;
  return {
    mode: "table",
    align: [],
    rowLabels: null,
    columnLabels: null,
    rowTones: [],
    columnTones: [],
    cells: Array.from({ length: m }, () => Array.from({ length: n }, () => null)),
    tones: Array.from({ length: m }, () => Array.from({ length: n }, () => "idle" as CellTone)),
    tiles: null,
    marks: [],
    here: null,
    arrows: [],
    paths: [],
    outlines: [],
    badge: null,
    counter: null,
    answer: null,
    note: null,
  };
}

/** The grid as the problem gives it: every square shows its toll. */
function tollBoard(grid: Grid): Dp3TableState {
  const m = grid.length;
  const n = grid[0].length;
  const marks: Dp3TableState["marks"] = [{ square: [0, 0], text: "start" }];
  if (m > 1 || n > 1) marks.push({ square: [m - 1, n - 1], text: "end" });
  return { ...blank(grid), cells: grid.map((row) => [...row]), marks };
}

/** While filling, each square shows its best total big, and its own toll small underneath. */
function tollMarks(grid: Grid): Dp3TableState["marks"] {
  return grid.flatMap((row, r) => row.map((toll, c) => ({ square: [r, c] as Dp3Square, text: `toll ${toll}` })));
}

/** Right along the top, then down the right side. */
function edgeWalk(grid: Grid): Dp3Square[] {
  const walk: Dp3Square[] = [];
  for (let c = 0; c < grid[0].length; c++) walk.push([0, c]);
  for (let r = 1; r < grid.length; r++) walk.push([r, grid[0].length - 1]);
  return walk;
}

function pictureFrames(grid: Grid, solved: Solved): Frame[] {
  const m = grid.length;
  const n = grid[0].length;
  const answer = solved.best[m - 1][n - 1];
  const board = tollBoard(grid);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A grid of ${m} ${m === 1 ? "row" : "rows"} and ${n} ${n === 1 ? "column" : "columns"}. Each square has a toll: the number you pay for standing on it. You start top left.`,
      state: board,
    },
  ];
  const walk = edgeWalk(grid);
  frames.push({
    scene: "picture",
    caption: `Allowed: one step right, or one step down, to the end square. This walk pays ${tollsOf(grid, walk)}, a total of ${sumOf(grid, walk)}.`,
    state: { ...board, paths: [{ squares: walk, tone: "teal", arrow: true }], note: { text: `this walk pays ${sumOf(grid, walk)}`, tone: "teal" } },
  });
  if (m >= 2 && n >= 2) {
    frames.push({
      scene: "picture",
      caption: "Not allowed: a step left, or a step up. The walker never goes back.",
      state: {
        ...board,
        paths: [
          {
            squares: [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
            ],
            tone: "coral",
            arrow: true,
          },
        ],
        note: { text: "✕ a step to the left: not allowed", tone: "coral" },
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the smallest total any walk can pay, counting the start and the end. Here that is ${answer}.`,
    state: { ...board, paths: [{ squares: solved.route, tone: "teal", arrow: true }], answer: { label: "smallest total", value: String(answer) } },
  });
  return frames;
}

type SlowRun = { visits: number[][]; total: number; walks: Dp3Square[][]; visitsAtWalk: number[]; finished: number };

/** Plain recursion, really run: from each square try down, then right, and count every square stood on. */
function runSlow(grid: Grid): SlowRun {
  const m = grid.length;
  const n = grid[0].length;
  const run: SlowRun = { visits: grid.map((row) => row.map(() => 0)), total: 0, walks: [], visitsAtWalk: [], finished: 0 };
  const trail: Dp3Square[] = [];
  const helper = (r: number, c: number): number => {
    if (r >= m || c >= n) return Infinity;
    run.visits[r][c]++;
    run.total++;
    trail.push([r, c]);
    let cheapest: number;
    if (r === m - 1 && c === n - 1) {
      run.finished++;
      if (run.walks.length < 2) {
        run.walks.push([...trail]);
        run.visitsAtWalk.push(run.total);
      }
      cheapest = grid[r][c];
    } else {
      cheapest = grid[r][c] + Math.min(helper(r + 1, c), helper(r, c + 1));
    }
    trail.pop();
    return cheapest;
  };
  helper(0, 0);
  return run;
}

function slowFrames(grid: Grid, run: SlowRun): Frame[] {
  const board = tollBoard(grid);
  const counter = (value: number) => ({ label: "squares stood on", value });
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: walk every walk, add up its tolls, and keep the smallest. Walk 1 goes down first and pays ${sumOf(grid, run.walks[0])}.`,
      state: { ...board, paths: [{ squares: run.walks[0], tone: "accent", arrow: true }], counter: counter(run.visitsAtWalk[0]) },
    },
  ];
  if (run.walks[1]) {
    frames.push({
      scene: "slow",
      caption: `Walk 2 turns one step sooner and pays ${sumOf(grid, run.walks[1])}. It walks back over squares that walk 1 already added up.`,
      state: { ...board, paths: [{ squares: run.walks[1], tone: "accent", arrow: true }], counter: counter(run.visitsAtWalk[1]) },
    });
  }
  const counted = blank(grid);
  counted.cells = run.visits.map((row) => [...row]);
  counted.tones = run.visits.map((row) => row.map((value) => (value > 1 ? "miss" : "idle") as CellTone));
  frames.push({
    scene: "slow",
    caption: `After ${run.finished === 1 ? "that one walk" : `all ${run.finished} walks`}, each square shows how many times the slow way stood on it. The same squares, again and again.`,
    state: { ...counted, counter: counter(run.total) },
  });
  frames.push({
    scene: "slow",
    caption: `That is ${run.total} squares stood on, for a grid of ${grid.length * grid[0].length}. Each extra row or column can double the work. This is O(2^(m+n)) time.`,
    state: { ...counted, tones: counted.tones.map((row) => row.map(() => "faded" as CellTone)), counter: counter(run.total) },
  });
  return frames;
}

/** The first square that has two ways in with different totals, so the choice can be seen. */
function firstChoice(solved: Solved): Dp3Square | null {
  const { best } = solved;
  for (let r = 1; r < best.length; r++) {
    for (let c = 1; c < best[0].length; c++) {
      if (best[r - 1][c] !== best[r][c - 1]) return [r, c];
    }
  }
  return null;
}

/** Totals already written just before `stop` is filled (row by row). */
function totalsUntil(solved: Solved, stop: Dp3Square, include = false): (number | null)[][] {
  return solved.best.map((row, r) =>
    row.map((value, c) => {
      const before = r < stop[0] || (r === stop[0] && (include ? c <= stop[1] : c < stop[1]));
      return before ? value : null;
    }),
  );
}

function cheaperSide(solved: Solved, [r, c]: Dp3Square) {
  const above = solved.best[r - 1][c];
  const left = solved.best[r][c - 1];
  return { above, left, side: solved.from[r][c] === "above" ? "above" : "left", from: (solved.from[r][c] === "above" ? [r - 1, c] : [r, c - 1]) as Dp3Square };
}

function insightFrames(grid: Grid, solved: Solved): Frame[] {
  const square = firstChoice(solved);
  if (!square) {
    return [
      {
        scene: "insight",
        caption: "Picture a toll road with a table of totals. Each square will hold the cheapest total to reach it.",
        state: { ...blank(grid), marks: tollMarks(grid), here: [0, 0] },
      },
      {
        scene: "insight",
        caption: "In this grid every square has one way in, or two ways in with the same total. So each square just adds its toll to the total before it.",
        state: { ...blank(grid), cells: solved.best.map((row) => [...row]), marks: tollMarks(grid) },
      },
    ];
  }
  const [r, c] = square;
  const { above, left, side, from } = cheaperSide(solved, square);
  const toll = grid[r][c];
  const filled = totalsUntil(solved, square);
  return [
    {
      scene: "insight",
      caption: "Stop walking every walk. Picture a toll road with a table of totals: each square will hold the cheapest total to reach it.",
      state: { ...blank(grid), cells: filled, marks: tollMarks(grid), here: square },
    },
    {
      scene: "insight",
      caption: `A walker can reach this square only from the square above, or from the square on the left. The cheapest totals there are ${above} and ${left}.`,
      state: { ...blank(grid), cells: filled, marks: tollMarks(grid), here: square, arrows: [{ from: [r - 1, c], to: square }, { from: [r, c - 1], to: square }], badge: { text: "two ways in: above, left", tone: "accent" } },
    },
    {
      scene: "insight",
      caption: `So take the cheaper way in, the one ${side === "above" ? "above" : "on the left"}, and pay this square's toll: ${Math.min(above, left)} + ${toll} = ${Math.min(above, left) + toll}.`,
      state: {
        ...blank(grid),
        cells: totalsUntil(solved, square, true),
        tones: blank(grid).tones.map((row, rr) => row.map((tone, cc) => (rr === r && cc === c ? "done" : tone))),
        marks: tollMarks(grid),
        here: square,
        arrows: [{ from, to: square }],
        badge: { text: "toll + cheaper of above and left", tone: "teal" },
      },
    },
  ];
}

function cheaperQuiz(grid: Grid, solved: Solved, square: Dp3Square): StoryQuiz {
  const n = grid[0].length;
  const flat = ([r, c]: Dp3Square) => r * n + c;
  const [r, c] = square;
  const { above, left, from } = cheaperSide(solved, square);
  const other: Dp3Square = solved.from[r][c] === "above" ? [r, c - 1] : [r - 1, c];
  const otherTotal = solved.from[r][c] === "above" ? left : above;
  const feedback: Record<number, string> = {
    [flat(square)]: "That is the square we are filling. Its total comes from a square filled before it.",
    [flat(other)]: `That way in costs ${otherTotal} so far. The other way in costs less.`,
  };
  if (r > 0 && c > 0) feedback[flat([r - 1, c - 1])] = "The walker cannot step diagonally. Only right, or down.";
  return {
    kind: "cell",
    cells: grid.length * n,
    question: "Which way in is cheaper for the ringed square? Click that square.",
    answer: flat(from),
    feedback,
    otherwise: "The way in must be the square above or the square on the left of the ring.",
    why: `It holds ${Math.min(above, left)}, the smaller of ${above} and ${left}. The walker comes in from there.`,
  };
}

/**
 * The real algorithm, row by row, one frame per square filled. After a few squares are told in full,
 * the rest of a row is summed up in one frame. `practice` reuses it on a fresh grid and asks at every choice.
 */
function fillFrames(grid: Grid, solved: Solved, scene: SceneId, practice: boolean): Frame[] {
  const m = grid.length;
  const n = grid[0].length;
  const frames: Frame[] = [];
  const cells: (number | null)[][] = grid.map((row) => row.map(() => null));
  const line = (index: number) => (practice ? undefined : index);
  let fadedBelow = 0;
  const base = (): Dp3TableState => {
    const state = blank(grid);
    state.cells = cells.map((row) => [...row]);
    state.tones = state.tones.map((row, r) => row.map((tone, c) => (r < fadedBelow ? "faded" : cells[r][c] !== null ? "hit" : tone)));
    state.marks = tollMarks(grid);
    return state;
  };
  const TOLL_BADGE = { text: "toll + cheaper of above and left", tone: "teal" as const };

  cells[0][0] = solved.best[0][0];
  const start = base();
  start.tones[0][0] = "window";
  frames.push({
    scene,
    caption: practice
      ? "The start square costs its own toll. You choose the cheaper way in for every square after it."
      : `A row of totals, one per column. The start square has no way in: its total is its own toll, ${grid[0][0]}.`,
    codeLine: line(4),
    state: { ...start, here: [0, 0] },
  });

  if (n > 1) {
    for (let c = 1; c < n; c++) cells[0][c] = solved.best[0][c];
    const top = base();
    top.tones[0] = top.tones[0].map(() => "window");
    frames.push({
      scene,
      caption: `The top edge has no square above it, so each square is reached only from the left. Add up the tolls: ${solved.best[0].join(", ")}.`,
      codeLine: line(5),
      state: { ...top, here: [0, n - 1], arrows: n > 1 ? [{ from: [0, n - 2], to: [0, n - 1] }] : [] },
    });
  }

  let detailed = 0;
  let toldOneRow = false;
  for (let r = 1; r < m; r++) {
    if (r >= 2) fadedBelow = practice ? 0 : r - 1;
    cells[r][0] = solved.best[r][0];
    frames.push({
      scene,
      caption:
        r === 1
          ? `The left edge has no square on its left, so it is reached only from above: ${solved.best[r - 1][0]} + toll ${grid[r][0]} = ${solved.best[r][0]}.`
          : `A new row. Its left edge square is reached only from above: ${solved.best[r - 1][0]} + toll ${grid[r][0]} = ${solved.best[r][0]}.`,
      codeLine: line(6),
      state: { ...base(), here: [r, 0], arrows: [{ from: [r - 1, 0], to: [r, 0] }] },
    });

    let group: Dp3Square[] = [];
    const flush = () => {
      if (group.length === 0) return;
      const state = base();
      frames.push({
        scene,
        caption: `The next ${group.length === 1 ? "square works" : `${group.length} squares work`} the same way: toll plus the cheaper of above and left. ${group.length === 1 ? "It holds" : "They hold"} ${group.map(([a, b]) => solved.best[a][b]).join(", ")}.`,
        codeLine: line(7),
        state: { ...state, here: group.at(-1)!, badge: TOLL_BADGE },
      });
      group = [];
    };

    for (let c = 1; c < n; c++) {
      const square: Dp3Square = [r, c];
      const { above, left, from, side } = cheaperSide(solved, square);
      const toll = grid[r][c];
      const tie = above === left;
      const isCorner = r === m - 1 && c === n - 1;
      const full = practice ? !tie : detailed < 4 || isCorner;
      if (!full) {
        cells[r][c] = solved.best[r][c];
        group.push(square);
        continue;
      }
      flush();
      detailed++;
      const ask = !tie && (practice || !frames.some((frame) => frame.quiz));
      if (ask) {
        frames.push({
          scene,
          caption: `The ring is on a square with toll ${toll}. The square above holds ${above}, the square on the left holds ${left}.`,
          codeLine: line(7),
          state: { ...base(), here: square },
          quiz: cheaperQuiz(grid, solved, square),
        });
      }
      cells[r][c] = solved.best[r][c];
      const state = base();
      state.tones[r][c] = isCorner ? "done" : "hit";
      frames.push({
        scene,
        caption: tie
          ? `Above and left both hold ${above}, so either way in is fine. Toll ${toll} + ${above} = ${solved.best[r][c]}.`
          : `${side === "above" ? "Above" : "Left"} is cheaper: ${Math.min(above, left)} beats ${Math.max(above, left)}. Toll ${toll} + ${Math.min(above, left)} = ${solved.best[r][c]}.`,
        codeLine: line(7),
        state: { ...state, here: square, arrows: [{ from, to: square }], badge: TOLL_BADGE },
      });
    }
    flush();
    if (!practice && !toldOneRow && m > 2 && n > 1) {
      toldOneRow = true;
      fadedBelow = r;
      frames.push({
        scene,
        caption: "This row is done. A square only looks one row up, so the code keeps one row of totals and writes the next row over it. Older rows fade.",
        codeLine: line(1),
        state: { ...base(), badge: { text: "one row of totals is enough", tone: "accent" } },
      });
    }
  }
  return frames;
}

function finishedBoard(grid: Grid, solved: Solved): Dp3TableState {
  const m = grid.length;
  const n = grid[0].length;
  const state = blank(grid);
  state.cells = solved.best.map((row) => [...row]);
  state.tones = state.tones.map((row) => row.map(() => "hit" as CellTone));
  state.tones[m - 1][n - 1] = "done";
  state.marks = tollMarks(grid);
  return { ...state, answer: { label: "smallest total", value: String(solved.best[m - 1][n - 1]) } };
}

function trapFrame(grid: Grid, solved: Solved, scene: SceneId, codeLine: number | undefined): Frame {
  const answer = solved.best[grid.length - 1][grid[0].length - 1];
  const wins = solved.greedyTotal > answer;
  return {
    scene,
    caption: wins
      ? `The Cheap Step Trap: always stepping to the cheaper next square walks ${tollsOf(grid, solved.greedy)} and pays ${solved.greedyTotal}, not ${answer}.`
      : `Always stepping to the cheaper next square pays ${solved.greedyTotal} here too. On other grids it walks into an expensive area: the Cheap Step Trap.`,
    codeLine,
    state: {
      ...tollBoard(grid),
      paths: [
        { squares: solved.route, tone: "teal", arrow: true },
        { squares: solved.greedy, tone: "coral", arrow: true },
      ],
      note: wins ? { text: `✕ cheap next step: ${solved.greedyTotal}   ·   best walk: ${answer}`, tone: "coral" } : { text: `cheap next step: ${solved.greedyTotal}`, tone: "muted" },
      badge: { text: "the Cheap Step Trap", tone: "coral" },
    },
  };
}

function solutionFrames(grid: Grid, solved: Solved, slow: SlowRun): Frame[] {
  const m = grid.length;
  const n = grid[0].length;
  const answer = solved.best[m - 1][n - 1];
  const frames = fillFrames(grid, solved, "solution", false);
  const done = finishedBoard(grid, solved);
  frames.push({
    scene: "solution",
    caption: `Every square is filled. The corner holds the cheapest total of any walk. The answer is ${answer}.`,
    codeLine: 10,
    state: { ...done, here: [m - 1, n - 1] },
  });
  frames.push({
    scene: "solution",
    caption: `Follow the cheaper way in back from the corner to see the walk: ${tollsOf(grid, solved.route)}.`,
    codeLine: 10,
    state: { ...done, paths: [{ squares: solved.route, tone: "teal", arrow: true }] },
  });
  frames.push(trapFrame(grid, solved, "solution", 7));
  frames.push({
    scene: "solution",
    caption: `Time: O(m · n). Each of the ${m * n} squares was filled once, with one comparison.${slow.total > m * n ? ` The slow way stood on ${slow.total} squares.` : ""}`,
    codeLine: 3,
    state: { ...done, counter: { label: "squares filled", value: m * n } },
  });
  const kept = finishedBoard(grid, solved);
  kept.tones = kept.tones.map((row, r) => row.map(() => (r === m - 1 ? "window" : "faded") as CellTone));
  frames.push({
    scene: "solution",
    caption: `Space: O(n). The code keeps one row of ${n} totals at a time. Every faded row was written over by the row below it.`,
    codeLine: 1,
    state: kept,
  });
  return frames;
}

function practiceFrames(grid: Grid, solved: Solved): Frame[] {
  const m = grid.length;
  const n = grid[0].length;
  const answer = solved.best[m - 1][n - 1];
  const board = tollBoard(grid);
  const nextRight = grid[0][1] ?? 0;
  const nextDown = grid[1]?.[0] ?? 0;
  const frames: Frame[] = [
    {
      scene: "card",
      caption: `Your turn, on a new grid. From the start, the square to the right costs ${nextRight} and the square below costs ${nextDown}.`,
      state: board,
      quiz: {
        kind: "choice",
        question: "A friend says: always step to the cheaper next square. Will that find the smallest total?",
        options: ["Yes, cheap steps add up to a cheap walk", "Not always, a cheap step can lead into expensive squares"],
        answer: 1,
        why: `Here the cheap steps walk ${tollsOf(grid, solved.greedy)} and pay ${solved.greedyTotal}. The best walk pays ${answer}.`,
      },
    },
    trapFrame(grid, solved, "card", undefined),
    ...fillFrames(grid, solved, "card", true),
  ];
  frames.push({
    scene: "card",
    caption: `Done. The corner holds ${answer}, so the answer is ${answer}. You chose the cheaper way in at every square.`,
    state: { ...finishedBoard(grid, solved), paths: [{ squares: solved.route, tone: "teal", arrow: true }] },
  });
  return frames;
}

function remembered(grid: Grid, solved: Solved): Dp3TableState {
  const m = grid.length;
  const n = grid[0].length;
  const state = finishedBoard(grid, solved);
  const into = m > 1 && n > 1 ? cheaperSide(solved, [m - 1, n - 1]).from : null;
  return { ...state, arrows: into ? [{ from: into, to: [m - 1, n - 1] }] : [], paths: [{ squares: solved.route, tone: "teal", arrow: true }] };
}

export const minimumPathSumStory: ProblemStory<Dp3TableState> = {
  slugs: ["lc-64"],
  pattern: "2-D DP",
  trigger: "the smallest total of a walk through a grid, moving only right or down",
  insight: "A toll road. Each square holds the cheapest total to reach it. You can only arrive from above or from the left, so a square pays its own toll plus the cheaper of those two.",
  metaphor: {
    name: "The toll road",
    legend: "toll = grid[r][c] · square's total = best[c] · above = best[c] before it changes · left = best[c - 1] · corner = best[n - 1]",
    terms: ["toll", "square", "above", "left", "cheaper", "corner", "edge"],
  },
  traps: [{ name: "The Cheap Step Trap", rule: "A cheap next square can lead into an expensive area. Give every square its best total, from the cheaper of above and left." }],
  template: [
    "best[0] = grid[0][0];                          // the start pays its own toll",
    "edges: add the toll to the only way in",
    "for each other square (r, c), row by row:",
    "    best = toll + min(total above, total on the left);",
    "return the corner's total;",
  ],
  complexity: {
    slow: "O(2^(m+n))",
    time: "O(m · n)",
    timeWhy: "every square is filled once, with one comparison",
    space: "O(n)",
    spaceWhy: "a square only looks one row up, so one row of n totals is kept and written over",
  },
  code: CODE,
  examples: [
    { label: "3 × 3 grid", input: "[[1,3,1],[1,5,1],[4,2,1]]", expected: "7", note: "Tricky: the cheap next step walks into the 4" },
    { label: "2 × 3 grid", input: "[[1,2,3],[4,5,6]]", expected: "12" },
    { label: "a 9 in the middle", input: "[[2,1,3],[1,9,1],[1,1,2]]", expected: "7" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-62", title: "Unique Paths" },
    { slug: "lc-221", title: "Maximal Square" },
    { slug: "lc-1143", title: "Longest Common Subsequence" },
  ],
  answer: (raw) => String(smallestByTryingAll(parseInput(raw))),
  frames: (raw) => {
    const grid = parseInput(raw);
    const solved = solve(grid);
    const slow = runSlow(grid);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(grid, solved),
      ...slowFrames(grid, slow),
      ...insightFrames(grid, solved),
      ...solutionFrames(grid, solved, slow),
      ...practiceFrames(practice, solve(practice)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: remembered(grid, solved),
      },
    ];
  },
  View: AgyDp3TableView,
};
