import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyTrees3BuildView, blankBuildState, type BuildCell, type BuildRow, type BuildState } from "../agy-trees3-build-view";
import { listWords, type TreeShapeNode } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type LiftFrame = StoryFrame<BuildState>;

/** Fresh row for the "your turn" run. Two of its pieces have an even length, so the reader must know which middle is lifted. */
const PRACTICE = "[2,4,6,8,10,12]";
const FALLBACK = "[-10,-3,0,5,9]";

const TRAP = "The Big Sum Trap";

const CODE = [
  "TreeNode sortedArrayToBST(int[] nums) {",
  "    return build(nums, 0, nums.length - 1);",
  "}",
  "",
  "TreeNode build(int[] nums, int left, int right) {",
  "    if (left > right) return null;",
  "    int mid = left + (right - left) / 2;",
  "    TreeNode node = new TreeNode(nums[mid]);",
  "    node.left = build(nums, left, mid - 1);",
  "    node.right = build(nums, mid + 1, right);",
  "    return node;",
  "}",
];

/** Two rows, always: the sorted row, and one spare row that only the trap uses. */
const ROWS = 2;

function readNums(input: string): number[] {
  const nums = input
    .replace(/[[\]\s]/g, "")
    .split(",")
    .filter((token) => token.length > 0)
    .map(Number)
    .filter((value) => !Number.isNaN(value));
  return nums.length > 0 ? nums : readNums(FALLBACK);
}

type Shape = { tree: TreeShapeNode[]; idOf: number[] };

/**
 * Independent builder: no recursion. A to-do line of pieces, handled level by level,
 * so the nodes come out numbered in level order, exactly like the shared tree picture wants them.
 */
function shapeOf(nums: number[]): Shape {
  const tree: TreeShapeNode[] = [];
  const idOf: number[] = nums.map(() => -1);
  const todo: { left: number; right: number; parent: number | null; side: "left" | "right"; depth: number }[] = [{ left: 0, right: nums.length - 1, parent: null, side: "left", depth: 0 }];
  for (let at = 0; at < todo.length; at++) {
    const { left, right, parent, side, depth } = todo[at];
    if (left > right) continue;
    const mid = left + Math.floor((right - left) / 2);
    const id = tree.length;
    tree.push({ id, val: nums[mid], left: null, right: null, parent, depth });
    idOf[mid] = id;
    if (parent !== null) tree[parent][side] = id;
    todo.push({ left, right: mid - 1, parent: id, side: "left", depth: depth + 1 });
    todo.push({ left: mid + 1, right, parent: id, side: "right", depth: depth + 1 });
  }
  return { tree, idOf };
}

/** Level by level, "null" for an empty spot, nothing after the last real node. */
function levelText(tree: TreeShapeNode[]): string {
  if (tree.length === 0) return "[]";
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

/** A tree that leans: each number hangs on the right of the one before. Only used to show what is not allowed. */
function leaningTree(values: number[]): TreeShapeNode[] {
  return values.map((val, id) => ({ id, val, left: null, right: id + 1 < values.length ? id + 1 : null, parent: id === 0 ? null : id - 1, depth: id }));
}

function numsRow(nums: number[], tone: (index: number) => CellTone, under: (index: number) => string | undefined = () => undefined): BuildRow {
  return { label: "nums", cells: nums.map((value, index): BuildCell => ({ text: String(value), tone: tone(index), under: under(index) })) };
}

function pictureFrames(nums: number[], shape: Shape): LiftFrame[] {
  const { tree } = shape;
  const blank = blankBuildState(tree, ROWS);
  const hidden = { ...blank, shown: tree.map(() => false) };
  const plain = numsRow(nums, () => "idle");
  const root = tree[0];
  const under = (id: number | null): number[] => (id === null ? [] : [id, ...under(tree[id].left), ...under(tree[id].right)]);
  const leftIds = under(root.left);
  const rightIds = under(root.right);
  const deepest = Math.max(...tree.map((node) => node.depth));
  const lean = nums.slice(0, deepest + 1);
  const frames: LiftFrame[] = [
    { scene: "picture", caption: `This is a row of ${nums.length} numbers. It is sorted: every number is larger than the one before it.`, state: { ...hidden, rows: [plain, blank.rows[1]] } },
    {
      scene: "picture",
      caption: `The row must become a search tree. In a search tree, smaller numbers hang on the left of a node and larger numbers on its right. Look at ${root.val}.`,
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : leftIds.includes(node.id) ? "hit" : "window")), rows: [numsRow(nums, (index) => (shape.idOf[index] === 0 ? "edge" : leftIds.includes(shape.idOf[index]) ? "hit" : "window")), blank.rows[1]], tag: { id: 0, text: "smaller left, larger right" } },
    },
  ];
  if (lean.length >= 3) {
    const leaning = leaningTree(lean);
    frames.push({
      scene: "picture",
      caption: `This is not allowed. Hanging each number under the one before it is a search tree too, but it leans: one side is ${lean.length - 1} levels deep and the other is empty.`,
      state: { ...blankBuildState(leaning, ROWS), tones: leaning.map(() => "miss"), edges: leaning.map(() => "coral"), rows: [numsRow(nums, (index) => (index < lean.length ? "miss" : "idle")), blank.rows[1]], note: { text: "✕ not balanced", tone: "coral" } },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: a balanced search tree. At every node, the left side and the right side differ in height by one level at most.${rightIds.length + leftIds.length > 0 ? ` Like this one.` : ""}`,
    state: { ...blank, tones: tree.map(() => "done"), edges: tree.map(() => "teal"), rows: [plain, blank.rows[1]] },
  });
  return frames;
}

/** The obvious way, really run: lift the middle, then copy each side into a brand new row, and repeat. Every copied box is counted. */
function slowFrames(nums: number[], shape: Shape): LiftFrame[] {
  const { tree, idOf } = shape;
  const blank = blankBuildState(tree, ROWS);
  let copied = 0;
  const levels: { copied: number; lifted: number[] }[] = [];
  const build = (row: { value: number; index: number }[], depth: number) => {
    if (row.length === 0) return;
    const mid = Math.floor((row.length - 1) / 2);
    const leftRow = row.slice(0, mid);
    const rightRow = row.slice(mid + 1);
    copied += leftRow.length + rightRow.length;
    levels[depth] = levels[depth] ?? { copied: 0, lifted: [] };
    levels[depth].copied += leftRow.length + rightRow.length;
    levels[depth].lifted.push(row[mid].index);
    build(leftRow, depth + 1);
    build(rightRow, depth + 1);
  };
  build(
    nums.map((value, index) => ({ value, index })),
    0,
  );

  const frames: LiftFrame[] = [];
  let running = 0;
  const liftedSoFar: number[] = [];
  levels.slice(0, 2).forEach((level, depth) => {
    running += level.copied;
    liftedSoFar.push(...level.lifted);
    const lifted = [...liftedSoFar];
    frames.push({
      scene: "slow",
      caption:
        depth === 0
          ? `The slow way: lift the middle number, ${nums[level.lifted[0]]}, to the top. Then copy everything left of it into a new row, and everything right of it into another.`
          : `Each new row is handled the same way: lift its middle, ${listWords(level.lifted.map((index) => nums[index]))}, and copy what is left of it into even smaller rows.`,
      state: {
        ...blank,
        shown: tree.map((node) => lifted.some((index) => idOf[index] === node.id)),
        tones: tree.map((node) => (level.lifted.some((index) => idOf[index] === node.id) ? "edge" : "hit")),
        rows: [numsRow(nums, (index) => (level.lifted.includes(index) ? "edge" : lifted.includes(index) ? "faded" : "window")), blank.rows[1]],
        counter: { label: "boxes copied", value: running },
      },
    });
  });
  frames.push({
    scene: "slow",
    caption: `It works: the tree is balanced. But it copied ${copied} ${copied === 1 ? "box" : "boxes"} for a row of ${nums.length}, because every level of the tree copies most of the row again.`,
    state: { ...blank, tones: tree.map(() => "hit"), rows: [numsRow(nums, () => "faded"), blank.rows[1]], counter: { label: "boxes copied", value: copied } },
  });
  frames.push({
    scene: "slow",
    caption: `A balanced tree has about log n levels, so this is O(n log n) time. All that copying is not needed.`,
    state: { ...blank, tones: tree.map(() => "faded"), rows: [numsRow(nums, () => "faded"), blank.rows[1]], counter: { label: "boxes copied", value: copied } },
  });
  return frames;
}

function insightFrames(nums: number[], shape: Shape): LiftFrame[] {
  const { tree } = shape;
  const blank = blankBuildState(tree, ROWS);
  const last = nums.length - 1;
  const mid = Math.floor(last / 2);
  const ends = (left: number, right: number) => (index: number) => (left === right && index === left ? "left, right" : index === left ? "left" : index === right ? "right" : undefined);
  const onlyTop = tree.map((node) => node.id === 0);
  const frames: LiftFrame[] = [
    {
      scene: "insight",
      caption: "A piece of the row does not need to be copied. It is just a place in the old row: left marks its first box, and right marks its last.",
      state: { ...blank, shown: tree.map(() => false), rows: [numsRow(nums, () => "window", ends(0, last)), blank.rows[1]] },
    },
    {
      scene: "insight",
      caption: `Lift the middle box of the piece: ${nums[mid]}. Now ${mid === 0 ? "no number is" : mid === 1 ? "one number is" : `${mid} numbers are`} left of it and ${last - mid === 1 ? "one is" : `${last - mid} are`} right of it, so the two sides stay even.`,
      state: { ...blank, shown: onlyTop, tones: tree.map(() => "edge"), rows: [numsRow(nums, (index) => (index === mid ? "edge" : index < mid ? "hit" : "window")), blank.rows[1]] },
    },
  ];
  if (mid > 0) {
    frames.push({
      scene: "insight",
      caption: `The left piece is the same problem, only smaller: move right to just before ${nums[mid]}. Its middle will hang on the left of ${nums[mid]}. The right piece works the same way.`,
      state: { ...blank, shown: onlyTop, tones: tree.map(() => "hit"), rows: [numsRow(nums, (index) => (index < mid ? "window" : index === mid ? "faded" : "idle"), ends(0, mid - 1)), blank.rows[1]] },
    });
  }
  return frames;
}

/** What 32-bit whole numbers really do when a sum gets too large. The two marks are typed; the wrap is computed. */
const HUGE_LEFT = 1_500_000_000;
const HUGE_RIGHT = 2_000_000_000;
function hugeRow(): BuildRow {
  const wrapped = (HUGE_LEFT + HUGE_RIGHT) | 0;
  const safe = HUGE_LEFT + Math.floor((HUGE_RIGHT - HUGE_LEFT) / 2);
  return {
    label: "huge row",
    cells: [
      { text: String(HUGE_LEFT), tone: "idle", under: "left" },
      { text: String(HUGE_RIGHT), tone: "idle", under: "right" },
      { text: String(wrapped), tone: "miss", under: "left + right" },
      { text: String(safe), tone: "done", under: "left + half the gap" },
    ],
  };
}

/**
 * The real recursion, one frame per change. A piece with one box is told in one frame.
 * `practice` reuses it on a fresh row, and the reader picks every middle.
 */
function liftFrames(nums: number[], shape: Shape, scene: SceneId = "solution", practice = false): LiftFrame[] {
  const { tree, idOf } = shape;
  const blank = blankBuildState(tree, ROWS);
  const frames: LiftFrame[] = [];
  const shown = tree.map(() => false);
  const tones: CellTone[] = tree.map(() => "idle");
  const lifted: boolean[] = nums.map(() => false);
  let piece: [number, number] | null = null;
  let midShown: number | null = null;
  let liftedCount = 0;
  let deepest: number[] = [];
  const path: number[] = [];
  const asked = { odd: false, even: false };
  let trapShown = false;
  let singleShown = false;

  const row = (): BuildRow =>
    numsRow(
      nums,
      (index) => (lifted[index] ? "faded" : index === midShown ? "edge" : piece && index >= piece[0] && index <= piece[1] ? "window" : "idle"),
      (index) => (!piece || piece[0] > piece[1] ? undefined : piece[0] === piece[1] && index === piece[0] ? "left, right" : index === piece[0] ? "left" : index === piece[1] ? "right" : undefined),
    );
  const snap = (): BuildState => ({ ...blank, shown: [...shown], tones: [...tones], edges: tree.map((node) => (shown[node.id] ? "teal" : "idle")), rows: [row(), blank.rows[1]], pickOn: 0 });
  const push = (caption: string, codeLine: number, extra: { quiz?: StoryQuiz; state?: BuildState } = {}) => {
    const frame: LiftFrame = { scene, caption, state: extra.state ?? snap() };
    if (!practice) frame.codeLine = codeLine;
    if (extra.quiz) frame.quiz = extra.quiz;
    frames.push(frame);
  };

  const oddQuiz = (left: number, right: number, mid: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (let index = 0; index < nums.length; index++) {
      if (index === mid) continue;
      if (lifted[index]) feedback[index] = `${nums[index]} was lifted out already. It hangs in the tree.`;
      else if (index < left || index > right) feedback[index] = `${nums[index]} is outside this piece. It belongs to another part of the tree.`;
      else feedback[index] = `Lifting ${nums[index]} would leave ${index - left} on its left and ${right - index} on its right. The sides would not be even.`;
    }
    return {
      kind: "cell",
      cells: nums.length,
      question: `This piece runs from ${nums[left]} to ${nums[right]}. Which box is lifted out of it? Click that box.`,
      answer: mid,
      feedback,
      otherwise: "Count the boxes on each side of your choice. They should be the same.",
      why: `${nums[mid]} has as many boxes on its left as on its right, so the two sides of the tree stay even.`,
    };
  };
  const evenQuiz = (left: number, right: number, mid: number): StoryQuiz => ({
    kind: "choice",
    question: `This piece, ${nums[left]} to ${nums[right]}, has an even number of boxes, so two boxes share the middle. The code goes from left half of the way to right, rounded down. Which one does it lift?`,
    options: [`${nums[mid]}, the left one of the two`, `${nums[mid + 1]}, the right one of the two`],
    answer: 0,
    why: `Half of the gap is rounded down, so the code lands on the left one. Either would give a balanced tree; this code always takes the left.`,
  });
  const trapQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: "The middle is found from the two marks, left and right. Which way also works on a row with two thousand million boxes?",
    options: ["Add left and right, then halve the sum", "Start at left, then add half of the gap between left and right", "Halve right, and ignore left"],
    answer: 1,
    why: "The gap between the marks is never larger than the row. The sum of the marks can be twice as large, too large for a Java int.",
  });

  const build = (left: number, right: number, parent: number | null, side: "left" | "right"): void => {
    const where = parent === null ? "" : `the ${side} of ${tree[parent].val}`;
    if (left > right) return;
    const mid = left + Math.floor((right - left) / 2);
    const id = idOf[mid];
    const size = right - left + 1;
    path.push(id);
    if (path.length > deepest.length) deepest = [...path];
    piece = [left, right];
    midShown = null;

    const lift = () => {
      lifted[mid] = true;
      shown[id] = true;
      tones[id] = "edge";
      liftedCount++;
      midShown = null;
    };
    const settle = () => {
      tones[id] = "hit";
    };

    if (size === 1) {
      lift();
      piece = null;
      push(
        singleShown
          ? `One box again: ${nums[mid]} is lifted and hangs on ${where}. Nothing hangs under it.`
          : `${parent === null ? "The row has one box" : `The piece for ${where} has one box`}, ${nums[mid]}. It is lifted${parent === null ? " and is the whole tree" : ` and hangs on ${where}`}. The pieces beside it are empty, so nothing hangs under it.`,
        7,
      );
      singleShown = true;
      settle();
    } else {
      const even = size % 2 === 0;
      const askTrap = !trapShown && (practice ? parent !== null : true);
      const lead =
        parent === null
          ? practice
            ? `Your turn, on a new row. The first piece is the whole row, from ${nums[left]} to ${nums[right]}. You pick every middle.`
            : `The first piece is the whole row. The mark left stands on its first box, ${nums[left]}, and right on its last, ${nums[right]}.`
          : `Next, the piece for ${where}: from ${nums[left]} to ${nums[right]}. The marks left and right move to its ends.`;
      if (askTrap) {
        trapShown = true;
        push(lead, 4, practice ? { quiz: trapQuiz() } : {});
        push(`${TRAP}: adding left and right first looks simpler. But on a huge row the sum is too large for a Java int and turns into a number below zero.`, 6, {
          state: { ...snap(), rows: [row(), hugeRow()], note: { text: "✕ left + right can overflow", tone: "coral" } },
        });
        const quiz = practice || !(even ? asked.even : asked.odd) ? (even ? evenQuiz(left, right, mid) : oddQuiz(left, right, mid)) : undefined;
        if (even) asked.even = true;
        else asked.odd = true;
        push(`So the middle is found safely: start at left, and go half of the way to right${even ? ", rounded down" : ""}.`, 6, quiz ? { quiz } : {});
      } else {
        const quiz = practice || !(even ? asked.even : asked.odd) ? (even ? evenQuiz(left, right, mid) : oddQuiz(left, right, mid)) : undefined;
        if (even) asked.even = true;
        else asked.odd = true;
        push(lead, 4, quiz ? { quiz } : {});
      }
      midShown = mid;
      push(`The middle of this piece is ${nums[mid]}${even ? `: two boxes share the middle, and the code takes the left one` : `, with ${mid - left} ${mid - left === 1 ? "box" : "boxes"} on each side`}.`, 6);
      lift();
      push(`${nums[mid]} is lifted out of the row and ${parent === null ? "becomes the top of the tree" : `hangs on ${where}`}.`, 7);
      settle();
      if (left > mid - 1) {
        piece = null;
        push(`The piece left of ${nums[mid]} is empty: nothing in the row lies between the marks. So nothing hangs on the left of ${nums[mid]}.`, 5);
      }
    }
    build(left, mid - 1, id, "left");
    build(mid + 1, right, id, "right");
    path.pop();
  };

  build(0, nums.length - 1, null, "left");

  piece = null;
  midShown = null;
  const text = levelText(tree);
  const end: BuildState = { ...snap(), tones: tree.map(() => "done"), pickOn: "tree" };
  push(practice ? `Done. Every box was lifted once, and you picked every middle. The answer is ${text}.` : `Every box has been lifted, and the tree is balanced. Read level by level, with null for an empty spot, the answer is ${text}.`, 10, { state: end });
  if (practice) return frames;

  frames.push({
    scene,
    caption: `Time: O(n). Each box was lifted exactly once, and no box was ever copied. Here that is ${liftedCount} lifts for ${nums.length} boxes.`,
    codeLine: 7,
    state: { ...end, counter: { label: "boxes lifted", value: liftedCount } },
  });
  frames.push({
    scene,
    caption: `Space: O(log n). Only the pieces on the way down wait, one per level, and a balanced tree has about log n levels. Here at most ${deepest.length} waited.`,
    codeLine: 8,
    state: { ...end, tones: tree.map((node) => (deepest.includes(node.id) ? "window" : "faded")), edges: tree.map((node) => (deepest.includes(node.id) && node.parent !== null ? "accent" : "idle")) },
  });
  return frames;
}

export const sortedArrayToBstStory: ProblemStory<BuildState> = {
  slugs: ["lc-108"],
  pattern: "Divide and conquer",
  trigger: "a sorted row of numbers that must become a balanced search tree",
  insight: "Lift the middle box: it becomes the root. The piece left of it becomes the left side, the piece right of it the right side, each built the same way. A piece is only two marks, never a copy.",
  metaphor: {
    name: "Lift the middle",
    legend: "piece = nums[left..right] · middle = mid · lift = new TreeNode(nums[mid]) · empty piece = left > right",
    terms: ["piece", "middle", "lifted", "hangs", "mark"],
  },
  traps: [{ name: TRAP, rule: "Find the middle as left + (right - left) / 2. Writing (left + right) / 2 adds two large marks first, and that sum can overflow an int." }],
  template: [
    "build(left, right):",
    "    if left > right: return nothing          // empty piece",
    "    mid = left + (right - left) / 2          // never (left + right) / 2",
    "    node = new node(row[mid])",
    "    node.left = build(left, mid - 1);  node.right = build(mid + 1, right)",
    "    return node",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each box is lifted once and nothing is copied",
    space: "O(log n)",
    spaceWhy: "one waiting piece per level, and a balanced tree has about log n levels",
  },
  code: CODE,
  examples: [
    { label: "[-10,-3,0,5,9]", input: "[-10,-3,0,5,9]", expected: "[0,-10,5,null,-3,null,9]", note: "Pieces of even length: the left middle is lifted" },
    { label: "[1,2,3,4,5,6,7]", input: "[1,2,3,4,5,6,7]", expected: "[4,2,6,1,3,5,7]", note: "Every piece has one clear middle" },
    { label: "[1,3]", input: "[1,3]", expected: "[1,null,3]", note: "Two boxes share the middle" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-105", title: "Construct Binary Tree from Preorder and Inorder Traversal" },
    { slug: "lc-98", title: "Validate Binary Search Tree" },
    { slug: "lc-230", title: "Kth Smallest Element in a BST" },
  ],
  answer: (input) => levelText(shapeOf(readNums(input)).tree),
  frames: (input) => {
    const nums = readNums(input);
    const shape = shapeOf(nums);
    const solution = liftFrames(nums, shape);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    const practice = readNums(PRACTICE);
    return [
      ...pictureFrames(nums, shape),
      ...slowFrames(nums, shape),
      ...insightFrames(nums, shape),
      ...solution,
      ...liftFrames(practice, shapeOf(practice), "card", true),
      { scene: "card", caption: "This is the picture to remember: the middle box is lifted, and a piece hangs on each side of it. Say the idea in your head first, then reveal the card.", state: remembered.state },
    ];
  },
  View: AgyTrees3BuildView,
};
