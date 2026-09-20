import type { CellTone } from "@/components/learn/viz/primitives";

import { HistogramRectangleView, type HistogramRectState } from "../histogram-rectangle-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<HistogramRectState>;
type Rect = NonNullable<HistogramRectState["rect"]>;

/** Fresh input for the "your turn" run. Bar 1 reaches left over the taller bar 0, so it hits the trap. */
const PRACTICE = "3,2,4,1";

const CODE = [
  "int n = heights.length, best = 0;",
  "Deque<Integer> growing = new ArrayDeque<>(); // bar numbers, heights never go down",
  "for (int i = 0; i <= n; i++) {",
  "    int h = (i == n) ? 0 : heights[i]; // the end of the row blocks everyone",
  "    while (!growing.isEmpty() && h < heights[growing.peekLast()]) {",
  "        int tall = heights[growing.pollLast()];",
  "        int leftWall = growing.isEmpty() ? -1 : growing.peekLast();",
  "        int width = i - leftWall - 1;",
  "        best = Math.max(best, tall * width);",
  "    }",
  "    growing.addLast(i);",
  "}",
  "return best;",
];

function parse(input: string): number[] {
  return input
    .replace(/[[\]\s]/g, "")
    .split(",")
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

type Span = { left: number; right: number; height: number; area: number };

/** Independent solver: stretch left and right from every bar. Slow, but obviously right. */
function solve(heights: number[]): Span {
  let best: Span = { left: 0, right: 0, height: 0, area: 0 };
  heights.forEach((height, bar) => {
    let left = bar;
    let right = bar;
    while (left > 0 && heights[left - 1] >= height) left--;
    while (right < heights.length - 1 && heights[right + 1] >= height) right++;
    const area = height * (right - left + 1);
    if (area > best.area) best = { left, right, height, area };
  });
  return best;
}

/** The rectangle the real algorithm settles on, so the pictures before and after the run show the same one. */
function stackBest(heights: number[]): Span {
  const n = heights.length;
  const growing: number[] = [];
  let best: Span = { left: 0, right: 0, height: 0, area: 0 };
  for (let i = 0; i <= n; i++) {
    const h = i === n ? 0 : heights[i];
    while (growing.length > 0 && h < heights[growing[growing.length - 1]]) {
      const height = heights[growing.pop()!];
      const left = growing.length === 0 ? 0 : growing[growing.length - 1] + 1;
      const area = height * (i - left);
      if (area > best.area) best = { left, right: i - 1, height, area };
    }
    growing.push(i);
  }
  return best;
}

const checks = (count: number) => `${count} height check${count === 1 ? "" : "s"}`;

function nameBars(list: number[]): string {
  const names = list.map((bar) => `bar ${bar}`);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function cover(left: number, right: number): string {
  return left === right ? `only bar ${left}` : `bar ${left} to bar ${right}`;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(heights: number[]): HistogramRectState {
  return { heights, tones: tones(heights.length, () => null), arriving: null, growing: [], best: null };
}

function drawn(span: { left: number; right: number; height: number }, tone: Rect["tone"]): Rect {
  const width = span.right - span.left + 1;
  return { left: span.left, right: span.right, height: span.height, tone, label: `${width} wide, ${span.height} tall: area ${width * span.height}` };
}

function pictureFrames(heights: number[]): F[] {
  const n = heights.length;
  const best = stackBest(heights);
  const lowest = Math.min(...heights);
  const frames: F[] = [
    { scene: "picture", caption: `This is a row of ${n} bars. The number on each bar is its height, and every bar is 1 wide.`, state: blank(heights) },
    {
      scene: "picture",
      caption: `A rectangle must stay inside the bars. One across the whole row can only be ${lowest} tall, like the shortest bar. Its area is ${lowest * n}.`,
      state: { ...blank(heights), rect: drawn({ left: 0, right: n - 1, height: lowest }, "measure") },
    },
  ];
  // Stretch the best rectangle over one shorter neighbour: that one sticks out.
  const over = best.right < n - 1 ? best.right + 1 : best.left > 0 ? best.left - 1 : null;
  const tallest = Math.max(...heights);
  // If the best one already spans the row, a too-tall one across the row makes the same point.
  const wrong = over !== null ? { left: Math.min(best.left, over), right: Math.max(best.right, over), height: best.height, above: over } : tallest > lowest ? { left: 0, right: n - 1, height: tallest, above: heights.indexOf(lowest) } : null;
  if (wrong) {
    frames.push({
      scene: "picture",
      caption: `It can never be taller than a bar it covers. A rectangle ${wrong.height} tall over ${cover(wrong.left, wrong.right)} would stick out above bar ${wrong.above}. That is not allowed.`,
      state: { ...blank(heights), tones: tones(n, (index) => (index === wrong.above ? "miss" : null)), rect: { left: wrong.left, right: wrong.right, height: wrong.height, tone: "wrong", label: `✕ sticks out above bar ${wrong.above}` } },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the largest area of any allowed rectangle. Here it is ${best.area}.`,
    state: { ...blank(heights), rect: drawn(best, "best"), best: best.area },
  });
  return frames;
}

/** The obvious way, really run: from every bar, stretch left and right until a shorter bar. */
function slowFrames(heights: number[]): F[] {
  const n = heights.length;
  const frames: F[] = [];
  let count = 0;
  let best = 0;
  for (let bar = 0; bar < n; bar++) {
    const height = heights[bar];
    let left = bar;
    let right = bar;
    while (left > 0) {
      count++;
      if (heights[left - 1] < height) break;
      left--;
    }
    while (right < n - 1) {
      count++;
      if (heights[right + 1] < height) break;
      right++;
    }
    const area = height * (right - left + 1);
    best = Math.max(best, area);
    if (bar > 2) continue;
    frames.push({
      scene: "slow",
      caption:
        bar === 0
          ? `The slow way: stand on bar 0 (height ${height}) and stretch left and right until a shorter bar stops you. That covers ${cover(left, right)}: area ${area}.`
          : `Now stand on bar ${bar} (height ${height}) and stretch both ways again. That covers ${cover(left, right)}: area ${area}.`,
      state: { ...blank(heights), arriving: bar, tones: tones(n, (index) => (index === bar ? "edge" : null)), rect: drawn({ left, right, height }, "measure"), best, counter: { label: "height checks", value: count } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `Doing that from every bar took ${checks(count)} for ${n} bars, and found the best area, ${best}. This is O(n²) time: on a flat row, every bar walks over all the others.`,
    state: { ...blank(heights), tones: tones(n, () => "faded"), best, counter: { label: "height checks", value: count } },
  });
  return frames;
}

type Moment = { at: number; room: number[]; blocked: number[] };

/** The first moment a shorter bar blocks somebody, preferring one where several rectangles are growing. */
function firstBlock(heights: number[]): Moment {
  const n = heights.length;
  const growing: number[] = [];
  let fallback: Moment | null = null;
  for (let i = 0; i < n; i++) {
    const room = [...growing];
    const blocked: number[] = [];
    while (growing.length > 0 && heights[i] < heights[growing[growing.length - 1]]) blocked.push(growing.pop()!);
    if (blocked.length > 0) {
      if (room.length > 1) return { at: i, room, blocked };
      fallback ??= { at: i, room, blocked };
    }
    growing.push(i);
  }
  return fallback ?? { at: n, room: [...growing], blocked: [...growing].reverse() };
}

function insightFrames(heights: number[]): F[] {
  const n = heights.length;
  const { at, room, blocked } = firstBlock(heights);
  const stay = room.filter((bar) => !blocked.includes(bar));
  const roomTones = (list: number[]) => (index: number) => (list.includes(index) ? ("window" as const) : null);
  const many = room.length > 1;
  const arrival = at === n ? "The row ends." : `Bar ${at} arrives with height ${heights[at]}.`;
  const keeps = stay.length > 0 ? ` Bar ${stay[stay.length - 1]} (height ${heights[stay[stay.length - 1]]}) keeps growing.` : "";
  return [
    {
      scene: "insight",
      caption: "Picture every bar starting a rectangle of its own height. The rectangle keeps growing to the right while the next bars are at least as tall.",
      state: { ...blank(heights), growing: room, tones: tones(n, roomTones(room)) },
    },
    {
      scene: "insight",
      caption: `Right now the rectangle${many ? "s" : ""} of ${nameBars(room)} ${many ? "are" : "is"} still growing.${many ? " Their heights never go down, because a shorter bar would have blocked the taller ones." : ""}`,
      state: { ...blank(heights), growing: room, tones: tones(n, (index) => (index === room[room.length - 1] ? "edge" : roomTones(room)(index))) },
    },
    {
      scene: "insight",
      caption: `${arrival} That blocks ${nameBars(blocked)}: ${blocked.length > 1 ? "their rectangles are" : "its rectangle is"} finished, so now we can measure ${blocked.length > 1 ? "them" : "it"}.${keeps}`,
      state: { ...blank(heights), arriving: at, growing: stay, tones: tones(n, (index) => (index === at ? "edge" : blocked.includes(index) ? "hit" : roomTones(stay)(index))) },
    },
  ];
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh row:
 * the reader says who is blocked, and how far left each rectangle reaches.
 */
function solutionFrames(heights: number[], scene: SceneId = "solution", practice = false): F[] {
  const n = heights.length;
  const frames: F[] = [];
  const growing: number[] = [];
  let best = 0;
  let bestRect: Rect | null = null;
  let compared = 0;
  let fullest: number[] = [];
  let trapNamed = false;
  const asked = { first: false, next: false, reach: false };
  const moment = firstBlock(heights);
  const showcase = moment.at < n ? moment.at : -1;
  const line = (index: number) => (practice ? undefined : index);
  const top = () => growing[growing.length - 1];

  const paint = (arriving: number | null, special: (index: number) => CellTone | null = () => null) =>
    tones(n, (index) => special(index) ?? (index === arriving ? "edge" : growing.includes(index) ? "window" : null));
  const base = (arriving: number | null): HistogramRectState => ({ heights, tones: paint(arriving), arriving, growing: [...growing], best: best > 0 ? best : null });

  /** Asked before anybody is blocked. `answer` is a bar, or `n` for "nobody". */
  const blockQuiz = (i: number, answer: number, question: string): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (let index = 0; index < n; index++) {
      if (index === answer) continue;
      if (index === i) feedback[index] = `Bar ${index} is the one that just arrived. It blocks others. It is not blocked itself.`;
      else if (index > i) feedback[index] = `Bar ${index} has not arrived yet.`;
      else if (!growing.includes(index)) feedback[index] = `Bar ${index} is not growing any more. Its rectangle was already measured.`;
      else if (heights[i] >= heights[index]) feedback[index] = `Bar ${index} has height ${heights[index]}. The new bar, with height ${heights[i]}, is not shorter than that, so it blocks nothing there.`;
      else feedback[index] = `Bar ${index} will be blocked too, but not yet. The new bar meets the most recent growing bar first.`;
    }
    if (answer !== n) feedback[n] = "Look at the most recent bar that is still growing. Is the new bar shorter than it?";
    return {
      kind: "cell",
      cells: n + 1,
      question,
      answer,
      feedback,
      otherwise: "Only a bar whose rectangle is still growing can be blocked.",
      why: answer === n ? "Nobody. The new bar is not shorter than the most recent growing bar, so every rectangle keeps growing." : `Bar ${answer}. It is the most recent growing bar, and the new bar is shorter than it.`,
    };
  };

  /** Asked after a bar is blocked, before its rectangle is drawn. */
  const reachQuiz = (bar: number, i: number, leftBound: number): StoryQuiz => {
    const tall = heights[bar];
    const feedback: Record<number, string> = {};
    for (let index = 0; index < n; index++) {
      if (index === leftBound) continue;
      if (index < leftBound) feedback[index] = heights[index] < tall ? `Bar ${index} has height ${heights[index]}. A rectangle ${tall} tall would stick out above it.` : `Bar ${index} is tall enough, but a shorter bar stands between it and bar ${bar}.`;
      else if (index === bar) feedback[index] = `The rectangle does not have to start at bar ${bar} itself. Look at the bars just left of it: are they tall enough?`;
      else if (index < bar) feedback[index] = `Bar ${index} is covered, but the rectangle reaches further left than that.`;
      else if (index < i) feedback[index] = `Bar ${index} is covered too, but it is on the right side. The question is about the left end.`;
      else feedback[index] = `Bar ${index} is past the blocked rectangle, which ends just before bar ${i}.`;
    }
    return {
      kind: "cell",
      cells: n,
      numbered: true,
      question: `Bar ${bar} is blocked, and its rectangle is ${tall} tall. How far left does it reach? Click the leftmost bar it covers.`,
      answer: leftBound,
      feedback,
      otherwise: "Walk left from the blocked bar while the bars are at least as tall as it.",
      why:
        leftBound < bar
          ? `Bar ${leftBound}. Every bar from there to bar ${bar} is at least ${tall} tall, so the rectangle covers them all.`
          : bar === 0
            ? "Bar 0. There is nothing to its left, so the rectangle starts at the blocked bar itself."
            : `Bar ${bar}. The bar to its left is shorter, so the rectangle starts at the blocked bar itself.`,
    };
  };

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: ${heights.join(", ")}. You say which bar is blocked, and how far left its rectangle reaches.` : "No bar has arrived yet, so no rectangle is growing. The bars arrive one at a time, from the left.",
    codeLine: line(1),
    state: base(null),
  });

  for (let i = 0; i <= n; i++) {
    const ended = i === n;
    const h = ended ? 0 : heights[i];
    if (ended && growing.length === 0) break;
    const blocksSomeone = growing.length > 0 && h < heights[top()];
    let blockedCount = 0;

    if (ended) {
      frames.push({
        scene,
        caption: "The row has ended. Nothing can grow past the end, so every rectangle still growing is blocked now, the most recent first.",
        codeLine: line(3),
        state: base(n),
      });
    } else if (growing.length > 0 && (blocksSomeone || practice)) {
      const kindAsked = practice || (blocksSomeone && !asked.first && i >= showcase);
      const arrival: F = {
        scene,
        caption: kindAsked
          ? `Bar ${i} arrives with height ${h}. ${growing.length === 1 ? "One rectangle is" : `${growing.length} rectangles are`} still growing.`
          : `Bar ${i} arrives with height ${h}. It is shorter than bar ${top()} (height ${heights[top()]}), the most recent one still growing.`,
        codeLine: line(4),
        state: base(i),
      };
      if (kindAsked) {
        if (blocksSomeone) asked.first = true;
        arrival.state = { ...arrival.state, askNobody: true };
        arrival.quiz = blockQuiz(i, blocksSomeone ? top() : n, "A new bar arrived. Which growing bar is blocked first? Click it, or click “nobody”.");
      }
      frames.push(arrival);
    }

    while (growing.length > 0) {
      compared++;
      if (h >= heights[top()]) break;
      const bar = growing.pop()!;
      blockedCount++;
      const tall = heights[bar];
      const leftBound = growing.length === 0 ? 0 : top() + 1;
      const width = i - leftBound;
      const area = tall * width;
      const reaches = leftBound < bar;

      const blocked: F = {
        scene,
        caption: ended
          ? `Bar ${bar} (height ${tall}) is blocked by the end of the row. Its rectangle cannot grow any more.`
          : blockedCount > 1
            ? `Bar ${bar} (height ${tall}) is taller than the new bar too, so it is blocked as well.`
            : `Bar ${bar} (height ${tall}) is taller than the new bar, so it is blocked. Its rectangle cannot grow any further right.`,
        codeLine: line(5),
        state: { ...base(i), tones: paint(i, (index) => (index === bar ? "hit" : null)) },
      };
      if (practice || (reaches && !asked.reach)) {
        if (reaches) asked.reach = true;
        blocked.quiz = reachQuiz(bar, i, leftBound);
      }
      const isBest = area > best;
      // At the end of the row, a rectangle that changes nothing is told in one frame.
      if (ended && !blocked.quiz && !isBest && (!reaches || trapNamed)) {
        frames.push({
          scene,
          caption: `Bar ${bar} (height ${tall}) is blocked by the end of the row. ${reaches ? "Left reach again: its" : "Its"} rectangle covers ${cover(leftBound, i - 1)}. Area ${area}, which does not beat the best, ${best}.`,
          codeLine: line(7),
          state: { ...blocked.state, rect: drawn({ left: leftBound, right: i - 1, height: tall }, "measure"), wrongSpan: reaches ? { left: bar, right: i - 1, label: `✕ not ${i - bar} wide` } : null },
        });
        continue;
      }
      frames.push(blocked);

      const span = { left: leftBound, right: i - 1, height: tall };
      const verdict = isBest ? (practice ? ", a new best" : "") : `, which does not beat the best, ${best}`;
      const showTrap = reaches && !trapNamed;
      if (reaches) trapNamed = true;
      const between = nameBars(Array.from({ length: bar - leftBound }, (_, offset) => leftBound + offset));
      const measured: F = {
        scene,
        caption: showTrap
          ? `The Left Reach Trap. ${between[0].toUpperCase()}${between.slice(1)} ${bar - leftBound > 1 ? "are" : "is"} at least ${tall} tall, so the rectangle reaches back over ${bar - leftBound > 1 ? "them" : "it"}: ${width} wide, not ${i - bar}. Area ${area}${verdict}.`
          : reaches
            ? `Left reach again: the measured rectangle covers ${cover(leftBound, i - 1)}, over every taller bar. It is ${width} wide and ${tall} tall: area ${area}${verdict}.`
            : `Now it is measured. The rectangle covers ${cover(leftBound, i - 1)}: ${width} wide and ${tall} tall. Area ${area}${verdict}.`,
        codeLine: line(7),
        state: {
          ...base(i),
          tones: paint(i, (index) => (index === bar ? "hit" : null)),
          rect: drawn(span, "measure"),
          wrongSpan: reaches ? { left: bar, right: i - 1, label: `✕ not ${i - bar} wide` } : null,
        },
      };
      if (isBest && practice) {
        best = area;
        bestRect = drawn(span, "best");
        measured.state = { ...measured.state, best };
      }
      if (!ended && growing.length > 0 && (practice || !asked.next)) {
        asked.next = true;
        measured.state = { ...measured.state, askNobody: true };
        measured.quiz = blockQuiz(i, h < heights[top()] ? top() : n, `Bar ${bar} is measured. Is another growing bar blocked now? Click it, or click “nobody”.`);
      }
      frames.push(measured);

      if (isBest && !practice) {
        const old = best;
        best = area;
        bestRect = drawn(span, "best");
        frames.push({
          scene,
          caption: old === 0 ? `It is the first rectangle we measured. New best: ${area}.` : `${area} beats the old best, ${old}. New best: ${area}.`,
          codeLine: line(8),
          state: { ...base(i), tones: paint(i, (index) => (index === bar ? "hit" : null)), rect: bestRect },
        });
      }
    }

    if (ended) break;
    const below = growing.length > 0 ? top() : null;
    growing.push(i);
    if (growing.length > fullest.length) fullest = [...growing];
    frames.push({
      scene,
      caption:
        blockedCount > 0
          ? below === null
            ? `No rectangle is left growing. Bar ${i} starts its own, ${h} tall, growing to the right.`
            : `Bar ${i} is not shorter than bar ${below} (height ${heights[below]}), so nobody else is blocked. Bar ${i} starts growing.`
          : below === null
            ? `Bar ${i} arrives with height ${h}. It starts a rectangle ${h} tall, which is now growing to the right.`
            : practice
              ? `Bar ${i} is not shorter than bar ${below} (height ${heights[below]}), so nobody is blocked. Bar ${i} starts growing too.`
              : `Bar ${i} arrives with height ${h}. It is not shorter than bar ${below}, so nobody is blocked. Bar ${i} starts growing too.`,
      codeLine: line(10),
      state: base(i),
    });
  }

  const finished: HistogramRectState = { ...base(null), rect: bestRect, tones: tones(n, () => null) };
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${best}. You measured every rectangle yourself.` : `Every rectangle has been measured. The answer is ${best}.`,
    codeLine: line(12),
    state: finished,
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each bar starts growing once and is blocked once, so the work cannot pile up. Here that was ${checks(compared)} for ${n} bars.`,
      codeLine: 4,
      state: { ...finished, counter: { label: "height checks", value: compared } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). If every bar were taller than the one before, all of them would be growing at once. Here at most ${fullest.length} ${fullest.length === 1 ? "was" : "were"}.`,
      codeLine: 1,
      state: { ...finished, growing: fullest, growingLit: true },
    });
  }
  return frames;
}

export const largestRectangleInHistogramStory: ProblemStory<HistogramRectState> = {
  slugs: ["lc-84"],
  pattern: "Monotonic stack",
  trigger: "“largest rectangle under a row of bars”, or any “how far can this one stretch before something smaller stops it?”",
  insight: "Every bar starts a rectangle that keeps growing to the right. A shorter bar blocks the taller ones, and a blocked rectangle is finished, so it can be measured.",
  metaphor: {
    name: "The Growing Rectangles",
    legend: "still growing = the stack of bar numbers · blocked = popped · reaches left to = one past the new top of the stack · end of the row = a last bar of height 0",
    terms: ["growing", "blocked", "measured", "reach"],
  },
  traps: [{ name: "The Left Reach Trap", rule: "A blocked bar's rectangle does not start at the bar. It reaches left over every taller bar, to just after the growing bar below it, or to bar 0 if none is left: width = i - leftWall - 1." }],
  template: [
    "keep a stack of positions whose values never go down;",
    "for (i = 0; i <= n; i++) {            // i == n acts as a value smaller than all",
    "    while (stack is not empty && value[i] < value[top of stack]) {",
    "        popped is finished: it spans from just after the new top, to i - 1;",
    "        best = max(best, value[popped] * that width);",
    "    }",
    "    push i;",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each bar starts growing once and is blocked once",
    space: "O(n)",
    spaceWhy: "on a rising row every bar is still growing at the same time",
  },
  code: CODE,
  examples: [
    { label: "[2,1,5,6,2,3]", input: "2,1,5,6,2,3", expected: "10" },
    { label: "[2,4]", input: "2,4", expected: "4", note: "Nobody is blocked until the row ends" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-739", title: "Daily Temperatures" },
    { slug: "lc-42", title: "Trapping Rain Water" },
    { slug: "lc-239", title: "Sliding Window Maximum" },
  ],
  answer: (input) => String(solve(parse(input)).area),
  frames: (input) => {
    const heights = parse(input);
    const best = stackBest(heights);
    return [
      ...pictureFrames(heights),
      ...slowFrames(heights),
      ...insightFrames(heights),
      ...solutionFrames(heights),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(heights), rect: drawn(best, "best"), best: best.area },
      },
    ];
  },
  View: HistogramRectangleView,
};
