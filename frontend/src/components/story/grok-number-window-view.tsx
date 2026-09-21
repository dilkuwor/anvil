import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Number boxes with a caterpillar window. Copied from string-window-view so cells shrink and values can be negative. */

export type NumberWindowState = {
  values: number[];
  tones: CellTone[];
  left: number | null;
  right: number | null;
  ghostTail?: number | null;
  best: number | null;
  bestRange: [number, number] | null;
  sum?: number | null;
  target?: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 186;
const MARGIN = 16;
const CELLS_Y = 78;

function Marker({ x, label, color, hidden }: { x: number; label: string; color: string; hidden: boolean }) {
  return (
    <g className={GLIDE} style={{ transform: `translate(${x}px, ${CELLS_Y - 4}px)`, opacity: hidden ? 0 : 1 }}>
      <path d="M0 0 L-6 -9 L6 -9 Z" fill={color} />
      <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {label}
      </text>
    </g>
  );
}

export function NumberWindowView({ state, pick }: { state: NumberWindowState; pick?: CellPick }) {
  const count = Math.max(state.values.length, 1);
  const gap = count > 8 ? 5 : 8;
  const size = Math.min(44, Math.floor((WIDTH - 2 * MARGIN - (count - 1) * gap) / count));
  const startX = (WIDTH - (count * (size + gap) - gap)) / 2;
  const cellX = (index: number) => startX + index * (size + gap);
  const centerX = (index: number) => cellX(index) + size / 2;
  const { left, right } = state;
  const same = left !== null && left === right;
  const body = left !== null && right !== null && right >= left;
  const close = body && !same && centerX(right) - centerX(left) < 44;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A row of numbers with a window that crawls along it">
      {state.counter ? (
        <Label x={MARGIN} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.target !== null && state.target !== undefined ? (
        <Label x={WIDTH / 2} y={22} size={13} weight={600} tone="ink" anchor="middle">
          need {state.target}
        </Label>
      ) : null}
      {state.best !== null ? (
        <Label x={WIDTH - MARGIN} y={22} size={13} weight={600} tone="teal" anchor="end">
          shortest = {state.best === Infinity ? "none" : state.best}
        </Label>
      ) : null}

      <rect
        className={GLIDE}
        y={CELLS_Y - 6}
        height={size + 12}
        rx={14}
        fill="color-mix(in srgb, var(--accent) 12%, transparent)"
        stroke={VIZ_COLORS.accent}
        strokeOpacity={0.45}
        style={{
          x: body ? cellX(left) - 6 : startX,
          width: body ? cellX(right) + size + 6 - (cellX(left) - 6) : 0,
          opacity: body ? 1 : 0,
        }}
      />

      {state.values.map((value, index) => (
        <g key={index}>
          <Cell x={cellX(index)} y={CELLS_Y} size={size} value={value} tone={pickTone(pick, index, state.tones[index] ?? "idle")} caption={String(index)} />
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 9} y={CELLS_Y + 13} />
        </g>
      ))}

      <Marker x={left !== null ? centerX(left) - (close ? 10 : 0) : startX} label={same ? "tail = head" : "tail"} color={VIZ_COLORS.accent} hidden={left === null} />
      <Marker x={right !== null ? centerX(right) + (close ? 10 : 0) : startX} label="head" color={VIZ_COLORS.teal} hidden={right === null || same} />

      {state.sum !== null && state.sum !== undefined && body ? (
        <text x={(centerX(left) + centerX(right)) / 2} y={CELLS_Y + size + 36} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink}>
          body {state.sum}
        </text>
      ) : null}

      {state.ghostTail !== null && state.ghostTail !== undefined && left !== null ? (
        <g>
          <line x1={centerX(left) - 8} y1={40} x2={centerX(state.ghostTail) + 8} y2={40} stroke={VIZ_COLORS.coral} strokeWidth={2.25} strokeDasharray="5 4" />
          <path d={`M${centerX(state.ghostTail) + 8} 35 l-9 5 l9 5 Z`} fill={VIZ_COLORS.coral} />
          <text x={(centerX(left) + centerX(state.ghostTail)) / 2} y={32} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ not with a negative
          </text>
        </g>
      ) : null}

      {state.bestRange ? (
        <line
          x1={cellX(state.bestRange[0])}
          y1={CELLS_Y + size + 22}
          x2={cellX(state.bestRange[1]) + size}
          y2={CELLS_Y + size + 22}
          stroke={VIZ_COLORS.teal}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ) : null}

      {state.values.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(index) - gap / 2} y={CELLS_Y - 4} width={size + gap} height={size + 24} label={`Choose box ${index}`} />
      ))}
    </Frame>
  );
}
