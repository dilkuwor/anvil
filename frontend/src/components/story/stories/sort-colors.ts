import type { CellTone } from "@/components/learn/viz/primitives";

import { Rec01RowsView, type Rec01Row, type Rec01RowsState, type RowBand, type RowMarker } from "../rec01-rows-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Rec01RowsState>;

/** Fresh row for the "your turn" run: a 2 swaps with the back and a 0 comes back unseen. */
const PRACTICE = "[1,2,0]";

const CODE = [
  "int low = 0, mid = 0, high = nums.length - 1;",
  "while (mid <= high) {",
  "    if (nums[mid] == 0) {",
  "        swap(nums, low, mid);",
  "        low++;",
  "        mid++;",
  "    } else if (nums[mid] == 1) {",
  "        mid++;",
  "    } else {",
  "        swap(nums, mid, high);",
  "        high--;",
  "    }",
  "}",
  "return nums;",
];

const NAMES = ["red", "white", "blue"];

function parse(raw: string): number[] {
  return [...raw.matchAll(/\d+/g)].map(Number);
}

/** Independent check: count the colours and write them back. */
function solve(nums: number[]): number[] {
  const count = [0, 0, 0];
  for (const value of nums) count[value] += 1;
  return [...Array(count[0]).fill(0), ...Array(count[1]).fill(1), ...Array(count[2]).fill(2)];
}

function list(values: number[]): string {
  return `[${values.join(",")}]`;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function plain(nums: number[], paint: (index: number) => CellTone | null = () => null, extra: Partial<Rec01Row> = {}): Rec01Row {
  return { values: [...nums], tones: tones(nums.length, paint), markers: [], ...extra };
}

/** The row split into its zones: 0s before low, 1s from low to mid, unknown from mid to high, 2s after high. */
function zoned(nums: number[], low: number, mid: number, high: number, focus: number[] = [], extra: Partial<Rec01Row> = {}): Rec01Row {
  const n = nums.length;
  const bands: RowBand[] = [];
  if (low > 0) bands.push({ from: 0, to: low - 1, label: "0s", tone: "teal" });
  if (mid > low) bands.push({ from: low, to: mid - 1, label: "1s", tone: "accent" });
  if (high < n - 1) bands.push({ from: high + 1, to: n - 1, label: "2s", tone: "teal" });
  const markers: RowMarker[] = [
    { index: Math.min(low, n - 1), label: "low", tone: "accent" },
    { index: Math.min(mid, n - 1), label: "mid", tone: "accent" },
    { index: Math.max(high, 0), label: "high", tone: "accent" },
  ];
  return {
    values: [...nums],
    tones: tones(n, (index) => (focus.includes(index) ? "edge" : index < low || index > high ? "done" : index < mid ? "hit" : null)),
    markers: mid <= high ? markers : [],
    bands,
    ...extra,
  };
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

function pictureFrames(nums: number[]): Frame[] {
  const sorted = solve(nums);
  return [
    { scene: "picture", caption: `Each number is a colour: 0 is red, 1 is white, 2 is blue. The colours are mixed up.`, state: { rows: [plain(nums)] } },
    {
      scene: "picture",
      caption: `Allowed: swapping two boxes inside this row. Not allowed: a second row, or the library sort.`,
      state: { rows: [plain(nums, (index) => (index === 0 || index === nums.length - 1 ? "window" : null))] },
    },
    {
      scene: "picture",
      caption: `The goal: all the reds first, then the whites, then the blues. Here that is ${list(sorted)}.`,
      state: { rows: [plain(sorted, () => "done")] },
    },
  ];
}

function slowFrames(nums: number[]): Frame[] {
  const { sorted, compares } = mergeSortCount(nums);
  return [
    {
      scene: "slow",
      caption: `The slow way: sort the row with a general sort. It compares pairs of boxes, again and again.`,
      state: { rows: [plain(nums, () => "window")], counter: { label: "comparisons", value: 0 } },
    },
    {
      scene: "slow",
      caption: `The sort compared pairs ${compares} times for only ${nums.length} boxes. It does not know there are just three colours.`,
      state: { rows: [plain(sorted, () => "done")], counter: { label: "comparisons", value: compares } },
    },
    {
      scene: "slow",
      caption: `That is O(n log n) time. Counting the colours is faster, but it needs two passes. We want one pass.`,
      state: { rows: [plain(sorted, () => "faded")], counter: { label: "comparisons", value: compares } },
    },
  ];
}

type Event = { kind: 0 | 1 | 2; low: number; mid: number; high: number; before: number[] };

function run(nums: number[]): Event[] {
  const row = [...nums];
  const events: Event[] = [];
  let low = 0;
  let mid = 0;
  let high = row.length - 1;
  while (mid <= high) {
    const kind = row[mid] as 0 | 1 | 2;
    events.push({ kind, low, mid, high, before: [...row] });
    if (kind === 0) {
      [row[low], row[mid]] = [row[mid], row[low]];
      low += 1;
      mid += 1;
    } else if (kind === 1) {
      mid += 1;
    } else {
      [row[mid], row[high]] = [row[high], row[mid]];
      high -= 1;
    }
  }
  return events;
}

function insightFrames(nums: number[]): Frame[] {
  const n = nums.length;
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: `Picture three zones: 0s grow from the front, 2s grow from the back. Everything between them is unknown.`,
      state: { rows: [zoned(nums, 0, 0, n - 1)] },
    },
  ];
  const swap = run(nums).find((event) => event.kind === 2 && event.high > event.mid);
  if (!swap) return frames;
  const { low, mid, high, before } = swap;
  const after = [...before];
  [after[mid], after[high]] = [after[high], after[mid]];
  frames.push({
    scene: "insight",
    caption: `A scanner reads the first unknown box. Here it reads a 2, so it swaps that box with the last unknown box, ${high}.`,
    state: { rows: [zoned(before, low, mid, high, [mid, high])] },
  });
  frames.push({
    scene: "insight",
    caption: `The 2 is now in the back zone. But the ${after[mid]} that came back has never been read, so the scanner stays and reads it next.`,
    state: { rows: [zoned(after, low, mid, high - 1, [mid])] },
  });
  return frames;
}

function swapQuiz(n: number, value: 0 | 2, target: number, mid: number): StoryQuiz {
  const zone = value === 0 ? "front" : "back";
  return {
    kind: "cell",
    cells: n,
    numbered: true,
    question: `The scanner reads a ${value} (${NAMES[value]}). Which box does it swap with? Click it.`,
    answer: target,
    feedback: { [mid]: `That is the scanner's own box. The ${value} must move to the edge of the ${zone} zone.` },
    otherwise: `It belongs to the ${zone} zone. Find the box just at the edge of that zone.`,
    why: value === 0 ? `Box ${target}, just after the 0s zone. The 0 joins the front zone there.` : `Box ${target}, the last unknown box. The 2 joins the back zone there.`,
  };
}

function scannerQuiz(n: number, mid: number, cameBack: number): StoryQuiz {
  return {
    kind: "cell",
    cells: n,
    numbered: true,
    question: `A ${cameBack} came back from the swap. Where should the scanner be next? Click that box.`,
    answer: mid,
    feedback: { [mid + 1]: `Moving on would skip the ${cameBack} that came back. Nobody has read it yet.` },
    otherwise: `The scanner never jumps. Think about which box has not been read yet.`,
    why: `It stays. The ${cameBack} that came back from the back zone has never been read.`,
  };
}

/** The real algorithm, one frame per change. `practice` reruns it on a fresh row: the reader makes every choice. */
function solutionFrames(start: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const nums = [...start];
  const n = nums.length;
  const line = (index: number) => (practice ? undefined : index);
  let low = 0;
  let mid = 0;
  let high = n - 1;
  let steps = 0;
  const asked = { zero: false, two: false, stay: false, trap: false };

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: ${list(nums)}. The scanner reads by itself. You choose every move.` : "The scanner starts at box 0. Every box is unknown, and both zones are empty.",
    codeLine: line(0),
    state: { rows: [zoned(nums, low, mid, high)] },
  });

  while (mid <= high) {
    steps += 1;
    const value = nums[mid];
    if (value === 1) {
      frames.push({ scene, caption: `The scanner reads a 1 (white). It belongs in the middle zone, right where it is.`, codeLine: line(6), state: { rows: [zoned(nums, low, mid, high, [mid])] } });
      mid += 1;
      frames.push({ scene, caption: `The 1s zone grows by one, and the scanner moves on.`, codeLine: line(7), state: { rows: [zoned(nums, low, mid, high)] } });
      continue;
    }
    if (value === 0) {
      const direct = low === mid;
      if (direct) {
        frames.push({ scene, caption: `The scanner reads a 0 (red). It is already at the edge of the 0s zone.`, codeLine: line(2), state: { rows: [zoned(nums, low, mid, high, [mid])] } });
      } else {
        const read: Frame = { scene, caption: `The scanner reads a 0 (red). It belongs in the front zone.`, codeLine: line(2), state: { rows: [zoned(nums, low, mid, high, [mid])] } };
        if (practice || !asked.zero) {
          asked.zero = true;
          read.quiz = swapQuiz(n, 0, low, mid);
        }
        frames.push(read);
        [nums[low], nums[mid]] = [nums[mid], nums[low]];
        frames.push({ scene, caption: `Swap it with box ${low}, the first box after the 0s zone.`, codeLine: line(3), state: { rows: [zoned(nums, low, mid, high, [low, mid])] } });
      }
      low += 1;
      mid += 1;
      frames.push({
        scene,
        caption: direct ? `The 0s zone grows by one, and the scanner moves on.` : `The 0s zone grows by one. The ${nums[mid - 1]} that came from low was already read, so the scanner moves on.`,
        codeLine: line(5),
        state: { rows: [zoned(nums, low, mid, high)] },
      });
      continue;
    }
    // A 2 goes to the back zone.
    const read: Frame = { scene, caption: `The scanner reads a 2 (blue). It belongs in the back zone.`, codeLine: line(8), state: { rows: [zoned(nums, low, mid, high, [mid])] } };
    if (mid !== high && (practice || !asked.two)) {
      asked.two = true;
      read.quiz = swapQuiz(n, 2, high, mid);
    }
    frames.push(read);
    if (mid === high) {
      high -= 1;
      frames.push({ scene, caption: `It is the last unknown box, so it joins the back zone where it stands.`, codeLine: line(10), state: { rows: [zoned(nums, low, mid, high)] } });
      continue;
    }
    [nums[mid], nums[high]] = [nums[high], nums[mid]];
    high -= 1;
    const cameBack = nums[mid];
    const swapped: Frame = {
      scene,
      caption: `Swap it with box ${high + 1}, the last unknown box. The back zone grows by one.`,
      codeLine: line(9),
      state: { rows: [zoned(nums, low, mid, high, [mid, high + 1])] },
    };
    if (practice || !asked.stay) {
      asked.stay = true;
      swapped.quiz = scannerQuiz(n, mid, cameBack);
      // The scanner's arrow would give the answer away, so it is lifted until the reveal.
      const row = swapped.state.rows[0];
      swapped.state = { rows: [{ ...row, markers: row.markers.filter((marker) => marker.label !== "mid") }] };
    }
    frames.push(swapped);
    frames.push({
      scene,
      caption: `The scanner stays on box ${mid}. The ${cameBack} that came back is unknown, so it gets read next.`,
      codeLine: line(10),
      state: { rows: [zoned(nums, low, mid, high, [mid])] },
    });
    if (!practice && !asked.trap && mid + 1 <= n - 1) {
      asked.trap = true;
      const base = zoned(nums, low, mid, high, [], { note: { index: mid + 1, text: `✕ skips the ${cameBack}` } });
      frames.push({
        scene,
        caption: `The Unseen Swap Trap: moving the scanner on now. The ${cameBack} at box ${mid} would never be read or sent to its zone.`,
        codeLine: 10,
        state: { rows: [{ ...base, tones: base.tones.map((tone, index) => (index === mid ? "miss" : tone)) }] },
      });
    }
  }

  const answer = list(nums);
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${answer}. You chose every move yourself.` : `The scanner passed the back zone, so nothing unknown is left. The answer is ${answer}.`,
    codeLine: line(13),
    state: { rows: [zoned(nums, low, mid, high)] },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${steps} steps moved the scanner on or grew the back zone, so the unknown zone shrank by one each time.`,
      codeLine: 1,
      state: { rows: [zoned(nums, low, mid, high)], counter: { label: "steps", value: steps } },
    });
    frames.push({
      scene,
      caption: `Space: O(1). Just the three zone edges, low, mid and high, and one spare box for a swap.`,
      codeLine: 0,
      state: { rows: [zoned(nums, low, mid, high)] },
    });
  }
  return frames;
}

export const sortColorsStory: ProblemStory<Rec01RowsState> = {
  slugs: ["lc-75"],
  pattern: "Three pointers (Dutch flag)",
  trigger: "only three different values, sort them in place in one pass",
  insight: "Keep three zones: 0s at the front, 2s at the back, the unknown in the middle. The scanner sends each unknown number to its zone.",
  metaphor: { name: "The three zones", legend: "0s zone ends at low · scanner = mid · 2s zone starts after high", terms: ["zone", "scanner"] },
  traps: [{ name: "The Unseen Swap Trap", rule: "After a swap with high, the scanner stays: the number that came back has not been looked at yet." }],
  template: [
    "low = mid = 0; high = n - 1;",
    "while (mid <= high) {",
    "    0 → swap with low, both move on;",
    "    1 → mid moves on;",
    "    2 → swap with high, high moves back, mid stays;",
    "}",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "every step shrinks the unknown zone by one box",
    space: "O(1)",
    spaceWhy: "three pointers and one spare box for a swap",
  },
  code: CODE,
  examples: [
    { label: "[2,0,2,1,1,0]", input: "[2,0,2,1,1,0]", expected: "[0,0,1,1,2,2]" },
    { label: "[2,0,1]", input: "[2,0,1]", expected: "[0,1,2]" },
    { label: "[2,2,0,1,0,2,1]", input: "[2,2,0,1,0,2,1]", expected: "[0,0,1,1,2,2,2]", note: "Tricky: a 2 swaps with another 2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-283", title: "Move Zeroes" },
    { slug: "lc-26", title: "Remove Duplicates from Sorted Array" },
    { slug: "lc-15", title: "3Sum" },
  ],
  answer: (input) => list(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    const sorted = solve(nums);
    const zeros = sorted.filter((value) => value === 0).length;
    const ones = sorted.filter((value) => value === 1).length;
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { rows: [zoned(sorted, zeros, zeros + ones, zeros + ones - 1)] },
      },
    ];
  },
  View: Rec01RowsView,
};
