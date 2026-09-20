import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Banana piles on top, and under them a dial of every possible eating speed. Draws state only. */

export type KokoEatingState = {
  piles: number[];
  /** Hours until the guards are back. */
  h: number;
  /** The needle: the speed being tried. */
  speed: number | null;
  /** Slow end of the dial. */
  low: number | null;
  /** Fast end of the dial. */
  high: number | null;
  /** Whole hours each pile costs at `speed`. `null` hides them. */
  hours: number[] | null;
  /** Colours the hour count once the verdict is out. */
  verdict?: "works" | "slow" | null;
  /** Fastest-known speed that works. Not the answer until the dial closes. */
  best?: number | null;
  /** The trap: the wrong, all-in-one division. */
  wrong?: { total: number; speed: number; hours: string } | null;
  /** The whole dial split into "too slow" and "works", for the insight. */
  zones?: { firstWorks: number } | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 292;
const PILE_BASE = 170;
const PILE_MAX = 74;
const DIAL_Y = 232;
const DIAL_LEFT = 50;
const DIAL_RIGHT = WIDTH - 50;
/** Above this many speeds the dial stops printing every number and stops being clickable. */
export const DIAL_CLICK_LIMIT = 16;

export function KokoEatingView({ state, pick }: { state: KokoEatingState; pick?: CellPick }) {
  const { piles, h, speed, low, high, hours, verdict, best, wrong, zones } = state;
  const count = Math.max(piles.length, 1);
  const maxPile = Math.max(1, ...piles);

  const step = Math.min(92, (WIDTH - 80) / count);
  const pileW = Math.min(50, step * 0.62);
  const pilesX = (WIDTH - step * count) / 2;
  const pileCenter = (index: number) => pilesX + index * step + step / 2;
  const tiny = step < 40;

  const spacing = maxPile > 1 ? (DIAL_RIGHT - DIAL_LEFT) / (maxPile - 1) : 0;
  const dialX = (value: number) => (maxPile > 1 ? DIAL_LEFT + (value - 1) * spacing : WIDTH / 2);
  const clampX = (x: number, half: number) => Math.min(WIDTH - half - 6, Math.max(half + 6, x));
  const everyNumber = maxPile <= DIAL_CLICK_LIMIT;
  const total = hours ? hours.reduce((sum, value) => sum + value, 0) : null;
  const clockTone = verdict === "works" ? "teal" : verdict === "slow" ? "coral" : "ink";

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Piles of bananas above a dial of eating speeds">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="ink" anchor="end">
        guards back in {h} hours
      </Label>
      {best !== null && best !== undefined ? (
        <Label x={WIDTH - 16} y={44} size={13} weight={600} tone="teal" anchor="end">
          best so far: speed {best}
        </Label>
      ) : null}

      {total !== null && hours ? (
        <Label x={16} y={44} size={13} weight={600} tone={clockTone}>
          {hours.length <= 6 ? `whole hours: ${hours.join(" + ")} = ${total}` : `whole hours, pile by pile: ${total}`}
        </Label>
      ) : null}
      {wrong ? (
        <Label x={16} y={66} size={13} weight={700} tone="coral">
          ✕ all {wrong.total} bananas ÷ {wrong.speed} = {wrong.hours} hours
        </Label>
      ) : null}

      {/* The piles. */}
      <line x1={pilesX - 4} y1={PILE_BASE} x2={WIDTH - pilesX + 4} y2={PILE_BASE} stroke={VIZ_COLORS.line} strokeWidth={1.5} />
      {piles.map((pile, index) => {
        const height = Math.max(6, (pile / maxPile) * PILE_MAX);
        return (
          <g key={index}>
            <rect className={GLIDE} x={pileCenter(index) - pileW / 2} y={PILE_BASE - height} width={pileW} height={height} rx={4} fill="color-mix(in srgb, var(--steel-800) 40%, transparent)" stroke={VIZ_COLORS.line} strokeWidth={1.25} />
            <text x={pileCenter(index)} y={PILE_BASE - height - 6} textAnchor="middle" fontSize={tiny ? 10 : 13} fontWeight={600} fill={VIZ_COLORS.ink}>
              {pile}
            </text>
            {/* Under the pile, in ink, so it never spills out of a short bar. */}
            {hours ? (
              <text x={pileCenter(index)} y={PILE_BASE + 16} textAnchor="middle" fontSize={tiny ? 10 : 12} fontWeight={700} fill={VIZ_COLORS.ink}>
                {hours[index]} h
              </text>
            ) : null}
          </g>
        );
      })}

      {/* The dial: every speed from 1 to the biggest pile. */}
      <line x1={dialX(1)} y1={DIAL_Y} x2={dialX(maxPile)} y2={DIAL_Y} stroke={VIZ_COLORS.line} strokeWidth={2} strokeLinecap="round" />
      {zones ? (
        <g>
          {zones.firstWorks > 1 ? <line x1={dialX(1)} y1={DIAL_Y} x2={dialX(zones.firstWorks - 1)} y2={DIAL_Y} stroke={VIZ_COLORS.coral} strokeWidth={6} strokeLinecap="round" /> : null}
          <line x1={dialX(zones.firstWorks)} y1={DIAL_Y} x2={dialX(maxPile)} y2={DIAL_Y} stroke={VIZ_COLORS.teal} strokeWidth={6} strokeLinecap="round" />
          {zones.firstWorks > 1 ? (
            <text x={clampX((dialX(1) + dialX(zones.firstWorks - 1)) / 2, 30)} y={DIAL_Y + 32} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
              too slow
            </text>
          ) : null}
          <text x={clampX((dialX(zones.firstWorks) + dialX(maxPile)) / 2, 80)} y={DIAL_Y + 48} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.teal}>
            works, from speed {zones.firstWorks} up
          </text>
        </g>
      ) : null}
      {low !== null && high !== null ? (
        <line className={GLIDE} x1={dialX(low)} y1={DIAL_Y} x2={dialX(high)} y2={DIAL_Y} stroke={VIZ_COLORS.accent} strokeWidth={6} strokeLinecap="round" />
      ) : null}

      {maxPile <= 40
        ? Array.from({ length: maxPile }, (_, index) => {
            const value = index + 1;
            const out = low !== null && high !== null && (value < low || value > high);
            const tone = pickTone(pick, index, "idle");
            // A ruled-out speed keeps a dark centre, so its ✕ stays readable inside the ring.
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

      {/* Needle above the dial; the two ends below it, each on its own row, so equal values never overprint. */}
      {speed !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${dialX(speed)}px, 0px)` }}>
          <path d={`M0 ${DIAL_Y - 9} l-6 -10 l12 0 Z`} fill={VIZ_COLORS.ink} />
        </g>
      ) : null}
      {speed !== null ? (
        <text x={clampX(dialX(speed), 56)} y={DIAL_Y - 24} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
          needle: speed {speed}
        </text>
      ) : null}
      {low !== null && !zones ? (
        <text x={clampX(dialX(low), 44)} y={DIAL_Y + 34} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          slow end: {low}
        </text>
      ) : null}
      {high !== null && !zones ? (
        <text x={clampX(dialX(high), 44)} y={DIAL_Y + 50} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          fast end: {high}
        </text>
      ) : null}

      {/* Click targets on the dial, one per speed, only when every speed has room for one. */}
      {everyNumber
        ? Array.from({ length: maxPile }, (_, index) => (
            <PickTarget key={`pick-${index}`} pick={pick} index={index} x={dialX(index + 1) - Math.max(spacing, 28) / 2} y={DIAL_Y - 20} width={Math.max(spacing, 28)} height={44} label={`Choose speed ${index + 1}`} />
          ))
        : null}
    </Frame>
  );
}
