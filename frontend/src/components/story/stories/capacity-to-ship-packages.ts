import { GrokShipView, SHIP_CLICK_LIMIT, type ShipDialState } from "../grok-ship-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type DialFrame = StoryFrame<ShipDialState>;

/** Fresh packages for the "your turn" run. The heaviest box is 5, so a capacity of 4 is the trap. */
const PRACTICE = "weights=[2,5,3,2], days=3";
const FALLBACK = { packages: [1, 2, 3, 1, 1], days: 4 };

const CODE = [
  "int low = 0, high = 0;",
  "for (int w : weights) {",
  "    low = Math.max(low, w);",
  "    high += w;",
  "}",
  "while (low < high) {",
  "    int mid = low + (high - low) / 2;",
  "    if (daysNeeded(weights, mid) <= days) high = mid;",
  "    else low = mid + 1;",
  "}",
  "return low;",
];

function parseInput(raw: string): { packages: number[]; days: number } {
  const list = raw.match(/\[([^\]]*)\]/);
  const limit = raw.match(/days\s*=\s*(\d+)/);
  const packages = (list?.[1].match(/\d+/g) ?? []).map(Number).filter((pkg) => pkg > 0);
  if (packages.length === 0 || !limit) return FALLBACK;
  return { packages, days: Math.max(1, Number(limit[1])) };
}

function daysNeeded(packages: number[], cap: number): { days: number; dayOf: number[]; stuck: number | null } {
  const heaviest = Math.max(...packages);
  if (cap < heaviest) {
    const stuck = packages.findIndex((pkg) => pkg > cap);
    return { days: Infinity, dayOf: [], stuck };
  }
  let days = 1;
  let load = 0;
  const dayOf: number[] = [];
  for (const pkg of packages) {
    if (load + pkg > cap) {
      days += 1;
      load = 0;
    }
    load += pkg;
    dayOf.push(days);
  }
  return { days, dayOf, stuck: null };
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const heaviestOf = (packages: number[]) => Math.max(...packages);
const dayWord = (count: number) => (count === 1 ? "day" : "days");

type Try = { low: number; high: number; mid: number; used: number; dayOf: number[]; works: boolean };

function solve(packages: number[], days: number): { answer: number; tries: Try[] } {
  const tries: Try[] = [];
  let low = heaviestOf(packages);
  let high = sum(packages);
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    const need = daysNeeded(packages, mid);
    tries.push({ low, high, mid, used: need.days, dayOf: need.dayOf, works: need.days <= days });
    if (need.days <= days) high = mid;
    else low = mid + 1;
  }
  return { answer: low, tries };
}

/** Independent of the binary search: try every capacity from the heaviest box up. */
function answerOf(packages: number[], days: number): number {
  const top = sum(packages);
  for (let cap = heaviestOf(packages); cap <= top; cap++) {
    if (daysNeeded(packages, cap).days <= days) return cap;
  }
  return top;
}

function blank(packages: number[], days: number): ShipDialState {
  return { packages, days, capacity: null, low: null, high: null, dayOf: null, span: sum(packages) };
}

function pictureFrames(packages: number[], days: number, answer: number): DialFrame[] {
  const listed = packages.length > 1 ? `${packages.slice(0, -1).join(", ")} and ${packages.at(-1)}` : String(packages[0]);
  const heavy = heaviestOf(packages);
  const heavyIndex = packages.indexOf(heavy);
  const need = daysNeeded(packages, answer);
  return [
    { scene: "picture", caption: `A belt of ${packages.length} packages: ${listed}. One ship must carry them, in this order, in ${days} ${dayWord(days)}.`, state: blank(packages, days) },
    {
      scene: "picture",
      caption: `The ship picks one capacity and keeps it. Packages stay in order. When the next one would overflow, it waits until tomorrow.`,
      state: { ...blank(packages, days), capacity: answer, dayOf: need.dayOf, usedDays: need.days, verdict: "works" },
    },
    {
      scene: "picture",
      caption: `Not allowed: splitting a package across two days. The package of ${heavy} must fit in one day, so the capacity cannot be smaller than ${heavy}.`,
      state: { ...blank(packages, days), stuck: heavyIndex, wrong: { capacity: Math.max(1, heavy - 1), stuck: heavy } },
    },
    {
      scene: "picture",
      caption: `The goal: the smallest capacity that still finishes in ${days} ${dayWord(days)}. Here that is ${answer}.`,
      state: { ...blank(packages, days), capacity: answer, dayOf: need.dayOf, usedDays: need.days, verdict: "works" },
    },
  ];
}

function slowFrames(packages: number[], days: number): DialFrame[] {
  const frames: DialFrame[] = [];
  const top = sum(packages);
  const heavy = heaviestOf(packages);
  let tried = 0;
  for (let cap = heavy; cap <= top; cap++) {
    tried += 1;
    const need = daysNeeded(packages, cap);
    const works = need.days <= days;
    if (cap <= heavy + 1 || works) {
      const skipped = works && tried > 3;
      let caption: string;
      if (works) caption = `${skipped ? "And so on, one capacity at a time. " : tried === 1 ? "The slow way: try the heaviest package first. " : ""}Capacity ${cap} is the first that works: ${need.days} ${dayWord(need.days)}. That took ${tried} ${tried === 1 ? "try" : "tries"}.`;
      else if (tried === 1) caption = `The slow way: try the heaviest package, then one more, then one more. Capacity ${cap} needs ${need.days} ${dayWord(need.days)}. Too many days.`;
      else caption = `Capacity ${cap}: ${need.days} ${dayWord(need.days)}. Still too many.`;
      frames.push({
        scene: "slow",
        caption,
        state: { ...blank(packages, days), capacity: cap, dayOf: need.dayOf, usedDays: need.days, verdict: works ? "works" : "slow", counter: { label: "capacities tried", value: tried } },
      });
    }
    if (works) break;
  }
  frames.push({
    scene: "slow",
    caption: `The total weight can be huge, so this can mean a huge number of tries, each walking all ${packages.length} packages. That is O(n · S) time.`,
    state: { ...blank(packages, days), counter: { label: "capacities tried", value: tried } },
  });
  return frames;
}

function insightFrames(packages: number[], days: number, answer: number): DialFrame[] {
  const top = sum(packages);
  const heavy = heaviestOf(packages);
  const heavyIndex = packages.indexOf(heavy);
  const small = Math.max(1, heavy - 1);
  return [
    {
      scene: "insight",
      caption: `Lay every capacity on a dial, from 1 up to ${top}, the total weight. ${top} always works: the whole belt fits in one day.`,
      state: { ...blank(packages, days), low: 1, high: top },
    },
    {
      scene: "insight",
      caption: `The Split Package Trap: capacity ${small} cannot hold the package of ${heavy}. A package cannot be split, so everything below ${heavy} is impossible.`,
      state: { ...blank(packages, days), capacity: small, stuck: heavyIndex, wrong: { capacity: small, stuck: heavy }, low: 1, high: top },
    },
    {
      scene: "insight",
      caption: "If a capacity finishes in time, every bigger one does too. We want the first that works. Try the middle of the dial, and half of it can go.",
      state: { ...blank(packages, days), zones: { firstWorks: answer }, capacity: answer },
    },
  ];
}

function sideQuiz(attempt: Try, days: number): StoryQuiz {
  const { mid, used, works } = attempt;
  return {
    kind: "choice",
    question: `Capacity ${mid} uses ${used} ${dayWord(used)}, and the ship has ${days}. We want the smallest capacity that works. Which part of the dial can go?`,
    options: [`The light side: ${mid} and everything smaller`, `The heavy side: everything bigger than ${mid}`],
    answer: works ? 1 : 0,
    why: works
      ? `${mid} works, so anything bigger is never needed. But ${mid} itself stays: it may be the answer.`
      : `${mid} uses too many days, so every smaller capacity does too. ${mid} itself goes with them.`,
  };
}

function dialQuiz(attempt: Try, days: number, top: number): StoryQuiz {
  const { low, high, mid, works } = attempt;
  const answerCap = works ? mid : mid + 1;
  const feedback: Record<number, string> = {};
  for (let cap = 1; cap <= top; cap++) {
    if (cap === answerCap) continue;
    let text: string;
    if (cap < low || cap > high) text = "That part of the dial was already thrown away.";
    else if (works && cap > mid) text = "The needle already works, and we want the smallest. Nothing bigger needs to stay.";
    else if (works) text = "The needle's capacity works, so it may be the answer. Jumping past it would throw it away.";
    else if (cap === mid) text = "The needle was just tried and uses too many days. It must go as well.";
    else if (cap < mid) text = "Smaller than the needle is too small as well. The end must clear everything we know fails.";
    else text = "That throws away capacities nobody has tried. One of them may be the smallest that works.";
    feedback[cap - 1] = text;
  }
  return {
    kind: "cell",
    cells: top,
    question: `The ship has ${days} days. One end of the dial must jump. Click the capacity it lands on.`,
    answer: answerCap - 1,
    feedback,
    otherwise: "Throw away only the capacities you are sure about, and keep all the rest.",
    why: works
      ? "It works, so nothing bigger is needed. The heavy end jumps onto the needle, which may still be the answer."
      : "Too many days, so the needle and everything smaller go. The light end lands one step past the needle.",
  };
}

function trapQuiz(packages: number[]): StoryQuiz {
  const heavy = heaviestOf(packages);
  const small = Math.max(1, heavy - 1);
  return {
    kind: "choice",
    question: `The heaviest package is ${heavy}. Someone starts the dial at capacity ${small}. What happens?`,
    options: [`The ship just uses more days`, `That package cannot board, so ${small} is impossible`],
    answer: 1,
    why: `A package cannot be split. Capacity must be at least ${heavy}, or that box never leaves the belt.`,
  };
}

function solutionFrames(packages: number[], days: number, scene: SceneId = "solution", practice = false): DialFrame[] {
  const frames: DialFrame[] = [];
  const top = sum(packages);
  const heavy = heaviestOf(packages);
  const heavyIndex = packages.indexOf(heavy);
  const { answer, tries } = solve(packages, days);
  const line = (index: number) => (practice ? undefined : index);
  const clickable = top <= SHIP_CLICK_LIMIT;
  let best: number | null = null;
  const asked = { works: false, slow: false };
  const small = Math.max(1, heavy - 1);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, with a new belt and ${days} days. You count the days, and you move the ends of the dial.`
      : `The light end is not 1. The Split Package Trap: a package of ${heavy} cannot be split, so the light end starts at ${heavy}.`,
    codeLine: line(2),
    state: practice
      ? blank(packages, days)
      : { ...blank(packages, days), low: heavy, high: top, stuck: heavyIndex, wrong: { capacity: small, stuck: heavy } },
    quiz: practice ? trapQuiz(packages) : undefined,
  });

  if (practice) {
    frames.push({
      scene,
      caption: `The package of ${heavy} cannot board a ship of ${small}. The light end starts at ${heavy}. The heavy end is ${top}, the total weight.`,
      state: { ...blank(packages, days), low: heavy, high: top },
    });
  } else {
    frames.push({
      scene,
      caption: `The heavy end is ${top}, the total weight. The dial now runs from ${heavy} to ${top}.`,
      codeLine: 3,
      state: { ...blank(packages, days), low: heavy, high: top },
    });
  }

  tries.forEach((attempt, position) => {
    const { low, high, mid, used, dayOf, works } = attempt;
    const open: ShipDialState = { ...blank(packages, days), low, high, capacity: mid, best };
    const counted: ShipDialState = { ...open, dayOf, usedDays: used };
    const needle = position === 0 ? `The needle points at the middle of the dial: capacity ${mid}.` : `The needle moves to the middle of what is left: capacity ${mid}.`;

    if (practice) {
      frames.push({
        scene,
        caption: `${needle} Loading uses ${used} ${dayWord(used)}.`,
        state: counted,
        quiz: clickable ? dialQuiz(attempt, days, top) : sideQuiz(attempt, days),
      });
    } else {
      frames.push({ scene, caption: needle, codeLine: 6, state: open });
      frames.push({
        scene,
        caption: `Walk the belt in order. Capacity ${mid} uses ${used} ${dayWord(used)}.`,
        codeLine: 7,
        state: counted,
      });
      const verdict: DialFrame = {
        scene,
        caption: works
          ? `${used} ${dayWord(used)} fits in the ${days} the ship has. The needle's capacity ${mid} works.`
          : `${used} ${dayWord(used)} is more than the ${days} the ship has. The needle's capacity ${mid} is too small.`,
        codeLine: 7,
        state: { ...counted, verdict: works ? "works" : "slow" },
      };
      if (!asked[works ? "works" : "slow"]) {
        asked[works ? "works" : "slow"] = true;
        verdict.quiz = sideQuiz(attempt, days);
      }
      frames.push(verdict);
    }

    const after: ShipDialState = { ...blank(packages, days), low: works ? low : mid + 1, high: works ? mid : high, capacity: null, best };
    frames.push({
      scene,
      caption: works
        ? `${practice ? `${used} ${dayWord(used)} is in time. ` : ""}Anything bigger works too, but we want the smallest. The heavy end of the dial jumps onto the needle, ${mid}.`
        : `${practice ? `${used} ${dayWord(used)} is too many. ` : ""}Anything smaller is too small as well. The light end of the dial jumps just past the needle, to ${mid + 1}.`,
      codeLine: line(works ? 7 : 8),
      state: after,
    });
    if (works) {
      best = mid;
      frames.push({
        scene,
        caption: `Capacity ${mid} is the biggest we ever need: the best so far. The answer is ${mid} or something smaller on the dial.`,
        codeLine: line(7),
        state: { ...after, best },
      });
    }
  });

  const final = daysNeeded(packages, answer);
  const closed: ShipDialState = { ...blank(packages, days), low: answer, high: answer, capacity: answer, dayOf: final.dayOf, usedDays: final.days, verdict: "works", best: answer };
  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}The two ends of the dial meet at ${answer}. Everything smaller was too small, so the answer is ${answer}.`,
    codeLine: line(10),
    state: closed,
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log S). The dial has S capacities, but halving it took only ${tries.length} ${tries.length === 1 ? "try" : "tries"}. Each try walks the ${packages.length} packages once.`,
      codeLine: 6,
      state: { ...closed, counter: { label: "capacities tried", value: tries.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two ends of the dial, the needle and one day count are stored. Nothing grows with the belt.",
      codeLine: 0,
      state: { ...blank(packages, days), low: answer, high: answer, capacity: answer },
    });
  }
  return frames;
}

export const capacityToShipPackagesStory: ProblemStory<ShipDialState> = {
  slugs: ["lc-1011"],
  pattern: "Binary search on the answer",
  trigger: "the smallest ship capacity that still finishes in a fixed number of days, packages in a fixed order",
  insight: "Lay capacities on a dial from the heaviest package to the total weight. Too small stays too small below. Try the middle, count the days, and throw half the dial away.",
  metaphor: {
    name: "The capacity dial",
    legend: "light end = low · heavy end = high · needle = mid, the capacity being tried · days used = walk the belt and start a new day on overflow",
    terms: ["dial", "needle", "light end", "heavy end"],
  },
  traps: [
    {
      name: "The Split Package Trap",
      rule: "One package cannot be split. Low must be the heaviest package, or a day can never hold it.",
    },
  ],
  template: [
    "low = heaviest package; high = total weight;",
    "while (low < high) {",
    "    mid = the middle of low..high;",
    "    if (mid finishes in time) high = mid;   // keep mid, it may be the answer",
    "    else low = mid + 1;                      // mid and everything below fail",
    "}",
    "return low;",
  ],
  complexity: {
    slow: "O(n · S)",
    time: "O(n log S)",
    timeWhy: "each guess walks n packages, and the capacity range S is halved each time",
    space: "O(1)",
    spaceWhy: "only the two search ends and the day counter",
  },
  code: CODE,
  examples: [
    { label: "weights=[1,2,3,1,1], days=4", input: "weights=[1,2,3,1,1], days=4", expected: "3" },
    { label: "weights=[3,2,2,4,1,4], days=3", input: "weights=[3,2,2,4,1,4], days=3", expected: "6" },
    { label: "weights=[1,2,3,4,5], days=1", input: "weights=[1,2,3,4,5], days=1", expected: "15", note: "One day means the ship must hold the total weight" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-875", title: "Koko Eating Bananas" },
    { slug: "lc-278", title: "First Bad Version" },
    { slug: "lc-704", title: "Binary Search" },
  ],
  answer: (input) => {
    const { packages, days } = parseInput(input);
    return String(answerOf(packages, days));
  },
  frames: (input) => {
    const { packages, days } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const answer = answerOf(packages, days);
    return [
      ...pictureFrames(packages, days, answer),
      ...slowFrames(packages, days),
      ...insightFrames(packages, days, answer),
      ...solutionFrames(packages, days),
      ...solutionFrames(practice.packages, practice.days, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a dial of capacities, too small on one side, big enough on the other. Say the idea in your head first, then reveal the card.",
        state: { ...blank(packages, days), zones: { firstWorks: answer }, capacity: answer },
      },
    ];
  },
  View: GrokShipView,
};
