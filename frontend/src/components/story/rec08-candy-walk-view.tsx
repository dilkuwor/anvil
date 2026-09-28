import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import { GLIDE } from "./view-kit";

/** Children in a row: a bar for each rating, and a candy box under each child. Draws state only. */

export type CandyWalkState = {
  ratings: number[];
  /** null hides the candy boxes. */
  candies: number[] | null;
  tones: CellTone[];
  /** The child being looked at. */
  here: number | null;
  /** The neighbour it is compared with. */
  neighbour: number | null;
  walk: "right" | "left" | null;
  /** What the trap would write, drawn under the child's box. */
  ghost: { index: number; value: number } | null;
  total: number | null;
  counter: { label: string; value: number } | null;
  note: string | null;
};

const WIDTH = 560;
const HEIGHT = 262;
const BASE_Y = 150;
const BAR_MAX = 84;
const BOX = 36;
const BOX_Y = 166;

const FILL: Record<CellTone, string> = {
  idle: "transparent",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 30%, transparent)",
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

export function CandyWalkView({ state }: { state: CandyWalkState }) {
  const count = state.ratings.length;
  const step = Math.min(68, (WIDTH - 80) / Math.max(count, 1));
  const startX = (WIDTH - step * count) / 2;
  const centerX = (index: number) => startX + step * index + step / 2;
  const top = Math.max(...state.ratings, 1);
  const barH = (rating: number) => 14 + (rating / top) * (BAR_MAX - 14);
  const barW = Math.min(34, step - 12);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Children in a row, with a rating bar and a candy box for each">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.total !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          total = {state.total}
        </Label>
      ) : null}
      {state.walk ? (
        <Label x={WIDTH / 2} y={22} size={13} weight={700} tone="accent" anchor="middle">
          {state.walk === "right" ? "walk right →" : "← walk back"}
        </Label>
      ) : null}

      {state.ratings.map((rating, index) => {
        const h = barH(rating);
        const here = state.here === index;
        const near = state.neighbour === index;
        return (
          <g key={`bar-${index}`}>
            <rect
              className={GLIDE}
              x={centerX(index) - barW / 2}
              y={BASE_Y - h}
              width={barW}
              height={h}
              rx={5}
              fill={here ? "color-mix(in srgb, var(--accent) 40%, transparent)" : near ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "color-mix(in srgb, var(--steel-700) 35%, transparent)"}
              stroke={here || near ? VIZ_COLORS.accent : VIZ_COLORS.line}
              strokeDasharray={near ? "4 3" : undefined}
              strokeWidth={here ? 1.75 : 1}
            />
            <text x={centerX(index)} y={BASE_Y - h - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.muted}>
              {rating}
            </text>
          </g>
        );
      })}
      <line x1={startX} y1={BASE_Y} x2={startX + step * count} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={1.25} />
      <Label x={16} y={BASE_Y - 4} size={11} weight={600}>
        rating
      </Label>

      {state.candies ? (
        <g>
          <Label x={16} y={BOX_Y + BOX / 2 + 4} size={11} weight={600}>
            candy
          </Label>
          {state.candies.map((candy, index) => {
            const tone = state.tones[index] ?? "idle";
            const x = centerX(index) - BOX / 2;
            return (
              <g key={`box-${index}`} className={GLIDE} opacity={tone === "faded" ? 0.35 : 1}>
                <rect x={x} y={BOX_Y} width={BOX} height={BOX} rx={7} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75} />
                <text x={centerX(index)} y={BOX_Y + BOX / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {candy}
                </text>
              </g>
            );
          })}
        </g>
      ) : null}

      {state.ghost && state.candies ? (
        <g>
          <rect x={centerX(state.ghost.index) - BOX / 2 + 4} y={BOX_Y + BOX + 10} width={BOX - 8} height={26} rx={6} fill="color-mix(in srgb, var(--coral) 18%, transparent)" stroke={VIZ_COLORS.coral} strokeDasharray="4 3" />
          <text x={centerX(state.ghost.index)} y={BOX_Y + BOX + 28} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕{state.ghost.value}
          </text>
        </g>
      ) : null}

      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 8} size={12} weight={600} tone="teal" anchor="middle">
          {state.note}
        </Label>
      ) : null}
    </Frame>
  );
}
