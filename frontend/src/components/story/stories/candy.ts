import type { CellTone } from "@/components/learn/viz/primitives";

import { CandyWalkView, type CandyWalkState } from "../rec08-candy-walk-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<CandyWalkState>;

/** Fresh row for the "your turn" run. The peak already holds more than the walk back asks for. */
const PRACTICE = "[1,2,3,2]";

const CODE = [
  "int[] candies = new int[n];",
  "Arrays.fill(candies, 1);",
  "for (int i = 1; i < n; i++) {",
  "    if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;",
  "}",
  "for (int i = n - 2; i >= 0; i--) {",
  "    if (ratings[i] > ratings[i + 1])",
  "        candies[i] = Math.max(candies[i], candies[i + 1] + 1);",
  "}",
  "int total = 0;",
  "for (int c : candies) total += c;",
  "return total;",
];

function parse(raw: string): number[] {
  return raw
    .replace(/[[\]\s]/g, "")
    .split(",")
    .filter(Boolean)
    .map((token) => Number.parseInt(token, 10));
}

/** Independent check: sweep and fix until nothing changes. */
function solve(ratings: number[]): number {
  const candies = ratings.map(() => 1);
  let changed = true;
  while (changed) {
    changed = false;
    ratings.forEach((rating, i) => {
      if (i > 0 && rating > ratings[i - 1] && candies[i] <= candies[i - 1]) {
        candies[i] = candies[i - 1] + 1;
        changed = true;
      }
      if (i < ratings.length - 1 && rating > ratings[i + 1] && candies[i] <= candies[i + 1]) {
        candies[i] = candies[i + 1] + 1;
        changed = true;
      }
    });
  }
  return candies.reduce((sum, value) => sum + value, 0);
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function blank(ratings: number[]): CandyWalkState {
  return { ratings, candies: null, tones: ratings.map(() => "idle"), here: null, neighbour: null, walk: null, ghost: null, total: null, counter: null, note: null };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function pictureFrames(ratings: number[]): Frame[] {
  const n = ratings.length;
  const pair = ratings.findIndex((rating, i) => i < n - 1 && rating !== ratings[i + 1]);
  const frames: Frame[] = [
    { scene: "picture", caption: `${n} children stand in a row. Each bar is one child's rating.`, state: blank(ratings) },
    {
      scene: "picture",
      caption: "Rule one: every child gets at least one candy.",
      state: { ...blank(ratings), candies: ratings.map(() => 1) },
    },
  ];
  if (pair >= 0) {
    const high = ratings[pair] > ratings[pair + 1] ? pair : pair + 1;
    const low = high === pair ? pair + 1 : pair;
    frames.push({
      scene: "picture",
      caption: `Rule two: a child rated higher than a neighbour gets more candy. So one candy each for the neighbours rated ${ratings[high]} and ${ratings[low]} is not allowed.`,
      state: { ...blank(ratings), candies: ratings.map(() => 1), here: high, neighbour: low, tones: tones(n, (i) => (i === high || i === low ? "miss" : null)) },
    });
  }
  frames.push({
    scene: "picture",
    caption: "Only neighbours are compared, and equal ratings need nothing. The goal: the smallest total that keeps both rules.",
    state: { ...blank(ratings), candies: ratings.map(() => 1) },
  });
  return frames;
}

function slowFrames(ratings: number[]): Frame[] {
  const n = ratings.length;
  const frames: Frame[] = [];
  const candies = ratings.map(() => 1);
  let checks = 0;
  let sweep = 0;
  let changed = true;
  while (changed) {
    changed = false;
    sweep++;
    const fixed: number[] = [];
    for (let i = 0; i < n; i++) {
      checks++;
      if (i > 0 && ratings[i] > ratings[i - 1] && candies[i] <= candies[i - 1]) {
        candies[i] = candies[i - 1] + 1;
        changed = true;
        fixed.push(i);
      }
      if (i < n - 1 && ratings[i] > ratings[i + 1] && candies[i] <= candies[i + 1]) {
        candies[i] = candies[i + 1] + 1;
        changed = true;
        if (!fixed.includes(i)) fixed.push(i);
      }
    }
    if (sweep <= 3) {
      frames.push({
        scene: "slow",
        caption:
          sweep === 1
            ? `The slow way: sweep the row and fix any child who breaks a rule. Sweep 1 fixes ${fixed.length} ${fixed.length === 1 ? "child" : "children"}.`
            : changed
              ? `Sweep ${sweep} fixes ${fixed.length} more. A fix can break the child next to it, so we sweep again.`
              : `Sweep ${sweep} changes nothing, so we stop.`,
        state: { ...blank(ratings), candies: [...candies], tones: tones(n, (i) => (fixed.includes(i) ? "edge" : null)), counter: { label: "children checked", value: checks } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `${checks} checks in ${sweep} sweeps. On a falling row like 5 4 3 2 1, each sweep fixes only one more child: O(n²) time.`,
    state: { ...blank(ratings), candies: [...candies], tones: tones(n, () => "faded"), counter: { label: "children checked", value: checks }, total: sum(candies) },
  });
  return frames;
}

function insightFrames(ratings: number[]): Frame[] {
  const n = ratings.length;
  const left = ratings.map(() => 1);
  for (let i = 1; i < n; i++) if (ratings[i] > ratings[i - 1]) left[i] = left[i - 1] + 1;
  const middle = Math.min(1, n - 1);
  return [
    {
      scene: "insight",
      caption: "Each child has two rules to keep: one about the left neighbour and one about the right neighbour. Handle one side at a time.",
      state: { ...blank(ratings), candies: ratings.map(() => 1), here: middle, neighbour: middle > 0 ? middle - 1 : null },
    },
    {
      scene: "insight",
      caption: "Picture two walks down the line. On the walk right, the left neighbour is already settled, so every left rule is met in one go.",
      state: { ...blank(ratings), candies: left, walk: "right", tones: tones(n, () => "window") },
    },
    {
      scene: "insight",
      caption: "The walk back does the same for right neighbours. A child keeps the larger of its two amounts, so the first walk's work is never lost.",
      state: { ...blank(ratings), candies: left, walk: "left", tones: tones(n, () => "hit") },
    },
  ];
}

function rightQuiz(rating: number, neighbour: number): StoryQuiz {
  return {
    kind: "choice",
    question: `Walk right: this child is rated ${rating}, its left neighbour ${neighbour}. What happens to this child's candy?`,
    options: ["It stays as it is", "It becomes one more than the left neighbour's"],
    answer: rating > neighbour ? 1 : 0,
    why: rating > neighbour ? "It is rated higher than its left neighbour, so it needs more candy than that neighbour." : "It is not rated higher, so the left rule asks nothing of it.",
  };
}

function backQuiz(rating: number, neighbour: number, has: number, need: number): StoryQuiz {
  if (rating <= neighbour) {
    return {
      kind: "choice",
      question: `Walk back: this child is rated ${rating}, its right neighbour ${neighbour}. What happens to this child's candy?`,
      options: ["It keeps what it has", "It needs more than the right neighbour"],
      answer: 0,
      why: "It is not rated higher than its right neighbour, so the right rule asks nothing of it.",
    };
  }
  return {
    kind: "choice",
    question: `Walk back: this child beats its right neighbour. It has ${has}, and the neighbour's candy plus one is ${need}. What should it end with?`,
    options: [`${need}, the neighbour's plus one`, `${has}, what it already has`],
    answer: need > has ? 0 : 1,
    why: `The larger amount, ${Math.max(has, need)}. It meets the right rule and keeps the left rule from the first walk.`,
  };
}

/** The real two-walk algorithm, one frame per child. `practice` asks at every step. */
function solutionFrames(ratings: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const n = ratings.length;
  const frames: Frame[] = [];
  const candies = ratings.map(() => 1);
  let askedRight = false;
  let askedBack = false;
  let askedTrap = false;
  let showedTrap = false;
  let visits = 0;
  const line = (index: number) => (practice ? undefined : index);
  const state = (walk: CandyWalkState["walk"], here: number | null, neighbour: number | null, paint: (i: number) => CellTone | null = () => null): CandyWalkState => ({
    ...blank(ratings),
    candies: [...candies],
    walk,
    here,
    neighbour,
    tones: tones(n, paint),
  });

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: ${ratings.join(", ")}. You decide each child's candy on both walks.` : "Every child starts with one candy.",
    codeLine: line(1),
    state: state(null, null, null),
  });

  for (let i = 1; i < n; i++) {
    visits++;
    const before: Frame = {
      scene,
      caption: `Walk right: the child rated ${ratings[i]} looks at its left neighbour, rated ${ratings[i - 1]}.`,
      codeLine: line(3),
      state: state("right", i, i - 1),
    };
    const ask = practice || !askedRight;
    if (ask) {
      askedRight = true;
      before.quiz = rightQuiz(ratings[i], ratings[i - 1]);
      frames.push(before);
    }
    const higher = ratings[i] > ratings[i - 1];
    if (higher) candies[i] = candies[i - 1] + 1;
    frames.push({
      scene,
      caption: higher
        ? `${ask ? "" : `Walk right: the child rated ${ratings[i]} beats its left neighbour. `}It gets one more candy than that neighbour: ${candies[i]}.`
        : `${ask ? "" : `Walk right: the child rated ${ratings[i]} is not higher than its left neighbour. `}It stays at ${candies[i]}.`,
      codeLine: line(3),
      state: state("right", i, i - 1, (k) => (k === i ? (higher ? "edge" : "window") : null)),
    });
  }
  if (n > 1) {
    frames.push({
      scene,
      caption: "The walk right is done. Every child now has more candy than a lower-rated left neighbour.",
      codeLine: line(2),
      state: state(null, null, null, () => "hit"),
    });
  }

  for (let i = n - 2; i >= 0; i--) {
    visits++;
    const beats = ratings[i] > ratings[i + 1];
    const has = candies[i];
    const need = candies[i + 1] + 1;
    const trap = beats && need < has;
    const before: Frame = {
      scene,
      caption: `Walk back: the child rated ${ratings[i]} looks at its right neighbour, rated ${ratings[i + 1]}.`,
      codeLine: line(6),
      state: state("left", i, i + 1),
    };
    const ask = practice ? beats ? need !== has : true : beats && (trap ? !askedTrap : !askedBack);
    if (ask) {
      if (trap) askedTrap = true;
      else if (beats) askedBack = true;
      before.quiz = backQuiz(ratings[i], ratings[i + 1], has, need);
      frames.push(before);
    }
    if (beats) candies[i] = Math.max(has, need);
    const intro = ask ? "" : `Walk back: the child rated ${ratings[i]} `;
    frames.push({
      scene,
      caption: !beats
        ? `${intro || "This child "}is not higher than its right neighbour. It keeps ${has}.`
        : need > has
          ? `${intro || "This child "}needs more than its right neighbour's ${need - 1}. It goes up to ${candies[i]}.`
          : need === has
            ? `${intro || "This child "}needs ${need}, and it already has exactly that. It keeps ${has}.`
            : `${intro || "This child "}needs only ${need}, but already has ${has}. The child keeps the larger amount, ${has}.`,
      codeLine: line(7),
      state: state("left", i, i + 1, (k) => (k === i ? (beats && need > has ? "edge" : "window") : null)),
    });
    if (trap && !showedTrap) {
      showedTrap = true;
      frames.push({
        scene,
        caption: `The Overwrite Trap: writing ${need} here would give this child no more than its left neighbour's ${candies[i - 1]}. Keep the larger amount.`,
        codeLine: line(7),
        state: { ...state("left", i, i - 1, (k) => (k === i ? "done" : k === i - 1 ? "miss" : null)), ghost: { index: i, value: need } },
      });
    }
  }

  const total = sum(candies);
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${total}. You kept the larger amount on the walk back.` : `Add up every child's candy: ${candies.join(" + ")}. The answer is ${total}.`,
    codeLine: line(10),
    state: { ...state(null, null, null, () => "done"), total },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Two walks, each visiting the ${n} children once: ${visits} steps in all, then one more walk to add up.`,
      codeLine: 5,
      state: { ...state(null, null, null, () => "done"), total, counter: { label: "children visited", value: visits } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). One candy box per child: ${n} boxes.`,
      codeLine: 0,
      state: { ...state(null, null, null, () => "window"), total },
    });
  }
  return frames;
}

export const candyStory: ProblemStory<CandyWalkState> = {
  slugs: ["lc-135"],
  pattern: "Greedy: two passes",
  trigger: "each item must beat its neighbours on both sides by some rule, and you want the smallest total",
  insight: "Two walks down the line. The walk right settles every left-hand rule, the walk back settles every right-hand rule, and each child keeps the larger amount.",
  metaphor: { name: "Two walks down the line", legend: "walk right = first loop · walk back = second loop · candy box = candies[i]", terms: ["walk", "child", "candy", "neighbour"] },
  traps: [{ name: "The Overwrite Trap", rule: "On the walk back, keep the larger of the two amounts. Overwriting throws away what the first walk earned." }],
  template: [
    "give everyone the least allowed value",
    "walk left to right: fix each item against its left neighbour",
    "walk right to left: fix each item against its right neighbour, keeping the larger value",
    "combine the values",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "two walks over the row, each visiting every child once",
    space: "O(n)",
    spaceWhy: "one candy count per child",
  },
  code: CODE,
  examples: [
    { label: "[1,3,4,5,2]", input: "[1,3,4,5,2]", expected: "11", note: "Tricky: the peak must keep its larger amount" },
    { label: "[1,0,2]", input: "[1,0,2]", expected: "5" },
    { label: "[1,2,2]", input: "[1,2,2]", expected: "4" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-238", title: "Product of Array Except Self" },
    { slug: "lc-42", title: "Trapping Rain Water" },
    { slug: "lc-134", title: "Gas Station" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const ratings = parse(input);
    const done = solutionFrames(ratings).find((frame) => frame.caption.includes("The answer is"))?.state ?? blank(ratings);
    return [
      ...pictureFrames(ratings),
      ...slowFrames(ratings),
      ...insightFrames(ratings),
      ...solutionFrames(ratings),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...done, note: "walk right, walk back, keep the larger" },
      },
    ];
  },
  View: CandyWalkView,
};
