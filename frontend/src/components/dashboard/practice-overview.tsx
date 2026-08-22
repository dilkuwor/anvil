import { Flame, Trophy } from "lucide-react";

import { Meter } from "@/components/dashboard/meter";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import type { ProgressSummary } from "@/lib/api";

export function PracticeOverview({ data }: { data: ProgressSummary }) {
  return (
    <SectionCard>
      <SectionTitle>Practice Overview</SectionTitle>
      <div className="mt-4 grid items-center gap-6 lg:grid-cols-[auto_minmax(12rem,1fr)_minmax(16rem,20rem)] lg:gap-0">
        <div className="flex justify-center lg:pr-8">
          <ProgressRing data={data} compact />
        </div>

        <div className="flex flex-col justify-center gap-3.5 lg:border-r lg:border-steel-800/80 lg:px-8">
          <DifficultyRow label="Easy" solved={data.easy_solved} total={data.easy_total ?? 0} tone="text-teal" bar="bg-teal" />
          <DifficultyRow label="Medium" solved={data.medium_solved} total={data.medium_total ?? 0} tone="text-accent" bar="bg-accent" />
          <DifficultyRow label="Hard" solved={data.hard_solved} total={data.hard_total ?? 0} tone="text-coral" bar="bg-coral" />
        </div>

        <div className="lg:pl-8">
          <ActivityPanel data={data} />
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
        <span className={`text-[13px] font-semibold ${tone}`}>{label}</span>
        <span className="flex items-baseline gap-2 text-[13px] tabular-nums text-foreground font-medium">
          <span>
            {solved} / {total}
          </span>
          <span className="w-9 text-right text-xs text-muted-foreground font-normal">{percent}%</span>
        </span>
      </div>
      <Meter value={percent} tone={bar} label={`${label} solved`} />
    </div>
  );
}

function ActivityPanel({ data }: { data: ProgressSummary }) {
  return (
    <div className="rounded-xl border border-steel-800/90 bg-steel-950/40 p-4 shadow-2xs">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Activity Summary</p>
      <div className="mt-3.5 grid grid-cols-3 gap-3">
        <Metric label="Solved" value={data.total_solved} />
        <Metric label="Attempts" value={data.problems_attempted} />
        <Metric label="Submissions" value={data.total_submissions} />
      </div>
      <div className="my-3.5 h-px bg-steel-800/80" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Current streak</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold tabular-nums tracking-tight text-foreground">
            <Flame className="h-4 w-4 text-accent fill-accent/20" aria-hidden />
            {formatDays(data.current_streak)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Best streak</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums text-foreground/90">
            <Trophy className="h-4 w-4 text-amber-500/80" aria-hidden />
            {formatDays(data.longest_streak)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function formatDays(value: number) {
  return `${value} ${value === 1 ? "day" : "days"}`;
}
