import { GrokBitsView, type GrokBitCell, type GrokBitsState } from "../grok-bits-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokBitsState>;
type Pow = { x: number; n: number };

const PRACTICE = "2^-3";
const WIDTH = 6;

const CODE = [
  "long exponent = n;",
  "if (exponent < 0) {",
  "    x = 1 / x;",
  "    exponent = -exponent;",
  "}",
  "double result = 1;",
  "while (exponent > 0) {",
  "    if ((exponent & 1) == 1) result *= x;",
  "    x *= x;",
  "    exponent >>= 1;",
  "}",
  "return result;",
];

function parse(raw: string): Pow {
  const m = raw.trim().match(/^(-?[\d.]+)\s*\^\s*(-?\d+)$/);
  if (m) return { x: Number(m[1]), n: Number(m[2]) };
  const x = Number(raw.match(/x\s*=\s*(-?[\d.]+)/)?.[1] ?? "2");
  const n = Number(raw.match(/n\s*=\s*(-?\d+)/)?.[1] ?? "0");
  return { x, n };
}

function fmt(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const text = value.toPrecision(10).replace(/\.?0+$/, "");
  return text;
}

function bitsOf(n: number, changed: number | null = null): GrokBitCell[] {
  const cells: GrokBitCell[] = [];
  const v = Math.max(0, n);
  for (let i = WIDTH - 1; i >= 0; i--) {
    const bit = (v >> i) & 1;
    cells.push({ text: String(bit), tone: WIDTH - 1 - i === changed ? "edge" : bit ? "hit" : "idle" });
  }
  return cells;
}

function blank(p: Pow, exp: number, x: number, result: number): GrokBitsState {
  return {
    bits: bitsOf(exp),
    bitsLabel: "exponent",
    changedBit: null,
    values: [
      { text: `x=${fmt(x)}`, tone: "idle" },
      { text: `r=${fmt(result)}`, tone: "done" },
    ],
    cursor: null,
    mixLabel: "result",
    mixValue: fmt(result),
    row: null,
    note: null,
    trapNote: null,
    counter: null,
    pickOn: "bits",
  };
}

function solve(x: number, n: number): number {
  let exp = n;
  let base = x;
  if (exp < 0) {
    base = 1 / base;
    exp = -exp;
  }
  let result = 1;
  for (let i = 0; i < exp; i++) result *= base;
  return result;
}

function fast(x: number, n: number): number {
  let exp = n;
  let base = x;
  if (exp < 0) {
    base = 1 / base;
    exp = -exp;
  }
  let result = 1;
  while (exp > 0) {
    if (exp & 1) result *= base;
    base *= base;
    exp = Math.trunc(exp / 2);
  }
  return result;
}

function pictureFrames(p: Pow): Frame[] {
  const value = fast(p.x, p.n);
  return [
    { scene: "picture", caption: `Raise ${p.x} to the power ${p.n}. The exponent may be negative.`, state: blank(p, Math.abs(p.n), p.x, 1) },
    {
      scene: "picture",
      caption: p.n < 0 ? `A negative exponent inverts the base first: 1/${p.x}.` : `A positive exponent keeps the base ${p.x}.`,
      state: blank(p, Math.abs(p.n), p.n < 0 ? 1 / p.x : p.x, 1),
    },
    {
      scene: "picture",
      caption: "The MIN_VALUE Trap: negating the most negative int as an int stays negative. Copy it into a long first.",
      state: { ...blank(p, Math.abs(p.n), p.x, 1), trapNote: "The MIN_VALUE Trap" },
    },
    {
      scene: "picture",
      caption: `The goal: ${p.x} to the power ${p.n}. Here that is ${fmt(value)}.`,
      state: { ...blank(p, 0, p.x, value), mixValue: fmt(value) },
    },
  ];
}

function slowFrames(p: Pow): Frame[] {
  const frames: Frame[] = [];
  let exp = p.n;
  let x = p.x;
  if (exp < 0) {
    x = 1 / x;
    exp = -exp;
  }
  let result = 1;
  const cap = Math.min(exp, 6);
  for (let i = 0; i < cap; i++) {
    result *= x;
    frames.push({
      scene: "slow",
      caption: i === 0 ? `The slow way: multiply the base, once per remaining unit of the exponent.` : `Multiply again. That is one of ${exp} steps.`,
      state: { ...blank(p, exp - i - 1, x, result), counter: { label: "multiplies", value: String(i + 1) } },
    });
  }
  if (exp > cap) {
    for (let i = cap; i < exp; i++) result *= x;
  }
  frames.push({
    scene: "slow",
    caption: `We multiplied ${exp} times. This is O(|n|) time, too slow when the exponent is huge.`,
    state: { ...blank(p, 0, x, result), counter: { label: "multiplies", value: String(exp) } },
  });
  return frames;
}

function insightFrames(p: Pow): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Picture the exponent as bits. Square the base and walk those bits from low to high.",
      state: blank(p, Math.abs(p.n), p.x, 1),
    },
    {
      scene: "insight",
      caption: "When a bit is 1 (odd exponent), multiply the result by the current base, then square and halve.",
      state: { ...blank(p, Math.abs(p.n), p.x, 1), note: "odd bit → multiply" },
    },
    {
      scene: "insight",
      caption: "The MIN_VALUE Trap: copy n into a long before you negate. An int cannot hold the positive partner of the most negative int.",
      state: { ...blank(p, Math.abs(p.n), p.x, 1), trapNote: "The MIN_VALUE Trap" },
    },
  ];
}

function oddQuiz(odd: boolean): StoryQuiz {
  return {
    kind: "choice",
    question: "The lowest bit of the exponent is about to be read. Do we multiply the result by the current base?",
    options: ["Yes, the exponent is odd, so keep this base", "No, skip. Only even exponents multiply"],
    answer: odd ? 0 : 1,
    why: odd ? "An odd exponent means the lowest bit is 1. Multiply the result by x, then square and halve." : "An even exponent has a 0 lowest bit. Square the base and halve. Do not multiply the result.",
  };
}

function negateQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "The exponent is negative. How do we take its opposite?",
    options: ["Negate it as an int", "Copy it into a long, then negate the long"],
    answer: 1,
    why: "The MIN_VALUE Trap: the most negative int has no positive int partner. A long can hold it.",
  };
}

function solutionFrames(p: Pow, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let x = p.x;
  let exponent = p.n;
  let askedOdd = false;

  frames.push({
    scene,
    caption: practice ? `Your turn: ${p.x} to the power ${p.n}. Watch the exponent bits.` : "Copy the exponent into a long. Result starts at 1.",
    codeLine: line(0),
    state: blank(p, Math.abs(exponent), x, 1),
  });

  if (exponent < 0) {
    frames.push({
      scene,
      caption: "The exponent is negative. We must invert the base and take the opposite exponent.",
      codeLine: line(1),
      quiz: negateQuiz(),
      state: { ...blank(p, exponent, x, 1), trapNote: "The MIN_VALUE Trap" },
    });
    x = 1 / x;
    exponent = -exponent;
    frames.push({
      scene,
      caption: `Copy into a long, then negate. The MIN_VALUE Trap would fail here as an int. Base is now ${fmt(x)}.`,
      codeLine: line(3),
      state: blank(p, exponent, x, 1),
    });
  }

  let result = 1;
  while (exponent > 0) {
    const odd = (exponent & 1) === 1;
    const look: Frame = {
      scene,
      caption: `The exponent is ${exponent}. Its lowest bit is ${odd ? "1" : "0"}.`,
      codeLine: line(7),
      state: { ...blank(p, exponent, x, result), bits: bitsOf(exponent, WIDTH - 1) },
    };
    if (practice || !askedOdd) {
      askedOdd = true;
      look.quiz = oddQuiz(odd);
    }
    frames.push(look);
    if (odd) {
      result *= x;
      frames.push({
        scene,
        caption: `Multiply the result by the current base. Result is ${fmt(result)}.`,
        codeLine: line(7),
        state: blank(p, exponent, x, result),
      });
    }
    const before = exponent;
    x *= x;
    exponent >>= 1;
    const changed = bitsOf(before).findIndex((c, i) => c.text !== bitsOf(exponent)[i].text);
    frames.push({
      scene,
      caption: `Square the base to ${fmt(x)} and shift the exponent to ${exponent}. One bit walked off.`,
      codeLine: line(9),
      state: { ...blank(p, exponent, x, result), changedBit: changed >= 0 ? changed : null },
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${fmt(result)}. You read every odd bit.` : `The exponent is 0. The answer is ${fmt(result)}.`,
    codeLine: line(11),
    state: { ...blank(p, 0, x, result), mixValue: fmt(result) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log |n|). The exponent is halved every step.`,
      codeLine: 6,
      state: { ...blank(p, 0, x, result), counter: { label: "halves", value: String(Math.ceil(Math.log2(Math.abs(p.n) + 1))) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the running product and the current base. No call stack.",
      codeLine: 5,
      state: { ...blank(p, 0, x, result), counter: { label: "numbers stored", value: "2" } },
    });
  }
  return frames;
}

export const powStory: ProblemStory<GrokBitsState> = {
  slugs: ["lc-50"],
  pattern: "Fast exponentiation",
  trigger: "implement myPow(x, n): raise x to the integer power n",
  insight: "Square the base and walk the exponent bits. On a 1-bit, multiply the result by the current base. Copy a negative exponent into a long before you negate.",
  metaphor: { name: "The exponent bits", legend: "exponent bits = n · base = x · result = running product", terms: ["exponent", "bit", "base", "square"] },
  traps: [
    {
      name: "The MIN_VALUE Trap",
      rule: "Copy n into a long first, then negate the long. The most negative int has no positive int partner.",
    },
  ],
  template: [
    "exp = n as a long; if exp < 0: invert x, negate exp",
    "result = 1",
    "while exp > 0:",
    "    if exp is odd: result *= x",
    "    square x; exp = exp / 2",
    "return result",
  ],
  complexity: {
    slow: "O(|n|)",
    time: "O(log |n|)",
    timeWhy: "the exponent is halved every step",
    space: "O(1)",
    spaceWhy: "only the running product and the current base",
  },
  code: CODE,
  examples: [
    { label: "2^5", input: "2^5", expected: "32" },
    { label: "2^-2", input: "2^-2", expected: "0.25" },
    { label: "3^3", input: "3^3", expected: "27" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-338", title: "Counting Bits" },
    { slug: "lc-191", title: "Number of 1 Bits" },
    { slug: "lc-43", title: "Multiply Strings" },
  ],
  answer: (input) => {
    const p = parse(input);
    return fmt(solve(p.x, p.n));
  },
  frames: (input) => {
    const p = parse(input);
    const value = fast(p.x, p.n);
    return [
      ...pictureFrames(p),
      ...slowFrames(p),
      ...insightFrames(p),
      ...solutionFrames(p),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(p, 0, p.x, value), mixValue: fmt(value) },
      },
    ];
  },
  View: GrokBitsView,
};
