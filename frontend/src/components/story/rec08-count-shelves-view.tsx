import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Shelves numbered by use count (lowest at the bottom). Each shelf holds keys in order of use:
 * the oldest use at the front (left). Draws state only.
 *
 * Click indices: the keys shelf by shelf, bottom shelf first, front to back.
 */

export type ShelfKey = { key: number; val: number; tone: CellTone; note?: string };

export type CountShelvesState = {
  capacity: number;
  /** Bottom shelf first. */
  shelves: { label: string; keys: ShelfKey[] }[];
  /** Which shelf carries the "lowest" marker. */
  lowestShelf: number | null;
  op: string | null;
  returned: string[];
  /** A new key waiting for room. */
  arriving: { key: number; val: number } | null;
  /** A key the trap would wrongly throw out. */
  trapKey: number | null;
  counter: { label: string; value: number } | null;
  note: string | null;
};

const WIDTH = 560;
const HEIGHT = 300;
const TOP = 92;
const BOTTOM = 270;
const KEY_W = 60;
const KEY_H = 32;
const KEY_GAP = 10;
const KEYS_X = 110;

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-700) 28%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 42%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 24%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 30%, transparent)",
  done: "color-mix(in srgb, var(--teal) 46%, transparent)",
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

function KeyBox({ x, y, item, tone }: { x: number; y: number; item: ShelfKey; tone: CellTone }) {
  return (
    <g className={GLIDE} opacity={tone === "faded" ? 0.35 : 1}>
      <rect x={x} y={y} width={KEY_W} height={KEY_H} rx={8} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75} />
      <text x={x + KEY_W / 2} y={y + 15} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        key {item.key}
      </text>
      <text x={x + KEY_W / 2} y={y + 27} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
        value {item.val}
      </text>
      {item.note ? (
        <text x={x + KEY_W / 2} y={y + KEY_H + 12} textAnchor="middle" fontSize={10} fontWeight={600} fill={VIZ_COLORS.muted}>
          {item.note}
        </text>
      ) : null}
    </g>
  );
}

export function CountShelvesView({ state, pick }: { state: CountShelvesState; pick?: CellPick }) {
  const count = Math.max(state.shelves.length, 1);
  const rowH = Math.min(58, (BOTTOM - TOP) / count);
  // Bottom shelf sits lowest; its keys stand on its board.
  const boardY = (shelf: number) => BOTTOM - shelf * rowH;
  const keyX = (slot: number) => KEYS_X + slot * (KEY_W + KEY_GAP);
  const boardEnd = keyX(Math.max(state.capacity, 3)) + 4;
  const targets: { index: number; x: number; y: number; key: number }[] = [];
  let index = 0;
  state.shelves.forEach((shelf, row) => {
    shelf.keys.forEach((item, slot) => {
      targets.push({ index, x: keyX(slot), y: boardY(row) - KEY_H - 4, key: item.key });
      index++;
    });
  });

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Keys on shelves numbered by how often each key was used">
      {state.op ? (
        <Label x={16} y={22} size={13} weight={600} tone="accent">
          call: {state.op}
        </Label>
      ) : null}
      {state.counter ? (
        <Label x={16} y={state.op ? 42 : 22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
        returned: {state.returned.length ? state.returned.join(", ") : "nothing yet"}
      </Label>
      <Label x={WIDTH - 16} y={42} size={12} anchor="end">
        room for {state.capacity}
      </Label>

      {state.arriving ? (
        <g>
          <rect x={WIDTH - 16 - KEY_W} y={52} width={KEY_W} height={KEY_H} rx={8} fill="transparent" stroke={VIZ_COLORS.accent} strokeWidth={1.75} strokeDasharray="4 3" />
          <text x={WIDTH - 16 - KEY_W / 2} y={67} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            key {state.arriving.key}
          </text>
          <text x={WIDTH - 16 - KEY_W / 2} y={79} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
            waiting
          </text>
        </g>
      ) : null}

      {state.shelves.map((shelf, row) => {
        const y = boardY(row);
        const lowest = state.lowestShelf === row;
        return (
          <g key={`shelf-${row}`}>
            <Label x={16} y={y - 12} size={12} weight={600} tone={lowest ? "accent" : "muted"}>
              {shelf.label}
            </Label>
            <line x1={KEYS_X - 8} y1={y} x2={boardEnd} y2={y} stroke={lowest ? VIZ_COLORS.accent : VIZ_COLORS.line} strokeWidth={lowest ? 2.5 : 1.5} strokeLinecap="round" />
            {lowest ? (
              <Label x={boardEnd + 10} y={y - 12} size={12} weight={700} tone="accent">
                ← lowest
              </Label>
            ) : null}
            {shelf.keys.length > 1 && rowH >= 50 ? (
              <Label x={KEYS_X - 8} y={y + 12} size={9}>
                front = oldest use
              </Label>
            ) : null}
          </g>
        );
      })}

      {targets.map((target) => {
        const [row, slot] = locate(state, target.index);
        const item = state.shelves[row].keys[slot];
        return (
          <g key={`key-${target.index}`}>
            <KeyBox x={target.x} y={target.y} item={item} tone={pickTone(pick, target.index, item.tone)} />
            <RejectedMark pick={pick} index={target.index} x={target.x + KEY_W - 8} y={target.y + 12} />
            {state.trapKey === item.key ? (
              <text x={target.x + KEY_W / 2} y={target.y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
                ✕ not this one
              </text>
            ) : null}
          </g>
        );
      })}

      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 6} size={12} weight={600} tone="teal" anchor="middle">
          {state.note}
        </Label>
      ) : null}

      {targets.map((target) => (
        <PickTarget key={`pick-${target.index}`} pick={pick} index={target.index} x={target.x - 3} y={target.y - 3} width={KEY_W + 6} height={KEY_H + 6} label={`Choose key ${target.key}`} />
      ))}
    </Frame>
  );
}

function locate(state: CountShelvesState, index: number): [number, number] {
  let left = index;
  for (let row = 0; row < state.shelves.length; row++) {
    if (left < state.shelves[row].keys.length) return [row, left];
    left -= state.shelves[row].keys.length;
  }
  return [0, 0];
}
