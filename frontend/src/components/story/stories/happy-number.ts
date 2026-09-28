import type { CellTone } from "@/components/learn/viz/primitives";

import { TrackView, type TrackRunner, type TrackState } from "../rec04-track-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TrackState>;

/** Fresh number for the "your turn" run. 4 is not happy: its track is one big loop (the trap). */
const PRACTICE = "4";

const CODE = [
  "int slow = n;",
  "int fast = next(n);",
  "while (fast != 1 && slow != fast) {",
  "    slow = next(slow);",
  "    fast = next(next(fast));",
  "}",
  "return fast == 1;",
  "int next(int number) {",
  "    int sum = 0;",
  "    while (number > 0) { int digit = number % 10; sum += digit * digit; number /= 10; }",
  "    return sum;",
  "}",
];

function parse(input: string): number {
  const value = Number(input.replace(/[^\d]/g, ""));
  return Number.isInteger(value) && value >= 1 ? value : 19;
}

/** The rule: add up the squares of the digits. */
function next(number: number): number {
  let sum = 0;
  for (let rest = number; rest > 0; rest = Math.floor(rest / 10)) sum += (rest % 10) * (rest % 10);
  return sum;
}

const squares = (number: number) => `${[...String(number)].map((digit) => `${digit}²`).join(" + ")} = ${next(number)}`;

/** Independent solver: remember every number seen, stop at 1 or at a repeat. */
function solve(n: number): string {
  const seen = new Set<number>();
  let number = n;
  while (number !== 1 && !seen.has(number)) {
    seen.add(number);
    number = next(number);
  }
  return String(number === 1);
}

/** The whole track: every number once, then either 1 (the end) or the arrow back into a loop. */
type Track = { numbers: number[]; pos: number };

function track(n: number): Track {
  const numbers: number[] = [];
  let number = n;
  while (!numbers.includes(number)) {
    numbers.push(number);
    if (number === 1) return { numbers, pos: -1 };
    number = next(number);
  }
  return { numbers, pos: numbers.indexOf(number) };
}

type Round = { slow: number; fast: number; hop: number[] };

/** The real algorithm, on the real numbers. Positions on the track are looked up for the picture. */
function chase(n: number, where: (number: number) => number): { start: number; rounds: Round[]; slow: number; fast: number } {
  let slow = n;
  let fast = next(n);
  const start = fast;
  const rounds: Round[] = [];
  while (fast !== 1 && slow !== fast) {
    slow = next(slow);
    const middle = next(fast);
    const hop = [where(fast), ...(middle === 1 ? [] : [where(middle)])];
    fast = next(middle);
    rounds.push({ slow, fast, hop });
  }
  return { start, rounds, slow, fast };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function setup(n: number) {
  const road = track(n);
  const where = (number: number) => road.numbers.indexOf(number);
  return { road, where, run: chase(n, where) };
}

function base(road: Track, runners: TrackRunner[], paint: (index: number) => CellTone | null = () => null): TrackState {
  return { nodes: road.numbers.map(String), pos: road.pos, nullBox: false, tones: road.numbers.map((_, index) => paint(index) ?? "idle"), runners };
}

function runners(slow: number | null, fast: number | null, walker = false): TrackRunner[] {
  const out: TrackRunner[] = [];
  if (slow !== null) out.push({ name: walker ? "walker" : "tortoise", at: slow, tone: "accent" });
  if (fast !== null) out.push({ name: "hare", at: fast, tone: "ink" });
  return out;
}

function pictureFrames(n: number, road: Track): Frame[] {
  const happy = road.pos < 0;
  const oneAt = road.numbers.indexOf(1);
  const frames: Frame[] = [];
  if (n === 1) {
    frames.push({ scene: "picture", caption: "Start with 1. It is already 1, so there is nothing to do: 1 is happy.", state: base(road, [], () => "done") });
  } else {
    frames.push({
      scene: "picture",
      caption: `Start with ${n}. The rule: add up the squares of its digits. That gives ${next(n)}, so ${n} points to ${next(n)}.`,
      state: { ...base(road, [], (index) => (index === 0 ? "edge" : null)), shown: 2, hop: [0], note: { text: squares(n), tone: "accent" } },
    });
    frames.push({
      scene: "picture",
      caption: `Keep going, and the numbers make a track: ${road.numbers.join(", ")}${happy ? "" : `, then ${road.numbers[road.pos]} again`}. Each number points to exactly one next number.`,
      state: base(road, []),
    });
    frames.push({
      scene: "picture",
      caption: happy
        ? `This track reaches 1, so ${n} is happy.`
        : `This track never reaches 1. From ${road.numbers[road.pos]} it goes round the same numbers forever, so ${n} is not happy.`,
      state: { ...base(road, [], (index) => (happy ? (index === oneAt ? "done" : null) : index >= road.pos ? "miss" : null)), hop: happy ? [] : [road.numbers.length - 1] },
    });
  }
  frames.push({ scene: "picture", caption: "The goal: say true if the track reaches 1, and false if it loops.", state: base(road, []) });
  return frames;
}

/** The obvious way, really run: write each number in a notebook, and stop at 1 or at a repeat. */
function slowFrames(n: number, road: Track): Frame[] {
  const frames: Frame[] = [];
  const notebook: number[] = [];
  let number = n;
  const at = (value: number) => road.numbers.indexOf(value);
  while (number !== 1 && !notebook.includes(at(number))) {
    notebook.push(at(number));
    const upcoming = next(number);
    const last = upcoming === 1 || notebook.includes(at(upcoming));
    if (notebook.length <= 3 || last) {
      const skipped = notebook.slice(3, -1).map((index) => road.numbers[index]);
      frames.push({
        scene: "slow",
        caption:
          notebook.length === 1
            ? `The slow way: walk along the track and write every number in a notebook. First ${number}.`
            : skipped.length
              ? `Keep walking and writing: ${[...skipped, number].join(", ")}.`
              : `Write ${number} in the notebook too.`,
        state: {
          ...base(road, runners(at(number), null, true), (index) => (index === at(number) ? "edge" : notebook.includes(index) ? "window" : null)),
          notebook: [...notebook],
          counter: { label: "numbers written", value: notebook.length },
        },
      });
    }
    number = upcoming;
  }
  const written = notebook.length;
  frames.push({
    scene: "slow",
    caption: number === 1 ? "The walker reached 1. Happy: the answer is true." : `Next comes ${number}, which is already in the notebook. The track loops without 1, so the answer is false.`,
    state: {
      ...base(road, runners(at(number), null, true), (index) => (index === at(number) ? (number === 1 ? "done" : "miss") : notebook.includes(index) ? "window" : null)),
      notebook: [...notebook],
      notebookHit: number === 1 ? null : notebook.indexOf(at(number)),
      counter: { label: "numbers written", value: written },
    },
  });
  frames.push({
    scene: "slow",
    caption: "That works in O(log n) time, but the notebook keeps every number: O(log n) extra space. Can we tell with no notebook?",
    state: { ...base(road, [], () => "faded"), notebook: [...notebook], counter: { label: "numbers written", value: written } },
  });
  return frames;
}

function insightFrames(n: number, road: Track, run: ReturnType<typeof chase>, where: (number: number) => number): Frame[] {
  const happy = run.fast === 1;
  return [
    {
      scene: "insight",
      caption: "This track is just like a linked list: each number has one arrow to the next number.",
      state: base(road, []),
    },
    {
      scene: "insight",
      caption: `So a tortoise and a hare can race on it. The tortoise starts on ${n} and takes one step at a time. The hare starts one step ahead and takes two.`,
      state: base(road, runners(where(n), where(run.start))),
    },
    {
      scene: "insight",
      caption: happy
        ? "Either the hare reaches 1, or the track loops and the hare comes round onto the tortoise. Here it reaches 1. No notebook needed."
        : "Either the hare reaches 1, or the track loops and the hare comes round onto the tortoise. Here they meet. No notebook needed.",
      state: base(road, runners(where(run.slow), where(run.fast)), (index) => (index === where(run.fast) ? (happy ? "done" : "miss") : null)),
    },
  ];
}

function hareQuiz(road: Track, fast: number): StoryQuiz {
  const one = next(fast);
  const answer = road.numbers.indexOf(next(one));
  const feedback: Record<number, string> = {};
  const oneAt = road.numbers.indexOf(one);
  if (oneAt !== answer) feedback[oneAt] = "That is only one step. The hare takes two each round.";
  const fastAt = road.numbers.indexOf(fast);
  if (fastAt !== answer && fastAt !== oneAt) feedback[fastAt] = "The hare cannot stay still. It takes two steps.";
  return {
    kind: "cell",
    cells: road.numbers.length,
    question: "The tortoise takes one step and the hare takes two. Where does the hare land? Click that box.",
    answer,
    feedback,
    otherwise: "Start where the hare stands and follow two arrows along the track.",
    why: `Two arrows from ${fast} lead to ${next(one)}.`,
  };
}

const verdictQuiz = (meet: number): StoryQuiz => ({
  kind: "choice",
  question: `The hare landed on the tortoise, on ${meet}. Neither of them is on 1. What does that tell us?`,
  options: ["The number is happy", "The number is not happy: the track loops without 1", "Keep going, 1 may still come"],
  answer: 1,
  why: "The hare can only land on the tortoise by coming round a loop. That loop has no 1 on it, so the number is not happy.",
});

function trapFrame(scene: SceneId, road: Track, slow: number, fast: number, codeLine?: number): Frame {
  return {
    scene,
    caption: "The Endless Loop Trap is to wait only for 1. The hare has just come round the loop, and 1 is not on it, so that wait would never end.",
    ...(codeLine === undefined ? {} : { codeLine }),
    state: { ...base(road, runners(slow, fast), (index) => (index >= road.pos ? "miss" : null)), hop: [road.numbers.length - 1], alert: "✕ 1 never comes on this loop" },
  };
}

function solutionFrames(n: number, road: Track, run: ReturnType<typeof chase>, where: (number: number) => number): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const trail = (slow: number) => (index: number) => (index === slow ? "edge" : null);
  let rounds = 0;
  let slow = n;
  let fast = run.start;
  let trapShown = false;
  const counter = () => ({ label: "rounds", value: rounds });

  frames.push({ scene, caption: `The tortoise starts on ${n}.`, codeLine: 0, state: base(road, runners(where(n), null), trail(where(n))) });
  frames.push({
    scene,
    caption: `The hare starts one step ahead, on ${fast}.`,
    codeLine: 1,
    state: { ...base(road, runners(where(n), where(fast)), trail(where(n))), note: { text: squares(n), tone: "accent" } },
  });

  run.rounds.forEach((round, index) => {
    if (index === 0) {
      frames.push({ scene, caption: "The hare is not on 1, and it is not on the tortoise. So the race goes on.", codeLine: 2, state: { ...base(road, runners(where(slow), where(fast)), trail(where(slow))), counter: counter() } });
    }
    const before = slow;
    slow = round.slow;
    const walked: Frame = {
      scene,
      caption: `The tortoise takes one step, to ${slow}.`,
      codeLine: 3,
      state: { ...base(road, runners(where(slow), where(fast)), trail(where(slow))), note: { text: squares(before), tone: "accent" }, counter: counter() },
    };
    if (index === 0) walked.quiz = hareQuiz(road, fast);
    frames.push(walked);
    const wrapped = road.pos >= 0 && round.hop.some((from) => from === road.numbers.length - 1);
    fast = round.fast;
    rounds += 1;
    const met = fast === slow && fast !== 1;
    frames.push({
      scene,
      caption: fast === 1 ? "The hare takes two steps and reaches 1." : met ? `The hare takes two steps and lands on the tortoise, on ${fast}.` : `The hare takes two steps, to ${fast}.`,
      codeLine: 4,
      state: { ...base(road, runners(where(slow), where(fast)), (cell) => (fast === 1 && cell === where(1) ? "done" : met && cell === where(fast) ? "miss" : trail(where(slow))(cell))), hop: round.hop, counter: counter() },
    });
    if (wrapped && !trapShown && !met) {
      trapShown = true;
      frames.push({ ...trapFrame(scene, road, where(slow), where(fast), 2), state: { ...trapFrame(scene, road, where(slow), where(fast)).state, counter: counter() } });
    }
  });

  const happy = fast === 1;
  if (String(happy) !== solve(n)) throw new Error("happy-number: the race disagrees with the solver");
  if (happy) {
    frames.push({
      scene,
      caption: n === 1 ? "The hare starts on 1 already, so the race stops at once. The answer is true." : "The hare is on 1, so the race stops. The track ends at 1: the answer is true.",
      codeLine: 6,
      state: { ...base(road, runners(where(slow), where(fast)), (index) => (index === where(1) ? "done" : null)), counter: counter() },
    });
  } else {
    frames[frames.length - 1].quiz = verdictQuiz(fast);
    if (!trapShown) frames.push({ ...trapFrame(scene, road, where(slow), where(fast), 2), state: { ...trapFrame(scene, road, where(slow), where(fast)).state, counter: counter() } });
    frames.push({
      scene,
      caption: `The race stops. The hare met the tortoise on ${fast}, not on 1, so the answer is false.`,
      codeLine: 6,
      state: { ...base(road, runners(where(slow), where(fast)), (index) => (index >= road.pos ? "miss" : null)), counter: counter(), note: { text: "not happy", tone: "coral" } },
    });
  }
  frames.push({
    scene,
    caption: `Time: O(log n). Each step only reads the digits, and after the first step the numbers stay small. Here it took ${plural(rounds, "round")}.`,
    codeLine: 2,
    state: { ...base(road, runners(where(slow), where(fast))), counter: counter() },
  });
  frames.push({
    scene,
    caption: "Space: O(1). The tortoise and the hare are just two numbers. No notebook, however long the track is.",
    codeLine: 0,
    state: base(road, runners(where(slow), where(fast))),
  });
  return frames;
}

/** The reader moves the hare every round, then says what the meeting means. */
function practiceFrames(): Frame[] {
  const n = parse(PRACTICE);
  const { road, where, run } = setup(n);
  const scene: SceneId = "card";
  const frames: Frame[] = [];
  frames.push({
    scene,
    caption: `Your turn, with the number ${n}. The tortoise starts on ${n} and the hare on ${run.start}. You move the hare.`,
    state: base(road, runners(where(n), where(run.start))),
  });
  let fast = run.start;
  let trapShown = false;
  for (const round of run.rounds) {
    frames[frames.length - 1].quiz = hareQuiz(road, fast);
    const wrapped = round.hop.some((from) => from === road.numbers.length - 1);
    fast = round.fast;
    frames.push({ scene, caption: `The hare lands on ${round.fast}, and the tortoise steps to ${round.slow}.`, state: { ...base(road, runners(where(round.slow), where(round.fast))), hop: round.hop } });
    if (wrapped && !trapShown && round.slow !== round.fast) {
      trapShown = true;
      frames.push(trapFrame(scene, road, where(round.slow), where(round.fast)));
    }
  }
  frames[frames.length - 1].quiz = verdictQuiz(fast);
  frames.push({
    scene,
    caption: `Done. They met on ${fast}, not on 1, so ${n} is not happy. The answer is ${solve(n)}.`,
    state: { ...base(road, runners(where(run.slow), where(run.fast)), (index) => (index === where(fast) ? "miss" : null)), note: { text: "not happy", tone: "coral" } },
  });
  return frames;
}

export const happyNumberStory: ProblemStory<TrackState> = {
  slugs: ["lc-202"],
  pattern: "Fast and slow pointers",
  trigger: "“repeat this step on a number until it reaches 1, or loops forever”",
  insight: "Each number points to the next one, like a linked list. A tortoise and a hare run along the numbers: either the hare reaches 1, or it comes round the loop and lands on the tortoise.",
  metaphor: { name: "The number track", legend: "tortoise = slow · hare = fast · track = the chain of digit-square sums", terms: ["tortoise", "hare", "track"] },
  traps: [{ name: "The Endless Loop Trap", rule: "A number that is not happy never reaches 1. Stop when the hare reaches 1 or lands on the tortoise, never on 1 alone." }],
  template: ["slow = n; fast = next(n);", "while (fast is not 1 and slow != fast) {", "    slow one step; fast two steps;", "}", "happy when fast is 1;"],
  complexity: {
    slow: "O(log n)",
    time: "O(log n)",
    timeWhy: "each step reads the digits, and after the first step the numbers stay small",
    space: "O(1)",
    spaceWhy: "two numbers, and no notebook",
  },
  code: CODE,
  examples: [
    { label: "19", input: "19", expected: "true" },
    { label: "2", input: "2", expected: "false", note: "Loops forever without 1" },
    { label: "7", input: "7", expected: "true" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-141", title: "Linked List Cycle" },
    { slug: "lc-142", title: "Linked List Cycle II" },
    { slug: "lc-876", title: "Middle of the Linked List" },
  ],
  answer: (input) => solve(parse(input)),
  frames: (input) => {
    const n = parse(input);
    const { road, where, run } = setup(n);
    const happy = run.fast === 1;
    return [
      ...pictureFrames(n, road),
      ...slowFrames(n, road),
      ...insightFrames(n, road, run, where),
      ...solutionFrames(n, road, run, where),
      ...practiceFrames(),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: base(road, runners(where(run.slow), where(run.fast)), (index) => (happy ? (index === where(1) ? "done" : null) : index >= road.pos ? "miss" : null)),
      },
    ];
  },
  View: TrackView,
};
