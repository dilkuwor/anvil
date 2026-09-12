"use client";

import { ChevronLeft, ChevronRight, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getViz } from "./registry";
import { STEP_KIND_LABEL, type AnyVizDefinition, type StepKind } from "./types";

const KIND_STYLE: Record<StepKind, string> = {
  setup: "border-steel-700 bg-steel-800/60 text-muted-foreground",
  invariant: "border-teal/40 bg-teal/10 text-teal",
  decision: "border-accent/40 bg-accent/10 text-accent",
  tradeoff: "border-coral/40 bg-coral/10 text-coral",
  result: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-success",
};

/**
 * The step-through player. Deterministic: frames come from the definition's pure `steps()`,
 * the player only holds "which frame" and "which inputs". No autoplay loops; the reader
 * drives it with buttons, the scrubber, or arrow keys while it has focus.
 */
export function VizBlock({ id, params: initial }: { id: string; params: Record<string, unknown> }) {
  const definition = getViz(id);
  if (!definition) return null;
  return <VizPlayer definition={definition} initial={initial} />;
}

function VizPlayer({ definition, initial }: { definition: AnyVizDefinition; initial: Record<string, unknown> }) {
  const labelId = useId();
  const [draft, setDraft] = useState<Record<string, string>>(() => toDraft(definition.parse({ ...definition.defaults, ...initial })));
  const [params, setParams] = useState(() => definition.parse({ ...definition.defaults, ...initial }));
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const steps = useMemo(() => definition.steps(params), [definition, params]);
  const step = steps[Math.min(index, steps.length - 1)];
  const View = definition.View;

  function apply() {
    setParams(definition.parse(fromDraft(draft)));
    setIndex(0);
    setEditing(false);
  }

  function reset() {
    setDraft(toDraft(definition.defaults));
    setParams(definition.parse(definition.defaults));
    setIndex(0);
  }

  if (!step) return null;

  return (
    <section
      aria-labelledby={labelId}
      className="viz-block rounded-xl border border-steel-800/80 bg-steel-950/40 p-4 sm:p-5"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setIndex((value) => Math.min(steps.length - 1, value + 1));
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setIndex((value) => Math.max(0, value - 1));
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Step through</div>
          <h4 id={labelId} className="mt-0.5 text-sm font-semibold tracking-tight">
            {definition.title}
          </h4>
          <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{definition.summary}</p>
        </div>
        <div className="flex items-center gap-1">
          {definition.simulatorHref ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={definition.simulatorHref}>Open in simulator</Link>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" aria-expanded={editing} onClick={() => setEditing((value) => !value)}>
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Change inputs
          </Button>
        </div>
      </div>

      {editing ? (
        <form
          className="mt-3 grid gap-2 rounded-lg border border-steel-800 bg-background/40 p-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          {definition.fields.map((field) => (
            <label key={field.key} className="block text-[11px] text-muted-foreground">
              {field.label}
              {field.kind === "select" ? (
                <select className="select-field mt-1 h-8 w-full" value={draft[field.key] ?? ""} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}>
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
                  value={draft[field.key] ?? ""}
                  onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                />
              )}
              {field.hint ? <span className="mt-0.5 block text-[10px]">{field.hint}</span> : null}
            </label>
          ))}
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" size="sm">
              <Play className="h-3.5 w-3.5" aria-hidden />
              Run
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Defaults
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-3 overflow-x-auto">
        <View state={step.state} params={params} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={index === 0} aria-label="Previous step" onClick={() => setIndex((value) => Math.max(0, value - 1))}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          step={1}
          value={Math.min(index, steps.length - 1)}
          aria-label={`Step ${index + 1} of ${steps.length}`}
          aria-valuetext={step.title}
          className="min-w-0 flex-1"
          onChange={(event) => setIndex(Number(event.target.value))}
        />
        <Button variant="secondary" size="sm" disabled={index >= steps.length - 1} aria-label="Next step" onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
        <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
          {index + 1} / {steps.length}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="rounded-lg border border-steel-800 bg-background/40 p-3">
          <div className="flex items-center gap-2">
            <span className={cn("rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide", KIND_STYLE[step.kind])}>{STEP_KIND_LABEL[step.kind]}</span>
            <span className="text-[13px] font-semibold">{step.title}</span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-6 text-foreground/90">{step.explain}</p>
        </div>
        <div className={cn("rounded-lg border p-3", step.kind === "tradeoff" ? "border-coral/30 bg-coral/5" : "border-accent/25 bg-accent/5")}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Say this to the interviewer</div>
          <p className="mt-1.5 text-[12.5px] leading-6 text-foreground">{step.interview}</p>
        </div>
      </div>
    </section>
  );
}

function toDraft(params: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value ?? "")]));
}

function fromDraft(draft: Record<string, string>): Record<string, unknown> {
  return { ...draft };
}
