import type { ActivityDay, TopicProgress } from "@/lib/api";
import type { PublicProfileUser } from "@/components/dashboard/profile-card";

export type PublicProgress = {
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  problems_attempted: number;
  total_problems: number;
  easy_total: number;
  medium_total: number;
  hard_total: number;
  total_submissions: number;
  current_streak: number;
  longest_streak: number;
  activity_calendar: ActivityDay[];
  topic_progress: TopicProgress[];
};

export type PublicProfile = {
  user: PublicProfileUser;
  progress: PublicProgress;
};

export function toPracticeOverview(progress: PublicProgress) {
  return {
    ...progress,
    problems_attempting: 0,
    today_solved: 0,
    accepted_submissions: 0,
    recent_activity: [],
    recent_events: [],
    recommendations: [],
    readiness: null,
  };
}
