import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Daily prices as boxes, with each uphill step drawn as a climb. Draws state only. */

export type GrokPriceClimb = { from: number; to: number };

export type GrokPriceState = {
  prices: number[];
  tones: CellTone[];
  here: number | null;
  climbs: GrokPriceClimb[];
  /** Coral band: treating the whole walk as one trade. */
  trapRange: [number, number] | null;
  total: number | null;
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 220;
const CELLS_Y = 86;
const GAP = 8;

export function GrokPriceView({ state, pick }: { state: GrokPriceState; pick?: CellPick }) {
  const count = Math.max(state.prices.length, 1);
  const size = Math.min(48, (WIDTH - 48) / count - GAP);
  const startX = (WIDTH - (count * (size + GAP) - GAP)) / 2;
  const cellX = (index: number) => startX + index * (size + GAP);
  const centerX = (index: number) => cellX(index) + size / 2;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Prices as boxes, with every uphill step counted">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.total !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          total: {state.total}
        </Label>
      ) : null}

      {state.trapRange ? (
        <rect
          className={GLIDE}
          x={cellX(state.trapRange[0]) - 6}
          y={CELLS_Y - 10}
          width={cellX(state.trapRange[1]) + size + 6 - (cellX(state.trapRange[0]) - 6)}
          height={size + 20}
          rx={14}
          fill="color-mix(in srgb, var(--coral) 16%, transparent)"
          stroke={VIZ_COLORS.coral}
          strokeDasharray="5 4"
        />
      ) : null}

      {state.prices.map((value, index) => (
        <g key={index}>
          <Cell
            x={cellX(index)}
            y={CELLS_Y}
            size={size}
            value={value}
            tone={pickTone(pick, index, index === state.here ? "edge" : (state.tones[index] ?? "idle"))}
            caption={`day ${index}`}
          />
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 8} y={CELLS_Y + 12} />
        </g>
      ))}

      {state.climbs.map((climb, index) => (
        <g key={`c-${index}`}>
          <path
            d={`M${centerX(climb.from)} ${CELLS_Y - 6} Q${(centerX(climb.from) + centerX(climb.to)) / 2} ${CELLS_Y - 36} ${centerX(climb.to)} ${CELLS_Y - 6}`}
            fill="none"
            stroke={VIZ_COLORS.teal}
            strokeWidth={2}
          />
          <text x={(centerX(climb.from) + centerX(climb.to)) / 2} y={CELLS_Y - 40} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal}>
            +{state.prices[climb.to] - state.prices[climb.from]}
          </text>
        </g>
      ))}

      {state.here !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${centerX(state.here)}px, ${CELLS_Y + size + 28}px)` }}>
          <path d="M0 0 L-6 9 L6 9 Z" fill={VIZ_COLORS.accent} />
          <text x={0} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
            today
          </text>
        </g>
      ) : null}

      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 12} size={12} weight={600} tone="teal" anchor="middle">
          {state.note}
        </Label>
      ) : null}
      {state.trapNote ? (
        <Label x={WIDTH / 2} y={HEIGHT - 12} size={12} weight={700} tone="coral" anchor="middle">
          {state.trapNote}
        </Label>
      ) : null}

      {state.prices.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(index) - GAP / 2} y={CELLS_Y - 4} width={size + GAP} height={size + 22} label={`Choose day ${index}`} />
      ))}
    </Frame>
  );
}
