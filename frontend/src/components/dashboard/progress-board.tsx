"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { InterviewReadiness } from "@/components/dashboard/interview-readiness";
import { Meter } from "@/components/dashboard/meter";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { RecommendedPractice } from "@/components/dashboard/recommended-practice";
import { TopicProgress } from "@/components/dashboard/topic-progress";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, type ProgressSummary } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { DEFAULT_DAILY_GOAL } from "@/lib/utils";

export function ProgressBoard() {
  const progress = useQuery({
    queryKey: queryKeys.progress,
    queryFn: () => api.get<ProgressSummary>("/api/v1/progress"),
  });

  if (progress.isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-md bg-steel-800" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-steel-800" />
        </div>
        <CardSkeleton rows={5} />
      </div>
    );
  }

  if (progress.isError || !progress.data) {
    return <ErrorState message="Unable to load your progress." onRetry={() => progress.refetch()} />;
  }

  const data = progress.data;
  const isNew = data.total_solved === 0 && data.problems_attempted === 0 && data.total_submissions === 0;
  const next = data.recommendations[0];
  const practiceHref = next ? `/problems/${next.slug}` : "/problems";
  const cta = isNew ? "Start Practice →" : "Continue Practice";

  const goalTarget = DEFAULT_DAILY_GOAL;
  const goalDone = Math.min(data.today_solved ?? 0, goalTarget);
  const remaining = Math.max(goalTarget - goalDone, 0);
  const goalPct = Math.round((goalDone / goalTarget) * 100);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Practice progress, consistency, and what to solve next.</p>
        </div>
        <Button asChild>
          <Link href={practiceHref}>{cta}</Link>
        </Button>
      </div>

      <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5 sm:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Practice Progress</h2>
        <div className="mt-5 grid items-center gap-6 lg:grid-cols-[minmax(0,260px)_1fr]">
          <ProgressRing data={data} />
          <div className="grid gap-3 sm:grid-cols-3">
            <DifficultyStat
              label="Easy"
              solved={data.easy_solved}
              total={data.easy_total ?? 0}
              tone="text-teal"
              bar="bg-teal"
            />
            <DifficultyStat
              label="Medium"
              solved={data.medium_solved}
              total={data.medium_total ?? 0}
              tone="text-accent-light"
              bar="bg-accent"
            />
            <DifficultyStat
              label="Hard"
              solved={data.hard_solved}
              total={data.hard_total ?? 0}
              tone="text-coral"
              bar="bg-coral"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Solved", value: String(data.total_solved) },
          { label: "Attempted", value: String(data.problems_attempted) },
          { label: "Submissions", value: String(data.total_submissions) },
          { label: "Current Streak", value: `${data.current_streak}d` },
          { label: "Best Streak", value: `${data.longest_streak}d` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-steel-800 bg-steel-900/40 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{stat.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Today’s Goal</h2>
            <p className="mt-2 text-lg font-medium">Solve {goalTarget} problems</p>
            <p className="mt-1 text-sm text-zinc-400">
              {remaining === 0 ? "Goal complete for today." : `${remaining} problem${remaining === 1 ? "" : "s"} remaining`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums">
              {goalDone} / {goalTarget}
            </div>
            <div className="text-xs text-zinc-500">{goalPct}%</div>
          </div>
        </div>
        <div className="mt-4">
          <Meter value={goalPct} label="Today's goal" />
        </div>
        <Button asChild className="mt-4">
          <Link href={practiceHref}>{cta}</Link>
        </Button>
      </section>

      <ActivityHeatmap
        days={data.activity_calendar ?? []}
        currentStreak={data.current_streak}
        longestStreak={data.longest_streak}
      />

      <RecommendedPractice items={data.recommendations ?? []} isNew={isNew} />

      <div className="grid gap-5 xl:grid-cols-2">
        <TopicProgress rows={data.topic_progress ?? []} hasSolved={data.total_solved > 0} />
        <InterviewReadiness data={data.readiness ?? null} />
      </div>
    </div>
  );
}

function DifficultyStat({
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
    <div className="rounded-2xl border border-steel-800 bg-steel-950/60 px-4 py-4">
      <div className={`text-sm font-semibold ${tone}`}>{label}</div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold tabular-nums">
          {solved} / {total}
        </div>
        <div className="text-sm tabular-nums text-zinc-500">{percent}%</div>
      </div>
      <div className="mt-3">
        <Meter value={percent} tone={bar} label={`${label} solved`} />
      </div>
    </div>
  );
}
