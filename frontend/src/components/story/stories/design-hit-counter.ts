import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = '["HitCounter","hit","getHits","getHits"]  [[],[1],[1],[301]]';
const TRAP = "The Stale Bucket Trap";

const CODE = [
  "void hit(int timestamp) {",
  "    int slot = timestamp % 300;",
  "    if (seconds[slot] != timestamp) {",
  "        seconds[slot] = timestamp;",
  "        counts[slot] = 1;",
  "    } else {",
  "        counts[slot]++;",
  "    }",
  "}",
  "",
  "int getHits(int timestamp) {",
  "    int total = 0;",
  "    for (int i = 0; i < 300; i++) {",
  "        if (timestamp - seconds[i] < 300) {",
  "            total += counts[i];",
  "        }",
  "    }",
  "    return total;",
  "}",
];

type CounterOp = { op: string; time: number };

function parseOps(input: string): CounterOp[] {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const ops = JSON.parse(parts[0]) as string[];
      const args = JSON.parse(parts[1]) as number[][];
      const result: CounterOp[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] !== "HitCounter") {
          result.push({ op: ops[i], time: args[i]?.[0] ?? 0 });
        }
      }
      return result;
    }
  } catch {
    // fallback
  }
  return [
    { op: "hit", time: 1 },
    { op: "hit", time: 2 },
    { op: "hit", time: 3 },
    { op: "getHits", time: 4 },
    { op: "hit", time: 300 },
    { op: "getHits", time: 300 },
    { op: "getHits", time: 301 },
  ];
}

class HitCounterModel {
  seconds = new Array<number>(300).fill(0);
  counts = new Array<number>(300).fill(0);

  hit(timestamp: number) {
    const slot = timestamp % 300;
    if (this.seconds[slot] !== timestamp) {
      this.seconds[slot] = timestamp;
      this.counts[slot] = 1;
    } else {
      this.counts[slot]++;
    }
  }

  getHits(timestamp: number): number {
    let total = 0;
    for (let i = 0; i < 300; i++) {
      if (this.seconds[i] > 0 && timestamp - this.seconds[i] < 300) {
        total += this.counts[i];
      }
    }
    return total;
  }

  run(ops: CounterOp[]): (number | null)[] {
    const out: (number | null)[] = [];
    for (const { op, time } of ops) {
      if (op === "hit") {
        this.hit(time);
        out.push(null);
      } else if (op === "getHits") {
        out.push(this.getHits(time));
      }
    }
    return out;
  }
}

function answerText(input: string): string {
  const ops = parseOps(input);
  const model = new HitCounterModel();
  return JSON.stringify(model.run(ops));
}

function buildSlots(seconds: number[], counts: number[], activeSlot?: number): DesignSlot[] {
  const activeSlots: DesignSlot[] = [];
  for (let i = 0; i < 300; i++) {
    if (counts[i] > 0) {
      activeSlots.push({
        id: i,
        key: `Slot ${i}`,
        val: `${counts[i]} hits`,
        sub: `sec ${seconds[i]}`,
        tone: i === activeSlot ? "edge" : "hit",
      });
    }
  }
  return activeSlots;
}

function buildBuckets(seconds: number[], counts: number[]): DesignBucket[] {
  const active = [];
  for (let i = 0; i < 300; i++) {
    if (counts[i] > 0) {
      active.push({ text: `Slot ${i}: sec ${seconds[i]} ➔ ${counts[i]} hits`, tone: "hit" as const });
    }
  }
  return [
    {
      id: "ring",
      label: "300-Second Carousel Ring",
      items: active.slice(-4),
      tone: "hit",
    },
  ];
}

function pictureFrames(): Frame[] {
  return [
    {
      scene: "picture",
      caption: "We want to record hit events at timestamps and count total hits within the past 300 seconds.",
      state: {
        slots: [],
        buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
        counter: { label: "window", value: "300 sec" },
        note: { text: "rotating 300-second carousel", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "A 300-slot circular ring maps each second modulo 300 into a fixed bucket.",
      state: {
        slots: [],
        buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
        counter: { label: "slots", value: 300 },
        note: { text: "timestamp % 300 slots", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "Fixed bucket arrays keep memory constant and bounded, no matter how many hits arrive.",
      state: {
        slots: [],
        buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
        counter: { label: "space", value: "O(1)" },
        note: { text: "constant memory ring", tone: "teal" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way pushes every hit timestamp into a queue and pops expired entries on query.",
      state: {
        slots: [],
        buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
        counter: { label: "queue growth", value: "unbounded" },
        note: { text: "event queue overhead", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Under high traffic with millions of hits per minute, a timestamp queue exhausts memory.",
      state: {
        slots: [],
        buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
        counter: { label: "memory spike", value: "high space" },
        note: { text: "unbounded memory risk", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "A circular carousel aggregates hits by second, consuming only 300 integer slots.",
      state: {
        slots: [],
        buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
        counter: { label: "fixed slots", value: 300 },
        note: { text: "fixed 300 slots", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Each carousel slot tracks both the recorded second and the number of hits in that second.",
      state: {
        slots: [],
        buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
        note: { text: "pair second and count", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "When recycling a slot, check if its second is stale: overwrite it and reset count to 1.",
      state: {
        slots: [],
        buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
        note: { text: "reset stale slots to 1", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(ops: CounterOp[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const model = new HitCounterModel();
  const outputs: (number | null)[] = [];
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 1,
    caption: "Set up 300-slot carousel. Seconds and counts arrays ready for incoming timestamps.",
    state: {
      slots: [],
      buckets: buildBuckets(model.seconds, model.counts),
      counter: { label: "carousel slots", value: 300 },
      note: { text: "empty carousel ready", tone: "accent" },
    },
  });

  for (const { op, time } of ops) {
    if (op === "hit") {
      const slot = time % 300;
      const isStale = model.seconds[slot] !== time && model.counts[slot] > 0;

      if (isStale && !askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `Slot ${slot} holds a timestamp from an older cycle. What must we do?`,
          options: [
            "overwrite the timestamp and reset count to 1 because the old hits are stale",
            "add to the existing count to preserve historical counts",
          ],
          answer: 0,
          why: "The carousel slot was written 300 seconds ago. Failing to reset counts stale hits from past cycles.",
        };

        frames.push({
          scene,
          codeLine: 2,
          caption: `${TRAP}: slot ${slot} has stale second ${model.seconds[slot]}; reset count to 1 for new timestamp ${time}.`,
          state: {
            slots: buildSlots(model.seconds, model.counts, slot),
            buckets: buildBuckets(model.seconds, model.counts),
            activeOp: `hit(${time})`,
            counter: { label: "trap warning", value: "stale slot" },
            note: { text: "overwrite stale second", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 4,
          caption: `Overwrote slot ${slot} with second ${time} and reset count to 1.`,
          state: {
            slots: buildSlots(model.seconds, model.counts, slot),
            buckets: buildBuckets(model.seconds, model.counts),
            activeOp: `hit(${time})`,
            counter: { label: "slot updated", value: slot },
            note: { text: `reset slot ${slot} to 1`, tone: "teal" },
          },
        });
      }

      model.hit(time);
      outputs.push(null);

      frames.push({
        scene,
        codeLine: 6,
        caption: `Recorded hit at second ${time} in carousel slot ${slot}.`,
        state: {
          slots: buildSlots(model.seconds, model.counts, slot),
          buckets: buildBuckets(model.seconds, model.counts),
          activeOp: `hit(${time})`,
          counter: { label: "hit slot", value: slot },
          note: { text: `hit at sec ${time}`, tone: "accent" },
        },
      });
    } else if (op === "getHits") {
      if (!askedTrap && time >= 301) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `At second ${time}, what happens to hits recorded at or before second ${time - 300}?`,
          options: [
            "they expire because the elapsed time is 300 seconds or greater",
            "they stay active until manually deleted",
          ],
          answer: 0,
          why: "Only hits within strictly less than 300 seconds of the query time are counted.",
        };

        frames.push({
          scene,
          codeLine: 13,
          caption: `${TRAP}: hits older than 300 seconds expire; check timestamp - seconds[i] < 300.`,
          state: {
            slots: buildSlots(model.seconds, model.counts),
            buckets: buildBuckets(model.seconds, model.counts),
            activeOp: `getHits(${time})`,
            counter: { label: "trap check", value: "expired hits" },
            note: { text: "exclude expired seconds", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 14,
          caption: `Expired hits excluded. Summing only active second buckets.`,
          state: {
            slots: buildSlots(model.seconds, model.counts),
            buckets: buildBuckets(model.seconds, model.counts),
            activeOp: `getHits(${time})`,
            counter: { label: "query sec", value: time },
            note: { text: "counted active hits only", tone: "teal" },
          },
        });
      }

      const total = model.getHits(time);
      outputs.push(total);

      frames.push({
        scene,
        codeLine: 17,
        caption: `Queried hits at second ${time}: returned ${total} active hits in the 300-second window.`,
        state: {
          slots: buildSlots(model.seconds, model.counts),
          buckets: buildBuckets(model.seconds, model.counts),
          activeOp: `getHits(${time}) ➔ ${total}`,
          counter: { label: "active hits", value: total },
          note: { text: `${total} active hits`, tone: "teal" },
        },
      });
    }
  }

  frames.push({
    scene,
    codeLine: 17,
    caption: `All counter operations completed on the rotating carousel. The answer is ${JSON.stringify(outputs)}.`,
    state: {
      slots: buildSlots(model.seconds, model.counts),
      buckets: buildBuckets(model.seconds, model.counts),
      counter: { label: "total operations", value: ops.length },
      note: { text: "carousel operations complete", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 17,
    caption: "Time: O(1). Hit writes a single slot; getHits loops over exactly 300 buckets.",
    state: {
      slots: buildSlots(model.seconds, model.counts),
      buckets: buildBuckets(model.seconds, model.counts),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 17,
    caption: "Space: O(1). Memory is strictly bounded by two 300-element arrays regardless of hit volume.",
    state: {
      slots: buildSlots(model.seconds, model.counts),
      buckets: buildBuckets(model.seconds, model.counts),
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
    question: "When a hit maps to a slot holding a timestamp from an older cycle, what must we do?",
    options: [
      "overwrite the timestamp and reset the count to 1 because the old hits are stale",
      "add to the existing count to preserve historical counts",
    ],
    answer: 0,
    why: "The carousel slot was written 300 seconds ago. Failing to reset counts stale hits from past cycles.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "Why does the circular array approach have O(1) space while a queue has O(N) space?",
    options: [
      "the circular array has fixed size 300, while a queue grows with every hit event",
      "the circular array compresses timestamps using base64",
    ],
    answer: 0,
    why: "A queue stores every single hit event, while the circular array aggregates hits by second.",
  };

  frames.push({
    scene,
    caption: "When tracking events in a sliding time window, use a rotating 300-second carousel ring.",
    state: {
      slots: [],
      buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
      note: { text: "circular bucket counter", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Always overwrite stale second marks: reset slot count to 1 when a new cycle begins.",
    state: {
      slots: [],
      buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
      note: { text: "reset stale slots", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Fixed 300-slot arrays guarantee O(1) space under high traffic volume.",
    state: {
      slots: [],
      buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
      note: { text: "O(1) space guarantee", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the rotating 300-second carousel: route by modulo, reset stale slots, and sum active hits.",
    state: {
      slots: [],
      buckets: [{ id: "ring", label: "300-Second Carousel Ring", items: [], tone: "idle" }],
      note: { text: "hit counter ready", tone: "teal" },
    },
  });

  return frames;
}

export const designHitCounterStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-362"],
  pattern: "Circular bucket counter",
  trigger: "record hits at timestamps and count total hits in the past 300 seconds",
  insight: "Maintain a 300-slot circular ring of buckets modulo 300. When a hit arrives, if the slot holds a stale timestamp from an older cycle, reset it to the new second with count 1; otherwise increment.",
  metaphor: {
    name: "The rotating 300-second carousel",
    legend: "slot = circular bucket · timestamp = second mark · count = hits in that second · carousel = modulo 300 ring",
    terms: ["carousel", "slot", "bucket", "timestamp", "second", "cycle", "stale", "window", "hit", "ring"],
  },
  traps: [{ name: TRAP, rule: "Check seconds[slot] != timestamp: overwrite the timestamp and reset count to 1 if stale." }],
  template: [
    "class HitCounter:",
    "    void hit(int timestamp): slot = timestamp % 300; if stale reset to 1, else count++",
    "    int getHits(int timestamp): sum counts for slots where timestamp - seconds < 300",
  ],
  complexity: {
    slow: "O(N)",
    time: "O(1)",
    timeWhy: "hit updates a single bucket in constant time, and getHits loops over exactly 300 slots",
    space: "O(1)",
    spaceWhy: "memory is strictly bounded by two 300-element integer arrays regardless of hit volume",
  },
  code: CODE,
  examples: [
    {
      label: "hits and getHits sequence",
      input: '["HitCounter","hit","hit","hit","getHits","hit","getHits","getHits"]  [[],[1],[2],[3],[4],[300],[300],[301]]',
      expected: "[null,null,null,3,null,4,3]",
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
