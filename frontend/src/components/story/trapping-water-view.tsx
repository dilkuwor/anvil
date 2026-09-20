import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Ground bars seen from the side, the water over them, and two walls closing in. Draws state only. */

export type TrappingWaterState = {
  heights: number[];
  /** Squares of water standing over each bar. */
  water: number[];
  /** The bars the two markers stand on. */
  left: number | null;
  right: number | null;
  /** Height of the tallest bar each side has passed. Drawn as a level line from that end to its marker. */
  leftWall: number | null;
  rightWall: number | null;
  /** The bar being handled right now. */
  focus?: number | null;
  /** The lower wall, drawn bold: it decides. Never set on a quiz frame. */
  deciding?: "left" | "right" | null;
  /** The slow way: one bar, and the tallest bar found on each side of it. */
  look?: { index: number; holders: number[] } | null;
  /** Water that cannot stay: drawn in coral over one bar, up to `level`. */
  spill?: { index: number; level: number; note: string } | null;
  total: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 262;
const BASE_Y = 196;
const MAX_BAR_H = 112;
const SIDE = 50;
const NOTE_Y = 66;
const WALL_LABEL_Y = 44;

const BAR_FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-700) 45%, transparent)",
  faded: "color-mix(in srgb, var(--steel-700) 45%, transparent)",
  window: "color-mix(in srgb, var(--accent) 22%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 35%, transparent)",
  done: "color-mix(in srgb, var(--teal) 50%, transparent)",
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

export function TrappingWaterView({ state, pick }: { state: TrappingWaterState; pick?: CellPick }) {
  const { heights, water, left, right, leftWall, rightWall, spill } = state;
  const count = Math.max(heights.length, 1);
  const tallest = Math.max(...heights, 1);
  const slot = (WIDTH - 2 * SIDE) / count;
  const barW = Math.min(40, slot * 0.8);
  const barX = (index: number) => SIDE + index * slot + (slot - barW) / 2;
  const midX = (index: number) => barX(index) + barW / 2;
  const levelY = (value: number) => BASE_Y - (value / tallest) * MAX_BAR_H;
  const clampX = (x: number) => Math.min(WIDTH - 110, Math.max(110, x));
  const met = left !== null && left === right;

  const toneOf = (index: number): CellTone => {
    if (state.look?.holders.includes(index)) return "hit";
    if (index === state.focus || index === state.look?.index) return "edge";
    if (index === left || index === right) return "window";
    return "idle";
  };

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Ground bars seen from the side, with rain water standing between them">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.total !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          total water = {state.total}
        </Label>
      ) : null}

      <line x1={30} y1={BASE_Y} x2={WIDTH - 30} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={2} />

      {heights.map((value, index) => {
        const tone = pickTone(pick, index, toneOf(index));
        const units = water[index] ?? 0;
        const top = levelY(value);
        const waterTop = levelY(value + units);
        return (
          <g key={index}>
            {/* The water over this bar: it rises from the bar's top. */}
            <rect
              className={GLIDE}
              x={barX(index)}
              width={barW}
              rx={2}
              fill="color-mix(in srgb, var(--teal) 38%, transparent)"
              stroke={VIZ_COLORS.teal}
              strokeWidth={1}
              style={{ y: waterTop, height: top - waterTop, opacity: units > 0 ? 1 : 0 }}
            />
            {units > 0 && top - waterTop >= 15 ? (
              <text x={midX(index)} y={(top + waterTop) / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal}>
                {units}
              </text>
            ) : null}
            <rect className={GLIDE} x={barX(index)} y={top} width={barW} height={BASE_Y - top} rx={3} fill={BAR_FILL[tone]} stroke={BAR_STROKE[tone]} strokeWidth={tone === "idle" ? 1 : 2} />
            {/* The height goes under the ground line, so water never covers it. */}
            <text x={midX(index)} y={BASE_Y + 15} textAnchor="middle" fontSize={12} fontWeight={600} fill={tone === "idle" ? VIZ_COLORS.muted : BAR_STROKE[tone]}>
              {value}
            </text>
            <RejectedMark pick={pick} index={index} x={midX(index)} y={BASE_Y - 4} />
          </g>
        );
      })}

      {/* The two walls: a level line from each end to its marker. Their labels sit in the top corners, clear of every bar. */}
      {left !== null && leftWall !== null ? (
        <g>
          <line x1={barX(0) - 6} y1={levelY(leftWall)} x2={barX(left) + barW} y2={levelY(leftWall)} stroke={VIZ_COLORS.accent} strokeWidth={state.deciding === "left" ? 3 : 1.5} strokeDasharray={state.deciding === "left" ? undefined : "5 4"} />
          <text x={16} y={WALL_LABEL_Y} textAnchor="start" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
            left wall {leftWall}
          </text>
        </g>
      ) : null}
      {right !== null && rightWall !== null ? (
        <g>
          <line x1={barX(right)} y1={levelY(rightWall)} x2={barX(heights.length - 1) + barW + 6} y2={levelY(rightWall)} stroke={VIZ_COLORS.accent} strokeWidth={state.deciding === "right" ? 3 : 1.5} strokeDasharray={state.deciding === "right" ? undefined : "5 4"} />
          <text x={WIDTH - 16} y={WALL_LABEL_Y} textAnchor="end" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
            right wall {rightWall}
          </text>
        </g>
      ) : null}

      {/* Water that cannot stay. */}
      {spill ? (
        <g>
          <rect
            x={barX(spill.index)}
            y={levelY(spill.level)}
            width={barW}
            height={levelY(heights[spill.index]) - levelY(spill.level)}
            fill="color-mix(in srgb, var(--coral) 16%, transparent)"
            stroke={VIZ_COLORS.coral}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <text x={clampX(midX(spill.index))} y={NOTE_Y} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            {spill.note}
          </text>
        </g>
      ) : null}

      {/* Markers. When both stand on the same bar they share one label instead of printing on top of each other. */}
      {left !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${midX(left)}px, ${BASE_Y + 22}px)` }}>
          <path d="M0 0 L-6 8 L6 8 Z" fill={VIZ_COLORS.accent} />
          <text x={0} y={22} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
            {met ? "left = right" : "left"}
          </text>
        </g>
      ) : null}
      {right !== null && !met ? (
        <g className={GLIDE} style={{ transform: `translate(${midX(right)}px, ${BASE_Y + 22}px)` }}>
          <path d="M0 0 L-6 8 L6 8 Z" fill={VIZ_COLORS.accent} />
          <text x={0} y={22} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
            right
          </text>
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point at a bar. */}
      {heights.map((value, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={SIDE + index * slot} y={70} width={slot} height={BASE_Y + 48 - 70} label={`Choose the bar ${value} high, number ${index + 1} from the left`} />
      ))}
    </Frame>
  );
}
