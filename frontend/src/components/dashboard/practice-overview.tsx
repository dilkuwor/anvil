import { Flame, Target, Trophy } from "lucide-react";
import Link from "next/link";

import { Meter } from "@/components/dashboard/meter";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { Button } from "@/components/ui/button";
import { CardHeader, SectionCard } from "@/components/ui/section";
import type { ProgressSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export type TodayGoalInfo = {
  done: number;
  target: number;
  remaining: number;
  percent: number;
  practiceHref: string;
  cta: string;
};

export function PracticeOverview({ data, goal }: { data: ProgressSummary; goal?: TodayGoalInfo }) {
  return (
    <SectionCard className="p-4 sm:p-5">
      <CardHeader icon={Target} title="Practice overview" meta={`${data.total_solved} solved`} />
      <div className="grid items-center gap-5 lg:grid-cols-[auto_minmax(11rem,1fr)_minmax(15rem,19rem)] lg:gap-0">
        <div className="flex justify-center lg:pr-6">
          <ProgressRing data={data} compact />
        </div>

        <div className="flex flex-col justify-center gap-3 lg:border-r lg:border-steel-800/80 lg:px-6">
          <DifficultyRow label="Easy" solved={data.easy_solved} total={data.easy_total ?? 0} tone="text-teal" bar="bg-teal" />
          <DifficultyRow label="Medium" solved={data.medium_solved} total={data.medium_total ?? 0} tone="text-accent" bar="bg-accent" />
          <DifficultyRow label="Hard" solved={data.hard_solved} total={data.hard_total ?? 0} tone="text-coral" bar="bg-coral" />
        </div>

        <div className="lg:pl-6">
          {goal ? <GoalAndActivityPanel data={data} goal={goal} /> : <ActivityPanel data={data} />}
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
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className={`text-[12.5px] font-semibold ${tone}`}>{label}</span>
        <span className="flex items-baseline gap-2 text-[12.5px] tabular-nums text-foreground font-medium">
          <span>
            {solved} / {total}
          </span>
          <span className="w-8 text-right text-[11.5px] text-muted-foreground font-normal">{percent}%</span>
        </span>
      </div>
      <Meter value={percent} tone={bar} label={`${label} solved`} />
    </div>
  );
}

function GoalAndActivityPanel({ data, goal }: { data: ProgressSummary; goal: TodayGoalInfo }) {
  const isDone = goal.remaining === 0;
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border p-3.5 shadow-2xs transition-colors",
        isDone ? "border-accent/40 bg-accent/5" : "border-steel-800/90 bg-steel-950/40",
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Today’s Goal</p>
          {isDone ? (
            <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">Done 🔥</span>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground">{goal.remaining} left</span>
          )}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">
            {goal.done} / {goal.target}{" "}
            <span className="text-xs font-normal text-muted-foreground">solved</span>
          </span>
          <span className="text-xs font-semibold tabular-nums text-accent">{goal.percent}%</span>
        </div>
        <div className="mt-2">
          <Meter value={goal.percent} tone="bg-accent" label="Today's goal" />
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-steel-800/80 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-foreground">
          <Flame className="h-4 w-4 text-accent fill-accent/20 shrink-0" aria-hidden />
          <span>{data.current_streak}</span>
          <span className="text-[11px] font-normal text-muted-foreground">day streak</span>
        </div>
        <Button asChild size="sm" className="h-7 text-xs px-2.5 font-medium shadow-xs">
          <Link href={goal.practiceHref}>{goal.cta}</Link>
        </Button>
      </div>
    </div>
  );
}

function ActivityPanel({ data }: { data: ProgressSummary }) {
  return (
    <div className="rounded-xl border border-steel-800/90 bg-steel-950/40 p-3.5 shadow-2xs">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Activity Summary</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="Solved" value={data.total_solved} />
        <Metric label="Attempts" value={data.problems_attempted} />
        <Metric label="Submissions" value={data.total_submissions} />
      </div>
      <div className="my-3 h-px bg-steel-800/80" />
      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Current streak</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-sm font-bold tabular-nums tracking-tight text-foreground">
            <Flame className="h-3.5 w-3.5 text-accent fill-accent/20" aria-hidden />
            {formatDays(data.current_streak)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Best streak</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold tabular-nums text-foreground/90">
            <Trophy className="h-3.5 w-3.5 text-amber-500/80" aria-hidden />
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
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function formatDays(value: number) {
  return `${value} ${value === 1 ? "day" : "days"}`;
}
