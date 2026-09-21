import type { CellTone } from "@/components/learn/viz/primitives";

import { NumberWindowView, type NumberWindowState } from "../grok-number-window-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<NumberWindowState>;

/** Fresh row with a negative. The window would miss the short run at the end. */
const PRACTICE = "target=2 nums=[1,-1,1,1]";

const CODE = [
  "int best = Integer.MAX_VALUE, sum = 0, left = 0;",
  "for (int right = 0; right < nums.length; right++) {",
  "    sum += nums[right];",
  "    while (sum >= target) {",
  "        best = Math.min(best, right - left + 1);",
  "        sum -= nums[left++];",
  "    }",
  "}",
  "return best == Integer.MAX_VALUE ? 0 : best;",
];

function parse(raw: string): { target: number; nums: number[] } {
  const target = Number(raw.match(/target\s*=\s*(-?\d+)/)?.[1] ?? "0");
  const inner = raw.match(/nums\s*=\s*\[([^\]]*)\]/)?.[1] ?? "";
  const nums = inner.split(/[,\s]+/).filter(Boolean).map(Number);
  return { target, nums };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function range(from: number, to: number, tone: CellTone) {
  return (index: number) => (index >= from && index <= to ? tone : null);
}

function blank(values: number[], target: number): NumberWindowState {
  return { values, tones: tones(values.length, () => null), left: null, right: null, best: null, bestRange: null, target, sum: null };
}

/** Independent solver: shortest run whose sum is at least target. Works with negatives too. */
function trueBest(target: number, nums: number[]): { best: number; bestRange: [number, number] | null } {
  let best = Infinity;
  let bestRange: [number, number] | null = null;
  for (let start = 0; start < nums.length; start++) {
    let sum = 0;
    for (let end = start; end < nums.length; end++) {
      sum += nums[end];
      if (sum >= target && end - start + 1 < best) {
        best = end - start + 1;
        bestRange = [start, end];
        break;
      }
    }
  }
  return { best: best === Infinity ? 0 : best, bestRange };
}

function windowBest(target: number, nums: number[]): number {
  let best = Infinity;
  let sum = 0;
  let left = 0;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left++];
    }
  }
  return best === Infinity ? 0 : best;
}

function firstHeavy(target: number, nums: number[]): { left: number; right: number; sum: number } | null {
  let sum = 0;
  const left = 0;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    if (sum >= target) return { left, right, sum };
  }
  return null;
}

function hasNegative(nums: number[]): boolean {
  return nums.some((value) => value < 0);
}

function pictureFrames(target: number, nums: number[], solved: { best: number; bestRange: [number, number] | null }): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Each box is a number. We need a neighbour run whose sum is at least ${target}.`,
      state: blank(nums, target),
    },
  ];
  if (!solved.bestRange || solved.best === 0) {
    frames.push({
      scene: "picture",
      caption: `No run adds up to ${target}. The answer is 0.`,
      state: { ...blank(nums, target), tones: tones(nums.length, () => "faded"), best: 0 },
    });
    frames.push({
      scene: "picture",
      caption: "The goal: the shortest allowed run, or 0 if none works.",
      state: { ...blank(nums, target), best: 0 },
    });
    return frames;
  }
  const [from, to] = solved.bestRange;
  const sum = nums.slice(from, to + 1).reduce((a, b) => a + b, 0);
  frames.push({
    scene: "picture",
    caption: `[${nums.slice(from, to + 1).join(",")}] adds to ${sum}, which meets ${target}. Its length is ${solved.best}.`,
    state: { ...blank(nums, target), tones: tones(nums.length, range(from, to, "done")), sum, best: solved.best, bestRange: solved.bestRange },
  });
  if (to > from) {
    const shortSum = nums.slice(from + 1, to + 1).reduce((a, b) => a + b, 0);
    if (shortSum < target) {
      frames.push({
        scene: "picture",
        caption: `[${nums.slice(from + 1, to + 1).join(",")}] adds to ${shortSum}, below ${target}, so it is not allowed.`,
        state: {
          ...blank(nums, target),
          tones: tones(nums.length, range(from + 1, to, "miss")),
          sum: shortSum,
        },
      });
    }
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the shortest allowed run, and its length. If none works, the answer is 0.",
    state: { ...blank(nums, target), tones: tones(nums.length, range(from, to, "done")), best: solved.best, bestRange: solved.bestRange, sum },
  });
  return frames;
}

function slowFrames(target: number, nums: number[]): Frame[] {
  const frames: Frame[] = [];
  let total = 0;
  let best = Infinity;
  let bestRange: [number, number] | null = null;
  for (let start = 0; start < nums.length; start++) {
    let sum = 0;
    let end = start;
    let hit = false;
    for (; end < nums.length; end++) {
      sum += nums[end];
      total++;
      if (sum >= target) {
        hit = true;
        if (end - start + 1 < best) {
          best = end - start + 1;
          bestRange = [start, end];
        }
        break;
      }
    }
    const stop = hit ? end : nums.length - 1;
    if (start > 2) continue;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: start at the first box and add going right until the sum meets ${target}.${hit ? ` Length ${end - start + 1}.` : " This start never gets there."}`
          : `Go back, start at ${nums[start]}, and add boxes you already read.${hit ? ` Length ${end - start + 1}.` : ""}`,
      state: {
        ...blank(nums, target),
        left: start,
        right: stop,
        tones: tones(nums.length, (index) => (hit ? range(start, stop, "window")(index) : index >= start ? "miss" : null)),
        sum: hit ? nums.slice(start, end + 1).reduce((a, b) => a + b, 0) : nums.slice(start).reduce((a, b) => a + b, 0),
        best: best === Infinity ? null : best,
        bestRange,
        counter: { label: "boxes added", value: total },
      },
    });
  }
  const shown = best === Infinity ? 0 : best;
  frames.push({
    scene: "slow",
    caption: `From every start we added ${total} boxes for a row of only ${nums.length}. This is O(n²) time: we keep re-adding.`,
    state: {
      ...blank(nums, target),
      tones: tones(nums.length, (index) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : "faded")),
      best: shown,
      bestRange,
      counter: { label: "boxes added", value: total },
    },
  });
  return frames;
}

function insightFrames(target: number, nums: number[]): Frame[] {
  const negative = hasNegative(nums);
  if (negative) {
    const solved = trueBest(target, nums);
    const windowed = windowBest(target, nums);
    const dip = nums.findIndex((value) => value < 0);
    return [
      {
        scene: "insight",
        caption: `Picture a caterpillar. When every box is positive, a heavy body can drop the tail and only get lighter.`,
        state: { ...blank(nums, target), left: 0, right: nums.length - 1, tones: tones(nums.length, range(0, nums.length - 1, "window")) },
      },
      {
        scene: "insight",
        caption: `The Negative Trap! This box holds ${nums[dip]}. Dropping a negative makes the body heavier, so the tail crawl is no longer safe.`,
        state: {
          ...blank(nums, target),
          left: 0,
          right: nums.length - 1,
          ghostTail: dip,
          tones: tones(nums.length, (index) => (index === dip ? "miss" : range(0, nums.length - 1, "window")(index))),
        },
      },
      {
        scene: "insight",
        caption: `The window would say ${windowed}. The true shortest run has length ${solved.best}. Use this crawl only when every box is positive.`,
        state: {
          ...blank(nums, target),
          left: solved.bestRange?.[0] ?? null,
          right: solved.bestRange?.[1] ?? null,
          tones: tones(nums.length, (index) => (solved.bestRange ? range(solved.bestRange[0], solved.bestRange[1], "done")(index) : null)),
          best: solved.best,
          bestRange: solved.bestRange,
        },
      },
    ];
  }
  const heavy = firstHeavy(target, nums);
  if (!heavy) {
    return [
      {
        scene: "insight",
        caption: `Picture a caterpillar. The head adds, and the tail drops only while the body stays heavy enough. Here the whole row never meets ${target}.`,
        state: { ...blank(nums, target), left: 0, right: nums.length - 1, tones: tones(nums.length, range(0, nums.length - 1, "window")), sum: nums.reduce((a, b) => a + b, 0) },
      },
      {
        scene: "insight",
        caption: `That crawl is safe only because every box is positive. A negative would break it.`,
        state: { ...blank(nums, target), tones: tones(nums.length, () => "faded") },
      },
    ];
  }
  const { left, right, sum } = heavy;
  const dropped = nums[left];
  return [
    {
      scene: "insight",
      caption: `Picture a caterpillar. The head just made the body heavy: [${nums.slice(left, right + 1).join(",")}] adds to ${sum}.`,
      state: {
        ...blank(nums, target),
        left,
        right,
        tones: tones(nums.length, range(left, right, "window")),
        sum,
      },
    },
    {
      scene: "insight",
      caption: `Because every box is positive, dropping the tail only makes the body lighter. So the tail can crawl to shorten the body.`,
      state: {
        ...blank(nums, target),
        left: left + 1,
        right,
        tones: tones(nums.length, range(left + 1, right, "window")),
        sum: sum - dropped,
      },
    },
    {
      scene: "insight",
      caption: `The Negative Trap! If that ${dropped} were -${dropped}, dropping it would raise the body. Then this crawl would miss a later short run.`,
      state: {
        ...blank(nums, target),
        left,
        right,
        ghostTail: left,
        tones: tones(nums.length, (index) => (index === left ? "miss" : range(left, right, "window")(index))),
        sum,
      },
    },
  ];
}

function shrinkQuiz(cells: number, left: number, right: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (right !== left) feedback[right] = `That is the head. The tail leaves the box it is sitting on.`;
  if (left + 1 < cells && left + 1 !== right) {
    feedback[left + 1] = `The tail crawls one box at a time. It is still on this box.`;
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `The body is heavy enough. Which box does the tail leave first? Click that box.`,
    answer: left,
    feedback,
    otherwise: `The tail crawls one box at a time. Leave the box it is sitting on.`,
    why: `The tail leaves the box it is on, then checks the body again. This is safe only while every box is positive.`,
  };
}

function solutionFrames(target: number, nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const negative = hasNegative(nums);
  const trueAnswer = trueBest(target, nums);

  if (negative) {
    const dip = nums.findIndex((value) => value < 0);
    const windowed = windowBest(target, nums);
    const ask: Frame = {
      scene,
      caption: practice
        ? `Your turn, on a new row: [${nums.join(",")}], need ${target}. Look at the boxes before the tail moves.`
        : `This row has a negative box. The caterpillar crawl is about to be used anyway.`,
      codeLine: line(3),
      state: {
        ...blank(nums, target),
        left: 0,
        right: nums.length - 1,
        tones: tones(nums.length, (index) => (index === dip ? "miss" : range(0, nums.length - 1, "window")(index))),
        sum: nums.reduce((a, b) => a + b, 0),
      },
    };
    ask.quiz = {
      kind: "choice",
      options: ["No. A negative is in the body, so dropping the tail is unsafe.", "Yes. Drop the tail the same way as with positives."],
      answer: 0,
      question: `The body is heavy enough, but a box is negative. Should the tail crawl?`,
      why: `A negative breaks the rule that dropping the tail only makes the body lighter.`,
    };
    frames.push(ask);
    frames.push({
      scene,
      caption: `The Negative Trap! The window would say ${windowed}, but the true shortest run has length ${trueAnswer.best}. Do not use this crawl.`,
      codeLine: line(3),
      state: {
        ...blank(nums, target),
        left: 0,
        right: nums.length - 1,
        ghostTail: dip,
        tones: tones(nums.length, (index) => (index === dip ? "miss" : range(0, nums.length - 1, "window")(index))),
        sum: nums.reduce((a, b) => a + b, 0),
      },
    });
    const start = trueAnswer.bestRange?.[0] ?? 0;
    const pick: Frame = {
      scene,
      caption: `Find the shortest heavy run without the crawl. Click the first box of that run.`,
      state: {
        ...blank(nums, target),
        tones: tones(nums.length, (index) => (index === dip ? "miss" : "idle")),
      },
    };
    const feedback: Record<number, string> = {};
    nums.forEach((value, index) => {
      if (index === start) return;
      if (value < 0) feedback[index] = `A negative cannot start a short heavy run on its own.`;
      else feedback[index] = `This run from here is not the shortest that meets ${target}.`;
    });
    pick.quiz = {
      kind: "cell",
      cells: nums.length,
      numbered: true,
      question: `Which box starts the shortest run that meets ${target}? Click that box.`,
      answer: start,
      feedback,
      otherwise: `Look for the shortest neighbour run whose numbers add up to at least the need.`,
      why: `The shortest heavy run starts here. The caterpillar crawl would have missed it.`,
    };
    frames.push(pick);
    frames.push({
      scene,
      caption: practice
        ? `Done. The answer is ${trueAnswer.best}. You refused the crawl because of the negative.`
        : `The answer is ${trueAnswer.best}. Use the caterpillar only when every box is positive.`,
      codeLine: line(8),
      state: {
        ...blank(nums, target),
        left: trueAnswer.bestRange?.[0] ?? null,
        right: trueAnswer.bestRange?.[1] ?? null,
        tones: tones(nums.length, (index) => (trueAnswer.bestRange ? range(trueAnswer.bestRange[0], trueAnswer.bestRange[1], "done")(index) : null)),
        best: trueAnswer.best,
        bestRange: trueAnswer.bestRange,
      },
    });
    if (!practice) {
      frames.push({
        scene,
        caption: `Time: O(n). When every box is positive, the head and tail each walk the row once.`,
        codeLine: 1,
        state: { ...blank(nums, target), counter: { label: "boxes read", value: nums.length }, best: trueAnswer.best, bestRange: trueAnswer.bestRange },
      });
      frames.push({
        scene,
        caption: `Space: O(1). The caterpillar keeps a body sum, a tail, and a shortest length.`,
        codeLine: 0,
        state: { ...blank(nums, target), best: trueAnswer.best, bestRange: trueAnswer.bestRange, sum: trueAnswer.bestRange ? nums.slice(trueAnswer.bestRange[0], trueAnswer.bestRange[1] + 1).reduce((a, b) => a + b, 0) : null },
      });
    }
    return frames;
  }

  let left = 0;
  let sum = 0;
  let best = Infinity;
  let bestRange: [number, number] | null = null;
  let asked = false;
  const paint = (right: number | null, inner: (index: number) => CellTone | null) =>
    tones(nums.length, (index) => (right !== null && index < left ? "faded" : inner(index)));
  const base = (right: number | null): NumberWindowState => ({
    values: nums,
    tones: paint(right, (index) => (right !== null && index === right ? "edge" : right !== null ? range(left, right - 1, "window")(index) : null)),
    left,
    right,
    best: best === Infinity ? null : best,
    bestRange,
    sum: right === null ? null : sum,
    target,
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(",")}], need ${target}. The head moves by itself. You move the tail.`
      : `The caterpillar starts empty. Need ${target}. The body sum is 0.`,
    codeLine: line(0),
    state: base(null),
  });

  for (let right = 0; right < nums.length; right++) {
    if (!practice) {
      frames.push({
        scene,
        caption: `The head moves to ${nums[right]}.`,
        codeLine: line(2),
        state: base(right),
      });
    }
    sum += nums[right];

    while (sum >= target) {
      const length = right - left + 1;
      const improved = length < best;
      if (improved) {
        best = length;
        bestRange = [left, right];
      }
      const heavy: Frame = {
        scene,
        caption: `The body [${nums.slice(left, right + 1).join(",")}] adds to ${sum}. That meets ${target}. ${improved ? `New shortest: ${best}.` : `Shortest stays ${best}.`}`,
        codeLine: line(4),
        state: { ...base(right), tones: paint(right, range(left, right, improved ? "done" : "window")) },
      };
      if (practice || !asked) {
        asked = true;
        heavy.quiz = shrinkQuiz(nums.length, left, right);
      }
      frames.push(heavy);
      const gone = nums[left];
      sum -= gone;
      left++;
      frames.push({
        scene,
        caption: `The tail leaves ${gone}. The body now adds to ${sum}.`,
        codeLine: line(5),
        state: base(right),
      });
    }

    if (practice && sum < target) {
      frames.push({
        scene,
        caption: `The body [${nums.slice(left, right + 1).join(",")}] adds to ${sum}, still below ${target}. The head will eat again.`,
        state: { ...base(right), tones: paint(right, range(left, right, "window")) },
      });
    } else if (!practice) {
      frames.push({
        scene,
        caption: `The body [${nums.slice(left, right + 1).join(",")}] adds to ${sum}, still below ${target}.`,
        codeLine: line(2),
        state: { ...base(right), tones: paint(right, range(left, right, "window")) },
      });
    }
  }

  const answer = best === Infinity ? 0 : best;
  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${answer}. You moved the tail yourself every time.`
      : `The head reached the end. The answer is ${answer}.`,
    codeLine: line(8),
    state: {
      ...base(null),
      left: bestRange?.[0] ?? null,
      right: bestRange?.[1] ?? null,
      tones: tones(nums.length, (index) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : "faded")),
      best: answer,
      bestRange,
      sum: null,
    },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). The head ate each of the ${nums.length} boxes once, and the tail only crawled forward.`,
      codeLine: 1,
      state: {
        ...blank(nums, target),
        tones: tones(nums.length, (index) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : "faded")),
        best: answer,
        bestRange,
        counter: { label: "boxes read", value: nums.length },
      },
    });
    frames.push({
      scene,
      caption: `Space: O(1). The caterpillar keeps a body sum, a tail, and a shortest length.`,
      codeLine: 0,
      state: {
        ...blank(nums, target),
        tones: tones(nums.length, (index) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : "faded")),
        best: answer,
        bestRange,
        sum: bestRange ? nums.slice(bestRange[0], bestRange[1] + 1).reduce((a, b) => a + b, 0) : null,
      },
    });
  }
  return frames;
}

export const minimumSizeSubarrayStory: ProblemStory<NumberWindowState> = {
  slugs: ["lc-209"],
  pattern: "Sliding window, positives",
  trigger: "shortest neighbour run whose sum is at least a target, and every value is positive",
  insight: "A caterpillar whose head adds and whose tail drops while the body stays heavy enough. That crawl is safe only because every box is positive.",
  metaphor: {
    name: "The caterpillar",
    legend: "tail = left · head = right · body = the window · body sum = sum",
    terms: ["head", "tail", "body", "caterpillar"],
  },
  traps: [
    {
      name: "The Negative Trap",
      rule: "Do not use this crawl when a value can be negative. Dropping a negative raises the body, so a later short run can be missed. Then use prefix sums.",
    },
  ],
  template: [
    "for (right = 0; right < n; right++) {",
    "    add nums[right] to the body;",
    "    while (body is heavy enough) {",
    "        best = min(best, body length);",
    "        drop the tail;",
    "    }",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each box is added once and dropped at most once",
    space: "O(1)",
    spaceWhy: "only a body sum, a tail, and a shortest length",
  },
  code: CODE,
  examples: [
    { label: "target=7 nums=[2,3,1,2,4,3]", input: "target=7 nums=[2,3,1,2,4,3]", expected: "2" },
    { label: "target=4 nums=[1,4,4]", input: "target=4 nums=[1,4,4]", expected: "1" },
    { label: "target=11 nums=[1,1,1,1,1,1,1,1]", input: "target=11 nums=[1,1,1,1,1,1,1,1]", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-76", title: "Minimum Window Substring" },
    { slug: "lc-560", title: "Subarray Sum Equals K" },
    { slug: "lc-3", title: "Longest Substring Without Repeating Characters" },
  ],
  answer: (input) => {
    const { target, nums } = parse(input);
    return String(trueBest(target, nums).best);
  },
  frames: (input) => {
    const { target, nums } = parse(input);
    const solved = trueBest(target, nums);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(target, nums, solved),
      ...slowFrames(target, nums),
      ...insightFrames(target, nums),
      ...solutionFrames(target, nums),
      ...solutionFrames(practice.target, practice.nums, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(nums, target),
          left: solved.bestRange?.[0] ?? null,
          right: solved.bestRange?.[1] ?? null,
          tones: solved.bestRange ? tones(nums.length, range(solved.bestRange[0], solved.bestRange[1], "done")) : tones(nums.length, () => "faded"),
          best: solved.best,
          bestRange: solved.bestRange,
        },
      },
    ];
  },
  View: NumberWindowView,
};
