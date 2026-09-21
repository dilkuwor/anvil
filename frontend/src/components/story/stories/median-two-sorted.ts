import { GrokPartitionView, type PartitionState } from "../grok-partition-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type CutFrame = StoryFrame<PartitionState>;

/** Fresh pair. The short row has two values; searching the long one would drop the other cut off the end. */
const PRACTICE = "[1,2] [3,4,5]";
const FALLBACK = { a: [1, 3], b: [2] };

const CODE = [
  "if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);",
  "int m = nums1.length, n = nums2.length;",
  "int half = (m + n + 1) / 2;",
  "int low = 0, high = m;",
  "while (low <= high) {",
  "    int cut1 = low + (high - low) / 2;",
  "    int cut2 = half - cut1;",
  "    int left1 = cut1 == 0 ? Integer.MIN_VALUE : nums1[cut1 - 1];",
  "    int right1 = cut1 == m ? Integer.MAX_VALUE : nums1[cut1];",
  "    int left2 = cut2 == 0 ? Integer.MIN_VALUE : nums2[cut2 - 1];",
  "    int right2 = cut2 == n ? Integer.MAX_VALUE : nums2[cut2];",
  "    if (left1 <= right2 && left2 <= right1) {",
  "        if ((m + n) % 2 == 1) return Math.max(left1, left2);",
  "        return (Math.max(left1, left2) + Math.min(right1, right2)) / 2.0;",
  "    }",
  "    if (left1 > right2) high = cut1 - 1;",
  "    else low = cut1 + 1;",
  "}",
  "return 0.0;",
];

function parseInput(raw: string): { a: number[]; b: number[] } {
  const lists = [...raw.matchAll(/\[([^\]]*)\]/g)].map((match) => (match[1].match(/-?\d+/g) ?? []).map(Number));
  if (lists.length < 2) return FALLBACK;
  return { a: lists[0], b: lists[1] };
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function mergeMedian(a: number[], b: number[]): number {
  const merged = [...a, ...b].sort((left, right) => left - right);
  const n = merged.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return merged[(n - 1) / 2];
  return (merged[n / 2 - 1] + merged[n / 2]) / 2;
}

type Try = {
  cut1: number;
  cut2: number;
  left1: number;
  right1: number;
  left2: number;
  right2: number;
  ok: boolean;
  tooFar: boolean;
};

const edge = (row: number[], cut: number, side: "left" | "right"): number => {
  if (side === "left") return cut === 0 ? Number.NEGATIVE_INFINITY : row[cut - 1];
  return cut === row.length ? Number.POSITIVE_INFINITY : row[cut];
};

function solve(shortRow: number[], longRow: number[]): { answer: number; tries: Try[] } {
  const m = shortRow.length;
  const n = longRow.length;
  const half = Math.floor((m + n + 1) / 2);
  const tries: Try[] = [];
  let low = 0;
  let high = m;
  while (low <= high) {
    const cut1 = low + Math.floor((high - low) / 2);
    const cut2 = half - cut1;
    const left1 = edge(shortRow, cut1, "left");
    const right1 = edge(shortRow, cut1, "right");
    const left2 = cut2 < 0 || cut2 > n ? Number.NaN : edge(longRow, cut2, "left");
    const right2 = cut2 < 0 || cut2 > n ? Number.NaN : edge(longRow, cut2, "right");
    const ok = left1 <= right2 && left2 <= right1;
    const tooFar = left1 > right2;
    tries.push({ cut1, cut2, left1, right1, left2, right2, ok, tooFar });
    if (ok) {
      const total = m + n;
      const answer = total % 2 === 1 ? Math.max(left1, left2) : (Math.max(left1, left2) + Math.min(right1, right2)) / 2;
      return { answer, tries };
    }
    if (tooFar) high = cut1 - 1;
    else low = cut1 + 1;
  }
  return { answer: 0, tries };
}

function order(a: number[], b: number[]): { shortRow: number[]; longRow: number[] } {
  return a.length <= b.length ? { shortRow: a, longRow: b } : { shortRow: b, longRow: a };
}

function blank(shortRow: number[], longRow: number[]): PartitionState {
  return { a: shortRow, b: longRow, cutA: null, cutB: null };
}

function word(value: number): string {
  if (value === Number.NEGATIVE_INFINITY) return "an empty left";
  if (value === Number.POSITIVE_INFINITY) return "an empty right";
  return String(value);
}

function pictureFrames(a: number[], b: number[], answer: number): CutFrame[] {
  const { shortRow, longRow } = order(a, b);
  const merged = [...a, ...b].sort((left, right) => left - right);
  const total = merged.length;
  const mids = total % 2 === 1 ? [merged[(total - 1) / 2]] : [merged[total / 2 - 1], merged[total / 2]];
  return [
    { scene: "picture", caption: `Two already-sorted rows: [${a.join(",")}] and [${b.join(",")}]. Together they hold ${total} numbers.`, state: blank(shortRow, longRow) },
    {
      scene: "picture",
      caption: `If we lined them up in order we would get [${merged.join(",")}]. The median sits at the middle ${mids.length === 1 ? "value" : "two values"}.`,
      state: { a: shortRow, b: longRow, cutA: null, cutB: null, merged, mergeAt: mids.length === 1 ? (total - 1) / 2 : total / 2 - 1 },
    },
    {
      scene: "picture",
      caption: `The goal: that middle, here ${fmt(answer)}, without building the merged row. We may only look at a few cuts.`,
      state: { ...blank(shortRow, longRow), median: fmt(answer) },
    },
  ];
}

function slowFrames(a: number[], b: number[], answer: number): CutFrame[] {
  const { shortRow, longRow } = order(a, b);
  const merged: number[] = [];
  let i = 0;
  let j = 0;
  const frames: CutFrame[] = [
    {
      scene: "slow",
      caption: `The slow way: merge the two rows like a zipper, smallest head first.`,
      state: { a: shortRow, b: longRow, cutA: 0, cutB: 0, merged: [], mergeAt: null, counter: { label: "copied", value: 0 } },
    },
  ];
  while (i < a.length || j < b.length) {
    if (i < a.length && (j >= b.length || a[i] <= b[j])) merged.push(a[i++]);
    else merged.push(b[j++]);
    if (merged.length <= 2 || i + j === a.length + b.length) {
      frames.push({
        scene: "slow",
        caption: merged.length === a.length + b.length
          ? `The merged row is [${merged.join(",")}]. The middle is ${fmt(answer)}. That copied ${merged.length} values.`
          : `Take ${merged[merged.length - 1]} next. The merged row is now [${merged.join(",")}].`,
        state: { a: shortRow, b: longRow, cutA: null, cutB: null, merged: [...merged], mergeAt: merged.length - 1, counter: { label: "copied", value: merged.length } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: "Every value is copied. That is O(m + n) time, and it stores a whole extra row.",
    state: { a: shortRow, b: longRow, cutA: null, cutB: null, merged, mergeAt: null, counter: { label: "copied", value: merged.length } },
  });
  return frames;
}

function insightFrames(a: number[], b: number[]): CutFrame[] {
  const { shortRow, longRow } = order(a, b);
  const half = Math.floor((shortRow.length + longRow.length + 1) / 2);
  const badCut = 0;
  const badOther = half - badCut;
  const off = badOther < 0 || badOther > longRow.length;
  return [
    {
      scene: "insight",
      caption: `Cut both rows so the left pile has the right count. A cut is good when every left value is no bigger than every right value.`,
      state: { ...blank(shortRow, longRow), cutA: Math.min(1, shortRow.length), cutB: Math.min(1, longRow.length), onShort: true },
    },
    {
      scene: "insight",
      caption: `Always cut the short row. Then the other cut stays on the long row. The median sits on the cut once both sides agree.`,
      state: { ...blank(shortRow, longRow), cutA: 0, cutB: Math.min(half, longRow.length), onShort: true },
    },
    {
      scene: "insight",
      caption: off
        ? `The Long Row Trap: if we cut the long row at ${badCut}, the other cut would be ${badOther}, which falls off the short row.`
        : `The Long Row Trap: searching the longer row can push the other cut off the end, so we never do that.`,
      state: { a: longRow, b: shortRow, cutA: badCut, cutB: off ? null : badOther, onShort: false, offEnd: true },
    },
  ];
}

function rowQuiz(shortRow: number[], longRow: number[]): StoryQuiz {
  const shortFirst = shortRow[0] <= longRow[0];
  return {
    kind: "choice",
    question: "Which row do we cut? The other cut is then fixed by the count we still need on the left.",
    options: shortFirst ? [`The short row [${shortRow.join(",")}]`, `The long row [${longRow.join(",")}]`] : [`The long row [${longRow.join(",")}]`, `The short row [${shortRow.join(",")}]`],
    answer: shortFirst ? 0 : 1,
    why: "Always cut the short row. Then the matching cut on the long row cannot fall off the end.",
  };
}

function cutQuiz(attempt: Try): StoryQuiz {
  if (attempt.ok) {
    return {
      kind: "choice",
      question: "The two left edges and two right edges. Does this cut split the rows fairly?",
      options: ["Yes: every left value is no bigger than every right value", "No: slide the cut on the short row"],
      answer: 0,
      why: "Both sides agree, so the median sits on this cut.",
    };
  }
  return {
    kind: "choice",
    question: "This cut is not fair yet. Which way should the cut on the short row move?",
    options: ["Give the left pile fewer from the short row", "Give the left pile more from the short row"],
    answer: attempt.tooFar ? 0 : 1,
    why: attempt.tooFar
      ? "A left value is bigger than a right value across the cut. The short row gave too many to the left."
      : "A left value on the long row is bigger than a right value on the short row. The short row gave too few to the left.",
  };
}

function solutionFrames(a: number[], b: number[], scene: SceneId = "solution", practice = false): CutFrame[] {
  const { shortRow, longRow } = order(a, b);
  const { answer, tries } = solve(shortRow, longRow);
  const frames: CutFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let askedRow = false;
  let askedCut = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, with two new rows. You pick which row to cut, and you slide that cut.`
      : `Put the short row on top. Its length is ${shortRow.length}, so the cut we search runs from 0 to ${shortRow.length}.`,
    codeLine: line(0),
    state: { ...blank(shortRow, longRow), onShort: true },
    quiz: practice || !askedRow ? rowQuiz(shortRow, longRow) : undefined,
  });
  askedRow = true;

  frames.push({
    scene,
    caption: `The Long Row Trap: cutting [${longRow.join(",")}] could push the other cut off the short row. We cut [${shortRow.join(",")}] instead.`,
    codeLine: line(0),
    state: { a: longRow, b: shortRow, cutA: 0, cutB: null, onShort: false, offEnd: true },
  });

  frames.push({
    scene,
    caption: `The short row is on top again. We will try cuts until both sides of the cut agree.`,
    codeLine: line(3),
    state: { ...blank(shortRow, longRow), onShort: true },
  });

  for (const attempt of tries) {
    const clash: PartitionState["clash"] = attempt.ok ? null : attempt.tooFar ? "a" : "b";
    const look: CutFrame = {
      scene,
      caption: `Cut the short row after ${attempt.cut1}. The long row then gives ${attempt.cut2} to the left pile.`,
      codeLine: line(5),
      state: { a: shortRow, b: longRow, cutA: attempt.cut1, cutB: attempt.cut2, onShort: true },
    };
    if (practice || !askedCut) {
      askedCut = true;
      look.quiz = cutQuiz(attempt);
    }
    frames.push(look);

    if (attempt.ok) {
      frames.push({
        scene,
        caption: `Both sides agree: ${word(attempt.left1)} and ${word(attempt.left2)} sit on the left, ${word(attempt.right1)} and ${word(attempt.right2)} on the right.`,
        codeLine: line(11),
        state: { a: shortRow, b: longRow, cutA: attempt.cut1, cutB: attempt.cut2, onShort: true, median: fmt(answer) },
      });
    } else {
      frames.push({
        scene,
        caption: attempt.tooFar
          ? `The short row gave too many to the left. Slide that cut left.`
          : `The short row gave too few to the left. Slide that cut right.`,
        codeLine: line(attempt.tooFar ? 15 : 16),
        state: { a: shortRow, b: longRow, cutA: attempt.cut1, cutB: attempt.cut2, onShort: true, clash },
      });
    }
  }

  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}The median sits on this cut. The answer is ${fmt(answer)}.`,
    codeLine: line(12),
    state: { a: shortRow, b: longRow, cutA: tries.at(-1)?.cut1 ?? 0, cutB: tries.at(-1)?.cut2 ?? 0, onShort: true, median: fmt(answer) },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log(min(m, n))). We only search the short row, ${shortRow.length} possible cuts, halved each try.`,
      codeLine: 5,
      state: { ...blank(shortRow, longRow), onShort: true, median: fmt(answer), counter: { label: "cuts tried", value: tries.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the cut indices and the four edge values are stored. No merged row.",
      codeLine: 3,
      state: { ...blank(shortRow, longRow), onShort: true, median: fmt(answer) },
    });
  }
  return frames;
}

export const medianTwoSortedStory: ProblemStory<PartitionState> = {
  slugs: ["lc-4"],
  pattern: "Binary search on a partition",
  trigger: "the median of two already-sorted arrays, in log time, without merging them",
  insight: "Cut both arrays so the left half has the right count. A cut is valid when every left value is no bigger than every right value. Then the median sits on the cut.",
  metaphor: {
    name: "The cut",
    legend: "short row = the array we search · cut = how many it gives the left pile · left pile / right pile = the two sides of the median",
    terms: ["cut", "short row", "left pile", "right pile"],
  },
  traps: [
    {
      name: "The Long Row Trap",
      rule: "Always search on the shorter array. Then the matching cut on the longer one cannot fall off the end.",
    },
  ],
  template: [
    "if needed, swap so nums1 is the shorter row;",
    "search how many of nums1 go to the left pile;",
    "the other row gives the rest of the left count;",
    "if a left edge is bigger than a right edge, slide the cut;",
    "when both sides agree, read the median off the cut;",
  ],
  complexity: {
    slow: "O(m + n)",
    time: "O(log(min(m, n)))",
    timeWhy: "the search range is the shorter array, halved each step",
    space: "O(1)",
    spaceWhy: "only the cut indices and four edge values",
  },
  code: CODE,
  examples: [
    { label: "[1,3] [2]", input: "[1,3] [2]", expected: "2" },
    { label: "[1,2] [3,4]", input: "[1,2] [3,4]", expected: "2.5" },
    { label: "[1] [2,3,4]", input: "[1] [2,3,4]", expected: "2.5", note: "The short row has one value" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "merged-median", title: "Merged Median" },
    { slug: "lc-704", title: "Binary Search" },
    { slug: "lc-23", title: "Merge k Sorted Lists" },
  ],
  answer: (input) => {
    const { a, b } = parseInput(input);
    return fmt(mergeMedian(a, b));
  },
  frames: (input) => {
    const { a, b } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const { shortRow, longRow } = order(a, b);
    const answer = mergeMedian(a, b);
    return [
      ...pictureFrames(a, b, answer),
      ...slowFrames(a, b, answer),
      ...insightFrames(a, b),
      ...solutionFrames(a, b),
      ...solutionFrames(practice.a, practice.b, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: cut the short row, match the long row, and read the median off a fair cut. Say the idea in your head first, then reveal the card.",
        state: { a: shortRow, b: longRow, cutA: Math.min(1, shortRow.length), cutB: Math.min(1, longRow.length), onShort: true, median: fmt(answer) },
      },
    ];
  },
  View: GrokPartitionView,
};
