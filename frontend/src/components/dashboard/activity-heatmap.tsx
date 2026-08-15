"use client";

import { memo, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/state";
import type { ActivityDay } from "@/lib/api";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVELS = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];

function intensity(day: ActivityDay | undefined): number {
  if (!day) return 0;
  const weight = day.problems_solved * 4 + day.submissions * 2 + day.runs;
  if (weight <= 0) return 0;
  if (weight === 1) return 1;
  if (weight <= 3) return 2;
  if (weight <= 6) return 3;
  return 4;
}

function mondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const ActivityHeatmap = memo(function ActivityHeatmap({
  days,
  currentStreak,
  longestStreak,
}: {
  days: ActivityDay[];
  currentStreak: number;
  longestStreak: number;
}) {
  const years = useMemo(() => {
    const found = new Set(days.map((day) => Number(day.date.slice(0, 4))));
    found.add(new Date().getUTCFullYear());
    return [...found].sort((a, b) => b - a);
  }, [days]);
  const [year, setYear] = useState(years[0]);

  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const yearDays = useMemo(() => days.filter((day) => day.date.startsWith(String(year))), [days, year]);
  const activeDays = yearDays.filter((day) => day.problems_solved + day.submissions + day.runs > 0).length;

  const grid = useMemo(() => buildGrid(year, byDate), [year, byDate]);

  if (days.length === 0) {
    return (
      <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Practice Activity</h2>
        <div className="mt-4">
          <EmptyState title="No activity yet." body="Solve your first problem to start building your practice history." />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-steel-800 bg-steel-900/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Practice Activity</h2>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only">Year</span>
          <select
            className="select-field w-auto"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="mb-1 ml-8 grid grid-cols-[repeat(53,minmax(0,1fr))] text-[10px] text-muted-foreground">
            {grid.monthMarks.map((mark) => (
              <span key={mark.week} style={{ gridColumnStart: mark.week + 1 }}>
                {mark.label}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <div className="flex w-7 flex-col justify-between py-0.5 text-[10px] text-muted-foreground">
              {WEEKDAYS.map((label, index) => (
                <span key={label} className={index % 2 === 1 ? "invisible" : undefined}>
                  {label}
                </span>
              ))}
            </div>
            <div className="grid auto-cols-max grid-flow-col grid-rows-7 gap-[3px]">
              {grid.cells.map((cell) => (
                <div
                  key={cell.key}
                  title={cell.title}
                  className={cn("h-[11px] w-[11px] rounded-[3px]", LEVELS[cell.level], !cell.inYear && "opacity-0")}
                  aria-label={cell.title}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            <span>Less</span>
            {LEVELS.map((tone) => (
              <span key={tone} className={cn("h-2.5 w-2.5 rounded-[2px]", tone)} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Stat label="Active days" value={String(activeDays)} />
        <Stat label="Current streak" value={`${currentStreak} days`} />
        <Stat label="Best streak" value={`${longestStreak} days`} />
      </dl>
    </section>
  );
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function buildGrid(year: number, byDate: Map<string, ActivityDay>) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const cursor = new Date(start);
  cursor.setUTCDate(cursor.getUTCDate() - mondayIndex(cursor));

  const cells: { key: string; inYear: boolean; level: number; title: string }[] = [];
  const monthMarks: { week: number; label: string }[] = [];
  let week = 0;
  let lastMonth = -1;

  while (cursor <= end || mondayIndex(cursor) !== 0) {
    const key = toKey(cursor);
    const inYear = cursor.getUTCFullYear() === year;
    const day = byDate.get(key);
    const level = inYear ? intensity(day) : 0;
    const title = inYear
      ? `${key}: ${day?.problems_solved ?? 0} solved, ${day?.submissions ?? 0} submissions`
      : "";
    if (inYear && cursor.getUTCDate() === 1 && cursor.getUTCMonth() !== lastMonth) {
      monthMarks.push({ week, label: MONTHS[cursor.getUTCMonth()] });
      lastMonth = cursor.getUTCMonth();
    }
    cells.push({ key, inYear, level, title });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (mondayIndex(cursor) === 0) week += 1;
    if (week > 53) break;
  }

  return { cells, monthMarks };
}
