import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Packages on a belt above a dial of ship capacities. Draws state only. */

export type ShipDialState = {
  packages: number[];
  /** Days the ship is allowed. */
  days: number;
  /** The needle: the capacity being tried. */
  capacity: number | null;
  /** Light end of the dial. */
  low: number | null;
  /** Heavy end of the dial. */
  high: number | null;
  /** Day each package boards at `capacity`. `null` hides them. */
  dayOf: number[] | null;
  /** Days that loading used. */
  usedDays?: number | null;
  verdict?: "works" | "slow" | null;
  /** Smallest-known capacity that works. */
  best?: number | null;
  /** The trap: a capacity that cannot hold the heaviest package. */
  wrong?: { capacity: number; stuck: number } | null;
  /** Package that cannot board (index). */
  stuck?: number | null;
  /** The dial split into "too small" and "works". */
  zones?: { firstWorks: number } | null;
  /** Right end of the dial: the total weight. */
  span: number;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 292;
const PILE_BASE = 170;
const PILE_MAX = 74;
const DIAL_Y = 232;
const DIAL_LEFT = 50;
const DIAL_RIGHT = WIDTH - 50;
/** Above this many capacities the dial stops printing every number and stops being clickable. */
export const SHIP_CLICK_LIMIT = 16;

export function GrokShipView({ state, pick }: { state: ShipDialState; pick?: CellPick }) {
  const { packages, days, capacity, low, high, dayOf, usedDays, verdict, best, wrong, stuck, zones, span } = state;
  const count = Math.max(packages.length, 1);
  const maxPkg = Math.max(1, ...packages);
  const dialMax = Math.max(span, maxPkg, 1);

  const step = Math.min(92, (WIDTH - 80) / count);
  const pileW = Math.min(50, step * 0.62);
  const pilesX = (WIDTH - step * count) / 2;
  const pileCenter = (index: number) => pilesX + index * step + step / 2;
  const tiny = step < 40;

  const spacing = dialMax > 1 ? (DIAL_RIGHT - DIAL_LEFT) / (dialMax - 1) : 0;
  const dialX = (value: number) => (dialMax > 1 ? DIAL_LEFT + (value - 1) * spacing : WIDTH / 2);
  const clampX = (x: number, half: number) => Math.min(WIDTH - half - 6, Math.max(half + 6, x));
  const everyNumber = dialMax <= SHIP_CLICK_LIMIT;
  const clockTone = verdict === "works" ? "teal" : verdict === "slow" ? "coral" : "ink";

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Packages on a belt above a dial of ship capacities">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="ink" anchor="end">
        finish in {days} days
      </Label>
      {best !== null && best !== undefined ? (
        <Label x={WIDTH - 16} y={44} size={13} weight={600} tone="teal" anchor="end">
          best so far: capacity {best}
        </Label>
      ) : null}

      {usedDays !== null && usedDays !== undefined ? (
        <Label x={16} y={44} size={13} weight={600} tone={clockTone}>
          {usedDays === Infinity ? "cannot load: a package will not fit" : `days used: ${usedDays}`}
        </Label>
      ) : null}
      {wrong ? (
        <Label x={16} y={66} size={13} weight={700} tone="coral">
          ✕ capacity {wrong.capacity} cannot hold the package of {wrong.stuck}
        </Label>
      ) : null}

      <line x1={pilesX - 4} y1={PILE_BASE} x2={WIDTH - pilesX + 4} y2={PILE_BASE} stroke={VIZ_COLORS.line} strokeWidth={1.5} />
      {packages.map((pkg, index) => {
        const height = Math.max(6, (pkg / maxPkg) * PILE_MAX);
        const isStuck = stuck === index;
        return (
          <g key={index}>
            <rect
              className={GLIDE}
              x={pileCenter(index) - pileW / 2}
              y={PILE_BASE - height}
              width={pileW}
              height={height}
              rx={4}
              fill={isStuck ? "color-mix(in srgb, var(--coral) 28%, transparent)" : "color-mix(in srgb, var(--steel-800) 40%, transparent)"}
              stroke={isStuck ? VIZ_COLORS.coral : VIZ_COLORS.line}
              strokeWidth={isStuck ? 2 : 1.25}
            />
            <text x={pileCenter(index)} y={PILE_BASE - height - 6} textAnchor="middle" fontSize={tiny ? 10 : 13} fontWeight={600} fill={VIZ_COLORS.ink}>
              {pkg}
            </text>
            {dayOf ? (
              <text x={pileCenter(index)} y={PILE_BASE + 16} textAnchor="middle" fontSize={tiny ? 10 : 12} fontWeight={700} fill={VIZ_COLORS.ink}>
                day {dayOf[index]}
              </text>
            ) : null}
          </g>
        );
      })}

      <line x1={dialX(1)} y1={DIAL_Y} x2={dialX(dialMax)} y2={DIAL_Y} stroke={VIZ_COLORS.line} strokeWidth={2} strokeLinecap="round" />
      {zones ? (
        <g>
          {zones.firstWorks > 1 ? <line x1={dialX(1)} y1={DIAL_Y} x2={dialX(zones.firstWorks - 1)} y2={DIAL_Y} stroke={VIZ_COLORS.coral} strokeWidth={6} strokeLinecap="round" /> : null}
          <line x1={dialX(zones.firstWorks)} y1={DIAL_Y} x2={dialX(dialMax)} y2={DIAL_Y} stroke={VIZ_COLORS.teal} strokeWidth={6} strokeLinecap="round" />
          {zones.firstWorks > 1 ? (
            <text x={clampX((dialX(1) + dialX(zones.firstWorks - 1)) / 2, 30)} y={DIAL_Y + 32} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
              too small
            </text>
          ) : null}
          <text x={clampX((dialX(zones.firstWorks) + dialX(dialMax)) / 2, 80)} y={DIAL_Y + 48} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.teal}>
            works, from {zones.firstWorks} up
          </text>
        </g>
      ) : null}
      {low !== null && high !== null ? (
        <line className={GLIDE} x1={dialX(low)} y1={DIAL_Y} x2={dialX(high)} y2={DIAL_Y} stroke={VIZ_COLORS.accent} strokeWidth={6} strokeLinecap="round" />
      ) : null}

      {dialMax <= 40
        ? Array.from({ length: dialMax }, (_, index) => {
            const value = index + 1;
            const out = low !== null && high !== null && (value < low || value > high);
            const tone = pickTone(pick, index, "idle");
            const fill = tone === "done" ? VIZ_COLORS.teal : VIZ_COLORS.panel;
            const ring = tone === "done" ? VIZ_COLORS.teal : tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.muted;
            return (
              <g key={value} opacity={out ? 0.35 : 1}>
                <circle cx={dialX(value)} cy={DIAL_Y} r={everyNumber ? 7 : 2.5} fill={fill} stroke={ring} strokeWidth={tone === "idle" ? 1.5 : 2.25} />
                {everyNumber ? (
                  <text x={dialX(value)} y={DIAL_Y + 18} textAnchor="middle" fontSize={11} fontWeight={600} fill={VIZ_COLORS.ink}>
                    {value}
                  </text>
                ) : null}
                <RejectedMark pick={pick} index={index} x={dialX(value)} y={DIAL_Y + 4} />
              </g>
            );
          })
        : null}

      {capacity !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${dialX(capacity)}px, 0px)` }}>
          <path d={`M0 ${DIAL_Y - 9} l-6 -10 l12 0 Z`} fill={VIZ_COLORS.ink} />
        </g>
      ) : null}
      {capacity !== null ? (
        <text x={clampX(dialX(capacity), 64)} y={DIAL_Y - 24} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
          needle: capacity {capacity}
        </text>
      ) : null}
      {low !== null && !zones ? (
        <text x={clampX(dialX(low), 44)} y={DIAL_Y + 34} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          light end: {low}
        </text>
      ) : null}
      {high !== null && !zones ? (
        <text x={clampX(dialX(high), 50)} y={DIAL_Y + 50} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          heavy end: {high}
        </text>
      ) : null}

      {everyNumber
        ? Array.from({ length: dialMax }, (_, index) => (
            <PickTarget key={`pick-${index}`} pick={pick} index={index} x={dialX(index + 1) - Math.max(spacing, 28) / 2} y={DIAL_Y - 20} width={Math.max(spacing, 28)} height={44} label={`Choose capacity ${index + 1}`} />
          ))
        : null}
    </Frame>
  );
}
