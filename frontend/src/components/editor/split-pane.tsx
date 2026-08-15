"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MIN = 0.24;
const MAX = 0.72;
const STORAGE_KEY = "ia:editor-split";

export function SplitPane({
  left,
  right,
  collapsed,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  collapsed: boolean;
}) {
  const [ratio, setRatio] = useState(() => {
    if (typeof window === "undefined") return 0.42;
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return saved >= MIN && saved <= MAX ? saved : 0.42;
  });
  const dragging = useRef(false);
  const frame = useRef<HTMLDivElement>(null);

  const apply = useCallback((next: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, next));
    setRatio(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current || !frame.current) return;
      const box = frame.current.getBoundingClientRect();
      apply((event.clientX - box.left) / box.width);
    },
    [apply],
  );

  const stop = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
    };
  }, [onPointerMove, stop]);

  if (collapsed) {
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col">{right}</div>;
  }

  return (
    <div ref={frame} className="flex min-h-0 min-w-0 flex-1">
      <div className="hidden min-h-0 min-w-0 xl:block" style={{ width: `${ratio * 100}%` }}>
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize problem and editor panels"
        aria-valuemin={Math.round(MIN * 100)}
        aria-valuemax={Math.round(MAX * 100)}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        className="relative hidden w-2 shrink-0 cursor-col-resize xl:block"
        onPointerDown={(event) => {
          event.preventDefault();
          dragging.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            apply(ratio - 0.03);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            apply(ratio + 0.03);
          }
        }}
      >
        <span className={cn("absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-steel-700")} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{right}</div>
    </div>
  );
}
