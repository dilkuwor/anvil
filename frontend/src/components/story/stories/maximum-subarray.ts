import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh all-negative row. Seeding best at 0 would wrongly return 0. */
const PRACTICE = "[-3,-1,-2]";

const CODE = [
  "int best = nums[0];",
  "int running = nums[0];",
  "for (int i = 1; i < nums.length; i++) {",
  "    running = Math.max(nums[i], running + nums[i]);",
  "    best = Math.max(best, running);",
  "}",
  "return best;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function solve(nums: number[]): { best: number; from: number; to: number } {
  let best = nums[0] ?? 0;
  let running = nums[0] ?? 0;
  let from = 0;
  let to = 0;
  let start = 0;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i]! > running + nums[i]!) {
      running = nums[i]!;
      start = i;
    } else running += nums[i]!;
    if (running > best) {
      best = running;
      from = start;
      to = i;
    }
  }
  return { best, from, to };
}

function picture(nums: number[], paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  return {
    rows: [
      {
        cells: nums.map((value, index) => ({
          value: String(value),
          tone: paint(index) ?? "idle",
          caption: String(index),
        })),
      },
    ],
    notebooks: extra?.notebooks ?? [{ title: "bag", entries: [] }],
    ...extra,
  };
}

function pictureFrames(nums: number[], solved: { best: number; from: number; to: number }): Frame[] {
  const allNeg = nums.every((value) => value < 0);
  return [
    {
      scene: "picture",
      caption: "A neighbour run with the largest sum. The row is never empty.",
      state: picture(nums, () => null),
    },
    {
      scene: "picture",
      caption: `The best run sums to ${solved.best}.`,
      state: picture(nums, (index) => (index >= solved.from && index <= solved.to ? "done" : "faded"), {
        band: { row: 0, from: solved.from, to: solved.to },
      }),
    },
    {
      scene: "picture",
      caption: allNeg
        ? "The Zero-Start Trap: seed best at 0. An all-negative row would then return 0, but empty is not allowed."
        : "The Zero-Start Trap: seed best at 0. That fails when every value is negative.",
      state: picture(nums, () => (allNeg ? "miss" : "window"), {
        banner: { text: "Zero-Start Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ start at 0" },
      }),
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [];
  let adds = 0;
  let best = nums[0] ?? 0;
  let shown = 0;
  for (let start = 0; start < nums.length; start++) {
    let sum = 0;
    for (let end = start; end < nums.length; end++) {
      sum += nums[end]!;
      adds += 1;
      if (sum > best) best = sum;
      if (shown < 3) {
        shown += 1;
        frames.push({
          scene: "slow",
          caption:
            shown === 1
              ? `The slow way: from each start, add going right. This run sums to ${sum}.`
              : `From ${nums[start]} to ${nums[end]}, sum ${sum}. Best ${best}.`,
          state: picture(nums, (index) => (index >= start && index <= end ? "window" : "faded"), {
            band: { row: 0, from: start, to: end },
            counter: { label: "adds", value: adds },
          }),
        });
      }
    }
  }
  frames.push({
    scene: "slow",
    caption: `We added ${adds} runs on ${nums.length} boxes. This is O(n²) time.`,
    state: picture(nums, () => "faded", { counter: { label: "adds", value: adds } }),
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const allNeg = nums.every((value) => value < 0);
  return [
    {
      scene: "insight",
      caption: "Keep a running bag: extend the run that ends here, or drop it and start at this box.",
      state: picture(nums, (index) => (index === 0 ? "window" : null)),
    },
    {
      scene: "insight",
      caption: allNeg
        ? "The Zero-Start Trap: best starts at 0, so this all-negative row would return 0. Empty is not allowed."
        : "The Zero-Start Trap: best starts at 0. Seed both best and the bag with the first box.",
      state: picture(nums, () => "miss", {
        banner: { text: "Zero-Start Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ start at 0" },
      }),
    },
    {
      scene: "insight",
      caption: "Start a new run when this box alone is better than extending. A lone negative can still win.",
      state: picture(nums, (index) => (index === 0 ? "done" : null)),
    },
  ];
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let best = nums[0] ?? 0;
  let running = nums[0] ?? 0;
  let start = 0;
  let askedDrop = false;
  const solved = solve(nums);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}]. Seed the bag with the first box, not 0.`
      : "Seed best and the running bag with the first box, not 0.",
    codeLine: line(0),
    state: picture(nums, (index) => (index === 0 ? "hit" : null), {
      notebooks: [{ title: "bag", entries: [{ key: "running", value: String(running) }, { key: "best", value: String(best) }] }],
    }),
    quiz: {
      kind: "choice",
      question: "What do we seed best with?",
      options: ["0, so we can skip a negative run", "The first box, because empty is not allowed"],
      answer: 1,
      why: "The Zero-Start Trap returns 0 on an all-negative row. Seed with the first box.",
    },
  });

  for (let i = 1; i < nums.length; i++) {
    const value = nums[i]!;
    const drop = value > running + value;
    const look: Frame = {
      scene,
      caption: drop ? `${value} is better than extending ${running}. Drop the bag and start here.` : `Extend the bag: ${running} plus ${value}.`,
      codeLine: line(3),
      state: picture(nums, (index) => (index === i ? "edge" : index >= start && index < i ? "window" : "faded"), {
        band: { row: 0, from: start, to: i },
        notebooks: [{ title: "bag", entries: [{ key: "running", value: String(running) }, { key: "best", value: String(best) }] }],
      }),
    };
    if (drop && (practice || !askedDrop)) {
      askedDrop = true;
      look.quiz = {
        kind: "choice",
        question: "The bag plus this box is worse than the box alone. What now?",
        options: ["Keep extending", "Drop the bag and start a new run here"],
        answer: 1,
        why: "A bad prefix can only hurt. Start at this box.",
      };
    }
    frames.push(look);
    if (drop) {
      running = value;
      start = i;
    } else running += value;
    if (running > best) best = running;
    frames.push({
      scene,
      caption: `Bag ${running}. Best ${best}.`,
      codeLine: line(4),
      state: picture(nums, (index) => (index >= start && index <= i ? (running === best ? "done" : "window") : "faded"), {
        band: { row: 0, from: start, to: i },
        notebooks: [{ title: "bag", entries: [{ key: "running", value: String(running) }, { key: "best", value: String(best) }] }],
        counter: { label: "best", value: best },
      }),
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${solved.best}.` : `The walk is over. The answer is ${solved.best}.`,
    codeLine: line(6),
    state: picture(nums, (index) => (index >= solved.from && index <= solved.to ? "done" : "faded"), {
      band: { row: 0, from: solved.from, to: solved.to },
    }),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each value is read once.`,
      codeLine: 2,
      state: picture(nums, () => "faded", { counter: { label: "boxes read", value: nums.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only best and the running bag are stored.`,
      codeLine: 0,
      state: picture(nums, (index) => (index >= solved.from && index <= solved.to ? "done" : "faded")),
    });
  }
  return frames;
}

export const maximumSubarrayStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-53"],
  pattern: "Kadane, best run ending here",
  trigger: "the largest sum of any neighbour run in an array that may hold negatives",
  insight: "A running bag: extend, or drop and start here. Seed best with the first box, never 0.",
  metaphor: {
    name: "The running bag",
    legend: "bag = best run ending here · drop = start at i · best = global best",
    terms: ["bag", "drop", "run"],
  },
  traps: [
    {
      name: "The Zero-Start Trap",
      rule: "Empty is not allowed. Seed best with the first box, not 0, so all-negative rows work.",
    },
  ],
  template: [
    "best = running = first box;",
    "for each later box {",
    "    running = max(box, running + box);",
    "    best = max(best, running);",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each value is read once",
    space: "O(1)",
    spaceWhy: "only best and running are stored",
  },
  code: CODE,
  examples: [
    { label: "[-2,1,-3,4,-1,2,1,-5,4]", input: "[-2,1,-3,4,-1,2,1,-5,4]", expected: "6" },
    { label: "[-1]", input: "[-1]", expected: "-1" },
    { label: "[5,4,-1,7,8]", input: "[5,4,-1,7,8]", expected: "23" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-152", title: "Maximum Product Subarray" },
    { slug: "lc-121", title: "Best Time to Buy and Sell Stock" },
    { slug: "lc-560", title: "Subarray Sum Equals K" },
  ],
  answer: (input) => String(solve(parse(input)).best),
  frames: (input) => {
    const nums = parse(input);
    const solved = solve(nums);
    return [
      ...pictureFrames(nums, solved),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, (index) => (index >= solved.from && index <= solved.to ? "done" : "faded")),
      },
    ];
  },
  View: GrokNotebookView,
};
