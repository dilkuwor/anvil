import type { CellTone } from "@/components/learn/viz/primitives";

import { HeapPileView, PileHeap, pileLevels, type HeapPileState, type PickRef, type PileItem } from "../agy-heap-pile-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<HeapPileState>;
type Stone = { id: string; w: number };

/** Fresh stones for the "your turn" run: two equal pairs, and nothing left at the end. */
const PRACTICE = "5,9,3,9,2";

const CODE = [
  "PriorityQueue<Integer> pile = new PriorityQueue<>(Comparator.reverseOrder());",
  "for (int stone : stones) {",
  "    pile.add(stone);",
  "}",
  "while (pile.size() > 1) {",
  "    int first = pile.poll();",
  "    int second = pile.poll();",
  "    if (first != second) {",
  "        pile.add(first - second);",
  "    }",
  "}",
  "return pile.isEmpty() ? 0 : pile.peek();",
];

const parse = (input: string): Stone[] =>
  input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part, index) => ({ id: `s${index}`, w: Number(part) }));

/** Independent solver: keep the stones in a plain list and pull out the two largest by scanning. */
function solve(weights: number[]): number {
  const left = [...weights];
  const takeLargest = () => left.splice(left.indexOf(Math.max(...left)), 1)[0];
  while (left.length > 1) {
    const first = takeLargest();
    const second = takeLargest();
    if (first !== second) left.push(first - second);
  }
  return left.length === 0 ? 0 : left[0];
}

const heaviestFirst = () => new PileHeap<Stone>((a, b) => a.w > b.w);
const lightestFirst = () => new PileHeap<Stone>((a, b) => a.w < b.w);

const chip = (stone: Stone, tone: CellTone = "idle"): PileItem => ({ id: stone.id, label: String(stone.w), tone });
const list = (values: number[]) => (values.length <= 1 ? values.join("") : `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`);
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type Draw = {
  pile?: { title: string; items: PileItem[]; lit?: boolean } | null;
  row: { stones: Stone[]; tone: (stone: Stone, index: number) => CellTone };
  hand?: PileItem[];
  handNote?: { text: string; tone: "coral" | "teal" | "muted" };
  note?: HeapPileState["note"];
  counter?: HeapPileState["counter"];
  picks?: PickRef[];
};

function draw(levels: number, d: Draw): HeapPileState {
  return {
    piles: d.pile ? [{ title: d.pile.title, items: d.pile.items, lit: d.pile.lit }] : [],
    levels,
    rows: [{ title: "stones", cells: d.row.stones.map((stone, index) => ({ label: String(stone.w), tone: d.row.tone(stone, index) })) }],
    panel: { kind: "hand", title: "in your hand", items: d.hand ?? [], note: d.handNote?.text, noteTone: d.handNote?.tone },
    note: d.note ?? null,
    counter: d.counter ?? null,
    picks: d.picks,
  };
}

function pictureFrames(stones: Stone[], levels: number): F[] {
  const sorted = [...stones].sort((a, b) => b.w - a.w);
  const idle = { stones, tone: () => "idle" as CellTone };
  const frames: F[] = [{ scene: "picture", caption: `These are ${count(stones.length, "stone")}. The number on each stone is its weight.`, state: draw(levels, { row: idle }) }];
  if (stones.length < 2) {
    frames.push({ scene: "picture", caption: `The goal: smash stones until at most one is left, and return its weight. Here that is already ${stones[0].w}.`, state: draw(levels, { row: { stones, tone: () => "done" } }) });
    return frames;
  }
  const [first, second] = sorted;
  frames.push({
    scene: "picture",
    caption: `Each turn you take the two heaviest stones and smash them together. Here they are ${first.w} and ${second.w}.`,
    state: draw(levels, { row: { stones, tone: (stone) => (stone === first || stone === second ? "edge" : "idle") } }),
  });
  frames.push({
    scene: "picture",
    caption: first.w === second.w ? `They weigh the same, so both are destroyed. Nothing is left of them.` : `The lighter stone is destroyed. The heavier one loses that much weight, so a stone of ${first.w - second.w} is left.`,
    state: draw(levels, {
      row: { stones, tone: (stone) => (stone === first || stone === second ? "faded" : "idle") },
      hand: [chip(first, "edge"), chip(second, "edge")],
      handNote: first.w === second.w ? { text: "both destroyed", tone: "muted" } : { text: `a stone of ${first.w - second.w} is left`, tone: "teal" },
    }),
  });
  if (stones.length > 2) {
    const lightest = sorted.slice(-2);
    frames.push({
      scene: "picture",
      caption: `Not allowed: choosing any other pair, like ${lightest[1].w} and ${lightest[0].w}. It is always the two heaviest stones that are left.`,
      state: draw(levels, { row: { stones, tone: (stone) => (lightest.includes(stone) ? "miss" : "idle") }, note: { text: "✕ not the two heaviest", tone: "coral" } }),
    });
  }
  frames.push({ scene: "picture", caption: "The goal: keep smashing until at most one stone is left. Return its weight, or 0 if no stone is left.", state: draw(levels, { row: idle }) });
  return frames;
}

/** The obvious way, really run: sort everything again after every smash, counting every look the sort makes. */
function slowFrames(stones: Stone[], levels: number): F[] {
  const frames: F[] = [];
  let left = [...stones];
  let looks = 0;
  let round = 0;
  let made = 0;
  while (left.length > 1) {
    left = [...left].sort((a, b) => {
      looks++;
      return a.w - b.w;
    });
    round++;
    const first = left[left.length - 1];
    const second = left[left.length - 2];
    if (round <= 3) {
      frames.push({
        scene: "slow",
        caption:
          round === 1
            ? `The slow way: sort all the stones, lightest to heaviest. Now the two heaviest sit at the end: ${second.w} and ${first.w}.`
            : round === 2
              ? `Smash them, put back what is left, and sort everything again to find ${second.w} and ${first.w}.`
              : `And again after the next smash. Most of these stones were already in order.`,
        state: draw(levels, { row: { stones: left, tone: (stone) => (stone === first || stone === second ? "edge" : "idle") }, counter: { label: "looks", value: looks } }),
      });
    }
    left = left.slice(0, -2);
    if (first.w !== second.w) left.push({ id: `slow${made++}`, w: first.w - second.w });
  }
  const result = left.length === 0 ? 0 : left[0].w;
  frames.push({
    scene: "slow",
    caption: `It ends with ${result}, after ${count(round, "full sort")} and ${count(looks, "look")}. Sorting again after every smash is O(n² log n) time, just to find two stones.`,
    state: draw(levels, { row: { stones: left, tone: () => "faded" }, counter: { label: "looks", value: looks } }),
  });
  return frames;
}

function insightFrames(stones: Stone[], levels: number): F[] {
  const pile = heaviestFirst();
  for (const stone of stones) pile.add(stone);
  const faded = { stones, tone: () => "faded" as CellTone };
  const full = pile.items.map((stone, index) => chip(stone, index === 0 ? "edge" : "idle"));
  const frames: F[] = [
    {
      scene: "insight",
      caption: `Picture a sorting pile. You drop stones in, in any order. The pile always lifts its heaviest stone to the top: here ${pile.items[0].w}.`,
      state: draw(levels, { pile: { title: "pile · heaviest on top", items: full }, row: faded }),
    },
  ];
  const top = pile.poll()!;
  if (pile.size > 0) {
    frames.push({
      scene: "insight",
      caption: `You only ever take the top. When ${top.w} leaves, the heaviest stone that is left rises to the top by itself: ${pile.items[0].w}.`,
      state: draw(levels, { pile: { title: "pile · heaviest on top", items: pile.items.map((stone, index) => chip(stone, index === 0 ? "edge" : "idle")) }, row: faded, hand: [chip(top, "hit")] }),
    });
  }
  frames.push({
    scene: "insight",
    caption: "The rest of the pile is never put in order. A drop or a take moves only a few stones, so nothing is sorted again.",
    state: draw(levels, { pile: { title: "pile · heaviest on top", items: pile.items.map((stone) => chip(stone, "window")), lit: true }, row: faded, hand: [chip(top, "hit")] }),
  });
  return frames;
}

const TOP_QUIZ: StoryQuiz = {
  kind: "choice",
  question: "Every turn needs the two heaviest stones. Which stone must the pile keep on top?",
  options: ["The heaviest stone", "The lightest stone"],
  answer: 0,
  why: "You can only take the top. So the top must be the heaviest, turn after turn.",
};

function riseQuiz(items: Stone[]): { quiz: StoryQuiz; picks: PickRef[] } | null {
  // Seats 1 and 2 sit just under the top. Ask only when one of them is clearly heavier.
  if (items.length < 3 || items[1].w === items[2].w) return null;
  const answer = items[1].w > items[2].w ? 1 : 2;
  const other = answer === 1 ? 2 : 1;
  const picks: PickRef[] = items.slice(1).map((_, index) => ({ at: "pile", pile: 0, index: index + 1 }));
  return {
    picks,
    quiz: {
      kind: "cell",
      cells: picks.length,
      question: "The top seat is empty. Which stone rises into it? Click that stone.",
      answer: answer - 1,
      feedback: { [other - 1]: "That stone is lighter than the one beside it. The heaviest stone left must rise." },
      otherwise: "A stone that deep has a heavier stone above it. Look just under the top seat.",
      why: "The heaviest stone left rises. It was waiting just under the top, so the pile finds it fast.",
    },
  };
}

const backQuiz = (first: number, second: number): StoryQuiz => ({
  kind: "choice",
  question: `${first} smashes against ${second}. Does anything go back into the pile?`,
  options: ["Yes, the stone that is left", "No, nothing is left"],
  answer: first === second ? 1 : 0,
  why: first === second ? "Equal stones destroy each other. Putting a 0 back would leave a stone that is not there." : "The heavier stone survives, lighter than before. It must go back so it can be smashed again.",
});

/** The real algorithm, one frame per change. `practice` reuses it on fresh stones: the reader makes every decision. */
function solutionFrames(stones: Stone[], levels: number, scene: SceneId = "solution", practice = false): F[] {
  const frames: F[] = [];
  const pile = heaviestFirst();
  const line = (index: number) => (practice ? undefined : index);
  const title = "pile · heaviest on top";
  const inPile = new Set<string>();
  let moves = 0;
  let made = 0;
  const asked = { rise: false, back: false, none: false };
  const row = { stones, tone: (stone: Stone) => (inPile.has(stone.id) ? "faded" : "idle") as CellTone };
  const items = (mark: (stone: Stone, index: number) => CellTone = (_, index) => (index === 0 ? "edge" : "idle")) => pile.items.map((stone, index) => chip(stone, mark(stone, index)));

  // The trap is drawn for real: the same stones in Java's ready-made pile, which keeps the lightest on top.
  const upside = lightestFirst();
  for (const stone of stones) upside.add(stone);
  const upsideItems = upside.items.map((stone, index) => chip(stone, index === 0 ? "miss" : "idle"));
  const wrongHand = stones.length > 1 ? [upside.poll()!, upside.poll()!] : [];

  frames.push({
    scene,
    caption: practice ? `Your turn, with new stones: ${list(stones.map((stone) => stone.w))}. First, set up the pile.` : "Start with an empty pile. The stones will be dropped into it one by one.",
    codeLine: line(0),
    state: draw(levels, { pile: { title: "pile", items: [] }, row }),
    quiz: TOP_QUIZ,
  });
  if (wrongHand.length === 2) {
    frames.push({
      scene,
      caption: `The Upside-Down Trap: Java's ready-made pile keeps the lightest on top. It would hand you ${wrongHand[0].w} and ${wrongHand[1].w}, the wrong stones. Ask for the reverse order.`,
      codeLine: line(0),
      state: draw(levels, { pile: { title: "pile · lightest on top", items: upsideItems }, row: { stones, tone: () => "faded" }, hand: wrongHand.map((stone) => chip(stone, "miss")), note: { text: "✕ upside down: the lightest come out", tone: "coral" } }),
    });
  }

  // Loading. The first three drops are shown one by one, the rest in one frame.
  stones.forEach((stone, index) => {
    const before = pile.peek();
    pile.add(stone);
    inPile.add(stone.id);
    moves++;
    if (practice) return;
    if (index < 3) {
      const how = !before ? "It is alone, so it is the top." : stone.w > before.w ? `It is heavier than ${before.w}, so it rises to the top.` : `It is not heavier than the top, ${before.w}, so it settles below.`;
      frames.push({ scene, caption: `Drop the stone ${stone.w} into the pile. ${how}`, codeLine: 2, state: draw(levels, { pile: { title, items: items((other, at) => (other === stone ? "hit" : at === 0 ? "edge" : "idle")) }, row }) });
    } else if (index === stones.length - 1) {
      const rest = stones.slice(3);
      frames.push({ scene, caption: `${rest.length === 1 ? `The stone ${rest[0].w} goes` : `The stones ${list(rest.map((other) => other.w))} go`} in the same way. The top of the pile is ${pile.peek()!.w}.`, codeLine: 2, state: draw(levels, { pile: { title, items: items() }, row }) });
    }
  });
  if (practice) {
    frames.push({ scene, caption: `Heaviest on top, by asking for the reverse order. All ${count(stones.length, "stone")} are in the pile, and the top is ${pile.peek()!.w}.`, state: draw(levels, { pile: { title, items: items() }, row }) });
  }

  let turn = 0;
  while (pile.size > 1) {
    turn++;
    const detailed = practice || turn === 1;
    // First take.
    const holeItems: PileItem[] = pile.items.map((stone, index) => (index === 0 ? { ...chip(stone), empty: true } : chip(stone)));
    const rise = (practice || !asked.rise) && detailed ? riseQuiz(pile.items) : null;
    const first = pile.poll()!;
    moves++;
    if (detailed) {
      if (rise) {
        asked.rise = true;
        frames.push({ scene, caption: `Take the top stone out: ${first.w}. For a moment the top seat is empty.`, codeLine: line(5), state: draw(levels, { pile: { title, items: holeItems }, row, hand: [chip(first, "edge")], picks: rise.picks }), quiz: rise.quiz });
        frames.push({ scene, caption: `${pile.peek()!.w} rises to the top. It is the heaviest stone left in the pile.`, codeLine: line(5), state: draw(levels, { pile: { title, items: items() }, row, hand: [chip(first, "edge")] }) });
      } else {
        frames.push({ scene, caption: `Take the top stone out: ${first.w}. ${pile.size > 0 ? `Now ${pile.peek()!.w} is on top.` : "The pile is empty now."}`, codeLine: line(5), state: draw(levels, { pile: { title, items: items() }, row, hand: [chip(first, "edge")] }) });
      }
    }
    const second = pile.poll()!;
    moves++;
    const equal = first.w === second.w;
    const ask = practice || (equal ? !asked.none : !asked.back);
    if (equal) asked.none = true;
    else asked.back = true;
    frames.push({
      scene,
      caption: detailed ? `Take the top again: ${second.w}. The two heaviest stones are in your hand.` : `Next turn. The pile hands over its top twice: ${first.w} and then ${second.w}.`,
      codeLine: line(6),
      state: draw(levels, { pile: { title, items: items() }, row, hand: [chip(first, "edge"), chip(second, "edge")] }),
      quiz: ask ? backQuiz(first.w, second.w) : undefined,
    });
    if (equal) {
      frames.push({
        scene,
        caption: `Both weigh ${first.w}, so the smash destroys both. Nothing goes back into the pile.`,
        codeLine: line(7),
        state: draw(levels, { pile: { title, items: items() }, row, hand: [chip(first, "faded"), chip(second, "faded")], handNote: { text: "both destroyed", tone: "muted" } }),
      });
    } else {
      const born: Stone = { id: `${practice ? "p" : "d"}${made++}`, w: first.w - second.w };
      if (detailed && !practice) {
        frames.push({
          scene,
          caption: `${second.w} is destroyed, and ${first.w} loses that much weight. The smash leaves a stone of ${born.w}.`,
          codeLine: 7,
          state: draw(levels, { pile: { title, items: items() }, row, hand: [chip(first, "faded"), chip(second, "faded"), chip(born, "hit")], handNote: { text: `${first.w} less ${second.w} leaves ${born.w}`, tone: "teal" } }),
        });
      }
      pile.add(born);
      moves++;
      frames.push({
        scene,
        caption: detailed && !practice ? `Drop the new stone ${born.w} into the pile. The top is ${pile.peek()!.w}.` : `The smash leaves a stone of ${born.w}. Drop it into the pile. The top is ${pile.peek()!.w}.`,
        codeLine: line(8),
        state: draw(levels, { pile: { title, items: items((stone, index) => (stone === born ? "hit" : index === 0 ? "edge" : "idle")) }, row, hand: [chip(first, "faded"), chip(second, "faded")], handNote: { text: `${first.w} less ${second.w} leaves ${born.w}`, tone: "teal" } }),
      });
    }
  }

  const answer = pile.size === 0 ? 0 : pile.peek()!.w;
  frames.push({
    scene,
    caption: pile.size === 0 ? `The pile is empty, so no stone is left. The answer is 0.` : `Only one stone is left in the pile, so no more smashing. The answer is ${answer}.`,
    codeLine: line(11),
    state: draw(levels, { pile: { title, items: items(() => "done") }, row, note: pile.size === 0 ? { text: "empty pile: return 0", tone: "teal" } : null }),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log n). There were ${moves} drops and takes. Each one moved stones along one short path of the pile, never through all of it.`,
      codeLine: 4,
      state: draw(levels, { pile: { title, items: items(() => "done") }, row, counter: { label: "drops and takes", value: moves } }),
    });
    const full = heaviestFirst();
    for (const stone of stones) full.add(stone);
    frames.push({
      scene,
      caption: `Space: O(n). At its fullest the pile held all ${count(stones.length, "stone")}, right after they were dropped in.`,
      codeLine: 2,
      state: draw(levels, { pile: { title, items: full.items.map((stone) => chip(stone, "window")), lit: true }, row }),
    });
  }
  return frames;
}

export const lastStoneWeightStory: ProblemStory<HeapPileState> = {
  slugs: ["lc-1046"],
  pattern: "Heap / top K",
  trigger: "again and again, take the largest (or the two largest) of a group that keeps changing",
  insight: "A sorting pile always lifts its heaviest stone to the top. Take the top twice, smash, drop what is left back in. Nothing is ever sorted again.",
  metaphor: { name: "The sorting pile", legend: "pile = the priority queue · top = what poll() hands you · drop = add()", terms: ["pile", "top", "stone", "smash"] },
  traps: [{ name: "The Upside-Down Trap", rule: "Java's ready-made PriorityQueue keeps the smallest on top. Pass Comparator.reverseOrder() so the heaviest stone comes out first." }],
  template: [
    "pile = new PriorityQueue (largest on top);",
    "put every item into the pile;",
    "while (pile has more than one) {",
    "    a = pile.poll(); b = pile.poll();",
    "    if (something is left of a and b) pile.add(it);",
    "}",
    "answer = pile is empty ? 0 : pile.peek();",
  ],
  complexity: {
    slow: "O(n² log n)",
    time: "O(n log n)",
    timeWhy: "each drop or take moves stones along one short path of the pile, and there are at most about 3n of them",
    space: "O(n)",
    spaceWhy: "the pile holds every stone at the start",
  },
  code: CODE,
  examples: [
    { label: "[2,7,4,1,8,1]", input: "2,7,4,1,8,1", expected: "1" },
    { label: "[3,7,2]", input: "3,7,2", expected: "2" },
    { label: "[4,6,4,6]", input: "4,6,4,6", expected: "0", note: "Equal stones: nothing is left" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-215", title: "Kth Largest Element in an Array" },
    { slug: "lc-973", title: "K Closest Points to Origin" },
    { slug: "lc-295", title: "Find Median from Data Stream" },
  ],
  answer: (input) => String(solve(parse(input).map((stone) => stone.w))),
  frames: (input) => {
    const stones = parse(input);
    const practice = parse(PRACTICE);
    const levels = pileLevels(Math.max(stones.length, practice.length));
    const pile = heaviestFirst();
    for (const stone of stones) pile.add(stone);
    return [
      ...pictureFrames(stones, levels),
      ...slowFrames(stones, levels),
      ...insightFrames(stones, levels),
      ...solutionFrames(stones, levels),
      ...solutionFrames(practice, levels, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(levels, { pile: { title: "pile · heaviest on top", items: pile.items.map((stone, index) => chip(stone, index === 0 ? "edge" : "idle")) }, row: { stones, tone: () => "faded" } }),
      },
    ];
  },
  View: HeapPileView,
};
