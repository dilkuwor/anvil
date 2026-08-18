"use client";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import type { SystemDesignScenario } from "@/lib/interview";

export function ScenarioPanel({ scenario }: { scenario: SystemDesignScenario }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-steel-800 bg-steel-900">
      <div className="border-b border-steel-800 px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Scenario</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">{scenario.title}</h2>
          <DifficultyBadge difficulty={scenario.difficulty} />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-auto px-4 py-4 text-sm leading-7">
        <p className="text-foreground/90">{scenario.prompt}</p>
        <RequirementBlock title="Functional requirements" items={scenario.functional_requirements} />
        <RequirementBlock title="Non-functional requirements" items={scenario.non_functional_requirements} />
        <RequirementBlock title="Constraints" items={scenario.constraints} />
        <RequirementBlock title="Key assumptions" items={scenario.assumptions} />
      </div>
    </section>
  );
}

function RequirementBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-foreground/90">
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
