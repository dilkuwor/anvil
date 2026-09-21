import { AgyGridsFieldView, type FieldCell, type FieldLegendItem, type FieldPos, type FieldState, type FieldTone } from "../agy-grids-field-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<FieldState>;

const PRACTICE = "[[1,1,2],[0,1,1],[1,1,1]]";
const FALLBACK = "[[1,1,1],[1,0,1],[1,1,1]]";

const TRAP = "The Cascade Trap";

const CODE = [
  "void setZeroes(int[][] matrix) {",
  "    int rows = matrix.length;",
  "    int cols = matrix[0].length;",
  "    boolean firstRowZero = false;",
  "    boolean firstColZero = false;",
  "    for (int c = 0; c < cols; c++) {",
  "        if (matrix[0][c] == 0) firstRowZero = true;",
  "    }",
  "    for (int r = 0; r < rows; r++) {",
  "        if (matrix[r][0] == 0) firstColZero = true;",
  "    }",
  "    for (int r = 1; r < rows; r++) {",
  "        for (int c = 1; c < cols; c++) {",
  "            if (matrix[r][c] == 0) {",
  "                matrix[r][0] = 0;",
  "                matrix[0][c] = 0;",
  "            }",
  "        }",
  "    }",
  "    for (int r = 1; r < rows; r++) {",
  "        for (int c = 1; c < cols; c++) {",
  "            if (matrix[r][0] == 0 || matrix[0][c] == 0) {",
  "                matrix[r][c] = 0;",
  "            }",
  "        }",
  "    }",
  "    if (firstRowZero) {",
  "        for (int c = 0; c < cols; c++) matrix[0][c] = 0;",
  "    }",
  "    if (firstColZero) {",
  "        for (int r = 0; r < rows; r++) matrix[r][0] = 0;",
  "    }",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "open", label: "unchanged" },
  { mark: "front", label: "scanning cell" },
  { mark: "source", label: "zero pinned" },
  { mark: "fresh", label: "just zeroed" },
  { mark: "bad", label: "cascade trap" },
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

function solve(matrix: number[][]): number[][] {
  const m = cloneGrid(matrix);
  const rows = m.length;
  const cols = m[0].length;
  let firstRowZero = false;
  let firstColZero = false;

  for (let c = 0; c < cols; c++) if (m[0][c] === 0) firstRowZero = true;
  for (let r = 0; r < rows; r++) if (m[r][0] === 0) firstColZero = true;

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (m[r][c] === 0) {
        m[r][0] = 0;
        m[0][c] = 0;
      }
    }
  }

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (m[r][0] === 0 || m[0][c] === 0) {
        m[r][c] = 0;
      }
    }
  }

  if (firstRowZero) for (let c = 0; c < cols; c++) m[0][c] = 0;
  if (firstColZero) for (let r = 0; r < rows; r++) m[r][0] = 0;

  return m;
}

function makeCells(matrix: number[][], toneMap?: Map<string, FieldTone>): FieldCell[][] {
  return matrix.map((row, r) =>
    row.map((val, c) => ({
      text: String(val),
      tone: toneMap?.get(`${r},${c}`) ?? "open",
    })),
  );
}

function pictureFrames(matrix: number[][]): Frame[] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const zeroed = solve(matrix);

  const startTones = new Map<string, FieldTone>();
  matrix.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) startTones.set(`${r},${c}`, "source");
    }),
  );

  const endTones = new Map<string, FieldTone>();
  zeroed.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) endTones.set(`${r},${c}`, "fresh");
    }),
  );

  return [
    {
      scene: "picture",
      caption: `We have a grid of ${rows} rows and ${cols} columns. Wherever a cell contains zero, its entire row and entire column must become zero.`,
      state: { cells: makeCells(matrix, startTones), legend: LEGEND },
    },
    {
      scene: "picture",
      caption: "A single zero wipes out its cross: the full row horizontal line and the full column vertical line.",
      state: { cells: makeCells(matrix, startTones), legend: LEGEND, note: "zero wipes cross" },
    },
    {
      scene: "picture",
      caption: `The goal: modify the grid in place so every affected cell becomes zero. Here is the final result.`,
      state: { cells: makeCells(zeroed, endTones), legend: LEGEND, status: { text: "zeroes applied", tone: "teal" } },
    },
  ];
}

function slowFrames(matrix: number[][]): Frame[] {
  const rows = matrix.length;
  const cols = matrix[0].length;

  const rowZeroes = Array<boolean>(rows).fill(false);
  const colZeroes = Array<boolean>(cols).fill(false);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] === 0) {
        rowZeroes[r] = true;
        colZeroes[c] = true;
      }
    }
  }

  return [
    {
      scene: "slow",
      caption: "The slow way: allocate two extra boolean lists of sizes m and n to record which rows and columns need zeroes.",
      state: { cells: makeCells(matrix), legend: LEGEND, counter: { label: "extra flags", value: rows + cols } },
    },
    {
      scene: "slow",
      caption: `That takes O(m + n) extra memory for the two lists. We can eliminate that memory completely.`,
      state: { cells: makeCells(matrix), legend: LEGEND, counter: { label: "extra flags", value: rows + cols } },
    },
    {
      scene: "slow",
      caption: "The grid already has a first row and first column. We can use those border cells as our bulletin board.",
      state: { cells: makeCells(matrix), legend: LEGEND },
    },
  ];
}

function insightFrames(matrix: number[][]): Frame[] {
  const borderTones = new Map<string, FieldTone>();
  matrix.forEach((row, r) => {
    borderTones.set(`${r},0`, "front");
  });
  matrix[0].forEach((_, c) => {
    borderTones.set(`0,${c}`, "front");
  });

  return [
    {
      scene: "insight",
      caption: "Think of the top row and left column as a border bulletin board where we pin notes about which rows and columns to zero.",
      state: { cells: makeCells(matrix, borderTones), legend: LEGEND, note: "border bulletin board" },
    },
    {
      scene: "insight",
      caption: "When an inner cell holds zero, we pin a zero note onto its row header and its column header on the border.",
      state: { cells: makeCells(matrix, borderTones), legend: LEGEND, note: "pin notes on headers" },
    },
    {
      scene: "insight",
      caption: "We keep two simple flags for the borders themselves, then use the bulletin notes to zero all inner cells in place.",
      state: { cells: makeCells(matrix), legend: LEGEND },
    },
  ];
}

function runAlgorithm(matrix: number[][], practice: boolean, scene: "solution" | "card"): { frames: Frame[] } {
  const frames: Frame[] = [];
  const m = cloneGrid(matrix);
  const rows = m.length;
  const cols = m[0].length;
  const toneMap = new Map<string, FieldTone>();
  const asked = { pick: false, trap: false, order: false };

  let firstRowZero = false;
  let firstColZero = false;

  const push = (caption: string, codeLine: number, cursor?: FieldPos | null, note?: string | null, quiz?: StoryQuiz) => {
    const frame: Frame = {
      scene,
      caption,
      state: {
        cells: makeCells(m, toneMap),
        cursor: cursor ?? null,
        legend: LEGEND,
        status: { text: `row0=${firstRowZero ? "0" : "clean"} col0=${firstColZero ? "0" : "clean"}`, tone: "ink" },
        note: note ?? null,
      },
    };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };

  const colFlagQuiz = (r: number, c: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (row !== r || col !== c) {
          feedback[row * cols + col] = "Check the first column border for any zeroes.";
        }
      }
    }
    return {
      kind: "cell",
      cells: rows * cols,
      question: "Which cell on the border tells us that the first column needs zeroing? Click that cell.",
      answer: r * cols + c,
      feedback,
      otherwise: "Look for the border cell in the first column that holds zero.",
      why: "A zero on the border sets the firstColZero flag to true.",
    };
  };

  const trapQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "What would happen if we zeroed row and column immediately on the first pass?",
    options: [
      "New zeroes would cascade across the grid and wipe out clean cells",
      "It would cause an index error on borders",
      "It would leave non-zero cells untouched",
    ],
    answer: 0,
    why: "Zeroing cells mid-scan creates new zeroes that trigger further zeroing, cascading across the entire grid.",
  });

  const orderQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "When should the first row and first column headers themselves be zeroed?",
    options: [
      "At the very end, after inner cells finish reading the header notes",
      "At the very start before scanning inner cells",
      "Whenever an inner zero is found",
    ],
    answer: 0,
    why: "Zeroing the headers early would wipe out the marker notes needed by the remaining inner cells.",
  });

  // Step 1: check border row and col
  push("Scan the first row to see if it starts with any zero.", 5, null);
  for (let c = 0; c < cols; c++) {
    if (m[0][c] === 0) firstRowZero = true;
    toneMap.set(`0,${c}`, m[0][c] === 0 ? "source" : "front");
  }
  push(`First row scan done: firstRowZero is ${firstRowZero}.`, 6, null);
  for (let c = 0; c < cols; c++) if (m[0][c] !== 0) toneMap.delete(`0,${c}`);

  push("Scan the first column to see if it starts with any zero.", 8, null);
  for (let r = 0; r < rows; r++) {
    const isZero = m[r][0] === 0;
    if (isZero) firstColZero = true;

    if (practice && !asked.pick && isZero && r > 0) {
      asked.pick = true;
      toneMap.set(`${r},0`, "front");
      push("Cell (1, 0) in the first column is zero. Which cell marks that the first column needs zeroing? Click that cell.", 9, [r, 0], null, colFlagQuiz(r, 0));
      toneMap.set(`${r},0`, "source");
      push(`Marked firstColZero as true because cell (${r}, 0) is zero.`, 9, [r, 0], "firstColZero = true");
    } else {
      toneMap.set(`${r},0`, isZero ? "source" : "front");
    }
  }
  push(`First column scan done: firstColZero is ${firstColZero}.`, 9, null);
  for (let r = 0; r < rows; r++) if (m[r][0] !== 0) toneMap.delete(`${r},0`);

  // Step 2: scan inner cells and pin notes
  push("Now scan inner cells. When an inner cell is zero, pin a zero on its row and column headers.", 11, null);

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      toneMap.set(`${r},${c}`, "front");
      if (m[r][c] === 0) {
        toneMap.set(`${r},${c}`, "source");
        m[r][0] = 0;
        m[0][c] = 0;
        toneMap.set(`${r},0`, "source");
        toneMap.set(`0,${c}`, "source");
        push(`Inner cell (${r}, ${c}) is zero. Pinned zero note to header (${r}, 0) and header (0, ${c}).`, 14, [r, c]);
      }
    }
  }
  push("All inner cells scanned. All zero notes are pinned on the border bulletin board.", 13, null);

  // Trap explanation
  const askTrap = practice || !asked.trap;
  if (askTrap) {
    asked.trap = true;
    push(
      `${TRAP}: we only recorded zero notes on this pass. Zeroing rows immediately would cause a cascade.`,
      13,
      null,
      "avoid cascading zeroes",
      practice ? trapQuiz() : undefined,
    );
    push("Recording notes first prevents new zeroes from triggering false cascades.", 13, null, "cascade prevented");
  }

  // Step 3: update inner cells using header notes
  const askOrder = practice || !asked.order;
  if (askOrder) {
    asked.order = true;
    push("Now we apply zeroes to inner cells using the header notes.", 19, null, "inner cells first", practice ? orderQuiz() : undefined);
    push("We update inner cells first, leaving the header rows untouched until the end.", 19, null, "headers untouched");
  } else {
    push("Now update inner cells from row 1 and column 1 using the header notes.", 19, null);
  }

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (m[r][0] === 0 || m[0][c] === 0) {
        m[r][c] = 0;
        toneMap.set(`${r},${c}`, "fresh");
      }
    }
  }
  push("Inner cells updated: any cell whose row or column header had a zero is now zero.", 22, null);

  // Step 4: handle border rows
  if (firstRowZero) {
    for (let c = 0; c < cols; c++) {
      m[0][c] = 0;
      toneMap.set(`0,${c}`, "fresh");
    }
    push("First row originally contained a zero, so fill row 0 with zeroes.", 27, null);
  }

  if (firstColZero) {
    for (let r = 0; r < rows; r++) {
      m[r][0] = 0;
      toneMap.set(`${r},0`, "fresh");
    }
    push("First column originally contained a zero, so fill column 0 with zeroes.", 30, null);
  }

  push(
    practice
      ? "Done: all zeroes set in place."
      : `All zero operations finished. The answer is ${JSON.stringify(m)}.`,
    30,
    null,
  );

  return { frames };
}

export const setMatrixZeroesStory: ProblemStory<FieldState> = {
  slugs: ["lc-73"],
  pattern: "Matrix",
  trigger: "if an element is 0, set its entire row and column to 0 in place",
  insight: "Use the first row and column as marker bulletin boards. Scan inner cells and pin zeroes to headers.",
  metaphor: {
    name: "The border bulletin board",
    legend: "bulletin = first row and col headers · flags = border status · pin = marking a zero on border",
    terms: ["bulletin", "border", "header", "zero", "scan", "row", "col", "cell"],
  },
  traps: [{ name: TRAP, rule: "Only record where the zeroes are on the first pass; set the zeroes on a separate second pass." }],
  template: [
    "void setZeroes(matrix):",
    "    check if first row or first col originally has 0",
    "    for each inner cell (r, c):",
    "        if cell is 0: mark row header matrix[r][0]=0 and col header matrix[0][c]=0",
    "    for each inner cell (r, c):",
    "        if row header or col header is 0: set cell to 0",
    "    if first row had 0: zero first row",
    "    if first col had 0: zero first col",
  ],
  complexity: {
    slow: "O(m × n)",
    time: "O(m × n)",
    timeWhy: "we make constant-time scan passes over the grid cells",
    space: "O(1)",
    spaceWhy: "the grid itself stores the markers, needing only two boolean flags",
  },
  code: CODE,
  examples: [
    { label: "[[1,1,1],[1,0,1],[1,1,1]]", input: "[[1,1,1],[1,0,1],[1,1,1]]", expected: "[[1,0,1],[0,0,0],[1,0,1]]" },
    { label: "[[0,1,2,0],[3,4,5,2],[1,3,1,5]]", input: "[[0,1,2,0],[3,4,5,2],[1,3,1,5]]", expected: "[[0,0,0,0],[0,4,5,0],[0,3,1,0]]" },
    { label: "[[1,2],[3,4]]", input: "[[1,2],[3,4]]", expected: "[[1,2],[3,4]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-48", title: "Rotate Image" },
    { slug: "lc-54", title: "Spiral Matrix" },
  ],
  answer: (input) => JSON.stringify(solve(parseMatrix(input))),
  frames: (input) => {
    const matrix = parseMatrix(input);
    const solution = runAlgorithm(matrix, false, "solution");
    const practiceGrid = parseMatrix(PRACTICE);
    const practiceRun = runAlgorithm(practiceGrid, true, "card");

    const timeFrame: Frame = {
      scene: "solution",
      caption: `Time: O(m × n). A few linear scan passes over the ${matrix.length * matrix[0].length} cells are sufficient.`,
      state: solution.frames[solution.frames.length - 1].state,
    };
    const spaceFrame: Frame = {
      scene: "solution",
      caption: "Space: O(1). The grid's own first row and column serve as memory, using constant extra space.",
      state: solution.frames[solution.frames.length - 1].state,
    };

    return [
      ...pictureFrames(matrix),
      ...slowFrames(matrix),
      ...insightFrames(matrix),
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
