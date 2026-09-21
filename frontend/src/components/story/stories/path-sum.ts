import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type PathSumFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. The target is reached early at 3, which is not a leaf, so it reaches the trap. */
const PRACTICE = "[7,3,1,null,8,2]; target=10";
const FALLBACK = "[5,4,8,11,null,13,9,7,2,null,null,null,1]; target=22";

const TRAP = "The Early Stop Trap";

const CODE = [
  "boolean hasPathSum(TreeNode root, int targetSum) {",
  "    if (root == null) return false;",
  "    if (root.left == null && root.right == null) {",
  "        return targetSum == root.val;",
  "    }",
  "    int remaining = targetSum - root.val;",
  "    return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);",
  "}",
];

/** Two strips, always: the way down, and what is still needed at each node on it. */
const STRIPS = 2;

type Query = { tree: TreeShapeNode[]; target: number };

/** "[5,4,8]; target=22" → the tree and the target. */
function readQuery(input: string): Query | null {
  const [treeText = "", ...rest] = input.split(";");
  const tree = parseTree(treeText);
  const match = rest.join(";").match(/target\s*=\s*(-?\d+)/);
  return tree.length > 0 && match ? { tree, target: Number(match[1]) } : null;
}

const isLeaf = (node: TreeShapeNode) => node.left === null && node.right === null;

/** Every way from the top to a leaf, left to right. */
function waysDown(tree: TreeShapeNode[]): number[][] {
  const ways: number[][] = [];
  const stack: number[][] = [[0]];
  while (stack.length > 0) {
    const way = stack.pop() as number[];
    const node = tree[way[way.length - 1]];
    if (isLeaf(node)) ways.push(way);
    if (node.right !== null) stack.push([...way, node.right]);
    if (node.left !== null) stack.push([...way, node.left]);
  }
  return ways;
}

const total = (tree: TreeShapeNode[], way: number[]) => way.reduce((sum, id) => sum + tree[id].val, 0);

/** Independent solver: list every way down, add each one up, look for the target. */
function solve({ tree, target }: Query): boolean {
  return waysDown(tree).some((way) => total(tree, way) === target);
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

const wayStrip = (tree: TreeShapeNode[], way: number[], tone: CellTone = "window"): TreeStrip => ({ label: "way down", items: way.map((id) => ({ text: String(tree[id].val), tone })) });
const wayEdges = (tree: TreeShapeNode[], way: number[], tone: TreeEdgeMark["tone"]): TreeEdgeMark[] => tree.map((node) => ({ tone: node.id !== 0 && way.includes(node.id) ? tone : "idle" }));
const targetNote = (target: number): TreeStoryState["note"] => ({ text: `target: ${target}`, tone: "accent" });

function pictureFrames(query: Query, answer: boolean): PathSumFrame[] {
  const { tree, target } = query;
  const blank = { ...blankTreeState(tree, STRIPS), note: targetNote(target) };
  const val = (id: number) => tree[id].val;
  const ways = waysDown(tree);
  const leaves = ways.map((way) => way[way.length - 1]);
  const shown = ways.find((way) => total(tree, way) === target) ?? ways[0];
  // A way that stops too early: the top part of a way, ending on a node that is not a leaf.
  const early = ways.map((way) => way.slice(0, -1)).find((part) => part.length > 0 && total(tree, part) === target) ?? shown.slice(0, -1);
  const frames: PathSumFrame[] = [
    {
      scene: "picture",
      caption: `This is a tree with the node ${val(0)} at the top. A leaf is a node with nothing below it. ${leaves.length === 1 ? `The only leaf here is ${val(leaves[0])}.` : `The leaves here are ${listWords(leaves.map(val))}.`}`,
      state: { ...blank, tones: tree.map((node) => (leaves.includes(node.id) ? "hit" : "idle")) },
    },
    {
      scene: "picture",
      caption: `A way down starts at the top and ends at a leaf. The way ${listWords(shown.map(val))} adds up to ${total(tree, shown)}.`,
      state: { ...blank, tones: tree.map((node) => (shown.includes(node.id) ? "done" : "idle")), edges: wayEdges(tree, shown, "report"), strips: [wayStrip(tree, shown, "hit"), blank.strips[1]] },
    },
  ];
  if (early.length > 0) {
    const last = early[early.length - 1];
    frames.push({
      scene: "picture",
      caption: `Stopping early is not allowed. ${early.length === 1 ? `The top node alone is already ${total(tree, early)}` : `${listWords(early.map(val))} add up to ${total(tree, early)}`}, but ${val(last)} is not a leaf, so this does not count as a way down.`,
      state: { ...blank, tones: tree.map((node) => (node.id === last ? "miss" : early.includes(node.id) ? "window" : "idle")), edges: wayEdges(tree, early, "path"), strips: [wayStrip(tree, early, "miss"), blank.strips[1]] },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: is there a way down that adds up to exactly the target, ${target}? Here the answer is ${answer}.`,
    state: answer ? { ...blank, tones: tree.map((node) => (shown.includes(node.id) ? "done" : "idle")), edges: wayEdges(tree, shown, "report") } : blank,
  });
  return frames;
}

/** The obvious way, really run: write down one full way after another, and add each one up from the top. */
function slowFrames(query: Query): PathSumFrame[] {
  const { tree, target } = query;
  const blank = { ...blankTreeState(tree, STRIPS), note: targetNote(target) };
  const val = (id: number) => tree[id].val;
  const frames: PathSumFrame[] = [];
  let added = 0;
  let tried = 0;
  let found = false;
  for (const way of waysDown(tree)) {
    let sum = 0;
    for (const id of way) {
      sum += val(id);
      added++;
    }
    tried++;
    found = sum === target;
    if (tried <= 3 || found) {
      const verdict = found ? `It gives ${sum}, which is the target.` : `It gives ${sum}, not ${target}.`;
      frames.push({
        scene: "slow",
        caption:
          tried === 1
            ? `The slow way: write down one full way, ${listWords(way.map(val))}, and add it up from the top. ${verdict}`
            : `Then the next way, ${listWords(way.map(val))}. Its upper nodes are added all over again. ${verdict}`,
        state: {
          ...blank,
          tones: tree.map((node) => (way.includes(node.id) ? (found ? "done" : "window") : "idle")),
          edges: wayEdges(tree, way, found ? "report" : "path"),
          strips: [wayStrip(tree, way, found ? "hit" : "window"), { label: "sum", items: [{ text: String(sum), tone: found ? "hit" : "miss" }] }],
          counter: { label: "numbers added", value: added },
        },
      });
    }
    if (found) break;
  }
  frames.push({
    scene: "slow",
    caption: `That took ${added} additions for ${tried === 1 ? "1 way" : `${tried} ways`}. Every new way starts again at the top, so the upper nodes are added again and again. That is O(n · h) time.`,
    state: { ...blank, tones: tree.map(() => "faded"), counter: { label: "numbers added", value: added } },
  });
  return frames;
}

function insightFrames(query: Query): PathSumFrame[] {
  const { tree, target } = query;
  const blank = { ...blankTreeState(tree, STRIPS), note: targetNote(target) };
  const val = (id: number) => tree[id].val;
  const ways = waysDown(tree);
  const way = ways.find((item) => total(tree, item) === target) ?? ways[0];
  // What is still needed on arriving at each node of the way.
  const needs: number[] = [];
  let need = target;
  for (const id of way) {
    needs.push(need);
    need -= val(id);
  }
  const leaf = way[way.length - 1];
  const hit = needs[needs.length - 1] === val(leaf);
  const needStrip = (count: number): TreeStrip => ({ label: "still needed", items: needs.slice(0, count).map((item) => ({ text: String(item), tone: "window" as CellTone })) });
  const frames: PathSumFrame[] = [
    {
      scene: "insight",
      caption: `Do not add up from the top every time. Carry one number down instead: what is still needed. At the top, ${val(0)}, that is the whole target, ${target}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : "idle")), tag: { id: 0, text: `needs ${target}` }, strips: [wayStrip(tree, way.slice(0, 1)), needStrip(1)] },
    },
  ];
  if (way.length > 1) {
    frames.push({
      scene: "insight",
      caption: `Each node takes off its own value and hands the rest down. ${val(0)} takes off ${val(0)}, so below it only ${needs[1]} is still needed.`,
      state: { ...blank, tones: tree.map((node) => (node.id === way[1] ? "edge" : node.id === 0 ? "window" : "idle")), edges: wayEdges(tree, way.slice(0, 2), "path"), tag: { id: way[1], text: `needs ${needs[1]}` }, strips: [wayStrip(tree, way.slice(0, 2)), needStrip(2)] },
    });
  }
  frames.push({
    scene: "insight",
    caption: hit
      ? `At a leaf the question is simple: is the leaf exactly what is still needed? The leaf ${val(leaf)} is asked for ${needs[needs.length - 1]}. It reports yes, and the yes climbs up to the top.`
      : `At a leaf the question is simple: is the leaf exactly what is still needed? The leaf ${val(leaf)} is asked for ${needs[needs.length - 1]}. It reports no, and the search tries another side.`,
    state: {
      ...blank,
      tones: tree.map((node) => (node.id === leaf ? (hit ? "done" : "miss") : way.includes(node.id) ? (hit ? "hit" : "window") : "idle")),
      edges: hit ? tree.map((node) => (node.id !== 0 && way.includes(node.id) ? { tone: "report", badge: "yes" } : { tone: "idle" })) : wayEdges(tree, way, "path"),
      tag: { id: leaf, text: `needs ${needs[needs.length - 1]}` },
      strips: [wayStrip(tree, way), needStrip(way.length)],
    },
  });
  return frames;
}

type Status = "idle" | "waiting" | "yes" | "no" | "unasked";

const STATUS_TONE: Record<Status, CellTone> = { idle: "idle", waiting: "window", yes: "hit", no: "faded", unasked: "faded" };

/**
 * The real search, one frame per event. `practice` reuses it on a fresh tree,
 * and the reader decides every report.
 */
function searchFrames(query: Query, scene: SceneId = "solution", practice = false): PathSumFrame[] {
  const { tree, target } = query;
  const blank = { ...blankTreeState(tree, STRIPS), note: targetNote(target) };
  const val = (id: number) => tree[id].val;
  const frames: PathSumFrame[] = [];

  const status: Status[] = tree.map(() => "idle");
  const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
  const path: number[] = [];
  const needs: number[] = [];
  let here: number | null = null;
  let out: string | null = null;
  let tag: TreeStoryState["tag"] = null;
  let counter: TreeStoryState["counter"] = null;
  let trapAt: number | null = null;
  let visits = 0;
  let deepest: number[] = [];
  const asked = { leaf: false, next: false, pass: false, trap: false };
  let leafShown = false;
  let handShown = false;

  const strips = (ids: number[], numbers: number[]): TreeStrip[] => [
    { label: "way down", items: ids.map((id, index) => ({ text: String(val(id)), tone: (index === ids.length - 1 ? "edge" : "window") as CellTone })) },
    { label: "still needed", items: numbers.map((need, index) => ({ text: String(need), tone: (index === numbers.length - 1 ? "edge" : "window") as CellTone })) },
  ];
  const snap = (): TreeStoryState => ({
    ...blank,
    tones: tree.map((node) => (node.id === trapAt ? "miss" : node.id === here && status[node.id] === "waiting" ? "edge" : STATUS_TONE[status[node.id]])),
    edges: edges.map((edge) => ({ ...edge })),
    out,
    tag,
    counter,
    strips: strips(path, needs),
  });
  const push = (caption: string, codeLine: number, quiz?: StoryQuiz) => {
    const frame: PathSumFrame = { scene, caption, state: snap() };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };
  const sendUp = (id: number, yes: boolean) => {
    path.pop();
    needs.pop();
    status[id] = yes ? "yes" : "no";
    if (tree[id].parent === null) out = yes ? "yes" : "no";
    else edges[id] = yes ? { tone: "report", badge: "yes" } : { tone: "empty" };
    here = tree[id].parent;
    tag = here === null ? null : { id: here, text: `needs ${needs[needs.length - 1]}` };
  };

  const leafQuiz = (id: number, need: number): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} is a leaf, and ${need} is still needed. What does ${val(id)} report up?`,
    options: ["Yes: a way down is found", "No: this way down misses the target", "Nothing yet. It hands the number further down"],
    answer: need === val(id) ? 0 : 1,
    why: need === val(id) ? `The way ends here, and the leaf is exactly the ${need} that was still needed. The whole way adds up to the target.` : `The way ends here, so nothing more can be added. ${val(id)} is not the ${need} that was still needed.`,
  });
  const trapQuiz = (id: number): StoryQuiz => ({
    kind: "choice",
    question: `After ${val(id)} takes off its own value, 0 is still needed. But ${val(id)} is not a leaf. What does ${val(id)} do?`,
    options: ["It reports yes: the target is reached", "It hands 0 down and keeps asking below", "It reports no at once"],
    answer: 1,
    why: `A way down must end at a leaf. The nodes below ${val(id)} will still add their values, so the target reached here does not count.`,
  });
  const passQuiz = (id: number, side: string, hasOther: boolean): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} heard yes from its ${side} side. What does ${val(id)} do next?`,
    options: [hasOther ? "It asks its other side too" : "It checks its own value again", "It reports yes up at once", "It reports no, because it is not a leaf"],
    answer: 1,
    why: "One way down is enough for the answer. A yes goes straight up, and nothing else is asked.",
  });
  const nextQuiz = (id: number, left: number, right: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    feedback[left] = `${val(left)} has already reported no.`;
    feedback[id] = `${val(id)} has only heard from one side. It cannot report before it has asked the other.`;
    for (const under of below(tree, left)) feedback[under] = `Everything below ${val(left)} is covered by its no.`;
    const above = tree[id].parent;
    if (above !== null) feedback[above] = `${val(above)} is still waiting for ${val(id)}. And ${val(id)} is not done yet.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `${val(left)} reported no to ${val(id)}. Which node does the search ask next? Click it.`,
      answer: right,
      feedback,
      otherwise: "The search moves one line at a time from where it stands. Look at what still hangs below the waiting node.",
      why: `A no from one side is not final. ${val(id)} still has another side, and hands the same number down to it.`,
    };
  };

  const visit = (id: number, need: number, lead: string, callLine: number): boolean => {
    const node = tree[id];
    visits++;
    path.push(id);
    needs.push(need);
    if (path.length > deepest.length) deepest = [...path];
    status[id] = "waiting";
    here = id;
    tag = { id, text: `needs ${need}` };
    if (node.parent !== null) edges[id] = { tone: "path" };

    if (isLeaf(node)) {
      const yes = need === node.val;
      const told = yes
        ? `${node.val} is a leaf, and it is exactly the ${need} that is still needed. This way down adds up to the target. ${node.val} reports yes up.`
        : `${node.val} is a leaf, but it is not the ${need} that is still needed. This way down misses the target, so ${node.val} reports no up.`;
      if (practice || !leafShown || yes) {
        leafShown = true;
        const ask = practice || !asked.leaf;
        asked.leaf = true;
        push(`${lead} It is a leaf, and ${need} is still needed.`, callLine, ask ? leafQuiz(id, need) : undefined);
        sendUp(id, yes);
        push(told, 3);
      } else {
        sendUp(id, yes);
        push(`${lead} The leaf ${node.val} is not the ${need} still needed, so it reports no up.`, 3);
      }
      return yes;
    }

    const rest = need - node.val;
    if (rest === 0) {
      const ask = practice || !asked.trap;
      asked.trap = true;
      push(`${lead} Still needed: ${need}, and ${node.val} is exactly that.`, callLine, ask ? trapQuiz(id) : undefined);
      trapAt = id;
      counter = { label: "✕ not a leaf, still needed", value: 0 };
      push(`${TRAP}: the target is reached at ${node.val}, but ${node.val} is not a leaf. Saying yes here would be wrong. ${node.val} hands 0 down and keeps asking.`, 5);
      trapAt = null;
      counter = null;
    } else if (!handShown) {
      handShown = true;
      push(`${lead} Still needed: ${need}.`, callLine);
      push(`${node.val} is not a leaf, so it cannot answer yet. It takes off its own ${node.val} and hands ${rest} down as the number still needed.`, 5);
    } else {
      push(`${lead} It is not a leaf, so it takes off its own ${node.val} and hands ${rest} down.`, 5);
    }

    const passUp = (side: "left" | "right"): boolean => {
      here = id;
      const other = side === "left" ? node.right : null;
      const ask = practice || !asked.pass;
      asked.pass = true;
      push(`Back at ${node.val}. Its ${side} side reported yes.`, 6, ask ? passQuiz(id, side, other !== null) : undefined);
      if (other !== null) {
        for (const at of [other, ...below(tree, other)]) status[at] = "unasked";
        edges[other] = { tone: "empty" };
      }
      sendUp(id, true);
      push(`One way down is enough. ${node.val} reports yes ${node.parent === null ? "out of the top" : "up"} at once${other !== null ? `, and its right side is never asked` : ""}.`, 6);
      return true;
    };

    if (node.left !== null) {
      if (visit(node.left, rest, `The search goes down the left side of ${node.val}, to ${val(node.left)}.`, 6)) return passUp("left");
    }
    if (node.right !== null) {
      if (node.left !== null) {
        const ask = practice || !asked.next;
        asked.next = true;
        if (ask) push(`Back at ${node.val}. Its left side, ${val(node.left)}, reported no. ${node.val} still holds the number ${rest} for the nodes below it.`, 6, nextQuiz(id, node.left, node.right));
      }
      const lead2 = node.left === null ? `${node.val} has no left child, so that side reports no. The search goes down its right side, to ${val(node.right)}.` : `The left side of ${node.val} reported no. The search hands ${rest} down the right side, to ${val(node.right)}.`;
      if (visit(node.right, rest, lead2, 6)) return passUp("right");
    }

    here = id;
    sendUp(id, false);
    const sides = node.left !== null && node.right !== null ? "Neither side found a way down" : `Its only side, ${val((node.left ?? node.right) as number)}, reported no, and an empty side reports no too`;
    push(`Back at ${node.val}. ${sides}. So ${node.val} reports no ${node.parent === null ? "out of the top" : "up"}.`, 6);
    return false;
  };

  const found = visit(0, target, practice ? `Your turn, on a new tree with the target ${target}. The search starts at the top, ${val(0)}, and you decide every report.` : `The search starts at the top, ${val(0)}. Every node is handed one number: what is still needed from there on.`, 0);

  const way = waysDown(tree).find((item) => total(tree, item) === target) ?? [];
  here = null;
  tag = null;
  const unasked = status.filter((state) => state === "unasked" || state === "idle").length;
  const finish: PathSumFrame = {
    scene,
    caption: found
      ? `${practice ? "Done: yes" : "Yes"} comes out of the top. The way ${listWords(way.map(val))} ends at a leaf and adds up to ${target}. The answer is true.`
      : `${practice ? "Done: no" : "No"} comes out of the top. Every leaf was asked, and no way down adds up to ${target}. The answer is false.`,
    state: { ...snap(), tones: tree.map((node) => (way.includes(node.id) ? "done" : STATUS_TONE[status[node.id]])), strips: found ? [wayStrip(tree, way, "hit"), blank.strips[1]] : blank.strips },
  };
  if (!practice) finish.codeLine = 6;
  frames.push(finish);
  if (practice) return frames;

  frames.push({
    scene,
    caption: `Time: O(n). Each node is entered at most once and does one small sum. Here the search entered ${visits} of the ${tree.length} nodes${unasked > 0 ? ", because a yes stops it early" : ""}.`,
    codeLine: 5,
    state: { ...finish.state, counter: { label: "node visits", value: visits } },
  });
  frames.push({
    scene,
    caption: `Space: O(h), where h is the height of the tree. Only the nodes on the current way down wait for a report. Here that was at most ${deepest.length}.`,
    codeLine: 6,
    state: { ...finish.state, tones: tree.map((node) => (deepest.includes(node.id) ? "window" : "faded")), edges: tree.map(() => ({ tone: "idle" })), out: null, strips: [wayStrip(tree, deepest), blank.strips[1]] },
  });
  return frames;
}

const readOrFallback = (input: string): Query => readQuery(input) ?? (readQuery(FALLBACK) as Query);

export const pathSumStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-112"],
  pattern: "Tree DFS",
  trigger: "a binary tree and a target number, and you must say whether some way from the top down to a leaf adds up to it",
  insight: "Carry one number down: what is still needed. Each node takes off its own value. Only a leaf may answer: yes if it is exactly what is still needed. A yes climbs straight up.",
  metaphor: {
    name: "A number handed down, a report climbing up",
    legend: "still needed = targetSum at this node, then remaining · report = the returned true or false · leaf = both children are null · waiting = the call stack",
    terms: ["report", "still needed", "leaf", "hands", "way down"],
  },
  traps: [{ name: TRAP, rule: "Only check the target at a leaf, where both children are null. Reaching the sum at a node that still has children is not a yes: the way must go on down to a leaf." }],
  template: [
    "search(node, need):",
    "    if node is empty: return false",
    "    if node is a leaf: return need == node.val      // only a leaf may answer",
    "    rest = need - node.val                          // hand the rest down",
    "    return search(node.left, rest) or search(node.right, rest)",
  ],
  complexity: {
    slow: "O(n · h)",
    time: "O(n)",
    timeWhy: "each node is entered at most once and does one subtraction",
    space: "O(h)",
    spaceWhy: "only the nodes on the current way down are waiting for reports",
  },
  code: CODE,
  examples: [
    { label: "target = 22", input: "[5,4,8,11,null,13,9,7,2,null,null,null,1]; target=22", expected: "true", note: "A yes climbs up and stops the search" },
    { label: "target = 20", input: "[5,4,8,11,null,13,9,7,2,null,null,null,1]; target=20", expected: "false", note: "Tricky: 20 is reached at 11, which is not a leaf" },
    { label: "[1,2], target = 1", input: "[1,2]; target=1", expected: "false", note: "The top alone is not a way down" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-124", title: "Binary Tree Maximum Path Sum" },
    { slug: "lc-104", title: "Maximum Depth of Binary Tree" },
    { slug: "lc-236", title: "Lowest Common Ancestor of a Binary Tree" },
  ],
  answer: (input) => String(solve(readOrFallback(input))),
  frames: (input) => {
    const query = readOrFallback(input);
    const solution = searchFrames(query);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(query, solve(query)),
      ...slowFrames(query),
      ...insightFrames(query),
      ...solution,
      ...searchFrames(readOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a number handed down to the leaves, and one report climbing back up. Say the idea in your head first, then reveal the card.",
        state: remembered.state,
      },
    ];
  },
  View: TreeStoryView,
};
