import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp1StonesView, type StoneHop, type StoneTag, type StonesState } from "../agy-dp1-stones-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StonesState>;

/** Fresh digits for the "your turn" run: a 0 that must pair up, then a pair that starts with 0. */
const PRACTICE = "1203";

const CODE = [
  "if (s.isEmpty() || s.charAt(0) == '0') return 0;",
  "int twoBack = 1, oneBack = 1;",
  "for (int i = 1; i < s.length(); i++) {",
  "    int current = 0;",
  "    if (s.charAt(i) != '0') current += oneBack;",
  "    int pair = (s.charAt(i - 1) - '0') * 10 + (s.charAt(i) - '0');",
  "    if (pair >= 10 && pair <= 26) current += twoBack;",
  "    twoBack = oneBack;",
  "    oneBack = current;",
  "}",
  "return oneBack;",
];

/** The slow way stops counting here, so a long message cannot freeze the page. */
const SLOW_CAP = 200000;

function parseInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 100);
  return digits.length === 0 ? "226" : digits;
}

function letterOf(code: string): string {
  return String.fromCharCode(64 + Number.parseInt(code, 10));
}

function singleOk(digit: string): boolean {
  return digit !== "0";
}

function pairOk(pair: string): boolean {
  const value = Number.parseInt(pair, 10);
  return pair.length === 2 && pair[0] !== "0" && value >= 10 && value <= 26;
}

/** Independent solver: really list the readings from the front, remembering the count from each position. */
function countWays(s: string): number {
  const memo = new Map<number, number>();
  const from = (index: number): number => {
    if (index === s.length) return 1;
    if (s[index] === "0") return 0;
    const known = memo.get(index);
    if (known !== undefined) return known;
    let ways = from(index + 1);
    if (index + 1 < s.length && pairOk(s.slice(index, index + 2))) ways += from(index + 2);
    memo.set(index, ways);
    return ways;
  };
  return from(0);
}

/** The number on every stone. `zeroCounts` runs the mistaken version that lets a lone 0 be a letter. */
function stoneTable(s: string, zeroCounts = false): number[] {
  const table = [1];
  for (let stone = 1; stone <= s.length; stone++) {
    let ways = 0;
    if (zeroCounts || singleOk(s[stone - 1])) ways += table[stone - 1];
    if (stone >= 2 && pairOk(s.slice(stone - 2, stone))) ways += table[stone - 2];
    table.push(ways);
  }
  return table;
}

/** A few real readings, as lists of number pieces. Short hops are tried first. */
function readings(s: string, limit: number): string[][] {
  const found: string[][] = [];
  const walk = (index: number, parts: string[]) => {
    if (found.length >= limit) return;
    if (index === s.length) {
      found.push([...parts]);
      return;
    }
    if (singleOk(s[index])) walk(index + 1, [...parts, s[index]]);
    if (index + 1 < s.length && pairOk(s.slice(index, index + 2))) walk(index + 2, [...parts, s.slice(index, index + 2)]);
  };
  walk(0, []);
  return found;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function lettersOf(parts: string[]) {
  return parts.map(letterOf).join("");
}

function blank(s: string): StonesState {
  const count = s.length + 1;
  return {
    marks: Array.from({ length: count }, () => null),
    labels: Array.from({ length: count }, (_, stone) => String(stone)),
    labelTitle: "stone",
    tones: Array.from({ length: count }, () => "idle" as CellTone),
    hops: [],
    tags: [],
    items: { title: "digits", offset: 0.5, cells: [...s].map((digit) => ({ text: digit, tone: "idle" as CellTone })) },
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

/** Colour the digit boxes at these positions (counted from 0). */
function withDigits(state: StonesState, positions: number[], tone: CellTone): StonesState {
  if (!state.items) return state;
  return { ...state, items: { ...state.items, cells: state.items.cells.map((cell, index) => (positions.includes(index) ? { ...cell, tone } : cell)) } };
}

function chain(parts: string[], tone: StoneHop["tone"]): StoneHop[] {
  let at = 0;
  return parts.map((part) => {
    const hop: StoneHop = { from: at, to: at + part.length, label: letterOf(part), tone };
    at += part.length;
    return hop;
  });
}

type Landing = { stone: number; digit: string; pair: string | null; shortOk: boolean; longOk: boolean };

function landingAt(s: string, stone: number): Landing {
  const pair = stone >= 2 ? s.slice(stone - 2, stone) : null;
  return { stone, digit: s[stone - 1], pair, shortOk: singleOk(s[stone - 1]), longOk: pair !== null && pairOk(pair) };
}

/** The hops onto a stone before anyone has judged them: labelled with the digits they jump. */
function openHops(landing: Landing): StoneHop[] {
  const hops: StoneHop[] = [{ from: landing.stone - 1, to: landing.stone, label: landing.digit, tone: "try" }];
  if (landing.pair !== null) hops.push({ from: landing.stone - 2, to: landing.stone, label: landing.pair, tone: "try" });
  return hops;
}

/** The same hops after judging: an allowed hop shows its letter, a forbidden one a cross. `upTo` judges only the short hop. */
function judgedHops(landing: Landing, upTo: "short" | "both"): StoneHop[] {
  const hops: StoneHop[] = [
    landing.shortOk ? { from: landing.stone - 1, to: landing.stone, label: letterOf(landing.digit), tone: "best" } : { from: landing.stone - 1, to: landing.stone, label: "✕", tone: "trap" },
  ];
  if (landing.pair !== null) {
    if (upTo === "short") hops.push({ from: landing.stone - 2, to: landing.stone, label: landing.pair, tone: "try" });
    else hops.push(landing.longOk ? { from: landing.stone - 2, to: landing.stone, label: letterOf(landing.pair), tone: "best" } : { from: landing.stone - 2, to: landing.stone, label: `✕ ${landing.pair}`, tone: "trap" });
  }
  return hops;
}

function whyPairFails(pair: string): string {
  if (pair[0] === "0") return `The pair ${pair} starts with 0, so it is no letter's number`;
  if (Number.parseInt(pair, 10) > 26) return `The pair ${pair} is above 26, and the letters stop at 26`;
  return `The pair ${pair} is no letter's number`;
}

function shortSaid(landing: Landing): string {
  return landing.shortOk ? `The digit ${landing.digit} is the letter ${letterOf(landing.digit)}` : "The digit 0 alone is no letter";
}

function longSaid(landing: Landing): string {
  if (landing.pair === null) return "";
  return landing.longOk ? `The pair ${landing.pair} is the letter ${letterOf(landing.pair)}` : whyPairFails(landing.pair);
}

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function sumSaid(landing: Landing, table: number[]): string {
  const parts: number[] = [];
  if (landing.shortOk) parts.push(table[landing.stone - 1]);
  if (landing.longOk) parts.push(table[landing.stone - 2]);
  if (parts.length === 0) return `No hop can land here, so stone ${landing.stone} gets 0`;
  if (parts.length === 1) return `Only one hop lands here, so stone ${landing.stone} gets ${parts[0]}`;
  return `Both hops land here, so stone ${landing.stone} gets ${parts[0]} + ${parts[1]} = ${table[landing.stone]}`;
}

function finished(s: string, table: number[]): StonesState {
  const n = s.length;
  const best = readings(s, 1)[0];
  return {
    ...blank(s),
    marks: [...table],
    tones: table.map((value, stone) => (stone === n ? "done" : value === 0 ? "faded" : "hit")),
    hops: best ? chain(best, "best") : [],
    note: `ways to read ${s.length <= 8 ? s : "it"}: ${table[n]}`,
  };
}

/** Something in these digits that is not allowed, found by looking: a lone 0, a pair that is no letter, or a hop of three. */
function forbidden(s: string): { caption: string; hop: StoneHop; digits: number[] } | null {
  const zero = s.indexOf("0");
  if (zero >= 0) {
    return { caption: "Not allowed: a short hop over a 0 alone. The letters start at 1, so no letter has the number 0.", hop: { from: zero, to: zero + 1, label: "✕", tone: "trap" }, digits: [zero] };
  }
  for (let index = 0; index + 1 < s.length; index++) {
    const pair = s.slice(index, index + 2);
    if (!pairOk(pair)) return { caption: `Not allowed: a long hop over ${pair}. The letters stop at 26.`, hop: { from: index, to: index + 2, label: `✕ ${pair}`, tone: "trap" }, digits: [index, index + 1] };
  }
  if (s.length >= 3) {
    return { caption: `Not allowed: a hop over three digits, like ${s.slice(0, 3)}. The letters stop at 26, so a hop jumps one digit or two.`, hop: { from: 0, to: 3, label: `✕ ${s.slice(0, 3)}`, tone: "trap" }, digits: [0, 1, 2] };
  }
  return null;
}

function pictureFrames(s: string): Frame[] {
  const found = readings(s, 2);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A message was turned into numbers: A is 1, B is 2, up to Z is 26. Only the digits ${s} are left. A stepping stone stands before, between and after them.`,
      state: blank(s),
    },
  ];
  if (found.length > 0) {
    frames.push({
      scene: "picture",
      caption: `A short hop jumps one digit, a long hop jumps two, and each hop reads one letter. One allowed way: ${found[0].join(", ")} reads as ${lettersOf(found[0])}.`,
      state: { ...blank(s), hops: chain(found[0], "try") },
    });
  } else {
    frames.push({
      scene: "picture",
      caption: "A short hop jumps one digit, a long hop jumps two, and each hop reads one letter. With these digits, no chain of hops reaches the last stone.",
      state: blank(s),
    });
  }
  if (found.length > 1) {
    frames.push({
      scene: "picture",
      caption: `Another allowed way: ${found[1].join(", ")} reads as ${lettersOf(found[1])}. The same digits, a different message.`,
      state: { ...blank(s), hops: chain(found[1], "try") },
    });
  }
  const bad = forbidden(s);
  if (bad) frames.push({ scene: "picture", caption: bad.caption, state: { ...withDigits(blank(s), bad.digits, "miss"), hops: [bad.hop] } });
  frames.push({
    scene: "picture",
    caption: `The goal: count every different way to hop from stone 0 to stone ${s.length}, reading a real letter with every hop.`,
    state: withTones(blank(s), { 0: "window", [s.length]: "done" }),
  });
  return frames;
}

type SlowRun = { questions: number; capped: boolean; asked: number[]; firstDive: { questions: number; asked: number[] } | null; total: number };

/** Plain recursion, really run: a stone asks the stones its allowed hops start from, and nobody writes an answer down. */
function runSlow(s: string): SlowRun {
  const run: SlowRun = { questions: 0, capped: false, asked: Array.from({ length: s.length + 1 }, () => 0), firstDive: null, total: 0 };
  const ask = (stone: number): number => {
    if (run.capped) return 0;
    if (run.questions >= SLOW_CAP) {
      run.capped = true;
      return 0;
    }
    run.questions++;
    run.asked[stone]++;
    if (stone === 0) {
      run.firstDive ??= { questions: run.questions, asked: [...run.asked] };
      return 1;
    }
    const landing = landingAt(s, stone);
    let ways = 0;
    if (landing.shortOk) ways += ask(stone - 1);
    if (landing.longOk) ways += ask(stone - 2);
    return ways;
  };
  run.total = ask(s.length);
  return run;
}

function askedTags(asked: number[]): StoneTag[] {
  return asked.flatMap((count, stone) => (count > 0 ? [{ stone, text: `×${count}`, tone: count > 1 ? ("coral" as const) : ("accent" as const) }] : []));
}

function slowFrames(s: string, run: SlowRun): Frame[] {
  const n = s.length;
  const label = "questions asked";
  const last = landingAt(s, n);
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: stand on the last stone, ${n}, and ask how many ways lead here. It asks every stone that an allowed hop onto it starts from.`,
      state: { ...withTones(blank(s), { [n]: "edge" }), hops: judgedHops(last, "both").filter((hop) => hop.tone === "best").map((hop) => ({ ...hop, tone: "try" as const })), tags: [{ stone: n, text: "×1", tone: "accent" }], counter: { label, value: "1" } },
    },
  ];
  if (n >= 3 && run.firstDive && run.firstDive.questions > 2) {
    frames.push({
      scene: "slow",
      caption: "Those stones do not know either. Each one asks the stones behind it in the same way, all the way back to stone 0.",
      state: { ...withTones(blank(s), { [n]: "edge" }), tags: askedTags(run.firstDive.asked), counter: { label, value: String(run.firstDive.questions) } },
    });
  }
  const paint: Record<number, CellTone> = {};
  run.asked.forEach((count, stone) => {
    if (count > 1) paint[stone] = "miss";
  });
  const repeats = run.asked.some((count) => count > 1);
  frames.push({
    scene: "slow",
    caption: run.capped
      ? `Nobody writes an answer down, so the same stones are asked again and again. We stopped counting after ${SLOW_CAP} questions. This is O(2^n) time.`
      : repeats
        ? `Nobody writes an answer down, so stones are asked again and again. It finds the right count, ${run.total}, in ${plural(run.questions, "question")}. With more digits that can double each time: O(2^n) time.`
        : `It finds the right count, ${run.total}, in ${plural(run.questions, "question")}. But nobody writes an answer down. With more digits the questions can double each time: O(2^n) time.`,
    state: { ...withTones(blank(s), paint), tags: run.capped ? [] : askedTags(run.asked), counter: { label, value: run.capped ? `${SLOW_CAP}+` : String(run.questions) } },
  });
  return frames;
}

function insightFrames(s: string): Frame[] {
  const n = s.length;
  const last = landingAt(s, n);
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Give every stone one number. The number on a stone means: how many different ways there are to read all the digits before that stone.",
      state: blank(s),
    },
  ];
  if (last.pair === null) {
    frames.push({
      scene: "insight",
      caption: `Stand on the last stone. Only a short hop over the digit ${last.digit} can land here, and it is allowed when the digit is 1 to 9.`,
      state: { ...withTones(blank(s), { [n]: "edge" }), hops: openHops(last) },
    });
    return frames;
  }
  frames.push({
    scene: "insight",
    caption: `Stand on the last stone, ${n}. The last hop was a short hop over the digit ${last.digit}, or a long hop over the pair ${last.pair}. Nothing else can land here.`,
    state: { ...withDigits(withTones(blank(s), { [n]: "edge", [n - 1]: "window", [n - 2]: "window" }), [n - 2, n - 1], "window"), hops: openHops(last) },
  });
  frames.push({
    scene: "insight",
    caption: "A short hop is allowed when its digit is 1 to 9. A long hop is allowed when its pair is 10 to 26. An allowed hop brings along every way of the stone it starts from.",
    state: { ...withTones(blank(s), { [n]: "edge", [n - 1]: "window", [n - 2]: "window" }), hops: judgedHops(last, "both") },
  });
  frames.push({
    scene: "insight",
    caption: "So a stone's number is the sum of what its allowed hops bring. Fill the stones from stone 0 forward, write each number once, and never ask twice.",
    state: { ...withTones(blank(s), { [n]: "edge", [n - 1]: "window", [n - 2]: "window" }), hops: judgedHops(last, "both") },
  });
  return frames;
}

const HOP_OPTIONS = ["Both hops", "Only the short hop", "Only the long hop", "Neither hop"];

function allowedQuiz(landing: Landing): StoryQuiz {
  const answer = landing.shortOk && landing.longOk ? 0 : landing.shortOk ? 1 : landing.longOk ? 2 : 3;
  return {
    kind: "choice",
    question: `The short hop would jump ${landing.digit}. The long hop would jump ${landing.pair}. Which of them read a real letter?`,
    options: HOP_OPTIONS,
    answer,
    why: `${shortSaid(landing)}. ${longSaid(landing)}.`,
  };
}

function zeroQuiz(cells: number, numbered: boolean, landing: Landing): StoryQuiz {
  return {
    kind: "cell",
    cells,
    numbered,
    question: `The digit just before stone ${landing.stone} is 0. From which stone can a hop still land here? Click it.`,
    answer: landing.stone - 2,
    feedback: {
      [landing.stone]: "That is the stone being filled. The hop starts behind it.",
      [landing.stone - 1]: "A hop from there would jump the 0 alone. No letter has the number 0: that is the Zero Trap.",
    },
    otherwise: "A hop jumps one digit or two, never more. Look at the pair of digits that ends with the 0.",
    why: `Only the long hop works: the pair ${landing.pair} is the letter ${letterOf(landing.pair ?? "")}. A 0 can only be read together with the digit before it.`,
  };
}

function quizFor(cells: number, numbered: boolean, landing: Landing): StoryQuiz {
  return !landing.shortOk && landing.longOk ? zeroQuiz(cells, numbered, landing) : allowedQuiz(landing);
}

function carried(stone: number): StoneTag[] {
  return [
    { stone: stone - 2, text: "twoBack", tone: "accent" },
    { stone: stone - 1, text: "oneBack", tone: "accent" },
  ];
}

const ZERO_NOTE = "✕ 0 alone is no letter";

/** The real algorithm: two carried numbers rolling along the stones. */
function solutionFrames(s: string, table: number[], slow: SlowRun): Frame[] {
  const n = s.length;
  const cells = n + 1;
  const numbered = n <= 9;
  const frames: Frame[] = [];
  const marks: (number | null)[] = Array.from({ length: cells }, () => null);
  const tones: CellTone[] = Array.from({ length: cells }, () => "idle");
  const at = (extra: Partial<StonesState> = {}, paint: Record<number, CellTone> = {}, digits: number[] = [], digitTone: CellTone = "window"): StonesState =>
    withDigits(withTones({ ...blank(s), marks: [...marks], tones: [...tones], ...extra }, paint), digits, digitTone);
  const answer = table[n];
  const wrong = stoneTable(s, true)[n];
  let visited = 1;

  if (s[0] === "0") {
    frames.push({
      scene: "solution",
      caption: "First look at the very first digit. It is 0. The Zero Trap: a 0 alone is no letter, so no hop can even leave stone 0.",
      codeLine: 0,
      state: at({ hops: [{ from: 0, to: 1, label: "✕", tone: "trap" }], trapNote: ZERO_NOTE }, { 0: "edge" }, [0], "miss"),
    });
    frames.push({
      scene: "solution",
      caption: `Nothing can be read, so we stop at once. Counting that hop anyway would claim ${plural(wrong, "way")}. There are none: the answer is 0.`,
      codeLine: 0,
      state: at({ note: `ways to read ${s}: 0`, trapNote: ZERO_NOTE }, {}, [0], "miss"),
    });
  } else {
    frames.push({
      scene: "solution",
      caption: `First look at the very first digit. It is ${s[0]}, not 0, so a letter can start here and we go on.`,
      codeLine: 0,
      state: at({}, {}, [0]),
    });
    marks[0] = 1;
    tones[0] = "hit";
    frames.push({
      scene: "solution",
      caption: "Stone 0 means nothing has been read yet. There is exactly 1 way to do that, so stone 0 gets 1.",
      codeLine: 1,
      state: at({}, { 0: "edge" }),
    });
    marks[1] = 1;
    tones[1] = "hit";
    frames.push({
      scene: "solution",
      caption: `Only a short hop over ${s[0]}, the letter ${letterOf(s[0])}, can land on stone 1. That is 1 way, so stone 1 gets 1.`,
      codeLine: 1,
      state: at({ hops: [{ from: 0, to: 1, label: letterOf(s[0]), tone: "best" }] }, { 1: "edge" }, [0]),
    });
    if (n >= 2) {
      frames.push({
        scene: "solution",
        caption: "From here on we carry just two numbers. oneBack is the number one stone back, and twoBack is the number two stones back.",
        codeLine: 1,
        state: at({ tags: carried(2) }, { 0: "window", 1: "window" }),
      });
    }

    const firstZero = Array.from({ length: Math.max(0, n - 1) }, (_, k) => k + 2).find((stone) => s[stone - 1] === "0") ?? null;
    for (let stone = 2; stone <= n; stone++) {
      const landing = landingAt(s, stone);
      const zero = !landing.shortOk;
      const detail = stone === 2 || stone === firstZero;
      visited++;
      const digits = [stone - 2, stone - 1];

      if (!detail) {
        marks[stone] = table[stone];
        tones[stone] = table[stone] === 0 ? "faded" : "hit";
        tones[stone - 2] = "faded";
        frames.push({
          scene: "solution",
          caption: `Stone ${stone}: ${lowerFirst(shortSaid(landing))}, and ${lowerFirst(longSaid(landing))}. ${sumSaid(landing, table)}.`,
          codeLine: 6,
          state: at({ tags: carried(stone), hops: judgedHops(landing, "both"), trapNote: zero ? ZERO_NOTE : null }, { [stone]: "edge" }, zero ? [stone - 1] : [], "miss"),
        });
        continue;
      }

      frames.push({
        scene: "solution",
        caption: `Now stone ${stone}. A short hop would jump the digit ${landing.digit}. A long hop would jump the pair ${landing.pair}.`,
        codeLine: 2,
        state: at({ tags: carried(stone), hops: openHops(landing) }, { [stone]: "edge" }, digits),
        quiz: quizFor(cells, numbered, landing),
      });
      frames.push({
        scene: "solution",
        caption: zero
          ? "The Zero Trap: the digit 0 alone is no letter, because the letters start at 1. So the short hop is not allowed, and it brings nothing."
          : `${shortSaid(landing)}. So the short hop is allowed, and it brings every way of the stone one back: ${table[stone - 1]}.`,
        codeLine: 4,
        state: at({ tags: carried(stone), hops: judgedHops(landing, "short"), trapNote: zero ? ZERO_NOTE : null }, { [stone]: "edge" }, [stone - 1], zero ? "miss" : "window"),
      });
      frames.push({
        scene: "solution",
        caption: landing.longOk
          ? `${longSaid(landing)}, because it is between 10 and 26. So the long hop is allowed, and it brings every way of the stone two back: ${table[stone - 2]}.`
          : `${longSaid(landing)}. So the long hop is not allowed, and it brings nothing.`,
        codeLine: 6,
        state: at({ tags: carried(stone), hops: judgedHops(landing, "both") }, { [stone]: "edge" }, digits, landing.longOk ? "window" : "miss"),
      });
      marks[stone] = table[stone];
      tones[stone] = table[stone] === 0 ? "faded" : "hit";
      tones[stone - 2] = "faded";
      frames.push({
        scene: "solution",
        caption: `${sumSaid(landing, table)}. Then stone ${stone - 2} is forgotten, and the carried pair moves one stone forward.`,
        codeLine: 7,
        state: at({ tags: carried(stone + 1) }),
      });
    }

    const some = readings(s, 4);
    const said = answer === 0 ? "No chain of hops reaches it" : answer === 1 ? `The only reading is ${lettersOf(some[0])}` : answer <= 3 ? `The readings are ${some.map(lettersOf).join(", ")}` : `For example ${some.slice(0, 2).map(lettersOf).join(" and ")}`;
    frames.push({
      scene: "solution",
      caption: `The carried number oneBack sits on the last stone, ${n}: ${plural(answer, "way")} to read ${s}. ${said}. The answer is ${answer}.`,
      codeLine: 10,
      state: finished(s, table),
    });
    if (wrong !== answer) {
      const mistaken = stoneTable(s, true);
      const zeros = [...s].flatMap((digit, index) => (digit === "0" ? [index] : []));
      frames.push({
        scene: "solution",
        caption: `The Zero Trap once more: had the short hop over 0 been counted, the stones would end on ${wrong}, not ${answer}. It would count messages that do not exist.`,
        codeLine: 4,
        state: {
          ...withDigits(blank(s), zeros, "miss"),
          marks: mistaken,
          tones: mistaken.map((value, stone) => (value !== table[stone] ? "miss" : "hit")),
          hops: zeros.map((index) => ({ from: index, to: index + 1, label: "✕", tone: "trap" as const })),
          trapNote: `${ZERO_NOTE}: ${wrong} would be wrong`,
        },
      });
    }
  }

  const slowSaid = slow.capped ? `more than ${SLOW_CAP} questions` : plural(slow.questions, "question");
  const stopped = s[0] === "0";
  frames.push({
    scene: "solution",
    caption: stopped
      ? "Time: O(n). Here we stopped at the first digit. At most it is one walk along the stones, looking at each digit once alone and once in a pair."
      : `Time: O(n). One walk along the stones: each of the ${plural(n, "digit")} is looked at once alone and once as the end of a pair.${slow.capped || slow.questions > n + 1 ? ` The slow way asked ${slowSaid}.` : ""}`,
    codeLine: 2,
    state: { ...finished(s, table), hops: [], marks: stopped ? blank(s).marks : [...table], counter: { label: "digits visited", value: String(visited) } },
  });
  frames.push({
    scene: "solution",
    caption: "Space: O(1). However many digits there are, we carry only two numbers, oneBack and twoBack. Every stone further back is forgotten.",
    codeLine: 1,
    state: stopped ? at() : at({ tags: n >= 2 ? carried(n + 1) : [{ stone: n, text: "oneBack", tone: "accent" }] }, { [n]: "window", [Math.max(0, n - 1)]: "window" }),
  });
  return frames;
}

/** The "your turn" run: the reader judges the hops at every stone. */
function practiceFrames(s: string, table: number[]): Frame[] {
  const n = s.length;
  const cells = n + 1;
  const numbered = n <= 9;
  const frames: Frame[] = [];
  const marks: (number | null)[] = Array.from({ length: cells }, () => null);
  const tones: CellTone[] = Array.from({ length: cells }, () => "idle");
  marks[0] = 1;
  marks[1] = singleOk(s[0]) ? 1 : 0;
  tones[0] = "hit";
  tones[1] = "hit";
  const at = (extra: Partial<StonesState> = {}, paint: Record<number, CellTone> = {}, digits: number[] = [], digitTone: CellTone = "window"): StonesState =>
    withDigits(withTones({ ...blank(s), marks: [...marks], tones: [...tones], ...extra }, paint), digits, digitTone);

  frames.push({
    scene: "card",
    caption: `Your turn, on new digits: ${s}. Stones 0 and 1 each start with 1. At every other stone, you judge the hops.`,
    state: at(),
  });

  for (let stone = 2; stone <= n; stone++) {
    const landing = landingAt(s, stone);
    const zero = !landing.shortOk;
    frames.push({
      scene: "card",
      caption: `Stone ${stone}. A short hop would jump the digit ${landing.digit}. A long hop would jump the pair ${landing.pair}.`,
      state: at({ hops: openHops(landing) }, { [stone]: "edge" }, [stone - 2, stone - 1]),
      quiz: quizFor(cells, numbered, landing),
    });
    marks[stone] = table[stone];
    tones[stone] = table[stone] === 0 ? "faded" : "hit";
    frames.push({
      scene: "card",
      caption: zero
        ? `${longSaid(landing)}. ${sumSaid(landing, table)}. A short hop over the 0 alone would be the Zero Trap.`
        : `${shortSaid(landing)}. ${longSaid(landing)}. ${sumSaid(landing, table)}.`,
      state: at({ hops: judgedHops(landing, "both"), trapNote: zero ? ZERO_NOTE : null }, { [stone]: "edge" }, zero ? [stone - 1] : [], "miss"),
    });
    tones[stone - 2] = "faded";
  }

  const some = readings(s, 2);
  frames.push({
    scene: "card",
    caption:
      table[n] === 0
        ? "Done. The answer is 0: no chain of allowed hops reaches the last stone."
        : `Done. The answer is ${table[n]}. One reading is ${some[0].join(", ")}, which spells ${lettersOf(some[0])}.`,
    state: finished(s, table),
  });
  return frames;
}

export const decodeWaysStory: ProblemStory<StonesState> = {
  slugs: ["lc-91"],
  pattern: "1-D DP",
  trigger: "“how many ways” to split a string of digits into pieces, where each piece is one digit or two",
  insight: "Stepping stones between the digits. A short hop reads one digit (1 to 9), a long hop reads a pair (10 to 26). A stone's number is the sum of what its allowed hops bring.",
  metaphor: {
    name: "The stepping stones",
    legend: "stone k = the first k digits are read · number on a stone = ways to read them · oneBack = one stone back · twoBack = two stones back · short hop = one digit · long hop = a pair",
    terms: ["stone", "hop", "carry", "carried"],
  },
  traps: [{ name: "The Zero Trap", rule: "A 0 alone is no letter: single digits must be 1 to 9. A 0 can only be read as the second digit of 10 or 20." }],
  template: [
    "if (first piece is impossible) return 0;",
    "twoBack = 1; oneBack = 1;",
    "for (i = 1; i < n; i++) {",
    "    now = 0;",
    "    if (one-digit piece ending at i is valid) now += oneBack;",
    "    if (two-digit piece ending at i is valid) now += twoBack;",
    "    twoBack = oneBack; oneBack = now;",
    "}",
    "return oneBack;",
  ],
  complexity: {
    slow: "O(2^n)",
    time: "O(n)",
    timeWhy: "one walk along the stones; each digit is looked at once alone and once in a pair",
    space: "O(1)",
    spaceWhy: "only two numbers are carried, oneBack and twoBack",
  },
  code: CODE,
  examples: [
    { label: '"226"', input: "226", expected: "3" },
    { label: '"12"', input: "12", expected: "2" },
    { label: '"2101"', input: "2101", expected: "1", note: "Tricky: a 0 must pair with the digit before it" },
    { label: '"06"', input: "06", expected: "0", note: "Tricky: starts with 0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-70", title: "Climbing Stairs" },
    { slug: "lc-139", title: "Word Break" },
    { slug: "lc-198", title: "House Robber" },
  ],
  answer: (raw) => String(countWays(parseInput(raw))),
  frames: (raw) => {
    const s = parseInput(raw);
    const table = stoneTable(s);
    const slow = runSlow(s);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(s),
      ...slowFrames(s, slow),
      ...insightFrames(s),
      ...solutionFrames(s, table, slow),
      ...practiceFrames(practice, stoneTable(practice)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: finished(s, table),
      },
    ];
  },
  View: AgyDp1StonesView,
};
