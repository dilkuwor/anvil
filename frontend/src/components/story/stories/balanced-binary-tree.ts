import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type BalanceFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run: a tall left side, so it reaches the trap and a tilted node. */
const PRACTICE = "[5,3,8,1,null,null,null,0]";
const FALLBACK = "[3,9,20,null,null,15,7]";

const TRAP = "The Measure Again Trap";

const CODE = [
  "boolean isBalanced(TreeNode root) {",
  "    return checkHeight(root) != -1;",
  "}",
  "int checkHeight(TreeNode node) {",
  "    if (node == null) return 0;",
  "    int left = checkHeight(node.left);",
  "    if (left == -1) return -1;",
  "    int right = checkHeight(node.right);",
  "    if (right == -1) return -1;",
  "    if (Math.abs(left - right) > 1) return -1;",
  "    return 1 + Math.max(left, right);",
  "}",
];

/** Two strips, always: "waiting" and "heard" during the search, the measured heights in the slow way. */
const STRIPS = 2;
/** What a node reports up instead of a height once something below it is tilted. */
const TILTED = -1;

const levels = (count: number) => (count === 1 ? "1 level" : `${count} levels`);
const said = (report: number) => (report === TILTED ? "tilted" : String(report));

/** Independent measuring, used by the picture, the slow way and the solver. Counts every node it steps on. */
function measure(tree: TreeShapeNode[], id: number | null, count: { visits: number }): number {
  if (id === null) return 0;
  count.visits++;
  return 1 + Math.max(measure(tree, tree[id].left, count), measure(tree, tree[id].right, count));
}

/** Independent solver: look at every node on its own and compare its two measured sides. */
function solve(tree: TreeShapeNode[]): boolean {
  const count = { visits: 0 };
  return tree.every((node) => Math.abs(measure(tree, node.left, count) - measure(tree, node.right, count)) <= 1);
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

const sideStrip = (left: number, right: number, tone: CellTone = "idle"): TreeStrip => ({
  label: "heights",
  items: [
    { text: `left: ${left}`, tone },
    { text: `right: ${right}`, tone },
  ],
});

function pictureFrames(tree: TreeShapeNode[], balanced: boolean): BalanceFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const count = { visits: 0 };
  const sides = tree.map((node) => ({ left: measure(tree, node.left, count), right: measure(tree, node.right, count) }));
  const gapOf = (id: number) => Math.abs(sides[id].left - sides[id].right);
  const top = tree[0];
  const level = tree.find((node) => (node.left !== null || node.right !== null) && gapOf(node.id) <= 1) ?? top;
  const tilted = tree.find((node) => gapOf(node.id) > 1);
  const leftIds = top.left === null ? [] : [top.left, ...below(tree, top.left)];
  const rightIds = top.right === null ? [] : [top.right, ...below(tree, top.right)];
  return [
    { scene: "picture", caption: `This is a tree. The node ${top.val} is at the top. Below every node hang a left side and a right side, and a side can be empty.`, state: blank },
    {
      scene: "picture",
      caption: `The height of a side is how many levels of nodes it has. Below ${top.val}, the left side is ${levels(sides[0].left)} tall and the right side is ${levels(sides[0].right)} tall.`,
      state: { ...blank, tones: tree.map((node) => (leftIds.includes(node.id) ? "window" : rightIds.includes(node.id) ? "hit" : "idle")), strips: [sideStrip(sides[0].left, sides[0].right), blank.strips[1]] },
    },
    {
      scene: "picture",
      caption: `A node is level when its two sides differ by at most 1. The node ${level.val} is level: its sides are ${sides[level.id].left} and ${sides[level.id].right} levels tall.`,
      state: { ...blank, tones: tree.map((node) => (node.id === level.id ? "done" : "idle")), tag: { id: level.id, text: "level" }, strips: [sideStrip(sides[level.id].left, sides[level.id].right, "hit"), blank.strips[1]] },
    },
    tilted
      ? {
          scene: "picture",
          caption: `A node is tilted when its sides differ by 2 or more. The node ${tilted.val} is tilted: its sides are ${sides[tilted.id].left} and ${sides[tilted.id].right} levels tall.`,
          state: { ...blank, tones: tree.map((node) => (node.id === tilted.id ? "miss" : "idle")), strips: [sideStrip(sides[tilted.id].left, sides[tilted.id].right, "miss"), blank.strips[1]], note: { text: "✕ tilted", tone: "coral" } },
        }
      : { scene: "picture", caption: "A node is tilted when its sides differ by 2 or more. This tree has no tilted node.", state: { ...blank, tones: tree.map(() => "hit") } },
    {
      scene: "picture",
      caption: `The goal: say whether every node in the tree is level. One tilted node makes the answer false. Here the answer is ${balanced}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === tilted?.id ? "miss" : "idle")) },
    },
  ];
}

/** The obvious way, really run: stand on each node in turn and walk down both of its sides to measure them. */
function slowFrames(tree: TreeShapeNode[]): BalanceFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const count = { visits: 0 };
  type Stop = { id: number; left: number; right: number; visits: number };
  const stops: Stop[] = [];
  const check = (id: number | null): boolean => {
    if (id === null) return true;
    const left = measure(tree, tree[id].left, count);
    const right = measure(tree, tree[id].right, count);
    stops.push({ id, left, right, visits: count.visits });
    if (Math.abs(left - right) > 1) return false;
    return check(tree[id].left) && check(tree[id].right);
  };
  const balanced = check(0);
  const last = stops[stops.length - 1];
  const shown = stops.filter((stop) => stop.left + stop.right > 0).slice(0, 3);
  if (!balanced && !shown.includes(last)) shown[shown.length - 1] = last;

  const frames: BalanceFrame[] = shown.map((stop, index) => {
    const val = tree[stop.id].val;
    const under = below(tree, stop.id);
    const isTilted = Math.abs(stop.left - stop.right) > 1;
    const start = index === 0 ? `The slow way: stand on ${val} and walk down both of its sides to measure them. That took ${stop.visits} node visits.` : `Then stand on ${val} and measure its two sides the same way. The nodes below it are walked again.`;
    return {
      scene: "slow",
      caption: isTilted ? `${start} Its sides are ${stop.left} and ${stop.right}, so ${val} is tilted and the slow way stops.` : start,
      state: {
        ...blank,
        tones: tree.map((node) => (node.id === stop.id ? (isTilted ? "miss" : "edge") : under.includes(node.id) ? "window" : "idle")),
        strips: [sideStrip(stop.left, stop.right, isTilted ? "miss" : "idle"), blank.strips[1]],
        counter: { label: "node visits", value: stop.visits },
      },
    };
  });
  frames.push({
    scene: "slow",
    caption:
      count.visits > tree.length
        ? `Measuring again from every node took ${count.visits} node visits for a tree of ${tree.length}. In a tall tree this grows to O(n²) time. The same nodes are counted again and again.`
        : `Here the slow way stopped early, after ${count.visits} node visits. On a level tree it measures the same nodes again from every node above them. That grows to O(n²) time.`,
    state: { ...blank, tones: tree.map(() => "faded"), counter: { label: "node visits", value: count.visits } },
  });
  return frames;
}

/** What the real one-pass search reports at every node it reaches. Used by the insight scene. */
function realReports(tree: TreeShapeNode[]): { reports: Map<number, number>; heard: Map<number, { left: number; right: number }> } {
  const reports = new Map<number, number>();
  const heard = new Map<number, { left: number; right: number }>();
  const visit = (id: number | null): number => {
    if (id === null) return 0;
    const left = visit(tree[id].left);
    const right = left === TILTED ? TILTED : visit(tree[id].right);
    const passed = left === TILTED || right === TILTED;
    if (!passed) heard.set(id, { left, right });
    const report = passed || Math.abs(left - right) > 1 ? TILTED : 1 + Math.max(left, right);
    reports.set(id, report);
    return report;
  };
  visit(0);
  return { reports, heard };
}

function insightFrames(tree: TreeShapeNode[]): BalanceFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const { reports, heard } = realReports(tree);
  const isLeaf = (node: TreeShapeNode) => node.left === null && node.right === null;
  // The first node (deepest first) that has something below it: the first one that really has to ask.
  const asker = [...reports.keys()].find((id) => !isLeaf(tree[id])) ?? 0;
  const leaves = tree.filter((node) => isLeaf(node) && reports.has(node.id));
  const firstTilted = [...reports.keys()].find((id) => heard.has(id) && reports.get(id) === TILTED);
  const heights: TreeEdgeMark[] = tree.map((node) => {
    const report = reports.get(node.id);
    return node.parent !== null && report !== undefined && report !== TILTED ? { tone: "report", badge: String(report) } : { tone: "idle" };
  });
  const frames: BalanceFrame[] = [
    {
      scene: "insight",
      caption: `Picture reports climbing the tree. A node like ${tree[asker].val} does not walk down to measure. It asks each side "how tall are you?" and waits.`,
      state: { ...blank, tones: tree.map((node) => (node.id === asker ? "edge" : "idle")), tag: { id: asker, text: "asks" } },
    },
    {
      scene: "insight",
      caption: `A node with nothing below it, like ${tree[leaves[0]?.id ?? 0].val}, reports height 1 up. An empty side counts as 0.`,
      state: {
        ...blank,
        tones: tree.map((node) => (leaves.includes(node) ? "hit" : "idle")),
        edges: tree.map((node) => (leaves.includes(node) && node.parent !== null ? { tone: "report", badge: "1" } : { tone: "idle" })),
      },
    },
    {
      scene: "insight",
      caption: "Every other node takes its taller side, adds 1 for itself, and reports that height up. So each height is ready when the node above asks for it.",
      state: { ...blank, tones: tree.map((node) => (reports.has(node.id) && reports.get(node.id) !== TILTED ? "hit" : "idle")), edges: heights },
    },
  ];
  if (firstTilted !== undefined) {
    const sides = heard.get(firstTilted) ?? { left: 0, right: 0 };
    const edges = heights.map((edge) => ({ ...edge }));
    for (let at: number | null = firstTilted; at !== null && tree[at].parent !== null; at = tree[at].parent) edges[at] = { tone: "report", badge: "tilted" };
    frames.push({
      scene: "insight",
      caption: `${tree[firstTilted].val} hears ${sides.left} and ${sides.right}. They differ by more than 1, so it reports tilted instead of a height. Every node above passes tilted up.`,
      state: { ...blank, tones: tree.map((node) => (node.id === firstTilted ? "miss" : reports.get(node.id) === TILTED || !reports.has(node.id) ? "idle" : "hit")), edges, tag: { id: firstTilted, text: "tilted" }, out: firstTilted === 0 ? null : "tilted" },
    });
  } else {
    frames.push({
      scene: "insight",
      caption: "If two reports ever differ by more than 1, that node reports tilted instead of a height, and every node above passes tilted up. Here no node does.",
      state: { ...blank, tones: tree.map(() => "hit"), edges: heights, out: said(reports.get(0) ?? 0) },
    });
  }
  return frames;
}

type Status = "idle" | "waiting" | "reported" | "tilted" | "passed" | "unasked";

const STATUS_TONE: Record<Status, CellTone> = { idle: "idle", waiting: "window", reported: "hit", tilted: "miss", passed: "faded", unasked: "faded" };

/**
 * The real one-pass search, one frame per event. `practice` reuses it on a fresh tree,
 * and the reader decides every report.
 */
function searchFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): BalanceFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const frames: BalanceFrame[] = [];

  const status: Status[] = tree.map(() => "idle");
  const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
  const path: number[] = [];
  let here: number | null = null;
  let heardStrip: TreeStrip = { label: "", items: [] };
  let out: string | null = null;
  let tag: TreeStoryState["tag"] = null;
  let note: TreeStoryState["note"] = null;
  let counter: TreeStoryState["counter"] = null;
  let wasted: number[] = [];
  let visits = 0;
  let deepest: number[] = [];
  const asked = { leaf: false, level: false, tilted: false, pass: false };
  let leafShown = false;
  let trapShown = false;

  const waiting = (ids: number[]): TreeStrip => ({ label: "waiting", items: ids.map((id, index) => ({ text: String(val(id)), tone: (index === ids.length - 1 ? "edge" : "window") as CellTone })) });
  const snap = (): TreeStoryState => ({
    ...blank,
    tones: tree.map((node) => (wasted.includes(node.id) ? "miss" : node.id === here && status[node.id] === "waiting" ? "edge" : STATUS_TONE[status[node.id]])),
    edges: edges.map((edge) => ({ ...edge })),
    out,
    tag,
    note,
    counter,
    strips: [waiting(path), heardStrip],
  });
  const push = (caption: string, codeLine: number, quiz?: StoryQuiz) => {
    const frame: BalanceFrame = { scene, caption, state: snap() };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };
  const sendUp = (id: number, report: number) => {
    path.pop();
    if (tree[id].parent === null) out = said(report);
    else edges[id] = { tone: "report", badge: said(report) };
  };

  const leafQuiz = (id: number): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} has nothing below it. Both of its sides are empty. What height does it report up?`,
    options: ["0, because nothing is below it", "1, because it is one level itself", "Tilted"],
    answer: 1,
    why: "Empty sides count as 0, and the node adds 1 for itself. So it is 1 level tall.",
  });
  const heardQuiz = (id: number, left: number, right: number): StoryQuiz => {
    const taller = Math.max(left, right);
    const isTilted = Math.abs(left - right) > 1;
    return {
      kind: "choice",
      question: `The sides of ${val(id)} are ${left} and ${right} tall. What does ${val(id)} report up?`,
      options: [`Its taller side plus one: ${taller + 1}`, `Its taller side as it is: ${taller}`, "Tilted"],
      answer: isTilted ? 2 : 0,
      why: isTilted ? `${left} and ${right} differ by more than 1. A tilted node reports tilted, not a height.` : `The sides differ by at most 1, so ${val(id)} is level. Its height is the taller side plus 1 for itself.`,
    };
  };
  const passQuiz = (id: number, side: string, hasOther: boolean): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} heard tilted from its ${side} side. What does ${val(id)} do next?`,
    options: [hasOther ? "It asks its other side, to be sure" : "It measures that side again, to be sure", "It reports tilted up at once", "It reports a height up"],
    answer: 1,
    why: "One tilted node already makes the answer false. Nothing else can change that, so the report goes straight up.",
  });
  const readQuiz = (id: number, child: number, otherChild: number | null, side: string): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (const under of below(tree, child)) feedback[under] = `${val(under)} sent its report to the node above it, not to ${val(id)}.`;
    feedback[id] = `${val(id)} is the one asking. The height comes from below it.`;
    if (otherChild !== null) feedback[otherChild] = "That report tells the height of the other side.";
    return {
      kind: "cell",
      cells: tree.length,
      question: `${val(id)} needs the height of its ${side} side. One report already holds it. Click the node that sent that report.`,
      answer: child,
      feedback,
      otherwise: "That node is not in this side. Look where the side hangs from the asking node.",
      why: `The top node of the side, ${val(child)}, already reported the height of everything below it. No second walk is needed.`,
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
        status[id] = "reported";
        sendUp(id, 1);
        push(`${node.val} has nothing below it. Its two empty sides count as 0. It adds 1 for itself and reports height 1 up.`, 10);
      } else {
        status[id] = "reported";
        sendUp(id, 1);
        push(`${lead} ${node.val} has nothing below it, so it reports height 1 up.`, 10);
      }
      here = node.parent;
      return 1;
    }

    push(lead, callLine);

    const passUp = (side: "left" | "right"): number => {
      here = id;
      const other = side === "left" ? node.right : null;
      const ask = practice || !asked.pass;
      asked.pass = true;
      push(`Back at ${node.val}. Its ${side} side reported tilted.`, side === "left" ? 6 : 8, ask ? passQuiz(id, side, other !== null) : undefined);
      if (other !== null) {
        for (const at of [other, ...below(tree, other)]) status[at] = "unasked";
        edges[other] = { tone: "empty" };
      }
      status[id] = "passed";
      sendUp(id, TILTED);
      push(
        other !== null
          ? `${node.val} never asks its right side. One tilted node is enough, so ${node.val} passes the report tilted up at once.`
          : `One tilted node is enough. ${node.val} passes the report tilted ${node.parent === null ? "out of the top" : "up"} at once.`,
        side === "left" ? 6 : 8,
      );
      here = node.parent;
      return TILTED;
    };

    const left = node.left === null ? 0 : visit(node.left, `The search goes down the left side of ${node.val}, to ${val(node.left)}.`, 5);
    if (left === TILTED) return passUp("left");
    const right =
      node.right === null
        ? 0
        : visit(node.right, `${node.left === null ? `${node.val} has no left child, so that side counts as 0.` : `The left side of ${node.val} reported ${left}.`} Now the search goes down its right side, to ${val(node.right)}.`, 7);
    if (right === TILTED) return passUp("right");

    here = id;
    const leftWords = node.left === null ? "It has no left child, so that side counts as 0." : `Its left side reported ${left}.`;
    const rightWords = node.right === null ? "It has no right child, so that side counts as 0." : `Its right side reported ${right}.`;

    // The trap, drawn once: the first node whose side has more than one node in it.
    const bigSide = [node.left, node.right].filter((child): child is number => child !== null).sort((a, b) => below(tree, b).length - below(tree, a).length)[0];
    let lead2 = `Back at ${node.val}.`;
    if (!trapShown && below(tree, bigSide).length > 0) {
      trapShown = true;
      const side = bigSide === node.left ? "left" : "right";
      push(`Back at ${node.val}. Both sides are done. Now ${node.val} needs to know how tall its ${side} side is.`, 9, readQuiz(id, bigSide, bigSide === node.left ? node.right : node.left, side));
      const again = { visits: 0 };
      measure(tree, bigSide, again);
      wasted = [bigSide, ...below(tree, bigSide)];
      note = { text: "✕ no second walk", tone: "coral" };
      counter = { label: "wasted visits", value: again.visits };
      push(`${TRAP}: walking down from ${node.val} to count those levels again would cost ${again.visits} more visits. The report from ${val(bigSide)} already says ${said(bigSide === node.left ? left : right)}.`, 9);
      wasted = [];
      note = null;
      counter = null;
      lead2 = `${node.val} just reads its two reports.`;
    }

    heardStrip = {
      label: "heard",
      items: [
        { text: `left: ${left}`, tone: node.left === null ? "idle" : "hit" },
        { text: `right: ${right}`, tone: node.right === null ? "idle" : "hit" },
      ],
    };
    // Asked once for each outcome: the first level node and the first tilted node.
    const outcome = Math.abs(left - right) > 1 ? "tilted" : "level";
    const ask = practice || !asked[outcome];
    asked[outcome] = true;
    push(`${lead2} ${leftWords} ${rightWords}`, 9, ask ? heardQuiz(id, left, right) : undefined);

    const where = node.parent === null ? "out of the top" : "up";
    if (Math.abs(left - right) > 1) {
      status[id] = "tilted";
      tag = { id, text: "tilted" };
      sendUp(id, TILTED);
      push(`${left} and ${right} differ by more than 1, so ${node.val} is tilted. It reports tilted ${where} instead of a height.`, 9);
      here = node.parent;
      return TILTED;
    }
    const height = 1 + Math.max(left, right);
    status[id] = "reported";
    sendUp(id, height);
    push(`${left} and ${right} differ by at most 1, so ${node.val} is level. It takes the taller side, adds 1 for itself, and reports height ${height} ${where}.`, 10);
    here = node.parent;
    return height;
  };

  const top = visit(
    0,
    practice ? `Your turn, on a new tree. The search starts at the top node ${val(0)}. You decide every report.` : `The search starts at the top node ${val(0)}. Each node will ask its two sides how tall they are, then send one report up.`,
    3,
  );
  const balanced = top !== TILTED;

  here = null;
  heardStrip = { label: "", items: [] };
  const unasked = status.filter((state) => state === "unasked" || state === "idle").length;
  push(
    balanced
      ? `${practice ? "Done. " : ""}The height ${top} comes out of the top and no node reported tilted, so every node is level. The answer is true.`
      : `${practice ? "Done. " : ""}The report tilted comes out of the top${unasked > 0 ? `, and ${unasked} ${unasked === 1 ? "node" : "nodes"} never had to be asked` : ""}. The answer is false.`,
    1,
  );
  if (practice) return frames;

  const end = snap();
  frames.push({
    scene,
    caption: `Time: O(n). Each node is entered once and sends one report, with its height and its balance together. Here the search entered ${visits} of the ${tree.length} nodes.`,
    codeLine: 5,
    state: { ...end, counter: { label: "node visits", value: visits } },
  });
  frames.push({
    scene,
    caption: `Space: O(h), where h is the height of the tree. Only the nodes on the way down wait for a report. Here that was at most ${deepest.length}.`,
    codeLine: 7,
    state: { ...end, tones: tree.map((node) => (deepest.includes(node.id) ? "window" : "faded")), tag: null, strips: [waiting(deepest), end.strips[1]] },
  });
  return frames;
}

const readOrFallback = (input: string): TreeShapeNode[] => {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
};

export const balancedBinaryTreeStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-110"],
  pattern: "Tree DFS",
  trigger: "a binary tree, and you must say whether at every node the two sides are almost equally tall",
  insight: "Every node asks its two sides how tall they are, once. It reports its own height up, or tilted if the sides differ by more than 1. Tilted climbs straight to the top.",
  metaphor: {
    name: "Height reports climbing the tree",
    legend: "report = the returned number · height = 1 + the taller side · tilted = -1 · heard = left and right · waiting = the call stack",
    terms: ["report", "height", "tilted", "side"],
  },
  traps: [{ name: TRAP, rule: "Never walk down a side again to measure it at every node: that is O(n²). One climb reports height and balance together, and each node only reads the two reports from below." }],
  template: [
    "check(node):",
    "    if node is empty: return 0",
    "    left = check(node.left);   if left is BAD: return BAD",
    "    right = check(node.right); if right is BAD: return BAD",
    "    if left and right break the rule: return BAD",
    "    return 1 + max(left, right)                  // one number carries the result up",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each node is entered once and sends one report; no side is ever measured twice",
    space: "O(h)",
    spaceWhy: "only the nodes on the current way down are waiting for reports",
  },
  code: CODE,
  examples: [
    { label: "[3,9,20,null,null,15,7]", input: "[3,9,20,null,null,15,7]", expected: "true", note: "Every node is level" },
    { label: "[1,2,3,4,5,null,null,6,7]", input: "[1,2,3,4,5,null,null,6,7]", expected: "false", note: "The top node is tilted" },
    { label: "[1,2,3,4,null,null,5,6,null,null,7]", input: "[1,2,3,4,null,null,5,6,null,null,7]", expected: "false", note: "Tricky: the top looks level, a lower node is tilted" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-104", title: "Maximum Depth of Binary Tree" },
    { slug: "lc-543", title: "Diameter of Binary Tree" },
    { slug: "lc-236", title: "Lowest Common Ancestor of a Binary Tree" },
  ],
  answer: (input) => String(solve(readOrFallback(input))),
  frames: (input) => {
    const tree = readOrFallback(input);
    const solution = searchFrames(tree);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(tree, solve(tree)),
      ...slowFrames(tree),
      ...insightFrames(tree),
      ...solution,
      ...searchFrames(readOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: heights climbing up, one report per node. Say the idea in your head first, then reveal the card.",
        state: remembered.state,
      },
    ];
  },
  View: TreeStoryView,
};
