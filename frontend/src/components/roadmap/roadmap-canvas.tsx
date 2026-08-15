"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RoadmapNode } from "@/components/roadmap/roadmap-node";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_HEIGHT,
  NODE_WIDTH,
  roadmapEdges,
  type RoadmapTopic,
} from "@/lib/roadmap";

const MIN = 0.45;
const MAX = 1.6;

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
  const [scale, setScale] = useState(0.85);
  const [tx, setTx] = useState(24);
  const [ty, setTy] = useState(16);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const clampScale = (value: number) => Math.min(MAX, Math.max(MIN, value));

  const fit = useCallback(() => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    const next = clampScale(Math.min((box.width - 48) / CANVAS_WIDTH, (box.height - 48) / CANVAS_HEIGHT));
    setScale(next);
    setTx((box.width - CANVAS_WIDTH * next) / 2);
    setTy(16);
  }, []);

  useEffect(() => {
    fit();
  }, [fit]);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
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
  const selected = selectedId ? byId.get(selectedId) : null;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="absolute left-4 top-3 z-10 flex flex-wrap items-center gap-1.5">
        <Control onClick={() => setScale((value) => clampScale(value + 0.12))}>+</Control>
        <Control onClick={() => setScale((value) => clampScale(value - 0.12))}>−</Control>
        <Control
          onClick={() => {
            setScale(0.85);
            setTx(24);
            setTy(16);
          }}
        >
          Reset
        </Control>
        <Control onClick={fit}>Fit to View</Control>
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
              const x1 = from.x + NODE_WIDTH / 2;
              const y1 = from.y + NODE_HEIGHT;
              const x2 = to.x + NODE_WIDTH / 2;
              const y2 = to.y;
              const mid = (y1 + y2) / 2;
              const active =
                selected != null && (selected.id === from.id || selected.id === to.id || selected.next.includes(to.id) && selected.id === from.id);
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`}
                  fill="none"
                  stroke={active ? "var(--accent)" : "var(--steel-600)"}
                  strokeWidth={active ? 2 : 1.25}
                  opacity={active ? 0.9 : 0.45}
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
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Control({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 min-w-8 rounded-md border border-steel-800 bg-steel-900 px-2 text-sm text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );
}
