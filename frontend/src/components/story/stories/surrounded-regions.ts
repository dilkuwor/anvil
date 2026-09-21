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

const PRACTICE = '[["X","X","X"],["X","O","X"],["X","X","X"]]';
const TRAP = "The Border Flipping Trap";

const CODE = [
  "public void solve(char[][] board) {",
  "    int rows = board.length;",
  "    int cols = board[0].length;",
  "    for (int r = 0; r < rows; r++) {",
  "        keep(board, r, 0);",
  "        keep(board, r, cols - 1);",
  "    }",
  "    for (int c = 0; c < cols; c++) {",
  "        keep(board, 0, c);",
  "        keep(board, rows - 1, c);",
  "    }",
  "    for (int r = 0; r < rows; r++) {",
  "        for (int c = 0; c < cols; c++) {",
  "            if (board[r][c] == 'O') board[r][c] = 'X';",
  "            else if (board[r][c] == '#') board[r][c] = 'O';",
  "        }",
  "    }",
  "}",
  "",
  "private void keep(char[][] board, int r, int c) {",
  "    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return;",
  "    if (board[r][c] != 'O') return;",
  "    board[r][c] = '#';",
  "    keep(board, r + 1, c);",
  "    keep(board, r - 1, c);",
  "    keep(board, r, c + 1);",
  "    keep(board, r, c - 1);",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "block", label: "fortress wall (X)" },
  { mark: "open", label: "open ground (O)" },
  { mark: "source", label: "safe border ground" },
  { mark: "fresh", label: "safe pathway" },
  { mark: "taken", label: "captured wall" },
];

function parseBoard(input: string): string[][] {
  try {
    const raw = input.trim();
    const jsonStr = raw.startsWith("[") ? raw : raw.match(/\[[\s\S]*\]/)?.[0] ?? "";
    const parsed = JSON.parse(jsonStr) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === "string") {
        return (parsed as string[]).map((row) => row.split(""));
      }
      if (Array.isArray(parsed[0])) {
        return parsed as string[][];
      }
    }
  } catch {
    // fallback
  }
  return [
    ["X", "X", "X", "X"],
    ["X", "O", "O", "X"],
    ["X", "X", "O", "X"],
    ["X", "O", "X", "X"],
  ];
}

function cloneBoard(b: string[][]): string[][] {
  return b.map((row) => [...row]);
}

function solveBoard(board: string[][]): string[][] {
  const g = cloneBoard(board);
  const rows = g.length;
  const cols = g[0].length;

  function dfs(r: number, c: number): void {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (g[r][c] !== "O") return;
    g[r][c] = "#";
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }

  for (let r = 0; r < rows; r++) {
    dfs(r, 0);
    dfs(r, cols - 1);
  }
  for (let c = 0; c < cols; c++) {
    dfs(0, c);
    dfs(rows - 1, c);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (g[r][c] === "O") g[r][c] = "X";
      else if (g[r][c] === "#") g[r][c] = "O";
    }
  }
  return g;
}

function answerText(input: string): string {
  const b = parseBoard(input);
  return JSON.stringify(solveBoard(b));
}

function renderCells(
  grid: string[][],
  tones: Map<string, FieldTone>,
): FieldCell[][] {
  return grid.map((row, r) =>
    row.map((ch, c) => {
      const key = `${r},${c}`;
      const tone = tones.get(key) ?? (ch === "X" ? "block" : "open");
      return { text: ch, tone };
    }),
  );
}

function pictureFrames(): Frame[] {
  const demoGrid = [
    ["X", "X", "X"],
    ["X", "O", "X"],
    ["X", "X", "X"],
  ];
  const tones = new Map<string, FieldTone>();
  return [
    {
      scene: "picture",
      caption: "A grid represents a fortress: X cells are stone walls, and O cells are open ground.",
      state: {
        cells: renderCells(demoGrid, tones),
        legend: LEGEND,
        status: { text: "fortress and open ground", tone: "ink" },
      },
    },
    {
      scene: "picture",
      caption: "Any open ground surrounded on all four sides by walls is trapped and captured into stone.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [1, 1],
        legend: LEGEND,
        status: { text: "enclosed ground is captured", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "However, ground connected to the outer moat border has an escape route and can never be surrounded.",
      state: {
        cells: renderCells(demoGrid, tones),
        legend: LEGEND,
        status: { text: "border ground is safe", tone: "ink" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const demoGrid = [
    ["X", "X", "X", "X"],
    ["X", "O", "O", "X"],
    ["X", "X", "O", "X"],
    ["X", "O", "X", "X"],
  ];
  const tones = new Map<string, FieldTone>();
  return [
    {
      scene: "slow",
      caption: "The slow way explores every interior patch of open ground to test whether it reaches the boundary.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [1, 1],
        legend: LEGEND,
        status: { text: "testing interior cells", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Searching outward from every interior cell visits the same regions repeatedly, wasting valuable time.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [1, 2],
        legend: LEGEND,
        status: { text: "repeated outward searches", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Reversing the search direction solves it cleanly: flood inward from the border to mark all safe regions at once.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [3, 1],
        legend: LEGEND,
        status: { text: "flood inward from borders", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const demoGrid = [
    ["X", "X", "X", "X"],
    ["X", "O", "O", "X"],
    ["X", "X", "O", "X"],
    ["X", "O", "X", "X"],
  ];
  const tones = new Map<string, FieldTone>();
  tones.set("3,1", "source");
  return [
    {
      scene: "insight",
      caption: "Only ground touching the outer border can escape: flood inward from the border edges, marking safe ground.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [3, 1],
        legend: LEGEND,
        status: { text: "protect border connected ground", tone: "teal" },
      },
    },
    {
      scene: "insight",
      caption: "After marking border safe paths, every remaining open ground is truly surrounded and turns into wall.",
      state: {
        cells: renderCells(demoGrid, tones),
        legend: LEGEND,
        status: { text: "flip untagged interior to wall", tone: "ink" },
      },
    },
  ];
}

function solutionFrames(board: string[][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const g = cloneBoard(board);
  const rows = g.length;
  const cols = g[0].length;
  const tones = new Map<string, FieldTone>();
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 1,
    caption: "Scan the perimeter moat: locate any open ground touching the outer fortress border.",
    state: {
      cells: renderCells(g, tones),
      legend: LEGEND,
      status: { text: "scanning perimeter border", tone: "ink" },
    },
  });

  // Collect border cells
  const borderCells: FieldPos[] = [];
  for (let r = 0; r < rows; r++) {
    if (g[r][0] === "O") borderCells.push([r, 0]);
    if (cols > 1 && g[r][cols - 1] === "O") borderCells.push([r, cols - 1]);
  }
  for (let c = 1; c < cols - 1; c++) {
    if (g[0][c] === "O") borderCells.push([0, c]);
    if (rows > 1 && g[rows - 1][c] === "O") borderCells.push([rows - 1, c]);
  }

  for (const [br, bc] of borderCells) {
    if (g[br][bc] === "O") {
      if (!askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `Can open ground cell (${br}, ${bc}) touching the perimeter moat ever be captured into wall?`,
          options: [
            "no, because border ground touches the outer moat and cannot be surrounded",
            "yes, any ground cell touching a stone wall is captured immediately",
          ],
          answer: 0,
          why: "Border ground has an unblocked escape path into the boundary moat.",
        };

        frames.push({
          scene,
          codeLine: 4,
          caption: "Watch for the border flipping trap: open ground touching the moat can never be surrounded.",
          state: {
            cells: renderCells(g, tones),
            cursor: [br, bc],
            legend: LEGEND,
            status: { text: "border flipping trap alert", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        tones.set(`${br},${bc}`, "source");
        g[br][bc] = "#";

        frames.push({
          scene,
          codeLine: 22,
          caption: `Protected border cell (${br}, ${bc}) as a safe pathway. It will never flip to wall.`,
          state: {
            cells: renderCells(g, tones),
            cursor: [br, bc],
            legend: LEGEND,
            status: { text: "border ground marked safe", tone: "teal" },
          },
        });
      } else {
        tones.set(`${br},${bc}`, "source");
        g[br][bc] = "#";
      }

      // Spread inward
      const queue: FieldPos[] = [[br, bc]];
      while (queue.length > 0) {
        const [qr, qc] = queue.shift()!;
        const neighbors: FieldPos[] = [
          [qr + 1, qc],
          [qr - 1, qc],
          [qr, qc + 1],
          [qr, qc - 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc] === "O") {
            g[nr][nc] = "#";
            tones.set(`${nr},${nc}`, "fresh");
            queue.push([nr, nc]);
            frames.push({
              scene,
              codeLine: 23,
              caption: `Safe pathway spreads inward to cell (${nr}, ${nc}) through connected ground.`,
              state: {
                cells: renderCells(g, tones),
                cursor: [nr, nc],
                legend: LEGEND,
                status: { text: "spreading safe pathway", tone: "teal" },
              },
            });
          }
        }
      }
    }
  }

  // Scan interior and flip surrounded O to X, and restore # to O
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (g[r][c] === "O") {
        g[r][c] = "X";
        tones.set(`${r},${c}`, "taken");
        frames.push({
          scene,
          codeLine: 13,
          caption: `Cell (${r}, ${c}) has no escape to the moat: surrounded and captured into stone wall.`,
          state: {
            cells: renderCells(g, tones),
            cursor: [r, c],
            legend: LEGEND,
            status: { text: `captured (${r}, ${c})`, tone: "coral" },
          },
        });
      } else if (g[r][c] === "#") {
        g[r][c] = "O";
        tones.set(`${r},${c}`, "source");
      }
    }
  }

  const finalGrid = cloneBoard(g);

  frames.push({
    scene,
    codeLine: 14,
    caption: `Restored all safe pathways. Fortress update finished: the answer is ${JSON.stringify(finalGrid)}.`,
    state: {
      cells: renderCells(finalGrid, tones),
      legend: LEGEND,
      status: { text: "fortress boundaries secured", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 14,
    caption: "Time: O(M × N). Each cell is visited a constant number of times during the border fill and final scan.",
    state: {
      cells: renderCells(finalGrid, tones),
      legend: LEGEND,
      status: { text: "time complexity", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 14,
    caption: "Space: O(M × N). The call stack reaches at most M times N frames during the flood.",
    state: {
      cells: renderCells(finalGrid, tones),
      legend: LEGEND,
      status: { text: "space complexity", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const demoGrid = [
    ["X", "X", "X"],
    ["X", "X", "X"],
    ["X", "X", "X"],
  ];
  const tones = new Map<string, FieldTone>();
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why do we start flood search from the border edges instead of inside the board?",
    options: [
      "any ground touching the perimeter moat is guaranteed safe and cannot be surrounded",
      "starting from the center would turn all exterior walls into water",
    ],
    answer: 0,
    why: "Border-connected cells can never be captured, so identifying them first isolates trapped regions.",
  };

  frames.push({
    scene,
    caption: "Review card: why flood inward from the fortress border moat rather than outward from inside?",
    state: {
      cells: renderCells(demoGrid, tones),
      legend: LEGEND,
      status: { text: "border flood review", tone: "ink" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "After marking border safe paths, what happens to any remaining O ground cells in the grid?",
    options: [
      "they are completely enclosed by walls and must flip into stone walls X",
      "they remain open ground because they were never visited by search",
    ],
    answer: 0,
    why: "Any ground unable to reach a border has no escape route and is completely captured.",
  };

  frames.push({
    scene,
    caption: "Any open ground that failed to reach the border moat is trapped and converts into wall.",
    state: {
      cells: renderCells(demoGrid, tones),
      legend: LEGEND,
      status: { text: "trapped ground converted", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the fortress moat and wall: flood inward from the border, and capture only the trapped interior.",
    state: {
      cells: renderCells(demoGrid, tones),
      legend: LEGEND,
      status: { text: "surrounded regions mastered", tone: "teal" },
    },
  });

  return frames;
}

export const surroundedRegionsStory: ProblemStory<FieldState> = {
  slugs: ["lc-130"],
  pattern: "Boundary flood fill",
  trigger: "Capture all regions that are surrounded by 'X' by flipping them.",
  insight: "Any 'O' connected to the border cannot be surrounded. Flood inward from all border 'O' cells, marking them as safe. Then turn any remaining 'O' into 'X' and restore the safe ones.",
  metaphor: {
    name: "The fortress moat and wall",
    legend: "wall = X cell · open ground = O cell · safe pathway = border connected O · moat = board boundary",
    terms: ["fortress", "wall", "moat", "pathway", "ground", "safe", "capture", "border", "flood", "flip"],
  },
  traps: [{ name: TRAP, rule: "Never flip an 'O' that touches the border or is connected to the border, because it has an escape path." }],
  template: [
    "class Solution:",
    "    void solve(char[][] board): flood inward from border O cells, flip trapped O to X, restore safe cells",
  ],
  complexity: {
    slow: "O((M × N)²)",
    time: "O(M × N)",
    timeWhy: "each cell is visited a constant number of times during the border fill and final scan",
    space: "O(M × N)",
    spaceWhy: "the call stack reaches at most M times N frames during the flood",
  },
  code: CODE,
  examples: [
    {
      label: "4x4 board with border and trapped O",
      input: '[["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]',
      expected: '[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-286", title: "Walls and Gates" },
    { slug: "lc-417", title: "Pacific Atlantic Water Flow" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const board = parseBoard(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(board),
      ...cardFrames(),
    ];
  },
  View: AgyGridsFieldView,
};
