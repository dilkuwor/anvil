import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokReadWriteView, type ReadWriteState } from "../grok-read-write-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ReadWriteState>;

/** Fresh rows: every value in nums2 is smaller, so writing from the front would overwrite 4, 5, and 6. */
const PRACTICE = "nums1=[4,5,6,0,0,0], m=3, nums2=[1,2,3], n=3";

const CODE = [
  "int i = m - 1, j = n - 1, write = m + n - 1;",
  "while (j >= 0) {",
  "    if (i >= 0 && nums1[i] > nums2[j]) nums1[write--] = nums1[i--];",
  "    else nums1[write--] = nums2[j--];",
  "}",
  "return nums1;",
];

function parse(raw: string): { nums1: number[]; m: number; nums2: number[]; n: number } {
  const arrays = [...raw.matchAll(/\[([^\]]*)\]/g)].map((match) => [...match[1].matchAll(/-?\d+/g)].map(Number));
  const mHit = raw.match(/m\s*=\s*(-?\d+)/);
  const nHit = raw.match(/n\s*=\s*(-?\d+)/);
  const nums1 = arrays[0] ?? [];
  const nums2 = arrays[1] ?? [];
  const m = mHit ? Number(mHit[1]) : nums1.filter((_, index) => nums1[index] !== 0 || index < nums1.length - nums2.length).length;
  const n = nHit ? Number(nHit[1]) : nums2.length;
  return { nums1: nums1.length ? nums1 : [0], m, nums2, n };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function show(nums: number[]): string {
  return `[${nums.join(", ")}]`;
}

function merge(nums1: number[], m: number, nums2: number[], n: number): number[] {
  const out = [...nums1];
  let i = m - 1;
  let j = n - 1;
  let write = m + n - 1;
  while (j >= 0) {
    if (i >= 0 && out[i] > nums2[j]) out[write--] = out[i--];
    else out[write--] = nums2[j--];
  }
  return out;
}

function stateOf(nums1: number[], nums2: number[], i: number | null, j: number | null, write: number | null): ReadWriteState {
  return {
    nums: [...nums1],
    tones: tones(nums1.length, (index) => {
      if (write !== null && index > write) return "done";
      if (index === write) return "window";
      if (index === i) return "edge";
      return null;
    }),
    read: i,
    write,
    readLabel: "i",
    writeLabel: "write",
    extra: {
      label: "nums2",
      nums: [...nums2],
      tones: tones(nums2.length, (index) => (index === j ? "edge" : j !== null && index > j ? "faded" : null)),
      cursor: j,
      cursorLabel: "j",
    },
  };
}

function pictureFrames(nums1: number[], m: number, nums2: number[], n: number, done: number[]): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `The top row has ${m} real numbers, then empty slots. The bottom row is a second sorted list of ${n}. Merge them into the top row.`,
      state: stateOf(nums1, nums2, m > 0 ? m - 1 : null, n > 0 ? n - 1 : null, nums1.length - 1),
    },
  ];
  if (m > 0) {
    frames.push({
      scene: "picture",
      caption: `The empty slots sit at the back. Writing into the first box would overwrite ${nums1[0]}, which we still need.`,
      state: { ...stateOf(nums1, nums2, 0, null, 0), ghost: 0, ghostNote: "✕ front still needed" },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: one sorted row. Here that row is ${show(done)}.`,
    state: { ...stateOf(done, nums2, null, null, null), tones: tones(done.length, () => "done"), extra: { label: "nums2", nums: nums2, tones: tones(nums2.length, () => "faded"), cursor: null } },
  });
  return frames;
}

function slowFrames(nums1: number[], m: number, nums2: number[], n: number): Frame[] {
  const copy = [...nums1];
  for (let k = 0; k < n; k++) copy[m + k] = nums2[k];
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: copy the second row into the empty slots, then sort the whole top row.`,
      state: { ...stateOf(copy, nums2, null, null, null), counter: { label: "copies", value: n } },
    },
  ];
  const sorted = [...copy].sort((a, b) => a - b);
  frames.push({
    scene: "slow",
    caption: `After the sort the row is ${show(sorted)}. Sorting ${m + n} numbers is O((m+n) log(m+n)) time.`,
    state: { ...stateOf(sorted, nums2, null, null, null), tones: tones(sorted.length, () => "done"), extra: { label: "nums2", nums: nums2, tones: tones(nums2.length, () => "faded"), cursor: null }, counter: { label: "copies", value: n } },
  });
  return frames;
}

function insightFrames(nums1: number[], m: number, nums2: number[], n: number): Frame[] {
  const write = m + n - 1;
  const i = m - 1;
  const j = n - 1;
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "The empty slots are at the back, so we fill from the back. Each write lands on a hole, never on a value we still need.",
      state: stateOf(nums1, nums2, i >= 0 ? i : null, j >= 0 ? j : null, write),
    },
  ];
  if (i >= 0 && j >= 0) {
    const takeLeft = nums1[i] > nums2[j];
    frames.push({
      scene: "insight",
      caption: `Compare the two tails. The larger one, ${takeLeft ? nums1[i] : nums2[j]}, is written at the back. Then that tail steps in.`,
      state: stateOf(nums1, nums2, i, j, write),
    });
  }
  frames.push({
    scene: "insight",
    caption: "If the top tail runs out first, copy the rest of the bottom row. If the bottom runs out, the front of the top row is already in place.",
    state: stateOf(nums1, nums2, i >= 0 ? i : null, j >= 0 ? j : null, write),
  });
  return frames;
}

function pickQuiz(nums1: number[], nums2: number[], i: number, j: number, takeLeft: boolean): StoryQuiz {
  const leftIndex = i;
  const rightIndex = nums1.length + j;
  const feedback: Record<number, string> = {};
  feedback[takeLeft ? rightIndex : leftIndex] = takeLeft
    ? `${nums2[j]} is smaller than ${nums1[i]}, so it waits.`
    : `${nums1[i]} is not larger than ${nums2[j]}, so the bottom tail goes next.`;
  if (0 !== leftIndex && 0 !== rightIndex) feedback[0] = "The front of the top row is still needed. We never write there first.";
  return {
    kind: "cell",
    cells: nums1.length + nums2.length,
    numbered: true,
    question: "Which tail is written next? Click that box.",
    answer: takeLeft ? leftIndex : rightIndex,
    feedback,
    otherwise: "Compare the two remaining tails. The larger one is written at the back.",
    why: takeLeft ? `${nums1[i]} is larger, so it takes the back slot.` : `${nums2[j]} is at least as large, so it takes the back slot.`,
  };
}

function writeQuiz(write: number, n: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (write !== 0) feedback[0] = "The Front Merge Trap: writing at the front overwrites a value we still need.";
  return {
    kind: "cell",
    cells: n,
    numbered: true,
    question: "Where does that larger tail land? Click that box.",
    answer: write,
    feedback,
    otherwise: "The empty slots sit at the back. Write into a hole.",
    why: "Write from the back, where the empty slots are, so a still-needed value is never overwritten.",
  };
}

function solutionFrames(start1: number[], m: number, nums2: number[], n: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const nums1 = [...start1];
  let i = m - 1;
  let j = n - 1;
  let write = m + n - 1;
  let askedPick = false;
  let askedWrite = false;
  let shownTrap = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn. Top row ${show(nums1)}, bottom row ${show(nums2)}. You pick each tail and where it lands.`
      : "i on the last real top value, j on the last bottom value, write on the last slot.",
    codeLine: line(0),
    state: stateOf(nums1, nums2, i >= 0 ? i : null, j >= 0 ? j : null, write),
  });

  while (j >= 0) {
    const takeLeft = i >= 0 && nums1[i] > nums2[j];
    const look: Frame = {
      scene,
      caption: i >= 0 ? `The two tails are ${nums1[i]} and ${nums2[j]}.` : `The top tail is spent. The bottom tail is ${nums2[j]}.`,
      codeLine: line(2),
      state: stateOf(nums1, nums2, i >= 0 ? i : null, j, write),
    };
    if (i >= 0 && (practice || !askedPick)) {
      askedPick = true;
      look.quiz = pickQuiz(nums1, nums2, i, j, takeLeft);
    }
    frames.push(look);

    if (!shownTrap && !practice && m > 0 && write !== 0) {
      shownTrap = true;
      frames.push({
        scene,
        caption: `The Front Merge Trap: writing ${takeLeft ? nums1[i] : nums2[j]} into the first box would overwrite ${start1[0]}, which we still need.`,
        codeLine: line(2),
        state: { ...stateOf(nums1, nums2, i >= 0 ? i : null, j, write), ghost: 0, ghostNote: "✕ not the front" },
      });
    }

    const land: Frame = {
      scene,
      caption: `The larger tail goes into the hole at the back.`,
      codeLine: line(takeLeft ? 2 : 3),
      state: { ...stateOf(nums1, nums2, i >= 0 ? i : null, j, write), note: "write at the back" },
    };
    if (practice || !askedWrite) {
      askedWrite = true;
      land.quiz = writeQuiz(write, nums1.length);
    }
    frames.push(land);

    if (takeLeft) nums1[write--] = nums1[i--];
    else nums1[write--] = nums2[j--];
    frames.push({
      scene,
      caption: `Wrote ${nums1[write + 1]}. The back is now ${show(nums1)}.`,
      codeLine: line(takeLeft ? 2 : 3),
      state: stateOf(nums1, nums2, i >= 0 ? i : null, j >= 0 ? j : null, write >= 0 ? write : null),
    });
  }

  const result = JSON.stringify(nums1);
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${result}. You filled every hole from the back.` : `The bottom row is spent. The answer is ${result}.`,
    codeLine: line(5),
    state: { ...stateOf(nums1, nums2, null, null, null), tones: tones(nums1.length, () => "done"), extra: { label: "nums2", nums: nums2, tones: tones(nums2.length, () => "faded"), cursor: null } },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(m + n). Each value is written once.`,
      codeLine: 1,
      state: { ...stateOf(nums1, nums2, null, null, null), counter: { label: "writes", value: n + Math.max(0, m) }, tones: tones(nums1.length, () => "done"), extra: { label: "nums2", nums: nums2, tones: tones(nums2.length, () => "faded"), cursor: null } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the three fingers: i, j, and write.",
      codeLine: 0,
      state: stateOf(nums1, nums2, m > 0 ? 0 : null, n > 0 ? 0 : null, nums1.length - 1),
    });
  }
  return frames;
}

export const mergeSortedArrayStory: ProblemStory<ReadWriteState> = {
  slugs: ["lc-88"],
  pattern: "Two pointers from the back",
  trigger: "merge two sorted arrays into the first one, which has spare slots at the end",
  insight: "Fill from the back, where the empty slots sit. Take the larger of the two remaining tails so you never overwrite a value you still need.",
  metaphor: {
    name: "The two tails",
    legend: "top tail = i · bottom tail = j · hole at the back = write",
    terms: ["tail", "hole", "back"],
  },
  traps: [
    {
      name: "The Front Merge Trap",
      rule: "Never write into the front of the top row first. That overwrites a value you still need. Write from the back.",
    },
  ],
  template: [
    "i = last real top; j = last bottom; write = last slot;",
    "while (bottom still has values) {",
    "    write the larger tail into the back hole;",
    "}",
  ],
  complexity: {
    slow: "O((m+n) log(m+n))",
    time: "O(m + n)",
    timeWhy: "each value is written once",
    space: "O(1)",
    spaceWhy: "only the three fingers",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,0,0,0] + [2,5,6]", input: "nums1=[1,2,3,0,0,0], m=3, nums2=[2,5,6], n=3", expected: "[1,2,2,3,5,6]" },
    { label: "[2,0] + [1]", input: "nums1=[2,0], m=1, nums2=[1], n=1", expected: "[1,2]", note: "The new value belongs in front" },
    { label: "[0] + [1]", input: "nums1=[0], m=0, nums2=[1], n=1", expected: "[1]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-21", title: "Merge Two Sorted Lists" },
    { slug: "lc-23", title: "Merge k Sorted Lists" },
    { slug: "lc-26", title: "Remove Duplicates from Sorted Array" },
  ],
  answer: (input) => {
    const { nums1, m, nums2, n } = parse(input);
    return JSON.stringify(merge(nums1, m, nums2, n));
  },
  frames: (input) => {
    const { nums1, m, nums2, n } = parse(input);
    const done = merge(nums1, m, nums2, n);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(nums1, m, nums2, n, done),
      ...slowFrames(nums1, m, nums2, n),
      ...insightFrames(nums1, m, nums2, n),
      ...solutionFrames(nums1, m, nums2, n),
      ...solutionFrames(practice.nums1, practice.m, practice.nums2, practice.n, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: fill the holes from the back. Say the idea, then reveal the card.",
        state: { ...stateOf(done, nums2, null, null, null), tones: tones(done.length, () => "done"), extra: { label: "nums2", nums: nums2, tones: tones(nums2.length, () => "faded"), cursor: null } },
      },
    ];
  },
  View: GrokReadWriteView,
};
