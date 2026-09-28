import type { CellTone } from "@/components/learn/viz/primitives";

import { PlatePilesView, type PilePlate, type PlatePilesState } from "../rec08-plate-piles-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<PlatePilesState>;

type Op = { kind: "push"; value: number } | { kind: "pop" } | { kind: "peek" } | { kind: "empty" };

/** Fresh calls for the "your turn" run. Plate 5 arrives while plate 4 still waits in the out pile. */
const PRACTICE = "push 3, push 4, pop, push 5, peek, pop, pop, empty";

const CODE = [
  "Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();",
  "void push(int x) { in.addLast(x); }",
  "int peek() {",
  "    if (out.isEmpty()) {",
  "        while (!in.isEmpty()) out.addLast(in.removeLast());",
  "    }",
  "    return out.peekLast();",
  "}",
  "int pop() { peek(); return out.removeLast(); }",
  "boolean empty() { return in.isEmpty() && out.isEmpty(); }",
];

function parse(raw: string): Op[] {
  const ops: Op[] = [];
  for (const part of raw.split(",")) {
    const [word, number] = part.trim().split(/\s+/);
    if (word === "push") ops.push({ kind: "push", value: Number.parseInt(number, 10) });
    else if (word === "pop" || word === "peek" || word === "empty") ops.push({ kind: word });
  }
  return ops;
}

/** Independent check: a plain line where the first item in is the first out. */
function solve(ops: Op[]): string {
  const line: number[] = [];
  const out: string[] = [];
  for (const op of ops) {
    if (op.kind === "push") line.push(op.value);
    else if (op.kind === "pop") out.push(String(line.shift()));
    else if (op.kind === "peek") out.push(String(line[0]));
    else out.push(String(line.length === 0));
  }
  return `[${out.join(",")}]`;
}

const plates = (values: number[], tone: (value: number, level: number) => CellTone = () => "idle"): PilePlate[] =>
  values.map((value, level) => ({ value, tone: tone(value, level) }));

function blank(): PlatePilesState {
  return { leftTitle: "in pile", rightTitle: "out pile", left: [], right: [], pouring: false, op: null, returned: [], trapPile: null, counter: null, note: null };
}

const opText = (op: Op) => (op.kind === "push" ? `push ${op.value}` : op.kind);

function pictureFrames(ops: Op[]): Frame[] {
  const pushed = ops.filter((op): op is { kind: "push"; value: number } => op.kind === "push").map((op) => op.value);
  const first = pushed.slice(0, 3);
  return [
    {
      scene: "picture",
      caption: `We need a waiting line. Items join at the back and leave from the front, so ${first[0]} arrives first and must leave first.`,
      state: { ...blank(), leftTitle: "waiting line", rightTitle: " ", left: plates(first, (_, level) => (level === 0 ? "done" : "idle")) },
    },
    {
      scene: "picture",
      caption: `Allowed: two piles of plates. You may only put a plate on top or take the top plate.`,
      state: { ...blank(), left: plates(first) },
    },
    {
      scene: "picture",
      caption: `Not allowed: pulling ${first[0]} from the bottom of a pile. It is buried under the plates that came after it.`,
      state: { ...blank(), left: plates(first, (_, level) => (level === 0 ? "miss" : "idle")) },
    },
    {
      scene: "picture",
      caption: `The goal: run the calls ${ops.map(opText).join(", ")}. Record what each pop, peek and empty returns.`,
      state: { ...blank(), left: plates(first) },
    },
  ];
}

function slowFrames(ops: Op[]): Frame[] {
  const frames: Frame[] = [];
  const main: number[] = [];
  const returned: string[] = [];
  let moves = 0;
  let shown = 0;
  let longest = 0;
  const state = (helper: number[], op: string): PlatePilesState => ({
    ...blank(),
    leftTitle: "main pile",
    rightTitle: "helper pile",
    left: plates(main),
    right: plates(helper, (_, level) => (level === helper.length - 1 ? "edge" : "idle")),
    op,
    returned: [...returned],
    counter: { label: "plates moved", value: moves },
  });
  for (const op of ops) {
    if (op.kind === "push") {
      main.push(op.value);
      longest = Math.max(longest, main.length);
      continue;
    }
    if (op.kind === "empty") {
      returned.push(String(main.length === 0));
      continue;
    }
    const helper: number[] = [];
    while (main.length) {
      helper.push(main.pop() as number);
      moves++;
    }
    const front = helper[helper.length - 1];
    if (shown === 0) {
      frames.push({
        scene: "slow",
        caption: `The slow way keeps one pile. For ${op.kind}, pour every plate onto a helper pile. Now ${front}, the oldest, is on top.`,
        state: state(helper, op.kind),
      });
    }
    if (op.kind === "pop") helper.pop();
    returned.push(String(front));
    while (helper.length) {
      main.push(helper.pop() as number);
      moves++;
    }
    if (shown < 3) {
      frames.push({
        scene: "slow",
        caption:
          shown === 0
            ? `${op.kind === "pop" ? "Take" : "Read"} ${front}, then pour everything back so new plates land in the right place. Plates moved so far: ${moves}.`
            : `The next ${op.kind} pours the whole pile over and back again for ${front}. Plates moved so far: ${moves}.`,
        state: { ...state([], op.kind), left: plates(main) },
      });
    }
    shown++;
  }
  frames.push({
    scene: "slow",
    caption: `${moves} plate moves in total. Every pop moves the whole pile twice, so each one costs O(n) time.`,
    state: { ...blank(), leftTitle: "main pile", rightTitle: "helper pile", left: plates(main, () => "faded"), returned, counter: { label: "plates moved", value: moves } },
  });
  return frames;
}

function insightFrames(ops: Op[]): Frame[] {
  const waiting: number[] = [];
  for (const op of ops) {
    if (op.kind === "push") waiting.push(op.value);
    else break;
  }
  if (waiting.length === 0) return [];
  const reversed = [...waiting].reverse();
  return [
    {
      scene: "insight",
      caption: `Picture two plate piles. New plates go on the in pile, so ${waiting[0]}, the front of the line, is at the bottom.`,
      state: { ...blank(), left: plates(waiting, (_, level) => (level === 0 ? "miss" : "idle")) },
    },
    {
      scene: "insight",
      caption: `Pour the in pile onto the empty out pile. Pouring turns it upside down: ${waiting[0]} is now on top.`,
      state: { ...blank(), right: plates(reversed, (_, level) => (level === reversed.length - 1 ? "done" : "idle")), pouring: true },
    },
    {
      scene: "insight",
      caption: "Those plates stay in the out pile, already in line order. New plates wait in the in pile until the out pile runs empty.",
      state: { ...blank(), right: plates(reversed, (_, level) => (level === reversed.length - 1 ? "done" : "hit")) },
    },
  ];
}

function frontQuiz(inPile: number[], outPile: number[], op: string): StoryQuiz {
  const cells = inPile.length + outPile.length;
  const answer = outPile.length > 0 ? inPile.length + outPile.length - 1 : 0;
  const feedback: Record<number, string> = {};
  for (let level = 0; level < inPile.length; level++) {
    if (level === answer) continue;
    feedback[level] =
      outPile.length > 0
        ? `Plate ${inPile[level]} is in the in pile. It arrived after every plate in the out pile.`
        : `Plate ${inPile[level]} came in after other plates. The line serves the plate that came first.`;
  }
  for (let level = 0; level < outPile.length - 1; level++) {
    feedback[inPile.length + level] = `Plate ${outPile[level]} is under other plates in the out pile. The top of the out pile goes first.`;
  }
  return {
    kind: "cell",
    cells,
    question: `The call is ${op}. Which plate is the front of the line? Click it.`,
    answer,
    feedback,
    otherwise: "Which plate has waited the longest?",
    why:
      outPile.length > 0
        ? "The top of the out pile. Every plate there arrived before any plate in the in pile."
        : "The bottom plate of the in pile. The out pile is empty, so we pour to bring it to the top.",
  };
}

/** The real two-pile queue, one frame per change. `practice` asks at every pop and peek. */
function solutionFrames(ops: Op[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const inPile: number[] = [];
  const outPile: number[] = [];
  const returned: string[] = [];
  let pours = 0;
  let pushes = 0;
  let most = 0;
  let askedPour = false;
  let askedWait = false;
  let showedTrap = false;
  const line = (index: number) => (practice ? undefined : index);
  const base = (op: string | null): PlatePilesState => ({ ...blank(), left: plates(inPile), right: plates(outPile), op, returned: [...returned] });
  const topTone = (count: number, tone: CellTone) => (_: number, level: number) => (level === count - 1 ? tone : "idle");

  frames.push({
    scene,
    caption: practice ? `Your turn, on new calls: ${ops.map(opText).join(", ")}. You pick which plate leaves.` : "Both plate piles start empty: the in pile on the left, the out pile on the right.",
    codeLine: line(0),
    state: base(null),
  });

  for (const op of ops) {
    const name = opText(op);
    if (op.kind === "push") {
      inPile.push(op.value);
      pushes++;
      most = Math.max(most, inPile.length + outPile.length);
      frames.push({
        scene,
        caption: `${name}: plate ${op.value} goes on top of the in pile.`,
        codeLine: line(1),
        state: { ...base(name), left: plates(inPile, topTone(inPile.length, "edge")) },
      });
      continue;
    }
    if (op.kind === "empty") {
      const isEmpty = inPile.length === 0 && outPile.length === 0;
      returned.push(String(isEmpty));
      frames.push({
        scene,
        caption: isEmpty ? "empty: both piles hold no plates, so the line is empty. It returns true." : "empty: a pile still holds plates, so the line is not empty. It returns false.",
        codeLine: line(9),
        state: base(name),
      });
      continue;
    }

    const mustPour = outPile.length === 0;
    const ask = practice || (mustPour ? !askedPour : !askedWait);
    const before: Frame = { scene, caption: "", codeLine: line(3), state: base(name) };
    if (mustPour) {
      before.caption = `${name}: the out pile is empty. The front of the line is buried at the bottom of the in pile.`;
      if (ask) {
        askedPour = true;
        before.quiz = frontQuiz(inPile, outPile, name);
      }
      frames.push(before);
      const moved = inPile.length;
      while (inPile.length) outPile.push(inPile.pop() as number);
      pours += moved;
      frames.push({
        scene,
        caption: `Pour ${moved === 1 ? "the 1 plate" : `all ${moved} plates`} onto the out pile. It turns upside down, and plate ${outPile[outPile.length - 1]} lands on top.`,
        codeLine: line(4),
        state: { ...base(name), right: plates(outPile, topTone(outPile.length, "done")), pouring: true },
      });
    } else {
      before.caption = `${name}: the out pile still has plates, and the in pile has newer ones.`;
      if (ask) {
        askedWait = true;
        before.quiz = frontQuiz(inPile, outPile, name);
      }
      frames.push(before);
      frames.push({
        scene,
        caption: `No pour. Plate ${outPile[outPile.length - 1]} on top of the out pile is the front of the line.`,
        codeLine: line(3),
        state: { ...base(name), right: plates(outPile, topTone(outPile.length, "done")) },
      });
      if (!showedTrap && inPile.length > 0) {
        showedTrap = true;
        const wrong = [...outPile, ...[...inPile].reverse()];
        frames.push({
          scene,
          caption: `The Early Pour Trap: pouring now would put plate ${wrong[wrong.length - 1]} on top, and it would leave first. Pour only when the out pile is empty.`,
          codeLine: line(3),
          state: {
            ...base(name),
            right: plates(outPile, topTone(outPile.length, "done")),
            trapPile: plates(wrong, (_, level) => (level === wrong.length - 1 ? "miss" : level >= outPile.length ? "window" : "idle")),
          },
        });
      }
    }
    const front = outPile[outPile.length - 1];
    if (op.kind === "pop") outPile.pop();
    returned.push(String(front));
    frames.push({
      scene,
      caption: op.kind === "pop" ? `pop: take plate ${front} off the out pile. It returns ${front}.` : `peek: look at plate ${front} and leave it on the pile. It returns ${front}.`,
      codeLine: line(op.kind === "pop" ? 8 : 6),
      state: base(name),
    });
  }

  const answer = `[${returned.join(",")}]`;
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${answer}. You never poured onto a pile that still had plates.` : `All calls are done. The answer is ${answer}.`,
    state: { ...base(null), note: "every plate left in the order it arrived" },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(1) average. Each plate was poured at most once: ${pours} pours for ${pushes} plates, however many calls there were.`,
      codeLine: 4,
      state: { ...base(null), counter: { label: "plates poured", value: pours } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). The two piles only hold the plates that are waiting, at most ${most} here.`,
      codeLine: 0,
      state: { ...base(null), counter: { label: "most plates waiting", value: most } },
    });
  }
  return frames;
}

export const implementQueueUsingStacksStory: ProblemStory<PlatePilesState> = {
  slugs: ["lc-232"],
  pattern: "Design: two stacks",
  trigger: "a first-in, first-out line, but the only tool is a pile where the last item in comes out first",
  insight: "Two plate piles. New plates go on the in pile. Pouring it onto the empty out pile turns it upside down, so the oldest plate lands on top.",
  metaphor: { name: "The two plate piles", legend: "in pile = in · out pile = out · pour = move every plate from in to out", terms: ["pile", "plate", "pour"] },
  traps: [{ name: "The Early Pour Trap", rule: "Pour only when the out pile is empty. Pouring onto plates that are still waiting buries the front of the line under newer plates." }],
  template: [
    "push: add to the in pile",
    "pop / peek: if the out pile is empty, pour the whole in pile onto it",
    "           then use the top of the out pile",
    "empty: both piles are empty",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(1) average",
    timeWhy: "each plate is poured at most once, so a long pour is paid for by the pushes before it",
    space: "O(n)",
    spaceWhy: "the two piles hold the waiting plates between them",
  },
  code: CODE,
  examples: [
    { label: "four plates, one arrives late", input: "push 1, push 2, push 3, pop, push 4, pop, pop, pop, empty", expected: "[1,2,3,4,true]" },
    { label: "peek, then a late plate", input: "push 5, push 6, peek, pop, push 7, pop, pop, empty", expected: "[5,5,6,7,true]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-155", title: "Min Stack" },
    { slug: "lc-146", title: "LRU Cache" },
    { slug: "lc-20", title: "Valid Parentheses" },
  ],
  answer: (input) => solve(parse(input)),
  frames: (input) => {
    const ops = parse(input);
    const picture = insightFrames(ops)[1]?.state ?? blank();
    return [
      ...pictureFrames(ops),
      ...slowFrames(ops),
      ...insightFrames(ops),
      ...solutionFrames(ops),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...picture, note: "pour only when the out pile is empty" },
      },
    ];
  },
  View: PlatePilesView,
};
