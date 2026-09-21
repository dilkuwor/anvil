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

const PRACTICE = '["ABCE","SFCS","ADEE"]  "CES"';
const TRAP = "The Reused Cell Trap";

const CODE = [
  "boolean exist(char[][] board, String word) {",
  "    int rows = board.length;",
  "    int cols = board[0].length;",
  "    for (int r = 0; r < rows; r++) {",
  "        for (int c = 0; c < cols; c++) {",
  "            if (dfs(board, r, c, word, 0)) return true;",
  "        }",
  "    }",
  "    return false;",
  "}",
  "",
  "boolean dfs(char[][] board, int r, int c, String word, int i) {",
  "    if (i == word.length()) return true;",
  "    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return false;",
  "    if (board[r][c] != word.charAt(i)) return false;",
  "    char temp = board[r][c];",
  "    board[r][c] = '#';",
  "    int[][] dirs = {{0, 1}, {1, 0}, {0, -1}, {-1, 0}};",
  "    for (int[] d : dirs) {",
  "        if (dfs(board, r + d[0], c + d[1], word, i + 1)) return true;",
  "    }",
  "    board[r][c] = temp;",
  "    return false;",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "open", label: "letter cell" },
  { mark: "front", label: "trail path" },
  { mark: "taken", label: "matched letter" },
  { mark: "block", label: "stepped on (#)" },
  { mark: "bad", label: "reused cell trap" },
];

function parseInput(input: string): { grid: string[][]; word: string } {
  try {
    const raw = input.trim();
    const gridMatch = raw.match(/\[[\s\S]*?\]/);
    const wordMatch = raw.slice(gridMatch ? gridMatch[0].length : 0).match(/"([A-Za-z]+)"/);
    if (gridMatch) {
      const parsed = JSON.parse(gridMatch[0]) as unknown[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const grid = parsed.map((row) =>
          typeof row === "string" ? row.split("") : Array.isArray(row) ? row.map(String) : [],
        );
        const word = wordMatch ? wordMatch[1] : "SEE";
        return { grid, word };
      }
    }
  } catch {
    // fallback
  }
  return {
    grid: [
      ["A", "B", "C", "E"],
      ["S", "F", "C", "S"],
      ["A", "D", "E", "E"],
    ],
    word: "ABCCED",
  };
}

function solve(grid: string[][], word: string): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  const board = grid.map((r) => [...r]);

  const dfs = (r: number, c: number, i: number): boolean => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (board[r][c] !== word[i]) return false;
    if (i === word.length - 1) return true;
    const temp = board[r][c];
    board[r][c] = "#";
    const found =
      dfs(r, c + 1, i + 1) ||
      dfs(r + 1, c, i + 1) ||
      dfs(r, c - 1, i + 1) ||
      dfs(r - 1, c, i + 1);
    board[r][c] = temp;
    return found;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }
  return false;
}

function makeCells(grid: string[][], toneMap: Map<string, FieldTone>): FieldCell[][] {
  return grid.map((row, r) =>
    row.map((ch, c) => ({
      text: ch,
      tone: toneMap.get(`${r},${c}`) ?? "open",
    })),
  );
}

function pictureFrames(grid: string[][], word: string): Frame[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const toneMap = new Map<string, FieldTone>();
  const found = solve(grid, word);

  return [
    {
      scene: "picture",
      caption: `We have a ${rows} by ${cols} grid of letters. We search for the word "${word}" across adjacent stepping stones.`,
      state: {
        cells: makeCells(grid, toneMap),
        legend: LEGEND,
        status: { text: `search word: "${word}"`, tone: "ink" },
      },
    },
    {
      scene: "picture",
      caption: `A path moves horizontally or vertically from letter to adjacent letter. The same stepping stone cannot be reused.`,
      state: {
        cells: makeCells(grid, toneMap),
        legend: LEGEND,
        status: { text: `length: ${word.length}`, tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: found
        ? `The goal: verify if the word "${word}" can be spelled continuously along the stepping stone trail.`
        : `The goal: search all starting cells and confirm whether the word "${word}" exists.`,
      state: {
        cells: makeCells(grid, toneMap),
        legend: LEGEND,
        status: { text: found ? "word found" : "word missing", tone: found ? "teal" : "coral" },
      },
    },
  ];
}

function slowFrames(grid: string[][]): Frame[] {
  const rows = grid.length;
  const cols = grid[0].length;
  return [
    {
      scene: "slow",
      caption: "The slow way explores all 4 directions from every cell without pruning mismatches upfront.",
      state: {
        cells: makeCells(grid, new Map()),
        legend: LEGEND,
        counter: { label: "paths explored", value: rows * cols * 4 },
      },
    },
    {
      scene: "slow",
      caption: "Unconstrained branching explores redundant dead ends. Checking character matches early prunes wasteful branches.",
      state: {
        cells: makeCells(grid, new Map()),
        legend: LEGEND,
        counter: { label: "paths explored", value: rows * cols * 16 },
      },
    },
    {
      scene: "slow",
      caption: "Targeted search only branches when the adjacent cell letter matches word[i], stepping only on valid stones.",
      state: {
        cells: makeCells(grid, new Map()),
        legend: LEGEND,
        counter: null,
      },
    },
  ];
}

function insightFrames(grid: string[][]): Frame[] {
  return [
    {
      scene: "insight",
      caption: `When a cell letter matches word[i], mark it with '#' so our trail does not step on it a second time.`,
      state: {
        cells: makeCells(grid, new Map()),
        legend: LEGEND,
        note: "mark visited as '#'",
      },
    },
    {
      scene: "insight",
      caption: "Explore the 4 adjacent neighbors. If none complete the word, un-choose by restoring the original letter.",
      state: {
        cells: makeCells(grid, new Map()),
        legend: LEGEND,
        note: "restore letter on backtrack",
      },
    },
  ];
}

function solutionFrames(grid: string[][], word: string): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const rows = grid.length;
  const cols = grid[0].length;
  const toneMap = new Map<string, FieldTone>();
  const arrows: { from: FieldPos; to: FieldPos; tone: "accent" | "coral" | "teal" }[] = [];

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
        cells: makeCells(grid, toneMap),
        cursor: cursor ?? null,
        arrows: [...arrows],
        legend: LEGEND,
        status: { text: `spelling "${word}"`, tone: "ink" },
        note: note ?? null,
      },
      quiz,
    });
  };

  push("Scan the grid cells row by row to find where the first letter matches.", 3, null);

  let success = false;
  let askedPick = false;
  let askedTrap = false;

  const board = grid.map((r) => [...r]);

  const dfs = (r: number, c: number, i: number): boolean => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (board[r][c] !== word[i]) return false;

    const currentPos: FieldPos = [r, c];
    toneMap.set(`${r},${c}`, "front");
    const orig = board[r][c];
    board[r][c] = "#";

    push(`Letter '${orig}' matches at cell (${r}, ${c}). Put this stepping stone on the path.`, 16, currentPos);

    if (i === word.length - 1) {
      toneMap.set(`${r},${c}`, "taken");
      return true;
    }

    if (!askedTrap && i === 1) {
      askedTrap = true;
      const trapQuiz: StoryQuiz = {
        kind: "choice",
        question: "Why do we temporarily replace the current cell character with '#'?",
        options: [
          "To avoid reusing the same cell twice within this word path",
          "To speed up string comparisons across rows",
          "To remember that the cell is the last letter of the word",
        ],
        answer: 0,
        why: "Replacing with '#' ensures that subsequent recursive steps treat this cell as a mismatch and do not reuse it.",
      };
      push(
        `${TRAP}: replace cell letter with '#' so this stone cannot be reused along the same trail.`,
        16,
        currentPos,
        "prevent cell reuse",
        trapQuiz,
      );
      push("Marking with '#' keeps the trail from circling back on itself.", 16, currentPos, "stone marked");
    }

    const dirs: [number, number][] = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === word[i + 1]) {
        if (!askedPick && i === 0) {
          askedPick = true;
          const feedback: Record<number, string> = {};
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              if (row !== nr || col !== nc) {
                feedback[row * cols + col] = "Check adjacent stepping stones that match the next letter.";
              }
            }
          }
          const nextQuiz: StoryQuiz = {
            kind: "cell",
            cells: rows * cols,
            question: `Which adjacent stepping stone holds the next letter '${word[i + 1]}'? Click it.`,
            answer: nr * cols + nc,
            feedback,
            otherwise: "Look for the adjacent neighbor that matches the next letter.",
            why: "This neighbor matches the next letter along the word trail.",
          };
          push("Which adjacent stepping stone continues the word trail? Click it.", 19, currentPos, null, nextQuiz);
        }

        arrows.push({ from: [r, c], to: [nr, nc], tone: "accent" });
        if (dfs(nr, nc, i + 1)) {
          toneMap.set(`${r},${c}`, "taken");
          return true;
        }
        arrows.pop();
      }
    }

    board[r][c] = orig;
    toneMap.delete(`${r},${c}`);
    push(`Un-choose cell (${r}, ${c}): restore original letter '${orig}'.`, 21, currentPos);
    return false;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === word[0]) {
        push(`Found starting letter '${word[0]}' at cell (${r}, ${c}). Begin depth-first search.`, 5, [r, c]);
        if (dfs(r, c, 0)) {
          success = true;
          break;
        }
      }
    }
    if (success) break;
  }

  push(
    success
      ? `Word "${word}" found along the stepping stone trail. The answer is true.`
      : `No path spells "${word}". The answer is false.`,
    success ? 5 : 8,
    null,
  );

  push("Time: O(m · n · 3^L). From each cell, we branch in at most 3 directions for length L.", 8, null);
  push("Space: O(L). The recursion stack depth matches the word length L.", 8, null);

  return frames;
}

function cardFrames(grid: string[][]): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "How do we prevent using the same cell multiple times on a single word path?",
    options: [
      "Temporarily change the cell to '#' during exploration and restore it on backtrack",
      "Keep a permanent hash set of visited cells across all starting positions",
      "Check if the remaining string has duplicate letters",
    ],
    answer: 0,
    why: "Modifying the board in place with '#' prevents loopbacks while avoiding extra memory allocation.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "Why do we branch in at most 3 directions instead of 4 after the first step?",
    options: [
      "Because the cell we just stepped from is marked '#' and cannot be revisited",
      "Because diagonal moves are not checked",
      "Because the last direction is always out of bounds",
    ],
    answer: 0,
    why: "The previous cell on the path is marked '#', leaving at most 3 available neighbor directions.",
  };

  frames.push({
    scene,
    caption: "When searching for a word in a grid, think of stepping stones along a path.",
    state: {
      cells: makeCells(grid, new Map()),
      legend: LEGEND,
      note: "stepping stone trail",
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Mark visited stones with '#' and restore them on backtrack to keep the board clean.",
    state: {
      cells: makeCells(grid, new Map()),
      legend: LEGEND,
      note: "mark '#' and restore",
    },
  });

  frames.push({
    scene,
    caption: "Prune immediately when a neighbor letter does not match word[i] to keep the search fast.",
    state: {
      cells: makeCells(grid, new Map()),
      legend: LEGEND,
      note: "prune mismatches",
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the stepping stone trail: match letter, mark '#', explore neighbors, and un-choose.",
    state: {
      cells: makeCells(grid, new Map()),
      legend: LEGEND,
    },
  });

  return frames;
}

export const wordSearchStory: ProblemStory<FieldState> = {
  slugs: ["lc-79"],
  pattern: "Grid search",
  trigger: "determine if a word exists in a grid of characters moving horizontally or vertically",
  insight: "Try starting from every matching cell. Step on adjacent letters, mark visited cells with '#', and un-choose on backtrack.",
  metaphor: {
    name: "The stepping stone word trail",
    legend: "open = letter cell · front = current path step · taken = matched letter · block = cell stepped on",
    terms: ["stepping stone", "trail", "path", "letter", "cell", "grid", "step", "un-choose"],
  },
  traps: [{ name: TRAP, rule: "Mark visited cells with a temporary marker character like '#' so the same letter cell is never reused on a single path." }],
  template: [
    "boolean exist(char[][] board, String word):",
    "    for each cell (r, c):",
    "        if dfs(board, r, c, word, 0): return true",
    "    return false",
  ],
  complexity: {
    slow: "O(m · n · 4^L)",
    time: "O(m · n · 3^L)",
    timeWhy: "at each step after the first we explore at most 3 directions since we cannot step backward",
    space: "O(L)",
    spaceWhy: "the recursion stack depth equals the length of the word L",
  },
  code: CODE,
  examples: [
    { label: "ABCCED", input: '["ABCE","SFCS","ADEE"]  "ABCCED"', expected: "true" },
    { label: "SEE", input: '["ABCE","SFCS","ADEE"]  "SEE"', expected: "true" },
    { label: "ABCB", input: '["ABCE","SFCS","ADEE"]  "ABCB"', expected: "false", note: "Requires cell reuse" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-212", title: "Word Search II" },
    { slug: "lc-200", title: "Number of Islands" },
  ],
  answer: (input) => {
    const { grid, word } = parseInput(input);
    return String(solve(grid, word));
  },
  frames: (input) => {
    const { grid, word } = parseInput(input);
    return [
      ...pictureFrames(grid, word),
      ...slowFrames(grid),
      ...insightFrames(grid),
      ...solutionFrames(grid, word),
      ...cardFrames(grid),
    ];
  },
  View: AgyGridsFieldView,
};
