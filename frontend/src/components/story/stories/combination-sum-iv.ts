import type { CellTone } from "@/components/learn/viz/primitives";

import { CoinChangeView, type CoinChangeState, type CoinHop } from "../coin-change-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type HopFrame = StoryFrame<CoinChangeState>;
type Input = { nums: number[]; target: number };

/** Fresh bridge for the "your turn" run. Totals outside count 3 lists; numbers outside would lose an order and say 2. */
const PRACTICE = "nums=[1,2], target=3";

const CODE = [
  "int[] ways = new int[target + 1];",
  "ways[0] = 1;",
  "for (int t = 1; t <= target; t++) {",
  "    for (int x : nums) {",
  "        if (x <= t) ways[t] += ways[t - x];",
  "    }",
  "}",
  "return ways[target];",
];

/** The slow way stops counting here, so a large input cannot freeze the page. */
const SLOW_CAP = 20000;

function parseInput(raw: string): Input {
  const list = raw.match(/\[([^\]]*)\]/)?.[1] ?? "";
  const nums = [...new Set(list.split(",").map((part) => Number.parseInt(part.trim(), 10)).filter((value) => value > 0))].sort((a, b) => a - b);
  const target = Number.parseInt(raw.match(/target\s*=\s*(\d+)/)?.[1] ?? "", 10);
  if (nums.length === 0 || Number.isNaN(target)) return { nums: [1, 2, 3], target: 4 };
  return { nums, target: Math.min(Math.max(target, 1), 12) };
}

/** The real algorithm: totals on the outside, every number tried as the last hop. */
function solve({ nums, target }: Input): number[] {
  const ways = Array.from({ length: target + 1 }, (_, index) => (index === 0 ? 1 : 0));
  for (let t = 1; t <= target; t++) for (const x of nums) if (x <= t) ways[t] += ways[t - x];
  return ways;
}

/** The trap: the same adding with the numbers on the outside, as in Coin Change II. Orders are lost. */
function numbersOutside({ nums, target }: Input): number[] {
  const ways = Array.from({ length: target + 1 }, (_, index) => (index === 0 ? 1 : 0));
  for (const x of nums) for (let t = x; t <= target; t++) ways[t] += ways[t - x];
  return ways;
}

/** Independent check: list every ordered list that adds up to the target. */
function lists({ nums, target }: Input, limit = Infinity): number[][] {
  const found: number[][] = [];
  const list: number[] = [];
  const walk = (left: number) => {
    if (found.length >= limit) return;
    if (left === 0) {
      found.push([...list]);
      return;
    }
    for (const x of nums) {
      if (x > left) break;
      list.push(x);
      walk(left - x);
      list.pop();
    }
  };
  walk(target);
  return found;
}

function chain(path: number[], tone: CoinHop["tone"], below = false): CoinHop[] {
  let at = 0;
  return path.map((step) => {
    const hop: CoinHop = { from: at, to: at + step, coin: step, tone, level: 0, below };
    at += step;
    return hop;
  });
}

function listOf(items: (string | number)[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function blank({ nums, target }: Input): CoinChangeState {
  return {
    coins: nums,
    amount: target,
    marks: Array.from({ length: target + 1 }, () => null),
    tones: Array.from({ length: target + 1 }, () => "idle" as CellTone),
    here: null,
    tryCoin: null,
    hops: [],
    overshoot: null,
    bestNote: null,
    trapNote: null,
    counter: null,
  };
}

/** Every last hop that can land on `stone`, shortest lowest. */
function lastHops({ nums }: Input, stone: number, tone: CoinHop["tone"]): CoinHop[] {
  return nums.filter((x) => x <= stone).map((x, index) => ({ from: stone - x, to: stone, coin: x, tone, level: index }));
}

function pictureFrames(input: Input, answer: number): HopFrame[] {
  const { nums, target } = input;
  const all = lists(input, 200);
  const frames: HopFrame[] = [
    {
      scene: "picture",
      caption: `We must reach exactly ${target} by adding numbers from ${listOf(nums)}, each as often as we like. Picture the totals 0 to ${target} as stepping stones.`,
      state: blank(input),
    },
  ];
  const mixed = all.filter((list) => new Set(list).size >= 2).sort((a, b) => a.length - b.length)[0];
  const shown = mixed ?? all[0];
  frames.push({
    scene: "picture",
    caption: shown
      ? `Each number is a hop of that many stones. One list: ${shown.join(", ")}. It lands exactly on stone ${target}.`
      : `Each number is a hop of that many stones. Here no list of hops lands exactly on stone ${target}.`,
    state: { ...blank(input), hops: chain(shown ?? (nums[0] <= target ? [nums[0]] : []), "try") },
  });
  if (mixed) {
    const other = [...mixed].reverse();
    frames.push({
      scene: "picture",
      caption: `Here order matters: ${other.join(", ")} is a different list from ${mixed.join(", ")}. Both count.`,
      state: { ...blank(input), hops: [...chain(mixed, "best"), ...chain(other, "best", true)], bestNote: "two different lists" },
    });
  }
  const tooFar = [...nums].reverse().find((x) => target % x !== 0);
  if (tooFar !== undefined) {
    const before = Array.from({ length: Math.floor(target / tooFar) }, () => tooFar);
    frames.push({
      scene: "picture",
      caption: `Not allowed: ${[...before, tooFar].join(", ")} jumps past stone ${target}. The list must land exactly on it.`,
      state: { ...blank(input), hops: chain(before, "try"), overshoot: { from: before.length * tooFar, coin: tooFar } },
    });
  }
  const goal = blank(input);
  goal.tones[target] = "done";
  frames.push({
    scene: "picture",
    caption: `The goal: count every ordered list that lands exactly on stone ${target}. Here there ${answer === 1 ? "is 1" : `are ${answer}`}.`,
    state: { ...goal, bestNote: `lists: ${answer}` },
  });
  return frames;
}

type SlowRun = { calls: number; capped: boolean; visits: number[] };

/** Plain recursion, really run: from a total, try every number as the last hop. Counts every call. */
function runSlow({ nums, target }: Input): SlowRun {
  const run: SlowRun = { calls: 0, capped: false, visits: Array.from({ length: target + 1 }, () => 0) };
  const count = (t: number): number => {
    if (run.calls >= SLOW_CAP) {
      run.capped = true;
      return 0;
    }
    run.calls++;
    run.visits[t]++;
    if (t === 0) return 1;
    let total = 0;
    for (const x of nums) if (x <= t) total += count(t - x);
    return total;
  };
  count(target);
  return run;
}

function slowFrames(input: Input, run: SlowRun): HopFrame[] {
  const counter = (value: number | string) => ({ label: "calls", value: String(value) });
  const stuck = blank(input);
  return [
    {
      scene: "slow",
      caption: `The slow way: stand on stone ${input.target} and try every number as the last hop. For each start, ask the same question again, all the way back to stone 0.`,
      state: { ...stuck, here: input.target, hops: lastHops(input, input.target, "try"), counter: counter(1) },
    },
    {
      scene: "slow",
      caption: "Each stone now shows how many times the slow way stood on it. The small stones are worked out again and again.",
      state: { ...stuck, marks: [...run.visits], tones: run.visits.map((value) => (value > 1 ? "miss" : "idle") as CellTone), counter: counter(run.capped ? `${SLOW_CAP}+` : run.calls) },
    },
    {
      scene: "slow",
      caption: `That is ${run.capped ? `more than ${SLOW_CAP}` : run.calls} calls for a target of only ${input.target}. Each call splits once per number, so this is O(nums^target) time.`,
      state: { ...stuck, tones: stuck.tones.map(() => "faded" as CellTone), counter: counter(run.capped ? `${SLOW_CAP}+` : run.calls) },
    },
  ];
}

function insightFrames(input: Input, ways: number[]): HopFrame[] {
  const { target } = input;
  const hops = lastHops(input, target, "try");
  if (hops.length === 0) {
    return [
      {
        scene: "insight",
        caption: `Picture the last hop of a list. Every number here is a longer hop than ${target}, so no last hop can land on stone ${target}.`,
        state: { ...blank(input), here: target },
      },
    ];
  }
  const starts = hops.map((hop) => hop.from);
  const ready = blank(input);
  ready.tones[target] = "edge";
  for (const start of starts) ready.tones[start] = "window";
  const known = blank(input);
  known.marks = ways.map((value, index) => (index < target ? value : null));
  known.tones = [...ready.tones];
  return [
    {
      scene: "insight",
      caption: `Look only at the last hop of a list. It lands on stone ${target} from stone ${listOf(starts)}: one start for each number.`,
      state: { ...ready, here: target, hops },
    },
    {
      scene: "insight",
      caption: "Every list that reaches one of those stones becomes a list for this stone, with one more hop at the end. Each last hop is a different list.",
      state: { ...known, here: target, hops },
    },
    {
      scene: "insight",
      caption: `So stone ${target} adds up the stones behind its last hops: ${starts.map((start) => ways[start]).join(" + ")} = ${ways[target]}. Fill the stones from 0 forward, so each start is ready.`,
      state: { ...known, marks: ways.map((value, index) => (index <= target ? value : null)), tones: ready.tones.map((tone, index) => (index === target ? "done" : tone)), here: target, hops: hops.map((hop) => ({ ...hop, tone: "best" as const })) },
    },
  ];
}

function startQuiz(cells: number, stone: number, step: number): StoryQuiz {
  const feedback: Record<number, string> = { [stone]: "That is the stone being filled. The last hop starts further back." };
  if (step !== 1) feedback[stone - 1] = `That is only one stone back. A hop of ${step} is longer.`;
  return {
    kind: "cell",
    cells,
    numbered: cells <= 10,
    question: `The last hop into stone ${stone} is a ${step}. Which stone does it start from? Click it.`,
    answer: stone - step,
    feedback,
    otherwise: `Count back from stone ${stone}, one stone for each step of the hop.`,
    why: `A hop of ${step} covers ${plural(step, "stone")}, so it starts on stone ${stone - step}.`,
  };
}

function loopQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "Order matters here. Which loop goes on the outside?",
    options: ["The numbers: each number makes one pass over the stones", "The stones: each stone tries every number as its last hop"],
    answer: 1,
    why: "Stones outside means every number is tried as the last hop of every stone, so 1 + 2 and 2 + 1 both count.",
  };
}

/** The real algorithm, stone by stone. `practice` asks where a last hop starts on every stone. */
function stoneFrames(input: Input, scene: SceneId, practice: boolean): HopFrame[] {
  const { nums, target } = input;
  const frames: HopFrame[] = [];
  const ways = Array.from({ length: target + 1 }, () => 0);
  const filled: boolean[] = Array.from({ length: target + 1 }, () => false);
  const line = (index: number) => (practice ? undefined : index);
  const at = (stone: number | null, extra: Partial<CoinChangeState> = {}): CoinChangeState => ({
    ...blank(input),
    marks: ways.map((value, index) => (filled[index] ? value : null)),
    tones: ways.map((value, index) => (index === stone ? "edge" : filled[index] ? (value > 0 ? "hit" : "faded") : "idle") as CellTone),
    here: stone,
    ...extra,
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new bridge: reach ${target} with hops of ${listOf(nums)}. Order matters.`
      : `Lay out one stone for every total from 0 to ${target}. Each stone will count the lists that reach it.`,
    codeLine: line(0),
    state: at(null),
    quiz: practice ? loopQuiz() : undefined,
  });
  ways[0] = 1;
  filled[0] = true;
  frames.push({
    scene,
    caption: "Stone 0 holds 1: the empty list, with no hops, is the one way to stand at the start.",
    codeLine: line(1),
    state: at(0),
  });

  let asked = false;
  for (let stone = 1; stone <= target; stone++) {
    const hops = lastHops(input, stone, "try");
    if (hops.length === 0) {
      filled[stone] = true;
      frames.push({
        scene,
        caption: `Stone ${stone}: every hop is longer than ${stone}, so no last hop can land here. It holds 0.`,
        codeLine: line(4),
        state: at(stone),
      });
      continue;
    }
    // Ask about the longest hop that does not start on stone 0, so the answer is not the obvious start.
    const quizHop = [...hops].reverse().find((hop) => hop.from > 0) ?? hops.at(-1)!;
    const ask = practice ? true : !asked && hops.length >= 2 && quizHop.from > 0;
    if (ask) {
      asked = true;
      frames.push({
        scene,
        caption: `The ring is on stone ${stone}. ${hops.length === 1 ? "One last hop" : `${hops.length} last hops`} can land here, one for each number up to ${stone}.`,
        codeLine: line(3),
        state: at(stone, { hops: hops.filter((hop) => hop !== quizHop) }),
        quiz: startQuiz(target + 1, stone, quizHop.coin),
      });
    }
    const parts = hops.map((hop) => ways[hop.from]);
    ways[stone] = parts.reduce((sum, value) => sum + value, 0);
    filled[stone] = true;
    frames.push({
      scene,
      caption:
        hops.length === 1
          ? `Stone ${stone}: the only last hop is a ${hops[0].coin}, from stone ${hops[0].from}. It holds ${ways[stone]}.`
          : `Stone ${stone} adds the stones behind its last hops, ${listOf(hops.map((hop) => hop.from))}: ${parts.join(" + ")} = ${ways[stone]}.`,
      codeLine: line(4),
      state: at(stone, { hops: hops.map((hop) => ({ ...hop, tone: ways[hop.from] > 0 ? ("best" as const) : ("faded" as const) })) }),
    });
  }
  return frames;
}

function finished(input: Input, ways: number[]): CoinChangeState {
  return {
    ...blank(input),
    marks: [...ways],
    tones: ways.map((value, index) => (index === input.target ? "done" : value > 0 ? "hit" : "idle") as CellTone),
    bestNote: `lists: ${ways[input.target]}`,
  };
}

function trapState(input: Input, ways: number[]): CoinChangeState {
  const wrong = numbersOutside(input);
  return {
    ...finished(input, ways),
    marks: [...wrong],
    tones: wrong.map((value, index) => (value !== ways[index] ? "miss" : "idle") as CellTone),
    trapNote: `✕ numbers outside: ${wrong[input.target]}   ·   stones outside: ${ways[input.target]}`,
  };
}

function solutionFrames(input: Input, ways: number[], slow: SlowRun): HopFrame[] {
  const { nums, target } = input;
  const frames = stoneFrames(input, "solution", false);
  const answer = ways[target];
  frames.push({
    scene: "solution",
    caption: `Every stone is filled. Stone ${target} counts every ordered list. The answer is ${answer}.`,
    codeLine: 7,
    state: { ...finished(input, ways), here: target },
  });
  const wrong = numbersOutside(input)[target];
  frames.push({
    scene: "solution",
    caption:
      wrong !== answer
        ? `The Lost Order Trap: with the numbers outside, as in Coin Change II, stone ${target} would hold ${wrong}. Lists like 1, 3 and 3, 1 would count once.`
        : `With the numbers outside you would get ${wrong} here too. With two different numbers that fit, it counts 1, 2 and 2, 1 once: the Lost Order Trap.`,
    codeLine: 2,
    state: trapState(input, ways),
  });
  const tries = target * nums.length;
  frames.push({
    scene: "solution",
    caption: `Time: O(target × nums). Each of the ${target} stones tried each of the ${nums.length} numbers once: ${tries} tries. The slow way made ${slow.capped ? `over ${SLOW_CAP}` : slow.calls} calls.`,
    codeLine: 3,
    state: { ...finished(input, ways), counter: { label: "tries", value: String(tries) } },
  });
  frames.push({
    scene: "solution",
    caption: `Space: O(target). One row of ${target + 1} stones, each filled once.`,
    codeLine: 0,
    state: { ...finished(input, ways), tones: ways.map(() => "window" as CellTone) },
  });
  return frames;
}

function practiceFrames(input: Input): HopFrame[] {
  const ways = solve(input);
  const frames = stoneFrames(input, "card", true);
  const answer = ways[input.target];
  frames.push({
    scene: "card",
    caption: `Stone ${input.target} holds ${answer}, so the answer is ${answer}. With the numbers outside it would say ${numbersOutside(input)[input.target]}: the Lost Order Trap.`,
    state: trapState(input, ways),
  });
  return frames;
}

export const combinationSumIVStory: ProblemStory<CoinChangeState> = {
  slugs: ["lc-377"],
  pattern: "1-D DP, count orders",
  trigger: "how many lists add up to a target, numbers may be reused, and different orders count as different",
  insight: "The last hop. Every list ends with one number, so a stone's ways are the ways of each stone one hop behind it, added up. Totals on the outside count every order.",
  metaphor: {
    name: "The last hop",
    legend: "stone = ways[t] · last hop = the number x · the stone behind it = t - x",
    terms: ["stone", "last hop", "hop", "list"],
  },
  traps: [{ name: "The Lost Order Trap", rule: "Order matters here. Put the totals on the outside, so every number is tried as the last step of every total." }],
  template: [
    "ways[0] = 1;                       // the empty list",
    "for t from 1 up to target:         // totals OUTSIDE",
    "    for each number x <= t:        // x is the last hop",
    "        ways[t] += ways[t - x];",
    "return ways[target];",
  ],
  complexity: {
    slow: "O(nums^target)",
    time: "O(target × nums)",
    timeWhy: "each stone tries every number once as its last hop",
    space: "O(target)",
    spaceWhy: "one row of stones, one per total",
  },
  code: CODE,
  examples: [
    { label: "4 with 1, 2, 3", input: "nums=[1,2,3], target=4", expected: "7", note: "Compare with Coin Change II, which counts 4" },
    { label: "5 with 1, 3", input: "nums=[1,3], target=5", expected: "4" },
    { label: "3 with 9", input: "nums=[9], target=3", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-39", title: "Combination Sum" },
    { slug: "lc-518", title: "Coin Change II" },
    { slug: "lc-70", title: "Climbing Stairs" },
  ],
  answer: (raw) => String(lists(parseInput(raw)).length),
  frames: (raw) => {
    const input = parseInput(raw);
    const ways = solve(input);
    const slow = runSlow(input);
    return [
      ...pictureFrames(input, ways[input.target]),
      ...slowFrames(input, slow),
      ...insightFrames(input, ways),
      ...solutionFrames(input, ways, slow),
      ...practiceFrames(parseInput(PRACTICE)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...finished(input, ways), hops: lastHops(input, input.target, "best"), here: input.target },
      },
    ];
  },
  View: CoinChangeView,
};
