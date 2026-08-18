"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getKind } from "../components/registry";
import type { ComponentType, DesignEdge, DesignNode, SimulationResult } from "../models/types";
import { uid } from "../utils/ids";
import { ArchitectureFlowNode, type ArchitectureNode } from "./flow-node";
import { NodeContextMenu } from "./node-context-menu";
import { formatRps } from "../utils/format";

const nodeTypes = { architecture: ArchitectureFlowNode };

export function SimulatorCanvas({
  designNodes,
  designEdges,
  result,
  onGraph,
  selectedId,
  onSelect,
  onDuplicate,
  onToggleDisabled,
  onDelete,
}: {
  designNodes: DesignNode[];
  designEdges: DesignEdge[];
  result: SimulationResult | null;
  onGraph: (nodes: DesignNode[], edges: DesignEdge[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDuplicate: (id: string) => void;
  onToggleDisabled: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
  const selectedRef = useRef(selectedId);
  const designRef = useRef({ designNodes, designEdges, onGraph });
  const applyingRef = useRef(false);
  useEffect(() => {
    selectedRef.current = selectedId;
    designRef.current = { designNodes, designEdges, onGraph };
  }, [selectedId, designNodes, designEdges, onGraph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(toRfNodes(designNodes, result));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRfEdges(designEdges, result));

  const graphKey = graphSignature(designNodes, designEdges, result);
  const lastKey = useRef(graphKey);
  useEffect(() => {
    if (lastKey.current === graphKey) return;
    lastKey.current = graphKey;
    applyingRef.current = true;
    setNodes((current) => mergeNodes(current, toRfNodes(designNodes, result)));
    setEdges(toRfEdges(designEdges, result));
    const frame = window.requestAnimationFrame(() => {
      applyingRef.current = false;
      void fitView({ padding: 0.2, duration: 200 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [graphKey, designNodes, designEdges, result, setNodes, setEdges, fitView]);

  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  const persistPositions = useCallback(() => {
    const { designNodes: source, designEdges: links, onGraph: emit } = designRef.current;
    const live = new Map(getNodes().map((node) => [node.id, node]));
    emit(
      source.map((node) => {
        const next = live.get(node.id);
        return next ? { ...node, x: next.position.x, y: next.position.y } : node;
      }),
      links,
    );
  }, [getNodes]);

  return (
    <div
      className="relative min-h-[24rem] min-w-0 flex-1 bg-background"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData("application/system-design") as ComponentType;
        if (!type) return;
        const kind = getKind(type);
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const created: DesignNode = {
          id: uid("n"),
          type,
          label: kind.defaultLabel,
          x: position.x,
          y: position.y,
          config: { ...kind.defaultConfig },
        };
        const { designNodes: current, designEdges: links, onGraph: emit } = designRef.current;
        emit([...current, created], links);
      }}
    >
      <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        minZoom={0.2}
        maxZoom={1.6}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Meta", "Control"]}
        onInit={(instance) => instance.fitView({ padding: 0.2 })}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={() => persistPositions()}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          onSelect(node.id);
          setMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
        }}
        onPaneClick={() => setMenu(null)}
        onSelectionChange={({ nodes: selected }) => {
          const id = selected[0]?.id ?? null;
          if (id !== selectedRef.current) onSelect(id);
        }}
        onConnect={(connection: Connection) => {
          const next = addEdge({ ...connection, id: uid("e") }, edges);
          setEdges(next);
          const { designNodes: current, onGraph: emit } = designRef.current;
          emit(current, next.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: typeof edge.label === "string" ? edge.label : undefined,
          })));
        }}
        onNodesDelete={(deleted) => {
          if (applyingRef.current) return;
          const ids = new Set(deleted.map((node) => node.id));
          const { designNodes: current, designEdges: links, onGraph: emit } = designRef.current;
          if (!current.some((node) => ids.has(node.id))) return;
          emit(
            current.filter((node) => !ids.has(node.id)),
            links.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)),
          );
        }}
        onEdgesDelete={(deleted) => {
          if (applyingRef.current) return;
          const ids = new Set(deleted.map((edge) => edge.id));
          const { designNodes: current, designEdges: links, onGraph: emit } = designRef.current;
          if (!links.some((edge) => ids.has(edge.id))) return;
          emit(current, links.filter((edge) => !ids.has(edge.id)));
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--steel-800)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-steel-900 !border-steel-800" />
      </ReactFlow>
      </div>
      {menu ? (
        <NodeContextMenu
          x={menu.x}
          y={menu.y}
          disabled={Boolean(designNodes.find((node) => node.id === menu.nodeId)?.disabled)}
          onDuplicate={() => {
            onDuplicate(menu.nodeId);
            setMenu(null);
          }}
          onDisable={() => {
            onToggleDisabled(menu.nodeId);
            setMenu(null);
          }}
          onDelete={() => {
            onDelete(menu.nodeId);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  );
}

function graphSignature(nodes: DesignNode[], edges: DesignEdge[], result: SimulationResult | null): string {
  return [
    nodes.map((node) => `${node.id}:${node.label}:${node.type}:${node.disabled ? "off" : "on"}`).join(","),
    edges.map((edge) => `${edge.id}:${edge.source}:${edge.target}`).join(","),
    result?.timestamp ?? "",
  ].join("|");
}

function mergeNodes(current: ArchitectureNode[], incoming: ArchitectureNode[]): ArchitectureNode[] {
  const selected = new Set(current.filter((node) => node.selected).map((node) => node.id));
  return incoming.map((node) => ({ ...node, selected: selected.has(node.id) }));
}

function toRfNodes(nodes: DesignNode[], result: SimulationResult | null): ArchitectureNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "architecture",
    position: { x: node.x, y: node.y },
    data: { kind: node.type, label: node.label, disabled: Boolean(node.disabled), metrics: result?.nodes[node.id] },
  }));
}

function toRfEdges(edges: DesignEdge[], result: SimulationResult | null): Edge[] {
  return edges.map((edge) => {
    const metrics = result?.edges[edge.id];
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: metrics ? formatRps(metrics.rps) : edge.label,
      style: { stroke: "var(--steel-600)" },
      labelStyle: { fill: "var(--muted-foreground)", fontSize: 10 },
    };
  });
}
