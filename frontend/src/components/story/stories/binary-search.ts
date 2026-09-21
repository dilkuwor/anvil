import type { CellTone } from "@/components/learn/viz/primitives";

import { RotatedArrayView, type RotatedArrayState } from "../rotated-array-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type RampFrame = StoryFrame<RotatedArrayState>;

/** Fresh ramp. The target sits on the right, so the first middle is too small. */
const PRACTICE = "1,3,5,7,9; target = 7";
const FALLBACK = { nums: [-1, 0, 3, 5, 9, 12], target: 9 };

const CODE = [
  "int low = 0, high = nums.length - 1;",
  "while (low <= high) {",
  "    int mid = low + (high - low) / 2;",
  "    if (nums[mid] == target) return mid;",
  "    if (nums[mid] < target) low = mid + 1;",
  "    else high = mid - 1;",
  "}",
  "return -1;",
];

function parseInput(raw: string): { nums: number[]; target: number } {
  const [row = "", rest = ""] = raw.split(";");
  const nums = (row.match(/-?\d+/g) ?? []).map(Number);
  const wanted = rest.match(/-?\d+/) ?? raw.match(/target\s*=\s*(-?\d+)/);
  if (nums.length === 0 || !wanted) return FALLBACK;
  return { nums, target: Number(wanted[wanted.length - 1]) };
}

const middle = (low: number, high: number) => low + Math.floor((high - low) / 2);

type Step = {
  low: number;
  mid: number;
  high: number;
  found: boolean;
  goRight: boolean;
  nextLow: number;
  nextHigh: number;
};

function solve(nums: number[], target: number): { answer: number; steps: Step[] } {
  const steps: Step[] = [];
  let low = 0;
  let high = nums.length - 1;
  while (low <= high) {
    const mid = middle(low, high);
    const found = nums[mid] === target;
    const goRight = nums[mid] < target;
    const step: Step = { low, mid, high, found, goRight, nextLow: low, nextHigh: high };
    if (found) {
      steps.push(step);
      return { answer: mid, steps };
    }
    if (goRight) low = mid + 1;
    else high = mid - 1;
    step.nextLow = low;
    step.nextHigh = high;
    steps.push(step);
  }
  return { answer: -1, steps };
}

/** Independent of the search: walk left to right. */
function answerOf(nums: number[], target: number): number {
  return nums.indexOf(target);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[], target: number): RotatedArrayState {
  return { nums, target, tones: tones(nums.length, () => null), low: null, mid: null, high: null };
}

function pictureFrames(nums: number[], target: number): RampFrame[] {
  const n = nums.length;
  const at = nums.indexOf(target);
  return [
    { scene: "picture", caption: `A row of ${n} bars, already sorted from short to tall. A taller bar is a bigger number.`, state: blank(nums, target) },
    {
      scene: "picture",
      caption: `We are given a target, here ${target}. ${at >= 0 ? `It stands at position ${at}, so ${at} is what we must answer.` : "It is not in the row, so we must answer -1."}`,
      state: { ...blank(nums, target), tones: tones(n, (index) => (index === at ? "done" : null)) },
    },
    {
      scene: "picture",
      caption: "Because the row is a smooth ramp, a look at the middle bar tells you which half cannot hold the target.",
      state: { ...blank(nums, target), low: 0, mid: middle(0, n - 1), high: n - 1, tones: tones(n, (index) => (index === middle(0, n - 1) ? "edge" : null)) },
    },
    {
      scene: "picture",
      caption: "The goal: answer after looking at very few bars, even when the row has a million of them.",
      state: blank(nums, target),
    },
  ];
}

function slowFrames(nums: number[], target: number): RampFrame[] {
  const n = nums.length;
  const at = nums.indexOf(target);
  const last = at >= 0 ? at : n - 1;
  const frames: RampFrame[] = [];
  for (let index = 0; index <= last; index++) {
    const hit = nums[index] === target;
    if (index > 1 && index !== last) continue;
    const skipped = index === last && index > 2;
    let caption: string;
    if (hit) caption = `${skipped ? "And so on, bar by bar. " : ""}The bar ${nums[index]} is the target. The slow way needed ${index + 1} ${index + 1 === 1 ? "look" : "looks"}.`;
    else if (index === 0) caption = `The slow way: look at every bar from the left. The first bar is ${nums[0]}, not ${target}.`;
    else if (index === last) caption = `${skipped ? "And so on, bar by bar, to the end. " : ""}The last bar is not ${target} either. After ${n} looks the slow way answers -1.`;
    else caption = `The next bar is ${nums[index]}. Not ${target} either.`;
    frames.push({
      scene: "slow",
      caption,
      state: { ...blank(nums, target), scan: index, tones: tones(n, (i) => (i === index ? (hit ? "done" : "edge") : i < index ? "faded" : null)), counter: { label: "bars looked at", value: index + 1 } },
    });
  }
  frames.push({
    scene: "slow",
    caption: "At worst it looks at every bar. That is O(n) time. It never uses the fact that the ramp is sorted.",
    state: { ...blank(nums, target), tones: tones(n, () => "faded"), counter: { label: "bars looked at", value: last + 1 } },
  });
  return frames;
}

function insightFrames(nums: number[], target: number): RampFrame[] {
  const n = nums.length;
  const mid = middle(0, n - 1);
  const value = nums[mid];
  const at = nums.indexOf(target);
  const goLeft = target < value;
  return [
    {
      scene: "insight",
      caption: `Picture a smooth ramp. Look at the middle bar ${value}. The target is ${target === value ? "this bar" : target < value ? "smaller, so on its left" : "bigger, so on its right"}.`,
      state: { ...blank(nums, target), low: 0, mid, high: n - 1, tones: tones(n, (index) => (index === mid ? "edge" : null)) },
    },
    {
      scene: "insight",
      caption:
        target === value
          ? "Here the middle bar is already the target. One look is enough."
          : `One look throws away the ${goLeft ? "right" : "left"} half. That is the whole idea: each look halves the ramp.`,
      state: {
        ...blank(nums, target),
        low: 0,
        mid,
        high: n - 1,
        tones: tones(n, (index) => (target === value ? (index === mid ? "done" : null) : goLeft ? (index >= mid ? "faded" : "window") : index <= mid ? "faded" : "window")),
      },
    },
    {
      scene: "insight",
      caption: `The Overflow Trap: adding the two flag positions can wrap on a huge ramp. Step half the gap from the left flag instead. Here that still lands on the middle bar ${value}.`,
      state: { ...blank(nums, target), low: 0, mid, high: n - 1, lost: at >= 0 && at !== mid ? at : null, tones: tones(n, (index) => (index === mid ? "edge" : null)) },
    },
  ];
}

function moveQuiz(nums: number[], target: number, step: Step): StoryQuiz {
  const { low, mid, high, goRight, nextLow, nextHigh } = step;
  const answer = goRight ? nextLow : nextHigh;
  const feedback: Record<number, string> = {};
  for (let index = 0; index < nums.length; index++) {
    if (index === answer) continue;
    if (index < low || index > high) feedback[index] = "That bar was already thrown away.";
    else if (index === mid) feedback[index] = `The middle bar ${nums[mid]} is not the target, so it goes too.`;
    else if (goRight && index < mid) feedback[index] = `${target} is bigger than ${nums[mid]}, so it cannot sit on the left.`;
    else if (!goRight && index > mid) feedback[index] = `${target} is smaller than ${nums[mid]}, so it cannot sit on the right.`;
  }
  return {
    kind: "cell",
    cells: nums.length,
    numbered: nums.length <= 10,
    question: `The middle bar is not ${target}. One flag must jump. Click the bar that flag lands on.`,
    answer,
    feedback,
    otherwise: "Throw away the middle bar and the half that cannot hold the target. Keep the rest.",
    why: goRight
      ? `${target} is bigger than ${nums[mid]}, so it sits to the right. The left flag jumps just past the middle bar.`
      : `${target} is smaller than ${nums[mid]}, so it sits to the left. The right flag jumps to just before the middle bar.`,
  };
}

function solutionFrames(nums: number[], target: number, scene: SceneId = "solution", practice = false): RampFrame[] {
  const n = nums.length;
  const { answer, steps } = solve(nums, target);
  const frames: RampFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let askedMove = false;
  let shownTrap = false;
  let looks = 0;

  const base = (low: number, high: number, mid: number | null): RotatedArrayState => ({
    nums,
    target,
    low: low <= high ? low : null,
    mid,
    high: low <= high ? high : null,
    tones: tones(n, (index) => (low > high || index < low || index > high ? "faded" : index === mid ? "edge" : null)),
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new ramp. The target is ${target}. You move the flags.`
      : "The left flag starts on the first bar and the right flag on the last. The target is between them, or nowhere.",
    codeLine: line(0),
    state: base(0, n - 1, null),
  });

  for (const step of steps) {
    const { low, mid, high, found, goRight } = step;
    looks += 1;
    const look: RampFrame = {
      scene,
      caption: shownTrap || practice
        ? `The middle bar between the flags is ${nums[mid]}.`
        : `The middle bar is ${nums[mid]}. The Overflow Trap: we step half the gap from the left flag, so the middle cannot wrap.`,
      codeLine: line(2),
      state: base(low, high, mid),
    };
    if (practice) {
      look.quiz = {
        kind: "choice",
        question: `The middle bar is ${nums[mid]}. Is it the target ${target}?`,
        options: ["Yes, this is the target", "No, a half of the ramp must go"],
        answer: found ? 0 : 1,
        why: found ? `${nums[mid]} is the target, so we stop here.` : `${nums[mid]} is not ${target}, so one half of the ramp can go.`,
      };
    }
    frames.push(look);
    shownTrap = true;

    if (found) {
      frames.push({
        scene,
        caption: practice ? `That bar is the target, at position ${mid}.` : `${nums[mid]} is the target. It stands at position ${mid}.`,
        codeLine: line(3),
        state: { ...base(low, high, mid), tones: tones(n, (index) => (index < low || index > high ? "faded" : index === mid ? "done" : null)) },
      });
      break;
    }

    const decide: RampFrame = {
      scene,
      caption: goRight ? `${nums[mid]} is smaller than ${target}, so the target can only sit to the right.` : `${nums[mid]} is bigger than ${target}, so the target can only sit to the left.`,
      codeLine: line(4),
      state: {
        ...base(low, high, mid),
        tones: tones(n, (index) => (index < low || index > high ? "faded" : index === mid ? "miss" : null)),
      },
    };
    if (practice || !askedMove) {
      askedMove = true;
      decide.quiz = moveQuiz(nums, target, step);
    }
    frames.push(decide);

    frames.push({
      scene,
      caption: goRight
        ? `The left flag jumps just past the middle bar. The left half, including the middle, fades.`
        : `The right flag jumps to just before the middle bar. The right half, including the middle, fades.`,
      codeLine: line(goRight ? 4 : 5),
      state: base(step.nextLow, step.nextHigh, null),
    });
  }

  const doneTones = tones(n, (index) => (index === answer ? "done" : "faded"));
  frames.push({
    scene,
    caption:
      answer >= 0
        ? `${practice ? "Done. " : ""}The answer is ${answer}, the position of the bar ${target}. It took ${looks} ${looks === 1 ? "look" : "looks"}.`
        : `${practice ? "Done. " : ""}The flags crossed and ${target} never showed up. The answer is -1, after ${looks} ${looks === 1 ? "look" : "looks"}.`,
    codeLine: line(answer >= 0 ? 3 : 7),
    state: { ...blank(nums, target), tones: doneTones, counter: { label: "bars looked at", value: looks } },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log n). Each look at a middle bar throws away half of what is left: ${looks} ${looks === 1 ? "look" : "looks"} for ${n} bars.`,
      codeLine: 2,
      state: { ...blank(nums, target), tones: doneTones, counter: { label: "bars looked at", value: looks } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only two flags and the middle bar are stored. No copy of the ramp is made.",
      codeLine: 0,
      state: { ...blank(nums, target), low: 0, mid: middle(0, n - 1), high: n - 1 },
    });
  }
  return frames;
}

export const binarySearchStory: ProblemStory<RotatedArrayState> = {
  slugs: ["lc-704"],
  pattern: "Binary search",
  trigger: "a sorted array of distinct values, and you must return the index of a target or -1",
  insight: "Look at the middle of the remaining ramp. If it is the target, stop. If the target is smaller, drop the right half. If larger, drop the left half.",
  metaphor: {
    name: "The ramp",
    legend: "left flag = low · right flag = high · middle bar = mid · ramp = the sorted row",
    terms: ["ramp", "flag", "middle bar", "half"],
  },
  traps: [
    {
      name: "The Overflow Trap",
      rule: "Use mid = low + (high - low) / 2. Adding the two ends can wrap on a huge row.",
    },
  ],
  template: [
    "low = 0; high = n - 1;",
    "while (low <= high) {",
    "    mid = left flag plus half the gap;",
    "    if (mid holds the target) return mid;",
    "    if (mid is too small) low = mid + 1; else high = mid - 1;",
    "}",
    "return -1;",
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
    { label: "[-1,0,3,5,9,12], target 9", input: "-1,0,3,5,9,12; target = 9", expected: "4" },
    { label: "[-1,0,3,5,9,12], target 2", input: "-1,0,3,5,9,12; target = 2", expected: "-1", note: "The target is not in the row" },
    { label: "[5], target 5", input: "5; target = 5", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-34", title: "Find First and Last Position of Element in Sorted Array" },
    { slug: "lc-278", title: "First Bad Version" },
    { slug: "lc-74", title: "Search a 2D Matrix" },
  ],
  answer: (input) => {
    const { nums, target } = parseInput(input);
    return String(answerOf(nums, target));
  },
  frames: (input) => {
    const { nums, target } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const mid = middle(0, nums.length - 1);
    return [
      ...pictureFrames(nums, target),
      ...slowFrames(nums, target),
      ...insightFrames(nums, target),
      ...solutionFrames(nums, target),
      ...solutionFrames(practice.nums, practice.target, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a smooth ramp, a middle bar, and one half fading away. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums, target), low: 0, mid, high: nums.length - 1, tones: tones(nums.length, (index) => (index === mid ? "edge" : null)) },
      },
    ];
  },
  View: RotatedArrayView,
};
