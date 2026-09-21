import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokIntervalsView, type GrokIntervalItem, type GrokIntervalsState, type GrokMeeting } from "../grok-intervals-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokIntervalsState>;

/** Fresh calendar: a long early meeting blocks three short ones if we keep it first. */
const PRACTICE = "[[1,10],[2,3],[3,4],[4,5]]";

const CODE = [
  "Arrays.sort(intervals, Comparator.comparingInt(a -> a[1]));",
  "int kept = 0;",
  "int lastEnd = Integer.MIN_VALUE;",
  "for (int[] interval : intervals) {",
  "    if (interval[0] >= lastEnd) {",
  "        kept++;",
  "        lastEnd = interval[1];",
  "    }",
  "}",
  "return intervals.length - kept;",
];

function parseInput(raw: string): GrokMeeting[] {
  const found = [...raw.matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map((match): GrokIntervalItem => [Number(match[1]), Number(match[2])]).filter(([start, end]) => start <= end);
  const list = found.length > 0 ? found : ([[1, 2], [2, 3]] as GrokIntervalItem[]);
  return list.map((span, id) => ({ id, span }));
}

const show = (span: GrokIntervalItem) => `[${span[0]},${span[1]}]`;
const copy = (blocks: GrokIntervalItem[]) => blocks.map((block): GrokIntervalItem => [block[0], block[1]]);
const byEnd = (meetings: GrokMeeting[]) => [...meetings].sort((a, b) => a.span[1] - b.span[1] || a.span[0] - b.span[0] || a.id - b.id);
const byStart = (meetings: GrokMeeting[]) => [...meetings].sort((a, b) => a.span[0] - b.span[0] || a.span[1] - b.span[1] || a.id - b.id);

function overlap(a: GrokIntervalItem, b: GrokIntervalItem): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

function solve(meetings: GrokMeeting[]): { kept: GrokIntervalItem[]; removed: number } {
  const sorted = byEnd(meetings);
  const kept: GrokIntervalItem[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;
  for (const { span } of sorted) {
    if (span[0] >= lastEnd) {
      kept.push([span[0], span[1]]);
      lastEnd = span[1];
    }
  }
  return { kept, removed: meetings.length - kept.length };
}

function tones(count: number, paint: (row: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, row) => paint(row) ?? "idle");
}

function blank(meetings: GrokMeeting[], heading: string): GrokIntervalsState {
  return { meetings, sorted: heading.includes("sorted"), heading, blocksLabel: "kept", tones: tones(meetings.length, () => null), blocks: [] };
}

function pictureFrames(meetings: GrokMeeting[], answer: ReturnType<typeof solve>): Frame[] {
  const n = meetings.length;
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A calendar with ${n} meetings. Two meetings overlap when one starts before the other ends. Touching at an end is fine.`,
      state: blank(meetings, "meetings, as given"),
    },
  ];
  let clash: [number, number] | null = null;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (overlap(meetings[i].span, meetings[j].span)) {
        clash = [i, j];
        break;
      }
    }
    if (clash) break;
  }
  if (clash) {
    const [a, b] = clash;
    const shared: GrokIntervalItem = [Math.max(meetings[a].span[0], meetings[b].span[0]), Math.min(meetings[a].span[1], meetings[b].span[1])];
    frames.push({
      scene: "picture",
      caption: `${show(meetings[a].span)} and ${show(meetings[b].span)} overlap. At least one of them must go.`,
      state: { ...blank(meetings, "meetings, as given"), tones: tones(n, (row) => (row === a || row === b ? "miss" : null)), band: shared },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: remove as few meetings as we can. Here we remove ${answer.removed}, and keep ${answer.kept.map(show).join(", ") || "none"}.`,
    state: { ...blank(meetings, "meetings, as given"), tones: tones(n, () => "hit"), blocks: copy(answer.kept) },
  });
  return frames;
}

function slowFrames(meetings: GrokMeeting[]): Frame[] {
  const n = meetings.length;
  const sorted = byStart(meetings);
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: "The slow-looking way: sort by start, then keep the first meeting that fits. That feels natural, and it is wrong.",
      state: blank(sorted, "meetings, sorted by start"),
    },
  ];
  const kept: GrokIntervalItem[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;
  let checks = 0;
  sorted.forEach(({ span }, row) => {
    checks += 1;
    const fits = span[0] >= lastEnd;
    if (fits) {
      kept.push([span[0], span[1]]);
      lastEnd = span[1];
    }
    if (row < 3) {
      frames.push({
        scene: "slow",
        caption: fits
          ? `${show(span)} starts at or after ${lastEnd === span[1] ? "the free line" : lastEnd}. Keep it. Last end becomes ${span[1]}.`
          : `${show(span)} starts before the last end ${lastEnd}. Skip it.`,
        state: {
          ...blank(sorted, "meetings, sorted by start"),
          tones: tones(n, (index) => (index === row ? (fits ? "edge" : "miss") : index < row ? "hit" : null)),
          blocks: copy(kept),
          endLine: Number.isFinite(lastEnd) && lastEnd !== Number.NEGATIVE_INFINITY ? lastEnd : null,
          counter: { label: "looks", value: checks },
        },
      });
    }
  });
  const removed = n - kept.length;
  const right = solve(meetings).removed;
  frames.push({
    scene: "slow",
    caption:
      removed === right
        ? `This calendar happens to survive. Sorting by start still kept ${kept.length} and removed ${removed}. A long early meeting can do worse.`
        : `Kept ${kept.length}, so we would remove ${removed}. The best answer removes only ${right}. A long early meeting blocked shorter ones.`,
    state: { ...blank(sorted, "meetings, sorted by start"), blocks: copy(kept), counter: { label: "looks", value: checks } },
  });
  frames.push({
    scene: "slow",
    caption: "Trying every subset is O(n²) or worse. We want one sort, then one walk.",
    state: { ...blank(meetings, "meetings, as given"), tones: tones(n, () => "faded"), counter: { label: "looks", value: checks } },
  });
  return frames;
}

function insightFrames(meetings: GrokMeeting[]): Frame[] {
  const sorted = byEnd(meetings);
  const n = sorted.length;
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "The idea: the meeting that ends first leaves the most free time for whatever comes next. Sort by end.",
      state: blank(sorted, "meetings, sorted by end"),
    },
  ];
  const first = sorted[0];
  frames.push({
    scene: "insight",
    caption: `${show(first.span)} ends first, so keep it. The dashed line is its end. Later meetings only have to clear that line.`,
    state: { ...blank(sorted, "meetings, sorted by end"), tones: tones(n, (row) => (row === 0 ? "done" : null)), blocks: [[first.span[0], first.span[1]]], endLine: first.span[1] },
  });
  const long = meetings.reduce((best, meeting) => (meeting.span[1] - meeting.span[0] > best.span[1] - best.span[0] ? meeting : best), meetings[0]);
  const longRow = sorted.findIndex((meeting) => meeting.id === long.id);
  if (longRow > 0) {
    frames.push({
      scene: "insight",
      caption: `The Long Meeting Trap: ${show(long.span)} is long. Sorting by start would keep it first and block the short ones.`,
      state: { ...blank(sorted, "meetings, sorted by end"), tones: tones(n, (row) => (row === longRow ? "miss" : row === 0 ? "done" : null)), blocks: [[first.span[0], first.span[1]]], endLine: first.span[1], note: "✕ do not keep the long one first" },
    });
  }
  return frames;
}

function keepQuiz(fits: boolean): StoryQuiz {
  return {
    kind: "choice",
    question: "Does this meeting start at or after the last end we kept, or does it overlap?",
    options: ["It fits: keep it", "It overlaps: skip it"],
    answer: fits ? 0 : 1,
    why: fits ? "It starts at or after the last end, so it can sit on the calendar. Touching at the end is allowed." : "It starts before the last end, so it overlaps a meeting we already kept.",
  };
}

function solutionFrames(meetings: GrokMeeting[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const sorted = byEnd(meetings);
  const n = sorted.length;
  const given = byStart(meetings);
  const long = meetings.reduce((best, meeting) => (meeting.span[1] - meeting.span[0] > best.span[1] - best.span[0] ? meeting : best), meetings[0]);
  const startFirst = given[0];
  let asked = false;
  let shownTrap = false;
  const kept: GrokIntervalItem[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;

  const open: Frame = {
    scene,
    caption: practice ? "Your turn, on a new calendar. You decide which meetings to keep." : "The meetings arrive in no special order.",
    codeLine: line(1),
    state: blank(meetings, "meetings, as given"),
  };
  if (practice && startFirst.span[1] !== byEnd(meetings)[0].span[1]) {
    const endFirstId = byEnd(meetings)[0].id;
    const answerRow = meetings.findIndex((meeting) => meeting.id === endFirstId);
    const feedback: Record<number, string> = {};
    meetings.forEach((meeting, row) => {
      if (row === answerRow) return;
      feedback[row] = `${show(meeting.span)} ends at ${meeting.span[1]}. Another meeting ends sooner.`;
    });
    open.quiz = {
      kind: "cell",
      cells: n,
      question: "We sort by end, not by start. Which meeting should sit on top after the sort? Click it.",
      answer: answerRow,
      feedback,
      otherwise: "Look for the meeting that finishes first.",
      why: "The meeting that ends first leaves the most free time, so it belongs at the top.",
    };
  }
  frames.push(open);
  frames.push({
    scene,
    caption: "Sort by end time, earliest end on top.",
    codeLine: line(0),
    state: blank(sorted, "meetings, sorted by end"),
  });

  if (!practice && byEnd(meetings)[0].id !== long.id && !shownTrap) {
    shownTrap = true;
    const longRow = sorted.findIndex((meeting) => meeting.id === long.id);
    frames.push({
      scene,
      caption: `The Long Meeting Trap: sorting by start would put ${show(long.span)} first and skip the short ones. We sorted by end, so the short ones get the first look.`,
      codeLine: line(0),
      state: { ...blank(sorted, "meetings, sorted by end"), tones: tones(n, (row) => (row === longRow ? "miss" : null)), note: "✕ not the long early meeting" },
    });
  }

  sorted.forEach(({ span }, row) => {
    const fits = span[0] >= lastEnd;
    const look: Frame = {
      scene,
      caption: `Next meeting: ${show(span)}. The last end we kept is ${Number.isFinite(lastEnd) && lastEnd !== Number.NEGATIVE_INFINITY ? lastEnd : "none"}.`,
      codeLine: line(4),
      state: {
        ...blank(sorted, "meetings, sorted by end"),
        tones: tones(n, (index) => (index === row ? "edge" : index < row ? (kept.some((block) => block[0] === sorted[index].span[0] && block[1] === sorted[index].span[1]) ? "done" : "faded") : null)),
        blocks: copy(kept),
        endLine: Number.isFinite(lastEnd) && lastEnd !== Number.NEGATIVE_INFINITY ? lastEnd : null,
      },
    };
    if (practice || !asked) {
      asked = true;
      look.quiz = keepQuiz(fits);
    }
    frames.push(look);
    if (fits) {
      kept.push([span[0], span[1]]);
      lastEnd = span[1];
      frames.push({
        scene,
        caption: `${show(span)} starts at or after the last end, so we keep it. Last end is now ${span[1]}.`,
        codeLine: line(6),
        state: { ...blank(sorted, "meetings, sorted by end"), tones: tones(n, (index) => (index === row ? "done" : index < row ? "hit" : null)), blocks: copy(kept), endLine: lastEnd },
      });
    } else {
      frames.push({
        scene,
        caption: `${show(span)} starts before ${lastEnd}, so it overlaps a kept meeting. Skip it.`,
        codeLine: line(4),
        state: { ...blank(sorted, "meetings, sorted by end"), tones: tones(n, (index) => (index === row ? "miss" : index < row ? "hit" : null)), blocks: copy(kept), endLine: lastEnd },
      });
    }
  });

  const removed = n - kept.length;
  frames.push({
    scene,
    caption: practice ? `Done. We kept ${kept.length}, so we remove ${removed}. The answer is ${removed}.` : `We kept ${kept.length} of ${n}. The answer is ${removed}.`,
    codeLine: line(9),
    state: { ...blank(sorted, "meetings, sorted by end"), tones: tones(n, () => "hit"), blocks: copy(kept) },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log n). Sorting by end is the costly part. After that each meeting is looked at once.`,
      codeLine: 0,
      state: { ...blank(sorted, "meetings, sorted by end"), blocks: copy(kept), counter: { label: "meetings", value: n } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Sorting is on the same list. We only store how many we kept and the last end.",
      codeLine: 1,
      state: { ...blank(sorted, "meetings, sorted by end"), blocks: copy(kept), tones: tones(n, () => "faded") },
    });
  }
  return frames;
}

export const nonOverlappingIntervalsStory: ProblemStory<GrokIntervalsState> = {
  slugs: ["lc-435"],
  pattern: "Greedy: earliest end",
  trigger: "a list of intervals, and you must remove as few as you can so the rest do not overlap",
  insight: "Sort by end time. Keep a meeting when it starts at or after the last end you kept. The earliest end leaves the most room, so the number removed is n minus kept.",
  metaphor: {
    name: "The earliest end",
    legend: "meeting = one interval · last end = lastEnd · keep = interval[0] >= lastEnd",
    terms: ["meeting", "end", "keep"],
  },
  traps: [
    {
      name: "The Long Meeting Trap",
      rule: "Sorting by start and keeping the first meeting can keep a long early one that blocks two short ones. Sort by end so the meeting that frees the line first is kept.",
    },
  ],
  template: [
    "sort by end;",
    "kept = 0; lastEnd = very small;",
    "for each meeting:",
    "    if it starts at or after lastEnd: keep it, lastEnd = its end;",
    "return n - kept;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n log n)",
    timeWhy: "sorting by end dominates; the walk is one pass",
    space: "O(1)",
    spaceWhy: "only kept and lastEnd; sorting is on the same list",
  },
  code: CODE,
  examples: [
    { label: "[[1,2],[2,3],[3,4],[1,3]]", input: "[[1,2],[2,3],[3,4],[1,3]]", expected: "1" },
    { label: "[[1,100],[1,2],[2,3]]", input: "[[1,100],[1,2],[2,3]]", expected: "1", note: "The long meeting must go" },
    { label: "[[1,2],[1,2],[1,2]]", input: "[[1,2],[1,2],[1,2]]", expected: "2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-56", title: "Merge Intervals" },
    { slug: "lc-57", title: "Insert Interval" },
    { slug: "lc-253", title: "Meeting Rooms II" },
  ],
  answer: (input) => String(solve(parseInput(input)).removed),
  frames: (input) => {
    const meetings = parseInput(input);
    const answer = solve(meetings);
    return [
      ...pictureFrames(meetings, answer),
      ...slowFrames(meetings),
      ...insightFrames(meetings),
      ...solutionFrames(meetings),
      ...solutionFrames(parseInput(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: sort by end, keep what fits. Say the idea, then reveal the card.",
        state: { ...blank(byEnd(meetings), "meetings, sorted by end"), blocks: copy(answer.kept), tones: tones(meetings.length, () => "hit") },
      },
    ];
  },
  View: GrokIntervalsView,
};
