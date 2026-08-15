"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { InterviewReadiness } from "@/components/dashboard/interview-readiness";
import { Meter } from "@/components/dashboard/meter";
import { PracticeOverview } from "@/components/dashboard/practice-overview";
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
      <div className="space-y-5">
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
      <PracticeOverview data={data} />

      <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today’s Goal</h2>
            <p className="mt-2 text-lg font-medium">Solve {goalTarget} problems</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {remaining === 0 ? "Goal complete for today." : `${remaining} problem${remaining === 1 ? "" : "s"} remaining`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums">
              {goalDone} / {goalTarget}
            </div>
            <div className="text-xs text-muted-foreground">{goalPct}%</div>
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
