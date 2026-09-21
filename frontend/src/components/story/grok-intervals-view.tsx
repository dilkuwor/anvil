import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Calendar rows on a time axis. Copied so the heading can say "sorted by end" instead of start. */

export type GrokIntervalItem = [number, number];
export type GrokMeeting = { id: number; span: GrokIntervalItem };

export type GrokIntervalsState = {
  meetings: GrokMeeting[];
  sorted: boolean;
  heading?: string;
  blocksLabel?: string;
  tones: CellTone[];
  blocks: GrokIntervalItem[];
  endLine?: number | null;
  band?: GrokIntervalItem | null;
  wrongEnd?: number | null;
  note?: string | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 286;
const GUTTER = 84;
const TIME_RIGHT = WIDTH - 20;
const ROWS_TOP = 54;
const BLOCK_Y = 222;
const BLOCK_H = 22;
const ROWS_BOTTOM = BLOCK_Y - 18;
const AXIS_Y = 262;

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

function tickStep(span: number): number {
  let step = 1;
  for (const factor of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]) {
    step = factor;
    if (span / factor <= 10) break;
  }
  return step;
}

export function GrokIntervalsView({ state, pick }: { state: GrokIntervalsState; pick?: CellPick }) {
  const { meetings, blocks, endLine, band, wrongEnd } = state;
  const all = [...meetings.map((meeting) => meeting.span), ...blocks];
  const earliest = Math.min(...all.map((span) => span[0]), Infinity);
  const latest = Math.max(...all.map((span) => span[1]), -Infinity);
  const from = Number.isFinite(earliest) ? earliest : 0;
  const to = Number.isFinite(latest) && latest > from ? latest : from + 1;
  const step = tickStep(to - from);
  const axisFrom = Math.floor(from / step) * step;
  const axisTo = Math.ceil(to / step) * step;
  const timeX = (time: number) => GUTTER + ((time - axisFrom) / Math.max(axisTo - axisFrom, 1)) * (TIME_RIGHT - GUTTER);
  const ticks = Array.from({ length: Math.round((axisTo - axisFrom) / step) + 1 }, (_, index) => axisFrom + index * step);

  const rowH = Math.min(28, (ROWS_BOTTOM - ROWS_TOP) / Math.max(meetings.length, 1));
  const barH = Math.max(8, rowH - 8);
  const rowY = (row: number) => ROWS_TOP + row * rowH;
  const labelSize = rowH < 20 ? 10 : 12;
  const last = blocks.length - 1;
  const comparing = state.tones.includes("edge") || (endLine !== null && endLine !== undefined) || (wrongEnd !== null && wrongEnd !== undefined);
  const active = comparing ? last : -1;
  const rank = (index: number) => blocks.filter((block) => block[0] < blocks[index][0]).length;
  const clampX = (x: number, half: number) => Math.min(WIDTH - half - 6, Math.max(GUTTER + half, x));
  const heading = state.heading ?? (state.sorted ? "meetings, sorted by start" : "meetings, as given");
  const blocksLabel = state.blocksLabel ?? "busy blocks";

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Meetings on a timeline, and the blocks they become">
      {state.counter ? (
        <Label x={8} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={state.counter ? WIDTH - 8 : 8} y={22} size={13} weight={700} tone="coral" anchor={state.counter ? "end" : "start"}>
          {state.note}
        </Label>
      ) : null}
      {wrongEnd !== null && wrongEnd !== undefined && last >= 0 && !state.note ? (
        <Label x={8} y={22} size={13} weight={700} tone="coral">
          ✕ copying the end {wrongEnd} would lose {wrongEnd} to {blocks[last][1]}
        </Label>
      ) : null}
      <Label x={8} y={44} size={11} weight={600}>
        {heading}
      </Label>

      <line x1={GUTTER} y1={AXIS_Y} x2={TIME_RIGHT} y2={AXIS_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={timeX(tick)} y1={ROWS_TOP} x2={timeX(tick)} y2={AXIS_Y + 4} stroke={VIZ_COLORS.line} strokeWidth={1} strokeOpacity={0.35} />
          <text x={timeX(tick)} y={AXIS_Y + 16} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
            {tick}
          </text>
        </g>
      ))}

      {band ? (
        <rect className={GLIDE} x={timeX(band[0]) - (band[0] === band[1] ? 1.5 : 0)} y={ROWS_TOP - 2} width={Math.max(3, timeX(band[1]) - timeX(band[0]))} height={BLOCK_Y + BLOCK_H + 2 - ROWS_TOP} fill="color-mix(in srgb, var(--accent) 22%, transparent)" />
      ) : null}

      {meetings.map((meeting, row) => {
        const tone = pickTone(pick, row, state.tones[row] ?? "idle");
        const [start, end] = meeting.span;
        const strong = tone !== "idle" && tone !== "faded";
        return (
          <g key={meeting.id} className={GLIDE} style={{ transform: `translate(0px, ${rowY(row)}px)`, opacity: tone === "faded" ? 0.35 : 1 }}>
            <text x={8} y={rowH / 2 + 4} fontSize={labelSize} fontWeight={strong ? 700 : 600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
              [{start},{end}]
            </text>
            <rect x={timeX(start)} y={(rowH - barH) / 2} width={Math.max(6, timeX(end) - timeX(start))} height={barH} rx={4} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={strong ? 2 : 1.25} />
          </g>
        );
      })}
      {meetings.map((meeting, row) => (
        <RejectedMark key={`no-${meeting.id}`} pick={pick} index={row} x={GUTTER - 12} y={rowY(row) + rowH / 2 + 4} />
      ))}

      <text x={8} y={BLOCK_Y + BLOCK_H / 2 + 4} fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal}>
        {blocksLabel}
      </text>
      {blocks.map((block, index) => {
        const x = timeX(block[0]);
        const width = Math.max(6, timeX(block[1]) - x);
        return (
          <g key={index}>
            <rect className={GLIDE} x={x} y={BLOCK_Y} width={width} height={BLOCK_H} rx={5} fill={FILL[index === active ? "done" : "hit"]} stroke={VIZ_COLORS.teal} strokeWidth={index === active ? 2.25 : 1.25} />
            <text x={clampX(x + width / 2, 24)} y={rank(index) % 2 === 0 ? BLOCK_Y - 5 : BLOCK_Y + BLOCK_H + 12} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
              [{block[0]},{block[1]}]
            </text>
          </g>
        );
      })}

      {wrongEnd !== null && wrongEnd !== undefined && last >= 0 ? (
        <rect x={timeX(wrongEnd)} y={BLOCK_Y} width={Math.max(6, timeX(blocks[last][1]) - timeX(wrongEnd))} height={BLOCK_H} rx={5} fill="color-mix(in srgb, var(--coral) 45%, transparent)" stroke={VIZ_COLORS.coral} strokeWidth={2} strokeDasharray="5 4" />
      ) : null}

      {endLine !== null && endLine !== undefined ? (
        <line className={GLIDE} x1={timeX(endLine)} y1={ROWS_TOP - 2} x2={timeX(endLine)} y2={BLOCK_Y + BLOCK_H} stroke={VIZ_COLORS.teal} strokeWidth={2} strokeDasharray="5 4" />
      ) : null}

      {meetings.map((meeting, row) => (
        <PickTarget key={`pick-${meeting.id}`} pick={pick} index={row} x={4} y={rowY(row)} width={WIDTH - 8} height={rowH} label={`Choose the meeting from ${meeting.span[0]} to ${meeting.span[1]}`} />
      ))}
    </Frame>
  );
}
