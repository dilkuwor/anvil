import type { CellTone } from "@/components/learn/viz/primitives";

import { DequeWindowView, type DequeWindowState } from "../grok-deque-window-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DequeWindowState>;

/** Fresh row. The first max slides out of the frame; storing the score 5 would hide that. */
const PRACTICE = "nums=[5,3,2] k=2";

const CODE = [
  "if (nums.length == 0 || k == 0) return new int[0];",
  "int[] out = new int[nums.length - k + 1];",
  "Deque<Integer> window = new ArrayDeque<>();",
  "for (int i = 0; i < nums.length; i++) {",
  "    while (!window.isEmpty() && window.peekFirst() <= i - k) window.pollFirst();",
  "    while (!window.isEmpty() && nums[window.peekLast()] <= nums[i]) window.pollLast();",
  "    window.addLast(i);",
  "    if (i >= k - 1) out[i - k + 1] = nums[window.peekFirst()];",
  "}",
  "return out;",
];

function parse(raw: string): { nums: number[]; k: number } {
  const inner = raw.match(/nums\s*=\s*\[([^\]]*)\]/)?.[1] ?? "";
  const nums = inner.split(/[,\s]+/).filter(Boolean).map(Number);
  const k = Number(raw.match(/k\s*=\s*(-?\d+)/)?.[1] ?? "0");
  return { nums, k };
}

function format(out: number[]): string {
  return `[${out.join(",")}]`;
}

function solve(nums: number[], k: number): number[] {
  if (nums.length === 0 || k === 0) return [];
  const out: number[] = [];
  for (let start = 0; start + k <= nums.length; start++) {
    let max = nums[start];
    for (let j = start + 1; j < start + k; j++) max = Math.max(max, nums[j]);
    out.push(max);
  }
  return out;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function range(from: number, to: number, tone: CellTone) {
  return (index: number) => (index >= from && index <= to ? tone : null);
}

function blank(nums: number[], k: number, outLen?: number): DequeWindowState {
  const windows = Math.max(nums.length - k + 1, 0);
  return {
    values: nums,
    tones: tones(nums.length, () => null),
    here: null,
    frameLeft: null,
    frameRight: null,
    line: [],
    out: Array.from({ length: outLen ?? windows }, () => null),
  };
}

function pictureFrames(nums: number[], k: number, answer: number[]): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Each bar is a number. A frame of ${k} neighbour${k === 1 ? "" : "s"} slides from left to right.`,
      state: blank(nums, k),
    },
  ];
  if (answer.length === 0) {
    frames.push({
      scene: "picture",
      caption: "No frame fits. The answer is an empty list.",
      state: blank(nums, k, 0),
    });
    frames.push({ scene: "picture", caption: "The goal: the max of every frame, in order.", state: blank(nums, k, 0) });
    return frames;
  }
  frames.push({
    scene: "picture",
    caption: `The first frame is [${nums.slice(0, k).join(",")}], and its max is ${answer[0]}.`,
    state: {
      ...blank(nums, k),
      frameLeft: 0,
      frameRight: k - 1,
      tones: tones(nums.length, range(0, k - 1, "window")),
      out: answer.map((value, index) => (index === 0 ? value : null)),
    },
  });
  if (answer.length > 1) {
    frames.push({
      scene: "picture",
      caption: `When the frame slides, the old left bar leaves. The new max is not always the new bar.`,
      state: {
        ...blank(nums, k),
        frameLeft: 1,
        frameRight: k,
        tones: tones(nums.length, (index) => (index === 0 ? "faded" : range(1, k, "window")(index))),
        out: answer.map((value, index) => (index <= 1 ? value : null)),
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the max of every frame. Here that list is ${format(answer)}.`,
    state: {
      ...blank(nums, k),
      frameLeft: nums.length - k,
      frameRight: nums.length - 1,
      tones: tones(nums.length, range(nums.length - k, nums.length - 1, "done")),
      out: answer,
    },
  });
  return frames;
}

function slowFrames(nums: number[], k: number, answer: number[]): Frame[] {
  const frames: Frame[] = [];
  let total = 0;
  const out: (number | null)[] = answer.map(() => null);
  for (let start = 0; start + k <= nums.length; start++) {
    let max = nums[start];
    for (let j = start; j < start + k; j++) {
      total++;
      max = Math.max(max, nums[j]);
    }
    out[start] = max;
    if (start > 2) continue;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: stand on each frame and read all ${k} bars. This frame's max is ${max}.`
          : `Go back, stand on the next frame, and read those ${k} bars again. Max ${max}.`,
      state: {
        ...blank(nums, k),
        frameLeft: start,
        frameRight: start + k - 1,
        tones: tones(nums.length, range(start, start + k - 1, "window")),
        out: [...out],
        counter: { label: "bars read", value: total },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That read ${total} bars for a row of ${nums.length}. This is O(nk) time: every frame re-reads bars we already saw.`,
    state: { ...blank(nums, k), out: answer, tones: tones(nums.length, () => "faded"), counter: { label: "bars read", value: total } },
  });
  return frames;
}

function firstExpire(nums: number[], k: number): { i: number; gone: number } | null {
  const line: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    const gone = line[0];
    if (gone !== undefined && gone <= i - k) return { i, gone };
    while (line.length && nums[line[line.length - 1]] <= nums[i]) line.pop();
    line.push(i);
  }
  return null;
}

function insightFrames(nums: number[], k: number, answer: number[]): Frame[] {
  const expire = firstExpire(nums, k);
  const firstMaxAt = nums.indexOf(answer[0] ?? nums[0]);
  return [
    {
      scene: "insight",
      caption: `Picture a sliding frame of ${k}, and a champion line of seat numbers. The front of the line is the max.`,
      state: {
        ...blank(nums, k),
        frameLeft: 0,
        frameRight: Math.min(k - 1, nums.length - 1),
        here: Math.min(k - 1, nums.length - 1),
        line: [firstMaxAt],
        tones: tones(nums.length, range(0, Math.min(k - 1, nums.length - 1), "window")),
      },
    },
    {
      scene: "insight",
      caption: expire
        ? `The Value Trap! If the line stored the score ${nums[expire.gone]} instead of seat ${expire.gone}, we could not tell when that bar left the frame.`
        : `A smaller bar behind a bigger new one can never be a later max, so it leaves the back of the line.`,
      state: expire
        ? {
            ...blank(nums, k),
            frameLeft: expire.i - k + 1,
            frameRight: expire.i,
            here: expire.i,
            line: [expire.gone],
            trapValues: [nums[expire.gone]],
            tones: tones(nums.length, (index) => (index === expire.gone ? "miss" : range(expire.i - k + 1, expire.i, "window")(index))),
          }
        : {
            ...blank(nums, k),
            frameLeft: 0,
            frameRight: Math.min(k - 1, nums.length - 1),
            line: [firstMaxAt],
            tones: tones(nums.length, range(0, Math.min(k - 1, nums.length - 1), "done")),
          },
    },
    {
      scene: "insight",
      caption: `So the line stores seats, not scores. Drop the front when its seat has left the frame. The head never walks back.`,
      state: {
        ...blank(nums, k),
        frameLeft: 0,
        frameRight: Math.min(k - 1, nums.length - 1),
        line: [firstMaxAt],
        out: answer.map((value, index) => (index === 0 ? value : null)),
        tones: tones(nums.length, range(0, Math.min(k - 1, nums.length - 1), "done")),
      },
    },
  ];
}

function expireQuiz(cells: number, gone: number, here: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (here !== gone) feedback[here] = `That bar just arrived. The one that left is on the other side of the frame.`;
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `The frame just slid. Which seat is no longer inside the frame? Click that bar.`,
    answer: gone,
    feedback,
    otherwise: `Look at the bar that the frame just uncovered on the left.`,
    why: `The frame is k wide. The seat that used to be at the left has left, so the front of the line must drop it.`,
  };
}

function solutionFrames(nums: number[], k: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const lineFn = (index: number) => (practice ? undefined : index);
  const windows = Math.max(nums.length - k + 1, 0);
  const out: (number | null)[] = Array.from({ length: windows }, () => null);
  const line: number[] = [];
  let askedExpire = false;
  let askedBack = false;
  let showedTrap = false;
  let quiet = 0;

  const paint = (here: number): CellTone[] => {
    const left = here >= k - 1 ? here - k + 1 : 0;
    return tones(nums.length, (index) => (index < left ? "faded" : index === here ? "edge" : range(left, here, "window")(index)));
  };
  const base = (here: number | null): DequeWindowState => ({
    values: nums,
    tones: here === null ? tones(nums.length, () => null) : paint(here),
    here,
    frameLeft: here === null ? null : here >= k - 1 ? here - k + 1 : 0,
    frameRight: here,
    line: [...line],
    out: [...out],
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(",")}], frame ${k} wide. You decide who leaves the line.`
      : `The champion line starts empty. The frame is ${k} wide.`,
    codeLine: lineFn(2),
    state: base(null),
  });

  for (let i = 0; i < nums.length; i++) {
    const expire = line.length > 0 && line[0] <= i - k;
    const gone = expire ? line[0] : null;
    if (expire) {
      const clash: Frame = {
        scene,
        caption: `The head is at ${nums[i]}. The frame just slid. Look at the front of the line: has that seat left the frame?`,
        codeLine: lineFn(4),
        state: base(i),
      };
      if (practice || !askedExpire) {
        askedExpire = true;
        clash.quiz = expireQuiz(nums.length, line[0], i);
      }
      frames.push(clash);
      if (!showedTrap) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The Value Trap! A line of scores would still show ${nums[line[0]]}, with no way to know that bar has left the frame.`,
          codeLine: lineFn(4),
          state: { ...base(i), trapValues: line.map((seat) => nums[seat]), tones: tones(nums.length, (index) => (index === line[0] ? "miss" : paint(i)[index])) },
        });
      }
      line.shift();
      frames.push({
        scene,
        caption: `Drop seat ${gone} from the front. The line stores seats, so we knew it was time.`,
        codeLine: lineFn(4),
        state: base(i),
      });
    }

    const popped: number[] = [];
    while (line.length && nums[line[line.length - 1]] <= nums[i]) {
      popped.push(line.pop() as number);
    }
    if (popped.length && (practice || !askedBack || popped.length > 1)) {
      if (practice || !askedBack) {
        askedBack = true;
        const back = popped[0];
        const quiz: Frame = {
          scene,
          caption: `The head is ${nums[i]}. A seat at the back of the line is no taller than this new bar.`,
          codeLine: lineFn(5),
          state: { ...base(i), line: [...line, back] },
        };
        quiz.quiz = {
          kind: "cell",
          cells: nums.length,
          numbered: true,
          question: `A new bar is at least as tall as the back of the line. Which seat leaves the back? Click that bar.`,
          answer: back,
          feedback: { [i]: `That is the new bar. It is about to join. The shorter one at the back leaves first.` },
          otherwise: `The back of the line leaves when it is no taller than the new bar.`,
          why: `A shorter older bar can never be the max after a taller newer one arrives.`,
        };
        frames.push(quiz);
      }
      frames.push({
        scene,
        caption: `Those shorter seats leave the back. They can never beat ${nums[i]} later.`,
        codeLine: lineFn(5),
        state: base(i),
      });
    } else if (popped.length) {
      // already asked; still show one combined drop
      frames.push({
        scene,
        caption: `Shorter seats at the back leave. The head ${nums[i]} is the better champion.`,
        codeLine: lineFn(5),
        state: base(i),
      });
    }

    line.push(i);
    const full = i >= k - 1;
    if (full) out[i - k + 1] = nums[line[0]];

    const skipTalk = !practice && !expire && popped.length === 0 && !full && i > 0;
    if (skipTalk) {
      quiet++;
      continue;
    }
    if (quiet && !practice) {
      frames.push({
        scene,
        caption: `The head walks on. The line keeps the seats that can still win a later frame.`,
        codeLine: lineFn(6),
        state: base(i),
      });
      quiet = 0;
    }
    const joined: Frame = {
      scene,
      caption: full
        ? `Seat ${i} joins the line. The frame is full. The front of the line is this frame's max.`
        : `Seat ${i} joins the line. The frame is not yet ${k} wide, so we write no max.`,
      codeLine: lineFn(full ? 7 : 6),
      state: { ...base(i), tones: paint(i) },
    };
    if (full && practice && out.filter((value) => value !== null).length === 1) {
      const champ = line[0];
      const feedback: Record<number, string> = {};
      for (let index = 0; index < nums.length; index++) {
        if (index === champ) continue;
        if (index < i - k + 1 || index > i) feedback[index] = `That bar is outside this frame.`;
        else feedback[index] = `That bar is in the frame, but it is not the tallest.`;
      }
      joined.quiz = {
        kind: "cell",
        cells: nums.length,
        numbered: true,
        question: `The frame is full. Which bar is the max? Click that bar.`,
        answer: champ,
        feedback,
        otherwise: `The front of the line is the max of the frame.`,
        why: `The front of the champion line is the tallest seat still inside the frame.`,
      };
    }
    frames.push(joined);
  }

  const answer = out.map((value) => value as number);
  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${format(answer)}. You dropped the front yourself when a seat left the frame.`
      : `The head reached the end. The answer is ${format(answer)}.`,
    codeLine: lineFn(9),
    state: {
      ...blank(nums, k),
      out: answer,
      line: [],
      frameLeft: nums.length - k,
      frameRight: nums.length - 1,
      tones: tones(nums.length, range(Math.max(nums.length - k, 0), nums.length - 1, "done")),
    },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${nums.length} seats joined the line once and left it once.`,
      codeLine: 3,
      state: { ...blank(nums, k), out: answer, counter: { label: "seats handled", value: nums.length }, tones: tones(nums.length, () => "done") },
    });
    frames.push({
      scene,
      caption: `Space: O(k). The champion line holds at most ${k} seats, one per bar in the frame.`,
      codeLine: 2,
      state: { ...blank(nums, k), out: answer, lineLit: true, line: Array.from({ length: Math.min(k, nums.length) }, (_, index) => index) },
    });
  }
  return frames;
}

export const slidingWindowMaximumStory: ProblemStory<DequeWindowState> = {
  slugs: ["lc-239"],
  pattern: "Monotonic deque, sliding window",
  trigger: "the maximum of every neighbour run of a fixed length k as it slides",
  insight: "A sliding frame of k, and a champion line of seat numbers. The front is the max. Store seats, not scores, so you can drop a max that has left the frame.",
  metaphor: {
    name: "The champion line",
    legend: "frame = the window of k · line = deque of indices · front = current max · head = i",
    terms: ["line", "front", "frame", "head"],
  },
  traps: [
    {
      name: "The Value Trap",
      rule: "Store seats (indices), not scores. Drop the front when its seat is <= i - k. A line of scores cannot tell when the max has slid out.",
    },
  ],
  template: [
    "line holds seats, front to back decreasing;",
    "for each new bar i {",
    "    drop the front if its seat has left the frame;",
    "    drop the back while it is no taller than this bar;",
    "    join i; if the frame is full, write the front as the max;",
    "}",
  ],
  complexity: {
    slow: "O(nk)",
    time: "O(n)",
    timeWhy: "each seat joins the line once and leaves it once",
    space: "O(k)",
    spaceWhy: "the line holds at most k seats",
  },
  code: CODE,
  examples: [
    { label: "nums=[1,3,-1,-3,5,3,6,7] k=3", input: "nums=[1,3,-1,-3,5,3,6,7] k=3", expected: "[3,3,5,5,6,7]" },
    { label: "nums=[1,-1] k=1", input: "nums=[1,-1] k=1", expected: "[1,-1]" },
    { label: "nums=[9,11] k=2", input: "nums=[9,11] k=2", expected: "[11]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-739", title: "Daily Temperatures" },
    { slug: "lc-84", title: "Largest Rectangle in Histogram" },
    { slug: "lc-209", title: "Minimum Size Subarray Sum" },
  ],
  answer: (input) => {
    const { nums, k } = parse(input);
    return format(solve(nums, k));
  },
  frames: (input) => {
    const { nums, k } = parse(input);
    const answer = solve(nums, k);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(nums, k, answer),
      ...slowFrames(nums, k, answer),
      ...insightFrames(nums, k, answer),
      ...solutionFrames(nums, k),
      ...solutionFrames(practice.nums, practice.k, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(nums, k),
          frameLeft: 0,
          frameRight: Math.min(k - 1, nums.length - 1),
          out: answer,
          line: answer.length ? [nums.indexOf(answer[0])] : [],
          tones: tones(nums.length, range(0, Math.min(k - 1, nums.length - 1), "done")),
        },
      },
    ];
  },
  View: DequeWindowView,
};
