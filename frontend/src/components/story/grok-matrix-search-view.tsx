import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A matrix treated as one wrapping ribbon. Draws state only. */

export type MatrixSearchState = {
  grid: number[][];
  target: number;
  /** Flat ends of the remaining ribbon. */
  low: number | null;
  high: number | null;
  mid: number | null;
  /** The trap: the cell you get by mapping with the row count. */
  wrong?: { row: number; col: number } | null;
  found?: { row: number; col: number } | null;
  scan?: { row: number; col: number } | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 268;
const AREA = { x: 48, y: 56, width: 360, height: 196 };
const GAP = 6;
const LEGEND_X = 428;

export function GrokMatrixSearchView({ state, pick }: { state: MatrixSearchState; pick?: CellPick }) {
  const { grid, target, low, high, mid, wrong, found, scan } = state;
  const rows = Math.max(grid.length, 1);
  const cols = Math.max(grid[0]?.length ?? 1, 1);
  const size = Math.max(28, Math.min(52, Math.floor((AREA.width - (cols - 1) * GAP) / cols), Math.floor((AREA.height - (rows - 1) * GAP) / rows)));
  const step = size + GAP;
  const startX = AREA.x + (AREA.width - (cols * step - GAP)) / 2;
  const startY = AREA.y + (AREA.height - (rows * step - GAP)) / 2;
  const cellX = (c: number) => startX + c * step;
  const cellY = (r: number) => startY + r * step;
  const font = size >= 36 ? 14 : 12;
  const flat = (r: number, c: number) => r * cols + c;
  const inRange = (index: number) => low === null || high === null || (index >= low && index <= high);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A matrix as one sorted ribbon written in wrapping lines">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="ink" anchor="end">
        looking for {target}
      </Label>

      {Array.from({ length: cols }, (_, c) => (
        <text key={`c-${c}`} x={cellX(c) + size / 2} y={startY - 8} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
          {c}
        </text>
      ))}
      {Array.from({ length: rows }, (_, r) => (
        <text key={`r-${r}`} x={startX - 10} y={cellY(r) + size / 2 + 4} textAnchor="end" fontSize={10} fill={VIZ_COLORS.muted}>
          {r}
        </text>
      ))}

      {grid.map((row, r) =>
        row.map((value, c) => {
          const index = flat(r, c);
          const picked = pickTone(pick, index, "idle");
          const isMid = mid === index;
          const isWrong = wrong?.row === r && wrong?.col === c;
          const isFound = found?.row === r && found?.col === c;
          const isScan = scan?.row === r && scan?.col === c;
          const faded = !inRange(index);
          let fill = "color-mix(in srgb, var(--steel-800) 40%, transparent)";
          let stroke: string = VIZ_COLORS.line;
          if (isScan || isMid) {
            fill = "color-mix(in srgb, var(--accent) 40%, transparent)";
            stroke = VIZ_COLORS.accent;
          }
          if (isFound || picked === "done") {
            fill = "color-mix(in srgb, var(--teal) 45%, transparent)";
            stroke = VIZ_COLORS.teal;
          }
          if (isWrong || picked === "miss") {
            fill = "color-mix(in srgb, var(--coral) 28%, transparent)";
            stroke = VIZ_COLORS.coral;
          }
          return (
            <g key={`${r}-${c}`} className={GLIDE} style={{ opacity: faded && !isWrong ? 0.3 : 1 }}>
              <rect className={GLIDE} x={cellX(c)} y={cellY(r)} width={size} height={size} rx={6} fill={fill} stroke={stroke} strokeWidth={isMid || isFound || isWrong ? 2 : 1.25} />
              <text x={cellX(c) + size / 2} y={cellY(r) + size / 2 + font / 2 - 2} textAnchor="middle" fontSize={font} fontWeight={600} fill={VIZ_COLORS.ink}>
                {value}
              </text>
              <RejectedMark pick={pick} index={index} x={cellX(c) + size - 8} y={cellY(r) + 12} />
            </g>
          );
        }),
      )}

      <text x={LEGEND_X} y={80} fontSize={11} fill={VIZ_COLORS.ink}>
        ribbon wrap
      </text>
      <text x={LEGEND_X} y={98} fontSize={11} fill={VIZ_COLORS.muted}>
        row = k / cols
      </text>
      <text x={LEGEND_X} y={114} fontSize={11} fill={VIZ_COLORS.muted}>
        col = k % cols
      </text>
      {wrong ? (
        <text x={LEGEND_X} y={140} fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
          ✕ mapped with rows
        </text>
      ) : null}

      {grid.map((row, r) =>
        row.map((_, c) => (
          <PickTarget
            key={`pick-${r}-${c}`}
            pick={pick}
            index={flat(r, c)}
            x={cellX(c) - GAP / 2}
            y={cellY(r) - GAP / 2}
            width={step}
            height={step}
            rx={7}
            label={`Choose the cell ${grid[r][c]}`}
          />
        )),
      )}
    </Frame>
  );
}
