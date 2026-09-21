import type { CellTone } from "@/components/learn/viz/primitives";

import { StringWindowView, type StringWindowState } from "../string-window-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StringWindowState>;

/** Fresh string. Two shrinks: the first is the recount trap, the second is another tail move. */
const PRACTICE = 's="ABABC" k=1';

const CODE = [
  "int[] counts = new int[26];",
  "int left = 0, maxCount = 0, best = 0;",
  "for (int right = 0; right < s.length(); right++) {",
  "    maxCount = Math.max(maxCount, ++counts[s.charAt(right) - 'A']);",
  "    while (right - left + 1 - maxCount > k) {",
  "        counts[s.charAt(left) - 'A']--;",
  "        left++;",
  "    }",
  "    best = Math.max(best, right - left + 1);",
  "}",
  "return best;",
];

function parse(raw: string): { s: string; k: number } {
  const s = raw.match(/s\s*=\s*"([^"]*)"/)?.[1] ?? "";
  const k = Number(raw.match(/k\s*=\s*(-?\d+)/)?.[1] ?? "0");
  return { s, k };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function range(from: number, to: number, tone: CellTone) {
  return (index: number) => (index >= from && index <= to ? tone : null);
}

function blank(chars: string[]): StringWindowState {
  return { chars, tones: tones(chars.length, () => null), left: null, right: null, seen: null, best: null, bestRange: null };
}

function letterCounts(chars: string[], from: number, to: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let index = from; index <= to; index++) counts.set(chars[index], (counts.get(chars[index]) ?? 0) + 1);
  return counts;
}

function topCount(counts: Map<string, number>): number {
  let top = 0;
  for (const value of counts.values()) top = Math.max(top, value);
  return top;
}

type Solved = { best: number; bestRange: [number, number]; firstShrink: { right: number; left: number; maxCount: number } | null };

function solve(s: string, k: number): Solved {
  const counts = new Array(26).fill(0);
  let left = 0;
  let maxCount = 0;
  let best = 0;
  let bestRange: [number, number] = [0, -1];
  let firstShrink: Solved["firstShrink"] = null;
  for (let right = 0; right < s.length; right++) {
    const slot = s.charCodeAt(right) - 65;
    counts[slot]++;
    maxCount = Math.max(maxCount, counts[slot]);
    while (right - left + 1 - maxCount > k) {
      firstShrink ??= { right, left, maxCount };
      counts[s.charCodeAt(left) - 65]--;
      left++;
    }
    if (right - left + 1 > best) {
      best = right - left + 1;
      bestRange = [left, right];
    }
  }
  return { best, bestRange, firstShrink };
}

function pictureFrames(chars: string[], k: number, solved: Solved): Frame[] {
  const text = chars.join("");
  const frames: Frame[] = [
    { scene: "picture", caption: `This is the string "${text}". You may change at most ${k} letter${k === 1 ? "" : "s"} so a run becomes one letter.`, state: blank(chars) },
  ];
  if (solved.best === 0) {
    frames.push({ scene: "picture", caption: "The goal: the longest run of one letter you can make, and its length.", state: blank(chars) });
    return frames;
  }
  const [from, to] = solved.bestRange;
  const counts = letterCounts(chars, from, to);
  const flips = to - from + 1 - topCount(counts);
  frames.push({
    scene: "picture",
    caption: `"${text.slice(from, to + 1)}" needs ${flips} change${flips === 1 ? "" : "s"}, so it is allowed. Its length is ${solved.best}.`,
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")) },
  });
  if (solved.firstShrink) {
    const { left, right } = solved.firstShrink;
    const over = right - left + 1 - topCount(letterCounts(chars, left, right));
    frames.push({
      scene: "picture",
      caption: `"${text.slice(left, right + 1)}" is not allowed: it would need ${over} changes, more than ${k}.`,
      state: { ...blank(chars), tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right, "window")(index))) },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the longest run of one letter you can make, and its length.",
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")), best: solved.best, bestRange: solved.bestRange },
  });
  return frames;
}

function slowFrames(chars: string[], k: number): Frame[] {
  const frames: Frame[] = [];
  let total = 0;
  for (let start = 0; start < chars.length; start++) {
    const counts = new Map<string, number>();
    let end = start;
    while (end < chars.length) {
      counts.set(chars[end], (counts.get(chars[end]) ?? 0) + 1);
      if (end - start + 1 - topCount(counts) > k) break;
      end++;
    }
    total += end - start + (end < chars.length ? 1 : 0);
    if (start > 2) continue;
    const blocked = end < chars.length;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: start at the first letter and crawl until a run would need more than ${k} change${k === 1 ? "" : "s"}.${blocked ? ` Stop at '${chars[end]}'.` : ""}`
          : `Go back, start at '${chars[start]}', and crawl over letters you already read.`,
      state: {
        ...blank(chars),
        left: start,
        tones: tones(chars.length, (index) => (blocked && index === end ? "miss" : range(start, end - 1, "window")(index))),
        counter: { label: "letters read", value: total },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `From every start we read ${total} letters for a string of only ${chars.length}. This is O(n²) time: we keep re-reading.`,
    state: { ...blank(chars), tones: tones(chars.length, () => "faded"), counter: { label: "letters read", value: total } },
  });
  return frames;
}

function insightFrames(chars: string[], k: number, solved: Solved): Frame[] {
  const shrink = solved.firstShrink;
  if (!shrink) {
    return [
      {
        scene: "insight",
        caption: `Picture a caterpillar. The body is allowed if its length minus its top letter's count is at most ${k}. Those other letters are the changes.`,
        state: { ...blank(chars), left: 0, right: chars.length - 1, tones: tones(chars.length, range(0, chars.length - 1, "window")) },
      },
      {
        scene: "insight",
        caption: `This string never needs more than ${k} change${k === 1 ? "" : "s"}, so the tail never has to move.`,
        state: { ...blank(chars), left: 0, right: chars.length - 1, tones: tones(chars.length, range(0, chars.length - 1, "done")) },
      },
    ];
  }
  const { left, right, maxCount } = shrink;
  const length = right - left + 1;
  return [
    {
      scene: "insight",
      caption: `Picture a caterpillar. Body "${chars.slice(left, right + 1).join("")}" has length ${length} and top count ${maxCount}. That would need ${length - maxCount} changes.`,
      state: {
        ...blank(chars),
        left,
        right,
        tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
        counter: { label: "top letter count", value: maxCount },
      },
    },
    {
      scene: "insight",
      caption: `The Recount Trap! Do not walk the body to find a new top letter when the tail moves. Keep the old top count.`,
      state: {
        ...blank(chars),
        left,
        right,
        tones: tones(chars.length, (index) => (index >= left && index <= right ? "miss" : null)),
        counter: { label: "top letter count", value: maxCount },
      },
    },
    {
      scene: "insight",
      caption: `The tail crawls one letter, the head stays. A leftover top count never hurts the answer.`,
      state: {
        ...blank(chars),
        left: left + 1,
        right,
        tones: tones(chars.length, range(left + 1, right, "window")),
        counter: { label: "top letter count", value: maxCount },
      },
    },
  ];
}

function shrinkQuiz(cells: number, left: number, right: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (right !== left) feedback[right] = `That is the head. The tail leaves the box it is sitting on.`;
  if (left + 1 < cells && left + 1 !== right) {
    feedback[left + 1] = `The tail crawls one letter at a time. It is still on this letter.`;
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `The body would need too many changes. Which box does the tail leave first? Click that box.`,
    answer: left,
    feedback,
    otherwise: `The tail crawls one letter at a time. Leave the letter it is sitting on.`,
    why: `The tail leaves the letter it is on. We do not walk the body to recount the top letter.`,
  };
}

function solutionFrames(s: string, k: number, scene: SceneId = "solution", practice = false): Frame[] {
  const chars = [...s];
  const frames: Frame[] = [];
  const counts = new Array(26).fill(0);
  let left = 0;
  let maxCount = 0;
  let best = 0;
  let bestRange: [number, number] | null = null;
  let asked = false;
  let showedTrap = false;
  const line = (index: number) => (practice ? undefined : index);

  const paint = (right: number | null, inner: (index: number) => CellTone | null) =>
    tones(chars.length, (index) => (right !== null && index < left ? "faded" : inner(index)));
  const base = (right: number | null): StringWindowState => ({
    chars,
    tones: paint(right, (index) => (right !== null && index === right ? "edge" : right !== null ? range(left, right - 1, "window")(index) : null)),
    left,
    right,
    seen: null,
    best,
    bestRange,
    counter: { label: "top letter count", value: maxCount },
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new string "${s}", k is ${k}. The head moves by itself. You move the tail.`
      : `The caterpillar starts empty. k is ${k}. The top letter count starts at 0.`,
    codeLine: line(1),
    state: base(null),
  });

  for (let right = 0; right < chars.length; right++) {
    const letter = chars[right];
    const slot = letter.charCodeAt(0) - 65;
    if (!practice) {
      frames.push({
        scene,
        caption: `The head moves to '${letter}'.`,
        codeLine: line(3),
        state: base(right),
      });
    }
    counts[slot]++;
    maxCount = Math.max(maxCount, counts[slot]);

    while (right - left + 1 - maxCount > k) {
      const need = right - left + 1 - maxCount;
      const clash: Frame = {
        scene,
        caption: `The body would need ${need} changes, above the budget of ${k}. The tail must crawl.`,
        codeLine: line(4),
        state: {
          ...base(right),
          tones: paint(right, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
        },
      };
      if (practice || !asked) {
        asked = true;
        clash.quiz = shrinkQuiz(chars.length, left, right);
      }
      frames.push(clash);

      if (!showedTrap && !practice) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The Recount Trap! Walking the body to find a new top letter is the slow habit. Keep the old top count.`,
          codeLine: line(5),
          state: {
            ...base(right),
            tones: paint(right, (index) => (index >= left && index <= right ? "miss" : null)),
            counter: { label: "top letter count", value: maxCount },
          },
        });
      }

      counts[chars[left].charCodeAt(0) - 65]--;
      const gone = chars[left];
      left++;
      frames.push({
        scene,
        caption: `The tail leaves '${gone}'. The top letter count stays ${maxCount}. We do not recount the body.`,
        codeLine: line(6),
        state: base(right),
      });
    }

    const length = right - left + 1;
    const improved = length > best;
    if (improved) {
      best = length;
      bestRange = [left, right];
    }
    frames.push({
      scene,
      caption: `The body is "${chars.slice(left, right + 1).join("")}", length ${length}. ${improved ? `New best: ${best}.` : `Best stays ${best}.`}`,
      codeLine: line(8),
      state: { ...base(right), tones: paint(right, range(left, right, improved ? "done" : "window")) },
    });
  }

  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${best}. You moved the tail yourself every time.`
      : `The head reached the end. The answer is ${best}.`,
    codeLine: line(10),
    state: {
      ...base(null),
      left: null,
      tones: tones(chars.length, (index) => (bestRange && best > 0 ? range(bestRange[0], bestRange[1], "done")(index) : null)),
      counter: null,
    },
  });
  if (!practice) {
    const done = (index: number) => (bestRange && best > 0 ? range(bestRange[0], bestRange[1], "done")(index) : null);
    frames.push({
      scene,
      caption: `Time: O(n). The head ate each of the ${chars.length} letters once, and the tail only crawled forward.`,
      codeLine: 2,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "letters read", value: chars.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(1). The notebook is 26 letter counts, no matter how long the string is.`,
      codeLine: 0,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "letter slots", value: 26 } },
    });
  }
  return frames;
}

export const characterReplacementStory: ProblemStory<StringWindowState> = {
  slugs: ["lc-424"],
  pattern: "Sliding window, replacements",
  trigger: "longest same-letter run after at most k changes",
  insight: "A caterpillar is allowed when body length minus the top letter's count is at most k. On a shrink, keep the old top count. Do not walk the body to recount.",
  metaphor: {
    name: "The caterpillar",
    legend: "tail = left · head = right · body = the window · top letter count = maxCount",
    terms: ["head", "tail", "body", "caterpillar"],
  },
  traps: [
    {
      name: "The Recount Trap",
      rule: "Do not scan the body to recompute maxCount when the tail moves. A leftover top count is safe: it never breaks the answer.",
    },
  ],
  template: [
    "for (right = 0; right < n; right++) {",
    "    add s[right]; raise the top letter count if needed;",
    "    while (body length - top count > k) drop the tail; do not recount;",
    "    best = max(best, body length);",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "the head eats each letter once; the tail only crawls forward",
    space: "O(1)",
    spaceWhy: "26 letter counts",
  },
  code: CODE,
  examples: [
    { label: 's="AABABBA" k=1', input: 's="AABABBA" k=1', expected: "4" },
    { label: 's="ABAB" k=2', input: 's="ABAB" k=2', expected: "4" },
    { label: 's="ABCDE" k=1', input: 's="ABCDE" k=1', expected: "2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-1004", title: "Max Consecutive Ones III" },
    { slug: "lc-3", title: "Longest Substring Without Repeating Characters" },
    { slug: "lc-340", title: "Longest Substring with At Most K Distinct Characters" },
  ],
  answer: (input) => {
    const { s, k } = parse(input);
    return String(solve(s, k).best);
  },
  frames: (input) => {
    const { s, k } = parse(input);
    const chars = [...s];
    const solved = solve(s, k);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(chars, k, solved),
      ...slowFrames(chars, k),
      ...insightFrames(chars, k, solved),
      ...solutionFrames(s, k),
      ...solutionFrames(practice.s, practice.k, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(chars),
          left: solved.best > 0 ? solved.bestRange[0] : null,
          right: solved.best > 0 ? solved.bestRange[1] : null,
          tones: solved.best > 0 ? tones(chars.length, range(solved.bestRange[0], solved.bestRange[1], "done")) : tones(chars.length, () => "faded"),
          best: solved.best,
          bestRange: solved.best > 0 ? solved.bestRange : null,
        },
      },
    ];
  },
  View: StringWindowView,
};
