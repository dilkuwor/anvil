import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Stepping stones with generic labels: the same family as the Coin Change picture.
 * A row of stones, each holding one number, built from the one or two stones just behind it.
 * An optional row of things (houses, digits) sits under the stones. Draws state only.
 */

export type StoneHop = {
  from: number;
  to: number;
  /** A few characters at most: "1", "skip", "+9", "B". */
  label: string;
  /** try = being looked at · best = chosen · trap = the mistake or a hop that is not allowed · faded = ruled out. */
  tone: "try" | "best" | "trap" | "faded";
};

export type StoneTag = { stone: number; text: string; tone: "accent" | "coral" | "teal" };

export type StoneItem = { text: string; tone: CellTone; crossed?: boolean };

export type StonesState = {
  /** The number on each stone. null = nothing written yet. */
  marks: (number | string | null)[];
  /** Printed under each stone: its position, or a house number, or "start". */
  labels: string[];
  /** What the labels count, printed once at the left ("stone", "house"). */
  labelTitle: string | null;
  tones: CellTone[];
  hops: StoneHop[];
  /** Short words under a stone: the two numbers we carry, or how often a stone was asked. */
  tags: StoneTag[];
  /** The row under the stones. Thing k sits under position k + offset (a half offset puts it between two stones). */
  items: { title: string; offset: number; cells: StoneItem[] } | null;
  /** The street is a ring: a link joins the last thing to the first. "clash" draws it in coral. */
  ring: "plain" | "clash" | null;
  counter: { label: string; value: string } | null;
  /** Teal note, top right. */
  note: string | null;
  /** Coral note along the bottom. */
  trapNote: string | null;
};

const WIDTH = 560;
const BASE_Y = 150;
const SIDE = 64;

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

const TAG_COLOR: Record<StoneTag["tone"], string> = { accent: VIZ_COLORS.accent, coral: VIZ_COLORS.coral, teal: VIZ_COLORS.teal };

export function AgyDp1StonesView({ state, pick }: { state: StonesState; pick?: CellPick }) {
  const { marks, hops, items } = state;
  const height = items ? 300 : 236;
  const spans = Math.max(1, marks.length - 1);
  const pitch = Math.min(62, (WIDTH - 2 * SIDE) / spans);
  const radius = Math.max(8, Math.min(18, pitch / 2 - 4));
  const left = (WIDTH - spans * pitch) / 2;
  const stoneX = (position: number) => left + position * pitch;
  const topY = BASE_Y - radius - 2;
  const labelY = BASE_Y + radius + 14;
  const tagY = BASE_Y + radius + 30;
  const itemY = BASE_Y + radius + 42;
  const itemWidth = Math.max(14, Math.min(30, pitch - 8));
  const itemHeight = 26;
  const small = pitch < 50;

  return (
    <Frame width={WIDTH} height={height} label="A row of stepping stones. Each stone holds one number, built from the stones just behind it">
      {state.counter ? (
        <Label x={WIDTH - 16} y={25} size={13} weight={600} tone="coral" anchor="end">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={state.counter ? 16 : WIDTH - 16} y={25} size={13} weight={600} tone="teal" anchor={state.counter ? "start" : "end"}>
          {state.note}
        </Label>
      ) : null}

      {/* The path between stones, drawn only in the gaps so it never shows through a stone. */}
      {marks.slice(1).map((_, index) => (
        <line key={`plank-${index}`} x1={stoneX(index) + radius} y1={BASE_Y} x2={stoneX(index + 1) - radius} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />
      ))}

      {hops.map((hop, index) => {
        const x1 = stoneX(hop.from);
        const x2 = stoneX(hop.to);
        const mid = (x1 + x2) / 2;
        const long = hop.to - hop.from > 1;
        // A short hop is low and a long hop is high, so two hops landing on one stone never share a line.
        const apex = long ? 50 + 6 * Math.min(2, hop.to - hop.from - 2) : 24;
        const color = HOP_COLOR[hop.tone];
        const angle = (Math.atan2(2 * apex, x2 - mid) * 180) / Math.PI;
        return (
          <g key={`${hop.from}-${hop.to}-${index}`} opacity={hop.tone === "faded" ? 0.45 : 1}>
            <path d={`M${x1} ${topY} Q${mid} ${topY - 2 * apex} ${x2} ${topY}`} fill="none" stroke={color} strokeWidth={2.25} strokeDasharray={hop.tone === "try" ? "5 4" : undefined} />
            <path d="M0 0 L-9 -4.5 L-9 4.5 Z" fill={color} transform={`translate(${x2} ${topY}) rotate(${angle})`} />
            {/* A short hop's label sits inside its arc, a long hop's label above its top: they cannot meet. */}
            <text x={mid} y={long ? topY - apex - 6 : topY - 6} textAnchor="middle" fontSize={small ? 10 : 11} fontWeight={700} fill={color}>
              {hop.label}
            </text>
          </g>
        );
      })}

      {state.labelTitle ? (
        <Label x={12} y={labelY} size={11} weight={600}>
          {state.labelTitle}
        </Label>
      ) : null}

      {marks.map((mark, index) => {
        const tone = pickTone(pick, index, state.tones[index] ?? "idle");
        const strong = tone !== "idle" && tone !== "faded";
        const text = mark === null ? "" : String(mark);
        return (
          <g key={index} opacity={tone === "faded" ? 0.4 : 1} className={GLIDE}>
            <circle className={GLIDE} cx={stoneX(index)} cy={BASE_Y} r={radius} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={strong ? 2 : 1.25} />
            <text x={stoneX(index)} y={BASE_Y + 5} textAnchor="middle" fontSize={text.length <= 2 ? 13 : text.length === 3 ? 11 : 8} fontWeight={700} fill={VIZ_COLORS.ink}>
              {text}
            </text>
            <text x={stoneX(index)} y={labelY} textAnchor="middle" fontSize={small ? 9 : 11} fill={VIZ_COLORS.muted}>
              {state.labels[index] ?? ""}
            </text>
            <RejectedMark pick={pick} index={index} x={stoneX(index) + radius * 0.8 + 3} y={BASE_Y - radius * 0.8} />
          </g>
        );
      })}

      {state.tags.map((tag) => (
        <text key={`${tag.stone}-${tag.text}`} x={stoneX(tag.stone)} y={tagY} textAnchor="middle" fontSize={small ? 9 : 11} fontWeight={700} fill={TAG_COLOR[tag.tone]}>
          {tag.text}
        </text>
      ))}

      {items ? (
        <g>
          <Label x={12} y={itemY + itemHeight / 2 + 4} size={11} weight={600}>
            {items.title}
          </Label>
          {items.cells.map((cell, index) => {
            const x = stoneX(index + items.offset);
            const strong = cell.tone !== "idle" && cell.tone !== "faded";
            return (
              <g key={index} opacity={cell.tone === "faded" ? 0.4 : 1} className={GLIDE}>
                <rect className={GLIDE} x={x - itemWidth / 2} y={itemY} width={itemWidth} height={itemHeight} rx={5} fill={FILL[cell.tone]} stroke={STROKE[cell.tone]} strokeWidth={strong ? 2 : 1.25} />
                <text x={x} y={itemY + itemHeight / 2 + 4.5} textAnchor="middle" fontSize={cell.text.length <= 2 ? 13 : 10} fontWeight={700} fill={VIZ_COLORS.ink}>
                  {cell.text}
                </text>
                {cell.crossed ? <line x1={x - itemWidth / 2 - 2} y1={itemY + itemHeight + 2} x2={x + itemWidth / 2 + 2} y2={itemY - 2} stroke={VIZ_COLORS.coral} strokeWidth={2} /> : null}
              </g>
            );
          })}
          {state.ring && items.cells.length > 1 ? (
            <g>
              <path
                d={`M${stoneX(items.offset)} ${itemY + itemHeight + 2} v10 q0 8 8 8 H${stoneX(items.cells.length - 1 + items.offset) - 8} q8 0 8 -8 v-10`}
                fill="none"
                stroke={state.ring === "clash" ? VIZ_COLORS.coral : VIZ_COLORS.muted}
                strokeWidth={state.ring === "clash" ? 2.25 : 1.5}
                strokeDasharray={state.ring === "clash" ? undefined : "4 3"}
              />
              <text
                x={(stoneX(items.offset) + stoneX(items.cells.length - 1 + items.offset)) / 2}
                y={itemY + itemHeight + 34}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={state.ring === "clash" ? VIZ_COLORS.coral : VIZ_COLORS.muted}
              >
                {state.ring === "clash" ? "✕ these two are neighbours" : "the ring: these two are neighbours"}
              </text>
            </g>
          ) : null}
        </g>
      ) : null}

      {state.trapNote ? (
        <Label x={WIDTH / 2} y={height - 8} size={13} weight={600} tone="coral" anchor="middle">
          {state.trapNote}
        </Label>
      ) : null}

      {/* Click targets are exactly one pitch wide, so neighbours never overlap. */}
      {marks.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={stoneX(index) - pitch / 2} y={BASE_Y - radius - 6} width={pitch} height={2 * radius + 26} label={`Choose the stone labelled ${state.labels[index] || index}`} />
      ))}
    </Frame>
  );
}
