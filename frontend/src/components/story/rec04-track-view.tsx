import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for the runner stories of batch 4 (middle of a list, where a loop starts, happy number):
 * a chain of boxes drawn as a row, and as a round track when the last box points back.
 * Runners (tortoise, hare, friend, walker) stand above their box. Cell `nodes.length` is the
 * `null` box, drawn only when the chain ends at null. Draws state only.
 */

export type TrackRunner = { name: string; at: number; tone: "accent" | "teal" | "coral" | "ink" };

export type TrackState = {
  /** What each box shows: a node's value, or a number in the happy-number chain. */
  nodes: string[];
  /** Index the last box points back to, or -1 when the chain ends. */
  pos: number;
  /** Draw a `null` box after the last node (only when the chain does not loop). */
  nullBox: boolean;
  tones: CellTone[];
  /** `at === nodes.length` is the null box. Several runners on one box stack upwards. */
  runners: TrackRunner[];
  /** Arrows (by the box they leave) used by the last jump. */
  hop?: number[] | null;
  /** Boxes from this index on are not worked out yet, so they are not drawn. */
  shown?: number | null;
  /** Boxes written in the slow way's notebook, by index, in order. `null` hides the row. */
  notebook?: number[] | null;
  /** Notebook entry that matched. */
  notebookHit?: number | null;
  counter?: { label: string; value: number } | null;
  /** Short text at the top right. */
  note?: { text: string; tone: "accent" | "teal" | "coral" | "muted" } | null;
  /** The trap, drawn in coral under the counter. */
  alert?: string | null;
};

const WIDTH = 560;
const HEIGHT = 330;
const SIZE = 40;
const HALF = SIZE / 2;
const CY = 158;
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

const RUNNER_COLOR = { accent: VIZ_COLORS.accent, teal: VIZ_COLORS.teal, coral: VIZ_COLORS.coral, ink: VIZ_COLORS.ink } as const;

type Spot = { x: number; y: number; label: { x: number; y: number; anchor: "start" | "middle" | "end"; up: boolean } };

type Layout = { spots: Spot[]; ring: { cx: number; radius: number; length: number } | null; startX: number };

/** Row for the straight part, round track for the loop. Centred, and scaled so the longest example fits. */
function layout(count: number, pos: number, nullBox: boolean): Layout {
  const looped = pos >= 0 && pos < count;
  if (!looped) {
    const boxes = count + (nullBox ? 1 : 0);
    const gap = Math.min(76, (WIDTH - 110) / Math.max(boxes, 1));
    const total = (boxes - 1) * gap + SIZE;
    const left = 56 + (WIDTH - 56 - 30 - total) / 2 + HALF;
    const spots = Array.from({ length: boxes }, (_, index) => {
      const x = left + index * gap;
      return { x, y: CY, label: { x, y: CY - HALF - 9, anchor: "middle" as const, up: true } };
    });
    return { spots, ring: null, startX: left };
  }
  const length = count - pos;
  const radius = Math.max(46, Math.min(84, 12 * length));
  const gap = pos === 0 ? 0 : Math.min(76, (WIDTH - 56 - 60 - 2 * radius - SIZE) / pos);
  const total = pos * gap + 2 * radius + SIZE;
  const left = 56 + (WIDTH - 56 - 40 - total) / 2 + HALF;
  const cx = left + pos * gap + radius;
  const spots: Spot[] = [];
  for (let index = 0; index < pos; index++) {
    const x = left + index * gap;
    spots.push({ x, y: CY, label: { x, y: CY - HALF - 9, anchor: "middle", up: true } });
  }
  for (let step = 0; step < length; step++) {
    const angle = Math.PI + (2 * Math.PI * step) / length;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = cx + radius * cos;
    const y = CY + radius * sin;
    // The entry box has the track above and below it and the row to its left, so its label sits up and to the left.
    const label =
      step === 0
        ? { x: x - 4, y: y - HALF - 9, anchor: "end" as const, up: true }
        : {
            x: cx + (radius + 34) * cos,
            y: CY + (radius + 34) * sin + 4,
            anchor: cos > 0.35 ? ("start" as const) : cos < -0.35 ? ("end" as const) : ("middle" as const),
            up: sin <= 0,
          };
    spots.push({ x, y, label });
  }
  return { spots, ring: { cx, radius, length }, startX: left };
}

function Arrowheads() {
  return (
    <defs>
      {(["line", "accent"] as const).map((tone) => (
        <marker key={tone} id={`rec04-arrow-${tone}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={VIZ_COLORS[tone]} />
        </marker>
      ))}
    </defs>
  );
}

export function TrackView({ state, pick }: { state: TrackState; pick?: CellPick }) {
  const { nodes, runners } = state;
  const count = nodes.length;
  const looped = state.pos >= 0 && state.pos < count;
  const { spots, ring, startX } = layout(count, state.pos, state.nullBox);
  const hop = state.hop ?? [];
  const shown = state.shown ?? count;
  const notebook = state.notebook ?? null;
  const visible = (index: number) => index < shown;
  const fontSize = (text: string) => (text.length >= 4 ? 12 : 15);

  const edges = nodes.map((_, from) => {
    const target = ring !== null && from === count - 1 ? state.pos : from + 1;
    const hasTarget = target < count || (state.nullBox && !looped);
    if (!hasTarget) return null;
    const tone: "line" | "accent" = hop.includes(from) ? "accent" : "line";
    const opacity = visible(from) && (target >= count || visible(target)) ? 1 : 0;
    const common = { fill: "none", stroke: VIZ_COLORS[tone], strokeWidth: tone === "line" ? 1.75 : 2.75, markerEnd: `url(#rec04-arrow-${tone})`, className: GLIDE, opacity };
    const onRing = ring !== null && from >= state.pos;
    if (!onRing || ring === null) {
      const to = spots[from + 1];
      return <line key={from} x1={spots[from].x + HALF + 2} y1={CY} x2={to.x - HALF - 3} y2={CY} {...common} />;
    }
    const trim = 30 / ring.radius;
    const step = from - state.pos;
    const a0 = Math.PI + (2 * Math.PI * step) / ring.length + trim;
    const a1 = Math.PI + (2 * Math.PI * (step + 1)) / ring.length - trim;
    const point = (angle: number) => `${(ring.cx + ring.radius * Math.cos(angle)).toFixed(1)} ${(CY + ring.radius * Math.sin(angle)).toFixed(1)}`;
    return <path key={from} d={`M${point(a0)} A${ring.radius} ${ring.radius} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${point(a1)}`} {...common} />;
  });

  const nullSpot = state.nullBox && !looped ? spots[count] : null;
  const onNull = runners.some((runner) => runner.at === count);
  const nullTone = pickTone(pick, count, onNull ? "window" : "idle");

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A chain of boxes joined by arrows, with runners on it">
      <Arrowheads />

      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="accent">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.alert ? (
        <Label x={16} y={state.counter ? 42 : 22} size={13} weight={700} tone="coral">
          {state.alert}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone={state.note.tone} anchor="end">
          {state.note.text}
        </Label>
      ) : null}

      <text x={startX - HALF - 34} y={CY + 4} textAnchor="end" fontSize={11} fill={VIZ_COLORS.muted}>
        start
      </text>
      <line x1={startX - HALF - 30} y1={CY} x2={startX - HALF - 4} y2={CY} stroke={VIZ_COLORS.line} strokeWidth={1.75} markerEnd="url(#rec04-arrow-line)" />

      {edges}

      {nodes.map((value, index) => {
        const tone = pickTone(pick, index, state.tones[index] ?? "idle");
        const { x, y } = spots[index];
        return (
          <g key={index} className={GLIDE} opacity={visible(index) ? (tone === "faded" ? 0.4 : 1) : 0}>
            <rect x={x - HALF} y={y - HALF} width={SIZE} height={SIZE} rx={7} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.9} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={fontSize(value)} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
              {value}
            </text>
            <RejectedMark pick={pick} index={index} x={x + HALF - 7} y={y - HALF + 11} />
          </g>
        );
      })}

      {nullSpot ? (
        <g opacity={visible(count - 1) ? 1 : 0}>
          <rect className={GLIDE} x={nullSpot.x - HALF} y={CY - HALF} width={SIZE} height={SIZE} rx={7} fill={FILL[nullTone]} stroke={STROKE[nullTone]} strokeWidth={1.25} strokeDasharray="4 3" />
          <text x={nullSpot.x} y={CY + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.muted} fontFamily={MONO}>
            null
          </text>
          <RejectedMark pick={pick} index={count} x={nullSpot.x + HALF - 7} y={CY - HALF + 11} />
        </g>
      ) : null}

      {runners.map((runner, order) => {
        const spot = spots[Math.min(runner.at, spots.length - 1)];
        const level = runners.slice(0, order).filter((other) => other.at === runner.at).length;
        const dy = (spot.label.up ? -14 : 14) * level;
        return (
          <g key={runner.name} className={GLIDE} style={{ transform: `translate(${spot.label.x}px, ${spot.label.y + dy}px)` }}>
            <text textAnchor={spot.label.anchor} fontSize={12} fontWeight={700} fill={RUNNER_COLOR[runner.tone]}>
              {runner.name}
            </text>
          </g>
        );
      })}

      {notebook ? (
        <g>
          <Label x={16} y={HEIGHT - 14} size={12} weight={600}>
            notebook
          </Label>
          {notebook.length === 0 ? (
            <Label x={92} y={HEIGHT - 14} size={12}>
              (empty)
            </Label>
          ) : null}
          {notebook.map((node, index) => {
            const hit = state.notebookHit === index;
            return (
              <g key={index}>
                <rect x={88 + index * 46} y={HEIGHT - 33} width={42} height={26} rx={6} fill={hit ? FILL.done : "transparent"} stroke={hit ? VIZ_COLORS.teal : VIZ_COLORS.line} strokeWidth={hit ? 1.75 : 1} />
                <text x={109 + index * 46} y={HEIGHT - 15} textAnchor="middle" fontSize={nodes[node].length >= 4 ? 11 : 13} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                  {nodes[node]}
                </text>
              </g>
            );
          })}
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point at a box. */}
      {spots.map((spot, index) =>
        index < count && !visible(index) ? null : (
          <PickTarget key={`pick-${index}`} pick={pick} index={index} x={spot.x - HALF - 5} y={spot.y - HALF - 5} width={SIZE + 10} height={SIZE + 10} label={index === count ? "Choose null" : `Choose the box ${nodes[index]}`} />
        ),
      )}
    </Frame>
  );
}
