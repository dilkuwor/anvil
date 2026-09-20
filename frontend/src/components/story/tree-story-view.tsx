import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Shared picture for binary-tree stories. Draws state only.
 * The tree is parsed from a LeetCode-style array and laid out from its shape, never from typed coordinates.
 */

export type TreeShapeNode = {
  /** Position in level order. Also the node's cell index for click questions. */
  id: number;
  /** The number printed in the circle. Captions always use this, never the id. */
  val: number;
  left: number | null;
  right: number | null;
  parent: number | null;
  depth: number;
};

/** "[3,9,20,null,null,15,7]" → nodes in level order. */
export function parseTree(text: string): TreeShapeNode[] {
  const tokens = text
    .replace(/[[\]\s]/g, "")
    .split(",")
    .filter((token) => token.length > 0);
  const nodes: TreeShapeNode[] = [];
  const make = (token: string | undefined, parent: number | null, depth: number): number | null => {
    if (token === undefined || token === "null" || Number.isNaN(Number(token))) return null;
    nodes.push({ id: nodes.length, val: Number(token), left: null, right: null, parent, depth });
    return nodes.length - 1;
  };
  if (make(tokens[0], null, 0) === null) return [];
  let next = 1;
  for (let at = 0; at < nodes.length && next < tokens.length; at++) {
    nodes[at].left = make(tokens[next++], at, nodes[at].depth + 1);
    nodes[at].right = make(tokens[next++], at, nodes[at].depth + 1);
  }
  return nodes;
}

/** "9", "9 and 20", "1, 0 and 8". */
export function listWords(values: (number | string)[]): string {
  if (values.length <= 1) return values.map(String).join("");
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

export const TREE_WIDTH = 560;
export const NODE_R = 15;
const MARGIN = 26;
const TOP = 66;
const STRIP_HEIGHT = 40;

function levelGap(tree: TreeShapeNode[]): number {
  const deepest = Math.max(0, ...tree.map((node) => node.depth));
  return deepest <= 3 ? 50 : Math.max(34, 160 / deepest);
}

/**
 * x comes from the node's place in a left-to-right (in-order) walk, y from its depth.
 * So a left child is always left of its parent, no two circles share a column, and any shape fits the width.
 */
export function layoutTree(tree: TreeShapeNode[]): { x: number; y: number }[] {
  const rank = new Map<number, number>();
  const walk = (id: number | null) => {
    if (id === null) return;
    walk(tree[id].left);
    rank.set(id, rank.size);
    walk(tree[id].right);
  };
  if (tree.length > 0) walk(0);
  const slot = Math.min(52, (TREE_WIDTH - 2 * MARGIN) / Math.max(1, tree.length));
  const start = (TREE_WIDTH - slot * tree.length) / 2;
  const gap = levelGap(tree);
  return tree.map((node) => ({ x: start + slot * ((rank.get(node.id) ?? 0) + 0.5), y: TOP + node.depth * gap }));
}

export type TreeEdgeMark = {
  /** path = the search is below here · report = something was found and is travelling up · empty = nothing found · skipped = never searched. */
  tone: "idle" | "path" | "report" | "empty" | "skipped";
  /** What travels up this edge, e.g. "4". */
  badge?: string;
};

export type TreeStrip = {
  /** Empty label hides the strip but keeps its space, so the picture never jumps. */
  label: string;
  items: { text: string; tone: CellTone }[];
  /** Print "front" and "back" under the two ends (a waiting line). */
  ends?: boolean;
};

export type TreeStoryState = {
  tree: TreeShapeNode[];
  /** One per node, by id. accent = where we are, teal = good/done, coral = trap, faded = no longer matters. */
  tones: CellTone[];
  /** One per node, by CHILD id: the edge from that node up to its parent. */
  edges: TreeEdgeMark[];
  /** A report leaving the top of the tree. */
  out: string | null;
  /** The two marked nodes (p and q): a ring and a letter, a look no tone uses. */
  marks: { id: number; letter: string }[];
  /** One short word beside one node, e.g. "answer". It sits level with the circle; letters sit above it and the ✕ below it, so they never collide. */
  tag: { id: number; text: string } | null;
  /** The level (depth) that is being turned into a row. */
  band: number | null;
  strips: TreeStrip[];
  counter: { label: string; value: number } | null;
  note: { text: string; tone: "accent" | "teal" | "coral" } | null;
};

export function blankTreeState(tree: TreeShapeNode[], strips: number): TreeStoryState {
  return {
    tree,
    tones: tree.map(() => "idle"),
    edges: tree.map(() => ({ tone: "idle" })),
    out: null,
    marks: [],
    tag: null,
    band: null,
    strips: Array.from({ length: strips }, () => ({ label: "", items: [] })),
    counter: null,
    note: null,
  };
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

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function stripItemWidth(text: string): number {
  return Math.max(30, text.length * 7.4 + 14);
}

export function TreeStoryView({ state, pick }: { state: TreeStoryState; pick?: CellPick }) {
  const { tree } = state;
  const spots = layoutTree(tree);
  const gap = levelGap(tree);
  const deepest = Math.max(0, ...tree.map((node) => node.depth));
  const stripsTop = TOP + deepest * gap + NODE_R + 24;
  const height = stripsTop + state.strips.length * STRIP_HEIGHT + 4;

  const tag = tagSpot(state, spots);

  return (
    <Frame width={TREE_WIDTH} height={height} label="A binary tree, drawn level by level">
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

      {/* The level that is becoming a row. */}
      <rect
        className={GLIDE}
        x={8}
        width={TREE_WIDTH - 16}
        height={NODE_R * 2 + 12}
        rx={12}
        fill="color-mix(in srgb, var(--accent) 9%, transparent)"
        stroke={VIZ_COLORS.accent}
        strokeOpacity={0.3}
        style={{ y: TOP + (state.band ?? 0) * gap - NODE_R - 6, opacity: state.band === null ? 0 : 1 }}
      />

      {/* Edges stop at the rim of each circle, so nothing shows through a node. */}
      {tree.map((node) => {
        if (node.parent === null) return null;
        const mark = state.edges[node.id] ?? { tone: "idle" };
        const from = spots[node.parent];
        const to = spots[node.id];
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const ux = (to.x - from.x) / length;
        const uy = (to.y - from.y) / length;
        const strong = mark.tone === "path" || mark.tone === "report";
        return (
          <line
            key={`edge-${node.id}`}
            className={GLIDE}
            x1={from.x + ux * NODE_R}
            y1={from.y + uy * NODE_R}
            x2={to.x - ux * NODE_R}
            y2={to.y - uy * NODE_R}
            stroke={EDGE_STROKE[mark.tone]}
            strokeWidth={strong ? 2.75 : 1.25}
            strokeDasharray={mark.tone === "empty" || mark.tone === "skipped" ? "4 4" : undefined}
            strokeOpacity={mark.tone === "empty" ? 0.45 : 1}
          />
        );
      })}

      {/* A report leaving the top of the tree. */}
      {state.out !== null && spots[0] ? (
        <g>
          <line x1={spots[0].x} y1={spots[0].y - NODE_R} x2={spots[0].x} y2={spots[0].y - NODE_R - 12} stroke={VIZ_COLORS.teal} strokeWidth={2.75} />
          <path d={`M${spots[0].x} ${spots[0].y - NODE_R - 19} l-5 8 l10 0 Z`} fill={VIZ_COLORS.teal} />
          <ReportBadge x={spots[0].x + 10 + stripItemWidth(state.out) / 2 - 4} y={spots[0].y - NODE_R - 10} text={state.out} />
        </g>
      ) : null}

      {tree.map((node) => {
        const { x, y } = spots[node.id];
        const tone = pickTone(pick, node.id, state.tones[node.id] ?? "idle");
        const mark = state.marks.find((item) => item.id === node.id);
        // The letter goes on the side away from the edge to the parent, so it never sits on a line.
        const isRight = node.parent !== null && tree[node.parent].right === node.id;
        const letterX = x + (isRight ? 1 : -1) * (NODE_R + 3);
        const letterY = y - NODE_R - 1;
        return (
          <g key={`node-${node.id}`} className={GLIDE} style={{ opacity: tone === "faded" ? 0.35 : 1 }}>
            {mark ? <circle cx={x} cy={y} r={NODE_R + 4} fill="none" stroke={VIZ_COLORS.ink} strokeWidth={1.5} /> : null}
            <circle className={GLIDE} cx={x} cy={y} r={NODE_R} fill={NODE_FILL[tone]} stroke={NODE_STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 2} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
              {node.val}
            </text>
            {mark ? (
              <g>
                <circle cx={letterX} cy={letterY} r={8} fill={VIZ_COLORS.ink} />
                <text x={letterX} y={letterY + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--background)" fontFamily={MONO}>
                  {mark.letter}
                </text>
              </g>
            ) : null}
            {/* Outside the circle, low on the right: clear of the value, the letter above and the tag below. */}
            <RejectedMark pick={pick} index={node.id} x={x + NODE_R + 6} y={y + NODE_R - 1} />
          </g>
        );
      })}

      {/* Badges beside their edge, in the empty band between two levels. */}
      {tree.map((node) => {
        const mark = state.edges[node.id];
        if (node.parent === null || !mark?.badge) return null;
        const from = spots[node.parent];
        const to = spots[node.id];
        const isRight = tree[node.parent].right === node.id;
        const width = stripItemWidth(mark.badge) - 4;
        // A little above the middle of the edge: clear of the ring around a marked child.
        const along = 0.42;
        return (
          <ReportBadge
            key={`badge-${node.id}`}
            x={from.x + (to.x - from.x) * along + (isRight ? 1 : -1) * (width / 2 + 5)}
            y={from.y + (to.y - from.y) * along}
            text={mark.badge}
          />
        );
      })}

      {tag ? (
        <text x={tag.x} y={tag.y} textAnchor={tag.anchor} fontSize={11} fontWeight={700} fill={VIZ_COLORS.teal} stroke="var(--background)" strokeWidth={3} paintOrder="stroke">
          {tag.text}
        </text>
      ) : null}

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
              const end = strip.ends ? (index === 0 ? "front" : index === strip.items.length - 1 ? "back" : null) : null;
              return (
                <g key={index} className={GLIDE} style={{ opacity: item.tone === "faded" ? 0.4 : 1 }}>
                  <rect x={left} y={y} width={width} height={24} rx={7} fill={NODE_FILL[item.tone]} stroke={NODE_STROKE[item.tone]} strokeWidth={item.tone === "idle" || item.tone === "faded" ? 1 : 1.75} />
                  <text x={left + width / 2} y={y + 16.5} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                    {item.text}
                  </text>
                  {end ? (
                    <text x={left + width / 2} y={y + 35} textAnchor="middle" fontSize={10} fill={VIZ_COLORS.muted}>
                      {end}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Click targets sit on top, only while the reader is asked to point at a node. */}
      {tree.map((node) => (
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
      ))}
    </Frame>
  );
}

/** Beside the node, on the side away from its parent's edge. Flips inward if it would leave the picture. */
function tagSpot(state: TreeStoryState, spots: { x: number; y: number }[]) {
  if (!state.tag || !spots[state.tag.id]) return null;
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

function ReportBadge({ x, y, text }: { x: number; y: number; text: string }) {
  const width = stripItemWidth(text) - 4;
  return (
    <g>
      <rect x={x - width / 2} y={y - 9} width={width} height={18} rx={9} fill="var(--background)" stroke={VIZ_COLORS.teal} strokeWidth={1.5} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.teal} fontFamily={MONO}>
        {text}
      </text>
    </g>
  );
}
