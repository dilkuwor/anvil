import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { Meter } from "@/components/dashboard/meter";
import { CardHeader, SectionCard } from "@/components/ui/section";
import type { TopicProgress as TopicRow } from "@/lib/api";

export function TopicProgress({ rows, hasSolved }: { rows: TopicRow[]; hasSolved: boolean }) {
  return (
    <SectionCard className="flex flex-col p-4 sm:p-5">
      <CardHeader
        icon={BarChart3}
        title="Topic progress"
        meta={hasSolved && rows.length ? `${rows.filter((row) => row.solved > 0).length} of ${rows.length} started` : undefined}
        action={
          <Link href="/problems" className="text-xs text-muted-foreground hover:text-accent">
            View all topics →
          </Link>
        }
      />
      {!hasSolved || rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">Solve problems to see topic strengths develop.</p>
        </div>
      ) : (
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.slug}>
              <Link
                href={`/problems?tag=${row.slug}`}
                className="group block rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-steel-800/50"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate font-medium text-foreground transition-colors group-hover:text-accent" title={row.name}>
                    {row.name}
                  </span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">
                    {row.solved}/{row.total} · {row.percent}%
                  </span>
                </div>
                <Meter value={row.percent} label={`${row.name} progress`} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
