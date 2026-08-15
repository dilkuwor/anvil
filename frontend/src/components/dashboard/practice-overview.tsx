import { Check, Flame, FileCode, CircleDot, Trophy } from "lucide-react";

import { Meter } from "@/components/dashboard/meter";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import type { ProgressSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export function PracticeOverview({ data }: { data: ProgressSummary }) {
  return (
    <SectionCard>
      <SectionTitle>Practice Overview</SectionTitle>
      <div className="mt-4 grid items-center gap-5 lg:grid-cols-[auto_minmax(12rem,1fr)_minmax(16rem,20rem)] lg:gap-0">
        <div className="flex justify-center lg:pr-6">
          <ProgressRing data={data} compact />
        </div>

        <div className="flex flex-col justify-center gap-3 lg:border-r lg:border-steel-800 lg:px-6">
          <DifficultyRow label="Easy" solved={data.easy_solved} total={data.easy_total ?? 0} tone="text-teal" bar="bg-teal" />
          <DifficultyRow label="Medium" solved={data.medium_solved} total={data.medium_total ?? 0} tone="text-accent" bar="bg-accent" />
          <DifficultyRow label="Hard" solved={data.hard_solved} total={data.hard_total ?? 0} tone="text-coral" bar="bg-coral" />
        </div>

        <div className="grid grid-cols-6 gap-2 lg:pl-6">
          <StatCard icon={Check} label="Solved" value={String(data.total_solved)} className="col-span-2" />
          <StatCard icon={CircleDot} label="Attempted" value={String(data.problems_attempted)} className="col-span-2" />
          <StatCard icon={FileCode} label="Submissions" value={String(data.total_submissions)} className="col-span-2" />
          <StatCard icon={Flame} label="Current Streak" value={`${data.current_streak}d`} className="col-span-3" />
          <StatCard icon={Trophy} label="Best Streak" value={`${data.longest_streak}d`} className="col-span-3" />
        </div>
      </div>
    </SectionCard>
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
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className={`text-[13px] font-medium ${tone}`}>{label}</span>
        <span className="flex items-baseline gap-2.5 text-[13px] tabular-nums text-foreground">
          <span>
            {solved}/{total}
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
  className,
}: {
  icon: typeof Check;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-16 flex-col justify-between rounded-xl border border-steel-800 bg-steel-950/40 px-2.5 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg font-semibold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}
