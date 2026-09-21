import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type SideFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. Its right side ends early, so the bottom row is seen on the left side. */
const PRACTICE = "[6,3,8,1,4]";
const FALLBACK = "[1,2,3,null,5,null,4]";

const TRAP = "The Right Turn Trap";

const CODE = [
  "List<Integer> seen = new ArrayList<>();",
  "if (root == null) return seen;",
  "Queue<TreeNode> line = new ArrayDeque<>();",
  "line.add(root);",
  "while (!line.isEmpty()) {",
  "    int count = line.size();",
  "    for (int i = 0; i < count; i++) {",
  "        TreeNode node = line.poll();",
  "        if (i == count - 1) seen.add(node.val);",
  "        if (node.left != null) line.add(node.left);",
  "        if (node.right != null) line.add(node.right);",
  "    }",
  "}",
  "return seen;",
];

/** Line, seen list, and one spare strip for the trap's short list. Always three, so the picture never jumps. */
const STRIPS = 3;

const showList = (values: number[]) => `[${values.join(",")}]`;

/** Every level as node ids, read from left to right. A plain walk that files each node under its depth. */
function levelsOf(tree: TreeShapeNode[]): number[][] {
  const levels: number[][] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    (levels[tree[id].depth] ??= []).push(id);
    walk(tree[id].left);
    walk(tree[id].right);
  };
  if (tree.length > 0) walk(0);
  return levels;
}

/** Independent solver: walk right side first, and keep the first node met at each new depth. No waiting line involved. */
function solve(tree: TreeShapeNode[]): number[] {
  const seen: number[] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    if (tree[id].depth === seen.length) seen.push(id);
    walk(tree[id].right);
    walk(tree[id].left);
  };
  if (tree.length > 0) walk(0);
  return seen;
}

/** The trap, really run: step from the top to the right child, again and again, until there is none. */
function rightTurnsOnly(tree: TreeShapeNode[]): number[] {
  const walk: number[] = [];
  for (let at: number | null = tree.length > 0 ? 0 : null; at !== null; at = tree[at].right) walk.push(at);
  return walk;
}

function seenStrip(tree: TreeShapeNode[], seen: number[], label = "seen", tone: CellTone = "done"): TreeStrip {
  return { label, items: seen.map((id) => ({ text: String(tree[id].val), tone })) };
}

function lineStrip(tree: TreeShapeNode[], line: number[]): TreeStrip {
  return { label: "line", ends: true, items: line.map((id) => ({ text: String(tree[id].val), tone: "window" as CellTone })) };
}

function pictureFrames(tree: TreeShapeNode[], answer: number[]): SideFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const levels = levelsOf(tree);
  const wide = levels.find((level) => level.length >= 2);
  const frames: SideFrame[] = [
    { scene: "picture", caption: `This is a tree. The node ${val(0)} is at the top. Each node can have a left child and a right child below it.`, state: blank },
  ];
  if (wide) {
    const last = wide[wide.length - 1];
    const behind = wide.slice(0, -1);
    frames.push({
      scene: "picture",
      caption: `A level is every node at the same distance from the top. ${listWords(wide.map(val))} form one level.`,
      state: { ...blank, band: tree[last].depth, tones: tree.map((node) => (wide.includes(node.id) ? "window" : "idle")) },
    });
    frames.push({
      scene: "picture",
      caption: `Now stand on the right side of the tree and look at it. On this level you can see ${val(last)}. You cannot see ${listWords(behind.map(val))}: ${val(last)} stands in front.`,
      state: { ...blank, band: tree[last].depth, tones: tree.map((node) => (node.id === last ? "hit" : behind.includes(node.id) ? "miss" : "idle")), tag: { id: last, text: "seen" } },
    });
  } else {
    frames.push({
      scene: "picture",
      caption: "Now stand on the right side of the tree and look at it. On each level you see only the node furthest to the right. Here every level has just one node.",
      state: { ...blank, tones: tree.map(() => "hit") },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: list the one node you can see on each level, from the top down. Here that is ${showList(answer.map(val))}.`,
    state: { ...blank, tones: tree.map((node) => (answer.includes(node.id) ? "done" : "faded")), strips: [blank.strips[0], seenStrip(tree, answer), blank.strips[2]] },
  });
  return frames;
}

/** The obvious way, really run: one full walk of the tree per level, keeping the last node met on that level. */
function slowFrames(tree: TreeShapeNode[]): SideFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const frames: SideFrame[] = [];
  const seen: number[] = [];
  let visits = 0;
  for (let depth = 0; ; depth++) {
    let last: number | null = null;
    const walk = (id: number | null) => {
      if (id === null) return;
      visits++;
      if (tree[id].depth === depth) last = id;
      walk(tree[id].left);
      walk(tree[id].right);
    };
    walk(0);
    const found: number | null = last;
    if (found === null) {
      const deeper = seen.length - 2;
      frames.push({
        scene: "slow",
        caption:
          deeper > 0
            ? `The same again for ${deeper === 1 ? "the level" : `each of the ${deeper} levels`} further down, plus one last walk that finds nothing. Every walk passes the same nodes.`
            : "One last full walk finds nothing further down, so it stops.",
        state: { ...blank, tones: tree.map(() => "window"), strips: [blank.strips[0], seenStrip(tree, seen), blank.strips[2]], counter: { label: "nodes visited", value: visits } },
      });
      break;
    }
    seen.push(found);
    if (depth > 1) continue;
    frames.push({
      scene: "slow",
      caption:
        depth === 0
          ? `The slow way: walk the whole tree from left to right, and look only at the top level. The last node met there is ${tree[found].val}. That is ${visits} nodes visited for one value.`
          : `Go back to the top and walk the whole tree again, looking only at the next level down. The last node met there is ${tree[found].val}.`,
      state: {
        ...blank,
        band: depth,
        tones: tree.map((node) => (node.id === found ? "done" : "window")),
        strips: [blank.strips[0], seenStrip(tree, seen), blank.strips[2]],
        counter: { label: "nodes visited", value: visits },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${visits} visits for a tree of only ${tree.length} nodes. One full walk per level is O(n·h) time, where h is the number of levels. A tall tree makes it crawl.`,
    state: { ...blank, tones: tree.map(() => "faded"), strips: [blank.strips[0], seenStrip(tree, seen), blank.strips[2]], counter: { label: "nodes visited", value: visits } },
  });
  return frames;
}

function insightFrames(tree: TreeShapeNode[]): SideFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const levels = levelsOf(tree);
  const level = levels.find((row) => row.length >= 2) ?? levels[Math.min(1, levels.length - 1)];
  const last = level[level.length - 1];
  const depth = tree[last].depth;
  const before = levels.slice(0, depth).map((row) => row[row.length - 1]);
  const inLine = (): CellTone[] => tree.map((node) => (level.includes(node.id) ? "window" : "idle"));
  return [
    {
      scene: "insight",
      caption: `Picture a waiting line, like at a shop. It holds one level at a time, in order from left to right. Right now it holds ${listWords(level.map(val))}.`,
      state: { ...blank, band: depth, tones: inLine(), strips: [lineStrip(tree, level), seenStrip(tree, before), blank.strips[2]] },
    },
    {
      scene: "insight",
      caption: `The line is served from the front. So the node furthest to the right, ${val(last)}, is the last one of its row to leave.`,
      state: { ...blank, band: depth, tones: tree.map((node) => (node.id === last ? "edge" : level.includes(node.id) ? "faded" : "idle")), strips: [lineStrip(tree, [last]), seenStrip(tree, before), blank.strips[2]] },
    },
    {
      scene: "insight",
      caption: `So count the line before each row. The last of that count to leave is seen from the right. ${level.length > 1 ? "The ones before it are hidden behind it." : "Nothing stands in front of it."}`,
      state: {
        ...blank,
        band: depth,
        tones: tree.map((node) => (node.id === last ? "done" : level.includes(node.id) ? "faded" : "idle")),
        tag: { id: last, text: "seen" },
        strips: [lineStrip(tree, []), seenStrip(tree, [...before, last]), blank.strips[2]],
        note: { text: `this row takes ${level.length} · all taken`, tone: "accent" },
      },
    },
  ];
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh tree:
 * fewer frames, and the reader decides for every node whether it is seen.
 */
function solutionFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): SideFrame[] {
  const blank = blankTreeState(tree, STRIPS);
  const val = (id: number) => tree[id].val;
  const frames: SideFrame[] = [];
  const turns = rightTurnsOnly(tree);
  const line: number[] = [];
  const seen: number[] = [];
  const hidden = new Set<number>();
  let here: number | null = null;
  let band: number | null = null;
  let note: TreeStoryState["note"] = null;
  let tag: TreeStoryState["tag"] = null;
  let widest: number[] = [];
  const asked = { hidden: false, seen: false };
  let joinsShown = false;
  let trapShown = false;

  const snap = (): TreeStoryState => ({
    ...blank,
    band,
    note,
    tag,
    tones: tree.map((node) => (node.id === here ? "edge" : line.includes(node.id) ? "window" : seen.includes(node.id) ? "done" : hidden.has(node.id) ? "faded" : "idle")),
    strips: [lineStrip(tree, line), seenStrip(tree, seen), blank.strips[2]],
  });
  const push = (caption: string, codeLine?: number, state: TreeStoryState = snap()) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  const hiddenQuiz = (id: number, toGo: number): StoryQuiz => ({
    kind: "choice",
    question: `${val(id)} leaves the front next. After it, ${toGo === 1 ? "1 more node" : `${toGo} more nodes`} of this row will leave. Does ${val(id)} go on the seen list?`,
    options: [`Yes, every node that leaves the line is seen`, `No, ${val(id)} is not the last of its row`, `Yes, because ${val(id)} left first`],
    answer: 1,
    why: `The line runs from left to right, so whoever leaves after ${val(id)} stands to its right and blocks the view.`,
  });
  const seenQuiz = (id: number, row: number[]): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (const other of seen) feedback[other] = `${val(other)} is already on the seen list, for its own row higher up. Every row has one node that is seen.`;
    for (const other of hidden) feedback[other] = row.includes(other) ? `${val(other)} left the line with others of its row still behind it. They stand to its right and hide it.` : `${val(other)} is hidden, and its row is finished.`;
    for (const other of line) if (other !== id) feedback[other] = `${val(other)} joined the line for the next row. It is not part of this row.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: row.length > 1 ? "One more node of this row is still to leave. Which node goes on the seen list for this row? Click it." : "This row has only one node to take. Which node goes on the seen list for this row? Click it.",
      answer: id,
      feedback,
      otherwise: "That node is not in the row that is leaving now. Look at the highlighted level, and at who is still in the line.",
      why: `${val(id)} is the last of its row to leave the line, so nothing stands to its right. It does not matter which side of the tree it hangs on.`,
    };
  };

  line.push(0);
  if (practice) {
    push(`Your turn, on a new tree. The top node ${val(0)} already stands in the line. For every node that leaves, you decide if it is seen.`);
  } else {
    push("The seen list starts empty. So does the waiting line.", 2, { ...snap(), tones: blank.tones, strips: [lineStrip(tree, []), seenStrip(tree, []), blank.strips[2]] });
    push(`The top node ${val(0)} joins the line.`, 3);
  }

  while (line.length > 0) {
    const count = line.length;
    const row = [...line];
    const depth = tree[line[0]].depth;
    if (line.length > widest.length) widest = [...line];
    band = depth;
    tag = null;
    note = { text: `this row takes ${count}`, tone: "accent" };
    push(
      depth === 0
        ? `Count the line before taking anyone: ${count}. This row takes exactly ${count} from the front.`
        : `The line now holds exactly the next level: ${listWords(row.map(val))}. Count it first: this row takes exactly ${count} from the front.`,
      5,
    );

    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const id = line[0];
      const before = frames[frames.length - 1];
      if (depth > 0 && isLast && (count >= 2 || (practice && !turns.includes(id))) && (practice || !asked.seen)) {
        asked.seen = true;
        before.quiz = seenQuiz(id, row);
      } else if (!isLast && (practice || !asked.hidden)) {
        asked.hidden = true;
        before.quiz = hiddenQuiz(id, count - i - 1);
      }

      line.shift();
      const node = tree[id];
      here = id;
      tag = null;
      const kids = [node.left, node.right].filter((kid): kid is number => kid !== null);
      const toGo = count - i - 1;
      note = { text: toGo > 0 ? `this row takes ${count} · ${toGo} to go` : `this row takes ${count} · all taken`, tone: "accent" };
      if (isLast) {
        push(`The node ${node.val} leaves the front of the line. It is the last of its row.`, 7);
        seen.push(id);
        tag = { id, text: "seen" };
        push(`No one from this row is left to stand to its right. So ${node.val} is seen, and it goes on the seen list.`, 8);
      } else {
        hidden.add(id);
        push(`The node ${node.val} leaves the front of the line. ${toGo === 1 ? "1 more of its row is" : `${toGo} more of its row are`} still to leave, to its right. So ${node.val} is hidden.`, 8);
      }

      if (kids.length > 0 && (practice || joinsShown)) {
        line.push(...kids);
        push(
          kids.length > 1
            ? `The children of ${node.val} join the back of the line: ${val(kids[0])} first, then ${val(kids[1])}. They wait for the next row.`
            : `${val(kids[0])} is the only child of ${node.val}. It joins the back of the line and waits for the next row.`,
          kids[0] === node.left ? 9 : 10,
        );
      } else if (kids.length > 0) {
        for (const kid of kids) {
          line.push(kid);
          push(`Its ${kid === node.left ? "left" : "right"} child ${val(kid)} joins the back of the line. It waits for the next row.`, kid === node.left ? 9 : 10);
        }
        joinsShown = true;
      }
      if (line.length > widest.length) widest = [...line];
    }
    here = null;

    if (!practice && !trapShown && depth >= turns.length) {
      trapShown = true;
      const end = turns[turns.length - 1];
      const edges: TreeEdgeMark[] = tree.map((other) => ({ tone: turns.includes(other.id) && other.parent !== null ? "skipped" : "idle" }));
      push(`${TRAP}: step down by right children only, and the walk ends at ${val(end)}. It never reaches this row, yet ${val(seen[seen.length - 1])} is seen from the right.`, 8, {
        ...snap(),
        edges,
        tones: tree.map((other) => (turns.includes(other.id) ? "miss" : seen.includes(other.id) ? "done" : line.includes(other.id) ? "window" : hidden.has(other.id) ? "faded" : "idle")),
        strips: [lineStrip(tree, line), seenStrip(tree, seen), seenStrip(tree, turns, "too short", "miss")],
        note: { text: `✕ right turns only end at ${val(end)}`, tone: "coral" },
      });
      // Back to the true picture, so the next frame changes only one thing.
      push(`Taking every level through the line misses nothing. The last of each row is seen, even when it hangs on the left side.`, 8);
    }
  }

  tag = null;
  note = null;
  band = null;
  if (practice) {
    const end = turns[turns.length - 1];
    push(
      turns.length < seen.length
        ? `Done. The answer is ${showList(seen.map(val))}. Right turns only would have ended at ${val(end)}: that is the Right Turn Trap.`
        : `Done. The answer is ${showList(seen.map(val))}. You picked the last of every row.`,
    );
    return frames;
  }
  push(`The line is empty, so every level has been taken. The answer is ${showList(seen.map(val))}.`, 13);
  push(`Time: O(n). Each of the ${tree.length} nodes joined the line once and left it once. Compare that with the slow way.`, 7, { ...snap(), counter: { label: "nodes visited", value: tree.length } });
  push(`Space: O(n). The line holds about one level at a time. Here it never held more than ${widest.length}, but a wide tree can have half its nodes in one level.`, 2, {
    ...snap(),
    tones: tree.map((node) => (widest.includes(node.id) ? "window" : "faded")),
    strips: [lineStrip(tree, widest), seenStrip(tree, seen), blank.strips[2]],
  });
  return frames;
}

function readTree(input: string): TreeShapeNode[] {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
}

export const binaryTreeRightSideViewStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-199"],
  pattern: "Tree BFS",
  trigger: "a tree looked at from one side, and you are asked which node can be seen on each level",
  insight: "Take the tree level by level through a waiting line. Count the line before each row: the last of that row to leave the front is the one seen from the right.",
  metaphor: {
    name: "The waiting line, seen from the right",
    legend: "line = the queue · front = poll() · back = add() · count = line.size() read once · last of its row = i == count - 1 · seen list = seen",
    terms: ["line", "front", "back", "row", "seen", "hidden"],
  },
  traps: [{ name: TRAP, rule: "Never walk down by right children only. When the right side ends early, deeper nodes on the left side are seen. Take every level, and keep the last node of each." }],
  template: [
    "line = [root]",
    "while (line is not empty) {",
    "    count = line.size();              // fix it before anyone joins",
    "    repeat count times {",
    "        node = line.poll();",
    "        if this is the last of the count: keep node;    // first of the count for the left side",
    "        add node's children to the back of the line;",
    "    }",
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
    { label: "[1,2,3,null,5,null,4]", input: "[1,2,3,null,5,null,4]", expected: "[1,3,4]" },
    { label: "Right side ends early", input: "[1,2,3,4]", expected: "[1,3,4]", note: "Tricky: 4 hangs on the left side, yet it is seen" },
    { label: "Only left children", input: "[1,2,null,3]", expected: "[1,2,3]", note: "Nothing on the right at all" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-102", title: "Binary Tree Level Order Traversal" },
    { slug: "lc-103", title: "Binary Tree Zigzag Level Order Traversal" },
  ],
  answer: (input) => {
    const tree = parseTree(input);
    return showList(solve(tree).map((id) => tree[id].val));
  },
  frames: (input) => {
    const tree = readTree(input);
    const answer = solve(tree);
    const blank = blankTreeState(tree, STRIPS);
    return [
      ...pictureFrames(tree, answer),
      ...slowFrames(tree),
      ...insightFrames(tree),
      ...solutionFrames(tree),
      ...solutionFrames(parseTree(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: the last one of each row to leave the line is the one seen. Say the idea in your head first, then reveal the card.",
        state: { ...blank, tones: tree.map((node) => (answer.includes(node.id) ? "done" : "faded")), strips: [lineStrip(tree, []), seenStrip(tree, answer), blank.strips[2]] },
      },
    ];
  },
  View: TreeStoryView,
};
