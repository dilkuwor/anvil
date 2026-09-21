import type { CellTone } from "@/components/learn/viz/primitives";

import { RotatedArrayView, type RotatedArrayState } from "../rotated-array-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type RampFrame = StoryFrame<RotatedArrayState>;

/** Fresh run of 3s. Walking out from one hit would read most of the row. */
const PRACTICE = "1,3,3,3,3,5; target = 3";
const FALLBACK = { nums: [5, 7, 7, 8, 8, 10], target: 8 };

const CODE = [
  "int left = bound(nums, target);",
  "if (left == nums.length || nums[left] != target) return new int[] {-1, -1};",
  "int right = bound(nums, target + 1) - 1;",
  "return new int[] {left, right};",
  "int bound(int[] nums, int value) {",
  "    int lo = 0, hi = nums.length;",
  "    while (lo < hi) {",
  "        int mid = lo + (hi - lo) / 2;",
  "        if (nums[mid] < value) lo = mid + 1;",
  "        else hi = mid;",
  "    }",
  "    return lo;",
  "}",
];

function parseInput(raw: string): { nums: number[]; target: number } {
  const [row = "", rest = ""] = raw.split(";");
  const nums = (row.match(/-?\d+/g) ?? []).map(Number);
  const wanted = rest.match(/-?\d+/);
  if (nums.length === 0 || !wanted) return FALLBACK;
  return { nums, target: Number(wanted[0]) };
}

const middle = (lo: number, hi: number) => lo + Math.floor((hi - lo) / 2);

type Step = { lo: number; mid: number; hi: number; jumpPast: boolean; nextLo: number; nextHi: number };

function bound(nums: number[], value: number): { at: number; steps: Step[] } {
  const steps: Step[] = [];
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = middle(lo, hi);
    const jumpPast = nums[mid] < value;
    const step: Step = { lo, mid, hi, jumpPast, nextLo: lo, nextHi: hi };
    if (jumpPast) lo = mid + 1;
    else hi = mid;
    step.nextLo = lo;
    step.nextHi = hi;
    steps.push(step);
  }
  return { at: lo, steps };
}

function solve(nums: number[], target: number): { left: number; right: number } {
  const left = bound(nums, target).at;
  if (left === nums.length || nums[left] !== target) return { left: -1, right: -1 };
  return { left, right: bound(nums, target + 1).at - 1 };
}

function answerOf(nums: number[], target: number): [number, number] {
  let left = -1;
  let right = -1;
  for (let index = 0; index < nums.length; index++) {
    if (nums[index] === target) {
      if (left < 0) left = index;
      right = index;
    }
  }
  return [left, right];
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[], target: number): RotatedArrayState {
  return { nums, target, tones: tones(nums.length, () => null), low: null, mid: null, high: null };
}

function pictureFrames(nums: number[], target: number, range: [number, number]): RampFrame[] {
  const n = nums.length;
  const [left, right] = range;
  const hit = left >= 0;
  return [
    { scene: "picture", caption: `A sorted row of ${n} bars. Equal values sit in one run, side by side.`, state: blank(nums, target) },
    {
      scene: "picture",
      caption: hit
        ? `The target is ${target}. It occupies a run from position ${left} to position ${right}.`
        : `The target is ${target}. It does not appear, so both ends should be -1.`,
      state: { ...blank(nums, target), tones: tones(n, (index) => (hit && index >= left && index <= right ? "done" : null)) },
    },
    {
      scene: "picture",
      caption: "Not allowed: find one hit, then walk left and right to the ends of the run. A long run makes that as slow as reading the whole row.",
      state: { ...blank(nums, target), scan: hit ? left : 0, tones: tones(n, (index) => (hit && index >= left && index <= right ? "miss" : null)) },
    },
    {
      scene: "picture",
      caption: hit ? `The goal: the two ends of the run, [${left},${right}], after looking at very few bars.` : "The goal: [-1,-1] when the target is missing, still after very few looks.",
      state: { ...blank(nums, target), tones: tones(n, (index) => (hit && index >= left && index <= right ? "done" : null)) },
    },
  ];
}

function slowFrames(nums: number[], target: number): RampFrame[] {
  const n = nums.length;
  const frames: RampFrame[] = [];
  let left = -1;
  let right = -1;
  for (let index = 0; index < n; index++) {
    if (nums[index] === target) {
      if (left < 0) left = index;
      right = index;
    }
    if (index > 1 && index < n - 1) continue;
    const skipped = index === n - 1 && n > 3;
    let caption: string;
    if (index === 0) caption = `The slow way: read every bar. The first bar is ${nums[0]}${nums[0] === target ? `, a hit.` : `, not ${target}.`}`;
    else if (index === n - 1) caption = `${skipped ? "And so on, bar by bar. " : ""}After ${n} looks the slow way answers [${left},${right}].`;
    else caption = `The next bar is ${nums[index]}.`;
    frames.push({
      scene: "slow",
      caption,
      state: { ...blank(nums, target), scan: index, tones: tones(n, (i) => (i === index ? "edge" : left >= 0 && i >= left && i <= right ? "done" : i < index ? "faded" : null)), counter: { label: "bars looked at", value: index + 1 } },
    });
  }
  frames.push({
    scene: "slow",
    caption: "At worst it looks at every bar. That is O(n) time. A long run of the target does not save any looks.",
    state: { ...blank(nums, target), tones: tones(n, () => "faded"), counter: { label: "bars looked at", value: n } },
  });
  return frames;
}

function insightFrames(nums: number[], target: number, range: [number, number]): RampFrame[] {
  const n = nums.length;
  const [left, right] = range;
  const hit = nums.findIndex((value) => value === target);
  const runEnd = hit >= 0 ? nums.lastIndexOf(target) : -1;
  return [
    {
      scene: "insight",
      caption: "Think of two posts on a sorted ramp. The left post stands at the first bar that is not smaller than the target.",
      state: { ...blank(nums, target), low: left >= 0 ? left : Math.min(n - 1, bound(nums, target).at), tones: tones(n, (index) => (index === (left >= 0 ? left : 0) ? "edge" : null)) },
    },
    {
      scene: "insight",
      caption: left >= 0
        ? `The right post stands one step left of the first bar bigger than ${target}. Together they fence the run.`
        : `If that first bar is not the target, there is no run. Both posts report -1.`,
      state: { ...blank(nums, target), low: left >= 0 ? left : null, high: right >= 0 ? right : null, tones: tones(n, (index) => (left >= 0 && index >= left && index <= right ? "done" : null)) },
    },
    {
      scene: "insight",
      caption:
        hit >= 0
          ? `The Walk-Out Trap: find one ${target}, then walk to both ends. On a run from ${hit} to ${runEnd} that is as slow as reading the whole row.`
          : `The Walk-Out Trap still fails when the target is missing: you would scan for a hit that never comes.`,
      state: {
        ...blank(nums, target),
        scan: hit >= 0 ? hit : 0,
        wrongWay: hit >= 0 && runEnd > hit ? { from: hit, to: runEnd } : null,
        tones: tones(n, (index) => (hit >= 0 && index >= hit && index <= runEnd ? "miss" : null)),
      },
    },
  ];
}

function sideQuiz(step: Step, value: number, nums: number[]): StoryQuiz {
  return {
    kind: "choice",
    question: `The middle bar is ${nums[step.mid]}, and we want the first bar that is not smaller than ${value}. Which post jumps?`,
    options: ["The left post jumps just past the middle bar", "The right post jumps onto the middle bar"],
    answer: step.jumpPast ? 0 : 1,
    why: step.jumpPast
      ? `${nums[step.mid]} is smaller than ${value}, so the first good bar is to the right. The left post jumps past the middle.`
      : `${nums[step.mid]} is not smaller than ${value}, so it might be the first good bar. The right post jumps onto it.`,
  };
}

function searchFrames(nums: number[], target: number, value: number, label: string, scene: SceneId, practice: boolean, asked: { move: boolean }): RampFrame[] {
  const n = nums.length;
  const { at, steps } = bound(nums, value);
  const frames: RampFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const lastBar = n - 1;

  frames.push({
    scene,
    caption: practice ? `Now the ${label}. The value we fence is ${value}.` : `${label}: find the first bar that is not smaller than ${value}.`,
    codeLine: line(label.startsWith("left") ? 0 : 2),
    state: { ...blank(nums, target), low: 0, high: lastBar, tones: tones(n, () => "window") },
  });

  for (const step of steps) {
    const hiBar = Math.min(step.hi, lastBar);
    const look: RampFrame = {
      scene,
      caption: `The middle bar between the posts is ${nums[step.mid]}.`,
      codeLine: line(7),
      state: {
        ...blank(nums, target),
        low: step.lo <= lastBar ? step.lo : null,
        mid: step.mid,
        high: hiBar >= step.lo ? hiBar : null,
        tones: tones(n, (index) => (index < step.lo || index >= step.hi ? "faded" : index === step.mid ? "edge" : null)),
      },
    };
    if (practice || !asked.move) {
      asked.move = true;
      look.quiz = sideQuiz(step, value, nums);
    }
    frames.push(look);

    frames.push({
      scene,
      caption: step.jumpPast
        ? `${nums[step.mid]} is smaller than ${value}. The left post jumps just past the middle bar.`
        : `${nums[step.mid]} is not smaller than ${value}. The right post jumps onto the middle bar.`,
      codeLine: line(step.jumpPast ? 8 : 9),
      state: {
        ...blank(nums, target),
        low: step.nextLo <= lastBar ? step.nextLo : null,
        high: Math.min(step.nextHi, lastBar),
        tones: tones(n, (index) => (index < step.nextLo || index >= step.nextHi ? "faded" : "window")),
      },
    });
  }

  frames.push({
    scene,
    caption: at === n ? `The posts meet past the last bar. No bar is at least ${value}.` : `The posts meet on the bar ${nums[at]} at position ${at}.`,
    codeLine: line(11),
    state: {
      ...blank(nums, target),
      low: at <= lastBar ? at : null,
      high: at <= lastBar ? at : null,
      tones: tones(n, (index) => (index === at ? "done" : "faded")),
    },
  });
  return frames;
}

function solutionFrames(nums: number[], target: number, scene: SceneId = "solution", practice = false): RampFrame[] {
  const n = nums.length;
  const frames: RampFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const asked = { move: false };
  const range = solve(nums, target);
  const hit = nums.findIndex((value) => value === target);
  const runEnd = hit >= 0 ? nums.lastIndexOf(target) : -1;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row. The target is ${target}. You move the posts for each search.`
      : "Two searches, two posts. First fence the left end of the run, then the first bar after it.",
    codeLine: line(0),
    state: { ...blank(nums, target), low: 0, high: n - 1 },
  });

  if (hit >= 0 && (practice || n >= 4)) {
    frames.push({
      scene,
      caption: `The Walk-Out Trap: one hit at ${nums[hit]}, then a walk to both ends, would read ${runEnd - hit + 1} bars of the run. We search twice instead.`,
      codeLine: line(0),
      state: { ...blank(nums, target), scan: hit, wrongWay: runEnd > hit ? { from: hit, to: runEnd } : null, tones: tones(n, (index) => (index >= hit && index <= runEnd ? "miss" : null)) },
    });
  }

  frames.push(...searchFrames(nums, target, target, "left post", scene, practice, asked));
  const left = bound(nums, target).at;
  if (left === n || nums[left] !== target) {
    frames.push({
      scene,
      caption: `${practice ? "Done. " : ""}That bar is not ${target}. There is no run. The answer is [-1,-1].`,
      codeLine: line(1),
      state: { ...blank(nums, target), tones: tones(n, () => "faded") },
    });
  } else {
    frames.push(...searchFrames(nums, target, target + 1, "right post", scene, practice, asked));
    frames.push({
      scene,
      caption: `${practice ? "Done. " : ""}The right post sits one step past the run, so the last hit is ${range.right}. The answer is [${range.left},${range.right}].`,
      codeLine: line(3),
      state: { ...blank(nums, target), low: range.left, high: range.right, tones: tones(n, (index) => (index >= range.left && index <= range.right ? "done" : "faded")) },
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: "Time: O(log n). Each post search halves the remaining bars, twice. A long run does not add extra looks.",
      codeLine: 7,
      state: { ...blank(nums, target), low: range.left >= 0 ? range.left : 0, high: range.right >= 0 ? range.right : n - 1, counter: { label: "searches", value: 2 } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two posts are stored. No copy of the row is made.",
      codeLine: 5,
      state: { ...blank(nums, target), low: 0, high: n - 1 },
    });
  }
  return frames;
}

export const searchRangeStory: ProblemStory<RotatedArrayState> = {
  slugs: ["lc-34"],
  pattern: "Binary search for a range",
  trigger: "a sorted array, and you need the first and last index of a value, in log time",
  insight: "Search twice on the sorted row. One search finds the leftmost target. The other finds the leftmost value bigger than target, then step one left.",
  metaphor: {
    name: "The two posts",
    legend: "left post = first index >= target · right post = first index >= target + 1, then step left · run = the equal values between them",
    terms: ["post", "run", "flag", "middle bar"],
  },
  traps: [
    {
      name: "The Walk-Out Trap",
      rule: "A long run of the target makes walking out from one hit O(n). Use a second bound search.",
    },
  ],
  template: [
    "left = first index that is not smaller than target;",
    "if that bar is missing or not the target: return [-1, -1];",
    "right = first index that is not smaller than target + 1, minus one;",
    "return [left, right];",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(log n)",
    timeWhy: "each bound search halves the remaining range, twice",
    space: "O(1)",
    spaceWhy: "only the two search pointers",
  },
  code: CODE,
  examples: [
    { label: "[5,7,7,8,8,10], target 8", input: "5,7,7,8,8,10; target = 8", expected: "[3,4]" },
    { label: "[5,7,7,8,8,10], target 6", input: "5,7,7,8,8,10; target = 6", expected: "[-1,-1]", note: "The value is missing" },
    { label: "[2,2,2,2], target 2", input: "2,2,2,2; target = 2", expected: "[0,3]", note: "The whole row is the run" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-704", title: "Binary Search" },
    { slug: "lc-278", title: "First Bad Version" },
    { slug: "first-and-last-position", title: "First and Last Position" },
  ],
  answer: (input) => {
    const { nums, target } = parseInput(input);
    const [left, right] = answerOf(nums, target);
    return `[${left},${right}]`;
  },
  frames: (input) => {
    const { nums, target } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const range = answerOf(nums, target);
    return [
      ...pictureFrames(nums, target, range),
      ...slowFrames(nums, target),
      ...insightFrames(nums, target, range),
      ...solutionFrames(nums, target),
      ...solutionFrames(practice.nums, practice.target, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: two posts fencing a run on a sorted ramp. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums, target), low: range[0] >= 0 ? range[0] : null, high: range[1] >= 0 ? range[1] : null, tones: tones(nums.length, (index) => (range[0] >= 0 && index >= range[0] && index <= range[1] ? "done" : null)) },
      },
    ];
  },
  View: RotatedArrayView,
};
