import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type KthFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. k is small, so most of the tree must stay untouched. */
const PRACTICE = "[6,2,8,1,4,7,9]; k=3";
const FALLBACK = "[3,1,4,null,2]; k=1";

const TRAP = "The Full List Trap";

const CODE = [
  "Deque<TreeNode> pile = new ArrayDeque<>();",
  "TreeNode curr = root;",
  "while (curr != null || !pile.isEmpty()) {",
  "    while (curr != null) {",
  "        pile.addFirst(curr);",
  "        curr = curr.left;",
  "    }",
  "    curr = pile.removeFirst();",
  "    k--;",
  "    if (k == 0) return curr.val;",
  "    curr = curr.right;",
  "}",
  "return -1;",
];

/** Pile, counted values, and one spare strip for the trap's full list. Always three, so the picture never jumps. */
const STRIPS = 3;

type Query = { tree: TreeShapeNode[]; k: number };

/** "[3,1,4,null,2]; k=1" → the tree and k. k is kept inside 1..n. */
function readQuery(input: string): Query | null {
  const [treeText = "", ...rest] = input.split(";");
  const tree = parseTree(treeText);
  const match = rest.join(";").match(/k\s*=\s*(\d+)/);
  if (tree.length === 0 || !match) return null;
  return { tree, k: Math.min(tree.length, Math.max(1, Number(match[1]))) };
}

const readOrFallback = (input: string): Query => readQuery(input) ?? (readQuery(FALLBACK) as Query);

function ordinal(n: number): string {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${tail}`;
}

/** Independent solver: sort all the values and pick number k. No tree walk involved. */
function solve({ tree, k }: Query): number {
  return tree.map((node) => node.val).sort((a, b) => a - b)[k - 1];
}

function below(tree: TreeShapeNode[], id: number | null): number[] {
  if (id === null) return [];
  return [id, ...below(tree, tree[id].left), ...below(tree, tree[id].right)];
}

function pileStrip(tree: TreeShapeNode[], pile: number[]): TreeStrip {
  return { label: "pile → top", items: pile.map((id) => ({ text: String(tree[id].val), tone: "window" as CellTone })) };
}

function valuesStrip(label: string, values: number[], tone: CellTone, strongAt = -1): TreeStrip {
  return { label, items: values.map((value, index) => ({ text: String(value), tone: index === strongAt ? "done" : tone })) };
}

function pictureFrames(query: Query): KthFrame[] {
  const { tree, k } = query;
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const top = tree[0];
  const leftSide = below(tree, top.left);
  const rightSide = below(tree, top.right);
  const sorted = tree.map((node) => node.val).sort((a, b) => a - b);
  const answer = tree.find((node) => node.val === sorted[k - 1])!;
  const sides = [leftSide.length > 0 ? `On its left: ${listWords(leftSide.map(val))}, all smaller.` : "", rightSide.length > 0 ? `On its right: ${listWords(rightSide.map(val))}, all bigger.` : ""].filter(Boolean).join(" ");
  return [
    {
      scene: "picture",
      caption: "This is a search tree. For every node, smaller values are on its left side and bigger values on its right side.",
      state: blank,
    },
    {
      scene: "picture",
      caption: `Look at the top node ${top.val}. ${sides || "It has no children here."}`,
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : leftSide.includes(node.id) ? "window" : "idle")), tag: { id: 0, text: "smaller ← · → bigger" } },
    },
    {
      scene: "picture",
      caption: `Line the values up from smallest to biggest: ${sorted.join(", ")}. The 1st smallest is ${sorted[0]}${sorted.length > 1 ? `, the 2nd smallest is ${sorted[1]}` : ""}, and so on.`,
      state: { ...blank, strips: [blank.strips[0], valuesStrip("in order", sorted, "idle"), blank.strips[2]] },
    },
    {
      scene: "picture",
      caption: `The goal: the kth smallest value. Here k is ${k}, so we want the ${ordinal(k)} smallest. That is ${answer.val}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === answer.id ? "done" : "idle")), tag: { id: answer.id, text: `${ordinal(k)} smallest` }, strips: [blank.strips[0], valuesStrip("in order", sorted, "idle", k - 1), blank.strips[2]] },
    },
  ];
}

/** The obvious way, really run: walk the whole tree into a list, then pick number k. */
function slowFrames(query: Query): KthFrame[] {
  const { tree, k } = query;
  const blank = blankTreeState(tree, STRIPS);
  const list: number[] = [];
  let visits = 0;
  const walk = (id: number | null) => {
    if (id === null) return;
    visits++;
    walk(tree[id].left);
    list.push(tree[id].val);
    walk(tree[id].right);
  };
  walk(0);
  const picked = tree.find((node) => node.val === list[k - 1])!;
  const counter = { label: "nodes visited", value: visits };
  return [
    {
      scene: "slow",
      caption: "The slow way: walk the whole tree. For every node: its left side, then the node, then its right side. In a search tree that writes the values from smallest to biggest.",
      state: { ...blank, tones: tree.map(() => "window"), strips: [blank.strips[0], valuesStrip("list", list, "idle"), blank.strips[2]], counter },
    },
    {
      scene: "slow",
      caption: `Then pick number ${k} from the list. That is ${list[k - 1]}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === picked.id ? "done" : "window")), strips: [blank.strips[0], valuesStrip("list", list, "idle", k - 1), blank.strips[2]], counter },
    },
    {
      scene: "slow",
      caption: `That visited all ${visits} nodes and kept all ${list.length} values, to use just one. It is O(n) time and O(n) space, however small k is.`,
      state: { ...blank, tones: tree.map(() => "faded"), strips: [blank.strips[0], valuesStrip("list", list, "faded", k - 1), blank.strips[2]], counter },
    },
  ];
}

function insightFrames(query: Query): KthFrame[] {
  const { tree, k } = query;
  const blank = blankTreeState(tree, STRIPS);
  const chain: number[] = [];
  for (let at: number | null = 0; at !== null; at = tree[at].left) chain.push(at);
  const smallest = tree[chain[chain.length - 1]];
  return [
    {
      scene: "insight",
      caption: `Smaller values are always on the left. So the smallest value of all is as far left as you can go from the top: ${smallest.val}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === smallest.id ? "hit" : chain.includes(node.id) ? "window" : "idle")), edges: tree.map((node) => ({ tone: chain.includes(node.id) && node.parent !== null ? "path" : "idle" })), tag: { id: smallest.id, text: "smallest" } },
    },
    {
      scene: "insight",
      caption: `Picture a pile. Every node we pass on the way left goes on it to wait. The top of the pile is always the smallest value not yet counted.`,
      state: { ...blank, tones: tree.map((node) => (chain.includes(node.id) ? "window" : "idle")), strips: [pileStrip(tree, chain), valuesStrip("counted", [], "hit"), blank.strips[2]] },
    },
    {
      scene: "insight",
      caption: `So take nodes off the top of the pile one by one, and count down from k = ${k}. When the count reaches 0, stop. The rest of the tree is never touched.`,
      state: { ...blank, tones: tree.map((node) => (chain.includes(node.id) ? "window" : "idle")), strips: [pileStrip(tree, chain), valuesStrip("counted", [], "hit"), blank.strips[2]], counter: { label: "still to count", value: k } },
    },
  ];
}

/**
 * The real algorithm, one frame per change. The first push, dead end and count are told step by step; after that one frame tells one node.
 * `practice` reuses it on a fresh tree, and the reader decides every step, including when to stop.
 */
function solutionFrames(query: Query, scene: SceneId = "solution", practice = false): KthFrame[] {
  const { tree } = query;
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const frames: KthFrame[] = [];
  const pile: number[] = [];
  const counted: number[] = [];
  const touched = new Set<number>();
  let k = query.k;
  let here: number | null = null;
  let tag: TreeStoryState["tag"] = null;
  let tallest: number[] = [];
  const shown = { stepLeft: practice, deadEnd: practice, count: practice, stepRight: practice };
  const asked = { step: false, next: false, right: false, stop: false };

  const snap = (): TreeStoryState => ({
    ...blank,
    tag,
    tones: tree.map((node) => (node.id === here ? "edge" : pile.includes(node.id) ? "window" : counted.includes(node.id) ? "hit" : "idle")),
    strips: [pileStrip(tree, pile), valuesStrip("counted", counted.map(val), "hit"), blank.strips[2]],
    counter: { label: "still to count", value: k },
  });
  const push = (caption: string, codeLine?: number, state: TreeStoryState = snap()) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  const stepQuiz = (id: number): StoryQuiz => {
    const node = tree[id];
    const feedback: Record<number, string> = { [id]: `We already stand on ${node.val}. It cannot be counted yet, because smaller values sit on its left side.` };
    if (node.right !== null) feedback[node.right] = `${val(node.right)} is on the right side of ${node.val}, so it is bigger. Smaller values must be counted first.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `${node.val} is on the pile. We are looking for smaller values. Which node do we step to next? Click it.`,
      answer: node.left!,
      feedback,
      otherwise: "We can only step to a child of the node we stand on. On which side are the smaller values?",
      why: `Everything on the left side of ${node.val} is smaller than ${node.val}, so we step to its left child ${val(node.left!)}.`,
    };
  };
  const nextQuiz = (): StoryQuiz => {
    const top = pile[pile.length - 1];
    const feedback: Record<number, string> = {};
    for (const id of pile.slice(0, -1)) feedback[id] = `${val(id)} waits lower down in the pile. Something smaller is on top of it.`;
    for (const id of counted) feedback[id] = `${val(id)} is already counted.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: "Which node holds the next smallest value? Click it.",
      answer: top,
      feedback,
      otherwise: "That node has not been reached yet. The next smallest is already waiting on the pile.",
      why: `${val(top)} is on top of the pile. Everything smaller than it is already counted, and everything else on the pile is bigger.`,
    };
  };
  const rightQuiz = (id: number): StoryQuiz => {
    const node = tree[id];
    const feedback: Record<number, string> = { [id]: `${node.val} has just been counted. It is finished.` };
    if (node.left !== null) feedback[node.left] = `The left side of ${node.val} holds smaller values. They are all counted.`;
    for (const waiting of pile) feedback[waiting] = `${val(waiting)} waits on the pile, but values between ${node.val} and ${val(waiting)} may sit on the right side of ${node.val}. They come first.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `${node.val} is counted. The next smallest value is a little bigger than ${node.val}. Which node do we step to next? Click it.`,
      answer: node.right!,
      feedback,
      otherwise: "Look just below the node that was counted. On which side are the bigger values?",
      why: `The values just bigger than ${node.val} are on its right side. We step to its right child ${val(node.right!)}, and go left from there.`,
    };
  };
  const stopQuiz = (id: number, left: number): StoryQuiz => ({
    kind: "choice",
    question: `The count has reached 0 at ${val(id)}. ${left === 0 ? "What happens now?" : `${left} ${left === 1 ? "node has" : "nodes have"} not been touched yet. What happens now?`}`,
    options: [`Walk the rest of the tree too, then pick from the full list`, `Stop here and return ${val(id)}`, `Step to the right side of ${val(id)} and keep counting`],
    answer: 1,
    why: `${val(id)} is the ${ordinal(query.k)} value to come off the pile, so it is the ${ordinal(query.k)} smallest. Every node not yet touched is bigger, and cannot change that.`,
  });

  let curr: number | null = 0;
  let arrived: "start" | "left" | "right" = "start";
  if (practice) {
    push(`Your turn, on a new search tree, with k = ${k}. The pile is empty. We start at the top node ${val(0)}, and you decide every step.`, undefined, { ...snap(), tones: tree.map((node) => (node.id === 0 ? "edge" : "idle")), tag: { id: 0, text: "here" } });
  } else {
    push(`The pile starts empty. k is ${k}, so ${k === 1 ? "1 value is" : `${k} values are`} still to count.`, 0);
    here = 0;
    tag = { id: 0, text: "here" };
    push(`We start at the top node ${val(0)}.`, 1);
  }

  let answer: number | null = null;
  while (curr !== null || pile.length > 0) {
    while (curr !== null) {
      const node: TreeShapeNode = tree[curr];
      here = node.id;
      tag = { id: node.id, text: "here" };
      pile.push(node.id);
      touched.add(node.id);
      if (pile.length > tallest.length) tallest = [...pile];
      const arrival = arrived === "start" ? (practice ? "" : `We stand on ${node.val}. `) : arrived === "left" ? `Step left to ${node.val}. ` : `Now the right side: step right to ${node.val}. `;
      const willAsk = node.left !== null && (practice || !asked.step);
      const mergedDeadEnd = node.left === null && shown.deadEnd;
      const pushed = push(
        node.left !== null
          ? willAsk
            ? `${arrival}${node.val} goes on the pile.`
            : `${arrival}Smaller values are on its left side, so ${node.val} goes on the pile to wait.`
          : mergedDeadEnd
            ? `${arrival}${node.val} goes on the pile. It has no left child, so nothing smaller than ${node.val} is left to find.`
            : `${arrival}${node.val} goes on the pile, like every node we arrive at.`,
        4,
      );
      if (willAsk) {
        asked.step = true;
        pushed.quiz = stepQuiz(node.id);
      }
      if (node.left !== null && !shown.stepLeft) {
        shown.stepLeft = true;
        here = node.left;
        tag = { id: node.left, text: "here" };
        push(`Smaller values are on the left side of ${node.val}, and they must be counted first. Step to its left child, ${val(node.left)}.`, 5);
        arrived = "start";
      } else {
        arrived = "left";
      }
      if (node.left === null && !mergedDeadEnd) {
        shown.deadEnd = true;
        push(`${node.val} has no left child. So nothing smaller than ${node.val} is left to find.`, 5);
      }
      curr = node.left;
    }

    const id = pile.pop()!;
    const node = tree[id];
    const from = k;
    here = id;
    tag = { id, text: "here" };
    if (!shown.count) {
      shown.count = true;
      push(`Take the top of the pile: ${node.val}. It is the smallest value not yet counted.`, 7);
      k--;
      counted.push(id);
      tag = { id, text: `${ordinal(counted.length)} smallest` };
      push(`Count it: ${node.val} is the ${ordinal(counted.length)} smallest. The count goes from ${from} down to ${k}.`, 8);
    } else {
      k--;
      counted.push(id);
      tag = { id, text: `${ordinal(counted.length)} smallest` };
      push(`Take ${node.val} off the top of the pile. It is the ${ordinal(counted.length)} smallest, so the count goes from ${from} down to ${k}.`, 8);
    }
    const count = frames[frames.length - 1];

    if (k === 0) {
      const untouched = tree.filter((other) => !touched.has(other.id));
      if (practice || !asked.stop) {
        asked.stop = true;
        count.quiz = stopQuiz(id, untouched.length);
      }
      answer = id;
      tag = { id, text: "answer" };
      const end = (): TreeStoryState => ({ ...snap(), tones: tree.map((other) => (other.id === id ? "done" : counted.includes(other.id) ? "hit" : pile.includes(other.id) ? "window" : "idle")) });
      if (practice) {
        push(
          untouched.length > 0
            ? `Done. The answer is ${node.val}. You stopped when the count reached 0, so ${untouched.length === 1 ? "1 node was" : `${untouched.length} nodes were`} never touched, and the Full List Trap did not catch you.`
            : `Done. The answer is ${node.val}. The count reached 0 on the very last node.`,
          undefined,
          end(),
        );
        return frames;
      }
      push(`The count is 0, so ${node.val} is the ${ordinal(query.k)} smallest. Stop here. The answer is ${node.val}.`, 9, end());
      if (untouched.length > 0) {
        const full = tree.map((other) => other.val).sort((a, b) => a - b);
        push(`${TRAP}: walk on and write all ${tree.length} values on a list, only to pick the ${ordinal(query.k)}. That touches ${untouched.length} more ${untouched.length === 1 ? "node" : "nodes"} for nothing.`, 9, {
          ...end(),
          tones: tree.map((other) => (other.id === id ? "done" : !touched.has(other.id) ? "miss" : counted.includes(other.id) ? "hit" : "window")),
          strips: [pileStrip(tree, pile), valuesStrip("counted", counted.map(val), "hit"), valuesStrip("full list", full, "miss", query.k - 1)],
          note: { text: `✕ ${untouched.length} ${untouched.length === 1 ? "node" : "nodes"} walked for nothing`, tone: "coral" },
        });
      }
      push(`Time: O(h + k), where h is the height of the tree. We went down the left at most h steps, then took ${query.k} off the pile. Only ${touched.size} of ${tree.length} nodes were touched.`, 8, {
        ...end(),
        tones: tree.map((other) => (other.id === id ? "done" : touched.has(other.id) ? "window" : "faded")),
        counter: { label: "nodes touched", value: touched.size },
      });
      push(`Space: O(h). The pile holds only nodes that wait while smaller values are counted, at most one per level. Here it never held more than ${tallest.length}.`, 0, {
        ...end(),
        tag: null,
        tones: tree.map((other) => (tallest.includes(other.id) ? "window" : "faded")),
        strips: [pileStrip(tree, tallest), valuesStrip("counted", counted.map(val), "hit"), blank.strips[2]],
      });
      return frames;
    }

    if (!practice && frames.filter((frame) => frame.codeLine === 9).length === 0) {
      push(`The count is not 0 yet, so ${node.val} is not the answer. We go on to the next smallest value.`, 9);
    }
    const last = frames[frames.length - 1];
    if (node.right !== null) {
      if (practice || !asked.right) {
        asked.right = true;
        last.quiz = rightQuiz(id);
      }
      if (!shown.stepRight) {
        shown.stepRight = true;
        here = node.right;
        tag = { id: node.right, text: "here" };
        push(`The values just bigger than ${node.val} are on its right side. Step to its right child, ${val(node.right)}.`, 10);
        arrived = "start";
      } else {
        arrived = "right";
      }
    } else if (pile.length > 0) {
      if (practice || !asked.next) {
        asked.next = true;
        last.quiz = nextQuiz();
      }
    }
    curr = node.right;
  }
  // k is kept inside 1..n, so the loop always returns above. This keeps the function total.
  push(`The answer is ${answer === null ? -1 : val(answer)}.`, 12);
  return frames;
}

export const kthSmallestInBstStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-230"],
  pattern: "Binary search tree",
  trigger: "a search tree (smaller to the left, bigger to the right) and you are asked for the kth smallest value",
  insight: "Smaller is always to the left. Go left onto a pile, take nodes off the top from smallest up, count down from k, and stop the moment the count reaches 0.",
  metaphor: {
    name: "Smaller to the left, bigger to the right: the waiting pile",
    legend: "pile = the stack · top = the first of the deque · where we stand = curr · still to count = k · stop = return as soon as k is 0",
    terms: ["pile", "top", "left", "right", "smaller", "smallest", "count"],
  },
  traps: [{ name: TRAP, rule: "Do not walk the whole tree into a list and then pick number k. Count down as nodes come off the pile, and return the moment k reaches 0." }],
  template: [
    "curr = root;  pile = empty",
    "while (curr exists or pile is not empty) {",
    "    while (curr exists) { put curr on the pile;  curr = curr.left; }   // smaller first",
    "    curr = take the top of the pile;                                    // next value in rising order",
    "    use curr, and stop early if you have enough;",
    "    curr = curr.right;",
    "}",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(h + k)",
    timeWhy: "at most h steps down the left side to reach the smallest, then k nodes come off the pile",
    space: "O(h)",
    spaceWhy: "the pile only holds nodes waiting for smaller values, at most one per level",
  },
  code: CODE,
  examples: [
    { label: "[3,1,4,null,2], k = 1", input: "[3,1,4,null,2]; k=1", expected: "1", note: "Stops after one node comes off the pile" },
    { label: "[5,3,6,2,4,null,null,1], k = 3", input: "[5,3,6,2,4,null,null,1]; k=3", expected: "3" },
    { label: "[3,1,4,null,2], k = 3", input: "[3,1,4,null,2]; k=3", expected: "3", note: "The walk has to step to a right side" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-94", title: "Binary Tree Inorder Traversal" },
    { slug: "lc-98", title: "Validate Binary Search Tree" },
    { slug: "lc-235", title: "Lowest Common Ancestor of a Binary Search Tree" },
  ],
  answer: (input) => String(solve(readOrFallback(input))),
  frames: (input) => {
    const query = readOrFallback(input);
    const solution = solutionFrames(query);
    const remembered = solution.find((frame) => frame.caption.includes("answer is")) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(query),
      ...slowFrames(query),
      ...insightFrames(query),
      ...solution,
      ...solutionFrames(readOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: count nodes as they come off the pile, and stop at 0. The rest stays untouched. Say the idea in your head first, then reveal the card.",
        state: remembered.state,
      },
    ];
  },
  View: TreeStoryView,
};
