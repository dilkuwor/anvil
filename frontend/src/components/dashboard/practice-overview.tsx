import { Check, Flame, FileCode, CircleDot, Trophy } from "lucide-react";

import { Meter } from "@/components/dashboard/meter";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import type { ProgressSummary } from "@/lib/api";

export function PracticeOverview({ data }: { data: ProgressSummary }) {
  return (
    <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Practice Overview</h2>
      <div className="mt-4 grid items-center gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-0">
        <div className="flex justify-center lg:pr-6">
          <ProgressRing data={data} compact />
        </div>

        <div className="flex flex-col justify-center gap-2.5 lg:border-r lg:border-steel-800 lg:px-6">
          <DifficultyRow
            label="Easy"
            solved={data.easy_solved}
            total={data.easy_total ?? 0}
            tone="text-teal"
            bar="bg-teal"
          />
          <DifficultyRow
            label="Medium"
            solved={data.medium_solved}
            total={data.medium_total ?? 0}
            tone="text-accent"
            bar="bg-accent"
          />
          <DifficultyRow
            label="Hard"
            solved={data.hard_solved}
            total={data.hard_total ?? 0}
            tone="text-coral"
            bar="bg-coral"
          />
        </div>

        <div className="grid grid-cols-6 gap-2 lg:w-[22rem] lg:pl-6">
          <StatCard icon={Check} label="Solved" value={String(data.total_solved)} className="col-span-2" />
          <StatCard icon={CircleDot} label="Attempted" value={String(data.problems_attempted)} className="col-span-2" />
          <StatCard icon={FileCode} label="Submissions" value={String(data.total_submissions)} className="col-span-2" />
          <StatCard icon={Flame} label="Current Streak" value={`${data.current_streak}d`} className="col-span-3" />
          <StatCard icon={Trophy} label="Best Streak" value={`${data.longest_streak}d`} className="col-span-3" />
        </div>
      </div>
    </section>
  );
}

function DifficultyRow({
  label,
  solved,
  total,
  tone,
  bar,
}: {
  label: string;
  solved: number;
  total: number;
  tone: string;
  bar: string;
}) {
  const percent = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className={`text-sm font-semibold ${tone}`}>{label}</span>
        <span className="flex items-baseline gap-3 text-sm tabular-nums">
          <span>
            {solved} / {total}
          </span>
          <span className="w-8 text-right text-muted-foreground">{percent}%</span>
        </span>
      </div>
      <Meter value={percent} tone={bar} label={`${label} solved`} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: typeof Check;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex h-[4.5rem] flex-col justify-between rounded-xl border border-steel-800 bg-steel-950/50 px-3 py-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
