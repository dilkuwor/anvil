import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokRotatedMinView, type RotatedMinState } from "../grok-rotated-min-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type RampFrame = StoryFrame<RotatedMinState>;

/** Fresh unrotated row: comparing with the left flag would throw the shortest bar away. */
const PRACTICE = "8,9,10,11,12";
const FALLBACK = [4, 5, 6, 7, 0, 1, 2];

const CODE = [
  "int low = 0, high = nums.length - 1;",
  "while (low < high) {",
  "    int mid = low + (high - low) / 2;",
  "    if (nums[mid] > nums[high]) low = mid + 1;",
  "    else high = mid;",
  "}",
  "return nums[low];",
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
  cliffRight: boolean;
  nextLow: number;
  nextHigh: number;
};

function solveClean(nums: number[]): { answer: number; steps: Step[] } {
  const steps: Step[] = [];
  let low = 0;
  let high = nums.length - 1;
  while (low < high) {
    const mid = middle(low, high);
    const cliffRight = nums[mid] > nums[high];
    const step: Step = { low, mid, high, cliffRight, nextLow: low, nextHigh: high };
    if (cliffRight) low = mid + 1;
    else high = mid;
    step.nextLow = low;
    step.nextHigh = high;
    steps.push(step);
  }
  return { answer: nums[low], steps };
}

/** Independent of the search: walk the row once. */
function answerOf(nums: number[]): number {
  return nums.reduce((best, value) => (value < best ? value : best), nums[0]);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[]): RotatedMinState {
  return { nums, tones: tones(nums.length, () => null), low: null, mid: null, high: null };
}

function dropAt(nums: number[]): number {
  return nums.findIndex((value, index) => index > 0 && value < nums[index - 1]);
}

function pictureFrames(nums: number[], answer: number): RampFrame[] {
  const n = nums.length;
  const drop = dropAt(nums);
  const at = nums.indexOf(answer);
  return [
    { scene: "picture", caption: `A row of ${n} bars. A taller bar is a bigger number. We want the shortest bar.`, state: blank(nums) },
    {
      scene: "picture",
      caption:
        drop > 0
          ? `The row was sorted, then some bars moved from the front to the back. It climbs, falls off a cliff after ${nums[drop - 1]}, and climbs again.`
          : "The row was sorted and nothing was moved. It is one smooth ramp with no cliff.",
      state: { ...blank(nums), tones: tones(n, (index) => (drop > 0 && index >= drop ? "hit" : "window")) },
    },
    {
      scene: "picture",
      caption: drop > 0 ? `The shortest bar sits just after the cliff. Here it is ${answer}.` : `With no cliff, the shortest bar is the first one. Here it is ${answer}.`,
      state: { ...blank(nums), tones: tones(n, (index) => (index === at ? "done" : null)) },
    },
    {
      scene: "picture",
      caption: "The goal: name that shortest value after looking at very few bars, even when the row has a million of them.",
      state: blank(nums),
    },
  ];
}

function slowFrames(nums: number[]): RampFrame[] {
  const n = nums.length;
  const frames: RampFrame[] = [];
  let best = nums[0];
  let bestAt = 0;
  for (let index = 0; index < n; index++) {
    if (nums[index] < best) {
      best = nums[index];
      bestAt = index;
    }
    if (index > 1 && index < n - 1) continue;
    const skipped = index === n - 1 && n > 3;
    let caption: string;
    if (index === 0) caption = `The slow way: look at every bar and keep the shortest so far. The first bar is ${nums[0]}.`;
    else if (index === n - 1) caption = `${skipped ? "And so on, bar by bar. " : ""}The last bar is ${nums[index]}. After ${n} looks the shortest is ${best}.`;
    else caption = `The next bar is ${nums[index]}. ${nums[index] < nums[0] ? `New shortest: ${nums[index]}.` : "The shortest so far stays."}`;
    frames.push({
      scene: "slow",
      caption,
      state: { ...blank(nums), scan: index, tones: tones(n, (i) => (i === bestAt ? "done" : i === index ? "edge" : i < index ? "faded" : null)), counter: { label: "bars looked at", value: index + 1 } },
    });
  }
  frames.push({
    scene: "slow",
    caption: "At worst it looks at every bar: a million looks for a million bars. That is O(n) time. It never uses the ramps.",
    state: { ...blank(nums), tones: tones(n, () => "faded"), counter: { label: "bars looked at", value: n } },
  });
  return frames;
}

function insightFrames(nums: number[], first: Step): RampFrame[] {
  const n = nums.length;
  const drop = dropAt(nums);
  const minAt = nums.indexOf(answerOf(nums));
  const frames: RampFrame[] = [
    {
      scene: "insight",
      caption:
        drop > 0
          ? `The shortest bar sits just after the cliff, here after ${nums[drop - 1]}. Find which side of the middle bar still holds that drop.`
          : "There is no cliff. The shortest bar is already the first one. The same check must still work.",
      state: { ...blank(nums), tones: tones(n, (index) => (index === minAt ? "done" : drop > 0 && index === drop - 1 ? "miss" : null)) },
    },
    {
      scene: "insight",
      caption: `Look at the middle bar ${nums[first.mid]} and the right flag ${nums[first.high]}. If the middle is taller, the cliff is to the right of it.`,
      state: { ...blank(nums), low: 0, mid: first.mid, high: n - 1, tones: tones(n, (index) => (index === first.mid || index === n - 1 ? "edge" : null)) },
    },
  ];
  const leftTaller = nums[first.mid] > nums[first.low] && first.mid !== first.low;
  const wouldThrow = leftTaller && nums[first.mid] <= nums[first.high];
  if (wouldThrow || drop < 0) {
    frames.push({
      scene: "insight",
      caption: `The Left-End Trap: the middle bar is taller than the left flag, so you might throw the left side away. The shortest bar ${nums[minAt]} lives there.`,
      state: { ...blank(nums), low: 0, mid: first.mid, high: n - 1, wrongWay: { from: first.mid, to: n - 1 }, lost: minAt, tones: tones(n, (index) => (index === minAt ? "miss" : index <= first.mid ? "faded" : null)) },
    });
  } else {
    frames.push({
      scene: "insight",
      caption: "Compare with the right flag, never the left. A smooth left ramp does not mean the shortest bar is gone.",
      state: { ...blank(nums), low: 0, mid: first.mid, high: n - 1, tones: tones(n, (index) => (index === first.mid ? "edge" : index === n - 1 ? "hit" : null)) },
    });
  }
  frames.push({
    scene: "insight",
    caption: first.cliffRight
      ? `Here ${nums[first.mid]} is taller than the right flag ${nums[first.high]}, so the cliff is to the right. Throw the left side away, including the middle bar.`
      : `Here ${nums[first.mid]} is not taller than the right flag, so the shortest is at the middle bar or to its left. Keep the middle bar.`,
    state: { ...blank(nums), low: first.nextLow, mid: null, high: first.nextHigh, tones: tones(n, (index) => (index < first.nextLow || index > first.nextHigh ? "faded" : "window")) },
  });
  return frames;
}

function flagQuiz(nums: number[], step: Step): StoryQuiz {
  return {
    kind: "cell",
    cells: nums.length,
    numbered: nums.length <= 10,
    question: "We compare the middle bar with one flag to find the cliff. Click that flag.",
    answer: step.high,
    feedback: {
      [step.low]: "That is the left flag. Comparing with it is the Left-End Trap: a smooth left ramp can still hold the shortest bar.",
      [step.mid]: "That is the middle bar itself. Compare it with a flag at one end.",
    },
    otherwise: "Choose one of the two flags: the bar marked left or the bar marked right.",
    why: `Compare with the right flag ${nums[step.high]}. If the middle is taller, the cliff is still to the right of it.`,
  };
}

function moveQuiz(nums: number[], step: Step): StoryQuiz {
  const { low, mid, high, cliffRight, nextLow, nextHigh } = step;
  const answer = cliffRight ? nextLow : nextHigh;
  const feedback: Record<number, string> = {};
  for (let index = 0; index < nums.length; index++) {
    if (index === answer) continue;
    if (index < low || index > high) feedback[index] = "That bar was already thrown away.";
    else if (cliffRight && index === mid) feedback[index] = "The middle bar is taller than the right flag, so it cannot be the shortest. It goes with the left side.";
    else if (!cliffRight && index === high) feedback[index] = "The shortest bar is at the middle or to its left. The right flag must jump onto the middle, not past it.";
    else if (cliffRight && index < mid) feedback[index] = "The cliff is to the right of the middle bar. The whole left side, including the middle, can go.";
    else if (!cliffRight && index > mid) feedback[index] = "The middle bar is not taller than the right flag, so the shortest cannot sit to the right of it.";
  }
  return {
    kind: "cell",
    cells: nums.length,
    numbered: nums.length <= 10,
    question: "One flag must jump to throw a side away. Click the bar that flag lands on.",
    answer,
    feedback,
    otherwise: "Keep every bar that could still be the shortest. Only throw away a side you are sure about.",
    why: cliffRight
      ? `The middle bar is taller than the right flag, so the cliff is to the right. The left flag jumps just past the middle bar.`
      : `The middle bar is not taller than the right flag, so the shortest is at the middle or left. The right flag jumps onto the middle bar.`,
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): RampFrame[] {
  const n = nums.length;
  const { answer, steps } = solveClean(nums);
  const frames: RampFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let askedFlag = false;
  let askedMove = false;
  let shownTrap = false;
  let looks = 0;

  const base = (low: number, high: number, mid: number | null, inner: (index: number) => CellTone | null = () => null): RotatedMinState => ({
    nums,
    low,
    mid,
    high,
    tones: tones(n, (index) => (index < low || index > high ? "faded" : (inner(index) ?? (index === mid ? "edge" : null)))),
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row. You pick the flag to compare, and you move the flags.`
      : "The left flag starts on the first bar and the right flag on the last. The shortest bar is somewhere between them.",
    codeLine: line(0),
    state: base(0, n - 1, null),
  });

  for (const step of steps) {
    const { low, mid, high, cliffRight } = step;
    looks += 1;
    const look: RampFrame = {
      scene,
      caption: practice
        ? `The middle bar between the flags is ${nums[mid]}. Compare it with one flag.`
        : `The middle bar between the flags is ${nums[mid]}.`,
      codeLine: line(2),
      state: base(low, high, mid),
    };
    if (practice || !askedFlag) {
      askedFlag = true;
      look.quiz = flagQuiz(nums, step);
    }
    frames.push(look);

    const compared: RampFrame = {
      scene,
      caption: cliffRight
        ? `${nums[mid]} is taller than the right flag ${nums[high]}. The cliff is still to the right of the middle bar.`
        : `${nums[mid]} is not taller than the right flag ${nums[high]}. The shortest bar is at the middle or to its left.`,
      codeLine: line(3),
      state: base(low, high, mid, (index) => (index === high ? "hit" : null)),
    };
    if (practice || !askedMove) {
      askedMove = true;
      compared.quiz = moveQuiz(nums, step);
    }
    frames.push(compared);

    const leftTaller = nums[mid] > nums[low] && mid !== low;
    const fooled = leftTaller && !cliffRight;
    if (fooled && (practice || !shownTrap)) {
      shownTrap = true;
      frames.push({
        scene,
        caption: `The Left-End Trap: the middle is taller than the left flag ${nums[low]}, so you might throw the left side away. The shortest bar is still on that side.`,
        codeLine: line(3),
        state: { ...base(low, high, mid), wrongWay: { from: mid, to: high }, lost: low },
      });
    }

    frames.push({
      scene,
      caption: cliffRight
        ? `The left flag jumps just past the middle bar. The left side, including the middle, fades.`
        : `The right flag jumps onto the middle bar. The right side fades, but the middle bar stays.`,
      codeLine: line(cliffRight ? 3 : 4),
      state: base(step.nextLow, step.nextHigh, null),
    });
  }

  const at = nums.indexOf(answer);
  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}The two flags meet on the bar ${answer}. The answer is ${answer}.`,
    codeLine: line(6),
    state: { ...blank(nums), tones: tones(n, (index) => (index === at ? "done" : "faded")), counter: { label: "bars looked at", value: looks } },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log n). Each look at a middle bar throws away half of what is left: ${looks} ${looks === 1 ? "look" : "looks"} for ${n} bars.`,
      codeLine: 2,
      state: { ...blank(nums), tones: tones(n, (index) => (index === at ? "done" : "faded")), counter: { label: "bars looked at", value: looks } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only two flags and the middle bar are stored. No copy of the row is made.",
      codeLine: 0,
      state: { ...blank(nums), low: 0, mid: middle(0, n - 1), high: n - 1 },
    });
  }
  return frames;
}

export const findMinimumRotatedStory: ProblemStory<RotatedMinState> = {
  slugs: ["lc-153"],
  pattern: "Binary search on a rotated row",
  trigger: "a sorted array that was rotated, and you must find the smallest value in log time",
  insight: "The smallest value sits just after the cliff. If the middle bar is taller than the right flag, the cliff is to the right of it. If not, the shortest is at the middle or left.",
  metaphor: {
    name: "The ramp and the cliff",
    legend: "left flag = low · right flag = high · middle bar = mid · cliff = where the order breaks",
    terms: ["ramp", "cliff", "flag", "middle bar"],
  },
  traps: [
    {
      name: "The Left-End Trap",
      rule: "Compare with the right end. If mid is bigger than high, the min is strictly right of mid. A smooth left ramp can still hold the shortest bar.",
    },
  ],
  template: [
    "low = 0; high = n - 1;",
    "while (low < high) {",
    "    mid = the middle of low..high;",
    "    if (middle bar is taller than the right flag) low = mid + 1;",
    "    else high = mid;                         // mid might be the shortest",
    "}",
    "return the bar at low;",
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
    { label: "[4,5,6,7,0,1,2]", input: "4,5,6,7,0,1,2", expected: "0" },
    { label: "[3,4,5,1,2]", input: "3,4,5,1,2", expected: "1" },
    { label: "[11,13,15,17]", input: "11,13,15,17", expected: "11", note: "No rotation: the first bar is the shortest" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-33", title: "Search in Rotated Sorted Array" },
    { slug: "lc-162", title: "Find Peak Element" },
    { slug: "lc-704", title: "Binary Search" },
  ],
  answer: (input) => String(answerOf(parseInput(input))),
  frames: (input) => {
    const nums = parseInput(input);
    const practice = parseInput(PRACTICE);
    const solved = solveClean(nums);
    const first = solved.steps[0] ?? { low: 0, mid: 0, high: nums.length - 1, cliffRight: false, nextLow: 0, nextHigh: 0 };
    return [
      ...pictureFrames(nums, solved.answer),
      ...slowFrames(nums),
      ...insightFrames(nums, first),
      ...solutionFrames(nums),
      ...solutionFrames(practice, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: compare the middle bar with the right flag, never the left. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums), low: 0, mid: first.mid, high: nums.length - 1, tones: tones(nums.length, (index) => (index === first.mid || index === nums.length - 1 ? "edge" : null)) },
      },
    ];
  },
  View: GrokRotatedMinView,
};
