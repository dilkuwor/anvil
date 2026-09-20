import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Stepping stones across a river: one stone per amount, one hop per coin. Draws state only. */

/** Fewest coins to stand on a stone. "none" = no way to reach it (drawn as a dash). null = nothing written yet. */
export type StoneMark = number | "none" | null;

export type CoinHop = {
  from: number;
  to: number;
  coin: number;
  /** try = being looked at · best = chosen · trap = the greedy mistake · faded = ruled out. */
  tone: "try" | "best" | "trap" | "faded";
  /** Hops that land on the same stone get different heights, shortest lowest. */
  level: number;
  /** The trap's path is drawn under the stones so it never tangles with the best path above. */
  below?: boolean;
};

export type CoinChangeState = {
  coins: number[];
  amount: number;
  marks: StoneMark[];
  tones: CellTone[];
  /** The stone we stand on. */
  here: number | null;
  /** The coin being tried, lit in the coin row. */
  tryCoin: number | null;
  hops: CoinHop[];
  /** A hop that jumps past the last stone: the not-allowed thing. */
  overshoot: { from: number; coin: number } | null;
  /** Teal note, top right. */
  bestNote: string | null;
  /** Coral note under the trap's path. */
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 272;
const BASE_Y = 160;
const SIDE = 34;
/** Room kept on the right for a hop that flies past the end. */
const PAST = 36;

const HOP_COLOR: Record<CoinHop["tone"], string> = {
  try: VIZ_COLORS.accent,
  best: VIZ_COLORS.teal,
  trap: VIZ_COLORS.coral,
  faded: VIZ_COLORS.muted,
};

const STONE_FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-800) 50%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 25%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
  done: "color-mix(in srgb, var(--teal) 45%, transparent)",
  faded: "transparent",
};

const STONE_STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  done: VIZ_COLORS.teal,
  faded: VIZ_COLORS.line,
};

export function CoinChangeView({ state, pick }: { state: CoinChangeState; pick?: CellPick }) {
  const { coins, amount, marks, hops, here } = state;
  const spans = Math.max(1, amount);
  const pitch = Math.min(62, (WIDTH - 2 * SIDE - PAST) / spans);
  const radius = Math.min(18, pitch / 2 - 4);
  const left = (WIDTH - PAST - spans * pitch) / 2;
  const stoneX = (index: number) => left + index * pitch;
  const topY = BASE_Y - radius - 2;
  const bottomY = BASE_Y + radius + 24;
  const maxLevel = Math.max(1, ...hops.map((hop) => hop.level));
  const levelStep = Math.min(20, 60 / maxLevel);
  const hasBelow = hops.some((hop) => hop.below);
  // When several hops land on one stone their arcs meet, so the coin is written under the stone each hop starts from.
  const landings = new Map<string, number>();
  for (const hop of hops) {
    const id = `${hop.below ? "b" : "a"}${hop.to}`;
    landings.set(id, (landings.get(id) ?? 0) + 1);
  }

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Stepping stones, one per amount, with coin-sized hops between them">
      <Label x={16} y={25} size={12} weight={600}>
        coins
      </Label>
      {coins.map((coin, index) => {
        const lit = state.tryCoin === coin;
        return (
          <g key={coin}>
            <circle
              className={GLIDE}
              cx={72 + index * 32}
              cy={21}
              r={12}
              fill={lit ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "transparent"}
              stroke={lit ? VIZ_COLORS.accent : VIZ_COLORS.line}
              strokeWidth={lit ? 2 : 1.25}
            />
            <text x={72 + index * 32} y={25} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
              {coin}
            </text>
          </g>
        );
      })}

      {state.counter ? (
        <Label x={WIDTH - 16} y={25} size={13} weight={600} tone="coral" anchor="end">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.bestNote ? (
        <Label x={WIDTH - 16} y={state.counter ? 45 : 25} size={13} weight={600} tone="teal" anchor="end">
          {state.bestNote}
        </Label>
      ) : null}

      {/* The bridge line, drawn only between stones so it never shows through one. */}
      {marks.slice(1).map((_, index) => (
        <line key={`plank-${index}`} x1={stoneX(index) + radius} y1={BASE_Y} x2={stoneX(index + 1) - radius} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />
      ))}

      {hops.map((hop, index) => {
        const x1 = stoneX(hop.from);
        const x2 = stoneX(hop.to);
        const mid = (x1 + x2) / 2;
        const apex = (hop.below ? 20 : 24) + hop.level * levelStep;
        const sign = hop.below ? 1 : -1;
        const y = hop.below ? bottomY : topY;
        const color = HOP_COLOR[hop.tone];
        const angle = (Math.atan2(-sign * 2 * apex, x2 - mid) * 180) / Math.PI;
        const shared = (landings.get(`${hop.below ? "b" : "a"}${hop.to}`) ?? 0) > 1;
        const name = x2 - x1 >= 48 || shared ? `${hop.coin}-coin` : String(hop.coin);
        return (
          <g key={`${hop.from}-${hop.to}-${index}`} opacity={hop.tone === "faded" ? 0.45 : 1}>
            <path d={`M${x1} ${y} Q${mid} ${y + sign * 2 * apex} ${x2} ${y}`} fill="none" stroke={color} strokeWidth={2.25} strokeDasharray={hop.tone === "try" ? "5 4" : undefined} />
            <path d="M0 0 L-9 -4.5 L-9 4.5 Z" fill={color} transform={`translate(${x2} ${y}) rotate(${angle})`} />
            <text
              x={shared ? x1 : mid}
              y={shared ? BASE_Y + radius + 32 : hop.below ? y + apex + 15 : y - apex - 6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill={color}
            >
              {name}
            </text>
          </g>
        );
      })}

      {state.overshoot ? (
        <g>
          <path
            d={`M${stoneX(state.overshoot.from)} ${topY} Q${(stoneX(state.overshoot.from) + stoneX(amount) + PAST) / 2} ${topY - 60} ${stoneX(amount) + PAST} ${BASE_Y - 8}`}
            fill="none"
            stroke={VIZ_COLORS.coral}
            strokeWidth={2.25}
          />
          <text x={stoneX(amount) + PAST} y={BASE_Y + 36} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ too far
          </text>
        </g>
      ) : null}

      {marks.map((mark, index) => {
        const tone = pickTone(pick, index, state.tones[index] ?? "idle");
        const strong = tone !== "idle" && tone !== "faded";
        return (
          <g key={index} opacity={tone === "faded" ? 0.4 : 1} className={GLIDE}>
            <circle className={GLIDE} cx={stoneX(index)} cy={BASE_Y} r={radius} fill={STONE_FILL[tone]} stroke={STONE_STROKE[tone]} strokeWidth={strong ? 2 : 1.25} />
            <text x={stoneX(index)} y={BASE_Y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={mark === "none" ? VIZ_COLORS.muted : VIZ_COLORS.ink}>
              {mark === null ? "" : mark === "none" ? "–" : mark}
            </text>
            <text x={stoneX(index)} y={BASE_Y + radius + 15} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
              {index}
            </text>
            <RejectedMark pick={pick} index={index} x={stoneX(index) + radius * 0.8 + 3} y={BASE_Y - radius * 0.8} />
          </g>
        );
      })}

      {/* "here" sits under the stone's number. The trap path uses the same strip, and the two never appear together. */}
      <g className={GLIDE} style={{ transform: `translate(${stoneX(here ?? 0)}px, ${BASE_Y + radius + 21}px)`, opacity: here === null || hasBelow ? 0 : 1 }}>
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

      {/* Click targets are exactly one pitch wide, so neighbours never overlap. */}
      {marks.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={stoneX(index) - pitch / 2} y={BASE_Y - radius - 6} width={pitch} height={2 * radius + 26} label={`Choose stone ${index}`} />
      ))}
    </Frame>
  );
}
