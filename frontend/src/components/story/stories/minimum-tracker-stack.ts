import type { CellTone } from "@/components/learn/viz/primitives";

import {
  GrokPlateStackView,
  otherPick,
  pickCount,
  type Plate,
  type PlateStackState,
} from "../grok-plate-stack-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<PlateStackState>;
type Op = { op: "push" | "pop" | "top" | "getMin"; val: number };

const PRACTICE = "push 3, push 3, getMin, pop, getMin";

const CODE = [
  "Deque<Integer> values = new ArrayDeque<>();",
  "Deque<Integer> mins = new ArrayDeque<>();",
  "void push(int val) {",
  "    values.addFirst(val);",
  "    if (mins.isEmpty() || val <= mins.peek()) mins.addFirst(val);",
  "}",
  "void pop() {",
  "    int v = values.removeFirst();",
  "    if (v == mins.peek()) mins.removeFirst();",
  "}",
  "int top() { return values.peek(); }",
  "int getMin() { return mins.peek(); }",
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
  const values: number[] = [];
  const mins: number[] = [];
  const out: number[] = [];
  for (const op of ops) {
    if (op.op === "push") {
      values.push(op.val);
      if (mins.length === 0 || op.val <= mins[mins.length - 1]) mins.push(op.val);
    } else if (op.op === "pop") {
      const v = values.pop();
      if (v === mins[mins.length - 1]) mins.pop();
    } else if (op.op === "top") out.push(values[values.length - 1] ?? 0);
    else out.push(mins[mins.length - 1] ?? 0);
  }
  return out;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function platesOf(values: number[], topTone?: CellTone): Plate[] {
  return values.map((label, index) => ({ label: String(label), tone: index === values.length - 1 ? topTone : "idle" }));
}

function blank(tokens: string[]): PlateStackState {
  return {
    tokens,
    tokenTones: tones(tokens.length, () => null),
    cursor: null,
    plates: [],
    stackTitle: "values",
    otherPlates: [],
    otherTitle: "mins",
  };
}

function base(tokens: string[], values: number[], mins: number[], cursor: number | null, extra: Partial<PlateStackState> = {}): PlateStackState {
  return {
    ...blank(tokens),
    cursor,
    plates: platesOf(values),
    otherPlates: platesOf(mins),
    tokenTones: tones(tokens.length, (index) => (index === cursor ? "edge" : index < (cursor ?? -1) ? "faded" : null)),
    ...extra,
  };
}

function minPlateQuiz(state: PlateStackState, mins: number[]): StoryQuiz {
  const answer = otherPick(state, mins.length - 1);
  const feedback: Record<number, string> = {};
  state.tokens.forEach((_, index) => {
    if (index !== answer) feedback[index] = "That is a call in the row. The live min is a plate on the min pile.";
  });
  state.plates.forEach((plate, fromBottom) => {
    const idx = state.tokens.length + (state.askNone ? 1 : 0) + fromBottom;
    if (idx !== answer) feedback[idx] = `That is a value plate ${plate.label}. The live min sits on the min pile.`;
  });
  mins.forEach((value, fromBottom) => {
    const idx = otherPick(state, fromBottom);
    if (idx === answer) return;
    feedback[idx] = `That min plate is ${value}, under the top of the min pile.`;
  });
  return {
    kind: "cell",
    cells: pickCount(state),
    question: "Which plate is the live min? Click it.",
    answer,
    feedback,
    otherwise: "The live min is the plate on top of the min pile.",
    why: "getMin reads the top of the min pile. That pile is the history of mins.",
  };
}

function pictureFrames(ops: Op[]): Frame[] {
  const tokens = ops.map(labelOf);
  const out = solve(ops);
  return [
    {
      scene: "picture",
      caption: "Two piles of plates: values, and a history of mins. Every call must take one step.",
      state: blank(tokens),
    },
    {
      scene: "picture",
      caption: "A new value that is smaller, or tied with the live min, also gets a plate on the min pile.",
      state: { ...blank(tokens), plates: platesOf([0, 0], "done"), otherPlates: platesOf([0, 0], "done") },
    },
    {
      scene: "picture",
      caption: "Not allowed: skipping a tied min. After that copy leaves, the min pile would be empty.",
      state: { ...blank(tokens), plates: platesOf([0], "miss"), otherPlates: [], xMark: true, ghostLabel: "missing 0" },
    },
    {
      scene: "picture",
      caption: `The goal: the recorded top and getMin answers. Here that is [${out.join(",")}].`,
      state: { ...blank(tokens), result: `[${out.join(",")}]`, tokenTones: tones(tokens.length, () => "hit") },
    },
  ];
}

function slowFrames(ops: Op[]): Frame[] {
  const tokens = ops.map(labelOf);
  const frames: Frame[] = [];
  const values: number[] = [];
  let looks = 0;
  const out: number[] = [];
  let shown = 0;
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.op === "push") values.push(op.val);
    else if (op.op === "pop") values.pop();
    else if (op.op === "top") out.push(values[values.length - 1] ?? 0);
    else {
      let min = values[0] ?? 0;
      for (const value of values) {
        looks++;
        if (value < min) min = value;
      }
      out.push(min);
      if (shown < 2) {
        frames.push({
          scene: "slow",
          caption:
            shown === 0
              ? `The slow way: on getMin, walk every value plate. This walk read ${values.length} plate${values.length === 1 ? "" : "s"}.`
              : `getMin walks the values again. We have now looked at ${looks} plates in total.`,
          state: {
            ...base(tokens, values, [], i),
            plates: platesOf(values, "window"),
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
    caption: `Every getMin reread the value pile. We looked at ${looks} plates. This is O(n) time per call.`,
    state: { ...blank(tokens), result: `[${out.join(",")}]`, tokenTones: tones(tokens.length, () => "faded"), counter: { label: "plates looked at", value: looks } },
  });
  return frames;
}

function insightFrames(ops: Op[]): Frame[] {
  const tokens = ops.map(labelOf);
  const values: number[] = [];
  const mins: number[] = [];
  let tieAt = -1;
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.op === "push") {
      if (mins.length > 0 && op.val === mins[mins.length - 1] && tieAt < 0) tieAt = i;
      values.push(op.val);
      if (mins.length === 0 || op.val <= mins[mins.length - 1]) mins.push(op.val);
    } else if (op.op === "pop") {
      const v = values.pop();
      if (v === mins[mins.length - 1]) mins.pop();
    }
  }
  const replayV: number[] = [];
  const replayM: number[] = [];
  const until = tieAt < 0 ? Math.min(ops.length, 3) : tieAt;
  for (let i = 0; i < until; i++) {
    const op = ops[i];
    if (op.op === "push") {
      replayV.push(op.val);
      if (replayM.length === 0 || op.val <= replayM[replayM.length - 1]) replayM.push(op.val);
    } else if (op.op === "pop") {
      const v = replayV.pop();
      if (v === replayM[replayM.length - 1]) replayM.pop();
    }
  }
  const incoming = tieAt >= 0 ? ops[tieAt].val : replayV[replayV.length - 1];
  return [
    {
      scene: "insight",
      caption: "Picture two piles. Values hold every push. Mins hold a history, a new plate only when the value is a new min or a tie.",
      state: { ...base(tokens, replayV, replayM, tieAt >= 0 ? tieAt : null), plates: platesOf(replayV, "window"), otherPlates: platesOf(replayM, "window") },
    },
    {
      scene: "insight",
      caption: `A value of ${incoming} is arriving. The live min is ${replayM[replayM.length - 1] ?? incoming}. Equal must still get a min plate.`,
      state: { ...base(tokens, replayV, replayM, tieAt, { held: String(incoming) }), plates: platesOf(replayV, "edge"), otherPlates: platesOf(replayM, "edge") },
    },
    {
      scene: "insight",
      caption: `The Strict Min Trap. If you skip a tied min, popping that copy takes the only min plate, and getMin is gone.`,
      state: {
        ...base(tokens, [...replayV, incoming ?? 0], replayM, tieAt, { xMark: true, ghostLabel: "no min plate" }),
        plates: platesOf([...replayV, incoming ?? 0], "miss"),
        otherPlates: platesOf(replayM, "miss"),
      },
    },
  ];
}

function solutionFrames(ops: Op[], scene: SceneId = "solution", practice = false): Frame[] {
  const tokens = ops.map(labelOf);
  const frames: Frame[] = [];
  const values: number[] = [];
  const mins: number[] = [];
  const out: number[] = [];
  let askedMin = false;
  let askedTie = false;
  let showedTrap = false;
  let fullest = 0;
  const line = (index: number) => (practice ? undefined : index);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new run: ${tokens.join(", ")}. You decide when a min plate is set down.`
      : "Both piles start empty. Values take every push. Mins take a new min or a tie.",
    codeLine: line(0),
    state: blank(tokens),
  });

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.op === "push") {
      const live = mins[mins.length - 1];
      const tie = mins.length > 0 && op.val === live;
      const takeMin = mins.length === 0 || op.val <= live;
      if (tie && (practice || !askedTie)) {
        askedTie = true;
        frames.push({
          scene,
          caption: `${op.val} is arriving. The min pile already has ${live} on top.`,
          codeLine: line(4),
          state: { ...base(tokens, values, mins, i, { held: String(op.val) }) },
          quiz: {
            kind: "choice",
            question: "Does this value also get a plate on the min pile?",
            options: ["Yes, a tied min still gets a min plate", "No, only a strictly smaller value does"],
            answer: 0,
            why: "A tied min must be recorded. If you skip it, popping this copy steals the only min plate.",
          },
        });
      }
      values.push(op.val);
      if (takeMin) mins.push(op.val);
      fullest = Math.max(fullest, values.length);
      if (tie && takeMin && !showedTrap && !practice) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The Strict Min Trap. Skipping this ${op.val} would leave the min pile with one copy. Popping would empty it.`,
          codeLine: line(4),
          state: {
            ...base(tokens, values, mins.slice(0, -1), i, { xMark: true, ghostLabel: "skipped tie" }),
            plates: platesOf(values, "miss"),
            otherPlates: platesOf(mins.slice(0, -1), "miss"),
          },
        });
      }
      frames.push({
        scene,
        caption: takeMin
          ? `Set ${op.val} on the value pile, and set a min plate too, because it is a new or tied min.`
          : `Set ${op.val} on the value pile only. It is bigger than the live min ${live}.`,
        codeLine: line(takeMin ? 4 : 3),
        state: { ...base(tokens, values, mins, i), plates: platesOf(values, "edge"), otherPlates: platesOf(mins, takeMin ? "edge" : "idle") },
      });
      continue;
    }
    if (op.op === "pop") {
      const v = values.pop();
      const popMin = v === mins[mins.length - 1];
      if (popMin) mins.pop();
      frames.push({
        scene,
        caption: popMin
          ? `Take ${v} off the value pile. It equals the top min plate, so that min plate leaves too.`
          : `Take ${v} off the value pile. It is not the live min, so the min pile stays.`,
        codeLine: line(8),
        state: { ...base(tokens, values, mins, i), plates: platesOf(values, "edge"), otherPlates: platesOf(mins, "edge") },
      });
      continue;
    }
    if (op.op === "top") {
      const val = values[values.length - 1] ?? 0;
      out.push(val);
      frames.push({
        scene,
        caption: `top reads the value pile: ${val}.`,
        codeLine: line(10),
        state: { ...base(tokens, values, mins, i, { result: `[${out.join(",")}]` }), plates: platesOf(values, "edge") },
      });
      continue;
    }

    const ask = practice || !askedMin;
    const before = base(tokens, values, mins, i, { result: `[${out.join(",")}]` });
    const clash: Frame = {
      scene,
      caption: ask ? "getMin is asked. The min pile is the history." : "getMin reads the top of the min pile.",
      codeLine: line(11),
      state: before,
    };
    if (ask && mins.length > 0) {
      askedMin = true;
      clash.quiz = minPlateQuiz(before, mins);
    }
    frames.push(clash);
    const min = mins[mins.length - 1] ?? 0;
    out.push(min);
    frames.push({
      scene,
      caption: `The top min plate is ${min}. Recorded so far: [${out.join(",")}].`,
      codeLine: line(11),
      state: { ...base(tokens, values, mins, i, { result: `[${out.join(",")}]` }), otherPlates: platesOf(mins, "done") },
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is [${out.join(",")}].` : `Every top and getMin is recorded. The answer is [${out.join(",")}].`,
    codeLine: line(11),
    state: { ...base(tokens, values, mins, null, { result: `[${out.join(",")}]` }), tokenTones: tones(tokens.length, () => "done") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(1). Each call only touches the top of one or two piles. Here that was ${ops.length} calls.`,
      codeLine: 4,
      state: { ...blank(tokens), result: `[${out.join(",")}]`, counter: { label: "calls", value: ops.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). Values store every push; mins store each new or tied min. Here values held ${fullest}.`,
      codeLine: 0,
      state: { ...blank(tokens), result: `[${out.join(",")}]`, pileLit: true, plates: platesOf(Array.from({ length: Math.max(fullest, 0) }, (_, index) => index), "window"), counter: { label: "value plates at fullest", value: fullest } },
    });
  }
  return frames;
}

export const minimumTrackerStackStory: ProblemStory<PlateStackState> = {
  slugs: ["minimum-tracker-stack"],
  pattern: "Design: min stack",
  trigger: "a stack that returns the current minimum as well as the top, and every call should take one step",
  insight: "Two piles. Values hold every push. Mins hold a history, including ties. Pop a min plate only when that same value leaves.",
  metaphor: {
    name: "The plate pile",
    legend: "values pile = every push · mins pile = history of mins, including ties · getMin = top of mins",
    terms: ["plate", "pile", "min"],
  },
  traps: [
    {
      name: "The Strict Min Trap",
      rule: "Push onto mins when val is <= the live min, not only when it is strictly smaller. A tied min must survive after the first copy is popped.",
    },
  ],
  template: [
    "values pile and mins pile;",
    "push: always set val on values; set val on mins if empty or val <= live min;",
    "pop: take values; take mins only if that value was the live min;",
    "top: values top; getMin: mins top;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(1)",
    timeWhy: "each call only touches the top of one or two piles",
    space: "O(n)",
    spaceWhy: "values store every push; mins store each new or tied min",
  },
  code: CODE,
  examples: [
    { label: "push 0, 1, -1, getMin, pop, getMin", input: "push 0, push 1, push -1, getMin, pop, getMin", expected: "[-1,0]" },
    { label: "push 0, 0, getMin, pop, getMin", input: "push 0, push 0, getMin, pop, getMin", expected: "[0,0]", note: "A tied min must be recorded" },
    { label: "push -2, 0, -3, getMin, pop, top, getMin", input: "push -2, push 0, push -3, getMin, pop, top, getMin", expected: "[-3,0,-2]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-155", title: "Min Stack" },
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
        state: { ...blank(tokens), result: `[${out.join(",")}]`, plates: platesOf(out.slice(0, 1), "done"), otherPlates: platesOf(out.slice(0, 1), "done") },
      },
    ];
  },
  View: GrokPlateStackView,
};
