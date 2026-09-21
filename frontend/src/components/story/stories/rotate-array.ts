import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row. k is bigger than n, so we must wrap first. */
const PRACTICE = "[1,2,3]\n5";

const CODE = [
  "int n = nums.length;",
  "k %= n;",
  "reverse(nums, 0, n - 1);",
  "reverse(nums, 0, k - 1);",
  "reverse(nums, k, n - 1);",
  "return nums;",
];

function parse(raw: string): { nums: number[]; k: number } {
  const lines = raw.trim().split(/\n+/);
  const nums = (lines[0]?.match(/-?\d+/g) ?? []).map(Number);
  if (lines.length >= 2) return { nums, k: Number((lines[1].match(/-?\d+/) ?? ["0"])[0]) };
  return { nums: nums.slice(0, -1), k: nums[nums.length - 1] ?? 0 };
}

function reverse(nums: number[], from: number, to: number): void {
  while (from < to) {
    const temp = nums[from];
    nums[from] = nums[to];
    nums[to] = temp;
    from += 1;
    to -= 1;
  }
}

function solve(nums: number[], k: number): number[] {
  const out = [...nums];
  const n = out.length;
  if (n === 0) return out;
  const steps = ((k % n) + n) % n;
  reverse(out, 0, n - 1);
  reverse(out, 0, steps - 1);
  reverse(out, steps, n - 1);
  return out;
}

function fmt(nums: number[]): string {
  return `[${nums.join(",")}]`;
}

function picture(nums: number[], paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
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
    notebooks: null,
    ...extra,
  };
}

function pictureFrames(nums: number[], k: number, rotated: number[]): Frame[] {
  const n = nums.length;
  const wrap = k % n;
  return [
    {
      scene: "picture",
      caption: `Rotate the row right by ${k}. Each value wraps around the end.`,
      state: picture(nums, () => null),
    },
    {
      scene: "picture",
      caption: `After the turn the row is ${fmt(rotated)}.`,
      state: picture(rotated, () => "done"),
    },
    {
      scene: "picture",
      caption:
        k >= n
          ? `k is ${k} and the row has ${n} boxes. The Modulo Trap is flipping the first ${k} without wrapping k.`
          : `The Modulo Trap is forgetting to wrap k when it is at least the row length.`,
      state: picture(nums, () => "miss", {
        banner: { text: "Modulo Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ wrap k" },
        counter: { label: "k wrapped", value: wrap },
      }),
    },
  ];
}

function slowFrames(nums: number[], k: number): Frame[] {
  const n = nums.length;
  const frames: Frame[] = [];
  const row = [...nums];
  let moves = 0;
  const steps = n ? k % n : 0;
  for (let s = 0; s < steps; s++) {
    const last = row[n - 1]!;
    for (let i = n - 1; i > 0; i--) {
      row[i] = row[i - 1]!;
      moves += 1;
    }
    row[0] = last;
    moves += 1;
    if (s < 2) {
      frames.push({
        scene: "slow",
        caption: s === 0 ? `The slow way: shift one step right, repeated k times. After one shift: ${fmt(row)}.` : `Another one-step shift. ${fmt(row)}.`,
        state: picture(row, () => "window", { counter: { label: "writes", value: moves } }),
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `One-step shifts ${k} times is O(n · k) writes. Three flips are linear.`,
    state: picture(row, () => "faded", { counter: { label: "writes", value: moves } }),
  });
  return frames;
}

function insightFrames(nums: number[], k: number): Frame[] {
  const n = nums.length;
  const wrap = n ? k % n : 0;
  const all = [...nums].reverse();
  return [
    {
      scene: "insight",
      caption: `Wrap k first: ${k} turns on ${n} boxes is ${wrap} real steps. That is the Modulo Trap if you skip it.`,
      state: picture(nums, () => "miss", { banner: { text: "Modulo Trap", tone: "coral" }, counter: { label: "k wrapped", value: wrap } }),
    },
    {
      scene: "insight",
      caption: "Flip the whole row. The values that should land in front are now at the front, but backwards.",
      state: picture(all, () => "window"),
    },
    {
      scene: "insight",
      caption: "Flip the new front block of k, then flip the rest. Three flips, no extra row.",
      state: picture(solve(nums, k), () => "done"),
    },
  ];
}

function solutionFrames(nums: number[], k: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = nums.length;
  const row = [...nums];
  const needWrap = k >= n;
  const wrapped = n ? k % n : 0;
  const final = solve(nums, k);

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: ${fmt(nums)}, k = ${k}. Wrap k, then three flips.` : "First wrap k so a full turn is free.",
    codeLine: line(1),
    state: picture(row, () => null),
  });

  frames.push({
    scene,
    caption: needWrap ? `k is ${k}, bigger than ${n}. The Modulo Trap would flip ${k} boxes that do not exist.` : `k is already smaller than the row, so wrapping leaves it ${wrapped}.`,
    codeLine: line(1),
    state: picture(row, () => (needWrap ? "miss" : "window"), {
      banner: { text: "Modulo Trap", tone: "coral" },
      ghost: needWrap ? { row: 0, col: 0, label: "✕ wrap k" } : undefined,
    }),
    quiz: {
      kind: "choice",
      question: "k may be bigger than the row. What first?",
      options: ["Flip the first k boxes as written", "Wrap k by the row length, then flip"],
      answer: 1,
      why: "A full turn changes nothing. Wrap k first. That is the Modulo Trap if you skip it.",
    },
  });

  reverse(row, 0, n - 1);
  frames.push({
    scene,
    caption: `Flip the whole row. Now ${fmt(row)}.`,
    codeLine: line(2),
    state: picture(row, () => "window"),
  });

  if (practice) {
    frames.push({
      scene,
      caption: `The wrapped-in block sits at the front, still backwards. How many boxes is that block?`,
      state: picture(row, (index) => (index < wrapped ? "edge" : "faded")),
      quiz: {
        kind: "choice",
        question: "After wrapping, how many front boxes do we flip next?",
        options: [`The original k, ${k}`, `The wrapped k, ${wrapped}`],
        answer: 1,
        why: "After wrapping, the front block has length k modulo n.",
      },
    });
  }

  reverse(row, 0, wrapped - 1);
  frames.push({
    scene,
    caption: `Flip the front ${wrapped}. Now ${fmt(row)}.`,
    codeLine: line(3),
    state: picture(row, (index) => (index < wrapped ? "hit" : "window")),
  });
  reverse(row, wrapped, n - 1);
  frames.push({
    scene,
    caption: `Flip the rest. The answer is ${fmt(final)}.`,
    codeLine: line(4),
    state: picture(row, () => "done"),
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each value is swapped a constant number of times across three flips.`,
      codeLine: 2,
      state: picture(row, () => "faded", { counter: { label: "flips", value: 3 } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only a temp for swapping.`,
      codeLine: 1,
      state: picture(row, () => "done"),
    });
  }
  return frames;
}

export const rotateArrayStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-189"],
  pattern: "In-place reverse",
  trigger: "rotate an array right by k steps, with no extra array",
  insight: "Wrap k by the row length, flip all, flip the front k, flip the rest.",
  metaphor: {
    name: "Three flips",
    legend: "flip = reverse a block · wrap = k modulo n · front block = the values that wrapped in",
    terms: ["flip", "wrap", "block"],
  },
  traps: [
    {
      name: "The Modulo Trap",
      rule: "Set k to k modulo n first. Rotating n steps is the identity. k may also become 0.",
    },
  ],
  template: [
    "k %= n;",
    "flip the whole row;",
    "flip the first k;",
    "flip the rest;",
  ],
  complexity: {
    slow: "O(n · k)",
    time: "O(n)",
    timeWhy: "each value is swapped a constant number of times across the three reverses",
    space: "O(1)",
    spaceWhy: "only a temp for swapping",
  },
  code: CODE,
  examples: [
    { label: "[1,2] k=3", input: "[1,2]\n3", expected: "[2,1]" },
    { label: "[1,2,3,4,5,6,7] k=3", input: "[1,2,3,4,5,6,7]\n3", expected: "[5,6,7,1,2,3,4]" },
    { label: "[1] k=0", input: "[1]\n0", expected: "[1]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-31", title: "Next Permutation" },
    { slug: "lc-48", title: "Rotate Image" },
    { slug: "lc-151", title: "Reverse Words in a String" },
  ],
  answer: (input) => {
    const { nums, k } = parse(input);
    return fmt(solve(nums, k));
  },
  frames: (input) => {
    const { nums, k } = parse(input);
    const rotated = solve(nums, k);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(nums, k, rotated),
      ...slowFrames(nums, k),
      ...insightFrames(nums, k),
      ...solutionFrames(nums, k),
      ...solutionFrames(practice.nums, practice.k, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(rotated, () => "done"),
      },
    ];
  },
  View: GrokNotebookView,
};
