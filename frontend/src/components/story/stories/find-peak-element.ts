import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokPeakView, type PeakArrayState } from "../grok-peak-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type PeakFrame = StoryFrame<PeakArrayState>;

/** A rising row: the peak is the last bar, so a loop that lets the middle sit there falls off the end. */
const PRACTICE = "1,2,3,4";
const FALLBACK = [1, 2, 3, 1];

const CODE = [
  "int low = 0, high = nums.length - 1;",
  "while (low < high) {",
  "    int mid = low + (high - low) / 2;",
  "    if (nums[mid] < nums[mid + 1]) low = mid + 1;",
  "    else high = mid;",
  "}",
  "return low;",
];

function parseInput(raw: string): number[] {
  const nums = (raw.match(/-?\d+/g) ?? []).map(Number);
  return nums.length > 0 ? nums : FALLBACK;
}

const middle = (low: number, high: number) => low + Math.floor((high - low) / 2);

type Step = {
  low: number;
  mid: number;
  high: number;
  rises: boolean;
  nextLow: number;
  nextHigh: number;
};

function solve(nums: number[]): { answer: number; steps: Step[] } {
  const steps: Step[] = [];
  let low = 0;
  let high = nums.length - 1;
  while (low < high) {
    const mid = middle(low, high);
    const rises = nums[mid] < nums[mid + 1];
    const step: Step = { low, mid, high, rises, nextLow: low, nextHigh: high };
    if (rises) low = mid + 1;
    else high = mid;
    step.nextLow = low;
    step.nextHigh = high;
    steps.push(step);
  }
  return { answer: low, steps };
}

function isPeak(nums: number[], index: number): boolean {
  const leftOk = index === 0 || nums[index] > nums[index - 1];
  const rightOk = index === nums.length - 1 || nums[index] > nums[index + 1];
  return leftOk && rightOk;
}

/** Independent of the search: first peak walking left to right. */
function answerOf(nums: number[]): number {
  for (let index = 0; index < nums.length; index++) if (isPeak(nums, index)) return index;
  return 0;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[]): PeakArrayState {
  return { nums, tones: tones(nums.length, () => null), low: null, mid: null, high: null };
}

function pictureFrames(nums: number[], peak: number): PeakFrame[] {
  const n = nums.length;
  const last = n - 1;
  return [
    { scene: "picture", caption: `A row of ${n} hills. A taller bar is a bigger number. A peak is taller than both neighbours.`, state: blank(nums) },
    {
      scene: "picture",
      caption: last === 0 ? "A single hill is a peak: it has no neighbours to lose to." : `The ends count too: a missing neighbour is treated as shorter. So the first hill or the last hill can be a peak.`,
      state: { ...blank(nums), tones: tones(n, (index) => (index === 0 || index === last ? "window" : null)) },
    },
    {
      scene: "picture",
      caption: `The hill ${nums[peak]} at position ${peak} is a peak. Any peak is accepted, not only the tallest hill in the row.`,
      state: { ...blank(nums), tones: tones(n, (index) => (index === peak ? "done" : null)) },
    },
    {
      scene: "picture",
      caption: "The goal: name one peak after looking at very few hills, even when the row has a million of them.",
      state: blank(nums),
    },
  ];
}

function slowFrames(nums: number[]): PeakFrame[] {
  const n = nums.length;
  const frames: PeakFrame[] = [];
  let found = -1;
  for (let index = 0; index < n; index++) {
    const hit = isPeak(nums, index);
    if (hit) found = index;
    if (index > 1 && !hit) continue;
    const skipped = index > 1;
    let caption: string;
    if (hit) caption = `${skipped ? "And so on, hill by hill. " : ""}The hill ${nums[index]} is taller than its neighbours. The slow way needed ${index + 1} ${index + 1 === 1 ? "look" : "looks"}.`;
    else if (index === 0) caption = `The slow way: check every hill. The first hill ${nums[0]} is not a peak.`;
    else caption = `The next hill ${nums[index]} is not a peak either.`;
    frames.push({
      scene: "slow",
      caption,
      state: { ...blank(nums), scan: index, tones: tones(n, (i) => (i === index ? (hit ? "done" : "edge") : i < index ? "faded" : null)), counter: { label: "hills looked at", value: index + 1 } },
    });
    if (hit) break;
  }
  frames.push({
    scene: "slow",
    caption: "At worst it looks at every hill. That is O(n) time. It never uses the slope to skip a side.",
    state: { ...blank(nums), tones: tones(n, () => "faded"), counter: { label: "hills looked at", value: found + 1 } },
  });
  return frames;
}

function insightFrames(nums: number[], first: Step): PeakFrame[] {
  const n = nums.length;
  const last = n - 1;
  const neighbour = first.mid + 1;
  return [
    {
      scene: "insight",
      caption: `From the middle hill ${nums[first.mid]}, look at its right-hand neighbour ${nums[neighbour]}. Walk uphill: a peak lives on the rising side.`,
      state: { ...blank(nums), low: 0, mid: first.mid, high: last, neighbour, tones: tones(n, (index) => (index === first.mid ? "edge" : index === neighbour ? "window" : null)) },
    },
    {
      scene: "insight",
      caption: first.rises
        ? `The neighbour is taller, so the slope rises. A peak sits to the right of the middle hill. Throw the left side away.`
        : `The neighbour is not taller, so the slope falls or tops out. A peak sits at the middle hill or to its left.`,
      state: { ...blank(nums), low: first.nextLow, high: first.nextHigh, neighbour, tones: tones(n, (index) => (index < first.nextLow || index > first.nextHigh ? "faded" : index === first.mid ? "edge" : null)) },
    },
    {
      scene: "insight",
      caption: `The Off-the-End Trap: if the middle hill is the last one, it has no right-hand neighbour. Keep the right flag strictly past the middle so that neighbour always exists.`,
      state: { ...blank(nums), low: last, mid: last, high: last, offEnd: true, tones: tones(n, (index) => (index === last ? "miss" : "faded")) },
    },
  ];
}

function slopeQuiz(nums: number[], step: Step): StoryQuiz {
  const neighbour = step.mid + 1;
  return {
    kind: "cell",
    cells: nums.length,
    numbered: nums.length <= 10,
    question: "Walk uphill from the middle hill. Click the neighbour that tells you which way the slope goes.",
    answer: neighbour,
    feedback: {
      [step.mid]: "That is the middle hill itself. Look one step to its right.",
      [step.low]: "That is the left flag. The slope is read from the middle hill to its right-hand neighbour.",
    },
    otherwise: "The neighbour sits one hill to the right of the middle bar.",
    why: `The right-hand neighbour is ${nums[neighbour]}. If it is taller, walk that way. If not, a peak is at the middle or left.`,
  };
}

function moveQuiz(nums: number[], step: Step): StoryQuiz {
  const { low, mid, high, rises, nextLow, nextHigh } = step;
  const answer = rises ? nextLow : nextHigh;
  const feedback: Record<number, string> = {};
  for (let index = 0; index < nums.length; index++) {
    if (index === answer) continue;
    if (index < low || index > high) feedback[index] = "That hill was already thrown away.";
    else if (rises && index === mid) feedback[index] = "The slope rises, so the middle hill cannot be a peak. Walk past it.";
    else if (!rises && index === high && index !== mid) feedback[index] = "The slope does not rise. The right flag must jump onto the middle hill, not past it.";
    else if (rises && index < mid) feedback[index] = "Uphill is to the right. The left side can go.";
    else if (!rises && index > mid) feedback[index] = "The neighbour is not taller, so a peak cannot sit to the right of the middle hill.";
  }
  return {
    kind: "cell",
    cells: nums.length,
    numbered: nums.length <= 10,
    question: "One flag must jump. Click the hill that flag lands on.",
    answer,
    feedback,
    otherwise: "Walk uphill. Keep every hill that could still be a peak.",
    why: rises
      ? "The neighbour is taller, so a peak sits to the right. The left flag jumps just past the middle hill."
      : "The neighbour is not taller, so a peak sits at the middle or left. The right flag jumps onto the middle hill.",
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): PeakFrame[] {
  const n = nums.length;
  const last = n - 1;
  const { answer, steps } = solve(nums);
  const frames: PeakFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let askedSlope = false;
  let askedMove = false;
  let looks = 0;

  const base = (low: number, high: number, mid: number | null, extra: Partial<PeakArrayState> = {}): PeakArrayState => ({
    nums,
    low,
    mid,
    high,
    tones: tones(n, (index) => (index < low || index > high ? "faded" : index === mid ? "edge" : extra.neighbour === index ? "window" : null)),
    ...extra,
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row of hills. You read the slope, and you move the flags.`
      : "The left flag starts on the first hill and the right flag on the last. A peak sits somewhere between them.",
    codeLine: line(0),
    state: base(0, last, null),
  });

  for (const step of steps) {
    const { low, mid, high, rises } = step;
    looks += 1;
    const neighbour = mid + 1;
    const look: PeakFrame = {
      scene,
      caption: practice
        ? `The middle hill is ${nums[mid]}. Read the slope to its right-hand neighbour.`
        : `The middle hill between the flags is ${nums[mid]}.`,
      codeLine: line(2),
      state: base(low, high, mid),
    };
    if ((practice || !askedSlope) && neighbour < n) {
      askedSlope = true;
      look.quiz = slopeQuiz(nums, step);
    }
    frames.push(look);

    const slope: PeakFrame = {
      scene,
      caption: rises
        ? `The neighbour ${nums[neighbour]} is taller. The slope rises, so a peak sits to the right.`
        : `The neighbour ${nums[neighbour]} is not taller. The slope falls, so a peak sits at the middle hill or to its left.`,
      codeLine: line(3),
      state: base(low, high, mid, { neighbour }),
    };
    if (practice || !askedMove) {
      askedMove = true;
      slope.quiz = moveQuiz(nums, step);
    }
    frames.push(slope);

    frames.push({
      scene,
      caption: rises
        ? `The left flag jumps just past the middle hill. Walk uphill. The left side fades.`
        : `The right flag jumps onto the middle hill. The right side fades, but the middle hill stays.`,
      codeLine: line(rises ? 3 : 4),
      state: base(step.nextLow, step.nextHigh, null),
    });
  }

  if (answer === last) {
    frames.push({
      scene,
      caption: `The Off-the-End Trap: if the loop let both flags sit on the last hill, the middle would be last, and its neighbour would fall off the end.`,
      codeLine: line(1),
      state: { ...base(last, last, last), offEnd: true, tones: tones(n, (index) => (index === last ? "miss" : "faded")) },
    });
  }

  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}The two flags meet on the hill ${nums[answer]} at position ${answer}. The answer is ${answer}.`,
    codeLine: line(6),
    state: { ...blank(nums), tones: tones(n, (index) => (index === answer ? "done" : "faded")), counter: { label: "hills looked at", value: looks } },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log n). Each look at a middle hill throws away half of what is left: ${looks} ${looks === 1 ? "look" : "looks"} for ${n} hills.`,
      codeLine: 2,
      state: { ...blank(nums), tones: tones(n, (index) => (index === answer ? "done" : "faded")), counter: { label: "hills looked at", value: looks } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only two flags and the middle hill are stored. No copy of the row is made.",
      codeLine: 0,
      state: { ...blank(nums), low: 0, mid: middle(0, last), high: last },
    });
  }
  return frames;
}

export const findPeakElementStory: ProblemStory<PeakArrayState> = {
  slugs: ["lc-162"],
  pattern: "Binary search on a peak",
  trigger: "a row of hills, and you must find an index taller than both neighbours",
  insight: "From the middle hill, walk uphill. If the right-hand neighbour is taller, a peak sits to the right. If not, a peak sits at the middle or to the left.",
  metaphor: {
    name: "Walk uphill",
    legend: "left flag = low · right flag = high · middle hill = mid · neighbour = mid + 1 · peak = a local top",
    terms: ["hill", "uphill", "peak", "neighbour"],
  },
  traps: [
    {
      name: "The Off-the-End Trap",
      rule: "Use while (low < high). Then mid is always strictly left of high, so the right-hand neighbour exists.",
    },
  ],
  template: [
    "low = 0; high = n - 1;",
    "while (low < high) {",
    "    mid = the middle of low..high;",
    "    if (middle hill is shorter than its right neighbour) low = mid + 1;",
    "    else high = mid;",
    "}",
    "return low;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(log n)",
    timeWhy: "each step throws away half the remaining indices",
    space: "O(1)",
    spaceWhy: "only the two search ends",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,1]", input: "1,2,3,1", expected: "2" },
    { label: "[1,2]", input: "1,2", expected: "1", note: "The peak is the last hill" },
    { label: "[2,1]", input: "2,1", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-153", title: "Find Minimum in Rotated Sorted Array" },
    { slug: "lc-33", title: "Search in Rotated Sorted Array" },
    { slug: "lc-704", title: "Binary Search" },
  ],
  answer: (input) => String(answerOf(parseInput(input))),
  frames: (input) => {
    const nums = parseInput(input);
    const practice = parseInput(PRACTICE);
    const solved = solve(nums);
    const first = solved.steps[0] ?? { low: 0, mid: 0, high: nums.length - 1, rises: false, nextLow: 0, nextHigh: 0 };
    return [
      ...pictureFrames(nums, solved.answer),
      ...slowFrames(nums),
      ...insightFrames(nums, first),
      ...solutionFrames(nums),
      ...solutionFrames(practice, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: from the middle hill, walk uphill. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums), low: 0, mid: first.mid, high: nums.length - 1, neighbour: first.mid + 1 < nums.length ? first.mid + 1 : null, tones: tones(nums.length, (index) => (index === first.mid ? "edge" : index === first.mid + 1 ? "window" : null)) },
      },
    ];
  },
  View: GrokPeakView,
};
