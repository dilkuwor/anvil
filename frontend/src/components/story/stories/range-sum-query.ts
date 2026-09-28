import type { CellTone } from "@/components/learn/viz/primitives";

import { Rec01RowsView, type Rec01Row, type Rec01RowsState, type RowMarker } from "../rec01-rows-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Rec01RowsState>;

/** Fresh list for the "your turn" run: two questions, and each could read the wrong marker. */
const PRACTICE = "[4,-1,2,5], (1,2) (0,3)";

const CODE = [
  "private final int[] prefix;",
  "public NumArray(int[] nums) {",
  "    prefix = new int[nums.length + 1];",
  "    for (int i = 0; i < nums.length; i++) {",
  "        prefix[i + 1] = prefix[i] + nums[i];",
  "    }",
  "}",
  "public int sumRange(int left, int right) {",
  "    return prefix[right + 1] - prefix[left];",
  "}",
];

type Query = [number, number];
type Input = { nums: number[]; queries: Query[] };

function parse(raw: string): Input {
  const list = raw.match(/\[(.*?)\]/);
  const nums = list ? [...list[1].matchAll(/-?\d+/g)].map(Number) : [];
  const queries = [...raw.matchAll(/\((\d+)\s*,\s*(\d+)\)/g)].map((match) => [Number(match[1]), Number(match[2])] as Query);
  return { nums, queries };
}

/** Independent check: add each range the slow way. */
function solve({ nums, queries }: Input): number[] {
  return queries.map(([left, right]) => nums.slice(left, right + 1).reduce((total, value) => total + value, 0));
}

function list(values: number[]): string {
  return `[${values.join(",")}]`;
}

/** A negative number inside a sum gets brackets: 1 − (−2). */
function term(value: number): string {
  return value < 0 ? `(${value})` : String(value);
}

/** "boxes 2 to 5", or "box 1" for a stretch of one. */
function span(left: number, right: number): string {
  return left === right ? `box ${left}` : `boxes ${left} to ${right}`;
}

function prefixOf(nums: number[]): number[] {
  const prefix = [0];
  for (const value of nums) prefix.push(prefix[prefix.length - 1] + value);
  return prefix;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function numsRow(nums: number[], paint: (index: number) => CellTone | null = () => null, extra: Partial<Rec01Row> = {}): Rec01Row {
  return { name: "nums", values: [...nums], tones: tones(nums.length, paint), markers: [], shift: 0.5, ...extra };
}

/** Marker i sits just before box i, so the boxes between two markers are exactly the stretch they cover. */
function markerRow(values: (number | null)[], paint: (index: number) => CellTone | null = () => null, extra: Partial<Rec01Row> = {}): Rec01Row {
  return { name: "markers", values: values.map((value) => (value === null ? "" : value)), tones: tones(values.length, paint), markers: [], ...extra };
}

function stretch(from: number, to: number, label: string, tone: "accent" | "teal" = "accent") {
  return { from, to, label, tone };
}

function pictureFrames(input: Input): Frame[] {
  const { nums, queries } = input;
  const blank = markerRow(Array.from({ length: nums.length + 1 }, () => null), () => "faded");
  const answers = solve(input);
  const [left, right] = queries[queries.length > 1 ? 1 : 0];
  const sample = answers[queries.length > 1 ? 1 : 0];
  return [
    { scene: "picture", caption: `A list of ${nums.length} numbers. It never changes. Many questions will be asked about it.`, state: { rows: [numsRow(nums), blank] } },
    {
      scene: "picture",
      caption: `A question gives two positions, like (${left}, ${right}). It asks for the sum of boxes ${left} to ${right}, both ends included. Here that is ${sample}.`,
      state: { rows: [numsRow(nums, (index) => (index >= left && index <= right ? "window" : null), { band: stretch(left, right, `sum ${sample}`) }), blank] },
    },
    {
      scene: "picture",
      caption: `Allowed: slow work once, when the list arrives. Not allowed: slow work for every question. There can be 10,000 of them.`,
      state: { rows: [numsRow(nums, () => "window"), blank] },
    },
    {
      scene: "picture",
      caption: `The goal: answer every question. Here the questions are ${queries.map(([a, b]) => `(${a}, ${b})`).join(", ")}, and the answers are ${list(answers)}.`,
      state: { rows: [numsRow(nums, () => "done"), blank] },
    },
  ];
}

function slowFrames(input: Input): Frame[] {
  const { nums, queries } = input;
  const blank = markerRow(Array.from({ length: nums.length + 1 }, () => null), () => "faded");
  const frames: Frame[] = [];
  let added = 0;
  queries.forEach(([left, right], index) => {
    let sum = 0;
    for (let i = left; i <= right; i++) {
      sum += nums[i];
      added += 1;
    }
    if (index > 2) return;
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: for (${left}, ${right}), add ${span(left, right)} one by one. The sum is ${sum}.`
          : `For (${left}, ${right}), start again and add ${span(left, right)} one by one. The sum is ${sum}.`,
      state: { rows: [numsRow(nums, (box) => (box >= left && box <= right ? "window" : null), { band: stretch(left, right, `sum ${sum}`) }), blank], counter: { label: "numbers added", value: added } },
    });
  });
  frames.push({
    scene: "slow",
    caption: `That is ${added} additions for ${queries.length} questions. This is O(n) per query: a question over the whole list reads every box again.`,
    state: { rows: [numsRow(nums, () => "faded"), blank], counter: { label: "numbers added", value: added } },
  });
  return frames;
}

function insightFrames(input: Input): Frame[] {
  const { nums, queries } = input;
  const prefix = prefixOf(nums);
  const [left, right] = queries.find(([a]) => a > 0) ?? queries[0];
  const value = prefix[right + 1] - prefix[left];
  const pair: RowMarker[] = [
    { index: left, label: "start", tone: "accent" },
    { index: right + 1, label: "end", tone: "teal" },
  ];
  return [
    {
      scene: "insight",
      caption: `Picture mile markers along a road. Marker i stands just before box i and shows the total of every box behind it.`,
      state: { rows: [numsRow(nums), markerRow(prefix, () => "hit")] },
    },
    {
      scene: "insight",
      caption: `For (${left}, ${right}): marker ${right + 1} shows the total up to box ${right}. Marker ${left} shows the total before box ${left}.`,
      state: { rows: [numsRow(nums), markerRow(prefix, (index) => (index === left || index === right + 1 ? "edge" : "faded"), { markers: pair })] },
    },
    {
      scene: "insight",
      caption: `So the stretch of road between them is one subtraction: ${prefix[right + 1]} − ${term(prefix[left])} = ${value}. No box is added again.`,
      state: {
        rows: [
          numsRow(nums, (index) => (index >= left && index <= right ? "done" : null), { band: stretch(left, right, `= ${value}`, "teal") }),
          markerRow(prefix, (index) => (index === left || index === right + 1 ? "edge" : "faded"), { markers: pair }),
        ],
      },
    },
  ];
}

function endQuiz(cells: number, left: number, right: number): StoryQuiz {
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `Question (${left}, ${right}). Which marker shows the total up to and including box ${right}? Click it.`,
    answer: right + 1,
    feedback: { [right]: `Marker ${right} stands before box ${right}, so box ${right} would be left out.` },
    otherwise: `Find the marker just after the last box of the stretch.`,
    why: `The marker just after box ${right}. It has passed every box up to and including box ${right}.`,
  };
}

function startQuiz(cells: number, left: number, right: number): StoryQuiz {
  const feedback: Record<number, string> = { [right + 1]: `That is the end marker. Taking it away from itself gives 0.` };
  if (left + 1 !== right + 1) feedback[left + 1] = `Marker ${left + 1} has already passed box ${left}, so box ${left} would be taken away too.`;
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: `Now take away everything before box ${left}. Which marker do we subtract? Click it.`,
    answer: left,
    feedback,
    otherwise: `Find the marker that stands just before the first box of the stretch.`,
    why: `The marker just before box ${left}. It holds only the boxes that are not in the stretch.`,
  };
}

/** The real algorithm, one frame per change. `practice` reruns it on a fresh list: the reader picks every marker. */
function solutionFrames(input: Input, scene: SceneId = "solution", practice = false): Frame[] {
  const { nums, queries } = input;
  const frames: Frame[] = [];
  const n = nums.length;
  const prefix: (number | null)[] = Array.from({ length: n + 1 }, () => null);
  const line = (index: number) => (practice ? undefined : index);
  const answers: number[] = [];

  prefix[0] = 0;
  if (practice) {
    for (let i = 0; i < n; i++) prefix[i + 1] = (prefix[i] ?? 0) + nums[i];
    frames.push({
      scene,
      caption: `Your turn, on a new list. The mile markers are already placed. You pick the markers for each question.`,
      state: { rows: [numsRow(nums), markerRow(prefix, () => "hit")] },
    });
  } else {
    frames.push({
      scene,
      caption: `Marker 0 stands before the first box. No box is behind it, so it shows 0.`,
      codeLine: 2,
      state: { rows: [numsRow(nums), markerRow(prefix, (index) => (index === 0 ? "edge" : null))] },
    });
    for (let i = 0; i < n; i++) {
      prefix[i + 1] = (prefix[i] ?? 0) + nums[i];
      frames.push({
        scene,
        caption: `The road passes box ${i} (${nums[i]}). Marker ${i + 1} = marker ${i} + ${term(nums[i])} = ${prefix[i + 1]}.`,
        codeLine: 4,
        state: {
          rows: [
            numsRow(nums, (index) => (index === i ? "edge" : index < i ? "hit" : null)),
            markerRow(prefix, (index) => (index === i + 1 ? "edge" : index <= i ? "hit" : null)),
          ],
        },
      });
    }
    frames.push({
      scene,
      caption: `Every marker is placed. This work happens once, when the list arrives. Now the questions come.`,
      codeLine: 1,
      state: { rows: [numsRow(nums), markerRow(prefix, () => "hit")] },
    });
  }

  const full = prefix.map((value) => value ?? 0);
  queries.forEach(([left, right], index) => {
    const ask = practice || index === 0;
    const value = full[right + 1] - full[left];
    const endPair: RowMarker[] = [{ index: right + 1, label: "end", tone: "teal" }];
    const bothPair: RowMarker[] = [{ index: left, label: "start", tone: "accent" }, ...endPair];
    const lookRow = numsRow(nums, (box) => (box >= left && box <= right ? "window" : null), { band: stretch(left, right, `(${left}, ${right})`) });
    if (ask) {
      frames.push({
        scene,
        caption: `Question (${left}, ${right}): the stretch of road over ${span(left, right)}.`,
        codeLine: line(7),
        state: { rows: [lookRow, markerRow(full)], pickRow: 1 },
        quiz: endQuiz(n + 1, left, right),
      });
      frames.push({
        scene,
        caption: `Marker ${right + 1} shows ${full[right + 1]}: the total of every box up to and including box ${right}.`,
        codeLine: line(8),
        state: { rows: [lookRow, markerRow(full, (box) => (box === right + 1 ? "edge" : null), { markers: endPair })] },
      });
      if (!practice) {
        frames.push({
          scene,
          caption: `The Off-by-One Marker Trap: reading marker ${right} instead. It stands before box ${right}, so the ${nums[right]} in box ${right} would be missed.`,
          codeLine: 8,
          state: {
            rows: [
              numsRow(nums, (box) => (box === right ? "miss" : box >= left && box < right ? "window" : null)),
              markerRow(full, (box) => (box === right ? "miss" : null), { note: { index: right, text: `✕ misses box ${right}` } }),
            ],
          },
        });
      }
      frames.push({
        scene,
        caption:
          left === 0
            ? `Now take away what stands before box 0. Here that is nothing, but the rule stays the same.`
            : `Marker ${right + 1} also counts the boxes before box ${left}. Those must come off.`,
        codeLine: line(8),
        state: { rows: [numsRow(nums, (box) => (box < left ? "miss" : box <= right ? "window" : null)), markerRow(full, (box) => (box === right + 1 ? "edge" : null), { markers: endPair })], pickRow: 1 },
        quiz: startQuiz(n + 1, left, right),
      });
    } else {
      frames.push({
        scene,
        caption: `Question (${left}, ${right}): read the end marker, ${right + 1}, and the start marker, ${left}.`,
        codeLine: line(8),
        state: { rows: [lookRow, markerRow(full, (box) => (box === left || box === right + 1 ? "edge" : null), { markers: bothPair })] },
      });
    }
    answers.push(value);
    frames.push({
      scene,
      caption: `Marker ${right + 1} minus marker ${left}: ${full[right + 1]} − ${term(full[left])} = ${value}. That is the sum of ${span(left, right)}.`,
      codeLine: line(8),
      state: {
        rows: [
          numsRow(nums, (box) => (box >= left && box <= right ? "done" : null), { band: stretch(left, right, `= ${value}`, "teal") }),
          markerRow(full, (box) => (box === left || box === right + 1 ? "edge" : null), { markers: bothPair }),
        ],
      },
    });
  });

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${list(answers)}. You picked every marker yourself.` : `Every question took one subtraction of two markers. The answer is ${list(answers)}.`,
    codeLine: line(7),
    state: { rows: [numsRow(nums), markerRow(full, () => "hit")] },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(1) per query. Each question read just two markers, however long its stretch of road. Placing the markers cost O(n), once.`,
      codeLine: 8,
      state: { rows: [numsRow(nums), markerRow(full, () => "hit")], counter: { label: "markers read", value: 2 * queries.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). There is one marker per box, plus marker 0 at the start: ${n + 1} markers here.`,
      codeLine: 2,
      state: { rows: [numsRow(nums), markerRow(full, () => "done")] },
    });
  }
  return frames;
}

export const rangeSumQueryStory: ProblemStory<Rec01RowsState> = {
  slugs: ["lc-303"],
  pattern: "Prefix sums",
  trigger: "many “sum from left to right” questions on a list that never changes",
  insight: "Put a mile marker before every box that holds the total so far. Any stretch of road is one marker minus another.",
  metaphor: { name: "The mile markers", legend: "marker i = prefix[i], the total before box i · stretch = left to right", terms: ["marker", "road", "stretch"] },
  traps: [{ name: "The Off-by-One Marker Trap", rule: "Marker i is the total before box i. The range from left to right is marker right + 1 minus marker left." }],
  template: [
    "prefix[0] = 0;",
    "for each i: prefix[i + 1] = prefix[i] + nums[i];",
    "sum(left, right) = prefix[right + 1] - prefix[left];",
  ],
  complexity: {
    slow: "O(n) per query",
    time: "O(1) per query",
    timeWhy: "each question reads two markers; placing them costs O(n) once",
    space: "O(n)",
    spaceWhy: "one marker per box, plus marker 0",
  },
  code: CODE,
  examples: [
    { label: "[-2,0,3,-5,2,-1]", input: "[-2,0,3,-5,2,-1], (0,2) (2,5) (0,5)", expected: "[1,-1,-3]" },
    { label: "[1,2,3,4]", input: "[1,2,3,4], (1,1) (0,3) (1,2)", expected: "[2,10,5]", note: "Tricky: a stretch of just one box" },
    { label: "[3,-3,3,-3]", input: "[3,-3,3,-3], (0,1) (1,3)", expected: "[0,-3]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-560", title: "Subarray Sum Equals K" },
    { slug: "lc-238", title: "Product of Array Except Self" },
    { slug: "lc-643", title: "Maximum Average Subarray I" },
  ],
  answer: (input) => list(solve(parse(input))),
  frames: (input) => {
    const parsed = parse(input);
    const prefix = prefixOf(parsed.nums);
    return [
      ...pictureFrames(parsed),
      ...slowFrames(parsed),
      ...insightFrames(parsed),
      ...solutionFrames(parsed),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { rows: [numsRow(parsed.nums), markerRow(prefix, () => "done")] },
      },
    ];
  },
  View: Rec01RowsView,
};
