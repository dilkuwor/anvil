import {
  AgyChoicesTreeView,
  ChoiceWalk,
  listText,
  nextForkQuiz,
  stepBackQuiz,
  wordList,
  type ChoiceChip,
  type ChoiceTreeState,
} from "../agy-choices-tree-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ChoiceTreeState>;

const PRACTICE = "\"34\"";

const TRAP = "The Empty Dial Trap";

const KEYPAD: Record<string, string[]> = {
  "2": ["a", "b", "c"],
  "3": ["d", "e", "f"],
  "4": ["g", "h", "i"],
  "5": ["j", "k", "l"],
  "6": ["m", "n", "o"],
  "7": ["p", "q", "r", "s"],
  "8": ["t", "u", "v"],
  "9": ["w", "x", "y", "z"],
};

const CODE = [
  "List<String> letterCombinations(String digits) {",
  "    List<String> out = new ArrayList<>();",
  "    if (digits.isEmpty()) {",
  "        return out;",
  "    }",
  "    build(digits, 0, new StringBuilder(), out);",
  "    return out;",
  "}",
  "",
  "void build(String digits, int index, StringBuilder path, List<String> out) {",
  "    if (index == digits.length()) {",
  "        out.add(path.toString());",
  "        return;",
  "    }",
  "    String letters = KEYS[digits.charAt(index) - '0'];",
  "    for (char c : letters.toCharArray()) {",
  "        path.append(c);",
  "        build(digits, index + 1, path, out);",
  "        path.deleteCharAt(path.length() - 1);",
  "    }",
  "}",
];

function parseDigits(input: string): string {
  const match = input.match(/[2-9]+/);
  if (!match) return "";
  return match[0].slice(0, 3);
}

function solve(digits: string): string[] {
  if (digits.length === 0) return [];
  const out: string[] = [];
  const build = (index: number, current: string) => {
    if (index === digits.length) {
      out.push(current);
      return;
    }
    const letters = KEYPAD[digits[index]] ?? [];
    for (const ch of letters) {
      build(index + 1, current + ch);
    }
  };
  build(0, "");
  return out;
}

function answerText(digits: string): string {
  return JSON.stringify(solve(digits));
}

function pictureFrames(digits: string, walk: ChoiceWalk): Frame[] {
  const lettersList = digits.split("").map((d) => `digit ${d} (${(KEYPAD[d] ?? []).join("")})`);
  const sampleWords = solve(digits);
  const sample = sampleWords[0] ?? "";
  const shelf = {
    label: "digits",
    items: digits.split("").map((d): ChoiceChip => ({ text: `${d}: ${(KEYPAD[d] ?? []).join("")}`, tone: "idle" })),
  };

  return [
    {
      scene: "picture",
      caption: digits.length === 0
        ? "The dial input is empty. An empty phone string has no letters, so the list of words is empty."
        : `Each dial digit maps to phone letters: ${wordList(lettersList)}. Each step picks one letter.`,
      state: walk.plain([], { shelf }),
    },
    {
      scene: "picture",
      caption: sample
        ? `For example, taking letters in turn builds the word "${sample}". The bag holds chosen letters.`
        : "Without any digits, no letters can be chosen. The bag remains empty.",
      state: walk.plain(sample ? [{ label: "sample", items: [{ text: sample, tone: "done" }] }] : [], { shelf }),
    },
    {
      scene: "picture",
      caption: sampleWords.length > 0
        ? `The goal: list all ${sampleWords.length} combinations in the notebook. One branch per letter.`
        : "The goal: return an empty list when there are no digits.",
      state: walk.plain(
        sampleWords.length > 0
          ? [{ label: "all words", items: sampleWords.slice(0, 4).map((w) => ({ text: w, tone: "hit" })) }]
          : [],
        { shelf },
      ),
    },
  ];
}

function slowFrames(digits: string, walk: ChoiceWalk): Frame[] {
  const total = solve(digits).length;
  return [
    {
      scene: "slow",
      caption: "The slow way lists all possible letter strings and tests each one for matching dial keys.",
      state: walk.plain([], { counter: { label: "candidates tested", value: 1 } }),
    },
    {
      scene: "slow",
      caption: `Checking invalid combinations wastes time. Here there are ${total === 0 ? "0 words" : `${total} valid words`}.`,
      state: walk.plain([], { counter: { label: "candidates tested", value: Math.max(1, total * 3) } }),
    },
    {
      scene: "slow",
      caption: "A backtracking walker explores only valid letters for each digit, pruning bad paths immediately.",
      state: walk.plain([], { counter: null }),
    },
  ];
}

function insightFrames(digits: string, walk: ChoiceWalk): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Think of a walker at a dial station. Each digit offers forks for its letters.",
      state: walk.plain([], { note: { text: "forks per digit", tone: "accent" } }),
    },
    {
      scene: "insight",
      caption: "Pick one letter into the bag, walk forward to the next digit, and un-choose when stepping back.",
      state: walk.plain([], { note: { text: "choose -> explore -> un-choose", tone: "teal" } }),
    },
  ];
}

function solutionFrames(digits: string): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];

  const shelfFn = (w: ChoiceWalk) => ({
    label: "digits",
    items: digits.split("").map((d, i): ChoiceChip => ({
      text: d,
      tone: i === w.path.length - 1 ? "edge" : i < w.path.length - 1 ? "done" : "idle",
    })),
  });

  const walk = new ChoiceWalk(shelfFn);

  if (digits.length === 0) {
    frames.push({
      scene,
      codeLine: 2,
      caption: `${TRAP}: check if dial digits are empty. With no digits, the walker stays put and the notebook stays empty.`,
      state: walk.plain([], { note: { text: "empty dial check", tone: "coral" } }),
    });
    frames.push({
      scene,
      codeLine: 3,
      caption: "Returning an empty list prevents the walker from mistakenly writing an empty word in the notebook.",
      state: walk.plain([], { note: { text: "return empty", tone: "teal" } }),
    });
    frames.push({
      scene,
      codeLine: 6,
      caption: "With no digits to dial, the walker leaves the bag empty. The answer is [].",
      state: walk.plain([]),
    });
    frames.push({
      scene,
      codeLine: 6,
      caption: "Time: O(4^n). Each digit branches into up to 4 letters, generating at most 4^n leaf words.",
      state: walk.plain([]),
    });
    frames.push({
      scene,
      codeLine: 6,
      caption: "Space: O(n). The recursion stack and letter buffer hold at most n characters at once.",
      state: walk.plain([]),
    });
    return frames;
  }

  frames.push({
    scene,
    codeLine: 1,
    caption: `We start with digits "${digits}". The walker starts with an empty bag.`,
    state: walk.snap(),
  });

  frames.push({
    scene,
    codeLine: 5,
    caption: "Launch recursive exploration starting at digit index 0.",
    state: walk.snap(),
  });

  let askedFork = false;
  let askedBack = false;

  const explore = (digitIndex: number) => {
    if (digitIndex === digits.length) {
      const word = walk.bag.join("");
      walk.write(word);
      frames.push({
        scene,
        codeLine: 11,
        caption: `Bag reached length ${digits.length}. Write "${word}" into the notebook.`,
        state: walk.snap(),
      });
      return;
    }

    const digit = digits[digitIndex];
    const letters = KEYPAD[digit] ?? [];
    const forkIds = walk.forks(letters);

    frames.push({
      scene,
      codeLine: 14,
      caption: `Digit '${digit}' offers ${forkIds.length} letter forks: ${wordList(letters)}.`,
      state: walk.snap(),
    });

    for (let i = 0; i < forkIds.length; i++) {
      const forkId = forkIds[i];
      const letter = letters[i];

      if (!askedFork && i === 1 && digitIndex === 0) {
        askedFork = true;
        const here = walk.here;
        const preQuizState = walk.snap();
        frames.push({
          scene,
          codeLine: 15,
          caption: "Which fork does the walker try next? Click it.",
          state: preQuizState,
          quiz: nextForkQuiz(preQuizState, here, forkId),
        });
      }

      walk.choose(forkId);
      frames.push({
        scene,
        codeLine: 16,
        caption: `The walker chooses letter '${letter}' into the bag and steps forward.`,
        state: walk.snap(),
      });

      explore(digitIndex + 1);

      if (!askedBack && digitIndex === digits.length - 1 && i === 0) {
        askedBack = true;
        const preQuizState = walk.snap();
        const bagStr = listText(walk.bag);
        const afterStr = listText(walk.bag.slice(0, -1));
        frames.push({
          scene,
          codeLine: 18,
          caption: "The walker steps back one spot. What is in the bag after that?",
          state: preQuizState,
          quiz: stepBackQuiz(afterStr, bagStr, "[]"),
        });
      }

      const left = walk.unchoose();
      frames.push({
        scene,
        codeLine: 18,
        caption: `Un-choose '${left}' from the bag and step back to try the next letter fork.`,
        state: walk.snap(),
      });
    }
  };

  explore(0);

  const words = solve(digits);
  frames.push({
    scene,
    codeLine: 6,
    caption: `All letter forks explored. The answer is ${JSON.stringify(words)}.`,
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 6,
    caption: "Time: O(4^n). Each digit branches into up to 4 letters, generating at most 4^n leaf words.",
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 6,
    caption: "Space: O(n). The recursion stack and letter buffer hold at most n characters at once.",
    state: walk.finished(),
  });

  return frames;
}

function cardFrames(walk: ChoiceWalk): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "What happens if we do not check for an empty digits string upfront?",
    options: [
      "We incorrectly return a list containing an empty string",
      "The recursion throws a stack overflow error",
      "The loop skips all keys and crashes",
    ],
    answer: 0,
    why: "Base case index == length would trigger immediately at index 0 and add an empty string to out.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "Why must we remove the last letter from the bag after exploring each branch?",
    options: [
      "To un-choose the letter so the next sibling fork can use the clean prefix",
      "To save memory on the recursion stack",
      "Because the letter is no longer valid for future digits",
    ],
    answer: 0,
    why: "The single shared path buffer must be restored to its previous state before trying sibling choices.",
  };

  frames.push({
    scene,
    caption: "When you see phone digits mapped to letters, think of a walker branching at each digit.",
    state: walk.plain([], { note: { text: "branch per letter", tone: "accent" } }),
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Check for empty input upfront so an empty string is never mistakenly returned in the list.",
    state: walk.plain([], { note: { text: "check empty upfront", tone: "teal" } }),
  });

  frames.push({
    scene,
    caption: "Backtrack by popping the last letter so sibling forks start from the clean prefix.",
    state: walk.plain([], { note: { text: "clean un-choose", tone: "accent" } }),
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the walker on the dial path: choose a letter, explore next digit, and un-choose.",
    state: walk.finished(),
  });

  return frames;
}

export const letterCombinationsStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-17"],
  pattern: "Backtracking",
  trigger: "map phone digits to all possible letter combinations",
  insight: "Each digit opens forks for its dial letters. Walk each letter, step to the next digit, and un-choose on return.",
  metaphor: {
    name: "The phone dial path",
    legend: "digits = keypad keys · bag = letters chosen so far · fork = letter choice · notebook = complete words",
    terms: ["walker", "bag", "fork", "notebook", "spot", "letter", "digit", "un-choose"],
  },
  traps: [{ name: TRAP, rule: "Check for an empty input upfront and return an empty list, never a list holding an empty word." }],
  template: [
    "List<String> out = new ArrayList<>();",
    "if (digits.isEmpty()) return out;",
    "build(digits, 0, new StringBuilder(), out);",
    "return out;",
  ],
  complexity: {
    slow: "O(4^n)",
    time: "O(4^n)",
    timeWhy: "each digit branches into up to 4 letter choices, generating at most 4^n leaf words",
    space: "O(n)",
    spaceWhy: "the recursion stack and letter buffer hold at most n characters at once",
  },
  code: CODE,
  examples: [
    { label: "\"23\"", input: "\"23\"", expected: JSON.stringify(["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"]) },
    { label: "\"\"", input: "\"\"", expected: "[]", note: "Empty input" },
    { label: "\"2\"", input: "\"2\"", expected: JSON.stringify(["a", "b", "c"]) },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-46", title: "Permutations" },
    { slug: "lc-78", title: "Subsets" },
    { slug: "lc-39", title: "Combination Sum" },
  ],
  answer: (input) => answerText(parseDigits(input)),
  frames: (input) => {
    const digits = parseDigits(input);
    const shelfFn = () => null;
    const walk = new ChoiceWalk(shelfFn);
    return [
      ...pictureFrames(digits, walk),
      ...slowFrames(digits, walk),
      ...insightFrames(digits, walk),
      ...solutionFrames(digits),
      ...cardFrames(walk),
    ];
  },
  View: AgyChoicesTreeView,
};
