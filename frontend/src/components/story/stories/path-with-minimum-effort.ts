import { HikerGridView, type HikerGridState, type HikerPos } from "../rec07-hiker-grid-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<HikerGridState>;
type Entry = { effort: number; cell: HikerPos; order: number };

/** Fresh map for the "your turn" run. A later trail beats an earlier one on its steepest step but not on total climb. */
const PRACTICE = "[[6,2,7],[3,1,5]]";

const CODE = [
  "int[][] effort = new int[rows][cols];",
  "for (int[] row : effort) Arrays.fill(row, Integer.MAX_VALUE);",
  "effort[0][0] = 0;",
  "PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);",
  "heap.add(new int[] {0, 0, 0});",
  "while (!heap.isEmpty()) {",
  "    int[] top = heap.poll();",
  "    int e = top[0], r = top[1], c = top[2];",
  "    if (e > effort[r][c]) continue;",
  "    if (r == rows - 1 && c == cols - 1) return e;",
  "    for (int[] move : moves) {",
  "        int nr = r + move[0], nc = c + move[1];",
  "        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;",
  "        int next = Math.max(e, Math.abs(heights[nr][nc] - heights[r][c]));",
  "        if (next < effort[nr][nc]) {",
  "            effort[nr][nc] = next;",
  "            heap.add(new int[] {next, nr, nc});",
  "        }",
  "    }",
  "}",
  "return 0;",
];

const MOVES: HikerPos[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function parse(input: string): number[][] {
  return JSON.parse(input.trim()) as number[][];
}

const at = (cell: HikerPos) => `(${cell[0]},${cell[1]})`;
const key = (cell: HikerPos) => `${cell[0]},${cell[1]}`;

function neighbours(heights: number[][], [r, c]: HikerPos): HikerPos[] {
  return MOVES.map(([dr, dc]) => [r + dr, c + dc] as HikerPos).filter(([nr, nc]) => nr >= 0 && nr < heights.length && nc >= 0 && nc < heights[0].length);
}

function blank(heights: number[][]): HikerGridState {
  return { heights, effort: null, done: [], here: null, list: null };
}

type Best = { value: number; route: HikerPos[]; sum: number };

/** A plain shortest-route search where the cost of a route is combined by `join`: max for effort, + for total climb. */
function search(heights: number[][], join: (sofar: number, step: number) => number): Best {
  const rows = heights.length;
  const cols = heights[0].length;
  const best = new Map<string, number>([[key([0, 0]), 0]]);
  const parent = new Map<string, HikerPos>();
  const done = new Set<string>();
  const goal = key([rows - 1, cols - 1]);
  while (true) {
    let pick: HikerPos | null = null;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = key([r, c]);
        if (done.has(k) || !best.has(k)) continue;
        if (!pick || best.get(k)! < best.get(key(pick))!) pick = [r, c];
      }
    }
    if (!pick) break;
    done.add(key(pick));
    if (key(pick) === goal) break;
    for (const next of neighbours(heights, pick)) {
      const value = join(best.get(key(pick))!, Math.abs(heights[next[0]][next[1]] - heights[pick[0]][pick[1]]));
      if (!best.has(key(next)) || value < best.get(key(next))!) {
        best.set(key(next), value);
        parent.set(key(next), pick);
      }
    }
  }
  const route: HikerPos[] = [[rows - 1, cols - 1]];
  while (key(route[0]) !== key([0, 0])) route.unshift(parent.get(key(route[0]))!);
  return { value: best.get(goal)!, route, sum: climb(heights, route) };
}

function climb(heights: number[][], route: HikerPos[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += Math.abs(heights[route[i][0]][route[i][1]] - heights[route[i - 1][0]][route[i - 1][1]]);
  return total;
}

function worst(heights: number[][], route: HikerPos[]): number {
  let most = 0;
  for (let i = 1; i < route.length; i++) most = Math.max(most, Math.abs(heights[route[i][0]][route[i][1]] - heights[route[i - 1][0]][route[i - 1][1]]));
  return most;
}

const effortOf = (heights: number[][]) => search(heights, (sofar, step) => Math.max(sofar, step));
const sumOf = (heights: number[][]) => search(heights, (sofar, step) => sofar + step);

function pictureFrames(heights: number[][]): Frame[] {
  const base = blank(heights);
  const rows = heights.length;
  const cols = heights[0].length;
  const goal: HikerPos = [rows - 1, cols - 1];
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "Each box is a height on a hiking map. The hiker starts at the top-left box and must reach the bottom-right box.",
      state: { ...base, here: [0, 0], look: goal },
    },
  ];
  const first = neighbours(heights, [0, 0])[0];
  if (first) {
    const size = Math.abs(heights[first[0]][first[1]] - heights[0][0]);
    frames.push({
      scene: "picture",
      caption: `A step goes up, down, left or right. Its size is the height difference: from ${heights[0][0]} to ${heights[first[0]][first[1]]} is a step of ${size}.`,
      state: { ...base, here: [0, 0], step: { from: [0, 0], to: first, size } },
    });
  }
  const bySum = sumOf(heights);
  frames.push({
    scene: "picture",
    caption: `Not the total: a trail's effort is its steepest single step. This trail climbs ${bySum.sum} in total, but its effort is ${worst(heights, bySum.route)}.`,
    state: { ...base, route: { cells: bySum.route, label: `steepest ${worst(heights, bySum.route)} · total ${bySum.sum}` } },
  });
  frames.push({
    scene: "picture",
    caption: "The goal: find the trail whose steepest step is as small as possible. Return that step size.",
    state: { ...base, here: [0, 0], look: goal },
  });
  return frames;
}

function flood(heights: number[][], limit: number): HikerPos[] {
  const seen = new Set<string>([key([0, 0])]);
  const reached: HikerPos[] = [[0, 0]];
  for (let i = 0; i < reached.length; i++) {
    const cell = reached[i];
    for (const next of neighbours(heights, cell)) {
      if (seen.has(key(next))) continue;
      if (Math.abs(heights[next[0]][next[1]] - heights[cell[0]][cell[1]]) > limit) continue;
      seen.add(key(next));
      reached.push(next);
    }
  }
  return reached;
}

function slowFrames(heights: number[][]): Frame[] {
  const goal = key([heights.length - 1, heights[0].length - 1]);
  const frames: Frame[] = [];
  let flooded = 0;
  for (let limit = 0; ; limit++) {
    const reached = flood(heights, limit);
    flooded += reached.length;
    const made = reached.some((cell) => key(cell) === goal);
    if (limit < 3 || made) {
      frames.push({
        scene: "slow",
        caption: made
          ? `With steps up to ${limit}, the flood reaches the corner at last. So the answer is ${limit}.`
          : limit === 0
            ? "The slow way: allow only steps of size 0 and flood out from the start. The flood does not reach the corner."
            : `Allow steps up to ${limit} and flood again from the start. Still no corner.`,
        state: { ...blank(heights), flood: reached, limit, counter: { label: "boxes flooded", value: flooded } },
      });
    }
    if (made) break;
  }
  frames.push({
    scene: "slow",
    caption: `Every new limit floods the whole map again: ${flooded} boxes here. This is O(m·n·H) time, where H is the biggest height difference.`,
    state: { ...blank(heights), counter: { label: "boxes flooded", value: flooded } },
  });
  return frames;
}

function insightFrames(heights: number[][]): Frame[] {
  const best = effortOf(heights);
  const bySum = sumOf(heights);
  const bestLabel = `steepest ${best.value} · total ${best.sum}`;
  const frames: Frame[] = [];
  if (best.route.map(key).join("|") !== bySum.route.map(key).join("|") && worst(heights, bySum.route) !== best.value) {
    const sumLabel = `steepest ${worst(heights, bySum.route)} · total ${bySum.sum}`;
    frames.push({
      scene: "insight",
      caption: `Picture the hiker. The dashed trail climbs only ${bySum.sum} in total, but one step on it is ${worst(heights, bySum.route)} high.`,
      state: { ...blank(heights), other: { cells: bySum.route, label: sumLabel } },
    });
    frames.push({
      scene: "insight",
      caption: `The solid trail climbs ${best.sum} in total, yet its steepest step is only ${best.value}. The hiker takes it: only the steepest step counts.`,
      state: { ...blank(heights), other: { cells: bySum.route, label: sumLabel }, route: { cells: best.route, label: bestLabel } },
    });
  } else {
    frames.push({
      scene: "insight",
      caption: `Picture the hiker. The best trail here has steepest step ${best.value}. Only that one step counts, not the total climb.`,
      state: { ...blank(heights), route: { cells: best.route, label: bestLabel } },
    });
  }
  frames.push({
    scene: "insight",
    caption: "A trail's steepest step can never shrink as the trail gets longer. So the hiker always grows the trail whose steepest step is smallest.",
    state: { ...blank(heights), route: { cells: best.route, label: bestLabel }, here: [0, 0] },
  });
  return frames;
}

function pickQuiz(heights: number[][], list: Entry[], answer: HikerPos): StoryQuiz | null {
  if (list.length < 2) return null;
  const smallest = Math.min(...list.map((entry) => entry.effort));
  if (list.filter((entry) => entry.effort === smallest).length > 1) return null;
  const cols = heights[0].length;
  const feedback: Record<number, string> = {};
  for (const entry of list) {
    if (key(entry.cell) === key(answer)) continue;
    feedback[entry.cell[0] * cols + entry.cell[1]] = `The trail to ${at(entry.cell)} has steepest step ${entry.effort}. Another trail on the list is gentler.`;
  }
  return {
    kind: "cell",
    cells: heights.length * cols,
    question: "Which box does the hiker take next from the list? Click it.",
    answer: answer[0] * cols + answer[1],
    feedback,
    otherwise: "Only boxes on the list can be taken. Read the list and find the gentlest trail.",
    why: `The trail with the smallest steepest step, ${smallest}. No other trail on the list can be gentler.`,
  };
}

function effortQuiz(sofar: number, size: number): StoryQuiz {
  const next = Math.max(sofar, size);
  const add = `${sofar + size}: add the new step to the trail`;
  const keep = `${next}: the steeper of the two`;
  // Vary the order so the right answer is not always in the same place.
  const flip = (sofar + size) % 2 === 0;
  return {
    kind: "choice",
    question: `The trail so far has steepest step ${sofar}. The new step is ${size}. What is the trail's effort now?`,
    options: flip ? [keep, add] : [add, keep],
    answer: flip ? 0 : 1,
    why: `The effort is the steepest step, so it is ${next}. Adding steps is the Sum Trap.`,
  };
}

/** The real Dijkstra run, one frame per change. `practice` asks at every decision and shows no code. */
function solutionFrames(heights: number[][], scene: SceneId = "solution", practice = false): Frame[] {
  const rows = heights.length;
  const cols = heights[0].length;
  const line = (index: number) => (practice ? undefined : index);
  const effort: (number | null)[][] = heights.map((row) => row.map(() => null));
  const sum: number[][] = heights.map((row) => row.map(() => 0));
  const parent = new Map<string, HikerPos>();
  const done: HikerPos[] = [];
  let list: Entry[] = [];
  let order = 0;
  let added = 0;
  const frames: Frame[] = [];
  const asked = { pick: false, effort: false };
  const sorted = () => [...list].sort((a, b) => a.effort - b.effort || a.order - b.order);
  const routeTo = (cell: HikerPos): HikerPos[] => {
    const route: HikerPos[] = [cell];
    while (key(route[0]) !== key([0, 0])) route.unshift(parent.get(key(route[0]))!);
    return route;
  };
  const snap = (extra: Partial<HikerGridState> = {}): HikerGridState => ({
    ...blank(heights),
    effort: effort.map((row) => [...row]),
    done: [...done],
    list: sorted().map(({ effort: e, cell }) => ({ effort: e, cell })),
    listSorted: true,
    ...extra,
  });

  effort[0][0] = 0;
  list.push({ effort: 0, cell: [0, 0], order: order++ });
  added++;
  frames.push({
    scene,
    caption: practice ? "Your turn, on a new map. You choose the next box and each trail's effort." : "Every box starts at infinity. The start needs 0: the hiker has not taken a step yet.",
    codeLine: line(2),
    state: snap(),
  });

  let answer = 0;
  while (list.length) {
    const top = sorted()[0];
    if (done.length > 0 && (practice || !asked.pick)) {
      const quiz = pickQuiz(heights, list, top.cell);
      if (quiz) {
        asked.pick = true;
        frames.push({
          scene,
          caption: `The hiker has ${list.length} trails on the list. The gentlest one is grown next.`,
          codeLine: line(6),
          state: snap({ list: list.map(({ effort: e, cell }) => ({ effort: e, cell })), listSorted: false }),
          quiz,
        });
      }
    }
    list = list.filter((entry) => entry !== top);
    const [r, c] = top.cell;
    if (top.effort > effort[r][c]!) {
      frames.push({
        scene,
        caption: `This old trail to ${at(top.cell)} has steepest step ${top.effort}, but a gentler one already reached it. The hiker skips it.`,
        codeLine: line(8),
        state: snap({ here: top.cell }),
      });
      continue;
    }
    done.push(top.cell);
    if (r === rows - 1 && c === cols - 1) {
      answer = top.effort;
      frames.push({
        scene,
        caption: practice
          ? `The hiker reaches the corner with steepest step ${top.effort}. Done: the answer is ${top.effort}.`
          : `The hiker takes the trail to the corner. Its steepest step is ${top.effort}, so the answer is ${top.effort}.`,
        codeLine: line(9),
        state: snap({ here: top.cell, route: { cells: routeTo(top.cell), label: `steepest ${top.effort}` } }),
      });
      break;
    }
    if (done.length === 1) {
      // From the start every trail is one step long, so its steepest step is that step: one frame for all of them.
      const firsts = neighbours(heights, top.cell);
      for (const next of firsts) {
        const size = Math.abs(heights[next[0]][next[1]] - heights[r][c]);
        effort[next[0]][next[1]] = size;
        sum[next[0]][next[1]] = size;
        parent.set(key(next), top.cell);
        list.push({ effort: size, cell: next, order: order++ });
        added++;
      }
      frames.push({
        scene,
        caption: `From the start, each first step is a whole trail: ${firsts.map((next) => `to ${at(next)} it is ${effort[next[0]][next[1]]}`).join(", ")}. The hiker lists them.`,
        codeLine: line(15),
        state: snap({ here: top.cell }),
      });
      continue;
    }
    frames.push({
      scene,
      caption: `The hiker takes the gentlest trail on the list: to ${at(top.cell)}, steepest step ${top.effort}. That box is now final.`,
      codeLine: line(6),
      state: snap({ here: top.cell }),
    });
    for (const next of neighbours(heights, top.cell)) {
      const size = Math.abs(heights[next[0]][next[1]] - heights[r][c]);
      const value = Math.max(top.effort, size);
      const old = effort[next[0]][next[1]];
      if (old !== null && value >= old) continue;
      const step = { from: top.cell, to: next, size };
      if (top.effort > 0 && size > 0 && (practice || !asked.effort)) {
        asked.effort = true;
        frames.push({
          scene,
          caption: `A step from ${at(top.cell)} to ${at(next)}: from height ${heights[r][c]} to ${heights[next[0]][next[1]]}, a step of ${size}.`,
          codeLine: line(13),
          state: snap({ here: top.cell, look: next, step }),
          quiz: effortQuiz(top.effort, size),
        });
      }
      const oldRoute = old !== null ? routeTo(next) : null;
      const oldSum = sum[next[0]][next[1]];
      effort[next[0]][next[1]] = value;
      sum[next[0]][next[1]] = sum[r][c] + size;
      parent.set(key(next), top.cell);
      list.push({ effort: value, cell: next, order: order++ });
      added++;
      frames.push({
        scene,
        caption:
          old === null
            ? `The trail to ${at(next)} has steepest step ${value}. The hiker writes it down and adds it to the list.`
            : `The trail to ${at(next)} has steepest step ${value}, gentler than ${old}. The hiker writes it down and adds it to the list.`,
        codeLine: line(15),
        state: snap({ here: top.cell, look: next, step }),
      });
      if (oldRoute && oldSum < sum[next[0]][next[1]]) {
        frames.push({
          scene,
          caption: `The Sum Trap: by total climb the old trail wins, ${oldSum} against ${sum[next[0]][next[1]]}. By steepest step the new trail wins, ${value} against ${old}.`,
          codeLine: line(13),
          state: snap({
            here: top.cell,
            route: { cells: routeTo(next), label: `new: steepest ${value} · total ${sum[next[0]][next[1]]}` },
            other: { cells: oldRoute, label: `old: steepest ${old} · total ${oldSum}` },
          }),
        });
      }
    }
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(m·n·log(m·n)). Each box joins the list a few times, and taking the gentlest trail costs a log step. Here: ${added} trails added.`,
      codeLine: 16,
      state: snap({ counter: { label: "trails added", value: added }, route: { cells: routeTo([rows - 1, cols - 1]), label: `steepest ${answer}` } }),
    });
    frames.push({
      scene,
      caption: "Space: O(m·n). The hiker keeps one steepest-step number per box, plus the list of trails.",
      codeLine: 0,
      state: snap({ route: { cells: routeTo([rows - 1, cols - 1]), label: `steepest ${answer}` } }),
    });
  }
  return frames;
}

export const pathWithMinimumEffortStory: ProblemStory<HikerGridState> = {
  slugs: ["lc-1631"],
  pattern: "Dijkstra on a grid",
  trigger: "the cost of a route is its largest single step, and you want the cheapest route between two cells",
  insight: "A hiker only cares about the steepest step on the trail. Always extend the trail whose steepest step is smallest; moving on costs the bigger of the steepest step so far and the new step.",
  metaphor: {
    name: "The hiker's steepest step",
    legend: "box = cell · steepest step = effort[r][c] · list of trails = heap · final box = taken from the heap",
    terms: ["hiker", "trail", "steepest", "step"],
  },
  traps: [{ name: "The Sum Trap", rule: "Do not add the steps. The new effort is max(effort so far, this step), never effort + step." }],
  template: [
    "best[start] = 0; heap = {(0, start)};",
    "while (heap not empty) {",
    "    take the cheapest (cost, node); skip it if cost > best[node];",
    "    if (node is the goal) return cost;",
    "    for each neighbour: cost' = combine(cost, edge);  // here: the bigger one",
    "        if (cost' < best[neighbour]) { best = cost'; push it; }",
    "}",
  ],
  complexity: {
    slow: "O(m·n·H)",
    time: "O(m·n·log(m·n))",
    timeWhy: "each box joins the list a few times, and each list step costs log(m·n)",
    space: "O(m·n)",
    spaceWhy: "one steepest-step number per box, plus the list",
  },
  code: CODE,
  examples: [
    { label: "3 × 3 map", input: "[[1,2,2],[3,8,2],[5,3,5]]", expected: "2", note: "The trail with less total climb is the wrong one" },
    { label: "3 × 3 map, gentle", input: "[[1,2,3],[3,8,4],[5,3,5]]", expected: "1" },
    { label: "one row", input: "[[1,10,6,7,9,10,4,9]]", expected: "9" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-743", title: "Network Delay Time" },
    { slug: "lc-787", title: "Cheapest Flights Within K Stops" },
    { slug: "lc-200", title: "Number of Islands" },
  ],
  answer: (input) => String(effortOf(parse(input)).value),
  frames: (input) => {
    const heights = parse(input);
    const best = effortOf(heights);
    return [
      ...pictureFrames(heights),
      ...slowFrames(heights),
      ...insightFrames(heights),
      ...solutionFrames(heights),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(heights), route: { cells: best.route, label: `steepest ${best.value} · total ${best.sum}` } },
      },
    ];
  },
  View: HikerGridView,
};
