import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokStringRowView, type GrokStringRowState } from "../grok-string-row-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokStringRowState>;

const PRACTICE = "2147483648";
const MAX = 2147483647;
const MIN = -2147483648;

const CODE = [
  "int i = 0, n = s.length();",
  "while (i < n && s.charAt(i) == ' ') i++;",
  "if (i == n) return 0;",
  "int sign = 1;",
  "if (s.charAt(i) == '+' || s.charAt(i) == '-') {",
  "    sign = s.charAt(i) == '-' ? -1 : 1;",
  "    i++;",
  "}",
  "int result = 0;",
  "while (i < n && Character.isDigit(s.charAt(i))) {",
  "    int digit = s.charAt(i) - '0';",
  "    if (result > 2147483647 / 10",
  "            || (result == 2147483647 / 10 && digit > 7)) {",
  "        return sign == 1 ? 2147483647 : -2147483648;",
  "    }",
  "    result = result * 10 + digit;",
  "    i++;",
  "}",
  "return result * sign;",
];

function parse(raw: string): string {
  const quoted = raw.match(/^"(.*)"$/);
  return quoted ? quoted[1] : raw;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(s: string): GrokStringRowState {
  return { chars: s.split(""), tones: tones(s.length, () => null), left: null, right: null, band: null, lastSeen: null, trapCut: null, result: null, note: null, trapNote: null, counter: null };
}

function atoi(s: string): number {
  let i = 0;
  const n = s.length;
  while (i < n && s[i] === " ") i++;
  if (i === n) return 0;
  let sign = 1;
  if (s[i] === "+" || s[i] === "-") {
    sign = s[i] === "-" ? -1 : 1;
    i++;
  }
  let result = 0;
  while (i < n && s[i] >= "0" && s[i] <= "9") {
    const digit = s.charCodeAt(i) - 48;
    if (result > Math.floor(MAX / 10) || (result === Math.floor(MAX / 10) && digit > 7)) {
      return sign === 1 ? MAX : MIN;
    }
    result = result * 10 + digit;
    i++;
  }
  return result * sign;
}

function pictureFrames(s: string): Frame[] {
  const value = atoi(s);
  const firstDigit = s.split("").findIndex((ch) => ch >= "0" && ch <= "9");
  return [
    { scene: "picture", caption: "Boxes are characters. Read optional spaces, one sign, then digits, and clamp to 32-bit range.", state: blank(s) },
    {
      scene: "picture",
      caption: firstDigit >= 0 ? `Digits may start at box ${firstDigit}. Anything after the digit run is ignored.` : "If no digit follows the sign, the answer is 0.",
      state: { ...blank(s), tones: tones(s.length, (i) => (s[i] >= "0" && s[i] <= "9" ? "done" : s[i] === " " ? "faded" : null)) },
    },
    {
      scene: "picture",
      caption: "Overflow must be caught before multiplying by 10, not after the wrap.",
      state: { ...blank(s), trapNote: "clamp before multiply" },
    },
    {
      scene: "picture",
      caption: `The goal: the 32-bit number. Here it is ${value}.`,
      state: { ...blank(s), result: String(value) },
    },
  ];
}

function slowFrames(s: string): Frame[] {
  const frames: Frame[] = [];
  let i = 0;
  while (i < s.length && s[i] === " ") i++;
  if (i < s.length && (s[i] === "+" || s[i] === "-")) i++;
  const start = i;
  while (i < s.length && s[i] >= "0" && s[i] <= "9") i++;
  const run = s.slice(start, i);
  frames.push({
    scene: "slow",
    caption: "The slow way: copy the digit run into a big integer, then clamp.",
    state: { ...blank(s), band: run ? [start, i - 1] : null, counter: { label: "digits copied", value: String(run.length) } },
  });
  frames.push({
    scene: "slow",
    caption: `That copies ${run.length || 0} digits into extra memory. We can clamp on the way instead.`,
    state: { ...blank(s), result: String(atoi(s)), counter: { label: "digits copied", value: String(run.length) } },
  });
  return frames;
}

function insightFrames(s: string): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Picture a careful parse: skip spaces, read one sign, then only digits.",
      state: { ...blank(s), tones: tones(s.length, (i) => (s[i] === " " ? "faded" : s[i] === "+" || s[i] === "-" ? "window" : s[i] >= "0" && s[i] <= "9" ? "done" : "miss")) },
    },
    {
      scene: "insight",
      caption: "Before multiplying by 10, compare the result with the 32-bit ceiling divided by 10.",
      state: { ...blank(s), note: "check, then multiply" },
    },
    {
      scene: "insight",
      caption: "The After Multiply Trap wraps past the ceiling, then notices too late. Clamp first.",
      state: { ...blank(s), trapNote: "The After Multiply Trap" },
    },
  ];
}

function digitQuiz(s: string, i: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  s.split("").forEach((ch, idx) => {
    if (idx === i) return;
    feedback[idx] = ch === " " ? "Spaces were already skipped." : ch < "0" || ch > "9" ? "That is not a digit. The run stops here." : "Read the next digit in the run.";
  });
  return {
    kind: "cell",
    cells: s.length,
    numbered: true,
    question: "Which box is the next digit to add? Click that box.",
    answer: i,
    feedback,
    otherwise: "After spaces and one sign, read digits from left to right.",
    why: "Only digits after the optional sign count. Stop at the first non-digit.",
  };
}

function clampQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "The next digit might overflow. When do we clamp?",
    options: ["After multiplying by 10, then notice the wrap", "Before multiplying, against the 32-bit ceiling divided by 10"],
    answer: 1,
    why: "The After Multiply Trap wraps the int, then the check is too late. Compare first, then multiply.",
  };
}

function solutionFrames(s: string, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let i = 0;
  const n = s.length;
  let askedDigit = false;
  let askedClamp = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row. Clamp before you multiply.` : "Walk past leading spaces. Result starts at 0.",
    codeLine: line(1),
    state: blank(s),
  });

  while (i < n && s[i] === " ") {
    frames.push({
      scene,
      caption: "Skip a leading space.",
      codeLine: line(1),
      state: { ...blank(s), right: { index: i, label: "here" }, tones: tones(n, (j) => (j === i ? "faded" : null)) },
    });
    i++;
  }
  if (i === n) {
    frames.push({ scene, caption: practice ? "Done. The answer is 0." : "The answer is 0.", codeLine: line(2), state: { ...blank(s), result: "0" } });
  } else {
    let sign = 1;
    if (s[i] === "+" || s[i] === "-") {
      sign = s[i] === "-" ? -1 : 1;
      frames.push({
        scene,
        caption: `Read one sign: ${s[i] === "-" ? "minus" : "plus"}.`,
        codeLine: line(5),
        state: { ...blank(s), right: { index: i, label: "sign" }, tones: tones(n, (j) => (j === i ? "window" : j < i ? "faded" : null)) },
      });
      i++;
    }
    let result = 0;
    let digitsRead = 0;
    while (i < n && s[i] >= "0" && s[i] <= "9") {
      const digit = s.charCodeAt(i) - 48;
      const look: Frame = {
        scene,
        caption: `The next character is a digit ${digit}. Result is ${result}.`,
        codeLine: line(10),
        state: { ...blank(s), right: { index: i, label: "here" }, result: String(result), tones: tones(n, (j) => (j === i ? "edge" : j < i ? "faded" : null)) },
      };
      if ((practice || !askedDigit) && digitsRead < 3) {
        askedDigit = true;
        look.quiz = digitQuiz(s, i);
      }
      frames.push(look);

      const overflow = result > Math.floor(MAX / 10) || (result === Math.floor(MAX / 10) && digit > 7);
      if (overflow || ((practice || !askedClamp) && result >= Math.floor(MAX / 100))) {
        const clamp: Frame = {
          scene,
          caption: overflow ? "This digit would overflow the 32-bit ceiling." : "Before multiplying, check the ceiling.",
          codeLine: line(11),
          state: { ...blank(s), right: { index: i, label: "here" }, result: String(result), trapNote: "The After Multiply Trap" },
        };
        if (practice || !askedClamp) {
          askedClamp = true;
          clamp.quiz = clampQuiz();
        }
        frames.push(clamp);
      }
      if (overflow) {
        const clamped = sign === 1 ? MAX : MIN;
        frames.push({
          scene,
          caption: `The After Multiply Trap would wrap first. Clamp now. The answer is ${clamped}.`,
          codeLine: line(13),
          state: { ...blank(s), result: String(clamped), trapNote: "The After Multiply Trap" },
        });
        if (!practice) {
          frames.push({
            scene,
            caption: `Time: O(n). Each character is looked at at most once.`,
            codeLine: 9,
            state: { ...blank(s), result: String(clamped), counter: { label: "characters read", value: String(i + 1) } },
          });
          frames.push({
            scene,
            caption: "Space: O(1). Only the index, the sign, and the running result.",
            codeLine: 8,
            state: { ...blank(s), result: String(clamped), counter: { label: "numbers stored", value: "3" } },
          });
        }
        return frames;
      }
      result = result * 10 + digit;
      frames.push({
        scene,
        caption: `Safe. Result becomes ${result}.`,
        codeLine: line(15),
        state: { ...blank(s), right: { index: i, label: "here" }, result: String(result), tones: tones(n, (j) => (j <= i ? (s[j] >= "0" && s[j] <= "9" ? "done" : "faded") : null)) },
      });
      i++;
      digitsRead++;
      if (!practice && digitsRead >= 3 && i < n && s[i] >= "0" && s[i] <= "9") {
        while (i < n && s[i] >= "0" && s[i] <= "9") {
          const d = s.charCodeAt(i) - 48;
          if (result > Math.floor(MAX / 10) || (result === Math.floor(MAX / 10) && d > 7)) {
            result = sign === 1 ? MAX : MIN;
            i = n;
            break;
          }
          result = result * 10 + d;
          i++;
        }
        frames.push({
          scene,
          caption: `The rest of the digit run is the same check. Result is ${result}.`,
          codeLine: line(15),
          state: { ...blank(s), result: String(result) },
        });
        break;
      }
    }
    const value = result * sign;
    frames.push({
      scene,
      caption: practice ? `Done. The answer is ${value}. You clamped before multiplying.` : `Stop at the first non-digit. The answer is ${value}.`,
      codeLine: line(18),
      state: { ...blank(s), result: String(value) },
    });
  }
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each character is looked at at most once.`,
      codeLine: 9,
      state: { ...blank(s), result: String(atoi(s)), counter: { label: "characters read", value: String(s.length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the index, the sign, and the running result.",
      codeLine: 8,
      state: { ...blank(s), result: String(atoi(s)), counter: { label: "numbers stored", value: "3" } },
    });
  }
  return frames;
}

export const atoiStory: ProblemStory<GrokStringRowState> = {
  slugs: ["lc-8"],
  pattern: "String parsing",
  trigger: "parse a string into a 32-bit integer: spaces, an optional sign, then digits, then clamp",
  insight: "Skip leading spaces, read one sign, then read digits. Check overflow before multiplying, and stop at the first non-digit.",
  metaphor: { name: "The careful parse", legend: "here = i · sign = +1/-1 · result = running int · clamp = return MAX or MIN", terms: ["skip", "sign", "digit", "clamp"] },
  traps: [
    {
      name: "The After Multiply Trap",
      rule: "Compare result to the 32-bit ceiling divided by 10 before multiplying. Digit 8 or 9 at that edge also clamps.",
    },
  ],
  template: [
    "skip spaces; read one optional sign",
    "for each digit:",
    "    if result would overflow: return MAX or MIN",
    "    result = result * 10 + digit",
    "return result * sign",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(n)",
    timeWhy: "each character is looked at at most once",
    space: "O(1)",
    spaceWhy: "only the index, the sign, and the running result",
  },
  code: CODE,
  examples: [
    { label: "42", input: '"42"', expected: "42" },
    { label: "spaces minus", input: '"   -42"', expected: "-42" },
    { label: "words after", input: '"4193 with"', expected: "4193" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-43", title: "Multiply Strings" },
    { slug: "lc-227", title: "Basic Calculator II" },
    { slug: "lc-273", title: "Integer to English Words" },
  ],
  answer: (input) => String(atoi(parse(input))),
  frames: (input) => {
    const s = parse(input);
    return [
      ...pictureFrames(s),
      ...slowFrames(s),
      ...insightFrames(s),
      ...solutionFrames(s),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(s), result: String(atoi(s)) },
      },
    ];
  },
  View: GrokStringRowView,
};
