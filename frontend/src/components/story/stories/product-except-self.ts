import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row with a zero. Division would crash; two waves still work. */
const PRACTICE = "[1,0,2]";

const CODE = [
  "int n = nums.length;",
  "int[] answer = new int[n];",
  "answer[0] = 1;",
  "for (int i = 1; i < n; i++) answer[i] = answer[i - 1] * nums[i - 1];",
  "int suffix = 1;",
  "for (int i = n - 1; i >= 0; i--) {",
  "    answer[i] *= suffix;",
  "    suffix *= nums[i];",
  "}",
  "return answer;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function solve(nums: number[]): number[] {
  const n = nums.length;
  const answer = Array(n).fill(1);
  for (let i = 1; i < n; i++) answer[i] = answer[i - 1] * nums[i - 1];
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= suffix;
    suffix *= nums[i];
  }
  return answer;
}

function fmt(nums: number[]): string {
  return `[${nums.join(",")}]`;
}

function picture(nums: number[], answer: (number | string)[], paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  return {
    rows: [
      { label: "row", cells: nums.map((value, index) => ({ value: String(value), tone: paint(index) ?? "idle", caption: String(index) })) },
      { label: "wave", cells: answer.map((value, index) => ({ value: String(value), tone: paint(index) ?? "idle", caption: String(index) })) },
    ],
    notebooks: null,
    ...extra,
  };
}

function pictureFrames(nums: number[], out: number[]): Frame[] {
  const hasZero = nums.some((value) => value === 0);
  return [
    {
      scene: "picture",
      caption: "Each seat wants the product of every other box, with no division.",
      state: picture(nums, nums.map(() => "?"), () => null),
    },
    {
      scene: "picture",
      caption: `The finished wave is ${fmt(out)}.`,
      state: picture(nums, out, () => "done"),
    },
    {
      scene: "picture",
      caption: hasZero
        ? "The Division Trap: product of all, then divide by this box. A zero makes that crash or lie."
        : "The Division Trap: product of all, then divide. A zero later would crash that idea.",
      state: picture(nums, nums.map(() => "✕"), (index) => (nums[index] === 0 ? "miss" : "window"), {
        banner: { text: "Division Trap", tone: "coral" },
        ghost: { row: 0, col: Math.max(0, nums.findIndex((v) => v === 0)), label: "✕ divide" },
      }),
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [];
  let muls = 0;
  const out: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    let product = 1;
    for (let j = 0; j < nums.length; j++) {
      if (j !== i) {
        product *= nums[j];
        muls += 1;
      }
    }
    out[i] = product;
    if (i < 2) {
      frames.push({
        scene: "slow",
        caption: i === 0 ? `The slow way: for this seat, multiply every other box. Product ${product}.` : `Seat ${i} multiplies the rest again. Product ${product}.`,
        state: picture(nums, out.map((v) => v ?? "?"), (index) => (index === i ? "edge" : "window"), { counter: { label: "multiplies", value: muls } }),
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `That is ${muls} multiplies on ${nums.length} boxes. This is O(n²) time.`,
    state: picture(nums, out, () => "faded", { counter: { label: "multiplies", value: muls } }),
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  return [
    {
      scene: "insight",
      caption: "The product at a seat is the left wave times the right wave. Neither wave includes this box.",
      state: picture(nums, nums.map(() => "L×R"), () => "window"),
    },
    {
      scene: "insight",
      caption: "The Division Trap writes the total product then divides. A zero wipes the total and blows up the divide.",
      state: picture(nums, nums.map(() => "✕"), (index) => (nums[index] === 0 ? "miss" : "idle"), {
        banner: { text: "Division Trap", tone: "coral" },
      }),
    },
    {
      scene: "insight",
      caption: "Write left products going forward, then multiply right products going back. Two waves, no divide.",
      state: picture(nums, solve(nums), () => "done"),
    },
  ];
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = nums.length;
  const answer: number[] = Array(n).fill(1);
  const out = solve(nums);
  let askedLeft = false;
  let askedDiv = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: ${fmt(nums)}. Left wave, then right wave. No divide.` : "The left wave starts with 1 at the first seat: nothing to the left.",
    codeLine: line(2),
    state: picture(nums, answer, (index) => (index === 0 ? "hit" : null)),
  });

  if (nums.some((v) => v === 0) && (practice || !askedDiv)) {
    askedDiv = true;
    frames.push({
      scene,
      caption: "A zero sits in the row. Dividing the total by a box would fail here.",
      codeLine: line(3),
      state: picture(nums, answer, (index) => (nums[index] === 0 ? "miss" : "window"), {
        banner: { text: "Division Trap", tone: "coral" },
        ghost: { row: 0, col: nums.findIndex((v) => v === 0), label: "✕ divide" },
      }),
      quiz: {
        kind: "choice",
        question: "There is a zero. How do we fill the wave?",
        options: ["Product of all, then divide by this box", "Left wave, then right wave, never divide"],
        answer: 1,
        why: "The Division Trap dies on zero. Two waves never divide.",
      },
    });
  }

  for (let i = 1; i < n; i++) {
    const look: Frame = {
      scene,
      caption: `Left wave at this seat is the previous wave times the previous box.`,
      codeLine: line(3),
      state: picture(nums, answer, (index) => (index === i ? "edge" : index < i ? "window" : null), {
        band: { row: 0, from: 0, to: i - 1 },
      }),
    };
    if (practice && !askedLeft) {
      askedLeft = true;
      look.quiz = {
        kind: "choice",
        question: "Does the left wave at this seat include this box?",
        options: ["Yes, multiply this box in", "No, only boxes to the left"],
        answer: 1,
        why: "The left wave at a seat uses the previous box, never this one.",
      };
    }
    frames.push(look);
    answer[i] = answer[i - 1] * nums[i - 1];
    frames.push({
      scene,
      caption: `Left wave writes ${answer[i]}.`,
      codeLine: line(3),
      state: picture(nums, answer, (index) => (index === i ? "hit" : index < i ? "window" : null)),
    });
  }

  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= suffix;
    frames.push({
      scene,
      caption: `Right wave multiplies ${suffix} into this seat. It now holds ${answer[i]}.`,
      codeLine: line(6),
      state: picture(nums, answer, (index) => (index === i ? "done" : index > i ? "hit" : "window"), {
        band: { row: 0, from: i, to: n - 1 },
      }),
    });
    suffix *= nums[i];
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${fmt(out)}.` : `Both waves are done. The answer is ${fmt(out)}.`,
    codeLine: line(9),
    state: picture(nums, answer, () => "done"),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Two walks of n seats.`,
      codeLine: 3,
      state: picture(nums, answer, () => "faded", { counter: { label: "walks", value: 2 } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). The output does not count. Only the right-wave product is extra.`,
      codeLine: 4,
      state: picture(nums, answer, () => "done"),
    });
  }
  return frames;
}

export const productExceptSelfStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-238"],
  pattern: "Prefix and suffix products",
  trigger: "each index wants the product of every other value, with no division, in linear time",
  insight: "Left wave times right wave. Write left products forward, multiply right products on the way back. Never divide.",
  metaphor: {
    name: "Two waves",
    legend: "left wave = prefix product · right wave = suffix product · seat = index",
    terms: ["wave", "seat", "divide"],
  },
  traps: [
    {
      name: "The Division Trap",
      rule: "Do not take the total product and divide by this box. A zero breaks that. Use two waves.",
    },
  ],
  template: [
    "answer[0] = 1; fill left wave forward;",
    "suffix = 1;",
    "walk right to left: answer[i] *= suffix; suffix *= nums[i];",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "two walks of n indices",
    space: "O(1)",
    spaceWhy: "the output does not count. only the suffix product is extra",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4]", input: "[1,2,3,4]", expected: "[24,12,8,6]" },
    { label: "[-1,1,0,-3,3]", input: "[-1,1,0,-3,3]", expected: "[0,0,9,0,0]" },
    { label: "[2,3]", input: "[2,3]", expected: "[3,2]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-53", title: "Maximum Subarray" },
    { slug: "lc-152", title: "Maximum Product Subarray" },
    { slug: "lc-42", title: "Trapping Rain Water" },
  ],
  answer: (input) => fmt(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const out = solve(nums);
    return [
      ...pictureFrames(nums, out),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, out, () => "done"),
      },
    ];
  },
  View: GrokNotebookView,
};
