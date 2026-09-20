import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A row of numbers with one peg above it and two calipers squeezing from below. Draws state only. */

export type ArrayThreePointerState = {
  nums: number[];
  tones: CellTone[];
  /** The box the peg is pushed into. */
  peg: number | null;
  /** The two calipers. Both `null` when no sweep is open. */
  left: number | null;
  right: number | null;
  /** Three boxes whose sum is written out under the row. */
  sumOf: [number, number, number] | null;
  /** A repeated value that is being stepped over, marked in coral with `skipNote`. */
  skipped: number | null;
  skipNote?: string;
  /** The answer list so far. `null` hides the row. */
  triplets: number[][] | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 232;
const CELLS_Y = 80;
const GAP = 8;
const NOTE_Y = 42;
const JAW_Y = 12;
const MAX_LISTED = 4;

export function ArrayThreePointerView({ state, pick }: { state: ArrayThreePointerState; pick?: CellPick }) {
  const { nums, peg, left, right, sumOf, skipped, triplets } = state;
  const count = Math.max(nums.length, 1);
  const size = Math.min(44, (WIDTH - 60) / count - GAP);
  const startX = (WIDTH - (count * (size + GAP) - GAP)) / 2;
  const cellX = (index: number) => startX + index * (size + GAP);
  const centerX = (index: number) => cellX(index) + size / 2;
  const clampX = (x: number) => Math.min(WIDTH - 100, Math.max(100, x));
  const below = CELLS_Y + size;
  const open = left !== null && right !== null;
  const met = open && left === right;

  const sum = sumOf ? sumOf.reduce((total, index) => total + nums[index], 0) : null;
  const sumText = sumOf ? `${sumOf.map((index) => (nums[index] < 0 ? `(${nums[index]})` : String(nums[index]))).join(" + ")} = ${sum}` : "";
  const listed = triplets ? triplets.slice(0, MAX_LISTED).map((triplet) => `[${triplet.join(", ")}]`).join("  ") : "";
  const more = triplets && triplets.length > MAX_LISTED ? `  +${triplets.length - MAX_LISTED} more` : "";

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A sorted row of numbers with a peg and two calipers">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {nums.map((value, index) => (
        <g key={index}>
          <Cell x={cellX(index)} y={CELLS_Y} size={size} value={value} tone={pickTone(pick, index, index === skipped ? "miss" : (state.tones[index] ?? "idle"))} />
          {/* In the corner of the box, clear of the peg above and the calipers below. */}
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 8} y={CELLS_Y + 12} />
        </g>
      ))}

      {/* The peg: pushed in from above. */}
      <g className={GLIDE} style={{ transform: `translate(${peg !== null ? centerX(peg) : startX}px, ${CELLS_Y - 4}px)`, opacity: peg === null ? 0 : 1 }}>
        <path d="M0 0 L-6 -9 L6 -9 Z" fill={VIZ_COLORS.accent} />
        <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          peg
        </text>
      </g>

      {/* A stepped-over repeat. Its note sits one row above the peg label, so the two never touch. */}
      {skipped !== null && state.skipNote ? (
        <text x={clampX(centerX(skipped))} y={NOTE_Y} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
          {state.skipNote}
        </text>
      ) : null}

      {/* The calipers: one bar under the row, with a jaw under each end. */}
      <rect
        className={GLIDE}
        y={below + JAW_Y + 8}
        height={3}
        rx={1.5}
        fill={VIZ_COLORS.accent}
        style={{ x: open ? centerX(left) : startX, width: open ? centerX(right) - centerX(left) : 0, opacity: open ? 1 : 0 }}
      />
      <g className={GLIDE} style={{ transform: `translate(${left !== null ? centerX(left) : startX}px, ${below + 4}px)`, opacity: left === null ? 0 : 1 }}>
        <path d={`M0 0 L-6 ${JAW_Y} L6 ${JAW_Y} Z`} fill={VIZ_COLORS.accent} />
        <text x={0} y={JAW_Y + 24} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          {met ? "left = right" : "left"}
        </text>
      </g>
      <g className={GLIDE} style={{ transform: `translate(${right !== null ? centerX(right) : startX}px, ${below + 4}px)`, opacity: right === null || met ? 0 : 1 }}>
        <path d={`M0 0 L-6 ${JAW_Y} L6 ${JAW_Y} Z`} fill={VIZ_COLORS.accent} />
        <text x={0} y={JAW_Y + 24} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          right
        </text>
      </g>

      {/* The sum has a row of its own, and so has the answer list: they can never collide. */}
      {sumOf ? (
        <text x={WIDTH / 2} y={below + 66} textAnchor="middle" fontSize={14} fontWeight={700} fill={sum === 0 ? VIZ_COLORS.teal : VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          {sumText}
        </text>
      ) : null}
      {triplets ? (
        <Label x={16} y={HEIGHT - 12} size={13} weight={600} tone="teal">
          triplets: {triplets.length === 0 ? "none yet" : `${listed}${more}`}
        </Label>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point at a box. */}
      {nums.map((value, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(index) - GAP / 2} y={CELLS_Y - 4} width={size + GAP} height={size + 8} label={`Choose the box holding ${value}, number ${index + 1} from the left`} />
      ))}
    </Frame>
  );
}
