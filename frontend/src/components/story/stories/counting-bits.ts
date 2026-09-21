import { GrokBitsView, type GrokBitCell, type GrokBitsState } from "../grok-bits-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokBitsState>;

const PRACTICE = "4";
const WIDTH = 4;

const CODE = [
  "int[] ans = new int[n + 1];",
  "for (int i = 1; i <= n; i++) ans[i] = ans[i & (i - 1)] + 1;",
  "return ans;",
];

function parse(raw: string): number {
  return Number(raw.trim());
}

function bitsOf(n: number, changed: number | null = null): GrokBitCell[] {
  const cells: GrokBitCell[] = [];
  for (let i = WIDTH - 1; i >= 0; i--) {
    const bit = (n >> i) & 1;
    cells.push({ text: String(bit), tone: WIDTH - 1 - i === changed ? "edge" : bit ? "hit" : "idle" });
  }
  return cells;
}

function ansCells(ans: number[], fillTo: number): GrokBitCell[] {
  return ans.map((v, i) => ({ text: i <= fillTo ? String(v) : "·", tone: i === fillTo ? "edge" : i < fillTo ? "done" : "idle" }));
}

function blank(n: number, ans: number[], fillTo = -1, i = 0): GrokBitsState {
  return {
    bits: bitsOf(i),
    bitsLabel: "i",
    changedBit: null,
    values: [{ text: `n=${n}`, tone: "idle" }],
    cursor: null,
    mixLabel: null,
    mixValue: null,
    row: { label: "counts", cells: ansCells(ans, fillTo) },
    note: null,
    trapNote: null,
    counter: null,
    pickOn: "row",
  };
}

function solve(n: number): number[] {
  const ans = Array.from({ length: n + 1 }, () => 0);
  for (let i = 1; i <= n; i++) {
    let x = i;
    let count = 0;
    while (x) {
      x &= x - 1;
      count++;
    }
    ans[i] = count;
  }
  return ans;
}

function fill(n: number): number[] {
  const ans = Array.from({ length: n + 1 }, () => 0);
  for (let i = 1; i <= n; i++) ans[i] = ans[i & (i - 1)] + 1;
  return ans;
}

function pictureFrames(n: number): Frame[] {
  const ans = fill(n);
  return [
    { scene: "picture", caption: `We need a count of 1-bits for every number from 0 through ${n}.`, state: blank(n, ans, -1, 0) },
    {
      scene: "picture",
      caption: `Slot 0 is 0. Slot ${n} must exist too, so the row has ${n + 1} boxes.`,
      state: { ...blank(n, ans, n, n), note: `${n + 1} slots` },
    },
    {
      scene: "picture",
      caption: `The Length n Trap would allocate only ${n} slots and miss the last count.`,
      state: {
        ...blank(n, ans, n - 1, n),
        trapNote: "The Length n Trap",
        row: {
          label: "counts",
          cells: [
            ...ans.slice(0, n).map((v): GrokBitCell => ({ text: String(v), tone: "idle" })),
            { text: "?", tone: "miss" },
          ],
        },
      },
    },
    {
      scene: "picture",
      caption: `The goal: the full row of counts. Here it is [${ans.join(",")}].`,
      state: { ...blank(n, ans, n, n), mixLabel: "row", mixValue: `[${ans.join(",")}]` },
    },
  ];
}

function slowFrames(n: number): Frame[] {
  const frames: Frame[] = [];
  const ans = Array.from({ length: n + 1 }, () => 0);
  let drops = 0;
  for (let i = 0; i <= n; i++) {
    let x = i;
    let count = 0;
    while (x) {
      x &= x - 1;
      count++;
      drops++;
    }
    ans[i] = count;
    if (i <= 3) {
      frames.push({
        scene: "slow",
        caption: i === 0 ? "The slow way: count the 1-bits of each number from scratch." : `Count the 1s of ${i} from scratch, repeating work we already did.`,
        state: { ...blank(n, ans, i, i), counter: { label: "drops from scratch", value: String(drops) } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We dropped 1s from scratch for every i. This is O(n log n) time.`,
    state: { ...blank(n, ans, n, n), counter: { label: "drops from scratch", value: String(drops) } },
  });
  return frames;
}

function insightFrames(n: number): Frame[] {
  const first = Math.min(3, n);
  const smaller = first & (first - 1);
  const ans = fill(n);
  return [
    {
      scene: "insight",
      caption: n === 0
        ? "Picture a row of counts. For n = 0 the row is just [0]."
        : `Picture a row of counts. Number ${first} with its lowest 1 dropped is ${smaller}, already in the row.`,
      state: { ...blank(n, ans, first, first), bits: bitsOf(first) },
    },
    {
      scene: "insight",
      caption: n === 0
        ? "There is nothing to fill."
        : `So the count for ${first} is the count for ${smaller}, plus one for the dropped bit.`,
      state: { ...blank(n, ans, first, first), note: `${ans[smaller]} + 1` },
    },
    {
      scene: "insight",
      caption: "The Length n Trap misses slot n. The row must run from 0 through n.",
      state: { ...blank(n, ans, n, n), trapNote: "The Length n Trap" },
    },
  ];
}

function slotQuiz(n: number): StoryQuiz {
  const answer = n;
  const cells = n + 1;
  const feedback: Record<number, string> = {};
  for (let i = 0; i < cells; i++) {
    if (i === answer) continue;
    feedback[i] = i === 0 ? "Slot 0 stays 0. We still need a slot for n." : "That slot is inside 0 through n-1. The last slot is n.";
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "How long is the row? Click the last slot we must fill.",
    answer,
    feedback,
    otherwise: "The last slot is the one labelled n, after every smaller index.",
    why: "The Length n Trap allocates n slots and drops index n. You need n + 1 slots.",
  };
}

function fillQuiz(i: number, smaller: number): StoryQuiz {
  return {
    kind: "choice",
    question: `We already know the count for ${smaller} (that is ${i} with its lowest 1 dropped). What is the count for ${i}?`,
    options: ["Copy the smaller count, and forget the dropped bit", "Smaller count plus one, for the dropped 1"],
    answer: 1,
    why: "The dropped bit is the extra 1. Reuse the smaller count and add one.",
  };
}

function solutionFrames(n: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const ans = Array.from({ length: n + 1 }, () => 0);

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new n = ${n}. Size the row, then fill it.` : "Make a row of n + 1 slots. Slot 0 stays 0.",
    codeLine: line(0),
    state: blank(n, ans, 0, 0),
  });

  const size: Frame = {
    scene,
    caption: "The row must hold every i from 0 through n.",
    codeLine: line(0),
    state: blank(n, ans, -1, 0),
  };
  size.quiz = slotQuiz(n);
  frames.push(size);

  frames.push({
    scene,
    caption: `The row has ${n + 1} slots. The Length n Trap would have stopped at ${n} slots.`,
    codeLine: line(0),
    state: { ...blank(n, ans, n, n), trapNote: "The Length n Trap" },
  });

  let askedFill = false;
  for (let i = 1; i <= n; i++) {
    const smaller = i & (i - 1);
    const look: Frame = {
      scene,
      caption: `Fill slot ${i}. Dropping its lowest 1 leaves ${smaller}.`,
      codeLine: line(1),
      state: { ...blank(n, ans, i - 1, i), bits: bitsOf(i), changedBit: bitsOf(i).findIndex((c, idx) => c.text !== bitsOf(smaller)[idx].text) },
    };
    if (practice || !askedFill) {
      askedFill = true;
      look.quiz = fillQuiz(i, smaller);
    }
    frames.push(look);
    ans[i] = ans[smaller] + 1;
    frames.push({
      scene,
      caption: `Write ${ans[i]} in slot ${i}: the smaller count plus one.`,
      codeLine: line(1),
      state: { ...blank(n, ans, i, i), bits: bitsOf(i) },
    });
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is [${ans.join(",")}]. You sized the row.` : `The row is full. The answer is [${ans.join(",")}].`,
    codeLine: line(2),
    state: { ...blank(n, ans, n, n), mixLabel: "row", mixValue: `[${ans.join(",")}]` },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each i does a constant amount of work, using a count already stored.`,
      codeLine: 1,
      state: { ...blank(n, ans, n, n), counter: { label: "slots filled", value: String(n + 1) } },
    });
    frames.push({
      scene,
      caption: "Space: O(n). The answer row has n + 1 slots. No extra table.",
      codeLine: 0,
      state: { ...blank(n, ans, n, n), counter: { label: "slots", value: String(n + 1) } },
    });
  }
  return frames;
}

export const countingBitsStory: ProblemStory<GrokBitsState> = {
  slugs: ["lc-338"],
  pattern: "Bit dynamic programming",
  trigger: "an array of length n+1 where ans[i] is the number of 1 bits in i",
  insight: "A row of counts. Each i has one more 1 than i with its lowest 1 dropped, and that smaller count is already in the row.",
  metaphor: { name: "The count row", legend: "slot i = ans[i] · smaller = i with lowest 1 dropped · n = last index", terms: ["row", "slot", "count", "bit"] },
  traps: [
    {
      name: "The Length n Trap",
      rule: "Allocate n + 1 slots. You need a count for every i from 0 through n.",
    },
  ],
  template: [
    "ans = row of n+1 zeros",
    "for i from 1 to n:",
    "    ans[i] = ans[i with lowest 1 dropped] + 1",
    "return ans",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each i does a constant amount of work, using a count already stored",
    space: "O(n)",
    spaceWhy: "the answer array has n+1 slots",
  },
  code: CODE,
  examples: [
    { label: "n = 5", input: "5", expected: "[0,1,1,2,1,2]" },
    { label: "n = 2", input: "2", expected: "[0,1,1]" },
    { label: "n = 0", input: "0", expected: "[0]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-191", title: "Number of 1 Bits" },
    { slug: "lc-136", title: "Single Number" },
    { slug: "lc-50", title: "Pow(x, n)" },
  ],
  answer: (input) => `[${solve(parse(input)).join(",")}]`,
  frames: (input) => {
    const n = parse(input);
    const ans = fill(n);
    return [
      ...pictureFrames(n),
      ...slowFrames(n),
      ...insightFrames(n),
      ...solutionFrames(n),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(n, ans, n, n), mixLabel: "row", mixValue: `[${ans.join(",")}]` },
      },
    ];
  },
  View: GrokBitsView,
};
