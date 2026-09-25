"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ReadinessCard } from "@/components/study/readiness-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { ApiError } from "@/lib/api";
import { useStudyPath, useTogglePathItem, type PathUnit } from "@/lib/study";
import { cn } from "@/lib/utils";

const LEVEL_VARIANT: Record<string, "outline" | "default" | "warning" | "success" | "accent"> = {
  "Not started": "outline",
  Learning: "default",
  Familiar: "warning",
  Proficient: "success",
  Mastered: "success",
};

export function PathView() {
  const path = useStudyPath();
  const toggle = useTogglePathItem();
  const [openUnit, setOpenUnit] = useState<number | null>(null);

  if (path.isLoading) {
    return (
      <main className="ia-content py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={5} />
        </div>
      </main>
    );
  }
  if (path.isError || !path.data) {
    const message = path.error instanceof ApiError ? path.error.message : "Unable to load your path.";
    return (
      <main className="ia-content py-6">
        <div className="mx-auto max-w-3xl">
          <ErrorState message={message} onRetry={() => path.refetch()} />
        </div>
      </main>
    );
  }

  const data = path.data;
  const expanded = openUnit ?? data.current_unit;

  return (
    <main className="ia-content py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Your path"
          description={`${data.units.length} units · you are on unit ${data.current_unit}`}
          actions={
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
              <Legend color="bg-teal" label="done" />
              <Legend color="bg-accent" label="now" />
              <Legend color="bg-steel-700" label="ahead" />
            </div>
          }
        />

        <ReadinessCard />

        <p className="-mt-2 px-1 text-[12.5px] text-muted-foreground">
          Levels: Learning → Familiar (all core solved) → Proficient → Mastered. They rise as your review cards climb
          boxes.
        </p>

        <ol className="flex flex-col">
          {data.units.map((unit, i) => (
            <UnitRow
              key={unit.id}
              unit={unit}
              last={i === data.units.length - 1}
              expanded={unit.number === expanded}
              onOpen={() => setOpenUnit(unit.number === expanded ? -1 : unit.number)}
              onToggle={(key) => toggle.mutate(key)}
              pending={toggle.isPending}
            />
          ))}
        </ol>

        <p className="px-1 text-[12px] text-muted-foreground">Nothing is locked. Open any unit; the order only decides what Today suggests next.</p>
      </div>
    </main>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} aria-hidden />
      {label}
    </span>
  );
}

function UnitRow({
  unit,
  last,
  expanded,
  onOpen,
  onToggle,
  pending,
}: {
  unit: PathUnit;
  last: boolean;
  expanded: boolean;
  onOpen: () => void;
  onToggle: (key: string) => void;
  pending: boolean;
}) {
  const complete = unit.done_items >= unit.total_items;
  const stopClass = complete
    ? "bg-teal text-white"
    : unit.status === "current"
      ? "bg-accent text-white ring-4 ring-accent/20"
      : "border-[3px] border-steel-700 bg-steel-900 text-muted-foreground";
  const lineClass = complete ? "bg-teal" : "bg-steel-800";

  return (
    <li className="flex gap-4 sm:gap-5">
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold",
            stopClass,
            unit.status === "current" && "h-10 w-10",
          )}
          aria-hidden
        >
          {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : unit.number}
        </span>
        {!last ? <span className={cn("w-1 flex-1", lineClass)} aria-hidden /> : null}
      </div>

      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={expanded}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg py-1.5 text-left hover:bg-steel-900/60"
        >
          <span className={cn("text-[16px] font-semibold", unit.status === "ahead" ? "text-foreground" : complete ? "text-muted-foreground" : "text-foreground")}>
            {unit.number} · {unit.title}
          </span>
          <Badge variant={LEVEL_VARIANT[unit.level] ?? "outline"} size="sm">
            {unit.level}
          </Badge>
          <span className="text-[13px] text-muted-foreground">{unit.design.title.replace(/^Design (a |an )?/, "")}</span>
          <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">
            {unit.done_items} of {unit.total_items}
          </span>
        </button>

        {expanded ? (
          <div className="mt-2 rounded-2xl border border-steel-800 bg-steel-900 p-5">
            {unit.why ? (
              <p className="mb-4 rounded-xl bg-accent/8 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
                <span className="font-semibold text-accent">Why together: </span>
                {unit.why}
              </p>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-300">Core problems</p>
                {unit.problems.map((problem) => (
                  <Item key={problem.slug} done={problem.solved} href={`/problems/${problem.slug}`}>
                    {problem.title}
                    {problem.box ? <span className="ml-1.5 text-[11px] text-muted-foreground">box {problem.box}</span> : null}
                  </Item>
                ))}
                {unit.extra_problems > 0 ? (
                  <p className="pt-1 text-[12px] text-muted-foreground">+ {unit.extra_problems} more practice problems, optional</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">System design</p>
                {unit.lessons.map((lesson) => (
                  <Item key={lesson.slug} done={lesson.done} href={lesson.href}>
                    Lesson: {lesson.title}
                  </Item>
                ))}
                <Item done={unit.design.outline_done} href={unit.design.outline_href}>
                  Outline: {unit.design.title.replace(/^Design (a |an )?/, "")}
                </Item>
                <Item done={unit.design.mock_done} href={unit.design.mock_href}>
                  Mock: {unit.design.title.replace(/^Design (a |an )?/, "")}
                </Item>
                <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Unit boss, optional</p>
                <div className="flex items-center justify-between gap-2">
                  <Item done={unit.boss_done} href="/problems?mock=1">
                    Coding mock on one of the core problems
                  </Item>
                  <Button variant="ghost" size="sm" onClick={() => onToggle(unit.boss_key)} disabled={pending}>
                    {unit.boss_done ? "Undo" : "Mark done"}
                  </Button>
                </div>
              </div>
            </div>
            {unit.status === "current" ? (
              <div className="mt-4 flex items-center gap-3">
                <Button asChild size="sm">
                  <Link href="/today">Continue today&apos;s tasks</Link>
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function Item({ done, href, children }: { done: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-[14px] hover:underline">
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
          done ? "bg-teal/15 text-teal" : "border-2 border-steel-700",
        )}
        aria-hidden
      >
        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className={cn("min-w-0", done ? "text-muted-foreground" : "text-foreground")}>{children}</span>
    </Link>
  );
}
