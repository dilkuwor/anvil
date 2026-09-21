import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type WalkFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. Its top node has a left child, so taking it off the pile at once would go wrong. */
const PRACTICE = "[5,3,8,null,4,7]";
const FALLBACK = "[1,null,2,3]";

const TRAP = "The Early Pop Trap";

const CODE = [
  "List<Integer> list = new ArrayList<>();",
  "Deque<TreeNode> pile = new ArrayDeque<>();",
  "TreeNode curr = root;",
  "while (curr != null || !pile.isEmpty()) {",
  "    while (curr != null) {",
  "        pile.addFirst(curr);",
  "        curr = curr.left;",
  "    }",
  "    curr = pile.removeFirst();",
  "    list.add(curr.val);",
  "    curr = curr.right;",
  "}",
  "return list;",
];

/** Pile, list, and one spare strip for the trap's wrong list. Always three, so the picture never jumps. */
const STRIPS = 3;

const showList = (values: number[]) => `[${values.join(",")}]`;

/** Independent solver: the plain rule, left side, then the node, then the right side. No pile involved. Also counts its own calls. */
function solve(tree: TreeShapeNode[]): { order: number[]; calls: number; emptyCalls: number; deepest: number } {
  const order: number[] = [];
  let calls = 0;
  let emptyCalls = 0;
  let deepest = 0;
  const walk = (id: number | null, depth: number) => {
    calls++;
    if (id === null) {
      emptyCalls++;
      return;
    }
    deepest = Math.max(deepest, depth);
    walk(tree[id].left, depth + 1);
    order.push(id);
    walk(tree[id].right, depth + 1);
  };
  walk(tree.length > 0 ? 0 : null, 1);
  return { order, calls, emptyCalls, deepest };
}

/** The trap, really run: each node is taken off the pile right after it went on, without first going all the way left. */
function solveWithEarlyPop(tree: TreeShapeNode[]): number[] {
  const list: number[] = [];
  const pile: number[] = [];
  let curr: number | null = tree.length > 0 ? 0 : null;
  while (curr !== null || pile.length > 0) {
    if (curr !== null) {
      pile.push(curr);
      curr = tree[curr].left;
    }
    curr = pile.pop()!;
    list.push(tree[curr].val);
    curr = tree[curr].right;
  }
  return list;
}

function below(tree: TreeShapeNode[], id: number | null): number[] {
  if (id === null) return [];
  return [id, ...below(tree, tree[id].left), ...below(tree, tree[id].right)];
}

function pileStrip(tree: TreeShapeNode[], pile: number[]): TreeStrip {
  return { label: "pile → top", items: pile.map((id) => ({ text: String(tree[id].val), tone: "window" as CellTone })) };
}

function listStrip(values: number[], label = "list", tone: CellTone = "done"): TreeStrip {
  return { label, items: values.map((value) => ({ text: String(value), tone })) };
}

/** The node the story explains the rule on: the first one met that has a left side, else the top. */
function firstWithLeft(tree: TreeShapeNode[]): TreeShapeNode {
  return tree.find((node) => node.left !== null) ?? tree[0];
}

function pictureFrames(tree: TreeShapeNode[], order: number[]): WalkFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const node = firstWithLeft(tree);
  const leftSide = below(tree, node.left);
  const rightSide = below(tree, node.right);
  const sides = `${leftSide.length > 0 ? `its left side (${listWords(leftSide.map(val))})` : "its left side (empty here)"}, then ${node.val} itself, then ${rightSide.length > 0 ? `its right side (${listWords(rightSide.map(val))})` : "its right side (empty here)"}`;
  const allowedOrder = [...[...leftSide].sort((a, b) => order.indexOf(a) - order.indexOf(b)), node.id];
  const wrongOrder = [node.id, ...allowedOrder.slice(0, -1)];
  return [
    { scene: "picture", caption: `This is a tree. The node ${val(0)} is at the top. Each node can have a left child and a right child below it.`, state: blank },
    {
      scene: "picture",
      caption: `We must write every node on a list, in one fixed order. The rule for the node ${node.val}: first ${sides}.`,
      state: { ...blank, tones: tree.map((other) => (other.id === node.id ? "edge" : leftSide.includes(other.id) ? "hit" : rightSide.includes(other.id) ? "window" : "idle")), tag: { id: node.id, text: "left side first" } },
    },
    leftSide.length > 0
      ? {
          scene: "picture",
          caption: `The same rule holds inside each side. Writing ${allowedOrder.map(val).join(", ")} is allowed. Writing ${wrongOrder.map(val).join(", ")} is not: ${node.val} would come before its left side.`,
          state: {
            ...blank,
            tones: tree.map((other) => (other.id === node.id ? "edge" : leftSide.includes(other.id) ? "hit" : "idle")),
            strips: [listStrip(allowedOrder.map(val), "allowed"), listStrip(wrongOrder.map(val), "not allowed", "miss"), blank.strips[2]],
          },
        }
      : {
          scene: "picture",
          caption: `The same rule holds inside each side. ${node.val} has nothing on its left, so ${node.val} is written before anything on its right.`,
          state: { ...blank, tones: tree.map((other) => (other.id === node.id ? "edge" : "idle")) },
        },
    {
      scene: "picture",
      caption: `The goal: the whole tree written by this rule. Here that is ${showList(order.map(val))}.`,
      state: { ...blank, tones: tree.map(() => "hit"), strips: [blank.strips[0], listStrip(order.map(val)), blank.strips[2]] },
    },
  ];
}

/** The plain way, really run: a helper that calls itself. Same answer and same O(n), but the waiting is hidden. */
function slowFrames(tree: TreeShapeNode[], solved: ReturnType<typeof solve>): WalkFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const values = solved.order.map((id) => tree[id].val);
  const chain: number[] = [];
  for (let at: number | null = 0; at !== null; at = tree[at].left) chain.push(at);
  return [
    {
      scene: "slow",
      caption: "The plain way: a helper that calls itself. For a node it calls itself on the left child, writes the node, then calls itself on the right child.",
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : "idle")), counter: { label: "calls", value: 1 } },
    },
    {
      scene: "slow",
      caption: `It is also called on every empty spot below a node, only to find nothing there. Here that makes ${solved.calls} calls, and ${solved.emptyCalls} of them found nothing.`,
      state: { ...blank, tones: tree.map(() => "window"), strips: [blank.strips[0], listStrip(values), blank.strips[2]], counter: { label: "calls", value: solved.calls } },
    },
    {
      scene: "slow",
      caption: `While a call works on a left side, the call above it waits. That waiting is out of sight, inside the computer. Here up to ${solved.deepest} calls waited at once.`,
      state: { ...blank, tones: tree.map((node) => (chain.includes(node.id) ? "window" : "faded")), strips: [blank.strips[0], listStrip(values), blank.strips[2]], counter: { label: "calls", value: solved.calls } },
    },
    {
      scene: "slow",
      caption: "The answer is right, and it is O(n) time. But on a very tall tree the hidden waiting can run out of room. We can do the waiting ourselves, in plain sight.",
      state: { ...blank, tones: tree.map(() => "faded"), strips: [blank.strips[0], listStrip(values), blank.strips[2]], counter: { label: "calls", value: solved.calls } },
    },
  ];
}

function insightFrames(tree: TreeShapeNode[]): WalkFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const node = firstWithLeft(tree);
  const chain: number[] = [];
  for (let at: number | null = node.id; at !== null; at = tree[at].left) chain.push(at);
  const last = tree[chain[chain.length - 1]];
  const waiting = chain.map((id) => tree[id].val);
  return [
    {
      scene: "insight",
      caption: `We arrive at ${node.val}. ${node.left !== null ? "It cannot be written yet, because its left side comes first." : "It has no left side, but the habit is the same."} So picture a pile, and put ${node.val} on it to wait.`,
      state: { ...blank, tones: tree.map((other) => (other.id === node.id ? "window" : "idle")), strips: [pileStrip(tree, [node.id]), listStrip([]), blank.strips[2]], tag: { id: node.id, text: "waits" } },
    },
    {
      scene: "insight",
      caption:
        chain.length > 1
          ? `Keep stepping left, and put every node you pass on the pile: ${listWords(waiting)}. Stop when there is no more left to go.`
          : `From ${node.val} there is no more left to go. The pile holds only ${node.val}.`,
      state: { ...blank, tones: tree.map((other) => (chain.includes(other.id) ? "window" : "idle")), strips: [pileStrip(tree, chain), listStrip([]), blank.strips[2]] },
    },
    {
      scene: "insight",
      caption: `Now the top of the pile, ${last.val}, has nothing left of it that is unwritten. Take it off, write it, and then walk its right side in the same way.`,
      state: {
        ...blank,
        tones: tree.map((other) => (other.id === last.id ? "hit" : chain.includes(other.id) ? "window" : "idle")),
        strips: [pileStrip(tree, chain.slice(0, -1)), listStrip([last.val]), blank.strips[2]],
        tag: { id: last.id, text: "written" },
      },
    },
  ];
}

/**
 * The real algorithm, one frame per change. The first push, the first dead end and the first pop are told step by step;
 * after that one frame tells one node. `practice` reuses it on a fresh tree, and the reader decides every step.
 */
function solutionFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): WalkFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const frames: WalkFrame[] = [];
  const wrong = solveWithEarlyPop(tree);
  const pile: number[] = [];
  const list: number[] = [];
  const written = new Set<number>();
  let here: number | null = null;
  let tag: TreeStoryState["tag"] = null;
  let note: TreeStoryState["note"] = null;
  let tallest: number[] = [];
  const shown = { stepLeft: practice, deadEnd: practice, pop: practice, stepRight: practice, trap: practice };
  const asked = { step: false, take: false, right: false };

  const snap = (): TreeStoryState => ({
    ...blank,
    tag,
    note,
    tones: tree.map((node) => (node.id === here ? "edge" : pile.includes(node.id) ? "window" : written.has(node.id) ? "hit" : "idle")),
    strips: [pileStrip(tree, pile), listStrip(list), blank.strips[2]],
  });
  const push = (caption: string, codeLine?: number, state: TreeStoryState = snap()) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  const stepQuiz = (id: number): StoryQuiz => {
    const node = tree[id];
    const feedback: Record<number, string> = { [id]: `We already stand on ${node.val}, and it has just gone on the pile. It must wait there: writing it now would put it before its left side.` };
    if (node.right !== null) feedback[node.right] = `${val(node.right)} is on the right side of ${node.val}. The right side is walked only after ${node.val} itself is written.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `${node.val} is on the pile. Which node do we step to next? Click it.`,
      answer: node.left!,
      feedback,
      otherwise: "We can only step to a child of the node we stand on. Which side comes first?",
      why: `The left side of ${node.val} must be written before ${node.val}, so we step to its left child ${val(node.left!)}.`,
    };
  };
  const takeQuiz = (): StoryQuiz => {
    const top = pile[pile.length - 1];
    const feedback: Record<number, string> = {};
    for (const id of pile.slice(0, -1)) feedback[id] = `${val(id)} waits lower down in the pile. Something on its left side is still unwritten.`;
    for (const id of written) feedback[id] = `${val(id)} is already on the list. Every node is written once.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: "Which node is written on the list next? Click it.",
      answer: top,
      feedback,
      otherwise: "That node has not been reached yet. The next one to be written is already waiting on the pile.",
      why: `${val(top)} is on top of the pile: it went on last, so it is the lowest node still waiting, and its left side is finished.`,
    };
  };
  const rightQuiz = (id: number): StoryQuiz => {
    const node = tree[id];
    const feedback: Record<number, string> = { [id]: `${node.val} has just been written. It is finished.` };
    if (node.left !== null) feedback[node.left] = `The left side of ${node.val} was written before ${node.val}. It is finished.`;
    for (const waiting of pile) feedback[waiting] = `${val(waiting)} still waits on the pile. The right side of ${node.val} comes before it.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `${node.val} is written. Which node do we step to next? Click it.`,
      answer: node.right!,
      feedback,
      otherwise: "Left side, then the node itself, then what? Look just below the node that was written.",
      why: `After ${node.val} comes its right side. We step to its right child ${val(node.right!)}, and walk that side in the same way.`,
    };
  };

  let curr: number | null = 0;
  let arrived: "start" | "left" | "right" = "start";
  if (practice) {
    push(`Your turn, on a new tree. The pile and the list are empty. We start at the top node ${val(0)}, and you decide every step.`, undefined, { ...snap(), tones: tree.map((node) => (node.id === 0 ? "edge" : "idle")), tag: { id: 0, text: "here" } });
  } else {
    push("The list starts empty. So does the pile.", 1);
    here = 0;
    tag = { id: 0, text: "here" };
    push(`We start at the top node ${val(0)}.`, 2);
  }

  while (curr !== null || pile.length > 0) {
    while (curr !== null) {
      const node: TreeShapeNode = tree[curr];
      here = node.id;
      tag = { id: node.id, text: "here" };
      pile.push(node.id);
      if (pile.length > tallest.length) tallest = [...pile];
      const arrival = arrived === "start" ? (practice ? "" : `We stand on ${node.val}. `) : arrived === "left" ? `Step left to ${node.val}. ` : `Now the right side: step right to ${node.val}. `;
      const mergedDeadEnd = node.left === null && shown.deadEnd;
      const willAsk = node.left !== null && (practice || !asked.step);
      const pushed = push(
        node.left !== null
          ? willAsk
            ? `${arrival}${node.val} goes on the pile.`
            : `${arrival}Its left side must be written first, so ${node.val} goes on the pile to wait.`
          : mergedDeadEnd
            ? `${arrival}${node.val} goes on the pile. It has no left child, so there is no more left to go.`
            : `${arrival}${node.val} goes on the pile, like every node we arrive at.`,
        5,
      );
      if (willAsk) {
        asked.step = true;
        pushed.quiz = stepQuiz(node.id);
      }

      if (node.left !== null && !shown.stepLeft && !practice) {
        shown.stepLeft = true;
        here = node.left;
        tag = { id: node.left, text: "here" };
        push(`The left side of ${node.val} must be written first. Step to its left child, ${val(node.left)}.`, 6);
        if (!shown.trap && showList(wrong) !== showList(solve(tree).order.map(val))) {
          shown.trap = true;
          push(`${TRAP}: take ${node.val} off the pile right away, and it is written before its left side. Done like that, the whole list would come out as ${showList(wrong)}.`, 8, {
            ...snap(),
            tones: tree.map((other) => (other.id === node.id ? "miss" : other.id === here ? "edge" : "idle")),
            strips: [pileStrip(tree, pile), listStrip(list), listStrip(wrong, "wrong list", "miss")],
            note: { text: `✕ ${node.val} written before its left side`, tone: "coral" },
          });
          // Back to the true picture, so the next frame changes only one thing.
          push(`So ${node.val} stays on the pile. Nothing comes off the pile until there is no more left to go.`, 4);
        }
        arrived = "start";
      } else {
        arrived = "left";
      }
      if (node.left === null && !mergedDeadEnd) {
        shown.deadEnd = true;
        here = null;
        tag = null;
        note = { text: `no left child below ${node.val}`, tone: "accent" };
        push(`${node.val} has no left child. There is no more left to go.`, 6);
      }
      curr = node.left;
      if (curr !== null && arrived === "start") {
        // The step was already shown in its own frame: the next frame only tells the push.
        here = curr;
      }
    }

    note = null;
    const id = pile.pop()!;
    const node = tree[id];
    here = id;
    tag = { id, text: "here" };
    if (!shown.pop && !practice) {
      shown.pop = true;
      push(`Take the top of the pile: ${node.val}. Everything on its left side is written${node.left === null ? ", because there is nothing there" : ""}.`, 8);
      list.push(node.val);
      written.add(id);
      tag = { id, text: "written" };
      push(`Write ${node.val} on the list.`, 9);
    } else {
      list.push(node.val);
      written.add(id);
      tag = { id, text: "written" };
      const last = node.right === null && pile.length === 0;
      push(`Take ${node.val} off the top of the pile and write it on the list.${node.right === null ? ` It has no right child${last ? ", and the pile is empty" : ", so we go back to the pile"}.` : ""}`, 9);
    }
    const wrote = frames[frames.length - 1];
    if (node.right !== null) {
      if (practice || !asked.right) {
        asked.right = true;
        wrote.quiz = rightQuiz(id);
      }
      if (!shown.stepRight && !practice) {
        shown.stepRight = true;
        here = node.right;
        tag = { id: node.right, text: "here" };
        push(`After ${node.val} comes its right side. Step to its right child, ${val(node.right)}.`, 10);
        arrived = "start";
      } else {
        arrived = "right";
      }
    } else if (shown.pop && !shown.stepRight && !practice && wrote.caption.startsWith("Write")) {
      here = null;
      tag = null;
      push(`After ${node.val} comes its right side. ${node.val} has no right child, so there is nothing to walk there. Back to the pile.`, 10);
    }
    const end = frames[frames.length - 1];
    if (node.right === null && pile.length > 0 && !end.quiz && (practice || !asked.take)) {
      asked.take = true;
      end.quiz = takeQuiz();
    }
    curr = node.right;
  }

  here = null;
  tag = null;
  if (practice) {
    push(`Done. The answer is ${showList(list)}. No node left the pile before its left side was written, so the Early Pop Trap never caught you.`, undefined, { ...snap(), tones: tree.map(() => "done") });
    return frames;
  }
  const done = (): TreeStoryState => ({ ...snap(), tones: tree.map(() => "done") });
  push(`Nowhere to step, and the pile is empty. Every node is written. The answer is ${showList(list)}.`, 12, done());
  const rising = list.length > 1 && list.every((value, index) => index === 0 || list[index - 1] < value);
  if (rising) push("Look at the list: it rises. In this tree every left side holds smaller values and every right side bigger ones, so left side first means smallest first.", 12, done());
  push(`Time: O(n). Each of the ${tree.length} nodes went on the pile once and came off once.`, 5, { ...done(), counter: { label: "nodes put on the pile", value: tree.length } });
  push(`Space: O(h), where h is the height of the tree. The pile holds only nodes that wait for their left side. Here it never held more than ${tallest.length}.`, 1, {
    ...done(),
    tones: tree.map((node) => (tallest.includes(node.id) ? "window" : "faded")),
    strips: [pileStrip(tree, tallest), listStrip(list), blank.strips[2]],
  });
  return frames;
}

function readTree(input: string): TreeShapeNode[] {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
}

export const binaryTreeInorderTraversalStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-94"],
  pattern: "Tree DFS",
  trigger: "a tree whose nodes must be listed “left side, then the node, then right side” (in a search tree: from smallest to biggest)",
  insight: "A node waits on a pile while its left side is written. Go left until there is no more left to go, take the top of the pile, write it, then walk its right side the same way.",
  metaphor: {
    name: "The waiting pile: left side, me, right side",
    legend: "pile = the stack · top = the first of the deque · where we stand = curr · no more left to go = curr is null · list = the result",
    terms: ["pile", "top", "left", "right", "written"],
  },
  traps: [{ name: TRAP, rule: "Never take a node off the pile right after putting it on. Keep pushing left children until there is no more left to go, and only then pop." }],
  template: [
    "curr = root;  pile = empty",
    "while (curr exists or pile is not empty) {",
    "    while (curr exists) { pile.push(curr);  curr = curr.left; }   // all the way left first",
    "    curr = pile.pop();",
    "    use curr;                                                      // its left side is finished",
    "    curr = curr.right;",
    "}",
  ],
  complexity: {
    slow: "O(n), with the waiting hidden inside recursion",
    time: "O(n)",
    timeWhy: "every node goes on the pile once and comes off once",
    space: "O(h)",
    spaceWhy: "the pile only holds nodes waiting for their left side, at most one per level",
  },
  code: CODE,
  examples: [
    { label: "[1,null,2,3]", input: "[1,null,2,3]", expected: "[1,3,2]" },
    { label: "Search tree of 5", input: "[4,2,6,1,3]", expected: "[1,2,3,4,6]", note: "Smaller to the left, bigger to the right: the list rises" },
    { label: "Only left children", input: "[3,2,null,1]", expected: "[1,2,3]", note: "The pile grows as tall as the tree" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-230", title: "Kth Smallest Element in a BST" },
    { slug: "lc-98", title: "Validate Binary Search Tree" },
  ],
  answer: (input) => {
    const tree = parseTree(input);
    return showList(solve(tree).order.map((id) => tree[id].val));
  },
  frames: (input) => {
    const tree = readTree(input);
    const solved = solve(tree);
    const solution = solutionFrames(tree);
    const remembered = solution.find((frame) => frame.caption.includes("no more left to go") && !frame.caption.includes("Trap") && !frame.caption.startsWith("So ")) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(tree, solved.order),
      ...slowFrames(tree, solved),
      ...insightFrames(tree),
      ...solution,
      ...solutionFrames(parseTree(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: nodes wait on the pile until there is no more left to go. Say the idea in your head first, then reveal the card.",
        state: { ...remembered.state, tag: null, note: null },
      },
    ];
  },
  View: TreeStoryView,
};
