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

const PRACTICE = "[[0,1],[1,1]]";
const TRAP = "The Starting From Ones Trap";

const CODE = [
  "public int[][] updateMatrix(int[][] mat) {",
  "    int m = mat.length, n = mat[0].length;",
  "    int[][] dist = new int[m][n];",
  "    Queue<int[]> queue = new ArrayDeque<>();",
  "    for (int r = 0; r < m; r++) {",
  "        for (int c = 0; c < n; c++) {",
  "            if (mat[r][c] == 0) {",
  "                dist[r][c] = 0;",
  "                queue.add(new int[]{r, c});",
  "            } else {",
  "                dist[r][c] = -1;",
  "            }",
  "        }",
  "    }",
  "    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};",
  "    while (!queue.isEmpty()) {",
  "        int[] curr = queue.poll();",
  "        int r = curr[0], c = curr[1];",
  "        for (int[] d : dirs) {",
  "            int nr = r + d[0], nc = c + d[1];",
  "            if (nr >= 0 && nr < m && nc >= 0 && nc < n && dist[nr][nc] == -1) {",
  "                dist[nr][nc] = dist[r][c] + 1;",
  "                queue.add(new int[]{nr, nc});",
  "            }",
  "        }",
  "    }",
  "    return dist;",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "source", label: "stone splash (0)" },
  { mark: "open", label: "still water (1)" },
  { mark: "front", label: "ripple wave" },
  { mark: "done", label: "nearest distance" },
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
  return [
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 1],
  ];
}

function cloneGrid(g: number[][]): number[][] {
  return g.map((row) => [...row]);
}

function solveMatrix(mat: number[][]): number[][] {
  const m = mat.length;
  const n = mat[0].length;
  const dist = Array.from({ length: m }, () => new Array(n).fill(-1));
  const queue: [number, number][] = [];

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (mat[r][c] === 0) {
        dist[r][c] = 0;
        queue.push([r, c]);
      }
    }
  }

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && dist[nr][nc] === -1) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }

  return dist;
}

function answerText(input: string): string {
  const m = parseMatrix(input);
  return JSON.stringify(solveMatrix(m));
}

function renderCells(
  dist: number[][],
  initial: number[][],
  tones: Map<string, FieldTone>,
): FieldCell[][] {
  return dist.map((row, r) =>
    row.map((val, c) => {
      const key = `${r},${c}`;
      let text = String(val);
      let defaultTone: FieldTone = "done";
      if (val === -1) {
        text = "1";
        defaultTone = "open";
      } else if (initial[r][c] === 0 && val === 0) {
        text = "0";
        defaultTone = "source";
      }
      const tone = tones.get(key) ?? defaultTone;
      return { text, tone };
    }),
  );
}

function pictureFrames(): Frame[] {
  const demo = [
    [0, 1],
    [1, 1],
  ];
  const dist = [
    [0, -1],
    [-1, -1],
  ];
  const tones = new Map<string, FieldTone>();
  return [
    {
      scene: "picture",
      caption: "A pond grid holds stones at 0 and undisturbed water at 1. We want each square's distance to nearest stone.",
      state: {
        cells: renderCells(dist, demo, tones),
        legend: LEGEND,
        status: { text: "pond grid with stones", tone: "ink" },
      },
    },
    {
      scene: "picture",
      caption: "Dropping stones creates ripples in the water that spread outward across neighboring squares ring by ring.",
      state: {
        cells: renderCells(dist, demo, tones),
        cursor: [0, 0],
        legend: LEGEND,
        status: { text: "stone splashes produce ripples", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "The moment a ripple ring touches a water square, the ring layer number is that square's shortest distance.",
      state: {
        cells: renderCells(dist, demo, tones),
        cursor: [0, 1],
        legend: LEGEND,
        status: { text: "nearest ripple distance", tone: "ink" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const demo = [
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 1],
  ];
  const dist = [
    [0, 0, 0],
    [0, -1, 0],
    [-1, -1, -1],
  ];
  const tones = new Map<string, FieldTone>();
  return [
    {
      scene: "slow",
      caption: "The slow way starts a separate search from every single 1 water square, walking outwards hunting for any zero.",
      state: {
        cells: renderCells(dist, demo, tones),
        cursor: [2, 1],
        legend: LEGEND,
        status: { text: "searching from each 1 square", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Searching outward from every water square redundantly walks identical pond paths across the grid.",
      state: {
        cells: renderCells(dist, demo, tones),
        cursor: [2, 0],
        legend: LEGEND,
        status: { text: "redundant water searches", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Multi-source breadth-first search launches ripples from all stone splashes simultaneously in lockstep.",
      state: {
        cells: renderCells(dist, demo, tones),
        cursor: [0, 0],
        legend: LEGEND,
        status: { text: "ripples spread together", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const demo = [
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 1],
  ];
  const dist = [
    [0, 0, 0],
    [0, -1, 0],
    [-1, -1, -1],
  ];
  const tones = new Map<string, FieldTone>();
  return [
    {
      scene: "insight",
      caption: "Collect all 0 stone splashes into the queue at distance 0. Unvisited 1 squares begin marked as unreached.",
      state: {
        cells: renderCells(dist, demo, tones),
        legend: LEGEND,
        status: { text: "seed queue with all zeros", tone: "teal" },
      },
    },
    {
      scene: "insight",
      caption: "When a wave visits an unreached square, set distance to current plus one. First arrival is always minimal.",
      state: {
        cells: renderCells(dist, demo, tones),
        cursor: [1, 1],
        legend: LEGEND,
        status: { text: "first arrival is optimal", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(mat: number[][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const m = mat.length;
  const n = mat[0].length;
  const dist = Array.from({ length: m }, () => new Array(n).fill(-1));
  const queue: FieldPos[] = [];
  const tones = new Map<string, FieldTone>();
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 2,
    caption: "Prepare distance grid: set 0 for stone splashes and mark undisturbed water squares as unreached.",
    state: {
      cells: renderCells(dist, mat, tones),
      legend: LEGEND,
      status: { text: "distance grid prepared", tone: "ink" },
    },
  });

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (mat[r][c] === 0) {
        dist[r][c] = 0;
        queue.push([r, c]);
        tones.set(`${r},${c}`, "source");
      }
    }
  }

  frames.push({
    scene,
    codeLine: 8,
    caption: `Queued all ${queue.length} stone splashes simultaneously. Water ripples prepare to radiate across the pond.`,
    state: {
      cells: renderCells(dist, mat, tones),
      legend: LEGEND,
      status: { text: `${queue.length} zeros in queue`, tone: "teal" },
    },
  });

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const curDist = dist[r][c];

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && dist[nr][nc] === -1) {
        if (!askedTrap) {
          askedTrap = true;
          const trapQuiz: StoryQuiz = {
            kind: "choice",
            question: "Why do we drop ripples from zeros instead of starting search from each one?",
            options: [
              "starting from all zeros together finds every one square's nearest zero in a single pass",
              "water cannot conduct search from one squares",
            ],
            answer: 0,
            why: "Multi-source search from all zeros expands outward once, avoiding quadratic searches from each one.",
          };

          frames.push({
            scene,
            codeLine: 21,
            caption: "Watch for the starting from ones trap: drop ripples from all stone splashes together at once.",
            state: {
              cells: renderCells(dist, mat, tones),
              cursor: [nr, nc],
              legend: LEGEND,
              status: { text: "starting from ones trap alert", tone: "coral" },
            },
            quiz: trapQuiz,
          });

          dist[nr][nc] = curDist + 1;
          tones.set(`${nr},${nc}`, "done");
          queue.push([nr, nc]);

          frames.push({
            scene,
            codeLine: 21,
            caption: `Water square (${nr}, ${nc}) reached by ripple wave: nearest stone distance is ${dist[nr][nc]}.`,
            state: {
              cells: renderCells(dist, mat, tones),
              cursor: [nr, nc],
              legend: LEGEND,
              status: { text: `dist ${dist[nr][nc]} at (${nr}, ${nc})`, tone: "teal" },
            },
          });
          continue;
        }

        dist[nr][nc] = curDist + 1;
        tones.set(`${nr},${nc}`, "done");
        queue.push([nr, nc]);

        frames.push({
          scene,
          codeLine: 21,
          caption: `Ripple reaches water square (${nr}, ${nc}): distance recorded as ${dist[nr][nc]}.`,
          state: {
            cells: renderCells(dist, mat, tones),
            cursor: [nr, nc],
            legend: LEGEND,
            status: { text: `distance ${dist[nr][nc]} computed`, tone: "teal" },
          },
        });
      }
    }
  }

  const finalGrid = cloneGrid(dist);

  frames.push({
    scene,
    codeLine: 26,
    caption: `All pond squares measured to their nearest stone. The answer is ${JSON.stringify(finalGrid)}.`,
    state: {
      cells: renderCells(finalGrid, mat, tones),
      legend: LEGEND,
      status: { text: "all distances computed", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 26,
    caption: "Time: O(M × N). Each cell is visited and written to at most once by the radiating ripples.",
    state: {
      cells: renderCells(finalGrid, mat, tones),
      legend: LEGEND,
      status: { text: "time complexity", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 26,
    caption: "Space: O(M × N). The queue and distance grid store up to M times N cells across the pond.",
    state: {
      cells: renderCells(finalGrid, mat, tones),
      legend: LEGEND,
      status: { text: "space complexity", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const demo = [
    [0, 1],
    [1, 2],
  ];
  const tones = new Map<string, FieldTone>();
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why does multi-source breadth-first search avoid repetitive exploration?",
    options: [
      "it radiates outward from all targets simultaneously so every square is claimed by its nearest source",
      "it deletes distant squares before search starts to save processing time",
    ],
    answer: 0,
    why: "Level by level expansion means the first ripple to hit any square provides its true minimum distance.",
  };

  frames.push({
    scene,
    caption: "Review card: why start water ripples from all stone splashes at distance 0 together?",
    state: {
      cells: renderCells(demo, demo, tones),
      legend: LEGEND,
      status: { text: "multi-source ripple review", tone: "ink" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What value should unvisited one squares hold before ripples reach them?",
    options: [
      "a distinct marker like negative one to differentiate them from confirmed distances",
      "zero so that all cells begin with the same default distance value",
    ],
    answer: 0,
    why: "Using negative one as an unvisited flag prevents re-enqueuing cells and prevents confusion with zero cells.",
  };

  frames.push({
    scene,
    caption: "Unvisited squares start as negative one to distinguish unreached water from zero stone splashes.",
    state: {
      cells: renderCells(demo, demo, tones),
      legend: LEGEND,
      status: { text: "unvisited marker check", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the water ripples from stone splashes: seed all zeros together, and let the waves find every distance.",
    state: {
      cells: renderCells(demo, demo, tones),
      legend: LEGEND,
      status: { text: "01 matrix mastered", tone: "teal" },
    },
  });

  return frames;
}

export const matrix01Story: ProblemStory<FieldState> = {
  slugs: ["lc-542"],
  pattern: "Multi-source BFS",
  trigger: "Find the distance of the nearest 0 for each cell in a binary matrix.",
  insight: "Start from all 0 cells simultaneously with distance 0. Radiate outward level by level: the first wave that enters an unvisited 1 cell gives its true shortest distance.",
  metaphor: {
    name: "The water ripples from stone splashes",
    legend: "stone splash = 0 cell · still water = unvisited 1 cell · ripple layer = distance ring · pond grid = matrix",
    terms: ["stone", "splash", "water", "ripple", "ring", "wave", "pond", "distance", "queue", "nearest"],
  },
  traps: [{ name: TRAP, rule: "Enqueue all 0 cells first and spread outward, rather than launching separate searches from every 1 cell." }],
  template: [
    "class Solution:",
    "    int[][] updateMatrix(int[][] mat): queue all 0s at distance 0, expand ripples outward to unvisited 1s",
  ],
  complexity: {
    slow: "O((M × N)²)",
    time: "O(M × N)",
    timeWhy: "each cell is visited and written to at most once by the radiating ripples",
    space: "O(M × N)",
    spaceWhy: "the queue and distance grid store up to M times N cells across the pond",
  },
  code: CODE,
  examples: [
    {
      label: "3x3 binary matrix with zero borders",
      input: "[[0,0,0],[0,1,0],[1,1,1]]",
      expected: "[[0,0,0],[0,1,0],[1,2,1]]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-286", title: "Walls and Gates" },
    { slug: "lc-417", title: "Pacific Atlantic Water Flow" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const mat = parseMatrix(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(mat),
      ...cardFrames(),
    ];
  },
  View: AgyGridsFieldView,
};
