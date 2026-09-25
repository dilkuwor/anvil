import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * An n×n tic-tac-toe board with one "rope" (counter) at the end of every line:
 * row ropes to the right of each row, column ropes under each column, the ↘ diagonal's
 * rope at the bottom-right corner and the ↗ diagonal's rope at the bottom-left corner.
 * A rope reads +k when X has pulled it k steps more than O, −k the other way. Draws state only.
 *
 * Click targets (the ropes): 0..n-1 = rows, n..2n-1 = columns, 2n = ↘ diagonal, 2n+1 = ↗ diagonal.
 */

export type LineId = { kind: "row" | "col" | "diag" | "anti"; index: number };

export type Ropes = { rows: number[]; cols: number[]; diag: number; anti: number };

export type TicTacToeState = {
  n: number;
  /** 0 = empty, 1 = X (player 1), 2 = O (player 2). */
  board: number[][];
  /** null hides every rope (before the idea is introduced). */
  ropes: Ropes | null;
  /** Lines to light up: their cells and their rope share the tone. Later entries win over earlier ones. */
  lines: { line: LineId; tone: CellTone }[];
  /** The cell just marked. */
  focus: { row: number; col: number } | null;
  /** The trap, drawn: a plain count of marks on a mixed line. */
  plainCount: { line: LineId; count: number } | null;
  move: string | null;
  answers: number[] | null;
  counter: { label: string; value: number } | null;
  boardFaded: boolean;
  /** A tone for every rope box at once (used to point at "the space we keep"). */
  ropeTone: CellTone | null;
};

const WIDTH = 560;
const TOP = 48;
const SIDE = 10;

const FILL: Record<CellTone, string> = {
  idle: "transparent",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 30%, transparent)",
  done: "color-mix(in srgb, var(--teal) 45%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
  faded: "transparent",
};

const STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  done: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  faded: VIZ_COLORS.line,
};

/** The cells of one line, top to bottom / left to right. */
export function lineCells(n: number, line: LineId): [number, number][] {
  const all = Array.from({ length: n }, (_, i) => i);
  if (line.kind === "row") return all.map((c) => [line.index, c]);
  if (line.kind === "col") return all.map((r) => [r, line.index]);
  if (line.kind === "diag") return all.map((i) => [i, i]);
  return all.map((i) => [i, n - 1 - i]);
}

/** The click-target index of a line's rope. */
export function ropeIndex(n: number, line: LineId): number {
  if (line.kind === "row") return line.index;
  if (line.kind === "col") return n + line.index;
  return line.kind === "diag" ? 2 * n : 2 * n + 1;
}

export function ropeValue(ropes: Ropes, line: LineId): number {
  if (line.kind === "row") return ropes.rows[line.index];
  if (line.kind === "col") return ropes.cols[line.index];
  return line.kind === "diag" ? ropes.diag : ropes.anti;
}

export const sameLine = (a: LineId, b: LineId) => a.kind === b.kind && a.index === b.index;

/** +2, −1 or 0: the sign is the whole point. */
export const fmtRope = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : "0");

const MARK = ["", "X", "O"];

function RopeBox({ x, y, w, h, value, n, tone, pick, index, label }: { x: number; y: number; w: number; h: number; value: number; n: number; tone: CellTone; pick?: CellPick; index: number; label: string }) {
  const shown = pickTone(pick, index, tone);
  const cx = x + w / 2;
  const track = w - 14;
  const ty = y + h - 8;
  const len = (Math.min(Math.abs(value), n) / n) * (track / 2);
  return (
    <g>
      <rect className={GLIDE} x={x} y={y} width={w} height={h} rx={7} fill={FILL[shown]} stroke={STROKE[shown]} strokeWidth={shown === "idle" || shown === "faded" ? 1 : 1.75} />
      <text x={cx} y={y + (h > 30 ? 16 : 13)} textAnchor="middle" fontSize={h > 30 ? 13 : 11} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {fmtRope(value)}
      </text>
      {/* The rope: a track with its middle marked, and a bar pulled toward one side. */}
      <line x1={cx - track / 2} y1={ty} x2={cx + track / 2} y2={ty} stroke={VIZ_COLORS.line} strokeWidth={2} strokeLinecap="round" />
      <line x1={cx} y1={ty - 3} x2={cx} y2={ty + 3} stroke={VIZ_COLORS.muted} strokeWidth={1} />
      <rect className={GLIDE} y={ty - 1.5} height={3} rx={1.5} fill={VIZ_COLORS.ink} style={{ x: value < 0 ? cx - len : cx, width: len }} />
      <RejectedMark pick={pick} index={index} x={x + w - 7} y={y + 10} />
      <title>{label}</title>
    </g>
  );
}

export function TicTacToeView({ state, pick }: { state: TicTacToeState; pick?: CellPick }) {
  const { n, board, ropes } = state;
  // Size from the board: a bigger board gets smaller cells, and always fits.
  const size = Math.min(44, Math.floor(150 / n));
  const gap = 4;
  const pitch = size + gap;
  const boardW = n * pitch - gap;
  const boxW = size;
  const boxH = Math.min(36, size);
  const total = boxW + SIDE + boardW + SIDE + boxW;
  const startX = (WIDTH - total) / 2;
  const bx = startX + boxW + SIDE;
  const cellX = (c: number) => bx + c * pitch;
  const cellY = (r: number) => TOP + r * pitch;
  const rowBoxX = bx + boardW + SIDE;
  const colBoxY = TOP + boardW + SIDE;
  const antiBoxX = startX;
  const height = colBoxY + boxH + 40;

  const toneOfLine = (line: LineId): CellTone | null => {
    let tone: CellTone | null = null;
    for (const entry of state.lines) if (sameLine(entry.line, line)) tone = entry.tone;
    return tone;
  };
  const cellTone = (r: number, c: number): CellTone => {
    let tone: CellTone = state.boardFaded ? "faded" : "idle";
    for (const entry of state.lines) {
      if (lineCells(n, entry.line).some(([lr, lc]) => lr === r && lc === c)) tone = entry.tone;
    }
    return tone;
  };
  const boxTone = (line: LineId): CellTone => toneOfLine(line) ?? state.ropeTone ?? "idle";

  const rowBox = (r: number) => ({ x: rowBoxX, y: cellY(r) + (size - boxH) / 2 });
  const colBox = (c: number) => ({ x: cellX(c), y: colBoxY });
  const boxAt = (line: LineId) => (line.kind === "row" ? rowBox(line.index) : line.kind === "col" ? colBox(line.index) : line.kind === "diag" ? { x: rowBoxX, y: colBoxY } : { x: antiBoxX, y: colBoxY });

  const plain = state.plainCount && ropes ? { ...boxAt(state.plainCount.line), line: state.plainCount.line, count: state.plainCount.count } : null;

  return (
    <Frame width={WIDTH} height={height} label="A tic-tac-toe board with a rope counter at the end of every row, column and diagonal">
      {state.move ? (
        <Label x={16} y={22} size={13} weight={700} tone="accent">
          {state.move}
        </Label>
      ) : null}
      {state.answers ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          answers so far: [{state.answers.join(",")}]
        </Label>
      ) : null}

      {/* Row and column numbers, so "row 2, column 1" can be found at a glance. */}
      {Array.from({ length: n }, (_, i) => (
        <g key={`idx-${i}`}>
          <Label x={cellX(i) + size / 2} y={TOP - 6} size={10} anchor="middle">
            {i}
          </Label>
          <Label x={bx - 6} y={cellY(i) + size / 2 + 4} size={10} anchor="end">
            {i}
          </Label>
        </g>
      ))}

      {board.map((row, r) =>
        row.map((mark, c) => (
          <Cell key={`cell-${r}-${c}`} x={cellX(c)} y={cellY(r)} size={size} value={MARK[mark] ?? ""} tone={cellTone(r, c)} />
        ))
      )}

      {/* Ring around the cell just marked. */}
      <rect
        className={GLIDE}
        width={size}
        height={size}
        rx={7}
        fill="none"
        stroke={VIZ_COLORS.accent}
        strokeWidth={2.5}
        style={{ x: state.focus ? cellX(state.focus.col) : bx, y: state.focus ? cellY(state.focus.row) : TOP, opacity: state.focus ? 1 : 0 }}
      />

      {ropes ? (
        <g>
          {/* Short ties from each corner rope to its diagonal. */}
          <line x1={bx + boardW} y1={TOP + boardW} x2={rowBoxX} y2={colBoxY} stroke={VIZ_COLORS.muted} strokeWidth={1.5} strokeDasharray="3 2" />
          <line x1={bx} y1={TOP + boardW} x2={antiBoxX + boxW} y2={colBoxY} stroke={VIZ_COLORS.muted} strokeWidth={1.5} strokeDasharray="3 2" />
          <Label x={rowBoxX + boxW + 6} y={colBoxY + boxH / 2 + 5} size={14} weight={700}>
            ↘
          </Label>
          <Label x={antiBoxX - 6} y={colBoxY + boxH / 2 + 5} size={14} weight={700} anchor="end">
            ↗
          </Label>

          {ropes.rows.map((value, r) => (
            <RopeBox key={`row-${r}`} {...rowBox(r)} w={boxW} h={boxH} value={value} n={n} tone={boxTone({ kind: "row", index: r })} pick={pick} index={r} label={`row ${r} rope`} />
          ))}
          {ropes.cols.map((value, c) => (
            <RopeBox key={`col-${c}`} {...colBox(c)} w={boxW} h={boxH} value={value} n={n} tone={boxTone({ kind: "col", index: c })} pick={pick} index={n + c} label={`column ${c} rope`} />
          ))}
          <RopeBox x={rowBoxX} y={colBoxY} w={boxW} h={boxH} value={ropes.diag} n={n} tone={boxTone({ kind: "diag", index: 0 })} pick={pick} index={2 * n} label="↘ diagonal rope" />
          <RopeBox x={antiBoxX} y={colBoxY} w={boxW} h={boxH} value={ropes.anti} n={n} tone={boxTone({ kind: "anti", index: 0 })} pick={pick} index={2 * n + 1} label="↗ diagonal rope" />
        </g>
      ) : null}

      {plain ? (
        <text
          x={plain.line.kind === "anti" ? plain.x + boxW + 4 : plain.line.kind === "col" ? plain.x + boxW / 2 : plain.x - 6}
          y={plain.line.kind === "col" ? plain.y + boxH + 14 : plain.y + boxH / 2 + 4}
          textAnchor={plain.line.kind === "col" ? "middle" : plain.line.kind === "anti" ? "start" : "end"}
          fontSize={12}
          fontWeight={700}
          fill={VIZ_COLORS.coral}
        >
          ✕ {plain.count} marks, mixed
        </text>
      ) : null}

      {state.counter ? (
        <Label x={16} y={height - 12} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {ropes ? (
        <Label x={WIDTH - 16} y={height - 12} size={11} weight={600} anchor="end">
          X pulls right (+1) · O pulls left (−1)
        </Label>
      ) : null}

      {/* Click targets last, on top: one per rope. */}
      {ropes
        ? [
            ...ropes.rows.map((_, r) => ({ line: { kind: "row", index: r } as LineId, ...rowBox(r), label: `Choose the row ${r} rope` })),
            ...ropes.cols.map((_, c) => ({ line: { kind: "col", index: c } as LineId, ...colBox(c), label: `Choose the column ${c} rope` })),
            { line: { kind: "diag", index: 0 } as LineId, x: rowBoxX, y: colBoxY, label: "Choose the ↘ diagonal rope" },
            { line: { kind: "anti", index: 0 } as LineId, x: antiBoxX, y: colBoxY, label: "Choose the ↗ diagonal rope" },
          ].map((target) => (
            <PickTarget key={`pick-${target.line.kind}-${target.line.index}`} pick={pick} index={ropeIndex(n, target.line)} x={target.x - 3} y={target.y - 3} width={boxW + 6} height={boxH + 6} label={target.label} />
          ))
        : null}
    </Frame>
  );
}
