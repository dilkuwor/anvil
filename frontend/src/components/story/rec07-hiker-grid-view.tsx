import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for "the cost of a route is its worst step": a grid of heights, the steepest step each cell has
 * needed so far, the hiker's list of trails, and routes drawn over the grid. Click targets are the cells. Draws state only.
 */

export type HikerPos = [number, number];

export type HikerGridState = {
  heights: number[][];
  /** Steepest step of the best trail found to each cell. `null` = not reached yet. `null` grid hides the numbers. */
  effort: (number | null)[][] | null;
  /** Cells whose best trail is final. */
  done: HikerPos[];
  /** Where the hiker stands. */
  here: HikerPos | null;
  /** The neighbour being stepped to. */
  look?: HikerPos | null;
  /** The step being measured, labelled between the two cells. */
  step?: { from: HikerPos; to: HikerPos; size: number } | null;
  /** The hiker's list of trails to try. `null` hides it. */
  list: { effort: number; cell: HikerPos }[] | null;
  /** True when `list` is sorted cheapest first, so its top entry is marked. False while the reader is asked to find it. */
  listSorted?: boolean;
  /** A route drawn in teal, with a short label. */
  route?: { cells: HikerPos[]; label: string } | null;
  /** A second route drawn in coral dashes: the one a wrong rule would pick. */
  other?: { cells: HikerPos[]; label: string } | null;
  /** Slow scene: cells a flood reached with the current limit. */
  flood?: HikerPos[] | null;
  limit?: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 270;
const GAP = 5;
const AREA = { x: 34, y: 48, width: 314, height: 196 };
const PANEL_X = 372;

const has = (list: HikerPos[] | undefined | null, r: number, c: number) => !!list?.some(([row, col]) => row === r && col === c);

export function HikerGridView({ state, pick }: { state: HikerGridState; pick?: CellPick }) {
  const { heights, effort, done, here, look } = state;
  const rows = heights.length;
  const cols = heights[0]?.length ?? 1;
  const size = Math.max(26, Math.min(56, Math.floor((AREA.width - (cols - 1) * GAP) / cols), Math.floor((AREA.height - (rows - 1) * GAP) / rows)));
  const step = size + GAP;
  const startX = AREA.x + (AREA.width - (cols * step - GAP)) / 2;
  const startY = AREA.y + (AREA.height - (rows * step - GAP)) / 2;
  const cellX = (c: number) => startX + c * step;
  const cellY = (r: number) => startY + r * step;
  const centre = ([r, c]: HikerPos) => ({ x: cellX(c) + size / 2, y: cellY(r) + size / 2 });
  const big = size >= 40;

  const path = (cells: HikerPos[], shift: number) =>
    cells
      .map((cell, index) => {
        const { x, y } = centre(cell);
        return `${index === 0 ? "M" : "L"}${x + shift} ${y + shift}`;
      })
      .join(" ");

  const list = state.list ?? [];
  const shown = list.slice(0, 6);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A grid of heights; the hiker looks for the trail whose steepest step is smallest">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.limit !== null && state.limit !== undefined ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="accent" anchor="end">
          steps allowed: up to {state.limit}
        </Label>
      ) : null}

      {Array.from({ length: cols }, (_, c) => (
        <text key={`col-${c}`} x={cellX(c) + size / 2} y={startY - 6} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
          {c}
        </text>
      ))}
      {Array.from({ length: rows }, (_, r) => (
        <text key={`row-${r}`} x={startX - 8} y={cellY(r) + size / 2 + 4} textAnchor="end" fontSize={10} fill={VIZ_COLORS.muted}>
          {r}
        </text>
      ))}

      {heights.map((row, r) =>
        row.map((value, c) => {
          const index = r * cols + c;
          const picked = pickTone(pick, index, "idle");
          const isDone = has(done, r, c);
          const isFlood = has(state.flood, r, c);
          let fill = "color-mix(in srgb, var(--foreground) 5%, transparent)";
          let stroke: string = VIZ_COLORS.line;
          if (isFlood) {
            fill = "color-mix(in srgb, var(--accent) 22%, transparent)";
            stroke = VIZ_COLORS.accent;
          }
          if (isDone || picked === "done") {
            fill = "color-mix(in srgb, var(--teal) 30%, transparent)";
            stroke = VIZ_COLORS.teal;
          }
          if (picked === "miss") stroke = VIZ_COLORS.coral;
          const known = effort?.[r]?.[c];
          return (
            <g key={`${r}-${c}`}>
              <rect className={GLIDE} x={cellX(c)} y={cellY(r)} width={size} height={size} rx={6} fill={fill} stroke={stroke} strokeWidth={stroke === VIZ_COLORS.line ? 1 : 1.75} />
              <text x={cellX(c) + size / 2} y={cellY(r) + size / 2 + (big ? 3 : 5)} textAnchor="middle" fontSize={big ? 17 : 13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                {value}
              </text>
              {effort ? (
                <text x={cellX(c) + size / 2} y={cellY(r) + size - 5} textAnchor="middle" fontSize={big ? 10 : 9} fontWeight={600} fill={known === null || known === undefined ? VIZ_COLORS.muted : VIZ_COLORS.accent}>
                  {known === null || known === undefined ? "∞" : `worst ${known}`}
                </text>
              ) : null}
              <RejectedMark pick={pick} index={index} x={cellX(c) + size - 7} y={cellY(r) + 11} />
            </g>
          );
        }),
      )}

      {state.other ? <path d={path(state.other.cells, 4)} fill="none" stroke={VIZ_COLORS.coral} strokeWidth={2.5} strokeDasharray="6 4" strokeLinejoin="round" /> : null}
      {state.route ? <path d={path(state.route.cells, -4)} fill="none" stroke={VIZ_COLORS.teal} strokeWidth={3} strokeLinejoin="round" /> : null}

      {state.step ? (
        <g>
          <line
            x1={centre(state.step.from).x}
            y1={centre(state.step.from).y}
            x2={centre(state.step.to).x}
            y2={centre(state.step.to).y}
            stroke={VIZ_COLORS.accent}
            strokeWidth={3}
            strokeOpacity={0.7}
          />
          <rect
            x={(centre(state.step.from).x + centre(state.step.to).x) / 2 - 16}
            y={(centre(state.step.from).y + centre(state.step.to).y) / 2 - 10}
            width={32}
            height={18}
            rx={5}
            fill="var(--background)"
            stroke={VIZ_COLORS.accent}
          />
          <text x={(centre(state.step.from).x + centre(state.step.to).x) / 2} y={(centre(state.step.from).y + centre(state.step.to).y) / 2 + 3} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
            {state.step.size}
          </text>
        </g>
      ) : null}

      {/* The hiker: one ring that glides from cell to cell. */}
      <rect
        className={GLIDE}
        x={-3}
        y={-3}
        width={size + 6}
        height={size + 6}
        rx={8}
        fill="none"
        stroke={VIZ_COLORS.accent}
        strokeWidth={2.75}
        style={{ transform: `translate(${cellX(here?.[1] ?? 0)}px, ${cellY(here?.[0] ?? 0)}px)`, opacity: here ? 1 : 0 }}
      />
      {look ? <rect x={cellX(look[1]) - 3} y={cellY(look[0]) - 3} width={size + 6} height={size + 6} rx={8} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={2} strokeDasharray="4 3" /> : null}

      <g>
        {state.route ? (
          <text x={PANEL_X} y={62} fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal}>
            ━ {state.route.label}
          </text>
        ) : null}
        {state.other ? (
          <text x={PANEL_X} y={80} fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            ╍ {state.other.label}
          </text>
        ) : null}
        {state.list ? (
          <g>
            <text x={PANEL_X} y={108} fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink}>
              {state.listSorted ? "trails to try, cheapest first" : "trails to try"}
            </text>
            {shown.length === 0 ? (
              <text x={PANEL_X} y={128} fontSize={12} fill={VIZ_COLORS.muted}>
                (empty)
              </text>
            ) : null}
            {shown.map((entry, index) => (
              <text
                key={`list-${index}`}
                x={PANEL_X}
                y={128 + index * 18}
                fontSize={12}
                fontWeight={state.listSorted && index === 0 ? 700 : 500}
                fill={state.listSorted && index === 0 ? VIZ_COLORS.accent : VIZ_COLORS.ink}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                worst {entry.effort} → ({entry.cell[0]},{entry.cell[1]})
              </text>
            ))}
            {list.length > shown.length ? (
              <text x={PANEL_X} y={128 + shown.length * 18} fontSize={11} fill={VIZ_COLORS.muted}>
                + {list.length - shown.length} more
              </text>
            ) : null}
          </g>
        ) : null}
      </g>

      {heights.map((row, r) =>
        row.map((value, c) => (
          <PickTarget
            key={`pick-${r}-${c}`}
            pick={pick}
            index={r * cols + c}
            x={cellX(c) - GAP / 2}
            y={cellY(r) - GAP / 2}
            width={step}
            height={step}
            rx={7}
            label={`Choose the cell in row ${r}, column ${c}, height ${value}`}
          />
        )),
      )}
    </Frame>
  );
}
