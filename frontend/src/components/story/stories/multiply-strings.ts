import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokDigitGridView, type GrokDigitGridState } from "../grok-digit-grid-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokDigitGridState>;
type Pair = { a: string; b: string };

const PRACTICE = '"12"*"13"';

const CODE = [
  "int m = num1.length();",
  "int n = num2.length();",
  "int[] digits = new int[m + n];",
  "for (int i = m - 1; i >= 0; i--) {",
  "    for (int j = n - 1; j >= 0; j--) {",
  "        int product = (num1.charAt(i) - '0') * (num2.charAt(j) - '0');",
  "        int low = i + j + 1;",
  "        int total = product + digits[low];",
  "        digits[low] = total % 10;",
  "        digits[i + j] += total / 10;",
  "    }",
  "}",
  "StringBuilder sb = new StringBuilder();",
  "for (int digit : digits) {",
  "    if (sb.length() > 0 || digit != 0) sb.append(digit);",
  "}",
  "return sb.length() == 0 ? \"0\" : sb.toString();",
];

function parse(raw: string): Pair {
  const found = [...raw.matchAll(/"(\d+)"/g)].map((m) => m[1]);
  if (found.length >= 2) return { a: found[0], b: found[1] };
  const parts = raw.split("*").map((p) => p.trim().replace(/"/g, ""));
  return { a: parts[0] ?? "0", b: parts[1] ?? "0" };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(pair: Pair, digits?: number[]): GrokDigitGridState {
  const d = digits ?? Array.from({ length: pair.a.length + pair.b.length }, () => 0);
  return { num1: pair.a, num2: pair.b, i: null, j: null, digits: d, digitTones: tones(d.length, () => null), trapSlot: null, product: null, note: null, trapNote: null, counter: null };
}

function multiply(a: string, b: string): string {
  if (a === "0" || b === "0") return "0";
  const digits = Array.from({ length: a.length + b.length }, () => 0);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const product = (a.charCodeAt(i) - 48) * (b.charCodeAt(j) - 48);
      const low = i + j + 1;
      const total = product + digits[low];
      digits[low] = total % 10;
      digits[i + j] += Math.floor(total / 10);
    }
  }
  const out = digits.join("").replace(/^0+/, "");
  return out || "0";
}

function pictureFrames(pair: Pair): Frame[] {
  const product = multiply(pair.a, pair.b);
  const m = pair.a.length;
  const n = pair.b.length;
  return [
    { scene: "picture", caption: `Two numbers as strings: ${pair.a} and ${pair.b}. We multiply them by hand, digit by digit.`, state: blank(pair) },
    {
      scene: "picture",
      caption: `The product of a digit at place i and a digit at place j lands in the ones slot i+j+1.`,
      state: { ...blank(pair), i: m - 1, j: n - 1, note: "ones land at i+j+1" },
    },
    {
      scene: "picture",
      caption: "The Ones Place Trap would write the ones digit into i+j, one slot too far left.",
      state: { ...blank(pair), i: m - 1, j: n - 1, trapSlot: m + n - 2, trapNote: "The Ones Place Trap" },
    },
    {
      scene: "picture",
      caption: `The goal: the product as a string. Here it is ${product}.`,
      state: { ...blank(pair), product },
    },
  ];
}

function slowFrames(pair: Pair): Frame[] {
  const frames: Frame[] = [];
  let adds = 0;
  const rows: string[] = [];
  if (pair.a === "0" || pair.b === "0") {
    return [
      { scene: "slow", caption: "The slow way: build each partial product as a string, then add. A zero factor is just 0.", state: { ...blank(pair), product: "0", counter: { label: "rows added", value: "0" } } },
      { scene: "slow", caption: "That still copies digits over and over. This is slower than one shared place row.", state: { ...blank(pair), product: "0", counter: { label: "rows added", value: "0" } } },
    ];
  }
  for (let j = pair.b.length - 1; j >= 0; j--) {
    const d = pair.b.charCodeAt(j) - 48;
    let carry = 0;
    let row = "";
    for (let z = 0; z < pair.b.length - 1 - j; z++) row += "0";
    for (let i = pair.a.length - 1; i >= 0; i--) {
      adds++;
      const prod = (pair.a.charCodeAt(i) - 48) * d + carry;
      row = String(prod % 10) + row;
      carry = Math.floor(prod / 10);
    }
    if (carry) row = String(carry) + row;
    rows.push(row);
    if (frames.length < 3) {
      frames.push({
        scene: "slow",
        caption: j === pair.b.length - 1
          ? `The slow way: multiply ${pair.a} by ${d}, then add that row as a string.`
          : `Build another row for digit ${d} and add it onto the running total.`,
        state: { ...blank(pair), i: pair.a.length - 1, j, note: `row ${row}`, counter: { label: "digits written", value: String(adds) } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We wrote ${adds} digits across ${rows.length} rows. This copies strings over and over.`,
    state: { ...blank(pair), product: multiply(pair.a, pair.b), counter: { label: "digits written", value: String(adds) } },
  });
  return frames;
}

function insightFrames(pair: Pair): Frame[] {
  const m = pair.a.length;
  const n = pair.b.length;
  const low = m - 1 + (n - 1) + 1;
  const wrong = m - 1 + (n - 1);
  return [
    {
      scene: "insight",
      caption: `Picture a row of places, length ${m + n}. Ones of the first pair land at slot ${low}.`,
      state: { ...blank(pair), i: m - 1, j: n - 1, digitTones: tones(m + n, (k) => (k === low ? "edge" : null)) },
    },
    {
      scene: "insight",
      caption: "The tens of that product sit one slot to the left. Later pairs add into the same row.",
      state: { ...blank(pair), i: m - 1, j: n - 1, digitTones: tones(m + n, (k) => (k === low ? "done" : k === wrong ? "window" : null)) },
    },
    {
      scene: "insight",
      caption: `The Ones Place Trap writes ones into slot ${wrong}. The right slot is ${low}.`,
      state: { ...blank(pair), i: m - 1, j: n - 1, trapSlot: wrong, trapNote: "The Ones Place Trap" },
    },
  ];
}

function placeQuiz(low: number, cells: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let i = 0; i < cells; i++) {
    if (i === low) continue;
    feedback[i] = i === low - 1 ? "That is the Ones Place Trap. i+j is where the carry goes, not the ones." : "Ones of this pair land at i+j+1.";
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "Where does the ones digit of this pair land? Click that place.",
    answer: low,
    feedback,
    otherwise: "The ones digit lands one place to the right of the carry.",
    why: "The product of places i and j writes ones at i+j+1. The carry goes to i+j.",
  };
}

function solutionFrames(pair: Pair, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const m = pair.a.length;
  const n = pair.b.length;
  const digits = Array.from({ length: m + n }, () => 0);
  let askedPlace = false;
  let showedTrap = false;

  frames.push({
    scene,
    caption: practice ? `Your turn: ${pair.a} times ${pair.b}. You pick the ones place.` : `A place row of ${m + n} zeros. We fill it from the right.`,
    codeLine: line(2),
    state: blank(pair, [...digits]),
  });

  if (pair.a === "0" || pair.b === "0") {
    frames.push({
      scene,
      caption: practice ? "Done. The answer is 0." : "A zero factor. The answer is 0.",
      codeLine: line(16),
      state: { ...blank(pair, [...digits]), product: "0" },
    });
  } else {
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        const product = (pair.a.charCodeAt(i) - 48) * (pair.b.charCodeAt(j) - 48);
        const low = i + j + 1;
        const look: Frame = {
          scene,
          caption: `Multiply ${pair.a[i]} by ${pair.b[j]}, which is ${product}.`,
          codeLine: line(5),
          state: { ...blank(pair, [...digits]), i, j, digitTones: tones(digits.length, (k) => (k === low ? "window" : null)) },
        };
        if (practice || !askedPlace) {
          askedPlace = true;
          look.quiz = placeQuiz(low, digits.length);
        }
        frames.push(look);
        if (!showedTrap && !practice) {
          showedTrap = true;
          frames.push({
            scene,
            caption: `The Ones Place Trap! Slot ${i + j} is for the carry, not the ones digit.`,
            codeLine: line(6),
            state: { ...blank(pair, [...digits]), i, j, trapSlot: i + j, trapNote: "The Ones Place Trap" },
          });
        }
        const total = product + digits[low];
        digits[low] = total % 10;
        digits[i + j] += Math.floor(total / 10);
        frames.push({
          scene,
          caption: `Write ones ${total % 10} at place ${low}. Carry ${Math.floor(total / 10)} sits to the left.`,
          codeLine: line(8),
          state: { ...blank(pair, [...digits]), i, j, digitTones: tones(digits.length, (k) => (k === low ? "done" : k === i + j ? "window" : null)) },
        });
      }
    }
    const product = digits.join("").replace(/^0+/, "") || "0";
    frames.push({
      scene,
      caption: practice ? `Skip leading zeros. Done. The answer is ${product}.` : `Skip leading zeros. The answer is ${product}.`,
      codeLine: line(16),
      state: { ...blank(pair, [...digits]), product },
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(mn). Each pair of digits is multiplied once.`,
      codeLine: 3,
      state: { ...blank(pair, [...digits]), product: multiply(pair.a, pair.b), counter: { label: "pairs", value: String(m * n) } },
    });
    frames.push({
      scene,
      caption: "Space: O(m + n). The place row has one slot per output digit.",
      codeLine: 2,
      state: { ...blank(pair, [...digits]), product: multiply(pair.a, pair.b), counter: { label: "place slots", value: String(m + n) } },
    });
  }
  return frames;
}

export const multiplyStringsStory: ProblemStory<GrokDigitGridState> = {
  slugs: ["lc-43"],
  pattern: "Digit array multiplication",
  trigger: "multiply two non-negative integers given as strings, without a big-integer type",
  insight: "A row of places. The product of digits at i and j writes ones at i+j+1 and carry at i+j. Then skip leading zeros.",
  metaphor: { name: "The place row", legend: "low = i+j+1 (ones) · i+j = carry · digits = the place row", terms: ["place", "ones", "carry", "row"] },
  traps: [
    {
      name: "The Ones Place Trap",
      rule: "The ones digit of the product of i and j lands at i+j+1. The carry goes to i+j.",
    },
  ],
  template: [
    "digits = zeros of length m+n",
    "for i, j from the right:",
    "    add product onto digits[i+j+1]",
    "    write ones there, carry into i+j",
    "skip leading zeros",
  ],
  complexity: {
    slow: "O(n (m + n))",
    time: "O(mn)",
    timeWhy: "each pair of digits is multiplied once",
    space: "O(m + n)",
    spaceWhy: "the digit array has one slot per output place",
  },
  code: CODE,
  examples: [
    { label: "12 × 12", input: '"12"*"12"', expected: "144" },
    { label: "2 × 3", input: '"2"*"3"', expected: "6" },
    { label: "0 × 52", input: '"0"*"52"', expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-2", title: "Add Two Numbers" },
    { slug: "lc-8", title: "String to Integer (atoi)" },
    { slug: "lc-273", title: "Integer to English Words" },
  ],
  answer: (input) => {
    const pair = parse(input);
    return String(Number(pair.a) * Number(pair.b));
  },
  frames: (input) => {
    const pair = parse(input);
    const product = multiply(pair.a, pair.b);
    const digits = Array.from({ length: pair.a.length + pair.b.length }, () => 0);
    return [
      ...pictureFrames(pair),
      ...slowFrames(pair),
      ...insightFrames(pair),
      ...solutionFrames(pair),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(pair, digits), product },
      },
    ];
  },
  View: GrokDigitGridView,
};
