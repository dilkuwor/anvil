import type { CellTone } from "@/components/learn/viz/primitives";

import { CoinChangeView, type CoinChangeState, type CoinHop } from "../coin-change-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type CoinFrame = StoryFrame<CoinChangeState>;
type Input = { coins: number[]; amount: number };

/** Fresh bridge for the "your turn" run. Coins outside count 3 groups; amounts outside would count 5 orders. */
const PRACTICE = "amount=4, coins=[1,2]";

const CODE = [
  "int[] ways = new int[amount + 1];",
  "ways[0] = 1;",
  "for (int coin : coins) {",
  "    for (int a = coin; a <= amount; a++) {",
  "        ways[a] += ways[a - coin];",
  "    }",
  "}",
  "return ways[amount];",
];

/** The slow way stops counting here, so a large input cannot freeze the page. */
const SLOW_CAP = 20000;

function parseInput(raw: string): Input {
  const list = raw.match(/\[([^\]]*)\]/)?.[1] ?? "";
  const coins = [...new Set(list.split(",").map((part) => Number.parseInt(part.trim(), 10)).filter((coin) => coin > 0))].sort((a, b) => a - b);
  const amount = Number.parseInt(raw.match(/amount\s*=\s*(\d+)/)?.[1] ?? "", 10);
  if (coins.length === 0 || Number.isNaN(amount)) return { coins: [1, 2, 5], amount: 5 };
  return { coins, amount: Math.min(amount, 12) };
}

/** The real algorithm: coins on the outside. `after[k]` is the row once coin k has joined. */
function solve({ coins, amount }: Input): { ways: number[]; after: number[][] } {
  const ways = Array.from({ length: amount + 1 }, (_, index) => (index === 0 ? 1 : 0));
  const after: number[][] = [];
  for (const coin of coins) {
    for (let a = coin; a <= amount; a++) ways[a] += ways[a - coin];
    after.push([...ways]);
  }
  return { ways, after };
}

/** The trap: the same adding, but with the amounts on the outside. It counts every order. */
function amountsOutside({ coins, amount }: Input): number[] {
  const ways = Array.from({ length: amount + 1 }, (_, index) => (index === 0 ? 1 : 0));
  for (let a = 1; a <= amount; a++) for (const coin of coins) if (coin <= a) ways[a] += ways[a - coin];
  return ways;
}

/** Independent check: list every group of coins (never going back to a smaller coin) and count them. */
function groups({ coins, amount }: Input, limit = Infinity): number[][] {
  const found: number[][] = [];
  const bag: number[] = [];
  const walk = (index: number, left: number) => {
    if (found.length >= limit) return;
    if (left === 0) {
      found.push([...bag]);
      return;
    }
    for (let k = index; k < coins.length; k++) {
      if (coins[k] > left) break;
      bag.push(coins[k]);
      walk(k, left - coins[k]);
      bag.pop();
    }
  };
  walk(0, amount);
  return found;
}

function chain(path: number[], tone: CoinHop["tone"], below = false): CoinHop[] {
  let at = 0;
  return path.map((coin) => {
    const hop: CoinHop = { from: at, to: at + coin, coin, tone, level: 0, below };
    at += coin;
    return hop;
  });
}

function listOf(items: (string | number)[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function blank({ coins, amount }: Input): CoinChangeState {
  return {
    coins,
    amount,
    marks: Array.from({ length: amount + 1 }, () => null),
    tones: Array.from({ length: amount + 1 }, () => "idle" as CellTone),
    here: null,
    tryCoin: null,
    hops: [],
    overshoot: null,
    bestNote: null,
    trapNote: null,
    counter: null,
  };
}

/** A way with two different coins, and the same coins in another order. */
function reordered(all: number[][]): { way: number[]; other: number[] } | null {
  const mixed = all.filter((group) => new Set(group).size >= 2).sort((a, b) => a.length - b.length);
  const way = mixed[0];
  if (!way) return null;
  const other = [...way];
  const swap = other.findIndex((coin, index) => index > 0 && coin !== other[0]);
  [other[0], other[swap]] = [other[swap], other[0]];
  return { way, other };
}

function pictureFrames(input: Input, answer: number): CoinFrame[] {
  const { coins, amount } = input;
  const all = groups(input, 50);
  const frames: CoinFrame[] = [
    {
      scene: "picture",
      caption: `We must pay exactly ${amount}, with coins of ${listOf(coins)}. Each coin may be used as often as we like. Picture the amounts 0 to ${amount} as stepping stones.`,
      state: blank(input),
    },
  ];
  const pair = reordered(all);
  const shown = pair?.way ?? all[0];
  frames.push({
    scene: "picture",
    caption: shown
      ? `A coin is a hop of that many stones. One way to pay: ${shown.join(", ")}. It lands exactly on stone ${amount}.`
      : `A coin is a hop of that many stones. Here no mix of hops lands exactly on stone ${amount}.`,
    state: { ...blank(input), hops: chain(shown ?? (coins[0] <= amount ? [coins[0]] : []), "try") },
  });
  const tooFar = [...coins].reverse().find((coin) => amount % coin !== 0);
  if (tooFar !== undefined) {
    const before = Array.from({ length: Math.floor(amount / tooFar) }, () => tooFar);
    frames.push({
      scene: "picture",
      caption: `Not allowed: ${[...before, tooFar].join(", ")} jumps past stone ${amount}. We must land exactly on it.`,
      state: { ...blank(input), hops: chain(before, "try"), overshoot: { from: before.length * tooFar, coin: tooFar } },
    });
  }
  if (pair) {
    frames.push({
      scene: "picture",
      caption: `${pair.other.join(", ")} uses the same coins as ${pair.way.join(", ")}, only in another order. It is the same way to pay, so it counts once.`,
      state: { ...blank(input), hops: [...chain(pair.way, "best"), ...chain(pair.other, "trap", true)], trapNote: "same coins, other order: not a new way" },
    });
  }
  const goal = blank(input);
  goal.tones[amount] = "done";
  frames.push({
    scene: "picture",
    caption: `The goal: count the different groups of coins that pay exactly ${amount}. Here there ${answer === 1 ? "is 1" : `are ${answer}`}.`,
    state: { ...goal, bestNote: `ways: ${answer}` },
  });
  return frames;
}

type SlowRun = { calls: number; capped: boolean; ends: { path: number[]; calls: number }[] };

/** Plain recursion, really run: use this coin again, or move on to the next coin. Counts every call. */
function runSlow({ coins, amount }: Input): SlowRun {
  const run: SlowRun = { calls: 0, capped: false, ends: [] };
  const path: number[] = [];
  const count = (index: number, left: number): number => {
    if (run.calls >= SLOW_CAP) {
      run.capped = true;
      return 0;
    }
    run.calls++;
    if (left === 0) {
      if (run.ends.length < 2) run.ends.push({ path: [...path], calls: run.calls });
      return 1;
    }
    if (left < 0 || index === coins.length) return 0;
    path.push(coins[index]);
    const again = count(index, left - coins[index]);
    path.pop();
    return again + count(index + 1, left);
  };
  count(0, amount);
  return run;
}

function slowFrames(input: Input, run: SlowRun): CoinFrame[] {
  const counter = (value: number | string) => ({ label: "calls", value: String(value) });
  const frames: CoinFrame[] = [];
  run.ends.forEach((end, index) => {
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: at each step, use the same coin again, or never use it again and move on. The first way found: ${end.path.join(", ")}.`
          : `Step back, move on to the next coin, and search again: ${end.path.join(", ")}. The search keeps splitting in two.`,
      state: { ...blank(input), hops: chain(end.path, "try"), counter: counter(end.calls) },
    });
  });
  if (run.ends.length === 0) {
    frames.push({
      scene: "slow",
      caption: "The slow way: at each step, use the same coin again, or never use it again and move on. Here no search ever lands exactly.",
      state: { ...blank(input), counter: counter(run.calls) },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${run.capped ? `more than ${SLOW_CAP}` : run.calls} calls for an amount of only ${input.amount}. Each call splits in two, so this is O(2^(amount + coins)) time.`,
    state: { ...blank(input), tones: blank(input).tones.map(() => "faded" as CellTone), counter: counter(run.capped ? `${SLOW_CAP}+` : run.calls) },
  });
  return frames;
}

/** The first moment a new coin adds to a stone that already had ways: the adding can be seen. */
function firstAdd(input: Input, after: number[][]): { k: number; stone: number } | null {
  for (let k = 1; k < input.coins.length; k++) {
    const coin = input.coins[k];
    for (let stone = coin; stone <= input.amount; stone++) {
      if (after[k - 1][stone] > 0 && after[k][stone - coin] > 0) return { k, stone };
    }
  }
  return null;
}

function insightFrames(input: Input, after: number[][]): CoinFrame[] {
  const { coins } = input;
  const first = coins[0];
  const firstRow = after[0];
  const frames: CoinFrame[] = [
    {
      scene: "insight",
      caption: `Picture the coins joining one kind at a time. With only the ${first}-coin, each stone holds how many ways reach it: ${firstRow.join(", ")}.`,
      state: { ...blank(input), tryCoin: first, marks: [...firstRow], tones: firstRow.map((value) => (value > 0 ? "hit" : "idle") as CellTone) },
    },
  ];
  const moment = firstAdd(input, after);
  if (!moment) {
    frames.push({
      scene: "insight",
      caption: "When the next coin joins, a stone adds the ways of the stone one coin-hop behind it. Here no stone gains a second way that way.",
      state: { ...blank(input), marks: [...after.at(-1)!] },
    });
    return frames;
  }
  const coin = coins[moment.k];
  const { stone } = moment;
  // The row in the middle of this coin's pass: stones before `stone` already updated.
  const mid = after[moment.k - 1].map((value, index) => (index < stone && index >= coin ? after[moment.k][index] : value));
  const behind = mid[stone - coin];
  const had = mid[stone];
  frames.push({
    scene: "insight",
    caption: `Now the ${coin}-coin joins. Stone ${stone} already has ${plural(had, "way")}. Every way to reach stone ${stone - coin}, plus one ${coin}-coin hop, is a new way.`,
    state: { ...blank(input), tryCoin: coin, marks: [...mid], tones: mid.map((_, index) => (index === stone ? "edge" : index === stone - coin ? "window" : "idle") as CellTone), here: stone, hops: [{ from: stone - coin, to: stone, coin, tone: "try", level: 0 }] },
  });
  const added = [...mid];
  added[stone] = had + behind;
  frames.push({
    scene: "insight",
    caption: `So stone ${stone} adds them: ${had} + ${behind} = ${had + behind}. The ${coin}-coin always comes after the smaller coins, so each group is built in one order only.`,
    state: { ...blank(input), tryCoin: coin, marks: added, tones: added.map((_, index) => (index === stone ? "done" : "idle") as CellTone), here: stone, hops: [{ from: stone - coin, to: stone, coin, tone: "best", level: 0 }] },
  });
  return frames;
}

function hopFromQuiz(cells: number, stone: number, coin: number): StoryQuiz {
  const feedback: Record<number, string> = { [stone]: "That is the stone being filled. The ways come from a stone further back." };
  if (coin !== 1) feedback[stone - 1] = `That is only one stone back. The ${coin}-coin is a longer hop.`;
  return {
    kind: "cell",
    cells,
    numbered: cells <= 10,
    question: `On the ${coin}-coin's pass, stone ${stone} adds the ways of one earlier stone. Click that stone.`,
    answer: stone - coin,
    feedback,
    otherwise: "Count back from the stone being filled, one stone for each unit of the coin.",
    why: `A ${coin}-coin hop covers ${plural(coin, "stone")}, so stone ${stone} adds the ways of stone ${stone - coin}.`,
  };
}

function loopQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "Order does not matter here. Which loop goes on the outside?",
    options: ["The coins: each coin makes one pass over the stones", "The stones: each stone tries every coin"],
    answer: 0,
    why: "Coins outside means a coin only joins after the smaller ones, so 1 + 2 and 2 + 1 are one group.",
  };
}

/**
 * The real algorithm, pass by pass. The first stones of a pass are told one by one; the rest of the pass
 * is summed up in one frame. `practice` asks at the start of every pass.
 */
function passFrames(input: Input, scene: SceneId, practice: boolean): CoinFrame[] {
  const { coins, amount } = input;
  const frames: CoinFrame[] = [];
  const ways = Array.from({ length: amount + 1 }, () => 0);
  const touched: boolean[] = Array.from({ length: amount + 1 }, () => false);
  const line = (index: number) => (practice ? undefined : index);
  const at = (coin: number | null, stone: number | null, extra: Partial<CoinChangeState> = {}): CoinChangeState => {
    const state: CoinChangeState = {
      ...blank(input),
      marks: ways.map((value, index) => (index === 0 || touched[index] ? value : null)),
      tones: ways.map((value, index) => (index === stone ? "edge" : touched[index] || index === 0 ? (value > 0 ? "hit" : "idle") : "idle") as CellTone),
      tryCoin: coin,
      here: stone,
      ...extra,
    };
    return state;
  };

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new bridge: pay ${amount} with coins of ${listOf(coins)}. Order does not matter.`
      : `Lay out one stone for every amount from 0 to ${amount}. Each stone will count the ways to reach it.`,
    codeLine: line(0),
    state: at(null, null),
    quiz: practice ? loopQuiz() : undefined,
  });
  ways[0] = 1;
  frames.push({
    scene,
    caption: "Stone 0 holds 1: there is exactly one way to pay nothing, with no coins at all.",
    codeLine: line(1),
    state: at(null, 0),
  });

  let askedHop = false;
  coins.forEach((coin, k) => {
    if (coin > amount) {
      frames.push({
        scene,
        caption: `The ${coin}-coin joins, but it is a longer hop than the whole bridge. Its pass changes no stone.`,
        codeLine: line(2),
        state: at(coin, null),
      });
      return;
    }
    frames.push({
      scene,
      caption: `Pass ${k + 1}: the ${coin}-coin joins. Its pass starts on stone ${coin}, the first stone a ${coin}-coin hop can reach.`,
      codeLine: line(2),
      state: at(coin, coin),
    });
    const stones = Array.from({ length: amount - coin + 1 }, (_, index) => coin + index);
    const detailed = new Set(practice ? stones.slice(0, 2) : [...stones.slice(0, 2), amount]);
    let group: number[] = [];
    const flush = () => {
      if (group.length === 0) return;
      const last = group.at(-1)!;
      frames.push({
        scene,
        caption:
          group.length === 1
            ? `The next stone works the same way: stone ${group[0]} adds the stone one ${coin}-coin hop behind it, and now holds ${ways[group[0]]}.`
            : `The next stones work the same way: each adds the stone one ${coin}-coin hop behind it. Stones ${listOf(group)} now hold ${listOf(group.map((stone) => ways[stone]))}.`,
        codeLine: line(4),
        state: at(coin, last, { hops: group.map((stone) => ({ from: stone - coin, to: stone, coin, tone: "best" as const, level: 0 })).slice(-1) }),
      });
      group = [];
    };
    for (const stone of stones) {
      if (!detailed.has(stone)) {
        ways[stone] += ways[stone - coin];
        touched[stone] = true;
        group.push(stone);
        continue;
      }
      flush();
      const hop: CoinHop = { from: stone - coin, to: stone, coin, tone: "try", level: 0 };
      const behind = ways[stone - coin];
      const had = ways[stone];
      const ask = practice ? stone - coin > 0 || stones.length === 1 : !askedHop && coin > 1 && stone - coin > 0;
      if (ask) {
        askedHop = true;
        frames.push({
          scene,
          caption: `The ring is on stone ${stone}. It has ${plural(had, "way")} so far.`,
          codeLine: line(4),
          state: at(coin, stone),
          quiz: hopFromQuiz(amount + 1, stone, coin),
        });
      }
      ways[stone] += behind;
      touched[stone] = true;
      frames.push({
        scene,
        caption:
          behind === 0
            ? `Stone ${stone - coin} has no way yet, so the ${coin}-coin hop adds nothing. Stone ${stone} stays at ${ways[stone]}.`
            : `Stone ${stone} adds the ways of stone ${stone - coin}: ${had} + ${behind} = ${ways[stone]}.`,
        codeLine: line(4),
        state: at(coin, stone, { hops: [{ ...hop, tone: behind === 0 ? "faded" : "best" }] }),
      });
    }
    flush();
  });
  return frames;
}

function finished(input: Input, ways: number[]): CoinChangeState {
  const state = blank(input);
  return {
    ...state,
    marks: [...ways],
    tones: ways.map((value, index) => (index === input.amount ? "done" : value > 0 ? "hit" : "idle") as CellTone),
    bestNote: `ways: ${ways[input.amount]}`,
  };
}

function trapState(input: Input, ways: number[]): CoinChangeState {
  const wrong = amountsOutside(input);
  return {
    ...finished(input, ways),
    marks: [...wrong],
    tones: wrong.map((value, index) => (value !== ways[index] ? "miss" : "idle") as CellTone),
    trapNote: `✕ stones outside: ${wrong[input.amount]}   ·   coins outside: ${ways[input.amount]}`,
  };
}

function solutionFrames(input: Input, ways: number[], slow: SlowRun): CoinFrame[] {
  const { coins, amount } = input;
  const frames = passFrames(input, "solution", false);
  const answer = ways[amount];
  frames.push({
    scene: "solution",
    caption: `Every coin has joined. Stone ${amount} counts every group of coins once. The answer is ${answer}.`,
    codeLine: 7,
    state: { ...finished(input, ways), here: amount },
  });
  const wrong = amountsOutside(input)[amount];
  frames.push({
    scene: "solution",
    caption:
      wrong !== answer
        ? `The Double Count Trap: swap the two loops, stones outside and coins inside, and stone ${amount} counts ${wrong}. Orders like 1 + 2 and 2 + 1 count twice.`
        : `Swapping the loops gives ${wrong} here too. With two different coins that fit, it counts 1 + 2 and 2 + 1 twice: the Double Count Trap.`,
    codeLine: 2,
    state: trapState(input, ways),
  });
  const passes = coins.reduce((sum, coin) => sum + Math.max(0, amount - coin + 1), 0);
  frames.push({
    scene: "solution",
    caption: `Time: O(amount × coins). Each of the ${coins.length} coins made one pass over at most ${amount} stones: ${passes} additions. The slow way made ${slow.capped ? `over ${SLOW_CAP}` : slow.calls} calls.`,
    codeLine: 3,
    state: { ...finished(input, ways), counter: { label: "additions", value: String(passes) } },
  });
  frames.push({
    scene: "solution",
    caption: `Space: O(amount). One row of ${amount + 1} stones, written over on every pass.`,
    codeLine: 0,
    state: { ...finished(input, ways), tones: ways.map(() => "window" as CellTone) },
  });
  return frames;
}

function practiceFrames(input: Input): CoinFrame[] {
  const { ways } = solve(input);
  const frames = passFrames(input, "card", true);
  const answer = ways[input.amount];
  frames.push({
    scene: "card",
    caption: `Stone ${input.amount} holds ${answer}, so the answer is ${answer}. With the stones outside it would say ${amountsOutside(input)[input.amount]}: the Double Count Trap.`,
    state: trapState(input, ways),
  });
  return frames;
}

export const coinChangeIIStory: ProblemStory<CoinChangeState> = {
  slugs: ["lc-518"],
  pattern: "Unbounded knapsack count",
  trigger: "how many combinations make an amount, coins may be reused, and order does not matter",
  insight: "Coins join the bridge one kind at a time. On a coin's pass, each stone adds the ways of the stone one coin behind it. Coins on the outside count each group once.",
  metaphor: {
    name: "One coin per pass",
    legend: "stone = ways[a] · pass = the outer loop over coins · hop = a - coin → a",
    terms: ["stone", "pass", "coin", "hop", "ways"],
  },
  traps: [{ name: "The Double Count Trap", rule: "Put the coins on the outside. Each coin is only added after the smaller ones, so every group is counted once." }],
  template: [
    "ways[0] = 1;                       // one way to pay nothing",
    "for each coin:                     // coins OUTSIDE",
    "    for a from coin up to amount:",
    "        ways[a] += ways[a - coin];",
    "return ways[amount];",
  ],
  complexity: {
    slow: "O(2^(amount + coins))",
    time: "O(amount × coins)",
    timeWhy: "each coin makes one pass over the stones",
    space: "O(amount)",
    spaceWhy: "one row of stones, written over on every pass",
  },
  code: CODE,
  examples: [
    { label: "5 with 1, 2, 5", input: "amount=5, coins=[1,2,5]", expected: "4", note: "Tricky: 1 + 2 + 2 and 2 + 1 + 2 are one way" },
    { label: "4 with 1, 2, 3", input: "amount=4, coins=[1,2,3]", expected: "4", note: "Compare with Combination Sum IV, which counts 7" },
    { label: "3 with 2", input: "amount=3, coins=[2]", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-322", title: "Coin Change" },
    { slug: "lc-377", title: "Combination Sum IV" },
    { slug: "lc-416", title: "Partition Equal Subset Sum" },
  ],
  answer: (raw) => String(groups(parseInput(raw)).length),
  frames: (raw) => {
    const input = parseInput(raw);
    const { ways, after } = solve(input);
    const slow = runSlow(input);
    return [
      ...pictureFrames(input, ways[input.amount]),
      ...slowFrames(input, slow),
      ...insightFrames(input, after),
      ...solutionFrames(input, ways, slow),
      ...practiceFrames(parseInput(PRACTICE)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: finished(input, ways),
      },
    ];
  },
  View: CoinChangeView,
};
