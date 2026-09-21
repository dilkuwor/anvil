import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row. After one swap, the new value still needs a home — an if would stop too soon. */
const PRACTICE = "[2,1,0]";

const CODE = [
  "int n = nums.length;",
  "for (int i = 0; i < n; i++) {",
  "    while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {",
  "        int slot = nums[i] - 1;",
  "        int temp = nums[slot];",
  "        nums[slot] = nums[i];",
  "        nums[i] = temp;",
  "    }",
  "}",
  "for (int i = 0; i < n; i++) {",
  "    if (nums[i] != i + 1) return i + 1;",
  "}",
  "return n + 1;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function solve(nums: number[]): number {
  const row = [...nums];
  const n = row.length;
  for (let i = 0; i < n; i++) {
    while (row[i]! > 0 && row[i]! <= n && row[row[i]! - 1] !== row[i]) {
      const slot = row[i]! - 1;
      const temp = row[slot]!;
      row[slot] = row[i]!;
      row[i] = temp;
    }
  }
  for (let i = 0; i < n; i++) if (row[i] !== i + 1) return i + 1;
  return n + 1;
}

function picture(nums: number[], paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  return {
    rows: [
      {
        cells: nums.map((value, index) => ({
          value: String(value),
          tone: paint(index) ?? "idle",
          caption: `slot ${index + 1}`,
        })),
      },
    ],
    notebooks: extra?.notebooks ?? [{ title: "homes", entries: nums.map((_, i) => ({ key: `slot ${i + 1}`, value: String(i + 1) })) }],
    ...extra,
  };
}

function pictureFrames(nums: number[], missing: number): Frame[] {
  return [
    {
      scene: "picture",
      caption: "The smallest missing positive. The answer sits between 1 and one past the row.",
      state: picture(nums, () => null),
    },
    {
      scene: "picture",
      caption: `That missing number is ${missing}.`,
      state: picture(nums, (index) => (nums[index] === missing ? "miss" : nums[index] > 0 && nums[index] <= nums.length ? "window" : "faded")),
    },
    {
      scene: "picture",
      caption: "The Once-Swap Trap: one swap per seat, then move on, leaving the new value unplaced.",
      state: picture(nums, () => "miss", { banner: { text: "Once-Swap Trap", tone: "coral" }, ghost: { row: 0, col: 0, label: "✕ one if" } }),
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const sorted = [...nums].sort((a, b) => a - b);
  return [
    {
      scene: "slow",
      caption: `The slow way: sort, then scan for the hole. Sorted: ${sorted.join(", ")}.`,
      state: picture(sorted, () => "window", { counter: { label: "sort", value: 1 } }),
    },
    {
      scene: "slow",
      caption: `Sorting is O(n log n). We need linear time and no extra set.`,
      state: picture(sorted, () => "faded", { counter: { label: "sort", value: 1 } }),
    },
  ];
}

function insightFrames(nums: number[]): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Treat the row as homes: slot i should hold i+1. Swap each in-range value into its home.",
      state: picture(nums, () => "window"),
    },
    {
      scene: "insight",
      caption: "The Once-Swap Trap: an if swaps once and leaves. After a swap, the new value at this seat may also need a home.",
      state: picture(nums, (index) => (index === 0 ? "miss" : "idle"), {
        banner: { text: "Once-Swap Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ one if" },
      }),
    },
    {
      scene: "insight",
      caption: "Keep swapping at this seat until the value belongs or is out of range. Then scan for the first empty home.",
      state: picture(nums, () => "done"),
    },
  ];
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const row = [...nums];
  const n = row.length;
  const missing = solve(nums);
  let askedWhile = false;
  let askedScan = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: [${nums.join(", ")}]. Swap until each in-range value is home.` : "Walk each seat. While the value belongs in another home, swap it there.",
    codeLine: line(2),
    state: picture(row, () => null),
  });

  for (let i = 0; i < n; i++) {
    let swaps = 0;
    while (row[i]! > 0 && row[i]! <= n && row[row[i]! - 1] !== row[i] && swaps < n) {
      const slot = row[i]! - 1;
      const look: Frame = {
        scene,
        caption: `${row[i]} belongs in slot ${slot + 1}, which currently holds ${row[slot]}.`,
        codeLine: line(2),
        state: picture(row, (index) => (index === i ? "edge" : index === slot ? "hit" : "faded")),
      };
      if ((practice || !askedWhile) && swaps >= 1) {
        askedWhile = true;
        look.quiz = {
          kind: "choice",
          question: "We already swapped once at this seat. The new value also needs a home. What now?",
          options: ["Move to the next seat (an if would stop)", "Keep swapping at this seat"],
          answer: 1,
          why: "The Once-Swap Trap is an if. After a swap, the new value may also need a home.",
        };
      } else if (practice && !askedWhile && swaps === 0) {
        look.quiz = {
          kind: "cell",
          cells: n,
          numbered: true,
          question: "This value is in range. Which slot is its home? Click that box.",
          answer: slot,
          feedback: { [i]: "That is where it sits now, not its home." },
          otherwise: "Home for value v is slot v, the box whose label is that number.",
          why: "Value v belongs in slot v, at seat v-1.",
        };
      }
      frames.push(look);
      const temp = row[slot]!;
      row[slot] = row[i]!;
      row[i] = temp;
      frames.push({
        scene,
        caption: `Swap. The row is now [${row.join(", ")}].`,
        codeLine: line(6),
        state: picture(row, (index) => (index === i || index === slot ? "hit" : "window")),
      });
      swaps += 1;
    }
  }

  for (let i = 0; i < n; i++) {
    if (row[i] !== i + 1) {
      const scan: Frame = {
        scene,
        caption: `Slot ${i + 1} does not hold ${i + 1}.`,
        codeLine: line(10),
        state: picture(row, (index) => (index === i ? "miss" : index < i ? "done" : "faded")),
      };
      if (practice && !askedScan) {
        askedScan = true;
        scan.quiz = {
          kind: "choice",
          question: "This home is empty. What is the missing positive?",
          options: [String(i + 1), String(n + 1)],
          answer: 0,
          why: "The first slot whose value is not i+1 means i+1 is missing.",
        };
      }
      frames.push(scan);
      frames.push({
        scene,
        caption: `The answer is ${missing}.`,
        codeLine: line(10),
        state: picture(row, (index) => (index === i ? "miss" : "faded"), { banner: { text: `missing ${missing}`, tone: "teal" } }),
      });
      break;
    }
    if (i === n - 1) {
      frames.push({
        scene,
        caption: `Every home matches. The answer is ${n + 1}.`,
        codeLine: line(12),
        state: picture(row, () => "done"),
      });
    }
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each value is swapped into its home at most once, then we scan once.`,
      codeLine: 1,
      state: picture(row, () => "faded", { counter: { label: "seats", value: n } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Swaps happen in the row. Only a temp is extra.`,
      codeLine: 4,
      state: picture(row, () => "done"),
    });
  }
  return frames;
}

export const firstMissingPositiveStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-41"],
  pattern: "Index as a hash table",
  trigger: "the smallest missing positive integer, in linear time and constant extra space",
  insight: "The row is the notebook: slot i should hold i+1. Keep swapping at a seat until the value belongs, then scan for the first empty home.",
  metaphor: {
    name: "Home slots",
    legend: "home = slot i holds i+1 · swap = send v to seat v-1 · empty home = missing",
    terms: ["home", "slot", "swap"],
  },
  traps: [
    {
      name: "The Once-Swap Trap",
      rule: "Use a while, not an if. After a swap, the new value at this seat may also need a home.",
    },
  ],
  template: [
    "for each seat i {",
    "    while value is in 1..n and not home, swap it to slot value;",
    "}",
    "scan: first slot not holding i+1 is the answer;",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each value is swapped into its slot at most once, then the array is scanned once",
    space: "O(1)",
    spaceWhy: "swaps happen in the input. only a temp is extra",
  },
  code: CODE,
  examples: [
    { label: "[3,4,-1,1]", input: "[3,4,-1,1]", expected: "2" },
    { label: "[1,2,0]", input: "[1,2,0]", expected: "3" },
    { label: "[7,8,9]", input: "[7,8,9]", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-268", title: "Missing Number" },
    { slug: "missing-range-value", title: "Missing Range Value" },
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
        state: picture(nums, () => "window"),
      },
    ];
  },
  View: GrokNotebookView,
};
