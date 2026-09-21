import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Jump lengths as boxes, with a coverage flood and the farthest landing. Draws state only. */

export type GrokJumpState = {
  nums: number[];
  tones: CellTone[];
  /** Index we stand on. */
  here: number | null;
  /** Farthest index the flood can cover. */
  reach: number | null;
  /** End of the current jump range. */
  rangeEnd: number | null;
  jumps: number | null;
  /** A hop drawn from here to this landing. */
  hopTo: number | null;
  /** Coral mark: jumping at this index as if each box were its own jump. */
  trapAt: number | null;
  canReach: boolean | null;
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 220;
const CELLS_Y = 88;
const GAP = 8;

export function GrokJumpView({ state, pick }: { state: GrokJumpState; pick?: CellPick }) {
  const count = Math.max(state.nums.length, 1);
  const size = Math.min(48, (WIDTH - 48) / count - GAP);
  const startX = (WIDTH - (count * (size + GAP) - GAP)) / 2;
  const cellX = (index: number) => startX + index * (size + GAP);
  const centerX = (index: number) => cellX(index) + size / 2;
  const floodTo = state.reach !== null ? Math.min(state.reach, count - 1) : -1;
  const flood = floodTo >= 0;
  const hopFrom = state.here;
  const hopTo = state.hopTo !== null ? Math.min(state.hopTo, count - 1) : null;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Jump lengths with a flood of how far we can still land">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.jumps !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          jumps: {state.jumps}
        </Label>
      ) : state.canReach !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone={state.canReach ? "teal" : "coral"} anchor="end">
          {state.canReach ? "the end is in reach" : "stuck"}
        </Label>
      ) : null}

      {flood ? (
        <rect
          className={GLIDE}
          x={cellX(0) - 6}
          y={CELLS_Y - 10}
          width={cellX(floodTo) + size + 6 - (cellX(0) - 6)}
          height={size + 20}
          rx={14}
          fill="color-mix(in srgb, var(--accent) 14%, transparent)"
          stroke={VIZ_COLORS.accent}
          strokeOpacity={0.45}
        />
      ) : null}

      {state.rangeEnd !== null && state.rangeEnd < count ? (
        <g className={GLIDE} style={{ transform: `translate(${cellX(state.rangeEnd) + size + 2}px, ${CELLS_Y - 4}px)` }}>
          <line x1={0} y1={0} x2={0} y2={size + 8} stroke={VIZ_COLORS.teal} strokeWidth={2.5} />
          <text x={0} y={-8} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal}>
            range
          </text>
        </g>
      ) : null}

      {state.nums.map((value, index) => (
        <g key={index}>
          <Cell
            x={cellX(index)}
            y={CELLS_Y}
            size={size}
            value={value}
            tone={pickTone(pick, index, index === state.trapAt ? "miss" : (state.tones[index] ?? "idle"))}
            caption={String(index)}
          />
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 8} y={CELLS_Y + 12} />
        </g>
      ))}

      {state.here !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${centerX(state.here)}px, ${CELLS_Y - 4}px)` }}>
          <path d="M0 0 L-6 -9 L6 -9 Z" fill={VIZ_COLORS.accent} />
          <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
            here
          </text>
        </g>
      ) : null}

      {hopFrom !== null && hopTo !== null && hopTo !== hopFrom ? (
        <path
          d={`M${centerX(hopFrom)} ${CELLS_Y + size + 8} Q${(centerX(hopFrom) + centerX(hopTo)) / 2} ${CELLS_Y + size + 40} ${centerX(hopTo)} ${CELLS_Y + size + 8}`}
          fill="none"
          stroke={state.trapAt === hopFrom ? VIZ_COLORS.coral : VIZ_COLORS.teal}
          strokeWidth={2}
        />
      ) : null}

      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 12} size={12} weight={600} tone="teal" anchor="middle">
          {state.note}
        </Label>
      ) : null}
      {state.trapNote ? (
        <Label x={WIDTH / 2} y={HEIGHT - 12} size={12} weight={700} tone="coral" anchor="middle">
          {state.trapNote}
        </Label>
      ) : null}

      {state.nums.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(index) - GAP / 2} y={CELLS_Y - 4} width={size + GAP} height={size + 22} label={`Choose index ${index}`} />
      ))}
    </Frame>
  );
}
