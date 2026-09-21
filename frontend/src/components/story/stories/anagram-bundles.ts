import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokGroupsView, type GrokBundle, type GrokGroupsState } from "../grok-groups-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokGroupsState>;

const PRACTICE = '["aab","abb"]';

const CODE = [
  "Map<String, List<String>> map = new HashMap<>();",
  "for (String word : strs) {",
  "    int[] count = new int[26];",
  "    for (int i = 0; i < word.length(); i++) {",
  "        count[word.charAt(i) - 'a']++;",
  "    }",
  "    StringBuilder key = new StringBuilder();",
  "    for (int n : count) key.append(n).append('#');",
  "    map.computeIfAbsent(key.toString(), unused -> new ArrayList<>()).add(word);",
  "}",
  "return new ArrayList<>(map.values());",
];

function parse(raw: string): string[] {
  return [...raw.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

function signature(word: string): string {
  const count = Array.from({ length: 26 }, () => 0);
  for (const ch of word) count[ch.charCodeAt(0) - 97]++;
  return count.map((n, i) => (n ? `${String.fromCharCode(97 + i)}${n}` : "")).join("") || "∅";
}

function setKey(word: string): string {
  return [...new Set(word)].sort().join("");
}

function group(words: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const word of words) {
    const key = signature(word);
    const list = map.get(key) ?? [];
    list.push(word);
    map.set(key, list);
  }
  return map;
}

function format(words: string[]): string {
  const bundles = [...group(words).values()].map((list) => [...list].sort());
  bundles.sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify(bundles);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function bundlesOf(map: Map<string, string[]>, trapKey?: string): GrokBundle[] {
  return [...map.entries()].map(([key, words]) => ({ key, words: [...words], trap: key === trapKey }));
}

function blank(words: string[], map: Map<string, string[]> = new Map()): GrokGroupsState {
  return { words, tones: tones(words.length, () => null), here: null, signature: null, bundles: bundlesOf(map), note: null, trapNote: null, counter: null };
}

function pictureFrames(words: string[]): Frame[] {
  const map = group(words);
  const setClash = words.filter((w, i) => words.some((o, j) => j !== i && setKey(w) === setKey(o) && signature(w) !== signature(o)));
  return [
    { scene: "picture", caption: "Each box is a word. Bundle words that use the same letters the same number of times.", state: blank(words) },
    {
      scene: "picture",
      caption: `Words with the same count key belong together. There ${map.size === 1 ? "is" : "are"} ${map.size} bundle${map.size === 1 ? "" : "s"}.`,
      state: { ...blank(words, map), tones: tones(words.length, () => "done") },
    },
    setClash.length
      ? {
          scene: "picture",
          caption: `"${setClash[0]}" and a neighbour share letters but not counts. A set of letters would wrongly join them.`,
          state: { ...blank(words, map), trapNote: "same letters, different counts", tones: tones(words.length, (i) => (setClash.includes(words[i]) ? "miss" : null)) },
        }
      : {
          scene: "picture",
          caption: "Counts matter, not only which letters appear.",
          state: blank(words, map),
        },
    {
      scene: "picture",
      caption: `The goal: the bundles. Here they are ${format(words)}.`,
      state: { ...blank(words, map), note: format(words) },
    },
  ];
}

function slowFrames(words: string[]): Frame[] {
  const frames: Frame[] = [];
  const used = Array.from({ length: words.length }, () => false);
  let compares = 0;
  for (let i = 0; i < words.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    for (let j = i + 1; j < words.length; j++) {
      if (used[j]) continue;
      compares++;
      if (signature(words[j]) === signature(words[i])) used[j] = true;
    }
    if (frames.length < 3) {
      frames.push({
        scene: "slow",
        caption: i === 0 ? "The slow way: start a bundle from each unused word, then scan the rest." : `Start a new bundle from "${words[i]}" and scan later words.`,
        state: { ...blank(words), here: i, tones: tones(words.length, (k) => (k === i ? "edge" : used[k] ? "done" : null)), counter: { label: "pairs compared", value: String(compares) } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We compared ${compares} pairs. This is O(n² · k) time if k is word length.`,
    state: { ...blank(words), counter: { label: "pairs compared", value: String(compares) } },
  });
  return frames;
}

function insightFrames(words: string[]): Frame[] {
  const map = group(words);
  const clash = words.find((w, i) => words.some((o, j) => j !== i && setKey(w) === setKey(o) && signature(w) !== signature(o)));
  return [
    {
      scene: "insight",
      caption: `Picture a key made of counts. "${words[0]}" has key ${signature(words[0] ?? "")}.`,
      state: { ...blank(words, map), here: 0, signature: signature(words[0] ?? "") },
    },
    {
      scene: "insight",
      caption: "Two words go in the same bundle only when every letter count matches.",
      state: { ...blank(words, map), signature: signature(words[0] ?? "") },
    },
    {
      scene: "insight",
      caption: clash
        ? `The Letter Set Trap would join "${clash}" with a word that shares letters but not counts.`
        : "The Letter Set Trap would treat a set of letters as the key, so different counts look the same.",
      state: { ...blank(words, map), trapNote: "The Letter Set Trap" },
    },
  ];
}

function wordQuiz(words: string[], index: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  words.forEach((_, i) => {
    if (i === index) return;
    feedback[i] = i < index ? "That word is already in a bundle." : "Read the next word in the row.";
  });
  return {
    kind: "cell",
    cells: words.length,
    question: "Which word do we key next? Click that word.",
    answer: index,
    feedback,
    otherwise: "Walk the row from left to right.",
    why: "Count each word's letters, turn that row into a key, and drop the word into that bundle.",
  };
}

function setQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "Two words share the same letters. Do they belong in one bundle?",
    options: ["Yes, a set of letters is enough", "Only if every letter count matches too"],
    answer: 1,
    why: "The Letter Set Trap joins aab and abb. Counts matter: two a and one b is not one a and two b.",
  };
}

function solutionFrames(words: string[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const map = new Map<string, string[]>();
  let askedWord = false;
  let askedSet = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new list: ${JSON.stringify(words)}. You key each word.` : "Start with an empty map from a count key to a list of words.",
    codeLine: line(0),
    state: blank(words),
  });

  for (let i = 0; i < words.length; i++) {
    const look: Frame = {
      scene,
      caption: `The next word is "${words[i]}".`,
      codeLine: line(1),
      state: { ...blank(words, map), here: i, tones: tones(words.length, (k) => (k === i ? "edge" : k < i ? "faded" : null)) },
    };
    if (practice || !askedWord) {
      askedWord = true;
      look.quiz = wordQuiz(words, i);
    }
    frames.push(look);

    const key = signature(words[i]);
    const asSet = setKey(words[i]);
    const clash = [...map.entries()].some(([k, list]) => k !== key && list.some((w) => setKey(w) === asSet));
    if ((practice || !askedSet) && (clash || i > 0)) {
      askedSet = true;
      frames.push({
        scene,
        caption: "Another word is about to be keyed. Letters alone are not the key.",
        codeLine: line(7),
        quiz: setQuiz(),
        state: { ...blank(words, map), here: i, signature: key, trapNote: "The Letter Set Trap" },
      });
    }

    const list = map.get(key) ?? [];
    list.push(words[i]);
    map.set(key, list);
    frames.push({
      scene,
      caption: `Count key ${key}. Drop "${words[i]}" into that bundle.`,
      codeLine: line(8),
      state: { ...blank(words, map), here: i, signature: key, tones: tones(words.length, (k) => (k <= i ? "done" : null)) },
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${format(words)}. You keyed every word.` : `Every word is in a bundle. The answer is ${format(words)}.`,
    codeLine: line(10),
    state: { ...blank(words, map), note: format(words) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n · k). Each of the ${words.length} words is read once, plus a fixed 26-slot key.`,
      codeLine: 1,
      state: { ...blank(words, map), counter: { label: "words keyed", value: String(words.length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(n · k). The map holds every word. Each key is 26 counts.",
      codeLine: 0,
      state: { ...blank(words, map), counter: { label: "bundles", value: String(map.size) } },
    });
  }
  return frames;
}

export const anagramBundlesStory: ProblemStory<GrokGroupsState> = {
  slugs: ["anagram-bundles"],
  pattern: "Hash map",
  trigger: "group strings that are anagrams of one another",
  insight: "A count key. Two words share a bundle only when every letter count matches, not when they merely share a set of letters.",
  metaphor: { name: "The count key", legend: "key = 26 letter counts · bundle = map list · word = original string", terms: ["bundle", "key", "count", "word"] },
  traps: [
    {
      name: "The Letter Set Trap",
      rule: "Counts matter. aab is two a and one b. abb is one a and two b. A set of letters would join them.",
    },
  ],
  template: [
    "map from count-key to list of words",
    "for each word:",
    "    count a..z, turn into a key",
    "    append word to that key's list",
    "return the lists",
  ],
  complexity: {
    slow: "O(n² · k log k)",
    time: "O(n · k)",
    timeWhy: "each of the n words is read once, and building the 26-slot key is a fixed extra pass",
    space: "O(n · k)",
    spaceWhy: "the map holds every word; each key is 26 counts",
  },
  code: CODE,
  examples: [
    { label: "eat tea bat", input: '["eat","tea","bat"]', expected: '[["bat"],["eat","tea"]]' },
    { label: "aab baa", input: '["aab","baa"]', expected: '[["aab","baa"]]' },
    { label: "empty", input: '[""]', expected: '[[""]]' },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-242", title: "Valid Anagram" },
    { slug: "lc-438", title: "Find All Anagrams in a String" },
    { slug: "lc-49", title: "Group Anagrams" },
  ],
  answer: (input) => format(parse(input)),
  frames: (input) => {
    const words = parse(input);
    const map = group(words);
    return [
      ...pictureFrames(words),
      ...slowFrames(words),
      ...insightFrames(words),
      ...solutionFrames(words),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(words, map), note: format(words) },
      },
    ];
  },
  View: GrokGroupsView,
};
