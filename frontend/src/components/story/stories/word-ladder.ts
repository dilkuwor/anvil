import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = 'beginWord="a", endWord="c", wordList=["a","b","c"]';
const TRAP = "The Linear Dictionary Scan Trap";

const CODE = [
  "public int ladderLength(String beginWord, String endWord, List<String> wordList) {",
  "    Set<String> dict = new HashSet<>(wordList);",
  "    if (!dict.contains(endWord)) return 0;",
  "    Queue<String> queue = new ArrayDeque<>();",
  "    queue.add(beginWord);",
  "    Set<String> visited = new HashSet<>();",
  "    visited.add(beginWord);",
  "    int level = 1;",
  "    while (!queue.isEmpty()) {",
  "        int size = queue.size();",
  "        for (int i = 0; i < size; i++) {",
  "            String curr = queue.poll();",
  "            if (curr.equals(endWord)) return level;",
  "            char[] chars = curr.toCharArray();",
  "            for (int j = 0; j < chars.length; j++) {",
  "                char orig = chars[j];",
  "                for (char c = 'a'; c <= 'z'; c++) {",
  "                    chars[j] = c;",
  "                    String next = new String(chars);",
  "                    if (dict.contains(next) && visited.add(next)) {",
  "                        queue.add(next);",
  "                    }",
  "                }",
  "                chars[j] = orig;",
  "            }",
  "        }",
  "        level++;",
  "    }",
  "    return 0;",
  "}",
];

type WordLadderInput = {
  beginWord: string;
  endWord: string;
  wordList: string[];
};

function parseInput(input: string): WordLadderInput {
  try {
    const beginMatch = input.match(/beginWord\s*=\s*"([^"]+)"/);
    const endMatch = input.match(/endWord\s*=\s*"([^"]+)"/);
    const listMatch = input.match(/wordList\s*=\s*(\[[^\]]+\])/);
    if (beginMatch && endMatch && listMatch) {
      return {
        beginWord: beginMatch[1],
        endWord: endMatch[1],
        wordList: JSON.parse(listMatch[1]) as string[],
      };
    }
  } catch {
    // fallback
  }
  return {
    beginWord: "hit",
    endWord: "cog",
    wordList: ["hot", "dot", "dog", "lot", "log", "cog"],
  };
}

function solveLadder(data: WordLadderInput): number {
  const { beginWord, endWord, wordList } = data;
  const dict = new Set(wordList);
  if (!dict.has(endWord)) return 0;
  const queue: [string, number][] = [[beginWord, 1]];
  const visited = new Set<string>([beginWord]);

  while (queue.length > 0) {
    const [curr, level] = queue.shift()!;
    if (curr === endWord) return level;
    for (let i = 0; i < curr.length; i++) {
      for (let c = 97; c <= 122; c++) {
        const next = curr.slice(0, i) + String.fromCharCode(c) + curr.slice(i + 1);
        if (dict.has(next) && !visited.has(next)) {
          visited.add(next);
          queue.push([next, level + 1]);
        }
      }
    }
  }
  return 0;
}

function answerText(input: string): string {
  const data = parseInput(input);
  return String(solveLadder(data));
}

function buildSlots(levels: Map<string, number>, activeWord?: string): DesignSlot[] {
  const slots: DesignSlot[] = [];
  let id = 0;
  for (const [w, lvl] of levels.entries()) {
    slots.push({
      id: ++id,
      key: `Stone "${w}"`,
      val: `step ${lvl}`,
      sub: `distance from start: ${lvl}`,
      tone: w === activeWord ? "edge" : "hit",
    });
  }
  return slots;
}

function buildBuckets(frontier: string[], dict: string[], visited: Set<string>): DesignBucket[] {
  return [
    {
      id: 1,
      label: "Current Step Frontier",
      items: frontier.map((w) => ({ text: `Word "${w}"`, tone: "hit" as const })),
      tone: frontier.length > 0 ? "hit" : "idle",
    },
    {
      id: 2,
      label: "Remaining River Stones",
      items: dict
        .filter((w) => !visited.has(w))
        .map((w) => ({ text: `Stone "${w}"`, tone: "idle" as const })),
      tone: "idle",
    },
  ];
}

function pictureFrames(): Frame[] {
  const dummy = new Map<string, number>([["hit", 1]]);
  return [
    {
      scene: "picture",
      caption: "We want to cross a river of words from begin word to end word, changing exactly one letter per step.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["hit"], ["hot", "dot", "dog", "lot", "log", "cog"], new Set(["hit"])),
        counter: { label: "start stone", value: "hit" },
        note: { text: "word stepping stones", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "Every word in the river represents a stepping stone: we can only leap to stones that exist in the dictionary.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["hot"], ["dot", "dog", "lot", "log", "cog"], new Set(["hit", "hot"])),
        counter: { label: "step distance", value: 2 },
        note: { text: "dictionary river stones", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "We seek the shortest bridge of stepping stones from begin word to end word, counting total words in the sequence.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["cog"], [], new Set(["hit", "hot", "dot", "dog", "cog"])),
        counter: { label: "target reached", value: 5 },
        note: { text: "shortest stone ladder", tone: "accent" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const dummy = new Map<string, number>([["hit", 1]]);
  return [
    {
      scene: "slow",
      caption: "The slow way compares the current word against every single word in the dictionary to find matches.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["hit"], ["hot", "dot", "dog"], new Set(["hit"])),
        counter: { label: "scan overhead", value: "O(N² × L)" },
        note: { text: "linear dictionary scan", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "When the dictionary holds thousands of words, scanning the entire list for every single step is very slow.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["hit"], ["hot"], new Set(["hit"])),
        counter: { label: "dictionary scans", value: "thousands" },
        note: { text: "slow list iteration", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Mutating each character across 26 letters and checking a hash set runs in fast time independent of list size.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["hot"], [], new Set(["hit", "hot"])),
        counter: { label: "hash check", value: "26 × L" },
        note: { text: "constant time mutations", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const dummy = new Map<string, number>([["hit", 1]]);
  return [
    {
      scene: "insight",
      caption: "Breadth-first search explores stepping stones layer by layer: the first time we touch the target word is optimal.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["hit"], ["hot", "dot"], new Set(["hit"])),
        counter: { label: "layer search", value: "breadth-first" },
        note: { text: "level by level exploration", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "Swapping each position through 'a' to 'z' generates all candidate stones, looking each up in O(1) time.",
      state: {
        slots: buildSlots(dummy),
        buckets: buildBuckets(["hot"], ["dot"], new Set(["hit", "hot"])),
        counter: { label: "alphabet swaps", value: "26 letters" },
        note: { text: "instant dictionary lookup", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(data: WordLadderInput): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const { beginWord, endWord, wordList } = data;
  const dict = new Set(wordList);
  let askedTrap = false;

  const levels = new Map<string, number>([[beginWord, 1]]);
  const visited = new Set<string>([beginWord]);
  const queue: [string, number][] = [[beginWord, 1]];

  frames.push({
    scene,
    codeLine: 1,
    caption: `Stored ${dict.size} stepping stones in a hash dictionary. Begin word "${beginWord}" starts at step 1.`,
    state: {
      slots: buildSlots(levels),
      buckets: buildBuckets([beginWord], wordList, visited),
      counter: { label: "ladder step", value: 1 },
      note: { text: "search seeded at beginWord", tone: "accent" },
    },
  });

  let foundLevel = 0;

  while (queue.length > 0) {
    const [curr, level] = queue.shift()!;

    if (curr === endWord) {
      foundLevel = level;
      break;
    }

    for (let i = 0; i < curr.length; i++) {
      if (!askedTrap && level === 1) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: "When seeking adjacent stones from 'hit', why do we mutate 26 letters rather than scanning the dictionary?",
          options: [
            "mutating length 3 words takes 3 times 26 hash checks, which is far faster than scanning 5,000 words",
            "scanning the dictionary alters word letter order",
          ],
          answer: 0,
          why: "Checking 26 letter substitutions against a hash set runs in constant time relative to dictionary size.",
        };

        frames.push({
          scene,
          codeLine: 15,
          caption: "Watch for the linear dictionary scan trap: mutate 26 alphabet letters instead of scanning the full list.",
          state: {
            slots: buildSlots(levels, curr),
            buckets: buildBuckets([curr], wordList, visited),
            activeOp: `mutate("${curr}")`,
            counter: { label: "ladder step", value: level },
            note: { text: "linear dictionary scan trap alert", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 18,
          caption: `Swapped letter at position ${i} across 26 letters: checked valid candidates in hash dictionary.`,
          state: {
            slots: buildSlots(levels, curr),
            buckets: buildBuckets([curr], wordList, visited),
            activeOp: `swapping position ${i}`,
            counter: { label: "mutations", value: 26 },
            note: { text: "26 alphabet mutations tested", tone: "teal" },
          },
        });
      }

      for (let c = 97; c <= 122; c++) {
        const next = curr.slice(0, i) + String.fromCharCode(c) + curr.slice(i + 1);
        if (dict.has(next) && !visited.has(next)) {
          visited.add(next);
          levels.set(next, level + 1);
          queue.push([next, level + 1]);

          frames.push({
            scene,
            codeLine: 20,
            caption: `Stepped to stone "${next}" at step ${level + 1}. Added to wave queue.`,
            state: {
              slots: buildSlots(levels, next),
              buckets: buildBuckets(queue.map((q) => q[0]), wordList, visited),
              activeOp: `leap("${curr}" ➔ "${next}")`,
              counter: { label: "ladder step", value: level + 1 },
              note: { text: `stone "${next}" reached`, tone: "teal" },
            },
          });
        }
      }
    }
  }

  frames.push({
    scene,
    codeLine: 13,
    caption: `Crossed stepping stones to target word "${endWord}". The answer is ${foundLevel}.`,
    state: {
      slots: buildSlots(levels, endWord),
      buckets: buildBuckets([endWord], wordList, visited),
      counter: { label: "shortest ladder", value: foundLevel },
      note: { text: `answer is ${foundLevel}`, tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 13,
    caption: "Time: O(N × L²). Each of N words undergoes 26 letter mutations of length L tested in a hash set.",
    state: {
      slots: buildSlots(levels),
      buckets: buildBuckets([], wordList, visited),
      note: { text: "time complexity", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 13,
    caption: "Space: O(N × L). The dictionary set and search queue hold words of length L.",
    state: {
      slots: buildSlots(levels),
      buckets: buildBuckets([], wordList, visited),
      note: { text: "space complexity", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const dummy = new Map<string, number>([
    ["a", 1],
    ["c", 2],
  ]);
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why do we count words rather than transitions when calculating the ladder length?",
    options: [
      "the problem defines sequence length as the total number of words from beginWord to endWord",
      "transitions cannot be counted because letters change simultaneously",
    ],
    answer: 0,
    why: "Word Ladder requires returning the number of words in the transformation path, starting at 1 for beginWord.",
  };

  frames.push({
    scene,
    caption: "Review card: why does the ladder sequence counter begin at one rather than zero?",
    state: {
      slots: buildSlots(dummy),
      buckets: buildBuckets(["a", "c"], [], new Set(["a", "c"])),
      counter: { label: "review", value: "word count" },
      note: { text: "word sequence count review", tone: "accent" },
    },
    quiz: quiz1,
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What should ladderLength return if endWord is completely absent from wordList?",
    options: [
      "zero, because reaching the destination is impossible if it is not in the dictionary",
      "the length of wordList plus one",
    ],
    answer: 0,
    why: "If endWord is not in the dictionary, no valid path can ever end on it, returning zero.",
  };

  frames.push({
    scene,
    caption: "If the target word is missing from the dictionary, no valid ladder can exist and 0 is returned.",
    state: {
      slots: buildSlots(dummy),
      buckets: buildBuckets([], [], new Set()),
      counter: { label: "review", value: 0 },
      note: { text: "missing endWord returns 0", tone: "teal" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the word morph stepping stones: mutate 26 letters per position, and breadth-first search finds the shortest path.",
    state: {
      slots: buildSlots(dummy),
      buckets: buildBuckets([], [], new Set()),
      note: { text: "word ladder mastered", tone: "teal" },
    },
  });

  return frames;
}

export const wordLadderStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-127"],
  pattern: "Breadth-first search",
  trigger: "Find the length of the shortest transformation sequence from a begin word to an end word.",
  insight: "Transform word by word. Mutate each character of the current word through the 26 alphabet letters and test presence in the word dictionary set. Level by level breadth-first search finds the shortest ladder.",
  metaphor: {
    name: "The word morph stepping stones",
    legend: "word = stepping stone · character swap = one-letter step · river = dictionary words · bridge = shortest path to target",
    terms: ["stone", "word", "letter", "swap", "step", "river", "bridge", "queue", "ladder", "target"],
  },
  traps: [{ name: TRAP, rule: "Mutate each character across 26 letters and look up in a hash set, rather than linearly comparing against every word in the dictionary." }],
  template: [
    "class Solution:",
    "    int ladderLength(String beginWord, String endWord, List<String> wordList): bfs by mutating 26 letters, return level",
  ],
  complexity: {
    slow: "O(N² × L)",
    time: "O(N × L²)",
    timeWhy: "each of N words undergoes 26 letter mutations of length L tested in a hash set",
    space: "O(N × L)",
    spaceWhy: "the dictionary set and search queue hold words of length L",
  },
  code: CODE,
  examples: [
    {
      label: "hit to cog with 6 dictionary words",
      input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
      expected: "5",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-200", title: "Number of Islands" },
    { slug: "lc-130", title: "Surrounded Regions" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const data = parseInput(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(data),
      ...cardFrames(),
    ];
  },
  View: AgyDesignSlotsView,
};
