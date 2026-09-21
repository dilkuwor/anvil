import { GrokBitsView, type GrokBitCell, type GrokBitsState } from "../grok-bits-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokBitsState>;

const PRACTICE = "100";

const CODE = [
  "if (x < 0 || (x % 10 == 0 && x != 0)) return false;",
  "int rev = 0;",
  "while (x > rev) {",
  "    rev = rev * 10 + x % 10;",
  "    x /= 10;",
  "}",
  "return x == rev || x == rev / 10;",
];

function parse(raw: string): number {
  return Number(raw.trim());
}

function digitsOf(n: number): GrokBitCell[] {
  if (n === 0) return [{ text: "0", tone: "idle" }];
  return String(n).split("").map((d) => ({ text: d, tone: "idle" as const }));
}

function blank(x: number, rev: number): GrokBitsState {
  return {
    bits: digitsOf(x),
    bitsLabel: "left half",
    changedBit: null,
    values: [
      { text: String(x), tone: "window" },
      { text: String(rev), tone: "done" },
    ],
    cursor: null,
    mixLabel: "rev",
    mixValue: String(rev),
    row: { label: "right half", cells: digitsOf(rev) },
    note: null,
    trapNote: null,
    counter: null,
    pickOn: "values",
  };
}

function isMirror(x: number): boolean {
  if (x < 0) return false;
  const s = String(x);
  return s === [...s].reverse().join("");
}

function halfReverse(x0: number): boolean {
  if (x0 < 0 || (x0 % 10 === 0 && x0 !== 0)) return false;
  let x = x0;
  let rev = 0;
  while (x > rev) {
    rev = rev * 10 + (x % 10);
    x = Math.floor(x / 10);
  }
  return x === rev || x === Math.floor(rev / 10);
}

function pictureFrames(x: number): Frame[] {
  const ok = halfReverse(x);
  return [
    { scene: "picture", caption: `Is ${x} a mirror: the same forwards and backwards? Negatives are not.`, state: blank(x, 0) },
    ok
      ? {
          scene: "picture",
          caption: `${x} reads the same both ways. It is a mirror.`,
          state: { ...blank(x, 0), bits: digitsOf(x).map((c) => ({ ...c, tone: "done" })), note: "mirror" },
        }
      : {
          scene: "picture",
          caption: x < 0 ? "A negative is never a mirror." : `${x} is not a mirror.`,
          state: { ...blank(x, 0), bits: digitsOf(Math.abs(x)).map((c) => ({ ...c, tone: "miss" })) },
        },
    x > 0 && x % 10 === 0
      ? {
          scene: "picture",
          caption: "A trailing zero would vanish if we reversed the whole number, so this cannot be a mirror.",
          state: { ...blank(x, 0), trapNote: "trailing zero", bits: digitsOf(x).map((c, i, a) => ({ ...c, tone: i === a.length - 1 ? "miss" : "idle" })) },
        }
      : {
          scene: "picture",
          caption: "We will reverse only the second half of the digits, not the whole number.",
          state: blank(x, 0),
        },
    {
      scene: "picture",
      caption: `The goal: true if it is a mirror, false if not. Here it is ${ok}.`,
      state: { ...blank(x, 0), mixLabel: "mirror", mixValue: String(ok) },
    },
  ];
}

function slowFrames(x: number): Frame[] {
  const frames: Frame[] = [];
  if (x < 0) {
    return [
      { scene: "slow", caption: "The slow way: write every digit, then compare ends. A negative fails at once.", state: { ...blank(x, 0), counter: { label: "digits written", value: "0" } } },
      { scene: "slow", caption: "That uses extra memory for the whole string. This is O(d) space.", state: { ...blank(x, 0), counter: { label: "digits written", value: "0" } } },
    ];
  }
  const s = String(x);
  let i = 0;
  let j = s.length - 1;
  let looks = 0;
  while (i < j) {
    looks++;
    frames.push({
      scene: "slow",
      caption: i === 0 ? `The slow way: write all ${s.length} digits, then compare the two ends.` : `Compare ${s[i]} with ${s[j]}.`,
      state: {
        ...blank(x, 0),
        bits: digitsOf(x).map((c, idx) => ({ ...c, tone: idx === i || idx === j ? (s[i] === s[j] ? "window" : "miss") : "idle" })),
        counter: { label: "pairs compared", value: String(looks) },
      },
    });
    if (s[i] !== s[j]) break;
    i++;
    j--;
  }
  frames.push({
    scene: "slow",
    caption: `We wrote every digit. This is O(d) extra space. Reverse only the second half instead.`,
    state: { ...blank(x, 0), counter: { label: "digits written", value: String(s.length) } },
  });
  return frames;
}

function insightFrames(x: number): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Picture two halves. Peel digits from the right onto a reversed half until it is at least as long as what remains.",
      state: blank(x, 0),
    },
    {
      scene: "insight",
      caption: "For an odd length, the middle digit sits on the reversed half. Compare with that half divided by 10.",
      state: { ...blank(x, 0), note: "odd: drop the middle" },
    },
    {
      scene: "insight",
      caption: "The Trailing Zero Trap: reversing 10 would drop the zero and look like 1. Reject a trailing zero at the start, except 0 itself.",
      state: { ...blank(x, 0), trapNote: "The Trailing Zero Trap" },
    },
  ];
}

function zeroQuiz(x: number): StoryQuiz {
  const trailing = x !== 0 && x % 10 === 0;
  return {
    kind: "choice",
    question: "The number ends in 0. Is it a mirror?",
    options: ["Yes, reverse it and compare", "No, unless the number is 0 itself"],
    answer: trailing ? 1 : x === 0 ? 1 : 1,
    why: "The Trailing Zero Trap: a reverse would drop that zero. Only 0 is a mirror that ends in 0.",
  };
}

function peelQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "The left half is still longer than the reversed half. What do we peel?",
    options: ["The leftmost digit of x", "The rightmost digit of x, onto the reversed half"],
    answer: 1,
    why: "Peel from the right. Append x modulo 10 onto rev, then drop that digit from x.",
  };
}

function solutionFrames(x0: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let x = x0;
  let rev = 0;
  let askedPeel = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new number: ${x0}. Watch the trailing zero.` : "First reject negatives and trailing zeros (except 0).",
    codeLine: line(0),
    state: blank(x, 0),
  });

  if (x < 0 || (x % 10 === 0 && x !== 0)) {
    const digits = digitsOf(Math.abs(x));
    if (x % 10 === 0 && x !== 0) {
      const answer = digits.length - 1;
      const feedback: Record<number, string> = {};
      digits.forEach((_, i) => {
        if (i === answer) return;
        feedback[i] = "That digit is not the trailing zero.";
      });
      frames.push({
        scene,
        caption: "This number ends in 0. Which digit is the trailing zero? Click that digit.",
        codeLine: line(0),
        quiz: {
          kind: "cell",
          cells: digits.length,
          numbered: true,
          question: "Which digit is the trailing zero? Click that digit.",
          answer,
          feedback,
          otherwise: "The trailing zero is the last digit on the right.",
          why: "A reverse would drop that last zero, so this cannot be a mirror unless the number is 0.",
        },
        state: { ...blank(x, 0), pickOn: "bits", bits: digits, trapNote: "The Trailing Zero Trap" },
      });
    }
    frames.push({
      scene,
      caption: x < 0 ? "A negative is not a mirror." : "The Trailing Zero Trap! This number ends in 0 and is not 0, so it is not a mirror.",
      codeLine: line(0),
      quiz: x % 10 === 0 ? zeroQuiz(x) : undefined,
      state: { ...blank(x, 0), trapNote: x % 10 === 0 ? "The Trailing Zero Trap" : null, mixLabel: "mirror", mixValue: "false" },
    });
    frames.push({
      scene,
      caption: practice ? "Done. The answer is false." : "The answer is false.",
      codeLine: line(0),
      state: { ...blank(x, 0), mixLabel: "mirror", mixValue: "false" },
    });
  } else {
    if (practice) {
      frames.push({
        scene,
        caption: "This number does not end in a trailing zero. Still, remember that trap.",
        quiz: zeroQuiz(10),
        state: { ...blank(x, 0), trapNote: "The Trailing Zero Trap" },
      });
    }
    while (x > rev) {
      const look: Frame = {
        scene,
        caption: `Left half ${x} is still greater than reversed half ${rev}.`,
        codeLine: line(2),
        state: blank(x, rev),
      };
      if (practice || !askedPeel) {
        askedPeel = true;
        look.quiz = peelQuiz();
      }
      frames.push(look);
      rev = rev * 10 + (x % 10);
      x = Math.floor(x / 10);
      frames.push({
        scene,
        caption: `Peel the right digit onto the reversed half. Left ${x}, reversed ${rev}.`,
        codeLine: line(3),
        state: blank(x, rev),
      });
    }
    const ok = x === rev || x === Math.floor(rev / 10);
    frames.push({
      scene,
      caption: ok
        ? x === rev
          ? `Even length: the halves match. The answer is true.`
          : `Odd length: drop the middle digit of the reversed half. The answer is true.`
        : `The halves do not match. The answer is false.`,
      codeLine: line(6),
      state: { ...blank(x, rev), mixLabel: "mirror", mixValue: String(ok) },
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(d). We peel about half the digits. d is how many digits ${x0} has.`,
      codeLine: 2,
      state: { ...blank(x0, 0), counter: { label: "digits", value: String(String(Math.abs(x0)).length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only x and the reversed half. No string of digits.",
      codeLine: 1,
      state: { ...blank(x0, 0), counter: { label: "numbers stored", value: "2" } },
    });
  }
  return frames;
}

export const mirrorNumberStory: ProblemStory<GrokBitsState> = {
  slugs: ["mirror-number"],
  pattern: "Reverse half the digits",
  trigger: "is this integer a mirror: the same forwards and backwards. Negatives are not",
  insight: "Peel digits from the right onto a reversed half until it is at least as long as what remains. Reject a trailing zero at the start, except 0.",
  metaphor: { name: "The two halves", legend: "left half = remaining x · right half = rev · middle = rev/10 on odd length", terms: ["half", "peel", "digit", "mirror"] },
  traps: [
    {
      name: "The Trailing Zero Trap",
      rule: "If x ends in 0 and x is not 0, return false at the start. A reverse would drop that zero.",
    },
  ],
  template: [
    "if negative or (ends in 0 and not 0): return false",
    "rev = 0",
    "while x > rev: peel right digit onto rev",
    "return x == rev or x == rev/10",
  ],
  complexity: {
    slow: "O(d)",
    time: "O(d)",
    timeWhy: "you peel about half the digits",
    space: "O(1)",
    spaceWhy: "only x and rev; no string of digits",
  },
  code: CODE,
  examples: [
    { label: "121", input: "121", expected: "true" },
    { label: "10", input: "10", expected: "false", note: "Trailing zero." },
    { label: "1221", input: "1221", expected: "true" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-125", title: "Valid Palindrome" },
    { slug: "lc-234", title: "Palindrome Linked List" },
    { slug: "lc-680", title: "Valid Palindrome II" },
  ],
  answer: (input) => String(isMirror(parse(input))),
  frames: (input) => {
    const x = parse(input);
    const ok = halfReverse(x);
    return [
      ...pictureFrames(x),
      ...slowFrames(x),
      ...insightFrames(x),
      ...solutionFrames(x),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(x, 0), mixLabel: "mirror", mixValue: String(ok) },
      },
    ];
  },
  View: GrokBitsView,
};
