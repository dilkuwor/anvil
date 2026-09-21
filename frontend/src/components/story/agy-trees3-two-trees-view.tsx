import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { BuildEdgeTone, BuildRow } from "./agy-trees3-build-view";
import { NODE_R, TREE_WIDTH, type TreeShapeNode } from "./tree-story-view";
import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for stories that compare two trees: a big one on the left and a small one on the right.
 * Rows of boxes sit on top. Draws state only; every position comes from the shape of the two trees.
 * The layout rule is the shared one (x from the left-to-right order, y from the depth), fitted into a panel.
 */

export type TwoTreesStub = {
  tree: "big" | "small";
  parent: number;
  side: "left" | "right";
  tone: BuildEdgeTone;
};

export type TwoTreesState = {
  big: TreeShapeNode[];
  small: TreeShapeNode[];
  bigLabel: string;
  smallLabel: string;
  bigTones: CellTone[];
  smallTones: CellTone[];
  /** By CHILD id: the line from that node up to its parent. */
  bigEdges: BuildEdgeTone[];
  smallEdges: BuildEdgeTone[];
  /** Small "#" squares: an empty spot that matters in this frame. */
  stubs: TwoTreesStub[];
  /** One short word beside one node of the big tree. */
  tag: { id: number; text: string } | null;
  rows: BuildRow[];
  counter: { label: string; value: number } | null;
  note: { text: string; tone: "accent" | "teal" | "coral" } | null;
};

export function blankTwoTrees(big: TreeShapeNode[], small: TreeShapeNode[], rows: number): TwoTreesState {
  return {
    big,
    small,
    bigLabel: "root",
    smallLabel: "subRoot",
    bigTones: big.map(() => "idle"),
    smallTones: small.map(() => "idle"),
    bigEdges: big.map(() => "idle"),
    smallEdges: small.map(() => "idle"),
    stubs: [],
    tag: null,
    rows: Array.from({ length: rows }, () => ({ label: "", cells: [] })),
    counter: null,
    note: null,
  };
}

const FILL: Record<CellTone, string> = {
  idle: "transparent",
  window: "color-mix(in srgb, var(--accent) 16%, transparent)",
  edge: "color-mix(in srgb, var(--accent) 45%, transparent)",
  hit: "color-mix(in srgb, var(--teal) 22%, transparent)",
  miss: "color-mix(in srgb, var(--coral) 28%, transparent)",
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

const LINE_STROKE: Record<BuildEdgeTone, string> = { idle: VIZ_COLORS.line, accent: VIZ_COLORS.accent, teal: VIZ_COLORS.teal, coral: VIZ_COLORS.coral };

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const ROWS_TOP = 34;
const ROW_HEIGHT = 46;
const ROW_LEFT = 104;
const CELL_GAP = 4;
const STUB = 15;
const GAP = 48;
const BIG = { center: 186, width: 330 };
const SMALL = { center: 462, width: 170 };
const DIVIDER = 366;

function cellWidth(row: BuildRow): number {
  const longest = Math.max(1, ...row.cells.map((cell) => cell.text.length));
  const wanted = Math.max(30, longest * 7.6 + 12);
  const room = (TREE_WIDTH - ROW_LEFT - 12) / Math.max(1, row.cells.length) - CELL_GAP;
  return Math.min(wanted, room);
}

/** x from the node's place in a left-to-right walk, y from its depth: the same rule as the shared tree picture, inside one panel. */
function layoutPanel(tree: TreeShapeNode[], panel: { center: number; width: number }, top: number): { spots: { x: number; y: number }[]; slot: number } {
  const rank = new Map<number, number>();
  const walk = (id: number | null) => {
    if (id === null) return;
    walk(tree[id].left);
    rank.set(id, rank.size);
    walk(tree[id].right);
  };
  if (tree.length > 0) walk(0);
  const slot = Math.min(48, panel.width / Math.max(1, tree.length));
  const start = panel.center - (slot * tree.length) / 2;
  return { spots: tree.map((node) => ({ x: start + slot * ((rank.get(node.id) ?? 0) + 0.5), y: top + node.depth * GAP })), slot };
}

export function AgyTrees3TwoTreesView({ state, pick }: { state: TwoTreesState; pick?: CellPick }) {
  const labelY = ROWS_TOP + state.rows.length * ROW_HEIGHT + 6;
  const treeTop = labelY + NODE_R + 16;
  const big = layoutPanel(state.big, BIG, treeTop);
  const small = layoutPanel(state.small, SMALL, treeTop);
  const deepest = Math.max(0, ...state.big.map((node) => node.depth), ...state.small.map((node) => node.depth));
  const height = treeTop + deepest * GAP + NODE_R + GAP * 0.62 + STUB;

  const drawTree = (which: "big" | "small") => {
    const tree = which === "big" ? state.big : state.small;
    const { spots, slot } = which === "big" ? big : small;
    const tones = which === "big" ? state.bigTones : state.smallTones;
    const edges = which === "big" ? state.bigEdges : state.smallEdges;
    return (
      <g key={which}>
        {tree.map((node) => {
          if (node.parent === null) return null;
          const from = spots[node.parent];
          const to = spots[node.id];
          const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
          const ux = (to.x - from.x) / length;
          const uy = (to.y - from.y) / length;
          const tone = edges[node.id] ?? "idle";
          return (
            <line
              key={`edge-${node.id}`}
              className={GLIDE}
              x1={from.x + ux * NODE_R}
              y1={from.y + uy * NODE_R}
              x2={to.x - ux * NODE_R}
              y2={to.y - uy * NODE_R}
              stroke={LINE_STROKE[tone]}
              strokeWidth={tone === "idle" ? 1.25 : 2.5}
              strokeDasharray={tone === "coral" ? "4 4" : undefined}
            />
          );
        })}
        {state.stubs
          .filter((stub) => stub.tree === which && spots[stub.parent])
          .map((stub) => {
            const from = spots[stub.parent];
            const to = { x: from.x + (stub.side === "left" ? -1 : 1) * slot * 0.42, y: from.y + GAP * 0.62 };
            const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
            const color = LINE_STROKE[stub.tone];
            return (
              <g key={`stub-${stub.parent}-${stub.side}`}>
                <line x1={from.x + ((to.x - from.x) / length) * NODE_R} y1={from.y + ((to.y - from.y) / length) * NODE_R} x2={to.x} y2={to.y - STUB / 2} stroke={color} strokeWidth={1.25} strokeDasharray="3 3" />
                <rect x={to.x - STUB / 2} y={to.y - STUB / 2} width={STUB} height={STUB} rx={4} fill="var(--background)" stroke={color} strokeWidth={stub.tone === "idle" ? 1 : 1.75} />
                <text x={to.x} y={to.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={stub.tone === "idle" ? VIZ_COLORS.muted : color} fontFamily={MONO}>
                  #
                </text>
              </g>
            );
          })}
        {tree.map((node) => {
          const { x, y } = spots[node.id];
          const own = tones[node.id] ?? "idle";
          const tone = which === "big" ? pickTone(pick, node.id, own) : own;
          return (
            <g key={`node-${node.id}`} className={GLIDE} style={{ opacity: tone === "faded" ? 0.35 : 1 }}>
              <circle className={GLIDE} cx={x} cy={y} r={NODE_R} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 2} />
              <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                {node.val}
              </text>
              {which === "big" ? <RejectedMark pick={pick} index={node.id} x={x + NODE_R + 6} y={y - NODE_R + 6} /> : null}
            </g>
          );
        })}
      </g>
    );
  };

  const tagNode = state.tag ? state.big[state.tag.id] : undefined;
  const tagAt = state.tag && tagNode ? big.spots[tagNode.id] : null;
  // The tag goes on the side away from the node's parent; at the top node it goes left, away from the small tree.
  const tagRight = tagNode && tagNode.parent !== null ? state.big[tagNode.parent].right === tagNode.id : false;

  return (
    <Frame width={TREE_WIDTH} height={height} label="Two trees side by side: a big one and a small one">
      {state.counter ? (
        <Label x={16} y={20} size={13} weight={600} tone="coral">
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}
      {state.note ? (
        <Label x={TREE_WIDTH - 16} y={20} size={13} weight={600} tone={state.note.tone} anchor="end">
          {state.note.text}
        </Label>
      ) : null}

      {state.rows.map((row, index) => {
        if (!row.label) return null;
        const y = ROWS_TOP + index * ROW_HEIGHT;
        const width = cellWidth(row);
        return (
          <g key={`row-${index}`}>
            <Label x={16} y={y + 16} size={12} weight={600}>
              {row.label}
            </Label>
            {row.cells.length === 0 ? (
              <Label x={ROW_LEFT} y={y + 16} size={12}>
                (none yet)
              </Label>
            ) : null}
            {row.cells.map((cell, at) => {
              const x = ROW_LEFT + at * (width + CELL_GAP);
              return (
                <g key={at} className={GLIDE} style={{ opacity: cell.tone === "faded" ? 0.4 : 1 }}>
                  <rect className={GLIDE} x={x} y={y} width={width} height={24} rx={7} fill={FILL[cell.tone]} stroke={STROKE[cell.tone]} strokeWidth={cell.tone === "idle" || cell.tone === "faded" ? 1 : 1.75} />
                  <text x={x + width / 2} y={y + 16.5} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                    {cell.text}
                  </text>
                  {cell.under ? (
                    <text x={x + width / 2} y={y + 36} textAnchor="middle" fontSize={10} fontWeight={600} fill={VIZ_COLORS.accent}>
                      {cell.under}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}

      <Label x={BIG.center} y={labelY} size={12} weight={600} anchor="middle">
        {state.bigLabel}
      </Label>
      <Label x={SMALL.center} y={labelY} size={12} weight={600} anchor="middle">
        {state.smallLabel}
      </Label>
      <line x1={DIVIDER} y1={labelY - 8} x2={DIVIDER} y2={height - 8} stroke={VIZ_COLORS.line} strokeWidth={1} strokeDasharray="2 5" />

      {drawTree("big")}
      {drawTree("small")}

      {state.tag && tagAt ? (
        <text
          x={tagAt.x + (tagRight ? NODE_R + 9 : -(NODE_R + 9))}
          y={tagAt.y + 4}
          textAnchor={tagRight ? "start" : "end"}
          fontSize={11}
          fontWeight={700}
          fill={VIZ_COLORS.teal}
          stroke="var(--background)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {state.tag.text}
        </text>
      ) : null}

      {/* Click targets sit on top. Only the big tree is ever asked about. */}
      {state.big.map((node) => (
        <PickTarget
          key={`pick-${node.id}`}
          pick={pick}
          index={node.id}
          x={big.spots[node.id].x - NODE_R - 3}
          y={big.spots[node.id].y - NODE_R - 3}
          width={NODE_R * 2 + 6}
          height={NODE_R * 2 + 6}
          rx={NODE_R + 3}
          label={`Choose the node ${node.val} of the big tree`}
        />
      ))}
    </Frame>
  );
}
