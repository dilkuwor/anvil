import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Days as temperature bars, beside the waiting room of days that have no answer yet. Draws state only. */

export type WaitingRoomState = {
  temps: number[];
  tones: CellTone[];
  /** The day that is arriving. */
  today: number | null;
  /** Day numbers still waiting. The last one came in last, so it sits nearest the door. */
  waiting: number[];
  answers: (number | null)[];
  /** A bracket under two days: how long one waited for the other, or a wrong match in coral. */
  link?: { from: number; to: number; tone: "wait" | "wrong"; label: string } | null;
  counter?: { label: string; value: number } | null;
  /** True while a question may be answered with "nobody": draws that box as a real target (cell index = number of days). */
  askNobody?: boolean;
  /** Highlights the room itself, for the frame about memory. */
  roomLit?: boolean;
};

const WIDTH = 560;
const HEIGHT = 270;
const BASE_Y = 150;
const MAX_H = 84;
const MIN_H = 24;
const AREA_X = 60;
const AREA_W = 340;
const ROOM_X = 416;
const ROOM_Y = 30;
const ROOM_W = 128;
const ROOM_H = 196;
const NOBODY_Y = 234;

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

export function WaitingRoomView({ state, pick }: { state: WaitingRoomState; pick?: CellPick }) {
  const { temps, today, waiting, answers, link } = state;
  const count = Math.max(temps.length, 1);
  // Bars scale to this input's own coldest and warmest day, so "warmer" is always visible.
  const coldest = Math.min(...temps);
  const spread = Math.max(Math.max(...temps) - coldest, 1);
  const slot = Math.min(60, AREA_W / count);
  const barW = Math.min(40, slot - 10);
  const startX = AREA_X + (AREA_W - slot * count) / 2;
  const barX = (index: number) => startX + index * slot + (slot - barW) / 2;
  const midX = (index: number) => barX(index) + barW / 2;
  const barH = (temp: number) => MIN_H + ((temp - coldest) / spread) * (MAX_H - MIN_H);

  // The room fits every day at once, which is the worst case.
  const seatH = Math.min(26, Math.floor((ROOM_H - 34) / count));
  const seatFont = seatH < 20 ? 10 : 11.5;
  const nobodyPicked = pick?.picked === count;
  const nobodyWrong = (nobodyPicked && pick?.answer !== count) || (pick?.rejected?.includes(count) ?? false);
  const linkColor = link?.tone === "wrong" ? VIZ_COLORS.coral : VIZ_COLORS.teal;
  const linkMid = link ? Math.min(Math.max((midX(link.from) + midX(link.to)) / 2, 96), ROOM_X - 96) : 0;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Daily temperatures as bars, beside a waiting room of days that have no warmer day yet">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      <line x1={AREA_X - 8} y1={BASE_Y} x2={AREA_X + AREA_W + 8} y2={BASE_Y} stroke={VIZ_COLORS.line} strokeWidth={1.5} />
      <Label x={16} y={BASE_Y + 17} size={11} weight={600}>
        day
      </Label>
      <Label x={16} y={BASE_Y + 39} size={11} weight={600}>
        wait
      </Label>

      {temps.map((temp, index) => {
        const tone = pickTone(pick, index, state.tones[index] ?? "idle");
        const height = barH(temp);
        const top = BASE_Y - height;
        return (
          <g key={index} opacity={tone === "faded" ? 0.4 : 1} className={GLIDE}>
            <rect className={GLIDE} x={barX(index)} y={top} width={barW} height={height} rx={4} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 2} />
            <text x={midX(index)} y={top - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill={VIZ_COLORS.ink}>
              {temp}°
            </text>
            <text x={midX(index)} y={BASE_Y + 17} textAnchor="middle" fontSize={11} fill={VIZ_COLORS.muted}>
              {index}
            </text>
            <text x={midX(index)} y={BASE_Y + 39} textAnchor="middle" fontSize={13} fontWeight={700} fill={answers[index] === null ? VIZ_COLORS.muted : VIZ_COLORS.teal}>
              {answers[index] === null ? "·" : answers[index]}
            </text>
            <RejectedMark pick={pick} index={index} x={midX(index)} y={BASE_Y - 7} />
          </g>
        );
      })}

      {/* "today" sits above the temperature label, never on it. */}
      {today !== null ? (
        <g className={GLIDE} style={{ transform: `translate(${midX(today)}px, ${BASE_Y - barH(temps[today]) - 20}px)` }}>
          <path d="M0 0 L-5 -8 L5 -8 Z" fill={VIZ_COLORS.accent} />
          <text x={0} y={-12} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
            today
          </text>
        </g>
      ) : null}

      {/* The bracket runs under the number rows, so it never crosses a label. */}
      {link ? (
        <g>
          <path
            d={`M${midX(link.from)} ${BASE_Y + 48} v8 H${midX(link.to)} v-8`}
            fill="none"
            stroke={linkColor}
            strokeWidth={2}
            strokeDasharray={link.tone === "wrong" ? "5 4" : undefined}
            strokeLinejoin="round"
          />
          <text x={linkMid} y={BASE_Y + 74} textAnchor="middle" fontSize={12} fontWeight={700} fill={linkColor}>
            {link.label}
          </text>
        </g>
      ) : null}

      {/* The waiting room. The door is at the top; whoever came in last sits right under it. */}
      <rect
        x={ROOM_X}
        y={ROOM_Y}
        width={ROOM_W}
        height={ROOM_H}
        rx={10}
        fill={state.roomLit ? "color-mix(in srgb, var(--teal) 12%, transparent)" : "color-mix(in srgb, var(--steel-900) 55%, transparent)"}
        stroke={state.roomLit ? VIZ_COLORS.teal : VIZ_COLORS.line}
        strokeWidth={1.5}
      />
      <line x1={ROOM_X + 40} y1={ROOM_Y} x2={ROOM_X + ROOM_W - 40} y2={ROOM_Y} stroke={VIZ_COLORS.accent} strokeWidth={4} strokeLinecap="round" />
      <text x={ROOM_X + ROOM_W / 2} y={ROOM_Y - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.accent}>
        door
      </text>
      <text x={ROOM_X + ROOM_W / 2} y={ROOM_Y + 20} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
        waiting room
      </text>
      {waiting.length === 0 ? (
        <text x={ROOM_X + ROOM_W / 2} y={ROOM_Y + 48} textAnchor="middle" fontSize={12} fill={VIZ_COLORS.muted}>
          (empty)
        </text>
      ) : null}
      {waiting.map((day, position) => {
        const fromDoor = waiting.length - 1 - position;
        return (
          <g key={day} className={GLIDE} style={{ transform: `translate(${ROOM_X + 10}px, ${ROOM_Y + 30 + fromDoor * seatH}px)` }}>
            <rect width={ROOM_W - 20} height={seatH - 4} rx={5} fill="color-mix(in srgb, var(--accent) 16%, transparent)" stroke={VIZ_COLORS.accent} strokeWidth={fromDoor === 0 ? 1.75 : 1} strokeOpacity={fromDoor === 0 ? 1 : 0.5} />
            <text x={(ROOM_W - 20) / 2} y={(seatH - 4) / 2 + 4} textAnchor="middle" fontSize={seatFont} fontWeight={600} fill={VIZ_COLORS.ink}>
              day {day} · {temps[day]}°
            </text>
          </g>
        );
      })}

      {/* A real target for "nobody leaves", shown only while that can be the answer. */}
      {state.askNobody && pick ? (
        <g>
          <rect
            x={ROOM_X}
            y={NOBODY_Y}
            width={ROOM_W}
            height={28}
            rx={8}
            strokeDasharray="5 4"
            strokeWidth={1.5}
            stroke={nobodyWrong ? VIZ_COLORS.coral : nobodyPicked ? VIZ_COLORS.teal : VIZ_COLORS.muted}
            fill={nobodyWrong ? FILL.miss : nobodyPicked ? FILL.done : "transparent"}
          />
          <text x={ROOM_X + ROOM_W / 2} y={NOBODY_Y + 19} textAnchor="middle" fontSize={13} fontWeight={600} fill={VIZ_COLORS.ink}>
            nobody
          </text>
          <RejectedMark pick={pick} index={count} x={ROOM_X + ROOM_W - 12} y={NOBODY_Y + 18} />
        </g>
      ) : null}

      {/* Click targets sit on top, only while the reader is asked to point. */}
      {temps.map((temp, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={barX(index) - 4} y={BASE_Y - MAX_H - 22} width={barW + 8} height={MAX_H + 66} label={`Choose day ${index}, ${temp} degrees`} />
      ))}
      {state.askNobody ? <PickTarget pick={pick} index={count} x={ROOM_X} y={NOBODY_Y} width={ROOM_W} height={28} label="Choose nobody" /> : null}
    </Frame>
  );
}
