import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Two trains, one above the other: the original cars and their copies.
 * Forward couplings stay on the row. Side couplings (random) are arcs.
 * Every box is clickable, including both null ends. Draws state only.
 */

export type RandomCar = { label: string; kind: "car" | "null" | "empty" };

export type RandomPointer = { name: string; row: "orig" | "copy"; at: number; tone: "accent" | "teal" | "ink" };

export type RandomListState = {
  originals: RandomCar[];
  copies: RandomCar[];
  origNext: (number | null)[];
  origRandom: (number | null)[];
  copyNext: (number | null)[];
  copyRandom: (number | null)[];
  origTones: CellTone[];
  copyTones: CellTone[];
  notebook: { orig: string; copy: string }[] | null;
  pointers: RandomPointer[];
  /** Original whose side coupling is being wired too soon. */
  trapSide?: number | null;
  counter?: { label: string; value: number } | null;
  note?: string | null;
};

const WIDTH = 560;
const HEIGHT = 268;
const ORIG_Y = 108;
const COPY_Y = 200;
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
      {(["line", "accent", "coral", "teal"] as const).map((tone) => (
        <marker key={tone} id={`rand-arrow-${tone}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={VIZ_COLORS[tone]} />
        </marker>
      ))}
    </defs>
  );
}

export function GrokRandomListView({ state, pick }: { state: RandomListState; pick?: CellPick }) {
  const { originals, copies } = state;
  const n = originals.length;
  const m = copies.length;
  const count = Math.max(n, m, 1);
  const spacing = Math.min(76, (WIDTH - 48) / count);
  const size = spacing >= 64 ? 36 : Math.max(26, spacing - 24);
  const half = size / 2;
  const start = (WIDTH - (count - 1) * spacing) / 2;
  const xAt = (index: number) => start + index * spacing;
  const origPick = (index: number) => index;
  const copyPick = (index: number) => n + index;

  const nextLine = (x1: number, x2: number, y: number, tone: "line" | "accent" | "teal") => {
    const dir = Math.sign(x2 - x1) || 1;
    return <line x1={x1 + dir * (half + 2)} y1={y} x2={x2 - dir * (half + 3)} y2={y} stroke={VIZ_COLORS[tone]} strokeWidth={1.75} markerEnd={`url(#rand-arrow-${tone})`} />;
  };

  const sideArc = (from: number, to: number, y: number, above: boolean, tone: "accent" | "coral" | "teal" | "line") => {
    const x1 = xAt(from);
    const x2 = xAt(to);
    if (from === to) {
      const lift = above ? y - half - 22 : y + half + 22;
      return <path d={`M${x1 - 8} ${above ? y - half : y + half} Q${x1} ${lift} ${x1 + 8} ${above ? y - half : y + half}`} fill="none" stroke={VIZ_COLORS[tone]} strokeWidth={1.75} markerEnd={`url(#rand-arrow-${tone})`} />;
    }
    const lift = above ? y - half - Math.min(36, 18 + 10 * Math.abs(from - to)) : y + half + Math.min(28, 14 + 8 * Math.abs(from - to));
    return <path d={`M${x1} ${above ? y - half - 1 : y + half + 1} Q${(x1 + x2) / 2} ${lift} ${x2} ${above ? y - half - 1 : y + half + 1}`} fill="none" stroke={VIZ_COLORS[tone]} strokeWidth={1.9} markerEnd={`url(#rand-arrow-${tone})`} />;
  };

  const box = (item: RandomCar, index: number, y: number, tone: CellTone, pickIndex: number) => {
    const shown = pickTone(pick, pickIndex, tone);
    const car = item.kind === "car";
    const empty = item.kind === "empty";
    return (
      <g key={`box-${pickIndex}`} className={GLIDE} style={{ transform: `translate(${xAt(index)}px, ${y}px)`, opacity: shown === "faded" || empty ? 0.4 : 1 }}>
        <rect x={-half} y={-half} width={size} height={size} rx={8} fill={FILL[shown]} stroke={STROKE[shown]} strokeWidth={shown === "idle" || shown === "faded" ? 1.25 : 1.9} strokeDasharray={car ? undefined : "4 3"} />
        <text x={0} y={car ? 5 : 4} textAnchor="middle" fontSize={car ? 15 : 10} fontWeight={600} fill={car ? VIZ_COLORS.ink : VIZ_COLORS.muted} fontFamily={MONO}>
          {item.label}
        </text>
        <RejectedMark pick={pick} index={pickIndex} x={half - 8} y={-half + 12} />
      </g>
    );
  };

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Original train and copy train, with side couplings">
      <Arrowheads />

      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone="teal" anchor="end">
          {state.note}
        </Label>
      ) : null}

      {state.notebook ? (
        <g>
          <Label x={16} y={38} size={11} weight={600} tone="ink">
            notebook
          </Label>
          {state.notebook.map((entry, index) => (
            <text key={`nb-${index}`} x={88 + index * 92} y={38} fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
              {entry.orig} → {entry.copy}
            </text>
          ))}
        </g>
      ) : null}

      <Label x={16} y={ORIG_Y - 28} size={11} weight={600} tone="muted">
        original
      </Label>
      <Label x={16} y={COPY_Y - 28} size={11} weight={600} tone="muted">
        copy
      </Label>

      {originals.map((_, index) => {
        const target = state.origNext[index];
        if (target === null || target === undefined) return null;
        return <g key={`on-${index}`}>{nextLine(xAt(index), xAt(target), ORIG_Y, "line")}</g>;
      })}
      {copies.map((item, index) => {
        const target = state.copyNext[index];
        if (item.kind === "empty" || target === null || target === undefined) return null;
        return <g key={`cn-${index}`}>{nextLine(xAt(index), xAt(target), COPY_Y, "teal")}</g>;
      })}

      {originals.map((_, index) => {
        const target = state.origRandom[index];
        if (target === null || target === undefined) return null;
        const trap = state.trapSide === index;
        return <g key={`or-${index}`}>{sideArc(index, target, ORIG_Y, true, trap ? "coral" : "accent")}</g>;
      })}
      {copies.map((item, index) => {
        const target = state.copyRandom[index];
        if (item.kind === "empty" || target === null || target === undefined) return null;
        return <g key={`cr-${index}`}>{sideArc(index, target, COPY_Y, false, "teal")}</g>;
      })}
      {state.trapSide !== null && state.trapSide !== undefined && copies[state.trapSide]?.kind !== "empty" && state.copyRandom[state.trapSide] === null ? (
        <g>
          <line x1={xAt(state.trapSide)} y1={COPY_Y + half + 2} x2={xAt(state.trapSide) + 36} y2={COPY_Y + half + 22} stroke={VIZ_COLORS.coral} strokeWidth={1.9} markerEnd="url(#rand-arrow-coral)" />
          <text x={xAt(state.trapSide) + 48} y={COPY_Y + half + 26} fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ no copy yet
          </text>
        </g>
      ) : null}

      {originals.map((item, index) => box(item, index, ORIG_Y, state.origTones[index] ?? "idle", origPick(index)))}
      {copies.map((item, index) => box(item, index, COPY_Y, state.copyTones[index] ?? "idle", copyPick(index)))}

      {state.pointers.map((pointer, order) => {
        const y = pointer.row === "orig" ? ORIG_Y : COPY_Y;
        const x = xAt(pointer.at);
        const level = state.pointers.slice(0, order).filter((other) => other.row === pointer.row && other.at === pointer.at).length;
        const color = POINTER_COLOR[pointer.tone];
        return (
          <g key={`${pointer.row}-${pointer.name}`} className={GLIDE} style={{ transform: `translate(${x}px, ${y + half + 20 + level * 14}px)` }}>
            {level === 0 ? <path d="M0 -16 L-5 -8 L5 -8 Z" fill={color} /> : null}
            <text x={0} y={0} textAnchor="middle" fontSize={11} fontWeight={700} fill={color} fontFamily={MONO}>
              {pointer.name}
            </text>
          </g>
        );
      })}

      {originals.map((item, index) => (
        <PickTarget
          key={`po-${index}`}
          pick={pick}
          index={origPick(index)}
          x={xAt(index) - half - 5}
          y={ORIG_Y - half - 5}
          width={size + 10}
          height={size + 10}
          label={item.kind === "car" ? `Choose the original car ${item.label}` : "Choose the original null"}
        />
      ))}
      {copies.map((item, index) => (
        <PickTarget
          key={`pc-${index}`}
          pick={pick}
          index={copyPick(index)}
          x={xAt(index) - half - 5}
          y={COPY_Y - half - 5}
          width={size + 10}
          height={size + 10}
          label={item.kind === "car" ? `Choose the copy of car ${item.label}` : item.kind === "empty" ? "Choose the empty copy slot" : "Choose the copy null"}
        />
      ))}
    </Frame>
  );
}
