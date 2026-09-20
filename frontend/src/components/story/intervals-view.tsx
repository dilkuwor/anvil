import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** A calendar: one row per meeting on a shared timeline, and under them the busy blocks they are joined into. Draws state only. */

export type IntervalItem = [number, number];

/** `id` is the meeting's place in the input, so a row keeps its identity (and glides) when the list is sorted. */
export type Meeting = { id: number; span: IntervalItem };

export type IntervalsState = {
  /** In the order the rows are drawn, top to bottom. */
  meetings: Meeting[];
  /** Which heading the rows get. */
  sorted: boolean;
  /** One tone per drawn row. */
  tones: CellTone[];
  /** The busy blocks made so far. */
  blocks: IntervalItem[];
  /** Dashed guide at the latest block's end: the one number every new meeting is compared with. */
  endLine?: number | null;
  /** The stretch of time two things share. Equal ends mean they only touch. */
  band?: IntervalItem | null;
  /** The trap: the latest block's end if it were wrongly copied from the meeting inside it. */
  wrongEnd?: number | null;
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

/** Even ticks: 1, 2, 5, 10, 20… whichever keeps the axis to about ten numbers. */
function tickStep(span: number): number {
  let step = 1;
  for (const factor of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]) {
    step = factor;
    if (span / factor <= 10) break;
  }
  return step;
}

export function IntervalsView({ state, pick }: { state: IntervalsState; pick?: CellPick }) {
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

  // Rows are laid out from the data, so a long calendar never runs into the busy blocks.
  const rowH = Math.min(28, (ROWS_BOTTOM - ROWS_TOP) / Math.max(meetings.length, 1));
  const barH = Math.max(8, rowH - 8);
  const rowY = (row: number) => ROWS_TOP + row * rowH;
  const labelSize = rowH < 20 ? 10 : 12;
  const last = blocks.length - 1;
  // The latest block stands out only while a meeting is being compared with it.
  const comparing = state.tones.includes("edge") || (endLine !== null && endLine !== undefined) || (wrongEnd !== null && wrongEnd !== undefined);
  const active = comparing ? last : -1;
  // Labels alternate by position in time, not by list order, so neighbours never share a side.
  const rank = (index: number) => blocks.filter((block) => block[0] < blocks[index][0]).length;
  const clampX = (x: number, half: number) => Math.min(WIDTH - half - 6, Math.max(GUTTER + half, x));

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Meetings on a timeline, and the busy blocks they merge into">
      {state.counter ? (
        <Label x={8} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {wrongEnd !== null && wrongEnd !== undefined && last >= 0 ? (
        <Label x={8} y={22} size={13} weight={700} tone="coral">
          ✕ copying the end {wrongEnd} would lose {wrongEnd} to {blocks[last][1]}
        </Label>
      ) : null}
      <Label x={8} y={44} size={11} weight={600}>
        {state.sorted ? "meetings, sorted by start" : "meetings, as given"}
      </Label>

      {/* Time axis with even ticks; faint lines carry each tick up through the rows. */}
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

      {/* One row per meeting. Its numbers sit in the left gutter, never inside a bar that may be too short for them. */}
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

      {/* The busy blocks. Labels alternate above and below, so two narrow neighbours never print over each other. */}
      <text x={8} y={BLOCK_Y + BLOCK_H / 2 + 4} fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal}>
        busy blocks
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

      {/* The trap, drawn: the part of the block that a copied end would throw away. */}
      {wrongEnd !== null && wrongEnd !== undefined && last >= 0 ? (
        <rect x={timeX(wrongEnd)} y={BLOCK_Y} width={Math.max(6, timeX(blocks[last][1]) - timeX(wrongEnd))} height={BLOCK_H} rx={5} fill="color-mix(in srgb, var(--coral) 45%, transparent)" stroke={VIZ_COLORS.coral} strokeWidth={2} strokeDasharray="5 4" />
      ) : null}

      {endLine !== null && endLine !== undefined ? (
        <line className={GLIDE} x1={timeX(endLine)} y1={ROWS_TOP - 2} x2={timeX(endLine)} y2={BLOCK_Y + BLOCK_H} stroke={VIZ_COLORS.teal} strokeWidth={2} strokeDasharray="5 4" />
      ) : null}

      {/* Click targets sit on top and cover the whole row, label included. */}
      {meetings.map((meeting, row) => (
        <PickTarget key={`pick-${meeting.id}`} pick={pick} index={row} x={4} y={rowY(row)} width={WIDTH - 8} height={rowH} label={`Choose the meeting from ${meeting.span[0]} to ${meeting.span[1]}`} />
      ))}
    </Frame>
  );
}
