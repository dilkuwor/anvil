import {
  AgyGridsFieldView,
  type FieldCell,
  type FieldLegendItem,
  type FieldPos,
  type FieldState,
  type FieldTone,
} from "../agy-grids-field-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<FieldState>;

const PRACTICE = "4; fresh";
const TRAP = "The Negative Diagonal Trap";

const CODE = [
  "List<List<String>> solveNQueens(int n) {",
  "    List<List<String>> out = new ArrayList<>();",
  "    int[] queens = new int[n];",
  "    place(0, n, queens, out);",
  "    return out;",
  "}",
  "",
  "void place(int row, int n, int[] queens, List<List<String>> out) {",
  "    if (row == n) {",
  "        out.add(render(queens, n));",
  "        return;",
  "    }",
  "    for (int col = 0; col < n; col++) {",
  "        if (isSafe(row, col, queens)) {",
  "            queens[row] = col;",
  "            place(row + 1, n, queens, out);",
  "        }",
  "    }",
  "}",
  "",
  "boolean isSafe(int row, int col, int[] queens) {",
  "    for (int prev = 0; prev < row; prev++) {",
  "        int prevCol = queens[prev];",
  "        if (prevCol == col || Math.abs(row - prev) == Math.abs(col - prevCol)) {",
  "            return false;",
  "        }",
  "    }",
  "    return true;",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "open", label: "empty square" },
  { mark: "taken", label: "placed queen (Q)" },
  { mark: "front", label: "testing square" },
  { mark: "bad", label: "threatened square" },
];

function parseN(input: string): number {
  const match = input.match(/\d+/);
  return match ? Math.min(4, Math.max(1, parseInt(match[0], 10))) : 4;
}

function solve(n: number): string[][] {
  const out: string[][] = [];
  const queens = new Array<number>(n).fill(-1);

  const isSafe = (row: number, col: number): boolean => {
    for (let prev = 0; prev < row; prev++) {
      const prevCol = queens[prev];
      if (prevCol === col || Math.abs(row - prev) === Math.abs(col - prevCol)) {
        return false;
      }
    }
    return true;
  };

  const render = (): string[] => {
    const board: string[] = [];
    for (let r = 0; r < n; r++) {
      let line = "";
      for (let c = 0; c < n; c++) {
        line += queens[r] === c ? "Q" : ".";
      }
      board.push(line);
    }
    return board;
  };

  const place = (row: number) => {
    if (row === n) {
      out.push(render());
      return;
    }
    for (let col = 0; col < n; col++) {
      if (isSafe(row, col)) {
        queens[row] = col;
        place(row + 1);
        queens[row] = -1;
      }
    }
  };

  place(0);
  return out;
}

function answerText(n: number): string {
  return JSON.stringify(solve(n));
}

function makeBoard(n: number, queens: number[], toneMap: Map<string, FieldTone>): FieldCell[][] {
  const cells: FieldCell[][] = [];
  for (let r = 0; r < n; r++) {
    const row: FieldCell[] = [];
    for (let c = 0; c < n; c++) {
      const isQueen = queens[r] === c;
      row.push({
        text: isQueen ? "Q" : ".",
        tone: isQueen ? "taken" : toneMap.get(`${r},${c}`) ?? "open",
      });
    }
    cells.push(row);
  }
  return cells;
}

function pictureFrames(n: number): Frame[] {
  const toneMap = new Map<string, FieldTone>();
  const solutions = solve(n);
  const sample = solutions[0] ?? [];

  return [
    {
      scene: "picture",
      caption: `We have an ${n} by ${n} chessboard. We must place ${n} queens so that no two queens threaten each other.`,
      state: {
        cells: makeBoard(n, new Array(n).fill(-1), toneMap),
        legend: LEGEND,
        status: { text: `${n} queens to place`, tone: "ink" },
      },
    },
    {
      scene: "picture",
      caption: "A queen threatens every square in its row, column, and diagonal. Each row must hold exactly one queen.",
      state: {
        cells: makeBoard(n, new Array(n).fill(-1), toneMap),
        legend: LEGEND,
        status: { text: "1 queen per row", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: `The goal: find all ${solutions.length} safe arrangements. Here is one complete placement: ${sample.join(", ")}.`,
      state: {
        cells: makeBoard(
          n,
          sample.map((line) => line.indexOf("Q")),
          toneMap,
        ),
        legend: LEGEND,
        status: { text: `${solutions.length} arrangements`, tone: "teal" },
      },
    },
  ];
}

function slowFrames(n: number): Frame[] {
  const totalPossibilities = Math.pow(n, n);
  return [
    {
      scene: "slow",
      caption: `The slow way generates all ${n}^${n} = ${totalPossibilities} ways to place queens, then checks every diagonal.`,
      state: {
        cells: makeBoard(n, new Array(n).fill(-1), new Map()),
        legend: LEGEND,
        counter: { label: "board configurations", value: totalPossibilities },
      },
    },
    {
      scene: "slow",
      caption: "Testing invalid column or diagonal placements wastes massive effort as the chessboard grows.",
      state: {
        cells: makeBoard(n, new Array(n).fill(-1), new Map()),
        legend: LEGEND,
        counter: { label: "threat checks", value: totalPossibilities * n },
      },
    },
    {
      scene: "slow",
      caption: "Placing one queen row by row and checking safety before each step prunes illegal paths instantly.",
      state: {
        cells: makeBoard(n, new Array(n).fill(-1), new Map()),
        legend: LEGEND,
        counter: null,
      },
    },
  ];
}

function insightFrames(n: number): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Since each row must have exactly one queen, advance row by row from row 0 to row n - 1.",
      state: {
        cells: makeBoard(n, new Array(n).fill(-1), new Map()),
        legend: LEGEND,
        note: "advance row by row",
      },
    },
    {
      scene: "insight",
      caption: "In the current row, test each column. If neither column nor diagonal is threatened, place and recurse.",
      state: {
        cells: makeBoard(n, new Array(n).fill(-1), new Map()),
        legend: LEGEND,
        note: "check column & diagonals",
      },
    },
  ];
}

function solutionFrames(n: number): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const toneMap = new Map<string, FieldTone>();
  const queens = new Array<number>(n).fill(-1);

  const push = (
    caption: string,
    codeLine: number,
    cursor?: FieldPos | null,
    note?: string | null,
    quiz?: StoryQuiz,
  ) => {
    frames.push({
      scene,
      codeLine,
      caption,
      state: {
        cells: makeBoard(n, queens, toneMap),
        cursor: cursor ?? null,
        legend: LEGEND,
        status: { text: `${queens.filter((q) => q >= 0).length}/${n} queens placed`, tone: "ink" },
        note: note ?? null,
      },
      quiz,
    });
  };

  push(`We begin with an empty ${n} by ${n} chessboard. We place queens row by row.`, 1, null);
  push("Call place helper starting at row 0.", 3, null);

  let askedPick = false;
  let askedTrap = false;
  let foundCount = 0;

  const isSafe = (row: number, col: number): boolean => {
    for (let prev = 0; prev < row; prev++) {
      const prevCol = queens[prev];
      if (prevCol === col || Math.abs(row - prev) === Math.abs(col - prevCol)) {
        return false;
      }
    }
    return true;
  };

  const place = (row: number) => {
    if (row === n) {
      foundCount++;
      push(`All ${n} queens placed safely. Record this arrangement into the results.`, 9, null, "board completed");
      return;
    }

    if (!askedTrap && row === 1) {
      askedTrap = true;
      const trapQuiz: StoryQuiz = {
        kind: "choice",
        question: "Why must we avoid computing diagonal index as row - col directly in an array?",
        options: [
          "Because col > row produces a negative index that causes array out of bounds",
          "Because diagonals require 2D arrays, not 1D arrays",
          "Because row - col ignores the column number",
        ],
        answer: 0,
        why: "When col is greater than row, row - col is negative. Adding offset n - 1 maps values safely from 0 to 2n - 2.",
      };
      push(
        `${TRAP}: row minus column produces negative values when col > row. Add an offset to keep indices non-negative.`,
        23,
        null,
        "prevent negative index",
        trapQuiz,
      );
      push("Using coordinate difference checks avoids negative index bugs entirely.", 23, null, "diagonal check safe");
    }

    for (let col = 0; col < n; col++) {
      const pos: FieldPos = [row, col];
      const safe = isSafe(row, col);

      if (safe && !askedPick && row === 0 && col === 1) {
        askedPick = true;
        const feedback: Record<number, string> = {};
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (r !== row || c !== col) {
              feedback[r * n + c] = "Pick the open square in row 0 for our queen placement.";
            }
          }
        }
        const pickQuiz: StoryQuiz = {
          kind: "cell",
          cells: n * n,
          question: `Which square in row ${row} should we try for queen placement? Click it.`,
          answer: row * n + col,
          feedback,
          otherwise: "Look for an open square in the top row.",
          why: "Trying this square explores the branch that yields valid 4-queens solutions.",
        };
        push(`Consider row ${row}. Which square do we test next? Click it.`, 12, pos, null, pickQuiz);
      }

      if (safe || row <= 1) {
        toneMap.set(`${row},${col}`, safe ? "front" : "bad");
        push(
          safe
            ? `Square (${row}, ${col}) is safe from column and diagonal attacks.`
            : `Square (${row}, ${col}) is threatened by an existing queen.`,
          safe ? 13 : 24,
          pos,
          safe ? "square safe" : "threatened",
        );
      }

      if (safe) {
        queens[row] = col;
        toneMap.delete(`${row},${col}`);
        push(`Place queen at (${row}, ${col}) and advance to row ${row + 1}.`, 14, pos);

        if (foundCount < 1) {
          place(row + 1);
        }

        queens[row] = -1;
        push(`Un-choose queen at (${row}, ${col}) and restore square to empty.`, 15, pos);
      } else {
        toneMap.delete(`${row},${col}`);
      }
    }
  };

  place(0);

  const allSolutions = solve(n);
  push(
    `All valid arrangements found. The answer is ${JSON.stringify(allSolutions)}.`,
    4,
    null,
  );

  push("Time: O(n!). Placing one queen per row with no collisions yields at most factorial n states.", 4, null);
  push("Space: O(n). The recursion stack and queens array have depth n.", 4, null);

  return frames;
}

function cardFrames(n: number): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why do we only place one queen per row instead of checking any empty square?",
    options: [
      "Because two queens on the same row would threaten each other, so exactly one queen belongs in each row",
      "Because the problem specifies queens cannot move horizontally",
      "Because arrays can only store one dimension",
    ],
    answer: 0,
    why: "Since no two queens can share a row and there are n queens for n rows, each row must have exactly one queen.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "How do we test whether two queens share a diagonal?",
    options: [
      "Math.abs(row1 - row2) == Math.abs(col1 - col2)",
      "row1 + col1 == row2 + col2 only",
      "row1 - col1 == row2 - col2 only",
    ],
    answer: 0,
    why: "Diagonal slopes are +1 and -1, meaning row difference equals column difference in absolute value.",
  };

  frames.push({
    scene,
    caption: "When solving N-Queens, think of a royal guard with one queen assigned per row.",
    state: {
      cells: makeBoard(n, new Array(n).fill(-1), new Map()),
      legend: LEGEND,
      note: "one queen per row",
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Check column and diagonal safety before each placement to prune invalid paths early.",
    state: {
      cells: makeBoard(n, new Array(n).fill(-1), new Map()),
      legend: LEGEND,
      note: "prune collisions early",
    },
  });

  frames.push({
    scene,
    caption: "Beware negative diagonal indices: compare coordinate differences or add offset n - 1.",
    state: {
      cells: makeBoard(n, new Array(n).fill(-1), new Map()),
      legend: LEGEND,
      note: "avoid negative diagonal index",
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the royal guard: place one per row, check diagonals, un-choose on backtrack.",
    state: {
      cells: makeBoard(n, new Array(n).fill(-1), new Map()),
      legend: LEGEND,
    },
  });

  return frames;
}

export const nQueensStory: ProblemStory<FieldState> = {
  slugs: ["lc-51"],
  pattern: "N-Queens",
  trigger: "place n queens on an n x n chessboard so no two queens threaten each other",
  insight: "Place one queen per row. For each column, check whether column or diagonals are threatened before placing, and un-choose on backtrack.",
  metaphor: {
    name: "The royal guard chessboard",
    legend: "open = empty square · taken = placed queen · front = testing square · bad = threatened square",
    terms: ["royal guard", "queen", "chessboard", "row", "column", "diagonal", "square", "threaten", "un-choose"],
  },
  traps: [{ name: TRAP, rule: "Avoid negative indices when indexing diagonal arrays: add offset n - 1 to r - c, or compare coordinate differences directly." }],
  template: [
    "void place(row, n, queens, out):",
    "    if (row == n) { out.add(render(queens, n)); return; }",
    "    for col from 0 to n - 1:",
    "        if isSafe(row, col, queens):",
    "            queens[row] = col;",
    "            place(row + 1, n, queens, out);",
    "            queens[row] = -1;",
  ],
  complexity: {
    slow: "O(n^n)",
    time: "O(n!)",
    timeWhy: "placing one queen per row with no collisions yields at most n! states",
    space: "O(n)",
    spaceWhy: "the queens array and recursion stack have depth equal to n",
  },
  code: CODE,
  examples: [
    { label: "4", input: "4", expected: JSON.stringify([[".Q..", "...Q", "Q...", "..Q."], ["..Q.", "Q...", "...Q", ".Q.."]]) },
    { label: "1", input: "1", expected: JSON.stringify([["Q"]]) },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-79", title: "Word Search" },
    { slug: "lc-46", title: "Permutations" },
  ],
  answer: (input) => answerText(parseN(input)),
  frames: (input) => {
    const n = parseN(input);
    return [
      ...pictureFrames(n),
      ...slowFrames(n),
      ...insightFrames(n),
      ...solutionFrames(n),
      ...cardFrames(n),
    ];
  },
  View: AgyGridsFieldView,
};
