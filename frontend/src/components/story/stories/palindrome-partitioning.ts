import {
  AgyChoicesTreeView,
  ChoiceWalk,
  listText,
  nextForkQuiz,
  stepBackQuiz,
  type ChoiceStrip,
  type ChoiceTreeState,
} from "../agy-choices-tree-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ChoiceTreeState>;

const PRACTICE = "\"aba\"";
const TRAP = "The Shared Bag Trap";

const CODE = [
  "List<List<String>> partition(String s) {",
  "    List<List<String>> out = new ArrayList<>();",
  "    build(s, 0, new ArrayList<>(), out);",
  "    return out;",
  "}",
  "",
  "void build(String s, int start, List<String> path, List<List<String>> out) {",
  "    if (start == s.length()) {",
  "        out.add(new ArrayList<>(path));",
  "        return;",
  "    }",
  "    for (int end = start; end < s.length(); end++) {",
  "        if (isPalindrome(s, start, end)) {",
  "            path.add(s.substring(start, end + 1));",
  "            build(s, end + 1, path, out);",
  "            path.remove(path.size() - 1);",
  "        }",
  "    }",
  "}",
  "",
  "boolean isPalindrome(String s, int l, int r) {",
  "    while (l < r) {",
  "        if (s.charAt(l++) != s.charAt(r--)) return false;",
  "    }",
  "    return true;",
  "}",
];

function parseStr(input: string): string {
  const match = input.match(/[a-zA-Z]+/);
  return match ? match[0].slice(0, 4) : "aab";
}

function isPal(s: string, l: number, r: number): boolean {
  while (l < r) {
    if (s[l++] !== s[r--]) return false;
  }
  return true;
}

function solve(s: string): string[][] {
  const out: string[][] = [];
  const build = (start: number, current: string[]) => {
    if (start === s.length) {
      out.push([...current]);
      return;
    }
    for (let end = start; end < s.length; end++) {
      if (isPal(s, start, end)) {
        build(end + 1, [...current, s.slice(start, end + 1)]);
      }
    }
  };
  build(0, []);
  return out;
}

function answerText(s: string): string {
  return JSON.stringify(solve(s));
}

function pictureFrames(s: string, walk: ChoiceWalk): Frame[] {
  const words = solve(s);
  const sample = words[0] ? `[${words[0].map((p) => `"${p}"`).join(",")}]` : "[]";
  const shelf: ChoiceStrip = {
    label: "string",
    items: s.split("").map((ch) => ({ text: ch, tone: "idle" })),
  };

  return [
    {
      scene: "picture",
      caption: `We have the string "${s}". We want to partition it into slices where every slice is a palindrome.`,
      state: walk.plain([], { shelf }),
    },
    {
      scene: "picture",
      caption: `For example, ${sample} is valid because each slice reads identically forwards and backwards.`,
      state: walk.plain([{ label: "sample", items: [{ text: sample, tone: "done" }] }], { shelf }),
    },
    {
      scene: "picture",
      caption: `The goal: collect all ${words.length} valid palindrome partitionings in the notebook.`,
      state: walk.plain(
        [{ label: "all partitions", items: words.slice(0, 3).map((p) => ({ text: `[${p.join(",")}]`, tone: "hit" })) }],
        { shelf },
      ),
    },
  ];
}

function slowFrames(s: string, walk: ChoiceWalk): Frame[] {
  const totalCuts = Math.pow(2, Math.max(0, s.length - 1));
  const valid = solve(s).length;
  return [
    {
      scene: "slow",
      caption: `The slow way generates all 2^(n-1) possible cut combinations across "${s}", then verifies each slice.`,
      state: walk.plain([], { counter: { label: "partitions tried", value: totalCuts } }),
    },
    {
      scene: "slow",
      caption: `Testing non-palindrome prefixes wastes time. Only ${valid} cuts produce all palindromes.`,
      state: walk.plain([], { counter: { label: "valid partitions", value: valid } }),
    },
    {
      scene: "slow",
      caption: "A backtracking walker cuts only at palindrome prefixes, skipping invalid cuts immediately.",
      state: walk.plain([], { counter: null }),
    },
  ];
}

function insightFrames(s: string, walk: ChoiceWalk): Frame[] {
  return [
    {
      scene: "insight",
      caption: `From the current start index, look at each prefix. If it is a palindrome, cut that slice into the bag.`,
      state: walk.plain([], { note: { text: "cut palindrome prefix", tone: "accent" } }),
    },
    {
      scene: "insight",
      caption: "Recurse on the rest of the string. When returning, un-choose the slice so the next cut can be tried.",
      state: walk.plain([], { note: { text: "recurse and un-choose", tone: "teal" } }),
    },
  ];
}

function solutionFrames(s: string): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];

  const shelfFn = (w: ChoiceWalk): ChoiceStrip => ({
    label: "cuts",
    items: [
      { text: `slices: ${w.bag.length}`, tone: "edge" },
      { text: `rem: ${s.slice(w.bag.join("").length)}`, tone: "idle" },
    ],
  });

  const walk = new ChoiceWalk(shelfFn);

  frames.push({
    scene,
    codeLine: 1,
    caption: `We want all palindrome partitions of "${s}". The walker starts with an empty bag.`,
    state: walk.snap(),
  });

  frames.push({
    scene,
    codeLine: 2,
    caption: "Launch recursive partitioning starting at string index 0.",
    state: walk.snap(),
  });

  let askedFork = false;
  let askedBack = false;
  let shownTrap = false;
  let foundCount = 0;

  const explore = (start: number) => {
    if (start === s.length) {
      foundCount++;
      const partitionStr = `[${walk.bag.map((x) => `"${x}"`).join(",")}]`;
      walk.write(partitionStr);

      if (!shownTrap) {
        shownTrap = true;
        frames.push({
          scene,
          codeLine: 8,
          caption: `${TRAP}: always copy the bag into the notebook. A shared reference gets cleared on un-choose.`,
          state: walk.snap({ note: { text: "copy bag to notebook", tone: "coral" } }),
        });
      }

      frames.push({
        scene,
        codeLine: 8,
        caption: `String fully covered. Write copy of bag ${partitionStr} into the notebook.`,
        state: walk.snap(),
      });
      return;
    }

    const options: string[] = [];
    for (let end = start; end < s.length; end++) {
      if (isPal(s, start, end)) {
        options.push(s.slice(start, end + 1));
      }
    }

    const forkIds = walk.forks(options);
    const detailed = foundCount < 2;

    if (detailed) {
      frames.push({
        scene,
        codeLine: 12,
        caption: `Palindrome slice forks from index ${start}: ${options.map((o) => `"${o}"`).join(" and ")}.`,
        state: walk.snap(),
      });
    }

    for (let i = 0; i < forkIds.length; i++) {
      const forkId = forkIds[i];
      const slice = options[i];

      if (detailed && !askedFork && i === 1 && start === 0) {
        askedFork = true;
        const here = walk.here;
        const preQuizState = walk.snap();
        frames.push({
          scene,
          codeLine: 12,
          caption: "Which fork does the walker try next? Click it.",
          state: preQuizState,
          quiz: nextForkQuiz(preQuizState, here, forkId),
        });
      }

      walk.choose(forkId);
      if (detailed) {
        frames.push({
          scene,
          codeLine: 13,
          caption: `The walker puts slice "${slice}" into the bag and advances.`,
          state: walk.snap(),
        });
      }

      explore(start + slice.length);

      if (detailed && !askedBack && walk.bag.length > 1) {
        askedBack = true;
        const preQuizState = walk.snap();
        const bagStr = listText(walk.bag);
        const afterStr = listText(walk.bag.slice(0, -1));
        frames.push({
          scene,
          codeLine: 15,
          caption: "The walker steps back one spot. What is in the bag after that?",
          state: preQuizState,
          quiz: stepBackQuiz(afterStr, bagStr, "[]"),
        });
      }

      const left = walk.unchoose();
      if (detailed) {
        frames.push({
          scene,
          codeLine: 15,
          caption: `Un-choose slice "${left}" from the bag and step back to try the next split.`,
          state: walk.snap(),
        });
      }
    }
  };

  explore(0);

  const results = solve(s);
  frames.push({
    scene,
    codeLine: 3,
    caption: `All palindrome partitionings found. The answer is ${JSON.stringify(results)}.`,
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 3,
    caption: "Time: O(n · 2^n). There are up to 2^(n-1) cut subsets, each copied in linear time.",
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 3,
    caption: "Space: O(n). The recursion stack and slice bag hold at most n substrings at once.",
    state: walk.finished(),
  });

  return frames;
}

function cardFrames(walk: ChoiceWalk): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why must we copy the bag with new ArrayList<>(path) when saving a partition?",
    options: [
      "Because saving path directly stores a reference whose contents get emptied on un-choose",
      "Because ArrayList is faster than other collection types",
      "Because the return type requires an immutable copy",
    ],
    answer: 0,
    why: "A single mutable list is reused across all recursive calls; without copying, every entry ends up empty.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "When does the walker decide whether to recurse on a substring?",
    options: [
      "Only when the candidate prefix is verified to be a palindrome",
      "Whenever the substring length is greater than 1",
      "After generating the full partition and testing it at the end",
    ],
    answer: 0,
    why: "Testing the palindrome prefix before branching prunes invalid partition trees immediately.",
  };

  frames.push({
    scene,
    caption: "When you see palindrome partitioning, think of a walker slicing off symmetrical prefixes.",
    state: walk.plain([], { note: { text: "symmetrical cuts", tone: "accent" } }),
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Always make a shallow copy when saving the path to the notebook to avoid empty results.",
    state: walk.plain([], { note: { text: "copy bag to notebook", tone: "teal" } }),
  });

  frames.push({
    scene,
    caption: "Prune immediately whenever a prefix is not a palindrome, avoiding wasted deeper searches.",
    state: walk.plain([], { note: { text: "prune non-palindromes", tone: "accent" } }),
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the palindrome trail: test symmetrical prefix, put in bag, recurse, and un-choose.",
    state: walk.finished(),
  });

  return frames;
}

export const palindromePartitioningStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-131"],
  pattern: "Backtracking",
  trigger: "split a string into all possible sets of palindromic substrings",
  insight: "Pick a split point whose prefix reads symmetrically. Put that slice in the bag, split the remainder, and un-choose when unwinding.",
  metaphor: {
    name: "The symmetrical slicing path",
    legend: "slice = palindrome prefix · bag = chosen slices so far · fork = split point · notebook = complete partitions",
    terms: ["walker", "bag", "fork", "notebook", "spot", "slice", "palindrome", "un-choose"],
  },
  traps: [{ name: TRAP, rule: "Always create a shallow copy new ArrayList<>(path) when saving a partition to the notebook, instead of saving the shared reference." }],
  template: [
    "void build(s, start, path, out):",
    "    if (start == s.length()) { out.add(new ArrayList<>(path)); return; }",
    "    for end from start to s.length - 1:",
    "        if isPalindrome(s, start, end):",
    "            path.add(s.substring(start, end + 1));",
    "            build(s, end + 1, path, out);",
    "            path.remove(path.size() - 1);",
  ],
  complexity: {
    slow: "O(n · 2^n)",
    time: "O(n · 2^n)",
    timeWhy: "there are up to 2^(n-1) split subsets, and copying substrings takes linear time",
    space: "O(n)",
    spaceWhy: "the recursion stack and slice bag hold at most n string elements",
  },
  code: CODE,
  examples: [
    { label: "\"aab\"", input: "\"aab\"", expected: JSON.stringify([["a", "a", "b"], ["aa", "b"]]) },
    { label: "\"a\"", input: "\"a\"", expected: JSON.stringify([["a"]]) },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-17", title: "Letter Combinations of a Phone Number" },
    { slug: "lc-22", title: "Generate Parentheses" },
    { slug: "lc-78", title: "Subsets" },
  ],
  answer: (input) => answerText(parseStr(input)),
  frames: (input) => {
    const s = parseStr(input);
    const shelfFn = () => null;
    const walk = new ChoiceWalk(shelfFn);
    return [
      ...pictureFrames(s, walk),
      ...slowFrames(s, walk),
      ...insightFrames(s, walk),
      ...solutionFrames(s),
      ...cardFrames(walk),
    ];
  },
  View: AgyChoicesTreeView,
};
