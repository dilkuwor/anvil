import { VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";

/**
 * Shared behaviour for every story picture, so they all move, click and mark mistakes the same way.
 */

/** Gentle, never bouncy, and off entirely when the reader asks for reduced motion. Never use an inline `transition`. */
export const GLIDE = "transition-all duration-300 ease-out motion-reduce:transition-none";

/** A cell the reader clicked: teal if right, coral if wrong or already ruled out, otherwise its own tone. */
export function pickTone(pick: CellPick | undefined, index: number, tone: CellTone): CellTone {
  if (!pick) return tone;
  if (pick.picked === index && index === pick.answer) return "done";
  if (pick.picked === index || pick.rejected?.includes(index)) return "miss";
  return tone;
}

/** Small ✕ for a ruled-out cell. Put it inside the cell's corner, clear of any labels above or below. */
export function RejectedMark({ pick, index, x, y }: { pick: CellPick | undefined; index: number; x: number; y: number }) {
  if (!pick?.rejected?.includes(index)) return null;
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
      ✕
    </text>
  );
}

/**
 * Transparent click target. Render these LAST so they sit on top of the drawing.
 * Works for boxes, bars and round nodes alike: give it the bounding box of the thing to click.
 */
export function PickTarget({
  pick,
  index,
  x,
  y,
  width,
  height,
  label,
  rx = 8,
}: {
  pick: CellPick | undefined;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** What a screen reader hears, e.g. "Choose bar 3". */
  label: string;
  rx?: number;
}) {
  if (!pick) return null;
  const solved = pick.picked === pick.answer;
  const rejected = pick.rejected?.includes(index) ?? false;
  const live = !solved && !rejected;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      fill="transparent"
      strokeWidth={2}
      role="button"
      tabIndex={live ? 0 : -1}
      aria-label={label}
      aria-disabled={!live}
      className={
        live
          ? "cursor-pointer outline-none hover:fill-[color-mix(in_srgb,var(--accent)_14%,transparent)] focus-visible:stroke-[var(--accent)]"
          : "cursor-default outline-none"
      }
      onClick={() => live && pick.onPick(index)}
      onKeyDown={(event) => {
        if (live && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          pick.onPick(index);
        }
      }}
    />
  );
}
