import { Flame, Trophy } from "lucide-react";

import { Meter } from "@/components/dashboard/meter";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import type { ProgressSummary } from "@/lib/api";

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

        <div className="lg:pl-6">
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

function ActivityPanel({ data }: { data: ProgressSummary }) {
  return (
    <div className="rounded-xl border border-steel-800 bg-steel-950/30 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Activity</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Metric label="Solved" value={data.total_solved} />
        <Metric label="Attempts" value={data.problems_attempted} />
        <Metric label="Submissions" value={data.total_submissions} />
      </div>
      <div className="my-3 h-px bg-steel-800" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[12px] text-muted-foreground">Current streak</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tabular-nums tracking-tight">
            <Flame className="h-3.5 w-3.5 text-accent" aria-hidden />
            {formatDays(data.current_streak)}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-muted-foreground">Best streak</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium tabular-nums text-foreground/90">
            <Trophy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
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
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function formatDays(value: number) {
  return `${value} ${value === 1 ? "day" : "days"}`;
}
