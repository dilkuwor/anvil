import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Picture for a grid sorted along rows and columns: a walker, the rows and columns it has thrown away, and its trail. Draws state only. */

export type StairPos = [number, number];

export type StaircaseState = {
  grid: number[][];
  target: number;
  /** Where the walker stands. `null` hides it (before the start, or after it walked off). */
  walker: StairPos | null;
  /** Rows above this one are thrown away. */
  rowsGone: number;
  /** Columns from this index to the right are thrown away. `null` means none. */
  colsFrom: number | null;
  /** Cells the walker has stood on, in order. */
  trail: StairPos[];
  /** Slow scene: cells already compared one by one. */
  checked?: StairPos[] | null;
  /** Cells the caption points at: teal = still possible / found, coral = ruled out or a problem. */
  mark?: { cells: StairPos[]; tone: "teal" | "coral" } | null;
  /** The trap: at the top-left both moves only go bigger. */
  wrongCorner?: boolean;
  found?: StairPos | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 268;
const GAP = 5;
const AREA = { x: 40, y: 50, width: 360, height: 204 };
const LEGEND_X = 420;

const has = (list: StairPos[] | undefined | null, r: number, c: number) => !!list?.some(([row, col]) => row === r && col === c);

export function StaircaseView({ state, pick }: { state: StaircaseState; pick?: CellPick }) {
  const { grid, walker, rowsGone, colsFrom, trail } = state;
  const rows = Math.max(grid.length, 1);
  const cols = Math.max(grid[0]?.length ?? 1, 1);
  const size = Math.max(22, Math.min(46, Math.floor((AREA.width - (cols - 1) * GAP) / cols), Math.floor((AREA.height - (rows - 1) * GAP) / rows)));
  const step = size + GAP;
  const startX = AREA.x + (AREA.width - (cols * step - GAP)) / 2;
  const startY = AREA.y + (AREA.height - (rows * step - GAP)) / 2;
  const cellX = (c: number) => startX + c * step;
  const cellY = (r: number) => startY + r * step;
  const font = size >= 34 ? 14 : 11;
  const gone = (r: number, c: number) => r < rowsGone || (colsFrom !== null && c >= colsFrom);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A grid sorted along every row and every column, with a walker stepping through it">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="ink" anchor="end">
        looking for {state.target}
      </Label>

      {grid.map((row, r) =>
        row.map((value, c) => {
          const index = r * cols + c;
          const picked = pickTone(pick, index, "idle");
          const isGone = gone(r, c);
          const marked = has(state.mark?.cells, r, c) ? state.mark?.tone : null;
          const isChecked = has(state.checked, r, c);
          const isFound = state.found?.[0] === r && state.found?.[1] === c;
          let fill = "transparent";
          let stroke: string = VIZ_COLORS.line;
          if (isChecked) {
            fill = "color-mix(in srgb, var(--accent) 14%, transparent)";
            stroke = VIZ_COLORS.accent;
          }
          if (marked === "teal" || isFound || picked === "done") {
            fill = "color-mix(in srgb, var(--teal) 40%, transparent)";
            stroke = VIZ_COLORS.teal;
          }
          if (marked === "coral") {
            fill = "color-mix(in srgb, var(--coral) 24%, transparent)";
            stroke = VIZ_COLORS.coral;
          }
          if (picked === "miss") stroke = VIZ_COLORS.coral;
          return (
            <g key={`${r}-${c}`} className={GLIDE} style={{ opacity: isGone && !marked ? 0.28 : 1 }}>
              <rect className={GLIDE} x={cellX(c)} y={cellY(r)} width={size} height={size} rx={6} fill={fill} stroke={stroke} strokeWidth={stroke === VIZ_COLORS.line ? 1 : 1.75} />
              <text x={cellX(c) + size / 2} y={cellY(r) + size / 2 + font / 2 - 1} textAnchor="middle" fontSize={font} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                {value}
              </text>
              <RejectedMark pick={pick} index={index} x={cellX(c) + size - 7} y={cellY(r) + 11} />
            </g>
          );
        }),
      )}

      {/* The staircase the walker has come down so far. */}
      {trail.slice(1).map(([r, c], index) => {
        const [pr, pc] = trail[index];
        return (
          <line
            key={`trail-${index}`}
            x1={cellX(pc) + size / 2}
            y1={cellY(pr) + size / 2}
            x2={cellX(c) + size / 2}
            y2={cellY(r) + size / 2}
            stroke={VIZ_COLORS.accent}
            strokeWidth={2}
            strokeOpacity={0.55}
            strokeDasharray="4 3"
          />
        );
      })}

      {/* The walker: one ring that glides from cell to cell. */}
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
        style={{ transform: `translate(${cellX(walker?.[1] ?? 0)}px, ${cellY(walker?.[0] ?? 0)}px)`, opacity: walker ? 1 : 0 }}
      />

      {state.wrongCorner ? (
        <g>
          <rect x={cellX(0) - 3} y={cellY(0) - 3} width={size + 6} height={size + 6} rx={8} fill="none" stroke={VIZ_COLORS.coral} strokeWidth={2.75} />
          {cols > 1 ? (
            <text x={cellX(1) + size / 2} y={cellY(0) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
              bigger
            </text>
          ) : null}
          {rows > 1 ? (
            <text x={cellX(0) - 5} y={cellY(1) + size / 2 + 4} textAnchor="end" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
              bigger
            </text>
          ) : null}
        </g>
      ) : null}

      <g>
        <rect x={LEGEND_X} y={70} width={14} height={14} rx={4} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={2.5} />
        <text x={LEGEND_X + 22} y={81} fontSize={11} fill={VIZ_COLORS.ink}>
          the walker
        </text>
        <rect x={LEGEND_X} y={96} width={14} height={14} rx={3} fill="transparent" stroke={VIZ_COLORS.line} opacity={0.35} />
        <text x={LEGEND_X + 22} y={107} fontSize={11} fill={VIZ_COLORS.ink}>
          thrown away
        </text>
        <text x={LEGEND_X} y={136} fontSize={11} fill={VIZ_COLORS.muted}>
          rows grow →
        </text>
        <text x={LEGEND_X} y={154} fontSize={11} fill={VIZ_COLORS.muted}>
          columns grow ↓
        </text>
        {state.wrongCorner ? (
          <text x={LEGEND_X} y={184} fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ no smaller move
          </text>
        ) : null}
      </g>

      {grid.map((row, r) =>
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
            label={`Choose the cell ${value}`}
          />
        )),
      )}
    </Frame>
  );
}
