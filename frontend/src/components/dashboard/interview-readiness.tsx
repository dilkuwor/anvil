import { Meter } from "@/components/dashboard/meter";
import { EmptyState } from "@/components/ui/state";
import type { InterviewReadiness as Readiness } from "@/lib/api";

export function InterviewReadiness({ data }: { data: Readiness | null }) {
  return (
    <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interview Readiness</h2>
      {!data ? (
        <div className="mt-4">
          <EmptyState
            title="Not enough practice yet."
            body="Readiness is estimated from coverage, difficulty mix, topics, and consistency — not an AI interview score."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <div className="text-sm text-muted-foreground">Overall</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums">{data.overall}%</div>
            <p className="mt-2 text-xs text-muted-foreground">{data.blurb}</p>
          </div>
          <ul className="space-y-3">
            {data.factors.map((factor) => (
              <li key={factor.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-foreground">{factor.label}</span>
                  <span className="tabular-nums text-muted-foreground">{factor.percent}%</span>
                </div>
                <Meter value={factor.percent} label={factor.label} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
