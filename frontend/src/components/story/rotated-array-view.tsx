import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A row of bars: two ramps with a cliff between them. Draws state only. */

export type RotatedArrayState = {
  nums: number[];
  target: number;
  /** One tone per bar. "faded" = thrown away. */
  tones: CellTone[];
  /** Left flag. */
  low: number | null;
  /** The middle bar we look at. */
  mid: number | null;
  /** Right flag. */
  high: number | null;
  /** The slow way's finger, walking bar by bar. */
  scan?: number | null;
  /** The trap: the way plain binary search would have gone. */
  wrongWay?: { from: number; to: number } | null;
  /** The trap's cost: the target bar that was thrown away. */
  lost?: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 262;
const BASE_Y = 190;
const MIN_BAR = 26;
const MAX_BAR = 130;
const ARROW_Y = 50;
// Every marker owns a row, so two markers on the same bar never print over each other.
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

export function RotatedArrayView({ state, pick }: { state: RotatedArrayState; pick?: CellPick }) {
  const { nums, target, low, mid, high, scan, wrongWay, lost } = state;
  const count = Math.max(nums.length, 1);
  const minVal = Math.min(...nums, Infinity);
  const maxVal = Math.max(...nums, -Infinity);
  const span = Math.max(maxVal - minVal, 1);

  // Sizes come from the data, so a long row still fits.
  const step = Math.min(56, (WIDTH - 48) / count);
  const barW = step - Math.min(8, step * 0.2);
  const startX = (WIDTH - step * count) / 2;
  const barX = (index: number) => startX + index * step + (step - barW) / 2;
  const centerX = (index: number) => startX + index * step + step / 2;
  const barH = (value: number) => MIN_BAR + ((value - minVal) / span) * (MAX_BAR - MIN_BAR);
  const small = step < 34;
  const inRow = (index: number | null | undefined): index is number => index !== null && index !== undefined && index >= 0 && index < nums.length;
  const clampX = (x: number, half: number) => Math.min(WIDTH - half - 8, Math.max(half + 8, x));

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A row of bars: a ramp, a cliff, and another ramp">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="ink" anchor="end">
        target = {target}
      </Label>

      <line x1={startX - 6} y1={BASE_Y} x2={WIDTH - startX + 6} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />

      {nums.map((value, index) => {
        const tone = pickTone(pick, index, state.tones[index] ?? "idle");
        const height = barH(value);
        const strong = tone !== "idle" && tone !== "faded";
        return (
          <g key={index} className={GLIDE} style={{ opacity: tone === "faded" ? 0.3 : 1 }}>
            <rect className={GLIDE} x={barX(index)} y={BASE_Y - height} width={barW} height={height} rx={4} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={strong ? 2 : 1.25} />
            <text x={centerX(index)} y={BASE_Y - height + 16} textAnchor="middle" fontSize={small ? 10 : 13} fontWeight={600} fill={VIZ_COLORS.ink}>
              {value}
            </text>
            <text x={centerX(index)} y={BASE_Y + 14} textAnchor="middle" fontSize={small ? 9 : 10} fill={VIZ_COLORS.muted}>
              {index}
            </text>
          </g>
        );
      })}

      {/* Above the bar, clear of the value inside it and of the markers below it. */}
      {nums.map((value, index) => (
        <RejectedMark key={`no-${index}`} pick={pick} index={index} x={centerX(index)} y={BASE_Y - barH(value) - 5} />
      ))}

      <Marker x={inRow(low) ? centerX(low) : startX} y={ROW.left} label="left" color={VIZ_COLORS.accent} hidden={!inRow(low)} />
      <Marker x={inRow(high) ? centerX(high) : WIDTH - startX} y={ROW.right} label="right" color={VIZ_COLORS.accent} hidden={!inRow(high)} />
      <Marker x={inRow(mid) ? centerX(mid) : WIDTH / 2} y={ROW.mid} label="middle" color={VIZ_COLORS.ink} hidden={!inRow(mid) || inRow(lost)} />
      <Marker x={inRow(scan) ? centerX(scan) : startX} y={ROW.left} label="look" color={VIZ_COLORS.accent} hidden={!inRow(scan)} />

      {wrongWay && inRow(wrongWay.from) && inRow(wrongWay.to) ? (
        <g>
          <line x1={centerX(wrongWay.from)} y1={ARROW_Y} x2={centerX(wrongWay.to)} y2={ARROW_Y} stroke={VIZ_COLORS.coral} strokeWidth={2.25} strokeDasharray="5 4" />
          <path d={wrongWay.to < wrongWay.from ? `M${centerX(wrongWay.to)} ${ARROW_Y - 5} l-9 5 l9 5 Z` : `M${centerX(wrongWay.to)} ${ARROW_Y - 5} l9 5 l-9 5 Z`} fill={VIZ_COLORS.coral} />
          <text x={clampX((centerX(wrongWay.from) + centerX(wrongWay.to)) / 2, 112)} y={ARROW_Y - 9} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ plain binary search goes this way
          </text>
        </g>
      ) : null}

      {inRow(lost) ? (
        <text x={clampX(centerX(lost), 70)} y={ROW.mid} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
          ✕ the target was here
        </text>
      ) : null}

      {/* Click targets sit on top, one per bar, the full height of the picture. */}
      {nums.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={startX + index * step} y={ARROW_Y + 4} width={step} height={BASE_Y + 20 - ARROW_Y - 4} label={`Choose the bar at position ${index}`} />
      ))}
    </Frame>
  );
}
