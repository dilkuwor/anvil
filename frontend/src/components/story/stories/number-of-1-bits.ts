import { GrokBitsView, type GrokBitCell, type GrokBitsState } from "../grok-bits-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokBitsState>;

const PRACTICE = "13";
const WIDTH = 8;

const CODE = [
  "int count = 0;",
  "while (n != 0) {",
  "    n &= n - 1;",
  "    count++;",
  "}",
  "return count;",
];

function parse(raw: string): number {
  return Number(raw.trim());
}

function bitsOf(n: number, changed: number | null = null): GrokBitCell[] {
  const cells: GrokBitCell[] = [];
  for (let i = WIDTH - 1; i >= 0; i--) {
    const bit = (n >> i) & 1;
    cells.push({ text: String(bit), tone: WIDTH - 1 - i === changed ? "edge" : bit ? "hit" : "idle" });
  }
  return cells;
}

function lowestOneIndex(n: number): number {
  for (let b = 0; b < WIDTH; b++) if (n & (1 << b)) return WIDTH - 1 - b;
  return 0;
}

function blank(n: number, count: number | null = null): GrokBitsState {
  return {
    bits: bitsOf(n),
    bitsLabel: "n",
    changedBit: null,
    values: [{ text: String(n), tone: "idle" }],
    cursor: 0,
    mixLabel: "ones",
    mixValue: count === null ? null : String(count),
    row: null,
    note: null,
    trapNote: null,
    counter: null,
    pickOn: "bits",
  };
}

function solve(n: number): number {
  let count = 0;
  let x = n >>> 0;
  while (x) {
    x &= x - 1;
    count++;
  }
  return count;
}

function pictureFrames(n: number): Frame[] {
  const ones = solve(n);
  return [
    { scene: "picture", caption: `This number is ${n}. Each box is one bit. A 1 is a lit lamp.`, state: blank(n) },
    {
      scene: "picture",
      caption: `The lit lamps are the 1-bits. There are ${ones} of them.`,
      state: { ...blank(n, ones), bits: bitsOf(n).map((c) => ({ ...c, tone: c.text === "1" ? "done" : "faded" })) },
    },
    {
      scene: "picture",
      caption: "Shifting with a sticky sign bit would never finish on a negative number. We will drop 1s instead.",
      state: { ...blank(n), trapNote: "do not keep a sticky sign bit" },
    },
    {
      scene: "picture",
      caption: `The goal: how many 1-bits. Here that count is ${ones}.`,
      state: { ...blank(n, ones), mixValue: String(ones) },
    },
  ];
}

function slowFrames(n: number): Frame[] {
  const frames: Frame[] = [];
  let count = 0;
  let x = n;
  for (let i = 0; i < WIDTH; i++) {
    const bit = x & 1;
    count += bit;
    frames.push({
      scene: "slow",
      caption: i === 0
        ? `The slow way: look at every bit, even the zeros. The lowest bit is ${bit}.`
        : `Read the next bit: ${bit}. Zeros still cost a look.`,
      state: { ...blank(n, count), changedBit: WIDTH - 1 - i, bits: bitsOf(x, WIDTH - 1), counter: { label: "bits read", value: String(i + 1) } },
    });
    x >>>= 1;
  }
  frames.push({
    scene: "slow",
    caption: `We always read all ${WIDTH} bits. This is O(1) for a fixed width, but we paid for every zero too.`,
    state: { ...blank(0, count), counter: { label: "bits read", value: String(WIDTH) } },
  });
  return frames;
}

function insightFrames(n: number): Frame[] {
  const low = lowestOneIndex(n);
  const dropped = n & (n - 1);
  return [
    {
      scene: "insight",
      caption: n === 0
        ? "Picture lamps on a strip. None are lit, so there is nothing to drop."
        : `Picture lamps on a strip. Mixing n with n minus 1 drops the lowest lit lamp.`,
      state: { ...blank(n), changedBit: n === 0 ? null : low, bits: bitsOf(n, low) },
    },
    {
      scene: "insight",
      caption: n === 0
        ? "The count stays 0."
        : `After one drop the strip is ${dropped}. Count one, then repeat until every lamp is off.`,
      state: { ...blank(dropped, n === 0 ? 0 : 1), bits: bitsOf(dropped) },
    },
    {
      scene: "insight",
      caption: "The Arithmetic Shift Trap: shifting a negative number keeps the sign lamp on, so the loop never ends. Drop 1s instead.",
      state: { ...blank(n), trapNote: "The Arithmetic Shift Trap" },
    },
  ];
}

function dropQuiz(n: number): StoryQuiz {
  const answer = lowestOneIndex(n);
  const feedback: Record<number, string> = {};
  for (let i = 0; i < WIDTH; i++) {
    if (i === answer) continue;
    feedback[i] = bitsOf(n)[i].text === "1" ? "That lamp is lit, but it is not the lowest 1." : "That lamp is already off.";
  }
  return {
    kind: "cell",
    cells: WIDTH,
    numbered: true,
    question: "Which lamp turns off first? Click the lowest lit lamp.",
    answer,
    feedback,
    otherwise: "Drop the lowest lit lamp, the 1 nearest the right.",
    why: "Mixing n with n minus 1 clears the lowest 1-bit and leaves the others.",
  };
}

function shiftQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "Why do we drop 1-bits instead of shifting with a sticky sign bit?",
    options: ["A sticky sign bit never leaves, so a negative n would loop forever", "Shifting is always faster, even when the sign bit sticks"],
    answer: 0,
    why: "The Arithmetic Shift Trap keeps the high 1. Dropping the lowest 1 skips zeros and always finishes.",
  };
}

function solutionFrames(n0: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let n = n0 >>> 0;
  let count = 0;
  let askedDrop = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new number: ${n0}. You drop each lit lamp.` : "The count starts at 0. We drop one 1-bit at a time.",
    codeLine: line(0),
    state: blank(n, 0),
  });

  if (n !== 0) {
    frames.push({
      scene,
      caption: "A sign bit that never leaves would trap us. We drop 1s instead.",
      codeLine: line(1),
      quiz: shiftQuiz(),
      state: { ...blank(n, 0), trapNote: "The Arithmetic Shift Trap" },
    });
  }

  while (n !== 0) {
    const look: Frame = {
      scene,
      caption: `The strip still has a 1. The number is ${n}.`,
      codeLine: line(1),
      state: { ...blank(n, count), bits: bitsOf(n) },
    };
    if (practice || !askedDrop) {
      askedDrop = true;
      look.quiz = dropQuiz(n);
    }
    frames.push(look);
    const next = n & (n - 1);
    const changed = lowestOneIndex(n);
    n = next;
    count++;
    frames.push({
      scene,
      caption: `Drop that lamp. Count is ${count}. The strip is now ${n}.`,
      codeLine: line(2),
      state: { ...blank(n, count), changedBit: changed, bits: bitsOf(n) },
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${count}. You dropped every lamp.` : `Every lamp is off. The answer is ${count}.`,
    codeLine: line(5),
    state: { ...blank(0, count), mixValue: String(count) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(k). Each drop clears one 1. k is how many ones, at most ${WIDTH} here.`,
      codeLine: 1,
      state: { ...blank(0, count), counter: { label: "ones dropped", value: String(count) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the count is stored.",
      codeLine: 0,
      state: { ...blank(0, count), counter: { label: "numbers stored", value: "1" } },
    });
  }
  return frames;
}

export const numberOfOneBitsStory: ProblemStory<GrokBitsState> = {
  slugs: ["lc-191"],
  pattern: "Bit counting",
  trigger: "return how many bits are set to 1 (the Hamming weight)",
  insight: "Lamps on a strip. Mixing n with n minus 1 drops the lowest lit lamp. Count the drops until the strip is dark.",
  metaphor: { name: "The lamp strip", legend: "lamp = a 1-bit · drop = n & (n-1) · count = how many drops", terms: ["lamp", "strip", "drop", "bit"] },
  traps: [
    {
      name: "The Arithmetic Shift Trap",
      rule: "An arithmetic shift keeps the sign bit. Drop 1-bits with n & (n - 1), or use an unsigned shift.",
    },
  ],
  template: [
    "count = 0",
    "while n is not 0:",
    "    n = n mixed with n-1  // drops lowest 1",
    "    count++",
    "return count",
  ],
  complexity: {
    slow: "O(1)",
    time: "O(k)",
    timeWhy: "each step clears one 1-bit; k is how many ones n has",
    space: "O(1)",
    spaceWhy: "only the count",
  },
  code: CODE,
  examples: [
    { label: "11", input: "11", expected: "3" },
    { label: "8", input: "8", expected: "1" },
    { label: "0", input: "0", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-338", title: "Counting Bits" },
    { slug: "lc-136", title: "Single Number" },
    { slug: "lc-268", title: "Missing Number" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const n = parse(input);
    const count = solve(n);
    return [
      ...pictureFrames(n),
      ...slowFrames(n),
      ...insightFrames(n),
      ...solutionFrames(n),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(n, count), bits: bitsOf(n).map((c) => ({ ...c, tone: c.text === "1" ? "done" : "faded" })) },
      },
    ];
  },
  View: GrokBitsView,
};
