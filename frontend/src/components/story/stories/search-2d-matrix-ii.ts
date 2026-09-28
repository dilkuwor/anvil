import { StaircaseView, type StairPos, type StaircaseState } from "../rec07-staircase-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StaircaseState>;
type Parsed = { grid: number[][]; target: number };

/** Fresh grid for the "your turn" run. The reader first picks the corner, which is where the trap lives. */
const PRACTICE = "[[2,5,9],[4,8,12],[7,10,15]]\n10";

const CODE = [
  "int row = 0;",
  "int col = matrix[0].length - 1;",
  "while (row < matrix.length && col >= 0) {",
  "    int value = matrix[row][col];",
  "    if (value == target) return true;",
  "    if (value > target) col--;",
  "    else row++;",
  "}",
  "return false;",
];

function parse(input: string): Parsed {
  const [grid, target] = input.trim().split("\n");
  return { grid: JSON.parse(grid) as number[][], target: Number(target) };
}

function blank({ grid, target }: Parsed): StaircaseState {
  return { grid, target, walker: null, rowsGone: 0, colsFrom: null, trail: [] };
}

type Move = { at: StairPos; value: number; result: "found" | "left" | "down" };

/** The real staircase walk, recorded step by step. */
function walk({ grid, target }: Parsed): { moves: Move[]; found: boolean } {
  const moves: Move[] = [];
  let row = 0;
  let col = grid[0].length - 1;
  while (row < grid.length && col >= 0) {
    const value = grid[row][col];
    if (value === target) {
      moves.push({ at: [row, col], value, result: "found" });
      return { moves, found: true };
    }
    moves.push({ at: [row, col], value, result: value > target ? "left" : "down" });
    if (value > target) col--;
    else row++;
  }
  return { moves, found: false };
}

/** Independent check: look at every cell. */
function contains({ grid, target }: Parsed): boolean {
  return grid.some((row) => row.includes(target));
}

function where(grid: number[][], value: number): StairPos | null {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf(value);
    if (c >= 0) return [r, c];
  }
  return null;
}

function pictureFrames(parsed: Parsed): Frame[] {
  const { grid, target } = parsed;
  const rows = grid.length;
  const cols = grid[0].length;
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `This grid has ${rows} rows and ${cols} columns. Each row grows from left to right. Each column grows from top to bottom.`,
      state: blank(parsed),
    },
  ];
  const seam = grid.findIndex((row, r) => r + 1 < rows && row[cols - 1] > grid[r + 1][0]);
  if (seam >= 0) {
    frames.push({
      scene: "picture",
      caption: `But it is not one sorted list. ${grid[seam][cols - 1]} ends a row, and the next row starts with the smaller ${grid[seam + 1][0]}.`,
      state: { ...blank(parsed), mark: { cells: [[seam, cols - 1], [seam + 1, 0]], tone: "coral" } },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The question is yes or no: is ${target} somewhere in the grid?`,
    state: blank(parsed),
  });
  const spot = where(grid, target);
  frames.push({
    scene: "picture",
    caption: spot ? `Here it is, so the answer should be yes. The goal is to find it without looking at every cell.` : `${target} is not in this grid, so the answer should be no. The goal is to prove that without looking at every cell.`,
    state: { ...blank(parsed), mark: spot ? { cells: [spot], tone: "teal" } : null },
  });
  return frames;
}

function slowFrames(parsed: Parsed): Frame[] {
  const { grid, target } = parsed;
  const frames: Frame[] = [];
  const checked: StairPos[] = [];
  let found: StairPos | null = null;
  for (let r = 0; r < grid.length && !found; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      checked.push([r, c]);
      if (grid[r][c] === target) {
        found = [r, c];
        break;
      }
    }
    frames.push({
      scene: "slow",
      caption:
        r === 0
          ? `The slow way: compare every cell with ${target}, row by row. ${found ? `Found it in the first row.` : `The first row does not have it.`}`
          : found
            ? `This row has it. We found ${target}, but only after reading every row above it.`
            : `The next row does not have it either.`,
      state: { ...blank(parsed), checked: [...checked], found, counter: { label: "cells compared", value: checked.length } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That took ${checked.length} comparisons for ${grid.length * grid[0].length} cells. This is O(m · n) time: every cell may be read, and the sorting is never used.`,
    state: { ...blank(parsed), checked: [...checked], found, counter: { label: "cells compared", value: checked.length } },
  });
  return frames;
}

function insightFrames(parsed: Parsed): Frame[] {
  const { grid, target } = parsed;
  const cols = grid[0].length;
  const corner: StairPos = [0, cols - 1];
  const value = grid[0][cols - 1];
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: `Where should we start? The Wrong Corner Trap: at the top-left, moving right and moving down both give bigger numbers. No move goes smaller.`,
      state: { ...blank(parsed), walker: [0, 0], trail: [[0, 0]], wrongCorner: true },
    },
    {
      scene: "insight",
      caption: `Now picture a staircase from the top-right corner, ${value}. Left of it the row gets smaller. Below it the column gets bigger.`,
      state: { ...blank(parsed), walker: corner, trail: [corner] },
    },
  ];
  if (value === target) return frames;
  if (value > target) {
    const below: StairPos[] = grid.map((_, r) => [r, cols - 1] as StairPos).slice(1);
    frames.push({
      scene: "insight",
      caption: `${value} is bigger than ${target}. Everything below ${value} is even bigger, so one look throws away the whole column.`,
      state: { ...blank(parsed), walker: corner, trail: [corner], mark: below.length ? { cells: below, tone: "coral" } : null, colsFrom: cols - 1 },
    });
  } else {
    const left: StairPos[] = grid[0].map((_, c) => [0, c] as StairPos).slice(0, cols - 1);
    frames.push({
      scene: "insight",
      caption: `${value} is smaller than ${target}. Everything left of ${value} is even smaller, so one look throws away the whole row.`,
      state: { ...blank(parsed), walker: corner, trail: [corner], mark: left.length ? { cells: left, tone: "coral" } : null, rowsGone: 1 },
    });
  }
  return frames;
}

function moveQuiz(parsed: Parsed, at: StairPos, value: number, result: "left" | "down"): StoryQuiz | null {
  const { grid, target } = parsed;
  const cols = grid[0].length;
  const [r, c] = at;
  const next: StairPos = result === "left" ? [r, c - 1] : [r + 1, c];
  if (next[0] >= grid.length || next[1] < 0) return null;
  const feedback: Record<number, string> = {};
  if (result === "left" && r + 1 < grid.length) feedback[(r + 1) * cols + c] = `Below ${value} every number is even bigger than ${value}. That moves away from ${target}.`;
  if (result === "down" && c - 1 >= 0) feedback[r * cols + c - 1] = `Left of ${value} every number is even smaller than ${value}. That moves away from ${target}.`;
  return {
    kind: "cell",
    cells: grid.length * cols,
    question: `${value} is ${result === "left" ? "bigger" : "smaller"} than ${target}. Where does the walker step next? Click that cell.`,
    answer: next[0] * cols + next[1],
    feedback,
    otherwise:
      result === "left"
        ? "The walker moves one cell at a time. Which neighbour is smaller than where it stands?"
        : "The walker moves one cell at a time. Which neighbour is bigger than where it stands?",
    why: result === "left" ? `One column left. The whole column under ${value} was too big.` : `One row down. The whole row left of ${value} was too small.`,
  };
}

/** The real walk, one frame per change. `practice` asks at every move and shows no code. */
function solutionFrames(parsed: Parsed, scene: SceneId = "solution", practice = false): Frame[] {
  const { grid, target } = parsed;
  const cols = grid[0].length;
  const { moves, found } = walk(parsed);
  const line = (index: number) => (practice ? undefined : index);
  const frames: Frame[] = [];
  let rowsGone = 0;
  let colsFrom: number | null = null;
  const trail: StairPos[] = [];
  const at = (walker: StairPos | null, extra: Partial<StaircaseState> = {}): StaircaseState => ({
    ...blank(parsed),
    walker,
    rowsGone,
    colsFrom,
    trail: [...trail],
    ...extra,
  });

  const corner: StairPos = [0, cols - 1];
  if (practice) {
    const start: Frame = {
      scene,
      caption: `Your turn, on a new grid. We look for ${target}. First, choose where the walker starts.`,
      state: at(null),
    };
    if (cols > 1) {
      start.quiz = {
        kind: "cell",
        cells: grid.length * cols,
        question: "Which top corner should the walker start in? Click it.",
        answer: cols - 1,
        feedback: { 0: "That is the Wrong Corner Trap. From the top-left both moves go bigger, so a small number there tells you nothing." },
        otherwise: "Start in a top corner, where one move goes smaller and the other goes bigger.",
        why: "The top-right. Left goes smaller and down goes bigger, so every look rules out a row or a column.",
      };
    }
    frames.push(start);
  }
  trail.push(corner);
  frames.push({
    scene,
    caption: practice ? `The walker starts at the top-right, on ${grid[0][cols - 1]}.` : `The walker starts at the top of the staircase: the top-right corner.`,
    codeLine: line(1),
    state: at(corner),
  });

  const asked = { left: false, down: false };
  for (const move of moves) {
    const [r, c] = move.at;
    if (move.result === "found") {
      frames.push({
        scene,
        caption: practice ? `The walker reads ${move.value}. That is ${target}. Done: the answer is yes.` : `The walker reads ${move.value}. That is ${target}, so the answer is true.`,
        codeLine: line(4),
        state: at(move.at, { found: move.at }),
      });
      break;
    }
    const look: Frame = {
      scene,
      caption: `The walker reads ${move.value} and compares it with ${target}.`,
      codeLine: line(3),
      state: at(move.at),
    };
    if (practice || !asked[move.result]) {
      const quiz = moveQuiz(parsed, move.at, move.value, move.result);
      if (quiz) {
        look.quiz = quiz;
        asked[move.result] = true;
      }
    }
    frames.push(look);
    const next: StairPos = move.result === "left" ? [r, c - 1] : [r + 1, c];
    const off = next[0] >= grid.length || next[1] < 0;
    if (move.result === "left") colsFrom = c;
    else rowsGone = r + 1;
    if (!off) trail.push(next);
    frames.push({
      scene,
      caption:
        move.result === "left"
          ? `${move.value} is bigger than ${target}, so its whole column is too big. The walker steps one column left${off ? ", off the grid" : ""}.`
          : `${move.value} is smaller than ${target}, so its whole row is too small. The walker steps one row down${off ? ", off the grid" : ""}.`,
      codeLine: line(move.result === "left" ? 5 : 6),
      state: at(off ? null : next),
    });
  }
  if (!found) {
    frames.push({
      scene,
      caption: practice ? `Every row or column has been thrown away. ${target} is not here: the answer is no.` : `Every row or column has been thrown away, so ${target} is not in the grid. The answer is false.`,
      codeLine: line(8),
      state: at(null),
    });
  }
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(m + n). Each step threw away one row or one column: ${moves.length} looks here, never more than ${grid.length + cols}.`,
      codeLine: 2,
      state: at(found ? moves[moves.length - 1].at : null, { found: found ? moves[moves.length - 1].at : null, counter: { label: "cells compared", value: moves.length } }),
    });
    frames.push({
      scene,
      caption: "Space: O(1). The walker only remembers which row and which column it stands on.",
      codeLine: 0,
      state: at(found ? moves[moves.length - 1].at : null, { found: found ? moves[moves.length - 1].at : null }),
    });
  }
  return frames;
}

export const searchMatrixIIStory: ProblemStory<StaircaseState> = {
  slugs: ["lc-240"],
  pattern: "Staircase search",
  trigger: "a grid where every row and every column is sorted, and you must find one value",
  insight: "Walk down a staircase from the top-right corner. Too big: the whole column below is too big, step left. Too small: the whole row to the left is too small, step down.",
  metaphor: {
    name: "The staircase",
    legend: "walker = (row, col) · step left = col - 1 · step down = row + 1 · thrown away = rows above and columns to the right",
    terms: ["walker", "step", "staircase", "column", "row"],
  },
  traps: [{ name: "The Wrong Corner Trap", rule: "At the top-left both moves make the value bigger, so nothing can be ruled out. Start at the top-right or bottom-left." }],
  template: [
    "stand on a corner where one move goes up and the other goes down;",
    "while (still inside the grid) {",
    "    if (here == target) return found;",
    "    too big ? drop the column : drop the row;",
    "}",
    "return not found;",
  ],
  complexity: {
    slow: "O(m · n)",
    time: "O(m + n)",
    timeWhy: "every step throws away a whole row or a whole column",
    space: "O(1)",
    spaceWhy: "the walker only keeps its row and column",
  },
  code: CODE,
  examples: [
    { label: "5 × 5 grid, find 5", input: "[[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]]\n5", expected: "true" },
    { label: "5 × 5 grid, find 20", input: "[[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]]\n20", expected: "false", note: "Not there: the walker steps off the grid" },
    { label: "2 × 2 grid, find 3", input: "[[1,4],[2,5]]\n3", expected: "false" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-74", title: "Search a 2D Matrix" },
    { slug: "lc-704", title: "Binary Search" },
  ],
  answer: (input) => String(contains(parse(input))),
  frames: (input) => {
    const parsed = parse(input);
    const { moves, found } = walk(parsed);
    const last = moves[moves.length - 1];
    const trail = moves.map((move) => move.at);
    return [
      ...pictureFrames(parsed),
      ...slowFrames(parsed),
      ...insightFrames(parsed),
      ...solutionFrames(parsed),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(parsed),
          walker: found ? last.at : null,
          trail,
          found: found ? last.at : null,
          rowsGone: Math.max(0, ...moves.filter((move) => move.result === "down").map((move) => move.at[0] + 1)),
          colsFrom: moves.some((move) => move.result === "left") ? Math.min(...moves.filter((move) => move.result === "left").map((move) => move.at[1])) : null,
        },
      },
    ];
  },
  View: StaircaseView,
};
