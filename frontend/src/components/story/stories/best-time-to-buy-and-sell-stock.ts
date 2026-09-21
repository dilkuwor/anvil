import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh prices. A new low, then a rise: today cannot be both buy and sell. */
const PRACTICE = "[4,1,3]";

const CODE = [
  "int cheapest = Integer.MAX_VALUE;",
  "int best = 0;",
  "for (int price : prices) {",
  "    best = Math.max(best, price - cheapest);",
  "    cheapest = Math.min(cheapest, price);",
  "}",
  "return best;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function solve(prices: number[]): { best: number; buy: number; sell: number } {
  let cheapest = Infinity;
  let best = 0;
  let buy = 0;
  let sell = 0;
  let cheapAt = 0;
  for (let i = 0; i < prices.length; i++) {
    const profit = prices[i] - cheapest;
    if (profit > best) {
      best = profit;
      buy = cheapAt;
      sell = i;
    }
    if (prices[i] < cheapest) {
      cheapest = prices[i];
      cheapAt = i;
    }
  }
  return { best, buy, sell };
}

function picture(prices: number[], paint: (index: number) => CellTone | null, tags: Record<number, string> = {}, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  return {
    rows: [
      {
        cells: prices.map((value, index) => ({
          value: String(value),
          tone: paint(index) ?? "idle",
          caption: String(index),
          tag: tags[index],
          tagTone: tags[index] === "buy" ? "teal" : tags[index] === "sell" ? "accent" : "coral",
        })),
      },
    ],
    notebooks: extra?.notebooks ?? [{ title: "stall", entries: [] }],
    ...extra,
  };
}

function pictureFrames(prices: number[], solved: { best: number; buy: number; sell: number }): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "Each box is a day's price. Buy once, sell on a later day, keep the biggest profit.",
      state: picture(prices, () => null),
    },
  ];
  if (solved.best > 0) {
    frames.push({
      scene: "picture",
      caption: `Buy at ${prices[solved.buy]}, sell at ${prices[solved.sell]}. Profit ${solved.best} is allowed.`,
      state: picture(prices, (index) => (index === solved.buy || index === solved.sell ? "done" : "faded"), {
        [solved.buy]: "buy",
        [solved.sell]: "sell",
      }),
    });
  } else {
    frames.push({
      scene: "picture",
      caption: "Prices only fall. Doing nothing is allowed, so profit is 0.",
      state: picture(prices, () => "faded"),
    });
  }
  frames.push({
    scene: "picture",
    caption: "Selling on the same day you buy is not allowed. That is a zero-width trade.",
    state: picture(prices, (index) => (index === 0 ? "miss" : null), { 0: "buy/sell" }, {
      ghost: { row: 0, col: 0, label: "✕ same day" },
      banner: { text: "Same-Day Trap", tone: "coral" },
    }),
  });
  return frames;
}

function slowFrames(prices: number[]): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  let best = 0;
  let shown = 0;
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      checks += 1;
      const profit = prices[j] - prices[i];
      if (profit > best) best = profit;
      if (shown < 3) {
        shown += 1;
        frames.push({
          scene: "slow",
          caption:
            shown === 1
              ? `The slow way: try every later sell against this buy. Profit ${profit}.`
              : `Buy ${prices[i]}, sell ${prices[j]}. Profit ${profit}. Best ${best}.`,
          state: picture(prices, (index) => (index === i || index === j ? "window" : "faded"), { [i]: "buy", [j]: "sell" }, {
            counter: { label: "pairs tried", value: checks },
          }),
        });
      }
    }
  }
  frames.push({
    scene: "slow",
    caption: `We tried ${checks} pairs on ${prices.length} days. This is O(n²) time.`,
    state: picture(prices, () => "faded", {}, { counter: { label: "pairs tried", value: checks } }),
  });
  return frames;
}

function insightFrames(prices: number[]): Frame[] {
  return [
    {
      scene: "insight",
      caption: "The best sale today uses the cheapest stall already seen, never today's own price as the buy.",
      state: picture(prices, (index) => (index === 0 ? "hit" : null), { 0: "cheapest" }),
    },
    {
      scene: "insight",
      caption: "The Same-Day Trap: lowering cheapest before you score today's sale, so today sells against itself.",
      state: picture(prices, (index) => (index === 0 ? "miss" : null), { 0: "buy/sell" }, {
        ghost: { row: 0, col: 0, label: "✕ same day" },
        banner: { text: "Same-Day Trap", tone: "coral" },
      }),
    },
    {
      scene: "insight",
      caption: "Score the sale first, then maybe lower cheapest. A day is never both.",
      state: picture(prices, () => "window"),
    },
  ];
}

function solutionFrames(prices: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let cheapest = Infinity;
  let cheapAt = -1;
  let best = 0;
  let askedOrder = false;
  let askedSale = false;
  const solved = solve(prices);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${prices.join(", ")}]. You pick the sale, then maybe a new cheapest stall.`
      : "Cheapest starts huge. Best starts at 0, so a falling row still returns 0.",
    codeLine: line(0),
    state: picture(prices, () => null, {}, { notebooks: [{ title: "stall", entries: [{ key: "cheapest", value: "∞" }, { key: "best", value: "0" }] }] }),
  });

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    const profit = price - cheapest;
    const newLow = price < cheapest;

    if (newLow && (practice || !askedOrder)) {
      askedOrder = true;
      frames.push({
        scene,
        caption: `${price} is a new low. If we lower cheapest first, today would sell against itself.`,
        codeLine: line(3),
        state: picture(prices, (index) => (index === i ? "miss" : index === cheapAt ? "hit" : "faded"), { [i]: "buy/sell" }, {
          ghost: { row: 0, col: i, label: "✕ same day" },
          banner: { text: "Same-Day Trap", tone: "coral" },
        }),
        quiz: {
          kind: "choice",
          question: "Today is cheaper than the stall. What first?",
          options: ["Lower cheapest, then score a sale of 0 against today", "Score the sale against the old stall, then lower cheapest"],
          answer: 1,
          why: "The Same-Day Trap is selling against today's own price. Score first, then lower the stall.",
        },
      });
    } else if (practice && !askedSale && !newLow) {
      askedSale = true;
      frames.push({
        scene,
        caption: `Today's price is ${price}. The cheapest stall is ${cheapest}.`,
        state: picture(prices, (index) => (index === i ? "edge" : index === cheapAt ? "hit" : "faded"), { [cheapAt]: "buy", [i]: "sell" }),
        quiz: {
          kind: "cell",
          cells: prices.length,
          numbered: true,
          question: "If we sell today, which earlier box is the cheapest stall we sell against? Click it.",
          answer: cheapAt,
          feedback: { [i]: "That is today. The Same-Day Trap would sell against this box." },
          otherwise: "The stall we sell against is the cheapest day already seen.",
          why: "The best sale today uses the cheapest stall from a strictly earlier day.",
        },
      });
    } else if (!practice) {
      frames.push({
        scene,
        caption: `Day of price ${price}. Score the sale against the cheapest stall first.`,
        codeLine: line(3),
        state: picture(prices, (index) => (index === i ? "edge" : index === cheapAt ? "hit" : "faded"), cheapAt >= 0 ? { [cheapAt]: "buy", [i]: "sell" } : { [i]: "sell" }, {
          notebooks: [{ title: "stall", entries: [{ key: "cheapest", value: cheapest === Infinity ? "∞" : String(cheapest) }, { key: "best", value: String(best) }] }],
        }),
      });
    }

    if (profit > best) best = profit;
    if (newLow) {
      cheapest = price;
      cheapAt = i;
    }
    frames.push({
      scene,
      caption: newLow ? `Then the stall moves here. Cheapest is ${price}. Best stays ${best}.` : `Profit ${Math.max(profit, 0)}. Best is ${best}. Cheapest stays ${cheapest}.`,
      codeLine: line(newLow ? 4 : 3),
      state: picture(prices, (index) => (index === cheapAt ? "hit" : index === i ? "window" : "faded"), { [cheapAt]: "cheapest" }, {
        notebooks: [{ title: "stall", entries: [{ key: "cheapest", value: String(cheapest) }, { key: "best", value: String(best) }] }],
        counter: { label: "best", value: best },
      }),
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${solved.best}. You scored the sale before moving the stall.` : `The walk is over. The answer is ${solved.best}.`,
    codeLine: line(6),
    state: picture(prices, (index) => (solved.best > 0 && (index === solved.buy || index === solved.sell) ? "done" : "faded"), solved.best > 0 ? { [solved.buy]: "buy", [solved.sell]: "sell" } : {}),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each day is read once.`,
      codeLine: 2,
      state: picture(prices, () => "faded", {}, { counter: { label: "days read", value: prices.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only cheapest and best are stored.`,
      codeLine: 0,
      state: picture(prices, (index) => (solved.best > 0 && (index === solved.buy || index === solved.sell) ? "done" : "faded")),
    });
  }
  return frames;
}

export const bestTimeToBuyAndSellStockStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-121"],
  pattern: "One pass, running minimum",
  trigger: "buy once, sell later, and you want the biggest profit from a list of daily prices",
  insight: "Remember the cheapest stall so far. Score today's sale against that stall first, then maybe lower it. A day is never both.",
  metaphor: {
    name: "The cheapest stall",
    legend: "stall = cheapest so far · sale = today − cheapest · best = max profit",
    terms: ["stall", "sale", "cheapest"],
  },
  traps: [
    {
      name: "The Same-Day Trap",
      rule: "Score the sale first, then lower cheapest. A day cannot be both buy and sell.",
    },
  ],
  template: [
    "cheapest = huge; best = 0;",
    "for each price {",
    "    best = max(best, price - cheapest);",
    "    cheapest = min(cheapest, price);",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each day is read once",
    space: "O(1)",
    spaceWhy: "only cheapest and best are stored",
  },
  code: CODE,
  examples: [
    { label: "[7,1,5,3,6,4]", input: "[7,1,5,3,6,4]", expected: "5" },
    { label: "[7,6,4,3,1]", input: "[7,6,4,3,1]", expected: "0" },
    { label: "[2,4,1]", input: "[2,4,1]", expected: "2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "single-pass-profit", title: "Single Pass Profit" },
    { slug: "lc-122", title: "Best Time to Buy and Sell Stock II" },
    { slug: "lc-53", title: "Maximum Subarray" },
  ],
  answer: (input) => String(solve(parse(input)).best),
  frames: (input) => {
    const prices = parse(input);
    const solved = solve(prices);
    return [
      ...pictureFrames(prices, solved),
      ...slowFrames(prices),
      ...insightFrames(prices),
      ...solutionFrames(prices),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(prices, (index) => (solved.best > 0 && (index === solved.buy || index === solved.sell) ? "done" : "faded")),
      },
    ];
  },
  View: GrokNotebookView,
};
