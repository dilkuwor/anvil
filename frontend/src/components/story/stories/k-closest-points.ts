import type { CellTone } from "@/components/learn/viz/primitives";

import { HeapPileView, PileHeap, pileLevels, type HeapPileState, type PickRef, type PileItem, type PilePanel } from "../agy-heap-pile-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<HeapPileState>;
type Point = { id: string; x: number; y: number; tag: number; at: number };
type Input = { points: Point[]; k: number };

/** Fresh points for the "your turn" run: two newcomers leave at once, then an old point leaves. */
const PRACTICE = "2,2 -1,0 4,1 0,-3 -2,-1 | k=2";

const CODE = [
  "PriorityQueue<int[]> pile = new PriorityQueue<>((a, b) -> Integer.compare(tag(b), tag(a)));",
  "for (int[] point : points) {",
  "    pile.add(point);",
  "    if (pile.size() > k) {",
  "        pile.poll();",
  "    }",
  "}",
  "int[][] out = new int[k][];",
  "for (int i = 0; i < k; i++) {",
  "    out[i] = pile.poll();",
  "}",
  "return out;",
  "// helper: the tag of a point is its squared distance",
  "int tag(int[] p) { return p[0] * p[0] + p[1] * p[1]; }",
];

function parse(input: string): Input {
  const [list, rest] = input.split("|");
  const points = list
    .trim()
    .split(/\s+/)
    .filter((part) => part.includes(","))
    .map((part, index) => {
      const [x, y] = part.split(",").map(Number);
      return { id: `p${index}`, x, y, tag: x * x + y * y, at: index };
    });
  const k = Number((rest ?? "").replace(/[^0-9]/g, "")) || 1;
  return { points, k: Math.min(Math.max(k, 1), points.length) };
}

const name = (point: Point) => `(${point.x},${point.y})`;
const format = (points: Point[]) => `[${points.map((point) => `[${point.x},${point.y}]`).join(",")}]`;

/** Independent solver: order every point by true distance, keep the first k, and list them farthest first. */
function solve({ points, k }: Input): Point[] {
  return [...points]
    .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))
    .slice(0, k)
    .reverse();
}

const farthestFirst = () => new PileHeap<Point>((a, b) => a.tag > b.tag);
const chip = (point: Point, tone: CellTone = "idle"): PileItem => ({ id: point.id, label: String(point.tag), sub: name(point), tone });
const list = (values: string[]) => (values.length <= 1 ? values.join("") : `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`);
const seats = (k: number) => `${k} seat${k === 1 ? "" : "s"}`;
const closest = (k: number) => (k === 1 ? "closest point" : `${k} closest points`);
const sum = (point: Point) => `${point.x * point.x} + ${point.y * point.y} = ${point.tag}`;
const root = (point: Point) => `√${point.tag} = ${(Math.floor(Math.sqrt(point.tag) * 100) / 100).toFixed(2)}…`;

type Draw = {
  pile?: { title: string; items: PileItem[]; seats?: number; lit?: boolean } | null;
  points: Point[];
  /** Order of the boxes in the row, when it is not the input order. */
  order?: Point[];
  tone: (point: Point) => CellTone;
  /** Points whose tag is already written under their box. */
  tagged?: (point: Point) => boolean;
  label?: Point | null;
  ray?: { to: Point; label: string; tone: "coral" | "accent" } | null;
  out?: Point[];
  note?: HeapPileState["note"];
  counter?: HeapPileState["counter"];
  picks?: PickRef[];
};

function draw(levels: number, reach: number, d: Draw): HeapPileState {
  const panel: PilePanel = {
    kind: "grid",
    reach,
    points: d.points.map((point) => ({ x: point.x, y: point.y, tone: d.tone(point), label: d.label === point || d.ray?.to === point ? name(point) : undefined })),
    ray: d.ray ? { to: d.points.indexOf(d.ray.to), label: d.ray.label, tone: d.ray.tone } : null,
  };
  const order = d.order ?? d.points;
  return {
    piles: d.pile ? [{ title: d.pile.title, items: d.pile.items, seats: d.pile.seats, lit: d.pile.lit }] : [],
    levels,
    rows: [
      { title: "points", wide: true, cells: order.map((point) => ({ label: name(point), tone: d.tone(point), sub: d.tagged?.(point) ? `tag ${point.tag}` : undefined })) },
      { title: "answer", wide: true, emptyText: "(nothing yet)", cells: (d.out ?? []).map((point) => ({ label: name(point), tone: "done" as CellTone })) },
    ],
    panel,
    note: d.note ?? null,
    counter: d.counter ?? null,
    picks: d.picks,
  };
}

function pictureFrames({ points, k }: Input, levels: number, reach: number): F[] {
  const near = solve({ points, k });
  const far = [...points].sort((a, b) => b.tag - a.tag)[0];
  return [
    { scene: "picture", caption: `These are ${points.length} points on a grid. The origin is the centre, where both numbers are 0.`, state: draw(levels, reach, { points, tone: () => "idle" }) },
    {
      scene: "picture",
      caption: `We want the ${closest(k)} to the origin. Here ${k === 1 ? "that is" : "they are"} ${list([...near].reverse().map(name))}.`,
      state: draw(levels, reach, { points, tone: (point) => (near.includes(point) ? "done" : "idle"), ray: { to: near[near.length - 1], label: "closest of all", tone: "accent" } }),
    },
    {
      scene: "picture",
      caption: `${name(far)} does not belong: it is the farthest from the origin. The order inside the answer does not matter.`,
      state: draw(levels, reach, { points, tone: (point) => (point === far ? "miss" : near.includes(point) ? "done" : "idle"), ray: { to: far, label: "✕ too far", tone: "coral" } }),
    },
    { scene: "picture", caption: `The goal: return the ${closest(k)} to the origin.`, state: draw(levels, reach, { points, tone: (point) => (near.includes(point) ? "done" : "faded"), out: [...near].reverse() }) },
  ];
}

/** The obvious way, really run: tag every point, then sort them all, counting each look the sort makes. */
function slowFrames({ points, k }: Input, levels: number, reach: number): F[] {
  let looks = 0;
  const sorted = [...points].sort((a, b) => {
    looks++;
    return a.tag - b.tag;
  });
  const counter = { label: "looks", value: looks };
  return [
    { scene: "slow", caption: `The slow way: work out how far every point is, then put all ${points.length} points in order, closest first. That took ${looks} look${looks === 1 ? "" : "s"}, two points at a time.`, state: draw(levels, reach, { points, order: sorted, tone: () => "window", tagged: () => true, counter }) },
    { scene: "slow", caption: `Now take the first ${k === 1 ? "one" : k}: ${list(sorted.slice(0, k).map(name))}.`, state: draw(levels, reach, { points, order: sorted, tone: (point) => (sorted.indexOf(point) < k ? "done" : "faded"), tagged: () => true, counter, out: sorted.slice(0, k) }) },
    { scene: "slow", caption: `This is O(n log n) time. It put all ${points.length} points in perfect order, but we only needed to split off the ${closest(k)}.`, state: draw(levels, reach, { points, order: sorted, tone: (point) => (sorted.indexOf(point) < k ? "done" : "faded"), tagged: () => true, counter, out: sorted.slice(0, k) }) },
  ];
}

type Overflow = { point: Point; before: Point[]; leaves: Point; kept: Point[] };

function overflows({ points, k }: Input): Overflow[] {
  const pile = farthestFirst();
  const found: Overflow[] = [];
  for (const point of points) {
    const before = [...pile.items];
    pile.add(point);
    if (pile.size > k) {
      const leaves = pile.poll()!;
      found.push({ point, before, leaves, kept: [...pile.items] });
    }
  }
  return found;
}

function insightFrames(input: Input, levels: number, reach: number): F[] {
  const { points, k } = input;
  const title = `pile · ${seats(k)} · farthest on top`;
  const first = points[0];
  const frames: F[] = [
    {
      scene: "insight",
      caption: `Give every point a tag: x times x, plus y times y. A smaller tag means closer to the origin. ${name(first)} gets ${sum(first)}.`,
      state: draw(levels, reach, { points, tone: (point) => (point === first ? "edge" : "idle"), tagged: (point) => point === first, ray: { to: first, label: `tag ${first.tag}`, tone: "accent" } }),
    },
  ];
  const moment = overflows(input).find((each) => each.leaves !== each.point) ?? overflows(input)[0];
  if (!moment) return frames;
  const seen = (point: Point) => point.at <= moment.point.at;
  const tone = (current: boolean, gone: boolean) => (point: Point) => (gone && point === moment.leaves ? "miss" : current && point === moment.point ? "edge" : moment.before.includes(point) ? "hit" : point.at < moment.point.at ? "faded" : "idle") as CellTone;
  frames.push({
    scene: "insight",
    caption: k === 1 ? `Picture a sorting pile with only 1 seat. It keeps the closest point seen so far. That point is the top: the one that goes if a closer point arrives.` : `Picture a sorting pile with only ${seats(k)}. It keeps the ${closest(k)} seen so far, with the farthest of them on top: the first that would have to go.`,
    state: draw(levels, reach, { pile: { title, seats: k, items: moment.before.map((point, index) => chip(point, index === 0 ? "edge" : "idle")) }, points, tone: tone(false, false), tagged: (point) => point.at < moment.point.at }),
  });
  frames.push({
    scene: "insight",
    caption: `${name(moment.point)} arrives with tag ${moment.point.tag}. That is one too many, so the top, ${name(moment.leaves)} with tag ${moment.leaves.tag}, is thrown out.`,
    state: draw(levels, reach, { pile: { title, seats: k, items: moment.kept.map((point, index) => chip(point, point === moment.point ? "hit" : index === 0 ? "edge" : "idle")) }, points, tone: tone(true, true), tagged: seen, label: moment.point }),
  });
  frames.push({
    scene: "insight",
    caption: `Every point drops in once. At the end the pile holds exactly the ${closest(k)}, and nothing was ever sorted.`,
    state: draw(levels, reach, { pile: { title, seats: k, lit: true, items: moment.kept.map((point) => chip(point, "window")) }, points, tone: tone(true, true), tagged: seen }),
  });
  return frames;
}

const topQuiz = (k: number): StoryQuiz => ({
  kind: "choice",
  question: `The pile keeps the ${closest(k)} so far, and you can only reach its top. Which kept point must sit on top?`,
  options: ["The farthest of the kept points", "The closest of the kept points"],
  answer: 0,
  why: "When a closer point arrives, the one to throw out is the farthest kept point. So that one must be within reach.",
});

const tagQuiz = (point: Point): StoryQuiz => ({
  kind: "choice",
  question: `${name(point)} needs a tag that says how far it is. What do we write on it?`,
  options: [`x times x plus y times y: ${point.tag}`, `The true distance, the square root: ${(Math.floor(Math.sqrt(point.tag) * 100) / 100).toFixed(2)}…`],
  answer: 0,
  why: "We only compare points with each other. The whole number gives the same order, exactly, with no root to work out.",
});

function leaveQuiz(point: Point, before: Point[], k: number): { quiz: StoryQuiz; picks: PickRef[] } | null {
  const group = [...before, point];
  const most = Math.max(...group.map((each) => each.tag));
  if (group.filter((each) => each.tag === most).length !== 1) return null;
  const picks: PickRef[] = [...before.map((_, index): PickRef => ({ at: "pile", pile: 0, index })), { at: "row", row: 0, index: point.at }];
  const answer = group.findIndex((each) => each.tag === most);
  const feedback: Record<number, string> = {};
  group.forEach((each, index) => {
    if (index === answer) return;
    feedback[index] = index === group.length - 1 ? `The newcomer's tag, ${each.tag}, is smaller than a tag in the pile. It is closer, so it earns a seat.` : `Tag ${each.tag} is not the largest here. A point with a larger tag is farther away.`;
  });
  return {
    picks,
    quiz: {
      kind: "cell",
      cells: picks.length,
      question: `${name(point)} arrives, but there ${k === 1 ? "is" : "are"} only ${seats(k)}. Which point will be thrown out? Click it, in the pile or in the row.`,
      answer,
      feedback,
      otherwise: "Compare the newcomer's tag with the tags in the pile. The farthest point of them all has to go.",
      why: answer === group.length - 1 ? `${name(point)} is farther than everything kept. It goes in, comes up to the top, and is thrown straight out.` : `${name(group[answer])} was the farthest kept point, waiting on top. ${name(point)} takes its seat.`,
    },
  };
}

/** The real algorithm, one frame per change. `practice` reuses it on fresh points: the reader makes every decision. */
function solutionFrames(input: Input, levels: number, reach: number, scene: SceneId = "solution", practice = false): F[] {
  const { points, k } = input;
  const frames: F[] = [];
  const pile = farthestFirst();
  const line = (index: number) => (practice ? undefined : index);
  const title = `pile · ${seats(k)} · farthest on top`;
  const gone = new Set<Point>();
  const out: Point[] = [];
  let moves = 0;
  let fullest = 0;
  let current: Point | null = null;
  const asked = { old: false, newcomer: false };
  const tone = (point: Point): CellTone => (gone.has(point) ? "faded" : point === current ? "edge" : pile.items.includes(point) ? "hit" : "idle");
  const tagged = (point: Point) => current !== null && point.at <= current.at;
  const items = (mark: (point: Point, index: number) => CellTone = (_, index) => (index === 0 ? "edge" : "idle")) => pile.items.map((point, index) => chip(point, mark(point, index)));
  const base = (extra: Partial<Draw> = {}): Draw => ({ pile: { title, seats: k, items: items() }, points, tone, tagged, label: current, out: [...out], ...extra });

  frames.push({
    scene,
    caption: practice ? `Your turn, with new points. Find the ${closest(k)} to the origin. The pile has ${seats(k)}.` : `Start with an empty pile that has ${seats(k)}, because k is ${k}.`,
    codeLine: line(0),
    state: draw(levels, reach, base({ pile: { title: `pile · ${seats(k)}`, seats: k, items: [] } })),
    quiz: topQuiz(k),
  });
  frames.push({ scene, caption: "Farthest on top. The top is the weakest kept point, the only one that may have to leave.", codeLine: line(0), state: draw(levels, reach, base()) });

  for (const point of points) {
    current = point;
    if (point.at === 0) {
      frames.push({
        scene,
        caption: `${name(point)} arrives first. Before it can go into the pile, it needs its tag.`,
        codeLine: line(13),
        state: draw(levels, reach, base({ tagged: () => false })),
        quiz: tagQuiz(point),
      });
      frames.push({
        scene,
        caption: `The Square Root Trap: the true distance of ${name(point)} is ${root(point)}, a messy decimal. Skip the root. The tag ${sum(point)} gives the same order.`,
        codeLine: line(13),
        state: draw(levels, reach, base({ ray: { to: point, label: `✕ ${root(point)}`, tone: "coral" }, note: { text: `✕ no root needed: the tag is ${point.tag}`, tone: "coral" } })),
      });
    }
    const arrive = point.at === 0 ? `${name(point)}, tag ${point.tag},` : `${name(point)} arrives with tag ${sum(point)} and`;
    if (pile.size < k) {
      pile.add(point);
      moves++;
      fullest = Math.max(fullest, pile.size);
      frames.push({
        scene,
        caption: `${arrive} drops into the pile. There is a free seat, so it stays. The top is tag ${pile.peek()!.tag}.`,
        codeLine: line(2),
        state: draw(levels, reach, base({ pile: { title, seats: k, items: items((other, index) => (other === point ? "hit" : index === 0 ? "edge" : "idle")) } })),
      });
      continue;
    }
    const before = [...pile.items];
    const kind = point.tag > before[0].tag ? "newcomer" : "old";
    const ask = practice || !asked[kind] ? leaveQuiz(point, before, k) : null;
    if (ask) {
      asked[kind] = true;
      frames.push({
        scene,
        caption: `${name(point)} arrives with tag ${sum(point)}. Every seat is taken, so once it is in the pile, one point must leave.`,
        codeLine: line(1),
        state: draw(levels, reach, base({ pile: { title, seats: k, items: items(() => "idle") }, picks: ask.picks })),
        quiz: ask.quiz,
      });
    }
    pile.add(point);
    moves++;
    fullest = Math.max(fullest, pile.size);
    frames.push({
      scene,
      caption: `${ask ? `${name(point)} drops` : `${name(point)} arrives with tag ${sum(point)} and drops`} into the pile. One too many. The farthest is on top: tag ${pile.peek()!.tag}.`,
      codeLine: line(3),
      state: draw(levels, reach, base({ pile: { title, seats: k, items: items((other, index) => (index === 0 ? "edge" : other === point ? "hit" : "idle")) }, note: { text: `${pile.size} in the pile, ${seats(k)}`, tone: "muted" } })),
    });
    const left = pile.poll()!;
    moves++;
    frames.push({
      scene,
      caption: left === point ? `The top, ${name(left)}, is thrown out at once. It is farther than every kept point.` : `The top, ${name(left)}, is thrown out. The pile keeps ${list(pile.items.map(name))}, and its top is tag ${pile.peek()!.tag}.`,
      codeLine: line(4),
      state: draw(levels, reach, base({ tone: (other) => (other === left ? "miss" : tone(other)) })),
    });
    gone.add(left);
  }

  current = null;
  const all = () => true;
  while (pile.size > 0) {
    const next = pile.poll()!;
    moves++;
    out.push(next);
    if (practice) continue;
    frames.push({
      scene,
      caption: out.length === 1 ? `Every point has had its turn. Take the top, ${name(next)}, and write it into the answer.` : `Take the next top, ${name(next)}, and write it into the answer too.`,
      codeLine: 9,
      state: draw(levels, reach, base({ tagged: all, tone: (point) => (out.includes(point) ? "done" : gone.has(point) ? "faded" : "hit") })),
    });
  }
  frames.push({
    scene,
    caption: practice ? `Every point has had its turn. The pile hands over what it kept. The answer is ${format(out)}.` : `The pile is empty, and it held exactly the ${closest(k)}. The answer is ${format(out)}.`,
    codeLine: line(11),
    state: draw(levels, reach, base({ tagged: all, tone: (point) => (out.includes(point) ? "done" : "faded") })),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log k). Each of the ${points.length} points dropped into a pile of at most ${fullest}. In a pile that small, a drop or a take is only a step or two.`,
      codeLine: 2,
      state: draw(levels, reach, base({ tagged: all, tone: (point) => (out.includes(point) ? "done" : "faded"), counter: { label: "drops and takes", value: moves } })),
    });
    const kept = farthestFirst();
    for (const point of [...out].reverse()) kept.add(point);
    frames.push({
      scene,
      caption: `Space: O(k). The pile has only ${seats(k)}, plus one extra point for a moment. That stays true however many points there are.`,
      codeLine: 0,
      state: draw(levels, reach, base({ pile: { title, seats: k, lit: true, items: kept.items.map((point) => chip(point, "window")) }, tagged: all, tone: (point) => (out.includes(point) ? "done" : "faded") })),
    });
  }
  return frames;
}

export const kClosestPointsStory: ProblemStory<HeapPileState> = {
  slugs: ["lc-973"],
  pattern: "Heap / top K",
  trigger: "“the k closest” (or k smallest, k best) out of many, where the order of the answer does not matter",
  insight: "Tag each point with x·x + y·y. A sorting pile with only k seats keeps the closest so far, farthest on top. One too many: the top is thrown out.",
  metaphor: { name: "The sorting pile", legend: "pile = the priority queue · seats = k · tag = x·x + y·y · top = the farthest kept point", terms: ["pile", "top", "seat", "tag"] },
  traps: [{ name: "The Square Root Trap", rule: "Do not call Math.sqrt. Compare the squared distance x*x + y*y: same order, whole numbers, no rounding errors." }],
  template: [
    "pile = new PriorityQueue (the weakest kept item on top);",
    "for (item : items) {",
    "    pile.add(item);",
    "    if (pile.size() > k) pile.poll();   // throw out the weakest",
    "}",
    "answer = everything still in the pile;",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n log k)",
    timeWhy: "each of the n points drops into a pile that never holds more than k + 1",
    space: "O(k)",
    spaceWhy: "the pile has k seats, however many points go by",
  },
  code: CODE,
  examples: [
    { label: "[[1,3],[-2,2]], k = 1", input: "1,3 -2,2 | k=1", expected: "[[-2,2]]" },
    { label: "[[3,3],[5,-1],[-2,4]], k = 2", input: "3,3 5,-1 -2,4 | k=2", expected: "[[-2,4],[3,3]]", note: "Any order is accepted" },
    { label: "six points, k = 3", input: "1,1 4,0 -2,-2 0,3 5,2 -1,0 | k=3", expected: "[[-2,-2],[1,1],[-1,0]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-215", title: "Kth Largest Element in an Array" },
    { slug: "lc-347", title: "Top K Frequent Elements" },
    { slug: "lc-1046", title: "Last Stone Weight" },
  ],
  answer: (input) => format(solve(parse(input))),
  frames: (input) => {
    const parsed = parse(input);
    const practice = parse(PRACTICE);
    const levels = pileLevels(Math.max(parsed.k, practice.k) + 1);
    const reachOf = (points: Point[]) => Math.max(3, ...points.map((point) => Math.max(Math.abs(point.x), Math.abs(point.y))));
    const reach = reachOf(parsed.points);
    const near = solve(parsed);
    const kept = farthestFirst();
    for (const point of near) kept.add(point);
    return [
      ...pictureFrames(parsed, levels, reach),
      ...slowFrames(parsed, levels, reach),
      ...insightFrames(parsed, levels, reach),
      ...solutionFrames(parsed, levels, reach),
      ...solutionFrames(practice, levels, reachOf(practice.points), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(levels, reach, {
          pile: { title: `pile · ${seats(parsed.k)} · farthest on top`, seats: parsed.k, items: kept.items.map((point, index) => chip(point, index === 0 ? "edge" : "idle")) },
          points: parsed.points,
          tone: (point) => (near.includes(point) ? "hit" : "faded"),
          tagged: () => true,
        }),
      },
    ];
  },
  View: HeapPileView,
};
