import type { CellTone } from "@/components/learn/viz/primitives";

import { StringWindowView, type StringWindowState } from "../string-window-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StringWindowState>;

/** Fresh row for "your turn". A third kind arrives after two 1s, so the tail must crawl, not jump. */
const PRACTICE = "[1,1,2,3,2]";

const CODE = [
  "Map<Integer, Integer> basket = new HashMap<>();",
  "int left = 0, best = 0;",
  "for (int right = 0; right < fruits.length; right++) {",
  "    basket.merge(fruits[right], 1, Integer::sum);",
  "    while (basket.size() > 2) {",
  "        int out = fruits[left++];",
  "        if (basket.merge(out, -1, Integer::sum) == 0) basket.remove(out);",
  "    }",
  "    best = Math.max(best, right - left + 1);",
  "}",
  "return best;",
];

function parse(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return [];
  return inner.split(/[,\s]+/).filter(Boolean);
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

type Solved = {
  best: number;
  bestRange: [number, number];
  firstOverflow: { right: number; left: number } | null;
};

function solve(chars: string[]): Solved {
  const counts = new Map<string, number>();
  let left = 0;
  let best = 0;
  let bestRange: [number, number] = [0, 0];
  let firstOverflow: Solved["firstOverflow"] = null;
  for (let right = 0; right < chars.length; right++) {
    counts.set(chars[right], (counts.get(chars[right]) ?? 0) + 1);
    while (counts.size > 2) {
      firstOverflow ??= { right, left };
      const gone = chars[left];
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

function pictureFrames(chars: string[], solved: Solved): Frame[] {
  const frames: Frame[] = [
    { scene: "picture", caption: `Each box is a tree. The number is the kind of fruit on it.`, state: blank(chars) },
  ];
  const [from, to] = solved.bestRange;
  const allowed = chars.slice(from, to + 1).join(",");
  frames.push({
    scene: "picture",
    caption: `You may pick from at most two kinds in a row. [${allowed}] uses two kinds, so it is allowed. Its length is ${solved.best}.`,
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")) },
  });
  if (solved.firstOverflow) {
    const { left, right } = solved.firstOverflow;
    frames.push({
      scene: "picture",
      caption: `[${chars.slice(left, right + 1).join(",")}] is not allowed: that run has three kinds.`,
      state: {
        ...blank(chars),
        tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right, "window")(index))),
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the longest allowed walk, and its length.",
    state: { ...blank(chars), tones: tones(chars.length, range(from, to, "done")), best: solved.best, bestRange: solved.bestRange },
  });
  return frames;
}

function slowFrames(chars: string[]): Frame[] {
  const frames: Frame[] = [];
  let total = 0;
  for (let start = 0; start < chars.length; start++) {
    const kinds = new Set<string>();
    let end = start;
    while (end < chars.length && (kinds.size < 2 || kinds.has(chars[end]))) kinds.add(chars[end++]);
    total += end - start;
    if (start > 2) continue;
    const hitThird = end < chars.length;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: start at the first tree and crawl until a third kind appears.${hitThird ? ` Stop at kind ${chars[end]}.` : ""}`
          : `Go back, start at the tree of kind ${chars[start]}, and crawl over trees you already read.`,
      state: {
        ...blank(chars),
        left: start,
        tones: tones(chars.length, (index) => (hitThird && index === end ? "miss" : range(start, end - 1, "window")(index))),
        counter: { label: "trees read", value: total },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `From every start we read ${total} trees for a row of only ${chars.length}. This is O(n²) time: we keep re-reading the same trees.`,
    state: { ...blank(chars), tones: tones(chars.length, () => "faded"), counter: { label: "trees read", value: total } },
  });
  return frames;
}

function insightFrames(chars: string[], solved: Solved): Frame[] {
  const overflow = solved.firstOverflow;
  if (!overflow) {
    return [
      {
        scene: "insight",
        caption: `Picture a caterpillar. Its body may hold only two kinds of fruit. Here the whole row already uses two, so it can keep them all.`,
        state: { ...blank(chars), left: 0, right: chars.length - 1, tones: tones(chars.length, range(0, chars.length - 1, "window")) },
      },
      {
        scene: "insight",
        caption: `The head only crawls forward. The tail never jumps to the head. That is the whole idea.`,
        state: { ...blank(chars), left: 0, right: chars.length - 1, tones: tones(chars.length, range(0, chars.length - 1, "done")) },
      },
    ];
  }
  const { left, right } = overflow;
  const body = chars.slice(left, right).join(",");
  const third = chars[right];
  return [
    {
      scene: "insight",
      caption: `Picture a caterpillar. Its body [${body}] holds two kinds. The head is about to eat kind ${third}, a third kind.`,
      state: {
        ...blank(chars),
        left,
        right,
        tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
      },
    },
    {
      scene: "insight",
      caption: `It does not jump the tail to the head. That would throw away a kind that can stay. The tail crawls one tree at a time.`,
      state: {
        ...blank(chars),
        left,
        right,
        ghostTail: right,
        tones: tones(chars.length, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
      },
    },
    {
      scene: "insight",
      caption: `The tail leaves trees until only two kinds remain. The head never moved backwards.`,
      state: {
        ...blank(chars),
        left: solveAfterFirstDrop(chars, left, right),
        right,
        tones: tones(chars.length, range(solveAfterFirstDrop(chars, left, right), right, "window")),
      },
    },
  ];
}

/** After the first overflow, crawl the tail until two kinds remain. */
function solveAfterFirstDrop(chars: string[], left: number, right: number): number {
  const counts = new Map<string, number>();
  for (let index = left; index <= right; index++) counts.set(chars[index], (counts.get(chars[index]) ?? 0) + 1);
  let tail = left;
  while (counts.size > 2) {
    const gone = chars[tail];
    const next = (counts.get(gone) ?? 0) - 1;
    if (next === 0) counts.delete(gone);
    else counts.set(gone, next);
    tail++;
  }
  return tail;
}

function shrinkQuiz(cells: number, left: number, right: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  feedback[right] = `That is the Restart Trap. Jumping the tail to the head throws away fruit that can stay.`;
  if (left + 1 < cells && left + 1 !== right) {
    feedback[left + 1] = `The tail crawls one tree at a time. It is still on this tree, so it leaves this one first.`;
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `A third kind arrived. The tail must leave a tree. Which box does it leave first? Click that box.`,
    answer: left,
    feedback,
    otherwise: `The tail crawls one tree at a time. Leave the tree it is sitting on.`,
    why: `The tail leaves the tree it is on, then checks the body again. It never jumps to the head.`,
  };
}

function solutionFrames(chars: string[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const counts = new Map<string, number>();
  let left = 0;
  let best = 0;
  let bestRange: [number, number] | null = null;
  let askedShrink = false;
  let showedRestart = false;
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
    counter: { label: "kinds in the body", value: counts.size },
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${chars.join(",")}]. The head moves by itself. You move the tail.`
      : "The caterpillar starts at the first tree with best = 0. Its body is empty.",
    codeLine: line(1),
    state: base(null),
  });

  for (let right = 0; right < chars.length; right++) {
    const kind = chars[right];
    if (!practice) {
      frames.push({
        scene,
        caption: `The head moves to the tree of kind ${kind}.`,
        codeLine: line(3),
        state: base(right),
      });
    }

    counts.set(kind, (counts.get(kind) ?? 0) + 1);

    while (counts.size > 2) {
      const clash: Frame = {
        scene,
        caption: practice
          ? `The head eats kind ${kind}. The body now holds three kinds.`
          : `Kind ${kind} is a third kind. The body is too full.`,
        codeLine: line(4),
        state: {
          ...base(right),
          tones: paint(right, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
          counter: { label: "kinds in the body", value: counts.size },
        },
      };
      if (practice || !askedShrink) {
        askedShrink = true;
        clash.quiz = shrinkQuiz(chars.length, left, right);
      }
      frames.push(clash);

      if (!showedRestart && !practice) {
        showedRestart = true;
        frames.push({
          scene,
          caption: `The Restart Trap! Jumping the tail to the head would throw away a kind that can stay. The tail crawls instead.`,
          codeLine: line(5),
          state: {
            ...base(right),
            ghostTail: right,
            tones: paint(right, (index) => (index === right ? "miss" : range(left, right - 1, "window")(index))),
            counter: { label: "kinds in the body", value: counts.size },
          },
        });
      }

      const gone = chars[left];
      const next = (counts.get(gone) ?? 0) - 1;
      if (next === 0) counts.delete(gone);
      else counts.set(gone, next);
      left++;
      frames.push({
        scene,
        caption: `The tail leaves the tree of kind ${gone}. The body now holds ${counts.size} kind${counts.size === 1 ? "" : "s"}.`,
        codeLine: line(6),
        state: base(right),
      });
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
        caption: `The body is [${chars.slice(left, right + 1).join(",")}], length ${length}. ${improved ? `New best: ${best}.` : `Best stays ${best}.`}`,
        state: { ...base(right), tones: paint(right, range(left, right, improved ? "done" : "window")) },
      });
      continue;
    }
    frames.push({
      scene,
      caption: `The body is [${chars.slice(left, right + 1).join(",")}], length ${length}.`,
      codeLine: line(8),
      state: { ...base(right), ...before, tones: paint(right, range(left, right, "window")) },
    });
    if (improved) {
      frames.push({
        scene,
        caption: `${length} beats the old best. best = ${best}.`,
        codeLine: line(8),
        state: { ...base(right), tones: paint(right, range(left, right, "done")) },
      });
    }
  }

  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${best}. You moved the tail yourself every time.`
      : `The head reached the end. Every tree was visited once. The answer is ${best}.`,
    codeLine: line(10),
    state: {
      ...base(null),
      left: null,
      tones: tones(chars.length, (index) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : null)),
      counter: null,
    },
  });
  if (!practice) {
    const done = (index: number) => (bestRange ? range(bestRange[0], bestRange[1], "done")(index) : null);
    frames.push({
      scene,
      caption: `Time: O(n). The head ate each of the ${chars.length} trees once, and the tail only ever crawled forward.`,
      codeLine: 2,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "trees read", value: chars.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(1). The notebook holds at most two kinds, no matter how long the row is.`,
      codeLine: 0,
      state: { ...base(null), left: null, tones: tones(chars.length, done), counter: { label: "kinds in the body", value: Math.min(2, new Set(chars).size) } },
    });
  }
  return frames;
}

export const fruitIntoBasketsStory: ProblemStory<StringWindowState> = {
  slugs: ["lc-904"],
  pattern: "Window, at most 2 distinct",
  trigger: "a row of items, and you may keep at most two kinds in a neighbour run",
  insight: "A caterpillar whose body holds only two kinds. A third kind makes the tail crawl forward until one kind is gone, never jump to the head.",
  metaphor: { name: "The caterpillar", legend: "tail = left · head = right · body = the window of at most two kinds", terms: ["head", "tail", "body", "caterpillar"] },
  traps: [
    {
      name: "The Restart Trap",
      rule: "A third kind does not send the tail to the head. The tail crawls one tree at a time until only two kinds remain.",
    },
  ],
  template: [
    "for (right = 0; right < n; right++) {",
    "    add fruits[right] to the window;",
    "    while (window has more than 2 kinds) move left forward;",
    "    best = max(best, right - left + 1);",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "the head eats each tree once; the tail only crawls forward",
    space: "O(1)",
    spaceWhy: "the notebook holds at most two kinds",
  },
  code: CODE,
  examples: [
    { label: "[1,2,1]", input: "[1,2,1]", expected: "3" },
    { label: "[0,1,2,2]", input: "[0,1,2,2]", expected: "3", note: "A third kind: the tail crawls, it does not jump" },
    { label: "[1,2,3,2,2]", input: "[1,2,3,2,2]", expected: "4" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-3", title: "Longest Substring Without Repeating Characters" },
    { slug: "lc-340", title: "Longest Substring with At Most K Distinct Characters" },
    { slug: "lc-424", title: "Longest Repeating Character Replacement" },
  ],
  answer: (input) => String(solve(parse(input)).best),
  frames: (input) => {
    const chars = parse(input);
    const solved = solve(chars);
    return [
      ...pictureFrames(chars, solved),
      ...slowFrames(chars),
      ...insightFrames(chars, solved),
      ...solutionFrames(chars),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(chars),
          left: solved.bestRange[0],
          right: solved.bestRange[1],
          tones: tones(chars.length, range(solved.bestRange[0], solved.bestRange[1], "done")),
          best: solved.best,
          bestRange: solved.bestRange,
        },
      },
    ];
  },
  View: StringWindowView,
};
