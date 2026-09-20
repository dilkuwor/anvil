import type { CellTone } from "@/components/learn/viz/primitives";

import { ArrayThreePointerView, type ArrayThreePointerState } from "../array-three-pointer-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ArrayThreePointerState>;
type Trio = [number, number, number];

/** Fresh numbers for the "your turn" run: a sum that is too small, sums that are too big, and repeated values waiting for the peg. */
const PRACTICE = "-3,1,2,-3,2,1";

const CODE = [
  "Arrays.sort(nums);",
  "List<List<Integer>> result = new ArrayList<>();",
  "for (int n = nums.length, i = 0; i < n - 2; i++) {",
  "    if (i > 0 && nums[i] == nums[i - 1]) continue;",
  "    int left = i + 1, right = n - 1;",
  "    while (left < right) {",
  "        int sum = nums[i] + nums[left] + nums[right];",
  "        if (sum < 0) {",
  "            left++;",
  "        } else if (sum > 0) {",
  "            right--;",
  "        } else {",
  "            result.add(List.of(nums[i], nums[left], nums[right]));",
  "            left++;",
  "            right--;",
  "            while (left < right && nums[left] == nums[left - 1]) left++;",
  "            while (left < right && nums[right] == nums[right + 1]) right--;",
  "        }",
  "    }",
  "}",
  "return result;",
];

function parse(input: string): number[] {
  return input
    .replace(/[\[\]\s]/g, "")
    .split(",")
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const show = (values: number[]) => `[${values.join(", ")}]`;
const trioWords = (values: number[]) => `${values[0]}, ${values[1]} and ${values[2]}`;

type Slow = { checked: number; hits: Trio[]; repeats: Trio[]; unique: number[][]; firstThree: Trio[] };

/**
 * The slow way, really run: every group of three positions, in the order given.
 * It is also the independent solver behind `answer`.
 */
function slowSolve(nums: number[]): Slow {
  const slow: Slow = { checked: 0, hits: [], repeats: [], unique: [], firstThree: [] };
  const seen = new Set<string>();
  for (let a = 0; a < nums.length; a++) {
    for (let b = a + 1; b < nums.length; b++) {
      for (let c = b + 1; c < nums.length; c++) {
        slow.checked++;
        if (slow.firstThree.length < 3) slow.firstThree.push([a, b, c]);
        if (nums[a] + nums[b] + nums[c] !== 0) continue;
        slow.hits.push([a, b, c]);
        const values = [nums[a], nums[b], nums[c]].sort((x, y) => x - y);
        const key = values.join(",");
        if (seen.has(key)) slow.repeats.push([a, b, c]);
        else {
          seen.add(key);
          slow.unique.push(values);
        }
      }
    }
  }
  slow.unique.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
  return slow;
}

/** The real run on the sorted numbers, recorded as events so every scene is built from the same trace. */
type Event =
  | { type: "peg"; peg: number; left: number; right: number; first: boolean }
  | { type: "pegSkip"; from: number; skipped: number; wouldFind: number[] | null; next: number | null }
  | { type: "sum"; peg: number; left: number; right: number; sum: number }
  | { type: "move"; peg: number; left: number; right: number; side: "left" | "right"; sum: number }
  | { type: "found"; peg: number; left: number; right: number; triplet: number[] }
  | { type: "bothStep"; peg: number; left: number; right: number }
  | { type: "innerSkip"; peg: number; side: "left" | "right"; from: number; to: number; left: number; right: number };

function firstFind(nums: number[], peg: number): number[] | null {
  let left = peg + 1;
  let right = nums.length - 1;
  while (left < right) {
    const sum = nums[peg] + nums[left] + nums[right];
    if (sum === 0) return [nums[peg], nums[left], nums[right]];
    if (sum < 0) left++;
    else right--;
  }
  return null;
}

function trace(nums: number[]): { events: Event[]; triplets: number[][]; sums: number } {
  const events: Event[] = [];
  const triplets: number[][] = [];
  const count = nums.length;
  let sums = 0;
  let lastPeg = -1;
  for (let i = 0; i < count - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) {
      let next: number | null = i;
      while (next < count && nums[next] === nums[i]) next++;
      if (next >= count - 2) next = null;
      events.push({ type: "pegSkip", from: lastPeg, skipped: i, wouldFind: firstFind(nums, i), next });
      continue;
    }
    let left = i + 1;
    let right = count - 1;
    events.push({ type: "peg", peg: i, left, right, first: lastPeg === -1 });
    lastPeg = i;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      sums++;
      events.push({ type: "sum", peg: i, left, right, sum });
      if (sum < 0) {
        left++;
        events.push({ type: "move", peg: i, left, right, side: "left", sum });
      } else if (sum > 0) {
        right--;
        events.push({ type: "move", peg: i, left, right, side: "right", sum });
      } else {
        const triplet = [nums[i], nums[left], nums[right]];
        triplets.push(triplet);
        events.push({ type: "found", peg: i, left, right, triplet });
        left++;
        right--;
        events.push({ type: "bothStep", peg: i, left, right });
        const leftFrom = left;
        while (left < right && nums[left] === nums[left - 1]) left++;
        if (left !== leftFrom) events.push({ type: "innerSkip", peg: i, side: "left", from: leftFrom, to: left, left, right });
        const rightFrom = right;
        while (left < right && nums[right] === nums[right + 1]) right--;
        if (right !== rightFrom) events.push({ type: "innerSkip", peg: i, side: "right", from: rightFrom, to: right, left, right });
      }
    }
  }
  return { events, triplets, sums };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[], triplets: number[][] | null = null): ArrayThreePointerState {
  return { nums, tones: tones(nums.length, () => null), peg: null, left: null, right: null, sumOf: null, skipped: null, triplets };
}

/** Cells left of the peg no longer matter. The peg is where we are. The calipers hold the two ends. */
function round(nums: number[], triplets: number[][], peg: number, left: number | null, right: number | null, found = false): ArrayThreePointerState {
  const open = left !== null && right !== null && left <= right;
  return {
    ...blank(nums, triplets.map((triplet) => [...triplet])),
    peg,
    left: open ? left : null,
    right: open ? right : null,
    tones: tones(nums.length, (index) => {
      if (index < peg) return "faded";
      if (found && (index === peg || index === left || index === right)) return "done";
      if (index === peg) return "edge";
      if (open && (index === left || index === right)) return "window";
      return null;
    }),
  };
}

function pictureFrames(nums: number[], slow: Slow): Frame[] {
  const frames: Frame[] = [{ scene: "picture", caption: `Here are ${plural(nums.length, "number")}. Each box holds one of them.`, state: blank(nums) }];
  const values = (trio: Trio) => trio.map((index) => nums[index]);
  const paint = (trio: Trio, tone: CellTone) => tones(nums.length, (index) => (trio.includes(index) ? tone : null));
  const hit = slow.hits[0];
  if (hit) {
    frames.push({ scene: "picture", caption: `Pick any three boxes. ${trioWords(values(hit).sort((x, y) => x - y))} make 0 together, so this triplet counts.`, state: { ...blank(nums), tones: paint(hit, "done"), sumOf: hit } });
  } else if (slow.firstThree[0]) {
    const miss = slow.firstThree[0];
    const sum = values(miss).reduce((total, value) => total + value, 0);
    frames.push({ scene: "picture", caption: `Pick any three boxes. ${trioWords(values(miss))} make ${sum}, not 0, so this triplet does not count.`, state: { ...blank(nums), tones: paint(miss, "miss"), sumOf: miss } });
  }
  const repeat = slow.repeats[0];
  if (repeat) {
    frames.push({
      scene: "picture",
      caption: `These boxes hold ${trioWords(values(repeat).sort((x, y) => x - y))} too, picked a different way. The same three values may be listed only once.`,
      state: { ...blank(nums), tones: paint(repeat, "miss"), sumOf: repeat },
    });
  }
  frames.push({
    scene: "picture",
    caption: slow.unique.length > 0 ? `The goal: list every different triplet that makes 0. Here there ${slow.unique.length === 1 ? "is 1" : `are ${slow.unique.length}`}.` : "The goal: list every different triplet that makes 0. Here there are none, so the list stays empty.",
    state: blank(nums, slow.unique),
  });
  return frames;
}

function slowFrames(nums: number[], slow: Slow): Frame[] {
  const frames: Frame[] = slow.firstThree.map((trio, position) => {
    const values = trio.map((index) => nums[index]);
    const sum = values.reduce((total, value) => total + value, 0);
    const previous = slow.firstThree[position - 1];
    const lead = position === 0 ? "The slow way: try every group of three boxes." : previous[1] === trio[1] ? "Keep two boxes and change the third." : "Now change the second box too.";
    return {
      scene: "slow",
      caption: `${lead} ${trioWords(values)} make ${sum}${sum === 0 ? ": a triplet" : ", not 0"}.`,
      state: { ...blank(nums), tones: tones(nums.length, (index) => (trio.includes(index) ? (sum === 0 ? "done" : "window") : null)), sumOf: trio, counter: { label: "sums checked", value: position + 1 } },
    };
  });
  const hits = slow.hits.length;
  const verdict = hits === 0 ? "None of them made 0." : hits === slow.unique.length ? `${hits} of them made 0.` : `${hits} of them made 0, but only ${slow.unique.length} ${slow.unique.length === 1 ? "is a different triplet" : "are different triplets"}.`;
  frames.push({
    scene: "slow",
    caption: `That is ${plural(slow.checked, "sum")} for only ${plural(nums.length, "number")}. ${verdict} This is O(n³) time: far too slow for 3,000 numbers.`,
    state: { ...blank(nums, slow.unique), tones: tones(nums.length, () => "faded"), counter: { label: "sums checked", value: slow.checked } },
  });
  return frames;
}

function insightFrames(nums: number[], sorted: number[], events: Event[]): Frame[] {
  const frames: Frame[] = [
    { scene: "insight", caption: "One idea first: put the numbers in order, from small to big.", state: blank(nums) },
    { scene: "insight", caption: "Now a step to the right always finds a bigger number, or the same one. Equal numbers sit side by side.", state: blank(sorted) },
  ];
  const moment = events.find((event) => event.type === "sum" && event.sum !== 0) ?? events.find((event) => event.type === "sum");
  if (!moment || moment.type !== "sum") return frames;
  const { peg, left, right, sum } = moment;
  const at = round(sorted, [], peg, left, right);
  frames.push({ scene: "insight", caption: `Picture a peg pushed into one number, ${sorted[peg]}. It stays put. Two calipers hold the two ends of everything to its right.`, state: at });
  const names = `Peg ${sorted[peg]} with calipers ${sorted[left]} and ${sorted[right]} makes ${sum}`;
  frames.push({
    scene: "insight",
    caption:
      sum < 0
        ? `${names}: too small. Only the left caliper can make it bigger, by stepping right. Too big, and the right caliper steps left.`
        : sum > 0
          ? `${names}: too big. Only the right caliper can make it smaller, by stepping left. Too small, and the left caliper steps right.`
          : `${names}: a triplet. When a sum is too small the left caliper steps right. Too big, and the right caliper steps left.`,
    state: { ...at, sumOf: [peg, left, right] },
  });
  frames.push({ scene: "insight", caption: "So one peg needs only one sweep of the calipers, not every pair. Then the peg moves right and the calipers open again.", state: at });
  return frames;
}

function moveQuiz(sorted: number[], peg: number, left: number, right: number, sum: number): StoryQuiz {
  const small = sum < 0;
  return {
    kind: "cell",
    cells: sorted.length,
    question: `${sum} is ${small ? "below" : "above"} 0. Which caliper steps inward to fix that? Click its box.`,
    answer: small ? left : right,
    feedback: {
      [peg]: "The peg stays put for this whole sweep. Only a caliper moves.",
      [small ? right : left]: small ? "The right caliper can only step left, and nothing there is bigger. The sum would not grow." : "The left caliper can only step right, and nothing there is smaller. The sum would not shrink.",
    },
    otherwise: "Only the two calipers can move. Pick one of them.",
    why: small ? "The numbers are sorted, so bigger numbers lie to the right. The left caliper steps that way to make the sum grow." : "The numbers are sorted, so smaller numbers lie to the left. The right caliper steps that way to make the sum shrink.",
  };
}

function pegQuiz(sorted: number[], skipped: number, next: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let index = skipped; index < next; index++) feedback[index] = `That box holds ${sorted[skipped]} again. A peg there would only find the same triplets a second time.`;
  return {
    kind: "cell",
    cells: sorted.length,
    question: "Where does the peg go next? Click that box.",
    answer: next,
    feedback,
    otherwise: "The peg only moves right, to the nearest number it has not stood on yet.",
    why: `The peg never starts on a repeated value. It skips every other ${sorted[skipped]} and lands on the next new number.`,
  };
}

function caliperQuiz(sorted: number[], side: "left" | "right", from: number, to: number): StoryQuiz {
  return {
    kind: "cell",
    cells: sorted.length,
    question: `The ${side} caliper landed on another ${sorted[from]}. Where should it go? Click that box.`,
    answer: to,
    feedback: { [from]: `Staying on this ${sorted[from]} can only repeat what the last ${sorted[from]} found. That is the Duplicate Triplet Trap.` },
    otherwise: "The caliper only steps inward, to the nearest number that is new for it.",
    why: `With the same peg, a second ${sorted[from]} cannot find anything new, so the caliper steps past it.`,
  };
}

/**
 * Tells the recorded run. In the solution scene every change gets its own frame and its Java line.
 * In the practice run the reader makes every decision, so the moves are folded into the next caption.
 */
function runFrames(sorted: number[], events: Event[], practice: boolean): Frame[] {
  const frames: Frame[] = [];
  const scene = practice ? "card" : "solution";
  const line = (index: number) => (practice ? undefined : index);
  const triplets: number[][] = [];
  const asked = { small: false, big: false, peg: false, caliper: false };
  let trapNamed = false;
  let lead = "";
  let lastKind: "small" | "big" | null = null;

  events.forEach((event, position) => {
    const next = events[position + 1];
    if (event.type === "peg") {
      lastKind = null;
      const between = event.right - event.left + 1;
      frames.push({
        scene,
        caption: `${lead}${event.first ? "The peg goes on" : "The peg moves right, onto"} ${sorted[event.peg]}. The calipers open wide, over the ${plural(between, "number")} to its right.`,
        codeLine: line(4),
        state: round(sorted, triplets, event.peg, event.left, event.right),
      });
      lead = "";
    } else if (event.type === "sum") {
      const kind = event.sum < 0 ? "small" : event.sum > 0 ? "big" : null;
      const state = { ...round(sorted, triplets, event.peg, event.left, event.right), sumOf: [event.peg, event.left, event.right] as Trio };
      const names = `Peg ${sorted[event.peg]} with calipers ${sorted[event.left]} and ${sorted[event.right]} makes ${event.sum}`;
      if (kind === null) {
        if (!practice) frames.push({ scene, caption: `${names}.`, codeLine: 6, state });
        lead = practice ? `${lead}${names}: ` : "";
        return;
      }
      const wantsQuiz = practice || !asked[kind];
      asked[kind] = true;
      const frame: Frame = { scene, caption: `${lead}${names}.`, codeLine: line(6), state };
      if (wantsQuiz) frame.quiz = moveQuiz(sorted, event.peg, event.left, event.right, event.sum);
      // A run of the same move is told in one frame per step instead of two.
      if (!practice && !wantsQuiz && lastKind === kind && next?.type === "move") {
        const met = next.left >= next.right;
        frame.caption = `${names}: too ${kind} again. The ${next.side} caliper steps ${next.side === "left" ? "right" : "left"}${met ? " and meets the other one, so this peg is done" : ""}.`;
        frame.codeLine = next.side === "left" ? 8 : 10;
      }
      lastKind = kind;
      lead = "";
      frames.push(frame);
    } else if (event.type === "move") {
      const met = event.left >= event.right;
      const dir = event.side === "left" ? "right, looking for a bigger number" : "left, looking for a smaller number";
      if (practice) {
        lead = `The ${event.side} caliper stepped ${event.side === "left" ? "right" : "left"}${met ? " and met the other one" : ""}. `;
        return;
      }
      if (frames.at(-1)?.codeLine !== 6) return; // already told together with its sum
      frames.push({
        scene,
        caption: `${event.sum} is too ${event.sum < 0 ? "small" : "big"}, so the ${event.side} caliper steps ${dir}.${met ? " The calipers meet, so this peg is done." : ""}`,
        codeLine: event.side === "left" ? 8 : 10,
        state: round(sorted, triplets, event.peg, event.left, event.right),
      });
    } else if (event.type === "found") {
      triplets.push(event.triplet);
      frames.push({
        scene,
        caption: practice ? `${lead}a triplet. ${show(event.triplet)} goes on the list.` : `Exactly 0, so ${show(event.triplet)} is a triplet. It goes on the list.`,
        codeLine: line(12),
        state: { ...round(sorted, triplets, event.peg, event.left, event.right, true), sumOf: [event.peg, event.left, event.right] },
      });
      lead = "";
    } else if (event.type === "bothStep") {
      const over = event.left >= event.right;
      const skip = next?.type === "innerSkip" ? next : null;
      const tail = over ? " They meet, so this peg is done." : skip ? ` The ${skip.side} caliper lands on ${sorted[skip.from]} again.` : "";
      const frame: Frame = {
        scene,
        caption: `Both calipers step inward: with this peg, neither number can be part of a new triplet.${tail}`,
        codeLine: line(13),
        state: round(sorted, triplets, event.peg, event.left, event.right),
      };
      // Only ask when the caliper ends on a box of its own, so there is exactly one box to click.
      if (skip && skip.left < skip.right && (practice || !asked.caliper)) {
        asked.caliper = true;
        frame.quiz = caliperQuiz(sorted, skip.side, skip.from, skip.to);
      }
      frames.push(frame);
    } else if (event.type === "innerSkip") {
      const met = event.left >= event.right;
      frames.push({
        scene,
        caption: `With the same peg, a second ${sorted[event.from]} cannot find anything new. The ${event.side} caliper steps past it${met ? " and meets the other one, so this peg is done" : ""}.`,
        codeLine: line(event.side === "left" ? 15 : 16),
        state: { ...round(sorted, triplets, event.peg, event.left, event.right), skipped: event.from, skipNote: "✕ same value again" },
      });
    } else {
      const value = sorted[event.skipped];
      const before: Frame = {
        scene,
        caption: `${lead}The peg is done with this ${value}. The next number to the right is ${value} again.`,
        codeLine: line(2),
        state: round(sorted, triplets, event.from, null, null),
      };
      lead = "";
      if (event.next !== null && (practice || !asked.peg)) {
        asked.peg = true;
        before.quiz = pegQuiz(sorted, event.skipped, event.next);
      }
      if (event.from !== event.skipped - 1) before.caption = `Another ${value}. A peg has already stood on a ${value}.`;
      frames.push(before);
      const again = event.wouldFind ? `would find ${show(event.wouldFind)} all over again` : `would only repeat the search the last ${value} already did`;
      frames.push({
        scene,
        caption: trapNamed ? `A peg on this ${value} ${again}. The peg skips it too.` : `The Duplicate Triplet Trap: a peg on this second ${value} ${again}. So the peg never starts on a repeated value.`,
        codeLine: line(3),
        state: { ...round(sorted, triplets, event.from, null, null), skipped: event.skipped, skipNote: "✕ same value as the last peg" },
      });
      trapNamed = true;
    }
  });

  const answer = JSON.stringify(triplets);
  const done: ArrayThreePointerState = { ...blank(sorted, triplets.map((triplet) => [...triplet])), tones: tones(sorted.length, () => "faded") };
  frames.push({
    scene,
    caption: practice ? `${lead}No room is left for a peg and two calipers, so you are done. Your list is ${answer}, with nothing on it twice.` : `No room is left for a peg and two calipers, so we stop. The answer is ${answer}.`,
    codeLine: line(20),
    state: done,
  });
  return frames;
}

function solutionFrames(sorted: number[], run: ReturnType<typeof trace>, slow: Slow): Frame[] {
  const frames: Frame[] = [
    { scene: "solution", caption: `First the numbers are sorted, small to big. They now read ${sorted.join(", ")}.`, codeLine: 0, state: blank(sorted) },
    { scene: "solution", caption: "The list of triplets starts empty. The peg will visit the numbers from left to right.", codeLine: 1, state: blank(sorted, []) },
    ...runFrames(sorted, run.events, false),
  ];
  const done = frames.at(-1)!.state;
  frames.push({
    scene: "solution",
    caption: `Time: O(n²). Each peg needs one sweep of the calipers, not every pair. That took ${plural(run.sums, "sum")} here, where the slow way checked ${slow.checked}.`,
    codeLine: 5,
    state: { ...done, counter: { label: "sums checked", value: run.sums } },
  });
  const pegAt = sorted.length >= 3 ? round(sorted, run.triplets, 0, 1, sorted.length - 1) : done;
  frames.push({ scene: "solution", caption: "Space: O(1). Besides the list of answers, all we keep is three positions: the peg and the two calipers.", codeLine: 4, state: pegAt });
  return frames;
}

export const threeSumStory: ProblemStory<ArrayThreePointerState> = {
  slugs: ["lc-15"],
  pattern: "Sort + two pointers",
  trigger: "“all different triplets that add up to a target” in a list that may hold repeats",
  insight: "Sort first. Push a peg into one number, then squeeze two calipers over the rest: too small, the left caliper steps right; too big, the right caliper steps left.",
  metaphor: {
    name: "The peg and the calipers",
    legend: "peg = i · left caliper = left · right caliper = right · the list = result",
    terms: ["peg", "caliper"],
  },
  traps: [
    {
      name: "The Duplicate Triplet Trap",
      rule: "Never start the peg, or a caliper after a find, on a value it has just used. A triplet may still use the same value twice, like [-1, -1, 2].",
    },
  ],
  template: [
    "sort(nums);",
    "for each peg i, skipping a value equal to the one before it:",
    "    left = i + 1; right = n - 1;",
    "    while (left < right):",
    "        sum too small -> left++;   sum too big -> right--;",
    "        sum on target -> record it, move both, skip repeated values;",
  ],
  complexity: {
    slow: "O(n³)",
    time: "O(n²)",
    timeWhy: "sorting is quicker than that, and each of the n pegs needs only one sweep of the calipers",
    space: "O(1)",
    spaceWhy: "besides the answer list, only the peg and the two caliper positions are kept",
  },
  code: CODE,
  examples: [
    { label: "[-1,0,1,2,-1,-4]", input: "-1,0,1,2,-1,-4", expected: "[[-1,-1,2],[-1,0,1]]" },
    { label: "[-2,0,2,0,2]", input: "-2,0,2,0,2", expected: "[[-2,0,2]]", note: "Repeats under the calipers" },
    { label: "[0,0,0,0]", input: "0,0,0,0", expected: "[[0,0,0]]", note: "One value, used three times" },
    { label: "[0,1,1]", input: "0,1,1", expected: "[]", note: "No triplet at all" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-167", title: "Two Sum II - Input Array Is Sorted" },
    { slug: "lc-16", title: "3Sum Closest" },
    { slug: "lc-11", title: "Container With Most Water" },
  ],
  answer: (input) => JSON.stringify(slowSolve(parse(input)).unique),
  frames: (input) => {
    const nums = parse(input);
    const sorted = [...nums].sort((a, b) => a - b);
    const slow = slowSolve(nums);
    const run = trace(sorted);
    const practice = parse(PRACTICE).sort((a, b) => a - b);
    const found = run.events.find((event) => event.type === "found");
    const remember = found && found.type === "found" ? { ...round(sorted, run.triplets, found.peg, found.left, found.right, true), sumOf: [found.peg, found.left, found.right] as Trio } : sorted.length >= 3 ? round(sorted, run.triplets, 0, 1, sorted.length - 1) : blank(sorted, run.triplets);
    return [
      ...pictureFrames(nums, slow),
      ...slowFrames(nums, slow),
      ...insightFrames(nums, sorted, run.events),
      ...solutionFrames(sorted, run, slow),
      {
        scene: "card",
        caption: `Your turn, on new numbers, already sorted: ${practice.join(", ")}. You move the peg and the calipers.`,
        state: blank(practice, []),
      },
      ...runFrames(practice, trace(practice).events, true),
      { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: remember },
    ];
  },
  View: ArrayThreePointerView,
};
