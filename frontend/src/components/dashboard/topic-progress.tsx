import { Meter } from "@/components/dashboard/meter";
import { EmptyState } from "@/components/ui/state";
import type { TopicProgress as TopicRow } from "@/lib/api";

export function TopicProgress({ rows, hasSolved }: { rows: TopicRow[]; hasSolved: boolean }) {
  return (
    <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Topic Progress</h2>
      {!hasSolved || rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Topic Progress" body="Solve problems to see your topic strengths develop." />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.slug}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="text-zinc-200">{row.name}</span>
                <span className="tabular-nums text-zinc-500">
                  {row.solved}/{row.total} · {row.percent}%
                </span>
              </div>
              <Meter value={row.percent} label={`${row.name} progress`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
