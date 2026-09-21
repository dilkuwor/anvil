import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Words in a row, and bundles they drop into by letter counts. Draws state only. */

export type GrokBundle = { key: string; words: string[]; trap: boolean };

export type GrokGroupsState = {
  words: string[];
  tones: CellTone[];
  here: number | null;
  signature: string | null;
  bundles: GrokBundle[];
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 248;
const GAP = 8;

export function GrokGroupsView({ state, pick }: { state: GrokGroupsState; pick?: CellPick }) {
  const count = Math.max(state.words.length, 1);
  const size = Math.min(64, (WIDTH - 48) / count - GAP);
  const startX = (WIDTH - (count * (size + GAP) - GAP)) / 2;
  const cellX = (index: number) => startX + index * (size + GAP);
  const bundleY = 118;
  const bundleW = Math.min(160, (WIDTH - 40) / Math.max(state.bundles.length, 1) - 8);
  const bundleX = (index: number) => 20 + index * (bundleW + 10);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Words dropping into bundles that share a letter-count key">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.signature ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone="teal" anchor="end">
          counts: {state.signature}
        </Label>
      ) : null}

      {state.words.map((word, index) => (
        <g key={index}>
          <Cell
            x={cellX(index)}
            y={40}
            size={size}
            value={word}
            tone={pickTone(pick, index, index === state.here ? "edge" : (state.tones[index] ?? "idle"))}
          />
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 8} y={48} />
        </g>
      ))}

      {state.bundles.map((bundle, index) => (
        <g key={`b-${index}`} className={GLIDE}>
          <rect
            x={bundleX(index)}
            y={bundleY}
            width={bundleW}
            height={72}
            rx={10}
            fill={bundle.trap ? "color-mix(in srgb, var(--coral) 14%, transparent)" : "color-mix(in srgb, var(--teal) 12%, transparent)"}
            stroke={bundle.trap ? VIZ_COLORS.coral : VIZ_COLORS.teal}
          />
          <text x={bundleX(index) + 10} y={bundleY + 18} fontSize={11} fill={VIZ_COLORS.muted}>
            {bundle.key}
          </text>
          <text x={bundleX(index) + 10} y={bundleY + 42} fontSize={13} fontWeight={600} fill={VIZ_COLORS.ink}>
            {bundle.words.join(", ")}
          </text>
        </g>
      ))}

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

      {state.words.map((word, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(index) - 4} y={40} width={size + 8} height={size + 8} label={`Choose word ${word}`} />
      ))}
    </Frame>
  );
}
