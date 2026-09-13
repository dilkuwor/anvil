"use client";

import { X } from "lucide-react";
import Link from "next/link";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import type { SystemDesignScenario } from "@/lib/interview";
import { catalogLearnHref } from "@/lib/system-design-catalog";

/**
 * The problem statement, pinned next to the canvas. In an interview you design against
 * requirements, not against a blank page, so the brief stays visible while you build.
 */
export function BriefPanel({ scenario, onClose }: { scenario: SystemDesignScenario; onClose: () => void }) {
  const learnHref = catalogLearnHref(scenario.learn_slug);
  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-r border-steel-800 bg-steel-900">
      <div className="flex items-start justify-between gap-2 border-b border-steel-800 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Brief</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">{scenario.title}</h2>
            <DifficultyBadge difficulty={scenario.difficulty} />
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Close brief"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-3 text-[12px] leading-5">
        <p className="text-foreground/90">{scenario.prompt}</p>
        <Block title="Functional" items={scenario.functional_requirements} />
        <Block title="Non-functional" items={scenario.non_functional_requirements} />
        <Block title="Constraints" items={scenario.constraints} />
        <Block title="Assumptions" items={scenario.assumptions} />
        <div className="rounded-lg border border-steel-800 bg-background/40 px-3 py-2 text-muted-foreground">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em]">Interview order</div>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>Clarify requirements and pick the two or three that shape the design.</li>
            <li>Estimate: Estimate tab, then set SLOs in Workload.</li>
            <li>Draw the request path end to end, then the write path.</li>
            <li>Simulate. Read Review and the primary bottleneck.</li>
            <li>Deep-dive one component, then run a Failure and explain the delta.</li>
          </ol>
        </div>
        {learnHref ? (
          <Link href={learnHref} className="inline-block text-[12px] text-accent hover:underline">
            Read the walkthrough →
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      <ul className="mt-1 space-y-1 text-foreground/90">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
