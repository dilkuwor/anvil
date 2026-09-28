import type { CellTone } from "@/components/learn/viz/primitives";

import { CountShelvesView, type CountShelvesState, type ShelfKey } from "../rec08-count-shelves-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<CountShelvesState>;

type Op = { kind: "put"; key: number; val: number } | { kind: "get"; key: number };
type Input = { capacity: number; ops: Op[] };

/** Fresh calls for the "your turn" run: one drop breaks a tie, one does not. */
const PRACTICE = "cap=2; put(5,5), put(6,6), get(6), get(5), put(7,7), put(8,8), get(7), get(8)";

const CODE = [
  "Map<Integer, Integer> values = new HashMap<>(), counts = new HashMap<>();",
  "Map<Integer, LinkedHashSet<Integer>> shelves = new HashMap<>();",
  "int lowest = 0;",
  "int get(int key) {",
  "    if (!values.containsKey(key)) return -1;",
  "    use(key);",
  "    return values.get(key);",
  "}",
  "void put(int key, int value) {",
  "    if (values.containsKey(key)) { values.put(key, value); use(key); return; }",
  "    if (values.size() == capacity) {",
  "        int oldest = shelves.get(lowest).iterator().next();",
  "        shelves.get(lowest).remove(oldest); values.remove(oldest); counts.remove(oldest);",
  "    }",
  "    values.put(key, value); counts.put(key, 1);",
  "    shelves.computeIfAbsent(1, c -> new LinkedHashSet<>()).add(key);",
  "    lowest = 1;",
  "}",
  "void use(int key) {",
  "    int count = counts.get(key);",
  "    shelves.get(count).remove(key);",
  "    if (count == lowest && shelves.get(count).isEmpty()) lowest++;",
  "    counts.put(key, count + 1);",
  "    shelves.computeIfAbsent(count + 1, c -> new LinkedHashSet<>()).add(key);",
  "}",
];

function parse(raw: string): Input {
  const capacity = Number.parseInt(raw.match(/cap(?:acity)?\s*=\s*(\d+)/)?.[1] ?? "2", 10) || 2;
  const ops: Op[] = [];
  for (const match of raw.matchAll(/(put|get)\s*\(\s*(-?\d+)\s*(?:,\s*(-?\d+)\s*)?\)/g)) {
    const key = Number.parseInt(match[2], 10);
    if (match[1] === "put" && match[3] !== undefined) ops.push({ kind: "put", key, val: Number.parseInt(match[3], 10) });
    else if (match[1] === "get") ops.push({ kind: "get", key });
  }
  return { capacity, ops };
}

const opText = (op: Op) => (op.kind === "put" ? `put(${op.key},${op.val})` : `get(${op.key})`);

/** Independent check: every key carries a count and a last-use time, and a drop scans them all. */
function solve({ capacity, ops }: Input): string {
  const entries = new Map<number, { val: number; count: number; time: number }>();
  const out: number[] = [];
  let clock = 0;
  for (const op of ops) {
    const entry = entries.get(op.key);
    if (op.kind === "get") {
      if (!entry) out.push(-1);
      else {
        entry.count += 1;
        entry.time = clock++;
        out.push(entry.val);
      }
      continue;
    }
    if (entry) {
      entry.val = op.val;
      entry.count += 1;
      entry.time = clock++;
      continue;
    }
    if (entries.size === capacity) {
      let drop = -1;
      let worst: { count: number; time: number } | null = null;
      for (const [key, item] of entries) {
        if (!worst || item.count < worst.count || (item.count === worst.count && item.time < worst.time)) {
          worst = item;
          drop = key;
        }
      }
      entries.delete(drop);
    }
    entries.set(op.key, { val: op.val, count: 1, time: clock++ });
  }
  return `[${out.join(",")}]`;
}

/** The shelves model used by the real solution. */
class Shelves {
  values = new Map<number, number>();
  counts = new Map<number, number>();
  shelves = new Map<number, number[]>();
  lowest = 0;

  constructor(readonly capacity: number) {}

  use(key: number) {
    const count = this.counts.get(key) ?? 1;
    const shelf = this.shelves.get(count) ?? [];
    shelf.splice(shelf.indexOf(key), 1);
    let emptied = false;
    if (count === this.lowest && shelf.length === 0) {
      this.lowest++;
      emptied = true;
    }
    this.counts.set(key, count + 1);
    const next = this.shelves.get(count + 1) ?? [];
    next.push(key);
    this.shelves.set(count + 1, next);
    return { from: count, emptied };
  }
}

function highestShelf(input: Input): number {
  const model = new Shelves(input.capacity);
  let top = 1;
  for (const op of input.ops) {
    if (model.values.has(op.key)) {
      if (op.kind === "put") model.values.set(op.key, op.val);
      top = Math.max(top, model.use(op.key).from + 1);
    } else if (op.kind === "put") {
      if (model.values.size === model.capacity) {
        const oldest = (model.shelves.get(model.lowest) ?? []).shift() as number;
        model.values.delete(oldest);
        model.counts.delete(oldest);
      }
      model.values.set(op.key, op.val);
      model.counts.set(op.key, 1);
      model.shelves.set(1, [...(model.shelves.get(1) ?? []), op.key]);
      model.lowest = 1;
    }
  }
  return top;
}

function draw(model: Shelves, top: number, tone: (key: number) => CellTone = () => "idle"): CountShelvesState["shelves"] {
  return Array.from({ length: top }, (_, row) => ({
    label: `used ${row + 1}×`,
    keys: (model.shelves.get(row + 1) ?? []).map((key): ShelfKey => ({ key, val: model.values.get(key) ?? 0, tone: tone(key) })),
  }));
}

function blankState(capacity: number): CountShelvesState {
  return { capacity, shelves: [], lowestShelf: null, op: null, returned: [], arriving: null, trapKey: null, counter: null, note: null };
}

function pictureFrames(input: Input): Frame[] {
  const { capacity, ops } = input;
  const puts = ops.filter((op): op is Extract<Op, { kind: "put" }> => op.kind === "put").slice(0, capacity);
  const row = (count: number): CountShelvesState["shelves"] => [{ label: "the cache", keys: puts.map((op) => ({ key: op.key, val: op.val, tone: "idle", note: `used ${count}×` })) }];
  const waiting = firstDrop(input)?.op;
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A cache holds at most ${capacity} keys, each with a value. Every key also counts how many times it was used.`,
      state: { ...blankState(capacity), shelves: row(1) },
    },
    {
      scene: "picture",
      caption: "Allowed: get reads a key, put stores one. Each get or put of a stored key adds one to its count.",
      state: { ...blankState(capacity), shelves: row(1) },
    },
    {
      scene: "picture",
      caption: "When the cache is full, the key used the fewest times must leave. Not allowed: dropping any key with the smallest count, because ties have a rule.",
      state: { ...blankState(capacity), shelves: row(1), arriving: waiting && waiting.kind === "put" ? { key: waiting.key, val: waiting.val } : null },
    },
    {
      scene: "picture",
      caption: "The tie rule: among keys with the smallest count, the one used longest ago leaves. The goal is to record what each get returns.",
      state: { ...blankState(capacity), shelves: row(1) },
    },
  ];
  return frames;
}

function slowFrames(input: Input): Frame[] {
  const { capacity, ops } = input;
  const frames: Frame[] = [];
  const entries = new Map<number, { val: number; count: number; time: number }>();
  let clock = 0;
  let checked = 0;
  let drops = 0;
  const row = (focus: number | null): CountShelvesState["shelves"] => [
    {
      label: "all keys",
      keys: [...entries.entries()].map(([key, item]) => ({ key, val: item.val, tone: key === focus ? "miss" : "window", note: `${item.count}× · time ${item.time}` })),
    },
  ];
  for (const op of ops) {
    const entry = entries.get(op.key);
    if (entry) {
      if (op.kind === "put") entry.val = op.val;
      entry.count += 1;
      entry.time = clock++;
      continue;
    }
    if (op.kind === "get") continue;
    if (entries.size === capacity) {
      let drop = -1;
      let worst: { count: number; time: number } | null = null;
      for (const [key, item] of entries) {
        checked++;
        if (!worst || item.count < worst.count || (item.count === worst.count && item.time < worst.time)) {
          worst = item;
          drop = key;
        }
      }
      if (drops < 2) {
        frames.push({
          scene: "slow",
          caption:
            drops === 0
              ? `The slow way writes a count and a time of last use on each key. For ${opText(op)}, it checks every key: key ${drop} leaves.`
              : `${opText(op)} needs room again, so it checks every key again. Key ${drop} leaves.`,
          state: { ...blankState(capacity), shelves: row(drop), op: opText(op), counter: { label: "keys checked", value: checked } },
        });
      }
      drops++;
      entries.delete(drop);
    }
    entries.set(op.key, { val: op.val, count: 1, time: clock++ });
  }
  frames.push({
    scene: "slow",
    caption: `${checked} keys checked for ${drops} ${drops === 1 ? "drop" : "drops"}. With room for 10,000 keys, each new key checks all 10,000: O(capacity) per put.`,
    state: { ...blankState(capacity), shelves: row(null).map((shelf) => ({ ...shelf, keys: shelf.keys.map((item) => ({ ...item, tone: "faded" as const })) })), counter: { label: "keys checked", value: checked } },
  });
  return frames;
}

/** The moment before the first drop, on the real shelves. */
function firstDrop(input: Input): { model: Shelves; op: Op } | null {
  const model = new Shelves(input.capacity);
  for (const op of input.ops) {
    if (model.values.has(op.key)) {
      if (op.kind === "put") model.values.set(op.key, op.val);
      model.use(op.key);
    } else if (op.kind === "put") {
      if (model.values.size === model.capacity) return { model, op };
      model.values.set(op.key, op.val);
      model.counts.set(op.key, 1);
      model.shelves.set(1, [...(model.shelves.get(1) ?? []), op.key]);
      model.lowest = 1;
    }
  }
  return null;
}

function insightFrames(input: Input): Frame[] {
  const moment = firstDrop(input);
  if (!moment) return [];
  const { model } = moment;
  const top = highestShelf(input);
  const lowestRow = model.lowest - 1;
  const front = (model.shelves.get(model.lowest) ?? [])[0];
  const base: CountShelvesState = { ...blankState(input.capacity), shelves: draw(model, top), lowestShelf: lowestRow };
  return [
    {
      scene: "insight",
      caption: "Picture shelves numbered by use count. Each key sits on the shelf for its count, and a use moves it up one shelf.",
      state: { ...base, lowestShelf: null },
    },
    {
      scene: "insight",
      caption: "A key always joins a shelf at the back. So on every shelf, the front key is the one used longest ago.",
      state: { ...base, lowestShelf: null, shelves: draw(model, top, (key) => ((model.shelves.get(model.counts.get(key) ?? 1) ?? [])[0] === key ? "window" : "idle")) },
    },
    {
      scene: "insight",
      caption: `Mark the lowest shelf that has keys. The key to drop is always its front key, here key ${front}. No searching.`,
      state: { ...base, shelves: draw(model, top, (key) => (key === front ? "miss" : "idle")) },
    },
  ];
}

function dropQuiz(model: Shelves, cells: CountShelvesState["shelves"], newKey: number): StoryQuiz {
  const order = cells.flatMap((shelf) => shelf.keys.map((item) => item.key));
  const lowestKeys = model.shelves.get(model.lowest) ?? [];
  const oldest = lowestKeys[0];
  const feedback: Record<number, string> = {};
  order.forEach((key, index) => {
    if (key === oldest) return;
    feedback[index] = lowestKeys.includes(key)
      ? `Key ${key} ties on the count, but it was used more recently than the key in front of it.`
      : `Key ${key} was used more often. It sits on a higher shelf.`;
  });
  return {
    kind: "cell",
    cells: order.length,
    question: `The cache is full and key ${newKey} needs room. Which key leaves? Click it.`,
    answer: order.indexOf(oldest),
    feedback,
    otherwise: "Look at the lowest shelf that has keys. Which of them was used longest ago?",
    why: "The front key of the lowest shelf: the fewest uses, and among those the oldest use.",
  };
}

/** The real shelves algorithm, one frame per change. `practice` asks at every drop. */
function solutionFrames(input: Input, scene: SceneId = "solution", practice = false): Frame[] {
  const { capacity, ops } = input;
  const frames: Frame[] = [];
  const model = new Shelves(capacity);
  const top = highestShelf(input);
  const returned: string[] = [];
  let askedDrop = false;
  let askedTie = false;
  let showedTrap = false;
  const line = (index: number) => (practice ? undefined : index);
  const state = (op: string | null, tone: (key: number) => CellTone = () => "idle"): CountShelvesState => ({
    ...blankState(capacity),
    shelves: draw(model, top, tone),
    lowestShelf: model.lowest > 0 ? model.lowest - 1 : null,
    op,
    returned: [...returned],
  });
  const only = (key: number, tone: CellTone) => (other: number) => (other === key ? tone : "idle");

  frames.push({
    scene,
    caption: practice
      ? `Your turn, with room for ${capacity}: ${ops.map(opText).join(", ")}. You pick which key leaves.`
      : `The shelves start empty. There is room for ${capacity} keys, and no lowest shelf yet.`,
    codeLine: line(2),
    state: state(null),
  });

  for (const op of ops) {
    const name = opText(op);
    if (model.values.has(op.key)) {
      if (op.kind === "put") model.values.set(op.key, op.val);
      const { from, emptied } = model.use(op.key);
      if (op.kind === "get") returned.push(String(model.values.get(op.key)));
      frames.push({
        scene,
        caption:
          op.kind === "get"
            ? `${name}: key ${op.key} is on shelf ${from}. It moves up to the back of shelf ${from + 1} and returns ${model.values.get(op.key)}.`
            : `${name}: key ${op.key} is already here. It takes the value ${op.val} and moves up to the back of shelf ${from + 1}.`,
        codeLine: line(op.kind === "get" ? 23 : 9),
        state: { ...state(name, only(op.key, "edge")), lowestShelf: emptied ? from - 1 : model.lowest - 1 },
      });
      if (emptied) {
        frames.push({
          scene,
          caption: `Shelf ${from} is empty now, and it was the lowest. The lowest marker moves up to shelf ${model.lowest}.`,
          codeLine: line(21),
          state: state(name),
        });
      }
      continue;
    }
    if (op.kind === "get") {
      returned.push("-1");
      frames.push({ scene, caption: `${name}: key ${op.key} is on no shelf. It returns -1, and nothing moves.`, codeLine: line(4), state: state(name) });
      continue;
    }
    if (model.values.size === capacity) {
      const lowestKeys = [...(model.shelves.get(model.lowest) ?? [])];
      const tie = lowestKeys.length > 1;
      const before: Frame = {
        scene,
        caption: `${name}: every place is taken. One key must leave to make room for key ${op.key}.`,
        codeLine: line(10),
        state: { ...state(name), arriving: { key: op.key, val: op.val } },
      };
      if (practice || (tie ? !askedTie : !askedDrop)) {
        if (tie) askedTie = true;
        else askedDrop = true;
        before.quiz = dropQuiz(model, before.state.shelves, op.key);
      }
      frames.push(before);
      const oldest = lowestKeys[0];
      frames.push({
        scene,
        caption: tie
          ? `Key ${oldest} leaves: it is at the front of the lowest shelf, shelf ${model.lowest}, so it was used longest ago.`
          : `Key ${oldest} leaves: it is the only key on the lowest shelf, shelf ${model.lowest}.`,
        codeLine: line(11),
        state: { ...state(name, only(oldest, "miss")), arriving: { key: op.key, val: op.val } },
      });
      if (tie && !showedTrap) {
        showedTrap = true;
        const newer = lowestKeys[lowestKeys.length - 1];
        frames.push({
          scene,
          caption: `The Tie Trap: key ${newer} has the same count, but it was used more recently. Dropping it would be wrong. Only the front key leaves.`,
          codeLine: line(11),
          state: { ...state(name, (key) => (key === oldest ? "miss" : key === newer ? "hit" : "idle")), arriving: { key: op.key, val: op.val }, trapKey: newer },
        });
      }
      model.shelves.get(model.lowest)?.shift();
      model.values.delete(oldest);
      model.counts.delete(oldest);
    }
    const hadLowest = model.lowest;
    model.values.set(op.key, op.val);
    model.counts.set(op.key, 1);
    model.shelves.set(1, [...(model.shelves.get(1) ?? []), op.key]);
    model.lowest = 1;
    frames.push({
      scene,
      caption:
        hadLowest > 1
          ? `${name}: new key ${op.key} goes to the back of shelf 1. The lowest marker drops back to shelf 1.`
          : `${name}: new key ${op.key} goes to the back of shelf 1.`,
      codeLine: line(hadLowest > 1 ? 16 : 15),
      state: state(name, only(op.key, "edge")),
    });
  }

  const answer = `[${returned.join(",")}]`;
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${answer}. Each time, the front key of the lowest shelf left.` : `All calls are done. The answer is ${answer}.`,
    state: { ...state(null), note: "fewest uses leave first; ties go to the oldest use" },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: "Time: O(1). Every call moved one key by one shelf, and every drop took the front key of the lowest shelf. Nothing was searched.",
      codeLine: 11,
      state: { ...state(null), counter: { label: "keys checked per drop", value: 1 } },
    });
    frames.push({
      scene,
      caption: `Space: O(capacity). Each stored key sits on exactly one shelf, and there are at most ${capacity} of them.`,
      codeLine: 1,
      state: state(null),
    });
  }
  return frames;
}

export const lfuCacheStory: ProblemStory<CountShelvesState> = {
  slugs: ["lc-460"],
  pattern: "Design: count buckets",
  trigger: "a store of limited size that throws out the key used the fewest times, with ties going to the key used longest ago",
  insight: "Shelves numbered by use count. A use moves a key up one shelf, to the back of that shelf. To make room, the front key of the lowest shelf leaves.",
  metaphor: { name: "The use-count shelves", legend: "shelf c = shelves.get(c) · lowest marker = lowest · front of a shelf = oldest use", terms: ["shelf", "shelves", "lowest", "front"] },
  traps: [{ name: "The Tie Trap", rule: "Two keys with the same smallest count: the one used longest ago leaves. Keep each shelf in order of use, so the oldest sits at the front." }],
  template: [
    "use(key): move key from shelf c to the back of shelf c + 1",
    "          if shelf c was the lowest and is now empty, lowest = c + 1",
    "put new key when full: drop the front key of the lowest shelf",
    "put new key: back of shelf 1, lowest = 1",
  ],
  complexity: {
    slow: "O(capacity)",
    time: "O(1)",
    timeWhy: "a use moves one key up one shelf, and the key to drop is always the front of the lowest shelf",
    space: "O(capacity)",
    spaceWhy: "each stored key sits on exactly one shelf",
  },
  code: CODE,
  examples: [
    { label: "room for 2: a tie at the end", input: "cap=2; put(1,1), put(2,2), get(1), put(3,3), get(2), get(3), put(4,4), get(1), get(3), get(4)", expected: "[1,-1,3,-1,3,4]" },
    { label: "room for 2: both keys used twice", input: "cap=2; put(1,1), put(2,2), get(1), get(2), put(3,3), get(1), get(3)", expected: "[1,2,-1,3]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-146", title: "LRU Cache" },
    { slug: "lc-895", title: "Maximum Frequency Stack" },
    { slug: "lc-380", title: "Insert Delete GetRandom O(1)" },
  ],
  answer: (raw) => solve(parse(raw)),
  frames: (raw) => {
    const input = parse(raw);
    const picture = insightFrames(input)[2]?.state ?? blankState(input.capacity);
    return [
      ...pictureFrames(input),
      ...slowFrames(input),
      ...insightFrames(input),
      ...solutionFrames(input),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...picture, note: "drop the front key of the lowest shelf" },
      },
    ];
  },
  View: CountShelvesView,
};
