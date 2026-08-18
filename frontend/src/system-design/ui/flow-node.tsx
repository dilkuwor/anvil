"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { getKind } from "../components/registry";
import type { ComponentType, Health, NodeMetrics } from "../models/types";
import { formatRps } from "../utils/format";
import { KindIcon } from "./icons";
import { cn } from "@/lib/utils";

export type ArchitectureNodeData = {
  kind: ComponentType;
  label: string;
  disabled?: boolean;
  metrics?: NodeMetrics;
};

export type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;

const HEALTH: Record<Health, string> = {
  healthy: "border-steel-800",
  warning: "border-accent",
  critical: "border-coral",
  overloaded: "border-coral bg-coral/10",
};

export function ArchitectureFlowNode({ data, selected }: NodeProps<ArchitectureNode>) {
  const kind = getKind(data.kind);
  const health = data.metrics?.health ?? "healthy";
  return (
    <div
      className={cn(
        "min-w-[148px] rounded-xl border bg-steel-900 px-3 py-2 shadow-sm",
        data.disabled ? "border-dashed border-steel-600 opacity-50" : selected ? "border-accent" : HEALTH[health],
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-accent !bg-background" />
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-steel-800 text-accent">
          <KindIcon name={kind.icon} className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{data.label}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {data.disabled ? "Disabled" : kind.label}
          </div>
        </div>
      </div>
      {data.metrics ? (
        <div className="mt-2 text-[11px] tabular-nums text-muted-foreground">
          {formatRps(data.metrics.processedRps)} rps
          {data.metrics.droppedRps + data.metrics.rejectedRps > 1
            ? ` · ${formatRps(data.metrics.droppedRps + data.metrics.rejectedRps)} lost`
            : ""}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-accent !bg-background" />
    </div>
  );
}
