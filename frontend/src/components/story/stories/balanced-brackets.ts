import type { CellTone } from "@/components/learn/viz/primitives";

import {
  GrokPlateStackView,
  nonePick,
  pickCount,
  topPlatePick,
  type Plate,
  type PlateStackState,
} from "../grok-plate-stack-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<PlateStackState>;

const PRACTICE = '"()([)]"';

const CODE = [
  "Deque<Character> pile = new ArrayDeque<>();",
  "for (char c : s.toCharArray()) {",
  "    if (c == '(' || c == '[' || c == '{') {",
  "        pile.addFirst(c);",
  "    } else {",
  "        if (pile.isEmpty()) return false;",
  "        char o = pile.removeFirst();",
  "        if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) {",
  "            return false;",
  "        }",
  "    }",
  "}",
  "return pile.isEmpty();",
];

const OPEN = new Set(["(", "[", "{"]);
const PAIR: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function parse(raw: string): string {
  const quoted = raw.match(/"([^"]*)"/);
  if (quoted) return quoted[1];
  return raw.trim().replace(/^s\s*=\s*/, "");
}

function solve(s: string): boolean {
  const pile: string[] = [];
  for (const c of s) {
    if (OPEN.has(c)) pile.push(c);
    else if (pile.pop() !== PAIR[c]) return false;
  }
  return pile.length === 0;
}

function kindCounts(s: string): { label: string; value: number; tone?: CellTone }[] {
  const keys = ["(", ")", "[", "]", "{", "}"];
  return keys.map((label) => ({ label, value: [...s].filter((c) => c === label).length })).filter((row) => row.value > 0);
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function platesOf(pile: string[], topTone?: CellTone): Plate[] {
  return pile.map((label, index) => ({ label, tone: index === pile.length - 1 ? topTone : "idle" }));
}

function blank(tokens: string[]): PlateStackState {
  return { tokens, tokenTones: tones(tokens.length, () => null), cursor: null, plates: [], stackTitle: "plate pile" };
}

function base(tokens: string[], pile: string[], cursor: number | null, extra: Partial<PlateStackState> = {}): PlateStackState {
  return {
    ...blank(tokens),
    cursor,
    plates: platesOf(pile),
    tokenTones: tones(tokens.length, (index) => (index === cursor ? "edge" : index < (cursor ?? -1) ? "faded" : null)),
    ...extra,
  };
}

function firstCloser(s: string): number {
  return Math.max(0, [...s].findIndex((c) => !OPEN.has(c)));
}

function firstMismatch(s: string): number | null {
  const pile: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (OPEN.has(c)) pile.push(c);
    else if (pile.pop() !== PAIR[c]) return i;
  }
  return null;
}

function closerQuiz(state: PlateStackState, pile: string[]): StoryQuiz {
  const empty = pile.length === 0;
  const answer = empty ? nonePick(state) : topPlatePick(state);
  const feedback: Record<number, string> = {};
  state.tokens.forEach((_, index) => {
    if (index !== answer) feedback[index] = "That is a mark in the row. The closer looks at the pile, not back along the row.";
  });
  pile.forEach((label, fromBottom) => {
    const idx = state.tokens.length + (state.askNone ? 1 : 0) + fromBottom;
    if (idx === answer) return;
    feedback[idx] = `That plate is ${label}, under the top. A closer can only take the plate on top.`;
  });
  if (!empty) feedback[nonePick(state)] = "The pile is not empty. Look at the plate on top.";
  return {
    kind: "cell",
    cells: pickCount(state),
    question: "A closer arrived. Which plate must it match? Click that plate, or none if the pile is empty.",
    answer,
    feedback,
    otherwise: "A closer takes only the plate on top of the pile.",
    why: empty ? "The pile has no plate, so this closer has nothing to match." : "The closer must match the plate on top, the last opener that is still waiting.",
  };
}

function pictureFrames(s: string): Frame[] {
  const tokens = [...s];
  const ok = solve(s);
  const mismatch = firstMismatch(s);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Each box is a bracket. An opener waits. A closer must shut the opener that is still open, not just any opener of that kind.`,
      state: blank(tokens),
    },
  ];
  if (ok) {
    frames.push({
      scene: "picture",
      caption: `"${s}" is allowed: every closer shuts the opener that was still open, and nothing is left waiting.`,
      state: { ...blank(tokens), tokenTones: tones(tokens.length, () => "done"), result: "true" },
    });
  } else if (mismatch != null) {
    const seen = s.slice(0, mismatch + 1);
    frames.push({
      scene: "picture",
      caption: `"${seen}" is not allowed. ${s[mismatch]} does not shut the opener that is still open.`,
      state: {
        ...blank(tokens),
        cursor: mismatch,
        tokenTones: tones(tokens.length, (index) => (index === mismatch ? "miss" : index < mismatch ? "window" : null)),
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: say true if every opener is shut in order, and false if any closer takes the wrong opener.",
    state: { ...blank(tokens), result: ok ? "true" : "false", tokenTones: tones(tokens.length, () => (ok ? "done" : "idle")) },
  });
  return frames;
}

function slowFrames(s: string): Frame[] {
  const tokens = [...s];
  const frames: Frame[] = [];
  let cur = s;
  let scans = 0;
  let pass = 0;
  let prev = "";
  while (cur !== prev) {
    prev = cur;
    scans += cur.length;
    const next = cur.replaceAll("()", "").replaceAll("[]", "").replaceAll("{}", "");
    pass++;
    if (pass <= 3 && prev.length > 0) {
      frames.push({
        scene: "slow",
        caption:
          pass === 1
            ? `The slow way: keep rubbing out (), [], and {} as whole pairs. This pass reads ${prev.length} marks.`
            : `Another pass. "${prev}" becomes "${next || "(empty)"}". Each pass copies the leftover marks.`,
        state: {
          ...blank(tokens),
          tokenTones: tones(tokens.length, () => "window"),
          banner: next === prev ? "no pair to rub out" : `pass ${pass}`,
          result: next || "(empty)",
          counter: { label: "marks read", value: scans },
        },
      });
    }
    cur = next;
  }
  const ok = cur.length === 0;
  frames.push({
    scene: "slow",
    caption: ok
      ? `Nothing is left after ${pass} pass${pass === 1 ? "" : "es"}. We read ${scans} marks for a string of ${s.length}. This is O(n²) time.`
      : `Leftovers "${cur}" would not rub out. We read ${scans} marks for a string of ${s.length}. This is O(n²) time.`,
    state: {
      ...blank(tokens),
      tokenTones: tones(tokens.length, () => (ok ? "done" : "miss")),
      result: ok ? "true" : "false",
      counter: { label: "marks read", value: scans },
    },
  });
  return frames;
}

function insightFrames(s: string): Frame[] {
  const tokens = [...s];
  const at = firstCloser(s);
  const pile: string[] = [];
  for (let i = 0; i < at; i++) if (OPEN.has(s[i])) pile.push(s[i]);
  const closer = s[at];
  const top = pile[pile.length - 1];
  const match = top !== undefined && PAIR[closer] === top;
  return [
    {
      scene: "insight",
      caption: "Picture a pile of plates. Each opener is a plate you set down. The last plate you set down sits on top.",
      state: { ...blank(tokens), plates: platesOf(pile, "window"), cursor: at > 0 ? at - 1 : null },
    },
    {
      scene: "insight",
      caption: `A closer may take only the top plate. Here the closer is ${closer}, and the top plate is ${top ?? "missing"}.`,
      state: {
        ...base(tokens, pile, at, { held: closer, heldTone: match ? "edge" : "miss", askNone: pile.length === 0 }),
        plates: platesOf(pile, "window"),
      },
    },
    match
      ? {
          scene: "insight",
          caption: `${closer} matches the top plate, so it may take it. Kind counts are not enough: the order of the pile is the order that matters.`,
          state: { ...base(tokens, pile.slice(0, -1), at), plates: platesOf(pile.slice(0, -1), "done") },
        }
      : {
          scene: "insight",
          caption: `The Count Trap. Kind counts can look even, but ${closer} cannot take the top plate ${top ?? "(none)"}. Order is the pile.`,
          state: {
            ...base(tokens, pile, at, {
              held: closer,
              heldTone: "miss",
              xMark: true,
              counts: kindCounts(s.slice(0, at + 1)).map((row) => ({ ...row, tone: "miss" as const })),
            }),
            plates: platesOf(pile, "miss"),
          },
        },
  ];
}

function solutionFrames(s: string, scene: SceneId = "solution", practice = false): Frame[] {
  const tokens = [...s];
  const frames: Frame[] = [];
  const pile: string[] = [];
  let asked = false;
  let showedTrap = false;
  let fullest = 0;
  const line = (index: number) => (practice ? undefined : index);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new string: "${s}". You choose which plate each closer takes.`
      : "The pile starts empty. We read one mark at a time from the left.",
    codeLine: line(0),
    state: blank(tokens),
  });

  for (let i = 0; i < tokens.length; i++) {
    const c = tokens[i];
    if (OPEN.has(c)) {
      pile.push(c);
      fullest = Math.max(fullest, pile.length);
      frames.push({
        scene,
        caption: `${c} is an opener. Set it down as a plate. The top of the pile is now ${c}.`,
        codeLine: line(3),
        state: { ...base(tokens, pile, i), plates: platesOf(pile, "edge") },
      });
      continue;
    }

    const ask = practice || !asked;
    const before = base(tokens, pile, i, { held: c, askNone: true });
    const clash: Frame = {
      scene,
      caption: ask ? `The next mark is a closer. The pile has ${pile.length} plate${pile.length === 1 ? "" : "s"}.` : `Closer ${c} looks at the top plate.`,
      codeLine: line(5),
      state: before,
    };
    if (ask) {
      asked = true;
      clash.quiz = closerQuiz(before, pile);
    }
    frames.push(clash);

    if (pile.length === 0) {
      frames.push({
        scene,
        caption: `The pile is empty, so this closer has no plate to take. The answer is false.`,
        codeLine: line(5),
        state: { ...base(tokens, pile, i, { held: c, heldTone: "miss", xMark: true, result: "false" }), tokenTones: tones(tokens.length, (index) => (index === i ? "miss" : index < i ? "faded" : null)) },
      });
      if (!practice) {
        frames.push({
          scene,
          caption: `Time: O(n). Each mark is read once. Here we stopped after ${i + 1} mark${i === 0 ? "" : "s"}.`,
          codeLine: 1,
          state: { ...blank(tokens), result: "false", counter: { label: "marks read", value: i + 1 } },
        });
        frames.push({
          scene,
          caption: `Space: O(n). The pile holds unmatched openers. Here it stayed empty.`,
          codeLine: 0,
          state: { ...blank(tokens), result: "false", pileLit: true, counter: { label: "plates at fullest", value: fullest } },
        });
      }
      return frames;
    }

    const top = pile[pile.length - 1];
    const match = PAIR[c] === top;
    if (!match && !showedTrap && !practice) {
      showedTrap = true;
      frames.push({
        scene,
        caption: `The Count Trap. Counts of ${c} and ${PAIR[c]} can look fine, but ${c} cannot take the top plate ${top}.`,
        codeLine: line(7),
        state: {
          ...base(tokens, pile, i, {
            held: c,
            heldTone: "miss",
            xMark: true,
            counts: kindCounts(s.slice(0, i + 1)).map((row) => ({ ...row, tone: "miss" as const })),
          }),
          plates: platesOf(pile, "miss"),
        },
      });
    }

    pile.pop();
    if (!match) {
      frames.push({
        scene,
        caption: `${c} does not match the top plate ${top}, so we stop. The answer is false.`,
        codeLine: line(8),
        state: {
          ...base(tokens, pile, i, { held: c, heldTone: "miss", xMark: true, result: "false" }),
          plates: platesOf([...pile, top], "miss"),
        },
      });
      if (!practice) {
        frames.push({
          scene,
          caption: `Time: O(n). Each mark is read once, and each plate is set down or taken at most once.`,
          codeLine: 1,
          state: { ...blank(tokens), result: "false", counter: { label: "marks read", value: i + 1 } },
        });
        frames.push({
          scene,
          caption: `Space: O(n). The pile holds unmatched openers. Here it held ${fullest} plate${fullest === 1 ? "" : "s"} at its fullest.`,
          codeLine: 0,
          state: { ...blank(tokens), result: "false", pileLit: true, plates: platesOf(Array.from({ length: fullest }, () => "("), "window"), counter: { label: "plates at fullest", value: fullest } },
        });
      }
      return frames;
    }

    frames.push({
      scene,
      caption: `${c} matches the top plate ${top}, so we take that plate off the pile.`,
      codeLine: line(6),
      state: { ...base(tokens, pile, i), plates: platesOf(pile, pile.length ? "edge" : undefined) },
    });
  }

  const ok = pile.length === 0;
  frames.push({
    scene,
    caption: ok
      ? practice
        ? `The pile is empty. Every closer took the top plate. The answer is true.`
        : `The pile is empty at the end. Every opener got a closer. The answer is true.`
      : `Openers are still on the pile. They never got a closer. The answer is false.`,
    codeLine: line(12),
    state: { ...base(tokens, pile, null, { result: ok ? "true" : "false" }), tokenTones: tones(tokens.length, () => (ok ? "done" : "miss")), plates: platesOf(pile, ok ? "done" : "miss") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${s.length} marks is read once, and each plate is set down or taken at most once.`,
      codeLine: 1,
      state: { ...blank(tokens), result: ok ? "true" : "false", tokenTones: tones(tokens.length, () => (ok ? "done" : "miss")), counter: { label: "marks read", value: s.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). The pile holds unmatched openers, at most the whole string. Here it held ${fullest} plate${fullest === 1 ? "" : "s"} at its fullest.`,
      codeLine: 0,
      state: { ...blank(tokens), result: ok ? "true" : "false", pileLit: true, plates: platesOf(Array.from({ length: Math.max(fullest, 0) }, () => "("), "window"), counter: { label: "plates at fullest", value: fullest } },
    });
  }
  return frames;
}

export const balancedBracketsStory: ProblemStory<PlateStackState> = {
  slugs: ["balanced-brackets"],
  pattern: "Stack",
  trigger: "a string of brackets, and you must say whether every opener is closed in the right order",
  insight: "A pile of plates. Each opener is a plate. A closer may take only the top plate. Kind counts can look even while the order is wrong.",
  metaphor: {
    name: "The plate pile",
    legend: "pile = stack of unmatched openers · top plate = last opener · set down = push · take = pop",
    terms: ["plate", "pile", "top"],
  },
  traps: [
    {
      name: "The Count Trap",
      rule: "Even counts of each kind are not enough. The closer must match the latest unmatched opener, which sits on top of the pile.",
    },
  ],
  template: [
    "pile of openers;",
    "for each mark {",
    "    if opener: set it down;",
    "    else take the top plate, or false if empty or a mismatch;",
    "}",
    "true only if the pile is empty;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each mark is read once; each plate is set down or taken at most once",
    space: "O(n)",
    spaceWhy: "the pile holds unmatched openers, at most the whole string",
  },
  code: CODE,
  examples: [
    { label: '"()"', input: '"()"', expected: "true" },
    { label: '"{[]}"', input: '"{[]}"', expected: "true", note: "Inner pair first, then the outer pair" },
    { label: '"([)]"', input: '"([)]"', expected: "false", note: "Counts match; order does not" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-20", title: "Valid Parentheses" },
    { slug: "lc-394", title: "Decode String" },
    { slug: "lc-22", title: "Generate Parentheses" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const s = parse(input);
    const tokens = [...s];
    const ok = solve(s);
    return [
      ...pictureFrames(s),
      ...slowFrames(s),
      ...insightFrames(s),
      ...solutionFrames(s),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(tokens),
          plates: ok ? [] : platesOf(["(", "["], "miss"),
          result: ok ? "true" : "false",
          tokenTones: tones(tokens.length, () => (ok ? "done" : "idle")),
        },
      },
    ];
  },
  View: GrokPlateStackView,
};
