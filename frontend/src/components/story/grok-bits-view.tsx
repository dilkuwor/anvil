import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A row of 0/1 boxes (or digits), optional source values, and an extra answer row. Draws state only. */

export type GrokBitCell = { text: string; tone: CellTone };

export type GrokBitsState = {
  /** 0/1 or digit boxes. Index 0 is the leftmost box. */
  bits: GrokBitCell[];
  bitsLabel: string;
  /** Which bit just changed. */
  changedBit: number | null;
  /** Source numbers or words sitting above the bits. */
  values: GrokBitCell[] | null;
  cursor: number | null;
  mixLabel: string | null;
  mixValue: string | null;
  /** Second row: answer table, reversed half, and so on. */
  row: { label: string; cells: GrokBitCell[] } | null;
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
  /** Which row receives clicks: values, bits, or the extra row. */
  pickOn: "values" | "bits" | "row";
};

const WIDTH = 560;
const HEIGHT = 248;

function rowX(count: number, size: number, gap: number) {
  const span = count * (size + gap) - gap;
  return (WIDTH - Math.max(span, 0)) / 2;
}

export function GrokBitsView({ state, pick }: { state: GrokBitsState; pick?: CellPick }) {
  const bitSize = Math.min(40, state.bits.length > 0 ? (WIDTH - 80) / state.bits.length - 6 : 40);
  const bitGap = 6;
  const bitX = rowX(state.bits.length, bitSize, bitGap);
  const values = state.values ?? [];
  const valueSize = values.length > 0 ? Math.min(48, (WIDTH - 80) / values.length - 8) : 44;
  const valueX = rowX(values.length, valueSize, 8);
  const row = state.row;
  const rowSize = row && row.cells.length > 0 ? Math.min(40, (WIDTH - 100) / row.cells.length - 6) : 36;
  const extraX = row ? rowX(row.cells.length, rowSize, 6) : 0;
  const bitsY = values.length ? 108 : 78;
  const extraY = bitsY + bitSize + 46;

  const pickCount = state.pickOn === "values" ? values.length : state.pickOn === "row" ? (row?.cells.length ?? 0) : state.bits.length;
  const pickBox = (index: number) => {
    if (state.pickOn === "values") return { x: valueX + index * (valueSize + 8) - 4, y: 44, w: valueSize + 8, h: valueSize + 18 };
    if (state.pickOn === "row" && row) return { x: extraX + index * (rowSize + 6) - 3, y: extraY, w: rowSize + 6, h: rowSize + 16 };
    return { x: bitX + index * (bitSize + bitGap) - 3, y: bitsY, w: bitSize + bitGap, h: bitSize + 16 };
  };

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Bits drawn as a row of 0 and 1 boxes">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.mixLabel ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          {state.mixLabel}
          {state.mixValue !== null ? `: ${state.mixValue}` : ""}
        </Label>
      ) : null}

      {values.map((cell, index) => (
        <g key={`v-${index}`}>
          <Cell
            x={valueX + index * (valueSize + 8)}
            y={48}
            size={valueSize}
            value={cell.text}
            tone={pickTone(pick, state.pickOn === "values" ? index : -1, index === state.cursor ? "edge" : cell.tone)}
            caption={String(index)}
          />
          <RejectedMark pick={state.pickOn === "values" ? pick : undefined} index={index} x={valueX + index * (valueSize + 8) + valueSize - 8} y={56} />
        </g>
      ))}

      <Label x={16} y={bitsY - 10} size={12} weight={600}>
        {state.bitsLabel}
      </Label>
      {state.bits.map((cell, index) => {
        const x = bitX + index * (bitSize + bitGap);
        const tone = pickTone(pick, state.pickOn === "bits" ? index : -1, index === state.changedBit ? "edge" : cell.tone);
        return (
          <g key={`b-${index}`}>
            <Cell x={x} y={bitsY} size={bitSize} value={cell.text} tone={tone} caption={String(state.bits.length - 1 - index)} />
            {index === state.changedBit ? (
              <text x={x + bitSize / 2} y={bitsY - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent} className={GLIDE}>
                flip
              </text>
            ) : null}
            <RejectedMark pick={state.pickOn === "bits" ? pick : undefined} index={index} x={x + bitSize - 8} y={bitsY + 10} />
          </g>
        );
      })}

      {row ? (
        <g>
          <Label x={16} y={extraY - 10} size={12} weight={600}>
            {row.label}
          </Label>
          {row.cells.map((cell, index) => {
            const x = extraX + index * (rowSize + 6);
            return (
              <g key={`r-${index}`}>
                <Cell
                  x={x}
                  y={extraY}
                  size={rowSize}
                  value={cell.text}
                  tone={pickTone(pick, state.pickOn === "row" ? index : -1, cell.tone)}
                  caption={String(index)}
                />
                <RejectedMark pick={state.pickOn === "row" ? pick : undefined} index={index} x={x + rowSize - 8} y={extraY + 10} />
              </g>
            );
          })}
        </g>
      ) : null}

      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 14} size={12} weight={600} tone="teal" anchor="middle">
          {state.note}
        </Label>
      ) : null}
      {state.trapNote ? (
        <Label x={WIDTH / 2} y={HEIGHT - 14} size={12} weight={700} tone="coral" anchor="middle">
          {state.trapNote}
        </Label>
      ) : null}

      {Array.from({ length: pickCount }, (_, index) => {
        const box = pickBox(index);
        return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={box.x} y={box.y} width={box.w} height={box.h} label={`Choose box ${index}`} />;
      })}
    </Frame>
  );
}
