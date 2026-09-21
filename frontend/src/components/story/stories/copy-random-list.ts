import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokRandomListView, type RandomListState } from "../grok-random-list-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<RandomListState>;

/** Fresh yard: a side coupling points ahead, so the target copy is not built yet. */
const PRACTICE = "[[4,1],[5,0],[6,-1]]";

const CODE = [
  "Map<Node, Node> copies = new HashMap<>();",
  "for (Node cur = head; cur != null; cur = cur.next) {",
  "    copies.put(cur, new Node(cur.val));",
  "}",
  "for (Node cur = head; cur != null; cur = cur.next) {",
  "    copies.get(cur).next = copies.get(cur.next);",
  "    copies.get(cur).random = copies.get(cur.random);",
  "}",
  "return copies.get(head);",
];

type Pair = { val: number; random: number };

function parsePairs(input: string): Pair[] {
  return [...input.matchAll(/\[(-?\d+)\s*,\s*(-?\d+)\]/g)].map((match) => ({ val: Number(match[1]), random: Number(match[2]) }));
}

type RandNode = { val: number; next: RandNode | null; random: RandNode | null };

function build(pairs: Pair[]): RandNode[] {
  const nodes: RandNode[] = pairs.map((pair) => ({ val: pair.val, next: null, random: null }));
  nodes.forEach((node, index) => {
    node.next = index + 1 < nodes.length ? nodes[index + 1] : null;
    node.random = pairs[index].random >= 0 ? nodes[pairs[index].random] : null;
  });
  return nodes;
}

function encode(head: RandNode | null): string {
  const order: RandNode[] = [];
  const indexOf = new Map<RandNode, number>();
  for (let cur = head; cur !== null; cur = cur.next) {
    indexOf.set(cur, order.length);
    order.push(cur);
  }
  if (!order.length) return "[]";
  return `[${order.map((node) => `[${node.val},${node.random ? indexOf.get(node.random) : -1}]`).join(",")}]`;
}

function solve(pairs: Pair[]): string {
  if (!pairs.length) return "[]";
  const originals = build(pairs);
  const copies = new Map<RandNode, RandNode>();
  for (const node of originals) copies.set(node, { val: node.val, next: null, random: null });
  for (const node of originals) {
    const copy = copies.get(node)!;
    copy.next = node.next ? copies.get(node.next)! : null;
    copy.random = node.random ? copies.get(node.random)! : null;
  }
  return encode(copies.get(originals[0]) ?? null);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function yard(pairs: Pair[], copiesMade: number, wired: boolean): RandomListState {
  const n = pairs.length;
  const end = n;
  const originals = [...pairs.map((pair) => ({ label: String(pair.val), kind: "car" as const })), { label: "null", kind: "null" as const }];
  const copies = Array.from({ length: n + 1 }, (_, index) => {
    if (index === n) return { label: "null", kind: "null" as const };
    if (index < copiesMade) return { label: String(pairs[index].val), kind: "car" as const };
    return { label: "", kind: "empty" as const };
  });
  const origNext = originals.map((_, index) => (index < n ? index + 1 : null));
  const origRandom = originals.map((_, index) => (index < n && pairs[index].random >= 0 ? pairs[index].random : index < n ? end : null));
  const copyNext = copies.map((_, index) => (wired && index < n ? index + 1 : null));
  const copyRandom = copies.map((_, index) => (wired && index < n && pairs[index].random >= 0 ? pairs[index].random : wired && index < n ? end : null));
  return {
    originals,
    copies,
    origNext,
    origRandom,
    copyNext,
    copyRandom,
    origTones: tones(n + 1, () => null),
    copyTones: tones(n + 1, (index) => (index < copiesMade ? "done" : index === n ? "idle" : "faded")),
    notebook: copiesMade ? pairs.slice(0, copiesMade).map((pair) => ({ orig: String(pair.val), copy: `${pair.val}'` })) : null,
    pointers: [],
  };
}

function pictureFrames(pairs: Pair[]): Frame[] {
  const n = pairs.length;
  const firstAhead = pairs.findIndex((pair) => pair.random > 0);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: n === 0 ? "This yard is empty: no cars at all." : `This train has ${n} car${n === 1 ? "" : "s"}. Each car has a forward coupling, and also a side coupling that can hook any car, or null.`,
      state: yard(pairs, 0, false),
    },
  ];
  if (n === 0) {
    frames.push({ scene: "picture", caption: "The goal: a second train that copies both kinds of coupling. Empty stays empty.", state: yard(pairs, 0, false) });
    return frames;
  }
  const self = pairs.findIndex((pair) => pair.random === pairs.indexOf(pair));
  if (firstAhead >= 0) {
    const target = pairs[firstAhead].random;
    frames.push({
      scene: "picture",
      caption: `The car ${pairs[firstAhead].val} has a side coupling that reaches ahead to the car ${pairs[target].val}. A side coupling may also hook backwards, onto itself, or onto null.`,
      state: { ...yard(pairs, 0, false), origTones: tones(n + 1, (index) => (index === firstAhead ? "edge" : index === target ? "window" : null)), trapSide: firstAhead },
    });
  } else if (self >= 0) {
    frames.push({
      scene: "picture",
      caption: `The car ${pairs[self].val} has a side coupling that hooks onto itself. A side coupling may also hook another car, or null.`,
      state: { ...yard(pairs, 0, false), origTones: tones(n + 1, (index) => (index === self ? "edge" : null)) },
    });
  } else {
    frames.push({
      scene: "picture",
      caption: `Here a side coupling hooks backwards, or onto null. It is never only the car ahead.`,
      state: { ...yard(pairs, 0, false), origTones: tones(n + 1, (index) => (index < n && pairs[index].random >= 0 ? "window" : null)) },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: a second train whose forward and side couplings match, car for car. The copy encodes as ${solve(pairs)}.`,
    state: { ...yard(pairs, n, true), copyTones: tones(n + 1, (index) => (index < n ? "done" : null)) },
  });
  return frames;
}

function slowFrames(pairs: Pair[]): Frame[] {
  const n = pairs.length;
  const frames: Frame[] = [];
  let walked = 0;
  pairs.forEach((pair, index) => {
    if (pair.random >= 0) {
      walked += pair.random + 1;
    }
    if (index > 1) return;
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: copy the forward train first. Then, for each side coupling, walk from the front of both trains until the target, in lockstep.`
          : `The car ${pair.val}'s side coupling needs another walk from the front. The same cars are passed again.`,
      state: {
        ...yard(pairs, n, true),
        origTones: tones(n + 1, (cell) => (cell === index ? "edge" : pair.random >= 0 && cell <= pair.random ? "window" : null)),
        counter: { label: "cars walked past", value: walked },
      },
    });
  });
  frames.push({
    scene: "slow",
    caption: `Each of the ${n} side couplings may walk the whole train: ${walked} cars walked past here. This is O(n²) time: far too slow for a long train.`,
    state: { ...yard(pairs, n, true), origTones: tones(n + 1, () => "faded"), counter: { label: "cars walked past", value: walked } },
  });
  return frames;
}

function insightFrames(pairs: Pair[]): Frame[] {
  const n = pairs.length;
  const ahead = pairs.findIndex((pair, index) => pair.random > index);
  const at = ahead >= 0 ? ahead : 0;
  const target = pairs[at]?.random ?? -1;
  if (!n) {
    return [{ scene: "insight", caption: "An empty yard copies as empty. There is nothing to wire.", state: yard(pairs, 0, false) }];
  }
  return [
    {
      scene: "insight",
      caption: `Picture a copy yard. First stand up a copy of every car, and do not wire anything yet. The notebook will remember which copy belongs to which car.`,
      state: { ...yard(pairs, n, false), origTones: tones(n + 1, (index) => (index < n ? "window" : null)) },
    },
    {
      scene: "insight",
      caption:
        target > at
          ? `The Early Side Trap: hook the side coupling of the copy of the car ${pairs[at].val} now, and the copy of the car ${pairs[target].val} is not in the yard yet.`
          : `A side coupling may point at a car you have not copied yet. Wiring it on the first walk is the Early Side Trap.`,
      state: { ...yard(pairs, at + 1, false), trapSide: at, origTones: tones(n + 1, (index) => (index === at ? "miss" : index === target ? "window" : null)), copyTones: tones(n + 1, (index) => (index === at ? "miss" : index < at + 1 ? "done" : "faded")) },
    },
    {
      scene: "insight",
      caption: "So build every copy first. A second walk then sets each forward coupling and each side coupling from the notebook, in one lookup.",
      state: { ...yard(pairs, n, true), copyTones: tones(n + 1, (index) => (index < n ? "done" : null)) },
    },
  ];
}

function sideQuiz(pairs: Pair[], origIndex: number): StoryQuiz {
  const n = pairs.length;
  const target = pairs[origIndex].random;
  const answer = target >= 0 ? n + 1 + target : n + 1 + n;
  const origNull = n;
  const copyNull = n + 1 + n;
  const feedback: Record<number, string> = {
    [origIndex]: "That is the original car. Every coupling on a copy must hook a copy, or null.",
    [origNull]: "That is the original null. The copy train has its own null.",
  };
  if (target >= 0) {
    feedback[target] = "That is the original target. The copy must hook the copy of that car, not the original.";
    feedback[copyNull] = "This side coupling is not empty. It hooks a copy of a real car.";
  }
  pairs.forEach((pair, index) => {
    if (n + 1 + index === answer) return;
    if (index !== origIndex) feedback[index] = "That is a different original car.";
    if (index !== target) feedback[n + 1 + index] = "That copy is not the one this side coupling should hook.";
  });
  delete feedback[answer];
  return {
    kind: "cell",
    cells: (n + 1) * 2,
    question: `The side coupling of the copy of the car ${pairs[origIndex].val} is wired now. Which box does it hook? Click it.`,
    answer,
    feedback,
    otherwise: "Look at the original car's side coupling, then click the matching box on the copy train.",
    why: target >= 0 ? `The original hooks the car ${pairs[target].val}, so the copy hooks the copy of that car.` : "The original side coupling hooks null, so the copy's side coupling hooks the copy train's null.",
  };
}

function solutionFrames(pairs: Pair[], scene: SceneId = "solution", practice = false): Frame[] {
  const n = pairs.length;
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const ahead = pairs.findIndex((pair, index) => pair.random > index);
  const end = n;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new train: ${pairs.map((pair) => pair.val).join(", ")}. You decide when the side couplings may be wired.` : "The notebook starts empty. No copy stands in the yard yet.",
    codeLine: line(0),
    state: yard(pairs, 0, false),
  });

  if (!n) {
    frames.push({
      scene,
      caption: practice ? "Done. The answer is []." : "The original train is empty. The answer is [].",
      codeLine: line(8),
      state: yard(pairs, 0, false),
    });
    if (!practice) {
      frames.push({ scene, caption: "Time: O(n). Two walks of an empty train are still two walks of n cars.", codeLine: 1, state: { ...yard(pairs, 0, false), counter: { label: "cars copied", value: 0 } } });
      frames.push({ scene, caption: "Space: O(n). The notebook holds one line per original car.", codeLine: 0, state: yard(pairs, 0, false) });
    }
    return frames;
  }

  let askedCreate = false;
  for (let index = 0; index < n; index++) {
    const trapNow = !practice && ahead === index && !askedCreate;
    if (practice && index === (ahead >= 0 ? ahead : 0)) {
      frames.push({
        scene,
        caption: `A copy of the car ${pairs[index].val} is about to stand up. Its original has a side coupling. When may that side coupling be wired?`,
        state: { ...yard(pairs, index, false), origTones: tones(n + 1, (cell) => (cell === index ? "edge" : null)), pointers: [{ name: "cur", row: "orig", at: index, tone: "accent" }] },
        quiz: {
          kind: "choice",
          question: "The original has a side coupling. When may that side coupling be wired on the copy?",
          options: ["Hook the side coupling now, onto the target copy.", "Wait. Stand up every copy first, then wire."],
          answer: 1,
          why: "The target copy may not exist yet. The Early Side Trap is wiring a side coupling on this first walk.",
        },
      });
    }
    if (trapNow) {
      askedCreate = true;
      frames.push({
        scene,
        caption: `The Early Side Trap: the copy of the car ${pairs[index].val} wants a side coupling to the copy of the car ${pairs[pairs[index].random].val}, which is not in the yard yet.`,
        codeLine: line(2),
        state: { ...yard(pairs, index + 1, false), trapSide: index, origTones: tones(n + 1, (cell) => (cell === index ? "miss" : cell === pairs[index].random ? "window" : null)), copyTones: tones(n + 1, (cell) => (cell === index ? "miss" : cell < index + 1 ? "done" : "faded")), pointers: [{ name: "cur", row: "orig", at: index, tone: "accent" }] },
      });
    }
    frames.push({
      scene,
      caption: `Stand up a copy of the car ${pairs[index].val}. Write ${pairs[index].val} → ${pairs[index].val}' in the notebook. Do not wire yet.`,
      codeLine: line(2),
      state: { ...yard(pairs, index + 1, false), origTones: tones(n + 1, (cell) => (cell === index ? "edge" : null)), pointers: [{ name: "cur", row: "orig", at: index, tone: "accent" }] },
    });
  }

  frames.push({
    scene,
    caption: "Every copy now exists. The second walk wires forward couplings and side couplings from the notebook.",
    codeLine: line(4),
    state: yard(pairs, n, false),
  });

  let askedSide = false;
  const wiredNext = Array.from({ length: n + 1 }, () => null as number | null);
  const wiredRandom = Array.from({ length: n + 1 }, () => null as number | null);
  for (let index = 0; index < n; index++) {
    wiredNext[index] = index + 1;
    const before: RandomListState = {
      ...yard(pairs, n, false),
      copyNext: [...wiredNext],
      copyRandom: [...wiredRandom],
      origTones: tones(n + 1, (cell) => (cell === index ? "edge" : null)),
      copyTones: tones(n + 1, (cell) => (cell < n ? "window" : null)),
      pointers: [{ name: "cur", row: "orig", at: index, tone: "accent" }],
    };
    const ask = (practice || !askedSide) && (pairs[index].random >= 0 || practice);
    if (ask) askedSide = true;
    frames.push({
      scene,
      caption: `The copy of the car ${pairs[index].val} hooks forward onto ${index + 1 < n ? `the copy of the car ${pairs[index + 1].val}` : "null"}. Its side coupling is next.`,
      codeLine: line(5),
      state: before,
      quiz: ask ? sideQuiz(pairs, index) : undefined,
    });
    wiredRandom[index] = pairs[index].random >= 0 ? pairs[index].random : end;
    frames.push({
      scene,
      caption: pairs[index].random >= 0 ? `The notebook says the target is the copy of the car ${pairs[pairs[index].random].val}. The side coupling hooks that copy.` : `The original side coupling is empty, so the copy's side coupling hooks null.`,
      codeLine: line(6),
      state: { ...before, copyRandom: [...wiredRandom], copyTones: tones(n + 1, (cell) => (cell === index ? "done" : cell < n ? "window" : null)) },
    });
  }

  const answer = solve(pairs);
  frames.push({
    scene,
    caption: practice ? `Done. The copy train matches. The answer is ${answer}.` : `Follow the copy train from the first copy. The answer is ${answer}.`,
    codeLine: line(8),
    state: { ...yard(pairs, n, true), copyTones: tones(n + 1, (cell) => (cell < n ? "done" : null)) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Two walks of ${n} cars, and each notebook lookup is one step.`,
      codeLine: 1,
      state: { ...yard(pairs, n, true), counter: { label: "cars copied", value: n } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). The notebook holds one line per original car, here ${n}.`,
      codeLine: 0,
      state: { ...yard(pairs, n, true), notebook: pairs.map((pair) => ({ orig: String(pair.val), copy: `${pair.val}'` })) },
    });
  }
  return frames;
}

export const copyRandomListStory: ProblemStory<RandomListState> = {
  slugs: ["lc-138"],
  pattern: "Hash map of original to copy",
  trigger: "a list whose cars also have a side coupling to any car, or to nothing, and you must deep-copy both kinds of coupling",
  insight: "Stand up a copy of every car first. A notebook maps each original to its copy. Only then wire forward and side couplings, so a side coupling that points ahead has a target.",
  metaphor: { name: "The copy yard", legend: "notebook = map of original to copy · side coupling = random · forward coupling = next", terms: ["car", "copy", "notebook", "coupling", "yard", "side"] },
  traps: [
    {
      name: "The Early Side Trap",
      rule: "Do not hook a copy's side coupling while creating copies. The target copy may not exist yet. Create every copy first, then wire from the notebook.",
    },
  ],
  template: [
    "copies = empty notebook;",
    "for each original car: stand up a copy, write original → copy;",
    "for each original car: copy.forward = notebook[original.forward];",
    "                    copy.side = notebook[original.side];",
    "return the copy of the first car;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "two walks of n cars, and each notebook lookup is one step",
    space: "O(n)",
    spaceWhy: "the notebook holds one line per original car",
  },
  code: CODE,
  examples: [
    { label: "[[1,1],[2,-1]]", input: "[[1,1],[2,-1]]", expected: "[[1,1],[2,-1]]", note: "A side coupling that points ahead" },
    { label: "[[7,-1],[13,0]]", input: "[[7,-1],[13,0]]", expected: "[[7,-1],[13,0]]" },
    { label: "[[3,0]]", input: "[[3,0]]", expected: "[[3,0]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-133", title: "Clone Graph" },
    { slug: "lc-141", title: "Linked List Cycle" },
    { slug: "lc-206", title: "Reverse Linked List" },
  ],
  answer: (input) => solve(parsePairs(input)),
  frames: (input) => {
    const pairs = parsePairs(input);
    return [...pictureFrames(pairs), ...slowFrames(pairs), ...insightFrames(pairs), ...solutionFrames(pairs), ...solutionFrames(parsePairs(PRACTICE), "card", true), { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: { ...yard(pairs, pairs.length, true), copyTones: tones(pairs.length + 1, (index) => (index < pairs.length ? "done" : null)) } }];
  },
  View: GrokRandomListView,
};
