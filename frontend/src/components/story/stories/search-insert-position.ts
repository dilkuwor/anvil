import type { CellTone } from "@/components/learn/viz/primitives";

import { SortedRowView, type SortedRowState } from "../rec02-sorted-row-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<SortedRowState>;

/** Fresh shelf for the "your turn" run. The target is missing, so it reaches the Minus-One Trap. */
const PRACTICE = "2,4,6,8,10,12; target = 9";
const FALLBACK = { nums: [1, 3, 5, 6], target: 5 };

const CODE = [
  "int left = 0;",
  "int right = nums.length - 1;",
  "while (left <= right) {",
  "    int mid = left + (right - left) / 2;",
  "    if (nums[mid] == target) return mid;",
  "    if (nums[mid] < target) left = mid + 1;",
  "    else right = mid - 1;",
  "}",
  "return left;",
];

function parseInput(raw: string): { nums: number[]; target: number } {
  const [row = "", rest = ""] = raw.split(";");
  const nums = (row.match(/-?\d+/g) ?? []).map(Number);
  const wanted = rest.match(/-?\d+/);
  if (nums.length === 0 || !wanted) return FALLBACK;
  return { nums, target: Number(wanted[0]) };
}

type Step = { left: number; right: number; mid: number; move: "found" | "left" | "right"; nextLeft: number; nextRight: number };
type Solved = { steps: Step[]; answer: number; found: boolean };

/** The real search, step by step. */
function solve(nums: number[], target: number): Solved {
  const steps: Step[] = [];
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) {
      steps.push({ left, right, mid, move: "found", nextLeft: left, nextRight: right });
      return { steps, answer: mid, found: true };
    }
    const step: Step = { left, right, mid, move: nums[mid] < target ? "left" : "right", nextLeft: left, nextRight: right };
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
    step.nextLeft = left;
    step.nextRight = right;
    steps.push(step);
  }
  return { steps, answer: left, found: false };
}

/** An independent check: count the values smaller than the target. */
function insertAt(nums: number[], target: number): number {
  return nums.filter((value) => value < target).length;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[], target: number): SortedRowState {
  return { nums, tones: tones(nums.length + 1, () => null), endSlot: true, left: null, mid: null, right: null, goal: `target = ${target}` };
}

/** Books outside the posts are faded: they can no longer matter. */
function between(nums: number[], left: number, right: number, mid: number | null = null): CellTone[] {
  return tones(nums.length + 1, (index) => (index === mid ? "edge" : index >= left && index <= right ? "window" : "faded"));
}

function pictureFrames(nums: number[], target: number, solved: Solved): Frame[] {
  const n = nums.length;
  const at = solved.answer;
  return [
    { scene: "picture", caption: `A shelf of ${n} books, sorted from small to large. Each box holds one number.`, state: blank(nums, target) },
    {
      scene: "picture",
      caption: solved.found
        ? `The target ${target} is on the shelf, at position ${at}. Then the answer is where it stands.`
        : at === n
          ? `The target ${target} is not on the shelf. It is bigger than every book, so it would go in the end slot, position ${n}.`
          : `The target ${target} is not on the shelf. It would slide in just before ${nums[at]}, at position ${at}.`,
      state: { ...blank(nums, target), gap: solved.found ? null : at, tones: tones(n + 1, (index) => (index === at ? "done" : null)) },
    },
    {
      scene: "picture",
      caption: "Not allowed: answering -1 for a missing number. Every number has a place on the shelf, even past the last book.",
      state: { ...blank(nums, target), wrong: { at: Math.min(at, n), text: "✕ -1 is never the answer" } },
    },
    {
      scene: "picture",
      caption: "The goal: return that position, after looking at very few books.",
      state: { ...blank(nums, target), gap: solved.found ? null : at, tones: tones(n + 1, (index) => (index === at ? "done" : null)) },
    },
  ];
}

function slowFrames(nums: number[], target: number): Frame[] {
  const n = nums.length;
  const frames: Frame[] = [];
  let looks = 0;
  let index = 0;
  while (index < n) {
    looks++;
    const stop = nums[index] >= target;
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: read the shelf from the left. The first book is ${nums[0]}${stop ? `, not smaller than ${target}. Stop here.` : `, smaller than ${target}. Keep going.`}`
          : `The next book is ${nums[index]}${stop ? `, not smaller than ${target}. Stop here.` : `. Still smaller, keep going.`}`,
      state: { ...blank(nums, target), scan: index, tones: tones(n + 1, (i) => (i === index ? (stop ? "done" : "edge") : i < index ? "faded" : null)), counter: { label: "books looked at", value: looks } },
    });
    if (stop) break;
    index++;
  }
  if (index === n) {
    frames.push({
      scene: "slow",
      caption: `Every book was smaller. The target goes in the end slot, position ${n}.`,
      state: { ...blank(nums, target), gap: n, tones: tones(n + 1, (i) => (i === n ? "done" : "faded")), counter: { label: "books looked at", value: looks } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That took ${looks} look${looks === 1 ? "" : "s"}. A big target makes it read every book: O(n) time. The shelf is sorted, and this way does not use that.`,
    state: { ...blank(nums, target), tones: tones(n + 1, () => "faded"), counter: { label: "books looked at", value: looks } },
  });
  return frames;
}

function insightFrames(nums: number[], target: number, solved: Solved): Frame[] {
  const n = nums.length;
  const first = solved.steps.find((step) => step.move !== "found");
  const frames: Frame[] = [];
  if (first) {
    frames.push({
      scene: "insight",
      caption: "Picture two posts on the shelf. Books left of the left post are always smaller than the target. Books right of the right post are always bigger.",
      state: { ...blank(nums, target), left: first.nextLeft <= n ? first.nextLeft : null, right: first.nextRight >= 0 ? first.nextRight : null, tones: between(nums, first.nextLeft, first.nextRight) },
    });
  }
  const last = solved.steps[solved.steps.length - 1];
  frames.push({
    scene: "insight",
    caption: "The posts close in. If the middle book is the target, we stop. If the posts cross first, the target is missing.",
    state: { ...blank(nums, target), left: last.left, right: last.right, mid: last.mid, tones: between(nums, last.left, last.right, last.mid) },
  });
  frames.push({
    scene: "insight",
    caption: "When they cross, the left post stands on the first bigger book, or the end slot. That is the gap where the target slides in.",
    state: { ...blank(nums, target), left: solved.answer, gap: solved.answer, tones: tones(n + 1, (index) => (index === solved.answer ? "done" : index < solved.answer ? "faded" : null)) },
  });
  return frames;
}

function moveQuiz(nums: number[], target: number, step: Step): StoryQuiz {
  const value = nums[step.mid];
  return {
    kind: "choice",
    question: `The middle book is ${value} and the target is ${target}. What happens next?`,
    options: ["The left post moves just past the middle book", "The right post moves just before the middle book", "Stop: the middle book is the target"],
    answer: step.move === "left" ? 0 : step.move === "right" ? 1 : 2,
    why:
      step.move === "found"
        ? `${value} is the target, so its position is the answer.`
        : step.move === "left"
          ? `${value} is smaller than ${target}, so it and every book before it are too small.`
          : `${value} is bigger than ${target}, so it and every book after it are too big.`,
  };
}

function gapQuiz(nums: number[], target: number, answer: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (answer > 0) feedback[answer - 1] = `That box holds ${nums[answer - 1]}, which is smaller than ${target}. The target goes after it.`;
  if (answer + 1 <= nums.length) feedback[answer + 1] = `Then the book before the target would be ${nums[answer]}, which is bigger than ${target}.`;
  return {
    kind: "cell",
    cells: nums.length + 1,
    numbered: true,
    question: `The posts crossed, so ${target} is missing. Where would it go? Click that box.`,
    answer,
    feedback,
    otherwise: "Every book before the gap must be smaller than the target, and every book after it bigger.",
    why: "Right where the left post stands. The left post always ends on the first bigger book.",
  };
}

function solutionFrames(nums: number[], target: number, scene: SceneId = "solution", practice = false): Frame[] {
  const n = nums.length;
  const solved = solve(nums, target);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let asked = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new shelf. The target is ${target}. You decide how the posts move.`
      : `The left post starts at book 0 and the right post at the last book, position ${n - 1}.`,
    codeLine: line(1),
    state: { ...blank(nums, target), left: 0, right: n - 1, tones: between(nums, 0, n - 1) },
  });

  for (const step of solved.steps) {
    const look: Frame = {
      scene,
      caption: `The middle book between the posts is ${nums[step.mid]}, at position ${step.mid}.`,
      codeLine: line(3),
      state: { ...blank(nums, target), left: step.left, right: step.right, mid: step.mid, tones: between(nums, step.left, step.right, step.mid) },
    };
    if (practice || !asked) {
      asked = true;
      look.quiz = moveQuiz(nums, target, step);
    }
    frames.push(look);

    if (step.move === "found") {
      frames.push({
        scene,
        caption: `The middle book ${nums[step.mid]} is the target. It is on the shelf, so the answer is ${step.mid}.`,
        codeLine: line(4),
        state: { ...blank(nums, target), left: step.left, right: step.right, mid: step.mid, tones: tones(n + 1, (index) => (index === step.mid ? "done" : "faded")) },
      });
      continue;
    }
    const crossed = step.nextLeft > step.nextRight;
    frames.push({
      scene,
      caption:
        step.move === "left"
          ? `${nums[step.mid]} is smaller than ${target}. The left post moves to ${step.nextLeft}, just past the middle book.`
          : `${nums[step.mid]} is bigger than ${target}. The right post moves to ${step.nextRight}, just before the middle book.`,
      codeLine: line(step.move === "left" ? 5 : 6),
      state: {
        ...blank(nums, target),
        left: step.nextLeft,
        right: step.nextRight >= 0 ? step.nextRight : null,
        tones: crossed ? tones(n + 1, () => "faded") : between(nums, step.nextLeft, step.nextRight),
      },
    });
  }

  if (!solved.found) {
    const at = solved.answer;
    const lastRight = at - 1;
    frames.push({
      scene,
      caption: `The left post has passed the right post. No book is left between them, so ${target} is not on the shelf.`,
      codeLine: line(2),
      state: { ...blank(nums, target), left: at, right: lastRight >= 0 ? lastRight : null, tones: tones(n + 1, () => "faded") },
      quiz: gapQuiz(nums, target, at),
    });
    frames.push({
      scene,
      caption: `The Minus-One Trap: plain binary search would answer -1 here. But the left post already marks the gap, at position ${at}.`,
      codeLine: line(8),
      state: { ...blank(nums, target), left: at, gap: at, wrong: { at, text: "✕ not -1" }, tones: tones(n + 1, (index) => (index === at ? "done" : "faded")) },
    });
    frames.push({
      scene,
      caption: `${practice ? "Done. " : ""}Return the left post. ${target} slides into the gap, and the answer is ${at}.`,
      codeLine: line(8),
      state: { ...blank(nums, target), left: at, gap: at, tones: tones(n + 1, (index) => (index === at ? "done" : null)) },
    });
  }

  if (!practice) {
    const looks = solved.steps.length;
    frames.push({
      scene,
      caption: `Time: O(log n). Each look at a middle book throws away half of the shelf. Here ${looks} look${looks === 1 ? " was" : "s were"} enough for ${n} books.`,
      codeLine: 3,
      state: { ...blank(nums, target), tones: tones(n + 1, (index) => (index === solved.answer ? "done" : null)), counter: { label: "books looked at", value: looks } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two posts and the middle are remembered. The shelf is never copied.",
      codeLine: 0,
      state: { ...blank(nums, target), left: 0, right: n - 1 },
    });
  }
  return frames;
}

export const searchInsertPositionStory: ProblemStory<SortedRowState> = {
  slugs: ["lc-35"],
  pattern: "Binary search",
  trigger: "a sorted list, and “where would this value go?”",
  insight: "Run an ordinary binary search. When the posts cross without a match, the left post already stands in the gap where the value belongs.",
  metaphor: {
    name: "The bookshelf gap",
    legend: "shelf = nums · left post = left · right post = right · middle book = nums[mid] · gap = the answer",
    terms: ["post", "shelf", "book", "gap"],
  },
  traps: [{ name: "The Minus-One Trap", rule: "A missing value is not a failure here. Return the left post, never -1." }],
  template: [
    "left = 0; right = n - 1;",
    "while (left <= right) {",
    "    look at the middle; if it is the target, return it;",
    "    move the post on the wrong side past the middle;",
    "}",
    "return left;   // the gap",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(log n)",
    timeWhy: "each look at a middle book throws away half the shelf",
    space: "O(1)",
    spaceWhy: "only the two posts and the middle",
  },
  code: CODE,
  examples: [
    { label: "[1,3,5,6], target 5", input: "1,3,5,6; target = 5", expected: "2" },
    { label: "[1,3,5,6], target 2", input: "1,3,5,6; target = 2", expected: "1", note: "Missing: it goes in a gap" },
    { label: "[1,3,5,6], target 7", input: "1,3,5,6; target = 7", expected: "4", note: "Bigger than every book: the end slot" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-704", title: "Binary Search" },
    { slug: "lc-34", title: "Find First and Last Position of Element in Sorted Array" },
    { slug: "lc-278", title: "First Bad Version" },
  ],
  answer: (input) => {
    const { nums, target } = parseInput(input);
    return String(insertAt(nums, target));
  },
  frames: (input) => {
    const { nums, target } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const solved = solve(nums, target);
    const at = solved.answer;
    return [
      ...pictureFrames(nums, target, solved),
      ...slowFrames(nums, target),
      ...insightFrames(nums, target, solved),
      ...solutionFrames(nums, target),
      ...solutionFrames(practice.nums, practice.target, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: two posts that cross, and the left post standing in the gap. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums, target), left: at, gap: solved.found ? null : at, tones: tones(nums.length + 1, (index) => (index === at ? "done" : null)) },
      },
    ];
  },
  View: SortedRowView,
};
