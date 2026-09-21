import { GrokVersionView, type VersionLineState } from "../grok-version-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type LineFrame = StoryFrame<VersionLineState>;

/** Fresh line. Version 5 is the first crack, so the first middle is still good. */
const PRACTICE = "n=7, bad=5";
const FALLBACK = { n: 5, bad: 4 };

const CODE = [
  "int low = 1, high = n;",
  "while (low < high) {",
  "    int mid = low + (high - low) / 2;",
  "    if (isBadVersion(mid)) high = mid;",
  "    else low = mid + 1;",
  "}",
  "return low;",
];

function parseInput(raw: string): { n: number; bad: number } {
  const n = Number(raw.match(/n\s*=\s*(\d+)/)?.[1] ?? "");
  const bad = Number(raw.match(/bad\s*=\s*(\d+)/)?.[1] ?? "");
  if (!n || !bad) return FALLBACK;
  return { n: Math.max(1, n), bad: Math.min(Math.max(1, bad), Math.max(1, n)) };
}

const middle = (low: number, high: number) => low + Math.floor((high - low) / 2);

type Step = {
  low: number;
  mid: number;
  high: number;
  isBad: boolean;
  nextLow: number;
  nextHigh: number;
};

function isBadVersion(version: number, bad: number): boolean {
  return version >= bad;
}

function solve(n: number, bad: number): { answer: number; steps: Step[] } {
  const steps: Step[] = [];
  let low = 1;
  let high = n;
  while (low < high) {
    const mid = middle(low, high);
    const cracked = isBadVersion(mid, bad);
    const step: Step = { low, mid, high, isBad: cracked, nextLow: low, nextHigh: high };
    if (cracked) high = mid;
    else low = mid + 1;
    step.nextLow = low;
    step.nextHigh = high;
    steps.push(step);
  }
  return { answer: low, steps };
}

function blank(n: number, bad: number | null = null): VersionLineState {
  return { n, bad, low: null, high: null, mid: null, checked: [] };
}

function pictureFrames(n: number, bad: number): LineFrame[] {
  return [
    { scene: "picture", caption: `A line of ${n} versions, numbered 1 to ${n}. Each one is either good or bad.`, state: blank(n) },
    {
      scene: "picture",
      caption: `Once a version is bad, every later one is bad too. The first crack is version ${bad}. Everything after it stays cracked.`,
      state: { ...blank(n, bad), checked: Array.from({ length: n }, (_, index) => ({ version: index + 1, isBad: index + 1 >= bad })) },
    },
    {
      scene: "picture",
      caption: "You may ask of any version: is this one bad? Each ask costs. The goal: find the first crack with as few asks as you can.",
      state: blank(n),
    },
  ];
}

function slowFrames(n: number, bad: number): LineFrame[] {
  const frames: LineFrame[] = [];
  const checked: { version: number; isBad: boolean }[] = [];
  for (let version = 1; version <= bad; version++) {
    const cracked = version >= bad;
    checked.push({ version, isBad: cracked });
    if (version > 2 && version < bad) continue;
    const skipped = version === bad && bad > 3;
    let caption: string;
    if (cracked) caption = `${skipped ? "And so on, one version at a time. " : ""}Version ${version} is bad. The slow way needed ${version} ${version === 1 ? "ask" : "asks"}.`;
    else if (version === 1) caption = `The slow way: ask version 1, then 2, then 3. Version 1 is good.`;
    else caption = `Version ${version} is still good.`;
    frames.push({
      scene: "slow",
      caption,
      state: { n, bad: null, low: null, high: null, mid: version, checked: checked.map((item) => ({ ...item })), counter: { label: "asks", value: version } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `A line can hold two billion versions. Walking from 1 can mean two billion asks. That is O(n) time.`,
    state: { n, bad, low: null, high: null, mid: null, checked: checked.map((item) => ({ ...item })), counter: { label: "asks", value: bad } },
  });
  return frames;
}

function insightFrames(n: number, bad: number): LineFrame[] {
  const mid = middle(1, n);
  const cracked = isBadVersion(mid, bad);
  return [
    {
      scene: "insight",
      caption: "The line is one stretch of good, then one stretch of bad. We want the first crack: the left edge of the bad stretch.",
      state: { n, bad, low: 1, high: n, mid: null, checked: [] },
    },
    {
      scene: "insight",
      caption: cracked
        ? `Ask the middle version ${mid}. It is bad, so the first crack is at ${mid} or to its left. The right end jumps onto the needle.`
        : `Ask the middle version ${mid}. It is good, so the first crack is strictly to its right. The left end jumps just past the needle.`,
      state: { n, bad: null, low: 1, high: n, mid, checked: [{ version: mid, isBad: cracked }] },
    },
    {
      scene: "insight",
      caption: `The Overflow Trap: adding the two ends of a huge line can wrap to a negative place. Step half the gap from the left end instead.`,
      state: { n, bad: null, low: 1, high: n, mid, overflow: true, checked: [] },
    },
  ];
}

function jumpQuiz(n: number, step: Step): StoryQuiz {
  const land = step.isBad ? step.mid : step.mid + 1;
  const feedback: Record<number, string> = {};
  for (let version = 1; version <= n; version++) {
    if (version === land) continue;
    if (version < step.low || version > step.high) feedback[version - 1] = "That part of the line was already thrown away.";
    else if (step.isBad && version > step.mid) feedback[version - 1] = "The needle is already bad, so the first crack cannot sit to its right.";
    else if (step.isBad) feedback[version - 1] = "The needle itself might be the first crack. Jumping past it would throw it away.";
    else if (version === step.mid) feedback[version - 1] = "The needle is good, so it cannot be the first crack. It must go.";
    else if (version < step.mid) feedback[version - 1] = "Everything left of a good version is good too.";
  }
  return {
    kind: "cell",
    cells: n,
    question: "One end of the line must jump. Click the version it lands on.",
    answer: land - 1,
    feedback,
    otherwise: "Throw away only the versions you are sure about, and keep the first crack in range.",
    why: step.isBad
      ? "The needle is bad, so it might be the first crack. The right end jumps onto it."
      : "The needle is good, so the first crack is to its right. The left end lands one step past it.",
  };
}

function solutionFrames(n: number, bad: number, scene: SceneId = "solution", practice = false): LineFrame[] {
  const { answer, steps } = solve(n, bad);
  const frames: LineFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const checked: { version: number; isBad: boolean }[] = [];
  let asked = false;
  let shownTrap = false;
  let asks = 0;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new line of ${n} versions. You ask, and you move the ends.`
      : `The left end starts at version 1. The right end starts at version ${n}. The first crack sits somewhere on this line.`,
    codeLine: line(0),
    state: { n, bad: null, low: 1, high: n, mid: null, checked: [] },
  });

  for (const step of steps) {
    const { low, mid, high, isBad } = step;
    asks += 1;
    frames.push({
      scene,
      caption: shownTrap || practice
        ? `The needle points at version ${mid}.`
        : `The needle points at version ${mid}. The Overflow Trap: we step half the gap from the left end, so the needle cannot wrap.`,
      codeLine: line(2),
      state: { n, bad: null, low, high, mid, overflow: !shownTrap && !practice, checked: checked.map((item) => ({ ...item })) },
    });
    shownTrap = true;

    checked.push({ version: mid, isBad });
    const verdict: LineFrame = {
      scene,
      caption: isBad ? `Version ${mid} is bad. The first crack is at the needle or to its left.` : `Version ${mid} is good. The first crack is strictly to the right of the needle.`,
      codeLine: line(3),
      state: { n, bad: null, low, high, mid, checked: checked.map((item) => ({ ...item })) },
    };
    if (practice || !asked) {
      asked = true;
      verdict.quiz = jumpQuiz(n, step);
    }
    frames.push(verdict);

    frames.push({
      scene,
      caption: isBad
        ? `The right end jumps onto the needle. Everything to the right was later, so it can go.`
        : `The left end jumps just past the needle. The needle and everything to its left were good.`,
      codeLine: line(isBad ? 3 : 4),
      state: { n, bad: null, low: step.nextLow, high: step.nextHigh, mid: null, checked: checked.map((item) => ({ ...item })) },
    });
  }

  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}The two ends meet at version ${answer}. The answer is ${answer}.`,
    codeLine: line(6),
    state: { n, bad: answer, low: answer, high: answer, mid: answer, checked: checked.map((item) => ({ ...item })), counter: { label: "asks", value: asks } },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log n). Each ask throws away half of the remaining versions: ${asks} ${asks === 1 ? "ask" : "asks"} for ${n} versions.`,
      codeLine: 2,
      state: { n, bad: answer, low: answer, high: answer, mid: answer, checked: checked.map((item) => ({ ...item })), counter: { label: "asks", value: asks } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two ends of the line and the needle are stored.",
      codeLine: 0,
      state: { n, bad: answer, low: 1, high: n, mid: answer, checked: [] },
    });
  }
  return frames;
}

export const firstBadVersionStory: ProblemStory<VersionLineState> = {
  slugs: ["lc-278"],
  pattern: "Binary search on a yes/no prefix",
  trigger: "versions go from good to bad and stay bad, and you must find the first bad one with as few checks as possible",
  insight: "The versions are a row of good, then bad. If the middle is bad, the first crack is at the needle or left. If it is good, the first crack is strictly right of the needle.",
  metaphor: {
    name: "The version line",
    legend: "left end = low · right end = high · needle = mid · bad stretch = every version from the first crack onward",
    terms: ["line", "needle", "good", "bad"],
  },
  traps: [
    {
      name: "The Overflow Trap",
      rule: "Use mid = low + (high - low) / 2. Adding the two ends can wrap when n is near two billion.",
    },
  ],
  template: [
    "low = 1; high = n;",
    "while (low < high) {",
    "    mid = left end plus half the gap;",
    "    if (mid is bad) high = mid; else low = mid + 1;",
    "}",
    "return low;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(log n)",
    timeWhy: "each check throws away half of the remaining versions",
    space: "O(1)",
    spaceWhy: "only the two search ends",
  },
  code: CODE,
  examples: [
    { label: "n=5, bad=4", input: "n=5, bad=4", expected: "4" },
    { label: "n=5, bad=1", input: "n=5, bad=1", expected: "1", note: "Version 1 is already bad" },
    { label: "n=1, bad=1", input: "n=1, bad=1", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-704", title: "Binary Search" },
    { slug: "lc-34", title: "Find First and Last Position of Element in Sorted Array" },
    { slug: "lc-875", title: "Koko Eating Bananas" },
  ],
  answer: (input) => String(parseInput(input).bad),
  frames: (input) => {
    const { n, bad } = parseInput(input);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(n, bad),
      ...slowFrames(n, bad),
      ...insightFrames(n, bad),
      ...solutionFrames(n, bad),
      ...solutionFrames(practice.n, practice.bad, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a line of good, then a first crack, then all bad. Say the idea in your head first, then reveal the card.",
        state: { n, bad, low: bad, high: bad, mid: bad, checked: Array.from({ length: n }, (_, index) => ({ version: index + 1, isBad: index + 1 >= bad })) },
      },
    ];
  },
  View: GrokVersionView,
};
