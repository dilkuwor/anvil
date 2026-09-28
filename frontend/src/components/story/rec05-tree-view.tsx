import { Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { TreeShapeNode } from "./tree-story-view";
import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Tree picture for two batch-5 stories. Draws state only.
 *
 * - Empty seats (Insert into a BST): every missing child is a small dashed ring, so "nothing here" is a real target.
 *   Cells: nodes are 0..n-1, seats follow as n, n+1, … in left-to-right order.
 * - Envelopes (House Robber III): two small boxes under a house, robbed on the left, walked past on the right.
 *   Cells: house id * 2 (robbed) and house id * 2 + 1 (walked past).
 * Positions come from an in-order walk of the tree (seats included), so any shape fits and nothing overlaps.
 */

/** A value of null is an envelope not filled yet, drawn as "?". */
export type Rec05Envelope = { robbed: number | null; passed: number | null; robbedTone: CellTone; passedTone: CellTone };

export type Rec05EdgeTone = "idle" | "path" | "done" | "loose" | "faded";

export type Rec05TreeState = {
  tree: TreeShapeNode[];
  /** One per node, by id. */
  tones: CellTone[];
  /** One per node, by CHILD id: the line up to its parent. loose = a node that is not hooked on (coral, dashed). */
  edges: Rec05EdgeTone[];
  /** Draw every empty child spot as a seat. */
  seats: boolean;
  /** Tone per seat, in left-to-right order. Missing entries are idle. */
  seatTones: CellTone[];
  /** Envelopes under each house, or null when that house has none yet. Empty list = the picture has no envelopes. */
  envelopes: (Rec05Envelope | null)[];
  /** One short word beside one node. */
  tag: { id: number; text: string } | null;
  counter: { label: string; value: number } | null;
  note: { text: string; tone: "accent" | "teal" | "coral" } | null;
};

export type Rec05Seat = { parent: number; side: "left" | "right" };

/** Every empty child spot, left to right. An empty tree has one seat: the top itself. */
export function listSeats(tree: TreeShapeNode[]): Rec05Seat[] {
  const seats: Rec05Seat[] = [];
  const walk = (id: number) => {
    const node = tree[id];
    if (node.left === null) seats.push({ parent: id, side: "left" });
    else walk(node.left);
    if (node.right === null) seats.push({ parent: id, side: "right" });
    else walk(node.right);
  };
  if (tree.length > 0) walk(0);
  return seats;
}

export function blankRec05State(tree: TreeShapeNode[]): Rec05TreeState {
  return {
    tree,
    tones: tree.map(() => "idle"),
    edges: tree.map(() => "idle"),
    seats: false,
    seatTones: [],
    envelopes: [],
    tag: null,
    counter: null,
    note: null,
  };
}

const WIDTH = 560;
const NODE_R = 15;
const SEAT_R = 8;
const MARGIN = 24;
const TOP = 56;
const BOX_W = 26;
const BOX_H = 18;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

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

const EDGE: Record<Rec05EdgeTone, string> = {
  idle: VIZ_COLORS.line,
  path: VIZ_COLORS.accent,
  done: VIZ_COLORS.teal,
  loose: VIZ_COLORS.coral,
  faded: VIZ_COLORS.line,
};

type Spot = { x: number; y: number };

function layout(state: Rec05TreeState) {
  const { tree } = state;
  const seats = state.seats ? listSeats(tree) : [];
  const deepest = Math.max(0, ...tree.map((node) => node.depth)) + (seats.length > 0 ? 1 : 0);
  const withEnvelopes = state.envelopes.length > 0;
  const gap = withEnvelopes ? Math.min(74, 230 / Math.max(1, deepest)) : deepest <= 3 ? 52 : Math.max(36, 170 / deepest);
  // In-order columns over nodes and seats together.
  const order: ({ kind: "node"; id: number } | { kind: "seat"; index: number })[] = [];
  const seatAt = new Map<string, number>(seats.map((seat, index) => [`${seat.parent}${seat.side}`, index]));
  const walk = (id: number) => {
    const node = tree[id];
    if (node.left !== null) walk(node.left);
    else if (seatAt.has(`${id}left`)) order.push({ kind: "seat", index: seatAt.get(`${id}left`)! });
    order.push({ kind: "node", id });
    if (node.right !== null) walk(node.right);
    else if (seatAt.has(`${id}right`)) order.push({ kind: "seat", index: seatAt.get(`${id}right`)! });
  };
  if (tree.length > 0) walk(0);
  const slot = Math.min(withEnvelopes ? 90 : 56, (WIDTH - 2 * MARGIN) / Math.max(1, order.length));
  const start = (WIDTH - slot * order.length) / 2;
  const nodeSpots: Spot[] = tree.map(() => ({ x: 0, y: 0 }));
  const seatSpots: Spot[] = seats.map(() => ({ x: 0, y: 0 }));
  order.forEach((item, column) => {
    const x = start + slot * (column + 0.5);
    if (item.kind === "node") nodeSpots[item.id] = { x, y: TOP + tree[item.id].depth * gap };
    else seatSpots[item.index] = { x, y: TOP + (tree[seats[item.index].parent].depth + 1) * gap };
  });
  return { seats, nodeSpots, seatSpots, gap, deepest, withEnvelopes };
}

function trim(from: Spot, to: Spot, fromR: number, toR: number) {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  return { x1: from.x + ux * fromR, y1: from.y + uy * fromR, x2: to.x - ux * toR, y2: to.y - uy * toR };
}

export function Rec05TreeView({ state, pick }: { state: Rec05TreeState; pick?: CellPick }) {
  const { tree } = state;
  const { seats, nodeSpots, seatSpots, gap, deepest, withEnvelopes } = layout(state);
  const bottom = TOP + deepest * gap + (withEnvelopes ? NODE_R + 6 + BOX_H + 30 : NODE_R + 16);
  const height = Math.max(bottom, 150);
  const seatCell = (index: number) => tree.length + index;

  return (
    <Frame width={WIDTH} height={height} label="A binary tree">
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

      {/* Lines from each child up to its parent. */}
      {tree.map((node) => {
        if (node.parent === null) return null;
        const tone = state.edges[node.id] ?? "idle";
        const line = trim(nodeSpots[node.parent], nodeSpots[node.id], NODE_R, NODE_R);
        const strong = tone === "path" || tone === "done" || tone === "loose";
        return (
          <line
            key={`edge-${node.id}`}
            className={GLIDE}
            {...line}
            stroke={EDGE[tone]}
            strokeWidth={strong ? 2.75 : 1.25}
            strokeDasharray={tone === "loose" ? "5 4" : undefined}
            strokeOpacity={tone === "faded" ? 0.35 : 1}
          />
        );
      })}

      {/* Empty seats: a thin dashed line and a small dashed ring. */}
      {seats.map((seat, index) => {
        const tone = pickTone(pick, seatCell(index), state.seatTones[index] ?? "idle");
        const line = trim(nodeSpots[seat.parent], seatSpots[index], NODE_R, SEAT_R);
        return (
          <g key={`seat-${seat.parent}-${seat.side}`} className={GLIDE} style={{ opacity: tone === "faded" ? 0.35 : 1 }}>
            <line {...line} stroke={VIZ_COLORS.line} strokeWidth={1} strokeDasharray="3 4" strokeOpacity={0.6} />
            <circle cx={seatSpots[index].x} cy={seatSpots[index].y} r={SEAT_R} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 2} strokeDasharray={tone === "idle" || tone === "faded" ? "3 3" : undefined} />
            <RejectedMark pick={pick} index={seatCell(index)} x={seatSpots[index].x} y={seatSpots[index].y + SEAT_R + 12} />
          </g>
        );
      })}

      {tree.map((node) => {
        const { x, y } = nodeSpots[node.id];
        const tone = pickTone(pick, node.id, state.tones[node.id] ?? "idle");
        return (
          <g key={`node-${node.id}`} className={GLIDE} style={{ opacity: tone === "faded" ? 0.35 : 1 }}>
            <circle className={GLIDE} cx={x} cy={y} r={NODE_R} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1.25 : 2} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
              {node.val}
            </text>
            {withEnvelopes ? null : <RejectedMark pick={pick} index={node.id} x={x + NODE_R + 6} y={y + NODE_R - 1} />}
          </g>
        );
      })}

      {/* Two envelopes under a house: robbed (left), walked past (right). */}
      {state.envelopes.map((envelope, id) => {
        if (!envelope || !nodeSpots[id]) return null;
        const { x, y } = nodeSpots[id];
        const top = y + NODE_R + 5;
        return (
          <g key={`env-${id}`}>
            {[
              { value: envelope.robbed, tone: envelope.robbedTone, cell: id * 2, left: x - BOX_W - 1 },
              { value: envelope.passed, tone: envelope.passedTone, cell: id * 2 + 1, left: x + 1 },
            ].map((box) => {
              const tone = pickTone(pick, box.cell, box.tone);
              return (
                <g key={box.cell} className={GLIDE} style={{ opacity: tone === "faded" ? 0.4 : 1 }}>
                  <rect x={box.left} y={top} width={BOX_W} height={BOX_H} rx={4} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth={tone === "idle" || tone === "faded" ? 1 : 1.75} />
                  <text x={box.left + BOX_W / 2} y={top + 13} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={VIZ_COLORS.ink} fontFamily={MONO}>
                    {box.value ?? "?"}
                  </text>
                  <RejectedMark pick={pick} index={box.cell} x={box.left + BOX_W / 2} y={top + BOX_H + 11} />
                </g>
              );
            })}
          </g>
        );
      })}

      {state.tag && nodeSpots[state.tag.id] ? (
        <text
          x={nodeSpots[state.tag.id].x + NODE_R + 7}
          y={nodeSpots[state.tag.id].y - NODE_R + 2}
          fontSize={11}
          fontWeight={700}
          fill={VIZ_COLORS.accent}
          stroke="var(--background)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {state.tag.text}
        </text>
      ) : null}

      {withEnvelopes ? (
        <g>
          <rect x={16} y={height - 22} width={12} height={10} rx={2} fill="none" stroke={VIZ_COLORS.line} />
          <Label x={32} y={height - 13} size={11}>
            left box: robbed · right box: walked past
          </Label>
        </g>
      ) : null}

      {/* Click targets last, so they sit on top. */}
      {tree.map((node) => (
        <PickTarget
          key={`pick-${node.id}`}
          pick={withEnvelopes ? undefined : pick}
          index={node.id}
          x={nodeSpots[node.id].x - NODE_R - 3}
          y={nodeSpots[node.id].y - NODE_R - 3}
          width={NODE_R * 2 + 6}
          height={NODE_R * 2 + 6}
          rx={NODE_R + 3}
          label={`Choose the node ${node.val}`}
        />
      ))}
      {seats.map((seat, index) => (
        <PickTarget
          key={`pick-seat-${index}`}
          pick={pick}
          index={seatCell(index)}
          x={seatSpots[index].x - SEAT_R - 5}
          y={seatSpots[index].y - SEAT_R - 5}
          width={SEAT_R * 2 + 10}
          height={SEAT_R * 2 + 10}
          rx={SEAT_R + 5}
          label={`Choose the empty ${seat.side} seat under ${tree[seat.parent].val}`}
        />
      ))}
      {withEnvelopes
        ? state.envelopes.map((envelope, id) =>
            envelope && nodeSpots[id]
              ? [0, 1].map((k) => (
                  <PickTarget
                    key={`pick-env-${id}-${k}`}
                    pick={pick}
                    index={id * 2 + k}
                    x={nodeSpots[id].x + (k === 0 ? -BOX_W - 1 : 1)}
                    y={nodeSpots[id].y + NODE_R + 5}
                    width={BOX_W}
                    height={BOX_H}
                    rx={4}
                    label={`Choose the ${k === 0 ? "robbed" : "walked past"} envelope of ${tree[id].val}`}
                  />
                ))
              : null,
          )
        : null}
    </Frame>
  );
}
