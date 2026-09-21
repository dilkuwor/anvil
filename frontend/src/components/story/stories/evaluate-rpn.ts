import type { CellTone } from "@/components/learn/viz/primitives";

import {
  GrokPlateStackView,
  pickCount,
  platePick,
  topPlatePick,
  type Plate,
  type PlateStackState,
} from "../grok-plate-stack-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<PlateStackState>;

const PRACTICE = '["4","2","+","3","-"]';

const CODE = [
  "Deque<Integer> pile = new ArrayDeque<>();",
  "for (String token : tokens) {",
  "    if (token.equals(\"+\") || token.equals(\"-\") || token.equals(\"*\") || token.equals(\"/\")) {",
  "        int right = pile.removeFirst();",
  "        int left = pile.removeFirst();",
  "        int v = 0;",
  "        if (token.equals(\"+\")) v = left + right;",
  "        else if (token.equals(\"-\")) v = left - right;",
  "        else if (token.equals(\"*\")) v = left * right;",
  "        else v = left / right;",
  "        pile.addFirst(v);",
  "    } else {",
  "        pile.addFirst(Integer.parseInt(token));",
  "    }",
  "}",
  "return pile.removeFirst();",
];

function parse(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return [];
  return inner
    .split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter((part) => part !== "");
}

function isOp(token: string): boolean {
  return token === "+" || token === "-" || token === "*" || token === "/";
}

function apply(op: string, left: number, right: number): number {
  if (op === "+") return left + right;
  if (op === "-") return left - right;
  if (op === "*") return left * right;
  return Math.trunc(left / right);
}

function solve(tokens: string[]): number {
  const pile: number[] = [];
  for (const token of tokens) {
    if (isOp(token)) {
      const right = pile.pop()!;
      const left = pile.pop()!;
      pile.push(apply(token, left, right));
    } else pile.push(Number(token));
  }
  return pile[0] ?? 0;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function platesOf(pile: number[], topTone?: CellTone): Plate[] {
  return pile.map((value, index) => ({ label: String(value), tone: index === pile.length - 1 ? topTone : "idle" }));
}

function blank(tokens: string[]): PlateStackState {
  return { tokens, tokenTones: tones(tokens.length, () => null), cursor: null, plates: [], stackTitle: "number plates" };
}

function base(tokens: string[], pile: number[], cursor: number | null, extra: Partial<PlateStackState> = {}): PlateStackState {
  return {
    ...blank(tokens),
    cursor,
    plates: platesOf(pile),
    tokenTones: tones(tokens.length, (index) => (index === cursor ? "edge" : index < (cursor ?? -1) ? "faded" : null)),
    ...extra,
  };
}

function rightQuiz(state: PlateStackState, pile: number[]): StoryQuiz {
  const answer = topPlatePick(state);
  const below = pile.length >= 2 ? platePick(state, pile.length - 2) : -1;
  const feedback: Record<number, string> = {};
  state.tokens.forEach((_, index) => {
    if (index !== answer) feedback[index] = "That is a token in the row. The right number is a plate on the pile.";
  });
  pile.forEach((value, fromBottom) => {
    const idx = platePick(state, fromBottom);
    if (idx === answer) return;
    feedback[idx] = `That plate is ${value}. It is not on top. The right number sits on top.`;
  });
  return {
    kind: "cell",
    cells: pickCount(state),
    numbered: true,
    question: "An operator arrived. Which plate is the right-hand number? Click it.",
    answer,
    feedback,
    otherwise: "The right-hand number is the plate that was set down last.",
    why: below >= 0 ? "The top plate is the right number. The plate under it is the left number." : "The top plate is the right number.",
  };
}

function pictureFrames(tokens: string[]): Frame[] {
  const value = solve(tokens);
  const firstOp = tokens.findIndex(isOp);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "These tokens are postfix: numbers wait, then an operator uses the last two numbers.",
      state: blank(tokens),
    },
  ];
  if (firstOp >= 2) {
    const left = tokens[firstOp - 2];
    const right = tokens[firstOp - 1];
    const op = tokens[firstOp];
    frames.push({
      scene: "picture",
      caption: `${left} then ${right} then ${op} is allowed: ${op} uses ${right} as the right number, then ${left}.`,
      state: {
        ...blank(tokens),
        tokenTones: tones(tokens.length, (index) => (index === firstOp ? "edge" : index === firstOp - 1 || index === firstOp - 2 ? "done" : null)),
      },
    });
  }
  if (firstOp >= 2) {
    const left = Number(tokens[firstOp - 2]);
    const right = Number(tokens[firstOp - 1]);
    const op = tokens[firstOp];
    frames.push({
      scene: "picture",
      caption: `Not allowed: taking the lower plate first, so ${right} ${op} ${left} instead of ${left} ${op} ${right}.`,
      state: { ...blank(tokens), ghostLabel: `${right} ${op} ${left}`, xMark: true, plates: platesOf([left, right], "miss") },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the value of the whole postfix row.",
    state: { ...blank(tokens), result: String(value), tokenTones: tones(tokens.length, () => "done") },
  });
  return frames;
}

function slowFrames(tokens: string[]): Frame[] {
  const frames: Frame[] = [];
  const list = [...tokens];
  let scans = 0;
  let shown = 0;
  while (list.length > 1) {
    scans += list.length;
    const at = list.findIndex((token) => isOp(token));
    if (at < 2) break;
    const left = Number(list[at - 2]);
    const right = Number(list[at - 1]);
    const op = list[at];
    const v = apply(op, left, right);
    if (shown < 2) {
      frames.push({
        scene: "slow",
        caption:
          shown === 0
            ? `The slow way: find the first operator, replace it and the two numbers before it. Here ${left} ${op} ${right} becomes ${v}.`
            : `Scan the shorter list again. ${left} ${op} ${right} becomes ${v}. Each scan rereads tokens.`,
        state: {
          ...blank(tokens),
          banner: `list ${list.join(" ")}`,
          result: String(v),
          counter: { label: "tokens read", value: scans },
        },
      });
      shown++;
    }
    list.splice(at - 2, 3, String(v));
  }
  const value = Number(list[0] ?? 0);
  frames.push({
    scene: "slow",
    caption: `Each operator forced a new left-to-right scan. We read ${scans} tokens for a row of ${tokens.length}. This is O(n²) time.`,
    state: { ...blank(tokens), result: String(value), tokenTones: tones(tokens.length, () => "faded"), counter: { label: "tokens read", value: scans } },
  });
  return frames;
}

function insightFrames(tokens: string[]): Frame[] {
  const at = tokens.findIndex(isOp);
  const left = at >= 2 ? Number(tokens[at - 2]) : 0;
  const right = at >= 2 ? Number(tokens[at - 1]) : 0;
  const op = at >= 0 ? tokens[at] : "+";
  const pile = at >= 2 ? [left, right] : [];
  return [
    {
      scene: "insight",
      caption: "Picture a pile of number plates. Each number waits. An operator takes two plates, the top one first.",
      state: { ...blank(tokens), plates: platesOf(pile, "window"), cursor: at >= 0 ? at : null },
    },
    {
      scene: "insight",
      caption: `The top plate is the right number (${right}). The plate under it is the left number (${left}).`,
      state: { ...base(tokens, pile, at, { held: op }), plates: platesOf(pile, "edge") },
    },
    {
      scene: "insight",
      caption: `Take the top first, then the one below. ${left} ${op} ${right} = ${apply(op, left, right)}. Swapping them is the Operand Trap.`,
      state: { ...base(tokens, [apply(op, left, right)], at), plates: platesOf([apply(op, left, right)], "done"), ghostLabel: `${right} ${op} ${left}` },
    },
  ];
}

function solutionFrames(tokens: string[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const pile: number[] = [];
  let asked = false;
  let showedTrap = false;
  let fullest = 0;
  const line = (index: number) => (practice ? undefined : index);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: ${tokens.join(" ")}. You pick the right-hand plate for each operator.`
      : "The pile starts empty. Numbers wait as plates. An operator will take the top plate first.",
    codeLine: line(0),
    state: blank(tokens),
  });

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!isOp(token)) {
      pile.push(Number(token));
      fullest = Math.max(fullest, pile.length);
      frames.push({
        scene,
        caption: `${token} is a number. Set it down as a plate. The top of the pile is now ${token}.`,
        codeLine: line(12),
        state: { ...base(tokens, pile, i), plates: platesOf(pile, "edge") },
      });
      continue;
    }

    const ask = practice || !asked;
    const before = base(tokens, pile, i, { held: token });
    const clash: Frame = {
      scene,
      caption: ask ? `Operator ${token} arrived. Two number plates are waiting.` : `Operator ${token} looks at the top plate.`,
      codeLine: line(2),
      state: before,
    };
    if (ask && pile.length >= 1) {
      asked = true;
      clash.quiz = rightQuiz(before, pile);
    }
    frames.push(clash);

    const right = pile.pop()!;
    const left = pile.pop()!;
    if ((token === "-" || token === "/") && !showedTrap && !practice) {
      showedTrap = true;
      const swapped = apply(token, right, left);
      frames.push({
        scene,
        caption: `The Operand Trap. Taking ${left} first would do ${right}${token}${left} = ${swapped}. The top plate ${right} is the right number.`,
        codeLine: line(3),
        state: {
          ...base(tokens, [left, right], i, { held: token, heldTone: "miss", xMark: true, ghostLabel: `${right} ${token} ${left}` }),
          plates: platesOf([left, right], "miss"),
        },
      });
    }
    const v = apply(token, left, right);
    pile.push(v);
    fullest = Math.max(fullest, pile.length);
    frames.push({
      scene,
      caption: `Take the top plate ${right} (right), then ${left} (left). ${left} ${token} ${right} = ${v}. Set ${v} down.`,
      codeLine: line(10),
      state: { ...base(tokens, pile, i), plates: platesOf(pile, "done") },
    });
  }

  const value = pile[0] ?? 0;
  frames.push({
    scene,
    caption: practice ? `One plate is left. The answer is ${value}.` : `The last plate is the value of the row. The answer is ${value}.`,
    codeLine: line(15),
    state: { ...base(tokens, pile, null, { result: String(value) }), tokenTones: tones(tokens.length, () => "done"), plates: platesOf(pile, "done") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${tokens.length} tokens is set down once and taken at most once.`,
      codeLine: 1,
      state: { ...blank(tokens), result: String(value), tokenTones: tones(tokens.length, () => "done"), counter: { label: "tokens read", value: tokens.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). The pile holds numbers that have not been used yet. Here it held ${fullest} plate${fullest === 1 ? "" : "s"} at its fullest.`,
      codeLine: 0,
      state: { ...blank(tokens), result: String(value), pileLit: true, plates: platesOf(Array.from({ length: fullest }, (_, index) => index + 1), "window"), counter: { label: "plates at fullest", value: fullest } },
    });
  }
  return frames;
}

export const evaluateRpnStory: ProblemStory<PlateStackState> = {
  slugs: ["lc-150"],
  pattern: "Stack",
  trigger: "a postfix row of numbers and operators, and you must find the integer value",
  insight: "A pile of number plates. An operator takes the top plate as the right number, then the plate below as the left. Swap them and minus or divide goes wrong.",
  metaphor: {
    name: "The plate pile",
    legend: "pile = stack of unused numbers · top plate = right operand · plate below = left operand",
    terms: ["plate", "pile", "top"],
  },
  traps: [
    {
      name: "The Operand Trap",
      rule: "Take the top plate first: it is the right number. Minus and divide are not symmetric.",
    },
  ],
  template: [
    "pile of numbers;",
    "for each token {",
    "    if number: set it down;",
    "    else take right (top), take left, set down left op right;",
    "}",
    "the last plate is the answer;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each token is set down once and taken at most once",
    space: "O(n)",
    spaceWhy: "the pile holds numbers that have not been used yet",
  },
  code: CODE,
  examples: [
    { label: '["2","1","+","3","*"]', input: '["2","1","+","3","*"]', expected: "9" },
    { label: '["4","13","5","/","+"]', input: '["4","13","5","/","+"]', expected: "6", note: "Right operand is on top: 13/5, then +4" },
    { label: '["-7","2","/"]', input: '["-7","2","/"]', expected: "-3", note: "Divide truncates toward 0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-227", title: "Basic Calculator II" },
    { slug: "lc-394", title: "Decode String" },
    { slug: "lc-71", title: "Simplify Path" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const tokens = parse(input);
    const value = solve(tokens);
    return [
      ...pictureFrames(tokens),
      ...slowFrames(tokens),
      ...insightFrames(tokens),
      ...solutionFrames(tokens),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(tokens), result: String(value), plates: platesOf([value], "done"), tokenTones: tones(tokens.length, () => "done") },
      },
    ];
  },
  View: GrokPlateStackView,
};
