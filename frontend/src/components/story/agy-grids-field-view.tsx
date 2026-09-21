import type { ReactNode } from "react";

import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for searches that spread over a grid whose boxes hold something written in them:
 * a letter, a height, or a number of steps. Draws state only.
 *
 * One colour language: accent = where the search is now, teal = known / good,
 * coral = the mistake, faded = no longer matters.
 */

export type FieldPos = [number, number];

export type FieldTone =
  /** An ordinary box nothing has happened to yet. */
  | "open"
  /** A wall: nothing enters it. */
  | "block"
  /** A starting box of the search (a gate, a zero, a box on the border). */
  | "source"
  /** Touched by the search right now: the front of the wave. */
  | "front"
  /** Changed in this very frame. */
  | "fresh"
  /** Finished: it has its mark or its number. */
  | "done"
  /** Turned into a wall by the answer (a captured box). */
  | "taken"
  /** The mistake. */
  | "bad"
  | "faded";

export type FieldCell = {
  text: string;
  tone: FieldTone;
  /** Corner flags, for two colourings that may overlap: "tl" = reached from the top-left water, "br" = from the bottom-right water. */
  flags?: ("tl" | "br")[];
};

export type FieldLegendItem = { mark: FieldTone | "cursor" | "tl" | "br"; label: string };

export type FieldState = {
  cells: FieldCell[][];
  /** Where the search or the scan is standing. */
  cursor?: FieldPos | null;
  /** Steps between two boxes that share a side. */
  arrows?: { from: FieldPos; to: FieldPos; tone: "accent" | "coral" | "teal" }[];
  /** Keep labels under about 20 letters. At most six rows. */
  legend: FieldLegendItem[];
  /** Top left: counted work. */
  counter?: { label: string; value: number } | null;
  /** Top right: one short status line. */
  status?: { text: string; tone: "ink" | "teal" | "coral" } | null;
  /** Two waters around the grid: one along the top and left edges, one along the bottom and right edges. */
  oceans?: { topLeft: string; bottomRight: string } | null;
  /** A short coral "✕ ..." line under the legend, for the trap. */
  note?: string | null;
};

const WIDTH = 560;
const HEIGHT = 290;
const GAP = 4;
const AREA = { x: 48, y: 72, width: 336, height: 190 };
const LEGEND_X = 412;
const LEGEND_Y = 84;
const LEGEND_STEP = 26;

const FILL: Record<FieldTone, string> = {
  open: "transparent",
  block: "color-mix(in srgb, var(--foreground) 18%, transparent)",
  source: "color-mix(in srgb, var(--teal) 14%, transparent)",
  front: "color-mix(in srgb, var(--accent) 38%, transparent)",
  fresh: "color-mix(in srgb, var(--teal) 48%, transparent)",
  done: "color-mix(in srgb, var(--teal) 22%, transparent)",
  taken: "color-mix(in srgb, var(--foreground) 18%, transparent)",
  bad: "color-mix(in srgb, var(--coral) 28%, transparent)",
  faded: "transparent",
};

const STROKE: Record<FieldTone, string> = {
  open: VIZ_COLORS.line,
  block: VIZ_COLORS.muted,
  source: VIZ_COLORS.teal,
  front: VIZ_COLORS.accent,
  fresh: VIZ_COLORS.teal,
  done: VIZ_COLORS.teal,
  taken: VIZ_COLORS.teal,
  bad: VIZ_COLORS.coral,
  faded: VIZ_COLORS.line,
};

const STROKE_WIDTH: Record<FieldTone, number> = { open: 1, block: 1.25, source: 2.5, front: 2, fresh: 2.75, done: 1.5, taken: 2, bad: 2.25, faded: 1 };

const FLAG_FILL = "color-mix(in srgb, var(--foreground) 62%, transparent)";

/** A small filled corner: top-left for the top-left water, bottom-right for the other one. */
function Flag({ x, y, size, corner }: { x: number; y: number; size: number; corner: "tl" | "br" }) {
  const leg = Math.max(7, Math.round(size * 0.32));
  const d =
    corner === "tl"
      ? `M${x + 2} ${y + 2} L${x + 2 + leg} ${y + 2} L${x + 2} ${y + 2 + leg} Z`
      : `M${x + size - 2} ${y + size - 2} L${x + size - 2 - leg} ${y + size - 2} L${x + size - 2} ${y + size - 2 - leg} Z`;
  return <path d={d} fill={FLAG_FILL} />;
}

function LegendMark({ mark, y }: { mark: FieldLegendItem["mark"]; y: number }): ReactNode {
  if (mark === "cursor") return <rect x={LEGEND_X} y={y} width={14} height={14} rx={4} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={2.5} />;
  if (mark === "tl" || mark === "br") {
    return (
      <g>
        <rect x={LEGEND_X} y={y} width={14} height={14} rx={3} fill="transparent" stroke={VIZ_COLORS.line} strokeWidth={1} />
        <Flag x={LEGEND_X - 1} y={y - 1} size={16} corner={mark} />
      </g>
    );
  }
  return <rect x={LEGEND_X} y={y} width={14} height={14} rx={3} fill={FILL[mark]} stroke={STROKE[mark]} strokeWidth={Math.min(2, STROKE_WIDTH[mark])} strokeDasharray={mark === "taken" ? "3 2" : undefined} opacity={mark === "faded" ? 0.45 : 1} />;
}

export function AgyGridsFieldView({ state, pick }: { state: FieldState; pick?: CellPick }) {
  const rows = state.cells.length;
  const cols = state.cells[0]?.length ?? 1;
  // Size from both directions, so tall grids and wide grids both fit.
  const size = Math.max(16, Math.min(40, Math.floor((AREA.width - (cols - 1) * GAP) / cols), Math.floor((AREA.height - (rows - 1) * GAP) / Math.max(rows, 1))));
  const step = size + GAP;
  const gridWidth = cols * step - GAP;
  const gridHeight = rows * step - GAP;
  const startX = AREA.x + (AREA.width - gridWidth) / 2;
  const startY = AREA.y + (AREA.height - gridHeight) / 2;
  const cellX = (c: number) => startX + c * step;
  const cellY = (r: number) => startY + r * step;
  const font = size >= 30 ? 13 : 10;

  // The two waters hug the grid, 6px outside it; the row and column numbers sit outside those lines.
  const edge = { x0: startX - 6, y0: startY - 6, x1: startX + gridWidth + 6, y1: startY + gridHeight + 6 };

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A grid of boxes, and a search that spreads from box to touching box">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.status ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone={state.status.tone} anchor="end">
          {state.status.text}
        </Label>
      ) : null}

      {state.oceans ? (
        <g fill="none" stroke={VIZ_COLORS.muted} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${edge.x1 - 14} ${edge.y0} L${edge.x0} ${edge.y0} L${edge.x0} ${edge.y1 - 14}`} />
          <path d={`M${edge.x0 + 14} ${edge.y1} L${edge.x1} ${edge.y1} L${edge.x1} ${edge.y0 + 14}`} strokeDasharray="7 5" />
        </g>
      ) : null}
      {state.oceans ? (
        <g>
          <text x={edge.x0} y={startY - 27} fontSize={11} fontWeight={600} fill={VIZ_COLORS.ink}>
            {state.oceans.topLeft}
          </text>
          <text x={edge.x1} y={edge.y1 + 15} textAnchor="end" fontSize={11} fontWeight={600} fill={VIZ_COLORS.ink}>
            {state.oceans.bottomRight}
          </text>
        </g>
      ) : null}

      {/* Row and column numbers, so a caption can say "row 2, column 3". */}
      {Array.from({ length: cols }, (_, c) => (
        <text key={`col-${c}`} x={cellX(c) + size / 2} y={startY - 12} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
          {c + 1}
        </text>
      ))}
      {Array.from({ length: rows }, (_, r) => (
        <text key={`row-${r}`} x={startX - 14} y={cellY(r) + size / 2 + 4} textAnchor="end" fontSize={10} fill={VIZ_COLORS.muted}>
          {r + 1}
        </text>
      ))}

      {state.cells.map((row, r) =>
        row.map((cell, c) => {
          const index = r * cols + c;
          const picked = pickTone(pick, index, "idle");
          let fill = FILL[cell.tone];
          let stroke = STROKE[cell.tone];
          let width = STROKE_WIDTH[cell.tone];
          if (picked === "done") {
            fill = "color-mix(in srgb, var(--teal) 45%, transparent)";
            stroke = VIZ_COLORS.teal;
            width = 2.25;
          }
          // A ruled-out box keeps its own look and only gains a coral edge and a ✕.
          if (picked === "miss") {
            stroke = VIZ_COLORS.coral;
            width = 2.25;
          }
          const strong = cell.tone === "block" || cell.tone === "source" || cell.tone === "fresh" || cell.tone === "taken";
          return (
            <g key={`${r}-${c}`} opacity={cell.tone === "faded" ? 0.4 : 1}>
              <rect
                className={GLIDE}
                x={cellX(c)}
                y={cellY(r)}
                width={size}
                height={size}
                rx={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={width}
                strokeDasharray={cell.tone === "taken" && picked === "idle" ? "4 3" : undefined}
              />
              {cell.flags?.map((corner) => <Flag key={corner} x={cellX(c)} y={cellY(r)} size={size} corner={corner} />)}
              <text
                x={cellX(c) + size / 2}
                y={cellY(r) + size / 2 + font / 2 - 1}
                textAnchor="middle"
                fontSize={cell.text === "∞" ? font + 3 : font}
                fontWeight={strong ? 700 : 500}
                fill={cell.tone === "open" ? VIZ_COLORS.muted : VIZ_COLORS.ink}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {cell.text}
              </text>
              {/* Top-right corner of the box: clear of the text and of both corner flags. */}
              <RejectedMark pick={pick} index={index} x={cellX(c) + size - 8} y={cellY(r) + 12} />
            </g>
          );
        }),
      )}

      {/* Where the search stands: one ring that glides from box to box. */}
      <rect
        className={GLIDE}
        x={-3}
        y={-3}
        width={size + 6}
        height={size + 6}
        rx={8}
        fill="none"
        stroke={VIZ_COLORS.accent}
        strokeWidth={2.5}
        style={{
          transform: `translate(${cellX(state.cursor?.[1] ?? 0)}px, ${cellY(state.cursor?.[0] ?? 0)}px)`,
          opacity: state.cursor ? 1 : 0,
        }}
      />

      {/* A step crosses the shared side of two boxes, so it never covers what is written inside them. */}
      {(state.arrows ?? []).map(({ from, to, tone }, index) => {
        const dx = Math.sign(to[1] - from[1]);
        const dy = Math.sign(to[0] - from[0]);
        const reach = size / 2 - 8;
        const x1 = cellX(from[1]) + size / 2 + dx * reach;
        const y1 = cellY(from[0]) + size / 2 + dy * reach;
        const x2 = cellX(to[1]) + size / 2 - dx * reach;
        const y2 = cellY(to[0]) + size / 2 - dy * reach;
        const color = tone === "coral" ? VIZ_COLORS.coral : tone === "teal" ? VIZ_COLORS.teal : VIZ_COLORS.accent;
        return (
          <g key={`arrow-${index}`}>
            <line x1={x1} y1={y1} x2={x2 - dx * 5} y2={y2 - dy * 5} stroke={color} strokeWidth={2.5} />
            <path d={`M${x2} ${y2} L${x2 - dx * 7 - dy * 4.5} ${y2 - dy * 7 + dx * 4.5} L${x2 - dx * 7 + dy * 4.5} ${y2 - dy * 7 - dx * 4.5} Z`} fill={color} />
          </g>
        );
      })}

      {state.legend.slice(0, 6).map((item, index) => (
        <g key={`${item.mark}-${item.label}`}>
          <LegendMark mark={item.mark} y={LEGEND_Y + index * LEGEND_STEP} />
          <text x={LEGEND_X + 22} y={LEGEND_Y + index * LEGEND_STEP + 11} fontSize={11} fill={VIZ_COLORS.ink}>
            {item.label}
          </text>
        </g>
      ))}
      {state.note ? (
        <text x={LEGEND_X} y={LEGEND_Y + Math.min(6, state.legend.length) * LEGEND_STEP + 14} fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
          ✕ {state.note}
        </text>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point at a box. */}
      {state.cells.map((row, r) =>
        row.map((_, c) => (
          <PickTarget
            key={`pick-${r}-${c}`}
            pick={pick}
            index={r * cols + c}
            x={cellX(c) - GAP / 2}
            y={cellY(r) - GAP / 2}
            width={step}
            height={step}
            rx={7}
            label={`Choose the box in row ${r + 1}, column ${c + 1}`}
          />
        )),
      )}
    </Frame>
  );
}
