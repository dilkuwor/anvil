import type { CellTone } from "@/components/learn/viz/primitives";

import { HeapPileView, PileHeap, pileLevels, type HeapPileState, type PickRef, type PileItem } from "../agy-heap-pile-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<HeapPileState>;
type Num = { id: string; v: number; row: 0 | 1; at: number };
type Input = { k: number; start: Num[]; adds: Num[] };

/** Fresh numbers for the "your turn" run: one more start number than seats, then three arrivals. */
const PRACTICE = "2 | 6,1,9 | 4,10,7";

const CODE = [
  "PriorityQueue<Integer> pile = new PriorityQueue<>();",
  "KthLargest(int k, int[] nums) {",
  "    for (int value : nums) add(value);",
  "}",
  "int add(int val) {",
  "    pile.add(val);",
  "    if (pile.size() > k) {",
  "        pile.poll();",
  "    }",
  "    return pile.peek();",
  "}",
];

const numbers = (raw: string) =>
  raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(Number);

function parse(input: string): Input {
  const [kText, startText, addText] = input.split("|");
  const k = Math.max(1, Number(kText) || 1);
  const start = numbers(startText ?? "").map((v, at): Num => ({ id: `s${at}`, v, row: 0, at }));
  const adds = numbers(addText ?? "").map((v, at): Num => ({ id: `a${at}`, v, row: 1, at }));
  return { k, start, adds };
}

/** Independent solver: keep everything, sort, and count k from the large end after each add. */
function answers({ k, start, adds }: Input): number[] {
  const all = start.map((num) => num.v);
  return adds.map((num) => {
    all.push(num.v);
    return [...all].sort((a, b) => b - a)[k - 1];
  });
}

const smallestFirst = () => new PileHeap<Num>((a, b) => a.v < b.v);
const chip = (num: Num, tone: CellTone = "idle"): PileItem => ({ id: num.id, label: String(num.v), tone });
const list = (values: number[]) => (values.length <= 1 ? values.join("") : `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`);
const nth = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const kthName = (k: number) => (k === 1 ? "largest" : `${nth(k)} largest`);
const seats = (k: number) => `${k} seat${k === 1 ? "" : "s"}`;
const title = (k: number) => `pile · ${seats(k)} · smallest on top`;

type Draw = {
  pile?: { items: PileItem[]; title?: string; lit?: boolean } | null;
  /** Numbers already used from each row; the current one is lit. */
  used?: { start: number; adds: number };
  current?: Num | null;
  startRow?: { title: string; cells: { label: string; tone: CellTone }[] };
  answers?: number[];
  answerTone?: (index: number) => CellTone;
  out?: PileItem[];
  note?: HeapPileState["note"];
  counter?: HeapPileState["counter"];
  picks?: PickRef[];
};

function drawFor(input: Input, levels: number) {
  return (d: Draw): HeapPileState => {
    const used = d.used ?? { start: 0, adds: 0 };
    const tone = (num: Num, count: number): CellTone => (d.current && num.id === d.current.id ? "edge" : num.at < count ? "faded" : "idle");
    const answered = d.answers ?? [];
    return {
      piles: d.pile ? [{ title: d.pile.title ?? title(input.k), items: d.pile.items, seats: input.k, lit: d.pile.lit }] : [],
      levels,
      rows: [
        d.startRow ?? { title: "start", cells: input.start.map((num) => ({ label: String(num.v), tone: tone(num, used.start) })), emptyText: "(no numbers)" },
        { title: "arrives", cells: input.adds.map((num) => ({ label: String(num.v), tone: tone(num, used.adds) })) },
        { title: "answers", cells: answered.map((value, index) => ({ label: String(value), tone: d.answerTone?.(index) ?? (index === answered.length - 1 ? "hit" : "idle") })), emptyText: "(none yet)" },
      ],
      panel: { kind: "hand", title: "thrown out", items: d.out ?? [] },
      note: d.note ?? null,
      counter: d.counter ?? null,
      picks: d.picks,
    };
  };
}

function pictureFrames(input: Input, draw: (d: Draw) => HeapPileState): F[] {
  const { k, start, adds } = input;
  const results = answers(input);
  const frames: F[] = [
    { scene: "picture", caption: `Numbers arrive one at a time. After each new one, we must say the ${kthName(k)} number seen so far.`, state: draw({}) },
  ];
  const ranked = [...start].sort((a, b) => b.v - a.v);
  if (start.length >= k) {
    frames.push({
      scene: "picture",
      caption: k === 1 ? `We start with ${list(start.map((num) => num.v))}. The largest of them is ${ranked[0].v}.` : `We start with ${list(start.map((num) => num.v))}. Counting down from the largest, ${ranked[k - 1].v} is the ${nth(k)}. Equal numbers each count.`,
      state: draw({ startRow: { title: "start", cells: start.map((num) => ({ label: String(num.v), tone: num === ranked[k - 1] ? "done" : ranked.indexOf(num) < k ? "hit" : "idle" })) } }),
    });
  } else {
    frames.push({
      scene: "picture",
      caption: start.length === 0 ? `We start with no numbers at all, so there is no ${kthName(k)} yet.` : `We start with ${list(start.map((num) => num.v))}. That is fewer than ${k}, so there is no ${kthName(k)} yet.`,
      state: draw({}),
    });
  }
  if (adds.length > 0) {
    frames.push({
      scene: "picture",
      caption: `Then ${adds[0].v} arrives. Now the ${kthName(k)} of everything so far is ${results[0]}.`,
      state: draw({ current: adds[0], answers: results.slice(0, 1) }),
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: after every new number, report the ${kthName(k)} so far. Here the answers are ${list(results)}.`,
    state: draw({ answers: results, answerTone: () => "done" }),
  });
  return frames;
}

/** The obvious way, really run: keep every number and sort them all again after each add, counting each look. */
function slowFrames(input: Input, draw: (d: Draw) => HeapPileState): F[] {
  const { k, start, adds } = input;
  const all = start.map((num) => num.v);
  const results: number[] = [];
  const frames: F[] = [];
  let looks = 0;
  adds.forEach((num, index) => {
    all.push(num.v);
    const sorted = [...all].sort((a, b) => {
      looks++;
      return b - a;
    });
    results.push(sorted[k - 1]);
    if (index > 1) return;
    frames.push({
      scene: "slow",
      caption: `${index === 0 ? "The slow way keeps every number. " : ""}${num.v} arrives, so ${all.length === 1 ? "the one number is" : `all ${all.length} numbers are`} sorted again, and we count ${k} from the top: ${sorted[k - 1]}.`,
      state: draw({
        startRow: { title: "all, sorted", cells: sorted.map((value, at) => ({ label: String(value), tone: at === k - 1 ? "done" : at < k - 1 ? "hit" : "window" })) },
        used: { start: start.length, adds: index },
        current: num,
        answers: [...results],
        counter: { label: "looks", value: looks },
      }),
    });
  });
  frames.push({
    scene: "slow",
    caption: `This is O(n log n) for every add. All the numbers are sorted again each time, ${looks} looks in total, and only one of them is ever used.`,
    state: draw({
      startRow: { title: "all, sorted", cells: [...all].sort((a, b) => b - a).map((value) => ({ label: String(value), tone: "faded" })) },
      used: { start: start.length, adds: adds.length },
      answers: results,
      counter: { label: "looks", value: looks },
    }),
  });
  return frames;
}

function insightFrames(input: Input, draw: (d: Draw) => HeapPileState): F[] {
  const { k, start } = input;
  const pile = smallestFirst();
  const out: Num[] = [];
  for (const num of start) {
    pile.add(num);
    if (pile.size > k) out.push(pile.poll()!);
  }
  const kept = pile.items.map((num) => num.v).sort((a, b) => b - a);
  const frames: F[] = [
    {
      scene: "insight",
      caption: k === 1 ? `Picture a sorting pile with only ${seats(k)}. It keeps only the largest number so far${kept.length > 0 ? `: here ${kept[0]}` : ""}.` : `Picture a sorting pile with only ${seats(k)}. It keeps the ${k} largest numbers so far${kept.length > 0 ? `: here ${kept.length < k ? "only " : ""}${list(kept)}` : ""}, with the smallest on top.`,
      state: draw({ pile: { items: pile.items.map((num, index) => chip(num, index === 0 ? "edge" : "idle")) }, used: { start: start.length, adds: 0 } }),
    },
  ];
  if (out.length > 0) {
    frames.push({
      scene: "insight",
      caption: `${list(out.map((num) => num.v))} ${out.length === 1 ? "is" : "are"} below the ${k} largest. New numbers can only push ${out.length === 1 ? "it" : "them"} further down, so ${out.length === 1 ? "it is" : "they are"} thrown out for good.`,
      state: draw({ pile: { items: pile.items.map((num) => chip(num)) }, used: { start: start.length, adds: 0 }, out: out.map((num) => chip(num, "miss")) }),
    });
  }
  frames.push({
    scene: "insight",
    caption: `The top is the smallest of the kept numbers, so it is exactly the ${kthName(k)} so far. Each new number is one drop, maybe one throw, and one look at the top.`,
    state: draw({ pile: { items: pile.items.map((num, index) => chip(num, index === 0 ? "done" : "idle")), lit: true }, used: { start: start.length, adds: 0 }, out: out.map((num) => chip(num, "faded")) }),
  });
  return frames;
}

/** "Which number is thrown out?" Asked only when the smallest is a single number, so exactly one click is right. */
function leaveQuiz(before: Num[], incoming: Num, k: number): { quiz: StoryQuiz; picks: PickRef[] } | null {
  const group = [...before, incoming];
  const least = Math.min(...group.map((num) => num.v));
  if (group.filter((num) => num.v === least).length !== 1) return null;
  const picks: PickRef[] = [...before.map((_, index): PickRef => ({ at: "pile", pile: 0, index })), { at: "row", row: 1, index: incoming.at }];
  const answer = group.findIndex((num) => num.v === least);
  const feedback: Record<number, string> = {};
  group.forEach((num, index) => {
    if (index === answer) return;
    feedback[index] = index === group.length - 1 ? `${num.v} is larger than a number in the pile, so it earns a seat.` : `${num.v} is not the smallest here. A smaller number has less right to a seat.`;
  });
  const leaves = group[answer];
  return {
    picks,
    quiz: {
      kind: "cell",
      cells: picks.length,
      question: `${incoming.v} arrives, but there ${k === 1 ? "is" : "are"} only ${seats(k)}. Which number will be thrown out? Click it, in the pile or in the row.`,
      answer,
      feedback,
      otherwise: "Compare the newcomer with the numbers in the pile. The smallest of them all has to go.",
      why: leaves === incoming ? `${incoming.v} is smaller than every kept number. It drops in, comes up to the top, and is thrown straight out.` : `${leaves.v} was the smallest kept number, waiting on top. ${incoming.v} takes its seat.`,
    },
  };
}

/** The real algorithm, one frame per change. `practice` reuses it: the reader makes every throw-out decision. */
function solutionFrames(input: Input, levels: number, scene: SceneId = "solution", practice = false): F[] {
  const { k, start, adds } = input;
  const draw = drawFor(input, levels);
  const frames: F[] = [];
  const pile = smallestFirst();
  const out: Num[] = [];
  const results: number[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const asked = { old: false, newcomer: false };
  let moves = 0;
  let fullest = 0;
  const items = (mark: (num: Num, index: number) => CellTone = (_, index) => (index === 0 ? "edge" : "idle")) => pile.items.map((num, index) => chip(num, mark(num, index)));
  const thrown = (fresh?: Num) => out.map((num) => chip(num, num === fresh ? "miss" : "faded"));

  frames.push({
    scene,
    caption: practice ? `Your turn, with k = ${k}. The pile has ${seats(k)}, smallest on top. First the start numbers go in.` : `Start with an empty pile that has ${seats(k)}, because k is ${k}. It keeps its smallest number on top.`,
    codeLine: line(0),
    state: draw({ pile: { items: [] } }),
  });

  // Building the pile from the start numbers, trimmed to k seats.
  if (practice) {
    const everything = [...start];
    for (const num of start) pile.add(num);
    const overflow = pile.size - k;
    if (overflow === 1) {
      const least = Math.min(...everything.map((num) => num.v));
      const answer = everything.findIndex((num) => num.v === least);
      const picks = everything.map((_, index): PickRef => ({ at: "row", row: 0, index }));
      frames.push({
        scene,
        caption: `The start numbers are ${list(everything.map((num) => num.v))}. That is one more than the ${seats(k)}.`,
        state: draw({ pile: { items: [] }, picks }),
        quiz: {
          kind: "cell",
          cells: everything.length,
          question: "The pile must be trimmed before the first new number. Which start number is thrown out? Click it.",
          answer,
          feedback: Object.fromEntries(everything.map((num, index) => [index, `${num.v} is not the smallest. It is one of the ${k} largest, so it keeps a seat.`]).filter(([index]) => index !== answer)),
          otherwise: "Only the largest numbers keep a seat.",
          why: `${least} is below the ${k} largest. It can never be the answer again, so it goes now.`,
        },
      });
    }
    while (pile.size > k) {
      out.push(pile.poll()!);
      moves++;
    }
    frames.push({
      scene,
      caption: out.length > 0 ? `${list(out.map((num) => num.v))} ${out.length === 1 ? "is" : "are"} thrown out. The pile is trimmed to ${seats(k)}, with ${pile.peek()!.v} on top.` : `The start numbers all fit. ${pile.size > 0 ? `The top is ${pile.peek()!.v}.` : "The pile is still empty."}`,
      state: draw({ pile: { items: items() }, used: { start: start.length, adds: 0 }, out: thrown(out.at(-1)) }),
    });
  } else {
    for (const num of start) {
      pile.add(num);
      moves++;
      fullest = Math.max(fullest, pile.size);
      const over = pile.size > k;
      frames.push({
        scene,
        caption: over ? `${num.v} from the start drops into the pile. That is one too many, and the smallest, ${pile.peek()!.v}, is on top.` : `${num.v} from the start drops into the pile. There is a free seat, so it stays.`,
        codeLine: 2,
        state: draw({ pile: { items: items((other, index) => (other === num ? "hit" : index === 0 ? "edge" : "idle")) }, used: { start: num.at, adds: 0 }, current: num, out: thrown() }),
      });
      if (over) {
        const gone = pile.poll()!;
        moves++;
        out.push(gone);
        frames.push({
          scene,
          caption: `The top, ${gone.v}, is thrown out. It is below the ${k} largest, so it can never be the answer.`,
          codeLine: 7,
          state: draw({ pile: { items: items() }, used: { start: num.at + 1, adds: 0 }, out: thrown(gone) }),
        });
      }
    }
    if (start.length > k) {
      const all = smallestFirst();
      for (const num of start) all.add(num);
      frames.push({
        scene,
        caption: `The Overfull Start Trap: without this trim, the pile would keep all ${start.length} start numbers, and its top, ${all.peek()!.v}, would be a wrong answer.`,
        codeLine: 2,
        state: draw({
          pile: { items: all.items.map((num, index) => chip(num, index === 0 ? "miss" : "idle")), title: `pile · ${start.length} kept · smallest on top` },
          used: { start: start.length, adds: 0 },
          note: { text: `✕ ${start.length} kept, only ${k} seats`, tone: "coral" },
        }),
      });
    }
  }

  // The stream: every add is a drop, maybe a throw, and a look at the top.
  for (const num of adds) {
    const used = { start: start.length, adds: num.at };
    if (pile.size >= k) {
      const before = [...pile.items];
      const leavesNewcomer = num.v < before[0].v;
      const kind = leavesNewcomer ? "newcomer" : "old";
      const ask = practice || !asked[kind] ? leaveQuiz(before, num, k) : null;
      if (ask) {
        asked[kind] = true;
        frames.push({
          scene,
          caption: `${num.v} arrives. Every seat is taken, so once it is in the pile, one number must leave.`,
          codeLine: line(4),
          state: draw({ pile: { items: items(() => "idle") }, used, current: num, out: thrown(), answers: [...results], picks: ask.picks }),
          quiz: ask.quiz,
        });
      }
      pile.add(num);
      moves++;
      fullest = Math.max(fullest, pile.size);
      if (!practice) {
        frames.push({
          scene,
          caption: `${num.v} ${ask ? "drops" : "arrives and drops"} into the pile. That is one too many, and the smallest, ${pile.peek()!.v}, is on top.`,
          codeLine: 6,
          state: draw({ pile: { items: items((other, index) => (index === 0 ? "edge" : other === num ? "hit" : "idle")) }, used, current: num, out: thrown(), answers: [...results], note: { text: `${pile.size} in the pile, ${seats(k)}`, tone: "muted" } }),
        });
      }
      const gone = pile.poll()!;
      moves++;
      out.push(gone);
      frames.push({
        scene,
        caption: gone === num ? `The top, ${gone.v}, is thrown out at once. It was smaller than every kept number.` : `The top, ${gone.v}, is thrown out. ${num.v} keeps its seat.`,
        codeLine: line(7),
        state: draw({ pile: { items: items() }, used, current: num, out: thrown(gone), answers: [...results] }),
      });
    } else {
      pile.add(num);
      moves++;
      fullest = Math.max(fullest, pile.size);
      frames.push({
        scene,
        caption: `${num.v} arrives and drops into the pile. There is a free seat, so it stays.`,
        codeLine: line(5),
        state: draw({ pile: { items: items((other, index) => (other === num ? "hit" : index === 0 ? "edge" : "idle")) }, used, current: num, out: thrown(), answers: [...results] }),
      });
    }
    results.push(pile.peek()!.v);
    frames.push({
      scene,
      caption: `The top of the pile is ${pile.peek()!.v}: the ${kthName(k)} so far. It goes on the answers row.`,
      codeLine: line(9),
      state: draw({ pile: { items: items((_, index) => (index === 0 ? "done" : "idle")) }, used: { start: start.length, adds: num.at + 1 }, out: thrown(), answers: [...results] }),
    });
  }

  const answer = JSON.stringify(results);
  frames.push({
    scene,
    caption: practice ? `Done. The answers were ${list(results)}, so the answer is ${answer}.` : `Every number has arrived. The answers were ${list(results)}, so the answer is ${answer}.`,
    codeLine: line(9),
    state: draw({ pile: { items: items((_, index) => (index === 0 ? "done" : "hit")) }, used: { start: start.length, adds: adds.length }, out: thrown(), answers: results, answerTone: () => "done" }),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(log k) per add. The pile never held more than ${fullest} numbers, so a drop or a throw is only a step or two.`,
      codeLine: 5,
      state: draw({ pile: { items: items(() => "done") }, used: { start: start.length, adds: adds.length }, out: thrown(), answers: results, counter: { label: "drops and throws", value: moves } }),
    });
    frames.push({
      scene,
      caption: `Space: O(k). The pile has only ${seats(k)}, plus one extra number for a moment, however many numbers arrive.`,
      codeLine: 0,
      state: draw({ pile: { items: items(() => "window"), lit: true }, used: { start: start.length, adds: adds.length }, out: thrown(), answers: results }),
    });
  }
  return frames;
}

export const kthLargestInStreamStory: ProblemStory<HeapPileState> = {
  slugs: ["lc-703"],
  pattern: "Heap / top K",
  trigger: "numbers keep arriving, and after each one you must report “the kth largest so far”",
  insight: "A sorting pile with only k seats, smallest on top. Each new number drops in; when there is one too many, the top is thrown out. The top is always the kth largest so far.",
  metaphor: { name: "The sorting pile", legend: "pile = the priority queue · seats = k · top = peek() · thrown out = poll()", terms: ["pile", "top", "seat", "thrown out"] },
  traps: [{ name: "The Overfull Start Trap", rule: "The starting numbers can be more than k. Trim the pile down to k seats when it is built, or the top shows a number that is too small." }],
  template: [
    "pile = new PriorityQueue (smallest on top);",
    "on each new item:",
    "    pile.add(item);",
    "    if (pile.size() > k) pile.poll();   // throw out the weakest",
    "    report pile.peek();",
  ],
  complexity: {
    slow: "O(n log n) per add",
    time: "O(log k) per add",
    timeWhy: "the pile never holds more than k + 1 numbers",
    space: "O(k)",
    spaceWhy: "the pile has k seats, however many numbers arrive",
  },
  code: CODE,
  examples: [
    { label: "k = 3, start [4,5,8,2], then 3, 5, 10, 9, 4", input: "3 | 4,5,8,2 | 3,5,10,9,4", expected: "[4,5,5,8,8]", note: "More start numbers than seats" },
    { label: "k = 2, start [0], then -1, 1, -2, -4, 3", input: "2 | 0 | -1,1,-2,-4,3", expected: "[-1,0,0,0,1]", note: "Fewer start numbers than seats" },
    { label: "k = 1, no start, then 5, 2, 7", input: "1 |  | 5,2,7", expected: "[5,5,7]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-215", title: "Kth Largest Element in an Array" },
    { slug: "lc-295", title: "Find Median from Data Stream" },
    { slug: "lc-1046", title: "Last Stone Weight" },
  ],
  answer: (input) => JSON.stringify(answers(parse(input))),
  frames: (input) => {
    const parsed = parse(input);
    const practice = parse(PRACTICE);
    const levels = pileLevels(Math.max(parsed.k, practice.k) + 1);
    const draw = drawFor(parsed, levels);
    const pile = smallestFirst();
    const out: Num[] = [];
    for (const num of [...parsed.start, ...parsed.adds]) {
      pile.add(num);
      if (pile.size > parsed.k) out.push(pile.poll()!);
    }
    return [
      ...pictureFrames(parsed, draw),
      ...slowFrames(parsed, draw),
      ...insightFrames(parsed, draw),
      ...solutionFrames(parsed, levels),
      ...solutionFrames(practice, levels, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw({ pile: { items: pile.items.map((num, index) => chip(num, index === 0 ? "done" : "idle")), lit: true }, used: { start: parsed.start.length, adds: parsed.adds.length }, out: out.map((num) => chip(num, "faded")), answers: answers(parsed), answerTone: () => "done" }),
      },
    ];
  },
  View: HeapPileView,
};
