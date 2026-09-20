import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Shared picture for string / sliding-window stories. Draws state only. */

export type StringWindowState = {
  chars: string[];
  tones: CellTone[];
  /** Tail of the window. */
  left: number | null;
  /** Head of the window. */
  right: number | null;
  /** Where a wrong move would drag the tail back to. */
  ghostTail?: number | null;
  /** Ties the head's letter to its older copy, so the eye does not have to search. */
  link?: { from: number; to: number; tone: "miss" | "ghost" } | null;
  /** char → last index seen. `null` hides the row. */
  seen: { key: string; index: number; tone: "idle" | "hit" | "miss" }[] | null;
  best: number | null;
  bestRange: [number, number] | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const SIZE = 44;
const GAP = 8;
const CELLS_Y = 74;

function Marker({ x, label, color, hidden = false }: { x: number; label: string; color: string; hidden?: boolean }) {
  return (
    <g className={GLIDE} style={{ transform: `translate(${x}px, ${CELLS_Y - 4}px)`, opacity: hidden ? 0 : 1 }}>
      <path d="M0 0 L-6 -9 L6 -9 Z" fill={color} />
      <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {label}
      </text>
    </g>
  );
}

export function StringWindowView({ state, pick }: { state: StringWindowState; pick?: CellPick }) {
  const count = state.chars.length;
  const startX = (WIDTH - (count * (SIZE + GAP) - GAP)) / 2;
  const cellX = (index: number) => startX + index * (SIZE + GAP);
  const centerX = (index: number) => cellX(index) + SIZE / 2;
  const { left, right } = state;
  const same = left !== null && left === right;
  const height = state.seen ? 246 : 176;
  const body = left !== null && right !== null && right >= left;

  return (
    <Frame width={WIDTH} height={height} label="A string with a window that crawls along it">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.best !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          best = {state.best}
        </Label>
      ) : null}

      {/* The caterpillar's body: one shape that stretches and shrinks. */}
      <rect
        className={GLIDE}
        y={CELLS_Y - 6}
        height={SIZE + 12}
        rx={14}
        fill="color-mix(in srgb, var(--accent) 12%, transparent)"
        stroke={VIZ_COLORS.accent}
        strokeOpacity={0.45}
        style={{
          x: body ? cellX(left) - 6 : startX,
          width: body ? cellX(right) + SIZE + 6 - (cellX(left) - 6) : 0,
          opacity: body ? 1 : 0,
        }}
      />

      {state.chars.map((char, index) => (
        <g key={index}>
          <Cell x={cellX(index)} y={CELLS_Y} size={SIZE} value={char} tone={pickTone(pick, index, state.tones[index] ?? "idle")} caption={String(index)} />
          {/* In the corner of the box, clear of the tail and head arrows above it. */}
          <RejectedMark pick={pick} index={index} x={cellX(index) + SIZE - 9} y={CELLS_Y + 13} />
        </g>
      ))}

      <Marker x={left !== null ? centerX(left) : startX} label={same ? "tail = head" : "tail"} color={VIZ_COLORS.accent} hidden={left === null} />
      <Marker x={right !== null ? centerX(right) : startX} label="head" color={VIZ_COLORS.teal} hidden={right === null || same} />

      {state.ghostTail !== null && state.ghostTail !== undefined && left !== null ? (
        <g>
          <line x1={centerX(left) - 8} y1={40} x2={centerX(state.ghostTail) + 8} y2={40} stroke={VIZ_COLORS.coral} strokeWidth={2.25} strokeDasharray="5 4" />
          <path d={`M${centerX(state.ghostTail) + 8} 35 l-9 5 l9 5 Z`} fill={VIZ_COLORS.coral} />
          <text x={(centerX(left) + centerX(state.ghostTail)) / 2} y={32} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ never backwards
          </text>
        </g>
      ) : null}

      {state.bestRange ? (
        <line
          x1={cellX(state.bestRange[0])}
          y1={CELLS_Y + SIZE + 24}
          x2={cellX(state.bestRange[1]) + SIZE}
          y2={CELLS_Y + SIZE + 24}
          stroke={VIZ_COLORS.teal}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ) : null}

      {state.link ? (
        <g>
          <path
            d={`M${centerX(state.link.from)} ${CELLS_Y + SIZE + 30} Q${(centerX(state.link.from) + centerX(state.link.to)) / 2} ${CELLS_Y + SIZE + 74} ${centerX(state.link.to)} ${CELLS_Y + SIZE + 30}`}
            fill="none"
            stroke={VIZ_COLORS.coral}
            strokeWidth={2.25}
            strokeDasharray={state.link.tone === "ghost" ? "5 5" : undefined}
            strokeOpacity={state.link.tone === "ghost" ? 0.7 : 1}
          />
          <text x={(centerX(state.link.from) + centerX(state.link.to)) / 2} y={CELLS_Y + SIZE + 70} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            {state.link.tone === "ghost" ? "ghost: behind the tail" : "same letter"}
          </text>
        </g>
      ) : null}

      {state.seen ? (
        <g>
          <Label x={16} y={222} size={12} weight={600}>
            last seen
          </Label>
          {state.seen.length === 0 ? (
            <Label x={92} y={222} size={12}>
              (empty)
            </Label>
          ) : null}
          {state.seen.map((entry, index) => {
            const x = 92 + index * 62;
            const stroke = entry.tone === "hit" ? VIZ_COLORS.teal : entry.tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.line;
            const fill =
              entry.tone === "hit"
                ? "color-mix(in srgb, var(--teal) 25%, transparent)"
                : entry.tone === "miss"
                  ? "color-mix(in srgb, var(--coral) 25%, transparent)"
                  : "transparent";
            return (
              <g key={entry.key}>
                <rect x={x} y={204} width={54} height={28} rx={7} fill={fill} stroke={stroke} strokeWidth={entry.tone === "idle" ? 1 : 1.75} />
                <text x={x + 27} y={223} textAnchor="middle" fontSize={13} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {entry.key} → {entry.index}
                </text>
              </g>
            );
          })}
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point at a cell. */}
      {state.chars.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(index) - GAP / 2} y={CELLS_Y - 4} width={SIZE + GAP} height={SIZE + 24} label={`Choose index ${index}`} />
      ))}
    </Frame>
  );
}
