import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<LinkedListReverseState>;

/** Fresh even palindrome: the reversed half is the one that must stop the compare. */
const PRACTICE = "[7,8,8,7]";

const CODE = [
  "ListNode slow = head, fast = head;",
  "while (fast != null && fast.next != null) {",
  "    slow = slow.next;",
  "    fast = fast.next.next;",
  "}",
  "ListNode prev = null;",
  "while (slow != null) {",
  "    ListNode next = slow.next;",
  "    slow.next = prev;",
  "    prev = slow;",
  "    slow = next;",
  "}",
  "ListNode front = head;",
  "ListNode back = prev;",
  "while (back != null) {",
  "    if (front.val != back.val) return false;",
  "    front = front.next;",
  "    back = back.next;",
  "}",
  "return true;",
];

function parseList(input: string): number[] {
  return input
    .replace(/[[\]]/g, "")
    .split(/->|,/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

type ListNode = { value: number; next: ListNode | null };

function solve(values: number[]): string {
  let head: ListNode | null = null;
  for (let index = values.length - 1; index >= 0; index--) head = { value: values[index], next: head };
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow?.next ?? null;
    fast = fast.next.next;
  }
  let prev: ListNode | null = null;
  while (slow !== null) {
    const next = slow.next;
    slow.next = prev;
    prev = slow;
    slow = next;
  }
  let front = head;
  let back = prev;
  while (back !== null) {
    if (front?.value !== back.value) return "false";
    front = front.next;
    back = back.next;
  }
  return "true";
}

type Yard = { cells: TrainCell[]; end: number; values: number[] };

function yard(values: number[]): Yard {
  const cells: TrainCell[] = [...values.map((value) => ({ label: String(value), kind: "car" as const })), { label: "null", kind: "null" }];
  return { cells, end: values.length, values };
}

function forward(place: Yard): (number | null)[] {
  return place.cells.map((_, index) => (index === place.end ? null : index + 1));
}

function shot(place: Yard, links: (number | null)[], paint: (cell: number) => CellTone | null, pointers: TrainPointer[] = [], extra: Partial<LinkedListReverseState> = {}): LinkedListReverseState {
  return { cells: place.cells, slots: place.cells.map((_, index) => index), links: [...links], tones: place.cells.map((_, cell) => paint(cell) ?? "idle"), pointers, ...extra };
}

function nameOf(place: Yard, cell: number): string {
  if (cell === place.end) return "null";
  const label = place.cells[cell].label;
  const same = place.values.map((_, index) => index).filter((index) => String(place.values[index]) === label);
  if (same.length < 2) return `the car ${label}`;
  if (cell === same[0]) return `the first car ${label}`;
  if (cell === same[same.length - 1]) return `the last car ${label}`;
  return `the car ${label}`;
}

function pictureFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const ok = solve(values) === "true";
  return [
    {
      scene: "picture",
      caption: `This train has ${values.length} car${values.length === 1 ? "" : "s"}: ${values.join(", ")}. A palindrome reads the same forwards and backwards.`,
      state: shot(place, links, () => null),
    },
    {
      scene: "picture",
      caption: ok
        ? `Reading from the front or from the back gives the same numbers. Couplings only lead forward, so you cannot simply walk backwards.`
        : `Reading from the back would not match the front. Couplings only lead forward, so you cannot simply walk backwards to check.`,
      state: shot(place, links, (cell) => (cell === 0 || cell === values.length - 1 ? "window" : null)),
    },
    {
      scene: "picture",
      caption: `The goal: answer true if the train is a palindrome, false if it is not. Here the answer is ${solve(values)}.`,
      state: shot(place, links, (cell) => (place.cells[cell].kind === "car" ? (ok ? "done" : "miss") : null)),
    },
  ];
}

function slowFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const frames: Frame[] = [];
  let walked = 0;
  let ok = true;
  const half = Math.floor(values.length / 2);
  for (let i = 0; i < half; i++) {
    const target = values.length - 1 - i;
    walked += target + 1;
    if (values[i] !== values[target]) ok = false;
    if (i > 1) continue;
    frames.push({
      scene: "slow",
      caption:
        i === 0
          ? `The slow way: match the first car with the last. Couplings only lead forward, so walk from the front to the last car.`
          : `Match the next pair the same way: from the front again, all the way to its partner.`,
      state: { ...shot(place, links, (cell) => (cell === i ? "edge" : cell === target ? "window" : cell < target ? "faded" : null)), counter: { label: "cars walked past", value: walked } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That was ${walked} cars walked past for ${values.length} cars. This is O(n²) time: each pair restarts from the front.`,
    state: { ...shot(place, links, () => "faded"), counter: { label: "cars walked past", value: walked }, note: ok ? "matches" : "a pair missed" },
  });
  return frames;
}

function midCell(values: number[]): number {
  let slow = 0;
  let fast = 0;
  while (fast + 1 < values.length && fast + 2 <= values.length) {
    if (fast + 2 > values.length) break;
    slow += 1;
    fast += 2;
    if (fast >= values.length) break;
  }
  // Match Java: while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
  slow = 0;
  fast = 0;
  const end = values.length;
  while (fast !== end && fast + 1 !== end) {
    slow += 1;
    fast += 2;
    if (fast > end) fast = end;
  }
  return slow;
}

function insightFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const mid = midCell(values);
  let p: number | null = null;
  let cur = mid;
  const rev = [...links];
  while (cur !== place.end) {
    const realNext = cur + 1 < values.length ? cur + 1 : place.end;
    rev[cur] = p;
    p = cur;
    cur = realNext;
  }
  return [
    {
      scene: "insight",
      caption: "Picture turning the second half of the train around. Then walk the front half and the turned half together, car by car.",
      state: shot(place, links, (cell) => (cell >= mid && cell < place.end ? "window" : null), [
        { name: "slow", at: mid, tone: "accent" },
        { name: "fast", at: Math.min(mid * 2, place.end), tone: "teal" },
      ]),
    },
    {
      scene: "insight",
      caption: `The Over-Compare Trap: keep comparing after the turned half has ended, and you walk into a mess of reversed couplings.`,
      state: { ...shot(place, rev, (cell) => (cell === mid ? "miss" : cell > mid ? "window" : null), [{ name: "front", at: 0, tone: "accent" }, { name: "back", at: place.end, tone: "teal" }]), lost: values.length > mid ? [mid] : null },
    },
    {
      scene: "insight",
      caption: "Stop when the turned half runs out. On an odd train the middle car compares once, which is fine.",
      state: shot(place, rev, (cell) => (cell < mid ? "done" : null), [
        { name: "front", at: 0, tone: "accent" },
        { name: "back", at: p ?? place.end, tone: "teal" },
      ]),
    },
  ];
}

function stopQuiz(place: Yard): StoryQuiz {
  const feedback: Record<number, string> = {
    [0]: "That is the front of the first half. The turned half is the one that must run out.",
  };
  place.values.forEach((_, cell) => {
    if (cell === 0) return;
    feedback[cell] = "A car still sits here. The compare stops when the turned half has no car left.";
  });
  delete feedback[place.end];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "The next compare is about to run. If the turned half is spent, where do we stop? Click that box.",
    answer: place.end,
    feedback,
    otherwise: "The turned half is the shorter or equal one. Stop on its null, not by walking the front until it ends.",
    why: "Stop on null of the turned half. Walking the front until it ends is the Over-Compare Trap.",
  };
}

function compareQuiz(place: Yard, front: number, back: number): StoryQuiz {
  const match = place.cells[front].label === place.cells[back].label;
  return {
    kind: "choice",
    question: "Do these two cars match, or does the palindrome fail here?",
    options: ["These two cars match. Step both forward.", "These two cars differ. The train is not a palindrome."],
    answer: match ? 0 : 1,
    why: match ? `Both show ${place.cells[front].label}, so the pair is fine.` : `The car ${place.cells[front].label} does not match the car ${place.cells[back].label}.`,
  };
}

function solutionFrames(values: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let slow = 0;
  let fast = 0;
  const end = place.end;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new train: ${values.join(", ")}. You stop the compare yourself.` : "Slow and fast start on the first car. Fast will jump two cars at a time to find the second half.",
    codeLine: line(0),
    state: shot(place, links, () => null, [
      { name: "slow", at: 0, tone: "accent" },
      { name: "fast", at: 0, tone: "teal" },
    ]),
  });

  while (fast !== end && fast + 1 !== end) {
    slow += 1;
    fast += 2;
    if (fast > end) fast = end;
    frames.push({
      scene,
      caption: `Slow steps one car. Fast jumps two. Slow is on ${nameOf(place, slow)}.`,
      codeLine: line(2),
      state: shot(place, links, (cell) => (cell === slow ? "edge" : cell === Math.min(fast, end) ? "window" : null), [
        { name: "slow", at: slow, tone: "accent" },
        { name: "fast", at: Math.min(fast, end), tone: "teal" },
      ]),
    });
  }

  frames.push({
    scene,
    caption: `Fast has no two-car jump left. Slow sits on ${nameOf(place, slow)}, the start of the second half. Turn that half around.`,
    codeLine: line(5),
    state: shot(place, links, (cell) => (cell >= slow && cell < end ? "window" : null), [{ name: "slow", at: slow, tone: "accent" }]),
  });

  let prev: number | null = null;
  let cur = slow;
  while (cur !== end) {
    const nxt = cur + 1 <= end ? cur + 1 : end;
    links[cur] = prev;
    prev = cur;
    cur = nxt;
    frames.push({
      scene,
      caption: `Swing the coupling of ${nameOf(place, prev)}. The second half turns, one car at a time.`,
      codeLine: line(8),
      state: { ...shot(place, links, (cell) => (cell === prev ? "done" : null), [{ name: "hook", at: prev, tone: "ink" }]), freshLink: prev },
    });
  }

  let front = 0;
  let back = prev ?? end;
  let askedStop = false;
  let askedCmp = false;
  while (back !== end) {
    frames.push({
      scene,
      caption: `Compare ${nameOf(place, front)} with ${nameOf(place, back)}.`,
      codeLine: line(15),
      state: shot(place, links, (cell) => (cell === front || cell === back ? "edge" : null), [
        { name: "front", at: front, tone: "accent" },
        { name: "back", at: back, tone: "teal" },
      ]),
      quiz: practice || !askedCmp ? compareQuiz(place, front, back) : undefined,
    });
    askedCmp = true;
    if (place.cells[front].label !== place.cells[back].label) {
      frames.push({
        scene,
        caption: `They differ. The train is not a palindrome. The answer is false.`,
        codeLine: line(15),
        state: shot(place, links, (cell) => (cell === front || cell === back ? "miss" : null), [
          { name: "front", at: front, tone: "accent" },
          { name: "back", at: back, tone: "teal" },
        ]),
      });
      if (!practice) {
        frames.push({ scene, caption: `Time: O(n). Find the middle, turn the second half, and compare: each is one walk.`, codeLine: 1, state: { ...shot(place, links, () => "faded"), counter: { label: "cars visited", value: values.length } } });
        frames.push({ scene, caption: "Space: O(1). Only a handful of markers. The second half turns on the same cars.", codeLine: 5, state: shot(place, links, () => null) });
      }
      return frames;
    }
    front = front + 1 < end ? links[front] === null && front + 1 < slow ? front + 1 : front + 1 : end;
    if (front > end) front = end;
    // front should follow original first-half chain: 0 -> 1 -> ... which may now be broken at mid
    // After reverse from `slow`, first half still 0 -> 1 -> ... -> slow (slow now points backward)
    // So walking front by +1 until we compared enough is OK if we use original next for first half.
    back = links[back] ?? end;
    if (back === end && (practice || !askedStop)) {
      askedStop = true;
      frames.push({
        scene,
        caption: "The turned half has no car left. One more compare would walk into reversed couplings.",
        codeLine: line(14),
        state: shot(place, links, (cell) => (cell === front ? "window" : null), [
          { name: "front", at: Math.min(front, end), tone: "accent" },
          { name: "back", at: end, tone: "teal" },
        ]),
        quiz: stopQuiz(place),
      });
      if (!practice) {
        frames.push({
          scene,
          caption: "The Over-Compare Trap is to keep going while the front half still has cars. Stop here instead.",
          codeLine: line(14),
          state: { ...shot(place, links, (cell) => (cell === front && front !== end ? "miss" : null), [{ name: "front", at: Math.min(front, end), tone: "accent" }, { name: "back", at: end, tone: "teal" }]), lost: front !== end ? [front] : null },
        });
      }
    }
  }

  // Fix front walking: I used a messy expression. For first half, original next is cell+1 until slow.
  // Already compared all. Answer true.

  frames.push({
    scene,
    caption: practice ? `The turned half ended. Every pair matched. The answer is true.` : `The turned half ended. Every pair matched. The answer is true.`,
    codeLine: line(19),
    state: shot(place, links, (cell) => (cell < place.end ? "done" : null)),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Find the middle, turn the second half, and compare: each is one walk of the train.`,
      codeLine: 1,
      state: { ...shot(place, links, (cell) => (cell < place.end ? "done" : null)), counter: { label: "cars visited", value: values.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only a handful of markers. The second half turns on the same cars.",
      codeLine: 5,
      state: shot(place, links, (cell) => (cell < place.end ? "done" : null), [{ name: "back", at: prev ?? end, tone: "teal" }]),
    });
  }
  return frames;
}

export const palindromeLinkedListStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-234"],
  pattern: "Reverse the second half",
  trigger: "whether a singly linked list reads the same forwards and backwards, with little extra memory if you can",
  insight: "Turn the second half of the train around, then walk the front half and the turned half together. Stop when the turned half runs out.",
  metaphor: { name: "Two halves of a train", legend: "slow = start of second half · front = first half walker · back = reversed-half walker", terms: ["car", "train", "coupling", "half", "front", "back"] },
  traps: [
    {
      name: "The Over-Compare Trap",
      rule: "Stop when the turned half has no car left. Walking the front until it ends steps into reversed couplings.",
    },
  ],
  template: [
    "slow and fast find the start of the second half;",
    "turn the second half around;",
    "front = first car; back = new first of the turned half;",
    "while the turned half still has a car: compare, then both step;",
    "if a pair differs, false; if the turned half ends, true;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "find the middle, turn the second half, and compare: each is one walk",
    space: "O(1)",
    spaceWhy: "only a handful of markers; the second half turns on the same cars",
  },
  code: CODE,
  examples: [
    { label: "[1,2,2,1]", input: "[1,2,2,1]", expected: "true" },
    { label: "[1,3,1]", input: "[1,3,1]", expected: "true", note: "Odd length: the middle compares once" },
    { label: "[1,2]", input: "[1,2]", expected: "false" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-125", title: "Valid Palindrome" },
    { slug: "lc-206", title: "Reverse Linked List" },
    { slug: "lc-143", title: "Reorder List" },
  ],
  answer: (input) => solve(parseList(input)),
  frames: (input) => {
    const values = parseList(input);
    const practice = parseList(PRACTICE);
    return [...pictureFrames(values), ...slowFrames(values), ...insightFrames(values), ...solutionFrames(values), ...solutionFrames(practice, "card", true), { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: shot(yard(values), forward(yard(values)), () => null) }];
  },
  View: LinkedListReverseView,
};
