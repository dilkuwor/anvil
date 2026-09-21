import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokStringRowView, type GrokStringRowState } from "../grok-string-row-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokStringRowState>;

const PRACTICE = "abba";

const CODE = [
  "int bestStart = 0, bestLen = 1;",
  "for (int center = 0; center < s.length(); center++) {",
  "    int len = Math.max(expand(s, center, center), expand(s, center, center + 1));",
  "    if (len > bestLen) {",
  "        bestLen = len;",
  "        bestStart = center - (len - 1) / 2;",
  "    }",
  "}",
  "return s.substring(bestStart, bestStart + bestLen);",
];

function parse(raw: string): string {
  return raw.trim().replace(/^"|"$/g, "");
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(s: string): GrokStringRowState {
  return { chars: s.split(""), tones: tones(s.length, () => null), left: null, right: null, band: null, lastSeen: null, trapCut: null, result: null, note: null, trapNote: null, counter: null };
}

function expand(s: string, left: number, right: number): [number, number] {
  while (left >= 0 && right < s.length && s[left] === s[right]) {
    left--;
    right++;
  }
  return [left + 1, right - 1];
}

function solve(s: string): { start: number; len: number; text: string } {
  let bestStart = 0;
  let bestLen = 1;
  for (let i = 0; i < s.length; i++) {
    for (let j = i; j < s.length; j++) {
      let a = i;
      let b = j;
      let ok = true;
      while (a < b) {
        if (s[a] !== s[b]) {
          ok = false;
          break;
        }
        a++;
        b--;
      }
      if (ok && j - i + 1 > bestLen) {
        bestLen = j - i + 1;
        bestStart = i;
      }
    }
  }
  return { start: bestStart, len: bestLen, text: s.slice(bestStart, bestStart + bestLen) };
}

function greedy(s: string): { start: number; len: number; text: string } {
  let bestStart = 0;
  let bestLen = 1;
  for (let center = 0; center < s.length; center++) {
    const odd = expand(s, center, center);
    const even = expand(s, center, center + 1);
    for (const [a, b] of [odd, even]) {
      const len = b >= a ? b - a + 1 : 0;
      if (len > bestLen) {
        bestLen = len;
        bestStart = a;
      }
    }
  }
  return { start: bestStart, len: bestLen, text: s.slice(bestStart, bestStart + bestLen) };
}

function pictureFrames(s: string): Frame[] {
  const best = greedy(s);
  const even = s.split("").findIndex((_, i) => i + 1 < s.length && s[i] === s[i + 1]);
  return [
    { scene: "picture", caption: `Each box is a letter. We want the longest palindrome sitting inside "${s}".`, state: blank(s) },
    {
      scene: "picture",
      caption: `An allowed palindrome is "${best.text}", length ${best.len}. On a tie we keep the leftmost.`,
      state: { ...blank(s), band: [best.start, best.start + best.len - 1], result: `"${best.text}"`, tones: tones(s.length, (i) => (i >= best.start && i < best.start + best.len ? "done" : null)) },
    },
    even >= 0
      ? {
          scene: "picture",
          caption: `An even palindrome sits on the gap between two letters, like "${s.slice(even, even + 2)}".`,
          state: { ...blank(s), band: [even, even + 1], left: { index: even, label: "left" }, right: { index: even + 1, label: "right" } },
        }
      : {
          scene: "picture",
          caption: "A one-letter palindrome is always allowed.",
          state: { ...blank(s), band: [0, 0] },
        },
    {
      scene: "picture",
      caption: `The goal: the longest palindrome, leftmost on a tie. Here it is "${best.text}".`,
      state: { ...blank(s), result: `"${best.text}"`, band: [best.start, best.start + best.len - 1] },
    },
  ];
}

function slowFrames(s: string): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  let bestStart = 0;
  let bestLen = 1;
  for (let i = 0; i < s.length; i++) {
    for (let j = i; j < s.length; j++) {
      let a = i;
      let b = j;
      let ok = true;
      while (a < b) {
        checks++;
        if (s[a] !== s[b]) {
          ok = false;
          break;
        }
        a++;
        b--;
      }
      if (j === i) checks++;
      if (ok && j - i + 1 > bestLen) {
        bestLen = j - i + 1;
        bestStart = i;
      }
    }
    if (i < 2) {
      frames.push({
        scene: "slow",
        caption: i === 0 ? "The slow way: try every slice and walk inward to test it." : `Start at box ${i} and test every later end, rereading letters.`,
        state: { ...blank(s), left: { index: i, label: "start" }, counter: { label: "letters compared", value: String(checks) } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We compared ${checks} letter pairs. This is O(n³) time. Too slow when the row is long.`,
    state: { ...blank(s), band: [bestStart, bestStart + bestLen - 1], counter: { label: "letters compared", value: String(checks) } },
  });
  return frames;
}

function insightFrames(s: string): Frame[] {
  const evenCenter = s.split("").findIndex((_, i) => i + 1 < s.length && s[i] === s[i + 1]);
  return [
    {
      scene: "insight",
      caption: "Picture a palindrome growing from its centre: a letter, or the gap between two letters.",
      state: { ...blank(s), left: { index: 0, label: "left" }, right: { index: 0, label: "right" }, band: [0, 0] },
    },
    {
      scene: "insight",
      caption: evenCenter >= 0
        ? `The Even Center Trap skips the gap. "${s.slice(evenCenter, evenCenter + 2)}" would never be found.`
        : "Also expand from each gap, or even palindromes are never found.",
      state: {
        ...blank(s),
        trapNote: "The Even Center Trap",
        left: evenCenter >= 0 ? { index: evenCenter, label: "left" } : null,
        right: evenCenter >= 0 ? { index: evenCenter + 1, label: "right" } : null,
        band: evenCenter >= 0 ? [evenCenter, evenCenter + 1] : null,
      },
    },
    {
      scene: "insight",
      caption: "Expand while the two sides match. Keep the longest, and on a tie keep the first.",
      state: { ...blank(s), result: `"${greedy(s).text}"` },
    },
  ];
}

function evenQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "We just tried a centre on a single letter. What else must we try?",
    options: ["Nothing. Odd palindromes cover every case", "Also expand from the gap after this letter"],
    answer: 1,
    why: "The Even Center Trap only expands around a letter. Even palindromes sit on a gap.",
  };
}

function sideQuiz(s: string, left: number, right: number): StoryQuiz {
  const match = left >= 0 && right < s.length && s[left] === s[right];
  return {
    kind: "choice",
    question: "Look at the two sides of this centre. Do we keep expanding?",
    options: ["Yes, the two letters match", "No, stop. The sides differ or we walked off the row"],
    answer: match ? 0 : 1,
    why: match ? "The two sides match, so the palindrome can grow one step." : "Expand only while both sides exist and the letters match.",
  };
}

function solutionFrames(s: string, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let bestStart = 0;
  let bestLen = 1;
  let askedEven = false;
  let askedSide = false;
  let showedTrap = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: "${s}". Try odd and even centres.` : "Best starts as the first letter, length 1.",
    codeLine: line(0),
    state: { ...blank(s), band: [0, 0], result: `"${s[0] ?? ""}"` },
  });

  let detailed = 0;
  for (let center = 0; center < s.length; center++) {
    const draw = practice || detailed < 2;
    if (!draw) {
      for (const [L, R] of [
        [center, center],
        [center, center + 1],
      ] as const) {
        const [a, b] = expand(s, L, R);
        const len = b >= a ? b - a + 1 : 0;
        if (len > bestLen) {
          bestLen = len;
          bestStart = a;
        }
      }
      continue;
    }
    detailed++;
    const evenAsk: Frame = {
      scene,
      caption: `Centre on letter ${s[center]}. An odd palindrome grows from here.`,
      codeLine: line(2),
      state: { ...blank(s), left: { index: center, label: "left" }, right: { index: center, label: "right" }, band: [center, center] },
    };
    if (practice || !askedEven) {
      askedEven = true;
      evenAsk.quiz = evenQuiz();
    }
    frames.push(evenAsk);
    if (!showedTrap && !practice) {
      showedTrap = true;
      frames.push({
        scene,
        caption: "The Even Center Trap! Stopping after the odd centre would miss a palindrome that sits on a gap.",
        codeLine: line(2),
        state: { ...blank(s), trapNote: "The Even Center Trap", left: { index: center, label: "left" }, right: center + 1 < s.length ? { index: center + 1, label: "gap" } : null },
      });
    }

    for (const [L, R, kind] of [
      [center, center, "odd"],
      [center, center + 1, "even"],
    ] as const) {
      let left = L;
      let right = R;
      if (kind === "even" && center + 1 >= s.length) continue;
      const grow: Frame = {
        scene,
        caption: kind === "odd" ? "Expand around this letter." : "Now expand around the gap after it.",
        codeLine: line(2),
        state: {
          ...blank(s),
          left: left >= 0 && left < s.length ? { index: left, label: "left" } : null,
          right: right >= 0 && right < s.length ? { index: right, label: "right" } : null,
        },
      };
      if (practice || !askedSide) {
        askedSide = true;
        grow.quiz = sideQuiz(s, left, right);
      }
      frames.push(grow);
      while (left >= 0 && right < s.length && s[left] === s[right]) {
        left--;
        right++;
      }
      const a = left + 1;
      const b = right - 1;
      const len = b >= a ? b - a + 1 : 0;
      if (len > 0) {
        frames.push({
          scene,
          caption: `This ${kind} palindrome is "${s.slice(a, b + 1)}", length ${len}.`,
          codeLine: line(3),
          state: { ...blank(s), band: [a, b], left: { index: a, label: "left" }, right: { index: b, label: "right" } },
        });
      }
      if (len > bestLen) {
        bestLen = len;
        bestStart = a;
        frames.push({
          scene,
          caption: `${len} is a new best. Keep "${s.slice(a, b + 1)}".`,
          codeLine: line(4),
          state: { ...blank(s), band: [a, b], result: `"${s.slice(a, b + 1)}"`, tones: tones(s.length, (i) => (i >= a && i <= b ? "done" : null)) },
        });
      }
    }
  }
  if (!practice && s.length > 2) {
    frames.push({
      scene,
      caption: "The remaining centres expand the same way. None of them beat the best we already have, or they update it quietly.",
      codeLine: line(2),
      state: { ...blank(s), band: [bestStart, bestStart + bestLen - 1], result: `"${s.slice(bestStart, bestStart + bestLen)}"` },
    });
  }

  const text = s.slice(bestStart, bestStart + bestLen);
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${text}. You tried every gap.` : `Every centre was tried. The answer is ${text}.`,
    codeLine: line(8),
    state: { ...blank(s), result: `"${text}"`, band: [bestStart, bestStart + bestLen - 1] },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n²). Each of the 2n - 1 centres expands at most n steps.`,
      codeLine: 1,
      state: { ...blank(s), result: `"${text}"`, counter: { label: "centres", value: String(2 * s.length - 1) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two expand pointers and the best start and length.",
      codeLine: 0,
      state: { ...blank(s), result: `"${text}"`, counter: { label: "numbers stored", value: "4" } },
    });
  }
  return frames;
}

export const longestPalindromeStory: ProblemStory<GrokStringRowState> = {
  slugs: ["lc-5"],
  pattern: "Expand around center",
  trigger: "return the longest palindromic substring. On a tie, the leftmost one",
  insight: "A palindrome grows from its centre: a letter, or the gap between two letters. Expand while the two sides match, and keep the longest leftmost run.",
  metaphor: { name: "The growing centre", legend: "centre = a letter or a gap · left/right = expand pointers · best = longest so far", terms: ["centre", "gap", "expand", "side"] },
  traps: [
    {
      name: "The Even Center Trap",
      rule: "Also expand from the gap after each letter. Even palindromes sit on a gap, not on a letter.",
    },
  ],
  template: [
    "best = first letter",
    "for each centre:",
    "    expand odd (centre, centre) and even (centre, centre+1)",
    "    if longer than best: keep it (strictly longer keeps leftmost)",
    "return the slice",
  ],
  complexity: {
    slow: "O(n³)",
    time: "O(n²)",
    timeWhy: "each of the 2n - 1 centres expands at most n steps",
    space: "O(1)",
    spaceWhy: "only the two expand pointers and the best start and length",
  },
  code: CODE,
  examples: [
    { label: "babad", input: "babad", expected: "bab" },
    { label: "cbbd", input: "cbbd", expected: "bb" },
    { label: "a", input: "a", expected: "a" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-125", title: "Valid Palindrome" },
    { slug: "lc-647", title: "Palindromic Substrings" },
    { slug: "lc-680", title: "Valid Palindrome II" },
  ],
  answer: (input) => solve(parse(input)).text,
  frames: (input) => {
    const s = parse(input);
    const best = greedy(s);
    return [
      ...pictureFrames(s),
      ...slowFrames(s),
      ...insightFrames(s),
      ...solutionFrames(s),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(s), result: `"${best.text}"`, band: [best.start, best.start + best.len - 1] },
      },
    ];
  },
  View: GrokStringRowView,
};
