"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { RoadmapNode } from "@/components/roadmap/roadmap-node";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  fitRoadmapView,
  relatedTopicIds,
  roadmapEdgePath,
  roadmapEdges,
  type RoadmapTopic,
} from "@/lib/roadmap";

const MIN = 0.25;
const MAX = 1.75;

export function RoadmapCanvas({
  topics,
  selectedId,
  recommendedId,
  onSelect,
}: {
  topics: RoadmapTopic[];
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (id: string) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const userAdjusted = useRef(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(24);
  const [ty, setTy] = useState(64);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const clampScale = (value: number) => Math.min(MAX, Math.max(MIN, value));

  const applyFitView = useCallback(() => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    const next = fitRoadmapView(box.width, box.height, topics);
    setScale(clampScale(next.scale));
    setTx(next.tx);
    setTy(next.ty);
    userAdjusted.current = false;
  }, [topics]);

  useLayoutEffect(() => {
    applyFitView();
    const node = frame.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (!userAdjusted.current) applyFitView();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [applyFitView]);

  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      userAdjusted.current = true;
      if (event.ctrlKey || event.metaKey) {
        setScale((value) => clampScale(value + (event.deltaY > 0 ? -0.08 : 0.08)));
        return;
      }
      setTx((value) => value - event.deltaX);
      setTy((value) => value - event.deltaY);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  const edges = roadmapEdges();
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const focusId = hoveredId ?? selectedId;
  const focus = focusId ? byId.get(focusId) : undefined;
  const related = relatedTopicIds(focus);
  const dimming = hoveredId != null;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="absolute left-3 top-3 z-20 flex items-center gap-0.5 rounded-lg border border-steel-800 bg-steel-900/95 p-1 shadow-sm backdrop-blur-md">
        <Control label="Zoom in" onClick={() => {
          userAdjusted.current = true;
          setScale((value) => clampScale(value + 0.12));
        }}>
          <Plus className="h-4 w-4" />
        </Control>
        <Control label="Zoom out" onClick={() => {
          userAdjusted.current = true;
          setScale((value) => clampScale(value - 0.12));
        }}>
          <Minus className="h-4 w-4" />
        </Control>
        <Control label="Reset view" wide onClick={applyFitView}>
          Reset
        </Control>
        <Control label="Fit roadmap" wide onClick={applyFitView}>
          Fit to View
        </Control>
      </div>
      <div
        ref={frame}
        className="relative min-h-0 w-full min-w-0 flex-1 cursor-grab overflow-hidden bg-background active:cursor-grabbing"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          drag.current = { x: event.clientX, y: event.clientY, tx, ty };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          userAdjusted.current = true;
          setTx(drag.current.tx + event.clientX - drag.current.x);
          setTy(drag.current.ty + event.clientY - drag.current.y);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          }}
        >
          <svg className="absolute inset-0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-hidden>
            {edges.map((edge) => {
              const from = byId.get(edge.from);
              const to = byId.get(edge.to);
              if (!from || !to) return null;
              const connected = Boolean(focus && (focus.id === from.id || focus.id === to.id) && related.has(from.id) && related.has(to.id));
              const faded = dimming && !connected;
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={roadmapEdgePath(from, to)}
                  fill="none"
                  stroke={connected ? "var(--accent)" : "var(--muted-foreground)"}
                  strokeWidth={connected ? 2.5 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={faded ? 0.16 : connected ? 0.95 : 0.78}
                />
              );
            })}
          </svg>
          {topics.map((topic) => (
            <RoadmapNode
              key={topic.id}
              topic={topic}
              selected={topic.id === selectedId}
              recommended={topic.id === recommendedId}
              dimmed={dimming && !related.has(topic.id)}
              related={dimming && related.has(topic.id) && topic.id !== hoveredId}
              onSelect={onSelect}
              onHover={setHoveredId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Control({
  children,
  onClick,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={
        wide
          ? "inline-flex h-8 items-center justify-center rounded-md px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-steel-800 hover:text-foreground"
          : "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}
