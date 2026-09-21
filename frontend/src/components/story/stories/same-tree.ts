import type { CellTone } from "@/components/learn/viz/primitives";

import { TwoTreesView, blankPanel, pairCell, pairCellCount, type PairHole, type PairPanel, type PairSpot, type TwoTreesState } from "../agy-trees1-two-trees-view";
import { parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type SameFrame = StoryFrame<TwoTreesState>;

/** Fresh trees for the "your turn" run. Below 2, tree p has 1 on the left and tree q has an empty spot there, so it reaches the trap. */
const PRACTICE = "p=[4,2,6,1]; q=[4,2,6,null,1]";
const FALLBACK = "p=[1,2,3]; q=[1,2,3]";

const TRAP = "The Empty Spot Trap";

const CODE = [
  "boolean isSameTree(TreeNode p, TreeNode q) {",
  "    if (p == null && q == null) return true;",
  "    if (p == null || q == null) return false;",
  "    if (p.val != q.val) return false;",
  "    return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);",
  "}",
];

/** Two strips, always: "waiting" and "pair" during the search, the two written lists in the slow way. */
const STRIPS = 2;
const EMPTY_MARK = "–";

type Side = "left" | "right";
type Query = { p: TreeShapeNode[]; q: TreeShapeNode[] };

/** "p=[1,2,3]; q=[1,2,3]" → the two trees. */
function readQuery(input: string): Query | null {
  const find = (letter: string) => parseTree(input.match(new RegExp(`${letter}\\s*=\\s*(\\[[^\\]]*\\])`))?.[1] ?? "");
  const p = find("p");
  const q = find("q");
  return p.length > 0 && q.length > 0 ? { p, q } : null;
}

/** One tree written down as a list, top first, then its left side, then its right side. Empty spots are written too. */
function writeDown(tree: TreeShapeNode[]): string[] {
  const list: string[] = [];
  const stack: (number | null)[] = [0];
  while (stack.length > 0) {
    const id = stack.pop() as number | null;
    list.push(id === null ? EMPTY_MARK : String(tree[id].val));
    if (id !== null) stack.push(tree[id].right, tree[id].left);
  }
  return list;
}

/** Independent solver: write both trees down in full and compare the two lists. No walking in pairs. */
function solve({ p, q }: Query): boolean {
  return writeDown(p).join(",") === writeDown(q).join(",");
}

/** One step of the real search: the pair of spots the two walkers stand on, and what that pair reported. */
type Visit = { a: number | null; b: number | null; parentA: number | null; parentB: number | null; side: Side | null; same: boolean };

/** The real search, run once without pictures, so the layout knows in advance which empty spots will be looked at. */
function realVisits({ p, q }: Query): Visit[] {
  const visits: Visit[] = [];
  const visit = (a: number | null, b: number | null, parentA: number | null, parentB: number | null, side: Side | null): boolean => {
    const entry: Visit = { a, b, parentA, parentB, side, same: false };
    visits.push(entry);
    if (a === null && b === null) entry.same = true;
    else if (a === null || b === null) entry.same = false;
    else if (p[a].val !== q[b].val) entry.same = false;
    else entry.same = visit(p[a].left, q[b].left, a, b, "left") && visit(p[a].right, q[b].right, a, b, "right");
    return entry.same;
  };
  visit(0, 0, null, null, null);
  return visits;
}

/**
 * Empty spots that get drawn. Where only one tree has an empty spot, it is always visible: that is a difference.
 * The first pair of two empty spots (and its sibling pair) is reserved too, and shown only while it is looked at.
 */
function planHoles(visits: Visit[]): { p: PairHole[]; q: PairHole[] } {
  const holes = { p: [] as PairHole[], q: [] as PairHole[] };
  const firstEmpty = visits.find((visit) => visit.a === null && visit.b === null);
  for (const visit of visits) {
    if (visit.side === null || visit.parentA === null || visit.parentB === null) continue;
    const oneEmpty = (visit.a === null) !== (visit.b === null);
    const shownPair = visit.a === null && visit.b === null && firstEmpty !== undefined && visit.parentA === firstEmpty.parentA;
    if (visit.a === null && (oneEmpty || shownPair)) holes.p.push({ parent: visit.parentA, side: visit.side, tone: "idle", show: oneEmpty });
    if (visit.b === null && (oneEmpty || shownPair)) holes.q.push({ parent: visit.parentB, side: visit.side, tone: "idle", show: oneEmpty });
  }
  return holes;
}

function blankState(query: Query, holes: { p: PairHole[]; q: PairHole[] }): TwoTreesState {
  return {
    panels: [blankPanel("tree p", query.p, holes.p), blankPanel("tree q", query.q, holes.q)],
    mirror: false,
    out: null,
    strips: Array.from({ length: STRIPS }, () => ({ label: "", items: [] })),
    counter: null,
    note: null,
  };
}

const spotName = (tree: TreeShapeNode[], id: number | null) => (id === null ? "an empty spot" : String(tree[id].val));

function pictureFrames(query: Query, holes: { p: PairHole[]; q: PairHole[] }, visits: Visit[], same: boolean): SameFrame[] {
  const blank = blankState(query, holes);
  const { p, q } = query;
  const differs = visits.find((visit) => !visit.same && (visit.a === null || visit.b === null || p[visit.a].val !== q[visit.b].val));
  const paint = (tone: CellTone, only?: Visit): PairPanel[] =>
    blank.panels.map((panel, at) => ({
      ...panel,
      tones: panel.tree.map((node) => (only ? ((at === 0 ? only.a : only.b) === node.id ? tone : "idle") : tone)),
      holes: panel.holes.map((hole) => (only && (at === 0 ? only.a : only.b) === null && hole.parent === (at === 0 ? only.parentA : only.parentB) && hole.side === only.side ? { ...hole, tone } : hole)),
    }));
  const frames: SameFrame[] = [
    { scene: "picture", caption: "These are two trees, p and q. Below every node there is a left spot and a right spot. A spot holds a node, or it is empty.", state: blank },
    {
      scene: "picture",
      caption: `Two trees are the same when every spot matches: the same value in both trees, or empty in both trees. The two top spots match here: ${p[0].val} and ${q[0].val}.`,
      state: { ...blank, panels: paint("hit", visits[0]) },
    },
  ];
  if (differs) {
    const what = differs.a === null || differs.b === null ? `One tree has ${spotName(p, differs.a === null ? null : differs.a)} where the other has ${differs.a === null ? spotName(q, differs.b) : "an empty spot"}.` : `This spot holds ${p[differs.a].val} in p but ${q[differs.b].val} in q.`;
    frames.push({
      scene: "picture",
      caption: `One spot that does not match makes the trees different. ${what}`,
      state: { ...blank, panels: paint("miss", differs), note: { text: "✕ this spot differs", tone: "coral" } },
    });
  } else {
    frames.push({ scene: "picture", caption: "One spot that does not match would make the trees different: another value, or a node where the other tree is empty. Here every spot matches.", state: { ...blank, panels: paint("hit") } });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: say whether p and q are the same tree, in shape and in values. Here the answer is ${same}.`,
    state: differs ? { ...blank, panels: paint("miss", differs) } : { ...blank, panels: paint("hit") },
  });
  return frames;
}

/** The obvious way, really run: write each whole tree down as a list, then compare the lists. */
function slowFrames(query: Query, holes: { p: PairHole[]; q: PairHole[] }): SameFrame[] {
  const blank = blankState(query, holes);
  const listP = writeDown(query.p);
  const listQ = writeDown(query.q);
  let split = 0;
  while (split < listP.length && split < listQ.length && listP[split] === listQ[split]) split++;
  const same = split === listP.length && split === listQ.length;
  const strip = (label: string, list: string[], compared: boolean): TreeStrip => ({
    label,
    items: list.map((text, index) => ({ text, tone: (!compared ? "idle" : index < split ? "hit" : index === split ? "miss" : "faded") as CellTone })),
  });
  const written = listP.length + listQ.length;
  const walked = (count: number): PairPanel[] => blank.panels.map((panel, at) => ({ ...panel, tones: panel.tree.map(() => (at < count ? "window" : "idle")) }));
  const say = (text: string) => (text === EMPTY_MARK ? "an empty spot" : text);
  return [
    {
      scene: "slow",
      caption: `The slow way: walk all of tree p and write down every spot, top first, then left, then right. Empty spots are written as a dash. That is ${listP.length} spots.`,
      state: { ...blank, panels: walked(1), strips: [strip("list p", listP, false), blank.strips[1]], counter: { label: "spots written", value: listP.length } },
    },
    {
      scene: "slow",
      caption: `Then walk all of tree q and write its list in the same way. Now ${written} spots are written down.`,
      state: { ...blank, panels: walked(2), strips: [strip("list p", listP, false), strip("list q", listQ, false)], counter: { label: "spots written", value: written } },
    },
    {
      scene: "slow",
      caption: same ? `Now compare the two lists from the start. All ${listP.length} places agree, so the trees are the same.` : `Now compare the two lists from the start. At place ${split + 1} they differ: ${say(listP[split] ?? "nothing")} against ${say(listQ[split] ?? "nothing")}. So the trees are different.`,
      state: { ...blank, strips: [strip("list p", listP, true), strip("list q", listQ, true)], counter: { label: "spots written", value: written } },
    },
    {
      scene: "slow",
      caption: `That is O(n) time, but also O(n) extra space for two whole lists. And all ${written} spots were written before the first one was compared${same ? "" : ", although the trees differ early"}.`,
      state: { ...blank, panels: blank.panels.map((panel) => ({ ...panel, tones: panel.tree.map(() => "faded" as CellTone) })), strips: [strip("list p", listP, true), strip("list q", listQ, true)], counter: { label: "spots written", value: written } },
    },
  ];
}

type Status = "idle" | "waiting" | "yes" | "no" | "passed" | "unasked";

const STATUS_TONE: Record<Status, CellTone> = { idle: "idle", waiting: "window", yes: "hit", no: "miss", passed: "faded", unasked: "faded" };

/**
 * The real search, one frame per event: two walkers, always on the same spot of their own tree.
 * `practice` reuses it on fresh trees, and the reader makes every decision.
 */
function searchFrames(query: Query, scene: SceneId = "solution", practice = false): SameFrame[] {
  const { p, q } = query;
  const holes = planHoles(realVisits(query));
  const blank = blankState(query, holes);
  const frames: SameFrame[] = [];

  const statusP: Status[] = p.map(() => "idle");
  const statusQ: Status[] = q.map(() => "idle");
  const edgesP: TreeEdgeMark[] = p.map(() => ({ tone: "idle" }));
  const edgesQ: TreeEdgeMark[] = q.map(() => ({ tone: "idle" }));
  const holeP = holes.p.map((hole) => ({ ...hole }));
  const holeQ = holes.q.map((hole) => ({ ...hole }));
  const path: string[] = [];
  let walkerP: PairSpot | null = null;
  let walkerQ: PairSpot | null = null;
  let pairStrip: TreeStrip = { label: "", items: [] };
  let out: TwoTreesState["out"] = null;
  let note: TwoTreesState["note"] = null;
  let checked = 0;
  let deepest = 0;
  const asked = { step: false, empty: false, trap: false, value: false, pass: false };
  let leafShown = false;
  let checkShown = false;

  const holeAt = (list: PairHole[], parent: number | null, side: Side | null) => list.findIndex((hole) => hole.parent === parent && hole.side === side);
  const spotOf = (list: PairHole[], id: number | null, parent: number | null, side: Side | null): PairSpot | null => {
    if (id !== null) return { kind: "node", id };
    const index = holeAt(list, parent, side);
    return index >= 0 ? { kind: "hole", index } : null;
  };
  const sameSpot = (one: PairSpot | null, other: PairSpot) => one !== null && one.kind === other.kind && (one.kind === "node" ? one.id === (other as { id: number }).id : one.index === (other as { index: number }).index);
  const panelsNow = (): PairPanel[] => [
    {
      ...blank.panels[0],
      tones: p.map((node) => (walkerP !== null && sameSpot(walkerP, { kind: "node", id: node.id }) && statusP[node.id] === "waiting" ? "edge" : STATUS_TONE[statusP[node.id]])),
      edges: edgesP.map((edge) => ({ ...edge })),
      holes: holeP.map((hole) => ({ ...hole })),
      walkers: walkerP ? [walkerP] : [],
    },
    {
      ...blank.panels[1],
      tones: q.map((node) => (walkerQ !== null && sameSpot(walkerQ, { kind: "node", id: node.id }) && statusQ[node.id] === "waiting" ? "edge" : STATUS_TONE[statusQ[node.id]])),
      edges: edgesQ.map((edge) => ({ ...edge })),
      holes: holeQ.map((hole) => ({ ...hole })),
      walkers: walkerQ ? [walkerQ] : [],
    },
  ];
  const snap = (): TwoTreesState => ({
    ...blank,
    panels: panelsNow(),
    out,
    note,
    strips: [{ label: "waiting", items: path.map((text, index) => ({ text, tone: (index === path.length - 1 ? "edge" : "window") as CellTone })) }, pairStrip],
  });
  const push = (caption: string, codeLine: number, quiz?: StoryQuiz) => {
    const frame: SameFrame = { scene, caption, state: snap() };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };
  const showPair = (a: number | null, b: number | null) => {
    pairStrip = {
      label: "pair",
      items: [
        { text: `p: ${a === null ? "empty" : p[a].val}`, tone: "idle" },
        { text: `q: ${b === null ? "empty" : q[b].val}`, tone: "idle" },
      ],
    };
  };
  /** The report of a pair of nodes goes up both trees at once. */
  const sendUp = (a: number, b: number, yes: boolean, origin: boolean) => {
    path.pop();
    statusP[a] = yes ? "yes" : origin ? "no" : "passed";
    statusQ[b] = yes ? "yes" : origin ? "no" : "passed";
    if (p[a].parent === null) out = { text: yes ? "yes" : "no", tone: yes ? "teal" : "coral" };
    else {
      edgesP[a] = yes ? { tone: "report", badge: "yes" } : { tone: "skipped", badge: "no" };
      edgesQ[b] = yes ? { tone: "report" } : { tone: "skipped" };
    }
  };

  const stepQuiz = (mover: 0 | 1, side: Side, parentA: number, parentB: number, target: PairSpot): StoryQuiz => {
    const other = mover === 0 ? 1 : 0;
    const otherTree = other === 0 ? p : q;
    const otherParent = other === 0 ? parentA : parentB;
    const panels = panelsNow();
    const feedback: Record<number, string> = {};
    const wrongSide = spotOf(other === 0 ? holeP : holeQ, otherTree[otherParent][side === "left" ? "right" : "left"], otherParent, side === "left" ? "right" : "left");
    if (wrongSide && (wrongSide.kind === "node" || (other === 0 ? holeP : holeQ)[wrongSide.index].show)) feedback[pairCell(panels, other, wrongSide)] = `That is the ${side === "left" ? "right" : "left"} spot. The two walkers always make the same turn.`;
    feedback[pairCell(panels, other, { kind: "node", id: otherParent })] = "That walker stands there now. It must step down, like the other one did.";
    for (const node of mover === 0 ? p : q) feedback[pairCell(panels, mover, { kind: "node", id: node.id })] = `That spot is in tree ${mover === 0 ? "p" : "q"}. The question is about the walker in tree ${other === 0 ? "p" : "q"}.`;
    return {
      kind: "cell",
      cells: pairCellCount(panels),
      question: `The walker in tree ${mover === 0 ? "p" : "q"} has stepped ${side}. Where must the walker in tree ${other === 0 ? "p" : "q"} stand now? Click that spot.`,
      answer: pairCell(panels, other, target),
      feedback,
      otherwise: "The two walkers always make the same turn from the same spot. Follow that turn in the other tree.",
      why: "Same turn, same spot. Only then does the pair compare what belongs together, even when one of the spots is empty.",
    };
  };
  const emptyQuiz = (side: Side, a: number, b: number): StoryQuiz => ({
    kind: "choice",
    question: `Below ${p[a].val} and ${q[b].val}, both ${side} spots are empty. What does this pair of empty spots report up?`,
    options: ["Yes: empty in both trees is a match", "No: there is nothing to compare", "Nothing. Empty pairs are skipped"],
    answer: 0,
    why: "The trees agree here: both end at this spot. A pair of two empty spots is a match.",
  });
  const trapQuiz = (a: number | null, b: number | null): StoryQuiz => ({
    kind: "choice",
    question: `One walker stands on ${a === null ? q[b as number].val : p[a].val}, the other on an empty spot. What must this pair check first?`,
    options: ["Whether the two values are the same", "Whether one of the two spots is empty", "Whether the spots below them match"],
    answer: 1,
    why: "An empty spot has no value. Reading one crashes the program, so emptiness is always checked before any value is read.",
  });
  const valueQuiz = (a: number, b: number): StoryQuiz => ({
    kind: "choice",
    question: `The walkers stand on ${p[a].val} in p and ${q[b].val} in q. Neither spot is empty. What does this pair report up?`,
    options: ["Yes, because both spots hold a node", "No, at once. The spots below are not looked at", "Nothing yet. It first asks the pairs below"],
    answer: 1,
    why: "Two different values at the same spot already make the trees different. Nothing below can repair that.",
  });
  const passQuiz = (a: number, b: number, side: Side): StoryQuiz => ({
    kind: "choice",
    question: `The pair ${p[a].val} and ${q[b].val} heard no from its ${side} pair. What does it do next?`,
    options: [side === "left" ? "It asks its right pair too, to be sure" : "It asks its left pair again", "It reports no up at once", "It reports yes, because its own values match"],
    answer: 1,
    why: "One pair that differs makes the whole answer false. So a no goes straight up, and nothing else is asked.",
  });

  const label = (a: number | null, b: number | null) => `${a === null ? EMPTY_MARK : p[a].val}|${b === null ? EMPTY_MARK : q[b].val}`;

  const visit = (a: number, b: number, lead: string, callLine: number): boolean => {
    checked++;
    path.push(label(a, b));
    deepest = Math.max(deepest, path.length);
    statusP[a] = "waiting";
    statusQ[b] = "waiting";
    walkerP = { kind: "node", id: a };
    walkerQ = { kind: "node", id: b };
    showPair(a, b);
    if (p[a].parent !== null) edgesP[a] = { tone: "path" };
    if (q[b].parent !== null) edgesQ[b] = { tone: "path" };
    const where = p[a].parent === null ? "out of the top" : "up";

    if (p[a].val !== q[b].val) {
      const ask = practice || !asked.value;
      asked.value = true;
      push(lead, callLine, ask ? valueQuiz(a, b) : undefined);
      sendUp(a, b, false, true);
      push(`${p[a].val} and ${q[b].val} are different values, so this pair reports no ${where}. The spots below them are never looked at.`, 3);
      return false;
    }

    const sides: Side[] = ["left", "right"];
    const bare = sides.every((side) => p[a][side] === null && q[b][side] === null);
    if (bare && leafShown && !practice) {
      checked += 2;
      sendUp(a, b, true, false);
      push(`${lead} The values are the same, and all spots below them are empty in both trees. So this pair reports yes ${where}.`, 4);
      return true;
    }

    if (!checkShown) {
      checkShown = true;
      push(lead, callLine);
      push(`Neither spot is empty, so both values can be read. ${p[a].val} and ${q[b].val} are the same. Now this pair asks the two pairs below it.`, 3);
    } else {
      push(`${lead} Neither spot is empty, and the values are the same. So this pair asks the two pairs below it.`, 3);
    }

    for (const side of sides) {
      const nextA = p[a][side];
      const nextB = q[b][side];
      walkerP = { kind: "node", id: a };
      walkerQ = { kind: "node", id: b };
      showPair(a, b);
      let same: boolean;

      if (nextA === null && nextB === null) {
        // Two empty spots. Drawn and asked the first time; later told in one sentence.
        checked++;
        const atP = holeAt(holeP, a, side);
        const atQ = holeAt(holeQ, b, side);
        if (atP >= 0 && atQ >= 0 && (practice || !leafShown || side === "right")) {
          holeP[atP] = { ...holeP[atP], show: true, tone: "edge" };
          holeQ[atQ] = { ...holeQ[atQ], show: true, tone: "edge" };
          walkerP = { kind: "hole", index: atP };
          walkerQ = { kind: "hole", index: atQ };
          showPair(null, null);
          const ask = !asked.empty;
          asked.empty = true;
          if (side === "left" || ask) {
            push(`Both walkers step ${side}, below ${p[a].val} and ${q[b].val}. Both of them find an empty spot.`, 4, ask ? emptyQuiz(side, a, b) : undefined);
            holeP[atP] = { ...holeP[atP], tone: "hit" };
            holeQ[atQ] = { ...holeQ[atQ], tone: "hit" };
            push("Two empty spots match: both trees end here. So this pair reports yes.", 1);
          } else {
            holeP[atP] = { ...holeP[atP], tone: "hit" };
            holeQ[atQ] = { ...holeQ[atQ], tone: "hit" };
            push(`Both walkers step ${side}, and again both find an empty spot. Two empty spots match, so this pair reports yes too.`, 1);
          }
        }
        same = true;
      } else if (nextA === null || nextB === null) {
        // One empty spot: the trap. The walker that lands on a node steps first; the reader places the other one.
        checked++;
        const mover: 0 | 1 = nextA !== null ? 0 : 1;
        const target = spotOf(mover === 0 ? holeQ : holeP, null, mover === 0 ? b : a, side) as PairSpot;
        if (mover === 0) walkerP = { kind: "node", id: nextA as number };
        else walkerQ = { kind: "node", id: nextB as number };
        if (practice || !asked.step) {
          asked.step = true;
          push(`The walker in tree ${mover === 0 ? "p" : "q"} steps ${side}, below ${mover === 0 ? p[a].val : q[b].val}, and stands on ${mover === 0 ? p[nextA as number].val : q[nextB as number].val}.`, 4, stepQuiz(mover, side, a, b, target));
        }
        walkerP = spotOf(holeP, nextA, a, side);
        walkerQ = spotOf(holeQ, nextB, b, side);
        if (target.kind === "hole") (mover === 0 ? holeQ : holeP)[target.index].tone = "edge";
        if (nextA !== null) statusP[nextA] = "waiting";
        if (nextB !== null) statusQ[nextB] = "waiting";
        showPair(nextA, nextB);
        path.push(label(nextA, nextB));
        deepest = Math.max(deepest, path.length);
        const ask = practice || !asked.trap;
        asked.trap = true;
        push(`Both walkers have stepped ${side}. In tree p the spot holds ${spotName(p, nextA)}. In tree q it holds ${spotName(q, nextB)}.`, 4, ask ? trapQuiz(nextA, nextB) : undefined);
        if (target.kind === "hole") (mover === 0 ? holeQ : holeP)[target.index].tone = "miss";
        if (nextA !== null) {
          statusP[nextA] = "no";
          edgesP[nextA] = { tone: "skipped", badge: "no" };
        }
        if (nextB !== null) {
          statusQ[nextB] = "no";
          edgesQ[nextB] = { tone: "skipped", badge: "no" };
        }
        path.pop();
        note = { text: "✕ no value to read", tone: "coral" };
        push(`${TRAP}: an empty spot has no value, and reading one crashes the program. So empty spots are checked first. One empty and one not: this pair reports no.`, 2);
        note = null;
        same = false;
      } else {
        const stepLead = `Both walkers step ${side} onto ${p[nextA].val} in p and ${q[nextB].val} in q.`;
        if (practice || !asked.step) {
          asked.step = true;
          walkerP = { kind: "node", id: nextA };
          push(`The walker in tree p steps ${side}, below ${p[a].val}, and stands on ${p[nextA].val}.`, 4, stepQuiz(0, side, a, b, { kind: "node", id: nextB }));
        }
        same = visit(nextA, nextB, stepLead, 4);
      }

      if (!same) {
        walkerP = { kind: "node", id: a };
        walkerQ = { kind: "node", id: b };
        showPair(a, b);
        const ask = practice || !asked.pass;
        asked.pass = true;
        push(`Back at the pair ${p[a].val} and ${q[b].val}. Its ${side} pair reported no.`, 4, ask ? passQuiz(a, b, side) : undefined);
        const skipped = side === "left" && (p[a].right !== null || q[b].right !== null);
        if (side === "left") {
          const fade = (tree: TreeShapeNode[], status: Status[], edges: TreeEdgeMark[], id: number | null) => {
            if (id === null) return;
            const walk = (at: number | null) => {
              if (at === null) return;
              status[at] = "unasked";
              walk(tree[at].left);
              walk(tree[at].right);
            };
            walk(id);
            edges[id] = { tone: "empty" };
          };
          fade(p, statusP, edgesP, p[a].right);
          fade(q, statusQ, edgesQ, q[b].right);
        }
        sendUp(a, b, false, false);
        push(`One pair that differs is enough. The pair ${p[a].val} and ${q[b].val} passes the report no ${where} at once${skipped ? ", and its right pair is never asked" : ""}.`, 4);
        return false;
      }
    }

    leafShown = leafShown || bare;
    walkerP = { kind: "node", id: a };
    walkerQ = { kind: "node", id: b };
    showPair(a, b);
    for (const list of [holeP, holeQ]) list.forEach((hole, index) => (list[index] = hole.tone === "hit" ? { ...hole, show: false, tone: "idle" } : hole));
    sendUp(a, b, true, false);
    push(`Back at the pair ${p[a].val} and ${q[b].val}. The values match, and both pairs below reported yes. So this pair reports yes ${where}.`, 4);
    return true;
  };

  const same = visit(
    0,
    0,
    practice
      ? `Your turn, on two new trees. One walker stands at the top of each tree: on ${p[0].val} in p and ${q[0].val} in q. You make every decision.`
      : `One walker stands at the top of each tree: on ${p[0].val} in p and on ${q[0].val} in q. They will always make the same turn, and every pair of spots sends one report up.`,
    0,
  );

  walkerP = null;
  walkerQ = null;
  pairStrip = { label: "", items: [] };
  push(
    same
      ? `${practice ? "Done: yes" : "Yes"} comes out of the top. Every pair of spots matched, in shape and in value. The answer is true.`
      : `${practice ? "Done: no" : "No"} comes out of the top. One pair of spots that differs is enough. The answer is false.`,
    4,
  );
  if (practice) return frames;

  const end = snap();
  frames.push({
    scene,
    caption: `Time: O(n). The walkers stand on each pair of spots at most once, and stop at the first no. Here they checked ${checked} ${checked === 1 ? "pair" : "pairs"}.`,
    codeLine: 4,
    state: { ...end, counter: { label: "pairs checked", value: checked } },
  });
  frames.push({
    scene,
    caption: `Space: O(h), where h is the height of the trees. Only the pairs on the way down wait for a report. Here that was at most ${deepest}, and no list was written.`,
    codeLine: 4,
    state: { ...end, note: { text: `most pairs waiting: ${deepest}`, tone: "accent" } },
  });
  return frames;
}

function insightFrames(query: Query, holes: { p: PairHole[]; q: PairHole[] }, visits: Visit[]): SameFrame[] {
  const blank = blankState(query, holes);
  const { p, q } = query;
  const walkersOn = (visit: Visit, tone: CellTone): PairPanel[] =>
    blank.panels.map((panel, at) => {
      const id = at === 0 ? visit.a : visit.b;
      const parent = at === 0 ? visit.parentA : visit.parentB;
      const hole = panel.holes.findIndex((item) => item.parent === parent && item.side === visit.side);
      return {
        ...panel,
        tones: panel.tree.map((node) => (node.id === id ? tone : "idle")),
        holes: panel.holes.map((item, index) => (id === null && index === hole ? { ...item, show: true, tone } : item)),
        walkers: id !== null ? [{ kind: "node", id } as PairSpot] : hole >= 0 ? [{ kind: "hole", index: hole } as PairSpot] : [],
      };
    });
  // The first pair that settles something by itself: a difference if there is one, otherwise the first pair of two empty spots.
  const differs = visits.find((visit) => !visit.same && (visit.a === null || visit.b === null || p[visit.a].val !== q[visit.b].val));
  const settled = differs ?? visits.find((visit) => visit.a === null && visit.b === null) ?? visits[0];
  const verdict = settled.a === null && settled.b === null ? "two empty spots, so it reports yes" : settled.a === null || settled.b === null ? "one empty spot and one node, so it reports no" : `${p[settled.a].val} and ${q[settled.b].val}, so it reports no`;
  // Every report the real search produced, painted on the trees.
  const reported: PairPanel[] = blank.panels.map((panel, at) => ({
    ...panel,
    tones: panel.tree.map((node) => {
      const visit = visits.find((item) => (at === 0 ? item.a : item.b) === node.id);
      return visit ? (visit.same ? "hit" : visit === differs ? "miss" : "faded") : "idle";
    }),
    edges: panel.tree.map((node) => {
      const visit = visits.find((item) => (at === 0 ? item.a : item.b) === node.id);
      if (!visit || node.parent === null) return { tone: "idle" };
      return visit.same ? { tone: "report", badge: at === 0 ? "yes" : undefined } : { tone: "skipped", badge: at === 0 ? "no" : undefined };
    }),
    holes: panel.holes.map((hole) => (differs && (at === 0 ? differs.a : differs.b) === null && hole.parent === (at === 0 ? differs.parentA : differs.parentB) && hole.side === differs.side ? { ...hole, tone: "miss" } : hole)),
  }));
  const top = visits[0];
  return [
    {
      scene: "insight",
      caption: "Picture two walkers, one in each tree. They start at the two tops and always make the same turn. So they always stand on the same spot of their own tree.",
      state: { ...blank, panels: walkersOn(top, "edge") },
    },
    {
      scene: "insight",
      caption: `Every pair of spots sends one report up: yes for a match, no for a difference. This pair is ${verdict}.`,
      state: { ...blank, panels: walkersOn(settled, settled.same ? "hit" : "miss") },
    },
    {
      scene: "insight",
      caption: "A pair of equal values asks the two pairs below it, and reports yes only if both say yes. A single no climbs straight to the top.",
      state: { ...blank, panels: reported, out: { text: top.same ? "yes" : "no", tone: top.same ? "teal" : "coral" } },
    },
  ];
}

const readOrFallback = (input: string): Query => readQuery(input) ?? (readQuery(FALLBACK) as Query);

export const sameTreeStory: ProblemStory<TwoTreesState> = {
  slugs: ["lc-100"],
  pattern: "Tree DFS",
  trigger: "two binary trees, and you must say whether they are identical in shape and in every value",
  insight: "Two walkers make the same turns in both trees. Every pair of spots reports yes or no: both empty is yes, one empty is no, different values is no. One no climbs straight to the top.",
  metaphor: {
    name: "Two walkers, one report per pair",
    legend: "walkers = p and q · pair = one call · empty spot = null · report = the returned true or false · waiting = the call stack",
    terms: ["pair", "report", "walker", "spot"],
  },
  traps: [{ name: TRAP, rule: "Check for empty spots before reading any value: both null is a match, exactly one null is a difference. Only then compare p.val with q.val, or the program crashes on null." }],
  template: [
    "same(a, b):",
    "    if a and b are both empty: return true",
    "    if only one is empty: return false            // before any value is read",
    "    if a.val differs from b.val: return false",
    "    return same(a.left, b.left) and same(a.right, b.right)",
  ],
  complexity: {
    slow: "O(n), but two whole lists are written first",
    time: "O(n)",
    timeWhy: "each pair of spots is visited at most once, and the first no stops the search",
    space: "O(h)",
    spaceWhy: "only the pairs on the current way down are waiting for reports",
  },
  code: CODE,
  examples: [
    { label: "p = [1,2,3], q = [1,2,3]", input: "p=[1,2,3]; q=[1,2,3]", expected: "true", note: "Every pair matches" },
    { label: "p = [1,2], q = [1,null,2]", input: "p=[1,2]; q=[1,null,2]", expected: "false", note: "Tricky: same values, but one spot is empty" },
    { label: "p = [1,2,1], q = [1,1,2]", input: "p=[1,2,1]; q=[1,1,2]", expected: "false", note: "Same shape, different values" },
    { label: "p = [1,2,3], q = [1,2,4]", input: "p=[1,2,3]; q=[1,2,4]", expected: "false", note: "Only the last pair differs" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-101", title: "Symmetric Tree" },
    { slug: "lc-572", title: "Subtree of Another Tree" },
    { slug: "lc-226", title: "Invert Binary Tree" },
  ],
  answer: (input) => String(solve(readOrFallback(input))),
  frames: (input) => {
    const query = readOrFallback(input);
    const visits = realVisits(query);
    const holes = planHoles(visits);
    const solution = searchFrames(query);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(query, holes, visits, solve(query)),
      ...slowFrames(query, holes),
      ...insightFrames(query, holes, visits),
      ...solution,
      ...searchFrames(readOrFallback(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: two walkers on the same spot, and one report per pair climbing up. Say the idea in your head first, then reveal the card.",
        state: remembered.state,
      },
    ];
  },
  View: TwoTreesView,
};
