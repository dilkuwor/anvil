import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type DiameterFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. Its longest path bends below the top, so it reaches the trap. */
const PRACTICE = "[8,3,null,1,6,0,null,null,7]";
const FALLBACK = "[1,2,3,4,5]";

const TRAP = "The Through The Top Trap";

const CODE = [
  "int longest = 0;",
  "int diameterOfBinaryTree(TreeNode root) {",
  "    height(root);",
  "    return longest;",
  "}",
  "int height(TreeNode node) {",
  "    if (node == null) return 0;",
  "    int left = height(node.left);",
  "    int right = height(node.right);",
  "    longest = Math.max(longest, left + right);",
  "    return 1 + Math.max(left, right);",
  "}",
];

/** Two strips, always: "waiting" and "heard" during the search, the measured heights in the slow way. */
const STRIPS = 2;

const lines = (count: number) => (count === 1 ? "1 line" : `${count} lines`);

/** Independent measuring, used by the picture and the slow way. Counts every node it steps on. */
function measure(tree: TreeShapeNode[], id: number | null, count: { visits: number }): number {
  if (id === null) return 0;
  count.visits++;
  return 1 + Math.max(measure(tree, tree[id].left, count), measure(tree, tree[id].right, count));
}

/** Independent solver: from every node, spread out along the lines and keep the farthest distance seen. */
function solve(tree: TreeShapeNode[]): number {
  let best = 0;
  for (const start of tree) {
    const distance = new Map<number, number>([[start.id, 0]]);
    const line = [start.id];
    for (let at = 0; at < line.length; at++) {
      const node = tree[line[at]];
      for (const next of [node.parent, node.left, node.right]) {
        if (next === null || distance.has(next)) continue;
        distance.set(next, (distance.get(node.id) ?? 0) + 1);
        line.push(next);
      }
    }
    best = Math.max(best, ...distance.values());
  }
  return best;
}

function below(tree: TreeShapeNode[], id: number | null): number[] {
  const ids: number[] = [];
  const walk = (at: number | null) => {
    if (at === null) return;
    ids.push(at);
    walk(tree[at].left);
    walk(tree[at].right);
  };
  if (id !== null) {
    walk(tree[id].left);
    walk(tree[id].right);
  }
  return ids;
}

type Bend = { id: number; left: number; right: number; length: number };

/** For every node: how long the longest path is that has its highest point there. */
function bends(tree: TreeShapeNode[]): Bend[] {
  const count = { visits: 0 };
  return tree.map((node) => {
    const left = measure(tree, node.left, count);
    const right = measure(tree, node.right, count);
    return { id: node.id, left, right, length: left + right };
  });
}

/** From a node down to its deepest node, the node itself first. */
function deepestWay(tree: TreeShapeNode[], id: number | null): number[] {
  if (id === null) return [];
  const count = { visits: 0 };
  const left = measure(tree, tree[id].left, count);
  const right = measure(tree, tree[id].right, count);
  return [id, ...deepestWay(tree, left >= right ? tree[id].left : tree[id].right)];
}

/** The longest path that bends at this node, from its left end to its right end. */
function pathThrough(tree: TreeShapeNode[], id: number): number[] {
  return [...deepestWay(tree, tree[id].left).reverse(), id, ...deepestWay(tree, tree[id].right)];
}

function paintPath(tree: TreeShapeNode[], path: number[], bend: number): Pick<TreeStoryState, "tones" | "edges"> {
  return {
    tones: tree.map((node) => (node.id === bend ? "done" : path.includes(node.id) ? "hit" : "idle")),
    edges: tree.map((node) => ({ tone: node.id !== bend && path.includes(node.id) ? "report" : "idle" })),
  };
}

const sideStrip = (label: string, left: number, right: number, tone: CellTone = "idle"): TreeStrip => ({
  label,
  items: [
    { text: `left: ${left}`, tone },
    { text: `right: ${right}`, tone },
  ],
});

function bestBend(tree: TreeShapeNode[]): Bend {
  return bends(tree).reduce((best, bend) => (bend.length > best.length ? bend : best));
}

function pictureFrames(tree: TreeShapeNode[]): DiameterFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const best = bestBend(tree);
  const path = pathThrough(tree, best.id);
  const val = (id: number) => tree[id].val;
  const ends = `${val(path[0])} to ${val(path[path.length - 1])}`;
  return [
    { scene: "picture", caption: `This is a tree. The node ${tree[0].val} is at the top. A path walks from node to node along the lines, and its length is the number of lines it uses.`, state: blank },
    {
      scene: "picture",
      caption: `The path from ${ends} goes through ${listWords(path.map(val))}. It uses ${lines(best.length)}, so its length is ${best.length}.`,
      state: { ...blank, ...paintPath(tree, path, -1) },
    },
    {
      scene: "picture",
      caption: `A path may not use a node twice. So it has one highest node, and from there it only goes down, never back up. The highest node of this path is ${val(best.id)}.`,
      state: { ...blank, ...paintPath(tree, path, best.id), tag: { id: best.id, text: "highest" } },
    },
    {
      scene: "picture",
      caption: `The goal: the length of the longest path between any two nodes in the tree. Here the answer is ${best.length}.`,
      state: { ...blank, ...paintPath(tree, path, best.id), note: { text: `longest: ${best.length}`, tone: "teal" } },
    },
  ];
}

/** The obvious way, really run: stand on each node in turn and walk down both of its sides to measure them. */
function slowFrames(tree: TreeShapeNode[]): DiameterFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const count = { visits: 0 };
  type Stop = { id: number; left: number; right: number; visits: number; best: number };
  const stops: Stop[] = [];
  let best = 0;
  const check = (id: number | null) => {
    if (id === null) return;
    const left = measure(tree, tree[id].left, count);
    const right = measure(tree, tree[id].right, count);
    best = Math.max(best, left + right);
    stops.push({ id, left, right, visits: count.visits, best });
    check(tree[id].left);
    check(tree[id].right);
  };
  check(0);
  const shown = stops.filter((stop) => stop.left + stop.right > 0).slice(0, 3);
  const frames: DiameterFrame[] = shown.map((stop, index) => {
    const val = tree[stop.id].val;
    const under = below(tree, stop.id);
    return {
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: stand on ${val} and walk down both sides to measure them. The longest path over ${val} has ${stop.left} + ${stop.right} = ${lines(stop.left + stop.right)}. That took ${stop.visits} node visits.`
          : `Then stand on ${val} and measure its two sides the same way. The nodes below it are walked again. The longest path over ${val} has ${stop.left} + ${stop.right} = ${lines(stop.left + stop.right)}.`,
      state: {
        ...blank,
        tones: tree.map((node) => (node.id === stop.id ? "edge" : under.includes(node.id) ? "window" : "idle")),
        strips: [sideStrip("heights", stop.left, stop.right), blank.strips[1]],
        counter: { label: "node visits", value: stop.visits },
        note: { text: `longest so far: ${stop.best}`, tone: "teal" },
      },
    };
  });
  frames.push({
    scene: "slow",
    caption: `Measuring again from every node took ${count.visits} node visits for a tree of ${tree.length}, to find ${best}. In a tall tree this grows to O(n²) time. The same nodes are counted again and again.`,
    state: { ...blank, tones: tree.map(() => "faded"), counter: { label: "node visits", value: count.visits }, note: { text: `longest: ${best}`, tone: "teal" } },
  });
  return frames;
}

function insightFrames(tree: TreeShapeNode[]): DiameterFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const best = bestBend(tree);
  const path = pathThrough(tree, best.id);
  const val = (id: number) => tree[id].val;
  const count = { visits: 0 };
  const heights: TreeEdgeMark[] = tree.map((node) => (node.parent === null ? { tone: "idle" } : { tone: "report", badge: String(measure(tree, node.id, count)) }));
  return [
    {
      scene: "insight",
      caption: `Every path has one highest node. Call it the bend. From the bend at ${val(best.id)}, this path runs down the left side and down the right side.`,
      state: { ...blank, ...paintPath(tree, path, best.id), tag: { id: best.id, text: "bend" } },
    },
    {
      scene: "insight",
      caption: `The longest path with its bend at ${val(best.id)} goes as deep as it can on both sides. So its length is the left height plus the right height: ${best.left} + ${best.right}.`,
      state: { ...blank, ...paintPath(tree, path, best.id), tag: { id: best.id, text: "bend" }, strips: [sideStrip("heights", best.left, best.right, "hit"), blank.strips[1]] },
    },
    {
      scene: "insight",
      caption: "Picture reports climbing the tree. Each node hears two heights, adds them for its own bend, and reports its height up. One climb checks every bend.",
      state: { ...blank, tones: tree.map(() => "hit"), edges: heights },
    },
  ];
}

type Status = "idle" | "waiting" | "reported";

const STATUS_TONE: Record<Status, CellTone> = { idle: "idle", waiting: "window", reported: "hit" };

/**
 * The real one-pass search, one frame per event. `practice` reuses it on a fresh tree,
 * and the reader decides every report.
 */
function searchFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): DiameterFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const frames: DiameterFrame[] = [];

  const status: Status[] = tree.map(() => "idle");
  const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
  const path: number[] = [];
  const bendAt: number[] = tree.map(() => 0);
  let here: number | null = null;
  let heardStrip: TreeStrip = { label: "", items: [] };
  let out: string | null = null;
  let tag: TreeStoryState["tag"] = null;
  let longest = 0;
  let longestAt: number | null = null;
  let visits = 0;
  let deepest: number[] = [];
  const asked = { leaf: false, report: false };
  let leafShown = false;
  let bendShown = false;

  const waiting = (ids: number[]): TreeStrip => ({ label: "waiting", items: ids.map((id, index) => ({ text: String(val(id)), tone: (index === ids.length - 1 ? "edge" : "window") as CellTone })) });
  const snap = (): TreeStoryState => ({
    ...blank,
    tones: tree.map((node) => (node.id === here && status[node.id] === "waiting" ? "edge" : STATUS_TONE[status[node.id]])),
    edges: edges.map((edge) => ({ ...edge })),
    out,
    tag,
    note: { text: `longest so far: ${longest}`, tone: "teal" },
    strips: [waiting(path), heardStrip],
  });
  const push = (caption: string, codeLine: number, quiz?: StoryQuiz) => {
    const frame: DiameterFrame = { scene, caption, state: snap() };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };
  const sendUp = (id: number, height: number) => {
    path.pop();
    status[id] = "reported";
    if (tree[id].parent === null) out = String(height);
    else edges[id] = { tone: "report", badge: String(height) };
  };

  const leafQuiz = (id: number): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} has nothing below it. Both of its sides are empty. What height does it report up?`,
    options: ["0, because nothing is below it", "1, because it is one level itself", "Nothing at all"],
    answer: 1,
    why: "Empty sides count as 0, and the node adds 1 for itself. The node above needs that 1 to count the line down to here.",
  });
  const reportQuiz = (id: number): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} has checked its own bend. What does it report up to the node above?`,
    options: ["The length of the path that bends here", "Its taller side, plus 1 for itself", "Both sides added, plus 1 for itself"],
    answer: 1,
    why: "A path from above can only go down one side of this node, so only the taller side is useful up there. The bend stays behind in longest.",
  });
  const bendQuiz = (answer: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (const node of tree) {
      if (node.id === answer) continue;
      feedback[node.id] = node.left === null && node.right === null ? `Nothing hangs below ${node.val}, so no path can bend there.` : `The longest path that bends at ${node.val} has only ${lines(bendAt[node.id])}.`;
    }
    return {
      kind: "cell",
      cells: tree.length,
      question: `All reports are in. The longest path has ${lines(longest)}. At which node does it bend? Click that node.`,
      answer,
      feedback,
      otherwise: "Look for the node whose two sides, added together, give the longest path.",
      why: `The two sides of ${val(answer)} add up to ${lines(longest)}. No other bend in the tree is that long.`,
    };
  };

  const visit = (id: number, lead: string, callLine: number): number => {
    const node = tree[id];
    visits++;
    path.push(id);
    if (path.length > deepest.length) deepest = [...path];
    status[id] = "waiting";
    here = id;
    heardStrip = { label: "", items: [] };
    if (node.parent !== null) edges[id] = { tone: "path" };

    if (node.left === null && node.right === null) {
      if (practice || !leafShown) {
        leafShown = true;
        const ask = practice || !asked.leaf;
        asked.leaf = true;
        push(lead, callLine, ask ? leafQuiz(id) : undefined);
        sendUp(id, 1);
        push(`${node.val} has nothing below it, so no path can bend here. Its empty sides count as 0. It adds 1 for itself and reports height 1 up.`, 10);
      } else {
        sendUp(id, 1);
        push(`${lead} ${node.val} has nothing below it, so it reports height 1 up.`, 10);
      }
      here = node.parent;
      return 1;
    }

    push(lead, callLine);
    const left = node.left === null ? 0 : visit(node.left, `The search goes down the left side of ${node.val}, to ${val(node.left)}.`, 7);
    const right =
      node.right === null
        ? 0
        : visit(node.right, `${node.left === null ? `${node.val} has no left child, so that side counts as 0.` : `The left side of ${node.val} reported ${left}.`} Now the search goes down its right side, to ${val(node.right)}.`, 8);

    here = id;
    heardStrip = {
      label: "heard",
      items: [
        { text: `left: ${left}`, tone: node.left === null ? "idle" : "hit" },
        { text: `right: ${right}`, tone: node.right === null ? "idle" : "hit" },
      ],
    };
    const leftWords = node.left === null ? "It has no left child, so that side counts as 0." : `Its left side reported ${left}.`;
    const rightWords = node.right === null ? "It has no right child, so that side counts as 0." : `Its right side reported ${right}.`;
    const bend = left + right;
    bendAt[id] = bend;
    const isTop = node.parent === null;
    const ask = !isTop && (practice || !asked.report);
    const better = bend > longest;

    // Before the report: the heights heard, this node's own bend, and a new longest if it is one. The question sits on the last of them.
    const before: { caption: string; line: number; apply?: () => void }[] = [];
    if (!bendShown) {
      bendShown = true;
      before.push({ caption: `Back at ${node.val}. ${leftWords} ${rightWords}`, line: 8 });
      before.push({ caption: `A path with its bend at ${node.val} can go ${left} down the left side and ${right} down the right side. That is ${left} + ${right} = ${lines(bend)}.`, line: 9 });
    } else {
      before.push({ caption: `Back at ${isTop ? "the top, " : ""}${node.val}. Its sides reported ${left} and ${right}, so a path with its bend here has ${left} + ${right} = ${lines(bend)}.`, line: 9 });
    }
    if (better) {
      before.push({
        caption: `${bend} beats the longest so far, ${longest}. The longest is now ${bend}, with its bend at ${node.val}.`,
        line: 9,
        apply: () => {
          longest = bend;
          longestAt = id;
          tag = { id, text: "longest" };
        },
      });
    } else {
      before[before.length - 1].caption += ` That does not beat the longest so far, ${longest}.`;
    }
    before.forEach((step, index) => {
      step.apply?.();
      push(step.caption, step.line, ask && index === before.length - 1 ? reportQuiz(id) : undefined);
    });
    if (ask) asked.report = true;

    const height = 1 + Math.max(left, right);
    sendUp(id, height);
    push(
      isTop
        ? `${node.val} takes its taller side, adds 1, and the height ${height} comes out of the top. That height is not the answer. The answer is the longest bend.`
        : `${node.val} takes its taller side, ${Math.max(left, right)}, adds 1 for itself, and reports height ${height} up. Only one side can be part of a path from above.`,
      10,
    );
    here = node.parent;
    return height;
  };

  visit(
    0,
    practice ? `Your turn, on a new tree. The search starts at the top node ${val(0)}. You decide every report.` : `The search starts at the top node ${val(0)}. Each node will ask its two sides how tall they are, check its own bend, then send one report up.`,
    2,
  );

  here = null;
  heardStrip = { label: "", items: [] };
  const winner = longestAt ?? 0;
  const unique = bendAt.filter((bend) => bend === longest).length === 1;
  tag = null;
  if (unique && tree.length > 1) {
    const topWords = bendAt[0] < longest ? ` The path through the top has only ${lines(bendAt[0])}.` : "";
    push(`All reports are in. The longest path found has ${lines(longest)}.${topWords}`, 3, bendQuiz(winner));
  }

  const way = pathThrough(tree, winner);
  const trapped = bendAt[0] < longest;
  const painted = paintPath(tree, way, winner);
  const finish: DiameterFrame = {
    scene,
    caption: trapped
      ? `${TRAP}: the longest path bends at ${val(winner)} and never touches the top. Measuring only at the top would give ${bendAt[0]}. The answer is ${longest}.`
      : `${practice ? "Done. " : ""}The longest path bends at ${val(winner)} and runs down both of its sides. It has ${lines(longest)}. The answer is ${longest}.`,
    state: {
      ...snap(),
      tones: painted.tones.map((tone, id) => (trapped && id === 0 ? "miss" : tone)),
      edges: painted.edges,
      out: null,
      tag: { id: winner, text: "bend" },
      note: { text: `longest: ${longest}`, tone: "teal" },
      counter: trapped ? { label: "✕ through the top only", value: bendAt[0] } : null,
    },
  };
  if (!practice) finish.codeLine = 3;
  frames.push(finish);
  if (practice) return frames;

  frames.push({
    scene,
    caption: `Time: O(n). Each node is entered once, checks its own bend, and sends one report. Here the search entered ${visits} of the ${tree.length} nodes.`,
    codeLine: 7,
    state: { ...finish.state, counter: { label: "node visits", value: visits } },
  });
  frames.push({
    scene,
    caption: `Space: O(h), where h is the height of the tree. Only the nodes on the way down wait for a report. Here that was at most ${deepest.length}.`,
    codeLine: 8,
    state: { ...finish.state, tones: tree.map((node) => (deepest.includes(node.id) ? "window" : "faded")), edges: tree.map(() => ({ tone: "idle" })), tag: null, counter: null, strips: [waiting(deepest), finish.state.strips[1]] },
  });
  return frames;
}

const readOrFallback = (input: string): TreeShapeNode[] => {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
};

export const diameterOfBinaryTreeStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-543"],
  pattern: "Tree DFS",
  trigger: "a binary tree, and you are asked for the longest path between any two nodes, counted in lines",
  insight: "Every path has one highest node, its bend. Each node adds its two side heights for its own bend, keeps the longest seen, and reports only its height up.",
  metaphor: {
    name: "Height reports climbing the tree",
    legend: "report = the returned height · bend = left + right at one node · longest = the best bend so far · heard = left and right · waiting = the call stack",
    terms: ["report", "height", "bend", "longest", "side"],
  },
  traps: [{ name: TRAP, rule: "The longest path does not have to pass through the top node. Check the bend at every node and keep the longest, not only left height plus right height at the root." }],
  template: [
    "best = 0",
    "height(node):",
    "    if node is empty: return 0",
    "    left = height(node.left);  right = height(node.right)",
    "    best = max(best, left + right)               // the answer lives at some bend, any bend",
    "    return 1 + max(left, right)                  // what the node above can use",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each node is entered once; it checks its bend and sends one report",
    space: "O(h)",
    spaceWhy: "only the nodes on the current way down are waiting for reports",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4,5]", input: "[1,2,3,4,5]", expected: "3", note: "The longest path bends at the top" },
    { label: "[1,2,null,3,4,5,null,null,6]", input: "[1,2,null,3,4,5,null,null,6]", expected: "4", note: "Tricky: the longest path never touches the top" },
    { label: "[1,2,null,3,null,4]", input: "[1,2,null,3,null,4]", expected: "3", note: "A straight line: the bend is its top end" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-104", title: "Maximum Depth of Binary Tree" },
    { slug: "lc-110", title: "Balanced Binary Tree" },
    { slug: "lc-124", title: "Binary Tree Maximum Path Sum" },
  ],
  answer: (input) => String(solve(readOrFallback(input))),
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
        caption: "This is the picture to remember: the longest path and its bend, found while heights climb up. Say the idea in your head first, then reveal the card.",
        state: remembered.state,
      },
    ];
  },
  View: TreeStoryView,
};
