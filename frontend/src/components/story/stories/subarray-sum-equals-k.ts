import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row with a negative, so a shrinking window would be wrong. */
const PRACTICE = "[1,-1,1]\n0";

const CODE = [
  "Map<Integer, Integer> seen = new HashMap<>();",
  "seen.put(0, 1);",
  "int prefix = 0, count = 0;",
  "for (int value : nums) {",
  "    prefix += value;",
  "    count += seen.getOrDefault(prefix - k, 0);",
  "    seen.put(prefix, seen.getOrDefault(prefix, 0) + 1);",
  "}",
  "return count;",
];

function parse(raw: string): { nums: number[]; k: number } {
  const lines = raw.trim().split(/\n+/);
  const nums = (lines[0]?.match(/-?\d+/g) ?? []).map(Number);
  if (lines.length >= 2) return { nums, k: Number((lines[1].match(/-?\d+/) ?? ["0"])[0]) };
  return { nums: nums.slice(0, -1), k: nums[nums.length - 1] ?? 0 };
}

function solve(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]]);
  let prefix = 0;
  let count = 0;
  for (const value of nums) {
    prefix += value;
    count += seen.get(prefix - k) ?? 0;
    seen.set(prefix, (seen.get(prefix) ?? 0) + 1);
  }
  return count;
}

function picture(
  nums: number[],
  seen: Map<number, number>,
  paint: (index: number) => CellTone | null,
  extra?: Partial<GrokNotebookState>,
): GrokNotebookState {
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
    notebooks: [
      {
        title: "notebook (running → times)",
        entries: [...seen.entries()].map(([key, value]) => ({ key: String(key), value: String(value) })),
      },
    ],
    ...extra,
  };
}

function hasNegative(nums: number[]): boolean {
  return nums.some((value) => value < 0);
}

function pictureFrames(nums: number[], k: number, total: number): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Each box is a number. We count neighbour slices whose values add to ${k}.`,
      state: picture(nums, new Map([[0, 1]]), () => null),
    },
    {
      scene: "picture",
      caption: `There are ${total} such slice${total === 1 ? "" : "s"}.`,
      state: picture(nums, new Map([[0, 1]]), () => "done"),
    },
  ];
  if (hasNegative(nums)) {
    frames.push({
      scene: "picture",
      caption: "A shrinking window assumes sums only grow. A negative breaks that, so a window is not allowed here.",
      state: picture(nums, new Map([[0, 1]]), (index) => (nums[index] < 0 ? "miss" : "window"), {
        band: { row: 0, from: 0, to: nums.length - 1 },
        banner: { text: "Window Trap", tone: "coral" },
      }),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: how many slices add to the target.",
    state: picture(nums, new Map([[0, 1]]), () => null),
  });
  return frames;
}

function slowFrames(nums: number[], k: number): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  let count = 0;
  let shown = 0;
  for (let i = 0; i < nums.length; i++) {
    let sum = 0;
    for (let j = i; j < nums.length; j++) {
      sum += nums[j];
      checks += 1;
      if (sum === k) count += 1;
      if (shown < 3 || (sum === k && shown < 5)) {
        shown += 1;
        frames.push({
          scene: "slow",
          caption:
            shown === 1
              ? `The slow way: from each start, add going right. This slice sums to ${sum}.`
              : `Start at ${nums[i]}, end at ${nums[j]}. Sum ${sum}${sum === k ? " hits the target." : "."}`,
          state: picture(nums, new Map(), (index) => (index >= i && index <= j ? (sum === k ? "done" : "window") : "faded"), {
            band: { row: 0, from: i, to: j },
            counter: { label: "slices added", value: checks },
          }),
        });
      }
    }
  }
  frames.push({
    scene: "slow",
    caption: `We added ${checks} slices on a row of ${nums.length}. This is O(n²) time. Found ${count}.`,
    state: picture(nums, new Map(), () => "faded", { counter: { label: "slices added", value: checks } }),
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  return [
    {
      scene: "insight",
      caption: "A slice sum is the difference of two running totals. If running minus k was seen before, a slice just closed.",
      state: picture(nums, new Map([[0, 1]]), () => "window"),
    },
    {
      scene: "insight",
      caption: hasNegative(nums)
        ? "The Window Trap: shrinking from the left as if sums only grow. A negative can make the sum smaller, so that picture lies."
        : "The Window Trap would shrink from the left as if sums only grow. That picture fails as soon as a negative appears.",
      state: picture(nums, new Map([[0, 1]]), (index) => (nums[index] < 0 ? "miss" : "window"), {
        banner: { text: "Window Trap", tone: "coral" },
        ghost: { row: 0, col: Math.max(0, nums.findIndex((v) => v < 0)), label: "✕ window" },
      }),
    },
    {
      scene: "insight",
      caption: "Keep a notebook of how many times each running total has appeared. Seed it with 0 seen once.",
      state: picture(nums, new Map([[0, 1]]), () => null, { arc: { row: 0, col: 0, notebook: 0, entry: 0, tone: "hit" } }),
    },
  ];
}

function solutionFrames(nums: number[], k: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const seen = new Map<number, number>([[0, 1]]);
  let prefix = 0;
  let count = 0;
  let askedLook = false;
  let askedNeg = false;
  const total = solve(nums, k);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}], target ${k}. The notebook starts with 0 seen once.`
      : "Seed the notebook: running 0 has been seen once, so a whole prefix that equals the target counts.",
    codeLine: line(1),
    state: picture(nums, new Map(seen), () => null),
  });

  for (let i = 0; i < nums.length; i++) {
    const value = nums[i];
    if (!practice) {
      frames.push({
        scene,
        caption: `Add ${value} to the running total.`,
        codeLine: line(4),
        state: picture(nums, new Map(seen), (index) => (index === i ? "edge" : index < i ? "window" : null), {
          band: { row: 0, from: 0, to: i },
          counter: { label: "running", value: prefix },
        }),
      });
    }
    prefix += value;
    const need = prefix - k;
    const hits = seen.get(need) ?? 0;

    if (value < 0 && (practice || !askedNeg)) {
      askedNeg = true;
      frames.push({
        scene,
        caption: `${value} is negative, so the running total just shrank. A window cannot drop the left side for that.`,
        codeLine: line(4),
        state: picture(nums, new Map(seen), (index) => (index === i ? "miss" : index < i ? "window" : null), {
          banner: { text: "Window Trap", tone: "coral" },
          ghost: { row: 0, col: i, label: "✕ window" },
          counter: { label: "running", value: prefix },
        }),
        quiz: {
          kind: "choice",
          question: "The running total just shrank. What do we do?",
          options: ["Shrink a window from the left", "Look up running minus target in the notebook"],
          answer: 1,
          why: "The Window Trap is shrinking as if sums only grow. Look up the earlier running total instead.",
        },
      });
    }

    const look: Frame = {
      scene,
      caption: `Running is ${prefix}. Look up ${need} (running minus the target) in the notebook.`,
      codeLine: line(5),
      state: picture(nums, new Map(seen), (index) => (index === i ? "edge" : index < i ? "window" : null), {
        counter: { label: "running", value: prefix },
      }),
    };
    if (practice && !askedLook) {
      askedLook = true;
      look.quiz = {
        kind: "choice",
        question: "What do we look up in the notebook?",
        options: ["The current running total", "Running minus the target"],
        answer: 1,
        why: "A slice that ends here and sums to the target started after an earlier running of current minus target.",
      };
    }
    frames.push(look);

    count += hits;
    frames.push({
      scene,
      caption: hits ? `That page was seen ${hits} time${hits === 1 ? "" : "s"}. Count becomes ${count}.` : `No such page yet. Count stays ${count}.`,
      codeLine: line(5),
      state: picture(nums, new Map(seen), (index) => (index <= i ? "window" : null), {
        counter: { label: "slices", value: count },
      }),
    });
    seen.set(prefix, (seen.get(prefix) ?? 0) + 1);
    frames.push({
      scene,
      caption: `Then write running ${prefix} in the notebook. Look up first, then write.`,
      codeLine: line(6),
      state: picture(nums, new Map(seen), (index) => (index === i ? "hit" : index < i ? "faded" : null), {
        arc: { row: 0, col: i, notebook: 0, entry: [...seen.keys()].indexOf(prefix), tone: "hit" },
      }),
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${total}. You looked up every running total.` : `The walk is over. The answer is ${total}.`,
    codeLine: line(8),
    state: picture(nums, new Map(seen), () => "done"),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each value updates the running total once and hits the notebook twice.`,
      codeLine: 3,
      state: picture(nums, new Map(seen), () => "faded", { counter: { label: "boxes read", value: nums.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(n). The notebook holds one page per distinct running total.`,
      codeLine: 0,
      state: picture(nums, new Map(seen), () => "faded"),
    });
  }
  return frames;
}

export const subarraySumEqualsKStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-560"],
  pattern: "Prefix sum",
  trigger: "count how many neighbour slices sum to k. Values may be negative, so a shrinking window does not work",
  insight: "A slice sum is two running totals. Look up running minus k in a notebook, then write the current running.",
  metaphor: {
    name: "The running notebook",
    legend: "running = prefix · notebook = counts of prefix · slice = subarray",
    terms: ["notebook", "running", "slice"],
  },
  traps: [
    {
      name: "The Window Trap",
      rule: "Do not grow and shrink a window. Negatives break that. Use running totals and a notebook.",
    },
  ],
  template: [
    "notebook[0] = 1; running = 0;",
    "for each value {",
    "    running += value;",
    "    count += notebook[running - k];",
    "    notebook[running] += 1;",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each value updates running once and hits the notebook twice",
    space: "O(n)",
    spaceWhy: "the notebook holds one page per distinct running total",
  },
  code: CODE,
  examples: [
    { label: "[1,1,1] k=2", input: "[1,1,1]\n2", expected: "2" },
    { label: "[1,-1,0] k=0", input: "[1,-1,0]\n0", expected: "3", note: "negatives; a window would be wrong" },
    { label: "[3] k=3", input: "[3]\n3", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-53", title: "Maximum Subarray" },
    { slug: "lc-209", title: "Minimum Size Subarray Sum" },
    { slug: "lc-152", title: "Maximum Product Subarray" },
  ],
  answer: (input) => {
    const { nums, k } = parse(input);
    return String(solve(nums, k));
  },
  frames: (input) => {
    const { nums, k } = parse(input);
    const total = solve(nums, k);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(nums, k, total),
      ...slowFrames(nums, k),
      ...insightFrames(nums),
      ...solutionFrames(nums, k),
      ...solutionFrames(practice.nums, practice.k, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, new Map([[0, 1]]), () => "done"),
      },
    ];
  },
  View: GrokNotebookView,
};
