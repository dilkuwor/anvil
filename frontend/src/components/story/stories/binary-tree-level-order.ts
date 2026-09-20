import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type LevelFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. Its top node has two children, so a moving count would go wrong at once. */
const PRACTICE = "[8,3,10,1,6,null,14]";
const FALLBACK = "[3,9,20,null,null,15,7]";

const TRAP = "The Growing Line Trap";

const CODE = [
  "List<List<Integer>> rows = new ArrayList<>();",
  "if (root == null) return rows;",
  "Queue<TreeNode> line = new ArrayDeque<>();",
  "line.add(root);",
  "while (!line.isEmpty()) {",
  "    int count = line.size();   // fixed before anyone joins",
  "    List<Integer> row = new ArrayList<>();",
  "    for (int i = 0; i < count; i++) {",
  "        TreeNode node = line.poll();",
  "        row.add(node.val);",
  "        if (node.left != null) line.add(node.left);",
  "        if (node.right != null) line.add(node.right);",
  "    }",
  "    rows.add(row);",
  "}",
  "return rows;",
];

/** Line, rows, and one spare strip for the trap's wrong rows. Always three, so the picture never jumps. */
const STRIPS = 3;

const showRows = (rows: number[][]) => `[${rows.map((row) => `[${row.join(",")}]`).join(",")}]`;

/** Independent solver: a plain walk that files every node under its depth. No waiting line involved. */
function solve(tree: TreeShapeNode[]): number[][] {
  const rows: number[][] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    const node = tree[id];
    (rows[node.depth] ??= []).push(node.val);
    walk(node.left);
    walk(node.right);
  };
  if (tree.length > 0) walk(0);
  return rows;
}

/** The trap, really run: the loop re-reads the line's size while children are joining. */
function solveWithMovingCount(tree: TreeShapeNode[]): number[][] {
  const rows: number[][] = [];
  const line: number[] = tree.length > 0 ? [0] : [];
  while (line.length > 0) {
    const row: number[] = [];
    for (let i = 0; i < line.length; i++) {
      const node = tree[line.shift()!];
      row.push(node.val);
      if (node.left !== null) line.push(node.left);
      if (node.right !== null) line.push(node.right);
    }
    rows.push(row);
  }
  return rows;
}

function rowsStrip(rows: number[][], open: number[] | null, label = "rows", tone: CellTone = "done"): TreeStrip {
  const items = rows.map((row) => ({ text: `[${row.join(",")}]`, tone }));
  if (open) items.push({ text: `[${open.join(",")} …`, tone: "edge" });
  return { label, items };
}

function lineStrip(tree: TreeShapeNode[], line: number[]): TreeStrip {
  return { label: "line", ends: true, items: line.map((id) => ({ text: String(tree[id].val), tone: "window" as CellTone })) };
}

function pictureFrames(tree: TreeShapeNode[], rows: number[][]): LevelFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const top = tree[0].val;
  const frames: LevelFrame[] = [
    { scene: "picture", caption: `This is a tree. The node ${top} is at the top. Each node can have a left child and a right child below it.`, state: blank },
  ];
  const wide = rows.findIndex((row) => row.length >= 2);
  const depth = wide >= 0 ? wide : Math.min(1, rows.length - 1);
  const level = rows[depth];
  frames.push({
    scene: "picture",
    caption: `A level is every node at the same distance from the top. ${level.length > 1 ? `${listWords(level)} form` : `${level[0]} alone forms`} one level.`,
    state: { ...blank, band: depth, tones: tree.map((node) => (node.depth === depth ? "window" : "idle")) },
  });
  if (wide >= 0) {
    frames.push({
      scene: "picture",
      caption: `Each level becomes one row, read from left to right. [${level.join(",")}] is allowed. [${[...level].reverse().join(",")}] is not.`,
      state: { ...blank, band: depth, tones: tree.map((node) => (node.depth === depth ? "hit" : "idle")), strips: [rowsStrip([level], null, "allowed"), rowsStrip([[...level].reverse()], null, "not allowed", "miss"), blank.strips[2]] },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: one row per level, from the top down. Here that is ${showRows(rows)}.`,
    state: { ...blank, tones: tree.map(() => "hit"), strips: [blank.strips[0], rowsStrip(rows, null), blank.strips[2]] },
  });
  return frames;
}

/** The obvious way, really run: one full walk of the tree per level, keeping only that level's nodes. */
function slowFrames(tree: TreeShapeNode[]): LevelFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const frames: LevelFrame[] = [];
  const rows: number[][] = [];
  let visits = 0;
  for (let depth = 0; ; depth++) {
    const row: number[] = [];
    const walk = (id: number | null) => {
      if (id === null) return;
      visits++;
      if (tree[id].depth === depth) row.push(tree[id].val);
      walk(tree[id].left);
      walk(tree[id].right);
    };
    walk(0);
    if (row.length === 0) {
      const deeper = rows.length - 2;
      frames.push({
        scene: "slow",
        caption:
          deeper > 0
            ? `The same again for ${deeper === 1 ? "the level" : `each of the ${deeper} levels`} further down, plus one last walk that finds nothing. Every walk passes the same nodes.`
            : "One last full walk finds nothing further down, so it stops.",
        state: { ...blank, tones: tree.map(() => "window"), strips: [blank.strips[0], rowsStrip(rows, null), blank.strips[2]], counter: { label: "nodes visited", value: visits } },
      });
      break;
    }
    rows.push(row);
    if (depth > 1) continue;
    frames.push({
      scene: "slow",
      caption:
        depth === 0
          ? `The slow way: walk the whole tree and keep only the top level. That is ${visits} nodes visited for a row of ${row.length}.`
          : `Go back to the top and walk the whole tree again, keeping only the next level down: ${listWords(row)}.`,
      state: {
        ...blank,
        band: depth,
        tones: tree.map((node) => (node.depth === depth ? "done" : "window")),
        strips: [blank.strips[0], rowsStrip(rows, null), blank.strips[2]],
        counter: { label: "nodes visited", value: visits },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${visits} visits for a tree of only ${tree.length} nodes. One full walk per level is O(n·h) time, where h is the number of levels. A tall tree makes it crawl.`,
    state: { ...blank, tones: tree.map(() => "faded"), strips: [blank.strips[0], rowsStrip(rows, null), blank.strips[2]], counter: { label: "nodes visited", value: visits } },
  });
  return frames;
}

function insightFrames(tree: TreeShapeNode[]): LevelFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const top = tree[0];
  const children = [top.left, top.right].filter((id): id is number => id !== null);
  const names = listWords(children.map((id) => tree[id].val));
  const frames: LevelFrame[] = [
    {
      scene: "insight",
      caption: `Picture a waiting line, like at a shop. The top node ${top.val} stands in it alone.`,
      state: { ...blank, band: 0, tones: tree.map((node) => (node.id === 0 ? "window" : "idle")), strips: [lineStrip(tree, [0]), rowsStrip([], null), blank.strips[2]] },
    },
  ];
  if (children.length === 0) return frames;
  frames.push({
    scene: "insight",
    caption: `${top.val} leaves the front into a row. ${children.length > 1 ? `Its children ${names} join` : `Its child ${names} joins`} the back. Now the line holds exactly the next level.`,
    state: { ...blank, band: 1, tones: tree.map((node) => (node.id === 0 ? "hit" : children.includes(node.id) ? "window" : "idle")), strips: [lineStrip(tree, children), rowsStrip([[top.val]], null), blank.strips[2]] },
  });
  frames.push({
    scene: "insight",
    caption: `So count the line before each row: ${children.length}. Exactly that many leave the front. Whoever joins the back meanwhile waits for the next row.`,
    state: {
      ...blank,
      band: 1,
      tones: tree.map((node) => (node.id === 0 ? "hit" : children.includes(node.id) ? "window" : "idle")),
      strips: [lineStrip(tree, children), rowsStrip([[top.val]], null), blank.strips[2]],
      note: { text: `this row takes ${children.length}`, tone: "accent" },
    },
  });
  return frames;
}

function countQuiz(size: number): StoryQuiz {
  return {
    kind: "choice",
    question: `${size === 1 ? "1 node stands" : `${size} nodes stand`} in the line. Children will join the back while we take from the front. How many do we take before this row is complete?`,
    options: [size === 1 ? "2" : "Just 1", `${size}: the number in the line right now`, "Keep taking until the line is empty"],
    answer: 1,
    why: `Count first: ${size}. Everyone in the line right now is one level. Whoever joins later belongs to the next row.`,
  };
}

function leaveQuiz(tree: TreeShapeNode[], line: number[]): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (const id of line.slice(1)) feedback[id] = `${tree[id].val} is further back. The line is served from the front, so rows stay in left-to-right order.`;
  return {
    kind: "cell",
    cells: tree.length,
    question: "Which node leaves the line next? Click it in the tree.",
    answer: line[0],
    feedback,
    otherwise: "That node is not standing in the line right now. Look at who is at the front.",
    why: `${tree[line[0]].val} is at the front. It has waited longest, so it goes first.`,
  };
}

function joinQuiz(tree: TreeShapeNode[], node: TreeShapeNode, line: number[]): StoryQuiz {
  const kids = [node.left, node.right].filter((id): id is number => id !== null);
  const feedback: Record<number, string> = {};
  if (kids.length > 1) feedback[kids[1]] = `${tree[kids[1]].val} is the right child. It joins too, but not first: rows are read left to right.`;
  for (const id of line) feedback[id] = `${tree[id].val} is already standing in the line.`;
  feedback[node.id] = `${node.val} has just left the line. It does not join again.`;
  return {
    kind: "cell",
    cells: tree.length,
    question: `${node.val} is in its row. Now its children join the back of the line. Click the one that joins first.`,
    answer: kids[0],
    feedback,
    otherwise: "Only the children of the node that just left can join now. Look just below it.",
    why: kids.length > 1 ? `The left child ${tree[kids[0]].val} joins first, then the right child. That keeps every row in left-to-right order.` : `${tree[kids[0]].val} is the only child of ${node.val}, so it joins alone.`,
  };
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh tree:
 * fewer frames, and the reader makes every decision.
 */
function solutionFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): LevelFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const frames: LevelFrame[] = [];
  const wrong = solveWithMovingCount(tree);
  const right = solve(tree);
  const trapRow = right.findIndex((row, index) => showRows([row]) !== showRows([wrong[index] ?? []]));
  const line: number[] = [];
  const rows: number[][] = [];
  const placed = new Set<number>();
  let row: number[] | null = null;
  let here: number | null = null;
  let band: number | null = null;
  let note: TreeStoryState["note"] = null;
  let widest: number[] = [];
  const asked = { count: false, leave: false, join: false };

  const snap = (): TreeStoryState => ({
    ...blank,
    band,
    note,
    tones: tree.map((node) => (node.id === here ? "edge" : line.includes(node.id) ? "window" : placed.has(node.id) ? "hit" : "idle")),
    strips: [lineStrip(tree, line), rowsStrip(rows, row), blank.strips[2]],
  });
  const push = (caption: string, codeLine?: number, state: TreeStoryState = snap()) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  line.push(0);
  if (practice) {
    push(`Your turn, on a new tree. The top node ${tree[0].val} already stands in the line. You decide how many leave, and who.`);
  } else {
    push("The list of rows starts empty. So does the waiting line.", 2, { ...snap(), tones: blank.tones, strips: [lineStrip(tree, []), rowsStrip([], null), blank.strips[2]] });
    push(`The top node ${tree[0].val} joins the line.`, 3);
  }

  while (line.length > 0) {
    const count = line.length;
    const depth = tree[line[0]].depth;
    // The frame before the count is the question's "before" moment.
    const beforeCount = frames[frames.length - 1];
    if (practice || (!asked.count && count >= 2)) {
      asked.count = true;
      beforeCount.quiz = countQuiz(count);
    }
    if (line.length > widest.length) widest = [...line];
    band = depth;
    row = [];
    note = { text: `this row takes ${count}`, tone: "accent" };
    push(
      practice
        ? `This row takes exactly ${count}. Anyone who joins the back meanwhile waits for the next row.`
        : `Count the line before taking anyone: ${count}. This row takes exactly ${count} from the front.`,
      5,
    );

    for (let i = 0; i < count; i++) {
      if (line.length >= 2 && (practice || !asked.leave)) {
        asked.leave = true;
        frames[frames.length - 1].quiz = leaveQuiz(tree, line);
      }
      const node = tree[line.shift()!];
      here = node.id;
      row.push(node.val);
      const kids = [node.left, node.right].filter((id): id is number => id !== null);
      const left = count - i - 1;
      note = { text: left > 0 ? `this row takes ${count} · ${left} to go` : `this row takes ${count} · all taken`, tone: "accent" };
      const leave = push(`The node ${node.val} leaves the front of the line and steps into the row.${kids.length === 0 ? " It has no children, so nobody joins." : ""}`, 8);
      if (kids.length > 0 && (practice || (!asked.join && (kids.length === 2 || !tree.some((other) => other.left !== null && other.right !== null))))) {
        asked.join = true;
        leave.quiz = joinQuiz(tree, node, line);
      }
      if (practice && kids.length > 0) {
        line.push(...kids);
        push(kids.length > 1 ? `${tree[kids[0]].val} joins the back of the line first, then ${tree[kids[1]].val}. Left before right.` : `${tree[kids[0]].val} is its only child. It joins the back of the line.`);
      } else {
        for (const kid of kids) {
          line.push(kid);
          push(`Its ${kid === node.left ? "left" : "right"} child ${tree[kid].val} joins the back of the line. It waits for the next row.`, kid === node.left ? 10 : 11);
        }
      }
      if (line.length > widest.length) widest = [...line];
      placed.add(node.id);
    }

    here = null;
    rows.push(row);
    const closed = row;
    row = null;
    note = null;
    band = line.length > 0 ? depth + 1 : null;
    push(
      `${count} taken, so the row [${closed.join(",")}] is complete. ${line.length > 0 ? `The line now holds ${listWords(line.map((id) => tree[id].val))}.` : "The line is empty."}`,
      13,
    );

    if (!practice && rows.length - 1 === trapRow) {
      const slipped = wrong[trapRow].filter((value) => !closed.includes(value));
      push(`${TRAP}: check the line's size again while children join, and ${listWords(slipped)} would slip into this row. We counted ${count} first.`, 5, {
        ...snap(),
        tones: tree.map((node) => (slipped.includes(node.val) ? "miss" : closed.includes(node.val) ? "hit" : placed.has(node.id) ? "hit" : "idle")),
        strips: [lineStrip(tree, line), rowsStrip(rows, null), rowsStrip([...rows.slice(0, -1), wrong[trapRow]], null, "wrong rows", "miss")],
        note: { text: "✕ count moved while taking", tone: "coral" },
      });
      // Back to the true picture, so the next frame changes only one thing.
      push(`With the count fixed, the row stays [${closed.join(",")}]. The line holds ${listWords(line.map((id) => tree[id].val))}, waiting for the next row.`, 5);
    }
  }

  const done = (): TreeStoryState => ({ ...snap(), tones: tree.map(() => "done") });
  if (practice) {
    push(`Done. The answer is ${showRows(rows)}. You counted the line before every row, so the Growing Line Trap never caught you.`, undefined, done());
    return frames;
  }
  push(`The line is empty, so every level has its row. The answer is ${showRows(rows)}.`, 15, done());
  push(`Time: O(n). Each of the ${tree.length} nodes joined the line once and left it once. Compare that with the slow way.`, 8, { ...done(), counter: { label: "nodes visited", value: tree.length } });
  push(`Space: O(n). The line holds about one level at a time. Here it never held more than ${widest.length}, but a wide tree can have half its nodes in one level.`, 2, {
    ...done(),
    tones: tree.map((node) => (widest.includes(node.id) ? "window" : "faded")),
    strips: [lineStrip(tree, widest), rowsStrip(rows, null), blank.strips[2]],
  });
  return frames;
}

function readTree(input: string): TreeShapeNode[] {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
}

export const binaryTreeLevelOrderStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-102", "level-walk"],
  pattern: "Level-by-level walk with a waiting line (queue)",
  trigger: "a tree, and the answer is wanted “level by level” or “row by row”",
  insight: "Keep a waiting line. Count it before each row: exactly that many leave the front, while their children join the back for the next row.",
  metaphor: { name: "The waiting line", legend: "line = the queue · front = poll() · back = add() · count = line.size() read once · row = one level", terms: ["line", "front", "back", "row"] },
  traps: [{ name: TRAP, rule: "Read line.size() into count once, before the inner loop. If the loop re-reads the size while children are joining, two levels leak into one row." }],
  template: [
    "line = [root]",
    "while (line is not empty) {",
    "    count = line.size();              // fix it before anyone joins",
    "    repeat count times {",
    "        node = line.poll();  use node;",
    "        add node's children to the back of the line;",
    "    }",
    "    one level is finished here;",
    "}",
  ],
  complexity: {
    slow: "O(n·h)",
    time: "O(n)",
    timeWhy: "every node joins the line once and leaves it once",
    space: "O(n)",
    spaceWhy: "the line holds about one level at a time, and a wide level can be half the tree",
  },
  code: CODE,
  examples: [
    { label: "[3,9,20,null,null,15,7]", input: "[3,9,20,null,null,15,7]", expected: "[[3],[9,20],[15,7]]" },
    { label: "Lopsided tree", input: "[1,2,3,4,null,null,5,6]", expected: "[[1],[2,3],[4,5],[6]]", note: "Children join the line from different parents" },
    { label: "Full tree of 7", input: "[4,2,6,1,3,5,7]", expected: "[[4],[2,6],[1,3,5,7]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-103", title: "Binary Tree Zigzag Level Order Traversal" },
    { slug: "lc-199", title: "Binary Tree Right Side View" },
    { slug: "lc-104", title: "Maximum Depth of Binary Tree" },
  ],
  answer: (input) => showRows(solve(parseTree(input))),
  frames: (input) => {
    const tree = readTree(input);
    const rows = solve(tree);
    const blank = blankTreeState(tree, STRIPS);
    const top = tree[0];
    const children = [top.left, top.right].filter((id): id is number => id !== null);
    return [
      ...pictureFrames(tree, rows),
      ...slowFrames(tree),
      ...insightFrames(tree),
      ...solutionFrames(tree),
      ...solutionFrames(parseTree(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a waiting line, counted before each row. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank,
          band: children.length > 0 ? 1 : 0,
          tones: tree.map((node) => (children.includes(node.id) ? "window" : node.id === 0 && children.length > 0 ? "hit" : node.id === 0 ? "window" : "idle")),
          strips: [lineStrip(tree, children.length > 0 ? children : [0]), rowsStrip(children.length > 0 ? [[top.val]] : [], null), blank.strips[2]],
          note: { text: `this row takes ${Math.max(1, children.length)}`, tone: "accent" },
        },
      },
    ];
  },
  View: TreeStoryView,
};
