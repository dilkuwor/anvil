import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh pair. The second row is longer, so we must search the short one. */
const PRACTICE = "[2]\n[1,3,4]";

const CODE = [
  "if (a.length > b.length) return findMedianSortedArrays(b, a);",
  "int m = a.length, n = b.length;",
  "int lo = 0, hi = m;",
  "int half = (m + n + 1) / 2;",
  "while (lo <= hi) {",
  "    int i = (lo + hi) / 2;",
  "    int j = half - i;",
  "    int aLeft = i == 0 ? Integer.MIN_VALUE : a[i - 1];",
  "    int aRight = i == m ? Integer.MAX_VALUE : a[i];",
  "    int bLeft = j == 0 ? Integer.MIN_VALUE : b[j - 1];",
  "    int bRight = j == n ? Integer.MAX_VALUE : b[j];",
  "    if (aLeft <= bRight && bLeft <= aRight) {",
  "        if (((m + n) & 1) == 1) return Math.max(aLeft, bLeft);",
  "        return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2.0;",
  "    } else if (aLeft > bRight) hi = i - 1;",
  "    else lo = i + 1;",
  "}",
  "return 0;",
];

function parse(raw: string): { a: number[]; b: number[] } {
  const lines = raw.trim().split(/\n+/);
  const grab = (s: string) => (s.match(/-?\d+/g) ?? []).map(Number);
  return { a: grab(lines[0] ?? ""), b: grab(lines[1] ?? "") };
}

function solve(aIn: number[], bIn: number[]): number {
  let a = aIn;
  let b = bIn;
  if (a.length > b.length) [a, b] = [b, a];
  const m = a.length;
  const n = b.length;
  let lo = 0;
  let hi = m;
  const half = Math.floor((m + n + 1) / 2);
  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2);
    const j = half - i;
    const aLeft = i === 0 ? -Infinity : a[i - 1]!;
    const aRight = i === m ? Infinity : a[i]!;
    const bLeft = j === 0 ? -Infinity : b[j - 1]!;
    const bRight = j === n ? Infinity : b[j]!;
    if (aLeft <= bRight && bLeft <= aRight) {
      if ((m + n) % 2 === 1) return Math.max(aLeft, bLeft);
      return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2;
    }
    if (aLeft > bRight) hi = i - 1;
    else lo = i + 1;
  }
  return 0;
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function picture(a: number[], b: number[], cutA: number | null, cutB: number | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  const tagsA: (string | undefined)[] = [];
  const tagsB: (string | undefined)[] = [];
  if (cutA !== null && cutA > 0) tagsA[cutA - 1] = "L";
  if (cutA !== null && cutA < a.length) tagsA[cutA] = "R";
  if (cutB !== null && cutB > 0) tagsB[cutB - 1] = "L";
  if (cutB !== null && cutB < b.length) tagsB[cutB] = "R";
  return {
    rows: [
      {
        label: "short",
        cells: a.map((value, index) => ({
          value: String(value),
          tone: cutA === null ? "idle" : index < cutA ? "window" : "faded",
          caption: String(index),
          tag: tagsA[index],
        })),
      },
      {
        label: "long",
        cells: b.map((value, index) => ({
          value: String(value),
          tone: cutB === null ? "idle" : index < cutB ? "window" : "faded",
          caption: String(index),
          tag: tagsB[index],
        })),
      },
    ],
    notebooks: extra?.notebooks ?? null,
    ...extra,
  };
}

function pictureFrames(a: number[], b: number[], median: number): Frame[] {
  const swapped = a.length > b.length;
  return [
    {
      scene: "picture",
      caption: "Two already-sorted rows. We want the median of the combined values, in log time.",
      state: picture(a, b, null, null),
    },
    {
      scene: "picture",
      caption: `The median is ${fmt(median)}.`,
      state: picture(a, b, null, null, { banner: { text: `median ${fmt(median)}`, tone: "teal" } }),
    },
    {
      scene: "picture",
      caption: swapped
        ? "The Long-Cut Trap: searching the longer row, so the other cut can fall off the left."
        : "The Long-Cut Trap: searching the longer row. Always cut the shorter one.",
      state: picture(swapped ? a : b, swapped ? b : a, 0, 0, {
        banner: { text: "Long-Cut Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ long cut" },
      }),
    },
  ];
}

function slowFrames(a: number[], b: number[], median: number): Frame[] {
  const merged = [...a, ...b].sort((x, y) => x - y);
  return [
    {
      scene: "slow",
      caption: `The slow way: merge both rows, then read the middle. Merged: ${merged.join(", ")}.`,
      state: picture(a, b, null, null, { counter: { label: "copied", value: a.length + b.length } }),
    },
    {
      scene: "slow",
      caption: `The middle is ${fmt(median)}. Merging is O(m+n), which misses the log-time ask.`,
      state: picture(a, b, null, null, { counter: { label: "copied", value: a.length + b.length } }),
    },
  ];
}

function insightFrames(a: number[], b: number[]): Frame[] {
  const swapped = a.length > b.length;
  return [
    {
      scene: "insight",
      caption: "Cut both rows so the left half has the right count. A cut is good when every left edge is ≤ every right edge.",
      state: picture(a.length <= b.length ? a : b, a.length <= b.length ? b : a, 0, 0),
    },
    {
      scene: "insight",
      caption: swapped
        ? "The Long-Cut Trap is searching this longer row. Then j = half − i can go negative."
        : "The Long-Cut Trap is searching the longer row. Then the other cut can fall off the end.",
      state: picture(swapped ? a : b, swapped ? b : a, null, null, {
        banner: { text: "Long-Cut Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ long cut" },
      }),
    },
    {
      scene: "insight",
      caption: "Always search how many items the shorter row gives to the left. Then the long row's cut stays inside.",
      state: picture(a.length <= b.length ? a : b, a.length <= b.length ? b : a, null, null),
    },
  ];
}

function solutionFrames(aIn: number[], bIn: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const needSwap = aIn.length > bIn.length;
  const median = solve(aIn, bIn);
  let a = aIn;
  let b = bIn;

  frames.push({
    scene,
    caption: practice
      ? `Your turn. Rows [${a.join(", ")}] and [${b.join(", ")}]. Cut the shorter one.`
      : "Search how many items the shorter row puts on the left of the cut.",
    codeLine: line(0),
    state: picture(a, b, null, null),
    quiz: {
      kind: "choice",
      question: "Which row do we binary-search for the cut?",
      options: ["The longer row", "The shorter row"],
      answer: 1,
      why: "The Long-Cut Trap searches the longer row, and the other cut can fall off. Always cut the short one.",
    },
  });

  if (needSwap) {
    frames.push({
      scene,
      caption: "The first row is longer, so we swap. Searching it would be the Long-Cut Trap.",
      codeLine: line(0),
      state: picture(a, b, null, null, { banner: { text: "Long-Cut Trap", tone: "coral" } }),
    });
    [a, b] = [b, a];
  }

  const m = a.length;
  const n = b.length;
  let lo = 0;
  let hi = m;
  const half = Math.floor((m + n + 1) / 2);
  let askedCut = false;

  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2);
    const j = half - i;
    const aLeft = i === 0 ? -Infinity : a[i - 1]!;
    const aRight = i === m ? Infinity : a[i]!;
    const bLeft = j === 0 ? -Infinity : b[j - 1]!;
    const bRight = j === n ? Infinity : b[j]!;
    const ok = aLeft <= bRight && bLeft <= aRight;
    const look: Frame = {
      scene,
      caption: `Short cut ${i}, long cut ${j}. Left edges ${aLeft === -Infinity ? "empty" : aLeft} and ${bLeft === -Infinity ? "empty" : bLeft}.`,
      codeLine: line(11),
      state: picture(a, b, i, j),
    };
    if (practice && !askedCut) {
      askedCut = true;
      look.quiz = {
        kind: "choice",
        question: "Is this cut good: every left edge ≤ every right edge?",
        options: ["Not yet, move the short cut", "Yes, read the median off the cut"],
        answer: ok ? 1 : 0,
        why: ok ? "Both sides agree. The median sits on the cut." : "A left edge is bigger than a right edge. Slide the short cut.",
      };
    }
    frames.push(look);
    if (ok) {
      frames.push({
        scene,
        caption: `The cut is good. The answer is ${fmt(median)}.`,
        codeLine: line((m + n) % 2 === 1 ? 12 : 13),
        state: picture(a, b, i, j, { banner: { text: `median ${fmt(median)}`, tone: "teal" } }),
      });
      break;
    }
    if (aLeft > bRight) hi = i - 1;
    else lo = i + 1;
    frames.push({
      scene,
      caption: aLeft > bRight ? "Short left is too big. Move the short cut left." : "Short cut is too small. Move it right.",
      codeLine: line(aLeft > bRight ? 14 : 15),
      state: picture(a, b, aLeft > bRight ? Math.max(0, i - 1) : i + 1, j, {
        banner: { text: aLeft > bRight ? "cut left" : "cut right", tone: "coral" },
      }),
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log(min(m, n))). The search range is the shorter row, halved each step.`,
      codeLine: 4,
      state: picture(a, b, null, null, { counter: { label: "short length", value: m } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only the cut indices and four edge values are stored.`,
      codeLine: 2,
      state: picture(a, b, null, null),
    });
  }
  return frames;
}

export const mergedMedianStory: ProblemStory<GrokNotebookState> = {
  slugs: ["merged-median"],
  pattern: "Binary search on a partition",
  trigger: "the median of two already-sorted arrays, in log time, without merging them",
  insight: "Always cut the shorter row. A cut is good when every left edge is ≤ every right edge. Then the median sits on the cut.",
  metaphor: {
    name: "The short cut",
    legend: "cut = how many the short row gives the left · edge = value beside the cut · half = left size",
    terms: ["cut", "short", "edge"],
  },
  traps: [
    {
      name: "The Long-Cut Trap",
      rule: "Always search on the shorter array. Then the other cut stays inside the longer one.",
    },
  ],
  template: [
    "if a is longer, swap;",
    "search i = how many a gives the left;",
    "j = half - i;",
    "if left edges ≤ right edges, read the median;",
  ],
  complexity: {
    slow: "O(m + n)",
    time: "O(log(min(m, n)))",
    timeWhy: "the search range is the shorter array, halved each step",
    space: "O(1)",
    spaceWhy: "only the cut indices and four edge values are stored",
  },
  code: CODE,
  examples: [
    { label: "[1,3] / [2]", input: "[1,3]\n[2]", expected: "2" },
    { label: "[1,2] / [3,4]", input: "[1,2]\n[3,4]", expected: "2.5" },
    { label: "[] / [1]", input: "[]\n[1]", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-4", title: "Median of Two Sorted Arrays" },
    { slug: "lc-33", title: "Search in Rotated Sorted Array" },
    { slug: "lc-23", title: "Merge k Sorted Lists" },
  ],
  answer: (input) => {
    const { a, b } = parse(input);
    return fmt(solve(a, b));
  },
  frames: (input) => {
    const { a, b } = parse(input);
    const median = solve(a, b);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(a, b, median),
      ...slowFrames(a, b, median),
      ...insightFrames(a, b),
      ...solutionFrames(a, b),
      ...solutionFrames(practice.a, practice.b, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(a.length <= b.length ? a : b, a.length <= b.length ? b : a, null, null),
      },
    ];
  },
  View: GrokNotebookView,
};
