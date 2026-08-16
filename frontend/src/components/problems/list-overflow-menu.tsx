"use client";

import { useEffect, useRef, useState } from "react";

export function ListOverflowMenu({
  onRename,
  onEditDescription,
  onDelete,
}: {
  onRename: () => void;
  onEditDescription: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="List actions"
        className="rounded-md px-2 py-1 text-muted-foreground hover:bg-steel-800 hover:text-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        ⋮
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-steel-800 bg-steel-900 py-1 shadow-lg">
          <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-steel-950/50" onClick={() => { setOpen(false); onRename(); }}>
            Rename
          </button>
          <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-steel-950/50" onClick={() => { setOpen(false); onEditDescription(); }}>
            Edit description
          </button>
          <button type="button" className="block w-full px-3 py-1.5 text-left text-[13px] text-coral hover:bg-steel-950/50" onClick={() => { setOpen(false); onDelete(); }}>
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
