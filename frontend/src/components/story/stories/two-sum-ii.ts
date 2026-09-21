import type { CellTone } from "@/components/learn/viz/primitives";

import { ArrayThreePointerView, type ArrayThreePointerState } from "../array-three-pointer-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ArrayThreePointerState>;

/** Fresh sorted pair. The hit is the two ends, so 0-based would say [0,1] instead of [1,2]. */
const PRACTICE = "[1,2,4], target=6";

const CODE = [
  "int left = 0, right = numbers.length - 1;",
  "while (left < right) {",
  "    int sum = numbers[left] + numbers[right];",
  "    if (sum == target) return new int[] {left + 1, right + 1};",
  "    if (sum < target) left++;",
  "    else right--;",
  "}",
  "return new int[0];",
];

function parse(raw: string): { nums: number[]; target: number } {
  const targetHit = raw.match(/target\s*=\s*(-?\d+)/i);
  if (targetHit) {
    const nums = [...raw.replace(/target\s*=\s*-?\d+/i, "").matchAll(/-?\d+/g)].map(Number);
    return { nums, target: Number(targetHit[1]) };
  }
  const lines = raw.trim().split(/\n+/);
  const nums = [...(lines[0] ?? "").matchAll(/-?\d+/g)].map(Number);
  const target = Number((lines[1] ?? "0").match(/-?\d+/)?.[0] ?? "0");
  return { nums, target };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[]): ArrayThreePointerState {
  return { nums, tones: tones(nums.length, () => null), peg: null, left: null, right: null, sumOf: null, skipped: null, triplets: null };
}

function arms(nums: number[], left: number | null, right: number | null, hit = false): ArrayThreePointerState {
  const open = left !== null && right !== null;
  return {
    ...blank(nums),
    left: open ? left : null,
    right: open ? right : null,
    tones: tones(nums.length, (index) => {
      if (hit && (index === left || index === right)) return "done";
      if (open && (index === left || index === right)) return "window";
      if (open && left !== null && right !== null && (index < left || index > right)) return "faded";
      return null;
    }),
  };
}

function solve(nums: number[], target: number): [number, number] | null {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left + 1, right + 1];
    if (sum < target) left += 1;
    else right -= 1;
  }
  return null;
}

type Slow = { checked: number; hit: [number, number] | null; first: [number, number] };

function slowSolve(nums: number[], target: number): Slow {
  const slow: Slow = { checked: 0, hit: null, first: [0, Math.min(1, nums.length - 1)] };
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      slow.checked += 1;
      if (slow.checked === 1) slow.first = [i, j];
      if (nums[i] + nums[j] === target && !slow.hit) slow.hit = [i, j];
    }
  }
  return slow;
}

type Event =
  | { type: "sum"; left: number; right: number; sum: number }
  | { type: "move"; left: number; right: number; side: "left" | "right"; sum: number }
  | { type: "hit"; left: number; right: number; pair: [number, number] };

function trace(nums: number[], target: number): Event[] {
  const events: Event[] = [];
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    events.push({ type: "sum", left, right, sum });
    if (sum === target) {
      events.push({ type: "hit", left, right, pair: [left + 1, right + 1] });
      return events;
    }
    if (sum < target) {
      left += 1;
      events.push({ type: "move", left, right, side: "left", sum });
    } else {
      right -= 1;
      events.push({ type: "move", left, right, side: "right", sum });
    }
  }
  return events;
}

function pictureFrames(nums: number[], target: number, slow: Slow): Frame[] {
  const frames: Frame[] = [
    { scene: "picture", caption: `A sorted row of ${nums.length} numbers. Find two that add to ${target}, and return where they sit.`, state: blank(nums) },
  ];
  if (slow.hit) {
    const [i, j] = slow.hit;
    frames.push({
      scene: "picture",
      caption: `${nums[i]} and ${nums[j]} add to ${target}, so they are the pair. The row is numbered from 1, not from 0.`,
      state: arms(nums, i, j, true),
    });
    frames.push({
      scene: "picture",
      caption: `Those boxes sit at ${i} and ${j} if we count from zero. Counting from one, they sit at ${i + 1} and ${j + 1}.`,
      state: { ...arms(nums, i, j, true), skipped: i, skipNote: `0-based would be [${i}, ${j}]` },
    });
  }
  const pair = slow.hit ? [slow.hit[0] + 1, slow.hit[1] + 1] : null;
  frames.push({
    scene: "picture",
    caption: pair ? `The goal: the two positions, counted from one. Here that pair is [${pair[0]}, ${pair[1]}].` : `The goal: the two positions, counted from one.`,
    state: slow.hit ? arms(nums, slow.hit[0], slow.hit[1], true) : blank(nums),
  });
  return frames;
}

function slowFrames(nums: number[], target: number, slow: Slow): Frame[] {
  const [i, j] = slow.first;
  const sum = nums[i] + nums[j];
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: try every pair. ${nums[i]} and ${nums[j]} make ${sum}${sum === target ? ", a hit." : `, not ${target}.`}`,
      state: { ...arms(nums, i, j), counter: { label: "pairs checked", value: 1 } },
    },
  ];
  if (slow.hit && (slow.hit[0] !== i || slow.hit[1] !== j)) {
    frames.push({
      scene: "slow",
      caption: `Keep going. ${nums[slow.hit[0]]} and ${nums[slow.hit[1]]} make ${target} after ${slow.checked} pairs.`,
      state: { ...arms(nums, slow.hit[0], slow.hit[1], true), counter: { label: "pairs checked", value: slow.checked } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${slow.checked} pairs for only ${nums.length} numbers. This is O(n²) time: we re-check numbers we already passed.`,
    state: { ...blank(nums), tones: tones(nums.length, () => "faded"), counter: { label: "pairs checked", value: slow.checked } },
  });
  return frames;
}

function insightFrames(nums: number[], target: number, events: Event[]): Frame[] {
  const first = events.find((event) => event.type === "sum");
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "The row is already sorted. Picture two calipers: one on the smallest number, one on the biggest.",
      state: arms(nums, 0, nums.length - 1),
    },
  ];
  if (first && first.type === "sum") {
    frames.push({
      scene: "insight",
      caption:
        first.sum < target
          ? `${nums[first.left]} + ${nums[first.right]} = ${first.sum}, too small. Only the left caliper can grow the sum, by stepping right.`
          : first.sum > target
            ? `${nums[first.left]} + ${nums[first.right]} = ${first.sum}, too big. Only the right caliper can shrink the sum, by stepping left.`
            : `${nums[first.left]} + ${nums[first.right]} = ${first.sum}, a hit. When a sum is off, one caliper steps inward.`,
      state: arms(nums, first.left, first.right, first.sum === target),
    });
  }
  frames.push({
    scene: "insight",
    caption: "When they hit, add one to each position. The answer counts from one, not from zero.",
    state: arms(nums, 0, nums.length - 1),
  });
  return frames;
}

function moveQuiz(nums: number[], left: number, right: number, sum: number, target: number): StoryQuiz {
  const small = sum < target;
  return {
    kind: "cell",
    cells: nums.length,
    question: `${sum} is ${small ? "below" : "above"} ${target}. Which caliper steps inward? Click its box.`,
    answer: small ? left : right,
    feedback: {
      [small ? right : left]: small
        ? "The right caliper can only step left, and nothing there is bigger."
        : "The left caliper can only step right, and nothing there is smaller.",
    },
    otherwise: "Only the two calipers can move. Pick one of them.",
    why: small ? "Bigger numbers sit to the right, so the left caliper steps that way." : "Smaller numbers sit to the left, so the right caliper steps that way.",
  };
}

function indexQuiz(left: number, right: number): StoryQuiz {
  return {
    kind: "choice",
    question: "The two boxes sit at those positions in the row. What pair do we return?",
    options: [`The 0-based pair [${left}, ${right}]`, `The 1-based pair [${left + 1}, ${right + 1}]`],
    answer: 1,
    why: "The problem counts from one. Add one to each position before you return.",
  };
}

function solutionFrames(nums: number[], target: number, events: Event[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let askedMove = false;
  let askedIndex = false;
  let shownTrap = false;
  let answer: [number, number] | null = null;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new sorted row: ${nums.join(", ")}. The target is ${target}. You move the calipers.`
      : "The left caliper starts on the first box. The right caliper starts on the last box.",
    codeLine: line(0),
    state: arms(nums, 0, nums.length - 1),
  });

  for (const event of events) {
    if (event.type === "sum") {
      const look: Frame = {
        scene,
        caption: `The calipers hold ${nums[event.left]} and ${nums[event.right]}, which make ${event.sum}.`,
        codeLine: line(2),
        state: arms(nums, event.left, event.right),
      };
      if (event.sum !== target && (practice || !askedMove)) {
        askedMove = true;
        look.quiz = moveQuiz(nums, event.left, event.right, event.sum, target);
      }
      frames.push(look);
    } else if (event.type === "move") {
      frames.push({
        scene,
        caption: `${event.sum} is too ${event.sum < target ? "small" : "big"}, so the ${event.side} caliper steps ${event.side === "left" ? "right" : "left"}.`,
        codeLine: line(event.side === "left" ? 4 : 5),
        state: arms(nums, event.left, event.right),
      });
    } else {
      answer = event.pair;
      const look: Frame = {
        scene,
        caption: `A hit. The boxes sit at ${event.left} and ${event.right} if we count from zero.`,
        codeLine: line(3),
        state: arms(nums, event.left, event.right, true),
      };
      if (practice || !askedIndex) {
        askedIndex = true;
        look.quiz = indexQuiz(event.left, event.right);
      }
      frames.push(look);
      if (!shownTrap && !practice) {
        shownTrap = true;
        frames.push({
          scene,
          caption: `The Zero-Based Trap: returning [${event.left}, ${event.right}] is off by one. The answer counts from one: [${event.pair[0]}, ${event.pair[1]}].`,
          codeLine: line(3),
          state: { ...arms(nums, event.left, event.right, true), skipped: event.left, skipNote: `✕ 0-based [${event.left}, ${event.right}]` },
        });
      }
      frames.push({
        scene,
        caption: `Add one to each caliper position. The pair is [${event.pair[0]}, ${event.pair[1]}].`,
        codeLine: line(3),
        state: { ...arms(nums, event.left, event.right, true), skipped: event.left, skipNote: `1-based [${event.pair[0]}, ${event.pair[1]}]` },
      });
    }
  }

  const result = JSON.stringify(answer);
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${result}. You counted from one yourself.` : `The calipers have their pair. The answer is ${result}.`,
    codeLine: line(3),
    state: answer ? arms(nums, answer[0] - 1, answer[1] - 1, true) : blank(nums),
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each caliper only steps inward, so each box is left at most once.`,
      codeLine: 1,
      state: { ...blank(nums), counter: { label: "boxes visited", value: nums.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). The two calipers are the only extra memory. We never copy the row.",
      codeLine: 0,
      state: arms(nums, 0, nums.length - 1),
    });
  }
  return frames;
}

export const twoSumIIStory: ProblemStory<ArrayThreePointerState> = {
  slugs: ["lc-167"],
  pattern: "Two pointers on a sorted row",
  trigger: "a sorted array and two values that add to a target, and you must return their positions counted from one",
  insight: "Two calipers on a sorted row. Too small, the left one steps right. Too big, the right one steps left. On a hit, add one to each position.",
  metaphor: {
    name: "The two calipers",
    legend: "left caliper = left · right caliper = right · 1-based pair = left+1, right+1",
    terms: ["caliper", "left", "right"],
  },
  traps: [
    {
      name: "The Zero-Based Trap",
      rule: "The boxes are numbered from zero in code, but the answer counts from one. Return left + 1 and right + 1.",
    },
  ],
  template: [
    "left = 0; right = last box;",
    "while (left < right) {",
    "    if (sum == target) return [left + 1, right + 1];",
    "    too small -> left++;   too big -> right--;",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each caliper only steps inward",
    space: "O(1)",
    spaceWhy: "only the two calipers",
  },
  code: CODE,
  examples: [
    { label: "[2,7,11,15] → 9", input: "[2,7,11,15], target=9", expected: "[1,2]" },
    { label: "[2,3,4] → 6", input: "[2,3,4], target=6", expected: "[1,3]" },
    { label: "[5,25,75] → 100", input: "[5,25,75], target=100", expected: "[2,3]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-1", title: "Two Sum" },
    { slug: "pair-target", title: "Pair Target" },
    { slug: "lc-15", title: "3Sum" },
  ],
  answer: (input) => {
    const { nums, target } = parse(input);
    const pair = solve(nums, target);
    return pair ? JSON.stringify(pair) : "[]";
  },
  frames: (input) => {
    const { nums, target } = parse(input);
    const slow = slowSolve(nums, target);
    const events = trace(nums, target);
    const practice = parse(PRACTICE);
    const hit = events.find((event) => event.type === "hit");
    return [
      ...pictureFrames(nums, target, slow),
      ...slowFrames(nums, target, slow),
      ...insightFrames(nums, target, events),
      ...solutionFrames(nums, target, events),
      ...solutionFrames(practice.nums, practice.target, trace(practice.nums, practice.target), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: two calipers, and a pair counted from one. Say the idea, then reveal the card.",
        state: hit && hit.type === "hit" ? arms(nums, hit.left, hit.right, true) : arms(nums, 0, nums.length - 1),
      },
    ];
  },
  View: ArrayThreePointerView,
};
