"use client";

import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ArchitectureGraph } from "@/lib/interview";
import { getKind } from "@/system-design/components/registry";
import type { ComponentType, ConfigValue, DesignEdge, DesignNode } from "@/system-design/models/types";
import { SimulatorCanvas } from "@/system-design/ui/canvas";
import { Inspector } from "@/system-design/ui/inspector";
import { Palette } from "@/system-design/ui/palette";
import { uid } from "@/system-design/utils/ids";
import { cn } from "@/lib/utils";

/**
 * The mock interview draws on the same canvas as the simulator: same parts, same palette,
 * same settings. This file only translates between the interview's saved graph
 * (`from`/`to` edges, kept by the API) and the simulator's design shape.
 */

/** Sessions drawn before the canvases were unified used twelve plain part names. */
const LEGACY_TYPES: Record<string, ComponentType> = {
  client: "client",
  cdn: "cdn",
  load_balancer: "load_balancer",
  api: "api_gateway",
  service: "api_server",
  cache: "redis",
  database: "postgresql",
  queue: "kafka",
  worker: "worker",
  search: "search_index",
  storage: "object_storage",
  websocket: "websocket_gateway",
};

function isComponentType(type: string): type is ComponentType {
  try {
    getKind(type as ComponentType);
    return true;
  } catch {
    return false;
  }
}

export function toDesignGraph(graph: ArchitectureGraph): { nodes: DesignNode[]; edges: DesignEdge[] } {
  const nodes: DesignNode[] = [];
  for (const node of graph.nodes) {
    const type = isComponentType(node.type) ? node.type : LEGACY_TYPES[node.type];
    if (!type) continue;
    const kind = getKind(type);
    nodes.push({
      id: node.id,
      type,
      label: node.label || kind.defaultLabel,
      x: node.x,
      y: node.y,
      config: { ...kind.defaultConfig, ...(node.config ?? {}) },
      disabled: node.disabled,
    });
  }
  const ids = new Set(nodes.map((node) => node.id));
  const edges: DesignEdge[] = graph.edges
    .filter((edge) => ids.has(edge.from) && ids.has(edge.to))
    .map((edge) => ({ id: edge.id || uid("e"), source: edge.from, target: edge.to, label: edge.label, weight: edge.weight }));
  return { nodes, edges };
}

export function fromDesignGraph(nodes: DesignNode[], edges: DesignEdge[]): ArchitectureGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      x: Math.round(node.x),
      y: Math.round(node.y),
      config: node.config,
      ...(node.disabled ? { disabled: true } : {}),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      ...(edge.label ? { label: edge.label } : {}),
      ...(edge.weight !== undefined ? { weight: edge.weight } : {}),
    })),
  };
}

export function InterviewCanvas({
  value,
  onChange,
  readOnly,
}: {
  value: ArchitectureGraph;
  onChange: (next: ArchitectureGraph) => void;
  readOnly: boolean;
}) {
  const design = useMemo(() => toDesignGraph(value), [value]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selected = design.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedEdge = selected ? null : (design.edges.find((edge) => edge.id === selectedEdgeId) ?? null);

  function emit(nodes: DesignNode[], edges: DesignEdge[]) {
    if (readOnly) return;
    onChange(fromDesignGraph(nodes, edges));
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-steel-800 bg-steel-900">
      <div className="flex items-center justify-between gap-2 border-b border-steel-800 px-3 py-1.5">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {readOnly ? "Your design" : "Draw your design"}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="hidden sm:inline">
            {design.nodes.length} part{design.nodes.length === 1 ? "" : "s"} · {design.edges.length} link{design.edges.length === 1 ? "" : "s"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={settingsOpen}
            title="Show the settings of the selected part"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Settings
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1">
        <ReactFlowProvider>
          {readOnly ? null : <Palette />}
          <SimulatorCanvas
            designNodes={design.nodes}
            designEdges={design.edges}
            result={null}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onSelectEdge={setSelectedEdgeId}
            onGraph={emit}
            readOnly={readOnly}
            onDuplicate={(id) => {
              const source = design.nodes.find((node) => node.id === id);
              if (!source) return;
              const copy: DesignNode = { ...source, id: uid("n"), x: source.x + 36, y: source.y + 36, label: `${source.label} copy` };
              emit([...design.nodes, copy], design.edges);
              setSelectedId(copy.id);
            }}
            onToggleDisabled={(id) =>
              emit(design.nodes.map((node) => (node.id === id ? { ...node, disabled: !node.disabled } : node)), design.edges)
            }
            onDelete={(id) => {
              emit(
                design.nodes.filter((node) => node.id !== id),
                design.edges.filter((edge) => edge.source !== id && edge.target !== id),
              );
              if (selectedId === id) setSelectedId(null);
            }}
          />
          <div className={cn("min-h-0 shrink-0 overflow-hidden", settingsOpen ? "block" : "hidden")}>
            <Inspector
              node={selected}
              edge={selectedEdge}
              edgeEnds={
                selectedEdge
                  ? {
                      source: design.nodes.find((node) => node.id === selectedEdge.source)?.label ?? selectedEdge.source,
                      target: design.nodes.find((node) => node.id === selectedEdge.target)?.label ?? selectedEdge.target,
                    }
                  : undefined
              }
              difficulty="intermediate"
              onRename={(label) =>
                emit(design.nodes.map((node) => (node.id === selectedId ? { ...node, label } : node)), design.edges)
              }
              onChange={(key, value: ConfigValue) =>
                emit(
                  design.nodes.map((node) => (node.id === selectedId ? { ...node, config: { ...node.config, [key]: value } } : node)),
                  design.edges,
                )
              }
              onEdgeChange={(patch) =>
                emit(design.nodes, design.edges.map((edge) => (edge.id === selectedEdgeId ? { ...edge, ...patch } : edge)))
              }
            />
          </div>
        </ReactFlowProvider>
      </div>
    </section>
  );
}
