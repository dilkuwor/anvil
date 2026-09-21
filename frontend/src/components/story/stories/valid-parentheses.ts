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

const PRACTICE = '"(){[}]"';

const CODE = [
  "Deque<Character> pile = new ArrayDeque<>();",
  "for (char c : s.toCharArray()) {",
  "    if (c == '(') pile.addFirst(')');",
  "    else if (c == '[') pile.addFirst(']');",
  "    else if (c == '{') pile.addFirst('}');",
  "    else if (pile.isEmpty() || pile.removeFirst() != c) return false;",
  "}",
  "return pile.isEmpty();",
];

const WANT: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

function parse(raw: string): string {
  const quoted = raw.match(/"([^"]*)"/);
  if (quoted) return quoted[1];
  return raw.trim().replace(/^s\s*=\s*/, "");
}

function solve(s: string): boolean {
  const pile: string[] = [];
  for (const c of s) {
    const need = WANT[c];
    if (need) pile.push(need);
    else if (pile.pop() !== c) return false;
  }
  return pile.length === 0;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function platesOf(pile: string[], topTone?: CellTone): Plate[] {
  return pile.map((label, index) => ({ label, tone: index === pile.length - 1 ? topTone : "idle" }));
}

function blank(tokens: string[]): PlateStackState {
  return { tokens, tokenTones: tones(tokens.length, () => null), cursor: null, plates: [], stackTitle: "needed closers" };
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
  return Math.max(0, [...s].findIndex((c) => !WANT[c]));
}

function firstMismatch(s: string): number | null {
  const pile: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const need = WANT[s[i]];
    if (need) pile.push(need);
    else if (pile.pop() !== s[i]) return i;
  }
  return null;
}

function closerQuiz(state: PlateStackState, pile: string[]): StoryQuiz {
  const empty = pile.length === 0;
  const answer = empty ? nonePick(state) : topPlatePick(state);
  const feedback: Record<number, string> = {};
  state.tokens.forEach((_, index) => {
    if (index !== answer) feedback[index] = "That is a mark in the row. The closer looks at the pile.";
  });
  pile.forEach((label, fromBottom) => {
    const idx = state.tokens.length + (state.askNone ? 1 : 0) + fromBottom;
    if (idx === answer) return;
    feedback[idx] = `That plate wants ${label}, but it is not on top. Taking it would cross the pairs.`;
  });
  if (!empty) feedback[nonePick(state)] = "The pile still has a plate. Look at the top one.";
  return {
    kind: "cell",
    cells: pickCount(state),
    question: "A closer arrived. Which plate must it match? Click that plate, or none if the pile is empty.",
    answer,
    feedback,
    otherwise: "A closer matches only the plate on top of the pile.",
    why: empty ? "The pile has no plate waiting, so this closer is extra." : "The top plate is the closer the latest opener still needs.",
  };
}

function pictureFrames(s: string): Frame[] {
  const tokens = [...s];
  const ok = solve(s);
  const mismatch = firstMismatch(s);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "Each opener writes the closer it still needs on a plate. A closer may take only the plate on top.",
      state: blank(tokens),
    },
  ];
  if (ok) {
    frames.push({
      scene: "picture",
      caption: `"${s}" is allowed: every closer took the top plate, and the pile ended empty.`,
      state: { ...blank(tokens), tokenTones: tones(tokens.length, () => "done"), result: "true" },
    });
  } else if (mismatch != null) {
    frames.push({
      scene: "picture",
      caption: `"${s.slice(0, mismatch + 1)}" is not allowed. ${s[mismatch]} does not match the closer sitting on top.`,
      state: {
        ...blank(tokens),
        cursor: mismatch,
        tokenTones: tones(tokens.length, (index) => (index === mismatch ? "miss" : index < mismatch ? "window" : null)),
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: true if every needed closer arrives in pile order, false if any pair is crossed.",
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
            ? `The slow way: keep rubbing out whole pairs (), [], {}. This pass reads ${prev.length} marks.`
            : `Another pass. "${prev}" becomes "${next || "(empty)"}". Each pass copies what is left.`,
        state: {
          ...blank(tokens),
          tokenTones: tones(tokens.length, () => "window"),
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
  for (let i = 0; i < at; i++) {
    const need = WANT[s[i]];
    if (need) pile.push(need);
  }
  const closer = s[at];
  const top = pile[pile.length - 1];
  const match = top === closer;
  return [
    {
      scene: "insight",
      caption: "Picture a pile of plates. An opener does not sit as itself. It writes the closer it still needs.",
      state: { ...blank(tokens), plates: platesOf(pile, "window"), cursor: at > 0 ? at - 1 : null },
    },
    {
      scene: "insight",
      caption: `The closer in hand is ${closer}. It may take only the top plate${top ? `, which wants ${top}` : ", but the pile is empty"}.`,
      state: { ...base(tokens, pile, at, { held: closer, heldTone: match ? "edge" : "miss", askNone: pile.length === 0 }), plates: platesOf(pile, "window") },
    },
    match
      ? {
          scene: "insight",
          caption: `${closer} matches the top plate, so the latest opener is shut. A matching plate lower down must keep waiting.`,
          state: { ...base(tokens, pile.slice(0, -1), at), plates: platesOf(pile.slice(0, -1), "done") },
        }
      : {
          scene: "insight",
          caption: `The Crossing Trap. ${closer} would match a plate below, but the top plate is ${top ?? "missing"}. Crossing is false.`,
          state: { ...base(tokens, pile, at, { held: closer, heldTone: "miss", xMark: true }), plates: platesOf(pile, "miss") },
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
      : "The pile starts empty. Each opener will write the closer it still needs on a plate.",
    codeLine: line(0),
    state: blank(tokens),
  });

  const failOut = (i: number, caption: string, code: number, extra: Partial<PlateStackState>): Frame[] => {
    frames.push({
      scene,
      caption,
      codeLine: line(code),
      state: { ...base(tokens, pile, i, { result: "false", ...extra }), tokenTones: tones(tokens.length, (index) => (index === i ? "miss" : index < i ? "faded" : null)) },
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
        caption: `Space: O(n). The pile holds one needed closer per open pair. Here it held ${fullest} plate${fullest === 1 ? "" : "s"} at its fullest.`,
        codeLine: 0,
        state: { ...blank(tokens), result: "false", pileLit: true, plates: platesOf(Array.from({ length: Math.max(fullest, 0) }, () => ")"), "window"), counter: { label: "plates at fullest", value: fullest } },
      });
    }
    return frames;
  };

  for (let i = 0; i < tokens.length; i++) {
    const c = tokens[i];
    const need = WANT[c];
    if (need) {
      pile.push(need);
      fullest = Math.max(fullest, pile.length);
      frames.push({
        scene,
        caption: `${c} is an opener. Set down a plate that wants ${need}. That plate is now on top.`,
        codeLine: line(c === "(" ? 2 : c === "[" ? 3 : 4),
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

    if (pile.length === 0) return failOut(i, `The pile is empty, so this closer has no plate to take. The answer is false.`, 5, { held: c, heldTone: "miss", xMark: true });

    const top = pile[pile.length - 1];
    const match = top === c;
    if (!match && !showedTrap && !practice) {
      showedTrap = true;
      frames.push({
        scene,
        caption: `The Crossing Trap. ${c} would match a plate below, but the top plate wants ${top}. Crossing is not allowed.`,
        codeLine: line(5),
        state: { ...base(tokens, pile, i, { held: c, heldTone: "miss", xMark: true }), plates: platesOf(pile, "miss") },
      });
    }
    pile.pop();
    if (!match) return failOut(i, `${c} does not match the top plate ${top}, so we stop. The answer is false.`, 5, { held: c, heldTone: "miss", xMark: true, plates: platesOf([...pile, top], "miss") });

    frames.push({
      scene,
      caption: `${c} matches the top plate, so we take that plate off the pile.`,
      codeLine: line(5),
      state: { ...base(tokens, pile, i), plates: platesOf(pile, pile.length ? "edge" : undefined) },
    });
  }

  const ok = pile.length === 0;
  frames.push({
    scene,
    caption: ok
      ? `The pile is empty. Every needed closer arrived in order. The answer is true.`
      : `Needed closers are still on the pile. The answer is false.`,
    codeLine: line(7),
    state: { ...base(tokens, pile, null, { result: ok ? "true" : "false" }), tokenTones: tones(tokens.length, () => (ok ? "done" : "miss")) },
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
      caption: `Space: O(n). The pile holds one needed closer per open pair. Here it held ${fullest} plate${fullest === 1 ? "" : "s"} at its fullest.`,
      codeLine: 0,
      state: { ...blank(tokens), result: ok ? "true" : "false", pileLit: true, plates: platesOf(Array.from({ length: Math.max(fullest, 0) }, () => ")"), "window"), counter: { label: "plates at fullest", value: fullest } },
    });
  }
  return frames;
}

export const validParenthesesStory: ProblemStory<PlateStackState> = {
  slugs: ["lc-20"],
  pattern: "Stack",
  trigger: "a string of (), [], {}, and you must say whether they close in the right order",
  insight: "A pile of plates. Each opener writes the closer it still needs. A closer may take only the top plate. Crossing a pair is false.",
  metaphor: {
    name: "The plate pile",
    legend: "pile = stack of needed closers · top plate = closer the latest opener wants · set down = push · take = pop",
    terms: ["plate", "pile", "top"],
  },
  traps: [
    {
      name: "The Crossing Trap",
      rule: "A closer must equal the top plate. Matching a plate further down would cross the pairs, as in ([)].",
    },
  ],
  template: [
    "pile of needed closers;",
    "for each mark {",
    "    if opener: set down the closer it wants;",
    "    else take the top plate, or false if empty or a mismatch;",
    "}",
    "true only if the pile is empty;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each mark is read once; each plate is set down or taken at most once",
    space: "O(n)",
    spaceWhy: "the pile holds one needed closer per unmatched opener",
  },
  code: CODE,
  examples: [
    { label: '"()"', input: '"()"', expected: "true" },
    { label: '"{[]}"', input: '"{[]}"', expected: "true", note: "Inner pair first" },
    { label: '"([)]"', input: '"([)]"', expected: "false", note: "Crossed pairs" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "balanced-brackets", title: "Balanced Brackets" },
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
        state: { ...blank(tokens), result: ok ? "true" : "false", tokenTones: tones(tokens.length, () => (ok ? "done" : "idle")), plates: ok ? [] : platesOf([")", "]"], "miss") },
      },
    ];
  },
  View: GrokPlateStackView,
};
