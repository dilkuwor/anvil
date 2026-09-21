import type { CellTone } from "@/components/learn/viz/primitives";

import { HeapPileView, PileHeap, pileLevels, type HeapPileState, type PileItem } from "../agy-heap-pile-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<HeapPileState>;
type Meeting = { id: string; start: number; end: number };
/** One seat in the pile: when a room becomes free, and which room it is. */
type Busy = { meeting: Meeting; room: number };

/** Fresh meetings for the "your turn" run: out of order, with one back-to-back pair. */
const PRACTICE = "9-12, 1-4, 4-9, 2-6";

const CODE = [
  "Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));",
  "PriorityQueue<Integer> ends = new PriorityQueue<>();",
  "for (int[] meeting : intervals) {",
  "    if (!ends.isEmpty() && ends.peek() <= meeting[0]) {",
  "        ends.poll();",
  "    }",
  "    ends.add(meeting[1]);",
  "}",
  "return ends.size();",
];

const parse = (input: string): Meeting[] =>
  input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.includes("-"))
    .map((part, index) => {
      const [start, end] = part.split("-").map(Number);
      return { id: `m${index}`, start, end };
    });

/** Independent solver: walk the clock and count how many meetings run at each moment. */
function solve(meetings: Meeting[]): number {
  let most = 0;
  for (const at of meetings) most = Math.max(most, meetings.filter((other) => other.start <= at.start && at.start < other.end).length);
  return most;
}

const byStart = (meetings: Meeting[]) => [...meetings].sort((a, b) => a.start - b.start);
const earliestEnd = () => new PileHeap<Busy>((a, b) => a.meeting.end < b.meeting.end);
const name = (meeting: Meeting) => `${meeting.start}–${meeting.end}`;
const rooms = (n: number) => `${n} room${n === 1 ? "" : "s"}`;
const chip = (busy: Busy, tone: CellTone = "idle"): PileItem => ({ id: busy.meeting.id, label: String(busy.meeting.end), sub: `room ${busy.room + 1}`, tone });

/** Runs the real algorithm. `strict` is the mistaken version that refuses a room freed at the very same minute. */
function run(meetings: Meeting[], strict = false): { placed: Map<Meeting, number>; pile: PileHeap<Busy> } {
  const pile = earliestEnd();
  const placed = new Map<Meeting, number>();
  let opened = 0;
  for (const meeting of byStart(meetings)) {
    const top = pile.peek();
    const free = top !== undefined && (strict ? top.meeting.end < meeting.start : top.meeting.end <= meeting.start);
    const room = free ? pile.poll()!.room : opened++;
    pile.add({ meeting, room });
    placed.set(meeting, room);
  }
  return { placed, pile };
}

const assign = (meetings: Meeting[], strict = false) => run(meetings, strict).placed;

type Layout = { levels: number; lanes: number; max: number };

type Draw = {
  pile?: { title: string; items: PileItem[]; lit?: boolean } | null;
  order: Meeting[];
  tone: (meeting: Meeting) => CellTone;
  /** Which lane each meeting is drawn in; "next" is the strip above the rooms; missing = not drawn. */
  lane: (meeting: Meeting) => number | "next" | null;
  note?: HeapPileState["note"];
  counter?: HeapPileState["counter"];
};

function draw(layout: Layout, d: Draw): HeapPileState {
  return {
    piles: d.pile ? [{ title: d.pile.title, items: d.pile.items, lit: d.pile.lit }] : [],
    levels: layout.levels,
    rows: [{ title: "meetings", wide: true, cells: d.order.map((meeting) => ({ label: name(meeting), tone: d.tone(meeting) })) }],
    panel: { kind: "axis", max: layout.max, lanes: layout.lanes, bars: d.order.map((meeting) => ({ id: meeting.id, start: meeting.start, end: meeting.end, lane: d.lane(meeting), tone: d.tone(meeting) })) },
    note: d.note ?? null,
    counter: d.counter ?? null,
  };
}

function pictureFrames(meetings: Meeting[], layout: Layout): F[] {
  const placed = assign(meetings);
  const lane = (meeting: Meeting) => placed.get(meeting) ?? null;
  const sorted = byStart(meetings);
  const answer = solve(meetings);
  const frames: F[] = [{ scene: "picture", caption: `These are ${meetings.length} meetings. Each bar runs from the meeting's start time to its end time.`, state: draw(layout, { order: meetings, tone: () => "idle", lane }) }];
  let clash: [Meeting, Meeting] | null = null;
  let share: [Meeting, Meeting] | null = null;
  for (const a of sorted) {
    for (const b of sorted) {
      if (a === b || a.start > b.start) continue;
      if (!clash && b.start < a.end && a !== b && sorted.indexOf(a) < sorted.indexOf(b)) clash = [a, b];
      if (!share && a.end <= b.start && placed.get(a) === placed.get(b)) share = [a, b];
    }
  }
  if (clash) {
    const [a, b] = clash;
    frames.push({
      scene: "picture",
      caption: `Not allowed: two meetings in one room at the same time. ${name(a)} is still running when ${name(b)} starts, so they need different rooms.`,
      state: draw(layout, { order: meetings, tone: (meeting) => (meeting === a || meeting === b ? "miss" : "idle"), lane }),
    });
  }
  if (share) {
    const [a, b] = share;
    frames.push({
      scene: "picture",
      caption: `Allowed: using a room again once it is free. ${name(a)} is over when ${name(b)} starts, so they can share a room.`,
      state: draw(layout, { order: meetings, tone: (meeting) => (meeting === a || meeting === b ? "done" : "idle"), lane }),
    });
  }
  frames.push({ scene: "picture", caption: `The goal: the smallest number of rooms that fits every meeting. Here that is ${answer}.`, state: draw(layout, { order: meetings, tone: () => "hit", lane }) });
  return frames;
}

/** The obvious way, really run: for each meeting, walk along every room and ask whether it is free yet. */
function slowFrames(meetings: Meeting[], layout: Layout): F[] {
  const frames: F[] = [];
  const sorted = byStart(meetings);
  const ends: number[] = [];
  const placed = new Map<Meeting, number>();
  let checks = 0;
  sorted.forEach((meeting, index) => {
    let room = -1;
    let here = 0;
    for (let r = 0; r < ends.length; r++) {
      checks++;
      here++;
      if (ends[r] <= meeting.start) {
        room = r;
        break;
      }
    }
    if (room === -1) {
      room = ends.length;
      ends.push(meeting.end);
    } else ends[room] = meeting.end;
    placed.set(meeting, room);
    if (index > 2) return;
    const snapshot = new Map(placed);
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: take the meetings by start time. ${name(meeting)} is first. There is no room yet, so room 1 opens.`
          : `${name(meeting)} is next. Walk along the rooms and ask each one: are you free yet? That was ${here} room${here === 1 ? "" : "s"} checked.`,
      state: draw(layout, { order: sorted, tone: (other) => (other === meeting ? "edge" : snapshot.has(other) ? "window" : "idle"), lane: (other) => snapshot.get(other) ?? null, counter: { label: "rooms checked", value: checks } }),
    });
  });
  frames.push({
    scene: "slow",
    caption: `It finds ${rooms(ends.length)}, after checking rooms ${checks} time${checks === 1 ? "" : "s"}. With many rooms open, every meeting walks along all of them: O(n²) time.`,
    state: draw(layout, { order: sorted, tone: () => "faded", lane: (other) => placed.get(other) ?? null, counter: { label: "rooms checked", value: checks } }),
  });
  return frames;
}

function insightFrames(meetings: Meeting[], layout: Layout): F[] {
  const sorted = byStart(meetings);
  const title = "pile · earliest end on top";
  const pile = earliestEnd();
  const placed = new Map<Meeting, number>();
  let opened = 0;
  // Stop at the first meeting that finds a room already in use: that is where the pile is first asked.
  let moment: Meeting | null = null;
  for (const meeting of sorted) {
    if (pile.size > 0) {
      moment = meeting;
      break;
    }
    pile.add({ meeting, room: opened });
    placed.set(meeting, opened++);
  }
  const lane = (meeting: Meeting) => (meeting === moment ? "next" : (placed.get(meeting) ?? null));
  const tone = (meeting: Meeting): CellTone => (meeting === moment ? "edge" : placed.has(meeting) ? "window" : "idle");
  const frames: F[] = [
    {
      scene: "insight",
      caption: "When a meeting starts, only one room matters: the room that becomes free first. If even that one is still busy, every room is busy.",
      state: draw(layout, { order: sorted, tone, lane }),
    },
    {
      scene: "insight",
      caption: "Picture a sorting pile that holds one end time for each room in use, earliest end on top. One look at the top tells you if any room is free.",
      state: draw(layout, { pile: { title, items: pile.items.map((busy, index) => chip(busy, index === 0 ? "edge" : "idle")) }, order: sorted, tone, lane }),
    },
  ];
  if (moment) {
    const top = pile.peek()!;
    const free = top.meeting.end <= moment.start;
    frames.push({
      scene: "insight",
      caption: free
        ? `${name(moment)} starts at ${moment.start}. The top says a room is free from ${top.meeting.end}. So that room is used again, and no new room opens.`
        : `${name(moment)} starts at ${moment.start}. The top says the first room is free only at ${top.meeting.end}. Too late, so a new room must open.`,
      state: draw(layout, { pile: { title, lit: true, items: pile.items.map((busy, index) => chip(busy, index === 0 ? (free ? "done" : "miss") : "idle")) }, order: sorted, tone, lane }),
    });
  }
  return frames;
}

const roomQuiz = (meeting: Meeting, topEnd: number): StoryQuiz => {
  const free = topEnd <= meeting.start;
  return {
    kind: "choice",
    question: `${name(meeting)} starts at ${meeting.start}. The top of the pile is ${topEnd}. What happens?`,
    options: ["The room on top is free: use it again", "Every room is busy: open a new room"],
    answer: free ? 0 : 1,
    why: free
      ? topEnd === meeting.start
        ? `The room is free at ${topEnd}, the very minute the meeting starts. Back to back is fine.`
        : `That room has been free since ${topEnd}, before the meeting starts at ${meeting.start}.`
      : `The earliest room is free only at ${topEnd}, after the start at ${meeting.start}. If the earliest is busy, all are busy.`,
  };
};

/** The real algorithm, one frame per change. `practice` reuses it on fresh meetings: the reader makes every decision. */
function solutionFrames(meetings: Meeting[], layout: Layout, scene: SceneId = "solution", practice = false): F[] {
  const frames: F[] = [];
  const sorted = byStart(meetings);
  const line = (index: number) => (practice ? undefined : index);
  const title = "pile · earliest end on top";
  const pile = earliestEnd();
  const placed = new Map<Meeting, number>();
  let current: Meeting | null = null;
  let opened = 0;
  let moves = 0;
  let fullest: Busy[] = [];
  const asked = { open: false, reuse: false, tie: false };
  const tone = (meeting: Meeting): CellTone => (meeting === current ? "edge" : placed.has(meeting) ? (pile.items.some((busy) => busy.meeting === meeting) ? "window" : "faded") : "idle");
  const lane = (meeting: Meeting) => (meeting === current && !placed.has(meeting) ? "next" : (placed.get(meeting) ?? null));
  const items = (mark: (busy: Busy, index: number) => CellTone = (_, index) => (index === 0 ? "edge" : "idle")) => pile.items.map((busy, index) => chip(busy, mark(busy, index)));
  const base = (extra: Partial<Draw> = {}): Draw => ({ pile: { title, items: items() }, order: sorted, tone, lane, ...extra });

  const already = sorted.every((meeting, index) => meeting === meetings[index]);
  frames.push({
    scene,
    caption: practice ? `Your turn, with new meetings. They are not in order of start time yet.` : `These are the meetings as they were given.${already ? "" : " They are not in order of start time."}`,
    codeLine: line(0),
    state: draw(layout, base({ pile: null, order: meetings })),
  });
  frames.push({
    scene,
    caption: already ? "They are already in order of start time. We will take them one by one, earliest start first." : "First put the meetings in order of start time. We will take them one by one, earliest start first.",
    codeLine: line(0),
    state: draw(layout, base({ pile: null, note: { text: "in order of start time", tone: "teal" } })),
  });
  frames.push({ scene, caption: "Start with an empty pile. It will hold one end time for each room in use, earliest end on top.", codeLine: line(1), state: draw(layout, base()) });

  for (const meeting of sorted) {
    current = meeting;
    const top = pile.peek();
    if (!top) {
      pile.add({ meeting, room: opened });
      placed.set(meeting, opened++);
      moves++;
      frames.push({ scene, caption: `${name(meeting)} is first. The pile is empty, so no room exists yet. Room 1 opens, and its end time, ${meeting.end}, drops into the pile.`, codeLine: line(6), state: draw(layout, base()) });
      fullest = [...pile.items];
      continue;
    }
    const free = top.meeting.end <= meeting.start;
    const tie = top.meeting.end === meeting.start;
    const kind = tie ? "tie" : free ? "reuse" : "open";
    const ask = practice || !asked[kind];
    asked[kind] = true;
    frames.push({
      scene,
      caption: `${name(meeting)} is next. It starts at ${meeting.start}. Look at the top of the pile: the first room to be free is free at ${top.meeting.end}.`,
      codeLine: line(3),
      state: draw(layout, base({ pile: { title, items: items(() => "idle") } })),
      quiz: ask ? roomQuiz(meeting, top.meeting.end) : undefined,
    });
    if (tie) {
      // The trap, drawn: the strict version would push this meeting into a brand new room.
      const wrongLane = opened;
      frames.push({
        scene,
        caption: `The Back-to-Back Trap: room ${top.room + 1} is free at ${top.meeting.end}, and the meeting starts at ${meeting.start}. That fits. Asking for “strictly earlier” would open a room for nothing.`,
        codeLine: line(3),
        state: draw(layout, base({ tone: (other) => (other === meeting ? "miss" : tone(other)), lane: (other) => (other === meeting ? wrongLane : lane(other)), note: { text: `✕ room ${top.room + 1} was free at ${top.meeting.end}`, tone: "coral" } })),
      });
    }
    if (free) {
      const left = pile.poll()!;
      moves++;
      frames.push({
        scene,
        caption: `${left.meeting.end} is not later than ${meeting.start}, so room ${left.room + 1} is free. Its old end time is taken out of the pile.`,
        codeLine: line(4),
        state: draw(layout, base()),
      });
      pile.add({ meeting, room: left.room });
      placed.set(meeting, left.room);
      moves++;
      frames.push({
        scene,
        caption: `The meeting goes into room ${left.room + 1}. Its end time, ${meeting.end}, drops into the pile. The top is ${pile.peek()!.meeting.end}.`,
        codeLine: line(6),
        state: draw(layout, base({ pile: { title, items: items((busy, index) => (busy.meeting === meeting ? "hit" : index === 0 ? "edge" : "idle")) } })),
      });
    } else {
      pile.add({ meeting, room: opened });
      placed.set(meeting, opened++);
      moves++;
      frames.push({
        scene,
        caption: `${top.meeting.end} is later than ${meeting.start}: even the first room to be free is still busy. Room ${opened} opens, and ${meeting.end} drops into the pile. The top is ${pile.peek()!.meeting.end}.`,
        codeLine: line(6),
        state: draw(layout, base({ pile: { title, items: items((busy, index) => (busy.meeting === meeting ? "hit" : index === 0 ? "edge" : "idle")) } })),
      });
    }
    if (pile.size > fullest.length) fullest = [...pile.items];
  }

  current = null;
  const answer = pile.size;
  frames.push({
    scene,
    caption: `Every meeting has a room. The pile holds one end time for each room that was opened: ${answer} of them. The answer is ${answer}.`,
    codeLine: line(8),
    state: draw(layout, base({ pile: { title, items: items(() => "done") }, tone: () => "hit" })),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log n). Sorting the ${meetings.length} meetings by start costs the most. After that, each meeting looked only at the top, with at most one take and one drop.`,
      codeLine: 0,
      state: draw(layout, base({ pile: { title, items: items(() => "done") }, tone: () => "hit", counter: { label: "takes and drops", value: moves } })),
    });
    frames.push({
      scene,
      caption: `Space: O(n). The pile holds one end time per open room. Here at most ${fullest.length}, but if every meeting overlapped, it would hold all ${meetings.length}.`,
      codeLine: 1,
      state: draw(layout, base({ pile: { title, lit: true, items: fullest.map((busy) => chip(busy, "window")) }, tone: () => "hit" })),
    });
  }
  return frames;
}

/** Lanes leave room for the trap's needless extra room, so the picture never grows mid-story. */
const strictRooms = (meetings: Meeting[]) => Math.max(...assign(meetings, true).values(), 0) + 1;

function layoutFor(meetings: Meeting[], levels: number, lanes: number): Layout {
  return { levels, lanes, max: Math.max(...meetings.map((meeting) => meeting.end), 1) };
}

export const meetingRoomsIIStory: ProblemStory<HeapPileState> = {
  slugs: ["lc-253"],
  pattern: "Heap / top K",
  trigger: "meetings (start and end times) and the question “how many rooms at the least?”",
  insight: "Take meetings by start time. A sorting pile holds each room's end time, earliest on top. If the top is not later than the start, reuse that room; else open a new one.",
  metaphor: { name: "The sorting pile", legend: "pile = ends, the priority queue of end times · top = ends.peek() · a room = one seat in the pile", terms: ["pile", "top", "room", "free"] },
  traps: [{ name: "The Back-to-Back Trap", rule: "A room that frees at 5 can host a meeting that starts at 5. Test ends.peek() <= start, not < start." }],
  template: [
    "sort the intervals by start;",
    "pile = new PriorityQueue (earliest end on top);",
    "for (interval : intervals) {",
    "    if (pile is not empty and pile.peek() <= interval.start) pile.poll();   // reuse",
    "    pile.add(interval.end);",
    "}",
    "answer = pile.size();",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n log n)",
    timeWhy: "sorting by start dominates; each meeting then costs one look at the top and at most one take and one drop",
    space: "O(n)",
    spaceWhy: "if every meeting overlaps, the pile holds an end time for each",
  },
  code: CODE,
  examples: [
    { label: "[[0,30],[5,10],[15,20]]", input: "0-30, 5-10, 15-20", expected: "2" },
    { label: "[[5,10],[1,5],[2,7]]", input: "5-10, 1-5, 2-7", expected: "2", note: "Tricky: one ends exactly when another starts" },
    { label: "[[7,10],[2,4]]", input: "7-10, 2-4", expected: "1" },
    { label: "[[1,10],[2,9],[3,8]]", input: "1-10, 2-9, 3-8", expected: "3", note: "Everything overlaps" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-56", title: "Merge Intervals" },
    { slug: "lc-435", title: "Non-overlapping Intervals" },
    { slug: "lc-621", title: "Task Scheduler" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const meetings = parse(input);
    const practice = parse(PRACTICE);
    const levels = pileLevels(Math.max(solve(meetings), solve(practice)));
    const lanes = Math.max(strictRooms(meetings), strictRooms(practice));
    const layout = layoutFor(meetings, levels, lanes);
    const { placed, pile } = run(meetings);
    return [
      ...pictureFrames(meetings, layout),
      ...slowFrames(meetings, layout),
      ...insightFrames(meetings, layout),
      ...solutionFrames(meetings, layout),
      ...solutionFrames(practice, layoutFor(practice, levels, lanes), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(layout, { pile: { title: "pile · earliest end on top", items: pile.items.map((busy, index) => chip(busy, index === 0 ? "edge" : "idle")) }, order: byStart(meetings), tone: () => "hit", lane: (meeting) => placed.get(meeting) ?? null }),
      },
    ];
  },
  View: HeapPileView,
};
