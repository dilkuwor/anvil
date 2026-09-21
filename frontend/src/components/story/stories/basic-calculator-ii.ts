import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokPlateStackView, type Plate, type PlateStackState } from "../grok-plate-stack-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<PlateStackState>;

const PRACTICE = '"2+3*4"';

const CODE = [
  "Deque<Integer> pile = new ArrayDeque<>();",
  "int number = 0;",
  "char operator = '+';",
  "for (int i = 0; i < s.length(); i++) {",
  "    char c = s.charAt(i);",
  "    if (Character.isDigit(c)) number = number * 10 + (c - '0');",
  "    if ((!Character.isDigit(c) && c != ' ') || i == s.length() - 1) {",
  "        if (operator == '+') pile.addFirst(number);",
  "        else if (operator == '-') pile.addFirst(-number);",
  "        else if (operator == '*') pile.addFirst(pile.removeFirst() * number);",
  "        else pile.addFirst(pile.removeFirst() / number);",
  "        operator = c;",
  "        number = 0;",
  "    }",
  "}",
  "int total = 0;",
  "while (!pile.isEmpty()) total += pile.removeFirst();",
  "return total;",
];

function parse(raw: string): string {
  const quoted = raw.match(/"([^"]*)"/);
  if (quoted) return quoted[1];
  return raw.trim().replace(/^s\s*=\s*/, "");
}

function isOp(c: string): boolean {
  return c === "+" || c === "-" || c === "*" || c === "/";
}

function applyOp(op: string, top: number, number: number): number {
  if (op === "+") return number;
  if (op === "-") return -number;
  if (op === "*") return top * number;
  return Math.trunc(top / number);
}

function leftToRight(s: string): number {
  const compact = s.replaceAll(" ", "");
  let i = 0;
  const readNum = (): number => {
    let n = 0;
    while (i < compact.length && compact[i] >= "0" && compact[i] <= "9") {
      n = n * 10 + (compact[i].charCodeAt(0) - 48);
      i += 1;
    }
    return n;
  };
  let value = readNum();
  while (i < compact.length) {
    const op = compact[i];
    i += 1;
    const n = readNum();
    if (op === "+") value += n;
    else if (op === "-") value -= n;
    else if (op === "*") value *= n;
    else value = Math.trunc(value / n);
  }
  return value;
}

function solve(s: string): number {
  const pile: number[] = [];
  let number = 0;
  let operator = "+";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= "0" && c <= "9") number = number * 10 + (c.charCodeAt(0) - 48);
    if ((!(c >= "0" && c <= "9") && c !== " ") || i === s.length - 1) {
      if (operator === "+" || operator === "-") pile.push(applyOp(operator, 0, number));
      else pile.push(applyOp(operator, pile.pop() ?? 0, number));
      operator = c;
      number = 0;
    }
  }
  return pile.reduce((sum, value) => sum + value, 0);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function platesOf(pile: number[], topTone?: CellTone): Plate[] {
  return pile.map((value, index) => ({ label: String(value), tone: index === pile.length - 1 ? topTone : "idle" }));
}

function blank(tokens: string[]): PlateStackState {
  return { tokens, tokenTones: tones(tokens.length, () => null), cursor: null, plates: [], stackTitle: "signed plates" };
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

function pictureFrames(s: string): Frame[] {
  const tokens = [...s];
  const value = solve(s);
  const star = s.indexOf("*");
  const plus = s.indexOf("+");
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "This is an infix sum with + - * /. Star and slash bind tighter than plus and minus. There are no parentheses.",
      state: blank(tokens),
    },
  ];
  if (star >= 0 && plus >= 0) {
    frames.push({
      scene: "picture",
      caption: `* binds tighter than +. Doing the * first is allowed. Doing + first is not.`,
      state: {
        ...blank(tokens),
        tokenTones: tones(tokens.length, (index) => (index === star ? "done" : index === plus ? "miss" : null)),
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: `Not allowed: left to right with no extra binding. That would give ${leftToRight(s)} for this sum.`,
    state: { ...blank(tokens), result: String(leftToRight(s)), xMark: true, ghostLabel: "left to right" },
  });
  frames.push({
    scene: "picture",
    caption: `The goal: the integer value. Here that is ${value}. Divide truncates toward 0.`,
    state: { ...blank(tokens), result: String(value), tokenTones: tones(tokens.length, () => "done") },
  });
  return frames;
}

function slowFrames(s: string): Frame[] {
  const tokens = [...s];
  const compact = s.replaceAll(" ", "");
  let copies = 0;
  const frames: Frame[] = [];
  const walk = (expr: string, add: boolean): number => {
    copies += expr.length;
    for (let i = expr.length - 1; i >= 0; i--) {
      const c = expr[i];
      if (add && (c === "+" || c === "-")) {
        if (frames.length < 2) {
          frames.push({
            scene: "slow",
            caption:
              frames.length === 0
                ? `The slow way: split on the last + or -, copy the two sides, and combine. "${expr}" splits at ${c}.`
                : `Split "${expr}" at ${c}. Each split copies the left and right pieces.`,
            state: { ...blank(tokens), banner: expr, counter: { label: "chars copied", value: copies } },
          });
        }
        const left = walk(expr.slice(0, i), true);
        const right = walk(expr.slice(i + 1), false);
        return c === "+" ? left + right : left - right;
      }
      if (!add && (c === "*" || c === "/")) {
        const left = walk(expr.slice(0, i), false);
        const right = Number(expr.slice(i + 1));
        copies += expr.slice(i + 1).length;
        return c === "*" ? left * right : Math.trunc(left / right);
      }
    }
    return Number(expr);
  };
  const value = walk(compact, true);
  frames.push({
    scene: "slow",
    caption: `Each split copied a piece of the string. We copied ${copies} characters for a string of ${s.length}. This is O(n²) time.`,
    state: { ...blank(tokens), result: String(value), tokenTones: tones(tokens.length, () => "faded"), counter: { label: "chars copied", value: copies } },
  });
  return frames;
}

function insightFrames(s: string): Frame[] {
  const tokens = [...s];
  const star = s.indexOf("*");
  const plus = s.indexOf("+");
  const at = star >= 0 ? star : s.search(/[+\-*/]/);
  const pile: number[] = [];
  let number = 0;
  let operator = "+";
  for (let i = 0; i < (at < 0 ? s.length : at + 1); i++) {
    const c = s[i];
    if (c >= "0" && c <= "9") number = number * 10 + (c.charCodeAt(0) - 48);
    if ((!(c >= "0" && c <= "9") && c !== " ") || i === s.length - 1) {
      if (i === at) break;
      if (operator === "+" || operator === "-") pile.push(applyOp(operator, 0, number));
      else pile.push(applyOp(operator, pile.pop() ?? 0, number));
      operator = c;
      number = 0;
    }
  }
  return [
    {
      scene: "insight",
      caption: "Picture signed plates. Plus and minus wait as plates. Star and slash change the top plate at once.",
      state: { ...blank(tokens), plates: platesOf(pile, "window"), banner: `last op ${operator}` },
    },
    {
      scene: "insight",
      caption:
        plus >= 0 && star >= 0
          ? `Last op is still +. ${number} should sit as its own plate. Combining it with the plate below would ignore * binding.`
          : `Remember the last operator. Apply it when the next operator, or the end, arrives.`,
      state: { ...base(tokens, pile, at, { held: String(number), banner: `last op ${operator}` }), plates: platesOf(pile, "edge") },
    },
    {
      scene: "insight",
      caption: `The Left-to-Right Trap. Doing + before * turns 3+2*2 into 10. * must change the top plate now.`,
      state: { ...base(tokens, pile, at, { xMark: true, ghostLabel: "sum then times", result: "10" }), plates: platesOf(pile, "miss") },
    },
  ];
}

function solutionFrames(s: string, scene: SceneId = "solution", practice = false): Frame[] {
  const tokens = [...s];
  const frames: Frame[] = [];
  const pile: number[] = [];
  let number = 0;
  let operator = "+";
  let askedPlus = false;
  let askedStar = false;
  let showedTrap = false;
  let fullest = 0;
  const line = (index: number) => (practice ? undefined : index);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new sum: "${s}". You decide whether a number waits as a plate or combines now.`
      : "The pile starts empty. The remembered operator starts as plus. Numbers are built digit by digit.",
    codeLine: line(2),
    state: blank(tokens),
  });

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= "0" && c <= "9") {
      number = number * 10 + (c.charCodeAt(0) - 48);
      const last = i === s.length - 1;
      if (!last) {
        frames.push({
          scene,
          caption: `Digit ${c}. The number for the next plate is now ${number}.`,
          codeLine: line(5),
          state: { ...base(tokens, pile, i, { held: String(number), banner: `last op ${operator}` }) },
        });
        if (!last) continue;
      }
    }
    if (c === " " && i !== s.length - 1) continue;
    if (!isOp(c) && i !== s.length - 1 && !(c >= "0" && c <= "9")) continue;

    const applyNow = isOp(c) || i === s.length - 1;
    if (!applyNow) continue;

    const starNow = operator === "*" || operator === "/";
    const ask = (practice || (starNow ? !askedStar : !askedPlus)) && (isOp(c) || i === s.length - 1);
    if (ask) {
      if (starNow) askedStar = true;
      else askedPlus = true;
      frames.push({
        scene,
        caption: `The remembered operator is ${operator}. The number in hand is ${number}.`,
        codeLine: line(6),
        state: { ...base(tokens, pile, i, { held: String(number), banner: `last op ${operator}` }) },
        quiz: {
          kind: "choice",
          question: operator === "+" || operator === "-" ? "What happens to this number?" : "What happens to the top plate?",
          options:
            operator === "+" || operator === "-"
              ? ["Set it down as a signed plate and wait", "Combine it with the plate below right now"]
              : ["Change the top plate with * or / now", "Set this number down and wait"],
          answer: 0,
          why:
            operator === "+" || operator === "-"
              ? "Plus and minus wait as signed plates, so a later * can still change that plate."
              : "Star and slash bind tighter, so they change the top plate as soon as both numbers are known.",
        },
      });
    }

    if ((operator === "+" || operator === "-") && (c === "*" || c === "/") && !showedTrap && !practice && pile.length > 0) {
      showedTrap = true;
      const wrong = operator === "+" ? pile[pile.length - 1] + number : pile[pile.length - 1] - number;
      frames.push({
        scene,
        caption: `The Left-to-Right Trap. Combining now would make a ${wrong} plate, then ${c} would miss the tighter binding.`,
        codeLine: line(7),
        state: { ...base(tokens, pile, i, { xMark: true, ghostLabel: `combine ${number} now`, held: String(number), heldTone: "miss" }), plates: platesOf(pile, "miss") },
      });
    }

    if (operator === "+" || operator === "-") pile.push(applyOp(operator, 0, number));
    else pile.push(applyOp(operator, pile.pop() ?? 0, number));
    fullest = Math.max(fullest, pile.length);
    const top = pile[pile.length - 1];
    frames.push({
      scene,
      caption:
        operator === "+" || operator === "-"
          ? `Set down a signed plate ${top}. Last op becomes ${isOp(c) ? c : "end"}.`
          : `Change the top plate with ${operator}: it is now ${top}. Last op becomes ${isOp(c) ? c : "end"}.`,
      codeLine: line(operator === "+" ? 7 : operator === "-" ? 8 : operator === "*" ? 9 : 10),
      state: { ...base(tokens, pile, i, { banner: `last op ${isOp(c) ? c : "end"}` }), plates: platesOf(pile, "done") },
    });
    operator = c;
    number = 0;
  }

  const total = pile.reduce((sum, value) => sum + value, 0);
  frames.push({
    scene,
    caption: practice ? `Add the plates. The answer is ${total}.` : `Add every signed plate. The answer is ${total}.`,
    codeLine: line(17),
    state: { ...base(tokens, pile, null, { result: String(total) }), plates: platesOf(pile, "done"), tokenTones: tones(tokens.length, () => "done") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${s.length} characters is read once, and each plate is set down or changed at most once.`,
      codeLine: 3,
      state: { ...blank(tokens), result: String(total), counter: { label: "chars read", value: s.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). The pile holds one signed plate per + or - term. Here it held ${fullest}.`,
      codeLine: 0,
      state: { ...blank(tokens), result: String(total), pileLit: true, plates: platesOf(pile, "window"), counter: { label: "plates at fullest", value: fullest } },
    });
  }
  return frames;
}

export const basicCalculatorIIStory: ProblemStory<PlateStackState> = {
  slugs: ["lc-227"],
  pattern: "Stack",
  trigger: "an infix string of + - * / with no parentheses, and * / bind tighter than + -",
  insight: "Signed plates. Plus and minus wait. Star and slash change the top plate now. Left to right with no extra binding misses *.",
  metaphor: {
    name: "The plate pile",
    legend: "pile = signed terms · last op = remembered operator · * / change the top plate · + - set a signed plate down",
    terms: ["plate", "pile", "top"],
  },
  traps: [
    {
      name: "The Left-to-Right Trap",
      rule: "Do not add or subtract as soon as you see the next number. * and / must change the top plate first.",
    },
  ],
  template: [
    "remember last op as +; build the number;",
    "on a new op (or the end):",
    "    + / - : set a signed plate down;",
    "    * / / : change the top plate now;",
    "then last op = this op;",
    "add the plates;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each character is read once; each plate is set down or changed at most once",
    space: "O(n)",
    spaceWhy: "the pile holds one signed plate per plus or minus term",
  },
  code: CODE,
  examples: [
    { label: '"3+2*2"', input: '"3+2*2"', expected: "7" },
    { label: '" 3/2 "', input: '" 3/2 "', expected: "1" },
    { label: '"14-3/2"', input: '"14-3/2"', expected: "13" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-150", title: "Evaluate Reverse Polish Notation" },
    { slug: "lc-8", title: "String to Integer (atoi)" },
    { slug: "lc-394", title: "Decode String" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const s = parse(input);
    const tokens = [...s];
    const value = solve(s);
    return [
      ...pictureFrames(s),
      ...slowFrames(s),
      ...insightFrames(s),
      ...solutionFrames(s),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(tokens), result: String(value), plates: platesOf([value], "done") },
      },
    ];
  },
  View: GrokPlateStackView,
};
