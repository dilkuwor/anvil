import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh plateau. Using a strict rise would miss that the tail is already last. */
const PRACTICE = "[2,1,1]";

const CODE = [
  "int i = nums.length - 2;",
  "while (i >= 0 && nums[i] >= nums[i + 1]) i--;",
  "if (i >= 0) {",
  "    int j = nums.length - 1;",
  "    while (nums[j] <= nums[i]) j--;",
  "    swap(nums, i, j);",
  "}",
  "reverse(nums, i + 1, nums.length - 1);",
  "return nums;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function swap(nums: number[], i: number, j: number): void {
  const t = nums[i]!;
  nums[i] = nums[j]!;
  nums[j] = t;
}

function reverse(nums: number[], from: number, to: number): void {
  while (from < to) swap(nums, from++, to--);
}

function solve(nums: number[]): number[] {
  const out = [...nums];
  let i = out.length - 2;
  while (i >= 0 && out[i]! >= out[i + 1]!) i--;
  if (i >= 0) {
    let j = out.length - 1;
    while (out[j]! <= out[i]!) j--;
    swap(out, i, j);
  }
  reverse(out, i + 1, out.length - 1);
  return out;
}

function fmt(nums: number[]): string {
  return `[${nums.join(",")}]`;
}

function picture(nums: number[], paint: (index: number) => CellTone | null, tags: Record<number, string> = {}, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  return {
    rows: [
      {
        cells: nums.map((value, index) => ({
          value: String(value),
          tone: paint(index) ?? "idle",
          caption: String(index),
          tag: tags[index],
          tagTone: tags[index] === "pivot" ? "teal" : "coral",
        })),
      },
    ],
    notebooks: null,
    ...extra,
  };
}

function findPivot(nums: number[]): number {
  let i = nums.length - 2;
  while (i >= 0 && nums[i]! >= nums[i + 1]!) i--;
  return i;
}

function pictureFrames(nums: number[], next: number[]): Frame[] {
  const pivot = findPivot(nums);
  return [
    {
      scene: "picture",
      caption: `This row is one permutation. We want the next larger one, or the smallest if this is already last.`,
      state: picture(nums, () => null),
    },
    {
      scene: "picture",
      caption: `The next row is ${fmt(next)}.`,
      state: picture(next, () => "done"),
    },
    {
      scene: "picture",
      caption:
        pivot < 0
          ? "This tail never rises. The Strict-Rise Trap is treating a plateau as a rise and refusing to wrap."
          : "From the right, the tail is decreasing (equals count as decreasing). The first rise is the pivot.",
      state: picture(nums, (index) => (pivot >= 0 && index === pivot ? "hit" : index > pivot ? "window" : "faded"), pivot >= 0 ? { [pivot]: "pivot" } : {}, {
        banner: { text: "Strict-Rise Trap", tone: "coral" },
        ghost: { row: 0, col: Math.max(0, nums.length - 2), label: "✕ use >" },
      }),
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way: build every permutation, sort them, and take the next. That is factorial work.",
      state: picture(nums, () => "window", {}, { counter: { label: "perms (n!)", value: nums.reduce((p, _, i) => p * (i + 1), 1) } }),
    },
    {
      scene: "slow",
      caption: `For ${nums.length} boxes that is ${nums.reduce((p, _, i) => p * (i + 1), 1)} permutations. This is O(n · n!) time.`,
      state: picture(nums, () => "faded", {}, { counter: { label: "perms", value: nums.reduce((p, _, i) => p * (i + 1), 1) } }),
    },
  ];
}

function insightFrames(nums: number[]): Frame[] {
  const pivot = findPivot(nums);
  const hasEqual = nums.some((value, i) => i > 0 && value === nums[i - 1]);
  return [
    {
      scene: "insight",
      caption: "From the right, walk while this box is at least the next. Equals are still a falling tail.",
      state: picture(nums, (index) => (index > pivot ? "window" : index === pivot ? "edge" : "faded")),
    },
    {
      scene: "insight",
      caption: hasEqual
        ? "The Strict-Rise Trap: walking only while strictly greater, so a plateau looks like a rise and the pivot is wrong."
        : "The Strict-Rise Trap: walking only while strictly greater. A plateau must still count as a falling tail.",
      state: picture(nums, (index) => (index === Math.max(0, nums.length - 2) ? "miss" : "window"), {}, {
        banner: { text: "Strict-Rise Trap", tone: "coral" },
        ghost: { row: 0, col: Math.max(0, nums.length - 2), label: "✕ use >" },
      }),
    },
    {
      scene: "insight",
      caption:
        pivot < 0
          ? "No pivot: the row is the last permutation. Flip it all to the first."
          : "Swap the pivot with the smallest bigger value on its right, then flip the tail.",
      state: picture(solve(nums), () => "done"),
    },
  ];
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const row = [...nums];
  const next = solve(nums);
  let i = row.length - 2;
  let askedWalk = false;
  let askedSwap = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: ${fmt(nums)}. Find the pivot with a falling tail that allows equals.`
      : "Walk from the right along the tail to find the first rise. Equals still count as falling.",
    codeLine: line(1),
    state: picture(row, () => null),
  });

  while (i >= 0 && row[i]! >= row[i + 1]!) {
    const plateau = row[i] === row[i + 1];
    const look: Frame = {
      scene,
      caption: plateau
        ? `${row[i]} then ${row[i + 1]} is a plateau. The tail is still falling.`
        : `${row[i]} is at least ${row[i + 1]}. Keep walking the tail left.`,
      codeLine: line(1),
      state: picture(row, (index) => (index === i || index === i + 1 ? (plateau ? "miss" : "window") : "faded"), {}, {
        banner: plateau ? { text: "Strict-Rise Trap", tone: "coral" } : undefined,
        ghost: plateau ? { row: 0, col: i, label: "✕ use >" } : undefined,
      }),
    };
    if (plateau && (practice || !askedWalk)) {
      askedWalk = true;
      look.quiz = {
        kind: "choice",
        question: "These two neighbours are equal. Is this still a falling tail?",
        options: ["No, a plateau is a rise, stop here", "Yes, walk while this box is at least the next"],
        answer: 1,
        why: "The Strict-Rise Trap stops only on a strict greater-than. A plateau is still a falling tail.",
      };
    }
    frames.push(look);
    i--;
  }

  if (i >= 0) {
    const tags: Record<number, string> = { [i]: "pivot" };
    frames.push({
      scene,
      caption: `Pivot is ${row[i]} at seat ${i}. From the right, find the smallest upgrade still bigger.`,
      codeLine: line(4),
      state: picture(row, (index) => (index === i ? "edge" : index > i ? "window" : "faded"), tags),
    });
    let j = row.length - 1;
    while (row[j]! <= row[i]!) j--;
    const pick: Frame = {
      scene,
      caption: `The upgrade sits at seat ${j}.`,
      codeLine: line(4),
      state: picture(row, (index) => (index === i ? "edge" : index === j ? "hit" : "faded"), tags),
    };
    if (practice && !askedSwap) {
      askedSwap = true;
      pick.caption = "Which box on the right is the smallest upgrade for the pivot? Click it.";
      pick.quiz = {
        kind: "cell",
        cells: row.length,
        numbered: true,
        question: "Which box on the right is the smallest value still bigger than the pivot? Click it.",
        answer: j,
        feedback: { [i]: "That is the pivot itself." },
        otherwise: "Walk from the right. Take the first value still bigger than the pivot.",
        why: "From the right, the first value still bigger is the smallest upgrade.",
      };
      pick.state = picture(row, (index) => (index === i ? "edge" : index > i ? "window" : "faded"), tags);
    }
    frames.push(pick);
    swap(row, i, j);
    frames.push({
      scene,
      caption: `Swap. The row is ${fmt(row)}.`,
      codeLine: line(5),
      state: picture(row, (index) => (index === i || index === j ? "hit" : "window"), tags),
    });
  } else {
    const wrap: Frame = {
      scene,
      caption: "No pivot: this is the last permutation. The whole row is a falling tail.",
      codeLine: line(7),
      state: picture(row, () => "window"),
    };
    if (practice) {
      wrap.quiz = {
        kind: "choice",
        question: "There is no rise from the right. What do we do?",
        options: ["Leave the row as it is", "Flip the whole row to the smallest permutation"],
        answer: 1,
        why: "No pivot means this is the last permutation. Reverse it all.",
      };
    }
    frames.push(wrap);
  }

  reverse(row, i + 1, row.length - 1);
  frames.push({
    scene,
    caption: `Flip the tail. The answer is ${fmt(next)}.`,
    codeLine: line(7),
    state: picture(row, () => "done"),
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). One walk to the pivot, one walk to the swap, one flip of the tail.`,
      codeLine: 1,
      state: picture(row, () => "faded", {}, { counter: { label: "walks", value: 3 } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only a few seats and a temp for swapping.`,
      codeLine: 5,
      state: picture(row, () => "done"),
    });
  }
  return frames;
}

export const nextPermutationStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-31"],
  pattern: "Next permutation in place",
  trigger: "rearrange into the next larger permutation, or the smallest if you are already at the last",
  insight: "Walk from the right while this box is at least the next. Swap the pivot with the smallest upgrade, then flip the tail.",
  metaphor: {
    name: "The pivot",
    legend: "pivot = first rise from the right · tail = decreasing suffix · upgrade = next bigger on the right",
    terms: ["pivot", "tail", "flip"],
  },
  traps: [
    {
      name: "The Strict-Rise Trap",
      rule: "Walk while this box is at least the next. A plateau is still a falling tail.",
    },
  ],
  template: [
    "walk from the right while nums[i] >= nums[i+1];",
    "if a pivot exists, swap with the next bigger on its right;",
    "flip the tail;",
  ],
  complexity: {
    slow: "O(n · n!)",
    time: "O(n)",
    timeWhy: "one walk to the pivot, one walk to the swap, one reverse of the tail",
    space: "O(1)",
    spaceWhy: "only a few indices and a temp for swapping",
  },
  code: CODE,
  examples: [
    { label: "[1,3,2]", input: "[1,3,2]", expected: "[2,1,3]" },
    { label: "[3,2,1]", input: "[3,2,1]", expected: "[1,2,3]" },
    { label: "[1,1,5]", input: "[1,1,5]", expected: "[1,5,1]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-189", title: "Rotate Array" },
    { slug: "lc-46", title: "Permutations" },
    { slug: "lc-78", title: "Subsets" },
  ],
  answer: (input) => fmt(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const next = solve(nums);
    return [
      ...pictureFrames(nums, next),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(next, () => "done"),
      },
    ];
  },
  View: GrokNotebookView,
};
