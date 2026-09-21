import type { CellTone } from "@/components/learn/viz/primitives";

import { TreeStoryView, blankTreeState, listWords, parseTree, type TreeEdgeMark, type TreeShapeNode, type TreeStoryState } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type WaveFrame = StoryFrame<TreeStoryState>;

/** Fresh tree for the "your turn" run. Both answers lie through the node above the target, so it reaches the trap. */
const PRACTICE = "[8,3,9,1,6,null,null,null,null,4,7]; target=6; k=2";
const FALLBACK = "[3,5,1,6,2,null,null,7,4]; target=5; k=2";

const TRAP = "The One-Way Trap";

const CODE = [
  "List<Integer> distanceK(TreeNode root, int target, int k) {",
  "    Map<TreeNode, TreeNode> parents = new HashMap<>();",
  "    TreeNode start = link(root, null, target, parents);",
  "    List<Integer> out = new ArrayList<>();",
  "    if (start == null) return out;",
  "    Set<TreeNode> seen = new HashSet<>();",
  "    Queue<TreeNode> queue = new ArrayDeque<>();",
  "    queue.add(start);",
  "    seen.add(start);",
  "    int distance = 0;",
  "    while (!queue.isEmpty()) {",
  "        int size = queue.size();",
  "        if (distance == k) {",
  "            for (TreeNode node : queue) out.add(node.val);",
  "            return out;",
  "        }",
  "        for (int i = 0; i < size; i++) {",
  "            TreeNode node = queue.poll();",
  "            for (TreeNode next : new TreeNode[] { node.left, node.right, parents.get(node) }) {",
  "                if (next != null && seen.add(next)) queue.add(next);",
  "            }",
  "        }",
  "        distance++;",
  "    }",
  "    return out;",
  "}",
  "",
  "TreeNode link(TreeNode node, TreeNode parent, int target, Map<TreeNode, TreeNode> parents) {",
  "    if (node == null) return null;",
  "    parents.put(node, parent);",
  "    if (node.val == target) return node;",
  "    TreeNode left = link(node.left, node, target, parents);",
  "    TreeNode right = link(node.right, node, target, parents);",
  "    return left != null ? left : right;",
  "}",
];
const LINE = { link: 2, start: 7, check: 12, collect: 13, poll: 17, look: 18, add: 19, step: 22, empty: 24, put: 29, found: 30, rest: 32 };

/** Three strips, always: the notes, the wave, and everything the wave has touched. */
const STRIPS = 3;

type Query = { tree: TreeShapeNode[]; target: number; k: number };

/** "[3,5,1]; target=5; k=2" → the tree, the id of the target node, and k. */
function readQuery(input: string): Query | null {
  const [treeText = "", ...rest] = input.split(";");
  const tree = parseTree(treeText);
  const tail = rest.join(";");
  const targetMatch = tail.match(/target\s*=\s*(-?\d+)/);
  const kMatch = tail.match(/k\s*=\s*(\d+)/);
  const target = targetMatch ? tree.findIndex((node) => node.val === Number(targetMatch[1])) : -1;
  return tree.length > 0 && target >= 0 && kMatch ? { tree, target, k: Number(kMatch[1]) } : null;
}
const readOrFallback = (input: string): Query => readQuery(input) ?? (readQuery(FALLBACK) as Query);

/** From a node up to the top, the node itself first. */
function wayUp(tree: TreeShapeNode[], id: number): number[] {
  const way: number[] = [];
  for (let at: number | null = id; at !== null; at = tree[at].parent) way.push(at);
  return way;
}

/** The way between two nodes, and how many nodes were touched to find it. */
function wayBetween(tree: TreeShapeNode[], from: number, to: number): { way: number[]; touched: number } {
  const upFrom = wayUp(tree, from);
  const upTo = wayUp(tree, to);
  const meet = upFrom.find((id) => upTo.includes(id)) ?? 0;
  return { way: [...upFrom.slice(0, upFrom.indexOf(meet) + 1), ...upTo.slice(0, upTo.indexOf(meet)).reverse()], touched: upFrom.length + upTo.length };
}

/** Independent solver: measure every node's own way to the target. No wave involved. */
function solve({ tree, target, k }: Query): number[] {
  return tree
    .filter((node) => wayBetween(tree, node.id, target).way.length - 1 === k)
    .sort((a, b) => a.val - b.val)
    .map((node) => node.id);
}

/** Any order is accepted; the story always writes the answer from small to large. */
function answerText(tree: TreeShapeNode[], ids: number[]): string {
  return `[${ids
    .map((id) => tree[id].val)
    .sort((a, b) => a - b)
    .join(",")}]`;
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

function wayEdges(tree: TreeShapeNode[], way: number[], tone: TreeEdgeMark["tone"]): TreeEdgeMark[] {
  return tree.map((node) => ({ tone: node.parent !== null && way.includes(node.id) && way.includes(node.parent) ? tone : "idle" }));
}

const lines = (count: number) => `${count} ${count === 1 ? "line" : "lines"}`;
const steps = (count: number) => `${count} ${count === 1 ? "step" : "steps"}`;

function pictureFrames(query: Query, answer: number[]): WaveFrame[] {
  const { tree, target, k } = query;
  const blank: TreeStoryState = { ...blankTreeState(tree, STRIPS), marks: [{ id: target, letter: "t" }] };
  const val = (id: number) => tree[id].val;
  const node = tree[target];
  const near = [node.left, node.right, node.parent].filter((id): id is number => id !== null);
  // The furthest node whose way to the target goes up first: it shows that distance is not only "below".
  const far = tree
    .filter((item) => !below(tree, target).includes(item.id) && item.id !== target)
    .map((item) => wayBetween(tree, target, item.id).way)
    .sort((a, b) => b.length - a.length)[0];
  const frames: WaveFrame[] = [
    { scene: "picture", caption: `This is a tree. The node ${val(0)} is at the top. One node is marked as the target: ${val(target)}.`, state: blank },
    {
      scene: "picture",
      caption: `Distance counts the lines you walk. ${listWords(near.map(val))} ${near.length === 1 ? "is" : "are"} 1 line from ${val(target)}.${node.parent !== null ? ` The node above it counts too.` : ""}`,
      state: { ...blank, tones: tree.map((item) => (near.includes(item.id) ? "hit" : "idle")), edges: tree.map((item) => ({ tone: (item.id === target && item.parent !== null) || item.parent === target ? "path" : "idle" })) },
    },
  ];
  if (far && far.length > 2) {
    frames.push({
      scene: "picture",
      caption: `A way may go up and then down again. From ${val(target)} to ${val(far[far.length - 1])} it goes ${listWords(far.map(val))}: ${lines(far.length - 1)}.`,
      state: { ...blank, tones: tree.map((item) => (far.includes(item.id) ? "window" : "idle")), edges: wayEdges(tree, far, "path") },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: every node exactly ${lines(k)} from the target. Here k is ${k}, and ${answer.length === 0 ? "no node is that far" : answer.length === 1 ? `that is ${val(answer[0])}` : `those are ${listWords(answer.map(val))}`}.`,
    state: { ...blank, tones: tree.map((item) => (answer.includes(item.id) ? "done" : "idle")) },
  });
  return frames;
}

/** The obvious way, really run: from every node, find its own way to the target and count the lines. */
function slowFrames(query: Query, answer: number[]): WaveFrame[] {
  const { tree, target, k } = query;
  const blank: TreeStoryState = { ...blankTreeState(tree, STRIPS), marks: [{ id: target, letter: "t" }] };
  const val = (id: number) => tree[id].val;
  let touched = 0;
  const measured = tree
    .filter((node) => node.id !== target)
    .map((node) => {
      const found = wayBetween(tree, node.id, target);
      touched += found.touched;
      return { id: node.id, way: found.way, touched };
    });
  // Show the two longest ways: they make the repeated walking visible.
  const shown = [...measured].sort((a, b) => b.way.length - a.way.length || a.id - b.id).slice(0, 2).sort((a, b) => a.touched - b.touched);
  const frames: WaveFrame[] = shown.map((item, index) => ({
    scene: "slow",
    caption:
      index === 0
        ? `The slow way: take one node, ${val(item.id)}, and find its own way to the target. It goes ${listWords(item.way.map(val))}: ${lines(item.way.length - 1)}.`
        : `Now take ${val(item.id)} and search for its way from scratch: ${listWords(item.way.map(val))}, ${lines(item.way.length - 1)}. Part of it was walked before.`,
    state: { ...blank, tones: tree.map((node) => (node.id === item.id ? "edge" : item.way.includes(node.id) ? "window" : "idle")), edges: wayEdges(tree, item.way, "path"), counter: { label: "nodes touched", value: item.touched } },
  }));
  frames.push({
    scene: "slow",
    caption: `After measuring from every node, ${answer.length === 0 ? `none is exactly ${lines(k)} away` : `${listWords(answer.map(val))} ${answer.length === 1 ? "is" : "are"} exactly ${lines(k)} away`}.`,
    state: { ...blank, tones: tree.map((node) => (answer.includes(node.id) ? "done" : "idle")), counter: { label: "nodes touched", value: touched } },
  });
  frames.push({
    scene: "slow",
    caption: `That touched ${touched} nodes for a tree of ${tree.length}, because every node walks its own way. On a tall thin tree this is O(n²) time.`,
    state: { ...blank, tones: tree.map(() => "faded"), counter: { label: "nodes touched", value: touched } },
  });
  return frames;
}

const noteText = (tree: TreeShapeNode[], id: number) => `${tree[id].val} ↑ ${tree[tree[id].parent ?? 0].val}`;

function insightFrames(query: Query, answer: number[]): WaveFrame[] {
  const { tree, target, k } = query;
  const blank: TreeStoryState = { ...blankTreeState(tree, STRIPS), marks: [{ id: target, letter: "t" }] };
  const val = (id: number) => tree[id].val;
  const node = tree[target];
  const kids = [node.left, node.right].filter((id): id is number => id !== null);
  const noted = tree.filter((item) => item.parent !== null && !below(tree, target).includes(item.id));
  const far = (id: number) => wayBetween(tree, target, id).way.length - 1;
  return [
    {
      scene: "insight",
      caption:
        node.parent !== null
          ? `A tree's lines only lead down. ${val(target)} knows ${kids.length > 0 ? `${listWords(kids.map(val))} below it` : "that nothing is below it"}, but it cannot see ${val(node.parent)} above it.`
          : `A tree's lines only lead down. Here the target is the top, so down is the only way. In most trees the target also has a node above it.`,
      state: {
        ...blank,
        tones: tree.map((item) => (kids.includes(item.id) ? "window" : item.id === node.parent ? "miss" : "idle")),
        edges: tree.map((item) => ({ tone: item.parent === target ? "path" : item.id === target && item.parent !== null ? "skipped" : "idle" })),
      },
    },
    {
      scene: "insight",
      caption: "So first, each node gets a note that names the node above it. With the notes, every line can be walked both ways.",
      state: { ...blank, edges: tree.map((item) => ({ tone: noted.some((other) => other.id === item.id) ? "report" : "idle" })), strips: [{ label: "notes", items: noted.map((item) => ({ text: noteText(tree, item.id), tone: "hit" as CellTone })) }, blank.strips[1], blank.strips[2]] },
    },
    {
      scene: "insight",
      caption: `Then a wave starts on the target and spreads one line per step, in every direction. After ${steps(k)} it stands on ${answer.length === 0 ? "nothing: no node is that far" : "the answer"}.`,
      state: { ...blank, tones: tree.map((item) => (far(item.id) === k ? "done" : far(item.id) < k ? "window" : "idle")), note: { text: `wave after ${steps(k)}`, tone: "accent" } },
    },
  ];
}

type Status = "dry" | "wave" | "here" | "passed";
const STATUS_TONE: Record<Status, CellTone> = { dry: "idle", wave: "window", here: "edge", passed: "hit" };

/**
 * The real algorithm: write the notes, then spread the wave one step at a time.
 * `practice` reuses it on a fresh tree, and the reader decides where the wave goes.
 */
function waveFrames(query: Query, scene: SceneId = "solution", practice = false): WaveFrame[] {
  const { tree, target, k } = query;
  const blank: TreeStoryState = { ...blankTreeState(tree, STRIPS), marks: [{ id: target, letter: "t" }] };
  const val = (id: number) => tree[id].val;
  const frames: WaveFrame[] = [];

  const status: Status[] = tree.map(() => "dry");
  const edges: TreeEdgeMark[] = tree.map(() => ({ tone: "idle" }));
  const parents = new Map<number, number | null>();
  const noteOrder: number[] = [];
  let queue: number[] = [];
  const seen: number[] = [];
  let note: TreeStoryState["note"] = null;
  let waveShown = false;

  const snap = (): TreeStoryState => ({
    ...blank,
    tones: tree.map((node) => STATUS_TONE[status[node.id]]),
    edges: edges.map((edge) => ({ ...edge })),
    note,
    strips: [
      { label: "notes", items: noteOrder.map((id) => ({ text: noteText(tree, id), tone: "idle" as CellTone })) },
      waveShown ? { label: "wave", items: queue.map((id) => ({ text: String(val(id)), tone: (status[id] === "here" ? "edge" : "window") as CellTone })) } : blank.strips[1],
      waveShown ? { label: "seen", items: seen.map((id) => ({ text: String(val(id)), tone: "hit" as CellTone })) } : blank.strips[2],
    ],
  });
  const push = (caption: string, codeLine: number, extra: { quiz?: StoryQuiz; state?: TreeStoryState } = {}) => {
    const frame: WaveFrame = { scene, caption, state: extra.state ?? snap() };
    if (!practice) frame.codeLine = codeLine;
    if (extra.quiz) frame.quiz = extra.quiz;
    frames.push(frame);
  };

  // Part one: the notes. Really the same walk as the code: it writes a note, stops at the target, and walks every other branch.
  const linkOrder: number[] = [];
  const link = (id: number | null, parent: number | null): number | null => {
    if (id === null) return null;
    parents.set(id, parent);
    linkOrder.push(id);
    if (id === target) return id;
    const left = link(tree[id].left, id);
    const right = link(tree[id].right, id);
    return left ?? right;
  };
  link(0, null);
  const write = (id: number) => {
    if (tree[id].parent === null) return;
    noteOrder.push(id);
    edges[id] = { tone: "report" };
  };
  const targetAt = linkOrder.indexOf(target);
  const hasBelow = below(tree, target).length > 0;
  if (target === 0) {
    push(
      practice
        ? `Your turn, on a new tree. The target ${val(target)} is the top node, so no notes are needed.`
        : `First the notes. The walk starts at the top node ${val(0)}, and that is the target already. Nothing is above it, so no note is needed.`,
      LINE.found,
    );
  } else if (practice) {
    linkOrder.forEach(write);
    push(`Your turn, on a new tree. The target is ${val(target)} and k is ${k}. The notes are already written, and you decide where the wave goes.`, LINE.link);
  } else {
    push(`First the notes. The walk starts at the top node ${val(0)}. Nothing is above it, so its note stays blank.`, LINE.put);
    const first = linkOrder[1];
    write(first);
    push(`The walk goes down to ${val(first)} and writes its note: above ${val(first)} is ${val(tree[first].parent ?? 0)}. Now this line can be walked both ways.`, LINE.put);
    const between = linkOrder.slice(2, targetAt + 1);
    if (between.length > 0) {
      between.forEach(write);
      push(`The walk goes on and writes a note at every node it enters, until it finds the target ${val(target)}.`, LINE.put);
    }
    push(
      hasBelow ? `${val(target)} is the target. The walk does not go below it: from the target, the wave will flow down by itself.` : `${val(target)} is the target, and it carries its note: above ${val(target)} is ${val(tree[target].parent ?? 0)}.`,
      LINE.found,
      { state: { ...snap(), tones: tree.map((node) => (node.id === target ? "edge" : "idle")) } },
    );
    const rest = linkOrder.slice(targetAt + 1);
    if (rest.length > 0) {
      rest.forEach(write);
      push(`The rest of the tree gets its notes the same way: ${listWords(rest.map(val))}.`, LINE.rest);
    }
  }

  // Part two: the wave.
  waveShown = true;
  queue = [target];
  seen.push(target);
  status[target] = "wave";
  let distance = 0;
  note = { text: `step ${distance} of ${k}`, tone: "accent" };
  push(`Now the wave. It starts on the target ${val(target)}, which is 0 steps away from itself. ${val(target)} is marked as seen.`, LINE.start);

  const asked = { up: false, back: false, stop: false };
  let trapShown = false;
  const missed = solve(query).filter((id) => !below(tree, target).includes(id) && id !== target);

  const upQuiz = (id: number, kids: number[]): StoryQuiz => {
    const parent = tree[id].parent ?? 0;
    const feedback: Record<number, string> = { [id]: `The wave is already on ${val(id)}. It is asking where to go next.` };
    for (const kid of kids) feedback[kid] = `${val(kid)} is below ${val(id)} and does get the wave. The question asks for the one other node.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `The wave steps from ${val(id)} ${kids.length > 0 ? `down to ${listWords(kids.map(val))}` : "and finds nothing below it"}. Which ${kids.length > 0 ? "other " : ""}node does it reach in this same step? Click it.`,
      answer: parent,
      feedback,
      otherwise: `No single line joins that node to ${val(id)}. The wave moves one line per step. Read the note that ${val(id)} carries.`,
      why: `The note at ${val(id)} names the node above it. A wave spreads in every direction, so it goes up as well as down.`,
    };
  };
  const backQuiz = (id: number, neighbours: number[], back: number): StoryQuiz => {
    const feedback: Record<number, string> = { [id]: `The wave is on ${val(id)} itself. Look at the nodes joined to it.` };
    for (const other of neighbours) if (other !== back) feedback[other] = `${val(other)} is still dry, so the wave does step onto it.`;
    return {
      kind: "cell",
      cells: tree.length,
      question: `The wave is on ${val(id)}. Lines join it to ${listWords(neighbours.map(val))}. One of them gets no wave from ${val(id)}. Click it.`,
      answer: back,
      feedback,
      otherwise: `That node is not joined to ${val(id)} by a line. Look at the seen list.`,
      why: `${val(back)} is on the seen list: the wave came from there. It never flows back, or it would go round for ever.`,
    };
  };
  const stopQuiz = (): StoryQuiz => ({
    kind: "choice",
    question: `The wave has taken ${steps(distance)}, and k is ${k}. What happens now?`,
    options: ["The wave takes one more step, to be safe", "Every node in the wave goes into the answer, and the search stops", "Every node on the seen list goes into the answer"],
    answer: 1,
    why: `The wave holds exactly the nodes that are ${steps(k)} from the target. The seen list also holds nearer nodes.`,
  });

  let result: number[] = [];
  while (queue.length > 0) {
    if (distance === k) {
      result = [...queue];
      break;
    }
    const size = queue.length;
    const level = [...queue];
    const quiet: number[] = [];
    const flushQuiet = () => {
      if (quiet.length === 0) return;
      push(
        quiet.length === 1
          ? `${val(quiet[0])} has the wave next. Every node joined to it is already seen, so it passes nothing on.`
          : `${listWords(quiet.map(val))} have the wave next. Every node joined to them is already seen, so they pass nothing on.`,
        LINE.add,
      );
      quiet.length = 0;
    };
    for (let i = 0; i < size; i++) {
      const id = queue[0];
      const node = tree[id];
      const looks = [node.left, node.right, parents.get(id) ?? null].filter((next): next is number => next !== null);
      const fresh = looks.filter((next) => !seen.includes(next));
      const back = looks.filter((next) => seen.includes(next));
      const kids = [node.left, node.right].filter((next): next is number => next !== null);
      const up = parents.get(id) ?? null;

      if (fresh.length === 0) {
        queue.shift();
        status[id] = "passed";
        quiet.push(id);
        continue;
      }
      flushQuiet();

      status[id] = "here";
      const goesUp = up !== null && fresh.includes(up);
      const askUp = id === target && goesUp && (practice || !asked.up);
      const askBack = !askUp && back.length === 1 && (practice || !asked.back);
      if (askUp || askBack || !practice) {
        if (askUp) asked.up = true;
        if (askBack) asked.back = true;
        push(`${val(id)} has the wave now. It will pass the wave along the lines that touch it.`, LINE.poll, askUp ? { quiz: upQuiz(id, kids) } : askBack ? { quiz: backQuiz(id, looks, back[0]) } : {});
      }

      queue.shift();
      for (const next of fresh) {
        seen.push(next);
        queue.push(next);
        status[next] = "wave";
      }
      status[id] = "passed";
      const downWords = kids.filter((kid) => fresh.includes(kid));
      const parts: string[] = [];
      if (downWords.length > 0) parts.push(`down to ${listWords(downWords.map(val))}`);
      if (goesUp && up !== null) parts.push(`up its note to ${val(up)}`);
      const backWords = back.length > 0 ? ` ${listWords(back.map(val))} ${back.length === 1 ? "is" : "are"} already seen, so the wave does not flow back.` : "";
      const noNote = up === null && node.parent !== null ? ` It carries no note, so nothing goes up.` : "";
      push(`${val(id)} passes the wave ${parts.join(" and ")}.${backWords}${noNote}`, LINE.add);

      if (id === target && goesUp && up !== null && (practice || !trapShown)) {
        trapShown = true;
        const under = below(tree, target);
        push(
          `${TRAP}: a wave that only flows down never reaches ${val(up)}.${missed.length > 0 ? ` It would miss ${listWords(missed.map(val))}, and the answer would be wrong.` : " Everything above the target would stay dry."}`,
          LINE.look,
          {
            state: {
              ...snap(),
              tones: tree.map((item) => (item.id === target || under.includes(item.id) ? "window" : missed.includes(item.id) || item.id === up ? "miss" : "faded")),
              edges: tree.map((item) => ({ tone: item.id === target ? "skipped" : under.includes(item.id) ? "path" : "idle" })),
              note: { text: "✕ the wave never went up", tone: "coral" },
            },
          },
        );
      }
    }
    flushQuiet();
    distance++;
    note = { text: `step ${distance} of ${k}`, tone: "accent" };
    if (queue.length === 0) {
      push(`That was step ${distance}, and the wave has died out: no dry node was left to step onto.`, LINE.step);
      break;
    }
    const last = distance === k;
    const askStop = last && (practice || !asked.stop);
    if (askStop) asked.stop = true;
    push(
      `That was step ${distance}. The wave has left ${listWords(level.map(val))}, and now it holds ${listWords(queue.map(val))}.`,
      last ? LINE.check : LINE.step,
      askStop ? { quiz: stopQuiz() } : {},
    );
  }

  const text = answerText(tree, result);
  const end: TreeStoryState = {
    ...snap(),
    tones: tree.map((node) => (result.includes(node.id) ? "done" : "faded")),
    note: { text: `${steps(k)} from ${val(target)}`, tone: "teal" },
    strips: [snap().strips[0], { label: "wave", items: result.map((id) => ({ text: String(val(id)), tone: "done" as CellTone })) }, snap().strips[2]],
  };
  push(
    result.length === 0
      ? `The wave died out before it took ${steps(k)}. No node is that far away, so the answer is ${text}.`
      : `The wave has taken ${steps(k)}, so it stands on exactly the right nodes. ${practice ? "Done. Written" : "Written"} from small to large, the answer is ${text}.`,
    result.length === 0 ? LINE.empty : LINE.collect,
    { state: end },
  );
  if (practice) return frames;

  frames.push({
    scene,
    caption: `Time: O(n). One walk wrote the notes, and the wave stepped onto each node at most once. Here it touched ${seen.length} of the ${tree.length} nodes.`,
    codeLine: LINE.add,
    state: { ...end, counter: { label: "nodes the wave touched", value: seen.length } },
  });
  frames.push({
    scene,
    caption: `Space: O(n). The notes and the seen list can each hold every node of the tree. Here there are ${noteOrder.length} notes and ${seen.length} seen nodes.`,
    codeLine: 1,
    state: { ...end, strips: [{ label: "notes", items: noteOrder.map((id) => ({ text: noteText(tree, id), tone: "window" as CellTone })) }, end.strips[1], { label: "seen", items: seen.map((id) => ({ text: String(val(id)), tone: "window" as CellTone })) }] },
  });
  return frames;
}

export const allNodesDistanceKStory: ProblemStory<TreeStoryState> = {
  slugs: ["lc-863"],
  pattern: "Tree BFS",
  trigger: "a tree, one marked node in it, and you are asked for every node a fixed number of lines away, in any direction",
  insight: "Give every node a note naming the node above it, so lines work both ways. Then let a wave spread from the target, one line per step. After k steps the wave stands on the answer.",
  metaphor: {
    name: "Notes and the wave",
    legend: "note = parents.get(node) · wave = queue · step = distance · seen = the seen set",
    terms: ["wave", "note", "step", "seen"],
  },
  traps: [{ name: TRAP, rule: "A tree's lines only lead down. Record each node's parent first, so the wave can also go up; the seen list stops it flowing back." }],
  template: [
    "walk the tree once: parents[node] = the node above it",
    "wave = [target];  seen = {target}",
    "repeat k times:",
    "    next wave = every unseen neighbour (left, right, parent) of the wave",
    "answer = whatever the wave holds now",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "one walk writes the notes; the wave steps onto each node at most once",
    space: "O(n)",
    spaceWhy: "the notes and the seen list can each hold every node",
  },
  code: CODE,
  examples: [
    { label: "target 5, k = 2", input: "[3,5,1,6,2,null,null,7,4]; target=5; k=2", expected: "[1,4,7]", note: "Tricky: 1 is only reached by going up" },
    { label: "target 6, k = 3", input: "[3,5,1,6,2,0,8]; target=6; k=3", expected: "[1]", note: "Up twice, then down" },
    { label: "target 1, k = 2", input: "[1,2,3,4,5]; target=1; k=2", expected: "[4,5]", note: "The target is the top" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-102", title: "Binary Tree Level Order Traversal" },
    { slug: "lc-236", title: "Lowest Common Ancestor of a Binary Tree" },
    { slug: "lc-199", title: "Binary Tree Right Side View" },
  ],
  answer: (input) => {
    const query = readOrFallback(input);
    return answerText(query.tree, solve(query));
  },
  frames: (input) => {
    const query = readOrFallback(input);
    const answer = solve(query);
    const solution = waveFrames(query);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(query, answer),
      ...slowFrames(query, answer),
      ...insightFrames(query, answer),
      ...solution,
      ...waveFrames(readOrFallback(PRACTICE), "card", true),
      { scene: "card", caption: "This is the picture to remember: notes that point up, and a wave that spreads k steps in every direction. Say the idea in your head first, then reveal the card.", state: remembered.state },
    ];
  },
  View: TreeStoryView,
};
