import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokPlateStackView, type Plate, type PlateStackState } from "../grok-plate-stack-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<PlateStackState>;

const PRACTICE = '"12[ab]"';

const CODE = [
  "Deque<Integer> counts = new ArrayDeque<>();",
  "Deque<StringBuilder> texts = new ArrayDeque<>();",
  "StringBuilder current = new StringBuilder();",
  "int count = 0;",
  "for (char c : s.toCharArray()) {",
  "    if (Character.isDigit(c)) {",
  "        count = count * 10 + (c - '0');",
  "    } else if (c == '[') {",
  "        counts.addFirst(count);",
  "        texts.addFirst(current);",
  "        count = 0;",
  "        current = new StringBuilder();",
  "    } else if (c == ']') {",
  "        StringBuilder outer = texts.removeFirst();",
  "        int repeat = counts.removeFirst();",
  "        for (int k = 0; k < repeat; k++) outer.append(current);",
  "        current = outer;",
  "    } else {",
  "        current.append(c);",
  "    }",
  "}",
  "return current.toString();",
];

function parse(raw: string): string {
  const quoted = raw.match(/"([^"]*)"/);
  if (quoted) return quoted[1];
  return raw.trim().replace(/^s\s*=\s*/, "");
}

function solve(s: string): string {
  const counts: number[] = [];
  const texts: string[] = [];
  let current = "";
  let count = 0;
  for (const c of s) {
    if (c >= "0" && c <= "9") count = count * 10 + (c.charCodeAt(0) - 48);
    else if (c === "[") {
      counts.push(count);
      texts.push(current);
      count = 0;
      current = "";
    } else if (c === "]") {
      const outer = texts.pop() ?? "";
      const repeat = counts.pop() ?? 0;
      current = outer + current.repeat(repeat);
    } else current += c;
  }
  return current;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function platesOf(values: string[], topTone?: CellTone): Plate[] {
  return values.map((label, index) => ({ label: label === "" ? "(empty)" : label, tone: index === values.length - 1 ? topTone : "idle" }));
}

function blank(tokens: string[]): PlateStackState {
  return {
    tokens,
    tokenTones: tones(tokens.length, () => null),
    cursor: null,
    plates: [],
    stackTitle: "parked trays",
    otherPlates: [],
    otherTitle: "counts",
    current: "",
    countBuild: 0,
  };
}

function base(
  tokens: string[],
  texts: string[],
  counts: number[],
  current: string,
  count: number,
  cursor: number | null,
  extra: Partial<PlateStackState> = {},
): PlateStackState {
  return {
    ...blank(tokens),
    cursor,
    plates: platesOf(texts),
    otherPlates: counts.map((value, index) => ({ label: String(value), tone: index === counts.length - 1 ? "window" : "idle" })),
    current,
    countBuild: count,
    tokenTones: tones(tokens.length, (index) => (index === cursor ? "edge" : index < (cursor ?? -1) ? "faded" : null)),
    ...extra,
  };
}

function pictureFrames(s: string): Frame[] {
  const tokens = [...s];
  const out = solve(s);
  const multi = /\d{2}/.test(s);
  return [
    {
      scene: "picture",
      caption: "An encoded string nests k[inner]. k may have more than one digit. Inner strings can nest too.",
      state: blank(tokens),
    },
    {
      scene: "picture",
      caption: `Repeating the inner text k times is allowed. The decoded string here is ${out.length > 24 ? `${out.length} letters` : out}.`,
      state: { ...blank(tokens), result: out, tokenTones: tones(tokens.length, () => "done") },
    },
    {
      scene: "picture",
      caption: multi
        ? `Not allowed: reading a two-digit count as only its last digit, so 10[a] would write nothing.`
        : `Not allowed: treating a nested inner string as leftover letters after the first close.`,
      state: { ...blank(tokens), xMark: true, ghostLabel: multi ? "count 0" : "split wrong", current: multi ? "" : s },
    },
    {
      scene: "picture",
      caption: "The goal: the fully expanded string.",
      state: { ...blank(tokens), result: out, current: out },
    },
  ];
}

function slowFrames(s: string): Frame[] {
  const tokens = [...s];
  const frames: Frame[] = [];
  let cur = s;
  let copies = 0;
  let shown = 0;
  while (cur.includes("[")) {
    const close = cur.indexOf("]");
    const open = cur.lastIndexOf("[", close);
    let i = open - 1;
    while (i >= 0 && cur[i] >= "0" && cur[i] <= "9") i--;
    const k = Number(cur.slice(i + 1, open));
    const inner = cur.slice(open + 1, close);
    const repeated = inner.repeat(k);
    copies += cur.length + repeated.length;
    const next = cur.slice(0, i + 1) + repeated + cur.slice(close + 1);
    if (shown < 2) {
      frames.push({
        scene: "slow",
        caption:
          shown === 0
            ? `The slow way: find the first ], take the k[inner] that ends there, and splice the repeat into a new string.`
            : `Next innermost: ${k} copies of "${inner}". Each splice copies the whole string.`,
        state: { ...blank(tokens), current: next.slice(0, 32), counter: { label: "chars copied", value: copies }, result: next.slice(0, 24) },
      });
      shown++;
    }
    cur = next;
  }
  frames.push({
    scene: "slow",
    caption: `Each expansion copied the growing string. We copied ${copies} characters. This is O(n · L) time.`,
    state: { ...blank(tokens), current: cur, result: cur, tokenTones: tones(tokens.length, () => "faded"), counter: { label: "chars copied", value: copies } },
  });
  return frames;
}

function insightFrames(s: string): Frame[] {
  const tokens = [...s];
  const open = s.indexOf("[");
  let count = 0;
  for (let i = 0; i < open; i++) if (s[i] >= "0" && s[i] <= "9") count = count * 10 + (s[i].charCodeAt(0) - 48);
  const two = open >= 2 && s[open - 2] >= "0" && s[open - 2] <= "9";
  return [
    {
      scene: "insight",
      caption: "Picture nested plates. '[' parks the count and the tray so far, then a new inner tray starts.",
      state: { ...blank(tokens), cursor: open >= 0 ? open : null, countBuild: count, current: "" },
    },
    {
      scene: "insight",
      caption: `']' writes the inner tray onto the parked tray, repeated as many times as the parked count.`,
      state: {
        ...blank(tokens),
        plates: platesOf([""], "window"),
        otherPlates: [{ label: String(count || 1), tone: "window" }],
        current: "inner",
      },
    },
    {
      scene: "insight",
      caption: two
        ? `The Single-Digit Trap. ${s[open - 2]}${s[open - 1]} is one count. Keeping only the last digit would park ${s[open - 1]}.`
        : `Parked plates nest. The inner close happens first, then the outer count repeats that result.`,
      state: {
        ...blank(tokens),
        xMark: two,
        ghostLabel: two ? `count ${s[open - 1]}` : undefined,
        countBuild: count,
        otherPlates: [{ label: String(count || 1), tone: two ? "miss" : "done" }],
      },
    },
  ];
}

function solutionFrames(s: string, scene: SceneId = "solution", practice = false): Frame[] {
  const tokens = [...s];
  const frames: Frame[] = [];
  const counts: number[] = [];
  const texts: string[] = [];
  let current = "";
  let count = 0;
  let askedDigit = false;
  let askedClose = false;
  let showedTrap = false;
  let fullest = 0;
  const line = (index: number) => (practice ? undefined : index);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new encoding: "${s}". You build the count and choose when a tray is parked.`
      : "The current tray starts empty. Digits build a count. '[' will park that count and this tray.",
    codeLine: line(3),
    state: blank(tokens),
  });

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= "0" && c <= "9") {
      const digit = c.charCodeAt(0) - 48;
      const next = count * 10 + digit;
      if (count > 0 && (practice || !askedDigit)) {
        askedDigit = true;
        frames.push({
          scene,
          caption: `The count for the next parked plate is ${count}. A new digit arrived.`,
          codeLine: line(6),
          state: base(tokens, texts, counts, current, count, i, { held: c }),
          quiz: {
            kind: "choice",
            question: "What is the count after this digit?",
            options: [String(next), String(digit)],
            answer: 0,
            why: "Multiply the count so far by ten, then add this digit. A two-digit count is one number.",
          },
        });
        if (!showedTrap && !practice) {
          showedTrap = true;
          frames.push({
            scene,
            caption: `The Single-Digit Trap. Keeping only ${digit} would park a ${digit} plate and drop the ${count} you already built.`,
            codeLine: line(6),
            state: base(tokens, texts, counts, current, digit, i, { xMark: true, ghostLabel: `count ${digit}`, held: c, heldTone: "miss" }),
          });
        }
      }
      count = next;
      frames.push({
        scene,
        caption: `Digit ${c}. The count for the next parked plate is now ${count}.`,
        codeLine: line(6),
        state: base(tokens, texts, counts, current, count, i),
      });
      continue;
    }
    if (c === "[") {
      counts.push(count);
      texts.push(current);
      fullest = Math.max(fullest, texts.length);
      frames.push({
        scene,
        caption: `'[' parks count ${count} and the tray "${current || "(empty)"}", then starts a new inner tray.`,
        codeLine: line(8),
        state: base(tokens, texts, counts, "", 0, i, { held: "[" }),
      });
      count = 0;
      current = "";
      continue;
    }
    if (c === "]") {
      const ask = practice || !askedClose;
      const before = base(tokens, texts, counts, current, count, i, { held: "]" });
      const clash: Frame = {
        scene,
        caption: ask ? `']' arrived. An inner tray is done. A parked tray is waiting.` : `']' repeats the inner tray onto the parked tray.`,
        codeLine: line(13),
        state: before,
      };
      if (ask) {
        askedClose = true;
        clash.quiz = {
          kind: "choice",
          question: "What does the current tray become after this close?",
          options: ["The parked tray with the inner text repeated onto it", "The inner text alone, still waiting"],
          answer: 0,
          why: "After ']', the outer parked tray, with the inner text written onto it, is the new current tray.",
        };
      }
      frames.push(clash);
      const outer = texts.pop() ?? "";
      const repeat = counts.pop() ?? 0;
      current = outer + current.repeat(repeat);
      frames.push({
        scene,
        caption: `Write the inner tray ${repeat} time${repeat === 1 ? "" : "s"} onto the parked tray. Current is now "${current.length > 18 ? `${current.length} letters` : current}".`,
        codeLine: line(16),
        state: base(tokens, texts, counts, current, 0, i),
      });
      continue;
    }
    current += c;
    frames.push({
      scene,
      caption: `Letter ${c} goes on the current tray. The tray is now "${current}".`,
      codeLine: line(18),
      state: base(tokens, texts, counts, current, count, i),
    });
  }

  frames.push({
    scene,
    caption: practice ? `The last tray is the decoded string. The answer is ${current}.` : `No marks left. The current tray is the answer. The answer is ${current}.`,
    codeLine: line(21),
    state: { ...base(tokens, texts, counts, current, 0, null, { result: current }), tokenTones: tones(tokens.length, () => "done") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n + L). Each mark of the encoding is read once, and each output letter is written once.`,
      codeLine: 4,
      state: { ...blank(tokens), current, result: current, counter: { label: "output letters", value: current.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n + L). Parked plates follow the nesting, and the trays hold the decoded text. Nesting here was ${fullest}.`,
      codeLine: 0,
      state: { ...blank(tokens), current, result: current, pileLit: true, plates: platesOf(Array.from({ length: Math.max(fullest, 1) }, () => "tray"), "window"), counter: { label: "nested plates", value: fullest } },
    });
  }
  return frames;
}

export const decodeStringStory: ProblemStory<PlateStackState> = {
  slugs: ["lc-394"],
  pattern: "Stack",
  trigger: "a nested encoded string of the form k[substring], and you must expand every repeat",
  insight: "Nested plates. '[' parks the count and the tray so far. ']' repeats the inner tray onto that parked tray. Counts may have more than one digit.",
  metaphor: {
    name: "The plate pile",
    legend: "parked trays = text stack · count plates = k stack · current tray = the inner string being built",
    terms: ["plate", "tray", "park"],
  },
  traps: [
    {
      name: "The Single-Digit Trap",
      rule: "Build the count as count * 10 + digit. A count like 10 is one number, not a 1 followed by a 0-repeat.",
    },
  ],
  template: [
    "digits build count;",
    "'[': park count and current tray, start a new tray;",
    "letter: write it on the current tray;",
    "']': repeat current onto the parked tray, that is the new current;",
  ],
  complexity: {
    slow: "O(n · L)",
    time: "O(n + L)",
    timeWhy: "each mark is read once, and each output letter is written once",
    space: "O(n + L)",
    spaceWhy: "parked plates follow the nesting, and trays hold the decoded text",
  },
  code: CODE,
  examples: [
    { label: '"3[a]"', input: '"3[a]"', expected: "aaa" },
    { label: '"3[a2[c]]"', input: '"3[a2[c]]"', expected: "accaccacc" },
    { label: '"10[a]"', input: '"10[a]"', expected: "aaaaaaaaaa", note: "A two-digit count" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-20", title: "Valid Parentheses" },
    { slug: "lc-71", title: "Simplify Path" },
    { slug: "lc-227", title: "Basic Calculator II" },
  ],
  answer: (input) => solve(parse(input)),
  frames: (input) => {
    const s = parse(input);
    const tokens = [...s];
    const out = solve(s);
    return [
      ...pictureFrames(s),
      ...slowFrames(s),
      ...insightFrames(s),
      ...solutionFrames(s),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(tokens), current: out, result: out },
      },
    ];
  },
  View: GrokPlateStackView,
};
