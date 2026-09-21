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

const PRACTICE = "2";
const TRAP = "The Premature Close Trap";

const CODE = [
  "List<String> generateParenthesis(int n) {",
  "    List<String> out = new ArrayList<>();",
  "    build(new StringBuilder(), 0, 0, n, out);",
  "    return out;",
  "}",
  "",
  "void build(StringBuilder path, int open, int close, int n, List<String> out) {",
  "    if (path.length() == 2 * n) {",
  "        out.add(path.toString());",
  "        return;",
  "    }",
  "    if (open < n) {",
  "        path.append('(');",
  "        build(path, open + 1, close, n, out);",
  "        path.deleteCharAt(path.length() - 1);",
  "    }",
  "    if (close < open) {",
  "        path.append(')');",
  "        build(path, open, close + 1, n, out);",
  "        path.deleteCharAt(path.length() - 1);",
  "    }",
  "}",
];

function parseN(input: string): number {
  const match = input.match(/\d+/);
  return match ? Math.min(3, Math.max(1, parseInt(match[0], 10))) : 1;
}

function solve(n: number): string[] {
  const out: string[] = [];
  const build = (current: string, open: number, close: number) => {
    if (current.length === 2 * n) {
      out.push(current);
      return;
    }
    if (open < n) {
      build(current + "(", open + 1, close);
    }
    if (close < open) {
      build(current + ")", open, close + 1);
    }
  };
  build("", 0, 0);
  return out;
}

function answerText(n: number): string {
  return JSON.stringify(solve(n));
}

function pictureFrames(n: number, walk: ChoiceWalk): Frame[] {
  const words = solve(n);
  const sample = words[0] ?? "()";
  const shelf: ChoiceStrip = {
    label: "goal",
    items: [
      { text: `${n} pairs`, tone: "edge" },
      { text: `${2 * n} brackets`, tone: "idle" },
    ],
  };

  return [
    {
      scene: "picture",
      caption: `We need all balanced combinations of ${n} bracket pairs. Every open bracket '(' must have a matching close ')'.`,
      state: walk.plain([], { shelf }),
    },
    {
      scene: "picture",
      caption: `For example, "${sample}" is well formed. The close bracket never outnumbers the open bracket at any step.`,
      state: walk.plain([{ label: "sample", items: [{ text: sample, tone: "done" }] }], { shelf }),
    },
    {
      scene: "picture",
      caption: `The goal: list all ${words.length} balanced combinations in the notebook. Keep each choice balanced.`,
      state: walk.plain([{ label: "all valid", items: words.slice(0, 4).map((w) => ({ text: w, tone: "hit" })) }], { shelf }),
    },
  ];
}

function slowFrames(n: number, walk: ChoiceWalk): Frame[] {
  const totalRaw = Math.pow(2, 2 * n);
  const validCount = solve(n).length;
  return [
    {
      scene: "slow",
      caption: `The slow way generates every possible sequence of ${2 * n} open and close brackets, then checks each one.`,
      state: walk.plain([], { counter: { label: "candidates", value: totalRaw } }),
    },
    {
      scene: "slow",
      caption: `Out of ${totalRaw} raw bracket strings, only ${validCount} are balanced. Generating invalid candidates wastes work.`,
      state: walk.plain([], { counter: { label: "valid found", value: validCount } }),
    },
    {
      scene: "slow",
      caption: "Constrained backtracking only places valid brackets, avoiding illegal paths altogether.",
      state: walk.plain([], { counter: null }),
    },
  ];
}

function insightFrames(n: number, walk: ChoiceWalk): Frame[] {
  return [
    {
      scene: "insight",
      caption: `At each step, we can place an open bracket if fewer than ${n} open brackets have been placed.`,
      state: walk.plain([], { note: { text: "open < n -> add '('", tone: "accent" } }),
    },
    {
      scene: "insight",
      caption: "We can only place a close bracket if close count is strictly less than open count.",
      state: walk.plain([], { note: { text: "close < open -> add ')'", tone: "teal" } }),
    },
  ];
}

function solutionFrames(n: number): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];

  const shelfFn = (w: ChoiceWalk): ChoiceStrip => {
    const openCount = w.bag.filter((c) => c === "(").length;
    const closeCount = w.bag.filter((c) => c === ")").length;
    return {
      label: "counts",
      items: [
        { text: `open: ${openCount}/${n}`, tone: openCount < n ? "edge" : "done" },
        { text: `close: ${closeCount}/${n}`, tone: closeCount < openCount ? "hit" : "idle" },
      ],
    };
  };

  const walk = new ChoiceWalk(shelfFn);

  frames.push({
    scene,
    codeLine: 1,
    caption: `We need ${n} pairs of brackets. The walker starts with an empty bag.`,
    state: walk.snap(),
  });

  frames.push({
    scene,
    codeLine: 2,
    caption: "Launch backtracking with open count at 0 and close count at 0.",
    state: walk.snap(),
  });

  let askedFork = false;
  let askedBack = false;
  let shownTrap = false;
  let foundCount = 0;

  const explore = (open: number, close: number) => {
    if (walk.bag.length === 2 * n) {
      const word = walk.bag.join("");
      walk.write(word);
      foundCount++;
      frames.push({
        scene,
        codeLine: 8,
        caption: `Bag holds ${2 * n} brackets forming "${word}". Write it into the notebook.`,
        state: walk.snap(),
      });
      return;
    }

    if (!shownTrap && open === 0 && close === 0) {
      shownTrap = true;
      frames.push({
        scene,
        codeLine: 16,
        caption: `${TRAP}: close count is 0 and open count is 0. Placing a close bracket now would break balance.`,
        state: walk.snap({ note: { text: "close < open required", tone: "coral" } }),
      });
    }

    const options: string[] = [];
    if (open < n) options.push("(");
    if (close < open) options.push(")");

    const forkIds = walk.forks(options);
    const detailed = foundCount < 2;

    if (detailed) {
      frames.push({
        scene,
        codeLine: options[0] === "(" ? 11 : 16,
        caption: `Valid bracket choices here: ${options.map((o) => `'${o}'`).join(" and ")}.`,
        state: walk.snap(),
      });
    }

    for (let i = 0; i < forkIds.length; i++) {
      const forkId = forkIds[i];
      const opt = options[i];

      if (detailed && !askedFork && opt === ")" && open > close) {
        askedFork = true;
        const here = walk.here;
        const preQuizState = walk.snap();
        frames.push({
          scene,
          codeLine: 16,
          caption: "Which fork does the walker try next? Click it.",
          state: preQuizState,
          quiz: nextForkQuiz(preQuizState, here, forkId),
        });
      }

      walk.choose(forkId);
      if (detailed) {
        frames.push({
          scene,
          codeLine: opt === "(" ? 12 : 17,
          caption: `The walker places '${opt}' into the bag and advances.`,
          state: walk.snap(),
        });
      }

      if (opt === "(") {
        explore(open + 1, close);
      } else {
        explore(open, close + 1);
      }

      if (detailed && !askedBack && walk.bag.length === 2 * n) {
        askedBack = true;
        const preQuizState = walk.snap();
        const bagStr = listText(walk.bag);
        const afterStr = listText(walk.bag.slice(0, -1));
        frames.push({
          scene,
          codeLine: 14,
          caption: "The walker steps back one spot. What is in the bag after that?",
          state: preQuizState,
          quiz: stepBackQuiz(afterStr, bagStr, "[]"),
        });
      }

      const left = walk.unchoose();
      if (detailed) {
        frames.push({
          scene,
          codeLine: opt === "(" ? 14 : 19,
          caption: `Un-choose '${left}' from the bag to restore the prefix.`,
          state: walk.snap(),
        });
      }
    }
  };

  explore(0, 0);

  const results = solve(n);
  frames.push({
    scene,
    codeLine: 3,
    caption: `All valid paths explored. The answer is ${JSON.stringify(results)}.`,
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 3,
    caption: "Time: O(4^n / sqrt(n)). The number of balanced bracket paths is the nth Catalan number.",
    state: walk.finished(),
  });

  frames.push({
    scene,
    codeLine: 3,
    caption: "Space: O(n). The recursion stack and bracket bag hold at most 2n items.",
    state: walk.finished(),
  });

  return frames;
}

function cardFrames(walk: ChoiceWalk): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Under what condition may we place a close bracket ')'?",
    options: [
      "Only when close count is strictly less than open count",
      "Whenever close count is less than n",
      "Only after all open brackets have been placed",
    ],
    answer: 0,
    why: "A close bracket requires an unmatched preceding open bracket; otherwise balance is ruined immediately.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "How many total brackets are placed in each valid combination for n pairs?",
    options: [
      "Exactly 2 * n brackets (n open and n close)",
      "Exactly n brackets",
      "Between n and 2 * n brackets",
    ],
    answer: 0,
    why: "Each of the n pairs requires one open and one close bracket, totaling 2 * n characters.",
  };

  frames.push({
    scene,
    caption: "When generating parentheses, maintain two counts: open brackets placed and close brackets placed.",
    state: walk.plain([], { note: { text: "track open & close", tone: "accent" } }),
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Never let close brackets outnumber open brackets, avoiding premature close mistakes.",
    state: walk.plain([], { note: { text: "close < open always", tone: "teal" } }),
  });

  frames.push({
    scene,
    caption: "Stop and save to the notebook when the bag reaches exactly 2n characters.",
    state: walk.plain([], { note: { text: "length == 2n", tone: "accent" } }),
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the bracket trail: open when under n, close when below open, and un-choose on return.",
    state: walk.finished(),
  });

  return frames;
}

export const generateParenthesesStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-22"],
  pattern: "Constrained backtracking",
  trigger: "generate all combinations of well-formed parentheses for n pairs",
  insight: "Open a bracket whenever open count is under n. Close a bracket only when close count is strictly below open count.",
  metaphor: {
    name: "The balanced bracket trail",
    legend: "open = '(' placed · close = ')' placed · bag = bracket sequence so far · notebook = valid combinations",
    terms: ["walker", "bag", "fork", "notebook", "spot", "bracket", "open", "close", "un-choose"],
  },
  traps: [{ name: TRAP, rule: "Never place a close bracket unless the number of open brackets already placed is strictly greater." }],
  template: [
    "void build(path, open, close, n, out):",
    "    if (path.length() == 2 * n) { out.add(path.toString()); return; }",
    "    if (open < n) { path.append('('); build(path, open + 1, close, n, out); path.deleteCharAt(last); }",
    "    if (close < open) { path.append(')'); build(path, open, close + 1, n, out); path.deleteCharAt(last); }",
  ],
  complexity: {
    slow: "O(2^(2n) · n)",
    time: "O(4^n / sqrt(n))",
    timeWhy: "the number of balanced bracket combinations is bounded by the nth Catalan number",
    space: "O(n)",
    spaceWhy: "the recursion stack and bracket bag never exceed 2n characters",
  },
  code: CODE,
  examples: [
    { label: "3", input: "3", expected: JSON.stringify(["((()))", "(()())", "(())()", "()(())", "()()()"]) },
    { label: "1", input: "1", expected: JSON.stringify(["()"]) },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-17", title: "Letter Combinations of a Phone Number" },
    { slug: "lc-46", title: "Permutations" },
    { slug: "lc-78", title: "Subsets" },
  ],
  answer: (input) => answerText(parseN(input)),
  frames: (input) => {
    const n = parseN(input);
    const shelfFn = () => null;
    const walk = new ChoiceWalk(shelfFn);
    return [
      ...pictureFrames(n, walk),
      ...slowFrames(n, walk),
      ...insightFrames(n, walk),
      ...solutionFrames(n),
      ...cardFrames(walk),
    ];
  },
  View: AgyChoicesTreeView,
};
