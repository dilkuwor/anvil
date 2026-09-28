import type { CellTone } from "@/components/learn/viz/primitives";

import { SortedRowView, type SortedRowState } from "../rec02-sorted-row-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<SortedRowState>;

/** Fresh line for the "your turn" run. Its second middle lands on an odd spot. */
const PRACTICE = "1,1,2,2,3,3,4,5,5";
const FALLBACK = [1, 1, 2, 3, 3, 4, 4, 8, 8];

const CODE = [
  "int left = 0;",
  "int right = nums.length - 1;",
  "while (left < right) {",
  "    int mid = left + (right - left) / 2;",
  "    if (mid % 2 == 1) mid--;",
  "    if (nums[mid] == nums[mid + 1]) left = mid + 2;",
  "    else right = mid;",
  "}",
  "return nums[left];",
];

function parseInput(raw: string): number[] {
  const nums = (raw.match(/-?\d+/g) ?? []).map(Number);
  return nums.length % 2 === 1 ? nums : FALLBACK;
}

type Step = { left: number; right: number; raw: number; mid: number; whole: boolean; nextLeft: number; nextRight: number };
type Solved = { steps: Step[]; at: number };

/** The real search, step by step. */
function solve(nums: number[]): Solved {
  const steps: Step[] = [];
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const raw = left + Math.floor((right - left) / 2);
    const mid = raw % 2 === 1 ? raw - 1 : raw;
    const whole = nums[mid] === nums[mid + 1];
    const step: Step = { left, right, raw, mid, whole, nextLeft: left, nextRight: right };
    if (whole) left = mid + 2;
    else right = mid;
    step.nextLeft = left;
    step.nextRight = right;
    steps.push(step);
  }
  return { steps, at: left };
}

/** An independent check: the value that does not appear twice. */
function lonely(nums: number[]): number {
  const counts = new Map<number, number>();
  for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const [value, count] of counts) if (count === 1) return value;
  return nums[0];
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[]): SortedRowState {
  return { nums, tones: tones(nums.length, () => null), endSlot: false, left: null, mid: null, right: null };
}

/** Where each couple starts, given the lone dancer's spot. */
function coupleStarts(n: number, at: number): number[] {
  const starts: number[] = [];
  for (let index = 0; index < at; index += 2) starts.push(index);
  for (let index = at + 1; index + 1 < n; index += 2) starts.push(index);
  return starts;
}

function between(n: number, left: number, right: number, mid: number | null = null): CellTone[] {
  return tones(n, (index) => (mid !== null && (index === mid || index === mid + 1) ? "edge" : index >= left && index <= right ? "window" : "faded"));
}

function pictureFrames(nums: number[], at: number): Frame[] {
  const n = nums.length;
  const all = coupleStarts(n, at).map((from) => ({ from, tone: "idle" as const }));
  return [
    { scene: "picture", caption: `A line of ${n} dancers, sorted by their number. Two dancers with the same number are a couple, standing side by side.`, state: { ...blank(nums), couples: all } },
    {
      scene: "picture",
      caption: `Every dancer has a partner except one. Here the lone dancer is ${nums[at]}, at spot ${at}.`,
      state: { ...blank(nums), couples: all, tones: tones(n, (index) => (index === at ? "done" : null)) },
    },
    {
      scene: "picture",
      caption: "Not allowed: checking couples one by one from the left. If the lone dancer stands near the end, that reads the whole line.",
      state: { ...blank(nums), scan: 0, couples: all },
    },
    { scene: "picture", caption: "The goal: return the lone dancer's number, after very few looks.", state: { ...blank(nums), couples: all, tones: tones(n, (index) => (index === at ? "done" : null)) } },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const frames: Frame[] = [];
  let checks = 0;
  let index = 0;
  for (; index + 1 < n; index += 2) {
    checks++;
    const match = nums[index] === nums[index + 1];
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: check the couples from the left. Spots 0 and 1 hold ${nums[0]} and ${nums[1]}.${match ? " A couple, move on." : " They differ: stop."}`
          : match
            ? `Spots ${index} and ${index + 1} hold ${nums[index]} and ${nums[index + 1]}. A couple, move on.`
            : `Spots ${index} and ${index + 1} hold ${nums[index]} and ${nums[index + 1]}. They differ, so ${nums[index]} is alone.`,
      state: {
        ...blank(nums),
        scan: index,
        couples: [{ from: index, tone: match ? "hit" : "miss" }],
        tones: tones(n, (i) => (i === index || i === index + 1 ? (match ? "hit" : "miss") : i < index ? "faded" : null)),
        counter: { label: "couples checked", value: checks },
      },
    });
    if (!match) break;
  }
  if (index + 1 >= n) {
    frames.push({
      scene: "slow",
      caption: `Every couple matched. The last dancer, ${nums[n - 1]}, is the lone one.`,
      state: { ...blank(nums), scan: n - 1, tones: tones(n, (i) => (i === n - 1 ? "done" : "faded")), counter: { label: "couples checked", value: checks } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That took ${checks} check${checks === 1 ? "" : "s"}. With the lone dancer at the end, it checks every couple: O(n) time. It never uses the sorted order.`,
    state: { ...blank(nums), tones: tones(n, () => "faded"), counter: { label: "couples checked", value: checks } },
  });
  return frames;
}

function insightFrames(nums: number[], solved: Solved): Frame[] {
  const n = nums.length;
  const { at } = solved;
  const before = coupleStarts(n, at).filter((from) => from < at);
  const after = coupleStarts(n, at).filter((from) => from > at);
  const first = solved.steps[0];
  const frames: Frame[] = [];
  frames.push({
    scene: "insight",
    caption: before.length
      ? `Look where couples start. Before the lone dancer, every couple starts on an even spot: ${before.join(", ")}.`
      : "Look where couples start. Here the lone dancer is first, so no couple stands before it.",
    state: { ...blank(nums), couples: before.map((from) => ({ from, tone: "hit" as const })), tones: tones(n, (index) => (index < at ? "hit" : null)) },
  });
  frames.push({
    scene: "insight",
    caption: after.length
      ? `After the lone dancer, everyone is shifted by one spot. Couples start on odd spots: ${after.join(", ")}.`
      : "After the lone dancer there is nobody. It stands at the very end of the line.",
    state: {
      ...blank(nums),
      couples: [...before.map((from) => ({ from, tone: "hit" as const })), ...after.map((from) => ({ from, tone: "miss" as const }))],
      tones: tones(n, (index) => (index < at ? "hit" : index > at ? "miss" : "edge")),
    },
  });
  if (first) {
    frames.push({
      scene: "insight",
      caption: "So check a couple that starts on an even spot. If the two match, the break is further right. If not, it is here or to the left.",
      state: { ...blank(nums), left: first.left, right: first.right, mid: first.mid, couples: [{ from: first.mid, tone: "idle" }], tones: between(n, first.left, first.right, first.mid) },
    });
  }
  return frames;
}

function oddQuiz(n: number, raw: number): StoryQuiz {
  return {
    kind: "cell",
    cells: n,
    numbered: true,
    question: `The middle landed on spot ${raw}, an odd spot. Which dancer should we check as the first of a couple? Click it.`,
    answer: raw - 1,
    feedback: {
      [raw]: `Spot ${raw} is odd. In a whole line its partner stands before it, so pairing it with the next dancer mixes two couples.`,
      ...(raw + 1 < n ? { [raw + 1]: "That skips ahead. The middle should stay as close as it can." } : {}),
    },
    otherwise: "A couple always starts on an even spot. Stay next to the middle.",
    why: "Step back one to the even spot. Now the check starts at the first dancer of a couple.",
  };
}

function sideQuiz(nums: number[], step: Step): StoryQuiz {
  return {
    kind: "choice",
    question: `The couple at spots ${step.mid} and ${step.mid + 1} is ${nums[step.mid]} and ${nums[step.mid + 1]}. Where is the lone dancer?`,
    options: ["Further right: the left post jumps past this couple", "Here or to the left: the right post moves onto the middle"],
    answer: step.whole ? 0 : 1,
    why: step.whole
      ? "They match, so the pairing is still whole up to here. The break is further right."
      : "They do not match, so the pairing is already broken. The lone dancer is here or before.",
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const n = nums.length;
  const solved = solve(nums);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let askedOdd = false;
  let askedSide = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new line of ${n} dancers. You fix the middle and move the posts.`
      : `The left post stands at spot 0 and the right post at the last dancer, spot ${n - 1}.`,
    codeLine: line(1),
    state: { ...blank(nums), left: 0, right: n - 1, tones: between(n, 0, n - 1) },
  });

  for (const step of solved.steps) {
    const odd = step.raw !== step.mid;
    const window = { ...blank(nums), left: step.left, right: step.right };
    if (odd) {
      const look: Frame = {
        scene,
        caption: `The middle spot between the posts is ${step.raw}. That is an odd spot.`,
        codeLine: line(3),
        state: { ...window, mid: step.raw, tones: tones(n, (index) => (index === step.raw ? "edge" : index >= step.left && index <= step.right ? "window" : "faded")) },
      };
      if (practice || !askedOdd) {
        askedOdd = true;
        look.quiz = oddQuiz(n, step.raw);
      }
      frames.push(look);
      frames.push({
        scene,
        caption: `The Odd Middle Trap: pairing spot ${step.raw} with spot ${step.raw + 1} checks two different couples. Step the middle back one, to spot ${step.mid}.`,
        codeLine: line(4),
        state: {
          ...window,
          mid: step.mid,
          stepBack: { from: step.raw, to: step.mid },
          wrong: { at: step.raw, text: "✕ two different couples" },
          tones: tones(n, (index) => (index === step.raw || index === step.raw + 1 ? "miss" : index === step.mid ? "edge" : index >= step.left && index <= step.right ? "window" : "faded")),
        },
      });
    }
    const check: Frame = {
      scene,
      caption: odd
        ? `Now the couple starts at spot ${step.mid}: dancers ${nums[step.mid]} and ${nums[step.mid + 1]}.`
        : `The middle spot is ${step.mid}, an even spot. Its couple is ${nums[step.mid]} and ${nums[step.mid + 1]}.`,
      codeLine: line(odd ? 5 : 3),
      state: { ...window, mid: step.mid, couples: [{ from: step.mid, tone: "idle" }], tones: between(n, step.left, step.right, step.mid) },
    };
    if (practice || !askedSide) {
      askedSide = true;
      check.quiz = sideQuiz(nums, step);
    }
    frames.push(check);
    frames.push({
      scene,
      caption: step.whole
        ? `${nums[step.mid]} and ${nums[step.mid + 1]} match: the couple is whole. The lone dancer is further right, so the left post jumps to spot ${step.nextLeft}.`
        : `${nums[step.mid]} and ${nums[step.mid + 1]} do not match. The lone dancer is here or before, so the right post moves to spot ${step.nextRight}.`,
      codeLine: line(step.whole ? 5 : 6),
      state: {
        ...blank(nums),
        left: step.nextLeft,
        right: step.nextRight,
        couples: [{ from: step.mid, tone: step.whole ? "hit" : "miss" }],
        tones: tones(n, (index) => (index >= step.nextLeft && index <= step.nextRight ? "window" : "faded")),
      },
    });
  }

  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}The posts meet at spot ${solved.at}. That dancer has no partner, so the answer is ${nums[solved.at]}.`,
    codeLine: line(8),
    state: { ...blank(nums), left: solved.at, right: solved.at, tones: tones(n, (index) => (index === solved.at ? "done" : "faded")) },
  });

  if (!practice) {
    const checks = solved.steps.length;
    frames.push({
      scene,
      caption: `Time: O(log n). Each check throws away about half of the couples. Here ${checks} check${checks === 1 ? " was" : "s were"} enough for ${n} dancers.`,
      codeLine: 3,
      state: { ...blank(nums), tones: tones(n, (index) => (index === solved.at ? "done" : null)), counter: { label: "couples checked", value: checks } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two posts and the middle are remembered.",
      codeLine: 0,
      state: { ...blank(nums), left: 0, right: n - 1 },
    });
  }
  return frames;
}

export const singleElementSortedArrayStory: ProblemStory<SortedRowState> = {
  slugs: ["lc-540"],
  pattern: "Binary search on pairs",
  trigger: "a sorted list where every value comes in twos except one",
  insight: "Before the lone dancer, every couple starts on an even spot. Check the couple at an even middle spot: if it matches, the lone dancer is to the right.",
  metaphor: {
    name: "The dance couples",
    legend: "dancer = a value · couple = two equal neighbours · spot = index · posts = left and right",
    terms: ["couple", "dancer", "spot", "post"],
  },
  traps: [{ name: "The Odd Middle Trap", rule: "If the middle lands on an odd spot, step it back one, so you always check a couple from its first dancer." }],
  template: [
    "left = 0; right = n - 1;",
    "while (left < right) {",
    "    mid = middle, moved back to an even spot;",
    "    if the couple at mid matches: left = mid + 2;",
    "    else: right = mid;",
    "}",
    "return nums[left];",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(log n)",
    timeWhy: "each check throws away about half of the couples",
    space: "O(1)",
    spaceWhy: "only the two posts and the middle",
  },
  code: CODE,
  examples: [
    { label: "[1,1,2,3,3,4,4,8,8]", input: "1,1,2,3,3,4,4,8,8", expected: "2" },
    { label: "[3,3,7,7,10,11,11]", input: "3,3,7,7,10,11,11", expected: "10", note: "The lone dancer is to the right" },
    { label: "[1,1,2]", input: "1,1,2", expected: "2", note: "The first middle is odd" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-33", title: "Search in Rotated Sorted Array" },
    { slug: "lc-153", title: "Find Minimum in Rotated Sorted Array" },
    { slug: "lc-136", title: "Single Number" },
  ],
  answer: (input) => String(lonely(parseInput(input))),
  frames: (input) => {
    const nums = parseInput(input);
    const solved = solve(nums);
    return [
      ...pictureFrames(nums, solved.at),
      ...slowFrames(nums),
      ...insightFrames(nums, solved),
      ...solutionFrames(nums),
      ...solutionFrames(parseInput(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: couples on even spots, then a shift after the lone dancer. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(nums),
          couples: coupleStarts(nums.length, solved.at).map((from) => ({ from, tone: from < solved.at ? ("hit" as const) : ("miss" as const) })),
          tones: tones(nums.length, (index) => (index === solved.at ? "done" : null)),
        },
      },
    ];
  },
  View: SortedRowView,
};
