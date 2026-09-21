import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type PathFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. 8 hears two good arms and has a node above it, so it reaches the trap. */
const PRACTICE = "[-3,8,4,5,6,-2]";
const FALLBACK = "[-10,9,20,null,null,15,7]";

const TRAP = "The Fork Trap";

const CODE = [
  "int maxSum = Integer.MIN_VALUE;",
  "",
  "int maxGain(TreeNode node) {",
  "    if (node == null) return 0;",
  "    int leftGain = Math.max(0, maxGain(node.left));",
  "    int rightGain = Math.max(0, maxGain(node.right));",
  "    int bend = node.val + leftGain + rightGain;",
  "    maxSum = Math.max(maxSum, bend);",
  "    return node.val + Math.max(leftGain, rightGain);",
  "}",
];

/** Three strips, always: who is waiting, what this node heard and scored, and the best so far. */
const STRIPS = 3;

function readTree(input: string): TreeShapeNode[] {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
}

/** "15 + 20 + 7", and "9 + (-10) + 35" so a minus sign never sits next to a plus. */
function sumWords(parts: number[]): string {
  return parts.map((part) => (part < 0 ? `(${part})` : String(part))).join(" + ");
}

/** From a node up to the top, the node itself first. */
function wayUp(tree: TreeShapeNode[], id: number): number[] {
  const way: number[] = [];
  for (let at: number | null = id; at !== null; at = tree[at].parent) way.push(at);
  return way;
}

/** Every node of the path between two nodes: up from each until the two ways meet. */
function pathBetween(tree: TreeShapeNode[], from: number, to: number): number[] {
  const upFrom = wayUp(tree, from);
  const upTo = wayUp(tree, to);
  const meet = upTo.find((id) => upFrom.includes(id)) ?? 0;
  return [...upFrom.slice(0, upFrom.indexOf(meet) + 1), ...upTo.slice(0, upTo.indexOf(meet)).reverse()];
}

/** Independent solver: try every pair of end nodes and add up the path between them. No arms involved. */
function solve(tree: TreeShapeNode[]): { sum: number; path: number[] } {
  let best = { sum: -Infinity, path: [] as number[] };
  for (const from of tree) {
    for (const to of tree) {
      const path = pathBetween(tree, from.id, to.id);
      const sum = path.reduce((total, id) => total + tree[id].val, 0);
      if (sum > best.sum) best = { sum, path };
    }
  }
  return best;
}

function below(tree: TreeShapeNode[], id: number): number[] {
  const ids: number[] = [];
  const walk = (at: number | null) => {
    if (at === null) return;
    ids.push(at);
    walk(tree[at].left);
    walk(tree[at].right);
  };
  walk(tree[id].left);
  walk(tree[id].right);
  return ids;
}

/** Marks the lines between neighbouring nodes of a path. */
function pathEdges(tree: TreeShapeNode[], path: number[], tone: TreeEdgeMark["tone"]): TreeEdgeMark[] {
  return tree.map((node) => ({ tone: node.parent !== null && path.includes(node.id) && path.includes(node.parent) ? tone : "idle" }));
}

function pictureFrames(tree: TreeShapeNode[], solved: { sum: number; path: number[] }): PathFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const deepest = tree.reduce((deep, node) => (node.depth > deep.depth ? node : deep), tree[0]);
  const climb = wayUp(tree, deepest.id);
  const forkAt = tree.find((node) => node.parent !== null && node.left !== null && node.right !== null);
  const frames: PathFrame[] = [
    { scene: "picture", caption: `This is a tree. Each node holds a number${tree.some((node) => node.val < 0) ? ", and some numbers are below zero" : ""}. The node ${val(0)} is at the top.`, state: blank },
    {
      scene: "picture",
      caption:
        climb.length > 1
          ? `A path walks from node to node along the lines, and never uses a node twice. This one is allowed. Its sum is ${sumWords(climb.map(val))} = ${climb.reduce((total, id) => total + val(id), 0)}.`
          : `A path walks from node to node along the lines. A single node is a path too. Its sum is ${val(0)}.`,
      state: { ...blank, tones: tree.map((node) => (climb.includes(node.id) ? "window" : "idle")), edges: pathEdges(tree, climb, "path") },
    },
  ];
  if (forkAt && forkAt.parent !== null && forkAt.left !== null && forkAt.right !== null) {
    const fork = [forkAt.left, forkAt.id, forkAt.right, forkAt.parent];
    frames.push({
      scene: "picture",
      caption: `This is not allowed. At ${forkAt.val} it goes three ways: to ${val(forkAt.left)}, to ${val(forkAt.right)} and up to ${val(forkAt.parent)}. That is a fork, not a path.`,
      state: { ...blank, tones: tree.map((node) => (fork.includes(node.id) ? "miss" : "idle")), edges: pathEdges(tree, fork, "skipped"), note: { text: "✕ a path cannot fork", tone: "coral" } },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the largest sum any path can have. Here that is ${solved.path.length > 1 ? `${sumWords(solved.path.map(val))} = ` : ""}${solved.sum}. The path does not have to touch the top.`,
    state: { ...blank, tones: tree.map((node) => (solved.path.includes(node.id) ? "done" : "idle")), edges: pathEdges(tree, solved.path, "report") },
  });
  return frames;
}

/** The obvious way, really run: stand on every node, and walk everything below it again to learn its two arms. */
function slowFrames(tree: TreeShapeNode[]): PathFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  let visits = 0;
  const armFrom = (id: number | null): number => {
    if (id === null) return 0;
    visits++;
    return tree[id].val + Math.max(0, armFrom(tree[id].left), armFrom(tree[id].right));
  };
  const stands: { id: number; bend: number; visits: number }[] = [];
  const stand = (id: number | null) => {
    if (id === null) return;
    visits++;
    const bend = tree[id].val + Math.max(0, armFrom(tree[id].left)) + Math.max(0, armFrom(tree[id].right));
    stands.push({ id, bend, visits });
    stand(tree[id].left);
    stand(tree[id].right);
  };
  stand(0);

  const first = stands[0];
  const second = stands.slice(1).find((item) => below(tree, item.id).length > 0) ?? stands[1];
  const best = stands.reduce((top, item) => (item.bend > top.bend ? item : top), stands[0]);
  const standOn = (id: number): CellTone[] => {
    const under = below(tree, id);
    return tree.map((node) => (node.id === id ? "edge" : under.includes(node.id) ? "window" : "idle"));
  };
  const frames: PathFrame[] = [
    {
      scene: "slow",
      caption: `The slow way: stand on ${tree[first.id].val} and ask for the best path that turns here. To learn its two sides, walk every node below it.`,
      state: { ...blank, tones: standOn(first.id), counter: { label: "nodes walked", value: first.visits } },
    },
  ];
  if (second) {
    frames.push({
      scene: "slow",
      caption: `Turning at ${tree[first.id].val} scores ${first.bend}. Now stand on ${tree[second.id].val} and walk everything below it, all over again.`,
      state: { ...blank, tones: standOn(second.id), counter: { label: "nodes walked", value: second.visits } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `After standing on every node, the best score is ${best.bend}, from turning at ${tree[best.id].val}.`,
    state: { ...blank, tones: tree.map((node) => (node.id === best.id ? "done" : "idle")), tag: { id: best.id, text: `scores ${best.bend}` }, counter: { label: "nodes walked", value: visits } },
  });
  frames.push({
    scene: "slow",
    caption: `That took ${visits} node visits for a tree of ${tree.length}. Low nodes are walked once for every node above them. On a tall thin tree this is O(n²) time.`,
    state: { ...blank, tones: tree.map(() => "faded"), counter: { label: "nodes walked", value: visits } },
  });
  return frames;
}

type Heard = { raw: number; arm: number; chain: number[] };

/** The best arm hanging down from a node: the node itself, then its better side if that side is worth more than zero. */
function armOf(tree: TreeShapeNode[], id: number | null): Heard {
  if (id === null) return { raw: 0, arm: 0, chain: [] };
  const left = armOf(tree, tree[id].left);
  const right = armOf(tree, tree[id].right);
  const better = left.arm >= right.arm ? left : right;
  const raw = tree[id].val + better.arm;
  return { raw, arm: Math.max(0, raw), chain: [id, ...(better.arm > 0 ? better.chain : [])] };
}

function insightFrames(tree: TreeShapeNode[]): PathFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  // The first node, from the bottom up, that hears something from below. Found by looking, not typed.
  const order: number[] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    walk(tree[id].left);
    walk(tree[id].right);
    order.push(id);
  };
  walk(0);
  const at = order.find((id) => tree[id].left !== null && tree[id].right !== null) ?? order.find((id) => below(tree, id).length > 0) ?? 0;
  const node = tree[at];
  const left = armOf(tree, node.left);
  const right = armOf(tree, node.right);
  const bend = node.val + left.arm + right.arm;
  const better = Math.max(left.arm, right.arm);
  const kids = [node.left, node.right].filter((id): id is number => id !== null);
  const heardEdges = (): TreeEdgeMark[] => tree.map((item) => (kids.includes(item.id) ? { tone: "report", badge: String(armOf(tree, item.id).raw) } : { tone: "idle" }));
  const strip: TreeStrip = {
    label: `at ${node.val}`,
    items: [
      { text: `left arm: ${left.arm}`, tone: "hit" },
      { text: `right arm: ${right.arm}`, tone: "hit" },
    ],
  };
  return [
    {
      scene: "insight",
      caption: "Picture every node sending one number up: its best arm. An arm is a path that starts at that node and only goes down.",
      state: { ...blank, tones: tree.map((item) => (kids.includes(item.id) ? "hit" : "idle")), edges: heardEdges() },
    },
    {
      scene: "insight",
      caption: `A node that has heard both arms can score its bend: the path that turns at this node. Here that is ${sumWords([left.arm, node.val, right.arm])} = ${bend}.`,
      state: { ...blank, tones: tree.map((item) => (item.id === at ? "edge" : kids.includes(item.id) ? "hit" : "idle")), edges: heardEdges(), tag: { id: at, text: `bend ${bend}` }, strips: [blank.strips[0], strip, blank.strips[2]] },
    },
    {
      scene: "insight",
      caption:
        node.parent !== null
          ? `Then ${node.val} sends up itself plus its better arm only: ${sumWords([node.val, better])} = ${node.val + better}. One walk from the bottom up scores every bend.`
          : `A node with a node above it then sends up itself plus its better arm only. One walk from the bottom up scores every bend.`,
      state: {
        ...blank,
        tones: tree.map((item) => (item.id === at ? "hit" : kids.includes(item.id) ? "hit" : "idle")),
        edges: tree.map((item, index) => (item.id === at && item.parent !== null ? { tone: "report", badge: String(val(at) + better) } : heardEdges()[index])),
        strips: [blank.strips[0], strip, blank.strips[2]],
      },
    },
  ];
}

type Status = "idle" | "waiting" | "done";
const STATUS_TONE: Record<Status, CellTone> = { idle: "idle", waiting: "window", done: "hit" };

/**
 * The real walk, bottom-up, one frame per change. Leaves after the first are told in fewer frames.
 * `practice` reuses it on a fresh tree, and the reader makes every decision.
 */
function walkFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): PathFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const frames: PathFrame[] = [];

  const status: Status[] = tree.map(() => "idle");
  const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
  const path: number[] = [];
  let here: number | null = null;
  let heard: TreeStrip = { label: "", items: [] };
  let tag: TreeStoryState["tag"] = null;
  let best: number | null = null;
  let bestAt = 0;
  let bestPath: number[] = [];
  let visits = 0;
  let deepest: number[] = [];
  let leafShown = false;
  const asked = { drop: false, which: false };
  let trapShown = false;

  const waiting = (ids: number[]): TreeStrip => ({ label: "waiting", items: ids.map((id, index) => ({ text: String(val(id)), tone: (index === ids.length - 1 ? "edge" : "window") as CellTone })) });
  const bestStrip = (tone: CellTone = "idle"): TreeStrip => ({ label: "best", items: best === null ? [{ text: "none yet", tone: "idle" }] : [{ text: String(best), tone }] });
  const snap = (bestTone: CellTone = "idle"): TreeStoryState => ({
    ...blank,
    tones: tree.map((node) => (node.id === here && status[node.id] === "waiting" ? "edge" : STATUS_TONE[status[node.id]])),
    edges: edges.map((edge) => ({ ...edge })),
    tag,
    strips: [waiting(path), heard, bestStrip(bestTone)],
  });
  const push = (caption: string, codeLine: number, extra: { quiz?: StoryQuiz; state?: TreeStoryState } = {}) => {
    const frame: PathFrame = { scene, caption, state: extra.state ?? snap() };
    if (!practice) frame.codeLine = codeLine;
    if (extra.quiz) frame.quiz = extra.quiz;
    frames.push(frame);
  };
  const heardStrip = (id: number, left: number, right: number, bend: number | null, tones: { left?: CellTone; right?: CellTone } = {}): TreeStrip => ({
    label: `at ${val(id)}`,
    items: [
      { text: `left arm: ${left}`, tone: tones.left ?? (left > 0 ? "hit" : "idle") },
      { text: `right arm: ${right}`, tone: tones.right ?? (right > 0 ? "hit" : "idle") },
      ...(bend === null ? [] : [{ text: `bend: ${bend}`, tone: "edge" as CellTone }]),
    ],
  });

  const dropQuiz = (id: number, side: string, raw: number): StoryQuiz => ({
    kind: "choice",
    question: `The ${side} side of ${val(id)} reported ${raw}, a number below zero. What does ${val(id)} count for its ${side} arm?`,
    options: [`${raw}, exactly what was reported`, "0, it leaves that side out", `${-raw}, the same number without the minus`],
    answer: 1,
    why: `A path may stop at ${val(id)} and not go down that side at all. Going down would only make the sum smaller.`,
  });
  const trapQuiz = (id: number, left: number, right: number): StoryQuiz => {
    const better = Math.max(left, right);
    return {
      kind: "choice",
      question: `${val(id)} heard two good arms, ${left} and ${right}. Now it must report up to ${val(tree[id].parent ?? id)}. What can it send?`,
      options: [`Itself and both arms: ${sumWords([val(id), left, right])}`, `Itself and one arm: ${sumWords([val(id), better])}`, `Only its better arm: ${better}`],
      answer: 1,
      why: `The node above will continue this path upwards. A path that comes up one side of ${val(id)} cannot also go down the other side.`,
    };
  };
  const whichQuiz = (id: number, left: Heard, right: Heard): StoryQuiz => {
    const node = tree[id];
    const answer = left.arm > right.arm ? node.left : node.right;
    const other = left.arm > right.arm ? node.right : node.left;
    const feedback: Record<number, string> = { [id]: `${val(id)} always goes along. The question is which of its two arms goes with it.` };
    if (other !== null) feedback[other] = `That arm is worth ${Math.min(left.arm, right.arm)}. The other arm is worth more.`;
    if (node.parent !== null) feedback[node.parent] = `${val(node.parent)} is where the report is going, not an arm below ${val(id)}.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `${val(id)} must report up, and it may take only one arm along. Which side does that arm come from? Click that child.`,
      answer: answer ?? id,
      feedback,
      otherwise: `That node is not directly below ${val(id)}. Compare the two arms it heard.`,
      why: "Only one arm can go up, so it takes the one that is worth more.",
    };
  };

  const visit = (id: number, lead: string, callLine: number): Heard => {
    const node = tree[id];
    visits++;
    path.push(id);
    if (path.length > deepest.length) deepest = [...path];
    status[id] = "waiting";
    here = id;
    heard = { label: "", items: [] };
    tag = null;
    if (node.parent !== null) edges[id] = { tone: "path" };
    const isLeaf = node.left === null && node.right === null;
    const isTop = node.parent === null;

    let left: Heard = { raw: 0, arm: 0, chain: [] };
    let right: Heard = { raw: 0, arm: 0, chain: [] };

    if (isLeaf && practice) {
      // Practice tells a leaf in one frame: nothing about it is a decision.
      const isBest = best === null || node.val > best;
      if (isBest) {
        best = node.val;
        bestAt = id;
        bestPath = [id];
      }
      path.pop();
      status[id] = "done";
      edges[id] = { tone: "report", badge: String(node.val) };
      heard = heardStrip(id, 0, 0, node.val);
      push(`${lead} Nothing is below it, so its bend is just ${node.val}${isBest ? ", a new best" : ""}. It reports ${node.val} up.`, 8, { state: snap(isBest ? "done" : "idle") });
      return { raw: node.val, arm: Math.max(0, node.val), chain: [id] };
    }

    if (isLeaf) {
      if (!leafShown) {
        heard = heardStrip(id, 0, 0, null);
        push(`${lead} There is nothing below ${node.val}, so both of its arms are 0.`, 3);
        heard = heardStrip(id, 0, 0, node.val);
        tag = { id, text: `bend ${node.val}` };
        push(`The bend at ${node.val} is the path that turns here. With no arms, that is just ${node.val} itself.`, 6);
      } else {
        heard = heardStrip(id, 0, 0, node.val);
        tag = { id, text: `bend ${node.val}` };
        push(`${lead} Nothing is below it, so both arms are 0 and its bend is just ${node.val}.`, 6);
      }
      leafShown = true;
    } else {
      push(`${lead}${isTop ? "" : ` ${node.val} waits for an arm from each side.`}`, callLine);
      if (node.left !== null) left = visit(node.left, `The walk goes down the left side of ${node.val}, to ${val(node.left)}.`, 4);
      if (node.right !== null) right = visit(node.right, `${node.left === null ? "The" : "Now the"} walk goes down the right side of ${node.val}, to ${val(node.right)}.`, 5);

      here = id;
      tag = null;
      const sides = [
        { side: "left", child: node.left, got: left, line: 4 },
        { side: "right", child: node.right, got: right, line: 5 },
      ];
      const said = (side: { side: string; child: number | null; got: Heard }) => (side.child === null ? `It has no ${side.side} child, so that arm is 0.` : `Its ${side.side} side reported ${side.got.raw}.`);
      const shown = { left: left.raw, right: right.raw };
      const toneOf = (raw: number): CellTone => (raw < 0 ? "miss" : raw > 0 ? "hit" : "idle");
      heard = heardStrip(id, shown.left, shown.right, null, { left: toneOf(shown.left), right: toneOf(shown.right) });
      const firstDrop = sides.find((side) => side.got.raw < 0);
      const askDrop = firstDrop !== undefined && (practice || !asked.drop);
      push(`Back at ${node.val}. ${said(sides[0])} ${said(sides[1])}`, 5, askDrop && firstDrop ? { quiz: dropQuiz(id, firstDrop.side, firstDrop.got.raw) } : {});
      for (const side of sides) {
        if (side.got.raw >= 0 || side.child === null) continue;
        asked.drop = true;
        edges[side.child] = { tone: "empty" };
        if (side.side === "left") shown.left = 0;
        else shown.right = 0;
        heard = heardStrip(id, shown.left, shown.right, null, { left: toneOf(shown.left), right: toneOf(shown.right) });
        push(`An arm below zero would only make a path smaller. So ${node.val} leaves that side out: its ${side.side} arm counts as 0.`, side.line);
      }
      heard = heardStrip(id, left.arm, right.arm, node.val + left.arm + right.arm);
      tag = { id, text: `bend ${node.val + left.arm + right.arm}` };
      if (!practice) push(`The bend at ${node.val} is the path that turns here: ${sumWords([left.arm, node.val, right.arm])} = ${node.val + left.arm + right.arm}.`, 6);
    }

    const bend = node.val + left.arm + right.arm;
    const forked = left.arm > 0 && right.arm > 0;
    if (practice) {
      // Practice scores the bend and the best in one frame, and asks there what may go up.
      const isBest = best === null || bend > best;
      if (isBest) {
        best = bend;
        bestAt = id;
        bestPath = [...(left.arm > 0 ? [...left.chain].reverse() : []), id, ...(right.arm > 0 ? right.chain : [])];
      }
      push(`The bend at ${node.val}: ${sumWords([left.arm, node.val, right.arm])} = ${bend}. ${isBest ? `New best: ${bend}.` : `The best stays ${best}.`}`, 7, {
        state: snap(isBest ? "done" : "idle"),
        quiz: forked && !isTop ? trapQuiz(id, left.arm, right.arm) : undefined,
      });
    } else if (best === null || bend > best) {
      const old = best;
      best = bend;
      bestAt = id;
      bestPath = [...(left.arm > 0 ? [...left.chain].reverse() : []), id, ...(right.arm > 0 ? right.chain : [])];
      push(old === null ? `There is no best yet, so this bend is the first. New best: ${bend}.` : `This bend beats the old best, ${old}. New best: ${bend}.`, 7, { state: snap("done") });
    } else if (!isLeaf) {
      push(`This bend does not beat the best, ${best}. The best stays.`, 7);
    }

    const better = left.arm >= right.arm ? left : right;
    const raw = node.val + better.arm;
    const mine: Heard = { raw, arm: Math.max(0, raw), chain: [id, ...(better.arm > 0 ? better.chain : [])] };
    path.pop();
    status[id] = "done";
    if (isTop) {
      tag = null;
      here = null;
      return mine;
    }

    const up = val(node.parent ?? 0);
    if (forked) {
      const showTrap = practice || !trapShown;
      if (showTrap) {
        trapShown = true;
        if (!practice) {
          status[id] = "waiting";
          push(`Now ${node.val} must report up to ${up}, so that ${up} can build a longer path through ${node.val}.`, 8, { quiz: trapQuiz(id, left.arm, right.arm) });
          status[id] = "done";
        }
        const fork = [...left.chain, ...right.chain, id, node.parent ?? id];
        push(`${TRAP}: sending up ${sumWords([node.val, left.arm, right.arm])} would describe a path that goes three ways at ${node.val}. A path cannot fork, so only one arm goes up.`, 8, {
          state: {
            ...snap(),
            tones: tree.map((item) => (fork.includes(item.id) ? "miss" : STATUS_TONE[status[item.id]])),
            edges: edges.map((edge, index) => (fork.includes(index) && tree[index].parent !== null && fork.includes(tree[index].parent ?? -1) ? { tone: "skipped" } : { ...edge })),
            note: { text: "✕ a path cannot fork", tone: "coral" },
          },
        });
      } else if (left.arm !== right.arm && !asked.which) {
        asked.which = true;
        status[id] = "waiting";
        push(`Now ${node.val} must report up to ${up}.`, 8, { quiz: whichQuiz(id, left, right) });
        status[id] = "done";
      }
    }
    edges[id] = { tone: "report", badge: String(raw) };
    tag = null;
    push(
      isLeaf
        ? `${node.val} reports its arm up to ${up}: just itself, ${node.val}.`
        : better.arm > 0
          ? `${node.val} reports up itself plus its better arm: ${sumWords([node.val, better.arm])} = ${raw}.`
          : `${node.val} has no arm worth taking. It reports up just itself, ${node.val}.`,
      8,
    );
    return mine;
  };

  visit(0, practice ? `Your turn, on a new tree. The walk starts at the top node ${val(0)}. You decide what is left out and what goes up.` : `The walk starts at the top node ${val(0)}. Each node waits for an arm from below, scores its bend, then reports one arm up.`, 2);

  const total = best ?? 0;
  const askWhere = practice && tree.length > 1;
  if (askWhere) {
    const feedback: Record<number, string> = {};
    if (bestAt !== 0) feedback[0] = `The bend at the top node ${val(0)} was scored too, but it did not beat the best.`;
    for (const id of bestPath) if (id !== bestAt) feedback[id] = `${val(id)} is on the best path, but the path does not turn there. It is part of an arm.`;
    push(`The top node ${val(0)} has nobody above it, so its report is not used. The walk is over, and the best is ${total}.`, 8, {
      quiz: {
        kind: "cell",
        cells: tree.length,
        question: `The best bend scored ${total}. At which node does that path turn? Click it.`,
        answer: bestAt,
        feedback,
        otherwise: "That node is not on the best path at all. Think back to where the best last changed.",
        why: `The bend at ${val(bestAt)} scored ${total}, and no later bend beat it.`,
      },
    });
  } else {
    push(`The top node ${val(0)} has nobody above it, so its report is not used. The walk is over.`, 8);
  }

  const end: TreeStoryState = {
    ...blank,
    tones: tree.map((node) => (bestPath.includes(node.id) ? "done" : "faded")),
    edges: pathEdges(tree, bestPath, "report"),
    tag: { id: bestAt, text: `bend ${total}` },
    strips: [blank.strips[0], blank.strips[1], bestStrip("done")],
  };
  push(
    practice
      ? `Done. The answer is ${total}, the bend at ${val(bestAt)}.${bestAt !== 0 ? " The best path never touched the top." : ""}`
      : `The answer is ${total}: the best bend, scored at ${val(bestAt)}.${bestAt !== 0 ? ` It is not what the top reported, and the path never touches ${val(0)}.` : ""}`,
    7,
    { state: end },
  );
  if (practice) return frames;

  frames.push({
    scene,
    caption: `Time: O(n). Each node was entered once, scored one bend and sent one report. Here that is ${visits} node visits, not the slow way's many.`,
    codeLine: 4,
    state: { ...end, counter: { label: "nodes walked", value: visits } },
  });
  frames.push({
    scene,
    caption: `Space: O(h), where h is the height of the tree. Only the nodes on the way down wait for their arms. Here that was at most ${deepest.length}.`,
    codeLine: 5,
    state: { ...end, tones: tree.map((node) => (deepest.includes(node.id) ? "window" : "faded")), edges: pathEdges(tree, deepest, "path"), tag: null, strips: [waiting(deepest), end.strips[1], end.strips[2]] },
  });
  return frames;
}

export const binaryTreeMaximumPathSumStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-124"],
  pattern: "Tree DFS",
  trigger: "a tree of numbers, and you are asked for the best path between any two nodes, one that may turn anywhere",
  insight: "Every node hears an arm from each side, scores its own bend (left arm + itself + right arm), then reports up itself plus one arm only. The best bend is the answer.",
  metaphor: {
    name: "Arms and the bend",
    legend: "arm = what maxGain returns, never below 0 · bend = node.val + leftGain + rightGain · best = maxSum · waiting = the call stack",
    terms: ["arm", "bend", "best", "report"],
  },
  traps: [{ name: TRAP, rule: "Score the bend with both arms, but report up itself plus the better arm only. A path that continues upwards cannot go down both sides." }],
  template: [
    "walk(node):                       // returns the best arm, keeps the best bend",
    "    if node is empty: return 0",
    "    left = max(0, walk(node.left));  right = max(0, walk(node.right))",
    "    best = max(best, node.val + left + right)     // score here with both",
    "    return node.val + max(left, right)            // pass up only one",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "one walk from the bottom up; every node is entered once",
    space: "O(h)",
    spaceWhy: "only the nodes on the current way down are waiting for their arms",
  },
  code: CODE,
  examples: [
    { label: "[-10,9,20,null,null,15,7]", input: "[-10,9,20,null,null,15,7]", expected: "42", note: "Tricky: the best path turns at 20, below the top" },
    { label: "[1,2,3]", input: "[1,2,3]", expected: "6", note: "The best path turns at the top" },
    { label: "[2,-5,3,4,1]", input: "[2,-5,3,4,1]", expected: "5", note: "An arm below zero is left out" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-543", title: "Diameter of Binary Tree" },
    { slug: "lc-236", title: "Lowest Common Ancestor of a Binary Tree" },
    { slug: "lc-112", title: "Path Sum" },
  ],
  answer: (input) => String(solve(readTree(input)).sum),
  frames: (input) => {
    const tree = readTree(input);
    const solution = walkFrames(tree);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(tree, solve(tree)),
      ...slowFrames(tree),
      ...insightFrames(tree),
      ...solution,
      ...walkFrames(readTree(PRACTICE), "card", true),
      { scene: "card", caption: "This is the picture to remember: two arms meet at a bend, and only one arm ever goes up. Say the idea in your head first, then reveal the card.", state: remembered.state },
    ];
  },
  View: TreeStoryView,
};
