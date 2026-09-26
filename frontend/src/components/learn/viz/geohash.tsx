import { Frame, Label, Legend, VIZ_COLORS } from "./primitives";
import { asNumber, asNumberList, type VizDefinition, type VizStep } from "./types";

/**
 * Geohash on a 16×16 square. Each split halves the world along one axis and adds one
 * character to every cell's code, so a shared prefix means "the same bigger cell". The
 * frames then run the nearby query: the query cell, its eight neighbours, the candidate
 * points, the exact-distance filter, and the ranked result.
 */

export const GRID = 16;

export type GeohashParams = {
  /** Flat x,y pairs on a 0–15 grid. */
  points: number[];
  /** Query point as [x, y]. */
  query: number[];
  /** Number of splits, 1–3. Odd splits cut x, even splits cut y. */
  precision: number;
  /** Exact-distance radius in grid units. */
  radius: number;
};

export type GeohashPhase = "setup" | "split" | "query-cell" | "neighbours" | "candidates" | "filter" | "result";

export type GeohashCell = { code: string; x0: number; y0: number; w: number; h: number };

export type GeohashState = {
  phase: GeohashPhase;
  /** How many splits have been drawn so far. */
  level: number;
  /** All cells at the current level. */
  cells: GeohashCell[];
  /** Code of the query point's cell so far ("" before the first split). */
  queryCode: string;
  neighbourCodes: string[];
  /** Point indexes inside the query cell plus neighbours. */
  candidates: number[];
  kept: number[];
  dropped: number[];
  /** Kept points sorted by distance, nearest first. */
  ranked: { index: number; distance: number }[];
  showRadius: boolean;
};

const DEFAULTS: GeohashParams = {
  points: [2, 3, 5, 12, 7, 7, 8, 5, 9, 8, 10, 6, 11, 9, 12, 4, 13, 13, 14, 1, 3, 9, 6, 2],
  query: [9, 6],
  precision: 3,
  radius: 3,
};

export function toPairs(flat: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pairs.push([flat[i], flat[i + 1]]);
  return pairs;
}

/** Cells after `level` splits. Split k cuts x when k is odd and y when k is even. */
export function cellsAt(level: number): GeohashCell[] {
  let cells: GeohashCell[] = [{ code: "", x0: 0, y0: 0, w: GRID, h: GRID }];
  for (let k = 1; k <= level; k += 1) {
    const next: GeohashCell[] = [];
    for (const cell of cells) {
      if (k % 2 === 1) {
        const half = cell.w / 2;
        next.push({ code: cell.code + "0", x0: cell.x0, y0: cell.y0, w: half, h: cell.h });
        next.push({ code: cell.code + "1", x0: cell.x0 + half, y0: cell.y0, w: half, h: cell.h });
      } else {
        const half = cell.h / 2;
        next.push({ code: cell.code + "0", x0: cell.x0, y0: cell.y0, w: cell.w, h: half });
        next.push({ code: cell.code + "1", x0: cell.x0, y0: cell.y0 + half, w: cell.w, h: half });
      }
    }
    cells = next;
  }
  return cells;
}

export function cellOf(cells: GeohashCell[], x: number, y: number): GeohashCell | undefined {
  return cells.find((cell) => x >= cell.x0 && x < cell.x0 + cell.w && y >= cell.y0 && y < cell.y0 + cell.h);
}

/** The up-to-eight cells that touch the query cell. Cells past the edge of the world are skipped. */
export function neighboursOf(cells: GeohashCell[], home: GeohashCell): GeohashCell[] {
  const found: GeohashCell[] = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      if (dx === 0 && dy === 0) continue;
      const cell = cellOf(cells, home.x0 + dx * home.w, home.y0 + dy * home.h);
      if (cell) found.push(cell);
    }
  }
  return found;
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function frame(state: GeohashState, kind: VizStep<GeohashState>["kind"], title: string, explain: string, interview: string): VizStep<GeohashState> {
  return {
    title,
    explain,
    interview,
    kind,
    state: {
      ...state,
      cells: state.cells.map((cell) => ({ ...cell })),
      neighbourCodes: [...state.neighbourCodes],
      candidates: [...state.candidates],
      kept: [...state.kept],
      dropped: [...state.dropped],
      ranked: state.ranked.map((item) => ({ ...item })),
    },
  };
}

export function geohashSteps(params: GeohashParams): VizStep<GeohashState>[] {
  const steps: VizStep<GeohashState>[] = [];
  const points = toPairs(params.points);
  const query: [number, number] = [params.query[0], params.query[1]];
  const state: GeohashState = {
    phase: "setup",
    level: 0,
    cells: cellsAt(0),
    queryCode: "",
    neighbourCodes: [],
    candidates: [],
    kept: [],
    dropped: [],
    ranked: [],
    showRadius: false,
  };

  steps.push(
    frame(
      state,
      "setup",
      `${points.length} points, query at (${query[0]}, ${query[1]})`,
      `The square is the whole map. Each dot is a stored location, for example a driver. The marked point is the user asking "who is near me?". No index yet: answering means measuring the distance to every dot.`,
      "Start by naming the problem: 'a B-tree index sorts on one column, but nearby is a range on latitude AND a range on longitude at the same time. One sorted list cannot answer a two-dimensional box, so I need a way to turn two numbers into one key that keeps nearby points close together'.",
    ),
  );

  for (let k = 1; k <= params.precision; k += 1) {
    state.level = k;
    state.cells = cellsAt(k);
    state.phase = "split";
    const home = cellOf(state.cells, query[0], query[1]);
    state.queryCode = home?.code ?? "";
    const axis = k % 2 === 1 ? "left/right" : "bottom/top";
    const bit = state.queryCode.at(-1);
    steps.push(
      frame(
        state,
        "invariant",
        `Split ${k}: cut ${axis}, prefix "${state.queryCode}"`,
        `Every cell is cut in half ${axis}. The lower half gets a 0, the upper half gets a 1. The query point lands in the ${bit === "1" ? "upper" : "lower"} half, so its code grows to "${state.queryCode}". ${state.cells.length} cells now, each ${state.cells[0].w}×${state.cells[0].h}.`,
        `Say what one character buys: 'each extra character halves the cell, and the code is a prefix code: every point whose code starts with "${state.queryCode}" is inside this cell. So a longer prefix is a smaller area, and a prefix match is a plain string range scan, which a normal B-tree index can do'.`,
      ),
    );
  }

  state.phase = "query-cell";
  const cells = state.cells;
  const home = cellOf(cells, query[0], query[1]) ?? cells[0];
  const inHome = points.map((p, i) => (cellOf(cells, p[0], p[1])?.code === home.code ? i : -1)).filter((i) => i >= 0);
  steps.push(
    frame(
      state,
      "decision",
      `Query cell is "${home.code}" with ${inHome.length} point${inHome.length === 1 ? "" : "s"}`,
      `Encode the query point to the same precision. Its cell is "${home.code}". Looking only here would be one index lookup: WHERE geohash LIKE '${home.code}%'.`,
      "Show the trap before the interviewer asks: 'the query cell alone is not enough. A point 50 metres away can sit just across the cell line and have a completely different code. Cell borders are arbitrary, so I must also look at the neighbouring cells'.",
    ),
  );

  state.phase = "neighbours";
  const neighbours = neighboursOf(cells, home);
  state.neighbourCodes = neighbours.map((cell) => cell.code);
  steps.push(
    frame(
      state,
      "tradeoff",
      `Add ${neighbours.length} neighbour cell${neighbours.length === 1 ? "" : "s"}`,
      `The query cell plus the cells touching it: ${neighbours.length} here${neighbours.length < 8 ? " (the rest are off the edge of the map)" : ""}. Nine prefix lookups instead of one. That is the price of fixed cell borders.`,
      "Name the edge problem and its fix in one breath: 'geohash cells have hard edges, so I search the cell plus its 8 neighbours. That is 9 small prefix scans, which is cheap. I pick the precision so the cell is about the size of my search radius, so 9 cells cover the circle without pulling in a whole city'.",
    ),
  );

  state.phase = "candidates";
  const searchCodes = new Set([home.code, ...state.neighbourCodes]);
  state.candidates = points.map((p, i) => (searchCodes.has(cellOf(cells, p[0], p[1])?.code ?? "") ? i : -1)).filter((i) => i >= 0);
  steps.push(
    frame(
      state,
      "invariant",
      `${state.candidates.length} candidates out of ${points.length}`,
      `Every point whose code is in those ${searchCodes.size} cells is a candidate. The other ${points.length - state.candidates.length} were never read. This is the whole win: the index shrinks the list before any distance is computed.`,
      "State the two-stage shape: 'the index gives me a superset, fast and rough. Cells are squares and the search area is a circle, so some candidates are too far. That is fine: a cheap coarse filter first, then an exact check on the survivors'.",
    ),
  );

  state.phase = "filter";
  state.showRadius = true;
  state.kept = state.candidates.filter((i) => distance(points[i], query) <= params.radius);
  state.dropped = state.candidates.filter((i) => distance(points[i], query) > params.radius);
  steps.push(
    frame(
      state,
      "decision",
      `Exact distance ≤ ${params.radius}: keep ${state.kept.length}, drop ${state.dropped.length}`,
      `Now compute the real distance from the query to each candidate. ${state.kept.length} are inside the circle and stay. ${state.dropped.length} were in a searched cell but outside the radius, so they go.`,
      "Explain why the exact step is cheap: 'I only run the distance formula on tens of candidates, not on millions of rows. Haversine or even a flat approximation is fine at city scale. The index does the heavy lifting, the filter does the correctness'.",
    ),
  );

  state.phase = "result";
  state.ranked = state.kept.map((index) => ({ index, distance: Number(distance(points[index], query).toFixed(2)) })).sort((a, b) => a.distance - b.distance || a.index - b.index);
  const nearest = state.ranked[0];
  steps.push(
    frame(
      state,
      "result",
      nearest ? `Nearest is (${points[nearest.index][0]}, ${points[nearest.index][1]}) at ${nearest.distance}` : "No point within the radius",
      nearest ? `Sort the survivors by distance and return them. ${state.ranked.length} result${state.ranked.length === 1 ? "" : "s"}, nearest first. Cell lookup → exact filter → rank.` : "No candidate is inside the radius. The caller can widen the radius, which means dropping to a shorter prefix and searching bigger cells.",
      "Close with the full flow and where it lives: 'encode the query to a geohash, scan the cell and its 8 neighbours from the index, compute exact distance on the candidates, rank, return. For moving drivers the index lives in memory, Redis GEO or a per-region service, because locations change every few seconds and a disk index cannot take that write rate'.",
    ),
  );

  return steps;
}

export function GeohashView({ state, params }: { state: GeohashState; params: GeohashParams }) {
  const points = toPairs(params.points);
  const query: [number, number] = [params.query[0], params.query[1]];
  const size = 240;
  const unit = size / GRID;
  const left = 20;
  const top = 12;
  const width = 500;
  const height = size + top + 28;
  const sx = (x: number) => left + (x + 0.5) * unit;
  const sy = (y: number) => top + (GRID - y - 0.5) * unit;
  const neighbourSet = new Set(state.neighbourCodes);
  const candidateSet = new Set(state.candidates);
  const keptSet = new Set(state.kept);
  const droppedSet = new Set(state.dropped);
  const showNeighbours = state.phase !== "setup" && state.phase !== "split" && state.phase !== "query-cell";
  const showQueryCell = state.phase !== "setup" && state.phase !== "split";
  const listX = left + size + 24;

  function pointFill(index: number): string {
    if (keptSet.has(index)) return VIZ_COLORS.teal;
    if (droppedSet.has(index)) return VIZ_COLORS.coral;
    if (candidateSet.has(index)) return VIZ_COLORS.accent;
    return VIZ_COLORS.line;
  }

  return (
    <div>
      <Frame width={width} height={height} label="Geohash cells over a square map with a nearby query">
        <rect x={left} y={top} width={size} height={size} fill="transparent" stroke={VIZ_COLORS.line} />
        {state.cells.map((cell) => {
          const isHome = showQueryCell && cell.code === state.queryCode;
          const isNeighbour = showNeighbours && neighbourSet.has(cell.code);
          const fill = isHome ? "color-mix(in srgb, var(--accent) 22%, transparent)" : isNeighbour ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "transparent";
          const stroke = isHome || isNeighbour ? VIZ_COLORS.accent : VIZ_COLORS.line;
          return (
            <g key={cell.code || "root"}>
              <rect x={left + cell.x0 * unit} y={top + (GRID - cell.y0 - cell.h) * unit} width={cell.w * unit} height={cell.h * unit} fill={fill} stroke={stroke} strokeWidth={isHome ? 1.75 : 1} />
              {cell.code ? (
                <text x={left + cell.x0 * unit + 4} y={top + (GRID - cell.y0 - cell.h) * unit + 11} fontSize={9} fontWeight={600} fill={isHome ? VIZ_COLORS.accent : VIZ_COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {cell.code}
                </text>
              ) : null}
            </g>
          );
        })}
        {state.showRadius ? <circle cx={sx(query[0])} cy={sy(query[1])} r={params.radius * unit} fill="transparent" stroke={VIZ_COLORS.teal} strokeDasharray="4 3" strokeWidth={1.25} /> : null}
        {points.map((p, index) => (
          <circle key={index} cx={sx(p[0])} cy={sy(p[1])} r={4} fill={pointFill(index)} stroke={VIZ_COLORS.panel} strokeWidth={0.75} />
        ))}
        <circle cx={sx(query[0])} cy={sy(query[1])} r={6} fill="transparent" stroke={VIZ_COLORS.coral} strokeWidth={2} />
        <circle cx={sx(query[0])} cy={sy(query[1])} r={2} fill={VIZ_COLORS.coral} />
        <Label x={left} y={top + size + 18} size={10}>
          {state.level === 0 ? "no splits yet" : `${state.level} split${state.level === 1 ? "" : "s"}, ${state.cells.length} cells`}
        </Label>
        <Label x={listX} y={top + 14} tone="ink" weight={600}>
          query cell
        </Label>
        <text x={listX + 78} y={top + 14} fontSize={12} fontWeight={600} fill={VIZ_COLORS.accent} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          {state.queryCode ? `"${state.queryCode}"` : "—"}
        </text>
        <Label x={listX} y={top + 36} size={10}>
          neighbours: {showNeighbours ? state.neighbourCodes.length : 0}
        </Label>
        <Label x={listX} y={top + 52} size={10}>
          candidates: {state.candidates.length} of {points.length}
        </Label>
        <Label x={listX} y={top + 68} size={10}>
          within {params.radius}: {state.phase === "filter" || state.phase === "result" ? state.kept.length : "—"}
        </Label>
        {state.phase === "result" ? (
          <g>
            <Label x={listX} y={top + 96} tone="ink" weight={600}>
              ranked
            </Label>
            {state.ranked.slice(0, 6).map((item, row) => (
              <text key={item.index} x={listX} y={top + 114 + row * 15} fontSize={11} fill={VIZ_COLORS.teal} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                {row + 1}. ({points[item.index][0]}, {points[item.index][1]}) d={item.distance}
              </text>
            ))}
            {state.ranked.length === 0 ? (
              <Label x={listX} y={top + 114} size={10}>
                none in radius
              </Label>
            ) : null}
          </g>
        ) : null}
      </Frame>
      <Legend
        items={[
          { tone: "accent", label: "query cell + neighbours" },
          { tone: "idle", label: "not read" },
          { tone: "teal", label: "kept" },
          { tone: "coral", label: "dropped by distance" },
        ]}
      />
    </div>
  );
}

function clampGrid(value: number): number {
  return Math.min(GRID - 1, Math.max(0, Math.round(value)));
}

function parsePoints(raw: unknown): number[] {
  const flat = asNumberList(raw, DEFAULTS.points).map(clampGrid);
  const even = flat.slice(0, flat.length - (flat.length % 2)).slice(0, 48);
  return even.length >= 2 ? even : [...DEFAULTS.points];
}

function parseQuery(raw: unknown): number[] {
  const flat = asNumberList(raw, DEFAULTS.query).map(clampGrid);
  return flat.length >= 2 ? flat.slice(0, 2) : [...DEFAULTS.query];
}

export const geohashViz: VizDefinition<GeohashParams, GeohashState> = {
  id: "geohash",
  title: "Geohash: cells, neighbours, exact filter",
  summary: "Split the map into cells with prefix codes, look up the query cell and its 8 neighbours, then filter by real distance.",
  fields: [
    { key: "points", label: "Stored points (x,y pairs)", kind: "text", hint: "Flat list on a 0–15 grid, e.g. 2,3, 5,12, 7,7" },
    { key: "query", label: "Query point (x,y)", kind: "text", hint: "e.g. 9,6" },
    { key: "precision", label: "Splits (1–3)", kind: "number", hint: "More splits, smaller cells." },
    { key: "radius", label: "Search radius (grid units)", kind: "number" },
  ],
  defaults: DEFAULTS,
  parse: (raw) => ({
    points: parsePoints(raw.points),
    query: parseQuery(raw.query),
    precision: Math.round(asNumber(raw.precision, DEFAULTS.precision, 1, 3)),
    radius: asNumber(raw.radius, DEFAULTS.radius, 1, 8),
  }),
  steps: geohashSteps,
  View: GeohashView,
};
