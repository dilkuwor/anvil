import { GridMatrixView, type GridCellKind, type GridMatrixState, type GridPos } from "../grid-matrix-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type GridFrame = StoryFrame<GridMatrixState>;

/** Fresh map for the "your turn" run: three islands, and one that only touches another at a corner. */
const PRACTICE = "1101,1001,0010";

const CODE = [
  "int numIslands(char[][] grid) {",
  "    int rows = grid.length, cols = grid[0].length, islands = 0;",
  "    for (int r = 0; r < rows; r++) {",
  "        for (int c = 0; c < cols; c++) {",
  "            if (grid[r][c] == '1') {",
  "                islands++;",
  "                sink(grid, r, c);",
  "            }",
  "        }",
  "    }",
  "    return islands;",
  "}",
  "",
  "void sink(char[][] grid, int r, int c) {",
  "    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') return;",
  "    grid[r][c] = '0';   // mark it water FIRST",
  "    sink(grid, r + 1, c);",
  "    sink(grid, r - 1, c);",
  "    sink(grid, r, c + 1);",
  "    sink(grid, r, c - 1);",
  "}",
];
const LINE = { start: 1, scan: 3, isLand: 4, count: 5, callSink: 6, done: 10, mark: 15, spread: 16 };

/** Same order as the four `sink` calls in the Java: below, above, right, left. */
const SIDES: { move: GridPos; word: string }[] = [
  { move: [1, 0], word: "below" },
  { move: [-1, 0], word: "above" },
  { move: [0, 1], word: "to the right" },
  { move: [0, -1], word: "to the left" },
];

function parse(input: string): boolean[][] {
  const rows = input
    .split(/[\n,]/)
    .map((row) => row.replace(/[^01]/g, ""))
    .filter((row) => row.length > 0);
  const width = Math.max(1, ...rows.map((row) => row.length));
  const land = rows.map((row) => Array.from({ length: width }, (_, c) => row[c] === "1"));
  return land.length > 0 ? land : [[false]];
}

const where = ([r, c]: GridPos) => `row ${r + 1}, column ${c + 1}`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : (word.endsWith("x") ? "es" : "s")}`;

/** Independent solver: label every island with a plain loop and a to-do list. */
function labelIslands(land: boolean[][]): { count: number; id: number[][] } {
  const id = land.map((row) => row.map(() => -1));
  let count = 0;
  for (let r = 0; r < land.length; r++) {
    for (let c = 0; c < land[0].length; c++) {
      if (!land[r][c] || id[r][c] !== -1) continue;
      const todo: GridPos[] = [[r, c]];
      id[r][c] = count;
      while (todo.length > 0) {
        const [cr, cc] = todo.pop()!;
        for (const { move } of SIDES) {
          const nr = cr + move[0];
          const nc = cc + move[1];
          if (land[nr]?.[nc] && id[nr][nc] === -1) {
            id[nr][nc] = count;
            todo.push([nr, nc]);
          }
        }
      }
      count++;
    }
  }
  return { count, id };
}

type SunkStep = { cell: GridPos; side: number | null };

/** The Java `sink`, run for real: the order boxes go under, and the longest path the search had to remember. */
function sinkIsland(left: boolean[][], start: GridPos): { order: SunkStep[]; longest: GridPos[] } {
  const order: SunkStep[] = [];
  const path: GridPos[] = [];
  let longest: GridPos[] = [];
  const sink = (r: number, c: number, side: number | null) => {
    if (!left[r]?.[c]) return;
    left[r][c] = false;
    order.push({ cell: [r, c], side });
    path.push([r, c]);
    if (path.length > longest.length) longest = [...path];
    SIDES.forEach(({ move }, index) => sink(r + move[0], c + move[1], index));
    path.pop();
  };
  sink(start[0], start[1], null);
  return { order, longest };
}

/** The same search WITHOUT the "water first" line: walk until it starts going back and forth, then a few hops more. */
function bounceTrail(land: boolean[][], start: GridPos): { reach: number; trail: GridPos[] } | null {
  const trail: GridPos[] = [start];
  for (let hop = 0; hop < 40; hop++) {
    const [r, c] = trail[trail.length - 1];
    const side = SIDES.find(({ move }) => land[r + move[0]]?.[c + move[1]]);
    if (!side) return null;
    trail.push([r + side.move[0], c + side.move[1]]);
    const back = trail[trail.length - 3];
    const now = trail[trail.length - 1];
    if (back && back[0] === now[0] && back[1] === now[1]) {
      // `reach` = how many boxes the walk had seen before it first stepped back.
      const reach = trail.length - 1;
      const [a, b] = [trail[trail.length - 1], trail[trail.length - 2]];
      return { reach, trail: [...trail, b, a, b] };
    }
  }
  return null;
}

function view(original: boolean[][], left: boolean[][], extra: Partial<GridMatrixState> = {}): GridMatrixState {
  const cells = original.map((row, r) => row.map((wasLand, c): GridCellKind => (!wasLand ? "water" : left[r][c] ? "land" : "sunk")));
  return { cells, cursor: null, islands: null, ...extra };
}

const copy = (land: boolean[][]) => land.map((row) => [...row]);

function pictureFrames(land: boolean[][]): GridFrame[] {
  const { count, id } = labelIslands(land);
  const cellsOf = (island: number) => land.flatMap((row, r) => row.flatMap((_, c): GridPos[] => (id[r][c] === island ? [[r, c]] : [])));
  const frames: GridFrame[] = [{ scene: "picture", caption: "This is a map seen from above. A box with 1 is land. A box with 0 is water.", state: view(land, land) }];
  if (count > 0) {
    const first = cellsOf(0);
    frames.push({
      scene: "picture",
      caption:
        first.length === 1
          ? "This land box has water on every side. It is an island all on its own."
          : `Land boxes that touch side by side, or one above the other, belong together. These ${first.length} boxes are one island.`,
      state: view(land, land, { mark: { cells: first, tone: "teal" } }),
    });
  }
  // Two land boxes that meet only at a corner and belong to different islands.
  let corner: GridPos[] | null = null;
  for (let r = 0; r + 1 < land.length && !corner; r++) {
    for (let c = 0; c < land[0].length && !corner; c++) {
      for (const dc of [-1, 1]) {
        if (land[r][c] && land[r + 1][c + dc] && id[r][c] !== id[r + 1][c + dc]) corner = [[r, c], [r + 1, c + dc]];
      }
    }
  }
  if (corner) {
    frames.push({
      scene: "picture",
      caption: "Touching only at a corner does not count. These two boxes belong to two different islands.",
      state: view(land, land, { mark: { cells: corner, tone: "coral" } }),
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: count the islands. This map has ${plural(count, "island")}.`,
    state: view(land, land, { islands: count }),
  });
  return frames;
}

/** Slow but correct: from EVERY land box, walk its whole island to find the island's first box (its name). Count the names. */
function slowFrames(land: boolean[][]): { frames: GridFrame[]; walked: number } {
  const frames: GridFrame[] = [];
  const names = new Set<number>();
  const cols = land[0].length;
  let walked = 0;
  let landBoxes = 0;
  let lastName = -1;
  for (let r = 0; r < land.length; r++) {
    for (let c = 0; c < cols; c++) {
      if (!land[r][c]) continue;
      landBoxes++;
      const seen = new Set<number>([r * cols + c]);
      const todo: GridPos[] = [[r, c]];
      const island: GridPos[] = [];
      while (todo.length > 0) {
        const [cr, cc] = todo.pop()!;
        island.push([cr, cc]);
        walked++;
        for (const { move } of SIDES) {
          const nr = cr + move[0];
          const nc = cc + move[1];
          if (land[nr]?.[nc] && !seen.has(nr * cols + nc)) {
            seen.add(nr * cols + nc);
            todo.push([nr, nc]);
          }
        }
      }
      const name = Math.min(...seen);
      names.add(name);
      if (landBoxes <= 3) {
        const again = name === lastName;
        frames.push({
          scene: "slow",
          caption:
            landBoxes === 1
              ? "The slow way: stand on a land box and walk its whole island to find the island's first box. That first box is the island's name."
              : again
                ? `${landBoxes === 2 ? "Now" : "And again from"} the next land box. We walk the whole island once more, only to learn it has the same name.`
                : `${landBoxes === 2 ? "Now" : "And again from"} the next land box. We walk its whole island to find its name.`,
          state: view(land, land, {
            cursor: [r, c],
            wave: island,
            waveLabel: "walked this time",
            mark: { cells: [[Math.floor(name / cols), name % cols]], tone: "teal" },
            counter: { label: "land boxes walked", value: walked },
          }),
        });
      }
      lastName = name;
    }
  }
  frames.push({
    scene: "slow",
    caption:
      landBoxes === 0
        ? "The slow way would walk an island from every land box. This map has no land, so there is nothing to walk."
        : `At the end we count the different names: ${names.size}. But that took ${walked} boxes walked for only ${plural(landBoxes, "land box")}. On big maps this is O((m·n)²) time.`,
    state: view(land, land, { counter: { label: "land boxes walked", value: walked } }),
  });
  return { frames, walked };
}

function firstLand(left: boolean[][], after: GridPos | null = null): GridPos | null {
  const cols = left[0].length;
  const from = after ? after[0] * cols + after[1] + 1 : 0;
  for (let index = from; index < left.length * cols; index++) {
    if (left[Math.floor(index / cols)][index % cols]) return [Math.floor(index / cols), index % cols];
  }
  return null;
}

function insightFrames(land: boolean[][]): GridFrame[] {
  const start = firstLand(land);
  const frames: GridFrame[] = [
    {
      scene: "insight",
      caption: "Picture the sinking island. The scan reads the map like a page: left to right, top to bottom.",
      state: view(land, land, { cursor: [0, 0], islands: 0 }),
    },
  ];
  if (!start) {
    frames.push({ scene: "insight", caption: "Each time the scan steps on land, that is a new island, and the whole island sinks at once. Here the scan never meets land.", state: view(land, land, { islands: 0 }) });
    return frames;
  }
  const left = copy(land);
  const { order } = sinkIsland(left, start);
  frames.push({
    scene: "insight",
    caption: `At ${where(start)} the scan steps on land for the first time. That is a new island, so we count 1.`,
    state: view(land, land, { cursor: start, islands: 1 }),
  });
  frames.push({
    scene: "insight",
    caption: `At once the whole island sinks under water, all ${plural(order.length, "box")} of it. Any land the scan meets later must be a new island.`,
    state: view(land, left, { cursor: start, islands: 1 }),
  });
  return frames;
}

function nextLandQuiz(original: boolean[][], left: boolean[][], answer: GridPos, first: boolean): StoryQuiz {
  const cols = original[0].length;
  const target = answer[0] * cols + answer[1];
  const feedback: Record<number, string> = {};
  for (let index = 0; index < original.length * cols; index++) {
    if (index === target) continue;
    const r = Math.floor(index / cols);
    const c = index % cols;
    feedback[index] = !original[r][c]
      ? "That box is water. The scan only stops on land."
      : !left[r][c]
        ? "That land already sank with an island we counted. It reads as water now."
        : "That is new land, but the scan meets other new land before it. Read row by row from the top.";
  }
  return {
    kind: "cell",
    cells: original.length * cols,
    question: first ? "Where does the scan step on land first? Click that box." : "The scan reads on, row by row. Where does it step on new land next? Click that box.",
    answer: target,
    feedback,
    otherwise: "Read the rows like a page and stop at the first box that is still land.",
    why: first ? "Reading row by row from the top-left, this is the first land box. A new island starts here." : "Every older island is under water, so the first land the scan meets now must be a new island.",
  };
}

const MARK_FIRST: StoryQuiz = {
  kind: "choice",
  question: "The island must sink now. What happens to this box first?",
  options: ["The search looks at its neighbours", "It turns to water"],
  answer: 1,
  why: "Water first. Otherwise the neighbour sees land here and sends the search straight back: the Infinite Bounce Trap.",
};

const COUNT_TWICE: StoryQuiz = {
  kind: "choice",
  question: "Soon the scan reaches another box of this same island. Does it count a new island there?",
  options: ["Yes, that box was land", "No, that box reads water now"],
  answer: 1,
  why: "The box sank, so the scan reads water. That is the point of sinking: one island, one count.",
};

/**
 * The real algorithm. `practice` reuses it on a fresh map: fewer frames, and the reader
 * finds every island and makes the "water first" call.
 */
function solutionFrames(land: boolean[][], slowWalked: number, scene: SceneId = "solution", practice = false): GridFrame[] {
  const frames: GridFrame[] = [];
  const left = copy(land);
  const line = (index: number) => (practice ? undefined : index);
  let islands = 0;
  let sunkBoxes = 0;
  let cursor: GridPos | null = null;
  let longest: GridPos[] = [];
  let trapShown = false;
  let detailShown = false;
  let askedTwice = false;
  let askedMark = false;

  const first = firstLand(left);
  frames.push({
    scene,
    caption: practice
      ? "Your turn, on a new map. You point to where the scan finds each new island, and you decide how it sinks."
      : "The scan starts at the top-left box and reads row by row. No island is counted yet.",
    codeLine: line(LINE.start),
    state: view(land, left, { islands: 0 }),
    quiz: first ? nextLandQuiz(land, left, first, true) : undefined,
  });

  for (let found = first; found; found = firstLand(left, found)) {
    const before = copy(left);
    const sunk = sinkIsland(left, found);
    const size = sunk.order.length;
    if (sunk.longest.length > longest.length) longest = sunk.longest;
    islands++;
    sunkBoxes += size;
    cursor = found;
    const more = firstLand(left, found);

    if (practice) {
      const ask = !askedMark && size > 1;
      if (ask) askedMark = true;
      frames.push({ scene, caption: `New land at ${where(found)}. Islands counted: ${islands}.`, state: view(land, before, { cursor, islands }), quiz: ask ? MARK_FIRST : undefined });
      frames.push({
        scene,
        caption:
          size === 1
            ? "This island is a single box. It turns to water, and the island is gone."
            : ask
              ? `The box turns to water first, then the sinking spreads to all land that touches. ${plural(size, "box")} go under.`
              : `This island sinks the same way, water first. ${plural(size, "box")} go under.`,
        state: view(land, left, { cursor, islands, wave: sunk.order.map((step) => step.cell) }),
        quiz: more ? nextLandQuiz(land, left, more, false) : undefined,
      });
      continue;
    }

    frames.push({
      scene,
      caption: `The scan steps on land at ${where(found)}. ${islands === 1 ? "It is new land." : "Every older island is under water, so this is new land."}`,
      codeLine: LINE.isLand,
      state: view(land, before, { cursor, islands: islands - 1 }),
    });
    frames.push({ scene, caption: `New land means a new island. Islands counted: ${islands}.`, codeLine: LINE.count, state: view(land, before, { cursor, islands }) });

    const bounce = !trapShown && size > 1 ? bounceTrail(before, found) : null;
    if (bounce) {
      trapShown = true;
      frames.push({
        scene,
        caption: "Now this island must sink. One rule: a box turns to water before the search looks around it. See what goes wrong without that rule.",
        codeLine: LINE.callSink,
        state: view(land, before, { cursor, islands, wave: [found] }),
      });
      frames.push({
        scene,
        caption: "Suppose the search forgets to mark. It walks from this land box to the land that touches it.",
        codeLine: LINE.mark,
        state: view(land, before, { cursor, islands, trail: bounce.trail.slice(0, bounce.reach), counter: { label: "steps", value: bounce.reach - 1 } }),
      });
      frames.push({
        scene,
        caption: "The box it just left still says land. So the search steps back onto it.",
        codeLine: LINE.mark,
        state: view(land, before, { cursor, islands, trail: bounce.trail.slice(0, bounce.reach + 1), counter: { label: "steps", value: bounce.reach } }),
      });
      frames.push({
        scene,
        caption: "The Infinite Bounce Trap: two land boxes send the search back and forth, and it never ends. No island ever sinks.",
        codeLine: LINE.mark,
        state: view(land, before, { cursor, islands, trail: bounce.trail, counter: { label: "steps, and still going", value: bounce.trail.length - 1 } }),
      });
    }

    if (!detailShown) {
      detailShown = true;
      const shown = sunk.order.slice(0, 3);
      const during = copy(before);
      shown.forEach(({ cell, side }, index) => {
        during[cell[0]][cell[1]] = false;
        const last = index === shown.length - 1 && size === shown.length;
        frames.push({
          scene,
          caption:
            side === null
              ? `${bounce ? "So we do it right. " : "Now the island must sink. "}This box turns to water first, before the search looks around.${last ? " It was the whole island." : ""}`
              : index === 1
                ? `Then the search looks ${SIDES[side].word} and finds land. That box turns to water too.${last ? " Now the island is gone." : ""}`
                : `From there it looks ${SIDES[side].word} and finds more land. Under it goes.${last ? " Now the island is gone." : ""}`,
          codeLine: side === null ? LINE.mark : LINE.spread + side,
          state: view(land, during, { cursor, islands, wave: [cell] }),
        });
      });
      if (size > shown.length) {
        frames.push({
          scene,
          caption: `The sinking spreads the same way to every land box that touches. ${size - shown.length} more ${size - shown.length === 1 ? "goes" : "go"} under, and the island is gone.`,
          codeLine: LINE.spread,
          state: view(land, left, { cursor, islands, wave: sunk.order.slice(shown.length).map((step) => step.cell) }),
        });
      }
    } else {
      frames.push({
        scene,
        caption: size === 1 ? "This island is a single box. It turns to water, and the island is gone." : `The whole island sinks, box after touching box. ${plural(size, "box")} go under.`,
        codeLine: LINE.callSink,
        state: view(land, left, { cursor, islands, wave: sunk.order.map((step) => step.cell) }),
      });
    }

    // The scan will walk over this island's other boxes. Do they count again?
    const nextOld = firstLand(land, found);
    if (!askedTwice && nextOld && !left[nextOld[0]][nextOld[1]]) {
      askedTwice = true;
      frames.push({ scene, caption: "The island is under water. The scan reads on from where it stopped.", codeLine: LINE.scan, state: view(land, left, { cursor, islands }), quiz: COUNT_TWICE });
      cursor = nextOld;
      frames.push({
        scene,
        caption: `At ${where(nextOld)} the scan reads water, because this box sank with its island. The scan walks on, and no island is counted twice.`,
        codeLine: LINE.isLand,
        state: view(land, left, { cursor, islands }),
      });
    }
  }

  frames.push({
    scene,
    caption: practice
      ? `The scan reaches the last box and finds no more land. The answer is ${islands}. You found every island yourself.`
      : `The scan reaches the last box. Each island was counted once, when the scan first stepped on its land. The answer is ${islands}.`,
    codeLine: line(LINE.done),
    state: view(land, left, { islands }),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(m·n), for a map of m rows and n columns. The scan reads each box once, and each land box sinks once: ${sunkBoxes} walked, not ${slowWalked} as in the slow way.`,
      codeLine: LINE.scan,
      state: view(land, left, { islands, counter: { label: "land boxes walked", value: sunkBoxes } }),
    });
    frames.push({
      scene,
      caption: `Space: O(m·n). While an island sinks, the search remembers the path of boxes behind it. Here the longest path was ${plural(longest.length, "box")}; on a map of only land it can hold every box.`,
      codeLine: LINE.spread,
      state: view(land, left, { islands, wave: longest, waveLabel: "longest path" }),
    });
  }
  return frames;
}

export const numberOfIslandsStory: ProblemStory<GridMatrixState> = {
  slugs: ["lc-200"],
  pattern: "Grid search: count and sink",
  trigger: "a grid of land and water, and “how many separate groups?”",
  insight: "Read the map like a page. Each time you step on land, count one island and sink the whole island at once, so it can never be counted again.",
  metaphor: {
    name: "The sinking island",
    legend: "land = '1' · water = '0' · the scan = the two for-loops · sinking = sink(grid, r, c)",
    terms: ["island", "land", "water", "sink", "sank", "sunk"],
  },
  traps: [
    {
      name: "The Infinite Bounce Trap",
      rule: "Turn a box to water BEFORE looking at its neighbours: grid[r][c] = '0' comes first in sink. Otherwise two land boxes send the search back and forth for ever.",
    },
  ],
  template: [
    "for every box (r, c), row by row:",
    "    if the box is unvisited land:",
    "        count++;",
    "        spread(r, c);            // visits the whole group",
    "",
    "spread(r, c):",
    "    if off the grid or not unvisited land: return;",
    "    mark (r, c) visited;         // FIRST, before the neighbours",
    "    spread to the 4 neighbours;",
  ],
  complexity: {
    slow: "O((m·n)²)",
    time: "O(m·n)",
    timeWhy: "the scan reads each box once, and each land box sinks once",
    space: "O(m·n)",
    spaceWhy: "the sinking search remembers the path behind it; on a map of only land that path holds every box",
  },
  code: CODE,
  examples: [
    { label: "One big island", input: "11110,11010,11000,00000", expected: "1" },
    { label: "Three islands", input: "11000,11000,00100,00011", expected: "3", note: "Two islands touch only at a corner" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-994", title: "Rotting Oranges" },
    { slug: "lc-130", title: "Surrounded Regions" },
    { slug: "lc-417", title: "Pacific Atlantic Water Flow" },
  ],
  answer: (input) => String(labelIslands(parse(input)).count),
  frames: (input) => {
    const land = parse(input);
    const slow = slowFrames(land);
    const sunk = land.map((row) => row.map(() => false));
    return [
      ...pictureFrames(land),
      ...slow.frames,
      ...insightFrames(land),
      ...solutionFrames(land, slow.walked),
      ...solutionFrames(parse(PRACTICE), 0, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: view(land, sunk, { islands: labelIslands(land).count }),
      },
    ];
  },
  View: GridMatrixView,
};
