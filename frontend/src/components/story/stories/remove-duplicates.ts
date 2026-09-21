import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokReadWriteView, type ReadWriteState } from "../grok-read-write-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ReadWriteState>;

/** Fresh run: a unique sits after copies, so write lands on a box that used to hold a copy. */
const PRACTICE = "[1,2,2,3]";

const CODE = [
  "if (nums.length == 0) return 0;",
  "int write = 1;",
  "for (int read = 1; read < nums.length; read++) {",
  "    if (nums[read] != nums[write - 1]) nums[write++] = nums[read];",
  "}",
  "return write;",
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

function at(nums: number[], read: number | null, write: number | null, kept: number): ReadWriteState {
  return {
    nums: [...nums],
    read,
    write,
    tones: tones(nums.length, (index) => {
      if (index < kept) return "done";
      if (index === read) return "edge";
      return "faded";
    }),
  };
}

function uniqueCount(nums: number[]): number {
  if (nums.length === 0) return 0;
  const out = [...nums];
  let write = 1;
  for (let read = 1; read < out.length; read++) {
    if (out[read] !== out[write - 1]) out[write++] = out[read];
  }
  return write;
}

function compact(nums: number[]): number[] {
  const out = [...nums];
  if (out.length === 0) return out;
  let write = 1;
  for (let read = 1; read < out.length; read++) {
    if (out[read] !== out[write - 1]) out[write++] = out[read];
  }
  return out;
}

function pictureFrames(nums: number[]): Frame[] {
  const k = uniqueCount(nums);
  const kept = compact(nums).slice(0, k);
  const frames: Frame[] = [
    { scene: "picture", caption: `A sorted row of ${nums.length} numbers. Copies sit next to each other.`, state: blank(nums) },
  ];
  const dup = nums.findIndex((value, index) => index > 0 && value === nums[index - 1]);
  if (dup >= 0) {
    frames.push({
      scene: "picture",
      caption: `${nums[dup]} appears more than once. Only one of those ${nums[dup]}s may stay at the front.`,
      state: { ...blank(nums), tones: tones(nums.length, (index) => (nums[index] === nums[dup] ? "miss" : null)) },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: write each different value once at the front, and return how many that is. Here the front is ${kept.join(", ")}, length ${k}.`,
    state: { ...blank(kept.concat(Array(nums.length - k).fill(0)).slice(0, nums.length).map((v, i) => (i < k ? kept[i] : nums[i] === kept[k - 1] ? nums[i] : nums[i]))), tones: tones(nums.length, (index) => (index < k ? "done" : "faded")), write: k },
  });
  return frames;
}

function slowFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  const unique: number[] = [];
  nums.forEach((value, read) => {
    let seen = false;
    for (let i = 0; i < read; i++) {
      checks += 1;
      if (nums[i] === value) seen = true;
    }
    if (read <= 2 || !seen) {
      frames.push({
        scene: "slow",
        caption:
          read === 0
            ? `The slow way: for each box, scan every box before it. ${value} is first, so it is unique.`
            : seen
              ? `Scan the boxes before this ${value}. A copy is already there, so skip it.`
              : `Scan the boxes before this ${value}. No copy yet, so keep it.`,
        state: {
          ...blank(nums),
          read,
          tones: tones(nums.length, (index) => (index === read ? "edge" : index < unique.length ? "done" : null)),
          counter: { label: "boxes compared", value: checks },
        },
      });
    }
    if (!seen) unique.push(value);
  });
  frames.push({
    scene: "slow",
    caption: `That is ${checks} comparisons for only ${nums.length} numbers. This is O(n²) time: we keep re-reading the front.`,
    state: { ...blank(nums), tones: tones(nums.length, () => "faded"), counter: { label: "boxes compared", value: checks } },
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Picture a write slot just after the first value, which already counts as unique. A read finger walks the rest.",
      state: { ...blank(nums), read: Math.min(1, nums.length - 1), write: Math.min(1, nums.length - 1) },
    },
  ];
  const firstDup = nums.findIndex((value, index) => index > 0 && value === nums[index - 1]);
  const firstNew = nums.findIndex((value, index) => index > 0 && value !== nums[0] && (index === 1 || value !== nums[index - 1]));
  if (firstDup >= 0) {
    frames.push({
      scene: "insight",
      caption: `Because the row is sorted, a copy of ${nums[firstDup]} sits next to the last one we kept. Read can skip it.`,
      state: { ...blank(nums), read: firstDup, write: 1, tones: tones(nums.length, (index) => (index === firstDup ? "miss" : index === 0 ? "done" : null)) },
    });
  }
  if (firstNew >= 0) {
    frames.push({
      scene: "insight",
      caption: `A new value is written at the write slot. Compare it with the last unique we kept, not with the box just behind read.`,
      state: { ...blank(nums), read: firstNew, write: 1, tones: tones(nums.length, (index) => (index === firstNew ? "edge" : index === 0 ? "done" : null)) },
    });
  }
  return frames;
}

function keepQuiz(keep: boolean): StoryQuiz {
  return {
    kind: "choice",
    question: "Is this value new compared with the last unique we kept, or is it a copy?",
    options: ["It is new: write it at the write slot", "It is a copy: skip it"],
    answer: keep ? 0 : 1,
    why: keep ? "It differs from the last unique, so it is written at the write slot, and write steps forward." : "It matches the last unique we kept, so read just moves on.",
  };
}

function solutionFrames(start: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const nums = [...start];
  let asked = false;
  let shownTrap = false;
  let write = nums.length === 0 ? 0 : 1;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}]. You decide whether each value is written or skipped.`
      : "The first value already counts as unique. Write starts on the next box.",
    codeLine: line(1),
    state: at(nums, null, nums.length ? 1 : null, nums.length ? 1 : 0),
  });

  for (let read = 1; read < nums.length; read++) {
    const last = nums[write - 1];
    const keep = nums[read] !== last;
    const look: Frame = {
      scene,
      caption: `Read is on ${nums[read]}. The last unique we kept is ${last}.`,
      codeLine: line(3),
      state: at(nums, read, write, write),
    };
    if (practice || !asked) {
      asked = true;
      look.quiz = keepQuiz(keep);
    }
    frames.push(look);

    if (keep) {
      const overwriting = write !== read;
      if (overwriting && !shownTrap && !practice) {
        shownTrap = true;
        frames.push({
          scene,
          caption: `The Overwrite Trap: the box just behind read may already hold a value we wrote. Compare with the last unique, not that neighbour.`,
          codeLine: line(3),
          state: { ...at(nums, read, write, write), ghost: read - 1, ghostNote: "✕ not this neighbour" },
        });
      }
      nums[write] = nums[read];
      write += 1;
      frames.push({
        scene,
        caption: `New unique: write ${nums[read]} at the write slot, then write steps forward. The front is now ${nums.slice(0, write).join(", ")}.`,
        codeLine: line(3),
        state: at(nums, read, write, write),
      });
    } else {
      frames.push({
        scene,
        caption: `A copy of ${last}. Read moves on. Write stays put.`,
        codeLine: line(3),
        state: { ...at(nums, read, write, write), tones: tones(nums.length, (index) => (index === read ? "miss" : index < write ? "done" : "faded")) },
      });
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${write}. You chose every write yourself.` : `Read reached the end. The answer is ${write}.`,
    codeLine: line(5),
    state: at(nums, null, write, write),
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Read visits each of the ${start.length} boxes once.`,
      codeLine: 2,
      state: { ...at(nums, null, write, write), counter: { label: "boxes read", value: start.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). The write slot is the only extra memory. The unique values sit on the same row.",
      codeLine: 1,
      state: at(nums, null, write, write),
    });
  }
  return frames;
}

export const removeDuplicatesStory: ProblemStory<ReadWriteState> = {
  slugs: ["lc-26"],
  pattern: "Read and write pointers",
  trigger: "a sorted array, and you must drop copies on the same row and return the new length",
  insight: "A write slot holds the next unique. Because the row is sorted, a value is new when it differs from the last unique we kept, not from the box behind read.",
  metaphor: {
    name: "Read and write",
    legend: "read finger = read · write slot = write · last unique = nums[write - 1]",
    terms: ["read", "write", "unique"],
  },
  traps: [
    {
      name: "The Overwrite Trap",
      rule: "After a write, the box behind read may already hold a value we wrote. Compare with the last unique at the write slot, never with that neighbour.",
    },
  ],
  template: [
    "write = 1;",
    "for (read = 1; read < n; read++) {",
    "    if (nums[read] differs from last unique) write it, write++;",
    "}",
    "return write;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "read visits each box once",
    space: "O(1)",
    spaceWhy: "only the write slot",
  },
  code: CODE,
  examples: [
    { label: "[1,1,2]", input: "[1,1,2]", expected: "2" },
    { label: "[0,0,1,1,2]", input: "[0,0,1,1,2]", expected: "3", note: "Write lands on a former copy" },
    { label: "[1,1,1]", input: "[1,1,1]", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-283", title: "Move Zeroes" },
    { slug: "lc-88", title: "Merge Sorted Array" },
    { slug: "lc-189", title: "Rotate Array" },
  ],
  answer: (input) => String(uniqueCount(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const k = uniqueCount(nums);
    const done = compact(nums);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: read walks, write keeps uniques. Say the idea, then reveal the card.",
        state: at(done, null, k, k),
      },
    ];
  },
  View: GrokReadWriteView,
};
