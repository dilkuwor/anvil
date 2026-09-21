import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokCell, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row. 2 and 3 are not heads; only 1 starts the chain. */
const PRACTICE = "[10,1,3,2]";

const CODE = [
  "Set<Integer> values = new HashSet<>();",
  "for (int n : nums) values.add(n);",
  "int best = 0;",
  "for (int value : values) {",
  "    if (values.contains(value - 1)) continue;",
  "    int length = 1;",
  "    while (values.contains(value + length)) length++;",
  "    best = Math.max(best, length);",
  "}",
  "return best;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function unique(nums: number[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const value of nums) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function cells(nums: number[], paint: (index: number) => CellTone | null, tags?: (string | undefined)[]): GrokCell[] {
  return nums.map((value, index) => ({
    value: String(value),
    tone: paint(index) ?? "idle",
    caption: String(index),
    tag: tags?.[index],
    tagTone: tags?.[index] === "head" ? "teal" : "coral",
  }));
}

function picture(nums: number[], present: Iterable<number>, paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  const pages = [...new Set(present)];
  return {
    rows: [{ cells: cells(nums, paint, extra?.rows?.[0]?.cells?.map((c) => c.tag)) }],
    notebooks: [{ title: "notebook (present)", entries: pages.map((key) => ({ key: String(key), value: "yes" })) }],
    ...extra,
  };
}

function solve(nums: number[]): { best: number; run: number[] } {
  const values = new Set(nums);
  let best = 0;
  let run: number[] = [];
  for (const value of unique(nums)) {
    if (values.has(value - 1)) continue;
    const chain = [value];
    while (values.has(chain[chain.length - 1] + 1)) chain.push(chain[chain.length - 1] + 1);
    if (chain.length > best) {
      best = chain.length;
      run = chain;
    }
  }
  return { best, run };
}

function firstNonHead(nums: number[]): number | null {
  const values = new Set(nums);
  for (let i = 0; i < nums.length; i++) {
    if (values.has(nums[i] - 1)) return i;
  }
  return null;
}

function pictureFrames(nums: number[], solved: { best: number; run: number[] }): Frame[] {
  const set = new Set(nums);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "Each box is a number. A chain is consecutive values, not consecutive seats.",
      state: picture(nums, [], () => null),
    },
  ];
  if (solved.run.length) {
    const inRun = new Set(solved.run);
    frames.push({
      scene: "picture",
      caption: `The chain ${solved.run.join(", ")} is allowed. Its length is ${solved.best}.`,
      state: picture(nums, set, (index) => (inRun.has(nums[index]) ? "done" : "faded")),
    });
  }
  const skip = firstNonHead(nums);
  if (skip !== null) {
    frames.push({
      scene: "picture",
      caption: `${nums[skip]} is not a head: ${nums[skip] - 1} is also present, so a chain should not start here.`,
      state: picture(nums, set, (index) => (index === skip ? "miss" : nums[index] === nums[skip] - 1 ? "hit" : null), {
        ghost: { row: 0, col: skip, label: "✕ not a head" },
      }),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the length of the longest chain.",
    state: picture(nums, set, (index) => (solved.run.includes(nums[index]) ? "done" : null)),
  });
  return frames;
}

function slowFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [];
  const values = new Set(nums);
  let steps = 0;
  let shown = 0;
  for (const start of unique(nums)) {
    let length = 1;
    while (values.has(start + length)) {
      length += 1;
      steps += 1;
    }
    steps += 1;
    if (shown < 3) {
      shown += 1;
      frames.push({
        scene: "slow",
        caption:
          shown === 1
            ? `The slow way: from every value, walk the chain forward. From ${start} that is ${length} step${length === 1 ? "" : "s"}.`
            : `From ${start}, walk forward again. That is ${length}. We re-walk values we already counted.`,
        state: picture(nums, values, (index) => (nums[index] >= start && nums[index] < start + length ? "window" : "faded"), {
          counter: { label: "steps", value: steps },
        }),
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `Starting at every value took ${steps} steps on ${nums.length} boxes. This is O(n²) time when one long chain is re-walked.`,
    state: picture(nums, values, () => "faded", { counter: { label: "steps", value: steps } }),
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const skip = firstNonHead(nums);
  const values = new Set(nums);
  const at = skip ?? 0;
  return [
    {
      scene: "insight",
      caption: "Put every value in a notebook of presence. A chain has one head: the value whose neighbour below is missing.",
      state: picture(nums, values, () => "window"),
    },
    {
      scene: "insight",
      caption:
        skip !== null
          ? `${nums[at]} is not a head, because ${nums[at] - 1} is in the notebook. Starting here is the Every-Start Trap.`
          : "Only a head starts a walk. Starting at every value is the Every-Start Trap.",
      state: picture(nums, values, (index) => (index === at ? "miss" : nums[index] === nums[at] - 1 ? "hit" : null), {
        ghost: { row: 0, col: at, label: "✕ not a head" },
        banner: { text: "Every-Start Trap", tone: "coral" },
      }),
    },
    {
      scene: "insight",
      caption: "Walk forward only from a head. Each value is then visited at most once.",
      state: picture(nums, values, (index) => (values.has(nums[index] - 1) ? "faded" : "done")),
    },
  ];
}

function skipQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "The neighbour below is already in the notebook. What do we do?",
    options: ["Start a chain here and walk forward", "Skip it. Only a head starts a chain"],
    answer: 1,
    why: "Only a head starts a chain. Starting here is the Every-Start Trap and re-walks the same values.",
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const values = new Set(nums);
  const line = (index: number) => (practice ? undefined : index);
  let best = 0;
  let askedSkip = false;
  let askedHead = false;
  const solved = solve(nums);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}]. You decide which values are heads.`
      : "Fill the notebook with every value, then walk only from heads.",
    codeLine: line(0),
    state: picture(nums, values, () => "window"),
  });

  for (const value of unique(nums)) {
    const at = nums.indexOf(value);
    const isHead = !values.has(value - 1);
    if (!isHead) {
      const predAt = nums.findIndex((item) => item === value - 1);
      const skipFrame: Frame = {
        scene,
        caption: `${value} has ${value - 1} in the notebook, so it is not a head.`,
        codeLine: line(4),
        state: picture(nums, values, (index) => (index === at ? "miss" : index === predAt ? "hit" : "faded"), {
          ghost: { row: 0, col: at, label: "✕ not a head" },
          banner: { text: "Every-Start Trap", tone: "coral" },
        }),
      };
      if ((practice || !askedSkip) && predAt >= 0) {
        askedSkip = true;
        skipFrame.quiz = skipQuiz();
      }
      frames.push(skipFrame);
      frames.push({
        scene,
        caption: `The Every-Start Trap: do not walk from ${value}. Skip it. Only a head starts a chain.`,
        codeLine: line(4),
        state: picture(nums, values, (index) => (index === at ? "faded" : index === predAt ? "hit" : null)),
      });
      continue;
    }

    const look: Frame = {
      scene,
      caption: `${value} has no neighbour below. It is a head.`,
      codeLine: line(4),
      state: picture(nums, values, (index) => (index === at ? "edge" : null)),
    };
    if (practice && !askedHead) {
      askedHead = true;
      look.quiz = {
        kind: "choice",
        question: "The neighbour below is missing. What do we do with this value?",
        options: ["Skip it", "Start a chain and walk forward"],
        answer: 1,
        why: "A missing neighbour below means this value is a head. Walk forward from here.",
      };
    }
    frames.push(look);

    const chain = [value];
    while (values.has(chain[chain.length - 1] + 1)) chain.push(chain[chain.length - 1] + 1);
    const inChain = new Set(chain);
    if (chain.length > best) best = chain.length;
    frames.push({
      scene,
      caption: `Walk the chain ${chain.join(", ")}. Length ${chain.length}. Best is ${best}.`,
      codeLine: line(6),
      state: picture(nums, values, (index) => (inChain.has(nums[index]) ? "done" : "faded"), {
        counter: { label: "best chain", value: best },
      }),
    });
  }

  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${solved.best}. You picked the heads.`
      : `Every head was walked once. The answer is ${solved.best}.`,
    codeLine: line(9),
    state: picture(nums, values, (index) => (solved.run.includes(nums[index]) ? "done" : "faded")),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each value is written once, and each value is walked at most once from a head.`,
      codeLine: 3,
      state: picture(nums, values, () => "faded", { counter: { label: "values visited", value: values.size } }),
    });
    frames.push({
      scene,
      caption: `Space: O(n). The notebook holds the unique values.`,
      codeLine: 0,
      state: picture(nums, values, () => "faded"),
    });
  }
  return frames;
}

export const longestConsecutiveStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-128"],
  pattern: "Hash set",
  trigger: "longest run of consecutive integers, and the values need not sit next to each other in the array",
  insight: "A notebook of presence. Only start a chain at a head — a value whose neighbour below is missing — then walk forward.",
  metaphor: {
    name: "The chain",
    legend: "head = value with value-1 missing · chain = consecutive walk · notebook = set",
    terms: ["chain", "head", "notebook"],
  },
  traps: [
    {
      name: "The Every-Start Trap",
      rule: "Do not walk forward from every value. Only a head starts a chain, or the same chain is re-walked.",
    },
  ],
  template: [
    "put every value in a notebook;",
    "for each value {",
    "    if value-1 is present, skip;",
    "    else walk value+1, value+2, … and keep the best length;",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each value is inserted once and walked at most once from a start",
    space: "O(n)",
    spaceWhy: "the notebook holds the unique values",
  },
  code: CODE,
  examples: [
    { label: "[100,4,200,1,3,2]", input: "[100,4,200,1,3,2]", expected: "4" },
    { label: "[1,2,0,1]", input: "[1,2,0,1]", expected: "3" },
    { label: "[1]", input: "[1]", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-41", title: "First Missing Positive" },
    { slug: "lc-268", title: "Missing Number" },
    { slug: "missing-range-value", title: "Missing Range Value" },
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
        state: picture(nums, new Set(nums), (index) => (solved.run.includes(nums[index]) ? "done" : "faded")),
      },
    ];
  },
  View: GrokNotebookView,
};
