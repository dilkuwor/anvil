import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp1StonesView, type StoneHop, type StoneTag, type StonesState } from "../agy-dp1-stones-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StonesState>;

/** Fresh street for the "your turn" run. Every other house gives 10 or 7 here; the best plan is 11. */
const PRACTICE = "[5,1,2,6,3]";

const CODE = [
  "int skip = 0;",
  "int take = 0;",
  "for (int cash : nums) {",
  "    int next = Math.max(skip + cash, take);",
  "    skip = take;",
  "    take = next;",
  "}",
  "return take;",
];

/** The slow way stops counting here, so a long street cannot freeze the page. */
const SLOW_CAP = 200000;

/** Two start stones stand before the street, so house h (counted from 1) owns stone h + 1. */
const START = 2;

function parseInput(raw: string): number[] {
  const nums = (raw.match(/\d+/g) ?? []).map((part) => Number.parseInt(part, 10));
  return nums.length === 0 ? [2, 1, 1, 2] : nums.slice(0, 100);
}

/** Independent solver: decide house by house from the front, remembering each answer. */
function mostCash(nums: number[]): number {
  const memo = new Map<number, number>();
  const from = (house: number): number => {
    if (house >= nums.length) return 0;
    const known = memo.get(house);
    if (known !== undefined) return known;
    const best = Math.max(nums[house] + from(house + 2), from(house + 1));
    memo.set(house, best);
    return best;
  };
  return from(0);
}

/** The number on every stone: the most cash from the houses up to and including that stone's house. */
function stoneTable(nums: number[]): number[] {
  const table = [0, 0];
  for (const cash of nums) table.push(Math.max(table[table.length - 2] + cash, table[table.length - 1]));
  return table;
}

/** Walk the finished stones backwards to see which houses the best plan robs (houses counted from 1). */
function bestPlan(nums: number[], table: number[]): number[] {
  const plan: number[] = [];
  let stone = nums.length + 1;
  while (stone >= START) {
    if (table[stone] === table[stone - 1]) stone -= 1;
    else {
      plan.unshift(stone - 1);
      stone -= 2;
    }
  }
  return plan;
}

function everyOther(nums: number[], first: number): { houses: number[]; cash: number } {
  const houses: number[] = [];
  let cash = 0;
  for (let index = first; index < nums.length; index += 2) {
    houses.push(index + 1);
    cash += nums[index];
  }
  return { houses, cash };
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function listOf(items: (string | number)[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function housesSaid(houses: number[]) {
  return `${houses.length === 1 ? "house" : "houses"} ${listOf(houses)}`;
}

function blank(nums: number[]): StonesState {
  const count = nums.length + START;
  return {
    marks: Array.from({ length: count }, () => null),
    labels: Array.from({ length: count }, (_, stone) => (stone < START ? "start" : String(stone - 1))),
    labelTitle: "house",
    tones: Array.from({ length: count }, () => "idle" as CellTone),
    hops: [],
    tags: [],
    items: { title: "cash", offset: START, cells: nums.map((cash) => ({ text: String(cash), tone: "idle" as CellTone })) },
    ring: null,
    counter: null,
    note: null,
    trapNote: null,
  };
}

function withTones(state: StonesState, paint: Record<number, CellTone>): StonesState {
  const tones = [...state.tones];
  for (const [stone, tone] of Object.entries(paint)) tones[Number(stone)] = tone;
  return { ...state, tones };
}

/** Colour the cash boxes of some houses (houses counted from 1). */
function withHouses(state: StonesState, houses: number[], tone: CellTone): StonesState {
  if (!state.items) return state;
  return { ...state, items: { ...state.items, cells: state.items.cells.map((cell, index) => (houses.includes(index + 1) ? { ...cell, tone } : cell)) } };
}

/** The two hops onto a house's stone: walk past (short, number unchanged) and rob (long, plus the cash). */
function landing(nums: number[], stone: number, paint: (kind: "pass" | "rob") => StoneHop["tone"]): StoneHop[] {
  return [
    { from: stone - 1, to: stone, label: "pass", tone: paint("pass") },
    { from: stone - 2, to: stone, label: `+${nums[stone - START]}`, tone: paint("rob") },
  ];
}

function planHops(nums: number[], table: number[]): StoneHop[] {
  const hops: StoneHop[] = [];
  let stone = nums.length + 1;
  while (stone >= START) {
    if (table[stone] === table[stone - 1]) {
      hops.unshift({ from: stone - 1, to: stone, label: "pass", tone: "best" });
      stone -= 1;
    } else {
      hops.unshift({ from: stone - 2, to: stone, label: `+${nums[stone - START]}`, tone: "best" });
      stone -= 2;
    }
  }
  return hops;
}

function finished(nums: number[], table: number[]): StonesState {
  const plan = bestPlan(nums, table);
  const state = withHouses(blank(nums), plan, "done");
  return { ...state, marks: [...table], tones: table.map((_, stone) => (stone === nums.length + 1 ? "done" : "hit")), hops: planHops(nums, table), note: `most cash: ${table[nums.length + 1]}` };
}

function pictureFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const allowed = everyOther(nums, 0);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A street of ${plural(n, "house")}. The number in each box is the cash inside. Above every house is a stepping stone, still empty.`,
      state: blank(nums),
    },
    {
      scene: "picture",
      caption:
        allowed.houses.length > 1
          ? `Allowed: rob ${housesSaid(allowed.houses)}. No two of them are next door. That takes ${allowed.houses.map((house) => nums[house - 1]).join(" + ")} = ${allowed.cash}.`
          : `Allowed: rob house 1. That takes ${allowed.cash}.`,
      state: withHouses(blank(nums), allowed.houses, "hit"),
    },
  ];
  if (n >= 2) {
    frames.push({
      scene: "picture",
      caption: "Not allowed: houses 1 and 2 together. They are next door to each other, so the alarm goes off.",
      state: { ...withHouses(blank(nums), [1, 2], "miss"), trapNote: "✕ two houses next door" },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: take the most cash we can, without ever robbing two houses that are next door.",
    state: blank(nums),
  });
  return frames;
}

type SlowRun = { questions: number; capped: boolean; asked: number[]; firstDive: { questions: number; asked: number[] } | null; total: number };

/** Plain recursion, really run: every stone asks the two stones behind it and nobody writes an answer down. */
function runSlow(nums: number[]): SlowRun {
  const run: SlowRun = { questions: 0, capped: false, asked: Array.from({ length: nums.length + START }, () => 0), firstDive: null, total: 0 };
  const ask = (stone: number): number => {
    if (run.capped) return 0;
    if (run.questions >= SLOW_CAP) {
      run.capped = true;
      return 0;
    }
    run.questions++;
    run.asked[stone]++;
    if (stone < START) {
      run.firstDive ??= { questions: run.questions, asked: [...run.asked] };
      return 0;
    }
    return Math.max(ask(stone - 1), ask(stone - 2) + nums[stone - START]);
  };
  run.total = ask(nums.length + 1);
  return run;
}

function askedTags(asked: number[]): StoneTag[] {
  return asked.flatMap((count, stone) => (count > 0 ? [{ stone, text: `×${count}`, tone: count > 1 ? ("coral" as const) : ("accent" as const) }] : []));
}

function slowFrames(nums: number[], run: SlowRun): Frame[] {
  const n = nums.length;
  const last = n + 1;
  const label = "questions asked";
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: stand at house ${n} and ask for the most cash up to here. We either walk past this house or rob it, so ask the stone one back and the stone two back.`,
      state: { ...withTones(blank(nums), { [last]: "edge" }), hops: landing(nums, last, () => "try"), tags: [{ stone: last, text: "×1", tone: "accent" }], counter: { label, value: "1" } },
    },
  ];
  if (n >= 2 && run.firstDive) {
    frames.push({
      scene: "slow",
      caption: "Those stones do not know either. Each one asks the two stones behind it, and so on, all the way back to the start.",
      state: { ...withTones(blank(nums), { [last]: "edge" }), tags: askedTags(run.firstDive.asked), counter: { label, value: String(run.firstDive.questions) } },
    });
  }
  const shown = run.capped ? `${SLOW_CAP}+` : String(run.questions);
  const paint: Record<number, CellTone> = {};
  run.asked.forEach((count, stone) => {
    if (count > 1) paint[stone] = "miss";
  });
  frames.push({
    scene: "slow",
    caption: run.capped
      ? `Nobody writes an answer down, so the same stones are asked again and again. We stopped counting after ${SLOW_CAP} questions. This is O(2^n) time.`
      : `Nobody writes an answer down, so the same stones are asked again and again. It finds the right amount, ${run.total}, but needs ${plural(run.questions, "question")} for ${plural(n, "house")}: O(2^n) time.`,
    state: { ...withTones(blank(nums), paint), tags: run.capped ? [] : askedTags(run.asked), counter: { label, value: shown } },
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const last = n + 1;
  const cash = nums[n - 1];
  const lit = withTones(blank(nums), { [last]: "edge" });
  return [
    {
      scene: "insight",
      caption: "Every house has a stone. The number on a stone means: the most cash we can take from the houses up to and including this one.",
      state: blank(nums),
    },
    {
      scene: "insight",
      caption: `Stand at the last house, house ${n}. One choice: walk past it. That is a short hop from the stone one back, and the number stays the same.`,
      state: { ...withTones(lit, { [last - 1]: "window" }), hops: [landing(nums, last, () => "try")[0]] },
    },
    {
      scene: "insight",
      caption: `The other choice: rob it. Then the house next door must be left alone. So it is a long hop from the stone two back, plus this house's cash, ${cash}.`,
      state: { ...withHouses(withTones(lit, { [last - 2]: "window" }), [n], "window"), hops: [landing(nums, last, () => "try")[1]] },
    },
    {
      scene: "insight",
      caption: "The stone takes the larger of the two hops. Every stone works the same way, so we fill them from the start of the street, once each.",
      state: { ...withTones(lit, { [last - 1]: "window", [last - 2]: "window" }), hops: landing(nums, last, () => "best") },
    },
  ];
}

type Choice = { house: number; stone: number; cash: number; pass: number; rob: number; skip: number };

function whichHopQuiz(cells: number, choice: Choice): StoryQuiz {
  const robWins = choice.rob > choice.pass;
  const answer = robWins ? choice.stone - 2 : choice.stone - 1;
  const wrong = robWins ? choice.stone - 1 : choice.stone - 2;
  return {
    kind: "cell",
    cells,
    question: `Two hops can land on the stone of house ${choice.house}. Which one leaves us with more cash? Click the stone it starts from.`,
    answer,
    feedback: {
      [choice.stone]: "That is the stone being filled. Pick the stone the better hop starts from.",
      [wrong]: robWins
        ? `That is the short hop: walk past house ${choice.house} and keep ${choice.pass}. Work out what the other hop gives.`
        : `That is the long hop: rob house ${choice.house}, which makes ${choice.skip} + ${choice.cash} = ${choice.rob}. Compare it with the other hop.`,
    },
    otherwise: "No hop onto this stone starts there. Pick a stone where one of the two arcs begins.",
    why: robWins
      ? `Robbing gives ${choice.skip} + ${choice.cash} = ${choice.rob}. Walking past keeps only ${choice.pass}. The long hop wins.`
      : `Walking past keeps ${choice.pass}. Robbing would give only ${choice.skip} + ${choice.cash} = ${choice.rob}. The short hop wins.`,
  };
}

function choiceAt(nums: number[], table: number[], house: number): Choice {
  const stone = house + 1;
  const cash = nums[house - 1];
  return { house, stone, cash, pass: table[stone - 1], skip: table[stone - 2], rob: table[stone - 2] + cash };
}

function carried(stone: number): StoneTag[] {
  return [
    { stone: stone - 2, text: "skip", tone: "accent" },
    { stone: stone - 1, text: "take", tone: "accent" },
  ];
}

function verdict(choice: Choice): string {
  if (choice.rob > choice.pass) return `Rob it: ${choice.skip} + ${choice.cash} = ${choice.rob}, against ${choice.pass} for walking past. Robbing is larger, so this stone gets ${choice.rob}.`;
  if (choice.rob < choice.pass) return `Walk past: ${choice.pass}, against ${choice.skip} + ${choice.cash} = ${choice.rob} for robbing it. Walking past is larger, so this stone gets ${choice.pass}.`;
  return `Walk past: ${choice.pass}, and robbing it also makes ${choice.skip} + ${choice.cash} = ${choice.rob}. Both hops give the same, so this stone gets ${choice.pass}.`;
}

function winnerPaint(choice: Choice) {
  return (kind: "pass" | "rob"): StoneHop["tone"] => ((kind === "rob") === choice.rob > choice.pass ? "best" : "faded");
}

/** The real algorithm: two carried numbers rolling along the street. */
function solutionFrames(nums: number[], table: number[], slow: SlowRun): Frame[] {
  const n = nums.length;
  const cells = n + START;
  const frames: Frame[] = [];
  const marks: (number | null)[] = Array.from({ length: cells }, () => null);
  const tones: CellTone[] = Array.from({ length: cells }, () => "idle");
  const at = (extra: Partial<StonesState> = {}, paint: Record<number, CellTone> = {}, house: number | null = null): StonesState => {
    const state = withTones({ ...blank(nums), marks: [...marks], tones: [...tones], ...extra }, paint);
    return house === null ? state : withHouses(state, [house], "window");
  };

  marks[0] = 0;
  marks[1] = 0;
  tones[0] = "hit";
  tones[1] = "hit";
  frames.push({
    scene: "solution",
    caption: "Before the street stand two start stones. With no houses there is no cash, so both start stones get 0.",
    codeLine: 0,
    state: at(),
  });
  frames.push({
    scene: "solution",
    caption: "We carry just two numbers along the street. take is the stone one back. skip is the stone two back: what we hold if the house before is left alone.",
    codeLine: 1,
    state: at({ tags: carried(START) }, { 0: "window", 1: "window" }),
  });

  const choices = nums.map((_, index) => choiceAt(nums, table, index + 1));
  const quizHouse = choices.find((choice) => choice.house >= 2 && choice.rob !== choice.pass)?.house ?? null;

  for (const choice of choices) {
    const { house, stone, cash } = choice;
    const value = Math.max(choice.rob, choice.pass);
    const detail = house === 1 || house === quizHouse;
    if (!detail) {
      marks[stone] = value;
      tones[stone] = "hit";
      tones[stone - 2] = "faded";
      frames.push({
        scene: "solution",
        caption: `House ${house} holds ${cash}. ${verdict(choice)}`,
        codeLine: 3,
        state: at({ tags: carried(stone), hops: landing(nums, stone, winnerPaint(choice)) }, { [stone]: "edge" }, house),
      });
      continue;
    }

    const look: Frame = {
      scene: "solution",
      caption: `House ${house} holds ${cash}. Two hops can land on its stone: a short hop that walks past it, and a long hop that robs it and adds ${cash}.`,
      codeLine: 2,
      state: at({ tags: carried(stone), hops: landing(nums, stone, () => "try") }, { [stone]: "edge" }, house),
    };
    if (house === quizHouse) look.quiz = whichHopQuiz(cells, choice);
    frames.push(look);
    marks[stone] = value;
    tones[stone] = "hit";
    frames.push({
      scene: "solution",
      caption: verdict(choice),
      codeLine: 3,
      state: at({ tags: carried(stone), hops: landing(nums, stone, winnerPaint(choice)) }, { [stone]: "edge" }, house),
    });
    tones[stone - 2] = "faded";
    if (house === 1) {
      frames.push({
        scene: "solution",
        caption: "Move along the street. The stone two back is never needed again, so it is forgotten. skip now means the stone that take was on.",
        codeLine: 4,
        state: at({ tags: [{ stone: stone - 1, text: "skip", tone: "accent" }] }),
      });
      frames.push({
        scene: "solution",
        caption: `And take now means the stone of house ${house}. We still carry just two numbers: ${choice.pass} and ${value}.`,
        codeLine: 5,
        state: at({ tags: carried(stone + 1) }),
      });
    } else {
      frames.push({
        scene: "solution",
        caption: "Move along: the stone two back is forgotten, and the carried pair, skip and take, shifts one stone forward.",
        codeLine: 4,
        state: at({ tags: carried(stone + 1) }),
      });
    }
  }

  const answer = table[n + 1];
  const plan = bestPlan(nums, table);
  const done = finished(nums, table);
  frames.push({
    scene: "solution",
    caption: `The street is done. The last stone holds ${answer}, from robbing ${housesSaid(plan)}: follow the hops back to see them. The answer is ${answer}.`,
    codeLine: 7,
    state: done,
  });

  const odd = everyOther(nums, 0);
  const even = everyOther(nums, 1);
  if (answer > Math.max(odd.cash, even.cash)) {
    frames.push({
      scene: "solution",
      caption: `The Every-Other Trap: robbing every second house feels right. From house 1 that takes ${odd.cash}, and from house 2 it takes ${even.cash}. Both fall short of ${answer}.`,
      codeLine: 3,
      state: { ...withHouses(withHouses({ ...blank(nums), marks: [...table], tones: table.map(() => "hit" as CellTone) }, odd.houses, "miss"), even.houses, "faded"), trapNote: `✕ every other house: ${odd.cash} or ${even.cash}, not ${answer}` },
    });
    frames.push({
      scene: "solution",
      caption: `The best plan, ${housesSaid(plan)}, walks past two houses in a row. That is why every stone compares both hops, and no pattern is assumed.`,
      codeLine: 3,
      state: done,
    });
  }

  const slowSaid = slow.capped ? `more than ${SLOW_CAP} questions` : plural(slow.questions, "question");
  frames.push({
    scene: "solution",
    caption: `Time: O(n). One walk along the street, and each of the ${plural(n, "house")} compared its two hops once.${slow.capped || slow.questions > n ? ` The slow way asked ${slowSaid}.` : ""}`,
    codeLine: 2,
    state: { ...done, hops: [], counter: { label: "houses visited", value: String(n) } },
  });
  frames.push({
    scene: "solution",
    caption: "Space: O(1). However long the street, we carry only two numbers, skip and take. Every stone further back is forgotten.",
    codeLine: 0,
    state: at({ tags: carried(n + START) }, { [n + 1]: "window", [n]: "window" }),
  });
  return frames;
}

/** The "your turn" run: the reader picks the better hop at every house. */
function practiceFrames(nums: number[], table: number[]): Frame[] {
  const n = nums.length;
  const cells = n + START;
  const frames: Frame[] = [];
  const marks: (number | null)[] = Array.from({ length: cells }, () => null);
  const tones: CellTone[] = Array.from({ length: cells }, () => "idle");
  marks[0] = 0;
  marks[1] = 0;
  tones[0] = "hit";
  tones[1] = "hit";
  const at = (extra: Partial<StonesState> = {}, paint: Record<number, CellTone> = {}, house: number | null = null): StonesState => {
    const state = withTones({ ...blank(nums), marks: [...marks], tones: [...tones], ...extra }, paint);
    return house === null ? state : withHouses(state, [house], "window");
  };

  frames.push({
    scene: "card",
    caption: `Your turn, on a new street: ${nums.join(", ")}. Both start stones hold 0. At every house, you pick the hop.`,
    state: at(),
  });

  for (let house = 1; house <= n; house++) {
    const choice = choiceAt(nums, table, house);
    const { stone } = choice;
    const value = Math.max(choice.rob, choice.pass);
    if (choice.rob !== choice.pass) {
      frames.push({
        scene: "card",
        caption: `House ${house} holds ${choice.cash}. A short hop walks past it. A long hop robs it and adds ${choice.cash}.`,
        state: at({ hops: landing(nums, stone, () => "try") }, { [stone]: "edge" }, house),
        quiz: whichHopQuiz(cells, choice),
      });
    }
    marks[stone] = value;
    tones[stone] = "hit";
    frames.push({
      scene: "card",
      caption: choice.rob === choice.pass ? `House ${house} holds ${choice.cash}. ${verdict(choice)}` : verdict(choice),
      state: at({ hops: landing(nums, stone, winnerPaint(choice)) }, { [stone]: "edge" }, house),
    });
    tones[stone - 2] = "faded";
  }

  const answer = table[n + 1];
  const plan = bestPlan(nums, table);
  const odd = everyOther(nums, 0);
  const even = everyOther(nums, 1);
  const done = finished(nums, table);
  if (answer > Math.max(odd.cash, even.cash) && even.houses.length > 0) {
    frames.push({
      scene: "card",
      caption: `The last stone holds ${answer}. One plan of houses reaches that amount.`,
      state: { ...done, hops: [], items: blank(nums).items },
      quiz: {
        kind: "choice",
        question: `Which plan takes ${answer}?`,
        options: [`Every other house from house 1: ${housesSaid(odd.houses)}`, `A plan with a wider gap: ${housesSaid(plan)}`, `Every other house from house 2: ${housesSaid(even.houses)}`],
        answer: 1,
        why: `Every other house takes only ${odd.cash} or ${even.cash}. Believing it must be one of those is the Every-Other Trap.`,
      },
    });
    frames.push({
      scene: "card",
      caption: `Done. The answer is ${answer}, from ${housesSaid(plan)}. Every other house takes only ${odd.cash} or ${even.cash}: you stepped around the Every-Other Trap.`,
      state: { ...done, trapNote: `every other house: ${odd.cash} or ${even.cash}` },
    });
  } else {
    frames.push({ scene: "card", caption: `Done. The answer is ${answer}, from ${housesSaid(plan)}. You compared both hops at every house.`, state: done });
  }
  return frames;
}

export const houseRobberStory: ProblemStory<StonesState> = {
  slugs: ["lc-198"],
  pattern: "1-D DP",
  trigger: "the largest total from a row of numbers, where two picked numbers may never be neighbours",
  insight: "Stepping stones, one per house. Walk past a house: a short hop, number unchanged. Rob it: a long hop from two stones back, plus its cash. Each stone keeps the larger.",
  metaphor: {
    name: "The stepping stones",
    legend: "number on a stone = most cash up to that house · take = the stone one back · skip = the stone two back · short hop = walk past · long hop = rob: skip + cash",
    terms: ["stone", "hop", "carry", "carried", "walk past"],
  },
  traps: [{ name: "The Every-Other Trap", rule: "The best plan is not always every other house. In 2, 1, 1, 2 it robs both ends and walks past two houses in a row. Compare both hops at every stone." }],
  template: [
    "twoBack = 0; oneBack = 0;",
    "for (each item x in the row) {",
    "    now = max(oneBack, twoBack + x);   // leave x, or pick x",
    "    twoBack = oneBack; oneBack = now;",
    "}",
    "return oneBack;",
  ],
  complexity: {
    slow: "O(2^n)",
    time: "O(n)",
    timeWhy: "one walk along the street; each house compares two hops once",
    space: "O(1)",
    spaceWhy: "only two numbers are carried, skip and take",
  },
  code: CODE,
  examples: [
    { label: "[2,1,1,2]", input: "[2,1,1,2]", expected: "4", note: "Every other house goes wrong here" },
    { label: "[2,7,9,3,1]", input: "[2,7,9,3,1]", expected: "12" },
    { label: "[1,2,3,1]", input: "[1,2,3,1]", expected: "4" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-213", title: "House Robber II" },
    { slug: "lc-70", title: "Climbing Stairs" },
    { slug: "lc-322", title: "Coin Change" },
  ],
  answer: (raw) => String(mostCash(parseInput(raw))),
  frames: (raw) => {
    const nums = parseInput(raw);
    const table = stoneTable(nums);
    const slow = runSlow(nums);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums, slow),
      ...insightFrames(nums),
      ...solutionFrames(nums, table, slow),
      ...practiceFrames(practice, stoneTable(practice)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: finished(nums, table),
      },
    ];
  },
  View: AgyDp1StonesView,
};
