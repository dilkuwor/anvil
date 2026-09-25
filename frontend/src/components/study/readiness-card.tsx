"use client";

import { useState } from "react";

import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton } from "@/components/ui/state";
import { useReadiness, type Readiness, type ReadinessPoint } from "@/lib/study";
import { cn } from "@/lib/utils";

const MIN_TREND_POINTS = 7;

export function ReadinessCard() {
  const readiness = useReadiness();
  if (readiness.isLoading) return <CardSkeleton rows={3} />;
  if (readiness.isError || !readiness.data) return null;
  return <ReadinessBody data={readiness.data} />;
}

function ReadinessBody({ data }: { data: Readiness }) {
  const percent = Math.round(data.readiness * 100);
  return (
    <SectionCard className="space-y-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
        <div className="shrink-0">
          <SectionTitle>Readiness</SectionTitle>
          <p className="mt-1 text-[44px] font-bold leading-none tracking-tight text-foreground tabular-nums">
            {percent}
            <span className="text-[22px] font-semibold text-muted-foreground">%</span>
          </p>
          <p className="mt-2 max-w-[15rem] text-[12.5px] leading-relaxed text-muted-foreground">{data.summary}</p>
        </div>
        <div className="min-w-0 flex-1 space-y-3.5">
          <Meter label="Coverage" value={data.coverage} text={data.coverage_text} />
          <Meter label="Retention" value={data.retention} text={data.retention_text} />
          <Meter label="Pace" value={data.pace === null ? null : Math.min(data.pace, 1)} text={data.pace_text} />
        </div>
      </div>
      {data.history.length >= MIN_TREND_POINTS ? <Trend points={data.history} /> : null}
      <p className="text-[11.5px] leading-relaxed text-muted-foreground/80">
        Readiness = coverage × retention. Retention uses the forgetting curve (R = 1 / (1 + t / 9S)) with each card&apos;s
        box interval as its stability. It measures memory and coverage, not interview nerves.
      </p>
    </SectionCard>
  );
}

function Meter({ label, value, text }: { label: string; value: number | null; text: string }) {
  const percent = value === null ? 0 : Math.round(Math.max(0, Math.min(value, 1)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
        <span className="text-[13px] tabular-nums text-muted-foreground">{value === null ? "—" : `${percent}%`}</span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--chart-track)]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none", value === null && "opacity-0")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

/** Readiness over the last weeks: one thin line, hover for the value. */
function Trend({ points }: { points: ReadinessPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 640;
  const height = 120;
  const padX = 8;
  const padTop = 10;
  const padBottom = 22;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const x = (i: number) => padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padTop + (1 - Math.max(0, Math.min(v, 1))) * innerH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.readiness).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const shown = active === null ? last : points[active];
  const label = `Readiness over the last ${points.length} days, from ${Math.round(first.readiness * 100)}% to ${Math.round(last.readiness * 100)}%`;

  function pick(clientX: number, rect: DOMRect) {
    const rel = ((clientX - rect.left) / rect.width) * width;
    let best = 0;
    for (let i = 1; i < points.length; i += 1) if (Math.abs(x(i) - rel) < Math.abs(x(best) - rel)) best = i;
    setActive(best);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <SectionTitle>Trend</SectionTitle>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {shortDay(shown.day)} · {Math.round(shown.readiness * 100)}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 h-[120px] w-full"
        role="img"
        aria-label={label}
        onMouseMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setActive(null)}
      >
        <title>{label}</title>
        {[0, 0.5, 1].map((tick) => (
          <line key={tick} x1={padX} x2={width - padX} y1={y(tick)} y2={y(tick)} stroke="var(--chart-track)" strokeWidth="1" />
        ))}
        <text x={padX} y={height - 6} className="fill-muted-foreground text-[11px]">
          {shortDay(first.day)}
        </text>
        <text x={width - padX} y={height - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
          {shortDay(last.day)}
        </text>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {active !== null ? (
          <line x1={x(active)} x2={x(active)} y1={padTop} y2={padTop + innerH} stroke="var(--border)" strokeWidth="1" />
        ) : null}
        <circle
          cx={x(active ?? points.length - 1)}
          cy={y(shown.readiness)}
          r="4"
          fill="var(--accent)"
          stroke="var(--card)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function shortDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
