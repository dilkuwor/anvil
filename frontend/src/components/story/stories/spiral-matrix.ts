import { AgyGridsFieldView, type FieldCell, type FieldLegendItem, type FieldPos, type FieldState, type FieldTone } from "../agy-grids-field-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<FieldState>;

const PRACTICE = "[[1,2,3],[4,5,6]]";
const FALLBACK = "[[1,2,3],[4,5,6],[7,8,9]]";

const TRAP = "The Duplicate Sweep Trap";

const CODE = [
  "List<Integer> spiralOrder(int[][] matrix) {",
  "    List<Integer> out = new ArrayList<>();",
  "    if (matrix.length == 0) return out;",
  "    int top = 0;",
  "    int bottom = matrix.length - 1;",
  "    int left = 0;",
  "    int right = matrix[0].length - 1;",
  "    while (top <= bottom && left <= right) {",
  "        for (int c = left; c <= right; c++) {",
  "            out.add(matrix[top][c]);",
  "        }",
  "        top++;",
  "        for (int r = top; r <= bottom; r++) {",
  "            out.add(matrix[r][right]);",
  "        }",
  "        right--;",
  "        if (top <= bottom) {",
  "            for (int c = right; c >= left; c--) {",
  "                out.add(matrix[bottom][c]);",
  "            }",
  "            bottom--;",
  "        }",
  "        if (left <= right) {",
  "            for (int r = bottom; r >= top; r--) {",
  "                out.add(matrix[r][left]);",
  "            }",
  "            left++;",
  "        }",
  "    }",
  "    return out;",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "open", label: "unvisited" },
  { mark: "front", label: "current wall" },
  { mark: "fresh", label: "just read" },
  { mark: "done", label: "collected" },
  { mark: "bad", label: "duplicate" },
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

function solve(matrix: number[][]): number[] {
  const out: number[] = [];
  if (matrix.length === 0) return out;
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(matrix[r][left]);
      left++;
    }
  }
  return out;
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
  const order = solve(matrix);

  return [
    {
      scene: "picture",
      caption: `We are given a grid of numbers with ${rows} rows and ${cols} columns. We must read every number in clockwise spiral order.`,
      state: { cells: makeCells(matrix), legend: LEGEND },
    },
    {
      scene: "picture",
      caption: "Clockwise spiral means walking around the outside perimeter first: right across top, down the right, left across bottom, up the left.",
      state: {
        cells: makeCells(
          matrix,
          new Map(matrix[0].map((_, c) => [`0,${c}`, "front" as FieldTone])),
        ),
        legend: LEGEND,
      },
    },
    {
      scene: "picture",
      caption: `The goal: return a list containing all ${rows * cols} numbers in spiral order. Here the answer is [${order.join(",")}].`,
      state: {
        cells: makeCells(
          matrix,
          new Map(order.map((_, i) => [`${Math.floor(i / cols)},${i % cols}`, "done" as FieldTone])),
        ),
        legend: LEGEND,
        status: { text: "spiral complete", tone: "teal" },
      },
    },
  ];
}

function slowFrames(matrix: number[][]): Frame[] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const seen = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  let r = 0;
  let c = 0;
  let d = 0;
  let checks = 0;

  for (let i = 0; i < rows * cols; i++) {
    seen[r][c] = true;
    checks++;
    const nr = r + dirs[d][0];
    const nc = c + dirs[d][1];
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen[nr][nc]) {
      r = nr;
      c = nc;
    } else {
      d = (d + 1) % 4;
      r += dirs[d][0];
      c += dirs[d][1];
    }
  }

  const slowTones = new Map<string, FieldTone>();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) slowTones.set(`${row},${col}`, "done");
  }

  return [
    {
      scene: "slow",
      caption: "The slow way: allocate a separate boolean grid to mark which boxes have been visited.",
      state: { cells: makeCells(matrix), legend: LEGEND, counter: { label: "cells checked", value: 0 } },
    },
    {
      scene: "slow",
      caption: `At every step we probe ahead and check boundary limits or seen flags, taking ${checks} checks and O(m × n) extra space.`,
      state: { cells: makeCells(matrix, slowTones), legend: LEGEND, counter: { label: "cells checked", value: checks } },
    },
    {
      scene: "slow",
      caption: "We can eliminate the visited matrix completely by maintaining four boundary pointers that shrink inward.",
      state: { cells: makeCells(matrix, slowTones), legend: LEGEND, counter: { label: "cells checked", value: checks } },
    },
  ];
}

function insightFrames(matrix: number[][]): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Picture four fence walls enclosing the unvisited cells: top, bottom, left, and right.",
      state: { cells: makeCells(matrix), legend: LEGEND },
    },
    {
      scene: "insight",
      caption: "We walk along one wall from corner to corner. As soon as a wall is walked, that wall shrinks inward by one.",
      state: { cells: makeCells(matrix), legend: LEGEND, note: "walls shrink inward" },
    },
    {
      scene: "insight",
      caption: "Top moves down, right moves left, bottom moves up, left moves right. We stop when the walls cross.",
      state: { cells: makeCells(matrix), legend: LEGEND, note: "stop when bounds cross" },
    },
  ];
}

function runAlgorithm(matrix: number[][], practice: boolean, scene: "solution" | "card"): { frames: Frame[]; collected: number[] } {
  const frames: Frame[] = [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const out: number[] = [];
  const toneMap = new Map<string, FieldTone>();
  const arrows: { from: FieldPos; to: FieldPos; tone: "accent" | "coral" | "teal" }[] = [];
  let prevPos: FieldPos | null = null;
  const asked = { pick: false, trap: false };

  let top = 0;
  let bottom = rows - 1;
  let left = 0;
  let right = cols - 1;

  const push = (caption: string, codeLine: number, cursor?: FieldPos | null, note?: string | null, quiz?: StoryQuiz) => {
    const frame: Frame = {
      scene,
      caption,
      state: {
        cells: makeCells(matrix, toneMap),
        cursor: cursor ?? null,
        arrows: [...arrows],
        legend: LEGEND,
        counter: { label: "numbers read", value: out.length },
        status: { text: `top=${top} bot=${bottom} left=${left} right=${right}`, tone: "ink" },
        note: note ?? null,
      },
    };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };

  const turnQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "The top wall has reached column right. Which direction does the next wall sweep?",
    options: [
      "Down the right boundary column",
      "Left across the bottom row",
      "Back to the top-left corner",
    ],
    answer: 0,
    why: "In a clockwise spiral, after moving right across the top, the next step turns down along the right wall.",
  });

  const nextCellQuiz = (targetR: number, targetC: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r !== targetR || c !== targetC) {
          feedback[r * cols + c] = "Follow the current wall direction from the previous corner.";
        }
      }
    }
    return {
      kind: "cell",
      cells: rows * cols,
      question: "After walking the right wall downward, where does the bottom wall sweep next? Click that cell.",
      answer: targetR * cols + targetC,
      feedback,
      otherwise: "Sweep leftward along the bottom boundary pointer.",
      why: "The bottom sweep moves from right to left along row bottom.",
    };
  };

  const trapQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "Why must we verify top <= bottom before sweeping the bottom wall?",
    options: [
      "On single-row grids, the top row was already read and top passed bottom",
      "Because negative indices would crash the grid access",
      "To prevent turning counter-clockwise",
    ],
    answer: 0,
    why: "Top increases after the top walk. On single-row grids, top exceeds bottom and sweeping again duplicates cells.",
  });

  push("Set up four boundary walls: top at row 0, bottom at the last row, left at column 0, right at the last column.", 7, null);

  while (top <= bottom && left <= right) {
    // 1. Top wall: left to right
    for (let c = left; c <= right; c++) {
      out.push(matrix[top][c]);
      toneMap.set(`${top},${c}`, "fresh");
      if (prevPos) arrows.push({ from: prevPos, to: [top, c], tone: "teal" });
      prevPos = [top, c];
      push(`Walking top wall rightward: read ${matrix[top][c]} at (${top}, ${c}).`, 9, [top, c]);
      toneMap.set(`${top},${c}`, "done");
    }
    top++;
    push(`Top wall finished. Shrink top boundary downward to row ${top}.`, 11, null);

    const askTurn = practice && out.length === cols;
    if (askTurn) {
      push("The top wall has reached column right. Which direction does the next wall sweep?", 13, null, null, turnQuiz());
      push("Turning down: the next wall sweeps downward along the right boundary column.", 13, [top, right], "turn down");
    }

    // 2. Right wall: top to bottom
    for (let r = top; r <= bottom; r++) {
      out.push(matrix[r][right]);
      toneMap.set(`${r},${right}`, "fresh");
      if (prevPos) arrows.push({ from: prevPos, to: [r, right], tone: "teal" });
      prevPos = [r, right];
      push(`Walking right wall downward: read ${matrix[r][right]} at (${r}, ${right}).`, 13, [r, right]);
      toneMap.set(`${r},${right}`, "done");
    }
    right--;
    push(`Right wall finished. Shrink right boundary leftward to column ${right}.`, 15, null);

    // 3. Bottom wall: right to left (guarded by top <= bottom)
    const askTrapChoice = practice && !asked.trap;
    if (askTrapChoice) {
      asked.trap = true;
      push(
        `${TRAP}: before sweeping the bottom wall, we must check that top <= bottom still holds.`,
        16,
        null,
        "check top <= bottom",
        trapQuiz(),
      );
      push("If top exceeds bottom, all rows have been read and sweeping again would duplicate cells.", 16, null, "skip duplicate sweep");
    }

    if (top <= bottom) {
      const askPick = (practice || !asked.pick) && right >= left;
      if (askPick) {
        asked.pick = true;
        push("Next is the bottom wall, sweeping leftward.", 16, null, null, nextCellQuiz(bottom, right));
      } else {
        push("Check top <= bottom holds, then sweep the bottom wall leftward.", 16, null);
      }

      for (let c = right; c >= left; c--) {
        out.push(matrix[bottom][c]);
        toneMap.set(`${bottom},${c}`, "fresh");
        if (prevPos) arrows.push({ from: prevPos, to: [bottom, c], tone: "teal" });
        prevPos = [bottom, c];
        push(`Walking bottom wall leftward: read ${matrix[bottom][c]} at (${bottom}, ${c}).`, 18, [bottom, c]);
        toneMap.set(`${bottom},${c}`, "done");
      }
      bottom--;
      push(`Bottom wall finished. Shrink bottom boundary upward to row ${bottom}.`, 20, null);
    } else if (!practice) {
      push(`${TRAP}: top has passed bottom. We skip the bottom sweep to avoid reading rows twice.`, 16, null, "check top <= bottom");
    }

    // 4. Left wall: bottom to top (guarded by left <= right)
    if (left <= right) {
      for (let r = bottom; r >= top; r--) {
        out.push(matrix[r][left]);
        toneMap.set(`${r},${left}`, "fresh");
        if (prevPos) arrows.push({ from: prevPos, to: [r, left], tone: "teal" });
        prevPos = [r, left];
        push(`Walking left wall upward: read ${matrix[r][left]} at (${r}, ${left}).`, 24, [r, left]);
        toneMap.set(`${r},${left}`, "done");
      }
      left++;
      push(`Left wall finished. Shrink left boundary rightward to column ${left}.`, 26, null);
    }
  }

  push(
    practice
      ? "Done: all numbers collected in spiral order."
      : `All boundary walls have crossed. The answer is ${JSON.stringify(out)}.`,
    29,
    null,
  );

  return { frames, collected: out };
}

export const spiralMatrixStory: ProblemStory<FieldState> = {
  slugs: ["lc-54"],
  pattern: "Matrix",
  trigger: "read a grid in clockwise spiral order from outside to inside",
  insight: "Keep four boundary walls. Sweep each wall from corner to corner and shrink it inward immediately.",
  metaphor: {
    name: "The shrinking fence",
    legend: "walls = top, bottom, left, right bounds · fence = current path · cursor = walker on path",
    terms: ["wall", "fence", "shrink", "corner", "bounds", "walk", "cell"],
  },
  traps: [{ name: TRAP, rule: "Always check top <= bottom before the bottom walk, and left <= right before the left walk." }],
  template: [
    "List spiralOrder(matrix):",
    "    set top=0, bottom=m-1, left=0, right=n-1",
    "    while top <= bottom and left <= right:",
    "        sweep top wall rightward; top++",
    "        sweep right wall downward; right--",
    "        if top <= bottom: sweep bottom wall leftward; bottom--",
    "        if left <= right: sweep left wall upward; left++",
  ],
  complexity: {
    slow: "O(m × n)",
    time: "O(m × n)",
    timeWhy: "every cell in the grid is visited once and added to the output list",
    space: "O(1)",
    spaceWhy: "only four integer boundary pointers are kept, using constant extra memory",
  },
  code: CODE,
  examples: [
    { label: "[[1,2,3],[4,5,6],[7,8,9]]", input: "[[1,2,3],[4,5,6],[7,8,9]]", expected: "[1,2,3,6,9,8,7,4,5]" },
    { label: "[[1,2,3,4],[5,6,7,8],[9,10,11,12]]", input: "[[1,2,3,4],[5,6,7,8],[9,10,11,12]]", expected: "[1,2,3,4,8,12,11,10,9,5,6,7]" },
    { label: "[[1]]", input: "[[1]]", expected: "[1]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-48", title: "Rotate Image" },
    { slug: "lc-73", title: "Set Matrix Zeroes" },
  ],
  answer: (input) => JSON.stringify(solve(parseMatrix(input))),
  frames: (input) => {
    const matrix = parseMatrix(input);
    const solution = runAlgorithm(matrix, false, "solution");
    const practiceGrid = parseMatrix(PRACTICE);
    const practiceRun = runAlgorithm(practiceGrid, true, "card");

    const timeFrame: Frame = {
      scene: "solution",
      caption: `Time: O(m × n). Every one of the ${matrix.length * matrix[0].length} numbers is visited exactly once.`,
      state: solution.frames[solution.frames.length - 1].state,
    };
    const spaceFrame: Frame = {
      scene: "solution",
      caption: "Space: O(1). Only four integer pointers are maintained as the walls close in.",
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
