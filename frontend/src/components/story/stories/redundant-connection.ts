import {
  AgyGroupsClustersView,
  type ClusterGroupState,
  type ClusterNode,
  type ClusterSet,
} from "../agy-groups-clusters-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ClusterGroupState>;

const PRACTICE = "[[1,2],[2,3],[3,4],[1,4],[1,5]]";
const TRAP = "The One-Based Index Trap";

const CODE = [
  "int[] findRedundantConnection(int[][] edges) {",
  "    int[] parent = new int[edges.length + 1];",
  "    for (int i = 0; i < parent.length; i++) {",
  "        parent[i] = i;",
  "    }",
  "    for (int[] edge : edges) {",
  "        int a = find(parent, edge[0]);",
  "        int b = find(parent, edge[1]);",
  "        if (a == b) {",
  "            return edge;",
  "        }",
  "        parent[a] = b;",
  "    }",
  "    return new int[0];",
  "}",
  "",
  "int find(int[] parent, int node) {",
  "    while (parent[node] != node) {",
  "        parent[node] = parent[parent[node]];",
  "        node = parent[node];",
  "    }",
  "    return node;",
  "}",
];

function parseInput(input: string): [number, number][] {
  try {
    const raw = input.trim();
    const parsed = JSON.parse(raw) as [number, number][];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return [
    [1, 2],
    [1, 3],
    [2, 3],
  ];
}

function solve(edges: [number, number][]): [number, number] {
  const n = edges.length;
  const parent = Array.from({ length: n + 1 }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const [u, v] of edges) {
    const a = find(u);
    const b = find(v);
    if (a === b) {
      return [u, v];
    }
    parent[a] = b;
  }
  return [0, 0];
}

function answerText(input: string): string {
  const edges = parseInput(input);
  return JSON.stringify(solve(edges));
}

function buildNodes(n: number, parent: number[], activeA?: number, activeB?: number): ClusterNode[] {
  return Array.from({ length: n }, (_, idx) => {
    const i = idx + 1;
    let tone: ClusterNode["tone"] = "idle";
    if (i === activeA || i === activeB) {
      tone = "edge";
    } else if (parent[i] === i) {
      tone = "hit";
    }
    return {
      id: i,
      label: `Node ${i}`,
      parent: parent[i],
      tone,
    };
  });
}

function buildClusters(n: number, parent: number[], cycleRoot?: number): ClusterSet[] {
  const find = (x: number): number => {
    let curr = x;
    while (parent[curr] !== curr) {
      curr = parent[curr];
    }
    return curr;
  };
  const map = new Map<number, string[]>();
  for (let i = 1; i <= n; i++) {
    const r = find(i);
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(`${i}`);
  }
  return Array.from(map.entries()).map(([root, items]) => ({
    root,
    items,
    tone: root === cycleRoot ? "miss" : "hit",
  }));
}

function pictureFrames(n: number): Frame[] {
  const parent = Array.from({ length: n + 1 }, (_, i) => i);
  return [
    {
      scene: "picture",
      caption: "A connected tree with n nodes has exactly n - 1 edges and contains no cycles.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "cycle check", value: "clean tree" },
        note: { text: "n nodes with 1-based indexing", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "An extra edge was added to the tree, creating a closed loop between two connected islands.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "extra edge", value: "1 loop" },
        note: { text: "one redundant bridge closes cycle", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "Our goal is to find that redundant connection so removing it restores a single valid tree.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "edges to inspect", value: n },
        note: { text: "find the cycle bridge", tone: "teal" },
      },
    },
  ];
}

function slowFrames(n: number): Frame[] {
  const parent = Array.from({ length: n + 1 }, (_, i) => i);
  return [
    {
      scene: "slow",
      caption: "The slow way runs a full search before adding each edge to see if a path already exists.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "time cost", value: "O(n²)" },
        note: { text: "depth search per edge", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Traversing the graph for every single edge repeats work and takes quadratic time.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "repeated scans", value: "n passes" },
        note: { text: "expensive graph traversals", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Union-Find maintains connected sets directly, catching cycles in near-constant time per bridge.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "union find time", value: "O(n · α(n))" },
        note: { text: "instant root checks", tone: "teal" },
      },
    },
  ];
}

function insightFrames(n: number): Frame[] {
  const parent = Array.from({ length: n + 1 }, (_, i) => i);
  return [
    {
      scene: "insight",
      caption: "Vertices are 1-based, so size the parent array to n + 1 to avoid out of bounds errors.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        note: { text: "parent array size n + 1", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "For each bridge, find the root leaders of both islands. If roots match, this bridge closes the cycle.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        note: { text: "matching roots mean a cycle", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(edges: [number, number][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const n = edges.length;
  const parent = Array.from({ length: n + 1 }, (_, i) => i);

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  let askedTrap = false;
  let redundantEdge: [number, number] | null = null;

  frames.push({
    scene,
    codeLine: 1,
    caption: `Set up parent array of size ${n + 1} for 1-based nodes. Every island starts as its own leader.`,
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      counter: { label: "array size", value: n + 1 },
      note: { text: "parent size n + 1", tone: "accent" },
    },
  });

  for (const [u, v] of edges) {
    const rootU = find(u);
    const rootV = find(v);

    if (rootU === rootV) {
      redundantEdge = [u, v];

      if (!askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: "Nodes are numbered 1 to n. What happens if we allocate parent with size n instead of n + 1?",
          options: [
            "accessing node n causes an array index out of bounds error",
            "the algorithm finds cycles backwards",
          ],
          answer: 0,
          why: "A size n array in Java has indices 0 to n - 1. Node n needs index n, requiring size n + 1.",
        };

        frames.push({
          scene,
          codeLine: 1,
          caption: `${TRAP}: graph nodes are 1-based, so size the parent array to n + 1 to avoid index errors.`,
          state: {
            nodes: buildNodes(n, parent, u, v),
            clusters: buildClusters(n, parent, rootU),
            counter: { label: "trap warning", value: "index error" },
            note: { text: "size n + 1 prevents out of bounds", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 8,
          caption: `Bridge [${u}, ${v}] connects islands with identical root leader ${rootU}. Loop detected.`,
          state: {
            nodes: buildNodes(n, parent, u, v),
            clusters: buildClusters(n, parent, rootU),
            counter: { label: "redundant bridge", value: `[${u}, ${v}]` },
            note: { text: `cycle found on bridge [${u}, ${v}]`, tone: "teal" },
          },
        });
      }

      frames.push({
        scene,
        codeLine: 9,
        caption: `Loop detected on bridge [${u}, ${v}]. Returning this edge as redundant.`,
        state: {
          nodes: buildNodes(n, parent, u, v),
          clusters: buildClusters(n, parent, rootU),
          counter: { label: "redundant bridge", value: `[${u}, ${v}]` },
          note: { text: `redundant connection [${u}, ${v}]`, tone: "teal" },
        },
      });
      break;
    } else {
      parent[rootU] = rootV;
      frames.push({
        scene,
        codeLine: 11,
        caption: `Bridge [${u}, ${v}] links leader ${rootU} to leader ${rootV}. Island archipelagos merged safely.`,
        state: {
          nodes: buildNodes(n, parent, u, v),
          clusters: buildClusters(n, parent),
          counter: { label: "bridge added", value: `[${u}, ${v}]` },
          note: { text: `union ${rootU} and ${rootV}`, tone: "accent" },
        },
      });
    }
  }

  const ans = redundantEdge ?? [0, 0];
  frames.push({
    scene,
    codeLine: 9,
    caption: `Redundant bridge discovered in the graph. The answer is ${JSON.stringify(ans)}.`,
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent, find(ans[0])),
      counter: { label: "redundant bridge", value: JSON.stringify(ans) },
      note: { text: "cycle edge found", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 9,
    caption: "Time: O(n · α(n)). Path compression checks root leaders in virtually constant time.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 9,
    caption: "Space: O(n). Only a single parent array of size n + 1 is needed.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "space complexity", tone: "accent" },
    },
  });

  return frames;
}

function cardFrames(n: number): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];
  const parent = Array.from({ length: n + 1 }, (_, i) => i);

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "How does Union-Find detect that an edge creates a cycle in a graph?",
    options: [
      "both endpoints already share the same root leader",
      "the edge has a weight greater than zero",
    ],
    answer: 0,
    why: "If two nodes have the same root leader, a path already connects them. Adding another edge closes a cycle.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "Why is Union-Find faster than running DFS for cycle detection on each edge?",
    options: [
      "it checks connectivity in near O(1) time using root pointers instead of traversing the whole graph",
      "it counts node degrees using binary search",
    ],
    answer: 0,
    why: "DFS visits up to O(n) vertices per edge, taking O(n²) total, while Union-Find runs in near linear time.",
  };

  frames.push({
    scene,
    caption: "When searching for a cycle, watch island bridges merge until an edge links two nodes sharing a leader.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "cycle detection with union find", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Never forget that nodes are 1-based: size the parent array to n + 1 to avoid index errors.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "guard 1-based indexing", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Path compression flattens root lookups, making cycle detection nearly instantaneous.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "near O(1) checks", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the island loop bridge: size parent for 1-based nodes, track root leaders, and catch the cycle.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "cycle resolved", tone: "teal" },
    },
  });

  return frames;
}

export const redundantConnectionStory: ProblemStory<ClusterGroupState> = {
  slugs: ["lc-684"],
  pattern: "Union find",
  trigger: "find an edge in an undirected graph that creates a cycle and can be removed to leave a tree",
  insight: "A tree on n nodes has exactly n - 1 edges and no cycles. Add edges one by one into a disjoint set: the first edge connecting two nodes that already share the same root closes the cycle.",
  metaphor: {
    name: "The island loop bridge",
    legend: "island = 1-based node · bridge = edge · loop = redundant cycle edge · leader = root island",
    terms: ["island", "bridge", "loop", "leader", "root", "cycle", "union", "tree", "node", "link"],
  },
  traps: [{ name: TRAP, rule: "Allocate parent with edges.length + 1 since vertices are numbered 1 to n." }],
  template: [
    "class Solution:",
    "    int[] findRedundantConnection(int[][] edges):",
    "        parent = [0, 1, ..., n]",
    "        for [u, v] in edges:",
    "            if find(u) == find(v): return [u, v]",
    "            union(u, v)",
    "        return []",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n · α(n))",
    timeWhy: "path compression ensures each edge check executes in virtually constant time",
    space: "O(n)",
    spaceWhy: "only a single parent array of size n + 1 is needed",
  },
  code: CODE,
  examples: [
    {
      label: "3 nodes triangle",
      input: "[[1,2],[1,3],[2,3]]",
      expected: "[2,3]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-323", title: "Number of Connected Components in an Undirected Graph" },
    { slug: "lc-721", title: "Accounts Merge" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const edges = parseInput(input);
    const n = edges.length;
    return [
      ...pictureFrames(n),
      ...slowFrames(n),
      ...insightFrames(n),
      ...solutionFrames(edges),
      ...cardFrames(n),
    ];
  },
  View: AgyGroupsClustersView,
};
