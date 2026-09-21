import {
  AgyChoicesTreeView,
  ChoiceWalk,
  type ChoiceStrip,
  type ChoiceTreeState,
} from "../agy-choices-tree-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ChoiceTreeState>;

const PRACTICE = '["Trie","insert","startsWith","search"]  [[],["cat"],["ca"],["ca"]]';
const TRAP = "The Prefix Alias Trap";

const CODE = [
  "void insert(String word) {",
  "    TrieNode node = root;",
  "    for (char c : word.toCharArray()) {",
  "        int index = c - 'a';",
  "        if (node.children[index] == null) {",
  "            node.children[index] = new TrieNode();",
  "        }",
  "        node = node.children[index];",
  "    }",
  "    node.terminal = true;",
  "}",
  "",
  "boolean search(String word) {",
  "    TrieNode node = root;",
  "    for (char c : word.toCharArray()) {",
  "        int index = c - 'a';",
  "        if (node.children[index] == null) return false;",
  "        node = node.children[index];",
  "    }",
  "    return node.terminal;",
  "}",
  "",
  "boolean startsWith(String prefix) {",
  "    TrieNode node = root;",
  "    for (char c : prefix.toCharArray()) {",
  "        int index = c - 'a';",
  "        if (node.children[index] == null) return false;",
  "        node = node.children[index];",
  "    }",
  "    return true;",
  "}",
];

type TrieOp = { op: string; arg: string };

function parseOps(input: string): TrieOp[] {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const ops = JSON.parse(parts[0]) as string[];
      const args = JSON.parse(parts[1]) as string[][];
      const result: TrieOp[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] !== "Trie") {
          result.push({ op: ops[i], arg: args[i]?.[0] ?? "" });
        }
      }
      return result;
    }
  } catch {
    // fallback
  }
  return [
    { op: "insert", arg: "apple" },
    { op: "search", arg: "apple" },
    { op: "search", arg: "app" },
    { op: "startsWith", arg: "app" },
    { op: "insert", arg: "app" },
    { op: "search", arg: "app" },
  ];
}

class TrieModel {
  words = new Set<string>();
  run(ops: TrieOp[]): string[] {
    const out: string[] = [];
    for (const { op, arg } of ops) {
      if (op === "insert") {
        this.words.add(arg);
      } else if (op === "search") {
        out.push(String(this.words.has(arg)));
      } else if (op === "startsWith") {
        let hasPrefix = false;
        for (const w of this.words) {
          if (w.startsWith(arg)) {
            hasPrefix = true;
            break;
          }
        }
        out.push(String(hasPrefix));
      }
    }
    return out;
  }
}

function answerText(input: string): string {
  const ops = parseOps(input);
  const trie = new TrieModel();
  return JSON.stringify(trie.run(ops));
}

function pictureFrames(walk: ChoiceWalk): Frame[] {
  const shelf: ChoiceStrip = {
    label: "words",
    items: [
      { text: "apple", tone: "edge" },
      { text: "app", tone: "idle" },
    ],
  };

  return [
    {
      scene: "picture",
      caption: "A Trie stores words as branching letter paths. Words sharing prefixes reuse the same root branch.",
      state: walk.plain([], { shelf }),
    },
    {
      scene: "picture",
      caption: "Each letter is one node down the alphabet trail. A terminal flag marks where complete words end.",
      state: walk.plain([], { shelf }),
    },
    {
      scene: "picture",
      caption: "The goal: support fast insert, search for exact words, and startsWith for prefixes in O(length) time.",
      state: walk.plain([], { shelf }),
    },
  ];
}

function slowFrames(walk: ChoiceWalk): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way stores words in a flat array and scans every single word to check matching prefixes.",
      state: walk.plain([], { counter: { label: "scanned words", value: 100 } }),
    },
    {
      scene: "slow",
      caption: "Scanning a long dictionary takes O(N · L) time, repeating comparisons on shared prefix letters.",
      state: walk.plain([], { counter: { label: "scanned words", value: 1000 } }),
    },
    {
      scene: "slow",
      caption: "A Trie steps down 26-way child pointers directly, taking time proportional only to word length L.",
      state: walk.plain([], { counter: null }),
    },
  ];
}

function insightFrames(walk: ChoiceWalk): Frame[] {
  return [
    {
      scene: "insight",
      caption: "On insert, walk character pointers, creating missing letter nodes. Mark the final letter terminal.",
      state: walk.plain([], { note: { text: "mark terminal = true", tone: "accent" } }),
    },
    {
      scene: "insight",
      caption: "search checks that all letters exist AND terminal is true. startsWith only checks that letters exist.",
      state: walk.plain([], { note: { text: "search vs startsWith", tone: "teal" } }),
    },
  ];
}

function solutionFrames(ops: TrieOp[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];

  const shelfFn = (w: ChoiceWalk): ChoiceStrip => ({
    label: "tree",
    items: [
      { text: `words: ${w.written.length}`, tone: "edge" },
      { text: `depth: ${w.path.length}`, tone: "idle" },
    ],
  });

  const walk = new ChoiceWalk(shelfFn);

  frames.push({
    scene,
    codeLine: 1,
    caption: "Set up the Trie with a root node having 26 empty child links.",
    state: walk.snap(),
  });

  const outputs: string[] = [];
  const inserted = new Set<string>();
  let askedAlias = false;

  for (const { op, arg } of ops) {
    if (op === "insert") {
      inserted.add(arg);
      walk.write(arg);

      let curr = 0;
      for (const ch of arg) {
        const existingKid = walk.nodes[curr].kids.find((kidId) => walk.nodes[kidId].text === ch);
        if (existingKid !== undefined) {
          curr = existingKid;
        } else {
          walk.path = [curr];
          const newForks = walk.forks([ch]);
          walk.choose(newForks[0]);
          curr = newForks[0];
        }
      }

      frames.push({
        scene,
        codeLine: 9,
        caption: `Inserted word "${arg}". Letter branch built and terminal marked true.`,
        state: walk.snap(),
      });
    } else if (op === "search") {
      const isWord = inserted.has(arg);
      outputs.push(String(isWord));

      if (!askedAlias && !isWord && arg === "app" && inserted.has("apple")) {
        askedAlias = true;
        const aliasQuiz: StoryQuiz = {
          kind: "choice",
          question: 'We reached node "p" for "app". It exists, but its terminal flag is false. What does search("app") return?',
          options: [
            "false: the path exists but terminal is not marked for this word",
            "true: all prefix characters are present in the tree",
          ],
          answer: 0,
          why: 'search requires both that the node exists and that terminal is true. "app" was never inserted.',
        };
        frames.push({
          scene,
          codeLine: 19,
          caption: `${TRAP}: prefix "app" exists on the path to "apple", but node terminal is false.`,
          state: walk.snap({ note: { text: "terminal flag check", tone: "coral" } }),
          quiz: aliasQuiz,
        });
      }

      frames.push({
        scene,
        codeLine: 19,
        caption: `search("${arg}") returned ${isWord} because terminal flag is ${isWord}.`,
        state: walk.snap({ note: { text: `search: ${isWord}`, tone: isWord ? "teal" : "coral" } }),
      });
    } else if (op === "startsWith") {
      let hasPref = false;
      for (const w of inserted) {
        if (w.startsWith(arg)) {
          hasPref = true;
          break;
        }
      }
      outputs.push(String(hasPref));

      frames.push({
        scene,
        codeLine: 27,
        caption: `startsWith("${arg}") returned ${hasPref}: all prefix letters exist on the alphabet trail.`,
        state: walk.snap({ note: { text: `startsWith: ${hasPref}`, tone: "teal" } }),
      });
    }
  }

  frames.push({
    scene,
    codeLine: 27,
    caption: `All operations executed. The answer is ${JSON.stringify(outputs)}.`,
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 27,
    caption: "Time: O(L). Each lookup or insertion inspects at most L characters down the tree.",
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 27,
    caption: "Space: O(total characters). At most 26 child pointers per node across all words.",
    state: walk.finished(),
  });

  return frames;
}

function cardFrames(walk: ChoiceWalk): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "What is the key difference between search(word) and startsWith(prefix)?",
    options: [
      "search requires node.terminal == true, while startsWith only requires the path to exist",
      "startsWith searches backwards from leaves to root",
      "search uses a hash map while startsWith uses an array",
    ],
    answer: 0,
    why: "A prefix tree node can exist as part of a longer word without representing a standalone inserted word.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What time complexity is required to insert or search a word of length L?",
    options: [
      "O(L): exactly L node transitions regardless of the number of words stored",
      "O(N * L): comparing against all N words in the dictionary",
      "O(26^L): exploring all child pointers",
    ],
    answer: 0,
    why: "Direct 26-way child indexing means each character step takes O(1), giving O(L) total time.",
  };

  frames.push({
    scene,
    caption: "When designing a Trie, think of an alphabet trail where shared prefixes overlap.",
    state: walk.plain([], { note: { text: "shared prefix tree", tone: "accent" } }),
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Never confuse search with startsWith: search requires terminal == true on the final node.",
    state: walk.plain([], { note: { text: "verify terminal flag", tone: "teal" } }),
  });

  frames.push({
    scene,
    caption: "Each letter transition takes O(1) using child arrays, making all operations O(L).",
    state: walk.plain([], { note: { text: "O(L) operations", tone: "accent" } }),
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the alphabet trail: trace letters down the tree, mark terminal, and check prefix.",
    state: walk.finished(),
  });

  return frames;
}

export const implementTrieStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-208"],
  pattern: "Trie",
  trigger: "implement a trie with insert, search, and startsWith methods",
  insight: "A Trie stores words as paths in a 26-way character tree where common prefixes share the same nodes. Step down child nodes character by character, marking the final node as terminal.",
  metaphor: {
    name: "The branching alphabet trail",
    legend: "root = tree start · fork = character branch · hit = complete word endpoint · path = search step",
    terms: ["alphabet", "trail", "fork", "prefix", "terminal", "word", "letter", "branch", "root"],
  },
  traps: [{ name: TRAP, rule: "In search, verify both that the node exists and that its terminal flag is true." }],
  template: [
    "class Trie:",
    "    void insert(String word): walk or build characters, mark terminal = true",
    "    boolean search(String word): walk characters, return node != null && node.terminal",
    "    boolean startsWith(String prefix): walk characters, return node != null",
  ],
  complexity: {
    slow: "O(N · L)",
    time: "O(L)",
    timeWhy: "each operation traces at most L character steps down the tree, independent of dictionary size",
    space: "O(total characters)",
    spaceWhy: "the prefix tree stores at most one node per unique character across all stored words",
  },
  code: CODE,
  examples: [
    {
      label: "apple",
      input: '["Trie","insert","search","search","startsWith","insert","search"]  [[],["apple"],["apple"],["app"],["app"],["app"],["app"]]',
      expected: '["true","false","true","true"]',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-211", title: "Design Add and Search Words Data Structure" },
    { slug: "lc-212", title: "Word Search II" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const ops = parseOps(input);
    const walk = new ChoiceWalk(() => null);
    return [
      ...pictureFrames(walk),
      ...slowFrames(walk),
      ...insightFrames(walk),
      ...solutionFrames(ops),
      ...cardFrames(walk),
    ];
  },
  View: AgyChoicesTreeView,
};
