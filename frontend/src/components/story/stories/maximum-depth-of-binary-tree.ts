import type { CellTone } from "@/components/learn/viz/primitives";

import {
  TreeStoryView,
  blankTreeState,
  parseTree,
  type TreeEdgeMark,
  type TreeShapeNode,
  type TreeStoryState,
  type TreeStrip,
} from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type DepthFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. It reaches the trap. */
const PRACTICE = "[4,2,7,1,3]";
const FALLBACK = "[3,9,20,null,null,15,7]";

const TRAP = "The Count Trap";

const CODE = [
  "int maxDepth(TreeNode node) {",
  "    if (node == null) return 0;",
  "    int left = maxDepth(node.left);",
  "    int right = maxDepth(node.right);",
  "    return 1 + Math.max(left, right);",
  "}",
];

const STRIPS = 2;

function solve(tree: TreeShapeNode[]): number {
  if (tree.length === 0) return 0;
  const depth = (id: number | null): number => {
    if (id === null) return 0;
    return 1 + Math.max(depth(tree[id].left), depth(tree[id].right));
  };
  return depth(0);
}

function wayUp(tree: TreeShapeNode[], id: number): number[] {
  const way: number[] = [];
  for (let at: number | null = id; at !== null; at = tree[at].parent) {
    way.push(at);
  }
  return way;
}

function findDeepestLeaf(tree: TreeShapeNode[]): number {
  if (tree.length === 0) return 0;
  let best = 0;
  for (const node of tree) {
    if (node.left === null && node.right === null && node.depth > tree[best].depth) {
      best = node.id;
    }
  }
  return best;
}

function pictureFrames(tree: TreeShapeNode[], answer: number): DepthFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  if (tree.length === 0) return [];
  const top = tree[0].val;
  const deepestId = findDeepestLeaf(tree);
  const longestPath = wayUp(tree, deepestId).reverse();
  const leafVal = tree[deepestId].val;

  return [
    {
      scene: "picture",
      caption: `This is a tree. The node ${top} is at the top. Each node can have a left child and a right child.`,
      state: blank,
    },
    {
      scene: "picture",
      caption: `A path from top to leaf is a chain of steps. From ${top} down to leaf ${leafVal} passes through ${longestPath.length} nodes.`,
      state: {
        ...blank,
        tones: tree.map((node) => (longestPath.includes(node.id) ? "window" : "idle")),
        edges: tree.map((node) => ({ tone: node.id !== 0 && longestPath.includes(node.id) ? "path" : "idle" })),
      },
    },
    {
      scene: "picture",
      caption: `${TRAP}: depth counts nodes on the path, not edges. This path has ${longestPath.length - 1} edges, but its depth is ${longestPath.length} nodes.`,
      state: {
        ...blank,
        tones: tree.map((node) => (longestPath.includes(node.id) ? "hit" : "idle")),
        edges: tree.map((node) => ({ tone: node.id !== 0 && longestPath.includes(node.id) ? "report" : "idle" })),
        note: { text: `${longestPath.length} nodes, not ${longestPath.length - 1} edges`, tone: "coral" },
      },
    },
    {
      scene: "picture",
      caption: `The goal: find the maximum depth from top to any leaf. Here that answer is ${answer}.`,
      state: {
        ...blank,
        tones: tree.map((node) => (node.id === deepestId ? "done" : "idle")),
        tag: { id: deepestId, text: `depth ${answer}` },
      },
    },
  ];
}

function slowFrames(tree: TreeShapeNode[]): DepthFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  if (tree.length === 0) return [];
  const frames: DepthFrame[] = [];
  const leaves = tree.filter((n) => n.left === null && n.right === null);
  let counted = 0;

  for (let i = 0; i < Math.min(leaves.length, 3); i++) {
    const leaf = leaves[i];
    const path = wayUp(tree, leaf.id);
    counted += path.length;
    frames.push({
      scene: "slow",
      caption:
        i === 0
          ? `The slow way: walk from the top down to leaf ${leaf.val}. That counts ${path.length} nodes along this path.`
          : `Then start from the top again for leaf ${leaf.val}, re-reading the upper nodes we already checked.`,
      state: {
        ...blank,
        tones: tree.map((n) => (path.includes(n.id) ? "window" : "idle")),
        edges: tree.map((n) => ({ tone: n.id !== 0 && path.includes(n.id) ? "path" : "idle" })),
        counter: { label: "nodes counted", value: counted },
      },
    });
  }

  frames.push({
    scene: "slow",
    caption: `Counting every path separately re-counts upper nodes repeatedly. That takes O(n · h) time. We should not re-read nodes.`,
    state: {
      ...blank,
      tones: tree.map(() => "faded"),
      counter: { label: "nodes counted", value: counted },
    },
  });

  return frames;
}

function insightFrames(tree: TreeShapeNode[]): DepthFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  if (tree.length === 0) return [];
  const root = tree[0];
  const hasTwo = tree.find((n) => n.left !== null && n.right !== null) ?? root;

  return [
    {
      scene: "insight",
      caption: "Picture reports climbing the tree. A node does not count from the top. It asks its left and right branches for their depth.",
      state: {
        ...blank,
        tones: tree.map((n) => (n.id === hasTwo.id ? "edge" : "idle")),
        tag: { id: hasTwo.id, text: "asks branches" },
      },
    },
    {
      scene: "insight",
      caption: "Each branch reports its depth back up. An empty branch reports 0. A leaf adds 1 and reports 1.",
      state: {
        ...blank,
        tones: tree.map((n) => (n.id === hasTwo.id ? "window" : n.parent === hasTwo.id ? "hit" : "idle")),
        edges: tree.map((n) => ({
          tone: n.parent === hasTwo.id ? "report" : "idle",
          badge: n.parent === hasTwo.id ? "depth" : undefined,
        })),
      },
    },
    {
      scene: "insight",
      caption: "The node takes the deeper branch, adds 1 for itself, and reports that depth up to its parent.",
      state: {
        ...blank,
        tones: tree.map((n) => (n.id === hasTwo.id ? "done" : "idle")),
        tag: { id: hasTwo.id, text: "deeper + 1" },
      },
    },
  ];
}

type StepStatus = "idle" | "waiting" | "done";

function searchFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): DepthFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  if (tree.length === 0) return [];
  const frames: DepthFrame[] = [];
  const status: StepStatus[] = tree.map(() => "idle");
  const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
  const path: number[] = [];
  let out: string | null = null;
  let tag: TreeStoryState["tag"] = null;
  const asked = { leaf: false, branch: false, trap: false };

  const waitingStrip = (): TreeStrip => ({
    label: "waiting",
    items: path.map((id, index) => ({
      text: String(tree[id].val),
      tone: (index === path.length - 1 ? "edge" : "window") as CellTone,
    })),
  });

  const snap = (): TreeStoryState => ({
    ...blank,
    tones: tree.map((n) => (status[n.id] === "waiting" ? (n.id === path[path.length - 1] ? "edge" : "window") : status[n.id] === "done" ? "hit" : "idle")),
    edges: edges.map((e) => ({ ...e })),
    out,
    tag,
    strips: [waitingStrip(), blank.strips[1]],
  });

  const push = (caption: string, codeLine?: number, quiz?: StoryQuiz) => {
    const frame: DepthFrame = { scene, caption, state: snap() };
    if (!practice && codeLine !== undefined) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };

  const dfs = (id: number | null): number => {
    if (id === null) return 0;
    const node = tree[id];
    path.push(id);
    status[id] = "waiting";
    if (node.parent !== null) edges[id] = { tone: "path" };

    push(
      practice
        ? `Enter node ${node.val} and ask its left branch for its depth.`
        : `Enter node ${node.val}. The search asks its left branch for depth.`,
      2
    );

    let leftDepth = 0;
    if (node.left !== null) {
      leftDepth = dfs(node.left);
    } else {
      push(`Left branch of node ${node.val} is empty. An empty branch reports depth 0.`, 1);
    }

    push(
      practice
        ? `Back at node ${node.val}. Now ask its right branch.`
        : `Back at node ${node.val}. Now the search asks its right branch.`,
      3
    );

    let rightDepth = 0;
    if (node.right !== null) {
      rightDepth = dfs(node.right);
    } else {
      push(`Right branch of node ${node.val} is empty and reports depth 0.`, 1);
    }

    const myDepth = 1 + Math.max(leftDepth, rightDepth);
    const isLeaf = node.left === null && node.right === null;

    let quiz: StoryQuiz | undefined;
    if (isLeaf) {
      if (practice || !asked.leaf) {
        asked.leaf = true;
        quiz = {
          kind: "choice",
          options: ["Depth 0 (no children)", "Depth 1 (the leaf itself)"],
          answer: 1,
          question: `Both branches of leaf ${node.val} reported 0. What depth does leaf ${node.val} report up?`,
          why: `A leaf adds 1 for itself to the 0 from its empty branches, reporting depth 1.`,
        };
      }
    } else {
      if (practice && !asked.trap && node.parent === null) {
        asked.trap = true;
        quiz = {
          kind: "choice",
          options: [`${myDepth - 1} edges`, `${myDepth} nodes`],
          answer: 1,
          question: `${TRAP}: what is the maximum depth of this tree?`,
          why: `Depth counts nodes on the path from root to leaf, so the depth is ${myDepth}.`,
        };
      } else if (practice || !asked.branch) {
        asked.branch = true;
        quiz = {
          kind: "choice",
          options: [`Depth ${Math.min(leftDepth, rightDepth)}`, `Depth ${myDepth}`],
          answer: 1,
          question: `Node ${node.val} heard left=${leftDepth} and right=${rightDepth}. What depth does node ${node.val} report up?`,
          why: `It takes the deeper branch depth and adds 1 for itself, reporting depth ${myDepth}.`,
        };
      }
    }

    const captionBeforeReport = quiz
      ? `Node ${node.val} has heard from both branches. What depth does it report up?`
      : `Node ${node.val} heard depth ${leftDepth} and ${rightDepth}. It adds 1 for itself and reports depth ${myDepth}.`;

    push(captionBeforeReport, 4, quiz);

    status[id] = "done";
    if (node.parent !== null) {
      edges[id] = { tone: "report", badge: String(myDepth) };
    }
    tag = { id, text: `depth ${myDepth}` };

    push(
      isLeaf
        ? `Leaf ${node.val} reports depth 1 up to its parent.`
        : `Node ${node.val} reports depth ${myDepth} up the tree from its deeper branch.`,
      4
    );

    path.pop();
    tag = null;
    return myDepth;
  };

  const total = dfs(0);
  out = String(total);
  tag = { id: 0, text: `depth ${total}` };

  push(
    practice
      ? `Done. The answer is ${total}. You guided every report climbing up.`
      : `The search reached the top. The answer is ${total}.`,
    4
  );

  if (!practice) {
    push(`Time: O(n). Every node was visited once, and reports climbed to the top.`, 4);
    push(`Space: O(h). The call stack holds only the nodes on the current path, bounded by tree height.`, 4);
  }

  return frames;
}

const parseOrFallback = (input: string) => {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
};

export const maximumDepthOfBinaryTreeStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-104"],
  pattern: "Tree DFS",
  trigger: "a binary tree, and you need to find its maximum depth (the longest path from root to leaf)",
  insight: "Each node asks its left and right branches for their depth. It takes the deeper one, adds 1 for itself, and reports that up.",
  metaphor: {
    name: "Reports climbing the tree",
    legend: "report = returned depth · branch = left or right child · deeper = larger depth · leaf = reports depth 1",
    terms: ["report", "branch", "deeper", "climb"],
  },
  traps: [
    {
      name: TRAP,
      rule: "Depth counts nodes along the path from root down to the leaf, not edges. A single root node has depth 1, never 0.",
    },
  ],
  template: [
    "maxDepth(node):",
    "    if node is empty: return 0",
    "    left = maxDepth(node.left);  right = maxDepth(node.right)",
    "    return 1 + max(left, right)                 // deeper branch plus this node",
  ],
  complexity: {
    slow: "O(n · h)",
    time: "O(n)",
    timeWhy: "every node is visited once as reports climb to the top",
    space: "O(h)",
    spaceWhy: "the call stack holds only the nodes on the current way down, bounded by tree height",
  },
  code: CODE,
  examples: [
    { label: "[3,9,20,null,null,15,7]", input: "[3,9,20,null,null,15,7]", expected: "3", note: "Standard binary tree" },
    { label: "[1,null,2]", input: "[1,null,2]", expected: "2", note: "Right branch only" },
    { label: "[1]", input: "[1]", expected: "1", note: "Single node: depth 1, not 0 edges" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-110", title: "Balanced Binary Tree" },
    { slug: "lc-543", title: "Diameter of Binary Tree" },
    { slug: "lc-226", title: "Invert Binary Tree" },
  ],
  answer: (input) => String(solve(parseOrFallback(input))),
  frames: (input) => {
    const tree = parseOrFallback(input);
    const answer = solve(tree);
    return [
      ...pictureFrames(tree, answer),
      ...slowFrames(tree),
      ...insightFrames(tree),
      ...searchFrames(tree),
      ...searchFrames(parseOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blankTreeState(tree, STRIPS),
          out: String(answer),
          tones: tree.map((n) => (n.id === 0 ? "done" : "idle")),
          tag: { id: 0, text: `depth ${answer}` },
        },
      },
    ];
  },
  View: TreeStoryView,
};
