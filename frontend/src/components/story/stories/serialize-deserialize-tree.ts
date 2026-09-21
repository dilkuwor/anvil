import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyTrees3BuildView, blankBuildState, type BuildRow, type BuildState, type BuildStub } from "../agy-trees3-build-view";
import { parseTree, type TreeShapeNode } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type TapeFrame = StoryFrame<BuildState>;

/** Fresh tree for the "your turn" run. Its first empty spot comes early, so it reaches the trap. */
const PRACTICE = "[4,2,6,null,3]";
const FALLBACK = "[1,2,3,null,null,4,5]";

const TRAP = "The Missing Mark Trap";

const CODE = [
  "String serialize(TreeNode root) {",
  "    StringBuilder sb = new StringBuilder();",
  "    write(root, sb);",
  "    return sb.toString();",
  "}",
  "",
  "void write(TreeNode node, StringBuilder sb) {",
  '    if (node == null) { sb.append("#,"); return; }',
  '    sb.append(node.val).append(",");',
  "    write(node.left, sb);",
  "    write(node.right, sb);",
  "}",
  "",
  "TreeNode deserialize(String data) {",
  '    Queue<String> tape = new LinkedList<>(Arrays.asList(data.split(",")));',
  "    return read(tape);",
  "}",
  "",
  "TreeNode read(Queue<String> tape) {",
  "    String token = tape.poll();",
  '    if (token.equals("#")) return null;',
  "    TreeNode node = new TreeNode(Integer.parseInt(token));",
  "    node.left = read(tape);",
  "    node.right = read(tape);",
  "    return node;",
  "}",
];

/** Two rows, always: the tape, and one spare row for the slow way's copies and the trap's bad tape. */
const ROWS = 2;

function readTree(input: string): TreeShapeNode[] {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
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

/**
 * Independent round trip: level by level with a waiting line, not the node-first walk the story tells.
 * Writes the tree to text, forgets the tree, and builds a new one from the text alone.
 */
function roundTrip(tree: TreeShapeNode[]): string {
  const words: string[] = [];
  const line: (number | null)[] = [0];
  for (let at = 0; at < line.length; at++) {
    const id = line[at];
    words.push(id === null ? "null" : String(tree[id].val));
    if (id !== null) line.push(tree[id].left, tree[id].right);
  }
  const text = words.join(",");

  const tokens = text.split(",");
  const rebuilt: TreeShapeNode[] = [{ id: 0, val: Number(tokens[0]), left: null, right: null, parent: null, depth: 0 }];
  let next = 1;
  for (let at = 0; at < rebuilt.length && next < tokens.length; at++) {
    for (const side of ["left", "right"] as const) {
      const token = tokens[next++];
      if (token === undefined || token === "null") continue;
      rebuilt.push({ id: rebuilt.length, val: Number(token), left: null, right: null, parent: at, depth: rebuilt[at].depth + 1 });
      rebuilt[at][side] = rebuilt.length - 1;
    }
  }
  return levelText(rebuilt);
}

type Token = { text: string; node: number | null; parent: number | null; side: "left" | "right" };

/** The tape, in the order the walk writes it: a node, then its whole left side, then its whole right side. */
function tapeOf(tree: TreeShapeNode[]): Token[] {
  const tokens: Token[] = [];
  const walk = (id: number | null, parent: number | null, side: "left" | "right") => {
    tokens.push({ text: id === null ? "#" : String(tree[id].val), node: id, parent, side });
    if (id === null) return;
    walk(tree[id].left, id, "left");
    walk(tree[id].right, id, "right");
  };
  walk(0, null, "left");
  return tokens;
}

/**
 * A different tree that writes the same numbers in the same order. Found by changing the real tree, not typed:
 * flip an only child to the other side, or hang the top's right side under the end of its left side.
 */
function lookAlike(tree: TreeShapeNode[]): TreeShapeNode[] | null {
  const copy = tree.map((node) => ({ ...node }));
  const lonely = tapeOf(tree)
    .map((token) => token.node)
    .find((id) => id !== null && (tree[id].left === null) !== (tree[id].right === null));
  if (lonely !== undefined && lonely !== null) {
    const node = copy[lonely];
    [node.left, node.right] = [node.right, node.left];
    return copy;
  }
  const top = copy[0];
  if (top.left === null || top.right === null) return null;
  let end = top.left;
  while (copy[end].right !== null) end = copy[end].right as number;
  const moved = top.right;
  copy[end].right = moved;
  copy[moved].parent = end;
  top.right = null;
  const deepen = (id: number | null, depth: number) => {
    if (id === null) return;
    copy[id].depth = depth;
    deepen(copy[id].left, depth + 1);
    deepen(copy[id].right, depth + 1);
  };
  deepen(0, 0);
  return copy;
}

const depthOf = (tree: TreeShapeNode[]) => Math.max(0, ...tree.map((node) => node.depth));

function tapeRow(tokens: Token[], count: number, tone: (index: number) => CellTone, under: (index: number) => string | undefined = () => undefined, label = "tape"): BuildRow {
  return { label, cells: tokens.slice(0, count).map((token, index) => ({ text: token.text, tone: tone(index), under: under(index) })) };
}

function stubsFor(tokens: Token[], count: number, tone: BuildStub["tone"] = "idle"): BuildStub[] {
  return tokens
    .slice(0, count)
    .filter((token) => token.node === null && token.parent !== null)
    .map((token) => ({ parent: token.parent ?? 0, side: token.side, tone }));
}

function pictureFrames(tree: TreeShapeNode[], minDepth: number): TapeFrame[] {
  const blank: BuildState = { ...blankBuildState(tree, ROWS), minDepth };
  const unknown: BuildRow = { label: "text", cells: [{ text: "?  ?  ?", tone: "idle" }] };
  return [
    { scene: "picture", caption: `This is a tree. It lives in the computer's memory as ${tree.length} nodes joined by lines. The node ${tree[0].val} is at the top.`, state: blank },
    { scene: "picture", caption: "To save the tree in a file, or send it to another computer, it must first become one line of text. Lines between nodes cannot be sent.", state: { ...blank, tones: tree.map(() => "window"), rows: [unknown, blank.rows[1]] } },
    { scene: "picture", caption: "Later, someone who has only the text must build the tree again. The tree itself is gone by then.", state: { ...blank, shown: tree.map(() => false), rows: [unknown, blank.rows[1]] } },
    { scene: "picture", caption: "The goal: write the text, and read it back, so that exactly this tree returns. Same numbers, same shape. What the text looks like is up to you.", state: { ...blank, tones: tree.map(() => "done"), edges: tree.map(() => "teal"), rows: [unknown, blank.rows[1]] } },
  ];
}

/** The obvious way, really run: glue each token onto a plain Java string. A string cannot grow, so every glue copies all of it. */
function slowFrames(tree: TreeShapeNode[], tokens: Token[], minDepth: number): TapeFrame[] {
  const blank: BuildState = { ...blankBuildState(tree, ROWS), minDepth };
  let text = "";
  let copied = 0;
  const steps = tokens.map((token) => {
    copied += text.length + token.text.length + 1;
    text += `${token.text},`;
    return { copied, length: text.length };
  });
  const early = Math.min(2, tokens.length - 1);
  const written = (count: number): CellTone[] => tree.map((node) => (tokens.slice(0, count).some((token) => token.node === node.id) ? "hit" : "idle"));
  return [
    {
      scene: "slow",
      caption: `The slow way: walk the tree and glue each number, and a # for each empty spot, onto the end of a plain text. After ${early + 1} tokens the text is short.`,
      state: { ...blank, tones: written(early + 1), rows: [tapeRow(tokens, early + 1, () => "window", undefined, "text"), blank.rows[1]], counter: { label: "letters copied", value: steps[early].copied } },
    },
    {
      scene: "slow",
      caption: "But a Java text cannot grow. To add one token, the whole text so far is copied into a new, longer text. The longer it gets, the more each step copies.",
      state: { ...blank, tones: written(tokens.length), rows: [tapeRow(tokens, tokens.length, (index) => (index === tokens.length - 1 ? "edge" : "miss"), undefined, "text"), blank.rows[1]], counter: { label: "letters copied", value: copied } },
    },
    {
      scene: "slow",
      caption: `That copied ${copied} letters to write a text of only ${text.length}. For a big tree this is O(n²) time. The text itself is fine; the copying is the waste.`,
      state: { ...blank, tones: tree.map(() => "faded"), rows: [tapeRow(tokens, tokens.length, () => "faded", undefined, "text"), blank.rows[1]], counter: { label: "letters copied", value: copied } },
    },
  ];
}

function insightFrames(tree: TreeShapeNode[], tokens: Token[], minDepth: number): TapeFrame[] {
  const blank: BuildState = { ...blankBuildState(tree, ROWS), minDepth };
  const numbers = tokens.filter((token) => token.node !== null);
  return [
    {
      scene: "insight",
      caption: "Picture a tape that only grows at its end. Walk the tree in one fixed order: a node first, then its whole left side, then its whole right side. Write each number.",
      state: { ...blank, tones: tree.map(() => "hit"), rows: [tapeRow(numbers, numbers.length, () => "hit"), blank.rows[1]] },
    },
    {
      scene: "insight",
      caption: "Numbers alone do not say where a side ends. So every empty spot gets a mark on the tape too: #.",
      state: { ...blank, tones: tree.map(() => "hit"), stubs: stubsFor(tokens, tokens.length, "accent"), rows: [tapeRow(tokens, tokens.length, (index) => (tokens[index].node === null ? "edge" : "hit")), blank.rows[1]] },
    },
    {
      scene: "insight",
      caption: "To read the tape back, walk in the very same order. A number makes a node, and a mark closes a spot. So every token lands exactly where it came from.",
      state: { ...blank, tones: tree.map(() => "done"), edges: tree.map(() => "teal"), stubs: stubsFor(tokens, tokens.length), rows: [tapeRow(tokens, tokens.length, () => "done"), blank.rows[1]] },
    },
  ];
}

/**
 * Both halves of the real algorithm: write the tape, then read it back. One frame per change;
 * the two marks under a leaf are told together after the first time.
 * `practice` reuses it on a fresh tree, and the reader decides what is written and where each token lands.
 */
function tapeFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): TapeFrame[] {
  const tokens = tapeOf(tree);
  const other = lookAlike(tree);
  const minDepth = Math.max(depthOf(tree), other ? depthOf(other) : 0);
  const blank: BuildState = { ...blankBuildState(tree, ROWS), minDepth };
  const frames: TapeFrame[] = [];
  const val = (id: number) => tree[id].val;

  let written = 0;
  let reading = false;
  let readAt = 0;
  const shown = tree.map(() => true);
  const tones: CellTone[] = tree.map(() => "idle");
  let focusToken: number | null = null;
  let openSpot: BuildStub | null = null;

  const snap = (): BuildState => ({
    ...blank,
    shown: [...shown],
    tones: [...tones],
    edges: tree.map((node) => (reading && shown[node.id] ? "teal" : "idle")),
    stubs: [...stubsFor(tokens, reading ? readAt : written), ...(openSpot ? [openSpot] : [])],
    rows: [
      tapeRow(
        tokens,
        written,
        (index) => (reading ? (index < readAt ? "faded" : index === focusToken ? "edge" : "idle") : index === focusToken ? "edge" : "hit"),
        (index) => (reading && index === focusToken ? "read" : undefined),
      ),
      blank.rows[1],
    ],
  });
  const push = (caption: string, codeLine: number, extra: { quiz?: StoryQuiz; state?: BuildState } = {}) => {
    const frame: TapeFrame = { scene, caption, state: extra.state ?? snap() };
    if (!practice) frame.codeLine = codeLine;
    if (extra.quiz) frame.quiz = extra.quiz;
    frames.push(frame);
  };
  const spotWords = (token: Token) => (token.parent === null ? "the top" : `the ${token.side} of ${val(token.parent)}`);

  // Part one: write.
  const asked = { mark: false, hang: false, close: false };
  let trapShown = false;
  const markQuiz = (token: Token): StoryQuiz => ({
    kind: "choice",
    question: `The walk looks at ${spotWords(token)}. No node hangs there. What goes on the tape?`,
    options: ["Nothing. Only real nodes are written", "A mark, #, for the empty spot", `The number ${val(token.parent ?? 0)} once more`],
    answer: 1,
    why: "The reader of the tape cannot see the tree. Only a mark can tell them that this side ends here.",
  });

  push(practice ? `Your turn, on a new tree. First the tape is written: a node, then its left side, then its right side. You decide what goes on the tape.` : "First the tree is written down. The tape starts empty, and the walk starts at the top.", 1);

  let at = 0;
  while (at < tokens.length) {
    const token = tokens[at];
    if (token.node !== null) {
      const node = tree[token.node];
      const leaf = node.left === null && node.right === null;
      written = at + 1;
      focusToken = at;
      tones[node.id] = "edge";
      const canMerge = leaf && (trapShown || asked.mark) && !practice;
      if (canMerge) {
        written = at + 3;
        push(`The walk ${token.parent === null ? "starts" : "goes on"} to ${node.val} and writes it. Both spots under ${node.val} are empty, so two marks follow.`, 8);
        tones[node.id] = "hit";
        at += 3;
        continue;
      }
      push(`The walk ${token.parent === null ? "starts on" : "goes to"} ${node.val}${token.parent === null ? "" : `, on ${spotWords(token)},`} and writes its number at the end of the tape.`, 8);
      tones[node.id] = "hit";
      at++;
      continue;
    }
    // An empty spot.
    const first = !trapShown;
    const pairs = !first && tokens[at + 1]?.node === null && tokens[at + 1]?.parent === token.parent;
    focusToken = null;
    const ask = !asked.mark;
    if (ask) {
      asked.mark = true;
      push(`Next, the walk looks at ${spotWords(token)}.`, token.side === "left" ? 9 : 10, { quiz: markQuiz(token) });
    }
    written = at + (pairs ? 2 : 1);
    focusToken = at;
    push(
      pairs ? `Both spots under ${val(token.parent ?? 0)} are empty, so two marks go on the tape.` : `Nothing hangs on ${spotWords(token)}, so a mark goes on the tape: this side ends here.`,
      7,
    );
    if (first) {
      trapShown = true;
      const numbersOnly = tokens.filter((item) => item.node !== null);
      const base = snap();
      push(`${TRAP}: without marks the tape would hold only ${numbersOnly.map((item) => item.text).join(", ")}.${other ? " This other tree writes the very same numbers, so nobody could tell which tree was meant." : ""}`, 7, {
        state: {
          ...base,
          ...(other ? { tree: other, shown: other.map(() => true), tones: other.map(() => "miss" as CellTone), edges: other.map(() => "coral" as const), stubs: [] } : {}),
          rows: [base.rows[0], tapeRow(numbersOnly, numbersOnly.length, () => "miss", undefined, "no marks")],
          note: { text: "✕ same numbers, another tree", tone: "coral" },
        },
      });
    }
    at += pairs ? 2 : 1;
    if (practice && trapShown && at < tokens.length) {
      // Practice does not repeat the rest of the writing: the decision has been made once.
      const rest = tokens.slice(at);
      written = tokens.length;
      focusToken = null;
      for (const item of rest) if (item.node !== null) tones[item.node] = "hit";
      push(`The walk finishes in the same way. It writes ${rest.map((item) => item.text).join(" ")} on the tape: a mark for every empty spot.`, 8);
      break;
    }
  }

  focusToken = null;
  written = tokens.length;
  push(`The walk is over. The tape holds ${tokens.length} tokens: ${tree.length} numbers and ${tokens.length - tree.length} marks. This text is what gets saved or sent.`, 3);

  // Part two: read.
  reading = true;
  shown.fill(false);
  tones.fill("idle");
  push("Now the tree is gone, and only the tape is left. It is read from the front, one token at a time, in the same order it was written.", 14);

  const hangQuiz = (token: Token): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (const node of tree) {
      if (!shown[node.id] || node.id === token.parent) continue;
      const full = [node.left, node.right].every((kid, index) => {
        const side = index === 0 ? "left" : "right";
        return tokens.slice(0, readAt).some((item) => item.parent === node.id && item.side === side) || (kid !== null && shown[kid]);
      });
      feedback[node.id] = full ? `Both spots under ${node.val} are taken or closed already.` : `${node.val} does have an open spot, but a node lower down has an open spot that comes first.`;
    }
    return {
      kind: "cell",
      cells: tree.length,
      question: token.node === null ? "The next token is a mark, #. It closes one open spot. Under which node is that spot? Click the node." : `The next token is ${token.text}. Under which node does it hang? Click that node.`,
      answer: token.parent ?? 0,
      feedback,
      otherwise: "That node is not in the tree yet. Pick one that is already drawn.",
      why: `The reading walk is at ${val(token.parent ?? 0)}, filling its ${token.side} spot. The tape is read in the same order it was written.`,
    };
  };

  at = 0;
  while (at < tokens.length) {
    const token = tokens[at];
    readAt = at;
    focusToken = at;
    const isNode = token.node !== null;
    const leafPair = isNode && tokens[at + 1]?.node === null && tokens[at + 2]?.node === null && tokens[at + 1]?.parent === token.node && tokens[at + 2]?.parent === token.node;
    const canAsk = token.parent !== null && shown.filter(Boolean).length >= 2;
    const ask = canAsk && (isNode ? practice || !asked.hang : !asked.close);
    openSpot = token.parent === null || ask ? null : { parent: token.parent, side: token.side, tone: "accent", text: "?" };
    if (ask) {
      if (isNode) asked.hang = true;
      else asked.close = true;
      push(`The next token is read from the front of the tape: ${token.text}.`, 19, { quiz: hangQuiz(token) });
    } else if (!practice && at === 1) {
      push(`The next token is read from the front of the tape: ${token.text}.${token.parent === null ? "" : ` The open spot is on ${spotWords(token)}.`}`, 19);
    }
    openSpot = null;
    if (isNode) {
      const id = token.node ?? 0;
      shown[id] = true;
      tones[id] = "edge";
      const merge = leafPair && (asked.close || at > 2);
      readAt = at + (merge ? 3 : 1);
      focusToken = null;
      push(
        merge
          ? `${token.text} is a number, so a node is made. It hangs on ${spotWords(token)}. The next two tokens are marks: both spots under ${token.text} are closed.`
          : `${token.text} is a number, so a node is made. It ${token.parent === null ? "is the top of the tree" : `hangs on ${spotWords(token)}`}. Next its left spot is filled, then its right.`,
        21,
      );
      tones[id] = "hit";
      at += merge ? 3 : 1;
    } else {
      const pairs = !ask && tokens[at + 1]?.node === null && tokens[at + 1]?.parent === token.parent && asked.close;
      readAt = at + (pairs ? 2 : 1);
      focusToken = null;
      push(pairs ? `Two marks in a row: both spots under ${val(token.parent ?? 0)} are closed. Nothing hangs there.` : `This token is a mark. The spot on ${spotWords(token)} is closed: nothing hangs there.`, 20);
      at += pairs ? 2 : 1;
    }
  }

  readAt = tokens.length;
  focusToken = null;
  const text = levelText(tree);
  const end: BuildState = { ...snap(), tones: tree.map(() => "done") };
  push(
    practice ? `Done. The tape is used up, and the same tree is back. The answer is ${text}.` : `The tape is used up, and every spot is filled or closed. The same tree is back. Read level by level, the answer is ${text}.`,
    24,
    { state: end },
  );
  if (practice) return frames;

  frames.push({
    scene,
    caption: `Time: O(n). Writing touched each node once, and reading used each token once. Here the tape has ${tokens.length} tokens for ${tree.length} nodes.`,
    codeLine: 19,
    state: { ...end, counter: { label: "tokens read", value: tokens.length } },
  });
  frames.push({
    scene,
    caption: `Space: O(n). The tape holds one number for every node and one mark for every empty spot: ${tree.length} and ${tokens.length - tree.length} here.`,
    codeLine: 14,
    state: { ...end, rows: [tapeRow(tokens, tokens.length, () => "window"), end.rows[1]] },
  });
  return frames;
}

export const serializeDeserializeTreeStory: ProblemStory<BuildState> = {
  slugs: ["lc-297"],
  pattern: "Tree serialization",
  trigger: "a tree must be turned into text, and later the same tree must be rebuilt from that text alone",
  insight: "Write the tree on a tape in one fixed order: node, left side, right side, with a mark # for every empty spot. Read the tape back in the same order: a number makes a node, a mark closes a spot.",
  metaphor: {
    name: "The tape with marks",
    legend: "tape = the StringBuilder, then the token queue · mark = \"#\" for a null child · write = sb.append · read = tape.poll() · spot = node.left or node.right",
    terms: ["tape", "mark", "spot", "token", "written"],
  },
  traps: [{ name: TRAP, rule: "Write a mark for every empty spot. Numbers alone fit many different trees; the marks are what keep the shape." }],
  template: [
    "write(node):   if node is empty: tape += \"#\";  return",
    "               tape += node.val;  write(node.left);  write(node.right)",
    "read():        token = next token on the tape",
    "               if token is \"#\": return nothing",
    "               node = new node(token);  node.left = read();  node.right = read();  return node",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each node is written once and each token is read once",
    space: "O(n)",
    spaceWhy: "the tape holds a number per node and a mark per empty spot",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,null,null,4,5]", input: "[1,2,3,null,null,4,5]", expected: "[1,2,3,null,null,4,5]", note: "Five nodes, six marks" },
    { label: "[1,2,null,3]", input: "[1,2,null,3]", expected: "[1,2,null,3]", note: "Tricky: only the marks say the chain leans left" },
    { label: "[1,null,2,3]", input: "[1,null,2,3]", expected: "[1,null,2,3]", note: "The very first spot is empty" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-105", title: "Construct Binary Tree from Preorder and Inorder Traversal" },
    { slug: "lc-572", title: "Subtree of Another Tree" },
    { slug: "lc-102", title: "Binary Tree Level Order Traversal" },
  ],
  answer: (input) => roundTrip(readTree(input)),
  frames: (input) => {
    const tree = readTree(input);
    const tokens = tapeOf(tree);
    const other = lookAlike(tree);
    const minDepth = Math.max(depthOf(tree), other ? depthOf(other) : 0);
    const solution = tapeFrames(tree);
    const remembered = solution.filter((frame) => frame.caption.includes("answer is")).at(-1) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(tree, minDepth),
      ...slowFrames(tree, tokens, minDepth),
      ...insightFrames(tree, tokens, minDepth),
      ...solution,
      ...tapeFrames(readTree(PRACTICE), "card", true),
      { scene: "card", caption: "This is the picture to remember: a tape of numbers and marks, and a tree where every empty spot has its mark. Say the idea in your head first, then reveal the card.", state: remembered.state },
    ];
  },
  View: AgyTrees3BuildView,
};
