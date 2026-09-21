import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp1StonesView, type StoneHop, type StoneTag, type StonesState } from "../agy-dp1-stones-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StonesState>;

/** Fresh stairs for the "your turn" run. */
const PRACTICE = "n = 6";

const CODE = [
  "int prev = 1;",
  "int cur = 1;",
  "for (int i = 2; i <= n; i++) {",
  "    int next = prev + cur;",
  "    prev = cur;",
  "    cur = next;",
  "}",
  "return cur;",
];

/** The slow way stops counting here, so a tall staircase cannot freeze the page. */
const SLOW_CAP = 200000;

function parseInput(raw: string): number {
  const n = Number.parseInt(raw.match(/\d+/)?.[0] ?? "", 10);
  if (Number.isNaN(n)) return 5;
  return Math.max(1, Math.min(45, n));
}

/** Independent solver: a full table, one number per stone. */
function waysTable(n: number): number[] {
  const ways = Array.from({ length: n + 1 }, () => 1);
  for (let stone = 2; stone <= n; stone++) ways[stone] = ways[stone - 1] + ways[stone - 2];
  return ways;
}

/** Every different order of hops that lands exactly on `stone`. Only used for a tiny stone. */
function listWays(stone: number): number[][] {
  if (stone === 0) return [[]];
  const found: number[][] = [];
  for (const hop of [1, 2]) {
    if (hop > stone) continue;
    for (const rest of listWays(stone - hop)) found.push([hop, ...rest]);
  }
  return found;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function listOf(items: (string | number)[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function blank(n: number): StonesState {
  return {
    marks: Array.from({ length: n + 1 }, () => null),
    labels: Array.from({ length: n + 1 }, (_, index) => String(index)),
    labelTitle: "stone",
    tones: Array.from({ length: n + 1 }, () => "idle" as CellTone),
    hops: [],
    tags: [],
    items: null,
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

function chain(path: number[], tone: StoneHop["tone"]): StoneHop[] {
  let at = 0;
  return path.map((hop) => {
    const drawn: StoneHop = { from: at, to: at + hop, label: String(hop), tone };
    at += hop;
    return drawn;
  });
}

/** The two hops that can land on a stone: the short one first. */
function landing(stone: number, tone: StoneHop["tone"]): StoneHop[] {
  const hops: StoneHop[] = [{ from: stone - 1, to: stone, label: "1", tone }];
  if (stone >= 2) hops.push({ from: stone - 2, to: stone, label: "2", tone });
  return hops;
}

function finished(n: number, table: number[]): StonesState {
  const state = blank(n);
  return { ...state, marks: [...table], tones: table.map((_, stone) => (stone === n ? "done" : "hit")), hops: landing(n, "best"), note: `ways to the top: ${table[n]}` };
}

function pictureFrames(n: number): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A staircase with ${plural(n, "step")}, drawn as a row of stepping stones. We stand on stone 0. The top of the stairs is stone ${n}.`,
      state: withTones(blank(n), { 0: "window", [n]: "done" }),
    },
    {
      scene: "picture",
      caption: `Each move is a short hop of 1 stone or a long hop of 2 stones. One allowed way up: only short hops, ${plural(n, "hop")} in all.`,
      state: { ...blank(n), hops: chain(Array.from({ length: n }, () => 1), "try") },
    },
  ];
  if (n >= 2) {
    const longFirst = [...Array.from({ length: Math.floor(n / 2) }, () => 2), ...(n % 2 === 1 ? [1] : [])];
    frames.push({
      scene: "picture",
      caption: `Another allowed way: ${longFirst.join(", ")}. The same hops in a different order count as a different way.`,
      state: { ...blank(n), hops: chain(longFirst, "try") },
    });
  }
  if (n >= 3) {
    frames.push({
      scene: "picture",
      caption: "Not allowed: a hop of 3 stones. Every hop is 1 stone or 2 stones, nothing longer.",
      state: { ...blank(n), hops: [{ from: 0, to: 3, label: "✕ 3 stones", tone: "trap" }] },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: count every different way to get from stone 0 to stone ${n}.`,
    state: withTones(blank(n), { 0: "window", [n]: "done" }),
  });
  return frames;
}

type SlowRun = {
  questions: number;
  capped: boolean;
  /** How many times each stone was asked. */
  asked: number[];
  /** The counts at the moment the first chain of questions reached the bottom. */
  firstDive: { questions: number; asked: number[] } | null;
  total: number;
};

/** Plain recursion, really run: a stone that is asked never remembers its answer. */
function runSlow(n: number): SlowRun {
  const run: SlowRun = { questions: 0, capped: false, asked: Array.from({ length: n + 1 }, () => 0), firstDive: null, total: 0 };
  const ask = (stone: number): number => {
    if (run.capped) return 0;
    if (run.questions >= SLOW_CAP) {
      run.capped = true;
      return 0;
    }
    run.questions++;
    run.asked[stone]++;
    if (stone <= 1) {
      run.firstDive ??= { questions: run.questions, asked: [...run.asked] };
      return 1;
    }
    return ask(stone - 1) + ask(stone - 2);
  };
  run.total = ask(n);
  return run;
}

function askedTags(asked: number[]): StoneTag[] {
  return asked.flatMap((count, stone) => (count > 0 ? [{ stone, text: `×${count}`, tone: count > 1 ? ("coral" as const) : ("accent" as const) }] : []));
}

function slowFrames(n: number, run: SlowRun, table: number[]): Frame[] {
  const label = "questions asked";
  const firstAsked = Array.from({ length: n + 1 }, (_, stone) => (stone === n ? 1 : 0));
  const frames: Frame[] = [
    {
      scene: "slow",
      caption:
        n >= 2
          ? `The slow way: stand on stone ${n} and ask how many ways lead here. The last hop came from stone ${n - 1} or stone ${n - 2}, so ask both of them.`
          : `The slow way: stand on stone ${n} and ask how many ways lead here. Only one short hop from stone 0 can land here.`,
      state: { ...withTones(blank(n), { [n]: "edge" }), hops: landing(n, "try"), tags: askedTags(firstAsked), counter: { label, value: "1" } },
    },
  ];
  if (n >= 3 && run.firstDive) {
    frames.push({
      scene: "slow",
      caption: `Stone ${n - 1} does not know either, so it asks the two stones behind it. And so on, all the way down to stone 1.`,
      state: { ...withTones(blank(n), { [n]: "edge" }), tags: askedTags(run.firstDive.asked), counter: { label, value: String(run.firstDive.questions) } },
    });
  }
  const shown = run.capped ? `${SLOW_CAP}+` : String(run.questions);
  const most = run.asked.indexOf(Math.max(...run.asked));
  const repeated = !run.capped && run.asked[most] > 1;
  if (repeated) {
    const paint: Record<number, CellTone> = {};
    run.asked.forEach((count, stone) => {
      if (count > 1) paint[stone] = "miss";
    });
    frames.push({
      scene: "slow",
      caption: `The Echo Trap: no answer is written down, so the same stones are asked again and again. Stone ${most} alone was asked ${run.asked[most]} times.`,
      state: { ...withTones(blank(n), paint), tags: askedTags(run.asked), counter: { label, value: shown }, trapNote: "✕ the same stone, asked again and again" },
    });
  }
  frames.push({
    scene: "slow",
    caption: run.capped
      ? `We stopped counting after ${SLOW_CAP} questions, for only ${plural(n, "step")}. Each extra step nearly doubles the work: this is O(2^n) time.`
      : `It does find the right count, ${table[n]}, but it took ${plural(run.questions, "question")} for only ${plural(n, "step")}. Each extra step nearly doubles the work: this is O(2^n) time.`,
    state: { ...blank(n), tones: blank(n).tones.map(() => "faded" as CellTone), tags: run.capped ? [] : askedTags(run.asked), counter: { label, value: shown } },
  });
  return frames;
}

function insightFrames(n: number): Frame[] {
  const sample = Math.min(3, n);
  const ways = listWays(sample).map((way) => way.join("+"));
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Give every stone one number. The number on a stone means: how many different ways lead from stone 0 to that stone.",
      state: blank(n),
    },
    {
      scene: "insight",
      caption:
        ways.length === 1
          ? `Take stone ${sample}. The only way to reach it is ${ways[0]}. So its number will be 1.`
          : `Take stone ${sample}. The ways to reach it are ${listOf(ways)}. So its number will be ${ways.length}.`,
      state: { ...withTones(blank(n), { [sample]: "edge" }), note: `ways to stone ${sample}: ${ways.join(" · ")}` },
    },
  ];
  if (n < 2) return frames;
  frames.push({
    scene: "insight",
    caption: `Now stand on the last stone, ${n}, and ask: where did the last hop come from? A short hop from stone ${n - 1}, or a long hop from stone ${n - 2}. Nowhere else.`,
    state: { ...withTones(blank(n), { [n]: "edge", [n - 1]: "window", [n - 2]: "window" }), hops: landing(n, "try") },
  });
  frames.push({
    scene: "insight",
    caption: `So the number on stone ${n} is the number on stone ${n - 1} plus the number on stone ${n - 2}. Fill the stones from the start, write each number down once, and never ask twice.`,
    state: { ...withTones(blank(n), { [n]: "edge", [n - 1]: "window", [n - 2]: "window" }), hops: landing(n, "best") },
  });
  return frames;
}

function longHopQuiz(cells: number, numbered: boolean, stone: number): StoryQuiz {
  return {
    kind: "cell",
    cells,
    numbered,
    question: `A long hop lands on stone ${stone}. Which stone does it start from? Click it.`,
    answer: stone - 2,
    feedback: {
      [stone]: "That is the stone being filled. The hop starts behind it.",
      [stone - 1]: "That is one stone back: a short hop starts there. A long hop covers more.",
    },
    otherwise: "A long hop covers exactly two stones. Count back from the stone being filled.",
    why: `A long hop covers 2 stones, so it starts on stone ${stone - 2}. The short hop starts on stone ${stone - 1}. Those are the only two ways in.`,
  };
}

function forgetQuiz(cells: number, numbered: boolean, stone: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [stone]: `Stone ${stone} was only just written. A short hop onto the next stone starts here.`,
    [stone - 1]: `Stone ${stone - 1} is still needed: a long hop onto the next stone starts here.`,
  };
  return {
    kind: "cell",
    cells,
    numbered,
    question: `We carry only two numbers forward. Which stone's number is never needed again? Click it.`,
    answer: stone - 2,
    feedback,
    otherwise: "That stone is already forgotten, or not filled yet. Choose among the stones that still show a clear number.",
    why: `The next stone is reached from stones ${stone - 1} and ${stone}. Stone ${stone - 2} is more than a long hop away from it, so its number can go.`,
  };
}

function addQuiz(stone: number): StoryQuiz {
  return {
    kind: "choice",
    question: `Which numbers are added to fill stone ${stone}?`,
    options: [`Only the number on stone ${stone - 1}`, `The numbers on stones ${stone - 2} and ${stone - 1}`, "The numbers on every stone before it"],
    answer: 1,
    why: `Only a short hop from stone ${stone - 1} or a long hop from stone ${stone - 2} can land here. So those two numbers are added, and nothing else.`,
  };
}

function echoQuiz(stone: number): StoryQuiz {
  return {
    kind: "choice",
    question: `Stone ${stone} needs the numbers of stones ${stone - 2} and ${stone - 1}. How do we get them?`,
    options: [`Count all the ways to stones ${stone - 2} and ${stone - 1} again`, "Read the numbers already written on them"],
    answer: 1,
    why: "Counting again is the Echo Trap. A number that is written down never has to be asked for twice.",
  };
}

/** The real algorithm: two carried numbers rolling along the stones. */
function solutionFrames(n: number, slow: SlowRun): Frame[] {
  const cells = n + 1;
  const numbered = n <= 9;
  const frames: Frame[] = [];
  const marks: (number | null)[] = Array.from({ length: cells }, () => null);
  const tones: CellTone[] = Array.from({ length: cells }, () => "idle");
  const at = (extra: Partial<StonesState> = {}, paint: Record<number, CellTone> = {}): StonesState => withTones({ ...blank(n), marks: [...marks], tones: [...tones], ...extra }, paint);
  const carried = (prevAt: number, curAt: number): StoneTag[] => [
    { stone: prevAt, text: "prev", tone: "accent" },
    { stone: curAt, text: "cur", tone: "accent" },
  ];

  let prev = 1;
  marks[0] = prev;
  tones[0] = "hit";
  frames.push({
    scene: "solution",
    caption: "Stone 0 is where we stand. There is exactly 1 way to be there: do nothing. So stone 0 gets 1.",
    codeLine: 0,
    state: at({}, { 0: "edge" }),
  });
  let cur = 1;
  if (n >= 1) {
    marks[1] = cur;
    tones[1] = "hit";
  }
  frames.push({
    scene: "solution",
    caption: "Stone 1 can only be reached by one short hop from stone 0. That is 1 way, so stone 1 gets 1.",
    codeLine: 1,
    state: at({ hops: [{ from: 0, to: 1, label: "1", tone: "best" }] }, { 1: "edge" }),
  });
  if (n >= 2) {
    frames.push({
      scene: "solution",
      caption: "From here on we carry just two numbers. We call the number two stones back prev, and the number one stone back cur.",
      codeLine: 1,
      state: at({ tags: carried(0, 1) }, { 0: "window", 1: "window" }),
    });
  }

  let additions = 0;
  for (let stone = 2; stone <= n; stone++) {
    const detail = stone <= 3;
    const next = prev + cur;
    additions++;
    if (!detail) {
      marks[stone] = next;
      tones[stone] = "hit";
      tones[stone - 2] = "faded";
      frames.push({
        scene: "solution",
        caption: `Stone ${stone}: add the two carried numbers, ${prev} + ${cur} = ${next}. Then stone ${stone - 2} is forgotten, and the carried pair moves one stone forward.`,
        codeLine: 3,
        state: at({ tags: carried(stone - 1, stone), hops: landing(stone, "best") }, { [stone]: "edge" }),
      });
      prev = cur;
      cur = next;
      continue;
    }

    if (stone === 3) {
      frames.push({
        scene: "solution",
        caption: `Now stone ${stone}. Two kinds of hop can land on it: a short one and a long one.`,
        codeLine: 2,
        state: at({}, { [stone]: "edge" }),
        quiz: longHopQuiz(cells, numbered, stone),
      });
    }
    frames.push({
      scene: "solution",
      caption: `${stone === 3 ? "The" : `Now stone ${stone}. A`} short hop lands here from stone ${stone - 1}, and ${stone === 3 ? "the" : "a"} long hop from stone ${stone - 2}. Those are exactly the two stones we carry: cur and prev.`,
      codeLine: 2,
      state: at({ tags: carried(stone - 2, stone - 1), hops: landing(stone, "try") }, { [stone]: "edge" }),
    });
    marks[stone] = next;
    tones[stone] = "hit";
    const written: Frame = {
      scene: "solution",
      caption: `Every way onto stone ${stone} ends with one of those two hops. So add the carried numbers: ${prev} + ${cur} = ${next}. Stone ${stone} gets ${next}.`,
      codeLine: 3,
      state: at({ tags: [...carried(stone - 2, stone - 1), { stone, text: "next", tone: "teal" }], hops: landing(stone, "best") }, { [stone]: "edge" }),
    };
    if (stone === 3 && stone < n) written.quiz = forgetQuiz(cells, numbered, stone);
    frames.push(written);
    tones[stone - 2] = "faded";
    if (stone === 2) {
      frames.push({
        scene: "solution",
        caption: `Move forward. No hop onto a later stone can start from stone ${stone - 2}, so its number is forgotten. prev now means stone ${stone - 1}.`,
        codeLine: 4,
        state: at({ tags: [{ stone: stone - 1, text: "prev", tone: "accent" }, { stone, text: "next", tone: "teal" }] }),
      });
      frames.push({
        scene: "solution",
        caption: `And cur now means stone ${stone}. We still carry just two numbers: ${cur} and ${next}.`,
        codeLine: 5,
        state: at({ tags: carried(stone - 1, stone) }),
      });
    } else {
      frames.push({
        scene: "solution",
        caption: `Stone ${stone - 2} is forgotten: it is more than a long hop behind the next stone. The carried pair moves forward to stones ${stone - 1} and ${stone}.`,
        codeLine: 4,
        state: at({ tags: carried(stone - 1, stone) }),
      });
    }
    prev = cur;
    cur = next;
  }

  const last: Record<number, CellTone> = { [n]: "done" };
  frames.push({
    scene: "solution",
    caption: `The carried number cur sits on the last stone, ${n}. It says there are ${plural(cur, "different way")} up the stairs. The answer is ${cur}.`,
    codeLine: 7,
    state: at({ tags: [{ stone: n, text: "cur", tone: "teal" }], note: `ways to the top: ${cur}` }, last),
  });

  const table = waysTable(n);
  const slowSaid = slow.capped ? `more than ${SLOW_CAP} questions` : plural(slow.questions, "question");
  if (slow.capped || slow.questions > cells) {
    frames.push({
      scene: "solution",
      caption: `Every stone was written once and then only read. That is how we stepped around the Echo Trap: the slow way asked ${slowSaid}.`,
      codeLine: 3,
      state: { ...blank(n), marks: [...table], tones: table.map(() => "hit" as CellTone), tags: table.map((_, stone) => ({ stone, text: "×1", tone: "teal" as const })), note: `ways to the top: ${cur}` },
    });
  }
  frames.push({
    scene: "solution",
    caption: `Time: O(n). One walk along the stones, one addition for each stone after stone 1: ${plural(additions, "addition")}.${slow.capped || slow.questions > additions ? ` The slow way asked ${slowSaid}.` : ""}`,
    codeLine: 2,
    state: { ...blank(n), marks: [...table], tones: table.map((_, stone) => (stone === n ? "done" : "hit")), counter: { label: "additions", value: String(additions) } },
  });
  frames.push({
    scene: "solution",
    caption: `Space: O(1). However long the stairs, we carry only two numbers, prev and cur. Every stone further back is forgotten.`,
    codeLine: 0,
    state: at({ tags: n >= 1 ? [{ stone: n, text: "cur", tone: "accent" }, ...(n >= 2 ? [{ stone: n - 1, text: "prev", tone: "accent" as const }] : [])] : [] }, { [n]: "window", [Math.max(0, n - 1)]: "window" }),
  });
  return frames;
}

/** The "your turn" run: the reader decides how every stone is filled. */
function practiceFrames(n: number, table: number[]): Frame[] {
  const cells = n + 1;
  const numbered = n <= 9;
  const frames: Frame[] = [];
  const marks: (number | null)[] = Array.from({ length: cells }, () => null);
  const tones: CellTone[] = Array.from({ length: cells }, () => "idle");
  marks[0] = 1;
  tones[0] = "hit";
  if (n >= 1) {
    marks[1] = 1;
    tones[1] = "hit";
  }
  const at = (extra: Partial<StonesState> = {}, paint: Record<number, CellTone> = {}): StonesState => withTones({ ...blank(n), marks: [...marks], tones: [...tones], ...extra }, paint);

  frames.push({
    scene: "card",
    caption: `Your turn, on new stairs with ${plural(n, "step")}. Stones 0 and 1 each start with 1. You decide how every other stone is filled.`,
    state: at(),
  });

  for (let stone = 2; stone <= n; stone++) {
    const sum = `${table[stone - 2]} + ${table[stone - 1]} = ${table[stone]}`;
    const kinds = ["hop", "add", "echo", "forget"] as const;
    let kind: (typeof kinds)[number] = kinds[(stone - 2) % kinds.length];
    if (kind === "forget" && stone === n) kind = "hop";

    if (kind === "forget") {
      marks[stone] = table[stone];
      tones[stone] = "hit";
      frames.push({
        scene: "card",
        caption: `Stone ${stone} is filled from the two stones behind it: ${sum}. Now the carried pair must move forward.`,
        state: at({ hops: landing(stone, "best") }, { [stone]: "edge" }),
        quiz: forgetQuiz(cells, numbered, stone),
      });
      tones[stone - 2] = "faded";
      frames.push({
        scene: "card",
        caption: `Stone ${stone - 2} is forgotten. The next stone can only be reached from stones ${stone - 1} and ${stone}, so those two numbers are all we carry.`,
        state: at({ tags: [{ stone: stone - 1, text: "prev", tone: "accent" }, { stone, text: "cur", tone: "accent" }] }),
      });
      continue;
    }

    frames.push({
      scene: "card",
      caption: kind === "echo" ? `Stone ${stone} is next. It is filled from two stones behind it.` : `Stone ${stone} is next.`,
      state: at({}, { [stone]: "edge" }),
      quiz: kind === "hop" ? longHopQuiz(cells, numbered, stone) : kind === "add" ? addQuiz(stone) : echoQuiz(stone),
    });
    marks[stone] = table[stone];
    tones[stone] = "hit";
    const reveal =
      kind === "hop"
        ? `The long hop starts on stone ${stone - 2}, the short hop on stone ${stone - 1}. ${sum}, so stone ${stone} gets ${table[stone]}.`
        : kind === "add"
          ? `Only stones ${stone - 2} and ${stone - 1} can hop here: ${sum}. Stone ${stone} gets ${table[stone]}.`
          : `Read, never ask again: ${sum}. Stone ${stone} gets ${table[stone]}. Counting those stones afresh would be the Echo Trap.`;
    frames.push({ scene: "card", caption: reveal, state: at({ hops: landing(stone, "best") }, { [stone]: "edge" }) });
    tones[stone - 2] = "faded";
  }

  frames.push({
    scene: "card",
    caption: `Done. The answer is ${table[n]}. Every stone was written once, and no stone was ever asked twice.`,
    state: at({ note: `ways to the top: ${table[n]}` }, { [n]: "done" }),
  });
  return frames;
}

export const climbingStairsStory: ProblemStory<StonesState> = {
  slugs: ["lc-70"],
  pattern: "1-D DP",
  trigger: "“how many different ways” to reach the top, taking 1 or 2 steps at a time",
  insight: "Stepping stones, one per step. The last hop onto a stone came from one stone back or two stones back, so its number is the sum of those two. Carry just those two numbers forward.",
  metaphor: {
    name: "The stepping stones",
    legend: "stone i = step i · number on a stone = ways to reach it · prev = the stone two back · cur = the stone one back · short hop = 1 step · long hop = 2 steps",
    terms: ["stone", "hop", "carry", "carried"],
  },
  traps: [{ name: "The Echo Trap", rule: "Plain recursion never writes an answer down, so the same step is asked again and again: O(2^n). Fill forward once, carrying two numbers: O(n)." }],
  template: [
    "twoBack = answer for the smallest case; oneBack = answer for the next one;",
    "for (i = 2; i <= n; i++) {",
    "    now = combine(twoBack, oneBack);   // here: add them",
    "    twoBack = oneBack; oneBack = now;",
    "}",
    "return oneBack;",
  ],
  complexity: {
    slow: "O(2^n)",
    time: "O(n)",
    timeWhy: "one walk along the stones, one addition per stone",
    space: "O(1)",
    spaceWhy: "only two numbers are carried, however many stones there are",
  },
  code: CODE,
  examples: [
    { label: "n = 5", input: "n = 5", expected: "8" },
    { label: "n = 3", input: "n = 3", expected: "3" },
    { label: "n = 8", input: "n = 8", expected: "34", note: "The slow way asks 67 questions here" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-198", title: "House Robber" },
    { slug: "lc-91", title: "Decode Ways" },
    { slug: "lc-322", title: "Coin Change" },
  ],
  answer: (raw) => String(waysTable(parseInput(raw))[parseInput(raw)]),
  frames: (raw) => {
    const n = parseInput(raw);
    const table = waysTable(n);
    const slow = runSlow(n);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(n),
      ...slowFrames(n, slow, table),
      ...insightFrames(n),
      ...solutionFrames(n, slow),
      ...practiceFrames(practice, waysTable(practice)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: finished(n, table),
      },
    ];
  },
  View: AgyDp1StonesView,
};
