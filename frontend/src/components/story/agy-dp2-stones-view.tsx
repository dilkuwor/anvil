import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Stepping stones with generic labels: the same picture as the Coin Change story, for any 1-D table.
 * A row of stones, hop arcs between them, an optional row of input items under the stones,
 * and a row of small chips (words, numbers) at the top. Draws state only.
 *
 * Hops drawn below the stones and the item row share the same strip, so a story never uses both at once.
 * Pointers and hops above the stones share a strip too.
 */

export type StoneHop = {
  from: number;
  to: number;
  /** Written at the top of the arc: a word, "+5", "× -2". */
  label: string;
  /** try = being looked at · best = chosen · trap = the mistake · faded = ruled out. */
  tone: "try" | "best" | "trap" | "faded";
  /** Arcs that overlap get different heights, shortest lowest. */
  level: number;
  below?: boolean;
};

export type Stone = {
  /** One value per row. null = nothing written yet. Most stories have one row; two rows draw a taller stone. */
  marks: (string | null)[];
  tone: CellTone;
  /** Tone of each row, for stones with two rows. Missing = no highlight. */
  rowTones?: CellTone[];
  /** Printed under the stone. */
  label: string;
};

export type StoneItem = { text: string; tone: CellTone };

export type StonesState = {
  chipsLabel: string;
  chips: StoneItem[];
  /** Written at the left of the stones, one per row of marks. */
  rowLabels: string[];
  stones: Stone[];
  /** Keeps the wide spacing of two-row stones while the stones themselves are still hidden. */
  tallStones?: boolean;
  /** The input, drawn under the stones. "between" puts item k between stone k and stone k + 1 (a stone is a cut). */
  items: StoneItem[] | null;
  itemsLabel: string;
  itemsAt: "between" | "under";
  /** The stone we stand on. */
  here: number | null;
  /** Named marks above a stone (low, mid, high). Marks on the same stone are joined into one label. */
  pointers: { at: number; label: string }[];
  hops: StoneHop[];
  /** "stones": cell i is stone i. "values": cell 2i + r is row r of stone i, and cell 2n + k is item k. */
  pickMode: "stones" | "values";
  /** Teal note, top right. */
  bestNote: string | null;
  /** Coral note at the bottom. */
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 300;
const BASE_Y = 158;
const LEFT = 58;
const RIGHT = 22;
const TALL = 46;
const ITEM_HEIGHT = 26;

const HOP_COLOR: Record<StoneHop["tone"], string> = {
  try: VIZ_COLORS.accent,
  best: VIZ_COLORS.teal,
  trap: VIZ_COLORS.coral,
  faded: VIZ_COLORS.muted,
};

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-800) 50%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 25%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
  done: "color-mix(in srgb, var(--teal) 45%, transparent)",
  faded: "transparent",
};

const STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  done: VIZ_COLORS.teal,
  faded: VIZ_COLORS.line,
};

const strong = (tone: CellTone) => tone !== "idle" && tone !== "faded";

export function AgyDp2StonesView({ state, pick }: { state: StonesState; pick?: CellPick }) {
  const { stones, items, hops, here, chips } = state;
  // A story may hide the stones in its first scenes and show only the items; the items then keep the same places.
  const count = Math.max(1, stones.length, items ? items.length + (state.itemsAt === "between" ? 1 : 0) : 0);
  const tall = state.tallStones ?? stones.some((stone) => stone.marks.length > 1);
  const pitch = Math.min(tall ? 84 : 62, (WIDTH - LEFT - RIGHT) / count);
  const start = LEFT + (WIDTH - LEFT - RIGHT - count * pitch) / 2;
  const stoneX = (index: number) => start + (index + 0.5) * pitch;
  const radius = Math.min(18, pitch / 2 - 4);
  const stoneWidth = Math.min(70, pitch - 8);
  const halfHeight = tall ? TALL / 2 : radius;
  const markSize = tall || radius >= 16 ? 13 : 11;
  const rows = tall ? 2 : 1;
  const rowY = (row: number) => (tall ? BASE_Y - TALL / 2 + (row + 0.5) * (TALL / 2) : BASE_Y);

  const topY = BASE_Y - halfHeight - 2;
  const labelY = BASE_Y + halfHeight + 14;
  const belowY = BASE_Y + halfHeight + 22;
  const itemsTop = BASE_Y + halfHeight + 24;
  const itemX = (index: number) => (state.itemsAt === "between" ? stoneX(index) + pitch / 2 : stoneX(index));
  const itemWidth = state.itemsAt === "between" ? pitch - 4 : Math.min(pitch - 6, 48);
  const hereY = items ? itemsTop + ITEM_HEIGHT + 3 : BASE_Y + halfHeight + 21;
  const hasBelow = hops.some((hop) => hop.below);

  const maxLevel = Math.max(1, ...hops.map((hop) => hop.level));
  const levelStep = Math.min(20, 56 / maxLevel);

  // Pointers that stand on the same stone share one label, so two names never overlap.
  const pointerGroups = new Map<number, string[]>();
  for (const pointer of state.pointers) pointerGroups.set(pointer.at, [...(pointerGroups.get(pointer.at) ?? []), pointer.label]);

  const chipStart = 10 + state.chipsLabel.length * 7 + 12;
  const chipWidths = chips.map((chip) => Math.max(26, chip.text.length * 7.5 + 14));
  const chipX = (index: number) => chipStart + chipWidths.slice(0, index).reduce((sum, width) => sum + width + 6, 0);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Stepping stones, one per position, with hops from earlier stones">
      {chips.length > 0 ? (
        <Label x={10} y={25} size={12} weight={600}>
          {state.chipsLabel}
        </Label>
      ) : null}
      {chips.map((chip, index) => (
        <g key={`chip-${index}`} opacity={chip.tone === "faded" ? 0.4 : 1} className={GLIDE}>
          <rect className={GLIDE} x={chipX(index)} y={9} width={chipWidths[index]} height={24} rx={12} fill={chip.tone === "idle" ? "transparent" : FILL[chip.tone]} stroke={STROKE[chip.tone]} strokeWidth={strong(chip.tone) ? 2 : 1.25} />
          <text x={chipX(index) + chipWidths[index] / 2} y={25} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
            {chip.text}
          </text>
        </g>
      ))}

      {state.counter ? (
        <Label x={WIDTH - 12} y={25} size={13} weight={600} tone="coral" anchor="end">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.bestNote ? (
        <Label x={WIDTH - 12} y={state.counter ? 45 : 25} size={13} weight={600} tone="teal" anchor="end">
          {state.bestNote}
        </Label>
      ) : null}

      {state.rowLabels.map((label, row) => (
        <Label key={`row-${row}`} x={10} y={rowY(row) + 4} size={12} weight={600}>
          {label}
        </Label>
      ))}
      {items ? (
        <Label x={10} y={itemsTop + 17} size={12} weight={600}>
          {state.itemsLabel}
        </Label>
      ) : null}

      {hops.map((hop, index) => {
        const x1 = stoneX(hop.from);
        const x2 = stoneX(hop.to);
        const mid = (x1 + x2) / 2;
        const apex = (hop.below ? 20 : 24) + hop.level * levelStep;
        const sign = hop.below ? 1 : -1;
        const y = hop.below ? belowY : topY;
        const color = HOP_COLOR[hop.tone];
        const angle = (Math.atan2(-sign * 2 * apex, x2 - mid) * 180) / Math.PI;
        return (
          <g key={`${hop.from}-${hop.to}-${index}`} opacity={hop.tone === "faded" ? 0.45 : 1}>
            <path d={`M${x1} ${y} Q${mid} ${y + sign * 2 * apex} ${x2} ${y}`} fill="none" stroke={color} strokeWidth={2.25} strokeDasharray={hop.tone === "try" ? "5 4" : undefined} />
            <path d="M0 0 L-9 -4.5 L-9 4.5 Z" fill={color} transform={`translate(${x2} ${y}) rotate(${angle})`} />
            <text x={mid} y={hop.below ? y + apex + 15 : y - apex - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
              {hop.label}
            </text>
          </g>
        );
      })}

      {[...pointerGroups.entries()].map(([at, labels]) => (
        <g key={`pointer-${at}`}>
          <path d={`M${stoneX(at)} ${topY - 2} l-6 -9 l12 0 Z`} fill={VIZ_COLORS.accent} />
          <text x={stoneX(at)} y={topY - 16} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
            {labels.join(" · ")}
          </text>
        </g>
      ))}

      {stones.map((stone, index) => {
        const tone = state.pickMode === "stones" ? pickTone(pick, index, stone.tone) : stone.tone;
        return (
          <g key={`stone-${index}`} opacity={tone === "faded" ? 0.4 : 1} className={GLIDE}>
            {tall ? (
              <rect className={GLIDE} x={stoneX(index) - stoneWidth / 2} y={BASE_Y - TALL / 2} width={stoneWidth} height={TALL} rx={12} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={strong(tone) ? 2 : 1.25} />
            ) : (
              <circle className={GLIDE} cx={stoneX(index)} cy={BASE_Y} r={radius} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={strong(tone) ? 2 : 1.25} />
            )}
            {Array.from({ length: rows }, (_, row) => {
              const mark = stone.marks[row] ?? null;
              const rowTone = state.pickMode === "values" ? pickTone(pick, 2 * index + row, stone.rowTones?.[row] ?? "idle") : (stone.rowTones?.[row] ?? "idle");
              return (
                <g key={row}>
                  {tall && rowTone !== "idle" && rowTone !== "faded" ? (
                    <rect className={GLIDE} x={stoneX(index) - stoneWidth / 2 + 3} y={rowY(row) - TALL / 4 + 2} width={stoneWidth - 6} height={TALL / 2 - 4} rx={8} fill={FILL[rowTone]} stroke={STROKE[rowTone]} strokeWidth={1.5} />
                  ) : null}
                  <text x={stoneX(index)} y={rowY(row) + 5} textAnchor="middle" fontSize={markSize} fontWeight={700} fill={mark === "–" ? VIZ_COLORS.muted : VIZ_COLORS.ink}>
                    {mark ?? ""}
                  </text>
                  {state.pickMode === "values" ? <RejectedMark pick={pick} index={2 * index + row} x={stoneX(index) + stoneWidth / 2 - 8} y={rowY(row) + 4} /> : null}
                </g>
              );
            })}
            <text x={stoneX(index)} y={labelY} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
              {stone.label}
            </text>
            {state.pickMode === "stones" ? <RejectedMark pick={pick} index={index} x={stoneX(index) + halfHeight * 0.8 + 3} y={BASE_Y - halfHeight * 0.8} /> : null}
          </g>
        );
      })}

      {items?.map((item, index) => {
        const cell = 2 * stones.length + index;
        const tone = state.pickMode === "values" ? pickTone(pick, cell, item.tone) : item.tone;
        return (
          <g key={`item-${index}`} opacity={tone === "faded" ? 0.4 : 1} className={GLIDE}>
            <rect className={GLIDE} x={itemX(index) - itemWidth / 2} y={itemsTop} width={itemWidth} height={ITEM_HEIGHT} rx={6} fill={tone === "idle" ? "transparent" : FILL[tone]} stroke={STROKE[tone]} strokeWidth={strong(tone) ? 2 : 1.25} />
            <text x={itemX(index)} y={itemsTop + 18} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink}>
              {item.text}
            </text>
            {state.pickMode === "values" ? <RejectedMark pick={pick} index={cell} x={itemX(index) + itemWidth / 2 - 7} y={itemsTop + 11} /> : null}
          </g>
        );
      })}

      {/* "here" sits under everything that belongs to the stone. The trap path uses the same strip, and the two never appear together. */}
      <g className={GLIDE} style={{ transform: `translate(${stoneX(here ?? 0)}px, ${hereY}px)`, opacity: here === null || hasBelow ? 0 : 1 }}>
        <path d="M0 0 L-6 9 L6 9 Z" fill={VIZ_COLORS.accent} />
        <text x={0} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          here
        </text>
      </g>

      {state.trapNote ? (
        <Label x={WIDTH / 2} y={HEIGHT - 10} size={13} weight={600} tone="coral" anchor="middle">
          {state.trapNote}
        </Label>
      ) : null}

      {/* Click targets last, each exactly one pitch wide, so neighbours never overlap. */}
      {state.pickMode === "stones"
        ? stones.map((stone, index) => (
            <PickTarget key={`pick-${index}`} pick={pick} index={index} x={stoneX(index) - pitch / 2} y={BASE_Y - halfHeight - 6} width={pitch} height={2 * halfHeight + 26} label={`Choose stone ${stone.label}`} />
          ))
        : null}
      {state.pickMode === "values"
        ? stones.flatMap((stone, index) =>
            Array.from({ length: rows }, (_, row) => (
              <PickTarget
                key={`pick-${index}-${row}`}
                pick={pick}
                index={2 * index + row}
                x={stoneX(index) - stoneWidth / 2}
                y={rowY(row) - TALL / 4}
                width={stoneWidth}
                height={TALL / 2}
                label={`Choose the ${state.rowLabels[row] ?? "value"} of stone ${stone.label}`}
              />
            )),
          )
        : null}
      {state.pickMode === "values"
        ? items?.map((item, index) => (
            <PickTarget key={`pick-item-${index}`} pick={pick} index={2 * stones.length + index} x={itemX(index) - itemWidth / 2} y={itemsTop} width={itemWidth} height={ITEM_HEIGHT} label={`Choose the ${state.itemsLabel} ${item.text}`} />
          ))
        : null}
    </Frame>
  );
}
