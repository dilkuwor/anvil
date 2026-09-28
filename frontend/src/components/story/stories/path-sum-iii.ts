import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState, type TreeStrip } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type NoteFrame = StoryFrame<TreeStoryState>;

/** Fresh input for the "your turn" run: two brothers with the same running total, so a leftover note would count twice. */
const PRACTICE = "[1,-1,-1]\n0";
const FALLBACK = "[1,-2,-3,1,3,-2,null,-1]\n-1";

const TRAP = "The Leftover Note Trap";

const CODE = [
  "int visit(TreeNode node, long running) {",
  "    if (node == null) return 0;",
  "    running += node.val;",
  "    int found = notebook.getOrDefault(running - target, 0);",
  "    notebook.merge(running, 1, Integer::sum);",
  "    found += visit(node.left, running) + visit(node.right, running);",
  "    notebook.merge(running, -1, Integer::sum);",
  "    return found;",
  "}",
  "notebook.put(0L, 1);",
  "return visit(root, 0L);",
];

type Input = { tree: TreeShapeNode[]; target: number };

function readInput(input: string): Input {
  const [treeLine = "[]", targetLine = "0"] = input.split("\n");
  return { tree: parseTree(treeLine), target: Number(targetLine.trim()) };
}

/** Independent solver: every start, every downward end. Also counts the additions it makes. */
function solveEveryStart({ tree, target }: Input): { paths: { start: number; end: number }[]; additions: number; fromTop: number } {
  const paths: { start: number; end: number }[] = [];
  let additions = 0;
  let fromTop = 0;
  for (const start of tree) {
    const down = (id: number | null, sum: number) => {
      if (id === null) return;
      additions++;
      const total = sum + tree[id].val;
      if (total === target) paths.push({ start: start.id, end: id });
      down(tree[id].left, total);
      down(tree[id].right, total);
    };
    down(start.id, 0);
    if (start.id === 0) fromTop = additions;
  }
  return { paths, additions, fromTop };
}

/** Nodes from `start` down to `end`. */
function chain(tree: TreeShapeNode[], start: number, end: number): number[] {
  const out: number[] = [];
  for (let at: number | null = end; at !== null; at = tree[at].parent) {
    out.unshift(at);
    if (at === start) break;
  }
  return out;
}

function words(tree: TreeShapeNode[], ids: number[]): string {
  return ids.map((id) => tree[id].val).join(", ");
}

type Note = { key: number; owner: number };

function notebookStrip(notes: Note[], paint: (note: Note, index: number) => CellTone = () => "idle"): TreeStrip {
  return { label: "notebook", items: notes.map((note, index) => ({ text: String(note.key), tone: paint(note, index) })) };
}

function pictureFrames(input: Input): NoteFrame[] {
  const { tree, target } = input;
  const blank = { ...blankTreeState(tree, 1), note: { text: `target: ${target}`, tone: "accent" as const } };
  const { paths } = solveEveryStart(input);
  const example = paths.find((path) => path.start !== 0 && path.start !== path.end) ?? paths[0];
  const frames: NoteFrame[] = [{ scene: "picture", caption: `This is a tree of numbers. Some are negative. We look for paths that add up to ${target}.`, state: blank }];
  if (example) {
    const ids = chain(tree, example.start, example.end);
    frames.push({
      scene: "picture",
      caption: `A path only goes down, from a parent to its child. It may start and end at any node. ${words(tree, ids)} is one: it adds up to ${target}.`,
      state: { ...blank, tones: tree.map((node) => (ids.includes(node.id) ? "done" : "idle")), edges: tree.map((node): TreeEdgeMark => ({ tone: ids.includes(node.id) && node.id !== example.start ? "report" : "idle" })) },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: count every downward path that adds up to ${target}. Here there are ${paths.length}.`,
    state: { ...blank, tones: tree.map((node) => (paths.some((path) => path.end === node.id) ? "hit" : "idle")), note: { text: `paths: ${paths.length}`, tone: "teal" } },
  });
  return frames;
}

function slowFrames(input: Input): NoteFrame[] {
  const { tree } = input;
  const blank = blankTreeState(tree, 1);
  const { additions, fromTop, paths } = solveEveryStart(input);
  const topPaths = paths.filter((path) => path.start === 0).length;
  return [
    {
      scene: "slow",
      caption: "The slow way: start at every node in turn. From each start, walk down every branch below it and add up as you go.",
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : "idle")), counter: { label: "additions", value: 0 } },
    },
    {
      scene: "slow",
      caption: `Starting at the top alone takes ${fromTop} additions and finds ${topPaths} ${topPaths === 1 ? "path" : "paths"}. Then the next start adds most of the same nodes again.`,
      state: { ...blank, tones: tree.map(() => "window"), counter: { label: "additions", value: fromTop } },
    },
    {
      scene: "slow",
      caption: `In all, ${additions} additions for ${tree.length} nodes. A node is added again for every node above it: O(n·h) time.`,
      state: { ...blank, tones: tree.map(() => "faded"), counter: { label: "additions", value: additions } },
    },
  ];
}

/** Walk the real algorithm once, to find the first match that starts below the top (for the insight). */
function firstInnerMatch({ tree, target }: Input): { end: number; start: number; key: number; running: number } | null {
  const path: number[] = [];
  const totals: number[] = [];
  let found: { end: number; start: number; key: number; running: number } | null = null;
  const visit = (id: number | null, running: number) => {
    if (id === null || found) return;
    const total = running + tree[id].val;
    path.push(id);
    totals.push(total);
    const index = totals.slice(0, -1).indexOf(total - target);
    if (index >= 0) found = { end: id, start: path[index + 1], key: total - target, running: total };
    visit(tree[id].left, total);
    visit(tree[id].right, total);
    path.pop();
    totals.pop();
  };
  visit(tree.length > 0 ? 0 : null, 0);
  return found;
}

function insightFrames(input: Input): NoteFrame[] {
  const { tree, target } = input;
  const blank = blankTreeState(tree, 1);
  const match = firstInnerMatch(input);
  const frames: NoteFrame[] = [
    {
      scene: "insight",
      caption: "Picture carrying a notebook down the tree. At each node we write a note: the running total, the sum from the top down to here.",
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : "idle")), strips: [notebookStrip([{ key: 0, owner: -1 }])], tag: { id: 0, text: `running ${tree[0].val}` } },
    },
  ];
  if (!match) return frames;
  const { end, start, key, running } = match;
  const ids = chain(tree, start, end);
  const above = chain(tree, 0, tree[start].parent!);
  const notes: Note[] = [{ key: 0, owner: -1 }];
  let sum = 0;
  for (const id of above) notes.push({ key: (sum += tree[id].val), owner: id });
  frames.push({
    scene: "insight",
    caption: `At ${tree[end].val} the running total is ${running}. A path ending here adds up to ${target} when ${running} minus ${target}, which is ${key}, is a note above us.`,
    state: {
      ...blank,
      tones: tree.map((node) => (node.id === end ? "edge" : above.includes(node.id) ? "window" : "idle")),
      strips: [notebookStrip(notes)],
      tag: { id: end, text: `running ${running}` },
    },
  });
  frames.push({
    scene: "insight",
    caption: `The note ${key} was written at ${tree[tree[start].parent!].val}, higher up. Everything after it, ${words(tree, ids)}, adds up to ${target}. One look in the notebook finds it.`,
    state: {
      ...blank,
      tones: tree.map((node) => (ids.includes(node.id) ? "done" : above.includes(node.id) ? "window" : "idle")),
      strips: [notebookStrip(notes, (note) => (note.key === key && note.owner === tree[start].parent ? "hit" : "idle"))],
      tag: { id: end, text: `running ${running}` },
    },
  });
  return frames;
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh input: the reader says where each
 * found path starts, and what happens to a note when we leave its node.
 */
function solutionFrames(input: Input, scene: SceneId = "solution", practice = false): NoteFrame[] {
  const { tree, target } = input;
  const blank = blankTreeState(tree, 1);
  const frames: NoteFrame[] = [];
  const notes: Note[] = [{ key: 0, owner: -1 }];
  const written: Note[] = [{ key: 0, owner: -1 }];
  const path: number[] = [];
  const done = new Set<number>();
  let found = 0;
  let tallest = 1;
  let here: number | null = null;
  let running = 0;
  const asked = { start: false, leave: false };
  let toldTrap = practice;

  const snap = (paint?: (note: Note, index: number) => CellTone, extra: Note[] = []): TreeStoryState => ({
    ...blank,
    tones: tree.map((node) => (node.id === here ? "edge" : path.includes(node.id) ? "window" : done.has(node.id) ? "faded" : "idle")),
    edges: tree.map((node): TreeEdgeMark => ({ tone: path.includes(node.id) && node.id !== 0 ? "path" : "idle" })),
    strips: [notebookStrip([...notes, ...extra], paint)],
    tag: here === null ? null : { id: here, text: `running ${running}` },
    note: { text: `paths found: ${found}`, tone: "teal" },
  });
  const push = (caption: string, codeLine: number | undefined, state: TreeStoryState) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  const startQuiz = (start: number, end: number): StoryQuiz => {
    const feedback: Record<number, string> = {};
    const onPath = chain(tree, 0, end);
    for (const id of onPath) {
      if (id === start) continue;
      const ids = chain(tree, id, end);
      let sum = 0;
      for (const step of ids) sum += tree[step].val;
      feedback[id] = `Starting there, the path adds up to ${sum}, not ${target}.`;
    }
    return {
      kind: "cell",
      cells: tree.length,
      question: `A note matched, so a path ends at ${tree[end].val}. Where does that path start? Click its first node.`,
      answer: start,
      feedback,
      otherwise: `A path only goes down to ${tree[end].val}, so it starts on the way from the top to ${tree[end].val}.`,
      why: "The path starts just below the node that wrote the matching note. The note 0 belongs above the top.",
    };
  };

  if (practice) push(`Your turn, on a new tree with target ${target}. The notebook starts with the note 0. You say where paths start and what happens to notes.`, undefined, snap());
  else push("The notebook starts with one note: 0. It stands for the empty start above the top node.", 9, snap());

  const visit = (id: number | null, from: number) => {
    if (id === null) return;
    const node = tree[id];
    here = id;
    path.push(id);
    running = from + node.val;
    const key = running - target;
    const matches = notes.filter((note) => note.key === key);
    const stale = written.filter((note) => note.key === key && note.owner !== -1 && !notes.includes(note));
    const leaf = node.left === null && node.right === null;

    if (id === 0 && !practice) {
      push(`Start at the top node ${node.val}. The running total is ${running}.`, 2, snap());
    }
    const lead = id === 0 && !practice ? "" : `${id === 0 ? "Start at" : "Step down to"} ${node.val}: running ${running}. `;
    const matchPaint = (note: Note): CellTone => (matches.includes(note) ? "hit" : "idle");
    if (matches.length === 0) {
      push(`${lead}Look for ${running} minus ${target}, which is ${key}. No such note, so no path ends here.`, 3, snap());
    } else {
      const lookup = push(
        `${lead}Look for ${running} minus ${target}, which is ${key}. ${matches.length === 1 ? "The note is there" : `It is there ${matches.length} times`}, so ${matches.length === 1 ? "a path ends" : "paths end"} here.`,
        3,
        snap(matchPaint),
      );
      const starts = matches.map((note) => (note.owner === -1 ? 0 : path[path.indexOf(note.owner) + 1]));
      if (matches.length === 1 && (practice || !asked.start)) {
        asked.start = true;
        lookup.quiz = startQuiz(starts[0], id);
      }
      found += matches.length;
      const ids = chain(tree, starts[0], id);
      push(
        matches.length === 1 ? `The path ${words(tree, ids)} adds up to ${target}. Paths found: ${found}.` : `${matches.length} paths end here at once. Paths found: ${found}.`,
        3,
        { ...snap(matchPaint), tones: tree.map((other) => (ids.includes(other.id) ? "done" : path.includes(other.id) ? "window" : done.has(other.id) ? "faded" : "idle")) },
      );
    }
    if (stale.length > 0 && !toldTrap) {
      toldTrap = true;
      const ghost = stale[0];
      push(`${TRAP}: had we kept the note ${ghost.key} from ${tree[ghost.owner].val}, it would match too. But ${tree[ghost.owner].val} is not above us, so that path does not exist.`, 6, {
        ...snap((note) => (note === ghost ? "miss" : matchPaint(note)), [ghost]),
        tones: tree.map((other) => (other.id === ghost.owner ? "miss" : other.id === here ? "edge" : path.includes(other.id) ? "window" : done.has(other.id) ? "faded" : "idle")),
        note: { text: "✕ not above us", tone: "coral" },
      });
    }

    const note = { key: running, owner: id };
    notes.push(note);
    written.push(note);
    tallest = Math.max(tallest, notes.length);
    if (leaf && !practice) {
      push(`${node.val} has no children. Its note ${running} is written, then erased at once as we go back up.`, 4, snap((item) => (item === note ? "window" : "idle")));
      notes.pop();
    } else {
      push(`Write the note ${running} in the notebook.`, 4, snap((item) => (item === note ? "window" : "idle")));
      const mine = running;
      visit(node.left, mine);
      visit(node.right, mine);
      here = id;
      running = mine;
      if (practice || !asked.leave) {
        asked.leave = true;
        const leaving = push(`Leave ${node.val} and go back up.`, 6, snap((item) => (item === note ? "window" : "idle")));
        leaving.quiz = {
          kind: "choice",
          question: `We leave ${node.val}. What happens to its note ${running}?`,
          options: ["Erase it", "Keep it for the next branch"],
          answer: 0,
          why: `After we leave ${node.val}, it is not above anyone we visit next. Its note would only cause false matches.`,
        };
        notes.pop();
        push(`The note ${running} is erased. ${node.val} is not above the nodes we visit next.`, 6, snap());
      } else {
        notes.pop();
        push(`Leave ${node.val} and erase its note ${running}.`, 6, snap());
      }
    }
    path.pop();
    done.add(id);
    here = null;
  };
  visit(tree.length > 0 ? 0 : null, 0);

  here = null;
  const finalState: TreeStoryState = { ...snap(), tones: tree.map(() => "hit") };
  if (practice) {
    push(`Done. The answer is ${found}. You erased every note on the way up, so the Leftover Note Trap never caught you.`, undefined, finalState);
    return frames;
  }
  push(`Every node is visited and the notebook is back to its first note. The answer is ${found}.`, 10, finalState);
  push(`Time: O(n). Each of the ${tree.length} nodes did one addition, one look, one write and one erase.`, 5, { ...finalState, counter: { label: "nodes visited", value: tree.length } });
  push(`Space: O(h), where h is the height. The notebook only holds notes for the nodes above us, plus the 0. Here it never held more than ${tallest}.`, 4, finalState);
  return frames;
}

function readUsable(input: string): Input {
  const parsed = readInput(input);
  return parsed.tree.length > 0 ? parsed : readInput(FALLBACK);
}

export const pathSumIIIStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-437"],
  pattern: "Prefix sum on a tree",
  trigger: "count the downward paths in a tree that add up to a target, where a path may start and end at any node",
  insight: "Carry a running total down from the top. A path ending here hits the target when running minus target is a note written above you. Erase your note on the way back up.",
  metaphor: {
    name: "The running notebook, carried down",
    legend: "running = the sum from the top to here · note = a key in the map · notebook = the map of running totals above us",
    terms: ["notebook", "note", "running"],
  },
  traps: [{ name: TRAP, rule: "Erase a node's note when you leave it. A leftover note belongs to another branch, not to the nodes above you, so matching it counts a path that does not exist." }],
  template: [
    "notebook = {0: 1}",
    "visit(node, running):",
    "    running += node.val;   count += notebook[running - target];",
    "    write running;   visit children;   erase running;   // erase on the way back up",
  ],
  complexity: {
    slow: "O(n·h)",
    time: "O(n)",
    timeWhy: "each node adds once, looks once, writes once and erases once",
    space: "O(h)",
    spaceWhy: "the notebook only holds the notes of the nodes above us",
  },
  code: CODE,
  examples: [
    { label: "[1,-2,-3,1,3,-2,null,-1], target -1", input: "[1,-2,-3,1,3,-2,null,-1]\n-1", expected: "4", note: "Two branches share running totals" },
    { label: "[10,5,-3,3,2,null,11], target 8", input: "[10,5,-3,3,2,null,11]\n8", expected: "2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-560", title: "Subarray Sum Equals K" },
    { slug: "lc-112", title: "Path Sum" },
  ],
  answer: (input) => String(solveEveryStart(readInput(input)).paths.length),
  frames: (input) => {
    const parsed = readUsable(input);
    const solution = solutionFrames(parsed);
    const remembered = solution.find((frame) => frame.caption.startsWith("The path ")) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(parsed),
      ...slowFrames(parsed),
      ...insightFrames(parsed),
      ...solution,
      ...solutionFrames(readInput(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a running total carried down, one look in the notebook, an erase on the way up. Say the idea in your head first, then reveal the card.",
        state: { ...remembered.state },
      },
    ];
  },
  View: TreeStoryView,
};
