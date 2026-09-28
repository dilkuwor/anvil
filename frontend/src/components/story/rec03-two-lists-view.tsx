import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Two sorted lists of busy times, one lane each, on a shared timeline, with a finger on each lane.
 * Under them, the lane of stretches both lists share. Draws state only.
 */

export type Span = [number, number];

export type TwoListsState = {
  lists: [Span[], Span[]];
  titles: [string, string];
  tones: [CellTone[], CellTone[]];
  /** The range each finger rests on, or null when that finger is not shown. */
  fingers: [number | null, number | null];
  shared: Span[];
  /** Tone for each shared stretch; teal when left out. */
  sharedTones?: CellTone[];
  /** The stretch being looked at: from the later start to the earlier end. "gap" when the start is after the end. */
  band?: { from: number; to: number; kind: "share" | "gap" } | null;
  /** The trap: a shared stretch a wrong move would lose, drawn dashed in coral on the shared lane. */
  lost?: Span | null;
  counter?: { label: string; value: number } | null;
  /** While a question asks which finger moves: cell 0 is the first finger's range, cell 1 the second's. */
  pickFingers?: boolean;
};

const WIDTH = 560;
const HEIGHT = 300;
const GUTTER = 78;
const TIME_RIGHT = WIDTH - 22;
const LANE_Y = [66, 142];
const SHARED_Y = 216;
const BAR_H = 18;
const AXIS_Y = 276;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const LABEL_W = 44;

const FILL: Record<CellTone, string> = {
  idle: "color-mix(in srgb, var(--steel-800) 40%, transparent)",
  window: "color-mix(in srgb, var(--accent) 18%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 25%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 30%, transparent)",
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

/** Even ticks: 1, 2, 5, 10, 20… whichever keeps the axis to about ten numbers. */
function tickStep(span: number): number {
  let step = 1;
  for (const factor of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]) {
    step = factor;
    if (span / factor <= 10) break;
  }
  return step;
}

/** Labels sit under their bars. A label that would touch its left neighbour drops to a second line. */
function labelLines(spans: Span[], centre: (span: Span) => number): number[] {
  const lines: number[] = [];
  let lastX = -Infinity;
  let lastLine = 1;
  spans.forEach((span) => {
    const x = centre(span);
    const line = x - lastX < LABEL_W && lastLine === 0 ? 1 : 0;
    lines.push(line);
    lastX = x;
    lastLine = line;
  });
  return lines;
}

export function TwoListsView({ state, pick }: { state: TwoListsState; pick?: CellPick }) {
  const { lists, shared, band, lost } = state;
  const all = [...lists[0], ...lists[1], ...shared];
  const earliest = Math.min(...all.map((span) => span[0]), Infinity);
  const latest = Math.max(...all.map((span) => span[1]), -Infinity);
  const from = Number.isFinite(earliest) ? earliest : 0;
  const to = Number.isFinite(latest) && latest > from ? latest : from + 1;
  const step = tickStep(to - from);
  const axisFrom = Math.floor(from / step) * step;
  const axisTo = Math.ceil(to / step) * step;
  const timeX = (time: number) => GUTTER + ((time - axisFrom) / Math.max(axisTo - axisFrom, 1)) * (TIME_RIGHT - GUTTER);
  const ticks = Array.from({ length: Math.round((axisTo - axisFrom) / step) + 1 }, (_, index) => axisFrom + index * step);
  const barX = (span: Span) => timeX(span[0]) - (span[0] === span[1] ? 3 : 0);
  const barW = (span: Span) => Math.max(6, timeX(span[1]) - timeX(span[0]));
  const centre = (span: Span) => barX(span) + barW(span) / 2;
  const clampX = (x: number) => Math.min(WIDTH - LABEL_W / 2 - 2, Math.max(GUTTER + 10, x));

  const bar = (span: Span, y: number, tone: CellTone, key: string, dashed = false) => (
    <rect
      key={key}
      className={GLIDE}
      x={barX(span)}
      y={y}
      width={barW(span)}
      height={BAR_H}
      rx={4}
      fill={FILL[tone]}
      stroke={STROKE[tone]}
      strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 2}
      strokeDasharray={dashed ? "5 4" : undefined}
      opacity={tone === "faded" ? 0.4 : 1}
    />
  );
  const label = (span: Span, y: number, line: number, key: string, tone: CellTone) => (
    <text key={key} x={clampX(centre(span))} y={y + BAR_H + 13 + line * 12} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.ink} fontFamily={MONO} opacity={tone === "faded" ? 0.45 : 1}>
      [{span[0]},{span[1]}]
    </text>
  );

  const sharedLines = labelLines(shared, centre);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Two sorted lists of busy times on one timeline, a finger on each, and the stretches they share">
      {state.counter ? (
        <Label x={WIDTH - 12} y={20} size={13} weight={600} tone="coral" anchor="end">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {/* Time axis with even ticks; faint lines carry each tick up through the lanes. */}
      <line x1={GUTTER} y1={AXIS_Y} x2={TIME_RIGHT} y2={AXIS_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={timeX(tick)} y1={LANE_Y[0] - 6} x2={timeX(tick)} y2={AXIS_Y + 4} stroke={VIZ_COLORS.line} strokeWidth={1} strokeOpacity={0.3} />
          <text x={timeX(tick)} y={AXIS_Y + 16} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
            {tick}
          </text>
        </g>
      ))}

      {/* The stretch being looked at runs down through both lanes into the shared lane. */}
      {band ? (
        band.kind === "share" ? (
          <rect className={GLIDE} x={timeX(band.from) - (band.from === band.to ? 1.5 : 0)} y={LANE_Y[0] - 4} width={Math.max(3, timeX(band.to) - timeX(band.from))} height={SHARED_Y + BAR_H + 4 - (LANE_Y[0] - 4)} fill="color-mix(in srgb, var(--teal) 20%, transparent)" />
        ) : (
          <rect className={GLIDE} x={timeX(band.to)} y={LANE_Y[0] - 4} width={Math.max(3, timeX(band.from) - timeX(band.to))} height={LANE_Y[1] + BAR_H + 4 - (LANE_Y[0] - 4)} fill="color-mix(in srgb, var(--coral) 12%, transparent)" stroke={VIZ_COLORS.coral} strokeDasharray="5 4" />
        )
      ) : null}

      {lists.map((spans, lane) => {
        const y = LANE_Y[lane];
        const lines = labelLines(spans, centre);
        const finger = state.fingers[lane];
        return (
          <g key={lane}>
            <text x={8} y={y + BAR_H / 2 + 4} fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.ink}>
              {state.titles[lane]}
            </text>
            {spans.length === 0 ? (
              <text x={GUTTER} y={y + BAR_H / 2 + 4} fontSize={11} fill={VIZ_COLORS.muted}>
                (empty)
              </text>
            ) : null}
            {spans.map((span, index) => {
              const own = state.tones[lane][index] ?? "idle";
              const tone = state.pickFingers && index === finger ? pickTone(pick, lane, own) : own;
              return bar(span, y, tone, `bar-${lane}-${index}`);
            })}
            {spans.map((span, index) => label(span, y, lines[index], `label-${lane}-${index}`, state.tones[lane][index] ?? "idle"))}
            {finger !== null && spans[finger] ? (
              <g className={GLIDE} style={{ transform: `translate(${clampX(centre(spans[finger]))}px, ${y - 4}px)` }}>
                <path d="M0 0 L-6 -8 L6 -8 Z" fill={VIZ_COLORS.accent} />
                <text x={0} y={-11} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
                  finger
                </text>
              </g>
            ) : null}
            {finger !== null && spans[finger] && state.pickFingers ? <RejectedMark pick={pick} index={lane} x={barX(spans[finger]) + barW(spans[finger]) - 7} y={y + 13} /> : null}
          </g>
        );
      })}

      <text x={8} y={SHARED_Y + BAR_H / 2 + 4} fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.teal}>
        shared
      </text>
      {shared.length === 0 && !lost ? (
        <text x={GUTTER} y={SHARED_Y + BAR_H / 2 + 4} fontSize={11} fill={VIZ_COLORS.muted}>
          (nothing yet)
        </text>
      ) : null}
      {shared.map((span, index) => bar(span, SHARED_Y, state.sharedTones?.[index] ?? "hit", `shared-${index}`))}
      {shared.map((span, index) => label(span, SHARED_Y, sharedLines[index], `shared-label-${index}`, state.sharedTones?.[index] ?? "hit"))}
      {lost ? (
        <g>
          {bar(lost, SHARED_Y, "miss", "lost", true)}
          <text x={clampX(centre(lost))} y={SHARED_Y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ lost
          </text>
        </g>
      ) : null}

      {/* Click targets sit on top, one per finger's range, only while the reader is asked which finger moves. */}
      {state.pickFingers
        ? lists.map((spans, lane) => {
            const finger = state.fingers[lane];
            if (finger === null || !spans[finger]) return null;
            const span = spans[finger];
            return <PickTarget key={`pick-${lane}`} pick={pick} index={lane} x={barX(span) - 4} y={LANE_Y[lane] - 22} width={barW(span) + 8} height={BAR_H + 40} label={`Move the finger on ${span[0]} to ${span[1]}`} />;
          })
        : null}
    </Frame>
  );
}
