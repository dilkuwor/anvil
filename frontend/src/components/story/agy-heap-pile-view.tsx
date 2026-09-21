import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Shared picture for the heap family: "the sorting pile".
 * A pile is drawn as a small tree whose top seat is marked; you only ever look at the top.
 * Under it: rows of boxes (the input, a result list). Beside it: what is in your hand, a small grid, or a time axis.
 * With two piles they lie on their sides and face each other, tops in the middle. Draws state only.
 */

export type PileItem = { id: string; label: string; sub?: string; tone: CellTone; /** An empty seat that keeps its place (the top just left). */ empty?: boolean };

export type Pile = {
  title: string;
  /** In the pile's own order: index 0 is the top, the children of i are 2i+1 and 2i+2. */
  items: PileItem[];
  /** When the pile may keep only k items, its k seats are drawn even while empty. */
  seats?: number;
  lit?: boolean;
  /** Keeps the pile's place in the layout without drawing it (before the story has introduced it). */
  hidden?: boolean;
};

export type PileRow = { title: string; cells: { label: string; sub?: string; tone: CellTone }[]; wide?: boolean; emptyText?: string };

export type PilePanel =
  | { kind: "hand"; title: string; items: PileItem[]; note?: string; noteTone?: "coral" | "teal" | "muted" }
  | { kind: "grid"; reach: number; points: { x: number; y: number; tone: CellTone; label?: string }[]; ray?: { to: number; label: string; tone: "coral" | "accent" } | null }
  | { kind: "axis"; max: number; bars: { id: string; start: number; end: number; lane: number | "next" | null; tone: CellTone }[]; lanes: number };

/** What the reader may click while a question is open. The quiz cell number is the index in `picks`. */
export type PickRef = { at: "pile"; pile: number; index: number } | { at: "row"; row: number; index: number } | { at: "nothing" };

export type HeapPileState = {
  piles: Pile[];
  /** Tree levels to leave room for, fixed for a whole story so nothing jumps. 1 to 3. */
  levels: number;
  rows: PileRow[];
  panel: PilePanel | null;
  /** A short label under the pile: the trap's mark, or what just happened. */
  note?: { text: string; tone: "coral" | "teal" | "muted" } | null;
  /** Two piles only: the value that sits between the two tops. */
  middle?: { label: string; tone: "coral" | "teal" | "accent" } | null;
  counter?: { label: string; value: number } | null;
  picks?: PickRef[];
};

/** A real binary heap, so the pile in the picture is the pile the algorithm used. `before(a, b)` is true when a must sit above b. */
export class PileHeap<T> {
  items: T[] = [];
  private readonly before: (a: T, b: T) => boolean;
  constructor(before: (a: T, b: T) => boolean) {
    this.before = before;
  }
  get size() {
    return this.items.length;
  }
  peek(): T | undefined {
    return this.items[0];
  }
  add(item: T) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.before(a[i], a[parent])) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }
  poll(): T | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop() as T;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/** Levels needed for a pile of `count` items, capped at what the picture can hold. */
export function pileLevels(count: number): number {
  return Math.min(3, Math.max(1, Math.floor(Math.log2(Math.max(count, 1))) + 1));
}

const WIDTH = 560;
const ROOT_Y = 56;
const LEVEL_GAP = 48;
const R = 17;
const ROW_X = 104;
const ROW_PITCH = 46;
const PANEL_X = 330;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-700) 30%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 22%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 30%, transparent)",
  done: "color-mix(in srgb, var(--teal) 48%, transparent)",
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

const toneColor = (tone: "coral" | "teal" | "muted" | "accent") => (tone === "coral" ? VIZ_COLORS.coral : tone === "teal" ? VIZ_COLORS.teal : tone === "accent" ? VIZ_COLORS.accent : VIZ_COLORS.muted);

/** Where seat `index` of a pile sits. `level` 0 is the top. */
function seatPlace(index: number) {
  const level = Math.floor(Math.log2(index + 1));
  const across = 2 ** level;
  return { level, frac: (index + 1 - across + 0.5) / across - 0.5 };
}

export function HeapPileView({ state, pick }: { state: HeapPileState; pick?: CellPick }) {
  const { piles, rows, panel } = state;
  const two = piles.length === 2;
  const picks = state.picks ?? [];
  const pickOf = (ref: PickRef) =>
    picks.findIndex((other) => other.at === ref.at && (ref.at === "nothing" || (other.at === "pile" && ref.at === "pile" && other.pile === ref.pile && other.index === ref.index) || (other.at === "row" && ref.at === "row" && other.row === ref.row && other.index === ref.index)));
  const toned = (ref: PickRef, tone: CellTone) => {
    const index = pickOf(ref);
    return index < 0 ? tone : pickTone(pick, index, tone);
  };

  // Two piles lie on their sides, tops facing each other across the middle line.
  const r = two ? 15 : R;
  const sideY = 138;
  const cx = panel ? 150 : WIDTH / 2;
  const place = (pileIndex: number, index: number) => {
    const { level, frac } = seatPlace(index);
    if (!two) return { x: cx + frac * 184, y: ROOT_Y + level * LEVEL_GAP };
    const dir = pileIndex === 0 ? -1 : 1;
    return { x: WIDTH / 2 + dir * (44 + level * 52), y: sideY + frac * 152 };
  };
  // The side picture may be taller than a short pile: the rows start under whichever is taller.
  const sideBottom = panel?.kind === "grid" ? 184 : panel?.kind === "axis" ? 62 + Math.max(panel.lanes, 1) * 26 + 18 : 0;
  const pileBottom = ROOT_Y + (state.levels - 1) * LEVEL_GAP + R + 16;
  const treeBottom = two ? 214 : Math.max(pileBottom, sideBottom);
  const noteY = treeBottom + 14;
  const rowsY = noteY + 12;
  const height = rowsY + rows.length * ROW_PITCH + 4;
  const panelBottom = rowsY - 10;
  const cellW = (row: PileRow) => (row.wide ? 54 : 34);
  const cellX = (row: PileRow, index: number) => ROW_X + index * (cellW(row) + 6);
  const rowY = (index: number) => rowsY + index * ROW_PITCH;

  const nothingIndex = pickOf({ at: "nothing" });
  const nothingBox = { x: PANEL_X + 116, y: 58, w: 90, h: 34 };

  return (
    <Frame width={WIDTH} height={height} label="A sorting pile drawn as a small tree with its top marked, above rows of boxes">
      {state.counter ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone="coral" anchor="end">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {piles.map((pile, pileIndex) => {
        if (pile.hidden) return null;
        const slots = Math.max(pile.items.length, pile.seats ?? 0);
        const top = place(pileIndex, 0);
        const titleX = two ? (pileIndex === 0 ? 140 : 420) : cx;
        return (
          <g key={pileIndex}>
            {!two ? (
              <rect x={cx - 112} y={30} width={224} height={pileBottom - 30} rx={14} fill={pile.lit ? "color-mix(in srgb, var(--teal) 10%, transparent)" : "color-mix(in srgb, var(--steel-900) 45%, transparent)"} stroke={pile.lit ? VIZ_COLORS.teal : VIZ_COLORS.line} strokeWidth={pile.lit ? 1.75 : 1} />
            ) : (
              <rect x={pileIndex === 0 ? 16 : WIDTH / 2 + 22} y={62} width={WIDTH / 2 - 38} height={152} rx={14} fill={pile.lit ? "color-mix(in srgb, var(--teal) 10%, transparent)" : "color-mix(in srgb, var(--steel-900) 45%, transparent)"} stroke={pile.lit ? VIZ_COLORS.teal : VIZ_COLORS.line} strokeWidth={pile.lit ? 1.75 : 1} />
            )}
            <text x={titleX} y={two ? 54 : 21} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.ink}>
              {pile.title}
            </text>
            {/* The links of the little tree, behind the items. */}
            {Array.from({ length: slots }, (_, index) => index)
              .filter((index) => index > 0)
              .map((index) => {
                const from = place(pileIndex, (index - 1) >> 1);
                const to = place(pileIndex, index);
                return <line key={`edge-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={VIZ_COLORS.line} strokeWidth={1.25} strokeOpacity={index < pile.items.length ? 0.9 : 0.35} />;
              })}
            {/* Seats: the pile may keep only this many. */}
            {Array.from({ length: pile.seats ?? 0 }, (_, index) => {
              const at = place(pileIndex, index);
              return <circle key={`seat-${index}`} cx={at.x} cy={at.y} r={r + 4} fill="none" stroke={VIZ_COLORS.muted} strokeWidth={1.25} strokeDasharray="4 4" />;
            })}
            {/* The top seat is always marked: it is the only one you look at. */}
            {two ? (
              <text x={top.x} y={top.y - r - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
                top
              </text>
            ) : (
              <g>
                <text x={cx - R - 16} y={ROOT_Y + 4} textAnchor="end" fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.accent}>
                  top
                </text>
                <path d={`M${cx - R - 12} ${ROOT_Y - 5} l7 5 l-7 5 Z`} fill={VIZ_COLORS.accent} />
              </g>
            )}
            {pile.items.length === 0 && !(pile.seats && pile.seats > 0) ? (
              <text x={top.x + (two ? (pileIndex === 0 ? -60 : 60) : 0)} y={top.y + 4} textAnchor="middle" fontSize={12} fill={VIZ_COLORS.muted}>
                (empty)
              </text>
            ) : null}
            {pile.items.map((item, index) => {
              const at = place(pileIndex, index);
              const tone = toned({ at: "pile", pile: pileIndex, index }, item.tone);
              return (
                <g key={item.id} className={GLIDE} style={{ transform: `translate(${at.x}px, ${at.y}px)` }} opacity={tone === "faded" ? 0.4 : 1}>
                  {item.empty ? (
                    <circle r={r} fill="transparent" stroke={VIZ_COLORS.accent} strokeWidth={1.5} strokeDasharray="4 4" />
                  ) : (
                    <circle r={r} fill={FILL[tone]} stroke={index === 0 && tone === "idle" ? VIZ_COLORS.accent : STROKE[tone]} strokeWidth={tone === "idle" && index !== 0 ? 1.25 : 2} />
                  )}
                  <text y={4.5} textAnchor="middle" fontSize={item.label.length > 3 ? 10.5 : 13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                    {item.empty ? "" : item.label}
                  </text>
                  {item.sub && !item.empty ? (
                    <text y={r + 11} textAnchor="middle" fontSize={9.5} fill={VIZ_COLORS.muted}>
                      {item.sub}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {pile.items.map((item, index) => {
              const at = place(pileIndex, index);
              return <RejectedMark key={`no-${item.id}`} pick={pick} index={pickOf({ at: "pile", pile: pileIndex, index })} x={at.x + r - 2} y={at.y - r + 6} />;
            })}
          </g>
        );
      })}

      {/* Between two facing piles: the middle line, or the value that sits on it. */}
      {two && !piles.every((pile) => pile.hidden) ? (
        state.middle ? (
          <g>
            <text x={WIDTH / 2} y={sideY - 30} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={toneColor(state.middle.tone)}>
              median
            </text>
            <text x={WIDTH / 2} y={sideY + 6} textAnchor="middle" fontSize={state.middle.label.length > 3 ? 13 : 16} fontWeight={700} fill={toneColor(state.middle.tone)} fontFamily={MONO}>
              {state.middle.label}
            </text>
          </g>
        ) : (
          <line x1={WIDTH / 2} y1={sideY - 44} x2={WIDTH / 2} y2={sideY + 44} stroke={VIZ_COLORS.muted} strokeWidth={1.25} strokeDasharray="3 5" />
        )
      ) : null}

      {state.note ? (
        <text x={16} y={noteY} fontSize={12} fontWeight={700} fill={toneColor(state.note.tone)}>
          {state.note.text}
        </text>
      ) : null}

      {panel?.kind === "hand" ? (
        two ? (
          <g>
            <text x={WIDTH / 2 - 26} y={28} textAnchor="end" fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.ink}>
              {panel.title}
            </text>
            {panel.items.slice(0, 1).map((item) => (
              <g key={item.id} opacity={item.tone === "faded" ? 0.4 : 1}>
                <rect x={WIDTH / 2 - 18} y={8} width={36} height={30} rx={8} fill={FILL[item.tone]} stroke={STROKE[item.tone]} strokeWidth={2} />
                <text x={WIDTH / 2} y={28} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                  {item.label}
                </text>
              </g>
            ))}
            {panel.note ? (
              <text x={WIDTH / 2 + 26} y={28} fontSize={11.5} fontWeight={700} fill={toneColor(panel.noteTone ?? "muted")}>
                {panel.note}
              </text>
            ) : null}
          </g>
        ) : (
          <g>
            <rect x={PANEL_X} y={30} width={WIDTH - PANEL_X - 12} height={panelBottom - 30} rx={12} fill="color-mix(in srgb, var(--steel-900) 45%, transparent)" stroke={VIZ_COLORS.line} />
            <text x={PANEL_X + 12} y={49} fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.ink}>
              {panel.title}
            </text>
            {panel.items.length === 0 && !panel.note ? (
              <text x={PANEL_X + 12} y={80} fontSize={12} fill={VIZ_COLORS.muted}>
                (nothing)
              </text>
            ) : null}
            {panel.items.map((item, index) => {
              const x = PANEL_X + 12 + (index % 4) * 50;
              const y = 58 + Math.floor(index / 4) * 42;
              return (
                <g key={item.id} className={GLIDE} style={{ transform: `translate(${x}px, ${y}px)` }} opacity={item.tone === "faded" ? 0.4 : 1}>
                  <rect width={42} height={34} rx={8} fill={FILL[item.tone]} stroke={STROKE[item.tone]} strokeWidth={item.tone === "idle" ? 1.25 : 2} />
                  <text x={21} y={22} textAnchor="middle" fontSize={item.label.length > 4 ? 10 : 13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                    {item.label}
                  </text>
                  {item.sub ? (
                    <text x={21} y={46} textAnchor="middle" fontSize={9.5} fill={VIZ_COLORS.muted}>
                      {item.sub}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {panel.note ? (
              <text x={PANEL_X + 12} y={panelBottom - 10} fontSize={12} fontWeight={700} fill={toneColor(panel.noteTone ?? "muted")}>
                {panel.note}
              </text>
            ) : null}
          </g>
        )
      ) : null}

      {panel?.kind === "grid"
        ? (() => {
            const size = 150;
            const x0 = 392;
            const y0 = 30;
            const mid = size / 2;
            const scale = (mid - 10) / Math.max(panel.reach, 1);
            const px = (x: number) => x0 + mid + x * scale;
            const py = (y: number) => y0 + mid - y * scale;
            const ray = panel.ray ? panel.points[panel.ray.to] : null;
            return (
              <g>
                <rect x={x0} y={y0} width={size} height={size} rx={10} fill="color-mix(in srgb, var(--steel-900) 45%, transparent)" stroke={VIZ_COLORS.line} />
                <line x1={x0 + 6} y1={y0 + mid} x2={x0 + size - 6} y2={y0 + mid} stroke={VIZ_COLORS.line} />
                <line x1={x0 + mid} y1={y0 + 6} x2={x0 + mid} y2={y0 + size - 6} stroke={VIZ_COLORS.line} />
                <text x={x0 + mid + 5} y={y0 + mid + 12} fontSize={9.5} fill={VIZ_COLORS.muted}>
                  origin
                </text>
                {ray && panel.ray ? <line x1={px(0)} y1={py(0)} x2={px(ray.x)} y2={py(ray.y)} stroke={toneColor(panel.ray.tone)} strokeWidth={2} strokeDasharray={panel.ray.tone === "coral" ? "5 4" : undefined} /> : null}
                {panel.points.map((point, index) => (
                  <g key={index} opacity={point.tone === "faded" ? 0.35 : 1}>
                    <circle cx={px(point.x)} cy={py(point.y)} r={point.tone === "idle" ? 4 : 5.5} fill={point.tone === "idle" ? VIZ_COLORS.muted : STROKE[point.tone]} />
                    {point.label ? (
                      <text x={px(point.x)} y={py(point.y) + (point.y >= 0 ? -9 : 17)} textAnchor={point.x > panel.reach * 0.5 ? "end" : point.x < -panel.reach * 0.5 ? "start" : "middle"} fontSize={10} fontWeight={700} fill={VIZ_COLORS.ink}>
                        {point.label}
                      </text>
                    ) : null}
                  </g>
                ))}
                {panel.ray ? (
                  <text x={x0 + mid} y={y0 + size + 14} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={toneColor(panel.ray.tone)}>
                    {panel.ray.label}
                  </text>
                ) : null}
              </g>
            );
          })()
        : null}

      {panel?.kind === "axis"
        ? (() => {
            const x0 = 318;
            const span = WIDTH - 20 - x0;
            const tx = (time: number) => x0 + (time / Math.max(panel.max, 1)) * span;
            const laneY = (lane: number | "next") => (lane === "next" ? 32 : 62 + lane * 26);
            const axisY = 62 + Math.max(panel.lanes, 1) * 26 + 2;
            return (
              <g>
                <text x={x0 - 8} y={47} textAnchor="end" fontSize={10} fontWeight={700} fill={VIZ_COLORS.accent}>
                  next
                </text>
                {Array.from({ length: panel.lanes }, (_, lane) => (
                  <g key={lane}>
                    <rect x={x0} y={laneY(lane)} width={span} height={22} rx={5} fill="color-mix(in srgb, var(--steel-900) 45%, transparent)" stroke={VIZ_COLORS.line} strokeOpacity={0.6} />
                    <text x={x0 - 8} y={laneY(lane) + 15} textAnchor="end" fontSize={10} fontWeight={600} fill={VIZ_COLORS.muted}>
                      room {lane + 1}
                    </text>
                  </g>
                ))}
                <line x1={x0} y1={axisY} x2={x0 + span} y2={axisY} stroke={VIZ_COLORS.line} />
                <text x={x0} y={axisY + 12} fontSize={9.5} fill={VIZ_COLORS.muted}>
                  0
                </text>
                <text x={x0 + span} y={axisY + 12} textAnchor="end" fontSize={9.5} fill={VIZ_COLORS.muted}>
                  {panel.max}
                </text>
                {panel.bars
                  .filter((bar) => bar.lane !== null)
                  .map((bar) => {
                    const w = Math.max(tx(bar.end) - tx(bar.start), 8);
                    return (
                      <g key={bar.id} className={GLIDE} style={{ transform: `translate(${tx(bar.start)}px, ${laneY(bar.lane as number | "next")}px)` }} opacity={bar.tone === "faded" ? 0.4 : 1}>
                        <rect width={w} height={22} rx={5} fill={FILL[bar.tone]} stroke={STROKE[bar.tone]} strokeWidth={bar.tone === "idle" ? 1.25 : 2} />
                        <text x={w / 2} y={15} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                          {bar.start}–{bar.end}
                        </text>
                      </g>
                    );
                  })}
              </g>
            );
          })()
        : null}

      {rows.map((row, rowIndex) => (
        <g key={rowIndex}>
          <text x={16} y={rowY(rowIndex) + 20} fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink}>
            {row.title}
          </text>
          {row.cells.length === 0 ? (
            <text x={ROW_X} y={rowY(rowIndex) + 20} fontSize={12} fill={VIZ_COLORS.muted}>
              {row.emptyText ?? "(empty)"}
            </text>
          ) : null}
          {row.cells.map((cell, index) => {
            const tone = toned({ at: "row", row: rowIndex, index }, cell.tone);
            const w = cellW(row);
            return (
              <g key={index} opacity={tone === "faded" ? 0.4 : 1} className={GLIDE}>
                <rect className={GLIDE} x={cellX(row, index)} y={rowY(rowIndex)} width={w} height={30} rx={7} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 2} />
                <text x={cellX(row, index) + w / 2} y={rowY(rowIndex) + 20} textAnchor="middle" fontSize={row.wide ? 11.5 : 13} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                  {cell.label}
                </text>
                {cell.sub ? (
                  <text x={cellX(row, index) + w / 2} y={rowY(rowIndex) + 41} textAnchor="middle" fontSize={9.5} fill={VIZ_COLORS.muted}>
                    {cell.sub}
                  </text>
                ) : null}
                <RejectedMark pick={pick} index={pickOf({ at: "row", row: rowIndex, index })} x={cellX(row, index) + w - 7} y={rowY(rowIndex) + 11} />
              </g>
            );
          })}
        </g>
      ))}

      {/* A real target for "nothing", shown only while that can be the answer. */}
      {nothingIndex >= 0 && pick ? (
        <g>
          <rect
            x={nothingBox.x}
            y={nothingBox.y}
            width={nothingBox.w}
            height={nothingBox.h}
            rx={8}
            strokeDasharray="5 4"
            strokeWidth={1.5}
            stroke={STROKE[pickTone(pick, nothingIndex, "idle")] === VIZ_COLORS.line ? VIZ_COLORS.muted : STROKE[pickTone(pick, nothingIndex, "idle")]}
            fill={pickTone(pick, nothingIndex, "idle") === "idle" ? "transparent" : FILL[pickTone(pick, nothingIndex, "idle")]}
          />
          <text x={nothingBox.x + nothingBox.w / 2} y={nothingBox.y + 22} textAnchor="middle" fontSize={13} fontWeight={600} fill={VIZ_COLORS.ink}>
            nothing
          </text>
          <RejectedMark pick={pick} index={nothingIndex} x={nothingBox.x + nothingBox.w - 10} y={nothingBox.y + 13} />
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point. */}
      {picks.map((ref, index) => {
        if (ref.at === "nothing") return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={nothingBox.x} y={nothingBox.y} width={nothingBox.w} height={nothingBox.h} label="Choose nothing" />;
        if (ref.at === "pile") {
          const at = place(ref.pile, ref.index);
          const item = piles[ref.pile]?.items[ref.index];
          return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={at.x - r - 3} y={at.y - r - 3} width={2 * r + 6} height={2 * r + 6} rx={r + 3} label={`Choose ${item?.label ?? "this seat"} in the pile`} />;
        }
        const row = rows[ref.row];
        if (!row) return null;
        return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(row, ref.index) - 3} y={rowY(ref.row) - 3} width={cellW(row) + 6} height={36} label={`Choose ${row.cells[ref.index]?.label ?? "this box"} in ${row.title}`} />;
      })}
    </Frame>
  );
}
