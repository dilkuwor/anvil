import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokStringRowView, type GrokStringRowState } from "../grok-string-row-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokStringRowState>;

const PRACTICE = "  a   b  ";

const CODE = [
  "char[] a = s.toCharArray();",
  "reverse(a, 0, a.length - 1);",
  "reverseEachWord(a);",
  "return compact(a);",
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

function reverseWords(s: string): string {
  return s.trim().split(/\s+/).filter(Boolean).reverse().join(" ");
}

function reverseRange(chars: string[], i: number, j: number) {
  while (i < j) {
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
    i++;
    j--;
  }
}

function pictureFrames(s: string): Frame[] {
  const answer = reverseWords(s);
  const extra = /\s{2,}/.test(s) || s.startsWith(" ") || s.endsWith(" ");
  return [
    { scene: "picture", caption: "Boxes are characters, including spaces. We want the words in reverse order, with one space between them.", state: blank(s) },
    {
      scene: "picture",
      caption: `The allowed answer is "${answer}". Letters inside a word stay in order.`,
      state: { ...blank(s), result: `"${answer}"`, tones: tones(s.length, (i) => (s[i] === " " ? "faded" : "done")) },
    },
    extra
      ? {
          scene: "picture",
          caption: "Splitting on a single space would keep empty words from the extra spaces.",
          state: { ...blank(s), trapNote: "empty words from extra spaces", tones: tones(s.length, (i) => (s[i] === " " ? "miss" : null)) },
        }
      : {
          scene: "picture",
          caption: "Edge spaces must go. The answer has none.",
          state: blank(s),
        },
    {
      scene: "picture",
      caption: `The goal: words reversed, one space, no edges. Here it is "${answer}".`,
      state: { ...blank(s), result: `"${answer}"` },
    },
  ];
}

function slowFrames(s: string): Frame[] {
  const frames: Frame[] = [];
  let rest = s.trim();
  let copies = 0;
  const out: string[] = [];
  while (rest.length && frames.length < 4) {
    copies += rest.length;
    const i = rest.lastIndexOf(" ");
    const word = i < 0 ? rest : rest.slice(i + 1);
    out.push(word);
    rest = i < 0 ? "" : rest.slice(0, i).trim();
    frames.push({
      scene: "slow",
      caption: out.length === 1 ? `The slow way: peel the last word "${word}", then recopy whatever remains.` : `Peel "${word}" and recopy the remaining characters.`,
      state: { ...blank(s), result: out.join(" "), counter: { label: "characters copied", value: String(copies) } },
    });
  }
  while (rest.length) {
    copies += rest.length;
    const i = rest.lastIndexOf(" ");
    rest = i < 0 ? "" : rest.slice(0, i).trim();
  }
  frames.push({
    scene: "slow",
    caption: `We recopied ${copies} characters. This is O(n²) time on a long row of short words.`,
    state: { ...blank(s), result: reverseWords(s), counter: { label: "characters copied", value: String(copies) } },
  });
  return frames;
}

function insightFrames(s: string): Frame[] {
  const chars = s.split("");
  const flipped = [...chars].reverse().join("");
  return [
    {
      scene: "insight",
      caption: "Picture a flip of the whole row. Word order reverses, but letters inside a word reverse too.",
      state: { ...blank(flipped), note: "whole row flipped" },
    },
    {
      scene: "insight",
      caption: "Flip each word back so its letters are restored. Then compact extra spaces.",
      state: { ...blank(s), result: `"${reverseWords(s)}"` },
    },
    {
      scene: "insight",
      caption: "The One Space Trap: splitting on a single space keeps empty words from extra spaces. Skip runs of spaces instead.",
      state: { ...blank(s), trapNote: "The One Space Trap", tones: tones(s.length, (i) => (s[i] === " " ? "miss" : null)) },
    },
  ];
}

function wordQuiz(chars: string[], start: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  chars.forEach((ch, i) => {
    if (i === start) return;
    feedback[i] = ch === " " ? "That is a space. Flip the letters of the word, not the gap." : "That letter is not the start of this word.";
  });
  return {
    kind: "cell",
    cells: chars.length,
    numbered: true,
    question: "Which box is the start of this word, so we can flip it back? Click that box.",
    answer: start,
    feedback,
    otherwise: "A word starts at the first letter after a run of spaces.",
    why: "After the whole row is flipped, flip each word so its letters go back to the original order.",
  };
}

function spaceQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "Extra spaces sit between words. How do we split?",
    options: ["Split on one space, and keep the empty pieces", "Skip every run of spaces, so empty words never appear"],
    answer: 1,
    why: "The One Space Trap keeps empty words from double spaces. Skip runs of spaces, then join with one.",
  };
}

function solutionFrames(s: string, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const chars = s.split("");
  let askedWord = false;
  let askedSpace = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row. You skip extra spaces and flip words.` : "Copy the row into letters we can flip.",
    codeLine: line(0),
    state: blank(s),
  });

  reverseRange(chars, 0, chars.length - 1);
  frames.push({
    scene,
    caption: "Flip the whole row. Word order is reversed. Letters inside each word are backwards too.",
    codeLine: line(1),
    state: { ...blank(chars.join("")), note: "whole row flipped" },
  });

  const space: Frame = {
    scene,
    caption: "Extra spaces are still here. They must not become empty words.",
    codeLine: line(3),
    state: { ...blank(chars.join("")), trapNote: "The One Space Trap", tones: tones(chars.length, (i) => (chars[i] === " " ? "miss" : null)) },
  };
  if (practice || !askedSpace) {
    askedSpace = true;
    space.quiz = spaceQuiz();
  }
  frames.push(space);

  let start = 0;
  while (start < chars.length) {
    while (start < chars.length && chars[start] === " ") start++;
    let end = start;
    while (end < chars.length && chars[end] !== " ") end++;
    if (start < end) {
      const look: Frame = {
        scene,
        caption: `A word sits from here through box ${end - 1}. Its letters are still backwards.`,
        codeLine: line(2),
        state: { ...blank(chars.join("")), left: { index: start, label: "start" }, right: { index: end - 1, label: "end" }, band: [start, end - 1] },
      };
      if (practice || !askedWord) {
        askedWord = true;
        look.quiz = wordQuiz(chars, start);
      }
      frames.push(look);
      reverseRange(chars, start, end - 1);
      frames.push({
        scene,
        caption: `Flip that word back. Letters are restored. Word order stays reversed.`,
        codeLine: line(2),
        state: { ...blank(chars.join("")), band: [start, end - 1], tones: tones(chars.length, (i) => (i >= start && i < end ? "done" : chars[i] === " " ? "faded" : null)) },
      });
    }
    start = end;
  }

  const answer = reverseWords(s);
  frames.push({
    scene,
    caption: practice ? `Compact extra spaces. Done. The answer is ${answer}.` : `Compact extra spaces. The answer is ${answer}.`,
    codeLine: line(3),
    state: { ...blank(s), result: `"${answer}"`, tones: tones(s.length, (i) => (s[i] === " " ? "faded" : "done")) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each character is flipped a constant number of times, then copied once.`,
      codeLine: 1,
      state: { ...blank(s), result: `"${answer}"`, counter: { label: "letters", value: String(s.length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(n). Java strings cannot be edited, so the letter copy is the extra memory.",
      codeLine: 0,
      state: { ...blank(s), result: `"${answer}"`, counter: { label: "letters stored", value: String(s.length) } },
    });
  }
  return frames;
}

export const reverseWordsStory: ProblemStory<GrokStringRowState> = {
  slugs: ["lc-151"],
  pattern: "Reverse in place",
  trigger: "reverse the order of the words in a string, and collapse extra spaces",
  insight: "Flip the whole row, flip each word back so its letters are restored, then skip runs of spaces so empty words never appear.",
  metaphor: { name: "The flip then restore", legend: "flip all = reverse the array · restore = reverse each word · compact = skip extra spaces", terms: ["flip", "word", "space", "restore"] },
  traps: [
    {
      name: "The One Space Trap",
      rule: "Splitting on a single space keeps empty words from extra spaces. Skip runs of spaces, or split on one or more spaces after a trim.",
    },
  ],
  template: [
    "reverse the whole letter row",
    "reverse each word so letters return",
    "copy words with one space, skip extra spaces",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each character is reversed a constant number of times, then copied once",
    space: "O(n)",
    spaceWhy: "Java strings cannot be edited, so the char copy is the extra memory",
  },
  code: CODE,
  examples: [
    { label: "hello world", input: '"  hello world  "', expected: "world hello" },
    { label: "a good example", input: '"a good   example"', expected: "example good a" },
    { label: "single", input: '"single"', expected: "single" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-189", title: "Rotate Array" },
    { slug: "lc-206", title: "Reverse Linked List" },
    { slug: "lc-71", title: "Simplify Path" },
  ],
  answer: (input) => reverseWords(parse(input)),
  frames: (input) => {
    const s = parse(input);
    const answer = reverseWords(s);
    return [
      ...pictureFrames(s),
      ...slowFrames(s),
      ...insightFrames(s),
      ...solutionFrames(s),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(s), result: `"${answer}"` },
      },
    ];
  },
  View: GrokStringRowView,
};
