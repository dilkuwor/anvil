import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokJumpView, type GrokJumpState } from "../grok-jump-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokJumpState>;

const PRACTICE = "[1,0,2]";

const CODE = [
  "int reach = 0;",
  "for (int i = 0; i < nums.length; i++) {",
  "    if (i > reach) return false;",
  "    reach = Math.max(reach, i + nums[i]);",
  "}",
  "return true;",
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

function solve(nums: number[]): boolean {
  let reach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;
    reach = Math.max(reach, i + nums[i]);
  }
  return true;
}

function pictureFrames(nums: number[]): Frame[] {
  const ok = solve(nums);
  const last = nums.length - 1;
  return [
    { scene: "picture", caption: "Each box is how far you may jump from that spot. You only need to know if the last box is reachable.", state: blank(nums) },
    {
      scene: "picture",
      caption: `From the first box the flood can cover through box ${Math.min(last, nums[0])}.`,
      state: { ...blank(nums), here: 0, reach: Math.min(last, nums[0]), hopTo: Math.min(last, nums[0]), tones: tones(nums.length, (i) => (i <= Math.min(last, nums[0]) ? "window" : null)) },
    },
    ok
      ? {
          scene: "picture",
          caption: "A later box may not stretch the flood if we never stood on it. Only a box already in reach may help.",
          state: { ...blank(nums), reach: last, canReach: true, tones: tones(nums.length, (i) => (i === last ? "done" : "window")) },
        }
      : {
          scene: "picture",
          caption: "A box past the flood cannot help. Letting it stretch reach would hide a gap.",
          state: { ...blank(nums), trapAt: last, trapNote: "past the flood", canReach: false, tones: tones(nums.length, (i) => (i === last ? "miss" : null)) },
        },
    {
      scene: "picture",
      caption: ok ? "The goal: whether the last box sits inside the flood. Here it does." : "The goal: whether the last box sits inside the flood. Here it does not.",
      state: { ...blank(nums), canReach: ok, reach: ok ? last : null, tones: tones(nums.length, (i) => (ok && i === last ? "done" : !ok && i === last ? "miss" : null)) },
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const ok = Array.from({ length: n }, () => false);
  ok[n - 1] = true;
  let looks = 0;
  const frames: Frame[] = [];
  for (let i = n - 2; i >= 0; i--) {
    const far = Math.min(n - 1, i + nums[i]);
    for (let j = i + 1; j <= far; j++) {
      looks++;
      if (ok[j]) {
        ok[i] = true;
        break;
      }
    }
    if (frames.length < 3) {
      frames.push({
        scene: "slow",
        caption: i === n - 2
          ? `The slow way: walk backwards. A box is good if it can land on a later good box.`
          : `Check box ${i} against later boxes we already marked.`,
        state: { ...blank(nums), here: i, hopTo: far, tones: tones(n, (j) => (ok[j] ? "done" : j === i ? "window" : "faded")), counter: { label: "landings checked", value: String(looks) } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We checked ${looks} landings walking backwards. This is O(n²) time. The first box is ${ok[0] ? "good" : "stuck"}.`,
    state: { ...blank(nums), canReach: ok[0], tones: tones(n, (j) => (ok[j] ? "done" : "faded")), counter: { label: "landings checked", value: String(looks) } },
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  let reach = 0;
  let gap: number | null = null;
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) {
      gap = i;
      break;
    }
    reach = Math.max(reach, i + nums[i]);
  }
  return [
    {
      scene: "insight",
      caption: "Picture a flood that stretches as far as any box you already stood on can jump.",
      state: { ...blank(nums), here: 0, reach: Math.min(nums.length - 1, nums[0] ?? 0), tones: tones(nums.length, (i) => (i <= Math.min(nums.length - 1, nums[0] ?? 0) ? "window" : null)) },
    },
    {
      scene: "insight",
      caption: gap === null
        ? "If you finish the row without standing past the flood, the end is reachable."
        : `If you ever stand past the flood, you are stuck. Box ${gap} sits past reach.`,
      state: { ...blank(nums), here: gap, reach: gap === null ? Math.min(nums.length - 1, reach) : reach, trapAt: gap, canReach: gap === null, tones: tones(nums.length, (i) => (gap !== null && i === gap ? "miss" : i <= reach ? "window" : null)) },
    },
    {
      scene: "insight",
      caption: "The Unreachable Trap: a box past the flood must not stretch reach. Check the gap first.",
      state: { ...blank(nums), trapAt: gap ?? nums.length - 1, trapNote: "The Unreachable Trap", canReach: gap === null },
    },
  ];
}

function stretchQuiz(cells: number, landing: number): StoryQuiz {
  const answer = Math.min(cells - 1, landing);
  const feedback: Record<number, string> = {};
  for (let i = 0; i < cells; i++) {
    if (i === answer) continue;
    feedback[i] = i < answer ? "The flood already covers this box. Stretch to the farthest landing from here." : "This box is past what this jump can cover.";
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "This box is in reach. How far can it stretch the flood? Click the farthest landing.",
    answer,
    feedback,
    otherwise: "Stretch the flood to the farthest box this jump can cover.",
    why: "A box already in the flood may stretch reach to here plus its jump length.",
  };
}

function gapQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "This box sits past the flood. May it stretch how far we can reach?",
    options: ["Yes, always update reach from the box we stand on", "No, we are stuck. A box past the flood cannot help"],
    answer: 1,
    why: "The Unreachable Trap would let a later box hide a gap. If you stand past reach, return false first.",
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = nums.length;
  let reach = 0;
  let askedStretch = false;
  let askedGap = false;
  let showedTrap = false;
  let stuck = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: [${nums.join(",")}]. You decide if a box may stretch the flood.` : "The flood starts at box 0. Reach is 0 before we stand there.",
    codeLine: line(0),
    state: { ...blank(nums), here: 0, reach: 0 },
  });

  for (let i = 0; i < n; i++) {
    if (i > reach) {
      const gap: Frame = {
        scene,
        caption: `Box ${i} sits past the flood, which only covers through box ${reach}.`,
        codeLine: line(2),
        state: { ...blank(nums), here: i, reach, trapAt: i, canReach: false, tones: tones(n, (j) => (j === i ? "miss" : j <= reach ? "window" : "faded")) },
      };
      if (practice || !askedGap) {
        askedGap = true;
        gap.quiz = gapQuiz();
      }
      frames.push(gap);
      if (!showedTrap) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The Unreachable Trap! Letting box ${i} stretch reach would hide this gap. We are stuck.`,
          codeLine: line(2),
          state: { ...blank(nums), here: i, reach, trapAt: i, trapNote: "The Unreachable Trap", canReach: false, hopTo: Math.min(n - 1, i + nums[i]) },
        });
      }
      stuck = true;
      break;
    }
    const landing = i + nums[i];
    const look: Frame = {
      scene,
      caption: `Stand on box ${i}. It is inside the flood.`,
      codeLine: line(2),
      state: { ...blank(nums), here: i, reach, hopTo: Math.min(n - 1, landing), tones: tones(n, (j) => (j === i ? "edge" : j <= reach ? "window" : null)) },
    };
    if ((practice || !askedStretch) && landing > reach) {
      askedStretch = true;
      look.quiz = stretchQuiz(n, landing);
    }
    frames.push(look);
    reach = Math.max(reach, landing);
    frames.push({
      scene,
      caption: `Stretch the flood through box ${Math.min(n - 1, reach)}.`,
      codeLine: line(3),
      state: { ...blank(nums), here: i, reach, hopTo: Math.min(n - 1, landing), tones: tones(n, (j) => (j <= Math.min(n - 1, reach) ? "done" : null)) },
    });
  }

  const ok = !stuck;
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${ok}. You guarded the gap.` : ok ? `The walk finished the row. The answer is true.` : `The walk hit a gap. The answer is false.`,
    codeLine: line(ok ? 5 : 2),
    state: { ...blank(nums), canReach: ok, reach: Math.min(n - 1, reach), tones: tones(n, (i) => (ok && i === n - 1 ? "done" : !ok && i > reach ? "miss" : i <= reach ? "window" : "faded")) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each box is read once, and we can stop early at a gap.`,
      codeLine: 1,
      state: { ...blank(nums), canReach: ok, counter: { label: "boxes read", value: String(ok ? n : Math.min(n, reach + 2)) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the farthest reach is stored.",
      codeLine: 0,
      state: { ...blank(nums), canReach: ok, counter: { label: "numbers stored", value: "1" } },
    });
  }
  return frames;
}

export const jumpGameStory: ProblemStory<GrokJumpState> = {
  slugs: ["lc-55"],
  pattern: "Greedy farthest reach",
  trigger: "each index names a jump length, and you only need to know if the last index is reachable",
  insight: "A flood that stretches as far as any box you already stood on can jump. If you ever stand past that flood, you are stuck.",
  metaphor: { name: "The flood", legend: "reach = farthest index already in the flood · here = i · gap = a box past reach", terms: ["flood", "reach", "gap", "jump"] },
  traps: [
    {
      name: "The Unreachable Trap",
      rule: "If a box sits past reach, return false first. A later box must not stretch the flood for you.",
    },
  ],
  template: [
    "reach = 0",
    "for each box i:",
    "    if i is past reach: return false",
    "    reach = max(reach, i + jump)",
    "return true",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each index is read once",
    space: "O(1)",
    spaceWhy: "only reach is stored",
  },
  code: CODE,
  examples: [
    { label: "[2,0,0]", input: "[2,0,0]", expected: "true" },
    { label: "[3,2,1,0,4]", input: "[3,2,1,0,4]", expected: "false", note: "The last box must not stretch reach." },
    { label: "[2,3,1,1,4]", input: "[2,3,1,1,4]", expected: "true" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-45", title: "Jump Game II" },
    { slug: "lc-134", title: "Gas Station" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const ok = solve(nums);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(nums), canReach: ok, reach: ok ? nums.length - 1 : null },
      },
    ];
  },
  View: GrokJumpView,
};
