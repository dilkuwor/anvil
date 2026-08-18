"use client";

import { kindsByCategory } from "../components/registry";
import { KindIcon } from "./icons";

export function Palette() {
  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden border-r border-steel-800 bg-steel-900">
      <div className="border-b border-steel-800 px-3 py-2.5">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Components</div>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Drag onto the canvas.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-2 py-3">
        {kindsByCategory().map((group) => (
          <section key={group.category}>
            <h3 className="px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{group.label}</h3>
            <div className="mt-1.5 space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/system-design", item.type);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left hover:border-steel-800 hover:bg-background"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-steel-800 text-accent">
                    <KindIcon name={item.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[12px]">{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
