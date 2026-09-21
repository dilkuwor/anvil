import { Cell, Frame, Label, VIZ_COLORS, type CellTone } from "@/components/learn/viz/primitives";

import type { CellPick } from "./types";
import { GLIDE, PickTarget, RejectedMark, pickTone } from "./view-kit";

/**
 * Visual for Union Find and disjoint set clusters.
 * Shows elements, parent links, active edges, and formed clusters.
 * Respects reduced motion and uses shared click targets.
 */

export type ClusterNode = {
  id: string | number;
  label: string;
  parent: string | number;
  tone?: CellTone;
  sub?: string;
};

export type ClusterSet = {
  root: string | number;
  name?: string;
  items: string[];
  tone?: CellTone;
};

export type ClusterGroupState = {
  nodes: ClusterNode[];
  clusters?: ClusterSet[];
  activeEdge?: { u: string | number; v: string | number; tone: "accent" | "coral" | "teal" } | null;
  counter?: { label: string; value: number | string } | null;
  status?: { text: string; tone: "accent" | "coral" | "teal" } | null;
  note?: { text: string; tone: "accent" | "coral" | "teal" } | null;
};

const WIDTH = 560;
const HEIGHT = 248;
const GAP = 8;

export function AgyGroupsClustersView({
  state,
  pick,
}: {
  state: ClusterGroupState;
  pick?: CellPick;
}) {
  const count = Math.max(state.nodes.length, 1);
  const size = Math.min(52, Math.floor((WIDTH - 48) / count - GAP));
  const startX = (WIDTH - (count * (size + GAP) - GAP)) / 2;
  const nodeX = (index: number) => startX + index * (size + GAP);

  const clusters = state.clusters ?? [];
  const clusterCount = Math.max(clusters.length, 1);
  const clusterW = Math.min(160, Math.floor((WIDTH - 40) / clusterCount - 10));
  const clusterStartX = (WIDTH - (clusterCount * (clusterW + 10) - 10)) / 2;
  const clusterX = (index: number) => clusterStartX + index * (clusterW + 10);
  const clusterY = 124;

  return (
    <Frame width={WIDTH} height={HEIGHT} label="Disjoint sets forming connected clusters with parent links">
      {state.counter ? (
        <Label
          x={16}
          y={20}
          size={13}
          weight={600}
          tone={state.counter.label.toLowerCase().includes("trap") ? "coral" : "teal"}
        >
          {state.counter.label}: {state.counter.value}
        </Label>
      ) : null}

      {state.status ? (
        <Label x={WIDTH - 16} y={20} size={13} weight={600} tone={state.status.tone} anchor="end">
          {state.status.text}
        </Label>
      ) : null}

      {/* Nodes row */}
      {state.nodes.map((node, index) => {
        const x = nodeX(index);
        const y = 40;
        const tone = pickTone(pick, index, node.tone ?? "idle");
        return (
          <g key={`node-${index}`}>
            <Cell x={x} y={y} size={size} value={node.label} tone={tone} />
            <text
              x={x + size / 2}
              y={y + size + 14}
              fontSize={10}
              fill={VIZ_COLORS.muted}
              textAnchor="middle"
            >
              {node.sub ? node.sub : `root: ${node.parent}`}
            </text>
            <RejectedMark pick={pick} index={index} x={x + size - 6} y={y + 8} />
          </g>
        );
      })}

      {/* Clusters row */}
      {clusters.map((cluster, index) => {
        const cx = clusterX(index);
        const isCoral = cluster.tone === "miss";
        const strokeColor = isCoral ? VIZ_COLORS.coral : VIZ_COLORS.teal;
        const fillColor = isCoral
          ? "color-mix(in srgb, var(--coral) 12%, transparent)"
          : "color-mix(in srgb, var(--teal) 10%, transparent)";

        return (
          <g key={`cluster-${index}`} className={GLIDE}>
            <rect
              x={cx}
              y={clusterY}
              width={clusterW}
              height={66}
              rx={8}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={1.5}
            />
            <text
              x={cx + 8}
              y={clusterY + 16}
              fontSize={11}
              fontWeight={600}
              fill={isCoral ? VIZ_COLORS.coral : VIZ_COLORS.teal}
            >
              {cluster.name ? `${cluster.name} (root: ${cluster.root})` : `Component: root ${cluster.root}`}
            </text>
            <text
              x={cx + 8}
              y={clusterY + 38}
              fontSize={11}
              fill={VIZ_COLORS.ink}
            >
              {cluster.items.join(", ")}
            </text>
          </g>
        );
      })}

      {/* Bottom note */}
      {state.note ? (
        <Label
          x={WIDTH / 2}
          y={HEIGHT - 12}
          size={12}
          weight={600}
          tone={state.note.tone}
          anchor="middle"
        >
          {state.note.text}
        </Label>
      ) : null}

      {/* Interactive pick targets */}
      {state.nodes.map((node, index) => (
        <PickTarget
          key={`pick-${index}`}
          pick={pick}
          index={index}
          x={nodeX(index) - 2}
          y={38}
          width={size + 4}
          height={size + 4}
          label={`Select element ${node.label}`}
        />
      ))}
    </Frame>
  );
}
