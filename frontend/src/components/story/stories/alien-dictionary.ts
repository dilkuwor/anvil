import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = '["z","x"]';
const TRAP = "The Prefix Violation Trap";

const CODE = [
  "public String alienOrder(String[] words) {",
  "    Map<Character, Set<Character>> adj = new HashMap<>();",
  "    Map<Character, Integer> inDegree = new HashMap<>();",
  "    for (String w : words) {",
  "        for (char c : w.toCharArray()) inDegree.putIfAbsent(c, 0);",
  "    }",
  "    for (int i = 0; i < words.length - 1; i++) {",
  "        String w1 = words[i], w2 = words[i + 1];",
  "        if (w1.length() > w2.length() && w1.startsWith(w2)) return \"\";",
  "        for (int j = 0; j < Math.min(w1.length(), w2.length()); j++) {",
  "            char c1 = w1.charAt(j), c2 = w2.charAt(j);",
  "            if (c1 != c2) {",
  "                adj.computeIfAbsent(c1, k -> new HashSet<>());",
  "                if (adj.get(c1).add(c2)) inDegree.put(c2, inDegree.get(c2) + 1);",
  "                break;",
  "            }",
  "        }",
  "    }",
  "    Queue<Character> queue = new ArrayDeque<>();",
  "    for (char c : inDegree.keySet()) {",
  "        if (inDegree.get(c) == 0) queue.add(c);",
  "    }",
  "    StringBuilder sb = new StringBuilder();",
  "    while (!queue.isEmpty()) {",
  "        char c = queue.poll();",
  "        sb.append(c);",
  "        for (char next : adj.getOrDefault(c, Set.of())) {",
  "            inDegree.put(next, inDegree.get(next) - 1);",
  "            if (inDegree.get(next) == 0) queue.add(next);",
  "        }",
  "    }",
  "    return sb.length() == inDegree.size() ? sb.toString() : \"\";",
  "}",
];

function parseWords(input: string): string[] {
  try {
    const raw = input.trim();
    const jsonStr = raw.startsWith("[") ? raw : raw.match(/\[[\s\S]*\]/)?.[0] ?? "";
    const parsed = JSON.parse(jsonStr) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      return parsed as string[];
    }
  } catch {
    // fallback
  }
  return ["wrt", "wrf", "er", "ett", "rftt"];
}

function solveAlienOrder(words: string[]): string {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, Set<string>>();

  for (const w of words) {
    for (const ch of w) {
      if (!inDegree.has(ch)) inDegree.set(ch, 0);
    }
  }

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (w1.length > w2.length && w1.startsWith(w2)) return "";
    for (let j = 0; j < Math.min(w1.length, w2.length); j++) {
      if (w1[j] !== w2[j]) {
        const c1 = w1[j];
        const c2 = w2[j];
        if (!adj.has(c1)) adj.set(c1, new Set());
        if (!adj.get(c1)!.has(c2)) {
          adj.get(c1)!.add(c2);
          inDegree.set(c2, inDegree.get(c2)! + 1);
        }
        break;
      }
    }
  }

  const queue: string[] = [];
  for (const [ch, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(ch);
  }

  const res: string[] = [];
  while (queue.length > 0) {
    const ch = queue.shift()!;
    res.push(ch);
    for (const next of adj.get(ch) ?? []) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  return res.length === inDegree.size ? res.join("") : "";
}

function answerText(input: string): string {
  const words = parseWords(input);
  return JSON.stringify(solveAlienOrder(words));
}

function buildSlots(inDegree: Map<string, number>, activeCh?: string): DesignSlot[] {
  const slots: DesignSlot[] = [];
  let id = 0;
  for (const [ch, deg] of inDegree.entries()) {
    slots.push({
      id: ++id,
      key: `Rune '${ch}'`,
      val: `blockers: ${deg}`,
      sub: deg === 0 ? "free to chisel" : `waits for ${deg} letters`,
      tone: ch === activeCh ? "edge" : deg === 0 ? "hit" : "idle",
    });
  }
  return slots;
}

function buildBuckets(scroll: string[], edges: [string, string][]): DesignBucket[] {
  return [
    {
      id: 1,
      label: "Chiseled Alphabet Scroll",
      items: scroll.map((ch) => ({ text: `Rune '${ch}'`, tone: "hit" as const })),
      tone: scroll.length > 0 ? "hit" : "idle",
    },
    {
      id: 2,
      label: "Rune Precedence Edges",
      items: edges.map(([a, b]) => ({ text: `'${a}' ➔ '${b}'`, tone: "hit" as const })),
      tone: edges.length > 0 ? "hit" : "idle",
    },
  ];
}

function pictureFrames(): Frame[] {
  const dummy = new Map<string, number>([
    ["w", 0],
    ["e", 1],
    ["r", 1],
    ["t", 1],
    ["f", 1],
  ]);
  return [
    {
      scene: "picture",
      caption: "Ancient stone tablets contain words sorted in an unknown alien alphabet.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets([], []),
        counter: { label: "unique runes", value: 5 },
        note: { text: "ancient rune stones", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "Comparing adjacent tablet words reveals the first differing rune, giving an order constraint.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets([], [["w", "e"]]),
        counter: { label: "chisel rule", value: "w before e" },
        note: { text: "prefix differences give order", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "We want to reconstruct the complete alphabet order scroll by sorting the rune constraints.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["w", "e", "r", "t", "f"], [["w", "e"]]),
        counter: { label: "scroll", value: "wertf" },
        note: { text: "chiseled alphabet scroll", tone: "accent" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const dummy = new Map<string, number>([
    ["w", 0],
    ["e", 1],
  ]);
  return [
    {
      scene: "slow",
      caption: "The slow way tries every permutation of letters and checks if every tablet pair satisfies the order.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets([], []),
        counter: { label: "permutations", value: "26!" },
        note: { text: "brute force permutations", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Testing factorial permutations takes impossible time even for a handful of alien letters.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets([], []),
        counter: { label: "cost", value: "factorial" },
        note: { text: "factorial time explosion", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Peeling off letters with zero blockers in order takes linear time proportional to word lengths.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["w"], []),
        counter: { label: "fast order", value: "O(C)" },
        note: { text: "peel free letters", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const dummy = new Map<string, number>([
    ["w", 0],
    ["e", 1],
    ["r", 1],
  ]);
  return [
    {
      scene: "insight",
      caption: "Only the very first differing letter between adjacent words provides a valid ordering rule.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets([], [["w", "e"]]),
        counter: { label: "first diff", value: "w ➔ e" },
        note: { text: "inspect first difference", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "Letters with 0 blockers enter the queue: as each is chiseled onto the scroll, its successors unlock.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["w"], [["w", "e"]]),
        counter: { label: "unlocked", value: "e" },
        note: { text: "peel zero blockers", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(words: string[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const inDegree = new Map<string, number>();
  const adj = new Map<string, Set<string>>();
  const edges: [string, string][] = [];
  let askedTrap = false;

  for (const w of words) {
    for (const ch of w) {
      if (!inDegree.has(ch)) inDegree.set(ch, 0);
    }
  }

  frames.push({
    scene,
    codeLine: 4,
    caption: `Identified ${inDegree.size} unique rune stones from tablet words. Blocker counts start at zero.`,
    state: {
      slots: buildSlots(inDegree),
      buckets: buildBuckets([], edges),
      counter: { label: "unique runes", value: inDegree.size },
      note: { text: "rune stones registered", tone: "accent" },
    },
  });

  // Extract edges from adjacent words
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];

    if (!askedTrap && w1.length > w2.length && w1.startsWith(w2)) {
      askedTrap = true;
      const trapQuiz: StoryQuiz = {
        kind: "choice",
        question: "If a longer tablet word precedes its own shorter prefix like 'abc' before 'ab', what must alienOrder return?",
        options: [
          "an empty string because a longer word cannot precede its prefix in sorted order",
          "the alphabet formed by ignoring the second shorter word",
        ],
        answer: 0,
        why: "In any lexicographical order, a shorter prefix must always come before a longer extension.",
      };

      frames.push({
        scene,
        codeLine: 8,
        caption: "Watch for the prefix violation trap: if a longer word comes before its prefix, return an empty string.",
        state: {
          slots: buildSlots(inDegree),
          buckets: buildBuckets([], edges),
          activeOp: `prefix check "${w1}" vs "${w2}"`,
          counter: { label: "prefix check", value: "invalid" },
          note: { text: "prefix violation trap alert", tone: "coral" },
        },
        quiz: trapQuiz,
      });

      frames.push({
        scene,
        codeLine: 8,
        caption: "Detected illegal prefix ordering on tablets: returning empty string directly.",
        state: {
          slots: buildSlots(inDegree),
          buckets: buildBuckets([], edges),
          counter: { label: "result", value: '""' },
          note: { text: "invalid tablet order", tone: "coral" },
        },
      });
      return frames;
    }

    for (let j = 0; j < Math.min(w1.length, w2.length); j++) {
      if (w1[j] !== w2[j]) {
        const c1 = w1[j];
        const c2 = w2[j];
        if (!adj.has(c1)) adj.set(c1, new Set());
        if (!adj.get(c1)!.has(c2)) {
          adj.get(c1)!.add(c2);
          inDegree.set(c2, inDegree.get(c2)! + 1);
          edges.push([c1, c2]);

          frames.push({
            scene,
            codeLine: 13,
            caption: `Compared "${w1}" and "${w2}": first difference gives rune order '${c1}' ➔ '${c2}'.`,
            state: {
              slots: buildSlots(inDegree, c1),
              buckets: buildBuckets([], edges),
              activeOp: `'${c1}' before '${c2}'`,
              counter: { label: "order rules", value: edges.length },
              note: { text: `chisel rule '${c1}' ➔ '${c2}'`, tone: "teal" },
            },
          });
        }
        break;
      }
    }
  }

  if (!askedTrap) {
    askedTrap = true;
    const trapQuiz: StoryQuiz = {
      kind: "choice",
      question: "If a longer tablet word precedes its own shorter prefix like 'abc' before 'ab', what must alienOrder return?",
      options: [
        "an empty string because a longer word cannot precede its prefix in sorted order",
        "the alphabet formed by ignoring the second shorter word",
      ],
      answer: 0,
      why: "In any lexicographical order, a shorter prefix must always come before a longer extension.",
    };

    frames.push({
      scene,
      codeLine: 8,
      caption: "Watch for the prefix violation trap: if a longer word comes before its prefix, return an empty string.",
      state: {
        slots: buildSlots(inDegree),
        buckets: buildBuckets([], edges),
        counter: { label: "prefix check", value: "valid" },
        note: { text: "prefix violation trap alert", tone: "coral" },
      },
      quiz: trapQuiz,
    });

    frames.push({
      scene,
      codeLine: 8,
      caption: "All adjacent word pairs checked: no prefix violations detected on tablets.",
      state: {
        slots: buildSlots(inDegree),
        buckets: buildBuckets([], edges),
        counter: { label: "prefix check", value: "passed" },
        note: { text: "all prefixes valid", tone: "teal" },
      },
    });
  }

  const queue: string[] = [];
  for (const [ch, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(ch);
  }

  frames.push({
    scene,
    codeLine: 20,
    caption: `Runes with zero blockers placed into queue: [${queue.join(", ")}].`,
    state: {
      slots: buildSlots(inDegree),
      buckets: buildBuckets([], edges),
      counter: { label: "ready runes", value: queue.length },
      note: { text: "zero blocker runes queued", tone: "teal" },
    },
  });

  const scroll: string[] = [];
  while (queue.length > 0) {
    const ch = queue.shift()!;
    scroll.push(ch);

    frames.push({
      scene,
      codeLine: 25,
      caption: `Chiseled rune '${ch}' onto the scroll: current alphabet order is "${scroll.join("")}".`,
      state: {
        slots: buildSlots(inDegree, ch),
        buckets: buildBuckets(scroll, edges),
        activeOp: `chisel('${ch}')`,
        counter: { label: "chiseled runes", value: scroll.length },
        note: { text: `rune '${ch}' chiseled`, tone: "teal" },
      },
    });

    for (const next of adj.get(ch) ?? []) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) {
        queue.push(next);
        frames.push({
          scene,
          codeLine: 28,
          caption: `Rune '${next}' has 0 blockers remaining: enters the ready queue.`,
          state: {
            slots: buildSlots(inDegree, next),
            buckets: buildBuckets(scroll, edges),
            counter: { label: "unlocked rune", value: inDegree.get(next)! },
            note: { text: `rune '${next}' unlocked`, tone: "teal" },
          },
        });
      }
    }
  }

  const finalOrder = scroll.length === inDegree.size ? scroll.join("") : "";

  frames.push({
    scene,
    codeLine: 31,
    caption: `Alphabet reconstruction completed. The answer is ${JSON.stringify(finalOrder)}.`,
    state: {
      slots: buildSlots(inDegree),
      buckets: buildBuckets(scroll, edges),
      counter: { label: "alphabet size", value: scroll.length },
      note: { text: `alien alphabet "${finalOrder}"`, tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 31,
    caption: "Time: O(C). We scan adjacent words of total length C and order at most 26 letters.",
    state: {
      slots: buildSlots(inDegree),
      buckets: buildBuckets(scroll, edges),
      note: { text: "time complexity", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 31,
    caption: "Space: O(1). The graph and letter blocker counts store at most 26 fixed alphabet characters.",
    state: {
      slots: buildSlots(inDegree),
      buckets: buildBuckets(scroll, edges),
      note: { text: "space complexity", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const dummy = new Map<string, number>([
    ["z", 0],
    ["x", 0],
  ]);
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "How many letters do we compare between two adjacent words to deduce order?",
    options: [
      "only the first index where the characters differ",
      "all characters that appear in both words",
    ],
    answer: 0,
    why: "Lexicographical order is decided exclusively by the first mismatching letter.",
  };

  frames.push({
    scene,
    caption: "Review card: how do adjacent words reveal relative letter precedence?",
    state: {
      slots: buildSlots(dummy),
      buckets: buildBuckets(["z", "x"], [["z", "x"]]),
      counter: { label: "review", value: "first difference" },
      note: { text: "first difference review", tone: "accent" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What happens if a cycle exists among alien letters, like a before b and b before a?",
    options: [
      "the scroll cannot reach all letters, so return an empty string",
      "choose whichever letter appeared first on the tablets",
    ],
    answer: 0,
    why: "A cycle means no valid linear ordering exists, requiring an empty string return.",
  };

  frames.push({
    scene,
    caption: "Cycles in the letter graph make ordering impossible and return an empty string.",
    state: {
      slots: buildSlots(dummy),
      buckets: buildBuckets([], []),
      counter: { label: "cycle check", value: '""' },
      note: { text: "empty string on cycle", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the ancient rune alphabet stones: extract rules on the first mismatch, and peel zero blockers.",
    state: {
      slots: buildSlots(dummy),
      buckets: buildBuckets(["z", "x"], []),
      note: { text: "alien dictionary mastered", tone: "teal" },
    },
  });

  return frames;
}

export const alienDictionaryStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-269"],
  pattern: "Topological sort",
  trigger: "Derive the order of characters in an alien language from a sorted list of words.",
  insight: "Compare adjacent words: the first differing letter tells us that character A comes before character B. Use Kahn's algorithm with blocker counts to peel off ready letters. If a longer word comes before its prefix, return empty string.",
  metaphor: {
    name: "The ancient rune alphabet stones",
    legend: "rune stone = alien letter · tablet line = sorted words · chisel edge = order constraint A ➔ B · scroll = alphabet order",
    terms: ["rune", "stone", "tablet", "chisel", "scroll", "alphabet", "letter", "blocker", "queue", "order"],
  },
  traps: [{ name: TRAP, rule: "If a longer word comes before its own prefix (like 'abc' before 'ab'), the dictionary order is invalid: return an empty string." }],
  template: [
    "class Solution:",
    "    String alienOrder(String[] words): build graph from first differences, validate prefixes, order letters",
  ],
  complexity: {
    slow: "O(C²)",
    time: "O(C)",
    timeWhy: "we scan adjacent words of total length C and order at most 26 letters",
    space: "O(1)",
    spaceWhy: "the graph and letter blocker counts store at most 26 fixed alphabet characters",
  },
  code: CODE,
  examples: [
    {
      label: "5 words with 5 letters",
      input: '["wrt","wrf","er","ett","rftt"]',
      expected: '"wertf"',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-210", title: "Course Schedule II" },
    { slug: "lc-207", title: "Course Schedule" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const words = parseWords(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(words),
      ...cardFrames(),
    ];
  },
  View: AgyDesignSlotsView,
};
