import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import { GLIDE } from "./view-kit";

/**
 * One or two rows of items on top, and a pile below that grows to the right (its top is the last box).
 * Used by the plate-pile and crash-lane stories. Draws state only.
 */

export type LaneRow = {
  label: string;
  items: string[];
  tones: CellTone[];
  /** Which item the row's arrow points at. `null` hides it. */
  pointer: number | null;
  pointerLabel: string;
};

export type StackLaneState = {
  rows: LaneRow[];
  /** Bottom first, top last. */
  stack: string[];
  stackTones: CellTone[];
  stackLabel: string;
  counter?: { label: string; value: number } | null;
  /** Top-right label, e.g. the answer once it is known. */
  result?: string | null;
  /** A short note under the pile: the trap, or what just happened. */
  note?: { text: string; tone: "coral" | "teal" } | null;
};

const WIDTH = 560;
const LEFT = 112;
const FIRST_ROW_Y = 58;

function Pointer({ x, y, label, hidden }: { x: number; y: number; label: string; hidden: boolean }) {
  return (
    <g className={GLIDE} style={{ transform: `translate(${x}px, ${y - 4}px)`, opacity: hidden ? 0 : 1 }}>
      <path d="M0 0 L-6 -9 L6 -9 Z" fill={VIZ_COLORS.accent} />
      <text x={0} y={-13} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
        {label}
      </text>
    </g>
  );
}

export function StackLaneView({ state }: { state: StackLaneState }) {
  const longest = Math.max(1, state.stack.length, ...state.rows.map((row) => row.items.length));
  const step = Math.min(52, (WIDTH - LEFT - 12) / longest);
  const size = step - Math.min(8, step * 0.18);
  const rowGap = size + 52;
  const cellX = (index: number) => LEFT + index * step;
  const centerX = (index: number) => cellX(index) + size / 2;
  const stackY = FIRST_ROW_Y + state.rows.length * rowGap + 4;
  const height = stackY + size + 40;
  const top = state.stack.length - 1;

  return (
    <Frame width={WIDTH} height={height} label="Rows of items above, and a pile whose top is on the right">
      {state.counter ? (
        <Label x={16} y={18} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.result ? (
        <Label x={WIDTH - 16} y={18} size={13} weight={600} tone="teal" anchor="end">
          {state.result}
        </Label>
      ) : null}

      {state.rows.map((row, rowIndex) => {
        const y = FIRST_ROW_Y + rowIndex * rowGap;
        const inRow = row.pointer !== null && row.pointer >= 0 && row.pointer < row.items.length;
        return (
          <g key={row.label}>
            <Label x={16} y={y + size / 2 + 4} size={12} weight={600} tone="ink">
              {row.label}
            </Label>
            {row.items.map((item, index) => (
              <Cell key={index} x={cellX(index)} y={y} size={size} value={item} tone={row.tones[index] ?? "idle"} caption={String(index)} />
            ))}
            <Pointer x={inRow ? centerX(row.pointer as number) : LEFT} y={y} label={row.pointerLabel} hidden={!inRow} />
          </g>
        );
      })}

      <Label x={16} y={stackY + size / 2} size={12} weight={600} tone="ink">
        {state.stackLabel}
      </Label>
      <Label x={16} y={stackY + size / 2 + 15} size={10}>
        bottom → top
      </Label>
      {state.stack.length === 0 ? (
        <g>
          <rect x={LEFT} y={stackY} width={size * 2} height={size} rx={7} fill="transparent" stroke={VIZ_COLORS.line} strokeDasharray="4 4" />
          <text x={LEFT + size} y={stackY + size / 2 + 4} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
            empty
          </text>
        </g>
      ) : null}
      {state.stack.map((item, index) => (
        <Cell key={index} x={cellX(index)} y={stackY} size={size} value={item} tone={state.stackTones[index] ?? "idle"} />
      ))}
      {top >= 0 ? (
        <text className={GLIDE} x={centerX(top)} y={stackY - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
          top
        </text>
      ) : null}

      {state.note ? (
        <text x={LEFT} y={stackY + size + 24} fontSize={12} fontWeight={700} fill={state.note.tone === "coral" ? VIZ_COLORS.coral : VIZ_COLORS.teal}>
          {state.note.text}
        </text>
      ) : null}
    </Frame>
  );
}
