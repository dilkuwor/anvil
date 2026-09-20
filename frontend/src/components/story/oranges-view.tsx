import type { ReactNode } from "react";

import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Picture for "rot spreads through a grid, one step per minute". Draws state only. */

export type OrangePos = [number, number];

export type OrangesState = {
  /** 0 = empty box, 1 = fresh orange, 2 = rotten orange. */
  grid: number[][];
  /** The front of the wave: the rotten oranges that spread in this minute. */
  front?: OrangePos[];
  /** Oranges that rotted in this minute. */
  newly?: OrangePos[];
  /** Oranges the caption points at: teal = will be reached, coral = can never be reached. */
  mark?: { cells: OrangePos[]; tone: "teal" | "coral" } | null;
  /** The trap: rot handed on from orange to orange inside a single minute. */
  chain?: [OrangePos, OrangePos][] | null;
  minutes: number | null;
  fresh: number | null;
  /** True while the picture shows the mistaken way of counting. */
  wrong?: boolean;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 260;
const GAP = 6;
const AREA = { x: 44, y: 58, width: 340, height: 190 };
const LEGEND_X = 412;

const has = (list: OrangePos[] | undefined | null, r: number, c: number) => !!list?.some(([row, col]) => row === r && col === c);

const FRESH_FILL = "color-mix(in srgb, var(--teal) 35%, transparent)";
const ROTTEN_FILL = "color-mix(in srgb, var(--coral) 45%, transparent)";

/** A fresh orange is a plain round fruit with a leaf. A rotten one is darker, with spots. Shapes, not emoji. */
function Orange({ cx, cy, r, rotten, ring }: { cx: number; cy: number; r: number; rotten: boolean; ring: boolean }) {
  return (
    <g>
      {ring ? <circle cx={cx} cy={cy} r={r + 3.5} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={3} /> : null}
      <circle className={GLIDE} cx={cx} cy={cy} r={r} fill={rotten ? ROTTEN_FILL : FRESH_FILL} stroke={rotten ? VIZ_COLORS.coral : VIZ_COLORS.teal} strokeWidth={1.75} />
      {rotten ? (
        <g fill={VIZ_COLORS.coral}>
          <circle cx={cx - r * 0.35} cy={cy - r * 0.2} r={r * 0.17} />
          <circle cx={cx + r * 0.3} cy={cy + r * 0.3} r={r * 0.22} />
          <circle cx={cx + r * 0.25} cy={cy - r * 0.45} r={r * 0.12} />
        </g>
      ) : (
        <ellipse cx={cx + r * 0.3} cy={cy - r * 0.95} rx={r * 0.32} ry={r * 0.16} fill={VIZ_COLORS.teal} transform={`rotate(-30 ${cx + r * 0.3} ${cy - r * 0.95})`} />
      )}
    </g>
  );
}

export function OrangesView({ state, pick }: { state: OrangesState; pick?: CellPick }) {
  const rows = state.grid.length;
  const cols = state.grid[0]?.length ?? 1;
  const size = Math.max(16, Math.min(48, Math.floor((AREA.width - (cols - 1) * GAP) / cols), Math.floor((AREA.height - (rows - 1) * GAP) / Math.max(rows, 1))));
  const step = size + GAP;
  const startX = AREA.x + (AREA.width - (cols * step - GAP)) / 2;
  const startY = AREA.y + (AREA.height - (rows * step - GAP)) / 2;
  const cellX = (c: number) => startX + c * step;
  const cellY = (r: number) => startY + r * step;
  const radius = size * 0.28;
  const legend: { label: string; draw: (y: number) => ReactNode }[] = [
    { label: "fresh", draw: (y) => <Orange cx={LEGEND_X + 8} cy={y} r={7} rotten={false} ring={false} /> },
    { label: "rotten", draw: (y) => <Orange cx={LEGEND_X + 8} cy={y} r={7} rotten ring={false} /> },
    { label: "rotted this minute", draw: (y) => <Orange cx={LEGEND_X + 8} cy={y} r={5} rotten ring /> },
    { label: "spreads this minute", draw: (y) => <rect x={LEGEND_X} y={y - 8} width={16} height={16} rx={4} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={2.25} /> },
  ];
  if (state.mark?.tone === "coral") {
    legend.push({ label: "rot cannot reach it", draw: (y) => <rect x={LEGEND_X} y={y - 8} width={16} height={16} rx={4} fill="none" stroke={VIZ_COLORS.coral} strokeWidth={2.25} strokeDasharray="4 3" /> });
  }

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A grid of fresh and rotten oranges; rot spreads one step per minute">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : state.minutes !== null ? (
        <Label x={16} y={22} size={13} weight={600} tone={state.wrong ? "coral" : "ink"}>
          {state.wrong ? "✕ wrong count: " : ""}minute {state.minutes}
        </Label>
      ) : null}
      {state.fresh !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          fresh left: {state.fresh}
        </Label>
      ) : null}

      {Array.from({ length: cols }, (_, c) => (
        <text key={`col-${c}`} x={cellX(c) + size / 2} y={startY - 8} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
          {c + 1}
        </text>
      ))}
      {Array.from({ length: rows }, (_, r) => (
        <text key={`row-${r}`} x={startX - 10} y={cellY(r) + size / 2 + 4} textAnchor="end" fontSize={10} fill={VIZ_COLORS.muted}>
          {r + 1}
        </text>
      ))}

      {state.grid.map((row, r) =>
        row.map((value, c) => {
          const index = r * cols + c;
          const picked = pickTone(pick, index, "idle");
          const inFront = has(state.front, r, c);
          const marked = has(state.mark?.cells, r, c) ? state.mark?.tone : null;
          // A ruled-out orange keeps its own colour (it must not look rotten): only the box edge and a ✕ change.
          const stroke = picked === "done" ? VIZ_COLORS.teal : picked === "miss" || marked === "coral" ? VIZ_COLORS.coral : inFront ? VIZ_COLORS.accent : marked === "teal" ? VIZ_COLORS.teal : VIZ_COLORS.line;
          const strong = stroke !== VIZ_COLORS.line;
          return (
            <g key={`${r}-${c}`}>
              <rect
                className={GLIDE}
                x={cellX(c)}
                y={cellY(r)}
                width={size}
                height={size}
                rx={8}
                fill={picked === "done" ? "color-mix(in srgb, var(--teal) 22%, transparent)" : inFront ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent"}
                stroke={stroke}
                strokeWidth={strong ? 2.25 : 1}
                strokeDasharray={marked === "coral" && picked === "idle" ? "5 4" : undefined}
              />
              {value === 0 ? size < 34 ? null : (
                <text x={cellX(c) + size / 2} y={cellY(r) + size / 2 + 4} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted} opacity={0.75}>
                  empty
                </text>
              ) : (
                <Orange cx={cellX(c) + size / 2} cy={cellY(r) + size / 2 + 2} r={radius} rotten={value === 2} ring={has(state.newly, r, c)} />
              )}
              <RejectedMark pick={pick} index={index} x={cellX(c) + size - 7} y={cellY(r) + 11} />
            </g>
          );
        }),
      )}

      {(state.chain ?? []).map(([from, to], index) => {
        const dx = to[1] - from[1];
        const dy = to[0] - from[0];
        const reach = radius + 3;
        const x1 = cellX(from[1]) + size / 2 + dx * reach;
        const y1 = cellY(from[0]) + size / 2 + 2 + dy * reach;
        const x2 = cellX(to[1]) + size / 2 - dx * reach;
        const y2 = cellY(to[0]) + size / 2 + 2 - dy * reach;
        return (
          <g key={`chain-${index}`}>
            <line x1={x1} y1={y1} x2={x2 - dx * 5} y2={y2 - dy * 5} stroke={VIZ_COLORS.coral} strokeWidth={2.5} />
            <path d={`M${x2} ${y2} L${x2 - dx * 8 - dy * 5} ${y2 - dy * 8 + dx * 5} L${x2 - dx * 8 + dy * 5} ${y2 - dy * 8 - dx * 5} Z`} fill={VIZ_COLORS.coral} />
          </g>
        );
      })}

      {legend.map((item, index) => (
        <g key={item.label}>
          {item.draw(74 + index * 28)}
          <text x={LEGEND_X + 24} y={78 + index * 28} fontSize={11} fill={VIZ_COLORS.ink}>
            {item.label}
          </text>
        </g>
      ))}
      {state.chain ? (
        <text x={LEGEND_X} y={78 + legend.length * 28} fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
          ✕ all in one minute
        </text>
      ) : null}

      {state.grid.map((row, r) =>
        row.map((_, c) => (
          <PickTarget
            key={`pick-${r}-${c}`}
            pick={pick}
            index={r * cols + c}
            x={cellX(c) - GAP / 2}
            y={cellY(r) - GAP / 2}
            width={step}
            height={step}
            rx={9}
            label={`Choose the box in row ${r + 1}, column ${c + 1}`}
          />
        )),
      )}
    </Frame>
  );
}
