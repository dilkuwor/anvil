import { TrappingWaterView, type TrappingWaterState } from "../trapping-water-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TrappingWaterState>;
type Side = "left" | "right";

/** Fresh ground for the "your turn" run: both markers get to move, no two walls tie, and the Spill Trap is waiting. */
const PRACTICE = "2,0,4,1,0,3";

const CODE = [
  "int n = height.length, total = 0;",
  "int left = 0, right = n - 1;",
  "int leftWall = height[left], rightWall = height[right];",
  "while (left < right) {",
  "    if (leftWall <= rightWall) {",
  "        left++;",
  "        leftWall = Math.max(leftWall, height[left]);",
  "        total += leftWall - height[left];",
  "    } else {",
  "        right--;",
  "        rightWall = Math.max(rightWall, height[right]);",
  "        total += rightWall - height[right];",
  "    }",
  "}",
  "return total;",
];

function parse(input: string): number[] {
  return input
    .replace(/[\[\]\s]/g, "")
    .split(",")
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const otherSide = (side: Side): Side => (side === "left" ? "right" : "left");

type Look = { index: number; leftIdx: number; rightIdx: number; level: number; units: number };
type Slow = { water: number[]; total: number; looks: Look[]; lookCount: number[] };

/**
 * The slow way, really run: for every bar, look at every bar on its left and on its right.
 * It is also the independent solver behind `answer`.
 */
function slowSolve(heights: number[]): Slow {
  const water: number[] = [];
  const looks: Look[] = [];
  const lookCount: number[] = [];
  let looked = 0;
  let total = 0;
  heights.forEach((height, index) => {
    let leftIdx = index;
    let rightIdx = index;
    for (let j = index - 1; j >= 0; j--) {
      looked++;
      if (heights[j] > heights[leftIdx]) leftIdx = j;
    }
    for (let j = index + 1; j < heights.length; j++) {
      looked++;
      if (heights[j] > heights[rightIdx]) rightIdx = j;
    }
    const level = Math.min(heights[leftIdx], heights[rightIdx]);
    water.push(level - height);
    total += level - height;
    looks.push({ index, leftIdx, rightIdx, level, units: level - height });
    lookCount.push(looked);
  });
  return { water, total, looks, lookCount };
}

/** One step of the real two-marker walk, recorded so every scene can be built from the same run. */
type Step = {
  side: Side;
  tie: boolean;
  /** State before the step. */
  left: number;
  right: number;
  leftWall: number;
  rightWall: number;
  /** The bar the marker steps onto, and what happens there. */
  index: number;
  wallAfter: number;
  units: number;
  totalAfter: number;
  /** What the higher wall's side would wrongly pour onto its next bar, when that is more than the bar can really hold. */
  spill: { index: number; level: number } | null;
};

function walk(heights: number[], truth: number[]): Step[] {
  const steps: Step[] = [];
  if (heights.length === 0) return steps;
  let left = 0;
  let right = heights.length - 1;
  let leftWall = heights[left];
  let rightWall = heights[right];
  let total = 0;
  while (left < right) {
    const side: Side = leftWall <= rightWall ? "left" : "right";
    const index = side === "left" ? left + 1 : right - 1;
    const wallAfter = Math.max(side === "left" ? leftWall : rightWall, heights[index]);
    const units = wallAfter - heights[index];
    total += units;

    let spill: Step["spill"] = null;
    const wrongIndex = side === "left" ? right - 1 : left + 1;
    if (leftWall !== rightWall && wrongIndex > left && wrongIndex < right) {
      const level = Math.max(leftWall, rightWall);
      if (level - heights[wrongIndex] > truth[wrongIndex]) spill = { index: wrongIndex, level };
    }

    steps.push({ side, tie: leftWall === rightWall, left, right, leftWall, rightWall, index, wallAfter, units, totalAfter: total, spill });
    if (side === "left") {
      left = index;
      leftWall = wallAfter;
    } else {
      right = index;
      rightWall = wallAfter;
    }
  }
  return steps;
}

function blank(heights: number[]): TrappingWaterState {
  return { heights, water: heights.map(() => 0), left: null, right: null, leftWall: null, rightWall: null, total: null };
}

function pictureFrames(heights: number[], slow: Slow): Frame[] {
  const frames: Frame[] = [{ scene: "picture", caption: `This is the ground seen from the side: ${plural(heights.length, "bar")}. The number under each bar is its height.`, state: blank(heights) }];
  const pool = slow.looks.find((look) => look.units > 0);
  if (pool) {
    frames.push({
      scene: "picture",
      caption: `Rain falls. Water stays over a bar when there is a taller bar somewhere on its left and somewhere on its right.`,
      state: { ...blank(heights), water: heights.map((_, index) => (index === pool.index ? pool.units : 0)), look: { index: pool.index, holders: [pool.leftIdx, pool.rightIdx] } },
    });
  }
  // A bar that is open on one side: the water there has nothing to lean on.
  const open = slow.looks.find((look) => look.units === 0 && Math.max(heights[look.leftIdx], heights[look.rightIdx]) > heights[look.index]);
  if (open) {
    const openSide: Side = open.leftIdx === open.index ? "left" : "right";
    frames.push({
      scene: "picture",
      caption: `Water cannot stay here. Nothing on the ${openSide} of this bar is taller, so the water runs off that way.`,
      state: { ...blank(heights), look: { index: open.index, holders: [] }, spill: { index: open.index, level: Math.max(heights[open.leftIdx], heights[open.rightIdx]), note: `✕ runs off to the ${openSide}` } },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: count all the water that stays. Each square of water counts as 1. Here the count is ${slow.total}.`,
    state: { ...blank(heights), water: [...slow.water], total: slow.total },
  });
  return frames;
}

function slowFrames(heights: number[], slow: Slow): Frame[] {
  const frames: Frame[] = [];
  const shown = slow.looks.filter((look) => look.units > 0).slice(0, 2);
  const waterUpTo = (last: number) => slow.water.map((units, index) => (index <= last ? units : 0));
  shown.forEach((look, position) => {
    const state: TrappingWaterState = {
      ...blank(heights),
      look: { index: look.index, holders: [look.leftIdx, look.rightIdx] },
      counter: { label: "bars looked at", value: slow.lookCount[look.index] },
    };
    frames.push({
      scene: "slow",
      caption:
        position === 0
          ? `The slow way: take one bar at a time. Look at every bar on its left for the tallest (${heights[look.leftIdx]}), then every bar on its right (${heights[look.rightIdx]}).`
          : `Next bar: look all the way left again (${heights[look.leftIdx]}) and all the way right again (${heights[look.rightIdx]}).`,
      state: { ...state, water: waterUpTo(look.index - 1) },
    });
    frames.push({
      scene: "slow",
      caption: `Water stands up to the lower of those two, ${look.level}. This bar is ${heights[look.index]} high, so it holds ${look.level} − ${heights[look.index]} = ${look.units}.`,
      state: { ...state, water: waterUpTo(look.index) },
    });
  });
  const looked = slow.lookCount.at(-1) ?? 0;
  frames.push({
    scene: "slow",
    caption: `Doing that for every bar took ${plural(looked, "look")} for only ${plural(heights.length, "bar")}, to count ${slow.total}. This is O(n²) time: far too slow for 20,000 bars.`,
    state: { ...blank(heights), water: [...slow.water], total: slow.total, counter: { label: "bars looked at", value: looked } },
  });
  return frames;
}

function insightFrames(heights: number[], steps: Step[]): Frame[] {
  // The first moment water is poured, preferring one where the two walls differ.
  const moment = steps.find((step) => step.units > 0 && !step.tie) ?? steps.find((step) => step.units > 0) ?? steps[0];
  if (!moment) return [];
  const { side, left, right, leftWall, rightWall } = moment;
  const other = otherSide(side);
  const mine = side === "left" ? leftWall : rightWall;
  const theirs = side === "left" ? rightWall : leftWall;
  const at: TrappingWaterState = { ...blank(heights), left, right, leftWall, rightWall };
  return [
    {
      scene: "insight",
      caption: "Picture two walls closing in from the two ends. Each wall is as high as the tallest bar its side has passed so far.",
      state: at,
    },
    {
      scene: "insight",
      caption: `Look at the bar next to the ${side} marker. Water over it is held in by two walls, and it can only stand as high as the lower one.`,
      state: { ...at, focus: moment.index },
    },
    {
      scene: "insight",
      caption: `The ${side} wall (${mine}) is ${moment.tie ? "no higher than" : "lower than"} the ${other} wall (${theirs}). The bars we have not seen can only make the ${other} wall taller.`,
      state: { ...at, focus: moment.index, deciding: side },
    },
    {
      scene: "insight",
      caption: `So the lower wall decides alone. This bar can be filled right now, up to ${mine}, without looking at the rest.`,
      state: { ...at, focus: moment.index, deciding: side, water: heights.map((_, index) => (index === moment.index ? moment.units : 0)) },
    },
  ];
}

function sideQuiz(heights: number[], step: Step): StoryQuiz {
  const answer = step.side === "left" ? step.left : step.right;
  const wrong = step.side === "left" ? step.right : step.left;
  return {
    kind: "cell",
    cells: heights.length,
    question: "Which side is safe to fill next? Click the bar its marker stands on.",
    answer,
    feedback: {
      [wrong]: "The Spill Trap. This side has the higher wall. Water filled that high could spill over the lower wall on the other side.",
    },
    otherwise: "Only a side with a marker can move. Pick one of the two marked bars.",
    why: `The ${step.side} wall is the lower one, so it alone decides how high the water stands next to it.`,
  };
}

function landing(heights: number[], step: Step): string {
  const height = heights[step.index];
  const wallBefore = step.side === "left" ? step.leftWall : step.rightWall;
  if (height > wallBefore) return `This bar (${height}) is taller than the ${step.side} wall (${wallBefore}), so the ${step.side} wall rises to ${height}. No water sits on top of a wall.`;
  if (height === wallBefore) return `This bar is exactly as high as the ${step.side} wall (${wallBefore}), so no water fits on it.`;
  return `Water stands up to the ${step.side} wall (${wallBefore}). This bar is ${height} high, so it holds ${wallBefore} − ${height} = ${step.units}. Total water: ${step.totalAfter}.`;
}

function solutionFrames(heights: number[], steps: Step[], slow: Slow): Frame[] {
  const frames: Frame[] = [];
  const water = heights.map(() => 0);
  const last = heights.length - 1;
  const asked: Record<Side, boolean> = { left: false, right: false };
  let trapShown = false;
  let total = 0;

  frames.push({ scene: "solution", caption: "A marker stands on each end bar. No water has been counted yet.", codeLine: 1, state: { ...blank(heights), left: 0, right: last, total: 0 } });
  frames.push({
    scene: "solution",
    caption: `Each end bar is its side's first wall. The left wall is ${heights[0]} high and the right wall is ${heights[last]} high.`,
    codeLine: 2,
    state: { ...blank(heights), left: 0, right: last, leftWall: heights[0], rightWall: heights[last], total: 0 },
  });

  steps.forEach((step, position) => {
    const { side, left, right, leftWall, rightWall } = step;
    const other = otherSide(side);
    const mine = side === "left" ? leftWall : rightWall;
    const theirs = side === "left" ? rightWall : leftWall;
    const before: TrappingWaterState = { ...blank(heights), water: [...water], left, right, leftWall, rightWall, total };
    const isLeft = side === "left";

    const wantsQuiz = !step.tie && !asked[side];
    const wantsTrap = !step.tie && !trapShown && step.spill !== null;
    if (wantsQuiz || wantsTrap) {
      asked[side] = true;
      frames.push({
        scene: "solution",
        caption: `One marker must step inward. The left wall is ${leftWall} high and the right wall is ${rightWall} high.`,
        codeLine: 4,
        state: before,
        quiz: sideQuiz(heights, step),
      });
    }
    if (wantsTrap && step.spill) {
      trapShown = true;
      frames.push({
        scene: "solution",
        caption: `The Spill Trap: fill from the higher ${other} wall and water would stand ${step.spill.level} high here. It would spill over the lower ${side} wall (${mine}).`,
        codeLine: 4,
        state: { ...before, deciding: side, spill: { index: step.spill.index, level: step.spill.level, note: "✕ spills over the lower wall" } },
      });
    }

    const verdict = step.tie ? `Both walls are ${mine} high. On a tie, this code moves the left marker.` : `The ${side} wall (${mine}) is lower than the ${other} wall (${theirs}), so the ${side} side is safe to fill.`;
    const moved: TrappingWaterState = { ...before, left: isLeft ? step.index : left, right: isLeft ? right : step.index, focus: step.index };
    if (position < 2 || wantsQuiz || wantsTrap) {
      frames.push({ scene: "solution", caption: verdict, codeLine: 4, state: { ...before, deciding: side } });
      frames.push({ scene: "solution", caption: `The ${side} marker steps inward, onto a bar ${heights[step.index]} high.`, codeLine: isLeft ? 5 : 9, state: moved });
    } else {
      const short = step.tie ? `Both walls are ${mine} high, so the left marker steps inward` : `The ${side} wall (${mine}) is lower than the ${other} wall (${theirs}), so the ${side} marker steps inward`;
      frames.push({ scene: "solution", caption: `${short}, onto a bar ${heights[step.index]} high.`, codeLine: isLeft ? 5 : 9, state: moved });
    }

    water[step.index] = step.units;
    total = step.totalAfter;
    const rose = heights[step.index] > mine;
    frames.push({
      scene: "solution",
      caption: landing(heights, step),
      codeLine: rose ? (isLeft ? 6 : 10) : isLeft ? 7 : 11,
      state: { ...moved, water: [...water], total, leftWall: isLeft ? step.wallAfter : leftWall, rightWall: isLeft ? rightWall : step.wallAfter },
    });
  });

  const end = steps.at(-1);
  const meet = end ? end.index : 0;
  const done: TrappingWaterState = { ...blank(heights), water: [...water], left: meet, right: meet, leftWall: end ? (end.side === "left" ? end.wallAfter : end.leftWall) : null, rightWall: end ? (end.side === "right" ? end.wallAfter : end.rightWall) : null, total };
  frames.push({ scene: "solution", caption: `The two markers stand on the same bar, so every bar has had its turn. The answer is ${total}.`, codeLine: 14, state: done });
  frames.push({
    scene: "solution",
    caption: `Time: O(n). Each step moves one marker one bar inward, so ${plural(heights.length, "bar")} took ${plural(steps.length, "step")}. The slow way looked at bars ${slow.lookCount.at(-1) ?? 0} times.`,
    codeLine: 3,
    state: { ...done, counter: { label: "steps", value: steps.length } },
  });
  frames.push({ scene: "solution", caption: "Space: O(1). All we kept was two markers, the height of two walls, and the total water.", codeLine: 2, state: done });
  return frames;
}

/** The practice run: the reader picks the side at every step. */
function practiceFrames(heights: number[], steps: Step[]): Frame[] {
  const frames: Frame[] = [];
  const water = heights.map(() => 0);
  const last = heights.length - 1;
  let total = 0;
  let lead = "";

  frames.push({
    scene: "card",
    caption: `Your turn, on new ground: ${heights.join(", ")}. A marker stands on each end bar. You choose which side fills next, every time.`,
    state: { ...blank(heights), left: 0, right: last, total: 0 },
  });

  for (const step of steps) {
    const frame: Frame = {
      scene: "card",
      caption: `${lead}Now the left wall is ${step.leftWall} high and the right wall is ${step.rightWall} high.`,
      state: { ...blank(heights), water: [...water], left: step.left, right: step.right, leftWall: step.leftWall, rightWall: step.rightWall, total },
    };
    // On a tie either side is safe, so there is no single answer to ask for.
    if (!step.tie) frame.quiz = sideQuiz(heights, step);
    frames.push(frame);
    water[step.index] = step.units;
    total = step.totalAfter;
    const height = heights[step.index];
    const wallBefore = step.side === "left" ? step.leftWall : step.rightWall;
    const result = height > wallBefore ? `That bar (${height}) is the new ${step.side} wall.` : step.units === 0 ? "No water fits on that bar." : `That bar holds ${wallBefore} − ${height} = ${step.units}, so the total is ${total}.`;
    lead = `The ${step.side} marker stepped inward. ${result} `;
  }

  const end = steps.at(-1);
  frames.push({
    scene: "card",
    caption: `${lead}The markers met, so you are done: ${plural(total, "square")} of water.`,
    state: { ...blank(heights), water: [...water], left: end ? end.index : 0, right: end ? end.index : 0, total },
  });
  return frames;
}

export const trappingRainWaterStory: ProblemStory<TrappingWaterState> = {
  slugs: ["lc-42", "valley-rain"],
  pattern: "Two pointers",
  trigger: "“how much water stays” on uneven ground, or any amount that is held in from both sides",
  insight: "Two walls close in from the ends. The side with the lower wall is safe to fill, because water only ever stands as high as the lower wall.",
  metaphor: {
    name: "Two walls closing in",
    legend: "left marker = left · right marker = right · left wall = leftWall · right wall = rightWall · water = total",
    terms: ["wall", "marker", "water"],
  },
  traps: [
    {
      name: "The Spill Trap",
      rule: "Never fill from the side with the higher wall: water that high could spill over the lower wall. Always move the side whose wall is lower.",
    },
  ],
  template: [
    "left = 0; right = n - 1; leftBest = a[left]; rightBest = a[right];",
    "while (left < right) {",
    "    pick the side whose best-so-far is the weaker one;",
    "    step that side inward and update its best-so-far;",
    "    settle the new element using only that side's best;",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each step moves one marker one bar inward, so n bars take n − 1 steps",
    space: "O(1)",
    spaceWhy: "only two markers, two wall heights and the total are kept",
  },
  code: CODE,
  examples: [
    { label: "[0,1,0,2,1,0,1,3,2,1,2,1]", input: "0,1,0,2,1,0,1,3,2,1,2,1", expected: "6" },
    { label: "[4,2,0,3,2,5]", input: "4,2,0,3,2,5", expected: "9", note: "One big pool" },
    { label: "[3,1,2]", input: "3,1,2", expected: "1", note: "Filled from the right" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-11", title: "Container With Most Water" },
    { slug: "lc-84", title: "Largest Rectangle in Histogram" },
    { slug: "lc-238", title: "Product of Array Except Self" },
  ],
  answer: (input) => {
    // The two-marker walk, checked in tests against the expected values; `slowSolve` is the independent picture of the same answer.
    const heights = parse(input);
    const steps = walk(heights, slowSolve(heights).water);
    return String(steps.at(-1)?.totalAfter ?? 0);
  },
  frames: (input) => {
    const heights = parse(input);
    const slow = slowSolve(heights);
    const steps = walk(heights, slow.water);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(heights, slow),
      ...slowFrames(heights, slow),
      ...insightFrames(heights, steps),
      ...solutionFrames(heights, steps, slow),
      ...practiceFrames(practice, walk(practice, slowSolve(practice).water)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: insightFrames(heights, steps).at(-1)?.state ?? { ...blank(heights), water: [...slow.water], total: slow.total },
      },
    ];
  },
  View: TrappingWaterView,
};
