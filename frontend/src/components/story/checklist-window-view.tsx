import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A string with a basket (window) on it, and the shopping list the basket must cover. Draws state only. */

export type ChecklistRow = {
  letter: string;
  need: number;
  /** How many of this letter the basket holds right now. */
  have: number;
  /** "hit" = just ticked, "miss" = just went missing. */
  tone: "idle" | "hit" | "miss";
};

export type ChecklistWindowState = {
  chars: string[];
  tones: CellTone[];
  /** Left edge of the basket. */
  left: number | null;
  /** Right edge of the basket. */
  right: number | null;
  list: ChecklistRow[];
  /** False while the problem is only being stated: the list then shows what is needed, not what we have. */
  counting: boolean;
  best: [number, number] | null;
  counter?: { label: string; value: number } | null;
  /** The row a careless shopper would untick although a spare copy is still in the basket. */
  trapRow?: number | null;
  /**
   * What a cell quiz clicks on: "edge" = the letters of the string,
   * "list" = the rows of the list, plus one extra "nothing" box after the last row.
   */
  ask?: "edge" | "list" | null;
};

const WIDTH = 560;
const HEIGHT = 236;
const MARGIN = 16;
const CELLS_Y = 62;
const LIST_X = 104;
const LIST_Y = 150;
const ROW_H = 46;
const ROW_GAP = 8;

function Marker({ x, label, color, hidden }: { x: number; label: string; color: string; hidden: boolean }) {
  return (
    <g className={GLIDE} style={{ transform: `translate(${x}px, ${CELLS_Y - 4}px)`, opacity: hidden ? 0 : 1 }}>
      <path d="M0 0 L-6 -9 L6 -9 Z" fill={color} />
      <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );
}

export function ChecklistWindowView({ state, pick }: { state: ChecklistWindowState; pick?: CellPick }) {
  const count = Math.max(state.chars.length, 1);
  // Cells shrink so that the longest string still fits between the margins.
  const gap = count > 10 ? 5 : 8;
  const size = Math.min(44, Math.floor((WIDTH - 2 * MARGIN - (count - 1) * gap) / count));
  const startX = (WIDTH - (count * (size + gap) - gap)) / 2;
  const cellX = (index: number) => startX + index * (size + gap);
  const centerX = (index: number) => cellX(index) + size / 2;

  const { left, right } = state;
  const body = left !== null && right !== null && right >= left;
  const same = body && left === right;
  // Two labels over neighbouring small cells would touch, so the left one steps aside.
  const close = body && !same && centerX(right) - centerX(left) < 44;

  // The list always leaves room for one more box ("nothing"), so rows never jump when it appears.
  const rows = state.list.length;
  const rowW = Math.min(132, Math.floor((WIDTH - MARGIN - LIST_X - rows * ROW_GAP) / (rows + 1)));
  const rowX = (index: number) => LIST_X + index * (rowW + ROW_GAP);
  const ticked = state.list.filter((row) => row.have >= row.need).length;
  const edgePick = state.ask === "edge" ? pick : undefined;
  const listPick = state.ask === "list" ? pick : undefined;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A string with a basket on it, and the list of letters the basket must hold">
      {state.counter ? (
        <Label x={MARGIN} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.best ? (
        <Label x={WIDTH - MARGIN} y={20} size={13} weight={600} tone="teal" anchor="end">
          best length = {state.best[1] - state.best[0] + 1}
        </Label>
      ) : null}

      {/* The basket: one shape that stretches and shrinks. */}
      <rect
        className={GLIDE}
        y={CELLS_Y - 5}
        height={size + 10}
        rx={12}
        fill="color-mix(in srgb, var(--accent) 12%, transparent)"
        stroke={VIZ_COLORS.accent}
        strokeOpacity={0.45}
        style={{
          x: body ? cellX(left) - 4 : startX,
          width: body ? cellX(right) + size + 4 - (cellX(left) - 4) : 0,
          opacity: body ? 1 : 0,
        }}
      />

      {state.chars.map((char, index) => (
        <g key={index}>
          <Cell x={cellX(index)} y={CELLS_Y} size={size} value={char} tone={pickTone(edgePick, index, state.tones[index] ?? "idle")} />
          <RejectedMark pick={edgePick} index={index} x={cellX(index) + size - 8} y={CELLS_Y + 12} />
        </g>
      ))}

      <Marker x={left !== null ? centerX(left) - (close ? 10 : 0) : startX} label={same ? "left = right" : "left"} color={VIZ_COLORS.accent} hidden={left === null} />
      <Marker x={right !== null ? centerX(right) + (close ? 10 : 0) : startX} label="right" color={VIZ_COLORS.accent} hidden={right === null || same} />

      {state.best ? (
        <line
          x1={cellX(state.best[0])}
          y1={CELLS_Y + size + 14}
          x2={cellX(state.best[1]) + size}
          y2={CELLS_Y + size + 14}
          stroke={VIZ_COLORS.teal}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ) : null}

      {/* The shopping list: one box per needed letter. */}
      <Label x={MARGIN} y={LIST_Y + 20} size={13} weight={700} tone="ink">
        the list
      </Label>
      {state.counting ? (
        <Label x={MARGIN} y={LIST_Y + 38} size={12} weight={600} tone={ticked === rows ? "teal" : "muted"}>
          {ticked} of {rows} ticked
        </Label>
      ) : null}

      {state.list.map((row, index) => {
        const x = rowX(index);
        const done = state.counting && row.have >= row.need;
        const picked = listPick?.picked === index;
        const correct = picked && index === listPick?.answer;
        const wrong = (picked && !correct) || (listPick?.rejected?.includes(index) ?? false);
        const stroke = wrong || row.tone === "miss" ? VIZ_COLORS.coral : done || correct ? VIZ_COLORS.teal : VIZ_COLORS.line;
        const fill = wrong
          ? "color-mix(in srgb, var(--coral) 28%, transparent)"
          : correct
            ? "color-mix(in srgb, var(--teal) 45%, transparent)"
            : row.tone === "miss"
              ? "color-mix(in srgb, var(--coral) 16%, transparent)"
              : done
                ? `color-mix(in srgb, var(--teal) ${row.tone === "hit" ? 36 : 18}%, transparent)`
                : "transparent";
        return (
          <g key={row.letter}>
            <rect className={GLIDE} x={x} y={LIST_Y} width={rowW} height={ROW_H} rx={9} fill={fill} stroke={stroke} strokeWidth={row.tone === "idle" && !wrong && !correct ? 1.25 : 2} />
            <text x={x + 18} y={LIST_Y + 30} textAnchor="middle" fontSize={19} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
              {row.letter}
            </text>
            <text x={x + 36} y={LIST_Y + 19} fontSize={11.5} fontWeight={600} fill={VIZ_COLORS.muted}>
              need {row.need}
            </text>
            {state.counting ? (
              <text x={x + 36} y={LIST_Y + 36} fontSize={11.5} fontWeight={700} fill={row.tone === "miss" ? VIZ_COLORS.coral : done ? VIZ_COLORS.teal : VIZ_COLORS.ink}>
                have {row.have}
              </text>
            ) : null}
            {/* The tick is a drawn mark, so it does not depend on a font or on colour alone. */}
            {done ? <path d={`M${x + rowW - 23} ${LIST_Y + 24} l5 6 l10 -13`} fill="none" stroke={VIZ_COLORS.teal} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
            <RejectedMark pick={listPick} index={index} x={x + rowW - 9} y={LIST_Y + 13} />
            {state.trapRow === index ? (
              <text x={Math.min(Math.max(x + rowW / 2, MARGIN + 100), WIDTH - MARGIN - 100)} y={LIST_Y + ROW_H + 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
                ✕ do not untick: a spare is left
              </text>
            ) : null}
          </g>
        );
      })}

      {/* A real target for "nothing goes missing", shown only while that question is open. */}
      {listPick ? (
        <g>
          <rect
            x={rowX(rows)}
            y={LIST_Y}
            width={rowW}
            height={ROW_H}
            rx={9}
            strokeDasharray="5 4"
            strokeWidth={1.5}
            stroke={listPick.picked === rows && listPick.answer === rows ? VIZ_COLORS.teal : listPick.rejected?.includes(rows) || listPick.picked === rows ? VIZ_COLORS.coral : VIZ_COLORS.muted}
            fill={
              listPick.picked === rows && listPick.answer === rows
                ? "color-mix(in srgb, var(--teal) 45%, transparent)"
                : listPick.rejected?.includes(rows) || listPick.picked === rows
                  ? "color-mix(in srgb, var(--coral) 28%, transparent)"
                  : "transparent"
            }
          />
          <text x={rowX(rows) + rowW / 2} y={LIST_Y + 28} textAnchor="middle" fontSize={13} fontWeight={600} fill={VIZ_COLORS.ink}>
            nothing
          </text>
          <RejectedMark pick={listPick} index={rows} x={rowX(rows) + rowW - 9} y={LIST_Y + 13} />
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point. */}
      {edgePick ? state.chars.map((char, index) => <PickTarget key={`edge-${index}`} pick={edgePick} index={index} x={cellX(index) - gap / 2} y={CELLS_Y - 4} width={size + gap} height={size + 8} label={`Choose the letter ${char}, box ${index + 1}`} />) : null}
      {listPick ? state.list.map((row, index) => <PickTarget key={`row-${index}`} pick={listPick} index={index} x={rowX(index)} y={LIST_Y} width={rowW} height={ROW_H} rx={9} label={`Choose ${row.letter} on the list`} />) : null}
      {listPick ? <PickTarget pick={listPick} index={rows} x={rowX(rows)} y={LIST_Y} width={rowW} height={ROW_H} rx={9} label="Choose nothing goes missing" /> : null}
    </Frame>
  );
}
