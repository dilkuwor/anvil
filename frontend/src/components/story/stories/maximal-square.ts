import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp3TableView, type Dp3Square, type Dp3TableState } from "../agy-dp3-table-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Dp3TableState>;
/** true = a tile (a 1), false = a hole (a 0). */
type Floor = boolean[][];

/** Fresh floor for the "your turn" run: each of the three neighbours is the limit once, and the best side is not the area. */
const PRACTICE = '["1101","1111","0111"]';

const CODE = [
  "if (matrix == null || matrix.length == 0) return 0;",
  "int rows = matrix.length, cols = matrix[0].length();",
  "int[] prev = new int[cols + 1], cur = new int[cols + 1];",
  "int best = 0;",
  "for (int r = 1; r <= rows; r++) {",
  "    for (int c = 1; c <= cols; c++) {",
  "        if (matrix[r - 1].charAt(c - 1) == '1') {",
  "            cur[c] = 1 + Math.min(prev[c - 1], Math.min(prev[c], cur[c - 1]));",
  "            best = Math.max(best, cur[c]);",
  "        } else {",
  "            cur[c] = 0;",
  "        }",
  "    }",
  "    int[] swap = prev; prev = cur; cur = swap;",
  "}",
  "return best * best;",
];

function parseInput(raw: string): Floor {
  const lines = [...raw.matchAll(/"([01]+)"/g)].map((match) => match[1]).slice(0, 5);
  if (lines.length === 0) return parseInput('["10100","10111","11111","10010"]');
  const cols = Math.min(6, Math.min(...lines.map((line) => line.length)));
  return lines.map((line) => [...line.slice(0, cols)].map((digit) => digit === "1"));
}

/** Independent solver: try every top-left corner and every side, and check every square under the carpet. */
function biggestArea(floor: Floor): number {
  const rows = floor.length;
  const cols = floor[0].length;
  let best = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (let side = 1; r + side <= rows && c + side <= cols; side++) {
        let allTiles = true;
        for (let a = r; a < r + side; a++) for (let b = c; b < c + side; b++) if (!floor[a][b]) allTiles = false;
        if (allTiles) best = Math.max(best, side);
      }
    }
  }
  return best * best;
}

type Solved = { table: number[][]; best: number; corner: Dp3Square | null };

/** The table the real algorithm builds. Off the floor counts as 0. */
function solve(floor: Floor): Solved {
  const table = floor.map((line) => line.map(() => 0));
  let best = 0;
  let corner: Dp3Square | null = null;
  floor.forEach((line, r) =>
    line.forEach((tile, c) => {
      if (!tile) return;
      table[r][c] = 1 + Math.min(at(table, r - 1, c - 1), at(table, r - 1, c), at(table, r, c - 1));
      if (table[r][c] > best) {
        best = table[r][c];
        corner = [r, c];
      }
    }),
  );
  return { table, best, corner };
}

function at(table: number[][], r: number, c: number) {
  return r < 0 || c < 0 ? 0 : table[r][c];
}

function blank(floor: Floor, tiles = true): Dp3TableState {
  return {
    mode: "table",
    align: [],
    rowLabels: null,
    columnLabels: null,
    rowTones: [],
    columnTones: [],
    cells: floor.map((line) => line.map(() => null)),
    tones: floor.map((line) => line.map(() => "idle" as CellTone)),
    tiles: tiles ? floor.map((line) => [...line]) : null,
    marks: [],
    here: null,
    arrows: [],
    paths: [],
    outlines: [],
    badge: null,
    counter: null,
    answer: null,
    note: null,
  };
}

const digits = (floor: Floor) => floor.map((line) => line.map((tile) => (tile ? "1" : "0")));

/** The carpet of side `side` whose bottom right corner lies on `square`. */
function carpet([r, c]: Dp3Square, side: number, tone: "teal" | "coral" | "accent") {
  return { top: r - side + 1, left: c - side + 1, side, tone };
}

function pictureFrames(floor: Floor, solved: Solved): Frame[] {
  const rows = floor.length;
  const cols = floor[0].length;
  const { best, corner } = solved;
  const drawn = { ...blank(floor), cells: digits(floor) };
  const frames: Frame[] = [
    { scene: "picture", caption: `A grid of 1s and 0s, ${rows} ${rows === 1 ? "row" : "rows"} by ${cols} ${cols === 1 ? "column" : "columns"}.`, state: { ...blank(floor, false), cells: digits(floor) } },
    { scene: "picture", caption: "Think of it as a floor. Every 1 is a tile, drawn filled in. Every 0 is a hole.", state: drawn },
  ];
  if (corner) {
    frames.push({
      scene: "picture",
      caption: `Allowed: a square carpet that lies only on tiles. This one has a side of ${best}.`,
      state: { ...drawn, outlines: [carpet(corner, best, "teal")], note: { text: "only tiles under the carpet: allowed", tone: "teal" } },
    });
  }
  // The first small square block with a hole under it.
  let bad: { top: number; left: number; side: number } | null = null;
  for (let side = 2; side <= Math.min(rows, cols) && !bad; side++) {
    for (let r = 0; r + side <= rows && !bad; r++) {
      for (let c = 0; c + side <= cols && !bad; c++) {
        let holes = 0;
        for (let a = r; a < r + side; a++) for (let b = c; b < c + side; b++) if (!floor[a][b]) holes++;
        if (holes === 1) bad = { top: r, left: c, side };
      }
    }
  }
  if (bad) {
    const { top, left, side } = bad;
    const state = { ...drawn, tones: drawn.tones.map((line, r) => line.map((tone, c) => (r >= top && r < top + side && c >= left && c < left + side && !floor[r][c] ? "miss" : tone))) };
    frames.push({
      scene: "picture",
      caption: "Not allowed: a carpet with a hole under it. Even one hole spoils it.",
      state: { ...state, outlines: [{ ...bad, tone: "coral" }], note: { text: "✕ a hole under the carpet: not allowed", tone: "coral" } },
    });
  }
  frames.push({
    scene: "picture",
    caption:
      best === 0
        ? "The goal: the biggest allowed carpet, and how many tiles it covers. Here there is no tile at all, so the answer will be 0."
        : `The goal: the biggest allowed carpet, and how many tiles it covers. Here that is ${best} × ${best} = ${best * best}.`,
    state: { ...drawn, outlines: corner ? [carpet(corner, best, "teal")] : [], answer: { label: "tiles covered", value: String(best * best) } },
  });
  return frames;
}

type SlowStart = { square: Dp3Square; side: number; blocked: boolean; reads: number };
type SlowRun = { reads: number; starts: SlowStart[] };

/** Really grows a carpet from every square, one ring at a time, and counts every square it reads. */
function runSlow(floor: Floor): SlowRun {
  const rows = floor.length;
  const cols = floor[0].length;
  const run: SlowRun = { reads: 0, starts: [] };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let side = 0;
      let blocked = false;
      while (r + side < rows && c + side < cols && !blocked) {
        // The new ring: the bottom row and the right column of the bigger carpet.
        for (let k = 0; k <= side && !blocked; k++) {
          run.reads++;
          if (!floor[r + side][c + k]) blocked = true;
        }
        for (let k = 0; k < side && !blocked; k++) {
          run.reads++;
          if (!floor[r + k][c + side]) blocked = true;
        }
        if (!blocked) side++;
      }
      run.starts.push({ square: [r, c], side, blocked, reads: run.reads });
    }
  }
  return run;
}

function slowFrames(floor: Floor, run: SlowRun): Frame[] {
  const rows = floor.length;
  const cols = floor[0].length;
  const drawn = { ...blank(floor), cells: digits(floor) };
  const frames: Frame[] = [];
  const shown = run.starts.filter((start) => start.side >= 1).slice(0, 2);
  shown.forEach((start, index) => {
    const [r, c] = start.square;
    const outlines: Dp3TableState["outlines"] = [{ top: r, left: c, side: start.side, tone: "accent" }];
    if (start.blocked) outlines.push({ top: r, left: c, side: start.side + 1, tone: "coral" });
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: stand on a square and grow a carpet from it, down and to the right, ring by ring. From here it reaches side ${start.side}${start.blocked ? ", then a hole stops it" : ", then the floor ends"}.`
          : `Then move to the next tile and start all over, from nothing. This carpet reaches side ${start.side}.`,
      state: { ...drawn, here: start.square, outlines, counter: { label: "squares read", value: start.reads } },
    });
  });
  frames.push({
    scene: "slow",
    caption: `After starting from all ${rows * cols} squares: ${run.reads} squares read${run.reads > rows * cols ? `, for a floor of only ${rows * cols}` : ""}. The more tiles, the worse it gets. This is O((m · n)²) time.`,
    state: { ...drawn, tones: drawn.tones.map((line) => line.map(() => "faded" as CellTone)), counter: { label: "squares read", value: run.reads } },
  });
  return frames;
}

function squaresOf(floor: Floor): Dp3Square[] {
  return floor.flatMap((line, r) => line.map((_, c): Dp3Square => [r, c]));
}

/** The table as it looks just before `stop` is filled (row by row), or just after when `include` is set. */
function tableUntil(table: number[][], stop: Dp3Square, include = false): (number | null)[][] {
  return table.map((line, r) => line.map((value, c) => (r < stop[0] || (r === stop[0] && (include ? c <= stop[1] : c < stop[1])) ? value : null)));
}

type Neighbour = { name: "above" | "on the left" | "on the diagonal"; square: Dp3Square; value: number; onFloor: boolean };

function neighboursOf(table: number[][], [r, c]: Dp3Square): Neighbour[] {
  return [
    { name: "above", square: [r - 1, c], value: at(table, r - 1, c), onFloor: r > 0 },
    { name: "on the left", square: [r, c - 1], value: at(table, r, c - 1), onFloor: c > 0 },
    { name: "on the diagonal", square: [r - 1, c - 1], value: at(table, r - 1, c - 1), onFloor: r > 0 && c > 0 },
  ];
}

/** Arrows from every neighbour that sets the limit (the smallest ones that lie on the floor). */
function limitArrows(table: number[][], square: Dp3Square): Dp3TableState["arrows"] {
  const around = neighboursOf(table, square);
  const least = Math.min(...around.map((item) => item.value));
  return around.filter((item) => item.onFloor && item.value === least).map((item) => ({ from: item.square, to: square }));
}

type Kind = "hole" | "edge" | "blocked" | "grow";

function kindOf(floor: Floor, table: number[][], [r, c]: Dp3Square): Kind {
  if (!floor[r][c]) return "hole";
  if (r === 0 || c === 0) return "edge";
  return table[r][c] === 1 ? "blocked" : "grow";
}

/** The one neighbour that is strictly the smallest, if there is one. */
function soleLimit(table: number[][], square: Dp3Square): Neighbour | null {
  const around = neighboursOf(table, square);
  const least = Math.min(...around.map((item) => item.value));
  const smallest = around.filter((item) => item.value === least);
  return smallest.length === 1 && smallest[0].onFloor ? smallest[0] : null;
}

function insightFrames(floor: Floor, solved: Solved): Frame[] {
  const { table } = solved;
  const squares = squaresOf(floor);
  const grow = squares.find((square) => kindOf(floor, table, square) === "grow") ?? null;
  const tile = grow ?? squares.find(([r, c]) => floor[r][c]) ?? null;
  const hole = squares.find(([r, c]) => !floor[r][c]) ?? null;
  const frames: Frame[] = [];
  if (tile) {
    const value = table[tile[0]][tile[1]];
    frames.push({
      scene: "insight",
      caption: `Picture a table laid over the floor. One square's number means: the side of the biggest carpet whose bottom right corner lies on this square. Here that is ${value}.`,
      state: { ...blank(floor), here: tile, outlines: [carpet(tile, value, "accent")], badge: { text: "a square = biggest carpet with its corner here", tone: "accent" } },
    });
  }
  if (grow) {
    const [r, c] = grow;
    const value = table[r][c];
    const around = neighboursOf(table, grow);
    frames.push({
      scene: "insight",
      caption: `A carpet of side ${value} with its corner here needs room for three smaller carpets: one ending above, one ending on the left, one ending on the diagonal.`,
      state: { ...blank(floor), cells: tableUntil(table, grow), here: grow, arrows: around.map((item) => ({ from: item.square, to: grow })), badge: { text: "three neighbours: above, left, diagonal", tone: "accent" } },
    });
    const least = Math.min(...around.map((item) => item.value));
    const state = { ...blank(floor), cells: tableUntil(table, grow, true) };
    state.tones[r][c] = "done";
    frames.push({
      scene: "insight",
      caption: `The three neighbours hold ${around[0].value}, ${around[1].value} and ${around[2].value}. The smallest one is the limit, and one more ring of tiles fits around it: ${least} + 1 = ${value}.`,
      state: { ...state, here: grow, arrows: limitArrows(table, grow), outlines: [carpet(grow, value, "teal")], badge: { text: "smallest neighbour + 1", tone: "teal" } },
    });
  }
  if (hole) {
    const state = { ...blank(floor), cells: tableUntil(table, hole, true) };
    state.tones[hole[0]][hole[1]] = "miss";
    frames.push({
      scene: "insight",
      caption: "A hole can never be the corner of a carpet. So a hole always holds 0, and it holds back every carpet that touches it.",
      state: { ...state, here: hole, badge: { text: "a hole holds 0", tone: "coral" } },
    });
  }
  if (frames.length === 0) frames.push({ scene: "insight", caption: "Picture a table of small answers laid over the floor. One square's number means: the side of the biggest carpet whose corner lies on it.", state: blank(floor) });
  return frames;
}

const flatten = (floor: Floor, [r, c]: Dp3Square) => r * floor[0].length + c;

function limitQuiz(floor: Floor, table: number[][], square: Dp3Square, limit: Neighbour): StoryQuiz {
  const feedback: Record<number, string> = { [flatten(floor, square)]: "That is the square we are filling. Its number comes from neighbours filled before it." };
  for (const item of neighboursOf(table, square)) {
    if (item.name !== limit.name) feedback[flatten(floor, item.square)] = `That neighbour holds ${item.value}. Another neighbour allows less, and the carpet has to fit all three.`;
  }
  return {
    kind: "cell",
    cells: floor.length * floor[0].length,
    question: "Which neighbour holds this carpet back the most? Click it.",
    answer: flatten(floor, limit.square),
    feedback,
    otherwise: "Only three squares matter: the filled neighbours above, on the left, and on the diagonal between them.",
    why: `The neighbour ${limit.name} holds ${limit.value}, the smallest of the three. The carpet cannot grow past its smallest neighbour plus 1.`,
  };
}

function growQuiz(table: number[][], square: Dp3Square): StoryQuiz {
  const around = neighboursOf(table, square).map((item) => item.value);
  const least = Math.min(...around);
  const most = Math.max(...around);
  const options = [least, least + 1, most > least ? most + 1 : least + 2];
  return {
    kind: "choice",
    question: "How big is the biggest carpet with its corner on this tile?",
    options: options.map((side) => `Side ${side}`),
    answer: 1,
    why: `The smallest neighbour holds ${least}, so all three leave room for ${least}. One more ring of tiles fits: ${least} + 1 = ${least + 1}.`,
  };
}

const describe = (floor: Floor, table: number[][], [r, c]: Dp3Square) => `${floor[r][c] ? "tile" : "hole"} ${table[r][c]}`;

/**
 * The real algorithm, square by square. The first square of each kind is told in full, and so is every carpet that grows;
 * squares where nothing new happens are summed up in one frame. `practice` reuses it on a fresh floor, where the reader decides.
 */
function fillFrames(floor: Floor, solved: Solved, scene: SceneId, practice: boolean): Frame[] {
  const { table } = solved;
  const rows = floor.length;
  const frames: Frame[] = [];
  const cells: (number | null)[][] = floor.map((line) => line.map(() => null));
  const line = (index: number) => (practice ? undefined : index);
  let best = 0;
  /** Rows the two rolling rows have already let go. */
  let fadedBelow = 0;
  const base = (): Dp3TableState => {
    const state = blank(floor);
    state.cells = cells.map((row) => [...row]);
    state.tones = state.tones.map((row, r) => row.map((tone) => (r < fadedBelow ? "faded" : tone)));
    return { ...state, answer: { label: "best side", value: String(best) } };
  };
  const seen = new Set<Kind>();
  let askedLimit = false;
  let askedGrow = false;
  let toldTwoRows = false;

  let group: Dp3Square[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const state = base();
    for (const [a, b] of group) state.tones[a][b] = floor[a][b] ? "hit" : "idle";
    const list = group.map((square) => describe(floor, table, square)).join(", ");
    frames.push({
      scene,
      caption:
        group.length === 1
          ? `The next square brings nothing new: ${list}.`
          : practice
            ? `The next ${group.length} squares leave nothing to choose: ${list}. A hole holds 0, and a tile next to a 0 or to the edge holds 1.`
            : `The next ${group.length} squares bring nothing new: ${list}. A hole holds 0. A tile holds its smallest neighbour plus 1.`,
      codeLine: line(7),
      state: { ...state, here: group.at(-1)! },
    });
    group = [];
  };

  frames.push(
    practice
      ? { scene, caption: "Your turn, on a new floor. Filled squares are tiles, empty squares are holes. You decide what limits each carpet.", state: blank(floor) }
      : {
          scene,
          caption: "Lay an empty table over the floor, one square per tile or hole. Each square will hold the side of the biggest carpet with its corner there. The best side starts at 0.",
          codeLine: 3,
          state: base(),
        },
  );

  for (let r = 0; r < rows; r++) {
    if (r >= 2) fadedBelow = r - 1;
    for (let c = 0; c < floor[0].length; c++) {
      const square: Dp3Square = [r, c];
      const kind = kindOf(floor, table, square);
      const value = table[r][c];
      const around = neighboursOf(table, square);
      const limit = kind === "blocked" || kind === "grow" ? soleLimit(table, square) : null;
      const improves = value > best;
      const ask = practice ? (limit !== null ? "limit" : kind === "grow" ? "grow" : null) : limit !== null && !askedLimit ? "limit" : kind === "grow" && !askedGrow && limit === null ? "grow" : null;
      const plain = seen.has(kind) && kind !== "grow" && !improves && ask === null;
      seen.add(kind);
      if (plain || (practice && ask === null && !improves && kind !== "grow")) {
        cells[r][c] = value;
        group.push(square);
        continue;
      }
      flush();

      const holds = `Its neighbours hold ${around[0].value} above, ${around[1].value} on the left and ${around[2].value} on the diagonal.`;
      if (ask === "limit" && limit) {
        askedLimit = true;
        frames.push({ scene, caption: `A tile. ${holds}`, codeLine: line(6), state: { ...base(), here: square }, quiz: limitQuiz(floor, table, square, limit) });
      } else if (ask === "grow") {
        askedGrow = true;
        frames.push({ scene, caption: `A tile. ${holds}`, codeLine: line(6), state: { ...base(), here: square }, quiz: growQuiz(table, square) });
      }

      cells[r][c] = value;
      const state = base();
      state.tones[r][c] = kind === "hole" ? "miss" : kind === "grow" ? "done" : "hit";
      const least = Math.min(...around.map((item) => item.value));
      let caption: string;
      if (kind === "hole") caption = "A hole. No carpet can have its corner on a hole, so this square holds 0.";
      else if (kind === "edge") caption = `A tile on the edge of the floor. ${r === 0 && c === 0 ? "Nothing lies above it or to its left" : r === 0 ? "Nothing lies above it" : "Nothing lies to its left"}, and off the floor counts as 0. So 0 + 1 = 1: a carpet of one tile.`;
      else if (limit) caption = `The neighbour ${limit.name} holds ${limit.value}${limit.value === 0 ? ", it is a hole" : ""}. It is the smallest, so it sets the limit: ${limit.value} + 1 = ${value}.`;
      else if (kind === "blocked") caption = `A tile. ${holds} The smallest is 0, so only 0 + 1 = 1 fits.`;
      else caption = ask === "grow" ? `The smallest neighbour holds ${least}, so one more ring of tiles fits: ${least} + 1 = ${value}. The frame shows that carpet.` : `A tile. ${holds} The smallest is ${least}, so one more ring of tiles fits: ${least} + 1 = ${value}.`;
      frames.push({
        scene,
        caption,
        codeLine: line(kind === "hole" ? 10 : 7),
        state: {
          ...state,
          here: square,
          arrows: kind === "hole" || kind === "edge" ? [] : limitArrows(table, square),
          outlines: kind === "grow" ? [carpet(square, value, "accent")] : [],
          badge: kind === "hole" ? { text: "a hole holds 0", tone: "coral" } : { text: "smallest neighbour + 1", tone: "teal" },
        },
      });
      if (improves) {
        const before = best;
        best = value;
        const better = base();
        better.tones[r][c] = "done";
        frames.push({
          scene,
          caption: `${value} beats the old best side of ${before}. The best side is now ${best}.`,
          codeLine: line(8),
          state: { ...better, here: square, outlines: [carpet(square, value, "teal")] },
        });
      }
    }
    flush();
    if (!practice && !toldTwoRows && r === 1 && rows > 2) {
      toldTwoRows = true;
      fadedBelow = 1;
      frames.push({
        scene,
        caption: "This row is full. A square only looks at its own row and the row above, so the code keeps just two rows of numbers. Older rows fade.",
        codeLine: 13,
        state: { ...base(), badge: { text: "two rows of numbers are enough", tone: "accent" } },
      });
    }
  }
  return frames;
}

function endFrames(floor: Floor, solved: Solved, slow: SlowRun): Frame[] {
  const { table, best, corner } = solved;
  const rows = floor.length;
  const cols = floor[0].length;
  const area = best * best;
  const frames: Frame[] = [];
  const full = (): Dp3TableState => ({ ...blank(floor), cells: table.map((line) => [...line]) });
  const sideLabel = { label: "best side", value: String(best) };
  const areaLabel = { label: "tiles covered", value: String(area) };
  if (corner) {
    const found = full();
    found.tones[corner[0]][corner[1]] = "done";
    frames.push({
      scene: "solution",
      caption: `The table is full. The best square holds ${best}, so the biggest carpet has a side of ${best}. The frame shows it.`,
      codeLine: 15,
      state: { ...found, here: corner, outlines: [carpet(corner, best, "teal")], answer: sideLabel },
    });
    const covered = full();
    const box = carpet(corner, best, "teal");
    covered.tones = covered.tones.map((line, r) => line.map((tone, c) => (r >= box.top && r <= corner[0] && c >= box.left && c <= corner[1] ? "done" : tone)));
    frames.push({
      scene: "solution",
      caption:
        best > 1
          ? `The Side Trap: ${best} is only the side of the carpet. The question asks how many tiles it covers, and that is ${best} × ${best} = ${area}.`
          : "The Side Trap: the table holds sides, but the question asks for tiles covered, side × side. Here 1 × 1 = 1 looks the same. With a bigger carpet it does not.",
      codeLine: 15,
      state: { ...covered, outlines: [box], answer: sideLabel, note: { text: `✕ side ${best} is not the answer   ·   tiles covered = ${best} × ${best} = ${area}`, tone: "coral" }, badge: { text: "the Side Trap", tone: "coral" } },
    });
    frames.push({
      scene: "solution",
      caption: `So the code returns the best side times itself. The carpet covers ${area} ${area === 1 ? "tile" : "tiles"}, and the answer is ${area}.`,
      codeLine: 15,
      state: { ...covered, outlines: [box], answer: areaLabel },
    });
  } else {
    frames.push({ scene: "solution", caption: "The table is full and every square holds 0. There is no tile for a carpet, so the answer is 0.", codeLine: 15, state: { ...full(), answer: areaLabel } });
  }
  frames.push({
    scene: "solution",
    caption: `Time: O(m · n). Each of the ${rows * cols} squares was filled once, by looking at 3 neighbours at most.${slow.reads > rows * cols ? ` The slow way read ${slow.reads} squares.` : ""}`,
    codeLine: 5,
    state: { ...full(), answer: areaLabel, counter: { label: "squares filled", value: rows * cols } },
  });
  const kept = full();
  kept.tones = kept.tones.map((line, r) => line.map(() => (r >= rows - 2 ? "window" : "faded") as CellTone));
  frames.push({
    scene: "solution",
    caption: `Space: O(n). The code keeps only two rows of numbers at a time, the row being filled and the row above.${rows > 2 ? " The faded rows are gone." : ""}`,
    codeLine: 2,
    state: { ...kept, answer: areaLabel },
  });
  return frames;
}

function remembered(floor: Floor, solved: Solved): Dp3TableState {
  const { table, best, corner } = solved;
  const state = { ...blank(floor), cells: table.map((line) => [...line]), answer: { label: "tiles covered", value: String(best * best) } };
  if (!corner) return state;
  state.tones[corner[0]][corner[1]] = "done";
  return { ...state, here: corner, outlines: [carpet(corner, best, "teal")], arrows: best > 1 ? neighboursOf(table, corner).map((item) => ({ from: item.square, to: corner })) : [] };
}

function practiceEnd(floor: Floor, solved: Solved): Frame[] {
  const { table, best, corner } = solved;
  const area = best * best;
  const full: Dp3TableState = { ...blank(floor), cells: table.map((line) => [...line]), answer: { label: "best side", value: String(best) } };
  if (corner) full.tones[corner[0]][corner[1]] = "done";
  const options = [...new Set([best, best * 2, area, best + 1])].sort((a, b) => a - b).map(String);
  return [
    {
      scene: "card",
      caption: `The table is full. The best square holds ${best}.`,
      state: { ...full, here: corner, outlines: corner ? [carpet(corner, best, "teal")] : [] },
      quiz: {
        kind: "choice",
        question: "The question asks how many tiles the biggest carpet covers. What is the answer?",
        options,
        answer: options.indexOf(String(area)),
        why: `The table holds sides. The carpet covers side × side tiles: ${best} × ${best} = ${area}. Answering ${best} is the Side Trap.`,
      },
    },
    {
      scene: "card",
      caption: `Done. The best side is ${best}, and the carpet covers ${best} × ${best} = ${area} tiles. The answer is ${area}.`,
      state: remembered(floor, solved),
    },
  ];
}

export const maximalSquareStory: ProblemStory<Dp3TableState> = {
  slugs: ["lc-221"],
  pattern: "2-D DP",
  trigger: "the largest square of 1s inside a grid of 0s and 1s",
  insight: "Each square holds the side of the biggest carpet whose bottom right corner lies on it. A hole holds 0. A tile holds its smallest neighbour (above, left, diagonal) plus 1. The answer is the best side times itself.",
  metaphor: {
    name: "The carpet corner",
    legend: "tile = '1' · hole = '0' · square = cur[c] · above = prev[c] · left = cur[c - 1] · diagonal = prev[c - 1] · best side = best",
    terms: ["carpet", "tile", "hole", "square", "neighbour", "corner", "side"],
  },
  traps: [{ name: "The Side Trap", rule: "The table holds side lengths, but the question asks for the area. Return best * best, not best." }],
  template: [
    "best = 0;",
    "for each square (r, c), row by row:",
    "    if (it is a 1) table[r][c] = 1 + smallest of above, left, diagonal;",
    "    else table[r][c] = 0;",
    "    best = max(best, table[r][c]);",
    "return best * best;                  // area, not side",
  ],
  complexity: {
    slow: "O((m · n)²)",
    time: "O(m · n)",
    timeWhy: "every square is filled once, from three neighbours",
    space: "O(n)",
    spaceWhy: "a square only looks at its own row and the row above, so two rows of numbers are kept",
  },
  code: CODE,
  examples: [
    { label: "4 × 5 floor", input: '["10100","10111","11111","10010"]', expected: "4" },
    { label: "3 × 3, all tiles", input: '["111","111","111"]', expected: "9", note: "The carpet grows at every step" },
    { label: "2 × 2, two holes", input: '["01","10"]', expected: "1", note: "No carpet bigger than one tile" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-62", title: "Unique Paths" },
    { slug: "lc-1143", title: "Longest Common Subsequence" },
    { slug: "lc-72", title: "Edit Distance" },
  ],
  answer: (raw) => String(biggestArea(parseInput(raw))),
  frames: (raw) => {
    const floor = parseInput(raw);
    const solved = solve(floor);
    const slow = runSlow(floor);
    const practice = parseInput(PRACTICE);
    const practiceSolved = solve(practice);
    return [
      ...pictureFrames(floor, solved),
      ...slowFrames(floor, slow),
      ...insightFrames(floor, solved),
      ...fillFrames(floor, solved, "solution", false),
      ...endFrames(floor, solved, slow),
      ...fillFrames(practice, practiceSolved, "card", true),
      ...practiceEnd(practice, practiceSolved),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: remembered(floor, solved),
      },
    ];
  },
  View: AgyDp3TableView,
};
