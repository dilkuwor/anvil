"use client";

import { Brain, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import { SectionCard, SectionTitle } from "@/components/ui/section";
import { nextDueLabel, useMemory, type MemoryLesson } from "@/lib/study";
import { cn } from "@/lib/utils";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** How memory is doing: reviews coming this week, lessons to refresh, weak spots. */
export function MemoryCard() {
  const memory = useMemory();
  const data = memory.data;
  if (!data || (!data.lessons.length && !data.week.some((d) => d.due))) return null;
  const today = data.week[0]?.day ?? new Date().toISOString().slice(0, 10);
  const top = data.lessons.slice(0, 5);
  const max = Math.max(1, ...data.week.map((d) => d.due));

  return (
    <SectionCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-accent" aria-hidden />
          <SectionTitle>Memory</SectionTitle>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {data.due_today ? (
            <Link href="/today/review" className="font-medium text-accent hover:underline">
              {data.due_today} due today →
            </Link>
          ) : (
            "Nothing due today"
          )}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Reviews due this week">
        {data.week.map((day, i) => {
          const weekday = new Date(`${day.day}T12:00:00`).getDay();
          return (
            <div key={day.day} className="flex flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end justify-center rounded-md border border-steel-800 bg-steel-950/40 pb-1">
                <div
                  className={cn("w-3 rounded-sm", i === 0 ? "bg-accent" : "bg-steel-600")}
                  style={{ height: `${Math.max(day.due ? 6 : 2, Math.round((day.due / max) * 32))}px` }}
                  title={`${day.due} due`}
                />
              </div>
              <span className={cn("text-[10px] tabular-nums", i === 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {i === 0 ? "Today" : DAY_LETTERS[weekday]}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{day.due || ""}</span>
            </div>
          );
        })}
      </div>

      {top.length ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lessons in review</p>
          <ul className="mt-2 divide-y divide-steel-800/80">
            {top.map((lesson) => (
              <li key={lesson.slug}>
                <Link href={lesson.href} className="flex items-center justify-between gap-3 py-2 text-[13px] hover:text-accent">
                  <span className="flex min-w-0 items-center gap-2">
                    <StateMark lesson={lesson} />
                    <span className="truncate font-medium text-foreground">{lesson.title}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {lesson.needs_refresh ? "needs a refresh" : lesson.next_due_on ? nextDueLabel(lesson.next_due_on, today) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/learn/progress" className="mt-2 inline-block text-[12px] font-medium text-accent hover:underline">
            {data.lessons.length > top.length ? `See all ${data.lessons.length} lessons →` : "Full progress table →"}
          </Link>
        </div>
      ) : null}

      {data.weak.length ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Weak spots</p>
          <ul className="mt-2 space-y-1.5">
            {data.weak.map((spot) => (
              <li key={spot.concept} className="flex items-center justify-between gap-3 text-[13px]">
                <Link href={spot.href} className="min-w-0 truncate font-medium text-foreground hover:text-accent">
                  {spot.lesson_title}
                  <span className="ml-1.5 font-normal text-muted-foreground">· {spot.concept.split(".").pop()?.replace(/-/g, " ")}</span>
                </Link>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  missed {spot.misses}×
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function StateMark({ lesson }: { lesson: Pick<MemoryLesson, "learn_state" | "needs_refresh"> }) {
  if (lesson.learn_state === "mastered") {
    return <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0 text-emerald-400", !lesson.needs_refresh && "fill-emerald-500/25")} aria-label="Mastered" />;
  }
  if (lesson.learn_state === "checked") return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label="Checked" />;
  if (lesson.learn_state === "learning") return <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Learning" />;
  return <Circle className="h-3 w-3 shrink-0 text-steel-500" aria-label="Not started" />;
}
