import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Picture for map / island stories: a grid of land and water, a scan position, and a search that spreads. Draws state only. */

export type GridCellKind = "water" | "land" | "sunk";
export type GridPos = [number, number];

export type GridMatrixState = {
  cells: GridCellKind[][];
  /** Where the row-by-row scan is standing. */
  cursor: GridPos | null;
  /** Boxes the search is touching right now. */
  wave?: GridPos[];
  /** What the wave means in this frame, for the legend. */
  waveLabel?: string;
  /** Boxes pointed out by the caption: teal = belongs together, coral = does not count. */
  mark?: { cells: GridPos[]; tone: "teal" | "coral" } | null;
  /** The trap: the path of a search that never marks its boxes, drawn as coral arrows. */
  trail?: GridPos[] | null;
  islands: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 260;
const GAP = 4;
const AREA = { x: 44, y: 58, width: 340, height: 190 };
const LEGEND_X = 412;

const has = (list: GridPos[] | undefined | null, r: number, c: number) => !!list?.some(([row, col]) => row === r && col === c);

function Swatch({ y, fill, stroke, dashed = false, label }: { y: number; fill: string; stroke: string; dashed?: boolean; label: string }) {
  return (
    <g>
      <rect x={LEGEND_X} y={y} width={14} height={14} rx={3} fill={fill} stroke={stroke} strokeWidth={1.5} strokeDasharray={dashed ? "3 2" : undefined} />
      <text x={LEGEND_X + 22} y={y + 11} fontSize={11} fill={VIZ_COLORS.ink}>
        {label}
      </text>
    </g>
  );
}

const LAND_FILL = "color-mix(in srgb, var(--foreground) 16%, transparent)";
const SUNK_FILL = "color-mix(in srgb, var(--teal) 10%, transparent)";
const WAVE_FILL = "color-mix(in srgb, var(--accent) 40%, transparent)";

export function GridMatrixView({ state, pick }: { state: GridMatrixState; pick?: CellPick }) {
  const rows = state.cells.length;
  const cols = state.cells[0]?.length ?? 1;
  // Size from both directions, so tall maps and wide maps both fit.
  const size = Math.max(14, Math.min(40, Math.floor((AREA.width - (cols - 1) * GAP) / cols), Math.floor((AREA.height - (rows - 1) * GAP) / Math.max(rows, 1))));
  const step = size + GAP;
  const startX = AREA.x + (AREA.width - (cols * step - GAP)) / 2;
  const startY = AREA.y + (AREA.height - (rows * step - GAP)) / 2;
  const cellX = (c: number) => startX + c * step;
  const cellY = (r: number) => startY + r * step;
  const font = size >= 30 ? 13 : 10;

  // Each directed step of the trail is drawn once, shifted sideways so "there" and "back" do not cover each other.
  const trail = state.trail ?? [];
  const steps = new Map<string, { from: GridPos; to: GridPos }>();
  for (let index = 0; index + 1 < trail.length; index++) {
    const from = trail[index];
    const to = trail[index + 1];
    steps.set(`${from[0]},${from[1]}>${to[0]},${to[1]}`, { from, to });
  }

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A map of land and water, read row by row">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.islands !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          islands counted: {state.islands}
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
        row.map((kind, c) => {
          const index = r * cols + c;
          const picked = pickTone(pick, index, "idle");
          const marked = has(state.mark?.cells, r, c) ? state.mark?.tone : null;
          const inWave = has(state.wave, r, c);
          const onTrail = has(state.trail, r, c);

          let fill = kind === "land" ? LAND_FILL : kind === "sunk" ? SUNK_FILL : "transparent";
          let stroke: string = kind === "land" ? VIZ_COLORS.muted : kind === "sunk" ? VIZ_COLORS.teal : VIZ_COLORS.line;
          if (inWave) {
            fill = WAVE_FILL;
            stroke = VIZ_COLORS.accent;
          }
          if (marked === "teal") {
            fill = "color-mix(in srgb, var(--teal) 40%, transparent)";
            stroke = VIZ_COLORS.teal;
          }
          if (marked === "coral" || onTrail) {
            fill = "color-mix(in srgb, var(--coral) 26%, transparent)";
            stroke = VIZ_COLORS.coral;
          }
          if (picked === "done") {
            fill = "color-mix(in srgb, var(--teal) 45%, transparent)";
            stroke = VIZ_COLORS.teal;
          }
          // A ruled-out box keeps its own look and only gains a coral edge and a ✕.
          if (picked === "miss") stroke = VIZ_COLORS.coral;

          return (
            <g key={`${r}-${c}`}>
              <rect
                className={GLIDE}
                x={cellX(c)}
                y={cellY(r)}
                width={size}
                height={size}
                rx={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={kind === "water" && !inWave && !marked && picked === "idle" ? 1 : 1.75}
                strokeDasharray={kind === "sunk" && !inWave && !marked ? "4 3" : undefined}
              />
              <text
                x={cellX(c) + size / 2}
                y={cellY(r) + size / 2 + font / 2 - 1}
                textAnchor="middle"
                fontSize={font}
                fontWeight={kind === "land" ? 700 : 500}
                fill={kind === "land" ? VIZ_COLORS.ink : kind === "sunk" ? VIZ_COLORS.teal : VIZ_COLORS.muted}
                opacity={kind === "water" ? 0.7 : 1}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {kind === "land" ? "1" : "0"}
              </text>
              {/* Inside the box's own corner: the row above is only 4px away. */}
              <RejectedMark pick={pick} index={index} x={cellX(c) + size - 8} y={cellY(r) + 12} />
            </g>
          );
        }),
      )}

      {/* The scan position: one ring that glides from box to box. */}
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

      {[...steps.values()].map(({ from, to }) => {
        const dx = to[1] - from[1];
        const dy = to[0] - from[0];
        // Shift to the right-hand side of the direction of travel.
        const shiftX = -dy * 9;
        const shiftY = dx * 9;
        const reach = Math.max(4, size / 2 - 12);
        const x1 = cellX(from[1]) + size / 2 + dx * reach + shiftX;
        const y1 = cellY(from[0]) + size / 2 + dy * reach + shiftY;
        const x2 = cellX(to[1]) + size / 2 - dx * reach + shiftX;
        const y2 = cellY(to[0]) + size / 2 - dy * reach + shiftY;
        return (
          <g key={`${from.join()}-${to.join()}`}>
            <line x1={x1} y1={y1} x2={x2 - dx * 5} y2={y2 - dy * 5} stroke={VIZ_COLORS.coral} strokeWidth={2.25} />
            <path d={`M${x2} ${y2} L${x2 - dx * 7 - dy * 4} ${y2 - dy * 7 + dx * 4} L${x2 - dx * 7 + dy * 4} ${y2 - dy * 7 - dx * 4} Z`} fill={VIZ_COLORS.coral} />
          </g>
        );
      })}

      <Swatch y={70} fill={LAND_FILL} stroke={VIZ_COLORS.muted} label="1 = land" />
      <Swatch y={96} fill="transparent" stroke={VIZ_COLORS.line} label="0 = water" />
      <Swatch y={122} fill={SUNK_FILL} stroke={VIZ_COLORS.teal} dashed label="sunk land" />
      <Swatch y={148} fill={WAVE_FILL} stroke={VIZ_COLORS.accent} label={state.waveLabel ?? "sinking now"} />
      <g>
        <rect x={LEGEND_X} y={174} width={14} height={14} rx={4} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={2.5} />
        <text x={LEGEND_X + 22} y={185} fontSize={11} fill={VIZ_COLORS.ink}>
          the scan is here
        </text>
      </g>
      {state.trail ? (
        <text x={LEGEND_X} y={214} fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
          ✕ back and forth
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
