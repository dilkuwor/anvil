import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokJumpView, type GrokJumpState } from "../grok-jump-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokJumpState>;

const PRACTICE = "[1,2,3]";

const CODE = [
  "int jumps = 0;",
  "int currentEnd = 0;",
  "int farthest = 0;",
  "for (int i = 0; i < nums.length - 1; i++) {",
  "    farthest = Math.max(farthest, i + nums[i]);",
  "    if (i == currentEnd) {",
  "        jumps++;",
  "        currentEnd = farthest;",
  "    }",
  "}",
  "return jumps;",
];

function parse(raw: string): number[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return [];
  return inner.split(/[,\s]+/).filter(Boolean).map(Number);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[]): GrokJumpState {
  return { nums, tones: tones(nums.length, () => null), here: null, reach: null, rangeEnd: null, jumps: null, hopTo: null, trapAt: null, canReach: null, note: null, trapNote: null, counter: null };
}

function solve(nums: number[]): number {
  let jumps = 0;
  let currentEnd = 0;
  let farthest = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);
    if (i === currentEnd) {
      jumps++;
      currentEnd = farthest;
    }
  }
  return jumps;
}

function pictureFrames(nums: number[]): Frame[] {
  const jumps = solve(nums);
  const last = nums.length - 1;
  return [
    { scene: "picture", caption: "Each box is how far you may jump from that spot. You start at the first box.", state: blank(nums) },
    {
      scene: "picture",
      caption: `From the first box you may land as far as box ${Math.min(last, nums[0])}. The end is always reachable.`,
      state: { ...blank(nums), here: 0, hopTo: Math.min(last, nums[0]), reach: Math.min(last, nums[0]), tones: tones(nums.length, (i) => (i === 0 ? "edge" : i <= Math.min(last, nums[0]) ? "window" : null)) },
    },
    {
      scene: "picture",
      caption: "Jumping from every box is not the goal. We want the fewest jumps, not a hop at each index.",
      state: { ...blank(nums), trapAt: 1, trapNote: "not a jump at every box", tones: tones(nums.length, (i) => (i > 0 && i < last ? "miss" : null)) },
    },
    {
      scene: "picture",
      caption: `The goal: the fewest jumps to the last box. Here that number is ${jumps}.`,
      state: { ...blank(nums), jumps, reach: last, tones: tones(nums.length, (i) => (i === last ? "done" : null)) },
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const need = Array.from({ length: n }, () => n);
  need[0] = 0;
  let writes = 0;
  const frames: Frame[] = [];
  for (let i = 0; i < n; i++) {
    const far = Math.min(n - 1, i + nums[i]);
    for (let j = i + 1; j <= far; j++) {
      writes++;
      need[j] = Math.min(need[j], need[i] + 1);
    }
    if (i < 3) {
      frames.push({
        scene: "slow",
        caption: i === 0
          ? `The slow way: from each box, write a jump count onto every landing. From box 0 we cover through ${far}.`
          : `Go back to box ${i} and rewrite landings you may already have filled.`,
        state: { ...blank(nums), here: i, hopTo: far, reach: far, counter: { label: "landings written", value: String(writes) } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We wrote ${writes} landings for a row of ${n}. This is O(n²) time: later boxes get rewritten.`,
    state: { ...blank(nums), jumps: need[n - 1], tones: tones(n, () => "faded"), counter: { label: "landings written", value: String(writes) } },
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const firstEnd = Math.min(nums.length - 1, nums[0] ?? 0);
  return [
    {
      scene: "insight",
      caption: `Picture a flood. The boxes you can reach with one jump are one range, here through box ${firstEnd}.`,
      state: { ...blank(nums), here: 0, reach: firstEnd, rangeEnd: firstEnd, tones: tones(nums.length, (i) => (i <= firstEnd ? "window" : null)) },
    },
    {
      scene: "insight",
      caption: "Walk that range and remember the farthest landing. Count one jump only when the range ends.",
      state: { ...blank(nums), here: 0, reach: firstEnd, rangeEnd: firstEnd, jumps: 1, note: "one range, one jump" },
    },
    {
      scene: "insight",
      caption: "The Every Index Trap would count a jump at every box. The flood counts a jump per range, not per box.",
      state: { ...blank(nums), trapAt: 1, trapNote: "The Every Index Trap", jumps: nums.length - 1 },
    },
  ];
}

function fenceQuiz(cells: number, farthest: number): StoryQuiz {
  const answer = Math.min(cells - 1, farthest);
  const feedback: Record<number, string> = {};
  for (let i = 0; i < cells; i++) {
    if (i === answer) continue;
    feedback[i] = i < answer ? "The flood can still reach past this box. The fence sits at the farthest landing." : "That box is past what this range can see.";
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "This range just ended. Where does the new range fence sit? Click that box.",
    answer,
    feedback,
    otherwise: "The fence moves to the farthest landing the flood has seen.",
    why: "One range is one jump. The new fence is the farthest index seen while walking the old range.",
  };
}

function everyIndexQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "We are still inside the current range. Do we count a jump here?",
    options: ["Yes, jump from every box we stand on", "No, wait until this range ends"],
    answer: 1,
    why: "The Every Index Trap counts a jump at every index. One range is one jump.",
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = nums.length;
  let jumps = 0;
  let currentEnd = 0;
  let farthest = 0;
  let askedFence = false;
  let askedWait = false;
  let showedTrap = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: [${nums.join(",")}]. You count the jumps.` : "The flood starts at box 0. Jumps 0, range end 0, farthest 0.",
    codeLine: line(2),
    state: { ...blank(nums), here: 0, rangeEnd: 0, reach: 0, jumps: 0 },
  });

  for (let i = 0; i < n - 1; i++) {
    frames.push({
      scene,
      caption: `Stand on box ${i}. From here the landing can reach box ${i + nums[i]}.`,
      codeLine: line(4),
      state: { ...blank(nums), here: i, hopTo: Math.min(n - 1, i + nums[i]), reach: Math.max(farthest, i + nums[i]), rangeEnd: currentEnd, jumps, tones: tones(n, (j) => (j === i ? "edge" : j <= currentEnd ? "window" : null)) },
    });
    farthest = Math.max(farthest, i + nums[i]);
    if (i === currentEnd) {
      const quiz: Frame = {
        scene,
        caption: `The flood has walked to the end of this range.`,
        codeLine: line(5),
        state: { ...blank(nums), here: i, reach: farthest, rangeEnd: currentEnd, jumps, hopTo: Math.min(n - 1, farthest) },
      };
      if (practice || !askedFence) {
        askedFence = true;
        quiz.quiz = fenceQuiz(n, farthest);
      }
      frames.push(quiz);
      jumps++;
      currentEnd = farthest;
      frames.push({
        scene,
        caption: `Count one jump. The new range fence sits at box ${Math.min(n - 1, currentEnd)}. Jumps = ${jumps}.`,
        codeLine: line(6),
        state: { ...blank(nums), here: i, reach: farthest, rangeEnd: currentEnd, jumps, tones: tones(n, (j) => (j <= currentEnd ? "done" : null)) },
      });
    } else {
      const wait: Frame = {
        scene,
        caption: `Still inside the current range. The farthest landing so far is box ${Math.min(n - 1, farthest)}.`,
        codeLine: line(4),
        state: { ...blank(nums), here: i, reach: farthest, rangeEnd: currentEnd, jumps },
      };
      if (practice || !askedWait) {
        askedWait = true;
        wait.quiz = everyIndexQuiz();
      }
      frames.push(wait);
      if (!showedTrap && !practice) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The Every Index Trap! Counting a jump here would treat every box as its own range.`,
          codeLine: line(5),
          state: { ...blank(nums), here: i, trapAt: i, reach: farthest, rangeEnd: currentEnd, jumps, trapNote: "The Every Index Trap" },
        });
      }
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${jumps}. You counted each range.` : `The walk stops before the last box, so we do not count a jump after arriving. The answer is ${jumps}.`,
    codeLine: line(10),
    state: { ...blank(nums), jumps, reach: n - 1, tones: tones(n, (i) => (i === n - 1 ? "done" : "faded")) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${n} boxes was read once.`,
      codeLine: 3,
      state: { ...blank(nums), jumps, reach: n - 1, counter: { label: "boxes read", value: String(n) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only jumps, the range end, and the farthest landing are stored.",
      codeLine: 0,
      state: { ...blank(nums), jumps, counter: { label: "numbers stored", value: "3" } },
    });
  }
  return frames;
}

export const jumpGameTwoStory: ProblemStory<GrokJumpState> = {
  slugs: ["lc-45"],
  pattern: "Greedy jump range",
  trigger: "each index names a jump length, the end is always reachable, and you want the fewest jumps",
  insight: "A flood. The boxes you can reach with k jumps are one range. Count a jump when that range ends, and move the fence to the farthest landing.",
  metaphor: { name: "The flood", legend: "range = currentEnd · farthest landing = farthest · here = i · jumps = ranges closed", terms: ["flood", "range", "landing", "jump"] },
  traps: [
    {
      name: "The Every Index Trap",
      rule: "One range is one jump. Count it when you finish the range, not at every index.",
    },
  ],
  template: [
    "jumps = 0, currentEnd = 0, farthest = 0",
    "for i from 0 to last-1:",
    "    farthest = max(farthest, i + nums[i])",
    "    if i == currentEnd: jumps++, currentEnd = farthest",
    "return jumps",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each index is read once",
    space: "O(1)",
    spaceWhy: "only jumps, currentEnd, and farthest are stored",
  },
  code: CODE,
  examples: [
    { label: "[2,1,1]", input: "[2,1,1]", expected: "1" },
    { label: "[1,2,1]", input: "[1,2,1]", expected: "2", note: "Must jump twice. Counting every index would overcount." },
    { label: "[2,3,1,1,4]", input: "[2,3,1,1,4]", expected: "2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-55", title: "Jump Game" },
    { slug: "lc-134", title: "Gas Station" },
    { slug: "lc-763", title: "Partition Labels" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const jumps = solve(nums);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums), jumps, reach: nums.length - 1, tones: tones(nums.length, (i) => (i === nums.length - 1 ? "done" : null)) },
      },
    ];
  },
  View: GrokJumpView,
};
