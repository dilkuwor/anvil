import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokReadWriteView, type ReadWriteState } from "../grok-read-write-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ReadWriteState>;

/** Fresh mix: a zero, then two non-zeros, then a zero. Order of the non-zeros must stay. */
const PRACTICE = "[0,2,1,0,3]";

const CODE = [
  "int write = 0;",
  "for (int read = 0; read < nums.length; read++) {",
  "    if (nums[read] != 0) {",
  "        int temp = nums[write];",
  "        nums[write] = nums[read];",
  "        nums[read] = temp;",
  "        write++;",
  "    }",
  "}",
  "return nums;",
];

function parse(raw: string): number[] {
  return [...raw.matchAll(/-?\d+/g)].map(Number);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[]): ReadWriteState {
  return { nums: [...nums], tones: tones(nums.length, () => null), read: null, write: null };
}

function at(nums: number[], read: number | null, write: number | null): ReadWriteState {
  return {
    nums: [...nums],
    read,
    write,
    tones: tones(nums.length, (index) => {
      if (write !== null && index < write) return "done";
      if (index === read) return nums[index] === 0 ? "miss" : "edge";
      if (write !== null && index === write) return "window";
      return null;
    }),
  };
}

function moveZeroes(nums: number[]): number[] {
  const out = [...nums];
  let write = 0;
  for (let read = 0; read < out.length; read++) {
    if (out[read] !== 0) {
      const temp = out[write];
      out[write] = out[read];
      out[read] = temp;
      write += 1;
    }
  }
  return out;
}

function pictureFrames(nums: number[]): Frame[] {
  const done = moveZeroes(nums);
  const frames: Frame[] = [
    { scene: "picture", caption: `A row of numbers. Zeros must slide to the end. The other numbers must keep their order.`, state: blank(nums) },
  ];
  const zero = nums.findIndex((value) => value === 0);
  const nonzero = nums.findIndex((value) => value !== 0);
  if (zero >= 0 && nonzero >= 0) {
    frames.push({
      scene: "picture",
      caption: `A zero may move right. ${nums[nonzero]} may not jump past another non-zero.`,
      state: { ...blank(nums), tones: tones(nums.length, (index) => (index === zero ? "miss" : index === nonzero ? "done" : null)) },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: zeros at the end, other numbers in the same order. Here that row is [${done.join(", ")}].`,
    state: { ...blank(done), tones: tones(done.length, (index) => (done[index] === 0 ? "faded" : "done")) },
  });
  return frames;
}

function slowFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [];
  const row = [...nums];
  let writes = 0;
  for (let i = 0; i < row.length; i++) {
    if (row[i] !== 0) continue;
    for (let j = i; j < row.length - 1; j++) {
      row[j] = row[j + 1];
      writes += 1;
    }
    row[row.length - 1] = 0;
    writes += 1;
    if (frames.length < 2) {
      frames.push({
        scene: "slow",
        caption:
          frames.length === 0
            ? `The slow way: each time we see a zero, slide every later box one step left and put a zero at the end.`
            : `Another zero. Slide the tail left again. Non-zeros keep their order, but we rewrite the same boxes.`,
        state: { ...blank(row), read: i, tones: tones(row.length, (index) => (index === i ? "miss" : null)), counter: { label: "writes", value: writes } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `That took ${writes} writes for only ${nums.length} boxes. This is O(n²) time: each zero can rewrite the whole tail.`,
    state: { ...blank(row), tones: tones(row.length, () => "faded"), counter: { label: "writes", value: writes } },
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const firstNon = nums.findIndex((value) => value !== 0);
  const firstZero = nums.findIndex((value) => value === 0);
  const lastNon = nums.reduce((found, value, index) => (value !== 0 ? index : found), -1);
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Picture a write slot at the front: the next hole that should hold a non-zero. Read walks the row.",
      state: { ...blank(nums), read: 0, write: 0 },
    },
  ];
  if (firstNon >= 0) {
    frames.push({
      scene: "insight",
      caption: `Each non-zero swaps into the write slot, then write steps forward. ${nums[firstNon]} keeps its place among the other non-zeros.`,
      state: { ...blank(nums), read: firstNon, write: 0, tones: tones(nums.length, (index) => (index === firstNon ? "edge" : null)) },
    });
  }
  if (firstZero >= 0 && lastNon > firstZero) {
    frames.push({
      scene: "insight",
      caption: `Never swap the first zero with the last non-zero. That would send ${nums[lastNon]} to the front and break the order.`,
      state: { ...blank(nums), read: firstZero, write: firstZero, ghost: lastNon, ghostNote: "✕ last non-zero stays" },
    });
  }
  return frames;
}

function landQuiz(write: number, lastNon: number, n: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let i = 0; i < n; i++) {
    if (i === write) continue;
    if (i === lastNon) feedback[i] = "That is the Order Trap. Swapping with the last non-zero would break the order of the rest.";
    else if (i < write) feedback[i] = "That box already holds a non-zero we kept. Do not write over it.";
    else feedback[i] = "The write slot is the next hole. This box is still waiting.";
  }
  return {
    kind: "cell",
    cells: n,
    numbered: true,
    question: "This box is not zero. Where does it land? Click that box.",
    answer: write,
    feedback,
    otherwise: "The write slot is the next hole that should hold a non-zero.",
    why: "Each non-zero swaps into the write slot, then write steps forward. That keeps their order.",
  };
}

function solutionFrames(start: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const nums = [...start];
  const lastNon = start.reduce((found, value, index) => (value !== 0 ? index : found), -1);
  let write = 0;
  let askedLand = false;
  let shownTrap = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}]. You place every non-zero.`
      : "Write starts on the first box. Read will walk the row.",
    codeLine: line(0),
    state: at(nums, null, 0),
  });

  for (let read = 0; read < nums.length; read++) {
    const look: Frame = {
      scene,
      caption: `Read is on ${nums[read]}.`,
      codeLine: line(2),
      state: at(nums, read, write),
    };
    if (nums[read] !== 0 && (practice || !askedLand)) {
      askedLand = true;
      look.quiz = landQuiz(write, lastNon, nums.length);
    }
    frames.push(look);

    if (nums[read] === 0) {
      if (!shownTrap && lastNon > write && !practice) {
        shownTrap = true;
        frames.push({
          scene,
          caption: `The Order Trap: swapping this zero with ${start[lastNon]} at the end would put ${start[lastNon]} first and scramble the rest.`,
          codeLine: line(2),
          state: { ...at(nums, read, write), ghost: lastNon, ghostNote: "✕ do not swap with the end" },
        });
      }
      frames.push({
        scene,
        caption: "A zero. Leave it. Write stays on this hole so a later non-zero can fill it.",
        codeLine: line(2),
        state: at(nums, read, write),
      });
      continue;
    }

    const temp = nums[write];
    nums[write] = nums[read];
    nums[read] = temp;
    write += 1;
    frames.push({
      scene,
      caption: `Not zero: swap it into the write slot, then write steps forward. The kept front is [${nums.slice(0, write).join(", ")}].`,
      codeLine: line(4),
      state: at(nums, read, write),
    });
  }

  const result = JSON.stringify(nums);
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${result}. You placed every non-zero.` : `Read reached the end. The answer is ${result}.`,
    codeLine: line(9),
    state: { ...blank(nums), tones: tones(nums.length, (index) => (nums[index] === 0 ? "faded" : "done")), write },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Read visits each of the ${start.length} boxes once.`,
      codeLine: 1,
      state: { ...blank(nums), counter: { label: "boxes read", value: start.length }, tones: tones(nums.length, (index) => (nums[index] === 0 ? "faded" : "done")) },
    });
    frames.push({
      scene,
      caption: "Space: O(1). The write slot and one spare box for the swap are the only extra memory.",
      codeLine: 0,
      state: at(nums, null, write),
    });
  }
  return frames;
}

export const moveZeroesStory: ProblemStory<ReadWriteState> = {
  slugs: ["lc-283"],
  pattern: "Read and write pointers",
  trigger: "move zeros to the end, keep the order of the rest, on the same row",
  insight: "A write slot is the next hole for a non-zero. Each non-zero swaps into that hole. Zeros slide right, and the other numbers keep their order.",
  metaphor: {
    name: "Read and write",
    legend: "read finger = read · write slot = write · hole = a zero waiting to be swapped",
    terms: ["read", "write", "hole"],
  },
  traps: [
    {
      name: "The Order Trap",
      rule: "Never swap the first zero with the last non-zero. Always swap the next non-zero into the next write slot, left to right.",
    },
  ],
  template: [
    "write = 0;",
    "for (read = 0; read < n; read++) {",
    "    if (nums[read] is not 0) swap with write, write++;",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "read visits each box once",
    space: "O(1)",
    spaceWhy: "only the write slot and a spare for the swap",
  },
  code: CODE,
  examples: [
    { label: "[0,1,0,3,12]", input: "[0,1,0,3,12]", expected: "[1,3,12,0,0]" },
    { label: "[0,0,1]", input: "[0,0,1]", expected: "[1,0,0]" },
    { label: "[1,0]", input: "[1,0]", expected: "[1,0]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-26", title: "Remove Duplicates from Sorted Array" },
    { slug: "lc-88", title: "Merge Sorted Array" },
    { slug: "lc-189", title: "Rotate Array" },
  ],
  answer: (input) => JSON.stringify(moveZeroes(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const done = moveZeroes(nums);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: non-zeros fill holes from the left. Say the idea, then reveal the card.",
        state: { ...blank(done), tones: tones(done.length, (index) => (done[index] === 0 ? "faded" : "done")) },
      },
    ];
  },
  View: GrokReadWriteView,
};
