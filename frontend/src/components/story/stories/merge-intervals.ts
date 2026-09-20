import type { CellTone } from "@/components/learn/viz/primitives";

import { IntervalsView, type IntervalItem, type IntervalsState, type Meeting } from "../intervals-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type CalendarFrame = StoryFrame<IntervalsState>;

/** Fresh calendar for the "your turn" run: unsorted, with a meeting inside another, a touch, and a gap. */
const PRACTICE = "[[6,9],[1,6],[11,13],[2,4]]";
const FALLBACK: IntervalItem[] = [[8, 10], [1, 3], [15, 18], [2, 6]];

const CODE = [
  "Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));",
  "List<int[]> merged = new ArrayList<>();",
  "for (int[] cur : intervals) {",
  "    int[] last = merged.isEmpty() ? null : merged.get(merged.size() - 1);",
  "    if (last != null && cur[0] <= last[1]) {",
  "        last[1] = Math.max(last[1], cur[1]);",
  "    } else {",
  "        merged.add(cur);",
  "    }",
  "}",
  "return merged.toArray(new int[0][]);",
];

function parseInput(raw: string): Meeting[] {
  const found = [...raw.matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map((match): IntervalItem => [Number(match[1]), Number(match[2])]).filter(([start, end]) => start <= end);
  return (found.length > 0 ? found : FALLBACK).map((span, id) => ({ id, span }));
}

const show = (span: IntervalItem) => `[${span[0]},${span[1]}]`;
const copy = (blocks: IntervalItem[]) => blocks.map((block): IntervalItem => [block[0], block[1]]);
/** Stable, so meetings with the same start keep their given order. */
const byStart = (meetings: Meeting[]) => [...meetings].sort((a, b) => a.span[0] - b.span[0] || a.id - b.id);

type Step = {
  /** Row of this meeting in the sorted list. */
  row: number;
  cur: IntervalItem;
  /** The latest busy block, before this meeting is placed. */
  block: IntervalItem;
  overlaps: boolean;
  /** Overlap only: does the block's end move? */
  grows: boolean;
  /** Overlap only: the sorted row whose end the block ends on afterwards, or null when two rows share that end. */
  endRow: number | null;
  before: IntervalItem[];
  after: IntervalItem[];
};

/** The real algorithm, recorded one meeting at a time. */
function solve(meetings: Meeting[]): { blocks: IntervalItem[]; steps: Step[] } {
  const sorted = byStart(meetings);
  const blocks: IntervalItem[] = [];
  const steps: Step[] = [];
  let firstRow = 0;
  sorted.forEach(({ span }, row) => {
    const block = blocks.at(-1);
    if (!block) {
      blocks.push([span[0], span[1]]);
      return;
    }
    const before = copy(blocks);
    const overlaps = span[0] <= block[1];
    const grows = overlaps && span[1] > block[1];
    if (overlaps) block[1] = Math.max(block[1], span[1]);
    else {
      blocks.push([span[0], span[1]]);
      firstRow = row;
    }
    const owners = sorted.map((meeting, index) => ({ meeting, index })).filter(({ meeting, index }) => index >= firstRow && index <= row && meeting.span[1] === blocks.at(-1)![1]);
    steps.push({ row, cur: span, block: [before.at(-1)![0], before.at(-1)![1]], overlaps, grows, endRow: overlaps && owners.length === 1 ? owners[0].index : null, before, after: copy(blocks) });
  });
  return { blocks, steps };
}

function tones(count: number, paint: (row: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, row) => paint(row) ?? "idle");
}

function blank(meetings: Meeting[], sorted: boolean): IntervalsState {
  return { meetings, sorted, tones: tones(meetings.length, () => null), blocks: [] };
}

const overlap = (a: IntervalItem, b: IntervalItem) => a[0] <= b[1] && b[0] <= a[1];

function pictureFrames(meetings: Meeting[], answer: IntervalItem[]): CalendarFrame[] {
  const n = meetings.length;
  const frames: CalendarFrame[] = [
    {
      scene: "picture",
      caption: `A calendar with ${n} ${n === 1 ? "meeting" : "meetings"}, in no special order. Each bar runs from its start time to its end time, and its numbers stand on the left.`,
      state: blank(meetings, false),
    },
  ];
  let clash: [number, number] | null = null;
  let apart: [number, number] | null = null;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (overlap(meetings[i].span, meetings[j].span)) clash ??= [i, j];
      else apart ??= [i, j];
    }
  }
  if (clash) {
    const [a, b] = [meetings[clash[0]].span, meetings[clash[1]].span].sort((x, y) => x[0] - y[0]);
    const shared: IntervalItem = [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
    const joined: IntervalItem = [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
    frames.push({
      scene: "picture",
      caption:
        shared[0] === shared[1]
          ? `${show(a)} and ${show(b)} touch at ${shared[0]}. Touching counts as overlap, so they must be joined into one busy block, ${show(joined)}.`
          : `${show(a)} and ${show(b)} overlap: both cover the time from ${shared[0]} to ${shared[1]}. They must be joined into one busy block, ${show(joined)}.`,
      state: { ...blank(meetings, false), tones: tones(n, (row) => (row === clash![0] || row === clash![1] ? "edge" : null)), band: shared, blocks: [joined] },
    });
  }
  if (apart) {
    const [a, b] = [meetings[apart[0]].span, meetings[apart[1]].span].sort((x, y) => x[0] - y[0]);
    frames.push({
      scene: "picture",
      caption: `${show(a)} and ${show(b)} do not overlap: there is a gap between them. They must not be joined.`,
      state: { ...blank(meetings, false), tones: tones(n, (row) => (row === apart![0] || row === apart![1] ? "edge" : null)) },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the shortest list of busy blocks that covers exactly the same time. Here there ${answer.length === 1 ? "is 1 block" : `are ${answer.length} blocks`}.`,
    state: { ...blank(meetings, false), tones: tones(n, () => "hit"), blocks: copy(answer) },
  });
  return frames;
}

/**
 * The obvious way, really run: no sorting. Take the meetings as they come and compare each one
 * with every block made so far, joining whatever it overlaps. Same answer, many more comparisons.
 */
function slowFrames(meetings: Meeting[]): CalendarFrame[] {
  const n = meetings.length;
  const frames: CalendarFrame[] = [];
  let blocks: IntervalItem[] = [];
  let checks = 0;
  let shownJoin = false;
  meetings.forEach(({ span }, row) => {
    const grown: IntervalItem = [span[0], span[1]];
    const before = copy(blocks);
    const kept: IntervalItem[] = [];
    const joinedBlocks: IntervalItem[] = [];
    for (const block of blocks) {
      checks += 1;
      if (overlap(grown, block)) {
        joinedBlocks.push(block);
        grown[0] = Math.min(grown[0], block[0]);
        grown[1] = Math.max(grown[1], block[1]);
      } else kept.push(block);
    }
    blocks = [...kept, grown];
    const paint = tones(n, (index) => (index === row ? "edge" : index < row ? "hit" : null));
    if (row === 0) {
      frames.push({
        scene: "slow",
        caption: `The slow way, without sorting: take the meetings as they come. ${show(span)} is first, so it becomes a block. Nothing to compare yet.`,
        state: { ...blank(meetings, false), tones: paint, blocks: copy(blocks), counter: { label: "comparisons", value: checks } },
      });
    } else if (row === 1 || (joinedBlocks.length > 0 && !shownJoin)) {
      if (joinedBlocks.length > 0) shownJoin = true;
      const against = before.length === 1 ? `the block ${show(before[0])}` : `all ${before.length} blocks so far`;
      frames.push({
        scene: "slow",
        caption:
          joinedBlocks.length > 0
            ? `${show(span)} could overlap any block, so it is compared with ${against}. It overlaps ${joinedBlocks.map(show).join(" and ")}: they are joined into ${show(grown)}.`
            : `${show(span)} could overlap any block, so it is compared with ${against}. No overlap: it becomes a block of its own.`,
        state: { ...blank(meetings, false), tones: paint, blocks: copy(blocks), counter: { label: "comparisons", value: checks } },
      });
    }
  });
  frames.push({
    scene: "slow",
    caption: `Done after ${checks} ${checks === 1 ? "comparison" : "comparisons"}. Every new meeting had to be compared with every block, because a block could be anywhere on the calendar.`,
    state: { ...blank(meetings, false), tones: tones(n, () => "hit"), blocks: copy(blocks).sort((a, b) => a[0] - b[0]), counter: { label: "comparisons", value: checks } },
  });
  frames.push({
    scene: "slow",
    caption: "With n meetings that is about n × n comparisons: O(n²) time. For 10,000 meetings, tens of millions.",
    state: { ...blank(meetings, false), tones: tones(n, () => "faded"), counter: { label: "comparisons", value: checks } },
  });
  return frames;
}

function insightFrames(meetings: Meeting[], steps: Step[]): CalendarFrame[] {
  const sorted = byStart(meetings);
  const n = sorted.length;
  const already = sorted.every((meeting, row) => meeting.id === meetings[row].id);
  const frames: CalendarFrame[] = [
    {
      scene: "insight",
      caption: already
        ? "The idea: sort the meetings by start time, earliest on top. This calendar happens to be sorted already."
        : "The idea: sort the meetings by start time, earliest on top. Watch the rows change places.",
      state: blank(sorted, true),
    },
    {
      scene: "insight",
      caption: "Now walk down the rows. Each meeting starts no earlier than all the rows above it. So it can only overlap the latest busy block, never an older one.",
      state: { ...blank(sorted, true), tones: tones(n, (row) => (row === 0 ? "hit" : null)), blocks: [[sorted[0].span[0], sorted[0].span[1]]], endLine: sorted[0].span[1] },
    },
  ];
  const paint = (step: Step) => tones(n, (row) => (row === step.row ? "edge" : row < step.row ? "hit" : null));
  const joins = steps.find((step) => step.overlaps);
  const opens = steps.find((step) => !step.overlaps);
  if (joins) {
    frames.push({
      scene: "insight",
      caption:
        joins.cur[0] === joins.block[1]
          ? `One look is enough. ${show(joins.cur)} starts at ${joins.cur[0]}, exactly where the latest block ends. Touching counts as overlap, so the meeting joins the block.`
          : `One look is enough. ${show(joins.cur)} starts at ${joins.cur[0]}, before the latest block ends at ${joins.block[1]}. So they overlap, and the meeting joins the block.`,
      state: { ...blank(sorted, true), tones: paint(joins), blocks: joins.before, endLine: joins.block[1], band: [joins.cur[0], Math.min(joins.cur[1], joins.block[1])] },
    });
  }
  if (opens) {
    frames.push({
      scene: "insight",
      caption: `${show(opens.cur)} starts at ${opens.cur[0]}, after the latest block ended at ${opens.block[1]}. A gap: that block is finished for good, and a new block opens.`,
      state: { ...blank(sorted, true), tones: paint(opens), blocks: opens.before, endLine: opens.block[1] },
    });
  }
  return frames;
}

function overlapQuiz(step: Step): StoryQuiz {
  const touching = step.cur[0] === step.block[1];
  return {
    kind: "choice",
    question: `Does the meeting ${show(step.cur)} overlap the latest busy block ${show(step.block)}, or does it open a new block?`,
    options: ["It overlaps: it joins the block", "There is a gap: it opens a new block"],
    answer: step.overlaps ? 0 : 1,
    why: step.overlaps
      ? touching
        ? `It starts at ${step.cur[0]}, exactly where the block ends. Touching counts as overlap.`
        : `It starts at ${step.cur[0]}, before the block ends at ${step.block[1]}. Only the start and the block's end need comparing.`
      : `It starts at ${step.cur[0]}, after the block ended at ${step.block[1]}. Nothing later can reach back over that gap.`,
  };
}

function endQuiz(sorted: Meeting[], step: Step): StoryQuiz | null {
  if (step.endRow === null) return null;
  const feedback: Record<number, string> = {};
  sorted.forEach((meeting, row) => {
    if (row === step.endRow) return;
    if (row === step.row) feedback[row] = `${show(meeting.span)} ends at ${meeting.span[1]}, but the block already runs to ${step.block[1]}. Copying its end would cut the block short. That is the Enclosed Interval Trap.`;
    else if (row > step.row) feedback[row] = "That meeting has not been looked at yet.";
    else if (meeting.span[0] < step.block[0]) feedback[row] = "That meeting belongs to an older block, which is finished.";
    else feedback[row] = step.grows ? `${show(meeting.span)} ends at ${meeting.span[1]}. The new meeting reaches further than that.` : `${show(meeting.span)} ends at ${meeting.span[1]}. Another meeting in this block reaches further.`;
  });
  return {
    kind: "cell",
    cells: sorted.length,
    question: `The block must cover ${show(step.block)} and ${show(step.cur)} together. Whose end time becomes the block's end? Click that meeting.`,
    answer: step.endRow,
    feedback,
    otherwise: "Look for the meeting in this block that reaches furthest to the right.",
    why: step.grows
      ? `${show(step.cur)} reaches further, to ${step.cur[1]}. The block takes the later of the two ends.`
      : `The block already runs to ${step.block[1]}, later than ${step.cur[1]}. The block takes the later of the two ends, so nothing changes.`,
  };
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh calendar:
 * fewer frames, no code, and the reader makes every decision.
 */
function solutionFrames(meetings: Meeting[], scene: SceneId = "solution", practice = false): CalendarFrame[] {
  const sorted = byStart(meetings);
  const n = sorted.length;
  const { blocks: answer, steps } = solve(meetings);
  const frames: CalendarFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const already = sorted.every((meeting, row) => meeting.id === meetings[row].id);
  const asked = { overlap: false, gap: false, grows: false, stays: false };
  let shownTrap = false;

  const given: CalendarFrame = {
    scene,
    caption: practice ? "Your turn, on a new calendar. It arrives in no special order. You decide what happens to every meeting." : "The calendar arrives as given. No busy blocks yet.",
    codeLine: line(1),
    state: blank(meetings, false),
  };
  const firstId = sorted[0].id;
  const uniqueFirst = n > 1 && sorted[1].span[0] !== sorted[0].span[0];
  if (practice && uniqueFirst) {
    const feedback: Record<number, string> = {};
    meetings.forEach((meeting, row) => {
      if (meeting.id !== firstId) feedback[row] = `${show(meeting.span)} starts at ${meeting.span[0]}. Another meeting starts earlier than that.`;
    });
    given.quiz = {
      kind: "cell",
      cells: n,
      question: "Before anything else the rows get sorted. Which meeting ends up on top? Click it.",
      answer: meetings.findIndex((meeting) => meeting.id === firstId),
      feedback,
      otherwise: "Compare the start times, the first number of each row.",
      why: "Sort by start time, earliest on top. Then every meeting only has to be compared with the latest block.",
    };
  }
  frames.push(given);
  frames.push({
    scene,
    caption: already ? "Sort the meetings by start time. These rows were in order already, so nothing moves." : "Sort the meetings by start time, earliest on top. Now a meeting can only overlap the block right before it.",
    codeLine: line(0),
    state: blank(sorted, true),
  });

  const paint = (current: number, tone: CellTone = "edge") => tones(n, (row) => (row === current ? tone : row < current ? "hit" : null));
  const first = sorted[0].span;
  frames.push({
    scene,
    caption: `${show(first)} is the first meeting, so it opens the first busy block.`,
    codeLine: line(7),
    state: { ...blank(sorted, true), tones: paint(0), blocks: [[first[0], first[1]]] },
  });

  for (const step of steps) {
    const { row, cur, block } = step;
    const look: CalendarFrame = {
      scene,
      caption: `Next meeting: ${show(cur)}. The latest busy block is ${show(block)}, and the dashed line marks where it ends.`,
      codeLine: line(3),
      state: { ...blank(sorted, true), tones: paint(row), blocks: step.before, endLine: block[1] },
    };
    const kind = step.overlaps ? "overlap" : "gap";
    if (practice || !asked[kind]) {
      asked[kind] = true;
      look.quiz = overlapQuiz(step);
    }
    frames.push(look);

    if (!step.overlaps) {
      frames.push({
        scene,
        caption: `${show(cur)} starts at ${cur[0]}, after the block ended at ${block[1]}. A gap: the old block is finished, and ${show(cur)} opens a new block.`,
        codeLine: line(7),
        state: { ...blank(sorted, true), tones: paint(row), blocks: step.after },
      });
      continue;
    }

    const touching = cur[0] === block[1];
    const joined: CalendarFrame = {
      scene,
      caption: touching
        ? `${show(cur)} starts at ${cur[0]}, exactly where the block ends. Touching counts as overlap, so the meeting joins the block.`
        : `${show(cur)} starts at ${cur[0]}, before the block ends at ${block[1]}. An overlap, so the meeting joins the block.`,
      codeLine: line(4),
      state: { ...blank(sorted, true), tones: paint(row), blocks: step.before, endLine: block[1], band: [cur[0], Math.min(cur[1], block[1])] },
    };
    const endKind = step.grows ? "grows" : "stays";
    if (practice || !asked[endKind]) {
      const quiz = endQuiz(sorted, step);
      if (quiz) {
        asked[endKind] = true;
        joined.quiz = quiz;
      }
    }
    frames.push(joined);

    frames.push({
      scene,
      caption: step.grows
        ? `The block takes the later end. ${cur[1]} is later than ${block[1]}, so the block grows to ${show(step.after.at(-1)!)}.`
        : cur[1] === block[1]
          ? `The block takes the later end. Both end at ${block[1]}, so the block stays ${show(block)}.`
          : `The block takes the later end. ${show(cur)} ends at ${cur[1]}, inside the block, so the block stays ${show(block)}.`,
      codeLine: line(5),
      state: { ...blank(sorted, true), tones: paint(row, "hit"), blocks: step.after, endLine: step.after.at(-1)![1] },
    });

    if (cur[1] < block[1] && (practice || !shownTrap)) {
      shownTrap = true;
      frames.push({
        scene,
        caption: `The Enclosed Interval Trap: ${show(cur)} sits inside the block. Copying its end would shrink the block to [${block[0]},${cur[1]}] and lose ${cur[1]} to ${block[1]}. Keep the later end.`,
        codeLine: line(5),
        state: { ...blank(sorted, true), tones: paint(row, "miss"), blocks: step.after, wrongEnd: cur[1] },
      });
    }
  }

  const result = JSON.stringify(answer);
  const done: IntervalsState = { ...blank(sorted, true), tones: tones(n, () => "hit"), blocks: copy(answer) };
  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}Every meeting is placed, and the busy blocks are complete. The answer is ${result}.`,
    codeLine: line(10),
    state: done,
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log n). Sorting the meetings is the costly part. After that each meeting is compared once, with one block: ${steps.length} ${steps.length === 1 ? "comparison" : "comparisons"} here.`,
      codeLine: 0,
      state: { ...done, counter: { label: "comparisons", value: steps.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). Only the list of busy blocks is stored. At worst no meetings overlap and it holds one block per meeting; here it holds ${answer.length}.`,
      codeLine: 1,
      state: { ...done, tones: tones(n, () => "faded") },
    });
  }
  return frames;
}

export const mergeIntervalsStory: ProblemStory<IntervalsState> = {
  slugs: ["lc-56"],
  pattern: "Sort by start, then sweep",
  trigger: "a list of ranges (meetings, bookings) in any order, where the overlapping ones must be joined or counted",
  insight: "Sort the meetings by start. Then each one can only overlap the latest busy block: if it starts before that block ends, the block takes the later of the two ends. If not, a new block opens.",
  metaphor: {
    name: "The calendar",
    legend: "meeting = one interval · latest busy block = the last entry of merged · the block's end = last[1] · gap = cur[0] > last[1]",
    terms: ["meeting", "block", "gap", "overlap"],
  },
  traps: [
    {
      name: "The Enclosed Interval Trap",
      rule: "A meeting can sit inside the block, like [2,4] inside [1,6]. Never copy its end: last[1] = Math.max(last[1], cur[1]).",
    },
  ],
  template: [
    "sort the ranges by start;",
    "for (each range, in order) {",
    "    if (it starts after the last block ends) open a new block;",
    "    else last block's end = the later of the two ends;",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n log n)",
    timeWhy: "sorting costs n log n; after it, each meeting is compared once with the latest block",
    space: "O(n)",
    spaceWhy: "the list of busy blocks holds at most one block per meeting",
  },
  code: CODE,
  examples: [
    { label: "[[8,10],[1,3],[15,18],[2,6]]", input: "[[8,10],[1,3],[15,18],[2,6]]", expected: "[[1,6],[8,10],[15,18]]", note: "Arrives unsorted" },
    { label: "[[2,3],[1,5],[9,12],[4,7]]", input: "[[2,3],[1,5],[9,12],[4,7]]", expected: "[[1,7],[9,12]]", note: "Tricky: a meeting inside another" },
    { label: "[[1,4],[4,5]]", input: "[[1,4],[4,5]]", expected: "[[1,5]]", note: "They only touch" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-57", title: "Insert Interval" },
    { slug: "lc-253", title: "Meeting Rooms II" },
    { slug: "lc-435", title: "Non-overlapping Intervals" },
  ],
  answer: (input) => JSON.stringify(solve(parseInput(input)).blocks),
  frames: (input) => {
    const meetings = parseInput(input);
    const { blocks, steps } = solve(meetings);
    const sorted = byStart(meetings);
    return [
      ...pictureFrames(meetings, blocks),
      ...slowFrames(meetings),
      ...insightFrames(meetings, steps),
      ...solutionFrames(meetings),
      ...solutionFrames(parseInput(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: meetings sorted by start, joined into busy blocks. Say the idea in your head first, then reveal the card.",
        state: { ...blank(sorted, true), tones: tones(sorted.length, () => "hit"), blocks: copy(blocks) },
      },
    ];
  },
  View: IntervalsView,
};
