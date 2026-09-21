import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokPriceView, type GrokPriceClimb, type GrokPriceState } from "../grok-price-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokPriceState>;

const PRACTICE = "[1,3,2,5]";

const CODE = [
  "int total = 0;",
  "for (int i = 1; i < prices.length; i++) {",
  "    if (prices[i] > prices[i - 1]) {",
  "        total += prices[i] - prices[i - 1];",
  "    }",
  "}",
  "return total;",
];

function parse(raw: string): number[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return [];
  return inner.split(/[,\s]+/).filter(Boolean).map(Number);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(prices: number[]): GrokPriceState {
  return { prices, tones: tones(prices.length, () => null), here: null, climbs: [], trapRange: null, total: null, note: null, trapNote: null, counter: null };
}

/** Independent solver: try every buy/sell chain. */
function solve(prices: number[]): number {
  const walk = (start: number): number => {
    let best = 0;
    for (let buy = start; buy < prices.length; buy++) {
      for (let sell = buy + 1; sell < prices.length; sell++) {
        if (prices[sell] > prices[buy]) best = Math.max(best, prices[sell] - prices[buy] + walk(sell + 1));
      }
    }
    return best;
  };
  return walk(0);
}

function greedy(prices: number[]): { total: number; climbs: GrokPriceClimb[] } {
  const climbs: GrokPriceClimb[] = [];
  let total = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      total += prices[i] - prices[i - 1];
      climbs.push({ from: i - 1, to: i });
    }
  }
  return { total, climbs };
}

function oneTrade(prices: number[]): { profit: number; range: [number, number] | null } {
  let low = 0;
  let best = 0;
  let range: [number, number] | null = null;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < prices[low]) low = i;
    const gain = prices[i] - prices[low];
    if (gain > best) {
      best = gain;
      range = [low, i];
    }
  }
  return { profit: best, range };
}

function pictureFrames(prices: number[]): Frame[] {
  const { total, climbs } = greedy(prices);
  const single = oneTrade(prices);
  const frames: Frame[] = [{ scene: "picture", caption: "Each box is a day's price. You may buy and sell many times, but you hold only one share.", state: blank(prices) }];
  if (climbs.length) {
    frames.push({
      scene: "picture",
      caption: `An uphill step is allowed. Pocketing every climb here adds to ${total}.`,
      state: { ...blank(prices), climbs: climbs.map((c) => ({ ...c })), tones: tones(prices.length, (i) => (climbs.some((c) => c.from === i || c.to === i) ? "done" : null)), total },
    });
  }
  if (single.range && single.profit !== total) {
    frames.push({
      scene: "picture",
      caption: `One buy and one sell is not enough. That single trade only makes ${single.profit}, less than the two hills.`,
      state: { ...blank(prices), trapRange: single.range, trapNote: `one trade = ${single.profit}`, total: single.profit },
    });
  } else if (total === 0) {
    frames.push({
      scene: "picture",
      caption: "A walk that only goes downhill has no climb to take. Profit stays 0.",
      state: { ...blank(prices), tones: tones(prices.length, () => "faded"), total: 0 },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the total of every uphill step. Here that total is ${total}.`,
    state: { ...blank(prices), climbs: climbs.map((c) => ({ ...c })), tones: tones(prices.length, (i) => (climbs.some((c) => c.to === i) ? "done" : null)), total },
  });
  return frames;
}

function slowFrames(prices: number[]): Frame[] {
  const frames: Frame[] = [];
  let work = 0;
  const shown = new Set<string>();
  const walk = (start: number, depth: number): number => {
    let best = 0;
    for (let buy = start; buy < prices.length; buy++) {
      for (let sell = buy + 1; sell < prices.length; sell++) {
        work++;
        const key = `${buy}-${sell}`;
        if (depth === 0 && !shown.has(key) && shown.size < 3) {
          shown.add(key);
          const gain = prices[sell] - prices[buy];
          frames.push({
            scene: "slow",
            caption:
              gain > 0
                ? `The slow way: buy at ${prices[buy]}, sell at ${prices[sell]}, then try every later trade. That pair makes ${gain}.`
                : `Buy at ${prices[buy]} and sell at ${prices[sell]} would lose money, so skip this pair.`,
            state: {
              ...blank(prices),
              tones: tones(prices.length, (i) => (i === buy || i === sell ? (gain > 0 ? "window" : "miss") : "faded")),
              counter: { label: "pairs tried", value: String(work) },
            },
          });
        }
        if (prices[sell] > prices[buy]) best = Math.max(best, prices[sell] - prices[buy] + walk(sell + 1, depth + 1));
      }
    }
    return best;
  };
  const best = walk(0, 0);
  frames.push({
    scene: "slow",
    caption: `We tried ${work} buy-and-sell pairs, including later trades after each sell. The best total is ${best}. This is O(n² · 2ⁿ) time.`,
    state: { ...blank(prices), tones: tones(prices.length, () => "faded"), total: best, counter: { label: "pairs tried", value: String(work) } },
  });
  return frames;
}

function insightFrames(prices: number[]): Frame[] {
  const { total, climbs } = greedy(prices);
  const single = oneTrade(prices);
  const first = climbs[0];
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: first
        ? `Picture a hillside walk. The step from ${prices[first.from]} to ${prices[first.to]} is a climb you can pocket.`
        : "Picture a hillside walk. There is no climb here, so the walk keeps 0.",
      state: first
        ? { ...blank(prices), climbs: [{ ...first }], tones: tones(prices.length, (i) => (i === first.from || i === first.to ? "window" : null)) }
        : { ...blank(prices), tones: tones(prices.length, () => "faded") },
    },
  ];
  if (single.range && single.profit !== total) {
    frames.push({
      scene: "insight",
      caption: `Waiting through a dip for one bigger trade misses a hill. The One Trade Trap keeps only ${single.profit}.`,
      state: { ...blank(prices), trapRange: single.range, trapNote: "The One Trade Trap", total: single.profit },
    });
  }
  frames.push({
    scene: "insight",
    caption: `Every uphill step can be its own tiny trade. A falling day is a skip. Total ${total}.`,
    state: { ...blank(prices), climbs: climbs.map((c) => ({ ...c })), total },
  });
  return frames;
}

function addClimbQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "The walk just went uphill. What do we do with this step?",
    options: ["Pocket the climb and add it to the total", "Skip it and wait for one bigger trade"],
    answer: 0,
    why: "Every uphill step can be taken. Waiting for one trade would throw a hill away.",
  };
}

function skipQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "The walk just went downhill. What do we do with this step?",
    options: ["Add the drop to the total", "Skip. A falling day is not a climb"],
    answer: 1,
    why: "Only a rise is profit. Doing nothing on a down day is allowed.",
  };
}

function solutionFrames(prices: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const climbs: GrokPriceClimb[] = [];
  let total = 0;
  let askedUp = false;
  let askedDown = false;
  const single = oneTrade(prices);
  let showedTrap = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new walk: [${prices.join(",")}]. You decide each step.` : "The walk starts with total 0, before any climb.",
    codeLine: line(0),
    state: { ...blank(prices), total: 0 },
  });

  for (let i = 1; i < prices.length; i++) {
    const up = prices[i] > prices[i - 1];
    const quizFrame: Frame = {
      scene,
      caption: up ? `Today's price ${prices[i]} sits above yesterday's ${prices[i - 1]}.` : `Today's price ${prices[i]} sits below yesterday's ${prices[i - 1]}.`,
      codeLine: line(2),
      state: { ...blank(prices), here: i, climbs: climbs.map((c) => ({ ...c })), tones: tones(prices.length, (j) => (j === i || j === i - 1 ? "window" : j < i ? "faded" : null)), total },
    };
    if (practice || (up && !askedUp) || (!up && !askedDown)) {
      if (up) askedUp = true;
      else askedDown = true;
      quizFrame.quiz = up ? addClimbQuiz() : skipQuiz();
    }
    frames.push(quizFrame);

    if (up) {
      total += prices[i] - prices[i - 1];
      climbs.push({ from: i - 1, to: i });
      frames.push({
        scene,
        caption: `Pocket the climb of ${prices[i] - prices[i - 1]}. The walk's total is now ${total}.`,
        codeLine: line(3),
        state: { ...blank(prices), here: i, climbs: climbs.map((c) => ({ ...c })), tones: tones(prices.length, (j) => (climbs.some((c) => c.to === j) ? "done" : null)), total },
      });
      if (!showedTrap && !practice && single.range && single.profit !== total && climbs.length >= 2) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The One Trade Trap! One buy and one sell would only keep ${single.profit} and miss this second hill.`,
          codeLine: line(3),
          state: { ...blank(prices), climbs: climbs.map((c) => ({ ...c })), trapRange: single.range, trapNote: "The One Trade Trap", total: single.profit },
        });
      }
    } else {
      frames.push({
        scene,
        caption: "A falling day is a skip. The walk does not add a drop.",
        codeLine: line(2),
        state: { ...blank(prices), here: i, climbs: climbs.map((c) => ({ ...c })), tones: tones(prices.length, (j) => (j === i ? "miss" : j < i ? "faded" : null)), total },
      });
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${total}. You chose every step.` : `The walk reached the last day. The answer is ${total}.`,
    codeLine: line(6),
    state: { ...blank(prices), climbs: climbs.map((c) => ({ ...c })), tones: tones(prices.length, (j) => (climbs.some((c) => c.to === j) ? "done" : null)), total },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). The walk compared each of the ${prices.length} days with the day before, once.`,
      codeLine: 1,
      state: { ...blank(prices), climbs: climbs.map((c) => ({ ...c })), total, counter: { label: "days walked", value: String(prices.length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the running total is stored, no extra list of trades.",
      codeLine: 0,
      state: { ...blank(prices), climbs: climbs.map((c) => ({ ...c })), total, counter: { label: "numbers stored", value: "1" } },
    });
  }
  return frames;
}

export const stockTwoStory: ProblemStory<GrokPriceState> = {
  slugs: ["lc-122"],
  pattern: "Greedy: every uphill step",
  trigger: "a row of prices, and you may buy and sell many times but hold only one share",
  insight: "A hillside walk. Every uphill step is a climb you can pocket. A dip is a skip, not a reason to wait for one bigger trade.",
  metaphor: { name: "The hillside walk", legend: "today = i · yesterday = i-1 · climb = a positive price step · total = sum of climbs", terms: ["hill", "climb", "step", "walk"] },
  traps: [
    {
      name: "The One Trade Trap",
      rule: "You may trade many times. Sum every climb, not just the single biggest buy and sell.",
    },
  ],
  template: [
    "total = 0",
    "for each day from 1:",
    "    if today > yesterday: total += the climb",
    "return total",
  ],
  complexity: {
    slow: "O(n² · 2ⁿ)",
    time: "O(n)",
    timeWhy: "each day is compared with the day before, once",
    space: "O(1)",
    spaceWhy: "only the running total is stored",
  },
  code: CODE,
  examples: [
    { label: "[1,5,3,6]", input: "[1,5,3,6]", expected: "7", note: "Two hills. One trade would miss one of them." },
    { label: "[7,6,4]", input: "[7,6,4]", expected: "0" },
    { label: "[1,2,3]", input: "[1,2,3]", expected: "2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-121", title: "Best Time to Buy and Sell Stock" },
    { slug: "single-pass-profit", title: "Single Pass Profit" },
    { slug: "lc-53", title: "Maximum Subarray" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const prices = parse(input);
    const { total, climbs } = greedy(prices);
    return [
      ...pictureFrames(prices),
      ...slowFrames(prices),
      ...insightFrames(prices),
      ...solutionFrames(prices),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(prices), climbs: climbs.map((c) => ({ ...c })), total },
      },
    ];
  },
  View: GrokPriceView,
};
