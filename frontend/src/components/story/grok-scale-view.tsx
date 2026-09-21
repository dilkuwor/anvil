import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Groups of three digits with scale names, used for English words and similar. Draws state only. */

export type GrokScaleGroup = {
  digits: string;
  scale: string;
  spelled: string;
  skipped: boolean;
  tone: CellTone;
};

export type GrokScaleState = {
  groups: GrokScaleGroup[];
  here: number | null;
  spoken: string;
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 220;

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

export function GrokScaleView({ state, pick }: { state: GrokScaleState; pick?: CellPick }) {
  const count = Math.max(state.groups.length, 1);
  const boxW = Math.min(150, (WIDTH - 48) / count - 10);
  const startX = (WIDTH - (count * (boxW + 10) - 10)) / 2;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A number split into groups of three digits">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {state.groups.map((group, index) => {
        const x = startX + index * (boxW + 10);
        const tone = pickTone(pick, index, index === state.here ? "edge" : group.tone);
        return (
          <g key={index} className={GLIDE}>
            <rect x={x} y={44} width={boxW} height={88} rx={12} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75} opacity={tone === "faded" ? 0.4 : 1} />
            <text x={x + boxW / 2} y={70} textAnchor="middle" fontSize={20} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
              {group.digits}
            </text>
            <text x={x + boxW / 2} y={92} textAnchor="middle" fontSize={12} fill={VIZ_COLORS.muted}>
              {group.scale || "ones"}
            </text>
            <text x={x + boxW / 2} y={114} textAnchor="middle" fontSize={12} fontWeight={600} fill={group.skipped ? VIZ_COLORS.coral : VIZ_COLORS.teal}>
              {group.skipped ? "skip" : group.spelled || "—"}
            </text>
            <RejectedMark pick={pick} index={index} x={x + boxW - 12} y={56} />
          </g>
        );
      })}

      <text x={WIDTH / 2} y={164} textAnchor="middle" fontSize={14} fontWeight={600} fill={VIZ_COLORS.ink}>
        {state.spoken || " "}
      </text>

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

      {state.groups.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={startX + index * (boxW + 10)} y={44} width={boxW} height={88} label={`Choose group ${index}`} />
      ))}
    </Frame>
  );
}
