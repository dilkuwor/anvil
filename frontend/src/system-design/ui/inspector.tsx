"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { getKind, visibleFields } from "../components/registry";
import type { ConfigValue, DesignNode, Difficulty, NodeMetrics } from "../models/types";
import { formatMs, formatPct, formatRps } from "../utils/format";
import { KindIcon } from "./icons";
import { Input } from "@/components/ui/input";

export function Inspector({
  node,
  metrics,
  difficulty,
  onChange,
  onRename,
}: {
  node: DesignNode | null;
  metrics?: NodeMetrics;
  difficulty: Difficulty;
  onChange: (key: string, value: ConfigValue) => void;
  onRename: (label: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const kind = node ? getKind(node.type) : null;

  if (!open) {
    return (
      <aside className="flex h-full w-11 shrink-0 flex-col items-center gap-3 overflow-hidden border-l border-steel-800 bg-steel-900 py-2 transition-[width] duration-200 ease-out">
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          aria-expanded={false}
          aria-label="Expand inspector"
          onClick={() => setOpen(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {kind ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-steel-800 text-accent" title={node?.label}>
            <KindIcon name={kind.icon} className="h-4 w-4" />
          </span>
        ) : null}
        <span className="mt-2 rotate-180 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground [writing-mode:vertical-rl]">
          Inspector
        </span>
      </aside>
    );
  }

  if (!node || !kind) {
    return (
      <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-steel-800 bg-steel-900 transition-[width] duration-200 ease-out">
        <div className="px-4 py-3">
          <InspectorHeader open onToggle={() => setOpen(false)} />
        </div>
        <p className="px-4 pb-3 text-[13px] leading-6 text-muted-foreground">Select a component to edit its capacity and behavior.</p>
      </aside>
    );
  }
  const fields = visibleFields(kind, difficulty);
  const groups = [
    { title: "Basic", items: fields.filter((field) => field.tier === "beginner") },
    { title: "Advanced", items: fields.filter((field) => field.tier === "intermediate" || field.tier === "advanced") },
    { title: "Simulation", items: fields.filter((field) => field.tier === "expert") },
  ].filter((group) => group.items.length);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-l border-steel-800 bg-steel-900 transition-[width] duration-200 ease-out">
      <div className="border-b border-steel-800 px-4 py-3">
        <InspectorHeader open onToggle={() => setOpen(false)} />
        <Input className="mt-2 h-8" value={node.label} onChange={(event) => onRename(event.target.value)} />
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{kind.description}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-3">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{group.title}</h3>
            <div className="mt-2 space-y-2.5">
              {group.items.map((field) => {
                const value = node.config[field.key];
                return (
                  <label key={field.key} className="block">
                    <span className="text-[11px] text-muted-foreground">
                      {field.label}
                      {field.unit ? ` · ${field.unit}` : ""}
                    </span>
                    {field.kind === "boolean" ? (
                      <input
                        type="checkbox"
                        className="mt-1 block"
                        checked={Boolean(value)}
                        onChange={(event) => onChange(field.key, event.target.checked)}
                      />
                    ) : field.kind === "select" ? (
                      <select
                        className="select-field mt-1"
                        value={String(value ?? "")}
                        onChange={(event) => onChange(field.key, event.target.value)}
                      >
                        {(field.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        className="mt-1 h-8"
                        type={field.kind === "number" ? "number" : "text"}
                        value={value === undefined ? "" : String(value)}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        onChange={(event) =>
                          onChange(field.key, field.kind === "number" ? Number(event.target.value) : event.target.value)
                        }
                      />
                    )}
                    {field.hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{field.hint}</span> : null}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
        {metrics ? (
          <section>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Last run</h3>
            <dl className="mt-2 space-y-1 text-[12px]">
              <Row label="In" value={`${formatRps(metrics.incomingRps)} rps`} />
              <Row label="Out" value={`${formatRps(metrics.processedRps)} rps`} />
              <Row label="p95" value={formatMs(metrics.latency.p95)} />
              {Object.entries(metrics.utilization).map(([key, amount]) => (
                <Row key={key} label={key} value={formatPct(amount)} hot={amount >= 0.85} />
              ))}
            </dl>
            {metrics.notes.map((note) => (
              <p key={note} className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {note}
              </p>
            ))}
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function InspectorHeader({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Inspector</div>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
        aria-expanded={open}
        aria-label="Collapse inspector"
        onClick={onToggle}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Row({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={hot ? "text-coral" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
