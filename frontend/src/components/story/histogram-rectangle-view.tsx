import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A row of bars, one rectangle drawn on them, and the list of bars whose rectangle is still growing. Draws state only. */

export type HistogramRectState = {
  heights: number[];
  tones: CellTone[];
  /** The bar that is arriving. Equal to the number of bars when the row has ended. */
  arriving: number | null;
  /** Bar numbers whose rectangle is still growing. The last one arrived last. */
  growing: number[];
  /** The rectangle being talked about, drawn on the bars it covers. */
  rect?: { left: number; right: number; height: number; tone: "measure" | "best" | "wrong"; label: string } | null;
  /** The too-narrow width a careless reader would use, shown in coral under the right one. */
  wrongSpan?: { left: number; right: number; label: string } | null;
  best: number | null;
  counter?: { label: string; value: number } | null;
  /** True while a question may be answered with "nobody": draws that box as a real target (cell index = number of bars). */
  askNobody?: boolean;
  /** Highlights the growing list itself, for the frame about memory. */
  growingLit?: boolean;
};

const WIDTH = 560;
const HEIGHT = 280;
const BASE_Y = 190;
const MAX_H = 118;
const MIN_H = 8;
const AREA_X = 48;
const AREA_W = 352;
const LIST_X = 416;
const LIST_Y = 30;
const LIST_W = 128;
const LIST_H = 196;
const NOBODY_Y = 234;

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

export function HistogramRectangleView({ state, pick }: { state: HistogramRectState; pick?: CellPick }) {
  const { heights, arriving, growing, rect, wrongSpan } = state;
  const count = Math.max(heights.length, 1);
  const tallest = Math.max(...heights, 1);
  // One extra slot after the last bar is kept for "the row ends".
  const slot = Math.min(58, AREA_W / (count + 1));
  const barW = Math.min(42, slot - 8);
  const startX = AREA_X + (AREA_W - slot * (count + 1)) / 2;
  const barX = (index: number) => startX + index * slot + (slot - barW) / 2;
  const midX = (index: number) => barX(index) + barW / 2;
  const barH = (height: number) => Math.max(MIN_H, (height / tallest) * MAX_H);
  const clampMid = (x: number, half: number) => Math.min(Math.max(x, 16 + half), LIST_X - 8 - half);

  // The list fits every bar at once, which is the worst case.
  const seatH = Math.min(26, Math.floor((LIST_H - 34) / count));
  const seatFont = seatH < 20 ? 10 : 11;
  const nobodyPicked = pick?.picked === count;
  const nobodyWrong = (nobodyPicked && pick?.answer !== count) || (pick?.rejected?.includes(count) ?? false);
  const rectColor = rect?.tone === "wrong" ? VIZ_COLORS.coral : VIZ_COLORS.teal;
  const ended = arriving !== null && arriving >= heights.length;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A row of bars with a rectangle drawn on them, beside the list of bars whose rectangle is still growing">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.best !== null ? (
        <Label x={LIST_X - 12} y={20} size={13} weight={600} tone="teal" anchor="end">
          best area = {state.best}
        </Label>
      ) : null}

      <line x1={AREA_X - 8} y1={BASE_Y} x2={AREA_X + AREA_W} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />
      <Label x={16} y={BASE_Y + 17} size={11} weight={600}>
        bar
      </Label>

      {heights.map((height, index) => {
        const tone = pickTone(pick, index, state.tones[index] ?? "idle");
        const tall = barH(height);
        const top = BASE_Y - tall;
        return (
          <g key={index} opacity={tone === "faded" ? 0.4 : 1} className={GLIDE}>
            <rect className={GLIDE} x={barX(index)} y={top} width={barW} height={tall} rx={3} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 2} />
            <text x={midX(index)} y={top - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
              {height}
            </text>
            <text x={midX(index)} y={BASE_Y + 17} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
              {index}
            </text>
          </g>
        );
      })}

      {/* The rectangle, drawn on the bars it covers. Its size is written under the row, clear of every label. */}
      {rect ? (
        <g>
          <rect
            x={barX(rect.left) - 2}
            y={BASE_Y - barH(rect.height)}
            width={barX(rect.right) + barW + 2 - (barX(rect.left) - 2)}
            height={barH(rect.height)}
            rx={3}
            fill={rect.tone === "wrong" ? "color-mix(in srgb, var(--coral) 22%, transparent)" : `color-mix(in srgb, var(--teal) ${rect.tone === "best" ? 42 : 28}%, transparent)`}
            stroke={rectColor}
            strokeWidth={2.25}
            strokeDasharray={rect.tone === "best" ? undefined : "6 4"}
          />
          <path d={`M${barX(rect.left)} ${BASE_Y + 26} v7 H${barX(rect.right) + barW} v-7`} fill="none" stroke={rectColor} strokeWidth={2} strokeLinejoin="round" />
          <text x={clampMid((barX(rect.left) + barX(rect.right) + barW) / 2, 80)} y={BASE_Y + 49} textAnchor="middle" fontSize={12} fontWeight={700} fill={rectColor}>
            {rect.label}
          </text>
        </g>
      ) : null}
      {wrongSpan ? (
        <g>
          <path d={`M${barX(wrongSpan.left)} ${BASE_Y + 58} v7 H${barX(wrongSpan.right) + barW} v-7`} fill="none" stroke={VIZ_COLORS.coral} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
          <text x={clampMid((barX(wrongSpan.left) + barX(wrongSpan.right) + barW) / 2, 60)} y={BASE_Y + 81} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            {wrongSpan.label}
          </text>
        </g>
      ) : null}

      {/* The ✕ sits inside the bar's foot, clear of the numbers above and below. */}
      {heights.map((height, index) => (
        <RejectedMark key={`no-${index}`} pick={pick} index={index} x={midX(index)} y={BASE_Y - 3} />
      ))}

      {arriving !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${midX(Math.min(arriving, heights.length))}px, ${ended ? BASE_Y - 8 : BASE_Y - barH(heights[arriving]) - 22}px)` }}>
          <path d="M0 0 L-5 -8 L5 -8 Z" fill={VIZ_COLORS.accent} />
          <text x={0} y={-12} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
            {ended ? "end" : "new"}
          </text>
        </g>
      ) : null}

      {/* Bars whose rectangle is still growing. The most recent one is on top. */}
      <rect
        x={LIST_X}
        y={LIST_Y}
        width={LIST_W}
        height={LIST_H}
        rx={10}
        fill={state.growingLit ? "color-mix(in srgb, var(--teal) 12%, transparent)" : "color-mix(in srgb, var(--steel-900) 55%, transparent)"}
        stroke={state.growingLit ? VIZ_COLORS.teal : VIZ_COLORS.line}
        strokeWidth={1.5}
      />
      <text x={LIST_X + LIST_W / 2} y={LIST_Y + 20} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
        still growing
      </text>
      {growing.length === 0 ? (
        <text x={LIST_X + LIST_W / 2} y={LIST_Y + LIST_H - 18} textAnchor="middle" fontSize={12} fill={VIZ_COLORS.muted}>
          (none)
        </text>
      ) : null}
      {growing.map((bar, position) => {
        const recent = position === growing.length - 1;
        return (
          <g key={bar} className={GLIDE} style={{ transform: `translate(${LIST_X + 8}px, ${LIST_Y + LIST_H - 6 - (position + 1) * seatH}px)` }}>
            <rect width={LIST_W - 16} height={seatH - 4} rx={5} fill="color-mix(in srgb, var(--accent) 16%, transparent)" stroke={VIZ_COLORS.accent} strokeWidth={recent ? 1.75 : 1} strokeOpacity={recent ? 1 : 0.5} />
            <text x={(LIST_W - 16) / 2} y={(seatH - 4) / 2 + 4} textAnchor="middle" fontSize={seatFont} fontWeight={600} fill={VIZ_COLORS.ink}>
              bar {bar} · height {heights[bar]}
            </text>
          </g>
        );
      })}

      {/* A real target for "nobody is blocked", shown only while that can be the answer. */}
      {state.askNobody && pick ? (
        <g>
          <rect
            x={LIST_X}
            y={NOBODY_Y}
            width={LIST_W}
            height={28}
            rx={8}
            strokeDasharray="5 4"
            strokeWidth={1.5}
            stroke={nobodyWrong ? VIZ_COLORS.coral : nobodyPicked ? VIZ_COLORS.teal : VIZ_COLORS.muted}
            fill={nobodyWrong ? FILL.miss : nobodyPicked ? FILL.done : "transparent"}
          />
          <text x={LIST_X + LIST_W / 2} y={NOBODY_Y + 19} textAnchor="middle" fontSize={13} fontWeight={600} fill={VIZ_COLORS.ink}>
            nobody
          </text>
          <RejectedMark pick={pick} index={count} x={LIST_X + LIST_W - 12} y={NOBODY_Y + 18} />
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point. */}
      {heights.map((height, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={barX(index) - 3} y={BASE_Y - MAX_H - 20} width={barW + 6} height={MAX_H + 42} label={`Choose bar ${index}, height ${height}`} />
      ))}
      {state.askNobody ? <PickTarget pick={pick} index={count} x={LIST_X} y={NOBODY_Y} width={LIST_W} height={28} label="Choose nobody" /> : null}
    </Frame>
  );
}
