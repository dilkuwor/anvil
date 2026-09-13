"use client";

import { ChevronDown, ChevronUp, Pause, Play } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

import type { ActiveFailure, DesignNode, FailureType, ReviewArea, ReviewCheck, ReviewStatus, SimulationResult, SloConfig, WorkloadConfig } from "../models/types";
import { DEFAULT_RECORD_BYTES, deriveWorkload } from "../models/workload";
import { estimateWorkload } from "../engine/estimate";
import { formatTimelineClock } from "../engine/timeline";
import { formatBytesPerSec, formatCompact, formatGb, formatMs, formatNines, formatPct, formatRps, formatUsd } from "../utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TABS = ["Workload", "Estimate", "Metrics", "Review", "Capacity", "Latency", "Storage", "Cost", "Failures"] as const;
const COLLAPSED_HEIGHT = 36;
const MIN_OPEN_HEIGHT = 160;
const DEFAULT_HEIGHT = 240;
/** Estimate and Review are reading tabs; open them taller so the content is not a two-line peephole. */
const READING_HEIGHT = 440;
const READING_TABS = new Set<(typeof TABS)[number]>(["Estimate", "Review"]);

function panelMaxHeight() {
  if (typeof window === "undefined") return 560;
  return Math.max(MIN_OPEN_HEIGHT, Math.round(window.innerHeight * 0.72));
}

function clampHeight(value: number) {
  return Math.min(panelMaxHeight(), Math.max(MIN_OPEN_HEIGHT, Math.round(value)));
}

const FAILURES: { type: FailureType; label: string; body: string; ask: string }[] = [
  { type: "traffic_spike", label: "Traffic spike 5×", body: "Peak multiplier × 5. A launch, a viral post, or a retry storm.", ask: "What sheds load first, and is that graceful?" },
  { type: "kill_api", label: "Kill half the APIs", body: "Half the instances gone and a 15% failure rate on the rest. A bad deploy or an AZ outage.", ask: "How fast does autoscaling or the load balancer notice?" },
  { type: "database_down", label: "Database impaired", body: "Primary capacity collapses to nothing. Disk full, failover in progress, or a lock storm.", ask: "Do reads still work from replicas or the cache?" },
  { type: "cache_down", label: "Cache down", body: "Hit ratio drops to zero and every read falls through to the database.", ask: "Can the database take the full read load cold?" },
  { type: "kafka_down", label: "Kafka impaired", body: "Producers and consumers stall. Anything async backs up or is lost.", ask: "Is the producer blocking the request path, or fire-and-forget?" },
  { type: "network_latency", label: "+80ms network", body: "Every hop gets 80ms slower. A cross-region call or a saturated link.", ask: "How many round trips are on the critical path?" },
];

export function BottomPanel({
  workload,
  slo,
  nodes,
  result,
  previous,
  failures,
  playing,
  speed,
  cursor,
  onWorkload,
  onSlo,
  onFailures,
  onPlay,
  onSpeed,
  onCursor,
}: {
  workload: WorkloadConfig;
  slo: SloConfig;
  nodes: DesignNode[];
  result: SimulationResult | null;
  previous: SimulationResult | null;
  failures: ActiveFailure[];
  playing: boolean;
  speed: number;
  cursor: number;
  onWorkload: (next: WorkloadConfig) => void;
  onSlo: (next: SloConfig) => void;
  onFailures: (next: ActiveFailure[]) => void;
  onPlay: () => void;
  onSpeed: (speed: number) => void;
  onCursor: (value: number) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Workload");
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const derived = deriveWorkload(workload);

  function onResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, height: open ? height : COLLAPSED_HEIGHT };
    setDragging(true);
  }

  function onResizePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const next = drag.current.height + (drag.current.y - event.clientY);
    if (next < MIN_OPEN_HEIGHT / 2) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setHeight(clampHeight(next));
  }

  function onResizePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
    setDragging(false);
  }

  return (
    <section
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden border-t border-steel-800 bg-steel-900",
        !dragging && "transition-[height] duration-200 ease-out",
      )}
      style={{ height: open ? height : COLLAPSED_HEIGHT }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize results panel"
        aria-valuemin={MIN_OPEN_HEIGHT}
        aria-valuemax={panelMaxHeight()}
        aria-valuenow={open ? height : COLLAPSED_HEIGHT}
        tabIndex={0}
        className="absolute inset-x-0 -top-1 z-10 flex h-3 cursor-ns-resize items-start justify-center"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setHeight((value) => clampHeight(value + 24));
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHeight((value) => {
              const next = value - 24;
              if (next < MIN_OPEN_HEIGHT) {
                setOpen(false);
                return value;
              }
              return next;
            });
          }
        }}
      >
        <span className="mt-0.5 h-1 w-8 rounded-full bg-steel-600" />
      </div>
      <div className={cn("flex items-center justify-between gap-3 px-2", open && "border-b border-steel-800")}>
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto" role="tablist">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={cn(
                "shrink-0 px-3 py-2 text-[12px]",
                tab === item ? "border-b-2 border-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setTab(item);
                if (!open) setOpen(true);
                if (READING_TABS.has(item)) setHeight((value) => (value < READING_HEIGHT ? clampHeight(READING_HEIGHT) : value));
              }}
            >
              {item}
            </button>
          ))}
        </div>
        {result && open ? (
          <div className="flex items-center gap-2 pr-1 text-[11px] text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={onPlay} aria-label={playing ? "Pause timeline" : "Play timeline"}>
              {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
              {playing ? "Pause" : "Play"}
            </Button>
            {[1, 2, 5, 10].map((value) => (
              <button
                key={value}
                type="button"
                className={cn("rounded px-1.5 py-0.5", speed === value && "text-accent")}
                onClick={() => onSpeed(value)}
              >
                {value}×
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          aria-expanded={open}
          aria-label={open ? "Collapse results" : "Expand results"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3 text-[13px]">
        {tab === "Workload" ? <WorkloadTab workload={workload} derived={derived} slo={slo} onWorkload={onWorkload} onSlo={onSlo} /> : null}
        {tab === "Estimate" ? <EstimateTab workload={workload} nodes={nodes} /> : null}
        {tab === "Metrics" ? <MetricsTab result={result} previous={previous} /> : null}
        {tab === "Review" ? <ReviewTab result={result} /> : null}
        {tab === "Capacity" ? <CapacityTab result={result} /> : null}
        {tab === "Latency" ? <LatencyTab result={result} /> : null}
        {tab === "Storage" ? <StorageTab result={result} /> : null}
        {tab === "Cost" ? <CostTab result={result} /> : null}
        {tab === "Failures" ? (
          <FailuresTab
            failures={failures}
            onToggle={(type) => {
              const exists = failures.some((item) => item.type === type);
              onFailures(exists ? failures.filter((item) => item.type !== type) : [...failures, { id: type, type }]);
            }}
          />
        ) : null}
      </div>
      {result && open ? (
        <div className="border-t border-steel-800 px-4 py-2">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">{formatTimelineClock(cursor)}</span>
            <span className="tabular-nums">
              {formatRps(result.throughput.processedRps)} rps
              <span aria-hidden> · </span>
              {formatMs(result.latency.p95)} p95
              <span aria-hidden> · </span>
              {(result.errorRate * 100).toFixed(2)}% err
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={cursor}
            onChange={(event) => onCursor(Number(event.target.value))}
            className="w-full"
            aria-label="Simulation timeline"
            aria-valuetext={`${formatTimelineClock(cursor)}, ${formatRps(result.throughput.processedRps)} rps`}
          />
        </div>
      ) : null}
    </section>
  );
}

function WorkloadTab({
  workload,
  derived,
  slo,
  onWorkload,
  onSlo,
}: {
  workload: WorkloadConfig;
  derived: ReturnType<typeof deriveWorkload>;
  slo: SloConfig;
  onWorkload: (next: WorkloadConfig) => void;
  onSlo: (next: SloConfig) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-2">
        <Num label="DAU" value={workload.dau} onChange={(dau) => onWorkload({ ...workload, dau })} />
        <Num label="Req / user / day" value={workload.requestsPerUserDay} onChange={(requestsPerUserDay) => onWorkload({ ...workload, requestsPerUserDay })} />
        <Num label="Read ratio" value={workload.readRatio} step={0.01} onChange={(readRatio) => onWorkload({ ...workload, readRatio })} />
        <Num label="Peak multiplier" value={workload.peakMultiplier} step={0.1} onChange={(peakMultiplier) => onWorkload({ ...workload, peakMultiplier })} />
        <Num label="Request bytes" value={workload.avgRequestBytes} onChange={(avgRequestBytes) => onWorkload({ ...workload, avgRequestBytes })} />
        <Num label="Response bytes" value={workload.avgResponseBytes} onChange={(avgResponseBytes) => onWorkload({ ...workload, avgResponseBytes })} />
        <Num label="Stored bytes / write" value={workload.avgRecordBytes ?? DEFAULT_RECORD_BYTES} onChange={(avgRecordBytes) => onWorkload({ ...workload, avgRecordBytes })} />
        <Num label="Yearly growth" value={workload.trafficGrowth} step={0.05} onChange={(trafficGrowth) => onWorkload({ ...workload, trafficGrowth })} />
      </div>
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Derived</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
          <Pair label="Daily requests" value={formatCompact(derived.dailyRequests)} />
          <Pair label="Avg RPS" value={formatRps(derived.avgRps)} />
          <Pair label="Peak RPS" value={formatRps(derived.peakRps)} />
          <Pair label="Read / write" value={`${formatRps(derived.readRps)} / ${formatRps(derived.writeRps)}`} />
          <Pair label="Egress" value={formatBytesPerSec(derived.egressBps)} />
          <Pair label="Storage / year" value={formatGb(derived.storageYearGb)} />
        </dl>
        <h3 className="mt-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">SLOs</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Num label="p95 ms" value={slo.p95Ms} onChange={(p95Ms) => onSlo({ ...slo, p95Ms })} />
          <Num label="p99 ms" value={slo.p99Ms} onChange={(p99Ms) => onSlo({ ...slo, p99Ms })} />
          <Num label="Error rate" value={slo.errorRate} step={0.0001} onChange={(errorRate) => onSlo({ ...slo, errorRate })} />
          <Num label="Availability" value={slo.availability} step={0.0001} onChange={(availability) => onSlo({ ...slo, availability })} />
        </div>
      </div>
    </div>
  );
}

function MetricsTab({ result, previous }: { result: SimulationResult | null; previous: SimulationResult | null }) {
  if (!result) return <Empty />;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
        <Pair label="Throughput" value={`${formatRps(result.throughput.processedRps)} rps`} />
        <Pair label="p50 / p95 / p99" value={`${formatMs(result.latency.p50)} / ${formatMs(result.latency.p95)} / ${formatMs(result.latency.p99)}`} />
        <Pair label="Errors" value={`${(result.errorRate * 100).toFixed(2)}%`} />
        {result.throughput.backlogRps > 0 ? <Pair label="Async backlog" value={`${formatRps(result.throughput.backlogRps)} /s`} /> : null}
        <Pair label="Availability" value={`${(result.availability * 100).toFixed(3)}%`} />
        <Pair label="Review grade" value={`${result.review.grade} · ${result.review.score}/100`} />
        <Pair label="Cost / month" value={formatUsd(result.cost.total)} />
      </dl>
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">SLOs</h3>
        <ul className="mt-2 space-y-1">
          {result.slo.map((item) => (
            <li key={item.key}>
              {item.pass ? "PASS" : "FAIL"} · {item.label} {item.actual} (target {item.target})
            </li>
          ))}
        </ul>
        {previous ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            vs last run: {formatRps(result.throughput.processedRps - previous.throughput.processedRps)} rps,{" "}
            {Math.round(result.latency.p95 - previous.latency.p95)}ms p95, {formatUsd(result.cost.total - previous.cost.total)}
          </p>
        ) : null}
      </div>
      {result.bottlenecks.length ? (
        <div className="md:col-span-2">
          <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Bottlenecks</h3>
          <ul className="mt-2 space-y-2">
            {result.bottlenecks.map((item) => (
              <li key={item.nodeId} className="rounded-lg border border-steel-800 px-3 py-2">
                <div className="text-[12px]">
                  <span className={item.severity === "primary" ? "font-medium text-coral" : "font-medium"}>{item.label}</span>
                  <span className="text-muted-foreground"> · {formatPct(item.utilization)} on {item.metric}</span>
                </div>
                {item.fix ? <p className="mt-1 text-[12px] leading-5">{item.fix}</p> : null}
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{item.suggestions.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EstimateTab({ workload, nodes }: { workload: WorkloadConfig; nodes: DesignNode[] }) {
  const steps = estimateWorkload(workload, nodes);
  return (
    <div>
      <p className="text-[12px] leading-5 text-muted-foreground">
        The back-of-envelope pass an interviewer expects in the first five minutes. Say each line out loud, rounding as you go; the
        Workload tab feeds every number.
      </p>
      <ol className="mt-3 grid gap-2 lg:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step.key} className="rounded-lg border border-steel-800 px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-medium">
                {index + 1}. {step.label}
              </span>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums text-accent">{step.value}</span>
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{step.formula}</div>
            {step.note ? <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{step.note}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

const AREA_LABEL: Record<ReviewArea, string> = {
  requirements: "Requirements",
  scalability: "Scalability",
  reliability: "Reliability",
  performance: "Performance",
  data: "Data",
  cost: "Cost",
};

const AREA_ORDER: ReviewArea[] = ["requirements", "scalability", "reliability", "performance", "data", "cost"];

const STATUS_STYLE: Record<ReviewStatus, string> = {
  pass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-success/35 dark:bg-success/10 dark:text-success",
  warn: "border-accent/40 bg-accent/10 text-accent",
  fail: "border-coral/40 bg-coral/10 text-coral",
  info: "border-steel-800 bg-background/60 text-muted-foreground",
};

function ReviewTab({ result }: { result: SimulationResult | null }) {
  if (!result) return <Empty />;
  const { review } = result;
  const grouped = AREA_ORDER.map((area) => ({ area, checks: review.checks.filter((check) => check.area === area) })).filter(
    (group) => group.checks.length,
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-2xl font-semibold tabular-nums">
          {review.grade}
          <span className="ml-1 text-[12px] font-normal text-muted-foreground">{review.score}/100</span>
        </span>
        <p className="text-[12px] leading-5 text-muted-foreground">
          {review.summary} Redundancy math: {formatNines(review.estimatedAvailability)}
          {review.weakestHop ? `, weakest hop ${review.weakestHop.label}` : ""}. Pass = 1, warn = ½, fail = 0; info lines are
          talking points and do not count.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {grouped.map((group) => (
          <section key={group.area}>
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{AREA_LABEL[group.area]}</h3>
            <ul className="mt-2 space-y-2">
              {group.checks.map((check) => (
                <ReviewRow key={check.id} check={check} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ReviewRow({ check }: { check: ReviewCheck }) {
  return (
    <li className="rounded-lg border border-steel-800 px-3 py-2">
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5 shrink-0 rounded border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide", STATUS_STYLE[check.status])}>
          {check.status}
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-medium leading-5">{check.title}</div>
          <p className="text-[12px] leading-5 text-muted-foreground">{check.detail}</p>
          <p className="mt-1 text-[11px] italic leading-5 text-foreground/80">Interviewer: “{check.interviewer}”</p>
        </div>
      </div>
    </li>
  );
}

function CapacityTab({ result }: { result: SimulationResult | null }) {
  if (!result) return <Empty />;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(result.nodes).map(([id, metrics]) => (
        <div key={id} className="rounded-lg border border-steel-800 px-3 py-2">
          <div className="text-[12px] font-medium">{metrics.label}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {formatRps(metrics.incomingRps)} in · {formatRps(metrics.processedRps)} out · {metrics.health}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
            {Object.entries(metrics.utilization).map(([key, amount]) => (
              <span key={key} className={amount >= 0.85 ? "text-coral" : ""}>
                {key} {formatPct(amount)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LatencyTab({ result }: { result: SimulationResult | null }) {
  if (!result) return <Empty />;
  return (
    <div>
      <p className="text-muted-foreground">Critical path (p95)</p>
      <ol className="mt-2 space-y-1">
        {result.criticalPath.map((hop, index) => (
          <li key={hop.nodeId}>
            {index + 1}. {hop.label} — {formatMs(hop.ms)}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StorageTab({ result }: { result: SimulationResult | null }) {
  if (!result) return <Empty />;
  return (
    <div className="space-y-3">
      {result.storage.map((item) => (
        <div key={item.nodeId}>
          <div className="font-medium">
            {item.label} · {formatGb(item.compressedGb)}
          </div>
          <div className="text-[12px] text-muted-foreground">
            raw {formatGb(item.rawGb)} · indexes {formatGb(item.indexGb)} · replicas {formatGb(item.replicaGb)} · backups{" "}
            {formatGb(item.backupGb)}
          </div>
          {item.assumptions.map((line) => (
            <div key={line} className="text-[11px] text-muted-foreground">
              {line}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CostTab({ result }: { result: SimulationResult | null }) {
  if (!result) return <Empty />;
  return (
    <dl className="max-w-sm space-y-1">
      {result.cost.lines.map((line) => (
        <Pair key={line.key} label={line.label} value={formatUsd(line.monthly)} />
      ))}
      <Pair label="Total / month" value={formatUsd(result.cost.total)} />
    </dl>
  );
}

function FailuresTab({ failures, onToggle }: { failures: ActiveFailure[]; onToggle: (type: FailureType) => void }) {
  return (
    <div>
      <p className="text-[12px] leading-5 text-muted-foreground">
        Toggle one or more, then Simulate again. Compare Metrics and Review against the previous run; that delta is the answer to
        “what happens when…”.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FAILURES.map((item) => {
          const on = failures.some((failure) => failure.type === item.type);
          return (
            <div key={item.type} className={cn("rounded-lg border px-3 py-2", on ? "border-accent/50 bg-accent/5" : "border-steel-800")}>
              <Button type="button" size="sm" variant={on ? "default" : "secondary"} onClick={() => onToggle(item.type)}>
                {item.label}
              </Button>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{item.body}</p>
              <p className="text-[11px] italic leading-5 text-foreground/80">Ask: {item.ask}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <Input className="mt-1 h-8" type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Empty() {
  return <p className="text-muted-foreground">Run a simulation to fill this view.</p>;
}
