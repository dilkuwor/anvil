"use client";

import { useQuery } from "@tanstack/react-query";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { InterviewReadiness } from "@/components/dashboard/interview-readiness";
import { MemoryCard } from "@/components/dashboard/memory-card";
import { PracticeOverview } from "@/components/dashboard/practice-overview";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { RecommendedPractice } from "@/components/dashboard/recommended-practice";
import { TopicProgress } from "@/components/dashboard/topic-progress";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, fetchCurrentUser, type ProgressSummary } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { DEFAULT_DAILY_GOAL } from "@/lib/utils";

export function ProgressBoard() {
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
  });
  const progress = useQuery({
    queryKey: queryKeys.progress,
    queryFn: () => api.get<ProgressSummary>("/api/v1/progress"),
  });

  if (progress.isLoading || me.isLoading) {
    return <CardSkeleton rows={5} />;
  }

  if (progress.isError || !progress.data) {
    return <ErrorState message="Unable to load your progress." onRetry={() => progress.refetch()} />;
  }
  if (me.isError || !me.data) {
    return <ErrorState message="Unable to load your profile." onRetry={() => me.refetch()} />;
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

  const goal = {
    done: goalDone,
    target: goalTarget,
    remaining,
    percent: goalPct,
    practiceHref,
    cta,
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="space-y-5">
        <ProfileCard user={me.data} />
        <InterviewReadiness data={data.readiness ?? null} />
      </aside>

      <div className="min-w-0 space-y-5">
        <PracticeOverview data={data} goal={goal} />

        <ActivityHeatmap
          days={data.activity_calendar ?? []}
          currentStreak={data.current_streak}
          longestStreak={data.longest_streak}
        />

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <RecommendedPractice items={data.recommendations ?? []} isNew={isNew} />
            <MemoryCard />
          </div>
          <TopicProgress rows={data.topic_progress ?? []} hasSolved={data.total_solved > 0} />
        </div>
      </div>
    </div>
  );
}
