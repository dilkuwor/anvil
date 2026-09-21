import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * A row of letters between two walls. A pebble drops on a middle (a letter, or the gap between two letters)
 * and a ripple grows outwards from it, one letter on each side at a time. Draws state only.
 *
 * Click targets: letter i is cell i; the gap after letter g is cell chars.length + g.
 */

type Ink = "teal" | "coral" | "accent";

export type CentresState = {
  chars: string[];
  tones: CellTone[];
  /** Where the pebble dropped, in half steps: 2·i is letter i, 2·i + 1 is the gap after letter i. */
  centre: number | null;
  /** The ripple: the letters from `left` to `right`. */
  ripple: { left: number; right: number; tone: Ink } | null;
  /** The two letters the ripple must reach next. -1 and chars.length are the walls. */
  reach: { left: number; right: number; verdict: "same" | "differ" | "wall" } | null;
  /** Every palindrome found so far, in the order found. The last `fresh` of them are new. */
  found: string[] | null;
  fresh: number;
  total: number | null;
  counter: { label: string; value: number } | null;
  badge: { text: string; tone: Ink } | null;
  note: { text: string; tone: Ink | "muted" } | null;
};

const WIDTH = 560;
const HEIGHT = 252;
const ROW_Y = 86;
const GAP = 26;

const INK: Record<Ink, string> = { teal: VIZ_COLORS.teal, coral: VIZ_COLORS.coral, accent: VIZ_COLORS.accent };
const TONE_INK: Record<CellTone, string> = {
  idle: VIZ_COLORS.muted,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  done: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  faded: VIZ_COLORS.muted,
};

export function AgyDp3CentresView({ state, pick }: { state: CentresState; pick?: CellPick }) {
  const count = Math.max(state.chars.length, 1);
  const pitch = Math.min(70, (WIDTH - 110) / count);
  const size = pitch - GAP;
  const startX = (WIDTH - (count * pitch - GAP)) / 2;
  const cellX = (index: number) => startX + index * pitch;
  // Letters sit at whole steps, gaps and the two walls at half steps.
  const middleX = (halfSteps: number) => startX + size / 2 + (halfSteps * pitch) / 2;
  const spotX = (index: number) => (index < 0 ? middleX(-1) : index >= count ? middleX(2 * count - 1) : cellX(index) + size / 2);
  const bottom = ROW_Y + size;
  const { reach, ripple } = state;
  const reachInk = reach ? (reach.verdict === "same" ? VIZ_COLORS.teal : VIZ_COLORS.coral) : VIZ_COLORS.muted;
  const wallHit = (index: number) => reach?.verdict === "wall" && reach !== null && (index < 0 ? reach.left < 0 : reach.right >= count);
  const shown = state.found ? state.found.slice(-9) : [];
  const hidden = state.found ? state.found.length - shown.length : 0;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="A row of letters, a pebble dropped on a middle, and a ripple growing outwards from it">
      {state.counter ? (
        <Label x={16} y={24} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : state.badge ? (
        <Label x={16} y={24} size={13} weight={700} tone={state.badge.tone}>
          {state.badge.text}
        </Label>
      ) : null}
      {state.total !== null ? (
        <Label x={WIDTH - 16} y={24} size={13} weight={700} tone="teal" anchor="end">
          palindromes found: {state.total}
        </Label>
      ) : null}

      {/* The ripple, behind the letters. */}
      {ripple && ripple.right >= ripple.left ? (
        <rect
          x={cellX(ripple.left) - 7}
          y={ROW_Y - 7}
          width={cellX(ripple.right) + size + 7 - (cellX(ripple.left) - 7)}
          height={size + 14}
          rx={12}
          fill={`color-mix(in srgb, ${INK[ripple.tone]} 14%, transparent)`}
          stroke={INK[ripple.tone]}
          strokeWidth={2}
        />
      ) : null}

      {/* The two walls. */}
      {[-1, count].map((index) => (
        <g key={`wall-${index}`}>
          <rect x={spotX(index) - 4} y={ROW_Y - 6} width={8} height={size + 12} rx={2} fill={wallHit(index) ? VIZ_COLORS.coral : VIZ_COLORS.line} />
          <text x={spotX(index)} y={bottom + 14} textAnchor="middle" fontSize={10} fill={wallHit(index) ? VIZ_COLORS.coral : VIZ_COLORS.muted}>
            wall
          </text>
        </g>
      ))}

      {state.chars.map((letter, index) => (
        <g key={`letter-${index}`}>
          <Cell x={cellX(index)} y={ROW_Y} size={size} value={letter} tone={pickTone(pick, index, state.tones[index] ?? "idle")} caption={String(index)} />
          <RejectedMark pick={pick} index={index} x={cellX(index) + size - 7} y={ROW_Y + 11} />
        </g>
      ))}

      {/* A small dot in every gap: a gap is a place too. */}
      {state.chars.slice(0, -1).map((_, gap) => {
        const tone = pickTone(pick, count + gap, "idle");
        return (
          <g key={`gap-${gap}`}>
            <circle cx={middleX(2 * gap + 1)} cy={ROW_Y + size / 2} r={tone === "idle" ? 3 : 5} fill={TONE_INK[tone]} />
            <RejectedMark pick={pick} index={count + gap} x={middleX(2 * gap + 1)} y={ROW_Y + 8} />
          </g>
        );
      })}

      {/* The pebble: where the middle is. */}
      <g className={GLIDE} style={{ transform: `translate(${middleX(state.centre ?? 0)}px, ${ROW_Y - 12}px)`, opacity: state.centre === null ? 0 : 1 }}>
        <path d="M0 0 L-6 -9 L6 -9 Z" fill={VIZ_COLORS.accent} />
        <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={VIZ_COLORS.accent}>
          pebble
        </text>
      </g>

      {/* The two letters the ripple has to reach, joined under the row. */}
      {reach ? (
        <g>
          <path
            d={`M${spotX(reach.left)} ${bottom + 20} V${bottom + 32} H${spotX(reach.right)} V${bottom + 20}`}
            fill="none"
            stroke={reachInk}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x={(spotX(reach.left) + spotX(reach.right)) / 2} y={bottom + 48} textAnchor="middle" fontSize={12} fontWeight={700} fill={reachInk}>
            {reach.verdict === "same" ? "same: grow" : reach.verdict === "differ" ? "✕ differ: stop" : "✕ wall: stop"}
          </text>
        </g>
      ) : null}

      {state.found ? (
        <text x={16} y={HEIGHT - 38} fontSize={12.5} fill={VIZ_COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <tspan fontWeight={600}>found: </tspan>
          {hidden > 0 ? <tspan>… </tspan> : null}
          {shown.map((word, index) => (
            <tspan key={`${word}-${index}`} fill={index >= shown.length - state.fresh ? VIZ_COLORS.teal : VIZ_COLORS.ink} fontWeight={index >= shown.length - state.fresh ? 700 : 500}>
              {`"${word}" `}
            </tspan>
          ))}
        </text>
      ) : null}
      {state.note ? (
        <Label x={WIDTH / 2} y={HEIGHT - 12} size={12.5} weight={700} tone={state.note.tone} anchor="middle">
          {state.note.text}
        </Label>
      ) : null}

      {state.chars.map((letter, index) => (
        <PickTarget key={`pick-${index}`} pick={pick} index={index} x={cellX(index) - 2} y={ROW_Y - 2} width={size + 4} height={size + 4} label={`Choose the letter ${letter} at index ${index}`} />
      ))}
      {state.chars.slice(0, -1).map((letter, gap) => (
        <PickTarget key={`pick-gap-${gap}`} pick={pick} index={count + gap} x={cellX(gap) + size + 3} y={ROW_Y - 2} width={GAP - 6} height={size + 4} rx={6} label={`Choose the gap between ${letter} and ${state.chars[gap + 1]}`} />
      ))}
    </Frame>
  );
}
