import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row. n itself is missing, so forgetting to mix n in leaves 0. */
const PRACTICE = "[0]";

const CODE = [
  "int n = nums.length, xor = n;",
  "for (int i = 0; i < n; i++) xor ^= i ^ nums[i];",
  "return xor;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function solve(nums: number[]): number {
  const n = nums.length;
  let xor = n;
  for (let i = 0; i < n; i++) xor ^= i ^ nums[i]!;
  return xor;
}

function picture(nums: number[], leftover: number, paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  return {
    rows: [
      {
        cells: nums.map((value, index) => ({
          value: String(value),
          tone: paint(index) ?? "idle",
          caption: String(index),
        })),
      },
    ],
    notebooks: [
      {
        title: "notebook (leftover)",
        entries: [{ key: "xor", value: String(leftover), tone: "hit" }],
      },
    ],
    ...extra,
  };
}

function pictureFrames(nums: number[], missing: number): Frame[] {
  const n = nums.length;
  return [
    {
      scene: "picture",
      caption: `n distinct numbers from 0 through ${n}. Exactly one value in that range is missing.`,
      state: picture(nums, n, () => null),
    },
    {
      scene: "picture",
      caption: `The missing value is ${missing}.`,
      state: picture(nums, missing, (index) => (nums[index] === missing ? "miss" : "done")),
    },
    {
      scene: "picture",
      caption: `The Forgotten-N Trap: mix only seats 0..${n - 1} with the values. Then ${n} itself can never appear.`,
      state: picture(nums, 0, () => "miss", {
        banner: { text: "Forgotten-N Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ skip n" },
        counter: { label: "n", value: n },
      }),
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const sorted = [...nums].sort((a, b) => a - b);
  return [
    {
      scene: "slow",
      caption: `The slow way: sort, then look for the first hole. Sorted: ${sorted.join(", ")}.`,
      state: picture(sorted, nums.length, () => "window", { counter: { label: "sort", value: 1 } }),
    },
    {
      scene: "slow",
      caption: `Sorting is O(n log n). Mixing with xor is linear and needs no extra set.`,
      state: picture(sorted, nums.length, () => "faded", { counter: { label: "sort", value: 1 } }),
    },
  ];
}

function insightFrames(nums: number[]): Frame[] {
  const n = nums.length;
  return [
    {
      scene: "insight",
      caption: "A number mixed with itself cancels to 0. Mix every seat with every value, and also mix n.",
      state: picture(nums, n, () => "window"),
    },
    {
      scene: "insight",
      caption: `The Forgotten-N Trap: start the leftover at 0, not at n. Then n itself can never be the leftover.`,
      state: picture(nums, 0, () => "miss", {
        banner: { text: "Forgotten-N Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ skip n" },
      }),
    },
    {
      scene: "insight",
      caption: `Seed the notebook with n. Pairs cancel. The missing number is left.`,
      state: picture(nums, n, () => "hit", { arc: { row: 0, col: 0, notebook: 0, entry: 0, tone: "hit" } }),
    },
  ];
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = nums.length;
  const missing = solve(nums);
  let xor = n;
  let askedMix = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}]. n is ${n}. Seed the leftover with n.`
      : `n is ${n}. Seed the leftover with n, not 0.`,
    codeLine: line(0),
    state: picture(nums, xor, () => null),
    quiz: {
      kind: "choice",
      question: "What do we seed the leftover with?",
      options: ["0, and only mix seats 0 through n-1", "n, so n itself can still appear"],
      answer: 1,
      why: "The Forgotten-N Trap starts at 0. The range is 0 through n, one past the last seat.",
    },
  });

  for (let i = 0; i < n; i++) {
    const look: Frame = {
      scene,
      caption: `Mix seat ${i} and value ${nums[i]} into the leftover.`,
      codeLine: line(1),
      state: picture(nums, xor, (index) => (index === i ? "edge" : index < i ? "faded" : null), {
        counter: { label: "leftover", value: xor },
      }),
    };
    if (practice && !askedMix) {
      askedMix = true;
      look.quiz = {
        kind: "choice",
        question: "What gets mixed into the leftover at this seat?",
        options: ["Only the value in the box", "The seat number and the value"],
        answer: 1,
        why: "Each seat cancels its own index. The value cancels if it is present.",
      };
    }
    frames.push(look);
    xor ^= i ^ nums[i]!;
    frames.push({
      scene,
      caption: `Leftover is now ${xor}.`,
      codeLine: line(1),
      state: picture(nums, xor, (index) => (index === i ? "hit" : "faded"), {
        arc: { row: 0, col: i, notebook: 0, entry: 0, tone: "hit" },
      }),
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${missing}.` : `Pairs cancelled. The leftover is the missing number. The answer is ${missing}.`,
    codeLine: line(2),
    state: picture(nums, xor, () => "done"),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each seat and each value is mixed in once.`,
      codeLine: 1,
      state: picture(nums, xor, () => "faded", { counter: { label: "mixes", value: n } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only the running leftover is stored.`,
      codeLine: 0,
      state: picture(nums, xor, () => "done"),
    });
  }
  return frames;
}

export const missingRangeValueStory: ProblemStory<GrokNotebookState> = {
  slugs: ["missing-range-value"],
  pattern: "XOR or sum of 0..n",
  trigger: "n distinct numbers from 0..n, and exactly one value in that range is missing",
  insight: "Mix every seat with every value, and also mix n. Pairs cancel. The missing number is left.",
  metaphor: {
    name: "The cancel notebook",
    legend: "leftover = running xor · mix = xor in · pair = index and matching value",
    terms: ["notebook", "leftover", "mix"],
  },
  traps: [
    {
      name: "The Forgotten-N Trap",
      rule: "Start at n, or mix n at the end. The range is 0 through n, one past the last seat.",
    },
  ],
  template: [
    "leftover = n;",
    "for each seat i { leftover ^= i ^ nums[i]; }",
    "return leftover;",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each index and each value is mixed in once",
    space: "O(1)",
    spaceWhy: "only the running xor is stored",
  },
  code: CODE,
  examples: [
    { label: "[3,0,1]", input: "[3,0,1]", expected: "2" },
    { label: "[0,1]", input: "[0,1]", expected: "2" },
    { label: "[1]", input: "[1]", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-268", title: "Missing Number" },
    { slug: "lc-41", title: "First Missing Positive" },
    { slug: "lc-136", title: "Single Number" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const missing = solve(nums);
    return [
      ...pictureFrames(nums, missing),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, missing, () => "done"),
      },
    ];
  },
  View: GrokNotebookView,
};
