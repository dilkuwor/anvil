"use client";

import { ChevronDown, ChevronUp, Pause, Play } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

import type { ActiveFailure, FailureType, SimulationResult, SloConfig, WorkloadConfig } from "../models/types";
import { deriveWorkload } from "../models/workload";
import { formatCompact, formatGb, formatMs, formatPct, formatRps, formatUsd } from "../utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TABS = ["Workload", "Metrics", "Capacity", "Latency", "Storage", "Cost", "Failures"] as const;
const COLLAPSED_HEIGHT = 36;
const MIN_OPEN_HEIGHT = 160;
const DEFAULT_HEIGHT = 240;

function panelMaxHeight() {
  if (typeof window === "undefined") return 560;
  return Math.max(MIN_OPEN_HEIGHT, Math.round(window.innerHeight * 0.72));
}

function clampHeight(value: number) {
  return Math.min(panelMaxHeight(), Math.max(MIN_OPEN_HEIGHT, Math.round(value)));
}

const FAILURES: { type: FailureType; label: string }[] = [
  { type: "traffic_spike", label: "Traffic spike 5×" },
  { type: "kill_api", label: "Kill half the APIs" },
  { type: "database_down", label: "Database impaired" },
  { type: "cache_down", label: "Cache down" },
  { type: "kafka_down", label: "Kafka impaired" },
  { type: "network_latency", label: "+80ms network" },
];

export function BottomPanel({
  workload,
  slo,
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
        {tab === "Metrics" ? <MetricsTab result={result} previous={previous} /> : null}
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
        <div className="border-t border-steel-800 px-4 py-1.5">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={cursor}
            onChange={(event) => onCursor(Number(event.target.value))}
            className="w-full"
            aria-label="Simulation timeline"
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
      </div>
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Derived</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
          <Pair label="Daily requests" value={formatCompact(derived.dailyRequests)} />
          <Pair label="Avg RPS" value={formatRps(derived.avgRps)} />
          <Pair label="Peak RPS" value={formatRps(derived.peakRps)} />
          <Pair label="Read / write" value={`${formatRps(derived.readRps)} / ${formatRps(derived.writeRps)}`} />
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
        <Pair label="Availability" value={`${(result.availability * 100).toFixed(3)}%`} />
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
    </div>
  );
}

function CapacityTab({ result }: { result: SimulationResult | null }) {
  if (!result) return <Empty />;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(result.nodes).map(([id, metrics]) => (
        <div key={id} className="rounded-lg border border-steel-800 px-3 py-2">
          <div className="text-[12px] font-medium">{id}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {formatRps(metrics.processedRps)} rps · {metrics.health}
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
    <div className="flex flex-wrap gap-2">
      {FAILURES.map((item) => {
        const on = failures.some((failure) => failure.type === item.type);
        return (
          <Button key={item.type} type="button" size="sm" variant={on ? "default" : "secondary"} onClick={() => onToggle(item.type)}>
            {item.label}
          </Button>
        );
      })}
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
