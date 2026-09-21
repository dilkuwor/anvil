import type { CellTone } from "@/components/learn/viz/primitives";

import {
  GrokPlateStackView,
  pickCount,
  platePick,
  topPlatePick,
  type Plate,
  type PlateStackState,
} from "../grok-plate-stack-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<PlateStackState>;
type Op = { op: "push" | "pop" | "top" | "getMin"; val: number };

const PRACTICE = "push 4, push 2, push 1, getMin, pop, getMin";

const CODE = [
  "Deque<int[]> pile = new ArrayDeque<>();",
  "void push(int val) {",
  "    int min = pile.isEmpty() ? val : Math.min(val, pile.peek()[1]);",
  "    pile.addFirst(new int[] {val, min});",
  "}",
  "void pop() { pile.removeFirst(); }",
  "int top() { return pile.peek()[0]; }",
  "int getMin() { return pile.peek()[1]; }",
];

function parse(raw: string): Op[] {
  const ops: Op[] = [];
  const re = /(push)\s+(-?\d+)|(pop|top|getMin)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    if (match[1] === "push") ops.push({ op: "push", val: Number(match[2]) });
    else if (match[3] === "pop" || match[3] === "top" || match[3] === "getMin") ops.push({ op: match[3], val: 0 });
  }
  return ops;
}

function labelOf(op: Op): string {
  return op.op === "push" ? `push ${op.val}` : op.op;
}

function solve(ops: Op[]): number[] {
  const pile: { val: number; min: number }[] = [];
  const out: number[] = [];
  for (const op of ops) {
    if (op.op === "push") {
      const min = pile.length === 0 ? op.val : Math.min(op.val, pile[pile.length - 1].min);
      pile.push({ val: op.val, min });
    } else if (op.op === "pop") pile.pop();
    else if (op.op === "top") out.push(pile[pile.length - 1]?.val ?? 0);
    else out.push(pile[pile.length - 1]?.min ?? 0);
  }
  return out;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function platesOf(pile: { val: number; min: number }[], topTone?: CellTone): Plate[] {
  return pile.map((item, index) => ({
    label: String(item.val),
    note: `min ${item.min}`,
    tone: index === pile.length - 1 ? topTone : "idle",
  }));
}

function blank(tokens: string[]): PlateStackState {
  return { tokens, tokenTones: tones(tokens.length, () => null), cursor: null, plates: [], stackTitle: "value + min" };
}

function base(tokens: string[], pile: { val: number; min: number }[], cursor: number | null, extra: Partial<PlateStackState> = {}): PlateStackState {
  return {
    ...blank(tokens),
    cursor,
    plates: platesOf(pile),
    tokenTones: tones(tokens.length, (index) => (index === cursor ? "edge" : index < (cursor ?? -1) ? "faded" : null)),
    ...extra,
  };
}

function minQuiz(state: PlateStackState, pile: { val: number; min: number }[]): StoryQuiz {
  const min = pile[pile.length - 1]?.min;
  const fromBottom = pile.findIndex((item) => item.min === min && item.val === min);
  const answer = fromBottom >= 0 ? platePick(state, pile.length - 1) : topPlatePick(state);
  const feedback: Record<number, string> = {};
  state.tokens.forEach((_, index) => {
    if (index !== answer) feedback[index] = "That is a call in the row. The min is written on a plate.";
  });
  pile.forEach((item, index) => {
    const idx = platePick(state, index);
    if (idx === answer) return;
    feedback[idx] = `That plate is ${item.val}. Its written min is ${item.min}, but the live min is on the top plate.`;
  });
  return {
    kind: "cell",
    cells: pickCount(state),
    question: "Which plate holds the live min? Click it.",
    answer,
    feedback,
    otherwise: "The live min is written on the top plate, as its second number.",
    why: "Each plate stores the min of the pile at that depth. The top plate's min is getMin.",
  };
}

function pictureFrames(ops: Op[]): Frame[] {
  const tokens = ops.map(labelOf);
  const out = solve(ops);
  const firstMin = ops.findIndex((op) => op.op === "push");
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "These calls are a stack that must also return the current min, in one step, after every change.",
      state: blank(tokens),
    },
  ];
  if (firstMin >= 0) {
    frames.push({
      scene: "picture",
      caption: `A value plate is allowed. ${ops[firstMin].val} sits with its min written on the same plate.`,
      state: { ...blank(tokens), plates: platesOf([{ val: ops[firstMin].val, min: ops[firstMin].val }], "done") },
    });
  }
  frames.push({
    scene: "picture",
    caption: "Not allowed: one sticky min field. After the min plate leaves, that field has forgotten the min below.",
    state: { ...blank(tokens), minField: { value: "lost", tone: "miss" }, xMark: true },
  });
  frames.push({
    scene: "picture",
    caption: `The goal: the recorded top and getMin answers. Here that is [${out.join(",")}].`,
    state: { ...blank(tokens), result: `[${out.join(",")}]`, tokenTones: tones(tokens.length, () => "hit") },
  });
  return frames;
}

function slowFrames(ops: Op[]): Frame[] {
  const tokens = ops.map(labelOf);
  const frames: Frame[] = [];
  const pile: number[] = [];
  let looks = 0;
  const out: number[] = [];
  let shown = 0;
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.op === "push") pile.push(op.val);
    else if (op.op === "pop") pile.pop();
    else if (op.op === "top") out.push(pile[pile.length - 1] ?? 0);
    else {
      let min = pile[0] ?? 0;
      for (const value of pile) {
        looks++;
        if (value < min) min = value;
      }
      out.push(min);
      if (shown < 2) {
        frames.push({
          scene: "slow",
          caption:
            shown === 0
              ? `The slow way: on getMin, walk every value still on the pile. This walk read ${pile.length} plate${pile.length === 1 ? "" : "s"}.`
              : `getMin walks the pile again. We have now looked at ${looks} plates in total.`,
          state: {
            ...blank(tokens),
            cursor: i,
            plates: pile.map((val) => ({ label: String(val), tone: "window" as const })),
            counter: { label: "plates looked at", value: looks },
            result: `[${out.join(",")}]`,
          },
        });
        shown++;
      }
    }
  }
  frames.push({
    scene: "slow",
    caption: `Every getMin reread the whole pile. We looked at ${looks} plates. This is O(n) time per call.`,
    state: { ...blank(tokens), result: `[${out.join(",")}]`, tokenTones: tones(tokens.length, () => "faded"), counter: { label: "plates looked at", value: looks } },
  });
  return frames;
}

function insightFrames(ops: Op[]): Frame[] {
  const tokens = ops.map(labelOf);
  const pile: { val: number; min: number }[] = [];
  let popMinAt = -1;
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.op === "push") {
      const min = pile.length === 0 ? op.val : Math.min(op.val, pile[pile.length - 1].min);
      pile.push({ val: op.val, min });
    } else if (op.op === "pop") {
      const gone = pile.pop();
      if (gone && pile.length > 0 && gone.val < (pile[pile.length - 1]?.val ?? Infinity) && popMinAt < 0) popMinAt = i;
    }
  }
  const replay: { val: number; min: number }[] = [];
  const until = popMinAt < 0 ? ops.length : popMinAt;
  for (let i = 0; i < until; i++) {
    const op = ops[i];
    if (op.op === "push") {
      const min = replay.length === 0 ? op.val : Math.min(op.val, replay[replay.length - 1].min);
      replay.push({ val: op.val, min });
    } else if (op.op === "pop") replay.pop();
  }
  const gone = replay[replay.length - 1];
  const below = replay.slice(0, -1);
  return [
    {
      scene: "insight",
      caption: "Picture plates that each carry two numbers: the value, and the min of the pile at that depth.",
      state: { ...blank(tokens), plates: platesOf(replay, "window") },
    },
    {
      scene: "insight",
      caption: gone
        ? `The top plate is ${gone.val}, and its written min is ${gone.min}. getMin only reads that second number.`
        : "The top plate's second number is the live min. getMin is one read.",
      state: { ...blank(tokens), plates: platesOf(replay, "edge") },
    },
    {
      scene: "insight",
      caption: below.length
        ? `The Lost Min Trap. A single min field would stay at ${gone?.min} after this plate leaves. The plate below still has min ${below[below.length - 1].min}.`
        : "When a plate leaves, the min below is still written on the next plate. Nothing is forgotten.",
      state: {
        ...blank(tokens),
        plates: platesOf(below.length ? below : replay, "done"),
        minField: gone ? { value: String(gone.min), tone: "miss" } : null,
        xMark: Boolean(gone && below.length),
      },
    },
  ];
}

function solutionFrames(ops: Op[], scene: SceneId = "solution", practice = false): Frame[] {
  const tokens = ops.map(labelOf);
  const frames: Frame[] = [];
  const pile: { val: number; min: number }[] = [];
  const out: number[] = [];
  let asked = false;
  let showedTrap = false;
  let fullest = 0;
  const line = (index: number) => (practice ? undefined : index);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new run: ${tokens.join(", ")}. You point at the plate that holds the live min.`
      : "The pile starts empty. Each new plate will remember the min at its depth.",
    codeLine: line(0),
    state: blank(tokens),
  });

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.op === "push") {
      const min = pile.length === 0 ? op.val : Math.min(op.val, pile[pile.length - 1].min);
      pile.push({ val: op.val, min });
      fullest = Math.max(fullest, pile.length);
      frames.push({
        scene,
        caption: `Set down ${op.val}. Write min ${min} on the same plate. The top plate now holds both.`,
        codeLine: line(3),
        state: { ...base(tokens, pile, i), plates: platesOf(pile, "edge") },
      });
      continue;
    }
    if (op.op === "pop") {
      const gone = pile[pile.length - 1];
      pile.pop();
      if (gone && pile.length > 0 && gone.min < pile[pile.length - 1].min && !showedTrap && !practice) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The Lost Min Trap. A single min field would stay at ${gone.min}. The plate below still has min ${pile[pile.length - 1].min}.`,
          codeLine: line(5),
          state: {
            ...base(tokens, pile, i, { minField: { value: String(gone.min), tone: "miss" }, xMark: true }),
            plates: platesOf(pile, "done"),
          },
        });
      }
      frames.push({
        scene,
        caption: `Take the top plate ${gone?.val} off. The min below is still written on the new top plate.`,
        codeLine: line(5),
        state: { ...base(tokens, pile, i), plates: platesOf(pile, pile.length ? "edge" : undefined) },
      });
      continue;
    }
    if (op.op === "top") {
      const val = pile[pile.length - 1]?.val ?? 0;
      out.push(val);
      frames.push({
        scene,
        caption: `top reads the value on the top plate: ${val}.`,
        codeLine: line(6),
        state: { ...base(tokens, pile, i, { result: `[${out.join(",")}]` }), plates: platesOf(pile, "edge") },
      });
      continue;
    }

    const ask = practice || !asked;
    const before = base(tokens, pile, i, { result: `[${out.join(",")}]` });
    const clash: Frame = {
      scene,
      caption: ask ? "getMin is asked. Each plate already has a min written on it." : "getMin reads the min written on the top plate.",
      codeLine: line(7),
      state: before,
    };
    if (ask && pile.length > 0) {
      asked = true;
      clash.quiz = minQuiz(before, pile);
    }
    frames.push(clash);
    const min = pile[pile.length - 1]?.min ?? 0;
    out.push(min);
    frames.push({
      scene,
      caption: `The top plate's min is ${min}. getMin is that one read. Recorded so far: [${out.join(",")}].`,
      codeLine: line(7),
      state: { ...base(tokens, pile, i, { result: `[${out.join(",")}]` }), plates: platesOf(pile, "done") },
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is [${out.join(",")}].` : `Every top and getMin is recorded. The answer is [${out.join(",")}].`,
    codeLine: line(7),
    state: { ...base(tokens, pile, null, { result: `[${out.join(",")}]` }), tokenTones: tones(tokens.length, () => "done"), plates: platesOf(pile, "done") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(1). Each call only reads or writes the top plate. Here that was ${ops.length} calls.`,
      codeLine: 3,
      state: { ...blank(tokens), result: `[${out.join(",")}]`, counter: { label: "calls", value: ops.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). One pair per pushed value. Here the pile held ${fullest} plate${fullest === 1 ? "" : "s"} at its fullest.`,
      codeLine: 0,
      state: { ...blank(tokens), result: `[${out.join(",")}]`, pileLit: true, plates: platesOf(Array.from({ length: Math.max(fullest, 0) }, (_, index) => ({ val: index, min: 0 })), "window"), counter: { label: "plates at fullest", value: fullest } },
    });
  }
  return frames;
}

export const minStackStory: ProblemStory<PlateStackState> = {
  slugs: ["lc-155"],
  pattern: "Design: min stack",
  trigger: "a stack that must also return the current minimum, and every call should take one step",
  insight: "Each plate stores its value and the min of the pile at that depth. getMin reads the top plate. A pop restores the min below.",
  metaphor: {
    name: "The plate pile",
    legend: "pile = stack of (value, min) · top plate min = getMin · set down = push · take = pop",
    terms: ["plate", "pile", "min"],
  },
  traps: [
    {
      name: "The Lost Min Trap",
      rule: "A single min field is forgotten when that value leaves. Store the running min on every plate so a pop restores the min below.",
    },
  ],
  template: [
    "each plate holds (value, min at this depth);",
    "push: min = val if empty else min(val, top.min); set down (val, min);",
    "pop: take the top plate;",
    "top: value on the top plate;",
    "getMin: min on the top plate;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(1)",
    timeWhy: "each call only reads or writes the top plate",
    space: "O(n)",
    spaceWhy: "one pair per pushed value",
  },
  code: CODE,
  examples: [
    { label: "push -2, 0, -3, getMin, pop, top, getMin", input: "push -2, push 0, push -3, getMin, pop, top, getMin", expected: "[-3,0,-2]" },
    { label: "push 1, 2, getMin, top", input: "push 1, push 2, getMin, top", expected: "[1,2]" },
    { label: "push 0, 0, getMin, pop, getMin", input: "push 0, push 0, getMin, pop, getMin", expected: "[0,0]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "minimum-tracker-stack", title: "Minimum Tracker Stack" },
    { slug: "lc-895", title: "Maximum Frequency Stack" },
    { slug: "lc-146", title: "LRU Cache" },
  ],
  answer: (input) => `[${solve(parse(input)).join(",")}]`,
  frames: (input) => {
    const ops = parse(input);
    const tokens = ops.map(labelOf);
    const out = solve(ops);
    return [
      ...pictureFrames(ops),
      ...slowFrames(ops),
      ...insightFrames(ops),
      ...solutionFrames(ops),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(tokens), result: `[${out.join(",")}]`, plates: platesOf(replayLast(ops), "done") },
      },
    ];
  },
  View: GrokPlateStackView,
};

function replayLast(ops: Op[]): { val: number; min: number }[] {
  const pile: { val: number; min: number }[] = [];
  for (const op of ops) {
    if (op.op === "push") {
      const min = pile.length === 0 ? op.val : Math.min(op.val, pile[pile.length - 1].min);
      pile.push({ val: op.val, min });
    } else if (op.op === "pop") pile.pop();
  }
  return pile;
}
