import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp3TableView, type Dp3Square, type Dp3TableState } from "../agy-dp3-table-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Dp3TableState>;

/** Fresh prices for the "your turn" run. Buying right after the sale at 4 looks like +3 more, but that day must be a rest. */
const PRACTICE = "[1,4,2,5]";

const CODE = [
  "int hold = -prices[0];",
  "int sold = 0;",
  "int rest = 0;",
  "for (int i = 1; i < prices.length; i++) {",
  "    int soldBefore = sold;",
  "    sold = hold + prices[i];",
  "    hold = Math.max(hold, rest - prices[i]);",
  "    rest = Math.max(rest, soldBefore);",
  "}",
  "return Math.max(sold, rest);",
];

/** Row numbers of the three rooms in the table. */
const HOLD = 0;
const SOLD = 1;
const FREE = 2;
const ROOM_NAMES = ["holding", "just sold", "free"];

function parseInput(raw: string): number[] {
  const numbers = (raw.match(/-?\d+/g) ?? []).map(Number).map((value) => Math.max(0, value));
  return numbers.length > 0 ? numbers.slice(0, 10) : [1, 2, 3, 0, 2];
}

type Table = { hold: number[]; sold: number[]; rest: number[]; answer: number };

function solve(prices: number[]): Table {
  const hold = [-prices[0]];
  const sold = [0];
  const rest = [0];
  for (let i = 1; i < prices.length; i++) {
    sold.push(hold[i - 1] + prices[i]);
    hold.push(Math.max(hold[i - 1], rest[i - 1] - prices[i]));
    rest.push(Math.max(rest[i - 1], sold[i - 1]));
  }
  const last = prices.length - 1;
  return { hold, sold, rest, answer: Math.max(sold[last], rest[last]) };
}

/** Independent check: every choice on every day, remembered by (day, holding). */
function bestByChoices(prices: number[]): number {
  const seen = new Map<string, number>();
  const best = (day: number, holding: boolean): number => {
    if (day >= prices.length) return 0;
    const key = `${day}-${holding}`;
    const known = seen.get(key);
    if (known !== undefined) return known;
    const wait = best(day + 1, holding);
    const trade = holding ? prices[day] + best(day + 2, false) : -prices[day] + best(day + 1, true);
    const value = Math.max(wait, trade);
    seen.set(key, value);
    return value;
  };
  return best(0, false);
}

/** The room you end each day in, on one best plan (read back from the table, fewest trades on a tie). */
function bestRooms(table: Table): number[] {
  const last = table.hold.length - 1;
  const rooms: number[] = [];
  let room = table.sold[last] > table.rest[last] ? SOLD : FREE;
  for (let day = last; day >= 0; day--) {
    rooms.unshift(room);
    if (day === 0) break;
    if (room === SOLD) room = HOLD;
    else if (room === HOLD) room = table.hold[day] === table.hold[day - 1] ? HOLD : FREE;
    else room = table.rest[day] === table.rest[day - 1] ? FREE : SOLD;
  }
  if (rooms[0] === SOLD) rooms[0] = FREE;
  return rooms;
}

/** Trades with no wait at all: buy at the bottom of every rise, sell at its top. */
function noWaitTrades(prices: number[]): { buy: number; sell: number }[] {
  const trades: { buy: number; sell: number }[] = [];
  let day = 0;
  while (day < prices.length - 1) {
    while (day < prices.length - 1 && prices[day + 1] <= prices[day]) day++;
    const buy = day;
    while (day < prices.length - 1 && prices[day + 1] > prices[day]) day++;
    if (day > buy) trades.push({ buy, sell: day });
  }
  return trades;
}

const roomPath = (rooms: number[]): Dp3Square[] => rooms.map((room, day) => [room, day]);

function blank(prices: number[]): Dp3TableState {
  return {
    mode: "table",
    align: [],
    rowLabels: [...ROOM_NAMES],
    columnLabels: prices.map(String),
    rowTones: ROOM_NAMES.map(() => "idle" as CellTone),
    columnTones: prices.map(() => "idle" as CellTone),
    cells: ROOM_NAMES.map(() => prices.map(() => null)),
    tones: ROOM_NAMES.map(() => prices.map(() => "idle" as CellTone)),
    tiles: null,
    marks: [],
    here: null,
    arrows: [],
    paths: [],
    outlines: [],
    badge: null,
    counter: null,
    answer: null,
    note: null,
  };
}

function planMarks(rooms: number[]): Dp3TableState["marks"] {
  const marks: Dp3TableState["marks"] = [];
  rooms.forEach((room, day) => {
    const before = day === 0 ? FREE : rooms[day - 1];
    if (room === HOLD && before !== HOLD) marks.push({ square: [HOLD, day], text: "buy" });
    if (room === SOLD) marks.push({ square: [SOLD, day], text: "sell" });
  });
  return marks;
}

function pictureFrames(prices: number[], table: Table): Frame[] {
  const rooms = bestRooms(table);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Each column is one day. The number on top is that day's price for one share: ${prices.join(", ")}.`,
      state: { ...blank(prices), columnTones: prices.map(() => "window" as CellTone) },
    },
  ];
  const tradeCount = planMarks(rooms).filter((mark) => mark.text === "sell").length;
  frames.push({
    scene: "picture",
    caption:
      tradeCount > 0
        ? "Allowed: buy one share, sell it on a later day, and do that again. Every day ends in one row: holding a share, just sold, or free."
        : "Allowed: buy one share and sell it later, many times. Here every price is lower than the one before, so the best plan is to stay free.",
    state: { ...blank(prices), marks: planMarks(rooms), paths: [{ squares: roomPath(rooms), tone: "teal", arrow: true }] },
  });
  const quick = noWaitTrades(prices).find((trade, index, all) => all[index + 1]?.buy === trade.sell + 1);
  if (quick) {
    const next = quick.sell + 1;
    frames.push({
      scene: "picture",
      caption: `Not allowed: selling on day ${quick.sell} and buying again on day ${next}. After a sale you must wait one full day before you buy.`,
      state: {
        ...blank(prices),
        marks: [
          { square: [SOLD, quick.sell], text: "sell" },
          { square: [HOLD, next], text: "buy" },
        ],
        paths: [
          {
            squares: [
              [SOLD, quick.sell],
              [HOLD, next],
            ],
            tone: "coral",
            arrow: true,
          },
        ],
        note: { text: "✕ no buying the day after a sale", tone: "coral" },
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the biggest total profit, from any number of trades. Here that is ${table.answer}.`,
    state: { ...blank(prices), marks: planMarks(rooms), paths: [{ squares: roomPath(rooms), tone: "teal", arrow: true }], answer: { label: "best profit", value: String(table.answer) } },
  });
  return frames;
}

type SlowRun = { visits: number[][]; total: number };

/** Plain recursion, really run: every day try the trade and the wait, and count every day looked at. */
function runSlow(prices: number[]): SlowRun {
  const visits = ROOM_NAMES.map(() => prices.map(() => 0));
  let total = 0;
  const best = (day: number, holding: boolean): number => {
    if (day >= prices.length) return 0;
    visits[holding ? HOLD : FREE][day]++;
    total++;
    const wait = best(day + 1, holding);
    const trade = holding ? prices[day] + best(day + 2, false) : -prices[day] + best(day + 1, true);
    return Math.max(wait, trade);
  };
  best(0, false);
  return { visits, total };
}

function slowFrames(prices: number[], slow: SlowRun): Frame[] {
  const counted = blank(prices);
  counted.cells = slow.visits.map((row, room) => row.map((value) => (room === SOLD ? null : value)));
  counted.tones = slow.visits.map((row) => row.map((value) => (value > 1 ? "miss" : "idle") as CellTone));
  return [
    {
      scene: "slow",
      caption: "The slow way: on every day, try both choices, trade or wait, and follow each future to the end. Each choice splits the future in two.",
      state: { ...blank(prices), columnTones: prices.map((_, day) => (day === 0 ? "window" : "idle") as CellTone), counter: { label: "days looked at", value: 1 } },
    },
    {
      scene: "slow",
      caption: "Each box counts how often the slow way stood on that day, with or without a share. The same days are worked out again and again.",
      state: { ...counted, counter: { label: "days looked at", value: slow.total } },
    },
    {
      scene: "slow",
      caption: `That is ${slow.total} days looked at, for only ${prices.length} days of prices. One more day can double it. This is O(2^n) time.`,
      state: { ...counted, tones: counted.tones.map((row) => row.map(() => "faded" as CellTone)), counter: { label: "days looked at", value: slow.total } },
    },
  ];
}

/** The day the trap is shown on: the first day after a sale where buying straight away would look better. */
function trapDay(prices: number[], table: Table): number | null {
  let first: number | null = null;
  for (let day = 1; day < table.hold.length; day++) {
    if (table.sold[day - 1] <= table.rest[day - 1]) continue;
    first ??= day;
    // Best of all: a day where buying straight after the sale would really change the holding room.
    if (table.sold[day - 1] - prices[day] > table.hold[day]) return day;
  }
  return first;
}

function moves(day: number, tone: "teal" | "accent" = "accent"): Dp3TableState["paths"] {
  const from = day - 1;
  return [
    {
      squares: [
        [HOLD, from],
        [HOLD, day],
      ],
      tone,
      arrow: true,
    },
    {
      squares: [
        [HOLD, from],
        [SOLD, day],
      ],
      tone,
      arrow: true,
    },
    {
      squares: [
        [SOLD, from],
        [FREE, day],
      ],
      tone,
      arrow: true,
    },
    {
      squares: [
        [FREE, from],
        [FREE, day],
      ],
      tone,
      arrow: true,
    },
    {
      squares: [
        [FREE, from],
        [HOLD, day],
      ],
      tone,
      arrow: true,
    },
  ];
}

function insightFrames(prices: number[]): Frame[] {
  const day = Math.min(1, prices.length - 1);
  if (day === 0) {
    return [
      {
        scene: "insight",
        caption: "Picture three rooms for every day: holding a share, just sold, and free. Each day ends in exactly one room.",
        state: { ...blank(prices), rowTones: ROOM_NAMES.map(() => "window" as CellTone) },
      },
      {
        scene: "insight",
        caption: "With one day there is no later day to sell on. You stay in the free room with 0.",
        state: { ...blank(prices), cells: [[null], [null], [0]] },
      },
    ];
  }
  return [
    {
      scene: "insight",
      caption: "Picture three rooms for every day: holding a share, just sold, and free. Each day ends in exactly one room.",
      state: { ...blank(prices), rowTones: ROOM_NAMES.map(() => "window" as CellTone) },
    },
    {
      scene: "insight",
      caption: "From one day to the next: holding may stay or sell. Just sold must move to free. Free may stay, or buy and move to holding.",
      state: { ...blank(prices), paths: moves(day, "teal"), badge: { text: "five moves between the rooms", tone: "teal" } },
    },
    {
      scene: "insight",
      caption: "The wait lives in one missing arrow: just sold never goes straight to holding. You buy only from the free room.",
      state: {
        ...blank(prices),
        paths: [
          ...moves(day, "teal"),
          {
            squares: [
              [SOLD, day - 1],
              [HOLD, day],
            ],
            tone: "coral",
            arrow: true,
          },
        ],
        note: { text: "✕ no arrow from just sold to holding", tone: "coral" },
      },
    },
    {
      scene: "insight",
      caption: "Keep one number in each room: the best profit you can have ending the day there. Fill the rooms day by day.",
      state: { ...blank(prices), cells: ROOM_NAMES.map((_, room) => prices.map((__, index) => (index === 0 ? [-prices[0], 0, 0][room] : null))), here: [HOLD, 0] },
    },
  ];
}

const flatOf = (prices: number[], [room, day]: Dp3Square) => room * prices.length + day;

function buyFromQuiz(prices: number[], day: number, table: Table): StoryQuiz {
  const soldYesterday = table.sold[day - 1];
  return {
    kind: "cell",
    cells: 3 * prices.length,
    question: `To buy on day ${day}, which of yesterday's rooms may you come from? Click that square.`,
    answer: flatOf(prices, [FREE, day - 1]),
    feedback: {
      [flatOf(prices, [SOLD, day - 1])]: `Yesterday was a sale day${soldYesterday > 0 ? ` worth ${soldYesterday}` : ""}. The day after a sale must be a rest, so no buying: the No-Rest Trap.`,
      [flatOf(prices, [HOLD, day - 1])]: "You already hold a share there. You may own only one at a time.",
      [flatOf(prices, [HOLD, day])]: "That is today's holding room, the one we are filling. It comes from yesterday.",
    },
    otherwise: "Look at yesterday's column. A buy must start from a room with no share and no sale.",
    why: "Only the free room has no share and no sale yesterday, so only it may buy.",
  };
}

function holdSourceQuiz(prices: number[], day: number, table: Table): StoryQuiz {
  const keep = table.hold[day - 1];
  const buy = table.rest[day - 1] - prices[day];
  const keepWins = keep > buy;
  const keepSquare = flatOf(prices, [HOLD, day - 1]);
  const buySquare = flatOf(prices, [FREE, day - 1]);
  return {
    kind: "cell",
    cells: 3 * prices.length,
    question: `Day ${day}, price ${prices[day]}. Holding today comes from keeping yesterday's share or from a buy. Click the room it comes from.`,
    answer: keepWins ? keepSquare : buySquare,
    feedback: {
      [keepWins ? buySquare : keepSquare]: keepWins ? `A buy today gives ${table.rest[day - 1]} minus ${prices[day]}, which is ${buy}. Keeping gives more.` : `Keeping gives ${keep}. A buy today gives more.`,
      [flatOf(prices, [SOLD, day - 1])]: "Yesterday was a sale. You must rest today, so no buying: the No-Rest Trap.",
    },
    otherwise: "Holding today can only come from yesterday's holding room or yesterday's free room.",
    why: keepWins ? `Keeping gives ${keep}, more than ${buy} from a buy.` : `Buying from free gives ${table.rest[day - 1]} minus ${prices[day]} = ${buy}, more than keeping ${keep}.`,
  };
}

/** The real algorithm, one frame per room filled. `practice` asks the reader where every holding comes from. */
function fillFrames(prices: number[], table: Table, scene: SceneId, practice: boolean): Frame[] {
  const days = prices.length;
  const frames: Frame[] = [];
  const cells: (number | null)[][] = ROOM_NAMES.map(() => prices.map(() => null));
  const line = (index: number) => (practice ? undefined : index);
  const base = (day: number | null): Dp3TableState => {
    const state = blank(prices);
    state.cells = cells.map((row) => [...row]);
    state.tones = state.tones.map((row, room) => row.map((tone, column) => (day !== null && column < day - 1 ? "faded" : cells[room][column] !== null ? "hit" : tone)));
    if (day !== null) state.columnTones[day] = "window";
    return state;
  };
  const trap = trapDay(prices, table);
  let askedBuy = false;
  let askedTrap = false;

  cells[HOLD][0] = table.hold[0];
  frames.push({
    scene,
    caption: practice
      ? `Your turn, on new prices: ${prices.join(", ")}. Day 0: holding means you bought today, so that room holds minus ${prices[0]}.`
      : `Day 0, price ${prices[0]}. Holding means you bought today: the holding room gets minus ${prices[0]}.`,
    codeLine: line(0),
    state: { ...base(0), here: [HOLD, 0] },
  });
  cells[SOLD][0] = 0;
  cells[FREE][0] = 0;
  frames.push({
    scene,
    caption: "Nothing can be sold yet, so just sold and free both start at 0, the same as making no trade at all.",
    codeLine: line(1),
    state: { ...base(0), here: [FREE, 0] },
  });

  for (let day = 1; day < days; day++) {
    const price = prices[day];
    const hold = table.hold[day - 1];
    const rest = table.rest[day - 1];
    const soldBefore = table.sold[day - 1];

    cells[SOLD][day] = table.sold[day];
    frames.push({
      scene,
      caption: `Day ${day}, price ${price}. Just sold: you held yesterday with ${hold} and sell today, ${hold} + ${price} = ${table.sold[day]}.`,
      codeLine: line(5),
      state: {
        ...base(day),
        here: [SOLD, day],
        paths: [
          {
            squares: [
              [HOLD, day - 1],
              [SOLD, day],
            ],
            tone: "teal",
            arrow: true,
          },
        ],
      },
    });

    const tempting = day === trap;
    const askHere = practice ? hold !== rest - price : !askedBuy || (tempting && !askedTrap);
    if (askHere) {
      const quiz = practice ? holdSourceQuiz(prices, day, table) : !askedBuy ? buyFromQuiz(prices, day, table) : holdSourceQuiz(prices, day, table);
      if (!practice && !askedBuy) askedBuy = true;
      else if (tempting) askedTrap = true;
      frames.push({
        scene,
        caption: practice ? `Day ${day}, price ${price}. Now the holding room.` : `Now the holding room. You keep yesterday's share, or you buy today at ${price}.`,
        codeLine: line(6),
        state: { ...base(day), here: [HOLD, day] },
        quiz,
      });
    }

    if (tempting) {
      frames.push({
        scene,
        caption: `The No-Rest Trap: yesterday's sale holds ${soldBefore}, more than free's ${rest}. Buying from it would skip the rest day, so that arrow is not allowed.`,
        codeLine: line(6),
        state: {
          ...base(day),
          here: [HOLD, day],
          paths: [
            {
              squares: [
                [SOLD, day - 1],
                [HOLD, day],
              ],
              tone: "coral",
              arrow: true,
            },
          ],
          note: { text: `✕ ${soldBefore} − ${price} = ${soldBefore - price}: must rest after a sale`, tone: "coral" },
          badge: { text: "the No-Rest Trap", tone: "coral" },
        },
      });
    }

    cells[HOLD][day] = table.hold[day];
    const buy = rest - price;
    const keepWins = hold >= buy;
    frames.push({
      scene,
      caption: `Holding: keep yesterday's share with ${hold}, or buy from free, ${rest} − ${price} = ${buy}. The holding room keeps ${table.hold[day]}.`,
      codeLine: line(6),
      state: {
        ...base(day),
        here: [HOLD, day],
        paths: [
          {
            squares: [
              [keepWins ? FREE : HOLD, day - 1],
              [HOLD, day],
            ],
            tone: "accent",
            arrow: true,
          },
          {
            squares: [
              [keepWins ? HOLD : FREE, day - 1],
              [HOLD, day],
            ],
            tone: "teal",
            arrow: true,
          },
        ],
      },
    });

    cells[FREE][day] = table.rest[day];
    const restWins = rest >= soldBefore;
    frames.push({
      scene,
      caption: `Free: stay free with ${rest}, or rest after yesterday's sale with ${soldBefore}. The free room keeps ${table.rest[day]}.`,
      codeLine: line(7),
      state: {
        ...base(day),
        here: [FREE, day],
        paths: [
          {
            squares: [
              [restWins ? SOLD : FREE, day - 1],
              [FREE, day],
            ],
            tone: "accent",
            arrow: true,
          },
          {
            squares: [
              [restWins ? FREE : SOLD, day - 1],
              [FREE, day],
            ],
            tone: "teal",
            arrow: true,
          },
        ],
      },
    });
  }
  return frames;
}

function finished(prices: number[], table: Table): Dp3TableState {
  const state = blank(prices);
  state.cells = [table.hold, table.sold, table.rest].map((row) => [...row]);
  state.tones = state.tones.map((row) => row.map(() => "hit" as CellTone));
  const last = prices.length - 1;
  state.tones[table.sold[last] > table.rest[last] ? SOLD : FREE][last] = "done";
  state.tones[HOLD][last] = "faded";
  return { ...state, answer: { label: "best profit", value: String(table.answer) } };
}

function solutionFrames(prices: number[], table: Table, slow: SlowRun): Frame[] {
  const frames = fillFrames(prices, table, "solution", false);
  const last = prices.length - 1;
  const done = finished(prices, table);
  frames.push({
    scene: "solution",
    caption: `Last day. A share still held was paid for and never sold, so skip that room. The answer is ${table.answer}, the best of just sold and free.`,
    codeLine: 9,
    state: { ...done, here: [table.sold[last] > table.rest[last] ? SOLD : FREE, last] },
  });
  const rooms = bestRooms(table);
  frames.push({
    scene: "solution",
    caption: "Follow the rooms back from the last day to see one best plan. Every sale is followed by a day in the free room.",
    codeLine: 9,
    state: { ...done, marks: planMarks(rooms), paths: [{ squares: roomPath(rooms), tone: "teal", arrow: true }] },
  });
  frames.push({
    scene: "solution",
    caption: `Time: O(n). Each of the ${prices.length} days filled its three rooms once. The slow way looked at ${slow.total} days.`,
    codeLine: 3,
    state: { ...done, counter: { label: "days filled", value: prices.length } },
  });
  const kept = finished(prices, table);
  kept.tones = kept.tones.map((row) => row.map((_, day) => (day === last ? "window" : "faded") as CellTone));
  frames.push({
    scene: "solution",
    caption: "Space: O(1). A day only looks at yesterday, so the code keeps just three numbers, one per room. Older days fade.",
    codeLine: 0,
    state: { ...kept, answer: done.answer },
  });
  return frames;
}

function practiceFrames(prices: number[], table: Table): Frame[] {
  const frames = fillFrames(prices, table, "card", true);
  const last = prices.length - 1;
  frames.push({
    scene: "card",
    caption: `Done. The best of just sold and free on the last day is ${table.answer}, so the answer is ${table.answer}. You bought only from the free room.`,
    state: { ...finished(prices, table), here: [table.sold[last] > table.rest[last] ? SOLD : FREE, last] },
  });
  return frames;
}

function remembered(prices: number[], table: Table): Dp3TableState {
  const rooms = bestRooms(table);
  return { ...finished(prices, table), marks: planMarks(rooms), paths: [{ squares: roomPath(rooms), tone: "teal", arrow: true }] };
}

export const stockCooldownStory: ProblemStory<Dp3TableState> = {
  slugs: ["lc-309"],
  pattern: "State machine DP",
  trigger: "buy and sell as often as you like, but after a sale you must wait a day",
  insight: "Three rooms per day: holding, just sold, and free. Keep the best profit for each room. You may buy only from the free room, so the day after a sale is always a rest.",
  metaphor: {
    name: "The three rooms",
    legend: "holding room = hold · just sold room = sold · free room = rest · yesterday's sale = soldBefore",
    terms: ["room", "holding", "just sold", "free", "rest"],
  },
  traps: [{ name: "The No-Rest Trap", rule: "After a sale the next day is rest. Buy only from the free room, never straight from yesterday's sale." }],
  template: [
    "hold = -price on day 0; sold = 0; rest = 0;",
    "each next day:",
    "    sold = hold + price;              // sell the share you held",
    "    hold = max(hold, rest - price);   // keep, or buy from free only",
    "    rest = max(rest, yesterday's sold);",
    "answer = max(sold, rest);",
  ],
  complexity: {
    slow: "O(2^n)",
    time: "O(n)",
    timeWhy: "each day fills its three rooms once",
    space: "O(1)",
    spaceWhy: "a day only looks at yesterday, so three numbers are enough",
  },
  code: CODE,
  examples: [
    { label: "1, 2, 3, 0, 2", input: "[1,2,3,0,2]", expected: "3", note: "Tricky: buying at 0 right after selling at 3 is not allowed" },
    { label: "6, 1, 3, 2, 4, 7", input: "[6,1,3,2,4,7]", expected: "6" },
    { label: "3, 5, 1, 4", input: "[3,5,1,4]", expected: "3" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-121", title: "Best Time to Buy and Sell Stock" },
    { slug: "lc-122", title: "Best Time to Buy and Sell Stock II" },
    { slug: "lc-198", title: "House Robber" },
  ],
  answer: (raw) => String(bestByChoices(parseInput(raw))),
  frames: (raw) => {
    const prices = parseInput(raw);
    const table = solve(prices);
    const slow = runSlow(prices);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(prices, table),
      ...slowFrames(prices, slow),
      ...insightFrames(prices),
      ...solutionFrames(prices, table, slow),
      ...practiceFrames(practice, solve(practice)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: remembered(prices, table),
      },
    ];
  },
  View: AgyDp3TableView,
};
