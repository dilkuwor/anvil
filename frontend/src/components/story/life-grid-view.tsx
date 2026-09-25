import type { ReactNode } from "react";

import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for "every cell changes at the same moment": a board whose cells keep the old state
 * in ink (bit 0) and, once decided, the new state in pencil (bit 1). Draws state only.
 */

export type LifePos = [number, number];
/** One cell: the old state in ink, and the new state in pencil once it is decided. */
export type LifeCell = { ink: number; pencil: number | null };
/** One neighbour the cursor cell is reading, and whether its ink says live. */
export type LifeRead = { pos: LifePos; live: boolean };

export type LifeGridState = {
  cells: LifeCell[][];
  /** The cell being decided. */
  cursor: LifePos | null;
  /** The neighbours the cursor cell is reading right now. */
  reads?: LifeRead[] | null;
  /** The card beside the board: what the cursor cell is, what it reads, and what it decides. */
  card?: { ink: number; count: number; pencil: number | null } | null;
  /** Cells the caption points at: teal = good, coral = a problem. */
  mark?: { cells: LifePos[]; tone: "teal" | "coral"; label?: string } | null;
  /** A second board on the right: the slow way's copy, or the board one step later. */
  side?: { title: string; cells: LifeCell[][]; reads?: LifeRead[] | null; faded?: boolean } | null;
  /** True while the picture shows the mistaken way. */
  wrong?: boolean;
  counter?: { label: string; value: number } | null;
  /** Whether the pencil corner is part of the picture yet. */
  showPencil?: boolean;
};

const WIDTH = 560;
const HEIGHT = 264;
const MAIN = { x: 34, y: 54, width: 212, height: 200, gap: 6, max: 46 };
const SIDE = { x: 276, y: 74, size: 26, gap: 4 };
const PANEL_X = 276;
const PANEL_WIDTH = 268;

const has = (list: LifePos[] | undefined | null, r: number, c: number) => !!list?.some(([row, col]) => row === r && col === c);
const readAt = (list: LifeRead[] | undefined | null, r: number, c: number) => list?.find(({ pos }) => pos[0] === r && pos[1] === c) ?? null;

const CURSOR_FILL = "color-mix(in srgb, var(--accent) 12%, transparent)";
const LIVE_READ_FILL = "color-mix(in srgb, var(--teal) 30%, transparent)";
const PENCIL_FILL = "color-mix(in srgb, var(--accent) 18%, transparent)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

function boardSize(rows: number, cols: number, area: { width: number; height: number; gap: number; max: number }) {
  return Math.max(14, Math.min(area.max, Math.floor((area.width - (cols - 1) * area.gap) / Math.max(cols, 1)), Math.floor((area.height - (rows - 1) * area.gap) / Math.max(rows, 1))));
}

/** One cell of a board: ink digit in the middle, pencil digit in its own corner slot. */
function LifeBox({
  x,
  y,
  size,
  cell,
  fill,
  stroke,
  dashed,
  strong,
  showPencil,
  faded,
}: {
  x: number;
  y: number;
  size: number;
  cell: LifeCell;
  fill: string;
  stroke: string;
  dashed: boolean;
  strong: boolean;
  showPencil: boolean;
  faded: boolean;
}) {
  const slot = Math.max(10, Math.round(size * 0.34));
  const inkFont = Math.round(size * 0.38);
  return (
    <g opacity={faded ? 0.45 : 1}>
      <rect className={GLIDE} x={x} y={y} width={size} height={size} rx={Math.round(size * 0.16)} fill={fill} stroke={stroke} strokeWidth={strong ? 2 : 1} strokeDasharray={dashed ? "4 3" : undefined} />
      <text
        x={x + (showPencil ? size * 0.42 : size / 2)}
        y={y + size / 2 + inkFont * 0.36}
        textAnchor="middle"
        fontSize={inkFont}
        fontWeight={700}
        fill={cell.ink === 1 ? VIZ_COLORS.ink : VIZ_COLORS.muted}
        opacity={cell.ink === 1 ? 1 : 0.7}
        fontFamily={MONO}
      >
        {cell.ink}
      </text>
      {showPencil ? (
        <g className={GLIDE}>
          <rect
            x={x + size - slot - 3}
            y={y + 3}
            width={slot}
            height={slot}
            rx={3}
            fill={cell.pencil === null ? "transparent" : PENCIL_FILL}
            stroke={VIZ_COLORS.accent}
            strokeOpacity={cell.pencil === null ? 0.4 : 0.9}
            strokeWidth={1}
            strokeDasharray={cell.pencil === null ? "2 2" : undefined}
          />
          {cell.pencil !== null ? (
            <text x={x + size - 3 - slot / 2} y={y + 3 + slot * 0.76} textAnchor="middle" fontSize={Math.round(slot * 0.72)} fontWeight={700} fill={VIZ_COLORS.accent} fontFamily={MONO}>
              {cell.pencil}
            </text>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}

export function LifeGridView({ state, pick }: { state: LifeGridState; pick?: CellPick }) {
  const rows = state.cells.length;
  const cols = state.cells[0]?.length ?? 1;
  const size = boardSize(rows, cols, MAIN);
  const step = size + MAIN.gap;
  const startX = MAIN.x + (MAIN.width - (cols * step - MAIN.gap)) / 2;
  const startY = MAIN.y + (MAIN.height - (rows * step - MAIN.gap)) / 2;
  const cellX = (c: number) => startX + c * step;
  const cellY = (r: number) => startY + r * step;
  const showPencil = state.showPencil ?? false;
  const card = state.cursor && state.card ? state.card : null;

  // Legend: only the lines that mean something in this frame, stacked upwards from the bottom.
  const legend: { label: string; tone: "ink" | "accent" | "teal" | "coral"; draw: (y: number) => ReactNode }[] = [
    {
      label: "big digit: the ink, the old state",
      tone: "ink",
      draw: (y) => <LifeBox x={PANEL_X} y={y - 11} size={14} cell={{ ink: 1, pencil: null }} fill="transparent" stroke={VIZ_COLORS.line} dashed={false} strong={false} showPencil={false} faded={false} />,
    },
  ];
  if (showPencil) {
    legend.push({
      label: "corner digit: the pencil, the new state",
      tone: "accent",
      draw: (y) => <rect x={PANEL_X + 1} y={y - 10} width={12} height={12} rx={3} fill={PENCIL_FILL} stroke={VIZ_COLORS.accent} strokeWidth={1} />,
    });
  }
  // Under a second board only two lines fit; the rest would collide with it.
  if (!state.side) {
    if (state.cursor) {
      legend.push({
        label: "ring: the cell being decided",
        tone: "accent",
        draw: (y) => <rect x={PANEL_X} y={y - 11} width={14} height={14} rx={4} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={2.25} />,
      });
    }
    if (state.reads && state.reads.length > 0) {
      legend.push({
        label: "teal: a neighbour whose ink says live",
        tone: "teal",
        draw: (y) => <rect x={PANEL_X} y={y - 11} width={14} height={14} rx={4} fill={LIVE_READ_FILL} stroke={VIZ_COLORS.teal} strokeWidth={1.5} />,
      });
    }
    if (state.mark?.label) {
      const tone = state.mark.tone;
      legend.push({
        label: state.mark.label,
        tone,
        draw: (y) => <rect x={PANEL_X} y={y - 11} width={14} height={14} rx={4} fill={`color-mix(in srgb, var(--${tone}) 30%, transparent)`} stroke={tone === "teal" ? VIZ_COLORS.teal : VIZ_COLORS.coral} strokeWidth={1.5} />,
      });
    }
  }
  const legendTop = HEIGHT - 10 - (legend.length - 1) * 20;

  const sideRows = state.side?.cells.length ?? 0;
  const sideCols = state.side?.cells[0]?.length ?? 0;
  const sideStep = SIDE.size + SIDE.gap;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A board of live and dead cells, decided one cell at a time">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {/* Row and column numbers, so a caption can say "row 2, column 3". */}
      {Array.from({ length: cols }, (_, c) => (
        <text key={`col-${c}`} x={cellX(c) + size / 2} y={startY - 7} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
          {c + 1}
        </text>
      ))}
      {Array.from({ length: rows }, (_, r) => (
        <text key={`row-${r}`} x={startX - 9} y={cellY(r) + size / 2 + 4} textAnchor="end" fontSize={10} fill={VIZ_COLORS.muted}>
          {r + 1}
        </text>
      ))}

      {state.cells.map((row, r) =>
        row.map((cell, c) => {
          const index = r * cols + c;
          const picked = pickTone(pick, index, "idle");
          const read = readAt(state.reads, r, c);
          const marked = has(state.mark?.cells, r, c) ? state.mark?.tone : null;
          const isCursor = state.cursor?.[0] === r && state.cursor?.[1] === c;

          let fill = "transparent";
          let stroke: string = VIZ_COLORS.line;
          let dashed = false;
          if (isCursor) fill = CURSOR_FILL;
          if (read) {
            fill = read.live ? LIVE_READ_FILL : "transparent";
            stroke = VIZ_COLORS.teal;
            dashed = !read.live;
          }
          if (marked === "teal") {
            fill = "color-mix(in srgb, var(--teal) 40%, transparent)";
            stroke = VIZ_COLORS.teal;
            dashed = false;
          }
          if (marked === "coral") {
            fill = "color-mix(in srgb, var(--coral) 26%, transparent)";
            stroke = VIZ_COLORS.coral;
            dashed = false;
          }
          if (picked === "done") {
            fill = "color-mix(in srgb, var(--teal) 45%, transparent)";
            stroke = VIZ_COLORS.teal;
          }
          // A ruled-out box keeps its own look and only gains a coral edge and a ✕.
          if (picked === "miss") stroke = VIZ_COLORS.coral;
          const strong = stroke !== VIZ_COLORS.line;

          return (
            <g key={`${r}-${c}`}>
              <LifeBox x={cellX(c)} y={cellY(r)} size={size} cell={cell} fill={fill} stroke={stroke} dashed={dashed} strong={strong} showPencil={showPencil} faded={false} />
              {/* Bottom-left corner: the pencil slot owns the top-right one. */}
              <RejectedMark pick={pick} index={index} x={cellX(c) + 8} y={cellY(r) + size - 4} />
            </g>
          );
        }),
      )}

      {/* The cell being decided: one ring that glides from box to box. */}
      <rect
        className={GLIDE}
        x={-3}
        y={-3}
        width={size + 6}
        height={size + 6}
        rx={Math.round(size * 0.16) + 2}
        fill="none"
        stroke={state.wrong ? VIZ_COLORS.coral : VIZ_COLORS.accent}
        strokeWidth={2.5}
        style={{
          transform: `translate(${cellX(state.cursor?.[1] ?? 0)}px, ${cellY(state.cursor?.[0] ?? 0)}px)`,
          opacity: state.cursor ? 1 : 0,
        }}
      />

      {/* The card: what the cursor cell is, reads and decides. */}
      {card && state.cursor && !state.side ? (
        <g>
          <rect x={PANEL_X} y={MAIN.y - 4} width={PANEL_WIDTH} height={102} rx={10} fill="transparent" stroke={state.wrong ? VIZ_COLORS.coral : VIZ_COLORS.line} strokeWidth={state.wrong ? 1.75 : 1} />
          <Label x={PANEL_X + 12} y={MAIN.y + 16} size={12} weight={700} tone={state.wrong ? "coral" : "ink"}>
            {state.wrong ? "✕ wrong count: " : ""}row {state.cursor[0] + 1}, column {state.cursor[1] + 1}
          </Label>
          <Label x={PANEL_X + 12} y={MAIN.y + 38} size={12} tone="ink">
            old state{showPencil ? " (ink)" : ""}: {card.ink === 1 ? "1, live" : "0, dead"}
          </Label>
          <Label x={PANEL_X + 12} y={MAIN.y + 58} size={12} tone={state.wrong ? "coral" : "teal"} weight={600}>
            live neighbours: {card.count}
          </Label>
          <Label x={PANEL_X + 12} y={MAIN.y + 78} size={12} tone={card.pencil === null ? "muted" : "accent"} weight={card.pencil === null ? 500 : 600}>
            new state{showPencil ? " (pencil)" : ""}: {card.pencil === null ? "not decided yet" : card.pencil === 1 ? "1, live" : "0, dead"}
          </Label>
          {showPencil && card.pencil !== null ? (
            <Label x={PANEL_X + 12} y={MAIN.y + 96} size={11} tone="muted">
              stored as {card.ink + card.pencil * 2}: ink {card.ink} plus pencil {card.pencil * 2}
            </Label>
          ) : null}
        </g>
      ) : null}

      {/* The second board: the slow way's copy, or the board one step later. */}
      {state.side ? (
        <g opacity={state.side.faded ? 0.45 : 1}>
          <Label x={SIDE.x} y={SIDE.y - 10} size={12} weight={600} tone="ink">
            {state.side.title}
          </Label>
          {state.side.cells.map((row, r) =>
            row.map((cell, c) => {
              const read = readAt(state.side?.reads, r, c);
              return (
                <LifeBox
                  key={`side-${r}-${c}`}
                  x={SIDE.x + c * sideStep}
                  y={SIDE.y + r * sideStep}
                  size={SIDE.size}
                  cell={cell}
                  fill={read?.live ? LIVE_READ_FILL : "transparent"}
                  stroke={read ? VIZ_COLORS.teal : VIZ_COLORS.line}
                  dashed={!!read && !read.live}
                  strong={!!read}
                  showPencil={false}
                  faded={false}
                />
              );
            }),
          )}
          {sideRows > 0 && sideCols > 0 && state.wrong ? (
            <text x={SIDE.x} y={SIDE.y + sideRows * sideStep + 8} fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
              ✕ changed too early
            </text>
          ) : null}
        </g>
      ) : null}

      {legend.map((item, index) => {
        const y = legendTop + index * 20;
        return (
          <g key={item.label}>
            {item.draw(y)}
            <text x={PANEL_X + 22} y={y} fontSize={11} fill={item.tone === "coral" ? VIZ_COLORS.coral : VIZ_COLORS.ink}>
              {item.label}
            </text>
          </g>
        );
      })}

      {/* Click targets sit on top, only while the reader is asked to point at a box. */}
      {state.cells.map((row, r) =>
        row.map((_, c) => (
          <PickTarget
            key={`pick-${r}-${c}`}
            pick={pick}
            index={r * cols + c}
            x={cellX(c) - MAIN.gap / 2}
            y={cellY(r) - MAIN.gap / 2}
            width={step}
            height={step}
            rx={9}
            label={`Choose the cell in row ${r + 1}, column ${c + 1}`}
          />
        )),
      )}
    </Frame>
  );
}
