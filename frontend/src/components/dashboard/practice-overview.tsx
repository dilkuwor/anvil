import { ArrowRight, CalendarCheck, CalendarDays, Flame, Send, Target, Trophy } from "lucide-react";
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
  const next = data.recommendations?.[0];
  const activeDays = (data.activity_calendar ?? []).filter((day) => day.problems_solved + day.submissions + day.runs > 0).length;
  return (
    <SectionCard className="p-4">
      <CardHeader icon={Target} title="Practice overview" meta={`${data.total_solved} solved`} />
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-steel-800/80">
        {/* Column 1: what is solved, by difficulty */}
        <div className="flex flex-col gap-3 lg:pr-5">
          <ColumnLabel>Solved</ColumnLabel>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
            <ProgressRing data={data} compact />
            <div className="flex min-w-0 flex-col gap-2">
              <DifficultyRow label="Easy" solved={data.easy_solved} total={data.easy_total ?? 0} tone="text-teal" bar="bg-teal" />
              <DifficultyRow label="Medium" solved={data.medium_solved} total={data.medium_total ?? 0} tone="text-accent" bar="bg-accent" />
              <DifficultyRow label="Hard" solved={data.hard_solved} total={data.hard_total ?? 0} tone="text-coral" bar="bg-coral" />
            </div>
          </div>
        </div>

        {/* Column 2: momentum */}
        <div className="flex flex-col gap-3 lg:px-5">
          <ColumnLabel>Momentum</ColumnLabel>
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={<Flame className="h-4 w-4 text-accent" aria-hidden />} label="Current streak" value={formatDays(data.current_streak)} highlight={data.current_streak > 0} />
            <Stat icon={<Trophy className="h-4 w-4 text-amber-500/90" aria-hidden />} label="Best streak" value={formatDays(data.longest_streak)} />
            <Stat icon={<CalendarCheck className="h-4 w-4 text-sky-500/90" aria-hidden />} label="Active days" value={String(activeDays)} />
            <Stat icon={<Send className="h-4 w-4 text-violet-500/90" aria-hidden />} label="Submissions" value={String(data.total_submissions)} />
          </div>
          <p className="text-[12px] leading-5 text-muted-foreground">
            {data.current_streak > 0
              ? "Keep the streak alive with one problem today."
              : data.longest_streak > 0
                ? `Your best run was ${formatDays(data.longest_streak)}. Solve one today to start a new one.`
                : "Solve one problem to start a streak."}
          </p>
        </div>

        {/* Column 3: today's goal */}
        <div className="flex flex-col gap-3 lg:pl-5">
          <ColumnLabel>Today’s goal</ColumnLabel>
          {goal ? (
            <GoalPanel
              goal={goal}
              nextTitle={next?.title ?? null}
              nextDifficulty={next?.difficulty ?? null}
              week={lastSevenDays(data)}
            />
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</p>;
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
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className={`text-[12.5px] font-semibold ${tone}`}>{label}</span>
        <span className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-[12.5px] font-medium tabular-nums text-foreground">
          <span>
            {solved}/{total}
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">{percent}%</span>
        </span>
      </div>
      <Meter value={percent} tone={bar} label={`${label} solved`} />
    </div>
  );
}

function Stat({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-2.5 py-2", highlight ? "border-accent/30 bg-accent/5" : "border-steel-800/80 bg-steel-950/40")}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-0.5 text-base font-bold tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  );
}

/** The day's goal as steps, not a bar: one segment per problem, so two problems read as two clear steps. */
type WeekDay = { key: string; letter: string; active: boolean; today: boolean };

/** The last seven days, oldest first, marking days with any solve. */
function lastSevenDays(data: ProgressSummary): WeekDay[] {
  const solvedOn = new Map<string, boolean>();
  for (const day of data.activity_calendar ?? []) solvedOn.set(day.date, (day.problems_solved ?? 0) > 0);
  const now = new Date();
  const out: WeekDay[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    out.push({ key, letter: "SMTWTFS"[date.getDay()], active: solvedOn.get(key) ?? false, today: offset === 0 });
  }
  return out;
}

function GoalPanel({
  goal,
  nextTitle,
  nextDifficulty,
  week,
}: {
  goal: TodayGoalInfo;
  nextTitle: string | null;
  nextDifficulty: string | null;
  week: WeekDay[];
}) {
  const isDone = goal.remaining === 0;
  const activeDays = week.filter((day) => day.active).length;
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-xl border p-3", isDone ? "border-accent/40 bg-accent/5" : "border-steel-800/80 bg-steel-950/40")}>
      {/* Count, steps and the remaining number on one line */}
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold tabular-nums tracking-tight text-foreground">
          {goal.done}
          <span className="text-sm font-semibold text-muted-foreground"> / {goal.target}</span>
        </span>
        <div className="flex flex-1 gap-1" aria-label={`${goal.done} of ${goal.target} problems solved today`}>
          {Array.from({ length: goal.target }, (_, i) => (
            <span key={i} className={cn("h-2 flex-1 rounded-full", i < goal.done ? "bg-accent" : "bg-steel-800")} />
          ))}
        </div>
        <span className={cn("shrink-0 text-[12px] font-medium", isDone ? "text-accent" : "text-muted-foreground")}>
          {isDone ? "Done" : `${goal.remaining} to go`}
        </span>
      </div>

      {/* The last seven days */}
      <div className="flex items-center justify-between gap-2 border-t border-steel-800/80 pt-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Week</span>
        <div className="flex items-center gap-1.5" aria-label={`Practised on ${activeDays} of the last 7 days`}>
          {week.map((day) => (
            <span
              key={day.key}
              title={`${day.key}${day.active ? " · practised" : ""}`}
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border text-[9px] leading-none",
                day.active ? "border-accent bg-accent text-white" : "border-steel-700 text-muted-foreground",
                day.today && !day.active && "border-dashed border-accent/60",
              )}
            >
              {day.letter}
            </span>
          ))}
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">{activeDays}/7</span>
      </div>

      {/* Next problem and the actions */}
      {!isDone && nextTitle ? (
        <p className="truncate text-[12px] text-muted-foreground">
          Next: <span className="font-medium text-foreground">{nextTitle}</span>
          {nextDifficulty ? <span> · {nextDifficulty.toLowerCase()}</span> : null}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="h-8 flex-1 text-xs font-semibold shadow-xs">
          <Link href={goal.practiceHref}>{isDone ? "Solve one more" : goal.cta}</Link>
        </Button>
        <Link
          href="/today"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-steel-800 px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-steel-700 hover:text-accent"
          title="Open today’s full plan"
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          Plan
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  );
}


function formatDays(value: number): string {
  return `${value} day${value === 1 ? "" : "s"}`;
}
