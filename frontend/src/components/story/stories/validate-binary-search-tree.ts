import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type RangeFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. 9 is fine next to its parent 3, but it sits on the left side of 8. */
const PRACTICE = "[8,3,10,1,9]";
const FALLBACK = "[2,1,3]";

const TRAP = "The Parent Only Trap";

const CODE = [
  "boolean isValidBST(TreeNode root) {",
  "    return validate(root, null, null);",
  "}",
  "boolean validate(TreeNode node, Integer floor, Integer ceiling) {",
  "    if (node == null) return true;",
  "    if (floor != null && node.val <= floor) return false;",
  "    if (ceiling != null && node.val >= ceiling) return false;",
  "    return validate(node.left, floor, node.val)",
  "        && validate(node.right, node.val, ceiling);",
  "}",
];

/** The range, the nodes that fit, and one spare strip for the trap. Always three, so the picture never jumps. */
const STRIPS = 3;

/** A limit and the node it came from. */
type Limit = { id: number; val: number } | null;

/** Independent solver: write the values left side, node, right side, and see if the list only rises. No ranges involved. */
function solve(tree: TreeShapeNode[]): boolean {
  const list: number[] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    walk(tree[id].left);
    list.push(tree[id].val);
    walk(tree[id].right);
  };
  if (tree.length > 0) walk(0);
  return list.every((value, index) => index === 0 || list[index - 1] < value);
}

/** The trap, really run: every node is compared with its two children only. */
function parentOnlyCheck(tree: TreeShapeNode[]): boolean {
  return tree.every((node) => (node.left === null || tree[node.left].val < node.val) && (node.right === null || tree[node.right].val > node.val));
}

function below(tree: TreeShapeNode[], id: number | null): number[] {
  if (id === null) return [];
  return [id, ...below(tree, tree[id].left), ...below(tree, tree[id].right)];
}

function wayDown(tree: TreeShapeNode[], id: number): number[] {
  const way: number[] = [];
  for (let at: number | null = id; at !== null; at = tree[at].parent) way.unshift(at);
  return way;
}

/** The rule as it is written, really run: every node against every node below it. Stops at the first broken pair. */
function compareEverything(tree: TreeShapeNode[]): { comparisons: number; afterTop: number; broken: { above: number; under: number; side: "left" | "right" } | null } {
  let comparisons = 0;
  let afterTop = 0;
  for (const node of tree) {
    for (const side of ["left", "right"] as const) {
      for (const under of below(tree, node[side])) {
        comparisons++;
        const fine = side === "left" ? tree[under].val < node.val : tree[under].val > node.val;
        if (!fine) return { comparisons, afterTop: afterTop || comparisons, broken: { above: node.id, under, side } };
      }
    }
    if (node.id === 0) afterTop = comparisons;
  }
  return { comparisons, afterTop, broken: null };
}

function rangeWords(floor: Limit, ceiling: Limit): string {
  if (!floor && !ceiling) return "no floor and no ceiling";
  if (!floor) return `no floor and a ceiling of ${ceiling!.val}`;
  if (!ceiling) return `a floor of ${floor.val} and no ceiling`;
  return `a floor of ${floor.val} and a ceiling of ${ceiling.val}`;
}

function rangeStrip(floor: Limit, ceiling: Limit, broken: "floor" | "ceiling" | null = null): TreeStrip {
  return {
    label: "range",
    items: [
      { text: floor ? `floor ${floor.val}` : "no floor", tone: broken === "floor" ? "miss" : floor ? "window" : "idle" },
      { text: ceiling ? `ceiling ${ceiling.val}` : "no ceiling", tone: broken === "ceiling" ? "miss" : ceiling ? "window" : "idle" },
    ],
  };
}

function fitsStrip(values: number[]): TreeStrip {
  return { label: "fits", items: values.map((value) => ({ text: String(value), tone: "hit" as CellTone })) };
}

/** The limits written on the way down to a node: "< 5" on a step left, "> 5" on a step right. */
function limitEdges(tree: TreeShapeNode[], id: number | null): TreeEdgeMark[] {
  const way = id === null ? [] : wayDown(tree, id);
  return tree.map((node) => {
    if (node.parent === null || !way.includes(node.id)) return { tone: "idle" };
    const parent = tree[node.parent];
    return { tone: "path", badge: parent.left === node.id ? `< ${parent.val}` : `> ${parent.val}` };
  });
}

function pictureFrames(tree: TreeShapeNode[], valid: boolean): RangeFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const top = tree[0];
  const leftSide = below(tree, top.left);
  const rightSide = below(tree, top.right);
  const { broken } = compareEverything(tree);
  const frames: RangeFrame[] = [
    { scene: "picture", caption: `This is a tree. The node ${top.val} is at the top. We must decide if it is a valid search tree.`, state: blank },
    {
      scene: "picture",
      caption: "The rule, for every node: everything on its left side is smaller, and everything on its right side is bigger. The whole side counts, not only the children.",
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : leftSide.includes(node.id) ? "window" : rightSide.includes(node.id) ? "hit" : "idle")), tag: { id: 0, text: "smaller ← · → bigger" } },
    },
  ];
  if (broken) {
    const word = val(broken.under) === val(broken.above) ? "the same" : broken.side === "left" ? "bigger" : "smaller";
    frames.push({
      scene: "picture",
      caption: `Here ${val(broken.under)} is on the ${broken.side} side of ${val(broken.above)}, but it is ${word}${word === "the same" ? "" : ` than ${val(broken.above)}`}. That is not allowed.`,
      state: { ...blank, tones: tree.map((node) => (node.id === broken.under ? "miss" : node.id === broken.above ? "edge" : "idle")), tag: { id: broken.under, text: `not ${broken.side === "left" ? "smaller" : "bigger"} than ${val(broken.above)}` } },
    });
  } else {
    const parts = [leftSide.length > 0 ? `${listWords(leftSide.map(val))} on its left ${leftSide.length > 1 ? "are" : "is"} smaller` : "", rightSide.length > 0 ? `${listWords(rightSide.map(val))} on its right ${rightSide.length > 1 ? "are" : "is"} bigger` : ""].filter(Boolean);
    frames.push({
      scene: "picture",
      caption: parts.length > 0 ? `Look at ${top.val}: ${parts.join(", and ")}. That is allowed.` : `${top.val} has nothing below it, so nothing can break the rule.`,
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : "hit")) },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: say true if every node keeps the rule, and false if even one breaks it. For this tree that is ${valid}.`,
    state: { ...blank, tones: tree.map((node) => (broken && node.id === broken.under ? "miss" : broken ? "idle" : "hit")) },
  });
  return frames;
}

/** The obvious way, really run: compare every node with every node below it. */
function slowFrames(tree: TreeShapeNode[]): RangeFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const run = compareEverything(tree);
  const under = below(tree, tree[0].left).concat(below(tree, tree[0].right));
  // What the same loops cost when nothing stops them early: every node against everything below it, really counted.
  let fullCost = 0;
  for (const node of tree) for (const side of [node.left, node.right]) fullCost += below(tree, side).length;
  const deepest = tree.reduce((best, node) => (node.depth > best.depth ? node : best), tree[0]);
  const frames: RangeFrame[] = [
    {
      scene: "slow",
      caption: `The slow way: follow the rule as it is written. Compare the top node ${val(0)} with every node below it${under.length > 0 ? `: ${listWords(under.map(val))}` : ""}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : "window")), counter: { label: "comparisons", value: run.afterTop } },
    },
  ];
  if (run.broken && run.broken.above === 0) {
    frames.push({
      scene: "slow",
      caption: `It finds ${val(run.broken.under)} on the ${run.broken.side} side of ${val(0)}, where it does not belong. So the tree is not valid.`,
      state: { ...blank, tones: tree.map((node) => (node.id === run.broken!.under ? "miss" : node.id === 0 ? "edge" : "idle")), counter: { label: "comparisons", value: run.comparisons } },
    });
  } else {
    frames.push({
      scene: "slow",
      caption: `Then do the same for the next node, and the next, each with everything below it. ${run.broken ? `At ${val(run.broken.above)} it finds ${val(run.broken.under)} on the wrong side. Not valid.` : "No pair breaks the rule, so the tree is valid."}`,
      state: { ...blank, tones: tree.map((node) => (run.broken && node.id === run.broken.under ? "miss" : run.broken && node.id === run.broken.above ? "edge" : "window")), counter: { label: "comparisons", value: run.comparisons } },
    });
  }
  frames.push({
    scene: "slow",
    caption: run.broken
      ? `It stopped after ${run.comparisons}, only because the broken pair came early. A valid tree of this shape needs all ${fullCost} comparisons. Every node against everything below it is O(n·h) time.`
      : `That took ${run.comparisons} comparisons here. A deep node like ${deepest.val} is compared again for every node above it, so a tall tree costs O(n·h) time, where h is the number of levels.`,
    state: { ...blank, tones: tree.map(() => "faded"), counter: { label: "comparisons", value: run.comparisons } },
  });
  return frames;
}

/** The node the idea is shown on: the first one reached by both a left and a right step, else the first child. */
function insightTarget(tree: TreeShapeNode[]): TreeShapeNode {
  const turnsBothWays = (node: TreeShapeNode) => {
    const way = wayDown(tree, node.id);
    const sides = way.slice(1).map((id) => (tree[tree[id].parent!].left === id ? "left" : "right"));
    return sides.includes("left") && sides.includes("right");
  };
  return tree.find(turnsBothWays) ?? tree[Math.min(1, tree.length - 1)];
}

function insightFrames(tree: TreeShapeNode[]): RangeFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const target = insightTarget(tree);
  const way = wayDown(tree, target.id);
  const frames: RangeFrame[] = [];
  let floor: Limit = null;
  let ceiling: Limit = null;
  for (let step = 1; step < way.length; step++) {
    const parent = tree[way[step - 1]];
    const wentLeft = parent.left === way[step];
    if (wentLeft) ceiling = { id: parent.id, val: parent.val };
    else floor = { id: parent.id, val: parent.val };
    const opening = frames.length === 0 ? "Turn the rule around. " : "";
    frames.push({
      scene: "insight",
      caption: wentLeft
        ? `${opening}${parent.val} tells everything on its left side: stay below me. Call that a ceiling of ${parent.val}.`
        : `${opening}${parent.val} tells everything on its right side: stay above me. Call that a floor of ${parent.val}.`,
      state: {
        ...blank,
        tones: tree.map((node) => (node.id === parent.id ? "edge" : below(tree, way[step]).includes(node.id) ? "window" : "idle")),
        edges: limitEdges(tree, way[step]),
        strips: [rangeStrip(floor, ceiling), blank.strips[1], blank.strips[2]],
      },
    });
  }
  frames.push({
    scene: "insight",
    caption:
      way.length > 1
        ? `Every step down hands these limits on. So ${target.val} arrives with a range: ${rangeWords(floor, ceiling)}. One look at the range replaces all the comparing.`
        : `${target.val} is alone, so it has no floor and no ceiling. With more nodes, every step down would hand on a range.`,
    state: { ...blank, tones: tree.map((node) => (node.id === target.id ? "edge" : "idle")), edges: limitEdges(tree, target.id), strips: [rangeStrip(floor, ceiling), blank.strips[1], blank.strips[2]], tag: { id: target.id, text: "range" } },
  });
  return frames;
}

/**
 * The real recursive check, one frame per change. The first step left and the first step right are told in two frames.
 * `practice` reuses it on a fresh tree, and the reader decides every limit and every verdict.
 */
function solutionFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): RangeFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const frames: RangeFrame[] = [];
  const fits: number[] = [];
  const parentOnly = parentOnlyCheck(tree);
  let here: number | null = null;
  let floor: Limit = null;
  let ceiling: Limit = null;
  let brokenLimit: "floor" | "ceiling" | null = null;
  let tag: TreeStoryState["tag"] = null;
  let checked = 0;
  let deepest: number[] = [];
  const shown = { left: practice, right: practice };
  const asked = { fresh: false, handed: false, fits: false, breaks: false };

  const snap = (): TreeStoryState => ({
    ...blank,
    tag,
    tones: tree.map((node) => (node.id === here ? (brokenLimit ? "miss" : "edge") : fits.includes(node.id) ? "hit" : "idle")),
    edges: limitEdges(tree, here),
    strips: [rangeStrip(floor, ceiling, brokenLimit), fitsStrip(fits.map(val)), blank.strips[2]],
  });
  const push = (caption: string, codeLine?: number, state: TreeStoryState = snap()) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  /** Which node gives the child its floor or its ceiling? Asks about the limit that comes from higher up when there is one. */
  const limitQuiz = (parent: TreeShapeNode, child: TreeShapeNode, wentLeft: boolean, lead: string): StoryQuiz => {
    const handed = wentLeft ? floor : ceiling;
    const kind = handed ? (wentLeft ? "floor" : "ceiling") : wentLeft ? "ceiling" : "floor";
    const answer = handed ? handed.id : parent.id;
    const feedback: Record<number, string> = { [child.id]: `${child.val} is the node that gets the range. Its limits come from nodes above it.` };
    if (handed) feedback[parent.id] = `${parent.val} is its parent. We step ${wentLeft ? "left" : "right"} from ${parent.val}, so ${parent.val} becomes the ${wentLeft ? "ceiling" : "floor"}, not the ${kind}.`;
    for (const id of wayDown(tree, parent.id)) if (id !== answer && feedback[id] === undefined) feedback[id] = `${val(id)} is above ${child.val}, but it is not the ${kind} that reaches ${child.val}. Look at the limits written on the way down.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `${lead} Which node is the ${kind} for ${child.val}? Click it.`,
      answer,
      feedback,
      otherwise: "A limit can only come from a node on the way down. Look above, and read the limits written beside the edges.",
      why: handed
        ? `${child.val} is still on the ${wentLeft ? "right" : "left"} side of ${handed.val}, so the ${kind} ${handed.val} is handed down to it. Its parent ${parent.val} only adds the ${wentLeft ? "ceiling" : "floor"}.`
        : `We step ${wentLeft ? "left" : "right"} from ${parent.val}, and everything on that side must be ${wentLeft ? "smaller" : "bigger"} than ${parent.val}. So ${parent.val} is the ${kind}.`,
    };
  };
  const fitQuiz = (node: TreeShapeNode): StoryQuiz => {
    const options = ["Yes, it fits"];
    if (floor) options.push(`No, it is not above its floor ${floor.val}`);
    if (ceiling) options.push(`No, it is not below its ceiling ${ceiling.val}`);
    const breaksFloor = floor !== null && node.val <= floor.val;
    const breaksCeiling = ceiling !== null && node.val >= ceiling.val;
    const answer = breaksFloor ? 1 : breaksCeiling ? options.length - 1 : 0;
    return {
      kind: "choice",
      question: `The range for ${node.val} is ${rangeWords(floor, ceiling)}. Does ${node.val} fit in its range?`,
      options,
      answer,
      why: breaksFloor
        ? `${node.val} must be bigger than ${floor!.val}, because it sits on the right side of ${floor!.val}. It is not.`
        : breaksCeiling
          ? `${node.val} must be smaller than ${ceiling!.val}, because it sits on the left side of ${ceiling!.val}. It is not.`
          : `${node.val} is inside its range, so it keeps the rule for every node above it at once.`,
    };
  };

  const visit = (id: number): boolean => {
    const node = tree[id];
    const way = wayDown(tree, id);
    if (way.length > deepest.length) deepest = way;
    checked++;
    here = id;
    tag = null;
    const arrive = frames[frames.length - 1];
    const hasLimit = floor !== null || ceiling !== null;
    const breaksFloor = floor !== null && node.val <= floor.val;
    const breaksCeiling = ceiling !== null && node.val >= ceiling.val;
    const breaks = breaksFloor || breaksCeiling;
    if (hasLimit && (practice || (breaks ? !asked.breaks : !asked.fits))) {
      if (breaks) asked.breaks = true;
      else asked.fits = true;
      arrive.quiz = fitQuiz(node);
    }

    if (breaks) {
      brokenLimit = breaksFloor ? "floor" : "ceiling";
      const limit = (breaksFloor ? floor : ceiling)!;
      tag = { id, text: breaksFloor ? "too small" : "too big" };
      const compare = node.val === limit.val ? "not" : "yet it is";
      push(
        breaksFloor
          ? `${node.val} is not above its floor ${limit.val}. It sits on the right side of ${limit.val}, ${compare} ${node.val === limit.val ? "bigger" : "smaller"}. Not valid.`
          : `${node.val} is not below its ceiling ${limit.val}. It sits on the left side of ${limit.val}, ${compare} ${node.val === limit.val ? "smaller" : "bigger"}. Not valid.`,
        breaksFloor ? 5 : 6,
      );
      const parent = node.parent === null ? null : tree[node.parent];
      if (!practice && parent && parentOnly && limit.id !== parent.id) {
        push(`${TRAP}: compare ${node.val} only with its parent ${parent.val}, and it looks fine. The ${brokenLimit} ${limit.val} comes from higher up, and only the range remembers it.`, breaksFloor ? 5 : 6, {
          ...snap(),
          tones: tree.map((other) => (other.id === id ? "miss" : other.id === limit.id ? "edge" : other.id === parent.id ? "window" : fits.includes(other.id) ? "hit" : "idle")),
          strips: [rangeStrip(floor, ceiling, brokenLimit), fitsStrip(fits.map(val)), { label: "parent only", items: [{ text: `${node.val} ${node.val < parent.val ? "<" : ">"} ${parent.val} looks fine`, tone: "miss" }] }],
          note: { text: `✕ forgot the ${brokenLimit} ${limit.val}`, tone: "coral" },
        });
      }
      return false;
    }

    fits.push(id);
    tag = { id, text: "fits" };
    const leaf = node.left === null && node.right === null;
    const verdict = !floor && !ceiling ? `${node.val} has no floor and no ceiling, so it fits.` : !floor ? `${node.val} is below its ceiling ${ceiling!.val}, and it has no floor. It fits.` : !ceiling ? `${node.val} is above its floor ${floor.val}, and it has no ceiling. It fits.` : `${node.val} is above its floor ${floor.val} and below its ceiling ${ceiling.val}. It fits.`;
    if (id !== 0) push(`${verdict}${leaf && id !== 0 ? " It has no children, so we go back up." : ""}`, floor || !ceiling ? 5 : 6);

    const mine = { floor, ceiling };
    for (const side of ["left", "right"] as const) {
      const childId = node[side];
      if (childId === null) continue;
      const child = tree[childId];
      const wentLeft = side === "left";
      floor = mine.floor;
      ceiling = mine.ceiling;
      const handed = wentLeft ? floor : ceiling;
      const willAsk = practice || (handed ? !asked.handed : !asked.fresh);
      const detailed = wentLeft ? !shown.left : !shown.right;
      const lead = `Next we step ${side} from ${node.val} to ${child.val}.`;
      if (willAsk && !detailed) {
        // The question sits on the frame before the step: nothing about the child is drawn yet.
        frames[frames.length - 1].quiz = limitQuiz(node, child, wentLeft, lead);
      }
      if (detailed) {
        if (wentLeft) shown.left = true;
        else shown.right = true;
        here = childId;
        tag = null;
        const stepped = push(`From ${node.val}, step ${side} to ${child.val}.`, wentLeft ? 7 : 8, { ...snap(), edges: limitEdges(tree, id).map((edge, at) => (at === childId ? { tone: "path" as const } : edge)) });
        if (willAsk) stepped.quiz = limitQuiz(node, child, wentLeft, `We stepped ${side} from ${node.val} to ${child.val}.`);
      }
      if (willAsk) {
        if (handed) asked.handed = true;
        else asked.fresh = true;
      }
      if (wentLeft) ceiling = { id: node.id, val: node.val };
      else floor = { id: node.id, val: node.val };
      here = childId;
      tag = { id: childId, text: "range" };
      const kept = wentLeft ? (floor ? `the floor ${floor.val} is handed down` : "there is still no floor") : ceiling ? `the ceiling ${ceiling.val} is handed down` : "there is still no ceiling";
      push(
        detailed
          ? `Everything on the ${side} side of ${node.val} must be ${wentLeft ? "smaller" : "bigger"}. So ${node.val} becomes the ${wentLeft ? "ceiling" : "floor"} for ${child.val}, and ${kept}.`
          : `From ${node.val}, step ${side} to ${child.val}. ${node.val} becomes its ${wentLeft ? "ceiling" : "floor"}, and ${kept}.`,
        wentLeft ? 7 : 8,
      );
      if (!visit(childId)) return false;
    }
    floor = mine.floor;
    ceiling = mine.ceiling;
    return true;
  };

  let valid: boolean;
  if (practice) {
    here = 0;
    push(`Your turn, on a new tree. The top node ${val(0)} has no floor and no ceiling, so it fits. From here on, you decide every limit and every verdict.`);
    valid = visit(0);
  } else {
    here = 0;
    push(`Start at the top node ${val(0)}. Nothing is above it, so it has no floor and no ceiling. It fits.`, 1);
    valid = visit(0);
  }

  const last = here;
  if (practice) {
    const parent = last !== null && tree[last].parent !== null ? tree[tree[last].parent!] : null;
    push(
      valid
        ? "Done. The answer is true. Every node fits in the range handed down to it."
        : `Done. The answer is false. ${parent && parentOnly ? `Next to its parent ${parent.val} alone, ${val(last!)} looked fine: that is the Parent Only Trap.` : "One node outside its range is enough."}`,
    );
    return frames;
  }
  if (valid) {
    here = null;
    tag = null;
    push("Every node fits in the range handed down to it. The answer is true.", 1, { ...snap(), tones: tree.map(() => "done"), strips: [rangeStrip(null, null), fitsStrip(fits.map(val)), blank.strips[2]] });
  } else {
    push("One node outside its range is enough. Nothing else needs checking. The answer is false.", 7);
  }
  const end = snap();
  push(`Time: O(n). Each node is checked once, against its own range: two quick comparisons. Here ${checked} of the ${tree.length} nodes were checked.`, 5, { ...end, counter: { label: "nodes checked", value: checked } });
  push(`Space: O(h), where h is the height of the tree. Only the nodes on the way down wait for an answer. Here that was at most ${deepest.length}.`, 7, {
    ...end,
    tag: null,
    tones: tree.map((node) => (deepest.includes(node.id) ? "window" : "faded")),
    edges: limitEdges(tree, deepest[deepest.length - 1]),
  });
  return frames;
}

function readTree(input: string): TreeShapeNode[] {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
}

export const validateBinarySearchTreeStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-98"],
  pattern: "Binary search tree",
  trigger: "a tree, and you must decide whether it keeps the search-tree rule: smaller to the left, bigger to the right, for every node",
  insight: "Every node arrives with a range. A step left turns the node above into the ceiling; a step right turns it into the floor. The other limit is handed down unchanged.",
  metaphor: {
    name: "Smaller to the left, bigger to the right: floor and ceiling",
    legend: "floor = min, the value must be bigger · ceiling = max, the value must be smaller · range = (min, max) · handed down = passed to the next call · no floor / no ceiling = null",
    terms: ["range", "floor", "ceiling", "fits", "left side", "right side"],
  },
  traps: [{ name: TRAP, rule: "Never compare a node only with its parent or its children. Hand a floor and a ceiling down from every node above, and check the node against that range." }],
  template: [
    "check(node, floor, ceiling):",
    "    if node is empty: return true",
    "    if node.val is not strictly between floor and ceiling: return false",
    "    return check(node.left,  floor, node.val)       // node becomes the ceiling",
    "       and check(node.right, node.val, ceiling)     // node becomes the floor",
  ],
  complexity: {
    slow: "O(n·h)",
    time: "O(n)",
    timeWhy: "every node is checked once against its range, with two comparisons",
    space: "O(h)",
    spaceWhy: "only the nodes on the current way down are waiting for an answer",
  },
  code: CODE,
  examples: [
    { label: "[2,1,3]", input: "[2,1,3]", expected: "true" },
    { label: "[5,4,6,null,null,3,7]", input: "[5,4,6,null,null,3,7]", expected: "false", note: "Tricky: 3 is fine next to its parent 6" },
    { label: "[5,1,4,null,null,3,6]", input: "[5,1,4,null,null,3,6]", expected: "false", note: "4 is on the right side of 5" },
    { label: "Valid tree of 5", input: "[5,3,8,null,4]", expected: "true", note: "4 has both a floor and a ceiling" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-230", title: "Kth Smallest Element in a BST" },
    { slug: "lc-235", title: "Lowest Common Ancestor of a Binary Search Tree" },
    { slug: "lc-94", title: "Binary Tree Inorder Traversal" },
  ],
  answer: (input) => String(solve(parseTree(input))),
  frames: (input) => {
    const tree = readTree(input);
    const insight = insightFrames(tree);
    return [
      ...pictureFrames(tree, solve(tree)),
      ...slowFrames(tree),
      ...insight,
      ...solutionFrames(tree),
      ...solutionFrames(parseTree(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: every step down hands on a floor and a ceiling. Say the idea in your head first, then reveal the card.",
        state: insight[insight.length - 1].state,
      },
    ];
  },
  View: TreeStoryView,
};
