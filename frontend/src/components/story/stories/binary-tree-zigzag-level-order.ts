import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type ZigzagFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. Both nodes of its second level have children, so a shuffled line would show at once. */
const PRACTICE = "[5,2,9,1,4,7]";
const FALLBACK = "[3,9,20,null,null,15,7]";

const TRAP = "The Shuffled Line Trap";

const CODE = [
  "List<List<Integer>> rows = new ArrayList<>();",
  "if (root == null) return rows;",
  "Queue<TreeNode> line = new ArrayDeque<>();",
  "line.add(root);",
  "boolean leftToRight = true;",
  "while (!line.isEmpty()) {",
  "    int count = line.size();",
  "    LinkedList<Integer> row = new LinkedList<>();",
  "    for (int i = 0; i < count; i++) {",
  "        TreeNode node = line.poll();",
  "        if (leftToRight) row.addLast(node.val);",
  "        else row.addFirst(node.val);",
  "        if (node.left != null) line.add(node.left);",
  "        if (node.right != null) line.add(node.right);",
  "    }",
  "    rows.add(row);",
  "    leftToRight = !leftToRight;",
  "}",
  "return rows;",
];

/** Line, rows, and one spare strip for the trap's wrong rows. Always three, so the picture never jumps. */
const STRIPS = 3;

const showRows = (rows: number[][]) => `[${rows.map((row) => `[${row.join(",")}]`).join(",")}]`;
const runsLeftToRight = (depth: number) => depth % 2 === 0;

/** Every level, read from left to right. A plain walk that files each node under its depth. */
function levelsOf(tree: TreeShapeNode[]): number[][] {
  const levels: number[][] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    (levels[tree[id].depth] ??= []).push(tree[id].val);
    walk(tree[id].left);
    walk(tree[id].right);
  };
  if (tree.length > 0) walk(0);
  return levels;
}

/** Independent solver: file every node under its depth, then turn every second row around. No waiting line involved. */
function solve(tree: TreeShapeNode[]): number[][] {
  return levelsOf(tree).map((level, depth) => (runsLeftToRight(depth) ? level : [...level].reverse()));
}

/** The trap, really run: rows are never flipped. Instead the children join right-first whenever the next row should run right to left. */
function solveWithShuffledLine(tree: TreeShapeNode[]): { rows: number[][]; lines: number[][] } {
  const rows: number[][] = [];
  const lines: number[][] = [];
  let line: number[] = tree.length > 0 ? [0] : [];
  for (let depth = 0; line.length > 0; depth++) {
    lines.push(line.map((id) => tree[id].val));
    const next: number[] = [];
    for (const id of line) {
      const kids = [tree[id].left, tree[id].right].filter((kid): kid is number => kid !== null);
      next.push(...(runsLeftToRight(depth + 1) ? kids : kids.reverse()));
    }
    rows.push(line.map((id) => tree[id].val));
    line = next;
  }
  return { rows, lines };
}

/** The row being filled shows its open end: values join after "[3,9 …" or in front of "… 20,9]". */
function rowsStrip(rows: number[][], open: { values: number[]; leftToRight: boolean } | null, label = "rows", tone: CellTone = "done"): TreeStrip {
  const items = rows.map((row) => ({ text: `[${row.join(",")}]`, tone }));
  if (open) items.push({ text: open.leftToRight ? `[${open.values.join(",")} …` : `… ${open.values.join(",")}]`, tone: "edge" });
  return { label, items };
}

function lineStrip(tree: TreeShapeNode[], line: number[], label = "line", tone: CellTone = "window"): TreeStrip {
  return { label, ends: true, items: line.map((id) => ({ text: String(tree[id].val), tone })) };
}

function pictureFrames(tree: TreeShapeNode[], rows: number[][]): ZigzagFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const top = tree[0].val;
  const frames: ZigzagFrame[] = [
    { scene: "picture", caption: `This is a tree. The node ${top} is at the top. Each node can have a left child and a right child below it.`, state: blank },
  ];
  const wide = rows.findIndex((row) => row.length >= 2);
  const depth = wide >= 0 ? wide : Math.min(1, rows.length - 1);
  const level = levelsOf(tree)[depth];
  frames.push({
    scene: "picture",
    caption: `A level is every node at the same distance from the top. ${level.length > 1 ? `${listWords(level)} form` : `${level[0]} alone forms`} one level.`,
    state: { ...blank, band: depth, tones: tree.map((node) => (node.depth === depth ? "window" : "idle")) },
  });
  if (wide >= 0) {
    const allowed = rows[depth];
    frames.push({
      scene: "picture",
      caption: `Rows zigzag: the top row runs left to right, the next one right to left, and so on. For this level, [${allowed.join(",")}] is allowed and [${[...allowed].reverse().join(",")}] is not.`,
      state: { ...blank, band: depth, tones: tree.map((node) => (node.depth === depth ? "hit" : "idle")), strips: [rowsStrip([allowed], null, "allowed"), rowsStrip([[...allowed].reverse()], null, "not allowed", "miss"), blank.strips[2]] },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: one row per level, from the top down, each row turned the other way. Here that is ${showRows(rows)}.`,
    state: { ...blank, tones: tree.map(() => "hit"), strips: [blank.strips[0], rowsStrip(rows, null), blank.strips[2]] },
  });
  return frames;
}

/** The obvious way, really run: for each level, walk down from the top to that depth, right side first on every second level. */
function slowFrames(tree: TreeShapeNode[]): ZigzagFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const frames: ZigzagFrame[] = [];
  const rows: number[][] = [];
  const height = Math.max(...tree.map((node) => node.depth)) + 1;
  let visits = 0;
  for (let depth = 0; depth < height; depth++) {
    const row: number[] = [];
    const walk = (id: number | null) => {
      if (id === null) return;
      visits++;
      if (tree[id].depth === depth) {
        row.push(tree[id].val);
        return;
      }
      const [first, second] = runsLeftToRight(depth) ? [tree[id].left, tree[id].right] : [tree[id].right, tree[id].left];
      walk(first);
      walk(second);
    };
    walk(0);
    rows.push(row);
    if (depth > 1) continue;
    frames.push({
      scene: "slow",
      caption:
        depth === 0
          ? `The slow way: for every level, start at the top and walk down to it. The top level is quick: ${visits} node visited, for the row [${row.join(",")}].`
          : `Go back to the top and walk down to the next level, right side first this time. That gives the row [${row.join(",")}].`,
      state: {
        ...blank,
        band: depth,
        tones: tree.map((node) => (node.depth === depth ? "done" : node.depth < depth ? "window" : "idle")),
        strips: [blank.strips[0], rowsStrip(rows, null), blank.strips[2]],
        counter: { label: "nodes visited", value: visits },
      },
    });
  }
  if (height > 2) {
    frames.push({
      scene: "slow",
      caption: `The same again for ${height === 3 ? "the level" : `each of the ${height - 2} levels`} further down. Every walk starts at the top and passes the same upper nodes again.`,
      state: { ...blank, tones: tree.map(() => "window"), strips: [blank.strips[0], rowsStrip(rows, null), blank.strips[2]], counter: { label: "nodes visited", value: visits } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${visits} visits for a tree of only ${tree.length} nodes. One walk from the top per level is O(n·h) time, where h is the number of levels. A tall tree makes it crawl.`,
    state: { ...blank, tones: tree.map(() => "faded"), strips: [blank.strips[0], rowsStrip(rows, null), blank.strips[2]], counter: { label: "nodes visited", value: visits } },
  });
  return frames;
}

function insightFrames(tree: TreeShapeNode[]): ZigzagFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const top = tree[0];
  const children = [top.left, top.right].filter((id): id is number => id !== null);
  const frames: ZigzagFrame[] = [
    {
      scene: "insight",
      caption: `Picture a waiting line, like at a shop. The top node ${top.val} left the front into a row, and its ${children.length === 1 ? "child" : "children"} joined the back, left child first.`,
      state: {
        ...blank,
        band: children.length > 0 ? 1 : 0,
        tones: tree.map((node) => (node.id === 0 ? "hit" : children.includes(node.id) ? "window" : "idle")),
        strips: [lineStrip(tree, children), rowsStrip([[top.val]], null), blank.strips[2]],
      },
    },
  ];
  if (children.length === 0) return frames;
  const first = tree[children[0]];
  const tonesAfter = (taken: number): CellTone[] => tree.map((node) => (node.id === 0 || children.slice(0, taken).includes(node.id) ? "hit" : children.includes(node.id) ? "window" : "idle"));
  const runNote = { text: "this row runs right to left", tone: "accent" as const };
  frames.push({
    scene: "insight",
    caption: "The line always serves a level from left to right. Leave it that way, and flip only the row.",
    state: { ...blank, band: 1, tones: tonesAfter(0), strips: [lineStrip(tree, children), rowsStrip([[top.val]], null), blank.strips[2]], note: runNote },
  });
  frames.push({
    scene: "insight",
    caption: `This row runs right to left. ${first.val} leaves the line first and goes into the row. The row stays open on its left end.`,
    state: { ...blank, band: 1, tones: tonesAfter(1), strips: [lineStrip(tree, children.slice(1)), rowsStrip([[top.val]], { values: [first.val], leftToRight: false }), blank.strips[2]], note: runNote },
  });
  if (children.length === 2) {
    const second = tree[children[1]];
    frames.push({
      scene: "insight",
      caption: `${second.val} leaves next and goes on the left end, in front of ${first.val}. The row reads [${second.val},${first.val}], and the line was never disturbed.`,
      state: { ...blank, band: 1, tones: tonesAfter(2), strips: [lineStrip(tree, []), rowsStrip([[top.val], [second.val, first.val]], null), blank.strips[2]], note: runNote },
    });
  }
  return frames;
}

function leaveQuiz(tree: TreeShapeNode[], line: number[]): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (const id of line.slice(1)) feedback[id] = `${tree[id].val} is further back. The line is always served from the front, whichever way the row runs.`;
  return {
    kind: "cell",
    cells: tree.length,
    question: "Which node leaves the line next? Click it in the tree.",
    answer: line[0],
    feedback,
    otherwise: "That node is not standing in the line right now. Look at who is at the front.",
    why: `${tree[line[0]].val} is at the front. The line never changes its order. Only the row flips.`,
  };
}

function endQuiz(next: number, row: number[], leftToRight: boolean): StoryQuiz {
  return {
    kind: "choice",
    question: `${next} leaves the line next. This row runs ${leftToRight ? "left to right" : "right to left"}, and it already holds ${listWords(row)}. On which end of the row does ${next} go?`,
    options: [`The left end, in front of ${row[0]}`, `The right end, after ${row[row.length - 1]}`],
    answer: leftToRight ? 1 : 0,
    why: leftToRight
      ? `The line serves this level from left to right, and the row runs the same way. So each new value goes on the right end.`
      : `The line serves this level from left to right, but the row runs the other way. Putting each new value on the left end turns the row around.`,
  };
}

function joinQuiz(tree: TreeShapeNode[], node: TreeShapeNode, line: number[], nextLeftToRight: boolean): StoryQuiz {
  const kids = [node.left, node.right].filter((id): id is number => id !== null);
  const feedback: Record<number, string> = {};
  if (kids.length > 1) feedback[kids[1]] = `${tree[kids[1]].val} is the right child. If it joined first, the line would be out of order for every row below.`;
  for (const id of line) feedback[id] = `${tree[id].val} is already standing in the line.`;
  feedback[node.id] = `${node.val} has just left the line. It does not join again.`;
  return {
    kind: "cell",
    cells: tree.length,
    question: `${node.val} is in its row. The next row runs ${nextLeftToRight ? "left to right" : "right to left"}. Which child of ${node.val} joins the back of the line first? Click it.`,
    answer: kids[0],
    feedback,
    otherwise: "Only the children of the node that just left can join now. Look just below it.",
    why: `The left child ${tree[kids[0]].val} joins first, whichever way the next row runs. The line stays in left-to-right order, and only the row flips.`,
  };
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh tree:
 * fewer frames, and the reader makes every decision.
 */
function solutionFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): ZigzagFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const frames: ZigzagFrame[] = [];
  const wrong = solveWithShuffledLine(tree);
  const right = solve(tree);
  const trapRow = right.findIndex((row, index) => showRows([row]) !== showRows([wrong.rows[index] ?? []]));
  const line: number[] = [];
  const rows: number[][] = [];
  const placed = new Set<number>();
  let open: { values: number[]; leftToRight: boolean } | null = null;
  let here: number | null = null;
  let band: number | null = null;
  let note: TreeStoryState["note"] = null;
  let leftToRight = true;
  let widest: number[] = [];
  const asked = { leave: false, join: false, endLeft: false, endRight: false };
  let joinsShown = false;

  const snap = (): TreeStoryState => ({
    ...blank,
    band,
    note,
    tones: tree.map((node) => (node.id === here ? "edge" : line.includes(node.id) ? "window" : placed.has(node.id) ? "hit" : "idle")),
    strips: [lineStrip(tree, line), rowsStrip(rows, open ? { values: [...open.values], leftToRight: open.leftToRight } : null), blank.strips[2]],
  });
  const push = (caption: string, codeLine?: number, state: TreeStoryState = snap()) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  line.push(0);
  if (practice) {
    push(`Your turn, on a new tree. The top node ${tree[0].val} already stands in the line. You decide who leaves, where it goes in the row, and who joins.`);
  } else {
    push("The list of rows starts empty. So does the waiting line.", 2, { ...snap(), tones: blank.tones, strips: [lineStrip(tree, []), rowsStrip([], null), blank.strips[2]] });
    push(`The top node ${tree[0].val} joins the line.`, 3);
    note = { text: "first row runs left to right", tone: "accent" };
    push("The first row runs left to right. After every row, the direction will flip.", 4);
  }

  while (line.length > 0) {
    const count = line.length;
    const depth = tree[line[0]].depth;
    if (line.length > widest.length) widest = [...line];
    band = depth;
    open = { values: [], leftToRight };
    const runs = leftToRight ? "left to right" : "right to left";
    note = { text: `${runs} · takes ${count}`, tone: "accent" };
    push(
      practice
        ? `This row runs ${runs}. The line holds ${count}, so the row takes exactly ${count} from the front.`
        : `Count the line before taking anyone: ${count}. This row takes exactly ${count} from the front.`,
      6,
    );

    for (let i = 0; i < count; i++) {
      const before = frames[frames.length - 1];
      if (open.values.length === 0) {
        if (line.length >= 2 && (practice || !asked.leave)) {
          asked.leave = true;
          before.quiz = leaveQuiz(tree, line);
        }
      } else if (practice || !(leftToRight ? asked.endRight : asked.endLeft)) {
        if (leftToRight) asked.endRight = true;
        else asked.endLeft = true;
        before.quiz = endQuiz(tree[line[0]].val, open.values, leftToRight);
      }

      const node = tree[line.shift()!];
      here = node.id;
      const wasEmpty = open.values.length === 0;
      if (leftToRight) open.values.push(node.val);
      else open.values.unshift(node.val);
      const kids = [node.left, node.right].filter((id): id is number => id !== null);
      const left = count - i - 1;
      note = { text: left > 0 ? `${runs} · takes ${count} · ${left} to go` : `${runs} · takes ${count} · all taken`, tone: "accent" };
      const where = wasEmpty
        ? "It is the first one in its row."
        : leftToRight
          ? `This row runs left to right, so ${node.val} goes on the right end of the row.`
          : `This row runs right to left, so ${node.val} goes on the left end of the row.`;
      const leave = push(`The node ${node.val} leaves the front of the line. ${where}${kids.length === 0 ? " It has no children, so nobody joins." : ""}`, wasEmpty ? 9 : leftToRight ? 10 : 11);
      if (kids.length === 2 && (practice || !asked.join)) {
        asked.join = true;
        leave.quiz = joinQuiz(tree, node, line, !leftToRight);
      }
      if (kids.length > 0 && (practice || joinsShown)) {
        line.push(...kids);
        push(
          kids.length > 1
            ? `${tree[kids[0]].val} joins the back of the line first, then ${tree[kids[1]].val}. Left before right, whichever way the rows run.`
            : `${tree[kids[0]].val} is the only child of ${node.val}. It joins the back of the line.`,
          kids.length > 1 || kids[0] === node.left ? 12 : 13,
        );
      } else {
        for (const kid of kids) {
          line.push(kid);
          push(`Its ${kid === node.left ? "left" : "right"} child ${tree[kid].val} joins the back of the line. It waits for the next row.`, kid === node.left ? 12 : 13);
        }
        if (kids.length > 0) joinsShown = true;
      }
      if (line.length > widest.length) widest = [...line];
      placed.add(node.id);
    }

    here = null;
    const closed = open.values;
    rows.push(closed);
    open = null;
    note = null;
    band = line.length > 0 ? depth + 1 : null;
    push(`${count} taken, so the row [${closed.join(",")}] is complete. ${line.length > 0 ? `The line now holds ${listWords(line.map((id) => tree[id].val))}.` : "The line is empty."}`, 15);

    if (!practice && rows.length - 1 === trapRow) {
      push(`${TRAP}: turn a row around by letting right children join first, and the line below gets shuffled. This row would come out as [${wrong.rows[trapRow].join(",")}].`, 12, {
        ...snap(),
        strips: [
          { label: "shuffled", ends: true, items: wrong.lines[trapRow].map((value) => ({ text: String(value), tone: "miss" as CellTone })) },
          rowsStrip(rows, null),
          rowsStrip([...rows.slice(0, -1), wrong.rows[trapRow]], null, "wrong rows", "miss"),
        ],
        note: { text: "✕ right child joined first", tone: "coral" },
      });
      // Back to the true picture, so the next frame changes only one thing.
      push(`Children always join the line left first. Only the row flips, so this row is [${closed.join(",")}].`, 12);
    }

    leftToRight = !leftToRight;
    if (!practice && line.length > 0) {
      note = { text: `next row runs ${leftToRight ? "left to right" : "right to left"}`, tone: "accent" };
      push(`The direction flips. The next row runs ${leftToRight ? "left to right" : "right to left"}.`, 16);
    }
  }

  const done = (): TreeStoryState => ({ ...snap(), note: null, tones: tree.map(() => "done") });
  if (practice) {
    push(`Done. The answer is ${showRows(rows)}. Children always joined left first, so the Shuffled Line Trap never caught you.`, undefined, done());
    return frames;
  }
  push(`The line is empty, so every level has its row. The answer is ${showRows(rows)}.`, 18, done());
  push(`Time: O(n). Each of the ${tree.length} nodes joined the line once and left it once. Going on either end of a row is one quick step.`, 9, { ...done(), counter: { label: "nodes visited", value: tree.length } });
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

export const binaryTreeZigzagLevelOrderStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-103"],
  pattern: "Tree BFS",
  trigger: "a tree, and the answer is wanted level by level, with every second row turned around",
  insight: "Keep the waiting line exactly as it is, left to right. Flip only the row: on a right-to-left level, each value goes on the left end of the row.",
  metaphor: {
    name: "The waiting line and the flipping row",
    legend: "line = the queue · front = poll() · back = add() · count = line.size() read once · row = one level · right end = addLast · left end = addFirst",
    terms: ["line", "front", "back", "row"],
  },
  traps: [{ name: TRAP, rule: "Children always join the line left child first, then right child. Never change that order to turn a row around: flip only where the value goes in the row." }],
  template: [
    "line = [root];  leftToRight = true",
    "while (line is not empty) {",
    "    count = line.size();              // fix it before anyone joins",
    "    repeat count times {",
    "        node = line.poll();",
    "        put node.val on the right end of the row, or on the left end if the row runs right to left;",
    "        add node's children to the back of the line, left first;   // never change this",
    "    }",
    "    one level is finished here;  flip leftToRight;",
    "}",
  ],
  complexity: {
    slow: "O(n·h)",
    time: "O(n)",
    timeWhy: "every node joins the line once and leaves it once, and going on either end of a row is one step",
    space: "O(n)",
    spaceWhy: "the line holds about one level at a time, and a wide level can be half the tree",
  },
  code: CODE,
  examples: [
    { label: "[3,9,20,null,null,15,7]", input: "[3,9,20,null,null,15,7]", expected: "[[3],[20,9],[15,7]]" },
    { label: "Full tree of 7", input: "[1,2,3,4,5,6,7]", expected: "[[1],[3,2],[4,5,6,7]]", note: "Tricky: a shuffled line shows in the third row" },
    { label: "Tree with gaps", input: "[1,2,3,4,null,null,5]", expected: "[[1],[3,2],[4,5]]", note: "Children come from different parents" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-102", title: "Binary Tree Level Order Traversal" },
    { slug: "lc-199", title: "Binary Tree Right Side View" },
  ],
  answer: (input) => showRows(solve(parseTree(input))),
  frames: (input) => {
    const tree = readTree(input);
    const rows = solve(tree);
    const insight = insightFrames(tree);
    return [
      ...pictureFrames(tree, rows),
      ...slowFrames(tree),
      ...insight,
      ...solutionFrames(tree),
      ...solutionFrames(parseTree(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: the line keeps its order, and only the row flips. Say the idea in your head first, then reveal the card.",
        state: insight[insight.length - 1].state,
      },
    ];
  },
  View: TreeStoryView,
};
