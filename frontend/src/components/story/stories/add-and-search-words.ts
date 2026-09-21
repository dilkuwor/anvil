import {
  AgyChoicesTreeView,
  ChoiceWalk,
  type ChoiceStrip,
  type ChoiceTreeState,
} from "../agy-choices-tree-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ChoiceTreeState>;

const PRACTICE = '["WordDictionary","addWord","addWord","search","search","search"]  [[],["bad"],["dad"],["bad"],[".ad"],["b.."]]';
const TRAP = "The Unguarded Dot Trap";

const CODE = [
  "void addWord(String word) {",
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
  "    return match(word, 0, root);",
  "}",
  "",
  "boolean match(String word, int index, TrieNode node) {",
  "    if (node == null) return false;",
  "    if (index == word.length()) return node.terminal;",
  "    char c = word.charAt(index);",
  "    if (c != '.') {",
  "        return match(word, index + 1, node.children[c - 'a']);",
  "    }",
  "    for (TrieNode child : node.children) {",
  "        if (child != null && match(word, index + 1, child)) {",
  "            return true;",
  "        }",
  "    }",
  "    return false;",
  "}",
];

type WordOp = { op: string; arg: string };

function parseOps(input: string): WordOp[] {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const ops = JSON.parse(parts[0]) as string[];
      const args = JSON.parse(parts[1]) as string[][];
      const result: WordOp[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] !== "WordDictionary") {
          result.push({ op: ops[i], arg: args[i]?.[0] ?? "" });
        }
      }
      return result;
    }
  } catch {
    // fallback
  }
  return [
    { op: "addWord", arg: "bad" },
    { op: "addWord", arg: "dad" },
    { op: "addWord", arg: "mad" },
    { op: "search", arg: "pad" },
    { op: "search", arg: ".ad" },
    { op: "search", arg: "b.." },
  ];
}

class TrieNode {
  children = new Map<string, TrieNode>();
  terminal = false;
}

class WordDictModel {
  root = new TrieNode();

  add(word: string) {
    let node = this.root;
    for (const c of word) {
      if (!node.children.has(c)) {
        node.children.set(c, new TrieNode());
      }
      node = node.children.get(c)!;
    }
    node.terminal = true;
  }

  search(word: string): boolean {
    return this.match(word, 0, this.root);
  }

  private match(word: string, index: number, node: TrieNode): boolean {
    if (index === word.length) {
      return node.terminal;
    }
    const c = word[index];
    if (c !== ".") {
      const next = node.children.get(c);
      if (!next) return false;
      return this.match(word, index + 1, next);
    }
    for (const child of node.children.values()) {
      if (this.match(word, index + 1, child)) {
        return true;
      }
    }
    return false;
  }

  run(ops: WordOp[]): string[] {
    const out: string[] = [];
    for (const { op, arg } of ops) {
      if (op === "addWord") {
        this.add(arg);
      } else if (op === "search") {
        out.push(String(this.search(arg)));
      }
    }
    return out;
  }
}

function answerText(input: string): string {
  const ops = parseOps(input);
  const model = new WordDictModel();
  return JSON.stringify(model.run(ops));
}

function pictureFrames(walk: ChoiceWalk): Frame[] {
  const shelf: ChoiceStrip = {
    label: "words",
    items: [
      { text: "bad", tone: "edge" },
      { text: "dad", tone: "idle" },
      { text: "mad", tone: "idle" },
    ],
  };

  return [
    {
      scene: "picture",
      caption: "A prefix tree stores dictionary words along shared letter branches from a single root.",
      state: walk.plain([], { shelf }),
    },
    {
      scene: "picture",
      caption: "A dot wildcard can match any single letter, branching into every valid child path.",
      state: walk.plain([], { shelf }),
    },
    {
      scene: "picture",
      caption: "We want to add words quickly and search with dots without exploring empty branches.",
      state: walk.plain([], { shelf }),
    },
  ];
}

function slowFrames(walk: ChoiceWalk): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way scans every stored word in a flat list and tests each letter one by one.",
      state: walk.plain([], { counter: { label: "scanned words", value: 100 } }),
    },
    {
      scene: "slow",
      caption: "Scanning every word takes O(N · L) time, repeating comparisons across shared prefixes.",
      state: walk.plain([], { counter: { label: "scanned words", value: 1000 } }),
    },
    {
      scene: "slow",
      caption: "A prefix tree filters non-matching prefixes immediately, testing only existing letter trails.",
      state: walk.plain([], { counter: null }),
    },
  ];
}

function insightFrames(walk: ChoiceWalk): Frame[] {
  return [
    {
      scene: "insight",
      caption: "For regular letters, follow the single child branch matching that character.",
      state: walk.plain([], { note: { text: "single letter branch", tone: "accent" } }),
    },
    {
      scene: "insight",
      caption: "For a dot wildcard, branch across all non-null children. If any branch finds the word, return true.",
      state: walk.plain([], { note: { text: "branch on dot wildcard", tone: "teal" } }),
    },
  ];
}

function solutionFrames(ops: WordOp[]): Frame[] {
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
    caption: "Set up the dictionary with an empty root node ready to sprout letter branches.",
    state: walk.snap(),
  });

  const model = new WordDictModel();
  const outputs: string[] = [];
  let askedTrap = false;

  for (const { op, arg } of ops) {
    if (op === "addWord") {
      model.add(arg);
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
        caption: `Added word "${arg}". The letter branch is built and its terminal flag is marked true.`,
        state: walk.snap(),
      });
    } else if (op === "search") {
      const isWild = arg.includes(".");

      if (isWild && !askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `Searching "${arg}" meets a dot wildcard at the root. What must we check before recursing into a child?`,
          options: [
            "check child != null so we only explore letter branches that exist",
            "check child.terminal to ensure the child is a full word already",
          ],
          answer: 0,
          why: "Most of the 26 child references are null. Checking child != null avoids visiting empty letter branches.",
        };

        frames.push({
          scene,
          codeLine: 23,
          caption: `${TRAP}: dot wildcards branch across children, but only existing child branches can match.`,
          state: walk.snap({ note: { text: "guard null children", tone: "coral" } }),
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 24,
          caption: `We guard with child != null and recurse into valid letter branches.`,
          state: walk.snap({ note: { text: "explore valid branches", tone: "teal" } }),
        });
      }

      const found = model.search(arg);
      outputs.push(String(found));
      frames.push({
        scene,
        codeLine: isWild ? 25 : 21,
        caption: `Search for word "${arg}" returned ${found}. Letter trail search complete.`,
        state: walk.snap({ note: { text: `search "${arg}": ${found}`, tone: found ? "accent" : "coral" } }),
      });
    }
  }

  frames.push({
    scene,
    codeLine: 28,
    caption: `All queries executed on the branching alphabet trail. The answer is ${JSON.stringify(outputs)}.`,
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 28,
    caption: "Time: O(L) regular, O(26^L) worst wildcard. Standard words follow one branch; wildcards fork.",
    state: walk.snap({ note: { text: "time complexity", tone: "accent" } }),
  });

  frames.push({
    scene,
    codeLine: 28,
    caption: "Space: O(total characters). At most 26 child pointers per node across all words.",
    state: walk.snap({ note: { text: "space complexity", tone: "accent" } }),
  });

  return frames;
}

function cardFrames(walk: ChoiceWalk): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "How does search handle a dot wildcard character in the query word?",
    options: [
      "it tries all 26 child branches, recursively continuing on any non-null child",
      "it matches only the root node and skips to the next character",
    ],
    answer: 0,
    why: "A dot can match any character, so we test every existing child branch.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What happens if we forget to check child != null when looping over children on a dot?",
    options: [
      "we pass null into match, leading to wasted recursive calls or null errors",
      "the trie creates missing letters automatically during search",
    ],
    answer: 0,
    why: "Most child pointers in a 26-way node are null. Checking guards against recursing on empty branches.",
  };

  frames.push({
    scene,
    caption: "When designing a wildcard dictionary, think of a branching alphabet trail with dot forks.",
    state: walk.plain([], { note: { text: "prefix tree with wildcards", tone: "accent" } }),
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Never inspect null child branches: always guard with child != null before recursing.",
    state: walk.plain([], { note: { text: "guard null children", tone: "teal" } }),
  });

  frames.push({
    scene,
    caption: "Each exact letter lookup takes O(1) time, while wildcards branch across valid child paths.",
    state: walk.plain([], { note: { text: "wildcard branching", tone: "accent" } }),
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the branching alphabet trail: trace letters, guard against null children, and branch on dots.",
    state: walk.finished(),
  });

  return frames;
}

export const designAddSearchWordsStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-211"],
  pattern: "Trie",
  trigger: "add words and search with dot '.' wildcards matching any character",
  insight: "Store words in a 26-way prefix tree. When searching, follow character links directly, and branch recursively across every child when meeting a dot wildcard.",
  metaphor: {
    name: "The branching alphabet trail",
    legend: "root = tree start · fork = character branch · wildcard = dot branch over all letters · terminal = word endpoint",
    terms: ["alphabet", "trail", "fork", "prefix", "terminal", "word", "letter", "branch", "root", "wildcard", "dot"],
  },
  traps: [{ name: TRAP, rule: "Check that child != null before launching the recursive call on a dot wildcard." }],
  template: [
    "class WordDictionary:",
    "    void addWord(String word): walk or build characters, mark terminal = true",
    "    boolean search(String word): match from root with wildcard branching on dot",
  ],
  complexity: {
    slow: "O(N · L)",
    time: "O(L) regular, O(26^L) worst wildcard",
    timeWhy: "regular lookups follow one path of length L, while wildcards branch across non-null children",
    space: "O(total characters)",
    spaceWhy: "the prefix tree stores at most one node per unique character across all stored words",
  },
  code: CODE,
  examples: [
    {
      label: "bad dad mad",
      input: '["WordDictionary","addWord","addWord","addWord","search","search","search","search"]  [[],["bad"],["dad"],["mad"],["pad"],["bad"],[".ad"],["b.."]]',
      expected: '["false","true","true","true"]',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-208", title: "Implement Trie (Prefix Tree)" },
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
