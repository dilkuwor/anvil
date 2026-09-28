import { Frame, Label, VIZ_COLORS } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for "split the nodes into two groups": guests on an oval, a line between two guests who argue,
 * and two tables on the right. Click targets: guests are 0..n-1, table A is n, table B is n + 1. Draws state only.
 */

export type TwoTablesState = {
  n: number;
  /** Each argument once, as [smaller, bigger]. */
  edges: [number, number][];
  /** 0 = no table yet, 1 = table A, -1 = table B. */
  table: number[];
  /** The guest who just left the waiting line. */
  active: number | null;
  /** The guest we are looking at, who argues with the active one. */
  look: number | null;
  /** The waiting line, front first. `null` hides it. */
  line: number[] | null;
  /** Two guests who argue and share a table. */
  clash: [number, number] | null;
  /** An argument just checked and found fine. */
  fine?: [number, number] | null;
  /** The trap: guests nobody has seated yet. */
  unseated?: number[];
  counter?: { label: string; value: number } | null;
};

const WIDTH = 560;
const HEIGHT = 270;
const CENTER = { x: 196, y: 142 };
const PANEL_X = 400;
const TABLE_W = 144;
const TABLE_H = 52;
const TABLE_A_Y = 44;
const TABLE_B_Y = 108;

const FILL_A = "color-mix(in srgb, var(--teal) 32%, transparent)";
const FILL_B = "color-mix(in srgb, var(--foreground) 20%, transparent)";
const STROKE_B = "var(--foreground)";

const same = (pair: [number, number] | null | undefined, a: number, b: number) => !!pair && ((pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a));

export function TwoTablesView({ state, pick }: { state: TwoTablesState; pick?: CellPick }) {
  const { n, edges, table, active, look, clash, fine, unseated = [] } = state;
  const radius = n > 6 ? 17 : 20;
  const place = (index: number) => {
    if (n === 1) return CENTER;
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
    return { x: CENTER.x + 150 * Math.cos(angle), y: CENTER.y + 88 * Math.sin(angle) };
  };
  const guests = (side: number) => table.map((value, index) => (value === side ? index : -1)).filter((index) => index >= 0);

  const tableBox = (side: 1 | -1, y: number, index: number) => {
    const tone = pickTone(pick, index, "idle");
    const list = guests(side);
    return (
      <g key={`table-${side}`}>
        <rect
          className={GLIDE}
          x={PANEL_X}
          y={y}
          width={TABLE_W}
          height={TABLE_H}
          rx={10}
          fill={tone === "done" ? "color-mix(in srgb, var(--teal) 45%, transparent)" : side === 1 ? "color-mix(in srgb, var(--teal) 10%, transparent)" : "color-mix(in srgb, var(--foreground) 6%, transparent)"}
          stroke={tone === "miss" ? VIZ_COLORS.coral : side === 1 ? VIZ_COLORS.teal : STROKE_B}
          strokeWidth={1.75}
        />
        <text x={PANEL_X + 10} y={y + 18} fontSize={12} fontWeight={700} fill={VIZ_COLORS.ink}>
          table {side === 1 ? "A" : "B"}
        </text>
        <text x={PANEL_X + 10} y={y + 40} fontSize={13} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          {list.length ? list.join("  ") : "(empty)"}
        </text>
        <RejectedMark pick={pick} index={index} x={PANEL_X + TABLE_W - 10} y={y + 14} />
      </g>
    );
  };

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Guests drawn as circles; a line joins two guests who argue; two tables on the right">
      {state.counter ? (
        <Label x={16} y={22} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {edges.map(([a, b]) => {
        const from = place(a);
        const to = place(b);
        const isClash = same(clash, a, b);
        const isFine = same(fine, a, b);
        const isLook = active !== null && look !== null && same([active, look], a, b);
        const stroke = isClash ? VIZ_COLORS.coral : isFine ? VIZ_COLORS.teal : isLook ? VIZ_COLORS.accent : VIZ_COLORS.line;
        return (
          <line
            key={`${a}-${b}`}
            className={GLIDE}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={stroke}
            strokeWidth={isClash || isFine || isLook ? 3 : 1.5}
          />
        );
      })}
      {clash ? (
        <text x={(place(clash[0]).x + place(clash[1]).x) / 2} y={(place(clash[0]).y + place(clash[1]).y) / 2 - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={VIZ_COLORS.coral}>
          ✕ same table
        </text>
      ) : null}

      {Array.from({ length: n }, (_, index) => {
        const { x, y } = place(index);
        const tone = pickTone(pick, index, "idle");
        const side = table[index];
        const fill = side === 1 ? FILL_A : side === -1 ? FILL_B : "transparent";
        const lost = unseated.includes(index);
        let stroke: string = side === 1 ? VIZ_COLORS.teal : side === -1 ? STROKE_B : VIZ_COLORS.muted;
        if (lost) stroke = VIZ_COLORS.coral;
        if (tone === "done") stroke = VIZ_COLORS.teal;
        if (tone === "miss") stroke = VIZ_COLORS.coral;
        return (
          <g key={`guest-${index}`}>
            {index === active || index === look ? (
              <circle cx={x} cy={y} r={radius + 6} fill="none" stroke={VIZ_COLORS.accent} strokeWidth={2.5} strokeDasharray={index === look ? "4 3" : undefined} />
            ) : null}
            <circle className={GLIDE} cx={x} cy={y} r={radius} fill={fill} stroke={stroke} strokeWidth={lost ? 2.25 : 1.75} strokeDasharray={lost ? "4 3" : undefined} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
              {index}
            </text>
            {side !== 0 ? (
              <text x={x + radius + 3} y={y - radius + 6} fontSize={11} fontWeight={700} fill={side === 1 ? VIZ_COLORS.teal : STROKE_B}>
                {side === 1 ? "A" : "B"}
              </text>
            ) : null}
            {lost ? (
              <text x={x} y={y + radius + 14} textAnchor="middle" fontSize={10} fontWeight={700} fill={VIZ_COLORS.coral}>
                no table
              </text>
            ) : null}
            <RejectedMark pick={pick} index={index} x={x + radius - 2} y={y + radius} />
          </g>
        );
      })}

      {tableBox(1, TABLE_A_Y, n)}
      {tableBox(-1, TABLE_B_Y, n + 1)}

      {state.line ? (
        <g>
          <text x={PANEL_X} y={186} fontSize={12} fontWeight={600} fill={VIZ_COLORS.ink}>
            waiting line
          </text>
          <text x={PANEL_X} y={208} fontSize={13} fontWeight={600} fill={VIZ_COLORS.accent} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            {state.line.length ? state.line.join(" ← ") : "(empty)"}
          </text>
        </g>
      ) : null}

      {Array.from({ length: n }, (_, index) => {
        const { x, y } = place(index);
        return <PickTarget key={`pick-${index}`} pick={pick} index={index} x={x - radius - 4} y={y - radius - 4} width={2 * radius + 8} height={2 * radius + 8} rx={radius + 4} label={`Choose guest ${index}`} />;
      })}
      <PickTarget pick={pick} index={n} x={PANEL_X} y={TABLE_A_Y} width={TABLE_W} height={TABLE_H} rx={10} label="Choose table A" />
      <PickTarget pick={pick} index={n + 1} x={PANEL_X} y={TABLE_B_Y} width={TABLE_W} height={TABLE_H} rx={10} label="Choose table B" />
    </Frame>
  );
}
