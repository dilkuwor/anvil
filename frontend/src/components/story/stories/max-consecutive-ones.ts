import type { CellTone } from "@/components/learn/viz/primitives";

import { StringWindowView, type StringWindowState } from "../string-window-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StringWindowState>;

/** Fresh row. k is 0 and a zero sits in the middle, so the tail must pass every zero. */
const PRACTICE = "nums=[1,0,1,0] k=0";

const CODE = [
  "int left = 0, zeros = 0, best = 0;",
  "for (int right = 0; right < nums.length; right++) {",
  "    if (nums[right] == 0) zeros++;",
  "    while (zeros > k) {",
  "        if (nums[left] == 0) zeros--;",
  "        left++;",
  "    }",
  "    best = Math.max(best, right - left + 1);",
  "}",
  "return best;",
];

function parse(raw: string): { nums: number[]; k: number } {
  const inner = raw.match(/nums\s*=\s*\[([^\]]*)\]/)?.[1] ?? "";
  const nums = inner.split(/[,\s]+/).filter(Boolean).map(Number);
  const k = Number(raw.match(/k\s*=\s*(-?\d+)/)?.[1] ?? "0");
  return { nums, k };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function range(from: number, to: number, tone: CellTone) {
  return (index: number) => (index >= from && index <= to ? tone : null);
}

function charsOf(nums: number[]): string[] {
  return nums.map(String);
}

function blank(chars: string[]): StringWindowState {
  return { chars, tones: tones(chars.length, () => null), left: null, right: null, seen: null, best: null, bestRange: null };
}

type Solved = {
  best: number;
  bestRange: [number, number];
  firstOverflow: { right: number; left: number } | null;
};

function solve(nums: number[], k: number): Solved {
  let left = 0;
  let zeros = 0;
  let best = 0;
  let bestRange: [number, number] = [0, -1];
  let firstOverflow: Solved["firstOverflow"] = null;
  for (let right = 0; right < nums.length; right++) {
    if (nums[right] === 0) zeros++;
    while (zeros > k) {
      firstOverflow ??= { right, left };
      if (nums[left] === 0) zeros--;
      left++;
    }
    if (right - left + 1 > best) {
      best = right - left + 1;
      bestRange = [left, right];
    }
  }
  return { best, bestRange, firstOverflow };
}

function pictureFrames(nums: number[], k: number, solved: Solved): Frame[] {
  const chars = charsOf(nums);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Each box is a 0 or a 1. You may flip at most ${k} zero${k === 1 ? "" : "s"} into a 1.`,
      state: blank(chars),
    },
  ];
  if (solved.best === 0) {
    frames.push({
      scene: "picture",
      caption: `k is ${k}, so a zero may not stay. There is no 1 to keep. The longest run is 0.`,
      state: { ...blank(chars), tones: tones(chars.length, () => "miss"), best: 0 },
    });
    frames.push({
      scene: "picture",
      caption: "The goal: the longest run of 1s you can make, and its length.",
      state: { ...blank(chars), best: 0 },
    });
    return frames;
  }
  const [from, to] = solved.bestRange;
  const zeros = nums.slice(from, to + 1).filter((value) => value === 0).length;
  frames.push({
    scene: "picture",
    caption: `[${nums.slice(from, to + 1).join(",")}] uses ${zeros} zero${zeros === 1 ? "" : "s"}, so it is allowed. Its length is ${solved.best}.`,
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")) },
  });
  if (solved.firstOverflow) {
    const { left, right } = solved.firstOverflow;
    frames.push({
      scene: "picture",
      caption: `[${nums.slice(left, right + 1).join(",")}] is not allowed: that run has more than ${k} zero${k === 1 ? "" : "s"}.`,
      state: {
        ...blank(chars),
        tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right, "window")(index))),
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the longest run of 1s you can make, and its length.",
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")), best: solved.best, bestRange: solved.bestRange },
  });
  return frames;
}

function slowFrames(nums: number[], k: number): Frame[] {
  const chars = charsOf(nums);
  const frames: Frame[] = [];
  let total = 0;
  for (let start = 0; start < nums.length; start++) {
    let zeros = 0;
    let end = start;
    while (end < nums.length && (nums[end] === 1 || zeros < k)) {
      if (nums[end] === 0) zeros++;
      end++;
    }
    total += Math.max(end - start, 1);
    if (start > 2) continue;
    const blocked = end < nums.length;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: start at the first box and crawl until a zero would need one more flip.${blocked ? ` Stop at this 0.` : ""}`
          : `Go back, start at the ${nums[start]}, and crawl over boxes you already read.`,
      state: {
        ...blank(chars),
        left: start,
        tones: tones(chars.length, (index) => (blocked && index === end ? "miss" : range(start, end - 1, "window")(index))),
        counter: { label: "boxes read", value: total },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `From every start we read ${total} boxes for a row of only ${nums.length}. This is O(n²) time: we keep re-reading the same boxes.`,
    state: { ...blank(chars), tones: tones(chars.length, () => "faded"), counter: { label: "boxes read", value: total } },
  });
  return frames;
}

function crawlPastZeros(nums: number[], left: number, right: number, k: number): number {
  let zeros = 0;
  for (let index = left; index <= right; index++) if (nums[index] === 0) zeros++;
  let tail = left;
  while (zeros > k) {
    if (nums[tail] === 0) zeros--;
    tail++;
  }
  return tail;
}

function insightFrames(nums: number[], k: number, solved: Solved): Frame[] {
  const chars = charsOf(nums);
  const overflow = solved.firstOverflow;
  if (!overflow) {
    return [
      {
        scene: "insight",
        caption: `Picture a caterpillar. Its body may hold at most ${k} zero${k === 1 ? "" : "s"} — that is the flip budget. This row never goes over.`,
        state: { ...blank(chars), left: 0, right: nums.length - 1, tones: tones(chars.length, range(0, nums.length - 1, "window")) },
      },
      {
        scene: "insight",
        caption: `The head only crawls forward. The tail never jumps to the head. That is the whole idea.`,
        state: { ...blank(chars), left: 0, right: nums.length - 1, tones: tones(chars.length, range(0, nums.length - 1, "done")) },
      },
    ];
  }
  const { left, right } = overflow;
  const after = crawlPastZeros(nums, left, right, k);
  if (k === 0) {
    return [
      {
        scene: "insight",
        caption: `Picture a caterpillar. k is 0, so the body may hold no zeros. The head is on a 0.`,
        state: {
          ...blank(chars),
          left,
          right,
          tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
        },
      },
      {
        scene: "insight",
        caption: `The Zero-Budget Trap! Leaving that 0 in the body would use a flip we do not have. The tail crawls until the 0 is gone.`,
        state: {
          ...blank(chars),
          left,
          right,
          ghostTail: right,
          tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
        },
      },
      {
        scene: "insight",
        caption: `After the tail passes the 0, the body holds only 1s. The head never moved backwards.`,
        state: { ...blank(chars), left: after, right, tones: tones(chars.length, range(after, right, "window")) },
      },
    ];
  }
  return [
    {
      scene: "insight",
      caption: `Picture a caterpillar. Its body [${nums.slice(left, right).join(",")}] already holds ${k} zeros. The head is about to eat another 0.`,
      state: {
        ...blank(chars),
        left,
        right,
        tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
      },
    },
    {
      scene: "insight",
      caption: `The tail crawls one box at a time until a 0 leaves. The head never moves backwards.`,
      state: { ...blank(chars), left: after, right, tones: tones(chars.length, range(after, right, "window")) },
    },
  ];
}

function shrinkQuiz(cells: number, left: number, right: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (right !== left) feedback[right] = `That would jump to the head. The tail leaves the box it is sitting on.`;
  if (left + 1 < cells && left + 1 !== right) {
    feedback[left + 1] = `The tail crawls one box at a time. It is still on this box, so it leaves this one first.`;
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `Too many zeros in the body. Which box does the tail leave first? Click that box.`,
    answer: left,
    feedback,
    otherwise: `The tail crawls one box at a time. Leave the box it is sitting on.`,
    why: `The tail leaves the box it is on, then checks the zeros again. It never jumps to the head.`,
  };
}

function solutionFrames(nums: number[], k: number, scene: SceneId = "solution", practice = false): Frame[] {
  const chars = charsOf(nums);
  const frames: Frame[] = [];
  let left = 0;
  let zeros = 0;
  let best = 0;
  let bestRange: [number, number] | null = null;
  let askedShrink = false;
  let showedTrap = false;
  const line = (index: number) => (practice ? undefined : index);

  const paint = (right: number | null, inner: (index: number) => CellTone | null) =>
    tones(chars.length, (index) => (right !== null && index < left ? "faded" : inner(index)));
  const base = (right: number | null): StringWindowState => ({
    chars,
    tones: paint(right, (index) => (right !== null && index === right ? "edge" : right !== null ? range(left, right - 1, "window")(index) : null)),
    left,
    right,
    seen: null,
    best,
    bestRange,
    counter: { label: "zeros in the body", value: zeros },
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(",")}], k is ${k}. The head moves by itself. You move the tail.`
      : `The caterpillar starts empty. k is ${k}: the body may hold at most ${k} zero${k === 1 ? "" : "s"}.`,
    codeLine: line(0),
    state: base(null),
  });

  for (let right = 0; right < nums.length; right++) {
    const value = nums[right];
    if (!practice) {
      frames.push({
        scene,
        caption: `The head moves to the ${value}.`,
        codeLine: line(2),
        state: base(right),
      });
    }
    if (value === 0) zeros++;

    let firstClash = true;
    while (zeros > k) {
      const clash: Frame = {
        scene,
        caption: practice
          ? `The head eats a 0. The body now holds ${zeros} zero${zeros === 1 ? "" : "s"}, above the budget of ${k}.`
          : `A 0 filled the budget. The body holds ${zeros} zeros, above k = ${k}.`,
        codeLine: line(3),
        state: {
          ...base(right),
          tones: paint(right, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
          counter: { label: "zeros in the body", value: zeros },
        },
      };
      if (firstClash && (practice || !askedShrink)) {
        askedShrink = true;
        clash.quiz = shrinkQuiz(chars.length, left, right);
      }
      frames.push(clash);
      firstClash = false;

      if (k === 0 && !showedTrap && !practice) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The Zero-Budget Trap! Leaving this 0 in the body would use a flip we do not have. The tail crawls instead.`,
          codeLine: line(4),
          state: {
            ...base(right),
            ghostTail: right,
            tones: paint(right, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
            counter: { label: "zeros in the body", value: zeros },
          },
        });
      }

      const gone = nums[left];
      if (gone === 0) zeros--;
      left++;
      frames.push({
        scene,
        caption: `The tail leaves the ${gone}. The body now holds ${zeros} zero${zeros === 1 ? "" : "s"}.`,
        codeLine: line(5),
        state: base(right),
      });
    }

    const length = right - left + 1;
    const improved = length > best;
    if (improved) {
      best = length;
      bestRange = [left, right];
    }
    frames.push({
      scene,
      caption: `The body is [${nums.slice(left, right + 1).join(",")}], length ${length}. ${improved ? `New best: ${best}.` : `Best stays ${best}.`}`,
      codeLine: line(7),
      state: { ...base(right), tones: paint(right, range(left, right, improved ? "done" : "window")) },
    });
  }

  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${best}. You moved the tail yourself every time.`
      : `The head reached the end. Every box was visited once. The answer is ${best}.`,
    codeLine: line(9),
    state: {
      ...base(null),
      left: null,
      tones: tones(chars.length, (index) => (bestRange && best > 0 ? range(bestRange[0], bestRange[1], "done")(index) : null)),
      counter: null,
    },
  });
  if (!practice) {
    const done = (index: number) => (bestRange && best > 0 ? range(bestRange[0], bestRange[1], "done")(index) : null);
    frames.push({
      scene,
      caption: `Time: O(n). The head ate each of the ${nums.length} boxes once, and the tail only ever crawled forward.`,
      codeLine: 1,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "boxes read", value: nums.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(1). The caterpillar keeps a zero count, a tail, and a best. Nothing grows with the row.`,
      codeLine: 0,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "zeros in the body", value: Math.min(k, nums.filter((value) => value === 0).length) } },
    });
  }
  return frames;
}

export const maxConsecutiveOnesStory: ProblemStory<StringWindowState> = {
  slugs: ["lc-1004"],
  pattern: "Sliding window, at most k zeros",
  trigger: "longest run of ones after flipping at most k zeros",
  insight: "A caterpillar whose body may hold at most k zeros. A (k+1)th zero makes the tail crawl until a zero leaves. If k is 0, every zero must leave.",
  metaphor: {
    name: "The caterpillar",
    legend: "tail = left · head = right · body = the window of at most k zeros",
    terms: ["head", "tail", "body", "caterpillar"],
  },
  traps: [
    {
      name: "The Zero-Budget Trap",
      rule: "When k is 0, a zero may not stay in the body. zeros > 0 forces the tail past every zero. Never skip the shrink.",
    },
  ],
  template: [
    "for (right = 0; right < n; right++) {",
    "    if this box is 0, add one to zeros;",
    "    while (zeros > k) drop the tail box;",
    "    best = max(best, body length);",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "the head eats each box once; the tail only crawls forward",
    space: "O(1)",
    spaceWhy: "only a zero count, a tail, and a best",
  },
  code: CODE,
  examples: [
    { label: "nums=[1,1,0,1] k=1", input: "nums=[1,1,0,1] k=1", expected: "4" },
    { label: "nums=[1,1,1,0,0,0,1,1,1,1] k=2", input: "nums=[1,1,1,0,0,0,1,1,1,1] k=2", expected: "6" },
    { label: "nums=[0,1,0] k=0", input: "nums=[0,1,0] k=0", expected: "1", note: "k is 0: a zero may not stay" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-424", title: "Longest Repeating Character Replacement" },
    { slug: "lc-340", title: "Longest Substring with At Most K Distinct Characters" },
    { slug: "lc-904", title: "Fruit Into Baskets" },
  ],
  answer: (input) => {
    const { nums, k } = parse(input);
    return String(solve(nums, k).best);
  },
  frames: (input) => {
    const { nums, k } = parse(input);
    const solved = solve(nums, k);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(nums, k, solved),
      ...slowFrames(nums, k),
      ...insightFrames(nums, k, solved),
      ...solutionFrames(nums, k),
      ...solutionFrames(practice.nums, practice.k, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(charsOf(nums)),
          left: solved.best > 0 ? solved.bestRange[0] : null,
          right: solved.best > 0 ? solved.bestRange[1] : null,
          tones: solved.best > 0 ? tones(nums.length, range(solved.bestRange[0], solved.bestRange[1], "done")) : tones(nums.length, () => "faded"),
          best: solved.best,
          bestRange: solved.best > 0 ? solved.bestRange : null,
        },
      },
    ];
  },
  View: StringWindowView,
};
