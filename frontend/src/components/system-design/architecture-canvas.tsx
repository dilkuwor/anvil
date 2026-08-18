"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  emptyArchitecture,
  type ArchitectureGraph,
  type DesignNode,
  type DesignNodeType,
} from "@/lib/interview";
import { cn } from "@/lib/utils";

const PALETTE: { type: DesignNodeType; label: string }[] = [
  { type: "client", label: "Client" },
  { type: "cdn", label: "CDN" },
  { type: "load_balancer", label: "Load Balancer" },
  { type: "api", label: "API" },
  { type: "service", label: "Service" },
  { type: "cache", label: "Cache" },
  { type: "database", label: "Database" },
  { type: "queue", label: "Queue" },
  { type: "worker", label: "Worker" },
  { type: "search", label: "Search" },
  { type: "storage", label: "Storage" },
  { type: "websocket", label: "WebSocket" },
];

const NODE_W = 148;
const NODE_H = 64;
const PORT = 8;

type DragState =
  | { mode: "move"; id: string; dx: number; dy: number }
  | { mode: "link"; from: string; x: number; y: number }
  | null;

export function ArchitectureCanvas({
  value,
  onChange,
  readOnly = false,
}: {
  value: ArchitectureGraph | null | undefined;
  onChange: (next: ArchitectureGraph) => void;
  readOnly?: boolean;
}) {
  const graph = value ?? emptyArchitecture();
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const surface = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [labelDraft, setLabelDraft] = useState("");

  const selectedNode = graph.nodes.find((node) => node.id === selected) ?? null;

  function selectNode(id: string | null, label = "") {
    setSelected(id);
    setLabelDraft(label);
  }

  useEffect(() => {
    if (readOnly) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (!selected) return;
      event.preventDefault();
      removeNode(selected);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, selected, graph]);

  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  function emit(next: ArchitectureGraph) {
    onChange(next);
  }

  function addComponent(type: DesignNodeType) {
    if (readOnly) return;
    const count = graph.nodes.filter((node) => node.type === type).length;
    const label = PALETTE.find((item) => item.type === type)?.label ?? type;
    const index = graph.nodes.length;
    const node: DesignNode = {
      id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      label: count ? `${label} ${count + 1}` : label,
      x: 48 + (index % 4) * 180,
      y: 48 + Math.floor(index / 4) * 110,
    };
    emit({ ...graph, nodes: [...graph.nodes, node] });
    selectNode(node.id, node.label);
  }

  function removeNode(id: string) {
    emit({
      nodes: graph.nodes.filter((node) => node.id !== id),
      edges: graph.edges.filter((edge) => edge.from !== id && edge.to !== id),
    });
    if (selected === id) selectNode(null);
  }

  function renameSelected(label: string) {
    if (!selectedNode) return;
    emit({
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === selectedNode.id ? { ...node, label: label.slice(0, 48) } : node)),
    });
  }

  function localPoint(event: { clientX: number; clientY: number }) {
    const box = surface.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return { x: event.clientX - box.left + (surface.current?.scrollLeft ?? 0), y: event.clientY - box.top + (surface.current?.scrollTop ?? 0) };
  }

  function onNodePointerDown(event: React.PointerEvent, node: DesignNode) {
    if (readOnly) return;
    event.stopPropagation();
    selectNode(node.id, node.label);
    const point = localPoint(event);
    setDrag({ mode: "move", id: node.id, dx: point.x - node.x, dy: point.y - node.y });
  }

  function onPortPointerDown(event: React.PointerEvent, node: DesignNode) {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    selectNode(node.id, node.label);
    const point = localPoint(event);
    setDrag({ mode: "link", from: node.id, x: point.x, y: point.y });
  }

  useEffect(() => {
    if (!drag) return;
    function onMove(event: PointerEvent) {
      const point = localPoint(event);
      const current = graphRef.current;
      if (drag.mode === "move") {
        emit({
          ...current,
          nodes: current.nodes.map((node) =>
            node.id === drag.id
              ? { ...node, x: Math.max(12, point.x - drag.dx), y: Math.max(12, point.y - drag.dy) }
              : node,
          ),
        });
        return;
      }
      setDrag({ ...drag, x: point.x, y: point.y });
    }
    function onUp(event: PointerEvent) {
      const current = graphRef.current;
      if (drag.mode === "link") {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const nodeId = target instanceof HTMLElement ? target.closest("[data-node-id]")?.getAttribute("data-node-id") : null;
        if (nodeId && nodeId !== drag.from) {
          const exists = current.edges.some((edge) => edge.from === drag.from && edge.to === nodeId);
          if (!exists) {
            emit({
              ...current,
              edges: [...current.edges, { id: `e_${drag.from}_${nodeId}`, from: drag.from, to: nodeId }],
            });
          }
        }
      }
      setDrag(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-steel-800 bg-steel-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-steel-800 px-3 py-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Architecture</div>
          <div className="text-[11px] text-muted-foreground">Add components, then drag a port to connect them.</div>
        </div>
        {selectedNode && !readOnly ? (
          <div className="flex items-center gap-2">
            <input
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              onBlur={() => renameSelected(labelDraft.trim() || selectedNode.label)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="h-8 w-40 rounded-md border border-steel-800 bg-background px-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-copper/70"
              aria-label="Component name"
            />
            <Button variant="ghost" size="sm" onClick={() => removeNode(selectedNode.id)}>
              Remove
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-steel-800 px-3 py-2">
        {PALETTE.map((item) => (
          <button
            key={item.type}
            type="button"
            disabled={readOnly}
            onClick={() => addComponent(item.type)}
            className="rounded-md border border-steel-800 bg-background px-2 py-1 text-[11px] text-foreground hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={surface}
        className="relative min-h-[28rem] flex-1 overflow-auto"
        onPointerDown={() => selectNode(null)}
      >
        <div className="absolute inset-0 min-h-full min-w-full bg-background/40" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {graph.edges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            return (
              <g key={edge.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--steel-600)" strokeWidth="1.5" />
                <polygon
                  points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`}
                  fill="var(--steel-600)"
                />
              </g>
            );
          })}
          {drag?.mode === "link" ? (
            <line
              x1={(nodeMap.get(drag.from)?.x ?? 0) + NODE_W}
              y1={(nodeMap.get(drag.from)?.y ?? 0) + NODE_H / 2}
              x2={drag.x}
              y2={drag.y}
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          ) : null}
        </svg>
        {graph.nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Add a client, then the services and stores they talk to. Connect components from the port on the right.
            </p>
          </div>
        ) : null}
        {graph.nodes.map((node) => {
          const active = selected === node.id;
          return (
            <div
              key={node.id}
              data-node-id={node.id}
              style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
              className={cn(
                "absolute select-none rounded-xl border bg-steel-900 px-3 py-2 shadow-sm",
                active ? "border-accent" : "border-steel-800",
                readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
              )}
              onPointerDown={(event) => onNodePointerDown(event, node)}
            >
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {PALETTE.find((item) => item.type === node.type)?.label ?? node.type}
              </div>
              <div className="mt-0.5 truncate text-[13px] font-medium">{node.label}</div>
              {readOnly ? null : (
                <button
                  type="button"
                  aria-label={`Connect from ${node.label}`}
                  className="absolute top-1/2 -right-1.5 h-3 w-3 -translate-y-1/2 rounded-full border border-accent bg-background"
                  style={{ width: PORT, height: PORT }}
                  onPointerDown={(event) => onPortPointerDown(event, node)}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
