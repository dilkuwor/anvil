import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp2StonesView, type StoneHop, type StonesState } from "../agy-dp2-stones-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StonesState>;

/** Fresh numbers for the "your turn" run. The last number, -2, flips the low -12 into the answer, 24. */
const PRACTICE = "nums=[3,-1,4,-2]";

const CODE = [
  "int best = nums[0];",
  "int high = nums[0];",
  "int low = nums[0];",
  "for (int i = 1; i < nums.length; i++) {",
  "    int value = nums[i];",
  "    int candidateHigh = Math.max(value, Math.max(high * value, low * value));",
  "    int candidateLow = Math.min(value, Math.min(high * value, low * value));",
  "    high = candidateHigh;",
  "    low = candidateLow;",
  "    best = Math.max(best, high);",
  "}",
  "return best;",
];

function parseInput(raw: string): number[] {
  const list = raw.match(/\[([^\]]*)\]/)?.[1] ?? "";
  const nums = list.split(",").map((part) => Number.parseInt(part.trim(), 10)).filter((value) => !Number.isNaN(value));
  return nums.length === 0 ? [2, 3, -2, 4] : nums;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Zero has no sign to show. */
const clean = (value: number) => (Object.is(value, -0) ? 0 : value);

type Slow = { best: number; from: number; to: number; products: number; rows: { start: number; values: number[] }[] };

/** Independent solver for `answer()`, and the slow way: every run, growing one number at a time. Counts each product made. */
function everyRun(nums: number[]): Slow {
  const slow: Slow = { best: nums[0], from: 0, to: 0, products: 0, rows: [] };
  for (let start = 0; start < nums.length; start++) {
    let product = 1;
    const values: number[] = [];
    for (let end = start; end < nums.length; end++) {
      product = clean(product * nums[end]);
      slow.products++;
      values.push(product);
      if (product > slow.best) {
        slow.best = product;
        slow.from = start;
        slow.to = end;
      }
    }
    slow.rows.push({ start, values });
  }
  return slow;
}

type Winner = "high" | "low" | "fresh";
type Step = {
  index: number;
  value: number;
  /** The stone behind. */
  high: number;
  low: number;
  byHigh: number;
  byLow: number;
  newHigh: number;
  newLow: number;
  /** Which of the three made the new high, or null when two of them tie. */
  winner: Winner | null;
  bestBefore: number;
  bestAfter: number;
};

/** The real algorithm, recorded number by number. */
function walk(nums: number[]): Step[] {
  const steps: Step[] = [];
  let best = nums[0];
  let high = nums[0];
  let low = nums[0];
  for (let index = 1; index < nums.length; index++) {
    const value = nums[index];
    const byHigh = clean(high * value);
    const byLow = clean(low * value);
    const newHigh = Math.max(value, byHigh, byLow);
    const newLow = Math.min(value, byHigh, byLow);
    const makers = [byHigh === newHigh, byLow === newHigh, value === newHigh].filter(Boolean).length;
    const winner: Winner | null = makers > 1 ? null : byHigh === newHigh ? "high" : byLow === newHigh ? "low" : "fresh";
    const bestAfter = Math.max(best, newHigh);
    steps.push({ index, value, high, low, byHigh, byLow, newHigh, newLow, winner, bestBefore: best, bestAfter });
    high = newHigh;
    low = newLow;
    best = bestAfter;
  }
  return steps;
}

/** The trap, really run: keep only the biggest product, as one would for sums. */
function highOnly(nums: number[]): number {
  let best = nums[0];
  let high = nums[0];
  for (let index = 1; index < nums.length; index++) {
    high = Math.max(nums[index], clean(high * nums[index]));
    best = Math.max(best, high);
  }
  return best;
}

type Draw = {
  stones?: boolean;
  /** Stones 0..filled-1 show both numbers. */
  highs?: number[];
  lows?: number[];
  here?: number | null;
  hop?: StoneHop | null;
  rowTones?: Record<number, CellTone[]>;
  stoneTones?: Record<number, CellTone>;
  itemTones?: Record<number, CellTone>;
  /** Stones before this one are no longer kept. */
  keptFrom?: number;
  note?: string | null;
  counter?: { label: string; value: string } | null;
  trap?: string | null;
};

function draw(nums: number[], options: Draw = {}): StonesState {
  const shown = options.stones ?? true;
  const highs = options.highs ?? [];
  const lows = options.lows ?? [];
  const keptFrom = options.keptFrom ?? 0;
  return {
    chipsLabel: "",
    chips: [],
    rowLabels: shown ? ["high", "low"] : [],
    tallStones: true,
    stones: shown
      ? nums.map((_, index) => ({
          marks: [index < highs.length ? String(highs[index]) : null, index < lows.length ? String(lows[index]) : null],
          tone: options.stoneTones?.[index] ?? (index < keptFrom ? "faded" : index === options.here ? "edge" : index < highs.length ? "hit" : "idle"),
          rowTones: options.rowTones?.[index],
          label: "",
        }))
      : [],
    items: nums.map((value, index) => ({ text: String(value), tone: options.itemTones?.[index] ?? "idle" })),
    itemsLabel: "numbers",
    itemsAt: "under",
    here: options.here ?? null,
    pointers: [],
    hops: options.hop ? [options.hop] : [],
    pickMode: "values",
    bestNote: options.note ?? null,
    trapNote: options.trap ?? null,
    counter: options.counter ?? null,
  };
}

const span = (from: number, to: number, tone: CellTone): Record<number, CellTone> => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, offset) => [from + offset, tone]));

function pictureFrames(nums: number[], slow: Slow): Frame[] {
  const run = nums.slice(slow.from, slow.to + 1);
  const frames: Frame[] = [
    { scene: "picture", caption: `These are the numbers ${nums.join(", ")}. A run is a group of neighbours, with no gaps.`, state: draw(nums, { stones: false }) },
    {
      scene: "picture",
      caption: run.length > 1 ? `Allowed: the run ${run.join(", ")}. Multiply its numbers: ${run.join(" × ")} = ${slow.best}.` : `Allowed: the run ${run[0]} alone. Its product is just ${run[0]}.`,
      state: draw(nums, { stones: false, itemTones: span(slow.from, slow.to, "done") }),
    },
  ];
  if (nums.length >= 3) {
    frames.push({
      scene: "picture",
      caption: `Not allowed: ${nums[0]} and ${nums[2]} without the ${nums[1]} between them. A run may not skip a number.`,
      state: draw(nums, { stones: false, itemTones: { 0: "window", 1: "miss", 2: "window" } }),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the biggest product that any run can make.",
    state: draw(nums, { stones: false, itemTones: span(slow.from, slow.to, "done"), note: `biggest product: ${slow.best}` }),
  });
  return frames;
}

function slowFrames(nums: number[], slow: Slow): Frame[] {
  const frames: Frame[] = [];
  let made = 0;
  slow.rows.slice(0, 2).forEach((row, index) => {
    made += row.values.length;
    const listed = row.values.length <= 6 ? row.values.join(", ") : `${row.values.slice(0, 5).join(", ")} and so on`;
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: start at ${nums[0]} and grow the run one number at a time, multiplying as we go. The products: ${listed}.`
          : `Then go back and start again from ${nums[row.start]}. The products: ${listed}.`,
      state: draw(nums, { stones: false, itemTones: span(row.start, nums.length - 1, "window"), counter: { label: "products made", value: String(made) } }),
    });
  });
  frames.push({
    scene: "slow",
    caption: `From every start: ${plural(slow.products, "product")} for only ${plural(nums.length, "number")}. The biggest was ${slow.best}. Every start walks to the end again: O(n²) time.`,
    state: draw(nums, { stones: false, itemTones: span(0, nums.length - 1, "faded"), counter: { label: "products made", value: String(slow.products) } }),
  });
  return frames;
}

/** Highs and lows of the stones 0..count-1. */
function filled(nums: number[], steps: Step[], count: number): { highs: number[]; lows: number[] } {
  const highs = [nums[0], ...steps.map((step) => step.newHigh)].slice(0, count);
  const lows = [nums[0], ...steps.map((step) => step.newLow)].slice(0, count);
  return { highs, lows };
}

const hopTo = (step: Step, tone: StoneHop["tone"]): StoneHop => ({ from: step.index - 1, to: step.index, label: `× ${step.value}`, tone, level: 0 });

function insightFrames(nums: number[], steps: Step[]): Frame[] {
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Picture a stone over every number. A stone holds two things about the runs that end at its number: high, their biggest product, and low, their smallest.",
      state: draw(nums),
    },
  ];
  const flip = steps.find((step) => step.winner === "low" && step.value < 0) ?? steps.find((step) => step.value < 0 && step.low < step.high) ?? null;
  if (flip) {
    const before = filled(nums, steps, flip.index);
    const base = { ...before, here: flip.index, keptFrom: flip.index - 1, itemTones: { [flip.index]: "edge" as CellTone } };
    frames.push({
      scene: "insight",
      caption: `Why keep the smallest? Here comes ${flip.value}, a negative number. Multiplying by a negative flips the order: the biggest becomes the smallest, and the smallest the biggest.`,
      state: draw(nums, { ...base, hop: hopTo(flip, "try") }),
    });
    frames.push({
      scene: "insight",
      caption: `See it: ${flip.high} × ${flip.value} = ${flip.byHigh}, but ${flip.low} × ${flip.value} = ${flip.byLow}. The smaller number, ${flip.low}, made the bigger product.`,
      state: draw(nums, { ...base, hop: hopTo(flip, "best"), rowTones: { [flip.index - 1]: ["idle", "hit"] } }),
    });
  }
  frames.push({
    scene: "insight",
    caption: "So each stone looks only at the stone just behind it: its high and its low, each times the new number, or the new number alone as a fresh start.",
    state: flip ? draw(nums, { ...filled(nums, steps, flip.index), here: flip.index, keptFrom: flip.index - 1, hop: hopTo(flip, "best"), rowTones: { [flip.index - 1]: ["hit", "hit"] }, itemTones: { [flip.index]: "hit" } }) : draw(nums),
  });
  return frames;
}

function sourceQuiz(nums: number[], step: Step): StoryQuiz {
  const n = nums.length;
  const cells = { high: 2 * (step.index - 1), low: 2 * (step.index - 1) + 1, fresh: 2 * n + step.index };
  const winner = step.winner ?? "fresh";
  const feedback: Record<number, string> = {};
  const negative = step.value < 0;
  const notes: Record<Winner, string> = {
    high: `${step.high} × ${step.value} = ${step.byHigh}. ${negative ? "A negative number turns the biggest into the smallest." : "One of the other two gives more."}`,
    low: `${step.low} × ${step.value} = ${step.byLow}. One of the other two gives more.`,
    fresh: `${step.value} alone is only ${step.value}. A run coming from the stone behind gives more.`,
  };
  for (const name of ["high", "low", "fresh"] as const) if (name !== winner) feedback[cells[name]] = notes[name];
  return {
    kind: "cell",
    cells: 3 * n,
    question: `What makes the biggest product ending at ${step.value}? Click high or low on the stone behind it, or the number ${step.value} itself for a fresh start.`,
    answer: cells[winner],
    feedback,
    otherwise: "A run may not skip a number. Only the stone just behind, or the new number alone, can be used.",
    why:
      winner === "low"
        ? `${step.low} × ${step.value} = ${step.byLow}. A negative number flips the low into the biggest.`
        : winner === "high"
          ? `${step.high} × ${step.value} = ${step.byHigh}. The best run so far simply grows.`
          : `${step.value} alone beats ${step.byHigh} and ${step.byLow}. The run starts fresh here.`,
  };
}

function highCaption(step: Step): string {
  const { value, high, low, byHigh, byLow, newHigh, winner } = step;
  if (value === 0) return "Anything times 0 is 0, so the new high is 0. Every run that passes through here is worth 0.";
  if (high === low) return `${high} × ${value} = ${byHigh}, or ${value} alone. The bigger one is ${newHigh}: that is the new high.`;
  if (winner === "low" && value < 0) return `The flip: low ${low} × ${value} = ${byLow}. That beats ${high} × ${value} = ${byHigh}, and ${value} alone. The new high is ${newHigh}.`;
  return `${high} × ${value} = ${byHigh}, ${low} × ${value} = ${byLow}, or ${value} alone. The biggest of the three is ${newHigh}: the new high.`;
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on fresh numbers: the reader picks where every new high comes from.
 */
function walkFrames(nums: number[], scene: SceneId, practice: boolean, slowProducts: number): Frame[] {
  const steps = walk(nums);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const bestNote = (value: number) => `best: ${value}`;
  const first = filled(nums, steps, 1);

  if (practice) {
    frames.push({
      scene,
      caption: `Your turn, on new numbers: ${nums.join(", ")}. The first stone is filled: high and low are both ${nums[0]}. You choose where every new high comes from.`,
      state: draw(nums, { ...first, here: 0, note: bestNote(nums[0]) }),
    });
  } else {
    frames.push({
      scene,
      caption: `The first stone, over ${nums[0]}. Only one run ends here: ${nums[0]} alone. So its high and its low are both ${nums[0]}.`,
      codeLine: 1,
      state: draw(nums, { ...first, here: 0 }),
    });
    frames.push({ scene, caption: `It is the only stone so far, so the best product is ${nums[0]}.`, codeLine: 0, state: draw(nums, { ...first, here: 0, note: bestNote(nums[0]) }) });
  }

  const asked = new Set<Winner>();
  let explainedLow = false;
  for (const step of steps) {
    const { index, value } = step;
    const before = filled(nums, steps, index);
    const after = filled(nums, steps, index + 1);
    const common = { here: index, keptFrom: index - 1, itemTones: { [index]: "edge" as CellTone } };
    const ask = step.winner !== null && (practice || !asked.has(step.winner));
    if (step.winner && ask) asked.add(step.winner);

    const arrive: Frame = {
      scene,
      caption:
        index === 1 && !practice
          ? `Hop to the next number, ${value}. A run that ends here is ${value} alone, or a run from the stone behind with ${value} multiplied on.`
          : `Hop to the next number, ${value}. The stone behind holds high ${step.high} and low ${step.low}.`,
      codeLine: line(4),
      state: draw(nums, { ...before, ...common, hop: hopTo(step, "try"), note: bestNote(step.bestBefore) }),
    };
    if (ask) arrive.quiz = sourceQuiz(nums, step);
    frames.push(arrive);

    const source: CellTone[] = step.winner === "high" ? ["hit", "idle"] : step.winner === "low" ? ["idle", "hit"] : ["idle", "idle"];
    frames.push({
      scene,
      caption: highCaption(step),
      codeLine: line(5),
      state: draw(nums, {
        highs: after.highs,
        lows: before.lows,
        ...common,
        itemTones: { [index]: step.winner === "fresh" ? "hit" : "edge" },
        hop: hopTo(step, step.winner === "fresh" ? "faded" : "best"),
        rowTones: { [index - 1]: source, [index]: ["hit", "idle"] },
        note: bestNote(step.bestBefore),
      }),
    });

    const improved = step.bestAfter > step.bestBefore;
    const worth = !explainedLow && step.newLow < 0 && !practice;
    if (worth) explainedLow = true;
    frames.push({
      scene,
      caption: `The smallest of the same choices is ${step.newLow}: the new low.${worth ? " It looks useless, but the next negative number can flip it into a big product." : ""}${improved ? "" : ` The best stays ${step.bestBefore}.`}`,
      codeLine: line(6),
      state: draw(nums, { ...after, ...common, hop: hopTo(step, "faded"), rowTones: { [index]: ["idle", "hit"] }, note: bestNote(step.bestBefore) }),
    });
    if (improved) {
      frames.push({
        scene,
        caption: `New best: the high ${step.newHigh} beats ${step.bestBefore}.`,
        codeLine: line(9),
        state: draw(nums, { ...after, ...common, stoneTones: { [index]: "done" }, note: bestNote(step.bestAfter) }),
      });
    }
  }

  const slow = everyRun(nums);
  const best = steps.at(-1)?.bestAfter ?? nums[0];
  const all = filled(nums, steps, nums.length);
  const wrong = highOnly(nums);
  const flip = steps.find((step) => step.winner === "low" && step.value < 0) ?? null;
  const trapped = wrong !== best && flip !== null;
  const done = draw(nums, { ...all, keptFrom: nums.length - 1, itemTones: span(slow.from, slow.to, "done"), note: bestNote(best) });

  if (practice) {
    frames.push({
      scene,
      caption: trapped
        ? `Done. The answer is ${best}. You stepped around the Sign Flip Trap: with high alone, ${flip.low} × ${flip.value} is never seen, and the answer would be ${wrong}.`
        : `Done. The answer is ${best}. You chose where every high came from.`,
      state: trapped ? { ...done, trapNote: `with high only: ${wrong} · with high and low: ${best}` } : done,
    });
    return frames;
  }

  const run = nums.slice(slow.from, slow.to + 1);
  frames.push({
    scene,
    caption: `The last stone is done. The biggest high on any stone was ${best}, from the run ${run.join(", ")}. The answer is ${best}.`,
    codeLine: 11,
    state: done,
  });
  if (trapped) {
    const lowsLost = draw(nums, {
      ...all,
      rowTones: Object.fromEntries(nums.map((_, index) => [index, ["idle", "miss"] as CellTone[]])),
      itemTones: { [flip.index]: "miss" },
      note: bestNote(best),
      trap: `with high only: ${wrong} · with high and low: ${best}`,
    });
    frames.push({
      scene,
      caption: `The Sign Flip Trap: keeping only high, as one would for sums. Then ${flip.low} × ${flip.value} = ${flip.byLow} is never seen, and the answer comes out as ${wrong}, not ${best}.`,
      codeLine: 6,
      state: lowsLost,
    });
    frames.push({
      scene,
      caption: "A negative times a negative is positive. So the low is not useless: it is a big product waiting for one more negative number.",
      codeLine: 5,
      state: lowsLost,
    });
  }
  frames.push({
    scene,
    caption: `Time: O(n). One hop per number, and every stone looks only at the stone just behind it: ${plural(steps.length, "hop")}. The slow way made ${plural(slowProducts, "product")}.`,
    codeLine: 3,
    state: { ...done, counter: { label: "hops", value: String(steps.length) } },
  });
  frames.push({
    scene,
    caption: "Space: O(1). Only the last stone's high and low, and the best, are kept. The stones behind have faded: three numbers, however long the row is.",
    codeLine: 1,
    state: draw(nums, { ...all, keptFrom: nums.length - 1, stoneTones: { [nums.length - 1]: "done" }, note: bestNote(best) }),
  });
  return frames;
}

export const maximumProductSubarrayStory: ProblemStory<StonesState> = {
  slugs: ["lc-152"],
  pattern: "Dynamic programming",
  trigger: "“largest product” of a run of neighbours, with negative numbers allowed",
  insight: "Each stone keeps two numbers for the runs ending there: high and low. A negative number flips them, so today's low can be tomorrow's high. Look only at the stone just behind.",
  metaphor: {
    name: "The two-number stones",
    legend: "stone = position i · high, low = biggest and smallest product of a run ending at i · hop = multiply by value · best = biggest high so far",
    terms: ["stone", "high", "low", "hop", "flip"],
  },
  traps: [{ name: "The Sign Flip Trap", rule: "Do not keep only the maximum, as you would for sums. A negative number flips the smallest product into the biggest: track both high and low." }],
  template: [
    "best = high = low = first;",
    "for (each next value v)",
    "    newHigh = max(v, high * v, low * v);",
    "    newLow  = min(v, high * v, low * v);   // from the OLD high and low",
    "    high = newHigh; low = newLow; best = max(best, high);",
    "return best;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "one hop per number; each stone only looks at the stone just behind it",
    space: "O(1)",
    spaceWhy: "only the last stone's high and low, and the best, are kept",
  },
  code: CODE,
  examples: [
    { label: "[2,3,-2,4]", input: "nums=[2,3,-2,4]", expected: "6" },
    { label: "[-2,3,-4]", input: "nums=[-2,3,-4]", expected: "24", note: "Two negatives make a positive" },
    { label: "[2,-5,-2,-4,3]", input: "nums=[2,-5,-2,-4,3]", expected: "24", note: "Three negatives: the best run leaves one out" },
    { label: "[-2,0,-1]", input: "nums=[-2,0,-1]", expected: "0", note: "A zero starts everything over" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-53", title: "Maximum Subarray" },
    { slug: "lc-198", title: "House Robber" },
    { slug: "lc-238", title: "Product of Array Except Self" },
  ],
  answer: (raw) => String(everyRun(parseInput(raw)).best),
  frames: (raw) => {
    const nums = parseInput(raw);
    const slow = everyRun(nums);
    const practice = parseInput(PRACTICE);
    const steps = walk(nums);
    return [
      ...pictureFrames(nums, slow),
      ...slowFrames(nums, slow),
      ...insightFrames(nums, steps),
      ...walkFrames(nums, "solution", false, slow.products),
      ...walkFrames(practice, "card", true, 0),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(nums, { ...filled(nums, steps, nums.length), itemTones: span(slow.from, slow.to, "done"), note: `best: ${slow.best}` }),
      },
    ];
  },
  View: AgyDp2StonesView,
};
