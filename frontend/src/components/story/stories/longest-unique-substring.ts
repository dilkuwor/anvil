import type { CellTone } from "@/components/learn/viz/primitives";

import { StringWindowView, type StringWindowState } from "../string-window-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StringWindowState>;

/** Fresh string for the "your turn" run. It has a normal repeat and a ghost. */
const PRACTICE = "abcba";

const CODE = [
  "Map<Character, Integer> last = new HashMap<>();",
  "int left = 0, best = 0;",
  "for (int right = 0; right < s.length(); right++) {",
  "    char c = s.charAt(right);",
  "    if (last.containsKey(c) && last.get(c) >= left) {",
  "        left = last.get(c) + 1;",
  "    }",
  "    last.put(c, right);",
  "    best = Math.max(best, right - left + 1);",
  "}",
  "return best;",
];

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function range(from: number, to: number, tone: CellTone) {
  return (index: number) => (index >= from && index <= to ? tone : null);
}

function blank(chars: string[]): StringWindowState {
  return { chars, tones: tones(chars.length, () => null), left: null, right: null, seen: null, best: null, bestRange: null };
}

type Solved = { best: number; bestRange: [number, number]; firstRepeat: { right: number; seenAt: number; left: number } | null };

function solve(s: string): Solved {
  const last = new Map<string, number>();
  let left = 0;
  let best = 0;
  let bestRange: [number, number] = [0, 0];
  let firstRepeat: Solved["firstRepeat"] = null;
  for (let right = 0; right < s.length; right++) {
    const seenAt = last.get(s[right]);
    if (seenAt !== undefined && seenAt >= left) {
      firstRepeat ??= { right, seenAt, left };
      left = seenAt + 1;
    }
    last.set(s[right], right);
    if (right - left + 1 > best) {
      best = right - left + 1;
      bestRange = [left, right];
    }
  }
  return { best, bestRange, firstRepeat };
}

function pictureFrames(chars: string[], solved: Solved): Frame[] {
  const text = chars.join("");
  const frames: Frame[] = [{ scene: "picture", caption: `This is the string "${text}". Each box is one letter.`, state: blank(chars) }];
  const [from, to] = solved.bestRange;
  frames.push({
    scene: "picture",
    caption: `A substring is a run of neighbours. "${text.slice(from, to + 1)}" has no repeated letter, so it is allowed. Its length is ${solved.best}.`,
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")) },
  });
  if (solved.firstRepeat) {
    const { left, right, seenAt } = solved.firstRepeat;
    frames.push({
      scene: "picture",
      caption: `"${text.slice(left, right + 1)}" is not allowed: the letter '${chars[right]}' appears twice.`,
      state: { ...blank(chars), tones: tones(chars.length, (index) => (index === seenAt || index === right ? "miss" : range(left, right, "window")(index))) },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: find the longest allowed run, and return its length.",
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")), best: solved.best, bestRange: solved.bestRange },
  });
  return frames;
}

function slowFrames(chars: string[]): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  let total = 0;
  for (let start = 0; start < chars.length; start++) {
    const used = new Set<string>();
    let end = start;
    while (end < chars.length && !used.has(chars[end])) used.add(chars[end++]);
    const stop = Math.min(end, chars.length - 1);
    total += stop - start + 1;
    if (start > 2) continue;
    checks = total;
    const hitRepeat = end < chars.length;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: start at index 0 and crawl until a letter repeats.${hitRepeat ? ` We stop at '${chars[end]}'.` : ""}`
          : `Now go all the way back, start from index ${start}, and crawl over the same letters again.`,
      state: {
        ...blank(chars),
        left: start,
        tones: tones(chars.length, (index) => (hitRepeat && index === end ? "miss" : range(start, end - 1, "window")(index))),
        counter: { label: "letters read", value: checks },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `From every start, that is ${total} letters read for a string of only ${chars.length}. This is O(n²) time: far too slow for 50,000 letters. We keep re-reading what we already know.`,
    state: { ...blank(chars), tones: tones(chars.length, () => "faded"), counter: { label: "letters read", value: total } },
  });
  return frames;
}

function insightFrames(chars: string[], solved: Solved): Frame[] {
  const repeat = solved.firstRepeat;
  if (!repeat) return [];
  const { left, right, seenAt } = repeat;
  const letter = chars[right];
  const window = chars.slice(left, right).join("");
  return [
    {
      scene: "insight",
      caption: `Picture a caterpillar. Its body "${window}" has no repeated letter. Its head is about to eat '${letter}', which is already in its body.`,
      state: {
        ...blank(chars),
        left,
        right,
        link: { from: right, to: seenAt, tone: "miss" },
        tones: tones(chars.length, (index) => (index === right || index === seenAt ? "miss" : range(left, right - 1, "window")(index))),
      },
    },
    {
      scene: "insight",
      caption: `It does not go back and start over. Only the old '${letter}' at index ${seenAt} is the problem. The rest of the body is fine.`,
      state: { ...blank(chars), left, right, tones: tones(chars.length, (index) => (index === seenAt ? "miss" : range(seenAt + 1, right, "hit")(index))) },
    },
    {
      scene: "insight",
      caption: `So the tail snaps forward, just past the old '${letter}'. The body is clean again, and the head never moved backwards.`,
      state: { ...blank(chars), left: seenAt + 1, right, tones: tones(chars.length, range(seenAt + 1, right, "window")) },
    },
  ];
}

function snapQuiz(cells: number, letter: string, seenAt: number, left: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let index = left; index <= seenAt; index++) {
    feedback[index] = index === seenAt ? `Index ${seenAt} is the old '${letter}' itself. It would still be inside the body.` : `The old '${letter}' at index ${seenAt} would still be inside the body.`;
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `The head bumped into '${letter}'. Where must the tail snap to? Click that box.`,
    answer: seenAt + 1,
    feedback,
    otherwise: `Too far. You threw away letters that caused no problem. Go just past the old '${letter}'.`,
    why: `Just past the old '${letter}'. Everything after it is still clean, so the caterpillar keeps it.`,
  };
}

function ghostQuiz(cells: number, letter: string, seenAt: number, left: number): StoryQuiz {
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `The map remembers an old '${letter}' at index ${seenAt}. Where should the tail be now? Click that box.`,
    answer: left,
    feedback: { [seenAt + 1]: `That drags the tail backwards. The body would swallow letters it already dropped.` },
    otherwise: `Look where the tail is now. Is the old '${letter}' inside the body at all?`,
    why: `The tail stays. The old '${letter}' is behind the tail, so it is not in the body. It is only a ghost.`,
  };
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh string:
 * fewer frames, and the reader moves the tail every time.
 */
function solutionFrames(chars: string[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const last = new Map<string, number>();
  let left = 0;
  let best = 0;
  let bestRange: [number, number] | null = null;
  let askedRepeat = false;
  let askedGhost = false;
  const line = (index: number) => (practice ? undefined : index);

  const seenRow = (focus?: string, tone: "hit" | "miss" = "hit") =>
    [...last.entries()].map(([key, index]) => ({ key, index, tone: key === focus ? tone : ("idle" as const) }));
  // Letters behind the tail are faded: only the body matters.
  const paint = (right: number | null, inner: (index: number) => CellTone | null) =>
    tones(chars.length, (index) => (right !== null && index < left ? "faded" : inner(index)));
  const base = (right: number | null): StringWindowState => ({
    chars,
    tones: paint(right, (index) => (right !== null && index === right ? "edge" : right !== null ? range(left, right - 1, "window")(index) : null)),
    left,
    right,
    seen: seenRow(),
    best,
    bestRange,
  });

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new string: "${chars.join("")}". The head moves by itself. You move the tail.` : "The caterpillar starts at index 0 with best = 0. It has seen no letters yet.",
    codeLine: line(1),
    state: base(null),
  });

  for (let right = 0; right < chars.length; right++) {
    const letter = chars[right];
    const seenAt = last.get(letter);
    const ghost = seenAt !== undefined && seenAt < left;
    const repeat = seenAt !== undefined && seenAt >= left;

    if (!practice || (!repeat && !ghost)) {
      frames.push({ scene, caption: `The head moves to index ${right} and eats '${letter}'.`, codeLine: line(3), state: base(right) });
    }

    if (repeat) {
      const clash: Frame = {
        scene,
        caption: `${practice ? `The head eats '${letter}' at index ${right}. ` : ""}'${letter}' is already in the body, at index ${seenAt}. A repeat!`,
        codeLine: line(4),
        state: {
          ...base(right),
          tones: paint(right, (index) => (index === seenAt || index === right ? "miss" : range(left, right - 1, "window")(index))),
          link: { from: right, to: seenAt, tone: "miss" },
          seen: seenRow(letter, "miss"),
        },
      };
      if (practice || !askedRepeat) {
        askedRepeat = true;
        clash.quiz = snapQuiz(chars.length, letter, seenAt, left);
      }
      frames.push(clash);
      left = seenAt + 1;
      frames.push({ scene, caption: `The tail snaps to ${left}, just past the old '${letter}'. The body is clean again.`, codeLine: line(5), state: base(right) });
    } else if (ghost) {
      const haunted: Frame = {
        scene,
        caption: `${practice ? `The head eats '${letter}' at index ${right}. ` : ""}The map says '${letter}' was seen at index ${seenAt}. But the tail is already at ${left}.`,
        codeLine: line(4),
        state: { ...base(right), link: { from: right, to: seenAt, tone: "ghost" }, seen: seenRow(letter, "miss") },
      };
      if (practice || !askedGhost) {
        askedGhost = true;
        haunted.quiz = ghostQuiz(chars.length, letter, seenAt, left);
      }
      frames.push(haunted);
      frames.push({
        scene,
        caption: `The Ghost Trap! That old '${letter}' is behind the tail, so it is a ghost, not part of the body. The tail never moves backwards: it stays at ${left}.`,
        codeLine: line(4),
        state: { ...base(right), ghostTail: seenAt + 1, link: { from: right, to: seenAt, tone: "ghost" }, seen: seenRow(letter, "miss") },
      });
    }

    last.set(letter, right);
    const length = right - left + 1;
    const improved = length > best;
    // The "remember" frame still shows the old best, so the next frame changes only one thing.
    const before = { best, bestRange };
    if (improved) {
      best = length;
      bestRange = [left, right];
    }
    if (practice) {
      frames.push({
        scene,
        caption: `The body is "${chars.slice(left, right + 1).join("")}", length ${length}. ${improved ? `New best: ${best}.` : `Best stays ${best}.`}`,
        state: { ...base(right), tones: paint(right, range(left, right, improved ? "done" : "window")), seen: seenRow(letter, "hit") },
      });
      continue;
    }
    frames.push({
      scene,
      caption: `Remember '${letter}' at index ${right}. The body is "${chars.slice(left, right + 1).join("")}", length ${length}.`,
      codeLine: 7,
      state: { ...base(right), ...before, tones: paint(right, range(left, right, "window")), seen: seenRow(letter, "hit") },
    });
    if (improved) {
      frames.push({ scene, caption: `${length} beats the old best. best = ${best}.`, codeLine: 8, state: { ...base(right), tones: paint(right, range(left, right, "done")) } });
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${best}. You moved the tail yourself every time.` : `The head reached the end. Every letter was eaten once. The answer is ${best}.`,
    codeLine: line(10),
    state: { ...base(null), left: null, tones: tones(chars.length, (index) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : null)) },
  });
  if (!practice) {
    const done = (index: number) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : null);
    frames.push({
      scene,
      caption: `Time: O(n). The head ate each of the ${chars.length} letters once, and the tail only ever moved forward. Compare that with the slow way.`,
      codeLine: 2,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "letters read", value: chars.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(k), where k is the number of different letters. The map keeps one entry per different letter. Here that is ${last.size}.`,
      codeLine: 0,
      state: { ...base(null), left: null, tones: tones(chars.length, done), seen: [...last.entries()].map(([key, index]) => ({ key, index, tone: "hit" as const })) },
    });
  }
  return frames;
}

export const longestUniqueSubstringStory: ProblemStory<StringWindowState> = {
  slugs: ["lc-3", "longest-unique-window"],
  pattern: "Sliding window",
  trigger: "“longest substring” with a rule about its letters",
  insight: "A caterpillar that only crawls forward. When the head eats a letter already in the body, the tail snaps just past the old copy.",
  metaphor: { name: "The caterpillar", legend: "tail = left · head = right · body = the window", terms: ["head", "tail", "body", "caterpillar"] },
  traps: [{ name: "The Ghost Trap", rule: "An old letter behind the tail is a ghost. The tail never moves backwards: check last.get(c) >= left." }],
  template: [
    "for (right = 0; right < n; right++) {",
    "    add s[right] to the window;",
    "    while (window is invalid) move left forward;   // here: snap past the old copy",
    "    best = max(best, right - left + 1);",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "the head eats each letter once; the tail only moves forward",
    space: "O(k)",
    spaceWhy: "the map holds one entry per different letter (k ≤ alphabet size)",
  },
  code: CODE,
  examples: [
    { label: '"abcabcbb"', input: "abcabcbb", expected: "3" },
    { label: '"pwwkew"', input: "pwwkew", expected: "3" },
    { label: '"abba"', input: "abba", expected: "2", note: "Tricky: an old letter outside the window" },
    { label: '"bbbbb"', input: "bbbbb", expected: "1" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-340", title: "Longest Substring with At Most K Distinct Characters" },
    { slug: "lc-424", title: "Longest Repeating Character Replacement" },
    { slug: "lc-76", title: "Minimum Window Substring" },
  ],
  answer: (input) => String(solve(input).best),
  frames: (input) => {
    const chars = [...input];
    const solved = solve(input);
    return [
      ...pictureFrames(chars, solved),
      ...slowFrames(chars),
      ...insightFrames(chars, solved),
      ...solutionFrames(chars),
      ...solutionFrames([...PRACTICE], "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(chars), left: solved.bestRange[0], right: solved.bestRange[1], tones: tones(chars.length, range(solved.bestRange[0], solved.bestRange[1], "done")), best: solved.best, bestRange: solved.bestRange },
      },
    ];
  },
  View: StringWindowView,
};
