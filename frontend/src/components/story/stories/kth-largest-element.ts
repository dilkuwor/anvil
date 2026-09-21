import type { CellTone } from "@/components/learn/viz/primitives";

import { HeapPileView, PileHeap, pileLevels, type HeapPileState, type PickRef, type PileItem } from "../agy-heap-pile-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<HeapPileState>;
type Num = { id: string; v: number; at: number };
type Input = { nums: Num[]; k: number };

/** Fresh numbers for the "your turn" run: once the newcomer leaves at once, twice an old number leaves. */
const PRACTICE = "4,8,1,6,9 | k=2";

const CODE = [
  "PriorityQueue<Integer> pile = new PriorityQueue<>(k);",
  "for (int value : nums) {",
  "    pile.add(value);",
  "    if (pile.size() > k) {",
  "        pile.poll();",
  "    }",
  "}",
  "return pile.peek();",
];

function parse(input: string): Input {
  const [list, rest] = input.split("|");
  const nums = list
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part, index) => ({ id: `n${index}`, v: Number(part), at: index }));
  const k = Number((rest ?? "").replace(/[^0-9]/g, "")) || 1;
  return { nums, k: Math.min(Math.max(k, 1), nums.length) };
}

/** Independent solver: order everything from largest down and count to k. */
const solve = ({ nums, k }: Input) => [...nums].map((num) => num.v).sort((a, b) => b - a)[k - 1];

const smallestFirst = () => new PileHeap<Num>((a, b) => a.v < b.v);
const largestFirst = () => new PileHeap<Num>((a, b) => a.v > b.v);
const chip = (num: Num, tone: CellTone = "idle"): PileItem => ({ id: num.id, label: String(num.v), tone });
const list = (values: number[]) => (values.length <= 1 ? values.join("") : `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`);
const nth = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const kthName = (k: number) => (k === 1 ? "largest" : `${nth(k)} largest`);
const seats = (k: number) => `${k} seat${k === 1 ? "" : "s"}`;

type Draw = {
  pile?: { title: string; items: PileItem[]; seats?: number; lit?: boolean } | null;
  row: { nums: Num[]; tone: (num: Num, index: number) => CellTone; subs?: (num: Num, index: number) => string | undefined };
  out?: PileItem[];
  note?: HeapPileState["note"];
  counter?: HeapPileState["counter"];
  picks?: PickRef[];
};

function draw(levels: number, d: Draw): HeapPileState {
  return {
    piles: d.pile ? [{ title: d.pile.title, items: d.pile.items, seats: d.pile.seats, lit: d.pile.lit }] : [],
    levels,
    rows: [{ title: "numbers", cells: d.row.nums.map((num, index) => ({ label: String(num.v), tone: d.row.tone(num, index), sub: d.row.subs?.(num, index) })) }],
    panel: { kind: "hand", title: "thrown out", items: d.out ?? [] },
    note: d.note ?? null,
    counter: d.counter ?? null,
    picks: d.picks,
  };
}

function pictureFrames({ nums, k }: Input, levels: number): F[] {
  const ranked = [...nums].sort((a, b) => b.v - a.v);
  const kth = ranked[k - 1];
  const above = ranked.slice(0, k - 1);
  const rank = (num: Num) => ranked.indexOf(num) + 1;
  const frames: F[] = [
    { scene: "picture", caption: `These are ${nums.length} numbers, in no order. We want the ${kthName(k)} of them.`, state: draw(levels, { row: { nums, tone: () => "idle" } }) },
    {
      scene: "picture",
      caption: k === 1 ? `Look for the largest number of all. Here it is ${kth.v}.` : `Count from the largest down: ${above.map((num) => `${num.v} is the ${nth(rank(num))}`).join(", ")}, and ${kth.v} is the ${nth(k)}. Equal numbers each get their own place.`,
      state: draw(levels, { row: { nums, tone: (num) => (num === kth ? "done" : above.includes(num) ? "hit" : "idle"), subs: (num) => (rank(num) <= k ? nth(rank(num)) : undefined) } }),
    },
  ];
  const wrong = nums[k - 1];
  if (wrong.v !== kth.v) {
    frames.push({
      scene: "picture",
      caption: `It is not the ${nth(k)} number in the row. That would be ${wrong.v}, and the row is in no order at all.`,
      state: draw(levels, { row: { nums, tone: (num) => (num === wrong ? "miss" : "idle") }, note: { text: `✕ ${nth(k)} in the row is not ${nth(k)} largest`, tone: "coral" } }),
    });
  }
  frames.push({ scene: "picture", caption: `The goal: return the ${kthName(k)} number. Here that is ${kth.v}.`, state: draw(levels, { row: { nums, tone: (num) => (num === kth ? "done" : "idle") } }) });
  return frames;
}

/** The obvious way, really run: sort every number, counting each look the sort makes. */
function slowFrames({ nums, k }: Input, levels: number): F[] {
  let looks = 0;
  const sorted = [...nums].sort((a, b) => {
    looks++;
    return a.v - b.v;
  });
  const kth = sorted[sorted.length - k];
  const counter = { label: "looks", value: looks };
  return [
    { scene: "slow", caption: `The slow way: put every number in order, smallest to largest. That took ${looks} looks, two numbers at a time.`, state: draw(levels, { row: { nums: sorted, tone: () => "window" }, counter }) },
    {
      scene: "slow",
      caption: `Now count ${k} from the large end. The ${kthName(k)} is ${kth.v}.`,
      state: draw(levels, { row: { nums: sorted, tone: (num, index) => (num === kth ? "done" : index > sorted.length - k ? "hit" : "faded") }, counter }),
    },
    {
      scene: "slow",
      caption: `This is O(n log n) time. It put all ${nums.length} numbers in perfect order, and then we used only one of them.`,
      state: draw(levels, { row: { nums: sorted, tone: (num) => (num === kth ? "done" : "faded") }, counter }),
    },
  ];
}

type Overflow = { num: Num; before: Num[]; after: Num[]; leaves: Num; kept: Num[] };

/** Runs the real algorithm and notes every moment the pile had one too many. */
function overflows({ nums, k }: Input): Overflow[] {
  const pile = smallestFirst();
  const found: Overflow[] = [];
  for (const num of nums) {
    const before = [...pile.items];
    pile.add(num);
    if (pile.size > k) {
      const after = [...pile.items];
      const leaves = pile.poll()!;
      found.push({ num, before, after, leaves, kept: [...pile.items] });
    }
  }
  return found;
}

function insightFrames(input: Input, levels: number): F[] {
  const { nums, k } = input;
  const title = `pile · ${seats(k)} · smallest on top`;
  const moment = overflows(input).find((each) => each.num.v > each.leaves.v) ?? overflows(input)[0];
  if (!moment) {
    const pile = smallestFirst();
    for (const num of nums) pile.add(num);
    return [{ scene: "insight", caption: `Picture a sorting pile with only ${seats(k)}, smallest on top. Here every number gets a seat, so the top, ${pile.peek()!.v}, is the ${kthName(k)}.`, state: draw(levels, { pile: { title, seats: k, items: pile.items.map((num, index) => chip(num, index === 0 ? "edge" : "idle")) }, row: { nums, tone: () => "faded" } }) }];
  }
  const rowTone = (upTo: number, current: number | null) => (num: Num) => (num.at === current ? "edge" : num.at < upTo ? "faded" : "idle") as CellTone;
  return [
    {
      scene: "insight",
      caption: `Picture a sorting pile with only ${seats(k)}. It keeps the ${k === 1 ? "largest number" : `${k} largest numbers`} seen so far: right now ${list(moment.before.map((num) => num.v).sort((a, b) => a - b))}.`,
      state: draw(levels, { pile: { title: `pile · ${seats(k)}`, seats: k, items: moment.before.map((num) => chip(num, "window")) }, row: { nums, tone: rowTone(moment.num.at, null) } }),
    },
    {
      scene: "insight",
      caption: `This pile keeps its smallest number on top: ${moment.before[0].v}. The top is the weakest of the kept numbers, the first that would have to go.`,
      state: draw(levels, { pile: { title, seats: k, items: moment.before.map((num, index) => chip(num, index === 0 ? "edge" : "idle")) }, row: { nums, tone: rowTone(moment.num.at, null) } }),
    },
    {
      scene: "insight",
      caption: `${moment.num.v} arrives and is larger. So ${moment.leaves.v} is thrown out and ${moment.num.v} takes a seat. The pile still holds the ${k === 1 ? "largest" : `${k} largest`} so far.`,
      state: draw(levels, { pile: { title, seats: k, items: moment.kept.map((num, index) => chip(num, num === moment.num ? "hit" : index === 0 ? "edge" : "idle")) }, row: { nums, tone: rowTone(moment.num.at, moment.num.at) }, out: [chip(moment.leaves, "miss")] }),
    },
    {
      scene: "insight",
      caption: k === 1 ? `At the end the pile holds only the largest number of all. It sits on top, ready to be read.` : `At the end the pile holds the ${k} largest numbers. Its top is the smallest of them, and that is the ${kthName(k)} of all.`,
      state: draw(levels, { pile: { title, seats: k, lit: true, items: moment.kept.map((num, index) => chip(num, index === 0 ? "edge" : "idle")) }, row: { nums, tone: rowTone(moment.num.at, moment.num.at) }, out: [chip(moment.leaves, "miss")] }),
    },
  ];
}

const topQuiz = (k: number): StoryQuiz => ({
  kind: "choice",
  question: `The pile keeps the ${k === 1 ? "largest number" : `${k} largest numbers`} so far. You can only reach its top. Which kept number must sit on top?`,
  options: ["The smallest of the kept numbers", "The largest of the kept numbers"],
  answer: 0,
  why: "When a larger number arrives, the one to throw out is the smallest kept. So that is the one to keep within reach.",
});

const seatsQuiz = (k: number, n: number): StoryQuiz => ({
  kind: "choice",
  question: `We want the ${kthName(k)} of ${n} numbers. How many seats does the pile need?`,
  options: [`${seats(k)}: only the largest ones stay`, `${seats(n)}: one for every number`],
  answer: 0,
  why: `A number that is not among the ${k === 1 ? "largest" : `${k} largest`} so far can never be the answer. It can be thrown out at once.`,
});

function leaveQuiz(moment: Overflow, k: number): { quiz: StoryQuiz; picks: PickRef[] } | null {
  const group = [...moment.before, moment.num];
  const least = Math.min(...group.map((num) => num.v));
  if (group.filter((num) => num.v === least).length !== 1) return null;
  const picks: PickRef[] = [...moment.before.map((_, index): PickRef => ({ at: "pile", pile: 0, index })), { at: "row", row: 0, index: moment.num.at }];
  const answer = group.findIndex((num) => num.v === least);
  const feedback: Record<number, string> = {};
  group.forEach((num, index) => {
    if (index === answer) return;
    feedback[index] = index === group.length - 1 ? `The newcomer ${num.v} is larger than a number in the pile, so it earns a seat.` : `${num.v} is not the smallest here. A smaller number has less right to a seat.`;
  });
  return {
    picks,
    quiz: {
      kind: "cell",
      cells: picks.length,
      question: `${moment.num.v} arrives, but there are only ${seats(k)}. Which number will be thrown out? Click it, in the pile or in the row.`,
      answer,
      feedback,
      otherwise: "Compare the newcomer with the numbers in the pile. The smallest of them all has to go.",
      why: moment.leaves === moment.num ? `${moment.num.v} is smaller than everything kept. It goes in, comes up to the top, and is thrown straight out.` : `${moment.leaves.v} was the smallest kept number, waiting on top. ${moment.num.v} takes its seat.`,
    },
  };
}

/** The real algorithm, one frame per change. `practice` reuses it on fresh numbers: the reader makes every decision. */
function solutionFrames(input: Input, levels: number, scene: SceneId = "solution", practice = false): F[] {
  const { nums, k } = input;
  const frames: F[] = [];
  const pile = smallestFirst();
  const line = (index: number) => (practice ? undefined : index);
  const title = `pile · ${seats(k)} · smallest on top`;
  const out: Num[] = [];
  let moves = 0;
  let fullest = 0;
  const asked = { old: false, newcomer: false };
  const row = (current: number | null) => ({ nums, tone: (num: Num) => (num.at === current ? "edge" : current !== null && num.at < current ? "faded" : current === null && pile.size + out.length > 0 ? "faded" : "idle") as CellTone });
  const items = (mark: (num: Num, index: number) => CellTone = (_, index) => (index === 0 ? "edge" : "idle")) => pile.items.map((num, index) => chip(num, mark(num, index)));
  const thrown = () => out.map((num) => chip(num, "faded"));

  // The trap is drawn for real: every number in one big pile, largest on top.
  const everything = largestFirst();
  for (const num of nums) everything.add(num);
  const trapFrame: F = {
    scene,
    caption: `The Keep-Everything Trap: a pile with the largest on top also works, but it must hold all ${nums.length} numbers. With the smallest on top, ${seats(k)} ${k === 1 ? "is" : "are"} enough.`,
    codeLine: line(0),
    state: draw(levels, { pile: { title: `pile · ${seats(nums.length)} · largest on top`, items: everything.items.map((num) => chip(num, "miss")) }, row: { nums, tone: () => "faded" }, note: { text: `✕ ${seats(nums.length)} used, ${k} needed`, tone: "coral" } }),
  };

  if (practice) {
    frames.push({ scene, caption: `Your turn, with new numbers: ${list(nums.map((num) => num.v))}. Find the ${kthName(k)}. First, set up the pile.`, state: draw(levels, { pile: { title: "pile", items: [] }, row: row(null) }), quiz: seatsQuiz(k, nums.length) });
    frames.push(trapFrame);
    frames.push({ scene, caption: `So the pile gets ${seats(k)}. Now choose what it shows on top.`, state: draw(levels, { pile: { title: `pile · ${seats(k)}`, seats: k, items: [] }, row: row(null) }), quiz: topQuiz(k) });
    frames.push({ scene, caption: "Smallest on top: the weakest kept number is always within reach.", state: draw(levels, { pile: { title, seats: k, items: [] }, row: row(null) }) });
  } else {
    frames.push({ scene, caption: `Start with an empty pile that has ${seats(k)}, because k is ${k}.`, codeLine: 0, state: draw(levels, { pile: { title: `pile · ${seats(k)}`, seats: k, items: [] }, row: row(null) }), quiz: topQuiz(k) });
    frames.push({ scene, caption: "Smallest on top. The top is the weakest kept number, the only one that may have to leave.", codeLine: 0, state: draw(levels, { pile: { title, seats: k, items: [] }, row: row(null) }) });
    frames.push(trapFrame);
  }

  for (const num of nums) {
    if (pile.size < k) {
      pile.add(num);
      moves++;
      fullest = Math.max(fullest, pile.size);
      frames.push({
        scene,
        caption: `${num.v} arrives and drops into the pile. There is a free seat, so it stays. The top is ${pile.peek()!.v}.`,
        codeLine: line(2),
        state: draw(levels, { pile: { title, seats: k, items: items((other, index) => (other === num ? "hit" : index === 0 ? "edge" : "idle")) }, row: row(num.at), out: thrown() }),
      });
      continue;
    }
    const before = [...pile.items];
    const probe: Overflow = { num, before, after: [], leaves: num.v < before[0].v ? num : before[0], kept: [] };
    const kind = probe.leaves === num ? "newcomer" : "old";
    const ask = practice || !asked[kind] ? leaveQuiz(probe, k) : null;
    if (ask) {
      asked[kind] = true;
      frames.push({
        scene,
        caption: `${num.v} arrives. Every seat is taken, so once it is in the pile, one number must leave.`,
        codeLine: line(1),
        state: draw(levels, { pile: { title, seats: k, items: items(() => "idle") }, row: row(num.at), out: thrown(), picks: ask.picks }),
        quiz: ask.quiz,
      });
    }
    pile.add(num);
    moves++;
    fullest = Math.max(fullest, pile.size);
    frames.push({
      scene,
      caption: `${num.v} ${ask ? "drops" : "arrives and drops"} into the pile. That is one too many. The smallest of them is on top: ${pile.peek()!.v}.`,
      codeLine: line(3),
      state: draw(levels, { pile: { title, seats: k, items: items((other, index) => (index === 0 ? "edge" : other === num ? "hit" : "idle")) }, row: row(num.at), out: thrown(), note: { text: `${pile.size} in the pile, ${seats(k)}`, tone: "muted" } }),
    });
    const gone = pile.poll()!;
    moves++;
    out.push(gone);
    frames.push({
      scene,
      caption: num.v === before[0].v ? `The top is a ${gone.v}, and it is thrown out. Another ${gone.v} stays. With equal numbers it does not matter which one goes.` : gone === num ? `The top, ${gone.v}, is thrown out at once. It was smaller than every kept number.` : `The top, ${gone.v}, is thrown out. The pile keeps ${list(pile.items.map((other) => other.v).sort((a, b) => a - b))}, and its top is ${pile.peek()!.v}.`,
      codeLine: line(4),
      state: draw(levels, { pile: { title, seats: k, items: items() }, row: row(num.at), out: [...out.slice(0, -1).map((other) => chip(other, "faded")), chip(gone, "miss")] }),
    });
  }

  const answer = pile.peek()!.v;
  const kept = pile.items.map((num) => num.v).sort((a, b) => a - b);
  frames.push({
    scene,
    caption: k === 1 ? `The row is done. The pile kept only the largest number, and it sits on top. The answer is ${answer}.` : `The row is done. The pile kept the ${k} largest: ${list(kept)}. Its top is the smallest of them, so the answer is ${answer}.`,
    codeLine: line(7),
    state: draw(levels, { pile: { title, seats: k, items: items((_, index) => (index === 0 ? "done" : "hit")) }, row: { nums, tone: (num) => (pile.items.includes(num) ? "hit" : "faded") }, out: thrown() }),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log k). Each of the ${nums.length} numbers dropped into a pile of at most ${fullest}. In a pile that small, a drop or a take is only a step or two.`,
      codeLine: 2,
      state: draw(levels, { pile: { title, seats: k, items: items(() => "done") }, row: { nums, tone: () => "faded" }, out: thrown(), counter: { label: "drops and takes", value: moves } }),
    });
    frames.push({
      scene,
      caption: `Space: O(k). The pile has only ${seats(k)}, plus one extra number for a moment. That stays true however long the row is.`,
      codeLine: 0,
      state: draw(levels, { pile: { title, seats: k, lit: true, items: items(() => "window") }, row: { nums, tone: () => "faded" }, out: thrown() }),
    });
  }
  return frames;
}

export const kthLargestElementStory: ProblemStory<HeapPileState> = {
  slugs: ["lc-215"],
  pattern: "Heap / top K",
  trigger: "“the kth largest” (or the k largest) in a group that is in no order",
  insight: "A sorting pile with only k seats, smallest on top. Every number drops in; when there is one too many, the top is thrown out. At the end the top is the kth largest.",
  metaphor: { name: "The sorting pile", legend: "pile = the priority queue · seats = k · top = peek() · thrown out = poll()", terms: ["pile", "top", "seat", "thrown out"] },
  traps: [{ name: "The Keep-Everything Trap", rule: "A largest-on-top pile must hold all n numbers. Keep a smallest-on-top pile with only k seats: O(k) memory and O(n log k) time." }],
  template: [
    "pile = new PriorityQueue (the weakest kept item on top);",
    "for (item : items) {",
    "    pile.add(item);",
    "    if (pile.size() > k) pile.poll();   // throw out the weakest",
    "}",
    "answer = pile.peek();   // or everything still in the pile",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n log k)",
    timeWhy: "each of the n numbers drops into a pile that never holds more than k + 1",
    space: "O(k)",
    spaceWhy: "the pile has k seats, however many numbers go by",
  },
  code: CODE,
  examples: [
    { label: "[3,2,1,5,6,4], k = 2", input: "3,2,1,5,6,4 | k=2", expected: "5" },
    { label: "[3,2,3,1,2,4,5], k = 3", input: "3,2,3,1,2,4,5 | k=3", expected: "3", note: "Equal numbers each take a place" },
    { label: "[7,4,9,2], k = 1", input: "7,4,9,2 | k=1", expected: "9" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-973", title: "K Closest Points to Origin" },
    { slug: "lc-347", title: "Top K Frequent Elements" },
    { slug: "lc-1046", title: "Last Stone Weight" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const parsed = parse(input);
    const practice = parse(PRACTICE);
    const levels = pileLevels(Math.max(parsed.nums.length, practice.nums.length));
    const pile = smallestFirst();
    for (const num of parsed.nums) {
      pile.add(num);
      if (pile.size > parsed.k) pile.poll();
    }
    return [
      ...pictureFrames(parsed, levels),
      ...slowFrames(parsed, levels),
      ...insightFrames(parsed, levels),
      ...solutionFrames(parsed, levels),
      ...solutionFrames(practice, levels, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(levels, {
          pile: { title: `pile · ${seats(parsed.k)} · smallest on top`, seats: parsed.k, items: pile.items.map((num, index) => chip(num, index === 0 ? "edge" : "idle")) },
          row: { nums: parsed.nums, tone: (num) => (pile.items.includes(num) ? "hit" : "faded") },
        }),
      },
    ];
  },
  View: HeapPileView,
};
