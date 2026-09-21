import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokTwoPointerStringView, type TwoPointerStringState } from "../grok-two-pointer-string-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TwoPointerStringState>;

/** Fresh string: a comma and a space sit between letters, so skipping junk is the whole decision. */
const PRACTICE = '"A,b a"';

const CODE = [
  "int left = 0, right = s.length() - 1;",
  "while (left < right) {",
  "    while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;",
  "    while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;",
  "    if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) return false;",
  "    left++;",
  "    right--;",
  "}",
  "return true;",
];

function parse(raw: string): string {
  const trimmed = raw.trim();
  const quoted = trimmed.match(/^"(.*)"$/);
  return quoted ? quoted[1] : trimmed;
}

function isWord(ch: string): boolean {
  return /[a-zA-Z0-9]/.test(ch);
}

function fold(ch: string): string {
  return ch.toLowerCase();
}

function show(ch: string): string {
  if (ch === " ") return "a space";
  if (ch === ",") return "a comma";
  if (ch === "!") return "a bang";
  if (ch === ":") return "a colon";
  if (ch === ".") return "a dot";
  return `'${ch}'`;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(chars: string[]): TwoPointerStringState {
  return { chars, tones: tones(chars.length, () => null), left: null, right: null };
}

function solve(s: string): boolean {
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    while (left < right && !isWord(s[left])) left += 1;
    while (left < right && !isWord(s[right])) right -= 1;
    if (fold(s[left]) !== fold(s[right])) return false;
    left += 1;
    right -= 1;
  }
  return true;
}

type Step =
  | { type: "skip"; side: "left" | "right"; from: number; to: number; left: number; right: number }
  | { type: "compare"; left: number; right: number; ok: boolean };

function trace(s: string): { steps: Step[]; ok: boolean } {
  const steps: Step[] = [];
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    const leftFrom = left;
    while (left < right && !isWord(s[left])) left += 1;
    if (left !== leftFrom) steps.push({ type: "skip", side: "left", from: leftFrom, to: left, left, right });
    const rightFrom = right;
    while (left < right && !isWord(s[right])) right -= 1;
    if (right !== rightFrom) steps.push({ type: "skip", side: "right", from: rightFrom, to: right, left, right });
    if (left >= right) break;
    const ok = fold(s[left]) === fold(s[right]);
    steps.push({ type: "compare", left, right, ok });
    if (!ok) return { steps, ok: false };
    left += 1;
    right -= 1;
  }
  return { steps, ok: true };
}

function paintEnds(chars: string[], left: number | null, right: number | null, tone: CellTone = "edge"): TwoPointerStringState {
  return {
    ...blank(chars),
    left,
    right,
    tones: tones(chars.length, (index) => {
      if (!isWord(chars[index])) return "faded";
      if (index === left || index === right) return tone;
      return null;
    }),
  };
}

function pictureFrames(chars: string[], ok: boolean): Frame[] {
  const n = chars.length;
  const letters = chars.map((ch, index) => ({ ch, index })).filter((item) => isWord(item.ch));
  const junk = chars.findIndex((ch) => !isWord(ch));
  const frames: Frame[] = [
    { scene: "picture", caption: `Here is the string. Each box is one character. Spaces show as a dot so you can see them.`, state: blank(chars) },
  ];
  if (letters.length >= 2) {
    const a = letters[0];
    const b = letters[letters.length - 1];
    const match = fold(a.ch) === fold(b.ch);
    frames.push({
      scene: "picture",
      caption: match
        ? `${show(a.ch)} and ${show(b.ch)} are letters, so they count. They match if we ignore case.`
        : `${show(a.ch)} and ${show(b.ch)} are letters, so they count. They do not match.`,
      state: { ...blank(chars), left: a.index, right: b.index, tones: tones(n, (index) => (index === a.index || index === b.index ? (match ? "done" : "miss") : null)) },
    });
  }
  if (junk >= 0) {
    frames.push({
      scene: "picture",
      caption: `${show(chars[junk])} is not a letter or a digit, so it does not count. Comparing it would be a mistake.`,
      state: { ...blank(chars), tones: tones(n, (index) => (index === junk ? "miss" : isWord(chars[index]) ? "hit" : "faded")) },
    });
  }
  frames.push({
    scene: "picture",
    caption: ok
      ? "The goal: after dropping junk and ignoring case, do the remaining characters read the same both ways? Here they do."
      : "The goal: after dropping junk and ignoring case, do the remaining characters read the same both ways? Here they do not.",
    state: {
      ...blank(chars),
      tones: tones(n, (index) => (isWord(chars[index]) ? (ok ? "done" : "window") : "faded")),
    },
  });
  return frames;
}

function slowFrames(chars: string[]): Frame[] {
  const frames: Frame[] = [];
  const cleaned: string[] = [];
  const map: number[] = [];
  let copies = 0;
  chars.forEach((ch, index) => {
    copies += 1;
    if (!isWord(ch)) return;
    if (cleaned.length <= 2) {
      frames.push({
        scene: "slow",
        caption:
          cleaned.length === 0
            ? `The slow way: copy only letters and digits into a new row. Keep ${show(ch)}, skip the rest.`
            : `Copy ${show(ch)} next. Junk is left behind.`,
        state: {
          ...blank(chars),
          left: index,
          tones: tones(chars.length, (i) => (i === index ? "edge" : map.includes(i) ? "done" : isWord(chars[i]) ? null : "faded")),
          counter: { label: "boxes read", value: copies },
        },
      });
    }
    cleaned.push(fold(ch));
    map.push(index);
  });
  const cleanedChars = cleaned.length > 0 ? cleaned : ["·"];
  let checks = copies;
  if (cleaned.length >= 2) {
    const a = 0;
    const b = cleaned.length - 1;
    checks += 1;
    const match = cleaned[a] === cleaned[b];
    frames.push({
      scene: "slow",
      caption: `Now compare the copy from both ends. ${show(cleaned[a])} against ${show(cleaned[b])}${match ? " matches." : " does not match."}`,
      state: {
        chars: cleanedChars,
        tones: tones(cleanedChars.length, (i) => (i === a || i === b ? (match ? "done" : "miss") : "faded")),
        left: a,
        right: b,
        counter: { label: "boxes read", value: checks },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `We read ${copies} boxes to build the copy, then compared it. That is O(n) time, but the copy uses a whole extra row.`,
    state: {
      chars: cleanedChars,
      tones: tones(cleanedChars.length, () => "faded"),
      left: null,
      right: null,
      counter: { label: "boxes read", value: copies },
    },
  });
  return frames;
}

function insightFrames(chars: string[], steps: Step[]): Frame[] {
  const n = chars.length;
  const junk = steps.find((step) => step.type === "skip");
  const compare = steps.find((step) => step.type === "compare");
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Picture two walkers. Left starts on the first box, right on the last. They walk toward each other.",
      state: { ...blank(chars), left: 0, right: n - 1, tones: tones(n, (index) => (index === 0 || index === n - 1 ? "edge" : null)) },
    },
  ];
  if (junk && junk.type === "skip") {
    frames.push({
      scene: "insight",
      caption: `The ${junk.side} walker is on ${show(chars[junk.from])}, which is not a letter or a digit. It does not compare that box. It steps inward.`,
      state: {
        ...blank(chars),
        left: junk.side === "left" ? junk.from : junk.left,
        right: junk.side === "right" ? junk.from : junk.right,
        tones: tones(n, (index) => (index === junk.from ? "miss" : index === junk.left || index === junk.right ? "edge" : null)),
      },
    });
    frames.push({
      scene: "insight",
      caption: "That is the whole idea. Skip junk. Only letters and digits count, and case does not.",
      state: paintEnds(chars, junk.left, junk.right, "window"),
    });
  } else if (compare && compare.type === "compare") {
    frames.push({
      scene: "insight",
      caption: `No junk here. The walkers compare ${show(chars[compare.left])} and ${show(chars[compare.right])}, ignoring case.`,
      state: paintEnds(chars, compare.left, compare.right, compare.ok ? "done" : "miss"),
    });
    frames.push({
      scene: "insight",
      caption: "Skip junk when it appears. Only letters and digits count, and case does not.",
      state: paintEnds(chars, compare.left, compare.right, "window"),
    });
  }
  return frames;
}

function skipQuiz(side: "left" | "right"): StoryQuiz {
  return {
    kind: "choice",
    question: `${side === "left" ? "Left" : "Right"} is on a box. Does that character count in the palindrome, or should the walker skip it?`,
    options: ["It counts: compare it", "It is junk: skip it"],
    answer: 1,
    why: "Only letters and digits count. Anything else is junk, and that walker steps inward past it.",
  };
}

function matchQuiz(ok: boolean, leftCh: string, rightCh: string): StoryQuiz {
  return {
    kind: "choice",
    question: `Do ${show(leftCh)} and ${show(rightCh)} match if we ignore case?`,
    options: ["Yes, they match", "No, they do not match"],
    answer: ok ? 0 : 1,
    why: ok
      ? `Ignoring case, ${show(leftCh)} and ${show(rightCh)} are the same, so both walkers step inward.`
      : `Ignoring case, ${show(leftCh)} and ${show(rightCh)} are still different, so this is not a palindrome.`,
  };
}

function solutionFrames(chars: string[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const { steps, ok } = trace(chars.join(""));
  let askedSkip = false;
  let askedMatch = false;
  let shownTrap = false;
  let left = 0;
  let right = chars.length - 1;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new string: "${chars.join("")}". You decide when a walker skips, and whether a pair matches.`
      : "Left starts on the first box. Right starts on the last box.",
    codeLine: line(0),
    state: { ...blank(chars), left, right, tones: tones(chars.length, (index) => (index === left || index === right ? "edge" : null)) },
  });

  for (const step of steps) {
    if (step.type === "skip") {
      const look: Frame = {
        scene,
        caption: `The ${step.side} walker is on ${show(chars[step.from])}.`,
        codeLine: line(step.side === "left" ? 2 : 3),
        state: {
          ...blank(chars),
          left: step.side === "left" ? step.from : step.left,
          right: step.side === "right" ? step.from : step.right,
          tones: tones(chars.length, (index) => (index === step.from ? "window" : index === left || index === right ? "edge" : !isWord(chars[index]) ? "faded" : null)),
        },
      };
      if (practice || !askedSkip) {
        askedSkip = true;
        look.quiz = skipQuiz(step.side);
      }
      frames.push(look);

      if (!shownTrap && !practice) {
        shownTrap = true;
        frames.push({
          scene,
          caption: `The Junk Trap: treating ${show(chars[step.from])} as a letter would compare it with the other walker and get the wrong yes or no.`,
          codeLine: line(step.side === "left" ? 2 : 3),
          state: {
            ...blank(chars),
            left: step.side === "left" ? step.from : step.left,
            right: step.side === "right" ? step.from : step.right,
            tones: tones(chars.length, (index) => (index === step.from ? "miss" : null)),
            note: "✕ junk is not a letter",
          },
        });
      }

      left = step.left;
      right = step.right;
      frames.push({
        scene,
        caption: `Junk, so ${step.side} steps inward${left >= right ? " and the walkers meet." : `, onto ${show(chars[step.side === "left" ? left : right])}.`}`,
        codeLine: line(step.side === "left" ? 2 : 3),
        state: paintEnds(chars, left, right, "window"),
      });
      continue;
    }

    left = step.left;
    right = step.right;
    const look: Frame = {
      scene,
      caption: `Left is on ${show(chars[left])}. Right is on ${show(chars[right])}.`,
      codeLine: line(4),
      state: paintEnds(chars, left, right, "window"),
    };
    if (practice || !askedMatch) {
      askedMatch = true;
      look.quiz = matchQuiz(step.ok, chars[left], chars[right]);
    }
    frames.push(look);
    frames.push({
      scene,
      caption: step.ok
        ? `They match, ignoring case. Both walkers step inward.`
        : `They do not match, even ignoring case. This is not a palindrome.`,
      codeLine: line(step.ok ? 5 : 4),
      state: paintEnds(chars, left, right, step.ok ? "done" : "miss"),
    });
    if (!step.ok) break;
    left += 1;
    right -= 1;
  }

  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${ok}. You skipped the junk yourself.`
      : `The walkers have finished. The answer is ${ok}.`,
    codeLine: line(ok ? 8 : 4),
    state: {
      ...blank(chars),
      tones: tones(chars.length, (index) => (isWord(chars[index]) ? (ok ? "done" : "window") : "faded")),
    },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${chars.length} boxes is visited at most a couple of times, and left only moves right, right only moves left.`,
      codeLine: 1,
      state: { ...blank(chars), counter: { label: "boxes visited", value: chars.length }, tones: tones(chars.length, () => "faded") },
    });
    frames.push({
      scene,
      caption: "Space: O(1). We never copy the string. The two walkers are the only extra memory.",
      codeLine: 0,
      state: { ...blank(chars), left: 0, right: chars.length - 1 },
    });
  }
  return frames;
}

export const validPalindromeStory: ProblemStory<TwoPointerStringState> = {
  slugs: ["lc-125"],
  pattern: "Two pointers",
  trigger: "a string that may hold spaces and punctuation, and you must say whether it is a palindrome",
  insight: "Two walkers meet in the middle. Each one skips junk. Only letters and digits count, and case does not.",
  metaphor: {
    name: "The two walkers",
    legend: "left walker = left · right walker = right · junk = not a letter or digit",
    terms: ["left", "right", "junk", "walker"],
  },
  traps: [
    {
      name: "The Junk Trap",
      rule: "Commas, spaces, and other marks are not letters. Skip them. Only letters and digits are compared, in lowercase.",
    },
  ],
  template: [
    "left = 0; right = last box;",
    "while (left < right) {",
    "    skip junk on left; skip junk on right;",
    "    if (lowercase letters differ) return false;",
    "    step both inward;",
    "}",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(n)",
    timeWhy: "each box is visited at most a couple of times",
    space: "O(1)",
    spaceWhy: "only the two walkers; no copied string",
  },
  code: CODE,
  examples: [
    { label: '"a!ba"', input: '"a!ba"', expected: "true", note: "A bang in the way" },
    { label: '"race a car"', input: '"race a car"', expected: "false" },
    { label: '"0P"', input: '"0P"', expected: "false", note: "A digit is not a letter" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-680", title: "Valid Palindrome II" },
    { slug: "lc-234", title: "Palindrome Linked List" },
    { slug: "lc-5", title: "Longest Palindromic Substring" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const chars = [...parse(input)];
    const run = trace(chars.join(""));
    return [
      ...pictureFrames(chars, run.ok),
      ...slowFrames(chars),
      ...insightFrames(chars, run.steps),
      ...solutionFrames(chars),
      ...solutionFrames([...parse(PRACTICE)], "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Two walkers skip junk and compare letters. Say the idea, then reveal the card.",
        state: paintEnds(chars, 0, chars.length - 1, "done"),
      },
    ];
  },
  View: GrokTwoPointerStringView,
};
