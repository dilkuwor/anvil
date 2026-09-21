import { GrokMatrixSearchView, type MatrixSearchState } from "../grok-matrix-search-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type GridFrame = StoryFrame<MatrixSearchState>;

/** Fresh 3×4 grid. Mapping mid with the row count lands on a different cell than mapping with the column count. */
const PRACTICE = "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]; target=20";
const FALLBACK = { grid: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target: 3 };

const CODE = [
  "int rows = matrix.length, cols = matrix[0].length;",
  "int low = 0, high = rows * cols - 1;",
  "while (low <= high) {",
  "    int mid = low + (high - low) / 2;",
  "    int value = matrix[mid / cols][mid % cols];",
  "    if (value == target) return true;",
  "    if (value < target) low = mid + 1;",
  "    else high = mid - 1;",
  "}",
  "return false;",
];

function parseInput(raw: string): { grid: number[][]; target: number } {
  const rows = [...raw.matchAll(/\[([^[\]]+)\]/g)].map((match) => (match[1].match(/-?\d+/g) ?? []).map(Number)).filter((row) => row.length > 0);
  const target = Number(raw.match(/target\s*=\s*(-?\d+)/)?.[1] ?? "");
  if (rows.length === 0 || Number.isNaN(target)) return FALLBACK;
  return { grid: rows, target };
}

type Step = { low: number; mid: number; high: number; value: number; found: boolean; goRight: boolean; nextLow: number; nextHigh: number };

function at(grid: number[][], index: number): { row: number; col: number; value: number } {
  const cols = grid[0].length;
  const row = Math.floor(index / cols);
  const col = index % cols;
  return { row, col, value: grid[row][col] };
}

function wrongAt(grid: number[][], index: number): { row: number; col: number } | null {
  const rows = grid.length;
  const cols = grid[0].length;
  if (rows === cols) return null;
  const row = Math.floor(index / rows);
  const col = index % rows;
  if (row === Math.floor(index / cols) && col === index % cols) return null;
  if (row < 0 || col < 0 || row >= rows || col >= cols) return { row: Math.min(row, rows - 1), col: Math.min(col, cols - 1) };
  return { row, col };
}

function solve(grid: number[][], target: number): { answer: boolean; steps: Step[] } {
  const cols = grid[0]?.length ?? 0;
  const steps: Step[] = [];
  if (!cols) return { answer: false, steps };
  let low = 0;
  let high = grid.length * cols - 1;
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const value = at(grid, mid).value;
    const found = value === target;
    const goRight = value < target;
    const step: Step = { low, mid, high, value, found, goRight, nextLow: low, nextHigh: high };
    if (found) {
      steps.push(step);
      return { answer: true, steps };
    }
    if (goRight) low = mid + 1;
    else high = mid - 1;
    step.nextLow = low;
    step.nextHigh = high;
    steps.push(step);
  }
  return { answer: false, steps };
}

function answerOf(grid: number[][], target: number): boolean {
  return grid.some((row) => row.includes(target));
}

function blank(grid: number[][], target: number): MatrixSearchState {
  return { grid, target, low: null, high: null, mid: null };
}

function pictureFrames(grid: number[][], target: number, found: boolean): GridFrame[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const flat = rows * cols;
  const last = at(grid, flat - 1);
  return [
    { scene: "picture", caption: `A grid of ${rows} rows and ${cols} columns. Each row is sorted, and the next row starts after this one.`, state: blank(grid, target) },
    {
      scene: "picture",
      caption: `Read left to right, then wrap: ${grid[0][0]} … ${last.value}. The whole grid is one sorted ribbon of ${flat} cells.`,
      state: { ...blank(grid, target), low: 0, high: flat - 1 },
    },
    {
      scene: "picture",
      caption: found
        ? `The target is ${target}. It sits somewhere on that ribbon, so the answer is true.`
        : `The target is ${target}. It is not on the ribbon, so the answer is false.`,
      state: found
        ? { ...blank(grid, target), found: locate(grid, target) }
        : blank(grid, target),
    },
    {
      scene: "picture",
      caption: "The goal: decide true or false after looking at very few cells, even when the grid is huge.",
      state: blank(grid, target),
    },
  ];
}

function locate(grid: number[][], target: number): { row: number; col: number } | undefined {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf(target);
    if (c >= 0) return { row: r, col: c };
  }
  return undefined;
}

function slowFrames(grid: number[][], target: number): GridFrame[] {
  const frames: GridFrame[] = [];
  let looks = 0;
  let found: { row: number; col: number } | null = null;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      looks += 1;
      const hit = grid[r][c] === target;
      if (hit) found = { row: r, col: c };
      if (looks > 2 && !hit && !(r === grid.length - 1 && c === grid[0].length - 1)) continue;
      const skipped = looks > 3;
      let caption: string;
      if (hit) caption = `${skipped ? "And so on, cell by cell. " : ""}The cell ${grid[r][c]} is the target. The slow way needed ${looks} ${looks === 1 ? "look" : "looks"}.`;
      else if (looks === 1) caption = `The slow way: read every cell, left to right, row by row. The first cell is ${grid[0][0]}, not ${target}.`;
      else if (!found && r === grid.length - 1 && c === grid[0].length - 1) caption = `${skipped ? "And so on, to the last cell. " : ""}None of the cells is ${target}. After ${looks} looks the slow way answers false.`;
      else caption = `The next cell is ${grid[r][c]}. Not ${target} either.`;
      frames.push({
        scene: "slow",
        caption,
        state: { ...blank(grid, target), scan: { row: r, col: c }, found: hit ? found : undefined, counter: { label: "cells looked at", value: looks } },
      });
      if (hit) break;
    }
    if (found) break;
  }
  frames.push({
    scene: "slow",
    caption: "At worst it looks at every cell. That is O(m · n) time. It never uses the wrapping ribbon.",
    state: { ...blank(grid, target), counter: { label: "cells looked at", value: looks } },
  });
  return frames;
}

function insightFrames(grid: number[][], target: number): GridFrame[] {
  const cols = grid[0].length;
  const rows = grid.length;
  const mid = Math.floor((rows * cols - 1) / 2);
  const cell = at(grid, mid);
  const wrong = wrongAt(grid, mid);
  return [
    {
      scene: "insight",
      caption: `Treat the grid as one ribbon of ${rows * cols} cells. The middle of that ribbon maps to a cell: row = steps / ${cols}, column = leftover.`,
      state: { ...blank(grid, target), low: 0, high: rows * cols - 1, mid },
    },
    {
      scene: "insight",
      caption: `Here the middle of the ribbon is the cell ${cell.value}. From there, throw away the half that cannot hold ${target}.`,
      state: { ...blank(grid, target), low: 0, high: rows * cols - 1, mid },
    },
    {
      scene: "insight",
      caption: wrong
        ? `The Column Trap: mapping with the row count lands on ${grid[wrong.row][wrong.col]}, not ${cell.value}. Always divide by the number of columns.`
        : `The Column Trap: the map uses the column count, not the row count. A square grid hides the mistake, a wide one does not.`,
      state: { ...blank(grid, target), mid, wrong },
    },
  ];
}

function cellQuiz(grid: number[][], step: Step): StoryQuiz {
  const cols = grid[0].length;
  const rows = grid.length;
  const wrong = wrongAt(grid, step.mid);
  const feedback: Record<number, string> = {};
  for (let index = 0; index < rows * cols; index++) {
    if (index === step.mid) continue;
    if (index < step.low || index > step.high) feedback[index] = "That cell is outside the remaining ribbon.";
    else if (wrong && index === wrong.row * cols + wrong.col) feedback[index] = "That is the Column Trap: that cell is what you get if you map with the row count.";
    else feedback[index] = "The middle of the remaining ribbon is one specific cell. Count halfway from the remaining start.";
  }
  return {
    kind: "cell",
    cells: rows * cols,
    question: "Click the cell at the middle of the remaining ribbon.",
    answer: step.mid,
    feedback,
    otherwise: "Count halfway along the remaining ribbon, then wrap by the number of columns.",
    why: `The middle step maps to row ${at(grid, step.mid).row}, column ${at(grid, step.mid).col}, the cell ${step.value}.`,
  };
}

function solutionFrames(grid: number[][], target: number, scene: SceneId = "solution", practice = false): GridFrame[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const { answer, steps } = solve(grid, target);
  const frames: GridFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let asked = false;
  let shownTrap = false;
  let looks = 0;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new grid. The target is ${target}. You point at the middle of the ribbon.`
      : `The ribbon runs from the first cell to the last, ${rows * cols} cells. The two ends start at the two tips.`,
    codeLine: line(1),
    state: { ...blank(grid, target), low: 0, high: rows * cols - 1 },
  });

  for (const step of steps) {
    looks += 1;
    const cell = at(grid, step.mid);
    const wrong = wrongAt(grid, step.mid);
    const quizFrame: GridFrame = {
      scene,
      caption: `The remaining ribbon runs from step ${step.low} to step ${step.high}. Click its middle cell.`,
      codeLine: line(3),
      state: { ...blank(grid, target), low: step.low, high: step.high },
    };
    if (practice || !asked) {
      asked = true;
      quizFrame.quiz = cellQuiz(grid, step);
    }
    frames.push(quizFrame);

    frames.push({
      scene,
      caption: `That middle is the cell ${cell.value}.`,
      codeLine: line(4),
      state: { ...blank(grid, target), low: step.low, high: step.high, mid: step.mid },
    });

    if (wrong && (practice || !shownTrap)) {
      shownTrap = true;
      frames.push({
        scene,
        caption: `The Column Trap: mapping with the row count would land on ${grid[wrong.row][wrong.col]}. The ribbon wraps by columns, not rows.`,
        codeLine: line(4),
        state: { ...blank(grid, target), low: step.low, high: step.high, mid: step.mid, wrong },
      });
    }

    if (step.found) {
      frames.push({
        scene,
        caption: `${cell.value} is the target. The answer is true.`,
        codeLine: line(5),
        state: { ...blank(grid, target), low: step.low, high: step.high, mid: step.mid, found: { row: cell.row, col: cell.col } },
      });
      break;
    }

    frames.push({
      scene,
      caption: step.goRight
        ? `${cell.value} is smaller than ${target}, so the target can only sit later on the ribbon. The left end jumps past this cell.`
        : `${cell.value} is bigger than ${target}, so the target can only sit earlier on the ribbon. The right end jumps before this cell.`,
      codeLine: line(step.goRight ? 6 : 7),
      state: { ...blank(grid, target), low: step.nextLow, high: step.nextHigh },
    });
  }

  const foundAt = locate(grid, target);
  frames.push({
    scene,
    caption: answer
      ? `${practice ? "Done. " : ""}The ribbon held ${target}. The answer is true.`
      : `${practice ? "Done. " : ""}The two ends crossed and ${target} never showed up. The answer is false.`,
    codeLine: line(answer ? 5 : 9),
    state: { ...blank(grid, target), found: foundAt, counter: { label: "cells looked at", value: looks } },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log(m · n)). The ribbon has ${rows * cols} cells, halved each look: ${looks} ${looks === 1 ? "look" : "looks"} here.`,
      codeLine: 3,
      state: { ...blank(grid, target), found: foundAt, counter: { label: "cells looked at", value: looks } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two ends of the ribbon and the middle step are stored.",
      codeLine: 1,
      state: { ...blank(grid, target), low: 0, high: rows * cols - 1 },
    });
  }
  return frames;
}

export const search2dMatrixStory: ProblemStory<MatrixSearchState> = {
  slugs: ["lc-74"],
  pattern: "Binary search on a flat matrix",
  trigger: "a matrix where each row is sorted and the first of the next row is bigger than the last of this row",
  insight: "The matrix is one sorted row written in wrapping lines. Treat a step along the ribbon as a cell, wrapping by the column count, and search that ribbon.",
  metaphor: {
    name: "The wrapping ribbon",
    legend: "ribbon = the grid read in wrap order · wrap = row = k / cols, column = k % cols · middle = mid",
    terms: ["ribbon", "wrap", "cell", "middle"],
  },
  traps: [
    {
      name: "The Column Trap",
      rule: "A flat index k is row k / cols and column k % cols. Using the row count in that map picks the wrong cell.",
    },
  ],
  template: [
    "low = 0; high = rows * cols - 1;",
    "while (low <= high) {",
    "    mid = left end plus half the gap;",
    "    value = the cell at ribbon step mid;     // row = mid / cols, col = mid % cols",
    "    if (value is the target) return true;",
    "    if (value is too small) low = mid + 1; else high = mid - 1;",
    "}",
    "return false;",
  ],
  complexity: {
    slow: "O(m · n)",
    time: "O(log(m · n))",
    timeWhy: "the flat length is m*n, halved each step",
    space: "O(1)",
    spaceWhy: "only the two search ends",
  },
  code: CODE,
  examples: [
    { label: "target 3", input: "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]; target=3", expected: "true" },
    { label: "target 13", input: "[[1,3,5,7],[10,11,16,20],[23,30,34,60]]; target=13", expected: "false", note: "A miss between 11 and 16" },
    { label: "[[1]], target 1", input: "[[1]]; target=1", expected: "true" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-704", title: "Binary Search" },
    { slug: "lc-34", title: "Find First and Last Position of Element in Sorted Array" },
    { slug: "lc-33", title: "Search in Rotated Sorted Array" },
  ],
  answer: (input) => {
    const { grid, target } = parseInput(input);
    return String(answerOf(grid, target));
  },
  frames: (input) => {
    const { grid, target } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const found = answerOf(grid, target);
    const cols = grid[0].length;
    const mid = Math.floor((grid.length * cols - 1) / 2);
    return [
      ...pictureFrames(grid, target, found),
      ...slowFrames(grid, target),
      ...insightFrames(grid, target),
      ...solutionFrames(grid, target),
      ...solutionFrames(practice.grid, practice.target, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: one wrapping ribbon, mapped by the column count. Say the idea in your head first, then reveal the card.",
        state: { ...blank(grid, target), low: 0, high: grid.length * cols - 1, mid },
      },
    ];
  },
  View: GrokMatrixSearchView,
};
