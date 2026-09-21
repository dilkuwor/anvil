import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = "[[2],[1]]";
const TRAP = "The Infinite Cycle Trap";

const CODE = [
  "public Node cloneGraph(Node node) {",
  "    if (node == null) return null;",
  "    Map<Node, Node> seen = new HashMap<>();",
  "    return dfs(node, seen);",
  "}",
  "",
  "private Node dfs(Node node, Map<Node, Node> seen) {",
  "    if (seen.containsKey(node)) {",
  "        return seen.get(node);",
  "    }",
  "    Node copy = new Node(node.val);",
  "    seen.put(node, copy);",
  "    for (Node neighbor : node.neighbors) {",
  "        copy.neighbors.add(dfs(neighbor, seen));",
  "    }",
  "    return copy;",
  "}",
];

function parseAdj(input: string): number[][] {
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
    [2, 4],
    [1, 3],
    [2, 4],
    [1, 3],
  ];
}

function answerText(input: string): string {
  const adj = parseAdj(input);
  return JSON.stringify(adj);
}

function buildSlots(seen: Set<number>, total: number, active?: number): DesignSlot[] {
  const slots: DesignSlot[] = [];
  for (let i = 1; i <= total; i++) {
    const isCloned = seen.has(i);
    slots.push({
      id: i,
      key: `Original Node ${i}`,
      val: isCloned ? `Clone Node ${i}` : "not yet cloned",
      sub: isCloned ? "registered in twin map" : "awaiting visit",
      tone: i === active ? "edge" : isCloned ? "hit" : "idle",
    });
  }
  return slots;
}

function buildBuckets(
  adj: number[][],
  clonedNeighbors: Map<number, number[]>,
): DesignBucket[] {
  const buckets: DesignBucket[] = [];
  for (let i = 1; i <= adj.length; i++) {
    const neighbors = clonedNeighbors.get(i) ?? [];
    buckets.push({
      id: i,
      label: `Clone Node ${i} Blueprint`,
      items: neighbors.map((n) => ({
        text: `linked to clone ${n}`,
        tone: "hit" as const,
      })),
      tone: neighbors.length > 0 ? "hit" : "idle",
    });
  }
  return buckets;
}

function pictureFrames(): Frame[] {
  const emptySeen = new Set<number>();
  const emptyNeighbors = new Map<number, number[]>();
  return [
    {
      scene: "picture",
      caption: "We want to produce an exact deep copy of a connected graph without reusing any original nodes.",
      state: {
        slots: buildSlots(emptySeen, 4),
        buckets: buildBuckets([[2, 4], [1, 3], [2, 4], [1, 3]], emptyNeighbors),
        counter: { label: "graph size", value: "4 nodes" },
        note: { text: "twin mirror studio", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "Every original node must have a mirrored twin with identical values and corresponding cloned links.",
      state: {
        slots: buildSlots(emptySeen, 4),
        buckets: buildBuckets([[2, 4], [1, 3], [2, 4], [1, 3]], emptyNeighbors),
        counter: { label: "blueprint", value: "exact twin" },
        note: { text: "mirrored blueprints", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "A registry map pairs each original node to its copy so we never duplicate a node twice.",
      state: {
        slots: buildSlots(emptySeen, 4),
        buckets: buildBuckets([[2, 4], [1, 3], [2, 4], [1, 3]], emptyNeighbors),
        counter: { label: "twin registry", value: "Map<Node, Node>" },
        note: { text: "registry prevents cycles", tone: "accent" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const emptySeen = new Set<number>();
  const emptyNeighbors = new Map<number, number[]>();
  return [
    {
      scene: "slow",
      caption: "Without tracking visited blueprints, graph cycles cause recursive calls to loop forever.",
      state: {
        slots: buildSlots(emptySeen, 4),
        buckets: buildBuckets([[2, 4], [1, 3], [2, 4], [1, 3]], emptyNeighbors),
        counter: { label: "cycle risk", value: "infinite loop" },
        note: { text: "untracked cycle loop", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "A naïve clone recurses between mutual neighbors indefinitely until the call stack crashes.",
      state: {
        slots: buildSlots(emptySeen, 4),
        buckets: buildBuckets([[2, 4], [1, 3], [2, 4], [1, 3]], emptyNeighbors),
        counter: { label: "stack error", value: "overflow" },
        note: { text: "stack overflow error", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Registering each cloned twin immediately inside a hash map halts recursion safely on any cycle.",
      state: {
        slots: buildSlots(emptySeen, 4),
        buckets: buildBuckets([[2, 4], [1, 3], [2, 4], [1, 3]], emptyNeighbors),
        counter: { label: "safety", value: "O(V + E)" },
        note: { text: "hash map registry", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const seen = new Set<number>([1]);
  const neighbors = new Map<number, number[]>();
  return [
    {
      scene: "insight",
      caption: "Before exploring neighbors, create the twin node and record it in the map right away.",
      state: {
        slots: buildSlots(seen, 4, 1),
        buckets: buildBuckets([[2, 4], [1, 3], [2, 4], [1, 3]], neighbors),
        counter: { label: "cloned", value: 1 },
        note: { text: "record copy before neighbors", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "When a neighbor points back to an already registered node, return the existing twin immediately.",
      state: {
        slots: buildSlots(seen, 4),
        buckets: buildBuckets([[2, 4], [1, 3], [2, 4], [1, 3]], neighbors),
        counter: { label: "cycle resolved", value: "existing clone" },
        note: { text: "return existing clone on cycle", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(adj: number[][]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const n = adj.length;
  const seen = new Set<number>();
  const clonedNeighbors = new Map<number, number[]>();
  for (let i = 1; i <= n; i++) clonedNeighbors.set(i, []);
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 2,
    caption: "Set up the twin registry map to pair each original blueprint to its mirrored clone.",
    state: {
      slots: buildSlots(seen, n),
      buckets: buildBuckets(adj, clonedNeighbors),
      counter: { label: "cloned nodes", value: 0 },
      note: { text: "twin registry ready", tone: "accent" },
    },
  });

  function clone(u: number): void {
    if (seen.has(u)) return;
    seen.add(u);

    frames.push({
      scene,
      codeLine: 11,
      caption: `Created mirrored drawing for Node ${u} and registered it in the twin studio map.`,
      state: {
        slots: buildSlots(seen, n, u),
        buckets: buildBuckets(adj, clonedNeighbors),
        activeOp: `clone(${u})`,
        counter: { label: "cloned nodes", value: seen.size },
        note: { text: `Node ${u} twin registered`, tone: "accent" },
      },
    });

    const neighbors = adj[u - 1] ?? [];
    for (const v of neighbors) {
      if (!askedTrap && seen.has(v)) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `When exploring neighbor ${v} from node ${u}, how do we avoid infinite recursion on the cycle?`,
          options: [
            "look up node in the twin registry and return its existing clone immediately",
            "create another fresh clone of the node and recurse into its neighbors again",
          ],
          answer: 0,
          why: "Checking the twin registry prevents duplicate recursion on cycles by linking to the existing clone.",
        };

        frames.push({
          scene,
          codeLine: 8,
          caption: "Watch for the infinite cycle trap: return the registered clone immediately when revisiting a node.",
          state: {
            slots: buildSlots(seen, n, u),
            buckets: buildBuckets(adj, clonedNeighbors),
            activeOp: `lookup(${v})`,
            counter: { label: "cycle check", value: `Node ${v}` },
            note: { text: "infinite cycle trap alert", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        clonedNeighbors.get(u)!.push(v);

        frames.push({
          scene,
          codeLine: 13,
          caption: `Reused existing clone of Node ${v}: linked blueprint edge from Clone ${u} to Clone ${v}.`,
          state: {
            slots: buildSlots(seen, n, u),
            buckets: buildBuckets(adj, clonedNeighbors),
            activeOp: `link(${u} ➔ ${v})`,
            counter: { label: "cloned links", value: `edge (${u}, ${v})` },
            note: { text: `linked existing clone ${v}`, tone: "teal" },
          },
        });
        continue;
      }

      if (!seen.has(v)) {
        clone(v);
      }

      if (!clonedNeighbors.get(u)!.includes(v)) {
        clonedNeighbors.get(u)!.push(v);
        frames.push({
          scene,
          codeLine: 13,
          caption: `Linked mirrored blueprint connection between Clone ${u} and Clone ${v}.`,
          state: {
            slots: buildSlots(seen, n, u),
            buckets: buildBuckets(adj, clonedNeighbors),
            activeOp: `link(${u} ➔ ${v})`,
            counter: { label: "cloned nodes", value: seen.size },
            note: { text: `connected clone ${u} to ${v}`, tone: "teal" },
          },
        });
      }
    }
  }

  clone(1);

  frames.push({
    scene,
    codeLine: 15,
    caption: `All blueprints copied and linked. Graph clone finished: the answer is ${JSON.stringify(adj)}.`,
    state: {
      slots: buildSlots(seen, n),
      buckets: buildBuckets(adj, clonedNeighbors),
      counter: { label: "complete", value: seen.size },
      note: { text: "graph clone complete", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 15,
    caption: "Time: O(V + E). Each vertex and edge is explored once and looked up in the clone map in constant time.",
    state: {
      slots: buildSlots(seen, n),
      buckets: buildBuckets(adj, clonedNeighbors),
      note: { text: "time complexity", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 15,
    caption: "Space: O(V). The twin registry map and recursion stack hold at most V cloned nodes.",
    state: {
      slots: buildSlots(seen, n),
      buckets: buildBuckets(adj, clonedNeighbors),
      note: { text: "space complexity", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const seen = new Set<number>([1, 2]);
  const neighbors = new Map<number, number[]>([
    [1, [2]],
    [2, [1]],
  ]);
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why must a cloned node be added to the registry map before exploring its neighbors?",
    options: [
      "so recursive searches through cyclic neighbors find the existing copy rather than recursing infinitely",
      "to ensure the clone gets drawn with a different background color",
    ],
    answer: 0,
    why: "Adding to the map before exploring neighbors breaks cycles by providing an immediate reference.",
  };

  frames.push({
    scene,
    caption: "Review card: why insert into the twin registry before recursing into neighbor blueprints?",
    state: {
      slots: buildSlots(seen, 2),
      buckets: buildBuckets([[2], [1]], neighbors),
      counter: { label: "review", value: "cycle prevention" },
      note: { text: "twin registry review", tone: "accent" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What should be returned if the initial input node is null?",
    options: [
      "null, because an empty input graph has no nodes to copy",
      "a new empty Node object with value zero",
    ],
    answer: 0,
    why: "Cloning a null graph returns null directly without creating dummy nodes.",
  };

  frames.push({
    scene,
    caption: "A null input graph immediately returns null with no allocations.",
    state: {
      slots: buildSlots(seen, 2),
      buckets: buildBuckets([[2], [1]], neighbors),
      counter: { label: "review", value: "null check" },
      note: { text: "null graph returns null", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the twin mirror blueprint studio: register each twin before neighbors, and cycles resolve naturally.",
    state: {
      slots: buildSlots(seen, 2),
      buckets: buildBuckets([[2], [1]], neighbors),
      note: { text: "clone graph mastered", tone: "teal" },
    },
  });

  return frames;
}

export const cloneGraphStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-133"],
  pattern: "Graph search",
  trigger: "produce a deep copy of a connected undirected graph",
  insight: "Create copies node by node. Maintain a map from original node to its copy: if an original is already in the map, return the existing clone immediately so cycles do not cause infinite loops.",
  metaphor: {
    name: "The twin mirror blueprint studio",
    legend: "original node = original blueprint · copy = mirrored drawing · copy map = twin registry · link = blueprint connection",
    terms: ["blueprint", "studio", "mirror", "twin", "copy", "registry", "link", "neighbor", "cycle", "clone"],
  },
  traps: [{ name: TRAP, rule: "Register a node in the clone map before exploring its neighbors to avoid infinite loops on graph cycles." }],
  template: [
    "class Solution:",
    "    Node cloneGraph(Node node): dfs copy nodes, cache in seen map to prevent infinite recursion on cycles",
  ],
  complexity: {
    slow: "O(V²)",
    time: "O(V + E)",
    timeWhy: "each vertex and edge is explored once and looked up in the clone map in constant time",
    space: "O(V)",
    spaceWhy: "the twin registry map and recursion stack hold at most V cloned nodes",
  },
  code: CODE,
  examples: [
    {
      label: "4 nodes connected in a cycle",
      input: "[[2,4],[1,3],[2,4],[1,3]]",
      expected: "[[2,4],[1,3],[2,4],[1,3]]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-138", title: "Copy List with Random Pointer" },
    { slug: "lc-200", title: "Number of Islands" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const adj = parseAdj(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(adj),
      ...cardFrames(),
    ];
  },
  View: AgyDesignSlotsView,
};
