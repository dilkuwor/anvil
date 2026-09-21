import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type InvertFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. 5 and 8 each have two sides, so it reaches the trap. 3 has only one. */
const PRACTICE = "[5,3,8,1,null,7,9]";
const FALLBACK = "[4,2,7,1,3,6,9]";

const TRAP = "The Lost Side Trap";

const CODE = [
  "TreeNode invertTree(TreeNode root) {",
  "    if (root == null) return null;",
  "    TreeNode left = invertTree(root.left);",
  "    TreeNode right = invertTree(root.right);",
  "    root.left = right;",
  "    root.right = left;",
  "    return root;",
  "}",
];

/** Two strips, always: "waiting" and "holds" during the search; the waiting line or the answer elsewhere. */
const STRIPS = 2;

/** The two links of every node, by id. The story swaps these; the nodes themselves never change. */
type Links = { left: number | null; right: number | null }[];

const linksOf = (tree: TreeShapeNode[]): Links => tree.map((node) => ({ left: node.left, right: node.right }));
/** A fresh copy of the tree with the links as they are at this moment, so every frame keeps its own picture. */
const shaped = (tree: TreeShapeNode[], links: Links): TreeShapeNode[] => tree.map((node) => ({ ...node, left: links[node.id].left, right: links[node.id].right }));

/** Level by level with empty spots, as the problem prints a tree: "[4,7,2,9,6,3,1]". */
function tokens(tree: TreeShapeNode[], links: Links, mirrored = false): string[] {
  const out: string[] = [];
  const line: (number | null)[] = [0];
  for (let at = 0; at < line.length; at++) {
    const id = line[at];
    out.push(id === null ? "null" : String(tree[id].val));
    if (id === null) continue;
    line.push(mirrored ? links[id].right : links[id].left, mirrored ? links[id].left : links[id].right);
  }
  while (out[out.length - 1] === "null") out.pop();
  return out;
}

/** Independent solver: no link is ever swapped. It reads the original tree level by level, right child before left child. */
function solve(tree: TreeShapeNode[]): string {
  return `[${tokens(tree, linksOf(tree), true).join(",")}]`;
}

function inside(links: Links, id: number | null): number[] {
  if (id === null) return [];
  return [id, ...inside(links, links[id].left), ...inside(links, links[id].right)];
}

const answerStrip = (items: string[]): TreeStrip => ({ label: "answer", items: items.map((text) => ({ text, tone: (text === "null" ? "idle" : "hit") as CellTone })) });

function pictureFrames(tree: TreeShapeNode[]): InvertFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const start = linksOf(tree);
  const mirrored: Links = start.map((link) => ({ left: link.right, right: link.left }));
  const top = tree[0];
  const leftIds = inside(start, top.left);
  const rightIds = inside(start, top.right);
  const sides = (node: TreeShapeNode): CellTone => (leftIds.includes(node.id) ? "window" : rightIds.includes(node.id) ? "hit" : "idle");
  const kids = [top.left, top.right].filter((id): id is number => id !== null).map((id) => tree[id].val);
  const moved = kids.length === 2 ? `${kids[0]} and ${kids[1]} have changed places` : `${kids[0]} has changed sides`;
  return [
    { scene: "picture", caption: `This is a tree. The node ${top.val} is at the top. Below every node hang a left side and a right side, and a side can be empty.`, state: blank },
    {
      scene: "picture",
      caption: `To invert a tree means to mirror it. At every node, the left side and the right side change places. Here are the two sides of ${top.val}.`,
      state: { ...blank, tones: tree.map(sides) },
    },
    {
      scene: "picture",
      caption: `This is the same tree, mirrored. Below ${top.val}, ${moved}, together with everything below them. The same happened at every node.`,
      state: { ...blank, tree: shaped(tree, mirrored), tones: tree.map(sides) },
    },
    {
      scene: "picture",
      caption: "Only the links move. Swapping just the numbers inside two circles is not allowed: whatever hangs below them would stay on the wrong side.",
      state: { ...blank, tones: tree.map((node) => (node.parent === 0 ? "miss" : "idle")), note: { text: "✕ numbers only", tone: "coral" } },
    },
    {
      scene: "picture",
      caption: `The goal: mirror the links at every node and return the top node. Read level by level, the answer is ${solve(tree)}.`,
      state: { ...blank, tree: shaped(tree, mirrored), tones: tree.map(() => "hit"), strips: [answerStrip(tokens(tree, mirrored)), blank.strips[1]] },
    },
  ];
}

/** The obvious way, really run: a waiting line, level by level. Take a node from the front, swap its sides, line up its children. */
function slowFrames(tree: TreeShapeNode[]): InvertFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const links = linksOf(tree);
  const val = (id: number) => tree[id].val;
  const frames: InvertFrame[] = [];
  const line: number[] = [0];
  const done: number[] = [];
  let widest = 1;
  let taken = 0;
  const lineStrip = (): TreeStrip => ({ label: "line", ends: true, items: line.map((id) => ({ text: String(val(id)), tone: "window" as CellTone })) });
  while (line.length > 0) {
    const id = line.shift() as number;
    taken++;
    const link = links[id];
    links[id] = { left: link.right, right: link.left };
    const kids = [links[id].left, links[id].right].filter((kid): kid is number => kid !== null);
    line.push(...kids);
    widest = Math.max(widest, line.length);
    done.push(id);
    if (taken > 2) continue;
    const joined = kids.length === 0 ? "It has no children to line up." : `Its ${kids.length === 1 ? "child" : "children"}, ${listWords(kids.map(val))}, join the back of the line.`;
    frames.push({
      scene: "slow",
      caption: taken === 1 ? `The slow way: go level by level with a waiting line. Take ${val(id)} from the front and swap its two sides. ${joined}` : `Take ${val(id)} from the front and swap its two sides. ${joined}`,
      state: { ...blank, tree: shaped(tree, links), tones: tree.map((node) => (node.id === id ? "edge" : done.includes(node.id) ? "hit" : line.includes(node.id) ? "window" : "idle")), strips: [lineStrip(), blank.strips[1]], counter: { label: "most waiting at once", value: widest } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `Every node was swapped once, so this is O(n) time too. But the line held up to ${widest} ${widest === 1 ? "node" : "nodes"} at once. On a wide tree that is half of all the nodes.`,
    state: { ...blank, tree: shaped(tree, links), tones: tree.map(() => "faded"), counter: { label: "most waiting at once", value: widest } },
  });
  return frames;
}

function insightFrames(tree: TreeShapeNode[]): InvertFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const start = linksOf(tree);
  const isLeaf = (node: TreeShapeNode) => node.left === null && node.right === null;
  const leaves = tree.filter(isLeaf);
  // The first node the real search finishes that has something below it (deepest first, left first).
  const order: number[] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    walk(start[id].left);
    walk(start[id].right);
    order.push(id);
  };
  walk(0);
  const first = order.find((id) => !isLeaf(tree[id])) ?? 0;
  const after: Links = start.map((link, id) => (id === first ? { left: link.right, right: link.left } : link));
  const kids = [start[first].left, start[first].right].filter((id): id is number => id !== null);
  return [
    {
      scene: "insight",
      caption: `Picture reports climbing the tree. A node like ${tree[first].val} does not mirror everything below it by itself. It asks each side: flip yourself, then report back.`,
      state: { ...blank, tones: tree.map((node) => (node.id === first ? "edge" : "idle")), tag: { id: first, text: "asks" } },
    },
    {
      scene: "insight",
      caption: `A node with nothing below it, like ${leaves[0].val}, is already its own mirror image. It reports back at once: flipped.`,
      state: { ...blank, tones: tree.map((node) => (leaves.includes(node) ? "hit" : "idle")), edges: tree.map((node) => (leaves.includes(node) && node.parent !== null ? { tone: "report" } : { tone: "idle" })) },
    },
    {
      scene: "insight",
      caption: `When both sides have reported, ${tree[first].val} holds two flipped sides. It swaps its two links, and ${tree[first].val} is flipped too. Then it reports up.`,
      state: {
        ...blank,
        tree: shaped(tree, after),
        tones: tree.map((node) => (node.id === first ? "done" : kids.includes(node.id) ? "hit" : "idle")),
        edges: tree.map((node) => (kids.includes(node.id) ? { tone: "report" } : { tone: "idle" })),
        tag: { id: first, text: "swapped" },
      },
    },
  ];
}

type Status = "idle" | "waiting" | "flipped";

const STATUS_TONE: Record<Status, CellTone> = { idle: "idle", waiting: "window", flipped: "hit" };

/**
 * The real recursion, one frame per event, swapping real links. `practice` reuses it on a fresh tree,
 * and the reader makes every decision.
 */
function searchFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): InvertFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const links = linksOf(tree);
  const val = (id: number) => tree[id].val;
  const name = (id: number | null) => (id === null ? "empty" : String(val(id)));
  const held = (id: number | null) => (id === null ? "an empty side" : String(val(id)));
  const frames: InvertFrame[] = [];

  const status: Status[] = tree.map(() => "idle");
  const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
  const path: number[] = [];
  let here: number | null = null;
  let holds: TreeStrip = { label: "", items: [] };
  let out: string | null = null;
  let tag: TreeStoryState["tag"] = null;
  let note: TreeStoryState["note"] = null;
  let lost: number[] = [];
  let visits = 0;
  let deepest: number[] = [];
  const asked = { leaf: false, trap: false, swap: false, single: false };
  let leafShown = false;
  let trapShown = false;

  const waiting = (ids: number[]): TreeStrip => ({ label: "waiting", items: ids.map((id, index) => ({ text: String(val(id)), tone: (index === ids.length - 1 ? "edge" : "window") as CellTone })) });
  const holding = (left: number | null | undefined, right: number | null | undefined): TreeStrip => ({
    label: "holds",
    items: [
      { text: `left: ${left === undefined ? "?" : name(left)}`, tone: left === undefined || left === null ? "idle" : "hit" },
      { text: `right: ${right === undefined ? "?" : name(right)}`, tone: right === undefined || right === null ? "idle" : "hit" },
    ],
  });
  const snap = (): TreeStoryState => ({
    ...blank,
    tree: shaped(tree, links),
    tones: tree.map((node) => (lost.includes(node.id) ? "miss" : node.id === here && status[node.id] === "waiting" ? "edge" : STATUS_TONE[status[node.id]])),
    edges: edges.map((edge, id) => (lost[0] === id ? { tone: "skipped" } : { ...edge })),
    out,
    tag,
    note,
    strips: [waiting(path), holds],
  });
  const push = (caption: string, codeLine: number, quiz?: StoryQuiz) => {
    const frame: InvertFrame = { scene, caption, state: snap() };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };
  const sendUp = (id: number) => {
    path.pop();
    status[id] = "flipped";
    if (tree[id].parent === null) out = String(val(id));
    else edges[id] = { tone: "report" };
  };

  const leafQuiz = (id: number): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} has nothing below it. It was asked to flip itself. What does it do?`,
    options: ["It reports back at once: a single node is its own mirror image", "It waits for the node above to swap it", "It changes places with the node next to it"],
    answer: 0,
    why: "Both of its sides are empty, and swapping two empty sides changes nothing. So there is no work here, only a report.",
  });
  const trapQuiz = (id: number, left: number, right: number): StoryQuiz => ({
    kind: "choice",
    question: `The left side of ${val(id)} is flipped, and its top, ${val(left)}, is reported back. It must end up on the right. What does ${val(id)} do now?`,
    options: [`It puts ${val(left)} on its right link at once`, `It just holds ${val(left)}, and first asks ${val(right)} to flip`, `It puts ${val(left)} back on the left link`],
    answer: 1,
    why: `The right link is the only way to reach ${val(right)}. It must not be overwritten before the ${val(right)} side is flipped and held too.`,
  });
  const swapQuiz = (id: number, left: number, right: number): StoryQuiz => ({
    kind: "cell",
    cells: tree.length,
    question: `${val(id)} holds both flipped sides, so no link can be lost now. Which node goes on the left link of ${val(id)}? Click it.`,
    answer: right,
    feedback: {
      [left]: `${val(left)} came from the left link. If it goes back there, nothing is mirrored.`,
      [id]: `${val(id)} is the node doing the swap. It stays where it is.`,
    },
    otherwise: "The swapping node only holds the two nodes right below it. It is one of those.",
    why: `The side that was on the right goes to the left link, with everything below it. Then ${val(left)} goes to the right link.`,
  });
  const singleQuiz = (id: number, child: number, wasLeft: boolean): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} holds ${val(child)} from its ${wasLeft ? "left" : "right"} link and an empty side from the other. After the swap, where does ${val(child)} hang?`,
    options: [`On the ${wasLeft ? "left" : "right"} link, where it was`, `On the ${wasLeft ? "right" : "left"} link`, `Nowhere: ${val(child)} is removed`],
    answer: 1,
    why: "An empty side is swapped like any other side. The empty spot and the child change places.",
  });

  const visit = (id: number, lead: string, callLine: number): number => {
    visits++;
    path.push(id);
    if (path.length > deepest.length) deepest = [...path];
    status[id] = "waiting";
    here = id;
    holds = { label: "", items: [] };
    if (tree[id].parent !== null) edges[id] = { tone: "path" };
    const { left, right } = links[id];
    const where = tree[id].parent === null ? "out of the top" : "up";

    if (left === null && right === null) {
      if (!leafShown) {
        leafShown = true;
        const ask = !asked.leaf;
        asked.leaf = true;
        push(lead, callLine, ask ? leafQuiz(id) : undefined);
        sendUp(id);
        push(`${val(id)} has two empty sides. Swapping them changes nothing, so ${val(id)} is already flipped. It reports back ${where}.`, 6);
      } else {
        sendUp(id);
        push(`${lead} ${val(id)} has nothing below it, so it reports back at once: flipped.`, 6);
      }
      here = tree[id].parent;
      return id;
    }

    push(lead, callLine);
    if (left !== null) visit(left, `${val(id)} asks its left side to flip itself, so the search goes down to ${val(left)}.`, 2);

    // The trap, at the moment it tempts: one flipped side is back, and the other link is still needed.
    if (left !== null && right !== null && (practice || !trapShown)) {
      trapShown = true;
      here = id;
      holds = holding(left, undefined);
      const ask = practice || !asked.trap;
      asked.trap = true;
      push(`Back at ${val(id)}. Its left side is flipped, and ${val(left)} is reported back.`, 2, ask ? trapQuiz(id, left, right) : undefined);
      lost = inside(links, right);
      note = { text: `✕ the ${val(right)} side would be lost`, tone: "coral" };
      push(`${TRAP}: putting ${val(left)} on the right link now would overwrite the only link to ${val(right)}. That whole side would be lost, not flipped. So ${val(id)} just holds ${val(left)}.`, 2);
      lost = [];
      note = null;
    }
    if (right !== null) {
      holds = { label: "", items: [] };
      const before = left === null ? `${val(id)} has no left child, so it holds an empty left side.` : `${val(id)} holds the flipped left side, ${val(left)}.`;
      visit(right, `${before} Now it asks its right side to flip itself, and the search goes down to ${val(right)}.`, 3);
    }

    here = id;
    holds = holding(left, right);
    let quiz: StoryQuiz | undefined;
    if (left !== null && right !== null) {
      if (practice || !asked.swap) quiz = swapQuiz(id, left, right);
      asked.swap = true;
    } else {
      if (practice || !asked.single) quiz = singleQuiz(id, (left ?? right) as number, left !== null);
      asked.single = true;
    }
    push(`Back at ${val(id)}. It holds both flipped sides now: ${held(left)} from the left link and ${held(right)} from the right link.`, 3, quiz);

    links[id] = { left: right, right: left };
    tag = { id, text: "swapped" };
    sendUp(id);
    push(`${val(id)} swaps: ${right === null ? "the empty side" : val(right)} goes on its left link and ${left === null ? "the empty side" : val(left)} on its right link. Now ${val(id)} is flipped, and it reports back ${where}.`, 4);
    tag = null;
    here = tree[id].parent;
    return id;
  };

  visit(
    0,
    practice ? `Your turn, on a new tree. The search starts at the top node ${val(0)}. You decide what every node does.` : `The search starts at the top node ${val(0)}. Each node will ask its two sides to flip themselves, hold them both, and then swap them.`,
    0,
  );

  here = null;
  holds = { label: "", items: [] };
  const result = tokens(tree, links);
  const finish: InvertFrame = {
    scene,
    caption: `${practice ? "Done. " : ""}Every node has swapped its two sides, so the whole tree is mirrored. Read level by level, the answer is [${result.join(",")}].`,
    state: { ...snap(), tones: tree.map(() => "done"), strips: [answerStrip(result), blank.strips[1]] },
  };
  if (!practice) finish.codeLine = 6;
  frames.push(finish);
  if (practice) return frames;

  frames.push({
    scene,
    caption: `Time: O(n). Each node is entered once and swaps its two links once. Here that was ${visits} of the ${tree.length} nodes.`,
    codeLine: 4,
    state: { ...finish.state, counter: { label: "node visits", value: visits } },
  });
  frames.push({
    scene,
    caption: `Space: O(h), where h is the height of the tree. Only the nodes on the way down wait, each holding its sides. Here that was at most ${deepest.length}, not a whole level.`,
    codeLine: 2,
    state: { ...finish.state, tones: tree.map((node) => (deepest.includes(node.id) ? "window" : "faded")), edges: tree.map(() => ({ tone: "idle" })), out: null, strips: [waiting(deepest), blank.strips[1]] },
  });
  return frames;
}

const readOrFallback = (input: string): TreeShapeNode[] => {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
};

export const invertBinaryTreeStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-226"],
  pattern: "Tree DFS",
  trigger: "a binary tree, and you must mirror it: at every node the left side and the right side change places",
  insight: "Each node asks both sides to flip themselves and holds the two reports. Only then does it swap its two links and report up.",
  metaphor: {
    name: "Flip reports climbing the tree",
    legend: "report = the returned node · holds = the variables left and right · swap = root.left = right, root.right = left · waiting = the call stack",
    terms: ["report", "holds", "flipped", "swap", "side"],
  },
  traps: [{ name: TRAP, rule: "Hold both flipped sides in variables before changing any link. Writing root.right = invertTree(root.left) at once overwrites the only link to the other side, and it is lost." }],
  template: [
    "flip(node):",
    "    if node is empty: return empty",
    "    left = flip(node.left);  right = flip(node.right)     // hold both first",
    "    node.left = right;  node.right = left                 // only now change links",
    "    return node",
  ],
  complexity: {
    slow: "O(n), but a waiting line as wide as the tree",
    time: "O(n)",
    timeWhy: "each node is entered once and swaps its two links once",
    space: "O(h)",
    spaceWhy: "only the nodes on the current way down are waiting, each holding its two sides",
  },
  code: CODE,
  examples: [
    { label: "[4,2,7,1,3,6,9]", input: "[4,2,7,1,3,6,9]", expected: "[4,7,2,9,6,3,1]", note: "Every node has two sides" },
    { label: "[2,1,3]", input: "[2,1,3]", expected: "[2,3,1]", note: "One swap at the top" },
    { label: "[1,2,3,4]", input: "[1,2,3,4]", expected: "[1,3,2,null,null,null,4]", note: "A node with one child: the child changes sides" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-101", title: "Symmetric Tree" },
    { slug: "lc-100", title: "Same Tree" },
    { slug: "lc-104", title: "Maximum Depth of Binary Tree" },
  ],
  answer: (input) => solve(readOrFallback(input)),
  frames: (input) => {
    const tree = readOrFallback(input);
    const solution = searchFrames(tree);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(tree),
      ...slowFrames(tree),
      ...insightFrames(tree),
      ...solution,
      ...searchFrames(readOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: every node held both flipped sides, then swapped its two links. Say the idea in your head first, then reveal the card.",
        state: remembered.state,
      },
    ];
  },
  View: TreeStoryView,
};
