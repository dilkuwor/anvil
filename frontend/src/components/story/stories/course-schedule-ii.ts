import { CourseGraphView, type CourseGraphState } from "../course-graph-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<CourseGraphState>;

const PRACTICE = "numCourses=3, prerequisites=[[1,0],[2,1]]";
const TRAP = "The Partial Array Trap";

const CODE = [
  "public int[] findOrder(int numCourses, int[][] prerequisites) {",
  "    int[] inDegree = new int[numCourses];",
  "    List<List<Integer>> adj = new ArrayList<>();",
  "    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());",
  "    for (int[] p : prerequisites) {",
  "        adj.get(p[1]).add(p[0]);",
  "        inDegree[p[0]]++;",
  "    }",
  "    Queue<Integer> queue = new ArrayDeque<>();",
  "    for (int i = 0; i < numCourses; i++) {",
  "        if (inDegree[i] == 0) queue.add(i);",
  "    }",
  "    int[] order = new int[numCourses];",
  "    int idx = 0;",
  "    while (!queue.isEmpty()) {",
  "        int u = queue.poll();",
  "        order[idx++] = u;",
  "        for (int v : adj.get(u)) {",
  "            inDegree[v]--;",
  "            if (inDegree[v] == 0) queue.add(v);",
  "        }",
  "    }",
  "    return idx == numCourses ? order : new int[0];",
  "}",
];

type Graph = {
  numCourses: number;
  edges: [number, number][];
  unlocks: number[][];
  inDegree: number[];
};

function parseInput(input: string): Graph {
  const count = Math.max(1, Number(input.match(/numCourses\s*=\s*(\d+)/)?.[1] ?? 4));
  const edges: [number, number][] = [];
  for (const match of input.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)) {
    const course = Number(match[1]);
    const before = Number(match[2]);
    if (course < count && before < count) edges.push([before, course]);
  }
  const unlocks: number[][] = Array.from({ length: count }, () => []);
  const inDegree: number[] = new Array(count).fill(0);
  for (const [before, course] of edges) {
    unlocks[before].push(course);
    inDegree[course]++;
  }
  return { numCourses: count, edges, unlocks, inDegree };
}

function solveOrder(g: Graph): number[] {
  const { numCourses, unlocks } = g;
  const inDegree = [...g.inDegree];
  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }
  const order: number[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of unlocks[u]) {
      inDegree[v]--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }
  return order.length === numCourses ? order : [];
}

function answerText(input: string): string {
  const g = parseInput(input);
  return JSON.stringify(solveOrder(g));
}

function pictureFrames(): Frame[] {
  const demoEdges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3]];
  return [
    {
      scene: "picture",
      caption: "A set of courses has prerequisite arrows: course 0 must fall before courses 1 and 2 can start.",
      state: {
        numCourses: 4,
        edges: demoEdges,
        blockedBy: [0, 1, 1, 2],
        fallen: [],
        free: [0],
        counter: { label: "courses", value: 4 },
      },
    },
    {
      scene: "picture",
      caption: "We want an exact sequence to take all courses so every prerequisite is satisfied beforehand.",
      state: {
        numCourses: 4,
        edges: demoEdges,
        blockedBy: [0, 1, 1, 2],
        fallen: [],
        free: [0],
        active: 0,
        counter: { label: "first free", value: 0 },
      },
    },
    {
      scene: "picture",
      caption: "When a free course is taken, it tips over, removing blockers from all downstream dominoes.",
      state: {
        numCourses: 4,
        edges: demoEdges,
        blockedBy: [0, 0, 0, 2],
        fallen: [0],
        free: [1, 2],
        counter: { label: "fallen", value: 1 },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const demoEdges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3]];
  return [
    {
      scene: "slow",
      caption: "The slow way scans every course repeatedly from the beginning on every round to check prerequisites.",
      state: {
        numCourses: 4,
        edges: demoEdges,
        blockedBy: [0, 1, 1, 2],
        fallen: [],
        free: [0],
        walked: [0, 1, 2, 3],
        counter: { label: "scan overhead", value: 4 },
      },
    },
    {
      scene: "slow",
      caption: "Repeatedly scanning all courses without a ready queue takes quadratic time across the curriculum.",
      state: {
        numCourses: 4,
        edges: demoEdges,
        blockedBy: [0, 1, 1, 2],
        fallen: [],
        free: [0],
        counter: { label: "quadratic steps", value: 16 },
      },
    },
    {
      scene: "slow",
      caption: "Maintaining blocker counts and a line of free dominoes yields the order in clean linear time.",
      state: {
        numCourses: 4,
        edges: demoEdges,
        blockedBy: [0, 1, 1, 2],
        fallen: [],
        free: [0],
        counter: { label: "optimal speed", value: 4 },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const demoEdges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3]];
  return [
    {
      scene: "insight",
      caption: "Track incoming blocker counts: any domino with 0 blockers enters the free queue immediately.",
      state: {
        numCourses: 4,
        edges: demoEdges,
        blockedBy: [0, 1, 1, 2],
        fallen: [],
        free: [0],
        counter: { label: "free queue", value: 1 },
      },
    },
    {
      scene: "insight",
      caption: "Poll from the line, append to order, and lower blocker counts of downstream neighbors.",
      state: {
        numCourses: 4,
        edges: demoEdges,
        blockedBy: [0, 0, 0, 2],
        fallen: [0],
        free: [1, 2],
        counter: { label: "freed neighbors", value: 2 },
      },
    },
  ];
}

function solutionFrames(g: Graph): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const { numCourses, edges, unlocks } = g;
  const blockedBy = [...g.inDegree];
  const queue: number[] = [];
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 1,
    caption: "Count blockers for each course: incoming arrows indicate how many prerequisites are required.",
    state: {
      numCourses,
      edges,
      blockedBy: [...blockedBy],
      fallen: [],
      free: [],
      counter: { label: "ready courses", value: 0 },
    },
  });

  for (let i = 0; i < numCourses; i++) {
    if (blockedBy[i] === 0) queue.push(i);
  }

  frames.push({
    scene,
    codeLine: 10,
    caption: `Dominoes with zero blockers placed into the ready line: [${queue.join(", ")}].`,
    state: {
      numCourses,
      edges,
      blockedBy: [...blockedBy],
      fallen: [],
      free: [...queue],
      counter: { label: "ready courses", value: queue.length },
    },
  });

  const order: number[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);

    if (!askedTrap && order.length === 1) {
      askedTrap = true;
      const trapQuiz: StoryQuiz = {
        kind: "choice",
        question: "If courses are locked in a circular blocker cycle so not all can fall, what should findOrder return?",
        options: [
          "an empty array because completing all courses is impossible",
          "the partial array of whichever courses managed to fall",
        ],
        answer: 0,
        why: "When a cycle exists, not all courses can be taken, so the specification requires returning an empty array.",
      };

      frames.push({
        scene,
        codeLine: 22,
        caption: "Watch for the partial array trap: if any domino is trapped in a cycle, return an empty array.",
        state: {
          numCourses,
          edges,
          blockedBy: [...blockedBy],
          fallen: [...order],
          free: [...queue],
          active: u,
          counter: { label: "partial array check", value: order.length },
        },
        quiz: trapQuiz,
      });

      frames.push({
        scene,
        codeLine: 16,
        caption: `Domino ${u} falls into the valid course order. Blocker counts drop for its downstream courses.`,
        state: {
          numCourses,
          edges,
          blockedBy: [...blockedBy],
          fallen: [...order],
          free: [...queue],
          active: u,
          counter: { label: "fallen courses", value: order.length },
        },
      });
    } else {
      frames.push({
        scene,
        codeLine: 16,
        caption: `Domino ${u} falls and joins course order: [${order.join(", ")}].`,
        state: {
          numCourses,
          edges,
          blockedBy: [...blockedBy],
          fallen: [...order],
          free: [...queue],
          active: u,
          counter: { label: "fallen courses", value: order.length },
        },
      });
    }

    for (const v of unlocks[u]) {
      blockedBy[v]--;
      if (blockedBy[v] === 0) {
        queue.push(v);
        frames.push({
          scene,
          codeLine: 19,
          caption: `Course ${v} has 0 blockers remaining: joins the ready line of free dominoes.`,
          state: {
            numCourses,
            edges,
            blockedBy: [...blockedBy],
            fallen: [...order],
            free: [...queue],
            touched: v,
            counter: { label: "ready courses", value: queue.length },
          },
        });
      }
    }
  }

  const finalAnswer = order.length === numCourses ? order : [];

  frames.push({
    scene,
    codeLine: 22,
    caption: `All courses ordered without blocker cycles. The answer is ${JSON.stringify(finalAnswer)}.`,
    state: {
      numCourses,
      edges,
      blockedBy: [...blockedBy],
      fallen: [...order],
      free: [],
      counter: { label: "total completed", value: order.length },
    },
  });

  frames.push({
    scene,
    codeLine: 22,
    caption: "Time: O(V + E). We inspect each course vertex and prerequisite edge once using blocker counts.",
    state: {
      numCourses,
      edges,
      blockedBy: [...blockedBy],
      fallen: [...order],
      free: [],
      counter: { label: "time complexity", value: order.length },
    },
  });

  frames.push({
    scene,
    codeLine: 22,
    caption: "Space: O(V + E). Memory holds the prerequisite adjacency lists and the ready queue.",
    state: {
      numCourses,
      edges,
      blockedBy: [...blockedBy],
      fallen: [...order],
      free: [],
      counter: { label: "space complexity", value: order.length },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const demoEdges: [number, number][] = [[0, 1]];
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why do we add a course to the free dominoes line only when its blocker count reaches zero?",
    options: [
      "because a course can only be taken once all of its prerequisite requirements are completed",
      "courses with zero blockers are optional and can be skipped",
    ],
    answer: 0,
    why: "A blocker count of zero indicates that all prerequisites have already fallen, making the course safe to take.",
  };

  frames.push({
    scene,
    caption: "Review card: what ensures a course is eligible to join the ready queue?",
    state: {
      numCourses: 2,
      edges: demoEdges,
      blockedBy: [0, 0],
      fallen: [0, 1],
      free: [],
      counter: { label: "ready check", value: 2 },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "If a cycle prevents some courses from ever reaching zero blockers, what does findOrder return?",
    options: [
      "an empty array, because finishing all courses is impossible with circular dependencies",
      "the list of courses in reverse order",
    ],
    answer: 0,
    why: "The problem specifies that if no complete topological order exists, return an empty array.",
  };

  frames.push({
    scene,
    caption: "When a cycle prevents completion of all courses, findOrder returns an empty array.",
    state: {
      numCourses: 2,
      edges: demoEdges,
      blockedBy: [0, 0],
      fallen: [0, 1],
      free: [],
      counter: { label: "empty array check", value: 0 },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the row of standing dominoes: count blockers, tip the free ones, and return empty on any cycle.",
    state: {
      numCourses: 2,
      edges: demoEdges,
      blockedBy: [0, 0],
      fallen: [0, 1],
      free: [],
      counter: { label: "domino order mastered", value: 2 },
    },
  });

  return frames;
}

export const courseScheduleIIStory: ProblemStory<CourseGraphState> = {
  slugs: ["lc-210"],
  pattern: "Topological sort",
  trigger: "Find the order of courses to finish all courses given prerequisite pairs, or return an empty array if cycle exists.",
  insight: "Count incoming prerequisite blockers for each course. Enqueue courses with zero blockers. As each falls, decrement blockers for downstream courses and enqueue newly unblocked ones. Return empty on cycles.",
  metaphor: {
    name: "The row of standing dominoes",
    legend: "domino = course node · blocker = prerequisite arrow · tip = take course · queue = ready line · order = fallen sequence",
    terms: ["domino", "blocker", "arrow", "tip", "fall", "free", "queue", "cycle", "course", "order"],
  },
  traps: [{ name: TRAP, rule: "If a circular blocker stops some dominoes from falling, return an empty array rather than the incomplete order." }],
  template: [
    "class Solution:",
    "    int[] findOrder(int numCourses, int[][] prerequisites): topological sort via blocker queue, return empty on cycle",
  ],
  complexity: {
    slow: "O(V²)",
    time: "O(V + E)",
    timeWhy: "we inspect each course vertex and prerequisite edge once using blocker counts",
    space: "O(V + E)",
    spaceWhy: "memory holds the prerequisite adjacency lists and the ready queue",
  },
  code: CODE,
  examples: [
    {
      label: "4 courses with linear and branching prerequisites",
      input: "numCourses=4, prerequisites=[[1,0],[2,0],[3,1],[3,2]]",
      expected: "[0,1,2,3]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-207", title: "Course Schedule" },
    { slug: "lc-269", title: "Alien Dictionary" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const g = parseInput(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(g),
      ...cardFrames(),
    ];
  },
  View: CourseGraphView,
};
