import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A number line of versions: good, then a first crack, then all bad. Draws state only. */

export type VersionLineState = {
  n: number;
  /** First bad version, once we may show the split. */
  bad: number | null;
  low: number | null;
  high: number | null;
  mid: number | null;
  /** Versions already asked. */
  checked?: { version: number; isBad: boolean }[];
  /** The trap: adding the two ends instead of stepping half the gap. */
  overflow?: boolean;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 220;
const LINE_Y = 120;
const LEFT = 48;
const RIGHT = WIDTH - 48;

export function GrokVersionView({ state, pick }: { state: VersionLineState; pick?: CellPick }) {
  const { n, bad, low, high, mid, checked, overflow } = state;
  const count = Math.max(n, 1);
  const spacing = count > 1 ? (RIGHT - LEFT) / (count - 1) : 0;
  const xOf = (version: number) => (count > 1 ? LEFT + (version - 1) * spacing : WIDTH / 2);
  const clampX = (x: number, half: number) => Math.min(WIDTH - half - 6, Math.max(half + 6, x));
  const known = new Map((checked ?? []).map((item) => [item.version, item.isBad]));

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A line of versions, good then bad">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {bad !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="ink" anchor="end">
          first crack at {bad}
        </Label>
      ) : (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="ink" anchor="end">
          {count} versions
        </Label>
      )}
      {overflow ? (
        <Label x={16} y={44} size={13} weight={700} tone="coral">
          ✕ do not add the two ends
        </Label>
      ) : null}

      <line x1={xOf(1)} y1={LINE_Y} x2={xOf(count)} y2={LINE_Y} stroke={VIZ_COLORS.line} strokeWidth={2} strokeLinecap="round" />
      {low !== null && high !== null ? (
        <line className={GLIDE} x1={xOf(low)} y1={LINE_Y} x2={xOf(high)} y2={LINE_Y} stroke={VIZ_COLORS.accent} strokeWidth={6} strokeLinecap="round" />
      ) : null}

      {Array.from({ length: count }, (_, index) => {
        const version = index + 1;
        const out = low !== null && high !== null && (version < low || version > high);
        const tone = pickTone(pick, index, "idle");
        const asked = known.get(version);
        const splitBad = bad !== null && version >= bad;
        const fill =
          asked === true || (splitBad && asked !== false && bad !== null && !checked?.length && low === null)
            ? VIZ_COLORS.coral
            : asked === false || tone === "done"
              ? VIZ_COLORS.teal
              : VIZ_COLORS.panel;
        const ring = tone === "miss" ? VIZ_COLORS.coral : asked === true ? VIZ_COLORS.coral : asked === false ? VIZ_COLORS.teal : VIZ_COLORS.muted;
        return (
          <g key={version} className={GLIDE} style={{ opacity: out ? 0.35 : 1 }}>
            <circle cx={xOf(version)} cy={LINE_Y} r={12} fill={fill} stroke={ring} strokeWidth={tone === "idle" && asked === undefined ? 1.5 : 2.25} />
            <text x={xOf(version)} y={LINE_Y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
              {version}
            </text>
            <RejectedMark pick={pick} index={index} x={xOf(version)} y={LINE_Y - 16} />
          </g>
        );
      })}

      {mid !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${xOf(mid)}px, 0px)` }}>
          <path d={`M0 ${LINE_Y - 18} l-6 -10 l12 0 Z`} fill={VIZ_COLORS.ink} />
        </g>
      ) : null}
      {mid !== null ? (
        <text x={clampX(xOf(mid), 56)} y={LINE_Y - 32} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
          needle: {mid}
        </text>
      ) : null}
      {low !== null ? (
        <text x={clampX(xOf(low), 40)} y={LINE_Y + 36} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          left: {low}
        </text>
      ) : null}
      {high !== null ? (
        <text x={clampX(xOf(high), 44)} y={LINE_Y + 52} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          right: {high}
        </text>
      ) : null}

      {Array.from({ length: count }, (_, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={xOf(index + 1) - Math.max(spacing, 28) / 2} y={LINE_Y - 22} width={Math.max(spacing, 28)} height={48} label={`Choose version ${index + 1}`} />
      ))}
    </Frame>
  );
}
