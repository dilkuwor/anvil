import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A sliding frame of k boxes plus a champion line of seat numbers. Copied from the waiting-room view. */

export type DequeWindowState = {
  values: number[];
  tones: CellTone[];
  /** The box the head is reading. */
  here: number | null;
  /** Left edge of the k-wide frame. */
  frameLeft: number | null;
  /** Right edge of the k-wide frame. */
  frameRight: number | null;
  /** Seat numbers in the line, front first. */
  line: number[];
  /** Window maxes written so far. */
  out: (number | null)[];
  /** A line of scores with no seat numbers: the trap. */
  trapValues?: number[] | null;
  lineLit?: boolean;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 278;
const BASE_Y = 148;
const MAX_H = 72;
const MIN_H = 22;
const AREA_X = 48;
const AREA_W = 340;
const LINE_X = 408;
const LINE_Y = 36;
const LINE_W = 136;
const LINE_H = 168;

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-700) 30%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 22%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 30%, transparent)",
  done: "color-mix(in srgb, var(--teal) 48%, transparent)",
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

export function DequeWindowView({ state, pick }: { state: DequeWindowState; pick?: CellPick }) {
  const { values, here, frameLeft, frameRight, line, out } = state;
  const count = Math.max(values.length, 1);
  const low = Math.min(...values);
  const spread = Math.max(Math.max(...values) - low, 1);
  const slot = Math.min(52, AREA_W / count);
  const barW = Math.min(36, slot - 8);
  const startX = AREA_X + (AREA_W - slot * count) / 2;
  const barX = (index: number) => startX + index * slot + (slot - barW) / 2;
  const midX = (index: number) => barX(index) + barW / 2;
  const barH = (value: number) => MIN_H + ((value - low) / spread) * (MAX_H - MIN_H);
  const seatH = Math.min(28, Math.floor((LINE_H - 36) / Math.max(count, 1)));
  const framed = frameLeft !== null && frameRight !== null && frameRight >= frameLeft;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A sliding frame of numbers beside a champion line of seat numbers">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {framed ? (
        <rect
          className={GLIDE}
          x={barX(frameLeft) - 6}
          y={BASE_Y - MAX_H - 18}
          width={barX(frameRight) + barW + 6 - (barX(frameLeft) - 6)}
          height={MAX_H + 40}
          rx={10}
          fill="color-mix(in srgb, var(--accent) 10%, transparent)"
          stroke={VIZ_COLORS.accent}
          strokeOpacity={0.5}
        />
      ) : null}

      <line x1={AREA_X - 8} y1={BASE_Y} x2={AREA_X + AREA_W + 8} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />

      {values.map((value, index) => {
        const tone = pickTone(pick, index, state.tones[index] ?? "idle");
        const height = barH(value);
        const top = BASE_Y - height;
        return (
          <g key={index} opacity={tone === "faded" ? 0.4 : 1} className={GLIDE}>
            <rect className={GLIDE} x={barX(index)} y={top} width={barW} height={height} rx={4} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 2} />
            <text x={midX(index)} y={top - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink}>
              {value}
            </text>
            <text x={midX(index)} y={BASE_Y + 16} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
              {index}
            </text>
            <RejectedMark pick={pick} index={index} x={midX(index)} y={BASE_Y - 8} />
          </g>
        );
      })}

      {here !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${midX(here)}px, ${BASE_Y - barH(values[here]) - 20}px)` }}>
          <path d="M0 0 L-5 -8 L5 -8 Z" fill={VIZ_COLORS.accent} />
          <text x={0} y={-12} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
            head
          </text>
        </g>
      ) : null}

      <rect
        x={LINE_X}
        y={LINE_Y}
        width={LINE_W}
        height={LINE_H}
        rx={10}
        fill={state.lineLit ? "color-mix(in srgb, var(--teal) 12%, transparent)" : "color-mix(in srgb, var(--steel-900) 55%, transparent)"}
        stroke={state.trapValues ? VIZ_COLORS.coral : state.lineLit ? VIZ_COLORS.teal : VIZ_COLORS.line}
        strokeWidth={1.5}
      />
      <text x={LINE_X + LINE_W / 2} y={LINE_Y - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={state.trapValues ? VIZ_COLORS.coral : VIZ_COLORS.accent}>
        {state.trapValues ? "scores only" : "front"}
      </text>
      <text x={LINE_X + LINE_W / 2} y={LINE_Y + 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
        champion line
      </text>
      {line.length === 0 && !state.trapValues ? (
        <text x={LINE_X + LINE_W / 2} y={LINE_Y + 48} textAnchor="middle" fontSize={12} fill={VIZ_COLORS.muted}>
          (empty)
        </text>
      ) : null}
      {(state.trapValues ?? line).map((item, position) => {
        const score = state.trapValues ? item : values[item];
        const label = state.trapValues ? `${score}` : `seat ${item} · ${score}`;
        return (
          <g key={`${item}-${position}`} className={GLIDE} style={{ transform: `translate(${LINE_X + 10}px, ${LINE_Y + 28 + position * seatH}px)` }}>
            <rect
              width={LINE_W - 20}
              height={seatH - 4}
              rx={5}
              fill={position === 0 ? "color-mix(in srgb, var(--teal) 22%, transparent)" : "color-mix(in srgb, var(--accent) 16%, transparent)"}
              stroke={state.trapValues && position === 0 ? VIZ_COLORS.coral : VIZ_COLORS.accent}
              strokeWidth={position === 0 ? 1.75 : 1}
            />
            <text x={(LINE_W - 20) / 2} y={(seatH - 4) / 2 + 4} textAnchor="middle" fontSize={seatH < 22 ? 10 : 11.5} fontWeight={600} fill={VIZ_COLORS.ink}>
              {label}
            </text>
          </g>
        );
      })}
      {state.trapValues ? (
        <text x={LINE_X + LINE_W / 2} y={LINE_Y + LINE_H + 16} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
          ✕ no seat: who left?
        </text>
      ) : null}

      <Label x={AREA_X} y={BASE_Y + 40} size={12} weight={600}>
        maxes
      </Label>
      {out.map((max, index) => (
        <g key={`out-${index}`} className={GLIDE} style={{ transform: `translate(${AREA_X + 52 + index * 42}px, ${BASE_Y + 26}px)` }}>
          <rect width={36} height={24} rx={6} fill={max === null ? "transparent" : "color-mix(in srgb, var(--teal) 22%, transparent)"} stroke={max === null ? VIZ_COLORS.line : VIZ_COLORS.teal} />
          <text x={18} y={16} textAnchor="middle" fontSize={12} fontWeight={700} fill={max === null ? VIZ_COLORS.muted : VIZ_COLORS.teal}>
            {max === null ? "·" : max}
          </text>
        </g>
      ))}

      {values.map((value, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={barX(index) - 4} y={BASE_Y - MAX_H - 22} width={barW + 8} height={MAX_H + 44} label={`Choose seat ${index}, value ${value}`} />
      ))}
    </Frame>
  );
}
