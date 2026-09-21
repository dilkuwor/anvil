import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = '["TimeMap","set","get","get"]  [[],["love","high",10],["love",5],["love",15]]';
const TRAP = "The Exact Match Trap";

const CODE = [
  "class TimeMap {",
  "    private final Map<String, List<int[]>> stamps = new HashMap<>();",
  "    private final Map<String, List<String>> texts = new HashMap<>();",
  "",
  "    public TimeMap() {}",
  "",
  "    public void set(String key, String value, int timestamp) {",
  "        stamps.computeIfAbsent(key, k -> new ArrayList<>()).add(new int[]{timestamp});",
  "        texts.computeIfAbsent(key, k -> new ArrayList<>()).add(value);",
  "    }",
  "",
  "    public String get(String key, int timestamp) {",
  "        List<int[]> history = stamps.get(key);",
  "        if (history == null) return \"\";",
  "        int low = 0;",
  "        int high = history.size();",
  "        while (low < high) {",
  "            int mid = low + (high - low) / 2;",
  "            if (history.get(mid)[0] <= timestamp) {",
  "                low = mid + 1;",
  "            } else {",
  "                high = mid;",
  "            }",
  "        }",
  "        return low == 0 ? \"\" : texts.get(key).get(low - 1);",
  "    }",
  "}",
];

type TimeOp = { op: string; key: string; val?: string; time: number };

function parseOps(input: string): TimeOp[] {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const ops = JSON.parse(parts[0]) as string[];
      const args = JSON.parse(parts[1]) as (string | number)[][];
      const result: TimeOp[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] === "set") {
          result.push({
            op: "set",
            key: String(args[i][0]),
            val: String(args[i][1]),
            time: Number(args[i][2]),
          });
        } else if (ops[i] === "get") {
          result.push({
            op: "get",
            key: String(args[i][0]),
            time: Number(args[i][1]),
          });
        }
      }
      return result;
    }
  } catch {
    // fallback
  }
  return [
    { op: "set", key: "foo", val: "bar", time: 1 },
    { op: "get", key: "foo", time: 1 },
    { op: "get", key: "foo", time: 3 },
    { op: "set", key: "foo", val: "bar2", time: 4 },
    { op: "get", key: "foo", time: 4 },
    { op: "get", key: "foo", time: 5 },
  ];
}

class TimeModel {
  stamps = new Map<string, number[]>();
  texts = new Map<string, string[]>();

  set(key: string, val: string, time: number): void {
    if (!this.stamps.has(key)) {
      this.stamps.set(key, []);
      this.texts.set(key, []);
    }
    this.stamps.get(key)!.push(time);
    this.texts.get(key)!.push(val);
  }

  get(key: string, time: number): string {
    const history = this.stamps.get(key);
    if (!history || history.length === 0) return "";
    let low = 0;
    let high = history.length;
    while (low < high) {
      const mid = Math.floor(low + (high - low) / 2);
      if (history[mid] <= time) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low === 0 ? "" : this.texts.get(key)![low - 1];
  }

  run(ops: TimeOp[]): (string | null)[] {
    const out: (string | null)[] = [];
    for (const op of ops) {
      if (op.op === "set") {
        this.set(op.key, op.val!, op.time);
        out.push(null);
      } else if (op.op === "get") {
        out.push(this.get(op.key, op.time));
      }
    }
    return out;
  }
}

function answerText(input: string): string {
  const ops = parseOps(input);
  const model = new TimeModel();
  return JSON.stringify(model.run(ops));
}

function buildSlots(texts: Map<string, string[]>, stamps: Map<string, number[]>): DesignSlot[] {
  const slots: DesignSlot[] = [];
  let id = 0;
  for (const [key, list] of texts.entries()) {
    const stampList = stamps.get(key) ?? [];
    const latestVal = list[list.length - 1];
    const latestStamp = stampList[stampList.length - 1];
    slots.push({
      id: ++id,
      key: `Key "${key}"`,
      val: `"${latestVal}"`,
      sub: `latest stamp: ${latestStamp}`,
      tone: "hit",
    });
  }
  return slots;
}

function buildBuckets(texts: Map<string, string[]>, stamps: Map<string, number[]>): DesignBucket[] {
  const buckets: DesignBucket[] = [];
  let id = 0;
  for (const [key, list] of texts.entries()) {
    const stampList = stamps.get(key) ?? [];
    const items = list.map((val, idx) => ({
      text: `stamp ${stampList[idx]} ➔ "${val}"`,
      tone: "hit" as const,
    }));
    buckets.push({
      id: ++id,
      label: `Ledger "${key}" (${list.length} pages)`,
      items,
      tone: "hit",
    });
  }
  if (buckets.length === 0) {
    buckets.push({ id: 1, label: "Empty Ledgers", items: [], tone: "idle" });
  }
  return buckets;
}

function pictureFrames(): Frame[] {
  return [
    {
      scene: "picture",
      caption: "We want a time store where keys record values with increasing stamps and queries pull past values.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Empty Ledgers", items: [], tone: "idle" }],
        counter: { label: "store", value: "TimeMap" },
        note: { text: "stamped historical ledger", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "Each key maintains a timeline ledger of stamped pages. New entries arrive with strictly increasing stamps.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Ledger foo", items: [{ text: "stamp 1 ➔ bar", tone: "hit" }], tone: "hit" }],
        counter: { label: "chronology", value: "strictly sorted" },
        note: { text: "sorted timestamp list", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "Querying a timestamp returns the newest page written at or before that moment in history.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Ledger foo", items: [{ text: "stamp 1 ➔ bar", tone: "hit" }], tone: "hit" }],
        counter: { label: "query time", value: 3 },
        note: { text: "bookmark match", tone: "accent" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way scans backward one page at a time through the ledger to find a stamp less than or equal to target.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Ledger foo", items: [{ text: "stamp 1", tone: "idle" }, { text: "stamp 4", tone: "idle" }], tone: "idle" }],
        counter: { label: "scan cost", value: "O(N)" },
        note: { text: "backward linear scan", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "When a key accumulates thousands of stamped pages, stepping backward through every entry takes linear time.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Ledger foo", items: [{ text: "pages...", tone: "idle" }], tone: "idle" }],
        counter: { label: "overhead", value: "slow search" },
        note: { text: "linear step overhead", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Because set timestamps arrive in sorted order, binary search finds the right ledger page in logarithmic time.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Ledger foo", items: [{ text: "binary search", tone: "hit" }], tone: "hit" }],
        counter: { label: "fast lookup", value: "O(log N)" },
        note: { text: "binary search on timeline", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  return [
    {
      scene: "insight",
      caption: "The timestamps for any key arrive strictly increasing, so their timeline array is already sorted for free.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Ledger foo", items: [{ text: "stamp 1", tone: "idle" }, { text: "stamp 4", tone: "idle" }], tone: "idle" }],
        counter: { label: "order", value: "pre-sorted" },
        note: { text: "append only timeline", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "We binary search for the largest stamp at or before the query stamp, reading its recorded page value.",
      state: {
        slots: [],
        buckets: [{ id: 1, label: "Ledger foo", items: [{ text: "stamp 1 ➔ bar", tone: "hit" }], tone: "hit" }],
        counter: { label: "binary search", value: "greatest <= target" },
        note: { text: "upper bound check", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(ops: TimeOp[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const model = new TimeModel();
  const outputs: (string | null)[] = [];
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 1,
    caption: "Set up stamp timeline and text record maps. Ready to stamp entries into key ledgers.",
    state: {
      slots: [],
      buckets: buildBuckets(model.texts, model.stamps),
      counter: { label: "ledgers", value: 0 },
      note: { text: "ledger store ready", tone: "accent" },
    },
  });

  for (const op of ops) {
    if (op.op === "set") {
      model.set(op.key, op.val!, op.time);
      outputs.push(null);

      frames.push({
        scene,
        codeLine: 7,
        caption: `Recorded page "${op.val}" under key "${op.key}" stamped at time ${op.time}.`,
        state: {
          slots: buildSlots(model.texts, model.stamps),
          buckets: buildBuckets(model.texts, model.stamps),
          activeOp: `set("${op.key}", "${op.val}", ${op.time})`,
          counter: { label: "stamped time", value: op.time },
          note: { text: `stamped page at ${op.time}`, tone: "accent" },
        },
      });
    } else if (op.op === "get") {
      const history = model.stamps.get(op.key) ?? [];
      const hasExact = history.includes(op.time);

      if (!askedTrap && !hasExact && history.some((t) => t <= op.time)) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `When querying timestamp ${op.time} with no exact entry, what must the ledger return?`,
          options: [
            "the latest recorded page stamped at or before the requested query time",
            "an empty string because no record has this exact stamp number",
          ],
          answer: 0,
          why: "The ledger contract requires finding the most recent record at or before the target stamp.",
        };

        frames.push({
          scene,
          codeLine: 18,
          caption: `Watch for the exact match trap: timestamp ${op.time} is absent, so find the latest earlier record.`,
          state: {
            slots: buildSlots(model.texts, model.stamps),
            buckets: buildBuckets(model.texts, model.stamps),
            activeOp: `get("${op.key}", ${op.time})`,
            counter: { label: "target stamp", value: op.time },
            note: { text: "exact match trap alert", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        const val = model.get(op.key, op.time);
        outputs.push(val);

        frames.push({
          scene,
          codeLine: 24,
          caption: `Binary search found the closest earlier record: returned page value "${val}".`,
          state: {
            slots: buildSlots(model.texts, model.stamps),
            buckets: buildBuckets(model.texts, model.stamps),
            activeOp: `get("${op.key}", ${op.time}) ➔ "${val}"`,
            counter: { label: "result", value: `"${val}"` },
            note: { text: `found earlier page "${val}"`, tone: "teal" },
          },
        });
        continue;
      }

      const val = model.get(op.key, op.time);
      outputs.push(val);

      frames.push({
        scene,
        codeLine: 24,
        caption: `Queried key "${op.key}" at stamp ${op.time}. Binary search found page "${val}".`,
        state: {
          slots: buildSlots(model.texts, model.stamps),
          buckets: buildBuckets(model.texts, model.stamps),
          activeOp: `get("${op.key}", ${op.time}) ➔ "${val}"`,
          counter: { label: "queried stamp", value: op.time },
          note: { text: `found "${val}"`, tone: "teal" },
        },
      });
    }
  }

  frames.push({
    scene,
    codeLine: 24,
    caption: `All timeline ledger operations executed. The answer is ${JSON.stringify(outputs)}.`,
    state: {
      slots: buildSlots(model.texts, model.stamps),
      buckets: buildBuckets(model.texts, model.stamps),
      counter: { label: "total ops", value: ops.length },
      note: { text: "all ledger ops finished", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 24,
    caption: "Time: O(log N). Binary search locates the highest timestamp less than or equal to target in logarithmic time.",
    state: {
      slots: buildSlots(model.texts, model.stamps),
      buckets: buildBuckets(model.texts, model.stamps),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 24,
    caption: "Space: O(N). Memory holds all historical timestamp and value pairs across all keys.",
    state: {
      slots: buildSlots(model.texts, model.stamps),
      buckets: buildBuckets(model.texts, model.stamps),
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
    question: "Why can we run binary search directly on the timestamps list without sorting it first?",
    options: [
      "each set operation arrives with a timestamp strictly greater than all earlier ones",
      "the hash map automatically keeps list items sorted in ascending order",
    ],
    answer: 0,
    why: "Timestamps are strictly increasing on insertion, so the timeline list is guaranteed to remain sorted.",
  };

  frames.push({
    scene,
    caption: "Review card: how do timeline ledgers maintain sorted order for fast binary search?",
    state: {
      slots: [],
      buckets: [{ id: 1, label: "Ledger", items: [{ text: "stamp 10", tone: "idle" }], tone: "idle" }],
      counter: { label: "review", value: "sorted arrival" },
      note: { text: "timeline order review", tone: "accent" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "If a query asks for a timestamp smaller than any recorded timestamp for that key, what is returned?",
    options: [
      "an empty string because no valid historical entry exists at or before that time",
      "the oldest available entry in the ledger regardless of its timestamp",
    ],
    answer: 0,
    why: "When no recorded stamp is less than or equal to the target time, the specification returns an empty string.",
  };

  frames.push({
    scene,
    caption: "When the requested stamp precedes all recorded entries, the ledger returns an empty string.",
    state: {
      slots: [],
      buckets: [{ id: 1, label: "Ledger", items: [{ text: "stamp 10", tone: "idle" }], tone: "idle" }],
      counter: { label: "review", value: "earlier query" },
      note: { text: "empty string fallback", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the stamped historical ledger: append incoming stamps in order, and binary search for the latest match.",
    state: {
      slots: [],
      buckets: [{ id: 1, label: "Ledgers", items: [], tone: "idle" }],
      note: { text: "time map mastered", tone: "accent" },
    },
  });

  return frames;
}

export const timeBasedKeyValueStoreStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-981"],
  pattern: "Binary search on time",
  trigger: "store key-value pairs with timestamps and retrieve value at timestamp or earlier",
  insight: "Since set timestamps arrive in increasing order, append each new timestamp to an array. On get, binary search for the largest timestamp at or before the query time.",
  metaphor: {
    name: "The stamped historical ledger",
    legend: "ledger = key timeline · page = timestamped value · stamp = timestamp integer · bookmark = binary search target",
    terms: ["ledger", "page", "stamp", "bookmark", "timeline", "entry", "history", "binary search", "query", "record"],
  },
  traps: [{ name: TRAP, rule: "Do not search only for the exact timestamp: if an exact match does not exist, return the closest earlier entry." }],
  template: [
    "class TimeMap:",
    "    void set(String key, String value, int timestamp): append timestamp and text to key timeline",
    "    String get(String key, int timestamp): binary search for greatest stamp <= timestamp, or return empty",
  ],
  complexity: {
    slow: "O(N)",
    time: "O(log N)",
    timeWhy: "binary search locates the highest timestamp less than or equal to target in logarithmic time",
    space: "O(N)",
    spaceWhy: "we store all historical timestamp and value pairs across all keys",
  },
  code: CODE,
  examples: [
    {
      label: "set and get sequence",
      input: '["TimeMap","set","get","get","set","get","get"]  [[],["foo","bar",1],["foo",1],["foo",3],["foo","bar2",4],["foo",4],["foo",5]]',
      expected: '[null,"bar","bar",null,"bar2","bar2"]',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-380", title: "Insert Delete GetRandom O(1)" },
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
