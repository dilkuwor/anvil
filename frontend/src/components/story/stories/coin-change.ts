import type { CellTone } from "@/components/learn/viz/primitives";

import { CoinChangeView, type CoinChangeState, type CoinHop, type StoneMark } from "../coin-change-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type CoinFrame = StoryFrame<CoinChangeState>;
type Input = { coins: number[]; amount: number };

/** Fresh bridge for the "your turn" run. Biggest-coin-first pays 5, 1, 1, 1 here; the best is 4, 4. */
const PRACTICE = "coins=[1,4,5], amount=8";

const CODE = [
  "int[] dp = new int[amount + 1];",
  "Arrays.fill(dp, amount + 1);",
  "dp[0] = 0;",
  "for (int i = 1; i <= amount; i++) {",
  "    for (int c : coins) {",
  "        if (c <= i) {",
  "            dp[i] = Math.min(dp[i], dp[i - c] + 1);",
  "        }",
  "    }",
  "}",
  "return dp[amount] > amount ? -1 : dp[amount];",
];

/** The slow way stops counting here, so a large input cannot freeze the page. */
const SLOW_CAP = 20000;

function parseInput(raw: string): Input {
  const list = raw.match(/\[([^\]]*)\]/)?.[1] ?? "";
  const coins = [...new Set(list.split(",").map((part) => Number.parseInt(part.trim(), 10)).filter((coin) => coin > 0))].sort((a, b) => a - b);
  const amount = Number.parseInt(raw.match(/amount\s*=\s*(\d+)/)?.[1] ?? "", 10);
  if (coins.length === 0 || Number.isNaN(amount)) return { coins: [1, 3, 4], amount: 6 };
  return { coins, amount };
}

type Table = {
  /** Fewest coins per stone. Infinity = cannot be reached. */
  need: number[];
  /** The coin of the first cheapest hop onto each stone. */
  via: (number | null)[];
  tries: number;
};

function solve({ coins, amount }: Input): Table {
  const need = Array.from({ length: amount + 1 }, () => Infinity);
  const via: (number | null)[] = Array.from({ length: amount + 1 }, () => null);
  need[0] = 0;
  let tries = 0;
  for (let stone = 1; stone <= amount; stone++) {
    for (const coin of coins) {
      tries++;
      if (coin <= stone && need[stone - coin] + 1 < need[stone]) {
        need[stone] = need[stone - coin] + 1;
        via[stone] = coin;
      }
    }
  }
  return { need, via, tries };
}

/** The coins of the best path, first hop first. Empty when the last stone cannot be reached. */
function bestCoins({ amount }: Input, table: Table): number[] {
  const path: number[] = [];
  let stone = amount;
  while (stone > 0) {
    const coin = table.via[stone];
    if (coin === null) return [];
    path.unshift(coin);
    stone -= coin;
  }
  return path;
}

/** The trap: always grab the biggest coin that still fits. */
function greedyCoins({ coins, amount }: Input): { path: number[]; reached: boolean } {
  const path: number[] = [];
  let rest = amount;
  while (rest > 0) {
    const coin = [...coins].reverse().find((candidate) => candidate <= rest);
    if (coin === undefined) break;
    path.push(coin);
    rest -= coin;
  }
  return { path, reached: rest === 0 };
}

function chain(path: number[], tone: CoinHop["tone"], below = false): CoinHop[] {
  let at = 0;
  return path.map((coin) => {
    const hop: CoinHop = { from: at, to: at + coin, coin, tone, level: 0, below };
    at += coin;
    return hop;
  });
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function listOf(items: (string | number)[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

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

function finished(input: Input, table: Table): CoinChangeState {
  const path = bestCoins(input, table);
  const onPath = new Set(chain(path, "best").flatMap((hop) => [hop.from, hop.to]));
  return {
    ...blank(input),
    marks: table.need.map((need) => (Number.isFinite(need) ? need : "none")),
    tones: table.need.map((need, stone) => (onPath.has(stone) ? "done" : Number.isFinite(need) ? "hit" : "faded")),
    hops: chain(path, "best"),
  };
}

function pictureFrames(input: Input, table: Table, firstWay: number[] | null): CoinFrame[] {
  const { coins, amount } = input;
  const frames: CoinFrame[] = [
    {
      scene: "picture",
      caption: `We must pay exactly ${amount}, using coins of ${listOf(coins)}. Each coin may be used as often as we like. Picture the amounts 0 to ${amount} as stepping stones.`,
      state: blank(input),
    },
  ];
  if (firstWay) {
    frames.push({
      scene: "picture",
      caption: `A coin is a hop of that many stones. One allowed way: ${firstWay.join(", ")}. It lands exactly on stone ${amount}, using ${plural(firstWay.length, "coin")}.`,
      state: { ...blank(input), hops: chain(firstWay, "try") },
    });
  } else {
    frames.push({
      scene: "picture",
      caption: `A coin is a hop of that many stones. Here no mix of hops lands exactly on stone ${amount}.`,
      state: { ...blank(input), hops: chain(coins[0] <= amount ? [coins[0]] : [], "try") },
    });
  }
  const tooFar = [...coins].reverse().find((coin) => amount % coin !== 0);
  if (tooFar !== undefined) {
    const before = Array.from({ length: Math.floor(amount / tooFar) }, () => tooFar);
    frames.push({
      scene: "picture",
      caption: `Not allowed: ${[...before, tooFar].join(", ")} jumps past stone ${amount}. We must land exactly on it.`,
      state: { ...blank(input), hops: chain(before, "try"), overshoot: { from: before.length * tooFar, coin: tooFar } },
    });
  }
  const goal = blank(input);
  goal.tones[amount] = "done";
  frames.push({
    scene: "picture",
    caption: `The goal: land exactly on stone ${amount} with the fewest coins. If no mix of coins can land there, the answer is -1.`,
    state: Number.isFinite(table.need[amount]) ? { ...goal, bestNote: `fewest coins: ${table.need[amount]}` } : goal,
  });
  return frames;
}

type SlowRun = { hops: number; capped: boolean; ends: { path: number[]; landed: boolean; hopsSoFar: number }[] };

/** Really tries every order of coins, counting every hop it makes. */
function runSlow({ coins, amount }: Input): SlowRun {
  const run: SlowRun = { hops: 0, capped: false, ends: [] };
  const path: number[] = [];
  const walk = (rest: number) => {
    if (run.capped) return;
    let moved = false;
    for (const coin of coins) {
      if (coin > rest) continue;
      if (run.hops >= SLOW_CAP) {
        run.capped = true;
        return;
      }
      moved = true;
      run.hops++;
      path.push(coin);
      walk(rest - coin);
      path.pop();
    }
    if ((rest === 0 || !moved) && run.ends.length < 2) run.ends.push({ path: [...path], landed: rest === 0, hopsSoFar: run.hops });
  };
  walk(amount);
  return run;
}

function slowFrames(input: Input, table: Table, run: SlowRun): CoinFrame[] {
  const { amount } = input;
  const frames: CoinFrame[] = [];
  run.ends.forEach((end, index) => {
    const result = end.landed ? `It lands on stone ${amount} with ${plural(end.path.length, "coin")}.` : `It gets stuck on stone ${end.path.reduce((sum, coin) => sum + coin, 0)}.`;
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: try every possible order of coins, one full path at a time. First path: ${end.path.join(", ")}. ${result}`
          : `Step back one hop, swap in another coin, and go again: ${end.path.join(", ")}. ${result}`,
      state: { ...blank(input), hops: chain(end.path, "try"), counter: { label: "hops tried", value: String(end.hopsSoFar) } },
    });
  });
  const total = run.capped ? `more than ${SLOW_CAP} hops` : plural(run.hops, "hop");
  const found = Number.isFinite(table.need[amount]) ? `The fewest coins was ${table.need[amount]}.` : "No path ever landed.";
  frames.push({
    scene: "slow",
    caption: `Every path tried: ${total}, for a bridge of only ${plural(amount, "stone")}. ${found} Each extra stone multiplies the work: this is O(coins^amount) time.`,
    state: { ...blank(input), tones: blank(input).tones.map(() => "faded" as CellTone), counter: { label: "hops tried", value: run.capped ? `${SLOW_CAP}+` : String(run.hops) } },
  });
  return frames;
}

function insightFrames(input: Input): CoinFrame[] {
  const { coins, amount } = input;
  const fits = coins.filter((coin) => coin <= amount);
  if (fits.length === 0) {
    return [{ scene: "insight", caption: `Picture stepping stones across a river. Every coin is a bigger hop than the whole bridge, so stone ${amount} can never be reached.`, state: blank(input) }];
  }
  const bySpan = [...fits].sort((a, b) => a - b);
  const hops: CoinHop[] = fits.map((coin) => ({ from: amount - coin, to: amount, coin, tone: "try", level: bySpan.indexOf(coin) }));
  const starts = fits.map((coin) => amount - coin);
  const asked = { ...blank(input), here: amount };
  asked.tones[amount] = "edge";
  const ready = { ...asked, hops, tones: [...asked.tones] };
  for (const start of starts) ready.tones[start] = "window";
  return [
    {
      scene: "insight",
      caption: `Stand on the last stone, ${amount}, and ask one small question: where did the last hop come from?`,
      state: asked,
    },
    {
      scene: "insight",
      caption:
        fits.length > 1
          ? `The last hop is one coin. So it started on one of these stones: ${starts.slice(0, -1).join(", ")} or ${starts.at(-1)}, one for each coin. Nowhere else.`
          : `The last hop is one coin. So it started on stone ${starts[0]}. Nowhere else.`,
      state: ready,
    },
    {
      scene: "insight",
      caption: `So stone ${amount} costs ${fits.length > 1 ? "the cheapest of those stones" : `whatever stone ${starts[0]} costs`}, plus 1 coin. Every stone works the same way, so we fill the bridge from stone 0 forward, once.`,
      state: { ...ready, hops: hops.map((hop) => ({ ...hop, tone: "best" as const })) },
    },
  ];
}

type Option = { coin: number; from: number; cost: number };

function whichHopQuiz(cells: number, numbered: boolean, stone: number, options: Option[], best: Option, biggest: number): StoryQuiz {
  const feedback: Record<number, string> = { [stone]: "That is the stone we stand on. Pick the stone the best hop starts from." };
  for (const option of options) {
    if (option.from === best.from) continue;
    feedback[option.from] = !Number.isFinite(option.cost)
      ? `Stone ${option.from} shows a dash: it cannot be reached, so no hop can start there.`
      : option.coin === biggest
        ? `That is the biggest coin: the Greedy Trap. Stone ${option.from} already took ${plural(option.cost - 1, "coin")}, so this hop costs ${option.cost}.`
        : `Stone ${option.from} already took ${plural(option.cost - 1, "coin")}, so this hop costs ${option.cost}. Another hop is cheaper.`;
  }
  return {
    kind: "cell",
    cells,
    numbered,
    question: `${plural(options.length, "hop")} can land on stone ${stone}. Which one uses the fewest coins? Click the stone it starts from.`,
    answer: best.from,
    feedback,
    otherwise: "No hop lands here from that stone. Pick a stone where one of the arcs starts.",
    why: `Stone ${best.from} took the fewest coins, ${best.cost - 1}. One more hop makes ${best.cost}.`,
  };
}

function hopFromQuiz(cells: number, numbered: boolean, stone: number, coin: number): StoryQuiz {
  const feedback: Record<number, string> = { [stone]: "That is the stone we stand on. The hop starts further back." };
  if (coin !== 1) feedback[stone - 1] = `That is only one stone back. The ${coin}-coin is a longer hop.`;
  return {
    kind: "cell",
    cells,
    numbered,
    question: `We stand on stone ${stone} and try the ${coin}-coin. Which stone does that hop start from? Click it.`,
    answer: stone - coin,
    feedback,
    otherwise: "Count back from the stone we stand on, one stone for each unit of the coin.",
    why: `A ${coin}-coin hop covers ${plural(coin, "stone")}, so it starts ${plural(coin, "stone")} back.`,
  };
}

/**
 * The real algorithm. Goes coin by coin only where something new happens, and sums up every other stone in one frame.
 */
function solutionFrames(input: Input, table: Table, slow: SlowRun): CoinFrame[] {
  const { coins, amount } = input;
  const cells = amount + 1;
  const numbered = amount <= 9;
  const frames: CoinFrame[] = [];
  const need = Array.from({ length: cells }, () => Infinity);
  const marks: StoneMark[] = Array.from({ length: cells }, () => "none");
  const tones: CellTone[] = Array.from({ length: cells }, () => "idle");
  const at = (stone: number | null, extra: Partial<CoinChangeState> = {}): CoinChangeState => {
    const state = { ...blank(input), marks: [...marks], tones: [...tones], here: stone, ...extra };
    if (stone !== null && state.tones[stone] === "idle") state.tones[stone] = "edge";
    return state;
  };
  const settle = (stone: number) => {
    marks[stone] = Number.isFinite(need[stone]) ? need[stone] : "none";
    tones[stone] = Number.isFinite(need[stone]) ? "hit" : "faded";
  };
  const optionsFor = (stone: number): Option[] => coins.filter((coin) => coin <= stone).map((coin) => ({ coin, from: stone - coin, cost: need[stone - coin] + 1 }));
  const fan = (options: Option[], paint: (option: Option) => CoinHop["tone"]): CoinHop[] =>
    options.map((option, index) => ({ from: option.from, to: option.from + option.coin, coin: option.coin, tone: paint(option), level: index }));

  // Decide, from the finished table, how each stone is told.
  const usableAt = (stone: number) => coins.filter((coin) => coin <= stone && Number.isFinite(table.need[stone - coin])).map((coin) => table.need[stone - coin]);
  const clearWinner = (stone: number) => {
    const usable = usableAt(stone);
    return usable.length >= 2 && usable.filter((value) => value === Math.min(...usable)).length === 1;
  };
  const firstFit = new Set([1, ...coins]);
  const stones = Array.from({ length: amount }, (_, index) => index + 1);
  // The "pick the cheapest hop" question goes to the stone nearest the end that has a single right answer.
  const choiceStone = [...stones].reverse().find((stone) => clearWinner(stone) && (stone === amount || !firstFit.has(stone))) ?? null;
  const kindOf = (stone: number): "dead" | "choice" | "all" | "detail" | "summary" => {
    if (usableAt(stone).length === 0) return "dead";
    if (stone === choiceStone) return "choice";
    if (stone === amount && usableAt(stone).length >= 2) return "all";
    return firstFit.has(stone) || stone === amount ? "detail" : "summary";
  };
  // The "where does this hop start?" question goes to the first try that is not simply "from stone 0".
  const tryList = stones.filter((stone) => kindOf(stone) === "detail").flatMap((stone) => coins.filter((coin) => coin <= stone).map((coin) => ({ stone, coin })));
  const askAt = tryList.find((item) => item.coin > 1 && item.stone > item.coin) ?? tryList.find((item) => item.stone > item.coin) ?? tryList[0] ?? null;

  frames.push({
    scene: "solution",
    caption: `Lay out one stone for every amount from 0 to ${amount}. Each stone will hold the fewest coins that reach it. For now each shows a dash: no way yet.`,
    codeLine: 1,
    state: at(null),
  });
  need[0] = 0;
  settle(0);
  frames.push({ scene: "solution", caption: "Stone 0 is the start of the bridge. Nothing is paid yet, so it takes 0 coins.", codeLine: 2, state: at(0) });

  for (const stone of stones) {
    const options = optionsFor(stone);
    const usable = options.filter((option) => Number.isFinite(option.cost));
    const cheapest = Math.min(...usable.map((option) => option.cost));
    const winners = usable.filter((option) => option.cost === cheapest);

    const kind = kindOf(stone);

    if (kind === "dead") {
      settle(stone);
      frames.push({
        scene: "solution",
        caption:
          options.length === 0
            ? `Stone ${stone}: every coin is a longer hop than ${stone}, so none can land here. It keeps its dash: no way.`
            : `Stone ${stone}: the only ${options.length === 1 ? "hop" : "hops"} here would start from stone ${listOf(options.map((option) => option.from))}, which cannot be reached. So stone ${stone} keeps its dash too.`,
        codeLine: options.length === 0 ? 5 : 6,
        state: at(stone, { hops: fan(options, () => "faded") }),
      });
      continue;
    }

    if (kind === "choice") {
      const best = winners[0];
      frames.push({
        scene: "solution",
        caption: `${stone === amount ? `Now the last stone, ${stone}.` : `Stone ${stone}.`} ${plural(options.length, "hop")} can land here. Each costs the coins of the stone it starts from, plus 1.`,
        codeLine: 4,
        state: at(stone, { hops: fan(options, (option) => (Number.isFinite(option.cost) ? "try" : "faded")) }),
        quiz: whichHopQuiz(cells, numbered, stone, options, best, Math.max(...options.map((option) => option.coin))),
      });
      need[stone] = best.cost;
      settle(stone);
      frames.push({
        scene: "solution",
        caption: `The ${best.coin}-coin hop from stone ${best.from} wins: ${best.cost - 1} + 1 = ${best.cost}. Stone ${stone} takes ${plural(best.cost, "coin")}.`,
        codeLine: 6,
        state: at(stone, { hops: fan(options, (option) => (option === best ? "best" : "faded")) }),
      });
      continue;
    }

    if (kind === "all") {
      frames.push({
        scene: "solution",
        caption: `Now the last stone, ${stone}. ${plural(usable.length, "hop")} can land here, from stones ${listOf(usable.map((option) => option.from))}.`,
        codeLine: 4,
        state: at(stone, { hops: fan(options, (option) => (Number.isFinite(option.cost) ? "try" : "faded")) }),
      });
      need[stone] = cheapest;
      settle(stone);
      frames.push({
        scene: "solution",
        caption:
          winners.length > 1
            ? `Stones ${listOf(winners.map((option) => option.from))} tie at ${plural(cheapest - 1, "coin")}. Either hop makes ${cheapest}, so stone ${stone} takes ${plural(cheapest, "coin")}.`
            : `The cheapest start is stone ${winners[0].from}, with ${plural(cheapest - 1, "coin")}. One more hop makes ${cheapest}, so stone ${stone} takes ${plural(cheapest, "coin")}.`,
        codeLine: 6,
        state: at(stone, { hops: fan(options, (option) => (option.cost === cheapest ? "best" : "faded")) }),
      });
      continue;
    }

    if (kind === "summary") {
      const best = winners[0];
      need[stone] = best.cost;
      settle(stone);
      frames.push({
        scene: "solution",
        caption:
          options.length === 1
            ? `Stone ${stone}: only the ${best.coin}-coin hop can land here, from stone ${best.from}. That makes ${plural(best.cost, "coin")}.`
            : `Stone ${stone}: the best hop is the ${best.coin}-coin from stone ${best.from}. That makes ${plural(best.cost, "coin")}.`,
        codeLine: 6,
        state: at(stone, { hops: [{ from: best.from, to: stone, coin: best.coin, tone: "best", level: 0 }] }),
      });
      continue;
    }

    // Coin by coin: this stone shows something new.
    for (const option of options) {
      const hop: CoinHop = { from: option.from, to: stone, coin: option.coin, tone: "try", level: 0 };
      if (askAt && askAt.stone === stone && askAt.coin === option.coin) {
        frames.push({
          scene: "solution",
          caption: `We stand on stone ${stone} and try the ${option.coin}-coin.`,
          codeLine: 5,
          state: at(stone, { tryCoin: option.coin }),
          quiz: hopFromQuiz(cells, numbered, stone, option.coin),
        });
      }
      if (!Number.isFinite(option.cost)) {
        frames.push({
          scene: "solution",
          caption: `The ${option.coin}-coin hop would start from stone ${option.from}. But stone ${option.from} cannot be reached, so this hop is no use.`,
          codeLine: 6,
          state: at(stone, { tryCoin: option.coin, hops: [{ ...hop, tone: "faded" }] }),
        });
        continue;
      }
      const before = need[stone];
      const sum = `${option.cost - 1} + 1 = ${option.cost}`;
      if (option.cost >= before) {
        frames.push({
          scene: "solution",
          caption: `The ${option.coin}-coin hop lands on stone ${stone} from stone ${option.from}: ${sum}. That does not beat ${before}, so nothing changes.`,
          codeLine: 6,
          state: at(stone, { tryCoin: option.coin, hops: [hop] }),
        });
        continue;
      }
      frames.push({
        scene: "solution",
        caption: `The ${option.coin}-coin hop lands on stone ${stone} from stone ${option.from}, which took ${plural(option.cost - 1, "coin")}. One more coin: ${sum}.`,
        codeLine: 6,
        state: at(stone, { tryCoin: option.coin, hops: [hop] }),
      });
      need[stone] = option.cost;
      marks[stone] = option.cost;
      frames.push({
        scene: "solution",
        caption: Number.isFinite(before) ? `New best for stone ${stone}: ${option.cost} beats ${before}.` : `Stone ${stone} had no way yet, so ${option.cost} is its best so far.`,
        codeLine: 6,
        state: at(stone, { tryCoin: option.coin, hops: [{ ...hop, tone: "best" }] }),
      });
    }
    settle(stone);
    const tooBig = coins.filter((coin) => coin > stone);
    if (stone === 1 && tooBig.length > 0) {
      frames.push({
        scene: "solution",
        caption: `The ${listOf(tooBig.map((coin) => `${coin}-coin`))} would have to start before stone 0, so ${tooBig.length === 1 ? "it" : "they"} cannot land on stone ${stone}.`,
        codeLine: 5,
        state: at(stone),
      });
    }
  }

  const answer = Number.isFinite(need[amount]) ? need[amount] : -1;
  const best = bestCoins(input, table);
  const done = finished(input, table);
  frames.push({
    scene: "solution",
    caption:
      answer === -1
        ? `Stone ${amount} still shows a dash: no mix of hops can land on it. So the answer is -1.`
        : `The bridge is full. The last stone takes ${plural(answer, "coin")}: ${best.join(" + ")}. The answer is ${answer}.`,
    codeLine: 10,
    state: answer === -1 ? { ...done, here: amount } : { ...done, bestNote: `fewest coins: ${answer}` },
  });

  const greedy = greedyCoins(input);
  if (answer !== -1 && (!greedy.reached || greedy.path.length > answer)) {
    const spent = greedy.path.reduce((sum, coin) => sum + coin, 0);
    const trapState: CoinChangeState = {
      ...done,
      hops: [...chain(best, "best"), ...chain(greedy.path, "trap", true)],
      bestNote: `fewest coins: ${answer}`,
      trapNote: greedy.reached ? `biggest coin first: ${plural(greedy.path.length, "coin")}` : `biggest coin first: stuck on stone ${spent}`,
    };
    frames.push({
      scene: "solution",
      caption: `The Greedy Trap: always grabbing the biggest coin that fits. Here that path is ${greedy.path.join(", ")}: ${greedy.reached ? `${plural(greedy.path.length, "coin")}, not ${answer}` : `it gets stuck on stone ${spent}`}.`,
      codeLine: 4,
      state: trapState,
    });
    frames.push({
      scene: "solution",
      caption: "A big first hop can leave an awkward rest of the bridge. That is why every stone tries every coin, and keeps the cheapest.",
      codeLine: 6,
      state: trapState,
    });
  }

  const slowHops = slow.capped ? `more than ${SLOW_CAP} hops` : plural(slow.hops, "hop");
  const each = coins.length === 1 ? "the one coin" : `each of the ${coins.length} coins`;
  frames.push({
    scene: "solution",
    caption: `Time: O(amount × coins). Each of the ${plural(amount, "stone")} tried ${each} once: ${table.tries} tries.${slow.capped || slow.hops > table.tries ? ` The slow way made ${slowHops}.` : ""}`,
    codeLine: 4,
    state: { ...done, counter: { label: "coin tries", value: String(table.tries) } },
  });
  frames.push({
    scene: "solution",
    caption: `Space: O(amount). We keep one number per stone: ${cells} stones, ${cells} numbers.`,
    codeLine: 0,
    state: { ...done, hops: [], tones: done.tones.map(() => "done" as CellTone) },
  });
  return frames;
}

/** The "your turn" run: the reader picks the cheapest hop at every stone that has a real choice. */
function practiceFrames(input: Input, table: Table): CoinFrame[] {
  const { coins, amount } = input;
  const cells = amount + 1;
  const numbered = amount <= 9;
  const frames: CoinFrame[] = [];
  const marks: StoneMark[] = Array.from({ length: cells }, () => null);
  const tones: CellTone[] = Array.from({ length: cells }, () => "idle");
  marks[0] = 0;
  tones[0] = "hit";
  const at = (stone: number | null, hops: CoinHop[] = []): CoinChangeState => {
    const state = { ...blank(input), marks: [...marks], tones: [...tones], here: stone, hops };
    if (stone !== null && state.tones[stone] === "idle") state.tones[stone] = "edge";
    return state;
  };
  const settle = (stone: number) => {
    marks[stone] = Number.isFinite(table.need[stone]) ? table.need[stone] : "none";
    tones[stone] = Number.isFinite(table.need[stone]) ? "hit" : "faded";
  };

  frames.push({
    scene: "card",
    caption: `Your turn, on a new bridge: coins of ${listOf(coins)}, and we must land on stone ${amount}. At every stone with a choice, you pick the hop.`,
    state: at(null),
  });

  // Stones with nothing to choose are told together, in one frame.
  let plain: number[] = [];
  let plainWhy: "single" | "tie" = "single";
  const flush = () => {
    if (plain.length === 0) return;
    for (const stone of plain) settle(stone);
    const values = plain.map((stone) => (Number.isFinite(table.need[stone]) ? table.need[stone] : "a dash"));
    const last = plain.at(-1)!;
    const via = table.via[last];
    frames.push({
      scene: "card",
      caption:
        plain.length === 1
          ? `Stone ${last} has nothing to choose: it takes ${values[0]}${typeof values[0] === "number" ? ` ${values[0] === 1 ? "coin" : "coins"}` : ""}.`
          : `Stones ${plain.length === 2 ? `${plain[0]} and ${last}` : `${plain[0]} to ${last}`}: ${plainWhy === "single" ? "only one hop can land on each" : "the cheapest hops tie"}, so there is nothing to choose. They take ${listOf(values)} coins.`,
      state: at(last, via === null ? [] : [{ from: last - via, to: last, coin: via, tone: "best", level: 0 }]),
    });
    plain = [];
  };

  for (let stone = 1; stone <= amount; stone++) {
    const options: Option[] = coins.filter((coin) => coin <= stone).map((coin) => ({ coin, from: stone - coin, cost: table.need[stone - coin] + 1 }));
    const usable = options.filter((option) => Number.isFinite(option.cost));
    const cheapest = Math.min(...usable.map((option) => option.cost));
    const winners = usable.filter((option) => option.cost === cheapest);
    if (usable.length < 2 || winners.length !== 1) {
      const why = usable.length < 2 ? "single" : "tie";
      if (why !== plainWhy) flush();
      plainWhy = why;
      plain.push(stone);
      continue;
    }
    flush();
    const best = winners[0];
    const biggest = Math.max(...options.map((option) => option.coin));
    const fan = (paint: (option: Option) => CoinHop["tone"]): CoinHop[] => options.map((option, index) => ({ from: option.from, to: stone, coin: option.coin, tone: paint(option), level: index }));
    frames.push({
      scene: "card",
      caption: `Stone ${stone}. ${plural(options.length, "hop")} can land here. Each costs the coins of the stone it starts from, plus 1.`,
      state: at(stone, fan((option) => (Number.isFinite(option.cost) ? "try" : "faded"))),
      quiz: whichHopQuiz(cells, numbered, stone, options, best, biggest),
    });
    settle(stone);
    frames.push({
      scene: "card",
      caption:
        best.coin === biggest
          ? `The ${best.coin}-coin hop from stone ${best.from} wins: ${best.cost - 1} + 1 = ${best.cost}. Stone ${stone} takes ${plural(best.cost, "coin")}.`
          : `The ${best.coin}-coin hop from stone ${best.from} wins: ${best.cost - 1} + 1 = ${best.cost}. The biggest coin, ${biggest}, would have cost ${options.find((option) => option.coin === biggest)!.cost}.`,
      state: at(stone, fan((option) => (option === best ? "best" : "faded"))),
    });
  }
  flush();

  const answer = Number.isFinite(table.need[amount]) ? table.need[amount] : -1;
  const best = bestCoins(input, table);
  const greedy = greedyCoins(input);
  const trapped = answer !== -1 && (!greedy.reached || greedy.path.length > answer);
  frames.push({
    scene: "card",
    caption: trapped
      ? `Done. The answer is ${answer}: ${best.join(" + ")}. You stepped around the Greedy Trap: biggest coin first would pay ${greedy.path.join(", ")}.`
      : `Done. The answer is ${answer}. You picked the cheapest hop at every stone.`,
    state: {
      ...finished(input, table),
      hops: trapped ? [...chain(best, "best"), ...chain(greedy.path, "trap", true)] : chain(best, "best"),
      bestNote: `fewest coins: ${answer}`,
      trapNote: trapped ? (greedy.reached ? `biggest coin first: ${plural(greedy.path.length, "coin")}` : "biggest coin first: stuck") : null,
    },
  });
  return frames;
}

export const coinChangeStory: ProblemStory<CoinChangeState> = {
  slugs: ["lc-322"],
  pattern: "Dynamic programming (1D)",
  trigger: "“fewest coins” (or fewest steps) to reach an exact total, with pieces you may reuse",
  insight: "Stepping stones, one per amount. A stone costs the cheapest stone one coin-hop behind it, plus 1. Fill the bridge from stone 0 forward.",
  metaphor: {
    name: "The stepping stones",
    legend: "stone i = amount i · number on the stone = dp[i] · a hop = one coin c · dash = amount + 1 (no way)",
    terms: ["stone", "hop", "bridge"],
  },
  traps: [{ name: "The Greedy Trap", rule: "Biggest coin first can be wrong: with coins 1, 3, 4 it pays 6 as 4 + 1 + 1, but 3 + 3 is fewer. Try every coin at every stone." }],
  template: [
    "best[0] = 0; every other best[i] = NO_WAY;",
    "for (i = 1; i <= target; i++)",
    "    for (each piece p that fits in i)",
    "        best[i] = min(best[i], best[i - p] + 1);",
    "return best[target] is NO_WAY ? -1 : best[target];",
  ],
  complexity: {
    slow: "O(coins^amount)",
    time: "O(amount × coins)",
    timeWhy: "every stone tries every coin exactly once",
    space: "O(amount)",
    spaceWhy: "one number is kept per stone",
  },
  code: CODE,
  examples: [
    { label: "coins [1,3,4] → 6", input: "coins=[1,3,4], amount=6", expected: "2", note: "Biggest coin first goes wrong here" },
    { label: "coins [1,2,5] → 11", input: "coins=[1,2,5], amount=11", expected: "3" },
    { label: "coins [2] → 3", input: "coins=[2], amount=3", expected: "-1", note: "Cannot be paid" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-70", title: "Climbing Stairs" },
    { slug: "lc-139", title: "Word Break" },
    { slug: "lc-416", title: "Partition Equal Subset Sum" },
  ],
  answer: (raw) => {
    const input = parseInput(raw);
    const need = solve(input).need[input.amount];
    return String(Number.isFinite(need) ? need : -1);
  },
  frames: (raw) => {
    const input = parseInput(raw);
    const table = solve(input);
    const slow = runSlow(input);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(input, table, slow.ends.find((end) => end.landed)?.path ?? (Number.isFinite(table.need[input.amount]) ? bestCoins(input, table) : null)),
      ...slowFrames(input, table, slow),
      ...insightFrames(input),
      ...solutionFrames(input, table, slow),
      ...practiceFrames(practice, solve(practice)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: finished(input, table),
      },
    ];
  },
  View: CoinChangeView,
};
