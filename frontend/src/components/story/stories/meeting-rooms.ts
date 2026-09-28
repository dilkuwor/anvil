import type { CellTone } from "@/components/learn/viz/primitives";

import { IntervalsView, type IntervalItem, type IntervalsState, type Meeting } from "../intervals-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<IntervalsState>;

/** Fresh meetings for the "your turn" run: unsorted, two back-to-back touches, then a clash. */
const PRACTICE = "[[6,9],[2,4],[4,6],[8,12]]";
const FALLBACK: IntervalItem[] = [[0, 30], [5, 10], [15, 20]];

const CODE = [
  "Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));",
  "for (int i = 1; i < intervals.length; i++) {",
  "    int start = intervals[i][0];",
  "    int previousEnd = intervals[i - 1][1];",
  "    if (start < previousEnd) {",
  "        return false;",
  "    }",
  "}",
  "return true;",
];

function parse(raw: string): Meeting[] {
  const found = [...raw.matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map((match): IntervalItem => [Number(match[1]), Number(match[2])]).filter(([start, end]) => start < end);
  return (found.length > 0 ? found : FALLBACK).map((span, id) => ({ id, span }));
}

const show = (span: IntervalItem) => `[${span[0]},${span[1]}]`;
/** Stable, like Java's sort for arrays of arrays: equal starts keep their given order. */
const byStart = (meetings: Meeting[]) => [...meetings].sort((a, b) => a.span[0] - b.span[0] || a.id - b.id);
const listOf = (meetings: Meeting[]) => {
  const names = meetings.map((meeting) => show(meeting.span));
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

/** Independent solver: compare every pair. */
function canAttend(meetings: Meeting[]): boolean {
  for (let a = 0; a < meetings.length; a++) {
    for (let b = a + 1; b < meetings.length; b++) {
      const [s1, e1] = meetings[a].span;
      const [s2, e2] = meetings[b].span;
      if (s1 < e2 && s2 < e1) return false;
    }
  }
  return true;
}

type Kind = "touch" | "gap" | "clash";
type Step = { row: number; start: number; previousEnd: number; kind: Kind };

/** The real algorithm on the sorted calendar, stopping at the first clash like the Java does. */
function walk(sorted: Meeting[]): Step[] {
  const steps: Step[] = [];
  for (let row = 1; row < sorted.length; row++) {
    const start = sorted[row].span[0];
    const previousEnd = sorted[row - 1].span[1];
    const kind: Kind = start < previousEnd ? "clash" : start === previousEnd ? "touch" : "gap";
    steps.push({ row, start, previousEnd, kind });
    if (kind === "clash") break;
  }
  return steps;
}

function draw(meetings: Meeting[], sorted: boolean, paint: (row: number) => CellTone | null, extra: Partial<IntervalsState> = {}): IntervalsState {
  return { meetings, sorted, tones: meetings.map((_, row) => paint(row) ?? "idle"), blocks: [], endLine: null, band: null, wrongEnd: null, counter: null, ...extra };
}

function pictureFrames(meetings: Meeting[]): F[] {
  const sorted = byStart(meetings);
  const steps = walk(sorted);
  const rowOf = (meeting: Meeting) => meetings.indexOf(meeting);
  const frames: F[] = [
    { scene: "picture", caption: `Here are ${meetings.length} meetings on a timeline. One person wants to go to every one of them.`, state: draw(meetings, false, () => null) },
  ];
  const clash = steps.find((step) => step.kind === "clash");
  const touch = steps.find((step) => step.kind === "touch");
  if (clash) {
    const first = sorted[clash.row - 1];
    const second = sorted[clash.row];
    frames.push({
      scene: "picture",
      caption: `${show(first.span)} and ${show(second.span)} overlap: ${show(second.span)} starts before ${show(first.span)} ends. Nobody can sit in both at once.`,
      state: draw(meetings, false, (row) => (row === rowOf(first) || row === rowOf(second) ? "miss" : null), { band: [clash.start, Math.min(first.span[1], second.span[1])] }),
    });
  }
  if (touch) {
    const first = sorted[touch.row - 1];
    const second = sorted[touch.row];
    frames.push({
      scene: "picture",
      caption: `${show(first.span)} and ${show(second.span)} only touch at ${touch.start}. One ends as the other starts, so going to both is allowed.`,
      state: draw(meetings, false, (row) => (row === rowOf(first) || row === rowOf(second) ? "hit" : null), { band: [touch.start, touch.start] }),
    });
  }
  if (!clash && !touch && steps.length > 0) {
    const first = sorted[steps[0].row - 1];
    const second = sorted[steps[0].row];
    frames.push({
      scene: "picture",
      caption: `${show(first.span)} and ${show(second.span)} do not overlap. There is a gap between them.`,
      state: draw(meetings, false, (row) => (row === rowOf(first) || row === rowOf(second) ? "hit" : null)),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: answer true if no two meetings overlap. Answer false if any two do.",
    state: draw(meetings, false, () => null),
  });
  return frames;
}

/** The obvious way, really run: every meeting against every meeting after it, in the given order. */
function slowFrames(meetings: Meeting[]): F[] {
  const frames: F[] = [];
  let checks = 0;
  let found: [number, number] | null = null;
  for (let a = 0; a < meetings.length && !found; a++) {
    for (let b = a + 1; b < meetings.length; b++) {
      checks++;
      const [s1, e1] = meetings[a].span;
      const [s2, e2] = meetings[b].span;
      if (s1 < e2 && s2 < e1) {
        found = [a, b];
        break;
      }
    }
    if (found) {
      const [x, y] = found;
      frames.push({
        scene: "slow",
        caption: `${a === 0 ? "The slow way: compare each meeting with every meeting after it. " : ""}${show(meetings[x].span)} and ${show(meetings[y].span)} overlap. Found after ${checks} checks.`,
        state: draw(meetings, false, (row) => (row === x || row === y ? "miss" : row < a ? "faded" : row < y ? "window" : null), { counter: { label: "checks", value: checks } }),
      });
    } else if (a < 3 && a < meetings.length - 1) {
      frames.push({
        scene: "slow",
        caption: a === 0 ? `The slow way: compare ${show(meetings[a].span)} with every meeting after it. No overlap yet.` : `Now ${show(meetings[a].span)} is compared with every meeting after it, all over again.`,
        state: draw(meetings, false, (row) => (row === a ? "edge" : row < a ? "faded" : "window"), { counter: { label: "checks", value: checks } }),
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: "This is O(n²) time. Each meeting is checked against every meeting after it. With no clash at all, every pair must be checked.",
    state: draw(meetings, false, () => "faded", { counter: { label: "checks", value: checks } }),
  });
  return frames;
}

function insightFrames(meetings: Meeting[]): F[] {
  const sorted = byStart(meetings);
  const steps = walk(sorted);
  const frames: F[] = [
    {
      scene: "insight",
      caption: "Now put the meetings in order of start time, like a calendar. The rows slide into place.",
      state: draw(sorted, true, () => null),
    },
  ];
  const focus = steps.find((step) => step.kind === "clash") ?? steps.at(-1);
  if (!focus) return frames;
  const { row } = focus;
  frames.push({
    scene: "insight",
    caption: `In this order, a meeting only has to look at the one just before it. Does ${show(sorted[row].span)} start before ${show(sorted[row - 1].span)} ends?`,
    state: draw(sorted, true, (other) => (other === row ? "edge" : other === row - 1 ? "window" : null), { endLine: focus.previousEnd }),
  });
  if (row >= 2) {
    frames.push({
      scene: "insight",
      caption: "Meetings higher up the calendar started even earlier, and each ended before the next one began. So they cannot reach this far down.",
      state: draw(sorted, true, (other) => (other === row ? "edge" : other === row - 1 ? "window" : other < row - 1 ? "faded" : null), { endLine: focus.previousEnd }),
    });
  }
  return frames;
}

function decisionQuiz(step: Step, sorted: Meeting[]): StoryQuiz {
  const cur = show(sorted[step.row].span);
  const question = `${cur} starts at ${step.start}. The meeting before it ends at ${step.previousEnd}. Do they clash?`;
  if (step.kind === "clash") {
    return { kind: "choice", question, options: ["Yes: it starts before the other ends", "No: the calendar is in order, so it is fine"], answer: 0, why: `${step.start} is before ${step.previousEnd}, so for a while both meetings are running.` };
  }
  if (step.kind === "touch") {
    return { kind: "choice", question, options: [`Yes: they share the moment ${step.start}`, "No: one ends just as the other starts"], answer: 1, why: `A meeting that ends at ${step.previousEnd} has left the room at ${step.previousEnd}. Only a start before the end is a clash.` };
  }
  return { kind: "choice", question, options: ["No: there is a gap between them", "Yes: they are neighbours on the calendar"], answer: 0, why: "Being neighbours is fine. Only a start before the end is a clash." };
}

/** The real algorithm, one frame per change. `practice` reuses it: the reader decides every check. */
function solutionFrames(meetings: Meeting[], scene: SceneId = "solution", practice = false): F[] {
  const sorted = byStart(meetings);
  const steps = walk(sorted);
  const frames: F[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const blocks: IntervalItem[] = [];
  const asked = new Set<Kind>();
  let warned = false;
  const paint = (current: number | null, overrides: Record<number, CellTone> = {}) => (row: number) =>
    overrides[row] ?? (row === current ? "edge" : row < (current ?? 0) ? "hit" : null);
  const state = (current: number | null, overrides: Record<number, CellTone> = {}, extra: Partial<IntervalsState> = {}) =>
    draw(sorted, true, paint(current, overrides), { blocks: blocks.map((block): IntervalItem => [block[0], block[1]]), ...extra });

  if (practice) {
    const firstRow = meetings.indexOf(sorted[0]);
    const startQuiz: StoryQuiz = {
      kind: "cell",
      cells: meetings.length,
      question: "Your turn, with new meetings. Which one goes first on the calendar? Click it.",
      answer: firstRow,
      feedback: Object.fromEntries(meetings.map((meeting, row) => [row, `${show(meeting.span)} starts at ${meeting.span[0]}. Another meeting starts earlier.`]).filter(([row]) => row !== firstRow)),
      otherwise: "The calendar is ordered by start time. Look at the first number of each meeting.",
      why: `${show(sorted[0].span)} starts earliest, so it goes first. The rest follow in order of start.`,
    };
    frames.push({ scene, caption: `Your turn, with new meetings: ${listOf(meetings)}. First, put them on the calendar.`, state: draw(meetings, false, () => null), quiz: startQuiz });
  }
  frames.push({
    scene,
    caption: practice ? "The calendar is sorted by start time. Now check each meeting against the one before it." : "Sort the calendar: every meeting in order of its start time.",
    codeLine: line(0),
    state: state(null),
  });
  blocks.push([sorted[0].span[0], sorted[0].span[1]]);
  if (!practice) {
    frames.push({ scene, caption: `The first meeting, ${show(sorted[0].span)}, goes on the calendar. Nothing comes before it.`, codeLine: 1, state: state(1, { 0: "done", 1: "idle" }) });
  }

  // After a clash: the pair in coral, and everything further down no longer matters.
  const later = (clashRow: number) => {
    const overrides: Record<number, CellTone> = { [clashRow]: "miss", [clashRow - 1]: "miss" };
    for (let row = clashRow + 1; row < sorted.length; row++) overrides[row] = "faded";
    return overrides;
  };
  let answer = true;
  for (const step of steps) {
    const cur = sorted[step.row];
    if (!practice) {
      frames.push({ scene, caption: `Next meeting on the calendar: ${show(cur.span)}. It starts at ${step.start}.`, codeLine: 2, state: state(step.row) });
    }
    const ask = practice || !asked.has(step.kind);
    asked.add(step.kind);
    frames.push({
      scene,
      caption: practice ? `Next meeting: ${show(cur.span)}. The meeting before it on the calendar ends at ${step.previousEnd}.` : `The meeting before it ends at ${step.previousEnd}. That is the line to compare with.`,
      codeLine: line(3),
      state: state(step.row, {}, { endLine: step.previousEnd }),
      quiz: ask ? decisionQuiz(step, sorted) : undefined,
    });
    if (step.kind === "clash") {
      answer = false;
      frames.push({
        scene,
        caption: `${step.start} is before ${step.previousEnd}: the two meetings clash. For a while both are running.`,
        codeLine: line(4),
        state: state(step.row, { [step.row]: "miss", [step.row - 1]: "miss" }, { band: [step.start, Math.min(step.previousEnd, cur.span[1])] }),
      });
      frames.push({
        scene,
        caption: practice ? "Done. One clash is enough, so the answer is false." : "One clash is enough. The rest of the calendar does not matter, so the answer is false.",
        codeLine: line(5),
        state: state(step.row, later(step.row)),
      });
      break;
    }
    blocks.push([cur.span[0], cur.span[1]]);
    frames.push({
      scene,
      caption:
        step.kind === "touch"
          ? `No clash: ${show(cur.span)} starts at ${step.start}, the moment the meeting before ends. It joins the calendar.`
          : `No clash: ${step.start} is after ${step.previousEnd}, so there is a gap. ${show(cur.span)} joins the calendar.`,
      codeLine: line(4),
      state: state(step.row, { [step.row]: "done" }, step.kind === "touch" ? { band: [step.start, step.start] } : {}),
    });
    if (step.kind === "touch" && !warned && !practice) {
      warned = true;
      frames.push({
        scene,
        caption: `The Back-to-Back Trap: a check that also stops on equal times would call these two meetings a clash, and wrongly answer false.`,
        codeLine: 4,
        state: state(step.row, { [step.row]: "miss", [step.row - 1]: "miss" }, { band: [step.start, step.start] }),
      });
    }
  }

  if (answer) {
    frames.push({
      scene,
      caption: practice ? "Done. No meeting clashed, so the answer is true. You made every check yourself." : "Every meeting passed its check. The calendar has no clash, so the answer is true.",
      codeLine: line(8),
      state: draw(sorted, true, () => "done", { blocks: blocks.map((block): IntervalItem => [block[0], block[1]]) }),
    });
  }
  if (!practice) {
    const checks = steps.length;
    frames.push({
      scene,
      caption: `Time: O(n log n). Sorting the calendar is the big cost. After it, each meeting was checked once against the one before: ${checks} check${checks === 1 ? "" : "s"}.`,
      codeLine: 0,
      state: draw(sorted, true, () => "window", { blocks: blocks.map((block): IntervalItem => [block[0], block[1]]), counter: { label: "checks", value: checks } }),
    });
    frames.push({
      scene,
      caption: "Space: O(n). Java's sort may borrow extra room for up to half the meetings. The check itself only holds two numbers.",
      codeLine: 0,
      state: draw(sorted, true, () => "hit", { blocks: blocks.map((block): IntervalItem => [block[0], block[1]]) }),
    });
  }
  return frames;
}

export const meetingRoomsStory: ProblemStory<IntervalsState> = {
  slugs: ["lc-252"],
  pattern: "Sort by start, then sweep",
  trigger: "meetings (start and end times) and the question “can one person attend them all?”",
  insight: "Sort the meetings by start time. Then a meeting can only clash with the one just before it: check whether it starts before that one ends.",
  metaphor: { name: "The calendar", legend: "calendar = the sorted list · meeting before = intervals[i - 1] · its end = previousEnd", terms: ["calendar", "meeting"] },
  traps: [{ name: "The Back-to-Back Trap", rule: "A meeting that ends at 5 and one that starts at 5 do not clash. Test start < previous end, not start <= previous end." }],
  template: [
    "sort the items by start;",
    "for (each item after the first) {",
    "    compare its start with the previous end;   // here: a clash means false",
    "}",
    "return the result;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n log n)",
    timeWhy: "the sort is the big cost; after it each meeting is checked once",
    space: "O(n)",
    spaceWhy: "Java's sort may borrow room for up to half the meetings",
  },
  code: CODE,
  examples: [
    { label: "[[5,8],[1,3],[3,5],[8,9],[6,7]]", input: "[[5,8],[1,3],[3,5],[8,9],[6,7]]", expected: "false", note: "Back to back, then a clash" },
    { label: "[[0,30],[5,10],[15,20]]", input: "[[0,30],[5,10],[15,20]]", expected: "false" },
    { label: "[[1,5],[5,8],[9,12]]", input: "[[1,5],[5,8],[9,12]]", expected: "true", note: "Tricky: two meetings only touch" },
    { label: "[[7,10],[2,4]]", input: "[[7,10],[2,4]]", expected: "true" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-253", title: "Meeting Rooms II" },
    { slug: "lc-56", title: "Merge Intervals" },
    { slug: "lc-435", title: "Non-overlapping Intervals" },
  ],
  answer: (input) => String(canAttend(parse(input))),
  frames: (input) => {
    const meetings = parse(input);
    const sorted = byStart(meetings);
    const steps = walk(sorted);
    const reached = steps.filter((step) => step.kind !== "clash").map((step) => step.row);
    const kept = [0, ...reached].map((row): IntervalItem => [sorted[row].span[0], sorted[row].span[1]]);
    const clash = steps.find((step) => step.kind === "clash");
    return [
      ...pictureFrames(meetings),
      ...slowFrames(meetings),
      ...insightFrames(meetings),
      ...solutionFrames(meetings),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(sorted, true, (row) => (clash && (row === clash.row || row === clash.row - 1) ? "miss" : "hit"), { blocks: kept }),
      },
    ];
  },
  View: IntervalsView,
};
