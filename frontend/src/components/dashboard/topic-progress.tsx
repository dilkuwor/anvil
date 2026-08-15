import { Meter } from "@/components/dashboard/meter";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import type { TopicProgress as TopicRow } from "@/lib/api";

export function TopicProgress({ rows, hasSolved }: { rows: TopicRow[]; hasSolved: boolean }) {
  return (
    <SectionCard className="h-full">
      <SectionTitle>Topic Progress</SectionTitle>
      {!hasSolved || rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Solve problems to see topic strengths develop.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.slug}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                <span>{row.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.solved}/{row.total} · {row.percent}%
                </span>
              </div>
              <Meter value={row.percent} label={`${row.name} progress`} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
