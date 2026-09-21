import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Two pointers walking a string from the ends. Left/right, not tail/head. Draws state only. */

export type TwoPointerStringState = {
  chars: string[];
  tones: CellTone[];
  left: number | null;
  right: number | null;
  /** One character we are allowed to drop. */
  skipped?: number | null;
  /** The skip that would fail. */
  ghostSkip?: number | null;
  note?: string | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const SIZE = 44;
const GAP = 8;
const CELLS_Y = 78;

function show(char: string): string {
  if (char === " ") return "·";
  return char;
}

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

export function GrokTwoPointerStringView({ state, pick }: { state: TwoPointerStringState; pick?: CellPick }) {
  const count = Math.max(state.chars.length, 1);
  const size = Math.min(SIZE, (WIDTH - 48) / count - GAP);
  const startX = (WIDTH - (count * (size + GAP) - GAP)) / 2;
  const cellX = (index: number) => startX + index * (size + GAP);
  const centerX = (index: number) => cellX(index) + size / 2;
  const { left, right } = state;
  const same = left !== null && left === right;
  const height = 176;

  return (
    <Frame width={WIDTH} height={height} label="A string with two pointers walking in from the ends">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={state.counter ? WIDTH - 16 : 16} y={22} size={13} weight={700} tone="coral" anchor={state.counter ? "end" : "start"}>
          {state.note}
        </Label>
      ) : null}

      {state.chars.map((char, index) => (
        <g key={index}>
          <Cell
            x={cellX(index)}
            y={CELLS_Y}
            size={size}
            value={show(char)}
            tone={pickTone(pick, index, state.tones[index] ?? "idle")}
            caption={String(index)}
          />
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 8} y={CELLS_Y + 12} />
          {state.skipped === index ? (
            <text x={centerX(index)} y={CELLS_Y + size + 28} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal}>
              skip
            </text>
          ) : null}
          {state.ghostSkip === index ? (
            <text x={centerX(index)} y={CELLS_Y + size + 28} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
              ✕ skip
            </text>
          ) : null}
        </g>
      ))}

      <Marker x={left !== null ? centerX(left) : startX} label={same ? "left = right" : "left"} color={VIZ_COLORS.accent} hidden={left === null} />
      <Marker x={right !== null ? centerX(right) : startX} label="right" color={VIZ_COLORS.teal} hidden={right === null || same} />

      {state.chars.map((char, index) => (
        <PickTarget
          key={`pick-${index}`}
          pick={pick}
          index={index}
          x={cellX(index) - GAP / 2}
          y={CELLS_Y - 4}
          width={size + GAP}
          height={size + 24}
          label={`Choose the box holding ${show(char)}, number ${index} from the left`}
        />
      ))}
    </Frame>
  );
}
