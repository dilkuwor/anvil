import type { CellTone } from "@/components/learn/viz/primitives";

import { Rec05TreeView, blankRec05State, listSeats, type Rec05EdgeTone, type Rec05TreeState } from "../rec05-tree-view";
import { parseTree, type TreeShapeNode } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type SeatFrame = StoryFrame<Rec05TreeState>;

/** Fresh input for the "your turn" run: the guest turns left, then right, then right again. */
const PRACTICE = "[8,3,10,1,6]\n7";
const FALLBACK = "[4,2,7,1,3]\n5";

const TRAP = "The Lost Link Trap";

const CODE = [
  "if (root == null) return new TreeNode(val);",
  "TreeNode node = root;",
  "while (true) {",
  "    TreeNode next = val < node.val ? node.left : node.right;",
  "    if (next == null) break;",
  "    node = next;",
  "}",
  "TreeNode fresh = new TreeNode(val);",
  "if (val < node.val) node.left = fresh;",
  "else node.right = fresh;",
  "return root;",
];

type Input = { tree: TreeShapeNode[]; val: number };

function readInput(input: string): Input {
  const [treeLine = "[]", valLine = "0"] = input.split("\n");
  return { tree: parseTree(treeLine), val: Number(valLine.trim()) };
}

/** Independent solver: real node objects, the usual recursive insert, then level order with nulls trimmed. */
type Obj = { val: number; left: Obj | null; right: Obj | null };

function solve(input: string): string {
  const [treeLine = "[]", valLine = "0"] = input.split("\n");
  const tokens = treeLine.replace(/[[\]\s]/g, "").split(",").filter((token) => token.length > 0);
  const make = (token: string | undefined): Obj | null => (token === undefined || token === "null" ? null : { val: Number(token), left: null, right: null });
  let root = make(tokens[0]);
  const queue: Obj[] = root ? [root] : [];
  let next = 1;
  for (let at = 0; at < queue.length && next < tokens.length; at++) {
    queue[at].left = make(tokens[next++]);
    if (queue[at].left) queue.push(queue[at].left!);
    queue[at].right = make(tokens[next++]);
    if (queue[at].right) queue.push(queue[at].right!);
  }
  const insert = (node: Obj | null, val: number): Obj => {
    if (node === null) return { val, left: null, right: null };
    if (val < node.val) node.left = insert(node.left, val);
    else node.right = insert(node.right, val);
    return node;
  };
  root = insert(root, Number(valLine.trim()));
  const out: string[] = [];
  const line: (Obj | null)[] = [root];
  for (let at = 0; at < line.length; at++) {
    const node = line[at];
    out.push(node ? String(node.val) : "null");
    if (node) line.push(node.left, node.right);
  }
  while (out.length > 0 && out[out.length - 1] === "null") out.pop();
  return `[${out.join(",")}]`;
}

/** The guest's real walk: the nodes it stands on, and the side of the last one where the seat is. */
function walk(tree: TreeShapeNode[], val: number): { path: number[]; side: "left" | "right" } {
  const path: number[] = [];
  let node = 0;
  for (;;) {
    path.push(node);
    const side = val < tree[node].val ? "left" : "right";
    const next = tree[node][side];
    if (next === null) return { path, side };
    node = next;
  }
}

function withNewNode(tree: TreeShapeNode[], parent: number, side: "left" | "right", val: number): TreeShapeNode[] {
  const grown = tree.map((node) => ({ ...node }));
  const id = grown.length;
  grown.push({ id, val, left: null, right: null, parent, depth: tree[parent].depth + 1 });
  grown[parent][side] = id;
  return grown;
}

function below(tree: TreeShapeNode[], id: number | null): number[] {
  if (id === null) return [];
  return [id, ...below(tree, tree[id].left), ...below(tree, tree[id].right)];
}

/** Range of values a seat allows, from the nodes above it. */
function seatRange(tree: TreeShapeNode[], parent: number, side: "left" | "right"): { low: number | null; high: number | null } {
  let low: number | null = null;
  let high: number | null = null;
  let child: number | null = null;
  let childSide = side;
  for (let at: number | null = parent; at !== null; at = tree[at].parent) {
    const onLeft = child === null ? childSide === "left" : tree[at].left === child;
    if (onLeft && high === null) high = tree[at].val;
    if (!onLeft && low === null) low = tree[at].val;
    child = at;
    childSide = onLeft ? "left" : "right";
  }
  return { low, high };
}

function rangeWords(range: { low: number | null; high: number | null }): string {
  if (range.low === null && range.high === null) return "any value";
  if (range.low === null) return `only values below ${range.high}`;
  if (range.high === null) return `only values above ${range.low}`;
  return `only values between ${range.low} and ${range.high}`;
}

function pictureFrames({ tree, val }: Input): SeatFrame[] {
  const blank = blankRec05State(tree);
  const note = { text: `new value: ${val}`, tone: "accent" as const };
  return [
    { scene: "picture", caption: "This is a search tree. At every node, smaller values sit on its left side and bigger values sit on its right side.", state: blank },
    { scene: "picture", caption: `We must add the value ${val}. Afterwards the rule must still hold at every node.`, state: { ...blank, note } },
    { scene: "picture", caption: "The small dashed rings are empty seats: places where a node has no child yet.", state: { ...blank, note, seats: true } },
    { scene: "picture", caption: `The goal: add ${val} as a new node without moving any old node, and return the top node ${tree[0].val}.`, state: { ...blank, note, seats: true, tones: tree.map((node) => (node.id === 0 ? "hit" : "idle")) } },
  ];
}

function slowFrames({ tree, val }: Input): SeatFrame[] {
  const blank = { ...blankRec05State(tree), seats: true };
  const seats = listSeats(tree);
  const ranges = seats.map((seat) => seatRange(tree, seat.parent, seat.side));
  const fits = ranges.findIndex((range) => (range.low === null || val > range.low) && (range.high === null || val < range.high));
  const checked = (count: number, last: CellTone) => seats.map((_, index): CellTone => (index < count - 1 ? "faded" : index === count - 1 ? last : "idle"));
  const first = seats[0];
  const frames: SeatFrame[] = [
    {
      scene: "slow",
      caption: "The slow way: look at every empty seat, one by one, from left to right. Each seat allows only one range of values.",
      state: { ...blank, counter: { label: "seats checked", value: 0 } },
    },
    {
      scene: "slow",
      caption: `The seat ${first.side} of ${tree[first.parent].val} allows ${rangeWords(ranges[0])}. ${fits === 0 ? `${val} fits here.` : `${val} does not fit.`}`,
      state: { ...blank, seatTones: checked(1, fits === 0 ? "done" : "miss"), counter: { label: "seats checked", value: 1 } },
    },
  ];
  if (fits > 0) {
    frames.push({
      scene: "slow",
      caption: `Only seat number ${fits + 1} fits: the seat ${seats[fits].side} of ${tree[seats[fits].parent].val} allows ${rangeWords(ranges[fits])}. Every seat before it was a wasted check.`,
      state: { ...blank, seatTones: checked(fits + 1, "done"), counter: { label: "seats checked", value: fits + 1 } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `A tree of n nodes has n + 1 seats, and the right one may be the last. That is O(n) time. Here there are ${seats.length} seats.`,
    state: { ...blank, tones: tree.map(() => "faded"), seatTones: seats.map((_, index) => (index === fits ? "done" : "faded")), counter: { label: "seats checked", value: fits + 1 } },
  });
  return frames;
}

function insightFrames({ tree, val }: Input): SeatFrame[] {
  const blank = { ...blankRec05State(tree), seats: true };
  const top = tree[0];
  const side = val < top.val ? "left" : "right";
  const other = side === "left" ? top.right : top.left;
  const ruledOut = below(tree, other);
  const seats = listSeats(tree);
  return [
    {
      scene: "insight",
      caption: `Picture ${val} as a guest looking for a seat. It starts at the top node ${top.val} and asks one question: am I smaller or bigger?`,
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : "idle")), tag: { id: 0, text: `guest ${val}` } },
    },
    {
      scene: "insight",
      caption: `${val} is ${side === "left" ? "smaller" : "bigger"} than ${top.val}, so it goes ${side}. Everything on the other side is ruled out at once, seats and all.`,
      state: {
        ...blank,
        tones: tree.map((node) => (node.id === 0 ? "window" : ruledOut.includes(node.id) ? "faded" : "idle")),
        seatTones: seats.map((seat) => (ruledOut.includes(seat.parent) || (seat.parent === 0 && seat.side !== side) ? "faded" : "idle")),
      },
    },
    {
      scene: "insight",
      caption: "The guest asks the same question at each node on its way down. It stops at the first empty seat it meets. That seat is the only one that fits, and no old node moves.",
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "window" : ruledOut.includes(node.id) ? "faded" : "idle")) },
    },
  ];
}

/**
 * The real walk, one frame per change. `practice` reuses it on a fresh input, and the reader
 * chooses every step, the seat, and what must happen to the new node.
 */
function solutionFrames({ tree, val }: Input, scene: SceneId = "solution", practice = false): SeatFrame[] {
  const frames: SeatFrame[] = [];
  const seats = listSeats(tree);
  const { path, side } = walk(tree, val);
  const parent = path[path.length - 1];
  const seatIndex = seats.findIndex((seat) => seat.parent === parent && seat.side === side);
  const grown = withNewNode(tree, parent, side, val);
  const newId = tree.length;
  const ruledOut = new Set<number>();
  let here = 0;
  const push = (caption: string, codeLine: number | undefined, state: Rec05TreeState) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  const walking = (): Rec05TreeState => ({
    ...blankRec05State(tree),
    seats: true,
    tones: tree.map((node): CellTone => (node.id === here ? "edge" : path.slice(0, path.indexOf(here)).includes(node.id) ? "window" : ruledOut.has(node.id) ? "faded" : "idle")),
    edges: tree.map((node): Rec05EdgeTone => (path.includes(node.id) && path.indexOf(node.id) <= path.indexOf(here) && node.id !== 0 ? "path" : ruledOut.has(node.id) ? "faded" : "idle")),
    seatTones: seats.map((seat) => (ruledOut.has(seat.parent) ? "faded" : "idle")),
    tag: { id: here, text: `guest ${val}` },
    note: { text: `new value: ${val}`, tone: "accent" },
  });

  const stepQuiz = (at: number): StoryQuiz => {
    const node = tree[at];
    const goesLeft = val < node.val;
    const cellOf = (which: "left" | "right") => {
      const child = node[which];
      return child !== null ? child : tree.length + seats.findIndex((seat) => seat.parent === at && seat.side === which);
    };
    const wrong = cellOf(goesLeft ? "right" : "left");
    return {
      kind: "cell",
      cells: tree.length + seats.length,
      question: `The guest ${val} stands at ${node.val}. Where does it go next? Click that node or seat.`,
      answer: cellOf(goesLeft ? "left" : "right"),
      feedback: { [wrong]: `${val} is ${goesLeft ? "smaller" : "bigger"} than ${node.val}, so it belongs on the ${goesLeft ? "left" : "right"} side, not this one.` },
      otherwise: `The guest only ever moves one step down from ${node.val}, to one of its two children or empty seats.`,
      why: `${val} is ${goesLeft ? "smaller" : "bigger"} than ${node.val}, so the guest goes ${goesLeft ? "left" : "right"}.`,
    };
  };

  push(
    practice ? `Your turn. The guest ${val} starts at the top node ${tree[0].val}. You choose every step.` : `The guest ${val} starts at the top node ${tree[0].val}.`,
    1,
    walking(),
  );
  let askedStep = false;
  for (let step = 0; step < path.length; step++) {
    const at = path[step];
    const node = tree[at];
    const goesLeft = val < node.val;
    const last = frames[frames.length - 1];
    const final = step === path.length - 1;
    if (practice || !askedStep || final) {
      askedStep = true;
      last.quiz = stepQuiz(at);
    }
    const away = goesLeft ? node.right : node.left;
    for (const id of below(tree, away)) ruledOut.add(id);
    if (!final) {
      here = path[step + 1];
      push(`${val} is ${goesLeft ? "smaller" : "bigger"} than ${node.val}, so the guest goes ${goesLeft ? "left" : "right"}, to ${tree[here].val}. The other side is ruled out.`, 5, walking());
    } else {
      push(`${val} is ${goesLeft ? "smaller" : "bigger"} than ${node.val}, and ${node.val} has no ${side} child. The guest has found its empty seat.`, 4, {
        ...walking(),
        seatTones: seats.map((seat, index) => (index === seatIndex ? "edge" : ruledOut.has(seat.parent) ? "faded" : "idle")),
      });
    }
  }

  const pathTones = (tone: CellTone): CellTone[] => grown.map((node) => (node.id === newId ? tone : path.includes(node.id) ? "window" : ruledOut.has(node.id) ? "faded" : "idle"));
  const pathEdges = (newEdge: Rec05EdgeTone): Rec05EdgeTone[] => grown.map((node) => (node.id === newId ? newEdge : path.includes(node.id) && node.id !== 0 ? "path" : ruledOut.has(node.id) ? "faded" : "idle"));
  const made = push(`A new node ${val} is made for this seat.`, 7, { ...blankRec05State(grown), tones: pathTones("edge"), edges: pathEdges("loose"), tag: { id: newId, text: "new" } });
  if (practice) {
    made.quiz = {
      kind: "choice",
      question: `The new node ${val} is made. What must happen before we return?`,
      options: [`Set the ${side} child of ${tree[parent].val} to the new node`, `Return the new node ${val}`, "Nothing: the node already sits in its seat"],
      answer: 0,
      why: `Until ${tree[parent].val} points to it, the new node is not part of the tree.`,
    };
  } else {
    push(`${TRAP}: making the node is not enough. If ${tree[parent].val} never points to it, the tree stays as it was and ${val} is lost.`, 7, {
      ...blankRec05State(grown),
      tones: pathTones("miss"),
      edges: pathEdges("loose"),
      note: { text: "✕ not hooked on", tone: "coral" },
    });
  }
  push(`The ${side} child of ${tree[parent].val} is set to the new node. Now ${val} is hooked on and sits in its seat.`, side === "left" ? 8 : 9, {
    ...blankRec05State(grown),
    tones: pathTones("done"),
    edges: pathEdges("done"),
  });
  const answer = solve(`${treeText(tree)}\n${val}`);
  const finalState: Rec05TreeState = { ...blankRec05State(grown), tones: grown.map((node) => (node.id === newId ? "done" : node.id === 0 ? "hit" : "idle")), edges: grown.map((node) => (node.id === newId ? "done" : "idle")), tag: { id: 0, text: "top" } };
  if (practice) {
    push(`Done. The answer is ${answer}. You walked down, found the seat, and hooked the new node on, so the Lost Link Trap never caught you.`, undefined, finalState);
    return frames;
  }
  push(`Return the old top ${tree[0].val}, not the new node. The answer is ${answer}.`, 10, finalState);
  push(`Time: O(h), where h is the height of the tree. The guest checked one node per level: ${path.length} checked, out of ${tree.length}.`, 3, {
    ...blankRec05State(grown),
    tones: grown.map((node) => (path.includes(node.id) ? "window" : node.id === newId ? "done" : "faded")),
    edges: pathEdges("done"),
    counter: { label: "nodes checked", value: path.length },
  });
  push("Space: O(1). One pointer walked down and one new node was made. Nothing piles up on the way.", 1, {
    ...blankRec05State(grown),
    tones: grown.map((node) => (node.id === newId ? "done" : "idle")),
    tag: { id: newId, text: "one new node" },
  });
  return frames;
}

/** Level order of a parsed tree, so the solver sees exactly the drawn tree. */
function treeText(tree: TreeShapeNode[]): string {
  const out: string[] = [];
  const line: (number | null)[] = tree.length > 0 ? [0] : [];
  for (let at = 0; at < line.length; at++) {
    const id = line[at];
    out.push(id === null ? "null" : String(tree[id].val));
    if (id !== null) line.push(tree[id].left, tree[id].right);
  }
  while (out.length > 0 && out[out.length - 1] === "null") out.pop();
  return `[${out.join(",")}]`;
}

function readUsable(input: string): Input {
  const parsed = readInput(input);
  return parsed.tree.length > 0 ? parsed : readInput(FALLBACK);
}

export const insertIntoBstStory: ProblemStory<Rec05TreeState> = {
  slugs: ["lc-701"],
  pattern: "Binary search tree walk",
  trigger: "add one value to a search tree and give back its top",
  insight: "Search for the new value as if it were already there: smaller goes left, bigger goes right. The search ends at an empty seat. The new node sits there, and nothing else moves.",
  metaphor: {
    name: "The empty seat at the bottom",
    legend: "guest = val · where the guest stands = node · empty seat = a null child · hooked on = node.left or node.right set",
    terms: ["guest", "seat", "hooked"],
  },
  traps: [{ name: TRAP, rule: "Making the new node is not enough. Hook it to its parent by setting the parent's left or right child, then return the old top." }],
  template: [
    "node = root",
    "while (the child on val's side exists) node = that child;   // smaller left, bigger right",
    "that child of node = new node(val);                         // hook it on",
    "return root;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(h)",
    timeWhy: "the guest checks one node per level on the way down",
    space: "O(1)",
    spaceWhy: "one pointer and one new node, however big the tree",
  },
  code: CODE,
  examples: [
    { label: "[4,2,7,1,3], add 5", input: "[4,2,7,1,3]\n5", expected: "[4,2,7,1,3,5]" },
    { label: "[40,20,60,10,30,50,70], add 25", input: "[40,20,60,10,30,50,70]\n25", expected: "[40,20,60,10,30,50,70,null,null,25]" },
    { label: "[8], add 3", input: "[8]\n3", expected: "[8,3]", note: "One node: the seat is right below the top" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-450", title: "Delete Node in a BST" },
    { slug: "lc-98", title: "Validate Binary Search Tree" },
    { slug: "lc-235", title: "Lowest Common Ancestor of a Binary Search Tree" },
  ],
  answer: (input) => solve(input),
  frames: (input) => {
    const parsed = readUsable(input);
    const solution = solutionFrames(parsed);
    const remembered = solution.find((frame) => frame.caption.includes("is hooked on")) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(parsed),
      ...slowFrames(parsed),
      ...insightFrames(parsed),
      ...solution,
      ...solutionFrames(readInput(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: the guest walks down to the one empty seat, and its parent must point to it. Say the idea in your head first, then reveal the card.",
        state: { ...remembered.state, note: null },
      },
    ];
  },
  View: Rec05TreeView,
};
