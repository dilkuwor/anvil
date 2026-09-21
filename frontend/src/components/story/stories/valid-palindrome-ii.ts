import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokTwoPointerStringView, type TwoPointerStringState } from "../grok-two-pointer-string-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TwoPointerStringState>;

/** Fresh string: skipping the right end fails; skipping the left letter is the only save. */
const PRACTICE = '"deeee"';

const CODE = [
  "int left = 0, right = s.length() - 1;",
  "while (left < right) {",
  "    if (s.charAt(left) != s.charAt(right)) {",
  "        return pal(s, left + 1, right) || pal(s, left, right - 1);",
  "    }",
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

function pal(s: string, left: number, right: number): boolean {
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left += 1;
    right -= 1;
  }
  return true;
}

function solve(s: string): boolean {
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return pal(s, left + 1, right) || pal(s, left, right - 1);
    left += 1;
    right -= 1;
  }
  return true;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(chars: string[]): TwoPointerStringState {
  return { chars, tones: tones(chars.length, () => null), left: null, right: null };
}

function ends(chars: string[], left: number | null, right: number | null, tone: CellTone = "edge"): TwoPointerStringState {
  return {
    ...blank(chars),
    left,
    right,
    tones: tones(chars.length, (index) => (index === left || index === right ? tone : null)),
  };
}

type Clash = { left: number; right: number; skipLeft: boolean; skipRight: boolean };

function firstClash(s: string): Clash | null {
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return { left, right, skipLeft: pal(s, left + 1, right), skipRight: pal(s, left, right - 1) };
    left += 1;
    right -= 1;
  }
  return null;
}

function pictureFrames(chars: string[], ok: boolean, clash: Clash | null): Frame[] {
  const n = chars.length;
  const frames: Frame[] = [
    { scene: "picture", caption: `This is the string "${chars.join("")}". You may delete at most one character, then it must read the same both ways.`, state: blank(chars) },
  ];
  if (clash) {
    frames.push({
      scene: "picture",
      caption: `'${chars[clash.left]}' and '${chars[clash.right]}' do not match. One of them may be the character we drop.`,
      state: { ...ends(chars, clash.left, clash.right, "miss") },
    });
    const keep = clash.skipLeft ? clash.left : clash.skipRight ? clash.right : clash.left;
    if (ok) {
      frames.push({
        scene: "picture",
        caption: clash.skipLeft !== clash.skipRight
          ? `Only dropping '${chars[keep]}' leaves a palindrome. Dropping the other side would not.`
          : `Dropping either letter leaves a palindrome. We still have to try both.`,
        state: { ...blank(chars), skipped: keep, tones: tones(n, (index) => (index === keep ? "done" : index === clash.left || index === clash.right ? "window" : null)) },
      });
    } else {
      frames.push({
        scene: "picture",
        caption: "Dropping either letter still leaves a mismatch. One delete is not enough.",
        state: { ...ends(chars, clash.left, clash.right, "miss") },
      });
    }
  } else {
    frames.push({
      scene: "picture",
      caption: "The two ends already match all the way in. No delete is needed.",
      state: { ...blank(chars), tones: tones(n, () => "done") },
    });
  }
  frames.push({
    scene: "picture",
    caption: ok ? "The goal: can we make a palindrome with at most one delete? Here we can." : "The goal: can we make a palindrome with at most one delete? Here we cannot.",
    state: { ...blank(chars), tones: tones(n, () => (ok ? "done" : "window")) },
  });
  return frames;
}

function slowFrames(chars: string[]): Frame[] {
  const s = chars.join("");
  const frames: Frame[] = [];
  let checks = 0;
  if (pal(s, 0, s.length - 1)) {
    frames.push({
      scene: "slow",
      caption: "The slow way: first check the whole string. It already reads the same both ways, so we can stop.",
      state: { ...blank(chars), tones: tones(chars.length, () => "done"), counter: { label: "strings checked", value: 1 } },
    });
    checks = 1;
  } else {
    frames.push({
      scene: "slow",
      caption: "The slow way: try deleting each character in turn, and check whether the rest is a palindrome.",
      state: { ...blank(chars), left: 0, right: chars.length - 1, counter: { label: "strings checked", value: 1 } },
    });
    checks = 1;
    for (let skip = 0; skip < chars.length && frames.length < 3; skip++) {
      checks += 1;
      const rest = pal(s.slice(0, skip) + s.slice(skip + 1), 0, s.length - 2);
      frames.push({
        scene: "slow",
        caption: rest
          ? `Delete '${chars[skip]}'. The rest is a palindrome, so we could stop. We still tried a delete at every box.`
          : `Delete '${chars[skip]}'. The rest is not a palindrome. Try the next box.`,
        state: { ...blank(chars), skipped: skip, tones: tones(chars.length, (index) => (index === skip ? "miss" : null)), counter: { label: "strings checked", value: checks } },
      });
      if (rest) break;
    }
    checks = 1 + chars.length;
  }
  frames.push({
    scene: "slow",
    caption: `Checking a delete at every box re-reads the string each time. That is O(n²) time.`,
    state: { ...blank(chars), tones: tones(chars.length, () => "faded"), counter: { label: "strings checked", value: checks } },
  });
  return frames;
}

function insightFrames(chars: string[], clash: Clash | null): Frame[] {
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Walk inward from both ends, as in a normal palindrome. Most letters never need a delete.",
      state: ends(chars, 0, chars.length - 1),
    },
  ];
  if (!clash) {
    frames.push({
      scene: "insight",
      caption: "These two walkers never disagree. Zero deletes is enough.",
      state: { ...blank(chars), tones: tones(chars.length, () => "done") },
    });
    return frames;
  }
  frames.push({
    scene: "insight",
    caption: `'${chars[clash.left]}' and '${chars[clash.right]}' clash. You may delete one character, so this is the only place that matters.`,
    state: ends(chars, clash.left, clash.right, "miss"),
  });
  frames.push({
    scene: "insight",
    caption: "Try skipping left, and try skipping right. Greedy picking of one side can miss the only skip that works.",
    state: {
      ...blank(chars),
      left: clash.left,
      right: clash.right,
      skipped: clash.skipLeft ? clash.left : null,
      ghostSkip: !clash.skipLeft && clash.skipRight ? clash.right : clash.skipLeft && !clash.skipRight ? clash.right : null,
      tones: tones(chars.length, (index) => (index === clash.left || index === clash.right ? "window" : null)),
    },
  });
  return frames;
}

function skipQuiz(onlyLeft: boolean, onlyRight: boolean): StoryQuiz {
  const bothWork = onlyLeft && onlyRight;
  const neither = !onlyLeft && !onlyRight;
  return {
    kind: "choice",
    question: "The two letters disagree. What should we try?",
    options: ["Skip only the left letter", "Skip only the right letter", "Try skipping left, and try skipping right"],
    answer: 2,
    why: bothWork
      ? "Either skip works here, but that is luck. Always try both, because only one side may save the string."
      : neither
        ? "Neither skip leaves a palindrome, so the answer is no. We only know after trying both."
        : "Only one of the two skips leaves a palindrome. Picking a side by habit would miss it.",
  };
}

function solutionFrames(chars: string[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const s = chars.join("");
  const clash = firstClash(s);
  const ok = solve(s);
  let asked = false;
  let shownTrap = false;
  let left = 0;
  let right = chars.length - 1;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new string: "${s}". You decide what to do when two letters disagree.`
      : "Left starts on the first letter. Right starts on the last letter.",
    codeLine: line(0),
    state: ends(chars, left, right),
  });

  while (left < right && chars[left] === chars[right]) {
    if (!practice) {
      frames.push({
        scene,
        caption: `'${chars[left]}' and '${chars[right]}' match. Both walkers step inward.`,
        codeLine: line(5),
        state: ends(chars, left, right, "done"),
      });
    }
    left += 1;
    right -= 1;
  }

  if (left >= right) {
    frames.push({
      scene,
      caption: practice ? `No clash. The answer is true.` : `The walkers met. The answer is true.`,
      codeLine: line(8),
      state: { ...blank(chars), tones: tones(chars.length, () => "done") },
    });
  } else if (clash) {
    const look: Frame = {
      scene,
      caption: `'${chars[clash.left]}' and '${chars[clash.right]}' do not match.`,
      codeLine: line(2),
      state: ends(chars, clash.left, clash.right, "miss"),
    };
    if (practice || !asked) {
      asked = true;
      look.quiz = skipQuiz(clash.skipLeft, clash.skipRight);
    }
    frames.push(look);

    if (!shownTrap && !practice) {
      shownTrap = true;
      const greedy = clash.left;
      frames.push({
        scene,
        caption: clash.skipLeft && clash.skipRight
          ? `The One-Side Trap: skipping only the left letter happens to work here, but that is luck. Always try both skips.`
          : clash.skipLeft
            ? `The One-Side Trap: skipping only the right letter would fail. Skipping left is the save. Try both.`
            : clash.skipRight
              ? `The One-Side Trap: skipping only the left letter would fail. Skipping right is the save. Try both.`
              : `The One-Side Trap: skipping only one side is not enough to know. Try both; here neither works.`,
        codeLine: line(3),
        state: {
          ...blank(chars),
          left: clash.left,
          right: clash.right,
          ghostSkip: clash.skipLeft && !clash.skipRight ? clash.right : greedy,
          skipped: clash.skipLeft ? clash.left : clash.skipRight ? clash.right : null,
          note: "✕ try both skips",
        },
      });
    }

    frames.push({
      scene,
      caption: clash.skipLeft
        ? `Skipping '${chars[clash.left]}' leaves a palindrome, so we can say yes.`
        : clash.skipRight
          ? `Skipping '${chars[clash.left]}' fails. Skipping '${chars[clash.right]}' leaves a palindrome, so we can say yes.`
          : `Skipping either letter still leaves a mismatch, so we say no.`,
      codeLine: line(3),
      state: {
        ...blank(chars),
        left: clash.left,
        right: clash.right,
        skipped: clash.skipLeft ? clash.left : clash.skipRight ? clash.right : null,
        tones: tones(chars.length, (index) => {
          if (clash.skipLeft && index === clash.left) return "done";
          if (!clash.skipLeft && clash.skipRight && index === clash.right) return "done";
          if (index === clash.left || index === clash.right) return "miss";
          return null;
        }),
      },
    });

    if (practice && clash.skipLeft !== clash.skipRight) {
      frames.push({
        scene,
        caption: `Now the other skip.`,
        state: ends(chars, clash.left, clash.right, "window"),
        quiz: {
          kind: "choice",
          question: clash.skipLeft
            ? `Does skipping '${chars[clash.right]}' also leave a palindrome?`
            : `Does skipping '${chars[clash.left]}' also leave a palindrome?`,
          options: ["Yes, both skips work", "No, only one skip works"],
          answer: 1,
          why: "One skip saves the string and the other does not. That is why a greedy pick of one side is unsafe.",
        },
      });
      frames.push({
        scene,
        caption: clash.skipLeft
          ? `Skipping right fails. Only skipping left works.`
          : `Skipping left fails. Only skipping right works.`,
        state: {
          ...blank(chars),
          ghostSkip: clash.skipLeft ? clash.right : clash.left,
          skipped: clash.skipLeft ? clash.left : clash.right,
        },
      });
    }

    frames.push({
      scene,
      caption: practice ? `Done. The answer is ${ok}. You tried both skips.` : `One delete was the budget. The answer is ${ok}.`,
      codeLine: line(3),
      state: { ...blank(chars), tones: tones(chars.length, () => (ok ? "done" : "faded")) },
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). The main walk is one pass. Each helper walk is at most one more pass over the letters.`,
      codeLine: 1,
      state: { ...blank(chars), counter: { label: "letters visited", value: chars.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two walkers, and the two helper walks are not nested.",
      codeLine: 0,
      state: ends(chars, 0, chars.length - 1),
    });
  }
  return frames;
}

export const validPalindromeIIStory: ProblemStory<TwoPointerStringState> = {
  slugs: ["lc-680"],
  pattern: "Two pointers, one skip",
  trigger: "a palindrome after deleting at most one character",
  insight: "Walk inward. On the first clash, try skipping the left letter, and try skipping the right. One of those two walks must be a strict palindrome.",
  metaphor: {
    name: "The two walkers, one skip",
    legend: "left walker = left · right walker = right · skip = delete one letter",
    terms: ["left", "right", "skip", "walker"],
  },
  traps: [
    {
      name: "The One-Side Trap",
      rule: "Never skip only the left letter, or only the right, by habit. Try both. One of them may be the only save.",
    },
  ],
  template: [
    "walk inward while the two ends match;",
    "on the first clash:",
    "    return skip-left is palindrome OR skip-right is palindrome;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "one main walk plus at most two helper walks",
    space: "O(1)",
    spaceWhy: "only the walkers; the two helper walks are not nested",
  },
  code: CODE,
  examples: [
    { label: '"abca"', input: '"abca"', expected: "true", note: "Either skip works" },
    { label: '"cbbcc"', input: '"cbbcc"', expected: "true", note: "Only skipping right works" },
    { label: '"abc"', input: '"abc"', expected: "false" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-125", title: "Valid Palindrome" },
    { slug: "lc-234", title: "Palindrome Linked List" },
    { slug: "lc-5", title: "Longest Palindromic Substring" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const chars = [...parse(input)];
    const clash = firstClash(chars.join(""));
    const ok = solve(chars.join(""));
    return [
      ...pictureFrames(chars, ok, clash),
      ...slowFrames(chars),
      ...insightFrames(chars, clash),
      ...solutionFrames(chars),
      ...solutionFrames([...parse(PRACTICE)], "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: on a clash, try both skips. Say the idea, then reveal the card.",
        state: clash ? { ...ends(chars, clash.left, clash.right), skipped: clash.skipLeft ? clash.left : clash.skipRight ? clash.right : null } : ends(chars, 0, chars.length - 1, "done"),
      },
    ];
  },
  View: GrokTwoPointerStringView,
};
