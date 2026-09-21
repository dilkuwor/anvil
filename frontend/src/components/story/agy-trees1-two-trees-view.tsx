import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import { stripItemWidth, type TreeEdgeMark, type TreeShapeNode, type TreeStrip } from "./tree-story-view";
import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for stories that compare two spots at a time: two trees side by side (same tree),
 * or the two halves of one tree (mirror). Draws state only.
 * It speaks the same colour language as tree-story-view, and adds what that view cannot show:
 * a second tree, and empty spots drawn as dashed circles that can be pointed at.
 */

/** A missing child, drawn as a dashed circle. Every listed hole keeps its place in the layout, so the trees never jump. */
export type PairHole = {
  parent: number;
  side: "left" | "right";
  tone: CellTone;
  /** A hidden hole still reserves its place. */
  show: boolean;
};

/** Where a walker stands: on a node, or on one of the panel's holes. */
export type PairSpot = { kind: "node"; id: number } | { kind: "hole"; index: number };

export type PairPanel = {
  /** Printed in the panel's corner, e.g. "tree p". Empty for a single tree. */
  title: string;
  tree: TreeShapeNode[];
  /** One per node, by id. */
  tones: CellTone[];
  /** One per node, by CHILD id: the edge from that node up to its parent. */
  edges: TreeEdgeMark[];
  holes: PairHole[];
  /** A ring around the spot where this panel's walkers stand. */
  walkers: PairSpot[];
};

export type TwoTreesState = {
  panels: PairPanel[];
  /** A dashed line straight down from the top node: the mirror. Only for a single tree. */
  mirror: boolean;
  /** The report leaving the top. Coral when it is bad news. */
  out: { text: string; tone: "teal" | "coral" } | null;
  strips: TreeStrip[];
  counter: { label: string; value: number } | null;
  note: { text: string; tone: "accent" | "teal" | "coral" } | null;
};

const WIDTH = 560;
const TOP = 70;
const STRIP_HEIGHT = 40;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function blankPanel(title: string, tree: TreeShapeNode[], holes: PairHole[]): PairPanel {
  return { title, tree, tones: tree.map(() => "idle"), edges: tree.map(() => ({ tone: "idle" })), holes: holes.map((hole) => ({ ...hole })), walkers: [] };
}

/** The click index of a spot. Cells run panel by panel: first the panel's nodes by id, then its holes. */
export function pairCell(panels: PairPanel[], panel: number, spot: PairSpot): number {
  let offset = 0;
  for (let at = 0; at < panel; at++) offset += panels[at].tree.length + panels[at].holes.length;
  return spot.kind === "node" ? offset + spot.id : offset + panels[panel].tree.length + spot.index;
}

export function pairCellCount(panels: PairPanel[]): number {
  return panels.reduce((sum, panel) => sum + panel.tree.length + panel.holes.length, 0);
}

type Point = { x: number; y: number };

/**
 * x comes from a left-to-right walk that counts the holes too, y from the depth.
 * So nothing shares a column, and an empty spot sits exactly where the missing child would hang.
 */
function layoutPanel(panel: PairPanel, left: number, width: number, maxSlot: number, gap: number): { nodes: Point[]; holes: Point[] } {
  const { tree, holes } = panel;
  const order: PairSpot[] = [];
  const walk = (id: number) => {
    const side = (name: "left" | "right") => {
      const child = tree[id][name];
      const hole = holes.findIndex((item) => item.parent === id && item.side === name);
      if (child !== null) walk(child);
      else if (hole >= 0) order.push({ kind: "hole", index: hole });
    };
    side("left");
    order.push({ kind: "node", id });
    side("right");
  };
  if (tree.length > 0) walk(0);
  const slot = Math.min(maxSlot, (width - 36) / Math.max(1, order.length));
  const start = left + (width - slot * order.length) / 2;
  const nodes: Point[] = tree.map(() => ({ x: left + width / 2, y: TOP }));
  const spots: Point[] = holes.map(() => ({ x: left + width / 2, y: TOP }));
  order.forEach((spot, rank) => {
    const x = start + slot * (rank + 0.5);
    if (spot.kind === "node") nodes[spot.id] = { x, y: TOP + tree[spot.id].depth * gap };
    else spots[spot.index] = { x, y: TOP + (tree[holes[spot.index].parent].depth + 1) * gap };
  });
  return { nodes, holes: spots };
}

const NODE_FILL: Record<CellTone, string> = {
  idle: "transparent",
  window: "color-mix(in srgb, var(--accent) 16%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 22%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
  done: "color-mix(in srgb, var(--teal) 48%, transparent)",
  faded: "transparent",
};

const NODE_STROKE: Record<CellTone, string> = {
  idle: VIZ_COLORS.line,
  window: VIZ_COLORS.accent,
  edge: VIZ_COLORS.accent,
  hit: VIZ_COLORS.teal,
  miss: VIZ_COLORS.coral,
  done: VIZ_COLORS.teal,
  faded: VIZ_COLORS.line,
};

const EDGE_STROKE: Record<TreeEdgeMark["tone"], string> = {
  idle: VIZ_COLORS.line,
  path: VIZ_COLORS.accent,
  report: VIZ_COLORS.teal,
  empty: VIZ_COLORS.line,
  skipped: VIZ_COLORS.coral,
};

export function TwoTreesView({ state, pick }: { state: TwoTreesState; pick?: CellPick }) {
  const { panels } = state;
  const two = panels.length > 1;
  const radius = two ? 14 : 15;
  const holeRadius = radius - 3;
  const panelWidth = WIDTH / Math.max(1, panels.length);
  const deepest = Math.max(
    0,
    ...panels.flatMap((panel) => [...panel.tree.map((node) => node.depth), ...panel.holes.map((hole) => panel.tree[hole.parent].depth + 1)]),
  );
  const gap = deepest <= 3 ? 50 : Math.max(36, 160 / deepest);
  const stripsTop = TOP + deepest * gap + radius + 24;
  const height = stripsTop + state.strips.length * STRIP_HEIGHT + 4;
  const layouts = panels.map((panel, index) => layoutPanel(panel, index * panelWidth, panelWidth, two ? 40 : 52, gap));

  return (
    <Frame width={WIDTH} height={height} label={two ? "Two binary trees, side by side" : "A binary tree with a mirror line down its middle"}>
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone={state.note.tone} anchor="end">
          {state.note.text}
        </Label>
      ) : null}

      {two ? <line x1={panelWidth} y1={34} x2={panelWidth} y2={stripsTop - 14} stroke={VIZ_COLORS.line} strokeWidth={1} strokeOpacity={0.6} /> : null}

      {panels.map((panel, at) => {
        const spots = layouts[at];
        const top = spots.nodes[0];
        return (
          <g key={`panel-${at}`}>
            {panel.title ? (
              <Label x={at * panelWidth + 14} y={44} size={12} weight={600}>
                {panel.title}
              </Label>
            ) : null}

            {state.mirror && top ? <line x1={top.x} y1={top.y + radius + 3} x2={top.x} y2={stripsTop - 16} stroke={VIZ_COLORS.muted} strokeWidth={1} strokeDasharray="2 5" /> : null}

            {/* Edges stop at the rim of each circle, so nothing shows through a node. */}
            {panel.tree.map((node) => {
              if (node.parent === null) return null;
              const mark = panel.edges[node.id] ?? { tone: "idle" };
              const strong = mark.tone === "path" || mark.tone === "report";
              return (
                <Link
                  key={`edge-${node.id}`}
                  from={spots.nodes[node.parent]}
                  to={spots.nodes[node.id]}
                  fromRadius={radius}
                  toRadius={radius}
                  stroke={EDGE_STROKE[mark.tone]}
                  width={strong ? 2.75 : 1.25}
                  dashed={mark.tone === "empty" || mark.tone === "skipped"}
                  opacity={mark.tone === "empty" ? 0.45 : 1}
                />
              );
            })}

            {/* An empty spot hangs from its parent on a faint dashed link. */}
            {panel.holes.map((hole, index) =>
              hole.show ? (
                <Link key={`hole-edge-${index}`} from={spots.nodes[hole.parent]} to={spots.holes[index]} fromRadius={radius} toRadius={holeRadius} stroke={hole.tone === "miss" ? VIZ_COLORS.coral : VIZ_COLORS.line} width={1.25} dashed opacity={0.8} />
              ) : null,
            )}

            {state.out !== null && top ? (
              <g>
                <line x1={top.x} y1={top.y - radius} x2={top.x} y2={top.y - radius - 10} stroke={VIZ_COLORS[state.out.tone]} strokeWidth={2.75} />
                <path d={`M${top.x} ${top.y - radius - 17} l-5 8 l10 0 Z`} fill={VIZ_COLORS[state.out.tone]} />
                <ReportBadge x={top.x + 10 + stripItemWidth(state.out.text) / 2 - 4} y={top.y - radius - 9} text={state.out.text} color={VIZ_COLORS[state.out.tone]} />
              </g>
            ) : null}

            {panel.tree.map((node) => {
              const { x, y } = spots.nodes[node.id];
              const cell = pairCell(panels, at, { kind: "node", id: node.id });
              const tone = pickTone(pick, cell, panel.tones[node.id] ?? "idle");
              const ringed = panel.walkers.some((spot) => spot.kind === "node" && spot.id === node.id);
              return (
                <g key={`node-${node.id}`} className={GLIDE} style={{ opacity: tone === "faded" ? 0.35 : 1 }}>
                  {ringed ? <circle cx={x} cy={y} r={radius + 4} fill="none" stroke={VIZ_COLORS.ink} strokeWidth={1.5} /> : null}
                  <circle className={GLIDE} cx={x} cy={y} r={radius} fill={NODE_FILL[tone]} stroke={NODE_STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 2} />
                  <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                    {node.val}
                  </text>
                  <RejectedMark pick={pick} index={cell} x={x + radius + 6} y={y + radius - 1} />
                </g>
              );
            })}

            {panel.holes.map((hole, index) => {
              if (!hole.show) return null;
              const { x, y } = spots.holes[index];
              const cell = pairCell(panels, at, { kind: "hole", index });
              const tone = pickTone(pick, cell, hole.tone);
              const ringed = panel.walkers.some((spot) => spot.kind === "hole" && spot.index === index);
              return (
                <g key={`hole-${index}`} className={GLIDE}>
                  {ringed ? <circle cx={x} cy={y} r={holeRadius + 4} fill="none" stroke={VIZ_COLORS.ink} strokeWidth={1.5} /> : null}
                  <circle className={GLIDE} cx={x} cy={y} r={holeRadius} fill={NODE_FILL[tone]} stroke={tone === "idle" ? VIZ_COLORS.muted : NODE_STROKE[tone]} strokeWidth={1.5} strokeDasharray="3 3" />
                  <RejectedMark pick={pick} index={cell} x={x + holeRadius + 6} y={y + holeRadius - 1} />
                </g>
              );
            })}

            {/* Badges beside their edge, in the empty band between two levels. */}
            {panel.tree.map((node) => {
              const mark = panel.edges[node.id];
              if (node.parent === null || !mark?.badge) return null;
              const from = spots.nodes[node.parent];
              const to = spots.nodes[node.id];
              const outward = to.x >= from.x ? 1 : -1;
              const width = stripItemWidth(mark.badge) - 4;
              const along = 0.42;
              // A report on a coral edge is bad news, so its badge is coral too.
              return <ReportBadge key={`badge-${node.id}`} x={from.x + (to.x - from.x) * along + outward * (width / 2 + 5)} y={from.y + (to.y - from.y) * along} text={mark.badge} color={mark.tone === "skipped" ? VIZ_COLORS.coral : VIZ_COLORS.teal} />;
            })}
          </g>
        );
      })}

      {state.strips.map((strip, row) => {
        if (!strip.label) return null;
        const y = stripsTop + row * STRIP_HEIGHT;
        let x = 92;
        return (
          <g key={`strip-${row}`}>
            <Label x={16} y={y + 16} size={12} weight={600}>
              {strip.label}
            </Label>
            {strip.items.length === 0 ? (
              <Label x={92} y={y + 16} size={12}>
                (empty)
              </Label>
            ) : null}
            {strip.items.map((item, index) => {
              const width = stripItemWidth(item.text);
              const left = x;
              x += width + 6;
              return (
                <g key={index} className={GLIDE} style={{ opacity: item.tone === "faded" ? 0.4 : 1 }}>
                  <rect x={left} y={y} width={width} height={24} rx={7} fill={NODE_FILL[item.tone]} stroke={NODE_STROKE[item.tone]} strokeWidth={item.tone === "idle" || item.tone === "faded" ? 1 : 1.75} />
                  <text x={left + width / 2} y={y + 16.5} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                    {item.text}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Click targets sit on top, only while the reader is asked to point at a spot. */}
      {panels.map((panel, at) => (
        <g key={`picks-${at}`}>
          {panel.tree.map((node) => {
            const { x, y } = layouts[at].nodes[node.id];
            return (
              <PickTarget
                key={`pick-node-${node.id}`}
                pick={pick}
                index={pairCell(panels, at, { kind: "node", id: node.id })}
                x={x - radius - 3}
                y={y - radius - 3}
                width={radius * 2 + 6}
                height={radius * 2 + 6}
                rx={radius + 3}
                label={`Choose the node ${node.val}${panel.title ? ` in ${panel.title}` : ""}`}
              />
            );
          })}
          {panel.holes.map((hole, index) => {
            if (!hole.show) return null;
            const { x, y } = layouts[at].holes[index];
            return (
              <PickTarget
                key={`pick-hole-${index}`}
                pick={pick}
                index={pairCell(panels, at, { kind: "hole", index })}
                x={x - holeRadius - 3}
                y={y - holeRadius - 3}
                width={holeRadius * 2 + 6}
                height={holeRadius * 2 + 6}
                rx={holeRadius + 3}
                label={`Choose the empty ${hole.side} spot below ${panel.tree[hole.parent].val}${panel.title ? ` in ${panel.title}` : ""}`}
              />
            );
          })}
        </g>
      ))}
    </Frame>
  );
}

function Link({ from, to, fromRadius, toRadius, stroke, width, dashed, opacity }: { from: Point; to: Point; fromRadius: number; toRadius: number; stroke: string; width: number; dashed: boolean; opacity: number }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  return (
    <line
      className={GLIDE}
      x1={from.x + ux * fromRadius}
      y1={from.y + uy * fromRadius}
      x2={to.x - ux * toRadius}
      y2={to.y - uy * toRadius}
      stroke={stroke}
      strokeWidth={width}
      strokeDasharray={dashed ? "4 4" : undefined}
      strokeOpacity={opacity}
    />
  );
}

function ReportBadge({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const width = stripItemWidth(text) - 4;
  return (
    <g>
      <rect x={x - width / 2} y={y - 9} width={width} height={18} rx={9} fill="var(--background)" stroke={color} strokeWidth={1.5} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={color} fontFamily={MONO}>
        {text}
      </text>
    </g>
  );
}
