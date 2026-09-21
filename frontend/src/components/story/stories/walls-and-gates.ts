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

const INF = 2147483647;
const PRACTICE = '[[0,2147483647],[-1,2147483647]]';
const TRAP = "The Room to Gate Search Trap";

const CODE = [
  "public void wallsAndGates(int[][] rooms) {",
  "    int m = rooms.length;",
  "    int n = rooms[0].length;",
  "    Queue<int[]> queue = new ArrayDeque<>();",
  "    for (int r = 0; r < m; r++) {",
  "        for (int c = 0; c < n; c++) {",
  "            if (rooms[r][c] == 0) queue.add(new int[]{r, c});",
  "        }",
  "    }",
  "    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};",
  "    while (!queue.isEmpty()) {",
  "        int[] curr = queue.poll();",
  "        int r = curr[0], c = curr[1];",
  "        for (int[] d : dirs) {",
  "            int nr = r + d[0], nc = c + d[1];",
  "            if (nr >= 0 && nr < m && nc >= 0 && nc < n && rooms[nr][nc] == Integer.MAX_VALUE) {",
  "                rooms[nr][nc] = rooms[r][c] + 1;",
  "                queue.add(new int[]{nr, nc});",
  "            }",
  "        }",
  "    }",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "source", label: "castle gate (0)" },
  { mark: "block", label: "stone barrier (-1)" },
  { mark: "open", label: "dark chamber (INF)" },
  { mark: "front", label: "lantern glow wave" },
  { mark: "done", label: "shortest distance" },
];

function parseGrid(input: string): number[][] {
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
    [INF, -1, 0, INF],
    [INF, INF, INF, -1],
    [INF, -1, INF, -1],
    [0, -1, INF, INF],
  ];
}

function cloneGrid(g: number[][]): number[][] {
  return g.map((row) => [...row]);
}

function solveGrid(rooms: number[][]): number[][] {
  const g = cloneGrid(rooms);
  const m = g.length;
  const n = g[0].length;
  const queue: [number, number][] = [];

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (g[r][c] === 0) queue.push([r, c]);
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
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && g[nr][nc] === INF) {
        g[nr][nc] = g[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }

  return g;
}

function answerText(input: string): string {
  const g = parseGrid(input);
  return JSON.stringify(solveGrid(g));
}

function renderCells(
  grid: number[][],
  tones: Map<string, FieldTone>,
): FieldCell[][] {
  return grid.map((row, r) =>
    row.map((val, c) => {
      const key = `${r},${c}`;
      let text = String(val);
      let defaultTone: FieldTone = "done";
      if (val === INF) {
        text = "INF";
        defaultTone = "open";
      } else if (val === -1) {
        text = "-1";
        defaultTone = "block";
      } else if (val === 0) {
        text = "0";
        defaultTone = "source";
      }
      const tone = tones.get(key) ?? defaultTone;
      return { text, tone };
    }),
  );
}

function pictureFrames(): Frame[] {
  const demoGrid = [
    [0, INF],
    [-1, INF],
  ];
  const tones = new Map<string, FieldTone>();
  return [
    {
      scene: "picture",
      caption: "In the castle labyrinth, 0 marks a gate, -1 is a stone barrier, and INF is an unlit dark chamber.",
      state: {
        cells: renderCells(demoGrid, tones),
        legend: LEGEND,
        status: { text: "castle labyrinth chambers", tone: "ink" },
      },
    },
    {
      scene: "picture",
      caption: "We want to find the shortest distance from every dark chamber to its closest lantern gate.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [0, 1],
        legend: LEGEND,
        status: { text: "illuminate dark chambers", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "Each step of distance expands outward like a glowing lantern wave moving through open doorways.",
      state: {
        cells: renderCells(demoGrid, tones),
        legend: LEGEND,
        status: { text: "expanding lantern glow", tone: "ink" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const demoGrid = [
    [INF, -1, 0, INF],
    [INF, INF, INF, -1],
    [INF, -1, INF, -1],
    [0, -1, INF, INF],
  ];
  const tones = new Map<string, FieldTone>();
  return [
    {
      scene: "slow",
      caption: "The slow way starts a search from every single dark chamber, hunting across corridors to locate a gate.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [0, 0],
        legend: LEGEND,
        status: { text: "searching from each chamber", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Launching searches from hundreds of separate chambers re-walks the same castle paths over and over.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [1, 0],
        legend: LEGEND,
        status: { text: "repeated corridor exploration", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Multi-source wave search starts from all gates at once, spreading lantern glow together in lockstep.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [0, 2],
        legend: LEGEND,
        status: { text: "expand from all gates together", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const demoGrid = [
    [INF, -1, 0, INF],
    [INF, INF, INF, -1],
    [INF, -1, INF, -1],
    [0, -1, INF, INF],
  ];
  const tones = new Map<string, FieldTone>();
  tones.set("0,2", "source");
  tones.set("3,0", "source");
  return [
    {
      scene: "insight",
      caption: "Place all gates into the queue at distance 0. They broadcast glow waves outwards simultaneously.",
      state: {
        cells: renderCells(demoGrid, tones),
        legend: LEGEND,
        status: { text: "all gates in queue at once", tone: "teal" },
      },
    },
    {
      scene: "insight",
      caption: "The very first time lantern glow touches an empty chamber, it has arrived along the shortest path.",
      state: {
        cells: renderCells(demoGrid, tones),
        cursor: [0, 3],
        legend: LEGEND,
        status: { text: "first arrival is shortest", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(grid: number[][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const g = cloneGrid(grid);
  const m = g.length;
  const n = g[0].length;
  const tones = new Map<string, FieldTone>();
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 3,
    caption: "Find all gate positions in the labyrinth. Gather every gate into the queue at once.",
    state: {
      cells: renderCells(g, tones),
      legend: LEGEND,
      status: { text: "locating all gates", tone: "ink" },
    },
  });

  const queue: FieldPos[] = [];
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (g[r][c] === 0) {
        queue.push([r, c]);
        tones.set(`${r},${c}`, "source");
      }
    }
  }

  frames.push({
    scene,
    codeLine: 6,
    caption: `Queued ${queue.length} castle gates simultaneously. Lantern glow waves prepare to radiate outward.`,
    state: {
      cells: renderCells(g, tones),
      legend: LEGEND,
      status: { text: `${queue.length} gates ready in queue`, tone: "teal" },
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
    const curDist = g[r][c];

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && g[nr][nc] === INF) {
        if (!askedTrap) {
          askedTrap = true;
          const trapQuiz: StoryQuiz = {
            kind: "choice",
            question: "Why do we spread outward from gates rather than searching inward from dark chambers?",
            options: [
              "starting at all gates reaches each dark chamber by its shortest distance in one shared wave",
              "chambers cannot hold numbers, so search must run backwards",
            ],
            answer: 0,
            why: "Multi-source search guarantees the first wave to enter an empty room is its nearest gate.",
          };

          frames.push({
            scene,
            codeLine: 16,
            caption: "Watch for the room to gate search trap: spread outward from gates to avoid repeating work.",
            state: {
              cells: renderCells(g, tones),
              cursor: [nr, nc],
              legend: LEGEND,
              status: { text: "room to gate search trap alert", tone: "coral" },
            },
            quiz: trapQuiz,
          });

          g[nr][nc] = curDist + 1;
          tones.set(`${nr},${nc}`, "done");
          queue.push([nr, nc]);

          frames.push({
            scene,
            codeLine: 16,
            caption: `Chamber (${nr}, ${nc}) lit by nearest gate wave: distance recorded as ${g[nr][nc]}.`,
            state: {
              cells: renderCells(g, tones),
              cursor: [nr, nc],
              legend: LEGEND,
              status: { text: `chamber reached at distance ${g[nr][nc]}`, tone: "teal" },
            },
          });
          continue;
        }

        g[nr][nc] = curDist + 1;
        tones.set(`${nr},${nc}`, "done");
        queue.push([nr, nc]);

        frames.push({
          scene,
          codeLine: 16,
          caption: `Wave enters chamber (${nr}, ${nc}): shortest distance to nearest gate is ${g[nr][nc]}.`,
          state: {
            cells: renderCells(g, tones),
            cursor: [nr, nc],
            legend: LEGEND,
            status: { text: `dist ${g[nr][nc]} at (${nr}, ${nc})`, tone: "teal" },
          },
        });
      }
    }
  }

  const finalGrid = cloneGrid(g);

  frames.push({
    scene,
    codeLine: 16,
    caption: `All empty chambers illuminated. The answer is ${JSON.stringify(finalGrid)}.`,
    state: {
      cells: renderCells(finalGrid, tones),
      legend: LEGEND,
      status: { text: "all chambers illuminated", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 16,
    caption: "Time: O(M × N). Each chamber is visited and written to at most once by the expanding gate waves.",
    state: {
      cells: renderCells(finalGrid, tones),
      legend: LEGEND,
      status: { text: "time complexity", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 16,
    caption: "Space: O(M × N). The queue holds at most M times N chambers across the search frontier.",
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
    [0, 1],
    [-1, 2],
  ];
  const tones = new Map<string, FieldTone>();
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why are all castle gates enqueued together before the wave expansion begins?",
    options: [
      "to ensure uniform expansion so each chamber is touched first by its closest gate",
      "because only the first gate can spread glow through doorways",
    ],
    answer: 0,
    why: "Expanding all gates level by level ensures the first visit to each chamber is the true minimum distance.",
  };

  frames.push({
    scene,
    caption: "Review card: why start the search with all gates in the queue at once?",
    state: {
      cells: renderCells(demoGrid, tones),
      legend: LEGEND,
      status: { text: "multi-source wave review", tone: "ink" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "When a wave visits an empty chamber, does it ever need to be overwritten later?",
    options: [
      "no, because the first arrival from breadth-first search is always the shortest path",
      "yes, subsequent waves might find an even shorter detour",
    ],
    answer: 0,
    why: "Breadth-first search explores in increasing distance order, so the first arrival is optimal.",
  };

  frames.push({
    scene,
    caption: "The first wave arrival into an empty room is already optimal and never needs overwriting.",
    state: {
      cells: renderCells(demoGrid, tones),
      legend: LEGEND,
      status: { text: "optimal first arrival", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the lantern glow from castle gates: seed all gates at once, and let the waves illuminate every chamber.",
    state: {
      cells: renderCells(demoGrid, tones),
      legend: LEGEND,
      status: { text: "walls and gates mastered", tone: "teal" },
    },
  });

  return frames;
}

export const wallsAndGatesStory: ProblemStory<FieldState> = {
  slugs: ["lc-286"],
  pattern: "Multi-source BFS",
  trigger: "Fill each empty room with the distance to its nearest gate.",
  insight: "Put all gates into a queue at the same time. Expand outward in waves step by step: the first time a wave reaches an empty room is guaranteed to be its shortest distance.",
  metaphor: {
    name: "The lantern glow from castle gates",
    legend: "gate = lantern source 0 · empty room = dark chamber INF · wall = stone barrier -1 · glow step = distance layer",
    terms: ["lantern", "gate", "chamber", "barrier", "glow", "wave", "step", "distance", "queue", "nearest"],
  },
  traps: [{ name: TRAP, rule: "Push all gates into the queue first and expand outward, rather than searching inward from every single empty room." }],
  template: [
    "class Solution:",
    "    void wallsAndGates(int[][] rooms): queue all gates, radiate outward level by level updating distances",
  ],
  complexity: {
    slow: "O((M × N)²)",
    time: "O(M × N)",
    timeWhy: "each chamber is visited and written to at most once by the expanding gate waves",
    space: "O(M × N)",
    spaceWhy: "the queue holds at most M times N chambers across the search frontier",
  },
  code: CODE,
  examples: [
    {
      label: "4x4 rooms with two gates and walls",
      input: '[[2147483647,-1,0,2147483647],[2147483647,2147483647,2147483647,-1],[2147483647,-1,2147483647,-1],[0,-1,2147483647,2147483647]]',
      expected: "[[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-130", title: "Surrounded Regions" },
    { slug: "lc-417", title: "Pacific Atlantic Water Flow" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const grid = parseGrid(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(grid),
      ...cardFrames(),
    ];
  },
  View: AgyGridsFieldView,
};
