import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * A table of small answers, for the two-dimensional table stories (ways to reach a square,
 * biggest carpet, fewest edits). Sized from both directions and centred.
 * "table" draws the grid of squares; "align" draws two words lined up letter by letter.
 * Draws state only.
 */

export type Dp3Square = [row: number, column: number];
type Ink = "teal" | "coral" | "accent";

export type Dp3AlignColumn = {
  /** Letter of the first word in this column, or null for a gap. */
  top: string | null;
  bottom: string | null;
  /** Short word under the column: "keep", "replace", "delete", "insert". Empty for none. */
  label: string;
  tone: CellTone;
};

export type Dp3TableState = {
  mode: "table" | "align";

  /** align: the two words, one column per step. */
  align: Dp3AlignColumn[];

  /** table: a short label left of each row and above each column, or null for a plain grid. */
  rowLabels: string[] | null;
  columnLabels: string[] | null;
  rowTones: CellTone[];
  columnTones: CellTone[];
  /** table: what each square shows. null while still empty. */
  cells: (number | string | null)[][];
  tones: CellTone[][];
  /** table: squares drawn as solid floor tiles (the 1s of a grid of 0s and 1s). null for no floor. */
  tiles: boolean[][] | null;
  /** table: a tiny word at the bottom of a square, such as "start". */
  marks: { square: Dp3Square; text: string }[];
  here: Dp3Square | null;
  /** table: where the square being filled gets its number from. */
  arrows: { from: Dp3Square; to: Dp3Square }[];
  /** table: walks through the squares. */
  paths: { squares: Dp3Square[]; tone: Ink; arrow: boolean }[];
  /** table: a frame drawn around a block of squares. */
  outlines: { top: number; left: number; side: number; tone: Ink }[];

  badge: { text: string; tone: Ink } | null;
  counter: { label: string; value: number } | null;
  /** Top right. Shown only once it is known. */
  answer: { label: string; value: string } | null;
  /** One short line under the picture. */
  note: { text: string; tone: Ink | "muted" } | null;
};

const WIDTH = 560;
const HEIGHT = 300;
const GAP = 3;

const LETTER_COLOR: Record<CellTone, string> = {
  idle: VIZ_COLORS.ink,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  done: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  faded: VIZ_COLORS.muted,
};

const INK: Record<Ink, string> = { teal: VIZ_COLORS.teal, coral: VIZ_COLORS.coral, accent: VIZ_COLORS.accent };

function Align({ state }: { state: Dp3TableState }) {
  const count = Math.max(state.align.length, 1);
  const pitch = Math.min(56, (WIDTH - 150) / count);
  const box = Math.min(40, pitch - 8);
  const startX = 110 + (WIDTH - 150 - count * pitch) / 2 + (pitch - box) / 2;
  const topY = 64;
  const bottomY = 150;
  return (
    <g>
      <Label x={16} y={topY + box / 2 + 4} size={12} weight={600}>
        first word
      </Label>
      <Label x={16} y={bottomY + box / 2 + 4} size={12} weight={600}>
        second word
      </Label>
      {state.align.map((column, index) => {
        const x = startX + index * pitch;
        const labelled = column.label !== "";
        return (
          <g key={index}>
            {column.top !== null ? <Cell x={x} y={topY} size={box} value={column.top} tone={column.tone} /> : labelled ? <Cell x={x} y={topY} size={box} value="" tone="faded" /> : null}
            {column.bottom !== null ? <Cell x={x} y={bottomY} size={box} value={column.bottom} tone={column.tone} /> : labelled ? <Cell x={x} y={bottomY} size={box} value="" tone="faded" /> : null}
            {labelled ? (
              <g>
                <line x1={x + box / 2} y1={topY + box + 5} x2={x + box / 2} y2={bottomY - 5} stroke={LETTER_COLOR[column.tone]} strokeWidth={2} strokeLinecap="round" strokeOpacity={0.7} />
                <text x={x + box / 2} y={bottomY + box + 18} textAnchor="middle" fontSize={11} fontWeight={700} fill={LETTER_COLOR[column.tone]}>
                  {column.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function Table({ state, pick }: { state: Dp3TableState; pick?: CellPick }) {
  const rows = state.cells.length;
  const columns = state.cells[0]?.length ?? 1;
  const top = state.columnLabels ? 62 : 46;
  const side = state.rowLabels ? 70 : 24;
  // Size from both directions, so a wide grid and a tall grid both fit.
  const size = Math.floor(Math.min(40, (HEIGHT - 30 - top) / rows - GAP, (WIDTH - 2 * side) / columns - GAP));
  const pitch = size + GAP;
  const startX = (WIDTH - columns * pitch + GAP) / 2;
  const x = (column: number) => startX + column * pitch;
  const y = (row: number) => top + row * pitch;
  const centre = ([row, column]: Dp3Square): [number, number] => [x(column) + size / 2, y(row) + size / 2];
  const flat = (row: number, column: number) => row * columns + column;
  const small = (text: string) => text.length > 1;

  return (
    <g>
      {state.columnLabels?.map((text, column) => (
        <text
          key={`column-${column}`}
          x={x(column) + size / 2}
          y={top - 9}
          textAnchor="middle"
          fontSize={small(text) ? 10 : 15}
          fontWeight={small(text) ? 500 : 700}
          fill={small(text) ? VIZ_COLORS.muted : LETTER_COLOR[state.columnTones[column] ?? "idle"]}
          fontFamily={small(text) ? undefined : "ui-monospace, SFMono-Regular, Menlo, monospace"}
        >
          {text}
        </text>
      ))}
      {state.rowLabels?.map((text, row) => (
        <text
          key={`row-${row}`}
          x={startX - 10}
          y={y(row) + size / 2 + 5}
          textAnchor="end"
          fontSize={small(text) ? 10 : 15}
          fontWeight={small(text) ? 500 : 700}
          fill={small(text) ? VIZ_COLORS.muted : LETTER_COLOR[state.rowTones[row] ?? "idle"]}
          fontFamily={small(text) ? undefined : "ui-monospace, SFMono-Regular, Menlo, monospace"}
        >
          {text}
        </text>
      ))}

      {state.cells.map((line, row) =>
        line.map((value, column) => {
          const tone = pickTone(pick, flat(row, column), state.tones[row]?.[column] ?? "idle");
          return (
            <g key={`${row}-${column}`}>
              {state.tiles?.[row]?.[column] ? <rect x={x(column)} y={y(row)} width={size} height={size} rx={7} fill="color-mix(in srgb, var(--foreground) 13%, transparent)" opacity={tone === "faded" ? 0.4 : 1} /> : null}
              <Cell x={x(column)} y={y(row)} size={size} value={value === null ? "" : value} tone={tone} />
              <RejectedMark pick={pick} index={flat(row, column)} x={x(column) + size - 7} y={y(row) + 11} />
            </g>
          );
        }),
      )}

      {state.marks.map((mark) => (
        <text key={`mark-${mark.square.join("-")}`} x={x(mark.square[1]) + size / 2} y={y(mark.square[0]) + size - 4} textAnchor="middle" fontSize={8.5} fontWeight={600} fill={VIZ_COLORS.muted}>
          {mark.text}
        </text>
      ))}

      {state.outlines.map((outline) => (
        <rect
          key={`outline-${outline.top}-${outline.left}-${outline.side}`}
          x={x(outline.left) - 2}
          y={y(outline.top) - 2}
          width={outline.side * pitch - GAP + 4}
          height={outline.side * pitch - GAP + 4}
          rx={9}
          fill="none"
          stroke={INK[outline.tone]}
          strokeWidth={3}
        />
      ))}

      {state.paths.map((path, index) => {
        if (path.squares.length < 2) return null;
        const points = path.squares.map((square) => centre(square));
        const [x2, y2] = points.at(-1)!;
        const [x1, y1] = points.at(-2)!;
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        return (
          <g key={`path-${index}`}>
            <polyline points={points.map((point) => point.join(",")).join(" ")} fill="none" stroke={INK[path.tone]} strokeOpacity={0.6} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            {path.arrow ? <path d="M6 0 L-6 -7 L-6 7 Z" fill={INK[path.tone]} transform={`translate(${x2} ${y2}) rotate(${angle})`} /> : null}
          </g>
        );
      })}

      {state.arrows.map((arrow) => {
        const [x1, y1] = centre(arrow.from);
        const [x2, y2] = centre(arrow.to);
        const length = Math.hypot(x2 - x1, y2 - y1) || 1;
        // Start and stop short of the two numbers, so neither is covered.
        const trim = size * 0.3;
        const [ux, uy] = [(x2 - x1) / length, (y2 - y1) / length];
        const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
        return (
          <g key={`arrow-${arrow.from.join("-")}`}>
            <line x1={x1 + ux * trim} y1={y1 + uy * trim} x2={x2 - ux * trim} y2={y2 - uy * trim} stroke={VIZ_COLORS.teal} strokeWidth={2.5} />
            <path d="M0 0 L-8 -4.5 L-8 4.5 Z" fill={VIZ_COLORS.teal} transform={`translate(${x2 - ux * trim} ${y2 - uy * trim}) rotate(${angle})`} />
          </g>
        );
      })}

      {/* A ring that glides from square to square: where we are. */}
      <rect
        className={GLIDE}
        width={size + 6}
        height={size + 6}
        rx={9}
        fill="none"
        stroke={VIZ_COLORS.accent}
        strokeWidth={2}
        style={{ transform: `translate(${x(state.here?.[1] ?? 0) - 3}px, ${y(state.here?.[0] ?? 0) - 3}px)`, opacity: state.here ? 1 : 0 }}
      />

      {state.cells.map((line, row) =>
        line.map((_, column) => (
          <PickTarget key={`pick-${row}-${column}`} pick={pick} index={flat(row, column)} x={x(column) - GAP / 2} y={y(row) - GAP / 2} width={pitch} height={pitch} label={`Choose the square in row ${row + 1}, column ${column + 1}`} />
        )),
      )}
    </g>
  );
}

export function AgyDp3TableView({ state, pick }: { state: Dp3TableState; pick?: CellPick }) {
  return (
    <Frame width={WIDTH} height={HEIGHT} label="A table of small answers, filled square by square from its neighbours">
      {state.counter ? (
        <Label x={16} y={24} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : state.badge ? (
        <Label x={16} y={24} size={13} weight={700} tone={state.badge.tone}>
          {state.badge.text}
        </Label>
      ) : null}
      {state.answer ? (
        <Label x={WIDTH - 16} y={24} size={13} weight={700} tone="teal" anchor="end">
          {state.answer.label}: {state.answer.value}
        </Label>
      ) : null}
      {state.mode === "align" ? <Align state={state} /> : <Table state={state} pick={pick} />}
      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 12} size={12.5} weight={700} tone={state.note.tone} anchor="middle">
          {state.note.text}
        </Label>
      ) : null}
    </Frame>
  );
}
