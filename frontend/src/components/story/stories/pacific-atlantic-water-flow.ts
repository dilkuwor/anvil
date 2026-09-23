import {
  AgyGridsFieldView,
  type FieldCell,
  type FieldLegendItem,
  type FieldState,
  type FieldTone,
} from "../agy-grids-field-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<FieldState>;

const PRACTICE = "[[2,1],[1,2]]";
const TRAP = "The Downhill From All Cells Trap";

const CODE = [
  "public List<List<Integer>> pacificAtlantic(int[][] heights) {",
  "    int m = heights.length, n = heights[0].length;",
  "    boolean[][] pacific = new boolean[m][n];",
  "    boolean[][] atlantic = new boolean[m][n];",
  "    for (int r = 0; r < m; r++) {",
  "        climb(heights, r, 0, pacific, heights[r][0]);",
  "        climb(heights, r, n - 1, atlantic, heights[r][n - 1]);",
  "    }",
  "    for (int c = 0; c < n; c++) {",
  "        climb(heights, 0, c, pacific, heights[0][c]);",
  "        climb(heights, m - 1, c, atlantic, heights[m - 1][c]);",
  "    }",
  "    List<List<Integer>> out = new ArrayList<>();",
  "    for (int r = 0; r < m; r++) {",
  "        for (int c = 0; c < n; c++) {",
  "            if (pacific[r][c] && atlantic[r][c]) {",
  "                out.add(List.of(r, c));",
  "            }",
  "        }",
  "    }",
  "    return out;",
  "}",
  "",
  "private void climb(int[][] h, int r, int c, boolean[][] visited, int prev) {",
  "    if (r < 0 || r >= h.length || c < 0 || c >= h[0].length) return;",
  "    if (visited[r][c] || h[r][c] < prev) return;",
  "    visited[r][c] = true;",
  "    climb(h, r - 1, c, visited, h[r][c]);",
  "    climb(h, r + 1, c, visited, h[r][c]);",
  "    climb(h, r, c - 1, visited, h[r][c]);",
  "    climb(h, r, c + 1, visited, h[r][c]);",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "open", label: "mountain peak" },
  { mark: "source", label: "ocean shore" },
  { mark: "fresh", label: "pacific tide" },
  { mark: "done", label: "atlantic tide" },
  { mark: "front", label: "continental divide" },
];

function parseHeights(input: string): number[][] {
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
  return [
    [1, 2, 2, 3, 5],
    [3, 2, 3, 4, 4],
    [2, 4, 5, 3, 1],
    [6, 7, 1, 4, 5],
    [5, 1, 1, 2, 4],
  ];
}

function solvePacificAtlantic(heights: number[][]): number[][] {
  const m = heights.length;
  const n = heights[0].length;
  const pacific = Array.from({ length: m }, () => new Array(n).fill(false));
  const atlantic = Array.from({ length: m }, () => new Array(n).fill(false));

  function climb(r: number, c: number, visited: boolean[][], prev: number): void {
    if (r < 0 || r >= m || c < 0 || c >= n) return;
    if (visited[r][c] || heights[r][c] < prev) return;
    visited[r][c] = true;
    climb(r - 1, c, visited, heights[r][c]);
    climb(r + 1, c, visited, heights[r][c]);
    climb(r, c - 1, visited, heights[r][c]);
    climb(r, c + 1, visited, heights[r][c]);
  }

  for (let r = 0; r < m; r++) {
    climb(r, 0, pacific, heights[r][0]);
    climb(r, n - 1, atlantic, heights[r][n - 1]);
  }
  for (let c = 0; c < n; c++) {
    climb(0, c, pacific, heights[0][c]);
    climb(m - 1, c, atlantic, heights[m - 1][c]);
  }

  const out: number[][] = [];
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (pacific[r][c] && atlantic[r][c]) {
        out.push([r, c]);
      }
    }
  }
  return out;
}

function answerText(input: string): string {
  const h = parseHeights(input);
  return JSON.stringify(solvePacificAtlantic(h));
}

function renderCells(
  heights: number[][],
  pac: boolean[][],
  atl: boolean[][],
): FieldCell[][] {
  return heights.map((row, r) =>
    row.map((elev, c) => {
      const isPac = pac[r]?.[c] ?? false;
      const isAtl = atl[r]?.[c] ?? false;
      const flags: ("tl" | "br")[] = [];
      if (isPac) flags.push("tl");
      if (isAtl) flags.push("br");

      let tone: FieldTone = "open";
      if (isPac && isAtl) tone = "front";
      else if (isPac) tone = "fresh";
      else if (isAtl) tone = "done";

      return {
        text: String(elev),
        tone,
        flags: flags.length > 0 ? flags : undefined,
      };
    }),
  );
}

function pictureFrames(): Frame[] {
  const demo = [
    [1, 2],
    [2, 3],
  ];
  const pac = [
    [false, false],
    [false, false],
  ];
  const atl = [
    [false, false],
    [false, false],
  ];
  return [
    {
      scene: "picture",
      caption: "An island of mountain heights borders the Pacific on top and left, and Atlantic on bottom and right.",
      state: {
        cells: renderCells(demo, pac, atl),
        legend: LEGEND,
        oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
        status: { text: "island elevation map", tone: "ink" },
      },
    },
    {
      scene: "picture",
      caption: "Rain falls on every peak: water flows downhill or to equal heights toward the two ocean shores.",
      state: {
        cells: renderCells(demo, pac, atl),
        cursor: [1, 1],
        legend: LEGEND,
        oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
        status: { text: "rain flows downhill", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "We seek the continental divide: all mountain locations where water can reach both oceans.",
      state: {
        cells: renderCells(demo, pac, atl),
        legend: LEGEND,
        oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
        status: { text: "continental divide crests", tone: "ink" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const demo = [
    [1, 2, 2],
    [3, 2, 3],
    [2, 4, 5],
  ];
  const pac = Array.from({ length: 3 }, () => [false, false, false]);
  const atl = Array.from({ length: 3 }, () => [false, false, false]);
  return [
    {
      scene: "slow",
      caption: "The slow way drops rainwater onto each mountain cell and simulates flow downward to check both shores.",
      state: {
        cells: renderCells(demo, pac, atl),
        cursor: [1, 1],
        legend: LEGEND,
        oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
        status: { text: "simulating from each peak", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Testing downhill paths from hundreds of peaks repeats identical trail journeys again and again.",
      state: {
        cells: renderCells(demo, pac, atl),
        cursor: [0, 1],
        legend: LEGEND,
        oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
        status: { text: "quadratic flow simulation", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Reversing the flood fixes this: start tides at the ocean shores and climb uphill across the slopes.",
      state: {
        cells: renderCells(demo, pac, atl),
        cursor: [0, 0],
        legend: LEGEND,
        oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
        status: { text: "climb uphill from shores", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const demo = [
    [1, 2, 2],
    [3, 2, 3],
    [2, 4, 5],
  ];
  const pac = Array.from({ length: 3 }, () => [false, false, false]);
  const atl = Array.from({ length: 3 }, () => [false, false, false]);
  pac[0][0] = true;
  atl[2][2] = true;
  return [
    {
      scene: "insight",
      caption: "A tide rolls uphill to any neighbor with equal or greater height, marking everywhere that shore can reach.",
      state: {
        cells: renderCells(demo, pac, atl),
        cursor: [0, 0],
        legend: LEGEND,
        oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
        status: { text: "uphill climb from shores", tone: "teal" },
      },
    },
    {
      scene: "insight",
      caption: "Run one tide for the Pacific and one for the Atlantic. Any mountain touched by both tides is on the divide.",
      state: {
        cells: renderCells(demo, pac, atl),
        legend: LEGEND,
        oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
        status: { text: "overlap marks divide", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(heights: number[][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const m = heights.length;
  const n = heights[0].length;
  const pac = Array.from({ length: m }, () => new Array(n).fill(false));
  const atl = Array.from({ length: m }, () => new Array(n).fill(false));
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 2,
    caption: "Set up separate reachability grids for the Pacific tide and Atlantic tide.",
    state: {
      cells: renderCells(heights, pac, atl),
      legend: LEGEND,
      oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
      status: { text: "ocean shore tides ready", tone: "ink" },
    },
  });

  function climb(r: number, c: number, visited: boolean[][], prev: number, oceanName: string): void {
    if (r < 0 || r >= m || c < 0 || c >= n) return;
    if (visited[r][c] || heights[r][c] < prev) return;

    if (!askedTrap) {
      askedTrap = true;
      const trapQuiz: StoryQuiz = {
        kind: "choice",
        question: "Why do we climb uphill from ocean shores rather than rolling downhill from each peak?",
        options: [
          "climbing from shores marks all reachable cells in two passes without repeated searches",
          "peaks cannot be visited directly in graph searches",
        ],
        answer: 0,
        why: "Shore climbs visit each cell at most twice, avoiding repeated quadratic searches from every peak.",
      };

      frames.push({
        scene,
        codeLine: 5,
        caption: "Watch for the downhill from all cells trap: climb uphill from the two ocean shores instead.",
        state: {
          cells: renderCells(heights, pac, atl),
          cursor: [r, c],
          legend: LEGEND,
          oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
          status: { text: "downhill from all cells trap alert", tone: "coral" },
        },
        quiz: trapQuiz,
      });

      visited[r][c] = true;

      frames.push({
        scene,
        codeLine: 26,
        caption: `${oceanName} tide starts at shore (${r}, ${c}) with elevation ${heights[r][c]}.`,
        state: {
          cells: renderCells(heights, pac, atl),
          cursor: [r, c],
          legend: LEGEND,
          oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
          status: { text: `${oceanName} shore registered`, tone: "teal" },
        },
      });
    } else {
      visited[r][c] = true;
      frames.push({
        scene,
        codeLine: 26,
        caption: `${oceanName} tide climbs to mountain (${r}, ${c}) of height ${heights[r][c]}.`,
        state: {
          cells: renderCells(heights, pac, atl),
          cursor: [r, c],
          legend: LEGEND,
          oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
          status: { text: `${oceanName} climbed (${r}, ${c})`, tone: "teal" },
        },
      });
    }

    climb(r - 1, c, visited, heights[r][c], oceanName);
    climb(r + 1, c, visited, heights[r][c], oceanName);
    climb(r, c - 1, visited, heights[r][c], oceanName);
    climb(r, c + 1, visited, heights[r][c], oceanName);
  }

  // Pacific borders: col 0 and row 0
  for (let r = 0; r < m; r++) climb(r, 0, pac, heights[r][0], "Pacific");
  for (let c = 0; c < n; c++) climb(0, c, pac, heights[0][c], "Pacific");

  // Atlantic borders: col n-1 and row m-1
  for (let r = 0; r < m; r++) climb(r, n - 1, atl, heights[r][n - 1], "Atlantic");
  for (let c = 0; c < n; c++) climb(m - 1, c, atl, heights[m - 1][c], "Atlantic");

  const divide: number[][] = [];
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (pac[r][c] && atl[r][c]) {
        divide.push([r, c]);
      }
    }
  }

  frames.push({
    scene,
    codeLine: 16,
    caption: `Both ocean tides merged: continental divide identified at ${divide.length} mountain locations. The answer is ${JSON.stringify(divide)}.`,
    state: {
      cells: renderCells(heights, pac, atl),
      legend: LEGEND,
      oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
      status: { text: "continental divide secured", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 16,
    caption: "Time: O(M × N). Each cell is visited at most twice during the two shore climbs.",
    state: {
      cells: renderCells(heights, pac, atl),
      legend: LEGEND,
      oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
      status: { text: "time complexity", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 16,
    caption: "Space: O(M × N). Two reachability grids and recursion stacks take memory proportional to grid size.",
    state: {
      cells: renderCells(heights, pac, atl),
      legend: LEGEND,
      oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
      status: { text: "space complexity", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const demo = [
    [1, 2],
    [2, 3],
  ];
  const pac = [
    [true, true],
    [true, true],
  ];
  const atl = [
    [true, true],
    [true, true],
  ];
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "When climbing uphill from ocean shores, which neighboring cells can a tide enter?",
    options: [
      "neighbors with equal or greater elevation than the current mountain",
      "only neighbors that have lower height than the shore",
    ],
    answer: 0,
    why: "Reverse flow means water that could flow down to us must originate from equal or higher ground.",
  };

  frames.push({
    scene,
    caption: "Review card: what elevation condition allows a tide to advance during reverse flow?",
    state: {
      cells: renderCells(demo, pac, atl),
      legend: LEGEND,
      oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
      status: { text: "reverse flow rule", tone: "ink" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "How do we confirm that rainwater from a mountain location can reach both oceans?",
    options: [
      "the coordinate must be marked reachable in both the Pacific and Atlantic tide grids",
      "the mountain must be taller than every other cell on the entire island",
    ],
    answer: 0,
    why: "A cell where both ocean reachability grids are true can deliver runoff to both bodies of water.",
  };

  frames.push({
    scene,
    caption: "Only cells marked in both tide grids form the continental divide.",
    state: {
      cells: renderCells(demo, pac, atl),
      legend: LEGEND,
      oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
      status: { text: "intersection of both tides", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the twin tide uphill flood: climb from both ocean shores, and where tides meet is the divide.",
    state: {
      cells: renderCells(demo, pac, atl),
      legend: LEGEND,
      oceans: { topLeft: "Pacific", bottomRight: "Atlantic" },
      status: { text: "pacific atlantic mastered", tone: "teal" },
    },
  });

  return frames;
}

export const pacificAtlanticWaterFlowStory: ProblemStory<FieldState> = {
  slugs: ["lc-417"],
  pattern: "Multi-source BFS",
  trigger: "find all cells from which water can flow to both the Pacific and Atlantic oceans",
  insight: "Reverse the flow: instead of rolling water downhill from every mountain, climb uphill from the ocean shores. Cells that both the Pacific and Atlantic waves reach are the continental divide.",
  metaphor: {
    name: "The twin tide uphill flood",
    legend: "top-left shore = Pacific tide · bottom-right shore = Atlantic tide · height = mountain elevation · divide = reachable by both tides",
    terms: ["tide", "shore", "pacific", "atlantic", "mountain", "elevation", "divide", "uphill", "crest", "ocean"],
  },
  traps: [{ name: TRAP, rule: "Flow uphill from ocean borders rather than searching downhill from every cell individually." }],
  template: [
    "class Solution:",
    "    List<List<Integer>> pacificAtlantic(int[][] heights): climb uphill from Pacific and Atlantic shores, return intersection",
  ],
  complexity: {
    slow: "O((M × N)²)",
    time: "O(M × N)",
    timeWhy: "each cell is visited at most twice during the two shore climbs",
    space: "O(M × N)",
    spaceWhy: "two reachability grids and recursion stacks take memory proportional to grid size",
  },
  code: CODE,
  examples: [
    {
      label: "5x5 island with continental divide peaks",
      input: "[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
      expected: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-130", title: "Surrounded Regions" },
    { slug: "lc-286", title: "Walls and Gates" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const heights = parseHeights(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(heights),
      ...cardFrames(),
    ];
  },
  View: AgyGridsFieldView,
};
