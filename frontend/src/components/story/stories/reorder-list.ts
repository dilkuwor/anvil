import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<LinkedListReverseState>;

/** Fresh even train: the cut before the reverse is the trap. */
const PRACTICE = "[8,2,5,1]";

const CODE = [
  "ListNode slow = head, fast = head;",
  "while (fast.next != null && fast.next.next != null) {",
  "    slow = slow.next;",
  "    fast = fast.next.next;",
  "}",
  "ListNode second = slow.next;",
  "slow.next = null;",
  "ListNode prev = null;",
  "while (second != null) {",
  "    ListNode next = second.next;",
  "    second.next = prev;",
  "    prev = second;",
  "    second = next;",
  "}",
  "ListNode first = head;",
  "while (prev != null) {",
  "    ListNode firstNext = first.next;",
  "    ListNode prevNext = prev.next;",
  "    first.next = prev;",
  "    prev.next = firstNext;",
  "    first = firstNext;",
  "    prev = prevNext;",
  "}",
  "return head;",
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
  if (values.length <= 1) return values.join("->");
  let head: ListNode | null = null;
  for (let index = values.length - 1; index >= 0; index--) head = { value: values[index], next: head };
  let slow = head;
  let fast = head;
  while (fast?.next && fast.next.next) {
    slow = slow?.next ?? null;
    fast = fast.next.next;
  }
  let second = slow?.next ?? null;
  if (slow) slow.next = null;
  let prev: ListNode | null = null;
  while (second !== null) {
    const next = second.next;
    second.next = prev;
    prev = second;
    second = next;
  }
  let first = head;
  while (prev !== null) {
    const firstNext = first?.next ?? null;
    const prevNext = prev.next;
    if (first) first.next = prev;
    prev.next = firstNext;
    first = firstNext;
    prev = prevNext;
  }
  const out: number[] = [];
  for (let node = head; node !== null; node = node.next) out.push(node.value);
  return out.join("->");
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
  return `the car ${place.cells[cell].label}`;
}

function middleCell(n: number): number {
  let slow = 0;
  let fast = 0;
  while (fast + 1 < n && fast + 2 < n) {
    slow += 1;
    fast += 2;
  }
  return slow;
}

function pictureFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  return [
    {
      scene: "picture",
      caption: `This train is ${values.join(", ")}. Reorder it to first, last, second, second-last, by changing couplings only.`,
      state: shot(place, links, () => null),
    },
    {
      scene: "picture",
      caption: values.length >= 2 ? `The first car stays first. The last car, ${nameOf(place, values.length - 1)}, should come second.` : "A single car is already in order.",
      state: shot(place, links, (cell) => (cell === 0 ? "done" : cell === values.length - 1 ? "window" : null)),
    },
    {
      scene: "picture",
      caption: `The goal: the train ${solve(values)}.`,
      state: shot(place, links, (cell) => (place.cells[cell].kind === "car" ? "done" : null)),
    },
  ];
}

function slowFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const frames: Frame[] = [];
  const order = solve(values).split("->").filter(Boolean).map(Number);
  let walked = 0;
  const built: number[] = [];
  order.forEach((value, round) => {
    const at = values.indexOf(value);
    walked += at + 1;
    built.push(value);
    if (round > 1) return;
    frames.push({
      scene: "slow",
      caption:
        round === 0
          ? `The slow way: pick first, last, second, second-last, each time walking from the front to find that car.`
          : `The next car is ${value}. Walk from the front again. The same cars are passed over and over.`,
      state: { ...shot(place, links, (cell) => (cell === at ? "edge" : cell < at ? "window" : null)), counter: { label: "cars walked past", value: walked }, note: `new train: ${built.join(" ")}` },
    });
  });
  frames.push({
    scene: "slow",
    caption: `That was ${walked} cars walked past for a train of ${values.length}. This is O(n²) time.`,
    state: { ...shot(place, links, () => "faded"), counter: { label: "cars walked past", value: walked } },
  });
  return frames;
}

function insightFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const mid = middleCell(values.length);
  const uncut = [...links];
  const cut = [...links];
  cut[mid] = place.end;
  return [
    {
      scene: "insight",
      caption: "Find the middle, cut the train in two, turn the second half around, then weave: one car from the left, one from the turned right.",
      state: shot(place, links, (cell) => (cell === mid ? "edge" : null), [{ name: "slow", at: mid, tone: "accent" }]),
    },
    {
      scene: "insight",
      caption: `The Uncut Reverse Trap: turn the second half while it is still hooked to the first, and the weave walks into a loop.`,
      state: { ...shot(place, uncut, (cell) => (cell > mid ? "miss" : cell === mid ? "window" : null)), lost: values.length > mid + 1 ? [mid + 1, values.length - 1] : [mid] },
    },
    {
      scene: "insight",
      caption: "Cut first: the middle car hooks null. Now the two halves are separate trains, and the second half can turn safely.",
      state: { ...shot(place, cut, (cell) => (cell === mid ? "done" : cell > mid && cell < place.end ? "window" : null)), freshLink: mid },
    },
  ];
}

function cutQuiz(place: Yard, mid: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [mid]: "The middle car stays in the first half. Its coupling is what must change.",
    [0]: "The first car is not the cut. The cut is after the middle.",
  };
  if (mid + 1 < place.end) feedback[mid + 1] = "That car belongs to the second half. The cut happens behind it.";
  delete feedback[place.end];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "The middle car is found. Where must its coupling point, so the two halves are separate? Click that box.",
    answer: place.end,
    feedback,
    otherwise: "The first half must end. Hook the middle car onto the null at the end.",
    why: `The middle car, ${nameOf(place, mid)}, hooks null. That is the cut. Turning without it is the Uncut Reverse Trap.`,
  };
}

function weaveQuiz(place: Yard, first: number, prev: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [first]: "The left car is already in the new train. It must hook a car from the turned half.",
    [place.end]: "The turned half still has a car to weave in.",
  };
  delete feedback[prev];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: `The left car is ${nameOf(place, first)}. Which car of the turned half does it hook next? Click it.`,
    answer: prev,
    feedback,
    otherwise: "Weave takes the current first car of the turned half.",
    why: `It hooks ${nameOf(place, prev)}, the current first car of the turned half.`,
  };
}

function solutionFrames(values: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = values.length;
  if (n <= 1) {
    frames.push({
      scene,
      caption: `One car, or none: already in order. The answer is ${solve(values) || "empty"}.`,
      codeLine: line(23),
      state: shot(place, links, (cell) => (cell < n ? "done" : null)),
    });
    if (!practice) {
      frames.push({ scene, caption: "Time: O(n). A tiny train still follows the same three walks.", codeLine: 1, state: shot(place, links, () => null) });
      frames.push({ scene, caption: "Space: O(1). Only a handful of markers. The cars themselves are reused.", codeLine: 7, state: shot(place, links, () => null) });
    }
    return frames;
  }

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new train: ${values.join(", ")}. You cut, turn, and weave.` : "Slow and fast start on the first car. Fast will jump two to find the middle.",
    codeLine: line(0),
    state: shot(place, links, () => null, [
      { name: "slow", at: 0, tone: "accent" },
      { name: "fast", at: 0, tone: "teal" },
    ]),
  });

  let slow = 0;
  let fast = 0;
  while (fast + 1 < n && fast + 2 < n) {
    slow += 1;
    fast += 2;
    frames.push({
      scene,
      caption: `Slow steps one. Fast jumps two. Slow is on ${nameOf(place, slow)}.`,
      codeLine: line(2),
      state: shot(place, links, (cell) => (cell === slow ? "edge" : cell === fast ? "window" : null), [
        { name: "slow", at: slow, tone: "accent" },
        { name: "fast", at: fast, tone: "teal" },
      ]),
    });
  }

  const second = slow + 1 < n ? slow + 1 : place.end;
  if (!practice) {
    frames.push({
      scene,
      caption: `The Uncut Reverse Trap: turn ${nameOf(place, second)} while it is still hooked to ${nameOf(place, slow)}, and the weave later walks a loop.`,
      codeLine: line(6),
      state: { ...shot(place, links, (cell) => (cell === slow ? "window" : cell >= second && cell < n ? "miss" : null)), lost: second < n ? [second] : null },
    });
  }
  frames.push({
    scene,
    caption: `Slow sits on ${nameOf(place, slow)}, the end of the first half. Cut before you turn.`,
    codeLine: line(6),
    state: shot(place, links, (cell) => (cell === slow ? "edge" : null), [{ name: "slow", at: slow, tone: "accent" }]),
    quiz: cutQuiz(place, slow),
  });
  links[slow] = place.end;
  frames.push({
    scene,
    caption: `${nameOf(place, slow).replace(/^the /, "The ")} now hooks null. The second half starts at ${nameOf(place, second)}.`,
    codeLine: line(6),
    state: { ...shot(place, links, (cell) => (cell === slow ? "done" : cell >= second && cell < n ? "window" : null)), freshLink: slow },
  });

  let prev: number | null = null;
  let cur = second;
  while (cur !== place.end && cur !== null) {
    const saved = links[cur] ?? place.end;
    links[cur] = prev;
    prev = cur;
    cur = saved === place.end ? place.end : saved;
    frames.push({
      scene,
      caption: `Turn the second half: the coupling of ${nameOf(place, prev)} swings round.`,
      codeLine: line(10),
      state: { ...shot(place, links, (cell) => (cell === prev ? "done" : null), [{ name: "hook", at: prev, tone: "ink" }]), freshLink: prev },
    });
  }

  let first = 0;
  let askedWeave = false;
  while (prev !== null && prev !== place.end) {
    const firstNext = links[first] ?? place.end;
    const prevNext = links[prev] ?? place.end;
    frames.push({
      scene,
      caption: `Weave: ${nameOf(place, first)} from the left half, and ${nameOf(place, prev)} from the turned half.`,
      codeLine: line(18),
      state: shot(place, links, (cell) => (cell === first || cell === prev ? "edge" : null), [
        { name: "left", at: first, tone: "accent" },
        { name: "right", at: prev, tone: "teal" },
      ]),
      quiz: practice || !askedWeave ? weaveQuiz(place, first, prev) : undefined,
    });
    askedWeave = true;
    links[first] = prev;
    links[prev] = firstNext;
    frames.push({
      scene,
      caption: `${nameOf(place, first).replace(/^the /, "The ")} hooks ${nameOf(place, prev)}, which then hooks ${nameOf(place, firstNext)}.`,
      codeLine: line(19),
      state: { ...shot(place, links, (cell) => (cell === first || cell === prev ? "done" : null)), freshLink: first },
    });
    first = firstNext;
    prev = prevNext === place.end ? null : prevNext;
  }

  const answer = solve(values);
  frames.push({
    scene,
    caption: practice ? `Done. Follow the couplings from the first car. The answer is ${answer}.` : `Follow the couplings from the first car. The answer is ${answer}.`,
    codeLine: line(23),
    state: shot(place, links, (cell) => (cell < n ? "done" : null)),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Find the middle, turn the second half, and weave: each is one walk of the train.`,
      codeLine: 1,
      state: { ...shot(place, links, (cell) => (cell < n ? "done" : null)), counter: { label: "cars visited", value: n } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only a handful of markers. The cars themselves are reused.",
      codeLine: 7,
      state: shot(place, links, (cell) => (cell < n ? "done" : null)),
    });
  }
  return frames;
}

export const reorderListStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-143"],
  pattern: "Find middle, reverse, weave",
  trigger: "reorder a list to first, last, second, second-last, and so on, by changing couplings only",
  insight: "Find the middle, cut the train in two, turn the second half around, then weave one car from the left with one from the turned right.",
  metaphor: { name: "Cut, turn, weave", legend: "slow = end of first half · second / prev = reversed half · first = left half walker", terms: ["car", "train", "coupling", "half", "cut", "weave"] },
  traps: [
    {
      name: "The Uncut Reverse Trap",
      rule: "Hook the middle car onto null before turning the second half. If the halves stay joined, the weave walks into a loop.",
    },
  ],
  template: [
    "slow and fast find the end of the first half;",
    "cut: middle hooks null; keep the second half;",
    "turn the second half around;",
    "weave: left car hooks turned car, turned car hooks the old left-next;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "find the middle, turn the second half, and weave: each is one walk",
    space: "O(1)",
    spaceWhy: "only a handful of markers; the cars themselves are reused",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4]", input: "[1,2,3,4]", expected: "1->4->2->3" },
    { label: "[1,2,3]", input: "[1,2,3]", expected: "1->3->2", note: "Odd length: the middle stays in the first half" },
    { label: "[1,2]", input: "[1,2]", expected: "1->2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-206", title: "Reverse Linked List" },
    { slug: "lc-234", title: "Palindrome Linked List" },
    { slug: "lc-148", title: "Sort List" },
  ],
  answer: (input) => solve(parseList(input)),
  frames: (input) => {
    const values = parseList(input);
    return [...pictureFrames(values), ...slowFrames(values), ...insightFrames(values), ...solutionFrames(values), ...solutionFrames(parseList(PRACTICE), "card", true), { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: shot(yard(values), forward(yard(values)), () => null) }];
  },
  View: LinkedListReverseView,
};
