import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = '["MyHashMap","put","get","put","get"]  [[],[5,10],[5],[5,20],[5]]';
const TRAP = "The Duplicate Key Trap";

const CODE = [
  "void put(int key, int value) {",
  "    int index = key % BUCKETS;",
  "    for (Entry entry = table[index]; entry != null; entry = entry.next) {",
  "        if (entry.key == key) {",
  "            entry.value = value;",
  "            return;",
  "        }",
  "    }",
  "    table[index] = new Entry(key, value, table[index]);",
  "}",
  "",
  "int get(int key) {",
  "    for (Entry entry = table[key % BUCKETS]; entry != null; entry = entry.next) {",
  "        if (entry.key == key) {",
  "            return entry.value;",
  "        }",
  "    }",
  "    return -1;",
  "}",
  "",
  "void remove(int key) {",
  "    int index = key % BUCKETS;",
  "    Entry prev = null;",
  "    for (Entry entry = table[index]; entry != null; entry = entry.next) {",
  "        if (entry.key == key) {",
  "            if (prev == null) table[index] = entry.next;",
  "            else prev.next = entry.next;",
  "            return;",
  "        }",
  "        prev = entry;",
  "    }",
  "}",
];

type MapOp = { op: string; args: number[] };

function parseOps(input: string): MapOp[] {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const ops = JSON.parse(parts[0]) as string[];
      const args = JSON.parse(parts[1]) as number[][];
      const result: MapOp[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] !== "MyHashMap") {
          result.push({ op: ops[i], args: args[i] ?? [] });
        }
      }
      return result;
    }
  } catch {
    // fallback
  }
  return [
    { op: "put", args: [1, 1] },
    { op: "put", args: [2, 2] },
    { op: "get", args: [1] },
    { op: "get", args: [3] },
    { op: "put", args: [2, 1] },
    { op: "get", args: [2] },
    { op: "remove", args: [2] },
    { op: "get", args: [2] },
  ];
}

class MapModel {
  table = new Map<number, number>();

  run(ops: MapOp[]): (number | null)[] {
    const out: (number | null)[] = [];
    for (const { op, args } of ops) {
      if (op === "put") {
        this.table.set(args[0], args[1]);
        out.push(null);
      } else if (op === "get") {
        out.push(this.table.has(args[0]) ? this.table.get(args[0])! : -1);
      } else if (op === "remove") {
        this.table.delete(args[0]);
        out.push(null);
      }
    }
    return out;
  }
}

function answerText(input: string): string {
  const ops = parseOps(input);
  const model = new MapModel();
  return JSON.stringify(model.run(ops));
}

function buildBuckets(table: Map<number, number>): DesignBucket[] {
  const BUCKETS = 5;
  const groups = new Map<number, { key: number; val: number }[]>();
  for (let i = 0; i < BUCKETS; i++) groups.set(i, []);
  for (const [k, v] of table.entries()) {
    const idx = k % BUCKETS;
    groups.get(idx)!.push({ key: k, val: v });
  }

  return Array.from(groups.entries()).map(([idx, entries]) => ({
    id: idx,
    label: `Cubby ${idx}`,
    items: entries.map((e) => ({ text: `${e.key} ➔ ${e.val}`, tone: "hit" as const })),
    tone: entries.length > 0 ? "hit" : "idle",
  }));
}

function buildSlots(table: Map<number, number>, activeKey?: number): DesignSlot[] {
  return Array.from(table.entries()).map(([k, v]) => ({
    id: k,
    key: `Key ${k}`,
    val: `${v}`,
    sub: `cubby ${k % 5}`,
    tone: k === activeKey ? "edge" : "hit",
  }));
}

function pictureFrames(): Frame[] {
  const empty = new Map<number, number>();
  return [
    {
      scene: "picture",
      caption: "A hash map stores key-value pairs in labeled cubbies so we can find any value quickly.",
      state: {
        buckets: buildBuckets(empty),
        counter: { label: "cubbies", value: 5 },
        note: { text: "labeled letter cubbies", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "A modulo calculation routes each key into a specific cubby slot on the shelf.",
      state: {
        buckets: buildBuckets(empty),
        counter: { label: "cubbies", value: 5 },
        note: { text: "hash key % cubbies", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "We want to support put, get, and remove in O(1) average time without built-in libraries.",
      state: {
        buckets: buildBuckets(empty),
        counter: { label: "cubbies", value: 5 },
        note: { text: "O(1) average operations", tone: "teal" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const empty = new Map<number, number>();
  return [
    {
      scene: "slow",
      caption: "The slow way allocates a gigantic flat array of one million integers filled with minus one.",
      state: {
        buckets: buildBuckets(empty),
        counter: { label: "array size", value: "1,000,001" },
        note: { text: "giant flat array", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Pre-allocating millions of elements wastes huge memory even when storing only a few keys.",
      state: {
        buckets: buildBuckets(empty),
        counter: { label: "wasted memory", value: "high space" },
        note: { text: "space inefficiency", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Separate chaining uses a modest prime bucket count and chains entries only where needed.",
      state: {
        buckets: buildBuckets(empty),
        counter: { label: "cubbies", value: 7919 },
        note: { text: "chained bucket shelf", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const empty = new Map<number, number>();
  return [
    {
      scene: "insight",
      caption: "Keys route to cubby slots by modulo. Multiple keys falling in the same cubby form a linked chain.",
      state: {
        buckets: buildBuckets(empty),
        note: { text: "modulo routing with chains", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "On put, always scan the chain first: update the value if the key is already present.",
      state: {
        buckets: buildBuckets(empty),
        note: { text: "update existing key in place", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(ops: MapOp[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const model = new MapModel();
  const outputs: (number | null)[] = [];
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 1,
    caption: "Set up cubby slots array. Each cubby holds a linked chain of key-value entries.",
    state: {
      slots: [],
      buckets: buildBuckets(model.table),
      counter: { label: "entries", value: 0 },
      note: { text: "cubbies ready on shelf", tone: "accent" },
    },
  });

  for (const { op, args } of ops) {
    if (op === "put") {
      const [key, val] = args;
      const already = model.table.has(key);

      if (already && !askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `Inserting key ${key} with value ${val}, but key ${key} already exists. What must put do?`,
          options: [
            "update the existing entry in the cubby chain without adding a duplicate node",
            "append a second node for the key at the end of the chain",
          ],
          answer: 0,
          why: "Keys in a map must be unique. Scanning the chain allows updating in place without duplicate entries.",
        };

        frames.push({
          scene,
          codeLine: 3,
          caption: `${TRAP}: key ${key} already exists in cubby ${key % 5}; update value instead of adding duplicate.`,
          state: {
            slots: buildSlots(model.table, key),
            buckets: buildBuckets(model.table),
            activeOp: `put(${key}, ${val})`,
            counter: { label: "trap check", value: "duplicate key" },
            note: { text: "update key in place", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 4,
          caption: `Updated key ${key} value to ${val} inside cubby ${key % 5}.`,
          state: {
            slots: buildSlots(model.table, key),
            buckets: buildBuckets(model.table),
            activeOp: `put(${key}, ${val})`,
            counter: { label: "updated key", value: key },
            note: { text: `key ${key} updated to ${val}`, tone: "teal" },
          },
        });
      }

      model.table.set(key, val);
      outputs.push(null);

      frames.push({
        scene,
        codeLine: 8,
        caption: `Stored key ${key} with value ${val} in cubby ${key % 5}.`,
        state: {
          slots: buildSlots(model.table, key),
          buckets: buildBuckets(model.table),
          activeOp: `put(${key}, ${val})`,
          counter: { label: "entries", value: model.table.size },
          note: { text: `put(${key}, ${val}) complete`, tone: "accent" },
        },
      });
    } else if (op === "get") {
      const key = args[0];
      const val = model.table.has(key) ? model.table.get(key)! : -1;
      outputs.push(val);

      frames.push({
        scene,
        codeLine: 13,
        caption: `Looked up key ${key} in cubby ${key % 5}: returned ${val}.`,
        state: {
          slots: buildSlots(model.table, key),
          buckets: buildBuckets(model.table),
          activeOp: `get(${key}) ➔ ${val}`,
          counter: { label: "lookup", value: val },
          note: { text: `get(${key}): ${val}`, tone: val !== -1 ? "teal" : "accent" },
        },
      });
    } else if (op === "remove") {
      const key = args[0];
      model.table.delete(key);
      outputs.push(null);

      frames.push({
        scene,
        codeLine: 25,
        caption: `Removed key ${key} from cubby ${key % 5}.`,
        state: {
          slots: buildSlots(model.table),
          buckets: buildBuckets(model.table),
          activeOp: `remove(${key})`,
          counter: { label: "entries", value: model.table.size },
          note: { text: `removed key ${key}`, tone: "teal" },
        },
      });
    }
  }

  frames.push({
    scene,
    codeLine: 17,
    caption: `All hash map operations finished on the cubby shelf. The answer is ${JSON.stringify(outputs)}.`,
    state: {
      slots: buildSlots(model.table),
      buckets: buildBuckets(model.table),
      counter: { label: "final entries", value: model.table.size },
      note: { text: "operations complete", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 17,
    caption: "Time: O(1). Modulo routes to cubbies instantly; chains stay short with prime sizing.",
    state: {
      slots: buildSlots(model.table),
      buckets: buildBuckets(model.table),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 17,
    caption: "Space: O(N + B). Memory holds only stored entries N plus bucket slots B.",
    state: {
      slots: buildSlots(model.table),
      buckets: buildBuckets(model.table),
      note: { text: "space complexity", tone: "accent" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];
  const empty = new Map<number, number>();

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "What must put(key, value) do when the key already exists in a bucket chain?",
    options: [
      "scan the chain, update the existing entry's value, and return without adding a new node",
      "add a second node with the same key to the end of the chain",
    ],
    answer: 0,
    why: "Keys in a hash map are unique. Re-inserting without checking creates duplicate keys and corrupts lookups.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "How does separate chaining resolve hash collisions when two keys map to the same bucket?",
    options: [
      "stores colliding entries in a linked list attached to that bucket",
      "discards the older entry to make room for the new one",
    ],
    answer: 0,
    why: "Separate chaining attaches a linked chain to each bucket, allowing multiple keys per bucket.",
  };

  frames.push({
    scene,
    caption: "When designing a hash map, picture labeled letter cubbies routing keys by modulo.",
    state: {
      buckets: buildBuckets(empty),
      note: { text: "modulo cubby routing", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Never add duplicate keys on put: always scan the cubby chain to update existing values.",
    state: {
      buckets: buildBuckets(empty),
      note: { text: "avoid duplicate keys", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Separate chaining handles collisions gracefully, maintaining O(1) average time.",
    state: {
      buckets: buildBuckets(empty),
      note: { text: "O(1) average operations", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the labeled letter cubbies: hash keys to buckets, update duplicates in place, and link chains.",
    state: {
      buckets: buildBuckets(empty),
      note: { text: "hash map ready", tone: "teal" },
    },
  });

  return frames;
}

export const designHashMapStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-706"],
  pattern: "Separate chaining",
  trigger: "design a hash map without using built-in hash table libraries",
  insight: "Map keys to bucket slots using modulo hashing. Within each bucket, chain entries in a list: scan the chain to update an existing key on put, or append at the head.",
  metaphor: {
    name: "The labeled letter cubbies",
    legend: "cubby = bucket slot · letter = key-value entry · shelf = bucket array · chain = linked list in cubby",
    terms: ["cubby", "letter", "shelf", "chain", "bucket", "slot", "key", "entry", "hash", "modulo"],
  },
  traps: [{ name: TRAP, rule: "Scan the bucket chain first: if an entry with matching key exists, update its value." }],
  template: [
    "class MyHashMap:",
    "    void put(int key, int value): hash to bucket, update key if present, else prepend",
    "    int get(int key): hash to bucket, scan chain, return val or -1",
    "    void remove(int key): hash to bucket, unlink entry if key matches",
  ],
  complexity: {
    slow: "O(M)",
    time: "O(1)",
    timeWhy: "with a prime bucket count, expected chain length is small, keeping searches O(1) on average",
    space: "O(N + B)",
    spaceWhy: "memory is proportional to stored entries N plus bucket count B",
  },
  code: CODE,
  examples: [
    {
      label: "put and get sequence",
      input: '["MyHashMap","put","put","get","get","put","get","remove","get"]  [[],[1,1],[2,2],[1],[3],[2,1],[2],[2],[2]]',
      expected: "[null,null,1,-1,null,1,null,-1]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-380", title: "Insert Delete GetRandom O(1)" },
    { slug: "lc-362", title: "Design Hit Counter" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const ops = parseOps(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(ops),
      ...cardFrames(),
    ];
  },
  View: AgyDesignSlotsView,
};
