import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = '["RandomizedSet","insert","insert","remove","getRandom"]  [[],[10],[20],[10],[]]';
const TRAP = "The Premature Update Trap";

const CODE = [
  "boolean insert(int val) {",
  "    if (indexOf.containsKey(val)) return false;",
  "    indexOf.put(val, values.size());",
  "    values.add(val);",
  "    return true;",
  "}",
  "",
  "boolean remove(int val) {",
  "    Integer index = indexOf.remove(val);",
  "    if (index == null) return false;",
  "    int last = values.get(values.size() - 1);",
  "    values.set(index, last);",
  "    if (last != val) {",
  "        indexOf.put(last, index);",
  "    }",
  "    values.remove(values.size() - 1);",
  "    return true;",
  "}",
  "",
  "int getRandom() {",
  "    return values.get(random.nextInt(values.size()));",
  "}",
];

type SetOp = { op: string; val?: number };

function parseOps(input: string): SetOp[] {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const ops = JSON.parse(parts[0]) as string[];
      const args = JSON.parse(parts[1]) as number[][];
      const result: SetOp[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] !== "RandomizedSet") {
          result.push({ op: ops[i], val: args[i]?.[0] });
        }
      }
      return result;
    }
  } catch {
    // fallback
  }
  return [
    { op: "insert", val: 1 },
    { op: "remove", val: 2 },
    { op: "insert", val: 2 },
    { op: "getRandom" },
    { op: "remove", val: 1 },
    { op: "insert", val: 2 },
    { op: "getRandom" },
  ];
}

class RandomizedModel {
  values: number[] = [];
  indexOf = new Map<number, number>();

  insert(val: number): boolean {
    if (this.indexOf.has(val)) return false;
    this.indexOf.set(val, this.values.length);
    this.values.push(val);
    return true;
  }

  remove(val: number): boolean {
    if (!this.indexOf.has(val)) return false;
    const index = this.indexOf.get(val)!;
    this.indexOf.delete(val);
    const last = this.values[this.values.length - 1];
    this.values[index] = last;
    if (last !== val) {
      this.indexOf.set(last, index);
    }
    this.values.pop();
    return true;
  }

  getRandom(): number {
    return this.values[this.values.length - 1];
  }

  run(ops: SetOp[]): string[] {
    const out: string[] = [];
    for (const { op, val } of ops) {
      if (op === "insert" && val !== undefined) {
        out.push(String(this.insert(val)));
      } else if (op === "remove" && val !== undefined) {
        out.push(String(this.remove(val)));
      } else if (op === "getRandom") {
        out.push(String(this.getRandom()));
      }
    }
    return out;
  }
}

function answerText(input: string): string {
  const ops = parseOps(input);
  const model = new RandomizedModel();
  return JSON.stringify(model.run(ops));
}

function buildSlots(values: number[], activeVal?: number): DesignSlot[] {
  return values.map((v, i) => ({
    id: i,
    key: `Chair ${i}`,
    val: `${v}`,
    sub: `index ${i}`,
    tone: v === activeVal ? "edge" : "hit",
  }));
}

function buildBuckets(indexOf: Map<number, number>): DesignBucket[] {
  return [
    {
      id: "map",
      label: "Map Index Tags",
      items: Array.from(indexOf.entries()).map(([val, idx]) => ({
        text: `Val ${val} ➔ Chair ${idx}`,
        tone: "hit" as const,
      })),
      tone: "hit",
    },
  ];
}

function pictureFrames(): Frame[] {
  return [
    {
      scene: "picture",
      caption: "We want a collection where insert, delete, and getRandom all run in O(1) average time.",
      state: {
        slots: [],
        buckets: [{ id: "map", label: "Map Index Tags", items: [], tone: "idle" }],
        counter: { label: "values", value: 0 },
        note: { text: "swapping numbered chairs", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "An array gives instant random access by index, while a map tag remembers each value's seat.",
      state: {
        slots: [],
        buckets: [{ id: "map", label: "Map Index Tags", items: [], tone: "idle" }],
        counter: { label: "access", value: "O(1)" },
        note: { text: "dense array plus hash map", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "To remove in O(1) without shifting, swap the target value with the last chair, then pop the tail.",
      state: {
        slots: [],
        buckets: [{ id: "map", label: "Map Index Tags", items: [], tone: "idle" }],
        counter: { label: "delete", value: "swap with tail" },
        note: { text: "swap target with last seat", tone: "teal" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way removes elements by searching the list and shifting all following seats left.",
      state: {
        slots: [],
        buckets: [{ id: "map", label: "Map Index Tags", items: [], tone: "idle" }],
        counter: { label: "shift cost", value: "O(n)" },
        note: { text: "linear array shifting", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Shifting thousands of elements on every deletion destroys constant-time performance.",
      state: {
        slots: [],
        buckets: [{ id: "map", label: "Map Index Tags", items: [], tone: "idle" }],
        counter: { label: "overhead", value: "slow" },
        note: { text: "O(n) deletion bottleneck", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Swapping with the last chair avoids all shifting, keeping deletion in constant time.",
      state: {
        slots: [],
        buckets: [{ id: "map", label: "Map Index Tags", items: [], tone: "idle" }],
        counter: { label: "swap delete", value: "O(1)" },
        note: { text: "O(1) tail swap deletion", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  return [
    {
      scene: "insight",
      caption: "To remove an item, lookup its chair index from the map and copy the last chair into that seat.",
      state: {
        slots: [],
        buckets: [{ id: "map", label: "Map Index Tags", items: [], tone: "idle" }],
        note: { text: "copy tail to target seat", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "Update the tail item's map tag to the new seat, then pop the tail from the array in O(1) time.",
      state: {
        slots: [],
        buckets: [{ id: "map", label: "Map Index Tags", items: [], tone: "idle" }],
        note: { text: "update map tag and pop tail", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(ops: SetOp[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const model = new RandomizedModel();
  const outputs: string[] = [];
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 1,
    caption: "Set up dense array for values and map for seat index tags. Structure is empty.",
    state: {
      slots: [],
      buckets: buildBuckets(model.indexOf),
      counter: { label: "chairs", value: 0 },
      note: { text: "numbered chairs ready", tone: "accent" },
    },
  });

  for (const { op, val } of ops) {
    if (op === "insert" && val !== undefined) {
      const added = model.insert(val);
      outputs.push(String(added));

      frames.push({
        scene,
        codeLine: added ? 3 : 1,
        caption: added
          ? `Inserted ${val} into chair ${model.values.length - 1} and tagged map index.`
          : `Insert ${val} failed: value already seated in chairs.`,
        state: {
          slots: buildSlots(model.values, val),
          buckets: buildBuckets(model.indexOf),
          activeOp: `insert(${val}) ➔ ${added}`,
          counter: { label: "values", value: model.values.length },
          note: { text: added ? `inserted ${val}` : `already present`, tone: added ? "teal" : "accent" },
        },
      });
    } else if (op === "remove" && val !== undefined) {
      const hasVal = model.indexOf.has(val);

      if (hasVal && !askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `When removing a value that happens to be in the last chair, why must we check last != val?`,
          options: [
            "updating the map unconditionally when last == val resurrects the deleted key",
            "the array capacity shrinks to zero",
          ],
          answer: 0,
          why: "indexOf.remove already deleted val. Re-inserting last when last == val resurrects the deleted key.",
        };

        frames.push({
          scene,
          codeLine: 12,
          caption: `${TRAP}: when the removed item sits in the last chair, check last != val so we never re-insert it.`,
          state: {
            slots: buildSlots(model.values, val),
            buckets: buildBuckets(model.indexOf),
            activeOp: `remove(${val})`,
            counter: { label: "trap warning", value: "deleted key" },
            note: { text: "guard against resurrecting key", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 15,
          caption: "We check that the last chair holds a different value before updating the map tag.",
          state: {
            slots: buildSlots(model.values),
            buckets: buildBuckets(model.indexOf),
            activeOp: `remove(${val})`,
            counter: { label: "values", value: model.values.length },
            note: { text: `cleanly removed ${val}`, tone: "teal" },
          },
        });
      }

      const removed = model.remove(val);
      outputs.push(String(removed));

      frames.push({
        scene,
        codeLine: removed ? 11 : 9,
        caption: removed
          ? `Removed ${val} by swapping tail chair and popping end.`
          : `Remove ${val} failed: value not found in chairs.`,
        state: {
          slots: buildSlots(model.values),
          buckets: buildBuckets(model.indexOf),
          activeOp: `remove(${val}) ➔ ${removed}`,
          counter: { label: "values", value: model.values.length },
          note: { text: removed ? `removed ${val}` : "not found", tone: removed ? "teal" : "accent" },
        },
      });
    } else if (op === "getRandom") {
      const picked = model.getRandom();
      outputs.push(String(picked));

      frames.push({
        scene,
        codeLine: 20,
        caption: `Picked random chair: returned ${picked} in O(1) time.`,
        state: {
          slots: buildSlots(model.values, picked),
          buckets: buildBuckets(model.indexOf),
          activeOp: `getRandom() ➔ ${picked}`,
          counter: { label: "random pick", value: picked },
          note: { text: `random pick ${picked}`, tone: "accent" },
        },
      });
    }
  }

  frames.push({
    scene,
    codeLine: 20,
    caption: `All operations executed on the numbered chairs. The answer is ${JSON.stringify(outputs)}.`,
    state: {
      slots: buildSlots(model.values),
      buckets: buildBuckets(model.indexOf),
      counter: { label: "final count", value: model.values.length },
      note: { text: "operations complete", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 20,
    caption: "Time: O(1). Array indexing and hash map tag lookups run in constant average time.",
    state: {
      slots: buildSlots(model.values),
      buckets: buildBuckets(model.indexOf),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 20,
    caption: "Space: O(n). Array and map store n elements with no extra overhead.",
    state: {
      slots: buildSlots(model.values),
      buckets: buildBuckets(model.indexOf),
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
    question: "How does RandomizedSet delete an element in O(1) time without leaving empty gaps?",
    options: [
      "swaps the target element with the last array element, updates the map, and pops the tail",
      "shifts all elements to the left by one position",
    ],
    answer: 0,
    why: "Popping the tail takes O(1) time. Swapping the last element into the target seat keeps the array dense.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "Why can't a hash set alone support getRandom() in O(1) time?",
    options: [
      "a hash set has no contiguous numerical indices to pick a random slot with uniform probability",
      "hash set elements are stored in descending numerical order",
    ],
    answer: 0,
    why: "Hash tables have sparse internal buckets, making uniform random selection without scanning impossible.",
  };

  frames.push({
    scene,
    caption: "When designing RandomizedSet, imagine numbered chairs paired with a map index tag shelf.",
    state: {
      slots: [],
      buckets: buildBuckets(empty),
      note: { text: "numbered chairs with map tags", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Never update map tags if the target is already the tail element: check last != val.",
    state: {
      slots: [],
      buckets: buildBuckets(empty),
      note: { text: "check last != val", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Swapping with the tail keeps the array dense so uniform random picks stay O(1).",
    state: {
      slots: [],
      buckets: buildBuckets(empty),
      note: { text: "dense array for random pick", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the swapping numbered chairs: keep array dense with tail swaps, map indices, and pick in O(1).",
    state: {
      slots: [],
      buckets: buildBuckets(empty),
      note: { text: "randomized set ready", tone: "teal" },
    },
  });

  return frames;
}

export const insertDeleteGetrandomStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-380"],
  pattern: "Array with map index",
  trigger: "collection with insert, delete, and getRandom all running in average O(1) time",
  insight: "Store values in a dense list for O(1) random indexing, and track their list indices in a map. To delete in O(1) time without shifting, swap the target with the last element and pop the tail.",
  metaphor: {
    name: "The swapping numbered chairs",
    legend: "chair = array slot · tag = map index entry · last chair = tail element · swap = constant time delete",
    terms: ["chair", "tag", "swap", "tail", "slot", "index", "dense", "seat", "array", "map"],
  },
  traps: [{ name: TRAP, rule: "When removing an element, do not re-insert into the map if the last element is the target itself." }],
  template: [
    "class RandomizedSet:",
    "    boolean insert(int val): add to list tail, record index in map",
    "    boolean remove(int val): swap with list tail, update map, pop tail",
    "    int getRandom(): return list.get(random index)",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(1)",
    timeWhy: "map lookups and end-of-list removals both run in constant time",
    space: "O(n)",
    spaceWhy: "the dynamic array and index map store n elements",
  },
  code: CODE,
  examples: [
    {
      label: "insert and getRandom sequence",
      input: '["RandomizedSet","insert","remove","insert","getRandom","remove","insert","getRandom"]  [[],[1],[2],[2],[],[1],[2],[]]',
      expected: '["true","false","true","2","true","false","2"]',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-146", title: "LRU Cache" },
    { slug: "lc-706", title: "Design HashMap" },
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
