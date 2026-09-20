import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A row of walls, and one water tank between two of them. Draws state only. */

export type ContainerWaterState = {
  heights: number[];
  /** The tank's two walls. `null` means no tank is drawn. */
  left: number | null;
  right: number | null;
  /** How much of the measurement is on show: nothing, the width, the water, or width × water height. */
  measure: "none" | "width" | "water" | "area";
  /** "best" paints the tank teal: it is the best so far, or the answer. */
  tone: "open" | "best";
  /** The wall that holds the water down, painted coral. Never set on a quiz frame. */
  limit?: number | null;
  /** Shows the space above the water, where it would spill over the shorter wall. */
  spill?: boolean;
  /** The Taller Wall Trap: the narrower tank you would get by moving the wrong wall. */
  trap?: { left: number; right: number } | null;
  best: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 268;
const BASE_Y = 200;
const MAX_BAR_H = 120;
const SIDE = 50;
const BAR_W = 14;
const NOTE_Y = 48;

const BAR_FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-700) 40%, transparent)",
  faded: "color-mix(in srgb, var(--steel-700) 40%, transparent)",
  window: "color-mix(in srgb, var(--accent) 35%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 35%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 45%, transparent)",
  done: "color-mix(in srgb, var(--teal) 45%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 40%, transparent)",
};

const BAR_STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  faded: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  done: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
};

export function ContainerWaterView({ state, pick }: { state: ContainerWaterState; pick?: CellPick }) {
  const { heights, left, right, measure, best, trap } = state;
  const count = heights.length;
  const tallest = Math.max(...heights, 1);
  const gap = count > 1 ? (WIDTH - 2 * SIDE) / (count - 1) : 0;
  const barX = (index: number) => (count > 1 ? SIDE + index * gap : WIDTH / 2);
  const barH = (value: number) => (value / tallest) * MAX_BAR_H;
  const clampX = (x: number) => Math.min(WIDTH - 130, Math.max(130, x));

  const tank = left !== null && right !== null && right > left;
  const width = tank ? right - left : 0;
  const water = tank ? Math.min(heights[left], heights[right]) : 0;
  const waterH = barH(water);
  const showWater = tank && (measure === "water" || measure === "area");
  const color = state.tone === "best" ? VIZ_COLORS.teal : VIZ_COLORS.accent;
  const tankFill = state.tone === "best" ? "color-mix(in srgb, var(--teal) 26%, transparent)" : "color-mix(in srgb, var(--accent) 16%, transparent)";
  const middle = tank ? clampX((barX(left) + barX(right)) / 2) : WIDTH / 2;

  const toneOf = (index: number): CellTone => {
    if (index === state.limit) return "miss";
    if (index === left || index === right) return state.tone === "best" ? "done" : "edge";
    return left !== null && right !== null ? "faded" : "idle";
  };

  const measureText = measure === "width" ? `${width} wide` : measure === "water" ? `water ${water} high` : `${width} wide × ${water} high = ${width * water}`;
  const trapWater = trap ? Math.min(heights[trap.left], heights[trap.right]) : 0;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A row of walls with a water tank between two of them">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {best !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          best = {best}
        </Label>
      ) : null}

      <line x1={30} y1={BASE_Y} x2={WIDTH - 30} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={2} />

      {/* The water: one shape that stretches and shrinks with the walls. */}
      <rect
        className={GLIDE}
        rx={3}
        fill={tankFill}
        stroke={color}
        strokeOpacity={0.6}
        strokeWidth={1.25}
        style={{
          x: tank ? barX(left) : WIDTH / 2,
          y: BASE_Y - (showWater ? waterH : 0),
          width: tank ? barX(right) - barX(left) : 0,
          height: showWater ? waterH : 0,
          opacity: showWater ? 1 : 0,
        }}
      />

      {/* Where water would spill: above the shorter wall, up to the taller one. */}
      {state.spill && tank ? (
        <g>
          <rect
            x={barX(left)}
            y={BASE_Y - barH(Math.max(heights[left], heights[right]))}
            width={barX(right) - barX(left)}
            height={barH(Math.max(heights[left], heights[right])) - waterH}
            fill="color-mix(in srgb, var(--coral) 10%, transparent)"
            stroke={VIZ_COLORS.coral}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <text x={middle} y={NOTE_Y} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ spills over the shorter wall
          </text>
        </g>
      ) : null}

      {/* The Taller Wall Trap: a narrower tank whose water is no higher. */}
      {trap ? (
        <g>
          <rect
            x={barX(trap.left)}
            y={BASE_Y - barH(trapWater)}
            width={barX(trap.right) - barX(trap.left)}
            height={barH(trapWater)}
            fill="color-mix(in srgb, var(--coral) 14%, transparent)"
            stroke={VIZ_COLORS.coral}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <text x={clampX((barX(trap.left) + barX(trap.right)) / 2)} y={NOTE_Y} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ narrower, water no higher: only {(trap.right - trap.left) * trapWater}
          </text>
        </g>
      ) : null}

      {heights.map((value, index) => {
        const tone = pickTone(pick, index, toneOf(index));
        const x = barX(index);
        const height = barH(value);
        const isWall = index === left || index === right;
        return (
          <g key={index} className={GLIDE} opacity={tone === "faded" ? 0.4 : 1}>
            <rect className={GLIDE} x={x - BAR_W / 2} y={BASE_Y - height} width={BAR_W} height={height} rx={4} fill={BAR_FILL[tone]} stroke={BAR_STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 2.25} />
            <text x={x} y={BASE_Y - height - 7} textAnchor="middle" fontSize={12} fontWeight={isWall ? 700 : 600} fill={tone === "idle" || tone === "faded" ? VIZ_COLORS.muted : BAR_STROKE[tone]}>
              {value}
            </text>
            <text x={x} y={BASE_Y + 14} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
              {index}
            </text>
            {/* At the foot of the wall itself, clear of the numbers above and below. */}
            <RejectedMark pick={pick} index={index} x={x} y={BASE_Y - 4} />
          </g>
        );
      })}

      {/* Wall names. When the two walls meet they share one label instead of printing on top of each other. */}
      {left !== null ? (
        <text x={barX(left)} y={BASE_Y + 30} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
          {left === right ? "walls meet" : "left"}
        </text>
      ) : null}
      {right !== null && right !== left ? (
        <text x={barX(right)} y={BASE_Y + 30} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
          right
        </text>
      ) : null}

      {tank && measure !== "none" ? (
        <g>
          {measure !== "water" ? (
            <path
              d={`M${barX(left)} ${BASE_Y + 36} v6 M${barX(left)} ${BASE_Y + 39} H${barX(right)} M${barX(right)} ${BASE_Y + 36} v6`}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
            />
          ) : null}
          <text x={middle} y={BASE_Y + 58} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>
            {measureText}
          </text>
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point at a wall. */}
      {heights.map((value, index) => {
        const reach = Math.min(gap > 0 ? gap : 64, 64);
        return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={barX(index) - reach / 2} y={58} width={reach} height={BASE_Y + 20 - 58} label={`Choose wall ${index}, height ${value}`} />;
      })}
    </Frame>
  );
}
