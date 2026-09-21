import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Letters as boxes, two named markers, an optional last-seen row. Draws state only. */

export type GrokStringRowState = {
  chars: string[];
  tones: CellTone[];
  left: { index: number; label: string } | null;
  right: { index: number; label: string } | null;
  band: [number, number] | null;
  lastSeen: { key: string; index: number; tone: "idle" | "hit" | "miss" }[] | null;
  /** Coral dashed cut: a part closed too early. */
  trapCut: number | null;
  result: string | null;
  note: string | null;
  trapNote: string | null;
  counter: { label: string; value: string } | null;
};

const WIDTH = 560;
const HEIGHT = 236;
const SIZE = 40;
const GAP = 6;
const CELLS_Y = 72;

export function GrokStringRowView({ state, pick }: { state: GrokStringRowState; pick?: CellPick }) {
  const count = Math.max(state.chars.length, 1);
  const size = Math.min(SIZE, (WIDTH - 48) / count - GAP);
  const startX = (WIDTH - (count * (size + GAP) - GAP)) / 2;
  const cellX = (index: number) => startX + index * (size + GAP);
  const centerX = (index: number) => cellX(index) + size / 2;
  const band = state.band && state.band[1] >= state.band[0] ? state.band : null;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A row of letters with a marked stretch">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.result !== null ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone="teal" anchor="end">
          {state.result}
        </Label>
      ) : null}

      {band ? (
        <rect
          className={GLIDE}
          x={cellX(band[0]) - 5}
          y={CELLS_Y - 8}
          width={cellX(band[1]) + size + 5 - (cellX(band[0]) - 5)}
          height={size + 16}
          rx={12}
          fill="color-mix(in srgb, var(--accent) 12%, transparent)"
          stroke={VIZ_COLORS.accent}
          strokeOpacity={0.45}
        />
      ) : null}

      {state.trapCut !== null && state.trapCut < count ? (
        <g className={GLIDE} style={{ transform: `translate(${cellX(state.trapCut) + size + 2}px, ${CELLS_Y - 6}px)` }}>
          <line x1={0} y1={0} x2={0} y2={size + 12} stroke={VIZ_COLORS.coral} strokeWidth={2.5} strokeDasharray="4 3" />
          <text x={0} y={-8} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ cut
          </text>
        </g>
      ) : null}

      {state.chars.map((char, index) => (
        <g key={index}>
          <Cell x={cellX(index)} y={CELLS_Y} size={size} value={char} tone={pickTone(pick, index, state.tones[index] ?? "idle")} caption={String(index)} />
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 8} y={CELLS_Y + 12} />
        </g>
      ))}

      {state.left ? (
        <g className={GLIDE} style={{ transform: `translate(${centerX(state.left.index)}px, ${CELLS_Y - 4}px)` }}>
          <path d="M0 0 L-6 -9 L6 -9 Z" fill={VIZ_COLORS.accent} />
          <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
            {state.left.label}
          </text>
        </g>
      ) : null}
      {state.right && state.left?.index !== state.right.index ? (
        <g className={GLIDE} style={{ transform: `translate(${centerX(state.right.index)}px, ${CELLS_Y - 4}px)` }}>
          <path d="M0 0 L-6 -9 L6 -9 Z" fill={VIZ_COLORS.teal} />
          <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.teal}>
            {state.right.label}
          </text>
        </g>
      ) : null}

      {state.lastSeen ? (
        <g>
          <Label x={16} y={CELLS_Y + size + 40} size={12} weight={600}>
            last seen
          </Label>
          {state.lastSeen.map((entry, index) => {
            const x = 92 + index * 62;
            const stroke = entry.tone === "hit" ? VIZ_COLORS.teal : entry.tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.line;
            const fill =
              entry.tone === "hit"
                ? "color-mix(in srgb, var(--teal) 25%, transparent)"
                : entry.tone === "miss"
                  ? "color-mix(in srgb, var(--coral) 25%, transparent)"
                  : "transparent";
            return (
              <g key={entry.key}>
                <rect x={x} y={CELLS_Y + size + 22} width={54} height={28} rx={7} fill={fill} stroke={stroke} />
                <text x={x + 27} y={CELLS_Y + size + 41} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {entry.key} → {entry.index}
                </text>
              </g>
            );
          })}
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

      {state.chars.map((_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(index) - GAP / 2} y={CELLS_Y - 4} width={size + GAP} height={size + 20} label={`Choose index ${index}`} />
      ))}
    </Frame>
  );
}
