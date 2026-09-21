import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp3TableView, type Dp3Square, type Dp3TableState } from "../agy-dp3-table-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Dp3TableState>;
type Grid = { m: number; n: number };

/** Fresh grid for the "your turn" run. Small to fill, yet its shortcut formula already overflows. */
const PRACTICE = "m=2, n=13";

const CODE = [
  "int[] row = new int[n];",
  "Arrays.fill(row, 1);",
  "for (int r = 1; r < m; r++) {",
  "    for (int c = 1; c < n; c++) {",
  "        row[c] += row[c - 1];",
  "    }",
  "}",
  "return row[n - 1];",
];

const INT_LIMIT = 2147483647;

function parseInput(raw: string): Grid {
  const numbers = (raw.match(/\d+/g) ?? []).map(Number);
  const clamp = (value: number | undefined, most: number) => Math.min(Math.max(value ?? 3, 1), most);
  return { m: clamp(numbers[0], 6), n: clamp(numbers[1], 13) };
}

/** Independent solver: the number of ways to choose which steps go down, multiplied and divided one factor at a time. */
function countWalks({ m, n }: Grid): number {
  let ways = 1;
  for (let step = 1; step <= m - 1; step++) ways = Math.round((ways * (n - 1 + step)) / step);
  return ways;
}

/** The table the real algorithm builds, by adding the square above and the square on the left. */
function buildTable({ m, n }: Grid): number[][] {
  const table = Array.from({ length: m }, () => Array.from({ length: n }, () => 1));
  for (let r = 1; r < m; r++) for (let c = 1; c < n; c++) table[r][c] = table[r - 1][c] + table[r][c - 1];
  return table;
}

const comma = (value: number) => value.toLocaleString("en-US");

function factorial(k: number) {
  let value = 1;
  for (let i = 2; i <= k; i++) value *= i;
  return value;
}

/** The same product, but held in a 32-bit int the way Java would hold it: it silently wraps around. */
function factorialInInt(k: number) {
  let value = 1;
  for (let i = 2; i <= k; i++) value = Math.imul(value, i);
  return value;
}

/** What the factorial formula really returns when every number is a Java int. */
function formulaInInt({ m, n }: Grid) {
  const below = Math.imul(factorialInInt(m - 1), factorialInInt(n - 1));
  return below === 0 ? 0 : Math.trunc(factorialInInt(m + n - 2) / below);
}

function blank({ m, n }: Grid): Dp3TableState {
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

function marksOf({ m, n }: Grid): Dp3TableState["marks"] {
  if (m === 1 && n === 1) return [{ square: [0, 0], text: "start" }];
  return [
    { square: [0, 0], text: "start" },
    { square: [m - 1, n - 1], text: "end" },
  ];
}

/** Right along the top edge, then down the right edge. */
function walkRightFirst({ m, n }: Grid): Dp3Square[] {
  const walk: Dp3Square[] = [];
  for (let c = 0; c < n; c++) walk.push([0, c]);
  for (let r = 1; r < m; r++) walk.push([r, n - 1]);
  return walk;
}

/** One step right, one step down, in turns, then straight to the end. */
function walkStairs({ m, n }: Grid): Dp3Square[] {
  const walk: Dp3Square[] = [[0, 0]];
  let r = 0;
  let c = 0;
  while (r < m - 1 || c < n - 1) {
    const goDown = r < m - 1 && (c === n - 1 || walk.length % 2 === 1);
    if (goDown) r++;
    else c++;
    walk.push([r, c]);
  }
  return walk;
}

function pictureFrames(grid: Grid, answer: number): Frame[] {
  const { m, n } = grid;
  const base = { ...blank(grid), marks: marksOf(grid) };
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A grid of ${m} ${m === 1 ? "row" : "rows"} and ${n} ${n === 1 ? "column" : "columns"}. A walker stands on the start square, top left. The walker wants to reach the end square, bottom right.`,
      state: base,
    },
    {
      scene: "picture",
      caption: "Allowed: one step to the right, or one step down. This is one full walk from start to end.",
      state: { ...base, paths: [{ squares: walkRightFirst(grid), tone: "teal", arrow: true }], note: { text: "only right and down: allowed", tone: "teal" } },
    },
  ];
  if (m >= 2 && n >= 2) {
    frames.push({
      scene: "picture",
      caption: "Not allowed: a step to the left, or a step up. The walker never goes back.",
      state: {
        ...base,
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
    frames.push({
      scene: "picture",
      caption: "Here is a different allowed walk. Every different walk counts once.",
      state: { ...base, paths: [{ squares: walkStairs(grid), tone: "teal", arrow: true }] },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: count all the different walks from start to end. Here the answer will be ${answer}.`,
    state: { ...base, answer: { label: "different walks", value: String(answer) } },
  });
  return frames;
}

type SlowRun = { visits: number[][]; total: number; walks: Dp3Square[][]; visitsAtWalk: number[]; finished: number };

/** Plain recursion, really run: from each square try down, then right, and count every square stood on. */
function runSlow({ m, n }: Grid): SlowRun {
  const run: SlowRun = { visits: Array.from({ length: m }, () => Array.from({ length: n }, () => 0)), total: 0, walks: [], visitsAtWalk: [], finished: 0 };
  const trail: Dp3Square[] = [];
  const helper = (r: number, c: number): number => {
    if (r >= m || c >= n) return 0;
    run.visits[r][c]++;
    run.total++;
    trail.push([r, c]);
    let ways: number;
    if (r === m - 1 && c === n - 1) {
      run.finished++;
      if (run.walks.length < 2) {
        run.walks.push([...trail]);
        run.visitsAtWalk.push(run.total);
      }
      ways = 1;
    } else {
      ways = helper(r + 1, c) + helper(r, c + 1);
    }
    trail.pop();
    return ways;
  };
  helper(0, 0);
  return run;
}

function slowFrames(grid: Grid, run: SlowRun): Frame[] {
  const base = { ...blank(grid), marks: marksOf(grid) };
  const frames: Frame[] = [];
  const counter = (value: number) => ({ label: "squares stood on", value });
  frames.push({
    scene: "slow",
    caption: `The slow way: really walk every walk, one after the other, and count them. ${grid.m > 1 && grid.n > 1 ? "Walk 1 goes down first, then right." : "Here there is only one."}`,
    state: { ...base, paths: [{ squares: run.walks[0], tone: "accent", arrow: true }], counter: counter(run.visitsAtWalk[0]) },
  });
  if (run.walks[1]) {
    const split = run.walks[1].findIndex(([r, c], index) => run.walks[0][index][0] !== r || run.walks[0][index][1] !== c);
    const again = run.walks[1].slice(split).filter(([r, c]) => run.walks[0].some(([a, b]) => a === r && b === c)).length;
    frames.push({
      scene: "slow",
      caption: `Walk 2 turns right one step sooner. Then it joins the route of walk 1, and stands on ${again} ${again === 1 ? "square" : "squares"} that walk 1 already walked.`,
      state: { ...base, paths: [{ squares: run.walks[1], tone: "accent", arrow: true }], counter: counter(run.visitsAtWalk[1]) },
    });
  }
  const counted = blank(grid);
  counted.cells = run.visits.map((line) => [...line]);
  counted.tones = run.visits.map((line) => line.map((value) => (value > 1 ? "miss" : "idle") as CellTone));
  frames.push({
    scene: "slow",
    caption: `After ${run.finished === 1 ? "that one walk" : `all ${run.finished} walks`}, each square shows how many times the slow way stood on it. The same squares, again and again.`,
    state: { ...counted, counter: counter(run.total) },
  });
  frames.push({
    scene: "slow",
    caption: `That is ${run.total} squares stood on, to count ${run.finished} ${run.finished === 1 ? "walk" : "walks"}. Each extra row or column can double the work. This is O(2^(m+n)) time.`,
    state: { ...counted, tones: counted.tones.map((line) => line.map(() => "faded" as CellTone)), counter: counter(run.total) },
  });
  return frames;
}

/** The table as it looks just before `stop` is filled (row by row). The two edges are always there. */
function tableUntil(table: number[][], stop: Dp3Square, include = false): (number | null)[][] {
  return table.map((line, r) =>
    line.map((value, c) => {
      if (r === 0 || c === 0) return value;
      const before = r < stop[0] || (r === stop[0] && (include ? c <= stop[1] : c < stop[1]));
      return before ? value : null;
    }),
  );
}

function insightFrames(grid: Grid, table: number[][]): Frame[] {
  const { m, n } = grid;
  if (m < 2 || n < 2) {
    return [
      {
        scene: "insight",
        caption: "Picture a table of small answers. One square's number means: how many different walks reach this square from the start.",
        state: { ...blank(grid), here: [m - 1, n - 1] },
      },
      {
        scene: "insight",
        caption: "This grid is a single line of squares. Only one walk reaches each square: straight along the line. So every square holds 1.",
        state: { ...blank(grid), cells: table.map((line) => [...line]) },
      },
    ];
  }
  // The first square where the two ways in hold different numbers, so the adding can be seen.
  const square: Dp3Square = n >= 3 ? [1, 2] : m >= 3 ? [2, 1] : [1, 1];
  const [r, c] = square;
  const top = table[r - 1][c];
  const left = table[r][c - 1];
  const edges = blank(grid);
  edges.cells = table.map((line, row) => line.map((value, column) => (row === 0 || column === 0 ? value : null)));
  edges.tones = edges.tones.map((line, row) => line.map((tone, column) => (row === 0 || column === 0 ? "window" : tone)));
  return [
    {
      scene: "insight",
      caption: "Stop walking. Picture a table of small answers instead. One square's number means: how many different walks reach this square from the start.",
      state: { ...blank(grid), here: square, marks: [{ square: [0, 0], text: "start" }] },
    },
    {
      scene: "insight",
      caption: "Along the top edge and the left edge there is only one walk: straight along the edge. So every edge square holds 1.",
      state: edges,
    },
    {
      scene: "insight",
      caption: "Now this square. A walker can step onto it only from the square above, or from the square on the left. There is no other way in.",
      state: { ...blank(grid), cells: tableUntil(table, square), here: square, arrows: [{ from: [r - 1, c], to: square }, { from: [r, c - 1], to: square }], badge: { text: "two ways in: from above, from the left", tone: "accent" } },
    },
    {
      scene: "insight",
      caption: `So its number is the two ways in, added up: ${top} from above + ${left} from the left = ${top + left}.`,
      state: {
        ...blank(grid),
        cells: tableUntil(table, square, true),
        tones: blank(grid).tones.map((line, row) => line.map((tone, column) => (row === r && column === c ? "done" : tone))),
        here: square,
        arrows: [{ from: [r - 1, c], to: square }, { from: [r, c - 1], to: square }],
        badge: { text: "ways above + ways on the left", tone: "teal" },
      },
    },
  ];
}

const flatten = ({ n }: Grid, [r, c]: Dp3Square) => r * n + c;

/** The square above is already drawn as one way in. The reader points at the other one. */
function otherWayInQuiz(grid: Grid, square: Dp3Square): StoryQuiz {
  const [r, c] = square;
  const feedback: Record<number, string> = {
    [flatten(grid, square)]: "That is the square we are filling. It gets its number from squares filled before it.",
    [flatten(grid, [r - 1, c])]: "That way in is already drawn. There is one more.",
    [flatten(grid, [r - 1, c - 1])]: "The walker cannot step diagonally. Only right, or down.",
  };
  if (c + 1 < grid.n) feedback[flatten(grid, [r, c + 1])] = "From there the walker would have to step left. That is not allowed.";
  if (r + 1 < grid.m) feedback[flatten(grid, [r + 1, c])] = "From there the walker would have to step up. That is not allowed.";
  return {
    kind: "cell",
    cells: grid.m * grid.n,
    question: "A walker can also arrive from one other square. Click it.",
    answer: flatten(grid, [r, c - 1]),
    feedback,
    otherwise: "A walker must be able to reach the ringed square from there in a single allowed step.",
    why: "One step right from the square on the left lands here. Above and left are the only two ways in.",
  };
}

function cornerQuiz(grid: Grid): StoryQuiz {
  const feedback: Record<number, string> = { 0: "That is the start square. There is only one way to stand there, so it holds 1, not the total." };
  if (grid.n > 1) feedback[flatten(grid, [0, grid.n - 1])] = "That square counts the walks that stop at the end of the top edge. The walker still has to go down.";
  return {
    kind: "cell",
    cells: grid.m * grid.n,
    question: "Which square will hold the final answer? Click it.",
    answer: flatten(grid, [grid.m - 1, grid.n - 1]),
    feedback,
    otherwise: "A square counts the walks that reach it. Where does every full walk stop?",
    why: "Every full walk stops on the bottom right corner, so that square counts them all.",
  };
}

const ADD_BADGE = { text: "ways above + ways on the left", tone: "teal" as const };

/** The real algorithm, square by square. The first squares are told in full; after that the rest of a row is summed up in one frame. */
function solutionFrames(grid: Grid, table: number[][], slow: SlowRun): Frame[] {
  const { m, n } = grid;
  const frames: Frame[] = [];
  const answer = table[m - 1][n - 1];
  const cells: (number | null)[][] = table.map((line) => line.map(() => null));
  /** Rows the single rolling row has already written over. */
  let fadedBelow = 0;
  const base = (): Dp3TableState => {
    const state = blank(grid);
    state.cells = cells.map((line) => [...line]);
    state.tones = state.tones.map((line, row) => line.map((tone) => (row < fadedBelow ? "faded" : tone)));
    return state;
  };

  frames.push({
    scene: "solution",
    caption: `Draw the table: ${m} rows and ${n} columns, one square for every square of the grid. Each square will hold the number of ways to reach it.`,
    codeLine: 0,
    state: base(),
  });
  for (let c = 0; c < n; c++) cells[0][c] = 1;
  const topEdge = base();
  topEdge.tones[0] = topEdge.tones[0].map(() => "window");
  frames.push({
    scene: "solution",
    caption: "The top edge first. Only one walk reaches each of these squares: straight to the right. So each square holds 1.",
    codeLine: 1,
    state: topEdge,
  });
  if (m > 1) {
    for (let r = 0; r < m; r++) cells[r][0] = 1;
    const leftEdge = base();
    for (let r = 0; r < m; r++) leftEdge.tones[r][0] = "window";
    frames.push({
      scene: "solution",
      caption: "The left edge is the same. Only one walk reaches each of these squares: straight down. Each square holds 1.",
      codeLine: 1,
      state: leftEdge,
    });
  }

  let detailed = 0;
  let asked = false;
  let toldOneRow = false;
  for (let r = 1; r < m; r++) {
    let group: Dp3Square[] = [];
    const flush = () => {
      if (group.length === 0) return;
      const last = group.at(-1)!;
      const state = base();
      for (const [a, b] of group) state.tones[a][b] = "hit";
      const values = group.map(([a, b]) => String(table[a][b])).join(", ");
      frames.push({
        scene: "solution",
        caption:
          group.length === 1
            ? `The next square works the same way: the square above plus the square on the left. It holds ${values}.`
            : `The next ${group.length} squares of this row work the same way: each adds the square above and the square on its left. They hold ${values}.`,
        codeLine: 4,
        state: { ...state, here: last, badge: ADD_BADGE },
      });
      group = [];
    };

    for (let c = 1; c < n; c++) {
      const square: Dp3Square = [r, c];
      const top = table[r - 1][c];
      const left = table[r][c - 1];
      const isCorner = r === m - 1 && c === n - 1;
      const full = detailed < 3 || c === 1 || isCorner;
      if (!full) {
        cells[r][c] = table[r][c];
        group.push(square);
        continue;
      }
      flush();
      if (r >= 2 && c === 1) fadedBelow = r - 1;
      detailed++;
      if (!asked) {
        asked = true;
        frames.push({
          scene: "solution",
          caption: `The ring marks the first free square. A walker can arrive from the square above, which holds ${top}.`,
          codeLine: 3,
          state: { ...base(), here: square, arrows: [{ from: [r - 1, c], to: square }] },
          quiz: otherWayInQuiz(grid, square),
        });
      }
      cells[r][c] = table[r][c];
      const state = base();
      state.tones[r][c] = isCorner ? "done" : "hit";
      frames.push({
        scene: "solution",
        caption:
          detailed === 1
            ? `The other way in is the square on the left, which holds ${left}. Add the two: ${top} + ${left} = ${table[r][c]} ways to reach this square.`
            : isCorner
              ? `The last square, the corner. The square above holds ${top}, the square on the left holds ${left}. ${top} + ${left} = ${table[r][c]}.`
              : `${c === 1 ? "A new row. " : "Next square. "}The square above holds ${top}, the square on the left holds ${left}. ${top} + ${left} = ${table[r][c]}.`,
        codeLine: 4,
        state: { ...state, here: square, arrows: [{ from: [r - 1, c], to: square }, { from: [r, c - 1], to: square }], badge: ADD_BADGE },
      });
    }
    flush();
    if (!toldOneRow && m > 2 && n > 1) {
      toldOneRow = true;
      fadedBelow = r;
      frames.push({
        scene: "solution",
        caption: "This row is full. A square only ever looks one row up, so the code keeps a single row of numbers and writes the next row over it. Older rows fade.",
        codeLine: 2,
        state: { ...base(), badge: { text: "one row of numbers is enough", tone: "accent" } },
      });
    }
  }

  fadedBelow = 0;
  const full = base();
  full.tones[m - 1][n - 1] = "done";
  const answerLabel = { label: "different walks", value: String(answer) };
  frames.push({
    scene: "solution",
    caption: `The table is full. The corner square counts every walk from the start to the end. The answer is ${answer}.`,
    codeLine: 7,
    state: { ...full, here: [m - 1, n - 1], marks: marksOf(grid), answer: answerLabel },
  });

  const chain = Math.max(m + n - 2, 1);
  const product = factorial(chain);
  if (product > INT_LIMIT) {
    const wrong = formulaInInt(grid);
    frames.push({
      scene: "solution",
      caption: `A tempting shortcut is a formula that multiplies every number from 1 to ${chain}. That product is ${comma(product)}. The biggest number a Java int can hold is ${comma(INT_LIMIT)}.`,
      codeLine: 4,
      state: { ...full, note: { text: `1 × 2 × … × ${chain} = ${comma(product)}  ✕ does not fit in an int`, tone: "coral" } },
    });
    const broken = base();
    broken.cells[m - 1][n - 1] = wrong;
    broken.tones[m - 1][n - 1] = "miss";
    frames.push({
      scene: "solution",
      caption: `The Overflow Trap: the product does not fit, so it turns into a wrong number, and the formula answers ${comma(wrong)} instead of ${answer}. Adding squares never holds more than the answer.`,
      codeLine: 4,
      state: { ...broken, here: [m - 1, n - 1], note: { text: `✕ formula in an int: ${comma(wrong)}   ·   table: ${answer}`, tone: "coral" }, badge: { text: "the Overflow Trap", tone: "coral" } },
    });
  } else {
    frames.push({
      scene: "solution",
      caption: `A shortcut formula multiplies every number from 1 to ${chain}. Here that is ${comma(product)}, which fits. From 13 on it passes the limit of a Java int and breaks: the Overflow Trap.`,
      codeLine: 4,
      state: { ...full, answer: answerLabel, note: { text: `1 × … × ${chain} = ${comma(product)} fits   ·   ✕ 1 × … × 13 = ${comma(factorial(13))} does not`, tone: "coral" } },
    });
  }

  frames.push({
    scene: "solution",
    caption: `Time: O(m · n). Each of the ${m * n} squares was filled once, with one addition at most.${slow.total > m * n ? ` The slow way stood on ${slow.total} squares.` : ""}`,
    codeLine: 3,
    state: { ...full, answer: answerLabel, counter: { label: "squares filled", value: m * n } },
  });
  const kept = base();
  kept.tones = kept.tones.map((line, row) => line.map(() => (row === m - 1 ? "window" : "faded") as CellTone));
  frames.push({
    scene: "solution",
    caption: `Space: O(n). The code keeps only one row of ${n} numbers at a time. Every faded row was written over by the row below it.`,
    codeLine: 0,
    state: { ...kept, answer: answerLabel },
  });
  return frames;
}

function remembered(grid: Grid, table: number[][]): Dp3TableState {
  const { m, n } = grid;
  const state = blank(grid);
  state.cells = table.map((line) => [...line]);
  state.tones[m - 1][n - 1] = "done";
  const arrows: Dp3TableState["arrows"] = m > 1 && n > 1 ? [{ from: [m - 2, n - 1], to: [m - 1, n - 1] }, { from: [m - 1, n - 2], to: [m - 1, n - 1] }] : [];
  return { ...state, arrows, marks: [{ square: [0, 0], text: "start" }], answer: { label: "different walks", value: String(table[m - 1][n - 1]) } };
}

/** The "your turn" run: the reader finds the answer square, the ways in, and meets the shortcut formula. */
function practiceFrames(grid: Grid, table: number[][]): Frame[] {
  const { m, n } = grid;
  const scene: SceneId = "card";
  const frames: Frame[] = [];
  const answer = table[m - 1][n - 1];
  const cells: (number | null)[][] = table.map((line) => line.map(() => null));
  const base = (): Dp3TableState => ({ ...blank(grid), cells: cells.map((line) => [...line]) });

  frames.push({
    scene,
    caption: `Your turn, on a new grid: ${m} rows and ${n} columns. The start is top left. You make the choices.`,
    state: { ...base(), marks: [{ square: [0, 0], text: "start" }] },
    quiz: cornerQuiz(grid),
  });
  const corner = base();
  corner.tones[m - 1][n - 1] = "window";
  frames.push({
    scene,
    caption: "Every full walk stops on the corner square, so its number will be the answer.",
    state: { ...corner, marks: marksOf(grid) },
  });
  for (let c = 0; c < n; c++) cells[0][c] = 1;
  for (let r = 0; r < m; r++) cells[r][0] = 1;
  const edges = base();
  edges.tones = edges.tones.map((line, row) => line.map((tone, column) => (row === 0 || column === 0 ? "window" : tone)));
  frames.push({ scene, caption: "The top edge and the left edge hold 1. Only one straight walk reaches each of those squares.", state: edges });

  let asked = 0;
  for (let r = 1; r < m; r++) {
    let group: Dp3Square[] = [];
    for (let c = 1; c < n; c++) {
      const square: Dp3Square = [r, c];
      const top = table[r - 1][c];
      const left = table[r][c - 1];
      if (asked >= 2) {
        cells[r][c] = table[r][c];
        group.push(square);
        continue;
      }
      asked++;
      if (asked === 1) {
        frames.push({
          scene,
          caption: `The ring marks the first free square. A walker can arrive from the square above, which holds ${top}.`,
          state: { ...base(), here: square, arrows: [{ from: [r - 1, c], to: square }] },
          quiz: otherWayInQuiz(grid, square),
        });
      } else {
        frames.push({
          scene,
          caption: "The ring moves to the next square. It is still empty.",
          state: { ...base(), here: square },
          quiz: {
            kind: "choice",
            question: "Which two squares does this square add up?",
            options: ["The square above and the square on the left", "The square above and the diagonal square", "The square on the left and the diagonal square"],
            answer: 0,
            why: "A walker steps in from above or from the left. Never diagonally.",
          },
        });
      }
      cells[r][c] = table[r][c];
      const state = base();
      state.tones[r][c] = "hit";
      frames.push({
        scene,
        caption: `The square above holds ${top}, the square on the left holds ${left}. ${top} + ${left} = ${table[r][c]} ways to reach this square.`,
        state: { ...state, here: square, arrows: [{ from: [r - 1, c], to: square }, { from: [r, c - 1], to: square }], badge: ADD_BADGE },
      });
    }
    if (group.length > 0) {
      const state = base();
      for (const [a, b] of group) state.tones[a][b] = "hit";
      frames.push({
        scene,
        caption: `The rest of the row works the same way, square by square: ${group.map(([a, b]) => table[a][b]).join(", ")}.`,
        state: { ...state, here: group.at(-1)!, badge: ADD_BADGE },
      });
      group = [];
    }
  }

  const chain = Math.max(m + n - 2, 1);
  const product = factorial(chain);
  const full = base();
  full.tones[m - 1][n - 1] = "done";
  frames.push({
    scene,
    caption: `The corner holds ${answer}. A friend offers a shortcut instead: a formula that multiplies every number from 1 to ${chain}.`,
    state: { ...full, here: [m - 1, n - 1], note: { text: `1 × 2 × 3 × … × ${chain}`, tone: "muted" } },
    quiz: {
      kind: "choice",
      question: `Is that product safe in a Java int, which stops at ${comma(INT_LIMIT)}?`,
      options: [`Yes, ${chain} numbers is not many`, "No, it grows past the limit"],
      answer: product > INT_LIMIT ? 1 : 0,
      why: `1 × 2 × … × ${chain} is ${comma(product)}. ${product > INT_LIMIT ? "That does not fit. This is the Overflow Trap." : "That still fits, but only just."}`,
    },
  });
  const wrong = formulaInInt(grid);
  const broken = base();
  broken.cells[m - 1][n - 1] = wrong;
  broken.tones[m - 1][n - 1] = "miss";
  frames.push({
    scene,
    caption: `The Overflow Trap: the product is ${comma(product)}. It does not fit, so the formula answers ${comma(wrong)} instead of ${answer}.`,
    state: { ...broken, here: [m - 1, n - 1], note: { text: `✕ formula in an int: ${comma(wrong)}   ·   table: ${answer}`, tone: "coral" } },
  });
  frames.push({
    scene,
    caption: `Done. Adding square by square is safe: the corner holds ${answer}, so the answer is ${answer}.`,
    state: remembered(grid, table),
  });
  return frames;
}

export const uniquePathsStory: ProblemStory<Dp3TableState> = {
  slugs: ["lc-62"],
  pattern: "2-D DP",
  trigger: "count the different paths through a grid, moving only right or down",
  insight: "A table of small answers: each square holds the number of ways to reach it. A walker steps in only from above or from the left, so a square is those two added up. The corner holds the answer, and one rolling row is enough.",
  metaphor: {
    name: "Counting the ways in",
    legend: "square = one entry of row · square above = row[c] before it changes · square on the left = row[c - 1] · corner = row[n - 1]",
    terms: ["square", "ways", "above", "left", "edge", "corner", "walk"],
  },
  traps: [{ name: "The Overflow Trap", rule: "The shortcut formula multiplies 1 × 2 × … × (m + n − 2), which passes the int limit from 13 on. Add square by square instead, or multiply and divide one factor at a time." }],
  template: [
    "row = n ones;                        // top edge: one way each",
    "for (r = 1..m-1) for (c = 1..n-1)",
    "    row[c] = row[c] + row[c - 1];    // ways above + ways on the left",
    "return row[n - 1];                   // the corner",
  ],
  complexity: {
    slow: "O(2^(m+n))",
    time: "O(m · n)",
    timeWhy: "every square of the table is filled once, with one addition",
    space: "O(n)",
    spaceWhy: "a square only looks one row up, so a single row of n numbers is kept and written over",
  },
  code: CODE,
  examples: [
    { label: "3 rows, 3 columns", input: "m=3, n=3", expected: "6" },
    { label: "3 rows, 7 columns", input: "m=3, n=7", expected: "28" },
    { label: "3 rows, 12 columns", input: "m=3, n=12", expected: "78", note: "Tricky: the shortcut formula breaks here" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-1143", title: "Longest Common Subsequence" },
    { slug: "lc-221", title: "Maximal Square" },
    { slug: "lc-70", title: "Climbing Stairs" },
  ],
  answer: (raw) => String(countWalks(parseInput(raw))),
  frames: (raw) => {
    const grid = parseInput(raw);
    const table = buildTable(grid);
    const slow = runSlow(grid);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(grid, table[grid.m - 1][grid.n - 1]),
      ...slowFrames(grid, slow),
      ...insightFrames(grid, table),
      ...solutionFrames(grid, table, slow),
      ...practiceFrames(practice, buildTable(practice)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: remembered(grid, table),
      },
    ];
  },
  View: AgyDp3TableView,
};
