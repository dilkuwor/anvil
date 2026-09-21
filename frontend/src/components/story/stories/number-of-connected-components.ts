import {
  AgyGroupsClustersView,
  type ClusterGroupState,
  type ClusterNode,
  type ClusterSet,
} from "../agy-groups-clusters-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ClusterGroupState>;

const PRACTICE = "4  [[0,1],[2,3]]";
const TRAP = "The Raw Node Union Trap";

const CODE = [
  "int countComponents(int n, int[][] edges) {",
  "    int[] parent = new int[n];",
  "    for (int i = 0; i < n; i++) {",
  "        parent[i] = i;",
  "    }",
  "    int components = n;",
  "    for (int[] edge : edges) {",
  "        int a = find(parent, edge[0]);",
  "        int b = find(parent, edge[1]);",
  "        if (a != b) {",
  "            parent[a] = b;",
  "            components--;",
  "        }",
  "    }",
  "    return components;",
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

function parseInput(input: string): { n: number; edges: [number, number][] } {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const n = parseInt(parts[0], 10);
      const edges = JSON.parse(parts[1]) as [number, number][];
      return { n, edges };
    }
  } catch {
    // fallback
  }
  return {
    n: 5,
    edges: [
      [0, 1],
      [1, 2],
      [3, 4],
    ],
  };
}

function solve(n: number, edges: [number, number][]): number {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let count = n;
  for (const [u, v] of edges) {
    const ra = find(u);
    const rb = find(v);
    if (ra !== rb) {
      parent[ra] = rb;
      count--;
    }
  }
  return count;
}

function answerText(input: string): string {
  const { n, edges } = parseInput(input);
  return String(solve(n, edges));
}

function buildNodes(n: number, parent: number[], activeA?: number, activeB?: number): ClusterNode[] {
  return Array.from({ length: n }, (_, i) => {
    let tone: ClusterNode["tone"] = "idle";
    if (i === activeA || i === activeB) {
      tone = "edge";
    } else if (parent[i] === i) {
      tone = "hit";
    }
    return {
      id: i,
      label: `Island ${i}`,
      parent: parent[i],
      tone,
    };
  });
}

function buildClusters(n: number, parent: number[]): ClusterSet[] {
  const find = (x: number): number => {
    let curr = x;
    while (parent[curr] !== curr) {
      curr = parent[curr];
    }
    return curr;
  };
  const map = new Map<number, string[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(`${i}`);
  }
  return Array.from(map.entries()).map(([root, items]) => ({
    root,
    items,
    tone: "hit",
  }));
}

function pictureFrames(n: number): Frame[] {
  const parent = Array.from({ length: n }, (_, i) => i);
  return [
    {
      scene: "picture",
      caption: "We have n isolated islands. Before any bridges are built, each island is its own archipelago.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "components", value: n },
        note: { text: "isolated island leaders", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "Bridges connect pairs of islands. Whenever a bridge links two separate groups, they merge into one.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "components", value: n },
        note: { text: "bridges join archipelagos", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "Our goal is to count how many independent connected components remain after all bridges are placed.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "components", value: n },
        note: { text: "count final components", tone: "teal" },
      },
    },
  ];
}

function slowFrames(n: number): Frame[] {
  const parent = Array.from({ length: n }, (_, i) => i);
  return [
    {
      scene: "slow",
      caption: "The slow way builds an entire graph adjacency list and runs search from every unvisited island.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "search passes", value: "V passes" },
        note: { text: "full graph search overhead", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Graph traversal requires extra memory for neighbor lists and call stacks across all vertices and edges.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "extra memory", value: "O(V + E)" },
        note: { text: "higher memory footprint", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Union-Find merges island groups directly using only a single parent array and root pointers.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        counter: { label: "components", value: n },
        note: { text: "fast union find array", tone: "teal" },
      },
    },
  ];
}

function insightFrames(n: number): Frame[] {
  const parent = Array.from({ length: n }, (_, i) => i);
  return [
    {
      scene: "insight",
      caption: "Each archipelago has one root leader. Every island points to its leader through parent links.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        note: { text: "each group has one root", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "When a bridge connects two islands, find both roots. If roots differ, link one leader to the other.",
      state: {
        nodes: buildNodes(n, parent),
        clusters: buildClusters(n, parent),
        note: { text: "link root leaders only", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(n: number, edges: [number, number][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const parent = Array.from({ length: n }, (_, i) => i);

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  let components = n;

  frames.push({
    scene,
    codeLine: 2,
    caption: `Set up ${n} islands. Each island starts as its own root leader, so components start at ${n}.`,
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      counter: { label: "components", value: components },
      note: { text: "every island is its own leader", tone: "accent" },
    },
  });

  let askedTrap = false;

  for (const [u, v] of edges) {
    const rootU = find(u);
    const rootV = find(v);

    if (!askedTrap && u !== rootU) {
      askedTrap = true;
    }

    if (rootU !== rootV) {
      if (!askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `Adding bridge [${u}, ${v}]: why must we call find on both islands before linking?`,
          options: [
            "we must link root leaders, not raw islands, or older links break",
            "the parent array only holds even numbers",
          ],
          answer: 0,
          why: "Unioning raw nodes directly instead of their root leaders disconnects other islands in the set.",
        };

        frames.push({
          scene,
          codeLine: 7,
          caption: `${TRAP}: always find the root leader of each island before linking parent pointers.`,
          state: {
            nodes: buildNodes(n, parent, u, v),
            clusters: buildClusters(n, parent),
            counter: { label: "components", value: components },
            note: { text: "link root leaders, not raw nodes", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 10,
          caption: `Roots found: root(${u}) is ${rootU}, root(${v}) is ${rootV}. Linking leaders.`,
          state: {
            nodes: buildNodes(n, parent, u, v),
            clusters: buildClusters(n, parent),
            counter: { label: "components", value: components },
            note: { text: `link leader ${rootU} to ${rootV}`, tone: "teal" },
          },
        });
      }

      parent[rootU] = rootV;
      components--;

      frames.push({
        scene,
        codeLine: 11,
        caption: `Bridge [${u}, ${v}] joined archipelagos. Parent[${rootU}] becomes ${rootV}; components drop to ${components}.`,
        state: {
          nodes: buildNodes(n, parent),
          clusters: buildClusters(n, parent),
          counter: { label: "components", value: components },
          note: { text: `merged into root ${rootV}`, tone: "teal" },
        },
      });
    } else {
      frames.push({
        scene,
        codeLine: 9,
        caption: `Bridge [${u}, ${v}] connects islands already sharing root ${rootU}. No new archipelago union.`,
        state: {
          nodes: buildNodes(n, parent, u, v),
          clusters: buildClusters(n, parent),
          counter: { label: "components", value: components },
          note: { text: "islands already in same group", tone: "accent" },
        },
      });
    }
  }

  frames.push({
    scene,
    codeLine: 14,
    caption: `All bridges inspected across the island archipelagos. The answer is ${components}.`,
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      counter: { label: "final components", value: components },
      note: { text: "connected components found", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 14,
    caption: "Time: O(E · α(V)). Path compression flattens root lookups to nearly constant time.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 14,
    caption: "Space: O(V). Only a single parent array of size V is needed.",
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
  const parent = Array.from({ length: n }, (_, i) => i);

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "What does the find function do in a disjoint set structure?",
    options: [
      "follows parent pointers up the chain to return the root leader of the set",
      "counts the total number of edges connected to a node",
    ],
    answer: 0,
    why: "find traces parent pointers until reaching a node that points to itself: the root representative.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "When does processing an edge decrease the component counter?",
    options: [
      "only when the two endpoints have different root leaders",
      "for every single edge in the input list",
    ],
    answer: 0,
    why: "If both endpoints already share the same root leader, the edge connects within the same component.",
  };

  frames.push({
    scene,
    caption: "When counting connected components, imagine island bridges merging archipelagos under root leaders.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "union find archipelagos", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Never union raw islands directly: always resolve root leaders before setting parent pointers.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "resolve roots first", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Path compression points nodes directly to their root, keeping operations near O(1).",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "near constant time lookups", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the island bridges: start with n isolated leaders, find roots before linking, and count down archipelagos.",
    state: {
      nodes: buildNodes(n, parent),
      clusters: buildClusters(n, parent),
      note: { text: "all archipelagos counted", tone: "teal" },
    },
  });

  return frames;
}

export const numberOfConnectedComponentsStory: ProblemStory<ClusterGroupState> = {
  slugs: ["lc-323"],
  pattern: "Union find",
  trigger: "find the number of connected components in an undirected graph given edges",
  insight: "Start with n isolated components where every node is its own root leader. For each edge, find both roots: if they differ, link one root to the other and decrease the component count.",
  metaphor: {
    name: "The island bridges",
    legend: "island = node · bridge = edge connecting islands · leader = root island · archipelago = connected component",
    terms: ["island", "bridge", "leader", "root", "archipelago", "component", "link", "union", "cluster", "node"],
  },
  traps: [{ name: TRAP, rule: "Always call find on both endpoints first: parent[find(u)] = find(v)." }],
  template: [
    "class Solution:",
    "    int countComponents(int n, int[][] edges):",
    "        parent = [0, 1, ..., n - 1]",
    "        components = n",
    "        for [u, v] in edges:",
    "            rootU = find(u), rootV = find(v)",
    "            if rootU != rootV: parent[rootU] = rootV; components--",
    "        return components",
  ],
  complexity: {
    slow: "O(V + E)",
    time: "O(E · α(V))",
    timeWhy: "path compression ensures find and union operations run in nearly constant time per edge",
    space: "O(V)",
    spaceWhy: "only a single parent array of size n is required",
  },
  code: CODE,
  examples: [
    {
      label: "5 nodes 3 edges",
      input: "5  [[0,1],[1,2],[3,4]]",
      expected: "2",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-684", title: "Redundant Connection" },
    { slug: "lc-721", title: "Accounts Merge" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const { n, edges } = parseInput(input);
    return [
      ...pictureFrames(n),
      ...slowFrames(n),
      ...insightFrames(n),
      ...solutionFrames(n, edges),
      ...cardFrames(n),
    ];
  },
  View: AgyGroupsClustersView,
};
