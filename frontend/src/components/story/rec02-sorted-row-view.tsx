import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A sorted row of boxes with left / middle / right posts. Used by the bookshelf and dance-couple stories. Draws state only. */

export type SortedRowState = {
  nums: number[];
  /** One tone per box, plus one for the end slot when it is drawn. */
  tones: CellTone[];
  /** Draw an empty "end" box after the last value, for "goes at the very end". */
  endSlot: boolean;
  left: number | null;
  mid: number | null;
  right: number | null;
  /** The slow way's finger. */
  scan?: number | null;
  /** Top-right label, e.g. "target = 5". */
  goal?: string | null;
  /** A teal line in front of this position: "the value goes here". */
  gap?: number | null;
  /** A coral note under a position: the trap's wrong answer. */
  wrong?: { at: number; text: string } | null;
  /** Brackets over pairs of boxes, starting at `from`. */
  couples?: { from: number; tone: "idle" | "hit" | "miss" }[] | null;
  /** The middle post stepping back one box. */
  stepBack?: { from: number; to: number } | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const CELLS_Y = 74;
const MAX_SIZE = 44;

function Marker({ x, y, label, color, hidden }: { x: number; y: number; label: string; color: string; hidden: boolean }) {
  return (
    <g className={GLIDE} style={{ transform: `translate(${x}px, ${y}px)`, opacity: hidden ? 0 : 1 }}>
      <text x={0} y={0} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );
}

export function SortedRowView({ state, pick }: { state: SortedRowState; pick?: CellPick }) {
  const { nums, left, mid, right, scan, gap, wrong, couples, stepBack } = state;
  const count = nums.length + (state.endSlot ? 1 : 0);
  // Sizes come from the data, so a long row still fits.
  const step = Math.min(MAX_SIZE + 8, (WIDTH - 32) / Math.max(count, 1));
  const size = step - Math.min(8, step * 0.18);
  const startX = (WIDTH - step * count) / 2;
  const cellX = (index: number) => startX + index * step + (step - size) / 2;
  const centerX = (index: number) => startX + index * step + step / 2;
  const gapX = (index: number) => startX + index * step;
  const rows = { left: CELLS_Y + size + 32, right: CELLS_Y + size + 46, mid: CELLS_Y + size + 60, note: CELLS_Y + size + 80 };
  const height = rows.note + 12;
  const inRow = (index: number | null | undefined): index is number => index !== null && index !== undefined && index >= 0 && index < count;
  const clampX = (x: number, half: number) => Math.min(WIDTH - half - 8, Math.max(half + 8, x));
  const same = inRow(left) && left === right;

  return (
    <Frame width={WIDTH} height={height} label="A sorted row of boxes with posts that close in">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.goal ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="ink" anchor="end">
          {state.goal}
        </Label>
      ) : null}

      {couples?.map((couple) => {
        const color = couple.tone === "hit" ? VIZ_COLORS.teal : couple.tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.line;
        const x1 = cellX(couple.from) + 4;
        const x2 = cellX(couple.from + 1) + size - 4;
        return (
          <path key={`couple-${couple.from}`} d={`M${x1} ${CELLS_Y - 4} V${CELLS_Y - 12} H${x2} V${CELLS_Y - 4}`} fill="none" stroke={color} strokeWidth={couple.tone === "idle" ? 1.25 : 2.25} />
        );
      })}

      {nums.map((value, index) => (
        <g key={index}>
          <Cell x={cellX(index)} y={CELLS_Y} size={size} value={value} tone={pickTone(pick, index, state.tones[index] ?? "idle")} caption={String(index)} />
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 8} y={CELLS_Y + 12} />
        </g>
      ))}

      {state.endSlot ? (
        <g>
          <rect
            x={cellX(nums.length)}
            y={CELLS_Y}
            width={size}
            height={size}
            rx={7}
            fill={state.tones[nums.length] === "done" ? "color-mix(in srgb, var(--teal) 45%, transparent)" : "transparent"}
            stroke={pickTone(pick, nums.length, state.tones[nums.length] ?? "idle") === "miss" ? VIZ_COLORS.coral : state.tones[nums.length] === "done" ? VIZ_COLORS.teal : VIZ_COLORS.line}
            strokeWidth={1.25}
            strokeDasharray="4 4"
          />
          <text x={centerX(nums.length)} y={CELLS_Y + size / 2 + 4} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
            end
          </text>
          <text x={centerX(nums.length)} y={CELLS_Y + size + 14} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
            {nums.length}
          </text>
          <RejectedMark pick={pick} index={nums.length} x={cellX(nums.length) + size - 8} y={CELLS_Y + 12} />
        </g>
      ) : null}

      {inRow(gap) ? (
        <g>
          <line x1={gapX(gap)} y1={CELLS_Y - 8} x2={gapX(gap)} y2={CELLS_Y + size + 4} stroke={VIZ_COLORS.teal} strokeWidth={3} strokeLinecap="round" />
          <text x={clampX(gapX(gap), 40)} y={CELLS_Y - 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.teal}>
            goes here
          </text>
        </g>
      ) : null}

      {stepBack && inRow(stepBack.from) && inRow(stepBack.to) ? (
        <g>
          <line x1={centerX(stepBack.from)} y1={CELLS_Y - 26} x2={centerX(stepBack.to) + 8} y2={CELLS_Y - 26} stroke={VIZ_COLORS.accent} strokeWidth={2.25} />
          <path d={`M${centerX(stepBack.to) + 8} ${CELLS_Y - 31} l-9 5 l9 5 Z`} fill={VIZ_COLORS.accent} />
          <text x={clampX((centerX(stepBack.from) + centerX(stepBack.to)) / 2, 50)} y={CELLS_Y - 36} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
            step back one
          </text>
        </g>
      ) : null}

      <Marker x={inRow(left) ? centerX(left) : startX} y={rows.left} label={same ? "left = right" : "left"} color={VIZ_COLORS.accent} hidden={!inRow(left)} />
      <Marker x={inRow(right) ? centerX(right) : WIDTH - startX} y={rows.right} label="right" color={VIZ_COLORS.accent} hidden={!inRow(right) || same} />
      <Marker x={inRow(mid) ? centerX(mid) : WIDTH / 2} y={rows.mid} label="middle" color={VIZ_COLORS.ink} hidden={!inRow(mid)} />
      <Marker x={inRow(scan) ? centerX(scan) : startX} y={rows.left} label="look" color={VIZ_COLORS.accent} hidden={!inRow(scan)} />

      {wrong && inRow(wrong.at) ? (
        <text x={clampX(centerX(wrong.at), 90)} y={rows.note} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
          {wrong.text}
        </text>
      ) : null}

      {/* Click targets sit on top, one per box, including the end slot. */}
      {Array.from({ length: count }, (_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={startX + index * step} y={CELLS_Y - 6} width={step} height={size + 24} label={`Choose position ${index}`} />
      ))}
    </Frame>
  );
}
