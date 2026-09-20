import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * A line of guests between a front door and a back door, with a guest list beside it.
 * Front of the line = just used. Back of the line = first to leave. Draws state only.
 *
 * Click targets: 0 = the front door, 1..n = the guests from front to back, n + 1 = the back door.
 */

export type LruGuest = { key: number; val: number };

export type LruCacheState = {
  capacity: number;
  /** Front of the line first. */
  line: LruGuest[];
  /** plain = just boxes (no doors, no links) · oneWay = forward links only (the trap) · twoWay = the real thing. */
  links: "plain" | "oneWay" | "twoWay";
  /** Keys on the guest list, in the order they were written down. null hides the list. */
  guestList: number[] | null;
  /** The key this step is about. */
  focusKey: number | null;
  /** Draw a pointer from the focus key's entry on the guest list down to its seat. */
  pointer: boolean;
  /** Being thrown out. Only ever set on a reveal frame. */
  leavingKey: number | null;
  /** Unhooked from the line and lifted out; its two neighbours are linked to each other across the gap. */
  liftedKey: number | null;
  /** A new key with no room for it (picture scene). */
  arriving: LruGuest | null;
  /** How many guests, counted from the front, have been walked past. */
  walked: number | null;
  op: string | null;
  counter: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 262;
const LINE_Y = 132;
const BOX_H = 46;
const LIFT = 52;

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-800) 45%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 40%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 28%, transparent)",
  done: "color-mix(in srgb, var(--teal) 45%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 30%, transparent)",
  faded: "transparent",
};

const STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  done: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  faded: VIZ_COLORS.line,
};

/** One link between two boxes: forward on the upper track, backward on the lower one. */
function Link({ from, to, y, backward, color }: { from: number; to: number; y: number; backward: boolean; color: string }) {
  const [tail, tip] = backward ? [to, from] : [from, to];
  const head = backward ? "M0 0 L7 -4 L7 4 Z" : "M0 0 L-7 -4 L-7 4 Z";
  return (
    <g>
      <line x1={tail} y1={y} x2={tip} y2={y} stroke={color} strokeWidth={1.75} />
      <path d={head} fill={color} transform={`translate(${tip} ${y})`} />
    </g>
  );
}

export function LruCacheView({ state, pick }: { state: LruCacheState; pick?: CellPick }) {
  const { line, guestList, focusKey } = state;
  const doors = state.links !== "plain";
  const boxes = line.length + (doors ? 2 : 0);
  // Size from the data: a long line gets narrower boxes and shorter links, and always fits.
  const gap = boxes > 8 ? 14 : 26;
  const boxW = Math.max(30, Math.min(66, (WIDTH - 32 - (boxes - 1) * gap) / Math.max(1, boxes)));
  const pitch = boxW + gap;
  const startX = (WIDTH - (boxes * pitch - gap)) / 2;
  const boxX = (slot: number) => startX + slot * pitch;
  const seatX = (index: number) => boxX(index + (doors ? 1 : 0));
  const liftedAt = line.findIndex((guest) => guest.key === state.liftedKey);

  // Who is linked to whom: everyone in order, skipping a guest that has been lifted out.
  const chain: number[] = [];
  if (doors) chain.push(0);
  line.forEach((_, index) => {
    if (index !== liftedAt) chain.push(index + (doors ? 1 : 0));
  });
  if (doors) chain.push(boxes - 1);

  const entryW = guestList ? Math.min(100, (WIDTH - 118) / Math.max(1, guestList.length)) : 0;
  const entryX = (index: number) => 102 + index * entryW;
  const focusEntry = guestList ? guestList.indexOf(focusKey ?? Number.NaN) : -1;
  const focusSeat = line.findIndex((guest) => guest.key === focusKey);

  const toneOf = (guest: LruGuest): CellTone => (guest.key === state.leavingKey ? "miss" : guest.key === focusKey ? "edge" : "idle");

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A line of cached keys between a front door and a back door, with a guest list that points at each seat">
      {state.op ? (
        <Label x={16} y={24} size={14} weight={700} tone="accent">
          {state.op}
        </Label>
      ) : null}
      <Label x={WIDTH - 16} y={24} size={13} weight={600} tone="teal" anchor="end">
        in cache: {line.length} of {state.capacity}
      </Label>

      {guestList ? (
        <g>
          <Label x={16} y={60} size={12} weight={600}>
            guest list
          </Label>
          {guestList.length === 0 ? (
            <Label x={102} y={60} size={12}>
              (empty)
            </Label>
          ) : null}
          {guestList.map((key, index) => {
            const tone: CellTone = key === state.leavingKey ? "miss" : key === focusKey ? "edge" : "idle";
            return (
              <g key={key}>
                <rect x={entryX(index)} y={42} width={entryW - 8} height={28} rx={7} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" ? 1 : 1.75} />
                <text x={entryX(index) + (entryW - 8) / 2} y={60} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={VIZ_COLORS.ink}>
                  {entryW >= 96 ? `key ${key} → its seat` : `key ${key}`}
                </text>
              </g>
            );
          })}
          {state.pointer && focusEntry !== -1 && focusSeat !== -1 ? (
            <g>
              <line
                x1={entryX(focusEntry) + (entryW - 8) / 2}
                y1={72}
                x2={seatX(focusSeat) + boxW / 2}
                y2={LINE_Y - (focusSeat === liftedAt ? LIFT : 0) - 8}
                stroke={VIZ_COLORS.accent}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
              <path d="M0 0 L-5 -9 L5 -9 Z" fill={VIZ_COLORS.accent} transform={`translate(${seatX(focusSeat) + boxW / 2} ${LINE_Y - (focusSeat === liftedAt ? LIFT : 0) - 2})`} />
            </g>
          ) : null}
        </g>
      ) : null}

      {/* Links between neighbours. Two tracks, so both directions can be seen. */}
      {state.links !== "plain"
        ? chain.slice(1).map((slot, index) => {
            const from = boxX(chain[index]) + boxW + 3;
            const to = boxX(slot) - 3;
            const bridged = slot - chain[index] > 1;
            const color = bridged ? VIZ_COLORS.teal : VIZ_COLORS.muted;
            return (
              <g key={`link-${chain[index]}-${slot}`}>
                <Link from={from} to={to} y={LINE_Y + BOX_H / 2 - (state.links === "twoWay" ? 7 : 0)} backward={false} color={color} />
                {state.links === "twoWay" ? <Link from={from} to={to} y={LINE_Y + BOX_H / 2 + 7} backward color={color} /> : null}
              </g>
            );
          })
        : null}

      {doors
        ? [0, boxes - 1].map((slot, index) => {
            const tone = pickTone(pick, index === 0 ? 0 : line.length + 1, "idle");
            return (
              <g key={`door-${slot}`}>
                <rect x={boxX(slot)} y={LINE_Y} width={boxW} height={BOX_H} rx={8} fill={tone === "idle" ? "transparent" : FILL[tone]} stroke={tone === "idle" ? VIZ_COLORS.muted : STROKE[tone]} strokeWidth={1.5} strokeDasharray={tone === "idle" ? "4 3" : undefined} />
                <text x={boxX(slot) + boxW / 2} y={LINE_Y + 20} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.muted}>
                  {index === 0 ? "front" : "back"}
                </text>
                <text x={boxX(slot) + boxW / 2} y={LINE_Y + 34} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.muted}>
                  door
                </text>
                <RejectedMark pick={pick} index={index === 0 ? 0 : line.length + 1} x={boxX(slot) + boxW - 8} y={LINE_Y + 12} />
              </g>
            );
          })
        : null}
      {doors ? (
        <g>
          <Label x={boxX(0)} y={LINE_Y + BOX_H + 18} size={11} weight={600} tone="teal">
            front of the line: just used
          </Label>
          {/* One row lower than the front label: with a short line the two would run into each other. */}
          <Label x={boxX(boxes - 1) + boxW} y={LINE_Y + BOX_H + 34} size={11} weight={600} anchor="end">
            back of the line: first to leave
          </Label>
        </g>
      ) : null}

      {/* Each guest is one group, so the box and its text glide together when the order changes. */}
      {line.map((guest, index) => {
        const tone = pickTone(pick, index + 1, toneOf(guest));
        const lifted = index === liftedAt;
        return (
          <g key={guest.key} className={GLIDE} style={{ transform: `translate(${seatX(index)}px, ${LINE_Y - (lifted ? LIFT : 0)}px)` }} opacity={guest.key === state.leavingKey ? 0.75 : 1}>
            <rect width={boxW} height={BOX_H} rx={8} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" ? 1.25 : 2} />
            <text x={boxW / 2} y={20} textAnchor="middle" fontSize={boxW < 44 ? 11 : 13} fontWeight={700} fill={VIZ_COLORS.ink}>
              key {guest.key}
            </text>
            <text x={boxW / 2} y={36} textAnchor="middle" fontSize={boxW < 44 ? 10 : 11} fill={VIZ_COLORS.muted}>
              {boxW < 44 ? guest.val : `value ${guest.val}`}
            </text>
            <RejectedMark pick={pick} index={index + 1} x={boxW - 8} y={12} />
            {state.walked !== null && index < state.walked ? (
              <text x={boxW / 2} y={-8} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
                step {index + 1}
              </text>
            ) : null}
          </g>
        );
      })}

      {state.arriving ? (
        <g>
          <rect x={startX} y={LINE_Y - LIFT - 12} width={boxW} height={BOX_H} rx={8} fill={FILL.miss} stroke={VIZ_COLORS.coral} strokeWidth={2} />
          <text x={startX + boxW / 2} y={LINE_Y - LIFT + 8} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink}>
            key {state.arriving.key}
          </text>
          <text x={startX + boxW / 2} y={LINE_Y - LIFT + 24} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
            value {state.arriving.val}
          </text>
          <text x={startX + boxW + 12} y={LINE_Y - LIFT + 16} fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ no room
          </text>
        </g>
      ) : null}

      {state.counter ? (
        <Label x={16} y={HEIGHT - 14} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {/* Click targets last, on top: the two doors and every guest. */}
      {doors ? <PickTarget pick={pick} index={0} x={boxX(0) - gap / 2} y={LINE_Y - 6} width={pitch} height={BOX_H + 12} label="Choose the front door" /> : null}
      {doors
        ? line.map((guest, index) => (
            <PickTarget key={`pick-${guest.key}`} pick={pick} index={index + 1} x={seatX(index) - gap / 2} y={LINE_Y - (index === liftedAt ? LIFT : 0) - 6} width={pitch} height={BOX_H + 12} label={`Choose key ${guest.key}`} />
          ))
        : null}
      {doors ? <PickTarget pick={pick} index={line.length + 1} x={boxX(boxes - 1) - gap / 2} y={LINE_Y - 6} width={pitch} height={BOX_H + 12} label="Choose the back door" /> : null}
    </Frame>
  );
}
