import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type SplitFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. The walk goes left, then right, then the ways split: two whole sides are never searched. */
const PRACTICE = "[8,3,10,1,6,null,14,null,null,4,7]; p=4; q=7";
const FALLBACK = "[6,2,8,0,4,7,9,null,null,3,5]; p=3; q=5";

const TRAP = "The Blind Search Trap";

const CODE = [
  "TreeNode curr = root;",
  "int low = Math.min(p, q);",
  "int high = Math.max(p, q);",
  "while (curr != null) {",
  "    if (curr.val > high) curr = curr.left;",
  "    else if (curr.val < low) curr = curr.right;",
  "    else return curr.val;",
  "}",
  "return -1;",
];

/** Two strips, always: the two values we look for, and the walk so far. */
const STRIPS = 2;

type Query = { tree: TreeShapeNode[]; p: number; q: number };

/** "[6,2,8,0,4,7,9,null,null,3,5]; p=2; q=8" → the tree and the ids of the two marked nodes. */
function readQuery(input: string): Query | null {
  const [treeText = "", ...rest] = input.split(";");
  const tree = parseTree(treeText);
  const find = (letter: string) => {
    const match = rest.join(";").match(new RegExp(`${letter}\\s*=\\s*(-?\\d+)`));
    return match ? tree.findIndex((node) => node.val === Number(match[1])) : -1;
  };
  const p = find("p");
  const q = find("q");
  return tree.length > 0 && p >= 0 && q >= 0 && p !== q ? { tree, p, q } : null;
}

const readOrFallback = (input: string): Query => readQuery(input) ?? (readQuery(FALLBACK) as Query);

/** From a node up to the top, the node itself first. */
function wayUp(tree: TreeShapeNode[], id: number): number[] {
  const way: number[] = [];
  for (let at: number | null = id; at !== null; at = tree[at].parent) way.push(at);
  return way;
}

/** Independent solver: climb from q until we stand on p's way up. The order of the values is never used. */
function solve({ tree, p, q }: Query): number {
  const above = new Set(wayUp(tree, p));
  return wayUp(tree, q).find((id) => above.has(id)) ?? 0;
}

function below(tree: TreeShapeNode[], id: number | null): number[] {
  if (id === null) return [];
  return [id, ...below(tree, tree[id].left), ...below(tree, tree[id].right)];
}

/** The trap and the slow way, really run: the plain-tree search that looks down both sides of every node. */
function blindSearch({ tree, p, q }: Query): { entered: number[]; found: number | null } {
  const entered: number[] = [];
  const find = (id: number | null): number | null => {
    if (id === null) return null;
    entered.push(id);
    if (id === p || id === q) return id;
    const left = find(tree[id].left);
    const right = find(tree[id].right);
    if (left !== null && right !== null) return id;
    return left ?? right;
  };
  return { found: find(tree.length > 0 ? 0 : null), entered };
}

function marksOf({ p, q }: Query) {
  return [
    { id: p, letter: "p" },
    { id: q, letter: "q" },
  ];
}

function lookingStrip(low: number | null, high: number | null): TreeStrip {
  if (low === null || high === null) return { label: "", items: [] };
  return { label: "looking for", items: [{ text: `low ${low}`, tone: "window" }, { text: `high ${high}`, tone: "window" }] };
}

function walkStrip(tree: TreeShapeNode[], walk: number[], done = false): TreeStrip {
  return { label: "walk", items: walk.map((id, index) => ({ text: String(tree[id].val), tone: (index === walk.length - 1 ? (done ? "done" : "edge") : "window") as CellTone })) };
}

function pictureFrames(query: Query, answer: number): SplitFrame[] {
  const { tree, p, q } = query;
  const blank = { ...blankTreeState(tree, STRIPS), marks: marksOf(query) };
  const val = (id: number) => tree[id].val;
  const deep = tree[p].depth >= tree[q].depth ? p : q;
  const deepWay = wayUp(tree, deep);
  const shared = wayUp(tree, answer);
  return [
    { scene: "picture", caption: `This is a search tree: for every node, smaller values are on its left side and bigger values on its right side. Two nodes are marked: p is ${val(p)} and q is ${val(q)}.`, state: blank },
    {
      scene: "picture",
      caption: `An ancestor of a node is any node on the way from it up to the top. The node itself counts too. For ${val(deep)} that is ${listWords(deepWay.map(val))}.`,
      state: { ...blank, tones: tree.map((node) => (deepWay.includes(node.id) ? "window" : "idle")), edges: tree.map((node) => ({ tone: deepWay.includes(node.id) && node.id !== 0 ? "path" : "idle" })) },
    },
    {
      scene: "picture",
      caption: shared.length > 1 ? `Shared ancestors are on both ways up. For ${val(p)} and ${val(q)} they are ${listWords(shared.map(val))}.` : `The only node on both ways up is ${val(shared[0])}.`,
      state: { ...blank, tones: tree.map((node) => (shared.includes(node.id) ? "hit" : "idle")) },
    },
    {
      scene: "picture",
      caption: `The goal: the lowest shared ancestor, the one furthest from the top. Here that is ${val(answer)}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === answer ? "done" : "idle")), tag: { id: answer, text: "lowest" } },
    },
  ];
}

function slowFrames(query: Query): SplitFrame[] {
  const { tree } = query;
  const blank = { ...blankTreeState(tree, STRIPS), marks: marksOf(query) };
  const run = blindSearch(query);
  const found = run.found ?? 0;
  const counter = { label: "nodes entered", value: run.entered.length };
  return [
    {
      scene: "slow",
      caption: "The slow way: forget that this is a search tree. Search down both sides of every node for p and q, as you would in any tree.",
      state: { ...blank, tones: tree.map((node) => (run.entered.includes(node.id) ? "window" : "idle")), counter },
    },
    {
      scene: "slow",
      caption: `It does find ${tree[found].val}. But it entered ${run.entered.length} of the ${tree.length} nodes to get there, and it never once looked at which value is smaller or bigger.`,
      state: { ...blank, tones: tree.map((node) => (node.id === found ? "done" : run.entered.includes(node.id) ? "window" : "idle")), counter },
    },
    {
      scene: "slow",
      caption: "A search like that can enter every node, so it is O(n) time. The order of the values is a free signpost, and it was thrown away.",
      state: { ...blank, tones: tree.map(() => "faded"), counter },
    },
  ];
}

type Step = { at: number; move: "left" | "right" | "stay" };

/** The real walk: one decision per node, from the top down to the answer. */
function walkDown({ tree, p, q }: Query): Step[] {
  const low = Math.min(tree[p].val, tree[q].val);
  const high = Math.max(tree[p].val, tree[q].val);
  const steps: Step[] = [];
  let curr: number | null = 0;
  while (curr !== null) {
    const node: TreeShapeNode = tree[curr];
    if (node.val > high) {
      steps.push({ at: curr, move: "left" });
      curr = node.left;
    } else if (node.val < low) {
      steps.push({ at: curr, move: "right" });
      curr = node.right;
    } else {
      steps.push({ at: curr, move: "stay" });
      break;
    }
  }
  return steps;
}

function splitWords(query: Query, at: number): string {
  const { tree, p, q } = query;
  const val = (id: number) => tree[id].val;
  const low = Math.min(val(p), val(q));
  const high = Math.max(val(p), val(q));
  if (at === p || at === q) {
    const letter = at === p ? "p" : "q";
    const other = at === p ? q : p;
    return `${val(at)} is ${letter} itself, and ${val(other)} is below it. Go any lower and ${val(at)} is left behind.`;
  }
  return `${low} is smaller than ${val(at)}, and ${high} is bigger. One goes left and one goes right, so the ways split here.`;
}

function insightFrames(query: Query): SplitFrame[] {
  const { tree, p, q } = query;
  const blank = { ...blankTreeState(tree, STRIPS), marks: marksOf(query) };
  const val = (id: number) => tree[id].val;
  const steps = walkDown(query);
  const first = steps[0];
  const last = steps[steps.length - 1];
  const frames: SplitFrame[] = [];
  const gone = new Set<number>();
  if (first.move !== "stay") {
    const node = tree[first.at];
    const otherSide = first.move === "left" ? node.right : node.left;
    for (const id of below(tree, otherSide)) gone.add(id);
    frames.push({
      scene: "insight",
      caption: `In a search tree, a value tells you which way to go. ${val(p)} and ${val(q)} are both ${first.move === "left" ? "smaller" : "bigger"} than ${node.val}, so both are on its ${first.move} side. Its ${first.move === "left" ? "right" : "left"} side cannot matter.`,
      state: { ...blank, tones: tree.map((other) => (other.id === node.id ? "edge" : gone.has(other.id) ? "faded" : "idle")) },
    });
    const walked = steps.map((step) => step.at);
    for (const step of steps.slice(0, -1)) {
      const at = tree[step.at];
      for (const id of [at.id, ...below(tree, step.move === "left" ? at.right : at.left)]) gone.add(id);
    }
    frames.push({
      scene: "insight",
      caption: `So picture p and q walking down from the top together. As long as both must go the same way, they stay together: ${listWords(walked.map(val))}.`,
      state: { ...blank, tones: tree.map((other) => (other.id === last.at ? "edge" : walked.includes(other.id) ? "window" : gone.has(other.id) ? "faded" : "idle")), edges: tree.map((other) => ({ tone: walked.includes(other.id) && other.parent !== null ? "path" : "idle" })) },
    });
  } else {
    frames.push({
      scene: "insight",
      caption: "In a search tree, a value tells you which way to go: smaller to the left, bigger to the right. So picture p and q walking down from the top together.",
      state: { ...blank, tones: tree.map((other) => (other.id === 0 ? "edge" : "idle")) },
    });
  }
  frames.push({
    scene: "insight",
    caption: `${splitWords(query, last.at)} So ${val(last.at)} is the lowest node above both.`,
    state: { ...blank, tones: tree.map((other) => (other.id === last.at ? "done" : gone.has(other.id) ? "faded" : "idle")), tag: { id: last.at, text: last.at === p || last.at === q ? "arrived" : "split" } },
  });
  return frames;
}

/**
 * The real walk, one frame per decision. `practice` reuses it on a fresh tree, and the reader decides every step.
 */
function solutionFrames(query: Query, scene: SceneId = "solution", practice = false): SplitFrame[] {
  const { tree, p, q } = query;
  const blank = { ...blankTreeState(tree, STRIPS), marks: marksOf(query) };
  const val = (id: number) => tree[id].val;
  const lowVal = Math.min(val(p), val(q));
  const highVal = Math.max(val(p), val(q));
  const frames: SplitFrame[] = [];
  const walk: number[] = [];
  const gone = new Set<number>();
  let here: number | null = null;
  let named = false;
  let tag: TreeStoryState["tag"] = null;
  const asked = { move: false, stay: false };
  let trapShown = false;

  const snap = (): TreeStoryState => ({
    ...blank,
    tag,
    tones: tree.map((node) => (node.id === here ? "edge" : gone.has(node.id) ? "faded" : walk.includes(node.id) ? "window" : "idle")),
    edges: tree.map((node) => ({ tone: walk.includes(node.id) && node.parent !== null ? "path" : "idle" })),
    strips: [named ? lookingStrip(lowVal, highVal) : lookingStrip(null, null), walkStrip(tree, walk)],
  });
  const push = (caption: string, codeLine?: number, state: TreeStoryState = snap()) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  const stepQuiz = (step: Step): StoryQuiz => {
    const node = tree[step.at];
    const target = step.move === "left" ? node.left! : step.move === "right" ? node.right! : node.id;
    const feedback: Record<number, string> = {};
    const sameSide = (smaller: boolean) => (smaller ? `${lowVal} and ${highVal} are both smaller than ${node.val}` : `${lowVal} and ${highVal} are both bigger than ${node.val}`);
    if (step.move === "stay") {
      const arrived = node.id === p || node.id === q;
      if (node.left !== null) feedback[node.left] = arrived ? `Step down to ${val(node.left)} and ${node.val} is left behind. But ${node.val} is one of the two marked nodes.` : `Only ${lowVal} is smaller than ${node.val}. ${highVal} is bigger, so it is not on the left side.`;
      if (node.right !== null) feedback[node.right] = arrived ? `Step down to ${val(node.right)} and ${node.val} is left behind. But ${node.val} is one of the two marked nodes.` : `Only ${highVal} is bigger than ${node.val}. ${lowVal} is smaller, so it is not on the right side.`;
    } else {
      feedback[node.id] = `${sameSide(step.move === "left")}. Both are on the same side, so the ways do not split yet.`;
      const wrongChild = step.move === "left" ? node.right : node.left;
      if (wrongChild !== null) feedback[wrongChild] = `${val(wrongChild)} is on the ${step.move === "left" ? "right" : "left"} side of ${node.val}, where the ${step.move === "left" ? "bigger" : "smaller"} values are. But ${sameSide(step.move === "left")}.`;
    }
    for (const id of walk) if (id !== node.id) feedback[id] = `The walk has already passed ${val(id)}. It never goes back up.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `We stand on ${node.val}, looking for ${lowVal} and ${highVal}. Click the node the walk moves to next. If the walk stops here, click ${node.val} itself.`,
      answer: target,
      feedback,
      otherwise: "The walk can only move to a child of the node it stands on, or stay. Compare both values with that node.",
      why:
        step.move === "stay"
          ? `${splitWords(query, node.id)} So the walk stays: ${node.val} is the answer.`
          : `${sameSide(step.move === "left")}, so both are on its ${step.move} side. The walk moves ${step.move} to ${val(target)}.`,
    };
  };

  here = 0;
  walk.push(0);
  if (practice) {
    named = true;
    push(`Your turn, on a new search tree. p is ${val(p)} and q is ${val(q)}, so low is ${lowVal} and high is ${highVal}. The walk starts on the top node ${val(0)}, and you decide every step.`);
  } else {
    push(`The walk starts on the top node ${val(0)}.`, 0);
    named = true;
    push(`Call the smaller of the two values low, and the bigger one high. Here low is ${lowVal} and high is ${highVal}.`, 1);
  }

  for (const step of walkDown(query)) {
    const node = tree[step.at];
    const before = frames[frames.length - 1];
    const kind = step.move === "stay" ? "stay" : "move";
    if (practice || !asked[kind]) {
      asked[kind] = true;
      before.quiz = stepQuiz(step);
    }

    if (step.move === "stay") {
      tag = { id: node.id, text: node.id === p || node.id === q ? "arrived" : "split" };
      const end = (): TreeStoryState => ({ ...snap(), tones: tree.map((other) => (other.id === node.id ? "done" : gone.has(other.id) ? "faded" : walk.includes(other.id) ? "window" : "idle")), strips: [lookingStrip(lowVal, highVal), walkStrip(tree, walk, true)] });
      if (practice) {
        push(`${splitWords(query, node.id)} Done: the answer is ${node.val}, and the Blind Search Trap never caught you.`, undefined, end());
        return frames;
      }
      push(`${splitWords(query, node.id)} The answer is ${node.val}.`, 6, end());
      push(`Time: O(h), where h is the height of the tree. The walk moves one level down per step and never comes back. Here it stood on ${walk.length} of the ${tree.length} nodes.`, 3, { ...end(), counter: { label: "nodes stood on", value: walk.length } });
      push("Space: O(1). The walk only remembers where it stands, plus low and high. No pile and no list, however big the tree is.", 0, end());
      return frames;
    }

    const target = step.move === "left" ? node.left : node.right;
    const otherSide = below(tree, step.move === "left" ? node.right : node.left);
    const both = step.move === "left" ? `${node.val} is bigger than high, ${highVal}. So both values are smaller than ${node.val}` : `${node.val} is smaller than low, ${lowVal}. So both values are bigger than ${node.val}`;
    if (target === null) break;
    for (const id of otherSide) gone.add(id);
    if (!practice) {
      tag = { id: node.id, text: step.move === "left" ? "both smaller" : "both bigger" };
      push(`${both}, and both are on its ${step.move} side.`, step.move === "left" ? 4 : 5);
    }
    tag = null;
    here = target;
    walk.push(target);
    push(practice ? `${both}, and both are on its ${step.move} side. The walk moves ${step.move}, together, to ${val(target)}.` : `The walk moves ${step.move}, together, to ${val(target)}. The ${step.move === "left" ? "right" : "left"} side of ${node.val} is forgotten.`, step.move === "left" ? 4 : 5);

    if (!practice && !trapShown && otherSide.length > 0) {
      trapShown = true;
      const edges: TreeEdgeMark[] = tree.map((other) => ({ tone: otherSide.includes(other.id) ? "skipped" : walk.includes(other.id) && other.parent !== null ? "path" : "idle" }));
      push(`${TRAP}: search both sides of ${node.val}, as in a plain tree, and ${otherSide.length === 1 ? `the node ${val(otherSide[0])} is` : `these ${otherSide.length} nodes are`} searched for nothing. Nothing ${step.move === "left" ? "smaller" : "bigger"} than ${node.val} can be there.`, step.move === "left" ? 4 : 5, {
        ...snap(),
        edges,
        tones: tree.map((other) => (other.id === here ? "edge" : otherSide.includes(other.id) ? "miss" : walk.includes(other.id) ? "window" : "idle")),
        note: { text: `✕ ${otherSide.length} ${otherSide.length === 1 ? "node" : "nodes"} searched for nothing`, tone: "coral" },
      });
      // Back to the true picture, so the next frame changes only one thing.
      push(`The order of the values is a signpost. The walk follows it, and never looks at that side. We stand on ${val(target)}.`, step.move === "left" ? 4 : 5);
    }
  }
  return frames;
}

export const lowestCommonAncestorBstStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-235"],
  pattern: "Binary search tree",
  trigger: "a search tree (smaller to the left, bigger to the right) and two of its values, and you are asked for the lowest node above both",
  insight: "Walk down from the top. While both values are smaller, go left; while both are bigger, go right. The first node where the ways split, or where one value is the node itself, is the answer.",
  metaphor: {
    name: "Smaller to the left, bigger to the right: where the ways split",
    legend: "the walk = curr · low = the smaller of p and q · high = the bigger · both smaller = curr.val > high · both bigger = curr.val < low · the ways split = neither",
    terms: ["walk", "left", "right", "smaller", "bigger", "split", "together"],
  },
  traps: [{ name: TRAP, rule: "Never search both sides of a node in a search tree. Compare the two values with the node: both smaller means left, both bigger means right, anything else means stop here." }],
  template: [
    "curr = root",
    "while (curr exists) {",
    "    if (both values < curr.val)      curr = curr.left;     // only one side can hold them",
    "    else if (both values > curr.val) curr = curr.right;",
    "    else return curr;                                      // the ways split, or one value is curr",
    "}",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(h)",
    timeWhy: "the walk goes one level down per step and never comes back",
    space: "O(1)",
    spaceWhy: "only the current node, low and high are remembered",
  },
  code: CODE,
  examples: [
    { label: "p = 3, q = 5", input: "[6,2,8,0,4,7,9,null,null,3,5]; p=3; q=5", expected: "4", note: "Left, then right, then the ways split" },
    { label: "p = 2, q = 8", input: "[6,2,8,0,4,7,9,null,null,3,5]; p=2; q=8", expected: "6", note: "The ways split at the top" },
    { label: "p = 2, q = 4", input: "[6,2,8,0,4,7,9,null,null,3,5]; p=2; q=4", expected: "2", note: "Tricky: p is itself the answer" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-236", title: "Lowest Common Ancestor of a Binary Tree" },
    { slug: "lc-98", title: "Validate Binary Search Tree" },
    { slug: "lc-230", title: "Kth Smallest Element in a BST" },
  ],
  answer: (input) => {
    const query = readOrFallback(input);
    return String(query.tree[solve(query)].val);
  },
  frames: (input) => {
    const query = readOrFallback(input);
    const solution = solutionFrames(query);
    const remembered = solution.find((frame) => frame.caption.includes("answer is")) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(query, solve(query)),
      ...slowFrames(query),
      ...insightFrames(query),
      ...solution,
      ...solutionFrames(readOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: one walk down, whole sides forgotten, until the ways split. Say the idea in your head first, then reveal the card.",
        state: remembered.state,
      },
    ];
  },
  View: TreeStoryView,
};
