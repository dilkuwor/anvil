import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<LinkedListReverseState>;

/** Fresh three-car train: the first split must cut, and the left half is two cars. */
const PRACTICE = "[5,1,4]";

const CODE = [
  "if (head == null || head.next == null) return head;",
  "ListNode slow = head;",
  "ListNode fast = head.next;",
  "while (fast != null && fast.next != null) {",
  "    slow = slow.next;",
  "    fast = fast.next.next;",
  "}",
  "ListNode second = slow.next;",
  "slow.next = null;",
  "return merge(sortList(head), sortList(second));",
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

function chain(values: number[]): ListNode | null {
  let head: ListNode | null = null;
  for (let index = values.length - 1; index >= 0; index--) head = { value: values[index], next: head };
  return head;
}

function read(head: ListNode | null): string {
  const out: number[] = [];
  for (let node = head; node !== null; node = node.next) out.push(node.value);
  return out.join("->");
}

function merge(a: ListNode | null, b: ListNode | null): ListNode | null {
  const dummy: ListNode = { value: 0, next: null };
  let tail = dummy;
  while (a && b) {
    if (a.value <= b.value) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a ?? b;
  return dummy.next;
}

function sortList(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) return head;
  let slow = head;
  let fast: ListNode | null = head.next;
  while (fast !== null && fast.next !== null) {
    slow = slow.next!;
    fast = fast.next.next;
  }
  const second = slow.next;
  slow.next = null;
  return merge(sortList(head), sortList(second));
}

function solve(values: number[]): string {
  return read(sortList(chain(values)));
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

function splitAt(n: number): number {
  if (n <= 1) return 0;
  let slow = 0;
  let fast = 1;
  while (fast < n && fast + 1 < n) {
    slow += 1;
    fast += 2;
  }
  return slow;
}

function pictureFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const sorted = [...values].sort((x, y) => x - y);
  return [
    {
      scene: "picture",
      caption: `This train is ${values.join(", ") || "empty"}. The cars are out of order.`,
      state: shot(place, links, () => null),
    },
    {
      scene: "picture",
      caption: `Sort them by changing couplings only, so the train reads ${sorted.join(", ") || "empty"}.`,
      state: shot(place, links, (cell) => (cell < values.length ? "window" : null)),
    },
    {
      scene: "picture",
      caption: `The goal: the train ${solve(values) || "empty"}.`,
      state: shot(place, links, (cell) => (cell < values.length ? "done" : null)),
    },
  ];
}

function slowFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const frames: Frame[] = [];
  const rest = values.map((_, index) => index);
  const built: number[] = [];
  let scanned = 0;
  let shown = 0;
  while (rest.length) {
    scanned += rest.length;
    let best = 0;
    rest.forEach((cell, index) => {
      if (values[cell] < values[rest[best]]) best = index;
    });
    const pick = rest.splice(best, 1)[0];
    built.push(values[pick]);
    if (shown < 2) {
      frames.push({
        scene: "slow",
        caption:
          shown === 0
            ? `The slow way: each time, walk every leftover car, pick the smallest, and hook it on. First pick: ${values[pick]}.`
            : `Walk the leftover cars again to find the next smallest. The same cars are read over and over.`,
        state: { ...shot(place, links, (cell) => (cell === pick ? "edge" : rest.includes(cell) ? "window" : null)), counter: { label: "cars read", value: scanned }, note: `sorted so far: ${built.join(" ")}` },
      });
    }
    shown++;
  }
  frames.push({
    scene: "slow",
    caption: `That was ${scanned} cars read to sort ${values.length}. This is O(n²) time: each pick re-reads what is left.`,
    state: { ...shot(place, links, () => "faded"), counter: { label: "cars read", value: scanned } },
  });
  return frames;
}

function insightFrames(values: number[]): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const mid = splitAt(values.length);
  const cut = [...links];
  if (values.length >= 2) cut[mid] = place.end;
  const two = values.length >= 2;
  return [
    {
      scene: "insight",
      caption: "Split the train at the middle, sort each half the same way, then merge the two sorted halves like two sorted trains.",
      state: shot(place, links, (cell) => (cell === mid ? "edge" : null), [{ name: "slow", at: mid, tone: "accent" }]),
    },
    {
      scene: "insight",
      caption: two
        ? `The Uncut Split Trap: skip the cut, and a two-car train never shrinks. Both halves are still both cars, so the work never ends.`
        : "A train of one car is already sorted. The work must shrink at every split.",
      state: { ...shot(place, links, () => (two ? "miss" : null)), lost: two ? [0, Math.min(1, values.length - 1)] : null },
    },
    {
      scene: "insight",
      caption: two ? `Cut after ${nameOf(place, mid)}. The two halves are now separate, and each is shorter than the whole train.` : "There is nothing to cut. One car is already in order.",
      state: { ...shot(place, cut, (cell) => (cell === mid ? "done" : cell > mid && cell < place.end ? "window" : cell < mid ? "window" : null)), freshLink: two ? mid : null },
    },
  ];
}

function cutQuiz(place: Yard, mid: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [mid]: "The middle car stays in the left half. Its coupling is what must change.",
    [0]: "Cutting at the first car would leave the left half empty.",
  };
  if (mid + 1 < place.end) feedback[mid + 1] = "That car is the start of the right half. The cut is behind it.";
  delete feedback[place.end];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "The middle car is found. Where must its coupling point, so the two halves are separate trains? Click that box.",
    answer: place.end,
    feedback,
    otherwise: "The left half must end. Hook the middle car onto null.",
    why: `Hook ${nameOf(place, mid)} onto null. Skip that cut and a two-car train never shrinks: the Uncut Split Trap.`,
  };
}

function mergeQuiz(place: Yard, left: number, right: number, answer: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (left !== answer) feedback[left] = "That first car is larger. Merge always takes the smaller head.";
  if (right !== answer) feedback[right] = "That first car is larger. Merge always takes the smaller head.";
  feedback[place.end] = "Both halves still have cars.";
  delete feedback[answer];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "The two halves are sorted. Which first car does the merge hook next? Click it.",
    answer,
    feedback,
    otherwise: "Compare the first car of each sorted half. Hook the smaller one.",
    why: `The smaller first car is ${nameOf(place, answer)}.`,
  };
}

function relink(links: (number | null)[], order: number[], end: number) {
  order.forEach((cell, index) => {
    links[cell] = index + 1 < order.length ? order[index + 1] : end;
  });
}

function solutionFrames(values: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = values.length;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new train: ${values.join(", ") || "empty"}. You cut at every split.` : n <= 1 ? "One car, or none: already sorted." : "A train of two or more cars must split. Slow starts on the first car. Fast starts on the second.",
    codeLine: line(0),
    state: shot(place, links, () => null, n ? [{ name: "slow", at: 0, tone: "accent" }, ...(n > 1 ? [{ name: "fast", at: 1, tone: "teal" as const }] : [])] : []),
  });

  if (n <= 1) {
    frames.push({
      scene,
      caption: `The answer is ${solve(values) || "empty"}.`,
      codeLine: line(0),
      state: shot(place, links, (cell) => (cell < n ? "done" : null)),
    });
    if (!practice) {
      frames.push({ scene, caption: "Time: O(n log n). A tiny train still follows split and merge.", codeLine: 3, state: shot(place, links, () => null) });
      frames.push({ scene, caption: "Space: O(log n). The call stack is the split depth.", codeLine: 0, state: shot(place, links, () => null) });
    }
    return frames;
  }

  let slow = 0;
  let fast = 1;
  frames.push({
    scene,
    caption: `Fast starts on ${nameOf(place, 1)}, one car ahead, so a two-car train splits in half instead of leaving the right half empty.`,
    codeLine: line(2),
    state: shot(place, links, (cell) => (cell === 0 || cell === 1 ? "window" : null), [
      { name: "slow", at: 0, tone: "accent" },
      { name: "fast", at: 1, tone: "teal" },
    ]),
  });
  while (fast < n && fast + 1 < n) {
    slow += 1;
    fast += 2;
    frames.push({
      scene,
      caption: `Slow steps one. Fast jumps two. Slow is on ${nameOf(place, slow)}.`,
      codeLine: line(4),
      state: shot(place, links, (cell) => (cell === slow ? "edge" : cell === Math.min(fast, n - 1) ? "window" : null), [
        { name: "slow", at: slow, tone: "accent" },
        { name: "fast", at: Math.min(fast, n - 1), tone: "teal" },
      ]),
    });
  }

  const second = slow + 1 < n ? slow + 1 : place.end;
  if (!practice) {
    frames.push({
      scene,
      caption: `The Uncut Split Trap: leave ${nameOf(place, slow)} hooked to ${nameOf(place, second)}, and both halves are still the whole train.`,
      codeLine: line(8),
      state: { ...shot(place, links, (cell) => (cell <= slow ? "window" : cell < n ? "miss" : null)), lost: [0, n - 1] },
    });
  }
  frames.push({
    scene,
    caption: `Slow sits on ${nameOf(place, slow)}, the end of the left half. Cut before you sort the halves.`,
    codeLine: line(8),
    state: shot(place, links, (cell) => (cell === slow ? "edge" : null), [{ name: "slow", at: slow, tone: "accent" }]),
    quiz: cutQuiz(place, slow),
  });
  links[slow] = place.end;
  frames.push({
    scene,
    caption: `${nameOf(place, slow).replace(/^the /, "The ")} now hooks null. Left is ${values.slice(0, slow + 1).join(", ")}. Right is ${values.slice(slow + 1).join(", ") || "empty"}.`,
    codeLine: line(8),
    state: { ...shot(place, links, (cell) => (cell <= slow ? "window" : cell < n ? "done" : null)), freshLink: slow, note: "two shorter trains" },
  });

  const leftOrder = values
    .slice(0, slow + 1)
    .map((value, index) => ({ value, cell: index }))
    .sort((x, y) => x.value - y.value)
    .map((item) => item.cell);
  const rightOrder = values
    .slice(slow + 1)
    .map((value, index) => ({ value, cell: slow + 1 + index }))
    .sort((x, y) => x.value - y.value)
    .map((item) => item.cell);
  relink(links, leftOrder, place.end);
  relink(links, rightOrder, place.end);
  frames.push({
    scene,
    caption: `Each half is sorted the same way, cutting as it goes. Left becomes ${leftOrder.map((cell) => values[cell]).join(", ")}. Right becomes ${rightOrder.map((cell) => values[cell]).join(", ") || "empty"}.`,
    codeLine: line(9),
    state: shot(place, links, (cell) => (cell < n ? "window" : null), [], { note: "halves sorted" }),
  });

  const dummyLinks = [...links];
  let left = leftOrder[0] ?? place.end;
  let right = rightOrder[0] ?? place.end;
  const merged: number[] = [];
  let askedMerge = false;
  while (left !== place.end && right !== place.end) {
    const takeLeft = values[left] <= values[right];
    const pick = takeLeft ? left : right;
    frames.push({
      scene,
      caption: `Merge the two sorted halves. Compare ${nameOf(place, left)} with ${nameOf(place, right)}.`,
      codeLine: line(9),
      state: shot(place, dummyLinks, (cell) => (cell === left || cell === right ? "edge" : merged.includes(cell) ? "done" : null), [
        { name: "left", at: left, tone: "accent" },
        { name: "right", at: right, tone: "teal" },
      ]),
      quiz: practice || !askedMerge ? mergeQuiz(place, left, right, pick) : undefined,
    });
    askedMerge = true;
    merged.push(pick);
    if (takeLeft) left = dummyLinks[left] ?? place.end;
    else right = dummyLinks[right] ?? place.end;
  }
  const leftover = left !== place.end ? left : right;
  while (leftover !== place.end && merged.length < n) {
    const rest: number[] = [];
    for (let cell: number | null = leftover; cell !== null && cell !== place.end && !rest.includes(cell); cell = dummyLinks[cell] ?? place.end) rest.push(cell);
    rest.forEach((cell) => merged.push(cell));
    break;
  }
  relink(links, merged, place.end);
  frames.push({
    scene,
    caption: leftover !== place.end ? `The rest of the leftover half attaches in one hook. The train is sorted.` : `Both halves are spent. The train is sorted.`,
    codeLine: line(9),
    state: shot(place, links, (cell) => (cell < n ? "done" : null)),
  });

  const answer = solve(values) || "empty";
  frames.push({
    scene,
    caption: practice ? `Follow the couplings from the new first car. The answer is ${answer}.` : `Follow the couplings from the new first car. The answer is ${answer}.`,
    codeLine: line(9),
    state: shot(place, links, (cell) => (cell < n ? "done" : null), [{ name: "head", at: merged[0] ?? 0, tone: "ink" }]),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log n). About log n splits, and each level walks all ${n} cars to merge.`,
      codeLine: 3,
      state: { ...shot(place, links, (cell) => (cell < n ? "done" : null)), counter: { label: "cars in the train", value: n } },
    });
    frames.push({
      scene,
      caption: "Space: O(log n). The call stack is the split depth, about log n for a balanced cut.",
      codeLine: 0,
      state: shot(place, links, (cell) => (cell < n ? "done" : null)),
    });
  }
  return frames;
}

export const sortListStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-148"],
  pattern: "Merge sort on a linked list",
  trigger: "sort a linked list in O(n log n) time, with little extra memory",
  insight: "Split the train at the middle, sort each half, then merge the two sorted halves. A linked list only walks forward, so this split-and-merge fits it.",
  metaphor: { name: "Split, sort, merge", legend: "slow = end of left half · second = right half · merge = two sorted trains", terms: ["car", "train", "half", "cut", "merge", "coupling"] },
  traps: [
    {
      name: "The Uncut Split Trap",
      rule: "After taking the right half, hook the middle car onto null. Skip the cut and a two-car train never shrinks.",
    },
  ],
  template: [
    "if the train has 0 or 1 car, it is sorted;",
    "slow at first car, fast at second; walk until fast cannot jump two;",
    "cut after slow; sort left and right the same way;",
    "merge the two sorted halves, always taking the smaller head;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n log n)",
    timeWhy: "about log n splits, and each level walks all n cars to merge",
    space: "O(log n)",
    spaceWhy: "the call stack is the split depth, log n for a balanced cut",
  },
  code: CODE,
  examples: [
    { label: "[4,2,1,3]", input: "[4,2,1,3]", expected: "1->2->3->4" },
    { label: "[2,1]", input: "[2,1]", expected: "1->2", note: "Two cars: skip the cut and the work never ends" },
    { label: "[3,1,2]", input: "[3,1,2]", expected: "1->2->3" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-21", title: "Merge Two Sorted Lists" },
    { slug: "lc-23", title: "Merge k Sorted Lists" },
    { slug: "lc-88", title: "Merge Sorted Array" },
  ],
  answer: (input) => solve(parseList(input)),
  frames: (input) => {
    const values = parseList(input);
    return [...pictureFrames(values), ...slowFrames(values), ...insightFrames(values), ...solutionFrames(values), ...solutionFrames(parseList(PRACTICE), "card", true), { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: shot(yard(values), forward(yard(values)), () => null) }];
  },
  View: LinkedListReverseView,
};
