import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Two short sorted rows and a cut that splits each into a left pile and a right pile. Draws state only. */

export type PartitionState = {
  a: number[];
  b: number[];
  /** How many of `a` sit on the left of the cut. */
  cutA: number | null;
  /** How many of `b` sit on the left of the cut. */
  cutB: number | null;
  /** Searching the short row (true) or the long one (the trap). */
  onShort?: boolean;
  /** Edge values disagree: the cut is too far. */
  clash?: "a" | "b" | null;
  /** The trap: a cut that falls off the long row. */
  offEnd?: boolean;
  median?: string | null;
  /** Slow merge finger into the combined row. */
  merged?: number[];
  mergeAt?: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 268;
const ROW_A = 88;
const ROW_B = 168;
const BOX = 36;

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-800) 40%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 28%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
  done: "color-mix(in srgb, var(--teal) 50%, transparent)",
  faded: "transparent",
};

export function GrokPartitionView({ state, pick }: { state: PartitionState; pick?: CellPick }) {
  const { a, b, cutA, cutB, onShort, clash, offEnd, median, merged, mergeAt } = state;
  const row = (values: number[], y: number, startIndex: number, cut: number | null, clashHere: boolean) => {
    const width = values.length * (BOX + 8) - 8;
    const x0 = (WIDTH - Math.max(width, BOX)) / 2;
    return values.map((value, index) => {
      const x = x0 + index * (BOX + 8);
      let tone: CellTone = "idle";
      if (cut !== null) {
        if (index === cut - 1 || index === cut) tone = "edge";
        else if (index < cut) tone = "hit";
      }
      const picked = pickTone(pick, startIndex + index, tone);
      const fill = FILL[picked];
      const onCut = cut !== null && (index === cut - 1 || index === cut);
      const stroke = picked === "miss" || (clashHere && onCut) ? VIZ_COLORS.coral : picked === "done" || picked === "hit" ? VIZ_COLORS.teal : picked === "edge" ? VIZ_COLORS.accent : VIZ_COLORS.line;
      return (
        <g key={`${y}-${index}`}>
          <rect className={GLIDE} x={x} y={y} width={BOX} height={BOX} rx={6} fill={fill} stroke={stroke} strokeWidth={picked === "idle" ? 1.25 : 2} />
          <text x={x + BOX / 2} y={y + 24} textAnchor="middle" fontSize={14} fontWeight={600} fill={VIZ_COLORS.ink}>
            {value}
          </text>
          <RejectedMark pick={pick} index={startIndex + index} x={x + BOX - 8} y={y + 12} />
          <PickTarget pick={pick} index={startIndex + index} x={x} y={y} width={BOX} height={BOX} label={`Choose ${value}`} />
        </g>
      );
    });
  };

  const cutLine = (values: number[], y: number, cut: number | null, color: string) => {
    if (cut === null) return null;
    const width = values.length * (BOX + 8) - 8;
    const x0 = (WIDTH - Math.max(width, BOX)) / 2;
    const x = x0 + cut * (BOX + 8) - 4;
    return <line className={GLIDE} x1={x} y1={y - 8} x2={x} y2={y + BOX + 8} stroke={color} strokeWidth={2.5} />;
  };

  const aLen = a.length;
  const merge = merged ?? [];
  const mergeWidth = merge.length * (BOX + 8) - 8;
  const mergeX0 = (WIDTH - Math.max(mergeWidth, BOX)) / 2;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Two sorted rows with a cut between left pile and right pile">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {median !== null && median !== undefined ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          median {median}
        </Label>
      ) : onShort === false ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={700} tone="coral" anchor="end">
          ✕ searching the long row
        </Label>
      ) : onShort ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          cut the short row
        </Label>
      ) : null}
      {offEnd ? (
        <Label x={16} y={44} size={13} weight={700} tone="coral">
          ✕ the other cut falls off the row
        </Label>
      ) : null}

      {merge.length > 0 ? (
        <g>
          {merge.map((value, index) => {
            const x = mergeX0 + index * (BOX + 8);
            const at = mergeAt === index;
            return (
              <g key={`m-${index}`}>
                <rect className={GLIDE} x={x} y={ROW_A + 30} width={BOX} height={BOX} rx={6} fill={at ? FILL.edge : FILL.idle} stroke={at ? VIZ_COLORS.accent : VIZ_COLORS.line} strokeWidth={at ? 2 : 1.25} />
                <text x={x + BOX / 2} y={ROW_A + 54} textAnchor="middle" fontSize={14} fontWeight={600} fill={VIZ_COLORS.ink}>
                  {value}
                </text>
              </g>
            );
          })}
        </g>
      ) : (
        <g>
          <text x={36} y={ROW_A + 22} fontSize={12} fontWeight={700} fill={VIZ_COLORS.muted}>
            short
          </text>
          <text x={36} y={ROW_B + 22} fontSize={12} fontWeight={700} fill={VIZ_COLORS.muted}>
            long
          </text>
          {row(a, ROW_A, 0, cutA, clash === "a")}
          {row(b, ROW_B, aLen, cutB, clash === "b")}
          {cutLine(a, ROW_A, cutA, clash === "a" ? VIZ_COLORS.coral : VIZ_COLORS.accent)}
          {cutLine(b, ROW_B, cutB, clash === "b" ? VIZ_COLORS.coral : VIZ_COLORS.accent)}
        </g>
      )}
    </Frame>
  );
}
