import type { CellTone } from "@/components/learn/viz/primitives";

import { TwoTreesView, blankPanel, pairCell, pairCellCount, type PairHole, type PairPanel, type PairSpot, type TwoTreesState } from "../agy-trees1-two-trees-view";
import { parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type SubFrame = StoryFrame<TwoTreesState>;

const PRACTICE = "root=[1,12,3]; subRoot=[2]";
const FALLBACK_ROOT = "[3,4,5,1,2]";
const FALLBACK_SUB = "[4,1,2]";

const TRAP = "The Delimiter Trap";

const CODE = [
  "boolean isSubtree(TreeNode root, TreeNode subRoot) {",
  "    if (root == null) return false;",
  "    if (isSame(root, subRoot)) return true;",
  "    return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);",
  "}",
  "",
  "boolean isSame(TreeNode p, TreeNode q) {",
  "    if (p == null && q == null) return true;",
  "    if (p == null || q == null) return false;",
  "    if (p.val != q.val) return false;",
  "    return isSame(p.left, q.left) && isSame(p.right, q.right);",
  "}",
];

type Side = "left" | "right";
type Query = { root: TreeShapeNode[]; subRoot: TreeShapeNode[] };

function readQuery(input: string): Query {
  const find = (key: string) => {
    const match = input.match(new RegExp(`${key}\\s*=\\s*(\\[[^\\]]*\\])`));
    return match ? parseTree(match[1]) : [];
  };
  const root = find("root");
  const subRoot = find("subRoot");
  if (root.length === 0 || subRoot.length === 0) {
    return { root: parseTree(FALLBACK_ROOT), subRoot: parseTree(FALLBACK_SUB) };
  }
  return { root, subRoot };
}

function isSame(p: TreeShapeNode[], q: TreeShapeNode[], pId: number | null, qId: number | null): boolean {
  if (pId === null && qId === null) return true;
  if (pId === null || qId === null) return false;
  if (p[pId].val !== q[qId].val) return false;
  return isSame(p, q, p[pId].left, q[qId].left) && isSame(p, q, p[pId].right, q[qId].right);
}

function solve({ root, subRoot }: Query): boolean {
  if (subRoot.length === 0) return true;
  if (root.length === 0) return false;
  const check = (id: number | null): boolean => {
    if (id === null) return false;
    if (isSame(root, subRoot, id, 0)) return true;
    return check(root[id].left) || check(root[id].right);
  };
  return check(0);
}

function serialize(tree: TreeShapeNode[], id: number | null, delims: boolean): string {
  if (id === null) return delims ? ",#" : "#";
  const left = serialize(tree, tree[id].left, delims);
  const right = serialize(tree, tree[id].right, delims);
  return delims ? `,${tree[id].val}${left}${right}` : `${tree[id].val}${left}${right}`;
}

function planHoles(tree: TreeShapeNode[]): PairHole[] {
  const holes: PairHole[] = [];
  for (const node of tree) {
    if (node.left === null) holes.push({ parent: node.id, side: "left", tone: "idle", show: false });
    if (node.right === null) holes.push({ parent: node.id, side: "right", tone: "idle", show: false });
  }
  return holes;
}

function blankState(query: Query, holesR: PairHole[], holesS: PairHole[]): TwoTreesState {
  return {
    panels: [blankPanel("tree root", query.root, holesR), blankPanel("template subRoot", query.subRoot, holesS)],
    mirror: false,
    out: null,
    strips: [
      { label: "", items: [] },
      { label: "", items: [] },
    ],
    counter: null,
    note: null,
  };
}

function pictureFrames(query: Query, holesR: PairHole[], holesS: PairHole[], matchFound: boolean): SubFrame[] {
  const blank = blankState(query, holesR, holesS);
  const { root, subRoot } = query;

  return [
    {
      scene: "picture",
      caption: "On the left is the main tree. On the right is a smaller template tree, subRoot.",
      state: blank,
    },
    {
      scene: "picture",
      caption: `A subtree is a spot in the main tree along with every child hanging below it. The template has root ${subRoot[0].val}.`,
      state: {
        ...blank,
        panels: [blank.panels[0], { ...blank.panels[1], tones: subRoot.map(() => "hit") }],
      },
    },
    {
      scene: "picture",
      caption: matchFound
        ? "The template matches a candidate spot in the tree exactly, with all values and children in place."
        : "No spot in the main tree matches the template completely in shape and values.",
      state: {
        ...blank,
        panels: [
          { ...blank.panels[0], tones: root.map((n) => (matchFound && n.val === subRoot[0].val ? "hit" : "idle")) },
          { ...blank.panels[1], tones: subRoot.map(() => (matchFound ? "hit" : "miss")) },
        ],
      },
    },
    {
      scene: "picture",
      caption: `The goal: return true if the main tree contains the template as a complete subtree. Here the answer is ${matchFound}.`,
      state: {
        ...blank,
        out: { text: matchFound ? "yes" : "no", tone: matchFound ? "teal" : "coral" },
      },
    },
  ];
}

function slowFrames(query: Query, holesR: PairHole[], holesS: PairHole[]): SubFrame[] {
  const blank = blankState(query, holesR, holesS);
  const rawR = serialize(query.root, 0, false);
  const rawS = serialize(query.subRoot, 0, false);
  const safeR = serialize(query.root, 0, true);
  const safeS = serialize(query.subRoot, 0, true);

  const rawMatch = rawR.includes(rawS);
  const safeMatch = safeR.includes(safeS);

  const rawItems = [
    { text: `root: "${rawR}"`, tone: "idle" as CellTone },
    { text: `sub: "${rawS}"`, tone: (rawMatch ? "hit" : "miss") as CellTone },
  ];

  return [
    {
      scene: "slow",
      caption: "The slow way: turn both trees into text by writing down node values in order.",
      state: {
        ...blank,
        strips: [{ label: "raw text", items: rawItems }, blank.strips[1]],
        counter: { label: "chars written", value: rawR.length + rawS.length },
      },
    },
    {
      scene: "slow",
      caption: `${TRAP}: without delimiters between values, numbers run together. A search for 2 matches inside 12 by mistake.`,
      state: {
        ...blank,
        strips: [{ label: "raw text", items: rawItems }, blank.strips[1]],
        note: { text: "✕ 12 falsely contains 2", tone: "coral" },
        counter: { label: "chars written", value: rawR.length + rawS.length },
      },
    },
    {
      scene: "slow",
      caption: "Delimiters like commas and null markers keep each node distinct: ,12,#,# does not contain ,2,#,#.",
      state: {
        ...blank,
        strips: [
          {
            label: "safe text",
            items: [
              { text: `root: "${safeR.slice(0, 16)}..."`, tone: "idle" as CellTone },
              { text: `sub: "${safeS}"`, tone: (safeMatch ? "hit" : "miss") as CellTone },
            ],
          },
          blank.strips[1],
        ],
        counter: { label: "chars written", value: safeR.length + safeS.length },
      },
    },
    {
      scene: "slow",
      caption: "Building full strings takes O(m + n) extra space. Comparing candidate spots directly with a walker needs only O(h) space.",
      state: {
        ...blank,
        counter: { label: "chars written", value: safeR.length + safeS.length },
      },
    },
  ];
}

function insightFrames(query: Query, holesR: PairHole[], holesS: PairHole[]): SubFrame[] {
  const blank = blankState(query, holesR, holesS);

  return [
    {
      scene: "insight",
      caption: "Think of subRoot as a stamp template. We slide the template over the main tree, testing each candidate spot.",
      state: blank,
    },
    {
      scene: "insight",
      caption: "When a candidate spot has the same value as the template root, two walkers step through both trees in lockstep.",
      state: {
        ...blank,
        panels: [
          { ...blank.panels[0], tones: query.root.map((n, i) => (i === 0 ? "window" : "idle")) },
          { ...blank.panels[1], tones: query.subRoot.map((_, i) => (i === 0 ? "window" : "idle")) },
        ],
      },
    },
    {
      scene: "insight",
      caption: "If every spot matches, we found the subtree. If any spot differs, the template lifts off and checks the next candidate spot.",
      state: blank,
    },
  ];
}

function runSearch(
  query: Query,
  holesR: PairHole[],
  holesS: PairHole[],
  practice: boolean,
  scene: SceneId,
): { frames: SubFrame[]; same: boolean } {
  const blank = blankState(query, holesR, holesS);
  const { root, subRoot } = query;
  const frames: SubFrame[] = [];
  const holeR = holesR.map((h) => ({ ...h }));
  const holeS = holesS.map((h) => ({ ...h }));
  const toneR: CellTone[] = root.map(() => "idle");
  const toneS: CellTone[] = subRoot.map(() => "idle");
  const edgeR: TreeEdgeMark[] = root.map(() => ({ tone: "idle" }));
  const edgeS: TreeEdgeMark[] = subRoot.map(() => ({ tone: "idle" }));

  let walkerR: PairSpot | null = null;
  let walkerS: PairSpot | null = null;
  let out: TwoTreesState["out"] = null;
  let note: TwoTreesState["note"] = null;
  let pairStrip: TreeStrip = { label: "", items: [] };

  const asked = { candidate: false, trap: false, value: false };

  const panelsNow = (): PairPanel[] => [
    {
      ...blank.panels[0],
      tones: [...toneR],
      edges: [...edgeR],
      holes: [...holeR],
      walkers: walkerR ? [walkerR] : [],
    },
    {
      ...blank.panels[1],
      tones: [...toneS],
      edges: [...edgeS],
      holes: [...holeS],
      walkers: walkerS ? [walkerS] : [],
    },
  ];

  const snap = (): TwoTreesState => ({
    ...blank,
    panels: panelsNow(),
    out,
    note,
    strips: [{ label: "testing", items: walkerR ? [{ text: `cand ${walkerR.kind === "node" ? root[walkerR.id].val : "empty"}`, tone: "edge" }] : [] }, pairStrip],
  });

  const push = (caption: string, codeLine: number, quiz?: StoryQuiz) => {
    const frame: SubFrame = { scene, caption, state: snap() };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };

  const holeAt = (list: PairHole[], parent: number, side: Side) => list.findIndex((h) => h.parent === parent && h.side === side);

  const checkSame = (rId: number | null, sId: number | null, pR: number | null, pS: number | null, side: Side | null): boolean => {
    if (rId === null && sId === null) {
      push("Both walkers reach an empty spot. The shapes agree here.", 7);
      return true;
    }
    if (rId === null || sId === null) {
      if (rId === null && pR !== null && side !== null) {
        const at = holeAt(holeR, pR, side);
        if (at >= 0) {
          holeR[at] = { ...holeR[at], show: true, tone: "miss" };
          walkerR = { kind: "hole", index: at };
        }
      } else if (rId !== null) {
        walkerR = { kind: "node", id: rId };
      }
      if (sId === null && pS !== null && side !== null) {
        const at = holeAt(holeS, pS, side);
        if (at >= 0) {
          holeS[at] = { ...holeS[at], show: true, tone: "miss" };
          walkerS = { kind: "hole", index: at };
        }
      } else if (sId !== null) {
        walkerS = { kind: "node", id: sId };
      }
      note = { text: "✕ shape mismatch", tone: "coral" };
      push("One spot is empty while the other holds a node. The template does not match this candidate.", 8);
      note = null;
      return false;
    }

    walkerR = { kind: "node", id: rId };
    walkerS = { kind: "node", id: sId };
    toneR[rId] = "window";
    toneS[sId] = "window";
    pairStrip = {
      label: "compare",
      items: [
        { text: `root: ${root[rId].val}`, tone: "idle" },
        { text: `sub: ${subRoot[sId].val}`, tone: "idle" },
      ],
    };

    if (root[rId].val !== subRoot[sId].val) {
      toneR[rId] = "miss";
      toneS[sId] = "miss";
      note = { text: "✕ value mismatch", tone: "coral" };
      push(`At this spot, tree has ${root[rId].val} while the template has ${subRoot[sId].val}. The template does not match here.`, 9);
      note = null;
      return false;
    }

    toneR[rId] = "hit";
    toneS[sId] = "hit";
    push(`Both spots hold ${root[rId].val}. The values match. Now the walkers check left and right children.`, 10);

    const leftOk = checkSame(root[rId].left, subRoot[sId].left, rId, sId, "left");
    if (!leftOk) return false;
    const rightOk = checkSame(root[rId].right, subRoot[sId].right, rId, sId, "right");
    return rightOk;
  };

  const candQuiz = (targetId: number): StoryQuiz => {
    const panels = panelsNow();
    const feedback: Record<number, string> = {};
    for (const node of root) {
      if (node.id !== targetId) {
        feedback[pairCell(panels, 0, { kind: "node", id: node.id })] = "We search candidate spots one by one down the tree.";
      }
    }
    return {
      kind: "cell",
      cells: pairCellCount(panels),
      question: "The current node does not match the template. Where does the candidate search step next? Click that node.",
      answer: pairCell(panels, 0, { kind: "node", id: targetId }),
      feedback,
      otherwise: "Step down to check candidate spots in the subtree.",
      why: "When a spot does not match, the search checks the left and right subtrees.",
    };
  };

  const trapQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "Node 12 has a different value from 2, but contains the digit 2. What does our check do?",
    options: [
      "It checks the integer value 12 against 2 and reports no match",
      "It splits 12 into digits 1 and 2 to match",
      "It converts both to strings and reports a match",
    ],
    answer: 0,
    why: "Tree matching compares full node values, avoiding the trap where substring searches match partial numbers.",
  });

  const valueQuiz = (valR: number, valS: number): StoryQuiz => ({
    kind: "choice",
    question: `Does candidate node ${valR} match template root ${valS}?`,
    options: [
      valR === valS ? "Yes: the values match, so test the full template here" : "No: different values cannot match the template root",
      valR === valS ? "No: a candidate never matches the root" : "Yes: any node can match the template root",
      "Nothing yet: first check the children",
    ],
    answer: 0,
    why: "We compare candidate values to decide whether to run the full template check.",
  });

  const search = (id: number | null): boolean => {
    if (id === null) return false;
    walkerR = { kind: "node", id };
    walkerS = { kind: "node", id: 0 };
    toneR[id] = "edge";
    pairStrip = { label: "", items: [] };

    const askVal = practice || !asked.value;
    if (askVal) {
      asked.value = true;
      push(`Testing candidate spot ${root[id].val} against template root ${subRoot[0].val}.`, 2, valueQuiz(root[id].val, subRoot[0].val));
      toneR[id] = root[id].val === subRoot[0].val ? "hit" : "miss";
      note = {
        text: root[id].val === subRoot[0].val ? `✓ ${root[id].val} matches ${subRoot[0].val}` : `✕ ${root[id].val} does not match ${subRoot[0].val}`,
        tone: root[id].val === subRoot[0].val ? "teal" : "coral",
      };
      push(`Candidate root check: ${root[id].val === subRoot[0].val ? "match" : "different values"}.`, 2);
      note = null;
    } else {
      push(`Testing candidate spot ${root[id].val} against template root ${subRoot[0].val}.`, 2);
    }

    if (root[id].val === 12 && subRoot[0].val === 2) {
      const askTrap = practice || !asked.trap;
      asked.trap = true;
      note = { text: "✕ 12 not 2", tone: "coral" };
      push(`${TRAP}: a text search without delimiters confuses 12 with 2. But node values are whole numbers, so 12 does not match 2.`, 2, askTrap ? trapQuiz() : undefined);
      note = { text: "✓ whole number check", tone: "teal" };
      push("Numbers are compared as complete integers, avoiding substring confusion.", 2);
      note = null;
    }

    const matched = checkSame(id, 0, null, null, null);
    walkerR = { kind: "node", id };
    walkerS = null;
    pairStrip = { label: "", items: [] };

    if (matched) {
      toneR[id] = "done";
      push(`The template matches the entire subtree at node ${root[id].val}. We found a match!`, 2);
      return true;
    }

    toneR[id] = "idle";
    push(`The template does not match at node ${root[id].val}. Now check its left and right subtrees.`, 3);

    if (root[id].left !== null) {
      if (practice || !asked.candidate) {
        asked.candidate = true;
        push(`Stepping to the left candidate below ${root[id].val}.`, 3, candQuiz(root[id].left));
      }
      if (search(root[id].left)) return true;
    }
    if (root[id].right !== null) {
      if (search(root[id].right)) return true;
    }
    return false;
  };

  const found = search(0);
  walkerR = null;
  walkerS = null;
  out = { text: found ? "yes" : "no", tone: found ? "teal" : "coral" };
  push(
    found
      ? `${practice ? "Done: yes" : "Yes"}. The template matches a subtree in the main tree. The answer is true.`
      : `${practice ? "Done: no" : "No"}. No candidate spot matched the entire template. The answer is false.`,
    3,
  );

  return { frames, same: found };
}

export const subtreeOfAnotherTreeStory: ProblemStory<TwoTreesState> = {
  slugs: ["lc-572"],
  pattern: "Tree DFS",
  trigger: "“is a subtree of another tree”, or contains a matching tree structure and values",
  insight: "Treat subRoot as a stamp template. Slide it over candidate spots in the main tree and test lockstep matches with two walkers.",
  metaphor: {
    name: "The stamp template",
    legend: "main tree = root · template = subRoot · candidate = spot where template is tested · walkers = checking pair of nodes",
    terms: ["template", "tree", "candidate", "spot", "match", "walker", "empty"],
  },
  traps: [{ name: TRAP, rule: "Wrap every node value with distinct delimiters like commas and null markers." }],
  template: [
    "boolean isSubtree(root, subRoot):",
    "    if (root == null) return false;",
    "    if (isSame(root, subRoot)) return true;",
    "    return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);",
    "boolean isSame(p, q):",
    "    if both null: return true;",
    "    if one null or values differ: return false;",
    "    return isSame(p.left, q.left) && isSame(p.right, q.right);",
  ],
  complexity: {
    slow: "O(m * n)",
    time: "O(m * n)",
    timeWhy: "at each of the m nodes in the main tree, we compare up to n nodes of the template",
    space: "O(h)",
    spaceWhy: "the call stack only holds the path from root down to the current candidate spot",
  },
  code: CODE,
  examples: [
    { label: "[3,4,5,1,2], [4,1,2]", input: "root=[3,4,5,1,2]; subRoot=[4,1,2]", expected: "true" },
    { label: "[3,4,5,1,2,null,null,null,null,0], [4,1,2]", input: "root=[3,4,5,1,2,null,null,null,null,0]; subRoot=[4,1,2]", expected: "false", note: "Extra leaf 0" },
    { label: "[12], [2]", input: "root=[12]; subRoot=[2]", expected: "false", note: "Reaches the trap" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-100", title: "Same Tree" },
    { slug: "lc-101", title: "Symmetric Tree" },
    { slug: "lc-226", title: "Invert Binary Tree" },
  ],
  answer: (input) => (solve(readQuery(input)) ? "true" : "false"),
  frames: (input) => {
    const query = readQuery(input);
    const holesR = planHoles(query.root);
    const holesS = planHoles(query.subRoot);
    const matchFound = solve(query);
    const solution = runSearch(query, holesR, holesS, false, "solution");
    const practiceQ = readQuery(PRACTICE);
    const practiceSearch = runSearch(practiceQ, planHoles(practiceQ.root), planHoles(practiceQ.subRoot), true, "card");

    const timeFrame: SubFrame = {
      scene: "solution",
      caption: "Time: O(m * n). In the worst case we test the template of n nodes at all m spots of the main tree.",
      state: solution.frames[solution.frames.length - 1].state,
    };
    const spaceFrame: SubFrame = {
      scene: "solution",
      caption: "Space: O(h). Only the active path down the main tree and the template check are stored on the call stack.",
      state: solution.frames[solution.frames.length - 1].state,
    };

    return [
      ...pictureFrames(query, holesR, holesS, matchFound),
      ...slowFrames(query, holesR, holesS),
      ...insightFrames(query, holesR, holesS),
      ...solution.frames,
      timeFrame,
      spaceFrame,
      ...practiceSearch.frames,
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: practiceSearch.frames[practiceSearch.frames.length - 1].state,
      },
    ];
  },
  View: TwoTreesView,
};
