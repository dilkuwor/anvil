import { ContainerWaterView, type ContainerWaterState } from "../container-water-view";
import type { ProblemStory, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ContainerWaterState>;

/** Fresh walls for the "your turn" run: the left wall and the right wall both get to move, and no two walls tie. */
const PRACTICE = "2,7,3,9,5";

const CODE = [
  "int n = height.length, best = 0;",
  "int left = 0, right = n - 1;",
  "while (left < right) {",
  "    int width = right - left;",
  "    int water = Math.min(height[left], height[right]);",
  "    best = Math.max(best, width * water);",
  "    if (height[left] < height[right]) {",
  "        left++;",
  "    } else {",
  "        right--;",
  "    }",
  "}",
  "return best;",
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
const holds = (heights: number[], left: number, right: number) => (right - left) * Math.min(heights[left], heights[right]);

type Solved = { best: number; bestLeft: number; bestRight: number; moves: number };

/** The real two-wall walk, with the same tie rule as the Java: on equal heights the right wall moves. */
function solve(heights: number[]): Solved {
  let left = 0;
  let right = heights.length - 1;
  const solved: Solved = { best: 0, bestLeft: 0, bestRight: Math.max(heights.length - 1, 0), moves: 0 };
  while (left < right) {
    const area = holds(heights, left, right);
    if (area > solved.best) {
      solved.best = area;
      solved.bestLeft = left;
      solved.bestRight = right;
    }
    if (heights[left] < heights[right]) left++;
    else right--;
    solved.moves++;
  }
  return solved;
}

function blank(heights: number[]): ContainerWaterState {
  return { heights, left: null, right: null, measure: "none", tone: "open", best: null };
}

function pictureFrames(heights: number[], solved: Solved): Frame[] {
  const last = heights.length - 1;
  const frames: Frame[] = [
    { scene: "picture", caption: `Here are ${plural(heights.length, "wall")} standing in a row. The number on each wall is its height.`, state: blank(heights) },
    {
      scene: "picture",
      caption: "Pick any two walls and they make a tank. Water fills it up to the top of the shorter wall.",
      state: { ...blank(heights), left: 0, right: last, measure: "water" },
    },
  ];
  // The first pair of different heights, to show that water cannot stand above the shorter wall.
  let uneven: [number, number] | null = null;
  for (let i = 0; i < heights.length && !uneven; i++) {
    for (let j = heights.length - 1; j > i && !uneven; j--) if (heights[i] !== heights[j]) uneven = [i, j];
  }
  if (uneven) {
    const [i, j] = uneven;
    frames.push({
      scene: "picture",
      caption: `Water can never stand higher than the shorter wall. Above ${Math.min(heights[i], heights[j])}, it spills over the top.`,
      state: { ...blank(heights), left: i, right: j, measure: "water", spill: true, limit: heights[i] < heights[j] ? i : j },
    });
  }
  frames.push({
    scene: "picture",
    caption: `A tank holds its width times its water height. Here: ${last} × ${Math.min(heights[0], heights[last])} = ${holds(heights, 0, last)}.${heights.length > 2 ? " Walls in between do not get in the way." : ""}`,
    state: { ...blank(heights), left: 0, right: last, measure: "area" },
  });
  frames.push({
    scene: "picture",
    caption: `The goal: find the two walls whose tank holds the most water. Here the most is ${solved.best}.`,
    state: { ...blank(heights), left: solved.bestLeft, right: solved.bestRight, measure: "area", tone: "best", best: solved.best },
  });
  return frames;
}

/** Really measures every pair. The counter is counted in the loop, never worked out from a formula. */
function slowFrames(heights: number[]): Frame[] {
  const frames: Frame[] = [];
  let measured = 0;
  let best = 0;
  let bestPair: [number, number] = [0, Math.max(heights.length - 1, 0)];
  for (let i = 0; i < heights.length; i++) {
    for (let j = i + 1; j < heights.length; j++) {
      measured++;
      const area = holds(heights, i, j);
      if (area > best) {
        best = area;
        bestPair = [i, j];
      }
      if (measured > 3) continue;
      const lead = measured === 1 ? "The slow way: measure every possible tank, one by one." : j === i + 1 ? "Now move the left wall one step and start again." : "Keep the left wall and try the next right wall.";
      frames.push({
        scene: "slow",
        caption: `${lead} This tank holds ${area}.`,
        state: { ...blank(heights), left: i, right: j, measure: "area", counter: { label: "tanks measured", value: measured } },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `That is ${plural(measured, "tank")} measured for only ${heights.length} walls, to find the best: ${best}. This is O(n²) time: far too slow for 100,000 walls.`,
    state: { ...blank(heights), left: bestPair[0], right: bestPair[1], measure: "area", tone: "best", best, counter: { label: "tanks measured", value: measured } },
  });
  return frames;
}

function insightFrames(heights: number[]): Frame[] {
  const left = 0;
  const right = heights.length - 1;
  const tie = heights[left] === heights[right];
  const shorter = heights[left] < heights[right] ? left : right;
  const side = shorter === left ? "left" : "right";
  const wide = { ...blank(heights), left, right };
  return [
    { scene: "insight", caption: "Picture one water tank with two walls you can slide. Start with the widest tank there is: the two outer walls.", state: { ...wide, measure: "width" } },
    {
      scene: "insight",
      caption: tie
        ? `The water stops at the top of the shorter wall. Here both walls are ${heights[left]} high, so the water stands ${heights[left]} high.`
        : `The water stops at the top of the shorter wall. Here that is the ${side} wall, only ${heights[shorter]} high.`,
      state: { ...wide, measure: "water", limit: tie ? null : shorter },
    },
    {
      scene: "insight",
      caption: "Every step inward makes the tank narrower. So a step is only worth it if the water can rise.",
      state: { ...wide, measure: "water", limit: tie ? null : shorter },
    },
    {
      scene: "insight",
      caption: `The water can only rise if the shorter wall is swapped for a taller one. So the shorter wall steps inward, every time.${tie ? " On a tie, either wall may go." : ""}`,
      state: { ...wide, left: shorter === left ? left + 1 : left, right: shorter === left ? right : right - 1 },
    },
  ];
}

function moveQuiz(heights: number[], left: number, right: number): StoryQuiz {
  const shorter = heights[left] < heights[right] ? left : right;
  const taller = shorter === left ? right : left;
  return {
    kind: "cell",
    cells: heights.length,
    numbered: true,
    question: "One wall of the tank must step inward. Which one? Click that wall.",
    answer: shorter,
    feedback: {
      [taller]: "The Taller Wall Trap. If this wall moves, the tank gets narrower and the water still stops at the shorter wall.",
    },
    otherwise: "Only the two walls of the tank can move. Pick one of them.",
    why: `The shorter wall (${heights[shorter]}) holds the water down. Swapping it is the only way the water can rise.`,
  };
}

function solutionFrames(heights: number[]): Frame[] {
  const frames: Frame[] = [];
  const total = heights.length;
  let left = 0;
  let right = total - 1;
  let best = 0;
  let bestPair: [number, number] | null = null;
  let moves = 0;
  const asked = { left: false, right: false };
  let trapShown = false;
  let first = true;

  const at = (extra: Partial<ContainerWaterState> = {}): ContainerWaterState => ({ ...blank(heights), left, right, best, ...extra });

  frames.push({ scene: "solution", caption: "The tank starts as wide as it can be: the left wall and the right wall are the two outer walls. The best so far is 0.", codeLine: 1, state: at() });

  while (left < right) {
    const width = right - left;
    const water = Math.min(heights[left], heights[right]);
    const area = width * water;
    const improved = area > best;

    if (first) {
      frames.push({ scene: "solution", caption: `Measure the tank. The walls are ${plural(width, "step")} apart, so it is ${width} wide.`, codeLine: 3, state: at({ measure: "width" }) });
      frames.push({ scene: "solution", caption: `The water stands ${water} high, up to the top of the shorter wall.`, codeLine: 4, state: at({ measure: "water" }) });
      frames.push({ scene: "solution", caption: `So this tank holds ${width} × ${water} = ${area}.`, codeLine: 5, state: at({ measure: "area" }) });
      first = false;
    } else {
      frames.push({
        scene: "solution",
        caption: `This tank is ${width} wide and its water stands ${water} high. It holds ${width} × ${water} = ${area}.${improved ? "" : ` The best stays ${best}.`}`,
        codeLine: improved ? 4 : 5,
        state: at({ measure: "area" }),
      });
    }
    if (improved) {
      const old = best;
      best = area;
      bestPair = [left, right];
      frames.push({ scene: "solution", caption: `${area} is more than the best so far, ${old}. New best: ${area}.`, codeLine: 5, state: at({ measure: "area", tone: "best" }) });
    }

    const tie = heights[left] === heights[right];
    const leftMoves = heights[left] < heights[right];
    const side = leftMoves ? "left" : "right";
    const other = leftMoves ? "right" : "left";
    const mover = leftMoves ? left : right;
    const stayer = leftMoves ? right : left;
    let lead = `The ${side} wall (${heights[mover]}) is shorter than the ${other} wall (${heights[stayer]}), so it steps inward.`;

    if (tie) {
      lead = `Both walls are ${heights[left]} high, so either one may step inward. This code moves the right wall.`;
    } else if (!asked[side]) {
      asked[side] = true;
      frames.push({
        scene: "solution",
        caption: `Now one wall steps inward. The left wall is ${heights[left]} high and the right wall is ${heights[right]} high.`,
        codeLine: 6,
        state: at({ measure: "area" }),
        quiz: moveQuiz(heights, left, right),
      });
      if (!trapShown && width >= 2) {
        trapShown = true;
        const ghost: [number, number] = leftMoves ? [left, right - 1] : [left + 1, right];
        const less = holds(heights, ghost[0], ghost[1]);
        frames.push({
          scene: "solution",
          caption: `The Taller Wall Trap: move the taller ${other} wall and the tank gets narrower, but the water still cannot pass ${heights[mover]}. It would hold ${less}, not ${area}.`,
          codeLine: 6,
          state: at({ measure: "area", limit: mover, trap: { left: ghost[0], right: ghost[1] } }),
        });
        lead = `So the shorter ${side} wall steps inward. Only that move can let the water rise.`;
      }
    }

    if (leftMoves) left++;
    else right--;
    moves++;
    const met = left === right;
    frames.push({ scene: "solution", caption: met ? `${lead} Now the two walls meet.` : lead, codeLine: leftMoves ? 7 : 9, state: at() });
  }

  const bestState: Partial<ContainerWaterState> = bestPair ? { left: bestPair[0], right: bestPair[1], measure: "area", tone: "best" } : { left: null, right: null };
  frames.push({
    scene: "solution",
    caption: `The walls met, so no tank is left to measure. Every tank we skipped had a shorter wall that could not do better. The answer is ${best}.`,
    codeLine: 12,
    state: at(bestState),
  });

  let pairs = 0;
  for (let i = 0; i < total; i++) for (let j = i + 1; j < total; j++) pairs++;
  frames.push({
    scene: "solution",
    caption: `Time: O(n). Every move brings the walls one step closer, so they met after ${plural(moves, "move")}. The slow way measured ${plural(pairs, "tank")}.`,
    codeLine: 2,
    state: at({ ...bestState, counter: { label: "tanks measured", value: moves } }),
  });
  frames.push({
    scene: "solution",
    caption: "Space: O(1). All we ever kept was where the left wall is, where the right wall is, and the best so far.",
    codeLine: 1,
    state: at(bestState),
  });
  return frames;
}

/** The practice run: the reader chooses the wall at every single move. */
function practiceFrames(heights: number[]): Frame[] {
  const frames: Frame[] = [];
  let left = 0;
  let right = heights.length - 1;
  let best = 0;
  let bestPair: [number, number] = [left, right];
  let lead = "";

  frames.push({
    scene: "card",
    caption: `Your turn, on new walls: ${heights.join(", ")}. You choose which wall steps inward, every time.`,
    state: { ...blank(heights), left, right, best },
  });

  while (left < right) {
    const area = holds(heights, left, right);
    const improved = area > best;
    if (improved) {
      best = area;
      bestPair = [left, right];
    }
    const tie = heights[left] === heights[right];
    const frame: Frame = {
      scene: "card",
      caption: `${lead}This tank holds ${right - left} × ${Math.min(heights[left], heights[right])} = ${area}. ${improved ? `New best: ${best}.` : `The best stays ${best}.`}`,
      state: { ...blank(heights), left, right, best, measure: "area" },
    };
    // On a tie either wall is right, so there is no single answer to ask for.
    if (!tie) frame.quiz = moveQuiz(heights, left, right);
    frames.push(frame);
    const leftMoves = heights[left] < heights[right];
    lead = tie ? "The walls were equal, so the right wall stepped inward. " : `The shorter ${leftMoves ? "left" : "right"} wall stepped inward. `;
    if (leftMoves) left++;
    else right--;
  }

  frames.push({
    scene: "card",
    caption: `${lead}Now the walls meet, so you are done. The most water is ${best}, and you chose every move yourself.`,
    state: { ...blank(heights), left: bestPair[0], right: bestPair[1], best, measure: "area", tone: "best" },
  });
  return frames;
}

export const containerWithMostWaterStory: ProblemStory<ContainerWaterState> = {
  slugs: ["lc-11", "widest-water-basin"],
  pattern: "Two pointers",
  trigger: "“pick two lines that hold the most water”, or any best pair where width fights height",
  insight: "Start with the widest tank. The water stops at the shorter wall, so only the shorter wall steps inward.",
  metaphor: {
    name: "The sliding tank walls",
    legend: "left wall = left · right wall = right · water height = the shorter wall · tank = width × water height",
    terms: ["wall", "tank", "water"],
  },
  traps: [
    {
      name: "The Taller Wall Trap",
      rule: "Never move the taller wall. The tank gets narrower and the water still stops at the shorter wall, so it can only hold less.",
    },
  ],
  template: [
    "left = 0; right = n - 1;",
    "while (left < right) {",
    "    score the pair (left, right); keep the best;",
    "    move the side that holds the score down;   // here: the shorter wall",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "every move brings the two walls one step closer, so n walls need n − 1 moves",
    space: "O(1)",
    spaceWhy: "only the two wall positions and the best so far are kept",
  },
  code: CODE,
  examples: [
    { label: "[1,8,6,2,5,4,8,3,7]", input: "1,8,6,2,5,4,8,3,7", expected: "49" },
    { label: "[4,3,2,1,4]", input: "4,3,2,1,4", expected: "16", note: "The outer walls tie" },
    { label: "[1,2,1]", input: "1,2,1", expected: "2" },
    { label: "[1,1]", input: "1,1", expected: "1", note: "Only one tank" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-42", title: "Trapping Rain Water" },
    { slug: "lc-167", title: "Two Sum II - Input Array Is Sorted" },
    { slug: "lc-15", title: "3Sum" },
  ],
  answer: (input) => String(solve(parse(input)).best),
  frames: (input) => {
    const heights = parse(input);
    const solved = solve(heights);
    return [
      ...pictureFrames(heights, solved),
      ...slowFrames(heights),
      ...insightFrames(heights),
      ...solutionFrames(heights),
      ...practiceFrames(parse(PRACTICE)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(heights), left: solved.bestLeft, right: solved.bestRight, measure: "area", tone: "best", best: solved.best },
      },
    ];
  },
  View: ContainerWaterView,
};
