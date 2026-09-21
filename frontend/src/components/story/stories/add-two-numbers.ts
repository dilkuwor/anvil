import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<LinkedListReverseState>;

/** Fresh pair: both trains end with a leftover carry of 1. */
const PRACTICE = "[8]+[8]";

const CODE = [
  "ListNode dummy = new ListNode(0);",
  "ListNode tail = dummy;",
  "int carry = 0;",
  "while (l1 != null || l2 != null || carry != 0) {",
  "    int sum = carry;",
  "    if (l1 != null) {",
  "        sum += l1.val;",
  "        l1 = l1.next;",
  "    }",
  "    if (l2 != null) {",
  "        sum += l2.val;",
  "        l2 = l2.next;",
  "    }",
  "    carry = sum / 10;",
  "    tail.next = new ListNode(sum % 10);",
  "    tail = tail.next;",
  "}",
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

function solve(a: number[], b: number[]): string {
  const out: number[] = [];
  let carry = 0;
  let i = 0;
  while (i < a.length || i < b.length || carry) {
    const sum = carry + (a[i] ?? 0) + (b[i] ?? 0);
    out.push(sum % 10);
    carry = Math.floor(sum / 10);
    i++;
  }
  return out.join("->");
}

type Yard = { cells: TrainCell[]; engine: number; end: number; result0: number; slots: number };

function yard(a: number[], b: number[]): Yard {
  const slots = Math.max(a.length, b.length) + 1;
  const cells: TrainCell[] = [
    ...a.map((value) => ({ label: String(value), kind: "car" as const })),
    { label: "null", kind: "null" },
    ...b.map((value) => ({ label: String(value), kind: "car" as const })),
    { label: "null", kind: "null" },
    { label: "engine", kind: "engine" },
    ...Array.from({ length: slots }, () => ({ label: "·", kind: "car" as const })),
    { label: "null", kind: "null" },
  ];
  return { cells, engine: a.length + 1 + b.length + 1, end: cells.length - 1, result0: a.length + 1 + b.length + 2, slots };
}

function startLinks(place: Yard, a: number[], b: number[]): (number | null)[] {
  const links: (number | null)[] = place.cells.map(() => null);
  const aNull = a.length;
  const b0 = a.length + 1;
  const bNull = b0 + b.length;
  a.forEach((_, index) => {
    links[index] = index + 1 < a.length ? index + 1 : aNull;
  });
  b.forEach((_, index) => {
    links[b0 + index] = index + 1 < b.length ? b0 + index + 1 : bNull;
  });
  return links;
}

function shot(place: Yard, links: (number | null)[], paint: (cell: number) => CellTone | null, pointers: TrainPointer[] = [], extra: Partial<LinkedListReverseState> = {}): LinkedListReverseState {
  return { cells: place.cells, slots: place.cells.map((_, index) => index), links: [...links], tones: place.cells.map((_, cell) => paint(cell) ?? "idle"), pointers, ...extra };
}

function pictureFrames(a: number[], b: number[]): Frame[] {
  const place = yard(a, b);
  const links = startLinks(place, a, b);
  const aNull = a.length;
  const b0 = a.length + 1;
  return [
    {
      scene: "picture",
      caption: `Two numbers stored backwards, one digit per car. The left train is ${a.join(", ")} (ones at the front). The right train is ${b.join(", ")}.`,
      state: shot(place, links, (cell) => (cell < aNull || (cell >= b0 && cell < b0 + b.length) ? null : cell === place.engine || cell >= place.result0 ? "faded" : null)),
    },
    {
      scene: "picture",
      caption: `Add them the same way: ones with ones, then tens, and keep a carry. A leftover carry is still a digit.`,
      state: shot(place, links, (cell) => (cell === 0 || cell === b0 ? "window" : cell === place.engine || cell >= place.result0 ? "faded" : null)),
    },
    {
      scene: "picture",
      caption: `The goal: a third train of digit cars, also backwards. The answer is ${solve(a, b)}.`,
      state: shot(place, links, (cell) => (cell === place.engine || cell >= place.result0 ? "faded" : place.cells[cell].kind === "car" ? "done" : null)),
    },
  ];
}

function slowFrames(a: number[], b: number[]): Frame[] {
  const place = yard(a, b);
  const links = startLinks(place, a, b);
  const frames: Frame[] = [];
  let walked = 0;
  const out: number[] = [];
  let carry = 0;
  const len = Math.max(a.length, b.length) + 1;
  for (let i = 0; i < len; i++) {
    walked += (i < a.length ? i + 1 : 0) + (i < b.length ? i + 1 : 0);
    const sum = carry + (a[i] ?? 0) + (b[i] ?? 0);
    if (i >= a.length && i >= b.length && carry === 0 && i > 0) break;
    if (i >= a.length && i >= b.length && carry === 0) {
      if (out.length === 0) out.push(0);
      break;
    }
    out.push(sum % 10);
    carry = Math.floor(sum / 10);
    if (i > 1) continue;
    frames.push({
      scene: "slow",
      caption:
        i === 0
          ? `The slow way: for each place, walk from the front of both trains to fetch that digit, then add. First the ones.`
          : `The tens: walk from both fronts again. The ones cars are passed over every time.`,
      state: { ...shot(place, links, (cell) => (cell === Math.min(i, a.length - 1) || cell === a.length + 1 + Math.min(i, Math.max(0, b.length - 1)) ? "edge" : null)), counter: { label: "cars walked past", value: walked }, note: `sum so far: ${out.join(" ")}` },
    });
  }
  frames.push({
    scene: "slow",
    caption: `Each place walks from the front: ${walked} cars walked past. This is O((m + n)²) time. A long number makes it worse.`,
    state: { ...shot(place, links, () => "faded"), counter: { label: "cars walked past", value: walked } },
  });
  return frames;
}

function insightFrames(a: number[], b: number[]): Frame[] {
  const place = yard(a, b);
  const links = startLinks(place, a, b);
  const lastCarry = solve(a, b).split("->").length > Math.max(a.length, b.length);
  return [
    {
      scene: "insight",
      caption: "Picture a spare engine and a tail. Walk both digit trains together. Write a new car for the ones digit, and keep the carry.",
      state: shot(place, links, () => null, [{ name: "tail", at: place.engine, tone: "ink" }]),
    },
    {
      scene: "insight",
      caption: lastCarry
        ? `The Forgotten Carry Trap: both trains can end while carry is still 1. Stopping now drops that last digit.`
        : `Keep going while either train still has a digit, or the carry is still 1. A leftover carry is a new car.`,
      state: {
        ...shot(place, links, (cell) => (cell === place.result0 + Math.max(a.length, b.length) ? "miss" : "faded"), [{ name: "tail", at: place.engine, tone: "ink" }]),
        lost: lastCarry ? [place.result0 + Math.max(a.length, b.length)] : null,
      },
    },
    {
      scene: "insight",
      caption: "The loop is: a digit left on either train, or a carry still live. Then [5] plus [5] becomes 0, then 1.",
      state: shot(place, links, (cell) => (cell === place.engine ? "done" : null), [{ name: "tail", at: place.engine, tone: "ink" }]),
    },
  ];
}

function writeQuiz(place: Yard, slot: number, digit: number): StoryQuiz {
  const answer = place.result0 + slot;
  const feedback: Record<number, string> = {
    [place.engine]: "The engine holds the start. The new digit car is written after the tail.",
    [place.end]: "Null is the end of the result train. The new car sits before it, in the next empty slot.",
  };
  delete feedback[answer];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: `The ones digit of this sum is ${digit}. Which empty box becomes that new car? Click it.`,
    answer,
    feedback,
    otherwise: "The result train grows from the spare engine. Fill the next empty slot.",
    why: `That empty slot becomes the new car ${digit}, hooked on by the tail.`,
  };
}

function carryQuiz(place: Yard, slot: number): StoryQuiz {
  const answer = place.result0 + slot;
  const feedback: Record<number, string> = {
    [place.engine]: "Stopping at the engine would drop the leftover carry.",
    [place.end]: "The leftover carry is a real digit car, not null.",
  };
  delete feedback[answer];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "Both digit trains have ended, but carry is still 1. Which box gets the next car? Click it.",
    answer,
    feedback,
    otherwise: "A leftover carry is still a digit. Write it in the next empty slot of the result train.",
    why: "The Forgotten Carry Trap is to stop here. The leftover 1 becomes one more car.",
  };
}

function solutionFrames(a: number[], b: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const place = yard(a, b);
  const links = startLinks(place, a, b);
  const cells = place.cells.map((cell) => ({ ...cell }));
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const aNull = a.length;
  const b0 = a.length + 1;
  const bNull = b0 + b.length;
  let i = 0;
  let j = 0;
  let carry = 0;
  let tail = place.engine;
  let slot = 0;
  let askedWrite = false;
  let showedTrap = false;
  const written = new Set<number>();

  const pointers = (): TrainPointer[] => [
    { name: "tail", at: tail, tone: "ink" },
    { name: "top", at: i < a.length ? i : aNull, tone: "accent" },
    { name: "bot", at: j < b.length ? b0 + j : bNull, tone: "teal" },
  ];
  const paint = (cell: number): CellTone | null => {
    if (written.has(cell)) return "done";
    if (cell >= place.result0 && cell < place.end && cells[cell].label === "·") return "faded";
    return null;
  };

  frames.push({
    scene,
    caption: practice ? `Your turn, on two new numbers: ${a.join("")} and ${b.join("")} stored backwards. You write every result car.` : "Park a spare engine. The tail starts there. Carry starts at 0.",
    codeLine: line(0),
    state: shot(place, links, paint, pointers(), { counter: { label: "carry", value: 0 } }),
  });

  while (i < a.length || j < b.length || carry !== 0) {
    const d1 = i < a.length ? a[i] : 0;
    const d2 = j < b.length ? b[j] : 0;
    const sum = carry + d1 + d2;
    const digit = sum % 10;
    const nextCarry = Math.floor(sum / 10);
    const leftover = i >= a.length && j >= b.length && carry !== 0;
    const dest = place.result0 + slot;

    if (leftover && !showedTrap && !practice) {
      showedTrap = true;
      frames.push({
        scene,
        caption: `The Forgotten Carry Trap: both trains have ended, but carry is still ${carry}. Stopping now would drop that last digit.`,
        codeLine: line(3),
        state: { ...shot(place, links, (cell) => (cell === dest ? "miss" : paint(cell)), pointers(), { counter: { label: "carry", value: carry } }), lost: [dest] },
      });
    }

    const quiz = leftover ? carryQuiz(place, slot) : practice || !askedWrite ? writeQuiz(place, slot, digit) : undefined;
    if (quiz && !leftover) askedWrite = true;
    frames.push({
      scene,
      caption: leftover ? `Both trains have ended. Carry is still ${carry}.` : `Add ${d1} and ${d2} and carry ${carry}. The sum is ${sum}.`,
      codeLine: line(4),
      state: shot(place, links, paint, pointers(), { counter: { label: "carry", value: carry } }),
      quiz: leftover || practice || quiz ? quiz : undefined,
    });

    cells[dest] = { label: String(digit), kind: "car" };
    place.cells[dest] = cells[dest];
    links[tail] = dest;
    links[dest] = place.end;
    written.add(dest);
    frames.push({
      scene,
      caption: leftover ? `Write a car ${digit} for the leftover carry. Carry becomes 0.` : `Write a car ${digit}. Carry becomes ${nextCarry}.`,
      codeLine: line(14),
      state: { ...shot(place, links, paint, pointers(), { counter: { label: "carry", value: nextCarry } }), freshLink: tail },
    });
    tail = dest;
    carry = nextCarry;
    if (i < a.length) i++;
    if (j < b.length) j++;
    slot++;
  }

  const answer = solve(a, b);
  frames.push({
    scene,
    caption: practice ? `Done. Follow the result train from the spare engine. The answer is ${answer}.` : `Follow the result train from the spare engine. The answer is ${answer}.`,
    codeLine: line(17),
    state: shot(place, links, (cell) => (written.has(cell) ? "done" : cell >= place.result0 && cell < place.end ? "faded" : null)),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(max(m, n)). One step per digit of the longer number, plus a last step if carry remains.`,
      codeLine: 3,
      state: { ...shot(place, links, (cell) => (written.has(cell) ? "done" : null)), counter: { label: "cars written", value: written.size } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only a spare engine, a tail, and a carry, besides the result train itself.",
      codeLine: 0,
      state: shot(place, links, (cell) => (written.has(cell) ? "done" : null), [{ name: "tail", at: tail, tone: "ink" }]),
    });
  }
  return frames;
}

export const addTwoNumbersStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-2"],
  pattern: "Digit-by-digit add with carry",
  trigger: "two numbers stored as linked lists, digits reversed, one digit per car, and you must return the sum the same way",
  insight: "The front cars are the ones digits. Add digit by digit with a carry, and keep going while either train has a digit or the carry is still 1.",
  metaphor: { name: "Digit cars and a carry", legend: "spare engine = dummy · tail = tail · carry = carry · top = l1 · bot = l2", terms: ["car", "train", "engine", "tail", "carry", "digit"] },
  traps: [
    {
      name: "The Forgotten Carry Trap",
      rule: "Keep looping while either train has a digit or the carry is still 1. [5] plus [5] is 0 then 1, not just 0.",
    },
  ],
  template: [
    "dummy engine; tail = dummy; carry = 0;",
    "while a digit remains or carry is live:",
    "    sum = carry + digit from each train that still has one;",
    "    write sum % 10; carry = sum / 10; tail steps on;",
    "return the car after the engine;",
  ],
  complexity: {
    slow: "O((m + n)²)",
    time: "O(max(m, n))",
    timeWhy: "one step per digit of the longer number, plus a last step if carry remains",
    space: "O(1)",
    spaceWhy: "only a spare engine, a tail, and a carry, besides the result train",
  },
  code: CODE,
  examples: [
    { label: "[2,4]+[5,6]", input: "[2,4]+[5,6]", expected: "7->0->1", note: "Leftover carry after both trains end" },
    { label: "[5]+[5]", input: "[5]+[5]", expected: "0->1" },
    { label: "[9,9]+[1]", input: "[9,9]+[1]", expected: "0->0->1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-21", title: "Merge Two Sorted Lists" },
    { slug: "lc-43", title: "Multiply Strings" },
    { slug: "lc-8", title: "String to Integer (atoi)" },
  ],
  answer: (input) => {
    const { a, b } = parsePair(input);
    return solve(a, b);
  },
  frames: (input) => {
    const { a, b } = parsePair(input);
    const practice = parsePair(PRACTICE);
    const place = yard(a, b);
    return [...pictureFrames(a, b), ...slowFrames(a, b), ...insightFrames(a, b), ...solutionFrames(a, b), ...solutionFrames(practice.a, practice.b, "card", true), { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: shot(place, startLinks(place, a, b), () => null) }];
  },
  View: LinkedListReverseView,
};
