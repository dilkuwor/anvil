import type { CellTone } from "@/components/learn/viz/primitives";

import { HeapPileView, PileHeap, pileLevels, type HeapPileState, type PickRef, type PileItem } from "../agy-heap-pile-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<HeapPileState>;
/** One number of one list. `list` and `at` say where it lives; `seq` keeps equal numbers in a fixed order. */
type Node = { id: string; v: number; list: number; at: number; seq: number };
type Lists = Node[][];

/** Fresh lists for the "your turn" run. The middle one is empty. */
const PRACTICE = "2,9 / - / 1,4,6";

const CODE = [
  "PriorityQueue<ListNode> pile = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));",
  "for (ListNode head : lists) {",
  "    if (head != null) pile.add(head);",
  "}",
  "ListNode dummy = new ListNode(0);",
  "ListNode tail = dummy;",
  "while (!pile.isEmpty()) {",
  "    ListNode node = pile.poll();",
  "    tail.next = node;",
  "    tail = node;",
  "    if (node.next != null) {",
  "        pile.add(node.next);",
  "    }",
  "}",
  "tail.next = null;",
  "return dummy.next;",
];

function parse(input: string): Lists {
  let seq = 0;
  return input.split("/").map((part, list) =>
    part
      .split(",")
      .map((piece) => piece.trim())
      .filter((piece) => piece.length > 0 && piece !== "-")
      .map((piece, at) => ({ id: `l${list}n${at}`, v: Number(piece), list, at, seq: seq++ })),
  );
}

/** Independent solver: pour every number into one bag and sort it. */
const solve = (lists: Lists) => lists.flat().map((node) => node.v).sort((a, b) => a - b);
const format = (values: number[]) => `[${values.join(",")}]`;

const LETTERS = ["A", "B", "C", "D"];
const listName = (list: number) => `list ${LETTERS[list] ?? list + 1}`;
const ListName = (list: number) => `List ${LETTERS[list] ?? list + 1}`;
const smallestFirst = () => new PileHeap<Node>((a, b) => a.v < b.v || (a.v === b.v && a.seq < b.seq));
const chip = (node: Node, tone: CellTone = "idle"): PileItem => ({ id: node.id, label: String(node.v), sub: listName(node.list), tone });

type Draw = {
  pile?: { title: string; items: PileItem[]; lit?: boolean } | null;
  tone: (node: Node) => CellTone;
  merged: { v: number; tone: CellTone }[];
  hand?: PileItem[];
  handNote?: { text: string; tone: "coral" | "teal" | "muted" };
  note?: HeapPileState["note"];
  counter?: HeapPileState["counter"];
  picks?: PickRef[];
};

function draw(lists: Lists, levels: number, d: Draw): HeapPileState {
  return {
    piles: d.pile ? [{ title: d.pile.title, items: d.pile.items, lit: d.pile.lit }] : [],
    levels,
    rows: [
      ...lists.map((list, index) => ({ title: listName(index), emptyText: "(empty list)", cells: list.map((node) => ({ label: String(node.v), tone: d.tone(node) })) })),
      { title: "merged", emptyText: "(nothing yet)", cells: d.merged.map((cell) => ({ label: String(cell.v), tone: cell.tone })) },
    ],
    panel: { kind: "hand", title: "just taken", items: d.hand ?? [], note: d.handNote?.text, noteTone: d.handNote?.tone },
    note: d.note ?? null,
    counter: d.counter ?? null,
    picks: d.picks,
  };
}

function pictureFrames(lists: Lists, levels: number): F[] {
  const all = solve(lists);
  const glued = lists.flat();
  const drop = glued.findIndex((node, index) => index > 0 && glued[index - 1].v > node.v);
  const idle = () => "idle" as CellTone;
  const frames: F[] = [
    { scene: "picture", caption: `These are ${lists.length} lists. Each list is already in order, smallest first.${lists.some((list) => list.length === 0) ? " One of them is empty." : ""}`, state: draw(lists, levels, { tone: idle, merged: [] }) },
    { scene: "picture", caption: "We must join them into one list that holds every number, and is also in order.", state: draw(lists, levels, { tone: idle, merged: all.map((v) => ({ v, tone: "done" as CellTone })) }) },
  ];
  if (drop > 0) {
    frames.push({
      scene: "picture",
      caption: `Not allowed: gluing the lists end to end. Then ${glued[drop - 1].v} would come before ${glued[drop].v}, and the result is out of order.`,
      state: draw(lists, levels, { tone: idle, merged: glued.map((node, index) => ({ v: node.v, tone: (index === drop || index === drop - 1 ? "miss" : "idle") as CellTone })), note: { text: "✕ glued end to end: out of order", tone: "coral" } }),
    });
  }
  frames.push({ scene: "picture", caption: `The goal: return one merged list with all ${all.length} numbers in order.`, state: draw(lists, levels, { tone: idle, merged: all.map((v) => ({ v, tone: "done" as CellTone })) }) });
  return frames;
}

/** The obvious way, really run: merge the lists one after another, counting every number that is placed. */
function slowFrames(lists: Lists, levels: number): F[] {
  const frames: F[] = [];
  let merged: number[] = [];
  let placed = 0;
  let round = 0;
  lists.forEach((list, index) => {
    const next: number[] = [];
    let i = 0;
    let j = 0;
    while (i < merged.length || j < list.length) {
      if (j >= list.length || (i < merged.length && merged[i] <= list[j].v)) next.push(merged[i++]);
      else next.push(list[j++].v);
      placed++;
    }
    const walkedAgain = merged.length;
    merged = next;
    round++;
    frames.push({
      scene: "slow",
      caption:
        round === 1
          ? `The slow way: build the merged list one list at a time. First ${listName(index)} is copied in, number by number.`
          : `Now ${listName(index)} is merged in. ${walkedAgain > 0 ? `The ${walkedAgain} numbers already merged are all walked over and placed again.` : "Nothing was merged before it."}`,
      state: draw(lists, levels, { tone: (node) => (node.list === index ? "edge" : node.list < index ? "faded" : "idle"), merged: merged.map((v) => ({ v, tone: "window" as CellTone })), counter: { label: "numbers placed", value: placed } }),
    });
  });
  frames.push({
    scene: "slow",
    caption: `That placed numbers ${placed} times to merge only ${merged.length}. With k lists this is O(k² · n) time: the early numbers are walked over again in every round.`,
    state: draw(lists, levels, { tone: () => "faded", merged: merged.map((v) => ({ v, tone: "faded" as CellTone })), counter: { label: "numbers placed", value: placed } }),
  });
  return frames;
}

function insightFrames(lists: Lists, levels: number): F[] {
  const heads = lists.filter((list) => list.length > 0).map((list) => list[0]);
  const pile = smallestFirst();
  for (const head of heads) pile.add(head);
  const top = pile.peek()!;
  const after = lists[top.list][top.at + 1];
  const title = "pile · smallest on top";
  const frames: F[] = [
    {
      scene: "insight",
      caption: `Look only at the head of each list: its first number. The smallest number of all must be one of the heads, because each list is in order.`,
      state: draw(lists, levels, { tone: (node) => (heads.includes(node) ? "edge" : "idle"), merged: [] }),
    },
    {
      scene: "insight",
      caption: `Picture a sorting pile that holds only the heads, smallest on top. Its top, ${top.v}, is the next number of the merged list.`,
      state: draw(lists, levels, { pile: { title, items: pile.items.map((node, index) => chip(node, index === 0 ? "edge" : "idle")) }, tone: (node) => (heads.includes(node) ? "window" : "idle"), merged: [] }),
    },
  ];
  pile.poll();
  if (after) pile.add(after);
  frames.push({
    scene: "insight",
    caption: after
      ? `When ${top.v} leaves for the merged list, ${after.v} is the new head of ${listName(top.list)} and takes the free seat. The pile holds one head per list, never more.`
      : `When ${top.v} leaves for the merged list, ${listName(top.list)} is used up, so the pile just shrinks. It holds one head per list, never more.`,
    state: draw(lists, levels, {
      pile: { title, lit: true, items: pile.items.map((node) => chip(node, node === after ? "hit" : "idle")) },
      tone: (node) => (node === top ? "faded" : pile.items.includes(node) ? "window" : "idle"),
      merged: [{ v: top.v, tone: "done" }],
      hand: [chip(top, "hit")],
    }),
  });
  return frames;
}

const emptyQuiz = (list: number): StoryQuiz => ({
  kind: "choice",
  question: `${ListName(list)} is empty: it has no head. What goes into the pile for it?`,
  options: ["Nothing. Skip this list", "An empty marker, so every list has a seat"],
  answer: 0,
  why: "The pile orders what it holds by comparing numbers. An empty head has no number, so it must never go in.",
});

function nextQuiz(lists: Lists, taken: Node, inPile: Node[], done: Set<Node>): { quiz: StoryQuiz; picks: PickRef[] } {
  const cells = lists.flat();
  const picks: PickRef[] = [...cells.map((node): PickRef => ({ at: "row", row: node.list, index: node.at })), { at: "nothing" }];
  const next = lists[taken.list][taken.at + 1];
  const answer = next ? cells.indexOf(next) : cells.length;
  const feedback: Record<number, string> = {};
  cells.forEach((node, index) => {
    if (index === answer) return;
    if (node === taken || done.has(node)) feedback[index] = `${node.v} is already in the merged list.`;
    else if (inPile.includes(node)) feedback[index] = `${node.v} is already in the pile. It is the head of ${listName(node.list)}.`;
    else if (node.list !== taken.list) feedback[index] = `${ListName(node.list)} still has its head in the pile. Each list gets one seat only.`;
    else feedback[index] = `${node.v} is too deep in its list. A list gives up its numbers from the front, one at a time.`;
  });
  if (next) feedback[cells.length] = `${ListName(taken.list)} is not used up yet. It still has a number to offer.`;
  return {
    picks,
    quiz: {
      kind: "cell",
      cells: picks.length,
      question: `${taken.v} left the pile, so a seat is free. Which number drops into the pile now? Click it in its list, or click “nothing”.`,
      answer,
      feedback,
      otherwise: "Think about which list just lost its head, and what comes right after it there.",
      why: next ? `${next.v} comes right after ${taken.v} in ${listName(taken.list)}. It is that list's new head, so it takes the free seat.` : `${taken.v} was the last number of ${listName(taken.list)}. That list is used up, so the pile simply gets smaller.`,
    },
  };
}

/** The real algorithm, one frame per change. `practice` reuses it on fresh lists: the reader makes every decision. */
function solutionFrames(lists: Lists, levels: number, scene: SceneId = "solution", practice = false): F[] {
  const frames: F[] = [];
  const pile = smallestFirst();
  const line = (index: number) => (practice ? undefined : index);
  const title = "pile · smallest on top";
  const merged: Node[] = [];
  const done = new Set<Node>();
  let taken: Node | null = null;
  let moves = 0;
  let fullest = 0;
  const asked = { empty: false, next: false, nothing: false };
  const tone = (node: Node): CellTone => (node === taken ? "edge" : done.has(node) ? "faded" : pile.items.includes(node) ? "window" : "idle");
  const items = (mark: (node: Node, index: number) => CellTone = (_, index) => (index === 0 ? "edge" : "idle")) => pile.items.map((node, index) => chip(node, mark(node, index)));
  const mergedCells = (last: CellTone = "done") => merged.map((node, index) => ({ v: node.v, tone: (index === merged.length - 1 ? last : "hit") as CellTone }));
  const base = (extra: Partial<Draw> = {}): Draw => ({ pile: { title, items: items() }, tone, merged: mergedCells(), hand: taken ? [chip(taken, "edge")] : [], ...extra });

  frames.push({
    scene,
    caption: practice ? "Your turn, with new lists. First the heads go into the pile, then you keep it fed." : "Start with an empty pile that keeps its smallest number on top.",
    codeLine: line(0),
    state: draw(lists, levels, base()),
  });

  lists.forEach((list, index) => {
    if (list.length === 0) {
      const ask = practice || !asked.empty;
      asked.empty = true;
      frames.push({ scene, caption: `${ListName(index)} is next, but it is empty. It has no head at all.`, codeLine: line(2), state: draw(lists, levels, base()), quiz: ask ? emptyQuiz(index) : undefined });
      frames.push({
        scene,
        caption: `The Empty List Trap: the pile compares the numbers it holds. An empty head has no number, so the program crashes. Skip empty lists.`,
        codeLine: line(2),
        state: draw(lists, levels, base({ pile: { title, items: [...items(), { id: `null${index}`, label: "null", sub: listName(index), tone: "miss" }] }, note: { text: "✕ no number to compare: crash", tone: "coral" } })),
      });
      return;
    }
    pile.add(list[0]);
    moves++;
    fullest = Math.max(fullest, pile.size);
    frames.push({
      scene,
      caption: `The head of ${listName(index)} is ${list[0].v}. It drops into the pile. The top is ${pile.peek()!.v}.`,
      codeLine: line(2),
      state: draw(lists, levels, base({ pile: { title, items: items((node, at) => (node === list[0] ? "hit" : at === 0 ? "edge" : "idle")) } })),
    });
  });

  let turn = 0;
  while (pile.size > 0) {
    turn++;
    const node = pile.poll()!;
    moves++;
    taken = node;
    const next: Node | undefined = lists[node.list][node.at + 1];
    const kind = next ? "next" : "nothing";
    const ask = practice || !asked[kind];
    asked[kind] = true;
    const detailed = turn === 1 && !practice;
    if (detailed) {
      frames.push({ scene, caption: `Take the top of the pile: ${node.v}, from ${listName(node.list)}. No number anywhere is smaller.`, codeLine: 7, state: draw(lists, levels, base()) });
    }
    merged.push(node);
    const quiz = ask ? nextQuiz(lists, node, [...pile.items], new Set(done)) : null;
    frames.push({
      scene,
      caption: detailed ? `Hook ${node.v} onto the end of the merged list. The pile has a free seat now.` : `Take the top: ${node.v}, from ${listName(node.list)}. Hook it onto the end of the merged list.`,
      codeLine: line(detailed ? 8 : 7),
      state: draw(lists, levels, base({ picks: quiz?.picks })),
      quiz: quiz?.quiz,
    });
    done.add(node);
    taken = null;
    if (next) {
      pile.add(next);
      moves++;
      fullest = Math.max(fullest, pile.size);
      frames.push({
        scene,
        caption: `${next.v} comes right after ${node.v} in ${listName(node.list)}. It is the new head, so it drops into the pile. The top is ${pile.peek()!.v}.`,
        codeLine: line(11),
        state: draw(lists, levels, base({ pile: { title, items: items((other, at) => (other === next ? "hit" : at === 0 ? "edge" : "idle")) }, hand: [chip(node, "faded")] })),
      });
    } else {
      frames.push({
        scene,
        caption: `${node.v} was the last number of ${listName(node.list)}. Nothing drops in, and the pile gets smaller.${pile.size > 0 ? ` The top is ${pile.peek()!.v}.` : ""}`,
        codeLine: line(10),
        state: draw(lists, levels, base({ hand: [chip(node, "faded")], handNote: { text: `${listName(node.list)} is used up`, tone: "muted" } })),
      });
    }
  }

  const values = merged.map((node) => node.v);
  frames.push({
    scene,
    caption: `The pile is empty, so every list is used up. The answer is ${format(values)}.`,
    codeLine: line(15),
    state: draw(lists, levels, base({ merged: mergedCells("hit").map((cell) => ({ ...cell, tone: "done" as CellTone })) })),
  });
  if (!practice) {
    const allDone = values.map((v) => ({ v, tone: "done" as CellTone }));
    frames.push({
      scene,
      caption: `Time: O(N log k). Each of the ${values.length} numbers dropped into the pile once and left it once. The pile never held more than ${fullest}, so every move was short.`,
      codeLine: 6,
      state: draw(lists, levels, base({ merged: allDone, counter: { label: "drops and takes", value: moves } })),
    });
    const heads = smallestFirst();
    for (const list of lists) if (list.length > 0) heads.add(list[0]);
    frames.push({
      scene,
      caption: `Space: O(k). The pile holds one head for each of the k lists, never more. Here that was at most ${fullest}.`,
      codeLine: 0,
      state: draw(lists, levels, base({ pile: { title, lit: true, items: heads.items.map((node) => chip(node, "window")) }, merged: allDone })),
    });
  }
  return frames;
}

export const mergeKSortedListsStory: ProblemStory<HeapPileState> = {
  slugs: ["lc-23"],
  pattern: "Heap / top K",
  trigger: "several lists that are each already in order, to be joined into one ordered list",
  insight: "The next number is always one of the heads. Keep only the heads in a sorting pile, smallest on top: take the top, then drop in the number that came after it in its list.",
  metaphor: { name: "The sorting pile", legend: "pile = the priority queue of list nodes · top = poll() · head = the first node left in a list · merged = tail.next", terms: ["pile", "top", "head", "merged"] },
  traps: [{ name: "The Empty List Trap", rule: "Never add a null head to the pile: the comparator would crash on it. Check head != null first, and node.next != null before adding the next one." }],
  template: [
    "pile = new PriorityQueue (smallest on top);",
    "for (each source) if (it has a first item) pile.add(that item);",
    "while (pile is not empty) {",
    "    item = pile.poll();  append item to the result;",
    "    if (item has a successor in its source) pile.add(successor);",
    "}",
  ],
  complexity: {
    slow: "O(k² · n)",
    time: "O(N log k)",
    timeWhy: "each of the N numbers enters and leaves a pile that never holds more than k heads",
    space: "O(k)",
    spaceWhy: "the pile holds one head per list",
  },
  code: CODE,
  examples: [
    { label: "[[1,4,5],[1,3,4],[2,6]]", input: "1,4,5 / 1,3,4 / 2,6", expected: "[1,1,2,3,4,4,5,6]" },
    { label: "[[2,6],[],[1,5]]", input: "2,6 / - / 1,5", expected: "[1,2,5,6]", note: "Tricky: one list is empty" },
    { label: "[[5],[1,2,3],[4]]", input: "5 / 1,2,3 / 4", expected: "[1,2,3,4,5]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-21", title: "Merge Two Sorted Lists" },
    { slug: "lc-215", title: "Kth Largest Element in an Array" },
    { slug: "lc-295", title: "Find Median from Data Stream" },
  ],
  answer: (input) => format(solve(parse(input))),
  frames: (input) => {
    const lists = parse(input);
    const practice = parse(PRACTICE);
    const levels = pileLevels(Math.max(lists.length, practice.length));
    const heads = smallestFirst();
    for (const list of lists) if (list.length > 0) heads.add(list[0]);
    return [
      ...pictureFrames(lists, levels),
      ...slowFrames(lists, levels),
      ...insightFrames(lists, levels),
      ...solutionFrames(lists, levels),
      ...solutionFrames(practice, levels, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(lists, levels, { pile: { title: "pile · smallest on top", items: heads.items.map((node, index) => chip(node, index === 0 ? "edge" : "idle")) }, tone: (node) => (node.at === 0 ? "window" : "idle"), merged: [] }),
      },
    ];
  },
  View: HeapPileView,
};
