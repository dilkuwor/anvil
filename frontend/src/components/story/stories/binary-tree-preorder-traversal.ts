import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type WalkFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. Two nodes have two children, so the push order matters twice. */
const PRACTICE = "[5,3,8,1,4,7]";
const FALLBACK = "[1,2,3]";

const TRAP = "The Right-First Trap";

const CODE = [
  "List<Integer> list = new ArrayList<>();",
  "Deque<TreeNode> pile = new ArrayDeque<>();",
  "if (root != null) pile.addFirst(root);",
  "while (!pile.isEmpty()) {",
  "    TreeNode node = pile.removeFirst();",
  "    list.add(node.val);",
  "    if (node.right != null) pile.addFirst(node.right);",
  "    if (node.left != null) pile.addFirst(node.left);",
  "}",
  "return list;",
];

/** Pile, list, and one spare strip for the trap's wrong list. Always three, so the picture never jumps. */
const STRIPS = 3;

const showList = (values: number[]) => `[${values.join(",")}]`;

/** Independent solver: the plain rule, the node, then its left side, then its right side. */
function solve(tree: TreeShapeNode[]): number[] {
  const order: number[] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    order.push(id);
    walk(tree[id].left);
    walk(tree[id].right);
  };
  walk(tree.length > 0 ? 0 : null);
  return order;
}

/** The trap, really run: the left child goes on the pile first, so the right child comes off first. */
function solveLeftFirst(tree: TreeShapeNode[]): number[] {
  const list: number[] = [];
  const pile: number[] = tree.length > 0 ? [0] : [];
  while (pile.length > 0) {
    const id = pile.pop()!;
    list.push(tree[id].val);
    if (tree[id].left !== null) pile.push(tree[id].left!);
    if (tree[id].right !== null) pile.push(tree[id].right!);
  }
  return list;
}

/** The slow way, really run: every node builds a new list and copies its children's lists into it. */
function solveByCopying(tree: TreeShapeNode[]) {
  let copied = 0;
  const events: { id: number; list: number[]; copied: number }[] = [];
  const build = (id: number | null): number[] => {
    if (id === null) return [];
    const list = [tree[id].val];
    for (const child of [tree[id].left, tree[id].right]) {
      const part = build(child);
      copied += part.length;
      list.push(...part);
    }
    events.push({ id, list, copied });
    return list;
  };
  build(tree.length > 0 ? 0 : null);
  return { events, copied };
}

function below(tree: TreeShapeNode[], id: number | null): number[] {
  if (id === null) return [];
  return [id, ...below(tree, tree[id].left), ...below(tree, tree[id].right)];
}

function height(tree: TreeShapeNode[]): number {
  return Math.max(0, ...tree.map((node) => node.depth)) + 1;
}

function pileStrip(tree: TreeShapeNode[], pile: number[]): TreeStrip {
  return { label: "pile → top", items: pile.map((id) => ({ text: String(tree[id].val), tone: "window" as CellTone })) };
}

function listStrip(values: number[], label = "list", tone: CellTone = "done"): TreeStrip {
  return { label, items: values.map((value) => ({ text: String(value), tone })) };
}

/** The node the story explains the push order on: the first one with two children, else the top. */
function firstFork(tree: TreeShapeNode[]): TreeShapeNode {
  return tree.find((node) => node.left !== null && node.right !== null) ?? tree[0];
}

function pictureFrames(tree: TreeShapeNode[], order: number[]): WalkFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const top = tree[0];
  const leftSide = below(tree, top.left);
  const rightSide = below(tree, top.right);
  const side = (ids: number[], name: string) => (ids.length > 0 ? `its ${name} side (${listWords(ids.map(val))})` : `its ${name} side (empty here)`);
  return [
    { scene: "picture", caption: `This is a tree. The node ${top.val} is at the top. Each node can have a left child and a right child below it.`, state: blank },
    {
      scene: "picture",
      caption: `We must write every node on a list, in one fixed order. For the top: first ${top.val} itself, then ${side(leftSide, "left")}, then ${side(rightSide, "right")}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : leftSide.includes(node.id) ? "hit" : rightSide.includes(node.id) ? "window" : "idle")), tag: { id: 0, text: "me first" } },
    },
    {
      scene: "picture",
      caption: "The same rule holds inside each side: a node is always written before anything below it, and its left side before its right side.",
      state: { ...blank, tones: tree.map((node) => (leftSide.includes(node.id) ? "hit" : "idle")) },
    },
    {
      scene: "picture",
      caption: `The goal: the whole tree written by this rule. Here that is ${showList(order.map(val))}.`,
      state: { ...blank, tones: tree.map(() => "hit"), strips: [blank.strips[0], listStrip(order.map(val)), blank.strips[2]] },
    },
  ];
}

function slowFrames(tree: TreeShapeNode[]): WalkFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const { events, copied } = solveByCopying(tree);
  const parents = events.filter((event) => tree[event.id].left !== null || tree[event.id].right !== null);
  const frames: WalkFrame[] = [
    {
      scene: "slow",
      caption: "The slow way: every node makes its own new list. It holds the node's value, then a copy of the left child's list, then a copy of the right child's list.",
      state: { ...blank, counter: { label: "values copied", value: 0 } },
    },
  ];
  for (const event of parents.slice(-3)) {
    const inside = below(tree, event.id);
    frames.push({
      scene: "slow",
      caption: `The node ${tree[event.id].val} copies its children's lists into a new one: ${showList(event.list)}.`,
      state: {
        ...blank,
        tones: tree.map((node) => (node.id === event.id ? "edge" : inside.includes(node.id) ? "window" : "idle")),
        strips: [blank.strips[0], listStrip(event.list), blank.strips[2]],
        counter: { label: "values copied", value: event.copied },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${copied} values copied for ${tree.length} nodes. A deep value is copied again at every level above it: O(n·h) time, where h is the height.`,
    state: { ...blank, tones: tree.map(() => "faded"), strips: [blank.strips[0], listStrip(solve(tree).map((id) => tree[id].val)), blank.strips[2]], counter: { label: "values copied", value: copied } },
  });
  return frames;
}

function insightFrames(tree: TreeShapeNode[]): WalkFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const fork = firstFork(tree);
  const val = (id: number) => tree[id].val;
  const kids = [fork.right, fork.left].filter((id): id is number => id !== null);
  const pile = kids;
  const next = pile[pile.length - 1];
  return [
    {
      scene: "insight",
      caption: `Picture a to-do pile. We take ${fork.val} off the top and write it at once, because a node comes before both of its sides.`,
      state: { ...blank, tones: tree.map((node) => (node.id === fork.id ? "hit" : "idle")), strips: [pileStrip(tree, []), listStrip([fork.val], "written"), blank.strips[2]], tag: { id: fork.id, text: "written" } },
    },
    {
      scene: "insight",
      caption:
        kids.length === 2
          ? `Its children go on the pile. The pile gives back the last thing put on it, so the right child ${val(fork.right!)} goes on first, then the left child ${val(fork.left!)}.`
          : `Its child goes on the pile. The pile always gives back the last thing put on it.`,
      state: { ...blank, tones: tree.map((node) => (node.id === fork.id ? "hit" : pile.includes(node.id) ? "window" : "idle")), strips: [pileStrip(tree, pile), listStrip([fork.val], "written"), blank.strips[2]] },
    },
    ...(next !== undefined
      ? [
          {
            scene: "insight" as const,
            caption:
              kids.length === 2
                ? `Now ${val(next)} is on the top. It comes off next, so the left side is written before the right side.`
                : `Now ${val(next)} is on the top, so it comes off and is written next.`,
            state: {
              ...blank,
              tones: tree.map((node): CellTone => (node.id === fork.id || node.id === next ? "hit" : pile.includes(node.id) ? "window" : "idle")),
              strips: [pileStrip(tree, pile.slice(0, -1)), listStrip([fork.val, val(next)], "written"), blank.strips[2]],
              tag: { id: next, text: "top" },
            },
          },
        ]
      : []),
  ];
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh tree, and the reader
 * decides every take and every push order.
 */
function solutionFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): WalkFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const frames: WalkFrame[] = [];
  const wrong = solveLeftFirst(tree);
  const right = solve(tree).map(val);
  const pile: number[] = [];
  const list: number[] = [];
  const written = new Set<number>();
  let here: number | null = null;
  let tag: TreeStoryState["tag"] = null;
  let tallest = 0;
  const asked = { take: false, order: false };
  let toldTake = practice;
  let toldTrap = practice;
  let afterLeaf = false;

  const snap = (): TreeStoryState => ({
    ...blank,
    tag,
    tones: tree.map((node) => (node.id === here ? "edge" : pile.includes(node.id) ? "window" : written.has(node.id) ? "hit" : "idle")),
    strips: [pileStrip(tree, pile), listStrip(list), blank.strips[2]],
  });
  const push = (caption: string, codeLine?: number, state: TreeStoryState = snap()) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  const takeQuiz = (): StoryQuiz => {
    const top = pile[pile.length - 1];
    const feedback: Record<number, string> = {};
    for (const id of pile.slice(0, -1)) feedback[id] = `${val(id)} waits lower down in the pile. Something went on after it.`;
    for (const id of written) feedback[id] = `${val(id)} is already written. Every node is written once.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: "Which node comes off the pile and is written next? Click it.",
      answer: top,
      feedback,
      otherwise: "That node is not on the pile yet. Only a node on the pile can come off.",
      why: `${val(top)} is on the top of the pile: it went on last, so it comes off first.`,
    };
  };
  const orderQuiz = (id: number): StoryQuiz => {
    const node = tree[id];
    return {
      kind: "cell",
      cells: tree.length,
      question: `Both children of ${node.val} go on the pile. Which one goes on first? Click it.`,
      answer: node.right!,
      feedback: { [node.left!]: `If ${val(node.left!)} went on first, ${val(node.right!)} would land on top and come off first. The right side would be written too early.` },
      otherwise: `Only the two children of ${node.val} go on the pile now. Think about which one must come off first.`,
      why: `The right child ${val(node.right!)} goes on first, so the left child ${val(node.left!)} lands on top and is written first.`,
    };
  };

  if (practice) {
    pile.push(0);
    push(`Your turn, on a new tree. The top node ${val(0)} is already on the pile. You decide what comes off and in which order children go on.`);
  } else {
    push("The list starts empty. So does the pile.", 1);
    pile.push(0);
    tallest = 1;
    push(`Put the top node ${val(0)} on the pile.`, 2);
  }

  while (pile.length > 0) {
    const last = frames[frames.length - 1];
    // Ask only after a node with no children: then the next node is not the one just pushed.
    if (!last.quiz && afterLeaf && (practice || !asked.take) && pile.length > 1) {
      asked.take = true;
      last.quiz = takeQuiz();
    }
    const id = pile.pop()!;
    const node = tree[id];
    here = id;
    tag = { id, text: "top" };
    if (!toldTake) {
      toldTake = true;
      push(`Take ${node.val} off the top of the pile.`, 4);
      list.push(node.val);
      written.add(id);
      tag = { id, text: "written" };
      push(`Write ${node.val} on the list at once. A node comes before both of its sides.`, 5);
    } else {
      list.push(node.val);
      written.add(id);
      tag = { id, text: "written" };
      const leaf = node.left === null && node.right === null;
      push(`Take ${node.val} off the top of the pile and write it.${leaf ? ` It has no children, so nothing goes on the pile.` : ""}`, 5);
    }

    if (node.left !== null && node.right !== null) {
      const before = frames[frames.length - 1];
      if (practice || !asked.order) {
        asked.order = true;
        before.quiz = orderQuiz(id);
      }
      pile.push(node.right);
      push(`The right child ${val(node.right)} goes on the pile first.`, 6);
      pile.push(node.left);
      tallest = Math.max(tallest, pile.length);
      push(`Then the left child ${val(node.left)} goes on, on the top.`, 7);
      if (!toldTrap && showList(wrong) !== showList(right)) {
        toldTrap = true;
        const swapped = [...pile.slice(0, -2), node.left, node.right];
        push(`${TRAP}: push ${val(node.left)} first and ${val(node.right)} second, and ${val(node.right)} is on top. The right side is written first: ${showList(wrong)}.`, 7, {
          ...snap(),
          tones: tree.map((other) => (other.id === node.right ? "miss" : other.id === here ? "edge" : swapped.includes(other.id) ? "window" : written.has(other.id) ? "hit" : "idle")),
          strips: [pileStrip(tree, swapped), listStrip(list), listStrip(wrong, "wrong list", "miss")],
          note: { text: `✕ ${val(node.right)} before the left side`, tone: "coral" },
        });
        push(`So the right child goes on first. The left child ${val(node.left)} stays on the top of the pile.`, 6);
      }
    } else if (node.left !== null || node.right !== null) {
      const child = (node.left ?? node.right)!;
      pile.push(child);
      tallest = Math.max(tallest, pile.length);
      push(`Its only child, ${val(child)}, goes on the pile.`, node.left !== null ? 7 : 6);
    }
    here = null;
    afterLeaf = node.left === null && node.right === null;
  }

  tag = null;
  const done = (): TreeStoryState => ({ ...snap(), tones: tree.map(() => "done") });
  if (practice) {
    push(`Done. The answer is ${showList(list)}. The right child always went on the pile first, so the Right-First Trap never caught you.`, undefined, done());
    return frames;
  }
  push(`The pile is empty. Every node is written. The answer is ${showList(list)}.`, 9, done());
  push(`Time: O(n). Each of the ${tree.length} nodes went on the pile once and came off once.`, 3, { ...done(), counter: { label: "nodes put on the pile", value: tree.length } });
  push(`Space: O(h), where h is the height of the tree. The pile holds the waiting right children. Here it never held more than ${tallest}, and the height is ${height(tree)}.`, 1, done());
  return frames;
}

function readTree(input: string): TreeShapeNode[] {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
}

export const binaryTreePreorderTraversalStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-144"],
  pattern: "Tree DFS",
  trigger: "a tree whose nodes must be listed “the node first, then its left side, then its right side”",
  insight: "Take the top of the pile and write it at once. Then put its right child on the pile, then its left child, so the left side comes off first.",
  metaphor: {
    name: "The to-do pile: me, left side, right side",
    legend: "pile = the stack · top = the first of the deque · written = added to the list",
    terms: ["pile", "top", "write", "written"],
  },
  traps: [{ name: TRAP, rule: "A pile gives back the last thing put on it. Put the right child on first and the left child second, so the left side is written first." }],
  template: [
    "pile = [root]",
    "while (pile is not empty) {",
    "    node = pile.pop();  use node;          // me first",
    "    push node.right;  push node.left;      // right first, so left comes off first",
    "}",
  ],
  complexity: {
    slow: "O(n·h)",
    time: "O(n)",
    timeWhy: "every node goes on the pile once and comes off once",
    space: "O(h)",
    spaceWhy: "the pile holds the right children still waiting, about one per level",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4,5]", input: "[1,2,3,4,5]", expected: "[1,2,4,5,3]" },
    { label: "[1,null,2,3]", input: "[1,null,2,3]", expected: "[1,2,3]", note: "Only right children at the top" },
    { label: "Bigger tree", input: "[1,2,3,4,5,null,8,null,null,6,7,9]", expected: "[1,2,4,5,6,7,3,8,9]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-94", title: "Binary Tree Inorder Traversal" },
    { slug: "lc-105", title: "Construct Binary Tree from Preorder and Inorder Traversal" },
  ],
  answer: (input) => {
    const tree = parseTree(input);
    return showList(solve(tree).map((id) => tree[id].val));
  },
  frames: (input) => {
    const tree = readTree(input);
    const order = solve(tree);
    const solution = solutionFrames(tree);
    const remembered = solution.find((frame) => frame.caption.startsWith("Then the left child")) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(tree, order),
      ...slowFrames(tree),
      ...insightFrames(tree),
      ...solution,
      ...solutionFrames(parseTree(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: write the top at once, then right child on, left child on top. Say the idea in your head first, then reveal the card.",
        state: { ...remembered.state, note: null },
      },
    ];
  },
  View: TreeStoryView,
};
