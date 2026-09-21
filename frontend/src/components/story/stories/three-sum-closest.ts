import type { CellTone } from "@/components/learn/viz/primitives";

import { ArrayThreePointerView, type ArrayThreePointerState } from "../array-three-pointer-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ArrayThreePointerState>;
type Trio = [number, number, number];

/** Fresh numbers: a later triple has a larger sum that sits farther from the target. */
const PRACTICE = "[1,1,1,0], target=-100";

const CODE = [
  "Arrays.sort(nums);",
  "int best = nums[0] + nums[1] + nums[2];",
  "for (int i = 0; i + 2 < nums.length; i++) {",
  "    int left = i + 1, right = nums.length - 1;",
  "    while (left < right) {",
  "        int sum = nums[i] + nums[left] + nums[right];",
  "        if (Math.abs(sum - target) < Math.abs(best - target)) best = sum;",
  "        if (sum == target) return sum;",
  "        if (sum < target) left++;",
  "        else right--;",
  "    }",
  "}",
  "return best;",
];

function parse(raw: string): { nums: number[]; target: number } {
  const targetHit = raw.match(/target\s*=\s*(-?\d+)/i);
  if (targetHit) {
    const nums = [...raw.replace(/target\s*=\s*-?\d+/i, "").matchAll(/-?\d+/g)].map(Number);
    return { nums, target: Number(targetHit[1]) };
  }
  const lines = raw.trim().split(/\n+/);
  const nums = [...(lines[0] ?? "").matchAll(/-?\d+/g)].map(Number);
  const target = Number((lines[1] ?? "0").match(/-?\d+/)?.[0] ?? "0");
  return { nums, target };
}

const dist = (sum: number, target: number) => Math.abs(sum - target);

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(nums: number[]): ArrayThreePointerState {
  return { nums, tones: tones(nums.length, () => null), peg: null, left: null, right: null, sumOf: null, skipped: null, triplets: null };
}

function round(nums: number[], peg: number, left: number | null, right: number | null, found = false): ArrayThreePointerState {
  const open = left !== null && right !== null;
  return {
    ...blank(nums),
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

type Slow = { checked: number; best: number; bestTrio: Trio; first: Trio; farther: Trio | null };

function slowSolve(nums: number[], target: number): Slow {
  const slow: Slow = { checked: 0, best: nums[0] + nums[1] + nums[2], bestTrio: [0, 1, 2], first: [0, 1, 2], farther: null };
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      for (let k = j + 1; k < nums.length; k++) {
        slow.checked += 1;
        const sum = nums[i] + nums[j] + nums[k];
        if (dist(sum, target) < dist(slow.best, target)) {
          if (!slow.farther) slow.farther = slow.bestTrio;
          slow.best = sum;
          slow.bestTrio = [i, j, k];
        } else if (slow.checked === 1) {
          slow.best = sum;
          slow.bestTrio = [i, j, k];
        } else if (!slow.farther && dist(sum, target) > dist(slow.best, target)) {
          slow.farther = [i, j, k];
        }
      }
    }
  }
  return slow;
}

function solve(nums: number[], target: number): number {
  const sorted = [...nums].sort((a, b) => a - b);
  let best = sorted[0] + sorted[1] + sorted[2];
  for (let i = 0; i + 2 < sorted.length; i++) {
    let left = i + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const sum = sorted[i] + sorted[left] + sorted[right];
      if (dist(sum, target) < dist(best, target)) best = sum;
      if (sum === target) return sum;
      if (sum < target) left += 1;
      else right -= 1;
    }
  }
  return best;
}

type Event =
  | { type: "peg"; peg: number; left: number; right: number }
  | { type: "sum"; peg: number; left: number; right: number; sum: number; closer: boolean; best: number }
  | { type: "move"; peg: number; left: number; right: number; side: "left" | "right"; sum: number };

function trace(sorted: number[], target: number): { events: Event[]; best: number; sums: number } {
  const events: Event[] = [];
  let best = sorted[0] + sorted[1] + sorted[2];
  let sums = 0;
  for (let i = 0; i + 2 < sorted.length; i++) {
    let left = i + 1;
    let right = sorted.length - 1;
    events.push({ type: "peg", peg: i, left, right });
    while (left < right) {
      const sum = sorted[i] + sorted[left] + sorted[right];
      sums += 1;
      const closer = dist(sum, target) < dist(best, target);
      if (closer) best = sum;
      events.push({ type: "sum", peg: i, left, right, sum, closer, best });
      if (sum === target) return { events, best, sums };
      if (sum < target) {
        left += 1;
        events.push({ type: "move", peg: i, left, right, side: "left", sum });
      } else {
        right -= 1;
        events.push({ type: "move", peg: i, left, right, side: "right", sum });
      }
    }
  }
  return { events, best, sums };
}

function pictureFrames(nums: number[], target: number, slow: Slow): Frame[] {
  const paint = (trio: Trio, tone: CellTone) => tones(nums.length, (index) => (trio.includes(index) ? tone : null));
  const bestVals = slow.bestTrio.map((i) => nums[i]);
  const frames: Frame[] = [
    { scene: "picture", caption: `Here are ${nums.length} numbers. Pick any three. We want their sum as close as we can get to ${target}.`, state: blank(nums) },
    {
      scene: "picture",
      caption: `${bestVals[0]}, ${bestVals[1]} and ${bestVals[2]} make ${slow.best}. That sum is ${dist(slow.best, target)} away from ${target}, and it is the closest.`,
      state: { ...blank(nums), tones: paint(slow.bestTrio, "done"), sumOf: slow.bestTrio },
    },
  ];
  if (slow.farther) {
    const vals = slow.farther.map((i) => nums[i]);
    const sum = vals.reduce((a, b) => a + b, 0);
    frames.push({
      scene: "picture",
      caption: `${vals[0]}, ${vals[1]} and ${vals[2]} make ${sum}. That is ${dist(sum, target)} away, so it is not the answer even if the sum looks bigger.`,
      state: { ...blank(nums), tones: paint(slow.farther, "miss"), sumOf: slow.farther },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the closest sum, not the three boxes. Here that sum is ${slow.best}.`,
    state: { ...blank(nums), tones: paint(slow.bestTrio, "done"), sumOf: slow.bestTrio },
  });
  return frames;
}

function slowFrames(nums: number[], target: number, slow: Slow): Frame[] {
  const first = slow.first;
  const values = first.map((i) => nums[i]);
  const sum = values.reduce((a, b) => a + b, 0);
  const frames: Frame[] = [
    {
      scene: "slow",
      caption: `The slow way: try every group of three boxes. ${values[0]}, ${values[1]} and ${values[2]} make ${sum}, which is ${dist(sum, target)} from ${target}.`,
      state: { ...blank(nums), tones: tones(nums.length, (i) => (first.includes(i) ? "window" : null)), sumOf: first, counter: { label: "sums checked", value: 1 } },
    },
  ];
  if (slow.checked > 1) {
    frames.push({
      scene: "slow",
      caption: `Keep every other triple too. After ${slow.checked} sums the closest is ${slow.best}.`,
      state: { ...blank(nums), tones: tones(nums.length, (i) => (slow.bestTrio.includes(i) ? "done" : "faded")), sumOf: slow.bestTrio, counter: { label: "sums checked", value: slow.checked } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is ${slow.checked} sums for only ${nums.length} numbers. This is O(n³) time: far too slow when the row is long.`,
    state: { ...blank(nums), tones: tones(nums.length, () => "faded"), counter: { label: "sums checked", value: slow.checked } },
  });
  return frames;
}

function insightFrames(sorted: number[], target: number, events: Event[]): Frame[] {
  const frames: Frame[] = [
    { scene: "insight", caption: "One idea first: put the numbers in order, from small to big.", state: blank(sorted) },
  ];
  const peg = events.find((event) => event.type === "peg");
  if (peg && peg.type === "peg") {
    frames.push({
      scene: "insight",
      caption: `Picture a peg pushed into ${sorted[peg.peg]}. It stays put. Two calipers hold the two ends of everything to its right.`,
      state: round(sorted, peg.peg, peg.left, peg.right),
    });
  }
  const moment = events.find((event) => event.type === "sum" && event.sum !== target) ?? events.find((event) => event.type === "sum");
  if (moment && moment.type === "sum") {
    const names = `Peg ${sorted[moment.peg]} with calipers ${sorted[moment.left]} and ${sorted[moment.right]} makes ${moment.sum}`;
    frames.push({
      scene: "insight",
      caption:
        moment.sum < target
          ? `${names}: too small. The left caliper steps right to grow the sum. Keep the sum whose distance to ${target} is smallest.`
          : `${names}: too big. The right caliper steps left to shrink the sum. Keep the sum whose distance to ${target} is smallest.`,
      state: { ...round(sorted, moment.peg, moment.left, moment.right), sumOf: [moment.peg, moment.left, moment.right] },
    });
  }
  frames.push({
    scene: "insight",
    caption: "A larger sum is not always closer. Compare distances to the target, never the sums themselves.",
    state: blank(sorted),
  });
  return frames;
}

function moveQuiz(sorted: number[], peg: number, left: number, right: number, sum: number, target: number): StoryQuiz {
  const small = sum < target;
  return {
    kind: "cell",
    cells: sorted.length,
    question: `${sum} is ${small ? "below" : "above"} the target ${target}. Which caliper steps inward? Click its box.`,
    answer: small ? left : right,
    feedback: {
      [peg]: "The peg stays put for this whole sweep. Only a caliper moves.",
      [small ? right : left]: small
        ? "The right caliper can only step left, and nothing there is bigger. The sum would not grow."
        : "The left caliper can only step right, and nothing there is smaller. The sum would not shrink.",
    },
    otherwise: "Only the two calipers can move. Pick one of them.",
    why: small
      ? "The numbers are sorted, so bigger numbers lie to the right. The left caliper steps that way."
      : "The numbers are sorted, so smaller numbers lie to the left. The right caliper steps that way.",
  };
}

function solutionFrames(sorted: number[], target: number, run: ReturnType<typeof trace>, slow: Slow, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let askedMove = false;
  let askedCloser = false;
  let shownTrap = false;
  let best = sorted[0] + sorted[1] + sorted[2];

  if (!practice) {
    frames.push({
      scene,
      caption: `First the numbers are sorted, small to big. They now read ${sorted.join(", ")}.`,
      codeLine: 0,
      state: blank(sorted),
    });
    frames.push({
      scene,
      caption: `Seed the best with the first three: ${sorted[0]} + ${sorted[1]} + ${sorted[2]} = ${best}.`,
      codeLine: 1,
      state: { ...round(sorted, 0, 1, 2), sumOf: [0, 1, 2] },
    });
  } else {
    frames.push({
      scene,
      caption: `Your turn, on new numbers, already sorted: ${sorted.join(", ")}. The target is ${target}. You move the calipers.`,
      state: blank(sorted),
    });
  }

  for (let i = 0; i < run.events.length; i++) {
    const event = run.events[i];
    if (event.type === "peg") {
      frames.push({
        scene,
        caption: `The peg goes on ${sorted[event.peg]}. The calipers open over the numbers to its right.`,
        codeLine: line(3),
        state: round(sorted, event.peg, event.left, event.right),
      });
    } else if (event.type === "sum") {
      const state = { ...round(sorted, event.peg, event.left, event.right), sumOf: [event.peg, event.left, event.right] as Trio };
      const names = `Peg ${sorted[event.peg]} with calipers ${sorted[event.left]} and ${sorted[event.right]} makes ${event.sum}`;
      const look: Frame = { scene, caption: `${names}.`, codeLine: line(5), state };
      const isMove = event.sum !== target;
      if (isMove && (practice || !askedMove)) {
        askedMove = true;
        look.quiz = moveQuiz(sorted, event.peg, event.left, event.right, event.sum, target);
      } else if ((practice || !askedCloser) && event.sum !== best) {
        askedCloser = true;
        look.quiz = {
          kind: "choice",
          question: `Is ${event.sum} nearer the target ${target} than ${best}, or farther?`,
          options: ["Nearer: this becomes the new best", "Farther, or the same: keep the old best"],
          answer: event.closer ? 0 : 1,
          why: event.closer
            ? `${event.sum} is ${dist(event.sum, target)} away, closer than ${best}. Keep distances, not the larger sum.`
            : `${event.sum} is ${dist(event.sum, target)} away. ${best} is closer. A larger sum is not automatically better.`,
        };
      }
      if (!isMove) {
        look.caption = `${names}. Exact hit.`;
      }
      frames.push(look);

      if (event.closer) {
        frames.push({
          scene,
          caption: `${event.sum} is closer. New best: ${event.best}.`,
          codeLine: line(6),
          state: { ...round(sorted, event.peg, event.left, event.right, true), sumOf: [event.peg, event.left, event.right] },
        });
      } else if (!event.closer && event.sum !== best && !shownTrap && dist(event.sum, target) > dist(best, target) && event.sum > best) {
        shownTrap = true;
        frames.push({
          scene,
          caption: `The Distance Trap: ${event.sum} is larger than ${best}, but it is farther from ${target}. Keep ${best}.`,
          codeLine: line(6),
          state: { ...state, skipped: event.left, skipNote: `✕ ${event.sum} is farther` },
        });
      }

      if (event.sum === target) {
        best = event.best;
        break;
      }
      best = event.best;
    } else if (event.type === "move") {
      const met = event.left >= event.right;
      frames.push({
        scene,
        caption: `${event.sum} is too ${event.sum < target ? "small" : "big"}, so the ${event.side} caliper steps ${event.side === "left" ? "right" : "left"}.${met ? " The calipers meet, so this peg is done." : ""}`,
        codeLine: line(event.side === "left" ? 8 : 9),
        state: round(sorted, event.peg, event.left, event.right),
      });
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${run.best}. You judged distance yourself.` : `No peg and two calipers remain. The answer is ${run.best}.`,
    codeLine: line(12),
    state: { ...blank(sorted), tones: tones(sorted.length, () => "faded"), counter: { label: "closest sum", value: run.best } },
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n²). Each peg needs one sweep of the calipers. That took ${run.sums} sums here, where the slow way checked ${slow.checked}.`,
      codeLine: 4,
      state: { ...blank(sorted), counter: { label: "sums checked", value: run.sums } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Besides the best sum, all we keep is the peg and the two calipers.",
      codeLine: 3,
      state: sorted.length >= 3 ? round(sorted, 0, 1, sorted.length - 1) : blank(sorted),
    });
  }
  return frames;
}

export const threeSumClosestStory: ProblemStory<ArrayThreePointerState> = {
  slugs: ["lc-16"],
  pattern: "Sort + two pointers",
  trigger: "three values whose sum is closest to a target, and exactly one such sum exists",
  insight: "Sort, peg one number, squeeze two calipers. Keep the sum whose distance to the target is smallest, not the larger sum.",
  metaphor: {
    name: "The peg and the calipers",
    legend: "peg = i · left caliper = left · right caliper = right · best = closest sum so far",
    terms: ["peg", "caliper"],
  },
  traps: [
    {
      name: "The Distance Trap",
      rule: "A larger sum is not always closer. Compare the distance of each sum to the target, and keep the nearer one.",
    },
  ],
  template: [
    "sort(nums); best = first three;",
    "for each peg i:",
    "    left = i + 1; right = n - 1;",
    "    while (left < right):",
    "        if this sum is nearer, keep it;",
    "        too small -> left++;   too big -> right--;",
  ],
  complexity: {
    slow: "O(n³)",
    time: "O(n²)",
    timeWhy: "after the sort, each peg walks the rest once",
    space: "O(1)",
    spaceWhy: "only the peg, two calipers, and the best sum",
  },
  code: CODE,
  examples: [
    { label: "[-1,2,1,-4] → 1", input: "[-1,2,1,-4], target=1", expected: "2" },
    { label: "[-5,-2,1,4] → 1", input: "[-5,-2,1,4], target=1", expected: "0", note: "A larger sum is farther" },
    { label: "[0,0,0] → 1", input: "[0,0,0], target=1", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-15", title: "3Sum" },
    { slug: "lc-167", title: "Two Sum II - Input Array Is Sorted" },
    { slug: "lc-1", title: "Two Sum" },
  ],
  answer: (input) => {
    const { nums, target } = parse(input);
    return String(solve(nums, target));
  },
  frames: (input) => {
    const { nums, target } = parse(input);
    const sorted = [...nums].sort((a, b) => a - b);
    const slow = slowSolve(nums, target);
    const run = trace(sorted, target);
    const practice = parse(PRACTICE);
    const practiceSorted = [...practice.nums].sort((a, b) => a - b);
    return [
      ...pictureFrames(nums, target, slow),
      ...slowFrames(nums, target, slow),
      ...insightFrames(sorted, target, run.events),
      ...solutionFrames(sorted, target, run, slow),
      ...solutionFrames(practiceSorted, practice.target, trace(practiceSorted, practice.target), slowSolve(practice.nums, practice.target), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a peg, two calipers, and the nearest sum. Say the idea, then reveal the card.",
        state: sorted.length >= 3 ? { ...round(sorted, 0, 1, sorted.length - 1), sumOf: [0, 1, 2] } : blank(sorted),
      },
    ];
  },
  View: ArrayThreePointerView,
};
