"use client";

import { Check, Route, Settings2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { hasStory } from "@/components/story/registry";
import { DailyRing } from "@/components/study/daily-ring";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { ApiError } from "@/lib/api";
import { formatDay, useToday, useToggleTask, type StudyTask } from "@/lib/study";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<string, { label: string; chip: string; text: string }> = {
  review: { label: "Review", chip: "bg-accent/12 text-accent", text: "text-accent" },
  problem: { label: "New problem", chip: "bg-sky-500/12 text-sky-600 dark:text-sky-300", text: "text-sky-600 dark:text-sky-300" },
  design: {
    label: "System design",
    chip: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
    text: "text-violet-600 dark:text-violet-300",
  },
  optional: { label: "Optional", chip: "bg-steel-800 text-muted-foreground", text: "text-muted-foreground" },
};

export function TodayView() {
  const today = useToday();
  const toggle = useToggleTask();

  if (today.isLoading) {
    return (
      <main className="ia-content py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={4} />
        </div>
      </main>
    );
  }
  if (today.isError || !today.data) {
    const message = today.error instanceof ApiError ? today.error.message : "Unable to load today's plan.";
    return (
      <main className="ia-content py-6">
        <div className="mx-auto max-w-3xl">
          <ErrorState message={message} onRetry={() => today.refetch()} />
        </div>
      </main>
    );
  }

  const plan = today.data;
  const visible = plan.tasks.filter((task) => !task.optional || task.done || storyAvailable(task));
  const open = visible.filter((task) => !task.done);
  const done = visible.filter((task) => task.done);
  const minutesLeft = open.filter((task) => !task.optional).reduce((sum, task) => sum + task.minutes, 0);

  return (
    <main className="ia-content py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          title="Today"
          description={`${formatDay(plan.day)} · Unit ${plan.unit_number}: ${plan.unit_title}`}
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/path">
                  <Route className="h-3.5 w-3.5" />
                  Path
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/today/settings">
                  <Settings2 className="h-3.5 w-3.5" />
                  Reminders
                </Link>
              </Button>
            </div>
          }
        />

        <SectionCard className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {plan.all_done ? "Done for today" : `${plan.done_count} of ${plan.total} done`}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {plan.all_done ? "Nothing more is asked of you today." : `About ${minutesLeft} min left`}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground/80">
              {plan.readiness !== null ? (
                <Link href="/path" className="hover:text-foreground hover:underline">
                  Readiness {Math.round(plan.readiness * 100)}%
                  {plan.recall_rate !== null ? ` · Recall ${Math.round(plan.recall_rate * 100)}%` : ""}
                </Link>
              ) : (
                plan.pacing
              )}
            </p>
          </div>
          <DailyRing done={plan.done_count} total={plan.total} />
        </SectionCard>

        {plan.all_done ? (
          <SectionCard className="border-teal/35 bg-teal/5">
            <p className="text-lg font-semibold text-teal">Done for today</p>
            <p className="mt-1 text-sm text-foreground">{plan.finish_line}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Take a break. Anything below is extra, not owed.</p>
          </SectionCard>
        ) : null}

        <div className="space-y-3">
          {open.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              step={index + 1}
              onToggle={() => toggle.mutate(task.id)}
              pending={toggle.isPending}
            />
          ))}
          {done.map((task) => (
            <DoneCard key={task.id} task={task} onUndo={() => toggle.mutate(task.id)} pending={toggle.isPending} />
          ))}
        </div>

        <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
          Two 25-minute sessions is a full day. Missed days are not counted against you; the plan just moves on.
        </p>
      </div>
    </main>
  );
}

function storyAvailable(task: StudyTask): boolean {
  return task.kind === "optional" && Boolean(task.ref) && hasStory(task.ref);
}

function TaskCard({
  task,
  step,
  onToggle,
  pending,
}: {
  task: StudyTask;
  step: number;
  onToggle: () => void;
  pending: boolean;
}) {
  const style = KIND_STYLE[task.kind] ?? KIND_STYLE.optional;
  return (
    <SectionCard className={cn("flex flex-col gap-4 py-4 sm:flex-row sm:items-center", task.optional && "border-dashed")}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold", style.chip)}
          aria-hidden
        >
          {task.optional ? "+" : step}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", style.text)}>{style.label}</p>
          <p className="mt-0.5 text-[15px] font-semibold text-foreground">{task.title}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{task.why}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 pl-14 sm:flex-col sm:items-end sm:gap-2 sm:pl-0">
        <span className="text-[12px] tabular-nums text-muted-foreground">{task.minutes} min</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={pending}
            aria-label={`Mark ${task.title} done`}
            title="Mark done"
            className="text-muted-foreground"
          >
            <Check className="h-3.5 w-3.5" />
            Done
          </Button>
          <Button asChild size="sm">
            <Link href={task.href}>{task.action}</Link>
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function DoneCard({ task, onUndo, pending }: { task: StudyTask; onUndo: () => void; pending: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-steel-800/70 bg-steel-900/50 px-5 py-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal" aria-hidden>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-muted-foreground line-through decoration-steel-700">
        {task.title}
      </span>
      {task.manual ? (
        <Button variant="ghost" size="sm" onClick={onUndo} disabled={pending}>
          Undo
        </Button>
      ) : (
        <span className="text-[12px] text-muted-foreground/80">done</span>
      )}
    </div>
  );
}
