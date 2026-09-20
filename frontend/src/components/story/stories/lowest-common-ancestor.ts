import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type LcaFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. q hides below p, so it reaches the trap. */
const PRACTICE = "[6,2,8,0,4,7,9,null,null,3,5]; p=4; q=5";
const FALLBACK = "[3,5,1,6,2,0,8,null,null,7,4]; p=6; q=4";

const TRAP = "The Look Below Trap";

const CODE = [
  "TreeNode lowestCommonAncestor(TreeNode node, TreeNode p, TreeNode q) {",
  "    if (node == null) return null;",
  "    if (node == p || node == q) return node;",
  "    TreeNode left = lowestCommonAncestor(node.left, p, q);",
  "    TreeNode right = lowestCommonAncestor(node.right, p, q);",
  "    if (left != null && right != null) return node;",
  "    return left != null ? left : right;",
  "}",
];

/** Two strips, always: the slow way's two lists, or "waiting" and "heard" during the search. */
const STRIPS = 2;

type Query = { tree: TreeShapeNode[]; p: number; q: number };

/** "[3,5,1,6,2,0,8,null,null,7,4]; p=5; q=4" → the tree and the ids of the two marked nodes. */
function readQuery(input: string): Query | null {
  const [treeText = "", ...rest] = input.split(";");
  const tree = parseTree(treeText);
  const find = (letter: string) => {
    const match = rest.join(";").match(new RegExp(`${letter}\\s*=\\s*(-?\\d+)`));
    return match ? tree.findIndex((node) => node.val === Number(match[1])) : -1;
  };
  const p = find("p");
  const q = find("q");
  return tree.length > 0 && p >= 0 && q >= 0 && p !== q ? { tree, p, q } : null;
}

/** From a node up to the top, the node itself first. */
function wayUp(tree: TreeShapeNode[], id: number): number[] {
  const way: number[] = [];
  for (let at: number | null = id; at !== null; at = tree[at].parent) way.push(at);
  return way;
}

/** Independent solver: climb from q until we stand on p's way up. No reports involved. */
function solve({ tree, p, q }: Query): number {
  const above = new Set(wayUp(tree, p));
  return wayUp(tree, q).find((id) => above.has(id)) ?? 0;
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

function marksOf({ p, q }: Query) {
  return [
    { id: p, letter: "p" },
    { id: q, letter: "q" },
  ];
}

function pictureFrames(query: Query, answer: number): LcaFrame[] {
  const { tree, p, q } = query;
  const blank = { ...blankTreeState(tree, STRIPS), marks: marksOf(query) };
  const val = (id: number) => tree[id].val;
  const deep = tree[p].depth >= tree[q].depth ? p : q;
  const deepWay = wayUp(tree, deep);
  const shared = wayUp(tree, answer);
  const onAWay = new Set([...wayUp(tree, p), ...wayUp(tree, q)]);
  const outsider = tree.find((node) => !onAWay.has(node.id));
  const missing = outsider ? (wayUp(tree, p).includes(outsider.id) ? q : p) : p;
  return [
    { scene: "picture", caption: `This is a tree. The node ${val(0)} is at the top. Two nodes are marked: p is ${val(p)} and q is ${val(q)}.`, state: blank },
    {
      scene: "picture",
      caption: `An ancestor of a node is any node on the way from it up to the top. The node itself counts too. For ${val(deep)} that is ${listWords(deepWay.map(val))}.`,
      state: { ...blank, tones: tree.map((node) => (deepWay.includes(node.id) ? "window" : "idle")), edges: tree.map((node) => ({ tone: deepWay.includes(node.id) && node.id !== 0 ? "path" : "idle" })) },
    },
    {
      scene: "picture",
      caption: `${shared.length > 1 ? `Shared ancestors are on both ways up: ${listWords(shared.map(val))}.` : `The only node on both ways up is ${val(shared[0])}.`}${outsider ? ` ${outsider.val} is not one: ${val(missing)} is not below it.` : ""}`,
      state: { ...blank, tones: tree.map((node) => (shared.includes(node.id) ? "hit" : node.id === outsider?.id ? "miss" : "idle")) },
    },
    {
      scene: "picture",
      caption: `The goal: the lowest shared ancestor, the one furthest from the top. Here that is ${val(answer)}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === answer ? "done" : "idle")), tag: { id: answer, text: "lowest" } },
    },
  ];
}

/** The obvious way, really run: find the way down to p, find the way down to q, then compare the two lists. */
function slowFrames(query: Query): LcaFrame[] {
  const { tree, p, q } = query;
  const blank = { ...blankTreeState(tree, STRIPS), marks: marksOf(query) };
  const val = (id: number) => tree[id].val;
  let visits = 0;
  const findWay = (target: number): number[] => {
    const way: number[] = [];
    const walk = (id: number | null): boolean => {
      if (id === null) return false;
      visits++;
      way.push(id);
      if (id === target || walk(tree[id].left) || walk(tree[id].right)) return true;
      way.pop();
      return false;
    };
    walk(0);
    return way;
  };
  const strip = (label: string, way: number[], sharedCount = 0): TreeStrip => ({
    label,
    items: way.map((id, index) => ({ text: String(val(id)), tone: (index < sharedCount - 1 ? "hit" : index === sharedCount - 1 ? "done" : "idle") as CellTone })),
  });
  const wayEdges = (ways: number[][]): TreeEdgeMark[] => tree.map((node) => ({ tone: node.id !== 0 && ways.some((way) => way.includes(node.id)) ? "path" : "idle" }));

  const wayP = findWay(p);
  const afterP = visits;
  const wayQ = findWay(q);
  let sharedCount = 0;
  while (sharedCount < wayP.length && sharedCount < wayQ.length && wayP[sharedCount] === wayQ[sharedCount]) sharedCount++;
  const last = wayP[sharedCount - 1];

  return [
    {
      scene: "slow",
      caption: `The slow way: walk the tree until p is found, and write down the way from the top to ${val(p)}. That took ${afterP} node visits.`,
      state: { ...blank, tones: tree.map((node) => (wayP.includes(node.id) ? "window" : "idle")), edges: wayEdges([wayP]), strips: [strip("way to p", wayP), blank.strips[1]], counter: { label: "nodes visited", value: afterP } },
    },
    {
      scene: "slow",
      caption: `Then start again at the top and walk the tree a second time, to write down the way to ${val(q)}.`,
      state: { ...blank, tones: tree.map((node) => (wayQ.includes(node.id) ? "window" : "idle")), edges: wayEdges([wayQ]), strips: [strip("way to p", wayP), strip("way to q", wayQ)], counter: { label: "nodes visited", value: visits } },
    },
    {
      scene: "slow",
      caption: `Now compare the two lists from the top. They agree on ${listWords(wayP.slice(0, sharedCount).map(val))}, and then ${sharedCount < wayP.length && sharedCount < wayQ.length ? "they split" : "one list ends"}. The last shared node is ${val(last)}.`,
      state: {
        ...blank,
        tones: tree.map((node) => (node.id === last ? "done" : "idle")),
        edges: wayEdges([wayP, wayQ]),
        strips: [strip("way to p", wayP, sharedCount), strip("way to q", wayQ, sharedCount)],
        counter: { label: "nodes visited", value: visits },
      },
    },
    {
      scene: "slow",
      caption: `That is ${visits} node visits and two saved lists, for a tree of ${tree.length}. It is still O(n) time, but it walks the tree twice. One walk can do it all.`,
      state: { ...blank, tones: tree.map(() => "faded"), strips: [strip("way to p", wayP, sharedCount), strip("way to q", wayQ, sharedCount)], counter: { label: "nodes visited", value: visits } },
    },
  ];
}

function insightFrames(query: Query, answer: number): LcaFrame[] {
  const { tree, p, q } = query;
  const blank = { ...blankTreeState(tree, STRIPS), marks: marksOf(query) };
  const val = (id: number) => tree[id].val;
  const trapped = answer === p || answer === q;
  // Only reports the real search produces: a marked node hidden below the other never sends one.
  const senders = trapped ? [answer] : [p, q];
  const firstStep = (): TreeEdgeMark[] => tree.map((node) => (senders.includes(node.id) && node.parent !== null ? { tone: "report", badge: String(node.val) } : { tone: "idle" }));
  const allSteps = (): TreeEdgeMark[] => {
    const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
    for (const sender of senders) for (const id of wayUp(tree, sender)) if (id !== answer && tree[id].parent !== null) edges[id] = { tone: "report", badge: String(val(sender)) };
    return edges;
  };
  const tones = (done: boolean): CellTone[] => tree.map((node) => (done && node.id === answer ? "done" : senders.includes(node.id) ? "hit" : "idle"));
  const hidden = answer === p ? q : p;
  return [
    {
      scene: "insight",
      caption: "Picture one search walking down the tree. When it finds a marked node, that node sends a report back up: “found one here.”",
      state: { ...blank, tones: tones(false), edges: firstStep() },
    },
    {
      scene: "insight",
      caption: "A node that hears a report from one side only just passes it up. A node that hears nothing reports nothing.",
      state: { ...blank, tones: tones(false), edges: trapped ? firstStep() : allSteps() },
    },
    trapped
      ? {
          scene: "insight",
          caption: `Here ${val(hidden)} sits below ${val(answer)}, so only one report ever exists. When no two reports meet, that single report is the answer: ${val(answer)}.`,
          state: { ...blank, tones: tones(true), edges: firstStep(), tag: { id: answer, text: "answer" } },
        }
      : {
          scene: "insight",
          caption: `The first node that hears a report from both sides is the meeting point. Here the reports ${val(p)} and ${val(q)} meet at ${val(answer)}. That is the answer.`,
          state: { ...blank, tones: tones(true), edges: allSteps(), tag: { id: answer, text: "meet" } },
        },
  ];
}

type Status = "idle" | "waiting" | "reported" | "empty" | "hidden" | "answer";

const STATUS_TONE: Record<Status, CellTone> = { idle: "idle", waiting: "window", reported: "hit", empty: "faded", hidden: "miss", answer: "done" };

/**
 * The real recursive search, one frame per event. Sides that hold no marked node are told in one frame.
 * `practice` reuses it on a fresh tree, and the reader decides every report.
 */
function searchFrames(query: Query, scene: SceneId = "solution", practice = false): LcaFrame[] {
  const { tree, p, q } = query;
  const blank = { ...blankTreeState(tree, STRIPS), marks: marksOf(query) };
  const val = (id: number) => tree[id].val;
  const said = (report: number | null) => (report === null ? "nothing" : String(val(report)));
  const holdsMark = new Set([...wayUp(tree, p), ...wayUp(tree, q)]);
  const frames: LcaFrame[] = [];

  const status: Status[] = tree.map(() => "idle");
  const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
  const path: number[] = [];
  let here: number | null = null;
  let heard: TreeStrip = { label: "", items: [] };
  let out: string | null = null;
  let tag: TreeStoryState["tag"] = null;
  let note: TreeStoryState["note"] = null;
  let visits = 0;
  let deepest: number[] = [];
  const asked = { leaf: false, one: false, both: false, trap: false };
  let leafShown = false;

  const waiting = (ids: number[]): TreeStrip => ({ label: "waiting", items: ids.map((id, index) => ({ text: String(val(id)), tone: (index === ids.length - 1 ? "edge" : "window") as CellTone })) });
  const snap = (): TreeStoryState => ({
    ...blank,
    tones: tree.map((node) => (node.id === here && status[node.id] === "waiting" ? "edge" : STATUS_TONE[status[node.id]])),
    edges: edges.map((edge) => ({ ...edge })),
    out,
    tag,
    note,
    strips: [waiting(path), heard],
  });
  const push = (caption: string, codeLine: number, quiz?: StoryQuiz) => {
    const frame: LcaFrame = { scene, caption, state: snap() };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };
  const sendUp = (id: number, report: number | null) => {
    path.pop();
    status[id] = report === null ? "empty" : "reported";
    if (tree[id].parent === null) out = report === null ? null : String(val(report));
    else edges[id] = report === null ? { tone: "empty" } : { tone: "report", badge: String(val(report)) };
    here = tree[id].parent;
  };

  const leafQuiz = (id: number): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} is not marked, and there is nothing below it. What does it report up?`,
    options: [`Its own name, ${val(id)}`, "Nothing", `The name of the node above it, ${val(tree[id].parent ?? id)}`],
    answer: 1,
    why: "It found no marked node, so it has nothing to report.",
  });
  const trapQuiz = (id: number, letter: string): StoryQuiz => ({
    kind: "choice",
    question: `The search has reached ${val(id)}, the marked node ${letter}. Does it keep searching below ${val(id)} before it reports?`,
    options: ["Yes, the other marked node may be down there", `No, ${val(id)} reports itself at once`, "Yes, but only down its left side"],
    answer: 1,
    why: `If the other marked node is below ${val(id)}, then ${val(id)} is the answer anyway. If it is elsewhere, another side will report it. Looking below changes nothing.`,
  });
  const oneQuiz = (id: number, side: string, report: number): StoryQuiz => ({
    kind: "choice",
    question: `The node ${val(id)} heard a report from its ${side} side only. What does it send up?`,
    options: ["Nothing", `Its own name, ${val(id)}`, `The same report, ${val(report)}`],
    answer: 2,
    why: `Only one report arrived, so ${val(id)} is not a meeting point. It just passes the report along.`,
  });
  const meetQuiz = (id: number, left: number, right: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (const up of wayUp(tree, id).slice(1)) feedback[up] = `${val(up)} is above both marked nodes, but it is not the lowest node that is.`;
    for (const side of [left, right]) for (const down of wayUp(tree, side)) if (down !== id && feedback[down] === undefined && wayUp(tree, down).includes(id)) feedback[down] = `Only one of the two reports came through ${val(down)}. The other marked node is not below it.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: "Two reports have now arrived at the same node. Which node is the lowest shared ancestor? Click it.",
      answer: id,
      feedback,
      otherwise: "No report passed through that node. Look where the two coloured ways up come together.",
      why: `${val(id)} is the first node to hear from both sides, so one marked node is below each side of it. Nothing lower has both.`,
    };
  };
  const topQuiz = (report: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    const other = report === p ? q : p;
    feedback[0] = `${val(0)} heard only one report, so it is not a meeting point. It just passes that report out.`;
    if (other !== 0) feedback[other] = status[other] === "hidden" ? `${val(other)} was never reached. The search stopped above it.` : `${val(other)} is marked, but its report is not the one that reached the top.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `The top node ${val(0)} has heard from both of its sides. What leaves the top of the tree as the answer? Click that node.`,
      answer: report,
      feedback,
      otherwise: "That node never sent a report. Follow the coloured way up to the top and read what travels on it.",
      why: `The only report that reached the top is ${val(report)}. No two reports ever met, so ${val(report)} itself is the lowest shared ancestor.`,
    };
  };

  const visit = (id: number, lead: string, callLine: number): number | null => {
    const node = tree[id];
    visits++;
    path.push(id);
    if (path.length > deepest.length) deepest = [...path];
    status[id] = "waiting";
    here = id;
    heard = { label: "", items: [] };
    if (node.parent !== null) edges[id] = { tone: "path" };
    const kids = below(tree, id);

    if (id === p || id === q) {
      const letter = id === p ? "p" : "q";
      const other = id === p ? q : p;
      const trapped = kids.includes(other);
      const askTrap = trapped && (practice || !asked.trap);
      if (askTrap) asked.trap = true;
      push(lead, callLine, askTrap ? trapQuiz(id, letter) : undefined);
      for (const kid of kids) {
        status[kid] = kid === other ? "hidden" : "empty";
        if (trapped) edges[kid] = { tone: "skipped" };
      }
      if (trapped) note = { text: `✕ never searched below ${node.val}`, tone: "coral" };
      sendUp(id, id);
      here = id;
      push(
        trapped
          ? `${TRAP}: ${val(other)} hides below ${node.val}, yet the search never looks there. ${node.val} reports itself at once. With ${val(other)} below it, ${node.val} is the answer anyway.`
          : kids.length > 0
            ? `${node.val} is the marked node ${letter}. It reports its own name up at once. The search does not look below it.`
            : `${node.val} is the marked node ${letter}. It sends a report with its own name, ${node.val}, up the tree.`,
        2,
      );
      note = null;
      return id;
    }

    if (kids.length === 0) {
      if (practice || !leafShown) {
        leafShown = true;
        const ask = practice || !asked.leaf;
        asked.leaf = true;
        push(lead, callLine, ask ? leafQuiz(id) : undefined);
        sendUp(id, null);
        push(`${node.val} is not marked and has nothing below it. So it reports nothing.`, 6);
      } else {
        sendUp(id, null);
        push(`${lead} ${node.val} is not marked and has nothing below it, so it reports nothing.`, 6);
      }
      return null;
    }

    push(lead, callLine);

    const descend = (child: number | null, side: "left" | "right", before: string): number | null => {
      if (child === null) return null;
      const inside = [child, ...below(tree, child)];
      if (!holdsMark.has(child) && inside.length >= 2) {
        visits += inside.length;
        for (const at of inside) status[at] = "empty";
        edges[child] = { tone: "empty" };
        here = id;
        push(`${before}${before ? "Its" : `The`} ${side} side${before ? "" : ` of ${node.val}`} holds ${listWords(inside.map(val))}. None is marked, so that whole side reports nothing.`, side === "left" ? 3 : 4);
        return null;
      }
      const step = before ? `${before}Now the search goes down its ${side} side, to ${val(child)}.` : `The search goes down the ${side} side of ${node.val}, to ${val(child)}.`;
      return visit(child, step, side === "left" ? 3 : 4);
    };

    const left = descend(node.left, "left", "");
    const right = descend(node.right, "right", node.left === null ? `${node.val} has no left child. ` : `The left side of ${node.val} reported ${said(left)}. `);

    here = id;
    heard = {
      label: "heard",
      items: [
        { text: `left: ${said(left)}`, tone: left === null ? "idle" : "hit" },
        { text: `right: ${said(right)}`, tone: right === null ? "idle" : "hit" },
      ],
    };
    const leftWords = node.left === null ? "It has no left child." : `Its left side reported ${said(left)}.`;
    const rightWords = node.right === null ? "It has no right child." : `Its right side reported ${said(right)}.`;
    const isTop = node.parent === null;

    if (left !== null && right !== null) {
      const ask = practice || !asked.both;
      asked.both = true;
      push(`Back at ${node.val}. ${leftWords} ${rightWords}`, 5, ask ? meetQuiz(id, left, right) : undefined);
      tag = { id, text: "meet" };
      sendUp(id, id);
      status[id] = "answer";
      here = id;
      push(`Two reports meet at ${node.val}, one from each side. So ${node.val} is the meeting point. It reports its own name ${isTop ? "out of the tree" : "up"}.`, 5);
      return id;
    }

    const report = left ?? right;
    if (report === null) {
      sendUp(id, null);
      push(`Back at ${node.val}. Neither side reported anything, so ${node.val} reports nothing.`, 6);
      return null;
    }
    const side = left !== null ? "left" : "right";
    let quiz: StoryQuiz | undefined;
    if (practice && isTop) quiz = topQuiz(report);
    else if (practice || !asked.one) quiz = oneQuiz(id, side, report);
    asked.one = true;
    push(`Back at ${node.val}. ${leftWords} ${rightWords}`, 5, quiz);
    sendUp(id, report);
    here = id;
    push(`${node.val} heard only one report, so it is not a meeting point. It passes the report ${val(report)} ${isTop ? "out of the top of the tree" : "up"} unchanged.`, 6);
    return report;
  };

  const found = visit(
    0,
    practice ? `Your turn, on a new tree. p is ${val(p)} and q is ${val(q)}. The search starts at the top node ${val(0)}, and you decide every report.` : `The search starts at the top node ${val(0)}. Each node will ask the nodes below it, then send one report up.`,
    0,
  );
  const answer = found ?? 0;
  const unseen = status.findIndex((state) => state === "hidden");

  here = null;
  heard = { label: "", items: [] };
  status[answer] = "answer";
  tag = { id: answer, text: "answer" };
  push(
    practice
      ? `Done. The answer is ${val(answer)}.${unseen >= 0 ? ` The search never even saw ${val(unseen)}, and it did not need to.` : " You decided every report yourself."}`
      : `The report that comes out of the top is ${val(answer)}. The answer is ${val(answer)}.${unseen >= 0 ? ` The search never even saw ${val(unseen)}.` : ""}`,
    0,
  );
  if (practice) return frames;

  const end = snap();
  frames.push({
    scene,
    caption: `Time: O(n). One search walks down once, and no node is entered twice. Here it entered ${visits} of the ${tree.length} nodes.`,
    codeLine: 3,
    state: { ...end, counter: { label: "nodes visited", value: visits } },
  });
  frames.push({
    scene,
    caption: `Space: O(h), where h is the height of the tree. Only the nodes on the way down wait for a report. Here that was at most ${deepest.length}.`,
    codeLine: 4,
    state: { ...end, tones: tree.map((node) => (deepest.includes(node.id) ? "window" : "faded")), tag: null, strips: [waiting(deepest), end.strips[1]] },
  });
  return frames;
}

const readOrFallback = (input: string): Query => readQuery(input) ?? (readQuery(FALLBACK) as Query);

export const lowestCommonAncestorStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-236", "shared-ancestor"],
  pattern: "One search down the tree, reports passed back up (recursion that returns what it found)",
  trigger: "a tree and two of its nodes, and you are asked for the lowest node that sits above both",
  insight: "Search down once. A marked node reports itself up. One report is passed along; the node where two reports meet is the answer.",
  metaphor: {
    name: "Reports climbing the tree",
    legend: "report = the returned node · nothing = null · heard = left and right · meeting point = both are not null · waiting = the call stack",
    terms: ["report", "search", "meeting point", "marked"],
  },
  traps: [{ name: TRAP, rule: "A marked node reports itself at once; never search below it. If the other marked node hides down there, this one is the answer anyway." }],
  template: [
    "find(node):",
    "    if node is empty: return nothing",
    "    if node is what we look for: return node        // do not look below",
    "    left = find(node.left);  right = find(node.right)",
    "    if both sides found something: return node      // the meeting point",
    "    return whichever side found something",
  ],
  complexity: {
    slow: "O(n), but two walks and two saved lists",
    time: "O(n)",
    timeWhy: "one search; every node is entered at most once",
    space: "O(h)",
    spaceWhy: "only the nodes on the current way down are waiting for reports",
  },
  code: CODE,
  examples: [
    { label: "p = 6, q = 4", input: "[3,5,1,6,2,0,8,null,null,7,4]; p=6; q=4", expected: "5", note: "Two reports meet" },
    { label: "p = 5, q = 4", input: "[3,5,1,6,2,0,8,null,null,7,4]; p=5; q=4", expected: "5", note: "Tricky: q hides below p" },
    { label: "p = 7, q = 8", input: "[3,5,1,6,2,0,8,null,null,7,4]; p=7; q=8", expected: "3", note: "Deep in different branches" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-235", title: "Lowest Common Ancestor of a Binary Search Tree" },
    { slug: "lc-543", title: "Diameter of Binary Tree" },
    { slug: "lc-124", title: "Binary Tree Maximum Path Sum" },
  ],
  answer: (input) => {
    const query = readOrFallback(input);
    return String(query.tree[solve(query)].val);
  },
  frames: (input) => {
    const query = readOrFallback(input);
    const answer = solve(query);
    const solution = searchFrames(query);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(query, answer),
      ...slowFrames(query),
      ...insightFrames(query, answer),
      ...solution,
      ...searchFrames(readOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption:
          answer === query.p || answer === query.q
            ? "This is the picture to remember: a found node reports at once, and its report climbs to the top. Say the idea in your head first, then reveal the card."
            : "This is the picture to remember: reports climbing up until they meet. Say the idea in your head first, then reveal the card.",
        state: { ...remembered.state, tag: remembered.state.tag ? { ...remembered.state.tag, text: "answer" } : null },
      },
    ];
  },
  View: TreeStoryView,
};
