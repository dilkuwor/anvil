import type { CellTone } from "@/components/learn/viz/primitives";

import { HeapPileView, PileHeap, type HeapPileState, type PickRef, type PileItem } from "../agy-heap-pile-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<HeapPileState>;
type Num = { id: string; v: number };
type Op = { kind: "add"; num: Num } | { kind: "median" };

/** Fresh stream for the "your turn" run: one median halfway between two tops (with a lost half to avoid), one on a single top. */
const PRACTICE = "add 6, add 3, median, add 8, median";

const CODE = [
  "PriorityQueue<Integer> small = new PriorityQueue<>(Comparator.reverseOrder());",
  "PriorityQueue<Integer> big = new PriorityQueue<>();",
  "public void addNum(int num) {",
  "    small.add(num);",
  "    big.add(small.poll());",
  "    if (big.size() > small.size()) {",
  "        small.add(big.poll());",
  "    }",
  "}",
  "public double findMedian() {",
  "    if (small.size() > big.size()) {",
  "        return small.peek();",
  "    }",
  "    return (small.peek() + big.peek()) / 2.0;",
  "}",
];

function parse(input: string): Op[] {
  let made = 0;
  return input
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0)
    .map((part): Op => (part.startsWith("add") ? { kind: "add", num: { id: `n${made++}`, v: Number(part.replace("add", "").trim()) } } : { kind: "median" }));
}

const show = (value: number) => value.toFixed(1);
const format = (values: number[]) => `[${values.map(show).join(",")}]`;

/** Independent solver: keep every number, sort them all at each question, and read the middle. */
function solve(ops: Op[]): number[] {
  const seen: number[] = [];
  const out: number[] = [];
  for (const op of ops) {
    if (op.kind === "add") seen.push(op.num.v);
    else {
      const sorted = [...seen].sort((a, b) => a - b);
      const mid = sorted.length >> 1;
      out.push(sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
    }
  }
  return out;
}

const biggestFirst = () => new PileHeap<Num>((a, b) => a.v > b.v);
const smallestFirst = () => new PileHeap<Num>((a, b) => a.v < b.v);
const chip = (num: Num, tone: CellTone = "idle"): PileItem => ({ id: num.id, label: String(num.v), tone });
const list = (values: number[]) => (values.length <= 1 ? values.join("") : `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`);
const SMALL_TITLE = "small half · its biggest on top";
const BIG_TITLE = "big half · its smallest on top";

type Draw = {
  small?: PileItem[];
  big?: PileItem[];
  lit?: boolean;
  piles?: boolean;
  nums: Num[];
  /** When the row is not the arrival order (the slow way keeps it sorted). */
  order?: Num[];
  tone: (num: Num) => CellTone;
  medians: { v: number; tone: CellTone }[];
  hand?: Num | null;
  handNote?: string;
  middle?: HeapPileState["middle"];
  note?: HeapPileState["note"];
  counter?: HeapPileState["counter"];
  picks?: PickRef[];
};

function draw(d: Draw): HeapPileState {
  return {
    // Both piles are always drawn, so the picture never changes shape.
    piles: [
      { title: SMALL_TITLE, items: d.small ?? [], lit: d.lit, hidden: d.piles === false },
      { title: BIG_TITLE, items: d.big ?? [], lit: d.lit, hidden: d.piles === false },
    ],
    levels: 3,
    rows: [
      { title: d.order ? "kept in order" : "numbers", cells: (d.order ?? d.nums).map((num) => ({ label: String(num.v), tone: d.tone(num) })) },
      { title: "medians", wide: true, emptyText: "(none asked yet)", cells: d.medians.map((median) => ({ label: show(median.v), tone: median.tone })) },
    ],
    panel: { kind: "hand", title: "new number", items: d.hand ? [chip(d.hand, "edge")] : [], note: d.handNote, noteTone: "muted" },
    middle: d.middle ?? null,
    note: d.note ?? null,
    counter: d.counter ?? null,
    picks: d.picks,
  };
}

const numsOf = (ops: Op[]) => ops.flatMap((op) => (op.kind === "add" ? [op.num] : []));

function pictureFrames(ops: Op[]): F[] {
  const nums = numsOf(ops);
  const frames: F[] = [
    { scene: "picture", caption: `Numbers arrive one at a time: ${list(nums.map((num) => num.v))}. Now and then we are asked for the median of the numbers so far.`, state: draw({ piles: false, nums, tone: () => "idle", medians: [] }) },
  ];
  // The first question with an odd count, and the first with an even count, are the two cases to show.
  const seen: Num[] = [];
  let odd: Num[] | null = null;
  let even: Num[] | null = null;
  for (const op of ops) {
    if (op.kind === "add") seen.push(op.num);
    else if (seen.length % 2 === 1) odd ??= [...seen].sort((a, b) => a.v - b.v);
    else even ??= [...seen].sort((a, b) => a.v - b.v);
  }
  if (odd) {
    const mid = odd[odd.length >> 1];
    frames.push({
      scene: "picture",
      caption: odd.length === 1 ? `The median is the middle number when they stand in order of size. With only ${mid.v}, the median is ${mid.v}.` : `The median is the middle number when they stand in order of size. With ${list(odd.map((num) => num.v))}, the median is ${mid.v}.`,
      state: draw({ piles: false, nums, order: odd, tone: (num) => (num === mid ? "done" : "idle"), medians: [{ v: mid.v, tone: "done" }] }),
    });
  }
  if (even) {
    const a = even[(even.length >> 1) - 1];
    const b = even[even.length >> 1];
    frames.push({
      scene: "picture",
      caption: `With an even count there are two middle numbers. The median is halfway between them. With ${list(even.map((num) => num.v))}, that is ${show((a.v + b.v) / 2)}.`,
      state: draw({ piles: false, nums, order: even, tone: (num) => (num === a || num === b ? "done" : "idle"), medians: [{ v: (a.v + b.v) / 2, tone: "done" }] }),
    });
  }
  frames.push({ scene: "picture", caption: "The goal: answer every median question quickly, while new numbers keep arriving.", state: draw({ piles: false, nums, tone: () => "idle", medians: solve(ops).map((v) => ({ v, tone: "done" as CellTone })) }) });
  return frames;
}

/** The obvious way, really run: keep one sorted row, and count every step a new number takes to reach its place. */
function slowFrames(ops: Op[]): F[] {
  const nums = numsOf(ops);
  const frames: F[] = [];
  const sorted: Num[] = [];
  const medians: number[] = [];
  let steps = 0;
  let adds = 0;
  for (const op of ops) {
    if (op.kind === "median") {
      const mid = sorted.length >> 1;
      medians.push(sorted.length % 2 === 1 ? sorted[mid].v : (sorted[mid - 1].v + sorted[mid].v) / 2);
      continue;
    }
    let at = sorted.length;
    let here = 0;
    while (at > 0 && sorted[at - 1].v > op.num.v) {
      at--;
      here++;
    }
    sorted.splice(at, 0, op.num);
    steps += here + 1;
    adds++;
    if (adds > 3) continue;
    const current = op.num;
    frames.push({
      scene: "slow",
      caption:
        adds === 1
          ? `The slow way: keep every number in one row, in order of size. ${current.v} is the first, so it just sits down.`
          : `${current.v} arrives. It walks in from the big end, and ${here === 0 ? "no number has" : here === 1 ? "1 bigger number has" : `${here} bigger numbers have`} to shift over to make room.`,
      state: draw({ piles: false, nums, order: [...sorted], tone: (num) => (num === current ? "edge" : "window"), medians: medians.map((v) => ({ v, tone: "hit" as CellTone })), hand: current, counter: { label: "steps", value: steps } }),
    });
  }
  frames.push({
    scene: "slow",
    caption: `Reading the median from that row is easy. But a new number may have to push every other number over. Here it took ${steps} steps, and for n numbers it grows to O(n²) time.`,
    state: draw({ piles: false, nums, order: [...sorted], tone: () => "faded", medians: medians.map((v) => ({ v, tone: "hit" as CellTone })), counter: { label: "steps", value: steps } }),
  });
  return frames;
}

type Halves = { small: PileHeap<Num>; big: PileHeap<Num> };

function addReal({ small, big }: Halves, num: Num) {
  small.add(num);
  big.add(small.poll()!);
  if (big.size > small.size) small.add(big.poll()!);
}

function insightFrames(ops: Op[]): F[] {
  const nums = numsOf(ops);
  const halves: Halves = { small: biggestFirst(), big: smallestFirst() };
  const arrived: Num[] = [];
  // Stop at the first question asked with at least two numbers in; else use the whole stream.
  for (const op of ops) {
    if (op.kind === "median" && arrived.length >= 2) break;
    if (op.kind === "add") {
      addReal(halves, op.num);
      arrived.push(op.num);
    }
  }
  const { small, big } = halves;
  const tone = (num: Num): CellTone => (arrived.includes(num) ? "window" : "idle");
  const level = small.size === big.size;
  return [
    {
      scene: "insight",
      caption: `The median only needs the middle. So split the numbers so far into a small half, ${list(small.items.map((num) => num.v).sort((a, b) => a - b))}, and a big half${big.size > 0 ? `, ${list(big.items.map((num) => num.v).sort((a, b) => a - b))}` : ""}.`,
      state: draw({ small: small.items.map((num) => chip(num, "window")), big: big.items.map((num) => chip(num, "window")), nums, tone, medians: [] }),
    },
    {
      scene: "insight",
      caption: `Picture two sorting piles facing each other. The small half shows its biggest number on top${big.size > 0 ? ", the big half shows its smallest" : ""}. The tops are the middle.`,
      state: draw({ small: small.items.map((num, index) => chip(num, index === 0 ? "edge" : "idle")), big: big.items.map((num, index) => chip(num, index === 0 ? "edge" : "idle")), nums, tone, medians: [] }),
    },
    {
      scene: "insight",
      caption: level
        ? `Keep the halves level. Here both hold ${small.size}, so the median is halfway between the two tops: ${show((small.peek()!.v + big.peek()!.v) / 2)}.`
        : `Keep the halves level: the small half may hold one more, never less. Here it does, so its top, ${small.peek()!.v}, is the median.`,
      state: draw({
        small: small.items.map((num, index) => chip(num, index === 0 ? "done" : "idle")),
        big: big.items.map((num, index) => chip(num, index === 0 && level ? "done" : "idle")),
        lit: true,
        nums,
        tone,
        medians: [],
        middle: { label: show(level ? (small.peek()!.v + big.peek()!.v) / 2 : small.peek()!.v), tone: "teal" },
      }),
    },
  ];
}

function crossQuiz(small: Num[]): { quiz: StoryQuiz; picks: PickRef[] } | null {
  if (small.length < 2) return null;
  const most = Math.max(...small.map((num) => num.v));
  if (small.filter((num) => num.v === most).length !== 1) return null;
  const answer = small.findIndex((num) => num.v === most);
  const picks: PickRef[] = small.map((_, index) => ({ at: "pile", pile: 0, index }));
  const feedback: Record<number, string> = {};
  small.forEach((num, index) => {
    if (index !== answer) feedback[index] = `${num.v} is not the biggest of the small half. If it crossed, a bigger number would stay behind on the wrong side.`;
  });
  return {
    picks,
    quiz: {
      kind: "cell",
      cells: picks.length,
      question: "One number now crosses from the small half to the big half. Which one? Click it.",
      answer,
      feedback,
      otherwise: "Only the top of a pile can leave it. Find the top of the small half.",
      why: "The top of the small half is its biggest number. Sending that one across keeps every small number below every big number.",
    },
  };
}

const backQuiz = (small: number, big: number): StoryQuiz => ({
  kind: "choice",
  question: `The small half holds ${small}, the big half holds ${big}. Does a number cross back?`,
  options: ["Yes: the big half's top crosses back", "No: nothing moves"],
  answer: big > small ? 0 : 1,
  why: big > small ? "The big half may never hold more than the small half. Its top, the smallest big number, goes back." : "The halves are level. The small half may hold the same or one more, and it does.",
});

const whereQuiz = (small: number, big: number): StoryQuiz => ({
  kind: "choice",
  question: `A median question. The small half holds ${small}, the big half holds ${big}. Where is the median?`,
  options: ["It is the top of the small half", "Halfway between the two tops"],
  answer: small > big ? 0 : 1,
  why: small > big ? "An odd count has one middle number. The small half holds the extra one, so its top is the middle." : "An even count has two middle numbers: the two tops. The median is halfway between them.",
});

const halveQuiz = (a: number, b: number): StoryQuiz => ({
  kind: "choice",
  question: `The tops are ${a} and ${b}, and their sum is ${a + b}. In Java, what do we divide the sum by?`,
  options: ["By 2.0, a decimal number", "By 2, a whole number"],
  answer: 0,
  why: `Two whole numbers divided in Java give a whole number: the half is chopped off. Dividing by 2.0 keeps ${show((a + b) / 2)}.`,
});

/** The real algorithm, one frame per change. `practice` reuses it on a fresh stream: the reader makes every decision. */
function solutionFrames(ops: Op[], scene: SceneId = "solution", practice = false): F[] {
  const nums = numsOf(ops);
  const frames: F[] = [];
  const small = biggestFirst();
  const big = smallestFirst();
  const line = (index: number) => (practice ? undefined : index);
  const arrived: Num[] = [];
  const medians: number[] = [];
  let current: Num | null = null;
  let moves = 0;
  const asked = { cross: false, back: false, stay: false, single: false, between: false, halve: false };
  const tone = (num: Num): CellTone => (num === current ? "edge" : arrived.includes(num) ? "window" : "idle");
  const pileItems = (pile: PileHeap<Num>, mark: (num: Num, index: number) => CellTone = (_, index) => (index === 0 ? "edge" : "idle")) => pile.items.map((num, index) => chip(num, mark(num, index)));
  const medianCells = (last: CellTone = "hit") => medians.map((v, index) => ({ v, tone: (index === medians.length - 1 ? last : "hit") as CellTone }));
  const base = (extra: Partial<Draw> = {}): Draw => ({ small: pileItems(small), big: pileItems(big), nums, tone, medians: medianCells(), hand: current, ...extra });

  frames.push({
    scene,
    caption: practice ? "Your turn, with a new stream of numbers. You decide what crosses between the piles, and where each median is." : "Start with two empty piles, facing each other. The small half will show its biggest number, the big half its smallest.",
    codeLine: line(0),
    state: draw(base()),
  });

  for (const op of ops) {
    if (op.kind === "add") {
      const num = op.num;
      current = num;
      arrived.push(num);
      small.add(num);
      moves++;
      const cross = practice || !asked.cross ? crossQuiz(small.items) : null;
      if (cross) asked.cross = true;
      frames.push({
        scene,
        caption: `${num.v} arrives. A new number always drops into the small half first${small.size === 1 ? ". It is alone there, so it is the top." : "."}`,
        codeLine: line(3),
        state: draw(base({ small: pileItems(small, (other) => (cross ? "idle" : other === num ? "hit" : "idle")), handNote: "drops into the small half", picks: cross?.picks })),
        quiz: cross?.quiz,
      });
      const crossed = small.poll()!;
      big.add(crossed);
      moves += 2;
      const needBack = big.size > small.size;
      const kind = needBack ? "back" : "stay";
      const askBack = practice || !asked[kind];
      asked[kind] = true;
      frames.push({
        scene,
        caption: `The small half passes its top, ${crossed.v}, across to the big half. Now no number in the small half is bigger than a number in the big half.`,
        codeLine: line(4),
        state: draw(base({ big: pileItems(big, (other, index) => (other === crossed ? "hit" : index === 0 ? "edge" : "idle")) })),
        quiz: askBack ? backQuiz(small.size, big.size) : undefined,
      });
      if (needBack) {
        const back = big.poll()!;
        small.add(back);
        moves += 2;
        frames.push({
          scene,
          caption: `The big half holds more than the small half, and that is not allowed. So its top, ${back.v}, crosses back. The halves hold ${small.size} and ${big.size}.`,
          codeLine: line(6),
          state: draw(base({ small: pileItems(small, (other, index) => (other === back ? "hit" : index === 0 ? "edge" : "idle")), note: { text: `small half ${small.size} · big half ${big.size}`, tone: "teal" } })),
        });
      } else {
        frames.push({
          scene,
          caption: `The halves hold ${small.size} and ${big.size}: level. Nothing crosses back.`,
          codeLine: line(5),
          state: draw(base({ note: { text: `small half ${small.size} · big half ${big.size}: level`, tone: "teal" } })),
        });
      }
      current = null;
      continue;
    }

    // A median question.
    const single = small.size > big.size;
    const kind = single ? "single" : "between";
    const askWhere = practice || !asked[kind];
    asked[kind] = true;
    frames.push({
      scene,
      caption: `A median question arrives. The small half holds ${small.size} and the big half holds ${big.size}.`,
      codeLine: line(10),
      state: draw(base({ small: pileItems(small, () => "idle"), big: pileItems(big, () => "idle") })),
      quiz: askWhere ? whereQuiz(small.size, big.size) : undefined,
    });
    if (single) {
      const value = small.peek()!.v;
      medians.push(value);
      frames.push({
        scene,
        caption: `The small half holds one more, so its top is the one middle number. The median is ${show(value)}.`,
        codeLine: line(11),
        state: draw(base({ small: pileItems(small, (_, index) => (index === 0 ? "done" : "idle")), big: pileItems(big, () => "idle"), medians: medianCells("done"), middle: { label: show(value), tone: "teal" } })),
      });
      continue;
    }
    const a = small.peek()!.v;
    const b = big.peek()!.v;
    const chopped = (a + b) % 2 !== 0;
    const tops: Partial<Draw> = { small: pileItems(small, (_, index) => (index === 0 ? "done" : "idle")), big: pileItems(big, (_, index) => (index === 0 ? "done" : "idle")) };
    if (chopped) {
      const askHalve = practice || !asked.halve;
      asked.halve = true;
      frames.push({
        scene,
        caption: `The halves are level, so there are two middle numbers: the tops, ${a} and ${b}. The median is halfway between them.`,
        codeLine: line(13),
        state: draw(base(tops)),
        quiz: askHalve ? halveQuiz(a, b) : undefined,
      });
      frames.push({
        scene,
        caption: `The Chopped Half Trap: ${a} plus ${b} is ${a + b}. Dividing whole numbers by 2 in Java gives ${Math.trunc((a + b) / 2)}: the half is chopped off. Divide by 2.0.`,
        codeLine: line(13),
        state: draw(base({ ...tops, middle: { label: `${Math.trunc((a + b) / 2)} ✕`, tone: "coral" }, note: { text: `✕ ${a + b} / 2 gives ${Math.trunc((a + b) / 2)} in whole numbers: the .5 is lost`, tone: "coral" } })),
      });
    }
    medians.push((a + b) / 2);
    frames.push({
      scene,
      caption: chopped ? `${a + b} divided by 2.0 keeps the half. The median is ${show((a + b) / 2)}.` : `The halves are level, so the median is halfway between the tops, ${a} and ${b}. The median is ${show((a + b) / 2)}.`,
      codeLine: line(13),
      state: draw(base({ ...tops, medians: medianCells("done"), middle: { label: show((a + b) / 2), tone: "teal" } })),
    });
  }

  frames.push({
    scene,
    caption: `The stream is over, and every question was answered from the tops alone. The answer is ${format(medians)}.`,
    codeLine: line(9),
    state: draw(base({ medians: medians.map((v) => ({ v, tone: "done" as CellTone })) })),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log n) for each new number: a few drops and takes, each along one short path of a pile. A median question only reads the tops.`,
      codeLine: 3,
      state: draw(base({ medians: medians.map((v) => ({ v, tone: "done" as CellTone })), counter: { label: "drops and takes", value: moves } })),
    });
    frames.push({
      scene,
      caption: `Space: O(n). Together the two piles hold every number that has arrived: ${small.size} and ${big.size} here.`,
      codeLine: 0,
      state: draw(base({ small: pileItems(small, () => "window"), big: pileItems(big, () => "window"), lit: true, medians: medians.map((v) => ({ v, tone: "done" as CellTone })) })),
    });
  }
  return frames;
}

export const findMedianFromDataStreamStory: ProblemStory<HeapPileState> = {
  slugs: ["lc-295"],
  pattern: "Heap / top K",
  trigger: "the median (the middle value) is asked again and again while numbers keep arriving",
  insight: "Two sorting piles face each other: the small half shows its biggest, the big half shows its smallest. Keep them level, and the median is at the tops.",
  metaphor: { name: "The sorting pile", legend: "small half = small (biggest on top) · big half = big (smallest on top) · crossing = add(poll()) · median = the tops", terms: ["pile", "top", "half", "cross"] },
  traps: [{ name: "The Chopped Half Trap", rule: "(small.peek() + big.peek()) / 2 is whole-number division and chops off the .5. Divide by 2.0 to return a double." }],
  template: [
    "small = pile with its largest on top;  big = pile with its smallest on top;",
    "add(x):   small.add(x);  big.add(small.poll());",
    "          if (big.size() > small.size()) small.add(big.poll());",
    "median(): if (small is larger) return small.peek();",
    "          return (small.peek() + big.peek()) / 2.0;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(log n)",
    timeWhy: "each new number makes a few drops and takes, each along one short path; a median question only reads the tops",
    space: "O(n)",
    spaceWhy: "the two piles together hold every number of the stream",
  },
  code: CODE,
  examples: [
    { label: "add 1, add 2, median, add 3, median", input: "add 1, add 2, median, add 3, median", expected: "[1.5,2.0]" },
    { label: "add 5, add 2, add 8, median, add 1, median", input: "add 5, add 2, add 8, median, add 1, median", expected: "[5.0,3.5]" },
    { label: "add 6, median, add 2, add 9, add 4, median", input: "add 6, median, add 2, add 9, add 4, median", expected: "[6.0,5.0]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-215", title: "Kth Largest Element in an Array" },
    { slug: "lc-23", title: "Merge k Sorted Lists" },
    { slug: "lc-1046", title: "Last Stone Weight" },
  ],
  answer: (input) => format(solve(parse(input))),
  frames: (input) => {
    const ops = parse(input);
    const nums = numsOf(ops);
    const halves: Halves = { small: biggestFirst(), big: smallestFirst() };
    for (const num of nums) addReal(halves, num);
    const level = halves.small.size === halves.big.size;
    return [
      ...pictureFrames(ops),
      ...slowFrames(ops),
      ...insightFrames(ops),
      ...solutionFrames(ops),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw({
          small: halves.small.items.map((num, index) => chip(num, index === 0 ? "edge" : "idle")),
          big: halves.big.items.map((num, index) => chip(num, index === 0 ? "edge" : "idle")),
          nums,
          tone: () => "window",
          medians: [],
          middle: { label: show(level ? (halves.small.peek()!.v + halves.big.peek()!.v) / 2 : halves.small.peek()!.v), tone: "teal" },
        }),
      },
    ];
  },
  View: HeapPileView,
};
