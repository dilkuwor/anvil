import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Two pictures for the longest shared pick of two words:
 * "words" draws the two words as rows of letters with lines between shared letters,
 * "table" draws the table of small answers. Draws state only.
 */

export type LcsLink = { top: number; bottom: number; tone: "good" | "bad" | "plain" };
export type Square = [row: number, column: number];

export type LcsTableState = {
  text1: string;
  text2: string;
  mode: "words" | "table";

  /** words: lines from letter `top` of the first word to letter `bottom` of the second. */
  links: LcsLink[];
  /** words: tone per letter of each word. */
  topTones: CellTone[];
  bottomTones: CellTone[];
  /** words: short label under the picture. */
  wordNote: { text: string; tone: "teal" | "coral" } | null;
  /** words: a coral arrow over the first word, for a pick that reads backwards. */
  backwards: { from: number; to: number } | null;

  /** table: one number per square, null while still empty. Row 0 and column 0 stand for the empty word. */
  table: (number | null)[][];
  tones: CellTone[][];
  /** table: tone of each row's and column's letter. Index 0 is the "(empty)" label. */
  rowTones: CellTone[];
  columnTones: CellTone[];
  here: Square | null;
  /** table: where the square we are filling got its number from. */
  arrows: { from: Square; to: Square }[];
  /** table: the walk back from the corner. */
  path: Square[];
  /** table: the off-by-one mistake. The letter of `wrongRow` is crossed out and the rows get numbers. */
  trap: { row: number; wrongRow: number } | null;
  badge: { text: string; tone: "teal" | "accent" | "coral" } | null;
  /** Shown only once it is known. */
  answer: number | null;
  counter: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 300;
const GAP = 3;
const TABLE_TOP = 62;

const LETTER_COLOR: Record<CellTone, string> = {
  idle: VIZ_COLORS.ink,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  done: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  faded: VIZ_COLORS.muted,
};

function Words({ state }: { state: LcsTableState }) {
  const size = 40;
  const gap = 8;
  const longest = Math.max(state.text1.length, state.text2.length, 1);
  const pitch = Math.min(size + gap, (WIDTH - 160) / longest);
  const box = pitch - gap;
  const topY = 62;
  const bottomY = 176;
  const startX = (word: string) => 100 + (WIDTH - 160 - word.length * pitch + gap) / 2;
  const centre = (word: string, index: number) => startX(word) + index * pitch + box / 2;

  return (
    <g>
      <Label x={16} y={topY + box / 2 + 4} size={12} weight={600}>
        first word
      </Label>
      <Label x={16} y={bottomY + box / 2 + 4} size={12} weight={600}>
        second word
      </Label>
      {state.links.map((link) => (
        <line
          key={`${link.top}-${link.bottom}`}
          x1={centre(state.text1, link.top)}
          y1={topY + box + 3}
          x2={centre(state.text2, link.bottom)}
          y2={bottomY - 3}
          stroke={link.tone === "good" ? VIZ_COLORS.teal : link.tone === "bad" ? VIZ_COLORS.coral : VIZ_COLORS.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      ))}
      {[...state.text1].map((letter, index) => (
        <Cell key={`top-${index}`} x={startX(state.text1) + index * pitch} y={topY} size={box} value={letter} tone={state.topTones[index] ?? "idle"} />
      ))}
      {[...state.text2].map((letter, index) => (
        <Cell key={`bottom-${index}`} x={startX(state.text2) + index * pitch} y={bottomY} size={box} value={letter} tone={state.bottomTones[index] ?? "idle"} />
      ))}
      {state.backwards ? (
        <g>
          <path
            d={`M${centre(state.text1, state.backwards.from)} ${topY - 5} Q${(centre(state.text1, state.backwards.from) + centre(state.text1, state.backwards.to)) / 2} ${topY - 34} ${centre(state.text1, state.backwards.to)} ${topY - 5}`}
            fill="none"
            stroke={VIZ_COLORS.coral}
            strokeWidth={2.25}
          />
          <path d="M0 0 L-5 -9 L5 -9 Z" fill={VIZ_COLORS.coral} transform={`translate(${centre(state.text1, state.backwards.to)} ${topY - 3})`} />
        </g>
      ) : null}
      {state.wordNote ? (
        <Label x={300} y={bottomY + box + 30} size={13} weight={700} tone={state.wordNote.tone} anchor="middle">
          {state.wordNote.text}
        </Label>
      ) : null}
    </g>
  );
}

function Table({ state, pick }: { state: LcsTableState; pick?: CellPick }) {
  const rows = state.table.length;
  const columns = state.table[0]?.length ?? 1;
  // Size from both directions, so a six-letter word still fits.
  const size = Math.floor(Math.min(40, (HEIGHT - TABLE_TOP - 10) / rows - GAP, (WIDTH - 260) / columns - GAP));
  const pitch = size + GAP;
  const startX = (WIDTH - columns * pitch + GAP) / 2;
  const x = (column: number) => startX + column * pitch;
  const y = (row: number) => TABLE_TOP + row * pitch;
  const centre = ([row, column]: Square): [number, number] => [x(column) + size / 2, y(row) + size / 2];
  const flat = (row: number, column: number) => row * columns + column;

  return (
    <g>
      {state.columnTones.map((tone, column) => (
        <text
          key={`column-${column}`}
          x={x(column) + size / 2}
          y={TABLE_TOP - 9}
          textAnchor="middle"
          fontSize={column === 0 ? 10 : 15}
          fontWeight={column === 0 ? 500 : 700}
          fill={column === 0 ? VIZ_COLORS.muted : LETTER_COLOR[tone]}
          fontFamily={column === 0 ? undefined : "ui-monospace, SFMono-Regular, Menlo, monospace"}
        >
          {column === 0 ? "(empty)" : state.text2[column - 1]}
        </text>
      ))}
      {state.rowTones.map((tone, row) => {
        const wrong = state.trap?.wrongRow === row;
        return (
          <text
            key={`row-${row}`}
            x={startX - 10}
            y={y(row) + size / 2 + 5}
            textAnchor="end"
            fontSize={row === 0 ? 10 : 15}
            fontWeight={row === 0 ? 500 : 700}
            fill={row === 0 ? VIZ_COLORS.muted : wrong ? VIZ_COLORS.coral : LETTER_COLOR[tone]}
            fontFamily={row === 0 ? undefined : "ui-monospace, SFMono-Regular, Menlo, monospace"}
          >
            {row === 0 ? "(empty)" : `${wrong ? "✕ " : ""}${state.text1[row - 1]}`}
          </text>
        );
      })}
      {/* Row numbers appear only while the off-by-one mistake is on screen. */}
      {state.trap
        ? state.table.map((_, row) => (
            <text key={`number-${row}`} x={x(columns - 1) + size + 12} y={y(row) + size / 2 + 4} fontSize={11} fontWeight={row === state.trap?.row ? 700 : 500} fill={row === state.trap?.row ? VIZ_COLORS.teal : row === state.trap?.wrongRow ? VIZ_COLORS.coral : VIZ_COLORS.muted}>
              row {row}
              {row === state.trap?.row ? ` = letter ${row - 1}` : ""}
            </text>
          ))
        : null}

      {state.table.map((line, row) =>
        line.map((value, column) => (
          <g key={`${row}-${column}`}>
            <Cell x={x(column)} y={y(row)} size={size} value={value === null ? "" : value} tone={pickTone(pick, flat(row, column), state.tones[row]?.[column] ?? "idle")} />
            <RejectedMark pick={pick} index={flat(row, column)} x={x(column) + size - 7} y={y(row) + 11} />
          </g>
        )),
      )}

      {state.path.length > 1 ? (
        <polyline
          points={state.path.map((square) => centre(square).join(",")).join(" ")}
          fill="none"
          stroke={VIZ_COLORS.teal}
          strokeOpacity={0.55}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {state.arrows.map((arrow) => {
        const [x1, y1] = centre(arrow.from);
        const [x2, y2] = centre(arrow.to);
        const length = Math.hypot(x2 - x1, y2 - y1) || 1;
        // Start and stop short of the two numbers, so neither is covered.
        const trim = size * 0.3;
        const [ux, uy] = [(x2 - x1) / length, (y2 - y1) / length];
        const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
        return (
          <g key={`${arrow.from.join("-")}`}>
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

      {state.table.map((line, row) =>
        line.map((_, column) => (
          <PickTarget
            key={`pick-${row}-${column}`}
            pick={pick}
            index={flat(row, column)}
            x={x(column) - GAP / 2}
            y={y(row) - GAP / 2}
            width={pitch}
            height={pitch}
            label={`Choose the square in row ${row === 0 ? "(empty)" : state.text1[row - 1]}, column ${column === 0 ? "(empty)" : state.text2[column - 1]}`}
          />
        )),
      )}
    </g>
  );
}

export function LcsTableView({ state, pick }: { state: LcsTableState; pick?: CellPick }) {
  return (
    <Frame width={WIDTH} height={HEIGHT} label="Two words, and the table that finds their longest shared pick of letters">
      {state.counter ? (
        <Label x={16} y={24} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : state.badge ? (
        <Label x={16} y={24} size={13} weight={700} tone={state.badge.tone}>
          {state.badge.text}
        </Label>
      ) : null}
      {state.answer !== null ? (
        <Label x={WIDTH - 16} y={24} size={13} weight={700} tone="teal" anchor="end">
          longest shared pick: {state.answer}
        </Label>
      ) : null}
      {state.mode === "words" ? <Words state={state} /> : <Table state={state} pick={pick} />}
    </Frame>
  );
}
