import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row. The candidate changes once, then the majority comes back. */
const PRACTICE = "[2,1,2]";

const CODE = [
  "int candidate = nums[0];",
  "int count = 0;",
  "for (int value : nums) {",
  "    if (count == 0) candidate = value;",
  "    count += value == candidate ? 1 : -1;",
  "}",
  "return candidate;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function solve(nums: number[]): number {
  let candidate = nums[0] ?? 0;
  let count = 0;
  for (const value of nums) {
    if (count === 0) candidate = value;
    count += value === candidate ? 1 : -1;
  }
  return candidate;
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
    notebooks: extra?.notebooks ?? [{ title: "vote", entries: [] }],
    ...extra,
  };
}

function pictureFrames(nums: number[], winner: number): Frame[] {
  const sorted = [...nums].sort((a, b) => a - b);
  return [
    {
      scene: "picture",
      caption: `A value that appears more than half the time. Here that majority is ${winner}.`,
      state: picture(nums, (index) => (nums[index] === winner ? "done" : "faded")),
    },
    {
      scene: "picture",
      caption: "It is promised to exist, so we may count votes instead of storing every tally.",
      state: picture(nums, () => "window"),
    },
    {
      scene: "picture",
      caption: `The Middle-Sort Trap: sort the row and pick the middle box. That works, but it costs extra time.`,
      state: {
        rows: [{ cells: sorted.map((value, index) => ({ value: String(value), tone: index === Math.floor(sorted.length / 2) ? "miss" : "faded", caption: String(index) })) }],
        notebooks: [{ title: "vote", entries: [] }],
        banner: { text: "Middle-Sort Trap", tone: "coral" },
        ghost: { row: 0, col: Math.floor(sorted.length / 2), label: "✕ middle" },
      },
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const counts = new Map<number, number>();
  const frames: Frame[] = [];
  for (let i = 0; i < nums.length; i++) {
    counts.set(nums[i], (counts.get(nums[i]) ?? 0) + 1);
    if (i < 3) {
      frames.push({
        scene: "slow",
        caption: i === 0 ? `The slow way: tally every value in a notebook. ${nums[i]} is now ${counts.get(nums[i])}.` : `Add one to ${nums[i]}.`,
        state: picture(nums, (index) => (index === i ? "edge" : "faded"), {
          notebooks: [{ title: "tally", entries: [...counts.entries()].map(([key, value]) => ({ key: String(key), value: String(value) })) }],
          counter: { label: "writes", value: i + 1 },
        }),
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `A full tally is O(n) time and O(n) space. Sorting and taking the middle is O(n log n).`,
    state: picture(nums, () => "faded", { counter: { label: "writes", value: nums.length } }),
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const sorted = [...nums].sort((a, b) => a - b);
  return [
    {
      scene: "insight",
      caption: "A majority outnumbers everyone else put together. Pair each other vote against it, and it is still standing.",
      state: picture(nums, (index) => (nums[index] === solve(nums) ? "done" : "window")),
    },
    {
      scene: "insight",
      caption: "The Middle-Sort Trap: sort, then pick the middle. Correct, but slower, and it scrambles the row.",
      state: {
        rows: [{ cells: sorted.map((value, index) => ({ value: String(value), tone: "miss", caption: String(index) })) }],
        notebooks: [{ title: "vote", entries: [] }],
        banner: { text: "Middle-Sort Trap", tone: "coral" },
      },
    },
    {
      scene: "insight",
      caption: "Keep one candidate and a count. Matches add, misses subtract, and a zero count elects the next value.",
      state: picture(nums, () => "window", { notebooks: [{ title: "vote", entries: [{ key: "candidate", value: String(nums[0]) }, { key: "count", value: "0" }] }] }),
    },
  ];
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let candidate = nums[0] ?? 0;
  let count = 0;
  let askedZero = false;
  let askedVote = false;
  const winner = solve(nums);

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: [${nums.join(", ")}]. You elect and vote.` : "Count starts at 0. The first value will be elected.",
    codeLine: line(1),
    state: picture(nums, () => null, { notebooks: [{ title: "vote", entries: [{ key: "candidate", value: "none" }, { key: "count", value: "0" }] }] }),
  });

  for (let i = 0; i < nums.length; i++) {
    const value = nums[i];
    const elect = count === 0;
    const look: Frame = {
      scene,
      caption: elect ? `Count is 0, so elect ${value} as the candidate.` : `Vote on ${value}. The candidate is ${candidate}.`,
      codeLine: line(elect ? 3 : 4),
      state: picture(nums, (index) => (index === i ? "edge" : nums[index] === candidate && index < i ? "window" : "faded"), {
        notebooks: [{ title: "vote", entries: [{ key: "candidate", value: String(candidate) }, { key: "count", value: String(count) }] }],
      }),
    };
    if (elect && (practice || !askedZero)) {
      askedZero = true;
      look.quiz = {
        kind: "choice",
        question: "The count just hit 0. What happens?",
        options: ["Keep the old candidate", "Elect this value as the new candidate"],
        answer: 1,
        why: "A zero count elects the next value. That is the whole method.",
      };
    } else if (!elect && practice && !askedVote) {
      askedVote = true;
      look.quiz = {
        kind: "choice",
        question: "How does this box vote?",
        options: ["Match: add one to count", "Miss: subtract one from count"],
        answer: value === candidate ? 0 : 1,
        why: value === candidate ? "A match supports the candidate." : "A miss pairs off against the candidate.",
      };
    }
    frames.push(look);
    if (elect) candidate = value;
    count += value === candidate ? 1 : -1;
    frames.push({
      scene,
      caption: `Candidate ${candidate}, count ${count}.`,
      codeLine: line(4),
      state: picture(nums, (index) => (index === i ? (value === candidate ? "hit" : "miss") : "faded"), {
        notebooks: [{ title: "vote", entries: [{ key: "candidate", value: String(candidate) }, { key: "count", value: String(count) }] }],
        counter: { label: "count", value: count },
      }),
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${winner}.` : `The last candidate is the majority. The answer is ${winner}.`,
    codeLine: line(6),
    state: picture(nums, (index) => (nums[index] === winner ? "done" : "faded")),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each value is read once.`,
      codeLine: 2,
      state: picture(nums, () => "faded", { counter: { label: "votes", value: nums.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only the candidate and the count are stored.`,
      codeLine: 0,
      state: picture(nums, (index) => (nums[index] === winner ? "done" : "faded")),
    });
  }
  return frames;
}

export const majorityElementStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-169"],
  pattern: "Boyer-Moore voting",
  trigger: "an element that appears more than half the time, and you may assume it exists",
  insight: "One candidate, one count. Matches add, others subtract, a zero count elects the next value. Do not sort for the middle.",
  metaphor: {
    name: "The vote",
    legend: "candidate = current majority guess · count = unmatched votes · elect = count hits 0",
    terms: ["candidate", "count", "vote"],
  },
  traps: [
    {
      name: "The Middle-Sort Trap",
      rule: "Sorting and picking the middle is correct but O(n log n). Voting is linear and leaves the row alone.",
    },
  ],
  template: [
    "count = 0;",
    "for each value {",
    "    if count == 0, candidate = value;",
    "    count += match ? 1 : -1;",
    "}",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each value is read once",
    space: "O(1)",
    spaceWhy: "only the candidate and the count are stored",
  },
  code: CODE,
  examples: [
    { label: "[3,2,3]", input: "[3,2,3]", expected: "3" },
    { label: "[2,2,1,1,1,2,2]", input: "[2,2,1,1,1,2,2]", expected: "2" },
    { label: "[1]", input: "[1]", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-217", title: "Contains Duplicate" },
    { slug: "lc-347", title: "Top K Frequent Elements" },
    { slug: "lc-136", title: "Single Number" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const winner = solve(nums);
    return [
      ...pictureFrames(nums, winner),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, (index) => (nums[index] === winner ? "done" : "faded")),
      },
    ];
  },
  View: GrokNotebookView,
};
