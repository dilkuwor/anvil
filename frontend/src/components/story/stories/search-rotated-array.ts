import type { CellTone } from "@/components/learn/viz/primitives";

import { RotatedArrayView, type RotatedArrayState } from "../rotated-array-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type RampFrame = StoryFrame<RotatedArrayState>;

/** Fresh row for the "your turn" run. Its first decision is the Cliff Trap. */
const PRACTICE = "5,6,7,8,9,1,2,3; target = 2";
const FALLBACK = { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 };

const CODE = [
  "int n = nums.length, low = 0, high = n - 1;",
  "while (low <= high) {",
  "    int mid = low + (high - low) / 2;",
  "    if (nums[mid] == target) return mid;",
  "    if (nums[low] <= nums[mid]) {",
  "        if (nums[low] <= target && target < nums[mid]) high = mid - 1;",
  "        else low = mid + 1;",
  "    } else {",
  "        if (nums[mid] < target && target <= nums[high]) low = mid + 1;",
  "        else high = mid - 1;",
  "    }",
  "}",
  "return -1;",
];

function parseInput(raw: string): { nums: number[]; target: number } {
  const [row = "", rest = ""] = raw.split(";");
  const nums = (row.match(/-?\d+/g) ?? []).map(Number);
  const wanted = rest.match(/-?\d+/);
  if (nums.length === 0 || !wanted) return FALLBACK;
  return { nums, target: Number(wanted[0]) };
}

const middle = (low: number, high: number) => low + Math.floor((high - low) / 2);

type Step = {
  low: number;
  mid: number;
  high: number;
  found: boolean;
  /** The side the code treats as the smooth ramp. */
  ramp: "left" | "right";
  /** True when the other side has no drop either. */
  bothRamps: boolean;
  onRamp: boolean;
  nextLow: number;
  nextHigh: number;
};

/** The real algorithm, recorded one look at a time. */
function solve(nums: number[], target: number): { answer: number; steps: Step[] } {
  const steps: Step[] = [];
  let low = 0;
  let high = nums.length - 1;
  while (low <= high) {
    const mid = middle(low, high);
    const leftRamp = nums[low] <= nums[mid];
    const step: Step = { low, mid, high, found: nums[mid] === target, ramp: leftRamp ? "left" : "right", bothRamps: leftRamp && nums[mid] <= nums[high], onRamp: false, nextLow: low, nextHigh: high };
    steps.push(step);
    if (step.found) return { answer: mid, steps };
    if (leftRamp) {
      step.onRamp = nums[low] <= target && target < nums[mid];
      if (step.onRamp) high = mid - 1;
      else low = mid + 1;
    } else {
      step.onRamp = nums[mid] < target && target <= nums[high];
      if (step.onRamp) low = mid + 1;
      else high = mid - 1;
    }
    step.nextLow = low;
    step.nextHigh = high;
  }
  return { answer: -1, steps };
}

type PlainMiss = { target: number; low: number; mid: number; high: number; keeps: "left" | "right"; at: number };

/** Plain binary search, as if the row had no cliff. Returns the moment it throws the target away, if it does. */
function plainMiss(nums: number[], target: number): PlainMiss | null {
  const at = nums.indexOf(target);
  if (at < 0) return null;
  let low = 0;
  let high = nums.length - 1;
  while (low <= high) {
    const mid = middle(low, high);
    if (nums[mid] === target) return null;
    const keeps = target < nums[mid] ? "left" : "right";
    if ((keeps === "left" && at > mid) || (keeps === "right" && at < mid)) return { target, low, mid, high, keeps, at };
    if (keeps === "left") high = mid - 1;
    else low = mid + 1;
  }
  return null;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

const between = (from: number, to: number, tone: CellTone) => (index: number) => (index >= from && index <= to ? tone : null);

function blank(nums: number[], target: number): RotatedArrayState {
  return { nums, target, tones: tones(nums.length, () => null), low: null, mid: null, high: null };
}

function pictureFrames(nums: number[], target: number): RampFrame[] {
  const n = nums.length;
  const drop = nums.findIndex((value, index) => index > 0 && value < nums[index - 1]);
  const at = nums.indexOf(target);
  return [
    { scene: "picture", caption: `A row of ${n} bars. Each bar is a number, and a bigger number is a taller bar.`, state: blank(nums, target) },
    {
      scene: "picture",
      caption:
        drop > 0
          ? `The row was sorted, then some bars were moved from the front to the back. So it climbs a ramp, falls off a cliff after ${nums[drop - 1]}, and climbs again.`
          : "The row was sorted, and nothing was moved this time. So it is one single ramp with no cliff.",
      state: { ...blank(nums, target), tones: tones(n, (index) => (drop > 0 && index >= drop ? "hit" : "window")) },
    },
    {
      scene: "picture",
      caption:
        at >= 0
          ? `We are given a target, here ${target}. It stands at position ${at}, so ${at} is what we must answer. A number that is not in the row gets -1.`
          : `We are given a target, here ${target}. It is not in the row, so we must answer -1. A number that is in the row gets its position.`,
      state: { ...blank(nums, target), tones: tones(n, (index) => (index === at ? "done" : null)) },
    },
    {
      scene: "picture",
      caption: "We may look at any bar. The goal: answer after looking at very few bars, even when the row has a million of them.",
      state: blank(nums, target),
    },
  ];
}

/** The obvious way, really run: look at every bar from the left until the target shows up. */
function slowFrames(nums: number[], target: number): { frames: RampFrame[]; looks: number } {
  const n = nums.length;
  const at = nums.indexOf(target);
  const last = at >= 0 ? at : n - 1;
  const frames: RampFrame[] = [];
  let looks = 0;
  for (let index = 0; index <= last; index++) {
    looks += 1;
    const hit = nums[index] === target;
    const shown = index < 2 || index === last;
    if (!shown) continue;
    const skipped = index === last && index > 2;
    let caption: string;
    if (hit) caption = `${skipped ? "And so on, bar by bar. " : ""}The bar ${nums[index]} is the target. The slow way needed ${looks} ${looks === 1 ? "look" : "looks"}.`;
    else if (index === last) caption = `${skipped ? "And so on, bar by bar, to the end. " : ""}The last bar is not ${target} either. After ${looks} looks the slow way answers -1.`;
    else if (index === 0) caption = `The slow way: look at every bar, starting on the left. The first bar is ${nums[0]}, not ${target}.`;
    else caption = `The next bar is ${nums[index]}. Not ${target} either.`;
    frames.push({
      scene: "slow",
      caption,
      state: { ...blank(nums, target), scan: index, tones: tones(n, (i) => (i === index ? (hit ? "done" : "edge") : i < index ? "faded" : null)), counter: { label: "bars looked at", value: looks } },
    });
  }
  frames.push({
    scene: "slow",
    caption: "At worst it looks at every bar: a million looks for a million bars. That is O(n) time. It never uses the fact that each ramp is sorted.",
    state: { ...blank(nums, target), tones: tones(n, () => "faded"), counter: { label: "bars looked at", value: looks } },
  });
  return { frames, looks };
}

function insightFrames(nums: number[], target: number, first: Step): RampFrame[] {
  const n = nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = middle(0, n - 1);
  const frames: RampFrame[] = [
    {
      scene: "insight",
      caption: "First, picture the same bars as one smooth ramp with no cliff. To find a number on a ramp, look at the middle bar.",
      state: { ...blank(sorted, target), low: 0, mid, high: n - 1, tones: tones(n, (index) => (index === mid ? "edge" : null)) },
    },
    {
      scene: "insight",
      caption:
        target === sorted[mid]
          ? "Here the middle bar is already the target. If not, a smaller target is on its left and a bigger one on its right. One look halves the ramp: this is binary search."
          : `The target ${target} is ${target < sorted[mid] ? "smaller" : "bigger"} than ${sorted[mid]}, so on a ramp it can only be on the ${target < sorted[mid] ? "left" : "right"}. One look throws away half the bars. This is binary search.`,
      state: {
        ...blank(sorted, target),
        low: 0,
        mid,
        high: n - 1,
        tones: tones(n, (index) => (target === sorted[mid] ? (index === mid ? "done" : null) : (target < sorted[mid] ? index >= mid : index <= mid) ? "faded" : "window")),
      },
    },
  ];

  // Show the trap for real: the target itself if plain binary search loses it, otherwise the first number it would lose.
  let miss = plainMiss(nums, target);
  for (let index = 0; !miss && index < n; index++) miss = plainMiss(nums, nums[index]);
  if (miss) {
    const { low, high, keeps } = miss;
    const size = keeps === "left" ? "smaller" : "bigger";
    const thrown = keeps === "left" ? between(miss.mid, high, "faded") : between(low, miss.mid, "faded");
    const outside = (index: number) => (index < low || index > high ? ("faded" as const) : null);
    frames.push({
      scene: "insight",
      caption: `Now the real row, with its cliff. Plain binary search for ${miss.target} looks at the middle bar ${nums[miss.mid]}. ${miss.target} is ${size}, so it keeps the ${keeps} side.`,
      state: { ...blank(nums, miss.target), low, mid: miss.mid, high, tones: tones(n, (index) => outside(index) ?? (index === miss.mid ? "edge" : null)) },
    });
    frames.push({
      scene: "insight",
      caption: `The Cliff Trap: the ${miss.target} was on the other side, beyond the cliff. Plain binary search threw it away, and would answer -1.`,
      state: { ...blank(nums, miss.target), low, high, lost: miss.at, tones: tones(n, (index) => outside(index) ?? (index === miss.at ? "miss" : thrown(index))) },
    });
  }

  const rampRange: [number, number] = first.ramp === "left" ? [first.low, first.mid] : [first.mid, first.high];
  const rampTones = tones(n, (index) => (index === first.mid ? "edge" : between(rampRange[0], rampRange[1], "hit")(index)));
  frames.push({
    scene: "insight",
    caption: first.bothRamps
      ? "The idea: cut the row at the middle bar. A cliff can only be on one side of the cut. So at least one side is always a smooth ramp."
      : `The idea: cut the row at the middle bar. The cliff can only be on one side of the cut. So the other side, here the ${first.ramp} one, is always a smooth ramp.`,
    state: { ...blank(nums, target), low: 0, mid: first.mid, high: n - 1, tones: rampTones },
  });
  frames.push({
    scene: "insight",
    caption: `A ramp is easy to check: is the target between its two end bars, ${nums[rampRange[0]]} and ${nums[rampRange[1]]}? Yes: keep the ramp. No: keep the other side.`,
    state: { ...blank(nums, target), low: 0, mid: first.mid, high: n - 1, tones: tones(n, (index) => (index === rampRange[0] || index === rampRange[1] ? "edge" : between(rampRange[0], rampRange[1], "hit")(index))) },
  });
  return frames;
}

function rampQuiz(nums: number[], step: Step): StoryQuiz {
  const { low, mid, high, ramp } = step;
  const other = ramp === "left" ? high : low;
  return {
    kind: "cell",
    cells: nums.length,
    numbered: nums.length <= 10,
    question: "One side of the middle bar climbs smoothly, with no cliff. Click the flag bar at the far end of that ramp.",
    answer: ramp === "left" ? low : high,
    feedback: {
      [other]: `Walk from the middle bar ${nums[mid]} to this bar ${nums[other]}: the row falls off a cliff on the way. This side is not a ramp.`,
      [mid]: "That is the middle bar itself. Choose the flag at the end of the smooth side.",
    },
    otherwise: "Choose one of the two flag bars: the one marked left or the one marked right.",
    why:
      ramp === "left"
        ? `From the left flag ${nums[low]} up to the middle ${nums[mid]} the bars only climb. The cliff is on the other side.`
        : `From the middle ${nums[mid]} up to the right flag ${nums[high]} the bars only climb. The cliff is on the other side.`,
  };
}

function moveQuiz(nums: number[], target: number, step: Step, trapped: boolean): StoryQuiz {
  const { low, mid, high, ramp, onRamp } = step;
  const [from, to] = ramp === "left" ? [low, mid] : [mid, high];
  const keepsLeft = step.nextHigh < high;
  const answer = keepsLeft ? step.nextHigh : step.nextLow;
  const feedback: Record<number, string> = {};
  for (let index = 0; index < nums.length; index++) {
    if (index === answer) continue;
    const onRampSide = index >= from && index <= to;
    if (index < low || index > high) feedback[index] = "That bar was already thrown away.";
    else if (index === mid) feedback[index] = `The middle bar ${nums[mid]} is not the target, so it goes too.`;
    else if (trapped && index === (keepsLeft ? mid + 1 : mid - 1)) feedback[index] = `That is plain binary search: ${target} is ${target < nums[mid] ? "smaller" : "bigger"} than ${nums[mid]}, so go that way. But that side is the ramp ${nums[from]} to ${nums[to]}, and ${target} is not on it.`;
    else if (!onRamp && onRampSide) feedback[index] = `That keeps the ramp ${nums[from]} to ${nums[to]}. But ${target} is not between them, so it cannot be there.`;
    else if (onRamp && !onRampSide) feedback[index] = `${target} is between ${nums[from]} and ${nums[to]}, so it is on the ramp. That move throws the ramp away.`;
  }
  return {
    kind: "cell",
    cells: nums.length,
    numbered: nums.length <= 10,
    question: `Is the target ${target} on this ramp? One flag must jump to throw away a side. Click the bar that flag lands on.`,
    answer,
    feedback,
    otherwise: "That side is correct, but keep every bar that could still hold the target. Only the middle bar and what lies behind it must go.",
    why: onRamp
      ? `${target} is between ${nums[from]} and ${nums[to]}, so it is on the ramp. The far flag jumps in, right next to the middle bar.`
      : `${target} is not between ${nums[from]} and ${nums[to]}, so it is not on the ramp. The ramp and the middle bar go, and the flag lands just past them.`,
  };
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh row:
 * fewer frames, no code, and the reader makes every decision.
 */
function solutionFrames(nums: number[], target: number, slowLooks: number, scene: SceneId = "solution", practice = false): RampFrame[] {
  const n = nums.length;
  const { answer, steps } = solve(nums, target);
  const frames: RampFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let askedRamp = false;
  let askedMove = false;
  let shownTrap = false;
  let looks = 0;

  const base = (low: number, high: number, mid: number | null, inner: (index: number) => CellTone | null = () => null): RotatedArrayState => ({
    nums,
    target,
    low,
    mid,
    high,
    tones: tones(n, (index) => (index < low || index > high ? "faded" : (inner(index) ?? (index === mid ? "edge" : null)))),
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row. The target is ${target}. You find the ramp, and you move the flags.`
      : "The left flag starts on the first bar and the right flag on the last. The target is between the flags, or nowhere.",
    codeLine: line(0),
    state: base(0, n - 1, null),
  });

  for (const step of steps) {
    const { low, mid, high, ramp } = step;
    const value = nums[mid];
    const single = low === high;
    looks += 1;

    if (step.found) {
      if (!practice) frames.push({ scene, caption: single ? `Both flags stand on the same bar, ${value}. It is the only bar left.` : `The middle bar between the flags is ${value}.`, codeLine: 2, state: base(low, high, mid) });
      frames.push({
        scene,
        caption: practice ? `The middle bar between the flags is ${value}. That is the target, at position ${mid}.` : `${value} is the target. It stands at position ${mid}.`,
        codeLine: line(3),
        state: base(low, high, mid, (index) => (index === mid ? "done" : null)),
      });
      break;
    }

    if (single) {
      frames.push({ scene, caption: `Both flags stand on the same bar, ${value}. It is the only bar left.`, codeLine: line(2), state: base(low, high, mid) });
      frames.push({
        scene,
        caption: `${value} is not the target ${target}. It goes too, and the flags cross. No bar is left to look at.`,
        codeLine: line(ramp === "left" ? (step.onRamp ? 5 : 6) : step.onRamp ? 8 : 9),
        state: { ...base(step.nextLow, step.nextHigh, null), low: null, high: null },
      });
      continue;
    }

    const canAskRamp = !step.bothRamps && low < mid && mid < high;
    const look: RampFrame = practice
      ? { scene, caption: `The middle bar between the flags is ${value}. It is not the target ${target}, so one side must go.`, state: base(low, high, mid) }
      : { scene, caption: `${value} is not the target ${target}. One side must go. First find the side that is a smooth ramp.`, codeLine: 3, state: base(low, high, mid) };
    if (!practice) frames.push({ scene, caption: `The middle bar between the flags is ${value}.`, codeLine: 2, state: base(low, high, mid) });
    if (canAskRamp && (practice || !askedRamp)) {
      askedRamp = true;
      look.quiz = rampQuiz(nums, step);
    }
    frames.push(look);

    const [from, to] = ramp === "left" ? [low, mid] : [mid, high];
    let rampCaption: string;
    if (step.bothRamps && low === mid) rampCaption = `No cliff is left between the flags. The left side is only the middle bar ${value} itself, and the code checks that tiny ramp first.`;
    else if (step.bothRamps) rampCaption = `No cliff is left between the flags, so both sides are ramps. The code checks the left ramp, ${nums[from]} to ${nums[to]}.`;
    else if (low === mid) rampCaption = `The left side is only the middle bar ${value} itself. One bar cannot hold a cliff, so it counts as the ramp.`;
    else if (ramp === "left") rampCaption = `From the left flag ${nums[from]} up to the middle ${nums[to]} the bars only climb. The left side is the smooth ramp.`;
    else rampCaption = `From the middle ${nums[from]} up to the right flag ${nums[to]} the bars only climb. The right side is the smooth ramp, and the cliff is on the left.`;

    // Plain binary search would pick a side by size alone. When that disagrees with the ramp check, it is the trap.
    const keepsLeft = step.nextHigh < high;
    const trapped = (target < value) !== keepsLeft;
    const found: RampFrame = { scene, caption: rampCaption, codeLine: line(4), state: base(low, high, mid, between(from, to, "hit")) };
    if (practice || !askedMove) {
      askedMove = true;
      found.quiz = moveQuiz(nums, target, step, trapped);
    }
    frames.push(found);

    frames.push({
      scene,
      caption: step.onRamp
        ? `${target} is between ${nums[from]} and ${nums[to]}, so it is on the ramp. The ${keepsLeft ? "right" : "left"} flag jumps next to the middle bar, and the other side fades.`
        : `${target} is not between ${nums[from]} and ${nums[to]}, so it is not on the ramp. ${keepsLeft ? "The right flag jumps to just before the middle bar" : "The left flag jumps just past the middle bar"}.`,
      codeLine: line(ramp === "left" ? (step.onRamp ? 5 : 6) : step.onRamp ? 8 : 9),
      state: base(step.nextLow, step.nextHigh, null),
    });

    if (trapped && (practice || !shownTrap)) {
      shownTrap = true;
      frames.push({
        scene,
        caption: `That was the Cliff Trap. ${target} is ${target < value ? "smaller" : "bigger"} than the middle bar ${value}, so plain binary search goes ${keepsLeft ? "right" : "left"}, onto a ramp that cannot hold it.`,
        codeLine: line(4),
        state: { ...base(step.nextLow, step.nextHigh, null), wrongWay: { from: mid, to: keepsLeft ? high : low } },
      });
    }
  }

  const doneTones = tones(n, (index) => (index === answer ? "done" : "faded"));
  frames.push({
    scene,
    caption:
      answer >= 0
        ? `${practice ? "Done. " : ""}The answer is ${answer}, the position of the bar ${target}. It took ${looks} ${looks === 1 ? "look" : "looks"} at a middle bar.`
        : `${practice ? "Done. " : ""}The flags crossed and ${target} never showed up. The answer is -1, after ${looks} ${looks === 1 ? "look" : "looks"} at a middle bar.`,
    codeLine: line(answer >= 0 ? 3 : 12),
    state: { ...blank(nums, target), tones: doneTones, counter: { label: "bars looked at", value: looks } },
  });

  if (!practice) {
    frames.push({
      scene,
      caption:
        looks < slowLooks
          ? `Time: O(log n). Each look at a middle bar throws away half of what is left: ${looks} looks here, where the slow way took ${slowLooks}.`
          : `Time: O(log n). Each look at a middle bar throws away half of what is left: ${looks} looks for ${n} bars, and only about 20 for a million.`,
      codeLine: 2,
      state: { ...blank(nums, target), tones: doneTones, counter: { label: "bars looked at", value: looks } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only three positions are stored: the left flag, the middle bar and the right flag. No copy of the row is made.",
      codeLine: 0,
      state: { ...blank(nums, target), low: 0, mid: middle(0, n - 1), high: n - 1 },
    });
  }
  return frames;
}

export const searchRotatedArrayStory: ProblemStory<RotatedArrayState> = {
  slugs: ["lc-33"],
  pattern: "Binary search on a rotated row",
  trigger: "a sorted row that was rotated, and you must find a value in it fast",
  insight: "Cut at the middle bar: one side is always a smooth ramp. If the target is between that ramp's two end bars, keep the ramp. If not, keep the other side.",
  metaphor: {
    name: "The ramp and the cliff",
    legend: "left flag = low · right flag = high · middle bar = mid · ramp = the sorted half · cliff = where the order breaks",
    terms: ["ramp", "cliff", "flag", "middle bar"],
  },
  traps: [
    {
      name: "The Cliff Trap",
      rule: "Never pick a side just because the target is smaller or bigger than nums[mid]. First find the sorted half (nums[low] <= nums[mid]?), then check if the target is inside it.",
    },
  ],
  template: [
    "low = 0; high = n - 1;",
    "while (low <= high) {",
    "    mid = the middle of low..high;",
    "    if (mid holds the target) return mid;",
    "    find the half with no break in it;          // the sorted half",
    "    if (target is inside that half) keep it; else keep the other half;",
    "}",
    "return -1;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(log n)",
    timeWhy: "each look at a middle bar throws away half of the bars that are left",
    space: "O(1)",
    spaceWhy: "only three positions are stored: low, mid and high",
  },
  code: CODE,
  examples: [
    { label: "[4,5,6,7,0,1,2], target 0", input: "4,5,6,7,0,1,2; target = 0", expected: "4" },
    { label: "[4,5,6,7,0,1,2], target 3", input: "4,5,6,7,0,1,2; target = 3", expected: "-1", note: "The target is not in the row" },
    { label: "[6,7,8,1,2,3,4,5], target 8", input: "6,7,8,1,2,3,4,5; target = 8", expected: "2", note: "The cliff is on the left" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-153", title: "Find Minimum in Rotated Sorted Array" },
    { slug: "lc-704", title: "Binary Search" },
    { slug: "lc-162", title: "Find Peak Element" },
  ],
  answer: (input) => {
    const { nums, target } = parseInput(input);
    return String(solve(nums, target).answer);
  },
  frames: (input) => {
    const { nums, target } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const solved = solve(nums, target);
    const slow = slowFrames(nums, target);
    const first = solved.steps[0];
    const rampRange: [number, number] = first.ramp === "left" ? [first.low, first.mid] : [first.mid, first.high];
    return [
      ...pictureFrames(nums, target),
      ...slow.frames,
      ...insightFrames(nums, target, first),
      ...solutionFrames(nums, target, slow.looks),
      ...solutionFrames(practice.nums, practice.target, 0, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: cut at the middle bar, and one side is a smooth ramp. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums, target), low: 0, mid: first.mid, high: nums.length - 1, tones: tones(nums.length, (index) => (index === first.mid ? "edge" : between(rampRange[0], rampRange[1], "hit")(index))) },
      },
    ];
  },
  View: RotatedArrayView,
};
