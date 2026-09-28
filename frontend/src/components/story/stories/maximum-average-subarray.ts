import type { CellTone } from "@/components/learn/viz/primitives";

import { Rec01RowsView, type Rec01Row, type Rec01RowsState } from "../rec01-rows-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Rec01RowsState>;

/** Fresh row for the "your turn" run: two slides, and each one could take out the wrong box. */
const PRACTICE = "[3,-2,5,1,-4], k = 3";

const CODE = [
  "int sum = 0;",
  "for (int i = 0; i < k; i++) {",
  "    sum += nums[i];",
  "}",
  "int best = sum;",
  "for (int i = k; i < nums.length; i++) {",
  "    sum += nums[i] - nums[i - k];",
  "    best = Math.max(best, sum);",
  "}",
  "return (double) best / k;",
];

type Input = { nums: number[]; k: number };

function parse(raw: string): Input {
  const match = raw.match(/\[(.*)\]\s*,\s*k\s*=\s*(\d+)/);
  const nums = match ? [...match[1].matchAll(/-?\d+/g)].map(Number) : [];
  return { nums, k: match ? Number(match[2]) : 1 };
}

/** Up to five decimals, no trailing zeros: 12.75, 3, -4. */
function show(value: number): string {
  return String(Math.round(value * 100000) / 100000);
}

/** Independent check: every block summed from scratch. */
function solve({ nums, k }: Input): { best: number; start: number } {
  let best = -Infinity;
  let start = 0;
  for (let from = 0; from + k <= nums.length; from++) {
    let sum = 0;
    for (let i = from; i < from + k; i++) sum += nums[i];
    if (sum > best) {
      best = sum;
      start = from;
    }
  }
  return { best, start };
}

/** A negative number inside a sum gets brackets: 4 + (-4). */
function term(value: number): string {
  return value < 0 ? `(${value})` : String(value);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function row(nums: number[], paint: (index: number) => CellTone | null = () => null, extra: Partial<Rec01Row> = {}): Rec01Row {
  return { values: [...nums], tones: tones(nums.length, paint), markers: [], ...extra };
}

function frameBand(from: number, to: number, label: string, tone: "accent" | "teal" = "accent") {
  return { from, to, label, tone };
}

function pictureFrames({ nums, k }: Input): Frame[] {
  const { best, start } = solve({ nums, k });
  let firstSum = 0;
  for (let i = 0; i < k; i++) firstSum += nums[i];
  const frames: Frame[] = [
    { scene: "picture", caption: `A row of ${nums.length} numbers. We look at blocks of exactly ${k} boxes that sit next to each other.`, state: { rows: [row(nums)] } },
    {
      scene: "picture",
      caption: `One block is boxes 0 to ${k - 1}. Its sum is ${firstSum}, so its average is ${firstSum} ÷ ${k} = ${show(firstSum / k)}.`,
      state: { rows: [row(nums, (index) => (index < k ? "window" : null), { band: frameBand(0, k - 1, `sum ${firstSum}`) })] },
    },
  ];
  if (nums.length > k) {
    frames.push({
      scene: "picture",
      caption: `Not allowed: skipping a box. Box ${k - 1} is left out here, so these boxes are not one block.`,
      state: { rows: [row(nums, (index) => (index === k - 1 ? "faded" : index < k + 1 ? "miss" : null))] },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the block with the biggest average. Here it is boxes ${start} to ${start + k - 1}, with average ${show(best / k)}.`,
    state: { rows: [row(nums, (index) => (index >= start && index < start + k ? "done" : null), { band: frameBand(start, start + k - 1, `sum ${best}`, "teal") })] },
  });
  return frames;
}

function slowFrames({ nums, k }: Input): Frame[] {
  const frames: Frame[] = [];
  let added = 0;
  for (let from = 0; from + k <= nums.length; from++) {
    let sum = 0;
    for (let i = from; i < from + k; i++) {
      sum += nums[i];
      added += 1;
    }
    if (from > 2) continue;
    frames.push({
      scene: "slow",
      caption:
        from === 0
          ? `The slow way: add up boxes 0 to ${k - 1} from scratch. The sum is ${sum}.`
          : `Start again at box ${from} and add ${k} numbers from scratch. The sum is ${sum}. We already added ${k - 1} of them before.`,
      state: {
        rows: [row(nums, (index) => (index >= from && index < from + k ? "window" : null), { band: frameBand(from, from + k - 1, `sum ${sum}`) })],
        counter: { label: "numbers added", value: added },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `Every block from scratch: ${added} additions for ${nums.length} numbers. This is O(n × k) time. Most numbers get added again and again.`,
    state: { rows: [row(nums, () => "faded")], counter: { label: "numbers added", value: added } },
  });
  return frames;
}

function insightFrames({ nums, k }: Input): Frame[] {
  if (nums.length <= k) return [];
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  const next = sum + nums[k] - nums[0];
  return [
    {
      scene: "insight",
      caption: `Picture a frame that holds exactly ${k} boxes. Right now its sum is ${sum}.`,
      state: { rows: [row(nums, (index) => (index < k ? "window" : null), { band: frameBand(0, k - 1, `frame sum ${sum}`) })] },
    },
    {
      scene: "insight",
      caption: `Slide the frame one step right. Box ${k} (${nums[k]}) enters. Box 0 (${nums[0]}) leaves.`,
      state: {
        rows: [
          row(nums, (index) => (index === 0 ? "faded" : index === k ? "edge" : index < k ? "window" : null), {
            markers: [
              { index: 0, label: "leaves", tone: "coral" },
              { index: k, label: "enters", tone: "teal" },
            ],
          }),
        ],
      },
    },
    {
      scene: "insight",
      caption: `The boxes in the middle did not change. So the new sum is ${sum} + ${term(nums[k])} − ${term(nums[0])} = ${next}, with no need to add them again.`,
      state: { rows: [row(nums, (index) => (index === 0 ? "faded" : index <= k ? "window" : null), { band: frameBand(1, k, `frame sum ${next}`) })] },
    },
  ];
}

function leaverQuiz(cells: number, enter: number, k: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let index = enter - k + 1; index < enter; index++) {
    feedback[index] = `Box ${index} is still inside the frame after the step. Only the box at the far left end leaves.`;
  }
  feedback[enter] = `Box ${enter} is the one that enters. Something else must leave to keep ${k} boxes.`;
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `Box ${enter} is about to enter the frame. Which box must leave? Click it.`,
    answer: enter - k,
    feedback,
    otherwise: `That box is not in the frame at all. Look at the boxes the frame holds now.`,
    why: `The box ${k} steps behind the new one leaves. Then the frame holds exactly ${k} boxes again.`,
  };
}

/** The real algorithm, one frame per change. `practice` reruns it on a fresh row: the reader picks every leaving box. */
function solutionFrames({ nums, k }: Input, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = nums.length;
  let sum = 0;
  let best: number | null = null;
  let shownTrap = false;
  const top = () => ({ center: `frame sum = ${sum}`, best: best === null ? null : `best sum = ${best}` });
  const paint = (from: number, to: number, enter: number | null) => (index: number) =>
    index < from ? "faded" : index === enter ? "edge" : index >= from && index <= to ? "window" : null;

  if (practice) {
    frames.push({ scene, caption: `Your turn, on a new row with k = ${k}. The frame slides by itself. You pick the box that leaves.`, state: { rows: [row(nums)] } });
    for (let i = 0; i < k; i++) sum += nums[i];
    best = sum;
    frames.push({
      scene,
      caption: `The first frame holds boxes 0 to ${k - 1}. Its sum is ${sum}, and the best sum starts there.`,
      state: { rows: [row(nums, paint(0, k - 1, null), { band: frameBand(0, k - 1, `sum ${sum}`) })], ...top() },
    });
  } else {
    frames.push({ scene, caption: `The frame starts empty, with sum 0.`, codeLine: 0, state: { rows: [row(nums)], ...top() } });
    for (let i = 0; i < k; i++) {
      sum += nums[i];
      frames.push({
        scene,
        caption: `Box ${i} (${nums[i]}) goes into the frame. The frame sum is now ${sum}.`,
        codeLine: 2,
        state: { rows: [row(nums, paint(0, i, i), { band: frameBand(0, i, `sum ${sum}`) })], ...top() },
      });
    }
    best = sum;
    frames.push({
      scene,
      caption: `The frame is full. The best sum starts at this first frame's sum, ${sum}, not at 0.`,
      codeLine: 4,
      state: { rows: [row(nums, paint(0, k - 1, null), { band: frameBand(0, k - 1, `sum ${sum}`) })], ...top() },
    });
  }

  for (let i = k; i < n; i++) {
    const leave = i - k;
    const before = sum;
    const ask = practice || i === k;
    const waiting: Frame = {
      scene,
      caption: ask ? `Box ${i} (${nums[i]}) is next. The frame will slide one step to take it.` : `The frame slides again. Box ${i} (${nums[i]}) enters, and box ${leave} (${nums[leave]}) leaves.`,
      codeLine: line(5),
      state: {
        rows: [
          row(nums, (index) => (index === i ? "edge" : paint(leave, i - 1, null)(index)), {
            band: frameBand(leave, i - 1, `sum ${before}`),
            markers: [{ index: i, label: "enters", tone: "teal" }],
          }),
        ],
        ...top(),
      },
    };
    if (ask) waiting.quiz = leaverQuiz(n, i, k);
    frames.push(waiting);

    if (ask) {
      frames.push({
        scene,
        caption: `Box ${leave} leaves the frame. It is exactly ${k} steps behind box ${i}, the box that enters.`,
        codeLine: line(6),
        state: {
          rows: [
            row(nums, (index) => (index === leave ? "faded" : paint(leave, i, i)(index)), {
              markers: [
                { index: leave, label: "leaves", tone: "coral" },
                { index: i, label: "enters", tone: "teal" },
              ],
            }),
          ],
          ...top(),
        },
      });
    }
    if (!practice && !shownTrap && k > 1) {
      shownTrap = true;
      frames.push({
        scene,
        caption: `The Wrong Leaver Trap: taking out box ${leave + 1} instead. It is still inside the frame, and the frame would keep box ${leave} by mistake.`,
        codeLine: 6,
        state: {
          rows: [
            row(nums, (index) => (index === leave + 1 ? "miss" : paint(leave, i, i)(index)), {
              note: { index: leave + 1, text: "✕ still inside" },
              markers: [{ index: i, label: "enters", tone: "teal" }],
            }),
          ],
          ...top(),
        },
      });
    }

    sum += nums[i] - nums[leave];
    const improved = best === null || sum > best;
    const oldBest = best;
    frames.push({
      scene,
      caption: `The frame sum becomes ${before} + ${term(nums[i])} − ${term(nums[leave])} = ${sum}.${practice ? (improved ? ` New best sum: ${sum}.` : ` The best sum stays ${oldBest}.`) : improved ? "" : ` It does not beat the best sum, ${oldBest}.`}`,
      codeLine: line(6),
      state: {
        rows: [row(nums, paint(leave + 1, i, null), { band: frameBand(leave + 1, i, `sum ${sum}`, practice && improved ? "teal" : "accent") })],
        center: `frame sum = ${sum}`,
        best: `best sum = ${practice && improved ? sum : oldBest}`,
      },
    });
    if (improved) best = sum;
    if (improved && !practice) {
      frames.push({
        scene,
        caption: `${sum} beats the old best sum, ${oldBest}. New best: ${sum}.`,
        codeLine: 7,
        state: { rows: [row(nums, (index) => (index > leave && index <= i ? "done" : index <= leave ? "faded" : null), { band: frameBand(leave + 1, i, `sum ${sum}`, "teal") })], ...top() },
      });
    }
  }

  const bestSum = best ?? sum;
  const answer = show(bestSum / k);
  frames.push({
    scene,
    caption: practice
      ? `Done. The best sum is ${bestSum}, so the answer is ${answer}. You picked every leaving box yourself.`
      : `The frame reached the end. The best sum ${bestSum}, divided by ${k}: the answer is ${answer}.`,
    codeLine: line(9),
    state: { rows: [row(nums)], best: `best sum = ${bestSum}` },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${n} boxes entered the frame once and left once. No box was added twice.`,
      codeLine: 5,
      state: { rows: [row(nums, () => "done")], counter: { label: "boxes entered", value: n } },
    });
    frames.push({
      scene,
      caption: `Space: O(1). The frame keeps just two numbers, its sum and the best sum, however long the row is.`,
      codeLine: 4,
      state: { rows: [row(nums)], center: `frame sum = ${sum}`, best: `best sum = ${bestSum}` },
    });
  }
  return frames;
}

export const maximumAverageSubarrayStory: ProblemStory<Rec01RowsState> = {
  slugs: ["lc-643"],
  pattern: "Fixed-size sliding window",
  trigger: "“every block of exactly k numbers in a row” and the best sum or average",
  insight: "A frame of k boxes slides one step at a time. One box enters on the right, one box leaves on the left, and the sum changes by just those two.",
  metaphor: { name: "The sliding frame", legend: "frame = the window of k boxes · enters = nums[i] · leaves = nums[i - k]", terms: ["frame", "enters", "leaves"] },
  traps: [{ name: "The Wrong Leaver Trap", rule: "When box i enters, box i - k leaves. Box i - k + 1 is still inside the frame." }],
  template: [
    "sum = first k numbers; best = sum;",
    "for (i = k; i < n; i++) {",
    "    sum += nums[i] - nums[i - k];   // one enters, one leaves",
    "    best = max(best, sum);",
    "}",
  ],
  complexity: {
    slow: "O(n × k)",
    time: "O(n)",
    timeWhy: "each box enters the frame once and leaves once",
    space: "O(1)",
    spaceWhy: "only the frame sum and the best sum are kept",
  },
  code: CODE,
  examples: [
    { label: "[1,12,-5,-6,50,3], k = 4", input: "[1,12,-5,-6,50,3], k = 4", expected: "12.75" },
    { label: "[4,2,1,3,3], k = 2", input: "[4,2,1,3,3], k = 2", expected: "3" },
    { label: "[-6,-2,-8,-4], k = 2", input: "[-6,-2,-8,-4], k = 2", expected: "-4", note: "Tricky: every sum is negative" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-3", title: "Longest Substring Without Repeating Characters" },
    { slug: "lc-209", title: "Minimum Size Subarray Sum" },
    { slug: "lc-438", title: "Find All Anagrams in a String" },
  ],
  answer: (input) => {
    const parsed = parse(input);
    return show(solve(parsed).best / parsed.k);
  },
  frames: (input) => {
    const parsed = parse(input);
    const { best, start } = solve(parsed);
    const { nums, k } = parsed;
    return [
      ...pictureFrames(parsed),
      ...slowFrames(parsed),
      ...insightFrames(parsed),
      ...solutionFrames(parsed),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          rows: [row(nums, (index) => (index >= start && index < start + k ? "done" : null), { band: frameBand(start, start + k - 1, `sum ${best}`, "teal") })],
          best: `best sum = ${best}`,
        },
      },
    ];
  },
  View: Rec01RowsView,
};
