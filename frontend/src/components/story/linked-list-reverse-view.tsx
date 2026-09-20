import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Shared picture for the linked-list reversal stories: a train of cars joined by one-way couplings.
 * Every box is a clickable cell, including the `null` ends and the spare engine (the dummy node).
 * Draws state only.
 */

export type TrainCell = { label: string; kind: "car" | "null" | "engine" };

export type TrainPointer = { name: string; at: number; tone: "accent" | "teal" | "ink" };

export type LinkedListReverseState = {
  cells: TrainCell[];
  /** Where each cell is drawn, counted from the left. Cars change slots only when the train is pulled straight. */
  slots: number[];
  /** The coupling of each cell: the cell it hooks onto, or null for none. */
  links: (number | null)[];
  tones: CellTone[];
  /** Markers under the cars. Several on one cell stack downwards, in this order. */
  pointers: TrainPointer[];
  /** Cell whose coupling changed in this frame. */
  freshLink?: number | null;
  /** The trap of the whole-train story: cars that nothing holds any more. */
  lost?: number[] | null;
  /** The trap of the group story: leftover cars that must not be turned. */
  keep?: number[] | null;
  /** First and last slot of the group in work. */
  group?: [number, number] | null;
  counter?: { label: string; value: number } | null;
  /** Short text at the top right, e.g. the new train built so far. */
  note?: string | null;
};

const WIDTH = 560;
const HEIGHT = 236;
const CY = 118;
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
      {(["line", "accent", "coral"] as const).map((tone) => (
        <marker key={tone} id={`train-arrow-${tone}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={VIZ_COLORS[tone]} />
        </marker>
      ))}
    </defs>
  );
}

export function LinkedListReverseView({ state, pick }: { state: LinkedListReverseState; pick?: CellPick }) {
  const { cells, slots, links, pointers } = state;
  const count = cells.length;
  const spacing = Math.min(76, (WIDTH - 48) / Math.max(count, 1));
  const size = spacing >= 64 ? 40 : Math.max(28, spacing - 24);
  const half = size / 2;
  const slotX = (slot: number) => (WIDTH - (count - 1) * spacing) / 2 + slot * spacing;
  const cellX = (cell: number) => slotX(slots[cell]);
  const top = CY - half;

  const span = (group: number[]) => {
    const xs = group.map(cellX);
    return { from: Math.min(...xs) - half, to: Math.max(...xs) + half };
  };
  const lost = state.lost?.length ? span(state.lost) : null;
  const keep = state.keep?.length ? span(state.keep) : null;
  const group = state.group ?? null;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A train of cars joined by one-way couplings">
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

      {/* The group in work: one band that slides along the train. */}
      <rect
        className={GLIDE}
        y={top - 7}
        height={size + 14}
        rx={12}
        fill="color-mix(in srgb, var(--accent) 10%, transparent)"
        stroke={VIZ_COLORS.accent}
        strokeOpacity={0.45}
        style={{
          x: group ? slotX(group[0]) - half - 7 : slotX(0) - half - 7,
          width: group ? slotX(group[1]) - slotX(group[0]) + size + 14 : 0,
          opacity: group ? 1 : 0,
        }}
      />

      {/* Couplings. One to a neighbour is a straight arrow that swings round; a longer one reaches over the cars in between. */}
      {cells.map((_, cell) => {
        const target = links[cell];
        const step = target === null || target === undefined ? 0 : slots[target] - slots[cell];
        const near = Math.abs(step) === 1;
        const fresh = state.freshLink === cell;
        // A fresh coupling that orphans cars is the mistake itself, so it is drawn as one.
        const tone = fresh ? (state.lost?.length ? "coral" : "accent") : "line";
        const stroke = { stroke: VIZ_COLORS[tone], strokeWidth: fresh ? 2.75 : 1.75, markerEnd: `url(#train-arrow-${tone})` };
        const direction = Math.sign(step);
        const reach = Math.abs(step);
        const lift = Math.min(28 + 15 * reach, 74) + (fresh ? 12 : 0);
        return (
          <g key={`link-${cell}`}>
            <g className={GLIDE} style={{ transform: `translate(${cellX(cell)}px, ${CY}px) rotate(${near && step < 0 ? -180 : 0}deg)`, opacity: near ? 1 : 0 }}>
              <line x1={half + 3} y1={0} x2={spacing - half - 5} y2={0} {...stroke} />
            </g>
            {target !== null && target !== undefined && reach > 1 ? (
              <path
                d={`M${cellX(cell) + direction * 9} ${top - 3} Q${(cellX(cell) + cellX(target)) / 2} ${top - lift} ${cellX(target) - direction * 9} ${top - 4}`}
                fill="none"
                {...stroke}
              />
            ) : null}
          </g>
        );
      })}

      {cells.map((item, cell) => {
        const tone = pickTone(pick, cell, state.tones[cell] ?? "idle");
        const car = item.kind === "car";
        return (
          <g key={`cell-${cell}`} className={GLIDE} style={{ transform: `translate(${cellX(cell)}px, ${CY}px)`, opacity: tone === "faded" ? 0.4 : 1 }}>
            <rect x={-half} y={-half} width={size} height={size} rx={8} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 1.9} strokeDasharray={car ? undefined : "4 3"} />
            <text x={0} y={car ? 5 : 4} textAnchor="middle" fontSize={car ? 15 : 10} fontWeight={600} fill={car ? VIZ_COLORS.ink : VIZ_COLORS.muted} fontFamily={MONO}>
              {item.label}
            </text>
            <RejectedMark pick={pick} index={cell} x={half - 8} y={-half + 12} />
          </g>
        );
      })}

      {lost ? (
        <g>
          <line x1={lost.from} y1={top - 10} x2={lost.to} y2={top - 10} stroke={VIZ_COLORS.coral} strokeWidth={2.25} strokeDasharray="5 4" />
          <text x={Math.min((lost.from + lost.to) / 2, WIDTH - 100)} y={top - 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ lost: nothing holds these
          </text>
        </g>
      ) : null}
      {keep ? (
        <g>
          <line x1={keep.from} y1={top - 10} x2={keep.to} y2={top - 10} stroke={VIZ_COLORS.coral} strokeWidth={2.25} strokeDasharray="5 4" />
          <text x={Math.min((keep.from + keep.to) / 2, WIDTH - 90)} y={top - 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ too few: do not turn
          </text>
        </g>
      ) : null}

      {pointers.map((pointer, order) => {
        const level = pointers.slice(0, order).filter((other) => other.at === pointer.at).length;
        const color = POINTER_COLOR[pointer.tone];
        return (
          <g key={pointer.name} className={GLIDE} style={{ transform: `translate(${cellX(pointer.at)}px, ${CY + half + 24 + level * 15}px)` }}>
            {level === 0 ? <path d="M0 -20 L-5 -12 L5 -12 Z" fill={color} /> : null}
            <text x={0} y={0} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} fontFamily={MONO}>
              {pointer.name}
            </text>
          </g>
        );
      })}

      {/* Click targets sit on top, only while the reader is asked to point at a box. */}
      {cells.map((item, cell) => (
        <PickTarget
          key={`pick-${cell}`}
          pick={pick}
          index={cell}
          x={cellX(cell) - half - 5}
          y={top - 5}
          width={size + 10}
          height={size + 10}
          label={item.kind === "car" ? `Choose the car ${item.label}` : item.kind === "null" ? `Choose the null at the ${slots[cell] === 0 ? "front" : "end"}` : "Choose the spare engine"}
        />
      ))}
    </Frame>
  );
}
