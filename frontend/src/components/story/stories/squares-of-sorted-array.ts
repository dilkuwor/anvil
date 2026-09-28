import type { CellTone } from "@/components/learn/viz/primitives";

import { Rec01RowsView, type Rec01Row, type Rec01RowsState } from "../rec01-rows-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Rec01RowsState>;

/** Fresh row for the "your turn" run: no ties, and the smallest square sits in the middle. */
const PRACTICE = "[-6,-2,1,4]";

const CODE = [
  "int n = nums.length;",
  "int[] result = new int[n];",
  "int left = 0, right = n - 1;",
  "for (int slot = n - 1; slot >= 0; slot--) {",
  "    int leftSquare = nums[left] * nums[left];",
  "    int rightSquare = nums[right] * nums[right];",
  "    if (leftSquare > rightSquare) {",
  "        result[slot] = leftSquare;",
  "        left++;",
  "    } else {",
  "        result[slot] = rightSquare;",
  "        right--;",
  "    }",
  "}",
  "return result;",
];

function parse(raw: string): number[] {
  return [...raw.matchAll(/-?\d+/g)].map(Number);
}

/** Independent check: square, then sort. */
function solve(nums: number[]): number[] {
  return nums.map((value) => value * value).sort((a, b) => a - b);
}

function list(values: number[]): string {
  return `[${values.join(",")}]`;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function numsRow(nums: number[], paint: (index: number) => CellTone | null = () => null, extra: Partial<Rec01Row> = {}): Rec01Row {
  return { name: "nums", values: [...nums], tones: tones(nums.length, paint), markers: [], ...extra };
}

function answerRow(values: (number | null)[], paint: (index: number) => CellTone | null = () => null, extra: Partial<Rec01Row> = {}): Rec01Row {
  return { name: "answer", values: values.map((value) => (value === null ? "" : value)), tones: tones(values.length, paint), markers: [], ...extra };
}

function empty(n: number): (number | null)[] {
  return Array.from({ length: n }, () => null);
}

function pictureFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const inPlace = nums.map((value) => value * value);
  const sorted = solve(nums);
  const frames: Frame[] = [
    { scene: "picture", caption: `A row of ${n} numbers, sorted from small to large. Some of them are negative.`, state: { rows: [numsRow(nums), answerRow(empty(n))] } },
    {
      scene: "picture",
      caption: `Square each number: multiply it by itself. ${nums[0]} squared is ${inPlace[0]}.`,
      state: { rows: [numsRow(nums, (index) => (index === 0 ? "edge" : null)), answerRow(inPlace.map((value, index) => (index === 0 ? value : null)), (index) => (index === 0 ? "window" : null))] },
    },
  ];
  const outOfOrder = inPlace.findIndex((value, index) => index > 0 && value < inPlace[index - 1]);
  if (outOfOrder > 0) {
    frames.push({
      scene: "picture",
      caption: `Not allowed: keeping the squares where they are. ${inPlace[outOfOrder - 1]} before ${inPlace[outOfOrder]} is not sorted.`,
      state: { rows: [numsRow(nums), answerRow(inPlace, (index) => (index === outOfOrder || index === outOfOrder - 1 ? "miss" : null))] },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: a new row with every square, sorted from small to large. Here that is ${list(sorted)}.`,
    state: { rows: [numsRow(nums), answerRow(sorted, () => "done")] },
  });
  return frames;
}

/** A real merge sort, counting every comparison it makes. */
function mergeSortCount(values: number[]): { sorted: number[]; compares: number } {
  if (values.length <= 1) return { sorted: [...values], compares: 0 };
  const middle = Math.floor(values.length / 2);
  const a = mergeSortCount(values.slice(0, middle));
  const b = mergeSortCount(values.slice(middle));
  const sorted: number[] = [];
  let compares = a.compares + b.compares;
  let i = 0;
  let j = 0;
  while (i < a.sorted.length && j < b.sorted.length) {
    compares += 1;
    sorted.push(a.sorted[i] <= b.sorted[j] ? a.sorted[i++] : b.sorted[j++]);
  }
  return { sorted: [...sorted, ...a.sorted.slice(i), ...b.sorted.slice(j)], compares };
}

function slowFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const inPlace = nums.map((value) => value * value);
  const { sorted, compares } = mergeSortCount(inPlace);
  return [
    {
      scene: "slow",
      caption: `The slow way: square every number into the answer row first. That is ${n} steps.`,
      state: { rows: [numsRow(nums, () => "faded"), answerRow(inPlace, () => "window")], counter: { label: "steps", value: n } },
    },
    {
      scene: "slow",
      caption: `Then sort the answer row. A good sort still compared pairs ${compares} times here.`,
      state: { rows: [numsRow(nums, () => "faded"), answerRow(sorted, () => "done")], counter: { label: "steps", value: n + compares } },
    },
    {
      scene: "slow",
      caption: `That is O(n log n) time. The sort throws away something we were given for free: the row was already sorted.`,
      state: { rows: [numsRow(nums), answerRow(sorted, () => "faded")], counter: { label: "steps", value: n + compares } },
    },
  ];
}

function insightFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const scouts = [
    { index: 0, label: "left", tone: "accent" as const },
    { index: n - 1, label: "right", tone: "accent" as const },
  ];
  let smallest = 0;
  nums.forEach((value, index) => {
    if (Math.abs(value) < Math.abs(nums[smallest])) smallest = index;
  });
  return [
    {
      scene: "insight",
      caption: `Picture two scouts, one standing at each end of the row.`,
      state: { rows: [numsRow(nums, (index) => (index === 0 || index === n - 1 ? "edge" : null), { markers: scouts }), answerRow(empty(n))] },
    },
    {
      scene: "insight",
      caption: `The biggest square is always at one of the two ends: the most negative number or the biggest one. Here that is ${nums[0] ** 2} or ${nums[n - 1] ** 2}.`,
      state: { rows: [numsRow(nums, (index) => (index === 0 || index === n - 1 ? "hit" : null), { markers: scouts }), answerRow(empty(n))] },
    },
    {
      scene: "insight",
      caption:
        smallest > 0 && smallest < n - 1
          ? `The smallest square can hide in the middle, like ${nums[smallest] ** 2} here. So the scouts fill the answer from the back slot forward.`
          : `The smallest square, ${nums[smallest] ** 2}, is at an end here, but it could sit anywhere. So the scouts fill the answer from the back slot forward.`,
      state: {
        rows: [
          numsRow(nums, (index) => (index === smallest ? "window" : null), { markers: scouts }),
          answerRow(empty(n), (index) => (index === n - 1 ? "window" : null), { markers: [{ index: n - 1, label: "slot", tone: "accent" }] }),
        ],
      },
    },
  ];
}

function fillQuiz(n: number): StoryQuiz {
  return {
    kind: "cell",
    cells: n,
    numbered: true,
    question: "The scouts hold the two end numbers. Which slot of the answer row do they fill first? Click it.",
    answer: n - 1,
    feedback: { 0: "Slot 0 needs the smallest square. The scouts at the ends hold the biggest ones, not the smallest." },
    otherwise: "Think about which squares the scouts are holding: big ones or small ones?",
    why: "The back slot. The ends hold the biggest squares, and the biggest square belongs at the back.",
  };
}

function scoutQuiz(n: number, winner: number, loser: number, winSquare: number, loseSquare: number): StoryQuiz {
  return {
    kind: "cell",
    cells: n,
    numbered: true,
    question: "Which scout hands in its square now? Click that scout's box.",
    answer: winner,
    feedback: { [loser]: `Its square, ${loseSquare}, is smaller. The back slot needs the bigger square.` },
    otherwise: "Only the two scouts are holding a number. Pick one of them.",
    why: `Its square, ${winSquare}, is the bigger one, so it fills the back slot.`,
  };
}

/** The real algorithm, one frame per change. `practice` reruns it on a fresh row: the reader makes every choice. */
function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const n = nums.length;
  const result: (number | null)[] = empty(n);
  const line = (index: number) => (practice ? undefined : index);
  let left = 0;
  let right = n - 1;
  let askedScout = false;

  const view = (slot: number | null, highlight: number[] = [], extra: Partial<Rec01RowsState> = {}): Rec01RowsState => ({
    rows: [
      numsRow(nums, (index) => (index < left || index > right ? "faded" : highlight.includes(index) ? "edge" : null), {
        markers: left <= right ? [{ index: left, label: "left", tone: "accent" }, { index: right, label: "right", tone: "accent" }] : [],
      }),
      answerRow([...result], (index) => (result[index] !== null ? "done" : index === slot ? "window" : null), {
        markers: slot !== null && slot >= 0 ? [{ index: slot, label: "slot", tone: "accent" }] : [],
      }),
    ],
    ...extra,
  });

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: ${list(nums)}. You make every choice.` : "Two scouts stand at the two ends of the row. The answer row is empty.",
    codeLine: line(2),
    state: { ...view(null), pickRow: 1 },
    quiz: fillQuiz(n),
  });
  frames.push({
    scene,
    caption: `The back slot, ${n - 1}. The scouts hold the biggest squares, so the back fills first.`,
    codeLine: line(3),
    state: view(n - 1),
  });
  if (!practice) {
    const firstPick = Math.max(nums[0] ** 2, nums[n - 1] ** 2);
    const base = view(n - 1);
    frames.push({
      scene,
      caption: `The Front Fill Trap: putting a scout's square in slot 0. That would put ${firstPick} first, but slot 0 needs the smallest square.`,
      codeLine: 3,
      state: {
        ...base,
        rows: [base.rows[0], answerRow([firstPick, ...empty(n - 1)], (index) => (index === 0 ? "miss" : null), { note: { index: 0, text: "✕ not the smallest" } })],
      },
    });
  }

  for (let slot = n - 1; slot >= 0; slot--) {
    const leftSquare = nums[left] ** 2;
    const rightSquare = nums[right] ** 2;
    if (left === right) {
      result[slot] = leftSquare;
      frames.push({
        scene,
        caption: `Both scouts stand on the same box, ${nums[left]}. Its square, ${leftSquare}, goes into the last empty slot, ${slot}.`,
        codeLine: line(10),
        state: view(slot, [left]),
      });
      right -= 1;
      continue;
    }
    const takeLeft = leftSquare > rightSquare;
    const winner = takeLeft ? left : right;
    const tie = leftSquare === rightSquare;
    const compare: Frame = {
      scene,
      caption: tie
        ? `The left scout holds ${nums[left]} and the right scout holds ${nums[right]}. Both squares are ${leftSquare}, so either may go. We take the right one.`
        : `The left scout holds ${nums[left]}, square ${leftSquare}. The right scout holds ${nums[right]}, square ${rightSquare}.`,
      codeLine: line(6),
      state: { ...view(slot, [left, right]), pickRow: 0 },
    };
    if (!tie && (practice || !askedScout)) {
      askedScout = true;
      compare.quiz = scoutQuiz(n, winner, takeLeft ? right : left, Math.max(leftSquare, rightSquare), Math.min(leftSquare, rightSquare));
    }
    frames.push(compare);

    result[slot] = Math.max(leftSquare, rightSquare);
    if (practice) {
      if (takeLeft) left += 1;
      else right -= 1;
      frames.push({
        scene,
        caption: `${result[slot]} goes into slot ${slot}. The ${takeLeft ? "left" : "right"} scout steps inward.`,
        state: view(slot - 1),
      });
      continue;
    }
    frames.push({
      scene,
      caption: `${tie ? `The right scout's ${rightSquare}` : `${result[slot]} is bigger. It`} goes into slot ${slot}, the back empty slot.`,
      codeLine: takeLeft ? 7 : 10,
      state: view(slot, [winner]),
    });
    if (takeLeft) left += 1;
    else right -= 1;
    frames.push({
      scene,
      caption: `The ${takeLeft ? "left" : "right"} scout steps inward, to ${nums[takeLeft ? left : right]}. The slot moves one step toward the front.`,
      codeLine: takeLeft ? 8 : 11,
      state: view(slot - 1),
    });
  }

  const answer = list(result.map((value) => value ?? 0));
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${answer}. You chose every scout yourself.` : `Every slot is filled, from the back to the front. The answer is ${answer}.`,
    codeLine: line(14),
    state: view(null),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${n} slots was filled once, and each fill moved one scout one step.`,
      codeLine: 3,
      state: { ...view(null), counter: { label: "slots filled", value: n } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). The answer row holds ${n} squares. The two scouts are just two positions.`,
      codeLine: 1,
      state: view(null),
    });
  }
  return frames;
}

export const squaresOfSortedArrayStory: ProblemStory<Rec01RowsState> = {
  slugs: ["lc-977"],
  pattern: "Two pointers",
  trigger: "a sorted array with negative numbers, and the squares must come out sorted",
  insight: "The biggest square is always at one of the two ends. Two scouts walk inward, and the bigger square fills the answer from the back.",
  metaphor: { name: "The two scouts", legend: "scouts = left and right · back slot = slot, from n - 1 down to 0", terms: ["scout", "slot", "back"] },
  traps: [{ name: "The Front Fill Trap", rule: "The ends hold the biggest squares, never the smallest. Fill the answer from the back slot forward." }],
  template: [
    "left = 0; right = n - 1;",
    "for (slot = n - 1; slot >= 0; slot--) {",
    "    take the bigger of the two ends;",
    "    write it at slot; move that end inward;",
    "}",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each slot is filled once, and each fill moves one scout one step",
    space: "O(n)",
    spaceWhy: "the answer row holds n squares",
  },
  code: CODE,
  examples: [
    { label: "[-4,-1,0,3,10]", input: "[-4,-1,0,3,10]", expected: "[0,1,9,16,100]" },
    { label: "[-7,-3,2,3,11]", input: "[-7,-3,2,3,11]", expected: "[4,9,9,49,121]", note: "Tricky: -3 and 3 have the same square" },
    { label: "[-5,-3,-2,-1]", input: "[-5,-3,-2,-1]", expected: "[1,4,9,25]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-167", title: "Two Sum II - Input Array Is Sorted" },
    { slug: "lc-15", title: "3Sum" },
    { slug: "lc-88", title: "Merge Sorted Array" },
  ],
  answer: (input) => list(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          rows: [
            numsRow(nums, (index) => (index === 0 || index === nums.length - 1 ? "hit" : null), {
              markers: [
                { index: 0, label: "left", tone: "accent" },
                { index: nums.length - 1, label: "right", tone: "accent" },
              ],
            }),
            answerRow(solve(nums), () => "done"),
          ],
        },
      },
    ];
  },
  View: Rec01RowsView,
};
