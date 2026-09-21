import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyTrees3BuildView, blankBuildState, type BuildRow, type BuildState } from "../agy-trees3-build-view";
import { listWords, type TreeShapeNode } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type CutFrame = StoryFrame<BuildState>;

/** Fresh lists for the "your turn" run. The first cut has boxes on both sides, so it reaches the trap. */
const PRACTICE = "preorder=[1,2,4,5,3]; inorder=[4,2,5,1,3]";
const FALLBACK = "preorder=[3,9,20,15,7]; inorder=[9,3,15,20,7]";

const TRAP = "The Wrong Cut Trap";

const CODE = [
  "int preIndex = 0;",
  "Map<Integer, Integer> inMap = new HashMap<>();",
  "",
  "TreeNode buildTree(int[] preorder, int[] inorder) {",
  "    for (int i = 0; i < inorder.length; i++) inMap.put(inorder[i], i);",
  "    return build(preorder, 0, inorder.length - 1);",
  "}",
  "",
  "TreeNode build(int[] preorder, int left, int right) {",
  "    if (left > right) return null;",
  "    int rootVal = preorder[preIndex++];",
  "    TreeNode root = new TreeNode(rootVal);",
  "    int mid = inMap.get(rootVal);",
  "    root.left = build(preorder, left, mid - 1);",
  "    root.right = build(preorder, mid + 1, right);",
  "    return root;",
  "}",
];

/** Three rows, always: the roll call, the row that gets cut, and the list of slots. */
const ROWS = 3;

type Lists = { preorder: number[]; inorder: number[] };

function readLists(input: string): Lists {
  const grab = (name: string) => {
    const match = input.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`));
    return match
      ? match[1]
          .split(",")
          .map((token) => token.trim())
          .filter((token) => token.length > 0)
          .map(Number)
      : [];
  };
  const preorder = grab("preorder");
  const inorder = grab("inorder");
  const same = preorder.length > 0 && preorder.length === inorder.length && new Set(preorder).size === preorder.length && [...preorder].sort((a, b) => a - b).join() === [...inorder].sort((a, b) => a - b).join();
  return same ? { preorder, inorder } : readLists(FALLBACK);
}

type Loose = { val: number; left: Loose | null; right: Loose | null };

/** Independent builder: no recursion and no cutting. It walks preorder once with a pile of open nodes. */
function buildLoose({ preorder, inorder }: Lists): Loose {
  const root: Loose = { val: preorder[0], left: null, right: null };
  const pile: Loose[] = [root];
  let inAt = 0;
  for (let at = 1; at < preorder.length; at++) {
    const fresh: Loose = { val: preorder[at], left: null, right: null };
    let top = pile[pile.length - 1];
    if (top.val !== inorder[inAt]) {
      top.left = fresh;
    } else {
      while (pile.length > 0 && pile[pile.length - 1].val === inorder[inAt]) {
        top = pile.pop() as Loose;
        inAt++;
      }
      top.right = fresh;
    }
    pile.push(fresh);
  }
  return root;
}

/** Numbers the nodes level by level, the way the shared tree picture wants them. */
function shapeOf(root: Loose): TreeShapeNode[] {
  const tree: TreeShapeNode[] = [];
  const line: { node: Loose; parent: number | null; side: "left" | "right"; depth: number }[] = [{ node: root, parent: null, side: "left", depth: 0 }];
  for (let at = 0; at < line.length; at++) {
    const { node, parent, side, depth } = line[at];
    const id = tree.length;
    tree.push({ id, val: node.val, left: null, right: null, parent, depth });
    if (parent !== null) tree[parent][side] = id;
    if (node.left) line.push({ node: node.left, parent: id, side: "left", depth: depth + 1 });
    if (node.right) line.push({ node: node.right, parent: id, side: "right", depth: depth + 1 });
  }
  return tree;
}

function levelText(tree: TreeShapeNode[]): string {
  const out: string[] = [];
  const line: (number | null)[] = [0];
  for (let at = 0; at < line.length; at++) {
    const id = line[at];
    out.push(id === null ? "null" : String(tree[id].val));
    if (id !== null) line.push(tree[id].left, tree[id].right);
  }
  while (out[out.length - 1] === "null") out.pop();
  return `[${out.join(",")}]`;
}

const row = (label: string, values: number[], tone: (index: number) => CellTone, under: (index: number) => string | undefined = () => undefined): BuildRow => ({
  label,
  cells: values.map((value, index) => ({ text: String(value), tone: tone(index), under: under(index) })),
});

const slotRow = (inorder: number[], tone: (index: number) => CellTone = () => "idle"): BuildRow => ({ label: "slot of", cells: inorder.map((value, index) => ({ text: `${value}→${index}`, tone: tone(index) })) });

function pictureFrames(lists: Lists, tree: TreeShapeNode[]): CutFrame[] {
  const { preorder, inorder } = lists;
  const blank = blankBuildState(tree, ROWS);
  const hidden = { ...blank, shown: tree.map(() => false) };
  const idOfVal = new Map(tree.map((node) => [node.val, node.id]));
  const under = (id: number | null): number[] => (id === null ? [] : [id, ...under(tree[id].left), ...under(tree[id].right)]);
  const leftIds = under(tree[0].left);
  const sideTone = (value: number): CellTone => (value === tree[0].val ? "edge" : leftIds.includes(idOfVal.get(value) ?? -1) ? "hit" : "window");
  const treeTones = tree.map((node) => sideTone(node.val));
  const plainPre = row("preorder", preorder, () => "idle");
  const plainIn = row("inorder", inorder, () => "idle");
  return [
    { scene: "picture", caption: "Someone walked through a tree and wrote down two lists of its numbers. The tree is gone, and only the lists are left. Every number appears once.", state: { ...hidden, rows: [plainPre, plainIn, blank.rows[2]] } },
    {
      scene: "picture",
      caption: `This is the tree they came from. The first list, preorder, names a node before anything under it: first ${tree[0].val}, then its whole left side, then its whole right side.`,
      state: { ...blank, tones: treeTones, rows: [row("preorder", preorder, (index) => sideTone(preorder[index])), plainIn, blank.rows[2]] },
    },
    {
      scene: "picture",
      caption: `The second list, inorder, names a node between its two sides: the whole left side, then ${tree[0].val}, then the whole right side.`,
      state: { ...blank, tones: treeTones, rows: [plainPre, row("inorder", inorder, (index) => sideTone(inorder[index])), blank.rows[2]] },
    },
    { scene: "picture", caption: "The goal: build the tree again from the two lists alone. Only one tree fits both lists.", state: { ...blank, tones: tree.map(() => "done"), edges: tree.map(() => "teal"), rows: [plainPre, plainIn, blank.rows[2]] } },
  ];
}

/** The obvious way, really run: the same cutting, but every root is searched for by reading its piece of inorder box by box. */
function slowFrames(lists: Lists, tree: TreeShapeNode[]): CutFrame[] {
  const { preorder, inorder } = lists;
  const blank = blankBuildState(tree, ROWS);
  const idOfVal = new Map(tree.map((node) => [node.val, node.id]));
  let reads = 0;
  let preAt = 0;
  const searches: { value: number; from: number; found: number; reads: number; built: number }[] = [];
  const build = (left: number, right: number) => {
    if (left > right) return;
    const value = preorder[preAt++];
    let at = left;
    reads++;
    while (inorder[at] !== value) {
      at++;
      reads++;
    }
    searches.push({ value, from: left, found: at, reads, built: preAt });
    build(left, at - 1);
    build(at + 1, right);
  };
  build(0, inorder.length - 1);

  const longest = searches.slice(1).sort((a, b) => b.found - b.from - (a.found - a.from) || a.built - b.built)[0];
  const shownSearches = longest ? [searches[0], longest] : [searches[0]];
  const frames: CutFrame[] = shownSearches.map((search, index) => ({
    scene: "slow",
    caption:
      index === 0
        ? `The slow way: the first name in preorder, ${search.value}, is the top of the tree. To find ${search.value} in inorder, read the boxes one by one from the left.`
        : `Every later name needs its own search. To find ${search.value}, the boxes of its part of inorder are read again, one by one.`,
    state: {
      ...blank,
      shown: tree.map((node) => preorder.slice(0, search.built).includes(node.val)),
      tones: tree.map((node) => (node.id === idOfVal.get(search.value) ? "edge" : "hit")),
      rows: [row("preorder", preorder, (at) => (preorder[at] === search.value ? "edge" : at < search.built ? "faded" : "idle")), row("inorder", inorder, (at) => (at === search.found ? "edge" : at >= search.from && at < search.found ? "miss" : "idle")), blank.rows[2]],
      counter: { label: "boxes read", value: search.reads },
    },
  }));
  frames.push({
    scene: "slow",
    caption: `That was ${reads} box reads for ${tree.length} nodes. On a tree that leans to one side, each search reads nearly its whole piece: O(n²) time.`,
    state: { ...blank, tones: tree.map(() => "faded"), rows: [row("preorder", preorder, () => "faded"), row("inorder", inorder, () => "faded"), blank.rows[2]], counter: { label: "boxes read", value: reads } },
  });
  return frames;
}

function insightFrames(lists: Lists, tree: TreeShapeNode[]): CutFrame[] {
  const { preorder, inorder } = lists;
  const blank = blankBuildState(tree, ROWS);
  const top = preorder[0];
  const cut = inorder.indexOf(top);
  const onlyTop = tree.map((node) => node.id === 0);
  const cutTone = (index: number): CellTone => (index === cut ? "edge" : index < cut ? "hit" : "window");
  const leftPiece = inorder.slice(0, cut);
  const rightPiece = inorder.slice(cut + 1);
  const sideWords = (side: string, piece: number[]) => (piece.length === 0 ? `The ${side} piece is empty, so ${top} has no ${side} side.` : `The ${side} piece, ${listWords(piece)}, is the ${side} side of ${top}.`);
  return [
    {
      scene: "insight",
      caption: `Think of preorder as a roll call. The first name called is always the top of the tree: ${top}.`,
      state: { ...blank, shown: onlyTop, tones: tree.map(() => "edge"), rows: [row("preorder", preorder, (index) => (index === 0 ? "edge" : "idle"), (index) => (index === 0 ? "called" : undefined)), row("inorder", inorder, () => "idle"), blank.rows[2]] },
    },
    {
      scene: "insight",
      caption: `The box of ${top} cuts inorder in two. ${sideWords("left", leftPiece)} ${sideWords("right", rightPiece)}`,
      state: { ...blank, shown: onlyTop, tones: tree.map(() => "edge"), rows: [row("preorder", preorder, (index) => (index === 0 ? "faded" : "idle")), row("inorder", inorder, cutTone, (index) => (index === cut ? "cut" : undefined)), blank.rows[2]] },
    },
    {
      scene: "insight",
      caption: "Each piece is a smaller tree, built the same way with the next names from the roll call. A list of slots, made once, says where any number sits in inorder.",
      state: { ...blank, shown: onlyTop, tones: tree.map(() => "hit"), rows: [row("preorder", preorder, (index) => (index === 0 ? "faded" : index === 1 ? "edge" : "idle"), (index) => (index === 1 ? "next" : undefined)), row("inorder", inorder, cutTone), slotRow(inorder, () => "hit")] },
    },
  ];
}

/**
 * What the trap really does: the left piece keeps the cut box. Run it until a node lands in the wrong place.
 * Returns that node, where it landed, and the small wrong tree to draw.
 */
function wrongCut(lists: Lists, tree: TreeShapeNode[]): { value: number; under: number; side: "left" | "right"; wrongTree: TreeShapeNode[] } | null {
  const { preorder, inorder } = lists;
  const slot = new Map(inorder.map((value, index) => [value, index]));
  const trueParent = new Map(tree.map((node) => [node.val, node.parent === null ? null : { val: tree[node.parent].val, side: tree[node.parent].left === node.id ? "left" : "right" }]));
  const wrongTree: TreeShapeNode[] = [];
  let preAt = 0;
  let found: { value: number; under: number; side: "left" | "right" } | null = null;
  const build = (left: number, right: number, parent: number | null, side: "left" | "right", depth: number): void => {
    if (found || left > right || preAt >= preorder.length || depth > preorder.length) return;
    const value = preorder[preAt++];
    const id = wrongTree.length;
    wrongTree.push({ id, val: value, left: null, right: null, parent, depth });
    if (parent !== null) wrongTree[parent][side] = id;
    const real = trueParent.get(value);
    if (parent !== null && (!real || real.val !== wrongTree[parent].val || real.side !== side)) {
      found = { value, under: wrongTree[parent].val, side };
      return;
    }
    const mid = slot.get(value) ?? left;
    build(left, mid, id, "left", depth + 1);
    build(mid + 1, right, id, "right", depth + 1);
  };
  build(0, inorder.length - 1, null, "left", 0);
  const result = found as { value: number; under: number; side: "left" | "right" } | null;
  return result ? { ...result, wrongTree } : null;
}

/**
 * The real recursion, one frame per change. A piece with one box is told in one frame.
 * `practice` reuses it on fresh lists, and the reader decides where every piece ends and where every name hangs.
 */
function cutFrames(lists: Lists, tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): CutFrame[] {
  const { preorder, inorder } = lists;
  const blank = blankBuildState(tree, ROWS);
  const idOfVal = new Map(tree.map((node) => [node.val, node.id]));
  const idOf = (value: number) => idOfVal.get(value) ?? 0;
  const slot = new Map(inorder.map((value, index) => [value, index]));
  const frames: CutFrame[] = [];

  const shown = tree.map(() => false);
  const tones: CellTone[] = tree.map(() => "idle");
  let preIndex = 0;
  let nextMark = true;
  let piece: [number, number] | null = [0, inorder.length - 1];
  let cutAt: number | null = null;
  let slotFocus: number | null = null;
  const placed: boolean[] = inorder.map(() => false);
  let built = 0;
  let trapShown = false;
  let singleShown = false;
  const asked = { hang: false, end: false };

  const rows = (): BuildRow[] => [
    row(
      "preorder",
      preorder,
      (index) => (index < preIndex ? "faded" : index === preIndex && nextMark ? "edge" : "idle"),
      (index) => (index === preIndex && nextMark ? "next" : undefined),
    ),
    row(
      "inorder",
      inorder,
      (index) => (index === cutAt ? "edge" : placed[index] ? "faded" : piece && index >= piece[0] && index <= piece[1] ? "window" : "idle"),
      (index) => (index === cutAt ? "cut" : undefined),
    ),
    slotRow(inorder, (index) => (index === slotFocus ? "edge" : "idle")),
  ];
  const snap = (pickOn: BuildState["pickOn"] = "tree"): BuildState => ({ ...blank, shown: [...shown], tones: [...tones], edges: tree.map((node) => (shown[node.id] ? "teal" : "idle")), rows: rows(), pickOn });
  const push = (caption: string, codeLine: number, extra: { quiz?: StoryQuiz; state?: BuildState } = {}) => {
    const frame: CutFrame = { scene, caption, state: extra.state ?? snap() };
    if (!practice) frame.codeLine = codeLine;
    if (extra.quiz) frame.quiz = extra.quiz;
    frames.push(frame);
  };
  const pieceWords = (left: number, right: number) => (left === right ? `${inorder[left]} alone` : listWords(inorder.slice(left, right + 1)));

  const hangQuiz = (value: number, parent: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    const above: number[] = [];
    for (let at = tree[parent].parent; at !== null; at = tree[at].parent) above.push(at);
    for (const node of tree) {
      if (!shown[node.id] || node.id === parent) continue;
      feedback[node.id] = above.includes(node.id) ? `The lit piece does lie inside a piece of ${node.val}. But a node lower down has cut that piece again.` : `The lit piece was not cut off by ${node.val}. Look at which boxes lie right beside it.`;
    }
    return {
      kind: "cell",
      cells: tree.length,
      question: `The next name in the roll call is ${value}. Under which node will it hang? Click that node.`,
      answer: parent,
      feedback,
      otherwise: "That node is not in the tree yet. Pick one that is already drawn.",
      why: `The lit piece of inorder was cut off by ${tree[parent].val}, so its top hangs under ${tree[parent].val}.`,
    };
  };
  const endQuiz = (value: number, left: number, mid: number): StoryQuiz => {
    const feedback: Record<number, string> = { [mid]: `That is the box of ${value} itself. ${value} is in the tree already, so its box belongs to no piece.` };
    for (let index = 0; index < inorder.length; index++) {
      if (index === mid - 1 || index === mid) continue;
      feedback[index] = index > mid ? `${inorder[index]} lies right of the cut. It belongs to the right side of ${value}.` : index < left ? `${inorder[index]} is outside the piece that is being cut.` : `The left piece does reach ${inorder[index]}, but it goes on further than that.`;
    }
    return {
      kind: "cell",
      cells: inorder.length,
      question: `The row is cut at ${value}. The left piece starts at ${inorder[left]}. Which box of inorder is the last box of the left piece? Click it.`,
      answer: mid - 1,
      feedback,
      otherwise: "Look at the cut, and stop just before it.",
      why: `The left piece ends one box before the cut. The box of ${value} itself is in neither piece.`,
    };
  };

  const build = (left: number, right: number, parent: number | null, side: "left" | "right"): void => {
    if (left > right) return;
    const value = preorder[preIndex];
    const id = idOf(value);
    const mid = slot.get(value) ?? left;
    const where = parent === null ? "" : `on the ${side} of ${tree[parent].val}`;
    piece = [left, right];
    cutAt = null;
    slotFocus = null;
    nextMark = true;

    const place = () => {
      preIndex++;
      nextMark = false;
      shown[id] = true;
      tones[id] = "edge";
      built++;
    };

    if (left === right) {
      const askHang = parent !== null && built >= 2 && (practice || !asked.hang);
      if (askHang) {
        asked.hang = true;
        nextMark = false;
        push(`The next piece is lit in inorder: ${pieceWords(left, right)}.`, 10, { quiz: hangQuiz(value, parent ?? 0) });
      }
      place();
      placed[mid] = true;
      piece = null;
      push(
        singleShown
          ? `${value} is called next, and its piece holds only ${value}. It hangs ${where}, with nothing under it.`
          : `The next name called is ${value}, and the ${side} piece holds only ${value}. So ${value} hangs ${where}. Both pieces beside it are empty, so nothing hangs under it.`,
        11,
      );
      singleShown = true;
      tones[id] = "hit";
      nextMark = true;
      return;
    }

    if (parent === null) {
      push(practice ? `Your turn, on new lists. The piece is the whole inorder row, and the first name in the roll call is ${value}.` : `The first piece is the whole inorder row. The next name in the roll call is ${value}.`, 10);
    } else {
      const askHang = built >= 2 && (practice || !asked.hang);
      if (askHang) asked.hang = true;
      nextMark = !askHang;
      push(askHang ? `The next piece is lit in inorder: ${pieceWords(left, right)}.` : `The ${side} piece of ${tree[parent].val} is next: ${pieceWords(left, right)}. The next name in the roll call is ${value}.`, 10, askHang ? { quiz: hangQuiz(value, parent) } : {});
    }
    place();
    push(`${value} is called, so it is the top of this piece. It ${parent === null ? "becomes the top of the tree" : `hangs ${where}`}.`, 11);
    tones[id] = "hit";

    slotFocus = mid;
    cutAt = mid;
    const askEnd = mid > left && (practice || !asked.end);
    if (askEnd) asked.end = true;
    push(`The list of slots says ${value} sits in slot ${mid} of inorder. The row is cut at that box.`, 12, askEnd ? { quiz: endQuiz(value, left, mid), state: snap(1) } : {});

    placed[mid] = true;
    const leftWords = mid > left ? `The left piece is ${pieceWords(left, mid - 1)}` : "The left piece is empty";
    const rightWords = mid < right ? `the right piece is ${pieceWords(mid + 1, right)}` : "the right piece is empty";
    slotFocus = null;
    if (!trapShown && mid > left) {
      trapShown = true;
      const wrong = wrongCut(lists, tree);
      const fits = wrong !== null && Math.max(...wrong.wrongTree.map((node) => node.depth)) <= Math.max(...tree.map((node) => node.depth));
      const base = snap();
      push(
        `${TRAP}: the box of ${value} must stay out of both pieces. If the left piece kept it, ${wrong ? `${wrong.value} would end up on the ${wrong.side} of ${wrong.under}, where it does not belong` : "the same piece would come back again and again, and never run empty"}.`,
        13,
        {
          state: {
            ...base,
            ...(wrong && fits ? { tree: wrong.wrongTree, shown: wrong.wrongTree.map(() => true), tones: wrong.wrongTree.map((node) => (node.val === wrong.value ? "miss" : "idle") as CellTone), edges: wrong.wrongTree.map((node) => (node.val === wrong.value ? "coral" : "idle") as "coral" | "idle") } : {}),
            rows: [base.rows[0], row("inorder", inorder, (index) => (index === mid ? "miss" : index >= left && index < mid ? "window" : "idle"), (index) => (index === mid ? "kept" : undefined)), base.rows[2]],
            note: { text: "✕ the cut box is in no piece", tone: "coral" },
          },
        },
      );
    }
    cutAt = null;
    piece = null;
    push(`${leftWords}, and ${rightWords}. The box of ${value} is in neither.`, 13, {
      state: { ...snap(), rows: [rows()[0], row("inorder", inorder, (index) => (index === mid ? "faded" : placed[index] ? "faded" : index >= left && index < mid ? "hit" : index > mid && index <= right ? "window" : "idle")), rows()[2]] },
    });

    build(left, mid - 1, id, "left");
    build(mid + 1, right, id, "right");
  };

  if (!practice) {
    piece = null;
    nextMark = false;
    push("First the list of slots is made: one entry for every number, saying where it sits in inorder.", 4, { state: { ...snap(), rows: [rows()[0], rows()[1], slotRow(inorder, () => "hit")] } });
  }
  build(0, inorder.length - 1, null, "left");

  piece = null;
  cutAt = null;
  nextMark = false;
  const text = levelText(tree);
  const end: BuildState = { ...snap(), tones: tree.map(() => "done") };
  push(practice ? `Done. Every name was called once, and every piece ran empty. The answer is ${text}.` : `The roll call is over and every piece is empty. Read level by level, with null for an empty spot, the answer is ${text}.`, 15, { state: end });
  if (practice) return frames;

  frames.push({
    scene,
    caption: `Time: O(n). Each name was called once, and the list of slots found its cut at once, with no searching. Here that is ${built} names.`,
    codeLine: 12,
    state: { ...end, counter: { label: "names called", value: built } },
  });
  frames.push({
    scene,
    caption: `Space: O(n). The list of slots holds one entry for every number. Here that is ${inorder.length} entries.`,
    codeLine: 4,
    state: { ...end, rows: [end.rows[0], end.rows[1], slotRow(inorder, () => "window")] },
  });
  return frames;
}

export const constructTreePreorderInorderStory: ProblemStory<BuildState> = {
  slugs: ["lc-105"],
  pattern: "Divide and conquer",
  trigger: "two lists written from the same tree, one naming each node before its children and one naming it between them, and the tree must be rebuilt",
  insight: "Preorder is a roll call: the next name is always the top of the next piece. Its box in inorder cuts the row: left piece is its left side, right piece its right side. The cut box is in neither.",
  metaphor: {
    name: "Roll call and the cut",
    legend: "roll call = preorder, next name = preIndex · cut = mid = inMap.get(rootVal) · piece = inorder[left..right] · list of slots = inMap · empty piece = left > right",
    terms: ["roll call", "called", "cut", "piece", "hangs", "slot"],
  },
  traps: [{ name: TRAP, rule: "The left piece is left..mid - 1 and the right piece is mid + 1..right. The cut box itself belongs to neither, or nodes cross into the wrong side." }],
  template: [
    "build(left, right):                  // a piece of inorder",
    "    if left > right: return nothing",
    "    root = next name in preorder",
    "    mid = slot of root in inorder     // looked up, not searched",
    "    root.left = build(left, mid - 1);  root.right = build(mid + 1, right)",
    "    return root",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each name is called once and its cut is looked up, not searched for",
    space: "O(n)",
    spaceWhy: "the list of slots holds one entry per number",
  },
  code: CODE,
  examples: [
    { label: "preorder [3,9,20,15,7]", input: "preorder=[3,9,20,15,7]; inorder=[9,3,15,20,7]", expected: "[3,9,20,null,null,15,7]", note: "Both pieces of the first cut are used" },
    { label: "preorder [1,2,3]", input: "preorder=[1,2,3]; inorder=[3,2,1]", expected: "[1,2,null,3]", note: "A leaning tree: every right piece is empty" },
    { label: "preorder [4,2,1,3,6,5,7]", input: "preorder=[4,2,1,3,6,5,7]; inorder=[1,2,3,4,5,6,7]", expected: "[4,2,6,1,3,5,7]", note: "A full tree of seven" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-108", title: "Convert Sorted Array to Binary Search Tree" },
    { slug: "lc-297", title: "Serialize and Deserialize Binary Tree" },
    { slug: "lc-94", title: "Binary Tree Inorder Traversal" },
  ],
  answer: (input) => levelText(shapeOf(buildLoose(readLists(input)))),
  frames: (input) => {
    const lists = readLists(input);
    const tree = shapeOf(buildLoose(lists));
    const solution = cutFrames(lists, tree);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    const practice = readLists(PRACTICE);
    return [
      ...pictureFrames(lists, tree),
      ...slowFrames(lists, tree),
      ...insightFrames(lists, tree),
      ...solution,
      ...cutFrames(practice, shapeOf(buildLoose(practice)), "card", true),
      { scene: "card", caption: "This is the picture to remember: a name is called, its box cuts the row, and a piece hangs on each side. Say the idea in your head first, then reveal the card.", state: remembered.state },
    ];
  },
  View: AgyTrees3BuildView,
};
