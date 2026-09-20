import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/** Picture for "this course must come before that one": dominoes joined by arrows, and a line of free dominoes. Draws state only. */

export type CourseGraphState = {
  numCourses: number;
  /** [from, to]: `from` must be finished before `to` can start. */
  edges: [number, number][];
  /** How many unfinished courses still block each one. `null` hides the numbers. */
  blockedBy: number[] | null;
  /** Dominoes that have fallen (courses taken), in order. */
  fallen: number[];
  /** The line of free dominoes, in order. `null` hides the line. */
  free: number[] | null;
  /** The domino falling (or being looked at) right now. */
  active?: number | null;
  /** The domino whose blocker count just changed. */
  touched?: number | null;
  /** Dominoes that block each other in a circle. */
  stuck?: number[];
  /** Slow scene: every course visited on the current walk back. */
  walked?: number[];
  /** Courses the caption points at. */
  mark?: { nodes: number[]; tone: "teal" | "coral" } | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 260;
const CENTER = { x: 280, y: 122 };
const LINE_Y = 214;

type Point = { x: number; y: number };

/** Where the straight line from a box's centre towards `target` leaves the box. */
function leaveBox(center: Point, target: Point, halfWidth: number, halfHeight: number, pad: number): Point {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const length = Math.hypot(dx, dy) || 1;
  const scale = Math.min(dx === 0 ? Infinity : halfWidth / Math.abs(dx), dy === 0 ? Infinity : halfHeight / Math.abs(dy));
  return { x: center.x + dx * scale + (dx / length) * pad, y: center.y + dy * scale + (dy / length) * pad };
}

export function CourseGraphView({ state, pick }: { state: CourseGraphState; pick?: CellPick }) {
  const { numCourses: count, edges, blockedBy, fallen, free, active, touched, stuck = [], walked = [] } = state;
  const small = count > 6;
  const boxWidth = small ? 60 : 76;
  const boxHeight = small ? 34 : 40;
  const halfWidth = boxWidth / 2;
  const halfHeight = boxHeight / 2;

  // Dominoes stand on an oval, so an arrow between two of them never runs through a third.
  const place = (index: number): Point => {
    if (count === 1) return CENTER;
    const angle = Math.PI - (index * 2 * Math.PI) / count;
    return { x: CENTER.x + 200 * Math.cos(angle), y: CENTER.y - (count === 2 ? 0 : 56) * Math.sin(angle) };
  };
  const hasEdge = (from: number, to: number) => edges.some(([a, b]) => a === from && b === to);

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Courses drawn as dominoes; an arrow means this one must fall before that one">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : stuck.length > 0 ? (
        <Label x={16} y={22} size={13} weight={700} tone="coral">
          ✕ stuck in a circle
        </Label>
      ) : null}
      {blockedBy ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          fell: {fallen.length} of {count}
        </Label>
      ) : null}

      {edges.map(([from, to], index) => {
        const a = place(from);
        const b = place(to);
        const gone = fallen.includes(from) && from !== active;
        const inCircle = stuck.includes(from) && stuck.includes(to);
        const color = inCircle ? VIZ_COLORS.coral : from === active ? VIZ_COLORS.accent : VIZ_COLORS.muted;
        // Two arrows between the same pair bend away from each other instead of lying on top of each other.
        const twoWay = hasEdge(to, from);
        const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const bend = twoWay ? 34 : 0;
        const control = { x: (a.x + b.x) / 2 + (-(b.y - a.y) / length) * bend, y: (a.y + b.y) / 2 + ((b.x - a.x) / length) * bend };
        const start = leaveBox(a, twoWay ? control : b, halfWidth, halfHeight, 2);
        const end = leaveBox(b, twoWay ? control : a, halfWidth, halfHeight, 4);
        const tx = end.x - control.x;
        const ty = end.y - control.y;
        const tl = Math.hypot(tx, ty) || 1;
        const ux = tx / tl;
        const uy = ty / tl;
        return (
          <g key={`edge-${index}`} className={GLIDE} opacity={gone ? 0.25 : 1}>
            <path d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x - ux * 6} ${end.y - uy * 6}`} fill="none" stroke={color} strokeWidth={inCircle || from === active ? 2.25 : 1.5} />
            <path d={`M${end.x} ${end.y} L${end.x - ux * 9 - uy * 4.5} ${end.y - uy * 9 + ux * 4.5} L${end.x - ux * 9 + uy * 4.5} ${end.y - uy * 9 - ux * 4.5} Z`} fill={color} />
          </g>
        );
      })}

      {Array.from({ length: count }, (_, index) => {
        const { x, y } = place(index);
        const picked = pickTone(pick, index, "idle");
        const fell = fallen.includes(index);
        const isFree = free?.includes(index) ?? false;
        const marked = state.mark?.nodes.includes(index) ? state.mark.tone : null;

        let stroke: string = VIZ_COLORS.line;
        let fill = "var(--steel-900)";
        if (marked === "teal" || isFree) stroke = VIZ_COLORS.teal;
        if (walked.includes(index) || touched === index) stroke = VIZ_COLORS.accent;
        if (fell) {
          stroke = VIZ_COLORS.teal;
          fill = "color-mix(in srgb, var(--teal) 22%, var(--steel-900))";
        }
        if (active === index) {
          stroke = VIZ_COLORS.accent;
          fill = "color-mix(in srgb, var(--accent) 35%, var(--steel-900))";
        }
        if (marked === "coral" || stuck.includes(index)) {
          stroke = VIZ_COLORS.coral;
          fill = "color-mix(in srgb, var(--coral) 16%, var(--steel-900))";
        }
        if (picked === "done") {
          stroke = VIZ_COLORS.teal;
          fill = "color-mix(in srgb, var(--teal) 40%, var(--steel-900))";
        }
        if (picked === "miss") stroke = VIZ_COLORS.coral;

        const status = !blockedBy ? null : fell ? (active === index ? "falls" : "fell") : isFree ? "free" : `blocked by ${blockedBy[index] ?? 0}`;
        return (
          <g key={index} className={GLIDE} opacity={fell && active !== index && picked === "idle" ? 0.55 : 1}>
            <rect className={GLIDE} x={x - halfWidth} y={y - halfHeight} width={boxWidth} height={boxHeight} rx={9} fill={fill} stroke={stroke} strokeWidth={stroke === VIZ_COLORS.line ? 1.25 : 2.25} />
            <text x={x} y={status ? y - 2 : y + 4} textAnchor="middle" fontSize={small ? 11 : 12} fontWeight={700} fill={VIZ_COLORS.ink}>
              course {index}
            </text>
            {status ? (
              <text x={x} y={y + 12} textAnchor="middle" fontSize={small ? 9 : 10} fontWeight={500} fill={fell || isFree ? VIZ_COLORS.teal : VIZ_COLORS.ink}>
                {status}
              </text>
            ) : null}
            <RejectedMark pick={pick} index={index} x={x + halfWidth - 7} y={y - halfHeight + 11} />
          </g>
        );
      })}

      {free ? (
        <g>
          <rect x={16} y={LINE_Y} width={WIDTH - 32} height={34} rx={8} fill="none" stroke={VIZ_COLORS.line} strokeWidth={1} />
          <text x={28} y={LINE_Y + 21} fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink}>
            free line
          </text>
          {free.length === 0 ? (
            <text x={100} y={LINE_Y + 21} fontSize={12} fill={stuck.length > 0 ? VIZ_COLORS.coral : VIZ_COLORS.muted}>
              (empty)
            </text>
          ) : null}
          {free.slice(0, 6).map((course, index) => (
            <g key={course}>
              <rect x={100 + index * 72} y={LINE_Y + 6} width={64} height={22} rx={6} fill="color-mix(in srgb, var(--teal) 18%, transparent)" stroke={VIZ_COLORS.teal} strokeWidth={1.5} />
              <text x={132 + index * 72} y={LINE_Y + 21} textAnchor="middle" fontSize={11} fontWeight={600} fill={VIZ_COLORS.ink}>
                course {course}
              </text>
            </g>
          ))}
        </g>
      ) : null}

      {Array.from({ length: count }, (_, index) => {
        const { x, y } = place(index);
        return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={x - halfWidth - 3} y={y - halfHeight - 3} width={boxWidth + 6} height={boxHeight + 6} rx={11} label={`Choose course ${index}`} />;
      })}
    </Frame>
  );
}
