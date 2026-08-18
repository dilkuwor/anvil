"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

import { kindsByCategory } from "../components/registry";
import type { ComponentCategory } from "../models/types";
import { KindIcon } from "./icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<ComponentCategory, string> = {
  clients: "Users",
  networking: "Globe",
  compute: "Server",
  cache: "Zap",
  database: "Database",
  messaging: "Radio",
  storage: "HardDrive",
  reliability: "Shield",
};

export function Palette() {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const groups = kindsByCategory()
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => matchesQuery(query, item.label, item.type, group.label, item.description)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-steel-800 bg-steel-900 transition-[width] duration-200 ease-out",
        open ? "w-[220px]" : "w-12",
      )}
    >
      <div className={cn("flex items-center border-b border-steel-800 py-2", open ? "justify-between px-3" : "justify-center px-1")}>
        {open ? (
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Components</div>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Drag onto the canvas.</p>
          </div>
        ) : null}
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          aria-expanded={open}
          aria-label={open ? "Collapse components" : "Expand components"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      {open ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-2 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search components"
              aria-label="Search components"
              className="h-8 pl-8"
            />
          </div>
          {groups.length === 0 ? (
            <p className="px-1 text-[12px] text-muted-foreground">No matching components.</p>
          ) : null}
          {groups.map((group) => (
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
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-auto py-2">
          {groups.map((group) => (
            <button
              key={group.category}
              type="button"
              title={group.label}
              aria-label={group.label}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-accent"
              onClick={() => setOpen(true)}
            >
              <KindIcon name={CATEGORY_ICON[group.category]} className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function matchesQuery(query: string, ...values: string[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => value.toLowerCase().includes(needle));
}
