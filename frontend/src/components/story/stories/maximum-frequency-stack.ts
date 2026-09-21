import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = '["FreqStack","push","push","push","pop","pop"]  [[],[1],[2],[1],[],[]]';
const TRAP = "The Element Move Trap";

const CODE = [
  "class FreqStack {",
  "    private final Map<Integer, Integer> freq = new HashMap<>();",
  "    private final Map<Integer, Deque<Integer>> group = new HashMap<>();",
  "    private int maxFreq = 0;",
  "",
  "    public void push(int val) {",
  "        int f = freq.merge(val, 1, Integer::sum);",
  "        maxFreq = Math.max(maxFreq, f);",
  "        group.computeIfAbsent(f, k -> new ArrayDeque<>()).addFirst(val);",
  "    }",
  "",
  "    public int pop() {",
  "        Deque<Integer> topStack = group.get(maxFreq);",
  "        int val = topStack.pop();",
  "        freq.merge(val, -1, Integer::sum);",
  "        if (topStack.isEmpty()) {",
  "            maxFreq--;",
  "        }",
  "        return val;",
  "    }",
  "}",
];

type FreqOp = { op: string; args: number[] };

function parseOps(input: string): FreqOp[] {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const ops = JSON.parse(parts[0]) as string[];
      const args = JSON.parse(parts[1]) as number[][];
      const result: FreqOp[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] !== "FreqStack") {
          result.push({ op: ops[i], args: args[i] ?? [] });
        }
      }
      return result;
    }
  } catch {
    // fallback
  }
  return [
    { op: "push", args: [5] },
    { op: "push", args: [7] },
    { op: "push", args: [5] },
    { op: "push", args: [7] },
    { op: "push", args: [4] },
    { op: "push", args: [5] },
    { op: "pop", args: [] },
    { op: "pop", args: [] },
    { op: "pop", args: [] },
    { op: "pop", args: [] },
  ];
}

class FreqModel {
  freq = new Map<number, number>();
  group = new Map<number, number[]>();
  maxFreq = 0;

  push(val: number): void {
    const f = (this.freq.get(val) ?? 0) + 1;
    this.freq.set(val, f);
    if (f > this.maxFreq) this.maxFreq = f;
    if (!this.group.has(f)) this.group.set(f, []);
    this.group.get(f)!.push(val);
  }

  pop(): number {
    const stack = this.group.get(this.maxFreq)!;
    const val = stack.pop()!;
    const f = this.freq.get(val)! - 1;
    if (f === 0) this.freq.delete(val);
    else this.freq.set(val, f);
    if (stack.length === 0) {
      this.maxFreq--;
    }
    return val;
  }

  run(ops: FreqOp[]): (number | null)[] {
    const out: (number | null)[] = [];
    for (const { op, args } of ops) {
      if (op === "push") {
        this.push(args[0]);
        out.push(null);
      } else if (op === "pop") {
        out.push(this.pop());
      }
    }
    return out;
  }
}

function answerText(input: string): string {
  const ops = parseOps(input);
  const model = new FreqModel();
  return JSON.stringify(model.run(ops));
}

function buildSlots(freq: Map<number, number>): DesignSlot[] {
  const slots: DesignSlot[] = [];
  for (const [val, count] of freq.entries()) {
    slots.push({
      id: val,
      key: `Tenant ${val}`,
      val: `count ${count}`,
      sub: `highest floor ${count}`,
      tone: "hit",
    });
  }
  return slots;
}

function buildBuckets(group: Map<number, number[]>, maxFloor: number): DesignBucket[] {
  const buckets: DesignBucket[] = [];
  const limit = Math.max(maxFloor, 1);
  for (let f = 1; f <= limit; f++) {
    const items = group.get(f) ?? [];
    buckets.push({
      id: f,
      label: `Floor ${f} (Count ${f})`,
      items: items.map((val) => ({ text: `Tenant ${val}`, tone: f === maxFloor ? ("hit" as const) : ("idle" as const) })),
      tone: f === maxFloor && items.length > 0 ? "hit" : "idle",
    });
  }
  return buckets;
}

function pictureFrames(): Frame[] {
  return [
    {
      scene: "picture",
      caption: "We want a stack tower where pop pulls the most frequent tenant, breaking ties by newest arrival.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Floor 1 (Count 1)", items: [], tone: "idle" }],
        counter: { label: "tower state", value: "empty lobby" },
        note: { text: "apartment building floors", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "Each frequency level becomes a floor in our building. Tenants push into the floor of their current count.",
      state: {
        slots: [],
        buckets: [
          { id: 1, label: "Floor 1 (Count 1)", items: [{ text: "Tenant 5", tone: "idle" }], tone: "idle" },
          { id: 2, label: "Floor 2 (Count 2)", items: [], tone: "idle" },
        ],
        counter: { label: "floors", value: "one stack per level" },
        note: { text: "tiered floor stacks", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "The highest occupied floor is the penthouse. Popping always pulls the top tenant straight off the penthouse.",
      state: {
        slots: [],
        buckets: [
          { id: 1, label: "Floor 1 (Count 1)", items: [{ text: "Tenant 5", tone: "idle" }], tone: "idle" },
          { id: 2, label: "Floor 2 (Count 2)", items: [{ text: "Tenant 5", tone: "hit" }], tone: "hit" },
        ],
        counter: { label: "penthouse", value: "floor 2" },
        note: { text: "penthouse top pop", tone: "accent" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way puts every tenant into a priority heap with a count and a clock timestamp.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Heap Queue", items: [{ text: "(count, time, val)", tone: "idle" }], tone: "idle" }],
        counter: { label: "push / pop", value: "O(log N)" },
        note: { text: "heap priority queue", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Every push and pop sifts through the entire heap, taking logarithmic time on every operation.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Heap Queue", items: [{ text: "sifting entries", tone: "idle" }], tone: "idle" }],
        counter: { label: "overhead", value: "O(log N)" },
        note: { text: "slow heap balancing", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Organizing by building floors eliminates sifting. Pushing and popping top floor tenants takes constant time.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Floor Stacks", items: [{ text: "direct O(1) access", tone: "hit" }], tone: "hit" }],
        counter: { label: "optimal speed", value: "O(1)" },
        note: { text: "constant time floors", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  return [
    {
      scene: "insight",
      caption: "When a tenant count hits three, keep them on floor one and floor two while adding them to floor three.",
      state: {
        slots: [],
        buckets: [
          { id: 1, label: "Floor 1", items: [{ text: "Tenant 5", tone: "idle" }], tone: "idle" },
          { id: 2, label: "Floor 2", items: [{ text: "Tenant 5", tone: "idle" }], tone: "idle" },
          { id: 3, label: "Floor 3", items: [{ text: "Tenant 5", tone: "hit" }], tone: "hit" },
        ],
        counter: { label: "history", value: "preserved" },
        note: { text: "copies on lower floors", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "Popping floor three uncovers the tenant on floor two automatically. The penthouse drops by one when emptied.",
      state: {
        slots: [],
        buckets: [
          { id: 1, label: "Floor 1", items: [{ text: "Tenant 5", tone: "idle" }], tone: "idle" },
          { id: 2, label: "Floor 2", items: [{ text: "Tenant 5", tone: "hit" }], tone: "hit" },
        ],
        counter: { label: "penthouse floor", value: 2 },
        note: { text: "penthouse steps down", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(ops: FreqOp[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const model = new FreqModel();
  const outputs: (number | null)[] = [];
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 1,
    caption: "Set up frequency counts map and floor stacks map. Penthouse floor starts at the ground lobby.",
    state: {
      slots: [],
      buckets: buildBuckets(model.group, model.maxFreq),
      counter: { label: "penthouse floor", value: 0 },
      note: { text: "stack tower ready", tone: "accent" },
    },
  });

  for (const { op, args } of ops) {
    if (op === "push") {
      const val = args[0];
      const prevFreq = model.freq.get(val) ?? 0;

      if (!askedTrap && prevFreq >= 1) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `When tenant ${val} reaches frequency count 2, what should happen to its earlier record?`,
          options: [
            "leave the tenant on floor 1 and push a new entry onto floor 2",
            "remove the tenant from floor 1 before placing it on floor 2",
          ],
          answer: 0,
          why: "Leaving entries on lower floors preserves arrival order when top floors are popped later.",
        };

        frames.push({
          scene,
          codeLine: 8,
          caption: "Watch for the element move trap: keep a copy on each lower floor instead of moving the tenant up.",
          state: {
            slots: buildSlots(model.freq),
            buckets: buildBuckets(model.group, model.maxFreq),
            activeOp: `push(${val})`,
            counter: { label: "penthouse floor", value: model.maxFreq },
            note: { text: "element move trap alert", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        model.push(val);
        outputs.push(null);

        frames.push({
          scene,
          codeLine: 8,
          caption: `Tenant ${val} now stands on floor ${model.maxFreq} while remaining safely on lower floors.`,
          state: {
            slots: buildSlots(model.freq),
            buckets: buildBuckets(model.group, model.maxFreq),
            activeOp: `push(${val})`,
            counter: { label: "penthouse floor", value: model.maxFreq },
            note: { text: `tenant ${val} on floor ${model.maxFreq}`, tone: "teal" },
          },
        });
        continue;
      }

      model.push(val);
      outputs.push(null);
      const f = model.freq.get(val)!;

      frames.push({
        scene,
        codeLine: 8,
        caption: `Pushed tenant ${val}. It enters floor ${f} stack, raising penthouse floor to ${model.maxFreq}.`,
        state: {
          slots: buildSlots(model.freq),
          buckets: buildBuckets(model.group, model.maxFreq),
          activeOp: `push(${val})`,
          counter: { label: "penthouse floor", value: model.maxFreq },
          note: { text: `pushed ${val} to floor ${f}`, tone: "accent" },
        },
      });
    } else if (op === "pop") {
      const popped = model.pop();
      outputs.push(popped);

      frames.push({
        scene,
        codeLine: 18,
        caption: `Popped tenant ${popped} from the penthouse floor stack. Penthouse is now floor ${model.maxFreq}.`,
        state: {
          slots: buildSlots(model.freq),
          buckets: buildBuckets(model.group, model.maxFreq),
          activeOp: `pop() ➔ ${popped}`,
          counter: { label: "penthouse floor", value: model.maxFreq },
          note: { text: `popped tenant ${popped}`, tone: "teal" },
        },
      });
    }
  }

  frames.push({
    scene,
    codeLine: 18,
    caption: `All stack tower operations completed. The answer is ${JSON.stringify(outputs)}.`,
    state: {
      slots: buildSlots(model.freq),
      buckets: buildBuckets(model.group, model.maxFreq),
      counter: { label: "penthouse floor", value: model.maxFreq },
      note: { text: "all operations finished", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 18,
    caption: "Time: O(1). Each push and pop touches only hash maps and stack tops in constant time.",
    state: {
      slots: buildSlots(model.freq),
      buckets: buildBuckets(model.group, model.maxFreq),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 18,
    caption: "Space: O(N). Memory holds at most N pushed tenant entries across all floor stacks.",
    state: {
      slots: buildSlots(model.freq),
      buckets: buildBuckets(model.group, model.maxFreq),
      note: { text: "space complexity", tone: "accent" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why do we keep copies of a tenant on lower floors when pushing to a higher floor?",
    options: [
      "so earlier appearances remain intact when upper floor stacks are popped",
      "to duplicate data and double the tower building capacity",
    ],
    answer: 0,
    why: "Preserving copies on each level means popping the top floor reveals the earlier appearance naturally.",
  };

  frames.push({
    scene,
    caption: "Review card: how do tiered floor stacks keep track of frequency and arrival order?",
    state: {
      slots: [],
      buckets: [{ id: 1, label: "Floor 1", items: [{ text: "Tenant 5", tone: "idle" }], tone: "idle" }],
      counter: { label: "review", value: "tower architecture" },
      note: { text: "frequency stack review", tone: "accent" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "When the penthouse floor stack becomes empty after a pop, how far does the penthouse drop?",
    options: [
      "it drops by exactly one floor because each pop removes only one occurrence",
      "it resets all the way back down to the ground lobby floor",
    ],
    answer: 0,
    why: "Since each pop takes only one item, the maximum count drops by at most one.",
  };

  frames.push({
    scene,
    caption: "When the top floor clears out, the penthouse drops down by one level.",
    state: {
      slots: [],
      buckets: [{ id: 1, label: "Floor 1", items: [{ text: "Tenant 5", tone: "hit" }], tone: "hit" }],
      counter: { label: "review", value: "penthouse step down" },
      note: { text: "penthouse drops by one", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the apartment building floors: push into the count floor, pop from the penthouse, and never move old copies.",
    state: {
      slots: [],
      buckets: [{ id: 1, label: "Floor Stacks", items: [], tone: "idle" }],
      note: { text: "frequency tower mastered", tone: "accent" },
    },
  });

  return frames;
}

export const maximumFrequencyStackStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-895"],
  pattern: "Frequency stack",
  trigger: "stack that pops the most frequent element, breaking ties by recency",
  insight: "Group elements into stacks indexed by frequency. Keep copies in each lower stack so pop removes only the top layer, updating the maximum frequency.",
  metaphor: {
    name: "The apartment building floors",
    legend: "floor = frequency stack · tenant = pushed number · penthouse = highest occupied floor · lobby = ground floor",
    terms: ["floor", "tenant", "penthouse", "lobby", "stack", "tier", "frequency", "pop", "push", "tower"],
  },
  traps: [{ name: TRAP, rule: "Keep copies across all lower frequency stacks so popping an element preserves its earlier appearances." }],
  template: [
    "class FreqStack:",
    "    void push(int val): update val count, push to floor corresponding to new count",
    "    int pop(): pop from penthouse floor, update count, lower penthouse if floor is empty",
  ],
  complexity: {
    slow: "O(log N)",
    time: "O(1)",
    timeWhy: "each push and pop touches only hash maps and stack tops in constant time",
    space: "O(N)",
    spaceWhy: "every pushed element resides across at most N frequency tiers",
  },
  code: CODE,
  examples: [
    {
      label: "pushes and pops",
      input: '["FreqStack","push","push","push","push","push","push","pop","pop","pop","pop"]  [[],[5],[7],[5],[7],[4],[5],[],[],[],[]]',
      expected: "[null,null,null,null,null,null,5,7,5,4]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-155", title: "Min Stack" },
    { slug: "lc-380", title: "Insert Delete GetRandom O(1)" },
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
