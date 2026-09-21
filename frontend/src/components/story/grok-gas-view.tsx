import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Stations on a circle, each with gas in and cost out, and a tank in the middle. Draws state only. */

export type GrokGasState = {
  gas: number[];
  cost: number[];
  tones: CellTone[];
  here: number | null;
  start: number | null;
  tank: number | null;
  total: number | null;
  /** Station where this stretch ran dry. */
  dry: number | null;
  failed: boolean;
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 260;
const CENTER = { x: 280, y: 128 };

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-800) 40%, transparent)",
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

export function GrokGasView({ state, pick }: { state: GrokGasState; pick?: CellPick }) {
  const count = Math.max(state.gas.length, 1);
  const radius = count <= 3 ? 78 : 88;
  const box = count > 6 ? 52 : 64;
  const place = (index: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return { x: CENTER.x + radius * Math.cos(angle), y: CENTER.y + radius * Math.sin(angle) };
  };

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A circle of gas stations with a tank in the middle">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.total !== null ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone={state.failed ? "coral" : "teal"} anchor="end">
          circle total: {state.total}
        </Label>
      ) : null}

      {state.gas.map((_, index) => {
        const from = place(index);
        const to = place((index + 1) % count);
        return (
          <line
            key={`a-${index}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={VIZ_COLORS.line}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.45}
          />
        );
      })}

      <circle cx={CENTER.x} cy={CENTER.y} r={36} fill="color-mix(in srgb, var(--steel-800) 50%, transparent)" stroke={VIZ_COLORS.line} />
      <text x={CENTER.x} y={CENTER.y - 4} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
        tank
      </text>
      <text x={CENTER.x} y={CENTER.y + 16} textAnchor="middle" fontSize={16} fontWeight={700} fill={state.tank !== null && state.tank < 0 ? VIZ_COLORS.coral : VIZ_COLORS.ink}>
        {state.tank === null ? "—" : state.tank}
      </text>

      {state.gas.map((gas, index) => {
        const { x, y } = place(index);
        const tone = pickTone(pick, index, index === state.here ? "edge" : index === state.dry ? "miss" : (state.tones[index] ?? "idle"));
        const gain = gas - state.cost[index];
        return (
          <g key={index} className={GLIDE} style={{ transform: `translate(${x}px, ${y}px)` }}>
            <rect x={-box / 2} y={-28} width={box} height={44} rx={10} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75} opacity={tone === "faded" ? 0.4 : 1} />
            <text x={0} y={-10} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
              {gas} / {state.cost[index]}
            </text>
            <text x={0} y={8} textAnchor="middle" fontSize={11} fill={gain >= 0 ? VIZ_COLORS.teal : VIZ_COLORS.coral}>
              {gain >= 0 ? `+${gain}` : String(gain)}
            </text>
            <text x={0} y={28} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
              {index === state.start ? "start" : String(index)}
            </text>
            <RejectedMark pick={pick} index={index} x={box / 2 - 8} y={-20} />
          </g>
        );
      })}

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

      {state.gas.map((_, index) => {
        const { x, y } = place(index);
        return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={x - box / 2} y={y - 28} width={box} height={56} label={`Choose station ${index}`} />;
      })}
    </Frame>
  );
}
