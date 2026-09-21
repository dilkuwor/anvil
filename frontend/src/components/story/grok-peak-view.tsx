import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Bars with a middle bar and its right-hand neighbour. A ghost box past the last bar is the trap. Draws state only. */

export type PeakArrayState = {
  nums: number[];
  tones: CellTone[];
  low: number | null;
  mid: number | null;
  high: number | null;
  /** The right-hand neighbour of the middle bar. */
  neighbour?: number | null;
  scan?: number | null;
  /** Draw a ghost box past the last bar (reading off the end). */
  offEnd?: boolean;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 262;
const BASE_Y = 190;
const MIN_BAR = 26;
const MAX_BAR = 130;
const ARROW_Y = 50;
const ROW = { left: BASE_Y + 31, right: BASE_Y + 45, mid: BASE_Y + 59 };

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-800) 40%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 28%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
  done: "color-mix(in srgb, var(--teal) 50%, transparent)",
  faded: "transparent",
};

const STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  done: VIZ_COLORS.teal,
  faded: VIZ_COLORS.line,
};

function Marker({ x, y, label, color, hidden }: { x: number; y: number; label: string; color: string; hidden: boolean }) {
  return (
    <g className={GLIDE} style={{ transform: `translate(${x}px, ${y}px)`, opacity: hidden ? 0 : 1 }}>
      <text x={0} y={0} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );
}

export function GrokPeakView({ state, pick }: { state: PeakArrayState; pick?: CellPick }) {
  const { nums, low, mid, high, neighbour, scan, offEnd } = state;
  const count = Math.max(nums.length, 1);
  const minVal = Math.min(...nums, Infinity);
  const maxVal = Math.max(...nums, -Infinity);
  const span = Math.max(maxVal - minVal, 1);
  const extra = offEnd ? 1 : 0;
  const step = Math.min(56, (WIDTH - 48) / (count + extra));
  const barW = step - Math.min(8, step * 0.2);
  const startX = (WIDTH - step * (count + extra)) / 2;
  const barX = (index: number) => startX + index * step + (step - barW) / 2;
  const centerX = (index: number) => startX + index * step + step / 2;
  const barH = (value: number) => MIN_BAR + ((value - minVal) / span) * (MAX_BAR - MIN_BAR);
  const small = step < 34;
  const inRow = (index: number | null | undefined): index is number => index !== null && index !== undefined && index >= 0 && index < nums.length;
  const ghostX = centerX(nums.length);
  const ghostH = MIN_BAR + 20;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A row of hills. The middle bar looks at its right-hand neighbour to walk uphill">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      <line x1={startX - 6} y1={BASE_Y} x2={WIDTH - startX + 6} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />

      {nums.map((value, index) => {
        const tone = pickTone(pick, index, state.tones[index] ?? "idle");
        const height = barH(value);
        const strong = tone !== "idle" && tone !== "faded";
        const isNeighbour = neighbour === index;
        return (
          <g key={index} className={GLIDE} style={{ opacity: tone === "faded" ? 0.3 : 1 }}>
            <rect className={GLIDE} x={barX(index)} y={BASE_Y - height} width={barW} height={height} rx={4} fill={FILL[tone]} stroke={isNeighbour ? VIZ_COLORS.accent : STROKE[tone]} strokeWidth={isNeighbour || strong ? 2 : 1.25} strokeDasharray={isNeighbour ? "4 3" : undefined} />
            <text x={centerX(index)} y={BASE_Y - height + 16} textAnchor="middle" fontSize={small ? 10 : 13} fontWeight={600} fill={VIZ_COLORS.ink}>
              {value}
            </text>
            <text x={centerX(index)} y={BASE_Y + 14} textAnchor="middle" fontSize={small ? 9 : 10} fill={VIZ_COLORS.muted}>
              {index}
            </text>
            {isNeighbour ? (
              <text x={centerX(index)} y={BASE_Y - height - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
                neighbour
              </text>
            ) : null}
          </g>
        );
      })}

      {offEnd ? (
        <g className={GLIDE} style={{ opacity: 0.9 }}>
          <rect x={barX(nums.length)} y={BASE_Y - ghostH} width={barW} height={ghostH} rx={4} fill="color-mix(in srgb, var(--coral) 18%, transparent)" stroke={VIZ_COLORS.coral} strokeWidth={2} strokeDasharray="4 3" />
          <text x={ghostX} y={BASE_Y - ghostH + 16} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.coral}>
            no bar
          </text>
          <text x={ghostX} y={ARROW_Y + 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ off the end
          </text>
        </g>
      ) : null}

      {nums.map((value, index) => (
        <RejectedMark key={`no-${index}`} pick={pick} index={index} x={centerX(index)} y={BASE_Y - barH(value) - 5} />
      ))}
      {offEnd ? <RejectedMark pick={pick} index={nums.length} x={ghostX} y={BASE_Y - ghostH - 5} /> : null}

      <Marker x={inRow(low) ? centerX(low) : startX} y={ROW.left} label="left" color={VIZ_COLORS.accent} hidden={!inRow(low)} />
      <Marker x={inRow(high) ? centerX(high) : WIDTH - startX} y={ROW.right} label="right" color={VIZ_COLORS.accent} hidden={!inRow(high)} />
      <Marker x={inRow(mid) ? centerX(mid) : WIDTH / 2} y={ROW.mid} label="middle" color={VIZ_COLORS.ink} hidden={!inRow(mid)} />
      <Marker x={inRow(scan) ? centerX(scan) : startX} y={ROW.left} label="look" color={VIZ_COLORS.accent} hidden={!inRow(scan)} />

      {nums.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={startX + index * step} y={ARROW_Y + 4} width={step} height={BASE_Y + 20 - ARROW_Y - 4} label={`Choose the bar at position ${index}`} />
      ))}
      {offEnd ? (
        <PickTarget pick={pick} index={nums.length} x={startX + nums.length * step} y={ARROW_Y + 4} width={step} height={BASE_Y + 20 - ARROW_Y - 4} label="Choose the empty place past the last bar" />
      ) : null}
    </Frame>
  );
}
