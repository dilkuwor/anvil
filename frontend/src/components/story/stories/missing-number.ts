import { GrokBitsView, type GrokBitCell, type GrokBitsState } from "../grok-bits-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokBitsState>;

const PRACTICE = "[0,1]";
const WIDTH = 4;

const CODE = [
  "int result = nums.length;",
  "for (int i = 0; i < nums.length; i++) result ^= i ^ nums[i];",
  "return result;",
];

function parse(raw: string): number[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return [];
  return inner.split(/[,\s]+/).filter(Boolean).map(Number);
}

function bitsOf(n: number, changed: number | null = null): GrokBitCell[] {
  const cells: GrokBitCell[] = [];
  for (let i = WIDTH - 1; i >= 0; i--) {
    const bit = (n >> i) & 1;
    cells.push({ text: String(bit), tone: WIDTH - 1 - i === changed ? "edge" : bit ? "hit" : "idle" });
  }
  return cells;
}

function valuesOf(nums: number[], cursor: number | null, extraN: boolean): GrokBitCell[] {
  const cells: GrokBitCell[] = nums.map((n, i) => ({ text: String(n), tone: i === cursor ? "edge" : "idle" }));
  if (extraN) cells.push({ text: `n=${nums.length}`, tone: cursor === -1 ? "edge" : "window" });
  return cells;
}

function blank(nums: number[], mix = 0): GrokBitsState {
  return {
    bits: bitsOf(mix),
    bitsLabel: "mix",
    changedBit: null,
    values: valuesOf(nums, null, true),
    cursor: null,
    mixLabel: "mix",
    mixValue: String(mix),
    row: null,
    note: null,
    trapNote: null,
    counter: null,
    pickOn: "values",
  };
}

function solve(nums: number[]): number {
  const set = new Set(nums);
  for (let i = 0; i <= nums.length; i++) if (!set.has(i)) return i;
  return nums.length;
}

function xorMissing(nums: number[]): number {
  let result = nums.length;
  for (let i = 0; i < nums.length; i++) result ^= i ^ nums[i];
  return result;
}

function pictureFrames(nums: number[]): Frame[] {
  const missing = xorMissing(nums);
  const n = nums.length;
  return [
    { scene: "picture", caption: `The boxes hold n distinct numbers from 0 through ${n}. Exactly one value in that range is missing.`, state: blank(nums) },
    {
      scene: "picture",
      caption: `The missing number is ${missing}.`,
      state: { ...blank(nums, missing), note: `missing ${missing}`, mixValue: String(missing) },
    },
    missing === n
      ? {
          scene: "picture",
          caption: `n itself is missing. Forgetting to mix n in would never see it.`,
          state: { ...blank(nums, 0), trapNote: "n is not in the row", values: valuesOf(nums, null, false) },
        }
      : {
          scene: "picture",
          caption: "n is part of the range even though it is not an index of the row.",
          state: { ...blank(nums), values: valuesOf(nums, -1, true) },
        },
    {
      scene: "picture",
      caption: `The goal: the missing number. Here it is ${missing}.`,
      state: { ...blank(nums, missing), mixValue: String(missing) },
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [];
  const sorted = [...nums].sort((a, b) => a - b);
  let compares = 0;
  for (let i = 0; i < sorted.length; i++) {
    compares++;
    if (sorted[i] !== i) {
      frames.push({
        scene: "slow",
        caption: `The slow way: sort, then look for a hole. At box ${i} we expected ${i} but found ${sorted[i]}.`,
        state: { ...blank(sorted), cursor: i, values: valuesOf(sorted, i, false), counter: { label: "compares", value: String(compares) } },
      });
      break;
    }
    if (i < 2) {
      frames.push({
        scene: "slow",
        caption: i === 0 ? "The slow way: sort the row, then walk looking for a hole." : `Index ${i} still matches. Keep walking.`,
        state: { ...blank(sorted), cursor: i, values: valuesOf(sorted, i, false), counter: { label: "compares", value: String(compares) } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `Sorting dominates. This is O(n log n) time. Mixing bits will be linear.`,
    state: { ...blank(nums), counter: { label: "compares", value: String(Math.max(compares, nums.length)) } },
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const missing = xorMissing(nums);
  return [
    {
      scene: "insight",
      caption: `Picture a mix of bits. Pair each index with the value in that box. Equal numbers cancel.`,
      state: { ...blank(nums, 0), note: "index XOR value" },
    },
    {
      scene: "insight",
      caption: `The Forgotten n Trap: the range is 0 through n. Start the mix at n, or n can never appear.`,
      state: { ...blank(nums, n), trapNote: "The Forgotten n Trap", mixValue: String(n), values: valuesOf(nums, -1, true) },
    },
    {
      scene: "insight",
      caption: `After every index and value cancel, the mix holds the missing number ${missing}.`,
      state: { ...blank(nums, missing), mixValue: String(missing) },
    },
  ];
}

function nQuiz(cells: number): StoryQuiz {
  const answer = cells - 1;
  const feedback: Record<number, string> = {};
  for (let i = 0; i < cells; i++) {
    if (i === answer) continue;
    feedback[i] = "That is a value in the row. The mix must also eat n, the length.";
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "The mix must include n. Which box is n? Click that box.",
    answer,
    feedback,
    otherwise: "n is the length of the row, drawn as its own box.",
    why: "The range is 0 through n. Start the mix at n so n can cancel with the missing value.",
  };
}

function nextQuiz(index: number, cells: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let i = 0; i < cells; i++) {
    if (i === index) continue;
    feedback[i] = i === cells - 1 ? "n is already in the mix. Next eat a row box." : "The mix walks the row from left to right.";
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "Which row box does the mix eat next? Click that box.",
    answer: index,
    feedback,
    otherwise: "Walk the row from left to right after n is in the mix.",
    why: "XOR each index with the value in that box. Pairs cancel.",
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = nums.length;
  const cells = n + 1;
  let mix = 0;
  let askedN = false;
  let askedNext = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: [${nums.join(",")}]. Include n in the mix.` : "The mix starts empty. n must enter first.",
    codeLine: line(0),
    state: { ...blank(nums, 0), mixValue: "0" },
  });

  const takeN: Frame = {
    scene,
    caption: "The range includes n, even though n is not an index of the row.",
    codeLine: line(0),
    state: { ...blank(nums, 0), values: valuesOf(nums, null, true) },
  };
  if (practice || !askedN) {
    askedN = true;
    takeN.quiz = nQuiz(cells);
  }
  frames.push(takeN);

  mix = n;
  frames.push({
    scene,
    caption: `Start the mix at n = ${n}. Forgetting this is the Forgotten n Trap.`,
    codeLine: line(0),
    state: { ...blank(nums, mix), trapNote: "The Forgotten n Trap", values: valuesOf(nums, -1, true), bits: bitsOf(mix) },
  });

  for (let i = 0; i < n; i++) {
    const look: Frame = {
      scene,
      caption: `Next mix index ${i} with the value ${nums[i]}.`,
      codeLine: line(1),
      state: { ...blank(nums, mix), values: valuesOf(nums, i, true) },
    };
    if (practice || !askedNext) {
      askedNext = true;
      look.quiz = nextQuiz(i, cells);
    }
    frames.push(look);
    const before = mix;
    mix ^= i ^ nums[i];
    const changed = bitsOf(before).findIndex((c, idx) => c.text !== bitsOf(mix)[idx].text);
    const eaten = valuesOf(nums, i, true).map((cell, idx) => (idx === i ? { ...cell, tone: "done" as const } : cell));
    frames.push({
      scene,
      caption: `The mix is now ${mix}. Pairs cancel a bit at a time.`,
      codeLine: line(1),
      state: { ...blank(nums, mix), changedBit: changed >= 0 ? changed : null, bits: bitsOf(mix, changed >= 0 ? changed : null), values: eaten, note: `ate box ${i}` },
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${mix}. You mixed n yourself.` : `Every pair cancelled. The answer is ${mix}.`,
    codeLine: line(2),
    state: { ...blank(nums, mix), mixValue: String(mix) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each index and each value is mixed in once.`,
      codeLine: 1,
      state: { ...blank(nums, mix), counter: { label: "boxes mixed", value: String(n) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the running mix is stored.",
      codeLine: 0,
      state: { ...blank(nums, mix), counter: { label: "numbers stored", value: "1" } },
    });
  }
  return frames;
}

export const missingNumberStory: ProblemStory<GrokBitsState> = {
  slugs: ["lc-268"],
  pattern: "Bit XOR",
  trigger: "n distinct numbers taken from 0..n, and exactly one value in that range is missing",
  insight: "A mix of bits. Pair each index with its value, and also mix n. Pairs cancel. The missing number is left.",
  metaphor: { name: "The cancel mix", legend: "mix = running xor · n = nums.length · pair = index XOR value", terms: ["mix", "pair", "cancel", "n"] },
  traps: [
    {
      name: "The Forgotten n Trap",
      rule: "The range is 0 through n. Start the mix at n, or n itself can never appear.",
    },
  ],
  template: [
    "mix = n",
    "for i in 0..n-1: mix = mix XOR i XOR nums[i]",
    "return mix",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each index and each value is mixed in once",
    space: "O(1)",
    spaceWhy: "only the running mix is stored",
  },
  code: CODE,
  examples: [
    { label: "[3,0,1]", input: "[3,0,1]", expected: "2" },
    { label: "[0]", input: "[0]", expected: "1", note: "n is missing." },
    { label: "[1]", input: "[1]", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-136", title: "Single Number" },
    { slug: "missing-range-value", title: "Missing Range Value" },
    { slug: "lc-41", title: "First Missing Positive" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const missing = xorMissing(nums);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums, missing), mixValue: String(missing) },
      },
    ];
  },
  View: GrokBitsView,
};
