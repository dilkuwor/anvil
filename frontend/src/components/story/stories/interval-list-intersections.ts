import type { CellTone } from "@/components/learn/viz/primitives";

import { TwoListsView, type Span, type TwoListsState } from "../rec03-two-lists-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<TwoListsState>;
type Lists = [Span[], Span[]];

/** Fresh lists for the "your turn" run. The first move already hits the trap. */
const PRACTICE = "[[2,6],[8,12]] | [[1,3],[5,9],[11,14]]";
const TITLES: [string, string] = ["first", "second"];

const CODE = [
  "List<int[]> shared = new ArrayList<>();",
  "int i = 0, j = 0;",
  "while (i < firstList.length && j < secondList.length) {",
  "    int start = Math.max(firstList[i][0], secondList[j][0]);",
  "    int end = Math.min(firstList[i][1], secondList[j][1]);",
  "    if (start <= end) shared.add(new int[] {start, end});",
  "    if (firstList[i][1] < secondList[j][1]) i++;",
  "    else j++;",
  "}",
  "return shared.toArray(new int[0][]);",
];

function spansOf(raw: string): Span[] {
  return [...raw.matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map((match): Span => [Number(match[1]), Number(match[2])]).filter(([start, end]) => start <= end);
}

function parse(input: string): Lists {
  const [first, second] = input.split("|");
  return [spansOf(first ?? ""), spansOf(second ?? "")];
}

const show = (span: Span) => `[${span[0]},${span[1]}]`;
const text = (spans: Span[]) => JSON.stringify(spans);

/** Independent solver: every pair, then put the shared stretches in time order. */
function solve([first, second]: Lists): Span[] {
  const found: Span[] = [];
  for (const a of first) {
    for (const b of second) {
      const start = Math.max(a[0], b[0]);
      const end = Math.min(a[1], b[1]);
      if (start <= end) found.push([start, end]);
    }
  }
  return found.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

type Step = { i: number; j: number; a: Span; b: Span; start: number; end: number; has: boolean; mover: 0 | 1; tie: boolean };

/** The real two-finger walk, recorded one step at a time. */
function walk([first, second]: Lists): Step[] {
  const steps: Step[] = [];
  let i = 0;
  let j = 0;
  while (i < first.length && j < second.length) {
    const a = first[i];
    const b = second[j];
    const start = Math.max(a[0], b[0]);
    const end = Math.min(a[1], b[1]);
    const mover: 0 | 1 = a[1] < b[1] ? 0 : 1;
    steps.push({ i, j, a, b, start, end, has: start <= end, mover, tie: a[1] === b[1] });
    if (mover === 0) i++;
    else j++;
  }
  return steps;
}

/** What moving the other finger would lose: the staying range's overlap with the next range on the mover's list. */
function lostBy(lists: Lists, step: Step): { stay: Span; next: Span; lost: Span } | null {
  if (step.tie) return null;
  const stay = step.mover === 0 ? step.b : step.a;
  const next = step.mover === 0 ? lists[0][step.i + 1] : lists[1][step.j + 1];
  if (!next) return null;
  const start = Math.max(stay[0], next[0]);
  const end = Math.min(stay[1], next[1]);
  return start <= end ? { stay, next, lost: [start, end] } : null;
}

function blank(lists: Lists, extra: Partial<TwoListsState> = {}): TwoListsState {
  return { lists, titles: TITLES, tones: [lists[0].map(() => "idle"), lists[1].map(() => "idle")], fingers: [null, null], shared: [], band: null, lost: null, counter: null, ...extra };
}

/** Tones for both lanes: the ranges under the fingers stand out, ranges already passed fade. */
function lanes(lists: Lists, i: number | null, j: number | null, paint: (lane: 0 | 1, index: number) => CellTone | null = () => null): [CellTone[], CellTone[]] {
  const at = [i, j];
  return [0, 1].map((lane) =>
    lists[lane].map((_, index): CellTone => {
      const own = paint(lane as 0 | 1, index);
      if (own) return own;
      const finger = at[lane];
      if (finger === null) return "idle";
      return index === finger ? "edge" : index < finger ? "faded" : "idle";
    }),
  ) as [CellTone[], CellTone[]];
}

function pictureFrames(lists: Lists): F[] {
  const steps = walk(lists);
  const answer = solve(lists);
  const frames: F[] = [
    { scene: "picture", caption: "Two people, two lists of busy times. Each list is already in time order, and its ranges never overlap each other.", state: blank(lists) },
  ];
  const first = steps.find((step) => step.has);
  if (first) {
    frames.push({
      scene: "picture",
      caption: `Where a range from each list covers the same time, both people are busy. ${show(first.a)} and ${show(first.b)} share ${show([first.start, first.end])}.`,
      state: blank(lists, { tones: lanes(lists, null, null, (lane, index) => ((lane === 0 && index === first.i) || (lane === 1 && index === first.j) ? "hit" : null)), band: { from: first.start, to: first.end, kind: "share" } }),
    });
  }
  const moment = steps.find((step) => step.has && step.start === step.end);
  if (moment) {
    frames.push({
      scene: "picture",
      caption: `A shared stretch can be a single moment. ${show(moment.a)} and ${show(moment.b)} share only ${moment.start}.`,
      state: blank(lists, { tones: lanes(lists, null, null, (lane, index) => ((lane === 0 && index === moment.i) || (lane === 1 && index === moment.j) ? "hit" : null)), band: { from: moment.start, to: moment.end, kind: "share" } }),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: list every shared stretch, in time order.",
    state: blank(lists, { shared: answer }),
  });
  return frames;
}

/** The obvious way, really run: every range of the first list against every range of the second. */
function slowFrames(lists: Lists): F[] {
  const [first, second] = lists;
  const frames: F[] = [];
  const shared: Span[] = [];
  let checks = 0;
  first.forEach((a, index) => {
    const found: Span[] = [];
    for (const b of second) {
      checks++;
      const start = Math.max(a[0], b[0]);
      const end = Math.min(a[1], b[1]);
      if (start <= end) found.push([start, end]);
    }
    shared.push(...found);
    if (index > 2) return;
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: take ${show(a)} and compare it with every range in the second list. ${found.length === 0 ? "Nothing shared." : `Found ${found.map(show).join(" and ")}.`}`
          : `Next, ${show(a)} is compared with every range in the second list again, even ranges far away in time.`,
      state: blank(lists, {
        tones: [first.map((_, other) => (other === index ? "edge" : other < index ? "faded" : "idle")), second.map(() => "window")],
        shared: [...shared],
        counter: { label: "checks", value: checks },
      }),
    });
  });
  frames.push({
    scene: "slow",
    caption: `This is O(m × n) time: ${checks} checks for ${first.length} and ${second.length} ranges. It ignores that both lists are already in order.`,
    state: blank(lists, { tones: [first.map(() => "faded"), second.map(() => "faded")], shared: [...shared], counter: { label: "checks", value: checks } }),
  });
  return frames;
}

function insightFrames(lists: Lists): F[] {
  const steps = walk(lists);
  const step = steps.find((each) => !each.tie) ?? steps[0];
  if (!step) return [];
  const { i, j } = step;
  const frames: F[] = [
    {
      scene: "insight",
      caption: `Put one finger on each list. Here they rest on ${show(step.a)} and ${show(step.b)}.`,
      state: blank(lists, { tones: lanes(lists, i, j), fingers: [i, j] }),
    },
    {
      scene: "insight",
      caption: step.has
        ? `The two ranges share the stretch from the later start, ${step.start}, to the earlier end, ${step.end}.`
        : `The later start, ${step.start}, comes after the earlier end, ${step.end}. So these two share nothing.`,
      state: blank(lists, { tones: lanes(lists, i, j), fingers: [i, j], band: step.has ? { from: step.start, to: step.end, kind: "share" } : { from: step.start, to: step.end, kind: "gap" } }),
    },
  ];
  const early = step.mover === 0 ? step.a : step.b;
  const late = step.mover === 0 ? step.b : step.a;
  frames.push({
    scene: "insight",
    caption: `${show(early)} ends first. Every later range on the other list starts after ${show(late)} ends, so ${show(early)} can meet nothing more. Its finger moves on.`,
    state: blank(lists, {
      tones: lanes(lists, i, j, (lane, index) => (lane === step.mover && index === (lane === 0 ? i : j) ? "faded" : null)),
      fingers: step.mover === 0 ? [i + 1 < lists[0].length ? i + 1 : null, j] : [i, j + 1 < lists[1].length ? j + 1 : null],
    }),
  });
  return frames;
}

function moveQuiz(step: Step): StoryQuiz {
  const early = step.mover === 0 ? step.a : step.b;
  const late = step.mover === 0 ? step.b : step.a;
  return {
    kind: "cell",
    cells: 2,
    question: "Which finger moves on to its next range? Click the range it rests on now.",
    answer: step.mover,
    feedback: { [1 - step.mover]: `${show(late)} ends later. It may still reach into the next range of the other list, so it must stay.` },
    otherwise: "Look at where each range ends.",
    why: `${show(early)} ends first. Everything further on the other list starts too late to meet it.`,
  };
}

/** The real algorithm, one frame per change. `practice` reuses it: the reader moves every finger. */
function solutionFrames(lists: Lists, scene: SceneId = "solution", practice = false): F[] {
  const steps = walk(lists);
  const frames: F[] = [];
  const shared: Span[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const asked = new Set<number>();
  let warned = false;
  const at = (i: number | null, j: number | null, extra: Partial<TwoListsState> = {}): TwoListsState =>
    blank(lists, { tones: lanes(lists, i, j), fingers: [i, j], shared: [...shared], ...extra });

  frames.push({
    scene,
    caption: practice ? "Your turn, with two new lists. One finger goes on the first range of each." : "Start with one finger on the first range of each list, and an empty shared list.",
    codeLine: line(1),
    state: at(0, 0),
  });

  for (const step of steps) {
    const { i, j } = step;
    const nextI = step.mover === 0 ? i + 1 : i;
    const nextJ = step.mover === 1 ? j + 1 : j;
    const fingerAfter = (lane: 0 | 1) => {
      const index = lane === 0 ? nextI : nextJ;
      return index < lists[lane].length ? index : null;
    };
    const band = step.has ? { from: step.start, to: step.end, kind: "share" as const } : { from: step.start, to: step.end, kind: "gap" as const };
    const ask = !step.tie && (practice || !asked.has(step.mover));

    if (practice) {
      if (step.has) shared.push([step.start, step.end]);
      frames.push({
        scene,
        caption: `The fingers are on ${show(step.a)} and ${show(step.b)}. ${step.has ? `They share ${show([step.start, step.end])}, which goes on the shared list.` : "They share nothing."}`,
        state: at(i, j, { band, pickFingers: ask }),
        quiz: ask ? moveQuiz(step) : undefined,
      });
    } else {
      frames.push({
        scene,
        caption: `The fingers are on ${show(step.a)} and ${show(step.b)}. The later start is ${step.start}, and the earlier end is ${step.end}.`,
        codeLine: 4,
        state: at(i, j, { band }),
      });
      if (step.has) shared.push([step.start, step.end]);
      frames.push({
        scene,
        caption: step.has
          ? `${step.start} is not after ${step.end}, so the two ranges share ${show([step.start, step.end])}. It goes on the shared list.`
          : `${step.start} is after ${step.end}: the two ranges share nothing. The shared list stays as it is.`,
        codeLine: 5,
        state: at(i, j, { band, pickFingers: ask }),
        quiz: ask ? moveQuiz(step) : undefined,
      });
    }
    if (ask) asked.add(step.mover);

    const early = step.mover === 0 ? step.a : step.b;
    const falls = fingerAfter(step.mover) === null;
    frames.push({
      scene,
      caption: step.tie
        ? `Both ranges end at ${step.a[1]}, so either finger may move. The code moves the finger on the second list${falls ? ", and it falls off the end" : ""}.`
        : `${show(early)} ends first, so its finger moves on${falls ? " and falls off the end of its list" : ""}.`,
      codeLine: line(step.mover === 0 ? 6 : 7),
      state: at(fingerAfter(0), fingerAfter(1)),
    });

    const trap = lostBy(lists, step);
    if (trap && !warned && !practice) {
      warned = true;
      frames.push({
        scene,
        caption: `The Wrong Finger Trap: moving the finger on ${show(trap.stay)} instead would drop it, and its shared stretch ${show(trap.lost)} with ${show(trap.next)} would be lost.`,
        codeLine: step.mover === 0 ? 6 : 7,
        state: at(fingerAfter(0), fingerAfter(1), {
          tones: lanes(lists, fingerAfter(0), fingerAfter(1), (lane, index) => ((step.mover === 0 ? lane === 1 && index === j : lane === 0 && index === i) ? "miss" : null)),
          lost: trap.lost,
        }),
      });
    }
  }

  const answer = text(shared);
  frames.push({
    scene,
    caption: practice ? `Done. A finger fell off its list, so nothing more can be shared. The answer is ${answer}.` : `A finger fell off the end of its list, so nothing more can be shared. The answer is ${answer}.`,
    codeLine: line(9),
    state: blank(lists, { tones: [lists[0].map(() => "faded"), lists[1].map(() => "faded")], shared: [...shared], sharedTones: shared.map(() => "done") }),
  });
  if (!practice) {
    const ranges = lists[0].length + lists[1].length;
    frames.push({
      scene,
      caption: `Time: O(m + n). Every step moved one finger forward, so there were only ${steps.length} steps for ${ranges} ranges. Compare that with the slow way.`,
      codeLine: 2,
      state: blank(lists, { tones: [lists[0].map(() => "window"), lists[1].map(() => "window")], shared: [...shared], counter: { label: "steps", value: steps.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(m + n), for the shared list, which here holds ${shared.length} stretches. Apart from it, the two fingers are just two numbers.`,
      codeLine: 0,
      state: blank(lists, { tones: [lists[0].map(() => "faded"), lists[1].map(() => "faded")], shared: [...shared], sharedTones: shared.map(() => "done") }),
    });
  }
  return frames;
}

export const intervalListIntersectionsStory: ProblemStory<TwoListsState> = {
  slugs: ["lc-986"],
  pattern: "Two pointers",
  trigger: "two lists of time ranges, each already sorted, and the question “when are both busy?”",
  insight: "Put one finger on each list. The two ranges share the stretch from the later start to the earlier end. Then the finger on the range that ends first moves on.",
  metaphor: { name: "Two fingers", legend: "fingers = i and j · later start = max of the starts · earlier end = min of the ends", terms: ["finger", "shared list"] },
  traps: [{ name: "The Wrong Finger Trap", rule: "Move the finger whose range ends first. The other range may still reach into the next one, so it must stay." }],
  template: [
    "i = 0; j = 0;",
    "while (both lists have items left) {",
    "    handle the pair under the two fingers;   // here: keep the shared stretch",
    "    move the finger whose item is used up;   // here: the range that ends first",
    "}",
  ],
  complexity: {
    slow: "O(m × n)",
    time: "O(m + n)",
    timeWhy: "every step moves one finger forward, and each finger passes its list once",
    space: "O(m + n)",
    spaceWhy: "only the shared list; the fingers are two numbers",
  },
  code: CODE,
  examples: [
    { label: "[[0,2],[5,10],[13,23],[24,25]] and [[1,5],[8,12],[15,24],[25,26]]", input: "[[0,2],[5,10],[13,23],[24,25]] | [[1,5],[8,12],[15,24],[25,26]]", expected: "[[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]]" },
    { label: "[[3,5],[9,20]] and [[4,5],[7,10],[11,12]]", input: "[[3,5],[9,20]] | [[4,5],[7,10],[11,12]]", expected: "[[4,5],[9,10],[11,12]]", note: "Tricky: one long range meets several short ones" },
    { label: "[[1,7]] and [[3,10]]", input: "[[1,7]] | [[3,10]]", expected: "[[3,7]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-56", title: "Merge Intervals" },
    { slug: "lc-57", title: "Insert Interval" },
    { slug: "lc-88", title: "Merge Sorted Array" },
  ],
  answer: (input) => text(solve(parse(input))),
  frames: (input) => {
    const lists = parse(input);
    const answer = solve(lists);
    return [
      ...pictureFrames(lists),
      ...slowFrames(lists),
      ...insightFrames(lists),
      ...solutionFrames(lists),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: blank(lists, { tones: [lists[0].map(() => "window"), lists[1].map(() => "window")], shared: answer, sharedTones: answer.map(() => "done") }),
      },
    ];
  },
  View: TwoListsView,
};
