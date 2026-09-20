import { OrangesView, type OrangePos, type OrangesState } from "../oranges-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type OrangeFrame = StoryFrame<OrangesState>;

/** Fresh grid for the "your turn" run: two oranges are rotten at the start, and one fresh orange is out of reach. */
const PRACTICE = "[[2,1,1,0],[0,1,0,1],[1,1,2,0]]";

const CODE = [
  "int orangesRotting(int[][] grid) {",
  "    int rows = grid.length, cols = grid[0].length, fresh = 0, minutes = 0;",
  "    Deque<int[]> queue = new ArrayDeque<>();",
  "    for (int r = 0; r < rows; r++)",
  "        for (int c = 0; c < cols; c++) {",
  "            if (grid[r][c] == 2) queue.add(new int[] {r, c});",
  "            if (grid[r][c] == 1) fresh++;",
  "        }",
  "    int[][] sides = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};",
  "    while (fresh > 0 && !queue.isEmpty()) {",
  "        int front = queue.size();   // only the oranges rotten right now",
  "        for (int i = 0; i < front; i++) {",
  "            int[] at = queue.poll();",
  "            for (int[] d : sides) {",
  "                int nr = at[0] + d[0], nc = at[1] + d[1];",
  "                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] != 1) continue;",
  "                grid[nr][nc] = 2;",
  "                fresh--;",
  "                queue.add(new int[] {nr, nc});",
  "            }",
  "        }",
  "        minutes++;",
  "    }",
  "    return fresh == 0 ? minutes : -1;",
  "}",
];
const LINE = { join: 5, countFresh: 6, front: 10, poll: 12, rot: 16, minute: 21, answer: 23, queue: 2 };

const SIDES: OrangePos[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CORNERS: OrangePos[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

function parse(input: string): number[][] {
  const rows = (input.match(/\[[^\[\]]*\]/g) ?? []).map((row) => (row.match(/\d/g) ?? []).map(Number));
  const width = Math.max(1, ...rows.map((row) => row.length));
  const grid = rows.filter((row) => row.length > 0).map((row) => Array.from({ length: width }, (_, c) => row[c] ?? 0));
  return grid.length > 0 ? grid : [[0]];
}

const copy = (grid: number[][]) => grid.map((row) => [...row]);
const where = ([r, c]: OrangePos) => `row ${r + 1}, column ${c + 1}`;
const oranges = (count: number, kind = "fresh ") => `${count} ${kind}orange${count === 1 ? "" : "s"}`;
const all = (grid: number[][], value: number) => grid.flatMap((row, r) => row.flatMap((cell, c): OrangePos[] => (cell === value ? [[r, c]] : [])));

/**
 * Independent solver: the minute in which each orange rots, found by settling the numbers again and again
 * (no waiting line). `Infinity` = rot never gets there.
 */
function rotTimes(grid: number[][]): number[][] {
  const when = grid.map((row) => row.map((cell) => (cell === 2 ? 0 : Infinity)));
  for (let changed = true; changed; ) {
    changed = false;
    grid.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== 1) return;
        const best = Math.min(...SIDES.map(([dr, dc]) => (grid[r + dr]?.[c + dc] ? (when[r + dr][c + dc] ?? Infinity) : Infinity))) + 1;
        if (best < when[r][c]) {
          when[r][c] = best;
          changed = true;
        }
      }),
    );
  }
  return when;
}

function solve(grid: number[][]): number {
  const when = rotTimes(grid);
  const times = all(grid, 1).map(([r, c]) => when[r][c]);
  return times.includes(Infinity) ? -1 : Math.max(0, ...times);
}

const outOfReach = (grid: number[][]) => {
  const when = rotTimes(grid);
  return all(grid, 1).filter(([r, c]) => when[r][c] === Infinity);
};

function show(grid: number[][], extra: Partial<OrangesState> = {}): OrangesState {
  return { grid: copy(grid), minutes: null, fresh: null, ...extra };
}

function pictureFrames(grid: number[][]): OrangeFrame[] {
  const frames: OrangeFrame[] = [
    { scene: "picture", caption: "A box of oranges, seen from above. Some oranges are fresh, some are rotten, and some places are empty.", state: show(grid) },
  ];
  const source = all(grid, 2).find(([r, c]) => SIDES.some(([dr, dc]) => grid[r + dr]?.[c + dc] === 1));
  if (source) {
    const [r, c] = source;
    const touched = SIDES.map(([dr, dc]): OrangePos => [r + dr, c + dc]).filter(([nr, nc]) => grid[nr]?.[nc] === 1);
    frames.push({
      scene: "picture",
      caption: "Each minute, a rotten orange rots the fresh oranges that share a side with it: up, down, left or right.",
      state: show(grid, { front: [source], mark: { cells: touched, tone: "teal" } }),
    });
    const corner = CORNERS.map(([dr, dc]): OrangePos => [r + dr, c + dc]).find(([nr, nc]) => grid[nr]?.[nc] === 1);
    if (corner) {
      frames.push({
        scene: "picture",
        caption: "Rot never jumps across a corner, and it never crosses an empty place. This orange is safe for now.",
        state: show(grid, { front: [source], mark: { cells: [corner], tone: "coral" } }),
      });
    }
  }
  frames.push({
    scene: "picture",
    caption: "The goal: how many minutes pass until no fresh orange is left? If some orange can never rot, the answer is -1.",
    state: show(grid, { fresh: all(grid, 1).length }),
  });
  return frames;
}

/** Slow but correct: every minute, read the WHOLE grid again and spread from whatever was rotten when the minute began. */
function slowFrames(gridInput: number[][]): { frames: OrangeFrame[]; read: number } {
  const frames: OrangeFrame[] = [];
  let grid = copy(gridInput);
  let read = 0;
  let readings = 0;
  for (let rotted = true; rotted; ) {
    rotted = false;
    readings++;
    const next = copy(grid);
    const newly: OrangePos[] = [];
    grid.forEach((row, r) =>
      row.forEach((cell, c) => {
        read++;
        if (cell !== 2) return;
        for (const [dr, dc] of SIDES) {
          if (next[r + dr]?.[c + dc] === 1) {
            next[r + dr][c + dc] = 2;
            newly.push([r + dr, c + dc]);
            rotted = true;
          }
        }
      }),
    );
    grid = next;
    if (readings <= 2) {
      frames.push({
        scene: "slow",
        caption:
          readings === 1
            ? "The slow way: each minute, read every place in the grid again. Wherever a rotten orange sits, rot the fresh ones that touch it."
            : `Next minute: read all ${plainCount(gridInput)} places again, although only the newest rot can spread any further.`,
        state: show(grid, { newly, counter: { label: "places read", value: read } }),
      });
    }
  }
  frames.push({
    scene: "slow",
    caption:
      readings === 1
        ? "Here one reading is enough, because nothing can rot. But when rot creeps along a long row, there is one full reading per minute: O((m·n)²) time."
        : `It took ${readings} full readings: ${read} places read in a grid of ${plainCount(gridInput)}. The last reading only found that nothing changed. This is O((m·n)²) time.`,
    state: show(grid, { counter: { label: "places read", value: read } }),
  });
  return { frames, read };
}

const plainCount = (grid: number[][]) => grid.length * grid[0].length;

type Wave = { front: OrangePos[]; spreads: { from: OrangePos; rots: OrangePos[] }[]; newly: OrangePos[] };

/** One minute of the real algorithm: everything in the front spreads once. Mutates `grid`. */
function spreadOnce(grid: number[][], front: OrangePos[]): Wave {
  const spreads = front.map((from) => {
    const rots: OrangePos[] = [];
    for (const [dr, dc] of SIDES) {
      const nr = from[0] + dr;
      const nc = from[1] + dc;
      if (grid[nr]?.[nc] === 1) {
        grid[nr][nc] = 2;
        rots.push([nr, nc]);
      }
    }
    return { from, rots };
  });
  return { front, spreads, newly: spreads.flatMap((spread) => spread.rots) };
}

/** The mistake, really run: the front is NOT fixed, so an orange that rots may spread in the very same minute. */
function chainRun(gridInput: number[][], front: OrangePos[]): { grid: number[][]; chain: [OrangePos, OrangePos][] } {
  const grid = copy(gridInput);
  const queue = [...front];
  const chain: [OrangePos, OrangePos][] = [];
  for (let index = 0; index < queue.length; index++) {
    const wave = spreadOnce(grid, [queue[index]]);
    for (const to of wave.newly) {
      chain.push([queue[index], to]);
      queue.push(to);
    }
  }
  return { grid, chain };
}

function insightFrames(gridInput: number[][]): OrangeFrame[] {
  const grid = copy(gridInput);
  const start = all(grid, 2);
  const fresh = all(grid, 1).length;
  const frames: OrangeFrame[] = [
    {
      scene: "insight",
      caption: "Picture a wave. All rotten oranges push it outwards together, at the same moment, like rings from stones dropped into a pond.",
      state: show(grid, { front: start, minutes: 0, fresh }),
    },
  ];
  const wave = spreadOnce(grid, start);
  frames.push({
    scene: "insight",
    caption:
      wave.newly.length > 0
        ? `One minute, one step: every fresh orange that touches the front of the wave rots. Here that is ${wave.newly.length}.`
        : "One minute, one step: every fresh orange that touches the front of the wave rots. Here none touches it, so the wave cannot move.",
    state: show(grid, { front: start, newly: wave.newly, minutes: wave.newly.length > 0 ? 1 : 0, fresh: fresh - wave.newly.length }),
  });
  frames.push({
    scene: "insight",
    caption:
      wave.newly.length > 0
        ? "The oranges that just rotted become the new front. Count the waves until no fresh orange is left: that is the number of minutes."
        : "When a wave does move, the oranges it rots become the new front. Count the waves: that is the number of minutes.",
    state: show(grid, { front: wave.newly, minutes: wave.newly.length > 0 ? 1 : 0, fresh: fresh - wave.newly.length }),
  });
  return frames;
}

function cellFeedback(grid: number[][], answer: number, freshText: (r: number, c: number) => string): Record<number, string> {
  const feedback: Record<number, string> = {};
  const cols = grid[0].length;
  grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      const index = r * cols + c;
      if (index === answer) return;
      feedback[index] = cell === 0 ? "That place is empty. There is no orange in it." : cell === 2 ? "That orange is already rotten." : freshText(r, c);
    }),
  );
  return feedback;
}

function neverRotQuiz(grid: number[][], stuck: OrangePos): StoryQuiz {
  const answer = stuck[0] * grid[0].length + stuck[1];
  return {
    kind: "cell",
    cells: plainCount(grid),
    question: "Before the wave starts: one fresh orange here can never rot. Which one? Click it.",
    answer,
    feedback: cellFeedback(grid, answer, () => "Rot can get to that one. Follow the oranges side by side, back to a rotten one."),
    otherwise: "Look for a fresh orange with no orange on any of its sides.",
    why: "It has only empty places or the edge beside it. No wave can ever touch its side.",
  };
}

function oneRotsQuiz(grid: number[][], front: OrangePos[], target: OrangePos, minute: number): StoryQuiz {
  const answer = target[0] * grid[0].length + target[1];
  const inFront = (r: number, c: number) => front.some(([fr, fc]) => fr === r && fc === c);
  return {
    kind: "cell",
    cells: plainCount(grid),
    question: `Minute ${minute} begins. Exactly one fresh orange rots in this minute. Which one? Click it.`,
    answer,
    feedback: cellFeedback(grid, answer, (r, c) =>
      CORNERS.some(([dr, dc]) => inFront(r + dr, c + dc))
        ? "Only a corner of it touches the front. Rot moves up, down, left and right, never across a corner."
        : "That orange is fresh, but no orange of the front touches its side yet. It has to wait.",
    ),
    otherwise: "Look for a fresh orange that shares a side with the front of the wave.",
    why: "It shares a side with an orange of the front. No other fresh orange does.",
  };
}

function howManyQuiz(correct: number, chained: number, fresh: number, minute: number): StoryQuiz {
  const numbers = [...new Set([correct, chained, correct + 1, correct - 1, fresh])].filter((value) => value >= 0).slice(0, 4).sort((a, b) => a - b);
  return {
    kind: "choice",
    question: `Minute ${minute} begins. How many fresh oranges rot in this minute?`,
    options: numbers.map(String),
    answer: numbers.indexOf(correct),
    why:
      correct === 0
        ? "No fresh orange shares a side with the front, so nothing can rot."
        : "Only the fresh oranges that touch the front right now. An orange that rots in this minute must wait for the next minute before it spreads.",
  };
}

/**
 * The real algorithm. `practice` reuses it on a fresh grid: one frame per minute,
 * and the reader predicts every wave.
 */
function solutionFrames(gridInput: number[][], slowRead: number, scene: SceneId = "solution", practice = false): OrangeFrame[] {
  const frames: OrangeFrame[] = [];
  const grid = copy(gridInput);
  const line = (index: number) => (practice ? undefined : index);
  const stuck = outOfReach(gridInput);
  const stuckMark = stuck.length > 0 ? { cells: stuck, tone: "coral" as const } : null;
  let queue = all(grid, 2);
  let fresh = all(grid, 1).length;
  let minutes = 0;
  let read = plainCount(grid);
  let longest = [...queue];
  let asked = { count: false, one: false };
  let trapShown = false;
  let showStuck = false;
  const base = (extra: Partial<OrangesState> = {}) => show(grid, { minutes, fresh, mark: showStuck ? stuckMark : null, ...extra });
  const last = () => frames[frames.length - 1];

  if (practice) {
    frames.push({
      scene,
      caption: `Your turn, on a new box of oranges. ${oranges(queue.length, "")} ${queue.length === 1 ? "is" : "are"} rotten at the start. You predict every wave.`,
      state: base({ front: queue }),
    });
  } else {
    frames.push({
      scene,
      caption:
        queue.length > 0
          ? `Read the grid once. Every orange that is rotten now joins a waiting line. Here that is ${oranges(queue.length, "")}: the first front of the wave.`
          : "Read the grid once. No orange is rotten, so the waiting line stays empty and no wave can start.",
      codeLine: LINE.join,
      state: show(grid, { minutes, fresh: null, front: queue }),
    });
    frames.push({
      scene,
      caption: fresh > 0 ? `On the way, count the fresh oranges: ${fresh}. The wave has to get to every one of them.` : "On the way, count the fresh oranges. There is not a single one.",
      codeLine: LINE.countFresh,
      state: base({ front: queue }),
    });
  }
  if (stuck.length === 1 && queue.length > 0) {
    last().quiz = neverRotQuiz(grid, stuck[0]);
    showStuck = true;
    frames.push({
      scene,
      caption: `The orange at ${where(stuck[0])} has no orange on any side. No wave can touch it. Keep an eye on what that does to the answer.`,
      codeLine: line(LINE.answer),
      state: base({ front: queue }),
    });
  }

  while (fresh > 0 && queue.length > 0) {
    const front = queue;
    const before = copy(grid);
    const freshBefore = fresh;
    const wave = spreadOnce(grid, front);
    const chained = chainRun(before, front);
    const minute = minutes + 1;
    read += front.length;
    // The line at its longest: the part of the front still waiting, plus everything that has rotted so far this minute.
    wave.spreads.forEach((_, index) => {
      const waiting = [...front.slice(index + 1), ...wave.spreads.slice(0, index + 1).flatMap((spread) => spread.rots)];
      if (waiting.length > longest.length) longest = waiting;
    });

    const quiz = wave.newly.length === 1 ? oneRotsQuiz(before, front, wave.newly[0], minute) : howManyQuiz(wave.newly.length, chained.chain.length, freshBefore, minute);
    const kind = wave.newly.length === 1 ? "one" : "count";

    if (practice) {
      last().quiz = quiz;
      minutes = minute;
      fresh -= wave.newly.length;
      frames.push({
        scene,
        caption:
          wave.newly.length > 0
            ? `Minute ${minute}: ${oranges(wave.newly.length)} ${wave.newly.length === 1 ? "rots" : "rot"}, each one touching the front. They are the next front. Fresh left: ${fresh}.`
            : `Minute ${minute}: nothing rots. The front touches no fresh orange, so the wave dies out.`,
        state: base({ front, newly: wave.newly }),
      });
      queue = wave.newly;
      continue;
    }

    frames.push({
      scene,
      caption: `Minute ${minute} begins. The front of the wave is fixed now: ${oranges(front.length, "rotten ")}. Only ${front.length === 1 ? "this one spreads" : "these spread"} in this minute.`,
      codeLine: LINE.front,
      state: { ...show(before, { minutes, fresh, front }), mark: showStuck ? stuckMark : null },
      quiz: asked[kind] ? undefined : quiz,
    });
    asked = { ...asked, [kind]: true };

    // One frame per orange of the front that really rots something (first two minutes), then one frame per wave.
    const during = copy(before);
    const soFar: OrangePos[] = [];
    const active = wave.spreads.filter((spread) => spread.rots.length > 0);
    if (minute <= 2) {
      for (const spread of active) {
        for (const [r, c] of spread.rots) during[r][c] = 2;
        soFar.push(...spread.rots);
        fresh -= spread.rots.length;
        frames.push({
          scene,
          caption: `The rotten orange at ${where(spread.from)} touches ${oranges(spread.rots.length)}. ${spread.rots.length === 1 ? "It rots and joins" : "They rot and join"} the end of the line.`,
          codeLine: LINE.rot,
          state: { ...show(during, { minutes, fresh, front, newly: [...soFar] }), mark: showStuck ? stuckMark : null },
        });
      }
    } else if (active.length > 0) {
      fresh -= wave.newly.length;
      frames.push({
        scene,
        caption: `The front spreads: ${oranges(wave.newly.length)} ${wave.newly.length === 1 ? "touches it and rots" : "touch it and rot"}.`,
        codeLine: LINE.rot,
        state: base({ front, newly: wave.newly }),
      });
    }
    minutes = minute;
    frames.push({
      scene,
      caption:
        wave.newly.length > 0
          ? `The whole front has spread, so minute ${minute} is over. The ${wave.newly.length === 1 ? "orange" : `${wave.newly.length} oranges`} that just rotted will be the next front. Fresh left: ${fresh}.`
          : `The front touches no fresh orange. Nothing rots in minute ${minute}, and the wave dies out.`,
      codeLine: LINE.minute,
      state: base({ newly: wave.newly }),
    });

    if (!trapShown && chained.chain.length > wave.newly.length) {
      trapShown = true;
      frames.push({
        scene,
        caption: `Why fix the front first? Suppose an orange that rots could spread at once. Then rot runs from orange to orange: ${chained.chain.length} rot inside minute ${minute}.`,
        codeLine: LINE.front,
        state: show(chained.grid, { minutes: minute, fresh: freshBefore - chained.chain.length, wrong: true, chain: chained.chain, front }),
      });
      frames.push({
        scene,
        caption: `The Sequential Infection Trap: a whole chain rots in one minute, when really only ${wave.newly.length} could. The minute count comes out too small.`,
        codeLine: LINE.front,
        state: show(chained.grid, { minutes: minute, fresh: freshBefore - chained.chain.length, wrong: true, chain: chained.chain, front, newly: chained.chain.map(([, to]) => to) }),
      });
      frames.push({
        scene,
        caption: `So new rot waits at the end of the line. Back to the true picture after minute ${minute}: its turn comes with the next wave.`,
        codeLine: LINE.front,
        state: base({ newly: wave.newly }),
      });
    }

    queue = wave.newly;
  }

  showStuck = true;
  const ending =
    fresh > 0
      ? queue.length === 0 && minutes === 0 && all(gridInput, 2).length === 0
        ? `No wave ever started, and ${oranges(fresh)} ${fresh === 1 ? "is" : "are"} still there. The answer is -1.`
        : `The wave has died out, but ${oranges(fresh)} ${fresh === 1 ? "is" : "are"} left, out of reach. So the answer is -1.`
      : minutes === 0
        ? "There was no fresh orange to begin with, so nothing had to rot and no minute is needed. The answer is 0."
        : `No fresh orange is left. The wave needed ${minutes} ${minutes === 1 ? "minute" : "minutes"}. The answer is ${minutes}.`;
  frames.push({ scene, caption: practice ? `${ending} You predicted every wave yourself.` : ending, codeLine: line(LINE.answer), state: base() });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(m·n), for m rows and n columns. Each place is read once at the start, and each rotten orange steps up in the line once: ${read} places read${slowRead > read ? `, not ${slowRead}` : ""}.`,
      codeLine: LINE.poll,
      state: base({ counter: { label: "places read", value: read } }),
    });
    frames.push({
      scene,
      caption: `Space: O(m·n). The waiting line holds the front of the wave. Here it held ${oranges(longest.length, "")} at most; in a grid full of rotten oranges it holds every place.`,
      codeLine: LINE.queue,
      state: base({ front: longest }),
    });
  }
  return frames;
}

export const rottingOrangesStory: ProblemStory<OrangesState> = {
  slugs: ["lc-994"],
  pattern: "Spreading from many starts at once, wave by wave",
  trigger: "something spreads through a grid step by step, and you are asked “how long until it is everywhere?”",
  insight: "All rotten oranges push one wave outwards together. Fix the front, let only the front spread, and count one minute per wave.",
  metaphor: {
    name: "The wave",
    legend: "waiting line = queue · front of the wave = the first queue.size() oranges · one wave = one minutes++",
    terms: ["wave", "front", "rot", "fresh", "minute"],
  },
  traps: [
    {
      name: "The Sequential Infection Trap",
      rule: "Fix the front before spreading: int front = queue.size(). An orange that rots in this minute must wait for the next one, or rot runs through a whole chain in a single minute.",
    },
  ],
  template: [
    "put EVERY starting point in the queue; count what is still untouched;",
    "while (something untouched && queue not empty) {",
    "    front = queue.size();          // fix this wave",
    "    repeat front times:",
    "        take one from the queue; mark its untouched neighbours and add them;",
    "    steps++;",
    "}",
    "return nothing untouched ? steps : -1;",
  ],
  complexity: {
    slow: "O((m·n)²)",
    time: "O(m·n)",
    timeWhy: "each place is read once, and each orange joins and leaves the waiting line at most once",
    space: "O(m·n)",
    spaceWhy: "the waiting line holds the front of the wave; in the worst case that is every place",
  },
  code: CODE,
  examples: [
    { label: "[[2,1,1],[1,1,0],[0,1,1]]", input: "[[2,1,1],[1,1,0],[0,1,1]]", expected: "4" },
    { label: "[[2,1,1],[0,1,1],[1,0,1]]", input: "[[2,1,1],[0,1,1],[1,0,1]]", expected: "-1", note: "One orange is out of reach" },
    { label: "[[0,2]]", input: "[[0,2]]", expected: "0", note: "Nothing fresh to begin with" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-286", title: "Walls and Gates" },
    { slug: "lc-542", title: "01 Matrix" },
    { slug: "lc-200", title: "Number of Islands" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const grid = parse(input);
    const slow = slowFrames(grid);
    const stuck = outOfReach(grid);
    const after = copy(grid);
    const firstWave = spreadOnce(after, all(grid, 2));
    return [
      ...pictureFrames(grid),
      ...slow.frames,
      ...insightFrames(grid),
      ...solutionFrames(grid, slow.read),
      ...solutionFrames(parse(PRACTICE), 0, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: show(after, {
          front: firstWave.front,
          newly: firstWave.newly,
          mark: stuck.length > 0 ? { cells: stuck, tone: "coral" } : null,
          minutes: firstWave.newly.length > 0 ? 1 : 0,
          fresh: all(after, 1).length,
        }),
      },
    ];
  },
  View: OrangesView,
};
