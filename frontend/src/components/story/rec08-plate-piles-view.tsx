import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Two piles of plates (a queue built from two stacks), plus an optional "what if" pile for the trap.
 * Piles are listed bottom first. Draws state only.
 *
 * Click indices: the left pile's plates bottom first, then the right pile's plates bottom first.
 */

export type PilePlate = { value: number; tone: CellTone };

export type PlatePilesState = {
  leftTitle: string;
  rightTitle: string;
  left: PilePlate[];
  right: PilePlate[];
  /** Draw the pour arrow from the left pile to the right pile. */
  pouring: boolean;
  /** The call being handled, e.g. "pop". */
  op: string | null;
  /** What the calls have returned so far. */
  returned: string[];
  /** A wrong pile, drawn faintly to the side, for the trap. Bottom first. */
  trapPile: PilePlate[] | null;
  counter: { label: string; value: number } | null;
  note: string | null;
};

const WIDTH = 560;
const HEIGHT = 300;
const PLATE_W = 96;
const PLATE_H = 28;
const PLATE_GAP = 4;
const BASE_Y = 250;
const LEFT_X = 150;
const RIGHT_X = 330;
const TRAP_X = 480;

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

function plateY(level: number, count: number) {
  // Shrink the step when a pile is tall, so the top plate never leaves the frame.
  const step = Math.min(PLATE_H + PLATE_GAP, count > 0 ? 170 / count : PLATE_H + PLATE_GAP);
  return BASE_Y - (level + 1) * step;
}

function Plate({ cx, level, count, plate, tone, width = PLATE_W }: { cx: number; level: number; count: number; plate: PilePlate; tone: CellTone; width?: number }) {
  const y = plateY(level, count);
  return (
    <g className={GLIDE} opacity={tone === "faded" ? 0.35 : 1}>
      <rect x={cx - width / 2} y={y} width={width} height={PLATE_H} rx={12} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75} />
      <text x={cx} y={y + PLATE_H / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {plate.value}
      </text>
    </g>
  );
}

function Pile({ cx, title, plates, pick, offset }: { cx: number; title: string; plates: PilePlate[]; pick?: CellPick; offset: number }) {
  // A blank title hides the pile, for pictures that need only one.
  if (!title.trim()) return null;
  return (
    <g>
      <line x1={cx - PLATE_W / 2 - 10} y1={BASE_Y + 2} x2={cx + PLATE_W / 2 + 10} y2={BASE_Y + 2} stroke={VIZ_COLORS.line} strokeWidth={2} strokeLinecap="round" />
      <Label x={cx} y={BASE_Y + 22} size={12} weight={600} anchor="middle">
        {title}
      </Label>
      {plates.length === 0 ? (
        <Label x={cx} y={BASE_Y - 12} size={11} anchor="middle">
          (empty)
        </Label>
      ) : null}
      {plates.map((plate, level) => (
        <g key={`${title}-${level}`}>
          <Plate cx={cx} level={level} count={plates.length} plate={plate} tone={pickTone(pick, offset + level, plate.tone)} />
          <RejectedMark pick={pick} index={offset + level} x={cx + PLATE_W / 2 - 10} y={plateY(level, plates.length) + 12} />
        </g>
      ))}
      {plates.length > 0 ? (
        <Label x={cx + PLATE_W / 2 + 8} y={plateY(plates.length - 1, plates.length) + PLATE_H / 2 + 4} size={10}>
          top
        </Label>
      ) : null}
    </g>
  );
}

export function PlatePilesView({ state, pick }: { state: PlatePilesState; pick?: CellPick }) {
  const leftTop = state.left.length > 0 ? plateY(state.left.length - 1, state.left.length) : BASE_Y - 30;
  return (
    <Frame width={WIDTH} height={HEIGHT} label="Two piles of plates used as a waiting line">
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

      {state.pouring ? (
        <g>
          <path
            d={`M${LEFT_X + 20} ${leftTop - 8} Q${(LEFT_X + RIGHT_X) / 2} ${leftTop - 60} ${RIGHT_X - 20} ${BASE_Y - 70}`}
            fill="none"
            stroke={VIZ_COLORS.accent}
            strokeWidth={2.25}
            strokeDasharray="6 4"
          />
          <path d={`M${RIGHT_X - 20} ${BASE_Y - 70} l-10 -3 l5 -8 Z`} fill={VIZ_COLORS.accent} />
          <Label x={(LEFT_X + RIGHT_X) / 2} y={Math.max(leftTop - 50, 64)} size={12} weight={700} tone="accent" anchor="middle">
            pour
          </Label>
        </g>
      ) : null}

      <Pile cx={LEFT_X} title={state.leftTitle} plates={state.left} pick={pick} offset={0} />
      <Pile cx={RIGHT_X} title={state.rightTitle} plates={state.right} pick={pick} offset={state.left.length} />

      {state.trapPile ? (
        <g>
          <line x1={TRAP_X - 44} y1={BASE_Y + 2} x2={TRAP_X + 44} y2={BASE_Y + 2} stroke={VIZ_COLORS.coral} strokeWidth={2} strokeDasharray="4 4" />
          <Label x={TRAP_X} y={BASE_Y + 22} size={11} weight={700} tone="coral" anchor="middle">
            ✕ if poured now
          </Label>
          {state.trapPile.map((plate, level) => (
            <Plate key={`trap-${level}`} cx={TRAP_X} level={level} count={state.trapPile?.length ?? 0} plate={plate} tone={plate.tone} width={72} />
          ))}
        </g>
      ) : null}

      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 6} size={12} weight={600} tone="teal" anchor="middle">
          {state.note}
        </Label>
      ) : null}

      {state.left.map((_, level) => (
        <PickTarget key={`pick-l-${level}`} pick={pick} index={level} x={LEFT_X - PLATE_W / 2 - 4} y={plateY(level, state.left.length) - 2} width={PLATE_W + 8} height={PLATE_H + 4} label={`Choose plate ${state.left[level].value} in the ${state.leftTitle}`} />
      ))}
      {state.right.map((_, level) => (
        <PickTarget
          key={`pick-r-${level}`}
          pick={pick}
          index={state.left.length + level}
          x={RIGHT_X - PLATE_W / 2 - 4}
          y={plateY(level, state.right.length) - 2}
          width={PLATE_W + 8}
          height={PLATE_H + 4}
          label={`Choose plate ${state.right[level].value} in the ${state.rightTitle}`}
        />
      ))}
    </Frame>
  );
}
