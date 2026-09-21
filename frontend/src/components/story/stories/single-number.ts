import { GrokBitsView, type GrokBitCell, type GrokBitsState } from "../grok-bits-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokBitsState>;

const PRACTICE = "[5,3,5]";
const WIDTH = 6;

const CODE = [
  "int result = 0;",
  "for (int value : nums) result ^= value;",
  "return result;",
];

function parse(raw: string): number[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return [];
  return inner.split(/[,\s]+/).filter(Boolean).map(Number);
}

function bitsOf(n: number): GrokBitCell[] {
  const cells: GrokBitCell[] = [];
  for (let i = WIDTH - 1; i >= 0; i--) {
    const bit = (n >> i) & 1;
    cells.push({ text: String(bit), tone: bit ? "hit" : "idle" });
  }
  return cells;
}

function valuesOf(nums: number[], cursor: number | null, done = new Set<number>()): GrokBitCell[] {
  return nums.map((n, i) => ({ text: String(n), tone: i === cursor ? "edge" : done.has(i) ? "faded" : "idle" }));
}

function blank(nums: number[], mix = 0): GrokBitsState {
  return {
    bits: bitsOf(mix),
    bitsLabel: "mix",
    changedBit: null,
    values: valuesOf(nums, null),
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
  const count = new Map<number, number>();
  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);
  for (const n of nums) if (count.get(n) === 1) return n;
  return 0;
}

function xorAll(nums: number[]): number {
  return nums.reduce((m, n) => m ^ n, 0);
}

function pictureFrames(nums: number[]): Frame[] {
  const single = xorAll(nums);
  const orAll = nums.reduce((m, n) => m | n, 0);
  return [
    { scene: "picture", caption: "Each box is a number. Every value appears twice, except one.", state: blank(nums) },
    {
      scene: "picture",
      caption: `The single number is ${single}. Its pair never arrives.`,
      state: { ...blank(nums, single), values: nums.map((n) => ({ text: String(n), tone: n === single ? "done" : "faded" })), note: `single ${single}` },
    },
    {
      scene: "picture",
      caption: orAll !== single
        ? `Mixing with OR would keep bits from the pairs and give ${orAll}, not ${single}.`
        : "Mixing must cancel a pair, not glue bits together.",
      state: { ...blank(nums, orAll), trapNote: "OR does not cancel", mixValue: String(orAll) },
    },
    {
      scene: "picture",
      caption: `The goal: the number that appears once. Here it is ${single}.`,
      state: { ...blank(nums, single), mixValue: String(single), values: nums.map((n) => ({ text: String(n), tone: n === single ? "done" : "faded" })) },
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [];
  const count = new Map<number, number>();
  let writes = 0;
  for (let i = 0; i < nums.length; i++) {
    writes++;
    count.set(nums[i], (count.get(nums[i]) ?? 0) + 1);
    if (i < 3) {
      frames.push({
        scene: "slow",
        caption: i === 0 ? `The slow way: write each value into a notebook of counts.` : `Write ${nums[i]} into the notebook. That is extra memory.`,
        state: { ...blank(nums), cursor: i, values: valuesOf(nums, i), counter: { label: "notebook writes", value: String(writes) } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We stored ${count.size} different values. This is O(n) extra space. They asked for none.`,
    state: { ...blank(nums), counter: { label: "notebook writes", value: String(writes) }, values: valuesOf(nums, null) },
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const single = xorAll(nums);
  const pair = nums.find((n, i) => nums.indexOf(n) !== i) ?? nums[0];
  return [
    {
      scene: "insight",
      caption: `Picture a mix of bits. A pair of ${pair} flips the same bits twice, so they cancel back to 0.`,
      state: { ...blank(nums, 0), note: `${pair} then ${pair} → 0`, bits: bitsOf(0) },
    },
    {
      scene: "insight",
      caption: "The OR Trap would glue bits together. OR never turns a pair back to 0.",
      state: { ...blank(nums, pair | pair), trapNote: "The OR Trap", mixValue: String(pair | pair) },
    },
    {
      scene: "insight",
      caption: `XOR every value into one mix. Pairs vanish. The single number ${single} is left.`,
      state: { ...blank(nums, single), mixValue: String(single), note: "pairs cancel" },
    },
  ];
}

function mixQuiz(nums: number[], index: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  nums.forEach((_, i) => {
    if (i === index) return;
    feedback[i] = i < index ? "That box is already in the mix." : "The mix eats the next box in the row.";
  });
  return {
    kind: "cell",
    cells: nums.length,
    numbered: true,
    question: "Which box does the mix eat next? Click that box.",
    answer: index,
    feedback,
    otherwise: "The mix walks the row from left to right.",
    why: "XOR each value into the mix, one box at a time. Pairs cancel as they go.",
  };
}

function orQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "A pair of the same number arrives. How do we mix it so the pair vanishes?",
    options: ["OR, which keeps every 1-bit that ever appeared", "XOR, which flips the same bits twice and they cancel"],
    answer: 1,
    why: "The OR Trap keeps bits from the pair. XOR sends a pair back to 0.",
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let mix = 0;
  let askedMix = false;
  let askedOr = false;
  const done = new Set<number>();

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: [${nums.join(",")}]. You feed the mix.` : "The mix starts at 0. Every bit is off.",
    codeLine: line(0),
    state: blank(nums, 0),
  });

  for (let i = 0; i < nums.length; i++) {
    if ((practice || !askedOr) && i > 0) {
      askedOr = true;
      frames.push({
        scene,
        caption: "A number is about to enter the mix. Pairs must cancel.",
        codeLine: line(1),
        quiz: orQuiz(),
        state: { ...blank(nums, mix), cursor: i, values: valuesOf(nums, i, done) },
      });
      frames.push({
        scene,
        caption: "The OR Trap would glue bits together. XOR flips the same bits twice so they cancel.",
        codeLine: line(1),
        state: { ...blank(nums, mix), cursor: i, values: valuesOf(nums, i, done), trapNote: "The OR Trap" },
      });
    }

    const look: Frame = {
      scene,
      caption: `The next box is ${nums[i]}.`,
      codeLine: line(1),
      state: { ...blank(nums, mix), cursor: i, values: valuesOf(nums, i, done), note: `ready ${nums[i]}` },
    };
    if (practice || !askedMix) {
      askedMix = true;
      look.quiz = mixQuiz(nums, i);
    }
    frames.push(look);

    const before = mix;
    const value = nums[i];
    let flipped = false;
    for (let b = 0; b < WIDTH; b++) {
      const mask = 1 << b;
      if (value & mask) {
        mix ^= mask;
        const changed = WIDTH - 1 - b;
        frames.push({
          scene,
          caption: `Bit ${b} of the mix flips. The mix is now ${mix}.`,
          codeLine: line(1),
          state: { ...blank(nums, mix), cursor: i, values: valuesOf(nums, i, done), changedBit: changed, bits: bitsOf(mix).map((c, idx) => (idx === changed ? { ...c, tone: "edge" } : c)) },
        });
        flipped = true;
      }
    }
    if (!flipped) {
      mix ^= value;
      frames.push({
        scene,
        caption: `${value} has no 1-bits to flip. The mix stays ${mix}.`,
        codeLine: line(1),
        state: { ...blank(nums, mix), cursor: i, values: valuesOf(nums, i, done) },
      });
    }
    if (!practice && i > 0 && (before ^ value) === (i === 1 ? 0 : mix) && before !== 0 && mix === 0) {
      frames.push({
        scene,
        caption: `The OR Trap would have kept those 1-bits. XOR cancelled the pair back to 0.`,
        codeLine: line(1),
        state: { ...blank(nums, 0), trapNote: "The OR Trap", mixValue: "0", values: valuesOf(nums, i, done) },
      });
    }
    done.add(i);
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${mix}. You fed every box.` : `The mix ate every box. Pairs cancelled. The answer is ${mix}.`,
    codeLine: line(2),
    state: { ...blank(nums, mix), mixValue: String(mix), values: nums.map((n) => ({ text: String(n), tone: n === mix ? "done" : "faded" })) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${nums.length} boxes is mixed in once.`,
      codeLine: 1,
      state: { ...blank(nums, mix), counter: { label: "boxes mixed", value: String(nums.length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the running mix is stored. No notebook of counts.",
      codeLine: 0,
      state: { ...blank(nums, mix), counter: { label: "numbers stored", value: "1" } },
    });
  }
  return frames;
}

export const singleNumberStory: ProblemStory<GrokBitsState> = {
  slugs: ["lc-136"],
  pattern: "Bit XOR",
  trigger: "every value appears twice except one, and you must use linear time and constant extra space",
  insight: "A mix of bits. A pair flips the same bits twice and they cancel to 0. XOR every value; the single number is left.",
  metaphor: { name: "The cancel mix", legend: "mix = running xor · pair = two equal values · bit = one 0/1 box", terms: ["mix", "pair", "cancel", "bit"] },
  traps: [
    {
      name: "The OR Trap",
      rule: "OR and AND do not cancel a pair. XOR is the mix that sends x then x back to 0.",
    },
  ],
  template: [
    "mix = 0",
    "for each value: mix = mix XOR value",
    "return mix",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(n)",
    timeWhy: "each value is mixed in once",
    space: "O(1)",
    spaceWhy: "only the running mix is stored",
  },
  code: CODE,
  examples: [
    { label: "[2,2,1]", input: "[2,2,1]", expected: "1" },
    { label: "[4,1,2,1,2]", input: "[4,1,2,1,2]", expected: "4" },
    { label: "[1]", input: "[1]", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-268", title: "Missing Number" },
    { slug: "lc-191", title: "Number of 1 Bits" },
    { slug: "lc-169", title: "Majority Element" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const mix = xorAll(nums);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums, mix), mixValue: String(mix), values: nums.map((n) => ({ text: String(n), tone: n === mix ? "done" : "faded" })) },
      },
    ];
  },
  View: GrokBitsView,
};
