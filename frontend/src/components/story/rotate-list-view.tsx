import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for the Rotate List story: beads on a one-way string, with an "end" box after the last slot.
 * A bead's string may reach a neighbour (straight arrow), a far bead (an arc over the top: the ring),
 * or nothing. A coral bar marks where the string is cut. Draws state only.
 */

export type RotatePointer = { name: string; at: number; tone: "accent" | "teal" | "ink" };

export type RotateListState = {
  values: number[];
  /** Where each bead is drawn, counted from the left. Beads change slots only when the answer is pulled straight. */
  slots: number[];
  /** The string leaving each bead: the bead it reaches, or null for nothing. */
  links: (number | null)[];
  tones: CellTone[];
  /** Fingers under the beads. Several on one bead stack downwards, in this order. */
  pointers: RotatePointer[];
  /** Bead whose string changed in this frame. */
  freshLink?: number | null;
  /** Bead whose outgoing string is cut, or about to be: a coral bar just after it. */
  cut?: number | null;
  counter?: { label: string; value: number } | null;
  /** Short text at the top right, e.g. the list after a rotation. */
  note?: string | null;
  /** The trap made visible: full turns that change nothing, and the remainder that matters. */
  turns?: { k: number; n: number; remainder: number } | null;
};

const WIDTH = 560;
const HEIGHT = 236;
const CY = 108;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

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

const POINTER_COLOR = { accent: VIZ_COLORS.accent, teal: VIZ_COLORS.teal, ink: VIZ_COLORS.ink } as const;

function Arrowheads() {
  return (
    <defs>
      {(["line", "accent"] as const).map((tone) => (
        <marker key={tone} id={`bead-arrow-${tone}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={VIZ_COLORS[tone]} />
        </marker>
      ))}
    </defs>
  );
}

export function RotateListView({ state, pick }: { state: RotateListState; pick?: CellPick }) {
  const { values, slots, links, pointers } = state;
  const count = values.length;
  // One extra slot on the right for the "end" box.
  const slotCount = count + 1;
  const spacing = Math.min(76, (WIDTH - 48) / Math.max(slotCount, 1));
  const radius = spacing >= 64 ? 20 : Math.max(14, spacing / 2 - 8);
  const slotX = (slot: number) => (WIDTH - (slotCount - 1) * spacing) / 2 + slot * spacing;
  const cellX = (cell: number) => slotX(slots[cell]);
  const endX = slotX(count);
  const top = CY - radius;
  const lastSlot = count - 1;

  const turns = state.turns ?? null;
  const fullTurns = turns ? Math.floor(turns.k / turns.n) : 0;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Beads on a one-way string, with an end box after the last bead">
      <Arrowheads />

      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          {state.note}
        </Label>
      ) : null}

      {/* The end box: what "nothing" looks like. */}
      <g transform={`translate(${endX}, ${CY})`}>
        <rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx={8} fill="transparent" stroke={VIZ_COLORS.line} strokeWidth={1.25} strokeDasharray="4 3" />
        <text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={600} fill={VIZ_COLORS.muted} fontFamily={MONO}>
          end
        </text>
      </g>

      {/* Strings. To the next slot: a straight arrow. Further away: an arc over the top. To nothing at the last slot: an arrow into the end box. */}
      {values.map((_, cell) => {
        const target = links[cell];
        const fresh = state.freshLink === cell;
        const tone = fresh ? "accent" : "line";
        const stroke = { stroke: VIZ_COLORS[tone], strokeWidth: fresh ? 2.75 : 1.75, markerEnd: `url(#bead-arrow-${tone})` };
        if (target === null || target === undefined) {
          if (slots[cell] !== lastSlot) return null;
          return <line key={`link-${cell}`} className={GLIDE} x1={cellX(cell) + radius + 3} y1={CY} x2={endX - radius - 5} y2={CY} {...stroke} />;
        }
        const step = slots[target] - slots[cell];
        if (step === 1) {
          return <line key={`link-${cell}`} className={GLIDE} x1={cellX(cell) + radius + 3} y1={CY} x2={cellX(target) - radius - 5} y2={CY} {...stroke} />;
        }
        const direction = Math.sign(step);
        const lift = Math.min(26 + 14 * Math.abs(step), 72) + (fresh ? 10 : 0);
        return (
          <path
            key={`link-${cell}`}
            className={GLIDE}
            d={`M${cellX(cell) + direction * 8} ${top - 2} Q${(cellX(cell) + cellX(target)) / 2} ${top - lift} ${cellX(target) - direction * 8} ${top - 3}`}
            fill="none"
            {...stroke}
          />
        );
      })}

      {/* The cut: a coral bar across the string just after the bead. */}
      {state.cut !== null && state.cut !== undefined ? (
        <g className={GLIDE} style={{ transform: `translate(${cellX(state.cut) + spacing / 2}px, ${CY}px)` }}>
          <line x1={0} y1={-12} x2={0} y2={12} stroke={VIZ_COLORS.coral} strokeWidth={3} strokeLinecap="round" />
          <text x={0} y={radius + 12} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            cut
          </text>
        </g>
      ) : null}

      {values.map((value, cell) => {
        const tone = pickTone(pick, cell, state.tones[cell] ?? "idle");
        return (
          <g key={`bead-${cell}`} className={GLIDE} style={{ transform: `translate(${cellX(cell)}px, ${CY}px)`, opacity: tone === "faded" ? 0.4 : 1 }}>
            <circle r={radius} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 1.9} />
            <text x={0} y={5} textAnchor="middle" fontSize={15} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
              {value}
            </text>
            <RejectedMark pick={pick} index={cell} x={radius - 9} y={-radius + 13} />
          </g>
        );
      })}

      {pointers.map((pointer, order) => {
        const level = pointers.slice(0, order).filter((other) => other.at === pointer.at).length;
        const color = POINTER_COLOR[pointer.tone];
        return (
          <g key={pointer.name} className={GLIDE} style={{ transform: `translate(${cellX(pointer.at)}px, ${CY + radius + 26 + level * 15}px)` }}>
            {level === 0 ? <path d="M0 -20 L-5 -12 L5 -12 Z" fill={color} /> : null}
            <text x={0} y={0} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} fontFamily={MONO}>
              {pointer.name}
            </text>
          </g>
        );
      })}

      {turns ? (
        <text x={WIDTH / 2} y={HEIGHT - 12} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.muted} fontFamily={MONO}>
          <tspan>k = {turns.k}: </tspan>
          <tspan fill={VIZ_COLORS.coral}>
            {fullTurns} full turn{fullTurns === 1 ? "" : "s"} of {turns.n} (no change)
          </tspan>
          <tspan> + </tspan>
          <tspan fill={VIZ_COLORS.teal}>{turns.remainder} that count</tspan>
        </text>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point at a bead. */}
      {values.map((value, cell) => (
        <PickTarget key={`pick-${cell}`} pick={pick} index={cell} x={cellX(cell) - radius - 5} y={top - 5} width={radius * 2 + 10} height={radius * 2 + 10} label={`Choose the bead ${value}`} rx={radius + 5} />
      ))}
    </Frame>
  );
}
