"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ProgressRing } from "@/components/dashboard/progress-ring";
import { WeakAreasPanel } from "@/components/dashboard/weak-areas";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { StatusPip } from "@/components/problems/status-pip";
import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/state";
import { api, type ProgressSummary } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { DEFAULT_DAILY_GOAL, formatRelative } from "@/lib/utils";

export function ProgressBoard() {
  const progress = useQuery({
    queryKey: queryKeys.progress,
    queryFn: () => api.get<ProgressSummary>("/api/v1/progress"),
  });

  if (progress.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (progress.isError || !progress.data) {
    return (
      <ErrorState message="Unable to load your progress." onRetry={() => progress.refetch()} />
    );
  }

  const data = progress.data;
  const goalTarget = DEFAULT_DAILY_GOAL;
  const goalDone = Math.min(data.today_solved ?? 0, goalTarget);
  const goalPct = Math.round((goalDone / goalTarget) * 100);

  const stats = [
    { label: "Solved", value: String(data.total_solved) },
    { label: "Attempted", value: String(data.problems_attempted) },
    { label: "Submissions", value: String(data.total_submissions) },
    { label: "Current Streak", value: `${data.current_streak}d` },
    { label: "Best Streak", value: `${data.longest_streak}d` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Practice progress, consistency, and what to solve next.</p>
        </div>
        <Button asChild>
          <Link href="/problems">Continue Practice</Link>
        </Button>
      </div>

      <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5 sm:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Practice Progress</h2>
        <div className="mt-6 grid items-center gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
          <ProgressRing data={data} />
          <div className="grid gap-3 sm:grid-cols-3">
            <DifficultyStat label="Easy" solved={data.easy_solved} total={data.easy_total ?? 0} tone="text-teal" />
            <DifficultyStat label="Medium" solved={data.medium_solved} total={data.medium_total ?? 0} tone="text-accent-light" />
            <DifficultyStat label="Hard" solved={data.hard_solved} total={data.hard_total ?? 0} tone="text-coral" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-steel-800 bg-steel-900/50 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{stat.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Today’s Goal</h2>
        <p className="mt-3 text-lg font-medium">Solve {goalTarget} problems</p>
        <p className="mt-1 text-sm text-zinc-400">
          {goalDone} / {goalTarget} completed
        </p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-steel-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={goalTarget}
          aria-valuenow={goalDone}
          aria-label="Today's goal"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${goalPct}%` }} />
        </div>
        <Button asChild className="mt-4">
          <Link href="/problems">Continue Practice</Link>
        </Button>
      </section>

      <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent Activity</h2>
        {(data.recent_events ?? []).length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No activity yet."
              body="Start solving problems to build your interview progress."
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-steel-800">
            {(data.recent_events ?? []).map((event) => (
              <li key={`${event.problem_slug}-${event.created_at}`}>
                <Link
                  href={`/problems/${event.problem_slug}`}
                  className="flex flex-wrap items-center gap-3 py-3 text-sm hover:text-accent-light"
                >
                  <StatusPip status={event.status} />
                  <span className="min-w-0 flex-1 font-medium text-zinc-100">{event.problem_title}</span>
                  <DifficultyBadge difficulty={event.difficulty} />
                  <span className="text-xs text-zinc-500">{formatRelative(event.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WeakAreasPanel areas={[]} />
    </div>
  );
}

function DifficultyStat({
  label,
  solved,
  total,
  tone,
}: {
  label: string;
  solved: number;
  total: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-steel-800 bg-steel-950/60 px-4 py-4">
      <div className={`text-sm font-semibold ${tone}`}>{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {solved}/{total}
      </div>
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-40 animate-pulse rounded-md bg-steel-800" />
      <div className="h-4 w-72 animate-pulse rounded-md bg-steel-800" />
    </div>
  );
}
