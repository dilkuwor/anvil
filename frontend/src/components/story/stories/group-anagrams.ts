import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokCell, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh list. aab and ab share the letters a,b, but counts differ, so they must not share a page. */
const PRACTICE = '["aab","ba","ab"]';

const CODE = [
  "Map<String, List<String>> groups = new HashMap<>();",
  "for (String word : strs) {",
  "    char[] chars = word.toCharArray();",
  "    Arrays.sort(chars);",
  "    String key = new String(chars);",
  "    groups.computeIfAbsent(key, x -> new ArrayList<>()).add(word);",
  "}",
  "return new ArrayList<>(groups.values());",
];

function parse(raw: string): string[] {
  const quoted = [...raw.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (quoted.length) return quoted;
  return raw.replace(/[\[\]]/g, "").split(",").map((part) => part.trim()).filter(Boolean);
}

function keyOf(word: string): string {
  return [...word].sort().join("");
}

function setKey(word: string): string {
  return [...new Set(word)].sort().join("");
}

function solve(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const key = keyOf(word);
    const list = groups.get(key) ?? [];
    list.push(word);
    groups.set(key, list);
  }
  return [...groups.values()].map((group) => [...group].sort()).sort((a, b) => a.join(",").localeCompare(b.join(",")));
}

function fmt(groups: string[][]): string {
  return `[${groups.map((group) => `[${group.map((word) => word || "∅").join(",")}]`).join(",")}]`;
}

function cells(words: string[], paint: (index: number) => CellTone | null): GrokCell[] {
  return words.map((word, index) => ({
    value: word === "" ? "∅" : word,
    tone: paint(index) ?? "idle",
    caption: String(index),
  }));
}

function notebook(groups: Map<string, string[]>, hot?: string): { title: string; entries: { key: string; value: string; tone?: CellTone }[] }[] {
  return [
    {
      title: "notebook (sorted key → family)",
      entries: [...groups.entries()].map(([key, list]) => ({
        key: key || "∅",
        value: list.join(","),
        tone: key === hot ? "hit" : "idle",
      })),
    },
  ];
}

function picture(words: string[], groups: Map<string, string[]>, paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  return {
    rows: [{ cells: cells(words, paint) }],
    notebooks: notebook(groups),
    ...extra,
  };
}

function pictureFrames(words: string[], grouped: string[][]): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "Each box is a word. Words that use the same letters, with the same counts, share a family.",
      state: picture(words, new Map(), () => null),
    },
  ];
  const clash = words.findIndex((word, index) => words.some((other, j) => j !== index && setKey(word) === setKey(other) && keyOf(word) !== keyOf(other)));
  if (clash >= 0) {
    const other = words.findIndex((word, j) => j !== clash && setKey(word) === setKey(words[clash]) && keyOf(word) !== keyOf(words[clash]));
    frames.push({
      scene: "picture",
      caption: `${words[clash]} and ${words[other]} share the same letters as a set, but the counts differ, so they are not a family.`,
      state: picture(words, new Map(), (index) => (index === clash || index === other ? "miss" : null), {
        ghost: { row: 0, col: clash, label: "✕ letter set" },
      }),
    });
  }
  if (grouped[0]) {
    const family = new Set(grouped[0]);
    frames.push({
      scene: "picture",
      caption: `One allowed family is ${grouped[0].join(", ")}. The key is the sorted word.`,
      state: picture(words, new Map(), (index) => (family.has(words[index]) ? "done" : "faded")),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: bundle every family. Order of families does not matter.",
    state: picture(words, new Map(grouped.map((group) => [keyOf(group[0] ?? ""), group])), () => null),
  });
  return frames;
}

function slowFrames(words: string[]): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      checks += 1;
      if (i === 0 && j <= 2) {
        const same = keyOf(words[i]) === keyOf(words[j]);
        frames.push({
          scene: "slow",
          caption: `The slow way: compare this word with every later word. ${words[i]} and ${words[j]} ${same ? "match" : "differ"}.`,
          state: picture(words, new Map(), (index) => (index === i || index === j ? (same ? "done" : "window") : "faded"), {
            counter: { label: "pairs compared", value: checks },
          }),
        });
      }
    }
  }
  frames.push({
    scene: "slow",
    caption: `We compared ${checks} pairs on ${words.length} words. This is O(n² · k) time if each compare walks the letters.`,
    state: picture(words, new Map(), () => "faded", { counter: { label: "pairs compared", value: checks } }),
  });
  return frames;
}

function insightFrames(words: string[]): Frame[] {
  const clash = words.findIndex((word, index) => words.some((other, j) => j !== index && setKey(word) === setKey(other) && keyOf(word) !== keyOf(other)));
  const at = clash >= 0 ? clash : 0;
  return [
    {
      scene: "insight",
      caption: `Sort the letters of a word. That sorted key is the notebook page every family member shares.`,
      state: picture(words, new Map([[keyOf(words[0] ?? ""), [words[0] ?? ""]]]), (index) => (index === 0 ? "hit" : null), {
        arc: { row: 0, col: 0, notebook: 0, entry: 0, tone: "hit" },
      }),
    },
    {
      scene: "insight",
      caption:
        clash >= 0
          ? `Keying on the set of letters is the Letter-Set Trap: ${words[at]} would sit with a word that uses fewer copies.`
          : "Keying on the set of letters is the Letter-Set Trap: counts would be thrown away.",
      state: picture(words, new Map(), (index) => (index === at ? "miss" : null), {
        ghost: { row: 0, col: at, label: "✕ letter set" },
        banner: { text: "Letter-Set Trap", tone: "coral" },
      }),
    },
    {
      scene: "insight",
      caption: "The key must keep counts: the fully sorted word, not the set of letters.",
      state: picture(words, new Map([[keyOf(words[0] ?? ""), [words[0] ?? ""]]]), (index) => (index === 0 ? "done" : null)),
    },
  ];
}

function solutionFrames(words: string[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const groups = new Map<string, string[]>();
  const line = (index: number) => (practice ? undefined : index);
  let askedNew = false;
  let askedTrap = false;
  const grouped = solve(words);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new list: ${words.map((w) => w || "∅").join(", ")}. You pick the notebook page for each word.`
      : "The notebook starts empty. Each word will join the page of its sorted key.",
    codeLine: line(0),
    state: picture(words, new Map(), () => null),
  });

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const key = keyOf(word);
    const trap = words.some((other, j) => j !== i && setKey(other) === setKey(word) && keyOf(other) !== key);
    const existing = groups.has(key);

    if (!practice) {
      frames.push({
        scene,
        caption: `Sort ${word || "the empty word"} into the key "${key || "empty"}".`,
        codeLine: line(4),
        state: picture(words, new Map(groups), (index) => (index === i ? "edge" : index < i ? "faded" : null)),
      });
    }

    if (trap && (practice || !askedTrap) && !existing) {
      askedTrap = true;
      frames.push({
        scene,
        caption: `${word} uses letters ${[...new Set(word)].join(",")}. A letter-set key would collide with a different count.`,
        codeLine: line(4),
        state: picture(words, new Map(groups), (index) => (index === i ? "miss" : null), {
          ghost: { row: 0, col: i, label: "✕ letter set" },
          banner: { text: "Letter-Set Trap", tone: "coral" },
        }),
        quiz: {
          kind: "choice",
          question: "What is the notebook key for this word?",
          options: ["The set of letters", "The fully sorted word, counts kept"],
          answer: 1,
          why: "The Letter-Set Trap drops counts. The sorted word keeps every letter.",
        },
      });
    } else if (practice && !askedNew) {
      askedNew = true;
      frames.push({
        scene,
        caption: `The sorted key is "${key || "empty"}". Does this family already have a page?`,
        state: picture(words, new Map(groups), (index) => (index === i ? "edge" : null)),
        quiz: {
          kind: "choice",
          question: "Is this sorted key already in the notebook?",
          options: existing ? ["No, open a new page", "Yes, append to that family"] : ["No, open a new page", "Yes, append to that family"],
          answer: existing ? 1 : 0,
          why: existing ? "This family already has a page. Append the original word." : "A new sorted key opens a new family page.",
        },
      });
    }

    const list = groups.get(key) ?? [];
    list.push(word);
    groups.set(key, list);
    frames.push({
      scene,
      caption: existing ? `Append ${word || "∅"} to the family with key "${key || "empty"}".` : `Open a page keyed by "${key || "empty"}" and write ${word || "∅"}.`,
      codeLine: line(5),
      state: picture(words, new Map([...groups.entries()].map(([k, v]) => [k, [...v]])), (index) => (index === i ? "hit" : index < i ? "faded" : null), {
        arc: { row: 0, col: i, notebook: 0, entry: [...groups.keys()].indexOf(key), tone: "hit" },
      }),
    });
  }

  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${fmt(grouped)}. You chose every key.`
      : `Every word is on a page. The answer is ${fmt(grouped)}.`,
    codeLine: line(7),
    state: picture(words, groups, () => "done"),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n·k log k). Each of n words of length k is sorted.`,
      codeLine: 3,
      state: picture(words, groups, () => "faded", { counter: { label: "words", value: words.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(n·k). The notebook stores every word, plus a key per family.`,
      codeLine: 0,
      state: picture(words, groups, () => "faded"),
    });
  }
  return frames;
}

export const groupAnagramsStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-49"],
  pattern: "Hash map",
  trigger: "group strings that are anagrams of one another. Order of groups does not matter",
  insight: "A notebook keyed by the sorted word. Every family member shares that key. A set of letters is not enough.",
  metaphor: {
    name: "The family notebook",
    legend: "key = sorted word · family = group list · page = map entry",
    terms: ["notebook", "key", "family"],
  },
  traps: [
    {
      name: "The Letter-Set Trap",
      rule: "Do not key on the distinct letters. Counts (or the fully sorted word) must be part of the key.",
    },
  ],
  template: [
    "for each word {",
    "    key = sorted letters of word;",
    "    append word to notebook[key];",
    "}",
    "return the families;",
  ],
  complexity: {
    slow: "O(n² · k)",
    time: "O(n·k log k)",
    timeWhy: "each of n words of length k is sorted",
    space: "O(n·k)",
    spaceWhy: "the notebook stores every word, plus a key per family",
  },
  code: CODE,
  examples: [
    { label: '["eat","tea","bat"]', input: '["eat","tea","bat"]', expected: "[[bat],[eat,tea]]" },
    { label: '["aab","ab"]', input: '["aab","ab"]', expected: "[[aab],[ab]]", note: "same letters, different counts" },
    { label: '[""]', input: '[""]', expected: "[[∅]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-242", title: "Valid Anagram" },
    { slug: "lc-438", title: "Find All Anagrams in a String" },
    { slug: "anagram-bundles", title: "Anagram Bundles" },
  ],
  answer: (input) => fmt(solve(parse(input)).map((group) => group.map((w) => w || "∅"))),
  frames: (input) => {
    const words = parse(input);
    const grouped = solve(words);
    return [
      ...pictureFrames(words, grouped),
      ...slowFrames(words),
      ...insightFrames(words),
      ...solutionFrames(words),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(words, new Map(grouped.map((group) => [keyOf(group[0] === "∅" ? "" : group[0]), group])), () => "done"),
      },
    ];
  },
  View: GrokNotebookView,
};
