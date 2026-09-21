import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh run of targets. Walking the run after one hit would read the whole row. */
const PRACTICE = "[2,2,2]\n2";

const CODE = [
  "int left = bound(nums, target);",
  "if (left == nums.length || nums[left] != target) return new int[] {-1, -1};",
  "int right = bound(nums, target + 1) - 1;",
  "return new int[] {left, right};",
  "int lo = 0, hi = nums.length;",
  "while (lo < hi) {",
  "    int mid = lo + (hi - lo) / 2;",
  "    if (nums[mid] < value) lo = mid + 1;",
  "    else hi = mid;",
  "}",
  "return lo;",
];

function parse(raw: string): { nums: number[]; target: number } {
  const lines = raw.trim().split(/\n+/);
  const nums = (lines[0]?.match(/-?\d+/g) ?? []).map(Number);
  if (lines.length >= 2) return { nums, target: Number((lines[1].match(/-?\d+/) ?? ["0"])[0]) };
  return { nums: nums.slice(0, -1), target: nums[nums.length - 1] ?? 0 };
}

function bound(nums: number[], value: number): number {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function solve(nums: number[], target: number): [number, number] {
  const left = bound(nums, target);
  if (left === nums.length || nums[left] !== target) return [-1, -1];
  return [left, bound(nums, target + 1) - 1];
}

function fmt(pair: [number, number]): string {
  return `[${pair[0]},${pair[1]}]`;
}

function picture(
  nums: number[],
  paint: (index: number) => CellTone | null,
  tags: (string | undefined)[] = [],
  extra?: Partial<GrokNotebookState>,
): GrokNotebookState {
  return {
    rows: [
      {
        cells: nums.map((value, index) => ({
          value: String(value),
          tone: paint(index) ?? "idle",
          caption: String(index),
          tag: tags[index],
          tagTone: tags[index] === "mid" ? "teal" : tags[index] === "lo" ? "accent" : "coral",
        })),
      },
    ],
    notebooks: null,
    ...extra,
  };
}

function pictureFrames(nums: number[], target: number, pair: [number, number]): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A sorted row. We want the first and last seat of ${target}, in log time.`,
      state: picture(nums, () => null),
    },
  ];
  if (pair[0] >= 0) {
    frames.push({
      scene: "picture",
      caption: `The run of ${target} sits from seat ${pair[0]} to seat ${pair[1]}. That is allowed.`,
      state: picture(nums, (index) => (index >= pair[0] && index <= pair[1] ? "done" : "faded"), [], {
        band: { row: 0, from: pair[0], to: pair[1] },
      }),
    });
    frames.push({
      scene: "picture",
      caption: `The Linear-Walk Trap: find one ${target}, then walk left and right along the run. A long run makes that linear.`,
      state: picture(nums, (index) => (index >= pair[0] && index <= pair[1] ? "miss" : "faded"), [], {
        banner: { text: "Linear-Walk Trap", tone: "coral" },
        ghost: { row: 0, col: pair[0], label: "✕ walk the run" },
      }),
    });
  } else {
    frames.push({
      scene: "picture",
      caption: `${target} never appears. Both seats stay -1.`,
      state: picture(nums, () => "faded"),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: two seats, or [-1,-1], using two fence searches.",
    state: picture(nums, (index) => (pair[0] >= 0 && index >= pair[0] && index <= pair[1] ? "done" : null)),
  });
  return frames;
}

function slowFrames(nums: number[], target: number): Frame[] {
  const frames: Frame[] = [];
  let reads = 0;
  for (let i = 0; i < nums.length; i++) {
    reads += 1;
    if (i < 3 || nums[i] === target) {
      frames.push({
        scene: "slow",
        caption:
          i === 0
            ? `The slow way: read every box. Seat 0 holds ${nums[0]}.`
            : `Read ${nums[i]}. ${nums[i] === target ? "Update the ends of the run." : "Keep going."}`,
        state: picture(nums, (index) => (index === i ? "edge" : index < i ? "faded" : null), [], {
          counter: { label: "boxes read", value: reads },
        }),
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We read all ${reads} boxes. This is O(n) time, which misses the log-time ask.`,
    state: picture(nums, () => "faded", [], { counter: { label: "boxes read", value: reads } }),
  });
  return frames;
}

function insightFrames(nums: number[], target: number): Frame[] {
  const pair = solve(nums, target);
  return [
    {
      scene: "insight",
      caption: "A fence search finds the first box that is not smaller than a value. Two fences give both ends.",
      state: picture(nums, () => "window"),
    },
    {
      scene: "insight",
      caption: `The Linear-Walk Trap is finding one ${target} then stepping seat by seat to both ends. A long run becomes linear.`,
      state: picture(nums, (index) => (pair[0] >= 0 && index >= pair[0] && index <= pair[1] ? "miss" : "faded"), [], {
        banner: { text: "Linear-Walk Trap", tone: "coral" },
      }),
    },
    {
      scene: "insight",
      caption: `Fence for ${target}, then fence for ${target + 1} and step one left. Both are log time.`,
      state: picture(nums, (index) => (pair[0] >= 0 && index >= pair[0] && index <= pair[1] ? "done" : "faded")),
    },
  ];
}

function searchFrames(nums: number[], value: number, scene: SceneId, practice: boolean, label: string, asked: { mid: boolean }): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let lo = 0;
  let hi = nums.length;
  let steps = 0;
  while (lo < hi && steps < 8) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const tags: (string | undefined)[] = [];
    if (lo < nums.length) tags[lo] = "lo";
    if (mid < nums.length) tags[mid] = "mid";
    if (hi - 1 >= 0 && hi - 1 < nums.length) tags[hi - 1] = "hi";
    const goRight = nums[mid] < value;
    const look: Frame = {
      scene,
      caption: `${label}: the middle box holds ${nums[mid]}. ${goRight ? "Too small, move lo past it." : "Not smaller, drop hi to mid."}`,
      codeLine: line(7),
      state: picture(nums, (index) => (index < lo || index >= hi ? "faded" : index === mid ? "edge" : "window"), tags),
    };
    if ((practice || !asked.mid) && !asked.mid) {
      asked.mid = true;
      look.quiz = {
        kind: "choice",
        question: "Compared with the fence value, where does this search move?",
        options: ["Throw the middle away and move lo past it", "Drop hi onto the middle"],
        answer: goRight ? 0 : 1,
        why: goRight ? "A smaller middle is thrown away. lo steps past it." : "The first large-enough box is at or left of mid, so hi drops onto mid.",
      };
    }
    frames.push(look);
    if (goRight) lo = mid + 1;
    else hi = mid;
    steps += 1;
  }
  frames.push({
    scene,
    caption: `The fence lands at seat ${lo}.`,
    codeLine: line(10),
    state: picture(nums, (index) => (index === lo && lo < nums.length ? "hit" : "faded")),
  });
  return frames;
}

function solutionFrames(nums: number[], target: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const pair = solve(nums, target);
  const asked = { mid: false };

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}], target ${target}. You move the fences.`
      : `First fence: the first box that is not smaller than ${target}.`,
    codeLine: line(0),
    state: picture(nums, () => null),
  });

  if (practice) {
    frames.push({
      scene,
      caption: `A long run of ${target} sits here. Walking it would be the Linear-Walk Trap.`,
      state: picture(nums, (index) => (nums[index] === target ? "miss" : "faded"), [], {
        banner: { text: "Linear-Walk Trap", tone: "coral" },
      }),
      quiz: {
        kind: "choice",
        question: "We found a run of the target. How do we find both ends?",
        options: ["Walk left and right from any hit", "Run a second fence search"],
        answer: 1,
        why: "A long run makes a walk linear. Two fence searches stay log time.",
      },
    });
  }

  frames.push(...searchFrames(nums, target, scene, practice, "Left fence", asked));
  const left = bound(nums, target);
  if (left === nums.length || nums[left] !== target) {
    frames.push({
      scene,
      caption: `No ${target} here. The answer is [-1,-1].`,
      codeLine: line(1),
      state: picture(nums, () => "faded"),
    });
  } else {
    frames.push({
      scene,
      caption: `First ${target} is at seat ${left}. Now fence for ${target + 1}.`,
      codeLine: line(2),
      state: picture(nums, (index) => (index === left ? "hit" : "faded")),
    });
    frames.push(...searchFrames(nums, target + 1, scene, practice, "Right fence", asked));
    frames.push({
      scene,
      caption: `Last ${target} is one seat left of that fence. The answer is ${fmt(pair)}.`,
      codeLine: line(3),
      state: picture(nums, (index) => (index >= pair[0] && index <= pair[1] ? "done" : "faded"), [], {
        band: { row: 0, from: pair[0], to: pair[1] },
      }),
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log n). Each fence search halves the remaining row, twice.`,
      codeLine: 5,
      state: picture(nums, () => "faded", [], { counter: { label: "halves", value: 2 } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only the two fence pointers are stored.`,
      codeLine: 4,
      state: picture(nums, (index) => (pair[0] >= 0 && index >= pair[0] && index <= pair[1] ? "done" : "faded")),
    });
  }
  return frames;
}

export const firstAndLastPositionStory: ProblemStory<GrokNotebookState> = {
  slugs: ["first-and-last-position"],
  pattern: "Binary search",
  trigger: "a sorted array, and you need the first and last index of a value, in log time",
  insight: "Two fence searches: first box not smaller than target, then first box not smaller than target plus one.",
  metaphor: {
    name: "Two fences",
    legend: "fence = lower bound · lo/hi = search range · run = equal values",
    terms: ["fence", "run", "seat"],
  },
  traps: [
    {
      name: "The Linear-Walk Trap",
      rule: "Do not find one hit then walk to both ends. A long run is linear. Use a second fence.",
    },
  ],
  template: [
    "left = first box not smaller than target;",
    "if missing, return [-1,-1];",
    "right = first box not smaller than target+1, then one left;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(log n)",
    timeWhy: "each bound search halves the remaining range, twice",
    space: "O(1)",
    spaceWhy: "only the two search pointers are stored",
  },
  code: CODE,
  examples: [
    { label: "[5,7,7,8,8,10] target 8", input: "[5,7,7,8,8,10]\n8", expected: "[3,4]" },
    { label: "[5,7,7,8,8,10] target 6", input: "[5,7,7,8,8,10]\n6", expected: "[-1,-1]" },
    { label: "[1] target 1", input: "[1]\n1", expected: "[0,0]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-34", title: "Find First and Last Position of Element in Sorted Array" },
    { slug: "lc-704", title: "Binary Search" },
    { slug: "lc-278", title: "First Bad Version" },
  ],
  answer: (input) => {
    const { nums, target } = parse(input);
    return fmt(solve(nums, target));
  },
  frames: (input) => {
    const { nums, target } = parse(input);
    const pair = solve(nums, target);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(nums, target, pair),
      ...slowFrames(nums, target),
      ...insightFrames(nums, target),
      ...solutionFrames(nums, target),
      ...solutionFrames(practice.nums, practice.target, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, (index) => (pair[0] >= 0 && index >= pair[0] && index <= pair[1] ? "done" : "faded")),
      },
    ];
  },
  View: GrokNotebookView,
};
