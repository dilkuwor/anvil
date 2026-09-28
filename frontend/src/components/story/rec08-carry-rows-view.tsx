import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import { GLIDE } from "./view-kit";

/** Numbers written as rows of bits, lined up by column, highest bit on the left. Draws state only. */

export type BitRow = {
  label: string;
  /** The row's value in everyday numbers, shown at the right. */
  value: string;
  bits: string[];
  tones: CellTone[];
  /** A wrong row, drawn in coral. */
  wrong?: boolean;
};

export type CarryRowsState = {
  rows: BitRow[];
  /** Highlighted column, counted from the left. */
  column: number | null;
  round: number | null;
  counter: { label: string; value: number } | null;
  note: string | null;
};

const WIDTH = 560;
const HEIGHT = 290;
const ROWS_Y = 52;
const ROW_H = 44;
const BITS_X = 150;

export function CarryRowsView({ state }: { state: CarryRowsState }) {
  const width = Math.max(...state.rows.map((row) => row.bits.length), 1);
  const size = Math.min(36, (WIDTH - BITS_X - 70) / width - 4);
  const cellX = (index: number) => BITS_X + index * (size + 4);
  const cellY = (row: number) => ROWS_Y + row * ROW_H;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Two numbers written in bits, with the carry row under them">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.round !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="accent" anchor="end">
          round {state.round}
        </Label>
      ) : null}

      {state.column !== null ? (
        <rect
          className={GLIDE}
          x={cellX(state.column) - 3}
          y={ROWS_Y - 6}
          width={size + 6}
          height={state.rows.length * ROW_H + 2}
          rx={8}
          fill="color-mix(in srgb, var(--accent) 10%, transparent)"
          stroke={VIZ_COLORS.accent}
          strokeOpacity={0.5}
        />
      ) : null}

      {state.rows.map((row, r) => (
        <g key={`row-${r}`}>
          <Label x={16} y={cellY(r) + size / 2 + 4} size={12} weight={600} tone={row.wrong ? "coral" : "muted"}>
            {row.label}
          </Label>
          {row.bits.map((bit, index) => (
            <Cell key={`bit-${r}-${index}`} x={cellX(index)} y={cellY(r)} size={size} value={bit} tone={row.tones[index] ?? "idle"} />
          ))}
          <Label x={WIDTH - 16} y={cellY(r) + size / 2 + 4} size={13} weight={700} tone={row.wrong ? "coral" : "ink"} anchor="end">
            {row.value}
          </Label>
        </g>
      ))}

      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 8} size={12} weight={600} tone="teal" anchor="middle">
          {state.note}
        </Label>
      ) : null}
    </Frame>
  );
}
