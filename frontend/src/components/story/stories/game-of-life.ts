import { LifeGridView, type LifeCell, type LifeGridState, type LifePos, type LifeRead } from "../life-grid-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<LifeGridState>;

/** Fresh board for the "your turn" run: a line of three that flips, where writing too early gives a wrong cell. */
const PRACTICE = "[[0,0,0],[1,1,1],[0,0,0]]";

const CODE = [
  "int rows = board.length;",
  "int cols = board[0].length;",
  "for (int r = 0; r < rows; r++) {",
  "    for (int c = 0; c < cols; c++) {",
  "        int live = 0;",
  "        for (int dr = -1; dr <= 1; dr++) {",
  "            for (int dc = -1; dc <= 1; dc++) {",
  "                if (dr == 0 && dc == 0) continue;",
  "                int nr = r + dr;",
  "                int nc = c + dc;",
  "                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) live += board[nr][nc] & 1;",
  "            }",
  "        }",
  "        boolean alive = (board[r][c] & 1) == 1;",
  "        if ((alive && (live == 2 || live == 3)) || (!alive && live == 3)) board[r][c] |= 2;",
  "    }",
  "}",
  "for (int r = 0; r < rows; r++) {",
  "    for (int c = 0; c < cols; c++) board[r][c] >>= 1;",
  "}",
  "return board;",
];
const LINE = { size: 0, cell: 3, count: 10, alive: 13, decide: 14, shift: 18, answer: 20 };

const AROUND: LifePos[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function parse(input: string): number[][] {
  const rows = (input.match(/\[[^\[\]]*\]/g) ?? []).map((row) => (row.match(/\d/g) ?? []).map((digit) => (digit === "0" ? 0 : 1)));
  const width = Math.max(1, ...rows.map((row) => row.length));
  const grid = rows.filter((row) => row.length > 0).map((row) => Array.from({ length: width }, (_, c) => row[c] ?? 0));
  return grid.length > 0 ? grid : [[0]];
}

const fmt = (grid: number[][]) => `[${grid.map((row) => `[${row.join(",")}]`).join(",")}]`;
const where = ([r, c]: LifePos) => `row ${r + 1}, column ${c + 1}`;
const Where = (pos: LifePos) => `Row ${pos[0] + 1}, column ${pos[1] + 1}`;
const same = (a: LifePos, b: LifePos) => a[0] === b[0] && a[1] === b[1];
const liveWord = (ink: number) => (ink === 1 ? "live" : "dead");
const count = (n: number) => `${n} live neighbour${n === 1 ? "" : "s"}`;
const copy = (grid: number[][]) => grid.map((row) => [...row]);
const cellsOf = (grid: number[][], pencil: (r: number, c: number) => number | null = () => null): LifeCell[][] => grid.map((row, r) => row.map((ink, c) => ({ ink, pencil: pencil(r, c) })));
const copyCells = (cells: LifeCell[][]) => cells.map((row) => row.map((cell) => ({ ...cell })));

/** The neighbours of a cell that exist on the board, and whether each one is live in `grid` (a plain 0/1 board). */
function readsOf(grid: number[][], [r, c]: LifePos): LifeRead[] {
  return AROUND.flatMap(([dr, dc]) => {
    const value = grid[r + dr]?.[c + dc];
    return value === undefined ? [] : [{ pos: [r + dr, c + dc] as LifePos, live: value === 1 }];
  });
}
const liveAround = (grid: number[][], pos: LifePos) => readsOf(grid, pos).filter((read) => read.live).length;

/** The four rules in one place. */
const nextState = (alive: boolean, live: number) => (alive ? (live === 2 || live === 3 ? 1 : 0) : live === 3 ? 1 : 0);

/** Independent solver: decide every cell from an untouched copy of the board. */
function solve(grid: number[][]): number[][] {
  const old = copy(grid);
  return old.map((row, r) => row.map((cell, c) => nextState(cell === 1, liveAround(old, [r, c]))));
}

type Step = {
  pos: LifePos;
  ink: number;
  reads: LifeRead[];
  count: number;
  pencil: number;
  /** The mistaken way, really run: the board as it looked when this cell's turn came, and what the cell would then read and decide. */
  wrongBoard: number[][];
  wrongCount: number;
  wrongPencil: number;
};

type Run = { steps: Step[]; looks: number; result: number[][]; trap: Step | null };

/** The real algorithm on a two-bit board, one record per cell, next to the mistaken way that writes each new value at once. */
function run(grid: number[][]): Run {
  const board = copy(grid);
  const wrong = copy(grid);
  const steps: Step[] = [];
  let looks = 0;
  board.forEach((row, r) =>
    row.forEach((_, c) => {
      const pos: LifePos = [r, c];
      const reads = AROUND.flatMap(([dr, dc]) => {
        const value = board[r + dr]?.[c + dc];
        return value === undefined ? [] : [{ pos: [r + dr, c + dc] as LifePos, live: (value & 1) === 1 }];
      });
      looks += reads.length;
      const live = reads.filter((read) => read.live).length;
      const ink = board[r][c] & 1;
      const pencil = nextState(ink === 1, live);
      const wrongBoard = copy(wrong);
      const wrongCount = liveAround(wrong, pos);
      const wrongPencil = nextState(wrong[r][c] === 1, wrongCount);
      if (pencil === 1) board[r][c] |= 2;
      wrong[r][c] = wrongPencil;
      steps.push({ pos, ink, reads, count: live, pencil, wrongBoard, wrongCount, wrongPencil });
    }),
  );
  const result = board.map((row) => row.map((value) => value >> 1));
  const trap = steps.find((step) => step.wrongPencil !== step.pencil) ?? steps.find((step) => step.wrongCount !== step.count) ?? null;
  return { steps, looks, result, trap };
}

/** The cells the mistaken way had already changed when `step` came up. */
const changedBefore = (grid: number[][], step: Step): LifePos[] => step.wrongBoard.flatMap((row, r) => row.flatMap((value, c): LifePos[] => (value !== grid[r][c] ? [[r, c]] : [])));

function show(cells: LifeCell[][], extra: Partial<LifeGridState> = {}): LifeGridState {
  return { cells: copyCells(cells), cursor: null, ...extra };
}

/** Short verdicts, so a caption never repeats the count it just gave. */
function verdict(step: Step): string {
  if (step.ink === 1) return step.count < 2 ? "Too few: it dies." : step.count > 3 ? "Too crowded: it dies." : "Just right: it lives on.";
  return step.count === 3 ? "Exactly three: it comes alive." : "Not exactly three: it stays dead.";
}

function why(step: Step): string {
  if (step.ink === 1) {
    if (step.count < 2) return "Fewer than two live neighbours: a live cell dies, as if lonely.";
    if (step.count > 3) return "More than three live neighbours: a live cell dies, as if crowded.";
    return "Two or three live neighbours: just right, so a live cell lives on.";
  }
  return step.count === 3 ? "Exactly three live neighbours: a dead cell comes alive." : "A dead cell needs exactly three live neighbours to come alive. It stays dead.";
}

const outcome = (ink: number, pencil: number) => (ink === 1 ? (pencil === 1 ? "live on" : "die") : pencil === 1 ? "come alive" : "stay dead");

function decideQuiz(step: Step): StoryQuiz {
  const alive = step.ink === 1;
  return {
    kind: "choice",
    question: `${Where(step.pos)} is ${liveWord(step.ink)} and reads ${count(step.count)}. What happens to it next turn?`,
    options: alive ? ["It lives on", "It dies"] : ["It comes alive", "It stays dead"],
    answer: step.pencil === 1 ? 0 : 1,
    why: why(step),
  };
}

function readQuiz(step: Step, changed: LifePos, cell: LifeCell): StoryQuiz {
  return {
    kind: "choice",
    question: `${Where(step.pos)} is about to count. Its neighbour at ${where(changed)} has ink ${cell.ink} and pencil ${cell.pencil}. Which one counts?`,
    options: [`The ink: ${cell.ink}, the old state`, `The pencil: ${cell.pencil}, the new state`],
    answer: 0,
    why: "All cells change at the same moment, so a neighbour's old state is the only one that counts. Neighbours read the ink and never the pencil.",
  };
}

function pictureFrames(grid: number[][], solved: number[][]): Frame[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const plain = cellsOf(grid);
  const frames: Frame[] = [
    { scene: "picture", caption: `This is the board: ${rows} row${rows === 1 ? "" : "s"} and ${cols} column${cols === 1 ? "" : "s"}. A 1 is a live cell, a 0 is a dead cell.`, state: show(plain) },
  ];
  const interior = grid.flatMap((row, r) => row.flatMap((_, c): LifePos[] => (r > 0 && r < rows - 1 && c > 0 && c < cols - 1 ? [[r, c]] : [])))[0] ?? null;
  const shown: LifePos = interior ?? [0, 0];
  const reads = readsOf(grid, shown);
  frames.push({
    scene: "picture",
    caption: interior
      ? "Every cell has up to eight neighbours: across, up, down and on the diagonals. This one has all eight."
      : `Every cell has up to eight neighbours: across, up, down and on the diagonals. In a corner only ${reads.length} exist.`,
    state: show(plain, { cursor: shown, reads, card: { ink: grid[shown[0]][shown[1]], count: reads.filter((read) => read.live).length, pencil: null } }),
  });
  const firstLive = grid.flatMap((row, r) => row.flatMap((cell, c): LifePos[] => (cell === 1 ? [[r, c]] : [])))[0];
  if (firstLive) {
    const live = liveAround(grid, firstLive);
    frames.push({
      scene: "picture",
      caption: `A live cell lives on with two or three live neighbours. Fewer, or more than three, and it dies. This one sees ${live}, so it ${solved[firstLive[0]][firstLive[1]] === 1 ? "lives on" : "dies"}.`,
      state: show(plain, { cursor: firstLive, reads: readsOf(grid, firstLive), card: { ink: 1, count: live, pencil: solved[firstLive[0]][firstLive[1]] } }),
    });
  }
  const firstDead = grid.flatMap((row, r) => row.flatMap((cell, c): LifePos[] => (cell === 0 ? [[r, c]] : [])))[0];
  if (firstDead) {
    const live = liveAround(grid, firstDead);
    frames.push({
      scene: "picture",
      caption: `A dead cell comes alive with exactly three live neighbours. Otherwise it stays dead. This one sees ${live}, so it ${solved[firstDead[0]][firstDead[1]] === 1 ? "comes alive" : "stays dead"}.`,
      state: show(plain, { cursor: firstDead, reads: readsOf(grid, firstDead), card: { ink: 0, count: live, pencil: solved[firstDead[0]][firstDead[1]] } }),
    });
  }
  frames.push({
    scene: "picture",
    caption: "All cells change at the same moment, as if from one photo of the board. The goal: the board one step later, changed in place, with no second board.",
    state: show(plain, { side: { title: "one step later", cells: cellsOf(solved) } }),
  });
  return frames;
}

/** Slow but correct: copy the whole board first, then decide every cell from the copy. */
function slowFrames(grid: number[][], solved: number[][], trap: Step | null): Frame[] {
  const total = grid.length * grid[0].length;
  const old: number[][] = [];
  let copied = 0;
  for (const row of grid) {
    const line: number[] = [];
    for (const cell of row) {
      line.push(cell);
      copied++;
    }
    old.push(line);
  }
  const at: LifePos = trap?.pos ?? [grid.length - 1, grid[0].length - 1];
  const index = at[0] * grid[0].length + at[1];
  const partly = grid.map((row, r) => row.map((cell, c) => (r * grid[0].length + c < index ? solved[r][c] : cell)));
  const live = liveAround(old, at);
  return [
    {
      scene: "slow",
      caption: `The plain way: first copy the whole board, one cell at a time. That is ${copied} extra cell${copied === 1 ? "" : "s"} to keep.`,
      state: show(cellsOf(grid), { side: { title: "the copy", cells: cellsOf(old) }, counter: { label: "cells copied", value: copied } }),
    },
    {
      scene: "slow",
      caption: `Then decide each cell from the copy and write its new state straight into the board. ${Where(at)} reads ${count(live)} in the copy, which never changes.`,
      state: show(cellsOf(partly), { cursor: at, side: { title: "the copy", cells: cellsOf(old), reads: readsOf(old, at) }, counter: { label: "cells copied", value: copied } }),
    },
    {
      scene: "slow",
      caption: `Same answer, one step later. But a second board of ${total} cells sat in memory the whole time: O(m × n) extra space, when the task asked for in place.`,
      state: show(cellsOf(solved), { side: { title: "the copy", cells: cellsOf(old), faded: true }, counter: { label: "cells copied", value: copied } }),
    },
  ];
}

function insightFrames(grid: number[][], done: Run): Frame[] {
  const first = done.steps.find((step) => step.pencil !== step.ink) ?? null;
  const trap = done.trap;
  const frames: Frame[] = [];
  if (first) {
    const atOnce = copy(grid);
    atOnce[first.pos[0]][first.pos[1]] = first.pencil;
    frames.push({
      scene: "insight",
      caption: `Go cell by cell, in reading order. ${Where(first.pos)} is the first cell that changes: it ${first.pencil === 1 ? "comes alive" : "dies"}. Suppose we write that ${first.pencil} into it at once.`,
      state: show(cellsOf(atOnce), { mark: { cells: [first.pos], tone: "coral", label: "coral: written at once" } }),
    });
  } else {
    frames.push({ scene: "insight", caption: "Go cell by cell, in reading order. On this board no cell changes, so writing each answer at once happens to be safe.", state: show(cellsOf(grid)) });
  }
  if (trap) {
    const changed = changedBefore(grid, trap);
    const one = changed[0];
    frames.push({
      scene: "insight",
      caption: `${Where(trap.pos)} has not been decided yet. It needs the old ${grid[one[0]][one[1]]} at ${where(one)}, but now finds a ${trap.wrongBoard[one[0]][one[1]]}. It reads ${trap.wrongCount}, not ${trap.count}.`,
      state: show(cellsOf(trap.wrongBoard), {
        cursor: trap.pos,
        reads: readsOf(trap.wrongBoard, trap.pos),
        card: { ink: trap.ink, count: trap.wrongCount, pencil: null },
        mark: { cells: changed, tone: "coral", label: "coral: written at once" },
        wrong: true,
      }),
    });
  } else {
    frames.push({
      scene: "insight",
      caption: "Here nothing goes wrong, because no later cell needs a changed value. On most boards a later neighbour would read the new value and count wrong.",
      state: show(cellsOf(grid)),
    });
  }
  const shown = first ?? done.steps[0];
  const pencilled = cellsOf(grid, (r, c) => (same([r, c], shown.pos) ? shown.pencil : null));
  frames.push({
    scene: "insight",
    caption: "A cell is only ever 0 or 1, but a number has room for more. Picture each cell written in ink, with a corner for a pencil note.",
    state: show(pencilled, { showPencil: true }),
  });
  const reader = trap ?? shown;
  frames.push({
    scene: "insight",
    caption: "Ink is the old state and never changes during the pass. Pencil is the new state. Neighbours read only the ink; at the very end, the pencil goes over into ink.",
    state: show(pencilled, { showPencil: true, cursor: reader.pos, reads: reader.reads, card: { ink: reader.ink, count: reader.count, pencil: null } }),
  });
  return frames;
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh board:
 * the reader decides every cell, and says what a cell reads from a neighbour that already changed.
 */
function solutionFrames(grid: number[][], scene: SceneId = "solution", practice = false): Frame[] {
  const done = run(grid);
  const rows = grid.length;
  const cols = grid[0].length;
  const board = cellsOf(grid);
  const line = (index: number) => (practice ? undefined : index);
  const asked = new Set<string>();
  const base = (extra: Partial<LifeGridState> = {}) => show(board, { showPencil: true, ...extra });
  const frames: Frame[] = [];
  let bitsShown = false;
  let inkStillCountsShown = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new board of ${rows} rows and ${cols} columns. You decide every cell, in reading order. Every cell starts with an empty pencil corner.`
      : `The board is ${rows} by ${cols}. Every cell holds its old state in ink, and its pencil corner is still empty.`,
    codeLine: line(LINE.size),
    state: base(),
  });

  for (const step of done.steps) {
    const [r, c] = step.pos;
    const kind = `${step.ink}-${step.pencil}`;
    const isTrap = done.trap !== null && same(done.trap.pos, step.pos);
    const quiz = practice || !asked.has(kind) ? decideQuiz(step) : undefined;
    asked.add(kind);
    const twoFrames = practice || quiz !== undefined || isTrap || r === 0;
    // A neighbour already decided differently from its ink: the moment the trap bites.
    const changed = step.reads.map((read) => read.pos).find(([nr, nc]) => board[nr][nc].pencil !== null && board[nr][nc].pencil !== board[nr][nc].ink) ?? null;

    if (practice && isTrap && changed) {
      frames.push({
        scene,
        caption: `${Where(step.pos)} comes next. Look at its neighbour at ${where(changed)}: the pencil there says ${board[changed[0]][changed[1]].pencil}, the ink still says ${board[changed[0]][changed[1]].ink}.`,
        state: base({ cursor: step.pos, mark: { cells: [changed], tone: "teal", label: "teal: ink and pencil differ" } }),
        quiz: readQuiz(step, changed, board[changed[0]][changed[1]]),
      });
    }

    const countState = base({ cursor: step.pos, reads: step.reads, card: { ink: step.ink, count: step.count, pencil: null } });
    const counted = `${Where(step.pos)} is ${liveWord(step.ink)} in ink and reads ${count(step.count)}.`;
    if (twoFrames) {
      let caption = counted;
      if (changed && !practice && (!inkStillCountsShown || isTrap)) {
        inkStillCountsShown = true;
        caption = `${counted} The ${board[changed[0]][changed[1]].ink} at ${where(changed)} still counts as ${liveWord(board[changed[0]][changed[1]].ink)}: only its pencil says ${board[changed[0]][changed[1]].pencil}.`;
      } else if (changed && isTrap) {
        caption = `The ink: ${count(step.count)}. Writing the new value too early would make this cell read ${step.wrongCount} and ${outcome(step.ink, step.wrongPencil)} by mistake.`;
      } else if (r === 0 && c === 0 && !practice) {
        caption = `Start at ${where(step.pos)}, ${liveWord(step.ink)} in ink. It is in a corner, so only ${step.reads.length} neighbours exist. Their ink shows ${count(step.count)}.`;
      } else if (practice) {
        caption = `Now ${where(step.pos)}. Read its neighbours' ink: ${count(step.count)}.`;
      }
      frames.push({ scene, caption, codeLine: line(LINE.count), state: countState, quiz });
      board[r][c].pencil = step.pencil;
      frames.push({
        scene,
        caption: `${verdict(step)} Pencil ${step.pencil}. The ink stays ${step.ink}.`,
        codeLine: line(LINE.decide),
        state: base({ cursor: step.pos, reads: step.reads, card: { ink: step.ink, count: step.count, pencil: step.pencil } }),
      });
    } else {
      board[r][c].pencil = step.pencil;
      frames.push({
        scene,
        caption: `${counted} ${verdict(step)} Pencil ${step.pencil}.`,
        codeLine: line(LINE.decide),
        state: base({ cursor: step.pos, reads: step.reads, card: { ink: step.ink, count: step.count, pencil: step.pencil } }),
      });
    }

    if (!practice && !bitsShown && step.pencil === 1) {
      bitsShown = true;
      frames.push({
        scene,
        caption: `In the code the pencil is bit 1, worth 2. This cell now stores ink plus pencil: ${step.ink} plus 2 is ${step.ink + 2}. Neighbours will read only the ink.`,
        codeLine: LINE.decide,
        state: base({ cursor: step.pos, reads: step.reads, card: { ink: step.ink, count: step.count, pencil: step.pencil } }),
      });
    }

    if (!practice && isTrap) {
      const early = changedBefore(grid, step);
      const one = early[0];
      const differs = step.wrongPencil !== step.pencil;
      frames.push({
        scene,
        caption: `Writing the new value too early: if ${where(one)} were already inked ${step.wrongBoard[one[0]][one[1]]}, this cell would read ${step.wrongCount}, not ${step.count}${differs ? `, and ${outcome(step.ink, step.wrongPencil)} by mistake` : ""}.`,
        codeLine: LINE.count,
        state: show(cellsOf(step.wrongBoard), {
          cursor: step.pos,
          reads: readsOf(step.wrongBoard, step.pos),
          card: { ink: step.ink, count: step.wrongCount, pencil: differs ? step.wrongPencil : null },
          mark: { cells: early, tone: "coral", label: "coral: inked too early" },
          wrong: true,
        }),
      });
      frames.push({
        scene,
        caption: "So the ink stays put for the whole pass. The new state lives in pencil only, and every cell counts the true old board.",
        codeLine: LINE.count,
        state: base({ cursor: step.pos, reads: step.reads, card: { ink: step.ink, count: step.count, pencil: step.pencil } }),
      });
    }
  }

  frames.push({
    scene,
    caption: practice ? "Every cell is decided. The board holds the old states in ink and your new states in pencil." : "Every cell is decided. The board holds both states at once: the old in ink, the new in pencil.",
    codeLine: line(LINE.shift),
    state: base(),
  });
  const shifted = cellsOf(done.result);
  frames.push({
    scene,
    caption: "Now go over each pencil in ink. The old ink is dropped, and the pencil digit becomes the cell's only state. In the code, that is the shift.",
    codeLine: line(LINE.shift),
    state: show(shifted),
  });
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${fmt(done.result)}. You decided every cell yourself.` : `One step later, in place. The answer is ${fmt(done.result)}.`,
    codeLine: line(LINE.answer),
    state: show(shifted),
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(m × n). Each of the ${rows * cols} cells read its neighbours once, ${done.looks} looks in all, then was inked once. That is a fixed amount of work per cell.`,
      codeLine: LINE.cell,
      state: show(shifted, { counter: { label: "neighbour looks", value: done.looks } }),
    });
    frames.push({
      scene,
      caption: "Space: O(1). Ink and pencil share one number in each cell, so both states live inside the board itself. No second board.",
      codeLine: LINE.alive,
      state: base(),
    });
  }
  return frames;
}

export const gameOfLifeStory: ProblemStory<LifeGridState> = {
  slugs: ["lc-289"],
  pattern: "Matrix, state in spare bits",
  trigger: "every cell changes at the same moment, and you must update the grid in place",
  insight: "Each cell keeps its old state in bit 0 (ink) and gets its new state in bit 1 (pencil). Neighbours read only the ink; at the end, shift every cell right by one.",
  metaphor: {
    name: "Ink and pencil",
    legend: "ink = bit 0, the old state (cell & 1) · pencil = bit 1, the new state (|= 2) · pencil goes over into ink = >>= 1",
    terms: ["ink", "pencil"],
  },
  traps: [
    {
      name: "Writing the new value too early",
      rule: "If a new state is written straight into the board, later cells count that new value as a neighbour. Keep the old state in bit 0 and always read neighbours with cell & 1.",
    },
  ],
  template: [
    "for each cell (r, c):",
    "    live = number of neighbours whose OLD state is 1   // read bit 0 only",
    "    if the cell is live next turn: set bit 1            // never touch bit 0",
    "for each cell (r, c): shift right by one               // bit 1 becomes the state",
  ],
  complexity: {
    slow: "O(m × n), plus a second board of O(m × n) space",
    time: "O(m × n)",
    timeWhy: "each cell reads its eight neighbours once, then is shifted once: a fixed amount of work per cell",
    space: "O(1)",
    spaceWhy: "both states live in each cell's own number; only a few counters are extra",
  },
  code: CODE,
  examples: [
    { label: "[[0,1,0],[0,0,1],[1,1,1],[0,0,0]]", input: "[[0,1,0],[0,0,1],[1,1,1],[0,0,0]]", expected: "[[0,0,0],[1,0,1],[0,1,1],[0,1,0]]" },
    { label: "[[1,1],[1,0]]", input: "[[1,1],[1,0]]", expected: "[[1,1],[1,1]]", note: "The dead corner has exactly three live neighbours" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-73", title: "Set Matrix Zeroes" },
    { slug: "lc-48", title: "Rotate Image" },
    { slug: "lc-994", title: "Rotting Oranges" },
  ],
  answer: (input) => fmt(solve(parse(input))),
  frames: (input) => {
    const grid = parse(input);
    const solved = solve(grid);
    const done = run(grid);
    const remember = done.trap ?? done.steps.find((step) => step.pencil !== step.ink) ?? done.steps[0];
    return [
      ...pictureFrames(grid, solved),
      ...slowFrames(grid, solved, done.trap),
      ...insightFrames(grid, done),
      ...solutionFrames(grid),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: show(
          cellsOf(grid, (r, c) => done.steps[r * grid[0].length + c].pencil),
          { showPencil: true, cursor: remember.pos, reads: remember.reads, card: { ink: remember.ink, count: remember.count, pencil: remember.pencil } },
        ),
      },
    ];
  },
  View: LifeGridView,
};
