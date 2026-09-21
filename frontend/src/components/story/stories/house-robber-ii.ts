import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp1StonesView, type StoneHop, type StoneTag, type StonesState } from "../agy-dp1-stones-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StonesState>;

/** Fresh ring for the "your turn" run. As a straight street it would give 13; as a ring only 9. */
const PRACTICE = "[7,1,2,6]";

const CODE = [
  "public int rob(int[] nums) {",
  "    if (nums.length == 1) return nums[0];",
  "    return Math.max(robRange(nums, 0, nums.length - 2), robRange(nums, 1, nums.length - 1));",
  "}",
  "private int robRange(int[] nums, int from, int to) {",
  "    int skip = 0, take = 0;",
  "    for (int i = from; i <= to; i++) {",
  "        int next = Math.max(skip + nums[i], take);",
  "        skip = take;",
  "        take = next;",
  "    }",
  "    return take;",
  "}",
];

/** The slow way stops counting here, so a long street cannot freeze the page. */
const SLOW_CAP = 200000;

/** Two start stones stand before the street, so house h (counted from 1) owns stone h + 1. */
const START = 2;

/** One straight row cut out of the ring. `from` and `to` are house positions counted from 0, as in the code. */
type Row = { name: "one" | "two"; from: number; to: number; leftOut: number };

function parseInput(raw: string): number[] {
  const nums = (raw.match(/\d+/g) ?? []).map((part) => Number.parseInt(part, 10));
  return nums.length === 0 ? [1, 2, 3, 1] : nums.slice(0, 100);
}

function rowsOf(nums: number[]): Row[] {
  const n = nums.length;
  return [
    { name: "one", from: 0, to: n - 2, leftOut: n },
    { name: "two", from: 1, to: n - 1, leftOut: 1 },
  ];
}

/** Independent solver: on a small ring, simply try every set of houses. Longer rings use two remembered rows. */
function mostCash(nums: number[]): number {
  const n = nums.length;
  if (n === 1) return nums[0];
  if (n <= 16) {
    let best = 0;
    for (let set = 0; set < 1 << n; set++) {
      let cash = 0;
      let allowed = true;
      for (let house = 0; house < n && allowed; house++) {
        if (!(set & (1 << house))) continue;
        if (set & (1 << ((house + 1) % n))) allowed = false;
        cash += nums[house];
      }
      if (allowed) best = Math.max(best, cash);
    }
    return best;
  }
  const line = (from: number, to: number): number => {
    const memo = new Map<number, number>();
    const best = (house: number): number => {
      if (house > to) return 0;
      const known = memo.get(house);
      if (known !== undefined) return known;
      const value = Math.max(nums[house] + best(house + 2), best(house + 1));
      memo.set(house, value);
      return value;
    };
    return best(from);
  };
  return Math.max(line(0, n - 2), line(1, n - 1));
}

/** The number on every stone of one row. Stones outside the row stay null. */
function rowTable(nums: number[], row: Row): (number | null)[] {
  const table: (number | null)[] = Array.from({ length: nums.length + START }, () => null);
  table[row.from] = 0;
  table[row.from + 1] = 0;
  for (let house = row.from; house <= row.to; house++) {
    table[house + START] = Math.max((table[house] ?? 0) + nums[house], table[house + 1] ?? 0);
  }
  return table;
}

function rowResult(table: (number | null)[], row: Row): number {
  return table[row.to + START] ?? 0;
}

/** Houses the row's best plan robs, counted from 1. */
function rowPlan(table: (number | null)[], row: Row): { houses: number[]; hops: StoneHop[] } {
  const houses: number[] = [];
  const hops: StoneHop[] = [];
  let stone = row.to + START;
  while (stone >= row.from + START) {
    if (table[stone] === table[stone - 1]) {
      hops.unshift({ from: stone - 1, to: stone, label: "pass", tone: "best" });
      stone -= 1;
    } else {
      const cash = (table[stone] ?? 0) - (table[stone - 2] ?? 0);
      houses.unshift(stone - 1);
      hops.unshift({ from: stone - 2, to: stone, label: `+${cash}`, tone: "best" });
      stone -= 2;
    }
  }
  return { houses, hops };
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
    ring: nums.length > 1 ? "plain" : null,
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

function withHouses(state: StonesState, houses: number[], tone: CellTone): StonesState {
  if (!state.items) return state;
  return { ...state, items: { ...state.items, cells: state.items.cells.map((cell, index) => (houses.includes(index + 1) ? { ...cell, tone } : cell)) } };
}

/** One row of the ring: the left-out house is crossed out, and stones outside the row fade away. */
function rowState(nums: number[], row: Row): StonesState {
  const state = blank(nums);
  const tones = state.tones.map((_, stone) => (stone < row.from || stone > row.to + START ? ("faded" as CellTone) : ("idle" as CellTone)));
  const cells = state.items!.cells.map((cell, index) => (index + 1 === row.leftOut ? { ...cell, crossed: true } : cell));
  return { ...state, tones, ring: null, items: { ...state.items!, cells } };
}

function landing(nums: number[], stone: number, paint: (kind: "pass" | "rob") => StoneHop["tone"]): StoneHop[] {
  return [
    { from: stone - 1, to: stone, label: "pass", tone: paint("pass") },
    { from: stone - 2, to: stone, label: `+${nums[stone - START]}`, tone: paint("rob") },
  ];
}

function pictureFrames(nums: number[]): Frame[] {
  const n = nums.length;
  if (n === 1) {
    return [
      { scene: "picture", caption: `A ring with a single house, holding ${nums[0]}. Above it is a stepping stone, still empty.`, state: blank(nums) },
      { scene: "picture", caption: "Robbing two houses that are next door sets off the alarm. This house has no neighbour at all.", state: withHouses(blank(nums), [1], "hit") },
      { scene: "picture", caption: "The goal: take the most cash we can, without ever robbing two houses that are next door.", state: blank(nums) },
    ];
  }
  const allowed: number[] = [];
  for (let house = 1; house <= n; house += 2) if (house === 1 || house < n) allowed.push(house);
  return [
    {
      scene: "picture",
      caption: `${plural(n, "house")} stand in a ring. The number in each box is the cash inside. The dashed line shows it: the last house is next door to the first.`,
      state: blank(nums),
    },
    {
      scene: "picture",
      caption:
        allowed.length > 1
          ? `Allowed: rob ${housesSaid(allowed)}. No two of them are next door. That takes ${allowed.map((house) => nums[house - 1]).join(" + ")} = ${allowed.reduce((sum, house) => sum + nums[house - 1], 0)}.`
          : `Allowed: rob house 1 alone. That takes ${nums[0]}.`,
      state: withHouses(blank(nums), allowed, "hit"),
    },
    {
      scene: "picture",
      caption: `Not allowed: house 1 and house ${n} together. Around the ring they are next door, so the alarm goes off.`,
      state: { ...withHouses(blank(nums), [1, n], "miss"), ring: "clash" },
    },
    {
      scene: "picture",
      caption: "The goal: take the most cash we can, without ever robbing two houses that are next door.",
      state: blank(nums),
    },
  ];
}

type SlowRow = { row: Row; questions: number; asked: number[]; result: number };
type SlowRun = { questions: number; capped: boolean; rows: SlowRow[]; total: number };

/** Plain recursion, really run on both rows: every stone asks the two stones behind it, and nothing is written down. */
function runSlow(nums: number[]): SlowRun {
  const run: SlowRun = { questions: 0, capped: false, rows: [], total: 0 };
  if (nums.length === 1) {
    run.questions = 1;
    run.total = nums[0];
    return run;
  }
  for (const row of rowsOf(nums)) {
    const asked = Array.from({ length: nums.length + START }, () => 0);
    const before = run.questions;
    const ask = (stone: number): number => {
      if (run.capped) return 0;
      if (run.questions >= SLOW_CAP) {
        run.capped = true;
        return 0;
      }
      run.questions++;
      asked[stone]++;
      if (stone < row.from + START) return 0;
      return Math.max(ask(stone - 1), ask(stone - 2) + nums[stone - START]);
    };
    const result = ask(row.to + START);
    run.rows.push({ row, questions: run.questions - before, asked, result });
    run.total = Math.max(run.total, result);
  }
  return run;
}

function askedTags(asked: number[]): StoneTag[] {
  return asked.flatMap((count, stone) => (count > 0 ? [{ stone, text: `×${count}`, tone: count > 1 ? ("coral" as const) : ("accent" as const) }] : []));
}

function slowFrames(nums: number[], run: SlowRun): Frame[] {
  const n = nums.length;
  const label = "questions asked";
  if (n === 1) {
    return [
      {
        scene: "slow",
        caption: `The slow way asks every stone for the most cash up to its house. With a single house that is 1 question, and the answer is ${nums[0]}. Longer rings are where it hurts.`,
        state: { ...withTones(blank(nums), { [START]: "edge" }), tags: [{ stone: START, text: "×1", tone: "accent" }], counter: { label, value: "1" } },
      },
    ];
  }
  const [one, two] = run.rows;
  const lastOne = one.row.to + START;
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: cut the ring into two straight rows. In row one, without house ${n}, the last stone asks the stone one back and the stone two back.`,
      state: { ...withTones(rowState(nums, one.row), { [lastOne]: "edge" }), hops: landing(nums, lastOne, () => "try"), tags: [{ stone: lastOne, text: "×1", tone: "accent" }], counter: { label, value: "1" } },
    },
    {
      scene: "slow",
      caption: `Those stones ask the stones behind them, and so on, back to the start. Nobody writes an answer down. Row one alone takes ${plural(one.questions, "question")}.`,
      state: { ...rowState(nums, one.row), tags: askedTags(one.asked), counter: { label, value: String(one.questions) } },
    },
  ];
  frames.push({
    scene: "slow",
    caption: run.capped
      ? `Row two, without house 1, asks all over again. We stopped counting after ${SLOW_CAP} questions. This is O(2^n) time.`
      : `Row two, without house 1, asks all over again. It finds the right amount, ${run.total}, but needs ${plural(run.questions, "question")} for ${plural(n, "house")}: O(2^n) time.`,
    state: { ...rowState(nums, two.row), tags: run.capped ? [] : askedTags(two.asked), counter: { label, value: run.capped ? `${SLOW_CAP}+` : String(run.questions) } },
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const n = nums.length;
  if (n === 1) {
    return [
      {
        scene: "insight",
        caption: "Every house has a stone. The number on a stone means: the most cash we can take from the houses of the row, up to and including this one.",
        state: blank(nums),
      },
      {
        scene: "insight",
        caption: "A longer ring is cut open into straight rows. A single house needs no cutting: nothing is next door to it.",
        state: withHouses(blank(nums), [1], "window"),
      },
    ];
  }
  const [one, two] = rowsOf(nums);
  return [
    {
      scene: "insight",
      caption: "Every house has a stone. The number on a stone means: the most cash we can take from the houses of the row, up to and including this one.",
      state: blank(nums),
    },
    {
      scene: "insight",
      caption: `A straight row of stones is easy. The ring adds just one rule: house 1 and house ${n} can never both be robbed.`,
      state: { ...withHouses(blank(nums), [1, n], "miss"), ring: "clash" },
    },
    {
      scene: "insight",
      caption: `So cut the ring open. Row one leaves out house ${n}. Now house 1 has no neighbour behind it, and the row is a plain straight street.`,
      state: rowState(nums, one),
    },
    {
      scene: "insight",
      caption: `Row two leaves out house 1 instead. The best ring plan cannot use both ends, so it fits inside one of the two rows. The answer is the larger result.`,
      state: rowState(nums, two),
    },
  ];
}

type Choice = { house: number; stone: number; cash: number; pass: number; rob: number; skip: number };

function choiceAt(nums: number[], table: (number | null)[], house: number): Choice {
  const stone = house + 1;
  const cash = nums[house - 1];
  const skip = table[stone - 2] ?? 0;
  return { house, stone, cash, pass: table[stone - 1] ?? 0, skip, rob: skip + cash };
}

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

function leaveOutQuiz(nums: number[], row: Row): StoryQuiz {
  const n = nums.length;
  const cells = n + START;
  const answer = row.leftOut + 1;
  const otherEnd = row.leftOut === 1 ? n + 1 : START;
  const feedback: Record<number, string> = {};
  if (otherEnd !== answer) {
    feedback[otherEnd] =
      row.name === "one"
        ? "Row one keeps that house. The house to leave out is the one that is next door to it around the ring."
        : "Row one already left that house out. Row two must give it a chance, and leave out its ring neighbour.";
  }
  feedback[0] = "That is a start stone, not a house.";
  feedback[1] = "That is a start stone, not a house.";
  return {
    kind: "cell",
    cells,
    question: row.name === "one" ? "Row one keeps house 1. Which house must it leave out to break the ring? Click that house's stone." : "Row two breaks the ring at the other end. Which house must it leave out? Click that house's stone.",
    answer,
    feedback,
    otherwise: "Houses in the middle are no problem: a straight row already keeps next-door houses apart. Look at the two ends of the ring.",
    why:
      row.name === "one"
        ? `House ${n} is next door to house 1 around the ring. Without it, the row is a plain straight street.`
        : `Leaving out house 1 lets plans that rob house ${n} have their chance.`,
  };
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

function rowDone(nums: number[], row: Row, table: (number | null)[]): StonesState {
  const plan = rowPlan(table, row);
  const state = withHouses(rowState(nums, row), plan.houses, "done");
  const tones = state.tones.map((tone, stone) => (tone === "faded" ? tone : stone === row.to + START ? ("done" as CellTone) : ("hit" as CellTone)));
  return { ...state, marks: [...table], tones, hops: plan.hops, note: `row ${row.name}: ${rowResult(table, row)}` };
}

/** The picture to keep: the winning row, finished. */
function finished(nums: number[]): StonesState {
  if (nums.length === 1) {
    return { ...withHouses(blank(nums), [1], "done"), marks: [0, 0, nums[0]], tones: ["hit", "hit", "done"], note: `most cash: ${nums[0]}` };
  }
  const rows = rowsOf(nums);
  const tables = rows.map((row) => rowTable(nums, row));
  const winner = rowResult(tables[1], rows[1]) > rowResult(tables[0], rows[0]) ? 1 : 0;
  return { ...rowDone(nums, rows[winner], tables[winner]), note: `most cash: ${rowResult(tables[winner], rows[winner])}` };
}

/** What happens when the single-house check is forgotten: both rows are empty. */
function loneHouseTrap(nums: number[]): StonesState {
  const state = blank(nums);
  return {
    ...state,
    marks: [0, 0, null],
    tones: ["hit", "hit", "faded"],
    items: { ...state.items!, cells: [{ text: String(nums[0]), tone: "miss", crossed: true }] },
    trapNote: `✕ both rows are empty: 0, not ${nums[0]}`,
  };
}

/** The real algorithm: the single-house check, then two straight rows with two carried numbers each. */
function solutionFrames(nums: number[], slow: SlowRun): Frame[] {
  const n = nums.length;
  const cells = n + START;
  const frames: Frame[] = [];

  if (n === 1) {
    frames.push({
      scene: "solution",
      caption: `First check: is there only one house? Yes, and nothing is next door to it, so we simply rob it. The answer is ${nums[0]}.`,
      codeLine: 1,
      state: finished(nums),
    });
    frames.push({
      scene: "solution",
      caption: "The Lone House Trap: skip that check, and row one leaves out the last house while row two leaves out the first. Here both are this same house.",
      codeLine: 2,
      state: loneHouseTrap(nums),
    });
    frames.push({
      scene: "solution",
      caption: `Both rows would be empty, so no stone is ever filled, and the result would be 0 instead of ${nums[0]}. That is why the single house is checked first.`,
      codeLine: 1,
      state: loneHouseTrap(nums),
    });
    frames.push({
      scene: "solution",
      caption: "Time: O(n). With one house there is a single check and no walk along any stones at all.",
      codeLine: 1,
      state: { ...finished(nums), counter: { label: "hops compared", value: "0" } },
    });
    frames.push({
      scene: "solution",
      caption: "Space: O(1). Nothing is carried here. On longer rings each row carries only two numbers, skip and take.",
      codeLine: 5,
      state: finished(nums),
    });
    return frames;
  }

  frames.push({
    scene: "solution",
    caption: `First check: is there only one house? Here there are ${n}, so we go on and cut the ring into two rows of stones.`,
    codeLine: 1,
    state: blank(nums),
  });

  const rows = rowsOf(nums);
  const tables = rows.map((row) => rowTable(nums, row));
  let askedHop = false;
  let compared = 0;

  rows.forEach((row, index) => {
    const table = tables[index];
    const marks: (number | null)[] = Array.from({ length: cells }, () => null);
    const base = rowState(nums, row);
    const tones = [...base.tones];
    const at = (extra: Partial<StonesState> = {}, paint: Record<number, CellTone> = {}, house: number | null = null): StonesState => {
      const state = withTones({ ...base, marks: [...marks], tones: [...tones], ...extra }, paint);
      return house === null ? state : withHouses(state, [house], "window");
    };
    const full = index === 0;

    if (full) {
      frames.push({
        scene: "solution",
        caption: `Row one leaves out house ${n}, so the ring is broken. What remains, ${housesSaid(Array.from({ length: row.to - row.from + 1 }, (_, k) => row.from + k + 1))}, is a plain straight street.`,
        codeLine: 2,
        state: at(),
      });
    } else {
      const previous = rowDone(nums, rows[0], tables[0]);
      frames.push({
        scene: "solution",
        caption: `Row one is finished: its last stone holds ${rowResult(tables[0], rows[0])}. Now the ring is cut open a second time, at the other end.`,
        codeLine: 11,
        state: previous,
        quiz: leaveOutQuiz(nums, row),
      });
      marks[row.from] = 0;
      marks[row.from + 1] = 0;
      tones[row.from] = "hit";
      tones[row.from + 1] = "hit";
      frames.push({
        scene: "solution",
        caption: `Row two leaves out house 1 and starts with fresh stones. House 1's stone just holds 0, like a start stone, so plans that rob house ${n} get their chance.`,
        codeLine: 2,
        state: at(),
      });
    }

    marks[row.from] = 0;
    marks[row.from + 1] = 0;
    tones[row.from] = "hit";
    tones[row.from + 1] = "hit";
    if (full) {
      frames.push({
        scene: "solution",
        caption: "Two start stones, both 0: no houses yet, no cash. We carry two numbers: take is the stone one back, skip is the stone two back.",
        codeLine: 5,
        state: at({ tags: carried(row.from + START) }),
      });
    }

    const choices = Array.from({ length: row.to - row.from + 1 }, (_, k) => choiceAt(nums, table, row.from + k + 1));
    const quizHouse = full && !askedHop ? (choices.find((choice, k) => k >= 1 && choice.rob !== choice.pass)?.house ?? null) : null;

    for (const choice of choices) {
      const { house, stone, cash } = choice;
      const value = Math.max(choice.rob, choice.pass);
      compared++;
      const detail = full && (house === row.from + 1 || house === quizHouse);
      if (detail) {
        const look: Frame = {
          scene: "solution",
          caption: `House ${house} holds ${cash}. Two hops can land on its stone: a short hop that walks past it, and a long hop that robs it and adds ${cash}.`,
          codeLine: 6,
          state: at({ tags: carried(stone), hops: landing(nums, stone, () => "try") }, { [stone]: "edge" }, house),
        };
        if (house === quizHouse) {
          look.quiz = whichHopQuiz(cells, choice);
          askedHop = true;
        }
        frames.push(look);
      }
      marks[stone] = value;
      tones[stone] = "hit";
      frames.push({
        scene: "solution",
        caption: detail ? verdict(choice) : `House ${house} holds ${cash}. ${verdict(choice)}`,
        codeLine: 7,
        state: at({ tags: carried(stone), hops: landing(nums, stone, winnerPaint(choice)) }, { [stone]: "edge" }, house),
      });
      tones[stone - 2] = "faded";
      if (detail && house === row.from + 1) {
        frames.push({
          scene: "solution",
          caption: "Move along the row: the stone two back is forgotten, and the carried pair, skip and take, shifts one stone forward.",
          codeLine: 8,
          state: at({ tags: carried(stone + 1) }),
        });
      }
    }
  });

  const results = rows.map((row, index) => rowResult(tables[index], row));
  const answer = Math.max(...results);
  const winner = results[1] > results[0] ? 1 : 0;
  const plan = rowPlan(tables[winner], rows[winner]);
  frames.push({
    scene: "solution",
    caption:
      results[0] === results[1]
        ? `Row two's last stone holds ${results[1]}, the same as row one. So the most cash around the ring is ${answer}, from ${housesSaid(plan.houses)}. The answer is ${answer}.`
        : `Row one found ${results[0]} and row two found ${results[1]}. The larger is row ${rows[winner].name}, robbing ${housesSaid(plan.houses)}. The answer is ${answer}.`,
    codeLine: 2,
    state: finished(nums),
  });

  const slowSaid = slow.capped ? `more than ${SLOW_CAP} questions` : plural(slow.questions, "question");
  frames.push({
    scene: "solution",
    caption: `Time: O(n). Two walks along the stones, each house comparing its two hops once per row: ${compared} comparisons.${slow.capped || slow.questions > compared ? ` The slow way asked ${slowSaid}.` : ""}`,
    codeLine: 6,
    state: { ...finished(nums), hops: [], counter: { label: "hops compared", value: String(compared) } },
  });
  const lastRow = rows[winner];
  frames.push({
    scene: "solution",
    caption: "Space: O(1). Each row carries only two numbers, skip and take. No copy of the street is made: a row is just a first and a last house.",
    codeLine: 5,
    state: { ...withTones(rowDone(nums, lastRow, tables[winner]), { [lastRow.to + START]: "window", [lastRow.to + START - 1]: "window" }), hops: [], tags: carried(lastRow.to + START + 1), note: null },
  });
  return frames;
}

/** The "your turn" run: the reader cuts the ring, picks every hop, and meets the single house at the end. */
function practiceFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const cells = n + START;
  const frames: Frame[] = [];
  const rows = rowsOf(nums);
  const tables = rows.map((row) => rowTable(nums, row));

  frames.push({
    scene: "card",
    caption: `Your turn, on a new ring: ${nums.join(", ")}. You cut the ring open, and at every house you pick the hop.`,
    state: blank(nums),
    quiz: leaveOutQuiz(nums, rows[0]),
  });

  rows.forEach((row, index) => {
    const table = tables[index];
    const marks: (number | null)[] = Array.from({ length: cells }, () => null);
    const base = rowState(nums, row);
    const tones = [...base.tones];
    marks[row.from] = 0;
    marks[row.from + 1] = 0;
    tones[row.from] = "hit";
    tones[row.from + 1] = "hit";
    const at = (extra: Partial<StonesState> = {}, paint: Record<number, CellTone> = {}, house: number | null = null): StonesState => {
      const state = withTones({ ...base, marks: [...marks], tones: [...tones], ...extra }, paint);
      return house === null ? state : withHouses(state, [house], "window");
    };

    if (index === 1) {
      frames.push({
        scene: "card",
        caption: `Row one is finished: its last stone holds ${rowResult(tables[0], rows[0])}. Now cut the ring open at the other end.`,
        state: rowDone(nums, rows[0], tables[0]),
        quiz: leaveOutQuiz(nums, row),
      });
    }
    frames.push({
      scene: "card",
      caption:
        index === 0
          ? `Row one leaves out house ${n}. Both start stones hold 0.`
          : "Row two leaves out house 1. Its stone holds 0, like a start stone, and every other stone starts fresh.",
      state: at(),
    });

    for (let house = row.from + 1; house <= row.to + 1; house++) {
      const choice = choiceAt(nums, table, house);
      const { stone } = choice;
      if (choice.rob !== choice.pass) {
        frames.push({
          scene: "card",
          caption: `House ${house} holds ${choice.cash}. A short hop walks past it. A long hop robs it and adds ${choice.cash}.`,
          state: at({ hops: landing(nums, stone, () => "try") }, { [stone]: "edge" }, house),
          quiz: whichHopQuiz(cells, choice),
        });
      }
      marks[stone] = Math.max(choice.rob, choice.pass);
      tones[stone] = "hit";
      frames.push({
        scene: "card",
        caption: choice.rob === choice.pass ? `House ${house} holds ${choice.cash}. ${verdict(choice)}` : verdict(choice),
        state: at({ hops: landing(nums, stone, winnerPaint(choice)) }, { [stone]: "edge" }, house),
      });
      tones[stone - 2] = "faded";
    }
  });

  const results = rows.map((row, index) => rowResult(tables[index], row));
  const answer = Math.max(...results);
  frames.push({
    scene: "card",
    caption: `Row one found ${results[0]} and row two found ${results[1]}. The larger wins, so the answer for this ring is ${answer}.`,
    state: finished(nums),
  });

  const lone = [nums[0]];
  frames.push({
    scene: "card",
    caption: `One last ring: only the first house is left, holding ${lone[0]}. Row one would leave out the last house. Row two would leave out the first.`,
    state: blank(lone),
    quiz: {
      kind: "choice",
      question: "What should happen with this single house?",
      options: ["Run both rows and keep the larger result", "Check for a single house first, and simply rob it"],
      answer: 1,
      why: `Both rows would leave out this same house and find 0. A single house has no neighbour, so it is robbed directly: ${lone[0]}.`,
    },
  });
  frames.push({
    scene: "card",
    caption: `Done. A single house is checked first and robbed: ${lone[0]}. Running the two rows here is the Lone House Trap: both are empty and give 0.`,
    state: loneHouseTrap(lone),
  });
  return frames;
}

export const houseRobberIIStory: ProblemStory<StonesState> = {
  slugs: ["lc-213"],
  pattern: "1-D DP",
  trigger: "the largest total where two picked numbers may never be neighbours, and the numbers stand in a circle",
  insight: "The ring only forbids robbing both ends. Cut it open twice: one row of stones without the last house, one without the first. The larger result wins.",
  metaphor: {
    name: "The stepping stones, on a ring",
    legend: "row one = houses 0 … n − 2 · row two = houses 1 … n − 1 · number on a stone = most cash up to that house in this row · take = one stone back · skip = two stones back",
    terms: ["stone", "hop", "row", "ring", "carried"],
  },
  traps: [{ name: "The Lone House Trap", rule: "With a single house, both rows leave that house out and return 0. Check nums.length == 1 first and return nums[0]." }],
  template: [
    "if (only one item) return it;",
    "a = bestOfRow(first item … second-to-last item);",
    "b = bestOfRow(second item … last item);",
    "return max(a, b);   // bestOfRow = the straight-street walk with two carried numbers",
  ],
  complexity: {
    slow: "O(2^n)",
    time: "O(n)",
    timeWhy: "two walks along the stones, each house comparing two hops once per row",
    space: "O(1)",
    spaceWhy: "each row carries only two numbers, and no copy of the street is made",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,1]", input: "[1,2,3,1]", expected: "4" },
    { label: "[2,3,2]", input: "[2,3,2]", expected: "3", note: "Both ends hold 2, but only one may be robbed" },
    { label: "[5]", input: "[5]", expected: "5", note: "Tricky: a ring with a single house" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-198", title: "House Robber" },
    { slug: "lc-70", title: "Climbing Stairs" },
    { slug: "lc-322", title: "Coin Change" },
  ],
  answer: (raw) => String(mostCash(parseInput(raw))),
  frames: (raw) => {
    const nums = parseInput(raw);
    const slow = runSlow(nums);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums, slow),
      ...insightFrames(nums),
      ...solutionFrames(nums, slow),
      ...practiceFrames(parseInput(PRACTICE)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: finished(nums),
      },
    ];
  },
  View: AgyDp1StonesView,
};
