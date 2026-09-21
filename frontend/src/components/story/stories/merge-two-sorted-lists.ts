import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<LinkedListReverseState>;

/** Fresh pair: the first pick is from the right train, so a missing engine would lose that car. */
const PRACTICE = "[3,6]+[2]";

const CODE = [
  "ListNode dummy = new ListNode(0);",
  "ListNode tail = dummy;",
  "while (list1 != null && list2 != null) {",
  "    if (list1.val <= list2.val) {",
  "        tail.next = list1;",
  "        list1 = list1.next;",
  "    } else {",
  "        tail.next = list2;",
  "        list2 = list2.next;",
  "    }",
  "    tail = tail.next;",
  "}",
  "tail.next = list1 != null ? list1 : list2;",
  "return dummy.next;",
];

function parsePair(input: string): { a: number[]; b: number[] } {
  const chunks = [...input.matchAll(/\[([^\]]*)\]/g)].map((match) =>
    match[1]
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(Number)
      .filter((value) => Number.isFinite(value)),
  );
  return { a: chunks[0] ?? [], b: chunks[1] ?? [] };
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

function solve(a: number[], b: number[]): string {
  const dummy: ListNode = { value: 0, next: null };
  let tail = dummy;
  let left = chain(a);
  let right = chain(b);
  while (left !== null && right !== null) {
    if (left.value <= right.value) {
      tail.next = left;
      left = left.next;
    } else {
      tail.next = right;
      right = right.next;
    }
    tail = tail.next;
  }
  tail.next = left ?? right;
  return read(dummy.next);
}

type Yard = { cells: TrainCell[]; engine: number; a0: number; b0: number; end: number; a: number[]; b: number[] };

function yard(a: number[], b: number[]): Yard {
  const cells: TrainCell[] = [{ label: "engine", kind: "engine" }, ...a.map((value) => ({ label: String(value), kind: "car" as const })), ...b.map((value) => ({ label: String(value), kind: "car" as const })), { label: "null", kind: "null" }];
  return { cells, engine: 0, a0: 1, b0: 1 + a.length, end: cells.length - 1, a, b };
}

function startLinks(place: Yard): (number | null)[] {
  const links: (number | null)[] = place.cells.map(() => null);
  place.a.forEach((_, index) => {
    links[place.a0 + index] = index + 1 < place.a.length ? place.a0 + index + 1 : place.end;
  });
  place.b.forEach((_, index) => {
    links[place.b0 + index] = index + 1 < place.b.length ? place.b0 + index + 1 : place.end;
  });
  return links;
}

function shot(place: Yard, links: (number | null)[], paint: (cell: number) => CellTone | null, pointers: TrainPointer[] = [], extra: Partial<LinkedListReverseState> = {}): LinkedListReverseState {
  return { cells: place.cells, slots: place.cells.map((_, index) => index), links: [...links], tones: place.cells.map((_, cell) => paint(cell) ?? "idle"), pointers, ...extra };
}

function nameOf(place: Yard, cell: number | null): string {
  if (cell === null || cell === place.end) return "null";
  if (cell === place.engine) return "the spare engine";
  const label = place.cells[cell].label;
  const twins = place.cells.filter((item) => item.kind === "car" && item.label === label).length;
  if (twins < 2) return `the car ${label}`;
  return cell < place.b0 ? `the car ${label} of the left train` : `the car ${label} of the right train`;
}

function pictureFrames(a: number[], b: number[]): Frame[] {
  const place = yard(a, b);
  const links = startLinks(place);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Two sorted trains: left is ${a.length ? a.join(", ") : "empty"}, right is ${b.length ? b.join(", ") : "empty"}. Each coupling hooks the next larger car of its own train.`,
      state: shot(place, links, () => null),
    },
  ];
  if (a.length && b.length) {
    frames.push({
      scene: "picture",
      caption: `You may only change couplings, and you must keep the cars in sorted order. You may not build a third train of new cars.`,
      state: shot(place, links, (cell) => (cell === place.a0 || cell === place.b0 ? "window" : null)),
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: one sorted train. Read from the first car, it becomes ${solve(a, b) || "empty"}.`,
    state: shot(place, links, (cell) => (place.cells[cell].kind === "car" ? "done" : null)),
  });
  return frames;
}

function slowFrames(a: number[], b: number[]): Frame[] {
  const place = yard(a, b);
  const links = startLinks(place);
  const frames: Frame[] = [];
  const left = [...a];
  const right = [...b];
  const built: number[] = [];
  let scanned = 0;
  let shown = 0;
  while (left.length || right.length) {
    const all = [
      ...left.map((value, index) => ({ value, side: "L" as const, index })),
      ...right.map((value, index) => ({ value, side: "R" as const, index })),
    ];
    scanned += all.length;
    all.sort((x, y) => x.value - y.value || (x.side === "L" ? -1 : 1));
    const pick = all[0];
    if (pick.side === "L") left.shift();
    else right.shift();
    built.push(pick.value);
    if (shown < 2) {
      frames.push({
        scene: "slow",
        caption:
          shown === 0
            ? `The slow way: each time, walk every car that is still waiting, pick the smallest, and hook it on. First pick: ${pick.value}.`
            : `Walk the remaining cars again to find the next smallest. The same cars are read over and over.`,
        state: { ...shot(place, links, () => null), counter: { label: "cars read", value: scanned }, note: `new train: ${built.join(" ")}` },
      });
    }
    shown++;
  }
  frames.push({
    scene: "slow",
    caption: `That was ${scanned} cars read to build a train of ${built.length}. This is O((m + n)²) time: each pick re-reads what is left.`,
    state: { ...shot(place, links, () => "faded"), counter: { label: "cars read", value: scanned }, note: `new train: ${built.join(" ")}` },
  });
  return frames;
}

function insightFrames(a: number[], b: number[]): Frame[] {
  const place = yard(a, b);
  const links = startLinks(place);
  const first = a.length && b.length ? (a[0] <= b[0] ? place.a0 : place.b0) : a.length ? place.a0 : b.length ? place.b0 : place.end;
  const lost = first === place.end ? [] : [first];
  return [
    {
      scene: "insight",
      caption: "Picture two trains and a spare engine. The tail always sits on the last car of the new train. At the start that is the engine.",
      state: shot(place, links, () => null, [{ name: "tail", at: place.engine, tone: "ink" }]),
    },
    {
      scene: "insight",
      caption: `The Lost First Car Trap: pick ${nameOf(place, first)} as the start with no engine, then move the tail onto it, and nothing holds the start any more.`,
      state: { ...shot(place, links, (cell) => (lost.includes(cell) ? "miss" : null), [{ name: "tail", at: first === place.end ? place.engine : first, tone: "accent" }]), lost: lost.length ? lost : null },
    },
    {
      scene: "insight",
      caption: "The spare engine holds the start. The first pick is then the same as every later pick: the tail hooks the smaller first car.",
      state: shot(place, links, (cell) => (cell === first ? "done" : null), [{ name: "tail", at: place.engine, tone: "ink" }]),
    },
  ];
}

function pickQuiz(place: Yard, left: number, right: number, answer: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [place.engine]: "The engine is the tail right now. It must hook onto a car.",
    [place.end]: "Neither train is empty yet, so do not skip to null.",
  };
  if (left !== answer) feedback[left] = left === place.end ? "The left train is empty, so it has no car to give." : "That first car is larger. The tail always hooks the smaller of the two first cars.";
  if (right !== answer) feedback[right] = right === place.end ? "The right train is empty, so it has no car to give." : "That first car is larger. The tail always hooks the smaller of the two first cars.";
  delete feedback[answer];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "The tail must hook the next car of the new train. Which box does it hook onto? Click it.",
    answer,
    feedback,
    otherwise: "Compare the first car of each train that still has cars. Hook the smaller one.",
    why: `The tail hooks ${nameOf(place, answer)}, the smaller first car.`,
  };
}

function leftoverQuiz(place: Yard, answer: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [place.engine]: "The engine already holds the start. The leftover cars attach at the tail.",
    [place.end]: "A train still has cars left. Hook that leftover train on in one go.",
  };
  delete feedback[answer];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "One train has ended. The leftover cars attach in one hook. Which box does the tail hook onto? Click it.",
    answer,
    feedback,
    otherwise: "Hook the first remaining car of the train that still has cars.",
    why: `The tail hooks ${nameOf(place, answer)}, and the rest of that train comes with it.`,
  };
}

function solutionFrames(a: number[], b: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const place = yard(a, b);
  const links = startLinks(place);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let left = a.length ? place.a0 : place.end;
  let right = b.length ? place.b0 : place.end;
  let tail = place.engine;
  const hooked = new Set<number>();
  let askedPick = false;
  let askedLeft = false;
  const pointers = (): TrainPointer[] => [
    { name: "tail", at: tail, tone: "ink" },
    ...(left !== place.end ? [{ name: "left", at: left, tone: "accent" as const }] : []),
    ...(right !== place.end ? [{ name: "right", at: right, tone: "teal" as const }] : []),
  ];
  const paint = (cell: number): CellTone | null => (hooked.has(cell) ? "done" : cell === left || cell === right ? "window" : null);

  frames.push({
    scene,
    caption: practice ? `Your turn, on two new trains: ${a.join(", ") || "empty"} and ${b.join(", ") || "empty"}. You choose every car the tail hooks.` : "Park a spare engine. The tail starts there, so the first pick cannot get lost.",
    codeLine: line(0),
    state: shot(place, links, paint, pointers()),
  });

  while (left !== place.end && right !== place.end) {
    const takeLeft = Number(place.cells[left].label) <= Number(place.cells[right].label);
    const pick = takeLeft ? left : right;
    const ask = practice || !askedPick;
    askedPick = true;
    frames.push({
      scene,
      caption: `Both trains still have cars. Compare ${nameOf(place, left)} with ${nameOf(place, right)}.`,
      codeLine: line(3),
      state: shot(place, links, paint, pointers()),
      quiz: ask ? pickQuiz(place, left, right, pick) : undefined,
    });
    links[tail] = pick;
    hooked.add(pick);
    const fresh = tail;
    if (takeLeft) left = links[left] ?? place.end;
    else right = links[right] ?? place.end;
    frames.push({
      scene,
      caption: `The tail hooks ${nameOf(place, pick)}. That car leaves its old train.`,
      codeLine: line(takeLeft ? 4 : 7),
      state: { ...shot(place, links, paint, pointers()), freshLink: fresh },
    });
    tail = pick;
    frames.push({
      scene,
      caption: `The tail steps onto ${nameOf(place, tail)}, now the last car of the new train.`,
      codeLine: line(10),
      state: shot(place, links, paint, pointers()),
    });
  }

  const leftover = left !== place.end ? left : right;
  if (leftover !== place.end) {
    const ask = practice || !askedLeft;
    askedLeft = true;
    frames.push({
      scene,
      caption: `${left === place.end ? "The left" : "The right"} train has ended. The other train still has cars.`,
      codeLine: line(12),
      state: shot(place, links, paint, pointers()),
      quiz: ask ? leftoverQuiz(place, leftover) : undefined,
    });
    links[tail] = leftover;
    frames.push({
      scene,
      caption: `One hook: the tail takes ${nameOf(place, leftover)}, and the rest of that train comes with it.`,
      codeLine: line(12),
      state: { ...shot(place, links, paint, pointers()), freshLink: tail },
    });
  }

  const answer = solve(a, b) || "empty";
  frames.push({
    scene,
    caption: practice ? `Done. Follow the couplings from the spare engine. The answer is ${answer}.` : `Follow the couplings from the spare engine. The answer is ${answer}.`,
    codeLine: line(13),
    state: shot(place, links, (cell) => (place.cells[cell].kind === "car" ? "done" : null)),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(m + n). Each car is hooked exactly once. The slow way re-read leftover cars ${a.length + b.length} times over.`,
      codeLine: 2,
      state: { ...shot(place, links, (cell) => (place.cells[cell].kind === "car" ? "done" : null)), counter: { label: "cars hooked", value: a.length + b.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only a spare engine and a tail, however long the two trains are. The cars themselves are reused.",
      codeLine: 0,
      state: shot(place, links, (cell) => (place.cells[cell].kind === "car" ? "done" : null), [{ name: "tail", at: place.engine, tone: "ink" }]),
    });
  }
  return frames;
}

export const mergeTwoSortedListsStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-21"],
  pattern: "Merge two sorted lists",
  trigger: "two sorted linked lists that must be spliced into one sorted list, reusing the existing cars",
  insight: "A spare engine holds the start. The tail always hooks the smaller first car of the two trains. When one train ends, attach the rest in one hook.",
  metaphor: { name: "Two trains and a spare engine", legend: "spare engine = dummy · tail = tail · left = list1 · right = list2", terms: ["car", "train", "engine", "tail", "coupling"] },
  traps: [
    {
      name: "The Lost First Car Trap",
      rule: "Park a spare engine and return the car after it. Picking the first car with no engine, then moving on, loses the start of the train.",
    },
  ],
  template: [
    "dummy engine; tail = dummy;",
    "while both trains have a first car:",
    "    tail hooks the smaller first car; that train and tail step on;",
    "tail hooks whichever train is left;",
    "return the car after the engine;",
  ],
  complexity: {
    slow: "O((m + n)²)",
    time: "O(m + n)",
    timeWhy: "each car is hooked exactly once",
    space: "O(1)",
    spaceWhy: "only a spare engine and a tail; the cars themselves are reused",
  },
  code: CODE,
  examples: [
    { label: "[1,3]+[2,4]", input: "[1,3]+[2,4]", expected: "1->2->3->4" },
    { label: "[1,4]+[1]", input: "[1,4]+[1]", expected: "1->1->4", note: "Equal first cars: take the left one" },
    { label: "[4]+[1,3]", input: "[4]+[1,3]", expected: "1->3->4" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-23", title: "Merge k Sorted Lists" },
    { slug: "lc-88", title: "Merge Sorted Array" },
    { slug: "lc-148", title: "Sort List" },
  ],
  answer: (input) => {
    const { a, b } = parsePair(input);
    return solve(a, b);
  },
  frames: (input) => {
    const { a, b } = parsePair(input);
    const practice = parsePair(PRACTICE);
    return [...pictureFrames(a, b), ...slowFrames(a, b), ...insightFrames(a, b), ...solutionFrames(a, b), ...solutionFrames(practice.a, practice.b, "card", true), { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: shot(yard(a, b), startLinks(yard(a, b)), (cell) => (yard(a, b).cells[cell].kind === "car" ? "done" : null)) }];
  },
  View: LinkedListReverseView,
};
