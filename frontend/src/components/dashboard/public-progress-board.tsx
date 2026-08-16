"use client";

import { useQuery } from "@tanstack/react-query";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { PracticeOverview } from "@/components/dashboard/practice-overview";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { TopicProgress } from "@/components/dashboard/topic-progress";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, fetchCurrentUser } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { toPracticeOverview, type PublicProfile } from "@/lib/public-profile";

export function PublicProgressBoard({ username }: { username: string }) {
  const profile = useQuery({
    queryKey: queryKeys.publicProfile(username),
    queryFn: () => api.get<PublicProfile>(`/api/v1/users/${encodeURIComponent(username)}`),
    retry: false,
  });
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    retry: false,
  });

  if (profile.isLoading) return <CardSkeleton />;
  if (profile.isError || !profile.data) {
    return <ErrorState message="This profile is not available." onRetry={() => profile.refetch()} />;
  }

  const { user, progress } = profile.data;
  const isOwner = Boolean(me.data && me.data.username.toLowerCase() === user.username.toLowerCase());

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="space-y-5 xl:sticky xl:top-16">
        <ProfileCard user={user} publicView isOwner={isOwner} />
      </aside>
      <div className="min-w-0 space-y-5">
        <PracticeOverview data={toPracticeOverview(progress)} />
        <ActivityHeatmap
          days={progress.activity_calendar}
          currentStreak={progress.current_streak}
          longestStreak={progress.longest_streak}
        />
        <TopicProgress rows={progress.topic_progress} hasSolved={progress.total_solved > 0} />
      </div>
    </div>
  );
}
