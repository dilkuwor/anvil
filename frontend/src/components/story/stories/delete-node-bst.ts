import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. The key has two children, and the stand-in sits two steps away. */
const PRACTICE = "[7,4,9,2,6,8,10,null,null,5]\n4";
const FALLBACK = "[5,3,6,2,4,null,7]\n3";

const TRAP = "Leaving the successor behind";

const CODE = [
  "TreeNode deleteNode(TreeNode root, int key) {",
  "    if (root == null) return null;",
  "    if (key < root.val) {",
  "        root.left = deleteNode(root.left, key);",
  "    } else if (key > root.val) {",
  "        root.right = deleteNode(root.right, key);",
  "    } else {",
  "        if (root.left == null) return root.right;",
  "        if (root.right == null) return root.left;",
  "        TreeNode successor = root.right;",
  "        while (successor.left != null) successor = successor.left;",
  "        root.val = successor.val;",
  "        root.right = deleteNode(root.right, successor.val);",
  "    }",
  "    return root;",
  "}",
];

/** Two strips, always: the key, and a list (the tree read level by level, or the slow way's sorted values). */
const STRIPS = 2;

/** A real, mutable tree node. The algorithm runs on these; the picture is rebuilt from them after every change. */
type BNode = { val: number; left: BNode | null; right: BNode | null };
type Query = { root: BNode | null; key: number };

/** "[5,3,6,2,4,null,7]\n3" → the tree and the key. */
function readQuery(input: string): Query | null {
  const [treeText = "", keyText = ""] = input.split("\n").map((part) => part.trim());
  const key = Number(keyText);
  if (!treeText.startsWith("[") || keyText === "" || Number.isNaN(key)) return null;
  return { root: toNodes(parseTree(treeText)), key };
}

function toNodes(shape: TreeShapeNode[]): BNode | null {
  const nodes: BNode[] = shape.map((node) => ({ val: node.val, left: null, right: null }));
  shape.forEach((node, id) => {
    nodes[id].left = node.left === null ? null : nodes[node.left];
    nodes[id].right = node.right === null ? null : nodes[node.right];
  });
  return nodes[0] ?? null;
}

function clone(node: BNode | null): BNode | null {
  return node ? { val: node.val, left: clone(node.left), right: clone(node.right) } : null;
}

/** The tree read level by level, LeetCode style: "[5,4,6,2,null,null,7]". */
function serialize(root: BNode | null): string {
  const tokens: string[] = [];
  const queue: (BNode | null)[] = [root];
  while (queue.length > 0) {
    const node = queue.shift() ?? null;
    if (!node) {
      tokens.push("null");
      continue;
    }
    tokens.push(String(node.val));
    queue.push(node.left, node.right);
  }
  while (tokens.length > 0 && tokens[tokens.length - 1] === "null") tokens.pop();
  return `[${tokens.join(",")}]`;
}

function shape(root: BNode | null): TreeShapeNode[] {
  return parseTree(serialize(root));
}

/** Directions from the top: "" is the top, "L" its left child, "LR" that child's right child. */
function at(root: BNode | null, dirs: string): BNode | null {
  let node = root;
  for (const dir of dirs) {
    if (!node) return null;
    node = dir === "L" ? node.left : node.right;
  }
  return node;
}

function idAt(tree: TreeShapeNode[], dirs: string): number | null {
  if (tree.length === 0) return null;
  let id: number | null = 0;
  for (const dir of dirs) {
    if (id === null) return null;
    id = dir === "L" ? tree[id].left : tree[id].right;
  }
  return id;
}

/** Directions of every node in the part of the tree that hangs from `dirs`, that node first. */
function under(root: BNode | null, dirs: string): string[] {
  const node = at(root, dirs);
  return node ? [dirs, ...under(root, `${dirs}L`), ...under(root, `${dirs}R`)] : [];
}

function inOrder(node: BNode | null): number[] {
  return node ? [...inOrder(node.left), node.val, ...inOrder(node.right)] : [];
}

/** Independent solver: a loop with a parent pointer, no recursion. Same rule for two children. */
function solve({ root: original, key }: Query): string {
  const root = clone(original);
  let parent: BNode | null = null;
  let node = root;
  while (node && node.val !== key) {
    parent = node;
    node = key < node.val ? node.left : node.right;
  }
  if (!node) return serialize(root);
  if (node.left && node.right) {
    let above = node;
    let successor = node.right;
    while (successor.left) {
      above = successor;
      successor = successor.left;
    }
    node.val = successor.val;
    if (above === node) above.right = successor.right;
    else above.left = successor.right;
    return serialize(root);
  }
  const child = node.left ?? node.right;
  if (!parent) return serialize(child);
  if (parent.left === node) parent.left = child;
  else parent.right = child;
  return serialize(root);
}

type Kind = "empty" | "missing" | "leaf" | "one" | "two";

type Facts = {
  kind: Kind;
  hole: BNode | null;
  holeDirs: string;
  /** Directions of every node on the way down to the hole, the top first. */
  way: string[];
  standIn: BNode | null;
  standInDirs: string;
  final: BNode | null;
  finalText: string;
};

function analyse(query: Query): Facts {
  const { root, key } = query;
  const way: string[] = [];
  let node = root;
  let dirs = "";
  while (node) {
    way.push(dirs);
    if (node.val === key) break;
    dirs += key < node.val ? "L" : "R";
    node = key < node.val ? node.left : node.right;
  }
  let standIn: BNode | null = null;
  let standInDirs = "";
  if (node?.left && node.right) {
    standInDirs = `${dirs}R`;
    standIn = node.right;
    while (standIn.left) {
      standIn = standIn.left;
      standInDirs += "L";
    }
  }
  const kind: Kind = !root ? "empty" : !node ? "missing" : node.left && node.right ? "two" : node.left || node.right ? "one" : "leaf";
  const finalText = solve(query);
  return { kind, hole: node, holeDirs: dirs, way, standIn, standInDirs, final: toNodes(parseTree(finalText)), finalText };
}

type Paint = {
  root: BNode | null;
  /** Nodes on the way down: accent, with their edges drawn strong. */
  way?: string[];
  /** Where we are now. */
  here?: string | null;
  /** Tones by direction, painted over the way. */
  marks?: Record<string, CellTone>;
  /** Children whose edge up is drawn cut (coral, dashed). */
  cut?: string[];
  faded?: boolean;
  tag?: { at: string; text: string } | null;
  note?: TreeStoryState["note"];
  /** Show the tree read level by level, as the answer is written. */
  list?: boolean;
  strip?: TreeStrip;
  counter?: TreeStoryState["counter"];
};

function listStrip(root: BNode | null): TreeStrip {
  const inner = serialize(root).slice(1, -1);
  const items = inner === "" ? [] : inner.split(",").map((text) => ({ text, tone: (text === "null" ? "faded" : "idle") as CellTone }));
  return { label: "as a list", items };
}

function painter(key: number) {
  const keyStrip: TreeStrip = { label: "key", items: [{ text: String(key), tone: "idle" }] };
  return (paint: Paint): TreeStoryState => {
    const tree = shape(paint.root);
    const base = blankTreeState(tree, STRIPS);
    const tones: CellTone[] = tree.map(() => (paint.faded ? "faded" : "idle"));
    const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
    for (const dirs of paint.way ?? []) {
      const id = idAt(tree, dirs);
      if (id === null) continue;
      tones[id] = "window";
      if (id !== 0) edges[id] = { tone: "path" };
    }
    for (const [dirs, tone] of Object.entries(paint.marks ?? {})) {
      const id = idAt(tree, dirs);
      if (id !== null) tones[id] = tone;
    }
    if (paint.here !== undefined && paint.here !== null) {
      const id = idAt(tree, paint.here);
      if (id !== null) tones[id] = "edge";
    }
    for (const dirs of paint.cut ?? []) {
      const id = idAt(tree, dirs);
      if (id !== null && id !== 0) edges[id] = { tone: "skipped" };
    }
    const tagId = paint.tag ? idAt(tree, paint.tag.at) : null;
    return {
      ...base,
      tones,
      edges,
      tag: paint.tag && tagId !== null ? { id: tagId, text: paint.tag.text } : null,
      note: paint.note ?? null,
      strips: [keyStrip, paint.strip ?? (paint.list ? listStrip(paint.root) : base.strips[1])],
      counter: paint.counter ?? null,
    };
  };
}

function childWords(node: BNode): string {
  return listWords([node.left, node.right].filter((child): child is BNode => child !== null).map((child) => child.val));
}

function pictureFrames(query: Query, facts: Facts): Frame[] {
  const { root, key } = query;
  const draw = painter(key);
  const { hole, holeDirs, kind, final, finalText } = facts;
  if (!root) return [{ scene: "picture", caption: "The tree is empty. There is no node to delete, so the answer is the empty tree: [].", state: draw({ root, list: true }) }];
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `This is a search tree. At every node, smaller values sit on its left side and bigger values on its right side. The key to delete is ${key}.`,
      state: draw({ root }),
    },
  ];
  if (!hole) {
    frames.push({ scene: "picture", caption: `No node reads ${key}: the key is not in the tree. Then nothing may change.`, state: draw({ root, faded: true }) });
  } else {
    const kids = [hole.left, hole.right].filter((child) => child !== null);
    frames.push({
      scene: "picture",
      caption: `The node ${key} is the one to remove.${kids.length > 0 ? ` Its ${kids.length === 1 ? "child" : "children"}, ${childWords(hole)}, must keep a place in the tree.` : " It has no children, so nothing else moves."}`,
      state: draw({ root, here: holeDirs, tag: { at: holeDirs, text: "remove" } }),
    });
    if (kids.length > 0) {
      frames.push({
        scene: "picture",
        caption: `Not allowed: cut ${key} out and leave ${childWords(hole)} hanging. Every other node must keep a place, and the order must still hold.`,
        state: draw({ root, marks: { [holeDirs]: "miss" }, cut: [holeDirs, `${holeDirs}L`, `${holeDirs}R`] }),
      });
    }
  }
  frames.push({
    scene: "picture",
    caption: `The goal: return the top of the tree after the delete, read level by level. Here that is ${finalText}.`,
    state: draw({ root: final, list: true, marks: kind === "missing" ? {} : { [holeDirs]: "done" } }),
  });
  return frames;
}

/** The obvious way, really run: read the whole tree into a sorted list, then look at the key's neighbour there. */
function slowFrames(query: Query, facts: Facts): Frame[] {
  const { root, key } = query;
  const draw = painter(key);
  const { hole, holeDirs, kind, standIn, standInDirs, final } = facts;
  const values = inOrder(root);
  const count = values.length;
  const strip = (paint: (value: number) => CellTone): TreeStrip => ({ label: "in order", items: values.map((value) => ({ text: String(value), tone: paint(value) })) });
  const counter = { label: "nodes read", value: count };
  const all = under(root, "");
  if (!root) return [{ scene: "slow", caption: "The slow way would read every node into a sorted list. There are none to read, so the list is empty.", state: draw({ root, strip: strip(() => "idle"), counter }) }];

  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: walk the whole tree and write down every value in order, smallest first. That reads all ${count} nodes.`,
      state: draw({ root, marks: Object.fromEntries(all.map((dirs) => [dirs, "window"])), strip: strip(() => "window"), counter }),
    },
  ];
  if (kind === "missing" || !hole) {
    frames.push({ scene: "slow", caption: `${key} is not in the list. Nothing changes, and the tree is returned as it is.`, state: draw({ root, strip: strip(() => "idle"), counter }) });
  } else if (kind === "two" && standIn) {
    frames.push({
      scene: "slow",
      caption: `In the list, cross out ${key}. Its right-hand neighbour is ${standIn.val}: the next-bigger value, the one that can fill the place of ${key}.`,
      state: draw({ root, marks: { [holeDirs]: "miss", [standInDirs]: "done" }, strip: strip((value) => (value === key ? "miss" : value === standIn.val ? "done" : "idle")), counter }),
    });
    frames.push({
      scene: "slow",
      caption: `Fix the tree that way: ${standIn.val} fills the place of ${key}, and the old ${standIn.val} is taken out.`,
      state: draw({ root: final, marks: { [holeDirs]: "done" }, strip: strip((value) => (value === key ? "faded" : value === standIn.val ? "done" : "idle")), counter }),
    });
  } else {
    const child = hole.left ?? hole.right;
    frames.push({
      scene: "slow",
      caption: `In the list, cross out ${key}. It has ${child ? `one child, so ${child.val} simply steps up into its place` : "no children, so nothing needs to fill its place"}.`,
      state: draw({ root, marks: { [holeDirs]: "miss" }, strip: strip((value) => (value === key ? "miss" : "idle")), counter }),
    });
    frames.push({
      scene: "slow",
      caption: `Fix the tree that way: ${key} is taken out${child ? `, and ${child.val} steps up` : ""}.`,
      state: draw({ root: final, marks: child ? { [holeDirs]: "done" } : {}, strip: strip((value) => (value === key ? "faded" : "idle")), counter }),
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${count} nodes read for a tree of ${count}, just to ${kind === "two" ? "learn one neighbour" : `look for ${key}`}: O(n) time. The tree's own order already knows the way.`,
    state: draw({ root: kind === "missing" ? root : final, faded: true, strip: strip(() => "faded"), counter }),
  });
  return frames;
}

function insightFrames(query: Query, facts: Facts): Frame[] {
  const { root, key } = query;
  const draw = painter(key);
  const { hole, holeDirs, kind, way, standIn, standInDirs, final } = facts;
  if (!root) return [{ scene: "insight", caption: "With no tree there is no path to walk. The answer is simply the empty tree.", state: draw({ root }) }];
  if (kind === "missing" || !hole) {
    return [
      {
        scene: "insight",
        caption: `Values sit in order from left to right, so the search takes one path down: smaller goes left, bigger goes right. Here it falls off the tree, and nothing changes.`,
        state: draw({ root, way }),
      },
    ];
  }
  if (kind !== "two" || !standIn) {
    const child = hole.left ?? hole.right;
    return [
      {
        scene: "insight",
        caption: `Values sit in order from left to right. Taking ${key} out does not disturb that order: ${child ? `its one child, ${child.val}, steps up` : "its place is simply left empty"}.`,
        state: draw({ root, way, here: holeDirs, tag: { at: holeDirs, text: "hole" } }),
      },
      {
        scene: "insight",
        caption: "That is the easy case. The hard case is a node with two children: then a stand-in fills the hole, the smallest value on its bigger side.",
        state: draw({ root: final, marks: child ? { [holeDirs]: "done" } : {} }),
      },
    ];
  }
  const copied = clone(root);
  const copiedHole = at(copied, holeDirs);
  if (copiedHole) copiedHole.val = standIn.val;
  const bigger = Object.fromEntries(under(root, `${holeDirs}R`).map((dirs) => [dirs, "window" as CellTone]));
  return [
    {
      scene: "insight",
      caption: `Values sit in order from left to right. So the next-bigger value after ${key} is on its bigger side, then as far down the smaller side as it goes: ${standIn.val}. Call it the stand-in.`,
      state: draw({ root, marks: { ...bigger, [standInDirs]: "hit" }, here: holeDirs, tag: { at: standInDirs, text: "stand-in" } }),
    },
    {
      scene: "insight",
      caption: `Copy the stand-in into the hole. The order still holds: the smaller side is all below ${standIn.val}, and the rest of the bigger side is all above it.`,
      state: draw({ root: copied, marks: { [holeDirs]: "hit", [standInDirs]: "miss" }, tag: { at: standInDirs, text: "old" } }),
    },
    {
      scene: "insight",
      caption: "Then take out the old stand-in. It never has a smaller side, so that is the easy case: its bigger side steps up. Done.",
      state: draw({ root: final, marks: { [holeDirs]: "done" }, tag: { at: holeDirs, text: "stand-in" } }),
    },
  ];
}

const SIDE = { L: "smaller", R: "bigger" } as const;
type Side = keyof typeof SIDE;

/**
 * The real recursive delete, one frame per change. `practice` reuses it on a fresh tree,
 * without code lines, and the reader makes every decision.
 */
function runFrames(query: Query, scene: SceneId = "solution", practice = false): Frame[] {
  const { key } = query;
  const draw = painter(key);
  const frames: Frame[] = [];
  let top = clone(query.root);
  const asked = { step: false, fill: false, standIn: false, after: false, replace: false };
  const marks: Record<string, CellTone> = {};
  let tag: Paint["tag"] = null;
  let steps = 0;
  /** The longest chain of nodes waiting on the way down. */
  let deepest: string[] = [];
  let holeDirs: string | null = null;

  const push = (caption: string, codeLine: number, paint: Omit<Paint, "root">, quiz?: StoryQuiz) => {
    const frame: Frame = { scene, caption, state: draw({ root: top, marks: { ...marks }, tag, ...paint }) };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };

  const stepQuiz = (node: BNode, dirs: string, side: Side, target: number): StoryQuiz => {
    const tree = shape(top);
    const other: Side = side === "L" ? "R" : "L";
    const feedback: Record<number, string> = {};
    const here = idAt(tree, dirs);
    const otherId = idAt(tree, `${dirs}${other}`);
    if (here !== null) feedback[here] = `The search is already at ${node.val}. It must step one level down.`;
    if (otherId !== null) feedback[otherId] = `That is on the ${SIDE[other]} side of ${node.val}. Every value there is ${SIDE[other]} than ${node.val}, so ${target} cannot be there.`;
    const holeId = holeDirs === null ? null : idAt(tree, holeDirs);
    if (holeId !== null && holeId !== here && feedback[holeId] === undefined) feedback[holeId] = `That is the hole, which already holds the new ${target}. The old one is below, on the bigger side.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `The key ${target} is ${SIDE[side]} than ${node.val}. Which node does the search step to? Click it.`,
      answer: idAt(tree, `${dirs}${side}`) ?? 0,
      feedback,
      otherwise: `The search steps exactly one level down from where it is. Which side of this node holds the ${SIDE[side]} values?`,
      why: `All values ${SIDE[side]} than ${node.val} sit on its ${SIDE[side]} side, so the search goes there and skips the other side completely.`,
    };
  };

  const fillQuiz = (hole: BNode, left: BNode): StoryQuiz => ({
    kind: "choice",
    question: `The hole ${hole.val} has two children. Which value should fill it, so the tree stays in order?`,
    options: [`${left.val}, its child on the smaller side`, "The smallest value on its bigger side", "The largest value on its smaller side"],
    answer: 1,
    why: `The next-bigger value after ${hole.val} keeps the order: the smaller side stays below it, the rest of the bigger side stays above it. The largest on the smaller side would also sort, but this judge expects the next-bigger value.`,
  });

  const standInQuiz = (hole: BNode, dirs: string, standInDirs: string): StoryQuiz => {
    const tree = shape(top);
    const feedback: Record<number, string> = {};
    for (const under_ of under(top, `${dirs}R`)) {
      const id = idAt(tree, under_);
      const node = at(top, under_);
      if (id !== null && node && under_ !== standInDirs) feedback[id] = `${node.val} is on the bigger side, but a smaller value still sits below it, on its smaller side.`;
    }
    for (const under_ of under(top, `${dirs}L`)) {
      const id = idAt(tree, under_);
      const node = at(top, under_);
      if (id !== null && node) feedback[id] = `${node.val} is on the smaller side of the hole, so it is smaller than ${hole.val}, not bigger.`;
    }
    const holeId = idAt(tree, dirs);
    if (holeId !== null) feedback[holeId] = "That is the hole itself, the value we are removing.";
    return {
      kind: "cell",
      cells: tree.length,
      question: `Which node is the stand-in: the smallest value on the bigger side of ${hole.val}? Click it.`,
      answer: idAt(tree, standInDirs) ?? 0,
      feedback,
      otherwise: "The stand-in is on the bigger side of the hole, as far down the smaller side as you can go.",
      why: `Go to the bigger side, then keep to the smaller side until there is none. That node is the next-bigger value after ${hole.val}.`,
    };
  };

  const afterQuiz = (value: number): StoryQuiz => ({
    kind: "choice",
    question: `The hole now reads ${value}. What must happen next?`,
    options: ["Nothing, the delete is done", `Take the old ${value} out of the bigger side`, `Move the old ${value} to the smaller side`],
    answer: 1,
    why: `Otherwise ${value} is in the tree twice. The old stand-in has no smaller side, so taking it out is the easy one-child case.`,
  });

  const replaceQuiz = (who: string, node: BNode): StoryQuiz => {
    const child = node.left ?? node.right;
    return {
      kind: "choice",
      question: `${who} is the key. What takes its place?`,
      options: ["Nothing, its place becomes empty", child ? `Its only child, ${child.val}, steps up` : "The node above it moves down", "A stand-in from its bigger side"],
      answer: child ? 1 : 0,
      why: child ? `${who} has one child, so that child simply takes its place. A stand-in is only needed with two children.` : `${who} has no children, so nothing needs to fill its place.`,
    };
  };

  /** What the parent does with what came back: only shown when the top of that side really changed. */
  const store = (parentVal: number | null, side: Side, result: BNode | null, gone: string, way: string[], here: string, codeLine: number) => {
    const took = result ? `${result.val} steps up into the place of ${gone}` : `The place of ${gone} is left empty`;
    if (parentVal === null) push(`${took}. ${result ? `${result.val} is now the top of the tree` : "The tree is now empty"}.`, codeLine, { way, here, list: true });
    else push(`${took}. Back at ${holeDirs === here ? "the hole" : parentVal}, that is stored as its ${SIDE[side]} side.`, codeLine, { way, here });
  };

  const remove = (node: BNode, dirs: string, target: number, phase: "main" | "standIn", way: string[]): BNode | null => {
    if (way.length > deepest.length) deepest = [...way];
    if (target !== node.val) {
      const side: Side = target < node.val ? "L" : "R";
      const other: Side = side === "L" ? "R" : "L";
      const child = side === "L" ? node.left : node.right;
      const childDirs = `${dirs}${side}`;
      const compareLine = side === "L" ? 2 : 4;
      const moveLine = side === "L" ? 3 : 5;
      if (!child) {
        push(`${target} is ${SIDE[side]} than ${node.val}, so it would be on the ${SIDE[side]} side of ${node.val}. But that side is empty.`, compareLine, { way, here: dirs });
        push(`The search fell off the tree: no node reads ${target}. So nothing changes, and the tree is handed back as it is.`, 1, { way, here: null });
        return node;
      }
      const ask = practice || !asked.step;
      asked.step = true;
      push(`${target} is ${SIDE[side]} than ${node.val}, so the whole ${SIDE[other]} side of ${node.val} can be skipped.`, compareLine, { way, here: dirs }, ask ? stepQuiz(node, dirs, side, target) : undefined);
      steps++;
      const wayDown = [...way, childDirs];
      push(`Go down the ${SIDE[side]} side, to ${child.val}.`, moveLine, { way: wayDown, here: childDirs });
      const result = remove(child, childDirs, target, phase, wayDown);
      if (side === "L") node.left = result;
      else node.right = result;
      if (result !== child) store(node.val, side, result, phase === "main" ? String(target) : `the old ${target}`, way, dirs, moveLine);
      return node;
    }

    const who = phase === "main" ? String(node.val) : `The old ${node.val}`;
    if (!node.left || !node.right) {
      const child = node.left ?? node.right;
      const ask = practice || !asked.replace;
      asked.replace = true;
      const sides = phase === "standIn" ? "A stand-in never has a smaller side" : node.left ? "It has no bigger side" : node.right ? "It has no smaller side" : "It has no children";
      push(`${who} is the key. ${sides}${child ? `, only ${child.val} on its ${node.left ? "smaller" : "bigger"} side.` : `${phase === "standIn" ? ", and here no bigger side either" : ""}.`}`, node.left ? 8 : 7, { way, here: dirs }, ask ? replaceQuiz(who, node) : undefined);
      if (phase === "standIn") delete marks[dirs];
      return child;
    }

    // Two children: the stand-in rule.
    holeDirs = dirs;
    tag = { at: dirs, text: "hole" };
    const ask = practice || !asked.fill;
    asked.fill = true;
    push(`${node.val} is the key: this is the hole. It has two children, ${node.left.val} on the smaller side and ${node.right.val} on the bigger side, so neither can simply step up.`, 7, { way, here: dirs }, ask ? fillQuiz(node, node.left) : undefined);

    let standInDirs = `${dirs}R`;
    let standIn = node.right;
    const passed: number[] = [];
    while (standIn.left) {
      passed.push(standIn.val);
      standIn = standIn.left;
      standInDirs += "L";
    }
    const bigger = Object.fromEntries(under(top, `${dirs}R`).map((below) => [below, "window" as CellTone]));
    const askStandIn = practice || !asked.standIn;
    asked.standIn = true;
    push(`The hole needs a stand-in: the next-bigger value in the tree. That is the smallest value on the bigger side of the hole.`, 9, { way, here: dirs, marks: { ...marks, ...bigger } }, askStandIn ? standInQuiz(node, dirs, standInDirs) : undefined);
    steps += 1 + passed.length;
    tag = { at: standInDirs, text: "stand-in" };
    push(
      passed.length === 0
        ? `Step to the bigger side, ${standIn.val}. It has no smaller side, so ${standIn.val} is the stand-in.`
        : `Step to the bigger side, ${passed[0]}, then keep to the smaller side${passed.length > 1 ? `, past ${listWords(passed.slice(1))},` : ""} down to ${standIn.val}. It has no smaller side, so ${standIn.val} is the stand-in.`,
      10,
      { way, here: dirs, marks: { ...marks, [standInDirs]: "hit" } },
    );

    const old = node.val;
    node.val = standIn.val;
    marks[dirs] = "hit";
    marks[standInDirs] = "miss";
    tag = { at: standInDirs, text: "old" };
    const askAfter = practice || !asked.after;
    asked.after = true;
    push(`Copy ${standIn.val} into the hole. The hole now reads ${standIn.val}. But the old stand-in still reads ${standIn.val}: the value is in the tree twice.`, 11, { way, here: null }, askAfter ? afterQuiz(standIn.val) : undefined);
    push(`${TRAP}: stop here and ${standIn.val} stays in the tree twice. The old stand-in must be taken out of the bigger side.`, 11, { way, here: null, marks: { ...marks, [dirs]: "miss" }, note: { text: `✕ ${standIn.val} is there twice`, tone: "coral" } });

    steps++;
    const wayDown = [...way, `${dirs}R`];
    push(`So take the old ${standIn.val} out of the bigger side of the hole. A fresh search starts at the top of that side, ${node.right.val}.`, 12, { way: wayDown, here: `${dirs}R` });
    const result = remove(node.right, `${dirs}R`, standIn.val, "standIn", wayDown);
    const before = node.right;
    node.right = result;
    tag = { at: dirs, text: "stand-in" };
    if (result !== before) store(node.val, "R", result, `the old ${standIn.val}`, way, dirs, 12);
    else push(`Back at the hole. The bigger side comes back with the old ${standIn.val} gone, and the hole stores it. ${old} is out, ${standIn.val} stands in.`, 12, { way, here: dirs });
    return node;
  };

  if (!top) {
    push("The tree is empty: there is nothing to search. The answer is [].", 1, { list: true });
  } else {
    push(
      practice
        ? `Your turn, on a new tree. The key is ${key}. Start at the top, ${top.val}: you make every decision.`
        : `Start at the top, ${top.val}, holding the key ${key}. At each node, a smaller key goes to the smaller side and a bigger key to the bigger side.`,
      0,
      { way: [""], here: "" },
    );
    const before = top;
    top = remove(before, "", key, "main", [""]);
    if (top !== before) store(null, "L", top, String(key), [], "", 14);
    push(
      practice ? `Done. The answer is ${serialize(top)}. You made every decision yourself.` : `Every waiting node hands its top back up, so the top of the tree is ${top ? top.val : "empty"}. The answer is ${serialize(top)}.`,
      14,
      { way: [], here: null, marks: holeDirs === null ? {} : { [holeDirs]: "done" }, list: true },
    );
  }
  if (practice) return frames;

  const count = shape(query.root).length;
  // Set inside `remove`, which TypeScript's flow analysis cannot see through.
  const holeAt = holeDirs as string | null;
  const parentDirs = holeAt !== null && holeAt.length > 0 ? holeAt.slice(0, -1) : "";
  frames.push({
    scene,
    caption: `Time: O(h), the tree's height. Every move goes one level down, never back up${holeAt === null ? "" : ": to the hole, to the stand-in, then to take it out"}. Here that was ${steps} steps in a tree of ${count}.`,
    codeLine: 2,
    state: draw({ root: top, faded: true, counter: { label: "steps down", value: steps } }),
  });
  frames.push({
    scene,
    caption: `Space: O(h). Each call keeps the way down waiting, one per level: at most ${deepest.length} nodes here. A loop with a parent pointer would need none.`,
    codeLine: 0,
    state: draw({ root: top, faded: true, way: deepest, tag: holeAt === null || holeAt.length === 0 ? null : { at: parentDirs, text: "parent" } }),
  });
  return frames;
}

const readOrFallback = (input: string): Query => readQuery(input) ?? (readQuery(FALLBACK) as Query);

export const deleteNodeBstStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-450"],
  pattern: "Binary search tree: find by order, then fill the hole with the next-bigger value",
  trigger: "“delete the node with this key” from a search tree, and return the new top",
  insight: "Search by order: smaller left, bigger right. A node with one child or none is replaced by that child. A node with two children takes the stand-in's value, and the stand-in is removed instead.",
  metaphor: {
    name: "The stand-in",
    legend: "hole = the node whose value is the key · stand-in = successor, the smallest value on the bigger side · smaller side = left · bigger side = right · steps up = return the other child",
    terms: ["hole", "stand-in", "smaller side", "bigger side"],
  },
  traps: [{ name: TRAP, rule: "After copying the stand-in's value into the hole, remove the successor from the bigger side. It has no smaller side, so that is the easy one-child case." }],
  template: [
    "delete(node, key):",
    "    if node is empty: return empty",
    "    if key < node: node.left = delete(node.left, key); return node",
    "    if key > node: node.right = delete(node.right, key); return node",
    "    if one side is empty: return the other side          // the child steps up",
    "    standIn = leftmost node of node.right                  // next-bigger value",
    "    node.val = standIn.val",
    "    node.right = delete(node.right, standIn.val)           // never leave it behind",
    "    return node",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(h)",
    timeWhy: "every move goes one level down: to the hole, to the stand-in, then to take it out",
    space: "O(h)",
    spaceWhy: "the loop version keeps only a parent pointer; the recursive code shown keeps the way down waiting, O(h)",
  },
  code: CODE,
  examples: [
    { label: "key = 3", input: "[5,3,6,2,4,null,7]\n3", expected: "[5,4,6,2,null,null,7]", note: "Two children: a stand-in is needed" },
    { label: "key = 5", input: "[5,3,6,2,4,null,7]\n5", expected: "[6,3,7,2,4]", note: "Tricky: the top goes, and the stand-in has a child" },
    { label: "key = 7", input: "[5,3,6,2,4,null,7]\n7", expected: "[5,3,6,2,4]", note: "A leaf: nothing steps up" },
    { label: "key = 0", input: "[5,3,6,2,4,null,7]\n0", expected: "[5,3,6,2,4,null,7]", note: "The key is not in the tree" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-98", title: "Validate Binary Search Tree" },
    { slug: "lc-230", title: "Kth Smallest Element in a BST" },
    { slug: "lc-235", title: "Lowest Common Ancestor of a Binary Search Tree" },
  ],
  answer: (input) => solve(readOrFallback(input)),
  frames: (input) => {
    const query = readOrFallback(input);
    const facts = analyse(query);
    const draw = painter(query.key);
    return [
      ...pictureFrames(query, facts),
      ...slowFrames(query, facts),
      ...insightFrames(query, facts),
      ...runFrames(query),
      ...runFrames(readOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption:
          facts.kind === "two"
            ? "This is the picture to remember: the stand-in steps up into the hole, and its old place is closed. Say the idea in your head first, then reveal the card."
            : "This is the picture to remember: the search goes down by order, and the one side steps up. Say the idea in your head first, then reveal the card.",
        state: draw({
          root: facts.final,
          list: true,
          marks: facts.kind === "missing" || facts.kind === "empty" ? {} : { [facts.holeDirs]: "done" },
          tag: facts.kind === "two" ? { at: facts.holeDirs, text: "stand-in" } : null,
        }),
      },
    ];
  },
  View: TreeStoryView,
};
