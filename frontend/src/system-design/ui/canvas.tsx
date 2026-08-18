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
  type Node,
} from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";

import { getKind } from "../components/registry";
import type { ComponentType, DesignEdge, DesignNode, SimulationResult } from "../models/types";
import { uid } from "../utils/ids";
import { ArchitectureFlowNode, type ArchitectureNode } from "./flow-node";
import { formatRps } from "../utils/format";

const nodeTypes = { architecture: ArchitectureFlowNode };

export function SimulatorCanvas({
  designNodes,
  designEdges,
  result,
  onGraph,
  selectedId,
  onSelect,
}: {
  designNodes: DesignNode[];
  designEdges: DesignEdge[];
  result: SimulationResult | null;
  onGraph: (nodes: DesignNode[], edges: DesignEdge[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const designRef = useRef({ designNodes, designEdges, onGraph });
  designRef.current = { designNodes, designEdges, onGraph };

  const [nodes, setNodes, onNodesChange] = useNodesState(toRfNodes(designNodes, result));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRfEdges(designEdges, result));

  const graphKey = graphSignature(designNodes, designEdges, result);
  const lastKey = useRef(graphKey);
  useEffect(() => {
    if (lastKey.current === graphKey) return;
    lastKey.current = graphKey;
    setNodes((current) => mergeNodes(current, toRfNodes(designNodes, result)));
    setEdges(toRfEdges(designEdges, result));
  }, [graphKey, designNodes, designEdges, result, setNodes, setEdges]);

  const persist = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const { designNodes: source, onGraph: emit } = designRef.current;
      emit(
        nextNodes.map((node) => {
          const data = node.data as ArchitectureNode["data"];
          return {
            id: node.id,
            type: data.kind,
            label: data.label,
            x: node.position.x,
            y: node.position.y,
            config: source.find((item) => item.id === node.id)?.config ?? getKind(data.kind).defaultConfig,
          };
        }),
        nextEdges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: typeof edge.label === "string" ? edge.label : undefined,
        })),
      );
    },
    [],
  );

  return (
    <div
      className="h-full min-h-0 min-w-0 flex-1 bg-background"
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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Meta", "Control"]}
        onInit={(instance) => instance.fitView({ padding: 0.2 })}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={(_event, _node, next) => persist(next, edges)}
        onSelectionChange={({ nodes: selected }) => {
          const id = selected[0]?.id ?? null;
          if (id !== selectedRef.current) onSelect(id);
        }}
        onConnect={(connection: Connection) => {
          const next = addEdge({ ...connection, id: uid("e") }, edges);
          setEdges(next);
          persist(nodes, next);
        }}
        onNodesDelete={(deleted) => {
          const ids = new Set(deleted.map((node) => node.id));
          const { designNodes: current, designEdges: links, onGraph: emit } = designRef.current;
          emit(
            current.filter((node) => !ids.has(node.id)),
            links.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)),
          );
        }}
        onEdgesDelete={(deleted) => {
          const ids = new Set(deleted.map((edge) => edge.id));
          const { designNodes: current, designEdges: links, onGraph: emit } = designRef.current;
          emit(current, links.filter((edge) => !ids.has(edge.id)));
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--steel-800)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-steel-900 !border-steel-800" />
      </ReactFlow>
    </div>
  );
}

function graphSignature(nodes: DesignNode[], edges: DesignEdge[], result: SimulationResult | null): string {
  return [
    nodes.map((node) => `${node.id}:${node.label}:${node.x}:${node.y}:${node.type}`).join(","),
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
    data: { kind: node.type, label: node.label, metrics: result?.nodes[node.id] },
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
