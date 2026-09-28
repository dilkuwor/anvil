import type { CellTone } from "@/components/learn/viz/primitives";

import { Rec05TreeView, blankRec05State, type Rec05Envelope, type Rec05TreeState } from "../rec05-tree-view";
import { listWords, parseTree, type TreeShapeNode } from "../tree-story-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type HouseFrame = StoryFrame<Rec05TreeState>;

/** Fresh tree for the "your turn" run: a chain where robbing every other level loses. */
const PRACTICE = "[4,1,null,2,null,3]";
const FALLBACK = "[3,2,3,null,3,null,1]";

const TRAP = "The Every-Other-Level Trap";

const CODE = [
  "int[] visit(TreeNode house) {",
  "    if (house == null) return new int[] {0, 0};",
  "    int[] left = visit(house.left);",
  "    int[] right = visit(house.right);",
  "    int robbed = house.val + left[1] + right[1];",
  "    int passed = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);",
  "    return new int[] {robbed, passed};",
  "}",
  "int[] top = visit(root);",
  "return Math.max(top[0], top[1]);",
];

type Pair = { robbed: number; passed: number };

/** Children first, then the house: the order the envelopes are filled. */
function postOrder(tree: TreeShapeNode[]): number[] {
  const order: number[] = [];
  const walk = (id: number | null) => {
    if (id === null) return;
    walk(tree[id].left);
    walk(tree[id].right);
    order.push(id);
  };
  walk(tree.length > 0 ? 0 : null);
  return order;
}

function envelopes(tree: TreeShapeNode[]): Pair[] {
  const pairs: Pair[] = tree.map(() => ({ robbed: 0, passed: 0 }));
  const get = (id: number | null): Pair => (id === null ? { robbed: 0, passed: 0 } : pairs[id]);
  for (const id of postOrder(tree)) {
    const left = get(tree[id].left);
    const right = get(tree[id].right);
    pairs[id] = { robbed: tree[id].val + left.passed + right.passed, passed: Math.max(left.robbed, left.passed) + Math.max(right.robbed, right.passed) };
  }
  return pairs;
}

/** Independent solver: plain recursion over the two choices. Also counts how often each house is worked out. */
function solvePlain(tree: TreeShapeNode[]): { best: number; visits: number[] } {
  const visits = tree.map(() => 0);
  const rob = (id: number | null): number => {
    if (id === null) return 0;
    visits[id]++;
    const node = tree[id];
    let robbed = node.val;
    for (const child of [node.left, node.right]) if (child !== null) robbed += rob(tree[child].left) + rob(tree[child].right);
    return Math.max(robbed, rob(node.left) + rob(node.right));
  };
  return { best: tree.length > 0 ? rob(0) : 0, visits };
}

/** The houses a best plan robs, read back from the envelopes. */
function bestPlan(tree: TreeShapeNode[], pairs: Pair[]): number[] {
  const chosen: number[] = [];
  const pick = (id: number | null, mayRob: boolean) => {
    if (id === null) return;
    const rob = mayRob && pairs[id].robbed >= pairs[id].passed;
    if (rob) chosen.push(id);
    pick(tree[id].left, !rob);
    pick(tree[id].right, !rob);
  };
  pick(0, true);
  return chosen;
}

/** The trap, really run: rob whole levels, every other one, and keep the better of the two ways. */
function levelPlan(tree: TreeShapeNode[]): { total: number; houses: number[] } {
  const sums = [0, 0];
  for (const node of tree) sums[node.depth % 2] += node.val;
  const parity = sums[0] >= sums[1] ? 0 : 1;
  return { total: sums[parity], houses: tree.filter((node) => node.depth % 2 === parity).map((node) => node.id) };
}

function children(tree: TreeShapeNode[], id: number): number[] {
  return [tree[id].left, tree[id].right].filter((child): child is number => child !== null);
}

function pictureFrames(tree: TreeShapeNode[], best: number, plan: number[]): HouseFrame[] {
  const blank = blankRec05State(tree);
  const top = tree[0];
  const kids = children(tree, 0);
  const frames: HouseFrame[] = [{ scene: "picture", caption: "Each circle is a house, and its number is the money inside. A line joins a parent house to a child house below it.", state: blank }];
  if (kids.length > 0) {
    const kid = tree[kids[0]];
    frames.push({
      scene: "picture",
      caption: `A thief may never rob two joined houses. Robbing ${top.val} and its child ${kid.val} together is not allowed.`,
      state: { ...blank, tones: tree.map((node) => (node.id === 0 || node.id === kid.id ? "miss" : "idle")) },
    });
    const grandchild = kids.flatMap((id) => children(tree, id))[0];
    if (grandchild !== undefined) {
      frames.push({
        scene: "picture",
        caption: `Houses that are not joined are fine. ${top.val} and its grandchild ${tree[grandchild].val} may both be robbed.`,
        state: { ...blank, tones: tree.map((node) => (node.id === 0 || node.id === grandchild ? "hit" : "idle")) },
      });
    }
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the largest total the thief can take. Here it is ${best}, from ${listWords(plan.map((id) => tree[id].val))}.`,
    state: { ...blank, tones: tree.map((node) => (plan.includes(node.id) ? "done" : "idle")) },
  });
  return frames;
}

function slowFrames(tree: TreeShapeNode[]): HouseFrame[] {
  const blank = blankRec05State(tree);
  const { visits } = solvePlain(tree);
  const total = visits.reduce((sum, count) => sum + count, 0);
  const most = visits.indexOf(Math.max(...visits));
  const frames: HouseFrame[] = [
    {
      scene: "slow",
      caption: "The slow way: at each house, try both choices. Rob it and ask its grandchildren, or walk past it and ask its children.",
      state: { ...blank, tones: tree.map((node) => (node.id === 0 ? "edge" : "idle")), counter: { label: "houses worked out", value: 1 } },
    },
  ];
  if (visits[most] > 1) {
    frames.push({
      scene: "slow",
      caption: `The house ${tree[most].val} is worked out ${visits[most]} times: its parent asks, and so does its grandparent. Nothing is remembered.`,
      state: { ...blank, tones: tree.map((node) => (node.id === most ? "miss" : visits[node.id] > 1 ? "window" : "idle")), counter: { label: "houses worked out", value: total } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${total} times for ${tree.length} houses. Each extra level multiplies the repeats, so this grows like O(2ⁿ) time.`,
    state: { ...blank, tones: tree.map(() => "faded"), counter: { label: "houses worked out", value: total } },
  });
  return frames;
}

function insightFrames(tree: TreeShapeNode[], pairs: Pair[]): HouseFrame[] {
  const blank = blankRec05State(tree);
  const leaf = postOrder(tree)[0];
  const parent = tree[leaf].parent;
  const leafOnly = tree.map((node): Rec05Envelope | null => (node.id === leaf ? { ...pairs[leaf], robbedTone: "hit", passedTone: "hit" } : null));
  const frames: HouseFrame[] = [
    {
      scene: "insight",
      caption: "Picture each house handing two envelopes up to its parent. One holds the best total below if it is robbed, the other if it is walked past.",
      state: { ...blank, tones: tree.map((node) => (node.id === leaf ? "edge" : "idle")) },
    },
    {
      scene: "insight",
      caption: `The house ${tree[leaf].val} has no children. Robbed, its envelope holds ${pairs[leaf].robbed}. Walked past, it holds 0.`,
      state: { ...blank, tones: tree.map((node) => (node.id === leaf ? "edge" : "idle")), envelopes: leafOnly },
    },
  ];
  if (parent !== null) {
    frames.push({
      scene: "insight",
      caption: `The parent ${tree[parent].val} only reads its children's envelopes. It never looks further down, so each house is worked out once.`,
      state: { ...blank, tones: tree.map((node) => (node.id === parent ? "edge" : node.id === leaf ? "hit" : "idle")), envelopes: leafOnly },
    });
  }
  return frames;
}

/**
 * The real algorithm: houses are filled children first, one envelope per frame.
 * `practice` reuses it on a fresh tree, and the reader picks every envelope.
 */
function solutionFrames(tree: TreeShapeNode[], scene: SceneId = "solution", practice = false): HouseFrame[] {
  const frames: HouseFrame[] = [];
  const pairs = envelopes(tree);
  const filled = new Set<number>();
  const best = Math.max(pairs[0].robbed, pairs[0].passed);
  const asked = { robbed: false, passed: false };
  const val = (id: number) => tree[id].val;

  const snap = (here: number | null, paint: (id: number, which: "robbed" | "passed") => CellTone = () => "idle"): Rec05TreeState => ({
    ...blankRec05State(tree),
    tones: tree.map((node) => (node.id === here ? "edge" : filled.has(node.id) ? "hit" : "idle")),
    envelopes: tree.map((node) => (filled.has(node.id) ? { ...pairs[node.id], robbedTone: paint(node.id, "robbed"), passedTone: paint(node.id, "passed") } : null)),
  });
  const push = (caption: string, codeLine: number | undefined, state: Rec05TreeState) => {
    frames.push({ scene, caption, codeLine: practice ? undefined : codeLine, state });
    return frames[frames.length - 1];
  };

  const robbedQuiz = (id: number): StoryQuiz => {
    const kid = children(tree, id)[0];
    return {
      kind: "cell",
      cells: tree.length * 2,
      question: `Say ${val(id)} is robbed. Which envelope of its child ${val(kid)} can it add? Click it.`,
      answer: kid * 2 + 1,
      feedback: { [kid * 2]: `That envelope counts ${val(kid)} as robbed. ${val(kid)} is joined to ${val(id)}, so both cannot be robbed.` },
      otherwise: `Look at the two envelopes under ${val(kid)}, the child of ${val(id)}.`,
      why: `A robbed house forces its children to be walked past, so it adds their walked-past envelopes.`,
    };
  };
  const passedQuiz = (id: number, kid: number): StoryQuiz => {
    const larger = pairs[kid].robbed > pairs[kid].passed ? kid * 2 : kid * 2 + 1;
    return {
      kind: "cell",
      cells: tree.length * 2,
      question: `Now say ${val(id)} is walked past. Which envelope of its child ${val(kid)} does it take? Click it.`,
      answer: larger,
      feedback: { [larger === kid * 2 ? kid * 2 + 1 : kid * 2]: `That one holds less. Walking past ${val(id)} leaves ${val(kid)} free to choose, and it chooses more.` },
      otherwise: `Look at the two envelopes under ${val(kid)}, the child of ${val(id)}.`,
      why: `Walking past ${val(id)} does not force anything on ${val(kid)}, so it takes the larger envelope.`,
    };
  };

  if (practice) push(`Your turn, on a new street of houses. Envelopes are filled from the bottom up. You pick every envelope.`, undefined, snap(null));
  else push("Houses are filled from the bottom up: a house can only fill its envelopes once its children have handed theirs up.", 8, snap(null));

  for (const id of postOrder(tree)) {
    const kids = children(tree, id);
    const node = tree[id];
    if (kids.length === 0) {
      filled.add(id);
      push(`The house ${node.val} has no children. Its envelopes: robbed ${pairs[id].robbed}, walked past 0.`, 6, snap(id));
      continue;
    }
    const askRobbed = practice || !asked.robbed;
    const kidWords = listWords(kids.map(val));
    const reading = push(
      kids.length === 2 ? `Now the house ${node.val}. Its children ${kidWords} have handed up their envelopes.` : `Now the house ${node.val}. Its child ${kidWords} has handed up its envelopes.`,
      2,
      snap(id),
    );
    if (askRobbed) {
      asked.robbed = true;
      reading.quiz = robbedQuiz(id);
    }
    filled.add(id);
    const passedParts = kids.map((kid) => Math.max(pairs[kid].robbed, pairs[kid].passed));
    const differs = kids.find((kid) => pairs[kid].robbed !== pairs[kid].passed);
    const askPassed = differs !== undefined && (practice || !asked.passed);
    // While the next question is open, the children's envelopes stay plain: the answer is never pre-coloured.
    const robbedState = snap(id, (house, which) => (kids.includes(house) && !askPassed ? (which === "passed" ? "hit" : "faded") : "idle"));
    robbedState.envelopes[id] = { robbed: pairs[id].robbed, passed: null, robbedTone: "edge", passedTone: "idle" };
    const robbedFrame = push(
      kids.length === 2
        ? `Rob ${node.val}: its money ${node.val} plus the walked-past envelopes of its children, ${kids.map((kid) => pairs[kid].passed).join(" and ")}. The robbed envelope holds ${pairs[id].robbed}.`
        : `Rob ${node.val}: its money ${node.val} plus the walked-past envelope of its child ${val(kids[0])}, which is ${pairs[kids[0]].passed}. The robbed envelope holds ${pairs[id].robbed}.`,
      4,
      robbedState,
    );
    if (askPassed) {
      asked.passed = true;
      robbedFrame.quiz = passedQuiz(id, differs);
    }
    push(
      kids.length === 2
        ? `Walk past ${node.val}: each child hands up its larger envelope, ${passedParts.join(" and ")}. The walked-past envelope holds ${pairs[id].passed}.`
        : `Walk past ${node.val}: its child ${val(kids[0])} hands up its larger envelope, ${passedParts[0]}. The walked-past envelope holds ${pairs[id].passed}.`,
      5,
      snap(id, (house, which) => {
        if (kids.includes(house)) {
          const larger = pairs[house].robbed > pairs[house].passed ? "robbed" : "passed";
          return which === larger ? "hit" : "faded";
        }
        return house === id ? (which === "passed" ? "edge" : "idle") : "idle";
      }),
    );
  }

  const larger = pairs[0].robbed >= pairs[0].passed ? 0 : 1;
  if (pairs[0].robbed !== pairs[0].passed) {
    const before = push(`The top house ${val(0)} now holds both of its envelopes: ${pairs[0].robbed} and ${pairs[0].passed}.`, 8, snap(null));
    before.quiz = {
      kind: "cell",
      cells: tree.length * 2,
      question: `The top house ${val(0)} has both envelopes. Which one is the answer? Click it.`,
      answer: larger,
      feedback: { [1 - larger]: "That envelope holds less. The thief wants the largest total." },
      otherwise: `The answer is one of the two envelopes under the top house ${val(0)}.`,
      why: "Nobody sits above the top house, so the thief takes whichever envelope holds more.",
    };
  }
  const answerState = snap(null, (house, which) => (house === 0 ? ((which === "robbed") === (larger === 0) ? "done" : "faded") : "idle"));
  if (practice) {
    const plan = levelPlan(tree);
    push(`Done. The answer is ${best}. Robbing every other level would give only ${plan.total}, so the Every-Other-Level Trap did not catch you.`, undefined, answerState);
    return frames;
  }
  push(`The top house hands up ${pairs[0].robbed} and ${pairs[0].passed}. Nobody is above it, so take the larger. The answer is ${best}.`, 9, answerState);
  const plan = levelPlan(tree);
  if (plan.total < best) {
    push(`${TRAP}: robbing whole levels, every other one, gives at most ${plan.total}. The envelopes found ${best}, because each house chose for itself.`, 9, {
      ...answerState,
      tones: tree.map((node) => (plan.houses.includes(node.id) ? "miss" : "idle")),
      note: { text: `✕ levels: ${plan.total}`, tone: "coral" },
    });
  }
  const height = Math.max(...tree.map((node) => node.depth)) + 1;
  push(`Time: O(n). Each of the ${tree.length} houses filled its two envelopes once, reading only its own children.`, 4, { ...answerState, counter: { label: "houses filled", value: tree.length } });
  push(`Space: O(h), where h is the height. Only the houses on one way down from the top wait for envelopes at the same time. Here h is ${height}.`, 2, answerState);
  return frames;
}

function readTree(input: string): TreeShapeNode[] {
  const tree = parseTree(input);
  return tree.length > 0 ? tree : parseTree(FALLBACK);
}

export const houseRobberIIIStory: ProblemStory<Rec05TreeState> = {
  slugs: ["lc-337"],
  pattern: "Tree DP",
  trigger: "the largest total from houses joined like a tree, where a parent and its child may never both be robbed",
  insight: "Every house hands its parent two envelopes: the best total from its part of the tree if it is robbed, and if it is walked past. Robbed uses the children's walked-past envelopes. Walked past takes the larger envelope of each child.",
  metaphor: {
    name: "Two envelopes",
    legend: "robbed envelope = pair[0] · walked-past envelope = pair[1] · handing up = returning the pair",
    terms: ["envelope", "rob", "walk"],
  },
  traps: [{ name: TRAP, rule: "Robbing whole levels, every other one, is not always best. Each house decides for itself: compare both envelopes of every child." }],
  template: [
    "pair visit(node) {",
    "    if (node is empty) return (0, 0);",
    "    l = visit(node.left);  r = visit(node.right);        // children first",
    "    return (node.val + l.without + r.without, best(l) + best(r));",
    "}",
    "answer = best(visit(root));",
  ],
  complexity: {
    slow: "O(2ⁿ)",
    time: "O(n)",
    timeWhy: "each house fills its two envelopes once, from its children's",
    space: "O(h)",
    spaceWhy: "only the houses on one way down from the top wait at the same time",
  },
  code: CODE,
  examples: [
    { label: "[2,1,3,null,4]", input: "[2,1,3,null,4]", expected: "7", note: "Every other level gives only 6" },
    { label: "[3,2,3,null,3,null,1]", input: "[3,2,3,null,3,null,1]", expected: "7" },
    { label: "[3,4,5,1,3,null,1]", input: "[3,4,5,1,3,null,1]", expected: "9" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-198", title: "House Robber" },
    { slug: "lc-213", title: "House Robber II" },
    { slug: "lc-124", title: "Binary Tree Maximum Path Sum" },
  ],
  answer: (input) => String(solvePlain(parseTree(input)).best),
  frames: (input) => {
    const tree = readTree(input);
    const pairs = envelopes(tree);
    const best = Math.max(pairs[0].robbed, pairs[0].passed);
    const solution = solutionFrames(tree);
    const remembered = solution.find((frame) => frame.caption.startsWith("Walk past")) ?? solution[solution.length - 1];
    return [
      ...pictureFrames(tree, best, bestPlan(tree, pairs)),
      ...slowFrames(tree),
      ...insightFrames(tree, pairs),
      ...solution,
      ...solutionFrames(parseTree(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: every house hands up two envelopes, robbed and walked past. Say the idea in your head first, then reveal the card.",
        state: { ...remembered.state, note: null },
      },
    ];
  },
  View: Rec05TreeView,
};
