import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for "connect every point as cheaply as possible": houses on a map, the cable network so far,
 * and a price tag on every house still outside. Click targets are the houses. Draws state only.
 */

export type PriceTagsState = {
  points: [number, number][];
  inNet: boolean[];
  /** Tag per house: the cheapest cable to the network. `null` = infinity. Hidden for houses in the network. `tags: false` hides all. */
  price: (number | null)[];
  tags: boolean;
  /** Which network house each tag's cable starts from. */
  from: (number | null)[];
  /** Cables already laid. */
  cables: [number, number][];
  /** The house that joined most recently. */
  newest: number | null;
  /** A cable being measured right now. */
  probe?: { from: number; to: number; cost: number; tone: "accent" | "coral" | "teal" } | null;
  /** The tag that just changed. */
  lowered?: number | null;
  /** The trap: the newest house's cable, drawn as the mistake. */
  trap?: { from: number; to: number; cost: number } | null;
  total: number | null;
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 270;
const AREA = { left: 48, right: 350, top: 58, bottom: 236 };
const RADIUS = 11;

export function PriceTagsView({ state, pick }: { state: PriceTagsState; pick?: CellPick }) {
  const { points, inNet, price, from, cables, newest, probe, trap } = state;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const px = (x: number) => (maxX === minX ? (AREA.left + AREA.right) / 2 : AREA.left + ((x - minX) / (maxX - minX)) * (AREA.right - AREA.left));
  const py = (y: number) => (maxY === minY ? (AREA.top + AREA.bottom) / 2 : AREA.bottom - ((y - minY) / (maxY - minY)) * (AREA.bottom - AREA.top));
  const at = (index: number) => ({ x: px(points[index][0]), y: py(points[index][1]) });
  const middle = (a: number, b: number) => ({ x: (at(a).x + at(b).x) / 2, y: (at(a).y + at(b).y) / 2 });

  const wire = (a: number, b: number, color: string, width: number, dashed: boolean, key: string) => (
    <line key={key} className={GLIDE} x1={at(a).x} y1={at(a).y} x2={at(b).x} y2={at(b).y} stroke={color} strokeWidth={width} strokeDasharray={dashed ? "5 4" : undefined} />
  );

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Houses on a map joined by cables; each outside house wears a price tag">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.total !== null ? (
        <Label x={WIDTH - 16} y={22} size={13} weight={600} tone="teal" anchor="end">
          network cost = {state.total}
        </Label>
      ) : null}

      {/* The cable each tag stands for: faint and dashed, so the eye can see which house it comes from. */}
      {state.tags
        ? points.map((_, index) => {
            const source = from[index];
            if (inNet[index] || source === null || price[index] === null) return null;
            return wire(source, index, VIZ_COLORS.muted, 1.25, true, `tag-wire-${index}`);
          })
        : null}
      {cables.map(([a, b]) => wire(a, b, VIZ_COLORS.teal, 3, false, `cable-${a}-${b}`))}
      {trap ? (
        <g>
          {wire(trap.from, trap.to, VIZ_COLORS.coral, 2.5, true, "trap")}
          <text x={middle(trap.from, trap.to).x} y={middle(trap.from, trap.to).y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
            ✕ {trap.cost}
          </text>
        </g>
      ) : null}
      {probe ? (
        <g>
          {wire(probe.from, probe.to, probe.tone === "coral" ? VIZ_COLORS.coral : probe.tone === "teal" ? VIZ_COLORS.teal : VIZ_COLORS.accent, 2.5, false, "probe")}
          <text
            x={middle(probe.from, probe.to).x}
            y={middle(probe.from, probe.to).y + 16}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={probe.tone === "coral" ? VIZ_COLORS.coral : probe.tone === "teal" ? VIZ_COLORS.teal : VIZ_COLORS.accent}
          >
            {probe.cost}
          </text>
        </g>
      ) : null}

      {points.map(([x, y], index) => {
        const { x: cx, y: cy } = at(index);
        const tone = pickTone(pick, index, "idle");
        const inside = inNet[index];
        let stroke: string = inside ? VIZ_COLORS.teal : VIZ_COLORS.muted;
        if (tone === "done") stroke = VIZ_COLORS.teal;
        if (tone === "miss") stroke = VIZ_COLORS.coral;
        const tag = price[index];
        const showTag = state.tags && !inside;
        const changed = state.lowered === index;
        return (
          <g key={`house-${index}`}>
            {index === newest ? <circle cx={cx} cy={cy} r={RADIUS + 5} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={2.5} /> : null}
            <circle
              className={GLIDE}
              cx={cx}
              cy={cy}
              r={RADIUS}
              fill={inside ? "color-mix(in srgb, var(--teal) 40%, transparent)" : "color-mix(in srgb, var(--foreground) 10%, transparent)"}
              stroke={stroke}
              strokeWidth={1.75}
            />
            <text x={cx} y={cy + RADIUS + 14} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
              ({x},{y})
            </text>
            {showTag ? (
              <g>
                <rect
                  className={GLIDE}
                  x={cx + RADIUS + 2}
                  y={cy - RADIUS - 16}
                  width={30}
                  height={18}
                  rx={5}
                  fill={changed ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--background)"}
                  stroke={changed ? VIZ_COLORS.accent : VIZ_COLORS.line}
                  strokeWidth={changed ? 1.75 : 1}
                />
                <text x={cx + RADIUS + 17} y={cy - RADIUS - 3} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                  {tag === null ? "∞" : tag}
                </text>
              </g>
            ) : null}
            <RejectedMark pick={pick} index={index} x={cx + RADIUS} y={cy + RADIUS + 2} />
          </g>
        );
      })}

      <g>
        <circle cx={414} cy={80} r={7} fill="color-mix(in srgb, var(--teal) 40%, transparent)" stroke={VIZ_COLORS.teal} strokeWidth={1.5} />
        <text x={428} y={84} fontSize={11} fill={VIZ_COLORS.ink}>
          in the network
        </text>
        <circle cx={414} cy={104} r={7} fill="color-mix(in srgb, var(--foreground) 10%, transparent)" stroke={VIZ_COLORS.muted} strokeWidth={1.5} />
        <text x={428} y={108} fontSize={11} fill={VIZ_COLORS.ink}>
          outside
        </text>
        <rect x={407} y={120} width={16} height={12} rx={3} fill="var(--background)" stroke={VIZ_COLORS.line} />
        <text x={428} y={130} fontSize={11} fill={VIZ_COLORS.ink}>
          price tag
        </text>
        <line x1={406} y1={150} x2={422} y2={150} stroke={VIZ_COLORS.teal} strokeWidth={3} />
        <text x={428} y={154} fontSize={11} fill={VIZ_COLORS.ink}>
          cable laid
        </text>
        <line x1={406} y1={172} x2={422} y2={172} stroke={VIZ_COLORS.muted} strokeWidth={1.25} strokeDasharray="5 4" />
        <text x={428} y={176} fontSize={11} fill={VIZ_COLORS.ink}>
          cable a tag means
        </text>
      </g>

      {points.map((_, index) => {
        const { x, y } = at(index);
        return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={x - RADIUS - 6} y={y - RADIUS - 6} width={2 * RADIUS + 12} height={2 * RADIUS + 12} rx={RADIUS + 6} label={`Choose the house at ${points[index][0]}, ${points[index][1]}`} />;
      })}
    </Frame>
  );
}
