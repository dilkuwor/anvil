import { LruCacheView, type LruCacheState, type LruGuest } from "../lru-cache-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type LruFrame = StoryFrame<LruCacheState>;
type Op = { kind: "put"; key: number; val: number } | { kind: "get"; key: number };
type Input = { capacity: number; ops: Op[] };

/** Fresh run for "your turn": the key that arrived first is used again, so it is NOT the one that leaves. */
const PRACTICE = "cap=3; put(5,50), put(6,60), put(7,70), get(5), put(8,80), get(6), put(7,77)";

const CODE = [
  "class LRUCache {",
  "    class Node { int key, val; Node prev, next; }",
  "    Map<Integer, Node> map = new HashMap<>();",
  "    Node head = new Node(), tail = new Node();",
  "    int capacity;",
  "    LRUCache(int capacity) {",
  "        this.capacity = capacity;",
  "        head.next = tail; tail.prev = head;",
  "    }",
  "    int get(int key) {",
  "        Node node = map.get(key);",
  "        if (node == null) return -1;",
  "        remove(node); addFirst(node);",
  "        return node.val;",
  "    }",
  "    void put(int key, int value) {",
  "        Node node = map.get(key);",
  "        if (node != null) { node.val = value; remove(node); addFirst(node); return; }",
  "        if (map.size() == capacity) {",
  "            Node last = tail.prev;",
  "            remove(last); map.remove(last.key);",
  "        }",
  "        node = new Node(); node.key = key; node.val = value;",
  "        map.put(key, node); addFirst(node);",
  "    }",
  "    void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }",
  "    void addFirst(Node n) {",
  "        n.next = head.next; n.prev = head;",
  "        head.next.prev = n; head.next = n;",
  "    }",
  "}",
];

const lineOf = (text: string) => CODE.findIndex((line) => line.includes(text));
const LINE = {
  setup: lineOf("head.next = tail"),
  find: lineOf("Node node = map.get(key);"),
  missing: lineOf("return -1"),
  result: lineOf("return node.val"),
  update: lineOf("node.val = value; remove"),
  full: lineOf("map.size() == capacity"),
  evict: lineOf("remove(last)"),
  insert: lineOf("map.put(key, node)"),
  unhook: lineOf("void remove(Node n)"),
  toFront: lineOf("n.next = head.next"),
  map: lineOf("new HashMap"),
};

function parseInput(raw: string): Input {
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

/** Independent solver: a JavaScript Map remembers the order keys were (re)written in. */
function simulate({ capacity, ops }: Input): (number | null)[] {
  const store = new Map<number, number>();
  return ops.map((op) => {
    const held = store.get(op.key);
    if (op.kind === "get") {
      if (held === undefined) return -1;
      store.delete(op.key);
      store.set(op.key, held);
      return held;
    }
    store.delete(op.key);
    if (store.size === capacity) store.delete(store.keys().next().value as number);
    store.set(op.key, op.val);
    return null;
  });
}

const show = (results: (number | null)[]) => `[${results.map((result) => (result === null ? "null" : String(result))).join(",")}]`;

/** The line (front first) and the guest list, as plain data the frames can copy. */
type Cache = { line: LruGuest[]; list: number[] };

function blank(capacity: number): LruCacheState {
  return { capacity, line: [], links: "twoWay", guestList: null, focusKey: null, pointer: false, leavingKey: null, liftedKey: null, arriving: null, walked: null, op: null, counter: null };
}

/** Does one operation on the plain data, exactly as the real cache would. */
function apply(cache: Cache, capacity: number, op: Op) {
  const at = cache.line.findIndex((guest) => guest.key === op.key);
  if (at !== -1) {
    const [guest] = cache.line.splice(at, 1);
    if (op.kind === "put") guest.val = op.val;
    cache.line.unshift(guest);
    return;
  }
  if (op.kind === "get") return;
  if (cache.line.length === capacity) {
    const gone = cache.line.pop()!;
    cache.list = cache.list.filter((key) => key !== gone.key);
  }
  cache.line.unshift({ key: op.key, val: op.val });
  cache.list.push(op.key);
}

const copy = (line: LruGuest[]) => line.map((guest) => ({ ...guest }));

function pictureFrames({ capacity, ops }: Input): LruFrame[] {
  const plain: LruCacheState = { ...blank(capacity), links: "plain" };
  const frames: LruFrame[] = [
    {
      scene: "picture",
      caption: `A cache is a small store with room for only ${capacity} keys. put(key, value) saves a key with its value, and get(key) reads the value back.`,
      state: plain,
    },
  ];
  const cache: Cache = { line: [], list: [] };
  const fits: Op[] = [];
  let blocked: Op | null = null;
  let read: { key: number; val: number } | null = null;
  for (const op of ops) {
    const known = cache.line.some((guest) => guest.key === op.key);
    if (op.kind === "put" && !known && cache.line.length === capacity) {
      blocked = op;
      break;
    }
    if (op.kind === "get" && known) read ??= { key: op.key, val: cache.line.find((guest) => guest.key === op.key)!.val };
    apply(cache, capacity, op);
    fits.push(op);
  }
  frames.push({
    scene: "picture",
    caption: `Allowed: ${fits.map(opText).join(", ")}. There is room for all of it.${read ? ` get(${read.key}) reads back ${read.val}.` : ""}`,
    state: { ...plain, line: copy(cache.line) },
  });
  if (blocked && blocked.kind === "put") {
    frames.push({
      scene: "picture",
      caption: `Not allowed: more than ${capacity} keys at once. ${opText(blocked)} brings a new key to a full store, so one old key must be thrown out first.`,
      state: { ...plain, line: copy(cache.line), arriving: { key: blocked.key, val: blocked.val }, op: opText(blocked) },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The rule: throw out the key that has gone unused the longest. The goal: do every put and every get in one step, however many keys the store holds.",
    state: { ...plain, line: copy(cache.line) },
  });
  return frames;
}

type SlowRun = { looks: number; shown: { op: Op; before: LruGuest[]; looks: number; found: boolean; soFar: number }[] };

/** The slow way, really run: only a line, so every operation looks along it from the front. */
function runSlow({ capacity, ops }: Input): SlowRun {
  const cache: Cache = { line: [], list: [] };
  const run: SlowRun = { looks: 0, shown: [] };
  for (const op of ops) {
    let looks = 0;
    let found = false;
    for (const guest of cache.line) {
      looks++;
      if (guest.key === op.key) {
        found = true;
        break;
      }
    }
    run.looks += looks;
    if (looks >= 2 && run.shown.length < 2) run.shown.push({ op, before: copy(cache.line), looks, found, soFar: run.looks });
    apply(cache, capacity, op);
  }
  return run;
}

function slowFrames(input: Input, run: SlowRun): LruFrame[] {
  const frames: LruFrame[] = [];
  run.shown.forEach((step, index) => {
    const { op, looks, found } = step;
    const told =
      op.kind === "get"
        ? found
          ? `For ${opText(op)} we look at each key from the front until we find key ${op.key}: ${looks} looks.`
          : `For ${opText(op)} we look at every key in the line, and only then know key ${op.key} is missing: ${looks} looks.`
        : found
          ? `${opText(op)} must find key ${op.key} before it can change it: ${looks} looks.`
          : `${opText(op)} must first check that key ${op.key} is not already here. That means looking at every key: ${looks} looks.`;
    frames.push({
      scene: "slow",
      caption: index === 0 ? `The slow way: keep only a line of keys, latest use at the front. ${told}` : told,
      state: { ...blank(input.capacity), links: "plain", line: step.before, focusKey: found ? op.key : null, walked: looks, op: opText(op), counter: { label: "looks along the line", value: step.soFar } },
    });
  });
  frames.push({
    scene: "slow",
    caption: `${run.shown.length === 0 ? "The slow way: keep only a line of keys, and look along it every time. " : ""}These ${input.ops.length} operations took ${run.looks} looks. With 1,000 keys in the line, one get could take 1,000 looks: O(n) time for each operation.`,
    state: { ...blank(input.capacity), links: "plain", counter: { label: "looks along the line", value: run.looks } },
  });
  return frames;
}

/** The moment just before the first operation that touches a key already in the cache. */
function firstReuse({ capacity, ops }: Input): { cache: Cache; key: number } | null {
  const cache: Cache = { line: [], list: [] };
  for (const op of ops) {
    if (cache.line.some((guest) => guest.key === op.key)) return { cache, key: op.key };
    apply(cache, capacity, op);
  }
  return cache.line.length > 0 ? { cache, key: cache.line.at(-1)!.key } : null;
}

function insightFrames(input: Input): LruFrame[] {
  const moment = firstReuse(input);
  const line = moment ? copy(moment.cache.line) : [];
  const base: LruCacheState = { ...blank(input.capacity), line };
  const frames: LruFrame[] = [
    {
      scene: "insight",
      caption: "Picture a line of guests between a front door and a back door. Whoever was just used stands at the front. Whoever stands at the back is the first to leave.",
      state: base,
    },
  ];
  if (!moment) return frames;
  frames.push({
    scene: "insight",
    caption: `Beside the line is a guest list. For every key it notes that key's seat, so key ${moment.key} is found in one step, with no walking along the line.`,
    state: { ...base, guestList: [...moment.cache.list], focusKey: moment.key, pointer: true },
  });
  frames.push({
    scene: "insight",
    caption: `The guests are linked both ways: to the one in front, and to the one behind. So key ${moment.key} can step out from anywhere in one step, and rejoin at the front.`,
    state: { ...base, guestList: [...moment.cache.list], focusKey: moment.key, liftedKey: moment.key },
  });
  return frames;
}

function whichEndQuiz(cells: number, key: number): StoryQuiz {
  return {
    kind: "cell",
    cells,
    question: `Key ${key} was just used. Which end of the line does it go to? Click a door.`,
    answer: 0,
    feedback: { [cells - 1]: "The back of the line is the first to leave. A guest that was just used should be the safest of all." },
    otherwise: "That is a guest, not an end of the line. Pick one of the two doors.",
    why: "Just used means front of the line: as far from leaving as possible.",
  };
}

function whoLeavesQuiz(cache: Cache): StoryQuiz {
  const count = cache.line.length;
  const feedback: Record<number, string> = {
    0: "That is a door, not a guest. The doors never leave.",
    [count + 1]: "That is a door, not a guest. The doors never leave.",
  };
  cache.line.slice(0, -1).forEach((guest, index) => {
    feedback[index + 1] =
      guest.key === cache.list[0]
        ? `Key ${guest.key} arrived first, but it was used again since then. What counts is the last use, not the arrival.`
        : index === 0
          ? `Key ${guest.key} is at the front of the line: it was used most recently. It is the last one we want to lose.`
          : `Key ${guest.key} was used more recently than someone else in the line.`;
  });
  return {
    kind: "cell",
    cells: count + 2,
    question: "The line is full and a new key arrives. Who leaves? Click that guest.",
    answer: count,
    feedback,
    otherwise: "Look at the order of the line: one end was used most recently, the other has waited the longest.",
    why: "The guest at the back of the line has gone unused the longest, so it leaves.",
  };
}

/**
 * The real cache, one frame per change. `practice` reuses it on a fresh run,
 * where the reader decides every move.
 */
function runFrames(input: Input, scene: SceneId, practice: boolean, slowLooks: number): LruFrame[] {
  const { capacity, ops } = input;
  const frames: LruFrame[] = [];
  const cache: Cache = { line: [], list: [] };
  const results: (number | null)[] = [];
  let askedEnd = false;
  let askedLeave = false;
  let shownTrap = false;
  const codeLine = (index: number) => (practice ? undefined : index);
  const snap = (op: Op | null, extra: Partial<LruCacheState> = {}): LruCacheState => ({
    ...blank(capacity),
    line: copy(cache.line),
    guestList: [...cache.list],
    op: op ? opText(op) : null,
    ...extra,
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new run: room for ${capacity} keys, and ${ops.length} operations. You decide where a used guest goes, and who leaves.`
      : `We start with an empty line between a front door and a back door, and an empty guest list. There is room for ${capacity} keys.`,
    codeLine: codeLine(LINE.setup),
    state: snap(null),
  });

  for (const op of ops) {
    const at = cache.line.findIndex((guest) => guest.key === op.key);

    if (at === -1 && op.kind === "get") {
      results.push(-1);
      frames.push({
        scene,
        caption: `${opText(op)}: key ${op.key} is not on the guest list, so the answer is -1. Nobody in the line moves.`,
        codeLine: codeLine(LINE.missing),
        state: snap(op),
      });
      continue;
    }

    if (at === -1 && op.kind === "put") {
      results.push(null);
      const full = cache.line.length === capacity;
      if (full) {
        const check: LruFrame = {
          scene,
          caption: `${opText(op)}: key ${op.key} is not on the guest list, and the line is full: ${capacity} of ${capacity}. Someone must leave first.`,
          codeLine: codeLine(LINE.full),
          state: snap(op),
        };
        if (practice || !askedLeave) {
          askedLeave = true;
          check.quiz = whoLeavesQuiz(cache);
        }
        frames.push(check);
        const gone = cache.line.at(-1)!;
        frames.push({
          scene,
          caption: `Key ${gone.key} leaves: it stands at the back of the line, so it has gone unused the longest. It is crossed off the guest list too.`,
          codeLine: codeLine(LINE.evict),
          state: snap(op, { leavingKey: gone.key }),
        });
      }
      apply(cache, capacity, op);
      frames.push({
        scene,
        caption: full
          ? `Now there is room. Key ${op.key} joins at the front of the line, and the guest list notes its seat.`
          : `${opText(op)}: key ${op.key} is new and there is room. It joins at the front of the line, and the guest list notes its seat.`,
        codeLine: codeLine(LINE.insert),
        state: snap(op, { focusKey: op.key, pointer: true }),
      });
      continue;
    }

    // The key is already in the cache: read or change it, then move it to the front.
    const guest = cache.line[at];
    if (op.kind === "put") guest.val = op.val;
    results.push(op.kind === "get" ? guest.val : null);
    const needsTrap = !shownTrap && at >= 1;
    const found: LruFrame = {
      scene,
      caption:
        op.kind === "get"
          ? `${opText(op)}: the guest list points straight at key ${op.key}'s seat, with no searching. Its value is ${guest.val}.`
          : `${opText(op)}: key ${op.key} is already on the guest list. We go straight to its seat and change its value to ${op.val}.`,
      codeLine: codeLine(op.kind === "get" ? LINE.find : LINE.update),
      state: snap(op, { focusKey: op.key, pointer: true }),
    };
    if (practice && needsTrap) {
      found.quiz = {
        kind: "choice",
        question: `Key ${op.key} must now step out of the line. If the links pointed only towards the back, how would we find the guest in front of it?`,
        options: [`Key ${op.key} would know it`, "Walk along the line from the front door", "Look it up on the guest list"],
        answer: 1,
        why: "A one-way link cannot look the other way, and the guest list knows seats, not neighbours. So: a walk. That is the One-Way Trap.",
      };
    }
    frames.push(found);

    if (at === 0) {
      frames.push({
        scene,
        caption: `Key ${op.key} already stands at the front of the line. Stepping out and straight back in leaves the line as it was.`,
        codeLine: codeLine(LINE.toFront),
        state: snap(op, { focusKey: op.key }),
      });
      continue;
    }

    if (needsTrap) {
      shownTrap = true;
      frames.push({
        scene,
        caption: `The One-Way Trap: with links pointing only towards the back, key ${op.key} cannot see the guest in front of it. We would walk from the front door to find that guest: ${at} ${at === 1 ? "step" : "steps"}.`,
        codeLine: codeLine(LINE.unhook),
        state: snap(op, { links: "oneWay", focusKey: op.key, walked: at, counter: { label: "walk steps", value: at } }),
      });
    }
    const out: LruFrame = {
      scene,
      caption: `${needsTrap ? "But these guests are linked both ways. " : ""}Key ${op.key} knows both its neighbours, so they simply link to each other, and key ${op.key} is out of the line in one step.`,
      codeLine: codeLine(LINE.unhook),
      state: snap(op, { focusKey: op.key, liftedKey: op.key }),
    };
    if (practice || !askedEnd) {
      askedEnd = true;
      out.quiz = whichEndQuiz(cache.line.length + 2, op.key);
    }
    frames.push(out);
    apply(cache, capacity, op);
    frames.push({
      scene,
      caption: `Key ${op.key} goes in right behind the front door. It is now at the front of the line: the last one that will have to leave.`,
      codeLine: codeLine(LINE.toFront),
      state: snap(op, { focusKey: op.key }),
    });
  }

  if (practice) {
    frames.push({
      scene,
      caption: `Done. The answers were ${show(results)}. Every used guest went to the front of the line, and the guest at the back was the one to leave.`,
      state: snap(null),
    });
    return frames;
  }
  frames.push({
    scene,
    caption: `All ${ops.length} operations are done. A put answers with nothing, written null. The answer is ${show(results)}.`,
    codeLine: LINE.result,
    state: snap(null),
  });
  frames.push({
    scene,
    caption: `Time: O(1) for every get and put. The guest list finds a seat in one step, and two-way links move a guest in one step. No walking${slowLooks > 0 ? `, where the slow way needed ${slowLooks} looks` : ""}.`,
    codeLine: LINE.find,
    state: snap(null, { counter: { label: "looks along the line", value: 0 } }),
  });
  frames.push({
    scene,
    caption: `Space: O(capacity). At most ${capacity} guests stand in the line, and the guest list has one entry for each of them.`,
    codeLine: LINE.map,
    state: snap(null),
  });
  return frames;
}

export const lruCacheStory: ProblemStory<LruCacheState> = {
  slugs: ["lc-146"],
  pattern: "Design: hash map + doubly linked list",
  trigger: "a store of limited size where get and put must each take one step, and the key unused the longest is thrown out",
  insight: "A line of guests plus a guest list. Just used goes to the front of the line, the back of the line leaves first, and the guest list finds any seat in one step.",
  metaphor: {
    name: "The VIP queue",
    legend: "guest list = map (key → node) · line = doubly linked list · front door = head · back door = tail · step out = remove(node) · go to the front = addFirst(node)",
    terms: ["line", "guest", "door", "front", "back"],
  },
  traps: [{ name: "The One-Way Trap", rule: "With links in one direction only, a guest cannot unhook itself: finding the neighbour in front means walking from the head, O(n). Keep prev and next, plus head and tail guards." }],
  template: [
    "map: key → node;  list: head ⇄ … ⇄ tail   // head side = just used",
    "get(key):  node = map[key] or return -1;  unhook(node);  putBehindHead(node);",
    "put(key):  if known: update, unhook, putBehindHead;",
    "           else: if full: drop tail.prev from list and map;  add new node behind head;",
    "unhook(n): n.prev.next = n.next;  n.next.prev = n.prev;",
  ],
  complexity: {
    slow: "O(n) per operation",
    time: "O(1)",
    timeWhy: "the guest list finds the seat in one step, and two-way links unhook and re-insert a guest in one step",
    space: "O(capacity)",
    spaceWhy: "one guest in the line and one entry on the guest list per stored key",
  },
  code: CODE,
  examples: [
    { label: "room for 2: a read saves key 1", input: "cap=2; put(1,1), put(2,2), get(1), put(3,3), get(2)", expected: "[null,null,1,null,-1]" },
    { label: "room for 3: an update saves key 2", input: "cap=3; put(1,1), put(2,2), put(3,3), put(2,20), put(4,4), get(1), get(2)", expected: "[null,null,null,null,null,-1,20]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-380", title: "Insert Delete GetRandom O(1)" },
    { slug: "lc-706", title: "Design HashMap" },
    { slug: "lc-155", title: "Min Stack" },
  ],
  answer: (raw) => show(simulate(parseInput(raw))),
  frames: (raw) => {
    const input = parseInput(raw);
    const slow = runSlow(input);
    const end: Cache = { line: [], list: [] };
    for (const op of input.ops) apply(end, input.capacity, op);
    return [
      ...pictureFrames(input),
      ...slowFrames(input, slow),
      ...insightFrames(input),
      ...runFrames(input, "solution", false, slow.looks),
      ...runFrames(parseInput(PRACTICE), "card", true, 0),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(input.capacity), line: copy(end.line), guestList: [...end.list] },
      },
    ];
  },
  View: LruCacheView,
};
