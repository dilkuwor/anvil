import {
  AgyGroupsClustersView,
  type ClusterGroupState,
  type ClusterNode,
  type ClusterSet,
} from "../agy-groups-clusters-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ClusterGroupState>;

const PRACTICE = "[[1,0,0],[0,1,0],[0,0,1]]";
const TRAP = "The Connection Counting Trap";

const CODE = [
  "public int findCircleNum(int[][] isConnected) {",
  "    int n = isConnected.length;",
  "    int[] parent = new int[n];",
  "    for (int i = 0; i < n; i++) parent[i] = i;",
  "    int provinces = n;",
  "    for (int i = 0; i < n; i++) {",
  "        for (int j = i + 1; j < n; j++) {",
  "            if (isConnected[i][j] == 1) {",
  "                int rootA = find(parent, i);",
  "                int rootB = find(parent, j);",
  "                if (rootA != rootB) {",
  "                    parent[rootA] = rootB;",
  "                    provinces--;",
  "                }",
  "            }",
  "        }",
  "    }",
  "    return provinces;",
  "}",
  "",
  "private int find(int[] parent, int i) {",
  "    while (parent[i] != i) {",
  "        parent[i] = parent[parent[i]];",
  "        i = parent[i];",
  "    }",
  "    return i;",
  "}",
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
    [1, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
  ];
}

class ProvinceUF {
  parent: number[];
  count: number;

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.count = n;
  }

  find(i: number): number {
    let curr = i;
    while (this.parent[curr] !== curr) {
      this.parent[curr] = this.parent[this.parent[curr]];
      curr = this.parent[curr];
    }
    return curr;
  }

  union(i: number, j: number): boolean {
    const rootA = this.find(i);
    const rootB = this.find(j);
    if (rootA === rootB) return false;
    this.parent[rootA] = rootB;
    this.count--;
    return true;
  }
}

function buildNodes(
  n: number,
  uf: ProvinceUF,
  activeA?: number,
  activeB?: number
): ClusterNode[] {
  return Array.from({ length: n }, (_, i) => {
    let tone: ClusterNode["tone"] = "idle";
    if (i === activeA || i === activeB) {
      tone = "edge";
    } else if (uf.parent[i] === i) {
      tone = "hit";
    }
    return {
      id: i,
      label: `City ${i}`,
      parent: uf.parent[i],
      tone,
    };
  });
}

function buildClusters(n: number, uf: ProvinceUF): ClusterSet[] {
  const groups = new Map<number, string[]>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(`City ${i}`);
  }
  return Array.from(groups.entries()).map(([root, items]) => ({
    root,
    name: `Province ${root}`,
    items,
    tone: "hit",
  }));
}

function solveCircleNum(mat: number[][]): number {
  const n = mat.length;
  const uf = new ProvinceUF(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (mat[i][j] === 1) {
        uf.union(i, j);
      }
    }
  }
  return uf.count;
}

function answerText(input: string): string {
  const mat = parseMatrix(input);
  return String(solveCircleNum(mat));
}

function pictureFrames(): Frame[] {
  const uf = new ProvinceUF(3);
  return [
    {
      scene: "picture",
      caption: "A kingdom has multiple settlements. When two settlements share a road, they belong to the same province.",
      state: {
        nodes: buildNodes(3, uf),
        clusters: buildClusters(3, uf),
        counter: { label: "provinces", value: 3 },
        status: { text: "kingdom settlement map", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "Direct or indirect roads connect cities together: all mutually reachable cities form a single united province.",
      state: {
        nodes: buildNodes(3, uf, 0, 1),
        clusters: buildClusters(3, uf),
        activeEdge: { u: 0, v: 1, tone: "teal" },
        counter: { label: "connected road", value: 1 },
        status: { text: "roads connect territories", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "We want to count the total number of independent provinces across the entire kingdom.",
      state: {
        nodes: buildNodes(3, uf),
        clusters: buildClusters(3, uf),
        counter: { label: "total provinces", value: 3 },
        status: { text: "count independent provinces", tone: "teal" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const uf = new ProvinceUF(3);
  return [
    {
      scene: "slow",
      caption: "The slow way builds an explicit adjacency list and starts depth-first searches from every single city.",
      state: {
        nodes: buildNodes(3, uf),
        clusters: buildClusters(3, uf),
        counter: { label: "extra storage", value: 9 },
        status: { text: "building full adjacency graph", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Allocating graphs and visited sets creates unnecessary memory overhead when paths can be joined directly.",
      state: {
        nodes: buildNodes(3, uf),
        clusters: buildClusters(3, uf),
        counter: { label: "overhead", value: 9 },
        status: { text: "memory allocation overhead", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Disjoint set union merges cities in place in near constant time, counting down independent provinces directly.",
      state: {
        nodes: buildNodes(3, uf),
        clusters: buildClusters(3, uf),
        counter: { label: "disjoint set", value: 3 },
        status: { text: "direct territory merge", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const uf = new ProvinceUF(3);
  return [
    {
      scene: "insight",
      caption: "Start with every city as its own lone province. Whenever an edge connects two separate capitals, merge them.",
      state: {
        nodes: buildNodes(3, uf),
        clusters: buildClusters(3, uf),
        counter: { label: "initial provinces", value: 3 },
        status: { text: "every city starts isolated", tone: "teal" },
      },
    },
    {
      scene: "insight",
      caption: "Each successful territory merger decreases the total province count by one until all roads are processed.",
      state: {
        nodes: buildNodes(3, uf),
        clusters: buildClusters(3, uf),
        counter: { label: "mergers subtract count", value: 1 },
        status: { text: "provinces step down", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(mat: number[][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const n = mat.length;
  const uf = new ProvinceUF(n);
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 4,
    caption: `Set up ${n} settlement capitals. Total province count begins at ${n}.`,
    state: {
      nodes: buildNodes(n, uf),
      clusters: buildClusters(n, uf),
      counter: { label: "provinces", value: uf.count },
      status: { text: "settlement capitals prepared", tone: "teal" },
    },
  });

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (mat[i][j] === 1) {
        const rootA = uf.find(i);
        const rootB = uf.find(j);

        if (!askedTrap) {
          askedTrap = true;
          const trapQuiz: StoryQuiz = {
            kind: "choice",
            question: "When cities 0 and 1 share a road, how does the total count of provinces change?",
            options: [
              "the two cities merge into one single province, reducing the total count by one",
              "the road adds a new province, increasing the total count by one",
            ],
            answer: 0,
            why: "Connecting two previously separate settlements unites their entire territories into one province.",
          };

          frames.push({
            scene,
            codeLine: 8,
            caption: "Watch for the connection counting trap: a road unites two territories into a single shared province.",
            state: {
              nodes: buildNodes(n, uf, i, j),
              clusters: buildClusters(n, uf),
              activeEdge: { u: i, v: j, tone: "coral" },
              counter: { label: "provinces", value: uf.count },
              status: { text: "connection counting trap alert", tone: "coral" },
            },
            quiz: trapQuiz,
          });

          uf.union(i, j);

          frames.push({
            scene,
            codeLine: 12,
            caption: `Settlements ${i} and ${j} united: province count decreases to ${uf.count}.`,
            state: {
              nodes: buildNodes(n, uf, i, j),
              clusters: buildClusters(n, uf),
              activeEdge: { u: i, v: j, tone: "teal" },
              counter: { label: "provinces", value: uf.count },
              status: { text: `territories merged: ${uf.count} left`, tone: "teal" },
            },
          });
          continue;
        }

        if (rootA !== rootB) {
          uf.union(i, j);
          frames.push({
            scene,
            codeLine: 12,
            caption: `Road between city ${i} and ${j} merges their provinces. Province count is now ${uf.count}.`,
            state: {
              nodes: buildNodes(n, uf, i, j),
              clusters: buildClusters(n, uf),
              activeEdge: { u: i, v: j, tone: "teal" },
              counter: { label: "provinces", value: uf.count },
              status: { text: `merged into province ${rootB}`, tone: "teal" },
            },
          });
        }
      }
    }
  }

  frames.push({
    scene,
    codeLine: 17,
    caption: `All connections processed across the kingdom. The answer is ${uf.count}.`,
    state: {
      nodes: buildNodes(n, uf),
      clusters: buildClusters(n, uf),
      counter: { label: "provinces", value: uf.count },
      status: { text: `answer is ${uf.count}`, tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 17,
    caption: "Time: O(N²). We inspect each pair in the connectivity matrix and run nearly constant time union finds.",
    state: {
      nodes: buildNodes(n, uf),
      clusters: buildClusters(n, uf),
      counter: { label: "provinces", value: uf.count },
      status: { text: "time complexity", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 17,
    caption: "Space: O(N). The disjoint set parent array stores leader pointers for N cities.",
    state: {
      nodes: buildNodes(n, uf),
      clusters: buildClusters(n, uf),
      counter: { label: "provinces", value: uf.count },
      status: { text: "space complexity", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const uf = new ProvinceUF(2);
  uf.union(0, 1);
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "If city A is connected to city B, and city B is connected to city C, how many provinces exist?",
    options: [
      "one province, because connectivity is transitive and unites all three cities",
      "three separate provinces because each city has its own local identity",
    ],
    answer: 0,
    why: "Connected components are transitive: paths through intermediate cities keep all nodes in one cluster.",
  };

  frames.push({
    scene,
    caption: "Review card: how do indirect road connections affect the total province count?",
    state: {
      nodes: buildNodes(2, uf),
      clusters: buildClusters(2, uf),
      counter: { label: "provinces", value: 1 },
      status: { text: "transitive connection review", tone: "teal" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What does the diagonal element isConnected[i][i] = 1 represent?",
    options: [
      "a city is always connected to itself and does not form a new territory link",
      "a special province capital road that doubles the city score",
    ],
    answer: 0,
    why: "Self-connections are trivial identities that require no merges.",
  };

  frames.push({
    scene,
    caption: "Self-connections on the matrix diagonal are trivial and do not merge distinct territories.",
    state: {
      nodes: buildNodes(2, uf),
      clusters: buildClusters(2, uf),
      counter: { label: "provinces", value: 1 },
      status: { text: "self connection identity", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the kingdom territory maps: merge connected capitals, and the remaining cluster leaders are the provinces.",
    state: {
      nodes: buildNodes(2, uf),
      clusters: buildClusters(2, uf),
      counter: { label: "provinces", value: 1 },
      status: { text: "number of provinces mastered", tone: "teal" },
    },
  });

  return frames;
}

export const numberOfProvincesStory: ProblemStory<ClusterGroupState> = {
  slugs: ["lc-547"],
  pattern: "Graph search",
  trigger: "Find the total number of connected provinces in a kingdom connectivity matrix.",
  insight: "Each city begins as its own province. Scan the upper triangle of the matrix: whenever two separate cities share a road, merge their territories and count down by one.",
  metaphor: {
    name: "The kingdom territory maps",
    legend: "city = settlement node · road = connection · province = territory cluster · capital = cluster leader",
    terms: ["kingdom", "settlement", "road", "province", "capital", "territory", "cluster", "merge", "connect", "count"],
  },
  traps: [{ name: TRAP, rule: "A province is an entire cluster of connected cities: two cities sharing a road merge into one province rather than forming separate provinces." }],
  template: [
    "class Solution:",
    "    int findCircleNum(int[][] isConnected): union connected cities, return remaining province count",
  ],
  complexity: {
    slow: "O(N²)",
    time: "O(N²)",
    timeWhy: "we inspect each pair in the connectivity matrix and run nearly constant time union finds",
    space: "O(N)",
    spaceWhy: "the disjoint set parent array stores leader pointers for N cities",
  },
  code: CODE,
  examples: [
    {
      label: "3 cities with one connection",
      input: "[[1,1,0],[1,1,0],[0,0,1]]",
      expected: "2",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-323", title: "Number of Connected Components in an Undirected Graph" },
    { slug: "lc-684", title: "Redundant Connection" },
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
  View: AgyGroupsClustersView,
};
