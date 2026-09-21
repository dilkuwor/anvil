import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import { NODE_R, TREE_WIDTH, layoutTree, type TreeShapeNode } from "./tree-story-view";
import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Picture for stories where a tree is built from rows of boxes, or written out into one.
 * The rows sit on top; under them the tree grows inside the outline of the finished tree, so nothing ever jumps.
 * Draws state only. The layout comes from the shared tree picture, so a tree looks the same in every story.
 */

export type BuildCell = {
  text: string;
  tone: CellTone;
  /** One short word under the box, e.g. "next". */
  under?: string;
};

export type BuildRow = {
  /** Empty label hides the row but keeps its space. */
  label: string;
  cells: BuildCell[];
};

export type BuildStub = {
  /** The node this empty spot hangs under, and on which side. */
  parent: number;
  side: "left" | "right";
  tone: "idle" | "accent" | "coral" | "teal";
  /** What the square shows. "#" when left out. */
  text?: string;
};

export type BuildEdgeTone = "idle" | "accent" | "teal" | "coral";

export type BuildState = {
  /** The finished tree. Its shape fixes every position from the first frame on. */
  tree: TreeShapeNode[];
  /** By node id: is this node drawn yet? */
  shown: boolean[];
  tones: CellTone[];
  /** By CHILD id: the line from that node up to its parent. */
  edges: BuildEdgeTone[];
  /** Small "#" squares: a spot where no child hangs. */
  stubs: BuildStub[];
  tag: { id: number; text: string } | null;
  rows: BuildRow[];
  /** What a click question points at: the tree's nodes (cell = node id) or the boxes of one row (cell = position). */
  pickOn: "tree" | number;
  counter: { label: string; value: number } | null;
  note: { text: string; tone: "accent" | "teal" | "coral" } | null;
  /** Keep room for at least this many levels below the top, so a frame that shows a deeper tree does not resize the picture. */
  minDepth?: number;
};

export function blankBuildState(tree: TreeShapeNode[], rows: number): BuildState {
  return {
    tree,
    shown: tree.map(() => true),
    tones: tree.map(() => "idle"),
    edges: tree.map(() => "idle"),
    stubs: [],
    tag: null,
    rows: Array.from({ length: rows }, () => ({ label: "", cells: [] })),
    pickOn: "tree",
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
/** The shared layout puts the top node at this y; we move the whole tree under the rows instead. */
const SHARED_TOP = 66;

/** Every box in a row has the same width, wide enough for the longest text, and the row always fits the picture. */
function cellWidth(row: BuildRow): number {
  const longest = Math.max(1, ...row.cells.map((cell) => cell.text.length));
  const wanted = Math.max(30, longest * 7.6 + 12);
  const room = (TREE_WIDTH - ROW_LEFT - 12) / Math.max(1, row.cells.length) - CELL_GAP;
  return Math.min(wanted, room);
}

function levelGap(tree: TreeShapeNode[]): number {
  const deepest = Math.max(0, ...tree.map((node) => node.depth));
  return deepest <= 3 ? 50 : Math.max(34, 160 / deepest);
}

export function AgyTrees3BuildView({ state, pick }: { state: BuildState; pick?: CellPick }) {
  const { tree } = state;
  const gap = levelGap(tree);
  const treeTop = ROWS_TOP + state.rows.length * ROW_HEIGHT + NODE_R + 12;
  const spots = layoutTree(tree).map((spot) => ({ x: spot.x, y: spot.y - SHARED_TOP + treeTop }));
  const slot = tree.length > 1 ? Math.min(52, (TREE_WIDTH - 52) / tree.length) : 52;
  const deepest = Math.max(state.minDepth ?? 0, ...tree.map((node) => node.depth));
  // Room under the last level for the "#" squares that hang below the deepest nodes.
  const height = treeTop + deepest * gap + NODE_R + gap * 0.62 + STUB;

  const stubSpot = (stub: BuildStub) => {
    const from = spots[stub.parent];
    return { x: from.x + (stub.side === "left" ? -1 : 1) * slot * 0.42, y: from.y + gap * 0.62 };
  };
  const tag = tagSpot(state, spots);

  return (
    <Frame width={TREE_WIDTH} height={height} label="Rows of boxes, and the tree that belongs to them">
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
                (empty)
              </Label>
            ) : null}
            {row.cells.map((cell, at) => {
              const x = ROW_LEFT + at * (width + CELL_GAP);
              const tone = state.pickOn === index ? pickTone(pick, at, cell.tone) : cell.tone;
              return (
                <g key={at} className={GLIDE} style={{ opacity: tone === "faded" ? 0.4 : 1 }}>
                  <rect className={GLIDE} x={x} y={y} width={width} height={24} rx={7} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75} />
                  <text x={x + width / 2} y={y + 16.5} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                    {cell.text}
                  </text>
                  {cell.under ? (
                    <text x={x + width / 2} y={y + 36} textAnchor="middle" fontSize={10} fontWeight={600} fill={VIZ_COLORS.accent}>
                      {cell.under}
                    </text>
                  ) : null}
                  {state.pickOn === index ? <RejectedMark pick={pick} index={at} x={x + width - 6} y={y + 10} /> : null}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Lines stop at the rim of each circle. A line is drawn only when both of its ends are. */}
      {tree.map((node) => {
        if (node.parent === null) return null;
        const visible = state.shown[node.id] && state.shown[node.parent];
        const from = spots[node.parent];
        const to = spots[node.id];
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const ux = (to.x - from.x) / length;
        const uy = (to.y - from.y) / length;
        const tone = state.edges[node.id] ?? "idle";
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
            style={{ opacity: visible ? 1 : 0 }}
          />
        );
      })}

      {state.stubs.map((stub) => {
        if (!spots[stub.parent]) return null;
        const from = spots[stub.parent];
        const to = stubSpot(stub);
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const color = LINE_STROKE[stub.tone];
        return (
          <g key={`stub-${stub.parent}-${stub.side}`}>
            <line x1={from.x + ((to.x - from.x) / length) * NODE_R} y1={from.y + ((to.y - from.y) / length) * NODE_R} x2={to.x} y2={to.y - STUB / 2} stroke={color} strokeWidth={1.25} strokeDasharray="3 3" />
            <rect x={to.x - STUB / 2} y={to.y - STUB / 2} width={STUB} height={STUB} rx={4} fill="var(--background)" stroke={color} strokeWidth={stub.tone === "idle" ? 1 : 1.75} />
            <text x={to.x} y={to.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={stub.tone === "idle" ? VIZ_COLORS.muted : color} fontFamily={MONO}>
              {stub.text ?? "#"}
            </text>
          </g>
        );
      })}

      {tree.map((node) => {
        const { x, y } = spots[node.id];
        const visible = state.shown[node.id];
        const tone = state.pickOn === "tree" ? pickTone(pick, node.id, state.tones[node.id] ?? "idle") : (state.tones[node.id] ?? "idle");
        return (
          <g key={`node-${node.id}`} className={GLIDE} style={{ opacity: !visible ? 0 : tone === "faded" ? 0.35 : 1 }}>
            <circle className={GLIDE} cx={x} cy={y} r={NODE_R} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 2} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
              {node.val}
            </text>
            {state.pickOn === "tree" ? <RejectedMark pick={pick} index={node.id} x={x + NODE_R + 6} y={y - NODE_R + 6} /> : null}
          </g>
        );
      })}

      {tag ? (
        <text x={tag.x} y={tag.y} textAnchor={tag.anchor} fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal} stroke="var(--background)" strokeWidth={3} paintOrder="stroke">
          {tag.text}
        </text>
      ) : null}

      {/* Click targets sit on top. Only things that are drawn can be clicked. */}
      {state.pickOn === "tree"
        ? tree.map((node) =>
            state.shown[node.id] ? (
              <PickTarget
                key={`pick-${node.id}`}
                pick={pick}
                index={node.id}
                x={spots[node.id].x - NODE_R - 3}
                y={spots[node.id].y - NODE_R - 3}
                width={NODE_R * 2 + 6}
                height={NODE_R * 2 + 6}
                rx={NODE_R + 3}
                label={`Choose the node ${node.val}`}
              />
            ) : null,
          )
        : (state.rows[state.pickOn]?.cells ?? []).map((cell, at) => {
            const row = state.rows[state.pickOn as number];
            const width = cellWidth(row);
            return (
              <PickTarget
                key={`pick-cell-${at}`}
                pick={pick}
                index={at}
                x={ROW_LEFT + at * (width + CELL_GAP) - 2}
                y={ROWS_TOP + (state.pickOn as number) * ROW_HEIGHT - 2}
                width={width + 4}
                height={28}
                label={`Choose the box ${cell.text} in the row ${row.label}`}
              />
            );
          })}
    </Frame>
  );
}

/** Beside the node, on the side away from its parent's line. Flips inward if it would leave the picture. */
function tagSpot(state: BuildState, spots: { x: number; y: number }[]) {
  if (!state.tag || !spots[state.tag.id] || !state.shown[state.tag.id]) return null;
  const node = state.tree[state.tag.id];
  const { x, y } = spots[node.id];
  const width = state.tag.text.length * 6.6;
  const reach = NODE_R + 9;
  const prefersRight = node.parent === null ? x < TREE_WIDTH / 2 : state.tree[node.parent].right === node.id;
  const fitsRight = x + reach + width <= TREE_WIDTH - 4;
  const fitsLeft = x - reach - width >= 4;
  const right = prefersRight ? fitsRight || !fitsLeft : !fitsLeft;
  return { text: state.tag.text, x: x + (right ? reach : -reach), y: y + 4, anchor: right ? ("start" as const) : ("end" as const) };
}
