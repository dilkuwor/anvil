import { Database, Scale, Server, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const NODES: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "users", label: "Users", Icon: Users },
  { id: "lb", label: "Load Balancer", Icon: Scale },
  { id: "api", label: "API", Icon: Server },
  { id: "redis", label: "Redis", Icon: Zap },
  { id: "pg", label: "PostgreSQL", Icon: Database },
];

const METRICS = [
  { label: "Throughput", value: "42k RPS", tone: "text-foreground", stroke: "stroke-accent", points: [18, 22, 19, 28, 24, 32, 29, 36, 31, 38] },
  { label: "P95 Latency", value: "128 ms", tone: "text-foreground", stroke: "stroke-accent", points: [22, 18, 26, 16, 24, 20, 28, 19, 25, 21] },
  { label: "Availability", value: "99.99%", tone: "text-success", stroke: "stroke-success", points: [20, 24, 21, 26, 22, 28, 23, 27, 24, 26] },
] as const;

function Sparkline({ points, className }: { points: readonly number[]; className: string }) {
  const width = 72;
  const height = 22;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const d = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - 2 - ((point - min) / (max - min || 1)) * (height - 4);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-4 w-14" aria-hidden>
      <path d={d} fill="none" className={className} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrafficEdge() {
  return (
    <div className="relative mx-px flex h-10 min-w-2 flex-1 items-center sm:mx-0.5 sm:min-w-5" aria-hidden>
      <div className="h-px w-full bg-steel-600" />
      <span className="absolute right-0 -mt-px border-y-[4px] border-l-[6px] border-y-transparent border-l-steel-500" />
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "hero-traffic-dot absolute top-1/2 -translate-y-1/2 rounded-full motion-reduce:hidden",
            index === 0
              ? "h-1.5 w-1.5 bg-accent shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_70%,transparent)]"
              : index === 1
                ? "h-1 w-1 bg-accent/45"
                : "h-1 w-1 bg-accent/25",
          )}
          style={{ animationDelay: `${index * 0.28}s` }}
        />
      ))}
    </div>
  );
}

export function HeroDesignFloat() {
  return (
    <Link href="/system-design" className="group relative mx-auto block w-full min-w-0 max-w-[38rem] lg:ml-auto lg:mr-0" aria-label="Open System Design">
      <article className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-[rgba(255,255,255,0.48)] px-3 py-4 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.35)] transition duration-300 group-hover:border-black/12 group-hover:bg-[rgba(255,255,255,0.82)] dark:border-white/[0.07] dark:bg-[rgba(30,30,34,0.42)] dark:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] dark:group-hover:border-white/12 dark:group-hover:bg-[rgba(30,30,34,0.78)] sm:px-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-accent">System Design</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-steel-700 px-2 py-0.5 text-[10px] text-muted-foreground">
            <span className="hero-live-dot h-1.5 w-1.5 rounded-full bg-success motion-reduce:animate-none" />
            Live Simulation
          </span>
        </div>

        <div className="mt-3.5 flex min-w-0 items-start">
          {NODES.map((node, index) => (
            <Fragment key={node.id}>
              {index > 0 ? <TrafficEdge /> : null}
              <div className="flex min-w-0 flex-1 flex-col items-center sm:w-[4.15rem] sm:flex-none">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-accent/70 text-accent sm:h-10 sm:w-10">
                  <node.Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="mt-1.5 max-w-full text-center text-[8px] leading-tight text-muted-foreground">{node.label}</span>
              </div>
            </Fragment>
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-1.5 border-t border-steel-800 pt-5 sm:gap-2">
          {METRICS.map((metric) => (
            <div key={metric.label} className="min-w-0">
              <dt className="text-[8px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{metric.label}</dt>
              <dd className={`mt-0.5 flex flex-col items-start gap-1 text-[11px] font-semibold tracking-tight tabular-nums sm:flex-row sm:items-center sm:gap-[21px] ${metric.tone}`}>
                <span className="truncate">{metric.value}</span>
                <Sparkline points={metric.points} className={metric.stroke} />
              </dd>
            </div>
          ))}
        </dl>
      </article>
    </Link>
  );
}
