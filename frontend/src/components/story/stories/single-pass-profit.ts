import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

const PRACTICE = "[5,2,6]";

const CODE = [
  "int min = Integer.MAX_VALUE, best = 0;",
  "for (int price : prices) {",
  "    if (price < min) min = price;",
  "    else best = Math.max(best, price - min);",
  "}",
  "return best;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function solve(prices: number[]): { best: number; buy: number; sell: number } {
  let min = Infinity;
  let best = 0;
  let buy = 0;
  let sell = 0;
  let minAt = 0;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] < min) {
      min = prices[i];
      minAt = i;
    } else if (prices[i] - min > best) {
      best = prices[i] - min;
      buy = minAt;
      sell = i;
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
          tagTone: tags[index] === "buy" ? "teal" : "accent",
        })),
      },
    ],
    notebooks: extra?.notebooks ?? [{ title: "stall", entries: [] }],
    ...extra,
  };
}

function pictureFrames(prices: number[], solved: { best: number; buy: number; sell: number }): Frame[] {
  return [
    {
      scene: "picture",
      caption: "Buy once, sell later. Biggest profit, or 0 if prices only fall.",
      state: picture(prices, () => null),
    },
    solved.best > 0
      ? {
          scene: "picture",
          caption: `Buy at ${prices[solved.buy]}, sell at ${prices[solved.sell]}. Profit ${solved.best}.`,
          state: picture(prices, (index) => (index === solved.buy || index === solved.sell ? "done" : "faded"), { [solved.buy]: "buy", [solved.sell]: "sell" }),
        }
      : {
          scene: "picture",
          caption: "No up-move. Profit 0 is allowed.",
          state: picture(prices, () => "faded"),
        },
    {
      scene: "picture",
      caption: "A new low is a buy, not a sell. Mixing both updates on that day is the After-Sale Trap.",
      state: picture(prices, (index) => (index === 0 ? "miss" : null), { 0: "buy/sell" }, {
        ghost: { row: 0, col: 0, label: "✕ after-sale" },
        banner: { text: "After-Sale Trap", tone: "coral" },
      }),
    },
  ];
}

function slowFrames(prices: number[]): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  let shown = 0;
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      checks += 1;
      if (shown < 2) {
        shown += 1;
        frames.push({
          scene: "slow",
          caption: `The slow way: buy ${prices[i]}, sell ${prices[j]}. Profit ${prices[j] - prices[i]}.`,
          state: picture(prices, (index) => (index === i || index === j ? "window" : "faded"), {}, { counter: { label: "pairs tried", value: checks } }),
        });
      }
    }
  }
  frames.push({
    scene: "slow",
    caption: `We tried ${checks} pairs. This is O(n²) time.`,
    state: picture(prices, () => "faded", {}, { counter: { label: "pairs tried", value: checks } }),
  });
  return frames;
}

function insightFrames(prices: number[]): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Walk once. If today is a new low, it becomes the stall. Else it is a sale against that stall.",
      state: picture(prices, (index) => (index === 0 ? "hit" : null), { 0: "stall" }),
    },
    {
      scene: "insight",
      caption: "The After-Sale Trap: scoring a sale and then lowering the stall on the same day, so today buys after it sold.",
      state: picture(prices, (index) => (index === 0 ? "miss" : null), { 0: "buy/sell" }, {
        banner: { text: "After-Sale Trap", tone: "coral" },
        ghost: { row: 0, col: 0, label: "✕ after-sale" },
      }),
    },
    {
      scene: "insight",
      caption: "Use if/else: a new low is not a sale. A sale does not move the stall.",
      state: picture(prices, () => "window"),
    },
  ];
}

function solutionFrames(prices: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let min = Infinity;
  let minAt = -1;
  let best = 0;
  let askedLow = false;
  let askedSale = false;
  const solved = solve(prices);

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: [${prices.join(", ")}]. New low, or sale — not both.` : "Min starts huge. Best starts at 0.",
    codeLine: line(0),
    state: picture(prices, () => null, {}, { notebooks: [{ title: "stall", entries: [{ key: "min", value: "∞" }, { key: "best", value: "0" }] }] }),
  });

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    const isLow = price < min;
    const look: Frame = {
      scene,
      caption: isLow ? `${price} is lower than the stall.` : `${price} is not a new low. Try a sale.`,
      codeLine: line(2),
      state: picture(prices, (index) => (index === i ? "edge" : index === minAt ? "hit" : "faded"), minAt >= 0 ? { [minAt]: "buy", [i]: isLow ? "stall" : "sell" } : { [i]: "stall" }),
    };
    if (isLow && (practice || !askedLow)) {
      askedLow = true;
      look.quiz = {
        kind: "choice",
        question: "Today is a new low. What happens?",
        options: ["Score a sale, then move the stall", "Move the stall only. Today is not a sale"],
        answer: 1,
        why: "The After-Sale Trap is selling and then moving the stall on the same day. A new low is only a buy.",
      };
    } else if (!isLow && practice && !askedSale && minAt >= 0) {
      askedSale = true;
      look.quiz = {
        kind: "cell",
        cells: prices.length,
        numbered: true,
        question: "We sell today. Which box is the stall we sell against? Click it.",
        answer: minAt,
        feedback: { [i]: "That is today. A sale does not buy from itself." },
        otherwise: "The stall is the cheapest day already kept.",
        why: "A sale uses the stall from an earlier new-low day.",
      };
    }
    frames.push(look);
    if (isLow) {
      min = price;
      minAt = i;
      frames.push({
        scene,
        caption: `The stall moves here. Min is ${min}. Best stays ${best}.`,
        codeLine: line(2),
        state: picture(prices, (index) => (index === i ? "hit" : "faded"), { [i]: "stall" }, {
          notebooks: [{ title: "stall", entries: [{ key: "min", value: String(min) }, { key: "best", value: String(best) }] }],
        }),
      });
    } else {
      best = Math.max(best, price - min);
      frames.push({
        scene,
        caption: `Sale against ${min}. Best is ${best}. The stall does not move.`,
        codeLine: line(3),
        state: picture(prices, (index) => (index === i ? "done" : index === minAt ? "hit" : "faded"), { [minAt]: "buy", [i]: "sell" }, {
          notebooks: [{ title: "stall", entries: [{ key: "min", value: String(min) }, { key: "best", value: String(best) }] }],
          counter: { label: "best", value: best },
        }),
      });
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${solved.best}.` : `The walk is over. The answer is ${solved.best}.`,
    codeLine: line(5),
    state: picture(prices, (index) => (solved.best > 0 && (index === solved.buy || index === solved.sell) ? "done" : "faded")),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each day is read once.`,
      codeLine: 1,
      state: picture(prices, () => "faded", {}, { counter: { label: "days read", value: prices.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). Only min and best are stored.`,
      codeLine: 0,
      state: picture(prices, () => "faded"),
    });
  }
  return frames;
}

export const singlePassProfitStory: ProblemStory<GrokNotebookState> = {
  slugs: ["single-pass-profit"],
  pattern: "One pass, running minimum",
  trigger: "at most one buy and one later sell, on a list of daily prices",
  insight: "If today is a new low, move the stall. Else score a sale. Never do both on the same day.",
  metaphor: {
    name: "The cheapest stall",
    legend: "stall = min so far · sale = today − min · best = max profit",
    terms: ["stall", "sale", "low"],
  },
  traps: [
    {
      name: "The After-Sale Trap",
      rule: "A new low is not a sale. Do not update min after counting today as a same-day sale.",
    },
  ],
  template: [
    "min = huge; best = 0;",
    "for each price {",
    "    if price < min, min = price;",
    "    else best = max(best, price - min);",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each day is read once",
    space: "O(1)",
    spaceWhy: "only min and best are stored",
  },
  code: CODE,
  examples: [
    { label: "[7,1,5,3,6,4]", input: "[7,1,5,3,6,4]", expected: "5" },
    { label: "[7,6,4,3,1]", input: "[7,6,4,3,1]", expected: "0" },
    { label: "[1,2]", input: "[1,2]", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-121", title: "Best Time to Buy and Sell Stock" },
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
