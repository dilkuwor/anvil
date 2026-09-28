import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * One or two rows of boxes, each with its own named pointers, an optional band behind a run of
 * boxes, and a short coral note for a wrong move. Used by the batch-01 stories (fixed window,
 * two ends, three zones, mile markers). Draws state only.
 */

export type RowTone = "accent" | "teal" | "coral";

export type RowBand = { from: number; to: number; label: string; tone: RowTone };

export type RowMarker = { index: number; label: string; tone: RowTone };

export type Rec01Row = {
  /** Short name printed at the left of the row ("nums", "answer"). */
  name?: string;
  values: (number | string)[];
  tones: CellTone[];
  markers: RowMarker[];
  /** Horizontal offset in columns. 0.5 puts each box between two boxes of a row with shift 0. */
  shift?: number;
  /** A band drawn behind a run of boxes, with a label under it. */
  band?: RowBand | null;
  /** More bands, for rows split into zones. */
  bands?: RowBand[];
  /** A wrong move, drawn above one box ("✕ still inside"). */
  note?: { index: number; text: string } | null;
};

export type Rec01RowsState = {
  rows: Rec01Row[];
  counter?: { label: string; value: number } | null;
  /** Centre text at the top ("sum = 2"). */
  center?: string | null;
  /** Teal text at the top right ("best = 51"). */
  best?: string | null;
  /** Which row takes clicks while a cell quiz is open. */
  pickRow?: number;
};

const WIDTH = 560;
const MARGIN = 16;
const GAP = 8;
const FIRST_Y = 80;
const ROW_STEP = 138;

const COLOR: Record<RowTone, string> = { accent: VIZ_COLORS.accent, teal: VIZ_COLORS.teal, coral: VIZ_COLORS.coral };
const BAND_FILL: Record<RowTone, string> = {
  accent: "color-mix(in srgb, var(--accent) 12%, transparent)",
  teal: "color-mix(in srgb, var(--teal) 14%, transparent)",
  coral: "color-mix(in srgb, var(--coral) 12%, transparent)",
};

/** Pointers on the same box share one arrow; their labels are joined ("low = mid"). */
function groupMarkers(markers: RowMarker[]) {
  const byIndex = new Map<number, RowMarker[]>();
  for (const marker of markers) byIndex.set(marker.index, [...(byIndex.get(marker.index) ?? []), marker]);
  return [...byIndex.entries()].map(([index, group]) => ({ index, label: group.map((item) => item.label).join(" = "), tone: group[0].tone }));
}

/** A note near either edge grows inward, so it is never clipped. */
function noteAnchor(x: number): "start" | "middle" | "end" {
  if (x < 80) return "start";
  if (x > WIDTH - 80) return "end";
  return "middle";
}

export function Rec01RowsView({ state, pick }: { state: Rec01RowsState; pick?: CellPick }) {
  const named = state.rows.some((row) => row.name);
  const left = named ? 72 : MARGIN;
  const columns = Math.max(1, ...state.rows.map((row) => row.values.length + (row.shift ?? 0)));
  const size = Math.min(44, Math.floor((WIDTH - left - MARGIN - (columns - 1) * GAP) / columns));
  const span = columns * (size + GAP) - GAP;
  const startX = left + (WIDTH - left - MARGIN - span) / 2;
  const cellX = (row: Rec01Row, index: number) => startX + (index + (row.shift ?? 0)) * (size + GAP);
  const rowY = (rowIndex: number) => FIRST_Y + rowIndex * ROW_STEP;
  const height = rowY(state.rows.length - 1) + size + 52;
  const pickRow = state.pickRow ?? 0;

  return (
    <Frame width={WIDTH} height={height} label="Rows of numbered boxes with pointers above them">
      {state.counter ? (
        <Label x={MARGIN} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.center ? (
        <Label x={WIDTH / 2} y={22} size={13} weight={600} tone="ink" anchor="middle">
          {state.center}
        </Label>
      ) : null}
      {state.best ? (
        <Label x={WIDTH - MARGIN} y={22} size={13} weight={600} tone="teal" anchor="end">
          {state.best}
        </Label>
      ) : null}

      {state.rows.map((row, rowIndex) => {
        const y = rowY(rowIndex);
        const band = row.band;
        return (
          <g key={rowIndex}>
            {row.name ? (
              <Label x={MARGIN} y={y + size / 2 + 4} size={12} weight={600}>
                {row.name}
              </Label>
            ) : null}

            {[band ?? null, ...(row.bands ?? [])].map((item, bandIndex) => (
              <g key={`band-${bandIndex}`}>
                <rect
                  className={GLIDE}
                  y={y - 6}
                  height={size + 12}
                  rx={12}
                  fill={item ? BAND_FILL[item.tone] : "transparent"}
                  stroke={item ? COLOR[item.tone] : "transparent"}
                  strokeOpacity={0.45}
                  style={{
                    x: item ? cellX(row, item.from) - 4 : startX,
                    width: item ? cellX(row, item.to) + size + 4 - (cellX(row, item.from) - 4) : 0,
                    opacity: item ? 1 : 0,
                  }}
                />
                {item ? (
                  <text
                    x={(cellX(row, item.from) + cellX(row, item.to) + size) / 2}
                    y={y + size + 34}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={COLOR[item.tone]}
                  >
                    {item.label}
                  </text>
                ) : null}
              </g>
            ))}

            {row.values.map((value, index) => (
              <g key={index}>
                <Cell
                  x={cellX(row, index)}
                  y={y}
                  size={size}
                  value={value}
                  tone={rowIndex === pickRow ? pickTone(pick, index, row.tones[index] ?? "idle") : (row.tones[index] ?? "idle")}
                  caption={String(index)}
                />
                {rowIndex === pickRow ? <RejectedMark pick={pick} index={index} x={cellX(row, index) + size - 8} y={y + 12} /> : null}
              </g>
            ))}

            {groupMarkers(row.markers).map((marker) => (
              <g
                key={marker.label}
                className={GLIDE}
                style={{ transform: `translate(${cellX(row, marker.index) + size / 2}px, ${y - 4}px)` }}
              >
                <path d="M0 0 L-6 -9 L6 -9 Z" fill={COLOR[marker.tone]} />
                <text
                  x={0}
                  y={-13}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill={COLOR[marker.tone]}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {marker.label}
                </text>
              </g>
            ))}

            {row.note ? (
              <text
                x={cellX(row, row.note.index) + size / 2}
                y={y - 32}
                textAnchor={noteAnchor(cellX(row, row.note.index) + size / 2)}
                fontSize={12}
                fontWeight={700}
                fill={VIZ_COLORS.coral}
              >
                {row.note.text}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Click targets sit on top, only while the reader is asked to point at a box. */}
      {state.rows[pickRow]?.values.map((_, index) => {
        const row = state.rows[pickRow];
        return (
          <PickTarget
            key={`pick-${index}`}
            pick={pick}
            index={index}
            x={cellX(row, index) - GAP / 2}
            y={rowY(pickRow) - 4}
            width={size + GAP}
            height={size + 22}
            label={`Choose box ${index}`}
          />
        );
      })}
    </Frame>
  );
}
