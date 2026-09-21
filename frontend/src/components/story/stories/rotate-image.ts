import { AgyGridsFieldView, type FieldCell, type FieldLegendItem, type FieldPos, type FieldState, type FieldTone } from "../agy-grids-field-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<FieldState>;

const PRACTICE = "[[5,1,9],[2,4,8],[13,3,6]]";
const FALLBACK = "[[1,2,3],[4,5,6],[7,8,9]]";

const TRAP = "The Double Swap Trap";

const CODE = [
  "void rotate(int[][] matrix) {",
  "    int n = matrix.length;",
  "    for (int r = 0; r < n; r++) {",
  "        for (int c = r + 1; c < n; c++) {",
  "            int temp = matrix[r][c];",
  "            matrix[r][c] = matrix[c][r];",
  "            matrix[c][r] = temp;",
  "        }",
  "    }",
  "    for (int[] row : matrix) {",
  "        for (int left = 0, right = n - 1; left < right; left++, right--) {",
  "            int temp = row[left];",
  "            row[left] = row[right];",
  "            row[right] = temp;",
  "        }",
  "    }",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "open", label: "grid cell" },
  { mark: "front", label: "current pair" },
  { mark: "fresh", label: "just swapped" },
  { mark: "done", label: "in place" },
  { mark: "bad", label: "double swap" },
];

function parseMatrix(input: string): number[][] {
  try {
    const raw = input.trim();
    const jsonStr = raw.startsWith("[") ? raw : raw.match(/\[[\s\S]*\]/)?.[0] ?? "";
    const parsed = JSON.parse(jsonStr) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
      return parsed as number[][];
    }
  } catch {
    // fallback
  }
  return JSON.parse(FALLBACK) as number[][];
}

function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

function solve(grid: number[][]): number[][] {
  const m = cloneGrid(grid);
  const n = m.length;
  for (let r = 0; r < n; r++) {
    for (let c = r + 1; c < n; c++) {
      const t = m[r][c];
      m[r][c] = m[c][r];
      m[c][r] = t;
    }
  }
  for (const row of m) {
    row.reverse();
  }
  return m;
}

function makeCells(grid: number[][], toneMap?: Map<string, FieldTone>): FieldCell[][] {
  return grid.map((row, r) =>
    row.map((val, c) => ({
      text: String(val),
      tone: toneMap?.get(`${r},${c}`) ?? "open",
    })),
  );
}

function pictureFrames(grid: number[][]): Frame[] {
  const n = grid.length;
  const rotated = solve(grid);
  const startCells = makeCells(grid);
  const endCells = makeCells(rotated, new Map(rotated.flatMap((row, r) => row.map((_, c) => [`${r},${c}`, "done" as FieldTone]))));

  return [
    {
      scene: "picture",
      caption: `We have an ${n} by ${n} grid of numbers. We must rotate the entire grid ninety degrees clockwise in place.`,
      state: { cells: startCells, legend: LEGEND },
    },
    {
      scene: "picture",
      caption: "Rotating ninety degrees means each row becomes a column. The top row becomes the right column.",
      state: {
        cells: makeCells(grid, new Map(grid[0].map((_, c) => [`0,${c}`, "front" as FieldTone]))),
        legend: LEGEND,
      },
    },
    {
      scene: "picture",
      caption: `The goal: rearrange every number directly inside the grid with no extra matrix. Here is the final rotated result.`,
      state: { cells: endCells, legend: LEGEND, status: { text: "rotated 90°", tone: "teal" } },
    },
  ];
}

function slowFrames(grid: number[][]): Frame[] {
  const n = grid.length;
  const temp = Array.from({ length: n }, () => Array<number>(n).fill(0));
  let count = 0;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      temp[c][n - 1 - r] = grid[r][c];
      count++;
    }
  }

  const slowCells = makeCells(temp, new Map(temp.flatMap((row, r) => row.map((_, c) => [`${r},${c}`, "fresh" as FieldTone]))));

  return [
    {
      scene: "slow",
      caption: "The slow way: allocate a second grid of the same size and write each cell into its rotated spot.",
      state: { cells: makeCells(grid), legend: LEGEND, counter: { label: "cells copied", value: 0 } },
    },
    {
      scene: "slow",
      caption: `Writing all ${n * n} values into the new grid takes ${count} copy operations and a whole second matrix.`,
      state: { cells: slowCells, legend: LEGEND, counter: { label: "cells copied", value: count } },
    },
    {
      scene: "slow",
      caption: "That uses O(n²) extra memory. We can achieve the exact same rotation in place with zero extra space.",
      state: { cells: slowCells, legend: LEGEND, counter: { label: "cells copied", value: count } },
    },
  ];
}

function insightFrames(grid: number[][]): Frame[] {
  const n = grid.length;
  const diagTones = new Map<string, FieldTone>();
  for (let i = 0; i < n; i++) diagTones.set(`${i},${i}`, "front");

  return [
    {
      scene: "insight",
      caption: "Think of ninety degree rotation as two simple reflections: a diagonal fold followed by a horizontal flip.",
      state: { cells: makeCells(grid), legend: LEGEND },
    },
    {
      scene: "insight",
      caption: "First, fold across the main diagonal. Exchanging cell (r, c) with (c, r) turns all rows into columns.",
      state: { cells: makeCells(grid, diagTones), legend: LEGEND, note: "fold across diagonal" },
    },
    {
      scene: "insight",
      caption: "Second, flip each row from left to right. Doing both turns the entire grid clockwise in place.",
      state: { cells: makeCells(grid), legend: LEGEND, note: "flip rows left to right" },
    },
  ];
}

function runAlgorithm(grid: number[][], practice: boolean, scene: "solution" | "card"): { frames: Frame[]; steps: number } {
  const frames: Frame[] = [];
  const m = cloneGrid(grid);
  const n = m.length;
  let steps = 0;
  const asked = { swap: false, trap: false, flip: false };

  const push = (caption: string, codeLine: number, cursor?: FieldPos | null, tones?: Map<string, FieldTone>, note?: string | null, quiz?: StoryQuiz) => {
    const frame: Frame = {
      scene,
      caption,
      state: {
        cells: makeCells(m, tones),
        cursor: cursor ?? null,
        legend: LEGEND,
        note: note ?? null,
      },
    };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };

  const swapQuiz = (r: number, c: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (row !== c || col !== r) {
          feedback[row * n + col] = "The diagonal fold swaps row and column indices: (r, c) swaps with (c, r).";
        }
      }
    }
    return {
      kind: "cell",
      cells: n * n,
      question: `We fold across the diagonal. Cell (${r}, ${c}) has value ${m[r][c]}. Which cell does it swap with? Click that cell.`,
      answer: c * n + r,
      feedback,
      otherwise: "Swap row and column coordinates: the mirror partner of (r, c) is (c, r).",
      why: "Flipping across the main diagonal exchanges coordinates (r, c) with (c, r).",
    };
  };

  const trapQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "What would happen if the column loop started at 0 instead of r + 1?",
    options: [
      "It would visit pairs twice and swap them back, undoing the fold",
      "It would cause an index out of bounds error",
      "It would reverse the columns vertically",
    ],
    answer: 0,
    why: "Starting at 0 visits every cell pair twice. Swapping twice cancels out and leaves the numbers unchanged.",
  });

  const flipQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "After folding across the diagonal, how do we complete the 90 degree clockwise rotation?",
    options: [
      "Reverse each row horizontally from left to right",
      "Reverse each column vertically from top to bottom",
      "Swap the four outer corners only",
    ],
    answer: 0,
    why: "A diagonal fold turns rows into columns; reversing each row horizontally turns them clockwise.",
  });

  push("Step one: fold across the main diagonal by swapping cell (r, c) with cell (c, r).", 2, null);

  for (let r = 0; r < n; r++) {
    for (let c = r + 1; c < n; c++) {
      steps++;
      const pairTones = new Map<string, FieldTone>();
      pairTones.set(`${r},${c}`, "front");
      pairTones.set(`${c},${r}`, "front");

      const askSwap = (practice || !asked.swap) && r === 0 && c === 1;
      if (askSwap) {
        asked.swap = true;
        push(`Looking at cell (${r}, ${c}) with value ${m[r][c]}. It needs to swap with its diagonal partner.`, 3, [r, c], pairTones, null, swapQuiz(r, c));
      }

      const temp = m[r][c];
      m[r][c] = m[c][r];
      m[c][r] = temp;

      const doneTones = new Map<string, FieldTone>();
      doneTones.set(`${r},${c}`, "fresh");
      doneTones.set(`${c},${r}`, "fresh");

      push(`Swapped (${r}, ${c}) and (${c}, ${r}): values are now ${m[r][c]} and ${m[c][r]}.`, 5, [r, c], doneTones);

      if ((practice || !asked.trap) && r === 0 && c === 1) {
        asked.trap = true;
        const badTones = new Map<string, FieldTone>();
        badTones.set(`${r},${c}`, "bad");
        badTones.set(`${c},${r}`, "bad");
        push(
          `${TRAP}: the column loop starts at r + 1. If it started at 0, we would swap (${c}, ${r}) again and undo the fold.`,
          3,
          [r, c],
          badTones,
          "start column at r + 1",
          practice ? trapQuiz() : undefined,
        );
      }
    }
  }

  const foldedTones = new Map<string, FieldTone>();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) foldedTones.set(`${r},${c}`, "done");
  }
  push("The diagonal fold is complete. All rows have been turned into columns.", 2, null, foldedTones);

  if (n > 1) {
    const askFlip = practice || !asked.flip;
    if (askFlip) {
      asked.flip = true;
      push("Now for step two: we flip each row horizontally to complete the clockwise turn.", 9, null, foldedTones, null, flipQuiz());
      const row0Tones = new Map(foldedTones);
      row0Tones.set("0,0", "front");
      row0Tones.set(`0,${n - 1}`, "front");
      push("Flipping row by row: left and right pointers swap opposite ends.", 10, [0, 0], row0Tones, "flip row 0");
    } else {
      push("Step two: reverse each row horizontally with two pointers.", 9, null);
    }
  }

  for (let r = 0; r < n; r++) {
    let left = 0;
    let right = n - 1;
    while (left < right) {
      steps++;
      const rowTones = new Map<string, FieldTone>();
      rowTones.set(`${r},${left}`, "front");
      rowTones.set(`${r},${right}`, "front");

      const t = m[r][left];
      m[r][left] = m[r][right];
      m[r][right] = t;

      const flipDone = new Map<string, FieldTone>();
      flipDone.set(`${r},${left}`, "fresh");
      flipDone.set(`${r},${right}`, "fresh");

      push(`Row ${r}: swapped left cell ${m[r][left]} with right cell ${m[r][right]}.`, 12, [r, left], flipDone);
      left++;
      right--;
    }
  }

  const allDone = new Map<string, FieldTone>();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) allDone.set(`${r},${c}`, "done");
  }
  push(
    practice
      ? "Done: the grid is rotated 90 degrees clockwise in place."
      : `All rows flipped. The grid is rotated ninety degrees clockwise. The answer is ${JSON.stringify(m)}.`,
    10,
    null,
    allDone,
  );

  return { frames, steps };
}

export const rotateImageStory: ProblemStory<FieldState> = {
  slugs: ["lc-48"],
  pattern: "Matrix",
  trigger: "rotate an n x n grid ninety degrees clockwise in place",
  insight: "Fold across the diagonal by swapping (r, c) with (c, r). Then flip each row horizontally left to right.",
  metaphor: {
    name: "The fold and flip",
    legend: "fold = swap across diagonal · flip = reverse row left to right · cursor = current cell pair",
    terms: ["fold", "flip", "diagonal", "swap", "row", "grid", "cell"],
  },
  traps: [{ name: TRAP, rule: "Start the column loop at r + 1 so each pair across the diagonal is swapped once." }],
  template: [
    "void rotate(matrix):",
    "    // fold across main diagonal",
    "    for r from 0 to n - 1:",
    "        for c from r + 1 to n - 1:",
    "            swap matrix[r][c] with matrix[c][r]",
    "    // flip each row left to right",
    "    for each row in matrix:",
    "        reverse(row)",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n²)",
    timeWhy: "every cell is touched once in the diagonal fold and once in the row flip",
    space: "O(1)",
    spaceWhy: "all swaps happen directly inside the grid using only one temporary variable",
  },
  code: CODE,
  examples: [
    { label: "[[1,2,3],[4,5,6],[7,8,9]]", input: "[[1,2,3],[4,5,6],[7,8,9]]", expected: "[[7,4,1],[8,5,2],[9,6,3]]" },
    { label: "[[1,2],[3,4]]", input: "[[1,2],[3,4]]", expected: "[[3,1],[4,2]]" },
    { label: "[[1]]", input: "[[1]]", expected: "[[1]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-54", title: "Spiral Matrix" },
    { slug: "lc-73", title: "Set Matrix Zeroes" },
  ],
  answer: (input) => JSON.stringify(solve(parseMatrix(input))),
  frames: (input) => {
    const grid = parseMatrix(input);
    const solution = runAlgorithm(grid, false, "solution");
    const practiceGrid = parseMatrix(PRACTICE);
    const practiceRun = runAlgorithm(practiceGrid, true, "card");

    const timeFrame: Frame = {
      scene: "solution",
      caption: `Time: O(n²). Each cell is touched once in the fold and once in the flip, taking ${solution.steps} total swaps.`,
      state: solution.frames[solution.frames.length - 1].state,
    };
    const spaceFrame: Frame = {
      scene: "solution",
      caption: "Space: O(1). Swapping elements directly in place requires constant extra memory.",
      state: solution.frames[solution.frames.length - 1].state,
    };

    return [
      ...pictureFrames(grid),
      ...slowFrames(grid),
      ...insightFrames(grid),
      ...solution.frames,
      timeFrame,
      spaceFrame,
      ...practiceRun.frames,
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: practiceRun.frames[practiceRun.frames.length - 1].state,
      },
    ];
  },
  View: AgyGridsFieldView,
};
