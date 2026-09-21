import type { CellTone } from "@/components/learn/viz/primitives";

import { StringWindowView, type StringWindowState } from "../string-window-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StringWindowState>;

/** Fresh string. k is 0, so the body may hold no kinds at all. */
const PRACTICE = 's="xyz", k=0';

const CODE = [
  "if (k == 0) return 0;",
  "Map<Character, Integer> counts = new HashMap<>();",
  "int best = 0, left = 0;",
  "for (int right = 0; right < s.length(); right++) {",
  "    counts.merge(s.charAt(right), 1, Integer::sum);",
  "    while (counts.size() > k) {",
  "        char out = s.charAt(left++);",
  "        if (counts.merge(out, -1, Integer::sum) == 0) counts.remove(out);",
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

type Solved = { best: number; bestRange: [number, number]; firstOverflow: { right: number; left: number } | null };

function solve(s: string, k: number): Solved {
  if (k === 0 || s.length === 0) return { best: 0, bestRange: [0, -1], firstOverflow: null };
  const counts = new Map<string, number>();
  let left = 0;
  let best = 0;
  let bestRange: [number, number] = [0, 0];
  let firstOverflow: Solved["firstOverflow"] = null;
  for (let right = 0; right < s.length; right++) {
    counts.set(s[right], (counts.get(s[right]) ?? 0) + 1);
    while (counts.size > k) {
      firstOverflow ??= { right, left };
      const gone = s[left];
      const next = (counts.get(gone) ?? 0) - 1;
      if (next === 0) counts.delete(gone);
      else counts.set(gone, next);
      left++;
    }
    if (right - left + 1 > best) {
      best = right - left + 1;
      bestRange = [left, right];
    }
  }
  return { best, bestRange, firstOverflow };
}

function pictureFrames(chars: string[], k: number, solved: Solved): Frame[] {
  const frames: Frame[] = [{ scene: "picture", caption: `This is the string "${chars.join("")}". Each box is one letter. k is ${k}: at most ${k} different letters in a run.`, state: blank(chars) }];
  if (k === 0) {
    frames.push({
      scene: "picture",
      caption: `k is 0, so no letter is allowed in the body. The empty run has length 0.`,
      state: { ...blank(chars), tones: tones(chars.length, () => "faded"), best: 0 },
    });
    frames.push({
      scene: "picture",
      caption: "The goal: the longest allowed run, and its length.",
      state: { ...blank(chars), best: 0 },
    });
    return frames;
  }
  const [from, to] = solved.bestRange;
  frames.push({
    scene: "picture",
    caption: `"${chars.slice(from, to + 1).join("")}" uses at most ${k} different letters, so it is allowed. Its length is ${solved.best}.`,
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")) },
  });
  if (solved.firstOverflow) {
    const { left, right } = solved.firstOverflow;
    frames.push({
      scene: "picture",
      caption: `"${chars.slice(left, right + 1).join("")}" is not allowed: that run has more than ${k} different letters.`,
      state: { ...blank(chars), tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right, "window")(index))) },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the longest allowed run, and its length.",
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")), best: solved.best, bestRange: solved.bestRange },
  });
  return frames;
}

function slowFrames(chars: string[], k: number): Frame[] {
  const frames: Frame[] = [];
  let total = 0;
  if (k === 0) {
    frames.push({
      scene: "slow",
      caption: `The slow way would start at every letter and crawl. With k = 0 it cannot take even one letter. Still it tries every start.`,
      state: { ...blank(chars), counter: { label: "starts tried", value: chars.length } },
    });
    frames.push({
      scene: "slow",
      caption: `That is ${chars.length} empty crawls for a string of ${chars.length}. This is O(n²) work in the usual case, wasted here.`,
      state: { ...blank(chars), tones: tones(chars.length, () => "faded"), counter: { label: "letters read", value: 0 } },
    });
    return frames;
  }
  for (let start = 0; start < chars.length; start++) {
    const kinds = new Set<string>();
    let end = start;
    while (end < chars.length && (kinds.size < k || kinds.has(chars[end]))) kinds.add(chars[end++]);
    total += end - start;
    if (start > 2) continue;
    const hit = end < chars.length;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: start at the first letter and crawl until a new kind would break the limit.${hit ? ` Stop at '${chars[end]}'.` : ""}`
          : `Go back, start at '${chars[start]}', and crawl over letters you already read.`,
      state: {
        ...blank(chars),
        left: start,
        tones: tones(chars.length, (index) => (hit && index === end ? "miss" : range(start, end - 1, "window")(index))),
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
  if (k === 0) {
    return [
      {
        scene: "insight",
        caption: `Picture a caterpillar whose body may hold k different letters. Here k is 0, so the body must stay empty.`,
        state: blank(chars),
      },
      {
        scene: "insight",
        caption: `The Zero-Kind Trap! If you let the head eat even one letter, you have already broken the rule. The answer is 0.`,
        state: { ...blank(chars), right: 0, tones: tones(chars.length, (index) => (index === 0 ? "miss" : "faded")), ghostTail: 0 },
      },
    ];
  }
  const overflow = solved.firstOverflow;
  if (!overflow) {
    return [
      {
        scene: "insight",
        caption: `Picture a caterpillar. Its body may hold only ${k} different letters. This string never goes over, so the tail never has to move.`,
        state: { ...blank(chars), left: 0, right: chars.length - 1, tones: tones(chars.length, range(0, chars.length - 1, "window")) },
      },
      {
        scene: "insight",
        caption: `The head only crawls forward. When a new kind would break the limit, the tail crawls until a kind is gone.`,
        state: { ...blank(chars), left: 0, right: chars.length - 1, tones: tones(chars.length, range(0, chars.length - 1, "done")) },
      },
    ];
  }
  const { left, right } = overflow;
  return [
    {
      scene: "insight",
      caption: `Picture a caterpillar. Its body "${chars.slice(left, right).join("")}" holds ${k} kinds. The head is about to eat '${chars[right]}', a new kind.`,
      state: {
        ...blank(chars),
        left,
        right,
        tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
      },
    },
    {
      scene: "insight",
      caption: `The tail crawls forward until one kind is gone. The head never moves backwards.`,
      state: {
        ...blank(chars),
        left: crawl(chars, left, right, k),
        right,
        tones: tones(chars.length, range(crawl(chars, left, right, k), right, "window")),
      },
    },
  ];
}

function crawl(chars: string[], left: number, right: number, k: number): number {
  const counts = new Map<string, number>();
  for (let index = left; index <= right; index++) counts.set(chars[index], (counts.get(chars[index]) ?? 0) + 1);
  let tail = left;
  while (counts.size > k) {
    const gone = chars[tail];
    const next = (counts.get(gone) ?? 0) - 1;
    if (next === 0) counts.delete(gone);
    else counts.set(gone, next);
    tail++;
  }
  return tail;
}

function shrinkQuiz(cells: number, left: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (left + 1 < cells) feedback[left + 1] = `The tail crawls one letter at a time. It is still on this letter, so it leaves this one first.`;
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `Too many kinds in the body. Which box does the tail leave first? Click that box.`,
    answer: left,
    feedback,
    otherwise: `The tail crawls one letter at a time. Leave the letter it is sitting on.`,
    why: `The tail leaves the letter it is on, then checks the body again.`,
  };
}

function solutionFrames(s: string, k: number, scene: SceneId = "solution", practice = false): Frame[] {
  const chars = [...s];
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);

  if (k === 0) {
    const eat: Frame = {
      scene,
      caption: practice ? `Your turn. k is 0, and the head is at '${chars[0] ?? ""}'. May the body take it?` : `k is 0. The head is at the first letter. The body must stay empty.`,
      codeLine: line(0),
      state: { ...blank(chars), right: 0, tones: tones(chars.length, (index) => (index === 0 ? "edge" : "idle")) },
    };
    eat.quiz = {
      kind: "choice",
      options: ["No. The body may hold no kinds.", "Yes. Take this one letter."],
      answer: 0,
      question: `k is 0. Does the body take this letter?`,
      why: `k is 0 means zero kinds. One letter is already one kind.`,
    };
    frames.push(eat);
    frames.push({
      scene,
      caption: `The Zero-Kind Trap! Letting the head eat even one letter breaks the rule. Return 0 at once.`,
      codeLine: line(0),
      state: { ...blank(chars), right: 0, tones: tones(chars.length, (index) => (index === 0 ? "miss" : "faded")), ghostTail: 0 },
    });
    if (practice) {
      const done: Frame = {
        scene,
        caption: `The body stayed empty. What is the answer?`,
        state: { ...blank(chars), best: 0, tones: tones(chars.length, () => "faded") },
      };
      done.quiz = {
        kind: "choice",
        options: ["0", "1", String(chars.length)],
        answer: 0,
        question: `The body stayed empty. What length do we return?`,
        why: `No letter was allowed, so the longest run is 0.`,
      };
      frames.push(done);
      frames.push({
        scene,
        caption: `Done. The answer is 0. You kept the body empty.`,
        state: { ...blank(chars), best: 0 },
      });
      return frames;
    }
    frames.push({
      scene,
      caption: `The head never ate. The answer is 0.`,
      codeLine: line(0),
      state: { ...blank(chars), best: 0 },
    });
    frames.push({
      scene,
      caption: `Time: O(n). We still look at k first, then would walk the string once if k were positive.`,
      codeLine: line(3),
      state: { ...blank(chars), best: 0, counter: { label: "letters read", value: 0 } },
    });
    frames.push({
      scene,
      caption: `Space: O(k). The notebook would hold at most k kinds. Here k is 0, so it stays empty.`,
      codeLine: line(1),
      state: { ...blank(chars), best: 0 },
    });
    return frames;
  }

  const counts = new Map<string, number>();
  let left = 0;
  let best = 0;
  let bestRange: [number, number] | null = null;
  let asked = false;
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
    counter: { label: "kinds in the body", value: counts.size },
  });

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new string: "${s}". You move the tail.` : `The caterpillar starts empty. k is ${k}.`,
    codeLine: line(2),
    state: base(null),
  });

  for (let right = 0; right < chars.length; right++) {
    const letter = chars[right];
    if (!practice) frames.push({ scene, caption: `The head moves to '${letter}'.`, codeLine: line(4), state: base(right) });
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
    while (counts.size > k) {
      const clash: Frame = {
        scene,
        caption: `Too many kinds in the body after eating '${letter}'.`,
        codeLine: line(5),
        state: { ...base(right), tones: paint(right, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))), counter: { label: "kinds in the body", value: counts.size } },
      };
      if (practice || !asked) {
        asked = true;
        clash.quiz = shrinkQuiz(chars.length, left);
      }
      frames.push(clash);
      const gone = chars[left];
      const next = (counts.get(gone) ?? 0) - 1;
      if (next === 0) counts.delete(gone);
      else counts.set(gone, next);
      left++;
      frames.push({ scene, caption: `The tail leaves '${gone}'. The body now holds ${counts.size} kind${counts.size === 1 ? "" : "s"}.`, codeLine: line(7), state: base(right) });
    }
    const length = right - left + 1;
    const improved = length > best;
    const before = { best, bestRange };
    if (improved) {
      best = length;
      bestRange = [left, right];
    }
    if (practice) {
      frames.push({
        scene,
        caption: `The body is "${chars.slice(left, right + 1).join("")}", length ${length}. ${improved ? `New best: ${best}.` : `Best stays ${best}.`}`,
        state: { ...base(right), tones: paint(right, range(left, right, improved ? "done" : "window")) },
      });
      continue;
    }
    frames.push({ scene, caption: `The body is "${chars.slice(left, right + 1).join("")}", length ${length}.`, codeLine: line(9), state: { ...base(right), ...before, tones: paint(right, range(left, right, "window")) } });
    if (improved) frames.push({ scene, caption: `${length} beats the old best. best = ${best}.`, codeLine: line(9), state: { ...base(right), tones: paint(right, range(left, right, "done")) } });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${best}.` : `The head reached the end. The answer is ${best}.`,
    codeLine: line(11),
    state: { ...base(null), left: null, tones: tones(chars.length, (index) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : null)), counter: null },
  });
  if (!practice) {
    const done = (index: number) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : null);
    frames.push({
      scene,
      caption: `Time: O(n). The head ate each of the ${chars.length} letters once, and the tail only crawled forward.`,
      codeLine: 3,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "letters read", value: chars.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(k). The notebook holds at most k kinds. Here that is at most ${k}.`,
      codeLine: 1,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "kinds in the body", value: Math.min(k, new Set(chars).size) } },
    });
  }
  return frames;
}

export const atMostKDistinctStory: ProblemStory<StringWindowState> = {
  slugs: ["lc-340"],
  pattern: "Window, at most k distinct",
  trigger: "“longest substring” with at most k different letters",
  insight: "A caterpillar whose body holds only k kinds. A new kind makes the tail crawl until a kind is gone. If k is 0, the body stays empty.",
  metaphor: { name: "The caterpillar", legend: "tail = left · head = right · body = the window of at most k kinds", terms: ["head", "tail", "body", "caterpillar"] },
  traps: [{ name: "The Zero-Kind Trap", rule: "If k is 0 the body may hold no letter kinds. Return 0 at once. Do not let the head eat." }],
  template: [
    "if (k == 0) return 0;",
    "for (right = 0; right < n; right++) {",
    "    add s[right] to the window;",
    "    while (window has more than k kinds) move left forward;",
    "    best = max(best, right - left + 1);",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "the head eats each letter once; the tail only crawls forward",
    space: "O(k)",
    spaceWhy: "the notebook holds at most k kinds",
  },
  code: CODE,
  examples: [
    { label: 's="eceba", k=2', input: 's="eceba", k=2', expected: "3" },
    { label: 's="aa", k=1', input: 's="aa", k=1', expected: "2" },
    { label: 's="a", k=0', input: 's="a", k=0', expected: "0", note: "k is 0: the body must stay empty" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-3", title: "Longest Substring Without Repeating Characters" },
    { slug: "lc-904", title: "Fruit Into Baskets" },
    { slug: "lc-424", title: "Longest Repeating Character Replacement" },
  ],
  answer: (input) => {
    const { s, k } = parse(input);
    return String(solve(s, k).best);
  },
  frames: (input) => {
    const { s, k } = parse(input);
    const chars = [...s];
    const solved = solve(s, k);
    const { s: ps, k: pk } = parse(PRACTICE);
    return [
      ...pictureFrames(chars, k, solved),
      ...slowFrames(chars, k),
      ...insightFrames(chars, k, solved),
      ...solutionFrames(s, k),
      ...solutionFrames(ps, pk, "card", true),
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
