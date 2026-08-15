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
import { SectionCard, SectionTitle } from "@/components/ui/section";
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
    return <CardSkeleton rows={5} />;
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

      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SectionTitle>Today’s Goal</SectionTitle>
            <p className="mt-2 text-sm">
              Solve {goalTarget} problems
              <span className="text-muted-foreground">
                {remaining === 0 ? " · complete" : ` · ${remaining} remaining`}
              </span>
            </p>
            <div className="mt-3 max-w-md">
              <Meter value={goalPct} label="Today's goal" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-semibold tabular-nums tracking-tight">
                {goalDone}/{goalTarget}
              </div>
              <div className="text-[11px] text-muted-foreground">{goalPct}%</div>
            </div>
            <Button asChild size="sm">
              <Link href={practiceHref}>{cta}</Link>
            </Button>
          </div>
        </div>
      </SectionCard>

      <ActivityHeatmap
        days={data.activity_calendar ?? []}
        currentStreak={data.current_streak}
        longestStreak={data.longest_streak}
      />

      <RecommendedPractice items={data.recommendations ?? []} isNew={isNew} />

      <div className="grid gap-4 xl:grid-cols-2">
        <TopicProgress rows={data.topic_progress ?? []} hasSolved={data.total_solved > 0} />
        <InterviewReadiness data={data.readiness ?? null} />
      </div>
    </div>
  );
}
