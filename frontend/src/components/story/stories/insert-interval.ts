import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokIntervalsView, type GrokIntervalItem, type GrokIntervalsState, type GrokMeeting } from "../grok-intervals-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokIntervalsState>;

/** Fresh list: the new meeting swallows three old ones, so stopping after the first overlap is wrong. */
const PRACTICE = "[[1,3],[6,9],[12,14]] + [2,13]";

const CODE = [
  "List<int[]> out = new ArrayList<>();",
  "int i = 0, n = intervals.length;",
  "int start = newInterval[0], end = newInterval[1];",
  "while (i < n && intervals[i][1] < start) out.add(intervals[i++]);",
  "while (i < n && intervals[i][0] <= end) {",
  "    start = Math.min(start, intervals[i][0]);",
  "    end = Math.max(end, intervals[i][1]);",
  "    i++;",
  "}",
  "out.add(new int[] { start, end });",
  "while (i < n) out.add(intervals[i++]);",
  "return out.toArray(new int[0][]);",
];

function parseInput(raw: string): { meetings: GrokMeeting[]; neu: GrokIntervalItem } {
  const found = [...raw.matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map((match): GrokIntervalItem => [Number(match[1]), Number(match[2])]);
  if (found.length === 0) return { meetings: [], neu: [5, 7] };
  const neu = found[found.length - 1];
  const rest = found.slice(0, -1);
  return { meetings: rest.map((span, id) => ({ id, span })), neu };
}

const show = (span: GrokIntervalItem) => `[${span[0]},${span[1]}]`;
const copy = (blocks: GrokIntervalItem[]) => blocks.map((block): GrokIntervalItem => [block[0], block[1]]);

function solve(meetings: GrokMeeting[], neu: GrokIntervalItem): GrokIntervalItem[] {
  const out: GrokIntervalItem[] = [];
  let i = 0;
  let start = neu[0];
  let end = neu[1];
  const n = meetings.length;
  while (i < n && meetings[i].span[1] < start) {
    out.push([meetings[i].span[0], meetings[i].span[1]]);
    i += 1;
  }
  while (i < n && meetings[i].span[0] <= end) {
    start = Math.min(start, meetings[i].span[0]);
    end = Math.max(end, meetings[i].span[1]);
    i += 1;
  }
  out.push([start, end]);
  while (i < n) {
    out.push([meetings[i].span[0], meetings[i].span[1]]);
    i += 1;
  }
  return out;
}

function tones(count: number, paint: (row: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, row) => paint(row) ?? "idle");
}

function blank(meetings: GrokMeeting[]): GrokIntervalsState {
  return { meetings, sorted: true, heading: "meetings, already sorted", blocksLabel: "busy blocks", tones: tones(meetings.length, () => null), blocks: [] };
}

function pictureFrames(meetings: GrokMeeting[], neu: GrokIntervalItem, answer: GrokIntervalItem[]): Frame[] {
  const n = meetings.length;
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: n === 0
        ? `The calendar is empty. We insert one new meeting ${show(neu)}.`
        : `A sorted calendar of ${n} meetings, none overlapping. We must insert ${show(neu)}, joining whatever it overlaps.`,
      state: { ...blank(meetings), band: neu, note: `new ${show(neu)}` },
    },
  ];
  const overlapRows = meetings.map((meeting, row) => ({ meeting, row })).filter(({ meeting }) => meeting.span[0] <= neu[1] && meeting.span[1] >= neu[0]);
  if (overlapRows.length > 0) {
    const joined: GrokIntervalItem = [
      Math.min(neu[0], ...overlapRows.map(({ meeting }) => meeting.span[0])),
      Math.max(neu[1], ...overlapRows.map(({ meeting }) => meeting.span[1])),
    ];
    frames.push({
      scene: "picture",
      caption:
        overlapRows.length === 1
          ? `${show(overlapRows[0].meeting.span)} overlaps the new meeting. They join into ${show(joined)}.`
          : `${overlapRows.length} meetings overlap the new one. They all join into one block, ${show(joined)}.`,
      state: { ...blank(meetings), tones: tones(n, (row) => (overlapRows.some((item) => item.row === row) ? "edge" : null)), band: neu, blocks: [joined] },
    });
  } else if (n > 0) {
    frames.push({
      scene: "picture",
      caption: `No old meeting overlaps ${show(neu)}, so it sits in a gap of its own.`,
      state: { ...blank(meetings), band: neu, blocks: [neu] },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the new sorted list of busy blocks. Here it is ${answer.map(show).join(", ")}.`,
    state: { ...blank(meetings), tones: tones(n, () => "hit"), blocks: copy(answer) },
  });
  return frames;
}

function slowFrames(meetings: GrokMeeting[], neu: GrokIntervalItem): Frame[] {
  const all: GrokMeeting[] = [...meetings, { id: meetings.length, span: neu }];
  const sorted = [...all].sort((a, b) => a.span[0] - b.span[0] || a.id - b.id);
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: append the new meeting and sort the whole list, even though it was already sorted.`,
      state: { ...blank(sorted), heading: "meetings plus the new one, then sorted", counter: { label: "sorts", value: 1 } },
    },
  ];
  const blocks: GrokIntervalItem[] = [];
  let checks = 0;
  sorted.forEach(({ span }, row) => {
    const last = blocks.at(-1);
    checks += 1;
    if (!last || span[0] > last[1]) blocks.push([span[0], span[1]]);
    else last[1] = Math.max(last[1], span[1]);
    if (row < 2 || (last && span[0] <= last[1] && row < 4)) {
      frames.push({
        scene: "slow",
        caption: `Sweep ${show(span)} against the latest block, the usual merge. That extra sort was wasted work.`,
        state: { ...blank(sorted), heading: "meetings plus the new one, then sorted", tones: tones(sorted.length, (index) => (index === row ? "edge" : index < row ? "hit" : null)), blocks: copy(blocks), counter: { label: "looks", value: checks } },
      });
    }
  });
  frames.push({
    scene: "slow",
    caption: `Sorting n + 1 meetings is O(n log n) time. The list was already sorted, so we can do this in one walk.`,
    state: { ...blank(sorted), heading: "meetings plus the new one, then sorted", blocks: copy(blocks), tones: tones(sorted.length, () => "faded"), counter: { label: "looks", value: checks } },
  });
  return frames;
}

function insightFrames(meetings: GrokMeeting[], neu: GrokIntervalItem): Frame[] {
  const n = meetings.length;
  const firstOverlap = meetings.findIndex((meeting) => meeting.span[1] >= neu[0] && meeting.span[0] <= neu[1]);
  const firstAfter = meetings.findIndex((meeting) => meeting.span[0] > neu[1]);
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: `The list is already sorted. Copy every meeting that ends before the new start ${neu[0]}. Those sit wholly on the left.`,
      state: { ...blank(meetings), band: neu, endLine: neu[0] },
    },
  ];
  if (firstOverlap >= 0) {
    frames.push({
      scene: "insight",
      caption: `${show(meetings[firstOverlap].span)} is the first overlap. Stretch the new block over every meeting that still starts at or before its end.`,
      state: { ...blank(meetings), tones: tones(n, (row) => (row === firstOverlap ? "edge" : row < firstOverlap ? "done" : null)), band: neu, endLine: neu[1] },
    });
  }
  if (firstAfter >= 0) {
    frames.push({
      scene: "insight",
      caption: `${show(meetings[firstAfter].span)} starts after the new block. Stop merging, copy the rest.`,
      state: { ...blank(meetings), tones: tones(n, (row) => (row === firstAfter ? "window" : row < firstAfter ? "hit" : null)), band: neu },
    });
  } else {
    frames.push({
      scene: "insight",
      caption: "Keep stretching while the next meeting still overlaps the new end. One new block can swallow several old ones.",
      state: { ...blank(meetings), band: neu },
    });
  }
  return frames;
}

function actionQuiz(kind: "left" | "merge" | "right"): StoryQuiz {
  const answer = kind === "left" ? 0 : kind === "merge" ? 1 : 2;
  return {
    kind: "choice",
    question: "What happens to this meeting: copy it as-is, merge it into the new block, or copy it after?",
    options: ["Copy it as-is, on the left", "Merge it into the new block", "Copy it after, on the right"],
    answer,
    why:
      kind === "left"
        ? "It ends strictly before the new start, so it sits wholly on the left."
        : kind === "merge"
          ? "It still starts at or before the new end, so the new block must swallow it."
          : "It starts after the new end, so the merge is over and it sits on the right.",
  };
}

function solutionFrames(meetings: GrokMeeting[], neu: GrokIntervalItem, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = meetings.length;
  const out: GrokIntervalItem[] = [];
  let i = 0;
  let start = neu[0];
  let end = neu[1];
  const asked = { left: false, merge: false, right: false };
  let shownTrap = false;

  frames.push({
    scene,
    caption: practice
      ? `Your turn. Insert ${show(neu)} into this calendar. You decide copy, merge, or copy after.`
      : `The new meeting is ${show(neu)}. The list is already sorted. Start is ${start}, end is ${end}.`,
    codeLine: line(2),
    state: { ...blank(meetings), band: [start, end], note: `new ${show([start, end])}` },
  });

  while (i < n && meetings[i].span[1] < start) {
    const look: Frame = {
      scene,
      caption: `${show(meetings[i].span)} ends at ${meetings[i].span[1]}, before the new start ${start}.`,
      codeLine: line(3),
      state: { ...blank(meetings), tones: tones(n, (row) => (row === i ? "edge" : row < i ? "done" : null)), blocks: copy(out), band: [start, end], endLine: start },
    };
    if (practice || !asked.left) {
      asked.left = true;
      look.quiz = actionQuiz("left");
    }
    frames.push(look);
    out.push([meetings[i].span[0], meetings[i].span[1]]);
    frames.push({
      scene,
      caption: `Copy it as-is. It sits wholly on the left of the new meeting.`,
      codeLine: line(3),
      state: { ...blank(meetings), tones: tones(n, (row) => (row === i ? "done" : row < i ? "hit" : null)), blocks: copy(out), band: [start, end] },
    });
    i += 1;
  }

  let merged = 0;
  while (i < n && meetings[i].span[0] <= end) {
    const look: Frame = {
      scene,
      caption: `${show(meetings[i].span)} starts at ${meetings[i].span[0]}. The new block currently ends at ${end}.`,
      codeLine: line(4),
      state: { ...blank(meetings), tones: tones(n, (row) => (row === i ? "edge" : row < i ? "hit" : null)), blocks: copy(out), band: [start, end], endLine: end },
    };
    if (practice || !asked.merge) {
      asked.merge = true;
      look.quiz = actionQuiz("merge");
    }
    frames.push(look);

    if (merged >= 1 && !shownTrap && !practice) {
      shownTrap = true;
      frames.push({
        scene,
        caption: `The Early Stop Trap: stopping after the first overlap would leave ${show(meetings[i].span)} sitting on top of ${show([start, end])}. Keep stretching.`,
        codeLine: line(4),
        state: { ...blank(meetings), tones: tones(n, (row) => (row === i ? "miss" : null)), blocks: copy([...out, [start, end]]), band: [start, end], note: "✕ merge is not done" },
      });
    }

    start = Math.min(start, meetings[i].span[0]);
    end = Math.max(end, meetings[i].span[1]);
    merged += 1;
    frames.push({
      scene,
      caption: `It overlaps, so the new block stretches to ${show([start, end])}.`,
      codeLine: line(6),
      state: { ...blank(meetings), tones: tones(n, (row) => (row === i ? "hit" : row < i ? "done" : null)), blocks: copy(out), band: [start, end], endLine: end },
    });
    i += 1;
  }

  out.push([start, end]);
  frames.push({
    scene,
    caption: `Push the merged block ${show([start, end])}.`,
    codeLine: line(9),
    state: { ...blank(meetings), tones: tones(n, (row) => (row < i ? "hit" : null)), blocks: copy(out), band: [start, end] },
  });

  while (i < n) {
    const look: Frame = {
      scene,
      caption: `${show(meetings[i].span)} starts after the new end ${end}.`,
      codeLine: line(10),
      state: { ...blank(meetings), tones: tones(n, (row) => (row === i ? "edge" : row < i ? "hit" : null)), blocks: copy(out), endLine: end },
    };
    if (practice || !asked.right) {
      asked.right = true;
      look.quiz = actionQuiz("right");
    }
    frames.push(look);
    out.push([meetings[i].span[0], meetings[i].span[1]]);
    frames.push({
      scene,
      caption: `Copy it after the new block.`,
      codeLine: line(10),
      state: { ...blank(meetings), tones: tones(n, (row) => (row === i ? "done" : row < i ? "hit" : null)), blocks: copy(out) },
    });
    i += 1;
  }

  const result = JSON.stringify(out);
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${result}. You chose every copy and every merge.` : `The walk is finished. The answer is ${result}.`,
    codeLine: line(11),
    state: { ...blank(meetings), tones: tones(n, () => "hit"), blocks: copy(out) },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each old meeting is looked at once. No sort.`,
      codeLine: 3,
      state: { ...blank(meetings), blocks: copy(out), counter: { label: "meetings", value: n } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). The answer list holds the old ranges plus the merged one.`,
      codeLine: 0,
      state: { ...blank(meetings), blocks: copy(out), tones: tones(n, () => "faded") },
    });
  }
  return frames;
}

export const insertIntervalStory: ProblemStory<GrokIntervalsState> = {
  slugs: ["lc-57"],
  pattern: "Sweep a sorted interval list",
  trigger: "a sorted, non-overlapping list of ranges, and you must insert one more range, merging if it overlaps",
  insight: "Copy every meeting that ends before the new one starts, merge every meeting that overlaps it, then copy the rest. Keep stretching while the next start is still at or before the new end.",
  metaphor: {
    name: "The calendar insert",
    legend: "meeting = one old interval · new block = start,end · left copy / merge / right copy",
    terms: ["meeting", "block", "merge"],
  },
  traps: [
    {
      name: "The Early Stop Trap",
      rule: "Do not stop merging after the first overlap. Keep stretching while the next meeting still starts at or before the new end. One insert can swallow several old meetings.",
    },
  ],
  template: [
    "copy meetings that end before the new start;",
    "while the next meeting starts at or before the new end: stretch start and end;",
    "push the merged block;",
    "copy the rest;",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each old meeting is looked at once; no sort",
    space: "O(n)",
    spaceWhy: "the answer list holds the old ranges plus the merged one",
  },
  code: CODE,
  examples: [
    { label: "[[1,3],[6,9]] + [2,5]", input: "[[1,3],[6,9]] + [2,5]", expected: "[[1,5],[6,9]]" },
    { label: "[[1,2],[3,5],[6,7],[8,10],[12,16]] + [4,8]", input: "[[1,2],[3,5],[6,7],[8,10],[12,16]] + [4,8]", expected: "[[1,2],[3,10],[12,16]]", note: "One insert swallows three" },
    { label: "[[1,5]] + [6,8]", input: "[[1,5]] + [6,8]", expected: "[[1,5],[6,8]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-56", title: "Merge Intervals" },
    { slug: "lc-435", title: "Non-overlapping Intervals" },
    { slug: "lc-253", title: "Meeting Rooms II" },
  ],
  answer: (input) => {
    const { meetings, neu } = parseInput(input);
    return JSON.stringify(solve(meetings, neu));
  },
  frames: (input) => {
    const { meetings, neu } = parseInput(input);
    const answer = solve(meetings, neu);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(meetings, neu, answer),
      ...slowFrames(meetings, neu),
      ...insightFrames(meetings, neu),
      ...solutionFrames(meetings, neu),
      ...solutionFrames(practice.meetings, practice.neu, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: copy left, merge the run, copy right. Say the idea, then reveal the card.",
        state: { ...blank(meetings), blocks: copy(answer), tones: tones(meetings.length, () => "hit") },
      },
    ];
  },
  View: GrokIntervalsView,
};
