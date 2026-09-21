import type { CellTone } from "@/components/learn/viz/primitives";

import { TwoTreesView, blankPanel, pairCell, pairCellCount, type PairHole, type PairPanel, type PairSpot, type TwoTreesState } from "../agy-trees1-two-trees-view";
import { parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type SymFrame = StoryFrame<TwoTreesState>;

/** Fresh tree for the "your turn" run. Outer left has 3, outer right has an empty spot, so it reaches the trap. */
const PRACTICE = "[1,2,2,3,null,3,null]";
const FALLBACK = "[1,2,2,3,4,4,3]";

const TRAP = "The Same-Side Trap";

const CODE = [
  "boolean isSymmetric(TreeNode root) {",
  "    if (root == null) return true;",
  "    return isMirror(root.left, root.right);",
  "}",
  "",
  "boolean isMirror(TreeNode t1, TreeNode t2) {",
  "    if (t1 == null && t2 == null) return true;",
  "    if (t1 == null || t2 == null) return false;",
  "    if (t1.val != t2.val) return false;",
  "    return isMirror(t1.left, t2.right) && isMirror(t1.right, t2.left);",
  "}",
];

const STRIPS = 2;
const EMPTY_MARK = "–";

type Side = "left" | "right";
type Query = { root: TreeShapeNode[] };

function readQuery(input: string): Query {
  const match = input.match(/\[[^\]]*\]/);
  const nodes = match ? parseTree(match[0]) : [];
  if (nodes.length === 0) return { root: parseTree(FALLBACK) };
  return { root: nodes };
}

/** Preorder list from left-to-right. */
function writeDown(tree: TreeShapeNode[], start: number | null, reverse: boolean): string[] {
  if (start === null) return [EMPTY_MARK];
  const list: string[] = [];
  const stack: (number | null)[] = [start];
  while (stack.length > 0) {
    const id = stack.pop() as number | null;
    list.push(id === null ? EMPTY_MARK : String(tree[id].val));
    if (id !== null) {
      if (reverse) stack.push(tree[id].left, tree[id].right);
      else stack.push(tree[id].right, tree[id].left);
    }
  }
  return list;
}

function solve({ root }: Query): boolean {
  if (root.length === 0) return true;
  const left = root[0].left;
  const right = root[0].right;
  const leftList = writeDown(root, left, false);
  const rightList = writeDown(root, right, true);
  return leftList.join(",") === rightList.join(",");
}

type Visit = {
  a: number | null;
  b: number | null;
  parentA: number | null;
  parentB: number | null;
  sideA: Side | null;
  sideB: Side | null;
  same: boolean;
};

function realVisits({ root }: Query): Visit[] {
  const visits: Visit[] = [];
  if (root.length === 0) return visits;
  const visit = (
    a: number | null,
    b: number | null,
    parentA: number | null,
    parentB: number | null,
    sideA: Side | null,
    sideB: Side | null,
  ): boolean => {
    const entry: Visit = { a, b, parentA, parentB, sideA, sideB, same: false };
    visits.push(entry);
    if (a === null && b === null) entry.same = true;
    else if (a === null || b === null) entry.same = false;
    else if (root[a].val !== root[b].val) entry.same = false;
    else {
      const outer = visit(root[a].left, root[b].right, a, b, "left", "right");
      const inner = visit(root[a].right, root[b].left, a, b, "right", "left");
      entry.same = outer && inner;
    }
    return entry.same;
  };
  visit(root[0].left, root[0].right, 0, 0, "left", "right");
  return visits;
}

function planHoles(visits: Visit[]): PairHole[] {
  const holes: PairHole[] = [];
  const add = (parent: number | null, side: Side | null, oneEmpty: boolean) => {
    if (parent === null || side === null) return;
    if (holes.some((h) => h.parent === parent && h.side === side)) return;
    holes.push({ parent, side, tone: "idle", show: oneEmpty });
  };
  for (const v of visits) {
    const oneEmpty = (v.a === null) !== (v.b === null);
    if (v.a === null) add(v.parentA, v.sideA, oneEmpty);
    if (v.b === null) add(v.parentB, v.sideB, oneEmpty);
  }
  return holes;
}

function blankState(query: Query, holes: PairHole[]): TwoTreesState {
  return {
    panels: [blankPanel("", query.root, holes)],
    mirror: true,
    out: null,
    strips: Array.from({ length: STRIPS }, () => ({ label: "", items: [] })),
    counter: null,
    note: null,
  };
}

const spotName = (tree: TreeShapeNode[], id: number | null) => (id === null ? "an empty spot" : String(tree[id].val));

function pictureFrames(query: Query, holes: PairHole[], visits: Visit[], same: boolean): SymFrame[] {
  const blank = blankState(query, holes);
  const { root } = query;
  const differs = visits.find((v) => !v.same && (v.a === null || v.b === null || root[v.a].val !== root[v.b].val));

  const paint = (tone: CellTone, only?: Visit): PairPanel[] =>
    blank.panels.map((panel) => ({
      ...panel,
      tones: panel.tree.map((node) => (only ? (only.a === node.id || only.b === node.id ? tone : "idle") : tone)),
      holes: panel.holes.map((hole) =>
        only &&
        ((only.a === null && hole.parent === only.parentA && hole.side === only.sideA) ||
          (only.b === null && hole.parent === only.parentB && hole.side === only.sideB))
          ? { ...hole, tone }
          : hole,
      ),
    }));

  const frames: SymFrame[] = [
    { scene: "picture", caption: "This tree has a mirror line down its center. We want to know if the left half and right half mirror each other.", state: blank },
    {
      scene: "picture",
      caption: `Two halves mirror each other when every spot matches its mirror partner across the line. Here the top children are ${root[0].left !== null ? root[root[0].left].val : "empty"} and ${root[0].right !== null ? root[root[0].right].val : "empty"}.`,
      state: { ...blank, panels: paint("hit", visits[0]) },
    },
  ];

  if (differs) {
    const what =
      differs.a === null || differs.b === null
        ? `One side has ${spotName(root, differs.a)} where the mirror spot has ${spotName(root, differs.b)}.`
        : `This spot holds ${root[differs.a].val} on the left, but ${root[differs.b].val} on the right.`;
    frames.push({
      scene: "picture",
      caption: `One spot that does not mirror breaks symmetry. ${what}`,
      state: { ...blank, panels: paint("miss", differs), note: { text: "✕ mirror mismatch", tone: "coral" } },
    });
  } else {
    frames.push({
      scene: "picture",
      caption: "Every left turn on one side matches a right turn on the other side. Every value and every empty spot mirrors across the line.",
      state: { ...blank, panels: paint("hit") },
    });
  }

  frames.push({
    scene: "picture",
    caption: `The goal: return true if the tree is symmetric around its center, and false otherwise. Here the answer is ${same}.`,
    state: differs ? { ...blank, panels: paint("miss", differs) } : { ...blank, panels: paint("hit") },
  });

  return frames;
}

function slowFrames(query: Query, holes: PairHole[]): SymFrame[] {
  const blank = blankState(query, holes);
  const { root } = query;
  if (root.length === 0) return [];
  const listL = writeDown(root, root[0].left, false);
  const listR = writeDown(root, root[0].right, true);
  let split = 0;
  while (split < listL.length && split < listR.length && listL[split] === listR[split]) split++;
  const same = split === listL.length && split === listR.length;
  const strip = (label: string, list: string[], compared: boolean): TreeStrip => ({
    label,
    items: list.map((text, index) => ({ text, tone: (!compared ? "idle" : index < split ? "hit" : index === split ? "miss" : "faded") as CellTone })),
  });
  const written = listL.length + listR.length;
  const walked = (side: "left" | "right"): PairPanel[] =>
    blank.panels.map((panel) => ({
      ...panel,
      tones: panel.tree.map((node) => (node.id === 0 ? "idle" : (side === "left" ? node.id <= (root[0].left ?? 0) : true) ? "window" : "idle")),
    }));
  const say = (text: string) => (text === EMPTY_MARK ? "an empty spot" : text);

  return [
    {
      scene: "slow",
      caption: `The slow way: walk the left subtree and write down its spots into a list. That is ${listL.length} spots written down.`,
      state: { ...blank, panels: walked("left"), strips: [strip("left list", listL, false), blank.strips[1]], counter: { label: "spots written", value: listL.length } },
    },
    {
      scene: "slow",
      caption: `Then walk the right subtree in mirrored order, right branch first, and write its list. Now ${written} spots are written down.`,
      state: { ...blank, panels: walked("right"), strips: [strip("left list", listL, false), strip("right list", listR, false)], counter: { label: "spots written", value: written } },
    },
    {
      scene: "slow",
      caption: same
        ? `Now compare the two lists from the start. All ${listL.length} places match, so the tree is symmetric.`
        : `Now compare the two lists from the start. At spot ${split + 1} they differ: ${say(listL[split] ?? "nothing")} against ${say(listR[split] ?? "nothing")}.`,
      state: { ...blank, strips: [strip("left list", listL, true), strip("right list", listR, true)], counter: { label: "spots written", value: written } },
    },
    {
      scene: "slow",
      caption: `That takes O(n) time and O(n) extra space for two whole lists. We can compare opposite spots directly without writing any lists.`,
      state: {
        ...blank,
        panels: blank.panels.map((p) => ({ ...p, tones: p.tree.map(() => "faded" as CellTone) })),
        strips: [strip("left list", listL, true), strip("right list", listR, true)],
        counter: { label: "spots written", value: written },
      },
    },
  ];
}

type Status = "idle" | "waiting" | "yes" | "no" | "passed" | "unasked";

const STATUS_TONE: Record<Status, CellTone> = {
  idle: "idle",
  waiting: "window",
  yes: "done",
  no: "miss",
  passed: "miss",
  unasked: "faded",
};

function runSearch(
  query: Query,
  holes: PairHole[],
  practice: boolean,
  scene: SceneId,
): { frames: SymFrame[]; checked: number; same: boolean } {
  const blank = blankState(query, holes);
  const { root } = query;
  const frames: SymFrame[] = [];
  const holeList = holes.map((h) => ({ ...h }));
  const status: Status[] = root.map(() => "idle");
  const edges: TreeEdgeMark[] = root.map(() => ({ tone: "idle" }));
  const path: string[] = [];
  let walkerL: PairSpot | null = null;
  let walkerR: PairSpot | null = null;
  let pairStrip: TreeStrip = { label: "", items: [] };
  let out: TwoTreesState["out"] = null;
  let note: TwoTreesState["note"] = null;
  let checked = 0;
  const asked = { turn: false, empty: false, trap: false, value: false };

  const holeAt = (parent: number | null, side: Side | null) => holeList.findIndex((h) => h.parent === parent && h.side === side);
  const spotOf = (id: number | null, parent: number | null, side: Side | null): PairSpot | null => {
    if (id !== null) return { kind: "node", id };
    const index = holeAt(parent, side);
    return index >= 0 ? { kind: "hole", index } : null;
  };
  const sameSpot = (one: PairSpot | null, other: PairSpot) =>
    one !== null && one.kind === other.kind && (one.kind === "node" ? one.id === (other as { id: number }).id : one.index === (other as { index: number }).index);

  const panelsNow = (): PairPanel[] => [
    {
      ...blank.panels[0],
      tones: root.map((node) => {
        const isWalker = (walkerL !== null && sameSpot(walkerL, { kind: "node", id: node.id })) || (walkerR !== null && sameSpot(walkerR, { kind: "node", id: node.id }));
        return isWalker && status[node.id] === "waiting" ? "edge" : STATUS_TONE[status[node.id]];
      }),
      edges: edges.map((e) => ({ ...e })),
      holes: holeList.map((h) => ({ ...h })),
      walkers: [walkerL, walkerR].filter((w): w is PairSpot => w !== null),
    },
  ];

  const snap = (): TwoTreesState => ({
    ...blank,
    panels: panelsNow(),
    out,
    note,
    strips: [{ label: "waiting", items: path.map((text, idx) => ({ text, tone: (idx === path.length - 1 ? "edge" : "window") as CellTone })) }, pairStrip],
  });

  const push = (caption: string, codeLine: number, quiz?: StoryQuiz) => {
    const frame: SymFrame = { scene, caption, state: snap() };
    if (!practice) frame.codeLine = codeLine;
    if (quiz) frame.quiz = quiz;
    frames.push(frame);
  };

  const showPair = (a: number | null, b: number | null) => {
    pairStrip = {
      label: "mirror pair",
      items: [
        { text: `left: ${a === null ? "empty" : root[a].val}`, tone: "idle" },
        { text: `right: ${b === null ? "empty" : root[b].val}`, tone: "idle" },
      ],
    };
  };

  const sendUp = (a: number, b: number, yes: boolean) => {
    path.pop();
    status[a] = yes ? "yes" : "no";
    status[b] = yes ? "yes" : "no";
    if (root[a].parent === 0) out = { text: yes ? "yes" : "no", tone: yes ? "teal" : "coral" };
    else {
      edges[a] = yes ? { tone: "report", badge: "yes" } : { tone: "skipped", badge: "no" };
      edges[b] = yes ? { tone: "report" } : { tone: "skipped" };
    }
  };

  let checkShown = false;

  const turnQuiz = (targetSpot: PairSpot, parentB: number, sideA: Side): StoryQuiz => {
    const panels = panelsNow();
    const feedback: Record<number, string> = {};
    const wrongSpot = spotOf(root[parentB][sideA], parentB, sideA);
    if (wrongSpot) {
      feedback[pairCell(panels, 0, wrongSpot)] = `That is the ${sideA} turn. Mirror turns face opposite ways: left mirrors right.`;
    }
    return {
      kind: "cell",
      cells: pairCellCount(panels),
      question: `The left walker has stepped ${sideA}. Where must the right walker step to find its mirror spot? Click that spot.`,
      answer: pairCell(panels, 0, targetSpot),
      feedback,
      otherwise: "The two walkers turn in opposite directions: left mirrors right, and right mirrors left.",
      why: "Mirror symmetry pairs outer with outer and inner with inner. A left turn on one side corresponds to a right turn on the other.",
    };
  };

  const emptyQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "Both walkers find an empty spot on their mirror turns. What does this pair report up?",
    options: ["Yes: empty on both sides is a mirror match", "No: there are no values to compare", "Nothing. Empty spots are skipped"],
    answer: 0,
    why: "Both branches end at the same mirror position. Empty on both sides is a valid mirror match.",
  });

  const valueQuiz = (a: number, b: number): StoryQuiz => ({
    kind: "choice",
    question: `The walkers stand on ${root[a].val} and ${root[b].val}. Neither spot is empty. What does this pair report up?`,
    options: ["No: different values at mirror spots cannot match", "Yes: both spots exist in the tree", "Nothing yet. It first asks the children"],
    answer: 0,
    why: "Different values at mirror spots break the symmetry at once. Nothing below can repair that.",
  });

  const trapQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "One walker lands on a node and the other on an empty spot. What would go wrong if we compared same-side children?",
    options: ["It would compare left with left instead of opposite branches and miss the mismatch", "It would crash by reading a null value", "It would visit the root node twice"],
    answer: 0,
    why: "Same-side checks compare left with left. That misses mirror asymmetry and gives the wrong answer.",
  });

  const label = (a: number | null, b: number | null) => `${a === null ? EMPTY_MARK : root[a].val}|${b === null ? EMPTY_MARK : root[b].val}`;

  const visit = (a: number, b: number, lead: string, callLine: number): boolean => {
    checked++;
    path.push(label(a, b));
    status[a] = "waiting";
    status[b] = "waiting";
    walkerL = { kind: "node", id: a };
    walkerR = { kind: "node", id: b };
    showPair(a, b);
    if (root[a].parent !== null) edges[a] = { tone: "path" };
    if (root[b].parent !== null) edges[b] = { tone: "path" };

    if (root[a].val !== root[b].val) {
      const ask = practice || !asked.value;
      asked.value = true;
      push(lead, callLine, ask ? valueQuiz(a, b) : undefined);
      sendUp(a, b, false);
      push(`${root[a].val} and ${root[b].val} are different values, so this mirror pair reports no up at once.`, 8);
      return false;
    }

    if (!checkShown) {
      checkShown = true;
      push(lead, callLine);
      push(`Neither spot is empty, and the values are the same: ${root[a].val} and ${root[b].val}. Now this pair checks outer and inner turns.`, 8);
    } else {
      push(`${lead} Neither spot is empty, and the values match. Now this pair checks outer and inner turns.`, 8);
    }

    const turns: [Side, Side, string][] = [
      ["left", "right", "outer"],
      ["right", "left", "inner"],
    ];

    for (const [sideA, sideB, desc] of turns) {
      const nextA = root[a][sideA];
      const nextB = root[b][sideB];
      walkerL = { kind: "node", id: a };
      walkerR = { kind: "node", id: b };
      showPair(a, b);
      let sameTurn: boolean;

      if (nextA === null && nextB === null) {
        checked++;
        const atA = holeAt(a, sideA);
        const atB = holeAt(b, sideB);
        if (atA >= 0 && atB >= 0) {
          holeList[atA] = { ...holeList[atA], show: true, tone: "edge" };
          holeList[atB] = { ...holeList[atB], show: true, tone: "edge" };
          walkerL = { kind: "hole", index: atA };
          walkerR = { kind: "hole", index: atB };
          showPair(null, null);
          const ask = !asked.empty;
          asked.empty = true;
          push(`Both walkers take their ${desc} turn. Both find an empty spot.`, 6, ask ? emptyQuiz() : undefined);
          holeList[atA] = { ...holeList[atA], tone: "hit" };
          holeList[atB] = { ...holeList[atB], tone: "hit" };
          push("Two empty spots match: both sides end here. So this pair reports yes.", 6);
        }
        sameTurn = true;
      } else if (nextA === null || nextB === null) {
        checked++;
        const target = spotOf(nextB, b, sideB) as PairSpot;
        if (nextA !== null) {
          walkerL = { kind: "node", id: nextA };
        } else {
          const atA = holeAt(a, sideA);
          if (atA >= 0) {
            holeList[atA] = { ...holeList[atA], show: true, tone: "miss" };
            walkerL = { kind: "hole", index: atA };
          }
        }
        if (practice || !asked.turn) {
          asked.turn = true;
          push(`The left walker takes its ${desc} turn, stepping ${sideA}${nextA !== null ? ` onto ${root[nextA].val}` : " into an empty spot"}.`, 9, turnQuiz(target, b, sideA));
        }
        if (nextB !== null) {
          walkerR = { kind: "node", id: nextB };
        } else {
          const atB = holeAt(b, sideB);
          if (atB >= 0) {
            holeList[atB] = { ...holeList[atB], show: true, tone: "miss" };
            walkerR = { kind: "hole", index: atB };
          }
        }
        showPair(nextA, nextB);
        const ask = practice || !asked.trap;
        asked.trap = true;
        push(`On the ${desc} turn, one walker finds ${spotName(root, nextA)} and the other finds ${spotName(root, nextB)}.`, 7, ask ? trapQuiz() : undefined);
        note = { text: "✕ mirror mismatch", tone: "coral" };
        push(`${TRAP}: comparing same-side children misses mirror asymmetry. One spot is empty while the other holds a node, so this pair reports no.`, 7);
        note = null;
        sameTurn = false;
      } else {
        const stepLead = `Both walkers take their ${desc} turn onto ${root[nextA].val} and ${root[nextB].val}.`;
        if (practice || !asked.turn) {
          asked.turn = true;
          walkerL = { kind: "node", id: nextA };
          const target = spotOf(nextB, b, sideB) as PairSpot;
          push(`The left walker steps ${sideA} onto ${root[nextA].val}.`, 9, turnQuiz(target, b, sideA));
        }
        sameTurn = visit(nextA, nextB, stepLead, 9);
      }

      if (!sameTurn) {
        walkerL = { kind: "node", id: a };
        walkerR = { kind: "node", id: b };
        showPair(a, b);
        sendUp(a, b, false);
        push(`One mirror pair that differs is enough. The pair ${root[a].val} and ${root[b].val} reports no up at once.`, 9);
        return false;
      }
    }

    walkerL = { kind: "node", id: a };
    walkerR = { kind: "node", id: b };
    showPair(a, b);
    for (let i = 0; i < holeList.length; i++) {
      if (holeList[i].tone === "hit") holeList[i] = { ...holeList[i], show: false, tone: "idle" };
    }
    sendUp(a, b, true);
    push(`Back at pair ${root[a].val} and ${root[b].val}. Both outer and inner turns reported yes. So this pair reports yes up.`, 9);
    return true;
  };

  if (root.length <= 1) {
    frames.push({ scene, caption: "A single node is symmetric with itself.", state: blank });
    return { frames, checked: 1, same: true };
  }

  const leftChild = root[0].left;
  const rightChild = root[0].right;

  let same = false;
  if (leftChild === null && rightChild === null) {
    same = true;
  } else if (leftChild === null || rightChild === null) {
    checked++;
    note = { text: "✕ one side missing", tone: "coral" };
    push(`The root has only one child: ${leftChild === null ? "left" : "right"} is missing. So the tree is not symmetric.`, 2);
    note = null;
    same = false;
  } else {
    same = visit(
      leftChild,
      rightChild,
      practice
        ? `Your turn on a fresh tree. Two walkers stand on the children of root: ${root[leftChild].val} on the left and ${root[rightChild].val} on the right.`
        : `Two walkers stand on the two children of root: ${root[leftChild].val} on the left and ${root[rightChild].val} on the right.`,
      2,
    );
  }

  walkerL = null;
  walkerR = null;
  pairStrip = { label: "", items: [] };
  push(
    same
      ? `${practice ? "Done: yes" : "Yes"} comes out of the top. Every mirror pair matched, in value and shape. The answer is true.`
      : `${practice ? "Done: no" : "No"} comes out of the top. One mirror pair that differs is enough. The answer is false.`,
    2,
  );

  return { frames, checked, same };
}

function insightFrames(query: Query, holes: PairHole[]): SymFrame[] {
  const blank = blankState(query, holes);
  const { root } = query;
  if (root.length === 0) return [];
  return [
    {
      scene: "insight",
      caption: "Imagine two walkers standing on opposite sides of a mirror line. To stay in mirror sync, every move must face the opposite way.",
      state: blank,
    },
    {
      scene: "insight",
      caption: "When the left walker steps outer (to its left), the right walker must step outer (to its right). Left mirrors right.",
      state: blank,
    },
    {
      scene: "insight",
      caption: "When the left walker steps inner (to its right), the right walker must step inner (to its left). Right mirrors left.",
      state: blank,
    },
  ];
}

export const symmetricTreeStory: ProblemStory<TwoTreesState> = {
  slugs: ["lc-101"],
  pattern: "Tree DFS",
  trigger: "whether a binary tree is symmetric around its center, or a mirror of itself",
  insight: "Two walkers start on opposite sides of the mirror line. At every step, outer pairs with outer and inner pairs with inner.",
  metaphor: {
    name: "The mirror walk",
    legend: "mirror line = the tree center · walkers = left and right checks · opposite turns = outer with outer, inner with inner",
    terms: ["mirror", "walker", "turn", "spot", "empty", "report", "pair"],
  },
  traps: [{ name: TRAP, rule: "The left walker's outer turn matches the right walker's outer turn: left with right, and right with left." }],
  template: [
    "boolean isSymmetric(TreeNode root) {",
    "    if (root == null) return true;",
    "    return isMirror(root.left, root.right);",
    "}",
    "boolean isMirror(t1, t2):",
    "    if both null: return true;",
    "    if one null or values differ: return false;",
    "    return isMirror(t1.left, t2.right) && isMirror(t1.right, t2.left);",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(n)",
    timeWhy: "every node is visited at most once, and the search stops at the first mismatch",
    space: "O(h)",
    spaceWhy: "the call stack only holds the path from root to the deepest leaf",
  },
  code: CODE,
  examples: [
    { label: "[1,2,2,3,4,4,3]", input: "[1,2,2,3,4,4,3]", expected: "true" },
    { label: "[1,2,2,null,3,null,3]", input: "[1,2,2,null,3,null,3]", expected: "false", note: "Reaches the trap" },
    { label: "[1,2,3]", input: "[1,2,3]", expected: "false", note: "Values differ" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-100", title: "Same Tree" },
    { slug: "lc-226", title: "Invert Binary Tree" },
    { slug: "lc-104", title: "Maximum Depth of Binary Tree" },
  ],
  answer: (input) => (solve(readQuery(input)) ? "true" : "false"),
  frames: (input) => {
    const query = readQuery(input);
    const visits = realVisits(query);
    const holes = planHoles(visits);
    const same = solve(query);
    const solution = runSearch(query, holes, false, "solution");
    const practiceSearch = runSearch(readQuery(PRACTICE), planHoles(realVisits(readQuery(PRACTICE))), true, "card");

    const timeFrame: SymFrame = {
      scene: "solution",
      caption: `Time: O(n). The walkers visit each mirror pair at most once, and stop at the first mismatch. Here they checked ${solution.checked} ${solution.checked === 1 ? "pair" : "pairs"}.`,
      state: solution.frames[solution.frames.length - 1].state,
    };
    const spaceFrame: SymFrame = {
      scene: "solution",
      caption: "Space: O(h). Only the active path down the tree is kept in memory, which is at most the height h of the tree.",
      state: solution.frames[solution.frames.length - 1].state,
    };

    return [
      ...pictureFrames(query, holes, visits, same),
      ...slowFrames(query, holes),
      ...insightFrames(query, holes),
      ...solution.frames,
      timeFrame,
      spaceFrame,
      ...practiceSearch.frames,
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: practiceSearch.frames[practiceSearch.frames.length - 1].state,
      },
    ];
  },
  View: TwoTreesView,
};
