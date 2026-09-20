import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for the linked-list cycle story: the straight part of the list is a row,
 * the loop is a round track. Cell `nodes.length` is the `null` box (only drawn when the list ends).
 */

export type LinkedListCycleState = {
  nodes: number[];
  /** Index the last node points back to, or -1 when the list ends at null. */
  pos: number;
  /** The tortoise. */
  slow: number | null;
  /** The hare. `nodes.length` means it stands on the null box. */
  fast: number | null;
  /** The slow way's walker. `nodes.length` means it reached null. */
  walker?: number | null;
  /** Nodes written in the slow way's notebook, in order. `null` hides the row. */
  notebook?: number[] | null;
  /** Notebook entry that matched the walker's node. */
  notebookHit?: number | null;
  /** Arrows (by the node they leave) the hare used in its last jump. */
  hop?: number[] | null;
  /** Picture scene: tint the arrow that closes the loop. */
  loopMark?: boolean;
  /** Result of comparing the two runners. */
  verdict?: "same" | "apart" | null;
  /** How many arrows the hare is behind the tortoise on the loop. */
  gap?: number | null;
  /** The trap: a jump that would start from this cell and leave the list. */
  voidFrom?: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 292;
const SIZE = 38;
const HALF = SIZE / 2;
const CY = 140;
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

type Spot = { x: number; y: number; label: { x: number; y: number; anchor: "start" | "middle" | "end" } };

type Layout = { spots: Spot[]; ring: { cx: number; radius: number; length: number } | null; startX: number };

/** Row for the straight part, round track for the loop. Everything is centred and scaled to fit the width. */
function layout(count: number, pos: number): Layout {
  const looped = pos >= 0 && pos < count;
  if (!looped) {
    const boxes = count + 1;
    const gap = Math.min(74, (WIDTH - 190) / boxes);
    const total = (boxes - 1) * gap + SIZE;
    const left = 56 + (WIDTH - 56 - 96 - total) / 2 + HALF;
    const spots = Array.from({ length: boxes }, (_, index) => {
      const x = left + index * gap;
      return { x, y: CY, label: { x, y: CY - HALF - 9, anchor: "middle" as const } };
    });
    return { spots, ring: null, startX: left };
  }
  const length = count - pos;
  const radius = Math.max(45, Math.min(75, 22 * length));
  const gap = pos === 0 ? 0 : Math.min(74, (WIDTH - 56 - 120 - 2 * radius - SIZE) / pos);
  const total = pos * gap + 2 * radius + SIZE;
  const left = 56 + (WIDTH - 56 - 110 - total) / 2 + HALF;
  const cx = left + pos * gap + radius;
  const spots: Spot[] = [];
  for (let index = 0; index < pos; index++) {
    const x = left + index * gap;
    spots.push({ x, y: CY, label: { x, y: CY - HALF - 9, anchor: "middle" } });
  }
  for (let step = 0; step < length; step++) {
    const angle = Math.PI + (2 * Math.PI * step) / length;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = cx + radius * cos;
    const y = CY + radius * sin;
    // The entry node has the track above and below it and the row to its left, so its label sits up and to the left.
    const label =
      step === 0
        ? { x: x - 6, y: y - HALF - 9, anchor: "end" as const }
        : { x: cx + (radius + 36) * cos, y: CY + (radius + 36) * sin + 4, anchor: cos > 0.35 ? ("start" as const) : cos < -0.35 ? ("end" as const) : ("middle" as const) };
    spots.push({ x, y, label });
  }
  return { spots, ring: { cx, radius, length }, startX: left };
}

function Arrowheads() {
  return (
    <defs>
      {(["line", "accent", "coral"] as const).map((tone) => (
        <marker key={tone} id={`cycle-arrow-${tone}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={VIZ_COLORS[tone]} />
        </marker>
      ))}
    </defs>
  );
}

function Runner({ spot, text, color, hidden }: { spot: Spot; text: string; color: string; hidden: boolean }) {
  return (
    <g className={GLIDE} style={{ transform: `translate(${spot.label.x}px, ${spot.label.y}px)`, opacity: hidden ? 0 : 1 }}>
      <text textAnchor={spot.label.anchor} fontSize={12} fontWeight={700} fill={color}>
        {text}
      </text>
    </g>
  );
}

export function LinkedListCycleView({ state, pick }: { state: LinkedListCycleState; pick?: CellPick }) {
  const { nodes, slow, fast } = state;
  const count = nodes.length;
  const looped = state.pos >= 0 && state.pos < count;
  const { spots, ring, startX } = layout(count, state.pos);
  const walker = state.walker ?? null;
  const met = state.verdict === "same";
  const hop = state.hop ?? [];
  const notebook = state.notebook ?? null;
  const together = slow !== null && slow === fast;

  const toneOf = (index: number): CellTone => {
    if (met && index === slow) return "done";
    if (walker === index) return state.notebookHit !== null && state.notebookHit !== undefined ? "done" : "edge";
    if (index === slow) return "edge";
    if (index === fast) return "window";
    if (notebook?.includes(index)) return "window";
    return "idle";
  };

  const edgeTone = (from: number): "line" | "accent" => (hop.includes(from) || (state.loopMark && looped && from === count - 1) ? "accent" : "line");

  const edges = nodes.map((_, from) => {
    const tone = edgeTone(from);
    const common = { fill: "none", stroke: VIZ_COLORS[tone], strokeWidth: tone === "line" ? 1.75 : 2.75, markerEnd: `url(#cycle-arrow-${tone})`, className: GLIDE };
    const onRing = ring !== null && from >= state.pos;
    if (!onRing || ring === null) {
      // Straight part: the next box is always directly to the right.
      const to = spots[from + 1];
      return <line key={from} x1={spots[from].x + HALF + 2} y1={CY} x2={to.x - HALF - 3} y2={CY} {...common} />;
    }
    const trim = 29 / ring.radius;
    const step = from - state.pos;
    const a0 = Math.PI + (2 * Math.PI * step) / ring.length + trim;
    const a1 = Math.PI + (2 * Math.PI * (step + 1)) / ring.length - trim;
    const point = (angle: number) => `${(ring.cx + ring.radius * Math.cos(angle)).toFixed(1)} ${(CY + ring.radius * Math.sin(angle)).toFixed(1)}`;
    return <path key={from} d={`M${point(a0)} A${ring.radius} ${ring.radius} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${point(a1)}`} {...common} />;
  });

  const voidFrom = state.voidFrom ?? null;
  const nullSpot = looped ? null : spots[count];
  const nullTone = pickTone(pick, count, fast === count || walker === count ? "window" : "idle");

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A linked list drawn as a track, with a tortoise and a hare on it">
      <Arrowheads />

      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.verdict ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone={met ? "teal" : "muted"} anchor="end">
          {met ? "same node" : "not the same node"}
        </Label>
      ) : state.gap !== null && state.gap !== undefined ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="accent" anchor="end">
          hare is {state.gap} behind
        </Label>
      ) : null}

      <text x={startX - HALF - 34} y={CY + 4} textAnchor="end" fontSize={11} fill={VIZ_COLORS.muted}>
        start
      </text>
      <line x1={startX - HALF - 30} y1={CY} x2={startX - HALF - 4} y2={CY} stroke={VIZ_COLORS.line} strokeWidth={1.75} markerEnd="url(#cycle-arrow-line)" />

      {edges}

      {nodes.map((value, index) => {
        const tone = pickTone(pick, index, toneOf(index));
        const { x, y } = spots[index];
        return (
          <g key={index}>
            <rect className={GLIDE} x={x - HALF} y={y - HALF} width={SIZE} height={SIZE} rx={7} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" ? 1 : 1.75} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
              {value}
            </text>
            <RejectedMark pick={pick} index={index} x={x + HALF - 8} y={y - HALF + 12} />
          </g>
        );
      })}

      {nullSpot ? (
        <g>
          <rect className={GLIDE} x={nullSpot.x - HALF} y={CY - HALF} width={SIZE} height={SIZE} rx={7} fill={FILL[nullTone]} stroke={STROKE[nullTone]} strokeWidth={1.25} strokeDasharray="4 3" />
          <text x={nullSpot.x} y={CY + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={VIZ_COLORS.muted} fontFamily={MONO}>
            null
          </text>
          <RejectedMark pick={pick} index={count} x={nullSpot.x + HALF - 8} y={CY - HALF + 12} />
        </g>
      ) : null}

      {/* The trap: a jump that would leave from here lands on nothing. Drawn under the row, clear of the runner labels above it. */}
      {nullSpot && voidFrom !== null ? (
        <g>
          <path
            d={`M${spots[voidFrom].x} ${CY + HALF + 3} Q${(spots[voidFrom].x + nullSpot.x + HALF + 44) / 2} ${CY + 84} ${nullSpot.x + HALF + 44} ${CY + 12}`}
            fill="none"
            stroke={VIZ_COLORS.coral}
            strokeWidth={2.25}
            strokeDasharray="5 4"
            markerEnd="url(#cycle-arrow-coral)"
          />
          <text x={nullSpot.x + HALF + 44} y={CY - 2} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ crash
          </text>
          <text x={nullSpot.x + HALF + 44} y={CY + 72} textAnchor="middle" fontSize={11} fontWeight={600} fill={VIZ_COLORS.coral}>
            nothing after null
          </text>
        </g>
      ) : null}

      <Runner spot={spots[walker ?? 0]} text="walker" color={VIZ_COLORS.accent} hidden={walker === null} />
      <Runner spot={spots[slow ?? 0]} text={together ? "tortoise + hare" : "tortoise"} color={met ? VIZ_COLORS.teal : VIZ_COLORS.accent} hidden={slow === null} />
      <Runner spot={spots[fast ?? 0]} text="hare" color={VIZ_COLORS.accent} hidden={fast === null || together} />

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
                <rect x={92 + index * 44} y={HEIGHT - 32} width={38} height={26} rx={6} fill={hit ? FILL.done : "transparent"} stroke={hit ? VIZ_COLORS.teal : VIZ_COLORS.line} strokeWidth={hit ? 1.75 : 1} />
                <text x={111 + index * 44} y={HEIGHT - 14} textAnchor="middle" fontSize={13} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                  {nodes[node]}
                </text>
              </g>
            );
          })}
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point at a box. */}
      {spots.map((spot, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={spot.x - HALF - 5} y={spot.y - HALF - 5} width={SIZE + 10} height={SIZE + 10} label={index === count ? "Choose null" : `Choose the node ${nodes[index]}`} />
      ))}
    </Frame>
  );
}
