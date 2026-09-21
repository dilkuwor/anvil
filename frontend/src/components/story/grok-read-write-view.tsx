import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A number row with a read finger and a write slot. Optional second row for a merge. Draws state only. */

export type ReadWriteExtra = {
  label: string;
  nums: number[];
  tones: CellTone[];
  cursor: number | null;
  cursorLabel?: string;
};

export type ReadWriteState = {
  nums: number[];
  tones: CellTone[];
  read: number | null;
  write: number | null;
  readLabel?: string;
  writeLabel?: string;
  /** A wrong slot (overwritten neighbour, front write, last non-zero). */
  ghost?: number | null;
  ghostNote?: string;
  note?: string | null;
  counter?: { label: string; value: number } | null;
  extra?: ReadWriteExtra | null;
};

const WIDTH = 560;
const GAP = 8;
const MAIN_Y = 72;
const EXTRA_Y = 188;
const JAW = 12;

function layout(count: number) {
  const n = Math.max(count, 1);
  const size = Math.min(44, (WIDTH - 56) / n - GAP);
  const startX = (WIDTH - (n * (size + GAP) - GAP)) / 2;
  return { size, startX, cellX: (index: number) => startX + index * (size + GAP), centerX: (index: number) => startX + index * (size + GAP) + size / 2 };
}

function Marker({ x, y, label, color, flip, hidden }: { x: number; y: number; label: string; color: string; flip?: boolean; hidden?: boolean }) {
  const path = flip ? `M0 0 L-6 ${JAW} L6 ${JAW} Z` : "M0 0 L-6 -9 L6 -9 Z";
  const textY = flip ? JAW + 16 : -14;
  return (
    <g className={GLIDE} style={{ transform: `translate(${x}px, ${y}px)`, opacity: hidden ? 0 : 1 }}>
      <path d={path} fill={color} />
      <text x={0} y={textY} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {label}
      </text>
    </g>
  );
}

export function GrokReadWriteView({ state, pick }: { state: ReadWriteState; pick?: CellPick }) {
  const extra = state.extra ?? null;
  const main = layout(state.nums.length);
  const second = extra ? layout(extra.nums.length) : null;
  const height = extra ? 286 : 200;
  const same = state.read !== null && state.read === state.write;
  const readLabel = state.readLabel ?? "read";
  const writeLabel = state.writeLabel ?? "write";

  return (
    <Frame width={WIDTH} height={height} label="A number row with a read finger and a write slot">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={state.counter ? WIDTH - 16 : 16} y={22} size={13} weight={700} tone="coral" anchor={state.counter ? "end" : "start"}>
          {state.note}
        </Label>
      ) : null}

      {state.nums.map((value, index) => (
        <g key={`m-${index}`}>
          <Cell
            x={main.cellX(index)}
            y={MAIN_Y}
            size={main.size}
            value={value}
            tone={pickTone(pick, index, index === state.ghost ? "miss" : (state.tones[index] ?? "idle"))}
            caption={String(index)}
          />
          <RejectedMark pick={pick} index={index} x={main.cellX(index) + main.size - 8} y={MAIN_Y + 12} />
        </g>
      ))}

      <Marker
        x={state.read !== null ? main.centerX(state.read) : main.startX}
        y={MAIN_Y - 4}
        label={same ? `${readLabel} = ${writeLabel}` : readLabel}
        color={VIZ_COLORS.accent}
        hidden={state.read === null}
      />
      <Marker
        x={state.write !== null ? main.centerX(state.write) : main.startX}
        y={MAIN_Y + main.size + 4}
        label={writeLabel}
        color={VIZ_COLORS.teal}
        flip
        hidden={state.write === null || same}
      />

      {state.ghost !== null && state.ghost !== undefined && state.ghostNote ? (
        <text x={Math.min(WIDTH - 80, Math.max(80, main.centerX(state.ghost)))} y={MAIN_Y - 28} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
          {state.ghostNote}
        </text>
      ) : null}

      {extra && second ? (
        <g>
          <Label x={16} y={EXTRA_Y - 10} size={12} weight={600}>
            {extra.label}
          </Label>
          {extra.nums.map((value, index) => {
            const pickIndex = state.nums.length + index;
            return (
              <g key={`e-${index}`}>
                <Cell
                  x={second.cellX(index)}
                  y={EXTRA_Y}
                  size={second.size}
                  value={value}
                  tone={pickTone(pick, pickIndex, extra.tones[index] ?? "idle")}
                  caption={String(index)}
                />
                <RejectedMark pick={pick} index={pickIndex} x={second.cellX(index) + second.size - 8} y={EXTRA_Y + 12} />
              </g>
            );
          })}
          <Marker
            x={extra.cursor !== null ? second.centerX(extra.cursor) : second.startX}
            y={EXTRA_Y - 4}
            label={extra.cursorLabel ?? "j"}
            color={VIZ_COLORS.accent}
            hidden={extra.cursor === null}
          />
        </g>
      ) : null}

      {state.nums.map((value, index) => (
        <PickTarget
          key={`pick-m-${index}`}
          pick={pick}
          index={index}
          x={main.cellX(index) - GAP / 2}
          y={MAIN_Y - 4}
          width={main.size + GAP}
          height={main.size + 8}
          label={`Choose the box holding ${value}, number ${index} from the left`}
        />
      ))}
      {extra && second
        ? extra.nums.map((value, index) => (
            <PickTarget
              key={`pick-e-${index}`}
              pick={pick}
              index={state.nums.length + index}
              x={second.cellX(index) - GAP / 2}
              y={EXTRA_Y - 4}
              width={second.size + GAP}
              height={second.size + 8}
              label={`Choose the box holding ${value} in ${extra.label}`}
            />
          ))
        : null}
    </Frame>
  );
}
